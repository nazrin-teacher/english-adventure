// Cut-out animation rigs for the guide characters in each game scene.
// For every character: cut it out of its supplied picture (body layer),
// make a separate mouth layer, record eye ellipses and skin colour in
// src/content/rigs.json, and remove the character from the scene background
// (the rig draws it instead, so it can bounce, tilt, blink and talk).
//
// Usage: node scripts/assets/rigs.mjs [name ...]   (run scenes.mjs first)
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dilate, inpaintWindow, loadRaw, newMask, saveRaw } from './inpaint.mjs';

const require = createRequire(resolve('.tools/bgr/package.json'));
const { removeBackground } = require('@imgly/background-removal-node');
const sharp = require('sharp');
const publicPath = pathToFileURL(resolve('.tools/bgr/node_modules/@imgly/background-removal-node/dist')).href + '/';

const E = (cx, cy, rx, ry, rot = 0) => ({ cx, cy, rx, ry, rot });
/** region: where the character is; eyes: eyelid ellipses; mouth: mouth box. All in source pixels. */
export const RIGS = {
  'animal-girl': { src: 12, scene: 'which-animal', region: [0, 140, 330, 650], eyes: [E(192, 459, 29, 26), E(289, 431, 24, 24)], mouth: [222, 492, 302, 528] },
  'animal-boy': { src: 12, scene: 'which-animal', region: [1360, 160, 1672, 941], eyes: [E(1445, 464, 20, 24), E(1535, 478, 30, 25)], mouth: [1432, 502, 1518, 548] },
  'safari-boy': { src: 13, scene: 'i-can-see', region: [0, 150, 470, 636], eyes: [E(163, 388, 28, 27), E(254, 363, 23, 26)], mouth: [190, 415, 262, 452] },
  'class-girl': { src: 6, scene: 'classroom', region: [0, 30, 660, 620], eyes: [E(297, 345, 45, 40), E(427, 313, 35, 39)], mouth: [330, 375, 422, 436] },
  'hunt-girl': { src: 8, scene: 'hunt', region: [0, 90, 600, 941], eyes: [E(303, 400, 45, 42), E(448, 372, 34, 37)], mouth: [356, 450, 450, 502] },
  'memory-boy': { src: 9, scene: 'memory', region: [0, 130, 540, 941], eyes: [E(220, 402, 39, 40), E(340, 368, 32, 37)], mouth: [258, 435, 350, 492] },
  'family-girl': { src: 10, scene: 'family', region: [0, 280, 580, 941], eyes: [E(303, 495, 45, 40), E(427, 490, 26, 42)], mouth: [348, 550, 440, 602] },
  'puppet-boy': { src: 5, scene: 'puppet', region: [0, 110, 470, 690], eyes: [E(160, 372, 39, 34), E(283, 338, 29, 37)], mouth: [205, 408, 292, 462] },
  'bag-girl': { src: 2, scene: 'bag', region: [120, 0, 800, 650], eyes: [E(447, 292, 52, 44), E(600, 245, 39, 47)], mouth: [500, 335, 603, 396] },
  'guess-girl': { src: 4, scene: 'guess', region: [60, 100, 660, 640], eyes: [E(333, 345, 42, 34), E(442, 320, 31, 39)], mouth: [365, 378, 460, 425] },
};

const OUT = 'public/art/rigs';
mkdirSync(OUT, { recursive: true });
const RIGS_FILE = 'src/content/rigs.json';
const all = existsSync(RIGS_FILE) ? JSON.parse(readFileSync(RIGS_FILE, 'utf8')) : {};

async function build(name, cfg) {
  const SRC = `assets-src/reference/${cfg.src}.webp`;
  const [l, t, r, b] = cfg.region;
  const w = r - l, h = b - t;
  const png = await sharp(SRC).extract({ left: l, top: t, width: w, height: h }).png().toBuffer();
  const cut = await removeBackground(new Blob([png], { type: 'image/png' }), { publicPath, model: 'medium', output: { format: 'image/png' } });
  const { data: px } = await sharp(Buffer.from(await cut.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // keep the largest connected shape only
  const label = new Int32Array(w * h).fill(-1);
  let best = -1, bestSize = 0, n = 0;
  for (let s0 = 0; s0 < w * h; s0++) {
    if (px[s0 * 4 + 3] < 20 || label[s0] >= 0) continue;
    const stack = [s0];
    label[s0] = n;
    let size = 0;
    while (stack.length) {
      const i = stack.pop();
      size++;
      const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (j >= 0 && label[j] < 0 && px[j * 4 + 3] >= 20) (label[j] = n), stack.push(j);
    }
    if (size > bestSize) (bestSize = size), (best = n);
    n++;
  }
  for (let i = 0; i < w * h; i++) if (label[i] !== best) px[i * 4 + 3] = 0;

  // mouth layer (soft-edged ellipse of the mouth area)
  const mouth = Buffer.alloc(px.length);
  const [ml, mt, mr, mb] = cfg.mouth;
  const mcx = (ml + mr) / 2, mcy = (mt + mb) / 2, mrx = (mr - ml) / 2, mry = (mb - mt) / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = ((x + l - mcx) / mrx) ** 2 + ((y + t - mcy) / mry) ** 2;
      if (d > 1) continue;
      const i = (y * w + x) * 4;
      px.copy(mouth, i, i, i + 4);
      mouth[i + 3] = Math.round(px[i + 3] * Math.min(1, (1 - d) * 6));
    }

  const save = async (buf, file) => {
    const info = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).webp({ quality: 90, alphaQuality: 100 }).toFile(`${OUT}/${file}.webp`);
    const dx = Math.abs(info.trimOffsetLeft ?? 0), dy = Math.abs(info.trimOffsetTop ?? 0);
    return [l + dx, t + dy, l + dx + info.width, t + dy + info.height];
  };
  const bodyBox = await save(px, `${name}-body`);
  const mouthBox = await save(mouth, `${name}-mouth`);

  // skin colour: between the eyes
  const ref = await loadRaw(SRC);
  const [e1, e2] = cfg.eyes;
  const sx = Math.round((e1.cx + e2.cx) / 2), sy = Math.round((e1.cy + e2.cy) / 2);
  const acc = [0, 0, 0];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) for (let c = 0; c < 3; c++) acc[c] += ref.data[((sy + dy) * ref.width + sx + dx) * 3 + c];
  const skin = '#' + acc.map((v) => Math.round(v / 49).toString(16).padStart(2, '0')).join('');

  // remove the character from the scene background
  const scenePath = `public/art/scenes/${cfg.scene}.webp`;
  const bg = await loadRaw(scenePath);
  const mask = newMask(bg);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 30) mask[(y + t) * bg.width + (x + l)] = 1;
  dilate(bg, mask, 5);
  const pad = 140;
  await inpaintWindow(bg, mask, [Math.max(0, l - pad), Math.max(0, t - pad), Math.min(bg.width, r + pad), Math.min(bg.height, b)]);
  await saveRaw(bg, scenePath, { quality: 86 });

  all[name] = {
    scene: { width: 1672, height: 941 },
    body: { src: `art/rigs/${name}-body.webp`, box: bodyBox },
    mouth: { src: `art/rigs/${name}-mouth.webp`, box: mouthBox },
    eyes: cfg.eyes,
    skin,
  };
  console.log('rig', name, bodyBox, skin);
}

const wanted = process.argv.slice(2);
for (const [name, cfg] of Object.entries(RIGS)) if (!wanted.length || wanted.includes(name)) await build(name, cfg);
writeFileSync(RIGS_FILE, JSON.stringify(all, null, 2) + '\n');
