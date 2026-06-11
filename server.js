require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { networkInterfaces } = require('os');

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
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/trending', trendingRouter);
app.use('/api/process', processRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'clipvault.html'));
});

function getLocalIP() {
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`\n🎬 ClipVault running at http://localhost:${PORT}`);
  if (localIP) {
    console.log(`📱 iPhone (same WiFi): http://${localIP}:${PORT}`);
    console.log(`   Open that URL in Safari → Share → Add to Home Screen\n`);
  }
});
