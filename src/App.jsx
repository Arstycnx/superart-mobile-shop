import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/Inventory';
import RepairOrders from './pages/admin/RepairOrders';
import Customers from './pages/admin/Customers';
import Payments from './pages/admin/Payments';
import Reports from './pages/admin/Reports';
import Claims from './pages/admin/Claims';
import ReceiptSettings from './pages/admin/ReceiptSettings';
import NotificationSettings from './pages/admin/NotificationSettings';
import CustomerTracking from './pages/public/CustomerTracking';
import RepairRequest from './pages/public/RepairRequest';
import './index.css';

function App() {
    return (
        <Router basename="/">
            <Routes>
                {/* Auth */}
                <Route path="/" element={<LoginPage />} />

                {/* Admin routes - wrapped in AdminLayout */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="orders" element={<RepairOrders />} />
                    <Route path="claims" element={<Claims />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings/receipt" element={<ReceiptSettings />} />
                    <Route path="settings/notifications" element={<NotificationSettings />} />
                </Route>

                {/* Public routes */}
                <Route path="/track" element={<CustomerTracking />} />
                <Route path="/repair-request" element={<RepairRequest />} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
