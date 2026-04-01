import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Wrench, ArrowLeft, CheckCircle } from 'lucide-react';
import API_URL from '../../api/config';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState('form'); // 'form' | 'success'
    const [form, setForm] = useState({ email: '', new_password: '', confirm_password: '' });
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.email || !form.new_password || !form.confirm_password) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        if (form.new_password.length < 6) {
            setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }
        if (form.new_password !== form.confirm_password) {
            setError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, new_password: form.new_password }),
            });
            const data = await res.json();
            if (data.success) {
                setStep('success');
            } else {
                setError(data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            }
        } catch {
            setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen font-sans">
            {/* ─── LEFT PANEL ─────────────────────────────────────────── */}
            <div className="hidden lg:flex flex-col relative w-1/2 overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a2e4a 40%, #0d1f35 100%)' }}
                />
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
                <div className="relative flex flex-col h-full p-10 z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                            <Wrench size={18} className="text-white" />
                        </div>
                        <span className="text-white font-semibold text-sm">SuperArt</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center mt-16">
                        <h2 className="text-4xl font-bold text-white leading-snug mb-5">
                            รีเซ็ตรหัสผ่าน<br />
                            <span className="text-blue-300">อย่างปลอดภัย</span>
                        </h2>
                        <p className="text-slate-300 text-base leading-relaxed max-w-sm mb-8">
                            กรอกอีเมลและรหัสผ่านใหม่ที่ต้องการ
                            ระบบจะตรวจสอบและอัปเดตรหัสผ่านของคุณทันที
                        </p>
                        <div className="flex gap-3">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white text-sm font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                ปลอดภัย 100%
                            </span>
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white text-sm font-medium">
                                <span className="w-2 h-2 rounded-full bg-blue-400" />
                                เปลี่ยนได้ทันที
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>SuperArt Mobile Repair System v2.0</span>
                    </div>
                </div>
            </div>

            {/* ─── RIGHT PANEL ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col bg-white relative">
                <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-16 py-12">
                    <div className="w-full max-w-sm">

                        {step === 'success' ? (
                            /* ─── SUCCESS STATE ─── */
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                                    <CheckCircle size={40} className="text-emerald-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">เปลี่ยนรหัสผ่านสำเร็จ!</h2>
                                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                                    รหัสผ่านของคุณถูกเปลี่ยนแล้ว<br />
                                    กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่
                                </p>
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                >
                                    ไปหน้าเข้าสู่ระบบ
                                </button>
                            </div>
                        ) : (
                            /* ─── FORM STATE ─── */
                            <>
                                {/* Header */}
                                <div className="flex flex-col items-center mb-8">
                                    <div className="w-16 h-16 rounded-full bg-slate-900 flex flex-col items-center justify-center mb-4 shadow-lg">
                                        <Lock size={24} className="text-white" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-slate-900 mb-1">ลืมรหัสผ่าน</h1>
                                    <p className="text-sm text-slate-500 text-center">กรอกอีเมลและตั้งรหัสผ่านใหม่ได้เลย</p>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            อีเมลที่ลงทะเบียนในระบบ
                                        </label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                id="reset-email"
                                                type="email"
                                                placeholder="name@company.com"
                                                value={form.email}
                                                onChange={e => setForm({ ...form, email: e.target.value })}
                                                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* New Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            รหัสผ่านใหม่
                                        </label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                id="new-password"
                                                type={showPass ? 'text' : 'password'}
                                                placeholder="อย่างน้อย 6 ตัวอักษร"
                                                value={form.new_password}
                                                onChange={e => setForm({ ...form, new_password: e.target.value })}
                                                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPass(!showPass)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            ยืนยันรหัสผ่านใหม่
                                        </label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                id="confirm-password"
                                                type={showConfirm ? 'text' : 'password'}
                                                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                                value={form.confirm_password}
                                                onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                                                className={`w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                                                    form.confirm_password && form.confirm_password !== form.new_password
                                                        ? 'border-red-300 focus:ring-red-400'
                                                        : 'border-slate-200 focus:ring-slate-900'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {form.confirm_password && form.confirm_password !== form.new_password && (
                                            <p className="mt-1 text-xs text-red-500">รหัสผ่านไม่ตรงกัน</p>
                                        )}
                                    </div>

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-semibold transition-colors mt-2"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                กำลังดำเนินการ...
                                            </span>
                                        ) : 'เปลี่ยนรหัสผ่าน'}
                                    </button>

                                    {/* Back to login */}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/')}
                                        className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft size={16} />
                                        กลับหน้าเข้าสู่ระบบ
                                    </button>
                                </form>

                                <p className="text-center text-xs text-slate-400 mt-8">
                                    © 2025 SuperArt Mobile Repair. All rights reserved.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
