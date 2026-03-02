import { useState, useEffect, useCallback } from 'react';
import {
    Search, Plus, X, CheckSquare, Square, Eye,
    ChevronDown, Download, Shield, RefreshCw, AlertCircle,
} from 'lucide-react';

/* ─── API ──────────────────────────────────────────────── */
const API = 'http://localhost:5000/api/payments';
const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

/* ─── Helpers ──────────────────────────────────────────── */
const thb = (n) => '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const thbShort = (n) => '฿' + Number(n || 0).toLocaleString('th-TH');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

/* ─── Status meta ──────────────────────────────────────── */
const statusMeta = {
    pending: { label: 'รอชำระ', bg: 'rgba(251,146,60,0.18)', text: '#fb923c', border: 'rgba(251,146,60,0.35)' },
    paid: { label: 'ชำระแล้ว', bg: 'rgba(52,211,153,0.15)', text: '#34d399', border: 'rgba(52,211,153,0.3)' },
    overdue: { label: 'ค้างชำระ', bg: 'rgba(248,113,113,0.15)', text: '#f87171', border: 'rgba(248,113,113,0.3)' },
    cancelled: { label: 'ยกเลิก', bg: 'rgba(148,163,184,0.12)', text: '#94a3b8', border: 'rgba(148,163,184,0.25)' },
};

const methodMap = {
    cash: '💵 เงินสด', transfer: '🏦 โอนเงิน',
    qr: '📲 QR Code', credit_card: '💳 บัตรเครดิต',
};

const typeMap = {
    full: 'ค่าซ่อมเต็ม', partial: 'ชำระบางส่วน', deposit: 'มัดจำ',
};

/* ─── Toast ────────────────────────────────────────────── */
function Toast({ msg, type, onHide }) {
    useEffect(() => { const t = setTimeout(onHide, 3000); return () => clearTimeout(t); }, [onHide]);
    const colors = type === 'success'
        ? { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#34d399' }
        : { bg: 'rgba(248,113,113,0.15)', border: '#f87171', text: '#f87171' };
    return (
        <div className="fixed top-5 right-5 z-[99] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl"
            style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>
            <AlertCircle size={15} style={{ color: colors.text }} />
            <span className="text-sm font-medium" style={{ color: colors.text }}>{msg}</span>
        </div>
    );
}

/* ─── Badge ────────────────────────────────────────────── */
function Badge({ status }) {
    const m = statusMeta[status] || statusMeta.pending;
    return (
        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: m.bg, color: m.text, border: `1px solid ${m.border}` }}>
            {m.label}
        </span>
    );
}

/* ─── Slip Mock ────────────────────────────────────────── */
function SlipMockup({ payment }) {
    return (
        <div className="flex items-center justify-center h-full py-4">
            <div className="w-48 rounded-2xl overflow-hidden shadow-2xl"
                style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="bg-green-500 py-4 flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckSquare size={20} className="text-white" />
                    </div>
                    <p className="text-white text-xs font-bold">ทำรายการสำเร็จ</p>
                </div>
                <div className="p-4 space-y-2">
                    {[
                        ['จำนวนเงิน', thb(payment?.total_amount)],
                        ['วันที่', fmtDate(payment?.payment_date)],
                        ['วิธีชำระ', methodMap[payment?.payment_method] || payment?.payment_method || '—'],
                        ['เลขอ้างอิง', payment?.receipt_code || '—'],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                            <span className="text-[10px] text-slate-400">{k}</span>
                            <span className="text-[10px] font-semibold text-slate-700">{v}</span>
                        </div>
                    ))}
                    <div className="mt-3 h-10 bg-slate-100 rounded flex items-center justify-center">
                        <span className="text-[9px] text-slate-400">[ QR Code ]</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Create Payment Modal ─────────────────────────────── */
const REPAIRS_API = 'http://localhost:5000/api/repairs';
const METHOD_OPTS = [
    { key: 'cash', label: 'เงินสด', icon: '💵' },
    { key: 'transfer', label: 'โอนเงิน', icon: '🏦' },
    { key: 'qr', label: 'QR Code', icon: '📲' },
    { key: 'credit_card', label: 'บัตรเครดิต', icon: '💳' },
];
const TYPE_OPTS = [
    { key: 'full', label: 'ค่าซ่อมเต็ม' },
    { key: 'deposit', label: 'มัดจำ' },
    { key: 'partial', label: 'ชำระบางส่วน' },
];

function CreatePaymentModal({ onClose, onCreated }) {
    const [repairs, setRepairs] = useState([]);
    const [selected, setSelected] = useState(null);   // repair order object
    const [searchQ, setSearchQ] = useState('');
    const [showDrop, setShowDrop] = useState(false);
    const [amount, setAmount] = useState('');
    const [discount, setDiscount] = useState('0');
    const [method, setMethod] = useState('cash');
    const [type, setType] = useState('full');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const total = Math.max(0, Number(amount || 0) - Number(discount || 0));

    /* Search repairs */
    useEffect(() => {
        const t = setTimeout(async () => {
            try {
                const q = new URLSearchParams({ limit: 30 });
                if (searchQ) q.set('search', searchQ);
                const res = await fetch(`${REPAIRS_API}?${q}`, { headers: getAuthHeader() });
                const data = await res.json();
                if (data.success) setRepairs(data.data || []);
            } catch { }
        }, 300);
        return () => clearTimeout(t);
    }, [searchQ]);

    const pickRepair = (r) => {
        setSelected(r);
        setAmount(String(r.estimated_cost || ''));
        setSearchQ(`${r.order_code} — ${r.customer_name}`);
        setShowDrop(false);
    };

    const handleSave = async () => {
        if (!selected) { setError('กรุณาเลือกรายการซ่อม'); return; }
        if (!amount || Number(amount) <= 0) { setError('กรุณาระบุยอดเงิน'); return; }
        setSaving(true); setError('');
        try {
            const res = await fetch('http://localhost:5000/api/payments', {
                method: 'POST', headers: getAuthHeader(),
                body: JSON.stringify({
                    repair_order_id: selected.id,
                    customer_id: selected.customer_id,
                    amount: Number(amount),
                    discount: Number(discount || 0),
                    total_amount: total,
                    payment_method: method,
                    payment_type: type,
                }),
            });
            const data = await res.json();
            if (data.success) { onCreated('บันทึกการชำระเงินสำเร็จ'); }
            else { setError(data.message || 'เกิดข้อผิดพลาด'); }
        } catch { setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์'); }
        finally { setSaving(false); }
    };

    const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500/40 transition-all';
    const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155' };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: '#111827', border: '1px solid #1e3a5f' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1e3a5f' }}>
                    <h3 className="text-base font-bold text-white">เพิ่มรายการชำระเงิน</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                            style={{ backgroundColor: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                            <AlertCircle size={14} />{error}
                        </div>
                    )}

                    {/* Repair picker */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5 font-medium">เลือกรายการซ่อม *</label>
                        <div className="relative">
                            <input value={searchQ} placeholder="ค้นหาเลขใบสั่งซ่อม / ชื่อลูกค้า..."
                                className={inputCls} style={inputStyle}
                                onChange={e => { setSearchQ(e.target.value); setShowDrop(true); setSelected(null); }}
                                onFocus={() => setShowDrop(true)} />
                            {showDrop && repairs.length > 0 && (
                                <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto"
                                    style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                                    {repairs.map(r => (
                                        <button key={r.id} className="w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors"
                                            onClick={() => pickRepair(r)}>
                                            <p className="text-sm font-semibold text-white font-mono">{r.order_code}</p>
                                            <p className="text-xs text-slate-400">{r.customer_name} — {r.device_brand} {r.device_model}</p>
                                            <p className="text-xs text-blue-400">ประมาณ {thb(r.estimated_cost)}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selected && (
                            <div className="mt-2 px-3 py-2 rounded-lg text-xs text-slate-300 flex items-center gap-2"
                                style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <span className="text-blue-400">✓</span>
                                ลูกค้า: <span className="font-semibold text-white ml-1">{selected.customer_name}</span>
                                <span className="ml-auto text-slate-500">{selected.customer_phone}</span>
                            </div>
                        )}
                    </div>

                    {/* Amount + Discount */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">ยอดเงิน (บาท) *</label>
                            <input type="number" min="0" value={amount} placeholder="0"
                                className={inputCls} style={inputStyle}
                                onChange={e => setAmount(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">ส่วนลด (บาท)</label>
                            <input type="number" min="0" value={discount} placeholder="0"
                                className={inputCls} style={inputStyle}
                                onChange={e => setDiscount(e.target.value)} />
                        </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                        <span className="text-sm text-slate-400">ยอดรวมสุทธิ</span>
                        <span className="text-xl font-bold text-green-400">{thb(total)}</span>
                    </div>

                    {/* Payment method */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-2 font-medium">วิธีชำระเงิน</label>
                        <div className="grid grid-cols-2 gap-2">
                            {METHOD_OPTS.map(m => (
                                <button key={m.key} onClick={() => setMethod(m.key)}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${method === m.key ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                                    style={{
                                        backgroundColor: method === m.key ? 'rgba(59,130,246,0.15)' : 'transparent',
                                        borderColor: method === m.key ? 'rgba(59,130,246,0.5)' : '#334155',
                                    }}>
                                    <span>{m.icon}</span>{m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Payment type */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-2 font-medium">ประเภทการชำระ</label>
                        <div className="flex gap-2">
                            {TYPE_OPTS.map(t => (
                                <button key={t.key} onClick={() => setType(t.key)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${type === t.key ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                                    style={{
                                        backgroundColor: type === t.key ? 'rgba(168,85,247,0.15)' : 'transparent',
                                        borderColor: type === t.key ? 'rgba(168,85,247,0.5)' : '#334155',
                                    }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: '#1e3a5f', backgroundColor: '#0f172a' }}>
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors">
                        ยกเลิก
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                        style={{ backgroundColor: '#3b82f6' }}>
                        <Plus size={15} />
                        {saving ? 'กำลังบันทึก...' : 'บันทึกการชำระ'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Verify Modal ─────────────────────────────────────── */
function VerifyModal({ payment, onClose, onDone }) {
    const [loading, setLoading] = useState(false);
    const [autoReceipt, setAutoReceipt] = useState(true);

    const doVerify = async (action) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/${payment.id}/verify`, {
                method: 'PUT', headers: getAuthHeader(),
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (data.success) {
                onDone(action === 'approve' ? 'ยืนยันการชำระเงินสำเร็จ' : 'ปฏิเสธการชำระเงินแล้ว',
                    action === 'approve' ? 'success' : 'error');
            } else {
                onDone(data.message || 'เกิดข้อผิดพลาด', 'error');
            }
        } catch {
            onDone('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: '#111827', border: '1px solid #1e3a5f' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1e3a5f' }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <Shield size={16} className="text-blue-400" />
                        </div>
                        <h3 className="text-base font-bold text-white">ตรวจสอบการชำระเงิน</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-700/60">
                    {/* Left — info */}
                    <div className="p-6 space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">ข้อมูลลูกค้า</p>
                            <div className="rounded-xl p-3" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                                <p className="text-sm font-bold text-white mb-0.5">คุณ {payment.customer_name}</p>
                                <p className="text-xs text-slate-400">{payment.customer_phone}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500 mb-2 font-medium">
                                รายการ
                                <span className="ml-2 text-blue-400 font-mono">#{payment.receipt_code}</span>
                            </p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-300">
                                        {typeMap[payment.payment_type] || payment.payment_type} —{' '}
                                        {payment.device_brand} {payment.device_model}
                                    </span>
                                    <span className="text-white font-medium">{thb(payment.amount)}</span>
                                </div>
                                {payment.discount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">ส่วนลด</span>
                                        <span className="text-red-400 font-medium">-{thb(payment.discount)}</span>
                                    </div>
                                )}
                                <div className="pt-2 border-t flex justify-between items-center" style={{ borderColor: '#1e293b' }}>
                                    <span className="text-sm font-semibold text-white">ยอดรวม</span>
                                    <span className="text-2xl font-bold text-green-400">{thb(payment.total_amount)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>วิธีชำระ</span>
                                    <span>{methodMap[payment.payment_method] || payment.payment_method}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>ใบแจ้งซ่อม</span>
                                    <span className="font-mono text-blue-400">{payment.order_code}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right — slip */}
                    <div className="p-6 flex flex-col">
                        <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">สลิปการชำระเงิน</p>
                        <div className="flex-1 rounded-xl overflow-hidden" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                            {payment.payment_slip_url
                                ? <img src={`http://localhost:5000${payment.payment_slip_url}`} alt="slip"
                                    className="w-full h-full object-contain" />
                                : <SlipMockup payment={payment} />
                            }
                        </div>
                        <p className="text-xs text-slate-600 text-center mt-2">📎 หลักฐานการชำระเงิน</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t"
                    style={{ borderColor: '#1e3a5f', backgroundColor: '#0f172a' }}>
                    <button className="flex items-center gap-2 text-xs text-slate-300 hover:text-white transition-colors"
                        onClick={() => setAutoReceipt(!autoReceipt)}>
                        {autoReceipt
                            ? <CheckSquare size={16} className="text-blue-400" />
                            : <Square size={16} className="text-slate-500" />}
                        ออกใบเสร็จอัตโนมัติเมื่อยืนยัน
                    </button>

                    <div className="flex gap-3">
                        <button onClick={() => doVerify('reject')} disabled={loading}
                            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                            style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                            {loading ? '...' : 'ปฏิเสธ'}
                        </button>
                        <button onClick={() => doVerify('approve')} disabled={loading}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                            style={{ backgroundColor: '#10b981', boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}>
                            <CheckSquare size={15} />
                            {loading ? 'กำลังยืนยัน...' : 'ยืนยันการชำระเงิน'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN PAGE                                              */
/* ═══════════════════════════════════════════════════════ */
const TABS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'pending', label: 'รอชำระ' },
    { key: 'paid', label: 'ชำระแล้ว' },
    { key: 'overdue', label: 'ค้างชำระ' },
    { key: 'cancelled', label: 'ยกเลิก' },
];

export default function Payments() {
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const [payments, setPayments] = useState([]);
    const [statusCounts, setStatusCounts] = useState({});
    const [summary, setSummary] = useState({ total_paid: 0, total_pending: 0, count_paid: 0, count_pending: 0 });
    const [loading, setLoading] = useState(true);
    const [verifyTarget, setVerifyTarget] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [toast, setToast] = useState(null);
    const [total, setTotal] = useState(0);

    /* ── Fetch payments ── */
    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: 50 });
            if (activeTab !== 'all') params.set('status', activeTab);
            if (search) params.set('search', search);

            const res = await fetch(`${API}?${params}`, { headers: getAuthHeader() });
            const data = await res.json();
            if (data.success) {
                setPayments(data.data || []);
                setStatusCounts(data.statusCounts || {});
                setTotal(data.total || 0);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }, [activeTab, search]);

    /* ── Fetch summary ── */
    const fetchSummary = useCallback(async () => {
        try {
            const res = await fetch(`${API}/summary`, { headers: getAuthHeader() });
            const data = await res.json();
            if (data.success) setSummary(data.data);
        } catch { }
    }, []);

    useEffect(() => { fetchPayments(); }, [fetchPayments]);
    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    const showToast = (msg, type = 'success') => setToast({ msg, type });

    const handleVerifyDone = (msg, type) => {
        setVerifyTarget(null);
        showToast(msg, type);
        fetchPayments();
        fetchSummary();
    };

    const handleCreated = (msg) => {
        setShowCreate(false);
        showToast(msg, 'success');
        fetchPayments();
        fetchSummary();
    };

    const tabCount = (key) => {
        if (key === 'all') return total;
        return statusCounts[key] || 0;
    };

    return (
        <div className="min-h-full -m-6" style={{ backgroundColor: '#0b1120' }}>

            {toast && <Toast msg={toast.msg} type={toast.type} onHide={() => setToast(null)} />}

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">SA</span>
                    </div>
                    <span className="text-white font-bold">การชำระเงิน</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { fetchPayments(); fetchSummary(); }}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="รีเฟรช">
                        <RefreshCw size={16} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 ml-1"
                        style={{ backgroundColor: '#3b82f6' }}>
                        <Plus size={15} />
                        เพิ่มรายการชำระ
                    </button>
                </div>
            </div>

            {/* ── Summary cards ── */}
            <div className="px-6 pt-2 pb-1 grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                {[
                    { label: 'รับชำระแล้ว', value: summary.total_paid, count: summary.count_paid, color: '#34d399' },
                    { label: 'รอชำระ', value: summary.total_pending, count: summary.count_pending, color: '#fb923c' },
                    { label: 'ค้างชำระ', value: summary.total_overdue, count: summary.count_overdue, color: '#f87171' },
                ].map(c => (
                    <div key={c.label} className="rounded-xl p-3" style={{ backgroundColor: '#111827', border: '1px solid #1e3a5f' }}>
                        <p className="text-xs text-slate-500">{c.label}</p>
                        <p className="text-lg font-bold mt-0.5" style={{ color: c.color }}>{thbShort(c.value)}</p>
                        <p className="text-xs text-slate-600">{c.count} รายการ</p>
                    </div>
                ))}
            </div>

            <div className="px-6 pb-6 pt-2">
                {/* ── Tabs + Search ── */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                    <div className="flex items-center gap-1 flex-wrap">
                        {TABS.map(tab => {
                            const cnt = tabCount(tab.key);
                            return (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                        ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.35)]'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    {tab.label}
                                    {cnt > 0 && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${activeTab === tab.key ? 'bg-blue-500/80' : 'bg-slate-700 text-slate-500'}`}>
                                            {cnt}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="text" placeholder="ค้นหา..." value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 rounded-xl w-44 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                style={{ backgroundColor: '#111827', border: '1px solid #1e3a5f' }} />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400"
                            style={{ backgroundColor: '#111827', border: '1px solid #1e3a5f' }}>
                            <span>📅</span>
                            <ChevronDown size={13} />
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e3a5f' }}>
                                    {['เลขที่ใบเสร็จ', 'ลูกค้า', 'ประเภท', 'ยอดเงิน', 'วิธีชำระ', 'สถานะ', 'วันที่', 'จัดการ'].map(h => (
                                        <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr><td colSpan={8} className="text-center py-14 text-sm text-slate-500" style={{ backgroundColor: '#111827' }}>
                                        <RefreshCw size={18} className="inline animate-spin mr-2 opacity-50" />กำลังโหลด...
                                    </td></tr>
                                )}
                                {!loading && payments.length === 0 && (
                                    <tr><td colSpan={8} className="text-center py-14 text-sm text-slate-500" style={{ backgroundColor: '#111827' }}>
                                        ไม่พบรายการชำระเงิน
                                    </td></tr>
                                )}
                                {!loading && payments.map((p, i) => (
                                    <tr key={p.id} className="transition-colors"
                                        style={{ backgroundColor: i % 2 === 0 ? '#111827' : '#0f1a2e', borderBottom: '1px solid rgba(30,58,95,0.5)' }}>

                                        {/* Receipt */}
                                        <td className="px-4 py-3.5">
                                            <span className="text-xs font-bold text-blue-400 font-mono">{p.receipt_code}</span>
                                            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{p.order_code}</p>
                                        </td>

                                        {/* Customer */}
                                        <td className="px-4 py-3.5">
                                            <p className="text-sm font-medium text-white">{p.customer_name}</p>
                                            <p className="text-xs text-slate-500">{p.customer_phone}</p>
                                        </td>

                                        {/* Type */}
                                        <td className="px-4 py-3.5">
                                            <span className="text-xs font-medium text-slate-300">{typeMap[p.payment_type] || p.payment_type}</span>
                                        </td>

                                        {/* Amount */}
                                        <td className="px-4 py-3.5">
                                            <span className={`text-sm font-bold ${p.status === 'paid' ? 'text-green-400' : p.status === 'cancelled' ? 'text-slate-500' : 'text-white'}`}>
                                                {thbShort(p.total_amount)}
                                            </span>
                                            {p.discount > 0 && (
                                                <p className="text-[10px] text-red-400">ส่วนลด -{thbShort(p.discount)}</p>
                                            )}
                                        </td>

                                        {/* Method */}
                                        <td className="px-4 py-3.5">
                                            <span className="text-sm text-slate-300">{methodMap[p.payment_method] || p.payment_method}</span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3.5"><Badge status={p.status} /></td>

                                        {/* Date */}
                                        <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">{fmtDate(p.payment_date)}</td>

                                        {/* Actions */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {p.status === 'pending' && (
                                                    <button onClick={() => setVerifyTarget(p)}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
                                                        style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
                                                        ตรวจสอบ
                                                    </button>
                                                )}
                                                {p.status === 'paid' && (
                                                    <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="ดาวน์โหลดใบเสร็จ">
                                                        <Download size={14} className="text-slate-400" />
                                                    </button>
                                                )}
                                                {(p.status === 'cancelled' || p.status === 'overdue') && (
                                                    <span className="text-xs text-slate-600">—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table footer */}
                    <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500"
                        style={{ backgroundColor: '#0f172a', borderTop: '1px solid #1e3a5f' }}>
                        <span>แสดง {payments.length} จาก {total} รายการ</span>
                        <div className="flex items-center gap-3">
                            <span className="text-green-400 font-semibold">ชำระแล้ว: {thbShort(summary.total_paid)}</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-orange-400 font-semibold">รอชำระ: {thbShort(summary.total_pending)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Create Modal ── */}
            {showCreate && (
                <CreatePaymentModal
                    onClose={() => setShowCreate(false)}
                    onCreated={handleCreated}
                />
            )}

            {/* ── Verify Modal ── */}
            {verifyTarget && (
                <VerifyModal
                    payment={verifyTarget}
                    onClose={() => setVerifyTarget(null)}
                    onDone={handleVerifyDone}
                />
            )}
        </div>
    );
}
