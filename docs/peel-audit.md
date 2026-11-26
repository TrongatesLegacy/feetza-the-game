# Peel audit: the peel animation pass

Every peel group as of the start of the peel animation pass: 736 peels. Each has how many there are, how it looks today, how often players see it, and what living animation would suit it. The bar is the one the feet, bosses and locations are now at: real animation (painted frame loops, structured motion, shaped and lit particles), a reaction when a smack lands, the silhouette and thumbnail kept readable, and cheap enough for the locker's grid and the cursor peel in play. Settings → Graphics "animated peels" gates all of it (off, every peel is a still), and everything cosmetic uses `crand()`.

How a peel can look today:

- **still**: drawn once (`src/art/peelArt.ts`); nothing moves.
- **glow**: the generic family glow and trail (`src/art/lookGlow.ts`): an aura, particles in the peel's palette, a ribbon trail. On the locker's tiles most glows don't play at all (only on the big preview).
- **fire**: always aflame in its own style (`src/art/lookFire.ts`).
- **living**: the redrawn foot moves on the peel as it does in play (`src/art/peelLive.ts`): blinks, sway, toes that curl and splay on a smack, its own emitters and critters.
- **crafted** (new in batch 1): painted as its material and alive as it (`src/art/peelCraftArt.ts`, `src/art/peelCraft.ts`).
- **window** (new in batch 2, a crafted kind): a place peel's head with a living miniature of its location set into it (`src/art/peelPlace.ts`, `src/art/peelPlaceDefs.ts`).
- **pie** (new in batch 3, a crafted kind): a pizza peel's pie, built from the pizza's own art in layers, alive on its board (`src/art/peelPizza.ts`).
- **medallion** (new in batch 4, two crafted kinds, `event` and `act`): a round window set into the head behind a bezel and glass, the wave event in miniature or the act's places, number and boss alive in it (`src/art/peelMedal.ts`, `src/art/peelEventDefs.ts`).

Priorities: **P1** the most seen (everyone's first peel, the first peels bought, what most players own early); **P2** owned early or often by most players, still a still today; **P3** rare or late, or already animated (a glow or a fire) and wanting a signature motion of its own.

## Summary

| Group | Peels | Today | Seen | Priority |
|---|---|---|---|---|
| Classic | 1 | still → **crafted (batch 1)** | every player, from the first run; the default cursor | **P1, done** |
| Golden Crusts | 4 | still → **crafted (batch 1)** | the first things players buy (400–1,200 crusts) | **P1, done** |
| Mastered (of the Classic and the Golden Crusts) | 5 | glow → **crafted + glow (batch 1)** | wave 60 with the peel equipped | done with their bases |
| Places | 22 | still → **a living window onto the place (batch 2)** | the Trattoria's after two early runs; one per stage after | **P2, done** |
| Pizzas | 113 | still (5 fire) → **a living pie on its board (batch 3)**; the five fire pizzas keep their fire | Margherita's and the starters' within the first few hours | **P2, done** |
| Events | 8 | still → **the event in miniature in a medallion (batch 4)** | balloon, drone and moth peels early | **P2, done** |
| Acts | 10 | still → **a trophy medallion: the act's places, gold number and boss (batch 4)** | Act 1's after the first act; one per act | **P2, done** |
| Jewellery box | 8 | glow (Ruby: fire), preview only | bought late (800–5,000 crusts) | P3 |
| Mastered (of the jewels) | 8 | glow | late | P3 |
| Event shinies | 8 | still → **as their events, with foil (batch 4)** | rare drops (1 in 40) | done with the events |
| Ultra-rares | 8 | glow (Fire Opal: fire) | extremely rare | P3 |
| Heroes | 67 | glow (2 fire), preview only | goals across the game | P3 |
| Gods (Greek 22, Norse 16) | 38 | element glow (Zeus hand-made lightning; Hestia, Hephaestus fire) | goals across the late game | P3 |
| The God Peel | 1 | gold halo, rays, prism trail | the final trophy | P3 |
| Feet | 134 | living (Lava, Fireside, Hyperion also fire) | very often: the first kill goals | done (the Immortal: see below) |
| Bosses and mini-bosses | 49 | living (Surtr also fire) | often | done (the Immortal Brute: see below) |
| Shiny feet | 134 | living, foil twinkles | rare | done |
| Zombified feet | 118 | living, rotted, flies | mid-game | done |

Two foot peels and one boss peel aren't living: `foot:immortal`, `shiny:immortal` and `boss:immortalbrute` (no live def for the Immortal's redrawn style). They should get one when that foot is next touched.

## The groups

### Classic (1), Golden Crusts (4) and their mastered versions (5): batch 1, done

The Classic is the peel every player starts with and plays most of their first hours with: it is the cursor in every early run. The Golden Crust set (Marble Slab, Copper Pan, Neon Night, Obsidian) is the first thing players spend crusts on. All five were plain stills: a flat fill, the generic pattern and a white gloss ellipse.

Each is now painted as its material and lives as that material does (details below, under Batch 1). Their mastered versions use the same paint and motion with their gold studs and foil, plus the masterwork glow on the big preview and in play.

### Places (22): batch 2, done

Earned by clearing 10 waves at a location: the Trattoria's comes after a player's first couple of runs, then one per stage, so most players own several early. Today each is a still in its place's colours and a pattern (`PLACE_LOOK`).

Every location now has a redrawn, painted backdrop with frame loops (`src/content/art/scene-*.ts`, played by `src/game/sceneAnim.ts`). A place peel should carry a living miniature of its location's signature motion inside its head (a medallion, like a window into the place) rather than a pattern:

- Trattoria: the wood oven's fire through its mouth; Rooftop: string lights swaying, chimney smoke; Beach: surf rolling in; Diner: the neon sign's stutter; Lodge: the fire and falling snow; Space: a turning planet and stars; Kitchen: steam off the pots; Old Town: the bell tower and pigeons; Pier: water lapping, a gull; Rink: the mirror ball's light; Slopes: snow drifting off the peaks; Cellar: candle flames and dripping; Metro-Pizza: searchlights over the skyline; Doom Lab: bubbling tubes and arcs; Jotunheim: blowing snow; Bifrost: the bridge's light running; Labyrinth: torchlight on the walls; Tartarus: the chains and the blue fire; the Oven: the cosmic fire; the First Pizzeria: the first oven's glow; Goth-Ham: rain and the signal in the clouds; the Hot Gates: embers over the pass.
- Build: reuse each scene's own paint code at the peel's size (the scene's frame-loop painters already take a phase), bake a small loop per place (8–12 frames, about 120 px across) once in idle time, and play it inside the head's mask with the crafted peels' rig (surface repainted, flexed head, its own smack: a gust of the place's weather, a puff of oven smoke).
- One agent per few places, as the location pass did; the Trattoria, Rooftop and Beach first (most seen).

Done in batch 2, all 22 (below).

### Pizzas (113): batch 3, done

Earned by clearing 20 waves with a pizza on the table, so the starter pizzas' peels (Margherita, Pepperoni, Funghi …) come early. Today the head is the pizza's own art on a wooden board (a still); five hot pizzas burn (`FIRE_PEELS`).

- Toppings sizzling and glistening (a moving specular glint on oil and cheese), steam curling off the pie (a painted steam loop, shared by every pizza), the cheese stretching off the board's edge when the peel swings, and on a smack a slice-sized jump: the pie bounces on the board and a few toppings hop.
- One shared rig (pie layer, a cheese-pull mesh along the rim, the steam loop) with per-pizza tints from its toppings data, so 113 peels cost one piece of work; the five fire pizzas keep their fire over it.

Done in batch 3, all 113 (below).

### Events (8): batch 4, done

Earned by dealing with a wave event N times (the balloon, drone and moth peels come early). Today a plain head with the event's picture stamped in a disc.

- Each the event's own motion in the disc: the Tip Balloon bobbing on its string, the drone's rotors blurring, the moth's wings beating, the gull's head turning, the pizza-box chest's lid cracking open, the mimic's tongue, the hero's cape in the wind, Charybdis's whirlpool turning. On a smack, the event's answer (the balloon pops and re-inflates, the chest snaps shut).
- Their shiny versions (8, P3) get the same with foil.

Done in batch 4, all 8 and their shinies (below).

### Acts (10): batch 4, done

Earned by finishing each act. Today a plain head stamped with the act's number in gold. A trophy's idle: the number's gold catching a sweep of light (the crafted peels' sheen), the studs glinting in turn, each act's head in its act's motif (Act 8's frost creeping, Act 9's marble veins, Act 10's cosmic swirl). Cheap, and worth doing with the places, since they share stages.

Done in batch 4, all 10, as a trophy medallion with the act's places, number and boss (below).

### Jewellery box (8), mastered jewels (8), ultra-rares (8): P3

Late and rare. Today the generic glow (only on the big preview for the jewels and masters). Gems want what real stones do: light breaking into colour inside them as the light moves (dispersion flashes moving across the facets, a painted facet map per cut), a slow rotation of the facet highlights, and on a smack a burst of caustic light. The ultra-rares keep their aura with this inside. One shared facet rig, per-stone colours.

### Heroes (67): P3

Earned by hero goals across the game. Today a tight glow in the suit's colours, a ribbon and star glints, shown only on the big preview. Each wants a signature motion of its own: a cape that moves (a sway part, as the foot peels' parts do), an emblem that lights, the hero's power (frost breath, webbing, a shield's ring). The hero heads (`src/art/heroHeads.ts`) are drawn in parts already, so a rig like the foot peels' (parts on springs, a glow layer) fits; group them by power family so motions are shared.

### Gods (38) and the God Peel (1): P3

The most animated group already: each god's element as a glow (Poseidon's droplets, Hades's smoke, Thor's flicks), Zeus's hand-made lightning blade, and the God Peel's halo, rays and prismatic trail. What's missing is the god's own signature motion in the head itself (the symbol carved in gold relief catching light, the runes of the Norse peels lighting in sequence, Odin's eye opening, Mjolnir's sparks crawling the iron). P3 because they're late and already move; worth doing after the places, pizzas and events.

### Feet, bosses, shiny and zombified feet (435): done

Already living at the feet's bar, by `src/art/peelLive.ts`. Batch 1 adds one thing they lacked in the locker: the ▶ (hear its smack) button on the big preview now plays the peel's smack reaction too, so the foot peels splay their toes there as they do in play.

## Batch 1: the Classic and the Golden Crust set (done)

**What changed.** The five peels (and their five mastered versions) are painted as their materials (`src/art/peelCraftArt.ts`, a look's `craft` field, painted through its `custom`), keeping each peel's shape, colours and handle so the thumbnails still read as the same peels, centred on the handle, nothing cut off. They come alive in the locker (tiles and the big preview) and on the cursor peel in play (`src/art/peelCraft.ts`, `src/game/peelCraftPlay.ts`):

| Peel | Painted as | Idle | Smack |
|---|---|---|---|
| Classic | three glued beech planks, flat-sawn grain with a cathedral figure, a scorched front edge, a fine dusting of flour and semolina low on the head, varnish | a broad soft sheen runs over the varnish; in the locker it taps the counter now and then and flour sifts off; in play, swung, it sheds flour off its trailing edge and its head lags the swing | the head flattens and springs back with a wobble; a quick drift of flour (a painted, lit haze) is thrown off past the rim and is gone in about 0.4 s; specks fly |
| Marble Slab | cloudy white stone, soft wide grey veins running through grey clouds, a chamfered polished edge | the window's reflection drifts on the polish; a gold glint runs along a vein; mica twinkles | barely moves (a heavy shake); gold light floods out along the veins from where it landed and holds for most of a second, with a warm flash; solid, lit stone chips are thrown out past the rim and a haze of stone dust rises |
| Copper Pan | spun copper: lathe rings, the radial highlight spun metal throws, a rolled rim, riveted to its handle | the spun highlight swings as the light moves; temper colours breathe in the middle; a glint pops on the rim | rings like a gong: ripples run out across the face, it hums (a fast vibration), sparks, and a ring of sound in play |
| Neon Night | dark glass over a circuit (a chip, traces, pads) lit cyan, in a pink neon tube; the handle a lit tube | data pulses run out along the traces and light the pads; the tubes hum; the pink tube stutters now and then; its light glows on what's behind it | a surge (every tube white-hot, a white flash on the glass), a brown-out flicker, recovery; glowing sparks fly from the pads |
| Obsidian | polished volcanic glass, black as a mirror, smoky violet flow banding with a faint sheen | light moves slowly through the bands (the glass's inner fire); now and then a muted sheen passes along them as the light catches them; the reflection drifts | a fracture of violet light runs through the glass from where it landed and fades (it doesn't break); glossy black slivers with a violet edge fly off the rim, and violet motes |

**How it's built.** As the living foot peels are: a rig per peel (its head's layers cut to the head's box: the material, the rim and outline over it, the head's inside as a mask, the reflection at rest, the material's lit layers, and the handle), built a step at a time in idle time and shared; a `CraftLive` per place it shows. Each frame the head's surface is repainted on a small canvas (its layers and what moves on them, kept inside the head) and drawn flexed about where the head meets the handle; what flies off is a pool of painted, lit sprites. In the locker that's one 2D canvas per tile (only tiles on screen run), drawn at the rig's detail and halved down to near its drawn size before it lands on the tile, so the outline stays smooth on a small tile or the tilted preview (the living foot peels now go through the same path); in play the surface is a texture stamped flexed into the cursor peel's own dynamic texture (so its tint, shine and fades still apply), repainted at about 30 fps (every frame for 0.7 s after a smack), and the sprites live in the play field. Reduced motion calms the flex and thins the particles; animated peels off leaves the stills.

**Performance** (headless Chrome on the dev machine):

- Cursor peel in play, swinging and smacking: the look's tick costs 0.29–0.38 ms a frame on average (p95 0.6–0.9 ms, max 1.2 ms) for any of the five; no frame over 50 ms.
- A surface repaint costs about 0.5 ms and a whole locker tile's frame about 1 ms, measured with a forced GPU read-back (so an upper bound).
- Rigs build in idle time in a few steps (a whole rig takes under 1 ms of script time, even at 3× detail); each still paints in under 3 ms (Neon Night's is the slowest).
- The locker, CRUSTS tab (10 living crafted tiles): scrolling it top to bottom and back, frame p95 19 ms, max 21 ms, no long tasks. The ALL tab once warm (50-odd living tiles): p95 20–21 ms, max 50 ms. The first two or three passes after a fresh page load have hitches (max 75–230 ms) while thumbnails and the foot peels' rigs are built; that is the same with the smooth drawing path switched off (measured side by side), so it is the locker's existing warm-up, not this batch.

**Review fixes.** One independent visual review; everything it raised was fixed: the locker preview's outline was stair-stepped (drawn straight down from 2× detail to a tenth of it: now halved down step by step); the Classic's flour read as mould and its smack as cotton balls (now a fine dusting low on the head and a quick, thin drift that leaves past the rim), its cathedral figure was an even ladder lit by the sheen (now unevenly spaced, V-tipped and tapering, left unlit, the sheen one broad band) and its scorch barely showed (stronger); Marble's chips were hollow and its dust lumpy (solid lit stone thrown past the rim, a soft haze), its veins read as cracks (wider, softer, cloudy, few branches, and drawn as one filled outline so they don't bead) and its gold flood was too faint at play size (brighter and longer); Neon's ring read as a force field (gone: a white flash on the glass) and its sparks were hairlines (glowing, bigger); Obsidian's shards were grey squares (glossy black slivers with a violet edge) and its sheen flashed like neon strips (muted, kept inside the bands); the mastered peels' foil went khaki on wood (a lighter overlay with a screened shine) and their studs sat on the rim of the narrow oval and paddle heads (now set in from each head's own edge); Copper's highlight swing and Neon's pulses were too small to see (wider, bigger). The reviewer's "no peel mid-swing" was the screenshot's crop (the swing carried it out of frame), not the game. Still to come, as the audit says: the Golden Crusts' neighbours in the locker (the jewellery box, the masterworks of the jewels) now look flat beside them.

**Where it stopped.** The whole P1 group is done: the Classic, the four Golden Crusts and the five mastered versions. Next, in order: the place peels (P2, by most seen: Trattoria, Rooftop, Beach first), then the pizza peels' shared rig, the event peels, the act peels; then the P3 families (gems, heroes, gods).

## Batch 2: the place peels (done)

**What changed.** Every place peel (all 22) keeps its shape, colours, pattern, studs and handle, and now has a window set into its head onto its location: a bezel in the place's own metal, wood or stone, lit from the top left and throwing a soft shadow on the head, the head's edge shadowing into the recessed glass, a faint reflection on it. Through it, a corner of the location's redrawn backdrop, painted by the scene's own layers at the window's size, with the place's hero motion playing over it from the scene's own frame painters (exported from the scene files, nothing repainted), and a reaction when a smack lands:

| Place | In the window | Smack |
|---|---|---|
| Trattoria Nonna | the wood oven's mouth, its fire rolling across the vault, smoke curling up the dome | the fire flares, embers kicked out of the mouth |
| Rooftop Slice | the chimney stack, its smoke billowing and leaning on the breeze, the festoon bulbs over the skyline | a burst of smoke out of the pots, sparks, the bulbs jolt |
| Shack Attack Beach Bar | the surf rolling up the sand under the sun, glitter on the sea, the sandcastle's flag | a surge up the beach, the foam flashes, spray |
| Neon Diner '86 | the jukebox: its bubbling arch tubes and pilasters, the record spinning, the colour wheel | the needle skips (the record jerks back), the tubes surge, glints |
| Alpine Lodge | the hearth fire licking up behind the andirons | it flares, embers up the chimney |
| Orbital Pizzeria | the porthole: the moon, the planet's limb, stars scintillating, a satellite tumbling past, a meteor now and then | a meteor shower |
| Nonna's Kitchen | the pot of sauce rolling and bubbling on its blue gas ring, steam into the hood | it boils up, steam bursts, sauce spits |
| Old Town Rooftops | the campanile at dusk, the washing flapping on its line | lightning forks behind the tower, the sky flashes, a gust takes the washing, rain |
| The Pier | the gull on its post over the rail, breathing, tilting its head, now and then calling | it squawks, spray over the rail, a feather |
| Roller Rink | the mirror ball turning on its chain, flecks of light wheeling round the walls | it swings, the flecks flare, glints |
| Ski Slopes | the Summit's horn, spindrift streaming off its top | a slough of powder down the face, snow off the peel |
| Haunted Cellar | the arch behind its gate, a candle on the wine rack; now and then a ghost drifts up in the arch | a ghost shrieks out of the arch, the candle gutters |
| Metropizza Rooftops | the tower's crown, its pizza globe turning, the needle's light blinking | the globe spins, the floodlights flash, confetti |
| The Doom Lab | the green vat, its liquid churning round the clone foot on its cable, bubbles | it boils, the foot swings, green sparks off the coil |
| Jotunheim Ice Fields | the giant's sword in the ice under the aurora, snow blowing low | the aurora flares, snow thrown off the ice |
| Bifröst Bridge | the bridge springing out over the world-sea, light running out along it, glints | a bright pulse races along it |
| The Labyrinth | the near brazier and a far one down the corridor | the fire roars, embers |
| Tartarus | a soul-fire burning blue by the Styx | it roars, blue sparks rise |
| The Oven Between Worlds | the cosmic vortex turning in the broken arch | it pulses, violet sparks fly |
| The First Pizzeria | the first oven's fire breathing in its mouth | it flares, embers |
| Goth-Ham Rooftops | the clock tower and the slice signal on the storm clouds, rain driving through | lightning forks behind the spires, the sky flashes, rain |
| The Hot Gates | the sea at the foot of the pass, surf breaking on the rocks | a big wave crashes in, spray |

**How it's built.** On the crafted peels' system (batch 1), as a new kind, `place` (`src/art/peelCraft.ts`): the rig's layers are the head round the window and the bezel over it (`placeUnder`, `placeOver`), and the window's mini (`src/art/peelPlace.ts`). A place's window base is painted once by `paintCropSteps` (`src/art/scene/layers.ts`): only the scene layers that reach the window, clipped to it, at twice the window's size, a layer per idle step, with any layers that stand in front of the motion painted on their own (`front`, `frontFrom`); never a whole backdrop. The base, the front and the window at rest are saved to the art cache, so the next visit only decodes them, and a thumbnail is one draw. The rig then draws the base down to its size and paints each loop's frames (8–16 per loop, at the window's size) a step at a time in idle time. Each frame the window is composed (the base, the loops cross-faded, the place's own touches: glows, rain, spindrift, flecks, bubbles, lightning) and drawn into the head's surface, which flexes about the neck as the crafted heads do; what flies off (embers, spray, sauce, feathers, flakes, glints, confetti, sparks in the place's colours) is the crafted peels' sprite pool, with new glowing sprites that read over a bright window and on cream. In play the window plays on the cursor peel the same way. A run warms its location's window a few waves before its peel unlocks, so the unlock's toast is a quick draw. Settings → Graphics "animated peels" off leaves the stills; reduced motion calms the swings and slows the loops.

**Performance** (headless Chrome on the dev machine):

- Cursor peel in play (Trattoria, swinging and smacking): the look's tick costs 0.37–0.38 ms a frame on average (p50 0.3, p95 0.8–0.9, max 1.1–1.2 ms); frame p95 18.7 ms, no frame over 50 ms.
- Painting a place's window base cold (no art cache): 14–80 ms in all, in 6–54 idle steps, the longest step 37 ms (the Labyrinth; most under 25 ms). Once cached, a rig's loop frames cost 0–5 ms in all (the Beach's surf 41 ms over 14 steps).
- The locker, PLACES tab (22 living windows): scrolling it top to bottom and back, frame p95 19–20 ms, max 20 ms, no long tasks.
- The locker, ALL tab, fresh page load, three passes, side by side with the place windows switched off in the same build: first pass max 173–220 ms with them against 229 ms without, second 145–193 against 88, third 55–73 against 55; the same warm-up as before. A profile of the first pass puts it in the foot peels' first-time art work, not the places: Phaser registering foot textures (getImageData, ~0.6 s across the pass), cropping each foot's art for its emblem (~0.6 s) and trimming the living feet's layers (~0.25 s). Spreading those is the next cheap win for the first open (each foot's crop could be kept in the art cache with its thumbnail); serving cached thumbnails straight from their stored PNGs (no decode and re-encode) was tried and made no measurable difference, so it was left out.

**Review fixes.** One independent visual review; everything it raised was fixed: spray, sauce, embers and sparks drawn as streaks read as scribbles, wire or chain links (they are now round, lit drops and filled glowing motes, short-lived, and the big splashes are foam and droplets inside the window); rain, snow and most sparks flew loose past the head (now drawn inside the window, which clips them; only embers, smoke, a few drops, feathers, motes and confetti leave it, and fade within a short way); the Doom Lab's coil sparks crossed the bezel (now inside); the oven's burst read as an asterisk (a soft ring of light from the eye); embers in the lodge and labyrinth started inside the flames (now above them); the head's flat gloss lay over the window as a hard-edged oval (gone over the window; the glass has its own soft sheen and a fine lit edge); the Hot Gates now shows the shield wall at the sea's edge with embers rising, Goth-Ham more skyline with the clock inside and the signal drawn live, Bifröst a tighter crop with its bands lifted, the Rooftop and the Pier tighter crops, the First Pizzeria its dome under the stars (so it is no longer the trattoria's darker twin); idle motion added where it was faint (glints and a swell on the pier's sea, bigger flecks in the rink, stars and a gustier wash in Old Town, meteors every few seconds and a shorter satellite pass in space); every window flashes as a smack lands (stronger on the places whose reaction was faint: Bifröst, Metropizza, Jotunheim, space), so the smack reads at the cursor's size; the lightning's frame is faded at its edges (it showed as a pale box).

**Where it stopped.** All 22 places are done. Up next, in order: the pizza peels' shared rig (P2: the pie on its board, steam, glistening toppings, a bounce on a smack), the event peels and the act peels (P2), then the P3 families (gems, heroes, gods). The foot peels' first-open warm-up above is worth a look alongside.

## Batch 3: the pizza peels (done)

**What changed.** All 113 pizza peels have a living pie, built from the pizza's own art (`src/art/pizzaArt.ts`, the drawing the table's pizzas use: nothing repainted per pizza). `pizzaTopSteps` paints a pizza's top in layers, the crust and sauce, the cheese and the toppings, through a hook that sees every topping piece as it's drawn, so the pizza's randomness and the table's top are unchanged. A few pieces of the last kinds drawn that are big enough to read (up to five, spread out) are lifted onto a layer of their own so they can hop. A light map comes from the layers: the cheese's highlights, the shine and oil on the toppings (more on the fatty ones), wet sauce, and a little on the crust's puffed rim. Points where the cheese (or, on a pie without cheese, the sauce) can bubble come from the same pass. Round pies and deep dish now sit on a board of the Classic's beech, turned round, with its edge chamfered and lit from the top left, not scorched, and a soft shadow under it. Every pie throws a soft contact shadow on its board (square pies and calzones on whatever is behind them). The hilt is lit along its top.

Every pizza, idle: the light pools on the pie and drifts, and the cheese and the oil on the toppings glisten under it; every few seconds the light sweeps across it. The cheese blisters: bubbles swell, lit on their top left with a glint, then pop into a spreading ring and a browned spot. A pie without cheese bubbles its sauce, or its chocolate. Fat sizzles on the cured meats as tiny bright pops. Steam wisps curl up off the pie's upper half. These come from a painted, curling steam loop that every pizza shares. In play the pie slides on its board as the peel is swung, then springs back. A smack bounces it on the board: the pie lifts, so it grows and its shadow spreads and drops away, then lands with two small rebounds. The lifted toppings hop, each to its own height and at its own moment, with a shadow where they sat. On a cheesy pie, cheese stretches after them in two strands that snap. Crumbs of crust fly off the rim and a breath of steam rises.

What a pizza's family adds comes from its data (`PizzaTraits`), not a recipe per pizza:

| Family | Which (from the data) | Idle | Smack |
|---|---|---|---|
| Spicy | chili, jalapeño, hot sauce, nduja and other hot toppings, or a burning perk; the five fire pizzas at full heat | the pie shimmers: it is drawn in bands, each nudged by a wave running up it. A warm glow breathes over it and the crust glows hot round its edge | the shimmer and the glow surge; embers rise |
| Cold | a chilling or freezing perk (Frutti di Mare, Smoked Salmon, Ragnarök) | the crust is rimed with frost crystals in a pale blue haze, and feathers of frost creep in over the cheese and back again. A cold mist spills off its lower edge instead of steam. Frost glints | mist bursts, flakes fly |
| Sweet | a chocolate base (chocolate), a honey drizzle (honey), sweet toppings on a pie without cheese (strawberry) | two drips of syrup run from the pie's lower edge down the board, either side of the hilt. Each swells a bead and lets a drop fall | syrup drops fly; sprinkles and candy throw confetti |
| Gold | gold leaf, pearls, a gold rim, a crown, a halo | glints twinkle on the gold | glints burst off it |
| Rare Finds | a `finish` | the table's coloured glow breathes under the peel, sparkles in its colour twinkle on the pie, and Pizza Fantasma breathes see-through | motes in its colour |
| Calzones | the shape | steam rises from the vents, and sauce bubbles in them | it puffs; steam jets from the vents, sauce spits |
| Deep dish, squares | the shape | (as every pizza) | they land heavier |

The five fire pizzas (Diavola, Tarte Flambée, Inferno Calzone, Volcano Calzone, Dragon Fruit Flambé) keep their own fire (`src/art/lookFire.ts`) over all of it.

**How it's built.** A new crafted kind, `pizza`, on the batch-1 system (`src/art/peelCraft.ts`):

- **The rig** (`PizzaMini`) holds the pie (with the lifted pieces out), its light map at half the rig's detail, its contact shadow, the lifted pieces, the bubbling, oily and gold points, and, on cold pies, the frost. The board and the handle are painted once per detail and shared by every pizza.
- **Painting a pizza's layers** (`paintSteps`) takes about 15 ms in all, spread over 7 idle steps. The longest step is about 9 ms: drawing the toppings, or half the light map. The layers are read back from canvases kept in memory, not on the GPU, because reading a GPU canvas stalled whole frames. Pizzas are painted one at a time from a single queue, skipping any that have scrolled away, and the result is saved to the art cache (`pzpeel:` entries), so the next visit decodes it off the main thread.
- **Each frame** the pie and what moves on it are drawn straight into the head's surface, with no mask pass. The surface flexes as the crafted heads do; what flies off (crumbs, specks, steam wisps, mist, flakes, embers, syrup drops, confetti, glints, motes) uses the crafted peels' sprite pool, which gains crumbs, a steam wisp, mist and three syrup drops.
- **The still** (thumbnails, the toast, animated peels off) is the same board, shadow, frost, drips and hilt over the table's own top, so a tile shows no jump when its living pie takes over.
- **Reduced motion** halves the bounce and the hops, calms the slide and the steam and switches the shimmer off.

**Performance** (headless Chrome on the dev machine):

- **Cursor peel in play**, swinging and smacking: the look's tick costs 0.39 ms a frame on average for Pepperoni and Smoked Salmon, 0.47 ms for Choco-Berry (p95 1.0–1.1 ms, max 1.3 ms). Frame p95 is 19 ms, with no frame over 50 ms.
- **Locker, PIZZAS tab, cold art cache**, scrolled top to bottom and back:

  | Pass | Frame p95 | Max |
  |---|---|---|
  | First | 19.7 ms | 29.7 ms |
  | Second | 19.8 ms | 21.5 ms |
  | Third | 20.3 ms | 20.8 ms |

  No frame was over 50 ms, and all 113 pies were alive by the end of the first pass. With the living pizzas switched off on the same build: p95 17.6–17.9 ms, max 43.8 ms on the first pass.
- **Before the one-at-a-time queue**, painting dozens of pizzas side by side in their own idle chains gave the first pass six frames over 50 ms (max 120 ms). Reading GPU canvases cost about 1.1 s across the pass. Both are fixed above.
- **Locker, ALL tab**, fresh page load, three passes:

  | Pass | Max frame with the living pizzas | Max frame without |
  |---|---|---|
  | First | 233 ms | 285 ms |
  | Second | 135 ms | 170 ms |
  | Third | 55 ms | 57 ms |

  This is the same first-open warm-up batch 2 profiled to the foot peels.
- **`F.contrast()` and `F.layout()`** report nothing on the PIZZAS tab, at desktop and at phone size.

**Review fixes.** One independent visual review. What it raised and what changed:

- **The smack's steam** read as a grey haze hanging beside the cursor in play. It is now a few short, white wisps close over the pie, gone in under half a second; a calzone's are thin and short, rising off its vents.
- **Smoked Salmon** washed out to a pale disc. Its frost is now a narrower, bluer rime with fewer, shorter feathers.
- **Chocolate pies** sank into the wood. The board is now lighter, unscorched beech, and chocolate is glossier under the light.
- **Drops** fell far past the handle as stray specks. They now fade within a short fall, and the drips start clear of the hilt.
- **The heat on spicy pies** didn't show. The shimmer is twice as strong, the glow over the pie is warmer, and the crust glows hot round its edge.
- **Pizza Fantasma** barely let the board through. It now breathes further, down to 70 %.
- **Crumbs** lingered like dirt. They now go within about half a second.
- **The board** read as a frying pan. Its chamfer is wider and lighter.
- **Not changed:** the reviewer found the Diavola's fire too spiky and red at tile size. That is the fire look from before this pass (`src/art/lookFire.ts`, shared by the five fire pizzas and others), and it was left then; batch 4 makes the fire lower, fuller and all round the head on a tile (below).

**Note for players' caches.** `src/art/pizzaArt.ts` changed (the layered painting), so the art cache's version moves and every foot and pizza is drawn again once on the next visit, as after any art change.

**Where it stopped.** All 113 pizza peels are done. Up next, in order:

1. The event peels (P2: each event's own motion in its disc, its answer on a smack).
2. The act peels (P2: the number's gold catching a sweep of light, studs glinting in turn, each act's motif).
3. The P3 families: gems, then heroes, then gods.

The foot peels' first-open warm-up (batch 2) and the fire looks' tile-size read (above) are worth a look alongside.

## Batch 4: the event and act peels (done)

**What changed.** The 8 event peels (and their 8 shinies) and the 10 act peels keep their shape, colours, pattern, studs and handle, and get a medallion set into the head: a round window recessed behind a bezel and a glass, lit from the top left, throwing a soft shadow on the head round it. Two new crafted kinds, `event` and `act` (`src/art/peelMedal.ts`; the events' scenes in `src/art/peelEventDefs.ts`).

Event peels: the wave event in miniature, doing what it does on the table, and its answer to a smack. Each scene is painted once per rig detail in parts (a background, a body, wings, a lid …), lit from the top left, and drawn each frame from those parts, moved, turned and squashed, with strings, cables and trails drawn live:

| Event | Bezel | Idle | Smack |
|---|---|---|---|
| Tip Balloon | silver | it bobs and sways on its string in a summer sky, clouds drifting behind; its coin glints | it pops (a red puff, a ring of light, shreds of rubber and a spray of tip coins thrown off the peel), the string drops away, and a new one blows up from the knot |
| Delivery Drone | gunmetal | it hovers over hazy rooftops (a water tower on one), rotors a blur, its parcel swinging on two cables as a pendulum pushed by its drift; its light blinks cyan; its shadow on the roofs | it lurches (tilt and dip on springs), the parcel swings wide, the light goes red, the rotors race, cyan sparks and a puff of smoke from a motor |
| Pepper Moth | brass | it flutters round a hanging lamp at dusk, wings beating (folding in as they rise), shedding flakes of pepper; the lamp's glow flickers | swatted: it tumbles away spinning, wings frantic, in a cloud of pepper (flakes inside the medallion and off the peel), and flutters back; the lamp swings on its cord |
| Golden Seagull | gold | it wheels over a glittering sea, three wingbeats then a glide with its wings held up, a wedge of golden crust in its beak that glints; its shadow on the water | it squawks and jolts up, wings flared then beating fast, feathers fly, the crust flashes gold |
| Pizza Box Chest | bronze | it sits on the table in a pool of lamplight; every couple of seconds its lid lifts a crack and gold light leaks out with rising sparkles, then drops shut with a bump and a puff of dust | it bursts open: gold to the brim, rays of light fanning up, tip coins, confetti and sparkles; then the lid drops shut, the box squashing as it lands |
| Mimic | dark bronze | a box in a gloomy purple room that wobbles in bursts (the tell); its lid creaks open on two glowing eyes and its tongue licks the rim | it chomps: the lid flips wide on uneven shaded teeth, the tongue lolls, a red glow from inside, then it snaps shut hard (a squash and a shake), cardboard bits and drool flying |
| Hero Sighting | gold | a hero streaks across the night sky past a gold star, a trail of light and sparkles behind; the star turns and breathes; stars twinkle over a skyline | caught: the star flares and spins, glints and gold motes burst off it, the hero zooms straight through again |
| Charybdis | verdigris | the whirlpool turns (its outer arms slow, its inner arms fast), foam flecks spiral in faster as they near the middle, the toothed maw breathes, a plank is dragged round and down now and then | the maw clamps shut and opens again, the water spins faster, spray flies off the rim, a ring of foam |

The shinies are the same with the foil, and foil twinkles round the band.

Act peels: a trophy. A gold bezel, milled like a coin's edge. Through it the act's two places play: their place peels' own living windows (the scene's layers and loops, shared with the place peels), the middle of each, turning from one to the other every 7 s. In front, the act's number struck in gold (a relief: a soft shadow on the place, ink, a gold ramp, a bevel, a band of light). Now and then a sweep of light runs over the number and a glint pops on its shoulder; the studs glint one at a time round the band. Act 3's still shows its second place (space: Out of This World); the rest show their first. A smack brings the act's boss (the boss of its second stage) stomping down: its foot (cut from its peel art) drops onto the medallion, squashes as it lands and lifts away, behind the number, which stays in front, squashed flat under the sole and springing back. The place reacts as its own peel does (the oven's fire flares, the surf surges …), the medallion shakes and flashes, dust puffs out from under the sole, glints fly off the number and the studs light from the middle out. In play, a smack while a stomp is still going only rings the number, so fast clicking doesn't keep the place under a foot.

**How it's built.** On the crafted peels' system (batch 1), as kinds `event` and `act` (`src/art/peelCraft.ts`): the rig's layers are the head round the medallion and the bezel and glass over it (`medalUnder`, `medalOver`), and the medallion's mini (`MedalMini`). The medallion works in disc units (a 120 × 120 square) scaled to its size, which is as big as each head shape allows and, with studs, kept clear of them. An event's parts are vector-painted in a few idle steps (cheap: no art cache needed). An act's mini is its two places' minis (`placeMiniSteps`, their bases from the art cache or painted a layer per idle moment, as the place peels do) and its number, painted once. Its boss's foot is fetched only where a smack can land (in play, and on the locker's big preview for its ▶), in the background, and cut and drawn down in an idle moment, shared by every rig; a tile never asks for it. Each frame the medallion draws itself into the head's surface, clipped to its glass, with its own small pool of particles inside it (pepper, foam, sparkles, dust); what flies off is the crafted peels' sprite pool, which gains tip coins, balloon shreds, pepper and gold motes. The surface flexes about the neck as the crafted heads do. The still (thumbnails, the toast, animated peels off) is the same medallion at rest: the event posed, or the act's first place's window at rest with the number over it. Reduced motion calms the flex, the shakes and the throws.

**The fire looks on tiles** (`src/art/lookFire.ts`). Drawn small (a locker tile, where the pen's line boost goes over 1.45) the fire is lower and fuller and burns all the way round the head: tongues wider, the inner rings taller so the orange and yellow show, the outer ring's outline fine and faint (boosted to tile size, a thick dark edge round every tongue made a crown of spikes), no loose licks (specks at that size), the horns shorter. The big preview and play are unchanged.

**Performance** (headless Chrome; the machine was busy during this batch, load average 5–7 with a background scan and a streaming app running, so the locker figures are noisier than earlier batches'):

- **Cursor peel in play**, swinging and smacking: the look's tick costs 0.30–0.35 ms a frame on average for the event peels (balloon, chest, mimic, sighting; p95 0.6–0.9, max 1.0–1.5 ms) and 0.41–0.42 ms for the act peels (Acts 1 and 8, with the stomp; p95 0.9–1.0, max 1.2–1.5 ms). Frame p95 18.1–19.4 ms, no frame over 50 ms.
- **Locker, EVENTS tab** (all 8 alive), 6 s from opening the tab: cold art cache p95 18.6 ms, max 28 ms; warm p95 17.3 ms, max 18 ms. No long tasks.
- **Locker, ACTS tab** (all 10 alive): cold art cache p95 17.2 ms, max 35 ms, no long tasks; warm p95 19.2–19.6 ms, max 31–34 ms. Before the boss's foot was left to where it can stomp, cutting all ten bosses' feet as the tab opened was a 200 ms task (and drawing them cold more).
- **Locker, ALL tab**, fresh page load, three passes, side by side with the event and act medallions switched off in the same build: third pass p95 33–37 ms (max 56–94) with them against 24–33 ms (max 59–134) without; the first two passes are the locker's existing warm-up (p95 50–120 ms in both). Within the noise of a busy machine; worth timing again on a quiet one.
- **`F.contrast()` and `F.layout()`** report nothing on the EVENTS and ACTS tabs, at desktop and at phone size (844 × 390).

**Review fixes.** One independent visual review. What it raised and what changed:

- **The Chest and the Mimic looked alike and their idles didn't show** in a 3 s sheet. Their idle beats now come every 1.4–2.6 s (the first within the first gap); the chest's lid lifts further (16°) with its gold light; the mimic's room is a gloomy purple, its still shows its eyes and the tip of its tongue, it wobbles more often.
- **The Mimic's teeth read as bunting.** Fewer, bigger, uneven teeth, shaded; the chomp holds open longer with a stronger red glow from inside.
- **The act smack hid the number.** The boss's foot now lands behind the number, which squashes flat under the sole and springs back; the stomp is shorter (it lands at once, holds 0.2 s, lifts away by 0.66 s).
- **The balloon's pop didn't read at cursor size.** A red puff and a brighter, thicker ring of light, bigger shreds and coins, the string drops away faster and the new balloon starts blowing up sooner (0.4 s).
- **The gull's crust read as a trumpet, its smack was weak, the gull flat.** A wedge of golden crust with a browned rim and pits, the belly shaded and the back lit, more feathers and a bigger gold flash on the smack.
- **The Hero Sighting was an empty sky most of the time.** The hero passes every 1.6 s on a shorter track, so it is in the window most of the time.
- **The Diavola's fire was still a red crown.** It now burns all round the head on a tile, with no stray licks.
- **The moth's garden** read as blobs: now a dark band fading up into the dusk.
- **Shinies** were only recoloured: foil twinkles round the band now.
- **Not changed:** the hero is the game's own sighting badge art (`flyer` in `src/content/props/heroes.ts`), kept so the peel matches the event; the drone's cyan circuit lines are the head's own pattern from before this pass; the act windows' darker places (Acts 6, 9, 10) are their place peels' own windows, and the gold number reads over them.

**Where it stopped.** All 8 event peels, their 8 shinies and all 10 act peels are done. Up next, in order:

1. The P3 families: the gems (the jewellery box, their masterworks and the ultra-rares: one shared facet rig, per-stone colours), then the heroes (cape, emblem, power, on the hero heads' parts), then the gods (each god's signature motion in the head).
2. Alongside: the foot peels' first-open warm-up on the ALL tab (batch 2), and the Immortal's and Immortal Brute's living defs. The fire looks' big-preview and in-play shapes are unchanged by the tile fix and could get the same look at the bar when the fire peels are next touched.
