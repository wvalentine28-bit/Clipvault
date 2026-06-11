const { getInstance } = require('./yt-dlp');

async function downloadVideo(url, outputPath, onProgress) {
  const ytdlp = await getInstance();

  return new Promise((resolve, reject) => {
    onProgress?.({ step: 'Downloading video...', progress: 5 });

    const proc = ytdlp.exec([
      url,
      '-f', 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--no-part',
      '-o', outputPath
    ]);

    proc.on('progress', p => {
      const pct = Math.min(35, 5 + Math.round((p.percent || 0) * 0.3));
      onProgress?.({ step: 'Downloading video...', progress: pct });
    });

    proc.on('close', () => {
      onProgress?.({ step: 'Download complete', progress: 36 });
      resolve(outputPath);
    });

    proc.on('error', err => reject(err));
  });
}

module.exports = { downloadVideo };
