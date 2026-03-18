const pool = require('../config/db');
const { sendRepairStatusUpdate } = require('../services/telegramService');
const { updateCustomerMembership } = require('../utils/membership');

// ─── Helper: fetch Telegram bot token from DB (falls back to env var) ──
const getTelegramToken = async () => {
    try {
        const [[row]] = await pool.query(
            `SELECT access_token FROM notification_settings WHERE channel = 'telegram' LIMIT 1`
        );
        return (row && row.access_token) ? row.access_token : process.env.TELEGRAM_BOT_TOKEN;
    } catch {
        return process.env.TELEGRAM_BOT_TOKEN;
    }
};

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
              c.telegram_chat_id,
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

        const [parts] = await pool.query(
            `SELECT rp.*, p.name AS product_name, p.product_code
       FROM repair_parts rp
       LEFT JOIN products p ON rp.product_id = p.id
       WHERE rp.repair_order_id = ?`,
            [order.id]
        );

        const [paymentRow] = await pool.query(
            "SELECT COUNT(*) as count FROM payments WHERE repair_order_id = ? AND status = 'paid'",
            [order.id]
        );
        const is_paid = paymentRow[0].count > 0 ? 1 : 0;

        const [timeline] = await pool.query(
            'SELECT * FROM repair_timeline WHERE repair_order_id = ? ORDER BY created_at ASC',
            [order.id]
        );
        res.json({ success: true, data: { ...order, parts, is_paid, timeline } });
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
              c.customer_code, c.telegram_chat_id,
              (SELECT COUNT(*) FROM payments p WHERE p.repair_order_id = ro.id AND p.status = 'paid') AS is_paid
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

        console.log(`[getById] order #${order.id} telegram_chat_id=${order.telegram_chat_id ?? 'NULL'}`);
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

        // ── Restrict Delivery if Unpaid ────────────────────────
        if (status === 'delivered') {
            const [[existingPayment]] = await conn.query(
                'SELECT id, status FROM payments WHERE repair_order_id = ? LIMIT 1',
                [req.params.id]
            );

            if (!existingPayment || existingPayment.status !== 'paid') {
                await conn.rollback(); conn.release();
                return res.status(400).json({ success: false, message: 'ไม่สามารถส่งมอบได้ กรุณาชำระเงินให้เรียบร้อยก่อน' });
            }
        }

        const description = STATUS_MESSAGES[status] || status;
        await addTimeline(conn, req.params.id, status, description, req.user?.full_name || 'ระบบ');

        await conn.commit(); conn.release();

        const [rows] = await pool.query(
            `SELECT ro.*, c.full_name AS customer_name,
              c.telegram_chat_id
             FROM repair_orders ro
             LEFT JOIN customers c ON ro.customer_id = c.id
             WHERE ro.id = ?`,
            [req.params.id]
        );
        const updatedOrder = rows[0];

        // ── Telegram Notification (non-blocking) ──────────────────
        // Fired-and-forgotten: Telegram failure does NOT affect the 200 OK response.
        getTelegramToken().then(token =>
            sendRepairStatusUpdate(
                updatedOrder.telegram_chat_id,
                updatedOrder,
                token
            )
        ).catch((err) => console.error('[Telegram] non-blocking error:', err.message));

        res.json({ success: true, data: updatedOrder });
    } catch (err) {
        await conn.rollback(); conn.release();
        console.error('[repairs.updateStatus]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/repairs/:id/notify (protected) ────────────
// Manual trigger: re-send telegram notification for the current status
const notifyCustomer = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT ro.*, c.full_name AS customer_name,
              c.telegram_chat_id
             FROM repair_orders ro
             LEFT JOIN customers c ON ro.customer_id = c.id
             WHERE ro.id = ? LIMIT 1`,
            [req.params.id]
        );
        if (rows.length === 0)
            return res.status(404).json({ success: false, message: 'ไม่พบรายการซ่อม' });

        const order = rows[0];

        if (!order.telegram_chat_id)
            return res.status(400).json({ success: false, message: 'ลูกค้าไม่มี Telegram Chat ID' });

        const token = await getTelegramToken();
        const result = await sendRepairStatusUpdate(
            order.telegram_chat_id,
            order,
            token
        );
        if (!result.success) {
            return res.status(502).json({ success: false, message: `ส่ง Telegram ไม่สำเร็จ: ${result.message}` });
        }

        res.json({ success: true, message: 'ส่งข้อความแจ้งเตือนผ่าน Telegram เรียบร้อยแล้ว' });
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
        const {
            full_name, phone, line_id = null,
            device_type = 'mobile', device_brand, device_model = '',
            symptoms, appointment_date = null,
            estimated_cost = 0, technician_notes = ''
        } = req.body;

        if (!full_name || !phone || !device_brand || !symptoms) {
            await conn.rollback(); conn.release();
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // Handle photos (Multer files or Base64 body fallback)
        let before_photo_path = null;
        let after_photo_path = null;

        // 1. Try Multer files
        if (req.files) {
            if (req.files.before_photo && req.files.before_photo[0]) {
                before_photo_path = `/uploads/repairs/${req.files.before_photo[0].filename}`;
            }
            if (req.files.after_photo && req.files.after_photo[0]) {
                after_photo_path = `/uploads/repairs/${req.files.after_photo[0].filename}`;
            }
        }

        // 2. Fallback to base64 if provided in body (useful for quick legacy fix or specific clients)
        if (!before_photo_path && req.body.before_photo_base64) {
            // Logic to save base64 could go here, but for now we prioritize Multipart
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
       (order_code, customer_id, device_type, device_brand, device_model, symptoms, status, received_date, before_photo, after_photo, appointment_date, estimated_cost, technician_notes)
       VALUES (?, ?, ?, ?, ?, ?, 'received', NOW(), ?, ?, ?, ?, ?)`,
            [order_code, customer.id, device_type, device_brand, device_model, symptoms, before_photo_path, after_photo_path, appointment_date, estimated_cost, technician_notes]
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

// ─── DELETE /api/repairs/:id (protected) ────────────────
const deleteRepair = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[order]] = await conn.query('SELECT * FROM repair_orders WHERE id = ? LIMIT 1', [req.params.id]);
        if (!order) {
            await conn.rollback(); conn.release();
            return res.status(404).json({ success: false, message: 'ไม่พบรายการซ่อม' });
        }
        // Delete payments first (no cascade)
        const [[pay]] = await conn.query('SELECT id, total_amount FROM payments WHERE repair_order_id = ? LIMIT 1', [req.params.id]);
        if (pay) {
            // Reverse customer total_spent if paid
            await conn.query(
                'UPDATE customers SET total_spent = GREATEST(0, total_spent - ?), visit_count = GREATEST(0, visit_count - 1) WHERE id = ?',
                [Number(pay.total_amount || 0), order.customer_id]
            );
            await conn.query('DELETE FROM payments WHERE repair_order_id = ?', [req.params.id]);
            await updateCustomerMembership(order.customer_id, conn);
        }
        // Delete repair order (repair_timeline & repair_parts cascade)
        await conn.query('DELETE FROM repair_orders WHERE id = ?', [req.params.id]);
        await conn.commit(); conn.release();
        res.json({ success: true, message: 'ลบรายการซ่อมเรียบร้อยแล้ว' });
    } catch (err) {
        await conn.rollback(); conn.release();
        console.error('[repairs.delete]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── PUT /api/repairs/:id/payment (protected) ────────────
const togglePayment = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { is_paid } = req.body;
        const repairId = req.params.id;

        const [[order]] = await conn.query(
            'SELECT customer_id, final_cost, estimated_cost FROM repair_orders WHERE id = ?',
            [repairId]
        );

        if (!order) {
            await conn.rollback(); conn.release();
            return res.status(404).json({ success: false, message: 'ไม่พบรายการแจ้งซ่อม' });
        }

        const [[payment]] = await pool.query(
            'SELECT id, status, amount FROM payments WHERE repair_order_id = ? LIMIT 1',
            [repairId]
        );

        const amount = Number(order.final_cost || order.estimated_cost || 0);

        if (is_paid) {
            // Mark as Paid
            if (payment) {
                if (payment.status !== 'paid') {
                    await conn.query('UPDATE payments SET status = "paid", verified_at = NOW(), verified_by = ? WHERE id = ?', [req.user?.full_name || 'ระบบ', payment.id]);
                    await conn.query('UPDATE customers SET total_spent = total_spent + ? WHERE id = ?', [payment.amount || amount, order.customer_id]);
                }
            } else {
                const receiptCode = `RCP-MAN-${Date.now()}`;
                await conn.query(
                    `INSERT INTO payments (receipt_code, repair_order_id, customer_id, amount, total_amount, payment_type, payment_method, status, verified_by, verified_at)
                     VALUES (?, ?, ?, ?, ?, 'full', 'cash', 'paid', ?, NOW())`,
                    [receiptCode, repairId, order.customer_id, amount, amount, req.user?.full_name || 'ระบบ']
                );
                await conn.query('UPDATE customers SET total_spent = total_spent + ? WHERE id = ?', [amount, order.customer_id]);
            }
            await updateCustomerMembership(order.customer_id, conn);
        } else {
            // Mark as Unpaid (cancel payment)
            if (payment && payment.status === 'paid') {
                await conn.query('UPDATE payments SET status = "cancelled" WHERE id = ?', [payment.id]);
                await conn.query('UPDATE customers SET total_spent = GREATEST(0, total_spent - ?) WHERE id = ?', [payment.amount || amount, order.customer_id]);
                await updateCustomerMembership(order.customer_id, conn);
            }
        }

        await conn.commit(); conn.release();
        res.json({ success: true, message: is_paid ? 'ชำระเงินเรียบร้อยแล้ว' : 'ยกเลิกการชำระเงินแล้ว' });
    } catch (err) {
        await conn.rollback(); conn.release();
        console.error('[repairs.togglePayment]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/repairs/:id/upload-photo ──────────────────
const uploadPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // 'before' or 'after'
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'ไม่พบไฟล์รูปภาพ' });
        }

        if (!['before', 'after'].includes(type)) {
            return res.status(400).json({ success: false, message: 'ประเภทรูปภาพไม่ถูกต้อง' });
        }

        const columnName = type === 'before' ? 'before_photo' : 'after_photo';
        const fileUrl = `/uploads/repairs/${req.file.filename}`;

        await pool.query(
            `UPDATE repair_orders SET ${columnName} = ? WHERE id = ?`,
            [fileUrl, id]
        );

        res.json({ success: true, message: 'อัปโหลดรูปภาพสำเร็จ', url: fileUrl });
    } catch (err) {
        console.error('[repairs.uploadPhoto]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};


module.exports = {
    getAll, getById, trackRepair, create, updateStatus, addParts,
    createRequest, notifyCustomer, deleteRepair, togglePayment, uploadPhoto
};
