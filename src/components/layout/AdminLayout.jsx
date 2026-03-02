import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

export default function AdminLayout() {
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/', { replace: true });
            return;
        }
        // Verify token with backend
        fetch('http://localhost:5000/api/auth/me', {
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
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <AdminTopbar />
                <main className="flex-1 p-6 animate-fadeIn">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
