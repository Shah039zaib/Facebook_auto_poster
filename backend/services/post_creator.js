const { getDB } = require('../database/db');
const { generatePost, generateImagePrompt } = require('./groq_service');
const { generateImage, cleanupTempImage } = require('./image_service');
const { createPost } = require('./facebook_service');

// Main function to create and post
async function createAndPost(topicId = null, customContent = null) {
  const db = getDB();
  let postRecord = null;

  try {
    let topic;

    if (topicId) {
      topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);
    } else {
      // Pick random active topic based on priority
      const topics = db.prepare('SELECT * FROM topics WHERE is_active = 1 ORDER BY priority ASC').all();
      if (!topics.length) throw new Error('Koi active topic nahi hai!');
      // Weighted random selection
      topic = topics[Math.floor(Math.random() * topics.length)];
    }

    if (!topic) throw new Error('Topic nahi mila!');

    // Create post record
    const insertPost = db.prepare(`
      INSERT INTO posts (topic_id, topic_name, content, status, created_at)
      VALUES (?, ?, ?, 'processing', CURRENT_TIMESTAMP)
    `);
    const result = insertPost.run(topic.id, topic.name, customContent || '');
    postRecord = { id: result.lastInsertRowid };

    // Step 1: Generate content
    console.log(`📝 Generating post for topic: ${topic.name}`);
    const content = customContent || await generatePost(topic.name, topic.prompt_hint, topic.emoji);

    // Update content in DB
    db.prepare('UPDATE posts SET content = ? WHERE id = ?').run(content, postRecord.id);

    // Step 2: Generate image prompt
    console.log(`🖼️ Generating image for: ${topic.name}`);
    const imagePrompt = await generateImagePrompt(topic.name, content);

    // Step 3: Generate image
    const { filePath, imageUrl } = await generateImage(imagePrompt, topic.name);

    // Update image info
    db.prepare('UPDATE posts SET image_url = ?, image_prompt = ? WHERE id = ?')
      .run(imageUrl, imagePrompt, postRecord.id);

    // Step 4: Post to Facebook
    console.log(`📘 Posting to Facebook...`);
    const fbResult = await createPost(content, filePath);

    // Step 5: Update success in DB
    db.prepare(`
      UPDATE posts SET
        fb_post_id = ?,
        status = 'posted',
        posted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(fbResult.postId, postRecord.id);

    // Update topic post count
    db.prepare('UPDATE topics SET post_count = post_count + 1 WHERE id = ?').run(topic.id);

    // Cleanup temp image
    await cleanupTempImage(filePath);

    console.log(`✅ Post complete! FB Post ID: ${fbResult.postId}`);

    return {
      success: true,
      postId: postRecord.id,
      fbPostId: fbResult.postId,
      content,
      imageUrl,
      topicName: topic.name,
    };

  } catch (error) {
    console.error('❌ Post failed:', error.message);

    // Update failure in DB
    if (postRecord?.id) {
      db.prepare('UPDATE posts SET status = ?, error_msg = ? WHERE id = ?')
        .run('failed', error.message, postRecord.id);
    }

    return { success: false, error: error.message };
  }
}

module.exports = { createAndPost };
