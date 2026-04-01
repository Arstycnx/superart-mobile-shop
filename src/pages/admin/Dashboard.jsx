import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { useNavigate } from 'react-router-dom';
import {
    Wrench, Clock, CheckCircle, Banknote,
    AlertTriangle, Search, Plus, Edit2, Smartphone, RefreshCw,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ── API ── */
const API_BASE = `${API_URL}/api/reports/stats`;
const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

/* ── Helpers ── */
const thb = (n) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

// Convert MySQL %b month names or ISO date strings → Thai abbreviations
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const EN_MONTH = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const fmtMonth = (raw) => {
    if (!raw) return '';
    const d = new Date(raw);
    if (!isNaN(d.getTime()) && String(raw).length > 4) return THAI_MONTHS[d.getMonth()];
    const idx = EN_MONTH[String(raw).slice(0, 3).toLowerCase()];
    return idx !== undefined ? THAI_MONTHS[idx] : String(raw);
};

/* ── Repair status map ── */
const STATUS_MAP = {
    repairing: { label: 'กำลังซ่อม', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    completed: { label: 'ซ่อมเสร็จ', bg: 'bg-green-100', text: 'text-green-700' },
    received: { label: 'รับเครื่อง', bg: 'bg-slate-100', text: 'text-slate-600' },
    delivered: { label: 'ส่งมอบแล้ว', bg: 'bg-blue-100', text: 'text-blue-700' },
    cancelled: { label: 'ยกเลิก', bg: 'bg-red-100', text: 'text-red-700' },
};

/* ── Sub-components ── */
function RepairBadge({ status }) {
    const s = STATUS_MAP[status] || STATUS_MAP.received;
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>;
}

function StatCard({ label, value, sub, icon: Icon, accent, subGreen, loading }) {
    const borders = { blue: 'border-blue-400', orange: 'border-orange-400', green: 'border-green-400', slate: 'border-slate-400' };
    const iconBgs = { blue: 'bg-blue-50 text-blue-600', orange: 'bg-amber-50 text-amber-600', green: 'bg-green-50 text-green-600', slate: 'bg-slate-50 text-slate-600' };
    return (
        <div className={`bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between h-full border-l-4 ${borders[accent]} shadow-sm`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-xs text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">{label}</p>
                    {loading
                        ? <div className="h-8 w-20 rounded bg-slate-100 animate-pulse mb-1" />
                        : <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>}
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgs[accent]}`}>
                    <Icon size={20} />
                </div>
            </div>
            <p className={`text-xs font-medium ${subGreen ? 'text-green-600' : 'text-slate-500'}`}>{sub}</p>
        </div>
    );
}

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
            <p className="font-semibold text-slate-700 mb-0.5">{label}</p>
            <p className="text-blue-600">{thb(payload[0]?.value)}</p>
        </div>
    );
};

/* ════════════════════════════════════════ */
export default function Dashboard() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState([]);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const dashRes = await fetch(`${API_BASE}/dashboard`, { headers: getAuthHeader() });
            const dashJson = await dashRes.json();
            console.log('Dashboard API response:', dashJson);

            if (dashJson.success) {
                setData(dashJson.data);
                // Chart: use monthly_revenue from the same response
                const monthlyRev = dashJson.data.monthly_revenue || [];
                setChartData(
                    monthlyRev.map(r => ({
                        day: fmtMonth(r.month),  // '2026-02' → 'ก.พ.'
                        amount: Number(r.revenue) || 0,
                    }))
                );
            }
        } catch (err) {
            console.error('[Dashboard] fetch error', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const filtered = (data?.recent_repairs || []).filter(o =>
        !search ||
        o.order_code?.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name?.includes(search) ||
        o.device_brand?.toLowerCase().includes(search.toLowerCase())
    );

    const stats = data || {};

    return (
        <div className="space-y-6">

            {/* ── Row 1: Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="งานซ่อมทั้งหมด" value={data?.total_repairs ?? 0} sub="ทั้งหมดในระบบ" icon={Wrench} accent="blue" loading={loading} />
                <StatCard label="รอดำเนินการ" value={data?.pending_repairs ?? 0} sub="รับ + กำลังซ่อม" icon={Clock} accent="orange" loading={loading} />
                <StatCard label="ซ่อมเสร็จแล้ว" value={data?.completed_repairs ?? 0} sub="ซ่อม + ส่งมอบ" icon={CheckCircle} accent="green" loading={loading} />
                <StatCard label="รายรับรวม" value={thb(data?.total_revenue ?? 0)} sub="ยอดชำระทั้งหมด" icon={Banknote} accent="slate" loading={loading} subGreen />
            </div>

            {/* ── Row 2: Chart + Low Stock ── */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

                {/* Weekly Revenue Chart */}
                <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-semibold text-slate-800 text-sm">รายรับรายเดือน (ปีนี้) — คลิกแท่งเพื่อดูรายละเอียด</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchDashboard} className="p-1 rounded hover:bg-slate-100 transition-colors">
                                <RefreshCw size={13} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <a href="/admin/reports" className="text-xs text-blue-500 hover:underline">ดูรายงานเต็ม</a>
                        </div>
                    </div>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={chartData} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
                            {loading ? 'กำลังโหลด...' : 'ยังไม่มีข้อมูลรายรับ'}
                        </div>
                    )}
                </div>

                {/* Low Stock Alert */}
                <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={16} className="text-orange-500" />
                        <h3 className="font-semibold text-slate-800 text-sm">แจ้งเตือนสต็อกต่ำ</h3>
                        {(data?.low_stock?.length ?? 0) > 0 && (
                            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                                {data.low_stock.length} รายการ
                            </span>
                        )}
                    </div>
                    <div className="space-y-3">
                        {loading && <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />)}</div>}
                        {!loading && (data?.low_stock?.length ?? 0) === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">สต็อกปกติทุกรายการ ✓</p>
                        )}
                        {!loading && (data?.low_stock || []).map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center flex-shrink-0">
                                    <Smartphone size={14} className="text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{item.product_name}</p>
                                    {item.quantity === 0
                                        ? <span className="text-xs text-red-500 font-medium">หมดสต็อก</span>
                                        : <span className="text-xs text-orange-500">เหลือ {item.quantity} ชิ้น</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <a href="/admin/inventory" className="block text-center text-xs text-slate-500 hover:text-blue-500 mt-4 transition-colors">
                        ดูสินค้าทั้งหมด →
                    </a>
                </div>
            </div>

            {/* ── Row 3: Recent Repairs Table ── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-slate-100 gap-4 sm:gap-0">
                    <h3 className="font-semibold text-slate-800 text-sm">งานซ่อมล่าสุด</h3>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="ค้นหา..." value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg w-full sm:w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-slate-50" />
                        </div>
                        <button onClick={() => navigate('/admin/orders')}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
                            <Plus size={13} />เปิดงานซ่อม
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {['REPAIR ID', 'ลูกค้า', 'อุปกรณ์', 'อาการเสีย', 'สถานะ', 'วันที่', 'จัดการ'].map(h => (
                                    <th key={h} className="whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={7} className="text-center py-10 transition-none">
                                    <RefreshCw size={16} className="inline animate-spin mr-2 opacity-50" />กำลังโหลด...
                                </td></tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-slate-400 transition-none">ยังไม่มีรายการซ่อม</td></tr>
                            )}
                            {!loading && filtered.map(order => (
                                <tr key={order.id}>
                                    <td className="font-bold text-blue-600 font-mono whitespace-nowrap">{order.order_code}</td>
                                    <td>
                                        <p className="font-semibold text-slate-800 whitespace-nowrap">{order.customer_name}</p>
                                        <p className="text-xs text-slate-500">{order.customer_phone}</p>
                                    </td>
                                    <td className="whitespace-nowrap font-medium text-slate-700">{order.device_brand} {order.device_model}</td>
                                    <td className="text-slate-500 max-w-[180px]">
                                        <span className="truncate block" title={order.symptoms}>{order.symptoms || '—'}</span>
                                    </td>
                                    <td className="whitespace-nowrap"><RepairBadge status={order.status} /></td>
                                    <td className="text-xs font-medium text-slate-500 whitespace-nowrap">{fmtDate(order.created_at)}</td>
                                    <td>
                                        <button onClick={() => navigate('/admin/orders')}
                                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                                            <Edit2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
