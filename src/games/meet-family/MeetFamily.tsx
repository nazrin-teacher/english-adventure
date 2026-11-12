import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MEMBERS, MEMORY_MEMBERS, type Member } from '../../content/family';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, ListenButton, PillButton, asset } from '../../components/ui';
import { SpeakSteps } from '../../components/SpeakSteps';
import { CharacterRig } from '../../components/CharacterRig';
import { GameScreen, SH, SW, at, praise, useGameStars, useGuide, useToast , pace } from '../../components/scene';
import { PARTS, cluesFor, describePerson, makeGuessRounds, partAt, partWord, type Part } from './logic';
import './guess.css';

const GAME_ID = 'meet-my-family';
type Phase = 'discover' | 'guess' | 'describe' | 'quiz' | 'done';
const TRAY: [number, number, number, number] = [70, 660, 1610, 920];
const DISCOVER_ORDER: Part[] = ['hair', 'eyes', 'nose', 'mouth', 'ears', 'face', 'arms', 'body'];

/**
 * Guess Who?: learn face and body words on grandma → guess family members
 * from one, then two appearance clues → describe a person, then make a clue
 * for a grown-up to guess.
 */
export function MeetFamily({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const rounds = useMemo(() => makeGuessRounds(playIndex), [playIndex]);
  const [phase, setPhase] = useState<Phase>('discover');
  const [partIndex, setPartIndex] = useState(0);
  const [flash, setFlash] = useState<Part | null>(null);
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<Member | null>(null);
  const [right, setRight] = useState<Member | null>(null);
  const [misses, setMisses] = useState(0);
  const [talk, setTalk] = useState<Member | null>(null);
  const [secret, setSecret] = useState<Member | null>(null);
  const [quizStep, setQuizStep] = useState<'choose' | 'say' | 'guess'>('choose');
  const guide = useGuide();
  const toast = useToast();
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPhase('discover');
    setPartIndex(0);
    setIndex(0);
    setSecret(null);
    setQuizStep('choose');
  }, [round]);

  const want = phase === 'discover' ? DISCOVER_ORDER[partIndex] : undefined;
  const r = phase === 'guess' ? rounds[index] : undefined;
  const prompt =
    phase === 'discover'
      ? `Touch grandma's ${want}.`
      : r
        ? `Who is it? ${r.clues.map((c) => c.text).join(' ')}`
        : phase === 'describe'
          ? 'Choose a person. Tell me about them!'
          : phase === 'quiz'
            ? quizStep === 'choose'
              ? 'Your turn! Choose a secret person.'
              : quizStep === 'say'
                ? 'Say the clues to a grown-up.'
                : 'Grown-up, who is it? Tap!'
            : '';

  useEffect(() => {
    if (!prompt || talk) return;
    const t = window.setTimeout(() => void audio.say(prompt), pace(400));
    return () => window.clearTimeout(t);
  }, [prompt, talk]);

  /* Discover: tap on grandma */
  const tapGrandma = (e: React.MouseEvent) => {
    if (phase !== 'discover' || !want) return;
    const rect = stageRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SW, y = ((e.clientY - rect.top) / rect.height) * SH;
    touchPart(partAt(x, y));
  };
  const touchPart = (p: Part | null) => {
    if (!want || !p) return;
    setFlash(p);
    window.setTimeout(() => setFlash(null), pace(900));
    if (p === want) {
      playSfx('success');
      guide.react('cheer');
      void audio.say(partWord(p));
      if (partIndex + 1 >= DISCOVER_ORDER.length) {
        window.setTimeout(() => {
          award(1);
          toast.show('Great! Now guess who!');
          setPhase('guess');
        }, 1200);
      } else setPartIndex(partIndex + 1);
    } else {
      playSfx('soft-no');
      guide.react('encourage');
      void audio.say(`${partWord(p)} Touch her ${want}.`);
      setMisses((n) => n + 1);
    }
  };

  const tapPerson = async (m: Member) => {
    if (phase === 'guess' && r) {
      if (m === r.target) {
        setRight(m);
        guide.react('cheer');
        playSfx('success');
        const p = praise();
        toast.show(p);
        await audio.say(`${p} ${LOOKS_SAY(m)}`);
        setRight(null);
        setMisses(0);
        if (index + 1 >= rounds.length) {
          award(2);
          setPhase('describe');
        } else setIndex(index + 1);
      } else {
        setWrong(m);
        window.setTimeout(() => setWrong(null), pace(600));
        setMisses((n) => n + 1);
        guide.react('encourage');
        playSfx('soft-no');
        toast.show('Listen again!', false);
        await audio.say(`Not ${m}. ${r.clues.map((c) => c.text).join(' ')}`);
      }
      return;
    }
    if (phase === 'describe') return setTalk(m);
    if (phase === 'quiz') {
      if (quizStep === 'choose') {
        setSecret(m);
        setQuizStep('say');
        playSfx('sparkle');
        return;
      }
      if (quizStep === 'guess' && secret) {
        if (m === secret) {
          guide.react('cheer');
          playSfx('fanfare');
          toast.show(`Yes! It's ${m}!`);
          await audio.say(`Yes! It's ${m}! Great clues!`);
          award(3, true);
          setPhase('done');
        } else {
          setWrong(m);
          window.setTimeout(() => setWrong(null), pace(600));
          playSfx('soft-no');
          void audio.say('No! Say the clues again.');
        }
      }
    }
  };

  const finishTalk = () => {
    setTalk(null);
    guide.react('cheer');
    toast.show(praise());
    setPhase('quiz');
  };

  const stage = phase === 'discover' ? 0 : phase === 'guess' ? 1 : phase === 'done' ? 3 : 2;
  const progress = phase === 'discover' ? partIndex / DISCOVER_ORDER.length : phase === 'guess' ? index / rounds.length : phase === 'describe' ? 0.3 : 0.7;
  const flashBoxes = flash ? PARTS.find((p) => p.part === flash)!.boxes : [];
  const hintBoxes = phase === 'discover' && misses >= 2 && want ? PARTS.find((p) => p.part === want)!.boxes : [];

  return (
    <GameScreen scene="guess" onHome={onHome} onParent={onParent} stars={stars} stage={stage} stageProgress={progress} prompt={phase === 'done' ? undefined : prompt} tag={r ? `${index + 1} / ${rounds.length}` : undefined}>
      <div ref={stageRef} className="guess-field" onClick={tapGrandma} aria-hidden={phase !== 'discover'} />
      {phase === 'discover' &&
        DISCOVER_ORDER.map((p) => (
          <button key={p} type="button" className="sr-only" onClick={() => touchPart(p)}>
            grandma's {p}
          </button>
        ))}
      {[...flashBoxes, ...hintBoxes].map((b, i) => (
        <motion.span key={`${flash}-${i}-${b[0]}`} className={`part-glow ${hintBoxes.includes(b) ? 'is-hint' : ''}`} style={at(b)} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} />
      ))}

      <CharacterRig name="guess-girl" mood={guide.mood} pointAt={phase === 'discover' ? [1250, 330] : null} />

      {/* clue cards */}
      {r && (
        <div className="clue-cards" style={at([700, 300, 1060, 620])}>
          {r.clues.map((c) => (
            <div key={c.text} className="clue-card">
              <ListenButton text={c.text} size="sm" label={`Listen: ${c.text}`} />
              <span>{c.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* the child's secret clues for a grown-up */}
      {phase === 'quiz' && secret && quizStep === 'say' && (
        <div className="clue-cards" style={at([680, 280, 1080, 640])}>
          {cluesFor(secret).slice(0, 2).map((c) => (
            <div key={c.text} className="clue-card">
              <ListenButton text={c.text} size="sm" label={`Listen: ${c.text}`} />
              <span>{c.text}</span>
            </div>
          ))}
          <PillButton tone="green" onClick={() => setQuizStep('guess')}>
            I said it!
          </PillButton>
        </div>
      )}

      {phase !== 'discover' && phase !== 'done' && (
        <div className={`guess-tray ${phase === 'quiz' && quizStep === 'say' ? 'is-secret' : ''}`} style={at(TRAY)}>
          {MEMORY_MEMBERS.map((m) => (
            <motion.button
              key={m}
              type="button"
              className={`guess-tile ${right === m ? 'is-right' : ''} ${misses >= 2 && r?.target === m ? 'is-glow' : ''} ${secret === m && quizStep !== 'guess' ? 'is-secret' : ''}`}
              aria-label={MEMBERS[m].word}
              onClick={() => void tapPerson(m)}
              animate={wrong === m ? { rotate: [0, -6, 6, 0] } : right === m ? { y: [0, -16, 0] } : { rotate: 0, y: 0 }}
            >
              <img src={asset(MEMBERS[m].tile)} alt="" draggable={false} />
            </motion.button>
          ))}
        </div>
      )}

      {talk && <SpeakSteps key={talk} sentences={describePerson(talk)} picture={<img src={asset(MEMBERS[talk].tile)} alt="" />} onDone={finishTalk} />}
      {toast.node}
      {phase === 'done' && <Celebration title="You are a super guesser!" stars={stars} onHome={onHome} onReplay={replay} reward={asset('art/family/grandpa.webp')} />}
    </GameScreen>
  );
}

const LOOKS_SAY = (m: Member) => `${m === 'dad' || m === 'grandpa' || m === 'brother' ? "He's" : "She's"} my ${m}.`;
