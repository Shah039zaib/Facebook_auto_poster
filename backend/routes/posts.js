const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// GET posts history
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let query = 'SELECT * FROM posts';
    let params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const posts = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as cnt FROM posts' + (status ? ' WHERE status = ?' : '')).get(...(status ? [status] : []));

    res.json({ success: true, posts, total: total.cnt, page, limit });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE post
router.delete('/:id', (req, res) => {
  try {
    const db = getDB();
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Post delete ho gaya!' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
