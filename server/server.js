const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { startPolling } = require('./services/telegramPolling');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:55511',
    'http://localhost:55512',
    'http://10.80.231.125',
    'http://10.80.231.125:3011',
    'http://10.80.231.125:3012',
    'http://10.80.231.125:8011',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.some(function(o) { return origin.startsWith(o); })) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes — Nginx strips /api/ prefix before proxy_pass, so mount WITHOUT /api/
app.use('/auth', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/customers', require('./routes/customers'));
app.use('/repairs', require('./routes/repairs'));
app.use('/payments', require('./routes/payments'));
app.use('/reports', require('./routes/reports'));
app.use('/notifications', require('./routes/notifications'));
app.use('/telegram', require('./routes/telegramWebhook'));
app.use('/claims', require('./routes/claims'));
app.use('/settings', require('./routes/settings'));

// Health check (Nginx: /api/health → Express: /health)
app.get('/health', function(req, res) {
    res.json({ status: 'ok', message: 'SuperArt Repair API is running.' });
});

// Serve frontend static files (base: '/')
var distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA fallback - any unmatched route serves index.html
app.use(function(req, res) {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, function() {
    console.log('✅ SuperArt API + Frontend running on port ' + PORT);
    console.log('   Local:  http://localhost:' + PORT);
    console.log('   Server: http://10.80.231.125:8011  (via Nginx → :' + PORT + ')');
    startPolling();
});
