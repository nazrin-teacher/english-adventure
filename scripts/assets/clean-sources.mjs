// Small touch-ups on the supplied illustrations before cutting assets out.
//  • 12.webp: stray dark marks on top of the sheep's wool → repainted as wool.
// Output: assets-src/derived/12-clean.png (used by cutout.mjs)
import { dilate, inpaintWindow, loadRaw, maskWhere, newMask, saveRaw } from './inpaint.mjs';

const img = await loadRaw('assets-src/reference/12.webp');
const mask = newMask(img);
const box = [492, 586, 650, 640];
maskWhere(img, mask, box, (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b < 150 || (r > 150 && g < 120 && b < 90));
dilate(img, mask, 4);
// keep the mask inside the box
for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (x < box[0] || x >= box[2] || y < box[1] || y >= box[3]) mask[y * img.width + x] = 0;
await inpaintWindow(img, mask, [420, 520, 720, 720]);
await saveRaw(img, 'assets-src/derived/12-clean.png');
console.log('saved assets-src/derived/12-clean.png');
