// The golden check's builds (dev only; scripts/golden/run.mjs drives it, docs/effects-plan.md): the run's Stats for a
// large fixed set of builds, worked out by the game's own computeStats() on a live Game scene. Every topping alone at
// level 1 and at its max, every pizza perk alone plain and enhanced, 200 seeded mixed builds (pizzas, toppings, the
// Pizzeria's upgrades, peels, the growing values' counts), Napoletana, the Ghost's possession and Echo Slice. The
// numbers are kept as their change from the base stats, so the snapshot stays small.
//
// A refactor that keeps every number gives the same snapshot to 1e-9.

import type Phaser from 'phaser';
import { ABILITIES } from './game/abilities';
import { setRunHeat } from './game/heatRules';
import { META } from './data/meta';
import { PIZZAS } from './data/pizzas';
import { baseStats, UPGRADES, type Stats } from './data/upgrades';
import { save } from './systems/save';
import { Rarity } from './data/rarity';

type AnyScene = Phaser.Scene & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Build {
  name: string;
  heat?: 'mild' | 'regular';
  wave?: number;
  owned?: Record<string, number>;
  meta?: Record<string, number>;
  /** Pizza ids on the table; '*' after one enhances it. */
  table?: string[];
  peel?: string | null;
  /** Index of the pizza the Ghost possesses. */
  possess?: number;
  forgeWaves?: number;
  bosses?: string[];
  peels?: number;
}

/** A small seeded generator (mulberry32), its own: the builds never touch Math.random's sequence. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every build, in a fixed order (its name is its key in the snapshot). */
export function goldenBuilds(): Build[] {
  const out: Build[] = [{ name: 'base' }];
  const plain = ['margherita', 'pepperoni', 'funghi'];
  for (const u of UPGRADES) {
    out.push({ name: `top:${u.id}@1`, owned: { [u.id]: 1 } });
    if (u.maxLevel > 1) out.push({ name: `top:${u.id}@${u.maxLevel}`, owned: { [u.id]: u.maxLevel } });
  }
  // every pizza alone with two plain ones, plain and enhanced (its perk's own number), and on Mild
  for (const p of PIZZAS) {
    out.push({ name: `pizza:${p.id}`, table: [p.id, ...plain.slice(0, 2)] });
    out.push({ name: `pizza:${p.id}*`, table: [`${p.id}*`, ...plain.slice(0, 2)] });
  }
  for (const p of PIZZAS.filter((q) => Rarity.atLeast(q.rarity, Rarity.Epic))) out.push({ name: `pizza:${p.id}@mild`, heat: 'mild', table: [p.id, ...plain.slice(0, 2)] });
  // Napoletana's boost, Echo Slice's copies, the Ghost's possession of each kind of perk
  const some = ['pepperoni', 'margherita', 'funghi', 'maccheese', 'colossusforge', 'kitchensink'].filter((id) => PIZZAS.some((p) => p.id === id));
  for (const id of some) {
    out.push({ name: `napoli+${id}`, table: ['napoletana', id, 'margherita'] });
    out.push({ name: `napoli*+${id}*`, table: ['napoletana*', `${id}*`, 'napoletana'] });
    out.push({ name: `echo<${id}`, table: [id, 'echoslice', 'margherita'] });
    out.push({ name: `echo*<${id}*`, table: [`${id}*`, 'echoslice*', 'napoletana'] });
  }
  for (const p of PIZZAS) out.push({ name: `possess:${p.id}`, table: [p.id, 'pepperoni', 'margherita'], possess: 0 });
  // 200 mixed builds
  const R = rng(20261128);
  const pick = <T>(a: readonly T[]) => a[Math.floor(R() * a.length)];
  const peelIds = Object.keys(ABILITIES);
  for (let i = 0; i < 200; i++) {
    const owned: Record<string, number> = {};
    for (let n = Math.floor(R() * 14); n > 0; n--) {
      const u = pick(UPGRADES);
      owned[u.id] = 1 + Math.floor(R() * u.maxLevel);
    }
    const meta: Record<string, number> = {};
    for (const m of META) if (R() < 0.5) meta[m.id] = 1 + Math.floor(R() * m.costs.length);
    const table = Array.from({ length: 3 + Math.floor(R() * 3) }, () => `${pick(PIZZAS).id}${R() < 0.3 ? '*' : ''}`);
    out.push({
      name: `mix:${i}`,
      heat: R() < 0.3 ? 'mild' : 'regular',
      wave: 1 + Math.floor(R() * 60),
      owned,
      meta,
      table,
      peel: R() < 0.6 ? pick(peelIds) : null,
      possess: R() < 0.15 ? Math.floor(R() * table.length) : undefined,
      forgeWaves: Math.floor(R() * 50),
      bosses: R() < 0.5 ? ['headwaiter', 'chefboss', 'gargoyle'].slice(0, 1 + Math.floor(R() * 3)) : [],
      peels: Math.floor(R() * 90),
    });
  }
  return out;
}

const round = (n: number) => Math.round(n * 1e12) / 1e12;

/** One build's stats, as their change from the base (numbers rounded to 1e-12; flags as 0/1). */
function diff(st: Stats, base: Stats): Record<string, number> {
  const o: Record<string, number> = {};
  for (const k of Object.keys(base) as (keyof Stats)[]) {
    const v = st[k] as unknown;
    const b = base[k] as unknown;
    if (typeof v === 'number' && typeof b === 'number') {
      if (Math.abs(v - b) > 1e-12) o[k] = round(v - b);
    } else if (v !== b) o[k] = v ? 1 : 0;
  }
  return o;
}

/** Work out every build's stats on the live Game scene (a run must be up: F.startGame first). Each build gets
 *  Math.random seeded by its index (Arcobaleno's and Mystery Meat's picks), put back afterwards. */
export function goldenRun(g: AnyScene): Record<string, Record<string, number> & { cards?: number }> {
  const realRandom = Math.random;
  const metaBefore = { ...save.meta };
  const peelsBefore = [...save.peels];
  const base = baseStats();
  const out: Record<string, Record<string, number>> = {};
  const builds = goldenBuilds();
  try {
    builds.forEach((b, i) => {
      Math.random = rng(1000 + i);
      const r = g.run;
      r.heat = b.heat ?? 'regular';
      setRunHeat(r.heat);
      r.wave = b.wave ?? 10;
      r.owned = { ...(b.owned ?? {}) };
      r.bossesBeaten = [...(b.bosses ?? [])];
      save.meta = { ...(b.meta ?? {}) };
      save.peels = Array.from({ length: b.peels ?? 0 }, (_, n) => `golden:${n}`);
      g.perkKit.forgeWaves = b.forgeWaves ?? 0;
      g.ability = b.peel ? ABILITIES[b.peel] : null;
      // the table: the old pizzas go, the build's come (enhanced where marked)
      g.possessedPizza = null;
      for (const p of g.pizzas) p.destroy();
      g.pizzas = [];
      for (const id of b.table ?? ['margherita', 'pepperoni', 'funghi']) {
        const p = g.addPizza(id.replace('*', ''), 8, false, undefined, true);
        if (id.endsWith('*')) p.flags.enhanced = true;
      }
      g.layoutPizzas(false);
      if (b.possess !== undefined) g.possessedPizza = g.pizzas[b.possess] ?? null;
      const st: Stats = g.computeStats();
      out[b.name] = diff(st, base);
    });
  } finally {
    Math.random = realRandom;
    g.possessedPizza = null;
    save.meta = metaBefore;
    save.peels = peelsBefore;
  }
  return out;
}
