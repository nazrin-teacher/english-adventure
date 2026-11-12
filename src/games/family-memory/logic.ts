import { MEMORY_MEMBERS, type Member } from '../../content/family';
import { shuffle } from '../../components/scene';

export type Card = { id: number; member: Member };

/** A shuffled deck with `pairs` pairs of family members. */
export function makeDeck(pairs: number, seed: number): Card[] {
  const members = shuffle(MEMORY_MEMBERS, seed).slice(0, pairs);
  return shuffle([...members, ...members], seed + 11).map((member, id) => ({ id, member }));
}

/** Columns/rows for the board. */
export const gridFor = (cards: number) => (cards <= 6 ? { cols: 3, rows: 2 } : cards <= 8 ? { cols: 4, rows: 2 } : { cols: 4, rows: 3 });

export type FlipResult = 'first' | 'match' | 'miss' | 'ignored';

/** Decide what a tap on a card means, given the cards already face-up this turn and the matched ones. */
export function flip(deck: Card[], open: number[], matched: number[], id: number): FlipResult {
  if (open.length >= 2 || open.includes(id) || matched.includes(id)) return 'ignored';
  if (open.length === 0) return 'first';
  const a = deck.find((c) => c.id === open[0]);
  const b = deck.find((c) => c.id === id);
  return a && b && a.member === b.member ? 'match' : 'miss';
}
