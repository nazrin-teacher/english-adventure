import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { HUNT_MISSIONS } from '../../content/school';
import { audio } from '../../services/audio';
import { Celebration, ListenButton, PillButton, asset } from '../../components/ui';
import { IconCheck } from '../../components/icons';
import { SpeakSteps } from '../../components/SpeakSteps';
import { GameScreen, at, shuffle, useGameStars, useToast } from '../../components/scene';

const GAME_ID = 'school-object-hunt';

/**
 * A real-world hunt: the child looks for the thing at home, comes back and
 * says what they found. No photos, uploads or personal data.
 * Six missions in two sets of three.
 */
export function ObjectHunt({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const missions = useMemo(() => shuffle(HUNT_MISSIONS, playIndex), [playIndex]);
  const [index, setIndex] = useState(0);
  const [saying, setSaying] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setIndex(0);
    setDone(false);
  }, [round]);

  const m = missions[index];
  const set = Math.floor(index / 3);
  const visible = missions.slice(set * 3, set * 3 + 3);

  useEffect(() => {
    if (!m || done || saying) return;
    const t = window.setTimeout(() => void audio.say(`${m.say} Go and look!`), 450);
    return () => window.clearTimeout(t);
  }, [m, done, saying]);

  const next = (found: boolean) => {
    const n = index + 1;
    if (found) toast.show('Well done!');
    if (n % 3 === 0 || n === missions.length) award(Math.min(3, Math.round((n / missions.length) * 3)), n === missions.length);
    if (n >= missions.length) setDone(true);
    else setIndex(n);
  };

  return (
    <GameScreen scene="hunt" onHome={onHome} onParent={onParent} stars={stars}>
      {m && !done && (
        <>
          {/* mission card */}
          <motion.div key={m.id} className="panel hunt__mission" style={at([475, 30, 1270, 370])} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <span className="hunt__badge">Mission {index + 1}</span>
            <div className="hunt__mission-row">
              <ListenButton text={m.say} size="md" label="Listen to the mission" />
              <p className="hunt__text">{m.say}</p>
            </div>
          </motion.div>

          {/* this set of missions: current glows, found ones are ticked */}
          <div className="hunt__cards" style={at([585, 395, 1245, 650])}>
            {visible.map((v) => {
              const pos = missions.indexOf(v);
              return (
                <div key={v.id} className={`hunt__card ${pos === index ? 'is-now' : pos < index ? 'is-done' : ''}`}>
                  {v.pictures.map((p) => (
                    <img key={p} src={asset(p)} alt="" />
                  ))}
                  {pos < index && (
                    <span className="hunt__tick">
                      <IconCheck size="100%" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="stage-actions" style={at([480, 690, 1230, 885])}>
            <PillButton tone="green" icon={<IconCheck size="100%" />} onClick={() => setSaying(true)} className="hunt__found">
              I found it!
            </PillButton>
            <button type="button" className="hunt__skip" onClick={() => next(false)}>
              Next one
            </button>
          </div>

          <div className="panel hunt__tip" style={at([1260, 600, 1640, 880])}>
            <strong>Grown-ups</strong>
            <span>Hunt together at home, then let your child say the sentence in English.</span>
          </div>
        </>
      )}
      {saying && m && (
        <SpeakSteps
          sentences={[m.found]}
          picture={<img src={asset(m.pictures[0])} alt="" />}
          onDone={() => {
            setSaying(false);
            next(true);
          }}
        />
      )}
      {toast.node}
      {done && <Celebration title="You are a super hunter!" stars={stars} onHome={onHome} onReplay={replay} />}
    </GameScreen>
  );
}
