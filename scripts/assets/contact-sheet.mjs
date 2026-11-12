// Dev helper: preview cut-outs on magenta to spot halos. node scripts/assets/contact-sheet.mjs out.png a.webp b.webp ...
import sharp from 'sharp';
const [out, ...files] = process.argv.slice(2);
const W = 300, H = 260, cols = 3;
const tiles = await Promise.all(files.map((f) => sharp(f).resize(W, H, { fit: 'contain', background: '#ff00ff' }).flatten({ background: '#ff00ff' }).png().toBuffer()));
await sharp({ create: { width: W * cols, height: H * Math.ceil(files.length / cols), channels: 3, background: '#ff00ff' } })
  .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * W, top: Math.floor(i / cols) * H })))
  .png()
  .toFile(out);
