/**
 * Local progress persistence. No names, accounts or personal data — only
 * per-game stars and a few settings, stored in this browser.
 */

export type GameProgress = {
  /** Best number of stars ever earned (0–3). */
  stars: number;
  completed: boolean;
  timesCompleted: number;
  /** Used to alternate mission scenarios on replay. */
  plays: number;
};

export type Settings = {
  sound: boolean;
  mic: boolean;
};

export type ProgressState = {
  version: 1;
  games: Record<string, GameProgress>;
  settings: Settings;
};

export const STORAGE_KEY = 'english-adventure:v1';

export const emptyGame = (): GameProgress => ({ stars: 0, completed: false, timesCompleted: 0, plays: 0 });

export const defaultState = (): ProgressState => ({
  version: 1,
  games: {},
  settings: { sound: true, mic: true },
});

let memoryFallback: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryFallback;
  }
}

function writeRaw(v: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    memoryFallback = v;
  }
}

function clampStars(n: unknown) {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 0;
  return Math.max(0, Math.min(3, v));
}

/** Parse and sanitise whatever is in storage; never throws. */
export function parseState(raw: string | null): ProgressState {
  const base = defaultState();
  if (!raw) return base;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return base;
    const games: Record<string, GameProgress> = {};
    if (data.games && typeof data.games === 'object') {
      for (const [id, g] of Object.entries<Record<string, unknown>>(data.games)) {
        if (!g || typeof g !== 'object') continue;
        games[id] = {
          stars: clampStars(g.stars),
          completed: Boolean(g.completed),
          timesCompleted: Math.max(0, Number(g.timesCompleted) || 0),
          plays: Math.max(0, Number(g.plays) || 0),
        };
      }
    }
    const s = data.settings ?? {};
    return {
      version: 1,
      games,
      settings: {
        sound: s.sound !== false,
        mic: s.mic !== false,
      },
    };
  } catch {
    return base;
  }
}

export function loadState(): ProgressState {
  return parseState(readRaw());
}

export function saveState(state: ProgressState) {
  writeRaw(JSON.stringify(state));
}

/** Record that a game was started (for scenario rotation). */
export function withPlayStarted(state: ProgressState, gameId: string): ProgressState {
  const g = state.games[gameId] ?? emptyGame();
  return { ...state, games: { ...state.games, [gameId]: { ...g, plays: g.plays + 1 } } };
}

/** Keep the best star count; mark complete when all three stars were earned. */
export function withStars(state: ProgressState, gameId: string, stars: number, finished: boolean): ProgressState {
  const g = state.games[gameId] ?? emptyGame();
  const next: GameProgress = {
    ...g,
    stars: Math.max(g.stars, clampStars(stars)),
    completed: g.completed || finished,
    timesCompleted: g.timesCompleted + (finished ? 1 : 0),
  };
  return { ...state, games: { ...state.games, [gameId]: next } };
}

export function withSettings(state: ProgressState, patch: Partial<Settings>): ProgressState {
  return { ...state, settings: { ...state.settings, ...patch } };
}

export function withReset(state: ProgressState): ProgressState {
  return { ...state, games: {} };
}
