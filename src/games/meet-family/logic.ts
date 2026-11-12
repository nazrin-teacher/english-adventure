import { MEMORY_MEMBERS, type Member } from '../../content/family';
import { shuffle } from '../../components/scene';

/* ---------- Discover: body parts on grandma (guess scene, source pixels) ---------- */
export type Part = 'hair' | 'face' | 'eyes' | 'nose' | 'mouth' | 'ears' | 'arms' | 'body';
export const PARTS: { part: Part; boxes: [number, number, number, number][]; plural: boolean }[] = [
  { part: 'hair', boxes: [[1090, 135, 1460, 262], [1060, 262, 1140, 420], [1380, 262, 1460, 430]], plural: false },
  { part: 'face', boxes: [[1140, 230, 1360, 420]], plural: false },
  { part: 'eyes', boxes: [[1165, 262, 1335, 338]], plural: true },
  { part: 'nose', boxes: [[1222, 300, 1272, 340]], plural: false },
  { part: 'mouth', boxes: [[1198, 338, 1282, 380]], plural: false },
  { part: 'ears', boxes: [[1105, 312, 1152, 368], [1342, 366, 1388, 424]], plural: true },
  { part: 'arms', boxes: [[1050, 440, 1170, 650], [1340, 430, 1452, 650]], plural: true },
  { part: 'body', boxes: [[1170, 430, 1340, 650]], plural: false },
];
const area = (b: number[]) => (b[2] - b[0]) * (b[3] - b[1]);
/** The most specific part under a point (the smallest box wins: nose beats face). */
export function partAt(x: number, y: number): Part | null {
  let best: Part | null = null;
  let bestArea = Infinity;
  for (const p of PARTS)
    for (const b of p.boxes)
      if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && area(b) < bestArea) {
        bestArea = area(b);
        best = p.part;
      }
  return best;
}
export const partWord = (p: Part) => {
  const plural = PARTS.find((x) => x.part === p)!.plural;
  return plural ? `These are her ${p}.` : `This is her ${p}.`;
};

/* ---------- Challenge: appearance clues with exactly one answer ---------- */
type Look = { he: boolean; hair: 'brown' | 'black' | 'grey'; curly: boolean; eyes: 'brown' | 'green'; glasses: boolean; moustache: boolean; bows: boolean };

/** What each family portrait really shows. */
export const LOOKS: Record<Member, Look> = {
  mum: { he: false, hair: 'brown', curly: true, eyes: 'brown', glasses: false, moustache: false, bows: false },
  dad: { he: true, hair: 'black', curly: false, eyes: 'brown', glasses: false, moustache: false, bows: false },
  grandma: { he: false, hair: 'grey', curly: true, eyes: 'green', glasses: true, moustache: false, bows: false },
  grandpa: { he: true, hair: 'grey', curly: false, eyes: 'brown', glasses: true, moustache: true, bows: false },
  sister: { he: false, hair: 'brown', curly: false, eyes: 'brown', glasses: false, moustache: false, bows: true },
  brother: { he: true, hair: 'brown', curly: false, eyes: 'brown', glasses: false, moustache: false, bows: false },
};

export type Clue = { text: string; test: (l: Look) => boolean };

/** All true clues about one person (each sentence starts with He's / She's). */
export function cluesFor(m: Member): Clue[] {
  const l = LOOKS[m];
  const p = l.he ? "He's" : "She's";
  const g = (t: (x: Look) => boolean): ((x: Look) => boolean) => (x) => x.he === l.he && t(x);
  const out: Clue[] = [{ text: `${p} got ${l.hair} hair.`, test: g((x) => x.hair === l.hair) }];
  if (l.curly) out.push({ text: `${p} got curly hair.`, test: g((x) => x.curly) });
  out.push({ text: `${p} got ${l.eyes} eyes.`, test: g((x) => x.eyes === l.eyes) });
  if (l.glasses) out.push({ text: `${p} got glasses.`, test: g((x) => x.glasses) });
  if (l.moustache) out.push({ text: `${p} got a moustache.`, test: g((x) => x.moustache) });
  if (l.bows) out.push({ text: `${p} got pink bows.`, test: g((x) => x.bows) });
  return out;
}

export const whoMatches = (clues: Clue[]) => MEMORY_MEMBERS.filter((m) => clues.every((c) => c.test(LOOKS[m])));

export type GuessRound = { target: Member; clues: Clue[] };

/** 3 one-clue rounds, then 3 two-clue rounds; every round has exactly one answer. */
export function makeGuessRounds(seed: number): GuessRound[] {
  const rounds: GuessRound[] = [];
  const singles = shuffle(MEMORY_MEMBERS, seed)
    .map((m) => ({ m, c: cluesFor(m).filter((c) => whoMatches([c]).length === 1) }))
    .filter((x) => x.c.length);
  for (const { m, c } of singles.slice(0, 3)) rounds.push({ target: m, clues: [c[seed % c.length]] });
  const used = rounds.map((r) => r.target);
  const pairs = shuffle(MEMORY_MEMBERS, seed + 5).sort((a, b) => Number(used.includes(a)) - Number(used.includes(b)));
  for (const m of pairs.slice(0, 3)) {
    const cs = cluesFor(m);
    let pair: Clue[] | null = null;
    for (let i = 0; i < cs.length && !pair; i++) for (let j = i + 1; j < cs.length && !pair; j++) if (whoMatches([cs[i], cs[j]]).length === 1) pair = [cs[i], cs[j]];
    if (pair) rounds.push({ target: m, clues: pair });
  }
  return rounds;
}

/** Sentences a child can say about a person (frame + two features). */
export const describePerson = (m: Member) => [`${LOOKS[m].he ? "He's" : "She's"} my ${m}.`, ...cluesFor(m).slice(0, 2).map((c) => c.text)];
