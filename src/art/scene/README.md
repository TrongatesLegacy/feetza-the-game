# The location kit

Every location and arena is painted with this kit: in screen space (1920×1080, the table's back edge at `TY`), lit by
the feet's one light (`src/art/style`) and built as a stack of named layers so the moving parts can be baked apart
for the live layer. Trattoria (`src/content/art/scene-trattoria.ts`), Beach (`scene-beach.ts`) and Tartarus
(`scene-tartarus.ts`) are the reference scenes: read one before starting a new place.

## The modules

| Module | What's in it |
| --- | --- |
| `kit.ts` | Light and air: `LIGHT`, `FALL` (the direction shadows fall), `Air`/`airMix`/`lineAt`/`inkAt` (depth), `solid()` (a prop's one silhouette: material, light, air, one outline), `within`, `rim`, `bounce`, `castShadow` (soft penumbra plus a tighter core), `groundShadow`, `crevice`/`creviceV` (occlusion where surfaces meet), `lightPool`, `beam`, `glowAt`, `haze`, `airWash`, the finishing passes `gradeAll` (with the warm/cool `Split`), `calmLanes`, `vignetteAll`, and helpers (`polyPath`, `rectPath`, `rrPath`, `ellPath`, `boxOf`, `vfill`; `jitter` for colour variation). |
| `paint.ts` | Painterly surfaces: `surface()` (the base for any big surface: colour drift at two scales, painter's strokes, grain), `drift()`/`noiseMask()`/`lay()` (small cached noise fields drawn stretched), `softly()` (paint something big and soft at a small size and draw it up: cheaper than `ctx.filter` blur), wear: `grime()` (patchy dirt along edges and in corners), `streaks()` (stains run down from ledges), `crack()` (hairline cracks with a lit lip), `chips()`. |
| `light.ts` | The shapes real light makes: `lampOnWall()` (a shaded lamp's scalloped pool, the wall above it in shade), `lightPatch()` (a window's light on a surface, cut by its glazing bars), `shaft()` (a beam through dusty air, with streaks and motes), `motes()`, `bounceBand()`, `aoHalo()` (occlusion round a thing against a wall), `groundCast()` (a long shadow laid on the ground by a low light), `dapple()`. |
| `sky.ts` | `skyFill()` (a dithered gradient), `horizonGlow()`, `sun()` (bloom, halo, a disc with a soft limb), `rays()`, `cloud()` (cumulus, stratus or a smoke bank: lit faces turned to the light, shaded underside, a rim where the light is behind, wisps), `cirrus()`, `stars()`, `farLand()`. |
| `materials.ts` | Scene materials: `plaster()` (patina, thin spots, damp blooms, edge grime), `bricks()`/`brickPatch()` (recessed mortar in shadow, clinkers, spalls), `woodGrain()`, `board()`, `panel()` (raised and fielded, four lit bevels), `varnish()` (lights reflected along the grain), `checkerCloth()`/`clothDrape()`, `planksPlane()` (grain, knots, butt joints and nails in perspective), `tableSeam()`/`tableFalloff()`, `water()` (sky reflected at the horizon, depth colour, swells, ripples, a glitter path), `shallows()` (caustics over sand), `foamLace()`, `sand()` (drift, ripples lit on the windward side, glints). |
| `props.ts` | `bottle()` (tinted glass: transmission, thick edges, streak and window glint, a printed label, a caustic on the surface), `drape()` (hanging cloth: folds, gathers, pattern bending with the folds, light through it), `glassPane()`, `innerEdgeDark()`, `flameShape()`, `candle()`, `pendantLamp()`, `herbPot()`, `hang()` (rope, chain), `wallShadow()`. |
| `layers.ts` | The scene model: `SceneSpec`, `SceneLayer`, `paintStill`, `planLive`, baking. |
| `src/game/sceneLive.ts` | `registerKitScene(spec, live)`, `KitLive` (`sprite`, `slot`, `pivot`, `img`, `glow`, `wash`, `emitter`, `tex`), motions (`wander`, `flicker`, `sway`), `waveK`, `lerp`, `calm`. |

Use the kit's functions rather than raw fills. If a scene needs something the kit lacks (a new material, a new kind
of light), add it to the kit, generically, so the next place gets it too.

## Layers and the live layer

A `SceneSpec` is a list of layers painted far to near. Each layer has its own seeded random stream (`layerRng`),
so it paints the same alone as in the still.

- **Still layer** (no `motion`): painted into the base. Give it a tight `box` that holds everything it paints,
  shadows and glows too: with the live layer running it may be baked into an overlay cut to that box.
- **`motion: 'sprite'`**: baked to its own texture for the live code to move (`k.sprite(id)`; `k.pivot()` sets a
  hinge for `sway`). A soft one (sky, haze) can take `res: 0.5`.
- **`motion: 'slot'`**: not painted; the live code adds objects at that point in the stack (`k.slot(id)`). Keep its
  box tight: every still layer after it that overlaps the box becomes an overlay.
- **`motion: 'top'`**: the live code's objects go over everything (flames, sparkles, birds); its container comes
  from `k.slot(id)` too (Trattoria's `candlesLive`, Beach's `torchFire`). Free: prefer it.
- **`liveOnly`**: painted only when live, as a sprite starting at alpha 0 (a night sky, a sunset sea, string-light
  glows). The live code fades it in.
- **`stillOnly`**: painted only in the still (painted flames the live code replaces with moving ones).

Rules that keep memory down:

- Anything still that overlaps an earlier sprite, slot or live-only box is baked into an overlay. Order layers and
  size boxes so overlaps don't cascade: end a live sky at the horizon, end a live sea above the sand, put a glow
  that only adds over the table *after* the table.
- Light that adds (`'lighter'`, `'screen'`: pools, beams, glows, glass sheen) belongs in still layers that stay in
  the base: in a sprite or an overlay it's baked over a transparent canvas and reads as fog. Put it in a
  live-only layer the live code sets to `ADD` (Beach's `lightsGlow` holds the bulbs' halos) or paint it with plain
  alpha (`glassPane`).
- Shadows (`castShadow`, `aoHalo`) scale with the transform, so they bake correctly at `res < 1`.
- `grade` (colour, pixel-local: `gradeAll` with a `Split`) runs over every baked piece too, by screen position, so
  baked pieces match the still. `shade` (vignette, `calmLanes`, HUD calm) must be plain alpha darkening: it's laid
  over the live stack as one small stretched texture.

Cosmetic randomness: painting uses the layer's `r`; live code uses `crand()`. Never `Math.random`.

## Wave by wave

A location covers waves 1–4 of its stage; wave 5 is the boss's arena. `waveK(wave)` gives 0 on the first wave and
1 on the last. Ease towards it (`shown += (kw - shown) * Math.min(1, dt * 0.6)`) so a wave change is a slow
shift, not a cut. Progression is done live with layers, never by repainting:

- `liveOnly` sprites crossfading over the base (Beach: `sunset` sky and `seaEve` from wave 2, `dusk` sky at wave 4;
  Trattoria: `streetNight` in the window).
- `k.wash(colour, alpha, MULTIPLY)` over the stack for the light's colour (Beach's warm sunset and blue dusk),
  `ADD` washes and glows for fire (Tartarus's pit).
- `setTint` on moving sprites so they follow the light (Beach's clouds: gold, then pink, then slate).
- Lights coming on (Beach's string lights and torch at sunset, Trattoria's candle brighter at night) and events
  getting stronger (Tartarus's eruptions from the third wave).

With Animated stages off nothing here runs: the still is wave 1 and must look complete on its own.

## Arenas and locations

Every stage is a location (waves 1–4, the mini-boss arrives in wave 3) and an arena with the boss's id (wave 5).
Arenas use this same kit and the same rules. An arena is its own place, not a reskin of the location; while it
waits for its art, `PLACEHOLDER` in `src/art/backdrops.ts` lends it another place's. Boss fights drive their
arenas through their own files (`src/game/bosses/*`): don't edit those. If a fight uses the backdrop (it calls
`quake` or hides parts), keep the ids and layout constants it relies on where the old art had them.

To redraw a place: write `src/content/art/scene-<id>.ts` with a `SceneSpec` and `registerKitScene`. Keep the old art
for the before/after page: built-in art in `backdrops.ts` goes in `REDRAWN`; a painted content module registers its
old scene with `registerLegacyScene` (see `scenes-act9.ts`). Every new place also needs its peel: see `CLAUDE.md`.

## Quality checklist

The bar is the redrawn feet (`?dev&style`). Before calling a place done:

- **No flat fills.** Walls, floors, skies, water and sand start from `surface()`/`plaster()`/`skyFill()`/`water()`/
  `sand()` and carry colour drift (warm lights, cool darks), not just a grey noise overlay.
- **One light.** Key from the top left, warm; shadows fall down-right (`FALL`); a cool rim on far edges; the warm/
  cool `Split` in the grade. Every local light (lamp, window, fire, sun) has its consequences painted: a pool on
  the surfaces it reaches (`lampOnWall`, `lightPatch`, `lightPool`), a bounce on the surface beside it, the side of
  each prop that faces it lit.
- **Contact.** Every prop casts a soft shadow (`castShadow`, `groundShadow`, `groundCast` for a low sun) and sits
  in occlusion (`crevice` where surfaces meet, `aoHalo` against walls). Nothing floats.
- **Materials read.** Plaster has patina with cracks only where stress gathers (corners of openings, under beams);
  wood has grain and varnish where it's polished; brick has mortar in shadow; glass reflects and transmits; cloth
  folds; water has depth, swells and glints; sand has ripples and shadow.
- **Wear tells a story.** Grime in corners and along the floor, soot over fires and lamps, stains under ledges,
  chips on edges people knock. Brick showing through plaster only where something wore it away (a peel rubbing
  the wall, heat round a flue), never as random patches.
- **Props have form:** `solid()` with a material, light and one outline (thinner with depth); detail painted
  inside the form.
- **Depth and air.** Far layers through the `Air` (`airMix`, `depth`); haze where the air is thick; shafts and
  motes where light crosses dusty or smoky air. Motes only against dark air, never scattered over lit surfaces
  (they read as dirt).
- **Calm play area.** The middle of the wall (where feet hover) and the table under the pizzas stay low in
  contrast and detail; `calmLanes` in the shade; nothing bright or busy behind the HUD. `F.contrast()` must
  stay clean.
- **Its own place.** Its own backdrop, music, ambience and effects (see `CLAUDE.md`'s quality bar).
- **Progression.** Wave 1 to wave 4 changes light or weather visibly and smoothly, and the still is complete.

## Performance budgets

Each place is painted while the shop is open (the still, or the live base and its pieces). Measured warm in
desktop Chrome:

- Paint: the still and the live bake each under about 200 ms (references: Trattoria ~150 ms still / ~175 ms bake,
  Beach ~100 / ~180, Tartarus ~75 cold; about a third of a bake is `gradeAll`).
- Texture memory: the live base is always 7.9 MB (1920×1080); keep the base plus every piece under about 16 MB,
  24 MB at most for a place with a lot moving (Trattoria 10.8 MB, Tartarus 16.1 MB, Beach 21.2 MB with its three
  skies and two seas).
- Cheap: `lay()` of cached noise fields, gradients, paths. Costly: big `ctx.filter` blurs (use `softly()`, or blur a
  small offscreen canvas as `cloud()` and `lampOnWall()` do), thousands of strokes with their own gradients, and
  pixel loops (`gradeAll` runs once per piece: keep pieces few and tight).
- `res` below 1 for soft sprites and live-only layers (skies 0.5, a sunset sea 0.75, glows 0.33).

To measure, run the planner and bakers from the console on the dev server:

```js
const L = await import('/src/art/scene/layers.ts');
const { BEACH: spec } = await import('/src/content/art/scene-beach.ts');
const plan = L.planLive(spec);
let bytes = 1920 * 1080 * 4;
for (const p of plan.pieces) if (p.kind !== 'slot') { const c = L.bakePiece(spec, p); bytes += c.width * c.height * 4; }
console.log((bytes / 1048576).toFixed(1), 'MB', plan.pieces.map((p) => p.kind + ':' + (p.kind === 'overlay' ? p.layers.map((l) => l.id).join('+') : p.layer.id)));
```

The list of pieces shows which layers became overlays: if one is a surprise, an earlier box overlaps it.

## How to check a place

- **`?dev&stages`** (or the floating "🏞 Stages" dev button): every place old next to new, live, with pizzas and
  feet, cycling through the stage's waves. `&only=beach,trattoria` picks cards, `&wave=3` holds a wave, `&still`
  starts in Still.
- **Still toggle** on that page: what Settings → Graphics → Animated stages off shows (`backdropsAnimated()` in
  `src/systems/graphics.ts`). The still must look complete and match wave 1 of the live version.
- **Real play** on each wave of the stage, at desktop and phone size, animated and still:
  `F.startGame({ wave: 11, intros: false })` in `?dev`.
- **`F.contrast()`** (HUD text and buttons over the backdrop) and **`F.layout()`** must come back empty.
- Check the console on the stages page and in play: a layer id the live code asks for that isn't a sprite or slot
  (`k.sprite`, `k.slot`) throws, and the live layer is lost. Then `npx tsc --noEmit`.
- Screenshots at 1920×1080 and phone size for the review passes in `CLAUDE.md`; an independent visual review
  against the feet's bar.
