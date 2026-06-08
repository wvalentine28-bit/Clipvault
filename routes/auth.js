const express = require('express');
const router = express.Router();
const { getAuthUrl, getTokens, getChannelInfo } = require('../utils/youtube-api');

// Redirect user to Google OAuth consent screen
router.get('/youtube', (req, res) => {
  try {
    const url = getAuthUrl();
    res.redirect(url);
  } catch (err) {
    res.redirect('/?auth=error&message=' + encodeURIComponent(err.message));
  }
});

// OAuth callback - exchange code for tokens
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/?auth=error&message=' + encodeURIComponent(error));
  }

  if (!code) {
    return res.redirect('/?auth=error&message=No+authorization+code+received');
  }

  try {
    const tokens = await getTokens(code);
    req.session.tokens = tokens;
    res.redirect('/?auth=success');
  } catch (err) {
    res.redirect('/?auth=error&message=' + encodeURIComponent(err.message));
  }
});

// Check current auth status
router.get('/status', async (req, res) => {
  if (!req.session?.tokens) {
    return res.json({ authenticated: false });
  }
  try {
    const channel = await getChannelInfo(req.session.tokens);
    res.json({ authenticated: true, channel });
  } catch (err) {
    res.json({ authenticated: false, error: err.message });
  }
});

// Disconnect
router.post('/logout', (req, res) => {
  req.session.tokens = null;
  res.json({ success: true });
});

module.exports = router;
