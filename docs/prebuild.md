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
| What peel art is drawn from | `crop:`, `zemb:`, place windows, pizza boards | runtime (stage 2) | about 75 MB lossless for art only a peel's full-size picture uses; made from the packed feet when wanted |
| Live foot rigs, bands, glow | `lk_<id>_*` (`liveKit`) | runtime (stage 2) | big; built per foot on first spawn |
| Pizza state (slices, splats, face), crack stages | `pz_inst_*` | runtime | live state |
| Peel wall, parade, ability + look combos | — | runtime | from the save |
| Particles, screen effects, text | — | runtime | dynamic |
| Art painted with randomness (`crand`, `Math.random`) | any | runtime | the prebuild detects it and leaves it out |
| One key painted by two backdrops | e.g. `lb_flake` | runtime | possibly two different textures under one name: the prebuild leaves it out |

## Pack layout

- `shared`: sprites, every pizza, the everyday feet (no home act), summoned and event feet.
- `peels`: every peel's Locker thumbnail.
- `act1` … `act10`: the act's locations and arenas (still, live layer) and its themed feet, mini-bosses, bosses and
  minions.
- `extra`: places outside the journey's stages.

Each pack is a set of atlases (fetch units). Every backdrop gets atlases of its own, split three ways: its still,
its live layer's opaque full-screen layers (both lossy WebP q90, about a seventh of lossless), and its live layer's
transparent parts (lossless). So a stage only downloads what it shows. Everything else is lossless WebP
(pixel-exact; code reads foot and crop pixels). File names carry a content hash, so a pack that didn't change keeps
its URL and stays in the browser cache; only changed atlases download again.

Atlases live in `packs/a/` (named by their contents, so the browser's cache keeps them until they change); `packs/manifest.json` (fetched fresh) maps every key to `{ f: [[atlas, x, y, w, h], …], d: data, b: backdrop, m: 's'|'l' }` and
records the pack version it was painted at, plus the encoder settings and font versions (`enc`: a change to either
makes the prebuild paint again).

Sizes: see "Measurements" below.

## Never stale

`virtual:pack-version` is the art-version hash over everything the packed art is painted by: `assets.ts`,
`BackdropView.ts` (this pulls in `content/live`, which the art cache's own version misses), `peels.ts`, and the
prebuild's own page `devPrebuild.ts` (what it harvests, and how). The
manifest records it, and the runtime ignores the whole manifest under any other version, so every piece is painted
exactly as without packs. In dev, editing any painter therefore falls back to painting until `npm run prebuild`
runs again.

## The loader (`src/game/packs.ts`)

- **Boot** (`generateAll`): loads the manifest beside the art cache (2 s timeout; a manifest later than that is
  ignored for the session), decodes the trattoria's live
  textures (or its still) from `act1`, then boots as before. The cache reads (sprites, the demo foot, the menu's
  pizzas) find their keys in the packs.
- **Cache-backed art** (feet, pizzas, sprites, peel art): `cachedArt(key)` is true for a packed key, and
  `readArt` / `readArtBlobs` read it from the pack when IndexedDB doesn't have it: the atlas is fetched once,
  decoded off the main thread (`createImageBitmap`, straight alpha so lossless frames read back exactly), and its
  frames cropped (`createImageBitmap(atlas, x, y, w, h)`). The last three decoded atlases are kept (never one a
  reader is still cropping from); compressed atlases aren't kept once decoded (the browser's cache has them). Each
  read keeps its caller's timeout: a pack slower than that is painted instead. The warmer
  (`warmFootArt`) and the Peel Locker work unchanged; a Locker thumbnail is a decode, not a paint.
- **Backdrop textures** are made synchronously by their painters, so they're decoded ahead: `preparePacked(scene,
  id)` (in `liveBackdrop.ts`) decodes the backdrop's frames for the current mode (live or still) and its painters take
  them through `packedCanvas(key, paint)`, painting only what's missing. It runs at boot (the trattoria), in the shop
  before a stage change (then `prepareLive` builds the live layer from the decoded frames), and before resuming a
  saved run (on the journey's first time through: Endless+ deals its places from the run's seed). One decode per
  backdrop and mode at a time. When a new backdrop shows, every other backdrop's decoded frames are dropped (one that
  never showed, parts its painters never asked for), as `releaseLive` does for a stage left behind.
- **Prefetch**: at every wave and shop (`GameScene.prefetchPacks`), this act's pack is fetched (its feet, and its
  backdrops' atlases for the current mode: live or still); from the third wave of an act, the next act's (whatever
  the journey deals next: Endless and Endless+ included) at low priority. `peels` is fetched quietly 3 s after boot.
  `shared` comes an atlas at a time as it's asked for (the lineup's pizzas, everyday feet).
- **The wait**: if Next Wave is pressed while the next stage's backdrop is still downloading or decoding, the shop
  shows "Loading the next stage…" and waits (up to 15 s, then paints; it never waits twice for one backdrop).

## The fallback

Anything not in a pack (dev edits, dynamic art, a key painted with randomness), a missing or mismatched manifest,
a failed fetch, or a pack read slower than 6 s is painted exactly as today and saved to the IndexedDB art cache as
today. `?noPacks` turns packs off (for timings; `?noArtCache` alone still serves packs), and so do `?sim` (the
balance simulator's shop timing stays as it was) and `?legacyFeet`. `F.packs()` (dev) shows what's loaded, hits,
bytes and decode time.

## How the build runs

`npm run prebuild` (`tsc`, then `scripts/prebuild/run.mjs`; npm runs it before `npm run build` automatically):

1. starts its own Vite dev server and one headless Chrome (muted, a throwaway profile);
2. asks Vite for the pack version and stops if `public/packs/` already matches it and the encoder settings, with
   every atlas present (`--force` repaints);
3. opens `?dev&prebuild&noArtCache`: `src/devPrebuild.ts` makes a Phaser game of its own and runs the painters as the
   game does. Each backdrop's still, then its live layer through all five waves with a stomp in each, then every
   foot, pizza and peel thumbnail. The recorders in `packedCanvas` and `writeArt` collect what they make. Each
   backdrop is packed and posted as soon as it's done, then released (memory stays flat);
4. the runner encodes each posted PNG atlas with `cwebp` (lossless `-exact -z 6`, or `-q 90 -sharp_yuv` for opaque
   backdrop layers), names it by content hash, and stages it in `.prebuild/new/`. Only a complete set (a manifest
   and every atlas it names) is swapped into `public/packs/` (git-ignored), by renames; a failed or interrupted run
   leaves the old packs as they were. A crashed page fails the run at once.

Without Chrome the prebuild warns and skips (the game paints, as before); `--require` or `PREBUILD_REQUIRED=1`
fails instead. Without `cwebp` the atlases stay PNG. The GitHub Pages workflow (`.github/workflows/pages.yml`) installs neither yet: see stage 2.

`npm run prebuild:check` paints a seeded sample of packed keys again (some of every kind) and compares pixel by
pixel. Lossless entries must match within 1/255; lossy ones need a PSNR of 38 dB or better.

## Measurements

Built in about 5 minutes on an M-series Mac (painting about 3 minutes, `cwebp` about 3.5 minutes, partly in parallel).
It covers 55 backdrops, 183 feet, 113 pizzas, the sprites and 736 thumbnails: 2,143 keys in 472 atlases. Ten keys
are left out because more than one backdrop paints them.

| Pack | Atlases | MB | Entries |
|---|---|---|---|
| act1 … act10 | 23–39 each | 8.9–13.8 each (110 in all) | 73–121 each |
| extra (places outside the journey) | 47 | 20.9 | 295 |
| shared (sprites 5.2, pizzas 14.5, everyday feet 10.4) | 110 | 30.1 | 151 |
| peels (Locker thumbnails) | 17 | 8.1 | 736 |
| **all** | **472** | **169** | **2,143** |

A backdrop is about 0.3 MB for its still, 0.3 MB for its live base and 0.2–1.5 MB for its live parts. The boot
critical path is the manifest (41 KB), the trattoria's live layer (1.8 MB), the sprites (5.2 MB) and the menu's
demo foot and pizzas (about 1 MB).

Timings come from `node scripts/prebuild/measure.mjs`, with a cold Chrome profile (empty art cache, empty HTTP
cache), the dev server on localhost, and the machine quiet. The first number is with packs, the second with
`?noPacks` (today's painting). Long tasks are main-thread blocks over 50 ms: the hitches a player feels.

| Moment | With packs | Painting (before) |
|---|---|---|
| Boot: title art built (`generateAll`) | 830 ms, 446 ms of long tasks | 1,996 ms, 2,314 ms of long tasks |
| Boot, production build (`vite preview`): art built / title ready from navigation | 864 / 2,030 ms | 2,510 / 3,633 ms |
| Peel Locker, cold: first screen of tiles | 387 ms | 211 ms |
| Peel Locker, cold: scrolled to the end, all 735 tiles filled | 4.8 s, 0 ms of long tasks | 23.5 s, 9.6 s of long tasks |
| New run: first stage's still art in | 348 ms | 361 ms |
| Stage change (shop before wave 6 builds the rooftop) | 1,079 ms, 169 ms of long tasks | 1,199 ms, 762 ms of long tasks |
| Main thread to build a stage's live layer (rooftop / beach / bigfoot) | 91 / 113 / 34 ms | 569 / 744 / 292 ms |

An earlier run with the machine busy (Tron playing) showed the same shape, more strongly: boot 1.3 s against 4.4 s;
the Locker scroll-through 4.8 s against 51.8 s.

On localhost, downloading is free. On a real line, boot adds about 8 MB to download (about 3 s at 20 Mbit/s). That
is slower than painting on a fast desktop and faster on a phone. Stage 2 should shrink the sprites (see below).

`npm run prebuild:check` passes 58 of 60 on a seeded sample. Lossless entries are within 1/255 of the colour shown;
the lossy backdrop layers score 39–42 dB PSNR. The two misses are gem-peel thumbnails (`emerald`, `act:8`): their
painters place a glint with the cosmetic generator, so two paints of them differ in a few pixels. The art cache
already keeps whichever paint came first, so the pack behaves the same.

## Stage 2

- CI: install Chrome (e.g. `npx @puppeteer/browsers install chrome-headless-shell`) and `cwebp` in the GitHub Pages
  workflow (`.github/workflows/pages.yml`, and `pr-preview.yml`), or build the packs on a machine and upload them as a
  release artefact keyed by pack version.
- Live foot textures (`lk_*`, `liveKit`): the biggest remaining paint at a stage start.
- `fxAtlas`, guard shields, zombie art, the sync `peelThumbURL` sizes (96, 160, 200, 240, 300, 360).
- Keys painted by more than one backdrop are left out; give them distinct names (or move true duplicates to
  `shared`).
- Trim transparent margins before packing, and try `-near_lossless` on the parts atlases.
- Shrink the boot path: the sprites are 5.2 MB lossless (try near-lossless or lossy for the opaque ones), and the
  boot should wait on as little as possible.
- Decoded atlases are kept within 64 MB, for 15 s. While the warmer reads a whole stage, atlases are fetched again
  from the browser's cache and decoded again; grouping each stage's feet into its own atlases would avoid most of
  that.
- Pack versioning doesn't include the Chrome version doing the painting (fold it into `enc`).
