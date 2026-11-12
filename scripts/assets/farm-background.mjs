// Build the clean Build My Farm background from the supplied
// "Build My Farm" illustration (assets-src/reference/14.webp):
// remove the baked-in UI, the cow, the dashed spots and the arrow,
// keep the farm (tree, fence, barn, hay, hills) and the farmer boy.
//
// Usage: node scripts/assets/farm-background.mjs [--preview out.png]
import { mkdirSync } from 'node:fs';
import { dilate, inpaintWindow, loadRaw, maskEllipse, maskRect, maskWhere, newMask, saveMaskPreview, saveRaw, windowAround } from './inpaint.mjs';

export const FARM_CROP = { left: 0, top: 0, width: 1672, height: 676 };

const img = await loadRaw('assets-src/reference/14.webp', FARM_CROP);

/** Each step = one region to remove; processed in order so later windows see earlier fixes. */
const steps = [
  { name: 'dashed spots', box: [466, 446, 1494, 590], white: true },
  { name: 'highlighted spot', box: [708, 436, 916, 592], ellipse: true },
  { name: 'arrow', box: [738, 318, 898, 458] },
  { name: 'yellow glow leftovers', box: [690, 300, 930, 600], yellow: true },
  { name: 'cow', box: [478, 326, 748, 584] },
  { name: 'home button', box: [22, 12, 146, 122] },
  { name: 'stars panel', box: [1306, 14, 1656, 120] },
  { name: 'mission banner', box: [404, 0, 1268, 234] },
  { name: 'panel decorations', box: [1084, 540, 1672, 676] },
];

const preview = process.argv.indexOf('--preview');
if (preview > 0) {
  const all = newMask(img);
  for (const s of steps) addToMask(all, s);
  await saveMaskPreview(img, all, process.argv[preview + 1]);
  process.exit(0);
}

function addToMask(mask, s) {
  if (s.yellow) {
    maskWhere(img, mask, s.box, (r, g, b) => r > 190 && g > 170 && b < 150 && r - b > 80);
    dilate(img, mask, 5);
  } else if (s.white) {
    maskWhere(img, mask, s.box, (r, g, b) => Math.min(r, g, b) > 200 && Math.max(r, g, b) - Math.min(r, g, b) < 60);
    dilate(img, mask, 4);
  } else if (s.ellipse) maskEllipse(img, mask, s.box);
  else maskRect(img, mask, s.box);
}

for (const s of steps) {
  const mask = newMask(img);
  addToMask(mask, s);
  if (s.white) {
    // the dashed ovals are wide: inpaint them in overlapping tiles for detail
    for (let x = s.box[0]; x < s.box[2]; x += 300) {
      const tile = [Math.max(0, x - 60), s.box[1] - 120, Math.min(img.width, x + 360), s.box[3] + 120];
      await inpaintWindow(img, mask, [tile[0], Math.max(0, tile[1]), tile[2], Math.min(img.height, tile[3])]);
    }
  } else {
    await inpaintWindow(img, mask, windowAround(img, s.box));
  }
  console.log('removed', s.name);
}

mkdirSync('public/art/farm', { recursive: true });
await saveRaw(img, 'public/art/farm/farm-background.webp', { quality: 90 });
console.log('saved public/art/farm/farm-background.webp', img.width, 'x', img.height);
