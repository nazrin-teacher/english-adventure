import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CARD_BACK, MEMBERS, MEMORY_LEVELS, type Member } from '../../content/family';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, ListenButton, asset } from '../../components/ui';
import { GameScreen, at, useGameStars, useToast } from '../../components/scene';
import { flip, gridFor, makeDeck } from './logic';

const GAME_ID = 'family-memory';
const BOARD: [number, number, number, number] = [515, 118, 1480, 690];

export function FamilyMemory({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const [level, setLevel] = useState(0);
  const deck = useMemo(() => makeDeck(MEMORY_LEVELS[level] ?? 3, playIndex * 5 + level), [level, playIndex]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [last, setLast] = useState<Member | null>(null);
  const [done, setDone] = useState(false);
  const toast = useToast();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setLevel(0);
    setDone(false);
  }, [round]);
  useEffect(() => {
    setOpen([]);
    setMatched([]);
    setLast(null);
    const t = window.setTimeout(() => void audio.say(level === 0 ? 'Find two the same. Turn the cards!' : 'More cards! Find the family.'), 400);
    return () => window.clearTimeout(t);
  }, [deck, level]);
  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);

  const tap = (id: number) => {
    const result = flip(deck, open, matched, id);
    if (result === 'ignored') return;
    const card = deck.find((c) => c.id === id)!;
    playSfx('pop');
    setLast(card.member);
    void audio.say(MEMBERS[card.member].word);
    if (result === 'first') {
      setOpen([id]);
      return;
    }
    const pair = [open[0], id];
    setOpen(pair);
    if (result === 'match') {
      timer.current = window.setTimeout(() => {
        playSfx('success');
        const m = [...matched, ...pair];
        setMatched(m);
        setOpen([]);
        toast.show(`${MEMBERS[card.member].word}! A match!`);
        void audio.say(`Yes! ${MEMBERS[card.member].word}!`);
        if (m.length === deck.length) {
          award(level + 1, level + 1 === MEMORY_LEVELS.length);
          timer.current = window.setTimeout(() => {
            if (level + 1 >= MEMORY_LEVELS.length) setDone(true);
            else setLevel(level + 1);
          }, 1400);
        }
      }, 700);
    } else {
      timer.current = window.setTimeout(() => {
        playSfx('soft-no');
        setOpen([]);
      }, 1300);
    }
  };

  const { cols, rows } = gridFor(deck.length);
  return (
    <GameScreen scene="memory" onHome={onHome} onParent={onParent} stars={stars} prompt={done ? undefined : 'Find two the same!'} tag={`Level ${level + 1}`}>
      <div className="memory-board" style={{ ...at(BOARD), gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {deck.map((c) => {
          const up = open.includes(c.id) || matched.includes(c.id);
          return (
            <button
              key={`${level}-${c.id}`}
              type="button"
              className={`memory-card ${up ? 'is-up' : ''} ${matched.includes(c.id) ? 'is-matched' : ''}`}
              onClick={() => tap(c.id)}
              aria-label={up ? MEMBERS[c.member].word : 'Hidden card'}
            >
              <span className="memory-card__inner">
                <img className="memory-card__back" src={asset(CARD_BACK)} alt="" draggable={false} />
                <img className="memory-card__face" src={asset(MEMBERS[c.member].tile)} alt="" draggable={false} />
              </span>
            </button>
          );
        })}
      </div>

      {/* the word of the last card, like the label under the board */}
      <motion.div className="memory-word" style={at([470, 705, 1240, 890])} key={last ?? 'none'} initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        {last ? (
          <>
            <img src={asset(MEMBERS[last].tile)} alt="" />
            <span>{MEMBERS[last].word}</span>
            <ListenButton text={MEMBERS[last].word} size="md" label={`Listen: ${MEMBERS[last].word}`} />
          </>
        ) : (
          <span className="memory-word__hint">Turn a card!</span>
        )}
      </motion.div>
      {toast.node}
      {done && <Celebration title="Super memory!" stars={stars} onHome={onHome} onReplay={replay} />}
    </GameScreen>
  );
}
