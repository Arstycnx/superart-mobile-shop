const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getSettings, updateSettings,
    getTemplates, updateTemplate,
    testSend,
} = require('../controllers/notificationController');

router.get('/settings', getSettings);
router.put('/settings/:channel', auth, updateSettings);

router.get('/templates', getTemplates);
router.put('/templates/:id', auth, updateTemplate);

router.post('/test', auth, testSend);

module.exports = router;
