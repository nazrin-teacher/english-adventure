import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { ANIMALS, ANIMAL_ORDER, type AnimalKind } from '../../content/farm';
import { COLOUR_SENTENCE, SAFARI_MISSIONS, SEE_LAYOUT, describe2, seeSentence } from '../../content/iCanSee';
import { spriteBox, standAt } from '../../content/sprites';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, ListenButton, PillButton, asset } from '../../components/ui';
import { IconCheck } from '../../components/icons';
import { SpeakSteps } from '../../components/SpeakSteps';
import { CharacterRig } from '../../components/CharacterRig';
import { GameScreen, SH, SW, Sprite, at, boxCentre, praise, shuffle, useGameStars, useGuide, useToast , pace } from '../../components/scene';
import './safari.css';

const GAME_ID = 'i-can-see';
type Phase = 'discover' | 'challenge' | 'report' | 'review' | 'done';
const LENS_R = 190; // binocular lens radius, scene px
const REPORT_TARGET = 3;

const boxOf = (k: AnimalKind) => {
  const [x, y, h] = SEE_LAYOUT[k];
  return standAt(spriteBox(k), x, y, h);
};

/**
 * Farm Safari: look through magic binoculars. Discover the animals, solve
 * observation missions (colour, size, legs, next to, on), then make a spoken
 * farm report about the animals you choose.
 */
export function ICanSee({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const missions = useMemo(() => shuffle(SAFARI_MISSIONS, playIndex).slice(0, 5), [playIndex]);
  const [phase, setPhase] = useState<Phase>('discover');
  const [lens, setLens] = useState<[number, number]>([1000, 470]);
  const [spotted, setSpotted] = useState<AnimalKind[]>([]);
  const [index, setIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [bounce, setBounce] = useState<AnimalKind | null>(null);
  const [wrong, setWrong] = useState<AnimalKind | null>(null);
  const [report, setReport] = useState<AnimalKind[]>([]);
  const [talk, setTalk] = useState<AnimalKind | null>(null);
  const [busy, setBusy] = useState(false);
  const guide = useGuide();
  const toast = useToast();
  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    setPhase('discover');
    setSpotted([]);
    setIndex(0);
    setReport([]);
  }, [round]);

  const m = phase === 'challenge' ? missions[index] : undefined;
  const prompt =
    phase === 'discover'
      ? 'Move the binoculars. What can you see?'
      : m
        ? m.say
        : phase === 'report'
          ? 'Make a farm report! Choose three animals.'
          : phase === 'review'
            ? 'Listen to your farm report!'
            : '';

  useEffect(() => {
    if (!prompt || talk) return;
    const t = window.setTimeout(() => void audio.say(prompt), pace(420));
    return () => window.clearTimeout(t);
  }, [prompt, talk]);

  const inLens = (k: AnimalKind) => {
    const [cx, cy] = boxCentre(boxOf(k));
    return Math.hypot(cx - lens[0], cy - lens[1]) < LENS_R * 0.8;
  };

  // Discover: announce animals as they come into view
  useEffect(() => {
    if (phase !== 'discover') return;
    const seen = ANIMAL_ORDER.find((k) => inLens(k) && !spotted.includes(k));
    if (!seen) return;
    playSfx('sparkle');
    setBounce(seen);
    window.setTimeout(() => setBounce(null), pace(600));
    void audio.say(`I can see a ${seen}!`);
    const next = [...spotted, seen];
    setSpotted(next);
    guide.setPointAt(boxCentre(boxOf(seen)));
    if (next.length === ANIMAL_ORDER.length) {
      window.setTimeout(() => {
        award(1);
        guide.react('cheer');
        toast.show('You can see all the animals!');
        setPhase('challenge');
      }, 1600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens, phase]);

  const toScene = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = stageRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * SW, ((e.clientY - r.top) / r.height) * SH];
  };
  const onDown = (e: RPointerEvent) => {
    if (phase === 'done' || talk) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setLens(toScene(e));
  };
  const onMove = (e: RPointerEvent) => dragging.current && setLens(toScene(e));
  const onUp = (e: RPointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    // a tap through the lens on an animal counts as choosing it
    const [x, y] = toScene(e);
    const hit = ANIMAL_ORDER.find((k) => {
      const b = boxOf(k);
      return x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
    });
    if (hit) choose(hit);
  };

  const choose = async (k: AnimalKind) => {
    if (busy) return;
    setLens(boxCentre(boxOf(k)));
    guide.setPointAt(boxCentre(boxOf(k)));
    if (phase === 'discover') return;
    if (phase === 'report') {
      if (report.includes(k)) return;
      setTalk(k);
      return;
    }
    if (!m) return;
    if (k === m.answer) {
      setBusy(true);
      setBounce(k);
      guide.react('cheer');
      const p = praise();
      toast.show(p);
      playSfx('success');
      await audio.say(`${p} I can see a ${k}.`);
      setBounce(null);
      setMisses(0);
      setBusy(false);
      if (index + 1 >= missions.length) {
        award(2);
        setPhase('report');
      } else setIndex(index + 1);
    } else {
      setWrong(k);
      window.setTimeout(() => setWrong(null), pace(600));
      setMisses((n) => n + 1);
      guide.react('encourage');
      playSfx('soft-no');
      toast.show('Look again!', false);
      await audio.say(`That's the ${k}. ${m.say}`);
    }
  };

  const finishTalk = () => {
    const k = talk!;
    setTalk(null);
    const next = [...report, k];
    setReport(next);
    guide.react('cheer');
    if (next.length >= REPORT_TARGET) setPhase('review');
  };

  const sentencesFor = (k: AnimalKind) => [seeSentence(k), COLOUR_SENTENCE[k], describe2(k)];
  const playReport = async () => {
    for (const k of report) {
      setLens(boxCentre(boxOf(k)));
      setBounce(k);
      for (const s of sentencesFor(k)) await audio.say(s);
      setBounce(null);
    }
  };

  const stage = phase === 'discover' ? 0 : phase === 'challenge' ? 1 : phase === 'done' ? 3 : 2;
  const progress = phase === 'discover' ? spotted.length / 6 : phase === 'challenge' ? index / missions.length : report.length / REPORT_TARGET;
  const lensOn = phase === 'discover' || phase === 'challenge';

  return (
    <GameScreen scene="i-can-see" onHome={onHome} onParent={onParent} stars={stars} stage={stage} stageProgress={progress} prompt={phase === 'done' ? undefined : prompt} tag={m ? `${index + 1} / ${missions.length}` : undefined}>
      <div ref={stageRef} className="safari-field" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => (dragging.current = false)} />
      {ANIMAL_ORDER.map((k) => (
        <Sprite
          key={k}
          src={ANIMALS[k].image}
          box={boxOf(k)}
          label={`${k} on the farm`}
          onClick={() => void choose(k)}
          className="is-alive"
          state={bounce === k ? 'right' : wrong === k ? 'wrong' : m && misses >= 2 && m.answer === k ? 'glow' : report.includes(k) ? 'done' : undefined}
        />
      ))}

      {/* binoculars: everything outside the two lenses is dimmed */}
      {lensOn && (
        <>
          <div
            className="binoculars"
            aria-hidden
            style={{ '--lx': `${(lens[0] / SW) * 100}%`, '--ly': `${(lens[1] / SH) * 100}%`, '--r': `${(LENS_R / SW) * 100}cqw` } as Record<string, string>}
          />
          {[-0.62, 0.62].map((dx) => (
            <span
              key={dx}
              className="binoculars-rim"
              aria-hidden
              style={at([lens[0] + dx * LENS_R - LENS_R, lens[1] - LENS_R, lens[0] + dx * LENS_R + LENS_R, lens[1] + LENS_R])}
            />
          ))}
        </>
      )}

      <CharacterRig name="safari-boy" mood={guide.mood} pointAt={guide.pointAt} />

      {/* seen / report cards along the bottom */}
      <div className="sentence-cards" style={at([40, 700, 1640, 830])}>
        {(phase === 'report' || phase === 'review' || phase === 'done'
          ? [0, 1, 2].map((i) => report[i])
          : ANIMAL_ORDER.map((k) => (phase === 'discover' ? (spotted.includes(k) ? k : undefined) : k))
        ).map((k, i) =>
          k ? (
            <div key={`${k}-${i}`} className={`sentence-card ${report.includes(k) ? 'is-done' : ''}`}>
              <img src={asset(ANIMALS[k].image)} alt="" />
              {(phase === 'report' || phase === 'review' || phase === 'done') && <span>{seeSentence(k)}</span>}
              {(phase === 'report' || phase === 'review') && <ListenButton text={sentencesFor(k).join(' ')} size="sm" label={`Listen: ${seeSentence(k)}`} />}
            </div>
          ) : (
            <div key={`empty-${i}`} className="sentence-card is-empty" aria-hidden />
          ),
        )}
      </div>

      {phase === 'review' && (
        <div className="stage-actions is-big" style={at([520, 520, 1420, 680])}>
          <PillButton tone="blue" onClick={() => void playReport()}>
            Play my report
          </PillButton>
          <PillButton
            tone="green"
            icon={<IconCheck size="100%" />}
            onClick={() => {
              award(3, true);
              setPhase('done');
            }}
          >
            I said it!
          </PillButton>
        </div>
      )}

      {talk && <SpeakSteps key={talk} sentences={sentencesFor(talk)} picture={<img src={asset(ANIMALS[talk].image)} alt="" />} onDone={finishTalk} />}
      {toast.node}
      {phase === 'done' && <Celebration title="Great farm report!" stars={stars} onHome={onHome} onReplay={replay} reward={asset('art/animals/duck.webp')} />}
    </GameScreen>
  );
}
