const pool = require('../config/db');

/* ── Auto-create tables if missing ──────────────────────── */
const ensureTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_settings (
            id           INT PRIMARY KEY AUTO_INCREMENT,
            channel      VARCHAR(20)  NOT NULL UNIQUE,  -- 'sms' | 'line'
            is_enabled   TINYINT(1)   NOT NULL DEFAULT 0,
            api_key      VARCHAR(500) DEFAULT NULL,
            sender_name  VARCHAR(100) DEFAULT NULL,
            access_token VARCHAR(500) DEFAULT NULL,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS message_templates (
            id           INT PRIMARY KEY AUTO_INCREMENT,
            name         VARCHAR(100) NOT NULL,
            message_text TEXT         NOT NULL,
            is_active    TINYINT(1)   NOT NULL DEFAULT 1,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // Seed default rows if tables are empty
    const [[{ cnt: sc }]] = await pool.query(`SELECT COUNT(*) AS cnt FROM notification_settings`);
    if (sc === 0) {
        await pool.query(`
            INSERT INTO notification_settings (channel, is_enabled, api_key, sender_name, access_token)
            VALUES
                ('sms',  1, 'sk_live_...', 'SuperArt', NULL),
                ('line', 0, NULL,          NULL,        '')
        `);
    }

    const [[{ cnt: tc }]] = await pool.query(`SELECT COUNT(*) AS cnt FROM message_templates`);
    if (tc === 0) {
        await pool.query(`
            INSERT INTO message_templates (name, message_text, is_active) VALUES
            ('รับเครื่องเรียบร้อย',
             'สวัสดี {ชื่อ}, เราได้รับเครื่อง {model} ของคุณแล้ว เลขที่ใบรับซ่อม คือ {tracking_id}', 1),
            ('กำลังดำเนินการซ่อม',
             'อัปเดตงานซ่อม: ช่างของเรากำลังเริ่มดำเนินการซ่อม {model} ของคุณ คาดว่าจะเสร็จภายใน {est_time}', 1),
            ('ซ่อมเสร็จสิ้น (Pick up)',
             'งานซ่อมเสร็จสิ้นแล้ว! คุณสามารถมารับ {model} ได้ที่ร้าน SuperArt พร้อมชำระเงิน {cost} บาท', 0)
        `);
    }
};

// Init tables on startup
ensureTables().catch(e => console.error('[notifications] table init error', e));

/* ─── GET /api/notifications/settings ────────────────────── */
const getSettings = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM notification_settings ORDER BY id`);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[notifications.getSettings]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── PUT /api/notifications/settings/:channel ────────────── */
const updateSettings = async (req, res) => {
    try {
        const { channel } = req.params;
        if (!['sms', 'line'].includes(channel)) {
            return res.status(400).json({ success: false, message: 'channel ไม่ถูกต้อง (sms หรือ line เท่านั้น)' });
        }

        const { is_enabled, api_key, sender_name, access_token } = req.body;

        await pool.query(`
            UPDATE notification_settings
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

/* ─── GET /api/notifications/templates ───────────────────── */
const getTemplates = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM message_templates ORDER BY id`);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[notifications.getTemplates]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── PUT /api/notifications/templates/:id ───────────────── */
const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, message_text, is_active } = req.body;

        await pool.query(`
            UPDATE message_templates
            SET name=?, message_text=?, is_active=?
            WHERE id=?`,
            [name, message_text, is_active ? 1 : 0, id]
        );

        const [[updated]] = await pool.query(`SELECT * FROM message_templates WHERE id=?`, [id]);
        if (!updated) return res.status(404).json({ success: false, message: 'ไม่พบเทมเพลต' });

        res.json({ success: true, data: updated, message: 'อัปเดตเทมเพลตสำเร็จ' });
    } catch (err) {
        console.error('[notifications.updateTemplate]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── POST /api/notifications/test ──────────────────────── */
const testSend = async (req, res) => {
    try {
        const { channel, message } = req.body;
        // In a real system you'd call the SMS / Line API here
        console.log(`[TEST NOTIFICATION] channel=${channel} message="${message}"`);
        res.json({ success: true, message: 'ส่งทดสอบสำเร็จ', channel, sent_message: message });
    } catch (err) {
        console.error('[notifications.testSend]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

module.exports = { getSettings, updateSettings, getTemplates, updateTemplate, testSend };
