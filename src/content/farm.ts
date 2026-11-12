/**
 * Farm content: animals, the drop spots in the farm scene, and mission scripts.
 * Pure data — game rules live in games/build-my-farm/logic.ts.
 *
 * Scene coordinates are pixels of the farm background image
 * (public/art/farm/farm-background.webp, 1672 × 676). A spot's (x, y) is where
 * the animal's feet stand (bottom-centre of the sprite).
 */

export type AnimalKind = 'cow' | 'horse' | 'pig' | 'hen' | 'sheep' | 'duck';

export type AnimalInfo = {
  kind: AnimalKind;
  word: string;
  size: 'big' | 'medium' | 'small';
  /** Sprite height (scene px) when standing on a front spot (depth scale 1). */
  height: number;
  colour: string;
  legs: 2 | 4;
  /** Cut-out sticker image (from the supplied illustrations). */
  image: string;
};

const art = (f: string) => `art/animals/${f}.webp`;

export const ANIMALS: Record<AnimalKind, AnimalInfo> = {
  cow: { kind: 'cow', word: 'cow', size: 'big', height: 200, colour: 'black and white', legs: 4, image: art('cow') },
  horse: { kind: 'horse', word: 'horse', size: 'big', height: 214, colour: 'brown', legs: 4, image: art('horse') },
  pig: { kind: 'pig', word: 'pig', size: 'medium', height: 134, colour: 'pink', legs: 4, image: art('pig') },
  sheep: { kind: 'sheep', word: 'sheep', size: 'medium', height: 146, colour: 'white', legs: 4, image: art('sheep') },
  hen: { kind: 'hen', word: 'hen', size: 'small', height: 118, colour: 'brown', legs: 2, image: art('hen') },
  duck: { kind: 'duck', word: 'duck', size: 'small', height: 128, colour: 'white', legs: 2, image: art('duck') },
};

export const ANIMAL_ORDER: AnimalKind[] = ['cow', 'horse', 'pig', 'sheep', 'hen', 'duck'];

/**
 * Layers decide what "next to" means: only two ground spots can be next to each
 * other (an animal on the fence or inside the barn is not "next to" a ground animal).
 */
export type SpotLayer = 'ground' | 'fence' | 'barn';
export type Zone = 'tree' | 'fence' | 'barn' | 'barnSide' | 'field';

export type Spot = {
  id: string;
  x: number;
  y: number;
  layer: SpotLayer;
  zones: Zone[];
  /** Perspective scale: spots further back are drawn smaller. */
  scale: number;
};

export const SCENE_W = 1672;
export const SCENE_H = 676;
export const FARM_BACKGROUND = 'art/farm/farm-background.webp';
/** The hay bale is a separate sprite placed exactly over its spot in the background. */
export const HAY = { image: 'art/farm/hay.webp', left: 1548, top: 350, width: 124, height: 134 };

export const SPOTS: Spot[] = [
  { id: 'tree-left', x: 566, y: 470, layer: 'ground', zones: ['tree'], scale: 0.8 },
  { id: 'tree-right', x: 724, y: 474, layer: 'ground', zones: ['tree'], scale: 0.8 },
  { id: 'fence-1', x: 960, y: 374, layer: 'fence', zones: ['fence'], scale: 0.62 },
  { id: 'fence-2', x: 1080, y: 374, layer: 'fence', zones: ['fence'], scale: 0.62 },
  { id: 'fence-3', x: 1196, y: 374, layer: 'fence', zones: ['fence'], scale: 0.62 },
  { id: 'barn', x: 1432, y: 444, layer: 'barn', zones: ['barn'], scale: 0.76 },
  { id: 'barn-side', x: 1222, y: 482, layer: 'ground', zones: ['barnSide', 'field'], scale: 0.82 },
  { id: 'field-1', x: 896, y: 478, layer: 'ground', zones: ['field'], scale: 0.82 },
  { id: 'field-2', x: 1060, y: 482, layer: 'ground', zones: ['field'], scale: 0.82 },
  { id: 'field-3', x: 524, y: 616, layer: 'ground', zones: ['field'], scale: 1 },
  { id: 'field-4', x: 766, y: 626, layer: 'ground', zones: ['field'], scale: 1 },
  { id: 'field-5', x: 1004, y: 630, layer: 'ground', zones: ['field'], scale: 1 },
  { id: 'field-6', x: 1242, y: 626, layer: 'ground', zones: ['field'], scale: 1 },
  { id: 'field-7', x: 1470, y: 614, layer: 'ground', zones: ['field'], scale: 0.98 },
];

/** Maximum distance (canvas units) between two ground spots that count as "next to". */
export const NEXT_TO_DISTANCE = 255;

export type PlaceTarget =
  | { type: 'zone'; zone: Exclude<Zone, 'field'> }
  | { type: 'nextTo'; animal: AnimalKind };

export type Mission =
  | { type: 'place'; id: string; animal: AnimalKind; target: PlaceTarget; say: string }
  | { type: 'find'; id: string; size: 'big' | 'small'; say: string };

export type Scenario = {
  id: string;
  build: Mission[];
};

/**
 * Two scenarios alternate on replay. Each places 7 animals so the counting
 * part ("Count seven animals.") always has exactly seven animals.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: 'a',
    build: [
      { type: 'place', id: 'a1', animal: 'cow', target: { type: 'zone', zone: 'barnSide' }, say: 'Put the cow next to the barn.' },
      { type: 'place', id: 'a2', animal: 'duck', target: { type: 'nextTo', animal: 'cow' }, say: 'Put the duck next to the cow.' },
      { type: 'place', id: 'a3', animal: 'sheep', target: { type: 'zone', zone: 'tree' }, say: 'Put the sheep under the tree.' },
      { type: 'find', id: 'a4', size: 'big', say: 'Find the big animal.' },
      { type: 'place', id: 'a5', animal: 'horse', target: { type: 'zone', zone: 'barn' }, say: 'Put the horse in the barn.' },
      { type: 'place', id: 'a6', animal: 'hen', target: { type: 'zone', zone: 'fence' }, say: 'Put the hen on the fence.' },
      { type: 'place', id: 'a7', animal: 'pig', target: { type: 'nextTo', animal: 'sheep' }, say: 'Put the pig next to the sheep.' },
      { type: 'place', id: 'a8', animal: 'hen', target: { type: 'nextTo', animal: 'duck' }, say: 'Put a hen next to the duck.' },
    ],
  },
  {
    id: 'b',
    build: [
      { type: 'place', id: 'b1', animal: 'horse', target: { type: 'zone', zone: 'barnSide' }, say: 'Put the horse next to the barn.' },
      { type: 'place', id: 'b2', animal: 'hen', target: { type: 'nextTo', animal: 'horse' }, say: 'Put the hen next to the horse.' },
      { type: 'place', id: 'b3', animal: 'pig', target: { type: 'zone', zone: 'tree' }, say: 'Put the pig under the tree.' },
      { type: 'find', id: 'b4', size: 'big', say: 'Find the big animal.' },
      { type: 'place', id: 'b5', animal: 'cow', target: { type: 'zone', zone: 'barn' }, say: 'Put the cow in the barn.' },
      { type: 'place', id: 'b6', animal: 'duck', target: { type: 'zone', zone: 'fence' }, say: 'Put the duck on the fence.' },
      { type: 'place', id: 'b7', animal: 'sheep', target: { type: 'nextTo', animal: 'pig' }, say: 'Put the sheep next to the pig.' },
      { type: 'place', id: 'b8', animal: 'duck', target: { type: 'nextTo', animal: 'hen' }, say: 'Put a duck next to the hen.' },
    ],
  },
];

export const COUNT_TARGET = 7;
export const NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export const PHRASES = {
  intro: "Let's build a farm!",
  wrongAnimal: (tried: AnimalKind, wanted: AnimalKind) => `That's the ${tried}. Where is the ${wanted}?`,
  wrongPlace: 'Oops! Not there. Try again!',
  hint: 'Look! Try here.',
  findWrong: (tapped: AnimalKind) => `That's the ${tapped}. Try again!`,
  praise: ['Great job!', 'Well done!', 'Super!', 'Brilliant!', 'Yes! Good job!'],
  countIntro: 'Count seven animals.',
  countDone: 'Seven animals! Great counting!',
  describeIntro: 'Tell me about your farm. Tap an animal.',
  describeTurn: 'Now you say it!',
  feedIntro: 'The animals are hungry. Tap the hay!',
  feed: 'I feed the animals.',
  kindIntro: 'Stroke the animals gently.',
  kind: "I'm kind to animals.",
  finale: 'You built a great farm!',
  yourTurn: 'Your turn!',
} as const;

export const DESCRIBE_TARGET = 3;
export const PET_TARGET = 3;

/* ---------- Little Farm Designer ---------- */

/** Farm places the farmer shows first (hotspots on the background, scene pixels). */
export const TOUR = [
  { id: 'barn', box: [1236, 110, 1545, 446] as [number, number, number, number], say: 'This is the barn.' },
  { id: 'tree', box: [380, 150, 700, 360] as [number, number, number, number], say: 'This is the tree.' },
  { id: 'fence', box: [880, 362, 1262, 440] as [number, number, number, number], say: 'This is the fence.' },
  { id: 'hay', box: [1548, 350, 1672, 484] as [number, number, number, number], say: 'This is the hay. The animals eat hay.' },
];

/** Where the animals stand when they come to say hello. */
export const MEET_SPOTS: Record<AnimalKind, string> = {
  cow: 'field-3',
  horse: 'field-4',
  pig: 'field-5',
  sheep: 'field-6',
  hen: 'field-7',
  duck: 'field-1',
};

/** Animal sounds (spoken until recorded sounds are supplied). */
export const SOUNDS: Record<AnimalKind, string> = {
  cow: 'Moo!',
  horse: 'Neigh!',
  pig: 'Oink!',
  sheep: 'Baa!',
  hen: 'Cluck, cluck!',
  duck: 'Quack!',
};

export const EXTRA_ANIMALS = 2; // 7 + 2 = 9 for counting to nine
export const REPORT_TARGET = 3;
