import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useApp } from '../hooks/useApp';
import { audio } from '../services/audio';
import { playSfx } from '../services/sfx';
import { HomeButton, ListenButton, ParentButton, StarPill, asset } from './ui';
import './scene.css';

/** Reference illustrations are 1672 × 941; all scene boxes use those pixels. */
export const SW = 1672;
export const SH = 941;
export type Box = [number, number, number, number];

/** Absolute position (in %) for a [left, top, right, bottom] box in scene pixels. */
export const at = ([l, t, r, b]: Box, w = SW, h = SH): CSSProperties => ({
  left: `${(l / w) * 100}%`,
  top: `${(t / h) * 100}%`,
  width: `${((r - l) / w) * 100}%`,
  height: `${((b - t) / h) * 100}%`,
});

/**
 * Full-screen game frame: blurred backdrop, a fixed-ratio stage with the
 * scene picture, and the shared top bar (home, spoken prompt, stars, grown-ups).
 */
export function GameScreen({
  scene,
  onHome,
  onParent,
  stars,
  prompt,
  tag,
  promptExtra,
  children,
  className = '',
}: {
  scene: string;
  onHome: () => void;
  onParent: () => void;
  stars: number;
  prompt?: string;
  tag?: string;
  promptExtra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const bg = asset(`art/scenes/${scene}.webp`);
  return (
    <div className={`scene-game ${className}`} style={{ backgroundImage: `url(${bg})` }}>
      <div className="scene-stage">
        <img className="scene-stage__bg" src={bg} alt="" draggable={false} />
        {children}
        <div className="scene-top">
          <HomeButton onClick={onHome} />
          {prompt ? (
            <motion.div key={prompt} className="prompt" initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              {tag && <span className="prompt__tag">{tag}</span>}
              <div className="prompt__body">
                <ListenButton text={prompt} size="sm" label="Listen to the instruction" />
                <p className="prompt__text">{prompt}</p>
                {promptExtra}
              </div>
            </motion.div>
          ) : (
            <span />
          )}
          <div className="scene-top__right">
            <StarPill stars={stars} className="scene-stars" />
            <ParentButton onOpen={onParent} />
          </div>
        </div>
      </div>
      <div className="rotate-hint" role="alert">
        <div className="rotate-hint__phone" aria-hidden />
        <p>Turn your screen sideways</p>
      </div>
    </div>
  );
}

/** A separate, tappable picture placed on the scene. */
export function Sprite({
  src,
  box,
  label,
  onClick,
  state,
  className = '',
  style,
  disabled,
  children,
}: {
  src: string;
  box: Box;
  label: string;
  onClick?: () => void;
  state?: 'glow' | 'right' | 'wrong' | 'dim' | 'done';
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      className={`sprite ${state ? `is-${state}` : ''} ${className}`}
      style={{ ...at(box), ...style }}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={onClick && !disabled ? { scale: 0.93 } : undefined}
      animate={state === 'wrong' ? { rotate: [0, -6, 6, -4, 0] } : state === 'right' ? { y: [0, -16, 0], scale: [1, 1.08, 1] } : { rotate: 0, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <img src={asset(src)} alt="" draggable={false} />
      {children}
    </motion.button>
  );
}

/** Short-lived feedback bubble ("Great job!", "Try again!"). */
export function useToast() {
  const [toast, setToast] = useState<{ text: string; good: boolean } | null>(null);
  const timer = useRef<number | null>(null);
  const show = useCallback((text: string, good = true) => {
    setToast({ text, good });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2000);
  }, []);
  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);
  const node = toast ? (
    <motion.div key={toast.text} className={`scene-toast ${toast.good ? '' : 'is-soft'}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} role="status">
      {toast.text}
    </motion.div>
  ) : null;
  return { show, node };
}

export const PRAISE = ['Great job!', 'Well done!', 'Super!', 'Brilliant!', 'Yes! Good job!'];
export const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

/** Stars + completion for one game; stars only ever go up during a play. */
export function useGameStars(gameId: string) {
  const { recordStars, startPlay, game } = useApp();
  const [stars, setStars] = useState(0);
  const [round, setRound] = useState(0);
  const [firstPlay] = useState(() => game(gameId).plays + 1);
  const counted = useRef(-1);
  useEffect(() => {
    if (counted.current === round) return;
    counted.current = round;
    startPlay(gameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);
  const award = useCallback(
    (n: number, finished = false) => {
      setStars((s) => Math.max(s, n));
      recordStars(gameId, n, finished);
    },
    [gameId, recordStars],
  );
  const replay = useCallback(() => {
    setStars(0);
    setRound((r) => r + 1);
  }, []);
  return { stars, award, replay, round, playIndex: firstPlay + round };
}

/** Speak, then resolve (with a gentle success sound first when `good`). */
export async function sayGood(text: string) {
  playSfx('success');
  await audio.say(text);
}
export async function sayTryAgain(text: string) {
  playSfx('soft-no');
  await audio.say(text);
}

/** Simple seeded shuffle so replays vary but tests stay deterministic. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const a = [...items];
  let s = (seed * 9301 + 49297) % 233280 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
