import boxes from './spriteBoxes.json';
import type { Box } from '../components/scene';

/** Exact position of a cut-out sprite inside the reference picture it came from. */
export function spriteBox(name: string): Box {
  const entry = (boxes as Record<string, { src: number; box: number[] }>)[name];
  if (!entry) throw new Error(`No sprite box for ${name}`);
  return entry.box as Box;
}

/** Move/scale a box so its bottom-centre lands on (x, y) with the given height. */
export function standAt(box: Box, x: number, y: number, height: number): Box {
  const w = ((box[2] - box[0]) / (box[3] - box[1])) * height;
  return [x - w / 2, y - height, x + w / 2, y];
}
