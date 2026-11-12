import { THINGS, THING_ORDER, type SchoolThing } from '../../content/school';
import { shuffle } from '../../components/scene';

/** Colour of each classroom object in the classroom picture. */
export const COLOUR: Record<SchoolThing, string> = {
  pencil: 'yellow',
  'pencil-case': 'blue',
  book: 'red',
  pen: 'green',
  sharpener: 'orange',
  desk: 'brown',
  chair: 'blue',
  eraser: 'pink',
  scissors: 'blue',
};

/** Only colours that belong to exactly one object are used as clues. */
export const CLUE_TARGETS = THING_ORDER.filter((t) => THING_ORDER.filter((u) => COLOUR[u] === COLOUR[t]).length === 1);

/** Extra look-alike objects (from the second school picture) used as distractors. */
export const EXTRA_IMAGES: Record<string, string> = {
  'pencil-2': 'art/school/pencil-2.webp',
  'book-blue': 'art/school/book-blue.webp',
  'eraser-blue': 'art/school/eraser-blue.webp',
  'pencil-case-pink': 'art/school/pencil-case-pink.webp',
};
export const imageOf = (id: string) => (id in THINGS ? THINGS[id as SchoolThing].image : EXTRA_IMAGES[id]);

/** Look-alike sets: exactly one option is the target thing. */
export const SIMILAR: { target: SchoolThing; options: string[] }[] = [
  { target: 'pen', options: ['pen', 'pencil', 'pencil-2'] },
  { target: 'eraser', options: ['eraser', 'sharpener', 'pencil-case-pink'] },
  { target: 'pencil-case', options: ['pencil-case', 'book-blue', 'eraser-blue'] },
  { target: 'sharpener', options: ['sharpener', 'eraser', 'eraser-blue'] },
];

export type Round =
  | { kind: 'clue'; target: SchoolThing }
  | { kind: 'similar'; target: SchoolThing; options: string[] }
  | { kind: 'hidden'; target: SchoolThing; options: SchoolThing[] }
  | { kind: 'missing'; shown: SchoolThing[]; target: SchoolThing; options: SchoolThing[] };

const SMALL: SchoolThing[] = ['pencil', 'pencil-case', 'book', 'pen', 'sharpener', 'eraser', 'scissors'];

export function makeRounds(seed: number): Round[] {
  const clues = shuffle(CLUE_TARGETS, seed);
  const similar = shuffle(SIMILAR, seed + 1);
  const hidden = shuffle(SMALL, seed + 2);
  const rounds: Round[] = [];
  for (let i = 0; i < 2; i++) {
    rounds.push({ kind: 'clue', target: clues[i] });
    rounds.push({ kind: 'similar', target: similar[i].target, options: shuffle(similar[i].options, seed + i) });
    const h = hidden[i];
    rounds.push({ kind: 'hidden', target: h, options: shuffle([h, ...shuffle(SMALL.filter((t) => t !== h), seed + 5 + i).slice(0, 2)], seed + 9 + i) });
    const shown = shuffle(SMALL, seed + 20 + i).slice(0, 4);
    const target = shown[(seed + i) % 4];
    const others = SMALL.filter((t) => !shown.includes(t)).slice(0, 2);
    rounds.push({ kind: 'missing', shown, target, options: shuffle([target, ...others], seed + 30 + i) });
  }
  return rounds;
}
