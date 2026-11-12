import type { ComponentType } from 'react';
import type { GameId } from '../content/games';
import { FarmDesigner } from './farm-designer/FarmDesigner';
import { WhichAnimal } from './which-animal/WhichAnimal';
import { ICanSee } from './i-can-see/ICanSee';
import { SchoolMatch } from './school-match/SchoolMatch';
import { ItsA } from './its-a/ItsA';
import { ObjectHunt } from './object-hunt/ObjectHunt';
import { FamilyMemory } from './family-memory/FamilyMemory';
import { MeetFamily } from './meet-family/MeetFamily';
import { PuppetStudio } from './puppet-studio/PuppetStudio';

export type GameProps = { onHome: () => void; onParent: () => void };

/** Playable games. A game listed in content/games.ts but missing here shows as "coming soon". */
export const GAME_COMPONENTS: Partial<Record<GameId, ComponentType<GameProps>>> = {
  'school-objects-match': SchoolMatch,
  'its-a': ItsA,
  'school-object-hunt': ObjectHunt,
  'family-memory': FamilyMemory,
  'meet-my-family': MeetFamily,
  'puppet-studio': PuppetStudio,
  'which-animal': WhichAnimal,
  'i-can-see': ICanSee,
  'build-my-farm': FarmDesigner,
};
