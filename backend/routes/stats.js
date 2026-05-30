const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

router.get('/', (req, res) => {
  try {
    const db = getDB();

    const totalPosts = db.prepare("SELECT COUNT(*) as cnt FROM posts").get().cnt;
    const postedToday = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE DATE(created_at) = DATE('now') AND status = 'posted'").get().cnt;
    const failedPosts = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status = 'failed'").get().cnt;
    const activeTopics = db.prepare("SELECT COUNT(*) as cnt FROM topics WHERE is_active = 1").get().cnt;
    const totalTopics = db.prepare("SELECT COUNT(*) as cnt FROM topics").get().cnt;
    const activeSchedules = db.prepare("SELECT COUNT(*) as cnt FROM schedules WHERE is_active = 1").get().cnt;
    const lastPost = db.prepare("SELECT * FROM posts WHERE status = 'posted' ORDER BY posted_at DESC LIMIT 1").get();
    const weeklyPosts = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE DATE(created_at) >= DATE('now', '-7 days') AND status = 'posted'").get().cnt;

    // Top topics
    const topTopics = db.prepare(`
      SELECT t.name, t.emoji, COUNT(p.id) as post_count
      FROM topics t
      LEFT JOIN posts p ON t.id = p.topic_id AND p.status = 'posted'
      GROUP BY t.id
      ORDER BY post_count DESC
      LIMIT 5
    `).all();

    // Daily posts last 7 days
    const dailyStats = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM posts
      WHERE DATE(created_at) >= DATE('now', '-7 days') AND status = 'posted'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    res.json({
      success: true,
      stats: {
        totalPosts,
        postedToday,
        failedPosts,
        activeTopics,
        totalTopics,
        activeSchedules,
        weeklyPosts,
        lastPost,
        topTopics,
        dailyStats,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
