const pool = require('../config/db');
const telegramService = require('../services/telegramService');

/* ── Auto-create tables if missing (fallback — schema.sql is the source of truth) ── */
const ensureTables = async () => {
    // notification_settings
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_settings (
            id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            channel      ENUM('sms','telegram') NOT NULL UNIQUE,
            is_enabled   TINYINT(1)   NOT NULL DEFAULT 0,
            api_key      VARCHAR(500) DEFAULT NULL,
            sender_name  VARCHAR(100) DEFAULT NULL,
            access_token VARCHAR(500) DEFAULT NULL,
            updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // message_templates
    await pool.query(`
        CREATE TABLE IF NOT EXISTS message_templates (
            id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name          VARCHAR(150) NOT NULL,
            template_key  VARCHAR(100) NOT NULL UNIQUE,
            message_text  TEXT         NOT NULL,
            is_active     TINYINT(1)   NOT NULL DEFAULT 1,
            created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed default rows if tables are empty
    const [[{ cnt: sc }]] = await pool.query(`SELECT COUNT(*) AS cnt FROM notification_settings`);
    if (sc === 0) {
        await pool.query(`
            INSERT INTO notification_settings (channel, is_enabled, api_key, sender_name, access_token)
            VALUES
                ('sms',      1, NULL, 'SuperArt', NULL),
                ('telegram', 0, NULL, NULL,        NULL)
        `);
    }

    const [[{ cnt: tc }]] = await pool.query(`SELECT COUNT(*) AS cnt FROM message_templates`);
    if (tc === 0) {
        await pool.query(`
            INSERT INTO message_templates (name, template_key, message_text, is_active) VALUES
            ('แจ้งรับซ่อม',   'repair_received',
             'สวัสดีค่ะ {{customer_name}}\nทางร้าน SuperArt รับเครื่องของคุณแล้ว\nรหัสงาน: {{order_code}}\nอุปกรณ์: {{device_brand}} {{device_model}}\nประเมินราคา: {{estimated_cost}} บาท\nขอบคุณที่ใช้บริการค่ะ 🙏', 1),
            ('ซ่อมเสร็จแล้ว', 'repair_completed',
             'สวัสดีค่ะ {{customer_name}}\nเครื่องของคุณซ่อมเสร็จแล้วค่ะ 🎉\nรหัสงาน: {{order_code}}\nยอดชำระ: {{final_cost}} บาท\nกรุณามารับเครื่องได้ที่ร้าน SuperArt\nขอบคุณที่ใช้บริการค่ะ 🙏', 1),
            ('แจ้งเตือนชำระ', 'payment_reminder',
             'สวัสดีค่ะ {{customer_name}}\nเตือนการชำระเงินค่ะ 💳\nรหัสงาน: {{order_code}}\nยอดค้างชำระ: {{outstanding_amount}} บาท\nกรุณาชำระภายใน {{due_date}}\nขอบคุณค่ะ 🙏', 1)
        `);
    }
};

// Init tables on startup
ensureTables().catch(e => console.error('[notifications] table init error', e));

/* ─── Helper: get Telegram bot token from DB ──────────────────────────── */
const getTelegramToken = async () => {
    const [[row]] = await pool.query(
        `SELECT access_token FROM notification_settings WHERE channel = 'telegram' LIMIT 1`
    );
    // Prefer DB token; fall back to env var
    return (row && row.access_token) ? row.access_token : process.env.TELEGRAM_BOT_TOKEN;
};

/* ─── Helper: check Telegram is enabled in DB ────────────────────────── */
const isTelegramEnabled = async () => {
    const [[row]] = await pool.query(
        `SELECT is_enabled FROM notification_settings WHERE channel = 'telegram' LIMIT 1`
    );
    return row && row.is_enabled === 1;
};

/* ─── GET /api/notifications/settings ────────────────────────────────── */
const getSettings = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM notification_settings ORDER BY id`);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[notifications.getSettings]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── PUT /api/notifications/settings/:channel ───────────────────────── */
const updateSettings = async (req, res) => {
    try {
        const { channel } = req.params;
        if (!['sms', 'telegram'].includes(channel)) {
            return res.status(400).json({ success: false, message: 'channel ไม่ถูกต้อง (sms หรือ telegram เท่านั้น)' });
        }

        const { is_enabled, api_key, sender_name, access_token } = req.body;

        await pool.query(
            `UPDATE notification_settings
             SET is_enabled=?, api_key=?, sender_name=?, access_token=?
             WHERE channel=?`,
            [is_enabled ? 1 : 0, api_key ?? null, sender_name ?? null, access_token ?? null, channel]
        );

        const [[updated]] = await pool.query(`SELECT * FROM notification_settings WHERE channel=?`, [channel]);
        res.json({ success: true, data: updated, message: `บันทึกการตั้งค่า ${channel.toUpperCase()} สำเร็จ` });
    } catch (err) {
        console.error('[notifications.updateSettings]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── GET /api/notifications/templates ───────────────────────────────── */
const getTemplates = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM message_templates ORDER BY id`);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[notifications.getTemplates]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── PUT /api/notifications/templates/:id ───────────────────────────── */
const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, template_key, message_text, is_active } = req.body;

        await pool.query(
            `UPDATE message_templates
             SET name=?, template_key=?, message_text=?, is_active=?
             WHERE id=?`,
            [name, template_key ?? null, message_text, is_active ? 1 : 0, id]
        );

        const [[updated]] = await pool.query(`SELECT * FROM message_templates WHERE id=?`, [id]);
        if (!updated) return res.status(404).json({ success: false, message: 'ไม่พบเทมเพลต' });

        res.json({ success: true, data: updated, message: 'อัปเดตเทมเพลตสำเร็จ' });
    } catch (err) {
        console.error('[notifications.updateTemplate]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── POST /api/notifications/test ───────────────────────────────────── */
/**
 * Body: { channel: 'telegram'|'sms', chat_id?: string, message?: string }
 *
 * For Telegram: sends a real message using the access_token stored in DB
 * (falls back to TELEGRAM_BOT_TOKEN env var if DB token is empty).
 */
const testSend = async (req, res) => {
    try {
        const { channel, chat_id, message } = req.body;

        if (!channel) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ channel' });
        }

        /* ── Telegram ── */
        if (channel === 'telegram') {
            if (!chat_id) {
                return res.status(400).json({ success: false, message: 'กรุณาระบุ chat_id เพื่อทดสอบ' });
            }

            const token = await getTelegramToken();
            const text = message || '✅ <b>ทดสอบระบบแจ้งเตือน SuperArt Repair สำเร็จ!</b>';
            const result = await telegramService.sendNotification(chat_id, text, 'HTML', token);

            if (!result.success) {
                return res.status(502).json({ success: false, message: `ส่ง Telegram ไม่สำเร็จ: ${result.message}` });
            }

            return res.json({ success: true, message: 'ส่งทดสอบ Telegram สำเร็จ', channel });
        }

        /* ── SMS (placeholder) ── */
        if (channel === 'sms') {
            console.log(`[TEST SMS] message="${message}"`);
            return res.json({ success: true, message: 'ส่งทดสอบ SMS สำเร็จ (Simulated)', channel });
        }

        return res.status(400).json({ success: false, message: 'channel ไม่ถูกต้อง' });
    } catch (err) {
        console.error('[notifications.testSend]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── POST /api/notifications/telegram/webhook ───────────────────────── */
const registerTelegramWebhookUrl = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ Webhook URL' });
        }
        
        if (!url.startsWith('https://')) {
            return res.status(400).json({ success: false, message: 'Webhook URL ต้องขึ้นต้นด้วย https:// เท่านั้น' });
        }

        const token = await getTelegramToken();
        if (!token) {
            return res.status(400).json({ success: false, message: 'กรุณาบันทึก Telegram Bot Token ก่อนลงทะเบียน Webhook' });
        }

        const result = await telegramService.registerWebhook(url, token);
        if (!result.success) {
            return res.status(502).json({ success: false, message: result.message });
        }

        return res.json({ success: true, message: 'ลงทะเบียน Webhook สำเร็จ', data: result.data });
    } catch (err) {
        console.error('[notifications.registerTelegramWebhookUrl]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

module.exports = { getSettings, updateSettings, getTemplates, updateTemplate, testSend, registerTelegramWebhookUrl };
