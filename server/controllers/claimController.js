const pool = require('../config/db');

// GET /api/claims
const getClaims = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, cust.full_name as customer_name, cust.phone as customer_phone
            FROM claims c
            LEFT JOIN customers cust ON c.customer_id = cust.id
            ORDER BY c.claim_date DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[getClaims]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลเคลม' });
    }
};

// POST /api/claims
const createClaim = async (req, res) => {
    try {
        const { customer_id, repair_order_id, device_brand, device_model, claim_reason } = req.body;
        
        // Generate Claim Code
        const [lastClaim] = await pool.query('SELECT claim_code FROM claims ORDER BY id DESC LIMIT 1');
        let nextNum = 1;
        const currentYear = new Date().getFullYear();
        if (lastClaim.length > 0) {
            const prefix = `CLM-${currentYear}-`;
            if (lastClaim[0].claim_code.startsWith(prefix)) {
                const parts = lastClaim[0].claim_code.split('-');
                nextNum = parseInt(parts[2], 10) + 1;
            }
        }
        const claimCode = `CLM-${currentYear}-${String(nextNum).padStart(4, '0')}`;

        await pool.query(`
            INSERT INTO claims (claim_code, customer_id, repair_order_id, device_brand, device_model, claim_reason, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `, [claimCode, customer_id, repair_order_id || null, device_brand, device_model, claim_reason]);

        res.status(201).json({ success: true, message: 'บัญทึกการเคลมสำเร็จ', claim_code: claimCode });
    } catch (err) {
        console.error('[createClaim]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกการเคลม' });
    }
};

// PUT /api/claims/:id
const updateClaim = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolution_notes } = req.body;
        
        await pool.query(`
            UPDATE claims
            SET status = ?, resolution_notes = ?
            WHERE id = ?
        `, [status, resolution_notes, id]);

        res.json({ success: true, message: 'อัปเดตสถานะสำเร็จ' });
    } catch (err) {
        console.error('[updateClaim]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะเคลม' });
    }
};

// DELETE /api/claims/:id
const deleteClaim = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM claims WHERE id = ?', [id]);
        res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (err) {
        console.error('[deleteClaim]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
};

module.exports = { getClaims, createClaim, updateClaim, deleteClaim };
