import { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

export default function AdminLayout() {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/', { replace: true });
            return;
        }
        // Verify token with backend
        fetch(`${API_URL}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/', { replace: true });
                }
            })
            .catch(() => {
                // Server unreachable — still allow access if token exists locally
                // (graceful degradation)
            });
    }, [navigate]);

    return (
        <div className="flex min-h-screen bg-bg-light">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            
            {/* Mobile backdrop */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="flex-1 flex flex-col min-w-0 w-full">
                <AdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-4 lg:p-6 animate-fadeIn overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
