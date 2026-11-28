# Effects plan: one plug-and-play system for perks, toppings and peels

Status: **approved; step 1 done (2026-11-27, branch effects-1): units, stat definitions, the modifier ledger, STATS from the ledger. Step 2 done (2026-11-28, branch effects-2): the balance sim made repeatable, the golden check, the trigger bus, the perks' behaviours ported (most families), one deal function for shop cards, and typed names for sources, tags and units. Step 4's lint rules done early (2026-11-28, branch effects-lint): `npm run lint` and `npm run check`. Tron's four rule decisions (2026-11-28, branch rules-1): reach cuts on the base, Exclusive Menu redesigned, a possessed pizza's perks all stop, looks on cosmetic randomness. Readable item declarations (2026-11-28, branch items-1, pulled forward from step 4): typed rarity and item names, named item fields, card text generated from the effects, the shop card's fixed slots.** See "Step 1: what was built", "Step 2: what was built", "Lint rules", "Rule decisions" and "Item declarations and card text" at the end.

## The problem

Anything that changes the game is wired by hand in several places, and each place has to know about each item:

- **Toppings** change numbers through their `apply(stats, level)` in `src/data/toppings*.ts`, and some act in play through checks by id spread across the scene (`run.level('happyhour')` and similar).
- **Pizza perks** add numbers through `c('perk')` in `Run.recompute`. Their behaviour lives in `src/game/pizzaPerks.ts` (about 2,800 lines, with more than 200 checks by perk name).
- **Peels** have their own effect list in `src/game/abilities.ts`. The heroes and the Pizzeria's upgrades have their own paths too.
- **The STATS tab** (`src/game/buildStats.ts`) has a hand-written tile for each number. A new number with no tile went unseen; Mac & Cheese's extra card was one.

Today's safety net (9b94642): a number that no tile shows is listed under **More effects**, and the dev build logs a `[stats]` error. That stops things going missing from the STATS tab. It doesn't fix how they are wired.

## The idea: items declare effects, and adapters do the rest

Every item (topping, pizza, peel, hero, Pizzeria upgrade, Legendary) declares a list of **effects** built from a small, shared vocabulary. It no longer writes code that pokes at the game. Each kind of effect has one **adapter** that knows three things:

1. how to apply it in play, in one place for every source;
2. how to show it on the STATS tab, with its tile, number, note and "from" chips;
3. how it scales: level, enhanced, Napoletana's boost, Echo Slice copies, heat for Legendaries.

Items say what they do in one line each:

```ts
effects: [
  Effect.Stat(Stat.ConsumableCards, Op.Add(1)),                         // Mac & Cheese
  Effect.OnKill(Unit.Chance(15), Action.Summon(Ally.FriendlyGhost)),         // Phantom Waltz
  Effect.Every(Unit.Seconds(20), Action.BlowUp(Target.Diving)),              // Steam Bun Pie
  Effect.OnStomp(Unit.PerWave(1), Action.Block(Unit.Seconds(1))),                 // Granite Crust
]
```

**Arguments are plain and positional, and every number carries its unit.** `Unit.Chance(15)`, `Unit.Seconds(20)` and `Unit.PerWave(1)` give **branded numbers**. Like everything else, the units sit under one name, `Unit.`, so typing it lists them all and none can clash with a stat or an ally of the same name.
- **At typecheck:** `Seconds` is its own type, so passing one where a `Chance` belongs doesn't compile, and neither does passing a bare `20`.
- **At run time:** each is an ordinary number. The maths works on it directly, saves store `20`, and it costs nothing.
- **Range checks:** each unit's function checks its own range, so a chance must be 0–100%.

A class (`new Seconds(20)`) would add costs and protect less:
- Two classes with the same shape are interchangeable in TypeScript, so `Seconds` and `Chance` would still swap unless branded anyway.
- Every use would need `.value` or a method.
- Saving one gives `{ value: 20 }`, which loses the class on load.

**Chance and Percent are different units.**
- **`Unit.Chance(15)`** is a probability: it gets rolled.
- **`Unit.Percent(10)`** is a size: +10% damage, 30% slower.

Both are written the way people say them (15, 10) and stored as fractions (0.15, 0.1), so the maths is the same everywhere and nobody has to remember which form a number is in.

**The units hold no maths of their own.** They are plain numbers. What can be done with each lives beside it in the unit's module, so it's never redone by hand in an effect:
- `Unit.roll(chance)`: the one place gameplay rolls happen (`Math.random`, seeded in the sim);
- `Unit.boost(value, percent)` and `Unit.cut(value, percent)`: grow or shrink a number by a percentage;
- `Unit.ticks(seconds, dt)`: timers.

Totals (how bonuses stack, in which order, and their caps) aren't the units' job. They belong to the modifier ledger below.

An effect takes a typed object only where it has optional extras.

Each kind of effect is written **once**, in its own file: its fields, and what it does in play, on STATS, when scaled and in searches. Writing it once gives both the `Effect.OnKill(...)` used above and its registered behaviour:

```ts
// effects/onKill.ts: everything about "on kill", in one place
export const OnKill = effectKind('onKill', {
  // its fields (typed; a missing one doesn't compile)
  make: (chance: Chance, action: ActionData) => ({ chance, action }),
  // what it does in play, through a small interface onto the game
  apply: (e, ctx) => ctx.on(GameEvent.Kill, (foot) => { if (ctx.roll(e.chance)) runAction(e.action, ctx, foot); }),
  describe: (e) => `${pct(e.chance)} of kills: ${describeAction(e.action)}`,  // card text and STATS tile
  scale: (e, k) => ({ ...e, chance: Math.min(1, e.chance * k) }),              // enhanced, Napoletana, Echo Slice
  tags: (e) => actionTags(e.action),                                            // "summons", "freezes", ...
});

// effects/index.ts: the list of every kind (typed: one missing a method doesn't compile)
export const Effect = { Stat, OnKill, Every, OnStomp /* ... */ } as const;

// the game: no switch, no knowledge of the kinds
for (const e of item.effects) effects.apply(e, ctx);
```

- `Effect.OnKill(…)` builds the effect: plain data, tagged with its kind. Echo Slice can copy it and searches can find it by tag. Runs save item ids, not effects.
- `effects.apply(e, ctx)` (and `describe`, `scale`, `tags`) looks up the effect's kind and runs that kind's code. Nothing outside the kind's file needs to know what it does.
- The tag in the data is a string underneath (`'onKill'`) so saves stay readable and stable when kinds are added (numbered enums would shift and break old saves), but code never types it: it only appears in the one line that declares the kind.
- `ctx` is a small interface onto the game (subscribe to an event, roll, find feet, run an action), so effects never reach into the scene.

- **Stat effects** (a number goes up or down) need no code at all: the STATS tab finds them, and their sources, from the declaration.
- **Trigger effects** (on kill, on smack, on stomp, every N seconds, at wave start, on a pizza lost, on a boss beaten) run through one trigger bus. A source subscribes by declaring the trigger, and the bus handles stale, frozen, possessed, Ghost echoes and twins once, for everything.
- **Actions** (freeze, stun, burn, knock back, hold the dive, block a stomp, heal slices, pay tips, hit for ×N) are shared. Snowball Pie's freeze and Frostbite's "frozen" are then the same thing, so "chilled or frozen feet take +25%" finds every source of a freeze automatically.
- **Tags** come from the effects. "Which items freeze feet?", "which pizzas burn?" and "what can Echo Slice copy?" become queries, not lists kept by hand.

### Numbers: one modifier ledger

Every number goes through one resolver. Sources no longer change `stats` directly: each adds **modifiers**, as in `{ stat: 'damage', op: 'mul', value: 1.1, source: 'pizza:margherita' }`.
- **Folding:** the resolver folds them in a fixed order (base, then adds, then multipliers, then caps) and keeps the breakdown.
- **No purchase order:** totals never depend on the order things were bought. Today they can, by accident. `Run.recompute` applies toppings in the order they were bought, and two stats mix flat and percentage changes:
  - **Smack reach:** Long Handle +6 and Glass Peel ×0.85 give `(r + 6) × 0.85` or `r × 0.85 + 6` depending on which came first.
  - **Knockback:** Magnet Peel +60 and the ×1.4 topping have the same problem.

  The ledger's fixed order removes it.
- **STATS reads that breakdown:** each total, and what made it, comes straight from the ledger. It no longer works the stats out again without each item, and multiplied bonuses and caps are attributed correctly.
- **Growing values are functions of the run:** for example Peel Collector's `value: (run) => 0.01 × floor(peels / 10)`, with a `why` ("64 peels owned"). The NOW tag on the shop card, the STATS tile and play all read the same definition. Today's `PerkKit.perkNow()` folds into that.

### Types, not loose strings

Each effect is typed by its kind: `Effect.OnKill(...)` only accepts an on-kill's fields, and what it returns is an on-kill, never a loose object. The list of kinds is checked so every kind has its `make`, `apply`, `describe`, `scale` and `tags`. Stats, events, allies and targets are typed constants (`Stat.ConsumableCards`, `GameEvent.Kill`), so a typo can't compile. This is the guarantee that stops a detail going missing.

Odd one-offs (the Black Olive Hole's pull, the Hammy Ha beam) stay as custom actions. They plug in through the same trigger and STATS adapters, so they still get their timing, scaling and tile for free.

### Also in the design

1. **Stats are defined like units: one entry each.** For example: `Stat.CritChance = stat({ unit: Chance, stack: Stack.Add, cap: Unit.Chance(85), label: 'Crit chance', icon: '🎯', section: Section.Damage })`.
   - The ledger reads its stacking and cap from there.
   - The STATS tab draws its tile from there, so a new stat gets a tile by being defined.
   - Mac & Cheese's miss can't happen again.

2. **Values that grow are a type too.** A `Value<T>` is either a fixed `T` or a function of the run with a reason, for example `Grows((run) => Unit.Percent(Math.floor(run.peels / 10)), (run) => `${run.peels} peels owned`)`. The NOW tag, STATS and play all read it.

3. **Conditions are typed:** `Cond.Frozen`, `Cond.Burning`, `Cond.Boss`, `Cond.Undead`, `Cond.InLane`, `Cond.Diving`, combined with `Cond.Any` and `Cond.All`.
   - Frostbite becomes `Effect.DamageTaken(Cond.Any(Cond.Frozen, Cond.Chilled), Unit.Percent(25))`.
   - "Which pizzas care about frozen feet?" becomes a search.

4. **Statuses are defined once:** freeze, chill, stun, burn, stone, held, lost. Each status says:
   - how it stacks (refresh, extend or strongest wins);
   - who is immune (bosses, the undead, friendly zombies);
   - how it shows on a foot.

   Batch 2's "never strengthen a boss's slow" and "frozen feet stay frozen" fixes become rules written once, not checks scattered through perks.

5. **Off-switches in one place.** Stale, frozen, possessed, Ghost echoes and twins are handled by the trigger bus for every source, and so is "no payouts for decoys".

6. **Card text comes from the effects.**
   - `describe()` writes the perk line, the enhanced line and the STATS note, so the card and the behaviour can't drift apart.
   - A hand-written line is still allowed for flavour, but a dev check compares its numbers with `describe()`.

7. **Items are saved by id, not by effect.** Definitions live in code. A run saves item ids, levels and each effect's live state (timers, counters, the Forge's waves), keyed by source. Changing a definition then never breaks an old save.

8. **Effects never draw.** Each action fires an event, such as frozen, blocked or summoned. The presentation layer (living pizzas, ability visuals, sounds) listens and plays it. Gameplay and looks stay apart, which keeps the balance sim fast.

9. **Tests per kind.** Each effect kind gets a small test against a fake `ctx`. A golden test then runs the balance sim on fixed seeds before and after each port.

10. **Old and new side by side.** Anything not ported yet stays in its old code path, untouched, and is listed in this doc (step 2's "What's left"). Nothing is wrapped: there's no `Effect.Legacy` (it was built in step 1, never used, and deleted in step 2 by Tron's call). The port goes a family at a time while the game keeps working.

## How it gets there (each step ships on its own, game unchanged)

1. **Inventory and vocabulary:** list every effect today (toppings, perks, peels, heroes, meta) and group them into stat effects, triggers and actions. Write the vocabulary and its adapters. Port the stat effects first (the easy majority). STATS reads the declarations, and every hand-written tile becomes an adapter's display.
2. **The trigger bus:** port the pizza perks' behaviours from `pizzaPerks.ts` onto triggers and shared actions, one family at a time (timers, on-kill, on-stomp, on-smack, wave start). Each family is checked with the balance sim for identical numbers before and after.
3. **Toppings and peels:** move their in-play checks by id onto the same bus. Peel abilities' `fx` become the same actions.
4. **Guards:** a typecheck rule that every item declares at least one effect, and a dev audit (`F.effectsAudit()`) that puts every item through the adapters and flags any item with no declared effects (it's still on an old code path). Nothing can be invisible on STATS or skip the stale/frozen rules. A lint rule: one effect per line, no arithmetic in declarations (done early: see "Lint rules").

**Order:** best done **before the remaining 21 Legendaries**, so they're built on it rather than adding more one-off wiring. Act 3's batch is already under way and is ported in step 2 like the rest.

**Checks for every step:**
- the balance sim on fixed seeds gives the same results before and after (a refactor, not a rebalance);
- `?dev` play of each family;
- the STATS tab compared against the current one;
- an independent code review.

## Step 1: what was built (2026-11-27, branch effects-1)

Units, stat definitions, the modifier ledger, and the STATS tab read from the ledger. Every number in `Stats` now goes through one resolver.

**The modules** (`src/effects/`):
- `units.ts`: `Unit.Chance`, `Unit.Percent` (written as people say them, stored as fractions), `Seconds`, `PerWave`, `Px`, `Mult`, plus `Count`, `Amount` and `Rate`. Each maker checks its range (a dev build throws). The maths sits beside them: `roll`, `boost`, `cut`, `scale`, `scaleChance`, `tick`, `of`, `show.*`.
- `stats.ts`: `STAT_DEFS`, one definition for every key of `Stats`, typed as a `Record` over the keys. A new stat without a definition doesn't compile, and neither does one without a `Stat.` name. Each definition gives the stat's unit, how it stacks (`Stack.Add`, `Mul`, `Flag`, `Max`), its base (`baseStats()` is built from them), its caps, its label, icon and section, how its number reads, and whether more is better (`Better`, which replaces `BAD_UP`). `DOUBLE_CAP` and `TIP_MULT_CAP` live here now.
- `ledger.ts`: `Ledger`, `Phase`, `Value`/`Grows`, and the breakdown.
- `kind.ts`, `stat.ts`, `when.ts`, `index.ts`: `effectKind()`, `Effect.Stat` with its typed `Op.*`, run-wide conditions (`When.Freshness`), and the registry (`effects.apply/describe/scale/tags`, `applyAll`). (Step 1 also had `legacy.ts` and `Levels`; step 2 removed both: see "Step 2: what was built".)

**The fold.** Modifiers go in five fixed phases, each folded on the one before:
1. **Build:** the Pizzeria's upgrades, toppings and the table's perks.
2. **Peel:** the peel's and the hero's always-on stats. Then the definitions' caps: floors and the tips' soft ceiling here only, hard ceilings after every later phase.
3. **Tricks:** The Last Slice, Midnight Snack.
4. **Haunt:** the Ghost's possession.
5. **Table:** Napoli DOC, Peel Collector, Combo Champ, Speed Slice, the crust perks, the Forge, the Saga, Kitchen Sink.

Within a phase the order is: the highest Set, then adds, then multipliers, then flags, then the sources' own bounds, then caps.

The phases keep everything else exactly where it was. Only purchase order went:
- **Smack reach and knockback** now always take their flat changes before their multipliers. Long Handle +6 with Glass Peel ×0.85 gives `(26 + 6) × 0.85` whichever came first; Magnet Peel +60 with Spring-Loaded ×1.4 likewise. (Since rules-1, a cut on reach or knockback goes on the base only: `26 × 0.85 + 6`. See "Rule decisions".)
- **Every other number is bit-identical** across 2,473 builds. To get that:
  - adds and multipliers apply one at a time in the order they were added;
  - the perks go in their old order (`PERK_STATS`);
  - Pepperoni's and the luck pizzas' tips stay one sum (`PERK_TIPS`).

  A last-bit difference in tips once changed what the balance sim's bot could afford.

**The breakdown.** Each stat keeps each source's share of its change:
- adds count at face value;
- a phase's multipliers share what they add between them by the log of each, so a ×0.85 gets a negative share;
- caps get their own share (`CAP_SOURCE`).

The breakdown is worked out only when it's read (the STATS tab, the NOW tags). Resolving keeps just a list of credits.

Sources are `top:<id>`, `pizza:<type>#<n>`, `meta`, `peel` and `ghost`. A pizza's `n` is its own id while it's on the table, so moving it doesn't change its source (`PizzaPerkKit.srcOf`, `pizzaOf`).

A perk the whole table shares (counted by strength) is one modifier, shared between its pizzas by weight. Napoletana gets the part its boost adds to every other perk (`Run.withBoost`), so it keeps its chips. The NOW tags leave Napoletana's part in the pizza's own number, as before.

**Growing values.** Peel Collector, the Forge, the Saga and Napoli DOC are `Grows(at, why)` values, worked out when the ledger resolves. `PizzaPerkKit.perkNow` (the shop card's NOW tag) reads the same modifiers, this pizza's part of them, worked out now.

**What moved.** Every source of stats is on the ledger:
- **Toppings:** each declares `effects: [Effect.Stat(...)]`.
  - Freezer Burn, Garlic Lightning and the Olive Launcher split their first level from the rest (step 1 by `Levels.First`/`Levels.Later`; step 2 by an `EachLevelUp` chain on the op).
  - The freshness trade-offs' catches wait on `When.Freshness`/`When.NoFreshness`.
  - Full Tank and the Olive Launcher's first level are Sets.
- **Pizza perks' stat parts:** `src/game/perkStats.ts`.
- **The rest:** meta upgrades, always-on peel and hero stats, the topping tricks, the Ghost's possession, and the table-shaped perks (`PizzaPerkKit.modifiers`, which replaces `afterRecompute`).

**STATS.** `buildView` takes the breakdown and a source-to-chip resolver:
- **Simple tiles:** `statTile(k)` builds a tile from the stat's definition (label, icon, number, tone, note, "at the cap") and its breakdown.
- **Combined tiles** (DPS, per smack, automatic attacks, cards per shop…) stay hand-written. They read the ledger's totals, and their chips come from the breakdown.
- **Changed stats with no tile:** any stat something changes that no tile shows gets its own tile in its section. The event toppings' flyers, chests, mimics, drops, sightings, Infinite Oven's levels and the free-topping perk all show now.
- **More effects** now lists only toppings that work in play and that no tile names, such as Happy Hour and Bulk Buy.
- **No more recomputing:** `statsView` no longer works the stats out again without each source.

**Notes:**
- The shop still caps the topping discount at 60% where it's used (`shopDeals.ts`). The stat itself has never been capped. Its tile notes the cap.
- A definition's `around` lets a multiplier scale more than the stat (Combo Champ multiplies the whole combo window, base length included).
- `Stack` drives the ledger for flags and Sets: the highest Set wins, or the lowest for `Stack.Min` (a sure hero sighting every 10 waves beats every 20). For `Add` and `Mul` it describes the stat.
- **The balance sim couldn't compare two builds run by run.** A no-op comment added to `GameScene.ts` on main changed Mild seed 1 from wave 3. Step 2 found the cause (real time, not the source text) and fixed it: see "The balance sim is repeatable" below.
- The golden comparison and the screenshots for this step were scratch scripts (`F.scene('Game').computeStats()` over fixed builds). Step 2 made the golden a checked-in dev check (`npm run golden`).

**Step 2 starts from here:**
- The trigger bus extends `EffectCtx` (subscribe to a game event, roll, find feet, run an action). The kinds go next to `stat.ts`, one file each, registered in `index.ts`.
- `pizzaPerks.ts`'s behaviours port family by family. The checks for each family: golden builds plus the balance sim on fixed seeds.
- **Shop cards:** every way of dealing them (a normal shop, boss loot, rerolls, Booster Gouda's coming shop, the hero shop) goes through **one deal function** that reads the ledger's card-count total (`cardDelta`, `extraConsumable`, Exclusive Menu's rarity bump).
  - Boss loot missed Mac & Cheese's card until a shared `addExtraConsumables()` fixed it: the same class of miss the ledger removes for numbers.

## Step 2: what was built (2026-11-28, branch effects-2)

The balance sim made repeatable, a checked-in golden check, the trigger bus with its shared actions and statuses, the pizza perks' behaviours ported onto it family by family, one deal function for shop cards, and typed names where step 1 left loose strings. A refactor: no number and no run changes.

### The balance sim is repeatable

**The cause.** Not the source text: real time. The no-op comment only changed which tab happened to get Mild seed 1. Four things leaked real time into a seeded run:
- **The art warmer.** The game draws feet and pizzas in idle time before they're needed. How much of it a page had drawn before a run began depended on how long the page had sat idle, and a background tab gets few idle slots. A run that met a foot not yet drawn drew it in play, and played out differently (traced to wave 3's Head Waiter fight: the tray's flight and where the bot's smacks landed).
- **Background tabs.** The sim opened its worker tabs in one window, so all but one were background tabs. A background tab gets no animation frames, so its page never finished booting: it sat out the 3-minute ready wait before every run and then started from a half-booted page.
- **The cosmetic generator's seed.** `crand()` (cosmetic randomness) is seeded from the page's clock. Cosmetic numbers reach play through what's drawn where: a waiter's flung tray starts from where his swaying arm holds it, and the bot's smack meets it there.
- **The loop's frame figures.** The sim sleeps Phaser's loop and steps the scene itself, but `game.loop.delta` kept whatever the last real frame left, and the waiter's tray (`src/game/trayToss.ts`) flies by it.

**The fix.**
- Under `?sim` the warmer draws nothing in idle time and the art cache is off (`src/game/assets.ts` NO_WARMER, `src/game/artCache.ts`): every piece of art is drawn when it's first wanted, at the same moment of every run.
- `scripts/sim/run.mjs` opens each worker's tab in a window of its own (`Target.createTarget` with `newWindow`). This also makes the sim much faster: a 2-worker sim no longer waits about 4 minutes on the background tab.
- `src/devSim.ts` seeds the cosmetic generator from the run's seed as each run starts (`seedCosmetic`, `src/systems/cosmeticRandom.ts`), and pins `game.loop.delta`, `rawDelta`, `actualFps`, `time` and `now` to the sim's own step during a run, and puts them back after.

**The proof.** `nice npm run sim -- --heat mild,regular --runs 2 --waves 40 --shop auto --workers 2` run twice on the same code and once more with a no-op comment at the top of `GameScene.ts`: all three identical, all four seeds, every wave record (and so was the first form of the fix, three times, with the old runner). (Before the fix, the same code twice gave Mild seed 1 two different runs from wave 3.) The last leak (the cosmetic seed) showed only when the same code ran from two checkouts (a copy of the worktree): with it fixed, the before-port copy, the worktree and a second copy of it give the same traced run, random draw by random draw.

How the causes were found: `--trace <wave>` records where every random number in that wave came from; step 2 added a per-step record of the field (each foot's place, health, state, slow and stun) and of every smack's result, to find changes that draw no random number.

Also new in the sim: `--lineup id,id,id` and `--enhance` start every run with that table (checking a perk family before and after a change), `--cache-dir` (or `SIM_CACHE_DIR`) gives it its own Vite cache, and Vite serves with `fs.strict: false` (a symlinked `node_modules` in a worktree, whose fonts were refused).

### The golden check

`npm run golden` (`scripts/golden/run.mjs`, the builds in `src/devGolden.ts`) starts its own Vite and one headless Chrome, works out the run's `Stats` with the game's own `computeStats()` for 1,201 fixed builds, and compares them with the committed snapshot (`scripts/golden/stats.json`, 90 KB) to 1e-9, listing every difference. `-- --write` writes the snapshot. It takes about 10 seconds of work (plus Vite and Chrome starting).

The builds: every topping alone at level 1 and at its max; every pizza beside two plain ones, plain, enhanced and (Epics and Legendaries) on Mild; Napoletana, Echo Slice and their enhanced forms with six kinds of perk; the Ghost possessing every pizza; 200 seeded mixed builds (pizzas and enhanced ones, toppings at random levels, the Pizzeria's upgrades, peels and heroes, possession, the Forge's waves, bosses beaten, peels owned, Mild or Regular). Each build seeds `Math.random` for itself (Arcobaleno's and Mystery Meat's picks). Numbers are kept as their change from the base stats.

The snapshot was written from main's numbers before any of the step's changes, and every later change in this step matches it exactly.

### The trigger bus

- **`EffectCtx`** has two optional parts: `ledger` (stat effects) and `play` (trigger effects). A kind uses its own part and does nothing without it.
- **`PlayCtx`** (`src/effects/trigger.ts`) is the bus's view of the game: `on(event, fn)`, `roll(chance)` (the one gameplay roll, `Math.random`), `grants(scope, event)` (who fires and how strongly), `feet()`, `cond(event)`, run-long `state`, and the shared actions' game side (`ActionHost`).
- **Events** (`src/effects/events.ts`): `GameEvent.Tick`, `Kill`, `Smack`, `Swing`, `Crit`, `Stomp`, `WaveStart`, `WaveClear`, each with its typed data.
- **Kinds**, one file each beside `stat.ts`, registered in `index.ts`: `Effect.Every` (`every.ts`), `Effect.OnKill`, `OnSmack`, `OnSwing`, `OnCrit`, `OnStomp`, `WaveStart`, `WaveClear`. The `On…` prefix is for triggers that fire in play.
- **Scopes** (who fires): `Scope.Table` (once, at the table's strength), `Each` (each pizza granting it, at its own), `Sum` (once; a chance summed pizza by pizza), `Target` (the pizza the foot was over, or the one stomped), `Alive` (every pizza on the table with the perk; triggers of this scope that sit together go pizza by pizza, as one pass over the table).
- **Off-switches in one place:** the scopes. A stale, frozen-perk or dead pizza never fires; the Ghost's pizza fires no table-wide or per-pizza perk. Target and Alive keep what the old hooks did: the pizza a foot was over fires while it has the perk, the Ghost's too, unless the trigger says `Cond.NotPossessed` (see Notes).
- **Triggers** (`TriggerOpts`): `when` (a `Cond`), `chance` and `cap`, `nth` (`Nth(Enh(10, 7), 'duckKills')`: every n-th, counted in the pizza's flags under the same names as before, so saves carry over), `oncePerWave` (a flag holding the wave).
- **Conditions** (`src/effects/cond.ts`): `Cond.Alive`, `Hittable`, `Boss`, `TrueBoss`, `Diving`, `Burning`, `Puppet`, `Free`, `Decoy`, `Slowable`, `Burnable`, `Down(px)`, `NotEcho`, `Perfect`, `Earned`, `BossWave`, `AfterBoss`, `ActStart`, `WaveInStage(n)`, `NotPossessed`, `AnyFoot(…)`, `All`, `Any`, `Not`.
- **Statuses, defined once** (`src/effects/status.ts`): `Status.Burn`, `Slow`, `Stun`, `Freeze`, with who's immune (immuneBurn, immuneSlow) and how a second one stacks: a burn keeps the longer time and the hotter fire; `SlowStack.Refresh` restarts the time and keeps the stronger slow; `SlowStack.Strongest` only takes when nothing stronger is on, so it never strengthens a slow already there (a boss's own slow is never made worse). `Enh(plain, enhanced)` for values that switch on enhanced rather than scale; `Dps.Smack(m)`, `Dps.Flat(n)`, `Dps.Fixed(n)`.
- **Shared actions** (`src/effects/actions.ts`): `Action.Tips(Pay…, At…)`, `Reroll`, `Heal(Who.Table | Who.Neighbours, n)`, `Meter`, `Crust`, `Apply(status)`, `Summon(Ally.FriendlyGhost)`, `Show(look)`, `Custom(id)`, `Later(seconds, action)` (on the scene's clock, skipped if its pizza is gone), `Seq(…)`. An action's strength is read when it runs (`Fire.k()`), so a delayed one reads it then, as the old code did.
- **Effects never draw.** `Action.Show(Look.X)` names a look; the kit plays it (`PizzaPerkKit.LOOKS`: quips, sounds, the pizza's moment). One-offs that aren't shared actions yet (the meteor's flight, the dance beat's lights and slow, the ink, the snowball) are `Action.Custom(Custom.X)`, each still the kit's own method (`PizzaPerkKit.CUSTOM`). Both names are typed: a missing look or one-off doesn't compile.
- **Order is kept.** On each moment the triggers run in the order they're listed in `src/game/perkEffects.ts`, which is the order the old hooks ran them in, so the seeded game draws its random numbers in the same order (quips, coin flights and heal numbers draw from `Math.random`, so a look's place in a `Seq` matters).

### What moved onto the bus (`src/game/perkEffects.ts`)

- **Timers** (the old `update()`): Meteorite Margherita, Disco Diner Pie, Steam Bun Pie, Comet Calzone, Siren's Song, as `Effect.Every` with `Pick.Random`/`Pick.Toughest`, `fireIf`, `tickIf` and `Reset.Wave`/`Reset.Run`.
- **On a kill** (all of the old `killed()`): Cream Pie Supreme, Phantom Waltz (`Action.Summon(Ally.FriendlyGhost)`), Ember Shade, Golden Fleece, Surtr's Ember Crust, Skald's Saga, Rinkside Pretzel Pie, Pugliese's tip, Bolognese, Duck à l'Orange's reroll, Piñata, Thousand-Foot Feast.
- **On a smack, a swing and a crit** (the old `smacked()`, `swung()`, `crit()`): Dragon Fruit Flambé, Squid Ink Nero, Snowball Pie, Charybdis Swirl, Three-Headed Hound, T-Rex Ribs.
- **On a stomp landing** (all of the old `afterStomp()`): Garlic Bread Pizza's meter, Sloppy Joe, Labyrinth Lasagne, Lodge Fondue Pie, Quattro Pomodori, Hot Honey Chicken, Smoked Salmon & Dill (once a wave), Ragnarök Roast's fire and ice.
- **A wave begins:** the Forge's strike, Old Town Tarte, Seaside Fritto, Moon Cheese, Victory Lap, Pirate's Treasure (and the timers that start over each wave).
- **The wave is clear:** Tuna & Sweetcorn, Perfect Pie, Veggie Supreme, Caviar Bianca.

Plain stat changes, tips and heals, statuses (stun, freeze, slow, burn), meter, crusts, rerolls and the friendly ghost are shared actions. The rest are `Custom` one-offs for now.

### What's left (still in PizzaPerkKit's old code paths)

- **The stomp defences**, which return "blocked": `preStomp` (Cream Pie's slip, Ghost Pass, the oyster shell), `ladleStomp`, `stoneStomp` (Granite Crust), `guardStomp` (the ghosts, the sand walls, Sandcastle Citadel), `stompDmg` (Raclette Run). They need a trigger kind that can answer (block or not) and a "first defence wins" order.
- **The per-foot auras in `update()`**: Chicken Pesto, Chorizo & Pepper, Inferno Calzone, Tikka Time Machine's freeze, Burrata's phase heal. They're continuous, not moments.
- **The table loop at a wave's start**: Bufala's shields, Arcobaleno's colour, Mystery Meat's reveal, Kitchen Sink's pick, then the sand wall and the Bifröst. Its per-pizza order interleaves random draws with shields and quips; it needs the Alive pass on WaveStart, with care for that order.
- **Placed, enhanced, destroyed**: Century Crust, the borrowers' picks, Volcano Calzone's eruption, Olympian Feast, Untouchable, Fenrir's Howl.
- **The multipliers** (`damageMult`, `waveDmgMult`, `tipMult`, `scoreMult`, `knockMult`, `extraDouble`, the event and golden multipliers): per-hit numbers that depend on the foot. They want a "per hit" stat kind with conditions, not triggers.
- **The ticking props**: rings, ghosts, the Gorgon's gaze, the maze, embers, the whirlpools, ink, soot, the harpies, the Bifröst, the coils, Nonna's Secret.
- **The Legendaries** (`src/game/pizzaLegends.ts`, `pizzaLegends3.ts`). `Action.Damage` via `legendDmg` was planned for them; it comes with their port, so no unused action ships now.
- **Shared actions still to make out of the one-offs:** damage to a foot or an area (meteor, comet, fire lane, meatball), the dance beat's and the snowball's slow (`Status.Slow` with `SlowStack.Strongest` is ready for them), the ink's and soot's lane change, the frost-then-fire of Ragnarök Roast.

### One deal function for shop cards

`dealCards(run, { boss?, n?, exclude? })` (`src/game/shopDeals.ts`) is the only way cards are dealt: a shop opening, boss loot, rerolls, the Stockroom Key's restock, the hero's peek at the next shop (From the Future, Booster Gouda's coming shop: `heroT.shop`). It reads the ledger's totals: `n` topping cards from `cardCount` (`cardDelta`), the one-use extras (`extraConsumable`), then Exclusive Menu's bump of every card one rarity up. `Run.addExtraConsumables()` folded into it; `Run.rollChoices`/`rollBossChoices` are gone (Run keeps the pieces: `dealable`, `pickCards`, `pickBossCards`, `addExtraConsumables`, `bumpRarity`). The STATS tab's Cards per shop reads `shopCardTotal(run)`, the same total the deal uses. The random draws are the same, in the same order, as before. (rules-1 replaced the bump with Exclusive Menu's guaranteed card, `Stat.GuaranteedEpic`, and `dealCards` now returns `{ cards, exclusive }`: see "Rule decisions".)

Checked in `?dev` with Mac & Cheese, Extra Shelf LV2 and Exclusive Menu: a normal shop deals 3 + 1 (Extra Shelf +2, Exclusive Menu −2, Mac & Cheese +1) = 4, boss loot 3 + 1 = 4, and STATS reads 4.

### Your Table's reorder survives a reload

`sh.reorderPaid` is saved with the shop (`RunSnapshot.shop.reorderPaid`) and restored with it, and it's kept when the shop is rebuilt in the same wave (after a pick). Checked: pay 25, save, restore the run from its snapshot, open reorder again: charged 0.

### Typed names (Tron's additions)

- **`EachLevelUp` replaces `Levels`.** `Op.Add(Unit.Chance(18)).EachLevelUp.Add(Unit.Chance(10))`: the first op at level 1, the EachLevelUp op once for each level after. `Op.Nothing.EachLevelUp.Add(Unit.Count(1))`: nothing at level 1. Any op can follow any op (`Op.Set(Unit.Every(Unit.Seconds(1.6))).EachLevelUp.Mul(Unit.Mult(1.35))`, the Olive Launcher). The chain is plain data (`{ op, value, each: { op, value } }`; `.EachLevelUp` is a hidden getter). Card text reads "18% chain lightning, +10% each level-up". Freezer Burn, Garlic Lightning and the Olive Launcher are ported; `Levels` is gone. Nothing is named a lowercase `then` (an object with a `.then` method is taken for a promise): `Action.Later`'s action is `act`.
- **`Unit.Every(Unit.Seconds(n))`** gives a `Rate` (1/n).
- **No arithmetic inside effect declarations**: a number that needs working out gets a named maker (`Unit.Every`, `Enh`, `Nth`, `Dps.Smack`). Step 2's new declarations (`perkEffects.ts`, the three toppings) follow it; the lint pass moved the rest (`PizzaPerkKit.modifiers`, Run's tips sum, the tips' `At` offsets) onto makers, and the rule now checks it (see "Lint rules").
- **`Effect.Legacy` is deleted**, with the ledger's `LegacyMod`, `addLegacy`, its list and its fold. Anything not ported stays in its old code path and is listed here.
- **Sources** (`src/effects/source.ts`): `Source.Topping(id)`, `Source.Pizza(type, n)`, `Source.Perk(perk)`, `Source.Meta`, `Source.Peel`, `Source.Hero`, `Source.Ghost`, `Source.Cap`, as typed template keys (`` `top:${string}` ``, `` `pizza:${string}#${number}` ``, `` `perk:${PizzaPerk}` ``, `'meta'`…), so the ledger's maps and the golden check read the same strings as before. `readSource(key)` reads one back (the STATS chip resolver); a shared modifier is a `SourceShare` (`Partial<Record<SourceKey, number>>`, `shareEntries`). A misspelt key doesn't compile. (Topping ids aren't a literal union yet, so `Source.Topping('typo')` still compiles; the audit in step 4 can check them.)
- **`PERK_STATS`** is a full `Record<PizzaPerk, …>`: a perk with no stat effects says `none` (124 of them), so a forgotten perk doesn't compile.
- **Tags** (`src/effects/tags.ts`): `Tag.Stat(Stat.X)`, `Tag.Op`, `Tag.Each`, `Tag.Trigger(TriggerKind.OnKill)`, `Tag.Scope`, `Tag.Cond`, `Tag.Status`, `Tag.Action`, `Tag.Custom`, `Tag.Ally`, `Tag.Summons`; every kind's `tags()` returns `TagId[]`.
- **`UnitKind`** (`UnitKind.Amount`, `UnitKind.Chance`…) in every stat definition and every `Unit.of(…)`, beside `Stack`, `Section` and `Better`. Internal discriminants (`op: 'add'`, `kind: 'stat'`) stay as they are.

### Checks

- `npx tsc --noEmit` passes.
- **Golden:** no differences from main's numbers, after every change (the port, the deal function, EachLevelUp, Legacy's removal, the typed names).
- **Balance sim** (`--heat mild,regular --runs 2 --waves 40 --shop auto --workers 2`), on a copy of the code before the port and on the finished code: identical run by run, all four seeds, every wave record. Mild seed 1 reached wave 41 with 1,850 tips, seed 2 with 557; Regular seed 1 with 665, seed 2 with 101 (crusts 268, 255, 535, 528).
- **Families** (`--heat mild --runs 2 --waves 15 --shop auto --workers 2 --lineup …`, plain and `--enhance`, on a copy of the code before the port and on the finished code): 11 tables of the ported perks (timers; three of kill perks; two of smack perks; two of stomp perks, with the light bot so feet land; two of wave perks; Napoletana with Echo Slice, the meteor, Phantom Waltz and Piñata), 44 runs: every run identical.
- **`?dev` play**, enhanced tables of each family with the auto-player, counting what fired: the timers (meteor, comet, steam, dance, song), the kill perks (ghosts summoned, meatballs, piñata, splats, embers, rushes, spreading fire, tips), the smack perks (fire lane, ink, triple bites, snowballs, quakes), the stomp perks (Hot Honey, Cold Smoked) and the wave perks (Old Town, the chest, Tuna) all fired; no console errors.
- **Shop and STATS** screenshots at desktop and phone size; `F.contrast()` and `F.layout()` list only what was there before (the shop's pizza rarity badges and the boss-loot subtitle): this step changes no UI.

### Notes

- **The Ghost and Target perks.** The old hooks let a possessed pizza's on-kill and on-stomp perks keep firing (only Labyrinth Lasagne and Lodge Fondue checked for the Ghost), while every table-wide and per-pizza perk stops. Kept as it was (`Scope.Target`, `Cond.NotPossessed`); for Tron to decide whether the Ghost's pizza should stop them all. **Decided in rules-1:** a possessed pizza's perks all stop (see "Rule decisions").
- **Exclusive Menu and Mac & Cheese.** The bump turns every card, the one-use extra too, into a card one rarity higher of any kind, so the extra may not be a one-use card after all. Unchanged; worth a look. **Decided in rules-1:** Exclusive Menu was redesigned and the bump is gone (see "Rule decisions").
- **The Stockroom Key's restock** deals one card through the full deal (the one-use extras are drawn too, then dropped), as before: kept for identical runs.
- **Cosmetic `Math.random`** is still used in some looks (the fire lane's flames, Granite Crust's chips, the lava bombs, `Fx.quip`'s tilt, the coin flights). Moving them to `crand()` changes the seeded runs, so it's a separate, deliberate change. **Done in rules-1** (see "Rule decisions").
- **Card text** stays hand-written: `describe()` of the ported triggers doesn't read like the cards yet (they name one-offs by id), so no card text is generated from effects in this step. **Done for toppings in items-1** (see "Item declarations and card text").
- Smack reach and knockback ordering are untouched (a decision is pending with Tron). **Decided in rules-1** (see "Rule decisions").
- **From the code review:** a `Scope.Sum` chance now respects its cap (none has one yet); a counted or once-a-wave trigger with a table-wide scope logs a dev error (its count lives on a pizza); `Effect.Every`'s `scale` is for words and searches only (in play the table's strength already divides its time). The golden check covers the stats, not the deal: the deal's draws are covered by the seeded sim.

### Step 3 starts from here

- The stomp defences need a trigger that answers (blocked or not), run in the old order (ladle, slip, ghost pass, shell, stone, ghost, sand, citadel), on the same bus.
- The wave-start table loop goes on an `Alive` pass of `WaveStart`, keeping its per-pizza order.
- The per-hit multipliers become a stat kind with conditions (`Effect.DamageTaken(Cond.Any(Cond.Frozen, Cond.Chilled), …)`), read per hit.
- The `Custom` one-offs become shared actions where they share a shape (area damage, a projectile hit, a lane change), with their looks moving to `LOOKS`.
- Toppings' and peels' in-play checks by id move onto the bus (the plan's step 3). The Legendaries come with `Action.Damage` via `legendDmg`.
- The golden check and `--lineup` family sims are the checks for each port.

## Lint rules (2026-11-28, branch effects-lint)

ESLint (dev only, `typescript-eslint`'s parser, flat config in `eslint.config.js`) runs a small local plugin for the effect declarations, `tools/eslint/effects.js`, plus a short list of correctness rules from ESLint's recommended set that the codebase already passes (`no-unreachable`, `no-dupe-keys`, `no-fallthrough`, `use-isnan`…). There are no style rules: nothing that isn't an effect declaration gets reformatted.

**Commands:**
- `npm run lint`: ESLint over `src`, `scripts` and `tools`. `npx eslint --fix <files>` applies the layout fixes.
- `npm run lint:test`: the rules' own tests (ESLint's `RuleTester`, `tools/eslint/effects.test.js`): valid and invalid cases for each rule, with the fixes (64 cases, the last running every rule together over several fix passes).
- `npm run check`: `tsc --noEmit`, the rules' tests, the lint and the golden check. Every change runs it before merging.

**What counts as a declaration:** an `Effect.*` call, an `Op.*` call or chain (`Op.Add(…).EachLevelUp.Mul(…)`), a `Unit` maker (`Unit.Chance`, `Unit.Seconds`…: a capital letter), and everything inside their arguments, nested calls and functions included. `Unit`'s lowercase maths (`Unit.scale`, `Unit.boost`, `Unit.tick`…) is ordinary game code outside a declaration, so it's only checked inside one. Another name for an import (`Effect as Eff`) and a destructured maker (`const { scale } = Unit`) are followed.

**The rules** (all errors):
1. **`effects/one-effect-per-line`** (fixable): an effect list (an `effects: [...]` property, or any array holding `Effect.*` calls: toppings, perk stats, the perks' triggers, the Pizzeria's upgrades, the Ghost's possession) has `[` and `]` on their own lines and one entry per line, even with one entry.
2. **`effects/effect-args-per-line`** (fixable): an `Effect.*(…)` with more than one argument has one argument per line, `(` and `)` on their own lines. Inner calls (`Op.Add(Unit.Chance(18))`, `Action.Seq(…)`) and an options object stay on one line.
3. **`effects/no-effect-arithmetic`**: no `+ - * / %` or unary minus inside a declaration. A number that needs working out goes through a named maker: `Unit.Every(Unit.Seconds(1.6))`, `Unit.Percent(n)`, `Unit.scale(v, k)`, and two new ones, `Unit.plus(a, b)` (two of one unit added) and `Unit.groups(n, size)` (whole groups: Peel Collector's every 10 peels). `At.Foot`/`At.Pizza` now take how far above as a `Px` (`At.Foot(Unit.Px(40))`), and keep the screen's `dy` (−40) in their data. (They can only go up now; nothing goes down today, and a downward offset would get its own maker.)
4. **`effects/op-needs-unit`**: no bare number passed to an `Op.*`: wrap it in its `Unit.*` maker.
5. **`effects/no-loose-strings`** (fixable for `Effect.Stat`'s stat and `Unit.of`'s unit): no string handed straight to the effect vocabulary (an argument of `Effect.*`, `Op.*`, `Unit.*`, `Action.*`, `Cond.*`, `Status.*`…, or a field of an options object given to one) where a typed name exists (`Stat.`, `UnitKind.`, `Custom.`, `Look.`, `Scope.`, `When.`…).

**Allowances** (each exact, none blanket):
- `Grows(at, why)`: `why` is the reason's words for the STATS tab, so its strings (and their `+`) are allowed. `at` is checked like any declaration.
- `Nth(n, flag)` and `{ oncePerWave: flag }`: the flag is the counter's name in a pizza's saved flags; there's no typed name, and renaming it would break saves.
- `Source.*` takes free ids (`Source.Topping('salt')`), and strings passed to the game's own lookups inside a declaration (`meta('wrists')`, `c('coins')`) aren't handed to the vocabulary.
- A `+` with a string on either side is joining words, not arithmetic.

**What `--fix` and the pass changed:** the layout of 240 effect lists and 341 `Effect.*` calls in 12 files (toppings ×6 with the Pizzeria's upgrades, `perkStats.ts`, `perkEffects.ts`, `pizzaPerks.ts`'s table perks, `Run.ts`'s Pizzeria and tips effects, `toppingKit.ts`'s tricks, the Ghost's possession in `GameScene.ts`). By hand: the arithmetic in Napoli DOC, Peel Collector, the Forge, the Saga and Kitchen Sink (`PizzaPerkKit.modifiers`), Pepperoni's and the luck pizzas' tips sum (`Run.buildLedger`) and the four tip offsets in `perkEffects.ts` moved onto makers, which give the same numbers to the last bit (`0.05 × n × kinds` is `scale(scale(Percent(5), n), kinds)`, in the same order); Kitchen Sink's three-way pick became an `if` per pick so each list stays one entry a line. The golden check shows no differences. (One small difference outside the numbers: the Forge's and the Saga's `Unit.Percent` now range-checks their values, where `Unit.of` didn't.)

**Limits:** the layout fixes change only whitespace and commas, so no fix is offered when a comment sits between the items or an item holds a template string over several lines (the rule still reports it). Names are matched by spelling: a local that shadows `Effect`, `Op` or `Unit` counts as them.

## Rule decisions (2026-11-28, branch rules-1)

Four gameplay rules Tron decided, each through the effect system rather than a special case.

### Smack reach: cuts apply to the base only

- **The fold rule.** A stat's definition can say `fold: Fold.CutsOnBase` (`src/effects/stats.ts`). For such a stat the ledger (`src/effects/ledger.ts`) folds each phase as: the highest Set, then the cuts (multipliers below 1) on the base, then the adds, then the boosts (multipliers above 1) on the whole total. So Glass Peel's ×0.85 with Long Handle's +6 is `26 × 0.85 + 6`, not `(26 + 6) × 0.85`, and Deep Dish's ×1.2 still grows the whole reach. The "base" is the definition's base (or a Set that replaced it); a later phase's cuts scale that already-cut base again. Every other stat folds as before (`Fold.Standard`), to the last bit.
- **The breakdown** credits the cuts with what they took off the base (shared by the log of each, as multipliers always were) and the adds at face value: Long Handle LV3 +18, Glass Peel −3.9 for a reach of 40.1 (it was 37.4).
- **Smack reach and knockback** both take the rule. Knockback has no cuts today (Magnet Peel's +60 and Spring-Loaded's ×1.4, Prosciutto's +35% are adds and boosts), so nothing about it changes; it's declared so a future cut on it works the same way.
- **Card text:** Glass Peel, Ghost Pepper, Adrenaline, Storm Caller and Overclock now read "−15% base smack reach" (and so on).

### Exclusive Menu: one guaranteed Epic or Legendary card each shop

- **The topping** (`src/data/toppingsShop.ts`, its own definition: `deal()` is max 1) is max 4. LV1: "One topping card each shop is always Epic or Legendary", with "Two fewer topping cards per shop". LV2–4: "The Exclusive card (Epic or Legendary) is 10% / 20% / 40% off"; the catch reads "Two fewer topping cards per shop (not more each level)" (Tron's numbers, the total at each level, not added up).
- **Its effects:** `Effect.Stat(Stat.GuaranteedEpic, Op.Add(Unit.Count(1)), { atLevel: 1 })`, `Stat.CardDelta −2 { atLevel: 1 }`, and `Stat.ExclusiveDiscount` set to 10%, 20%, 40% at levels 2, 3, 4 (`Op.Set` with `{ atLevel: n }`: the highest set wins). `atLevel` is a new `StatOpts` field (`src/effects/stat.ts`): the effect applies at that level only. Its words say "at LV n".
- **The deal** (`dealCards`, `src/game/shopDeals.ts`) reads `Stat.GuaranteedEpic`: that many of the shop's topping cards come first, drawn among offerable Epic and Legendary cards by their usual weights (`Run.pickExclusive`: `pickCards`, so `RARITY_WEIGHT` and luck as usual); a Rare when none is open (before wave 5), else any card. The rest are dealt as before with normal odds (boss loot: epic or better, as always), then Mac & Cheese's extra, which is always an ordinary one-use card. `Run.bumpRarity` is gone. No topping id is checked in the deal.
- **Which card it is** is kept with the shop's deals (`KitShop.exclusive`, saved with the run), marked in the shop with a gold EXCLUSIVE ribbon and ring (`ShopCard.exclusive`), and its discount (`Stat.ExclusiveDiscount`) is added in `toppingDiscount` with the shop's other discounts under the 60% cap, so its price shows the way any discount does.
- **Rerolls give it up:** a reroll deals normal odds with no guaranteed card (`dealCards(…, { guarantee: false })`), and the shop forgets the exclusive card unless it was bought. The guarantee applies to a shop's first deal: a normal shop, boss loot, and From the Future's / Booster Gouda's coming shop (`heroT.shop` is a `Deal`).
- **The Stockroom Key's restock** is not a reroll: when the card bought was the exclusive one and it can't come back, the fresh card in its place is dealt with the guarantee and becomes the exclusive card; any other restock deals normally. When the exclusive card itself comes back on the shelf (a topping that levels up), it stays the exclusive card and keeps Exclusive Menu's discount for its next level (Tron's call: left as is).
- **STATS:** Cards per shop names Exclusive Menu and notes "1 card a shop: Epic or better, 20% off (not after a reroll)".
- **Checked** over 3,000 seeded deals each at wave 20 (normal shop, boss loot, reroll), with Exclusive Menu alone, at LV4, with Extra Shelf LV2, with Mac & Cheese, and with both: exactly one guaranteed card in every first deal, 82–84% Epic and 16–18% Legendary; none after a reroll; the other cards at the usual odds (about 64% Common, 26% Rare, 8% Epic, 2% Legendary; boss loot 75/25 Epic/Legendary); Mac's card one-use every time; no duplicates. Wave 2: the guaranteed card is a Rare; wave 7: an Epic.

### A Ghost-possessed pizza's perks all stop

- **One rule:** `Pizza.perk` is null while the pizza is possessed, as it is while eaten, stale or frozen (`Pizza.haunted`, kept in step by the scene's `possessedPizza` accessor, never saved). Every trigger scope reads it (table-wide, per-pizza, the pizza a foot was over, the end-of-wave pass), and so do the old code paths, auras and defences. `Pizza.perkOff` (stale, frozen or possessed) replaces the old "stale or frozen" checks; the once-at-death perks (Volcano Calzone, Olympian Feast, Fenrir's own howl, Untouchable, Carbonara) check `haunted` too, as does Pizza Fritta's heal as it goes stale. If the scene isn't running when a possessed pizza is destroyed, the Ghost lets go all the same (`haunted` never sticks).
- **Removed:** `Cond.NotPossessed` (Labyrinth Lasagne and Lodge Fondue Pie used it) and the now-redundant Ghost checks in Granite Crust, Raclette Run and the NOW tag.
- **Stats unchanged:** the Ghost's possession still takes the pizza's stats (the Haunt phase reads `Pizza.ownPerk`, the perk it would grant): the golden's possession builds are unchanged.
- **Shown:** the pizza's perk line is struck through on the table, as for a stale or frozen pizza; STATS gives it a POSSESSED flag, its perk struck through and "Possessed: every perk it has is off while the Ghost is in it"; a possessed Mac & Cheese "is possessed" in Cards per shop; the living pizza goes still and dim as a frozen one does. The Ghost's phase card and info line say its perks stop.
- **Checked:** with `?dev`, a kill over Bolognese rolled a meatball; possessed, two kills over it rolled none.

### Looks use cosmetic randomness

- Every cosmetic `Math.random` found (401 calls in 36 files: `Fx` (quip tilt, damage numbers, slices, lightning, coin flights), the fire lane's flames, Granite Crust's chips, the lava bombs' sparks, the pizzas' blink, bob, sparkles and footprints, a foot's wobble and death spin, every boss's and act's shatters, puffs, glints, notes, speech-bubble timers and words, the hero and god moves' looks, the finale's flicker and memories, the topping party's confetti) now draws from `crand()`; quips' words from `cpick()` (`src/systems/cosmeticRandom.ts`). A cosmetic roll that gated a gameplay draw went with it, so a look never moves the game's sequence.
- `Fx`'s particle bursts run under `cosmetic()` (shared now in `cosmeticRandom.ts`, re-exported by `zombieArt.ts`): Phaser rolls a burst's ranges with `Math.random`.
- Gameplay stays on `Math.random`: anything that decides where a foot, prop, target or hit is, timings that land damage (the lava bombs' flight), picks, chances, prices and the slot machine.
- This changes seeded runs once (see the sim below). Left on `Math.random` though only for show: the clutter prop's spin factor, which also shapes its flight (`projectiles.ts`), so it stays gameplay.

### Shop contrast (from main)

`F.contrast()` on main flagged the shop's pizza rarity badges (COMMON, cream on light brown: 2.71) and the shop's subtitle over the dimmed game (4.05, the boss loot's "One pick is on the house" too), plus CHEF'S SPECIAL (4.35), ✦ NEW PIZZA (3.08), the keyboard hint row and, at phone size, GOLDEN MENU (4.24). Fixed: a darker common tab, darker special ink, a darker NEW PIZZA tab with white ink, an outline on the subtitle and the hint row (as the in-wave hints have), a darker Golden Menu heading. `F.contrast()` is clean in the shop, boss loot and STATS at desktop and phone size. (`F.layout()` still lists the pizza tier tabs as "cut off": they hang from the frame by design.)

### Golden

`npm run golden -- --write`. The rules' own changes, checked with the cosmetic change and the new build's seed shift taken out: Exclusive Menu LV1 `guaranteedEpic` 0 → 1; the mixed builds with Exclusive Menu (mix:65, 89, 150, 165) `guaranteedEpic` 0 → 1 and `exclusiveDiscount` 0 → 0.1 / 0.4; reach in the two mixed builds that hold both a flat reach boost and a cut (mix:92 −0.4 → 0.8, mix:129 −2.74 → 11.15); a new build `top:exclusivemenu@4`. Nothing else, possession builds included. The snapshot also moves where a build's seeded picks (Arcobaleno, Mystery Meat, Kitchen Sink) changed: every build after the new `top:exclusivemenu@4` has its `Math.random` seed shifted by one, and a pizza no longer draws its blink and bob from `Math.random`.

### Balance sim

`nice npm run sim -- --heat mild,regular --runs 2 --waves 40 --shop auto --workers 2`, once, on the finished code. Every run still reaches wave 41.

| Run | Tips at the end, before → after | Crusts, before → after |
|---|---|---|
| Mild seed 1 | 1,850 → 1 | 268 → 263 |
| Mild seed 2 | 557 → 911 | 255 → 260 |
| Regular seed 1 | 665 → 3,523 | 535 → 531 |
| Regular seed 2 | 101 → 359 | 528 → 513 |

(Before: step 2's numbers on main.) The runs differ from the first waves because about 400 cosmetic draws (and Phaser's particle ranges) no longer come out of the seeded `Math.random`, so every later gameplay roll lands differently: a new seed, in effect, not a balance change. End-of-run tips swing with when the bot last shopped; crusts, which follow score and waves, move by under 3%. Of the rules: the bot took no Exclusive Menu; reach cuts mattered only in Mild seed 2 (Glass Peel and Ghost Pepper with Big Swing: more reach than before); Mac & Cheese (Regular seed 2) deals as before without Exclusive Menu; the Ghost (from wave 60) isn't met in 40 waves.


## Item declarations and card text (2026-11-28, branch items-1)

Pulled forward from step 4: toppings are declared with typed names and named fields, and their card text is generated from what they declare. A refactor: no number, price or seeded run changes.

### Rarity and the item names are typed

- **`Rarity`** (`src/data/rarity.ts`): `Rarity.Common | Rare | Epic | Legendary` (`as const`; the strings underneath are the ones saves, CSS classes and the golden snapshot already use). It replaces the string union everywhere: toppings, pizzas (`src/content/pizzas/*`), the shop, the UI, the art.
- **`RARITY_DEFS`**, a `Record` over the rarities, is the one place everything rarity-keyed lives: `order`, `label`, the toppings' deal `weight` (was `RARITY_WEIGHT`), `color` (`RARITY_COLOR`), `price` and `perWave` (`RARITY_PRICE`, `RARITY_PER_WAVE`), `from` (the first shop it's dealt in, `RARITY_FROM`), and each pizza tier's `pizza: { look, weight, crusts, tips, counter }` (`TIER_LOOK`, `TIER_WEIGHT`, `TIER_CRUSTS`, `TIER_TIPS`, `TIER_COUNTER`). A rarity missing a field doesn't compile.
- **Helpers:** `Rarity.all` (Common first), `rank`, `atLeast(r, Rarity.Epic)`, `atMost`, `next`, `compare`, `rarest`. They replace the hand-built orders: `tierRank`, Your Toppings' `RANK` map, the Pizzeria's `RARITIES` list and rarity tabs, the Pick window's `RARITY_LABEL`, the Exclusive Menu's and boss loot's "Epic or Legendary" checks, the hero goal's gamble check, the dev kit's rarity lists.
- **The other small names on a topping** (`src/data/itemKinds.ts`, a leaf module so the topping files can import it while `upgrades.ts` loads): `UpgradeKind.Permanent | Unique | Consumable` with `UPGRADE_KIND_DEFS` (the card's tag, PERMANENT / ONCE PER RUN / ONE USE, and the level line, "One use, back in 3 waves" from `CONSUMABLE_COOLDOWN`: five places spelled these out by hand), `OnPick.*`, `NeedsMeter.Meter | Tank`. A Pick's `pick` is a `Rarity`.
- **Lint:** `effects/typed-item-names` (fixable when the name is in scope) forbids a hand-typed rarity, kind, onPick, needsMeter or pick in an item definition (a builder's argument, or any object with an `id` and a `rarity`), a `rarity:` string anywhere, and checks on them (`u.rarity === 'epic'`, `kindOf(u) !== 'consumable'`, `c.kind === 'unique'`, `case 'epic':`, `p.rarity ?? 'common'`, `RARITY_DEFS['epic']`). Other objects' own `kind` and `pick` values (a shop offer's kind 'special', a target pick) aren't touched. Without type information it can't see a rarity passed as an argument (`rarityOpen('epic', …)`) or compared through a local (`const k = kindOf(u); k === 'unique'`): TypeScript accepts the string there, so those rely on review. 11 new test cases (75 in all).
- Meter-only toppings now all say `needsMeter: NeedsMeter.Meter` (Oregano Overdrive, Dried Oregano and Overtime were checked by id in `Run.offerable`); the check reads the field only.

### Named item fields

Each topping family has one builder taking a single object (`src/data/toppingDefs.ts`):

```ts
Topping({
  id: 'earplugs', name: 'Earplugs', icon: '🔇',
  rarity: Rarity.Common,
  maxLevel: 2,
  effects: [ … ],
})
```

- `Topping` (works through its effects; a trade-off is a plain topping, its downside found from the effects), `KitTopping` (the scene runs it, keyed by id: its text is required), `ProcTopping` (an ability-style proc), `PickTopping` (one use, a pick of its rarity), `FreshTradeoff` (a catch paid in freshness, with its Mild catch: `fresh: { freshNow, effects }`, `mild: { slicesNow, effects }`, the effects waiting on `When.Freshness` / `When.NoFreshness` as before).
- They replace `stat`, `proc`, `deal` ×2, `freshDeal`, `ev`, `quiet`, `shop`, `pick`, `kit` and the bare object literals. `Upgrade.max` is `maxLevel` (runs save ids and levels, never this field: `RunSnapshot.owned`).
- **Pizzas** were already declared with named fields (`PizzaType` object literals in `src/content/pizzas/*`), so they only took the typed rarity. Their `perkText` stays hand-written: most perks live in `pizzaPerks.ts`'s old code paths, not in declarations a `describe()` could read (step 3). Their `route` ('special', 'pizzeria', 'milestone', 'rare') is a similar string union, left for a later pass.

### Card text is generated

- **Words on every stat** (`src/effects/stats.ts`): each definition has `words` (required: a new stat without them doesn't compile): a `noun` ("smack damage" → "+25% smack damage"), or `say` (the whole phrase: "Feet move 6% faster", "Rerolls cost 2 tips less (never below 1)"), an optional fuller `alone` line for when it's the only change on its side ("+5% chance smacks stun feet for 1.2s" rather than "+5% stun chance"), and a `subject` so phrases about the same thing join ("Feet have 20% more health and move 10% faster", "Shiny feet 3× as common and pay 10 Golden Crusts each"). Words that depend on the run (the peel's meter and slam) come through a `WordsCtx`: the card text passes `slamMode`'s texts, `describe()` plain ones.
- **How a change reads** (`src/effects/words.ts`, `changeOf`): an add in its unit ("+6 smack reach", "+0.4s"; a multiplier stat's add as a percentage, "+25% tips"), a multiplier as a percentage change (×1.05 reads "+5%", ×0.85 "−15%", a whole ×2 or more "×2"), a cut on a `Fold.CutsOnBase` stat says "base" ("−15% base smack reach"), a Set as its value.
- **Upside or downside** is decided by the stat's `Better`: a change that moves the stat the worse way is the red line (flags too: `Stat.NoEvents` is better down). One-time costs (`freshNow`, `slicesNow`) are downside lines. The trade-off price discount reads it (`isTradeoff(u)`: its card has a downside), not a separate `downside` string: every topping's price at waves 1, 10 and 30, both heats, is the same as before.
- **Levels:** a level's text is what taking it does: an `EachLevelUp` chain's first op at level 1, its level-up op after (Freezer Burn: "Smacks chill feet: +20% slow", then "+12% slow"); `atLevel` effects only at their level. `describe()` of a chain gives both: "+18% chain lightning, +10% each level-up".
- **Every effect kind's `describe()`** is player-ready: stat effects through the words above; triggers as "15% chance on a kill: summon a friendly ghost", "Every 10th kill: …", "On a stomp: …", "Every 20s: …"; statuses as "stun it for 1s", "slow it 30% for 2s".
- **One function** (`cardText(u, lvl)` in `src/game/cardText.ts`; `cardLine` for tooltips, `levelLine` for the level line) feeds the shop's cards, the Pick and Pizza Slots windows, the level-up and free-topping toasts, Your Toppings (now and next level), the STATS tab's chips, tips and tip cards, the READY tiles, the HUD's owned-topping tooltips and the Pizzeria's Toppings tab.
- **Generated or written by hand:** of 260 toppings, 132 effect toppings read fully generated text, 64 procs their proc's own (`describeProc`, as before) and 4 Picks their rarity's line; 13 effect toppings and 4 procs (Meatball Bounce, Pizza Cutter, Calzone Cannon, Rolling Cutter: a written first level) keep one hand-written side, checked by the audit; 43 are the scene's own kit toppings, whose numbers live in `toppingKit.ts`, so their declarations have nothing to check them against.

### Overrides

`text: { up?, down?, scene? }` on a topping replaces one side of its card. A side is a string, or a function of the level, what the effects say there (`auto`) and `autoAt(l)` (the generated text at another level), so an override can add to the generated text rather than repeat it. `cardTextAudit()` (run by `npm run golden`; `F.cardTextAudit()` in the console) checks every override against what the topping declares, at every level it can reach (Infinite Oven's included): each number in its own words (with `auto` left blank) must be one the declarations give at some level, with the same sign when it's written with one ("+20%" where the effects give "−20%" is caught), or listed in `scene` (a number the scene owns, or a stat's cap); and for an effect topping, every number the effects give at a level must still show on that level's card. A proc's written first level is checked against the proc's own text (its later levels are generated: "Hits 50% harder, more often"). The effect toppings' overrides, and why:

| Topping | Override | Why |
|---|---|---|
| Bigger Peel | LV1: "Smacks hit every foot in range, " + generated | the scene's area smack from LV1 |
| Chili Flakes | LV1: "Smacks set feet on fire: 6 dmg/s" | the balance sim's shopping bot picks "automatic" toppings by their card text (see Notes): "burn" in LV1's text would change what it buys |
| Tip Jar | generated + " from feet (all tip boosts top out at ×2.5)" | the cap (`TIP_MULT_CAP`, in `scene`) |
| Spring-Loaded | generated + ": send feet flying back up" | flavour |
| Fridge Magnet | generated + ", now and for new ones" | its `onPick` tops up the pizzas on the table now |
| Mousetraps | generated + ": it snaps a stomper (100 dmg + stun)" | the scene's trap (100 in `scene`) |
| Endless Feast | "Every pizza regrows +1 slice after each wave, and your weakest +1 more" | the generated line is twice as long |
| Sacrifice | "Every pizza regrows +2 slices, +1 shield a wave" | the generated line ran past a narrow card's 4 lines |
| Overclock | "+40% chain lightning: +3 targets, +30% damage" | likewise |
| Rainbow Road | generated + "; one turns up before wave 20" | the scene's early shiny (20 in `scene`) |
| Premium Menu | down: "Toppings and pizzas cost 20% more" | two price changes read as one |
| Owner's Discount | up: "Everything in the shop is 25% off" | two discounts read as one |
| Exclusive Menu | down: LV1's generated catch + " (not per level)", at every level | its catch is LV1's effect only, but its card shows it at every level |

The text before and after, every topping at every level (and Mild where it differs), was compared row by row for this step (668 rows: 515 the same, 153 changed). The changes in tone are small: "+8% critical smack chance" → "+8% crit chance", "×1.5 smack damage" → "+50% smack damage", "Pizzas on the table lose 2 freshness now" → "Pizzas lose 2 freshness now", "One fewer topping card per shop" → "One fewer card a shop", "+8% double-smack chance" → "+8% double smacks" (it ran past a narrow card with a long ability name); a meter boost names the peel's meter ("+40% Peel Slam charge", as Oregano's always did), a cut reads "−20% meter charge" whatever the peel. A level past the ones a topping declares (Exclusive Menu's LV5 and LV6 under Infinite Oven) reads "Nothing more at this level" (it said "is 0% off").

### The shop card has fixed slots

Every topping card in the shop, whatever its rarity, is one grid: tag, art, name, a text block of a fixed height (4 lines, the downside included, centred), the level line, the button (`.ctext` in `src/style.css`). The name, the text, the level line and BUY sit in the same places on every card (the level line's row takes any spare height, so a wrapping level line grows the whole row and the buttons stay level); the block keeps the full text as its tooltip. The old font steps for long texts and the 3-line clamp (which cut long texts off with "…") are gone. A row of 5 or more cards is 12em a card (it was 10.8em: 5 now fit without scrolling, 6 scroll as before) with its text at 0.88em; it starts at its first card (centred, an overflowing row's first card was cut off out of reach) and keeps the frame's room for the rarity tab above the PERMANENT tag (it sat on top of it).

`F.cardTextFit()` (with the shop open; `src/devCardText.ts`) lays every topping's text, at every level it can reach (Infinite Oven's +2 included), on both heats and with every kind of peel's meter wording (the Peel Slam's, and the longest ability name of each kind), into a shop card in each layout the shop deals (3, 4, 5, 6 and 8 cards) and lists any that run past the block. `npm run golden` runs it at desktop (1280×720) and phone (844×390) size, with the override audit, and fails on any. Phrases were shortened until all fit.

### Checks

- `npm run check` passes: no golden differences (1,202 builds), every topping fits at desktop and phone size, the audit is clean.
- Prices: every topping at waves 1, 10 and 30, both heats, identical to main.
- Screenshots (desktop and phone) of the shop with 4 cards (trade-offs, level-ups, Exclusive Menu) and with 6, Your Toppings, STATS with a topping's tip card, a Pick window and the Pizzeria's Toppings tab, against main's: `F.contrast()` clean everywhere; `F.layout()` lists only the pizza tier tabs (by design).
- **Balance sim** (`--heat mild,regular --runs 2 --waves 40 --shop auto --workers 2`), on main and on this branch: identical run by run, every field of every run (all four reach wave 41; crusts 263, 260, 629, 525). The bot buys by card text (see Notes), so Chili Flakes' LV1 keeps its words.

### Notes

- **Exclusive Menu and Infinite Oven:** Infinite Oven lifts every levelling topping 2 levels, Exclusive Menu too, though its LV5 and LV6 do nothing (no `atLevel` effect there). Unchanged; for Tron to decide whether Infinite Oven should skip it.
- **State read from text, not values** (found while doing this): the balance sim's shopping bot (`src/devSim.ts`, `AUTO`) picks "automatic" toppings by a regex over their card text; `isAutoTopping(u)` (from the effects) is the real answer, but switching changes what the seeded bot buys, so it's for a deliberate change (Chili Flakes' LV1 override keeps today's choices until then). Hero Goals' chain-lightning count read `/chain lightning/` off the card text (Garlic Lightning's "arcs" didn't match); it reads the effects now (`hasChainLightning`: a chain chance or a chaining proc), so Garlic Lightning counts. The STATS chips' tip card read its level back out of the chip's name ("LV3"); it's a field now. Two hand-built rarity orders with a made-up 'uncommon' (the sim bot's ranks, Athena's pick in `godMoves.ts`) read `Rarity.rank` now, same order. Still open: `godMoves.ts`' `isUndead` matches foot ids and names by regex beside the `undead` flag; Athena's pick finds toppings by their display name; `Run.offerable` checks Freeze Frame by id and freshness toppings by an id list (`FRESH_ONLY`).
