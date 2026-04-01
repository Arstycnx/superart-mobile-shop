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

// Legacy webhook registration (no longer needed with polling — kept for UI compatibility)
router.post('/telegram/webhook', auth, registerTelegramWebhookUrl);

// Restart Telegram polling (e.g. after saving a new bot token)
router.post('/telegram/restart-polling', auth, async (req, res) => {
    try {
        const poller = require('../services/telegramPoller');
        await poller.restart();
        res.json({ success: true, message: 'Telegram Polling รีสตาร์ทสำเร็จ' });
    } catch (err) {
        console.error('[notifications] restart-polling error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
