const pool = require('../config/db');

// GET /api/settings/receipt
const getReceiptSettings = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM shop_settings LIMIT 1');
        if (rows.length === 0) {
            return res.json({ success: true, data: {} });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('[getReceiptSettings]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดการตั้งค่า' });
    }
};

// PUT /api/settings/receipt
const updateReceiptSettings = async (req, res) => {
    try {
        const { shop_name, shop_address, tax_id, phone, logo_url, receipt_footer_text } = req.body;
        
        await pool.query(`
            UPDATE shop_settings 
            SET shop_name = ?, shop_address = ?, tax_id = ?, phone = ?, logo_url = ?, receipt_footer_text = ?
            WHERE id = 1
        `, [shop_name, shop_address, tax_id, phone, logo_url, receipt_footer_text]);

        res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' });
    } catch (err) {
        console.error('[updateReceiptSettings]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' });
    }
};

module.exports = { getReceiptSettings, updateReceiptSettings };
