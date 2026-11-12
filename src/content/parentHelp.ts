import type { GameId } from './games';

/** Short guidance for grown-ups, shown only inside the parent panel. */
export const GENERAL_HELP = [
  'Every instruction is spoken — your child does not need to read.',
  'Tap a speaker button to hear a sentence again, as often as you like.',
  'Encourage your child to say each sentence out loud. Mistakes are fine: just try again.',
  'The microphone is optional. It only shows a live “voice meter”; nothing is recorded, stored or sent.',
  'Progress is saved on this device only. No names, emails or accounts.',
];

export const GAME_HELP: Record<GameId, string> = {
  'school-objects-match': 'Listen to the instruction and tap the right school object.',
  'its-a': 'Listen, say the sentence together, then tap “I said it!”.',
  'school-object-hunt': 'Find the object at home, come back and say its name in English.',
  'family-memory': 'Turn the cards, find matching family members and say the word.',
  'meet-my-family': 'Choose a family member, listen and repeat the sentence.',
  'puppet-studio': 'Make a family puppet, then introduce it in English.',
  'which-animal': 'Listen to the sound or clue and tap the right animal.',
  'i-can-see': 'Choose an animal and describe it: “I can see a …”.',
  'build-my-farm':
    'Listen to each mission and drag the animal to the right place — or tap the animal, then tap the place. Then count the animals, describe the farm and feed the animals together.',
};
