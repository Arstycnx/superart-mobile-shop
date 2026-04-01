const express = require('express');
const router = express.Router();
const { login, register, getMe, changePassword, resetPasswordByEmail } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register);
router.get('/me', auth, getMe);
router.post('/change-password', auth, changePassword);   // เปลี่ยนรหัส (login แล้ว)
router.post('/reset-password', resetPasswordByEmail);    // ลืมรหัส / public

module.exports = router;
