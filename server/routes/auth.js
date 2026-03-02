const express = require('express');
const router = express.Router();
const { login, register, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register);
router.get('/me', auth, getMe);

module.exports = router;
