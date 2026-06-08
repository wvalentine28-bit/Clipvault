const { google } = require('googleapis');
const fs = require('fs');

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly'
];

function makeOAuthClient() {
  return new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/auth/callback'
  );
}

function getAuthUrl() {
  const client = makeOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

async function getTokens(code) {
  const client = makeOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

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
    description: item.snippet.description?.slice(0, 200) || '',
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || null,
    duration: item.contentDetails?.duration || 'PT0S',
    viewCount: item.statistics?.viewCount || '0',
    likeCount: item.statistics?.likeCount || '0',
    publishedAt: item.snippet.publishedAt,
    url: `https://www.youtube.com/watch?v=${item.id}`
  }));
}

async function uploadToYouTube({ clipPath, title, description, tags, privacyStatus = 'public', tokens }) {
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    throw new Error('OAuth credentials not configured. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env');
  }

  const client = makeOAuthClient();
  client.setCredentials(tokens);

  const youtube = google.youtube({ version: 'v3', auth: client });

  const fileSize = fs.statSync(clipPath).size;
  const shortsTitle = title.includes('#Shorts') ? title : `${title} #Shorts`;

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: shortsTitle.slice(0, 100),
        description: `${description || ''}\n\n#Shorts #YouTubeShorts`,
        tags: [...(tags || []), 'Shorts', 'YouTubeShorts'],
        categoryId: '22'
      },
      status: { privacyStatus }
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(clipPath)
    }
  }, {
    onUploadProgress: evt => {
      const pct = Math.round((evt.bytesRead / fileSize) * 100);
      process.stdout.write(`\r  Upload progress: ${pct}%`);
    }
  });

  console.log('');
  return { videoId: response.data.id };
}

async function getChannelInfo(tokens) {
  const client = makeOAuthClient();
  client.setCredentials(tokens);

  const youtube = google.youtube({ version: 'v3', auth: client });
  const response = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true
  });

  const items = response.data.items;
  if (!items || items.length === 0) throw new Error('No channel found for this account.');

  const ch = items[0];
  return {
    id: ch.id,
    title: ch.snippet.title,
    handle: ch.snippet.customUrl || '',
    thumbnail: ch.snippet.thumbnails?.default?.url || null,
    subscriberCount: ch.statistics?.subscriberCount || '0'
  };
}

module.exports = { getAuthUrl, getTokens, getTrendingVideos, uploadToYouTube, getChannelInfo };
