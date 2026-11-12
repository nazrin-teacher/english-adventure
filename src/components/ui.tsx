import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { audio } from '../services/audio';
import { startVoiceMeter, type MicSession } from '../services/mic';
import { playSfx } from '../services/sfx';
import { useApp } from '../hooks/useApp';
import { GENERAL_HELP, GAME_HELP } from '../content/parentHelp';
import type { GameId } from '../content/games';
import { IconCheck, IconClose, IconGear, IconHome, IconMic, IconPlay, IconReplay, IconSpeaker, Star } from './icons';
import './ui.css';

export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

type Tone = 'orange' | 'purple' | 'blue' | 'green' | 'pink' | 'wood';

export function RoundButton({
  tone = 'purple',
  label,
  onClick,
  children,
  size = 'md',
  pulse,
  className = '',
  disabled,
}: {
  tone?: Tone;
  label: string;
  onClick: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      className={`round-btn tone-${tone} size-${size} ${pulse ? 'is-pulsing' : ''} ${className}`}
      aria-label={label}
      title={label}
      onClick={() => {
        playSfx('tap');
        onClick();
      }}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.06 }}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

export function PillButton({
  tone = 'green',
  onClick,
  children,
  icon,
  className = '',
  pulse,
  label,
}: {
  tone?: Tone;
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  pulse?: boolean;
  label?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      className={`pill-btn tone-${tone} ${pulse ? 'is-pulsing' : ''} ${className}`}
      onClick={() => {
        playSfx('tap');
        onClick();
      }}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.04 }}
    >
      {icon && <span className="pill-btn__icon">{icon}</span>}
      <span className="pill-btn__text">{children}</span>
    </motion.button>
  );
}

export function StarPill({ stars, total = 3, className = '', label }: { stars: number; total?: number; className?: string; label?: string }) {
  return (
    <div className={`star-pill ${className}`} role="img" aria-label={label ?? `${stars} of ${total} stars`}>
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className="star-pill__star"
          initial={false}
          animate={i < stars ? { scale: [1, 1.35, 1], rotate: [0, -12, 0] } : { scale: 1 }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
        >
          <Star filled={i < stars} size="100%" />
        </motion.span>
      ))}
    </div>
  );
}

export function HomeButton({ onClick }: { onClick: () => void }) {
  return (
    <RoundButton tone="orange" label="Home" onClick={onClick}>
      <IconHome size="58%" />
    </RoundButton>
  );
}

export function ListenButton({ text, tone = 'blue', size = 'md', label = 'Listen again' }: { text: string; tone?: Tone; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  return (
    <RoundButton tone={tone} size={size} label={label} onClick={() => void audio.say(text)}>
      <IconSpeaker size="60%" />
    </RoundButton>
  );
}

/**
 * Speaking practice: model sentence (auto-played), optional live voice meter,
 * and an "I said it!" confirmation. Never claims to check pronunciation.
 */
export function SpeakPrompt({
  sentence,
  onDone,
  picture,
  doneLabel = 'I said it!',
}: {
  sentence: string;
  onDone: () => void;
  picture?: ReactNode;
  doneLabel?: string;
}) {
  const [heard, setHeard] = useState(false);

  useEffect(() => {
    void audio.say(sentence).then(() => audio.say('Your turn!'));
  }, [sentence]);

  const finish = () => {
    playSfx('success');
    onDone();
  };

  return (
    <motion.div className="speak-card" initial={{ y: 40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }}>
      <div className="speak-card__row">
        {picture && <div className="speak-card__picture">{picture}</div>}
        <div className="speak-card__bubble">
          <p className="speak-card__sentence">{sentence}</p>
          <ListenButton text={sentence} label="Listen" />
        </div>
      </div>
      <div className="speak-card__actions">
        <MicMeter onHeard={setHeard} />
        <PillButton tone="green" icon={<IconCheck size="100%" />} onClick={finish} pulse={heard}>
          {doneLabel}
        </PillButton>
      </div>
    </motion.div>
  );
}

/**
 * Optional microphone with a live voice meter (opt-in, permission-based).
 * Nothing is recorded or sent; it only shows that the child's voice is heard.
 * Renders nothing when the grown-up turned the microphone off or it is unavailable.
 */
export function MicMeter({ onHeard }: { onHeard?: (heard: boolean) => void }) {
  const { state } = useApp();
  const [level, setLevel] = useState(0);
  const [micState, setMicState] = useState<'off' | 'on' | 'unavailable'>('off');
  const [heard, setHeard] = useState(false);
  const session = useRef<MicSession | null>(null);

  useEffect(
    () => () => {
      session.current?.stop();
      session.current = null;
    },
    [],
  );
  useEffect(() => {
    if (level > 0.18 && !heard) {
      setHeard(true);
      onHeard?.(true);
    }
  }, [level, heard, onHeard]);

  const toggle = async () => {
    if (session.current) {
      session.current.stop();
      session.current = null;
      setMicState('off');
      return;
    }
    try {
      audio.stop();
      session.current = await startVoiceMeter(setLevel);
      setMicState('on');
      setHeard(false);
      onHeard?.(false);
    } catch {
      setMicState('unavailable');
    }
  };

  if (!state.settings.mic || micState === 'unavailable') return null;
  const bars = 7;
  return (
    <div className="speak-card__mic">
      <RoundButton tone="pink" label={micState === 'on' ? 'Stop microphone' : 'Use microphone'} onClick={() => void toggle()} pulse={micState === 'on'}>
        <IconMic size="56%" />
      </RoundButton>
      <div className={`voice-meter ${micState === 'on' ? 'is-on' : ''} ${heard ? 'is-heard' : ''}`} aria-hidden>
        {Array.from({ length: bars }, (_, i) => {
          const center = 1 - Math.abs(i - (bars - 1) / 2) / (bars / 2);
          return <span key={i} style={{ transform: `scaleY(${0.15 + Math.min(1, level * 2.2) * (0.35 + center * 0.65)})` }} />;
        })}
      </div>
    </div>
  );
}

/** Grown-ups only: press and hold to open (keeps little fingers out of settings). */
export function ParentButton({ onOpen }: { onOpen: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const start = () => {
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      onOpen();
    }, 1200);
  };
  const cancel = () => {
    setHolding(false);
    if (timer.current) window.clearTimeout(timer.current);
  };
  return (
    <button
      type="button"
      className={`round-btn tone-purple size-md parent-btn ${holding ? 'is-holding' : ''}`}
      aria-label="Grown-ups: press and hold for settings"
      title="Grown-ups: press and hold"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <IconGear size="60%" />
      <svg className="parent-btn__ring" viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r="16" />
      </svg>
    </button>
  );
}

export function SoundToggle() {
  const { state, updateSettings } = useApp();
  const on = state.settings.sound;
  return (
    <RoundButton tone="purple" label={on ? 'Sound off' : 'Sound on'} onClick={() => updateSettings({ sound: !on })}>
      <IconSpeaker size="60%" off={!on} />
    </RoundButton>
  );
}

export function ParentPanel({ open, onClose, gameId }: { open: boolean; onClose: () => void; gameId?: GameId }) {
  const { state, updateSettings, resetProgress } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (!open) setConfirmReset(false);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="parent-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Ebeveynler için" lang="tr"
            initial={{ y: 40, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="parent-panel__head">
              <h2>Ebeveynler için</h2>
              <RoundButton tone="orange" size="sm" label="Kapat" onClick={onClose}>
                <IconClose size="55%" />
              </RoundButton>
            </div>
            {gameId && (
              <dl className="parent-panel__game">
                <dt>Ne yapacak?</dt>
                <dd>{GAME_HELP[gameId].todo}</dd>
                <dt>Ne söyleyecek?</dt>
                <dd lang="en">{GAME_HELP[gameId].say}</dd>
                <dt>Nasıl destek olabilirsiniz?</dt>
                <dd>{GAME_HELP[gameId].help}</dd>
              </dl>
            )}
            <ul className="parent-panel__tips">
              {GENERAL_HELP.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div className="parent-panel__settings">
              <label className="switch">
                <input type="checkbox" checked={state.settings.sound} onChange={(e) => updateSettings({ sound: e.target.checked })} />
                <span>Ses ve konuşma</span>
              </label>
              <label className="switch">
                <input type="checkbox" checked={state.settings.mic} onChange={(e) => updateSettings({ mic: e.target.checked })} />
                <span>Mikrofon düğmesini göster</span>
              </label>
              {!audio.hasSpeechSynthesis && <p className="parent-panel__warn">Bu tarayıcı İngilizce cümleleri sesli okuyamıyor. Cümleler ekranda yine de görünür.</p>}
              {confirmReset ? (
                <div className="parent-panel__confirm">
                  <span>Bu cihazdaki tüm yıldızlar silinsin mi?</span>
                  <button type="button" className="text-btn danger" onClick={() => (resetProgress(), setConfirmReset(false))}>
                    Evet, sil
                  </button>
                  <button type="button" className="text-btn" onClick={() => setConfirmReset(false)}>
                    Vazgeç
                  </button>
                </div>
              ) : (
                <button type="button" className="text-btn" onClick={() => setConfirmReset(true)}>
                  İlerlemeyi sıfırla…
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** End-of-game celebration with star burst. */
export function Celebration({ title, stars, onReplay, onHome, reward }: { title: string; stars: number; onReplay: () => void; onHome: () => void; reward?: string }) {
  useEffect(() => {
    playSfx('fanfare');
    void audio.say(title);
  }, [title]);
  return (
    <motion.div className="modal-backdrop celebrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="confetti" aria-hidden>
        {Array.from({ length: 26 }, (_, i) => (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
            animate={{
              x: Math.cos((i / 26) * Math.PI * 2) * (180 + (i % 5) * 50),
              y: Math.sin((i / 26) * Math.PI * 2) * (140 + (i % 4) * 45),
              opacity: 0,
              scale: 1.2,
              rotate: 360,
            }}
            transition={{ duration: 1.6, ease: 'easeOut', delay: (i % 3) * 0.12 }}
          >
            <Star filled size={28} />
          </motion.span>
        ))}
      </div>
      <motion.div className="celebrate__card" initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
        <h2>{title}</h2>
        <StarPill stars={stars} className="celebrate__stars" />
        {reward && (
          <motion.div className="celebrate__reward" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.5, type: 'spring' }}>
            <img src={reward} alt="" />
            <span>New sticker!</span>
          </motion.div>
        )}
        <div className="celebrate__actions">
          <RoundButton tone="orange" size="lg" label="Home" onClick={onHome}>
            <IconHome size="56%" />
          </RoundButton>
          <RoundButton tone="green" size="lg" label="Play again" onClick={onReplay}>
            <IconReplay size="56%" />
          </RoundButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { IconPlay };
