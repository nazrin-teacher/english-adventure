# English Adventure — Architecture & Implementation Plan

## Stack
React 19 + TypeScript + Vite, plain CSS (design tokens in `src/styles/tokens.css`),
Framer Motion for animation, Vitest + Testing Library for automated tests.
No backend, no accounts, no network calls at runtime (fonts are bundled).

## Folder layout
```
src/
  App.tsx                 screen state: home | game(id); parent panel; providers
  styles/                 tokens.css (colours, radii, shadows, type), global.css
  content/                *data only* — no React
    games.ts              the nine games: id, title, theme, status
    farm.ts               animals, farm slots, mission scenarios
    parentHelp.ts         short parent guidance per game (English only)
    audioManifest.ts      sentence text → recorded audio file (optional)
  services/               framework-free singletons
    audio.ts              AudioService: recorded file → speech synthesis fallback → silent
    sfx.ts                gentle UI sounds synthesised with Web Audio
    progress.ts           localStorage persistence (stars, completion, settings)
    mic.ts                optional live mic level meter (never records or uploads)
  hooks/                  React glue: useAudio, useProgress (context providers)
  components/             shared UI: buttons, StarBar, SpeakPrompt, ParentPanel, Celebration
  art/                    original SVG artwork as React components
    people/               one parametric Person head + Girl/Boy bodies (shared by all games)
    animals/              cow, horse, pig, hen, sheep, duck (each a separate component)
    farm/                 backdrop, barn, tree, fence, hay
    school/ family/       objects used by card previews (and later games)
    cards/                nine home-card preview illustrations
  screens/Home.tsx        nine game cards, sound toggle, parent button
  games/<game-id>/        one folder per game
    logic.ts              pure game rules (unit-tested, no DOM)
    *.tsx                 scene + interaction components
```

## Key decisions
* **Content separated from logic.** Vocabulary, sentences, slot positions and mission
  scripts live in `content/`; each game's `logic.ts` is pure and unit-tested.
* **Audio service.** `audio.say(text)` looks the sentence up in `audioManifest.ts`; if a
  recorded file exists it is played, otherwise browser speech synthesis (en-GB voice
  preferred, slower rate) is used; if no voice exists the on-screen bubble still shows
  the sentence and nothing throws. One global sound on/off switch.
* **Microphone is optional.** Speaking prompts always work with “I said it!”. A mic
  button (opt-in, browser permission) shows a live level meter only; no audio is
  recorded, stored or uploaded, and nothing claims to judge pronunciation.
* **Separate, movable objects.** Every animal / object is its own SVG component and DOM
  element; backgrounds never contain interactive items.
* **Input.** Pointer Events give one code path for mouse, pen and touch: drag-and-drop
  *and* tap-to-select → tap-to-place. Every interactive element is also a `<button>`
  for keyboard play (Tab / Enter / Space).
* **Progress.** `{gameId: {stars, completed, timesCompleted}}` + settings in
  localStorage under a versioned key; failures (private mode) fall back to memory.
  Completed games stay replayable.
* **No curriculum labels** appear anywhere in the UI.

## Build My Farm (first playable game)
Scene with tree, back fence, barn and 13 named drop spots (ground / fence / barn).
“Next to” = two ground spots within a set distance; “under the tree”, “on the fence”,
“in the barn”, “next to the barn” = spot zones. Three parts, one star each:
1. **Build** – 8 spoken missions (“Put the duck next to the cow.”, “Put the sheep under
   the tree.”, “Find the big animal.”…). Wrong animal / wrong spot → gentle voice
   feedback, animal returns to the tray; after 2 misses the valid spots glow.
2. **Count** – “Count seven animals.” Tap each animal; it says the number.
3. **Talk** – tap animals to hear a sentence generated from the child's *actual* farm
   (“The duck is next to the cow.”), repeat it; then “I feed the animals.” and
   “I'm kind to animals.” with feeding / petting interactions.
Two mission scenarios alternate on replay.

## Games
All nine games are playable; each lives in `src/games/<game>/` and uses the shared `GameScreen`,
`Sprite`, `SpeakSteps` and `useGameStars` from `src/components/`. `src/games/registry.tsx` maps
home cards to game components. Every game has a start-to-finish test in `src/games/*.test.tsx`.

## Order of work
1. Design system, services, home screen, Build My Farm → **review checkpoint**
2. After approval: remaining eight games, reusing the same art and components.
