import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { useNavigate } from 'react-router-dom';
import {
    Wrench, Smartphone, Tablet, Laptop, MoreHorizontal,
    Camera, X, ChevronLeft, ChevronRight, CheckCircle,
    Home, DollarSign, Bell, Phone, Check, Square, CheckSquare,
    Search, UserCheck, Clock, AlertCircle, History,
} from 'lucide-react';

/* ─────────────────────────────── */
/*  CONSTANTS                      */
/* ─────────────────────────────── */
const DEVICE_TYPES = [
    { key: 'mobile', label: 'มือถือ', icon: Smartphone },
    { key: 'tablet', label: 'แท็บเล็ต', icon: Tablet },
    { key: 'laptop', label: 'โน้ตบุ๊ค', icon: Laptop },
    { key: 'other', label: 'อื่นๆ', icon: MoreHorizontal },
];

const BRANDS = [
    'ALCATEL', 'ASUS', 'BENCO', 'BLACKBERRY', 'CONDOR', 'COOLPAD', 'CUBOT', 'ELEPHONE',
    'GIONEE', 'GOOGLE PIXEL', 'HOTWAV', 'HTC', 'HUAWEI', 'INFINIX', 'INFOCUS', 'IPAD',
    'IPHONE', 'ITEL', 'JIO', 'LAVA', 'LENOVO', 'LG', 'MAXTRON', 'MEIZU', 'MICROMAX',
    'MICROSOFT', 'MOTOROLA', 'NEFFOS', 'NOKIA', 'NOTHING PHONE', 'ONEPLUS', 'OPPO',
    'PRESTIGIO', 'RAZER', 'REALME', 'SAMSUNG', 'SHARP', 'SONY', 'TECNO', 'TEXET',
    'UMIDIGI', 'VESTEL', 'VIVO', 'XIAOMI', 'XOLO', 'ZTE', 'OTHERS'
];

const SYMPTOM_CATEGORIES = [
    {
        label: '📱 หมวดหน้าจอและระบบสัมผัส (Screen & Touch)',
        options: [
            'หน้าจอแตก (เปลี่ยนจอชุด)',
            'ลอกกระจกหน้าจอ (จอในยังใช้ได้)',
            'ทัชสกรีนไม่ได้ / ทัชเพี้ยน / ทัชรวน',
            'หน้าจอเป็นเส้น / มีจุดดำ / สีเพี้ยน',
            'จอมืด / จอขาว / หน้าจอกะพริบ'
        ]
    },
    {
        label: '🔋 หมวดแบตเตอรี่และระบบไฟ (Battery & Power)',
        options: [
            'แบตเตอรี่เสื่อม / แบตหมดไว',
            'แบตเตอรี่บวม (ดันฝาหลัง/ดันจอ)',
            'ชาร์จไม่เข้า / ชาร์จเข้าช้าผิดปกติ',
            'รูชาร์จหลวม / ต้องขยับสายถึงจะชาร์จเข้า',
            'เครื่องเปิดไม่ติด / ช็อต',
            'เครื่องดับเอง / เครื่องรีสตาร์ทวน (Bootloop)'
        ]
    },
    {
        label: '🔊 หมวดเสียงและกล้อง (Audio & Camera)',
        options: [
            'ลำโพงล่างไม่ดัง / เสียงแตก (ฟังเพลง/ดูคลิปไม่ได้ยิน)',
            'ลำโพงบนไม่ดัง (แนบหูคุยโทรศัพท์ไม่ได้ยิน)',
            'ไมค์เสีย / ปลายทางไม่ได้ยินเสียงเรา',
            'กล้องหลังเสีย / ภาพสั่น / โฟกัสไม่ได้',
            'กล้องหน้าเสีย / จอมืด',
            'กระจกเลนส์กล้องแตก'
        ]
    },
    {
        label: '⚙️ หมวดฮาร์ดแวร์และตัวเครื่อง (Hardware & Body)',
        options: [
            'ตกน้ำ / โดนความชื้น / น้ำเข้าเครื่อง',
            'ฝาหลังแตก / เปลี่ยนบอดี้ใหม่',
            'ปุ่ม Power (เปิด-ปิด) กดไม่ได้ / กดยาก',
            'ปุ่มเพิ่ม-ลดเสียง (Volume) กดไม่ได้',
            'เครื่องร้อนจัดผิดปกติ',
            'ถาดซิมหัก / ติดคาเครื่อง'
        ]
    },
    {
        label: '🌐 หมวดซอฟต์แวร์และเครือข่าย (Software & Network)',
        options: [
            'ลืมรหัสผ่านหน้าจอ / ปลดล็อคหน้าจอ',
            'ติดล็อคบัญชี (ติด iCloud / Gmail / Google Account)',
            'เครื่องค้าง / เครื่องรวน / ซอฟต์แวร์มีปัญหา',
            'ไม่อ่านซิม / ไม่มีสัญญาณโทรศัพท์',
            'เชื่อมต่อ Wi-Fi หรือ Bluetooth ไม่ได้'
        ]
    }
];

const STEPS = [
    { num: 1, label: 'ข้อมูลส่วนตัว' },
    { num: 2, label: 'รายละเอียด' },
    { num: 3, label: 'ยืนยันข้อมูล' },
];

/* ─────────────────────────────── */
/*  CUSTOMER SEARCH BOX           */
/* ─────────────────────────────── */
function CustomerSearch({ onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const ref = useRef();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounce search
    useEffect(() => {
        if (!query.trim() || query.length < 2) { setResults([]); setOpen(false); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/customers?search=${encodeURIComponent(query)}&limit=8`);
                const d = await res.json();
                if (d.success) { setResults(d.data || []); setOpen(true); }
            } catch { /* noop */ }
            setLoading(false);
        }, 380);
        return () => clearTimeout(t);
    }, [query]);

    const handleSelect = (cust) => {
        setSelected(cust);
        setQuery(cust.full_name);
        setOpen(false);
        onSelect(cust);
    };

    const handleClear = () => {
        setSelected(null);
        setQuery('');
        setResults([]);
        onSelect(null);
    };

    // Validate completeness of customer data
    const getMissingFields = (c) => {
        const missing = [];
        if (!c.full_name?.trim()) missing.push('ชื่อ');
        if (!c.phone?.trim()) missing.push('เบอร์โทร');
        return missing;
    };

    return (
        <div className="rounded-2xl border-2 p-4 mb-2" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
            <div className="flex items-center gap-2 mb-3">
                <History size={15} className="text-orange-500" />
                <p className="text-sm font-bold text-orange-700">ลูกค้าเดิม? ค้นหาข้อมูลก่อน</p>
                <span className="text-xs text-orange-400 font-normal">(ไม่บังคับ)</span>
            </div>

            <div className="relative" ref={ref}>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelected(null); }}
                        placeholder="พิมพ์ชื่อ หรือ เบอร์โทร เพื่อค้นหา..."
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-orange-200 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white transition-all"
                    />
                    {query && (
                        <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={13} className="text-slate-400" />
                        </button>
                    )}
                </div>

                {/* Dropdown results */}
                {open && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-xl z-20 overflow-hidden max-h-64 overflow-y-auto">
                        {loading && (
                            <div className="px-4 py-3 text-sm text-slate-400 text-center">กำลังค้นหา...</div>
                        )}
                        {!loading && results.length === 0 && (
                            <div className="px-4 py-3 text-sm text-slate-400 text-center flex flex-col items-center gap-1">
                                <AlertCircle size={16} className="text-slate-300" />
                                ไม่พบข้อมูลลูกค้า
                            </div>
                        )}
                        {!loading && results.map(c => {
                            const missing = getMissingFields(c);
                            return (
                                <button key={c.id} onClick={() => handleSelect(c)}
                                    className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{c.full_name}</p>
                                            <p className="text-xs text-slate-500">{c.phone || '—'}
                                                {c.customer_code && <span className="ml-2 text-orange-400 font-mono text-[10px]">{c.customer_code}</span>}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                                style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
                                                ซ่อม {c.visit_count || 0} ครั้ง
                                            </span>
                                            {missing.length > 0 && (
                                                <span className="text-[10px] text-amber-500">ขาด: {missing.join(', ')}</span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selected customer badge */}
            {selected && (() => {
                const missing = getMissingFields(selected);
                const isComplete = missing.length === 0;
                return (
                    <div className="mt-3 rounded-xl p-3 flex items-start gap-3"
                        style={{
                            backgroundColor: isComplete ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.1)',
                            border: isComplete ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(245,158,11,0.4)',
                        }}>
                        <UserCheck size={16} className={isComplete ? 'text-green-500 flex-shrink-0 mt-0.5' : 'text-amber-500 flex-shrink-0 mt-0.5'} />
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold mb-0.5 ${isComplete ? 'text-green-700' : 'text-amber-700'}`}>
                                {isComplete ? '✓ พบลูกค้าเดิม — กรอกข้อมูลล่วงหน้าแล้ว' : '⚠ พบลูกค้าแต่ข้อมูลไม่ครบ'}
                            </p>
                            <p className="text-xs text-slate-600">
                                {selected.full_name} · {selected.phone} · ซ่อมมาแล้ว {selected.visit_count || 0} ครั้ง
                            </p>
                            {!isComplete && (
                                <p className="text-xs text-amber-600 mt-0.5">กรุณากรอกข้อมูลที่ขาด: {missing.join(', ')}</p>
                            )}
                        </div>
                        <button onClick={handleClear} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                            <X size={14} />
                        </button>
                    </div>
                );
            })()}
        </div>
    );
}

const BOTTOM_NAV = [
    { label: 'หน้าหลัก', icon: Home },
    { label: 'ราคาค่า', icon: DollarSign },
    { label: 'แจ้งซ่อม', icon: Wrench, active: true },
    { label: 'ทางร้าน', icon: Bell },
    { label: 'โทรหาเรา', icon: Phone },
];

/* ─────────────────────────────── */
/*  STEP INDICATOR                 */
/* ─────────────────────────────── */
function StepIndicator({ current }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map((s, i) => (
                <div key={s.num} className="flex items-center">
                    {/* Circle */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s.num < current ? 'bg-orange-500 text-white' :
                            s.num === current ? 'bg-orange-500 text-white ring-4 ring-orange-100' :
                                'bg-gray-200 text-gray-400'
                            }`}>
                            {s.num < current ? <Check size={16} /> : s.num}
                        </div>
                        <span className={`text-[11px] font-medium whitespace-nowrap ${s.num <= current ? 'text-orange-500' : 'text-gray-400'
                            }`}>{s.label}</span>
                    </div>
                    {/* Connector */}
                    {i < STEPS.length - 1 && (
                        <div className="w-12 sm:w-20 h-0.5 mb-5 mx-1 transition-all"
                            style={{ backgroundColor: s.num < current ? '#f97316' : '#e5e7eb' }} />
                    )}
                </div>
            ))}
        </div>
    );
}

/* ─────────────────────────────── */
/*  SUCCESS MODAL                  */
/* ─────────────────────────────── */
function SuccessModal({ trackingId, onTrack }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-[fadeIn_0.3s_ease]">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">ส่งแจ้งซ่อมสำเร็จ! 🎉</h3>
                <p className="text-sm text-slate-500 mb-4">ระบบได้รับคำร้องของคุณแล้ว ทีมงานจะติดต่อกลับภายใน 30 นาที</p>
                <div className="py-3 px-4 rounded-xl mb-5" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
                    <p className="text-xs text-orange-500 mb-1 font-medium">หมายเลขติดตาม</p>
                    <p className="text-lg font-bold font-mono text-orange-600">{trackingId}</p>
                </div>
                <button onClick={onTrack}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
                    style={{ backgroundColor: '#22c55e' }}>
                    ติดตามสถานะ →
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN PAGE                                             */
/* ═══════════════════════════════════════════════════════ */
export default function RepairRequest() {
    const navigate = useNavigate();
    const fileRef = useRef();

    const [step, setStep] = useState(1);
    const [success, setSuccess] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [errors, setErrors] = useState({});
    const [photos, setPhotos] = useState([]);  // { url, name }

    const [symptomSelect, setSymptomSelect] = useState('');
    const [form, setForm] = useState({
        name: '', phone: '', lineId: '',
        deviceType: '', brand: '', model: '',
        symptoms: '', appointment_date: '',
        estimated_cost: '', technician_notes: '',
    });
    const [beforePhoto, setBeforePhoto] = useState(null);
    const [afterPhoto, setAfterPhoto] = useState(null);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const selectDevice = (k) => setForm(f => ({ ...f, deviceType: k }));

    /* customer pre-fill from search */
    const handleCustomerSelected = (cust) => {
        if (!cust) {
            // clear only if user explicitly cleared
            setForm(f => ({ ...f, name: '', phone: '', lineId: '' }));
            return;
        }
        setForm(f => ({
            ...f,
            name: cust.full_name || f.name,
            phone: cust.phone || f.phone,
            lineId: cust.line_id || f.lineId,
        }));
    };

    /* Photo upload */
    const handleFiles = (files) => {
        Array.from(files).slice(0, 4 - photos.length).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => setPhotos(p => [...p, { url: e.target.result, name: file.name }]);
            reader.readAsDataURL(file);
        });
    };
    const removePhoto = (i) => setPhotos(p => p.filter((_, idx) => idx !== i));

    /* Validation */
    const validateStep1 = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'กรุณากรอกชื่อ-นามสกุล';
        if (!form.phone.trim()) e.phone = 'กรุณากรอกเบอร์โทรศัพท์';
        setErrors(e);
        return !Object.keys(e).length;
    };
    const validateStep2 = () => {
        const e = {};
        if (!form.deviceType) e.deviceType = 'กรุณาเลือกประเภทอุปกรณ์';
        if (!form.brand) e.brand = 'กรุณาเลือกยี่ห้อ';
        if (!form.symptoms.trim()) e.symptoms = 'กรุณาระบุอาการเสีย';
        setErrors(e);
        return !Object.keys(e).length;
    };

    const nextStep = () => {
        if (step === 1 && !validateStep1()) return;
        if (step === 2 && !validateStep2()) return;
        setErrors({});
        setStep(s => s + 1);
    };
    const prevStep = () => { setErrors({}); setStep(s => s - 1); };

    const [submitting, setSubmitting] = useState(false);
    const [trackingId, setTrackingId] = useState('');

    const handleSubmit = async () => {
        if (!agreed) { setErrors({ agreed: 'กรุณายอมรับเงื่อนไข' }); return; }
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('full_name', form.name);
            formData.append('phone', form.phone);
            formData.append('line_id', form.lineId || '');
            formData.append('device_type', form.deviceType || 'mobile');
            formData.append('device_brand', form.brand);
            formData.append('device_model', form.model || '');
            formData.append('symptoms', form.symptoms);
            formData.append('appointment_date', form.appointment_date || '');
            formData.append('estimated_cost', form.estimated_cost || 0);
            formData.append('technician_notes', form.technician_notes || '');

            if (beforePhoto) formData.append('before_photo', beforePhoto.file);
            if (afterPhoto) formData.append('after_photo', afterPhoto.file);

            const res = await fetch(`${API_URL}/api/repairs/request`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!data.success) {
                setErrors({ agreed: data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
                setSubmitting(false);
                return;
            }
            setTrackingId(data.tracking_code);
            setSuccess(true);
        } catch (err) {
            console.error('Submit error:', err);
            setErrors({ agreed: 'เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่' });
        }
        setSubmitting(false);
    };

    /* ───── Shared field styles ───── */
    const inputCls = (k) =>
        `w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${errors[k]
            ? 'border-red-400 ring-2 ring-red-100'
            : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
        }`;

    /* ═════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-white flex flex-col">

            {/* Main scrollable area */}
            <div className="flex-1 flex flex-col items-center px-4 py-8 pb-24 sm:pb-8">
                <div className="w-full max-w-[480px] md:max-w-[800px]">

                    {/* ── Logo ── */}
                    <div className="flex flex-col items-center mb-6 text-center">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
                            style={{ backgroundColor: '#111827' }}>
                            <Wrench size={28} className="text-white" />
                        </div>
                        <p className="text-xs font-bold tracking-widest text-slate-800 uppercase">SuperArt Technician</p>
                        <p className="text-[11px] tracking-[0.2em] text-slate-400 uppercase">Repair Logging System</p>
                    </div>

                    {/* ── Heading ── */}
                    <div className="text-center mb-6">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">บันทึกใบรับซ่อม (สำหรับช่าง)</h1>
                        <p className="text-sm text-slate-500">บันทึกข้อมูลการรับซ่อมและประเมินราคาเบื้องต้น</p>
                    </div>

                    {/* ── Step indicator ── */}
                    <StepIndicator current={step} />

                    {/* ═══ STEP 1 ═══ */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-base font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">
                                ขั้นตอนที่ 1: ข้อมูลส่วนตัว
                            </h2>

                            {/* ── Returning customer search ── */}
                            <CustomerSearch onSelect={handleCustomerSelected} />

                            {/* Name + Phone */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Name */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                        ชื่อ-นามสกุล <span className="text-red-400">*</span>
                                    </label>
                                    <input type="text" value={form.name} onChange={set('name')}
                                        placeholder="ชื่อ-นามสกุล" className={inputCls('name')} />
                                    {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                        เบอร์โทรศัพท์ <span className="text-red-400">*</span>
                                    </label>
                                    <input type="tel" value={form.phone} onChange={set('phone')}
                                        placeholder="08X-XXXX-XXXX" className={inputCls('phone')} />
                                    {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            {/* Line ID + Appointment */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                        Line ID <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
                                    </label>
                                    <input type="text" value={form.lineId} onChange={set('lineId')}
                                        placeholder="@lineid" className={inputCls('lineId')} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                        วันนัดหมาย <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                                    </label>
                                    <input type="datetime-local" value={form.appointment_date} onChange={set('appointment_date')}
                                        className={inputCls('appointment_date')} />
                                </div>
                            </div>

                            <button onClick={nextStep}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 mt-2"
                                style={{ backgroundColor: '#111827' }}>
                                ถัดไป <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* ═══ STEP 2 ═══ */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <h2 className="text-base font-bold text-slate-700 mb-2 pb-2 border-b border-slate-100">
                                ขั้นตอนที่ 2: ข้อมูลอุปกรณ์
                            </h2>

                            {/* Device type */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-2 block">
                                    เลือกประเภทอุปกรณ์ <span className="text-red-400">*</span>
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {DEVICE_TYPES.map(d => {
                                        const Icon = d.icon;
                                        const active = form.deviceType === d.key;
                                        return (
                                            <button key={d.key} onClick={() => selectDevice(d.key)}
                                                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all hover:border-orange-300"
                                                style={{
                                                    borderColor: active ? '#f97316' : '#e5e7eb',
                                                    backgroundColor: active ? '#fff7ed' : '#fafafa',
                                                }}>
                                                <Icon size={22} style={{ color: active ? '#f97316' : '#94a3b8' }} />
                                                <span className={`text-xs font-semibold ${active ? 'text-orange-500' : 'text-slate-500'}`}>
                                                    {d.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.deviceType && <p className="text-xs text-red-400 mt-1">{errors.deviceType}</p>}
                            </div>

                            {/* Brand + Model */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                        ยี่ห้อ (Brand) <span className="text-red-400">*</span>
                                    </label>
                                    <select value={form.brand} onChange={set('brand')}
                                        className={inputCls('brand') + ' bg-white'}>
                                        <option value="">-- เลือกยี่ห้อ --</option>
                                        {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                    {errors.brand && <p className="text-xs text-red-400 mt-1">{errors.brand}</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">รุ่น (Model)</label>
                                    <input type="text" value={form.model} onChange={set('model')}
                                        placeholder="เช่น iPhone 15 Pro Max" className={inputCls('model')} />
                                </div>
                            </div>

                            {/* Symptoms */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                    อาการเสีย <span className="text-red-400">*</span>
                                </label>
                                <select value={symptomSelect} onChange={(e) => {
                                    const val = e.target.value;
                                    setSymptomSelect(val);
                                    if (val !== 'other') {
                                        setForm(f => ({ ...f, symptoms: val }));
                                    } else {
                                        setForm(f => ({ ...f, symptoms: '' }));
                                    }
                                }} className={inputCls('symptoms') + ' bg-white mb-2'}>
                                    <option value="">-- เลือกอาการเสีย --</option>
                                    {SYMPTOM_CATEGORIES.map(cat => (
                                        <optgroup key={cat.label} label={cat.label}>
                                            {cat.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </optgroup>
                                    ))}
                                    <option value="other">- อื่นๆ (ระบุเอง)</option>
                                </select>
                                
                                {symptomSelect === 'other' && (
                                    <textarea value={form.symptoms} onChange={set('symptoms')}
                                        rows={3} placeholder="กรุณาระบุอาการเสียโดยละเอียด เช่น หน้าจอแตก, ชาร์จไม่เข้า..."
                                        className={inputCls('symptoms') + ' resize-none'} />
                                )}
                                {errors.symptoms && <p className="text-xs text-red-400 mt-1">{errors.symptoms}</p>}
                            </div>

                            {/* Price & Tech Notes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                        ราคาซ่อมประเมิน (บาท)
                                    </label>
                                    <input type="number" value={form.estimated_cost} onChange={set('estimated_cost')}
                                        placeholder="0.00" className={inputCls('estimated_cost')} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">หมายเหตุช่าง</label>
                                    <input type="text" value={form.technician_notes} onChange={set('technician_notes')}
                                        placeholder="จดบันทึกเพิ่มเติม..." className={inputCls('technician_notes')} />
                                </div>
                            </div>

                            {/* Photo upload slots */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                        รูปก่อนซ่อม (Before)
                                    </label>
                                    <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file'; input.accept = 'image/*';
                                            input.onchange = (e) => {
                                                const file = e.target.files[0];
                                                if (file) setBeforePhoto({ file, url: URL.createObjectURL(file) });
                                            };
                                            input.click();
                                        }}>
                                        {beforePhoto ? (
                                            <>
                                                <img src={beforePhoto.url} className="w-full h-full object-cover" />
                                                <button onClick={(e) => { e.stopPropagation(); setBeforePhoto(null); }}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X size={12} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <Camera size={24} className="text-slate-400" />
                                                <p className="text-xs text-slate-500">เลือกรูปก่อนซ่อม</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                        รูปหลังซ่อม (After - ถ้าเสร็จแล้ว)
                                    </label>
                                    <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file'; input.accept = 'image/*';
                                            input.onchange = (e) => {
                                                const file = e.target.files[0];
                                                if (file) setAfterPhoto({ file, url: URL.createObjectURL(file) });
                                            };
                                            input.click();
                                        }}>
                                        {afterPhoto ? (
                                            <>
                                                <img src={afterPhoto.url} className="w-full h-full object-cover" />
                                                <button onClick={(e) => { e.stopPropagation(); setAfterPhoto(null); }}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X size={12} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <Camera size={24} className="text-slate-400" />
                                                <p className="text-xs text-slate-500">เลือกรูปหลังซ่อม</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Nav buttons */}
                            <div className="flex gap-3 pt-1">
                                <button onClick={prevStep}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-slate-600 border-2 border-slate-200 hover:bg-slate-50 transition-colors">
                                    <ChevronLeft size={16} /> ย้อนกลับ
                                </button>
                                <button onClick={nextStep}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
                                    style={{ backgroundColor: '#f97316' }}>
                                    ถัดไป <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ STEP 3 ═══ */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <h2 className="text-base font-bold text-slate-700 mb-2 pb-2 border-b border-slate-100">
                                ขั้นตอนที่ 3: ยืนยันข้อมูล
                            </h2>

                            {/* Summary card */}
                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                                    {/* Personal info */}
                                    <div className="p-5">
                                        <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-3">ข้อมูลส่วนตัว</p>
                                        {[
                                            ['ชื่อ-นามสกุล', form.name || '-'],
                                            ['เบอร์โทร', form.phone || '-'],
                                            ['Line ID', form.lineId || '-'],
                                            ['วันนัดหมาย', form.appointment_date ? new Date(form.appointment_date + ':00').toLocaleString('th-TH') : '-'],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between py-1.5 text-sm border-b border-slate-50 last:border-0">
                                                <span className="text-slate-500">{k}</span>
                                                <span className="text-slate-800 font-medium text-right ml-2">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Device info */}
                                    <div className="p-5">
                                        <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-3">ข้อมูลอุปกรณ์</p>
                                        {[
                                            ['ประเภท', DEVICE_TYPES.find(d => d.key === form.deviceType)?.label || '-'],
                                            ['ยี่ห้อ', form.brand || '-'],
                                            ['รุ่น', form.model || '-'],
                                            ['อาการเสีย', form.symptoms || '-'],
                                            ['ราคาประเมิน', form.estimated_cost ? Number(form.estimated_cost).toLocaleString() + ' บาท' : '-'],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between py-1.5 text-sm border-b border-slate-50 last:border-0">
                                                <span className="text-slate-500 flex-shrink-0">{k}</span>
                                                <span className="text-slate-800 font-medium text-right ml-2 break-all">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Photos */}
                                {(beforePhoto || afterPhoto) && (
                                    <div className="p-5 border-t border-slate-100">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">รูปภาพประกอบ</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {beforePhoto && (
                                                <div className="text-center">
                                                    <img src={beforePhoto.url} className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                                                    <p className="text-[10px] mt-1 text-slate-400">ก่อนซ่อม</p>
                                                </div>
                                            )}
                                            {afterPhoto && (
                                                <div className="text-center">
                                                    <img src={afterPhoto.url} className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                                                    <p className="text-[10px] mt-1 text-slate-400">หลังซ่อม</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Terms checkbox */}
                            <button onClick={() => { setAgreed(!agreed); setErrors({}); }}
                                className="flex items-start gap-3 text-left">
                                {agreed
                                    ? <CheckSquare size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                                    : <Square size={20} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                }
                                <span className="text-sm text-slate-600">
                                    ยอมรับ<span className="text-orange-500 underline ml-1">เงื่อนไขการใช้บริการ</span>
                                </span>
                            </button>
                            {errors.agreed && <p className="text-xs text-red-400 -mt-2">{errors.agreed}</p>}

                            {/* Nav buttons */}
                            <div className="flex gap-3 pt-1">
                                <button onClick={prevStep}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-slate-600 border-2 border-slate-200 hover:bg-slate-50 transition-colors">
                                    <ChevronLeft size={16} /> ย้อนกลับ
                                </button>
                                <button onClick={handleSubmit} disabled={submitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-60"
                                    style={{ backgroundColor: '#111827' }}>
                                    <CheckCircle size={16} /> {submitting ? 'กำลังบันทึก...' : 'เปิดใบแจ้งซ่อม'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Footer ── */}
            <footer className="text-center py-4 border-t border-slate-100 hidden sm:block">
                <p className="text-xs text-slate-400 tracking-wide mb-2">© 2024 SUPERART MOBILE REPAIR CENTER</p>
                <button onClick={() => navigate('/admin')} className="text-[10px] text-slate-300 hover:text-slate-500 transition-colors">
                    สำหรับผู้ดูแลระบบ (Admin)
                </button>
            </footer>

            {/* ── Mobile bottom nav (≤ md) ── */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex sm:hidden z-30">
                {BOTTOM_NAV.map(item => {
                    const Icon = item.icon;
                    return (
                        <button key={item.label}
                            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors ${item.active ? 'text-orange-500' : 'text-slate-400'
                                }`}>
                            <Icon size={19} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* ── Success modal ── */}
            {success && (
                <SuccessModal
                    trackingId={trackingId}
                    onTrack={() => navigate('/track')}
                />
            )}
        </div>
    );
}
