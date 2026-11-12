import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CARD_BACK, MEMBERS, MEMORY_MEMBERS, SOFA, SOFA_ORDER, type Member, type SofaMember } from '../../content/family';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, ListenButton, asset } from '../../components/ui';
import { SpeakSteps } from '../../components/SpeakSteps';
import { CharacterRig } from '../../components/CharacterRig';
import { ChoiceRow, EyesClosed, GameScreen, at, boxCentre, praise, shuffle, useGameStars, useGuide, useToast , pace } from '../../components/scene';
import { flip, gridFor, makeDeck } from './logic';

const GAME_ID = 'family-memory';
type Phase = 'discover' | 'memory' | 'missing' | 'listen' | 'picture' | 'speak' | 'done';
const BOARD: [number, number, number, number] = [540, 120, 1470, 690];
const LEVELS = [3, 4];
const SPEAK_TARGET = 3;
const pron = (m: Member) => (MEMBERS[m].he ? "He's" : "She's");

/**
 * Family Mystery: meet the family → memory, "who is missing?", listen-and-tap
 * and find-in-the-picture challenges → introduce family members.
 */
export function FamilyMemory({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { stars, award, replay, round, playIndex } = useGameStars(GAME_ID);
  const [phase, setPhase] = useState<Phase>('discover');
  const [met, setMet] = useState<Member[]>([]);
  const [level, setLevel] = useState(0);
  const deck = useMemo(() => makeDeck(LEVELS[level] ?? 3, playIndex * 5 + level), [level, playIndex]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [sub, setSub] = useState(0); // round inside missing / listen / picture
  const [missingStep, setMissingStep] = useState<'look' | 'closed' | 'ask'>('look');
  const [last, setLast] = useState<Member | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [spoken, setSpoken] = useState<Member[]>([]);
  const [talk, setTalk] = useState<Member | null>(null);
  const guide = useGuide();
  const toast = useToast();
  const timer = useRef<number | null>(null);

  const missingRounds = useMemo(
    () =>
      [0, 1].map((i) => {
        const shown = shuffle(MEMORY_MEMBERS, playIndex + i * 7).slice(0, 4);
        const target = shown[(playIndex + i) % 4];
        const others = MEMORY_MEMBERS.filter((m) => !shown.includes(m));
        return { shown, target, options: shuffle([target, ...others], playIndex + i) };
      }),
    [playIndex],
  );
  const listenTargets = useMemo(() => shuffle(MEMORY_MEMBERS, playIndex + 2).slice(0, 2), [playIndex]);
  const pictureTargets = useMemo(() => shuffle(SOFA_ORDER, playIndex + 4).slice(0, 2) as SofaMember[], [playIndex]);

  useEffect(() => {
    setPhase('discover');
    setMet([]);
    setLevel(0);
    setSpoken([]);
  }, [round]);
  useEffect(() => {
    setOpen([]);
    setMatched([]);
  }, [deck]);
  useEffect(() => {
    setSub(0);
    setMisses(0);
  }, [phase]);
  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);

  // "who is missing?" runs its own look → close eyes → ask sequence
  useEffect(() => {
    if (phase !== 'missing') return;
    setMissingStep('look');
    const a = window.setTimeout(() => setMissingStep('closed'), pace(3600));
    const b = window.setTimeout(() => setMissingStep('ask'), pace(6000));
    return () => (window.clearTimeout(a), window.clearTimeout(b));
  }, [phase, sub]);

  const mr = missingRounds[sub];
  const prompt =
    phase === 'discover'
      ? 'Meet my family! Tap each person.'
      : phase === 'memory'
        ? 'Find two the same!'
        : phase === 'missing'
          ? missingStep === 'look'
            ? 'Look at my family!'
            : missingStep === 'closed'
              ? 'Close your eyes!'
              : 'Who is missing?'
          : phase === 'listen'
            ? `Where is ${listenTargets[sub]}? Tap.`
            : phase === 'picture'
              ? `Find ${pictureTargets[sub]} in the picture!`
              : phase === 'speak'
                ? 'Introduce my family! Tap a person.'
                : '';

  useEffect(() => {
    if (!prompt || talk) return;
    const t = window.setTimeout(() => void audio.say(prompt), pace(400));
    return () => window.clearTimeout(t);
  }, [prompt, talk]);

  const good = (word: string, next: () => void) => {
    guide.react('cheer');
    playSfx('success');
    const p = praise();
    toast.show(p);
    setMisses(0);
    void audio.say(`${p} ${word}`).then(next);
  };
  const bad = (id: string, said: string) => {
    setWrong(id);
    window.setTimeout(() => setWrong(null), pace(600));
    setMisses((n) => n + 1);
    guide.react('encourage');
    playSfx('soft-no');
    toast.show('Try again!', false);
    void audio.say(said);
  };

  const tapTile = (m: Member) => {
    setLast(m);
    if (phase === 'discover') {
      playSfx('pop');
      void audio.say(`This is my ${m}.`);
      const next = met.includes(m) ? met : [...met, m];
      setMet(next);
      if (next.length === MEMORY_MEMBERS.length && met.length < MEMORY_MEMBERS.length) {
        window.setTimeout(() => {
          award(1);
          guide.react('cheer');
          setPhase('memory');
        }, 1400);
      }
    } else if (phase === 'listen') {
      const target = listenTargets[sub];
      if (m === target) good(`This is my ${m}.`, () => (sub + 1 >= listenTargets.length ? setPhase('picture') : setSub(sub + 1)));
      else bad(m, `That's my ${m}. Where is ${target}?`);
    } else if (phase === 'speak') setTalk(m);
  };

  const tapCard = (id: number) => {
    const res = flip(deck, open, matched, id);
    if (res === 'ignored') return;
    const card = deck.find((c) => c.id === id)!;
    playSfx('pop');
    setLast(card.member);
    void audio.say(MEMBERS[card.member].word);
    if (res === 'first') return setOpen([id]);
    const pair = [open[0], id];
    setOpen(pair);
    timer.current = window.setTimeout(() => {
      if (res === 'match') {
        playSfx('success');
        guide.react('cheer');
        const all = [...matched, ...pair];
        setMatched(all);
        setOpen([]);
        toast.show(`${MEMBERS[card.member].word}!`);
        if (all.length === deck.length) {
          timer.current = window.setTimeout(() => (level + 1 >= LEVELS.length ? setPhase('missing') : setLevel(level + 1)), pace(1200));
        }
      } else {
        playSfx('soft-no');
        setOpen([]);
      }
    }, res === 'match' ? 650 : 1250);
  };

  const pickMissing = (id: string) => {
    if (missingStep !== 'ask') return;
    if (id === mr.target) good(`${pron(mr.target as Member)} my ${mr.target}!`, () => (sub + 1 >= missingRounds.length ? setPhase('listen') : setSub(sub + 1)));
    else bad(id, `No, ${id} is here. Who is missing?`);
  };

  const tapSofa = (m: SofaMember) => {
    if (phase !== 'picture') return;
    guide.setPointAt(boxCentre(SOFA[m].box));
    const target = pictureTargets[sub];
    if (m === target)
      good(`There is ${m}!`, () => {
        if (sub + 1 >= pictureTargets.length) {
          award(2);
          setPhase('speak');
        } else setSub(sub + 1);
      });
    else bad(m, `That's ${m}. Find ${target}!`);
  };

  const finishTalk = () => {
    const m = talk!;
    setTalk(null);
    const next = spoken.includes(m) ? spoken : [...spoken, m];
    setSpoken(next);
    guide.react('cheer');
    toast.show(praise());
    if (next.length >= SPEAK_TARGET) {
      award(3, true);
      setPhase('done');
    }
  };

  const tileGrid = (members: Member[], opts: { done?: Member[]; hideTarget?: Member }) => (
    <div className="family-wall" style={at(BOARD)}>
      {members.map((m) => (
        <motion.button
          key={m}
          type="button"
          className={`family-wall__tile ${opts.done?.includes(m) ? 'is-done' : ''} ${misses >= 2 && phase === 'listen' && m === listenTargets[sub] ? 'is-glow' : ''}`}
          aria-label={MEMBERS[m].word}
          onClick={() => tapTile(m)}
          disabled={phase === 'missing'}
          animate={wrong === m ? { rotate: [0, -6, 6, 0] } : { rotate: 0 }}
          style={{ visibility: opts.hideTarget === m ? 'hidden' : 'visible' }}
        >
          <img src={asset(MEMBERS[m].tile)} alt="" draggable={false} />
        </motion.button>
      ))}
    </div>
  );

  const { cols, rows } = gridFor(deck.length);
  const order = ['discover', 'memory', 'missing', 'listen', 'picture', 'speak', 'done'];
  const stage = phase === 'discover' ? 0 : phase === 'speak' ? 2 : phase === 'done' ? 3 : 1;
  const progress = phase === 'discover' ? met.length / 6 : phase === 'speak' ? spoken.length / SPEAK_TARGET : (order.indexOf(phase) - 1) / 4;
  const inPicture = phase === 'picture';

  return (
    <GameScreen scene={inPicture ? 'family' : 'memory'} onHome={onHome} onParent={onParent} stars={stars} stage={stage} stageProgress={progress} prompt={phase === 'done' ? undefined : prompt} tag={phase === 'memory' ? `Level ${level + 1}` : undefined}>
      {inPicture ? <CharacterRig name="family-girl" mood={guide.mood} pointAt={guide.pointAt} /> : <CharacterRig name="memory-boy" mood={guide.mood} pointAt={guide.pointAt} />}

      {(phase === 'discover' || phase === 'listen' || phase === 'speak') && tileGrid(MEMORY_MEMBERS, { done: phase === 'discover' ? met : phase === 'speak' ? spoken : [] })}

      {phase === 'memory' && (
        <div className="memory-board" style={{ ...at(BOARD), gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {deck.map((c) => {
            const up = open.includes(c.id) || matched.includes(c.id);
            return (
              <button key={`${level}-${c.id}`} type="button" className={`memory-card ${up ? 'is-up' : ''} ${matched.includes(c.id) ? 'is-matched' : ''}`} onClick={() => tapCard(c.id)} aria-label={up ? MEMBERS[c.member].word : 'Hidden card'}>
                <span className="memory-card__inner">
                  <img className="memory-card__back" src={asset(CARD_BACK)} alt="" draggable={false} />
                  <img className="memory-card__face" src={asset(MEMBERS[c.member].tile)} alt="" draggable={false} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {phase === 'missing' && mr && (
        <>
          {tileGrid(mr.shown, { hideTarget: missingStep !== 'look' ? mr.target : undefined })}
          <EyesClosed show={missingStep === 'closed'} />
          {missingStep === 'ask' && (
            <ChoiceRow box={[560, 700, 1460, 900]} items={mr.options.map((m) => ({ id: m, src: MEMBERS[m].tile, label: `choice ${m}` }))} onPick={pickMissing} wrong={wrong} glow={misses >= 2 ? mr.target : null} />
          )}
        </>
      )}

      {inPicture &&
        SOFA_ORDER.map((m) => (
          <motion.button
            key={m}
            type="button"
            className={`person-hotspot ${misses >= 2 && m === pictureTargets[sub] ? 'is-glow' : ''}`}
            style={at(SOFA[m].box)}
            aria-label={`${m} in the picture`}
            onClick={() => tapSofa(m)}
            animate={wrong === m ? { rotate: [0, -3, 3, 0] } : {}}
          />
        ))}

      {last && phase !== 'missing' && !inPicture && (
        <motion.div className="memory-word" style={at([560, 705, 1300, 895])} key={last} initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
          <img src={asset(MEMBERS[last].tile)} alt="" />
          <span>{MEMBERS[last].word}</span>
          <ListenButton text={MEMBERS[last].word} size="md" label={`Listen: ${MEMBERS[last].word}`} />
        </motion.div>
      )}

      {talk && <SpeakSteps key={talk} sentences={[`This is my ${talk}.`, `${pron(talk)} my ${talk}.`]} picture={<img src={asset(MEMBERS[talk].tile)} alt="" />} onDone={finishTalk} />}
      {toast.node}
      {phase === 'done' && <Celebration title="You solved the family mystery!" stars={stars} onHome={onHome} onReplay={replay} reward={asset('art/family/mum.webp')} />}
    </GameScreen>
  );
}
