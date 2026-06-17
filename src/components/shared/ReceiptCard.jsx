import React, { forwardRef } from 'react';

const thb = (n) => Number(n || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 });

const ReceiptCard = forwardRef(({ order, settings }, ref) => {
    if (!order) return null;

    const parts = order.parts || [];
    const subtotal = parts.reduce((s, p) => s + Number(p.subtotal || 0), 0);
    const serviceCharge = Number(order.service_charge || 0);
    const total = subtotal + serviceCharge || Number(order.final_cost || order.estimated_cost || 0);
    const isPaid = order.is_paid > 0;

    // Default fallbacks
    const shopName = settings?.shop_name || 'SuperArt';
    const addressLines = (settings?.address || '39 ถนนชมดอย ตำบลสุเทพ\nอำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200').split('\n');
    const phone = settings?.phone || '+66 61 704 9154';
    const taxId = settings?.tax_id;
    const footerText = settings?.footer_text || 'เอกสารนี้เป็นบันทึกสำหรับใช้เป็นหลักฐานการรับ-ส่งอุปกรณ์ กรุณาเก็บไว้เป็นหลักฐานจนกว่าจะได้รับอุปกรณ์คืนครบถ้วน';

    return (
        <div ref={ref} className="bg-white text-slate-800 p-8 w-[600px] font-sans mx-auto" style={{ borderTop: '8px solid #3b82f6' }}>
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-blue-600 tracking-tight mb-1">{shopName}</h1>
                    <p className="text-sm text-slate-500 font-medium">Mobile Repair Shop</p>
                    {addressLines.map((line, idx) => (
                        <p key={idx} className={`text-xs text-slate-400 ${idx === 0 ? 'mt-2' : ''}`}>{line}</p>
                    ))}
                    {taxId && <p className="text-xs text-slate-400 mt-1">เลขประจำตัวผู้เสียภาษี: {taxId}</p>}
                    <p className="text-xs text-slate-400 mt-1">โทร: {phone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">ใบเสร็จรับเงิน / ใบงาน</h2>
                    <p className="text-sm font-semibold text-slate-600">No: <span className="text-blue-600 ml-1">{order.order_code}</span></p>
                    <p className="text-xs text-slate-500 mt-1">วันที่: {new Date().toLocaleDateString('th-TH')}</p>
                </div>
            </div>

            <hr className="border-slate-200 mb-6" />

            {/* Customer & Device Details */}
            <div className="flex justify-between mb-8">
                <div className="w-1/2 pr-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">ข้อมูลลูกค้า</p>
                    <p className="text-sm font-semibold text-slate-800">{order.customer_name}</p>
                    <p className="text-sm text-slate-600 mt-1">โทร: {order.customer_phone}</p>
                </div>
                <div className="w-1/2 pl-4 border-l border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">ข้อมูลอุปกรณ์</p>
                    <p className="text-sm font-semibold text-slate-800">{order.device_brand} {order.device_model}</p>
                    <p className="text-xs text-slate-500 mt-1">ประเภท: {order.device_type} {order.device_color ? `· สี: ${order.device_color}` : ''}</p>
                    <p className="text-xs text-slate-500 mt-1">อาการเสีย: {order.symptoms}</p>
                </div>
            </div>

            {/* Itemized List */}
            <div className="min-h-[200px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-800">
                            <th className="py-2 text-xs font-bold text-slate-600 w-12">ลำดับ</th>
                            <th className="py-2 text-xs font-bold text-slate-600">รายการ</th>
                            <th className="py-2 text-xs font-bold text-slate-600 text-center w-20">จำนวน</th>
                            <th className="py-2 text-xs font-bold text-slate-600 text-right w-24">ราคา</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {parts.map((p, i) => (
                            <tr key={i}>
                                <td className="py-3 text-sm text-slate-500 font-medium">{i + 1}</td>
                                <td className="py-3 text-sm text-slate-800 font-semibold">{p.product_name}</td>
                                <td className="py-3 text-sm text-slate-600 text-center">{p.quantity}</td>
                                <td className="py-3 text-sm text-slate-800 text-right font-medium">{thb(p.subtotal)}</td>
                            </tr>
                        ))}
                        {serviceCharge > 0 && (
                            <tr>
                                <td className="py-3 text-sm text-slate-500 font-medium">{parts.length + 1}</td>
                                <td className="py-3 text-sm text-slate-800 font-semibold">ค่าบริการซ่อม</td>
                                <td className="py-3 text-sm text-slate-600 text-center">1</td>
                                <td className="py-3 text-sm text-slate-800 text-right font-medium">{thb(serviceCharge)}</td>
                            </tr>
                        )}
                        {parts.length === 0 && serviceCharge === 0 && (
                            <tr>
                                <td className="py-3 text-sm text-slate-500 font-medium">1</td>
                                <td className="py-3 text-sm text-slate-800 font-semibold">ประเมินราคาซ่อม (เหมาจ่าย)</td>
                                <td className="py-3 text-sm text-slate-600 text-center">1</td>
                                <td className="py-3 text-sm text-slate-800 text-right font-medium">{thb(order.estimated_cost)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-6">
                <div className="w-1/2 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-500">รวมเป็นเงิน</span>
                        <span className="text-sm font-semibold text-slate-800">{thb(total)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                        <span className="text-base font-bold text-slate-800">ยอดชำระสุทธิ</span>
                        <span className="text-lg font-extrabold text-blue-600">{thb(total)}</span>
                    </div>
                </div>
            </div>

            {/* Status & Stamps */}
            <div className="mt-10 flex justify-between items-end">
                <div>
                    <p className="text-[10px] text-slate-400 mb-1">สถานะการทำรายการ</p>
                    {isPaid ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> PAID IN FULL
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 font-bold text-xs uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> UNPAID
                        </div>
                    )}
                </div>
                <div className="text-center">
                    <div className="w-32 h-px bg-slate-300 mx-auto mb-2"></div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">ช่างผู้รับผิดชอบ</p>
                </div>
            </div>

            <div className="mt-8 text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100 whitespace-pre-wrap">
                {footerText}
            </div>
        </div>
    );
});

export default ReceiptCard;
