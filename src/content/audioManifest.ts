/**
 * Recorded audio files.
 *
 * To replace browser speech with professional voice recordings, drop files into
 * `public/audio/` and add one line per sentence below, e.g.
 *
 *   'Put the duck next to the cow.': 'audio/farm/put-duck-next-to-cow.mp3',
 *
 * Keys are matched case-insensitively and ignore punctuation/extra spaces, so
 * "Put the duck next to the cow" and "put the duck next to the cow!" both match.
 * Anything not listed here falls back to speech synthesis automatically.
 */
export const recordings: Record<string, string> = {
  // (no recordings supplied yet)
};

export function normaliseSentence(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const index = new Map(Object.entries(recordings).map(([k, v]) => [normaliseSentence(k), v]));

export function findRecording(text: string): string | undefined {
  const file = index.get(normaliseSentence(text));
  if (!file) return undefined;
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
  return `${base}/${file.replace(/^\//, '')}`;
}
