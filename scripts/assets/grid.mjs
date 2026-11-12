// Dev helper: draw a 50px measuring grid (labels every 100px) over a reference image.
// node scripts/assets/grid.mjs <n> <out.png> [left top width height]
import sharp from 'sharp';
const [n, out, l = 0, t = 0, w, h] = process.argv.slice(2);
const src = `assets-src/reference/${n}.webp`;
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const o = Buffer.from(data);
for (let y = 0; y < info.height; y++)
  for (let x = 0; x < info.width; x++)
    if (x % 50 === 0 || y % 50 === 0) {
      const i = (y * info.width + x) * 3;
      const major = x % 100 === 0 || y % 100 === 0;
      o[i] = 255; o[i + 1] = major ? 0 : 140; o[i + 2] = major ? 0 : 140;
    }
let img = sharp(o, { raw: { width: info.width, height: info.height, channels: 3 } });
if (w) img = img.extract({ left: +l, top: +t, width: +w, height: +h });
await img.png().toFile(out);
