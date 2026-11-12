import { ANIMALS, ANIMAL_ORDER, type AnimalKind } from '../../content/farm';
import { shuffle } from '../../components/scene';

export type RoundKind = 'sound' | 'shadow' | 'clue' | 'hidden' | 'match';
export type Round = { kind: RoundKind; answer: AnimalKind; options?: AnimalKind[] };

/** Gently varied challenge: two rounds of each kind, easiest first. */
export const PLAN: RoundKind[] = ['sound', 'shadow', 'sound', 'hidden', 'shadow', 'clue', 'match', 'hidden', 'clue', 'match'];

const LEGS: Record<AnimalKind, string> = { cow: 'four', horse: 'four', pig: 'four', sheep: 'four', hen: 'two', duck: 'two' };

/** Spoken clue from real features: "It's brown. It's got two legs." */
export const clueFor = (a: AnimalKind) => `It's ${ANIMALS[a].colour}. It's got ${LEGS[a]} legs.`;

/** Which animals fit a clue (used by tests to prove every clue has exactly one answer). */
export const animalsMatching = (clue: string) => ANIMAL_ORDER.filter((a) => clueFor(a) === clue);

/**
 * Ten rounds. Answers go through all six animals before repeating, never twice
 * in a row; sound-matching rounds offer the right sound and two others.
 */
export function makeRounds(seed: number): Round[] {
  const order = [...shuffle(ANIMAL_ORDER, seed), ...shuffle(ANIMAL_ORDER, seed + 7)];
  for (let i = 1; i < order.length; i++) {
    if (order[i] === order[i - 1]) {
      const j = (i + 2) % order.length;
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  return PLAN.map((kind, i) => {
    const answer = order[i];
    if (kind !== 'match') return { kind, answer };
    const others = shuffle(ANIMAL_ORDER.filter((a) => a !== answer), seed + i).slice(0, 2);
    return { kind, answer, options: shuffle([answer, ...others], seed + i * 3) };
  });
}

/** Stars earned after finishing `done` of `total` steps (thirds). */
export const starsFor = (done: number, total: number) => Math.floor((done / total) * 3 + 1e-9);
