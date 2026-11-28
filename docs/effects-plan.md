# Effects plan: one plug-and-play system for perks, toppings and peels

Status: **approved; step 1 done (2026-11-27, branch effects-1): units, stat definitions, the modifier ledger, STATS from the ledger. Step 2 done (2026-11-28, branch effects-2): the balance sim made repeatable, the golden check, the trigger bus, the perks' behaviours ported (most families), one deal function for shop cards, and typed names for sources, tags and units. Step 4's lint rules done early (2026-11-28, branch effects-lint): `npm run lint` and `npm run check`. Tron's four rule decisions (2026-11-28, branch rules-1): reach cuts on the base, Exclusive Menu redesigned, a possessed pizza's perks all stop, looks on cosmetic randomness. Readable item declarations (2026-11-28, branch items-1, pulled forward from step 4): typed rarity and item names, named item fields, card text generated from the effects, the shop card's fixed slots. Step 3 done (2026-11-28, branch effects-3): the leftover perk families, the Legendaries, the toppings (no game code tests a topping's id) and the peels on the effect system, and `F.effectsAudit()`. Step 4 done (2026-11-28, branch effects-4): the refactor is complete. The peels' triggers on a bus, the last 23 pizzas declared, shared area actions, one off-switch rule, and the guards on (types, the audit in `npm run check`, two lint rules).** See "Step 1: what was built", "Step 2: what was built", "Lint rules", "Rule decisions", "Item declarations and card text", "Step 3: what was built" and "Step 4: what was built" at the end; "How to add a new item" there is the checklist for what comes next.

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
| Chili Flakes | LV1: "Smacks set feet on fire: 6 dmg/s" | the balance sim's shopping bot picked "automatic" toppings by their card text (see Notes). **Gone in step 4**: it reads its generated text now |
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

- **Exclusive Menu and Infinite Oven:** Infinite Oven lifts every levelling topping 2 levels, Exclusive Menu too, though its LV5 and LV6 do nothing (no `atLevel` effect there). Unchanged; for Tron to decide whether Infinite Oven should skip it. **Decided and done in step 3:** it skips levels that do nothing.
- **State read from text, not values** (found while doing this): the balance sim's shopping bot (`src/devSim.ts`, `AUTO`) picks "automatic" toppings by a regex over their card text; `isAutoTopping(u)` (from the effects) is the real answer, but switching changes what the seeded bot buys, so it's for a deliberate change (Chili Flakes' LV1 override keeps today's choices until then). Hero Goals' chain-lightning count read `/chain lightning/` off the card text (Garlic Lightning's "arcs" didn't match); it reads the effects now (`hasChainLightning`: a chain chance or a chaining proc), so Garlic Lightning counts. The STATS chips' tip card read its level back out of the chip's name ("LV3"); it's a field now. Two hand-built rarity orders with a made-up 'uncommon' (the sim bot's ranks, Athena's pick in `godMoves.ts`) read `Rarity.rank` now, same order. Still open: `godMoves.ts`' `isUndead` matches foot ids and names by regex beside the `undead` flag; Athena's pick finds toppings by their display name; `Run.offerable` checks Freeze Frame by id and freshness toppings by an id list (`FRESH_ONLY`).

## Step 3: what was built (2026-11-28, branch effects-3)

The perk families step 2 left in old code, the Legendaries, the toppings and the peels, on the effect system. A refactor: the balance sim and every family's seeded scenarios are identical run by run, and the golden check shows no differences. Three small, decided changes come with it ("Also in this step").

### New on the bus

**Kinds** (one file each in `src/effects/`, registered in `index.ts`):

| Kind | The moment | For |
|---|---|---|
| `Effect.Defend(Guard.Early \| Guard.Wall, action, opts)` | a stomp coming down | defences: blocked when the action happened; the bus stops asking once one has (first defence wins) |
| `Effect.Soften(action, opts)` | a stomp about to take slices | the action changes the moment's `dmg` (Raclette Run) |
| `Effect.FrameStart`, `Effect.Aura(action, { off })`, `Effect.EachFrame` | a frame begins; each foot standing, every frame; every frame after the timers | Tikka's clock, the per-foot auras, the ticking props |
| `Effect.WaveOpen`, `Effect.WaveClose` | a wave opens (before its field is set); a wave closes (before anything is paid) | the table's own changes; props and walls coming down |
| `Effect.OnPlaced`, `OnEnhanced`, `OnDestroyed`, `OnLost` | a pizza joins, is enhanced, is destroyed (may answer `Answer.Survive`), is lost (may answer `Answer.Rise`) | Century Crust, the borrowers, Volcano, Olympian, Fenrir, Untouchable |
| `Effect.PerHit(HitStat.X, Grow.Add \| Mul \| Cut \| By, opts)` | a hit (or a moment) being worked out | the per-hit numbers: folded in the order listed, once per grant that holds, then the stat's floor |
| `Effect.OnSlam` | the peel's meter ability is used | the peels' declarations |
| `Effect.Trick`, `Effect.ShopPrice`, `Effect.Deal`, `Effect.Proc`, `Effect.OnPick` | read by the scene and the shop | the toppings (below) |

**Moments that ask.** `PreStomp`, `StompWall`, `Destroyed` and `Lost` carry a `blocked` or `answer`; `PerkBus.emit` stops once it's set (`answered()`), so the first defence wins and the order is the old one.

**Scopes.** `Scope.Field` (whatever the table: a prop left on the field, a set-up that also tidies up; it reads its own off-switch) and `Scope.Own` (the pizza by its own perk, whatever it grants now: a borrower, a hidden Mystery Meat). On a moment that isn't about one pizza, `Alive` and `Own` triggers that sit together go pizza by pizza in table order, as the old loops did.

**Per-hit numbers.** `HitStat.Damage`, `WaveDamage`, `Tips`, `Score`, `Knock`, `ExtraDouble`, and the table's `ShinyRate`, `EventRate`, `EventDrops`, `GoldenPrice` (with its 0.4 floor), each with a base (`HIT_STATS`). `Grow.Add(per)` adds per × strength, `Grow.Mul(per)` multiplies by 1 + per × strength, `Grow.Cut` takes off, `Grow.By(Factor.X)` multiplies by a one-off's own factor (the Gorgon's stone, the Bifröst, Roar Roast's roar). A table-wide grant only exists while the perk is out, so a strength of 0 never multiplies by 1: every number is the same to the last bit. `PizzaPerkKit.damageMult`, `waveDmgMult`, `tipMult`, `scoreMult`, `knockMult`, `extraDouble` and the four table multipliers are now one line each (`bus.hit`).

**Conditions.** On the foot: `Cond.Over`, `Hovering`, `Stomping`, `Pierces`, `Fast`, `BossKind`, `Mini`, `Undead`, `Cold`, `Golden`, `Friendly`, `Pinned`, `InPortal`. On the pizza a grant is for: `Near`, `Full`, `FullFresh`, `Haunted`, `Enhanced`. On the moment: `Smack`, `Fresh`, `Night`, `AutoSlam`, `NotByAbility`. And `Cond.Flag(Flag.X)` for what the kit keeps (`Quaking`, `Rushing`, `LostLastWave`). Typed names: `Factor` and `Flag` in `src/game/perkEffects.ts`, beside `Custom` and `Look`.

**Actions.** `Action.Knock(n)`, `Action.Damage(Hit.Smack(m) | Hit.Legend(m), { knock, push })` (× the firing's strength; `Hit.Legend` is `legendDmg`, scaled with the heat; filed on STATS as `perk:<perk>`), `Action.Ability(fx)` (a peel's or a proc's own effects, run by the scene).

### What moved (`src/game/perkEffects.ts`)

- **The stomp defences** (`preStomp`, `ladleStomp`, `stoneStomp`, `guardStomp`, `stompDmg`): Guard.Early, in the old order: the cream pie's slip (not for a piercing foot), Pizza Fantasma's ghost pass (25% a pie, its roll where it always was), Oyster Rockefeller's shell, Nonna's ladle. Guard.Wall (the scene only asks when the stomp doesn't pierce): Granite Crust once a wave (`oncePerWave: 'stoneWave'`), then, never on the Ghost's pizza (`Cond.Not(Cond.Haunted)`), Phantom Waltz's ghost, Sandcastle Sundae's wall, Sandcastle Citadel's. `Effect.Soften` for Raclette Run. The scene's `onStomp` calls `preStomp` and `wallStomp` (one call each where there were two).
- **The per-foot auras** (the old `update()` loop): Chicken Pesto (with its let-go as `off`), Chorizo & Pepper, Inferno Calzone (`Action.Apply(Status.Burn(…, Dps.Flat(6)))`), Tikka's freeze (its arrival on `FrameStart`, its set-up on `WaveStart`), Burrata's phase heal.
- **The wave's opening**: the ghosts back out, then pizza by pizza Bufala (`Scope.Alive`, `Cond.BossWave`), Arcobaleno and Mystery Meat (`Scope.Own`), then Kitchen Sink (`Scope.Each`); the kit works the stats out again if a colour or a pick changed. Sandcastle Sundae's wall, the Bifröst, the harpies' reset and Tikka's clock open `WaveStart`; Kitchen Sink's next pick opens `WaveClear` (`Scope.Alive`).
- **Placed, enhanced, destroyed, lost**: Century Crust, Arcobaleno's, Mystery Meat's and Kitchen Sink's first picks (random draws in the old order), the Citadel's fourth pennant, Volcano Calzone, Olympian Feast, Fenrir's Howl, Untouchable.
- **The per-hit numbers**: 29 `Effect.PerHit` in the old fold order.
- **The ticking props**: harpies, the Bifröst, the coils, the Gorgon, the maze, embers, whirlpools, ink, soot, the ghosts, the rings and Nonna's Secret, each an `EachFrame` (`Scope.Field`) in the old order; the rings, the splats and soot, and the Legendaries' walls and holes come down on `WaveClose`.

### The Legendaries (L1–L9, `src/game/pizzaLegends*.ts`)

Every moment is declared in `perkEffects.ts`'s Legendaries section and runs as a one-off of the kit's (the bodies stay in `LegendKit`/`Act3Legends`, as smaller public methods): Nonna's swats come back, the Citadel goes up, the tide is due, The First Bake (WaveStart, after every other perk's); the ladle and the Citadel among the defences; Roar Roast's and Black Olive Hole's clocks, the hole's pull, the roar's ripple and the tide every frame; **Big Top Pie and Silver Service as `Effect.Every`** (20 s of feet on the table at the toughest; 15 s, fired once a foot is diving or stomping and movable); the portal as an `OnSmack` with `chance: Unit.Chance(1), cap: Unit.Chance(5)` (rolled exactly where it was); Roar Roast's boost as a `PerHit` factor; the Bifröst's, Frostbite's and the roar's sparks as `OnSmack` looks in their old place. Their hits go through **`Action.Damage(Hit.Legend(…))`** (the cannon pie ×8, the crouton ×10, the hole ×5 × its pull), except Nonna's ladle, whose ×5 is worked out as the swing starts and lands 240 ms later (as it always was: working it out on the hit could pick up a stat change in between).

Kept, as docs/pizza-plan.md teaches: never move a friendly zombie, a puppet or a free foot (`Movable`, `Batable`, `PortalReady` in `perkEffects.ts`); a boss's own slow is never strengthened (`SlowStack.Strongest`); `holdHoverT`, `hittable`, `ECHO_SKIP` are untouched.

**For the Act 4+ Legendaries**, the vocabulary is ready: a timer is `Effect.Every` (`tickIf`, `fireIf`, `at: Pick.Toughest(…)`), a chance on a hit `Effect.OnSmack` with `chance` and `cap`, a defence `Effect.Defend`, a damage boost `Effect.PerHit` (`Grow.Mul`, or `Grow.By` for a prop's), a hit `Action.Damage(Hit.Legend(Unit.Mult(n)))`, a set-up `Effect.WaveStart`/`WaveClose`, a prop `Effect.EachFrame`; the conditions above say whom it may touch. Its look is a `Look` (`LOOKS`) or its one-off a `Custom` (`CUSTOM`).

### Toppings: no game code tests a topping's id

- **Scene tricks** (`Effect.Trick(Trick.X)`, `src/effects/trick.ts`, `TRICK_DEFS`): the 26 kit toppings, Crust Armour, Bigger Peel's area smack, and the armed Leftovers Box, Emergency Dough and Pizza Angel. The kit and the scene ask `Run.trick(t)` (the levels of the toppings declaring it), `Run.armedTrick(t)` (an armed one to use up) and `Run.trickHolder(t)` (its ledger source for The Last Slice and Midnight Snack); STATS reads the same (`tk()` in `buildStats`). `TRICK_DEFS` marks the automatic ones (the drone, Wood-Fired, Tied Laces, Napkin Ninja): `isAutoTopping` reads that, not an id list.
- **The shop's rules**: `Effect.ShopPrice(Price.HappyHour | BulkBuy | Haggle | Owner | ChefsSpecial, off, { cap })`, read by `toppingDiscount`, `rerollPrice` and `counterPrice` through `Run.shopPrice`; `Effect.Deal(DealRule.FreeLunch | Bottomless | FreeDelivery | ChefsSpecial | Clearance | Restock)` through `Run.deal`; `counterFreebie` returns a `DealRule`. The numbers are the declared ones (25%, 20% a level, 10% a card up to 30%…), the same to the last bit.
- **Procs**: `ProcTopping`'s proc is its `Effect.Proc` (`procOf(u)`); `Upgrade.proc` is gone.
- **On pick**: `Effect.OnPick(OnPick.X)` on the nine toppings that had `onPick` (`onPickOf(u)`); `Upgrade.onPick` is gone. `ADDS_PIZZA` (the toppings whose pick adds a pizza) replaces the `'helping'` exclusions.
- **How**: `declaring(key)` (`src/data/upgrades.ts`) is an index of which toppings declare each trick or rule, built once from the declarations. These kinds are **quiet** (`KindSpec.quiet`): their words stay the topping's own card text, so no card, price or bot choice changes; the card-text audit and `cardTextSources` look at the loud effects only.
- **Every topping now declares at least one effect** (step 4's typecheck rule can be switched on for toppings).
- **Id checks that stay**: none in game code. Dev tools name toppings on purpose (`F.startGame({ upgrades: { heavy: 3 } })`, the sim's `--toppings`), and the topping files declare their own ids. `Source.Topping(id)` keys stay ids (saves and the golden check read them).

### Peels

- **Always-on stats are declared**: an always-on ability's `stat` fx (and a hero's always-on `also`) become `Effect.Stat` on the Peel phase (`peelStatEffects`, `src/game/peelEffects.ts`), applied by `Run.buildLedger` through `applyAll`. The golden check's peel and hero builds are unchanged.
- **Every ability and proc is declared** (`abilityEffects(a)`, `procEffects(p)`): `active`/`auto` → `Effect.OnSlam` (`Cond.AutoSlam`), `every` → `Effect.Every`, `smack` → `Effect.OnSmack` with its chance, `kill` → `Effect.OnKill` (`Action.Later(0.04 s)`, `Cond.NotByAbility`), `stomp` → `Effect.OnStomp`, `wave` → `Effect.WaveStart` (`Action.Later(0.6 s)`), each with `Action.Ability(fx)`.
- **Effects never draw**: what an ability's or a proc's effects show (the element's mark on each foot hit, burns, freezes and their sound, marks, a chain's sound and lightning, FINISHED!, shields, blasts, the ability's name, Freeze Frame's frost) is fired as `PeelFx` events (`src/game/peelFxEvents.ts`) at the moment the old drawing calls were, and `abilityFx` listens and plays them. The scene's `runEffects` no longer draws.
- **Left for step 4, and why**: the scene still times the triggers itself (`fireAbility`, `fireProcs`, `abilityTick`, `procTick`) and runs the ability vocabulary (`runEffects`: targets, throws, marks, chains, executes). Moving the timing onto the bus as it is would change seeded runs: a proc's kill roll happens 40 ms after the kill, the ability's own roll at the kill; the `every` ability's clock is charged by the strength each frame (`abilityT += dt × boost`, compared with its seconds) and topped up from six places (the slots, the meter, Freeze Frame's riders…), where `Effect.Every` divides its time by the strength. Step 4 can give `Effect.Every` a charged clock and the bus a `Later`-then-roll, then move the dispatch; the vocabulary's targets (`all`, `peel`, `random`, `front`, `toughest`, `pizzas`, `blast`) become `Pick`s and its fx shared actions.

### Guards: `F.effectsAudit()` (started; step 4 finishes it)

`src/devEffectsAudit.ts`, on the live Game scene (`F.startGame` first). Every topping, pizza and peel goes through the adapters (`describe`, `tags`, `scale`, `doesAt`), and each is built alone and read off the STATS tab's own view. Today's output:

- **Counted:** 260 toppings, 159 pizzas, 640 peel abilities: 1,279 effects, no adapter errors.
- **Declare no effect:** no topping. 23 pizzas, whose perks the scene still checks by name (pizza id: perk): veggie: `regen`, formaggi: `shield`, diavola: `burnStomper`, meat: `slices`, pesto: `slowAbove`, sicilian: `thick`, marinara: `garlic`, grandma: `neighbourShield`, stromboli: `sturdyMulti`, whitepie: `immuneEffects`, flambee: `heatAbove`, stagioni: `rotate`, taglio: `refund`, pickle: `preserve`, pumpkin: `neverStale`, fritta: `staleHeal`, carbonara: `riseOnce`, lahmacun: `bossRegrow`, tandoori: `markFirst`, greek: `disarm`, marshmallow: `bounceTop`, and napoletana and echoslice (the strength and the copy, not effects of their own). 3 peels: the Zombie Toes (Zombie Outbreak, `zombiePeel.ts`) and the Incredible Bulk's two (hand-built moves).
- **Not shown on STATS:** none. Built alone, every topping is named by a tile or a More effects line, every peel by its ability tile, every pizza by a tile or its perk card.
- **Shown only by a card:** 8 one-use toppings (their armed line in Your Toppings) and 44 pizzas whose numbers no tile names (their perk card says what they do).
- **Read their own off-switch:** 56 trigger effects (`Scope.Field` props and set-ups, `Scope.Own` by the pizza's own perk). Each is listed; most are props that outlive their pizza and tidy up after it, which is what they did before.

### Also in this step

- **Infinite Oven skips dead levels.** `liftedMax(u, bonus)` (`src/data/upgrades.ts`) lifts a topping only into levels its effects do something at (`KindSpec.doesAt`: an `{ atLevel }` effect only at its level, an `EachLevelUp` chain's `Op.Nothing` never). `Run.maxLevel` and the card-text checks' `topLevel` use it. Of every levelling topping, only Exclusive Menu changes: its cap under Infinite Oven is 4 (was 6), and its cards no longer read "Nothing more at this level".
- **Leftover text and id lookups:** Athena's pick reads the next shop's ids (`peekShop` returns ids; the shop's cards carry `data-id`); `isUndead` reads the `undead` flag only: the Ghost of Feet Past, the Ghost of Feet Future and the Zombie Loafer, which only their names matched, are flagged `undead` (bosses and mini-bosses are never zombified, so that changes nothing there; Cellar Mushroom Medley's +10% now applies to them too, as its words say: "ghosts and the undead"); `Run.offerable` reads `needs: [Needs.Slam]` (Freeze Frame) and `needs: [Needs.Freshness]` (Basil, Fridge Magnet, Leftovers Box) instead of an id and `FRESH_ONLY`.
- **The sim bot buys by `isAutoTopping`** (`src/devSim.ts`), not a regex over card text: a separate, last commit, made after every identical-run check. It changes what the seeded bot buys (it now also favours toppings whose automatic damage its words didn't name, such as Blizzard, Hot Oven, Inferno and Tremor), so it changes the seeded runs once, deliberately. The balance sim before → after that commit (every run still reaches wave 41):

  | Run | Crusts | Tips at the end | Toppings owned |
  |---|---|---|---|
  | Mild seed 1 | 263 → 263 | 1 → 751 | 75 → 71 |
  | Mild seed 2 | 260 → 259 | 911 → 663 | 53 → 61 |
  | Regular seed 1 | 629 → 522 | 408 → 951 | 67 → 52 |
  | Regular seed 2 | 525 → 547 | 402 → 710 | 44 → 42 |

  Chili Flakes' LV1 override was kept for the old regex; it could go now (a card-text change, left for Tron).

### Checks

- `npm run check` passes: no golden differences (1,202 builds, the peel and hero builds included), every topping fits at desktop and phone size, the card-text audit is clean (card sources still 200 generated, 17 with a hand-written side, 43 the scene's own).
- **Balance sim** (`--heat mild,regular --runs 2 --waves 40 --shop auto --workers 2`) against a copy of main, after the perk families, after the Legendaries and toppings, and on the finished code: identical every time, every field of every run (crusts 263, 260, 629, 525).
- **Seeded scenarios**, each against the same copy of main, every field compared: 46 scenarios, 152 runs, all identical (one more, Infinite Oven with Exclusive Menu, differs as intended).
  - the perk families (`--lineup`, plain and `--enhance`, 15 waves; the light bot where stomps must land): the stomp defences (2 tables), the auras, the wave's opening, placed/destroyed, the per-hit numbers (5 tables), the props (2 tables): 24 scenarios, 48 runs;
  - the Legendaries: L1–L3, L4–L6, L7–L9, plain and enhanced, Mild and Regular, plus two mixed tables: 10 scenarios, 32 runs;
  - the toppings (`--toppings id:lvl,…`, new in `scripts/sim/run.mjs`: owned from the start, one-use ones armed): the shop rules (2), the kit tricks (3), the armed and freshness ones, the procs (2): 8 scenarios, 32 runs;
  - the peels (`--peel`, 4 scenarios): 20 peels covering every trigger (always-on with stats and an `also`, smack, every, kill, stomp, wave, active, auto, heroes): 40 runs;
  - Infinite Oven with Exclusive Menu LV4: differs, as it should: on Regular seed 2 main's bot bought Exclusive Menu's dead LV5, which this branch no longer offers.
- **`?dev` play** (the auto-player at ×6, a fresh page each, counting quips and PeelFx events): every family fired visibly (the ghost pass, the shell, Granite Crust, Raclette, the slip, the ghosts, the sand wall, the Citadel, Nonna's ladle; Chorizo's flare, Tikka's stop, Burrata's balm; Arcobaleno, Mystery Meat, Kitchen Sink; Volcano, Olympian, Untouchable, Fenrir; embers, harpies, whirlpools, the maze, the coils, ink, soot, the Gorgon; Silver Service, The First Bake, Big Top Pie, the tide, the roar, the hole, the crouton; Fold Over, Echo, Wood-Fired, the drone, crumbs; the procs; every peel trigger), with no console errors.
- **Screenshots** of the shop and STATS at desktop (1280×720) and phone (844×390) size: `F.contrast()` clean; `F.layout()` lists only the pizza tier tabs (by design) and the long name "Cosmic Crouton Supreme" on its shop table card, as on main.
- **Review:** an independent review of the diff found one bug, fixed: the ability visuals' event bus lived as long as the scene, which Phaser reuses, so a second run added a second set of listeners on the old run's effects; it's made fresh with each run's AbilityFx now. Also from it: `Scope.Own` prefers the moment's own pizza, and a table pass puts back the pizza it was visiting.

### What's left (and step 4 starts from here)

- **Peels' dispatch and the ability vocabulary** (above): the charged clock, a roll after a delay, then the targets and fx as `Pick`s and shared actions.
- **Pizza perks still checked by name in the scene**: the audit's 23 (above).
- **The `Custom` one-offs** that share a shape (area damage, a projectile hit, a lane change) still want shared actions; the props (`EachFrame`) are one-offs by nature.
- **Card text for perks**: the new kinds' `describe()` reads plainly, but pizzas' `perkText` stays hand-written.
- **The guards**: a typecheck rule that every item declares an effect (toppings already all do; 23 pizzas and 3 peels don't yet), and the audit as a check in `npm run check` (it needs a running game: beside the golden check).

## Step 4: what was built (2026-11-28, branch effects-4)

The port is finished and the guards are on. Every topping, pizza and peel declares what it does; the triggers fire on a bus, under one off-switch rule; and a new item that declares nothing doesn't compile, nor pass `npm run check`. A refactor: the balance sim and every seeded scenario are identical run by run, and the golden check shows no differences. Three small, decided changes come with it ("Small items").

### The peels on the trigger bus

`src/game/peelBus.ts` is the peel's trigger bus: the same kinds, scopes, conditions and shared actions as the pizza perks' (`src/game/perkBus.ts`), with the peel's ability, the toppings' procs and Zombie Outbreak as its sources (`src/game/peelEffects.ts`, `peelParts`). The scene sends it each moment (a landed smack, a kill, a stomp, a wave's start, a frame, a slam, slices lost, charge for the clock) and the bus decides what fires, when, and how often. `fireProcs`, `procTick`, `abilityTick` and the `abilityT` timer are gone; `fireAbility` is only the bus's runner for the peel.

- **Groups, in the old order.** A moment goes to the peel's ability, then the toppings' procs (the peel's passive part, `also`, last of them, as it always ran), then Zombie Outbreak. Each group is set again when what's in it changes (a new peel, the toppings owned) and keeps the clocks of the sources it keeps; a group set again gets a state of its own, so what the replaced sources still do in a moment under way (a proc's kill can work the stats out again mid-frame, rebuilding the procs) lands on the old state, as it always did.
- **A delayed trigger** (`TriggerOpts.delay`): the whole trigger waits, its roll and conditions too. A proc's kill roll comes 40 ms after the kill (`Effect.OnKill(act, { chance, when: Cond.NotByAbility, delay: 0.04 s })`); the peel's own kill ability is the other way round, rolled at the kill and played a beat later (`Action.Later`).
- **A charged clock** (`Effect.Charged`, `src/effects/charged.ts`): a timed ability fills with time (× `PlayCtx.rate`, the meter boosts' timer) and from the typed sources it declares: `ChargeFrom.Time`, `Meter` (the meter's top-ups: Dough Spinner), `Event` (an event's slam prize), `HeadStart` (the meter's head start as a wave begins: S'mores, Pre-Heated Peel, Full Tank) and `Slots` (Pizza Slots' slam). The scene sends charge with `PeelBus.charge(from, share)`, which says whether a clock took it (else the meter fills, or the tips come); the HUD reads how full it is from the clock (`PeelBus.clockFill`).
- **A proc's timer looks at the field once a frame** for every proc (`Cond.Ready`, the Tick's `ready`), as the old loop did: one coming due after another's hit the last foot still goes off.
- **Strength**: the peel's chances are rolled at its meter boosts' chance (`PeelSource.k`), a proc's at 1.
- **Off-switches, as before**: a delayed moment lands only while the run is on; the peel's runner checks after its roll; the procs get a smack or a stomp only while the run is on (checked before their rolls).
- **Zombie Outbreak** is declared: `Effect.OnSmack(Action.Custom(PeelCustom.ZombieTurn))` and `Effect.OnKill(… ZombieHeal)`, after the procs. The outbreak's own clock (its zombies' bites, the wave's heal cap) stays the outbreak's: links already going finish whatever the peel.
- **The Incredible Bulk** is declared: `Effect.OnLosses(Unit.Count(3), Action.Ability(fx), { when: Cond.Flag(PeelFlag.InWave) })` (`src/effects/onLosses.ts`): once a wave, at the third slice lost. His move is the `bulkSmash` move (`heroMoves.ts`); the Endgame's `endgame_bulkSmash` opens the portals as he hulks out. The hero passives' `lost` hooks for both are gone.

### The 23 pizzas: rules, not names

`Effect.Rule(Rule.X, a?, b?)` (`src/effects/rule.ts`) declares a rule a perk changes in the scene's own code, with its numbers, plain or enhanced (`Enh`). The scene asks for the rule by its typed name for the pizza in question (`src/game/perkRules.ts`: `ruleOf(p, Rule.ThickCrust)`, `hasRule(p, Rule.NeverStale)`, `tableRule(run.enhancedPerks, Rule.TenthCrit)`), never for a perk: the perk declaring it, a borrower copying it and a pizza whose perk is off all read right. `RULE_DEFS` says, for each rule, whose perk it reads: the perk the pizza grants now (off while it's stale, frozen, possessed or eaten), or its own (a pizza being placed, going stale, destroyed or swapped out). Its words are the pizza's card (quiet).

| Pizza | Rule |
|---|---|
| Quattro Formaggi, Bufala | `ExtraShields` 1 (enhanced 2), `ShieldGlow` |
| Grandma Square | `Guard` (enhanced: itself too) |
| Sicilian Square, Stromboli | `ThickCrust` 30% (45%); Stromboli 0% (15%) and `Sturdy` |
| Pizza Bianca, Inferno Calzone | `Immune` (enhanced: its neighbours too), `Fireproof` |
| Meat Feast, Lahmacun | `MoreSlices` 4 / `FewerSlices` 2 (at least 4), `EnhanceSlices` 2, `BossRegrow` |
| Garden Veggie | `Regen` every 20 s (13 s) |
| Pumpkin Spice | `NeverStale`, `BossFreshen` 1 (2) |
| Pickle Pie, Pizza Fritta, Carbonara, Pizza al Taglio | `Preserve` ×0.5 (×0.25), `StaleHeal` 2 (3), `Rise` 3 (5), `Refund` 50% (75%) |
| Quattro Stagioni | `Seasons` |
| Pesto, Marinara, Tarte Flambée, Diavola | `SlowAbove` 25% (38%), `Aura` 6 (9), `HoverAura` 3 (4.5), `StompBurn` 10 (15) and `HauntedFire` |
| Tandoori, Greek, Mallow Mountain, Okonomiyaki | `MarkFirst` ×2 (×3), `Disarm` 3 s (5 s), `BounceTop` 1 (2), `StunnedDmg` ×1.5 (×1.75) |
| Spinach & Feta, the Calzone, Birthday Cake, Hawaiian, Cajun Shrimp, the Fig's | `RegrowGlow`, `WeakestGlow`, `FreeEvery` 5 (3), `TenthCrit` 10 (7), `SlamStun` 1.5 s (2.5 s) and 25% (40%), `CrustEarner` |
| Napoletana, Echo Slice, Arcobaleno, Mystery Meat, Kitchen Sink | `Boost` 5% (Run and the kit read `boostOf`), `Echo`, `Borrow`, `Mystery` (+0.5 strength), `Sink` |

No game code compares a perk to a name (the lint rule `effects/no-perk-names`): the scene, `Pizza`, `Run`, the kit and the Legendaries ask for rules, or for the firing perk (`fire.perk`: Untouchable, Fenrir, the Citadel and the tide find their own pizzas by it). The exceptions are the declarations themselves, the pizzas' data, the dev tools, and the STATS tab's hand-written perk tiles (`buildStats.ts`: see "What's left").

### Shared actions

- **`Action.Area(area, act)`** does an action to every foot in an area, one by one, each as the moment's foot: `Area.Field(cond)` (every foot that matches) or `Area.Column(px, cond)` (a lane up the table around the moment's foot). **`Hit.Plain(m)`** and **`Dps.Plain(m)`** are a hit and a burn of m × your smack damage whatever the strength (its strength went into its chance).
- **Dragon Fruit Flambé's fire lane**: `Action.Seq(Show(Look.FireLane), Area(Column(120 px, Hittable), Seq(Damage(Hit.Plain(×1)), Apply(Burn(3 s, Dps.Plain(×0.5))))))`.
- **Disco Diner Pie's dance beat**: `Action.Seq(Show(Look.DanceBreak), Area(Field(Standing), Seq(Apply(Slow(2 s, 30%, SlowStack.Strongest, fixed)), Show(Look.DanceNote))))`.
- **Visuals react**: the column of fire, the disco ball and the notes are looks (`LOOKS`), played in the old order so the cosmetic draws (which a waiter's tray can feel) come out the same.
- **Left as one-offs, and why**: the projectiles (meteor, comet, meatball, snowball, the lava bombs) land their hits when their flight's tween completes, and the ink's and soot's lane change sits inside their hold; turning them into `Action.Later` hits or a shared lane change moves when the damage lands within the frame, which changes seeded runs. They're for a deliberate change (see "What's left").

### One off-switch

- **One rule**: `grantsPerk(p, perk)` (`src/effects/trigger.ts`): a pizza grants a perk while it's its `Pizza.perk` (never while it's eaten, stale, frozen or possessed). Every scope reads it; so does a prop tied to an owner pizza (the Bifröst remembers its perk and asks it of its pizza), and the kit's own `with()`.
- **The field's and own triggers** are held by the bus: a `Scope.Field` trigger fires only while some pizza grants its perk, a `Scope.Own` one only while its pizza's perk is on (at its end, a destroyed one's: while it was on as it went). The per-trigger checks are gone (Arcobaleno's, the gaze's, the soot's, the harpies', the coils', the Bifröst's, Nonna's ladle and Secret, The First Bake's, the Citadel's).
- **Outliving its pizzas is declared**, with a typed reason (`TriggerOpts.outlives`, `Outlives`): `Props` (splats, ghosts, walls, stone feet, embers, inked and sooted feet, the rings, the hole, the tide: they play out and tidy themselves up), `TidyUp` (the wave's set-ups and tidy-ups that reset what's left), `OwnMoment` (placed, enhanced, Mystery Meat's reveal, its own loss: Fenrir, Untouchable) and `Follows` (Burrata follows a boss's phases; Roar Roast and Black Olive Hole share one clock). 46 triggers say so, 14 field-wide or own triggers are held by the rule. A prop that also starts something new splits in two: the gaze, the soot, the gusts and the coils start only while their pizza grants (`GorgonTick`, `SootTick`, `HarpyTick`, `CoilTick`), their stone feet, clouds, blown feet and held feet play out (`GorgonStone`, `SootCloud`, `HarpyBlown`, `CoilHold`). Ember Shade's embers stay one trigger, each ember glowing then burning in turn (the cosmetic draws' order), the burn waiting for a pie that grants it.
- **The lint rule `effects/no-own-off-switch`** (the kit and the Legendaries): a one-off that reads `stale`, `perkFrozen`, `perkOff` or `possessed()` is an error; the three deliberate ones say why (Fenrir's last howl, Untouchable's own loss, the echo's ring).

### The guards

- **Compile time** (`Effects`: a non-empty list):
  - every topping (`Upgrade.effects: Effects`, required; the builders take it);
  - every peel ability built with `ab()` (its `fx` non-empty; Zombie Outbreak's peel is `outbreak()`, whose effects are the outbreak's; the heroes' builders always carry a move);
  - every pizza perk: `PERK_EFFECTS` keeps its perks' literal names (`as const satisfies … Effects`), `PERK_STATS` knows which perks have no stats (`none` is marked), and `EVERY_PERK_DECLARES` fails to compile, naming the perk, when one declares no trigger, rule or stat (the table-shaped perks count as declared: `TABLE_SHAPED`).
- **In `npm run check`**: `npm run golden` runs the effects audit headless (`F.effectsProblems()`, `problemsOf` in `src/devEffectsAudit.ts`) and fails on an item declaring nothing (a trigger whose action is empty counts as nothing), an item shown on neither STATS nor a card, a trigger skipping the off-switch (an unknown scope or reason, a Field or Own trigger on a topping or peel, or a reason on a trigger its scope holds anyway), or an adapter that throws. It prints the off-switch's tally: `14 field-wide or own triggers held by it, 46 outliving their pizzas (24 props, 12 tidyUp, 2 follows, 8 ownMoment), 14 rules read the pizza's own perk`.
- **Lint**: `effects/no-perk-names` and `effects/no-own-off-switch` (above), with their tests (91 cases in all).
- **Shown failing**: on a copy of the branch, removing Garden Veggie's rule gives `Type 'boolean' is not assignable to type '{ undeclared: "regen"; }'`; `effects: []` on Chili Flakes `Type '[]' is not assignable to type 'Effects'. Source has 0 element(s) but target requires 1.`; `ab('Soggy Socks', smack(0.3), [], …)` `Argument of type '[]' is not assignable to parameter of type 'readonly [Effect, ...Effect[]]'`. Forcing all three past the types (`as unknown as`), `npm run golden` fails: `3 effects audit problem(s): toppings: chili declares no effect; pizzas: veggie (regen) declares no effect; peels: foot:sock declares no effect`.

### Small items

- **Chili Flakes** reads its generated text at LV1 too ("Smacks burn feet: +6 dmg/s"): the override kept for the old text-reading bot is gone. Every topping still fits (`F.cardTextFit()` at desktop and phone size); 16 toppings keep a hand-written side.
- **Your Table's names**: a long name takes a second line, balanced, as the counter's Legendaries do (`.ptile .nm`), rather than being cut off. All 159 pizza names checked in a tile at desktop (1280×720) and phone (844×390) size: every one fits, 6 on two lines (Cosmic Crouton Supreme, Bone Marrow & Black Garlic…).
- **STATS**: Echo Slice's ECHOING tile takes the smaller size (a word in capitals runs wider than digits).
- **The null-`fill` console error**: not reproduced in 70 scripted back-to-back restarts (30 mixed and 40 with the step-3 aura lineup that once showed it; peels and tables varied, the auto-player on, restarting after 60 ms to 2.5 s). Its message (a 2-D context's `fill` read on null) points at a canvas whose context was lost; without a stack it's left open.

### How to add a new item (the Act 4+ Legendaries, and anything after)

1. **Declare everything it does** in one place: a pizza perk's triggers and rules in `PERK_EFFECTS` (`src/game/perkEffects.ts`), its numbers in `PERK_STATS` (`src/game/perkStats.ts`); a topping's `effects` with its builder (`src/data/toppingDefs.ts`); a peel's ability with `ab()` (`src/game/abilities.ts`). It won't compile until it declares at least one effect.
2. **Pick the moment and who fires**: a timer `Effect.Every` (or `Effect.Charged` for a clock others feed), a chance on a hit `Effect.OnSmack` with `chance`/`cap`, a kill `OnKill` (`delay` if its roll waits), a stomp `OnStomp`, a defence `Effect.Defend` (`Guard.Early` / `Guard.Wall`), a set-up `WaveStart` / `WaveOpen`, a tidy-up `WaveClose`, a prop `EachFrame`, a per-hit number `Effect.PerHit`; a rule the scene reads `Effect.Rule` (add the rule to `Rule` and `RULE_DEFS`). Its scope says who fires: `Table`, `Each`, `Sum`, `Target`, `Alive`, `Own`, `Field`.
3. **Say what it does with shared actions first**: `Action.Damage(Hit.Legend(…))` (`Hit.Plain` when the strength is in the chance), `Action.Area(Area.Field | Area.Column, …)`, `Action.Apply(Status.Burn | Slow | Stun | Freeze)`, `Tips`, `Heal`, `Meter`, `Crust`, `Knock`, `Later`, `Seq`; a one-off only for what's truly its own (`Custom`, its body in the kit), and its looks as `Look`s (effects never draw).
4. **Keep the off-switch**: never check stale, frozen or possessed in its body (the lint rule says so). A field-wide trigger is held while no pizza grants its perk; a prop that outlives its pizza declares `outlives: Outlives.Props` (or `TidyUp`, `OwnMoment`, `Follows`) and asks `grantsPerk(owner, fire.perk)` before it starts anything new. Find its pizzas through the firing (`fire.pizzas`, `fire.perk`), never by its name.
5. **Keep the order** when it shares a moment with others: triggers run in the order they're listed, and its random draws (gameplay: `Math.random` through `ctx.roll` or the kit; looks: `crand()`) land where they are.
6. **Check it**: `npm run check` (types, lint, golden, card text, the effects audit: it must show on STATS or its card); a `--lineup` sim of it plain and `--enhance`d; `?dev` play; its STATS tile and card text.

### Checks

- `npm run check` passes: no golden differences (1,202 builds), every topping's card text fits at desktop and phone size, the card-text audit is clean (201 generated, 16 with a hand-written side, 43 the scene's own), the effects audit is clean (260 toppings, 159 pizzas, 640 peels, 1,566 effects), 91 lint test cases.
- **Balance sim** (`nice npm run sim -- --heat mild,regular --runs 2 --waves 40 --shop auto --workers 2`) against a copy of main, on the finished code: identical, every field of every run (crusts 263, 259, 523, 547).
- **Seeded scenarios**, each against the same copy of main, every field compared:
  - step 3's 46 (the perk families, the Legendaries, the toppings, the peels, Infinite Oven): all identical, but one run of `top3` (below);
  - 16 new: the 23 pizzas (5 tables, plain and `--enhance`, Mild and Regular, the light bot), the peels' clocks and chances (timed abilities with Full Tank and Dried Oregano ×4, kill and smack abilities with Dried Oregano ×4, a timed ability with five procs), Zombie Outbreak and the Bulk (`peels7`), the fire lane and dance beat with the projectiles (`act1`, plain and enhanced): all identical but the zombie runs and one `act1` run (below).
- **Main doesn't always repeat itself.** Run twice on the same copy of main, three tables differ from themselves: `act1` (Mild seed 2, from wave 14), `top3` (Regular seed 1) and the zombie peels' runs in `peels7` (5 of 16: the outbreak builds its zombie art in the background). In each, this branch matches main's second run (`act1` 4/4, `top3` 4/4); the zombie runs differ from main's either run as much as main's runs do from each other, while every non-zombie run of `peels7` (the Bulk's 8 included) is identical. A repeatability leak in main for those tables, to look into; not this change.
- **Traced** (`--trace`, random draw by random draw and the field each step), where a scenario differed during the work: a mid-frame rebuild of the procs (a proc's kill set off a boss's loot, which works the stats out again) kept the old loop's timers apart, now kept by each group's own state; Ember Shade's split into glow and burn moved cosmetic draws a waiter's tray could feel, now one trigger again; the glows of Spinach & Feta and the Calzone keep their old places.
- **`?dev` play** (the auto-player at ×6): the timed (Neon Pulse 26 fires with Anchovy procs), kill (Ruby Rage), smack (Soggy Socks), active (Pirouette) abilities, Zombie Outbreak (8 zombies), the Bulk (his rage once a wave; the Endgame's portals), the 23 pizzas (thick crust, Grandma's guard, the marks, the bounces, Diavola's fire, shields), the fire lane (×20) and the dance break all fired; frozen, the Gorgon, the soot, the harpies and the coils started nothing and the Bifröst came down; possessed, the Gorgon gazed at no foot. No console errors.
- **Screenshots** of the shop (Your Table with Cosmic Crouton Supreme and Bone Marrow & Black Garlic) and STATS at desktop (1280×720) and phone (844×390) size: `F.contrast()` clean; `F.layout()` lists only the pizza tier tabs (by design).
- **Review**: an independent review of the diff. Fixed from it: a peel's stomp ability and stomp procs fire even when the stomper is already down (`TriggerOpts.evenIfDown`: Effect.OnStomp's own check skipped, as the scene always fired them); the procs' "run is on" check on a smack or a stomp comes as their turn comes, after the ability's (`emit`'s `procsWhileLive`); the field-wide off-switch looks at the pizzas granting the perk now, not the counts of the last recompute; stale comments. Noted, not changed: a resumed run saved with the old Peel Slam switch off has no ability, so the Bulk wouldn't hulk out in it (his rage is his ability now); the lint rules don't see a perk name in an `includes` list or a map lookup, nor `haunted` / `dead` reads; a perk whose stats are `(c) => []` passes the type rule (the audit catches it).

### What's left

- **The STATS tab's perk tiles** (`src/game/buildStats.ts`) are still written by hand and find their pizzas by perk name (75 places): the one place `effects/no-perk-names` doesn't cover. Each could read its perk's declarations (a rule's value, a trigger's numbers) the way the stat tiles read the ledger.
- **The projectile hits and the lane change** (meteor, comet, meatball, snowball, Volcano's lava bombs; Squid Ink's and the soot's relane) stay one-offs: their hits land when their flight's tween completes. A shared `Action.Fly(…, hit)` with the flight's time declared would change when they land within a frame, so it's a deliberate change for its own commit, sim before and after.
- **Card text for perks**: pizzas' `perkText` stays hand-written (`describe()` of the new kinds reads plainly).
- **The heroes' passives** (`src/game/heroMoves.ts`, `PASSIVES` by hero id) are their own system; only the Incredible Bulk's rage moved onto the bus.
- **The null-`fill` error**: open (above).
