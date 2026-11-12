import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { DESCRIBE, INTRO, MEMBERS, SOFA, SOFA_ORDER, type SofaMember } from '../../content/family';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, ListenButton, asset } from '../../components/ui';
import { SpeakSteps } from '../../components/SpeakSteps';
import { GameScreen, SW, SH, at, praise, shuffle, useGameStars, useToast } from '../../components/scene';

const GAME_ID = 'meet-my-family';
type Phase = 'meet' | 'find' | 'say' | 'done';

export function MeetFamily({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const [phase, setPhase] = useState<Phase>('meet');
  const [met, setMet] = useState<SofaMember[]>([]);
  const [selected, setSelected] = useState<SofaMember | null>(null);
  const [talk, setTalk] = useState<string[] | null>(null);
  const [findIndex, setFindIndex] = useState(0);
  const [sayIndex, setSayIndex] = useState(0);
  const [peek, setPeek] = useState(false);
  const toast = useToast();
  const findOrder = useMemo(() => shuffle(SOFA_ORDER, playIndex), [playIndex]);
  const sayOrder = useMemo(() => shuffle(SOFA_ORDER, playIndex + 5), [playIndex]);

  useEffect(() => {
    setPhase('meet');
    setMet([]);
    setSelected(null);
    setTalk(null);
    setFindIndex(0);
    setSayIndex(0);
  }, [round]);

  const findTarget = phase === 'find' ? findOrder[findIndex] : undefined;
  const sayTarget = phase === 'say' ? sayOrder[sayIndex] : undefined;
  const prompt =
    phase === 'meet'
      ? 'Meet my family! Tap a person.'
      : phase === 'find'
        ? `Where is ${findTarget === 'mum' || findTarget === 'dad' ? 'my ' : ''}${findTarget}? Tap.`
        : phase === 'say'
          ? 'Who is it? You say it!'
          : '';

  useEffect(() => {
    if (!prompt || talk) return;
    const t = window.setTimeout(() => void audio.say(prompt), 400);
    return () => window.clearTimeout(t);
  }, [prompt, talk]);

  useEffect(() => {
    if (phase === 'say') {
      setSelected(sayTarget ?? null);
      setPeek(false);
    }
  }, [phase, sayTarget]);

  const choose = (m: SofaMember) => {
    if (talk) return;
    playSfx('pop');
    if (phase === 'meet') {
      setSelected(m);
      setTalk([INTRO[m], DESCRIBE[m]]);
    } else if (phase === 'find' && findTarget) {
      if (m === findTarget) {
        setSelected(m);
        playSfx('success');
        const p = praise();
        toast.show(p);
        void audio.say(`${p} ${INTRO[m]}`).then(() => {
          if (findIndex + 1 >= findOrder.length) {
            award(2);
            setSelected(null);
            setPhase('say');
          } else setFindIndex(findIndex + 1);
        });
      } else {
        playSfx('soft-no');
        toast.show('Try again!', false);
        void audio.say(`That's ${m === 'mum' || m === 'dad' ? 'my ' : ''}${m}. Try again!`);
      }
    }
  };

  const finishTalk = () => {
    setTalk(null);
    if (phase === 'meet' && selected) {
      const next = met.includes(selected) ? met : [...met, selected];
      setMet(next);
      toast.show(praise());
      if (next.length >= SOFA_ORDER.length) {
        award(1);
        setSelected(null);
        setPhase('find');
      }
    } else if (phase === 'say') {
      if (sayIndex + 1 >= sayOrder.length) {
        award(3, true);
        setPhase('done');
      } else setSayIndex(sayIndex + 1);
    }
  };

  const spot = selected ? SOFA[selected].spot : null;
  return (
    <GameScreen scene="family" onHome={onHome} onParent={onParent} stars={stars} prompt={phase === 'done' ? undefined : prompt} tag={phase === 'meet' ? `${met.length} / 4` : phase === 'find' ? `${findIndex + 1} / 4` : phase === 'say' ? `${sayIndex + 1} / 4` : undefined}>
      {/* spotlight on the chosen person */}
      {spot && (
        <motion.div
          className="spotlight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: `radial-gradient(ellipse ${(spot[2] / SW) * 100 * 1.15}% ${(spot[2] / SH) * 100 * 1.55}% at ${(spot[0] / SW) * 100}% ${(spot[1] / SH) * 100}%, transparent 60%, rgba(25, 10, 50, 0.5) 100%)`,
          }}
        />
      )}
      {/* each person can be tapped in the picture too */}
      {SOFA_ORDER.map((m) => (
        <button key={m} type="button" className="person-hotspot" style={at(SOFA[m].box)} aria-label={MEMBERS[m].word} onClick={() => choose(m)} />
      ))}

      {/* the girl's speech bubble */}
      {selected && (phase !== 'say' || peek) && (
        <motion.div key={selected + phase} className="bubble" style={{ ...at([60, 70, 690, 300]), fontSize: 'max(20px, 3.6cqw)' }} initial={{ scale: 0.7 }} animate={{ scale: 1 }}>
          {INTRO[selected]}
        </motion.div>
      )}

      {/* family picture tiles (separate pictures) */}
      <div className="family-tray" style={at([600, 690, 1560, 900])}>
        {SOFA_ORDER.map((m) => (
          <button
            key={m}
            type="button"
            className={`family-tile ${selected === m ? 'is-selected' : ''} ${met.includes(m) && phase === 'meet' ? 'is-done' : ''}`}
            onClick={() => choose(m)}
            aria-label={`${MEMBERS[m].word} picture`}
            disabled={phase === 'say'}
          >
            <img src={asset(MEMBERS[m].tile)} alt="" draggable={false} />
          </button>
        ))}
      </div>

      {/* "say" phase: the child speaks first, then can check */}
      {phase === 'say' && sayTarget && !talk && (
        <div className="stage-actions is-big" style={at([700, 470, 1560, 680])}>
          <ListenButton text={INTRO[sayTarget]} size="lg" label="Check: listen" />
          <button type="button" className="pill-btn tone-green" onClick={() => (setPeek(true), setTalk([INTRO[sayTarget]]))}>
            <span className="pill-btn__text">I said it!</span>
          </button>
        </div>
      )}

      {talk && selected && <SpeakSteps key={talk.join()} sentences={talk} picture={<img src={asset(MEMBERS[selected].tile)} alt="" />} onDone={finishTalk} />}
      {toast.node}
      {phase === 'done' && <Celebration title="What a lovely family!" stars={stars} onHome={onHome} onReplay={replay} />}
    </GameScreen>
  );
}
