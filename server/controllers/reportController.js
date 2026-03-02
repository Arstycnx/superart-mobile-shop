const pool = require('../config/db');

// helper to build date filter
const periodFilter = (period, col = 'created_at') => {
    switch (period) {
        case 'today': return `DATE(${col}) = CURDATE()`;
        case 'week': return `${col} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
        case 'month': return `YEAR(${col}) = YEAR(CURDATE()) AND MONTH(${col}) = MONTH(CURDATE())`;
        case 'year': return `YEAR(${col}) = YEAR(CURDATE())`;
        default: return `YEAR(${col}) = YEAR(CURDATE()) AND MONTH(${col}) = MONTH(CURDATE())`;
    }
};

/* ─── GET /api/reports/dashboard ────────────────────────── */
const getDashboard = async (req, res) => {
    try {
        // Separate queries — avoids NULL aggregate issues
        const [[{ count: totalRepairs }]] = await pool.query(`SELECT COUNT(*) AS count FROM repair_orders`);
        const [[{ count: pendingRepairs }]] = await pool.query(`SELECT COUNT(*) AS count FROM repair_orders WHERE status IN ('received','repairing')`);
        const [[{ count: completedRepairs }]] = await pool.query(`SELECT COUNT(*) AS count FROM repair_orders WHERE status IN ('completed','delivered')`);
        const [[{ total: revenue }]] = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM payments WHERE status='paid'`);

        // Low stock: quantity = 0 OR quantity <= threshold
        const [lowStock] = await pool.query(`
            SELECT id, name AS product_name, quantity, low_stock_threshold
            FROM products
            WHERE quantity = 0 OR (low_stock_threshold IS NOT NULL AND quantity <= low_stock_threshold)
            ORDER BY quantity ASC LIMIT 10`);

        // Recent 5 repairs — no date filter
        const [recentRepairs] = await pool.query(`
            SELECT r.id, r.order_code, r.device_brand, r.device_model,
                   r.symptoms, r.status, r.created_at,
                   c.full_name AS customer_name, c.phone AS customer_phone
            FROM repair_orders r
            LEFT JOIN customers c ON r.customer_id = c.id
            ORDER BY r.created_at DESC LIMIT 5`);

        const [monthlyRevenue] = await pool.query(`
            SELECT DATE_FORMAT(payment_date,'%Y-%m') AS month,
                   COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) AS revenue
            FROM payments
            GROUP BY DATE_FORMAT(payment_date,'%Y-%m')
            ORDER BY month ASC
            LIMIT 12`);

        console.log('[getDashboard] totalRepairs:', totalRepairs, 'pending:', pendingRepairs, 'completed:', completedRepairs, 'revenue:', revenue);

        res.json({
            success: true,
            data: {
                total_repairs: Number(totalRepairs) || 0,
                pending_repairs: Number(pendingRepairs) || 0,
                completed_repairs: Number(completedRepairs) || 0,
                total_revenue: Number(revenue) || 0,
                low_stock: lowStock,
                recent_repairs: recentRepairs,
                monthly_revenue: monthlyRevenue,
            },
        });
    } catch (err) {
        console.error('[reports.getDashboard]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/* ─── GET /api/reports/revenue ──────────────────────────── */
const getRevenue = async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;

        let rows;
        if (period === 'monthly' || period === 'yearly') {
            // Monthly breakdown for the current year
            [rows] = await pool.query(`
                SELECT
                    MONTH(p.payment_date)                          AS month_num,
                    DATE_FORMAT(p.payment_date,'%b')               AS month,
                    COALESCE(SUM(CASE WHEN p.status='paid' THEN p.total_amount ELSE 0 END),0) AS revenue,
                    COALESCE((
                        SELECT SUM(rp.quantity * pr.cost_price)
                        FROM repair_parts rp
                        JOIN products pr ON rp.product_id = pr.id
                        JOIN repair_orders ro ON rp.repair_order_id = ro.id
                        WHERE MONTH(ro.created_at) = MONTH(p.payment_date)
                          AND YEAR(ro.created_at)  = YEAR(p.payment_date)
                    ), 0) AS expense
                FROM payments p
                WHERE YEAR(p.payment_date) = YEAR(CURDATE())
                GROUP BY month_num, month
                ORDER BY month_num`);
        } else {
            // Daily last 30 days
            [rows] = await pool.query(`
                SELECT
                    DATE(p.payment_date)                           AS day,
                    COALESCE(SUM(CASE WHEN p.status='paid' THEN p.total_amount ELSE 0 END),0) AS revenue
                FROM payments p
                WHERE p.payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY day ORDER BY day`);
        }

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[reports.getRevenue]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── GET /api/reports/repair-types ─────────────────────── */
const normaliseDeviceType = (raw) => {
    if (!raw) return 'อื่นๆ';
    const v = raw.toLowerCase().trim();
    if (['phone', 'smartphone', 'mobile', 'มือถือ'].includes(v)) return 'มือถือ';
    if (['tablet', 'ipad', 'แท็บเล็ต'].includes(v)) return 'แท็บเล็ต';
    if (['laptop', 'notebook', 'โน้ตบุ๊ค', 'notebook pc'].includes(v)) return 'โน้ตบุ๊ค';
    if (['smartwatch', 'watch', 'นาฬิกา'].includes(v)) return 'นาฬิกา';
    return raw; // keep original if no match
};

const getRepairTypes = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT device_type AS type, COUNT(*) AS cnt
            FROM repair_orders
            WHERE device_type IS NOT NULL AND device_type != ''
            GROUP BY device_type
            ORDER BY cnt DESC`);

        // Merge rows with same normalised label
        const merged = {};
        for (const r of rows) {
            const label = normaliseDeviceType(r.type);
            merged[label] = (merged[label] || 0) + Number(r.cnt);
        }

        const total = Object.values(merged).reduce((s, n) => s + n, 0) || 1;
        const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#f87171', '#94a3b8'];

        const data = Object.entries(merged)
            .sort((a, b) => b[1] - a[1])
            .map(([type, cnt], i) => ({
                type,
                count: cnt,
                percentage: Math.round((cnt / total) * 100),
                color: COLORS[i % COLORS.length],
            }));

        res.json({ success: true, data, total });
    } catch (err) {
        console.error('[reports.getRepairTypes]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── GET /api/reports/top-products ─────────────────────── */
const getTopProducts = async (req, res) => {
    try {
        // Primary: parts actually used in repairs
        let [rows] = await pool.query(`
            SELECT p.name AS name,
                   SUM(rp.quantity) AS sold_count
            FROM repair_parts rp
            JOIN products p ON rp.product_id = p.id
            GROUP BY rp.product_id, p.name
            ORDER BY sold_count DESC
            LIMIT 5`);

        // Fallback: if no repair_parts data yet, show products by stock quantity
        if (rows.length === 0) {
            [rows] = await pool.query(`
                SELECT name,
                       quantity AS sold_count
                FROM products
                ORDER BY quantity DESC
                LIMIT 5`);
        }

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[reports.getTopProducts]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── GET /api/reports/cancellations ────────────────────── */
const getCancellations = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ro.id, ro.order_code, ro.technician_notes AS reason,
                   ro.created_at,
                   c.full_name AS customer_name, c.phone
            FROM repair_orders ro
            LEFT JOIN customers c ON ro.customer_id = c.id
            WHERE ro.status = 'cancelled'
            ORDER BY ro.updated_at DESC
            LIMIT 20`);

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[reports.getCancellations]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

/* ─── GET /api/reports/summary ──────────────────────────── */
const getSummary = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const pf = periodFilter(period, 'p.payment_date');

        const [[rev]] = await pool.query(
            `SELECT COALESCE(SUM(total_amount), 0) AS total FROM payments p WHERE status='paid' AND ${pf}`);

        const [[exp]] = await pool.query(`
            SELECT COALESCE(SUM(rp.quantity * pr.cost_price), 0) AS total
            FROM repair_parts rp
            JOIN products pr ON rp.product_id = pr.id
            JOIN repair_orders ro ON rp.repair_order_id = ro.id
            WHERE ${periodFilter(period, 'ro.created_at')}`);

        const [[repairs]] = await pool.query(
            `SELECT COUNT(*) AS total FROM repair_orders WHERE ${periodFilter(period, 'created_at')}`);

        const revenue = Number(rev.total) || 0;
        const expense = Number(exp.total) || 0;

        res.json({
            success: true,
            data: {
                total_revenue: revenue,
                total_expense: expense,
                net_profit: revenue - expense,
                total_repairs: Number(repairs.total) || 0,
                period,
            },
        });
    } catch (err) {
        console.error('[reports.getSummary]', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

module.exports = { getDashboard, getRevenue, getRepairTypes, getTopProducts, getCancellations, getSummary };
