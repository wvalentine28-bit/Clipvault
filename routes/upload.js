const express = require('express');
const router = express.Router();
const path = require('path');
const { uploadToYouTube } = require('../utils/youtube-api');

router.post('/', async (req, res) => {
  if (!req.session?.tokens) {
    return res.status(401).json({ error: 'Not authenticated. Connect your YouTube channel first.' });
  }

  const { clipPath, title, description, tags, privacyStatus = 'public' } = req.body;

  if (!clipPath) {
    return res.status(400).json({ error: 'clipPath is required.' });
  }

  // Safety: ensure path stays within uploads/clips
  const resolved = path.resolve(clipPath);
  const clipsDir = path.resolve('uploads/clips');
  if (!resolved.startsWith(clipsDir)) {
    return res.status(400).json({ error: 'Invalid clip path.' });
  }

  try {
    const result = await uploadToYouTube({
      clipPath: resolved,
      title: title || 'ClipVault Short',
      description: description || '',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',') : []),
      privacyStatus,
      tokens: req.session.tokens
    });

    res.json({
      success: true,
      videoId: result.videoId,
      url: `https://www.youtube.com/watch?v=${result.videoId}`
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
