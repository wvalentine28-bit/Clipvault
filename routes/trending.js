const express = require('express');
const router = express.Router();
const { getTrendingVideos } = require('../utils/youtube-api');

router.get('/', async (req, res) => {
  try {
    const { regionCode = 'US', categoryId = '0', maxResults = '20' } = req.query;
    const videos = await getTrendingVideos({
      regionCode,
      categoryId,
      maxResults: Math.min(parseInt(maxResults) || 20, 50)
    });
    res.json({ videos });
  } catch (err) {
    console.error('Trending error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
