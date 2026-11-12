import { describe, expect, it } from 'vitest';
import { COUNT_TARGET, SCENARIOS, SPOTS, type Mission } from '../../content/farm';
import {
  areNextTo,
  checkPlacement,
  describePiece,
  findAnswers,
  neighboursOf,
  pickScenarioIndex,
  placePiece,
  spotById,
  validSpots,
  type Farm,
} from './logic';

type PlaceMission = Extract<Mission, { type: 'place' }>;
const place = (farm: Farm, kind: PlaceMission['animal'], spotId: string, uid = `${kind}-${spotId}`) =>
  placePiece(farm, { uid, kind, spotId });

describe('spot geometry', () => {
  it('has unique spot ids', () => {
    expect(new Set(SPOTS.map((s) => s.id)).size).toBe(SPOTS.length);
  });

  it('"next to" is symmetric', () => {
    for (const a of SPOTS) for (const b of SPOTS) expect(areNextTo(a, b)).toBe(areNextTo(b, a));
  });

  it('only ground spots can be next to each other', () => {
    expect(neighboursOf('barn')).toEqual([]);
    expect(neighboursOf('fence-2')).toEqual([]);
  });

  it('every ground spot has at least one neighbour', () => {
    for (const s of SPOTS.filter((sp) => sp.layer === 'ground')) expect(neighboursOf(s.id).length).toBeGreaterThanOrEqual(1);
  });

  it('far-apart spots are not next to each other', () => {
    expect(areNextTo(spotById('tree-left'), spotById('field-7'))).toBe(false);
    expect(areNextTo(spotById('field-3'), spotById('field-6'))).toBe(false);
  });
});

describe('placement checks — "Put the duck next to the cow."', () => {
  const mission: PlaceMission = { type: 'place', id: 't', animal: 'duck', target: { type: 'nextTo', animal: 'cow' }, say: '' };
  const farm = place({}, 'cow', 'barn-side');

  it('accepts the duck on a spot next to the cow', () => {
    for (const n of neighboursOf('barn-side')) expect(checkPlacement(farm, mission, 'duck', n.id)).toEqual({ ok: true });
  });

  it('rejects the duck far away from the cow', () => {
    expect(checkPlacement(farm, mission, 'duck', 'tree-left')).toEqual({ ok: false, reason: 'wrong-place' });
    expect(checkPlacement(farm, mission, 'duck', 'fence-1')).toEqual({ ok: false, reason: 'wrong-place' });
    expect(checkPlacement(farm, mission, 'duck', 'barn')).toEqual({ ok: false, reason: 'wrong-place' });
  });

  it('rejects a different animal', () => {
    expect(checkPlacement(farm, mission, 'pig', 'field-2')).toEqual({ ok: false, reason: 'wrong-animal' });
  });

  it('rejects an occupied spot', () => {
    expect(checkPlacement(farm, mission, 'duck', 'barn-side')).toEqual({ ok: false, reason: 'occupied' });
  });

  it('validSpots lists exactly the free spots next to the cow', () => {
    expect(validSpots(farm, mission).sort()).toEqual(neighboursOf('barn-side').map((s) => s.id).sort());
  });
});

describe('zone targets', () => {
  const m = (zone: 'tree' | 'barn' | 'fence' | 'barnSide'): PlaceMission => ({ type: 'place', id: 'z', animal: 'sheep', target: { type: 'zone', zone }, say: '' });
  it('under the tree', () => {
    expect(checkPlacement({}, m('tree'), 'sheep', 'tree-left').ok).toBe(true);
    expect(checkPlacement({}, m('tree'), 'sheep', 'field-4').ok).toBe(false);
  });
  it('in the barn', () => {
    expect(checkPlacement({}, m('barn'), 'sheep', 'barn').ok).toBe(true);
    expect(checkPlacement({}, m('barn'), 'sheep', 'barn-side').ok).toBe(false);
  });
  it('on the fence', () => {
    expect(checkPlacement({}, m('fence'), 'sheep', 'fence-3').ok).toBe(true);
    expect(checkPlacement({}, m('fence'), 'sheep', 'field-1').ok).toBe(false);
  });
});

/**
 * Exhaustively play every scenario through every possible sequence of correct
 * placements and check that the game can never get stuck, that "Find the big
 * animal" always has exactly one answer, and that 7 animals end up on the farm.
 */
describe('scenarios are always solvable', () => {
  for (const scenario of SCENARIOS) {
    it(`scenario ${scenario.id}`, () => {
      let finals = 0;
      const walk = (farm: Farm, i: number) => {
        if (i === scenario.build.length) {
          expect(Object.keys(farm)).toHaveLength(COUNT_TARGET);
          for (const p of Object.values(farm)) expect(describePiece(farm, p.uid)).toMatch(/^(The|I can see) /);
          finals++;
          return;
        }
        const mission = scenario.build[i];
        if (mission.type === 'find') {
          expect(findAnswers(farm, mission.size)).toHaveLength(1);
          walk(farm, i + 1);
          return;
        }
        const options = validSpots(farm, mission);
        expect(options.length, `${mission.say} has no free spot`).toBeGreaterThan(0);
        for (const spotId of options) walk(place(farm, mission.animal, spotId, `${mission.id}`), i + 1);
      };
      walk({}, 0);
      expect(finals).toBeGreaterThan(0);
    });
  }
});

describe('describePiece', () => {
  it('describes real positions', () => {
    let farm = place({}, 'cow', 'barn-side', 'cow');
    farm = place(farm, 'duck', 'field-2', 'duck');
    farm = place(farm, 'horse', 'barn', 'horse');
    farm = place(farm, 'sheep', 'tree-left', 'sheep');
    farm = place(farm, 'hen', 'fence-1', 'hen');
    expect(describePiece(farm, 'duck')).toBe('The duck is next to the cow.');
    expect(describePiece(farm, 'horse')).toBe('The horse is in the barn.');
    expect(describePiece(farm, 'sheep')).toBe('The sheep is under the tree.');
    expect(describePiece(farm, 'hen')).toBe('The hen is on the fence.');
  });
});

describe('scenario rotation', () => {
  it('alternates', () => {
    expect([1, 2, 3, 4].map((p) => pickScenarioIndex(p, 2))).toEqual([0, 1, 0, 1]);
  });
});
