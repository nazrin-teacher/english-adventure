import {
  ANIMALS,
  NEXT_TO_DISTANCE,
  SPOTS,
  type AnimalKind,
  type Mission,
  type PlaceTarget,
  type Spot,
} from '../../content/farm';

/** One animal standing on the farm. */
export type Piece = { uid: string; kind: AnimalKind; spotId: string };

/** Map of spotId → piece standing there. */
export type Farm = Record<string, Piece>;

export const spotById = (id: string): Spot => {
  const s = SPOTS.find((sp) => sp.id === id);
  if (!s) throw new Error(`Unknown spot: ${id}`);
  return s;
};

/** Two spots are "next to" each other when both are on the ground and close together. */
export function areNextTo(a: Spot, b: Spot): boolean {
  if (a.id === b.id) return false;
  if (a.layer !== 'ground' || b.layer !== 'ground') return false;
  return Math.hypot(a.x - b.x, a.y - b.y) <= NEXT_TO_DISTANCE;
}

export function neighboursOf(spotId: string): Spot[] {
  const a = spotById(spotId);
  return SPOTS.filter((b) => areNextTo(a, b));
}

/** Does standing on `spotId` satisfy the target, given the animals already on the farm? */
export function satisfiesTarget(farm: Farm, spotId: string, target: PlaceTarget): boolean {
  const spot = spotById(spotId);
  if (target.type === 'zone') return spot.zones.includes(target.zone);
  return neighboursOf(spotId).some((n) => farm[n.id]?.kind === target.animal);
}

export type PlaceResult =
  | { ok: true }
  | { ok: false; reason: 'wrong-animal' | 'occupied' | 'wrong-place' };

/** Validate a placement attempt for a "place" mission. Pure; does not mutate. */
export function checkPlacement(farm: Farm, mission: Extract<Mission, { type: 'place' }>, kind: AnimalKind, spotId: string): PlaceResult {
  if (kind !== mission.animal) return { ok: false, reason: 'wrong-animal' };
  if (farm[spotId]) return { ok: false, reason: 'occupied' };
  if (!satisfiesTarget(farm, spotId, mission.target)) return { ok: false, reason: 'wrong-place' };
  return { ok: true };
}

/** All free spots that would be accepted for this mission (used for hints). */
export function validSpots(farm: Farm, mission: Extract<Mission, { type: 'place' }>): string[] {
  return SPOTS.filter((s) => !farm[s.id] && satisfiesTarget(farm, s.id, mission.target)).map((s) => s.id);
}

export function placePiece(farm: Farm, piece: Piece): Farm {
  return { ...farm, [piece.spotId]: piece };
}

/** For "Find the big animal." — which pieces on the farm are correct answers. */
export function findAnswers(farm: Farm, size: 'big' | 'small'): string[] {
  return Object.values(farm)
    .filter((p) => ANIMALS[p.kind].size === size)
    .map((p) => p.uid);
}

/**
 * Build a true sentence about one animal from where it actually stands,
 * so the child describes *their own* farm.
 */
export function describePiece(farm: Farm, uid: string): string {
  const piece = Object.values(farm).find((p) => p.uid === uid);
  if (!piece) return '';
  const spot = spotById(piece.spotId);
  const name = ANIMALS[piece.kind].word;
  if (spot.zones.includes('barn')) return `The ${name} is in the barn.`;
  if (spot.zones.includes('fence')) return `The ${name} is on the fence.`;
  if (spot.zones.includes('tree')) return `The ${name} is under the tree.`;
  const neighbour = neighboursOf(spot.id)
    .map((n) => farm[n.id])
    .find((p) => p && p.kind !== piece.kind);
  if (neighbour) return `The ${name} is next to the ${ANIMALS[neighbour.kind].word}.`;
  if (spot.zones.includes('barnSide')) return `The ${name} is next to the barn.`;
  return `I can see a ${name}.`;
}

export const pickScenarioIndex = (plays: number, count: number) => ((Math.max(1, plays) - 1) % count + count) % count;
