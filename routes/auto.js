const express = require('express');
const router = express.Router();
const scheduler = require('../utils/scheduler');

router.post('/start', (req, res) => {
  if (!req.session?.tokens) {
    return res.status(401).json({ error: 'Not authenticated. Connect your YouTube channel first.' });
  }
  const { intervalHours = 24 } = req.body;
  scheduler.start(req.session.tokens, parseInt(intervalHours) || 24);
  res.json({ success: true, message: `Autonomous mode started (every ${intervalHours}h)` });
});

router.post('/stop', (req, res) => {
  scheduler.stop();
  res.json({ success: true, message: 'Autonomous mode stopped' });
});

// Run one cycle immediately
router.post('/run-now', async (req, res) => {
  if (!req.session?.tokens) {
    return res.status(401).json({ error: 'Not authenticated. Connect your YouTube channel first.' });
  }
  res.json({ success: true, message: 'Processing started in background...' });
  scheduler.runOnce(req.session.tokens).then(result => {
    console.log('[Auto] Run-now complete:', result.success ? 'success' : result.error);
  });
});

router.get('/status', (req, res) => {
  res.json({ active: scheduler.isActive() });
});

module.exports = router;
