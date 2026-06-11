#!/usr/bin/env node
// Generates solid-color PNG icons for the PWA without any extra dependencies.
// Usage: node scripts/gen-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([t, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, t, data, crcVal]);
}

// Draws a rounded-rect logo icon: gradient-ish blue→purple with a "CV" feel
function makePNG(size, topR, topG, topB, botR, botG, botB) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB
  const rows = [];
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(topR + (botR - topR) * t);
    const g = Math.round(topG + (botG - topG) * t);
    const b = Math.round(topB + (botB - topB) * t);
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter None
    for (let x = 0; x < size; x++) {
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const idat = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const OUT = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

// Blue (#2563EB) → Purple (#7C3AED)  gradient top→bottom
const [topR, topG, topB] = [0x25, 0x63, 0xEB];
const [botR, botG, botB] = [0x7C, 0x3A, 0xED];

for (const size of [180, 192, 512]) {
  const buf = makePNG(size, topR, topG, topB, botR, botG, botB);
  const out = path.join(OUT, `icon-${size}.png`);
  fs.writeFileSync(out, buf);
  console.log(`✓ ${out} (${buf.length} bytes)`);
}
