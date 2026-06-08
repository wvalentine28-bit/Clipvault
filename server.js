require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const trendingRouter = require('./routes/trending');
const processRouter = require('./routes/process');
const uploadRouter = require('./routes/upload');
const authRouter = require('./routes/auth');
const autoRouter = require('./routes/auto');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directories exist
['uploads/downloads', 'uploads/clips', 'uploads/thumbnails'].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'clipvault-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Serve uploaded clips as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/trending', trendingRouter);
app.use('/api/process', processRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/auto', autoRouter);
app.use('/auth', authRouter);

// Serve main HTML at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'clipvault.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎬 ClipVault running at http://localhost:${PORT}`);
  console.log(`   Dashboard  → http://localhost:${PORT}`);
  console.log(`   Auth       → http://localhost:${PORT}/auth/youtube`);
  console.log('\n   Make sure .env is configured with your YouTube API keys.\n');
});
