// Clean game backgrounds from the supplied illustrations: baked-in UI and the
// objects that become separate interactive sprites are removed with LaMa.
// The live UI and sprites are later placed back at the same positions.
//
// Usage: node scripts/assets/scenes.mjs [sceneName ...]
import { mkdirSync } from 'node:fs';
import { dilate, inpaintWindow, loadRaw, maskRect, maskWhere, newMask, saveRaw, windowAround } from './inpaint.mjs';

const R = (box, name = '') => ({ box, name });

export const SCENES = {
  classroom: {
    src: 6,
    steps: [
      R([425, 50, 585, 215]), R([585, 25, 1235, 285]), R([1155, 10, 1255, 100]), R([1300, 20, 1650, 145]),
      R([100, 610, 505, 870]), R([510, 535, 900, 730]), R([980, 560, 1180, 665]), R([1220, 505, 1500, 655]),
      R([1390, 625, 1585, 795]), R([590, 655, 1010, 875]), R([1010, 695, 1340, 815]),
    ],
  },
  'its-a': {
    src: 7,
    steps: [R([535, 70, 1120, 365]), R([935, 10, 1055, 110]), R([780, 360, 995, 575]), R([990, 150, 1445, 645]), R([1160, 655, 1250, 750]), R([515, 680, 1190, 885])],
  },
  hunt: {
    src: 8,
    steps: [R([460, 0, 1285, 390]), R([580, 390, 1250, 655]), R([485, 675, 1225, 895]), R([1245, 550, 1655, 895])],
  },
  memory: {
    src: 9,
    steps: [R([505, 110, 1490, 715]), R([455, 685, 1255, 905])],
  },
  family: {
    src: 10,
    steps: [
      R([45, 55, 700, 330]), R([480, 440, 570, 565]), R([635, 670, 840, 875]), R([885, 685, 1495, 880]),
    ],
  },
  puppet: {
    src: 5,
    steps: [R([255, 5, 735, 230]), R([380, 170, 580, 705]), R([705, 195, 1105, 720]), R([1225, 90, 1665, 645]), R([475, 720, 1250, 910]), R([1335, 650, 1625, 920])],
  },
  'which-animal': {
    src: 12,
    steps: [
      R([20, 10, 125, 110]), R([440, 0, 1220, 162]), R([1236, 8, 1664, 178]), R([240, 140, 615, 335]), R([695, 150, 975, 315]),
      R([355, 300, 700, 590]), R([712, 288, 1062, 602]), R([1092, 392, 1380, 602]), R([386, 580, 694, 848]), R([728, 594, 950, 862]), R([1004, 524, 1240, 842]),
    ],
  },
  'i-can-see': {
    src: 13,
    steps: [
      R([15, 10, 130, 115]), R([665, 10, 1005, 95]), R([1425, 10, 1535, 115]), R([1550, 10, 1660, 115]), R([235, 55, 650, 325]),
      R([465, 195, 770, 435]), R([770, 110, 1080, 485]), R([515, 390, 785, 615]), R([1035, 400, 1185, 610]), R([1210, 305, 1435, 480]), R([1400, 185, 1535, 335]),
      R([25, 635, 1655, 805]), R([455, 780, 1230, 930]),
    ],
  },
};

const wanted = process.argv.slice(2);
mkdirSync('public/art/scenes', { recursive: true });
for (const [name, scene] of Object.entries(SCENES)) {
  if (wanted.length && !wanted.includes(name)) continue;
  const img = await loadRaw(`assets-src/reference/${scene.src}.webp`);
  for (const s of scene.steps) {
    const mask = newMask(img);
    if (s.color) {
      maskWhere(img, mask, s.box, s.color);
      dilate(img, mask, s.dilate ?? 3);
    } else maskRect(img, mask, s.box);
    const w = s.box[2] - s.box[0];
    if (w > 700) {
      // very wide regions: overlapping tiles keep more detail
      for (let x = s.box[0]; x < s.box[2]; x += 420) {
        const l = Math.max(0, x - 80), r = Math.min(img.width, x + 500);
        await inpaintWindow(img, mask, [l, Math.max(0, s.box[1] - 160), r, Math.min(img.height, s.box[3] + 160)]);
      }
    } else {
      await inpaintWindow(img, mask, windowAround(img, s.box));
    }
  }
  await saveRaw(img, `public/art/scenes/${name}.webp`, { quality: 86 });
  console.log('scene', name);
}
