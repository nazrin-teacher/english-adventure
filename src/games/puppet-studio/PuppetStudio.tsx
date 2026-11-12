import { motion } from 'framer-motion';
import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import {
  DEFAULT_LOOK,
  EXTRAS,
  FACES,
  HAIR_COLOURS,
  HAIR_HEX,
  PUPPET_ORDERS,
  PUPPET_WHO,
  SHIRTS,
  WIGS,
  WIG_BASE,
  WIG_FIT,
  hairWords,
  isHe,
  puppetSentences,
  type Extra,
  type Face,
  type HairColour,
  type PuppetWho,
  type Shirt,
  type Wig,
} from '../../content/family';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, PillButton, asset } from '../../components/ui';
import { IconCheck } from '../../components/icons';
import { SpeakSteps } from '../../components/SpeakSteps';
import { CharacterRig } from '../../components/CharacterRig';
import { GameScreen, at, praise, shuffle, useGameStars, useGuide, useToast , pace } from '../../components/scene';
import './puppet.css';

const GAME_ID = 'puppet-studio';
const part = (f: string) => asset(`art/puppet/${f}.webp`);

export type Look = { who: PuppetWho; wig: Wig; hair: HairColour; shirt: Shirt; face: Face; extra: Extra };
const lookFor = (who: PuppetWho, face: Face = 'happy'): Look => ({ who, face, ...DEFAULT_LOOK[who] });

/** A wig picture recoloured to any hair colour (shape from the picture, colour on top). */
function TintedWig({ wig, hair, style }: { wig: Wig; hair: HairColour; style: CSSProperties }) {
  const src = part(`wig-${wig}`);
  const mask = { WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' } as CSSProperties;
  return (
    <span className="puppet__wig" style={{ ...style, aspectRatio: WIG_BASE[wig].aspect }} data-hair={hair}>
      <span className="puppet__wig-colour" style={{ ...mask, background: HAIR_HEX[hair] }} />
      <img className="puppet__wig-shade" src={src} alt="" draggable={false} style={{ filter: `grayscale(1) brightness(${WIG_BASE[wig].lift}) contrast(1.15)` }} />
    </span>
  );
}

/** One stick puppet built from separate pieces: top, face, recoloured wig, extra. */
export function Puppet({ look, className = '' }: { look: Look; className?: string }) {
  const fit = WIG_FIT[look.wig];
  return (
    <div className={`puppet ${className}`} aria-label={`Puppet: ${look.who}, ${hairWords(look.wig, look.hair)} hair`} data-look={`${look.who}|${look.wig}|${look.hair}|${look.shirt}|${look.face}|${look.extra}`}>
      <span className="puppet__stick" />
      <img className="puppet__shirt" src={part(`shirt-${look.shirt}`)} alt="" draggable={false} />
      {look.extra === 'necklace' && <img className="puppet__necklace" src={part('acc-necklace')} alt="" />}
      <span className="puppet__head">
        <img className="puppet__face" src={part(`face-${look.face}`)} alt="" draggable={false} />
        <TintedWig wig={look.wig} hair={look.hair} style={{ width: `${fit.w * 100}%`, top: `${fit.top * 100}%`, left: `${(1 - fit.w) * 50}%` }} />
        {look.extra === 'glasses' && <img className="puppet__glasses" src={part('acc-glasses')} alt="" />}
        {look.extra === 'bow' && <img className="puppet__bow" src={part('acc-bow')} alt="" />}
        {look.extra === 'earrings' && (
          <>
            <img className="puppet__earring is-left" src={part('acc-earrings')} alt="" />
            <img className="puppet__earring is-right" src={part('acc-earrings')} alt="" />
          </>
        )}
      </span>
    </div>
  );
}

type Phase = 'discover' | 'order' | 'free' | 'arrange' | 'show' | 'curtain' | 'done';
type Row = 'wig' | 'hair' | 'shirt' | 'face' | 'extra';

/**
 * My Family Puppet Studio: meet the puppets → build puppets from spoken
 * orders, then your own → arrange them on the stage → put on a puppet show.
 */
export function PuppetStudio({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const orders = useMemo(() => shuffle(PUPPET_ORDERS, playIndex).slice(0, 2), [playIndex]);
  const [phase, setPhase] = useState<Phase>('discover');
  const [met, setMet] = useState<PuppetWho[]>([]);
  const [look, setLook] = useState<Look>(lookFor('mum'));
  const [orderIndex, setOrderIndex] = useState(0);
  const [wrongRow, setWrongRow] = useState<Row | 'who' | null>(null);
  const [stagePuppets, setStagePuppets] = useState<Look[]>([]);
  const [pickedSlot, setPickedSlot] = useState<number | null>(null);
  const [showIndex, setShowIndex] = useState(0);
  const [hop, setHop] = useState<number | null>(null);
  const guide = useGuide();
  const toast = useToast();

  useEffect(() => {
    setPhase('discover');
    setMet([]);
    setOrderIndex(0);
    setStagePuppets([]);
    setLook(lookFor('mum'));
  }, [round]);

  const order = phase === 'order' ? orders[orderIndex] : undefined;
  const prompt =
    phase === 'discover'
      ? 'Meet the family puppets! Tap each one.'
      : order
        ? order.say
        : phase === 'free'
          ? 'Now make your own puppet! Then tap Show.'
          : phase === 'arrange'
            ? 'Put your puppets in order. Tap two puppets to swap them.'
            : phase === 'curtain'
              ? 'Bravo! Watch your show again or print your puppets.'
              : '';

  useEffect(() => {
    if (!prompt || phase === 'show') return;
    const t = window.setTimeout(() => void audio.say(prompt), pace(380));
    return () => window.clearTimeout(t);
  }, [prompt, phase]);

  const building = phase === 'order' || phase === 'free';

  const set = <K extends keyof Look>(key: K, value: Look[K]) => {
    playSfx('pop');
    setWrongRow(null);
    setLook((l) => (key === 'who' ? { ...lookFor(value as PuppetWho, l.face) } : { ...l, [key]: value }));
    if (key === 'who') void audio.say(`My ${value}!`);
    if (key === 'hair' || key === 'wig') {
      const next = { ...look, [key]: value } as Look;
      void audio.say(`${hairWords(next.wig, next.hair)} hair`);
    }
  };

  const meet = (who: PuppetWho) => {
    const l = lookFor(who);
    setLook(l);
    playSfx('sparkle');
    void audio.say(puppetSentences(l).slice(0, 2).join(' '));
    const next = met.includes(who) ? met : [...met, who];
    setMet(next);
    if (next.length === PUPPET_WHO.length && met.length < PUPPET_WHO.length) {
      window.setTimeout(() => {
        award(1);
        guide.react('cheer');
        setLook({ ...lookFor('mum'), wig: 'bun', hair: 'brown', extra: 'none' });
        setPhase('order');
      }, 2200);
    }
  };

  /** "Show!" — check a spoken order, or accept a free puppet. */
  const show = () => {
    if (order) {
      const bad: Row | 'who' | null = look.who !== order.who ? 'who' : look.wig !== order.wig ? 'wig' : look.hair !== order.hair ? 'hair' : null;
      if (bad) {
        setWrongRow(bad);
        guide.react('encourage');
        playSfx('soft-no');
        toast.show('Look again!', false);
        void audio.say(`Not yet! ${order.say}`);
        return;
      }
    }
    playSfx('sparkle');
    guide.react('cheer');
    const p = praise();
    toast.show(p);
    void audio.say(`${p} ${puppetSentences(look)[0]}`);
    const next = [...stagePuppets, look];
    setStagePuppets(next);
    if (phase === 'order' && orderIndex + 1 < orders.length) {
      setOrderIndex(orderIndex + 1);
      setLook({ ...lookFor('grandpa'), wig: 'bun', hair: 'yellow', extra: 'none' });
    } else if (phase === 'order') {
      award(2);
      setLook(lookFor(isHe(look.who) ? 'mum' : 'grandpa'));
      setPhase('free');
    } else {
      setPhase('arrange');
    }
  };

  const tapSlot = (i: number) => {
    if (phase !== 'arrange') return;
    playSfx('pop');
    if (pickedSlot === null) return setPickedSlot(i);
    if (pickedSlot !== i) {
      const next = [...stagePuppets];
      [next[pickedSlot], next[i]] = [next[i], next[pickedSlot]];
      setStagePuppets(next);
    }
    setPickedSlot(null);
  };

  const finishTurn = () => {
    setHop(null);
    if (showIndex + 1 >= stagePuppets.length) {
      award(3, true);
      setPhase('curtain');
    } else setShowIndex(showIndex + 1);
  };
  useEffect(() => {
    if (phase === 'show') setHop(showIndex);
  }, [phase, showIndex]);

  const watchAgain = async () => {
    for (let i = 0; i < stagePuppets.length; i++) {
      setHop(i);
      for (const s of puppetSentences(stagePuppets[i])) await audio.say(s);
    }
    setHop(null);
  };

  const row = <T extends string>(name: Row, items: T[], current: T, render: (v: T) => ReactElement, label: (v: T) => string) => (
    <div className={`picker-row picker-row--${name} ${wrongRow === name ? 'is-wrong' : ''}`} role="group" aria-label={name}>
      {items.map((v) => (
        <button key={v} type="button" className={`picker-item ${current === v ? 'is-selected' : ''}`} onClick={() => set(name, v as never)} aria-label={label(v)} aria-pressed={current === v}>
          {render(v)}
        </button>
      ))}
    </div>
  );

  const stage = phase === 'discover' ? 0 : phase === 'order' ? 1 : phase === 'done' ? 3 : 2;
  const progress = phase === 'discover' ? met.length / 4 : phase === 'order' ? orderIndex / orders.length : phase === 'free' ? 0.2 : phase === 'arrange' ? 0.45 : 0.8;
  const onStage = phase === 'arrange' || phase === 'show' || phase === 'curtain';

  return (
    <GameScreen scene="puppet" onHome={onHome} onParent={onParent} stars={stars} stage={stage} stageProgress={progress} prompt={phase === 'done' || phase === 'show' ? undefined : prompt} tag={order ? `Order ${orderIndex + 1}` : undefined}>
      <CharacterRig name="puppet-boy" mood={guide.mood} pointAt={building ? [900, 420] : null} />

      {/* who: family puppet tiles */}
      {(phase === 'discover' || building) && (
        <div className={`who-column ${phase === 'discover' || wrongRow === 'who' ? 'is-active' : ''}`} style={at([392, 180, 568, 700])}>
          {PUPPET_WHO.map((w) => (
            <button
              key={w}
              type="button"
              className={`who-tile ${look.who === w ? 'is-selected' : ''} ${phase === 'discover' && met.includes(w) ? 'is-done' : ''}`}
              onClick={() => (phase === 'discover' ? meet(w) : set('who', w))}
              aria-label={w}
              aria-pressed={look.who === w}
            >
              <img src={part(`who-${w}`)} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}

      {/* the stage */}
      {!onStage ? (
        <div className="puppet-stage" style={at([700, 200, 1110, 715])}>
          <motion.div key={`${look.who}-${phase}`} initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}>
            <Puppet look={look} />
          </motion.div>
        </div>
      ) : (
        <div className="puppet-line" style={at([600, 230, 1230, 715])}>
          {stagePuppets.map((l, i) => (
            <motion.button
              key={i}
              type="button"
              className={`puppet-slot ${pickedSlot === i ? 'is-picked' : ''}`}
              onClick={() => tapSlot(i)}
              aria-label={`stage puppet ${i + 1}: ${l.who}`}
              animate={hop === i ? { y: [0, -40, 0, -20, 0], scale: [1, 1.12, 1.08, 1.1, 1.08] } : { y: 0, scale: 1 }}
              transition={{ duration: 0.9 }}
            >
              <Puppet look={l} />
            </motion.button>
          ))}
        </div>
      )}

      {/* pickers */}
      {building && (
        <div className="picker-panel" style={at([1232, 92, 1662, 700])}>
          {row('wig', WIGS, look.wig, (v) => <img src={part(`wig-${v}`)} alt="" />, (v) => `${v === 'bob' ? 'straight' : v} hair`)}
          {row('hair', HAIR_COLOURS, look.hair, (v) => <span className="swatch" style={{ background: HAIR_HEX[v] }} />, (v) => `${v} hair colour`)}
          {row('shirt', SHIRTS, look.shirt, (v) => <img src={part(`shirt-${v}`)} alt="" />, (v) => `${v} top`)}
          {row('face', FACES, look.face, (v) => <img src={part(`face-${v}`)} alt="" />, (v) => `${v} face`)}
          {row('extra', EXTRAS, look.extra, (v) => (v === 'none' ? <span className="swatch is-none">∅</span> : <img src={part(`acc-${v}`)} alt="" />), (v) => (v === 'none' ? 'no extra' : v))}
        </div>
      )}

      {/* actions */}
      <div className="stage-actions is-big puppet-actions" style={at([490, 735, 1240, 905])}>
        {building && (
          <PillButton tone="green" label="Show the puppet" onClick={show} icon={<span className="wand">✦</span>}>
            Show!
          </PillButton>
        )}
        {phase === 'arrange' && (
          <PillButton tone="pink" onClick={() => (setShowIndex(0), setPhase('show'))}>
            Start the show!
          </PillButton>
        )}
        {phase === 'curtain' && (
          <>
            <PillButton tone="blue" onClick={() => void watchAgain()}>
              Watch again
            </PillButton>
            <PillButton tone="green" icon={<IconCheck size="100%" />} onClick={() => setPhase('done')}>
              Finish
            </PillButton>
          </>
        )}
      </div>
      {onStage && (
        <div className="stage-actions" style={at([1350, 670, 1610, 905])}>
          <button type="button" className="print-btn" onClick={() => (playSfx('tap'), window.print())} aria-label="Print the puppet sheet">
            <svg viewBox="0 0 24 24" width="46%" aria-hidden>
              <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <span>Print</span>
          </button>
        </div>
      )}

      {/* print-only sheet */}
      <div className="print-sheet" aria-hidden>
        <h1>My family puppets</h1>
        <div className="print-sheet__row">
          {(stagePuppets.length ? stagePuppets : [look]).map((l, i) => (
            <div key={i} className="print-sheet__cut">
              <Puppet look={l} className="is-print" />
              <p>{puppetSentences(l).slice(0, 2).join(' ')}</p>
            </div>
          ))}
        </div>
        <p>Cut along the dashed lines. Glue each puppet on a stick.</p>
      </div>

      {phase === 'show' && stagePuppets[showIndex] && (
        <SpeakSteps key={`show-${showIndex}`} sentences={puppetSentences(stagePuppets[showIndex])} onDone={finishTurn} />
      )}
      {toast.node}
      {phase === 'done' && <Celebration title="Super puppet show!" stars={stars} onHome={onHome} onReplay={replay} reward={asset('art/puppet/face-happy.webp')} />}
    </GameScreen>
  );
}
