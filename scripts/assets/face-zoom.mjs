// Dev helper: zoom a face area with a 10px grid (blue every 50px) for measuring.
// node scripts/assets/face-zoom.mjs <img#> <left> <top> <w> <h> <out.png>
import sharp from 'sharp';
const [n, l, t, w, h, out] = process.argv.slice(2);
const { data, info } = await sharp(`assets-src/reference/${n}.webp`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const o = Buffer.from(data);
for (let y = 0; y < info.height; y++)
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 3;
    if (x % 50 === 0 || y % 50 === 0) (o[i] = 0), (o[i + 1] = 0), (o[i + 2] = 255);
    else if (x % 10 === 0 && y % 10 === 0) (o[i] = 255), (o[i + 1] = 0), (o[i + 2] = 0);
  }
await sharp(o, { raw: { width: info.width, height: info.height, channels: 3 } }).extract({ left: +l, top: +t, width: +w, height: +h }).resize(+w * 2, +h * 2, { kernel: 'nearest' }).png().toFile(out);
