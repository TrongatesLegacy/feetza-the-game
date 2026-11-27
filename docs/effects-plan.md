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

```ts
// a pizza, a topping or a peel all say what they do the same way: typed variants, every field required
effects: [
  { kind: Effect.Stat, stat: Stat.ConsumableCards, op: Op.Add, value: 1 },                        // Mac & Cheese
  { kind: Effect.OnKill, chance: 0.15, action: { kind: Action.Summon, ally: Ally.FriendlyGhost } }, // Phantom Waltz
  { kind: Effect.Every, sec: 20, action: { kind: Action.BlowUp, target: Target.Diving } },          // Steam Bun Pie
  { kind: Effect.OnStomp, perWave: 1, action: { kind: Action.Block, stunSec: 1 } },                 // Granite Crust
]
```

Items write them through small constructors, which return exactly those typed objects:

```ts
effects: [
  Effect.stat(Stat.ConsumableCards, Op.add(1)),                    // Mac & Cheese
  Effect.onKill({ chance: 0.15, action: Action.summon(Ally.FriendlyGhost) }), // Phantom Waltz
  Effect.every({ sec: 20, action: Action.blowUp(Target.Diving) }), // Steam Bun Pie
]
```

Positional arguments are used for one or two obvious values, and a typed object for more (TypeScript has no named arguments, so `{ chance, action }` stands in for them). The constructors check their values (a chance between 0 and 1) and hold the defaults. What they return stays plain data, so a `switch` on `kind` still works and runs save and load cleanly.

**Where the behaviour lives:** effects are data, and each kind's behaviour lives in one module beside its type, registered once. Nothing using an effect needs to know what kind it is:

```ts
// effects/onKill.ts: everything about one kind of effect, in one place
export const onKill = defineEffect(Effect.OnKill, {
  apply: (e, ctx) => ctx.on(GameEvent.Kill, (foot) => { if (ctx.roll(e.chance)) runAction(e.action, ctx, foot); }),
  describe: (e) => `${pct(e.chance)} of kills: ${describeAction(e.action)}`,  // the STATS tile and card text
  scale: (e, k) => ({ ...e, chance: Math.min(1, e.chance * k) }),              // enhanced, Napoletana, Echo Slice
  tags: (e) => actionTags(e.action),                                            // "summons", "freezes", ...
});

// anywhere else: no switch, no knowledge of the kinds
for (const e of item.effects) effects.apply(e, ctx);
```

Every name is a constant (`Effect.OnKill`, `GameEvent.Kill`), never typed out by hand. Each constant's value is a string (`Effect.OnKill = 'onKill'`), so saves stay readable and don't break when a kind is added. Numbered enums would shift and break old saves. The registry is typed as a `Record` over every kind, so a kind with no module (or one missing `describe` or `scale`) fails the typecheck. `ctx` is one small interface onto the game (subscribe to an event, roll, find feet, run an action), so effects never reach into the scene. They stay data (saved with the run, copied by Echo Slice, searched by tag), while working like objects with their own methods.

(The names are `as const` objects, so `Stat.ConsumableCards` autocompletes, renames safely and can't be misspelt. Each variant is its own type with no optional "options bag", so an effect that's missing a field doesn't compile.)

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

Effects are a **discriminated union**, TypeScript's version of Rust's enums: each variant carries its own data, for example `{ kind: 'stat', stat: StatKey, op, value }`, `{ kind: 'onKill', chance, action: Action }` or `{ kind: 'every', sec, action }`. The adapters are a `Record<EffectKind, Adapter>`, and every `switch` ends in an `assertNever`. Adding a kind of effect then fails the typecheck until its apply, its STATS display and its scaling are all written, and stat names are a typed key union, so a typo can't compile. This is the guarantee that stops a detail going missing.

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
