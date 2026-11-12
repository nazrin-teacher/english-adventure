import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, asset } from '../../components/ui';
import { SpeakSteps } from '../../components/SpeakSteps';
import { CharacterRig } from '../../components/CharacterRig';
import { GameScreen, at, boxCentre, praise, useGameStars, useGuide, useToast , pace } from '../../components/scene';
import { DESK, MISSIONS, describe, findSay, fits, itemById, putSay } from './logic';
import './bag.css';

const GAME_ID = 'its-a';
type Phase = 'discover' | 'challenge' | 'open' | 'done';
const BAG: [number, number, number, number] = [262, 420, 520, 660]; // the girl's school bag
const DESK_BOX: [number, number, number, number] = [830, 215, 1650, 655];
const DISCOVER_TARGET = 6;
const SPEAK_TARGET = 4;

/**
 * Pack My School Bag: explore the desk → listen and pack (find → put, colours,
 * numbers; drag or tap) → open the bag and say what is inside.
 */
export function ItsA({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round } = useGameStars(GAME_ID);
  const [phase, setPhase] = useState<Phase>('discover');
  const [heard, setHeard] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<'find' | 'put'>('find');
  const [selected, setSelected] = useState<string | null>(null);
  const [packed, setPacked] = useState<string[]>([]);
  const [countDone, setCountDone] = useState(0);
  const [flying, setFlying] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [spoken, setSpoken] = useState<string[]>([]);
  const [talk, setTalk] = useState<string | null>(null);
  const guide = useGuide();
  const toast = useToast();
  const bagRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{ id: string; x: number; y: number; pid: number; moved: boolean } | null>(null);

  useEffect(() => {
    setPhase('discover');
    setHeard([]);
    setIndex(0);
    setStep('find');
    setPacked([]);
    setSpoken([]);
  }, [round]);

  const m = phase === 'challenge' ? MISSIONS[index] : undefined;
  const prompt =
    phase === 'discover'
      ? "I'm going to school! Look at my things. Tap them."
      : m
        ? step === 'find' && !m.count
          ? findSay(m)
          : putSay(m)
        : phase === 'open'
          ? "Let's open my bag! What's in it? Tap and say."
          : '';

  useEffect(() => {
    if (!prompt || talk) return;
    const t = window.setTimeout(() => void audio.say(prompt), pace(380));
    return () => window.clearTimeout(t);
  }, [prompt, talk]);

  const onDesk = DESK.filter((d) => !packed.includes(d.id));

  const nextMission = () => {
    setSelected(null);
    setStep('find');
    setCountDone(0);
    setMisses(0);
    if (index + 1 >= MISSIONS.length) {
      award(2);
      setPhase('open');
    } else setIndex(index + 1);
  };

  const pack = (id: string) => {
    if (!m) return;
    setFlying(id);
    playSfx('place');
    guide.setPointAt(boxCentre(BAG));
    window.setTimeout(() => {
      setFlying(null);
      setPacked((p) => [...p, id]);
      setSelected(null);
      if (m.count) {
        const n = countDone + 1;
        setCountDone(n);
        void audio.say(['One!', 'Two!', 'Three!'][n - 1]);
        if (n >= m.count) {
          guide.react('cheer');
          toast.show(praise());
          playSfx('success');
          window.setTimeout(nextMission, pace(1100));
        }
        return;
      }
      guide.react('cheer');
      const p = praise();
      toast.show(p);
      playSfx('success');
      void audio.say(`${p} The ${itemById(id).thing} is in the bag.`).then(nextMission);
    }, 650);
  };

  const notThis = (id: string) => {
    const it = itemById(id);
    setWrong(id);
    window.setTimeout(() => setWrong(null), pace(600));
    setMisses((n) => n + 1);
    guide.react('encourage');
    playSfx('soft-no');
    toast.show('Try again!', false);
    void audio.say(`${describe(it)} ${m ? (m.count ? putSay(m) : findSay(m)) : ''}`);
  };

  const tapItem = (id: string) => {
    const it = itemById(id);
    guide.setPointAt(null);
    if (phase === 'discover') {
      playSfx('pop');
      void audio.say(describe(it));
      const next = heard.includes(id) ? heard : [...heard, id];
      setHeard(next);
      if (next.length >= DISCOVER_TARGET && heard.length < DISCOVER_TARGET) {
        window.setTimeout(() => {
          award(1);
          guide.react('cheer');
          toast.show("Let's pack my bag!");
          setPhase('challenge');
        }, 1300);
      }
      return;
    }
    if (!m || flying) return;
    if (!fits(it, m)) return notThis(id);
    playSfx('pop');
    setSelected(id);
    if (!m.count) {
      setStep('put');
      void audio.say(`Yes! ${putSay(m)}`);
    }
  };

  const tapBag = () => {
    if (phase !== 'challenge') {
      playSfx('tap');
      return;
    }
    if (!selected) {
      playSfx('soft-no');
      void audio.say(m ? findSay(m) : '');
      return;
    }
    pack(selected);
  };

  /* drag an item straight into the bag */
  const overBag = (x: number, y: number) => {
    const r = bagRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };
  const down = (id: string) => (e: RPointerEvent) => {
    if (phase !== 'challenge' || flying) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    press.current = { id, x: e.clientX, y: e.clientY, pid: e.pointerId, moved: false };
  };
  const move = (e: RPointerEvent) => {
    const p = press.current;
    if (!p || p.pid !== e.pointerId) return;
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) p.moved = true;
    if (p.moved) setDrag({ id: p.id, x: e.clientX, y: e.clientY });
  };
  const up = (e: RPointerEvent) => {
    const p = press.current;
    press.current = null;
    setDrag(null);
    if (!p || p.pid !== e.pointerId || !p.moved) return;
    if (!overBag(e.clientX, e.clientY)) return;
    if (m && fits(itemById(p.id), m)) pack(p.id);
    else notThis(p.id);
  };

  const finishTalk = () => {
    const id = talk!;
    setTalk(null);
    const next = spoken.includes(id) ? spoken : [...spoken, id];
    setSpoken(next);
    guide.react('cheer');
    toast.show(praise());
    if (next.length >= SPEAK_TARGET) {
      award(3, true);
      setPhase('done');
    }
  };

  const stage = phase === 'discover' ? 0 : phase === 'challenge' ? 1 : phase === 'open' ? 2 : 3;
  const progress = phase === 'discover' ? heard.length / DISCOVER_TARGET : phase === 'challenge' ? index / MISSIONS.length : spoken.length / SPEAK_TARGET;
  const showDesk = phase === 'discover' || phase === 'challenge';

  return (
    <GameScreen scene="bag" onHome={onHome} onParent={onParent} stars={stars} stage={stage} stageProgress={progress} prompt={phase === 'done' ? undefined : prompt} tag={m ? `${index + 1} / ${MISSIONS.length}` : undefined}>
      <div className="bag-floor" style={at([0, 640, 1672, 941])} aria-hidden />
      <CharacterRig name="bag-girl" mood={guide.mood} pointAt={guide.pointAt} />

      {/* the girl's school bag is a real drop target */}
      <button
        ref={bagRef}
        type="button"
        className={`bag-target ${selected || drag ? 'is-open' : ''}`}
        style={at(BAG)}
        onClick={tapBag}
        aria-label="school bag"
      />

      {showDesk && (
        <div className="desk-board" style={at(DESK_BOX)}>
          {DESK.map((d) => {
            const gone = packed.includes(d.id);
            return (
              <motion.button
                key={d.id}
                type="button"
                className={`desk-item ${selected === d.id ? 'is-selected' : ''} ${misses >= 2 && m && fits(d, m) && !gone ? 'is-hint' : ''} ${phase === 'discover' && !heard.includes(d.id) ? 'is-new' : ''}`}
                aria-label={`${d.colour} ${d.thing}`}
                data-item={d.id}
                style={{ visibility: gone ? 'hidden' : 'visible' }}
                disabled={gone}
                onClick={() => tapItem(d.id)}
                onPointerDown={down(d.id)}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={() => ((press.current = null), setDrag(null))}
                animate={flying === d.id ? { x: '-160%', y: '60%', scale: 0.2, opacity: 0 } : wrong === d.id ? { rotate: [0, -8, 8, 0] } : { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: flying === d.id ? 0.6 : 0.4 }}
              >
                <img src={asset(d.image)} alt="" draggable={false} />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* what is already in the bag */}
      <div className={`bag-contents ${phase === 'open' ? 'is-open' : ''}`} style={at(phase === 'open' ? [700, 200, 1640, 640] : [120, 680, 1550, 900])}>
        {packed.map((id) => (
          <motion.button
            key={id}
            type="button"
            className={`bag-contents__item ${spoken.includes(id) ? 'is-done' : ''}`}
            aria-label={`in the bag: ${itemById(id).colour} ${itemById(id).thing}`}
            data-packed={id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => (phase === 'open' ? setTalk(id) : undefined)}
            disabled={phase !== 'open'}
          >
            <img src={asset(itemById(id).image)} alt="" />
          </motion.button>
        ))}
      </div>

      {drag && <img className="drag-ghost" src={asset(itemById(drag.id).image)} alt="" style={{ left: drag.x, top: drag.y }} />}
      {talk && <SpeakSteps key={talk} sentences={[describe(itemById(talk))]} picture={<img src={asset(itemById(talk).image)} alt="" />} onDone={finishTalk} />}
      {toast.node}
      {phase === 'done' && <Celebration title="My bag is ready for school!" stars={stars} onHome={onHome} onReplay={replay} reward={asset('art/school/book.webp')} />}
      {/* keep the onDesk list used for a11y counts */}
      <span className="sr-only" aria-live="polite">{onDesk.length} things on the desk</span>
    </GameScreen>
  );
}
