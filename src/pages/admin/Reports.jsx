import { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import {
    TrendingUp, TrendingDown, Wrench, DollarSign,
    Download, AlertTriangle, Plus, ShoppingBag, RefreshCw,
} from 'lucide-react';

/* ─── API ──────────────────────────────── */
const API_BASE = 'http://localhost:5000/api/reports';
const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

/* ─── Helpers ──────────────────────────── */
const thb = (n) => '฿' + Number(n || 0).toLocaleString('th-TH');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

// Thai month abbreviations for chart x-axis
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const EN_MONTH = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const fmtMonth = (raw) => {
    if (!raw) return '';
    const d = new Date(raw);
    if (!isNaN(d.getTime()) && String(raw).length > 4) return THAI_MONTHS[d.getMonth()];
    const idx = EN_MONTH[String(raw).slice(0, 3).toLowerCase()];
    return idx !== undefined ? THAI_MONTHS[idx] : String(raw);
};

/* ─── Period map ────────────────────────── */
const PERIOD_MAP = { 'วันนี้': 'today', 'สัปดาห์นี้': 'week', 'เดือนนี้': 'month', 'ปีนี้': 'year' };
const DATE_TABS = ['วันนี้', 'สัปดาห์นี้', 'เดือนนี้', 'ปีนี้'];
const PIE_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#f87171', '#94a3b8'];

/* ─── Skeleton ──────────────────────────── */
function Skeleton({ h = 'h-8', w = 'w-24' }) {
    return <div className={`${h} ${w} rounded bg-slate-100 animate-pulse`} />;
}

/* ─── Stat Card ─────────────────────────── */
function StatCard({ title, value, sub, icon: Icon, iconBg, trend, trendUp, progress, sub2, loading }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
                    <Icon size={17} className="text-white" />
                </div>
            </div>
            {loading ? <Skeleton /> : <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>}
            {trend && !loading && (
                <div className={`flex items-center gap-1 text-xs font-semibold mb-1 ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
                    {trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span>{trend}</span>
                </div>
            )}
            {sub && <p className="text-xs text-slate-400">{sub}</p>}
            {progress != null && !loading && (
                <>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    {sub2 && <p className="text-xs text-slate-400 mt-1">{sub2}</p>}
                </>
            )}
        </div>
    );
}

/* ─── Bar Chart Tooltip ─────────────────── */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl shadow-lg p-3 text-xs" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <p className="text-slate-400 mb-2 font-medium">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex justify-between gap-4">
                    <span style={{ color: p.fill }}>{p.name === 'revenue' ? 'รายได้' : 'ค่าใช้จ่าย'}</span>
                    <span className="text-white font-semibold">{thb(p.value)}</span>
                </div>
            ))}
        </div>
    );
}

/* ─── Donut center label ────────────────── */
function DonutLabel({ cx, cy, total }) {
    return (
        <>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1e293b">{total}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="#94a3b8">Jobs</text>
        </>
    );
}

/* ═══════════════════════════════════════ */
/*  MAIN PAGE                             */
/* ═══════════════════════════════════════ */
export default function Reports() {
    const [dateTab, setDateTab] = useState('เดือนนี้');
    const [summary, setSummary] = useState(null);
    const [revenue, setRevenue] = useState([]);
    const [repairTypes, setRepairTypes] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [cancels, setCancels] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const period = PERIOD_MAP[dateTab] || 'month';
        try {
            const [sumRes, revRes, typRes, topRes, canRes] = await Promise.all([
                fetch(`${API_BASE}/summary?period=${period}`, { headers: getAuthHeader() }),
                fetch(`${API_BASE}/revenue?period=monthly`, { headers: getAuthHeader() }),
                fetch(`${API_BASE}/repair-types`, { headers: getAuthHeader() }),
                fetch(`${API_BASE}/top-products`, { headers: getAuthHeader() }),
                fetch(`${API_BASE}/cancellations`, { headers: getAuthHeader() }),
            ]);
            const [sumJson, revJson, typJson, topJson, canJson] = await Promise.all([
                sumRes.json(), revRes.json(), typRes.json(), topRes.json(), canRes.json(),
            ]);

            if (sumJson.success) setSummary(sumJson.data);
            if (revJson.success) setRevenue(
                revJson.data.map(r => ({ ...r, month: fmtMonth(r.month || r.day) }))
            );
            if (typJson.success) setRepairTypes(typJson.data);
            if (topJson.success) setTopProducts(topJson.data);
            if (canJson.success) setCancels(canJson.data);

            // low stock from dashboard
            const dashRes = await fetch(`${API_BASE}/dashboard`, { headers: getAuthHeader() });
            const dashJson = await dashRes.json();
            if (dashJson.success) setLowStock(dashJson.data.low_stock_items || []);
        } catch (err) {
            console.error('[Reports] fetchAll error', err);
        }
        setLoading(false);
    }, [dateTab]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const maxSold = topProducts.reduce((m, p) => Math.max(m, Number(p.sold_count)), 0) || 1;

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                    <h1 className="text-xl font-bold text-slate-800">รายงานสรุป</h1>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
                        {DATE_TABS.map(t => (
                            <button key={t} onClick={() => setDateTab(t)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${dateTab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <button onClick={fetchAll} className="p-2 rounded-xl hover:bg-slate-100 transition-colors" title="รีเฟรช">
                        <RefreshCw size={15} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0 hover:brightness-110 transition-all"
                        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                        <Download size={15} />ส่งออก (PDF)
                    </button>
                </div>
            </div>

            {/* ── ROW 1: Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="รายได้รวม" value={thb(summary?.total_revenue)} icon={DollarSign} iconBg="bg-green-500" trendUp={true} sub={`ช่วง: ${dateTab}`} loading={loading} />
                <StatCard title="ค่าใช้จ่าย" value={thb(summary?.total_expense)} icon={TrendingDown} iconBg="bg-red-500" sub="ต้นทุนอะไหล่" loading={loading} />
                <StatCard title="กำไรสุทธิ" value={thb(summary?.net_profit)} icon={TrendingUp} iconBg="bg-emerald-500" trendUp={true} loading={loading}
                    progress={summary ? Math.min(100, Math.round(((summary.net_profit) / (summary.total_revenue || 1)) * 100)) : 0}
                    sub2={`margin ${summary ? Math.round(((summary.net_profit) / (summary.total_revenue || 1)) * 100) : 0}%`} />
                <StatCard title="งานซ่อมทั้งหมด" value={summary?.total_repairs ?? '—'} icon={Wrench} iconBg="bg-blue-500" sub={`ช่วง: ${dateTab}`} loading={loading} />
            </div>

            {/* ── ROW 2: Revenue Bar + Repair Types Donut ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* Bar chart — Revenue vs Expense */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-700">รายได้ vs ค่าใช้จ่าย (รายเดือน)</h2>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> รายได้</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" /> ค่าใช้จ่าย</span>
                        </div>
                    </div>
                    {revenue.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={revenue} barGap={4} barCategoryGap="35%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
                            {loading ? 'กำลังโหลด...' : 'ยังไม่มีข้อมูล'}
                        </div>
                    )}
                </div>

                {/* Donut — Repair Types */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-bold text-slate-700 mb-4">ประเภทงานซ่อม</h2>
                    {repairTypes.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={repairTypes.map(r => ({ name: r.type, value: r.count }))}
                                        cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                                        dataKey="value" startAngle={90} endAngle={-270} labelLine={false}>
                                        {repairTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        <DonutLabel cx="50%" cy="50%" total={repairTypes.reduce((s, r) => s + r.count, 0)} />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 mt-1">
                                {repairTypes.map((d, i) => (
                                    <div key={d.type} className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="text-slate-600">{d.type}</span>
                                        </span>
                                        <span className="font-bold text-slate-700">{d.percentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-[180px] flex items-center justify-center text-sm text-slate-400">
                            {loading ? 'กำลังโหลด...' : 'ยังไม่มีข้อมูล'}
                        </div>
                    )}
                </div>
            </div>

            {/* ── ROW 3: Top Products + Cancellations + Low Stock ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Top Products */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <ShoppingBag size={15} className="text-blue-500" />
                        <h2 className="text-sm font-bold text-slate-700">อะไหล่ที่ใช้บ่อย Top 5</h2>
                    </div>
                    <div className="space-y-3.5">
                        {loading && [1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 rounded bg-slate-100 animate-pulse" />)}
                        {!loading && topProducts.length === 0 && <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีข้อมูล</p>}
                        {!loading && topProducts.map((p, i) => (
                            <div key={p.name}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-slate-600 truncate pr-2">{p.name}</span>
                                    <span className="text-xs font-bold text-slate-700 flex-shrink-0">{p.sold_count}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full transition-all"
                                        style={{ width: `${(Number(p.sold_count) / maxSold) * 100}%`, backgroundColor: PIE_COLORS[i] }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cancellations */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-700">ยกเลิกรายการ</h2>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
                            {cancels.length} รายการ
                        </span>
                    </div>
                    <div>
                        <div className="grid grid-cols-3 gap-2 mb-2 pb-2 border-b border-slate-100">
                            {['ID', 'ลูกค้า', 'เหตุผล'].map(h => <span key={h} className="text-[11px] font-semibold text-slate-400 uppercase">{h}</span>)}
                        </div>
                        {loading && <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-6 rounded bg-slate-100 animate-pulse" />)}</div>}
                        {!loading && cancels.length === 0 && <p className="text-sm text-slate-400 text-center py-4">ไม่มีรายการยกเลิก</p>}
                        <div className="space-y-3">
                            {!loading && cancels.map((c) => (
                                <div key={c.id} className="grid grid-cols-3 gap-2 items-center">
                                    <span className="text-xs font-mono text-blue-500 truncate">{c.order_code}</span>
                                    <span className="text-xs text-slate-600 truncate">{c.customer_name}</span>
                                    <span className="text-xs text-slate-500 truncate">{c.reason || '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Low Stock */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={15} className="text-amber-500" />
                        <h2 className="text-sm font-bold text-slate-700">สต็อกใกล้หมด!</h2>
                    </div>
                    <div className="space-y-3">
                        {loading && [1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
                        {!loading && lowStock.length === 0 && <p className="text-sm text-slate-400 text-center py-4">สต็อกปกติ ✓</p>}
                        {!loading && lowStock.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
                                <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-lg">📱</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{item.product_name}</p>
                                    <p className="text-[11px] text-red-500 font-medium">เหลือ {item.quantity} ชิ้น</p>
                                </div>
                                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0 hover:brightness-110 transition-all"
                                    style={{ backgroundColor: '#f97316' }}>
                                    <Plus size={11} />เติมของ
                                </button>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-3 text-xs text-blue-500 hover:text-blue-600 font-medium py-2 hover:bg-blue-50 rounded-xl transition-colors">
                        ดูรายการทั้งหมด →
                    </button>
                </div>
            </div>
        </div>
    );
}
