// Cut-out animation rig for the farmer boy from the supplied "Build My Farm" picture.
// Produces separate layers so he can breathe, blink, talk, point and cheer:
//   farmer-body.webp  (body without the pointing forearm)
//   farmer-arm.webp   (pointing forearm + hand, rotates around the elbow)
//   farmer-mouth.webp (mouth, opens/closes while the narrator speaks)
// plus src/content/rigs.json with layer boxes, pivot, eye ellipses and skin colour,
// and removes the boy from the farm background (he is drawn by the rig instead).
//
// Usage: node scripts/assets/rig-farmer.mjs   (after farm-background.mjs)
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dilate, inpaintWindow, loadRaw, newMask, saveRaw } from './inpaint.mjs';

const require = createRequire(resolve('.tools/bgr/package.json'));
const { removeBackground } = require('@imgly/background-removal-node');
const sharp = require('sharp');
const publicPath = pathToFileURL(resolve('.tools/bgr/node_modules/@imgly/background-removal-node/dist')).href + '/';

const SRC = 'assets-src/reference/14.webp';
const REGION = [0, 168, 486, 676]; // where the boy is (scene pixels)
const ARM = [ // forearm + hand polygon (scene pixels)
  [318, 500], [352, 478], [396, 460], [430, 440], [460, 418], [478, 424], [474, 452], [452, 470],
  [446, 490], [402, 504], [362, 524], [328, 538],
];
const PIVOT = [336, 520]; // elbow/sleeve joint the forearm rotates around
const EYES = [
  { cx: 199, cy: 402, rx: 34, ry: 31, rot: 0 },
  { cx: 299, cy: 378, rx: 25, ry: 29, rot: -8 },
];
const MOUTH = [226, 438, 308, 484];
const OUT = 'public/art/rigs';
mkdirSync(OUT, { recursive: true });

const inPoly = (x, y, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// 1. the boy with transparent background
const [l, t, r, b] = REGION;
const w = r - l, h = b - t;
const png = await sharp(SRC).extract({ left: l, top: t, width: w, height: h }).png().toBuffer();
const cut = await removeBackground(new Blob([png], { type: 'image/png' }), { publicPath, model: 'medium', output: { format: 'image/png' } });
const { data: boy } = await sharp(Buffer.from(await cut.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// 2. split into body / arm / mouth layers
const body = Buffer.from(boy);
const arm = Buffer.alloc(boy.length);
const mouth = Buffer.alloc(boy.length);
const mcx = (MOUTH[0] + MOUTH[2]) / 2, mcy = (MOUTH[1] + MOUTH[3]) / 2, mrx = (MOUTH[2] - MOUTH[0]) / 2, mry = (MOUTH[3] - MOUTH[1]) / 2;
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, sx = x + l, sy = y + t;
    if (inPoly(sx, sy, ARM)) {
      boy.copy(arm, i, i, i + 4);
      // the model is unsure about the hand: anything clearly part of the boy is fully opaque
      arm[i + 3] = boy[i + 3] > 24 && boy[i + 1] <= boy[i] ? 255 : 0; // greenish = grass fringe
      body[i + 3] = 0;
    } else if ([[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2], [2, -2], [-2, 2]].some(([dx, dy]) => inPoly(sx + dx, sy + dy, ARM))) {
      body[i + 3] = 0; // no thin leftovers of the arm outline on the body layer
    }
    const d = ((sx - mcx) / mrx) ** 2 + ((sy - mcy) / mry) ** 2;
    if (d <= 1) {
      boy.copy(mouth, i, i, i + 4);
      mouth[i + 3] = Math.round(boy[i + 3] * Math.min(1, (1 - d) * 6)); // soft edge
    }
  }
// keep only the largest connected piece of the body layer (drops thin stray lines)
{
  const label = new Int32Array(w * h).fill(-1);
  let best = -1, bestSize = 0, n = 0;
  for (let s0 = 0; s0 < w * h; s0++) {
    if (body[s0 * 4 + 3] < 20 || label[s0] >= 0) continue;
    const stack = [s0];
    label[s0] = n;
    let size = 0;
    while (stack.length) {
      const i = stack.pop();
      size++;
      const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (j >= 0 && label[j] < 0 && body[j * 4 + 3] >= 20) (label[j] = n), stack.push(j);
    }
    if (size > bestSize) (bestSize = size), (best = n);
    n++;
  }
  for (let i = 0; i < w * h; i++) if (label[i] !== best) body[i * 4 + 3] = 0;
}
const save = async (buf, name) => {
  const info = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/${name}.webp`);
  const dx = Math.abs(info.trimOffsetLeft ?? 0), dy = Math.abs(info.trimOffsetTop ?? 0);
  return [l + dx, t + dy, l + dx + info.width, t + dy + info.height];
};
const bodyBox = await save(body, 'farmer-body');
const armBox = await save(arm, 'farmer-arm');
const mouthBox = await save(mouth, 'farmer-mouth');

// 3. skin colour for eyelids / mouth patch (forehead between the eyes)
const ref = await loadRaw(SRC);
const sample = (x, y) => [0, 1, 2].map((c) => ref.data[(y * ref.width + x) * 3 + c]);
const pts = [[252, 384], [256, 392], [248, 396], [214, 452], [290, 430]].map(([x, y]) => sample(x, y));
const avg = [0, 1, 2].map((c) => Math.round(pts.reduce((s, p) => s + p[c], 0) / pts.length));
const skin = '#' + avg.map((v) => v.toString(16).padStart(2, '0')).join('');

// 4. remove the boy from the farm background (the rig draws him)
const bg = await loadRaw('public/art/farm/farm-background.webp'); // run farm-background.mjs first
const mask = newMask(bg);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (boy[(y * w + x) * 4 + 3] > 30) mask[(y + t) * bg.width + (x + l)] = 1;
dilate(bg, mask, 5);
await inpaintWindow(bg, mask, [0, 120, 620, 676]);
await saveRaw(bg, 'public/art/farm/farm-background.webp', { quality: 90 });

const RIGS = 'src/content/rigs.json';
const rigs = existsSync(RIGS) ? JSON.parse(readFileSync(RIGS, 'utf8')) : {};
rigs.farmer = {
  scene: { width: 1672, height: 676 },
  body: { src: 'art/rigs/farmer-body.webp', box: bodyBox },
  arm: { src: 'art/rigs/farmer-arm.webp', box: armBox, pivot: PIVOT },
  mouth: { src: 'art/rigs/farmer-mouth.webp', box: mouthBox },
  eyes: EYES,
  skin,
};
writeFileSync(RIGS, JSON.stringify(rigs, null, 2) + '\n');
console.log('farmer rig', { bodyBox, armBox, mouthBox, skin });
