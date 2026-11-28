# Core split plan: a game core in plain TypeScript, Phaser as its view

Status: **approved (2026-11-28, with Tron): the order is this plan and stage 1, then the Act 4 Legendaries built under stage 1's rule, then the rest of the split between Legendary batches, and last the balance sim rewritten to run the core in Node. Stage 1 done (2026-11-28, branch core-1): the game clock, every gameplay tween moved onto it, the lint rule, and visual text off the gameplay random sequence.** See "Stage 1: what was built" at the end.

## The problem

The balance sim plays the real game in headless Chrome. It draws nothing, but it still runs every tween, particle, live backdrop and art painter, so it's slow (about 15–35× real time; a 40-wave table takes minutes). Tron wants a **renderless sim**: the game's state and rules as a pure TypeScript **core** that runs in plain Node, with Phaser as a **view** that listens to the core's events and draws.

The effects refactor already works this way for effects: they fire events and never draw (`PeelFx`, `Look`s). The rest of the game doesn't:

- **66 of the 97 files in `src/game`** (and `GameScene.ts`) import Phaser. Many of the 31 that don't are already core: `Run.ts`, `perkBus.ts`, `peelBus.ts`, `perkEffects.ts`, `perkStats.ts`, `shopDeals.ts`, `abilities.ts`, `src/effects/` (3,711 lines).
- **`Foot` and `Pizza` hold their state and their Phaser objects together.** `Foot.x` is the foot's place on the table and `Foot.root` its picture; `Foot.update` moves both.
- **`GameScene.ts` (5,962 lines) mixes rules and visuals**: waves, lanes, spawns, smacks, damage, kills, stomps, the shop's rules, saves, and the HUD, the camera, the backdrop and every flash and shake.
- **Gameplay waited on tweens** (stage 1 moved all of it off them: below).
- **The game has five clocks, and they disagree.** Stage 1 found them:

| Clock | What runs on it | Slowed by |
|---|---|---|
| The world's step (`GameScene.update`: `dt = real × scale`) | feet, pizzas, perks, bosses' brains, the timers in `Every` | hit-stop (×0.06), slow-mo (×0.3), Speed Force (`heroes.worldScale()`) |
| Phaser's tweens (`tweens.timeScale`, timed by `Date.now()`) | until stage 1: the flying hits, bosses' lunges and drops, feet's deaths | slow-mo only (×0.4), not hit-stop or Speed Force |
| Phaser's scene timers (`this.time.delayedCall`, `time.addEvent`) | 439 calls: wind-ups, props' time limits, bosses' move sequences, `Action.Later` and the triggers' `delay` | none of them |
| The scene's real seconds (`Arena.now()` = `GameScene.nowT`) | 184 reads in `src/game`: ink and soot holds, perk cooldowns (`until`), boss timers compared with `now()` | none (capped at 50 ms a frame) |
| The run timer (`run.elapsedUs`, the HUD's clock) | the time a run took | none: real time **by design, and it stays so** |

So a meteor's hit, a wind-up's landing and a foot's stride each kept a different time during a slow-mo. The core has **one** gameplay clock, the world's (the run timer stays real time, beside it).

## The target

### The core (`src/core/`, no Phaser, no DOM)

The core holds the whole game's state and rules, steps on a fixed clock and draws its gameplay randomness from seeded streams. It's built from what already exists, moved, not rewritten:

| Module | What | From |
|---|---|---|
| `clock.ts` | the game clock: tweens and timers on the world's time (stage 1) | new |
| `rng.ts` | the random streams: `play` (seeded; replaces `Math.random` in gameplay) and the run's seed | `Math.random`, `seedCosmetic` |
| `game.ts` | `Game`: the run (`Run`), the table, the field, the wave, the step | `GameScene`'s rules |
| `foot.ts` | `FootState`: place, speed, state machine, health, statuses, lane, brain data | `Foot.ts`'s rules (about 900 of its 1,323 lines) |
| `pizza.ts` | `PizzaState`: slices, freshness, shields, flags, perk | `Pizza.ts`'s rules (about 350 of 773) |
| `waves.ts`, `lanes.ts`, `spawns.ts` | the wave plan, lanes and spawning | `GameScene` (`beginWave`, `spawnTick`, `laneTick`, `assignLane`…: about 900 lines) |
| `combat.ts` | smacks, damage, crits, kills, stomps, chains | `GameScene` (`smack`, `hitFoot`, `dealDamage`, `killFoot`, `onStomp`, `applyStomp`…: about 1,100 lines) |
| `shop.ts` | the shop's state and its commands | `GameScene`'s shop (about 1,200 lines), `shopDeals.ts`, `Run.ts` |
| `perks/`, `peels/`, `toppings/` | the effect system's kits | `pizzaPerks.ts`, `pizzaLegends*.ts`, `toppingKit.ts`, `heroKit.ts`, `zombiePeel.ts` (their rules) |
| `bosses/` | the fights as timelines (below) | `src/game/bosses/*.ts`, `acts/*.ts` |
| `events.ts` | the core's events (below) | `PeelFx`, `Look`, and the scene's direct calls into `Fx` |
| `clickables.ts` | everything the peel can hit, with its hit shape, in core coordinates | `Clickable` (today its `x`/`y` often read a Phaser image's) |
| `bot.ts` | the sim's player | `src/devSim.ts`'s bot |

The data (`src/data/`, `src/content/feet`, `src/content/pizzas`), the effect vocabulary (`src/effects/`), `Run`, the buses and the declarations are core already and stay where they are.

### The core's interface

- **State** is plain objects the view reads (never writes): `game.feet: FootState[]`, `game.pizzas`, `game.run`, `game.clickables`, `game.wave`, `game.shop`, `game.peel` (its place, stun, slow), the boss bar's numbers. Read-only types (`Readonly<…>`) for the view.
- **Commands** are the only way in: `smack(x, y)`, `slam()`, `movePeel(x, y)`, the shop's (`buy(id)`, `reroll()`, `next()`, `heal(p)`, `reorder(from, to)`…), `pause()`/`resume()`, `useSecondChance()`, `leave()`. The sim's bot and the player's input both send them; nothing else changes state.
- **The step**: `game.step(dt)` with `dt = 1000 / 60` ms. One step moves the world (feet, pizzas, perks, bosses, the clock's tweens and timers) by `dt × scale` (hit-stop, slow-mo, Speed Force are core state) and the run timer by `dt`. The Chrome game calls it from `GameScene.update` with the frame's time (in fixed steps, an accumulator, at most a few per frame); the Node sim calls it in a loop.
- **Events** (typed, like `GameEvent`): what happened this step, for the view and the sounds: `FootSpawned`, `FootHit {foot, dmg, crit, source}`, `FootKilled`, `Stomped {foot, pizza, blocked}`, `SliceLost`, `PizzaDestroyed`, `Tips {n, at}`, `Quip {at, words, colour}` (words picked by the core where today they're a gameplay draw), `Look {look, at}` (the effect system's `Look`s and `PeelFx` fold in), `BossMove {boss, move, phase}`, `ShopOpened`, `WaveCleared`… Effects never draw already; after the split nothing in the core does.
- **Randomness**: one seeded `play` stream for every gameplay draw (rolls, picks, a foot's wander, a quip's words). Looks draw from the view's own cosmetic stream, which the core never sees, so **cosmetic numbers can no longer reach play**. (Today they do: a waiter's flung tray starts from where his swaying arm is drawn. The tray's start becomes core state.) The sounds' generator (`srand`) is the view's too.
- **The clock** (`GameClock`, stage 1): gameplay that waits or moves over time (a flight, a lunge, a wind-up, a prop's time limit) is a clock tween or timer, with Phaser's config shape so code moves onto it by changing where it's added.

### The view (`src/game/view/`, `src/scenes/`)

- **`GameScene` becomes the view**: it owns the `Game`, sends the input as commands, steps it, and draws: `FootView` (the rig, art, live art, shadows, icons, health bar) and `PizzaView` (the living pizza, freshness bar, perk label), reading their state each frame; the backdrop, camera, `Fx`, HUD and sounds, reacting to events.
- **Choreography** (a boss's squash on landing, a meteor's trail, a death's spin) is the view's own tweens, started on an event and timed from the core's numbers (a flight's duration, a move's wind-up). A view tween may never change state; the lint rule says so.
- **The HUD** reads the core's state each frame as it does now from the scene (`ui.hud.setScore(r.score)`, `setCombo`, `setSuper`, `setMomentum`, the boss bar) and shows events (banners, toasts).
- **The shop UI** is already data and callbacks (`src/ui/shopTypes.ts`: the scene builds a `ShopState` and the shop calls back). The core's `shop.ts` builds the same `ShopState` from its state (a pure function of the core), and the callbacks become commands. `ui.ts` (3,047 lines, DOM) doesn't change.

## Inventory: where rules and visuals live today

Sizes in lines. "Both" means one class or file holds state and Phaser objects together.

| File(s) | Lines | Holds |
|---|---|---|
| `src/scenes/GameScene.ts` | 5,962 | both: about 3,800 lines of rules (waves, lanes, spawns, smacks, damage, kills, stomps, shop rules, saves) and 2,100 of view (HUD, camera, backdrop, fx, input, cards) |
| `src/game/Foot.ts` | 1,323 | both: state and motion (`update`, statuses, guard, lanes) and its picture (rig, live art, shield, icons) |
| `src/game/Pizza.ts` | 773 | both: slices, freshness, shields, perk; its drawing and labels |
| `src/game/pizzaPerks.ts` | 2,938 | both: the perks' one-offs (`CUSTOM`) with their looks and props inline |
| `src/game/pizzaLegends.ts`, `pizzaLegends3.ts` | 828 + 712 | both: the Legendaries' one-offs and props |
| `src/game/toppingKit.ts` | 817 | both: the kit toppings' tricks and looks |
| `src/game/heroMoves.ts`, `godMoves.ts`, `heroKit.ts` | 2,167 + 2,064 + 524 | both: the heroes' and gods' moves, choreography inline |
| `src/game/zombiePeel.ts` | 704 | both: the outbreak's rules and looks |
| `src/game/bosses/*.ts` (17 files) | 20,327 | both, most entangled: moves are sequences of tweens and timers with the rules inside |
| `src/game/acts/*.ts` | 3,524 | both: act variants and their props |
| `src/game/events.ts`, `sightings.ts` | 267 + 181 | both: flyers, chests and sightings (the clickable rides the picture) |
| `src/game/guardShield.ts` | 1,166 | mostly view (the guard feet's shield art), some rules (block, chip) |
| `src/game/projectiles.ts` | 707 | both: the peel's thrown props; hits land when they arrive, on the world's `dt` already (`ThrowManager.update`) |
| `src/game/trayToss.ts` | 226 | both: the waiter's tray (flies on `game.loop.delta`, starts where the arm is drawn) |
| `src/game/Run.ts`, `perkBus.ts`, `peelBus.ts`, `perkEffects.ts`, `perkStats.ts`, `perkRules.ts`, `peelEffects.ts`, `shopDeals.ts`, `abilities.ts`, `peels.ts`, `buildStats.ts`, `cardText.ts`, `momentum.ts`, `dmgTally.ts`, `snapshot.ts`, `heatRules.ts`, `bosses.ts` (the director, minus its `tweens` and `fx` calls) | about 9,000 | rules, no Phaser (core already) |
| `src/effects/` | 3,711 | rules (core already) |
| `src/data/`, `src/content/feet`, `src/content/pizzas` | about 7,000 | data (core already; the feet's `art` hooks are the view's) |
| `src/game/Fx.ts`, `abilityFx.ts`, `pizzaAlive.ts`, `footLive.ts`, `liveKit.ts`, `legendAuras*.ts`, `legBadge.ts`, `zombieArt.ts`, `BackdropView.ts`, `sceneLive.ts`, `phaseCards.ts` (cards' data are core), `src/art/`, `src/content/art`, `src/content/style*`, `src/ui/` | about 250,000 | view |
| `src/systems/save.ts` | 392 | core, behind a storage interface (Node: in memory, as `?sim` already does) |

## How it gets there (each stage ships on its own, game unchanged)

Every stage keeps the game playing exactly as before, except where a stage says it shifts seeded runs once, deliberately. **The parity check for every stage:** `npm run check` (golden: no differences), `npm run sim:repeat`, and the stage's own scenario tables played before and after, every field compared. A stage that's a pure refactor must give identical runs; a stage that deliberately moves timing (stages 1 and 2) reports what changed and why, and every stage after it must be identical again.

1. **Gameplay timing off animations (done: see "Stage 1: what was built").** The game clock; every gameplay tween onto it; the lint rule; visual text off the gameplay random sequence.
2. **One clock: scene timers and real seconds onto the game clock.** The 439 `time.delayedCall` / `time.addEvent` calls (by file: `GameScene` 42, `act1b` 28, `pizzaPerks` 27, `act9` 27, `act10` 25, `act7` 22, `titanking` 19, `comics` 19, `act2b` 19, `heroMoves` 18, `pizzaLegends` 17, `gotham` 16, `act1a` 16, `godMoves` 15, and 30 more files) are sorted into gameplay (wind-ups landing: `windup()`, `dropOn`'s warning, `hitProp`'s `sec` and `onFail`, the second stomp of a double-stomper, Nonna's ladle's 240 ms, the cannon pie's and crouton's hits, `Action.Later` and the triggers' `delay` via `PlayCtx.later`, bosses' move sequences) and looks (a puff 80 ms later); the gameplay ones become `clock.after(ms, fn)` / clock tweens. The 184 gameplay reads of `now()` (real seconds: ink and soot holds, `until` cooldowns, boss timers) read `clock.now` instead. A lint rule (`effects/no-gameplay-in-timers`) like stage 1's, over timer callbacks. **This shifts seeded runs once** (anything on a scene timer or `now()` keeps the world's time from then on: slower in a slow-mo or Speed Force, frozen through a hit-stop), so it ships as its own change with the sim before and after. Its scenario tables: the bosses of acts 1–2 (their fights lean on timers most), the perks with `Later` and `delay`, ink and soot.
3. **Foot and Pizza split into state and view.** `FootState` (core) and `FootView` (draws it), `PizzaState` and `PizzaView`. The scene and the kits keep working on the same objects through a thin `Foot` that holds both (`foot.s` the state, `foot.v` the view) until the later stages stop using the view half. Positions that gameplay reads from a picture today move to state: clickables whose `x`/`y` read an image (`throwAtPeel`, `dropOn`, the fights' props, flyers, sightings), the waiter's tray. Pure refactor: identical runs.
4. **The kits' rules out of their looks.** `pizzaPerks.ts`, `pizzaLegends*.ts`, `toppingKit.ts`, `zombiePeel.ts`, `heroKit.ts`/`heroMoves.ts`/`godMoves.ts`: every one-off's look becomes a `Look` (or a `PeelFx`) event played by the view, its rules stay in the kit, now core. The `Custom` one-offs that share a shape become shared actions (a flight is `Action.Fly(time, hit)`, on the clock since stage 1). Their props' state (rings, ghosts, splats, walls, the hole) moves into core objects the view draws. Pure refactor.
5. **The scene's rules into the core.** `Game` takes `GameScene`'s rules in slices, each a pure refactor: waves, lanes and spawns; smacks, damage, kills, stomps; the shop and its commands (`ShopState` from core state); saves and snapshots; the peel. `GameScene` keeps calling them until it only steps the `Game`, sends commands and draws. The randomness moves to `rng.play` at the same draws in the same order (identical runs).
6. **The bosses, act by act** (below). Each act's fights are one change, with that act's boss waves as its scenario tables.
7. **The core runs in Node.** A Node test boots `Game` without Phaser, `window` or a canvas and plays a seeded run; anything that still reaches for Phaser fails it. The parity set (below) starts here.
8. **The sim rewrite** (below).

**Order:** stage 2 first (the clock is the core's spine, and it's the second and last deliberate shift), then 3 and 5's slices between Legendary batches, 4 alongside them, 6 an act at a time, 7 and 8 last.

## The bosses: the hardest part

20,327 lines in `src/game/bosses/` plus 3,524 in `src/game/acts/`. A fight today is a brain (`Brain`: `update`, `onPhase`, `onSmacked`, `onStomp`, `onDeath`) whose moves are written as chains: a tween moves the boss, its end starts a timer, the timer starts a prop, the prop's hit or time-out calls back. Rules and looks sit in the same callbacks: `a.shake`, `a.fx.ring`, `impactWord` beside `a.hitPizza`.

**How a move becomes core timeline plus view choreography:**
- **The timeline (core):** the move is a sequence on the game clock: the boss's motion as clock tweens of its state (`targets: f, y: …`: already so after stage 1), its waits as `clock.after`, its props as core clickables with hit counts and time limits, its outcomes as commands on the game (`hitPizza`, `stunPeel`, `damageFoot`). A small helper turns the chains into a readable script: `move(f).hop(to, 200).wait(160).hit(p, slices).then(next)`, built on `clock.tween` and `clock.after`, so a fight's code reads in order and can't leave a step on Phaser's time.
- **Events at each beat**: `BossMove`, `BossBeat {boss, beat: 'land' | 'windup' | 'strike' | …, at}`, `PropSpawned`, `PropHit`, `PropCleared`, `PropFailed`. The fight names its beats; the view's choreography for that fight listens.
- **The choreography (view):** per fight, a small file next to the art (`src/game/view/bosses/<act>.ts`) plays each beat: squash and stretch, the impact word, rings, shakes, the camera, the music cue. It reads the beat's numbers (when it lands, for how long) from the event, so a wind-up's look and its hit stay in step.
- **The phase cards and `howTo`** stay data, read from the brain (core) by the view (`phaseCards.ts` is data already).

**The rules that make it safe:**
- One act per change, its boss waves played before and after on every heat it differs on, every field identical.
- The boss lab (`?dev` + `devBossLab.ts`) plays each phase of each fight; each act's change is checked there by playing to each phase.
- The heaviest fights first, while the pattern is fresh: Act 1–2 (`act1a`, `act1b`, `act2a`, `act2b`: 6,560 lines), the Titan King (1,667) and Jörmungandr's rig (848), then the rest.
- Live backdrops that react to a fight (`a.sc.events.emit('redsole-march')`, the Bell Tower) listen to the fight's beats instead.

## The sim rewrite (stage 8)

- **A Node runner** (`scripts/sim/node.mjs`, run by `scripts/sim/run.mjs --node`, then by default): builds a `Game` per run with the run's seed and options, steps it at `dt` 1000/60 ms, and lets the bot act on its own schedule (`rate` ms), with no Vite, no Chrome and no page. TypeScript through `tsx` or a small esbuild bundle of `src/core` (esbuild comes with Vite).
- **The bot, ported**: `src/devSim.ts`'s bot (where it smacks, its accuracy, the light and idle bots, the shop's `rarity` and `auto` buying, the stall rules) moves to `src/core/bot.ts`, reading core state and sending commands. The Chrome sim uses the same bot, so the two play the same decisions.
- **Worker threads**: `--workers N` runs seeds on a `worker_threads` pool (one `Game` per worker at a time), so a table runs at the machine's cores.
- **The same CLI, report and results**: every option (`--heat`, `--runs`, `--waves`, `--peel`, `--lineup`, `--enhance`, `--toppings`, `--shop`, `--bot`, `--trace`, `--check`, `--from`…), `report.mjs`'s report and `results.json`'s fields are unchanged.
- **The Chrome sim stays as the parity check**: run by run, the Node sim and the Chrome sim must agree on every field. `npm run sim:parity` plays a small fixed set (like `sim:repeat`'s: the default table to wave 6, act1's projectiles, the zombie peel, top3's toppings, one boss wave of each act) on both and compares; it joins `npm run check` (a minute or two; Node's half takes seconds). `sim:repeat` keeps checking that each repeats itself.

## Risks

- **Seeded runs shift twice** (stages 1 and 2). Every number quoted from before them is from another seed in effect. After stage 2 every stage must be identical, and the scenario tables catch what isn't.
- **Order inside a frame.** Gameplay used to happen in Phaser's update order (scene timers, then tweens, then the scene's `update`); on the core it happens in the step's order. Stage 1 and 2 accept that change once; later stages must keep the core's order.
- **Hidden reads of the view.** Gameplay that reads a picture (a clickable's place from an image, the tray from the arm, a hit area from a texture's size, `f.root.scaleX` used as the boss's size) only shows when the core runs without a view. Stage 7's Node test finds the rest; stage 3 moves the known ones.
- **The bosses' size.** 24,000 lines, each fight its own. An act a change, the boss lab and the per-act tables are the safety net; the timeline helper keeps the ports uniform.
- **Two clocks for a while.** Until stage 2, scene timers and `now()` keep their own time beside the game clock: a move that mixes them (a clock tween whose end starts a scene timer) keeps both paces meanwhile.
- **Performance in the browser**: the view reading state each frame and the core's events instead of direct calls. Measured at each stage on a quiet machine (`?dev` FPS, a crowded boss wave), not assumed.

## Decisions (Tron, 2026-11-28)

1. **The step:** fixed 60 steps a second everywhere. An accumulator turns each frame into whole steps, and the view interpolates for smoothness. The Node sim and the real game run the same steps, and replays become possible.
2. **Hit-stop:** flights, lunges and foot deaths freeze with the world during a crit's hit-stop. One world, one clock.
3. **Between waves:** the game clock keeps running while the shop is open, so whatever is in the air lands or leaves.
4. **The run timer** stays real time, as today.
5. **New fights' choreography:** one view file per fight from the start (rules in the core, choreography in its view file).

## New content during the split (the Legendaries, feet, bosses)

- **From stage 1 on**: nothing a run depends on goes in a Phaser tween's or animation's callback, nor in a Phaser tween of a gameplay field. Use `clockOf(scene).tween({...})` (the same config) for anything that moves a foot or lands a hit, and keep Phaser's tweens for looks. The lint rule (`effects/no-gameplay-in-tweens`) fails `npm run check` otherwise.
- **New scene timers**: until stage 2, prefer `clockOf(scene).after(ms, fn)` for gameplay over `time.delayedCall`; stage 2's lint rule will then find nothing new to move.
- **Gameplay reads no picture**: a clickable's `x`/`y` and any hit shape come from state (a plain object the clock tweens), not from an image's position.
- **Randomness**: gameplay from `Math.random` (it becomes `rng.play` in stage 5); looks from `crand()`/`cpick()`.
- **Legendaries**: as in the effects plan's "How to add a new item"; a flight is a clock tween with its hit in `onComplete`; its look a `Look`.
- **Bosses**: beats named in comments (`// beat: land`), rules and looks in separate statements, so stage 6's port is mechanical.

## Stage 1: what was built (2026-11-28, branch core-1)

### The game clock (`src/core/clock.ts`)

- **`GameClock`**: tweens and timers on the world's time. `tween(config)` takes Phaser's tween config (targets, numeric props as a value, `'+=n'`, `{ from, to }` or `{ getEnd }`, `duration`, `delay`, `ease`, `yoyo`, `hold`, `repeat` including −1, `onStart`, `onUpdate`, `onYoyo`, `onRepeat`, `onComplete`; a counter with `from`/`to` and `getValue()`), `after(ms, fn)`, `killTweensOf`, `isTweening`, `tick(sec)`. Phaser's eases, copied formula for formula. A tween added during a tick starts on the next. `onUpdate` is called as Phaser calls it: once per prop per target, each after its value is set (a meteor's trail and a portal's shrink keep their pace). Phaser options it doesn't support (`repeatDelay`, `completeDelay`, `loop`, `timeScale`, `paused`, `persist`, `hold` without `yoyo`…) throw rather than being tweened as props. Pure TypeScript, written so Node runs it with its types stripped (`node --experimental-strip-types`): no Phaser, no DOM, no parameter properties.
- **Ticked with the world**: `GameScene.update` ticks it with `dt` (real time × hit-stop × slow-mo × Speed Force: the step the feet move on) every frame the game isn't paused, between waves and after a run's end too (what's in the air lands or goes).
- **`clockOf(scene)`**: the game scene binds its clock as it's created (`bindClock`, cleared each run); the feet, fights and kits reach it through their scene. A scene with no clock bound (the title screen's demo feet, a cutscene) gets one ticked by its own frames.
- **Killing a target's tweens** (`tweens.killTweensOf(img)`, `isTweening`) reaches its clock tweens too: the game scene's tween manager forwards them, so a smacked prop or a cancelled lunge stops as before.
- **Looks that carry a hit move with it.** A meteor's image is tweened on the clock with its hit: the look keeps the world's pace, so the hit and the picture land together. (The view stage splits the picture from the state.)

### Every gameplay outcome that waited on a tween, and where it went

Found by a type-aware scan of all 619 tween and animation callbacks and 1,024 tween configs (each callback's calls resolved to their declarations, each write to its type), then read one by one. **131 tweens moved onto the clock**, in 33 files. No sprite animations exist (`anims` is unused); the only other listeners are camera fades (leaving a run: not gameplay).

- **The flying hits** (`pizzaPerks.ts`, `GameScene.ts`, `toppingKit.ts`): Meteorite Margherita's meteor, Comet Calzone's comet, Bolognese's meatball (its drop and its roll), Snowball Pie's snowball (stun or slow), Volcano Calzone's lava bombs (hit and burn), Surtr's Ember Crust's spreading fire (the ember's flight, then the burn), Phantom Waltz's ghost flying to its post (it starts guarding when it gets there), the Olive Launcher's olive, Wood-Fired's fireball, Spare Napkin's heal.
- **The ink and soot lane change** don't wait on a tween (the foot is relaned as it's inked; the hold runs on `now()`: stage 2). What did: **a foot blinking to its new lane** (`Foot.blinkTo`: its `x` jumped to the new lane at the blink's midpoint, `onYoyo`), now on the clock.
- **Feet** (`Foot.ts`, `Pizza.ts`): a foot's death and its escape (it leaves the field, `state = 'gone'`, when its yank ends), the double-stomper's hop, a dodge, the piston lift of a pizza (its `y`).
- **The boss kit** (`bosses/kit.ts`): `throwAtPeel` (lands: the peel is hit), `dropOn` (the fall, its per-frame "boss gone" check, and the slice it takes).
- **The fights**, 89 tweens in 17 files: every boss lunge, hop, charge, slide and entrance that moves the foot (`targets: f`, 60 tweens: the boss's place is gameplay) or ends in a hit, a stun, a freeze, a summon, a shield or the end of a puppet hold: the Head Waiter's delivery and the King's decoy shuffle, the grab trap, the rocket, the sand, the pie lob (Act 1); the T-Rex's snack, the camera spin under which smacks land (`refreshPointer`), the eaten foot's exit (Act 1b); the drop, the peel toss, the kraken's ink (Act 2a); the falling props, the Zombie Loafer's bites, the cough cloud (Act 2b); Doomstomp's rampage, Thanfoot's stones to their sockets, the bombs (Act 7); the ice line, the fire trail (Act 8); the Minotaur's charge, wall crash and daze, Cerberus's heads (Act 9); the drops, the collection agents' shift, the buy-out stamp that doubles the next shop's prices, the Ghost of Feet Future's stomp (Act 10); Venom's surge hops, the Jokester's gifts and bombs (Gotham); the Titan King's seat moves, rock falls, chain drag across the pizzas, the chains' anchors (where their weak points are smacked) and the swing's phases, the pierce; Kratos's return to sender and wave; the Red Sole's blitz, Venomnom's tongue, the Flash's dash (comics); Leonidas's trample; the entrances in `nzkit` and Act 9.
- **Scene timers paired with a moved tween** (the review): a double-stomper's second stomp (180 ms, with its hop), the Red Sole's next step after a stomp (350 ms) and the Flash's landing (300 ms) were scene timers timed to end with a tween; they're `clock.after` now, so the step and the motion keep one pace in a slow-mo or Speed Force.
- **The heroes and gods** (`heroMoves.ts` 14, `godMoves.ts` 5): landings that stun, the coin barrage, the sword and dash sweeps, the portal's kills, the gavel, the chain hits, the sliders; Poseidon's wave, lifts, the marks, the golden apples' slices, the lightning.
- **Acts and events**: the bat-gold (Gotham), the slice saved (Act 9), the Persian arrows that pin the peel, the rainbow sweep, the lightning and the web (`variants.ts`); wave-event flyers and chests and hero sightings (missed when their flight ends; the top hat's card drop).

**Left on Phaser's tweens, as looks** (checked): `abilityFx.ts`'s throws (a look; the hits land on `projectiles.ts`'s own `dt`), the cutscenes (`ending.ts`, `trailer.ts`), the speech bubbles, the whip and rays, Loki's secret on the Pizzeria board (not a run), live backdrops.

### What changes for a player

- **Flights, lunges and deaths now keep the world's pace.** Before, they ran on the tweens' clock: 0.4× in a slow-mo (the world 0.3×), full speed through a hit-stop (the world 0.06×) and through Speed Force. Now they slow with the world. Noticeable:
  - **a meteor, comet, meatball or lava bomb in flight during a slow-mo** (a boss's phase change or death: 0.6–1.4 s) lands about a third later in real time than before (0.3× not 0.4×), still exactly as the world sees it;
  - **during Speed Force** (the Flashfoot, ×0.25) a flight takes four times as long in real time, as the feet do; before, flights ignored it;
  - **a crit's hit-stop** (70 ms at ×0.06) now freezes whatever is in flight and a dying foot's yank for that moment (before, they carried on through it);
  - the bosses' lunges and drops likewise.
  Outside those moments nothing changes: at full speed the clock and the tweens run alike.
- **Seeded runs shift** (see the sim below): the order inside a frame changed (gameplay used to land inside Phaser's tween step, before the scene's update; it lands at the start of the world's step now), and the timings above.

### The lint rule (`effects/no-gameplay-in-tweens`, `tools/eslint/tweens.js`)

- **Where**: the callbacks (`onStart`, `onUpdate`, `onYoyo`, `onRepeat`, `onLoop`, `onComplete`, `onActive`, `onStop`) of an object given to a Phaser tween maker (`X.tweens.add`, `addCounter`, `chain`, `addMultiple`, `timeline`), and listeners of a tween's or sprite's own events (`on`/`once` with `'complete'`, `'yoyo'`, `'repeat'`, `'animationcomplete'`… or a `Phaser.Tweens.Events` / `Phaser.Animations.Events` name; not a scene's, loader's or input's events). Everything inside them is checked, nested functions and timers too. `src/**` but the dev tools and the trailer.
- **"Gameplay", precisely** (by spelling, as the other rules):
  - calls of gameplay verbs: damage and kills (`dealDamage`, `damageFoot`, `hitFoot`, `killFoot`, `hurt`, `kill`, `legendDmg`, `smack`); slices and pizzas (`hitPizza`, `hitSoft`, `heal`, `healPizza`, `loseSlice`, `freezePerk`, `freezeSolid`, `ignite`, `possess`); a foot's state (`stun`, `knock`, `setState`, `escape`, `die`, `revive`, `zombify`, `morphIntoLoafer`, `slow`, `dodge`, `blinkTo`); the peel (`stunPeel`, `slowPeel`); spawns, lanes and the fight's flow (`spawn`, `spawnExtraBoss`, `relane`, `assignLane`, `lockLane`, `retreat`, `setMinions`, `pauseSpawns`, `order`, `hurry`, `cancelHurry`, `takeLane`, `windup`, `hitProp`, `twin`, `shield`); tips, score and the meter (`giveTips`, `addScore`, `addCoins`, `chargeMeter`, `recompute`); the continuations fights pass down (`onLand`, `onLanded`, `land`, `onHit`, `onClear`, `onFail`);
  - gameplay random draws: `Math.random()`, `rnd()`, `Phaser.Math.Between`/`FloatBetween`/`RND`, `Phaser.Utils.Array.GetRandom`/`Shuffle` (`crand`/`cpick` are allowed);
  - writes to gameplay fields (`hp`, `maxHp`, `armor`, `puppet`, `shielded`, `target`, `laneX`, `laneSide`, `laneRow`, `stunT`, `slowT`, `slowPct`, `burnT`, `burnDps`, `burnFromAbility`, `frozen`, `vuln`, `phase`, `hurry`, `speedMul`, `held`, `pinned`, `vy`, `hoverY`, `stateT`, `coins`, `score`, `super`, `combo`, `buyout`), to anything under a `brain` or the `run`, and to a foot's `x`/`y` (`f.x`, `foot.y`, `boss.x`).
  - A call through a look's own object is never gameplay: anything under `fx`, `audio`, `cameras`, `add`, `make`, `tweens`, `textures` (`a.fx.burn` is a flame).
- **And a Phaser tween of a foot's place**: `targets: f` (`foot`, `boss`; `this` inside `Foot.ts`) with an `x` or a `y`. A foot's picture (`f.root`) is a look.
- **Allowed only by listing**: a visual-only callback that uses one of those names says so right before it, with its reason: `// visual-only: <why>`. One in the game: the ending's cutscene (`dust.spawn`, a particle puff).
- **Tests**: 29 cases (11 valid, 18 invalid) in `tools/eslint/effects.test.js` (120 in all). Run over the code before this stage, the rule reports 176 problems in 26 files: every one of them is among the moves above (plus the cutscene's puff, now listed).
- **What it can't see**, and the scan caught: gameplay through a generic name (`f.destroy()` at a death's end, a `done = true` flag that a clickable reads, `g.ready = true`, a counter tween whose value a clickable reads), and a callback passed by name (`onComplete: done`). Those were found by the type-aware scan and moved; the rule keeps the common shapes out.

### Visual text off the gameplay random sequence (its own commit, 230229e)

Phaser gives every `Text` and `TileSprite` a texture key that draws 31 numbers from `Math.random`. `src/systems/cosmeticText.ts` (installed in `main.ts` before the game boots) runs `scene.add.text`, `scene.add.tileSprite`, `scene.make.text` and `scene.make.tileSprite` under `cosmetic()`, so the keys come from the cosmetic generator. (No game code makes one with `new`.) A damage number or quip made when `Fx`'s text pool is empty no longer moves gameplay rolls, and nor does a pizza's label. **This shifts seeded runs once.** The golden check's snapshot moved for the builds whose seeded picks drew after a pizza was placed (each pizza made a `Text` from the build's seeded `Math.random`): Arcobaleno's, Mystery Meat's and Kitchen Sink's picks in 29 numbers of their builds and the mixed builds holding them (written with `npm run golden -- --write`); no other number moved.

### Checks

- **`npm run check`** passes: types, the lint rules' 120 tests, the lint (the new rule included), and the golden check (no differences after the Text commit's snapshot).
- **`npm run sim:repeat`** passes: all 4 sets identical, every field.
- **Scenario tables, before (the Text commit, 230229e) and after (this stage, run again after the review's fixes: the same numbers)**, 2 runs × 15 waves each, every field compared (`scripts/sim/run.mjs --runs 2 --waves 15 --shop auto --workers 2`):

  | Table | Run | First wave that differs | Reached | Slices lost | Crusts |
  |---|---|---|---|---|---|
  | projectiles (`--lineup dragonfruit,discodiner,meteorite,cometcalzone,snowballpie`, Mild) | seed 1 | 2 | 16 → 16 | 3 → 4 | 95 → 95 |
  | | seed 2 | 8 | 16 → 16 | 3 → 3 | 93 → 92 |
  | kills (`bolognese,volcano,embershade,phantomwaltz,surtrsember`, Mild) | seed 1 | 15 | 16 → 16 | 5 → 5 | 92 → 92 |
  | | seed 2 | 5 | 16 → 16 | 2 → 2 | 94 → 97 |
  | ink and soot (`squidinknero,chimneysoot,meteorite`, Mild, the light bot) | seed 1 | 3 | lost at 5 → lost at 5 | 23 → 14 | 11 → 13 |
  | | seed 2 | 2 | lost at 5 → lost at 5 | 20 → 28 | 11 → 11 |
  | toppings (`--toppings woodfired:2,sparenapkin:1`, Mild) | seed 1 | 5 | 16 → 16 | 8 → 2 | 94 → 94 |
  | | seed 2 | 7 | 16 → 16 | 4 → 8 | 95 → 95 |
  | Regular (`meteorite,cometcalzone,bolognese`) | seed 1 | 2 | 16 → 16 | 13 → 39 | 186 → 184 |
  | | seed 2 | 2 | 16 → 16 | 54 → 41 | 180 → 187 |

  **No run stays identical, as expected**: every kill now leaves the field on the world's time (a death's yank slows with a crit's hit-stop and a slow-mo, so a dead foot leaves its lane a few frames later or sooner), and gameplay lands at the start of the world's step rather than inside Phaser's tween step, so the gameplay random draws come in another order from the first kill on. Like the Text commit, it's a new seed in effect: each run reaches the same wave, crusts move by under 4% (the light bot's ink table, which loses at wave 5 with 11 crusts, by 2), and slices lost swing both ways (the light bot's ink table and Regular seed 1 most: they lose pizzas, where one late stomp decides a slice). Boss waves 5, 10 and 15 (Act 1's fights) are inside every table.
- **Every boss wave** (`--from N --waves N`, Regular, waves 5 to 200 in steps of 5: 40 fights, every act's): no errors. The bot reaches the next wave or loses as a fresh kit does; wave 200 stalls on a screen the bot can't get past, as it does before this stage.
- **The clock alone in Node** (`node --experimental-strip-types`, a scratch test): yoyo, repeat, `onYoyo`/`onRepeat`/`onComplete` order, a tween stopped in its own `onUpdate` or `onYoyo` (no `onComplete`), `after`, and the unsupported options throwing.
- **Review**: an independent review of the diff. Fixed from it: `onUpdate` once per prop per target, as Phaser (it was once a frame: a portal's shrink ran at half rate, trails were thinner); the three scene timers paired with a moved tween onto the clock; a tween stopped in `onYoyo` no longer gets one more update; unsupported Phaser options throw; the lint rule also flags a Phaser tween of a foot's place and `this.x` in `Foot.ts`. Noted, not changed: the game clock is cleared at the next run's start rather than at the scene's shutdown (its tweens hold their targets until then); the dev style sheet's slow motion (`tweens.timeScale`) doesn't slow the clock.
- **`?dev` play** (own Vite on port 5640, one headless Chrome): the meteor, the comet, the meatball, the snowball, Volcano Calzone's lava bombs and Surtr's spreading fire, each fired by hand on a fresh run: each picture flies and lands on its foot as the hit lands (the clock moves both, so they land on the same step), the foot's health, stun or death changed only then, and no console errors.
