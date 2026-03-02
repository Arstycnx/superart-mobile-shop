import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const pageTitles = {
    '/admin': 'ภาพรวมระบบ',
    '/admin/inventory': 'จัดการสินค้า/อะไหล่',
    '/admin/orders': 'รายการแจ้งซ่อม',
    '/admin/customers': 'ข้อมูลลูกค้า',
    '/admin/payments': 'การชำระเงิน',
    '/admin/reports': 'รายงาน',
    '/admin/settings/notifications': 'ตั้งค่า',
};

export default function AdminTopbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const title = pageTitles[location.pathname] || 'SuperArt';
    const [dropOpen, setDropOpen] = useState(false);
    const dropRef = useRef(null);

    // Read user info from localStorage (saved at login)
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('user')) || {}; }
        catch { return {}; }
    })();
    const displayName = user.full_name || 'Admin';
    const displayRole = user.role === 'admin' ? 'ผู้ดูแลระบบ' : user.role === 'technician' ? 'ช่างซ่อม' : 'พนักงาน';
    const avatarSeed = user.email || 'superart';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/', { replace: true });
    };

    return (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-30">
            {/* Page title */}
            <h2 className="text-base font-bold text-slate-800 flex-1">{title}</h2>

            {/* Right section */}
            <div className="flex items-center gap-4">
                {/* Bell */}
                <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <Bell size={18} className="text-slate-500" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                </button>

                {/* Admin dropdown */}
                <div className="relative" ref={dropRef}>
                    <button
                        onClick={() => setDropOpen((v) => !v)}
                        className="flex items-center gap-2.5 cursor-pointer group px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                            <img
                                src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${avatarSeed}`}
                                alt="avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                        <div className="hidden sm:block leading-tight text-left">
                            <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                            <p className="text-xs text-slate-500">{displayRole}</p>
                        </div>
                        <ChevronDown
                            size={14}
                            className={`text-slate-400 group-hover:text-slate-600 transition-transform ${dropOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Dropdown menu */}
                    {dropOpen && (
                        <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                            <button
                                onClick={() => { setDropOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <User size={15} className="text-slate-400" />
                                โปรไฟล์
                            </button>
                            <div className="my-1 h-px bg-slate-100" />
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut size={15} className="text-red-500" />
                                ออกจากระบบ
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
