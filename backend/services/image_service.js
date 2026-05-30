const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function generateImage(imagePrompt, topicName) {
  try {
    // Pollinations.ai - completely free, no API key needed
    const enhancedPrompt = `${imagePrompt}, vibrant colors, social media post style, high quality, beautiful, professional photography`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);

    // Use a random seed for variety
    const seed = Math.floor(Math.random() * 99999);
    const width = 1080;
    const height = 1080;

    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

    // Download the image to a temp file
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 60000, // 60 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FBPoster/1.0)',
      },
    });

    // Save to temp file
    const tempDir = os.tmpdir();
    const fileName = `post_${Date.now()}_${seed}.jpg`;
    const filePath = path.join(tempDir, fileName);

    fs.writeFileSync(filePath, response.data);

    console.log(`✅ Image generated: ${fileName}`);
    return { filePath, imageUrl };

  } catch (error) {
    console.error('❌ Image generation failed:', error.message);
    // Return fallback - no image
    return { filePath: null, imageUrl: null };
  }
}

async function cleanupTempImage(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    // Silently fail cleanup
  }
}

module.exports = { generateImage, cleanupTempImage };
