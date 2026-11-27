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
  Effect.Stat(Stat.ConsumableCards, Op.add(1)),                                  // Mac & Cheese
  Effect.OnKill({ chance: 0.15, action: Action.Summon(Ally.FriendlyGhost) }),    // Phantom Waltz
  Effect.Every({ sec: 20, action: Action.BlowUp(Target.Diving) }),               // Steam Bun Pie
  Effect.OnStomp({ perWave: 1, action: Action.Block({ stunSec: 1 }) }),          // Granite Crust
]
```

Each kind of effect is written **once**, in its own file: its fields, and what it does in play, on STATS, when scaled and in searches. Writing it once gives both the `Effect.OnKill(...)` used above and its registered behaviour:

```ts
// effects/onKill.ts: everything about "on kill", in one place
export const OnKill = effectKind('onKill', {
  // its fields (typed; a missing one doesn't compile)
  make: (o: { chance: number; action: ActionData }) => ({ chance: check01(o.chance), action: o.action }),
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
