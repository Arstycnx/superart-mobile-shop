const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Raw body capture for LINE webhook signature verification ─────────────────
// Must be registered BEFORE express.json() so we can read the raw bytes.
app.use('/api/line/webhook', (req, _res, next) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
        req.rawBody = data;
        try { req.body = JSON.parse(data); } catch (_) { req.body = {}; }
        next();
    });
});

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/repairs', require('./routes/repairs'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/line', require('./routes/lineWebhook'));   // LINE webhook & events

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'SuperArt Repair API is running.' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
