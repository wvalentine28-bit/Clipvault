const fs = require('fs');
const { execFile } = require('child_process');

// Try @distube/ytdl-core first; fall back to system yt-dlp
let ytdl;
try {
  ytdl = require('@distube/ytdl-core');
} catch (e) {
  ytdl = null;
}

async function downloadWithYtdl(url, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    const video = ytdl(url, {
      quality: 'highestvideo',
      filter: format => format.container === 'mp4' && format.hasVideo && format.hasAudio
    });

    let totalBytes = 0;
    let downloadedBytes = 0;

    video.on('info', (info, format) => {
      totalBytes = parseInt(format.contentLength) || 0;
      onProgress?.({ step: `Downloading: "${info.videoDetails.title.slice(0, 50)}..."`, progress: 5 });
    });

    video.on('data', chunk => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const pct = Math.round(5 + (downloadedBytes / totalBytes) * 30);
        onProgress?.({ step: 'Downloading video...', progress: Math.min(pct, 35) });
      }
    });

    const ws = fs.createWriteStream(outputPath);
    video.pipe(ws);
    ws.on('finish', () => {
      onProgress?.({ step: 'Download complete', progress: 36 });
      resolve(outputPath);
    });
    ws.on('error', reject);
    video.on('error', reject);
  });
}

async function downloadWithYtDlp(url, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    onProgress?.({ step: 'Downloading video (yt-dlp)...', progress: 5 });

    const proc = execFile('yt-dlp', [
      '-f', 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '-o', outputPath,
      url
    ]);

    proc.stdout?.on('data', data => {
      const match = data.toString().match(/(\d+\.?\d*)%/);
      if (match) {
        const pct = Math.min(35, 5 + Math.round(parseFloat(match[1]) * 0.3));
        onProgress?.({ step: 'Downloading video...', progress: pct });
      }
    });

    proc.stderr?.on('data', data => {
      // yt-dlp progress can appear on stderr too
      const match = data.toString().match(/(\d+\.?\d*)%/);
      if (match) {
        const pct = Math.min(35, 5 + Math.round(parseFloat(match[1]) * 0.3));
        onProgress?.({ step: 'Downloading video...', progress: pct });
      }
    });

    proc.on('close', code => {
      if (code === 0) {
        onProgress?.({ step: 'Download complete', progress: 36 });
        resolve(outputPath);
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });

    proc.on('error', err => {
      reject(new Error(`yt-dlp not found. Install it with: pip install yt-dlp (${err.message})`));
    });
  });
}

async function downloadVideo(url, outputPath, onProgress) {
  if (ytdl) {
    try {
      return await downloadWithYtdl(url, outputPath, onProgress);
    } catch (e) {
      console.warn('ytdl-core failed, trying yt-dlp:', e.message);
    }
  }
  return await downloadWithYtDlp(url, outputPath, onProgress);
}

module.exports = { downloadVideo };
