import { ANIMALS, type AnimalKind } from './farm';

/**
 * Farm Safari layout: where each animal stands (feet x, feet y, height) in the
 * "I can see" farm picture. Spaced so that "next to" has exactly one answer.
 */
export const SEE_LAYOUT: Record<AnimalKind, [number, number, number]> = {
  cow: [560, 448, 230],
  duck: [764, 456, 150],
  horse: [1062, 474, 300],
  pig: [1300, 498, 160],
  sheep: [880, 668, 190],
  hen: [1468, 336, 135],
};

export const COLOUR_SENTENCE: Record<AnimalKind, string> = {
  cow: "It's black and white.",
  horse: "It's brown.",
  pig: "It's pink.",
  sheep: "It's white.",
  hen: "It's brown.",
  duck: "It's white.",
};

export const LEGS_SENTENCE: Record<AnimalKind, string> = {
  cow: "It's got four legs.",
  horse: "It's got four legs.",
  pig: "It's got four legs.",
  sheep: "It's got four legs.",
  hen: "It's got two legs.",
  duck: "It's got two legs.",
};

/** Clearly big / clearly small animals only (the pig and sheep are left out on purpose). */
export const SIZE: Partial<Record<AnimalKind, 'big' | 'small'>> = { cow: 'big', horse: 'big', hen: 'small', duck: 'small' };

/** Which animals stand next to each other in SEE_LAYOUT (both directions). */
export const NEXT_TO: [AnimalKind, AnimalKind][] = [
  ['cow', 'duck'],
  ['horse', 'pig'],
];

export const isNextTo = (a: AnimalKind, b: AnimalKind) => NEXT_TO.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export type Feature = { colour?: string; size?: 'big' | 'small'; legs?: 2 | 4; nextTo?: AnimalKind; on?: 'hay' };

/** "On the hay": the hen stands on the hay bale in the picture. */
const ON_HAY: AnimalKind[] = ['hen'];

export function matches(a: AnimalKind, f: Feature): boolean {
  if (f.colour && ANIMALS[a].colour !== f.colour) return false;
  if (f.size && SIZE[a] !== f.size) return false;
  if (f.legs && ANIMALS[a].legs !== f.legs) return false;
  if (f.nextTo && !isNextTo(a, f.nextTo)) return false;
  if (f.on === 'hay' && !ON_HAY.includes(a)) return false;
  return true;
}

export type SafariMission = { say: string; find: Feature; answer: AnimalKind };

/** Observation missions; tests prove each has exactly one correct animal. */
export const SAFARI_MISSIONS: SafariMission[] = [
  { say: 'Find a big brown animal.', find: { size: 'big', colour: 'brown' }, answer: 'horse' },
  { say: 'Find the black and white animal.', find: { colour: 'black and white' }, answer: 'cow' },
  { say: 'Find a small white animal.', find: { size: 'small', colour: 'white' }, answer: 'duck' },
  { say: 'Find the animal next to the horse. It is pink.', find: { nextTo: 'horse', colour: 'pink' }, answer: 'pig' },
  { say: 'Find a white animal with four legs.', find: { colour: 'white', legs: 4 }, answer: 'sheep' },
  { say: 'Find the small animal on the hay.', find: { size: 'small', on: 'hay' }, answer: 'hen' },
];

export const seeSentence = (a: AnimalKind) => `I can see a ${a}.`;

/** Second sentence for a farm report: size when it is clear, otherwise legs. */
export const describe2 = (a: AnimalKind) => (SIZE[a] ? `It's ${SIZE[a]}.` : LEGS_SENTENCE[a]);
