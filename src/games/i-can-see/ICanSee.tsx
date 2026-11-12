import { useEffect, useMemo, useState } from 'react';
import { ANIMALS, ANIMAL_ORDER, type AnimalKind } from '../../content/farm';
import { COLOUR_SENTENCE, LEGS_SENTENCE, SEE_LAYOUT, WHERE_SENTENCES, seeSentence } from '../../content/iCanSee';
import { spriteBox, standAt } from '../../content/sprites';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, ListenButton, asset } from '../../components/ui';
import { SpeakSteps } from '../../components/SpeakSteps';
import { GameScreen, Sprite, at, shuffle, useGameStars, useToast } from '../../components/scene';

const GAME_ID = 'i-can-see';
type Phase = 'see' | 'describe' | 'where' | 'done';

const boxOf = (k: AnimalKind) => {
  const [x, y, h] = SEE_LAYOUT[k];
  return standAt(spriteBox(k), x, y, h);
};

export function ICanSee({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const [phase, setPhase] = useState<Phase>('see');
  const [seen, setSeen] = useState<AnimalKind[]>([]);
  const [described, setDescribed] = useState<AnimalKind[]>([]);
  const [whereIndex, setWhereIndex] = useState(0);
  const [talk, setTalk] = useState<{ kind: AnimalKind; sentences: string[] } | null>(null);
  const [bounce, setBounce] = useState<AnimalKind | null>(null);
  const [ribbon, setRibbon] = useState('Look at the farm!');
  const toast = useToast();

  const describeTargets = useMemo(() => {
    const rest = shuffle(ANIMAL_ORDER.filter((a) => a !== 'horse'), playIndex);
    return playIndex % 2 ? ['horse' as AnimalKind, ...rest.slice(0, 2)] : rest.slice(0, 3);
  }, [playIndex]);

  useEffect(() => {
    setPhase('see');
    setSeen([]);
    setDescribed([]);
    setWhereIndex(0);
    setTalk(null);
  }, [round]);

  const target = phase === 'describe' ? describeTargets[described.length] : undefined;
  const where = phase === 'where' ? WHERE_SENTENCES[whereIndex] : undefined;

  const prompt =
    phase === 'see'
      ? 'What can you see? Tap an animal.'
      : phase === 'describe'
        ? 'Tap the shining animal. Tell me about it.'
        : phase === 'where'
          ? `Where is the ${where?.a}? Tap it.`
          : '';

  useEffect(() => {
    if (!prompt || talk) return;
    const t = window.setTimeout(() => void audio.say(prompt), 450);
    return () => window.clearTimeout(t);
  }, [prompt, talk]);

  const tap = (k: AnimalKind) => {
    if (talk) return;
    setBounce(k);
    window.setTimeout(() => setBounce(null), 500);
    if (phase === 'see') {
      setTalk({ kind: k, sentences: [seeSentence(k)] });
      return;
    }
    if (phase === 'describe') {
      if (k !== target) {
        playSfx('soft-no');
        void audio.say(`That's the ${k}. Find the shining animal!`);
        return;
      }
      setTalk({ kind: k, sentences: [seeSentence(k), COLOUR_SENTENCE[k], LEGS_SENTENCE[k]] });
      return;
    }
    if (phase === 'where' && where) {
      if (k !== where.a) {
        playSfx('soft-no');
        void audio.say(`That's the ${k}. Where is the ${where.a}?`);
        return;
      }
      setTalk({ kind: k, sentences: [where.text] });
    }
  };

  const finishTalk = () => {
    if (!talk) return;
    const k = talk.kind;
    setTalk(null);
    playSfx('success');
    if (phase === 'see') {
      const next = seen.includes(k) ? seen : [...seen, k];
      setSeen(next);
      if (next.length >= ANIMAL_ORDER.length) {
        award(1);
        toast.show('Great! You can see all the animals!');
        setPhase('describe');
      } else toast.show(`Great! You can see the ${k}!`);
      setRibbon(`Great! You can see the ${k}!`);
    } else if (phase === 'describe') {
      const next = [...described, k];
      setDescribed(next);
      toast.show('Super!');
      setRibbon(`Super! You told me about the ${k}!`);
      if (next.length >= describeTargets.length) {
        award(2);
        setPhase('where');
      }
    } else if (phase === 'where') {
      toast.show('Well done!');
      setRibbon('Well done!');
      if (whereIndex + 1 >= WHERE_SENTENCES.length) {
        award(3, true);
        setPhase('done');
      } else setWhereIndex(whereIndex + 1);
    }
  };

  const stateOf = (k: AnimalKind) => {
    if (bounce === k) return 'right' as const;
    if (phase === 'see' && seen.includes(k)) return 'done' as const;
    if (phase === 'describe' && k === target) return 'glow' as const;
    if (phase === 'where' && where && (k === where.a || k === where.b)) return 'glow' as const;
    return undefined;
  };

  // bottom sentence cards (like the picture): what we are practising now
  const cards: { pic: AnimalKind; text: string; done: boolean }[] =
    phase === 'describe' && target
      ? [
          { pic: target, text: seeSentence(target), done: false },
          { pic: target, text: COLOUR_SENTENCE[target], done: false },
          { pic: target, text: LEGS_SENTENCE[target], done: false },
        ]
      : phase === 'where'
        ? WHERE_SENTENCES.map((w, i) => ({ pic: w.a, text: w.text, done: i < whereIndex }))
        : phase === 'see'
          ? ANIMAL_ORDER.filter((a) => seen.includes(a)).slice(-3).map((a) => ({ pic: a, text: seeSentence(a), done: true }))
          : [];

  return (
    <GameScreen
      scene="i-can-see"
      onHome={onHome}
      onParent={onParent}
      stars={stars}
      prompt={phase === 'done' ? undefined : prompt}
      tag={phase === 'see' ? `${seen.length} / ${ANIMAL_ORDER.length}` : phase === 'describe' ? `${described.length} / ${describeTargets.length}` : phase === 'where' ? 'Where?' : undefined}
    >
      {ANIMAL_ORDER.map((k) => (
        <Sprite key={k} src={ANIMALS[k].image} box={boxOf(k)} label={`${k} on the farm`} onClick={() => tap(k)} state={stateOf(k)} />
      ))}

      {/* three sentence cards along the bottom, like the picture (empty ones wait to be filled) */}
      <div className="sentence-cards" style={at([40, 650, 1640, 790])}>
        {[0, 1, 2].map((i) => {
          const c = cards[i];
          return c ? (
            <div key={c.text} className={`sentence-card ${c.done ? 'is-done' : ''}`}>
              <img src={asset(ANIMALS[c.pic].image)} alt="" />
              <span>{c.text}</span>
              <ListenButton text={c.text} size="sm" label={`Listen: ${c.text}`} />
            </div>
          ) : (
            <div key={`empty-${i}`} className="sentence-card is-empty" aria-hidden />
          );
        })}
      </div>
      <div className="ribbon" style={at([470, 800, 1220, 915])} aria-live="polite">
        {ribbon}
      </div>

      {talk && <SpeakSteps key={talk.kind + talk.sentences[0]} sentences={talk.sentences} picture={<img src={asset(ANIMALS[talk.kind].image)} alt="" />} onDone={finishTalk} />}
      {toast.node}
      {phase === 'done' && <Celebration title="Great! You can see the farm!" stars={stars} onHome={onHome} onReplay={replay} />}
    </GameScreen>
  );
}
