const https = require('https');
const pool = require('../config/db');
const { sendNotification } = require('./telegramService');

/**
 * Telegram Long-Polling service
 * ใช้แทน Webhook สำหรับ server ที่ไม่มี HTTPS (เช่น server มหาวิทยาลัย)
 * เรียก getUpdates วนซ้ำแบบ long-poll (timeout=25s)
 */

let isRunning = false;
let lastUpdateId = 0;

// ─── Raw API call (same as telegramService but standalone) ────────────────────
function telegramGet(method, params = {}, token) {
    return new Promise((resolve, reject) => {
        const botToken = token || process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return reject(new Error('TELEGRAM_BOT_TOKEN not set'));

        const qs = new URLSearchParams(params).toString();
        const path = `/bot${botToken}/${method}${qs ? '?' + qs : ''}`;

        const req = https.request({
            hostname: 'api.telegram.org',
            path,
            method: 'GET',
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) resolve(parsed.result);
                    else reject(new Error(parsed.description || 'Telegram error'));
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// ─── handlers (same logic as telegramWebhook.js) ─────────────────────────────
async function handleStart(chatId) {
    const msg =
        `👋 <b>ยินดีต้อนรับสู่ SuperArt Repair!</b>\n\n` +
        `เพื่อเชื่อมต่อบัญชีและรับการแจ้งเตือนสถานะซ่อม:\n\n` +
        `📱 พิมพ์ <b>เบอร์โทรศัพท์</b> ที่ลงทะเบียนไว้กับร้าน (ตัวเลข 10 หลัก)\n\n` +
        `📋 ใช้คำสั่ง <b>/status</b> เพื่อดูสถานะการซ่อมล่าสุด`;
    await sendNotification(chatId, msg, 'HTML');
}

async function handleStatus(chatId) {
    try {
        const [[customer]] = await pool.query(
            'SELECT id, full_name FROM customers WHERE telegram_chat_id = ? LIMIT 1',
            [String(chatId)]
        );
        if (!customer) {
            await sendNotification(chatId, '❌ ยังไม่ได้เชื่อมต่อบัญชี\n\nกรุณาพิมพ์เบอร์โทรศัพท์ที่ลงทะเบียนไว้กับร้านเพื่อเชื่อมต่อ', 'HTML');
            return;
        }
        const [[order]] = await pool.query(
            `SELECT order_code, device_brand, device_model, status FROM repair_orders
             WHERE customer_id = ? ORDER BY id DESC LIMIT 1`,
            [customer.id]
        );
        if (!order) {
            await sendNotification(chatId, `สวัสดีคุณ <b>${customer.full_name}</b>\n\nยังไม่พบรายการซ่อมในระบบ`, 'HTML');
            return;
        }
        const statusMap = {
            received: '📥 รับเครื่องแล้ว', repairing: '🔧 กำลังซ่อม',
            completed: '✅ ซ่อมเสร็จแล้ว รอส่งมอบ', delivered: '🎉 ส่งมอบเรียบร้อย', cancelled: '❌ ยกเลิก',
        };
        await sendNotification(chatId,
            `📋 <b>สถานะการซ่อมล่าสุด</b>\n\n` +
            `👤 ลูกค้า: <b>${customer.full_name}</b>\n` +
            `🔢 หมายเลขซ่อม: <code>${order.order_code}</code>\n` +
            `📱 อุปกรณ์: ${order.device_brand} ${order.device_model}\n` +
            `🔄 สถานะ: ${statusMap[order.status] || order.status}`,
            'HTML'
        );
    } catch (err) {
        console.error('[Telegram Poll] /status error:', err.message);
    }
}

async function handleTextMessage(chatId, text) {
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(text)) return;
    try {
        const [[customer]] = await pool.query(
            'SELECT id, full_name, telegram_chat_id FROM customers WHERE phone = ? LIMIT 1',
            [text]
        );
        if (!customer) {
            await sendNotification(chatId, `❌ ไม่พบลูกค้าที่ใช้เบอร์ <b>${text}</b>\n\nกรุณาติดต่อเจ้าหน้าที่`, 'HTML');
            return;
        }
        if (customer.telegram_chat_id && customer.telegram_chat_id !== String(chatId)) {
            await sendNotification(chatId, `⚠️ เบอร์ <b>${text}</b> ถูกเชื่อมต่อกับบัญชี Telegram อื่นแล้ว`, 'HTML');
            return;
        }
        await pool.query('UPDATE customers SET telegram_chat_id = ? WHERE id = ?', [String(chatId), customer.id]);
        console.log(`[Telegram Poll] Linked chat ${chatId} → customer #${customer.id} (${customer.full_name})`);
        await sendNotification(chatId,
            `✅ <b>เชื่อมต่อสำเร็จ!</b>\n\nสวัสดีคุณ <b>${customer.full_name}</b> 🎉\n\n` +
            `ตอนนี้คุณจะได้รับการแจ้งเตือนสถานะซ่อมผ่าน Telegram แล้ว\nใช้คำสั่ง /status เพื่อดูสถานะล่าสุด`,
            'HTML'
        );
    } catch (err) {
        console.error('[Telegram Poll] link error:', err.message);
    }
}

// ─── Process one update object ────────────────────────────────────────────────
async function processUpdate(update) {
    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    if (text === '/start') await handleStart(chatId);
    else if (text === '/status') await handleStatus(chatId);
    else await handleTextMessage(chatId, text);
}

// ─── Main polling loop ────────────────────────────────────────────────────────
async function pollOnce() {
    try {
        const updates = await telegramGet('getUpdates', {
            offset: lastUpdateId + 1,
            timeout: 25,        // long-poll 25s
            allowed_updates: JSON.stringify(['message']),
        });

        for (const update of updates) {
            if (update.update_id > lastUpdateId) {
                lastUpdateId = update.update_id;
                await processUpdate(update).catch(e => console.error('[Telegram Poll] processUpdate error:', e.message));
            }
        }
    } catch (err) {
        // Network error / timeout — wait a bit then retry
        if (!err.message.includes('ETIMEDOUT') && !err.message.includes('socket hang up')) {
            console.error('[Telegram Poll] getUpdates error:', err.message);
        }
        await new Promise(r => setTimeout(r, 3000));
    }
}

async function startPolling() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
        console.warn('[Telegram Poll] TELEGRAM_BOT_TOKEN not set — polling disabled');
        return;
    }
    if (isRunning) return;
    isRunning = true;

    // First: delete any existing webhook so polling works
    try {
        await telegramGet('deleteWebhook', { drop_pending_updates: 'true' });
        console.log('[Telegram Poll] Webhook cleared ✓');
    } catch (e) {
        console.warn('[Telegram Poll] deleteWebhook failed (may already be clear):', e.message);
    }

    console.log('[Telegram Poll] Starting long-polling...');
    // eslint-disable-next-line no-constant-condition
    while (isRunning) {
        await pollOnce();
    }
}

function stopPolling() {
    isRunning = false;
    console.log('[Telegram Poll] Stopped.');
}

module.exports = { startPolling, stopPolling };
