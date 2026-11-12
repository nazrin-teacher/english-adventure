import type { AnimalKind } from './farm';

/** Where each animal stands in the "I Can See…!" farm (feet x, feet y, height) in scene pixels. */
export const SEE_LAYOUT: Record<AnimalKind, [number, number, number]> = {
  cow: [575, 432, 230],
  duck: [790, 462, 165],
  horse: [1032, 472, 300],
  pig: [1332, 486, 165],
  sheep: [660, 612, 210],
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

/** "Next to" sentences that are true for SEE_LAYOUT. */
export const WHERE_SENTENCES: { a: AnimalKind; b: AnimalKind; text: string }[] = [
  { a: 'duck', b: 'cow', text: 'The duck is next to the cow.' },
  { a: 'pig', b: 'horse', text: 'The pig is next to the horse.' },
];

export const seeSentence = (a: AnimalKind) => `I can see a ${a}.`;
