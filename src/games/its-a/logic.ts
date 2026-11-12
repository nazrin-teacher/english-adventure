/** Pack My School Bag — desk items, missions and sentence helpers (pure data/logic). */
export type BagItem = { id: string; thing: string; colour: string; image: string; plural?: boolean };

const s = (f: string) => `art/school/${f}.webp`;
export const DESK: BagItem[] = [
  { id: 'book-red', thing: 'book', colour: 'red', image: s('book') },
  { id: 'book-blue', thing: 'book', colour: 'blue', image: s('book-blue') },
  { id: 'case-blue', thing: 'pencil case', colour: 'blue', image: s('pencil-case') },
  { id: 'case-pink', thing: 'pencil case', colour: 'pink', image: s('pencil-case-pink') },
  { id: 'pencil-1', thing: 'pencil', colour: 'yellow', image: s('pencil') },
  { id: 'pencil-2', thing: 'pencil', colour: 'yellow', image: s('pencil-2') },
  { id: 'pencil-3', thing: 'pencil', colour: 'yellow', image: s('pencil') },
  { id: 'pen', thing: 'pen', colour: 'green', image: s('pen') },
  { id: 'sharpener', thing: 'sharpener', colour: 'orange', image: s('sharpener') },
  { id: 'eraser-pink', thing: 'eraser', colour: 'pink', image: s('eraser') },
  { id: 'eraser-blue', thing: 'eraser', colour: 'blue', image: s('eraser-blue') },
  { id: 'scissors-blue', thing: 'scissors', colour: 'blue', image: s('scissors'), plural: true },
  { id: 'scissors-red', thing: 'scissors', colour: 'red', image: s('scissors-red'), plural: true },
];
export const itemById = (id: string) => DESK.find((d) => d.id === id)!;

export type BagMission = { thing: string; colour?: string; count?: number };

/** Simple first, then colour, then a number. */
export const MISSIONS: BagMission[] = [
  { thing: 'pen' },
  { thing: 'sharpener' },
  { thing: 'book', colour: 'red' },
  { thing: 'pencil case', colour: 'pink' },
  { thing: 'pencil', count: 2 },
  { thing: 'scissors', colour: 'blue' },
  { thing: 'eraser', colour: 'blue' },
];

export const fits = (item: BagItem, m: BagMission) => item.thing === m.thing && (!m.colour || item.colour === m.colour);

const NUM = ['zero', 'one', 'two', 'three'];
export const missionName = (m: BagMission) => `${m.colour ? `${m.colour} ` : ''}${m.thing}`;
export const findSay = (m: BagMission) => (m.count ? `Find ${NUM[m.count]} ${m.thing}s.` : `Find the ${missionName(m)}.`);
export const putSay = (m: BagMission) => (m.count ? `Put ${NUM[m.count]} ${m.thing}s in the bag.` : `Put the ${missionName(m)} in the bag.`);

/** "It's a red book." / "It's an orange sharpener." / "They're blue scissors." */
export function describe(item: BagItem, withColour = true): string {
  const words = withColour && item.thing !== 'pencil' ? `${item.colour} ${item.thing}` : item.thing;
  if (item.plural) return `They're ${words}.`;
  return `It's ${/^[aeiou]/.test(words) ? 'an' : 'a'} ${words}.`;
}

/** Every mission must be possible with what is still on the desk (tests check all orders). */
export function solvable(onDesk: BagItem[], m: BagMission) {
  return onDesk.filter((i) => fits(i, m)).length >= (m.count ?? 1);
}
