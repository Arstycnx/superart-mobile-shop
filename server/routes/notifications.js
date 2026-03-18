const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getSettings, updateSettings,
    getTemplates, updateTemplate,
    testSend, registerTelegramWebhookUrl
} = require('../controllers/notificationController');

router.get('/settings', getSettings);
router.put('/settings/:channel', auth, updateSettings);

router.get('/templates', getTemplates);
router.put('/templates/:id', auth, updateTemplate);

router.post('/test', auth, testSend);

router.post('/telegram/webhook', auth, registerTelegramWebhookUrl);

module.exports = router;
