const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/data/posts.db'
  : path.join(__dirname, '../../posts.db');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeTables();
  }
  return db;
}

function initializeTables() {
  // Topics Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      prompt_hint TEXT NOT NULL,
      emoji TEXT DEFAULT '✨',
      is_active INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 5,
      post_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Posts History Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER,
      topic_name TEXT,
      content TEXT NOT NULL,
      image_url TEXT,
      image_prompt TEXT,
      fb_post_id TEXT,
      status TEXT DEFAULT 'pending',
      error_msg TEXT,
      scheduled_time TEXT,
      posted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    )
  `);

  // Schedule Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT NOT NULL,
      days TEXT DEFAULT '1,2,3,4,5,6,7',
      is_active INTEGER DEFAULT 1,
      label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default topics if empty
  const topicCount = db.prepare('SELECT COUNT(*) as cnt FROM topics').get();
  if (topicCount.cnt === 0) {
    const insertTopic = db.prepare(`
      INSERT INTO topics (name, prompt_hint, emoji, is_active, priority)
      VALUES (?, ?, ?, 1, ?)
    `);
    const defaultTopics = [
      ['Motivational', 'Zindagi mein kamyabi aur hausla dene wali baat', '💪', 1],
      ['Islamic', 'Islamic quotes, hadees ya qurani ayat ka mafhoom', '🌙', 2],
      ['Funny', 'Mazedaar aur funny Pakistani andaz mein joke ya baat', '😄', 3],
      ['Business Tips', 'Business, paise kamanay aur success ke tips', '💼', 4],
      ['Health Tips', 'Sehat, fitness aur healthy zindagi ke tips', '🍎', 5],
      ['Relationship', 'Dosti, pyaar aur rishton ke baare mein pyari baat', '❤️', 6],
      ['Tech Tips', 'Technology, mobile aur internet ke useful tips', '💻', 7],
    ];
    defaultTopics.forEach(t => insertTopic.run(...t));
  }

  // Insert default schedule if empty
  const scheduleCount = db.prepare('SELECT COUNT(*) as cnt FROM schedules').get();
  if (scheduleCount.cnt === 0) {
    db.prepare(`
      INSERT INTO schedules (time, days, is_active, label)
      VALUES (?, ?, 1, ?)
    `).run('09:00', '1,2,3,4,5,6,7', 'Subah ki Post');

    db.prepare(`
      INSERT INTO schedules (time, days, is_active, label)
      VALUES (?, ?, 1, ?)
    `).run('19:00', '1,2,3,4,5,6,7', 'Sham ki Post');
  }

  // Insert default settings
  const defaultSettings = [
    ['post_language', 'roman_urdu'],
    ['post_length', 'medium'],
    ['auto_hashtags', 'true'],
    ['auto_emoji', 'true'],
    ['groq_model', 'llama3-8b-8192'],
  ];
  const upsertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  defaultSettings.forEach(s => upsertSetting.run(...s));

  console.log('✅ Database initialized successfully');
}

module.exports = { getDB };
