/** School objects — all cut out of the supplied classroom picture. */
export type SchoolThing = 'pencil' | 'pencil-case' | 'book' | 'pen' | 'sharpener' | 'desk' | 'chair' | 'eraser' | 'scissors';

export type ThingInfo = {
  id: SchoolThing;
  word: string;
  plural?: boolean;
  image: string;
};

const art = (f: string) => `art/school/${f}.webp`;

export const THINGS: Record<SchoolThing, ThingInfo> = {
  pencil: { id: 'pencil', word: 'pencil', image: art('pencil') },
  'pencil-case': { id: 'pencil-case', word: 'pencil case', image: art('pencil-case') },
  book: { id: 'book', word: 'book', image: art('book') },
  pen: { id: 'pen', word: 'pen', image: art('pen') },
  sharpener: { id: 'sharpener', word: 'sharpener', image: art('sharpener') },
  desk: { id: 'desk', word: 'desk', image: art('desk') },
  chair: { id: 'chair', word: 'chair', image: art('chair') },
  eraser: { id: 'eraser', word: 'eraser', image: art('eraser') },
  scissors: { id: 'scissors', word: 'scissors', plural: true, image: art('scissors') },
};

export const THING_ORDER: SchoolThing[] = ['pencil', 'pencil-case', 'book', 'pen', 'sharpener', 'desk', 'chair', 'eraser', 'scissors'];

/** "It's a pencil." / "It's an eraser." / "They're scissors." */
export function itsA(t: SchoolThing): string {
  const { word, plural } = THINGS[t];
  if (plural) return `They're ${word}.`;
  return `It's ${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}.`;
}

/** Instruction patterns for School Objects Match, rotated round by round. */
export function findPrompt(t: SchoolThing, round: number): string {
  const { word, plural } = THINGS[t];
  switch (round % 3) {
    case 0:
      return `Find the ${word}.`;
    case 1:
      return `Touch the ${word}.`;
    default:
      return plural ? `Where are the ${word}?` : `Where is the ${word}?`;
  }
}

/** Home hunt missions (the child searches their own home, then says the sentence). */
export type HuntMission = { id: string; say: string; found: string; pictures: string[] };

export const HUNT_MISSIONS: HuntMission[] = [
  { id: 'book', say: 'Find a book.', found: 'I found a book!', pictures: [art('book')] },
  { id: 'pencil', say: 'Find a pencil.', found: 'I found a pencil!', pictures: [art('pencil')] },
  { id: 'orange', say: 'Find something orange.', found: 'I found something orange!', pictures: [art('orange'), art('sharpener')] },
  { id: 'pen', say: 'Find a pen.', found: 'I found a pen!', pictures: [art('pen')] },
  { id: 'pencil-case', say: 'Find a pencil case.', found: 'I found a pencil case!', pictures: [art('pencil-case')] },
  { id: 'eraser', say: 'Find an eraser.', found: 'I found an eraser!', pictures: [art('eraser')] },
];
