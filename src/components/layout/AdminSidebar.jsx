import { NavLink, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import {
    LayoutDashboard, Package, Wrench, Users, CreditCard,
    BarChart3, Settings, Smartphone, Shield,
} from 'lucide-react';

const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'แดชบอร์ด', end: true },
    { to: '/admin/inventory', icon: Package, label: 'จัดการสินค้า/อะไหล่' },
    { to: '/admin/orders', icon: Wrench, label: 'รายการแจ้งซ่อม' },
    { to: '/admin/claims', icon: Shield, label: 'จัดการเคลม' },
    { to: '/admin/customers', icon: Users, label: 'ข้อมูลลูกค้า' },
    { to: '/admin/payments', icon: CreditCard, label: 'การชำระเงิน' },
    { to: '/admin/reports', icon: BarChart3, label: 'รายงาน' },
    { to: '/admin/settings/receipt', icon: Settings, label: 'ตั้งค่าเอกสาร' },
    { to: '/admin/settings/notifications', icon: Settings, label: 'ตั้งค่าการแจ้งเตือน' },
];

export default function AdminSidebar({ isOpen, onClose }) {
    return (
        <>
            {/* Mobile overlay backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 z-50 h-full w-64 flex flex-col flex-shrink-0
                    transition-transform duration-300 ease-in-out
                    lg:static lg:z-auto lg:translate-x-0 lg:w-60
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
                style={{ backgroundColor: '#0f1623', borderRight: '1px solid rgba(255,255,255,0.06)' }}
            >
                {/* Logo */}
                <div className="flex items-center justify-between px-5 py-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                            <Smartphone size={16} className="text-slate-900" />
                        </div>
                        <span className="text-white font-bold text-base tracking-wide">SuperArt</span>
                    </div>
                    {/* Close button on mobile */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-2 overflow-y-auto">
                    {navItems.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            onClick={onClose}
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
        </>
    );
}
