import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ANIMALS, ANIMAL_ORDER, HAY, SOUNDS, type AnimalKind } from '../../content/farm';
import { COLOUR_SENTENCE } from '../../content/iCanSee';
import { spriteBox } from '../../content/sprites';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, RoundButton, asset } from '../../components/ui';
import { IconSpeaker } from '../../components/icons';
import { SpeakSteps } from '../../components/SpeakSteps';
import { CharacterRig } from '../../components/CharacterRig';
import { GameScreen, Sprite, at, boxCentre, praise, useGameStars, useGuide, useToast , pace } from '../../components/scene';
import { clueFor, makeRounds } from './logic';

const GAME_ID = 'which-animal';
type Phase = 'discover' | 'challenge' | 'speak' | 'done';
const SPEAK_TARGET = 3;
const PANEL: [number, number, number, number] = [330, 120, 700, 330];

const PROMPT = {
  sound: 'Listen! Which animal is it?',
  shadow: 'Look at the shadow. Which animal is it?',
  clue: 'Listen to the clue. Which animal is it?',
  hidden: 'Who is hiding behind the hay?',
  match: 'Which sound is right? Listen and choose.',
} as const;

export function WhichAnimal({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round: playRound, playIndex } = useGameStars(GAME_ID);
  const rounds = useMemo(() => makeRounds(playIndex), [playIndex]);
  const [phase, setPhase] = useState<Phase>('discover');
  const [heard, setHeard] = useState<AnimalKind[]>([]);
  const [index, setIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [right, setRight] = useState<AnimalKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [spoken, setSpoken] = useState<AnimalKind[]>([]);
  const [talk, setTalk] = useState<AnimalKind | null>(null);
  const [tried, setTried] = useState<AnimalKind[]>([]);
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
    phase === 'discover' ? 'Meet the farm animals! Tap each animal.' : r ? PROMPT[r.kind] : phase === 'speak' ? 'Now you! Tap an animal and tell me about it.' : '';

  const playCue = useCallback(async () => {
    await audio.say(prompt);
    if (!r) return;
    if (r.kind === 'sound') await audio.say(SOUNDS[r.answer]);
    if (r.kind === 'clue') await audio.say(clueFor(r.answer));
  }, [prompt, r]);

  useEffect(() => {
    if (phase === 'done' || talk) return;
    setTried([]);
    const t = window.setTimeout(() => void playCue(), pace(420));
    return () => window.clearTimeout(t);
  }, [index, phase, playCue, talk]);

  const solve = async (kind: AnimalKind) => {
    setBusy(true);
    setRight(kind);
    guide.react('cheer');
    const p = praise();
    toast.show(p);
    playSfx('success');
    await audio.say(`${p} It's a ${ANIMALS[kind].word}.`);
    setRight(null);
    setMisses(0);
    setBusy(false);
    if (index + 1 >= rounds.length) {
      award(2);
      setPhase('speak');
    } else setIndex(index + 1);
  };
  const miss = async (said: string, id: string) => {
    setWrong(id);
    window.setTimeout(() => setWrong(null), pace(600));
    setMisses((m) => m + 1);
    guide.react('encourage');
    toast.show('Try again!', false);
    playSfx('soft-no');
    await audio.say(said);
  };

  const tapAnimal = (kind: AnimalKind) => {
    if (busy) return;
    guide.setPointAt(boxCentre(spriteBox(kind)));
    if (phase === 'discover') {
      setRight(kind);
      window.setTimeout(() => setRight(null), pace(500));
      playSfx('pop');
      void audio.say(`${SOUNDS[kind]} It's a ${ANIMALS[kind].word}.`);
      const next = heard.includes(kind) ? heard : [...heard, kind];
      setHeard(next);
      if (next.length === ANIMAL_ORDER.length && heard.length < ANIMAL_ORDER.length) {
        window.setTimeout(() => {
          award(1);
          guide.react('cheer');
          toast.show('Great! Now be a detective!');
          setPhase('challenge');
        }, 1600);
      }
      return;
    }
    if (phase === 'speak') {
      setTalk(kind);
      return;
    }
    if (!r || r.kind === 'match') return;
    if (kind === r.answer) void solve(kind);
    else void miss(`That's the ${ANIMALS[kind].word}. Try again!`, kind).then(() => (r.kind === 'sound' || r.kind === 'clue' ? playCue() : undefined));
  };

  const tapSound = (opt: AnimalKind, i: number) => {
    if (!r || busy) return;
    playSfx('tap');
    void audio.say(SOUNDS[opt]);
    setTried((t) => (t.includes(opt) ? t : [...t, opt]));
    if (opt === r.answer) window.setTimeout(() => void solve(r.answer), pace(900));
    else window.setTimeout(() => void miss(`Not this one. Listen again!`, `sound-${i}`), pace(900));
  };

  const finishTalk = () => {
    const k = talk!;
    setTalk(null);
    const next = spoken.includes(k) ? spoken : [...spoken, k];
    setSpoken(next);
    guide.react('cheer');
    toast.show(praise());
    if (next.length >= SPEAK_TARGET) {
      award(3, true);
      setPhase('done');
    }
  };

  const stage = phase === 'discover' ? 0 : phase === 'challenge' ? 1 : phase === 'speak' ? 2 : 3;
  const progress = phase === 'discover' ? heard.length / 6 : phase === 'challenge' ? index / rounds.length : spoken.length / SPEAK_TARGET;

  return (
    <GameScreen scene="which-animal" onHome={onHome} onParent={onParent} stars={stars} stage={stage} stageProgress={progress} prompt={phase === 'done' ? undefined : prompt} tag={r ? `${index + 1} / ${rounds.length}` : undefined}>
      <CharacterRig name="animal-girl" mood={guide.mood} pointAt={guide.pointAt} />
      <CharacterRig name="animal-boy" mood={guide.mood === 'cheer' ? 'cheer' : 'idle'} talks={false} />

      {ANIMAL_ORDER.map((kind) => (
        <Sprite
          key={kind}
          src={ANIMALS[kind].image}
          box={spriteBox(kind)}
          label={ANIMALS[kind].word}
          onClick={() => tapAnimal(kind)}
          className="is-alive"
          state={
            right === kind
              ? 'right'
              : wrong === kind
                ? 'wrong'
                : (r && misses >= 2 && r.answer === kind) || (phase === 'discover' && !heard.includes(kind))
                  ? 'glow'
                  : phase === 'speak' && spoken.includes(kind)
                    ? 'done'
                    : undefined
          }
        />
      ))}

      {/* the detective's clue panel */}
      {r && (r.kind === 'shadow' || r.kind === 'hidden' || r.kind === 'clue' || r.kind === 'match') && (
        <motion.div key={`${index}-${r.kind}`} className="panel-card detective-panel" style={at(PANEL)} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {r.kind === 'shadow' && <img src={asset(ANIMALS[r.answer].image)} alt="Animal shadow" className="detective-shadow" />}
          {r.kind === 'hidden' && (
            <div className="detective-hide" aria-label="An animal is hiding">
              <motion.img src={asset(ANIMALS[r.answer].image)} alt="" className="detective-hide__animal" animate={{ y: ['18%', '0%', '18%'] }} transition={{ repeat: Infinity, duration: 2.4 }} />
              <img src={asset(HAY.image)} alt="" className="detective-hide__hay" />
            </div>
          )}
          {r.kind === 'clue' && <p className="detective-clue">{clueFor(r.answer)}</p>}
          {r.kind === 'match' && <img src={asset(ANIMALS[r.answer].image)} alt={ANIMALS[r.answer].word} className="detective-match" />}
        </motion.div>
      )}

      {r?.kind === 'match' ? (
        <div className="stage-actions is-big" style={at([720, 140, 1250, 300])}>
          {r.options!.map((opt, i) => (
            <motion.div key={opt} animate={wrong === `sound-${i}` ? { rotate: [0, -8, 8, 0] } : {}}>
              <RoundButton tone={(['blue', 'pink', 'orange'] as const)[i]} size="lg" label={`Sound ${i + 1}`} onClick={() => tapSound(opt, i)} pulse={misses >= 2 && opt === r.answer}>
                <span className="sound-btn">
                  <IconSpeaker size="56%" />
                  <b>{i + 1}</b>
                </span>
              </RoundButton>
              {tried.includes(opt) && <span className="sound-btn__heard" />}
            </motion.div>
          ))}
        </div>
      ) : (
        phase !== 'done' && (
          <div className="stage-actions is-big" style={at([830, 180, 1090, 300])}>
            <RoundButton tone="purple" size="lg" label="Listen again" onClick={() => void playCue()} pulse={r?.kind === 'sound'}>
              <IconSpeaker size="58%" />
            </RoundButton>
          </div>
        )
      )}

      {talk && <SpeakSteps key={talk} sentences={[`It's a ${ANIMALS[talk].word}.`, COLOUR_SENTENCE[talk]]} picture={<img src={asset(ANIMALS[talk].image)} alt="" />} onDone={finishTalk} />}
      {toast.node}
      {phase === 'done' && <Celebration title="Super farm detective!" stars={stars} onHome={onHome} onReplay={replay} reward={asset('art/animals/cow.webp')} />}
    </GameScreen>
  );
}
