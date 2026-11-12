# English Adventure

Interactive English games for 5–6 year olds (React + TypeScript + Vite).
**Play it:** https://nazrin-teacher.github.io/english-adventure/

See [ARCHITECTURE.md](ARCHITECTURE.md) for the structure and plan.

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # unit + full play-through tests
npm run build      # production build in dist/
```

(Node.js 24 is bundled locally in `.tools/` for this workspace: prefix commands with
`PATH="$PWD/.tools/node-v24.22.3-darwin-arm64/bin:$PATH"` if Node is not installed.)

## Publish to GitHub Pages

```bash
BASE_PATH=/english-adventure/ npm run build
node scripts/publish-github.mjs nazrin-teacher/english-adventure "What changed"
```

The script uses the GitHub CLI login (no local `git` needed): source code goes to `main`,
the built site to `gh-pages`, and GitHub Pages serves it.

## Artwork

All illustrations come from the supplied reference images in `assets-src/reference/`.
They are turned into separate, movable assets by the scripts in `scripts/assets/`:

| Script | Produces |
| --- | --- |
| `cutout.mjs` | Separate sprites with exact positions (`src/content/spriteBoxes.json`): six farm animals, nine school objects, orange, puppet wigs / tops / faces, hay bale, logo |
| `tiles.mjs` | Picture tiles that keep their frame: six family portraits, memory card back, four puppet choices |
| `scenes.mjs` | Eight clean game backgrounds — baked-in text, buttons and the objects that became sprites removed with a local LaMa inpainting model |
| `farm-background.mjs`, `farm-icons.mjs` | Build My Farm scene and its tree / barn / fence picture cues |
| `home-assets.mjs` | Home scene, nine separate card images, card/star positions |
| `rigs.mjs` | Animated guide characters for the other scenes (body + mouth layers, eyes, skin) and removes them from the backgrounds — run after `scenes.mjs` |
| `rig-farmer.mjs` | Animated farmer: body, pointing forearm and mouth layers + eye/skin data (`src/content/rigs.json`); removes him from the farm background |
| `clean-sources.mjs`, `fix-edges.mjs` | Small touch-ups (sheep wool marks, golden frame edge on one top) |

The tools (`onnxruntime-node`, LaMa model, `@imgly/background-removal-node`) are only
used to prepare assets; nothing runs at app runtime.

## Known asset gaps

* **baby, uncle, aunt, cousin** — no pictures in the supplied artwork; family games use mum, dad,
  grandma, grandpa, sister and brother. Supply pictures and add them to `content/family.ts`.
* **tall, short, thin, fat** — no pictures where these are clearly visible, so Guess Who? uses hair,
  eyes, glasses, moustache and bows instead.
* **School bag** — no separate bag picture; Pack My School Bag uses the girl's backpack in the
  supplied "It's a pencil" picture as the drop target.
* **Animal sounds** — no recordings; the game speaks "Moo!" etc. Map recordings to those strings in
  `src/content/audioManifest.ts`.
* **Meet My Family picture** — mum's baked-in yellow glow remains in the family photo scene.
* Repainted areas of backgrounds are softer than the original art; most sit under live UI.

## Audio

Speech uses the browser's English voice until recordings are supplied. To use
professional recordings, put files in `public/audio/` and list them in
`src/content/audioManifest.ts` — no other code changes needed.
