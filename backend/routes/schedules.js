const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { reloadSchedules } = require('../scheduler');

// GET all schedules
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const schedules = db.prepare('SELECT * FROM schedules ORDER BY time ASC').all();
    res.json({ success: true, schedules });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST create schedule
router.post('/', (req, res) => {
  try {
    const { time, days, label, is_active } = req.body;
    if (!time) return res.status(400).json({ success: false, error: 'Time zaruri hai' });

    const db = getDB();
    const result = db.prepare(`
      INSERT INTO schedules (time, days, label, is_active)
      VALUES (?, ?, ?, ?)
    `).run(time, days || '1,2,3,4,5,6,7', label || 'New Schedule', is_active ?? 1);

    reloadSchedules();
    const newSchedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, schedule: newSchedule, message: 'Schedule ban gaya!' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT update schedule
router.put('/:id', (req, res) => {
  try {
    const { time, days, label, is_active } = req.body;
    const db = getDB();
    const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Schedule nahi mila' });

    db.prepare(`
      UPDATE schedules SET time = ?, days = ?, label = ?, is_active = ? WHERE id = ?
    `).run(
      time ?? existing.time,
      days ?? existing.days,
      label ?? existing.label,
      is_active ?? existing.is_active,
      req.params.id
    );

    reloadSchedules();
    const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
    res.json({ success: true, schedule: updated, message: 'Schedule update ho gaya!' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH toggle
router.patch('/:id/toggle', (req, res) => {
  try {
    const db = getDB();
    const sch = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
    if (!sch) return res.status(404).json({ success: false, error: 'Schedule nahi mila' });

    const newStatus = sch.is_active ? 0 : 1;
    db.prepare('UPDATE schedules SET is_active = ? WHERE id = ?').run(newStatus, req.params.id);
    reloadSchedules();
    res.json({ success: true, is_active: newStatus });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE schedule
router.delete('/:id', (req, res) => {
  try {
    const db = getDB();
    db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
    reloadSchedules();
    res.json({ success: true, message: 'Schedule delete ho gaya!' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
