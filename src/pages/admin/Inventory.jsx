import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { Plus, Search, AlertTriangle, Edit2, Trash2, RefreshCw } from 'lucide-react';

const API = `${API_URL}/api/products`;
const formatCurrency = (n) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(n ?? 0);

const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const CATEGORIES = ['screen', 'battery', 'accessories', 'cable', 'case', 'other'];
const CATEGORY_TH = {
    screen: 'หน้าจอ', battery: 'แบตเตอรี่', accessories: 'อุปกรณ์เสริม',
    cable: 'สายชาร์จ', case: 'เคส', other: 'อื่นๆ',
};
const STATUS_MAP = {
    in_stock: 'active', low_stock: 'pending', out_of_stock: 'cancelled',
};

const emptyForm = {
    product_code: '', name: '', description: '', category: 'screen',
    cost_price: '', sell_price: '', quantity: '', low_stock_threshold: '5',
};

export default function Inventory() {
    const [products, setProducts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // ── Fetch products ──────────────────────────────────────
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: 100 });
            if (search) params.set('search', search);
            if (categoryFilter) params.set('category', categoryFilter);
            const res = await fetch(`${API}?${params}`);
            const data = await res.json();
            setProducts(data.data || []);
            setTotal(data.total || 0);
        } catch {
            setError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    }, [search, categoryFilter]);

    useEffect(() => {
        const timer = setTimeout(fetchProducts, 300);
        return () => clearTimeout(timer);
    }, [fetchProducts]);

    // ── Modal helpers ───────────────────────────────────────
    const openAdd = () => {
        setSelectedProduct(null);
        setForm(emptyForm);
        setError('');
        setModalOpen(true);
    };

    const openEdit = (p) => {
        setSelectedProduct(p);
        setForm({
            product_code: p.product_code || '',
            name: p.name,
            description: p.description || '',
            category: p.category,
            cost_price: p.cost_price,
            sell_price: p.sell_price,
            quantity: p.quantity,
            low_stock_threshold: p.low_stock_threshold,
        });
        setError('');
        setModalOpen(true);
    };

    const handleField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    // ── Save (Create / Update) ──────────────────────────────
    const handleSave = async () => {
        if (!form.name || !form.category) { setError('กรุณากรอกชื่อสินค้าและหมวดหมู่'); return; }
        setSaving(true);
        setError('');
        try {
            const method = selectedProduct ? 'PUT' : 'POST';
            const url = selectedProduct ? `${API}/${selectedProduct.id}` : API;
            const res = await fetch(url, {
                method,
                headers: getAuthHeader(),
                body: JSON.stringify({
                    ...form,
                    cost_price: parseFloat(form.cost_price) || 0,
                    sell_price: parseFloat(form.sell_price) || 0,
                    quantity: parseInt(form.quantity) || 0,
                    low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
                }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.message || 'เกิดข้อผิดพลาด'); return; }
            setModalOpen(false);
            fetchProducts();
        } catch {
            setError('ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──────────────────────────────────────────────
    const handleDelete = async (id) => {
        try {
            await fetch(`${API}/${id}`, { method: 'DELETE', headers: getAuthHeader() });
            setDeleteConfirm(null);
            fetchProducts();
        } catch {
            setError('ลบสินค้าไม่สำเร็จ');
        }
    };

    // ── Derived stats ───────────────────────────────────────
    const lowStockCount = products.filter((p) => p.status === 'low_stock' || p.status === 'out_of_stock').length;
    const stockValue = products.reduce((s, p) => s + (p.cost_price || 0) * (p.quantity || 0), 0);
    const categories = [...new Set(products.map((p) => p.category))].length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">คลังสินค้า</h1>
                    <p className="page-subtitle">จัดการอะไหล่และอุปกรณ์ทั้งหมด {total} รายการ</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchProducts} className="btn-secondary" title="รีเฟรช">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={openAdd} className="btn-primary">
                        <Plus size={16} />
                        เพิ่มสินค้า
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'สินค้าทั้งหมด', value: total, color: 'text-accent-blue' },
                    { label: 'ใกล้หมดสต็อก', value: lowStockCount, color: 'text-accent-orange' },
                    { label: 'มูลค่าสต็อก', value: formatCurrency(stockValue), color: 'text-accent-green' },
                    { label: 'หมวดหมู่', value: categories, color: 'text-purple-500' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <p className="text-xs text-text-secondary mb-1">{label}</p>
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Low stock warning */}
            {lowStockCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
                    <AlertTriangle size={16} />
                    มี {lowStockCount} รายการที่ถึงจุดสั่งซื้อขั้นต่ำหรือหมดสต็อก
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า, รหัส..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-9"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="input-field w-auto min-w-[130px]"
                    >
                        <option value="">ทุกหมวดหมู่</option>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{CATEGORY_TH[c]}</option>
                        ))}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>รหัสสินค้า</th>
                                <th>ชื่อสินค้า</th>
                                <th>หมวดหมู่</th>
                                <th>คงเหลือ</th>
                                <th>ขั้นต่ำ</th>
                                <th>ราคาทุน</th>
                                <th>ราคาขาย</th>
                                <th>สถานะ</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={9} className="text-center py-12 text-text-secondary">กำลังโหลด...</td></tr>
                            )}
                            {!loading && products.map((p) => (
                                <tr key={p.id}>
                                    <td className="font-mono text-xs text-accent-blue font-semibold">{p.product_code || '—'}</td>
                                    <td>
                                        <div>
                                            <p className="font-medium">{p.name}</p>
                                            {p.description && <p className="text-xs text-text-secondary truncate max-w-[180px]">{p.description}</p>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                            {CATEGORY_TH[p.category] || p.category}
                                        </span>
                                    </td>
                                    <td className={`font-semibold ${p.status !== 'in_stock' ? 'text-accent-orange' : 'text-accent-green'}`}>
                                        {p.quantity}
                                    </td>
                                    <td className="text-text-secondary">{p.low_stock_threshold}</td>
                                    <td>{formatCurrency(p.cost_price)}</td>
                                    <td>{p.sell_price > 0 ? formatCurrency(p.sell_price) : '—'}</td>
                                    <td><StatusBadge status={STATUS_MAP[p.status] || 'pending'} showDot /></td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-blue-50 rounded-lg text-accent-blue transition-colors">
                                                <Edit2 size={15} />
                                            </button>
                                            <button onClick={() => setDeleteConfirm(p)} className="p-1.5 hover:bg-red-50 rounded-lg text-accent-red transition-colors">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && products.length === 0 && (
                                <tr><td colSpan={9} className="text-center py-12 text-text-secondary">ไม่พบสินค้าที่ค้นหา</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={selectedProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
                size="lg"
            >
                <div className="space-y-4">
                    {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">รหัสสินค้า</label>
                            <input name="product_code" className="input-field" value={form.product_code}
                                onChange={handleField} placeholder="PRD-0001" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">หมวดหมู่ *</label>
                            <select name="category" className="input-field" value={form.category} onChange={handleField}>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_TH[c]}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">ชื่อสินค้า *</label>
                        <input name="name" className="input-field" value={form.name}
                            onChange={handleField} placeholder="ชื่อสินค้า" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">รายละเอียด</label>
                        <input name="description" className="input-field" value={form.description}
                            onChange={handleField} placeholder="รายละเอียดเพิ่มเติม" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">จำนวนสต็อก</label>
                            <input type="number" name="quantity" className="input-field"
                                value={form.quantity} onChange={handleField} min="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">ขั้นต่ำ</label>
                            <input type="number" name="low_stock_threshold" className="input-field"
                                value={form.low_stock_threshold} onChange={handleField} min="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">ราคาทุน (฿)</label>
                            <input type="number" name="cost_price" className="input-field"
                                value={form.cost_price} onChange={handleField} min="0" step="0.01" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">ราคาขาย (฿)</label>
                            <input type="number" name="sell_price" className="input-field"
                                value={form.sell_price} onChange={handleField} min="0" step="0.01" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setModalOpen(false)} className="btn-secondary">ยกเลิก</button>
                        <button onClick={handleSave} disabled={saving} className="btn-primary">
                            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm Modal */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="ยืนยันการลบ"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        ต้องการลบสินค้า <span className="font-semibold text-slate-900">"{deleteConfirm?.name}"</span> ใช่หรือไม่?
                        การดำเนินการนี้ไม่สามารถยกเลิกได้
                    </p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">ยกเลิก</button>
                        <button
                            onClick={() => handleDelete(deleteConfirm.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                            ลบสินค้า
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
