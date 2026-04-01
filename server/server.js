const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/repairs', require('./routes/repairs'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
// NOTE: Telegram webhook route kept for compatibility but polling replaces webhook functionality
app.use('/api/telegram', require('./routes/telegramWebhook'));

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'SuperArt Repair API is running.' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start Telegram polling (works on LAN / non-public servers)
    const telegramPoller = require('./services/telegramPoller');
    telegramPoller.start().catch(err =>
        console.error('[server] Telegram Poller failed to start:', err.message)
    );
});