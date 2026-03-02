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

export default function AdminSidebar() {
    return (
        <aside
            className="w-60 min-h-screen flex flex-col flex-shrink-0"
            style={{ backgroundColor: '#0f1623', borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
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
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg my-0.5 text-sm font-medium transition-all relative ${isActive
                                ? 'text-white'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`
                        }
                        style={({ isActive }) =>
                            isActive
                                ? {
                                    backgroundColor: 'rgba(59,130,246,0.12)',
                                    borderLeft: '3px solid #3b82f6',
                                    paddingLeft: '9px',
                                }
                                : { borderLeft: '3px solid transparent' }
                        }
                    >
                        <Icon size={17} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
