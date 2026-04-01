import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, Wrench, Users, CreditCard,
    BarChart3, Settings, Smartphone,
} from 'lucide-react';

const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'แดชบอร์ด', end: true },
    { to: '/admin/inventory', icon: Package, label: 'จัดการสินค้า/อะไหล่' },
    { to: '/admin/orders', icon: Wrench, label: 'รายการแจ้งซ่อม' },
    { to: '/admin/customers', icon: Users, label: 'ข้อมูลลูกค้า' },
    { to: '/admin/payments', icon: CreditCard, label: 'การชำระเงิน' },
    { to: '/admin/reports', icon: BarChart3, label: 'รายงาน' },
    { to: '/admin/settings/notifications', icon: Settings, label: 'ตั้งค่า' },
];

export default function AdminSidebar({ isOpen, setIsOpen }) {
    return (
        <aside
            className={`w-60 min-h-screen flex flex-col flex-shrink-0 fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 bg-slate-900 border-r border-slate-800 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                    <Smartphone size={16} className="text-slate-900" />
                </div>
                <span className="text-white font-bold text-base tracking-wide">SuperArt</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2">
                {navItems.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        onClick={() => setIsOpen && setIsOpen(false)}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={17} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
