# Topping art plan: a painted card for every topping

Toppings are the only collection in Feetza still shown as an emoji on a plain card. This plan gives every topping
real art, painted with the same kits as the locations and the feet, and makes rarity something you can see.

Status: planned, not started. Decided with Tron on 2026-11-28 from a set of card mockups.

## What Tron decided from the mockups

- **One layout for every card.** Every card puts the tag, art, name, text (a fixed block of up to 4 lines, the
  downside included), level line and BUY button in the same positions, whatever its rarity. Only the art changes.
  The shop's cards move to this layout in the card-text work (scratchpad brief `brief-items.md`), ahead of the art.
- **Framed art on every rarity.** Common, Rare and Epic show their art in a framed window the same size on every
  card, with the frame in the rarity's colour. The Legendary card is **full art**: the scene fills the whole card,
  and the name, text and button sit on a plaque in the same positions as on the other cards.
- **The art shows the topping at work against the feet**, as a scene, not an object on a backdrop. For example:
  - **Sea Salt:** salt shaken onto a stomping foot, stinging it;
  - **Garlic Lightning:** a thunderous garlic in a storm, arcing to two feet;
  - **Explosive Pineapple:** pineapples bursting among the feet, as a painted battle scene.

  Where the topping is about the shop rather than the fight (Exclusive Menu, Coupon Clipper), the scene shows that
  instead. The Exclusive Menu mockup (a top hat over a gold-tooled menu, under a spotlight between velvet
  curtains) is the reference for those.
- **Hand-drawn SVG isn't good enough.** The mockups proved the layout and the tiers, but their art was crude. The
  real art is painted with the location kit and the feet's style packs, at the standard of the best locations and
  feet.

## Rarity sets how much the art does

| Rarity | Toppings | Art | Motion |
|---|---|---|---|
| Common | 54 | A painted scene in the window | None: a still. A small pop when bought. |
| Rare | 43 | A painted scene in the window | One idle loop every few seconds (a lightning flash, a squash) |
| Epic | 37 | A painted scene in the window, lit and deeper | Always moving: smoke, sparks, embers, a pulsing blast |
| Legendary | 32 | Full art: the scene fills the card | Always moving, in layers at different depths that tilt with the pointer or a finger |

All motion stops when the device asks for reduced motion, and the Legendary tilt from holding the phone at an angle
is an option, because iPhones ask permission for motion. Dragging a finger over the card always works.

## How the art is made

**With the kits, not by hand.** Each card is a small scene built from what the locations and feet already use:

- **The location kit** (`src/art/scene/`, see its README): the one light (`LIGHT`, `FALL`), `surface()` and the
  painterly materials, skies and clouds, light pools and shafts, props, and the layer model (`SceneSpec`, still
  layers, sprites, slots, `top` effects, baking).
- **The feet's style packs** (`src/art/style/`, `src/content/style/`): the real roster feet, with their materials and
  anatomy, front-on as always. A card's feet are real feet from the game, preferably ones from the topping's own
  world, so the cards feel like part of the same game.
- **The ability and look effects** (`src/art/abilityFxArt.ts`, `lookFire.ts`, `lookGlow.ts`, `lookKit.ts`) for blasts,
  lightning, fire and glows, so the effects on a card match what the topping does in play.

**What the kits will need** (added generically, so later cards and places get them too):

- **Foot poses at card scale:** flinching, struck, thrown back, stomping down. These are poses of the style kit's rig
  (`Pose`), not new drawings.
- **A card scene type:** a `SceneSpec` at the card window's size and aspect, with a safe area clear of the frame and,
  on the Legendary card, of the plaque. Legendary scenes also give each layer a depth for the tilt.
- **A focus point for small sizes.** Each card names the part of its scene that reads at chip size (STATS chips, the
  topping list, tip pop-ups). Small sizes crop to it instead of shrinking the whole scene.

**One registry, checked.** Card art is registered per topping (e.g. `registerCardScene(toppingId, spec, live)`), in
the same way as the locations (`registerKitScene`). Until a topping has its art, its card falls back to today's icon.
A dev audit lists toppings with no art (`[cards] … have no art`), like the peels' missing-ability error. Once every
topping has art, the registry becomes a `Record` over the topping ids, so a new topping without art doesn't compile.

## Running it in the game

- **Prebuilt.** Stills and the baked pieces go into the art atlases at build time (`docs/prebuild.md`), as for the
  backdrops and feet, so the shop opens instantly and phones don't paint anything.
- **Motion is cheap.** Moving parts are baked layers moved by the live code (`KitLive`: `sprite`, `emitter`, `sway`,
  `flicker`), not frame sheets. Only cards on screen animate, and they pause when the shop is hidden.
- **The same art everywhere:** the shop card, a FROM chip's card pop-up on the STATS tab (`data-tip-card`), the topping
  list and the level-up card. Small sizes use the focus crop and less motion.
- **A memory budget per card,** checked by the prebuild's measurements (`scripts/prebuild/measure.mjs`).

## How we get there

1. **The pilot: one card per rarity, done properly.** Sea Salt, Garlic Lightning, Explosive Pineapple and Exclusive
   Menu, built with the kits and the kit additions above, wired into the real shop with the fixed layout, the
   registry, the fallback and the dev audit. Tron reviews them in the shop at desktop and phone size before
   anything else is drawn.
2. **The rest, in batches by rarity,** about 8–10 cards a batch, one agent at a time:
   - Legendary first (32), as the most-seen and most-rewarding cards;
   - then Epic (37), Rare (43) and Common (54).

   Toppings that belong to the same world (the event toppings, the shop toppings, the trade-offs) share scenes,
   props and feet within a batch, so they look like a set.
3. **Turn on the compile check** once the last card lands: every topping must have its art.

**Every batch is reviewed as `CLAUDE.md` asks:**
- a visual pass (real screenshots at desktop and phone size, plus `F.contrast()` and `F.layout()`), with each card
  checked at full size and at chip size;
- a performance check (shop opening time and memory on a phone-sized profile);
- an independent code review.

**Where it sits in the queue:** after the effects work (the rules batch, the card-text work, steps 3 and 4) and the
Act 4+ Legendaries, unless Tron moves it.

## Still open

- **Pizzas.** Pizza cards on the counter could get the same treatment later. Not part of this plan.
- **Peels.** Peels already have art. Topping cards should match the Peel Locker's standard, not replace it.
- **Sound.** A card's motion could have a quiet sound in the shop (the garlic's thunder, the pineapple's fuse). Off by
  default, if done at all.
