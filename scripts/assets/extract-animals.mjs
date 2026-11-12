// Cut the six sticker-style farm animals out of the supplied
// "Which Animal Is It?" illustration (assets-src/reference/12.webp).
//
// Each animal has a white sticker outline, so we flood-fill the background
// from the crop border until we hit that outline, remove enclosed grass
// pockets, keep the largest remaining shape and feather the edge.
//
// Usage: node scripts/assets/extract-animals.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'assets-src/reference/12.webp';
const OUT = 'public/art/animals';
mkdirSync(OUT, { recursive: true });

// Generous boxes [left, top, right, bottom] in source pixels.
export const BOXES = {
  cow: [352, 300, 700, 589],
  horse: [712, 288, 1062, 602],
  pig: [1092, 392, 1380, 602],
  sheep: [386, 589, 694, 848],
  hen: [728, 594, 950, 862],
  duck: [1004, 524, 1240, 842],
};

const isOutline = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return min > 196 && max - min < 55; // white / near-white, low saturation
};
const isGrass = (r, g, b) => g > r + 12 && g > b + 25; // clearly green

async function extract(name, [l, t, r, btm]) {
  const w = r - l, h = btm - t;
  const { data } = await sharp(SRC).extract({ left: l, top: t, width: w, height: h }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
  const bg = new Uint8Array(w * h); // 1 = background

  // 1. "wall" = the white sticker outline, thickened by 2px to close tiny gaps
  const outline = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const [R, G, B] = px(i);
    outline[i] = isOutline(R, G, B) ? 1 : 0;
  }
  const wall = new Uint8Array(outline);
  for (let pass = 0; pass < 2; pass++) {
    const prev = new Uint8Array(wall);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (prev[i]) continue;
        if ((x > 0 && prev[i - 1]) || (x < w - 1 && prev[i + 1]) || (y > 0 && prev[i - w]) || (y < h - 1 && prev[i + w])) wall[i] = 1;
      }
  }
  // flood the background from the crop border, stopping at the wall
  const stack = [];
  const push = (i) => {
    if (bg[i] || wall[i]) return;
    bg[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }

  // 1b. peel the thickened wall's outer fringe back to the real outline
  for (let pass = 0; pass < 3; pass++) {
    const prev = new Uint8Array(bg);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (prev[i] || outline[i]) continue;
        if ((x > 0 && prev[i - 1]) || (x < w - 1 && prev[i + 1]) || (y > 0 && prev[i - w]) || (y < h - 1 && prev[i + w])) bg[i] = 1;
      }
  }

  // 2. enclosed grass pockets (e.g. between legs) → background
  const seen = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || seen[s]) continue;
    const [R, G, B] = px(s);
    if (!isGrass(R, G, B)) continue;
    const comp = [s];
    seen[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k];
      const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j < 0 || bg[j] || seen[j]) continue;
        const [r2, g2, b2] = px(j);
        if (!isGrass(r2, g2, b2)) continue;
        seen[j] = 1;
        comp.push(j);
      }
    }
    if (comp.length > 60) comp.forEach((i) => (bg[i] = 1));
  }

  // 3. keep the largest foreground component
  const label = new Int32Array(w * h).fill(-1);
  let best = -1, bestSize = 0, n = 0;
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || label[s] >= 0) continue;
    const comp = [s];
    label[s] = n;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k];
      const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j < 0 || bg[j] || label[j] >= 0) continue;
        label[j] = n;
        comp.push(j);
      }
    }
    if (comp.length > bestSize) {
      bestSize = comp.length;
      best = n;
    }
    n++;
  }

  // 4. alpha with a 1px feather
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = label[i] === best ? 255 : 0;
  const soft = new Uint8Array(alpha);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!alpha[i]) continue;
      const nb = alpha[i - 1] + alpha[i + 1] + alpha[i - w] + alpha[i + w];
      if (nb < 255 * 4) soft[i] = Math.round((alpha[i] * 2 + nb) / 6);
    }

  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = soft[i];
  }
  const out = sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 });
  const info = await out.webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/${name}.webp`);
  console.log(name, `${info.width}x${info.height}`, 'kept', bestSize, 'px');
}

for (const [name, box] of Object.entries(BOXES)) await extract(name, box);
