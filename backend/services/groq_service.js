const Groq = require('groq-sdk');
const { getDB } = require('../database/db');

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set!');
  return new Groq({ apiKey });
}

function getSettings() {
  const db = getDB();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {});
}

async function generatePost(topicName, promptHint, topicEmoji) {
  const groq = getGroqClient();
  const settings = getSettings();

  const useHashtags = settings.auto_hashtags === 'true';
  const useEmoji = settings.auto_emoji === 'true';
  const model = settings.groq_model || 'llama3-8b-8192';

  const lengthGuide = {
    short: '2-3 lines (50-80 words)',
    medium: '4-5 lines (80-120 words)',
    long: '6-8 lines (120-180 words)',
  }[settings.post_length || 'medium'];

  const systemPrompt = `
Tu ek social media expert hai jo Facebook ke liye Roman Urdu mein engaging posts likhta hai.
Roman Urdu ka matlab hai: Urdu ko English alphabets mein likhna. Jaise: "Zindagi ek safar hai", "Dil ki baat suno", "Khush raho hamesha".
Sirf Roman Urdu use karo - na pure English, na pure Urdu (Arabic script).
Post ${lengthGuide} ka hona chahiye.
${useEmoji ? 'Post mein relevant emojis zaroor add karo.' : ''}
${useHashtags ? 'Post ke end mein 5-7 relevant Roman Urdu ya English hashtags add karo.' : ''}
Post engaging, inspiring aur shareworthy honi chahiye.
Sirf post text return karo - koi explanation ya extra text nahi.
`;

  const userPrompt = `
Topic: ${topicName} ${topicEmoji}
Prompt hint: ${promptHint}

Is topic par ek unique, engaging Facebook post likho Roman Urdu mein.
`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: model,
    temperature: 0.9,
    max_tokens: 500,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('Groq ne empty response diya');

  return content;
}

async function generateImagePrompt(topicName, postContent) {
  const groq = getGroqClient();

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You generate short English image generation prompts for social media posts. Return only the image prompt, nothing else. Maximum 20 words.',
      },
      {
        role: 'user',
        content: `Create an image prompt for a Facebook post about "${topicName}". Post content: "${postContent.substring(0, 100)}"`,
      },
    ],
    model: 'llama3-8b-8192',
    temperature: 0.7,
    max_tokens: 60,
  });

  return completion.choices[0]?.message?.content?.trim() || `beautiful ${topicName} social media post`;
}

module.exports = { generatePost, generateImagePrompt };
