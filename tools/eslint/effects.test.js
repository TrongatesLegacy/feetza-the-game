// Tests for the effect declarations' lint rules (tools/eslint/effects.js): `npm run lint:test` (part of `npm run check`).
// Each rule has valid and invalid cases; a fixable one checks its fix too.

import assert from 'node:assert/strict';
import { Linter, RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import plugin from './effects.js';

const tester = new RuleTester({ languageOptions: { parser: tseslint.parser, ecmaVersion: 'latest', sourceType: 'module' } });
const rule = (name) => plugin.rules[name];
let ran = 0;
const run = (name, cases) => {
  tester.run(name, rule(name), cases);
  ran += cases.valid.length + cases.invalid.length;
};

const IMPORTS = "import { Effect, Op, Stat, Unit, UnitKind, Action, At, Pay, Nth, Enh, Grows, Source, Custom } from '../effects';\n";
const code = (s) => IMPORTS + s;

// ——— one effect per line ———
run('one-effect-per-line', {
  valid: [
    code('const t = { effects: [\n  Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1))),\n] };'),
    code('const t = { effects: [] };'),
    // a list passed positionally: [ ends its line, ] starts its line
    code("stat('rolling', 'Rolling Pin', [\n  Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1))),\n  Effect.Stat(Stat.Radius, Op.Add(Unit.Px(4))),\n]);"),
    // an array that holds no effects isn't an effect list
    code('const xs = [1, 2, 3];'),
    code("const list = [Source.Meta, 'x'];"),
  ],
  invalid: [
    {
      code: code('const t = { effects: [Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1)))] };'),
      output: code('const t = { effects: [\n  Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1))),\n] };'),
      errors: [{ messageId: 'layout' }],
    },
    {
      // two on one line, inside a call, indented: the entries go one level in from the line the list starts on
      code: code("  stat('rolling', [Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1))), Effect.Stat(Stat.Radius, Op.Add(Unit.Px(4)))]);"),
      output: code("  stat('rolling', [\n    Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1))),\n    Effect.Stat(Stat.Radius, Op.Add(Unit.Px(4))),\n  ]);"),
      errors: [{ messageId: 'layout' }],
    },
    {
      // any `effects:` list, spreads too
      code: code('const t = { effects: [...a, ...b] };'),
      output: code('const t = { effects: [\n  ...a,\n  ...b,\n] };'),
      errors: [{ messageId: 'layout' }],
    },
    {
      // ] not on its own line
      code: code('const t = { effects: [\n  Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1)))] };'),
      output: code('const t = { effects: [\n  Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1))),\n] };'),
      errors: [{ messageId: 'layout' }],
    },
    {
      // Effect under another name
      code: "import { Effect as Eff, Op, Stat, Unit } from '../effects';\nghost([Eff.Stat(Stat.Damage, Op.Mul(Unit.Mult(0.9)))]);",
      output: "import { Effect as Eff, Op, Stat, Unit } from '../effects';\nghost([\n  Eff.Stat(Stat.Damage, Op.Mul(Unit.Mult(0.9))),\n]);",
      errors: [{ messageId: 'layout' }],
    },
    {
      // a comment between entries would be lost by the reflow: reported, not fixed
      code: code('const t = { effects: [Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1))), /* why */ Effect.Stat(Stat.Radius, Op.Add(Unit.Px(4)))] };'),
      output: null,
      errors: [{ messageId: 'layout' }],
    },
    {
      // an entry over several lines moves in as a whole, its continuation lines with it
      code: code('    put([Effect.Stat(\n      Stat.Damage,\n      Op.Add(Unit.Amount(1)),\n    )]);'),
      output: code('    put([\n      Effect.Stat(\n        Stat.Damage,\n        Op.Add(Unit.Amount(1)),\n      ),\n    ]);'),
      errors: [{ messageId: 'layout' }],
    },
    {
      // an entry in its own parentheses keeps them
      code: code('const t = { effects: [(Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1))))] };'),
      output: code('const t = { effects: [\n  (Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1)))),\n] };'),
      errors: [{ messageId: 'layout' }],
    },
    {
      // a template string over several lines would change if re-indented: reported, not fixed
      code: code('  const t = { effects: [Effect.OnKill(Action.Custom(`a\n  b`))] };'),
      output: null,
      errors: [{ messageId: 'layout' }],
    },
  ],
});

// ——— Effect.*(…) arguments one per line ———
run('effect-args-per-line', {
  valid: [
    code('Effect.Stat(\n  Stat.Damage,\n  Op.Add(Unit.Amount(1)),\n);'),
    // one argument stays on one line
    code('Effect.OnKill(Action.Custom(Custom.Meatball));'),
    // Op and Unit calls aren't Effect calls
    code('Op.Add(Unit.Chance(18)).EachLevelUp.Add(Unit.Chance(10));'),
  ],
  invalid: [
    {
      code: code('Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1)));'),
      output: code('Effect.Stat(\n  Stat.Damage,\n  Op.Add(Unit.Amount(1)),\n);'),
      errors: [{ messageId: 'layout', data: { name: 'Effect.Stat' } }],
    },
    {
      // the inner calls and the options object stay on one line each
      code: code('  [\n    Effect.OnKill(Action.Tips(Pay.Fixed(Unit.Amount(1)), At.Foot(Unit.Px(40))), { chance: Unit.Chance(20) }),\n  ]'),
      output: code('  [\n    Effect.OnKill(\n      Action.Tips(Pay.Fixed(Unit.Amount(1)), At.Foot(Unit.Px(40))),\n      { chance: Unit.Chance(20) },\n    ),\n  ]'),
      errors: [{ messageId: 'layout', data: { name: 'Effect.OnKill' } }],
    },
    {
      // ( and ) on their own lines
      code: code('Effect.Stat(Stat.Damage,\n  Op.Add(Unit.Amount(1)));'),
      output: code('Effect.Stat(\n  Stat.Damage,\n  Op.Add(Unit.Amount(1)),\n);'),
      errors: [{ messageId: 'layout' }],
    },
    {
      // an argument in its own parentheses keeps them
      code: code('Effect.Stat(Stat.Damage, (Op.Add(Unit.Amount(1))));'),
      output: code('Effect.Stat(\n  Stat.Damage,\n  (Op.Add(Unit.Amount(1))),\n);'),
      errors: [{ messageId: 'layout' }],
    },
    {
      // a comment between arguments: reported, not fixed
      code: code('Effect.Stat(Stat.Damage, /* why */ Op.Add(Unit.Amount(1)));'),
      output: null,
      errors: [{ messageId: 'layout' }],
    },
  ],
});

// ——— no arithmetic ———
run('no-effect-arithmetic', {
  valid: [
    code('Effect.Stat(Stat.OliveRate, Op.Set(Unit.Every(Unit.Seconds(1.6))));'),
    code('Effect.Stat(Stat.Damage, Op.Boost(Unit.scale(Unit.Percent(10), c)));'),
    code('Effect.Stat(Stat.CoinMult, Op.Add(Unit.plus(Unit.scale(a, x), Unit.scale(b, y))));'),
    // Grows' reason is words: its strings join with +
    code("Effect.Stat(Stat.Damage, Op.Boost(Grows((x) => Unit.Percent(x.n), (x) => x.n + ' peels owned')));"),
    // arithmetic outside a declaration, and Unit's maths outside one, is ordinary game code
    code('const k = a * b; Unit.tick(left, dt * 2); Unit.scale(v, 1 - p);'),
    code("const s = 'a' + b;"),
    // a join of three or more parts is still words
    code("Effect.OnKill(Action.Custom(Custom.Meteor), { note: 'a' + n + m });"),
  ],
  invalid: [
    { code: code('Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(a * 2)));'), errors: [{ messageId: 'arith', data: { op: '*' } }] },
    { code: code('Unit.Percent(x / 100);'), errors: [{ messageId: 'arith', data: { op: '/' } }] },
    { code: code('Op.Add(Unit.Rate(1 / 1.6));'), errors: [{ messageId: 'arith', data: { op: '/' } }] },
    { code: code('Effect.OnKill(Action.Tips(Pay.Fixed(Unit.Amount(1)), At.Foot(-40)));'), errors: [{ messageId: 'arith', data: { op: 'unary -' } }] },
    { code: code('Effect.Stat(Stat.Luck, Op.Add(Unit.of(UnitKind.Count, a + b)));'), errors: [{ messageId: 'arith', data: { op: '+' } }] },
    // a Grows' value is checked like any declaration
    { code: code("Effect.Stat(Stat.Damage, Op.Boost(Grows((x) => Unit.of(UnitKind.Percent, 0.01 * x.n), (x) => 'why')));"), errors: [{ messageId: 'arith', data: { op: '*' } }] },
    // a destructured Unit helper inside a declaration
    { code: code('const { scale } = Unit;\nEffect.Stat(Stat.Damage, Op.Add(scale(Unit.Percent(10), c % 3)));'), errors: [{ messageId: 'arith', data: { op: '%' } }] },
    { code: code('Op.Add(Unit.Chance(18)).EachLevelUp.Add(Unit.Chance(5 + 5));'), errors: [{ messageId: 'arith', data: { op: '+' } }] },
    // through type wrappers, and a chain through `!`
    { code: code('Op.Add(<Amount>(a * 2));'), errors: [{ messageId: 'arith', data: { op: '*' } }] },
    { code: code('Op.Add((a * 2) as Amount);'), errors: [{ messageId: 'arith', data: { op: '*' } }] },
    { code: code('Op.Add(Unit.Count(1))!.EachLevelUp.Add(Unit.Count(n - 1));'), errors: [{ messageId: 'arith', data: { op: '-' } }] },
    // a Unit maker destructured inside a function
    { code: code('function f() { const { Percent } = Unit; return Percent(x / 2); }'), errors: [{ messageId: 'arith', data: { op: '/' } }] },
  ],
});

// ——— no bare numbers in an Op ———
run('op-needs-unit', {
  valid: [code('Op.Add(Unit.Count(1));'), code('Op.Add(v);'), code('Op.Nothing.EachLevelUp.Add(Unit.Count(1));'), code('Math.max(1, 2);')],
  invalid: [
    { code: code('Effect.Stat(Stat.Cutters, Op.Add(1));'), errors: [{ messageId: 'bare', data: { n: '1', name: 'Add' } }] },
    { code: code('Op.Mul(-0.5);'), errors: [{ messageId: 'bare', data: { n: '-0.5', name: 'Mul' } }] },
    { code: code('Op.Add(Unit.Chance(18)).EachLevelUp.Add(10);'), errors: [{ messageId: 'bare', data: { n: '10', name: 'Add' } }] },
    { code: code('Op.Add(Unit.Count(1))!.EachLevelUp.Add(5);'), errors: [{ messageId: 'bare', data: { n: '5', name: 'Add' } }] },
  ],
});

// ——— no hand-typed strings ———
run('no-loose-strings', {
  valid: [
    code('Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1)));'),
    code('Unit.of(UnitKind.Percent, x);'),
    // the counter's flag name (Nth, oncePerWave), Grows' reason and the game's own lookups have no typed name
    code("Effect.OnKill(Action.Reroll(), { nth: Nth(Enh(Unit.Count(10), Unit.Count(7)), 'duckKills'), oncePerWave: 'salmonWave' });"),
    code("Effect.Stat(Stat.Damage, Op.Boost(Grows((x) => Unit.Percent(x.n), (x) => `${x.n} peels owned`)));"),
    code("Effect.Stat(Stat.Damage, Op.Boost(Unit.scale(Unit.Percent(8), meta('wrists'))));"),
    // a free id
    code("Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(Source.Topping('salt').length)));"),
    // strings outside a declaration
    code("Action.Custom('meteor'); const s = 'damage';"),
  ],
  invalid: [
    {
      code: code("Effect.Stat('damage', Op.Add(Unit.Amount(1)));"),
      output: code('Effect.Stat(Stat.Damage, Op.Add(Unit.Amount(1)));'),
      errors: [{ messageId: 'typed', data: { text: "'damage'", fix: 'Stat.Damage' } }],
    },
    {
      code: code("Effect.Stat(Stat.Luck, Op.Add(Unit.of('count', n)));"),
      output: code('Effect.Stat(Stat.Luck, Op.Add(Unit.of(UnitKind.Count, n)));'),
      errors: [{ messageId: 'typed', data: { text: "'count'", fix: 'UnitKind.Count' } }],
    },
    {
      // no Stat in scope: reported, not fixed
      code: "import { Effect, Op, Unit } from '../effects';\nEffect.Stat('critChance', Op.Add(Unit.Chance(5)));",
      output: null,
      errors: [{ messageId: 'typed', data: { text: "'critChance'", fix: 'Stat.CritChance' } }],
    },
    {
      // only a type in scope (import type): reported, not fixed
      code: "import { Effect, Op, Unit } from '../effects';\nimport type { UnitKind } from '../effects/units';\nOp.Add(Unit.of('count', n));",
      output: null,
      errors: [{ messageId: 'typed', data: { text: "'count'", fix: 'UnitKind.Count' } }],
    },
    {
      // an action named by hand, inside an effect
      code: code("Effect.OnKill(Action.Custom('meteor'));"),
      errors: [{ messageId: 'loose' }],
    },
    {
      // an options field
      code: code("Effect.OnKill(Action.Reroll(), { scope: 'target' });"),
      errors: [{ messageId: 'loose' }],
    },
    {
      // a choice between hand-typed names
      code: code("Effect.OnKill(Action.Custom(big ? 'meteor' : 'comet'));"),
      errors: [{ messageId: 'loose' }, { messageId: 'loose' }],
    },
  ],
});

// ——— typed item names ———
const ITEMS = "import { Rarity } from './rarity';\nimport { OnPick, UpgradeKind, NeedsMeter } from './itemKinds';\n";
run('typed-item-names', {
  valid: [
    ITEMS + "Topping({ id: 'earplugs', rarity: Rarity.Common, maxLevel: 2, kind: UpgradeKind.Unique, onPick: OnPick.Bogo, needsMeter: NeedsMeter.Tank });",
    ITEMS + 'if (u.rarity === Rarity.Epic || kindOf(u) !== UpgradeKind.Consumable) go();',
    ITEMS + 'switch (p.rarity) { case Rarity.Rare: break; }',
    // other objects have kinds and picks of their own (a shop offer, a target pick)
    "const offer = { id: 'x', kind: 'special' }; const at = { pick: 'random', of: c }; if (o.kind === 'special') go();",
    // a route that happens to be called 'rare', and a word that isn't a rarity
    "const p = { id: 'x', route: 'rare', rarity: Rarity.Common }; if (u.rarity === 'uncommon') go();",
  ],
  invalid: [
    {
      code: ITEMS + "Topping({ id: 'earplugs', rarity: 'common', maxLevel: 2 });",
      output: ITEMS + "Topping({ id: 'earplugs', rarity: Rarity.Common, maxLevel: 2 });",
      errors: [{ messageId: 'typed', data: { text: "'common'", fix: 'Rarity.Common' } }],
    },
    {
      // a pizza: an object with an id and a rarity
      code: ITEMS + "const p = { id: 'romana', rarity: 'epic', kind: 'unique' };",
      output: ITEMS + "const p = { id: 'romana', rarity: Rarity.Epic, kind: UpgradeKind.Unique };",
      errors: [{ messageId: 'typed' }, { messageId: 'typed' }],
    },
    {
      code: ITEMS + "KitTopping({ id: 'x', rarity: Rarity.Rare, onPick: 'roulette', needsMeter: 'meter' });",
      output: ITEMS + "KitTopping({ id: 'x', rarity: Rarity.Rare, onPick: OnPick.Roulette, needsMeter: NeedsMeter.Meter });",
      errors: [{ messageId: 'typed' }, { messageId: 'typed' }],
    },
    {
      // checks, either way round, and a switch
      code: ITEMS + "if (u.rarity === 'legendary' || 'rare' !== p?.rarity || kindOf(u) === 'consumable') go(); switch (u.rarity) { case 'epic': break; }",
      output: ITEMS + 'if (u.rarity === Rarity.Legendary || Rarity.Rare !== p?.rarity || kindOf(u) === UpgradeKind.Consumable) go(); switch (u.rarity) { case Rarity.Epic: break; }',
      errors: [{ messageId: 'typed' }, { messageId: 'typed' }, { messageId: 'typed' }, { messageId: 'typed' }],
    },
    {
      // a card's kind, a fallback and a definition by hand (a shop offer's kind 'special' is its own: see valid)
      code: ITEMS + "if (c.kind === 'unique') go(); const r = p.rarity ?? 'common'; const d = RARITY_DEFS['epic'];",
      output: ITEMS + 'if (c.kind === UpgradeKind.Unique) go(); const r = p.rarity ?? Rarity.Common; const d = RARITY_DEFS[Rarity.Epic];',
      errors: [{ messageId: 'typed' }, { messageId: 'typed' }, { messageId: 'typed' }],
    },
    {
      // no Rarity in scope: reported, not fixed
      code: "const p = { id: 'x', rarity: 'rare' };",
      output: null,
      errors: [{ messageId: 'typed', data: { text: "'rare'", fix: 'Rarity.Rare' } }],
    },
  ],
});

// ——— step 4: no pizza perk checked by name ———
run('no-perk-names', {
  valid: [
    'if (hasRule(p, Rule.ThickCrust)) block();',
    'const t = ruleOf(f.target, Rule.Disarm);',
    // the firing perk, or a perk held in a variable, isn't a name
    'if (q.type.perk === fire.perk) keep(q);',
    "if (f.type.id === 'golden') pay();",
    "const has = traits.has('regen');",
  ],
  invalid: [
    { code: "if (p.perk === 'thick') block();", errors: [{ messageId: 'named', data: { perk: 'thick' } }] },
    { code: "if (f.target?.perk !== 'disarm') return;", errors: [{ messageId: 'named', data: { perk: 'disarm' } }] },
    { code: "const s = p.type.perk === 'rotate';", errors: [{ messageId: 'named', data: { perk: 'rotate' } }] },
    { code: "const n = run.enhancedPerks.has('slamStun') ? 2.5 : 1.5;", errors: [{ messageId: 'named', data: { perk: 'slamStun' } }] },
    { code: "switch (p.perk) { case 'shield': break; }", errors: [{ messageId: 'named', data: { perk: 'shield' } }] },
  ],
});

// ——— step 4: a perk's one-off never reads its own off-switch ———
run('no-own-off-switch', {
  valid: [
    'if (!grantsPerk(t, perk)) return;',
    'for (const p of fire.pizzas) p.perkFired();',
    // a write is the pizza's own business
    'p.perkFrozen = false;',
  ],
  invalid: [
    { code: 'if (t.stale || t.perkFrozen) return;', errors: [{ messageId: 'own' }, { messageId: 'own' }] },
    { code: 'if (p.perkOff) return false;', errors: [{ messageId: 'own' }] },
    { code: 'if (p === this.a.possessed()) return;', errors: [{ messageId: 'own' }] },
  ],
});

// ——— no gameplay in tweens (tools/eslint/tweens.js) ———
run('no-gameplay-in-tweens', {
  valid: [
    // looks only: destroy, a puff, a sound, a cosmetic roll, a nested look
    "a.sc.tweens.add({ targets: img, y: 10, duration: 200, onComplete: () => { img.destroy(); a.fx.puff(x, y, 4); a.sfx('sfx_x'); img.angle = crand() * 360; } });",
    'this.tweens.add({ targets: b, alpha: 0, duration: 90, onUpdate: () => (b.x += 1), onComplete: () => this.tweens.add({ targets: b, scale: 0, duration: 60, onComplete: () => b.destroy() }) });',
    // a call through a look's own object is a look: a.fx.burn is a flame
    'a.sc.tweens.addCounter({ from: 0, to: 1, duration: 300, onUpdate: () => crand() < 0.4 && a.fx.burn(m.x, m.y) });',
    // the game clock's tweens are where gameplay belongs
    "clockOf(a.sc).tween({ targets: m, x: 1, duration: 480, onComplete: () => { m.destroy(); this.h.dealDamage(f, dmg, 'explode', 500); } });",
    // a scene's own events and a loader's aren't an animation's
    "this.events.once('update', () => this.killFoot(f));",
    "this.load.once('complete', () => { run.coins = 0; });",
    // listed as visual-only, with a reason
    "sc.tweens.add({ targets: t2, y: 1, duration: 230,\n  // visual-only: the ending's cutscene (dust.spawn is a particle puff)\n  onComplete: () => dust.spawn({ x: 1 }) });",
    // a foot's picture (its root) is a look; `this` outside Foot.ts isn't a foot
    "a.sc.tweens.add({ targets: f.root, y: 10, scaleX: 1.1, duration: 120, yoyo: true });",
    "this.tweens.add({ targets: this, x: 10, duration: 100 });",
    // a foot moved on the game clock
    "clockOf(a.sc).tween({ targets: f, y: p.surfaceY, duration: 200, ease: 'Quad.In' });",
    // an image's x is the image's
    'a.sc.tweens.add({ targets: st, t: 1, duration: 200, onUpdate: () => { img.x = st.t; img.y = 2; } });',
  ],
  invalid: [
    "a.sc.tweens.add({ targets: m, x: 1, duration: 480, onComplete: () => { m.destroy(); this.h.dealDamage(f, dmg, 'explode', 500); } });",
    "a.sc.tweens.add({ targets: img, y: 1, duration: 300, onComplete: () => a.hitPizza(p, 1, 'BOMBED!') });",
    { code: "k.sc.tweens.add({ targets: f, y: 1, duration: 300, onComplete: () => { f.puppet = false; f.setState('hover'); k.stun(f, 2); } });", errors: [{ messageId: 'target' }, { messageId: 'write' }, { messageId: 'call' }, { messageId: 'call' }] },
    // a sweep that hurts what it passes
    'k.sc.tweens.add({ targets: o, u: 1, duration: 900, onUpdate: () => { for (const f of k.host.live()) k.host.hurt(f, 15); } });',
    // a continuation a fight passed down (a method callback too)
    'a.sc.tweens.add({ targets: st, t: 1, duration: 500, onComplete() { if (a.inWave()) onLand(); } });',
    // a gameplay roll
    { code: 'a.sc.tweens.add({ targets: img, y: 1, duration: 300, onComplete: () => a.quip(x, y, rnd(GROANS)) });', errors: [{ messageId: 'random' }] },
    { code: 'this.tweens.add({ targets: img, y: 1, duration: 300, onComplete: () => { img.y = Math.random() * 10; } });', errors: [{ messageId: 'random' }] },
    { code: 'a.sc.tweens.add({ targets: img, y: 1, duration: 300, onComplete: () => Phaser.Utils.Array.Shuffle(team) });', errors: [{ messageId: 'random' }] },
    // state: a foot's place, its brain, the run
    { code: 'a.sc.tweens.add({ targets: f, x: 9, duration: 300, onComplete: () => (f.x = SEAT[0]) });', errors: [{ messageId: 'target' }, { messageId: 'write' }] },
    { code: 'k.sc.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => { f.brain.webbed = 1; } });', errors: [{ messageId: 'write' }] },
    { code: 'this.sc.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => { this.run.coins += 5; } });', errors: [{ messageId: 'write' }] },
    // gameplay scheduled from a tween's end still starts on the tween's time
    "a.sc.tweens.add({ targets: img, y: 1, duration: 200, onComplete: () => a.sc.time.delayedCall(160, () => a.hitPizza(p, 1, 'X')) });",
    // a tween's and a sprite's own events
    "tw.on('complete', () => a.damageFoot(f, 10));",
    { code: 'sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => { f.hp -= 1; });', errors: [{ messageId: 'write' }] },
    // a Phaser tween of a foot's place
    { code: "a.sc.tweens.add({ targets: f, y: p.surfaceY, duration: 200, ease: 'Quad.In' });", errors: [{ messageId: 'target' }] },
    // inside Foot.ts, `this` is the foot: its tween and a write to its x
    { code: "this.scene.tweens.add({ targets: this, x: this.x + dx, duration: 180 });", filename: 'src/game/Foot.ts', errors: [{ messageId: 'target' }] },
    { code: 'this.scene.tweens.add({ targets: this.root, alpha: 0, duration: 120, yoyo: true, onYoyo: () => { this.x = this.laneX; } });', filename: 'src/game/Foot.ts', errors: [{ messageId: 'write' }] },
    // a listing needs its reason
    { code: 'sc.tweens.add({ targets: t2, y: 1, duration: 230,\n  // visual-only\n  onComplete: () => dust.spawn({ x: 1 }) });', errors: [{ messageId: 'reason' }] },
  ].map((c) => (typeof c === 'string' ? { code: c, errors: [{ messageId: 'call' }] } : c)),
});

// ——— all the rules together, over several fix passes (a list's fix first, then its calls') ———
{
  const linter = new Linter({ configType: 'flat' });
  const config = [
    {
      files: ['**/*.ts'],
      languageOptions: { parser: tseslint.parser },
      plugins: { effects: plugin },
      rules: Object.fromEntries(Object.keys(plugin.rules).map((r) => [`effects/${r}`, 'error'])),
    },
  ];
  const before = code("  stat('x', [Effect.Stat('damage', Op.Add(Unit.Amount(1))), Effect.OnKill(Action.Custom(Custom.Meteor), { chance: Unit.Chance(5) })]);");
  const after = code(
    "  stat('x', [\n    Effect.Stat(\n      Stat.Damage,\n      Op.Add(Unit.Amount(1)),\n    ),\n    Effect.OnKill(\n      Action.Custom(Custom.Meteor),\n      { chance: Unit.Chance(5) },\n    ),\n  ]);",
  );
  const r = linter.verifyAndFix(before, config, { filename: 'x.ts' });
  assert.deepEqual(r.messages, []);
  assert.equal(r.output, after);
  ran++;
}

console.log(`effects lint rules: ${ran} cases passed`);
