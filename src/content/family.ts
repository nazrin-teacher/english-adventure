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
export type Wig = 'curly' | 'bob' | 'bun';
export type HairColour = 'brown' | 'black' | 'yellow' | 'grey';
export type Shirt = 'flower' | 'purple' | 'stripes' | 'jumper' | 'cardigan' | 'dress';
export type Face = 'happy' | 'laugh' | 'smile';
export type Extra = 'none' | 'glasses' | 'bow' | 'earrings' | 'necklace';

export const PUPPET_WHO: PuppetWho[] = ['mum', 'dad', 'grandma', 'grandpa'];
export const WIGS: Wig[] = ['curly', 'bob', 'bun'];
export const HAIR_COLOURS: HairColour[] = ['brown', 'black', 'yellow', 'grey'];
export const SHIRTS: Shirt[] = ['flower', 'purple', 'stripes', 'jumper', 'cardigan', 'dress'];
export const FACES: Face[] = ['happy', 'laugh', 'smile'];
export const EXTRAS: Extra[] = ['none', 'glasses', 'bow', 'earrings', 'necklace'];

/** Hair type words used in sentences ("bun" has no simple adjective, so it is left out). */
export const WIG_TYPE: Record<Wig, string> = { curly: 'curly', bob: 'straight', bun: '' };
export const HAIR_HEX: Record<HairColour, string> = { brown: '#8a4a1f', black: '#3b3232', yellow: '#ffcf45', grey: '#d9d6d2' };
/** Each wig picture's own colour and how bright it must be made before tinting. */
export const WIG_BASE: Record<Wig, { aspect: number; lift: number }> = {
  curly: { aspect: 109 / 89, lift: 2.3 },
  bob: { aspect: 115 / 110, lift: 4.2 },
  bun: { aspect: 92 / 92, lift: 1.15 },
};
/** How each wig sits on the round face (relative to face width). */
export const WIG_FIT: Record<Wig, { w: number; top: number }> = {
  curly: { w: 1.5, top: -0.22 },
  bun: { w: 1.12, top: -0.42 },
  bob: { w: 1.32, top: -0.16 },
};
/** The usual look of each family puppet (used when a puppet is first chosen). */
export const DEFAULT_LOOK: Record<PuppetWho, { wig: Wig; hair: HairColour; shirt: Shirt; extra: Extra }> = {
  mum: { wig: 'curly', hair: 'brown', shirt: 'flower', extra: 'earrings' },
  dad: { wig: 'bob', hair: 'black', shirt: 'stripes', extra: 'none' },
  grandma: { wig: 'curly', hair: 'grey', shirt: 'cardigan', extra: 'glasses' },
  grandpa: { wig: 'bob', hair: 'grey', shirt: 'jumper', extra: 'glasses' },
};

export const isHe = (who: PuppetWho) => who === 'dad' || who === 'grandpa';
export const hairWords = (wig: Wig, hair: HairColour) => [WIG_TYPE[wig], hair].filter(Boolean).join(' ');

export function puppetSentences(look: { who: PuppetWho; wig: Wig; hair: HairColour; extra: Extra }): string[] {
  const p = isHe(look.who) ? "He's" : "She's";
  const out = [`This is my ${look.who}.`, `${p} got ${hairWords(look.wig, look.hair)} hair.`];
  if (look.extra === 'glasses') out.push(`${p} got glasses.`);
  if (look.extra === 'bow') out.push(`${p} got a pink bow.`);
  return out;
}

/** Listening orders: build exactly this puppet. */
export const PUPPET_ORDERS: { who: PuppetWho; wig: Wig; hair: HairColour; say: string }[] = [
  { who: 'grandma', wig: 'curly', hair: 'grey', say: "Make my grandma. She's got curly grey hair." },
  { who: 'dad', wig: 'bob', hair: 'black', say: "Make my dad. He's got straight black hair." },
  { who: 'mum', wig: 'curly', hair: 'yellow', say: "Make my mum. She's got curly yellow hair." },
  { who: 'grandpa', wig: 'bob', hair: 'grey', say: "Make my grandpa. He's got straight grey hair." },
];
