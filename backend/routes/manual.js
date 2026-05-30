const express = require('express');
const router = express.Router();
const { createAndPost } = require('../services/post_creator');
const { generatePost, generateImagePrompt } = require('../services/groq_service');
const { generateImage } = require('../services/image_service');
const { getDB } = require('../database/db');

// Preview post (generate without posting)
router.post('/preview', async (req, res) => {
  try {
    const { topic_id } = req.body;
    const db = getDB();

    let topic;
    if (topic_id) {
      topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topic_id);
    } else {
      topic = db.prepare('SELECT * FROM topics WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1').get();
    }
    if (!topic) return res.status(404).json({ success: false, error: 'Topic nahi mila' });

    const content = await generatePost(topic.name, topic.prompt_hint, topic.emoji);
    const imagePrompt = await generateImagePrompt(topic.name, content);
    const seed = Math.floor(Math.random() * 99999);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt + ', vibrant, social media')}?width=1080&height=1080&seed=${seed}&nologo=true`;

    res.json({
      success: true,
      content,
      imageUrl,
      imagePrompt,
      topicName: topic.name,
      topicEmoji: topic.emoji,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Post now (manual trigger)
router.post('/post-now', async (req, res) => {
  try {
    const { topic_id, custom_content } = req.body;
    const result = await createAndPost(topic_id || null, custom_content || null);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
