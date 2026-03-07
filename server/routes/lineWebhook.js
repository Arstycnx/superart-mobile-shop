const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/db');
const { sendPushMessage } = require('../services/lineService');

// ─── Signature verification middleware ────────────────────────────────────────
// LINE sends X-Line-Signature header; we must verify it before processing events
function verifyLineSignature(req, res, next) {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
        console.error('[LINE Webhook] LINE_CHANNEL_SECRET is not set');
        return res.sendStatus(500);
    }

    const signature = req.headers['x-line-signature'];
    if (!signature) {
        console.warn('[LINE Webhook] Missing X-Line-Signature header');
        return res.sendStatus(400);
    }

    // req.rawBody is populated by the raw-body middleware attached in server.js
    const body = req.rawBody || JSON.stringify(req.body);
    const hmac = crypto.createHmac('SHA256', channelSecret);
    hmac.update(body);
    const digest = hmac.digest('base64');

    if (digest !== signature) {
        console.warn('[LINE Webhook] Invalid signature');
        return res.sendStatus(403);
    }

    next();
}

// ─── POST /api/line/webhook ───────────────────────────────────────────────────
router.post('/webhook', verifyLineSignature, async (req, res) => {
    // Always respond 200 first so LINE doesn't retry
    res.sendStatus(200);

    const events = req.body.events || [];

    for (const event of events) {
        try {
            if (event.type === 'follow') {
                // User added the bot as a friend → save their LINE user ID
                await handleFollowEvent(event);
            } else if (event.type === 'message' && event.message.type === 'text') {
                // User sent a text message → check if it's a phone number to link account
                await handleTextMessage(event);
            }
        } catch (err) {
            console.error('[LINE Webhook] Event handling error:', err.message);
        }
    }
});

// ─── Handle "follow" event ────────────────────────────────────────────────────
async function handleFollowEvent(event) {
    const lineUserId = event.source.userId;
    console.log('[LINE Webhook] New follower:', lineUserId);

    // Send a welcome message asking them to reply with their phone number
    await sendPushMessage(lineUserId, {
        type: 'text',
        text: '👋 ยินดีต้อนรับสู่ SuperArt Repair!\n\nเพื่อเชื่อมต่อบัญชีและรับการแจ้งเตือนสถานะซ่อม กรุณาพิมพ์เบอร์โทรศัพท์ที่ลงทะเบียนไว้กับร้าน (ตัวเลข 10 หลัก)'
    });
}

// ─── Handle text message (phone number linking) ───────────────────────────────
async function handleTextMessage(event) {
    const lineUserId = event.source.userId;
    const text = event.message.text.trim();

    // Check if the message looks like a Thai phone number (10 digits)
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(text)) {
        // Not a phone number – ignore silently
        return;
    }

    const phone = text;

    try {
        // Try to find a customer with this phone number
        const [rows] = await pool.query(
            'SELECT id, full_name, line_user_id FROM customers WHERE phone = ? LIMIT 1',
            [phone]
        );

        if (rows.length === 0) {
            // No customer found
            await sendPushMessage(lineUserId, {
                type: 'text',
                text: `❌ ไม่พบลูกค้าที่ใช้เบอร์ ${phone}\n\nกรุณาติดต่อเจ้าหน้าที่เพื่อลงทะเบียน`
            });
            return;
        }

        const customer = rows[0];

        if (customer.line_user_id && customer.line_user_id !== lineUserId) {
            // Already linked to a different LINE account
            await sendPushMessage(lineUserId, {
                type: 'text',
                text: `⚠️ เบอร์ ${phone} ถูกเชื่อมต่อกับบัญชี LINE อื่นแล้ว\n\nกรุณาติดต่อเจ้าหน้าที่`
            });
            return;
        }

        // Save the LINE user ID to the customer record
        await pool.query(
            'UPDATE customers SET line_user_id = ? WHERE id = ?',
            [lineUserId, customer.id]
        );

        console.log(`[LINE Webhook] Linked ${lineUserId} to customer #${customer.id} (${customer.full_name})`);

        await sendPushMessage(lineUserId, {
            type: 'text',
            text: `✅ เชื่อมต่อสำเร็จ!\n\nสวัสดีคุณ ${customer.full_name} ตอนนี้คุณจะได้รับการแจ้งเตือนสถานะซ่อมผ่าน LINE แล้ว 🎉`
        });
    } catch (err) {
        console.error('[LINE Webhook] DB error:', err.message);
    }
}

module.exports = router;
