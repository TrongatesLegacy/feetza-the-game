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
- **gem** (new in batch 5, a crafted kind): the head is the stone or metal the peel is named for, in a polished setting, its facets catching a moving light (`src/art/peelGem.ts`).
- **hero** (new in batch 6, a crafted kind): no frame; the head is the hero, alive from its costume's own parts (cape, ears, eyes, emblem) with its power playing on and round it (`src/art/peelHero.ts`).
- **god** (new in batch 7, a crafted kind): no frame; the head is the god's symbol (or helm, or the God Peel's sun), alive from its own parts (wings, strings, a hammer, a train of feathers, a crest, a cloak, a sail), its gold or runes catching the light and its domain round it (`src/art/peelGod.ts`).

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
| Jewellery box | 8 | glow (Ruby: fire), preview only → **cut stone, metal or pearl, alive (batch 5)**; Ruby keeps its fire | bought late (800–5,000 crusts) | **P3, done** |
| Mastered (of the jewels) | 8 | glow → **as their jewels, gold-set (batch 5)** | late | done with their bases |
| Event shinies | 8 | still → **as their events, with foil (batch 4)** | rare drops (1 in 40) | done with the events |
| Ultra-rares | 8 | glow (Fire Opal: fire) → **their stone or metal alive inside their aura (batch 5)**; Fire Opal keeps its fire | extremely rare | **P3, done** |
| Heroes | 67 | glow (2 fire), preview only → **the hero alive from its own parts, its power round the head (batch 6)**; the two fire heroes keep their fire | goals across the game | **P3, done** |
| Gods (Greek 22, Norse 16) | 38 | element glow (Zeus hand-made lightning; Hestia, Hephaestus fire) → **the symbol alive from its own parts, its domain round it (batch 7)**; both Zeuses keep their living blade, Hestia and Hephaestus their fire | goals across the late game | **P3, done** |
| The God Peel | 1 | gold halo, rays, prism trail → **its halo, sunburst, rays and crown of tiny peels alive, a ring of light, a prism sweep (batch 7)**, inside its halo, rays and prism trail | the final trophy | **P3, done** |
| Feet | 134 | living (Lava, Fireside, Hyperion also fire) | very often: the first kill goals | done (the Immortal in batch 8) |
| Bosses and mini-bosses | 49 | living (Surtr also fire) | often | done (the Immortal Brute in batch 8) |
| Shiny feet | 134 | living, foil twinkles | rare | done |
| Zombified feet | 118 | living, rotted, flies | mid-game | done |

Two foot peels and one boss peel weren't living: `foot:immortal`, `shiny:immortal` and `boss:immortalbrute` (no live def for the Immortals' own art). Batch 8 gave them peel-only defs.

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

### Jewellery box (8), mastered jewels (8), ultra-rares (8): batch 5, done

Late and rare. They had the generic glow (only on the big preview for the jewels and masters) over a flat head with a rainbow foil. Gems want what real stones do: light breaking into colour inside them as the light moves (dispersion flashes moving across the facets, a painted facet map per cut), a slow rotation of the facet highlights, and on a smack a burst of caustic light. The ultra-rares keep their aura with this inside. One shared facet rig, per-stone colours.

Done in batch 5, all 24 (below).

### Heroes (67): batch 6, done

Earned by hero goals across the game. Today a tight glow in the suit's colours, a ribbon and star glints, shown only on the big preview. Each wants a signature motion of its own: a cape that moves (a sway part, as the foot peels' parts do), an emblem that lights, the hero's power (frost breath, webbing, a shield's ring). The hero heads (`src/art/heroHeads.ts`) are drawn in parts already, so a rig like the foot peels' (parts on springs, a glow layer) fits; group them by power family so motions are shared.

### Gods (38) and the God Peel (1): batch 7, done

The most animated group already: each god's element as a glow (Poseidon's droplets, Hades's smoke, Thor's flicks), Zeus's hand-made lightning blade, and the God Peel's halo, rays and prismatic trail. What's missing is the god's own signature motion in the head itself (the symbol carved in gold relief catching light, the runes of the Norse peels lighting in sequence, Odin's eye opening, Mjolnir's sparks crawling the iron). P3 because they're late and already move; worth doing after the places, pizzas and events.

Done in batch 7 (below).

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

1. The P3 families: the gems (the jewellery box, their masterworks and the ultra-rares: one shared facet rig, per-stone colours; done in batch 5), then the heroes (cape, emblem, power, on the hero heads' parts), then the gods (each god's signature motion in the head).
2. Alongside: the foot peels' first-open warm-up on the ALL tab (batch 2), and the Immortal's and Immortal Brute's living defs. The fire looks' big-preview and in-play shapes are unchanged by the tile fix and could get the same look at the bar when the fire peels are next touched.

## Batch 5: the gems (done)

**What changed.** The 8 jewellery-box peels, their 8 mastered versions and the 8 ultra-rare jewels are now a new crafted kind, `gem` (`src/art/peelGem.ts`). Each keeps its shape, colours and studs, but the head is now the material the peel is named for, set in a polished metal band. It no longer has the flat head with rainbow foil. Lighting comes from the top left. The band's outer edge is domed and its inner bevel slopes down to the stone, so the bevel is lit on its bottom right, and the band shades the stone's top-left edge. The studs are set as tiny brilliants, metal beads or seed pearls.

Cut stones have real facet geometry fitted to the head's outline:

- a brilliant: a table, 8 stars, 8 kites and 16 upper girdles, with the pavilion's dark arrows showing through the table;
- an emerald's step cut: three bands of steps, the steps reflected in the table, and diagonals at the corners.

Each facet is lit as a tilted mirror by a light that wanders round the top left. A second, softer light sits low on the right, and every few seconds the stone catches the light as it swings across and back. In play, swinging the peel turns the light. As the light moves, facets flash in turn, with the flash rolling across the facet. Light breaks inside the stone (scintillation, in the stone's own colour), and facets turned away from the light go dark. Glints pop at the corner of whichever facet flashes brightest, and the studs glint in turn round the band.

A smack sends a ring of light out through the facets, from the middle to the girdle, with a flash off the middle. The metal chimes (a quick hum), the studs light from the top outwards, and glints and motes in the stone's colour are thrown off.

| Peel | Made of | Its own life |
|---|---|---|
| Sterling Silver, Solid Gold | bright-cut plate, an engine-turned (guilloché) centre | facets swap light and dark as the light moves; a two-lobed highlight turns in the guilloché |
| Ruby Crown | a brilliant ruby, gold-set | a red glow (it fluoresces), stronger where the light falls and on a smack; keeps its fire look |
| Sapphire Tide | an oval brilliant sapphire, platinum-set | silk: fine needles in three directions, each set glinting as the light lines up with it, and a soft six-rayed star where the light sits |
| Emerald Isle | an emerald-cut emerald, gold-set | its jardin (feathery inclusions); steps alternate light and dark, a hall of mirrors |
| Amethyst Dream | a brilliant amethyst, silver-set | colour zoning; it flushes warmer and cooler as the light changes |
| Pearl Diver | nacre in a silver band, seed-pearl studs | pink and green orient sliding round the highlight; warm reflected light under it; a smack sends a soft iridescent sheen across it |
| Chef’s Diamond | a pear brilliant, platinum-set | fire: soft flashes of spectral colour inside the facets; strong light and dark contrast |
| Rose Gold | bright-cut rose gold, a pink diamond in six claws | as the plates, and the pink stone's fire |
| Platinum Prop | brushed platinum, a circuit cut into it, an asscher-cut diamond at its heart | light pulses run out along the traces to pavé diamonds that flash; a highlight lies across the brushing |
| Fire Opal | an opal dome | play of colour: three sets of flakes, each flashing as the light comes round, with pinfire winking; keeps its fire look |
| Golden Feather | a gold plate with a feather in relief | a sheen runs up the barbs; a smack throws golden feathers |
| Prismatic | a clear brilliant | the strongest fire; rainbows sweep through it; a rainbow glow behind that turns with the light |
| Black Diamond | an opaque black brilliant in black rhodium | adamantine flashes, white with a violet edge |
| Crown Jewel | a cushion-cut red stone in four claws, on purple velvet ringed with diamonds | the velvet's pile catches the light; the ring stones twinkle |
| Cosmic Crust | a galaxy under a polished dome | nebulae drift, the galaxy turns, stars twinkle; a smack is a supernova (a flare, rays, a ring, stars streaking out) |

**Mastered versions** are the same stones, gold-set, with milgrain along the band, gold studs (beads), and the masterwork glow on the big preview and in play.

**The ultra-rares** do more:

- Every few seconds, a slow bloom of light runs out through the whole head.
- Now and then, a glint or mote drifts off the rim.
- They keep their aura (`ultraStyle`), so they still read as the rarest things in the locker.

**The family glows** (`src/art/lookGlow.ts`) stay for their aura and trail, at 70 % strength round a head that now shines on its own. Two parts of them are gone, because the gem now does both itself:

- the generic glints scattered over the head;
- the generic smack ring, which read as a halo round the peel in play (`noRing`).

The Ruby Crown and the Fire Opal keep their fire looks.

**How it's built.** The rig is built like batch 1's: one per peel per detail, built in idle time and shared.

- **Painted once:** the head's static layers. Under the moving parts: the stone, plate, pearl, opal, space or velvet at rest. Over them: the band, a centre stone's collet and claws, the studs and the outline.
- **Painted once per detail:** the layers that move (the sapphire's silk, the opal's flakes, the cosmic nebulae and galaxy, the feather's lit barbs).
- **Drawn each frame:** only what moves, inside the band, between those layers. That is the vector facets (about 33 polygons, filled only where lit), a few gradients and a few layer draws.
- **Geometry:** the outline is the head's own, set in by the band, with the neck bridged. It is cached per shape.
- **The still** is the same stone at rest, with one glint on its brightest facet.
- **Sprites:** the crafted sprite pool gains rainbow fire motes, ruby and white motes, and golden feathers.
- **Look lab:** gets a Gems family.

**Performance** (headless Chrome; the machine's load average was 5–13 with other apps running):

- **Cursor peel in play**, swinging and smacking: the look's tick costs 0.30–0.42 ms a frame on average (p95 0.6–0.8 ms, max 1.0–2.3 ms) for Chef’s Diamond, Prismatic, Crown Jewel, Pearl Diver and Cosmic Crust. Frame p95 is 18 ms. The second runs had no frame over 50 ms; the first run had a few at the start, under heavy load.
- **Locker, CRUSTS tab** (26 living tiles, 16 of them gems):
  - opening it: p95 21 ms, max 29 ms, no long tasks;
  - scrolling top to bottom and back, twice: p95 20–21 ms, max 21–22 ms, no long tasks.
- **Locker, SHINY tab:**
  - opening it: p95 21 ms, max 67 ms, one 54 ms long task while its 150 living tiles start (the shiny feet's rigs);
  - scrolled to the ultra-rares: p95 21 ms, max 22.5 ms.
- **`F.contrast()` and `F.layout()`** report nothing on the CRUSTS tab, at desktop and at phone size (844 × 390).

**Review fixes.** One independent visual review. What it raised and what changed:

- **The soft purple box behind the Crown Jewel in play** was the ultra aura lighting the counter behind it. The gem auras are now at 70 %.
- **The smack ring read as a halo** drawn outside the head. That was the generic glow's ring; it is off for the gems.
- **Silver and gold had a grey speckle patch** in the middle. The guilloché is now six clean rings with a lit centre, and the plates' facets have stronger light and dark contrast.
- **The pearl was a flat white oval.** It now has a deeper, darker edge, stronger pink and green orient, and a brighter highlight. Its smack ring, which looked like a sticker, is now a soft, wide iridescent sheen.
- **The Fire Opal's flecks read as uniform confetti.** The flakes now vary in size and lie in the grain, and the dome has a darker rim and a polished highlight.
- **The emerald read as a flat target.** Its steps now alternate light and dark, band by band.
- **The Black Diamond barely moved at rest.** Its flashes are stronger and whiter.
- **Platinum Prop's diamond was small.** It is bigger.
- **The Golden Feather's smack only lightened the plaque.** It is toned down, and the smack throws golden feathers.
- **Not changed:** the Ruby Crown's fire halo on its tile, which the reviewer found spiky. That is the ruby's fire look from before this pass (`src/art/lookFire.ts`, shared with the other fire peels). Its tile shape was already reworked in batch 4.

**Where it stopped.** All 24 gem peels are done. Up next, in order:

1. The heroes (67, P3): a signature motion each (a cape that moves, an emblem that lights, the hero's power), built on the hero heads' parts (`src/art/heroHeads.ts`) and grouped by power family.
2. The gods (38) and the God Peel (P3): each god's own motion in the head itself.
3. Alongside: the foot peels' first-open warm-up on the ALL tab (batch 2), the Immortal's and Immortal Brute's living defs, and the fire looks' big-preview and in-play shapes (the Ruby Crown's and the Fire Opal's among them).

## Batch 6: the heroes (done)

**What changed.** All 67 hero peels (the 50 heroes, the 12 Endgame variants, Superpeel Prime, Iron Pan Mark Infinity, Shield of Liberty, Symbiote Pan, the Amazon Queen and the Dark Kneader) are a new crafted kind, `hero` (`src/art/peelHero.ts`). There is no frame and no window: the head is the hero, and it comes alive from the costume's own parts, which `src/art/heroHeads.ts` now paints one at a time (`drawHeroPart`: the glow, tail, cape, ears behind, the head, the eyes, the emblem's glyph, what sits on top, ears in front). At rest the parts stack up to exactly the old still (the stills are pixel-identical to before), so nothing jumps when a tile comes alive.

What moves, from the parts:

- **Capes** billow: drawn in rows held at the shoulders, a travelling wave and a widening growing towards the hem, folds of light and shade moving across the cloth; in play a swing blows the cape back and a fast one lifts it; a smack makes it flare.
- **Ears and wings**: Hawkcrust's wings beat, the Wasp's buzz (a blur of two), cat ears, antennae and raccoon and squirrel ears twitch on springs, the Flashfoot's bolt wings and Hawk-Eye's fletching sway, Captain Pizzeria's little wings flutter now and then, flame crowns flicker, I Am Crust's leaves sway; the squirrel's tail sways and flicks.
- **Eyes** blink (sometimes twice); behind a mask's lenses they narrow instead, now and then and on a smack (a wince). Glowing eyes breathe or flicker; Superpeel's heat vision charges every few seconds.
- **The emblem's glyph** (painted on its own, its badge staying put) spins (sunburst, snowflake, flame ring, Deadpeel's cutter), flips like a thrown shield (Superpeel's star, the shields, Zatanna's wand), beats like a heart (Iron Pan's core, the paw, the scarab, the cassette to the music), swings (She-Bulk's gavel, struck down), springs (Plastic Pan, Mr Elastic Cheese, Ant-Pan), bobs, pulses, flickers, or catches a sweep of light (Batpeel's night slice, the claws, the feather, the crescent). A smack flashes it.

Each hero's **power**, from a set of effects shared by the power families and set per hero (`HERO_SPECS`):

| Family | Effect | Heroes |
|---|---|---|
| lightning | jagged arcs crackling round the rim or the badge, re-jagged every few hundredths of a second, a big crackle on a smack | Stormy Weather (over the head, with storm smoke), Static Cling (and her bolts flashing), the Flashfoot, Shazamozza (and a bolt from above on a smack), Night Wings' sticks, the Wasp's sting, Black Window's bite |
| speed | afterimages in the suit's colour and lines streaking past behind the head, a zoom every few seconds and when swung fast | the Flashfoot |
| webs | strands strung from the rim with cross threads, swaying; a web shot that splats on a smack; spider-sense lines tingling | Spider-Pan; Symbiote Pan's writhing tendrils and goo drips |
| magic | a ring of sparks turning behind the head with runes, sparks thrown off (Doctor Strangeloaf); a hexagram turning and chaos wisps orbiting (Scarlet Pitch); sparkles round the top hat and wand (Zatanna Panna) |  |
| light and energy | the pattern lighting up in a wave: Black Pan-ther's plates, Blue Beetroot's, the Bulk's cracks, the embers, Ice Cream Man's frost, the Scorch's flames, Aqua-Toe's scales, Static Cling's bolts | |
| constructs | a glowing outline round the head and the lamp's light pouring down | Green Lampshade |
| tech | Iron Pan's core beating with a repulsor ring on a smack, a sheen over the plates; Mark Infinity's six stones glowing in turn; a light running along Cyclopizza's and the Wasp's visors and Cyclopizza's optic blast; Cy-Pork's reticle round its cyber eye | |
| heat | heat vision from the eyes on a smack | Superpeel, Superpeel Prime |
| a lasso | a golden rope circling the head, its far side behind, tightening on a smack | Wonder Wedge, the Amazon Queen |
| sense | a sonar's rings pinging out | Dare-Dough |
| aim | a reticle turning and locking on | Hawk-Eye-Talian |
| strength | rage surges that shake the head and light its cracks | the Incredible Bulk (She-Bulk: the gavel) |
| size | shrinking and popping back, pym sparkles | Ant-Pan |
| stretch | a bouncy spring that boings now and then | Plastic Pan, Mr Elastic Cheese |
| phasing | the head goes see-through, its eyes still glowing | Martian Mozzarella |
| the night | bats flitting past behind the head | Batpeel, the Dark Kneader |
| nature | bubbles rising (Aqua-Toe), leaves falling (I Am Crust), spores and moss drips (Swamp Thin Crust), feathers (Hawkcrust) | |
| sound | music notes rising off the headphones | Star-Lard |
| fire and ice | embers rising (Ghost Roaster, the Scorch, who keep their fire looks); cold mist spilling and snowflakes (Ice Cream Man) | |
| a rocket | the rocket's exhaust flickering, smoke puffs | Rocket Rucola |
| glints | glints along the katanas, the tiara's stone, goggles, star visor, shields, sheens over polished metal | Deadpeel, Wonder Wedge, Cat-Toe-Woman, Booster Gouda, Captain Pizzeria, Silver Slicer and more |

The **Endgame** variants keep their base hero's life and add a portal of sparks opening beside the head now and then (both sides on a smack) and a glint on the hex badge. The other variants build on their base (Prime's stronger heat and chrome sweep, Infinity's stones, Liberty's big shield catching the light, the Symbiote's tendrils, the Queen's crest glinting, the Dark Kneader's glowing lenses).

**A smack** lands in the hero's style: an impact word bursts out (37 comic sounds of our own, lettered in the game's font in yellow with a thick ink stroke on a light burst bordered in the hero's colour: POW!, KRAK!, SHING!, BOING!, ORDER!, I AM CRUST! …; a tile plays only the short ones), plus the power's burst (gold, sparks, embers, leaves, cards, notes, goo, feathers, flakes, stars) and its own answer (beams, rings, slashes, a bolt, a web shot, a construct ring). In play the word comes at most every 2.4 s and not on every smack, so it doesn't crowd the table; it is drawn bigger there (1.75 times the tile's size), up and to the left of the head, away from the game's own floating text.

**How it's built.** As the other crafted kinds: the rig is built in idle time and shared, one per peel per detail; the motion (`HeroLive`) is one per place it shows.

- **Layers:** each moving part painted once per detail and cut down to what it paints. The surface covers a bigger box than the head's (`HERO_BOX`, the cape hangs below; crafted rigs can now say their box, `rigBox`), and the bracers move onto the handle.
- **Each frame:** the layers drawn with their transforms (rows for the cape), and the effects drawn as vectors and gradients; what flies off is the crafted sprite pool, which gains the impact words, notes, leaves, bubbles, cards, goo and stars (`emit` can now pick a sprite's frame).
- **The family glow** (`src/art/lookGlow.ts`) keeps its aura, motes and ribbon on the big preview and in play, but loses its rim glints and smack ring for living heroes (`heroGlow`).
- **Look lab:** the Heroes family is now the living heroes.

**Performance** (headless Chrome; the machine's load average was 4–8 with other apps running):

- **Cursor peel in play**, swinging and smacking: the look's tick costs 0.18–0.41 ms a frame on average (p95 0.3–0.7 ms, max 1 ms) for Superpeel, Batpeel, Spider-Pan, Iron Pan Mark Infinity, Plastic Pan, Doctor Strangeloaf and Martian Mozzarella. Frame p95 17.2–17.9 ms, no frame over 50 ms.
- **Locker, HEROES tab** (27 living tiles on screen): scrolled to the heroes (their thumbnails and rigs building): p95 20 ms, max 20.8 ms, no long tasks; scrolling the tab top to bottom and back, twice: p95 19.9–20.2 ms, max 21.3 ms, no long tasks.
- **`F.contrast()` and `F.layout()`** report nothing on the HEROES tab, at desktop and at phone size (844 × 390).

**Review fixes.** One independent visual review. What it raised and what changed:

- **The impact word was too small in play and hard to read.** Every word now follows one rule: a light burst with the hero's colour only on its border, yellow letters in a thick ink stroke. On a tile only the short words (five letters or fewer) play, a quarter bigger; in play the word is 1.75 times the tile's size, held about 0.9 s, and bursts up and to the left of the head, away from the game's own floating text at the hit.
- **Martian Mozzarella's phasing read as a rendering fault** (the whole head and cape at half strength, the handle showing through). Now only the head's fill ghosts a little, the cape and eyes stay, the outline is redrawn with a green shimmer, and it is back within 0.6 s.
- **Spider-Pan's webs reached the tile's edges and looked cut off.** The strands are shorter (ending about 1.3 times the head's radius out) and each fades out at its free end. The Flashfoot's speed lines fade before the surface's edge too.
- **The bats read as dirt.** They are bigger, fly in front low over the cape, and are dark silhouettes with a soft violet rim.
- **Green Lampshade's smack ring was a thin hard circle.** It is three bands now, soft on both sides.
- **Some heroes hardly moved at rest.** Capes get a gust every 2 to 3.5 s and a bigger wave (Superpeel and every caped hero); eyes blink more often and masks' lenses narrow more; spinning glyphs turn faster. Iron Pan's arc reactor, Ice Cream Man's snowflake, Night Wings' sticks, Cy-Pork's circuit and Dare-Dough's badge breathe with a bright beat every couple of seconds; Cyclopizza's visor pulses; Silver Slicer's and Captain Pizzeria's sheens come round more often; Dare-Dough's sonar is stronger; Ice Cream Man has frost sparkles and more snow.
- **The Endgame variants were samey** (the same warm glow and orange flecks). The portals' haze is softer, and each has its own extra over its base: Captain Marvellous's and Star-Lard's orbiting lights, the Bulk's gamma rings, Black Window's bite crackling round the rim, Hawk-Eye's target rings, Black Pan-ther's violet kinetic arcs, Strangeloaf's green sparkles, Scarlet Pitch's extra wisps, Ant-Pan's quantum rings, the Wasp's stings round the rim, Rocket's sparks from the rocket, I Am Crust's sparkling leaves.
- **Scarlet Pitch's pink haze read as smudged.** Its glow and the mandala's haze are halved. **Doctor Strangeloaf's mandala was faint in play:** its sparks are stronger and thicker.
- **The locker captures showed the gods** (the locker kept its scroll). They are retaken with the HEROES section in view.

**Where it stopped.** All 67 hero peels are done. Up next, in order:

1. The gods (38) and the God Peel (P3): done in batch 7 (below).
2. Alongside: the foot peels' first-open warm-up on the ALL tab (batch 2), the Immortal's and Immortal Brute's living defs, and the fire looks' big-preview and in-play shapes (the Ruby Crown's, the Fire Opal's, and the Scorch's and Ghost Roaster's among them).

## Batch 7: the gods and the God Peel (done)

**What changed.** 36 god peels (the 17 Greek gods, Kratos and Ghost of Sparta, King Leonidas and Hot Gates, the 13 Norse gods with Odin and Thor, and Odin Allfather Ascended and Thor, Thunder Unleashed) and the God Peel are a new crafted kind, `god` (`src/art/peelGod.ts`). Zeus and Zeus, King Unbound keep their hand-made living lightning blade (`animatedLooks.ts`), which already had a tile loop, a swing trail and its own smack. As with the heroes there is no frame: the head is the god's symbol, carved in marble and gold or in oak and iron, and it comes alive from its own parts.

**Parts.** The heads' drawing code (`godShapes.ts`, `godHeads.ts`, the Leonidas and variant looks) now asks `want(key)` before each piece that moves on its own (`src/art/godParts.ts`). Painting a still, every piece is wanted, so the stills are unchanged; a rig paints the head once without its moving pieces and once per piece, and each moving part's divine glow is a layer of its own that moves with it, so at rest the layers stack back to the still (measured: 34 of 37 within 0.25 % of pixels; Nike, Hera and Ghost of Sparta under 0.5 %). While the base paints, the runes and gems the head draws are noted (where, glyph, colour), and the gold relief is picked out of the painted head by its colour.

What every god shares: on the Greek heads a light runs over the gold relief every 3 to 5.5 s and the gems breathe and glint in turn; on the Norse heads the runes light in sequence, each from its own pre-lit layer. A smack flashes the head in the god's colour (gently: marble and bone would blow out), flares the gold, sets every rune blazing, lights a glow of the god's colour behind the peel, and throws the god's own burst. No impact words: those are the heroes'.

| God | Motion, from its own parts and domain | Smack |
|---|---|---|
| Hera | the seven-feather train breathes open and shut and rattles in a shiver now and then; the eyes shimmer teal, blue and gold in turn | the train flares wide, feathers and sparks |
| Poseidon | a ribbon of water winds up the shaft (its far side behind), sea light ripples over the gold (caustics), drops fall | a splash off the tines: spray and mist |
| Demeter | the three ears of wheat sway out of step, with gusts; seeds and leaves drift | grains and leaves burst, the ears whip |
| Athena | the owl's pupils dart about and settle, its gold lids blink | eyes snap front, a gold aegis ring, feathers |
| Apollo | the lyre's strings are plucked (bowing and ringing, a glow on each), notes rise; the sun on the soundbox turns its rays | a strum of every string, notes |
| Artemis | the bow is drawn with its arrow and eased off | loosed: the string snaps and rings, the arrow leaps, a streak of moonlight flies up |
| Ares | eyes smouldering in the helm with surges of rage, embers rising | embers and sparks, a heavy shake |
| Aphrodite | the heart-pearl beats, a nacre sheen crosses the shell, hearts rise and petals fall | hearts and petals burst, the heart swells |
| Hephaestus | the hammer is raised and struck on the hot face every couple of seconds, sparks off each blow, the face glowing (and its fire) | a great blow |
| Hermes | the winged helm's wings beat in flurries, wind streams past | wings beat hard, feathers |
| Dionysus | the bunch sways on its vine, grapes glint, wine bubbles rise | the bunch bounces, juice and bubbles |
| Hestia | the hearth's flame flickers and stretches out of its bowl, embers (and its fire) | the flame surges |
| Hades | the skull's eyes pulse violet, souls orbit, the prongs smoulder | a burst of souls |
| Persephone | the leaves stir, the seeds glow in turn, petals fall | seeds and petals burst |
| Nike | the wings beat, light runs round the laurel, wind | wings flare, gold feathers |
| Nyx | the night's stars twinkle, the moon glows, shooting stars cross behind | a pulse of night and stars |
| Kratos, Ghost of Sparta | the crest streams in a travelling wave; eyes like embers, with surges; Ghost's flames lick behind the handle | embers, the eyes blaze, a shake |
| Leonidas, Hot Gates | the cloak billows down the handle, a light sweeps the shield, dust (Hot Gates: embers and smoke) | sparks off the shield, dust |
| Odin (and Ascended) | the raven's eye blinks and glows, Huginn and Muninn fly past (Ascended: rays of light pour down from the eye) | both ravens burst out, black feathers |
| Thor (and Unleashed) | lightning crawls the hammer's edges, the runes pulse (Unleashed: gold, and arcs round it) | a bolt from above, the edges crackle |
| Loki | the mask splits into green illusions that drift apart and snap back, sly eyes, chaos wisps | two illusions fly out to the sides |
| Frigg | a light runs along the thread of fate wound round the spindle, the rune ring lights round, mist | threads of fate flung out |
| Freya | the falcon's wings beat, Brísingamen lights bead by bead, petals | wings, feathers, gold |
| Freyr | light runs down Gullinbursti's golden bristles, the boar snorts | gold coins, a snort |
| Tyr | a light runs up the blade, embers off the tip | the blade flashes, sparks |
| Heimdall | Gjallarhorn's bell glows and sound spreads out of it in arcs, a rainbow sheen | a horn blast of arcs |
| Baldur | the sun's rays rock and light turns behind them, the core breathes | the rays spin and spring back, light bursts |
| Hel | the bone side's eye pulses cold, the living eye opens a crack now and then, mist | the living eye snaps open |
| Njord | the sail fills and slackens, the ship rides two waves (one behind the hull, one in front), spray | a wave breaks, spray |
| Skadi | the snowflake rocks, frost glitters, snow falls, cold mist | the flake spins and springs back, ice |
| Idun | the apple's leaf stirs, the gold glints, motes of youth | gold and leaves |
| Bragi | the harp's strings are plucked, notes rise | a strum |

Carved parts that turn (Baldur's rays, Skadi's snowflake) rock and spring back rather than spin round, so their light stays at the top left; the light turning behind Baldur's rays is a light, not the wood.

**The God Peel**, the final trophy: its sunburst turns behind it, the halo floats above with a light running round it, the gold rays turn round the slice, the slice breathes light, two rings of gold sparks turn round the rim with Greek keys and runes between them, a rainbow prism sweeps across the marble, rays of light turn behind, the crown of tiny peels (one from each group) bobs in a wave and each catches the light in turn, motes and stars drift up; all inside its glow's halo, rays and prism trail. A smack: the rays spin, the halo flares and lifts, the tiny peels hop one after another, gold rings spread, stars, gold and confetti burst.

**How it's built.** As the other crafted kinds: the rig (`godMiniSteps`: the head's layers, the gold, each rune lit) is built in idle time and shared; the motion (`GodLive`) is one per place it shows. The hero kind's effects are shared through a small interface (`FxHost`: arcs, sparkles, rings, wisps, emitters, the bolt from above); the gods add their own (wings and sways, the fan, strings, the bow, the hammer, billowing rows and columns, rays, ravens, illusions, edge lightning, sea, waves, horn, threads, the halo and crown). The surface covers a 220 × 236 box (Kratos, Ghost of Sparta and the Leonidases the whole peel, for the chain and cloak). The crafted sprite pool gains hearts, petals and raven feathers. The god glows (`lookGlow.ts`) keep their aura, motes and trail but drop their head glints and smack ring for living gods (`godGlow`). Look lab: the Gods family is the living gods.

**Performance** (headless Chrome; the machine's load average was 6–7 with other apps running):

- **Cursor peel in play**, swinging and smacking: the look's tick costs 0.24–0.47 ms a frame on average (p95 0.5–0.9 ms, max 1.3 ms) for the God Peel, Thor, Hera, Hephaestus, King Leonidas and Odin. Frame p95 17.8–18.6 ms, no frame over 50 ms.
- **Locker, HEROES tab**, scrolled to GREEK GODS (their rigs building): p95 19.9 ms, max 21.5 ms, no long tasks; on to NORSE GODS: p95 20.7 ms, max 30.6 ms, no long tasks. A rig builds in 3–16 ms, in idle steps.
- **`F.contrast()` and `F.layout()`** report nothing on the HEROES tab with the gods in view, at desktop and at phone size (844 × 390).

**Review fixes.** One independent visual review. What it raised and what changed:

- **Smacks blew the heads out to white or yellow** (Apollo, Idun, Thor, Thunder Unleashed, the owl, the God Peel), losing their material. The god's-colour flash is a third of what it was and the gold's flare halved; the gold's sweep no longer fires on a smack; Thor's flash is halved and Thunder Unleashed has none (its arcs and runes carry it); a gem's smack glow is gentler.
- **Nike's wings were cut off in a hard-edged box** when they beat down past the peel's frame. Wings now beat only up from rest (Hermes, Nike and Freya), in strokes that ease out and back.
- **Loki's illusions read as misregistered copies in a muddy olive.** They are lit green ghosts now, added rather than painted over, fading as they drift apart.
- **Athena's wink on a smack read as a blackened eye.** The smack no longer closes her lids.
- **Njord's wind streaks over the sail** looked like scratches: gone.
- **Odin's ravens were too small** (they read as insects): a third bigger again.
- **Notes off the lyre and harp read as flecks:** bigger.
- **Idles too subtle** (Hera, Demeter, Artemis, Dionysus, Persephone, Freya, both Kratoses, both Leonidases): Hera's train opens wider and shivers harder and its eyes shimmer brighter; the wheat, grapes and pomegranate leaves sway about twice as far; Artemis draws every 1.6 to 3 s and further; Freya's wings beat higher; Kratos's crest and Leonidas's cloak stream more.
- **The God Peel was the brightest, not the grandest:** its smack washed the slice out, and the spiky sunburst behind looked cut out. The slice's light now sits under the slice (it stays readable at the climax), its flash is nearly gone, the sunburst is drawn faint under two sets of soft rays turning opposite ways (gold, and rose), and a smack runs a beat of every group's light round the crown (each tiny peel flares in its own colour as it hops).
- Not changed: the Ares, Odin, Hades and Loki locker auras (the element glows from before this batch; the reviewer found them muddy on the cream tiles, so they are worth a look in the glows' own pass), and the God Peel's round silhouette (its still).

**Where it stopped.** All 38 god peels and the God Peel are done (both Zeuses as they were). That finishes every group in the audit. Up next, in order:

1. The foot peels' first-open warm-up on the ALL tab (batch 2).
2. The Immortal's and Immortal Brute's living defs (`foot:immortal`, `shiny:immortal`, `boss:immortalbrute`).
3. The fire looks' big-preview and in-play shapes (the Ruby Crown's, the Fire Opal's, the Scorch's, Ghost Roaster's, Hestia's and Hephaestus's among them).
4. Zeus's blade could join the god kind (its gold catching the light, the eagle's feathers stirring) when it's next touched.

## Batch 8: the leftovers (done)

**The ALL tab's first open.** Profiled again on a fresh page load with the art cache filled, the first scroll passes' hitches were mostly not the foot peels' art at all:

- **Layout thrash in the locker's frame loop** (`src/art/animatedLooks.ts`). Every frame, each living tile read its image's layout and computed style and then wrote its canvases' position, so the whole grid of 735 tiles was laid out again once per tile drawn: 70–170 ms a frame once a screenful of tiles was alive, steady, not only on the first pass. The frame now measures every overlay first and then moves and draws them, and only writes a style that changed. Tiles no longer read their computed style as the grid fills (a tile is positioned by the stylesheet).
- **Overlays scrolled out of view kept their canvases** (hundreds after a scroll end to end, with their halving canvases). They now let their pixels go and are sized again when they come back.
- **Rig and art builders stepping into scroll frames.** The idle queues (living foot rigs, crafted rigs, pizza paint, the art warmer, the art cache's writes) were forced into busy frames by their idle timeouts. They now hold back while the player is scrolling (`src/art/scrolling.ts`: a scroll, wheel or touch in the last quarter second) and pick up as soon as it settles; tiles show their stills meanwhile and come alive when the scroll stops.
- **The foot peels' first-time art work**, as batch 2 found: Phaser registering foot textures (a `CanvasTexture` reads every pixel back as it's made: feet and the live kit's sheets are now plain textures, as nothing reads their pixels through Phaser), cropping each foot's art for its emblem (now saved to the art cache, `crop:` entries with the ankle's measurements, and loaded off the main thread before the thumbnail or the rig needs it; the crop is kept on a CPU canvas so its ankle is measured without a readback), the zombified emblems' rot (saved too, `zemb:` entries), trimming the toe band's poses (the first pose is measured and the rest share its box, grown a little, instead of a readback per pose), and cached thumbnails decoded and re-encoded as data URLs (now served as blob URLs of the stored PNG). Feet and pizza tops drawn on the spot have their pixels read for the cache in idle time, never in the frame that drew them.

Measured the same way before and after (headless Chrome, the machine busy: load average 5–9 with other apps running; art cache filled by scrolling the tab slowly three times; then a fresh page load, the ALL tab opened and scrolled top to bottom and back three times, twice):

| | Pass | Long tasks (over 50 ms) | Their total | Max frame | Frame p95 |
|---|---|---|---|---|---|
| Before | first | 14, 15 | 1.25 s, 1.39 s | 270, 246 ms | 82, 65 ms |
| | second | 12, 11 | 1.21 s, 1.02 s | 245, 188 ms | 43, 30 ms |
| | third | 12, 5 | 0.69 s, 0.32 s | 88, 98 ms | 53, 35 ms |
| After | first | 4, 3 | 0.31 s, 0.18 s | 97, 74 ms | 21, 21 ms |
| | second | 1, 0 | 0.06 s, 0 | 71, 24 ms | 20, 20 ms |
| | third | 0, 0 | 0 | 22, 36 ms | 20, 20 ms |

The few left on the first pass (52–87 ms) are the tab opening itself and the first tiles' first draws. Left alone on the tab afterwards, no long tasks at the top, middle or bottom of the list (before, 50–60 ms frames among the ultra-rares and gods). Not changed: the title screen's own warm-up (the trattoria's live backdrop sheets) before the locker opens.

**The Immortals come alive** (`src/content/styleLive/immortals.ts`). The Immortal Sandals and the Immortal Brute keep their own art and their own live layer in play (`src/game/footLive.ts`, unchanged); their peels get peel-only styles and defs on the same system as every other foot peel (`registerPeelStyle`, `registerPeelLive`), cut from the same painters, so play never runs them twice. A peel's def can step a part through its frames itself, cross-fading into the next (`partFrame`), so each moving piece takes the peel's pattern and foil as the still does.

- **Immortal Sandals** (and the shiny): the body of black smoke boils under the mask (twelve pre-drawn frames, back and forth, cross-faded), smoke streams from the mask's eyes and mouth and curls off the toes and from under the lamellar (see-through charcoal with a paler rim, swelling as it rises), the chrome catches the light (a glint runs over a ridge of the mask every second or so), the armoured toes curl every couple of seconds. A smack: the chrome flashes (glints all over the mask, a burst of light over it), the eyes blast smoke, a ring of smoke bursts out, the body boils hard, the toes splay.
- **Immortal Brute**: the eye looks about and blinks, a red glint in it now and then, smoke seeping round it; the two burst cuts chew (open slowly, snap shut, grind), smoke seeping out of them, black drool dropping off their lower ends; the mutant toes curl every couple of seconds. A smack: the eye flashes red-hot with sparks flying off it, the jaws snap shut and gape in a roar, smoke coughs out of the cuts, drool is flung, the toes splay. The peel's pattern stays off the eye and its lids (`patternHoles`: stars over it read as dirt), on the still as well as the living peel.

At rest the live peel matches the still. Cursor peel in play: 0.22–0.24 ms a frame for the look (p95 0.4–0.5 ms), frame p95 18–19 ms, no long frames.

**The fire's shape everywhere** (`src/art/lookFire.ts`). The big preview and the cursor in play now burn with the tiles' lower, fuller fire: it burns all round the head (the underside's tongues short), the inner rings tall enough that the orange and yellow show, tongues wide enough to make one body of fire; in play it is lower than before (0.8 of a tongue's length where it was 1.15) with a lighter outline (it read as a crown of spikes), and Diavola's horns are shorter. Diavola's and Surtr's ramps are warmer (red outside, orange and yellow within: Surtr's black-tipped ramp read as a spiky black crest), Surtr burns lower. The big preview has more room round it for flames, and a shiny peel's preview is no longer clipped to its box (its sheen sweeps by moving its gradient), which had cut the Ruby Crown's flames flat. Loose licks still break off in play; in the locker they're specks and stay off. The per-style `cut` (where the underside stopped burning) is gone.

**The god auras on cream** (`src/art/lookGlow.ts`). Ares's, Odin's, Hades's and Loki's element glows were a dark-rimmed aura and dark smoke puffs, which read as grime on the locker's cream tiles. Their aura is now light (a soft coloured wash with a paler heart and no darker rim; added as light in play), and their smoke is a new particle, haze: coloured light that swells as it fades, never a dark body. Ares: embers in a red-orange haze; Odin: glints in a pale blue haze, a little stronger (on cream it only just read); Hades: violet soul-light with pale sparks; Loki: green trickster light. Glows can now be drawn as added light in play (`Pen.glow`'s `add`).

**The locker's counts.** The header counted 736 peels and the ALL tab 735: ALL left out the God Peel, which sits in its slot above the tabs rather than on the grid. ALL now counts it too, so both say 736.

**Review.** One independent visual review; what it raised and what changed: the Immortals' smoke read as grey smudges (now see-through charcoal with a pale rim, fewer side puffs, more from the face), only the smoke moved (chrome glints and more frequent toe curls), their smacks didn't show at cursor size and the Brute's red smoke read as blood (a chrome flash; a red-hot eye flash with sparks, no red smoke), stars over the Brute's eye (pattern holes), Diavola and Surtr still a crown in play (warmer ramps, lower), the Ruby Crown's preview flames cut flat (the shiny clip), Odin's aura faint (stronger). Not changed: the thin dark line over Odin is his raven flying past (batch 7), and Ares's glow over the top of the handle is his aura's paler heart.

`F.contrast()` and `F.layout()` report nothing on the ALL tab at desktop and at phone size (844 × 390).

Not done: Zeus's hand-made blade stays in `animatedLooks.ts` (it already has its own tile loop, trail and smack; moving it into the god kind isn't a cheap change).

**Where it stopped.** The audit's leftovers are done. Worth a look next: the ALL tab's ultra-rares and gods, a screenful of the richest living tiles at once, draw at 18–25 ms a frame on a busy machine; if that shows on slower devices, a lower frame rate for tiles when many are alive would be the cheap fix.
