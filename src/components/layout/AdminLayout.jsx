import { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

export default function AdminLayout() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/', { replace: true });
            return;
        }
        fetch(`${API_URL}/api/auth/me`, {
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
            });
    }, [navigate]);

    return (
        <div className="flex min-h-screen bg-bg-light overflow-hidden">
            <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0">
                <AdminTopbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-4 sm:p-6 animate-fadeIn overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
