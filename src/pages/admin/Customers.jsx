import { Plus } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../api/config';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search, X, Phone, MessageSquare, ChevronLeft, ChevronRight,
    Star, RefreshCw, Wrench, CreditCard, User, Pencil, Trash2,
} from 'lucide-react';


const API = `${API_URL}/api/customers`;
const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

/* ── constants ─────────────────────────────────────────── */
const AVATAR_COLORS = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-500', 'bg-rose-600'];
const LEVEL_STYLE = {
    bronze: { bg: '#fef3c7', text: '#92400e', label: 'Bronze' },
    silver: { bg: '#f1f5f9', text: '#475569', label: 'Silver' },
    gold: { bg: '#fef9c3', text: '#854d0e', label: 'Gold' },
    platinum: { bg: '#e2e8f0', text: '#334155', label: 'Platinum' },
};
const STATUS_META = {
    received: { label: 'รับซ่อม', color: '#60a5fa' },
    repairing: { label: 'กำลังซ่อม', color: '#f59e0b' },
    completed: { label: 'เสร็จสิ้น', color: '#34d399' },
    delivered: { label: 'ส่งมอบแล้ว', color: '#a78bfa' },
    cancelled: { label: 'ยกเลิก', color: '#f87171' },
};
const PAYMENT_STATUS = {
    paid: { label: 'ชำระแล้ว', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    pending: { label: 'รอชำระ', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    overdue: { label: 'เกินกำหนด', bg: 'bg-red-50', text: 'text-red-700' },
    cancelled: { label: 'ยกเลิก', bg: 'bg-slate-50', text: 'text-slate-500' },
};
const thb = (n) => '฿' + Number(n || 0).toLocaleString('th-TH');
const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ── Avatar ────────────────────────────────────────────── */
function Avatar({ name, size = 'md', idx = 0 }) {
    const s = size === 'lg' ? 'w-14 h-14 text-xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm';
    return (
        <div className={`${s} ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
            {initials(name)}
        </div>
    );
}

/* ── Repair timeline inside drawer ─────────────────────── */
function RepairTimeline({ repairs }) {
    if (!repairs.length) return <p className="text-sm text-slate-400 text-center py-10">ไม่มีประวัติการซ่อม</p>;
    return (
        <div className="space-y-0">
            {repairs.map((r, i) => {
                const m = STATUS_META[r.status] || STATUS_META.completed;
                const date = r.received_date ? new Date(r.received_date).toLocaleDateString('th-TH') : '—';
                return (
                    <div key={r.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                                style={{ backgroundColor: m.color, boxShadow: `0 0 8px ${m.color}70` }} />
                            {i < repairs.length - 1 && <div className="w-px flex-1 my-1 bg-slate-200" style={{ minHeight: 40 }} />}
                        </div>
                        <div className="pb-4 last:pb-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-500">{date}</span>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: m.color + '25', color: m.color, border: `1px solid ${m.color}50` }}>
                                    {m.label}
                                </span>
                            </div>
                            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                                <p className="text-sm font-semibold text-slate-800 mb-0.5">
                                    {r.device_brand} {r.device_model}
                                </p>
                                <p className="text-xs text-slate-500 mb-2 leading-relaxed">{r.symptoms || '—'}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400 font-mono">{r.order_code}</span>
                                    <span className="text-sm font-bold text-slate-700">{thb(r.final_cost || r.estimated_cost)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Payment list inside drawer ─────────────────────────── */
function PaymentList({ payments }) {
    if (!payments.length) return <p className="text-sm text-slate-400 text-center py-10">ไม่มีประวัติการชำระเงิน</p>;
    return (
        <div className="space-y-3">
            {payments.map((p) => {
                const ps = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.pending;
                return (
                    <div key={p.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-slate-500">{p.receipt_code}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ps.bg} ${ps.text}`}>{ps.label}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700">{p.device_brand} {p.device_model}</p>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-slate-400">{p.payment_method}</span>
                            <span className="text-sm font-bold text-slate-800">{thb(p.total_amount)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Customer Drawer ────────────────────────────────────── */
const TABS = ['ประวัติการซ่อม', 'การชำระเงิน'];

function CustomerDrawer({ customer, idx, onClose }) {
    const [activeTab, setActiveTab] = useState(0);
    const [repairs, setRepairs] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loadingTab, setLoadingTab] = useState(false);
    const lc = LEVEL_STYLE[customer.member_level] || LEVEL_STYLE.bronze;

    const loadTab = useCallback(async (tab) => {
        setLoadingTab(true);
        try {
            if (tab === 0) {
                const r = await fetch(`${API}/${customer.id}/repairs`);
                const d = await r.json();
                setRepairs(d.data || []);
            } else {
                const r = await fetch(`${API}/${customer.id}/payments`);
                const d = await r.json();
                setPayments(d.data || []);
            }
        } catch { /* noop */ }
        setLoadingTab(false);
    }, [customer.id]);

    useEffect(() => { loadTab(0); }, [loadTab]);

    const switchTab = (i) => { setActiveTab(i); loadTab(i); };

    return (
        <>
            <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full z-40 flex flex-col shadow-2xl bg-white"
                style={{ width: 'min(420px, 95vw)', animation: 'slideInRight 0.25s ease-out' }}>
                <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
                    <span className="text-sm font-semibold text-slate-700">ข้อมูลลูกค้า</span>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={16} className="text-slate-500" />
                    </button>
                </div>

                {/* Profile */}
                <div className="px-5 py-5 border-b border-slate-100 flex-shrink-0">
                    <div className="flex items-start gap-4 mb-4">
                        <Avatar name={customer.full_name} size="lg" idx={idx} />
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-900 mb-1">{customer.full_name}</h3>
                            <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
                                <Phone size={13} />{customer.phone}
                            </div>
                            {customer.line_id && (
                                <div className="flex items-center gap-1.5 text-sm text-emerald-500">
                                    <MessageSquare size={13} />{customer.line_id}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <div>
                            <span className="text-slate-500">รหัสลูกค้า</span>
                            <span className="ml-2 text-slate-700 font-mono font-medium">{customer.customer_code}</span>
                        </div>
                        <span className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                            style={{ backgroundColor: lc.bg, color: lc.text }}>
                            <Star size={11} />{lc.label}
                        </span>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 border-b border-slate-100 flex-shrink-0">
                    {[
                        { label: 'จำนวนครั้ง', value: `${customer.visit_count} ครั้ง`, icon: <Wrench size={14} /> },
                        { label: 'ยอดใช้จ่าย', value: thb(customer.total_spent), icon: <CreditCard size={14} /> },
                    ].map(({ label, value, icon }) => (
                        <div key={label} className="px-5 py-3 flex items-center gap-2">
                            <span className="text-slate-400">{icon}</span>
                            <div>
                                <p className="text-xs text-slate-400">{label}</p>
                                <p className="text-sm font-bold text-slate-800">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 flex-shrink-0">
                    {TABS.map((t, i) => (
                        <button key={t} onClick={() => switchTab(i)}
                            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${activeTab === i ? 'text-blue-600 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {loadingTab
                        ? <p className="text-sm text-slate-400 text-center py-10">กำลังโหลด...</p>
                        : activeTab === 0
                            ? <RepairTimeline repairs={repairs} />
                            : <PaymentList payments={payments} />
                    }
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 bg-slate-800 px-5 py-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-400">ยอดใช้จ่ายรวม</span>
                        <span className="text-lg font-bold text-white">{thb(customer.total_spent)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-600 overflow-hidden mb-1">
                        <div className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${Math.min((customer.total_spent / 15000) * 100, 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-right font-semibold" style={{ color: lc.text }}>
                        Level: {lc.label}
                    </p>
                </div>
            </div>
        </>
    );
}

/* ── Customer Form Modal (Add + Edit) ───────────────────── */
const emptyForm = { full_name: '', phone: '', email: '', line_id: '' };

/**
 * @param {object|null} editing  – null = add mode, customer object = edit mode
 */
function CustomerFormModal({ editing, onClose, onSaved }) {
    const isEdit = Boolean(editing);
    const [form, setForm] = useState(
        isEdit
            ? {
                full_name: editing.full_name || '',
                phone: editing.phone || '',
                email: editing.email || '',
                line_id: editing.line_id || '',
            }
            : emptyForm
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSave = async () => {
        if (!form.full_name || !form.phone) { setError('กรุณากรอกชื่อและเบอร์โทร'); return; }
        setSaving(true); setError('');
        try {
            const url = isEdit ? `${API}/${editing.id}` : API;
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: getAuthHeader(), body: JSON.stringify(form) });
            const data = await res.json();
            if (!data.success) { setError(data.message || 'เกิดข้อผิดพลาด'); return; }
            onSaved();
            onClose();
        } catch { setError('ไม่สามารถบันทึกข้อมูลได้'); }
        finally { setSaving(false); }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">
                            {isEdit ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
                        </h3>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อ-นามสกุล *</label>
                            <input name="full_name" value={form.full_name} onChange={handleField}
                                className="input-field" placeholder="สมชาย ใจดี" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">เบอร์โทรศัพท์ *</label>
                            <input name="phone" value={form.phone} onChange={handleField}
                                className="input-field" placeholder="08x-xxx-xxxx" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">อีเมล</label>
                                <input name="email" value={form.email} onChange={handleField}
                                    className="input-field" placeholder="example@mail.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Line ID</label>
                                <input name="line_id" value={form.line_id} onChange={handleField}
                                    className="input-field" placeholder="@lineid" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={onClose} className="btn-secondary">ยกเลิก</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary">
                                {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN PAGE                                              */
/* ═══════════════════════════════════════════════════════ */
export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);      // { customer, idx } – side drawer
    const [formModal, setFormModal] = useState(null);    // null | 'add' | customer-object (edit)
    const PER_PAGE = 10;

    // ── Fetch ─────────────────────────────────────────────
    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: PER_PAGE });
            if (search) params.set('search', search);
            const res = await fetch(`${API}?${params}`);
            const data = await res.json();
            setCustomers(data.data || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch { /* noop */ }
        finally { setLoading(false); }
    }, [search, page]);

    useEffect(() => {
        const t = setTimeout(fetchCustomers, 300);
        return () => clearTimeout(t);
    }, [fetchCustomers]);

    // Close drawer / modal on Escape
    useEffect(() => {
        const h = (e) => {
            if (e.key === 'Escape') {
                setSelected(null);
                setFormModal(null);
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    // ── Edit ──────────────────────────────────────────────
    const handleEdit = (customer, e) => {
        e.stopPropagation();            // don't open the side drawer
        setFormModal(customer);         // editing = customer object → PUT mode
    };

    // ── Delete ────────────────────────────────────────────
    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('ยืนยันการลบข้อมูลลูกค้าท่านนี้?')) return;
        try {
            const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: getAuthHeader() });
            const data = await res.json();
            if (!data.success) { alert(data.message || 'ลบไม่สำเร็จ'); return; }
            if (selected?.customer?.id === id) setSelected(null);
            fetchCustomers();
        } catch { alert('เกิดข้อผิดพลาดในการลบข้อมูล'); }
    };

    // ── Pagination pages ──────────────────────────────────
    const pageNums = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        const half = Math.floor(Math.min(totalPages, 5) / 2);
        const start = Math.max(1, Math.min(page - half, totalPages - Math.min(totalPages, 5) + 1));
        return start + i;
    });

    return (
        <div className="space-y-5">
            {/* Main Container */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                
                {/* Header Section */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-slate-800">ข้อมูลลูกค้า</h1>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            {total.toLocaleString()} ราย
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="ค้นหาชื่อ, เบอร์โทร..." value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50 transition-all" />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button onClick={fetchCustomers} className="btn-secondary h-[38px] px-3 shrink-0 flex items-center justify-center" title="รีเฟรช">
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button onClick={() => setFormModal('add')}
                                className="flex items-center justify-center gap-2 px-4 h-[38px] rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 w-full sm:w-auto shadow-sm"
                                style={{ backgroundColor: '#3b82f6' }}>
                                <Plus size={15} />เพิ่มลูกค้า
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                {['ชื่อลูกค้า', 'เบอร์โทรศัพท์', 'จำนวนครั้งใช้บริการ', 'ระดับสมาชิก', 'ยอดใช้จ่ายรวม', 'จัดการ'].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr><td colSpan={6} className="text-center py-12 text-sm text-slate-400">กำลังโหลด...</td></tr>
                            )}
                            {!loading && customers.map((c, idx) => {
                                const lc = LEVEL_STYLE[c.member_level] || LEVEL_STYLE.bronze;
                                return (
                                    <tr key={c.id}
                                        onClick={() => setSelected({ customer: c, idx })}
                                        className={`cursor-pointer transition-colors ${selected?.customer.id === c.id ? 'bg-blue-50' : 'hover:bg-slate-50/80'}`}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={c.full_name} size="sm" idx={idx} />
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{c.full_name}</p>
                                                    <p className="text-xs text-slate-400 font-mono">{c.customer_code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">{c.phone}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-slate-800">{c.visit_count}</span>
                                                <span className="text-xs text-slate-400">ครั้ง</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1 w-fit"
                                                style={{ backgroundColor: lc.bg, color: lc.text }}>
                                                <Star size={10} />{lc.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-sm font-bold text-slate-800">{thb(c.total_spent)}</span>
                                        </td>
                                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    title="แก้ไข"
                                                    onClick={(e) => handleEdit(c, e)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    title="ลบ"
                                                    onClick={(e) => handleDelete(c.id, e)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!loading && customers.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-12 text-sm text-slate-400">ไม่พบลูกค้าที่ค้นหา</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-500">
                        แสดง {customers.length ? (page - 1) * PER_PAGE + 1 : 0}–{Math.min(page * PER_PAGE, total)} จาก {total.toLocaleString()} รายการ
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            <ChevronLeft size={15} className="text-slate-600" />
                        </button>
                        {pageNums.map(p => (
                            <button key={p} onClick={() => setPage(p)}
                                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${page === p ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>
                                {p}
                            </button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            <ChevronRight size={15} className="text-slate-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Drawer */}
            {selected && (
                <CustomerDrawer
                    customer={selected.customer}
                    idx={selected.idx}
                    onClose={() => setSelected(null)}
                />
            )}

            {/* Add / Edit Customer Modal */}
            {formModal && (
                <CustomerFormModal
                    editing={formModal === 'add' ? null : formModal}
                    onClose={() => setFormModal(null)}
                    onSaved={fetchCustomers}
                />
            )}
        </div>
    );
}
