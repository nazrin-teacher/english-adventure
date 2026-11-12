import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import {
  ANIMALS,
  ANIMAL_ORDER,
  COUNT_TARGET,
  EXTRA_ANIMALS,
  FARM_BACKGROUND,
  HAY,
  MEET_SPOTS,
  NUMBER_WORDS,
  PET_TARGET,
  PHRASES,
  REPORT_TARGET,
  SCENARIOS,
  SCENE_H,
  SCENE_W,
  SOUNDS,
  SPOTS,
  TOUR,
  type AnimalKind,
  type Mission,
  type Spot,
} from '../../content/farm';
import { useApp } from '../../hooks/useApp';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, HomeButton, ListenButton, ParentButton, PillButton, StarPill, asset } from '../../components/ui';
import { Heart, IconCheck } from '../../components/icons';
import { SpeakSteps } from '../../components/SpeakSteps';
import { StageTrail } from '../../components/StageTrail';
import { CharacterRig, type Mood } from '../../components/CharacterRig';
import {
  checkPlacement,
  findAnswers,
  movePiece,
  pickScenarioIndex,
  placePiece,
  positionSentence,
  removePiece,
  validSpots,
  type Farm,
  type Piece,
} from '../build-my-farm/logic';
import '../build-my-farm/farm.css';
import './designer.css';

const GAME_ID = 'build-my-farm';
type PlaceMission = Extract<Mission, { type: 'place' }>;
type Phase = 'tour' | 'meet' | 'missions' | 'count7' | 'add' | 'count9' | 'free' | 'report' | 'total' | 'feed' | 'feed-say' | 'kind' | 'kind-say' | 'done';

const STAGE: Record<Phase, 0 | 1 | 2 | 3> = {
  tour: 0, meet: 0, missions: 1, count7: 1, add: 1, count9: 1, free: 2, report: 2, total: 2, feed: 2, 'feed-say': 2, kind: 2, 'kind-say': 2, done: 3,
};
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const praise = () => PHRASES.praise[Math.floor(Math.random() * PHRASES.praise.length)];
const spotById = (id: string) => SPOTS.find((s) => s.id === id)!;
const pieceHeight = (kind: AnimalKind, spot: Spot) => ANIMALS[kind].height * spot.scale;
const centreOf = (s: Spot): [number, number] => [s.x, s.y - 40 * s.scale];
const boxCentre = (b: number[]): [number, number] => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];

function MissionCue({ mission }: { mission: Mission }) {
  if (mission.type === 'find') {
    return (
      <span className="cue" aria-hidden>
        <span className="cue__size">
          <i />
          <i />
        </span>
      </span>
    );
  }
  const target = mission.target;
  const targetImg =
    target.type === 'nextTo' ? asset(ANIMALS[target.animal].image) : asset(`art/farm/icon-${target.zone === 'barnSide' ? 'barn' : target.zone}.webp`);
  const glyph = target.type === 'nextTo' ? '↔' : target.zone === 'tree' ? '↓' : target.zone === 'fence' ? '↑' : target.zone === 'barn' ? '→' : '↔';
  return (
    <span className="cue" aria-hidden>
      <img src={asset(ANIMALS[mission.animal].image)} alt="" />
      <span className="cue__glyph">{glyph}</span>
      <img src={targetImg} alt="" className={target.type === 'zone' ? 'cue__place' : ''} />
    </span>
  );
}

export function FarmDesigner({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { startPlay, recordStars, game } = useApp();
  const [round, setRound] = useState(0);
  const [firstPlay] = useState(() => game(GAME_ID).plays + 1);
  const scenario = SCENARIOS[pickScenarioIndex(firstPlay + round, SCENARIOS.length)];
  const countedRound = useRef(-1);
  useEffect(() => {
    if (countedRound.current === round) return;
    countedRound.current = round;
    startPlay(GAME_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const [phase, setPhase] = useState<Phase>('tour');
  const [toured, setToured] = useState<string[]>([]);
  const [met, setMet] = useState<AnimalKind[]>([]);
  const [missionIndex, setMissionIndex] = useState(0);
  const [farm, setFarm] = useState<Farm>({});
  const [misses, setMisses] = useState(0);
  const [wrongAnimal, setWrongAnimal] = useState(false);
  const [selected, setSelected] = useState<AnimalKind | null>(null);
  const [heldPiece, setHeldPiece] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState(0);
  const [counted, setCounted] = useState<string[]>([]);
  const [added, setAdded] = useState(0);
  const [reported, setReported] = useState<string[]>([]);
  const [talk, setTalk] = useState<{ sentences: string[]; kind?: AnimalKind; onDone: () => void } | null>(null);
  const [petted, setPetted] = useState<string[]>([]);
  const [feeding, setFeeding] = useState(false);
  const [bounce, setBounce] = useState<Record<string, number>>({});
  const [hearts, setHearts] = useState<{ id: number; uid: string }[]>([]);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; good: boolean } | null>(null);
  const [mood, setMood] = useState<Mood>('idle');
  const [pointAt, setPointAt] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<{ kind: AnimalKind; x: number; y: number; overSpot: string | null } | null>(null);
  const uidRef = useRef(0);
  const moodTimer = useRef<number | null>(null);

  useEffect(() => {
    setPhase('tour');
    setToured([]);
    setMet([]);
    setMissionIndex(0);
    setFarm({});
    setMisses(0);
    setStars(0);
    setCounted([]);
    setAdded(0);
    setReported([]);
    setPetted([]);
    setTalk(null);
  }, [round]);

  // Dev-only QA shortcut: /?phase=free#/build-my-farm opens free building with a sample farm.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const jump = new URLSearchParams(location.search).get('phase') as Phase | null;
    if (!jump) return;
    const sample: [AnimalKind, string][] = [['cow', 'barn-side'], ['duck', 'field-2'], ['sheep', 'tree-left'], ['horse', 'barn'], ['hen', 'fence-2'], ['pig', 'tree-right'], ['hen', 'field-5'], ['pig', 'field-6'], ['duck', 'field-7']];
    let f: Farm = {};
    for (const [kind, spotId] of sample) f = placePiece(f, { uid: `p${++uidRef.current}`, kind, spotId });
    setFarm(f);
    setPhase(jump);
  }, []);

  const react = useCallback((m: Mood, ms = 1300) => {
    setMood(m);
    if (moodTimer.current) window.clearTimeout(moodTimer.current);
    moodTimer.current = window.setTimeout(() => setMood('idle'), ms);
  }, []);
  const flash = (text: string, good = true) => {
    setToast({ text, good });
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 2100);
  };
  const award = useCallback(
    (n: number, finished = false) => {
      setStars((s) => Math.max(s, n));
      recordStars(GAME_ID, n, finished);
    },
    [recordStars],
  );

  const mission: Mission | undefined = phase === 'missions' ? scenario.build[missionIndex] : undefined;
  const pieces = useMemo(() => Object.values(farm).sort((a, b) => spotById(a.spotId).y - spotById(b.spotId).y), [farm]);
  const hintSpots = useMemo(() => (mission?.type === 'place' && misses >= 2 ? validSpots(farm, mission as PlaceMission) : []), [mission, misses, farm]);

  // the farmer points at hints; otherwise at nothing
  useEffect(() => {
    if (hintSpots[0]) setPointAt(centreOf(spotById(hintSpots[0])));
    else if (phase !== 'tour') setPointAt(null);
  }, [hintSpots, phase]);

  const prompt =
    phase === 'tour'
      ? "Welcome to my farm! Tap the barn, the tree, the fence and the hay."
      : phase === 'meet'
        ? 'Here are the animals! Tap and say hello.'
        : phase === 'missions'
          ? mission?.say ?? ''
          : phase === 'count7'
            ? PHRASES.countIntro
            : phase === 'add'
              ? 'Put two more animals on the farm.'
              : phase === 'count9'
                ? 'Count all the animals again!'
                : phase === 'free'
                  ? 'Now it is your farm! Move the animals. Make your farm.'
                  : phase === 'report'
                    ? 'Tell me about your farm. Tap an animal.'
                    : phase === 'feed'
                      ? PHRASES.feedIntro
                      : phase === 'kind'
                        ? PHRASES.kindIntro
                        : '';

  useEffect(() => {
    if (!prompt || talk) return;
    const t = window.setTimeout(() => void audio.say(prompt), 380);
    return () => window.clearTimeout(t);
  }, [prompt, talk]);

  const jump = (uid: string) => setBounce((b) => ({ ...b, [uid]: (b[uid] ?? 0) + 1 }));

  /* ------------------------------ Discover ------------------------------ */
  const tourTap = (id: string) => {
    const item = TOUR.find((t) => t.id === id);
    if (!item) return;
    playSfx('sparkle');
    setPointAt(boxCentre(item.box));
    void audio.say(item.say);
    if (phase !== 'tour' || toured.includes(id)) return;
    const next = [...toured, id];
    setToured(next);
    if (next.length >= TOUR.length) {
      window.setTimeout(() => {
        react('cheer');
        setPointAt(null);
        setPhase('meet');
      }, 1600);
    }
  };

  const meetTap = (kind: AnimalKind) => {
    playSfx('pop');
    setBounce((b) => ({ ...b, [`meet-${kind}`]: (b[`meet-${kind}`] ?? 0) + 1 }));
    void audio.say(`It's a ${ANIMALS[kind].word}. ${SOUNDS[kind]}`);
    if (met.includes(kind)) return;
    const next = [...met, kind];
    setMet(next);
    if (next.length >= ANIMAL_ORDER.length) {
      window.setTimeout(() => {
        award(1);
        react('cheer');
        flash('Hello, animals!');
        void audio.say("Great! Now let's build the farm.").then(() => setPhase('missions'));
      }, 1500);
    }
  };

  /* ------------------------------ Challenge ------------------------------ */
  const nextMission = useCallback(() => {
    setMisses(0);
    setWrongAnimal(false);
    setSelected(null);
    if (missionIndex + 1 < scenario.build.length) setMissionIndex((i) => i + 1);
    else setPhase('count7');
  }, [missionIndex, scenario.build.length]);

  const succeed = useCallback(
    (sayFirst?: string) => {
      setBusy(true);
      playSfx('success');
      react('cheer');
      const p = praise();
      flash(p);
      void audio.say(sayFirst ? `${sayFirst} ${p}` : p).then(() => {
        setBusy(false);
        nextMission();
      });
    },
    [nextMission, react],
  );

  const addPiece = (kind: AnimalKind, spotId: string) => {
    const piece: Piece = { uid: `p${++uidRef.current}`, kind, spotId };
    setFarm((f) => placePiece(f, piece));
    return piece;
  };

  /** Drop / tap-place an animal from the tray onto a spot. */
  const tryPlace = (kind: AnimalKind, spotId: string) => {
    if (busy) return;
    if (phase === 'missions' && mission?.type === 'place') {
      const result = checkPlacement(farm, mission, kind, spotId);
      if (result.ok) {
        addPiece(kind, spotId);
        setSelected(null);
        playSfx('place');
        succeed();
        return;
      }
      playSfx('soft-no');
      react('encourage');
      if (result.reason === 'wrong-animal') {
        setWrongAnimal(true);
        const text = PHRASES.wrongAnimal(kind, mission.animal);
        flash(text, false);
        void audio.say(text);
        setSelected(null);
      } else {
        setMisses((m) => m + 1);
        const hint = misses + 1 >= 2;
        flash(hint ? PHRASES.hint : PHRASES.wrongPlace, false);
        void audio.say(hint ? `${PHRASES.hint} ${mission.say}` : `${PHRASES.wrongPlace} ${mission.say}`);
      }
      return;
    }
    if ((phase === 'add' || phase === 'free') && !farm[spotId]) {
      addPiece(kind, spotId);
      playSfx('place');
      void audio.say(ANIMALS[kind].word);
      setSelected(null);
      if (phase === 'add') {
        const n = added + 1;
        setAdded(n);
        const total = Object.keys(farm).length + 1;
        void audio.say(`${NUMBER_WORDS[total - 1]}!`);
        if (n >= EXTRA_ANIMALS) {
          react('cheer');
          window.setTimeout(() => {
            setCounted([]);
            setPhase('count9');
          }, 1200);
        }
      }
    }
  };

  /** Move a farm animal to another free spot (free build). */
  const tryMove = (uid: string, spotId: string) => {
    if (phase !== 'free' || farm[spotId]) return;
    setFarm((f) => movePiece(f, uid, spotId));
    playSfx('place');
    setHeldPiece(null);
  };
  const takeOff = (uid: string) => {
    setFarm((f) => removePiece(f, uid));
    playSfx('pop');
    setHeldPiece(null);
  };

  const countTap = (piece: Piece, target: number, after: () => void) => {
    if (counted.includes(piece.uid)) {
      setWiggle(piece.uid);
      window.setTimeout(() => setWiggle(null), 500);
      void audio.say(NUMBER_WORDS[counted.length - 1] ?? '');
      return;
    }
    const next = [...counted, piece.uid];
    setCounted(next);
    jump(piece.uid);
    playSfx('count');
    const n = next.length;
    if (n >= target) {
      setBusy(true);
      void audio
        .say(NUMBER_WORDS[n - 1])
        .then(() => {
          playSfx('success');
          react('cheer');
          const t = `${NUMBER_WORDS[n - 1][0].toUpperCase()}${NUMBER_WORDS[n - 1].slice(1)} animals! Great counting!`;
          flash(t);
          return audio.say(t);
        })
        .then(() => {
          setBusy(false);
          after();
        });
    } else void audio.say(NUMBER_WORDS[n - 1]);
  };

  /* ---------------------------- tapping animals ---------------------------- */
  const tapPiece = (piece: Piece) => {
    if (busy) return;
    const word = ANIMALS[piece.kind].word;
    if (phase === 'missions' && mission?.type === 'find') {
      if (findAnswers(farm, mission.size).includes(piece.uid)) {
        jump(piece.uid);
        succeed(`Yes! The ${word} is big.`);
      } else {
        playSfx('soft-no');
        react('encourage');
        setWiggle(piece.uid);
        window.setTimeout(() => setWiggle(null), 500);
        const t = PHRASES.findWrong(piece.kind);
        flash(t, false);
        void audio.say(t);
      }
      return;
    }
    if (phase === 'missions' && selected) return tryPlace(selected, piece.spotId);
    if (phase === 'count7') return countTap(piece, COUNT_TARGET, () => setPhase('add'));
    if (phase === 'count9')
      return countTap(piece, COUNT_TARGET + EXTRA_ANIMALS, () => {
        award(2);
        setCounted([]);
        setPhase('free');
        flash('Free build!');
      });
    if (phase === 'free') {
      setHeldPiece((h) => (h === piece.uid ? null : piece.uid));
      playSfx('pop');
      void audio.say(word);
      return;
    }
    if (phase === 'report') {
      jump(piece.uid);
      setTalk({
        kind: piece.kind,
        sentences: [`I can see a ${word}.`, positionSentence(farm, piece.uid)],
        onDone: () => {
          const next = reported.includes(piece.uid) ? reported : [...reported, piece.uid];
          setReported(next);
          if (next.length >= REPORT_TARGET) {
            const n = Object.keys(farm).length;
            setPhase('total');
            setTalk({ sentences: [`I can see ${NUMBER_WORDS[n - 1] ?? n} animals.`], onDone: () => setPhase('feed') });
          } else void audio.say('Great! Tap another animal.');
        },
      });
      return;
    }
    if (phase === 'kind') {
      jump(piece.uid);
      playSfx('heart');
      setHearts((h) => [...h, { id: Date.now() + Math.random(), uid: piece.uid }]);
      if (!petted.includes(piece.uid)) {
        const next = [...petted, piece.uid];
        setPetted(next);
        if (next.length >= PET_TARGET) window.setTimeout(() => setPhase('kind-say'), 900);
      }
      return;
    }
    jump(piece.uid);
    void audio.say(`${word}! ${SOUNDS[piece.kind]}`);
  };

  const feed = () => {
    if (phase === 'tour') return tourTap('hay');
    if (phase !== 'feed' || feeding) return void audio.say('Hay!');
    setFeeding(true);
    playSfx('pop');
    window.setTimeout(() => {
      playSfx('munch');
      setBounce((b) => Object.fromEntries(pieces.map((p) => [p.uid, (b[p.uid] ?? 0) + 1])));
    }, 900);
    window.setTimeout(() => {
      setFeeding(false);
      setPhase('feed-say');
    }, 2000);
  };

  /* ------------------------- drag & tap from tray / farm ------------------------- */
  const stageRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<{ kind: AnimalKind; uid?: string; x: number; y: number; id: number; moved: boolean } | null>(null);
  const trayActive = phase === 'missions' || phase === 'add' || phase === 'free';

  const spotAt = (x: number, y: number): string | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const id = (el as HTMLElement).dataset?.spot;
      if (id) return id;
    }
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const sx = ((x - rect.left) / rect.width) * SCENE_W, sy = ((y - rect.top) / rect.height) * SCENE_H;
    let best: string | null = null, bestD = 95;
    for (const s of SPOTS) {
      const d = Math.hypot(s.x - sx, s.y - 30 * s.scale - sy);
      if (d < bestD) (bestD = d), (best = s.id);
    }
    return best;
  };
  const overTray = (x: number, y: number) => {
    const r = trayRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const startPress = (kind: AnimalKind, uid?: string) => (e: RPointerEvent<HTMLElement>) => {
    if (busy) return;
    if (uid ? phase !== 'free' : !trayActive) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pressRef.current = { kind, uid, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  };
  const movePress = (e: RPointerEvent<HTMLElement>) => {
    const p = pressRef.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) {
      p.moved = true;
      playSfx('pop');
      void audio.say(ANIMALS[p.kind].word);
    }
    if (p.moved) setDrag({ kind: p.kind, x: e.clientX, y: e.clientY, overSpot: spotAt(e.clientX, e.clientY) });
  };
  const endPress = (e: RPointerEvent<HTMLElement>) => {
    const p = pressRef.current;
    pressRef.current = null;
    if (!p || p.id !== e.pointerId) return;
    if (!p.moved) {
      if (p.uid) return tapPiece(farm[Object.keys(farm).find((k) => farm[k].uid === p.uid)!]);
      if (heldPiece) return takeOff(heldPiece); // tapping the tray puts the held animal back
      setSelected((s) => (s === p.kind ? null : p.kind));
      setHeldPiece(null);
      playSfx('pop');
      void audio.say(ANIMALS[p.kind].word);
      return;
    }
    setDrag(null);
    if (p.uid) {
      if (overTray(e.clientX, e.clientY)) return takeOff(p.uid);
      const spot = spotAt(e.clientX, e.clientY);
      if (spot) tryMove(p.uid, spot);
      return;
    }
    const spot = spotAt(e.clientX, e.clientY);
    if (spot) tryPlace(p.kind, spot);
    else playSfx('soft-no');
  };
  const cancelPress = () => {
    pressRef.current = null;
    setDrag(null);
  };

  const onSpotTap = (s: Spot) => {
    if (heldPiece && phase === 'free') return tryMove(heldPiece, s.id);
    if (selected) return tryPlace(selected, s.id);
    playSfx('soft-no');
    if (mission?.type === 'place') void audio.say(`Find the ${mission.animal}.`);
    else void audio.say('Choose an animal first.');
  };

  const showSpots = (phase === 'missions' && mission?.type === 'place') || phase === 'add' || phase === 'free';
  const highlightKind = phase === 'missions' && mission?.type === 'place' && wrongAnimal ? mission.animal : null;
  const meeting = phase === 'meet';

  // progress inside the current stage (for the trail)
  const stageProgress =
    phase === 'tour'
      ? toured.length / (TOUR.length * 2)
      : phase === 'meet'
        ? 0.5 + met.length / (ANIMAL_ORDER.length * 2)
        : phase === 'missions'
          ? (missionIndex / scenario.build.length) * 0.7
          : phase === 'count7'
            ? 0.75
            : phase === 'add'
              ? 0.85
              : phase === 'count9'
                ? 0.92
                : 0;

  return (
    <div className="farm-game designer" style={{ backgroundImage: `url(${asset(FARM_BACKGROUND)})` }}>
      <div className="farm-stage-wrap">
        <div className="farm-stage" ref={stageRef} style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }}>
          <img className="farm-stage__bg" src={asset(FARM_BACKGROUND)} alt="" draggable={false} />

          {/* the farmer (animated cut-out of the supplied character) */}
          <CharacterRig name="farmer" mood={mood} pointAt={pointAt} />

          {/* Discover: farm places to tap */}
          {phase === 'tour' &&
            TOUR.filter((t) => t.id !== 'hay').map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tour-spot ${toured.includes(t.id) ? 'is-done' : ''}`}
                style={{ left: pct(t.box[0], SCENE_W), top: pct(t.box[1], SCENE_H), width: pct(t.box[2] - t.box[0], SCENE_W), height: pct(t.box[3] - t.box[1], SCENE_H) }}
                onClick={() => tourTap(t.id)}
                aria-label={t.id}
              >
                {toured.includes(t.id) && (
                  <span className="tour-spot__tick">
                    <IconCheck size="100%" />
                  </span>
                )}
              </button>
            ))}

          {/* hay bale: its own object */}
          <motion.button
            type="button"
            className={`hay ${phase === 'feed' || (phase === 'tour' && !toured.includes('hay')) ? 'is-active' : ''}`}
            style={{ left: pct(HAY.left, SCENE_W), top: pct(HAY.top, SCENE_H), width: pct(HAY.width, SCENE_W), height: pct(HAY.height, SCENE_H) }}
            onClick={feed}
            aria-label="hay"
            whileTap={{ scale: 0.92 }}
          >
            <img src={asset(HAY.image)} alt="" draggable={false} />
          </motion.button>

          {/* Discover: animals come to say hello */}
          {meeting &&
            ANIMAL_ORDER.map((k, i) => {
              const s = spotById(MEET_SPOTS[k]);
              return (
                <motion.button
                  key={`meet-${k}`}
                  type="button"
                  className={`piece is-tappable piece--idle ${met.includes(k) ? 'is-done' : ''}`}
                  style={{ left: pct(s.x, SCENE_W), top: pct(s.y, SCENE_H), height: pct(pieceHeight(k, s), SCENE_H), zIndex: 10 + Math.round(s.y / 10) }}
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.25, type: 'spring', stiffness: 90, damping: 14 }}
                  onClick={() => meetTap(k)}
                  aria-label={`${ANIMALS[k].word} says hello`}
                >
                  <motion.img key={bounce[`meet-${k}`] ?? 0} src={asset(ANIMALS[k].image)} alt="" draggable={false} animate={bounce[`meet-${k}`] ? { y: [0, -20, 0] } : undefined} />
                  {met.includes(k) && <span className="piece__hello">{SOUNDS[k]}</span>}
                </motion.button>
              );
            })}

          {/* drop spots */}
          {showSpots &&
            SPOTS.filter((s) => !farm[s.id]).map((s) => {
              const w = 150 * s.scale, h = 52 * s.scale;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-spot={s.id}
                  className={`spot ${hintSpots.includes(s.id) ? 'is-hint' : ''} ${drag?.overSpot === s.id ? 'is-over' : ''} ${selected || heldPiece ? 'is-armed' : ''}`}
                  style={{ left: pct(s.x - w / 2, SCENE_W), top: pct(s.y - h * 0.75, SCENE_H), width: pct(w, SCENE_W), height: pct(h, SCENE_H) }}
                  aria-label={`Place ${s.id.replace('-', ' ')}`}
                  onClick={() => onSpotTap(s)}
                />
              );
            })}

          {/* animals on the farm — each its own element, gently alive */}
          {!meeting &&
            pieces.map((p, i) => {
              const s = spotById(p.spotId);
              const countNo = counted.indexOf(p.uid);
              const tappable = ['count7', 'count9', 'report', 'kind', 'free'].includes(phase) || mission?.type === 'find';
              return (
                <motion.button
                  key={p.uid}
                  type="button"
                  className={`piece piece--idle ${tappable ? 'is-tappable' : ''} ${wiggle === p.uid ? 'is-wiggle' : ''} ${heldPiece === p.uid ? 'is-held' : ''} ${reported.includes(p.uid) || petted.includes(p.uid) ? 'is-done' : ''}`}
                  data-spot={selected && phase === 'missions' ? p.spotId : undefined}
                  data-kind={p.kind}
                  style={{ left: pct(s.x, SCENE_W), top: pct(s.y, SCENE_H), height: pct(pieceHeight(p.kind, s), SCENE_H), zIndex: 10 + Math.round(s.y / 10), animationDelay: `${(i * 0.37) % 2}s` }}
                  initial={{ opacity: 0, scale: 0.4, y: -40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                  onPointerDown={phase === 'free' ? startPress(p.kind, p.uid) : undefined}
                  onPointerMove={phase === 'free' ? movePress : undefined}
                  onPointerUp={phase === 'free' ? endPress : undefined}
                  onPointerCancel={phase === 'free' ? cancelPress : undefined}
                  onClick={phase === 'free' ? undefined : () => tapPiece(p)}
                  onKeyDown={phase === 'free' ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tapPiece(p)) : undefined}
                  aria-label={`${ANIMALS[p.kind].word} on the farm`}
                >
                  <motion.img
                    key={bounce[p.uid] ?? 0}
                    src={asset(ANIMALS[p.kind].image)}
                    alt=""
                    draggable={false}
                    animate={bounce[p.uid] ? { y: [0, -18, 0, -6, 0], scaleY: [1, 1.06, 0.94, 1.02, 1] } : undefined}
                    transition={{ duration: 0.6 }}
                  />
                  {(phase === 'count7' || phase === 'count9') && countNo >= 0 && (
                    <motion.span className="piece__badge" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      {countNo + 1}
                    </motion.span>
                  )}
                  {feeding && (
                    <motion.img
                      className="piece__food"
                      src={asset(HAY.image)}
                      alt=""
                      initial={{ x: `${(HAY.left - s.x) * 0.6}%`, y: '-260%', opacity: 0, scale: 0.6 }}
                      animate={{ x: '0%', y: '0%', opacity: [0, 1, 1, 0], scale: [0.6, 0.6, 0.5, 0.2] }}
                      transition={{ duration: 1.3, ease: 'easeOut' }}
                    />
                  )}
                </motion.button>
              );
            })}

          <AnimatePresence>
            {hearts.map((ht) => {
              const p = pieces.find((pp) => pp.uid === ht.uid);
              if (!p) return null;
              const s = spotById(p.spotId);
              return (
                <motion.span
                  key={ht.id}
                  className="heart-float"
                  style={{ left: pct(s.x, SCENE_W), top: pct(s.y - pieceHeight(p.kind, s), SCENE_H) }}
                  initial={{ y: 0, opacity: 1, scale: 0.5 }}
                  animate={{ y: -70, opacity: 0, scale: 1.4 }}
                  transition={{ duration: 1.1 }}
                  onAnimationComplete={() => setHearts((h) => h.filter((x) => x.id !== ht.id))}
                >
                  <Heart size="100%" />
                </motion.span>
              );
            })}
          </AnimatePresence>

          {/* top bar */}
          <div className="farm-top">
            <HomeButton onClick={onHome} />
            <div className="designer-top-centre">
              <StageTrail stage={STAGE[phase]} progress={stageProgress} />
              {prompt && (
                <motion.div key={prompt} className="mission" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                  <div className="mission__body">
                    <ListenButton text={prompt} size="sm" label="Listen to the instruction" />
                    <p className="mission__text">{prompt}</p>
                    {mission && <MissionCue mission={mission} />}
                    {(phase === 'count7' || phase === 'count9') && (
                      <span className="mission__counter" aria-live="polite">
                        {counted.length} / {phase === 'count7' ? COUNT_TARGET : COUNT_TARGET + EXTRA_ANIMALS}
                      </span>
                    )}
                    {phase === 'add' && <span className="mission__counter">{Object.keys(farm).length}</span>}
                    {phase === 'report' && (
                      <span className="mission__counter">
                        {reported.length} / {REPORT_TARGET}
                      </span>
                    )}
                    {phase === 'kind' && (
                      <span className="mission__counter">
                        {petted.length} / {PET_TARGET}
                      </span>
                    )}
                  </div>
                  {phase === 'missions' && (
                    <div className="mission-dots" aria-hidden>
                      {scenario.build.map((m, i) => (
                        <span key={m.id} className={i < missionIndex ? 'done' : i === missionIndex ? 'now' : ''} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
            <div className="farm-top__right">
              <StarPill stars={stars} className="farm-stars" />
              <ParentButton onOpen={onParent} />
            </div>
          </div>

          {/* the farmer's speech bubble for feedback */}
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.text}
                className={`farmer-bubble ${toast.good ? '' : 'is-soft'}`}
                initial={{ scale: 0.5, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="status"
              >
                {toast.text}
              </motion.div>
            )}
          </AnimatePresence>

          {phase === 'free' && (
            <div className="free-done">
              <PillButton tone="green" icon={<IconCheck size="100%" />} onClick={() => (Object.keys(farm).length >= REPORT_TARGET ? setPhase('report') : void audio.say('Put more animals on your farm!'))}>
                My farm is ready!
              </PillButton>
            </div>
          )}
        </div>
      </div>

      {/* bottom: tray / counting track / care board */}
      <div className="farm-tray">
        {trayActive ? (
          <div className={`tray ${heldPiece ? 'is-drop-target' : ''}`} role="toolbar" aria-label="Animals" ref={trayRef} onClick={() => heldPiece && takeOff(heldPiece)}>
            {ANIMAL_ORDER.map((kind) => (
              <motion.button
                key={kind}
                type="button"
                className={`tray__item ${selected === kind ? 'is-selected' : ''} ${highlightKind === kind ? 'is-hint' : ''}`}
                aria-label={kind}
                aria-pressed={selected === kind}
                onPointerDown={startPress(kind)}
                onPointerMove={movePress}
                onPointerUp={endPress}
                onPointerCancel={cancelPress}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected((s) => (s === kind ? null : kind));
                    void audio.say(ANIMALS[kind].word);
                  }
                }}
                whileHover={{ y: -4 }}
                disabled={mission?.type === 'find'}
              >
                <img src={asset(ANIMALS[kind].image)} alt="" draggable={false} />
              </motion.button>
            ))}
          </div>
        ) : phase === 'count7' || phase === 'count9' ? (
          <div className="track" aria-hidden>
            {Array.from({ length: phase === 'count7' ? COUNT_TARGET : COUNT_TARGET + EXTRA_ANIMALS }, (_, i) => (
              <motion.span key={i} className={`track__n ${i < counted.length ? 'is-on' : ''}`} animate={i < counted.length ? { scale: [1, 1.3, 1] } : {}}>
                {i + 1}
              </motion.span>
            ))}
          </div>
        ) : phase === 'tour' || phase === 'meet' ? (
          <div className="track" aria-hidden>
            {phase === 'tour'
              ? TOUR.map((t) => (
                  <span key={t.id} className={`track__frame ${toured.includes(t.id) ? 'is-on' : ''}`}>
                    <img src={asset(t.id === 'hay' ? HAY.image : `art/farm/icon-${t.id}.webp`)} alt="" />
                  </span>
                ))
              : ANIMAL_ORDER.map((k) => (
                  <span key={k} className={`track__frame ${met.includes(k) ? 'is-on' : ''}`}>
                    <img src={asset(ANIMALS[k].image)} alt="" />
                  </span>
                ))}
          </div>
        ) : (
          <div className="care-board">
            {[PHRASES.feed, PHRASES.kind].map((s, i) => (
              <div key={s} className={`care-board__line ${(i === 0 && ['kind', 'kind-say', 'done'].includes(phase)) || (i === 1 && phase === 'done') ? 'is-done' : ''}`}>
                <ListenButton text={s} size="sm" label={`Listen: ${s}`} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {drag && <img className="drag-ghost" src={asset(ANIMALS[drag.kind].image)} alt="" style={{ left: drag.x, top: drag.y }} draggable={false} />}

      {talk && (
        <div className="speak-overlay">
          <SpeakSteps key={talk.sentences.join()} sentences={talk.sentences} picture={talk.kind ? <img src={asset(ANIMALS[talk.kind].image)} alt="" /> : undefined} onDone={() => {
            const cb = talk.onDone;
            setTalk(null);
            cb();
          }} />
        </div>
      )}
      {(phase === 'feed-say' || phase === 'kind-say') && !talk && (
        <div className="speak-overlay">
          {phase === 'feed-say' ? (
            <SpeakSteps key="feed" sentences={[PHRASES.feed]} picture={<img src={asset(HAY.image)} alt="" />} onDone={() => setPhase('kind')} />
          ) : (
            <SpeakSteps
              key="kind"
              sentences={[PHRASES.kind]}
              picture={<Heart size="100%" />}
              onDone={() => {
                award(3, true);
                setPhase('done');
              }}
            />
          )}
        </div>
      )}

      {phase === 'done' && (
        <Celebration title="You designed a great farm!" stars={stars} onHome={onHome} onReplay={() => setRound((r) => r + 1)} reward={asset('art/animals/sheep.webp')} />
      )}

      <div className="rotate-hint" role="alert">
        <div className="rotate-hint__phone" aria-hidden />
        <p>Turn your screen sideways</p>
      </div>
    </div>
  );
}
