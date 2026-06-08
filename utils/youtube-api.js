const { google } = require('googleapis');

async function getTrendingVideos({ regionCode = 'US', categoryId = '0', maxResults = 20 } = {}) {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY not configured. Add it to your .env file.');
  }

  const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });

  const params = {
    part: ['snippet', 'contentDetails', 'statistics'],
    chart: 'mostPopular',
    regionCode,
    maxResults,
    hl: 'en'
  };
  if (categoryId && categoryId !== '0') {
    params.videoCategoryId = categoryId;
  }

  const response = await youtube.videos.list(params);

  return (response.data.items || []).map(item => ({
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || null,
    duration: item.contentDetails?.duration || 'PT0S',
    viewCount: item.statistics?.viewCount || '0',
    url: `https://www.youtube.com/watch?v=${item.id}`
  }));
}

module.exports = { getTrendingVideos };
