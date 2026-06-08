require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const trendingRouter = require('./routes/trending');
const processRouter = require('./routes/process');

const app = express();
const PORT = process.env.PORT || 3000;

['uploads/downloads', 'uploads/clips', 'uploads/thumbnails'].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/trending', trendingRouter);
app.use('/api/process', processRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'clipvault.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎬 ClipVault running at http://localhost:${PORT}`);
  console.log(`   Make sure YOUTUBE_API_KEY is set in your .env file.\n`);
});
