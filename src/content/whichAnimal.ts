import type { AnimalKind } from './farm';

/** Spoken animal sounds. Recorded sound effects can be mapped to these exact strings in audioManifest.ts. */
export const ANIMAL_SOUNDS: Record<AnimalKind, string> = {
  cow: 'Moo! Moo!',
  horse: 'Neigh! Neigh!',
  pig: 'Oink! Oink!',
  sheep: 'Baa! Baa!',
  hen: 'Cluck, cluck, cluck!',
  duck: 'Quack! Quack!',
};

/** Spoken clues — only words already used in the farm games (colours, legs, big). */
export const ANIMAL_CLUES: Record<AnimalKind, string> = {
  cow: "It's black and white. It's got four legs.",
  horse: "It's brown. It's big.",
  pig: "It's pink. It's got four legs.",
  sheep: "It's white. It's got four legs.",
  hen: "It's brown. It's got two legs.",
  duck: "It's white. It's got two legs.",
};

export type RoundKind = 'word' | 'sound' | 'shadow' | 'clue';

/** Gently increasing challenge: name → sound → silhouette → spoken clue. */
export const ROUND_PLAN: RoundKind[] = ['word', 'word', 'sound', 'sound', 'sound', 'shadow', 'shadow', 'clue', 'clue'];

export const ROUND_PROMPT: Record<RoundKind, (a: AnimalKind) => string> = {
  word: (a) => `Where is the ${a}?`,
  sound: () => 'Listen! Which animal is it?',
  shadow: () => 'Look! Which animal is it?',
  clue: () => 'Listen to the clue. Which animal is it?',
};
