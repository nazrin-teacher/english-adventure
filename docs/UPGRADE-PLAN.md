# English Adventure — Premium Upgrade: Audit & Plan

## 1. Audit (current live version)

**Keep (works well)**
- Supplied 3D-cartoon artwork, glossy buttons, stars, sparkles; consistent animal stickers.
- Separate, movable objects with exact placement data; verified placement logic (Build My Farm).
- Shared `GameScreen` / `SpeakSteps` / `useGameStars`, local progress, hold-to-open parent panel.
- 82 automated tests incl. a start-to-finish play-through of every game; GitHub Pages deploy.

**Weaknesses found**
| Area | Issue |
| --- | --- |
| Characters | Guides are baked into the backgrounds — they never blink, talk, point or react. |
| Gameplay variety | 5 of 9 games are "tap the right one" quizzes; *It's a…!* is listen-and-repeat only. |
| Learning stages | Most games start straight with questions — no *Discover* stage, little *Create*. |
| Farm game | No free building, can't move/remove animals, counting stops at 7, no tour of barn/tree/fence. |
| Home | Card titles are baked into the pictures (cannot be renamed); no completed-game marker or collection. |
| Rewards | Stars only; nothing to collect; celebrations identical everywhere. |
| Content gaps | No artwork for baby, uncle, aunt, cousin, a school bag, or people who are clearly tall/short/thin. |
| Parent help | English only (Turkish requested for the grown-ups panel). |
| Motion | CSS respects reduced motion; Framer Motion animations do not yet. |
| Audio | Browser speech only; no recorded voice or animal sounds supplied. |

## 2. Plan — preserve / improve / replace

**Shared system (now)**
- `CharacterRig`: cut-out animation of the supplied characters — separate pointing arm,
  blinking eyelids, talking mouth synced to the narrator, breathing, cheer and encourage reactions,
  arm aims at the current target. Character removed from the background so it can move.
- `StageTrail`: picture-only progress through Discover → Challenge → Speak & Create.
- Home cards: titles become live text pills (renamable), completed-game ribbon, collected-sticker shelf.
- Turkish grown-ups help per game: what to do, what to say, how to help.
- `MotionConfig reducedMotion="user"` app-wide.

**Prototype: Little Farm Designer** (replaces Build My Farm, keeps its placement engine)
1. Discover — farmer tours the farm (barn, tree, fence, hay), animals come to meet the child.
2. Challenge — placement missions (unchanged, verified), find the big animal, counting 7 → 9
   (add two more animals, count again).
3. Speak & Create — free-build mode unlocks: drag animals anywhere, move or remove them, then
   a spoken farm report built from the child's own scene ("I can see a cow. It's under the tree."
   "I can see nine animals."), feeding and "I'm kind to animals."

**After approval** — redesign the other eight games with distinct mechanics:
Classroom Detective (clues, hidden & missing objects), Pack My School Bag (drag into bag),
School Treasure Hunt (real-world missions + collection), Family Mystery (memory, missing person),
Guess Who? (appearance clues, one answer each), Puppet Studio (hair colour/type, accessories,
stage show), Farm Animal Detective (sounds, silhouettes, hidden animal), Farm Safari (binoculars,
spoken farm report). Missing artwork will be listed before that work starts.

## 3. Done (after approval)

| Home card | Discover | Challenge | Speak & Create |
| --- | --- | --- | --- |
| Classroom Detective | tap classroom things | colour clue · look-alikes · hidden thing · what's missing | "It's a…/They're…" |
| Pack My School Bag | explore the desk | find → put (drag or tap), colours, "two pencils" | open the bag, describe |
| School Treasure Hunt | flip mission cards | real home search, grown-up hold-to-confirm | "I found a…", describe treasures |
| Family Mystery | meet the family | memory ×2 · who's missing · listen & tap · find in photo | "This is my… / She's my…" |
| Guess Who? | touch grandma's face/body parts | 1-clue then 2-clue guessing (unique answers) | describe; child gives clues, grown-up guesses |
| My Family Puppet Studio | meet the puppets | build from spoken orders (checked) | own puppet, hair type+colour, extras, arrange, show |
| Farm Animal Detective | animals with sounds | sound · shadow · clue · hidden · sound-match | "It's a cow. It's black and white." |
| Farm Safari | binoculars discovery | colour/size/legs/next to/on missions | 3-animal spoken farm report |
| Little Farm Designer | farm tour, meet animals | placement, big animal, count 7 → 9 | free build, farm report, care |

Every game has an animated guide (blink, talk, react, lean/point), a picture-only stage trail,
Turkish grown-ups help, a sticker reward, and a start-to-finish automated test.
