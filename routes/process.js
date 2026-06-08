const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { processVideo } = require('../utils/processor');

// In-memory job store
const jobs = new Map();

router.post('/', async (req, res) => {
  const { videoUrl, clipDuration = 60, autoDetect = true, startTime } = req.body;

  if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
    return res.status(400).json({ error: 'A valid videoUrl is required.' });
  }

  const jobId = uuidv4();
  jobs.set(jobId, { status: 'pending', progress: 0, step: 'Queued...', clips: [] });

  // Start processing asynchronously
  setImmediate(async () => {
    try {
      await processVideo(
        videoUrl,
        { clipDuration: parseInt(clipDuration) || 60, autoDetect, startTime },
        evt => {
          const current = jobs.get(jobId) || {};
          jobs.set(jobId, { ...current, status: 'processing', ...evt });
        }
      );
    } catch (err) {
      jobs.set(jobId, { status: 'error', progress: 0, step: err.message, clips: [] });
    }
  });

  res.json({ jobId });
});

// Poll job status
router.get('/:jobId/status', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  res.json(job);
});

// SSE stream for real-time updates
router.get('/:jobId/events', (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = data => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const interval = setInterval(() => {
    const job = jobs.get(jobId);
    if (!job) { clearInterval(interval); res.end(); return; }
    send(job);
    if (job.status === 'done' || job.status === 'error') {
      clearInterval(interval);
      setTimeout(() => res.end(), 500);
    }
  }, 400);

  req.on('close', () => clearInterval(interval));
});

module.exports = router;
