const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { downloadVideo } = require('./downloader');

ffmpeg.setFfmpegPath(ffmpegPath);

// Use FFmpeg volumedetect to score 60-second windows and find the most energetic one
function analyzeAudioEnergy(inputPath, windowSize) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, meta) => {
      if (err) return resolve({ startTime: 0, duration: windowSize });

      const totalDuration = meta.format.duration || 0;
      if (totalDuration <= windowSize) return resolve({ startTime: 0, duration: totalDuration });

      // Cap at 5 windows spread evenly across the video to avoid OOM
      const MAX_WINDOWS = 5;
      const numWindows = Math.min(MAX_WINDOWS, Math.max(1, Math.floor((totalDuration - windowSize) / 30) + 1));
      const span = totalDuration - windowSize;
      const step = numWindows > 1 ? span / (numWindows - 1) : 0;
      const results = [];
      let done = 0;

      for (let i = 0; i < numWindows; i++) {
        const start = Math.min(i * step, span);
        const segDuration = Math.min(windowSize, totalDuration - start);

        // Run ffmpeg with volumedetect on this window
        const proc = ffmpeg(inputPath)
          .seekInput(start)
          .duration(segDuration)
          .audioFilter('volumedetect')
          .format('null')
          .output(process.platform === 'win32' ? 'NUL' : '/dev/null')
          .on('end', function(_stdout, stderr) {
            const match = (stderr || '').match(/mean_volume:\s*([-\d.]+)\s*dB/);
            const meanVol = match ? parseFloat(match[1]) : -100;
            results.push({ startTime: start, duration: segDuration, meanVol });
            if (++done === numWindows) finish();
          })
          .on('error', () => {
            results.push({ startTime: start, duration: segDuration, meanVol: -100 });
            if (++done === numWindows) finish();
          });
        proc.run();
      }

      function finish() {
        results.sort((a, b) => b.meanVol - a.meanVol);
        resolve(results[0]);
      }
    });
  });
}

// Convert a video clip to vertical 9:16 format with blurred background
function convertToVertical(inputPath, outputPath, startTime, duration, onProgress) {
  return new Promise((resolve, reject) => {
    onProgress?.({ step: 'Converting to vertical 9:16...', progress: 60 });

    // Blurred background approach: scale source to fill 1080x1920, blur it,
    // then overlay the sharp source scaled to fit within those bounds
    const filterGraph =
      '[0:v]split=2[bg][fg];' +
      '[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:20[blurred];' +
      '[fg]scale=1080:1920:force_original_aspect_ratio=decrease[scaled];' +
      '[blurred][scaled]overlay=(W-w)/2:(H-h)/2[out]';

    ffmpeg(inputPath)
      .seekInput(startTime)
      .duration(duration)
      .complexFilter(filterGraph, 'out')
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoBitrate('2500k')
      .audioBitrate('128k')
      .fps(30)
      .outputOptions(['-preset fast', '-movflags +faststart', '-pix_fmt yuv420p'])
      .output(outputPath)
      .on('progress', prog => {
        const pct = Math.round(60 + (prog.percent || 0) * 0.35);
        onProgress?.({ step: 'Converting to vertical 9:16...', progress: Math.min(pct, 95) });
      })
      .on('end', () => {
        onProgress?.({ step: 'Conversion complete!', progress: 96 });
        resolve(outputPath);
      })
      .on('error', reject)
      .run();
  });
}

function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(0.5)
      .frames(1)
      .size('540x960')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

async function processVideo(videoUrl, options = {}, onProgress) {
  const { clipDuration = 60, autoDetect = true, startTime: manualStart, jobId } = options;
  const fileId = jobId || uuidv4();

  const downloadPath = path.join('uploads', 'downloads', `${fileId}.mp4`);
  const clipPath = path.join('uploads', 'clips', `${fileId}.mp4`);
  const thumbPath = path.join('uploads', 'thumbnails', `${fileId}.jpg`);

  try {
    // 1. Download
    onProgress?.({ status: 'processing', step: 'Downloading video...', progress: 5 });
    await downloadVideo(videoUrl, downloadPath, onProgress);

    // 2. Auto-detect best segment
    onProgress?.({ status: 'processing', step: 'Analyzing for best moments...', progress: 38 });
    let clipStart = manualStart !== undefined ? manualStart : 0;
    let actualDuration = clipDuration;

    if (autoDetect && manualStart === undefined) {
      try {
        const seg = await analyzeAudioEnergy(downloadPath, clipDuration);
        clipStart = seg.startTime;
        actualDuration = Math.min(seg.duration, clipDuration);
        onProgress?.({
          status: 'processing',
          step: `Best segment found at ${Math.round(clipStart)}s`,
          progress: 55
        });
      } catch (e) {
        console.warn('Audio analysis failed, using start of video:', e.message);
      }
    }

    // 3. Convert to vertical Short
    await convertToVertical(downloadPath, clipPath, clipStart, actualDuration, onProgress);

    // 4. Thumbnail
    onProgress?.({ status: 'processing', step: 'Generating thumbnail...', progress: 97 });
    try { await generateThumbnail(clipPath, thumbPath); } catch (_) {}

    // Clean up raw download
    fs.unlink(downloadPath, () => {});

    const clipInfo = {
      id: fileId,
      clipPath,
      clipUrl: `/${clipPath.replace(/\\/g, '/')}`,
      thumbnailUrl: `/${thumbPath.replace(/\\/g, '/')}`,
      startTime: clipStart,
      duration: actualDuration,
      sourceUrl: videoUrl
    };

    onProgress?.({ status: 'done', step: 'Short is ready!', progress: 100, clips: [clipInfo] });
    return [clipInfo];

  } catch (error) {
    // Cleanup on failure
    [downloadPath, clipPath].forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
    throw error;
  }
}

module.exports = { processVideo };
