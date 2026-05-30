const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// GET all topics
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const topics = db.prepare('SELECT * FROM topics ORDER BY priority ASC, id ASC').all();
    res.json({ success: true, topics });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET single topic
router.get('/:id', (req, res) => {
  try {
    const db = getDB();
    const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!topic) return res.status(404).json({ success: false, error: 'Topic nahi mila' });
    res.json({ success: true, topic });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST create topic
router.post('/', (req, res) => {
  try {
    const { name, prompt_hint, emoji, is_active, priority } = req.body;
    if (!name || !prompt_hint) {
      return res.status(400).json({ success: false, error: 'Name aur prompt_hint zaruri hai' });
    }
    const db = getDB();
    const result = db.prepare(`
      INSERT INTO topics (name, prompt_hint, emoji, is_active, priority)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, prompt_hint, emoji || '✨', is_active ?? 1, priority || 5);

    const newTopic = db.prepare('SELECT * FROM topics WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, topic: newTopic, message: 'Topic ban gaya!' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT update topic
router.put('/:id', (req, res) => {
  try {
    const { name, prompt_hint, emoji, is_active, priority } = req.body;
    const db = getDB();
    const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Topic nahi mila' });

    db.prepare(`
      UPDATE topics SET
        name = ?, prompt_hint = ?, emoji = ?,
        is_active = ?, priority = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name ?? existing.name,
      prompt_hint ?? existing.prompt_hint,
      emoji ?? existing.emoji,
      is_active ?? existing.is_active,
      priority ?? existing.priority,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    res.json({ success: true, topic: updated, message: 'Topic update ho gaya!' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH toggle active status
router.patch('/:id/toggle', (req, res) => {
  try {
    const db = getDB();
    const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!topic) return res.status(404).json({ success: false, error: 'Topic nahi mila' });

    const newStatus = topic.is_active ? 0 : 1;
    db.prepare('UPDATE topics SET is_active = ? WHERE id = ?').run(newStatus, req.params.id);

    res.json({
      success: true,
      is_active: newStatus,
      message: newStatus ? 'Topic active ho gaya!' : 'Topic band ho gaya!'
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE topic
router.delete('/:id', (req, res) => {
  try {
    const db = getDB();
    const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!topic) return res.status(404).json({ success: false, error: 'Topic nahi mila' });

    db.prepare('DELETE FROM topics WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Topic delete ho gaya!' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
