// Remove leftover golden selection-frame pixels near the edges of a cut-out.
// node scripts/assets/fix-edges.mjs <file.webp> [border=14]
import sharp from 'sharp';
const [file, border = 14] = process.argv.slice(2);
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    if (Math.min(x, y, w - 1 - x, h - 1 - y) >= +border) continue;
    const i = (y * w + x) * 4;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r > 190 && g > 150 && b < 140 && r - b > 70) data[i + 3] = 0;
  }
await sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).webp({ quality: 92, alphaQuality: 100 }).toFile(file + '.tmp.webp');
const fs = await import('node:fs');
fs.renameSync(file + '.tmp.webp', file);
console.log('edges cleaned', file);
