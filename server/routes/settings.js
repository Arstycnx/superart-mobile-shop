const express = require('express');
const router = express.Router();
const { getReceiptSettings, updateReceiptSettings } = require('../controllers/settingController');
const auth = require('../middleware/auth');

router.get('/receipt', auth, getReceiptSettings);
router.put('/receipt', auth, updateReceiptSettings);

module.exports = router;
