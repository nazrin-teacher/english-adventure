/**
 * Family content. Pictures come from the supplied family illustrations.
 * "baby", "uncle", "aunt" and "cousin" are part of the word list but no
 * artwork exists for them yet, so they are not used (see README).
 */
export type Member = 'mum' | 'dad' | 'grandma' | 'grandpa' | 'sister' | 'brother';

export const MEMBERS: Record<Member, { word: string; he: boolean; tile: string }> = {
  mum: { word: 'mum', he: false, tile: 'art/family/mum.webp' },
  dad: { word: 'dad', he: true, tile: 'art/family/dad.webp' },
  grandma: { word: 'grandma', he: false, tile: 'art/family/grandma.webp' },
  grandpa: { word: 'grandpa', he: true, tile: 'art/family/grandpa.webp' },
  sister: { word: 'sister', he: false, tile: 'art/family/sister.webp' },
  brother: { word: 'brother', he: true, tile: 'art/family/brother.webp' },
};

export const MEMORY_MEMBERS: Member[] = ['mum', 'dad', 'grandma', 'grandpa', 'sister', 'brother'];
export const CARD_BACK = 'art/family/card-back.webp';

/** Memory levels: number of pairs (progressive difficulty). */
export const MEMORY_LEVELS = [3, 4, 6];

/* ---------- Meet My Family (the family on the sofa) ---------- */
export type SofaMember = 'mum' | 'dad' | 'grandma' | 'grandpa';
export const SOFA_ORDER: SofaMember[] = ['mum', 'dad', 'grandma', 'grandpa'];

/** Where each person sits in the picture: box + spotlight centre (scene pixels). */
export const SOFA: Record<SofaMember, { box: [number, number, number, number]; spot: [number, number, number] }> = {
  mum: { box: [612, 196, 900, 668], spot: [760, 390, 200] },
  dad: { box: [890, 200, 1180, 668], spot: [1030, 380, 200] },
  grandma: { box: [1140, 272, 1480, 668], spot: [1305, 420, 210] },
  grandpa: { box: [1440, 222, 1672, 668], spot: [1560, 380, 190] },
};

export const INTRO: Record<SofaMember, string> = {
  mum: "She's my mum.",
  dad: "He's my dad.",
  grandma: "She's my grandma.",
  grandpa: "He's my grandpa.",
};

export const DESCRIBE: Record<SofaMember, string> = {
  mum: "She's got curly hair.",
  dad: "He's got brown hair.",
  grandma: "She's got grey hair.",
  grandpa: "He's tall.",
};

/* ---------- Puppet Studio ---------- */
export type PuppetWho = 'mum' | 'dad' | 'grandma' | 'grandpa';
export type Wig = 'curly' | 'bun' | 'bob';
export type Shirt = 'purple' | 'flower' | 'stripes';
export type Face = 'happy' | 'laugh' | 'smile';

export const PUPPET_WHO: PuppetWho[] = ['mum', 'dad', 'grandma', 'grandpa'];
export const WIGS: Wig[] = ['curly', 'bun', 'bob'];
export const SHIRTS: Shirt[] = ['flower', 'purple', 'stripes'];
export const FACES: Face[] = ['happy', 'laugh', 'smile'];

export const WIG_WORDS: Record<Wig, string> = { curly: 'curly hair', bun: 'yellow hair', bob: 'black hair' };

/** How each wig sits on the round face (relative to face width). */
export const WIG_FIT: Record<Wig, { w: number; top: number }> = {
  curly: { w: 1.5, top: -0.22 },
  bun: { w: 1.12, top: -0.42 },
  bob: { w: 1.32, top: -0.16 },
};

export const puppetSentences = (who: PuppetWho, wig: Wig) => [
  `This is my ${who}.`,
  `${who === 'dad' || who === 'grandpa' ? "He's" : "She's"} got ${WIG_WORDS[wig]}.`,
];
