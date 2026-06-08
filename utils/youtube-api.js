const https = require('https');
const { execFile } = require('child_process');

// ── HTTP helper (built-in only, no deps) ───────────────────────────────
function httpGet(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...extraHeaders
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpGet(res.headers.location, extraHeaders));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

// ── Formatters ─────────────────────────────────────────────────────────
function fmtSeconds(s) {
  s = Math.round(s || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}
function fmtViews(n) {
  n = parseInt(n) || 0;
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M views`;
  if (n >= 1e3) return `${Math.round(n/1000)}K views`;
  return `${n} views`;
}

// ── Layer 1: Invidious public API (no key required) ───────────────────
// Multiple instances for resilience — tries them in order until one works
const INVIDIOUS_INSTANCES = [
  'https://inv.tux.pizza',
  'https://invidious.flokinet.to',
  'https://yt.artemislena.eu',
  'https://invidious.privacydev.net',
  'https://invidious.nerdvpn.de',
];

async function fromInvidious(regionCode, maxResults) {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const url = `${base}/api/v1/trending?region=${encodeURIComponent(regionCode)}&type=default&hl=en`;
      const { status, body } = await httpGet(url);
      if (status !== 200) continue;

      const items = JSON.parse(body);
      if (!Array.isArray(items) || !items.length) continue;

      return items.slice(0, maxResults).map(v => ({
        id: v.videoId,
        title: v.title || '',
        channelTitle: v.author || '',
        thumbnail:
          v.videoThumbnails?.find(t => t.quality === 'hqdefault')?.url ||
          v.videoThumbnails?.find(t => (t.width || 0) >= 300)?.url ||
          `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        duration: fmtSeconds(v.lengthSeconds),
        viewCount: fmtViews(v.viewCount),
        url: `https://www.youtube.com/watch?v=${v.videoId}`
      }));
    } catch { /* try next instance */ }
  }
  throw new Error('All Invidious instances failed');
}

// ── Layer 2: Scrape ytInitialData from youtube.com/feed/trending ───────
function extractInitialData(html) {
  const pos = html.indexOf('var ytInitialData = ');
  if (pos === -1) return null;
  let i = pos + 'var ytInitialData = '.length;
  if (html[i] !== '{') return null;
  const start = i;
  let depth = 0, inStr = false, esc = false;
  while (i < html.length) {
    const c = html[i];
    if (esc)              { esc = false; i++; continue; }
    if (c === '\\' && inStr) { esc = true; i++; continue; }
    if (c === '"')        { inStr = !inStr; i++; continue; }
    if (!inStr) {
      if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') { if (--depth === 0) { i++; break; } }
    }
    i++;
  }
  try { return JSON.parse(html.slice(start, i)); } catch { return null; }
}

function collectVideoRenderers(node, out = [], depth = 0) {
  if (depth > 25 || !node || typeof node !== 'object') return out;
  if (node.videoRenderer?.videoId) {
    const v = node.videoRenderer;
    const thumbs = v.thumbnail?.thumbnails ?? [];
    const thumb = thumbs.find(t => (t.width || 0) >= 300) ?? thumbs.at(-1);
    out.push({
      id: v.videoId,
      title: v.title?.runs?.[0]?.text ?? v.title?.simpleText ?? '',
      channelTitle: v.ownerText?.runs?.[0]?.text ?? v.shortBylineText?.runs?.[0]?.text ?? '',
      thumbnail: thumb?.url ? (thumb.url.startsWith('//') ? 'https:' + thumb.url : thumb.url) : null,
      duration: v.lengthText?.simpleText ?? '',
      viewCount: v.viewCountText?.simpleText ?? v.shortViewCountText?.simpleText ?? '',
      url: `https://www.youtube.com/watch?v=${v.videoId}`
    });
  }
  for (const val of (Array.isArray(node) ? node : Object.values(node))) {
    if (val && typeof val === 'object') collectVideoRenderers(val, out, depth + 1);
  }
  return out;
}

async function fromScrape(regionCode, maxResults) {
  const url = `https://www.youtube.com/feed/trending?gl=${encodeURIComponent(regionCode)}&hl=en`;
  const { status, body } = await httpGet(url, {
    Cookie: 'CONSENT=YES+1; SOCS=CAESEwgDEgk0ODE3Nzk3MjkaAmVuIAEaBgiA_LyaBg'
  });
  if (status !== 200) throw new Error(`YouTube returned HTTP ${status}`);
  const data = extractInitialData(body);
  if (!data) throw new Error('Could not parse YouTube page data');
  const videos = collectVideoRenderers(data);
  if (!videos.length) throw new Error('No videos found on trending page');
  return videos.slice(0, maxResults);
}

// ── Layer 3: yt-dlp fallback ───────────────────────────────────────────
function fromYtDlp(regionCode, maxResults) {
  return new Promise((resolve, reject) => {
    const proc = execFile('yt-dlp', [
      '--flat-playlist', '--dump-json', '-I', `1:${maxResults}`,
      `https://www.youtube.com/feed/trending?gl=${regionCode}`
    ]);
    let out = '';
    proc.stdout?.on('data', d => out += d);
    proc.on('close', code => {
      if (code !== 0 || !out.trim()) return reject(new Error('yt-dlp returned no results'));
      const vids = out.trim().split('\n').flatMap(line => {
        try {
          const v = JSON.parse(line);
          return [{ id: v.id, title: v.title || '', channelTitle: v.channel || '',
            thumbnail: v.thumbnails?.at(-1)?.url ?? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
            duration: v.duration_string || '', viewCount: fmtViews(v.view_count),
            url: `https://www.youtube.com/watch?v=${v.id}` }];
        } catch { return []; }
      });
      resolve(vids);
    });
    proc.on('error', reject);
  });
}

// ── Public entry point ─────────────────────────────────────────────────
async function getTrendingVideos({ regionCode = 'US', maxResults = 20 } = {}) {
  // 1. Invidious (works from any IP, no API key)
  try { return await fromInvidious(regionCode, maxResults); }
  catch (e1) {
    console.warn('[Trending] Invidious failed:', e1.message);
    // 2. Direct scrape
    try { return await fromScrape(regionCode, maxResults); }
    catch (e2) {
      console.warn('[Trending] Scrape failed:', e2.message);
      // 3. yt-dlp
      try { return await fromYtDlp(regionCode, maxResults); }
      catch {
        throw new Error(`Could not fetch trending videos. Try again later. (${e1.message})`);
      }
    }
  }
}

module.exports = { getTrendingVideos };
