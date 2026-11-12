import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FACES, PUPPET_WHO, SHIRTS, WIGS, WIG_FIT, puppetSentences, type Face, type PuppetWho, type Shirt, type Wig } from '../../content/family';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, PillButton, asset } from '../../components/ui';
import { IconMic } from '../../components/icons';
import { SpeakSteps } from '../../components/SpeakSteps';
import { GameScreen, at, useGameStars, useToast } from '../../components/scene';

const GAME_ID = 'puppet-studio';
const PUPPETS_FOR_ALL_STARS = 3;
const part = (f: string) => asset(`art/puppet/${f}.webp`);

type Look = { who: PuppetWho; wig: Wig; shirt: Shirt; face: Face };

/** One stick puppet built from separate pieces (shirt, face, wig). */
export function Puppet({ look, className = '' }: { look: Look; className?: string }) {
  const fit = WIG_FIT[look.wig];
  return (
    <div className={`puppet ${className}`} aria-label={`Puppet: ${look.who}`}>
      <span className="puppet__stick" />
      <img className="puppet__shirt" src={part(`shirt-${look.shirt}`)} alt="" draggable={false} />
      <span className="puppet__head">
        <img className="puppet__face" src={part(`face-${look.face}`)} alt="" draggable={false} />
        <img
          className="puppet__wig"
          src={part(`wig-${look.wig}`)}
          alt=""
          draggable={false}
          style={{ width: `${fit.w * 100}%`, top: `${fit.top * 100}%`, left: `${(1 - fit.w) * 50}%` }}
        />
      </span>
    </div>
  );
}

/** Magic wand icon for the "show" button. */
const IconWand = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
    <path d="M4 20 14 10" stroke="#fff6c8" strokeWidth="2.6" strokeLinecap="round" />
    <path d="m16.5 3 1.1 2.6 2.7.3-2 1.9.5 2.7-2.3-1.4-2.4 1.4.6-2.7-2-1.9 2.7-.3Z" fill="#ffd23f" stroke="#fff" strokeWidth="0.8" strokeLinejoin="round" />
  </svg>
);

type Step = 'who' | 'wig' | 'shirt' | 'face' | 'show';
const STEP_PROMPT: Record<Step, string> = {
  who: 'Choose a puppet.',
  wig: 'Choose the hair.',
  shirt: 'Choose the clothes.',
  face: 'Choose a face.',
  show: 'Tap the magic wand. Show your puppet!',
};

export function PuppetStudio({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round } = useGameStars(GAME_ID);
  const [look, setLook] = useState<Look>({ who: 'mum', wig: 'curly', shirt: 'flower', face: 'happy' });
  const [step, setStep] = useState<Step>('who');
  const [onStage, setOnStage] = useState(false);
  const [talk, setTalk] = useState<string[] | null>(null);
  const [made, setMade] = useState(0);
  const [done, setDone] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setStep('who');
    setMade(0);
    setDone(false);
    setOnStage(false);
  }, [round]);

  const prompt = onStage ? 'Introduce your puppet!' : STEP_PROMPT[step];
  useEffect(() => {
    if (talk || done) return;
    const t = window.setTimeout(() => void audio.say(prompt), 350);
    return () => window.clearTimeout(t);
  }, [prompt, talk, done]);

  const pick = <K extends keyof Look>(key: K, value: Look[K], next: Step) => {
    playSfx('pop');
    setOnStage(false);
    setLook((l) => ({ ...l, [key]: value }));
    if (key === 'who') void audio.say(`My ${value}!`);
    const order: Step[] = ['who', 'wig', 'shirt', 'face', 'show'];
    if (order.indexOf(next) > order.indexOf(step)) setStep(next);
  };

  const show = () => {
    playSfx('sparkle');
    setOnStage(true);
    setStep('show');
    window.setTimeout(() => setTalk(puppetSentences(look.who, look.wig)), 900);
  };

  const finishTalk = () => {
    setTalk(null);
    const n = made + 1;
    setMade(n);
    award(Math.min(3, n), n >= PUPPETS_FOR_ALL_STARS);
    toast.show('Bravo! What a puppet!');
    if (n >= PUPPETS_FOR_ALL_STARS) window.setTimeout(() => setDone(true), 1200);
    else window.setTimeout(() => void audio.say('Make another puppet!'), 1300);
  };

  const printSheet = () => {
    playSfx('tap');
    window.print();
  };

  const row = <T extends string>(items: T[], current: T, key: keyof Look, next: Step, img: (v: T) => string, label: (v: T) => string, active: boolean) => (
    <div className={`picker-row ${active ? 'is-active' : ''}`}>
      {items.map((v) => (
        <button key={v} type="button" className={`picker-item ${current === v ? 'is-selected' : ''}`} onClick={() => pick(key, v as Look[typeof key], next)} aria-label={label(v)} aria-pressed={current === v}>
          <img src={img(v)} alt="" draggable={false} />
        </button>
      ))}
    </div>
  );

  return (
    <GameScreen scene="puppet" onHome={onHome} onParent={onParent} stars={stars} prompt={done ? undefined : prompt} tag={`Puppet ${Math.min(made + 1, PUPPETS_FOR_ALL_STARS)}`}>
      {/* who: family puppet tiles (left column, like the picture) */}
      <div className={`who-column ${step === 'who' ? 'is-active' : ''}`} style={at([392, 180, 568, 700])}>
        {PUPPET_WHO.map((w) => (
          <button key={w} type="button" className={`who-tile ${look.who === w ? 'is-selected' : ''}`} onClick={() => pick('who', w, 'wig')} aria-label={w} aria-pressed={look.who === w}>
            <img src={part(`who-${w}`)} alt="" draggable={false} />
          </button>
        ))}
      </div>

      {/* stage */}
      <div className="puppet-stage" style={at([720, 210, 1090, 715])}>
        <motion.div key={`${onStage}-${made}`} initial={onStage ? { y: 160, opacity: 0 } : false} animate={onStage ? { y: [160, -12, 0], opacity: 1, rotate: [0, -4, 4, 0] } : { y: 0, opacity: 1 }} transition={{ duration: 0.9 }}>
          <Puppet look={look} />
        </motion.div>
      </div>

      {/* pickers (right panel) */}
      <div className="picker-panel" style={at([1240, 100, 1650, 640])}>
        {row(WIGS, look.wig, 'wig', 'shirt', (v) => part(`wig-${v}`), (v) => `${v} hair`, step === 'wig')}
        {row(SHIRTS, look.shirt, 'shirt', 'face', (v) => part(`shirt-${v}`), (v) => `${v} top`, step === 'shirt')}
        {row(FACES, look.face, 'face', 'show', (v) => part(`face-${v}`), (v) => `${v} face`, step === 'face')}
      </div>

      {/* show time + print */}
      <div className="stage-actions is-big puppet-actions" style={at([490, 735, 1240, 900])}>
        <PillButton tone="green" label="Show the puppet" onClick={show} pulse={step === 'show' && !onStage} icon={<IconWand />}>
          Show!
        </PillButton>
        <PillButton tone="pink" label="Introduce the puppet" onClick={() => (setOnStage(true), setTalk(puppetSentences(look.who, look.wig)))} icon={<IconMic size="100%" />}>
          Say it
        </PillButton>
      </div>
      <div className="stage-actions" style={at([1350, 670, 1610, 905])}>
        <button type="button" className="print-btn" onClick={printSheet} aria-label="Print a puppet sheet">
          <svg viewBox="0 0 24 24" width="46%" aria-hidden>
            <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span>Print</span>
        </button>
      </div>

      {/* print-only sheet: the puppet to cut out and glue on a stick */}
      <div className="print-sheet" aria-hidden>
        <h1>{puppetSentences(look.who, look.wig).join(' ')}</h1>
        <div className="print-sheet__cut">
          <Puppet look={look} className="is-print" />
        </div>
        <p>Cut along the dashed line. Glue the puppet on a stick. Say: “{puppetSentences(look.who, look.wig)[0]}”</p>
      </div>

      {talk && <SpeakSteps key={talk.join()} sentences={talk} onDone={finishTalk} />}
      {toast.node}
      {done && <Celebration title="Super puppet show!" stars={stars} onHome={onHome} onReplay={replay} />}
    </GameScreen>
  );
}
