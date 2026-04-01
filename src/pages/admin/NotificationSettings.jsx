import axios from 'axios';
import API_URL from '../../api/config';
import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Save, RotateCcw, Edit3, MessageSquare, Send, CheckCircle, RefreshCw, X } from 'lucide-react';

/* ─── API ──────────────────────────────── */
const API = `${API_URL}/api/notifications`;
const getHdr = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

/* ─── Toggle Switch ──────────────────── */
function Toggle({ on, onChange, disabled }) {
    return (
        <button onClick={() => !disabled && onChange(!on)} disabled={disabled}
            className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 disabled:opacity-40 ${on ? 'bg-green-500' : 'bg-slate-300'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
        </button>
    );
}

/* ─── Telegram Icon ──────────────────── */
function TelegramIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
    );
}

/* ─── Toast ─────────────────────────── */
function Toast({ msg, type, onHide }) {
    useEffect(() => { const t = setTimeout(onHide, 3000); return () => clearTimeout(t); }, [onHide]);
    const bgColors = { success: 'bg-green-50', error: 'bg-red-50', info: 'bg-blue-50' };
    const textColors = { success: 'text-green-700', error: 'text-red-700', info: 'text-blue-700' };
    const borders = { success: 'border-green-200', error: 'border-red-200', info: 'border-blue-200' };

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold border min-w-[260px] ${bgColors[type] || bgColors.info} ${textColors[type] || textColors.info} ${borders[type] || borders.info}`}>
            <span>
                {type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}
            </span>
            {msg}
            <button onClick={onHide} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
    );
}

/* ─── Edit Template Modal ────────────── */
function EditModal({ template, onClose, onSave }) {
    const [name, setName] = useState(template.name);
    const [text, setText] = useState(template.message_text);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(template.id, { name, message_text: text, is_active: template.is_active });
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800">แก้ไขเทมเพลต</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={16} className="text-slate-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-600 mb-1.5 block tracking-wide">ชื่อเทมเพลต</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="input-field" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-600 mb-1.5 block tracking-wide">ข้อความ</label>
                        <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
                            className="input-field resize-none" />
                        <p className="text-[11px] text-slate-500 mt-1.5">ตัวแปร: {'{' + 'ชื่อ'}{'}'}, {'{' + 'model'}{'}'}, {'{' + 'tracking_id'}{'}'}, {'{' + 'est_time'}{'}'}, {'{' + 'cost'}{'}'}</p>
                    </div>
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                    <button onClick={onClose} className="flex-1 btn-secondary">ยกเลิก</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary justify-center">
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════ */
/*  MAIN PAGE                            */
/* ══════════════════════════════════════ */
export default function NotificationSettings() {
    /* ── State ── */
    const [settings, setSettings] = useState({ sms: null, telegram: null });
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [showKey, setShowKey] = useState(false);
    const [editTpl, setEditTpl] = useState(null);   // template being edited

    /* ── Fetch ── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [sRes, tRes] = await Promise.all([
                fetch(`${API}/settings`, { headers: getHdr() }),
                fetch(`${API}/templates`, { headers: getHdr() }),
            ]);
            const [sJson, tJson] = await Promise.all([sRes.json(), tRes.json()]);

            if (sJson.success) {
                const map = {};
                for (const row of sJson.data) map[row.channel] = row;
                setSettings(map);
            }
            if (tJson.success) setTemplates(tJson.data);
        } catch (err) {
            console.error('[NotificationSettings] fetch error', err);
            showToast('ไม่สามารถโหลดข้อมูลได้', 'error');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /* ── Toast ── */
    const showToast = (msg, type = 'success') => setToast({ msg, type });

    /* ── Toggle channel ── */
    const toggleChannel = (channel) => {
        setSettings(prev => ({
            ...prev,
            [channel]: { ...prev[channel], is_enabled: !prev[channel]?.is_enabled },
        }));
    };

    /* ── Toggle template active ── */
    const toggleTemplate = async (id, currentVal) => {
        const newVal = !currentVal;
        setTemplates(ts => ts.map(t => t.id === id ? { ...t, is_active: newVal ? 1 : 0 } : t));
        try {
            const tpl = templates.find(t => t.id === id);
            await fetch(`${API}/templates/${id}`, {
                method: 'PUT', headers: getHdr(),
                body: JSON.stringify({ name: tpl.name, message_text: tpl.message_text, is_active: newVal }),
            });
        } catch {
            setTemplates(ts => ts.map(t => t.id === id ? { ...t, is_active: currentVal ? 1 : 0 } : t));
            showToast('อัปเดตเทมเพลตล้มเหลว', 'error');
        }
    };

    /* ── Save template from modal ── */
    const saveTemplate = async (id, body) => {
        const res = await fetch(`${API}/templates/${id}`, {
            method: 'PUT', headers: getHdr(), body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
            setTemplates(ts => ts.map(t => t.id === id ? data.data : t));
            showToast('บันทึกเทมเพลตสำเร็จ');
        } else {
            showToast(data.message || 'เกิดข้อผิดพลาด', 'error');
        }
    };

    /* ── Save all channel settings ── */
    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all(['telegram'].map(ch => {
                const s = settings[ch];
                if (!s) return Promise.resolve();
                return fetch(`${API}/settings/${ch}`, {
                    method: 'PUT', headers: getHdr(),
                    body: JSON.stringify({
                        is_enabled: s.is_enabled ? 1 : 0,
                        api_key: s.api_key,
                        sender_name: s.sender_name,
                        access_token: s.access_token,
                    }),
                });
            }));
            showToast('บันทึกการตั้งค่าสำเร็จ');
        } catch {
            showToast('บันทึกล้มเหลว', 'error');
        }
        setSaving(false);
    };

    /* ── Test send ── */
    const handleTest = async (channel, testChatId) => {
        setTestLoading(true);
        try {
            const msg = `[TEST] ทดสอบการส่งข้อความผ่าน ${channel.toUpperCase()} — SuperArt`;
            const payload = { channel, message: msg };
            if (channel === 'telegram' && testChatId) payload.chat_id = testChatId;

            const res = await fetch(`${API}/test`, {
                method: 'POST', headers: getHdr(),
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            showToast(data.message || 'ส่งทดสอบสำเร็จ', data.success ? 'success' : 'error');
        } catch {
            showToast('ไม่สามารถส่งทดสอบได้', 'error');
        }
        setTestLoading(false);
    };

    /* ── Inline setting updater ── */
    const upd = (channel, key, val) =>
        setSettings(prev => ({ ...prev, [channel]: { ...prev[channel], [key]: val } }));

    const telegram = settings.telegram || {};

    return (
        <div className="space-y-6">

            {toast && <Toast msg={toast.msg} type={toast.type} onHide={() => setToast(null)} />}
            {editTpl && <EditModal template={editTpl} onClose={() => setEditTpl(null)} onSave={saveTemplate} />}

            {/* ── Page header ── */}
            <div className="flex items-center justify-between mb-2 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 mb-1">ตั้งค่าการแจ้งเตือน (Notifications)</h1>
                    <p className="text-sm text-slate-500">จัดการช่องทางการแจ้งเตือน และ ข้อความอัตโนมัติถึงลูกค้า</p>
                </div>
                <button onClick={fetchAll} className="btn-secondary" title="รีเฟรช">
                    <RefreshCw size={15} className={`${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />)}
                </div>
            ) : (
                <>
                    {/* ══ SECTION 1: Channels ══════════════════════════════════════ */}
                    <div className="mb-6">
                        <div className="grid grid-cols-1 gap-4">
                            {/* ─── Telegram Card ─── */}
                            <div className={`rounded-xl p-6 border transition-all ${telegram.is_enabled ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
                                <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500 border border-blue-100">
                                            <TelegramIcon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Telegram Bot</p>
                                            <p className="text-xs text-slate-500 mt-0.5">รับข้อความแจ้งเตือนผ่านแอพ Telegram ทันที</p>
                                        </div>
                                    </div>
                                    <Toggle on={!!telegram.is_enabled} onChange={() => toggleChannel('telegram')} />
                                </div>

                                <div className={`space-y-4 transition-all ${!telegram.is_enabled ? 'pointer-events-none opacity-50 grayscale' : ''}`}>
                                    <div className="max-w-xl">
                                        <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wide">Telegram Bot Token</label>
                                        <input type="text" value={telegram.access_token || ''}
                                            onChange={e => upd('telegram', 'access_token', e.target.value)}
                                            placeholder="Enter your Telegram Bot Token (from @BotFather)"
                                            className="input-field max-w-lg font-mono text-sm" />
                                    </div>
                                    <div className="pt-2 max-w-xl">
                                        <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wide">โดเมนเนมของระบบ (สำหรับ Webhook)</label>
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1 relative">
                                                <input type="text" id="webhookDomain"
                                                    placeholder="https://your-domain.com"
                                                    className="input-field pl-10 text-sm font-mono" />
                                                <span className="absolute left-3.5 top-[9px] text-slate-400"></span>
                                            </div>
                                            <button onClick={async () => {
                                                const url = document.getElementById('webhookDomain').value;
                                                if (!url) return showToast('กรุณาระบุโดเมนเนม', 'error');
                                                const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
                                                const fullUrl = `${cleanUrl}/api/telegram/webhook`;
                                                try {
                                                    const res = await fetch(`${API}/telegram/webhook`, {
                                                        method: 'POST',
                                                        headers: getHdr(),
                                                        body: JSON.stringify({ url: fullUrl })
                                                    });
                                                    const data = await res.json();
                                                    showToast(data.message || 'ลงทะเบียน Webhook สำเร็จ', data.success ? 'success' : 'error');
                                                } catch (err) {
                                                    showToast('ไม่สามารถลงทะเบียน Webhook ได้', 'error');
                                                }
                                            }}
                                                className="btn-secondary text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50 whitespace-nowrap">
                                                ผูก Webhook
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-2">
                                            *ต้องขึ้นต้นด้วย <code>https://</code> เท่านั้น ระบบจะผูก URL เป็น <code>{'{โดเมน}/api/telegram/webhook'}</code> อัตโนมัติ<br />(หมายเหตุ: **กดบันทึกการตั้งค่าก่อนผูก Webhook หากเพิ่งใส่ Token**)
                                        </p>
                                    </div>
                                    <div className="max-w-xl flex gap-3 items-end mt-4 pt-5 border-t border-slate-100">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wide">ส่งทดสอบไปยัง Chat ID</label>
                                            <input type="text" placeholder="123456789" id="testChatId"
                                                className="input-field text-sm font-mono" />
                                        </div>
                                        <button onClick={() => {
                                            const cid = document.getElementById('testChatId').value;
                                            if (!cid) return showToast('กรุณาระบุ Chat ID ก่อนทดสอบ', 'error');
                                            handleTest('telegram', cid);
                                        }} disabled={testLoading}
                                            className="btn-secondary text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 whitespace-nowrap">
                                            {testLoading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                                            ส่งข้อความทดสอบ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-200">
                        <span className="text-xs text-slate-500">
                            *กรุณากดบันทึกทุกครั้งที่มีการเปลี่ยนแปลงข้อมูล
                        </span>
                        <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
                            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
