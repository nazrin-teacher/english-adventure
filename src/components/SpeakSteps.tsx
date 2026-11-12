import { useState, type ReactNode } from 'react';
import { SpeakPrompt } from './ui';

/**
 * Model → repeat, one sentence after another, inside the stage
 * (e.g. "I can see a horse." → "It's brown." → "It's got four legs.").
 */
export function SpeakSteps({ sentences, picture, onDone }: { sentences: string[]; picture?: ReactNode; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const sentence = sentences[step];
  if (!sentence) return null;
  return (
    <div className="speak-layer">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {sentences.length > 1 && (
          <div className="speak-steps__dots" aria-label={`Sentence ${step + 1} of ${sentences.length}`}>
            {sentences.map((s, i) => (
              <span key={s} className={i < step ? 'done' : i === step ? 'now' : ''} />
            ))}
          </div>
        )}
        <SpeakPrompt
          key={`${step}-${sentence}`}
          sentence={sentence}
          picture={picture}
          onDone={() => (step + 1 < sentences.length ? setStep(step + 1) : onDone())}
        />
      </div>
    </div>
  );
}
