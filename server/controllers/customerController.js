const pool = require('../config/db');

// ─── Helper: auto-generate customer_code ───────────────────
const generateCode = async () => {
    const [[row]] = await pool.query(
        "SELECT customer_code FROM customers ORDER BY id DESC LIMIT 1"
    );
    if (!row) return 'CUST-0001';
    const num = parseInt(row.customer_code.split('-')[1] || '0') + 1;
    return `CUST-${String(num).padStart(4, '0')}`;
};

// ─── GET /api/customers ────────────────────────────────────
const getAll = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let where = ['1=1'];
        const params = [];
        if (search) {
            where.push('(full_name LIKE ? OR phone LIKE ? OR customer_code LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        const whereClause = where.join(' AND ');

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM customers WHERE ${whereClause}`, params
        );
        const [data] = await pool.query(
            `SELECT * FROM customers WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({ success: true, data, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        console.error('[customers.getAll]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/customers/:id ────────────────────────────────
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM customers WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบลูกค้า' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('[customers.getById]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/customers/:id/repairs ───────────────────────
const getRepairs = async (req, res) => {
    try {
        const [repairs] = await pool.query(
            `SELECT ro.*,
              (SELECT JSON_ARRAYAGG(
                JSON_OBJECT('status', rt.status, 'description', rt.description,
                            'updated_by', rt.updated_by, 'created_at', rt.created_at)
              ) FROM repair_timeline rt WHERE rt.repair_order_id = ro.id) AS timeline
       FROM repair_orders ro
       WHERE ro.customer_id = ?
       ORDER BY ro.received_date DESC`,
            [req.params.id]
        );
        res.json({ success: true, data: repairs, total: repairs.length });
    } catch (err) {
        console.error('[customers.getRepairs]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/customers/:id/payments ──────────────────────
const getPayments = async (req, res) => {
    try {
        const [payments] = await pool.query(
            `SELECT p.*, ro.order_code, ro.device_brand, ro.device_model
       FROM payments p
       JOIN repair_orders ro ON p.repair_order_id = ro.id
       WHERE p.customer_id = ?
       ORDER BY p.payment_date DESC`,
            [req.params.id]
        );
        res.json({ success: true, data: payments, total: payments.length });
    } catch (err) {
        console.error('[customers.getPayments]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/customers ───────────────────────────────────
const create = async (req, res) => {
    try {
        const { full_name, phone, email = null, line_id = null, address = null } = req.body;
        if (!full_name || !phone) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและเบอร์โทร' });
        }
        const customer_code = await generateCode();
        const [result] = await pool.query(
            'INSERT INTO customers (customer_code, full_name, phone, email, line_id) VALUES (?, ?, ?, ?, ?)',
            [customer_code, full_name, phone, email, line_id]
        );
        const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('[customers.create]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── PUT /api/customers/:id ────────────────────────────────
const update = async (req, res) => {
    try {
        const { full_name, phone, email, line_id, member_level } = req.body;
        const [existing] = await pool.query('SELECT * FROM customers WHERE id = ? LIMIT 1', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบลูกค้า' });
        const cur = existing[0];
        await pool.query(
            `UPDATE customers SET full_name=?, phone=?, email=?, line_id=?, member_level=? WHERE id=?`,
            [
                full_name ?? cur.full_name,
                phone ?? cur.phone,
                email ?? cur.email,
                line_id ?? cur.line_id,
                member_level ?? cur.member_level,
                req.params.id,
            ]
        );
        const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('[customers.update]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── DELETE /api/customers/:id ─────────────────────────────
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบลูกค้า' });
        res.json({ success: true, message: 'ลบลูกค้าเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('[customers.remove]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

module.exports = { getAll, getById, getRepairs, getPayments, create, update, remove };
