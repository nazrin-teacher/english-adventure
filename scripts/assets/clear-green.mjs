// Make green panel-background pixels transparent (e.g. inside the necklace ring).
// node scripts/assets/clear-green.mjs <file.webp>
import sharp from 'sharp';
import { renameSync } from 'node:fs';
const [file] = process.argv.slice(2);
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < info.width * info.height; i++) {
  const [r, g, b] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  if (g > r + 18 && g > b + 8) data[i * 4 + 3] = 0;
}
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(file + '.tmp.webp');
renameSync(file + '.tmp.webp', file);
console.log('green cleared', file);
