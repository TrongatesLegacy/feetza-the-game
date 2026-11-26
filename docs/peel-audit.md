# Peel audit: the peel animation pass

Every peel group as of the start of the peel animation pass: 736 peels. Each has how many there are, how it looks today, how often players see it, and what living animation would suit it. The bar is the one the feet, bosses and locations are now at: real animation (painted frame loops, structured motion, shaped and lit particles), a reaction when a smack lands, the silhouette and thumbnail kept readable, and cheap enough for the locker's grid and the cursor peel in play. Settings → Graphics "animated peels" gates all of it (off, every peel is a still), and everything cosmetic uses `crand()`.

How a peel can look today:

- **still**: drawn once (`src/art/peelArt.ts`); nothing moves.
- **glow**: the generic family glow and trail (`src/art/lookGlow.ts`): an aura, particles in the peel's palette, a ribbon trail. On the locker's tiles most glows don't play at all (only on the big preview).
- **fire**: always aflame in its own style (`src/art/lookFire.ts`).
- **living**: the redrawn foot moves on the peel as it does in play (`src/art/peelLive.ts`): blinks, sway, toes that curl and splay on a smack, its own emitters and critters.
- **crafted** (new in batch 1): painted as its material and alive as it (`src/art/peelCraftArt.ts`, `src/art/peelCraft.ts`).

Priorities: **P1** the most seen (everyone's first peel, the first peels bought, what most players own early); **P2** owned early or often by most players, still a still today; **P3** rare or late, or already animated (a glow or a fire) and wanting a signature motion of its own.

## Summary

| Group | Peels | Today | Seen | Priority |
|---|---|---|---|---|
| Classic | 1 | still → **crafted (batch 1)** | every player, from the first run; the default cursor | **P1, done** |
| Golden Crusts | 4 | still → **crafted (batch 1)** | the first things players buy (400–1,200 crusts) | **P1, done** |
| Mastered (of the Classic and the Golden Crusts) | 5 | glow → **crafted + glow (batch 1)** | wave 60 with the peel equipped | done with their bases |
| Places | 22 | still | the Trattoria's after two early runs; one per stage after | **P2** (next) |
| Pizzas | 113 | still (5 fire) | Margherita's and the starters' within the first few hours | **P2** |
| Events | 8 | still | balloon, drone and moth peels early | **P2** |
| Acts | 10 | still | Act 1's after the first act; one per act | **P2** |
| Jewellery box | 8 | glow (Ruby: fire), preview only | bought late (800–5,000 crusts) | P3 |
| Mastered (of the jewels) | 8 | glow | late | P3 |
| Event shinies | 8 | still | rare drops (1 in 40) | P3 |
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

### Places (22): P2, next

Earned by clearing 10 waves at a location: the Trattoria's comes after a player's first couple of runs, then one per stage, so most players own several early. Today each is a still in its place's colours and a pattern (`PLACE_LOOK`).

Every location now has a redrawn, painted backdrop with frame loops (`src/content/art/scene-*.ts`, played by `src/game/sceneAnim.ts`). A place peel should carry a living miniature of its location's signature motion inside its head (a medallion, like a window into the place) rather than a pattern:

- Trattoria: the wood oven's fire through its mouth; Rooftop: string lights swaying, chimney smoke; Beach: surf rolling in; Diner: the neon sign's stutter; Lodge: the fire and falling snow; Space: a turning planet and stars; Kitchen: steam off the pots; Old Town: the bell tower and pigeons; Pier: water lapping, a gull; Rink: the mirror ball's light; Slopes: snow drifting off the peaks; Cellar: candle flames and dripping; Metro-Pizza: searchlights over the skyline; Doom Lab: bubbling tubes and arcs; Jotunheim: blowing snow; Bifrost: the bridge's light running; Labyrinth: torchlight on the walls; Tartarus: the chains and the blue fire; the Oven: the cosmic fire; the First Pizzeria: the first oven's glow; Goth-Ham: rain and the signal in the clouds; the Hot Gates: embers over the pass.
- Build: reuse each scene's own paint code at the peel's size (the scene's frame-loop painters already take a phase), bake a small loop per place (8–12 frames, about 120 px across) once in idle time, and play it inside the head's mask with the crafted peels' rig (surface repainted, flexed head, its own smack: a gust of the place's weather, a puff of oven smoke).
- One agent per few places, as the location pass did; the Trattoria, Rooftop and Beach first (most seen).

### Pizzas (113): P2

Earned by clearing 20 waves with a pizza on the table, so the starter pizzas' peels (Margherita, Pepperoni, Funghi …) come early. Today the head is the pizza's own art on a wooden board (a still); five hot pizzas burn (`FIRE_PEELS`).

- Toppings sizzling and glistening (a moving specular glint on oil and cheese), steam curling off the pie (a painted steam loop, shared by every pizza), the cheese stretching off the board's edge when the peel swings, and on a smack a slice-sized jump: the pie bounces on the board and a few toppings hop.
- One shared rig (pie layer, a cheese-pull mesh along the rim, the steam loop) with per-pizza tints from its toppings data, so 113 peels cost one piece of work; the five fire pizzas keep their fire over it.

### Events (8): P2

Earned by dealing with a wave event N times (the balloon, drone and moth peels come early). Today a plain head with the event's picture stamped in a disc.

- Each the event's own motion in the disc: the Tip Balloon bobbing on its string, the drone's rotors blurring, the moth's wings beating, the gull's head turning, the pizza-box chest's lid cracking open, the mimic's tongue, the hero's cape in the wind, Charybdis's whirlpool turning. On a smack, the event's answer (the balloon pops and re-inflates, the chest snaps shut).
- Their shiny versions (8, P3) get the same with foil.

### Acts (10): P2

Earned by finishing each act. Today a plain head stamped with the act's number in gold. A trophy's idle: the number's gold catching a sweep of light (the crafted peels' sheen), the studs glinting in turn, each act's head in its act's motif (Act 8's frost creeping, Act 9's marble veins, Act 10's cosmic swirl). Cheap, and worth doing with the places, since they share stages.

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
