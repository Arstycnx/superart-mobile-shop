const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { sendNotification } = require('../services/telegramService');

// ─── POST /api/telegram/webhook ───────────────────────────────────────────────
// Telegram sends POST requests to our webhook URL; no signature secret required
// by default (but you can enable it with a secret token in setWebhook).
router.post('/webhook', async (req, res) => {
    // Always respond 200 quickly so Telegram doesn't retry
    res.sendStatus(200);

    const update = req.body;
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
            // Try to treat the message as a phone number to link the account
            await handleTextMessage(chatId, text);
        }
    } catch (err) {
        console.error('[Telegram Webhook] Handler error:', err.message);
    }
});

// ─── /start command ───────────────────────────────────────────────────────────
async function handleStart(chatId) {
    console.log('[Telegram Webhook] /start from chat:', chatId);
    const message =
        `👋 <b>ยินดีต้อนรับสู่ SuperArt Repair!</b>\n\n` +
        `เพื่อเชื่อมต่อบัญชีและรับการแจ้งเตือนสถานะซ่อม:\n\n` +
        `📱 พิมพ์ <b>เบอร์โทรศัพท์</b> ที่ลงทะเบียนไว้กับร้าน (ตัวเลข 10 หลัก)\n\n` +
        `📋 ใช้คำสั่ง <b>/status</b> เพื่อดูสถานะการซ่อมล่าสุด`;
    await sendNotification(chatId, message, 'HTML');
}

// ─── /status command ──────────────────────────────────────────────────────────
async function handleStatus(chatId) {
    try {
        // Look up customer linked to this chat ID
        const [[customer]] = await pool.query(
            'SELECT id, full_name FROM customers WHERE telegram_chat_id = ? LIMIT 1',
            [String(chatId)]
        );

        if (!customer) {
            await sendNotification(
                chatId,
                '❌ ยังไม่ได้เชื่อมต่อบัญชี\n\nกรุณาพิมพ์เบอร์โทรศัพท์ที่ลงทะเบียนไว้กับร้านเพื่อเชื่อมต่อ',
                'HTML'
            );
            return;
        }

        // Fetch latest repair order for this customer
        const [[order]] = await pool.query(
            `SELECT order_code, device_brand, device_model, status, received_date
             FROM repair_orders
             WHERE customer_id = ?
             ORDER BY id DESC LIMIT 1`,
            [customer.id]
        );

        if (!order) {
            await sendNotification(chatId, `สวัสดีคุณ <b>${customer.full_name}</b>\n\nยังไม่พบรายการซ่อมในระบบ`, 'HTML');
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

        await sendNotification(chatId, message, 'HTML');
    } catch (err) {
        console.error('[Telegram Webhook] /status DB error:', err.message);
    }
}

// ─── Handle text message (phone number linking) ───────────────────────────────
async function handleTextMessage(chatId, text) {
    // Only respond to Thai phone numbers (10 digits starting with 0)
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(text)) return;

    const phone = text;

    try {
        const [[customer]] = await pool.query(
            'SELECT id, full_name, telegram_chat_id FROM customers WHERE phone = ? LIMIT 1',
            [phone]
        );

        if (!customer) {
            await sendNotification(
                chatId,
                `❌ ไม่พบลูกค้าที่ใช้เบอร์ <b>${phone}</b>\n\nกรุณาติดต่อเจ้าหน้าที่เพื่อลงทะเบียน`,
                'HTML'
            );
            return;
        }

        if (customer.telegram_chat_id && customer.telegram_chat_id !== String(chatId)) {
            await sendNotification(
                chatId,
                `⚠️ เบอร์ <b>${phone}</b> ถูกเชื่อมต่อกับบัญชี Telegram อื่นแล้ว\n\nกรุณาติดต่อเจ้าหน้าที่`,
                'HTML'
            );
            return;
        }

        // Save the Telegram chat ID to the customer record
        await pool.query(
            'UPDATE customers SET telegram_chat_id = ? WHERE id = ?',
            [String(chatId), customer.id]
        );

        console.log(`[Telegram Webhook] Linked chat ${chatId} to customer #${customer.id} (${customer.full_name})`);

        await sendNotification(
            chatId,
            `✅ <b>เชื่อมต่อสำเร็จ!</b>\n\nสวัสดีคุณ <b>${customer.full_name}</b> 🎉\n\nตอนนี้คุณจะได้รับการแจ้งเตือนสถานะซ่อมผ่าน Telegram แล้ว\nใช้คำสั่ง /status เพื่อดูสถานะการซ่อมล่าสุด`,
            'HTML'
        );
    } catch (err) {
        console.error('[Telegram Webhook] DB error:', err.message);
    }
}

module.exports = router;
