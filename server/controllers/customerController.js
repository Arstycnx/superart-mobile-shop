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
        const [rows] = await pool.query(
            'SELECT * FROM customers WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบลูกค้า' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('[customers.getById]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/customers/:id/repairs ───────────────────────
// Note: JSON_ARRAYAGG is not available on MariaDB 10.4, so we use
// two separate queries and assemble the timeline in JavaScript.
const getRepairs = async (req, res) => {
    try {
        // 1. Fetch repair orders for this customer
        const [repairs] = await pool.query(
            `SELECT * FROM repair_orders
             WHERE customer_id = ?
             ORDER BY received_date DESC`,
            [req.params.id]
        );

        if (repairs.length === 0) {
            return res.json({ success: true, data: [], total: 0 });
        }

        // 2. Fetch all timeline rows for those orders in one query
        const repairIds = repairs.map((r) => r.id);
        const [timelineRows] = await pool.query(
            `SELECT * FROM repair_timeline
             WHERE repair_order_id IN (?)
             ORDER BY created_at ASC`,
            [repairIds]
        );

        // 3. Group timeline rows by repair_order_id in JS
        const timelineMap = {};
        for (const row of timelineRows) {
            if (!timelineMap[row.repair_order_id]) {
                timelineMap[row.repair_order_id] = [];
            }
            timelineMap[row.repair_order_id].push({
                status: row.status,
                description: row.description,
                updated_by: row.updated_by,
                created_at: row.created_at,
            });
        }

        // 4. Attach timeline arrays to each repair order
        const data = repairs.map((r) => ({
            ...r,
            timeline: timelineMap[r.id] || [],
        }));

        res.json({ success: true, data, total: data.length });
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
        const { full_name, phone, phone2, phone3, phone4, phone5, email = null, line_id = null, telegram_chat_id = null } = req.body;
        if (!full_name || !phone) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและเบอร์โทรหลัก' });
        }
        const customer_code = await generateCode();
        const [result] = await pool.query(
            'INSERT INTO customers (customer_code, full_name, phone, phone2, phone3, phone4, phone5, email, line_id, telegram_chat_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [customer_code, full_name, phone, phone2 || null, phone3 || null, phone4 || null, phone5 || null, email, line_id, telegram_chat_id]
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
        const { full_name, phone, phone2, phone3, phone4, phone5, email, line_id, telegram_chat_id, member_level } = req.body;
        const [existing] = await pool.query('SELECT * FROM customers WHERE id = ? LIMIT 1', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบลูกค้า' });
        const cur = existing[0];
        await pool.query(
            `UPDATE customers SET full_name=?, phone=?, phone2=?, phone3=?, phone4=?, phone5=?, email=?, line_id=?, telegram_chat_id=?, member_level=? WHERE id=?`,
            [
                full_name ?? cur.full_name,
                phone ?? cur.phone,
                phone2 !== undefined ? phone2 : cur.phone2,
                phone3 !== undefined ? phone3 : cur.phone3,
                phone4 !== undefined ? phone4 : cur.phone4,
                phone5 !== undefined ? phone5 : cur.phone5,
                email ?? cur.email,
                line_id ?? cur.line_id,
                telegram_chat_id !== undefined ? telegram_chat_id : cur.telegram_chat_id,
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
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query('SELECT id FROM customers WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) {
            await conn.rollback(); conn.release();
            return res.status(404).json({ success: false, message: 'ไม่พบลูกค้า' });
        }
        // Bypass FK checks within this transaction to allow clean cascade deletion
        await conn.query('SET FOREIGN_KEY_CHECKS=0');
        await conn.query('DELETE FROM payments WHERE customer_id = ?', [req.params.id]);
        await conn.query('DELETE FROM repair_orders WHERE customer_id = ?', [req.params.id]);
        await conn.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
        await conn.query('SET FOREIGN_KEY_CHECKS=1');
        await conn.commit(); conn.release();
        res.json({ success: true, message: 'ลบลูกค้าเรียบร้อยแล้ว' });
    } catch (err) {
        await conn.rollback(); conn.release();
        console.error('[customers.remove]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};
// ─── GET /api/customers/:id/history ────────────────────────
const getHistory = async (req, res) => {
    try {
        const id = req.params.id;
        
        // Fetch repair history
        const [repairs] = await pool.query(`
            SELECT id, order_code as code, device_brand, device_model, symptoms, status, created_at as date, 'repair' as type
            FROM repair_orders
            WHERE customer_id = ?
            ORDER BY created_at DESC
        `, [id]);

        // Fetch claims history
        const [claims] = await pool.query(`
            SELECT id, claim_code as code, device_brand, device_model, claim_reason as symptoms, status, claim_date as date, 'claim' as type
            FROM claims
            WHERE customer_id = ?
            ORDER BY claim_date DESC
        `, [id]);

        // Merge and sort
        const fullHistory = [...repairs, ...claims].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({ success: true, data: fullHistory });
    } catch (err) {
        console.error('[customers.getHistory]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

module.exports = { getAll, getById, getRepairs, getPayments, getHistory, create, update, remove };
