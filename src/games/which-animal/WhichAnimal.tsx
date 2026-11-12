import { useCallback, useEffect, useMemo, useState } from 'react';
import { ANIMALS, ANIMAL_ORDER, type AnimalKind } from '../../content/farm';
import { ANIMAL_CLUES, ANIMAL_SOUNDS, ROUND_PROMPT } from '../../content/whichAnimal';
import { spriteBox } from '../../content/sprites';
import { audio } from '../../services/audio';
import { Celebration, RoundButton, asset } from '../../components/ui';
import { IconSpeaker } from '../../components/icons';
import { GameScreen, Sprite, at, praise, sayGood, sayTryAgain, useGameStars, useToast } from '../../components/scene';
import { makeRounds, starsFor } from './logic';

const GAME_ID = 'which-animal';

export function WhichAnimal({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round: playRound, playIndex } = useGameStars(GAME_ID);
  const rounds = useMemo(() => makeRounds(playIndex), [playIndex]);
  const [index, setIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState<AnimalKind | null>(null);
  const [right, setRight] = useState<AnimalKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setIndex(0);
    setDone(false);
    setMisses(0);
  }, [playRound]);

  const r = rounds[index];
  const prompt = r ? ROUND_PROMPT[r.kind](r.answer) : '';

  /** The cue for this round: the name, the sound or the clue. */
  const playCue = useCallback(async () => {
    if (!r) return;
    await audio.say(prompt);
    if (r.kind === 'sound') await audio.say(ANIMAL_SOUNDS[r.answer]);
    if (r.kind === 'clue') await audio.say(ANIMAL_CLUES[r.answer]);
  }, [r, prompt]);

  useEffect(() => {
    if (done) return;
    const t = window.setTimeout(() => void playCue(), 400);
    return () => window.clearTimeout(t);
  }, [index, playCue, done]);

  const tap = async (kind: AnimalKind) => {
    if (!r || busy || done) return;
    if (kind === r.answer) {
      setBusy(true);
      setRight(kind);
      const p = praise();
      toast.show(p);
      await sayGood(`${p} It's a ${ANIMALS[kind].word}.`);
      const next = index + 1;
      const s = starsFor(next, rounds.length);
      if (s > 0) award(s, next === rounds.length);
      setRight(null);
      setMisses(0);
      setBusy(false);
      if (next >= rounds.length) setDone(true);
      else setIndex(next);
    } else {
      setWrong(kind);
      window.setTimeout(() => setWrong(null), 600);
      setMisses((m) => m + 1);
      toast.show('Try again!', false);
      await sayTryAgain(`That's the ${ANIMALS[kind].word}. Try again!`);
      if (r.kind !== 'word' && r.kind !== 'shadow') await playCue();
    }
  };

  return (
    <GameScreen
      scene="which-animal"
      onHome={onHome}
      onParent={onParent}
      stars={stars}
      prompt={done ? undefined : prompt}
      tag={r ? `${index + 1} / ${rounds.length}` : undefined}
    >
      {ANIMAL_ORDER.map((kind) => (
        <Sprite
          key={kind}
          src={ANIMALS[kind].image}
          box={spriteBox(kind)}
          label={ANIMALS[kind].word}
          onClick={() => void tap(kind)}
          state={right === kind ? 'right' : wrong === kind ? 'wrong' : misses >= 2 && r?.answer === kind ? 'glow' : undefined}
        />
      ))}

      {/* big "listen again" button where the picture has its speaker */}
      {!done && (
        <div className="stage-actions" style={at([700, 160, 970, 310])}>
          <RoundButton tone="purple" size="lg" label="Listen again" onClick={() => void playCue()} pulse={r?.kind === 'sound'}>
            <IconSpeaker size="58%" />
          </RoundButton>
        </div>
      )}

      {/* silhouette card in the girl's speech bubble */}
      {r?.kind === 'shadow' && !done && (
        <div className="bubble" style={at([250, 150, 610, 330])} aria-label="Animal shadow">
          <img
            src={asset(ANIMALS[r.answer].image)}
            alt=""
            style={{ height: '88%', width: 'auto', filter: 'brightness(0) saturate(100%)', opacity: 0.85 }}
          />
          <span style={{ fontSize: '2.2em', color: 'var(--orange)' }}>?</span>
        </div>
      )}
      {r?.kind === 'clue' && !done && (
        <div className="bubble" style={{ ...at([250, 150, 640, 330]), fontSize: 'max(14px, 1.7cqw)' }}>
          {ANIMAL_CLUES[r.answer]}
        </div>
      )}

      {toast.node}
      {done && <Celebration title="You know the farm animals!" stars={stars} onHome={onHome} onReplay={replay} />}
    </GameScreen>
  );
}
