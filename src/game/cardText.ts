// A topping's card text, generated from what it declares (docs/effects-plan.md, "Card text"). Every place topping
// text shows reads this one function: the shop's cards, the pick and slots windows, the level-up toasts, Your Toppings,
// the STATS tab's chips and tips, and the Pizzeria's Toppings tab.
//
// - Stat effects read through their stat's words (src/effects/stats.ts, src/effects/words.ts) and sort themselves: a
//   change that moves a stat the way its `Better` says is worse is a downside, the red line.
// - A level's text is what taking that level does: an EachLevelUp chain's first op at level 1, its level-up op after.
// - Effects that wait on a run-wide condition (When.Freshness) show only while it holds: the freshness trade-offs read
//   their Mild catch on Mild.
// - Proc toppings read their proc (describeProc); Picks their rarity; one-time costs (freshNow, slicesNow) are lines
//   of the downside.
// - `text` (Upgrade.text) overrides a side by hand; cardTextAudit() checks its numbers against the effects.

import { Stat, effects } from '../effects';
import type { StatData } from '../effects/stat';
import type { WordsCtx } from '../effects/stats';
import { holds } from '../effects/when';
import { joinPhrases, statPhrase, type Phrase } from '../effects/words';
import { RARITY_DEFS } from '../data/rarity';
import { UPGRADE_KIND_DEFS, UpgradeKind, kindOf, type CardText, type TextLine, type Upgrade } from '../data/upgrades';
import { describeProc, scaleProc } from './abilities';
import { freezeText, meterBoostText, slamStunText, superStartText } from './slamMode';

export type { CardText } from '../data/upgrades';

/** The run's words: what the peel's meter and slam are called this run (src/game/slamMode.ts). */
/** (slamMode's lines start with a capital for a line of their own: "No effect with X" goes mid-line in lower case; an
 *  ability's name stays as it is) */
const midLine = (s: string) => s.replace(/^No /, 'no ');
const RUN_WORDS: WordsCtx = {
  meterBoost: (p) => midLine(meterBoostText(p)),
  // (a cut reads "meter" whatever the peel, as it always has: a long ability name ran past the card, and a passive
  // ability ignores cuts)
  meterCut: (p) => `−${p}% meter charge`,
  superStart: (p) => midLine(superStartText(p)),
  freeze: () => freezeText(),
  slamStun: () => slamStunText(),
};

/** Later levels of a proc topping whose first level is written by hand: what grows (scaleProc: +50% a level). */
export function procGrowth(lvl: number): string {
  return `Hits ${Math.round(50 * (lvl - 1))}% harder, more often`;
}

const plural = (n: number) => (n === 1 ? '' : 's');

/** What the declarations say at a level, before any hand-written override. */
export function autoCardText(u: Upgrade, lvl: number): CardText {
  const ups: Phrase[] = [];
  const downs: Phrase[] = [];
  const other: string[] = [];
  for (const e of u.effects ?? []) {
    if (e.kind !== 'stat') {
      other.push(effects.describe(e));
      continue;
    }
    const s = e as StatData;
    if (!holds(s.when)) continue;
    const p = statPhrase(s, lvl, RUN_WORDS);
    if (p) (p.good ? ups : downs).push(p);
  }
  // one-time costs when it's bought
  if (u.freshNow) downs.push({ text: `pizzas lose ${u.freshNow} freshness now`, good: false });
  if (u.slicesNow) downs.push({ text: `pizzas lose ${u.slicesNow} slice${plural(u.slicesNow)} now`, good: false });
  const lines = [u.proc ? describeProc(scaleProc(u.proc, lvl)) : '', u.pick ? `Choose 1 of 3 random ${RARITY_DEFS[u.pick].label.toLowerCase()} toppings, free` : '', joinPhrases(ups), ...other].filter(Boolean);
  // (a level past the ones it declares, from Infinite Oven's extra levels: Exclusive Menu's LV5)
  const up = lines.join(' ') || (u.effects?.length ? 'Nothing more at this level' : '');
  return { up, down: joinPhrases(downs) || null };
}

function side<A>(line: TextLine<A> | undefined, lvl: number, auto: A, at: (l: number) => CardText): A {
  if (line === undefined) return auto;
  return typeof line === 'function' ? line(lvl, auto, at) : (line as A);
}

/** A topping's card text for taking level `lvl` (1 for a new one): its upside, and its downside or null. */
export function cardText(u: Upgrade, lvl: number): CardText {
  const at = (l: number) => autoCardText(u, l);
  const auto = at(lvl);
  const t = u.text;
  return { up: side(t?.up, lvl, auto.up, at), down: side(t?.down, lvl, auto.down, at) || null };
}

/** One line for a tooltip: "upside · ▼ downside". */
export function cardLine(u: Upgrade, lvl: number): string {
  const t = cardText(u, lvl);
  return t.down ? `${t.up} · ▼ ${t.down}` : t.up;
}

/** A trade-off: its card has a downside (it's priced lower: upgradePrice). */
export function isTradeoff(u: Upgrade): boolean {
  return cardText(u, 1).down !== null;
}

/** A card's level line: what buying it does to its level ("LV 2 → 3", "NEW"), or how a one-use or once-a-run topping
 *  is held. `lvl`: the level owned now. */
export function levelLine(u: Upgrade, lvl: number): string {
  return UPGRADE_KIND_DEFS[kindOf(u)].line ?? (lvl ? `LV ${lvl} → ${lvl + 1}` : 'NEW');
}

/** It arcs chain lightning (a chain chance, or a proc that chains): what Hero Goals count, from what it declares. */
export function hasChainLightning(u: Upgrade): boolean {
  return (u.effects ?? []).some((e) => e.kind === 'stat' && e.stat === Stat.ChainChance) || !!u.proc?.fx.some((e) => e.e === 'chain');
}

// ——— dev checks ———

/** The levels a topping can reach: its own, and for one that levels up, as many more as every Stat.CapBonus in `list`
 *  adds (Infinite Oven's +2). */
export function topLevel(u: Upgrade, list: readonly Upgrade[]): number {
  if (u.maxLevel <= 1 || kindOf(u) !== UpgradeKind.Permanent) return u.maxLevel;
  let bonus = 0;
  for (const x of list) for (const e of x.effects ?? []) if (e.kind === 'stat' && e.stat === Stat.CapBonus && e.op.op === 'add' && typeof e.op.value === 'number') bonus += e.op.value;
  return u.maxLevel + bonus;
}

/** The numbers in a text, each with the sign it's written with ('' for none): "+20%" is { n: 20, sign: '+' }. */
const NUM = /([+−-]?)(\d+(?:\.\d+)?)/g;
const numbers = (s: string | null) => [...(s ?? '').matchAll(NUM)].map((m) => ({ n: Number(m[2]), sign: m[1] === '+' ? '+' : m[1] ? '−' : '' }));

/** Every hand-written override, checked against what the topping declares:
 *  - each number in its own words (what it adds to the generated text) must be one the declarations give at some
 *    level, with the same sign when it's written with one ("+20%" where the effects give "−20%" is caught), or one it
 *    lists as the scene's (`text.scene`);
 *  - for an effect topping, every number the effects give at a level must still show on that level's card.
 *  A proc topping's hand-written first level is checked against its proc's own text (its later levels are generated:
 *  procGrowth). Every level a topping can reach is checked, Infinite Oven's too. Toppings with no effects and no proc
 *  (the scene's own) have nothing to check against. Returns the problems (empty: all good). */
export function cardTextAudit(list: readonly Upgrade[]): string[] {
  const out: string[] = [];
  for (const u of list) {
    const t = u.text;
    if (!t || (!u.effects?.length && !u.proc)) continue;
    const at = (l: number) => autoCardText(u, l);
    const top = topLevel(u, list);
    const known = new Set<string>((t.scene ?? []).map(String));
    for (let l = 1; l <= top; l++) {
      for (const x of [...numbers(at(l).up), ...numbers(at(l).down)]) {
        known.add(String(x.n));
        if (x.sign) known.add(`${x.sign}${x.n}`);
      }
    }
    for (let l = 1; l <= (u.proc ? 1 : top); l++) {
      // the override's own words: with what the declarations say left blank
      const own = [side(t.up, l, '', at), side(t.down, l, '', at)].join(' ');
      for (const x of numbers(own)) {
        if (!known.has(x.sign ? `${x.sign}${x.n}` : String(x.n))) out.push(`${u.id} LV${l}: ${x.sign}${x.n} in its card text is no number it declares (add it to text.scene if the scene owns it)`);
      }
      if (u.proc) continue;
      const full = cardText(u, l);
      const shown = new Set([...numbers(full.up), ...numbers(full.down)].map((x) => x.n));
      const auto = at(l);
      for (const x of [...numbers(auto.up), ...numbers(auto.down)]) if (!shown.has(x.n)) out.push(`${u.id} LV${l}: its effects give ${x.n}, which its card text doesn't show`);
    }
  }
  return out;
}

/** Toppings by where their text comes from: generated, generated with a hand-written side (checked by the audit), or
 *  the scene's own (no effects or proc to check it against). */
export function cardTextSources(list: readonly Upgrade[]): { generated: string[]; overridden: string[]; scene: string[] } {
  const r = { generated: [] as string[], overridden: [] as string[], scene: [] as string[] };
  for (const u of list) (!u.text ? r.generated : u.effects?.length || u.proc ? r.overridden : r.scene).push(u.id);
  return r;
}
