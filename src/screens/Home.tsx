import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState, type CSSProperties } from 'react';
import { GAMES, type GameId, type GameInfo } from '../content/games';
import layout from '../content/homeLayout.json';
import { useApp } from '../hooks/useApp';
import { audio } from '../services/audio';
import { playSfx } from '../services/sfx';
import { ParentButton, SoundToggle, StarPill, asset } from '../components/ui';
import { IconLock } from '../components/icons';
import { GAME_COMPONENTS } from '../games/registry';
import './home.css';

const SW = layout.scene.width;
const SH = layout.scene.height;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function useWideLayout() {
  const get = () => typeof window !== 'undefined' && window.innerWidth >= 640 && window.innerWidth / window.innerHeight >= 1.15;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const on = () => setWide(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return wide;
}

type CardProps = { game: GameInfo; index: number; onOpen: (id: GameId) => void; style?: CSSProperties; placed: boolean };

function GameCard({ game: info, index, onOpen, style, placed }: CardProps) {
  const game = { ...info, available: Boolean(GAME_COMPONENTS[info.id]) };
  const { game: progress } = useApp();
  const p = progress(game.id);
  const controls = useAnimation();
  const cardLayout = layout.cards[game.id];
  const [l, t, r, b] = cardLayout.box;
  const cw = r - l, ch = b - t;
  const [sl, st, sr, sb] = cardLayout.stars;

  useEffect(() => {
    void controls.start({ opacity: 1, y: 0, scale: 1, transition: { delay: 0.05 * index, type: 'spring', stiffness: 220, damping: 18 } });
  }, [controls, index]);

  const press = () => {
    if (game.available) {
      playSfx('pop');
      void audio.say(game.spokenTitle);
      onOpen(game.id);
    } else {
      playSfx('soft-no');
      void controls.start({ rotate: [0, -2.5, 2.5, -1.5, 0], transition: { duration: 0.45 } });
      void audio.say(`${game.spokenTitle}. Coming soon!`);
    }
  };

  return (
    <motion.button
      type="button"
      className={`home-card ${placed ? 'is-placed' : ''} ${game.available ? '' : 'is-soon'}`}
      style={{ ...style, aspectRatio: `${cw} / ${ch}` }}
      aria-label={`${game.title}${game.available ? '' : ' — coming soon'}. ${p.stars} of 3 stars.`}
      onClick={press}
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={controls}
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
    >
      <img src={asset(`art/home/card-${game.id}.webp`)} alt="" draggable={false} />
      <span
        className="home-card__stars"
        style={{ left: pct(sl, cw), top: pct(st, ch), width: pct(sr - sl, cw), height: pct(sb - st, ch) }}
      >
        <StarPill stars={p.stars} />
      </span>
      {!game.available && (
        <span className="home-card__lock" aria-hidden>
          <IconLock size="52%" />
        </span>
      )}
      {p.completed && <span className="home-card__done" aria-hidden />}
    </motion.button>
  );
}

export function Home({ onOpen, onParent }: { onOpen: (id: GameId) => void; onParent: () => void }) {
  const wide = useWideLayout();

  useEffect(() => {
    // Gentle spoken welcome (only if the browser allows audio before a tap).
    const t = window.setTimeout(() => void audio.say('Hello! Choose a game.'), 400);
    return () => window.clearTimeout(t);
  }, []);

  const corner = (key: 'settings' | 'sound') => {
    const [l, t, r, b] = layout.buttons[key];
    return { left: pct(l, SW), top: pct(t, SH), width: pct(r - l, SW), height: pct(b - t, SH) };
  };

  if (wide) {
    return (
      <div className="home home--wide" style={{ backgroundImage: `url(${asset('art/home/home-scene-blur.webp')})` }}>
        <div className="home-stage" style={{ aspectRatio: `${SW} / ${SH}` }}>
          <img className="home-stage__bg" src={asset('art/home/home-scene.webp')} alt="" draggable={false} />
          <h1 className="sr-only">English Adventure</h1>
          <div className="home-stage__corner" style={corner('settings')}>
            <ParentButton onOpen={onParent} />
          </div>
          <div className="home-stage__corner" style={corner('sound')}>
            <SoundToggle />
          </div>
          {GAMES.map((g, i) => {
            const [l, t, r] = layout.cards[g.id].box;
            return (
              <GameCard
                key={g.id}
                game={g}
                index={i}
                onOpen={onOpen}
                placed
                style={{ position: 'absolute', left: pct(l, SW), top: pct(t, SH), width: pct(r - l, SW) }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="home home--narrow" style={{ backgroundImage: `url(${asset('art/home/home-scene-blur.webp')})` }}>
      <header className="home-narrow__head">
        <ParentButton onOpen={onParent} />
        <img className="home-narrow__logo" src={asset('art/home/logo.webp')} alt="English Adventure" draggable={false} />
        <SoundToggle />
      </header>
      <div className="home-narrow__grid">
        {GAMES.map((g, i) => (
          <GameCard key={g.id} game={g} index={i} onOpen={onOpen} placed={false} />
        ))}
      </div>
    </div>
  );
}
