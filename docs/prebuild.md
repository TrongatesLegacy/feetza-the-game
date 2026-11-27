# Pre-built art packs

Almost every image in Feetza is painted by code at runtime. Today the art cache (`src/game/artCache.ts`) keeps
what was painted in IndexedDB, keyed by the art version (`virtual:art-version`), so a second visit only decodes.
But any art change bumps the version, and every player paints everything again: slow first visits (the Peel Locker
filling one peel at a time), slow phones, and a stage change that paints its backdrop in the shop.

Stage 1 moves the fixed art to the build: the same painters run in a headless Chrome at build time and the
results ship as WebP atlases. The game loads them and registers them under the keys the painters use, so nothing
else changes; anything not in a pack is painted as before.

## Fixed or dynamic, by painter family

| Family | Keys | Stage 1 | Why |
|---|---|---|---|
| Backdrop stills (Animated stages off) | `bg_<id>` | **packed** (lossy, opaque) | fixed per place |
| Live backdrop bases, baked pieces, shades | `bgk_<id>_*` (`sceneLive.bake`) | **packed** (bases lossy, pieces lossless) | fixed per place; the live code only moves them |
| Live layers' own textures and frame sheets | `KitLive.tex`, `sceneAnim.sheet`, `liveBits.sheet`, the older live layers' `tex` | **packed**, unless painted with randomness | fixed per key |
| Per-wave lighting | washes, glows and tints over the stack | runtime | they're tweens over the packed layers, not textures |
| Foot and boss still art | `foot:<id>` (foot, leg, cuff + metrics) | **packed** (lossless) | fixed per foot |
| Pizzas | `pizza:<id>` (top, slice) | **packed** | fixed |
| Sprites and event sprites | `sprites` | **packed** | fixed |
| Peel Locker thumbnails | `thumb:<peelVersion>:<id>@180` | **packed** | fixed per peel |
| What peel art is drawn from | `crop:`, `zemb:`, place windows, pizza boards | **packed** (cache-backed keys) | fixed |
| Live foot rigs, bands, glow | `lk_<id>_*` (`liveKit`) | runtime (stage 2) | big; built per foot on first spawn |
| Pizza state (slices, splats, face), crack stages | `pz_inst_*` | runtime | live state |
| Peel wall, parade, ability + look combos | — | runtime | from the save |
| Particles, screen effects, text | — | runtime | dynamic |
| Art painted with randomness (`crand`, `Math.random`) | any | runtime | the prebuild detects it and leaves it out |

## Pack layout

- `shared`: sprites, every pizza, the everyday feet (no home act), summoned and event feet.
- `peels`: every peel's Locker thumbnail, and the crops, rotted feet, windows and boards they're drawn from.
- `act1` … `act10`: the act's locations and arenas (still, live layer) and its themed feet, mini-bosses, bosses and
  minions.
- `extra`: places outside the journey's stages.

Each pack is a set of atlases (fetch units). Every backdrop gets atlases of its own, split three ways: its still,
its live layer's opaque full-screen layers (both lossy WebP q90, about a seventh of lossless), and its live layer's
transparent parts (lossless). So a stage only downloads what it shows. Everything else is lossless WebP
(pixel-exact; code reads foot and crop pixels). File names carry a content hash, so a pack that didn't change keeps
its URL and stays in the browser cache; only changed atlases download again.

`packs/manifest.json` maps every key to `{ f: [[atlas, x, y, w, h], …], d: data, b: backdrop, m: 's'|'l' }` and
records the pack version it was painted at.

Sizes: see "Measurements" below.

## Never stale

`virtual:pack-version` is the art-version hash over everything the packed art is painted by: `assets.ts`,
`BackdropView.ts` (this pulls in `content/live`, which the art cache's own version misses) and `peels.ts`. The
manifest records it, and the runtime ignores the whole manifest under any other version, so every piece is painted
exactly as without packs. In dev, editing any painter therefore falls back to painting until `npm run prebuild`
runs again.

## The loader (`src/game/packs.ts`)

- **Boot** (`generateAll`): loads the manifest beside the art cache (2 s timeout), decodes the trattoria's live
  textures (or its still) from `act1`, then boots as before. The cache reads (sprites, the demo foot, the menu's
  pizzas) find their keys in the packs.
- **Cache-backed art** (feet, pizzas, sprites, peel art): `cachedArt(key)` is true for a packed key, and
  `readArt` / `readArtBlobs` read it from the pack when IndexedDB doesn't have it: the atlas is fetched once,
  decoded off the main thread (`createImageBitmap`, straight alpha so lossless frames read back exactly), and its
  frames cropped (`createImageBitmap(atlas, x, y, w, h)`). The last three decoded atlases are kept. The warmer
  (`warmFootArt`) and the Peel Locker work unchanged; a Locker thumbnail is a decode, not a paint.
- **Backdrop textures** are made synchronously by their painters, so they're decoded ahead: `preparePacked(scene,
  id)` (in `liveBackdrop.ts`) decodes the backdrop's frames for the current mode (live or still) and its painters take
  them through `packedCanvas(key, paint)`, painting only what's missing. It runs at boot (the trattoria), in the shop
  before a stage change (then `prepareLive` builds the live layer from the decoded frames), and before resuming a
  saved run. `releaseLive` drops any decoded frames nothing took.
- **Prefetch**: at every wave and shop (`GameScene.prefetchPacks`), this act's pack and `shared` are fetched; from
  the third wave of an act, the pack of the act after it (whatever the journey deals next: Endless and Endless+
  included) is fetched at low priority. After boot, `shared` and then `peels` are fetched quietly.
- **The wait**: if Next Wave is pressed while the next stage's backdrop is still downloading or decoding, the shop
  shows "Loading the next act…" and waits (up to 15 s, then paints).

## The fallback

Anything not in a pack (dev edits, dynamic art, a key painted with randomness), a missing or mismatched manifest,
a failed fetch, or a pack read slower than 6 s is painted exactly as today and saved to the IndexedDB art cache as
today. `?noPacks` turns packs off (for timings); `F.packs()` (dev) shows what's loaded, hits, bytes and decode time.

## How the build runs

`npm run prebuild` (`scripts/prebuild/run.mjs`; npm runs it before `npm run build` automatically):

1. starts its own Vite dev server and one headless Chrome (muted, a throwaway profile);
2. asks Vite for the pack version and stops if `public/packs/manifest.json` already matches (`--force` repaints);
3. opens `?dev&prebuild&noArtCache`: `src/devPrebuild.ts` makes a Phaser game of its own and runs the painters as the
   game does. Each backdrop's still, then its live layer through all five waves with a stomp in each, then every
   foot, pizza and peel thumbnail. The recorders in `packedCanvas` and `writeArt` collect what they make. Each
   backdrop is packed and posted as soon as it's done, then released (memory stays flat);
4. the runner encodes each posted PNG atlas with `cwebp` (lossless `-exact -z 6`, or `-q 90 -sharp_yuv` for opaque
   backdrop layers), names it by content hash, and swaps the new packs into `public/packs/` (git-ignored) in one go.

Without Chrome the prebuild warns and skips (the game paints, as before); `--require` or `PREBUILD_REQUIRED=1`
fails instead. Without `cwebp` the atlases stay PNG. Netlify's build image has neither by default: see stage 2.

`npm run prebuild:check` paints a seeded sample of packed keys again (some of every kind) and compares pixel by
pixel. Lossless entries must match within 1/255; lossy ones need a PSNR of 38 dB or better.

## Measurements

(filled in below from the runs on this branch)

## Stage 2

- CI: install Chrome (e.g. `npx @puppeteer/browsers install chrome-headless-shell`) and `cwebp` in the Netlify
  build, or build the packs on a machine and upload them as a release artefact keyed by pack version.
- Live foot textures (`lk_*`, `liveKit`): the biggest remaining paint at a stage start.
- `fxAtlas`, guard shields, zombie art, the sync `peelThumbURL` sizes (96, 160, 200, 240, 300, 360).
- Keys used by more than one backdrop (shared sheets) are packed with the first backdrop that paints them; move them to
  `shared`.
- Trim transparent margins before packing, and try `-near_lossless` on the parts atlases.
