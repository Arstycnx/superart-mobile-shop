const https = require('https');
const pool = require('../config/db');

/**
 * Send a raw Telegram API request.
 * @param {string} method   - Telegram Bot API method name (e.g. 'sendMessage')
 * @param {object} payload  - Request body
 * @param {string} [token]  - Bot token override; defaults to TELEGRAM_BOT_TOKEN env var
 */
const apiCall = (method, payload, token) => {
    return new Promise((resolve, reject) => {
        const botToken = token || process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            return reject(new Error('TELEGRAM_BOT_TOKEN is not configured'));
        }

        const body = JSON.stringify(payload);
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${botToken}/${method}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) {
                        resolve(parsed);
                    } else {
                        reject(new Error(parsed.description || 'Telegram API error'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

/**
 * Send a plain-text or HTML notification to a Telegram chat.
 * @param {string|number} chatId  - Telegram chat ID
 * @param {string}        message - Message text (HTML supported)
 * @param {string}       [parseMode] - 'HTML' | 'Markdown' (default: 'HTML')
 * @param {string}       [token]  - Bot token override
 */
const sendNotification = async (chatId, message, parseMode = 'HTML', token) => {
    try {
        if (!chatId) {
            console.log('[Telegram] No chat ID, skipping notification');
            return { success: false, message: 'No Telegram chat ID' };
        }
        await apiCall('sendMessage', {
            chat_id: chatId,
            text: message,
            parse_mode: parseMode,
        }, token);
        console.log('[Telegram] Message sent to chat:', chatId);
        return { success: true };
    } catch (error) {
        console.error('[Telegram] Send error:', error.message);
        return { success: false, message: error.message };
    }
};

/**
 * Send a formatted repair-status update notification to a customer.
 * @param {string|number} chatId      - Telegram chat ID (from customers.telegram_chat_id)
 * @param {object}        repairOrder - Must have .order_code, .device_brand, .device_model, .status
 * @param {string}       [token]      - Bot token override
 */
const sendRepairStatusUpdate = async (chatId, repairOrder, token) => {
    try {
        // Map status to template_key from the DB
        const statusToTemplate = {
            received: 'repair_received',
            completed: 'repair_completed'
            // Add 'payment_reminder' logic elsewhere if triggered by something else
        };

        const templateKey = statusToTemplate[repairOrder.status];

        if (!templateKey) {
            // Fallback for statuses that don't have a template but we might want to notify about
            const statusMap = {
                repairing: '🔧 กำลังซ่อม',
                delivered: '🎉 ส่งมอบเรียบร้อย',
                cancelled: '❌ ยกเลิกการซ่อม',
            };
            const statusLabel = statusMap[repairOrder.status] || repairOrder.status;
            const message = `<b>🔧 SuperArt Repair — แจ้งเตือนสถานะ</b>\n\n` +
                `📋 <b>หมายเลขซ่อม:</b> <code>${repairOrder.order_code}</code>\n` +
                `📱 <b>อุปกรณ์:</b> ${repairOrder.device_brand} ${repairOrder.device_model}\n` +
                `🔄 <b>สถานะปัจจุบัน:</b> ${statusLabel}\n\n` +
                `ขอบคุณที่ใช้บริการ SuperArt 🙏`;
            return await sendNotification(chatId, message, 'HTML', token);
        }

        // 1. Fetch template from DB
        const [[templateRow]] = await pool.query(
            'SELECT message_text, is_active FROM message_templates WHERE template_key = ? LIMIT 1',
            [templateKey]
        );

        // If no template found or it's disabled, skip
        if (!templateRow || templateRow.is_active === 0) {
            console.log(`[Telegram] Template ${templateKey} is disabled or missing. Skipping.`);
            return { success: true, message: 'Template disabled' };
        }

        let message = templateRow.message_text;

        // 2. Format currency safely
        const thb = (n) => {
            const num = Number(n);
            return isNaN(num) ? '0' : num.toLocaleString('th-TH');
        };

        // 3. Replace variables
        // Available vars in DB currently: {{customer_name}}, {{order_code}}, {{device_brand}}, {{device_model}}, {{estimated_cost}}, {{final_cost}}, {{outstanding_amount}}, {{due_date}}
        const replacements = {
            customer_name: repairOrder.customer_name || 'ลูกค้า',
            order_code: repairOrder.order_code || '',
            device_brand: repairOrder.device_brand || '',
            device_model: repairOrder.device_model || '',
            estimated_cost: thb(repairOrder.estimated_cost),
            final_cost: thb(repairOrder.final_cost || repairOrder.estimated_cost),
            outstanding_amount: thb(repairOrder.final_cost || repairOrder.estimated_cost), // Basic default
            due_date: 'ตามกำหนดรับเครื่อง', // Can be customized later if due date field exists
        };

        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            message = message.replace(regex, value);
        }

        return await sendNotification(chatId, message, 'HTML', token);
    } catch (err) {
        console.error('[Telegram] Template formatting error:', err.message);
        return { success: false, message: 'Template formatting error' };
    }
};

/**
 * Send a test message to verify the bot token & chat ID.
 * @param {string|number} chatId - Telegram chat ID
 * @param {string}       [token] - Bot token override
 */
const sendTestMessage = async (chatId, token) => {
    const message =
        `✅ <b>ทดสอบระบบแจ้งเตือน SuperArt Repair</b>\n\n` +
        `การเชื่อมต่อ Telegram Bot สำเร็จ! 🎉\n` +
        `คุณจะได้รับการแจ้งเตือนสถานะซ่อมผ่านช่องทางนี้`;
    return await sendNotification(chatId, message, 'HTML', token);
};

/**
 * Register Webhook URL with Telegram API.
 * @param {string} url - The HTTPS webhook URL to register
 * @param {string} [token] - Bot token override
 */
const registerWebhook = async (url, token) => {
    try {
        const result = await apiCall('setWebhook', { url }, token);
        console.log(`[Telegram] Webhook registered successfully to: ${url}`);
        return { success: true, message: 'ลงทะเบียน Webhook สำเร็จ', data: result };
    } catch (error) {
        console.error('[Telegram] setWebhook error:', error.message);
        return { success: false, message: error.message };
    }
};

module.exports = { sendNotification, sendRepairStatusUpdate, sendTestMessage, registerWebhook, apiCall };
