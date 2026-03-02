const pool = require('../config/db');

// ─── Helper: compute status from quantity ───────────────────
const computeStatus = (quantity, threshold) => {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= threshold) return 'low_stock';
    return 'in_stock';
};

// ─── GET /api/products ──────────────────────────────────────
const getAll = async (req, res) => {
    try {
        const { search = '', category = '', status = '', page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let where = ['1=1'];
        const params = [];

        if (search) {
            where.push('(name LIKE ? OR product_code LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category) { where.push('category = ?'); params.push(category); }
        if (status) { where.push('status = ?'); params.push(status); }

        const whereClause = where.join(' AND ');

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM products WHERE ${whereClause}`, params
        );

        const [data] = await pool.query(
            `SELECT * FROM products WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            success: true,
            data,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (err) {
        console.error('[products.getAll]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/products/alerts/low-stock ─────────────────────
const getLowStock = async (req, res) => {
    try {
        const [data] = await pool.query(
            'SELECT * FROM products WHERE quantity <= low_stock_threshold ORDER BY quantity ASC'
        );
        res.json({ success: true, data, total: data.length });
    } catch (err) {
        console.error('[products.getLowStock]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/products/:id ──────────────────────────────────
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('[products.getById]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/products ─────────────────────────────────────
const create = async (req, res) => {
    try {
        const {
            product_code, name, description = '', category,
            cost_price = 0, sell_price = 0,
            quantity = 0, low_stock_threshold = 5, image_url = null,
        } = req.body;

        if (!name || !category) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อสินค้าและหมวดหมู่' });
        }

        const status = computeStatus(parseInt(quantity), parseInt(low_stock_threshold));

        const [result] = await pool.query(
            `INSERT INTO products
        (product_code, name, description, category, cost_price, sell_price, quantity, low_stock_threshold, image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [product_code, name, description, category, cost_price, sell_price, quantity, low_stock_threshold, image_url, status]
        );

        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'รหัสสินค้านี้มีอยู่แล้ว' });
        }
        console.error('[products.create]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── PUT /api/products/:id ──────────────────────────────────
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            product_code, name, description, category,
            cost_price, sell_price, quantity, low_stock_threshold, image_url,
        } = req.body;

        // Fetch current row for defaults
        const [existing] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
        const cur = existing[0];

        const newQty = quantity !== undefined ? parseInt(quantity) : cur.quantity;
        const newThreshold = low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : cur.low_stock_threshold;
        const newStatus = computeStatus(newQty, newThreshold);

        await pool.query(
            `UPDATE products SET
        product_code        = ?,
        name                = ?,
        description         = ?,
        category            = ?,
        cost_price          = ?,
        sell_price          = ?,
        quantity            = ?,
        low_stock_threshold = ?,
        image_url           = ?,
        status              = ?
       WHERE id = ?`,
            [
                product_code ?? cur.product_code,
                name ?? cur.name,
                description ?? cur.description,
                category ?? cur.category,
                cost_price ?? cur.cost_price,
                sell_price ?? cur.sell_price,
                newQty,
                newThreshold,
                image_url ?? cur.image_url,
                newStatus,
                id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('[products.update]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── DELETE /api/products/:id ────────────────────────────────
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
        res.json({ success: true, message: 'ลบสินค้าเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('[products.remove]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

module.exports = { getAll, getLowStock, getById, create, update, remove };
