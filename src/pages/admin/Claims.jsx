import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { Search, Plus, X, Pencil, Trash2, RefreshCw } from 'lucide-react';

const API = `${API_URL}/api/claims`;
const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const STATUS_META = {
    pending: { label: 'รอดำเนินการ', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
    processing: { label: 'กำลังตรวจสอบ', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700' },
    completed: { label: 'สำเร็จ', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    rejected: { label: 'ปฏิเสธ', color: '#ef4444', bg: 'bg-red-50', text: 'text-red-700' },
};

function ClaimFormModal({ editing, onClose, onSaved, customers }) {
    const isEdit = Boolean(editing);
    const [form, setForm] = useState(
        isEdit
            ? { status: editing.status || 'pending', resolution_notes: editing.resolution_notes || '' }
            : { customer_id: '', device_brand: '', device_model: '', claim_reason: '', repair_order_id: '' }
    );
    const [saving, setSaving] = useState(false);

    const handleField = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = isEdit ? `${API}/${editing.id}` : API;
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: getAuthHeader(), body: JSON.stringify(form) });
            const data = await res.json();
            if (data.success) { onSaved(); onClose(); }
            else alert(data.message);
        } catch {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">{isEdit ? 'อัปเดตสถานะเคลม' : 'เพิ่มรายการเคลม'}</h3>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        {!isEdit && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">เลือกลูกค้า *</label>
                                    <select name="customer_id" value={form.customer_id} onChange={handleField} className="input-field">
                                        <option value="">-- เลือกลูกค้า --</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">ยี่ห้อ</label>
                                        <input name="device_brand" value={form.device_brand} onChange={handleField} className="input-field" placeholder="เช่น Apple" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">รุ่น</label>
                                        <input name="device_model" value={form.device_model} onChange={handleField} className="input-field" placeholder="เช่น iPhone 13" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">สาเหตุการเคลม *</label>
                                    <textarea name="claim_reason" value={form.claim_reason} onChange={handleField} className="input-field" rows="3" placeholder="ระบุอาการหรือสาเหตุ..." />
                                </div>
                            </>
                        )}
                        {isEdit && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">สถานะ</label>
                                    <select name="status" value={form.status} onChange={handleField} className="input-field">
                                        {Object.entries(STATUS_META).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">บันทึกการแก้ไข/ปฏิเสธ</label>
                                    <textarea name="resolution_notes" value={form.resolution_notes} onChange={handleField} className="input-field" rows="3" placeholder="ระบุรายละเอียด..." />
                                </div>
                            </>
                        )}
                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={onClose} className="btn-secondary">ยกเลิก</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary">
                                {saving ? 'รอ...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function Claims() {
    const [claims, setClaims] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formModal, setFormModal] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [cRes, custRes] = await Promise.all([
                fetch(API, { headers: getAuthHeader() }),
                fetch(`${API_URL}/api/customers?limit=1000`, { headers: getAuthHeader() }), // simplified fetching customers for dropdown
            ]);
            const cData = await cRes.json();
            const custData = await custRes.json();
            setClaims(cData.data || []);
            setCustomers(custData.data || []);
        } catch { /* noop */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleDelete = async (id) => {
        if (!window.confirm('ลบรายการเคลมนี้?')) return;
        setLoading(true);
        await fetch(`${API}/${id}`, { method: 'DELETE', headers: getAuthHeader() });
        fetchAll();
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-800">จัดการเคลมสินค้า</h1>
                <div className="flex gap-2">
                    <button onClick={fetchAll} className="btn-secondary"><RefreshCw size={16} /></button>
                    <button onClick={() => setFormModal('add')} className="btn-primary flex items-center gap-2">
                        <Plus size={16} /> สร้างรายการเคลม
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-5 py-3 text-xs text-slate-500 uppercase tracking-wider">รหัสเคลม</th>
                            <th className="px-5 py-3 text-xs text-slate-500 uppercase tracking-wider">ลูกค้า</th>
                            <th className="px-5 py-3 text-xs text-slate-500 uppercase tracking-wider">สินค้า/อาการ</th>
                            <th className="px-5 py-3 text-xs text-slate-500 uppercase tracking-wider">ผลตรวจสอบ</th>
                            <th className="px-5 py-3 text-xs text-slate-500 uppercase tracking-wider">สถานะ</th>
                            <th className="px-5 py-3 text-xs text-slate-500 uppercase tracking-wider">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && <tr><td colSpan={6} className="text-center py-10">กำลังโหลด...</td></tr>}
                        {!loading && claims.map(c => {
                            const st = STATUS_META[c.status] || STATUS_META.pending;
                            return (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="px-5 py-4 font-mono text-sm text-blue-600">{c.claim_code}</td>
                                    <td className="px-5 py-4 text-sm font-medium">{c.customer_name}<br/><span className="text-xs text-slate-400">{c.customer_phone}</span></td>
                                    <td className="px-5 py-4 text-sm">{c.device_brand} {c.device_model}<br/><span className="text-xs text-slate-500">{c.claim_reason}</span></td>
                                    <td className="px-5 py-4 text-sm text-slate-500">{c.resolution_notes || '-'}</td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => setFormModal(c)} className="p-1.5 text-slate-400 hover:text-blue-600"><Pencil size={15}/></button>
                                            <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={15}/></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {formModal && <ClaimFormModal editing={formModal === 'add' ? null : formModal} onClose={() => setFormModal(null)} onSaved={fetchAll} customers={customers} />}
        </div>
    );
}
