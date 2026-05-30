require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDB } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize DB on startup
getDB();

// =====================
// API Routes
// =====================
app.use('/api/topics', require('./routes/topics'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/manual', require('./routes/manual'));
app.use('/api/stats', require('./routes/stats'));

// =====================
// Auth Middleware (Simple)
// =====================
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  if (password === adminPass) {
    res.json({ success: true, token: Buffer.from(adminPass).toString('base64') });
  } else {
    res.status(401).json({ success: false, message: 'Wrong password!' });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Scheduler
const { startScheduler } = require('./scheduler');
startScheduler();

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 FB AI Poster running on port ${PORT}`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
});

module.exports = app;
