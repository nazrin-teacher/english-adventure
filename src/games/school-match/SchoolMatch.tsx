import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { THINGS, THING_ORDER, itsA, type SchoolThing } from '../../content/school';
import { spriteBox } from '../../content/sprites';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, asset } from '../../components/ui';
import { SpeakSteps } from '../../components/SpeakSteps';
import { CharacterRig } from '../../components/CharacterRig';
import { ChoiceRow, EyesClosed, GameScreen, Sprite, at, boxCentre, praise, useGameStars, useGuide, useToast , pace } from '../../components/scene';
import { COLOUR, imageOf, makeRounds, type Round } from './logic';

const GAME_ID = 'school-objects-match';
type Phase = 'discover' | 'challenge' | 'speak' | 'done';
const Z: Partial<Record<SchoolThing, number>> = { desk: 4, chair: 4 };
const PANEL: [number, number, number, number] = [600, 110, 1320, 340];
const CHOICES: [number, number, number, number] = [640, 360, 1290, 560];
const SPEAK_TARGET = 4;

const promptFor = (r: Round, missingStep: 'look' | 'closed' | 'ask') => {
  switch (r.kind) {
    case 'clue':
      return `It's ${COLOUR[r.target]}. What is it? Find it!`;
    case 'similar':
      return `Find the ${THINGS[r.target].word}.`;
    case 'hidden':
      return 'Something is hiding. What is it?';
    case 'missing':
      return missingStep === 'look' ? 'Look at these things!' : missingStep === 'closed' ? 'Close your eyes!' : "What's missing?";
  }
};

/** Classroom Detective: explore → four kinds of detective missions → say what things are. */
export function SchoolMatch({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round: playRound, playIndex } = useGameStars(GAME_ID);
  const rounds = useMemo(() => makeRounds(playIndex), [playIndex]);
  const [phase, setPhase] = useState<Phase>('discover');
  const [heard, setHeard] = useState<SchoolThing[]>([]);
  const [index, setIndex] = useState(0);
  const [missingStep, setMissingStep] = useState<'look' | 'closed' | 'ask'>('look');
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [right, setRight] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [spoken, setSpoken] = useState<SchoolThing[]>([]);
  const [talk, setTalk] = useState<SchoolThing | null>(null);
  const guide = useGuide();
  const toast = useToast();

  useEffect(() => {
    setPhase('discover');
    setHeard([]);
    setIndex(0);
    setSpoken([]);
  }, [playRound]);

  const r = phase === 'challenge' ? rounds[index] : undefined;
  const prompt =
    phase === 'discover'
      ? "Let's explore the classroom! Tap the things."
      : r
        ? promptFor(r, missingStep)
        : phase === 'speak'
          ? 'Your turn! Tap a thing. What is it?'
          : '';

  // round set-up (the "what's missing" sequence runs itself)
  useEffect(() => {
    setRevealed(false);
    setMisses(0);
    if (r?.kind !== 'missing') return;
    setMissingStep('look');
    const a = window.setTimeout(() => setMissingStep('closed'), pace(3600));
    const b = window.setTimeout(() => setMissingStep('ask'), pace(6000));
    return () => (window.clearTimeout(a), window.clearTimeout(b));
  }, [index, r?.kind]);

  useEffect(() => {
    if (!prompt || talk) return;
    const t = window.setTimeout(() => void audio.say(prompt), pace(380));
    return () => window.clearTimeout(t);
  }, [prompt, talk]);

  const solve = async (id: string, target: SchoolThing) => {
    setBusy(true);
    setRight(id);
    setRevealed(true);
    guide.react('cheer');
    const p = praise();
    toast.show(p);
    playSfx('success');
    await audio.say(`${p} ${itsA(target)}`);
    setRight(null);
    setBusy(false);
    if (index + 1 >= rounds.length) {
      award(2);
      setPhase('speak');
    } else setIndex(index + 1);
  };
  const miss = (id: string, said: string) => {
    setWrong(id);
    window.setTimeout(() => setWrong(null), pace(600));
    setMisses((m) => m + 1);
    guide.react('encourage');
    toast.show('Try again!', false);
    playSfx('soft-no');
    void audio.say(said);
  };

  /** Tapping an object in the classroom. */
  const tapThing = (t: SchoolThing) => {
    if (busy) return;
    guide.setPointAt(boxCentre(spriteBox(t)));
    if (phase === 'discover') {
      setRight(t);
      window.setTimeout(() => setRight(null), pace(500));
      playSfx('pop');
      void audio.say(itsA(t));
      const next = heard.includes(t) ? heard : [...heard, t];
      setHeard(next);
      if (next.length === THING_ORDER.length && heard.length < THING_ORDER.length) {
        window.setTimeout(() => {
          award(1);
          guide.react('cheer');
          toast.show("Let's be detectives!");
          setPhase('challenge');
        }, 1500);
      }
      return;
    }
    if (phase === 'speak') return setTalk(t);
    if (r?.kind === 'clue') {
      if (t === r.target) void solve(t, t);
      else miss(t, `That's the ${THINGS[t].word}. ${promptFor(r, 'ask')}`);
    }
  };

  /** Tapping a picture choice (similar / hidden / missing). */
  const pick = (id: string) => {
    if (!r || busy || r.kind === 'clue') return;
    if (r.kind === 'missing' && missingStep !== 'ask') return;
    if (id === r.target) void solve(id, r.target);
    else miss(id, `No, look again! ${promptFor(r, 'ask')}`);
  };

  const finishTalk = () => {
    const t = talk!;
    setTalk(null);
    const next = spoken.includes(t) ? spoken : [...spoken, t];
    setSpoken(next);
    guide.react('cheer');
    toast.show(praise());
    if (next.length >= SPEAK_TARGET) {
      award(3, true);
      setPhase('done');
    }
  };

  const panelRound = r && r.kind !== 'clue';
  const stage = phase === 'discover' ? 0 : phase === 'challenge' ? 1 : phase === 'speak' ? 2 : 3;
  const progress = phase === 'discover' ? heard.length / 9 : phase === 'challenge' ? index / rounds.length : spoken.length / SPEAK_TARGET;

  return (
    <GameScreen scene="classroom" onHome={onHome} onParent={onParent} stars={stars} stage={stage} stageProgress={progress} prompt={phase === 'done' ? undefined : prompt} tag={r ? `${index + 1} / ${rounds.length}` : undefined}>
      {THING_ORDER.map((t) => (
        <Sprite
          key={t}
          src={THINGS[t].image}
          box={spriteBox(t)}
          label={THINGS[t].word}
          onClick={() => tapThing(t)}
          style={{ zIndex: Z[t] ?? 10 }}
          disabled={Boolean(panelRound)}
          state={
            right === t
              ? 'right'
              : wrong === t
                ? 'wrong'
                : panelRound
                  ? 'dim'
                  : (r?.kind === 'clue' && misses >= 2 && r.target === t) || (phase === 'discover' && !heard.includes(t))
                    ? 'glow'
                    : phase === 'speak' && spoken.includes(t)
                      ? 'done'
                      : undefined
          }
        />
      ))}
      <CharacterRig name="class-girl" mood={guide.mood} pointAt={guide.pointAt} />

      {/* detective panel */}
      <AnimatePresence>
        {r && r.kind === 'hidden' && (
          <motion.div key={`h${index}`} className="panel-card" style={at(PANEL)} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="hide-box">
              <img src={asset(THINGS[r.target].image)} alt="" />
              <motion.span className="hide-box__cloud" animate={revealed ? { x: '120%', opacity: 0 } : { x: 0, opacity: 1 }} transition={{ duration: 0.7 }} />
            </div>
          </motion.div>
        )}
        {r && r.kind === 'missing' && (
          <motion.div key={`m${index}`} className="panel-card missing-row" style={at(PANEL)} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {r.shown.map((t) => (
              <span key={t} className={`missing-row__slot ${missingStep !== 'look' && t === r.target && !revealed ? 'is-gone' : ''}`}>
                <img src={asset(THINGS[t].image)} alt="" />
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {r?.kind === 'missing' && <EyesClosed show={missingStep === 'closed'} />}

      {r && r.kind !== 'clue' && (r.kind !== 'missing' || missingStep === 'ask') && (
        <ChoiceRow
          box={r.kind === 'similar' ? [600, 150, 1320, 400] : CHOICES}
          items={r.options.map((id) => ({ id, src: imageOf(id), label: `choice ${id}` }))}
          onPick={pick}
          wrong={wrong}
          glow={misses >= 2 ? r.target : right}
        />
      )}

      {talk && <SpeakSteps key={talk} sentences={[itsA(talk)]} picture={<img src={asset(THINGS[talk].image)} alt="" />} onDone={finishTalk} />}
      {toast.node}
      {phase === 'done' && <Celebration title="Super classroom detective!" stars={stars} onHome={onHome} onReplay={replay} reward={asset('art/school/pencil.webp')} />}
    </GameScreen>
  );
}
