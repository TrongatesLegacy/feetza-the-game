// Stat definitions: one entry for every key of Stats (src/data/upgrades.ts), so a stat without one doesn't compile.
// Each says its unit, how it stacks, its base and caps, and how the STATS tab shows it (label, icon, section, number,
// whether more is better). The modifier ledger (src/effects/ledger.ts) reads the stacking and caps; the STATS tab
// (src/game/buildStats.ts) draws a tile for every stat something changes from here.

import type { Stats } from '../data/upgrades';
import { UnitKind, type NumUnit, type UnitName } from './units';
import { COMBO_BASE_WINDOW } from '../config';

/** A smack's follow-up chance never reaches certainty (the same ceiling as crits). */
export const DOUBLE_CAP = 0.85;
/** The most tip boosts can add up to: full value up to ×2, half beyond, never above ×2.5. */
export const TIP_MULT_CAP = 2.5;

/** The STATS tab's sections. */
export const Section = { Damage: 'damage', Auto: 'auto', Control: 'cc', Economy: 'eco', Sustain: 'sustain', Peel: 'peel' } as const;
export type SectionId = (typeof Section)[keyof typeof Section];

/** How a stat's sources combine.
 *  Add: they add up (a source may multiply on top: Heavy Hand's ×1.25, a perk's +10%).
 *  Mul: they multiply (feet speed, prices).
 *  Flag: any source turns it on.
 *  Max: the highest source that sets it wins (Grand Parade's 2 events a wave), adds on top.
 *  Min: the lowest set wins (a hero sighting every 10 waves beats every 20; 0 is off, before any set). */
export const Stack = { Add: 'add', Mul: 'mul', Flag: 'flag', Max: 'max', Min: 'min' } as const;
export type StackId = (typeof Stack)[keyof typeof Stack];

/** How a stat's multipliers fold (src/effects/ledger.ts).
 *  Standard: every multiplier scales the whole total (the base, its Set and its adds).
 *  CutsOnBase: a cut (a multiplier below 1) scales only the base (or the Set that replaced it), before the adds, so it
 *  never shrinks a flat boost: Long Handle +6 with Glass Peel ×0.85 is 26 × 0.85 + 6. A boost (above 1) still scales
 *  the whole total, as Standard. */
export const Fold = { Standard: 'standard', CutsOnBase: 'cutsOnBase' } as const;
export type FoldId = (typeof Fold)[keyof typeof Fold];

/** Whether more of a stat is good for the player. */
export const Better = { Up: 'up', Down: 'down' } as const;
export type BetterId = (typeof Better)[keyof typeof Better];

export type Fmt = 'int' | 'dec' | 'pct' | 'x' | 'sec' | 'text';
/** A stat's number as a tile shows it. */
export interface Shown {
  num: number;
  fmt: Fmt;
  pre?: string;
  post?: string;
  text?: string;
}

/** Caps, applied once the build's and the peel's changes are in: the floor and the soft ceiling there, the hard
 *  ceiling again after every later phase (src/effects/ledger.ts). */
export interface Caps {
  min?: number;
  /** Above `from`, each further point counts `rate` (tips: half beyond ×2). */
  soft?: { from: number; rate: number };
  max?: number;
}

export interface StatDef<U extends UnitName = UnitName> {
  unit: U;
  stack: StackId;
  base: U extends 'flag' ? boolean : number;
  caps?: Caps;
  /** Multipliers scale this stat plus `around` (the combo window: its base length plus the bonus). */
  around?: number;
  /** How its multipliers fold (Fold.Standard when left out). */
  fold?: FoldId;
  label: string;
  /** The word for it in a short line (a NOW tag's "+3% damage"). */
  short?: string;
  icon: string;
  section: SectionId;
  better: BetterId;
  show: (v: number) => Shown;
  /** A line under the tile. */
  note?: string;
  /** How a change to it reads on a card (src/effects/words.ts): "+25% smack damage", "Feet move 6% faster". */
  words: Words;
}

// ——— how a change reads on a card (the card text is generated from the effects: src/effects/words.ts) ———

/** One change to a stat, ready to put into words. */
export interface Change {
  /** With its sign: "+25%", "−10%", "+6", "+0.4s"; a whole multiplier of 2 or more: "×2". */
  signed: string;
  /** Without its sign: "25%", "6", "1.5s". */
  size: string;
  /** The number shown, without its unit: 25 for "+25%". */
  n: number;
  /** As times: "3×" (a multiplier or a set multiplier). */
  times: string;
  /** Which way the stat moves: 1 up, −1 down. */
  dir: 1 | -1;
  /** The op's own value (a multiplier's 1.25, a chance's 0.15, a count's 2). */
  value: number;
  /** The stat is set outright (Op.Set), not added to or multiplied. */
  set: boolean;
}

/** Words that depend on the run (the peel's meter, the Peel Slam's name): the card text passes them in
 *  (src/game/cardText.ts reads src/game/slamMode.ts); describe() outside a run uses plain ones. */
export interface WordsCtx {
  meterBoost(pct: number): string;
  meterCut(pct: number): string;
  superStart(pct: number): string;
  freeze(): string;
  slamStun(): string;
}

/** How a stat's change reads. With only `noun`, a change reads "+25% smack damage" (a cut on a Fold.CutsOnBase stat
 *  reads "−15% base smack reach"). `say` writes the whole phrase instead; `alone` is a fuller line for when it's the
 *  only change on its side of the card ("+5% chance smacks stun feet" rather than "+5% stun chance"). Phrases with the
 *  same `subject` next to each other join: "Feet have 20% more health and move 10% faster". Phrases are written in
 *  lower case: the card capitalises the line's first letter. */
export interface Words {
  noun?: string;
  say?: (c: Change, w: WordsCtx) => string;
  alone?: (c: Change, w: WordsCtx) => string;
  subject?: string;
}

const plural = (c: Change) => (c.n === 1 ? '' : 's');
const inWords = (c: Change) => ['no', 'one', 'two', 'three'][c.n] ?? String(c.n);

// ——— how numbers read ———
const pc = (v: number) => Math.round(v * 100);
export const Show = {
  int: (pre?: string, post?: string) => (v: number): Shown => ({ num: v, fmt: 'int', pre, post }),
  /** a whole number with its sign: +2, −1 */
  signed: (post?: string) => (v: number): Shown => ({ num: Math.abs(v), fmt: 'int', pre: v > 0 ? '+' : v < 0 ? '−' : '', post }),
  dec: (post?: string) => (v: number): Shown => ({ num: v, fmt: 'dec', post }),
  pct: (pre?: string) => (v: number): Shown => ({ num: pc(v), fmt: 'pct', pre }),
  /** a percentage with its sign: +15%, −20% */
  signedPct: () => (v: number): Shown => ({ num: Math.abs(pc(v)), fmt: 'pct', pre: v > 0 ? '+' : v < 0 ? '−' : '' }),
  x: () => (v: number): Shown => ({ num: v, fmt: 'x' }),
  /** a percentage bonus read as a multiplier: 0.25 → ×1.25 */
  xFrom: () => (v: number): Shown => ({ num: 1 + v, fmt: 'x' }),
  sec: (pre?: string) => (v: number): Shown => ({ num: v, fmt: 'sec', pre }),
  on: (text = 'ON') => (v: number): Shown => ({ num: v, fmt: 'text', text: v ? text : 'OFF' }),
} as const;

function def<U extends UnitName>(d: StatDef<U>): StatDef<U> {
  return d;
}
const { Add, Mul, Flag, Max, Min } = Stack;
const { Up, Down } = Better;
const { Damage, Auto, Control, Economy, Sustain, Peel } = Section;
const flag = (words: Words, label: string, icon: string, section: SectionId, better: BetterId = Up, text = 'ON') =>
  def({ unit: UnitKind.Flag, stack: Flag, base: false, label, icon, section, better, show: Show.on(text), words });

/** Every stat's definition. */
export const STAT_DEFS = {
  // ——— damage ———
  damage: def({ unit: UnitKind.Amount, stack: Add, base: 10, label: 'Smack damage', short: 'damage', icon: '👋', section: Damage, better: Up, show: Show.int() , words: { noun: 'smack damage' } }),
  critChance: def({ unit: UnitKind.Chance, stack: Add, base: 0.05, caps: { min: 0, max: 0.85 }, label: 'Crit chance', icon: '💥', section: Damage, better: Up, show: Show.pct() , words: { noun: 'crit chance' } }),
  critMult: def({ unit: UnitKind.Mult, stack: Add, base: 2.5, label: 'Crit damage', icon: '💢', section: Damage, better: Up, show: Show.x() , words: { noun: 'crit damage' } }),
  radius: def({ unit: UnitKind.Px, stack: Add, base: 26, caps: { min: 14 }, fold: Fold.CutsOnBase, label: 'Smack reach', icon: '🏓', section: Damage, better: Up, show: Show.int() , words: { noun: 'smack reach' } }),
  doubleChance: def({ unit: UnitKind.Chance, stack: Add, base: 0, caps: { max: DOUBLE_CAP }, label: 'Double smack', icon: '👏', section: Damage, better: Up, show: Show.pct(), note: 'chance to smack again' , words: { noun: 'double smacks', alone: (c) => `${c.signed} chance to smack twice` } }),
  execute: def({ unit: UnitKind.Percent, stack: Add, base: 0, caps: { max: 0.4 }, label: 'Finishes feet under', icon: '🔪', section: Damage, better: Up, show: Show.pct(), note: 'health, not bosses' , words: { say: (c) => `finish feet under ${c.signed} health`, alone: (c) => `smacks finish feet under ${c.signed} health` } }),
  chainChance: def({ unit: UnitKind.Chance, stack: Add, base: 0, label: 'Chain lightning', icon: '⚡', section: Damage, better: Up, show: Show.pct() , words: { noun: 'chain lightning chance' } }),
  chainCount: def({ unit: UnitKind.Count, stack: Add, base: 2, label: 'Chain targets', icon: '⚡', section: Damage, better: Up, show: Show.int('to ', ' feet') , words: { say: (c) => `${c.signed} chain target${plural(c)}` } }),
  chainDmg: def({ unit: UnitKind.Mult, stack: Add, base: 0.6, label: 'Chain damage', icon: '⚡', section: Damage, better: Up, show: Show.x(), note: 'of a smack, on each foot it jumps to' , words: { noun: 'chain damage' } }),
  splashDmg: def({ unit: UnitKind.Amount, stack: Add, base: 0, label: 'Splash', icon: '💦', section: Damage, better: Up, show: Show.int(), note: 'on each foot nearby' , words: { noun: 'splash damage' } }),
  explodeDmg: def({ unit: UnitKind.Amount, stack: Add, base: 0, label: 'Kills explode', icon: '🍍', section: Damage, better: Up, show: Show.int(), note: 'to every foot nearby' , words: { say: (c) => `smacked-down feet explode for ${c.signed} area damage` } }),
  bigHurt: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'vs healthy feet', icon: '💪', section: Damage, better: Up, show: Show.xFrom(), note: 'above half health' , words: { noun: 'damage to healthy feet' } }),
  bossDmg: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'Boss damage', icon: '👹', section: Damage, better: Up, show: Show.pct('+'), note: 'bosses and mini-bosses' , words: { noun: 'boss damage' } }),
  miniWeak: def({ unit: UnitKind.Percent, stack: Add, base: 0, caps: { max: 0.5 }, label: 'Weaker mini-bosses', icon: '👺', section: Damage, better: Up, show: Show.pct(), note: 'less health when they spawn' , words: { say: (c) => `mini-bosses spawn with ${c.size} less health` } }),
  stunVuln: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'vs stunned feet', icon: '😵', section: Damage, better: Up, show: Show.pct('+') , words: { noun: 'damage to stunned feet' } }),
  tenthCrit: flag({ say: () => 'every 10th smack crits' }, 'Every 10th smack crits', '💥', Damage),
  // ——— automatic attacks ———
  burnDps: def({ unit: UnitKind.Amount, stack: Add, base: 0, label: 'Burning smacks', icon: '🔥', section: Auto, better: Up, show: Show.int(undefined, '/s'), note: 'each smacked foot burns for 3s' , words: { say: (c) => `smacks burn ${c.signed} dmg/s`, alone: (c) => `smacks burn feet: ${c.signed} dmg/s` } }),
  cutters: def({ unit: UnitKind.Count, stack: Add, base: 0, label: 'Orbiting cutters', icon: '⚙️', section: Auto, better: Up, show: Show.int() , words: { say: (c) => `${c.signed} orbiting cutter${plural(c)}` } }),
  cutterDmg: def({ unit: UnitKind.Amount, stack: Add, base: 12, label: 'Cutter damage', icon: '⚙️', section: Auto, better: Up, show: Show.int() , words: { say: (c) => `cutters deal ${c.signed}` } }),
  garlicDps: def({ unit: UnitKind.Amount, stack: Add, base: 0, label: 'Garlic aura', icon: '🧄', section: Auto, better: Up, show: Show.int(undefined, '/s'), note: 'on every foot near a pizza' , words: { subject: 'feet near pizzas', say: (c) => `take ${c.signed} dmg/s` } }),
  oliveRate: def({ unit: UnitKind.Rate, stack: Add, base: 0, label: 'Olives', icon: '🫒', section: Auto, better: Up, show: Show.dec('/s') , words: { say: (c) => (c.set ? `auto-fires an olive at a foot every ${c.size}` : `fires olives ${c.size} ${c.dir > 0 ? 'faster' : 'slower'}`) } }),
  oliveDmg: def({ unit: UnitKind.Amount, stack: Add, base: 15, label: 'Olive damage', icon: '🫒', section: Auto, better: Up, show: Show.int() , words: { noun: 'olive damage' } }),
  // ——— crowd control ———
  stunChance: def({ unit: UnitKind.Chance, stack: Add, base: 0, label: 'Stun chance', icon: '😵', section: Control, better: Up, show: Show.pct(), note: 'smacks stun feet 1.2s' , words: { noun: 'stun chance', alone: (c) => `${c.signed} chance smacks stun feet for 1.2s` } }),
  slowPct: def({ unit: UnitKind.Percent, stack: Add, base: 0, caps: { max: 0.7 }, label: 'Chill', icon: '❄️', section: Control, better: Up, show: Show.pct(), note: 'slower for 2s after a smack' , words: { noun: 'chill', alone: (c) => `smacks chill feet: ${c.signed} slow` } }),
  knockback: def({ unit: UnitKind.Px, stack: Add, base: 260, fold: Fold.CutsOnBase, label: 'Knockback', icon: '🌀', section: Control, better: Up, show: Show.int() , words: { noun: 'knockback' } }),
  speedMult: def({ unit: UnitKind.Mult, stack: Mul, base: 1, caps: { max: 1.6 }, label: 'Feet speed', icon: '🏃', section: Control, better: Down, show: Show.x() , words: { subject: 'feet', say: (c) => `move ${c.size} ${c.dir > 0 ? 'faster' : 'slower'}` } }),
  footHp: def({ unit: UnitKind.Mult, stack: Mul, base: 1, label: 'Feet health', icon: '🦶', section: Control, better: Down, show: Show.x() , words: { subject: 'feet', say: (c) => (c.value === 2 ? 'have double health' : `have ${c.size} ${c.dir > 0 ? 'more' : 'less'} health`) } }),
  slowAbove: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'Slow above', icon: '🌿', section: Control, better: Up, show: Show.pct() , words: { noun: 'slow on feet above it' } }),
  freezeSlam: flag({ say: (_c, w) => w.freeze() }, 'Slam freezes', '⏳', Control),
  slamStun: flag({ say: (_c, w) => w.slamStun() }, 'Slam stuns', '🦐', Control),
  // ——— economy ———
  coinMult: def({ unit: UnitKind.Mult, stack: Add, base: 1, caps: { min: 0.3, soft: { from: 2, rate: 0.5 }, max: TIP_MULT_CAP }, label: 'Tips from feet', icon: '🪙', section: Economy, better: Up, show: Show.x() , words: { noun: 'tips' } }),
  coinsPerWave: def({ unit: UnitKind.PerWave, stack: Add, base: 0, label: 'Wave clear tips', icon: '🏁', section: Economy, better: Up, show: Show.int('+', ' tips') , words: { say: (c) => `${c.signed} tips after every wave` } }),
  quickTips: def({ unit: UnitKind.Amount, stack: Add, base: 0, label: 'Quick kills', icon: '⚡', section: Economy, better: Up, show: Show.int('+', ' tips'), note: 'within 1s of the last' , words: { say: (c) => `${c.signed} tip${plural(c)} for every quick kill` } }),
  goldenTouch: def({ unit: UnitKind.Chance, stack: Add, base: 0, caps: { max: 0.3 }, label: 'Golden feet', icon: '👑', section: Economy, better: Up, show: Show.pct(), note: 'of kills pay 5× tips' , words: { say: (c) => `${c.size} of feet turn to gold (5× tips)` } }),
  luck: def({ unit: UnitKind.Count, stack: Add, base: 0, label: 'Luck', icon: '🍀', section: Economy, better: Up, show: Show.int('+'), note: 'rarer cards, more golden feet' , words: { say: () => 'rarer cards and more golden feet' } }),
  freeRerolls: def({ unit: UnitKind.Count, stack: Add, base: 0, label: 'Free rerolls', icon: '🎲', section: Economy, better: Up, show: Show.int(), note: 'every shop' , words: { say: (c) => `${c.signed} free reroll${plural(c)} in every shop` } }),
  shopDiscount: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'Topping discount', icon: '🏷️', section: Economy, better: Up, show: Show.signedPct(), note: 'up to 60% off in the shop' , words: { say: (c) => (c.dir > 0 ? `all toppings ${c.size} cheaper` : `toppings cost ${c.size} more`) } }),
  consumableDiscount: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'One-use discount', icon: '🧇', section: Economy, better: Up, show: Show.pct() , words: { say: (c) => `one-use toppings cost ${c.size} less` } }),
  counterDiscount: def({ unit: UnitKind.Percent, stack: Add, base: 0, caps: { max: 0.5 }, label: 'Counter discount', icon: '🍕', section: Economy, better: Up, show: Show.pct(), note: 'off counter pizzas' , words: { say: (c) => `counter pizzas cost ${c.size} less` } }),
  counterMult: def({ unit: UnitKind.Mult, stack: Mul, base: 1, label: 'Counter prices', icon: '🍕', section: Economy, better: Down, show: Show.x() , words: { say: (c) => `counter pizzas cost ${c.size} ${c.dir > 0 ? 'more' : 'less'}` } }),
  rerollLess: def({ unit: UnitKind.Amount, stack: Add, base: 0, label: 'Cheaper rerolls', icon: '🔄', section: Economy, better: Up, show: Show.int(undefined, ' tips off') , words: { say: (c) => `rerolls cost ${c.size} tip${plural(c)} less (never below 1)` } }),
  rerollMult: def({ unit: UnitKind.Mult, stack: Mul, base: 1, label: 'Reroll price', icon: '🔄', section: Economy, better: Down, show: Show.x() , words: { say: (c) => (c.value === 2 ? 'rerolls cost double' : `rerolls cost ${c.size} ${c.dir > 0 ? 'more' : 'less'}`) } }),
  cardDelta: def({ unit: UnitKind.Count, stack: Add, base: 0, label: 'Cards per shop', icon: '🃏', section: Economy, better: Up, show: Show.signed() , words: { say: (c) => (c.dir > 0 ? `${c.signed} topping card${plural(c)} in every shop` : `${inWords(c)} fewer card${plural(c)} a shop`) } }),
  guaranteedEpic: def({ unit: UnitKind.Count, stack: Add, base: 0, label: 'Epic or better', icon: '🎩', section: Economy, better: Up, show: Show.int(undefined, ' a shop'), note: 'cards guaranteed in each new shop (not a reroll)' , words: { say: (c) => `${inWords(c)} card${plural(c)} each shop ${c.n === 1 ? 'is' : 'are'} always Epic or Legendary` } }),
  exclusiveDiscount: def({ unit: UnitKind.Percent, stack: Max, base: 0, label: 'Exclusive card off', icon: '🎩', section: Economy, better: Up, show: Show.pct(), note: 'with the other discounts, up to 60% off' , words: { say: (c) => `the Exclusive card (Epic or Legendary) is ${c.size} off` } }),
  extraConsumable: def({ unit: UnitKind.Count, stack: Add, base: 0, label: 'One-use cards', icon: '🃏', section: Economy, better: Up, show: Show.int('+'), note: 'an extra one-use card in every shop' , words: { say: (c) => `${c.signed} one-use card${plural(c)} in every shop` } }),
  goldenDiscount: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'Golden Menu off', icon: '🎫', section: Economy, better: Up, show: Show.pct() , words: { say: (c) => `Golden Menu items cost ${c.size} fewer Golden Crusts` } }),
  freeTopping: { ...flag({ say: () => 'one shop topping free every 5th wave' }, 'Free topping', '🎁', Economy), note: 'one shop topping free every 5th wave (every 3rd enhanced)' },
  capBonus: def({ unit: UnitKind.Count, stack: Add, base: 0, label: 'Topping levels', icon: '🌡️', section: Economy, better: Up, show: Show.int('+'), note: 'on every topping that levels up' , words: { say: (c) => `every topping that levels up can go ${c.size} level${plural(c)} higher` } }),
  crustBonus: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'End-of-run crusts', icon: '🥧', section: Economy, better: Up, show: Show.pct('+') , words: { noun: 'end-of-run crusts' } }),
  endCrustMult: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'End-of-run crusts', icon: '🥧', section: Economy, better: Up, show: Show.pct('+') , words: { noun: 'end-of-run crusts' } }),
  scoreMult: def({ unit: UnitKind.Mult, stack: Add, base: 1, label: 'Score', icon: '⭐', section: Economy, better: Up, show: Show.x() , words: { noun: 'score' } }),
  comboBonus: def({ unit: UnitKind.Seconds, stack: Add, base: 0, around: COMBO_BASE_WINDOW, label: 'Combo window', icon: '⏲️', section: Economy, better: Up, show: (v) => ({ num: COMBO_BASE_WINDOW + v, fmt: 'sec' }) , words: { say: (c) => `combos last ${c.signed}` } }),
  // wave events, drops, shinies and hero sightings
  eventMult: def({ unit: UnitKind.Mult, stack: Add, base: 1, label: 'Wave events', icon: '🎪', section: Economy, better: Up, show: Show.x() , words: { noun: 'chance of a wave event' } }),
  eventAlways: flag({ say: () => 'every normal wave has a wave event' }, 'Wave events', '🎪', Economy, Up, 'EVERY WAVE'),
  eventCount: def({ unit: UnitKind.Count, stack: Max, base: 1, label: 'Events a wave', icon: '🎺', section: Economy, better: Up, show: Show.int('up to ') , words: { say: (c) => `up to ${inWords(c)} events a wave` } }),
  noEvents: flag({ say: () => 'no wave events this run' }, 'Wave events', '🚫', Economy, Down, 'OFF'),
  noGolden: flag({ say: () => 'no golden feet' }, 'Golden feet', '🚫', Economy, Down, 'OFF'),
  eventTips: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'Event tips', icon: '💰', section: Economy, better: Up, show: Show.pct('+') , words: { say: (c) => `wave events pay ${c.signed} tips` } }),
  eventRetry: flag({ say: () => 'a missed wave event comes back once, the next wave' }, 'Missed events come back', '🔁', Economy),
  flyerSec: def({ unit: UnitKind.Seconds, stack: Add, base: 0, label: 'Flyers stay longer', icon: '🐌', section: Economy, better: Up, show: Show.sec('+') , words: { say: (c) => `flyers stay on screen ${c.size} longer` } }),
  flyerBias: flag({ say: () => 'events lean to flyers' }, 'Events lean to', '🪺', Economy, Up, 'FLYERS'),
  seagullCrust: def({ unit: UnitKind.Amount, stack: Add, base: 0, label: 'Golden seagulls', icon: '🪺', section: Economy, better: Up, show: Show.int('+', ' crust') , words: { say: (c) => `golden seagulls give ${c.signed} crust${plural(c)}` } }),
  chestLess: def({ unit: UnitKind.Count, stack: Add, base: 0, label: 'Smacks to open a chest', icon: '🗝️', section: Economy, better: Up, show: Show.int('−') , words: { say: (c) => `chests open with ${c.size} fewer smack${plural(c)}` } }),
  mimicMult: def({ unit: UnitKind.Mult, stack: Mul, base: 1, label: 'Mimics', icon: '🗝️', section: Economy, better: Down, show: Show.x() , words: { say: (c) => (c.value === 0.5 ? 'mimics half as likely' : `mimics ${c.size} ${c.dir > 0 ? 'more' : 'less'} likely`) } }),
  mimicDrop: def({ unit: UnitKind.Mult, stack: Max, base: 0, label: 'Beaten mimics drop', icon: '🤫', section: Economy, better: Up, show: Show.x() , words: { say: (c) => `beaten mimics always roll their drop, at ${c.times} the chance` } }),
  dropAdd: def({ unit: UnitKind.Percent, stack: Add, base: 0, label: 'Event drop chance', icon: '🥉', section: Economy, better: Up, show: Show.pct('+') , words: { say: (c) => `${c.signed} chance of a rare event drop` } }),
  dropMult: def({ unit: UnitKind.Mult, stack: Mul, base: 1, label: 'Event drops', icon: '🗺️', section: Economy, better: Up, show: Show.x() , words: { say: (c) => `rare event drops are ${c.times} as likely` } }),
  shinyMult: def({ unit: UnitKind.Mult, stack: Mul, base: 1, label: 'Shiny feet', icon: '✨', section: Economy, better: Up, show: Show.x() , words: { subject: 'shiny feet', say: (c) => (c.value === 2 ? 'are twice as common' : `${c.times} as common`) } }),
  shinyCrusts: def({ unit: UnitKind.Amount, stack: Add, base: 0, label: 'Shiny crusts', icon: '✨', section: Economy, better: Up, show: Show.int(undefined, ' each') , words: { subject: 'shiny feet', say: (c) => `pay ${c.size} Golden Crust${plural(c)} each` } }),
  sightingMult: def({ unit: UnitKind.Mult, stack: Mul, base: 1, label: 'Hero sightings', icon: '☎️', section: Economy, better: Up, show: Show.x() , words: { say: (c) => `hero sightings ${c.times} as likely` } }),
  sightingEvery: def({ unit: UnitKind.Count, stack: Min, base: 0, label: 'Sure hero sighting every', icon: '🦸', section: Economy, better: Up, show: Show.int(), note: 'waves, guaranteed' , words: { say: (c) => `a hero sighting every ${c.size} waves, guaranteed` } }),
  sightingHits: def({ unit: UnitKind.Count, stack: Min, base: 0, label: 'Catch a hero in', icon: '☎️', section: Economy, better: Up, show: (v) => ({ num: v, fmt: 'int', post: v === 1 ? ' smack' : ' smacks' }) , words: { say: (c) => (c.n === 1 ? 'one smack catches a hero' : `${c.size} smacks catch a hero`) } }),
  // ——— sustain ———
  regenPerWave: def({ unit: UnitKind.PerWave, stack: Add, base: 0, label: 'Regrowth each wave', icon: '🌱', section: Sustain, better: Up, show: Show.int('+', ' slice'), note: 'on every pizza' , words: { subject: 'every pizza', say: (c) => `regrows ${c.signed} slice${plural(c)} after each wave` } }),
  regenAll: def({ unit: UnitKind.PerWave, stack: Add, base: 0, label: 'Regrowth each wave', icon: '🌱', section: Sustain, better: Up, show: Show.int('+', ' slice'), note: 'on every pizza' , words: { subject: 'every pizza', say: (c) => `regrows ${c.signed} slice${plural(c)} after each wave` } }),
  healWeakest: def({ unit: UnitKind.PerWave, stack: Add, base: 0, label: 'Patch the weakest', icon: '🩹', section: Sustain, better: Up, show: Show.int('+', ' slice'), note: 'after each wave' , words: { subject: 'your weakest pizza', say: (c) => `regrows ${c.signed} slice${plural(c)} after each wave` } }),
  shields: def({ unit: UnitKind.PerWave, stack: Add, base: 0, label: 'Stomp shields', icon: '🧀', section: Sustain, better: Up, show: Show.int(undefined, ' each'), note: 'every pizza, every wave' , words: { subject: 'every pizza', say: (c) => `blocks ${c.signed} stomp${plural(c)} a wave` } }),
  shrugChance: def({ unit: UnitKind.Chance, stack: Add, base: 0, label: 'Shrug off a stomp', icon: '🧱', section: Sustain, better: Up, show: Show.pct() , words: { say: (c) => `${c.signed} chance pizzas shrug off a stomp` } }),
  traps: def({ unit: UnitKind.Count, stack: Add, base: 0, label: 'Mousetraps', icon: '🪤', section: Sustain, better: Up, show: Show.int(), note: 'under every pizza each wave' , words: { say: (c) => `${c.signed} mousetrap${plural(c)} under each pizza a wave` } }),
  stompBurn: def({ unit: UnitKind.Amount, stack: Add, base: 0, label: 'Stompers burn', icon: '♨️', section: Sustain, better: Up, show: Show.int(undefined, '/s') , words: { say: (c) => `stompers burn ${c.signed} dmg/s`, alone: (c) => `feet that stomp a pizza burn for ${c.signed} dmg/s` } }),
  stompExtra: def({ unit: UnitKind.Chance, stack: Add, base: 0, caps: { max: 0.6 }, label: 'Extra slice lost', icon: '💔', section: Sustain, better: Down, show: Show.pct(), note: 'chance on each stomp' , words: { say: (c) => `${c.size} chance a stomp takes an extra slice` } }),
  freshBonus: def({ unit: UnitKind.Amount, stack: Add, base: 0, caps: { min: -4 }, label: 'Freshness', icon: '🧊', section: Sustain, better: Up, show: Show.signed(), note: 'on every pizza' , words: { say: (c) => `${c.signed} freshness on every pizza` } }),
  angel: def({ unit: UnitKind.Count, stack: Add, base: 0, label: 'Pizza Angel', icon: '👼', section: Sustain, better: Up, show: Show.int() , words: { say: (c) => `${c.signed} Pizza Angel${plural(c)}` } }),
  // ——— peel and super ———
  superGain: def({ unit: UnitKind.Mult, stack: Add, base: 1, caps: { min: 0.2 }, label: 'Meter charge', icon: '🔋', section: Peel, better: Up, show: Show.x() , words: { say: (c, w) => (c.dir > 0 ? w.meterBoost(c.n) : w.meterCut(c.n)) } }),
  superStart: def({ unit: UnitKind.Percent, stack: Max, base: 0, label: 'Starts each wave', icon: '🍫', section: Peel, better: Up, show: (v) => ({ num: pc(Math.min(1, v)), fmt: 'pct' }), note: 'charged' , words: { say: (c, w) => w.superStart(c.n) } }),
} satisfies Record<keyof Stats, StatDef>;

/** Every stat's key. */
export type StatKey = keyof Stats;
export const STAT_KEYS = Object.keys(STAT_DEFS) as StatKey[];
/** A stat's unit (from its definition). */
export type UnitOf<K extends StatKey> = (typeof STAT_DEFS)[K]['unit'];
/** What an add is measured in: a multiplier stat (×1 tips) adds percentages (+25% tips). */
export type AddUnitOf<K extends StatKey> = UnitOf<K> extends 'mult' ? 'percent' : UnitOf<K>;
export type NumStatKey = { [K in StatKey]: UnitOf<K> extends NumUnit ? K : never }[StatKey];
export type FlagStatKey = Exclude<StatKey, NumStatKey>;

/** Stats by name, typed: Stat.CritChance is 'critChance' (a typo doesn't compile). */
export const Stat = {
  Damage: 'damage',
  CritChance: 'critChance',
  CritMult: 'critMult',
  Radius: 'radius',
  Knockback: 'knockback',
  BurnDps: 'burnDps',
  SlowPct: 'slowPct',
  ChainChance: 'chainChance',
  ChainCount: 'chainCount',
  ChainDmg: 'chainDmg',
  Cutters: 'cutters',
  CutterDmg: 'cutterDmg',
  GarlicDps: 'garlicDps',
  Shields: 'shields',
  RegenPerWave: 'regenPerWave',
  CoinMult: 'coinMult',
  ComboBonus: 'comboBonus',
  ScoreMult: 'scoreMult',
  StunChance: 'stunChance',
  SuperGain: 'superGain',
  DoubleChance: 'doubleChance',
  ShrugChance: 'shrugChance',
  Execute: 'execute',
  OliveRate: 'oliveRate',
  OliveDmg: 'oliveDmg',
  ExplodeDmg: 'explodeDmg',
  SpeedMult: 'speedMult',
  Traps: 'traps',
  Luck: 'luck',
  FreeRerolls: 'freeRerolls',
  StompBurn: 'stompBurn',
  GoldenTouch: 'goldenTouch',
  FreezeSlam: 'freezeSlam',
  Angel: 'angel',
  CoinsPerWave: 'coinsPerWave',
  SlowAbove: 'slowAbove',
  HealWeakest: 'healWeakest',
  RegenAll: 'regenAll',
  SuperStart: 'superStart',
  FreshBonus: 'freshBonus',
  SplashDmg: 'splashDmg',
  BigHurt: 'bigHurt',
  BossDmg: 'bossDmg',
  TenthCrit: 'tenthCrit',
  QuickTips: 'quickTips',
  CounterDiscount: 'counterDiscount',
  ExtraConsumable: 'extraConsumable',
  CrustBonus: 'crustBonus',
  SlamStun: 'slamStun',
  MiniWeak: 'miniWeak',
  StunVuln: 'stunVuln',
  FreeTopping: 'freeTopping',
  FootHp: 'footHp',
  StompExtra: 'stompExtra',
  EventMult: 'eventMult',
  EventAlways: 'eventAlways',
  EventCount: 'eventCount',
  NoEvents: 'noEvents',
  NoGolden: 'noGolden',
  EventTips: 'eventTips',
  FlyerSec: 'flyerSec',
  FlyerBias: 'flyerBias',
  SeagullCrust: 'seagullCrust',
  ChestLess: 'chestLess',
  MimicMult: 'mimicMult',
  EventRetry: 'eventRetry',
  DropAdd: 'dropAdd',
  DropMult: 'dropMult',
  MimicDrop: 'mimicDrop',
  ShinyMult: 'shinyMult',
  ShinyCrusts: 'shinyCrusts',
  SightingMult: 'sightingMult',
  SightingEvery: 'sightingEvery',
  SightingHits: 'sightingHits',
  EndCrustMult: 'endCrustMult',
  ShopDiscount: 'shopDiscount',
  ConsumableDiscount: 'consumableDiscount',
  CardDelta: 'cardDelta',
  GuaranteedEpic: 'guaranteedEpic',
  ExclusiveDiscount: 'exclusiveDiscount',
  RerollLess: 'rerollLess',
  RerollMult: 'rerollMult',
  GoldenDiscount: 'goldenDiscount',
  CounterMult: 'counterMult',
  CapBonus: 'capBonus',
} as const satisfies Record<string, StatKey>;

// every stat has a name under Stat. (a new stat without one doesn't compile)
type Unnamed = Exclude<StatKey, (typeof Stat)[keyof typeof Stat]>;
const everyStatNamed: [Unnamed] extends [never] ? true : Unnamed = true;
void everyStatNamed;

/** A fresh run's stats: every definition's base. */
export function baseStatsFromDefs(): Stats {
  const s = {} as Record<StatKey, number | boolean>;
  for (const k of STAT_KEYS) s[k] = STAT_DEFS[k].base;
  return s as unknown as Stats;
}
