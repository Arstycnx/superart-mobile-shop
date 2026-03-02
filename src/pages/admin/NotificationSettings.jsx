import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Save, RotateCcw, Edit3, MessageSquare, Send, CheckCircle, RefreshCw, X } from 'lucide-react';

/* ─── API ──────────────────────────────── */
const API = 'http://localhost:5000/api/notifications';
const getHdr = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

/* ─── Toggle Switch ──────────────────── */
function Toggle({ on, onChange, disabled }) {
    return (
        <button onClick={() => !disabled && onChange(!on)} disabled={disabled}
            className="relative w-11 h-6 rounded-full transition-all flex-shrink-0 disabled:opacity-40"
            style={{ backgroundColor: on ? '#22c55e' : '#374151', boxShadow: on ? '0 0 12px rgba(34,197,94,0.4)' : 'none' }}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
        </button>
    );
}

/* ─── Line Icon ─────────────────────── */
function LineIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.631-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
    );
}

/* ─── Toast ─────────────────────────── */
function Toast({ msg, type, onHide }) {
    useEffect(() => { const t = setTimeout(onHide, 3000); return () => clearTimeout(t); }, [onHide]);
    const colors = { success: '#22c55e', error: '#f87171', info: '#60a5fa' };
    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#1a2a1a', border: `1px solid ${colors[type] || colors.info}`, minWidth: 260 }}>
            <span style={{ color: colors[type] || colors.info }}>
                {type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}
            </span>
            {msg}
            <button onClick={onHide} className="ml-auto opacity-60 hover:opacity-100"><X size={13} /></button>
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

    const inp = 'w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none transition-all focus:ring-2 focus:ring-green-500/30';
    const inpStyle = { backgroundColor: '#0a120a', border: '1px solid #1e3a1e' };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
                style={{ backgroundColor: '#111c11', border: '1px solid #1e4a1e' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1e3a1e' }}>
                    <h3 className="text-sm font-bold text-white">แก้ไขเทมเพลต</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">ชื่อเทมเพลต</label>
                        <input value={name} onChange={e => setName(e.target.value)} className={inp} style={inpStyle} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">ข้อความ</label>
                        <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
                            className={inp + ' resize-none'} style={inpStyle} />
                        <p className="text-[11px] text-slate-600 mt-1">ตัวแปร: {'{' + 'ชื่อ'}{'}'}, {'{' + 'model'}{'}'}, {'{' + 'tracking_id'}{'}'}, {'{' + 'est_time'}{'}'}, {'{' + 'cost'}{'}'}</p>
                    </div>
                </div>
                <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: '#1e3a1e', backgroundColor: '#0a120a' }}>
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-slate-700 hover:bg-white/5 transition-colors">ยกเลิก</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
                        style={{ backgroundColor: '#16a34a' }}>
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
    const [settings, setSettings] = useState({ sms: null, line: null });
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
        // Optimistic
        setTemplates(ts => ts.map(t => t.id === id ? { ...t, is_active: newVal ? 1 : 0 } : t));
        try {
            const tpl = templates.find(t => t.id === id);
            await fetch(`${API}/templates/${id}`, {
                method: 'PUT', headers: getHdr(),
                body: JSON.stringify({ name: tpl.name, message_text: tpl.message_text, is_active: newVal }),
            });
        } catch {
            // Revert on failure
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
            await Promise.all(['sms', 'line'].map(ch => {
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
    const handleTest = async (channel) => {
        setTestLoading(true);
        try {
            const msg = `[TEST] ทดสอบการส่งข้อความผ่าน ${channel.toUpperCase()} — SuperArt`;
            const res = await fetch(`${API}/test`, {
                method: 'POST', headers: getHdr(),
                body: JSON.stringify({ channel, message: msg }),
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

    /* ── Shared styles ── */
    const inp = 'w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none transition-all focus:ring-2 focus:ring-green-500/30 font-mono';
    const inpStyle = { backgroundColor: '#0f2010', border: '1px solid #1a3a1a' };
    const cardStyle = { backgroundColor: '#111c11', border: '1px solid #1e3a1e' };

    const sms = settings.sms || {};
    const line = settings.line || {};

    return (
        <div className="min-h-full -m-6 p-6" style={{ backgroundColor: '#0a1a0a' }}>

            {toast && <Toast msg={toast.msg} type={toast.type} onHide={() => setToast(null)} />}
            {editTpl && <EditModal template={editTpl} onClose={() => setEditTpl(null)} onSave={saveTemplate} />}

            {/* ── Page header ── */}
            <div className="flex items-center justify-between mb-7">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">ตั้งค่าการแจ้งเตือน</h1>
                    <p className="text-sm text-slate-400">Manage notification channels and automated messages</p>
                </div>
                <button onClick={fetchAll} className="p-2 rounded-xl hover:bg-white/5 transition-colors" title="รีเฟรช">
                    <RefreshCw size={16} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ backgroundColor: '#111c11' }} />)}
                </div>
            ) : (
                <>
                    {/* ══ SECTION 1: Channels ══════════════════════════════════════ */}
                    <div className="mb-8">
                        <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4">
                            ช่องทางการแจ้งเตือน (Notification Channels)
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                            {/* ─── SMS Card ─── */}
                            <div className="rounded-2xl p-5" style={cardStyle}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ backgroundColor: '#0f2a10', border: '1px solid #22c55e33' }}>
                                            <MessageSquare size={18} className="text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">SMS Gateway</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Send automated SMS updates to customers via API.</p>
                                        </div>
                                    </div>
                                    <Toggle on={!!sms.is_enabled} onChange={() => toggleChannel('sms')} />
                                </div>

                                <div className={`space-y-3 overflow-hidden transition-all duration-300 ${sms.is_enabled ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block tracking-wide uppercase">API KEY</label>
                                        <div className="relative">
                                            <input type={showKey ? 'text' : 'password'}
                                                value={sms.api_key || ''}
                                                onChange={e => upd('sms', 'api_key', e.target.value)}
                                                className={inp} style={inpStyle} />
                                            <button onClick={() => setShowKey(!showKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                                                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block tracking-wide uppercase">Sender Name</label>
                                        <input type="text" value={sms.sender_name || ''}
                                            onChange={e => upd('sms', 'sender_name', e.target.value)}
                                            className={inp} style={inpStyle} />
                                    </div>
                                    <button onClick={() => handleTest('sms')} disabled={testLoading}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-green-400 border border-green-500/40 hover:bg-green-500/10 disabled:opacity-50">
                                        {testLoading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                                        ทดสอบส่ง SMS
                                    </button>
                                </div>
                            </div>

                            {/* ─── Line Notify Card ─── */}
                            <div className="rounded-2xl p-5" style={cardStyle}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ backgroundColor: '#0a2a15', border: '1px solid #22c55e33' }}>
                                            <span className="text-green-400"><LineIcon size={20} /></span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Line Notify</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Receive real-time notifications via Line app.</p>
                                        </div>
                                    </div>
                                    <Toggle on={!!line.is_enabled} onChange={() => toggleChannel('line')} />
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 mb-1.5 block tracking-wide uppercase">LINE Access Token</label>
                                        <input type="text" value={line.access_token || ''}
                                            onChange={e => upd('line', 'access_token', e.target.value)}
                                            placeholder="Enter your Line Notify Token"
                                            className={inp + ' placeholder-slate-600'} style={inpStyle} />
                                    </div>
                                    <button onClick={() => handleTest('line')} disabled={testLoading}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-green-400 border border-green-500/40 hover:bg-green-500/10 disabled:opacity-50">
                                        {testLoading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                                        ทดสอบส่ง Line
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ══ SECTION 2: Templates ═════════════════════════════════════ */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest">
                                เทมเพลตข้อความ (Message Templates)
                            </h2>
                            <span className="text-xs text-slate-500">{templates.filter(t => t.is_active).length}/{templates.length} Active</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {templates.map(t => (
                                <div key={t.id} className="rounded-2xl p-5 flex flex-col gap-3 transition-all"
                                    style={{
                                        backgroundColor: '#111c11',
                                        border: `1px solid ${t.is_active ? '#22c55e40' : '#1e3a1e'}`,
                                        boxShadow: t.is_active ? '0 0 0 1px rgba(34,197,94,0.08)' : 'none',
                                    }}>
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-bold text-white leading-snug">{t.name}</p>
                                        <button onClick={() => setEditTpl(t)}
                                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
                                            <Edit3 size={14} className="text-slate-500" />
                                        </button>
                                    </div>

                                    {/* Preview */}
                                    <div className="flex-1 p-3 rounded-xl"
                                        style={{ backgroundColor: '#0a120a', border: '1px solid #1a2e1a' }}>
                                        <p className="text-xs text-slate-400 leading-relaxed">{t.message_text}</p>
                                    </div>

                                    {/* Toggle */}
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-xs font-medium" style={{ color: t.is_active ? '#22c55e' : '#64748b' }}>
                                            {t.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <Toggle on={!!t.is_active} onChange={() => toggleTemplate(t.id, !!t.is_active)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: '#1e3a1e' }}>
                        <button onClick={fetchAll}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
                            <RotateCcw size={14} />รีเฟรชข้อมูล
                        </button>

                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-60"
                            style={{ backgroundColor: '#16a34a' }}>
                            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
