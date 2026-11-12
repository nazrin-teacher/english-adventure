/**
 * Gentle UI sounds synthesised with the Web Audio API — no files needed.
 * Every call is safe to make even if audio is unavailable or blocked.
 */

type Sfx = 'pop' | 'place' | 'success' | 'soft-no' | 'sparkle' | 'fanfare' | 'tap' | 'count' | 'munch' | 'heart';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSfxEnabled(on: boolean) {
  enabled = on;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

export function playSfx(name: Sfx) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  try {
    switch (name) {
      case 'tap':
        tone(c, 660, 0, 0.08, 'sine', 0.08);
        break;
      case 'pop':
        tone(c, 420, 0, 0.12, 'sine', 0.14, 820);
        break;
      case 'place':
        tone(c, 520, 0, 0.1, 'triangle', 0.14);
        tone(c, 780, 0.07, 0.16, 'triangle', 0.12);
        break;
      case 'success':
        [523, 659, 784, 1046].forEach((f, i) => tone(c, f, i * 0.09, 0.28, 'triangle', 0.12));
        break;
      case 'soft-no':
        tone(c, 392, 0, 0.18, 'sine', 0.1, 330);
        tone(c, 330, 0.16, 0.22, 'sine', 0.08, 294);
        break;
      case 'sparkle':
        [1318, 1568, 2093].forEach((f, i) => tone(c, f, i * 0.06, 0.18, 'sine', 0.06));
        break;
      case 'count':
        tone(c, 880, 0, 0.12, 'triangle', 0.1);
        break;
      case 'munch':
        [0, 0.12, 0.24].forEach((t) => tone(c, 180, t, 0.07, 'square', 0.04, 120));
        break;
      case 'heart':
        tone(c, 740, 0, 0.14, 'sine', 0.1, 990);
        break;
      case 'fanfare':
        [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(c, f, i * 0.12, i === 5 ? 0.6 : 0.2, 'triangle', 0.12));
        break;
    }
  } catch {
    /* ignore */
  }
}
