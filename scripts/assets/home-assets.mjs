// Prepare home-screen art from the supplied home illustration (assets-src/reference/1.webp):
//  • the full scene (background for wide screens),
//  • nine separate card images (each becomes a real, tappable card element),
//  • the "English Adventure" logo (header on narrow screens).
// Card rectangles are also exported to src/content/homeLayout.json so the UI
// can place each card exactly over its spot in the scene.
//
// Usage: node scripts/assets/home-assets.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const SRC = 'assets-src/reference/1.webp';
const OUT = 'public/art/home';
mkdirSync(OUT, { recursive: true });

// [left, top, right, bottom] in the 1672×941 source.
const CARDS = {
  'school-objects-match': [288, 180, 652, 395],
  'its-a': [658, 180, 1022, 395],
  'school-object-hunt': [1028, 180, 1400, 395],
  'family-memory': [265, 408, 640, 625],
  'meet-my-family': [650, 408, 1035, 625],
  'puppet-studio': [1045, 408, 1422, 625],
  'which-animal': [245, 638, 635, 862],
  'i-can-see': [642, 638, 1030, 862],
  'build-my-farm': [1035, 638, 1445, 862],
};
// Baked-in star pill on each card (relative to the card), covered by the live star display.
const STARS = {
  'school-objects-match': [26, 160, 140, 202],
  'its-a': [22, 160, 136, 202],
  'school-object-hunt': [22, 160, 136, 202],
  'family-memory': [18, 160, 132, 202],
  'meet-my-family': [20, 160, 134, 202],
  'puppet-studio': [20, 160, 136, 202],
  'which-animal': [26, 168, 142, 210],
  'i-can-see': [24, 168, 142, 210],
  'build-my-farm': [24, 168, 142, 210],
};
const LOGO = [606, 0, 1066, 168];
const BUTTONS = { settings: [24, 14, 102, 92], sound: [1570, 14, 1650, 92] };

const crop = ([l, t, r, b]) => sharp(SRC).extract({ left: l, top: t, width: r - l, height: b - t });

await sharp(SRC).webp({ quality: 88 }).toFile(`${OUT}/home-scene.webp`);
await sharp(SRC).resize({ width: 640 }).blur(6).webp({ quality: 70 }).toFile(`${OUT}/home-scene-blur.webp`);
for (const [id, box] of Object.entries(CARDS)) await crop(box).webp({ quality: 90 }).toFile(`${OUT}/card-${id}.webp`);
// (the transparent logo is cut out by cutout.mjs)

const layout = {
  scene: { width: 1672, height: 941 },
  cards: Object.fromEntries(Object.entries(CARDS).map(([id, box]) => [id, { box, stars: STARS[id] }])),
  logo: LOGO,
  buttons: BUTTONS,
};
writeFileSync('src/content/homeLayout.json', JSON.stringify(layout, null, 2) + '\n');
console.log('home assets written');
