const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const YTDlpWrap = require('yt-dlp-wrap').default;

const BIN_DIR = path.join(__dirname, '..', 'bin');
const BIN_PATH = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

let _initPromise = null;

function _tryExec(bin) {
  return new Promise((resolve, reject) => {
    execFile(bin, ['--version'], { timeout: 5000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

async function _init() {
  // 1. Try system yt-dlp
  try {
    await _tryExec('yt-dlp');
    console.log('[yt-dlp] Using system yt-dlp');
    return new YTDlpWrap();
  } catch {}

  // 2. Try local binary
  if (fs.existsSync(BIN_PATH)) {
    try {
      await _tryExec(BIN_PATH);
      console.log('[yt-dlp] Using local binary:', BIN_PATH);
      return new YTDlpWrap(BIN_PATH);
    } catch {}
  }

  // 3. Download from GitHub
  console.log('[yt-dlp] Downloading yt-dlp binary from GitHub...');
  fs.mkdirSync(BIN_DIR, { recursive: true });
  await YTDlpWrap.downloadFromGithub(BIN_PATH);
  console.log('[yt-dlp] Downloaded to:', BIN_PATH);
  return new YTDlpWrap(BIN_PATH);
}

function getInstance() {
  if (!_initPromise) {
    _initPromise = _init();
    _initPromise.catch(err => {
      console.error('[yt-dlp] Failed to initialize:', err.message);
      _initPromise = null; // allow retry
    });
  }
  return _initPromise;
}

module.exports = { getInstance };
