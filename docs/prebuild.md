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

The art is painted and versioned in **units** (111 of them), each with atlases of its own:

| Unit | What |
|---|---|
| `bg:<id>` (55) | a backdrop: its still, its live layer's opaque layers, its live layer's parts |
| `sprites` | the sprites and event sprites |
| `feet:act1` … `feet:act10`, `feet:shared0` … `3` | an act's feet; the everyday feet in four buckets (by a hash of the id, so a new foot only changes its own bucket) |
| `pizzas:0` … `7` | the pizzas in eight buckets (the same way) |
| `thumbs:<group>:<n>` | the Locker's thumbnails, by Locker group, 32 at a time in Locker order |

Each pack is a set of atlases (fetch units). Every backdrop gets atlases of its own, split three ways: its still,
its live layer's opaque full-screen layers (both lossy WebP q90, about a seventh of lossless), and its live layer's
transparent parts (lossless). So a stage only downloads what it shows. Everything else is lossless WebP
(pixel-exact; code reads foot and crop pixels). File names carry a content hash, so a pack that didn't change keeps
its URL and stays in the browser cache; only changed atlases download again.

Atlases live in `packs/a/` (named by their contents, so the browser's cache keeps them until they change);
`packs/manifest.json` (fetched fresh, 46 KB gzipped) maps every key to `{ f: [[atlas, x, y, w, h], …], d: data,
b: backdrop, m: 's'|'l', u: unit }` and records each unit's version (`units`). `packs/build.json` is the prebuild's
own record (players never fetch it): per unit its version, members, the files it depends on, what it looked up in
the registries and who registered it, its atlases with a hash of their painted pixels, and its entries; and the
encoder and its settings (a change re-encodes everything). A Locker thumbnail is packed as `thumb:<id>@180`, without
the peel version the art cache puts in its key: the unit's version does that job.

Sizes: see "Measurements" below.

## Never stale: per-unit versions

Each unit's version is a hash over the files it depends on (`scripts/prebuild/deps.mjs`), plus a base: the rule's
own version, the prebuild's page `src/devPrebuild.ts`, and the Phaser and font package versions. The loader serves a
unit only when the version it was painted at (the manifest's `units`) matches this build's version of it
(`virtual:pack-versions` in vite.config.ts: the same hash over the unit's files listed in `build.json`, as they are
now). Any other unit is painted exactly as without packs, and the rest are still served: after an edit to the
rooftop, every other backdrop still comes from its pack. In dev, editing a painter falls back to painting only what
depends on it, until `npm run prebuild` runs again (`F.packs().stale` lists those units).

Which files a unit depends on is found while it is painted, on a fresh page of its own (so nothing another unit
painted, and left in a cache, can hide a dependency):

1. **What ran.** The DevTools protocol's precise coverage, reset just before the unit starts: every `src/` module
   any of whose functions ran while it was painted.
2. **What it looked up.** The registries that content modules fill at load time (foot kinds, styles, legs, toppings,
   scenes, kit scene specs, live layers, hero moves: `traced` / `tracedMap` in `src/game/packTrace.ts`) note, in dev,
   the source files on the stack of each registration. While a unit is painted, each lookup is noted. The unit
   depends on the files that registered what it looked up, even pure data nobody's code ran for (a `registerLeg`
   override, a kit scene's spec).
3. **What data it read.** The feet, pizzas and hero peels collected from `src/content/{feet,pizzas,peels}/` by
   `import.meta.glob` are traced field by field while the prebuild paints (`traceData`): reading a foot's data adds
   the file it's defined in.
4. **What those import.** From the modules above, through the static imports: a module imported for anything but a
   function (a constant, a table, a namespace, a default, a side-effect import, a re-export) is in, and so is
   everything it imports in turn. A module imported only for functions is in only if they ran (step 1), or if one of
   them ran while the page loaded (it may have built load-time state that's read later). For a module whose code
   ran, only the imports mentioned by the code that ran count, plus those mentioned by the top-level declarations
   that code refers to and by its other top-level statements. So `assets.ts` imports the foot painter, but a
   backdrop that only calls `ensureBackdrop` doesn't depend on it. Data folders (`const mods = import.meta.glob(…)`)
   are followed unless traced (step 3). Side-effect plug-in folders (`import.meta.glob('./art/*.ts', { eager: true
   })`) aren't: a plug-in reaches a unit by its code running or by registering what the unit looks up.

The list stays sound until one of its files changes (a change to how files import each other is a change to a file
in the list), and then the unit is painted again and its list found again. Who registers a key can change in a file
outside the list (a registration for this foot added to another file). The prebuild compares each unit's lookups
with a fresh page's registrations, and dev's loader compares them with its own registries (it fetches
`build.json`). A production build always runs the prebuild first, so it never serves a unit the prebuild hasn't
checked.

What it can't see: a content module that changes shared state at load time other than through a traced registry (a
`Record` some painter reads, written by another file). Give any new registry a `traced(…)`. `npm run prebuild --
--verify` paints every unit again and fails if one whose version didn't change paints differently: run it after
changing how painters find their content.

In numbers: a backdrop depends on about 33 files (its scene file, the location kit, the live layer code, `save.ts`
and `stages.ts`), an act's feet on about 35, a thumbnail chunk on 50 to 120. The peel art draws from everything, and
the peel list itself is built at load from the place windows, so every scene file is in most thumbnail chunks.

`npm run prebuild:test` checks the lists on disk:
- one scene file makes only its backdrop's units stale (plus any backdrop that borrows from it, and the thumbnails);
- a shared kit file (`src/art/scene/kit.ts`, `layers.ts`, `sceneLive.ts`) makes every kit backdrop stale;
- the style kit makes every styled foot unit stale;
- a foot style file makes only feet and thumbnails stale;
- a topping file makes pizzas and thumbnails stale;
- `GameScene.ts`, `ui.ts`, `Run.ts` and `style.css` make nothing stale.

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

1. starts its own Vite dev server (a port in 5600–5700) and one headless Chrome (9400–9800, muted, a throwaway
   profile);
2. opens a plan page (`?prebuild=plan`), which lists the units and who registers what. A unit is painted again when
   it's new, its members changed, its version changed, or who registers what it looked up changed. `--force` paints
   every unit, `--only bg:rooftop,feet:` only some, and `--dry` only says which and why. When there's nothing to
   paint, it's done in about 3 s;
3. paints those units, `--jobs` pages at once (default: 3 on CI, else half the cores and at most 4), each in a
   window of its own and on a fresh page (`?prebuild=unit`). The page boots, the runner resets the coverage and hands
   it the unit, and the page runs its painters as the game does (a backdrop's still, then its live layer through all
   five waves with a stomp in each; feet, pizzas, sprites, thumbnails). It then packs what the recorders in
   `packedCanvas` and `writeArt` collected and posts each atlas as a PNG;
4. an atlas whose painted pixels hash the same as last time (with the same encoder) keeps its WebP and its name: it
   isn't encoded again, and players' caches keep it. The rest are encoded with `cwebp` while the painting goes on,
   and named by content hash. Lossless atlases use `-exact -z 6`, opaque backdrop layers `-q 90 -sharp_yuv`.
   `--encode-jobs` sets how many cwebp processes run at once (default: as many as `--jobs` on CI, else 1);
5. the units that didn't change keep their atlases (hard links) and entries, and the new manifest and build file
   are written. The complete set is swapped into `public/packs/` (git-ignored) by renames. A failed or interrupted
   run, or a source file that changed while it ran, leaves the old packs as they were. A crashed page fails the run
   at once.

Without Chrome the prebuild warns and skips (the game paints, as before); `--require` or `PREBUILD_REQUIRED=1`
fails instead. Without `cwebp` the atlases stay PNG. The GitHub Pages workflow's `packs` job installs `webp` and
uses the runner's Chrome, and starts from the last deploy's packs (actions/cache), so it repaints only what changed.

`npm run prebuild:check` paints a seeded sample of packed keys again (some of every kind) and compares pixel by
pixel. Lossless entries must match within 1/255; lossy ones need a PSNR of 38 dB or better.

## Measurements

### The prebuild

Measured on Tron's M-series Mac (12 cores) while it was busy (load average 12–30): 111 units, 2,143 keys, 495
atlases, 170 MB.

| Build | Units painted | Atlases encoded | Time |
|---|---|---|---|
| Before: one version, one page | all | 472 | about 5 min (longer when busy) |
| Cold, `--jobs 4` | 111 | 495 | 220 s (424 s of painting over 4 pages) |
| One backdrop file (a colour in `scene-rooftop.ts`), `--jobs 4` | 27 (rooftop, ironheel, 25 thumbnail chunks) | 3 | 65 s |
| One foot style file (a colour in `roster-2.ts`), `--jobs 2`, niced | 12 (4 act feet, 8 thumbnail chunks) | 4 | 36 s |
| Both reverted, `--jobs 2`, niced | 31 | 7 | 78 s |
| A non-art change (`heatRules.ts`), or nothing changed | 0 | 0 | 3 s |

These are estimates for GitHub's runner (4 vCPUs, `--jobs 3`), where the old build took about 22 minutes (18 painting,
4 encoding):
- a full repaint: about 9–12 minutes (the same painting split over three pages, plus a second or two of page load
  per unit);
- a backdrop edit: 2–4 minutes;
- a foot style edit: 1–2 minutes;
- a non-art change: about 10 s.

All of these come on top of the job's setup (checkout, `npm ci`, `apt install webp`, the cache restore), about 1.5
minutes.

A full repaint now happens only when the base changes (`devPrebuild.ts`, the rule, Phaser or the fonts), when the
encoder changes, or when a file nearly everything uses changes (`save.ts`, `stages.ts`, or the location kit, which
repaints every backdrop).

**Sharding on GitHub Actions** (a matrix of runners each painting a slice, then a job merging them): not done. Each
shard pays the setup again (about 1.5 minutes, plus uploading its atlases as an artifact), and the merge job pays it
once more, plus downloading up to 170 MB. Four shards would take a full repaint from about 10 minutes to about 6, but
an incremental build, the usual case, would get slower: it would need a plan job before the shards. It's worth doing
only if full repaints become common. The plan job would then decide (shard only above, say, 40 stale units), and the
runner would need `--shard i/n` (paint a slice and write a partial build file) and `--merge` (combine the partial
builds with the cached packs).

**A painter outside the browser** (node-canvas, skia-canvas; Node has no OffscreenCanvas): not worth it. The painters
use `ctx.filter` in 43 files, every blend mode Canvas has (`lighter` 330 times, `screen`, `multiply`, `overlay`,
`soft-light`, `saturation`…), web fonts, `OffscreenCanvas` and `createImageBitmap`, and the live layers run on a real
Phaser scene. node-canvas (Cairo) has no `filter`, and it draws text and gradients differently. skia-canvas is closer
(Skia, like Chrome), but its Skia version, text shaping and filter support aren't Chrome's, so its pixels would differ
from what players' browsers paint. The packs are meant to be exactly the painters' art, and `prebuild:check` compares
them with Chrome. With incremental builds, the painting is no longer the bottleneck.

### The packs

They cover 55 backdrops, 183 feet, 113 pizzas, the sprites and 736 thumbnails: 2,143 keys in 495 atlases. Ten keys
are left out because more than one backdrop paints them.

| Pack | Atlases | MB | Entries |
|---|---|---|---|
| act1 … act10 | 23–39 each | 8.9–13.8 each (110 in all) | 73–121 each |
| extra (places outside the journey) | 47 | 21.0 | 295 |
| shared (sprites 5.3, pizzas, everyday feet) | 117 | 30.4 | 151 |
| peels (Locker thumbnails) | 33 | 8.0 | 736 |
| **all** | **495** | **170** | **2,143** |

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

`npm run prebuild:check` passes 58 of 60 on a seeded sample. Lossless entries are within 1/255 of the colour shown,
and the lossy backdrop layers score 39–42 dB PSNR. There are two misses:
- The `emerald` gem-peel thumbnail. Its painter places a glint with the cosmetic generator, so two paints of it
  differ in a few pixels. The art cache already keeps whichever paint came first, so the pack behaves the same.
- The Doom Lab's still (`bg_doomlab`, 36.8 dB). Painted on a fresh page it's the same every time (`--verify`), but
  the check paints it after other backdrops on one page, and then it comes out differently. Its painter seems to
  depend on what was painted before it in the session, which is worth a look in the game itself.

## Stage 2

- CI: `pr-preview.yml` doesn't build packs yet.
- The quick deploy could restore the packs cache and serve every unit still current, so a non-art push never drops
  the packs for those few minutes. It would have to run the plan page first (registrations can change outside a
  unit's files).
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
- Pack versioning doesn't include the Chrome version doing the painting. Players' browsers differ anyway, and
  folding it in would repaint everything whenever the runner's Chrome updates.
- Finer versions: a unit depends on whole files, so an edit to any function in `backdrops.ts` or `save.ts`
  repaints every backdrop, even when the painting never runs that function.
- The sprites unit is painted through `generateAll`, which also paints the trattoria, so a trattoria edit repaints
  the sprites too.
- A weekly `--verify` run on CI would catch a dependency the versions miss.
