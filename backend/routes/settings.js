// settings.js route
const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { verifyCredentials } = require('../services/facebook_service');

router.get('/', (req, res) => {
  try {
    const db = getDB();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {});
    // Add env vars (masked)
    settings.fb_token_set = !!process.env.FB_PAGE_ACCESS_TOKEN;
    settings.groq_key_set = !!process.env.GROQ_API_KEY;
    settings.fb_page_id = process.env.FB_PAGE_ID || '';
    res.json({ success: true, settings });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/', (req, res) => {
  try {
    const db = getDB();
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    Object.entries(req.body).forEach(([k, v]) => {
      if (!['fb_token_set', 'groq_key_set'].includes(k)) {
        upsert.run(k, String(v));
      }
    });
    res.json({ success: true, message: 'Settings save ho gayi!' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/verify-fb', async (req, res) => {
  try {
    const result = await verifyCredentials();
    res.json(result);
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
