import { ANIMAL_ORDER, type AnimalKind } from '../../content/farm';
import { ROUND_PLAN, type RoundKind } from '../../content/whichAnimal';
import { shuffle } from '../../components/scene';

export type Round = { kind: RoundKind; answer: AnimalKind };

/**
 * Nine rounds following ROUND_PLAN. Answers cycle through all six animals before
 * repeating, and the same animal never comes twice in a row.
 */
export function makeRounds(seed: number): Round[] {
  const order = [...shuffle(ANIMAL_ORDER, seed), ...shuffle(ANIMAL_ORDER, seed + 7)];
  for (let i = 1; i < order.length; i++) {
    if (order[i] === order[i - 1]) {
      const j = (i + 2) % order.length;
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  return ROUND_PLAN.map((kind, i) => ({ kind, answer: order[i] }));
}

/** Stars earned after finishing `done` of `total` rounds (thirds). */
export const starsFor = (done: number, total: number) => Math.floor((done / total) * 3 + 1e-9);
