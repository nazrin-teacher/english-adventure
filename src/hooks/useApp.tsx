import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { audio } from '../services/audio';
import { setSfxEnabled } from '../services/sfx';
import {
  loadState,
  saveState,
  withPlayStarted,
  withReset,
  withSettings,
  withStars,
  emptyGame,
  type GameProgress,
  type ProgressState,
  type Settings,
} from '../services/progress';

type AppCtx = {
  state: ProgressState;
  game: (id: string) => GameProgress;
  startPlay: (id: string) => number;
  recordStars: (id: string, stars: number, finished: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetProgress: () => void;
};

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    audio.setEnabled(state.settings.sound);
    setSfxEnabled(state.settings.sound);
  }, [state.settings.sound]);

  const game = useCallback((id: string) => state.games[id] ?? emptyGame(), [state.games]);

  const startPlay = useCallback(
    (id: string) => {
      const plays = (state.games[id]?.plays ?? 0) + 1;
      setState((s) => withPlayStarted(s, id));
      return plays;
    },
    [state.games],
  );

  const recordStars = useCallback((id: string, stars: number, finished: boolean) => {
    setState((s) => withStars(s, id, stars, finished));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => setState((s) => withSettings(s, patch)), []);
  const resetProgress = useCallback(() => setState((s) => withReset(s)), []);

  const value = useMemo(
    () => ({ state, game, startPlay, recordStars, updateSettings, resetProgress }),
    [state, game, startPlay, recordStars, updateSettings, resetProgress],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}

/** Subscribe to whether the narrator is currently speaking (for mouth/bubble animation). */
export function useSpeaking() {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    const off = audio.subscribe((s) => setSpeaking(s));
    return () => {
      off();
    };
  }, []);
  return speaking;
}
