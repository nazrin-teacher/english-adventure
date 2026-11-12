import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { THINGS, THING_ORDER, itsA } from '../../content/school';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, MicMeter, PillButton, RoundButton, asset } from '../../components/ui';
import { IconCheck, IconSpeaker } from '../../components/icons';
import { GameScreen, at, praise, shuffle, useGameStars, useToast } from '../../components/scene';
import { starsFor } from '../which-animal/logic';

const GAME_ID = 'its-a';

/**
 * Listen → repeat → "I said it!". The boy points at one school object at a time.
 * There is no pronunciation scoring: the child (or a grown-up) confirms.
 */
export function ItsA({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const order = useMemo(() => shuffle(THING_ORDER, playIndex + 3), [playIndex]);
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setIndex(0);
    setDone(false);
  }, [round]);

  const thing = order[index];
  const sentence = thing ? itsA(thing) : '';

  useEffect(() => {
    if (done || !sentence) return;
    setHeard(false);
    const t = window.setTimeout(() => void audio.say(sentence).then(() => audio.say('Your turn! Say it.')), 500);
    return () => window.clearTimeout(t);
  }, [sentence, done]);

  const saidIt = async () => {
    if (busy) return;
    setBusy(true);
    playSfx('success');
    const p = praise();
    toast.show(p);
    await audio.say(p);
    const next = index + 1;
    const s = starsFor(next, order.length);
    if (s > 0) award(s, next === order.length);
    setBusy(false);
    if (next >= order.length) setDone(true);
    else setIndex(next);
  };

  return (
    <GameScreen scene="its-a" onHome={onHome} onParent={onParent} stars={stars} tag={undefined}>
      {thing && !done && (
        <>
          {/* speech bubble */}
          <motion.div key={sentence} className="bubble its-a__bubble" style={at([545, 80, 1110, 330])} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {sentence}
          </motion.div>

          {/* the object, floating where the boy points */}
          <motion.button
            key={thing}
            type="button"
            className="sprite its-a__object is-glow"
            style={at([1000, 170, 1440, 630])}
            aria-label={THINGS[thing].word}
            initial={{ x: 120, opacity: 0, rotate: 12 }}
            animate={{ x: 0, opacity: 1, rotate: [0, -3, 3, 0], y: [0, -10, 0] }}
            transition={{ duration: 0.6, y: { repeat: Infinity, duration: 2.6, ease: 'easeInOut' }, rotate: { repeat: Infinity, duration: 4 } }}
            onClick={() => (playSfx('pop'), void audio.say(THINGS[thing].word))}
          >
            <img src={asset(THINGS[thing].image)} alt="" draggable={false} />
          </motion.button>

          <div className="stage-actions is-big" style={at([790, 370, 990, 565])}>
            <RoundButton tone="purple" size="lg" label="Listen" onClick={() => void audio.say(sentence)}>
              <IconSpeaker size="58%" />
            </RoundButton>
          </div>

          <div className="stage-actions is-big" style={at([300, 690, 1400, 880])}>
            <MicMeter onHeard={setHeard} />
            <PillButton tone="green" icon={<IconCheck size="100%" />} onClick={() => void saidIt()} pulse={heard}>
              I said it!
            </PillButton>
          </div>

          <div className="its-a__progress" style={at([1450, 120, 1660, 700])} aria-label={`${index + 1} of ${order.length}`}>
            {order.map((t, i) => (
              <span key={t} className={i < index ? 'done' : i === index ? 'now' : ''}>
                <img src={asset(THINGS[t].image)} alt="" />
              </span>
            ))}
          </div>
        </>
      )}
      {toast.node}
      {done && <Celebration title="Super speaking!" stars={stars} onHome={onHome} onReplay={replay} />}
    </GameScreen>
  );
}
