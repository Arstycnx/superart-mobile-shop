import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search, Plus, Bell, Settings, ChevronDown, ChevronUp,
    Smartphone, User, Phone, MessageSquare, Printer,
    Camera, CheckCircle, Edit3, ChevronRight, RefreshCw, X,
    AlertTriangle,
} from 'lucide-react';

const API = 'http://localhost:5000/api/repairs';
const CUSTOMERS_API = 'http://localhost:5000/api/customers';
const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

/* ─── Constants ─────────────────────────────────────────── */
const STEPS = ['รับเครื่อง', 'กำลังซ่อม', 'ซ่อมเสร็จ', 'ส่งมอบ'];
const STATUS_STEP = { received: 0, repairing: 1, completed: 2, delivered: 3 };
const NEXT_STATUS = { received: 'repairing', repairing: 'completed', completed: 'delivered' };

const statusMeta = {
    received: { label: 'รับเครื่อง', bg: 'rgba(96,165,250,0.2)', text: '#60a5fa', border: 'rgba(96,165,250,0.4)' },
    repairing: { label: 'กำลังซ่อม', bg: 'rgba(251,146,60,0.2)', text: '#fb923c', border: 'rgba(251,146,60,0.4)' },
    completed: { label: 'ซ่อมเสร็จ', bg: 'rgba(52,211,153,0.2)', text: '#34d399', border: 'rgba(52,211,153,0.4)' },
    delivered: { label: 'ส่งมอบแล้ว', bg: 'rgba(167,139,250,0.2)', text: '#a78bfa', border: 'rgba(167,139,250,0.4)' },
    cancelled: { label: 'ยกเลิก', bg: 'rgba(248,113,113,0.2)', text: '#f87171', border: 'rgba(248,113,113,0.4)' },
    waiting_parts: { label: 'รออะไหล่', bg: 'rgba(250,204,21,0.2)', text: '#facc15', border: 'rgba(250,204,21,0.4)' },
};

const DEVICE_TYPES = [
    { key: 'mobile', label: 'มือถือ' },
    { key: 'tablet', label: 'แท็บเล็ต' },
    { key: 'laptop', label: 'โน้ตบุ๊ค' },
    { key: 'other', label: 'อื่นๆ' },
];
const URGENCY = [
    { key: 'normal', label: 'ปกติ' },
    { key: 'urgent', label: 'เร่งด่วน' },
    { key: 'express', label: 'ด่วนมาก' },
];

const thb = (n) => Number(n || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 });

/* ─── Toast ─────────────────────────────────────────────── */
function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);
    const bg = type === 'success' ? '#22c55e' : '#f87171';
    return (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl"
            style={{ backgroundColor: bg, animation: 'slideInUp 0.3s ease' }}>
            <style>{`@keyframes slideInUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
            {type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {message}
        </div>
    );
}

/* ─── Confirm Dialog ─────────────────────────────────────── */
function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'ยืนยัน', danger = false }) {
    return (
        <>
            <div className="fixed inset-0 z-[80] bg-black/50" onClick={onCancel} />
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-sm border border-slate-700 p-6">
                    <div className="flex items-start gap-3 mb-5">
                        <AlertTriangle size={22} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-slate-200 text-sm leading-relaxed">{message}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onCancel}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors">
                            ยกเลิก
                        </button>
                        <button onClick={onConfirm}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                            style={{ backgroundColor: danger ? '#ef4444' : '#3b82f6' }}>
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ─── Create Repair Modal ────────────────────────────────── */
const emptyForm = {
    customer_id: '', device_type: 'mobile', device_brand: '', device_model: '',
    device_color: '', symptoms: '', urgency: 'normal',
    estimated_cost: '', service_cost: '',
};

function CreateRepairModal({ onClose, onCreated }) {
    const [form, setForm] = useState(emptyForm);
    // 'new' = fill in new customer info, 'search' = pick existing
    const [custMode, setCustMode] = useState('new');
    // new customer fields
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newLine, setNewLine] = useState('');
    // search existing
    const [customerSearch, setCustSearch] = useState('');
    const [customers, setCustomers] = useState([]);
    const [custLoading, setCustLoading] = useState(false);
    const [selectedCust, setSelectedCust] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const searchRef = useRef();

    // Search customers (only in 'search' mode)
    useEffect(() => {
        if (custMode !== 'search') return;
        if (!customerSearch.trim()) { setCustomers([]); return; }
        const t = setTimeout(async () => {
            setCustLoading(true);
            try {
                const res = await fetch(`${CUSTOMERS_API}?search=${encodeURIComponent(customerSearch)}&limit=8`);
                const data = await res.json();
                setCustomers(data.data || []);
            } catch { /* noop */ }
            setCustLoading(false);
        }, 300);
        return () => clearTimeout(t);
    }, [customerSearch, custMode]);

    const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const selectCustomer = (c) => {
        setSelectedCust(c);
        setForm(f => ({ ...f, customer_id: c.id }));
        setCustSearch(c.full_name);
        setShowDropdown(false);
    };

    const handleSave = async () => {
        // Validate customer
        if (custMode === 'new') {
            if (!newName.trim()) { setError('กรุณากรอกชื่อลูกค้า'); return; }
            if (!newPhone.trim()) { setError('กรุณากรอกเบอร์โทร'); return; }
        } else {
            if (!form.customer_id) { setError('กรุณาเลือกลูกค้า'); return; }
        }
        if (!form.device_brand) { setError('กรุณากรอกยี่ห้ออุปกรณ์'); return; }
        if (!form.symptoms.trim()) { setError('กรุณาระบุอาการเสีย'); return; }
        setSaving(true); setError('');
        try {
            let customer_id = form.customer_id;

            // If new customer mode — create customer first
            if (custMode === 'new') {
                const cRes = await fetch(CUSTOMERS_API, {
                    method: 'POST', headers: getAuthHeader(),
                    body: JSON.stringify({ full_name: newName, phone: newPhone, line_id: newLine || null }),
                });
                const cData = await cRes.json();
                console.log('[CreateRepair] customer POST', cRes.status, cData);
                if (!cRes.ok || !cData.success) {
                    setError(`[ลูกค้า ${cRes.status}] ${cData.message || JSON.stringify(cData)}`);
                    return;
                }
                customer_id = cData.data?.id;
                if (!customer_id) { setError('ไม่ได้รับ customer_id จากเซิร์ฟเวอร์'); return; }
            }

            const payload = {
                customer_id,
                device_type: form.device_type,
                device_brand: form.device_brand,
                device_model: form.device_model,
                device_color: form.device_color,
                symptoms: form.symptoms,
                estimated_cost: Number(form.estimated_cost || 0) + Number(form.service_cost || 0),
                technician_notes: form.urgency !== 'normal' ? `ความเร่งด่วน: ${form.urgency}` : '',
            };
            const res = await fetch(API, { method: 'POST', headers: getAuthHeader(), body: JSON.stringify(payload) });
            const data = await res.json();
            console.log('[CreateRepair] repair POST', res.status, data);
            if (!res.ok || !data.success) {
                setError(`[ซ่อม ${res.status}] ${data.message || JSON.stringify(data)}`);
                return;
            }
            onCreated();
            onClose();
        } catch (err) { setError(`เกิดข้อผิดพลาด: ${err.message}`); }
        finally { setSaving(false); }
    };

    const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500/40 transition-all';
    const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155' };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-2xl rounded-2xl shadow-2xl my-4"
                    style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                        <h2 className="text-lg font-bold text-white">สร้างรายการซ่อมใหม่</h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <X size={18} className="text-slate-400" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl text-sm text-red-300"
                                style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                <AlertTriangle size={15} className="flex-shrink-0" />{error}
                            </div>
                        )}

                        {/* Customer section — toggle new / existing */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ข้อมูลลูกค้า *</label>
                                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #334155' }}>
                                    {[{ key: 'new', label: 'ลูกค้าใหม่' }, { key: 'search', label: 'ลูกค้าเดิม' }].map(m => (
                                        <button key={m.key} type="button"
                                            onClick={() => { setCustMode(m.key); setError(''); setSelectedCust(null); setForm(f => ({ ...f, customer_id: '' })); }}
                                            className={`px-3 py-1.5 text-xs font-semibold transition-all ${custMode === m.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                                }`}>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* New customer fields */}
                            {custMode === 'new' && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-1">
                                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                            placeholder="ชื่อ-นามสกุล *" className={inputCls} style={inputStyle} />
                                    </div>
                                    <div>
                                        <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                                            placeholder="เบอร์โทร *" className={inputCls} style={inputStyle} />
                                    </div>
                                    <div>
                                        <input type="text" value={newLine} onChange={e => setNewLine(e.target.value)}
                                            placeholder="Line ID (ไม่บังคับ)" className={inputCls} style={inputStyle} />
                                    </div>
                                </div>
                            )}

                            {/* Search existing customer */}
                            {custMode === 'search' && (
                                <div className="relative">
                                    <input
                                        ref={searchRef}
                                        type="text" value={customerSearch}
                                        onChange={e => { setCustSearch(e.target.value); setShowDropdown(true); setForm(f => ({ ...f, customer_id: '' })); setSelectedCust(null); }}
                                        placeholder="พิมพ์ชื่อ หรือ เบอร์โทร..."
                                        className={inputCls} style={inputStyle}
                                        onFocus={() => setShowDropdown(true)}
                                    />
                                    {showDropdown && (customerSearch || custLoading) && (
                                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-2xl z-10 overflow-hidden"
                                            style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                                            {custLoading && <p className="px-4 py-3 text-xs text-slate-400">กำลังค้นหา...</p>}
                                            {!custLoading && customers.length === 0 && customerSearch && (
                                                <p className="px-4 py-3 text-xs text-slate-400">ไม่พบลูกค้า</p>
                                            )}
                                            {customers.map(c => (
                                                <button key={c.id} onClick={() => selectCustomer(c)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-slate-700/50 last:border-0">
                                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {c.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-white font-medium">{c.full_name}</p>
                                                        <p className="text-xs text-slate-400">{c.phone} · {c.customer_code}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {selectedCust && (
                                        <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                                            <CheckCircle size={12} /> เลือกแล้ว: {selectedCust.full_name} ({selectedCust.phone})
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Device type + Brand + Model */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wider">ประเภท *</label>
                                <select value={form.device_type} onChange={setField('device_type')}
                                    className={inputCls + ' bg-[#0f172a]'} style={inputStyle}>
                                    {DEVICE_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wider">ยี่ห้อ *</label>
                                <input type="text" value={form.device_brand} onChange={setField('device_brand')}
                                    placeholder="Apple, Samsung..." className={inputCls} style={inputStyle} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wider">รุ่น</label>
                                <input type="text" value={form.device_model} onChange={setField('device_model')}
                                    placeholder="iPhone 15 Pro..." className={inputCls} style={inputStyle} />
                            </div>
                        </div>

                        {/* Color + Symptoms */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wider">สี (ไม่บังคับ)</label>
                                <input type="text" value={form.device_color} onChange={setField('device_color')}
                                    placeholder="Black, Gold..." className={inputCls} style={inputStyle} />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wider">อาการเสีย *</label>
                                <textarea value={form.symptoms} onChange={setField('symptoms')}
                                    rows={2} placeholder="หน้าจอแตก, ชาร์จไม่เข้า, แบตเตอรี่เสื่อม..."
                                    className={inputCls + ' resize-none'} style={inputStyle} />
                            </div>
                        </div>

                        {/* Urgency */}
                        <div>
                            <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase tracking-wider">ระดับความเร่งด่วน</label>
                            <div className="flex gap-2">
                                {URGENCY.map(u => (
                                    <button key={u.key} type="button" onClick={() => setForm(f => ({ ...f, urgency: u.key }))}
                                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.urgency === u.key
                                            ? u.key === 'express'
                                                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                                : u.key === 'urgent'
                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                                    : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                            : 'border-slate-700 text-slate-500 hover:border-slate-500'
                                            }`}>
                                        {u.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cost */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wider">ประเมินราคาอะไหล่ (฿)</label>
                                <input type="number" min="0" value={form.estimated_cost} onChange={setField('estimated_cost')}
                                    placeholder="0" className={inputCls} style={inputStyle} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wider">ค่าบริการ (฿)</label>
                                <input type="number" min="0" value={form.service_cost} onChange={setField('service_cost')}
                                    placeholder="0" className={inputCls} style={inputStyle} />
                            </div>
                        </div>

                        {/* Total preview */}
                        {(form.estimated_cost || form.service_cost) && (
                            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                                style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                                <span className="text-sm text-slate-400">ยอดรวมโดยประมาณ</span>
                                <span className="text-base font-bold text-blue-400">
                                    {thb(Number(form.estimated_cost || 0) + Number(form.service_cost || 0))}
                                </span>
                            </div>
                        )}

                        {/* Footer buttons */}
                        <div className="flex gap-3 pt-2">
                            <button onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors">
                                ยกเลิก
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
                                style={{ backgroundColor: '#3b82f6' }}>
                                <Plus size={15} />
                                {saving ? 'กำลังบันทึก...' : 'สร้างรายการซ่อม'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


/* ─── Status Selector ──────────────────────────────────── */
const ALL_STATUSES = [
    { key: 'received', label: 'รับเครื่อง', color: '#60a5fa' },
    { key: 'repairing', label: 'กำลังซ่อม', color: '#fb923c' },
    { key: 'completed', label: 'ซ่อมเสร็จ', color: '#34d399' },
    { key: 'delivered', label: 'ส่งมอบ', color: '#a78bfa' },
    { key: 'cancelled', label: 'ยกเลิก', color: '#f87171' },
];


function StatusSelector({ current, onSelect, updating }) {
    const [pending, setPending] = useState(null); // status waiting confirm

    return (
        <>
            {pending && (
                <ConfirmDialog
                    message={`เปลี่ยนสถานะเป็น "${statusMeta[pending]?.label ?? pending}" ใช่หรือไม่?`}
                    confirmLabel="ยืนยัน"
                    danger={pending === 'cancelled'}
                    onConfirm={() => { onSelect(pending); setPending(null); }}
                    onCancel={() => setPending(null)}
                />
            )}
            <div className="grid grid-cols-2 gap-1.5">
                {ALL_STATUSES.map(s => {
                    const isCurrent = s.key === current;
                    return (
                        <button key={s.key} disabled={updating || isCurrent}
                            onClick={() => setPending(s.key)}
                            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all w-full
                                ${isCurrent
                                    ? 'cursor-default opacity-100'
                                    : 'opacity-60 hover:opacity-100 hover:scale-[1.02] active:scale-100'
                                }
                                ${updating ? 'cursor-not-allowed opacity-40' : ''}
                            `}
                            style={{
                                backgroundColor: isCurrent ? `${s.color}22` : 'transparent',
                                borderColor: isCurrent ? `${s.color}66` : '#334155',
                                color: isCurrent ? s.color : '#94a3b8',
                            }}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: s.color, opacity: isCurrent ? 1 : 0.5 }} />
                            {s.label}
                            {isCurrent && <span className="ml-auto text-[9px] opacity-60">ปัจจุบัน</span>}
                        </button>
                    );
                })}
            </div>
        </>
    );
}

/* ─── Badge ────────────────────────────────────────────── */
function Badge({ status }) {
    const m = statusMeta[status] || statusMeta.received;
    return (
        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: m.bg, color: m.text, border: `1px solid ${m.border}` }}>
            {m.label}
        </span>
    );
}


/* ─── Stepper ──────────────────────────────────────────── */
function Stepper({ step }) {
    return (
        <div className="relative flex items-start justify-between w-full">
            <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-slate-700" />
            <div className="absolute top-3.5 left-0 h-0.5 bg-blue-500 transition-all"
                style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
            {STEPS.map((s, i) => {
                const done = i < step, active = i === step;
                return (
                    <div key={s} className="flex flex-col items-center gap-1.5 z-10">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-blue-500 border-blue-500' :
                            active ? 'bg-blue-500 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]' :
                                'bg-[#0f172a] border-slate-600'
                            }`}>
                            {done ? <CheckCircle size={13} className="text-white" />
                                : active ? <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                    : <div className="w-2 h-2 rounded-full bg-slate-600" />}
                        </div>
                        <span className={`text-[10px] whitespace-nowrap font-medium ${done || active ? 'text-blue-300' : 'text-slate-500'}`}>
                            {s}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Expanded Card ────────────────────────────────────── */
function ExpandedCard({ order, onCollapse, onStatusUpdated, onShowToast, onNotify }) {
    const fileRef = useRef();
    const [updating, setUpdating] = useState(false);
    const [notifying, setNotifying] = useState(false);
    const step = STATUS_STEP[order.status] ?? 0;
    const parts = order.parts || [];
    const timeline = order.timeline || [];
    const total = parts.reduce((s, p) => s + Number(p.subtotal || 0), 0);
    const hasLineId = Boolean(order.line_user_id);

    const doStatusUpdate = async (status) => {
        setUpdating(true);
        try {
            const res = await fetch(`${API}/${order.id}/status`, {
                method: 'PUT', headers: getAuthHeader(), body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (data.success) {
                onShowToast(
                    status === 'cancelled' ? 'ยกเลิกการซ่อมแล้ว' : 'อัปเดตสถานะสำเร็จ',
                    status === 'cancelled' ? 'error' : 'success'
                );
                // Auto-fire LINE notification after status change
                if (hasLineId) {
                    onNotify(order.id, /* silent */ true);
                }
                onStatusUpdated();
            } else {
                onShowToast('เกิดข้อผิดพลาด', 'error');
            }
        } catch {
            onShowToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
        setUpdating(false);
    };

    const handleNotify = async () => {
        setNotifying(true);
        await onNotify(order.id, /* silent */ false);
        setNotifying(false);
    };

    return (
        <>
            <div className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: '#111827', borderColor: '#f59e0b', boxShadow: '0 0 0 1px rgba(245,158,11,0.3)' }}>

                {/* Top section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/60 p-5">

                    {/* Col 1 — Order & Customer */}
                    <div className="pb-4 lg:pb-0 lg:pr-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-bold text-blue-400 font-mono">{order.order_code}</span>
                            <Badge status={order.status} />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <Smartphone size={14} className="text-slate-400 flex-shrink-0" />
                            <div>
                                <p className="text-white font-semibold text-sm">{order.device_brand} {order.device_model}</p>
                                <p className="text-slate-400 text-xs">{order.device_type}{order.device_color ? ` · ${order.device_color}` : ''}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 mb-1">
                            <User size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="text-slate-200 text-sm">{order.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <Phone size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="text-slate-400 text-xs">{order.customer_phone}</span>
                        </div>
                        {order.symptoms && (
                            <div className="mb-2">
                                <p className="text-xs text-slate-500 mb-1.5">อาการเสีย</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {order.symptoms.split(',').map((s, i) => (
                                        <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium"
                                            style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
                                            {s.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Col 2 — Stepper */}
                    <div className="py-4 lg:py-0 lg:px-6 flex flex-col justify-between gap-4">
                        <Stepper step={step} />
                        <div className="flex items-center justify-between text-sm mt-2">
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">ประเมินราคา</p>
                                <p className="text-white font-bold">{thb(order.estimated_cost)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 mb-0.5">วันรับ</p>
                                <p className="text-white font-medium text-sm">
                                    {order.received_date ? new Date(order.received_date).toLocaleDateString('th-TH') : '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Col 3 — Actions */}
                    <div className="pt-4 lg:pt-0 lg:pl-6 flex flex-col items-start justify-between">
                        <button onClick={onCollapse} className="self-end p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                            <ChevronUp size={18} className="text-slate-400" />
                        </button>

                        <div className="flex flex-col gap-2 w-full mt-4 lg:mt-0">
                            {/* Free-pick status selector */}
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">เปลี่ยนสถานะ</p>
                                <StatusSelector
                                    current={order.status}
                                    onSelect={doStatusUpdate}
                                    updating={updating}
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleNotify}
                                    disabled={!hasLineId || notifying}
                                    title={hasLineId ? 'ส่งแจ้งเตือนผ่าน LINE' : 'ลูกค้าไม่มี LINE User ID'}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                                    style={{
                                        border: hasLineId ? '1px solid rgba(52,211,153,0.5)' : '1px solid #374151',
                                        color: hasLineId ? '#34d399' : '#4b5563',
                                        opacity: (!hasLineId || notifying) ? 0.5 : 1,
                                        cursor: (!hasLineId || notifying) ? 'not-allowed' : 'pointer',
                                        backgroundColor: hasLineId ? 'rgba(52,211,153,0.08)' : 'transparent',
                                    }}
                                >
                                    <MessageSquare size={13} />
                                    {notifying ? 'กำลังส่ง...' : 'แจ้งลูกค้า'}
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/5 transition-colors"
                                    style={{ border: '1px solid #374151' }}>
                                    <Printer size={13} />พิมพ์ใบงาน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-700/60" />

                {/* Bottom section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/60 p-5">
                    {/* Photos */}
                    <div className="pb-5 lg:pb-0 lg:pr-5">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">รูปภาพ ก่อน/หลัง ซ่อม</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl aspect-square flex flex-col items-center justify-center relative overflow-hidden"
                                style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                                <div className="text-4xl mb-1">📱</div>
                                <div className="absolute bottom-0 left-0 right-0 text-center py-1 text-xs text-slate-400"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>Before</div>
                            </div>
                            <button onClick={() => fileRef.current?.click()}
                                className="rounded-xl aspect-square flex flex-col items-center justify-center gap-2 hover:bg-slate-700/30 transition-colors"
                                style={{ backgroundColor: '#0f172a', border: '1px dashed #374151' }}>
                                <Camera size={20} className="text-slate-500" />
                                <span className="text-xs text-slate-500 text-center leading-snug">เพิ่มรูปหลังซ่อม</span>
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" />
                        </div>
                    </div>

                    {/* Parts */}
                    <div className="py-5 lg:py-0 lg:px-5">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">รายการอะไหล่ & ค่าบริการ</p>
                        {parts.length === 0 ? (
                            <p className="text-xs text-slate-600">ยังไม่มีรายการอะไหล่</p>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="text-left text-xs text-slate-500 pb-2 font-medium">รายการ</th>
                                        <th className="text-right text-xs text-slate-500 pb-2 font-medium">ราคา</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/40">
                                    {parts.map((p, i) => (
                                        <tr key={i}>
                                            <td className="py-2 text-xs text-slate-300 pr-4">{p.product_name} ×{p.quantity}</td>
                                            <td className="py-2 text-xs text-white text-right font-medium whitespace-nowrap">{thb(p.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {parts.length > 0 && (
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700">
                                <span className="text-sm font-semibold text-white">ยอดรวมสุทธิ</span>
                                <span className="text-base font-bold text-blue-400">{thb(total)}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mt-4">
                            <span className="text-xs text-slate-400">สถานะชำระเงิน</span>
                            {order.is_paid > 0 ? (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                                    ชำระแล้ว
                                </span>
                            ) : (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                                    style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />ยังไม่ชำระ
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="pt-5 lg:pt-0 lg:pl-5">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">ไทม์ไลน์สถานะ</p>
                        <div className="space-y-0">
                            {[...timeline].reverse().map((item, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                                        {i < timeline.length - 1 && (
                                            <div className="w-px flex-1 my-1" style={{ backgroundColor: '#1e293b', minHeight: '28px' }} />
                                        )}
                                    </div>
                                    <div className="pb-4 last:pb-0">
                                        <p className="text-[11px] text-blue-400 font-medium mb-0.5">
                                            {new Date(item.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                        </p>
                                        <p className="text-sm text-white font-semibold leading-tight">{item.description}</p>
                                        {item.updated_by && <p className="text-xs text-slate-400 mt-0.5">โดย: {item.updated_by}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ─── Collapsed Card ───────────────────────────────────── */
function CollapsedCard({ order, onExpand, onNotify }) {
    const step = STATUS_STEP[order.status] ?? 0;
    const pct = Math.round((step / (STEPS.length - 1)) * 100);
    const hasLineId = Boolean(order.line_user_id);
    return (
        <div className="rounded-2xl border p-4 hover:border-blue-500/40 transition-all cursor-pointer"
            style={{ backgroundColor: '#111827', borderColor: '#1e293b' }} onClick={onExpand}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-blue-400 font-mono">{order.order_code}</span>
                        <Badge status={order.status} />
                    </div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Smartphone size={12} className="text-slate-500" />
                        <span className="text-sm font-semibold text-white">{order.device_brand} {order.device_model}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-500" />
                        <span className="text-xs text-slate-400">{order.customer_name}</span>
                        <span className="text-xs text-slate-600">•</span>
                        <span className="text-xs text-slate-500">{order.customer_phone}</span>
                    </div>
                    {order.symptoms && (
                        <p className="text-xs text-slate-500 mt-1 truncate">อาการ: {order.symptoms}</p>
                    )}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="hidden md:block w-32">
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] text-slate-500">ความคืบหน้า</span>
                            <span className="text-[10px] text-blue-400">{pct}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500">ประเมินราคา</p>
                        <p className="text-base font-bold text-white">{thb(order.estimated_cost)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            title={hasLineId ? 'ส่งแจ้งเตือนผ่าน LINE' : 'ลูกค้าไม่มี LINE User ID'}
                            disabled={!hasLineId}
                            className="p-2 rounded-lg transition-colors"
                            style={{
                                border: hasLineId ? '1px solid rgba(52,211,153,0.4)' : '1px solid #1e293b',
                                cursor: hasLineId ? 'pointer' : 'not-allowed',
                                opacity: hasLineId ? 1 : 0.4,
                            }}
                            onClick={(e) => { e.stopPropagation(); if (hasLineId) onNotify(order.id, false); }}
                        >
                            <MessageSquare size={14} style={{ color: hasLineId ? '#34d399' : '#475569' }} />
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-blue-400 font-semibold hover:bg-blue-500/10 transition-colors"
                            style={{ border: '1px solid rgba(96,165,250,0.3)' }}
                            onClick={e => { e.stopPropagation(); onExpand(); }}>
                            ดูรายละเอียด <ChevronRight size={13} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            onClick={e => { e.stopPropagation(); onExpand(); }}>
                            <ChevronDown size={16} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Expanded Card Wrapper (fetches full detail) ────────── */
function ExpandedCardWrapper({ orderId, order: initialOrder, onCollapse, onStatusUpdated, onShowToast, onNotify }) {
    const [order, setOrder] = useState(initialOrder);

    const loadDetail = useCallback(() => {
        fetch(`${API}/${orderId}`)
            .then(r => r.json())
            .then(d => { if (d.success) setOrder(d.data); })
            .catch(() => { });
    }, [orderId]);

    useEffect(() => { loadDetail(); }, [loadDetail]);

    return (
        <ExpandedCard
            order={order}
            onCollapse={onCollapse}
            onShowToast={onShowToast}
            onNotify={onNotify}
            onStatusUpdated={() => { onStatusUpdated(); loadDetail(); }}
        />
    );
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN PAGE                                              */
/* ═══════════════════════════════════════════════════════ */
export default function RepairOrders() {
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [statusCounts, setStatusCounts] = useState({});
    const [createOpen, setCreateOpen] = useState(false);
    const [toast, setToast] = useState(null); // { message, type }

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
    }, []);

    // ── LINE Notify ───────────────────────────────────────────
    // silent=true skips success toast (used when called automatically after status change)
    const notifyOrder = useCallback(async (orderId, silent = false) => {
        try {
            const res = await fetch(`${API}/${orderId}/notify`, {
                method: 'POST', headers: getAuthHeader(),
            });
            const data = await res.json();
            if (data.success) {
                if (!silent) showToast('\u0e2a\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e1c\u0e48\u0e32\u0e19 LINE \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27 \ud83c\udf89', 'success');
            } else {
                if (!silent) showToast(data.message || '\u0e2a\u0e48\u0e07 LINE \u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08', 'error');
            }
        } catch {
            if (!silent) showToast('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d\u0e40\u0e0b\u0e34\u0e23\u0e4c\u0e1f\u0e40\u0e27\u0e2d\u0e23\u0e4c', 'error');
        }
    }, [showToast]);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: 1, limit: 50 });
            if (activeTab !== 'all') params.set('status', activeTab);
            if (search) params.set('search', search);
            const res = await fetch(`${API}?${params}`);
            const data = await res.json();
            setOrders(data.data || []);
            setTotal(data.total || 0);
            setStatusCounts(data.statusCounts || {});
        } catch { /* noop */ }
        setLoading(false);
    }, [activeTab, search]);

    useEffect(() => {
        const t = setTimeout(fetchOrders, 300);
        return () => clearTimeout(t);
    }, [fetchOrders]);

    const TABS = [
        { key: 'all', label: 'ทั้งหมด', count: total },
        { key: 'received', label: 'รับเครื่อง', count: statusCounts.received || 0 },
        { key: 'repairing', label: 'กำลังซ่อม', count: statusCounts.repairing || 0 },
        { key: 'completed', label: 'ซ่อมเสร็จ', count: statusCounts.completed || 0 },
        { key: 'delivered', label: 'ส่งมอบแล้ว', count: statusCounts.delivered || 0 },
        { key: 'cancelled', label: 'ยกเลิก', count: statusCounts.cancelled || 0 },
    ];

    return (
        <div className="min-h-full -m-6" style={{ backgroundColor: '#0b1120' }}>

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Top bar */}
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">SA</span>
                    </div>
                    <span className="text-white font-bold text-sm">รายการแจ้งซ่อม</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchOrders} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="รีเฟรช">
                        <RefreshCw size={16} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <Bell size={18} className="text-slate-400" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <Settings size={18} className="text-slate-400" />
                    </button>
                </div>
            </div>

            <div className="px-6 pb-6 pt-2">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">รายการแจ้งซ่อม</h1>
                        <p className="text-slate-400 text-sm">จัดการและติดตามสถานะการซ่อมทั้งหมด ({total} รายการ)</p>
                    </div>
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:brightness-110 transition-all"
                        style={{ backgroundColor: '#3b82f6' }}>
                        <Plus size={16} />สร้างรายการซ่อม
                    </button>
                </div>

                {/* Tabs + Search */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                    <div className="flex items-center gap-1 flex-wrap">
                        {TABS.map(tab => (
                            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setExpandedId(null); }}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.35)]'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}>
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-500/80' : 'bg-slate-700 text-slate-500'
                                        }`}>{tab.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="relative sm:ml-auto sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" placeholder="ค้นหา Order ID, ลูกค้า..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                            style={{ backgroundColor: '#111827', border: '1px solid #1e3a5f' }} />
                    </div>
                </div>

                {/* Card list */}
                <div className="space-y-3">
                    {loading && <div className="text-center py-16 text-slate-500 text-sm">กำลังโหลด...</div>}
                    {!loading && orders.map(order => (
                        expandedId === order.id
                            ? <ExpandedCardWrapper
                                key={order.id}
                                orderId={order.id}
                                order={order}
                                onCollapse={() => setExpandedId(null)}
                                onStatusUpdated={fetchOrders}
                                onShowToast={showToast}
                                onNotify={notifyOrder}
                            />
                            : <CollapsedCard key={order.id} order={order} onExpand={() => setExpandedId(order.id)} onNotify={notifyOrder} />
                    ))}
                    {!loading && orders.length === 0 && (
                        <div className="text-center py-16 text-slate-500 text-sm">ไม่พบรายการที่ค้นหา</div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {createOpen && (
                <CreateRepairModal
                    onClose={() => setCreateOpen(false)}
                    onCreated={() => {
                        fetchOrders();
                        showToast('สร้างรายการซ่อมสำเร็จ');
                    }}
                />
            )}
        </div>
    );
}
