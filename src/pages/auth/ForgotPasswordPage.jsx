import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import API_URL from '../../api/config';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            setStatus('error');
            setMessage('กรุณากรอกที่อยู่อีเมล');
            return;
        }
        setLoading(true);
        setStatus('idle');
        try {
            const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (data.success) {
                setStatus('success');
                setMessage(`ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง ${email} เรียบร้อยแล้ว`);
            } else {
                setStatus('error');
                setMessage(data.message || 'ไม่พบที่อยู่อีเมลนี้ในระบบ กรุณาตรวจสอบอีกครั้ง');
            }
        } catch {
            setStatus('error');
            setMessage('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="flex items-center justify-center min-h-screen p-4 sm:p-8"
            style={{ fontFamily: "'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: '#f1f3f6', color: '#111827' }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
                .font-mono-num { font-family: 'Space Grotesk', monospace; }
                @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }
                .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
                @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                .fade-in { animation: fadeIn 0.35s ease-out forwards; }
            `}</style>

            <div className="w-full max-w-5xl bg-white border border-gray-300 rounded-2xl shadow-xl overflow-hidden">

                {/* ── MAIN CONTENT ── */}
                <div className="grid grid-cols-1 md:grid-cols-12" style={{ minHeight: '580px' }}>

                    {/* ── LEFT PANEL ── */}
                    <div
                        className="md:col-span-5 text-white p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800 relative overflow-hidden"
                        style={{ background: 'linear-gradient(145deg, #0B132B 0%, #1C2541 60%, #1e3a8a 100%)' }}
                    >
                        {/* Decorative circles */}
                        <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full border-4 pointer-events-none" style={{ borderColor: 'rgba(6,182,212,0.2)', filter: 'blur(4px)' }} />
                        <div className="absolute -right-6 -bottom-6 w-44 h-44 rounded-full border-2 pointer-events-none" style={{ borderColor: 'rgba(96,165,250,0.3)' }} />

                        {/* Top: Logo + Headline */}
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                                    style={{ background: 'linear-gradient(to top right, #2563eb, #22d3ee)', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
                                >
                                    <Wrench size={20} />
                                </div>
                                <div>
                                    <span className="text-xl font-bold tracking-tight text-white">SuperArt</span>
                                    <span className="block text-[10px] font-medium uppercase tracking-widest" style={{ color: '#67e8f9' }}>
                                        Repair &amp; Management
                                    </span>
                                </div>
                            </div>

                            <div className="mt-14">
                                <div
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-3 border"
                                    style={{ backgroundColor: 'rgba(8,47,73,0.8)', color: '#67e8f9', borderColor: 'rgba(6,182,212,0.4)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="#22d3ee" viewBox="0 0 24 24">
                                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                    </svg>
                                    ระบบความปลอดภัยบัญชีขั้นสูง
                                </div>

                                <h2 className="text-2xl md:text-3xl font-bold leading-snug text-white">
                                    กู้คืนการเข้าถึง<br />
                                    <span
                                        className="text-transparent bg-clip-text"
                                        style={{ backgroundImage: 'linear-gradient(to right, #93c5fd, #a5f3fc)' }}
                                    >
                                        บัญชีผู้ใช้งาน
                                    </span>
                                </h2>
                                <p className="text-sm leading-relaxed font-light mt-4 max-w-xs" style={{ color: '#cbd5e1' }}>
                                    ระบบจัดการร้านซ่อมมือถือ SuperArt พร้อมการยืนยันตัวตนผ่านอีเมลมาตรฐานสากล
                                    เพื่อรักษาความปลอดภัยข้อมูลลูกค้าและงานซ่อม
                                </p>
                            </div>
                        </div>

                        {/* Bottom: Feature bullets + footer */}
                        <div>
                            <div className="pt-6 border-t" style={{ borderColor: 'rgba(71,85,105,0.6)' }}>
                                <div className="grid grid-cols-2 gap-2.5 text-xs" style={{ color: '#e2e8f0' }}>
                                    {[
                                        { dot: '#34d399', label: 'ส่งลิงก์ใน 1 นาที' },
                                        { dot: '#22d3ee', label: 'หมดอายุใน 15 นาที' },
                                        { dot: '#34d399', label: 'เข้ารหัส TLS 256-bit' },
                                        { dot: '#60a5fa', label: 'ความปลอดภัยสูงสุด' },
                                    ].map((f, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.dot, boxShadow: `0 0 6px ${f.dot}80` }} />
                                            <span className="font-medium">{f.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 flex items-center justify-between text-[11px]" style={{ color: '#64748b' }}>
                                    <span>SuperArt Mobile Repair System v2.4</span>
                                    <a href="#" className="hover:underline" style={{ color: '#67e8f9' }}>นโยบายความเป็นส่วนตัว</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT PANEL ── */}
                    <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-between bg-white">
                        {/* Top bar */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="font-mono-num text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                FORM REF: AUTH-PW-01
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: '#065f46' }}>
                                <span className="w-2 h-2 rounded-full pulse-dot" style={{ backgroundColor: '#22c55e' }} />
                                ระบบพร้อมใช้งาน (ONLINE)
                            </span>
                        </div>

                        {/* Form */}
                        <div className="max-w-md mx-auto w-full my-auto py-6">
                            {/* Icon + Title */}
                            <div className="text-center mb-6">
                                <div
                                    className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                                    style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                                >
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold tracking-tight" style={{ color: '#0f172a' }}>ลืมรหัสผ่าน?</h3>
                                <p className="text-sm mt-1" style={{ color: '#475569' }}>
                                    กรอกอีเมลที่คุณใช้ลงทะเบียนเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
                                </p>
                            </div>

                            {/* Info box */}
                            <div
                                className="mb-5 p-3.5 rounded-lg flex items-start gap-3 text-xs"
                                style={{ border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#1e293b', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                            >
                                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="#2563eb" viewBox="0 0 24 24">
                                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                </svg>
                                <div>
                                    <p className="font-semibold mb-0.5" style={{ color: '#1e3a8a' }}>การทำงานของระบบ (System Logic):</p>
                                    <p className="leading-relaxed" style={{ color: '#334155' }}>
                                        ระบบจะตรวจสอบฐานข้อมูลผู้ใช้งาน (
                                        <span className="font-mono-num font-medium px-1 rounded border" style={{ color: '#1d4ed8', backgroundColor: '#fff', borderColor: '#bfdbfe' }}>users</span>
                                        ) หากมีอีเมลตรงกันจะส่งลิงก์รีเซ็ตรหัสผ่านไปยังกล่องจดหมายของคุณทันที
                                    </p>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label
                                        className="flex items-center justify-between text-xs font-semibold mb-1.5"
                                        htmlFor="fp-email"
                                        style={{ color: '#1e293b' }}
                                    >
                                        <span>
                                            อีเมลผู้ใช้งาน (EMAIL ADDRESS)
                                            <span className="font-bold ml-1" style={{ color: '#f43f5e' }}>*</span>
                                        </span>
                                        <span className="font-normal" style={{ color: '#94a3b8', fontSize: '11px' }}>เช่น somchai.repair@gmail.com</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: '#2563eb' }}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                            </svg>
                                        </div>
                                        <input
                                            id="fp-email"
                                            type="email"
                                            placeholder="somchai.repair@gmail.com"
                                            value={email}
                                            onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
                                            className="font-mono-num font-medium w-full pl-10 pr-4 py-2.5 text-sm rounded-lg"
                                            style={{
                                                backgroundColor: '#fff',
                                                border: '2px solid #2563eb',
                                                color: '#0f172a',
                                                outline: 'none',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                            }}
                                            onFocus={e => { e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.1)'; }}
                                            onBlur={e => { e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
                                        />
                                    </div>
                                </div>

                                <button
                                    id="btn-send-reset-link"
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 px-4 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 mt-2 transition-all"
                                    style={{
                                        backgroundColor: loading ? '#93c5fd' : '#2563eb',
                                        boxShadow: loading ? 'none' : '0 4px 12px rgba(37,99,235,0.25)',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                    }}
                                    onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                                    onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#2563eb'; }}
                                >
                                    {loading ? (
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                        </svg>
                                    )}
                                    <span>{loading ? 'กำลังส่ง...' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่ (Send Reset Link)'}</span>
                                </button>

                                <div className="text-center pt-2">
                                    <button
                                        id="btn-back-login"
                                        type="button"
                                        onClick={() => navigate('/')}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                                        style={{ color: '#2563eb' }}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                        </svg>
                                        กลับไปยังหน้าเข้าสู่ระบบ (Back to Login)
                                    </button>
                                </div>
                            </form>

                            {/* ── Output states ── */}
                            <div className="mt-8 pt-5" style={{ borderTop: '1px dashed #e2e8f0' }}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                                        การแสดงผลลัพธ์ข้อมูลออก (Expected Output States)
                                    </span>
                                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border" style={{ color: '#2563eb', backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                                        TABLE 4.2 COMPLIANT
                                    </span>
                                </div>

                                {/* Success result */}
                                {status === 'success' && (
                                    <div className="fade-in p-2.5 rounded-lg border flex items-center gap-2.5 mb-2" style={{ border: '1px solid #6ee7b7', backgroundColor: '#ecfdf5', color: '#022c22' }}>
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#22c55e' }}>
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                                            </svg>
                                        </div>
                                        <div className="text-xs">
                                            <strong className="font-semibold" style={{ color: '#14532d' }}>กรณีสำเร็จ: </strong>
                                            <span className="font-mono-num font-medium" style={{ color: '#166534' }}>"{message}"</span>
                                        </div>
                                    </div>
                                )}

                                {/* Error result */}
                                {status === 'error' && (
                                    <div className="fade-in p-2.5 rounded-lg border flex items-center gap-2.5 mb-2" style={{ border: '1px solid #fcd34d', backgroundColor: '#fffbeb', color: '#451a03' }}>
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f59e0b' }}>
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                                            </svg>
                                        </div>
                                        <div className="text-xs">
                                            <strong className="font-semibold" style={{ color: '#78350f' }}>กรณีไม่พบอีเมล: </strong>
                                            <span className="font-mono-num font-medium" style={{ color: '#92400e' }}>"{message}"</span>
                                        </div>
                                    </div>
                                )}

                                {/* Static placeholder states when idle */}
                                {status === 'idle' && (
                                    <>
                                        <div className="p-2.5 rounded-lg border flex items-center gap-2.5 mb-2 text-xs" style={{ border: '1px solid #6ee7b7', backgroundColor: '#ecfdf5', color: '#022c22' }}>
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#22c55e' }}>
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></svg>
                                            </div>
                                            <div>
                                                <strong className="font-semibold" style={{ color: '#14532d' }}>กรณีสำเร็จ: </strong>
                                                ระบบแสดงข้อความ <span className="font-mono-num font-medium" style={{ color: '#166534' }}>"ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง somchai.repair@gmail.com เรียบร้อยแล้ว"</span>
                                            </div>
                                        </div>
                                        <div className="p-2.5 rounded-lg border flex items-center gap-2.5 text-xs" style={{ border: '1px solid #fcd34d', backgroundColor: '#fffbeb', color: '#451a03' }}>
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f59e0b' }}>
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></svg>
                                            </div>
                                            <div>
                                                <strong className="font-semibold" style={{ color: '#78350f' }}>กรณีไม่พบอีเมล: </strong>
                                                ระบบแจ้งเตือน <span className="font-mono-num font-medium" style={{ color: '#92400e' }}>"ไม่พบที่อยู่อีเมลนี้ในระบบ กรุณาตรวจสอบอีกครั้ง"</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200 text-[11px] text-slate-500">
                            <span>© 2026 SuperArt Mobile Repair. All rights reserved.</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => navigate('/repair-request')} className="hover:underline" style={{ color: '#2563eb' }}>แจ้งซ่อมออนไลน์</button>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <button onClick={() => navigate('/track')} className="hover:underline" style={{ color: '#2563eb' }}>ติดตามสถานะงานซ่อม</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
