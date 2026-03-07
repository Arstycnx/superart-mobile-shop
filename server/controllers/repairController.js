const pool = require('../config/db');
const { sendRepairStatusUpdate } = require('../services/lineService');

// ─── Helper: auto-generate order_code ─────────────────────
const generateOrderCode = async () => {
    const [[row]] = await pool.query('SELECT MAX(id) AS maxId FROM repair_orders');
    const num = (row.maxId || 0) + 1;
    const year = new Date().getFullYear();
    return `SA-${year}-${String(num).padStart(4, '0')}`;
};

// ─── Helper: add timeline entry ───────────────────────────
const addTimeline = async (conn, repairOrderId, status, description, updatedBy = 'ระบบ') => {
    await conn.query(
        'INSERT INTO repair_timeline (repair_order_id, status, description, updated_by) VALUES (?, ?, ?, ?)',
        [repairOrderId, status, description, updatedBy]
    );
};

// ─── GET /api/repairs ─────────────────────────────────────
const getAll = async (req, res) => {
    try {
        const { search = '', status = '', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = ['1=1'];
        const params = [];
        if (status && status !== 'all') {
            where.push('ro.status = ?');
            params.push(status);
        }
        if (search) {
            where.push('(ro.order_code LIKE ? OR c.full_name LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        const whereClause = where.join(' AND ');

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM repair_orders ro
       LEFT JOIN customers c ON ro.customer_id = c.id
       WHERE ${whereClause}`, params
        );

        const [data] = await pool.query(
            `SELECT ro.*,
              c.full_name AS customer_name,
              c.phone AS customer_phone,
              c.customer_code,
              c.line_user_id,
              (SELECT COUNT(*) FROM payments p WHERE p.repair_order_id = ro.id AND p.status = 'paid') AS is_paid
       FROM repair_orders ro
       LEFT JOIN customers c ON ro.customer_id = c.id
       WHERE ${whereClause}
       ORDER BY ro.id DESC
       LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        // Get status counts
        const [counts] = await pool.query(
            `SELECT status, COUNT(*) AS cnt FROM repair_orders GROUP BY status`
        );
        const statusCounts = counts.reduce((acc, r) => ({ ...acc, [r.status]: r.cnt }), {});

        res.json({ success: true, data, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)), statusCounts });
    } catch (err) {
        console.error('[repairs.getAll]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/repairs/track/:code (PUBLIC) ────────────────
const trackRepair = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT ro.*,
              c.full_name AS customer_name,
              c.phone AS customer_phone
       FROM repair_orders ro
       LEFT JOIN customers c ON ro.customer_id = c.id
       WHERE ro.order_code = ? LIMIT 1`,
            [req.params.code]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการซ่อม' });

        const order = rows[0];
        const [timeline] = await pool.query(
            'SELECT * FROM repair_timeline WHERE repair_order_id = ? ORDER BY created_at ASC',
            [order.id]
        );
        res.json({ success: true, data: { ...order, timeline } });
    } catch (err) {
        console.error('[repairs.trackRepair]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/repairs/:id ─────────────────────────────────
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT ro.*,
              c.full_name AS customer_name,
              c.phone AS customer_phone,
              c.customer_code, c.line_id, c.line_user_id
       FROM repair_orders ro
       LEFT JOIN customers c ON ro.customer_id = c.id
       WHERE ro.id = ? LIMIT 1`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการซ่อม' });

        const order = rows[0];

        const [parts] = await pool.query(
            `SELECT rp.*, p.name AS product_name, p.product_code
       FROM repair_parts rp
       LEFT JOIN products p ON rp.product_id = p.id
       WHERE rp.repair_order_id = ?`,
            [order.id]
        );

        const [timeline] = await pool.query(
            'SELECT * FROM repair_timeline WHERE repair_order_id = ? ORDER BY created_at ASC',
            [order.id]
        );

        const [payments] = await pool.query(
            'SELECT * FROM payments WHERE repair_order_id = ? ORDER BY payment_date DESC',
            [order.id]
        );

        console.log(`[getById] order #${order.id} line_user_id=${order.line_user_id ?? 'NULL'}`);
        res.json({ success: true, data: { ...order, parts, timeline, payments } });
    } catch (err) {
        console.error('[repairs.getById]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/repairs (protected) ───────────────────────
const create = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const {
            customer_id, device_type, device_brand, device_model,
            device_color, symptoms,
            estimated_cost = 0, technician_notes = '',
        } = req.body;

        if (!customer_id || !device_brand) {
            await conn.rollback(); conn.release();
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }

        const order_code = await generateOrderCode();

        const [result] = await conn.query(
            `INSERT INTO repair_orders
       (order_code, customer_id, device_type, device_brand, device_model,
        device_color, symptoms, estimated_cost,
        technician_notes, status, received_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', NOW())`,
            [order_code, customer_id, device_type || 'mobile', device_brand, device_model || '',
                device_color || '', symptoms || '',
                estimated_cost, technician_notes]
        );

        const repairId = result.insertId;

        // Initial timeline entry
        await addTimeline(conn, repairId, 'received', 'สร้างใบแจ้งซ่อม', req.user?.full_name || 'ระบบ');

        // Update customer visit_count
        await conn.query('UPDATE customers SET visit_count = visit_count + 1 WHERE id = ?', [customer_id]);

        await conn.commit();
        conn.release();

        const [rows] = await pool.query('SELECT * FROM repair_orders WHERE id = ?', [repairId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        await conn.rollback(); conn.release();
        console.error('[repairs.create]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── PUT /api/repairs/:id/status (protected) ─────────────
const STATUS_MESSAGES = {
    repairing: 'เริ่มดำเนินการซ่อม',
    completed: 'ซ่อมเสร็จเรียบร้อย',
    delivered: 'ส่งมอบเครื่องให้ลูกค้า',
    cancelled: 'ยกเลิกการซ่อม',
};

const updateStatus = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { status } = req.body;
        const validStatuses = ['received', 'repairing', 'completed', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            await conn.rollback(); conn.release();
            return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
        }

        const extra = {};
        if (status === 'completed') extra.completed_date = new Date();
        if (status === 'delivered') extra.delivered_date = new Date();

        const extraSql = Object.keys(extra).map(k => `${k} = ?`).join(', ');
        const extraVals = Object.values(extra);

        await conn.query(
            `UPDATE repair_orders SET status = ? ${extraSql ? ', ' + extraSql : ''} WHERE id = ?`,
            [status, ...extraVals, req.params.id]
        );

        const description = STATUS_MESSAGES[status] || status;
        await addTimeline(conn, req.params.id, status, description, req.user?.full_name || 'ระบบ');

        await conn.commit(); conn.release();

        const [rows] = await pool.query(
            `SELECT ro.*, c.full_name AS customer_name,
              c.line_user_id
             FROM repair_orders ro
             LEFT JOIN customers c ON ro.customer_id = c.id
             WHERE ro.id = ?`,
            [req.params.id]
        );
        const updatedOrder = rows[0];

        // ── LINE Notification (non-blocking) ─────────────────────
        // sendRepairStatusUpdate is fired-and-forgotten: if LINE fails
        // the API still returns 200 OK to the frontend.
        sendRepairStatusUpdate(
            { line_user_id: updatedOrder.line_user_id },
            updatedOrder
        ).catch((err) => console.error('[LINE] non-blocking error:', err.message));

        res.json({ success: true, data: updatedOrder });
    } catch (err) {
        await conn.rollback(); conn.release();
        console.error('[repairs.updateStatus]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/repairs/:id/notify (protected) ────────────
// Manual trigger: re-send LINE notification for the current status
const notifyCustomer = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT ro.*, c.full_name AS customer_name,
              c.line_user_id
             FROM repair_orders ro
             LEFT JOIN customers c ON ro.customer_id = c.id
             WHERE ro.id = ? LIMIT 1`,
            [req.params.id]
        );
        if (rows.length === 0)
            return res.status(404).json({ success: false, message: 'ไม่พบรายการซ่อม' });

        const order = rows[0];

        if (!order.line_user_id)
            return res.status(400).json({ success: false, message: 'ลูกค้าไม่มี LINE User ID' });

        await sendRepairStatusUpdate({ line_user_id: order.line_user_id }, order);

        res.json({ success: true, message: 'ส่งข้อความแจ้งเตือนผ่าน LINE เรียบร้อยแล้ว' });
    } catch (err) {
        console.error('[repairs.notifyCustomer]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/repairs/:id/parts (protected) ─────────────
const addParts = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const parts = req.body.parts; // [{ product_id, quantity }]
        if (!Array.isArray(parts) || parts.length === 0) {
            await conn.rollback(); conn.release();
            return res.status(400).json({ success: false, message: 'กรุณาระบุรายการอะไหล่' });
        }

        let totalCost = 0;
        for (const part of parts) {
            const [[product]] = await conn.query('SELECT * FROM products WHERE id = ? LIMIT 1', [part.product_id]);
            if (!product) continue;

            if (product.quantity < part.quantity) {
                await conn.rollback(); conn.release();
                return res.status(400).json({ success: false, message: `สินค้า "${product.product_name}" มีไม่เพียงพอ` });
            }

            const unitPrice = product.sell_price || product.cost_price || 0;
            const subtotal = unitPrice * part.quantity;
            totalCost += subtotal;

            await conn.query(
                'INSERT INTO repair_parts (repair_order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                [req.params.id, part.product_id, part.quantity, unitPrice, subtotal]
            );

            const newQty = product.quantity - part.quantity;
            const newStatus = newQty === 0 ? 'out_of_stock' : newQty <= product.low_stock_threshold ? 'low_stock' : 'in_stock';
            await conn.query(
                'UPDATE products SET quantity = ?, status = ? WHERE id = ?',
                [newQty, newStatus, part.product_id]
            );
        }

        // Update estimated cost
        await conn.query(
            'UPDATE repair_orders SET estimated_cost = estimated_cost + ? WHERE id = ?',
            [totalCost, req.params.id]
        );

        await conn.commit(); conn.release();
        res.json({ success: true, message: 'เพิ่มอะไหล่เรียบร้อยแล้ว', added: parts.length, totalCost });
    } catch (err) {
        await conn.rollback(); conn.release();
        console.error('[repairs.addParts]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/repairs/request (PUBLIC) ──────────────────
const createRequest = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { full_name, phone, line_id = null, device_type = 'mobile', device_brand, device_model = '', symptoms } = req.body;
        if (!full_name || !phone || !device_brand || !symptoms) {
            await conn.rollback(); conn.release();
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // Find or create customer
        let [[customer]] = await conn.query('SELECT * FROM customers WHERE phone = ? LIMIT 1', [phone]);
        if (!customer) {
            const [[lastCust]] = await conn.query("SELECT customer_code FROM customers ORDER BY id DESC LIMIT 1");
            const lastNum = lastCust ? parseInt(lastCust.customer_code.split('-')[1] || '0') : 0;
            const customer_code = `CUST-${String(lastNum + 1).padStart(4, '0')}`;
            const [insertResult] = await conn.query(
                'INSERT INTO customers (customer_code, full_name, phone, line_id) VALUES (?, ?, ?, ?)',
                [customer_code, full_name, phone, line_id]
            );
            [[customer]] = await conn.query('SELECT * FROM customers WHERE id = ?', [insertResult.insertId]);
        }

        const order_code = await generateOrderCode();

        const [result] = await conn.query(
            `INSERT INTO repair_orders
       (order_code, customer_id, device_type, device_brand, device_model, symptoms, status, received_date)
       VALUES (?, ?, ?, ?, ?, ?, 'received', NOW())`,
            [order_code, customer.id, device_type, device_brand, device_model, symptoms]
        );

        await addTimeline(conn, result.insertId, 'received', 'รับคำร้องออนไลน์ · ทีมงานจะติดต่อกลับภายใน 30 นาที', 'ระบบ');
        await conn.query('UPDATE customers SET visit_count = visit_count + 1 WHERE id = ?', [customer.id]);

        await conn.commit(); conn.release();
        res.status(201).json({ success: true, tracking_code: order_code });
    } catch (err) {
        await conn.rollback(); conn.release();
        console.error('[repairs.createRequest]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

module.exports = { getAll, getById, trackRepair, create, updateStatus, addParts, createRequest, notifyCustomer };
