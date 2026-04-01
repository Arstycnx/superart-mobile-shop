import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, User, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const pageTitles = {
    '/admin': 'Dashboard',
    '/admin/inventory': 'จัดการสินค้า/อะไหล่',
    '/admin/orders': 'รายการแจ้งซ่อม',
    '/admin/customers': 'ข้อมูลลูกค้า',
    '/admin/payments': 'การชำระเงิน',
    '/admin/reports': 'รายงาน',
    '/admin/settings/notifications': 'ตั้งค่า',
};

export default function AdminTopbar({ onMenuClick }) {
    const location = useLocation();
    const navigate = useNavigate();
    const title = pageTitles[location.pathname] || 'SuperArt';
    const [dropOpen, setDropOpen] = useState(false);
    const dropRef = useRef(null);
    const [notiOpen, setNotiOpen] = useState(false);
    const notiRef = useRef(null);

    const [mockNotifications, setMockNotifications] = useState([
        { id: 1, title: 'แจ้งเตือนระบบ', msg: 'ระบบเชื่อมต่อ Telegram Bot สำเร็จพร้อมใช้งานแล้ว', time: '10 นาทีที่แล้ว', unread: true },
        { id: 2, title: 'รายการซ่อมใหม่ SA-2026-0001', msg: 'ลูกค้าคุณ Anocha ส่งซ่อม Apple 15 Pro max สทนาอาการ: หน้าจอแตก', time: '1 ชั่วโมงที่แล้ว', unread: true },
        { id: 3, title: 'เปลี่ยนสถานะสำเร็จ', msg: 'ทำการปรับสถานะใบงาน SA-2025-0099 เป็น "ซ่อมเสร็จเรียบร้อย"', time: 'เมื่อวาน 14:30 น.', unread: false },
    ]);

    // Read user info from localStorage (saved at login)
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('user')) || {}; }
        catch { return {}; }
    })();
    const displayName = user.full_name || 'Admin';
    const displayRole = user.role === 'admin' ? 'ผู้ดูแลระบบ' : user.role === 'technician' ? 'ช่างซ่อม' : 'พนักงาน';
    const avatarSeed = user.email || 'superart';

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
            if (notiRef.current && !notiRef.current.contains(e.target)) setNotiOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/', { replace: true });
    };

    return (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-3 lg:gap-4 sticky top-0 z-20">
            <button
                onClick={onMenuClick}
                className="p-1.5 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            >
                <Menu size={20} />
            </button>

            {/* Page title */}
            <h2 className="text-base font-bold text-slate-800 flex-1 truncate uppercase tracking-wide">{title}</h2>

            {/* Right section */}
            <div className="flex items-center gap-4">
                {/* Bell */}
                <div className="relative" ref={notiRef}>
                    <button
                        onClick={() => setNotiOpen(v => !v)}
                        className={`relative p-2 rounded-lg transition-colors ${notiOpen ? 'bg-slate-100' : 'hover:bg-slate-100'}`}>
                        <Bell size={18} className="text-slate-500" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                    </button>
                    {/* Notification Dropdown */}
                    {notiOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 overflow-hidden transform origin-top-right transition-all">
                            <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                                <h3 className="text-sm font-bold text-slate-800">การแจ้งเตือน</h3>
                                {mockNotifications.length > 0 && (
                                    <button
                                        onClick={() => setMockNotifications([])}
                                        className="text-[10px] text-blue-600 font-medium hover:text-blue-700">
                                        ล้างทั้งหมด
                                    </button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                {mockNotifications.length === 0 ? (
                                    <div className="px-4 py-8 text-center bg-slate-50/30">
                                        <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-sm text-slate-500 font-medium">ไม่มีการแจ้งเตือนใหม่</p>
                                    </div>
                                ) : (
                                    mockNotifications.map((noti) => (
                                        <div key={noti.id} className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group ${!noti.unread ? 'opacity-60' : ''}`}>
                                            <div className="flex justify-between items-start mb-0.5">
                                                <p className="text-sm text-slate-800 font-bold group-hover:text-blue-600 transition-colors">{noti.title}</p>
                                                {noti.unread && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1"></span>}
                                            </div>
                                            <p className="text-xs text-slate-600 leading-snug">{noti.msg}</p>
                                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{noti.time}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
                                <button className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors">ดูการแจ้งเตือนทั้งหมด</button>
                            </div>
                        </div>
                    )}
                </div>

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
