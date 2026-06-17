import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URL from '../../api/config';
import { Save, RefreshCw } from 'lucide-react';

const API = `${API_URL}/api/settings/receipt`;
const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export default function ReceiptSettings() {
    const [form, setForm] = useState({
        shop_name: '', address: '', tax_id: '',
        phone: '', logo_url: '', footer_text: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(API, { headers: getAuthHeader() });
            const data = await res.json();
            if (data.success && data.data) {
                setForm(data.data);
            }
        } catch { /* noop */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const handleField = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const res = await fetch(API, {
                method: 'PUT',
                headers: getAuthHeader(),
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                setMessage('บันทึกการตั้งค่าแล้ว');
                setTimeout(() => setMessage(''), 3000);
            } else {
                alert(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-slate-500">กำลังโหลด...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-800">ตั้งค่าใบเสร็จรับเงิน</h1>
                <button onClick={fetchSettings} className="btn-secondary"><RefreshCw size={16} /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-3 space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                        {message && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm">{message}</div>}
                        
                        <div className="grid grid-cols-2 gap-5">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อร้านค้า (Shop Name)</label>
                                <input name="shop_name" value={form.shop_name || ''} onChange={handleField} className="input-field" placeholder="ตัวอย่าง: SuperArt Mobile Shop" />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสประจำตัวผู้เสียภาษี (Tax ID)</label>
                                <input name="tax_id" value={form.tax_id || ''} onChange={handleField} className="input-field" placeholder="ไม่ได้ระบุ" />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">เบอร์โทรศัพท์ร้าน</label>
                                <input name="phone" value={form.phone || ''} onChange={handleField} className="input-field" placeholder="08x-xxx-xxxx" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">ที่อยู่ร้าน (Address)</label>
                                <textarea name="address" value={form.address || ''} onChange={handleField} className="input-field" rows="2" placeholder="ที่อยู่แสดงในใบเสร็จ..." />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">ข้อความส่วนท้ายใบเสร็จ (Footer Text)</label>
                                <textarea name="footer_text" value={form.footer_text || ''} onChange={handleField} className="input-field" rows="2" placeholder="ขอบคุณที่ใช้บริการ / การรับประกัน..." />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                                <Save size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="lg:col-span-2">
                    <div className="sticky top-6">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Live Preview (ตัวอย่างใบงาน/ใบเสร็จ)</h2>
                        <div className="bg-[#1e2333] p-4 lg:p-6 rounded-xl shadow-lg mx-auto w-full max-w-md font-sans border border-slate-700">
                            {/* Paper mockup */}
                            <div className="bg-white rounded text-slate-800 pointer-events-none select-none shadow-inner h-full flex flex-col">
                                <div className="p-4 sm:p-5 flex-1">
                                    {/* Header Row */}
                                    <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-3">
                                        <div className="text-left space-y-0.5 flex-1 pr-2">
                                            <h3 className="font-bold text-xl text-blue-600 truncate">{form.shop_name || 'SuperArt'}</h3>
                                            <p className="font-medium text-[10px] text-slate-500">Mobile Repair Shop</p>
                                            <p className="text-[9px] text-slate-400 whitespace-pre-wrap mt-1 leading-tight">{form.address || 'ที่อยู่ร้านค้า...'}</p>
                                            <p className="text-[9px] text-slate-400 mt-1">โทร: {form.phone || '08x-xxx-xxxx'}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <h4 className="font-bold text-[13px] text-slate-800 tracking-wide mb-1">ใบเสร็จรับเงิน / ใบงาน</h4>
                                            <p className="text-[9px] text-slate-500"><span className="font-semibold text-blue-600">No:</span> SA-2025-0001</p>
                                            <p className="text-[9px] text-slate-500">วันที่: 2/4/2569</p>
                                        </div>
                                    </div>

                                    {/* Customer & Device Row */}
                                    <div className="grid grid-cols-2 gap-3 mb-4 text-[10px] border-b border-slate-200 pb-3">
                                        <div>
                                            <p className="text-[9px] font-semibold text-slate-400 mb-0.5">ข้อมูลลูกค้า</p>
                                            <p className="font-bold text-slate-700">สมชาย ใจดี</p>
                                            <p className="text-slate-500">โทร: 0812345678</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold text-slate-400 mb-0.5">ข้อมูลอุปกรณ์</p>
                                            <p className="font-bold text-slate-700">Apple iPhone 13</p>
                                            <p className="text-[8px] text-slate-400 mt-0.5">ประเภท: smartphone</p>
                                            <p className="text-[8px] text-slate-400">อาการเสีย: จอแตก แสดงผลไม่ขึ้น</p>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 border-b-2 border-slate-700 pb-1.5 mb-1.5">
                                            <div className="w-6">ลำดับ</div>
                                            <div className="flex-1">รายการ</div>
                                            <div className="w-10 text-center">จำนวน</div>
                                            <div className="w-12 text-right">ราคา</div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-[10px] py-1 text-slate-700">
                                            <div className="w-6">1</div>
                                            <div className="flex-1">จอ iPhone 13</div>
                                            <div className="w-10 text-center">1</div>
                                            <div className="w-12 text-right">฿0</div>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] py-1 text-slate-700">
                                            <div className="w-6">2</div>
                                            <div className="flex-1">ค่าบริการซ่อม</div>
                                            <div className="w-10 text-center">1</div>
                                            <div className="w-12 text-right">฿200</div>
                                        </div>
                                    </div>

                                    {/* Total Box */}
                                    <div className="flex justify-end mb-4">
                                        <div className="bg-slate-50 p-2.5 rounded-lg w-40 space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                                                <span>รวมเป็นเงิน</span>
                                                <span>฿200</span>
                                            </div>
                                            <div className="flex justify-between items-center font-bold">
                                                <span className="text-[11px] text-slate-700">ยอดชำระสุทธิ</span>
                                                <span className="text-blue-600 text-base">฿200</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment & Sign */}
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <p className="text-[8px] font-semibold text-slate-400 mb-1.5">สถานะการทำรายการ</p>
                                            <div className="px-2 py-0.5 rounded-full border border-emerald-300 text-emerald-500 text-[8px] font-bold tracking-widest inline-flex items-center gap-1 uppercase bg-emerald-50">
                                                <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                                                PAID IN FULL
                                            </div>
                                        </div>
                                        <div className="text-center w-24">
                                            <div className="border-b border-slate-300 mb-1 h-3"></div>
                                            <p className="text-[8px] text-slate-400">ช่างผู้รับผิดชอบ</p>
                                        </div>
                                    </div>
                                    
                                    {/* Footer */}
                                    <div className="mt-auto pt-3 pb-1 text-center">
                                        <p className="text-[7.5px] text-slate-400 whitespace-pre-wrap leading-relaxed">{form.footer_text || 'เอกสารนี้เป็นบันทึกสำหรับใช้เป็นหลักฐานการรับ-ส่งอุปกรณ์ กรุณาเก็บไว้เป็นหลักฐานจนกว่าจะได้รับอุปกรณ์คืนครบถ้วน'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
