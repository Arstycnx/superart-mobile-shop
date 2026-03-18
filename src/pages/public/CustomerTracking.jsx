import { useState, useRef } from 'react';
import API_URL from '../../api/config';
import {
    Search, Phone, QrCode, Send, Phone as PhoneIcon,
    CheckCircle, Wrench, Clock, FileText, Download, Loader2
} from 'lucide-react';
import { toPng } from 'html-to-image';
import ReceiptCard from '../../components/shared/ReceiptCard';

const API = `${API_URL}/api/repairs`;

const STATUS_META = {
    received: { label: 'รับเครื่องแล้ว', step: 0, color: '#60a5fa' },
    repairing: { label: 'กำลังซ่อม', step: 1, color: '#f59e0b' },
    completed: { label: 'ซ่อมเสร็จแล้ว', step: 2, color: '#22c55e' },
    delivered: { label: 'ส่งมอบแล้ว', step: 3, color: '#a78bfa' },
    cancelled: { label: 'ยกเลิก', step: 0, color: '#f87171' },
};

const STEPS = ['รับเครื่อง', 'กำลังซ่อม', 'ซ่อมเสร็จ', 'ส่งมอบ'];
const thb = (n) => '฿' + Number(n || 0).toLocaleString('th-TH');

/* ─── Stepper ────────────────────────────────────────────── */
function Stepper({ currentStep }) {
    return (
        <div className="relative flex items-start justify-between px-2 py-1">
            {STEPS.map((_, i) => i < STEPS.length - 1 && (
                <div key={i} className="absolute h-0.5 top-5 transition-all"
                    style={{
                        left: `calc(${(i / (STEPS.length - 1)) * 100}% + 18px)`,
                        right: `calc(${100 - ((i + 1) / (STEPS.length - 1)) * 100}% + 18px)`,
                        backgroundColor: i < currentStep ? '#22c55e' : '#d1d5db',
                    }} />
            ))}
            {STEPS.map((step, i) => {
                const done = i < currentStep, active = i === currentStep;
                return (
                    <div key={step} className="flex flex-col items-center gap-1.5 z-10 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${done ? 'bg-green-500 text-white' : active ? 'bg-green-500 text-white ring-4 ring-green-100' : 'bg-gray-200 text-gray-400'}`}>
                            {done ? <CheckCircle size={20} /> : active ? <Wrench size={18} /> : <Clock size={18} />}
                        </div>
                        <span className={`text-xs font-semibold text-center ${done || active ? 'text-green-600' : 'text-gray-400'}`}>{step}</span>
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN PAGE                                             */
/* ═══════════════════════════════════════════════════════ */
export default function CustomerTracking() {
    const [trackId, setTrackId] = useState('');
    const [phone, setPhone] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const receiptRef = useRef(null);


    const handleDownloadReceipt = async () => {
        if (!receiptRef.current) return;
        setDownloading(true);
        try {
            // Wait a bit for images to load if any
            await new Promise(r => setTimeout(r, 500));
            const dataUrl = await toPng(receiptRef.current, {
                quality: 0.95,
                backgroundColor: '#ffffff',
                cacheBust: true,
            });
            const link = document.createElement('a');
            link.download = `Receipt-${result.order_code}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Error exporting receipt:', err);
            alert('ไม่สามารถดาวน์โหลดใบเสร็จได้ในขณะนี้');
        } finally {
            setDownloading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!trackId.trim()) { setError('กรุณากรอกหมายเลขติดตาม'); return; }
        setLoading(true); setError(''); setResult(null);
        try {
            const res = await fetch(`${API}/track/${encodeURIComponent(trackId.trim())}`);
            const data = await res.json();
            if (!data.success) { setError('ไม่พบรายการซ่อมนี้ กรุณาตรวจสอบหมายเลขอีกครั้ง'); return; }
            setResult(data.data);
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        }
        setLoading(false);
    };

    const statusInfo = result ? (STATUS_META[result.status] || STATUS_META.received) : null;
    const currentStep = statusInfo?.step ?? 0;

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0fdf4' }}>
            <div className="flex-1 flex flex-col items-center px-4 py-12">
                {/* Logo */}
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                        <Wrench size={18} className="text-white" />
                    </div>
                    <span className="text-lg font-bold text-slate-800">SuperArt</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-2">
                    ติดตามสถานะงานซ่อมของคุณ
                </h1>
                <p className="text-sm text-slate-500 mb-8 text-center">Track your repair status in real-time</p>

                {/* Search form */}
                <form onSubmit={handleSearch}
                    className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">กรอกหมายเลขติดตาม</label>
                            <div className="relative">
                                <QrCode size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" value={trackId} onChange={e => setTrackId(e.target.value)}
                                    placeholder="SA-2025-0001"
                                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition-all bg-slate-50" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">เบอร์โทรศัพท์ (ไม่บังคับ)</label>
                            <div className="relative">
                                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                                    placeholder="081-234-5678"
                                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition-all bg-slate-50" />
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-500 mb-3 text-center">{error}</p>}
                    <button type="submit" disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
                        style={{ backgroundColor: '#111827' }}>
                        <Search size={15} />
                        {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
                    </button>
                </form>

                {/* Result card */}
                {result && (
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-5">
                        {/* Status row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full border tracking-wide"
                                    style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color, borderColor: statusInfo.color + '50' }}>
                                    ● {statusInfo.label}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">วันที่รับซ่อม</p>
                                <p className="text-sm font-bold text-slate-800">
                                    {result.received_date ? new Date(result.received_date).toLocaleDateString('th-TH') : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Device */}
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">{result.device_brand} {result.device_model}</h2>
                            <p className="text-sm text-slate-400 mt-0.5">
                                Tracking ID: <span className="font-mono font-semibold text-slate-600">{result.order_code}</span>
                            </p>
                            <p className="text-sm text-slate-500 mt-0.5">ลูกค้า: {result.customer_name}</p>
                        </div>

                        {/* Stepper */}
                        <div className="py-2"><Stepper currentStep={currentStep} /></div>

                        {/* Symptoms + cost */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">อาการเสีย</p>
                                {result.symptoms ? (
                                    <div className="flex flex-wrap gap-2">
                                        {result.symptoms.split(',').map(s => (
                                            <span key={s} className="text-xs px-3 py-1 rounded-full font-medium"
                                                style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
                                                {s.trim()}
                                            </span>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-slate-400">—</p>}

                                <div className="mt-5 p-3 rounded-xl" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500 font-medium">ราคาประเมิน</span>
                                        <span className="text-xl font-bold text-slate-900">{thb(result.estimated_cost)}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">*ราคาสุดท้ายอาจเปลี่ยนแปลงตามการตรวจสอบ</p>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">ไทม์ไลน์ ({result.timeline?.length || 0} รายการ)</p>
                                <div className="space-y-2">
                                    {(result.timeline || []).slice().reverse().map((t, i) => (
                                        <div key={i} className="flex gap-2">
                                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: statusInfo.color }} />
                                            <div>
                                                <p className="text-xs text-slate-500">{new Date(t.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</p>
                                                <p className="text-xs font-medium text-slate-700">{t.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-400 italic">
                                *ข้อมูลจะอัปเดตอัตโนมัติเมื่อสถานะเปลี่ยน
                            </div>
                            <div className="flex items-center gap-2">
                                <a href="https://t.me/SuperArt_Alert_bot" target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-[#0088cc] border-2 border-[#0088cc] hover:bg-blue-50 transition-colors">
                                    <Send size={14} />Telegram
                                </a>
                                <button onClick={handleDownloadReceipt} disabled={downloading}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-600 border-2 border-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50">
                                    {downloading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                    ใบเสร็จ
                                </button>
                                <a href="tel:0617049154"
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                                    style={{ backgroundColor: '#111827' }}>
                                    <PhoneIcon size={14} />ติดต่อร้าน
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <footer className="py-5 text-center">
                <p className="text-xs text-slate-400">© 2026 SuperArt Repair Service. All rights reserved.</p>
            </footer>

            {/* Hidden Receipt for Capture */}
            {result && (
                <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -1000, pointerEvents: 'none', opacity: 0 }}>
                    <ReceiptCard ref={receiptRef} order={result} />
                </div>
            )}
        </div>
    );
}
