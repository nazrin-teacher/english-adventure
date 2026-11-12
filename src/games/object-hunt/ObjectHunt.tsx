import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { HUNT_MISSIONS, type HuntMission } from '../../content/school';
import { CARD_BACK } from '../../content/family';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, ListenButton, PillButton, asset } from '../../components/ui';
import { IconCheck } from '../../components/icons';
import { SpeakSteps } from '../../components/SpeakSteps';
import { CharacterRig } from '../../components/CharacterRig';
import { GameScreen, HoldToConfirm, at, praise, shuffle, useGameStars, useGuide, useToast , pace } from '../../components/scene';
import './hunt.css';

const GAME_ID = 'school-object-hunt';
type Phase = 'discover' | 'hunt' | 'treasures' | 'done';
const MISSION_COUNT = 5;
const SPEAK_TARGET = 3;

/** Five missions per play; "something orange" is always one of them. */
export function pickMissions(seed: number): HuntMission[] {
  const orange = HUNT_MISSIONS.find((m) => m.id === 'orange')!;
  const rest = shuffle(HUNT_MISSIONS.filter((m) => m.id !== 'orange'), seed).slice(0, MISSION_COUNT - 1);
  return shuffle([orange, ...rest], seed + 3);
}
const what = (m: HuntMission) => m.say.replace(/^Find /, '').replace(/\.$/, '');
const itIs = (m: HuntMission) => (m.id === 'orange' ? "It's orange." : `It's ${what(m)}.`);

/**
 * School Treasure Hunt: preview the mission cards → search the real home
 * (a grown-up confirms; the app never pretends to check) → describe the
 * treasure collection.
 */
export function ObjectHunt({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const missions = useMemo(() => pickMissions(playIndex), [playIndex]);
  const [phase, setPhase] = useState<Phase>('discover');
  const [flipped, setFlipped] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<'go' | 'back'>('go');
  const [found, setFound] = useState<string[]>([]);
  const [saying, setSaying] = useState<HuntMission | null>(null);
  const [spoken, setSpoken] = useState<string[]>([]);
  const [talk, setTalk] = useState<HuntMission | null>(null);
  const guide = useGuide();
  const toast = useToast();

  useEffect(() => {
    setPhase('discover');
    setFlipped([]);
    setIndex(0);
    setStep('go');
    setFound([]);
    setSpoken([]);
  }, [round]);

  const m = phase === 'hunt' ? missions[index] : undefined;
  const prompt =
    phase === 'discover'
      ? "Let's go on a treasure hunt! Turn the cards."
      : m
        ? step === 'go'
          ? `${m.say} Go and look!`
          : 'Did you find it? Show a grown-up!'
        : phase === 'treasures'
          ? 'Look at your treasures! Tap one and tell me.'
          : '';

  useEffect(() => {
    if (!prompt || saying || talk) return;
    const t = window.setTimeout(() => void audio.say(prompt), pace(400));
    return () => window.clearTimeout(t);
  }, [prompt, saying, talk]);

  const flip = (mi: HuntMission) => {
    playSfx('pop');
    void audio.say(mi.say);
    if (flipped.includes(mi.id)) return;
    const next = [...flipped, mi.id];
    setFlipped(next);
    if (next.length === missions.length) {
      window.setTimeout(() => {
        award(1);
        guide.react('cheer');
        toast.show('Ready? Go!');
        setPhase('hunt');
      }, 1500);
    }
  };

  const advance = (wasFound: boolean) => {
    const n = index + 1;
    setStep('go');
    if (n >= missions.length) {
      award(2);
      setPhase(found.length + (wasFound ? 1 : 0) > 0 ? 'treasures' : 'done');
    } else setIndex(n);
  };

  const confirmed = () => {
    if (!m) return;
    guide.react('cheer');
    setSaying(m);
  };
  const afterSaying = () => {
    const mi = saying!;
    setSaying(null);
    setFound((f) => [...f, mi.id]);
    toast.show('A new treasure!');
    playSfx('sparkle');
    advance(true);
  };

  const finishTalk = () => {
    const mi = talk!;
    setTalk(null);
    const next = spoken.includes(mi.id) ? spoken : [...spoken, mi.id];
    setSpoken(next);
    guide.react('cheer');
    toast.show(praise());
    if (next.length >= Math.min(SPEAK_TARGET, found.length)) {
      award(3, true);
      setPhase('done');
    }
  };

  const stage = phase === 'discover' ? 0 : phase === 'hunt' ? 1 : phase === 'treasures' ? 2 : 3;
  const progress = phase === 'discover' ? flipped.length / missions.length : phase === 'hunt' ? index / missions.length : spoken.length / SPEAK_TARGET;

  return (
    <GameScreen scene="hunt" onHome={onHome} onParent={onParent} stars={stars} stage={stage} stageProgress={progress} prompt={phase === 'done' ? undefined : prompt} tag={m ? `${index + 1} / ${missions.length}` : undefined}>
      <CharacterRig name="hunt-girl" mood={guide.mood} pointAt={phase === 'discover' ? [1100, 300] : m ? [950, 320] : null} />

      {phase === 'discover' && (
        <div className="hunt-cards" style={at([640, 170, 1650, 470])}>
          {missions.map((mi) => {
            const up = flipped.includes(mi.id);
            return (
              <button key={mi.id} type="button" className={`hunt-card ${up ? 'is-up' : ''}`} onClick={() => flip(mi)} aria-label={up ? mi.say : 'Mission card'}>
                <span className="hunt-card__inner">
                  <img className="hunt-card__back" src={asset(CARD_BACK)} alt="" />
                  <span className="hunt-card__face">
                    {mi.pictures.map((p) => (
                      <img key={p} src={asset(p)} alt="" />
                    ))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {m && (
        <>
          <motion.div key={m.id} className="panel-card hunt-mission" style={at([660, 150, 1300, 520])} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}>
            <div className="hunt-mission__pics">
              {m.pictures.map((p) => (
                <img key={p} src={asset(p)} alt="" />
              ))}
            </div>
            <div className="hunt-mission__say">
              <ListenButton text={m.say} size="md" label="Listen to the mission" />
              <span>{m.say}</span>
            </div>
          </motion.div>
          <div className="stage-actions is-big hunt-actions" style={at([640, 540, 1650, 690])}>
            {step === 'go' ? (
              <PillButton tone="orange" onClick={() => (setStep('back'), void audio.say('Did you find it?'))}>
                I'm back!
              </PillButton>
            ) : (
              <>
                <HoldToConfirm label="Grown-up: hold if found" onConfirm={confirmed} />
                <button type="button" className="hunt-skip" onClick={() => advance(false)}>
                  Not this time
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* treasure shelf: one slot per mission */}
      <div className={`treasure-shelf ${phase === 'treasures' ? 'is-big' : ''}`} style={at(phase === 'treasures' ? [640, 200, 1650, 620] : [640, 710, 1650, 905])}>
        {missions.map((mi) => {
          const has = found.includes(mi.id);
          return (
            <motion.button
              key={mi.id}
              type="button"
              className={`treasure ${has ? 'is-found' : ''} ${spoken.includes(mi.id) ? 'is-done' : ''}`}
              aria-label={has ? `treasure: ${what(mi)}` : 'empty treasure slot'}
              disabled={phase !== 'treasures' || !has}
              onClick={() => setTalk(mi)}
              animate={has ? { scale: [0.4, 1.15, 1] } : { scale: 1 }}
            >
              {has ? <img src={asset(mi.pictures[0])} alt="" /> : <span className="treasure__q">?</span>}
              {has && (
                <span className="treasure__tick">
                  <IconCheck size="100%" />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {saying && <SpeakSteps key={saying.id} sentences={[saying.found]} picture={<img src={asset(saying.pictures[0])} alt="" />} onDone={afterSaying} />}
      {talk && <SpeakSteps key={`t-${talk.id}`} sentences={[talk.found, itIs(talk)]} picture={<img src={asset(talk.pictures[0])} alt="" />} onDone={finishTalk} />}
      {toast.node}
      {phase === 'done' && <Celebration title="You are a super treasure hunter!" stars={stars} onHome={onHome} onReplay={replay} reward={asset('art/school/orange.webp')} />}
    </GameScreen>
  );
}
