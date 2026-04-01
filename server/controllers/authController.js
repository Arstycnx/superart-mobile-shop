const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ─── Helper ────────────────────────────────────────────────
const signToken = (user) =>
    jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

// ─── POST /api/auth/login ───────────────────────────────────
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const token = signToken(user);
        return res.json({
            success: true,
            token,
            user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, avatar_url: user.avatar_url },
        });
    } catch (err) {
        console.error('[login]', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/auth/register ────────────────────────────────
const register = async (req, res) => {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)',
            [email, hashed, full_name, role || 'staff']
        );

        const newUser = { id: result.insertId, email, full_name, role: role || 'staff' };
        const token = signToken(newUser);

        return res.status(201).json({ success: true, token, user: newUser });
    } catch (err) {
        console.error('[register]', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── GET /api/auth/me (protected) ──────────────────────────
const getMe = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, email, full_name, role, avatar_url, created_at FROM users WHERE id = ? LIMIT 1',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        }
        return res.json({ success: true, user: rows[0] });
    } catch (err) {
        console.error('[getMe]', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/auth/change-password (protected) ────────────────
// ผู้ที่ยังจำรหัสผ่านเก่าได้ (login แล้ว) ต้องการเปลี่ยนรหัสผ่าน
const changePassword = async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสผ่านเก่าและรหัสผ่านใหม่' });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        }
        const user = rows[0];
        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'รหัสผ่านเก่าไม่ถูกต้อง' });
        }
        const hashed = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
        return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (err) {
        console.error('[changePassword]', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

// ─── POST /api/auth/reset-password (public) ─────────────────────
// ผู้ที่ลืมรหัสผ่าน — ยืนยันตัวตนด้วย email แล้วตั้งรหัสผ่านใหม่
// (ในระบบนี้ไม่มี email OTP จึงใช้แค่ email verification เท่านั้น)
const resetPasswordByEmail = async (req, res) => {
    const { email, new_password } = req.body;

    if (!email || !new_password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่านใหม่' });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    try {
        const [rows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
        if (rows.length === 0) {
            // ตอบ success เพื่อป้องกัน email enumeration
            return res.json({ success: true, message: 'หากอีเมลนี้มีในระบบ จะทำการเปลี่ยนรหัสผ่านให้แล้ว' });
        }
        const hashed = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);
        return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
    } catch (err) {
        console.error('[resetPasswordByEmail]', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' });
    }
};

module.exports = { login, register, getMe, changePassword, resetPasswordByEmail };
