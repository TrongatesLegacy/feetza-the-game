# Effects plan: one plug-and-play system for perks, toppings and peels

Status: **proposed (2026-11-28), waiting for Tron's go-ahead.**

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

- `Effect.OnKill({ … })` builds the effect: plain data, tagged with its kind. It can be saved with the run, copied by Echo Slice and searched by tag.
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

10. **Old and new side by side.** One adapter, `Effect.Legacy(perkId)`, runs an unported perk the old way. The port can go a family at a time while the game keeps working.

## How it gets there (each step ships on its own, game unchanged)

1. **Inventory and vocabulary:** list every effect today (toppings, perks, peels, heroes, meta) and group them into stat effects, triggers and actions. Write the vocabulary and its adapters. Port the stat effects first (the easy majority). STATS reads the declarations, and every hand-written tile becomes an adapter's display.
2. **The trigger bus:** port the pizza perks' behaviours from `pizzaPerks.ts` onto triggers and shared actions, one family at a time (timers, on-kill, on-stomp, on-smack, wave start). Each family is checked with the balance sim for identical numbers before and after.
3. **Toppings and peels:** move their in-play checks by id onto the same bus. Peel abilities' `fx` become the same actions.
4. **Guards:** a typecheck rule that every item declares at least one effect, and a dev audit (`F.effectsAudit()`) that puts every item through the adapters. Nothing can be invisible on STATS or skip the stale/frozen rules.

**Order:** best done **before the remaining 21 Legendaries**, so they're built on it rather than adding more one-off wiring. Act 3's batch is already under way and is ported in step 2 like the rest.

**Checks for every step:**
- the balance sim on fixed seeds gives the same results before and after (a refactor, not a rebalance);
- `?dev` play of each family;
- the STATS tab compared against the current one;
- an independent code review.
