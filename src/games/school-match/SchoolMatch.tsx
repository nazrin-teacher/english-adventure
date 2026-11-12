import { useCallback, useEffect, useMemo, useState } from 'react';
import { THINGS, THING_ORDER, findPrompt, type SchoolThing } from '../../content/school';
import { spriteBox } from '../../content/sprites';
import { audio } from '../../services/audio';
import { Celebration } from '../../components/ui';
import { GameScreen, Sprite, praise, sayGood, sayTryAgain, shuffle, useGameStars, useToast } from '../../components/scene';
import { starsFor } from '../which-animal/logic';

const GAME_ID = 'school-objects-match';
/** Desk and chair stand behind the table objects. */
const Z: Partial<Record<SchoolThing, number>> = { desk: 4, chair: 4 };

export function SchoolMatch({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const order = useMemo(() => shuffle(THING_ORDER, playIndex), [playIndex]);
  const [index, setIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState<SchoolThing | null>(null);
  const [right, setRight] = useState<SchoolThing | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setIndex(0);
    setDone(false);
    setMisses(0);
  }, [round]);

  const target = order[index];
  const prompt = target ? findPrompt(target, index) : '';
  const say = useCallback(() => void audio.say(prompt), [prompt]);

  useEffect(() => {
    if (done || !prompt) return;
    const t = window.setTimeout(say, 400);
    return () => window.clearTimeout(t);
  }, [prompt, say, done]);

  const tap = async (t: SchoolThing) => {
    if (busy || done) return;
    if (t === target) {
      setBusy(true);
      setRight(t);
      const p = praise();
      toast.show(p);
      await sayGood(`${p} The ${THINGS[t].word}!`);
      const next = index + 1;
      const s = starsFor(next, order.length);
      if (s > 0) award(s, next === order.length);
      setRight(null);
      setMisses(0);
      setBusy(false);
      if (next >= order.length) setDone(true);
      else setIndex(next);
    } else {
      setWrong(t);
      window.setTimeout(() => setWrong(null), 600);
      setMisses((m) => m + 1);
      toast.show('Try again!', false);
      const thing = THINGS[t];
      await sayTryAgain(`${thing.plural ? 'They are' : "That's"} the ${thing.word}. ${prompt}`);
    }
  };

  return (
    <GameScreen scene="classroom" onHome={onHome} onParent={onParent} stars={stars} prompt={done ? undefined : prompt} tag={`${Math.min(index + 1, order.length)} / ${order.length}`}>
      {THING_ORDER.map((t) => (
        <Sprite
          key={t}
          src={THINGS[t].image}
          box={spriteBox(t)}
          label={THINGS[t].word}
          onClick={() => void tap(t)}
          style={{ zIndex: Z[t] ?? 10 }}
          state={right === t ? 'right' : wrong === t ? 'wrong' : misses >= 2 && target === t ? 'glow' : undefined}
        />
      ))}
      {toast.node}
      {done && <Celebration title="Great! You know your school things!" stars={stars} onHome={onHome} onReplay={replay} />}
    </GameScreen>
  );
}
