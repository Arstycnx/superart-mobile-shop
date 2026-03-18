const pool = require('../config/db');

// ─── Helper: auto-generate receipt_code ──────────────────
const generateReceiptCode = async () => {
    const year = new Date().getFullYear();
    const [[row]] = await pool.query('SELECT MAX(id) AS maxId FROM payments');
    const num = (row.maxId || 0) + 1;
    return `REC-${year}-${String(num).padStart(4, '0')}`;
};

// ─── GET /api/payments ────────────────────────────────────
const getAll = async (req, res) => {
    try {
        const { search = '', status = '', date = '', page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = ['1=1'];
        const params = [];

        if (status && status !== 'all') {
            where.push('p.status = ?');
            params.push(status);
        }
        if (date) {
            where.push('DATE(p.payment_date) = ?');
            params.push(date);
        }
        if (search) {
            where.push('(p.receipt_code LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ? OR ro.order_code LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        const whereClause = where.join(' AND ');

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM payments p
             LEFT JOIN customers c  ON p.customer_id = c.id
             LEFT JOIN repair_orders ro ON p.repair_order_id = ro.id
             WHERE ${whereClause}`, params
        );

        const [data] = await pool.query(
            `SELECT p.*,
                    c.full_name AS customer_name,
                    c.phone     AS customer_phone,
                    c.customer_code,
                    ro.order_code,
                    ro.device_brand,
                    ro.device_model
             FROM payments p
             LEFT JOIN customers c      ON p.customer_id      = c.id
             LEFT JOIN repair_orders ro ON p.repair_order_id  = ro.id
             WHERE ${whereClause}
             ORDER BY p.id DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        // Status counts for tabs
        const [counts] = await pool.query(
            `SELECT status, COUNT(*) AS cnt FROM payments GROUP BY status`
        );
        const statusCounts = counts.reduce((acc, r) => ({ ...acc, [r.status]: r.cnt }), {});

        res.json({ success: true, data, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)), statusCounts });
    } catch (err) {
        console.error('[payments.getAll]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/payments/summary ────────────────────────────
const getSummary = async (req, res) => {
    try {
        const { date = '' } = req.query;
        let dateCondition = '';
        const params = [];

        if (date) {
            dateCondition = ' AND DATE(payment_date) = ?';
            params.push(date);
        }

        const [[paid]] = await pool.query(
            `SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS cnt FROM payments WHERE status='paid'${dateCondition}`, 
            params
        );
        const [[pending]] = await pool.query(
            `SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS cnt FROM payments WHERE status='pending'${dateCondition}`, 
            params
        );
        const [[overdue]] = await pool.query(
            `SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS cnt FROM payments WHERE status='overdue'${dateCondition}`, 
            params
        );
        res.json({
            success: true,
            data: {
                total_paid: Number(paid.total),
                count_paid: paid.cnt,
                total_pending: Number(pending.total),
                count_pending: pending.cnt,
                total_overdue: Number(overdue.total),
                count_overdue: overdue.cnt,
            },
        });
    } catch (err) {
        console.error('[payments.getSummary]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/payments/:id ────────────────────────────────
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.*,
                    c.full_name AS customer_name,
                    c.phone     AS customer_phone,
                    c.customer_code,
                    ro.order_code,
                    ro.device_brand,
                    ro.device_model,
                    ro.symptoms
             FROM payments p
             LEFT JOIN customers c      ON p.customer_id      = c.id
             LEFT JOIN repair_orders ro ON p.repair_order_id  = ro.id
             WHERE p.id = ? LIMIT 1`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงิน' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('[payments.getById]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/payments (protected) ──────────────────────
const create = async (req, res) => {
    try {
        const {
            repair_order_id,
            customer_id,
            amount,
            discount = 0,
            total_amount,
            payment_type = 'full',
            payment_method = 'cash',
        } = req.body;

        if (!repair_order_id || !customer_id || !amount) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        const receipt_code = await generateReceiptCode();

        const [result] = await pool.query(
            `INSERT INTO payments
             (receipt_code, repair_order_id, customer_id, amount, discount, total_amount,
              payment_type, payment_method, status, payment_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [receipt_code, repair_order_id, customer_id, amount, discount,
                total_amount ?? (amount - discount), payment_type, payment_method]
        );

        const [rows] = await pool.query(
            `SELECT p.*, c.full_name AS customer_name, ro.order_code
             FROM payments p
             LEFT JOIN customers c ON p.customer_id = c.id
             LEFT JOIN repair_orders ro ON p.repair_order_id = ro.id
             WHERE p.id = ?`, [result.insertId]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('[payments.create]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

const { updateCustomerMembership } = require('../utils/membership');

// ─── PUT /api/payments/:id/verify (protected) ────────────
const verify = async (req, res) => {
    try {
        const { action } = req.body; // 'approve' | 'reject'
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'action ต้องเป็น approve หรือ reject' });
        }

        const newStatus = action === 'approve' ? 'paid' : 'cancelled';
        const verifiedBy = req.user?.full_name || req.user?.email || 'admin';

        if (action === 'approve') {
            await pool.query(
                `UPDATE payments SET status=?, verified_by=?, verified_at=NOW() WHERE id=?`,
                [newStatus, verifiedBy, req.params.id]
            );

            // Fetch payment details to update customer total_spent
            const [[payment]] = await pool.query('SELECT customer_id, total_amount FROM payments WHERE id = ?', [req.params.id]);
            if (payment && payment.customer_id) {
                await pool.query('UPDATE customers SET total_spent = total_spent + ? WHERE id = ?', [Number(payment.total_amount || 0), payment.customer_id]);
                await updateCustomerMembership(payment.customer_id, pool);
            }
        } else {
            await pool.query(
                `UPDATE payments SET status=? WHERE id=?`,
                [newStatus, req.params.id]
            );
        }

        const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการ' });

        res.json({ success: true, data: rows[0], message: action === 'approve' ? 'ยืนยันการชำระเงินสำเร็จ' : 'ปฏิเสธการชำระเงินแล้ว' });
    } catch (err) {
        console.error('[payments.verify]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

module.exports = { getAll, getById, getSummary, create, verify };
