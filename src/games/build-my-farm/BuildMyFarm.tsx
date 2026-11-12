import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import {
  ANIMALS,
  ANIMAL_ORDER,
  COUNT_TARGET,
  DESCRIBE_TARGET,
  FARM_BACKGROUND,
  HAY,
  NUMBER_WORDS,
  PET_TARGET,
  PHRASES,
  SCENARIOS,
  SCENE_H,
  SCENE_W,
  SPOTS,
  type AnimalKind,
  type Mission,
  type Spot,
} from '../../content/farm';
import { useApp } from '../../hooks/useApp';
import { audio } from '../../services/audio';
import { playSfx } from '../../services/sfx';
import { Celebration, HomeButton, ListenButton, ParentButton, SpeakPrompt, StarPill, asset } from '../../components/ui';
import { Heart } from '../../components/icons';
import { checkPlacement, describePiece, findAnswers, pickScenarioIndex, validSpots, type Farm, type Piece } from './logic';
import './farm.css';

const GAME_ID = 'build-my-farm';
type PlaceMission = Extract<Mission, { type: 'place' }>;
type Phase = 'build' | 'count' | 'describe' | 'feed' | 'feed-say' | 'kind' | 'kind-say' | 'done';

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const praise = () => PHRASES.praise[Math.floor(Math.random() * PHRASES.praise.length)];
const spotById = (id: string) => SPOTS.find((s) => s.id === id)!;
const pieceHeight = (kind: AnimalKind, spot: Spot) => ANIMALS[kind].height * spot.scale;

/* ------------------------------------------------------------------ */
/* Picture cue shown next to the spoken mission (helps non-readers)    */
/* ------------------------------------------------------------------ */
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
  const glyph = target.type === 'nextTo' ? '↔' : target.zone === 'tree' ? '↓' : target.zone === 'fence' ? '↑' : target.zone === 'barn' ? '→' : '↔';
  const targetImg =
    target.type === 'nextTo'
      ? asset(ANIMALS[target.animal].image)
      : asset(`art/farm/icon-${target.zone === 'barnSide' ? 'barn' : target.zone}.webp`);
  return (
    <span className="cue" aria-hidden>
      <img src={asset(ANIMALS[mission.animal].image)} alt="" />
      <span className="cue__glyph">{glyph}</span>
      <img src={targetImg} alt="" className={target.type === 'zone' ? 'cue__place' : ''} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* The game                                                            */
/* ------------------------------------------------------------------ */
export function BuildMyFarm({ onHome, onParent }: { onHome: () => void; onParent: () => void }) {
  const { startPlay, recordStars, game } = useApp();
  const [round, setRound] = useState(0); // bump to replay
  // Alternate scenarios between plays (plays counter is stored with progress).
  const [firstPlay] = useState(() => game(GAME_ID).plays + 1);
  const scenario = SCENARIOS[pickScenarioIndex(firstPlay + round, SCENARIOS.length)];
  const countedRound = useRef(-1); // guard: count each play once (StrictMode runs effects twice)
  useEffect(() => {
    if (countedRound.current === round) return;
    countedRound.current = round;
    startPlay(GAME_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const [phase, setPhase] = useState<Phase>('build');
  const [missionIndex, setMissionIndex] = useState(0);
  const [farm, setFarm] = useState<Farm>({});
  const [misses, setMisses] = useState(0);
  const [wrongAnimal, setWrongAnimal] = useState(false);
  const [selected, setSelected] = useState<AnimalKind | null>(null);
  const [busy, setBusy] = useState(false); // short pause after success
  const [stars, setStars] = useState(0);
  const [counted, setCounted] = useState<string[]>([]);
  const [described, setDescribed] = useState<string[]>([]);
  const [talking, setTalking] = useState<{ uid: string; text: string } | null>(null);
  const [petted, setPetted] = useState<string[]>([]);
  const [feeding, setFeeding] = useState(false);
  const [bounce, setBounce] = useState<Record<string, number>>({});
  const [hearts, setHearts] = useState<{ id: number; uid: string }[]>([]);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ kind: AnimalKind; x: number; y: number; overSpot: string | null } | null>(null);
  const uidRef = useRef(0);

  const mission: Mission | undefined = phase === 'build' ? scenario.build[missionIndex] : undefined;
  const pieces = useMemo(() => Object.values(farm).sort((a, b) => spotById(a.spotId).y - spotById(b.spotId).y), [farm]);
  const hintSpots = useMemo(
    () => (mission?.type === 'place' && misses >= 2 ? validSpots(farm, mission as PlaceMission) : []),
    [mission, misses, farm],
  );

  // reset on replay
  useEffect(() => {
    setPhase('build');
    setMissionIndex(0);
    setFarm({});
    setMisses(0);
    setWrongAnimal(false);
    setSelected(null);
    setStars(0);
    setCounted([]);
    setDescribed([]);
    setPetted([]);
    setTalking(null);
  }, [round]);

  /** The sentence currently asked of the child (spoken + shown in the banner). */
  const prompt =
    phase === 'build'
      ? mission?.say ?? ''
      : phase === 'count'
        ? PHRASES.countIntro
        : phase === 'describe'
          ? PHRASES.describeIntro
          : phase === 'feed'
            ? PHRASES.feedIntro
            : phase === 'kind'
              ? PHRASES.kindIntro
              : '';

  // Speak each new instruction.
  useEffect(() => {
    if (!prompt) return;
    const intro = phase === 'build' && missionIndex === 0 ? `${PHRASES.intro} ` : '';
    const t = window.setTimeout(() => void audio.say(intro + prompt), 350);
    return () => window.clearTimeout(t);
  }, [prompt, phase, missionIndex]);

  const flash = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2200);
  };

  const nextMission = useCallback(() => {
    setMisses(0);
    setWrongAnimal(false);
    setSelected(null);
    if (missionIndex + 1 < scenario.build.length) {
      setMissionIndex((i) => i + 1);
    } else {
      setStars(1);
      recordStars(GAME_ID, 1, false);
      setPhase('count');
    }
  }, [missionIndex, scenario.build.length, recordStars]);

  const succeed = useCallback(
    (sayFirst?: string) => {
      setBusy(true);
      playSfx('success');
      const p = praise();
      flash(p);
      void audio.say(sayFirst ? `${sayFirst} ${p}` : p).then(() => {
        setBusy(false);
        nextMission();
      });
    },
    [nextMission],
  );

  /* ----------------------------- placing ----------------------------- */
  const tryPlace = useCallback(
    (kind: AnimalKind, spotId: string) => {
      if (busy || mission?.type !== 'place') return;
      const result = checkPlacement(farm, mission, kind, spotId);
      if (result.ok) {
        const piece: Piece = { uid: `p${++uidRef.current}`, kind, spotId };
        setFarm((f) => ({ ...f, [spotId]: piece }));
        setSelected(null);
        playSfx('place');
        succeed();
        return;
      }
      playSfx('soft-no');
      if (result.reason === 'wrong-animal') {
        setWrongAnimal(true);
        const text = PHRASES.wrongAnimal(kind, mission.animal);
        flash(text);
        void audio.say(text);
        setSelected(null);
      } else {
        setMisses((m) => m + 1);
        const hint = misses + 1 >= 2;
        flash(hint ? PHRASES.hint : PHRASES.wrongPlace);
        void audio.say(hint ? `${PHRASES.hint} ${mission.say}` : `${PHRASES.wrongPlace} ${mission.say}`);
      }
    },
    [busy, mission, farm, misses, succeed],
  );

  /* ------------------------- tapping animals ------------------------- */
  const tapPiece = (piece: Piece) => {
    if (busy) return;
    const word = ANIMALS[piece.kind].word;
    const jump = () => setBounce((b) => ({ ...b, [piece.uid]: (b[piece.uid] ?? 0) + 1 }));

    if (phase === 'build' && mission?.type === 'find') {
      if (findAnswers(farm, mission.size).includes(piece.uid)) {
        jump();
        succeed(`Yes! The ${word} is big.`);
      } else {
        playSfx('soft-no');
        setWiggle(piece.uid);
        window.setTimeout(() => setWiggle(null), 500);
        const t = PHRASES.findWrong(piece.kind);
        flash(t);
        void audio.say(t);
      }
      return;
    }
    if (phase === 'build' && selected && mission?.type === 'place') {
      // tapping an occupied spot while holding an animal
      tryPlace(selected, piece.spotId);
      return;
    }
    if (phase === 'build') {
      jump();
      void audio.say(`A ${word}!`);
      return;
    }
    if (phase === 'count') {
      if (counted.includes(piece.uid)) {
        setWiggle(piece.uid);
        window.setTimeout(() => setWiggle(null), 500);
        void audio.say(NUMBER_WORDS[counted.length - 1] ?? '');
        return;
      }
      const next = [...counted, piece.uid];
      setCounted(next);
      jump();
      playSfx('count');
      const n = next.length;
      if (n >= COUNT_TARGET) {
        setBusy(true);
        void audio.say(NUMBER_WORDS[n - 1]).then(() => {
          playSfx('success');
          flash(PHRASES.countDone);
          return audio.say(PHRASES.countDone);
        }).then(() => {
          setBusy(false);
          setStars(2);
          recordStars(GAME_ID, 2, false);
          setPhase('describe');
        });
      } else {
        void audio.say(NUMBER_WORDS[n - 1]);
      }
      return;
    }
    if (phase === 'describe') {
      jump();
      setTalking({ uid: piece.uid, text: describePiece(farm, piece.uid) });
      return;
    }
    if (phase === 'kind') {
      jump();
      playSfx('heart');
      setHearts((h) => [...h, { id: Date.now() + Math.random(), uid: piece.uid }]);
      if (!petted.includes(piece.uid)) {
        const next = [...petted, piece.uid];
        setPetted(next);
        if (next.length >= PET_TARGET) window.setTimeout(() => setPhase('kind-say'), 900);
      }
      return;
    }
    jump();
  };

  const finishDescribe = () => {
    if (!talking) return;
    const next = described.includes(talking.uid) ? described : [...described, talking.uid];
    setDescribed(next);
    setTalking(null);
    if (next.length >= DESCRIBE_TARGET) window.setTimeout(() => setPhase('feed'), 500);
    else void audio.say('Great! Tap another animal.');
  };

  const feed = () => {
    if (phase !== 'feed' || feeding) return;
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

  const finishAll = () => {
    setStars(3);
    recordStars(GAME_ID, 3, true);
    setPhase('done');
  };

  /* ---------------------- drag & tap from the tray ---------------------- */
  const stageRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<{ kind: AnimalKind; x: number; y: number; id: number; moved: boolean } | null>(null);

  const spotAt = (x: number, y: number): string | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const id = (el as HTMLElement).dataset?.spot;
      if (id) return id;
    }
    // generous fallback: nearest spot centre within ~90 scene px
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const sx = ((x - rect.left) / rect.width) * SCENE_W;
    const sy = ((y - rect.top) / rect.height) * SCENE_H;
    let best: string | null = null;
    let bestD = 95;
    for (const s of SPOTS) {
      const d = Math.hypot(s.x - sx, s.y - 30 * s.scale - sy);
      if (d < bestD) (bestD = d), (best = s.id);
    }
    return best;
  };

  const onTrayDown = (kind: AnimalKind) => (e: RPointerEvent<HTMLButtonElement>) => {
    if (phase !== 'build' || busy) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pressRef.current = { kind, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  };
  const onTrayMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const p = pressRef.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) {
      p.moved = true;
      playSfx('pop');
      void audio.say(ANIMALS[p.kind].word);
    }
    if (p.moved) setDrag({ kind: p.kind, x: e.clientX, y: e.clientY, overSpot: spotAt(e.clientX, e.clientY) });
  };
  const onTrayUp = (e: RPointerEvent<HTMLButtonElement>) => {
    const p = pressRef.current;
    pressRef.current = null;
    if (!p || p.id !== e.pointerId) return;
    if (p.moved) {
      setDrag(null);
      const spot = spotAt(e.clientX, e.clientY);
      if (spot) tryPlace(p.kind, spot);
      else playSfx('soft-no');
    } else {
      // a tap: select (or unselect) this animal, then tap a place
      setSelected((s) => (s === p.kind ? null : p.kind));
      playSfx('pop');
      void audio.say(ANIMALS[p.kind].word);
    }
  };
  const onTrayCancel = () => {
    pressRef.current = null;
    setDrag(null);
  };

  const showSpots = phase === 'build' && mission?.type === 'place';
  const highlightKind = phase === 'build' && mission?.type === 'place' && wrongAnimal ? mission.animal : null;

  return (
    <div className="farm-game" style={{ backgroundImage: `url(${asset(FARM_BACKGROUND)})` }}>
      <div className="farm-stage-wrap">
        <div className="farm-stage" ref={stageRef} style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }}>
          <img className="farm-stage__bg" src={asset(FARM_BACKGROUND)} alt="" draggable={false} />

          {/* Hay bale: its own object, sits exactly over the hay in the picture */}
          <motion.button
            type="button"
            className={`hay ${phase === 'feed' ? 'is-active' : ''}`}
            style={{ left: pct(HAY.left, SCENE_W), top: pct(HAY.top, SCENE_H), width: pct(HAY.width, SCENE_W), height: pct(HAY.height, SCENE_H) }}
            onClick={phase === 'feed' ? feed : () => void audio.say('Hay!')}
            aria-label="Hay"
            whileTap={{ scale: 0.92 }}
            tabIndex={phase === 'feed' ? 0 : -1}
          >
            <img src={asset(HAY.image)} alt="" draggable={false} />
          </motion.button>

          {/* Drop spots */}
          {showSpots &&
            SPOTS.filter((s) => !farm[s.id]).map((s) => {
              const w = 150 * s.scale, h = 52 * s.scale;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-spot={s.id}
                  className={`spot ${hintSpots.includes(s.id) ? 'is-hint' : ''} ${drag?.overSpot === s.id ? 'is-over' : ''} ${selected ? 'is-armed' : ''}`}
                  style={{ left: pct(s.x - w / 2, SCENE_W), top: pct(s.y - h * 0.75, SCENE_H), width: pct(w, SCENE_W), height: pct(h, SCENE_H) }}
                  aria-label={`Place ${s.id.replace('-', ' ')}`}
                  onClick={() => {
                    if (selected) tryPlace(selected, s.id);
                    else {
                      playSfx('soft-no');
                      void audio.say(mission?.type === 'place' ? `Find the ${mission.animal}.` : '');
                    }
                  }}
                />
              );
            })}

          {/* Animals on the farm — each one is its own element */}
          {pieces.map((p) => {
              const s = spotById(p.spotId);
              const h = pieceHeight(p.kind, s);
              const countNo = counted.indexOf(p.uid);
              const isTarget = phase === 'count' || phase === 'describe' || phase === 'kind' || mission?.type === 'find';
              return (
                <motion.button
                  key={p.uid}
                  type="button"
                  className={`piece ${isTarget ? 'is-tappable' : ''} ${wiggle === p.uid ? 'is-wiggle' : ''} ${described.includes(p.uid) || petted.includes(p.uid) ? 'is-done' : ''}`}
                  data-spot={selected && phase === 'build' ? p.spotId : undefined}
                  style={{ left: pct(s.x, SCENE_W), top: pct(s.y, SCENE_H), height: pct(h, SCENE_H), zIndex: 10 + Math.round(s.y / 10) }}
                  initial={{ opacity: 0, scale: 0.4, y: -40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                  onClick={() => tapPiece(p)}
                  aria-label={`${ANIMALS[p.kind].word} on the farm`}
                  data-kind={p.kind}
                >
                  <motion.img
                    key={bounce[p.uid] ?? 0}
                    src={asset(ANIMALS[p.kind].image)}
                    alt=""
                    draggable={false}
                    animate={bounce[p.uid] ? { y: [0, -18, 0, -6, 0], scaleY: [1, 1.06, 0.94, 1.02, 1] } : undefined}
                    transition={{ duration: 0.6 }}
                  />
                  {phase === 'count' && countNo >= 0 && (
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

          {/* hearts when stroking */}
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

          {/* Top bar over the sky */}
          <div className="farm-top">
            <HomeButton onClick={onHome} />
            {prompt ? (
              <motion.div key={prompt} className="mission" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <span className="mission__tag">{phase === 'build' ? 'Mission' : phase === 'count' ? 'Count' : phase === 'describe' ? 'Talk' : 'Help'}</span>
                <div className="mission__body">
                  <ListenButton text={prompt} size="sm" label="Listen to the instruction" />
                  <p className="mission__text">{prompt}</p>
                  {mission && <MissionCue mission={mission} />}
                  {phase === 'count' && (
                    <span className="mission__counter" aria-live="polite">
                      {counted.length} / {COUNT_TARGET}
                    </span>
                  )}
                  {phase === 'describe' && (
                    <span className="mission__counter">
                      {described.length} / {DESCRIBE_TARGET}
                    </span>
                  )}
                  {phase === 'kind' && (
                    <span className="mission__counter">
                      {petted.length} / {PET_TARGET}
                    </span>
                  )}
                </div>
                {phase === 'build' && (
                  <div className="mission-dots" aria-hidden>
                    {scenario.build.map((m, i) => (
                      <span key={m.id} className={i < missionIndex ? 'done' : i === missionIndex ? 'now' : ''} />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <span />
            )}
            <div className="farm-top__right">
              <StarPill stars={stars} className="farm-stars" />
              <ParentButton onOpen={onParent} />
            </div>
          </div>


          <AnimatePresence>
            {toast && (
              <motion.div className="farm-toast" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} role="status">
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tray / care sentences */}
      <div className="farm-tray">
        {phase === 'build' ? (
          <div className="tray" role="toolbar" aria-label="Animals">
            {ANIMAL_ORDER.map((kind) => (
              <motion.button
                key={kind}
                type="button"
                className={`tray__item ${selected === kind ? 'is-selected' : ''} ${highlightKind === kind ? 'is-hint' : ''}`}
                aria-label={ANIMALS[kind].word}
                aria-pressed={selected === kind}
                onPointerDown={onTrayDown(kind)}
                onPointerMove={onTrayMove}
                onPointerUp={onTrayUp}
                onPointerCancel={onTrayCancel}
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
        ) : phase === 'count' ? (
          <div className="track" aria-hidden>
            {Array.from({ length: COUNT_TARGET }, (_, i) => (
              <motion.span key={i} className={`track__n ${i < counted.length ? 'is-on' : ''}`} animate={i < counted.length ? { scale: [1, 1.3, 1] } : {}}>
                {i + 1}
              </motion.span>
            ))}
          </div>
        ) : phase === 'describe' ? (
          <div className="track" aria-hidden>
            {Array.from({ length: DESCRIBE_TARGET }, (_, i) => {
              const p = pieces.find((pp) => pp.uid === described[i]);
              return (
                <span key={i} className={`track__frame ${p ? 'is-on' : ''}`}>
                  {p && <img src={asset(ANIMALS[p.kind].image)} alt="" />}
                </span>
              );
            })}
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

      {/* drag ghost */}
      {drag && (
        <img className="drag-ghost" src={asset(ANIMALS[drag.kind].image)} alt="" style={{ left: drag.x, top: drag.y }} draggable={false} />
      )}

      {/* Speaking moments (no exit animation: the overlay must never linger and block taps) */}
      {(talking || phase === 'feed-say' || phase === 'kind-say') && (
          <motion.div className="speak-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {talking && (
              <SpeakPrompt
                key={talking.uid}
                sentence={talking.text}
                picture={<img src={asset(ANIMALS[pieces.find((p) => p.uid === talking.uid)?.kind ?? 'cow'].image)} alt="" />}
                onDone={finishDescribe}
              />
            )}
            {phase === 'feed-say' && (
              <SpeakPrompt key="feed" sentence={PHRASES.feed} picture={<img src={asset(HAY.image)} alt="" />} onDone={() => setPhase('kind')} />
            )}
            {phase === 'kind-say' && <SpeakPrompt key="kind" sentence={PHRASES.kind} picture={<Heart size="100%" />} onDone={finishAll} />}
          </motion.div>
      )}

      {phase === 'done' && <Celebration title={PHRASES.finale} stars={stars} onHome={onHome} onReplay={() => setRound((r) => r + 1)} />}

      <div className="rotate-hint" role="alert">
        <div className="rotate-hint__phone" aria-hidden />
        <p>Turn your screen sideways</p>
      </div>
    </div>
  );
}
