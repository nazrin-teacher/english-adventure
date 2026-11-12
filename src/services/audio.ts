import { findRecording } from '../content/audioManifest';

/**
 * AudioService — one place that turns "say this sentence" into sound.
 *
 * Order of preference:
 *   1. A professionally recorded file listed in content/audioManifest.ts
 *   2. Browser speech synthesis (English voice, slightly slower for children)
 *   3. Silence — the sentence is always shown on screen too, so nothing breaks.
 *
 * Only one sentence plays at a time; a new request interrupts the previous one.
 */

export type SpeakOptions = {
  /** 0.5 – 1.2. Default 0.85 (clear, unhurried). */
  rate?: number;
  /** Called when the sentence finished (or failed / was skipped). */
  onEnd?: () => void;
};

type Listener = (speaking: boolean, text: string | null) => void;

class AudioService {
  private enabled = true;
  private current: HTMLAudioElement | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;
  private listeners = new Set<Listener>();
  private token = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.pickVoice();
      try {
        window.speechSynthesis.addEventListener('voiceschanged', () => this.pickVoice());
      } catch {
        /* very old browsers: ignore */
      }
    }
  }

  get isEnabled() {
    return this.enabled;
  }

  /** True when the browser can speak without recorded files. */
  get hasSpeechSynthesis() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stop();
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(speaking: boolean, text: string | null) {
    this.listeners.forEach((l) => l(speaking, text));
  }

  private pickVoice() {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      this.voicesLoaded = true;
      const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
      const score = (v: SpeechSynthesisVoice) => {
        const lang = v.lang.toLowerCase();
        const name = v.name.toLowerCase();
        let s = 0;
        if (lang === 'en-gb') s += 40; // "mum", "rubber" – British English matches the course
        else if (lang === 'en-us') s += 25;
        else s += 10;
        if (/natural|neural|premium|enhanced|siri/.test(name)) s += 20;
        if (/female|samantha|serena|kate|libby|sonia|martha|stephanie|karen|moira|tessa/.test(name)) s += 8;
        if (/google/.test(name)) s += 6;
        if (/novelty|bad|whisper|zarvox|trinoids|albert|bells|boing|bubbles|cellos|hysterical|organ|superstar|jester|wobble/.test(name)) s -= 100;
        if (v.localService) s += 2;
        return s;
      };
      this.voice = en.sort((a, b) => score(b) - score(a))[0] ?? null;
    } catch {
      this.voice = null;
    }
  }

  stop() {
    this.token++;
    if (this.current) {
      this.current.pause();
      this.current.src = '';
      this.current = null;
    }
    if (this.hasSpeechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    this.emit(false, null);
  }

  /**
   * Speak a sentence. Resolves when finished (never rejects).
   */
  say(text: string, opts: SpeakOptions = {}): Promise<void> {
    this.stop();
    const myToken = this.token;
    const done = (resolve: () => void) => {
      if (myToken === this.token) this.emit(false, null);
      opts.onEnd?.();
      resolve();
    };

    return new Promise<void>((resolve) => {
      if (!this.enabled) return done(resolve);
      this.emit(true, text);

      const file = findRecording(text);
      if (file) {
        const el = new Audio(file);
        this.current = el;
        el.onended = () => done(resolve);
        el.onerror = () => {
          // Recording missing or broken → fall back to synthesis.
          if (myToken !== this.token) return done(resolve);
          this.current = null;
          this.synth(text, opts, myToken).then(() => done(resolve));
        };
        el.play().catch(() => {
          if (myToken !== this.token) return done(resolve);
          this.current = null;
          this.synth(text, opts, myToken).then(() => done(resolve));
        });
        return;
      }
      this.synth(text, opts, myToken).then(() => done(resolve));
    });
  }

  private synth(text: string, opts: SpeakOptions, myToken: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.hasSpeechSynthesis) return resolve();
      try {
        if (!this.voicesLoaded) this.pickVoice();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = this.voice?.lang ?? 'en-GB';
        if (this.voice) u.voice = this.voice;
        u.rate = opts.rate ?? 0.85;
        u.pitch = 1.08;
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          clearTimeout(guard);
          resolve();
        };
        // Some browsers never fire `end` (e.g. no voice installed). Guard with a timeout
        // proportional to the sentence length so the game never waits forever.
        const guard = window.setTimeout(finish, 1500 + text.length * 120);
        u.onend = finish;
        u.onerror = finish;
        if (myToken !== this.token) return finish();
        window.speechSynthesis.speak(u);
      } catch {
        resolve();
      }
    });
  }
}

export const audio = new AudioService();
