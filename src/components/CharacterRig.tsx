import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import rigs from '../content/rigs.json';
import { useSpeaking } from '../hooks/useApp';
import { asset } from './ui';
import './rig.css';

/**
 * Cut-out animation of a supplied character: separate body, pointing forearm,
 * eyelids and mouth. The character breathes, blinks, talks while the narrator
 * speaks, aims the pointing hand at a target, cheers and encourages.
 */
export type RigName = keyof typeof rigs;
export type Mood = 'idle' | 'cheer' | 'encourage';

type Box = number[];
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

type RigData = {
  scene: { width: number; height: number };
  body: { src: string; box: number[] };
  arm?: { src: string; box: number[]; pivot: number[] };
  mouth: { src: string; box: number[] };
  eyes: { cx: number; cy: number; rx: number; ry: number; rot: number }[];
  skin: string;
};

export function CharacterRig({
  name,
  pointAt,
  mood = 'idle',
  talks = true,
}: {
  name: RigName;
  pointAt?: [number, number] | null;
  mood?: Mood;
  /** Only the character that "is" the narrator moves its mouth. */
  talks?: boolean;
}) {
  const rig = rigs[name] as RigData;
  const arm = rig.arm;
  const speaking = useSpeaking() && talks;
  const reduce = useReducedMotion();
  const [blinkKey, setBlinkKey] = useState(0);
  const { width: SW, height: SH } = rig.scene;
  const [bl, bt, br, bb] = rig.body.box as Box;
  const bw = br - bl, bh = bb - bt;
  // positions of child layers relative to the body box
  const inBody = ([l, t, r, b]: Box) => ({ left: pct(l - bl, bw), top: pct(t - bt, bh), width: pct(r - l, bw), height: pct(b - t, bh) });

  // natural, irregular blinking
  useEffect(() => {
    if (reduce) return;
    let t: number;
    const next = () => {
      t = window.setTimeout(() => {
        setBlinkKey((k) => k + 1);
        next();
      }, 2200 + Math.random() * 3200);
    };
    next();
    return () => window.clearTimeout(t);
  }, [reduce]);

  // aim the pointing hand at the target (clamped to a natural range)
  const [px, py] = arm?.pivot ?? [0, 0];
  const [al, at, ar, ab] = (arm?.box ?? [0, 0, 1, 1]) as Box;
  let armAngle = 0;
  if (arm) {
    const baseAngle = (Math.atan2(at + (ab - at) * 0.1 - py, ar - px) * 180) / Math.PI;
    if (mood === 'cheer') armAngle = -24;
    else if (pointAt) {
      const target = (Math.atan2(pointAt[1] - py, pointAt[0] - px) * 180) / Math.PI;
      armAngle = Math.max(-28, Math.min(30, target - baseAngle));
    }
  }
  // characters without a moving arm lean gently towards what they are showing
  const lean = !arm && pointAt ? Math.max(-4, Math.min(4, ((pointAt[0] - (bl + br) / 2) / SW) * 8)) : 0;
  const big = Boolean(arm); // full-figure rigs can jump higher

  return (
    <motion.div
      className={`rig rig--${mood} ${speaking ? 'is-talking' : ''}`}
      style={{ left: pct(bl, SW), top: pct(bt, SH), width: pct(bw, SW), height: pct(bh, SH) }}
      animate={
        reduce
          ? undefined
          : mood === 'cheer'
            ? big
              ? { y: [0, -26, 0, -12, 0], rotate: [0, -2, 2, 0] }
              : { y: [0, -9, 0, -4, 0], scale: [1, 1.03, 1, 1.01, 1], rotate: [lean, lean - 2, lean + 2, lean] }
            : mood === 'encourage'
              ? { rotate: [lean, lean - 3, lean - 3, lean], y: [0, 3, 3, 0] }
              : { y: 0, rotate: lean, scale: 1 }
      }
      transition={{ duration: mood === 'cheer' ? 0.9 : 1.2 }}
      aria-hidden
    >
      <div className="rig__breathe">
        <img className="rig__layer" src={asset(rig.body.src)} alt="" draggable={false} />
        {/* eyelids */}
        {rig.eyes.map((e, i) => (
          <span
            key={i}
            className="rig__eye"
            style={{ ...inBody([e.cx - e.rx, e.cy - e.ry, e.cx + e.rx, e.cy + e.ry]), rotate: `${e.rot}deg` }}
          >
            <span key={blinkKey} className="rig__lid" style={{ background: rig.skin }} />
          </span>
        ))}
        {/* mouth: skin patch underneath, mouth layer opens and closes while talking */}
        <span className="rig__mouth-patch" style={{ ...inBody(rig.mouth.box as Box), background: rig.skin }} />
        <img className="rig__mouth" src={asset(rig.mouth.src)} style={inBody(rig.mouth.box as Box)} alt="" draggable={false} />
        {/* pointing forearm */}
        {arm && (
        <motion.img
          className="rig__arm"
          src={asset(arm!.src)}
          style={{ ...inBody([al, at, ar, ab]), transformOrigin: `${pct(px - al, ar - al)} ${pct(py - at, ab - at)}` }}
          animate={{ rotate: armAngle }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          alt=""
          draggable={false}
        />
        )}
      </div>
    </motion.div>
  );
}
