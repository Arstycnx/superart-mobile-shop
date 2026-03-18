import axios from 'axios';
import API_URL from '../../api/config';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Moon, ClipboardList, Wrench } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '', remember: false });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.email || !form.password) {
            setError('กรุณากรอกอีเมลและรหัสผ่าน');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, password: form.password }),
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/admin');
            } else {
                setError(data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
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
                {/* Background photo via gradient placeholder */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, #0a1628 0%, #1a2e4a 40%, #0d1f35 100%)',
                    }}
                />
                {/* Subtle texture overlay */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
                {/* Phone repair worker silhouette illustration */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <svg viewBox="0 0 400 400" className="w-80 h-80" fill="white">
                        <path d="M200 50 C200 50 160 80 140 120 C120 160 130 200 150 230 C170 260 200 280 200 280 C200 280 230 260 250 230 C270 200 280 160 260 120 C240 80 200 50 200 50Z" opacity="0.3" />
                        <rect x="170" y="150" width="60" height="100" rx="8" opacity="0.5" />
                        <rect x="175" y="160" width="50" height="80" rx="4" opacity="0.3" />
                        <circle cx="200" cy="260" r="5" opacity="0.5" />
                        <rect x="140" y="200" width="30" height="8" rx="4" opacity="0.4" />
                        <rect x="230" y="200" width="30" height="8" rx="4" opacity="0.4" />
                    </svg>
                </div>

                {/* Content */}
                <div className="relative flex flex-col h-full p-10 z-10">
                    {/* Logo top-left */}
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                            <Wrench size={18} className="text-white" />
                        </div>
                        <span className="text-white font-semibold text-sm">SuperArt</span>
                    </div>

                    {/* Center text */}
                    <div className="flex-1 flex flex-col justify-center mt-16">
                        <h1 className="text-4xl font-bold text-white leading-snug mb-5">
                            บริการซ่อมมือถือ<br />ระดับมืออาชีพ<br />
                            <span className="text-blue-300">มาตรฐานที่คุณไว้วางใจ</span>
                        </h1>
                        <p className="text-slate-300 text-base leading-relaxed max-w-sm mb-8">
                            ระบบจัดการร้านซ่อมที่ทันสมัย รวดเร็ว และแม่นยำ เพื่อประสบการณ์ที่ดีที่สุดสำหรับลูกค้าและช่างซ่อม
                        </p>

                        {/* Pill tags */}
                        <div className="flex gap-3">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white text-sm font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                อะไหล่แท้
                            </span>
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white text-sm font-medium">
                                <span className="w-2 h-2 rounded-full bg-blue-400" />
                                ซ่อมด่วนรอรับได้
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>SuperArt Mobile Repair System v2.0</span>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-slate-300 transition-colors">เงื่อนไขการใช้บริการ</a>
                            <a href="#" className="hover:text-slate-300 transition-colors">นโยบายความเป็นส่วนตัว</a>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── RIGHT PANEL ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col bg-white relative">
                {/* Dark mode toggle */}
                <div className="absolute top-6 right-6">
                    <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                        <Moon size={18} />
                    </button>
                </div>

                {/* Form center */}
                <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-16 py-12">
                    <div className="w-full max-w-sm">
                        {/* Logo */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 rounded-full bg-slate-900 flex flex-col items-center justify-center mb-4 shadow-lg">
                                <Wrench size={16} className="text-white mb-0.5" />
                                <span className="text-white text-[8px] font-bold tracking-widest leading-tight text-center">SUPER<br />ART</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-1">เข้าสู่ระบบ</h1>
                            <p className="text-sm text-slate-500 text-center">ยินดีต้อนรับกลับสู่ระบบจัดการร้านซ่อม</p>
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
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">อีเมล</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        placeholder="name@company.com"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผ่าน</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
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

                            {/* Remember + Forgot */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.remember}
                                        onChange={e => setForm({ ...form, remember: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className="text-sm text-slate-600">จดจำการเข้าสู่ระบบ</span>
                                </label>
                                <a href="#" className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">
                                    ลืมรหัสผ่าน?
                                </a>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        กำลังเข้าสู่ระบบ...
                                    </span>
                                ) : 'เข้าสู่ระบบ'}
                            </button>

                            {/* Divider */}
                            <div className="relative flex items-center gap-3 my-1">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs text-slate-400 font-medium">หรือ</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            {/* Track order button */}
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => navigate('/repair-request')}
                                    className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Wrench size={16} className="text-slate-500" />
                                    แจ้งซ่อมออนไลน์
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/track')}
                                    className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <ClipboardList size={16} className="text-slate-500" />
                                    ตรวจสอบสถานะ
                                </button>
                            </div>
                        </form>

                        {/* Footer */}
                        <p className="text-center text-xs text-slate-400 mt-8">
                            © 2025 SuperArt Mobile Repair. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
