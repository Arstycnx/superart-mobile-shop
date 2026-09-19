/**
 * telegramPoller.js
 * -----------------
 * Polls Telegram's getUpdates API every POLL_INTERVAL ms.
 * Works on any server — including LAN IPs and HTTP-only environments.
 * Handles /start, /status, and phone-number linking (same logic as the old webhook).
 */

const pool = require('../config/db');
const { sendNotification } = require('./telegramService');

const POLL_INTERVAL = 3000;  // 3 seconds base
const MAX_BACKOFF   = 60000; // 60 seconds max when network is down

let offset = 0;        // Tracks the last processed update_id
let isRunning = false;
let pollTimer = null;
let botToken = null;
let consecutiveErrors = 0;  // For exponential backoff

/* ─── Get bot token from DB (or fallback to env var) ───── */
const getBotToken = async () => {
    try {
        const [[row]] = await pool.query(
            `SELECT access_token FROM notification_settings WHERE channel = 'telegram' LIMIT 1`
        );
        return (row && row.access_token) ? row.access_token : process.env.TELEGRAM_BOT_TOKEN;
    } catch {
        return process.env.TELEGRAM_BOT_TOKEN;
    }
};

/* ─── Call Telegram API ───────────────────────────────── */
const telegramApi = async (method, params = {}) => {
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('No Telegram bot token configured');

    const https = require('https');
    const body = JSON.stringify(params);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${token}/${method}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) resolve(parsed.result);
                    else reject(new Error(parsed.description || 'Telegram API error'));
                } catch (e) { reject(e); }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

/* ─── Send message helper ─────────────────────────────── */
const send = (chatId, text) =>
    sendNotification(chatId, text, 'HTML', botToken);

/* ─── Handle /start ──────────────────────────────────── */
const handleStart = async (chatId) => {
    const message =
        `👋 <b>ยินดีต้อนรับสู่ SuperArt Repair!</b>\n\n` +
        `เพื่อเชื่อมต่อบัญชีและรับการแจ้งเตือนสถานะซ่อม:\n\n` +
        `📱 พิมพ์ <b>เบอร์โทรศัพท์</b> ที่ลงทะเบียนไว้กับร้าน (ตัวเลข 10 หลัก)\n\n` +
        `📋 ใช้คำสั่ง <b>/status</b> เพื่อดูสถานะการซ่อมล่าสุด`;
    await send(chatId, message);
};

/* ─── Handle /status ─────────────────────────────────── */
const handleStatus = async (chatId) => {
    const [[customer]] = await pool.query(
        'SELECT id, full_name FROM customers WHERE telegram_chat_id = ? LIMIT 1',
        [String(chatId)]
    );

    if (!customer) {
        await send(chatId,
            '❌ ยังไม่ได้เชื่อมต่อบัญชี\n\nกรุณาพิมพ์เบอร์โทรศัพท์ที่ลงทะเบียนไว้กับร้านเพื่อเชื่อมต่อ'
        );
        return;
    }

    const [[order]] = await pool.query(
        `SELECT order_code, device_brand, device_model, status
         FROM repair_orders WHERE customer_id = ? ORDER BY id DESC LIMIT 1`,
        [customer.id]
    );

    if (!order) {
        await send(chatId, `สวัสดีคุณ <b>${customer.full_name}</b>\n\nยังไม่พบรายการซ่อมในระบบ`);
        return;
    }

    const statusMap = {
        received:  '📥 รับเครื่องแล้ว',
        repairing: '🔧 กำลังซ่อม',
        completed: '✅ ซ่อมเสร็จแล้ว รอส่งมอบ',
        delivered: '🎉 ส่งมอบเรียบร้อย',
        cancelled: '❌ ยกเลิกการซ่อม',
    };

    const message =
        `📋 <b>สถานะการซ่อมล่าสุด</b>\n\n` +
        `👤 ลูกค้า: <b>${customer.full_name}</b>\n` +
        `🔢 หมายเลขซ่อม: <code>${order.order_code}</code>\n` +
        `📱 อุปกรณ์: ${order.device_brand} ${order.device_model}\n` +
        `🔄 สถานะ: ${statusMap[order.status] || order.status}`;

    await send(chatId, message);
};

/* ─── Handle phone number linking ────────────────────── */
const handlePhoneLink = async (chatId, phone) => {
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(phone)) return; // Not a valid Thai phone number, ignore

    const [[customer]] = await pool.query(
        'SELECT id, full_name, telegram_chat_id FROM customers WHERE phone = ? LIMIT 1',
        [phone]
    );

    if (!customer) {
        await send(chatId,
            `❌ ไม่พบลูกค้าที่ใช้เบอร์ <b>${phone}</b>\n\nกรุณาติดต่อเจ้าหน้าที่เพื่อลงทะเบียน`
        );
        return;
    }

    if (customer.telegram_chat_id && customer.telegram_chat_id !== String(chatId)) {
        await send(chatId,
            `⚠️ เบอร์ <b>${phone}</b> ถูกเชื่อมต่อกับบัญชี Telegram อื่นแล้ว\n\nกรุณาติดต่อเจ้าหน้าที่`
        );
        return;
    }

    await pool.query(
        'UPDATE customers SET telegram_chat_id = ? WHERE id = ?',
        [String(chatId), customer.id]
    );

    console.log(`[TelegramPoller] Linked chat ${chatId} → customer #${customer.id} (${customer.full_name})`);

    await send(chatId,
        `✅ <b>เชื่อมต่อสำเร็จ!</b>\n\nสวัสดีคุณ <b>${customer.full_name}</b> 🎉\n\n` +
        `ตอนนี้คุณจะได้รับการแจ้งเตือนสถานะซ่อมผ่าน Telegram แล้ว\n` +
        `ใช้คำสั่ง /status เพื่อดูสถานะการซ่อมล่าสุด`
    );
};

/* ─── Process a single update ────────────────────────── */
const processUpdate = async (update) => {
    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    try {
        if (text === '/start') {
            await handleStart(chatId);
        } else if (text === '/status') {
            await handleStatus(chatId);
        } else {
            await handlePhoneLink(chatId, text);
        }
    } catch (err) {
        console.error('[TelegramPoller] processUpdate error:', err.message);
    }
};

/* ─── Poll once ──────────────────────────────────────── */
const NETWORK_ERRORS = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'socket hang up', 'EHOSTUNREACH'];

const pollOnce = async () => {
    try {
        const updates = await telegramApi('getUpdates', {
            offset,
            timeout: 0,
            allowed_updates: ['message'],
        });

        // Successful poll — reset backoff
        if (consecutiveErrors > 0) {
            console.log('[TelegramPoller] Connection restored ✓');
            consecutiveErrors = 0;
        }

        for (const update of updates) {
            await processUpdate(update);
            offset = update.update_id + 1; // Mark as processed
        }
    } catch (err) {
        const isNetworkError = NETWORK_ERRORS.some(e => err.message.includes(e));

        if (isNetworkError) {
            consecutiveErrors++;
            // Only log on first error, then every 20 attempts to avoid spam
            if (consecutiveErrors === 1) {
                console.warn('[TelegramPoller] Cannot reach Telegram API (network/firewall issue). Will retry silently...');
            } else if (consecutiveErrors % 20 === 0) {
                console.warn(`[TelegramPoller] Still unreachable after ${consecutiveErrors} attempts. Check your internet connection.`);
            }
        } else {
            console.error('[TelegramPoller] getUpdates error:', err.message);
        }
    }
};

/* ─── Public API ─────────────────────────────────────── */

/**
 * Start polling. Call once on server startup.
 * Automatically fetches the bot token from DB.
 */
const start = async () => {
    if (isRunning) return;

    // Refresh token from DB first
    botToken = await getBotToken();
    if (!botToken) {
        console.warn('[TelegramPoller] No bot token found — polling not started. Configure it in Notification Settings.');
        return;
    }

    // Clear any Telegram webhook so polling works properly
    try {
        await telegramApi('deleteWebhook', { drop_pending_updates: false });
        console.log('[TelegramPoller] Webhook cleared ✓');
    } catch (err) {
        console.warn('[TelegramPoller] Could not clear webhook:', err.message);
    }

    isRunning = true;
    console.log(`[TelegramPoller] Started — polling every ${POLL_INTERVAL / 1000}s`);

    const loop = async () => {
        if (!isRunning) return;
        await pollOnce();
        // Exponential backoff when network is down (3s → 6s → 12s … max 60s)
        const delay = consecutiveErrors > 0
            ? Math.min(POLL_INTERVAL * Math.pow(2, consecutiveErrors - 1), MAX_BACKOFF)
            : POLL_INTERVAL;
        pollTimer = setTimeout(loop, delay);
    };

    loop();
};

/**
 * Stop polling gracefully.
 */
const stop = () => {
    isRunning = false;
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    console.log('[TelegramPoller] Stopped');
};

/**
 * Restart polling (e.g. after token change in Notification Settings).
 */
const restart = async () => {
    stop();
    botToken = await getBotToken();
    await start();
};

module.exports = { start, stop, restart };
