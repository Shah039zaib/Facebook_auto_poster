const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const FB_API_BASE = 'https://graph.facebook.com/v19.0';

function getCredentials() {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;
  if (!token || !pageId) {
    throw new Error('Facebook credentials not configured! Set FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID in settings.');
  }
  return { token, pageId };
}

// Post with image
async function postWithImage(content, imagePath) {
  const { token, pageId } = getCredentials();

  try {
    // Step 1: Upload photo
    const formData = new FormData();
    formData.append('source', fs.createReadStream(imagePath));
    formData.append('caption', content);
    formData.append('access_token', token);

    const response = await axios.post(
      `${FB_API_BASE}/${pageId}/photos`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000,
      }
    );

    const postId = response.data.post_id || response.data.id;
    console.log(`✅ FB Post with image created: ${postId}`);
    return { success: true, postId, type: 'photo' };

  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error('❌ FB photo post failed:', errMsg);
    throw new Error(errMsg);
  }
}

// Post text only
async function postTextOnly(content) {
  const { token, pageId } = getCredentials();

  try {
    const response = await axios.post(
      `${FB_API_BASE}/${pageId}/feed`,
      {
        message: content,
        access_token: token,
      },
      { timeout: 30000 }
    );

    const postId = response.data.id;
    console.log(`✅ FB Text post created: ${postId}`);
    return { success: true, postId, type: 'text' };

  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error('❌ FB text post failed:', errMsg);
    throw new Error(errMsg);
  }
}

// Main post function - tries image first, falls back to text
async function createPost(content, imagePath = null) {
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      return await postWithImage(content, imagePath);
    } catch (imgError) {
      console.log('⚠️ Image post failed, trying text only...');
      return await postTextOnly(content);
    }
  }
  return await postTextOnly(content);
}

// Verify credentials
async function verifyCredentials() {
  try {
    const { token, pageId } = getCredentials();
    const response = await axios.get(
      `${FB_API_BASE}/${pageId}`,
      {
        params: { access_token: token, fields: 'name,id' },
        timeout: 10000,
      }
    );
    return { success: true, pageName: response.data.name, pageId: response.data.id };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    return { success: false, error: errMsg };
  }
}

module.exports = { createPost, verifyCredentials };
