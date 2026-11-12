// Cut subjects out of the supplied reference illustrations with a local
// background-removal model (@imgly/background-removal-node, runs offline).
//
// The tool is installed outside the app (in .tools/bgr) because it is only
// needed to prepare assets, never at runtime:
//   cd .tools/bgr && npm i @imgly/background-removal-node sharp
//
// Usage: node scripts/assets/cutout.mjs [jobName ...]
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(resolve('.tools/bgr/package.json'));
const { removeBackground } = require('@imgly/background-removal-node');
const sharp = require('sharp');
const publicPath = pathToFileURL(resolve('.tools/bgr/node_modules/@imgly/background-removal-node/dist')).href + '/';

const REF = (n) => (n === 12 ? 'assets-src/derived/12-clean.png' : `assets-src/reference/${n}.webp`);

/** [source image, left, top, right, bottom, output path] */
export const JOBS = {
  // Farm animals — from "Which Animal Is It?"
  cow: [12, 352, 300, 700, 589, 'public/art/animals/cow.webp'],
  horse: [12, 712, 288, 1062, 602, 'public/art/animals/horse.webp'],
  pig: [12, 1092, 392, 1380, 602, 'public/art/animals/pig.webp'],
  sheep: [12, 386, 589, 694, 848, 'public/art/animals/sheep.webp'],
  hen: [12, 728, 594, 950, 862, 'public/art/animals/hen.webp'],
  duck: [12, 1004, 524, 1240, 842, 'public/art/animals/duck.webp'],
  // Logo — from the home illustration (transparent, for the narrow layout)
  logo: [1, 600, 0, 1072, 172, 'public/art/home/logo.webp'],
  // School objects — from "Find the pencil." (classroom)
  book: [6, 100, 610, 505, 870, 'public/art/school/book.webp'],
  'pencil-case': [6, 510, 535, 900, 730, 'public/art/school/pencil-case.webp'],
  eraser: [6, 980, 560, 1180, 665, 'public/art/school/eraser.webp'],
  scissors: [6, 1220, 505, 1500, 655, 'public/art/school/scissors.webp'],
  sharpener: [6, 1390, 625, 1585, 795, 'public/art/school/sharpener.webp'],
  pencil: [6, 636, 700, 958, 848, 'public/art/school/pencil.webp'],
  pen: [6, 1010, 695, 1340, 815, 'public/art/school/pen.webp'],
  desk: [6, 660, 350, 1090, 565, 'public/art/school/desk.webp'],
  chair: [6, 1080, 250, 1340, 560, 'public/art/school/chair.webp'],
  // Orange — from "Find a book." (for "Find something orange.")
  orange: [8, 1060, 450, 1214, 620, 'public/art/school/orange.webp'],
  // Puppet parts — from the puppet studio
  'wig-curly': [5, 1275, 135, 1400, 235, 'public/art/puppet/wig-curly.webp'],
  'wig-bun': [5, 1398, 118, 1500, 220, 'public/art/puppet/wig-bun.webp'],
  'wig-bob': [5, 1497, 125, 1612, 235, 'public/art/puppet/wig-bob.webp'],
  'shirt-purple': [5, 1280, 315, 1390, 405, 'public/art/puppet/shirt-purple.webp'],
  'shirt-flower': [5, 1400, 312, 1497, 415, 'public/art/puppet/shirt-flower.webp'],
  'shirt-stripes': [5, 1500, 315, 1610, 405, 'public/art/puppet/shirt-stripes.webp'],
  'face-happy': [5, 1285, 490, 1392, 595, 'public/art/puppet/face-happy.webp'],
  'face-laugh': [5, 1395, 490, 1500, 595, 'public/art/puppet/face-laugh.webp'],
  'face-smile': [5, 1500, 490, 1605, 595, 'public/art/puppet/face-smile.webp'],
  // Second set of school things — from the "It's a pencil." picture (colour distractors)
  'book-blue': [2, 215, 700, 425, 870, 'public/art/school/book-blue.webp'],
  'pencil-case-pink': [2, 478, 710, 685, 865, 'public/art/school/pencil-case-pink.webp'],
  'pencil-2': [2, 745, 685, 940, 875, 'public/art/school/pencil-2.webp'],
  'eraser-blue': [2, 1000, 710, 1195, 855, 'public/art/school/eraser-blue.webp'],
  'scissors-red': [2, 1248, 700, 1465, 855, 'public/art/school/scissors-red.webp'],
  // Puppet accessories and clothes — from the second puppet-studio picture
  'acc-earrings': [11, 1135, 490, 1218, 580, 'public/art/puppet/acc-earrings.webp'],
  'acc-glasses': [11, 1225, 495, 1360, 565, 'public/art/puppet/acc-glasses.webp'],
  'acc-bow': [11, 1365, 490, 1478, 585, 'public/art/puppet/acc-bow.webp'],
  'acc-necklace': [11, 1485, 480, 1590, 585, 'public/art/puppet/acc-necklace.webp'],
  'shirt-jumper': [11, 1105, 285, 1275, 420, 'public/art/puppet/shirt-jumper.webp'],
  'shirt-cardigan': [11, 1290, 290, 1448, 425, 'public/art/puppet/shirt-cardigan.webp'],
  'shirt-dress': [11, 1462, 285, 1595, 425, 'public/art/puppet/shirt-dress.webp'],
  // Hay bale — from "Build My Farm" (sits exactly over its spot in the farm scene)
  hay: [14, 1548, 350, 1672, 484, 'public/art/farm/hay.webp'],
};

async function cut(name, [src, l, t, r, b, out]) {
  const png = await sharp(REF(src)).extract({ left: l, top: t, width: r - l, height: b - t }).png().toBuffer();
  const blob = new Blob([png], { type: 'image/png' });
  const result = await removeBackground(blob, { publicPath, model: 'medium', output: { format: 'image/png', quality: 1 } });
  const buf = Buffer.from(await result.arrayBuffer());
  mkdirSync(dirname(out), { recursive: true });
  const info = await sharp(buf).trim({ threshold: 1 }).webp({ quality: 92, alphaQuality: 100 }).toFile(out);
  // Where the trimmed sprite sits in its source picture, so the game can put it back exactly.
  const dx = Math.abs(info.trimOffsetLeft ?? 0), dy = Math.abs(info.trimOffsetTop ?? 0);
  boxes[name] = { src, box: [l + dx, t + dy, l + dx + info.width, t + dy + info.height] };
  console.log(name, `${info.width}x${info.height}`, '→', out);
}

const BOXES_FILE = 'src/content/spriteBoxes.json';
const boxes = existsSync(BOXES_FILE) ? JSON.parse(readFileSync(BOXES_FILE, 'utf8')) : {};
const wanted = process.argv.slice(2);
for (const [name, job] of Object.entries(JOBS)) {
  if (wanted.length && !wanted.includes(name)) continue;
  await cut(name, job);
}
writeFileSync(BOXES_FILE, JSON.stringify(boxes, null, 2) + '\n');
