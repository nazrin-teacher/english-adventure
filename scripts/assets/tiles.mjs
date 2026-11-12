// Plain rectangular crops (picture tiles that keep their own frame).
// Usage: node scripts/assets/tiles.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
const TILES = {
  // Family portraits — from "She's my grandma." (inner picture, without the gold highlight)
  'family/mum': [4, 124, 680, 334, 884],
  'family/dad': [4, 376, 680, 581, 884],
  'family/grandma': [4, 634, 692, 818, 876],
  'family/grandpa': [4, 868, 680, 1069, 884],
  'family/sister': [4, 1108, 680, 1304, 884],
  'family/brother': [4, 1346, 680, 1546, 884],
  // Memory card back — from "My Family Memory"
  'family/card-back': [9, 527, 132, 733, 298],
  // Puppet choice tiles — from the puppet studio
  'puppet/who-mum': [5, 418, 196, 545, 304],
  'puppet/who-dad': [5, 418, 322, 545, 432],
  'puppet/who-grandma': [5, 418, 446, 545, 552],
  'puppet/who-grandpa': [5, 418, 566, 545, 676],
};
for (const [name, [src, l, t, r, b]] of Object.entries(TILES)) {
  const out = `public/art/${name}.webp`;
  mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true });
  await sharp(`assets-src/reference/${src}.webp`).extract({ left: l, top: t, width: r - l, height: b - t }).webp({ quality: 90 }).toFile(out);
}
console.log('tiles written');
