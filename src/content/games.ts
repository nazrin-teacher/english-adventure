/**
 * The nine games shown on the home screen. Internal planning concepts
 * (course name, units, categories) are deliberately NOT part of this model.
 */
export type GameId =
  | 'school-objects-match'
  | 'its-a'
  | 'school-object-hunt'
  | 'family-memory'
  | 'meet-my-family'
  | 'puppet-studio'
  | 'which-animal'
  | 'i-can-see'
  | 'build-my-farm';

export type GameInfo = {
  id: GameId;
  title: string;
  /** Spoken when the card is focused/tapped, so non-readers hear the name. */
  spokenTitle: string;
  /** Card title pill colour (CSS custom property name from tokens.css). */
  tone: 'blue' | 'pink' | 'green' | 'purple' | 'orange' | 'red';
  /** Card background tint. */
  tint: 'sky' | 'sun' | 'mint' | 'lilac' | 'peach' | 'meadow';
  available: boolean;
  /** Collectible sticker earned when the game is completed. */
  sticker: string;
};

export const GAMES: GameInfo[] = [
  { id: 'school-objects-match', title: 'School Objects Match', spokenTitle: 'School Objects Match', tone: 'blue', tint: 'sky', available: true, sticker: 'art/school/pencil.webp' },
  { id: 'its-a', title: 'It’s a…!', spokenTitle: "It's a...!", tone: 'pink', tint: 'sun', available: true, sticker: 'art/school/book.webp' },
  { id: 'school-object-hunt', title: 'School Object Hunt', spokenTitle: 'School Object Hunt', tone: 'green', tint: 'peach', available: true, sticker: 'art/school/orange.webp' },
  { id: 'family-memory', title: 'My Family Memory', spokenTitle: 'My Family Memory', tone: 'purple', tint: 'lilac', available: true, sticker: 'art/family/mum.webp' },
  { id: 'meet-my-family', title: 'Meet My Family', spokenTitle: 'Meet My Family', tone: 'orange', tint: 'peach', available: true, sticker: 'art/family/grandpa.webp' },
  { id: 'puppet-studio', title: 'My Family Puppet Studio', spokenTitle: 'My Family Puppet Studio', tone: 'purple', tint: 'lilac', available: true, sticker: 'art/puppet/face-happy.webp' },
  { id: 'which-animal', title: 'Which Animal Is It?', spokenTitle: 'Which animal is it?', tone: 'green', tint: 'meadow', available: true, sticker: 'art/animals/cow.webp' },
  { id: 'i-can-see', title: 'I Can See…!', spokenTitle: 'I can see...!', tone: 'blue', tint: 'meadow', available: true, sticker: 'art/animals/duck.webp' },
  { id: 'build-my-farm', title: 'Little Farm Designer', spokenTitle: 'Little Farm Designer!', tone: 'red', tint: 'meadow', available: true, sticker: 'art/animals/sheep.webp' },
];

export const gameById = (id: string) => GAMES.find((g) => g.id === id);
