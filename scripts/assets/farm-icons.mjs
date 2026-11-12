// Small picture cues for the mission banner (tree / barn / fence), cropped from the
// cleaned farm background so they match the scene exactly.
// Usage: node scripts/assets/farm-icons.mjs   (run after farm-background.mjs)
import sharp from 'sharp';
const BG = 'public/art/farm/farm-background.webp';
const ICONS = {
  tree: [372, 150, 704, 360],
  barn: [1226, 96, 1672, 452],
  fence: [880, 352, 1260, 440],
};
for (const [name, [l, t, r, b]] of Object.entries(ICONS)) {
  await sharp(BG).extract({ left: l, top: t, width: r - l, height: b - t }).resize({ height: 160 }).webp({ quality: 86 }).toFile(`public/art/farm/icon-${name}.webp`);
}
console.log('farm icons written');
