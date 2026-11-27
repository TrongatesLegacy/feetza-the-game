// The STATS tab (Your Toppings): the current build worked out into numbers, from the run's stats, the toppings'
// procs, the pizzas on the table, the peel's ability and the hero, read the way the damage path in GameScene uses
// them (crit, double smacks, the heat's automatic-damage scale, hero and pizza multipliers). The scene gathers
// a BuildInput; this turns it into a view the UI draws (src/ui/statsTab.ts).
//
// DPS: smack damage is the expected hit (crit and follow-up smacks folded into an average) times your MEASURED pace
// (smacks landed per second with a foot on the table, from the scene's tally); nothing guesses a click rate. Timed
// sources (cutters, olives, auras, burns, timed procs) are per second on their own; smack- and kill-triggered
// ones use your measured smack and kill rates. Area hits count once (the foot you're on); hits on a fixed number
// of feet (3 random feet, chain to 4 more) count each one. The last wave's measured tally sits beside each number.

import type { Ability, Effect, Proc, Target } from './abilities';
import { describeAbility, throwCount } from './abilities';
import type { Stats } from '../data/upgrades';
import { baseStats, UPGRADE_BY_ID } from '../data/upgrades';
import type { PizzaPerk } from '../data/pizzas';
import { passiveBoost } from './slamMode';
import { DOUBLE_CAP, TIP_MULT_CAP } from './Run';
import { total, type DmgTally, type TallySpan } from './dmgTally';
import { COMBO_BASE_WINDOW } from '../config';
import { tunaTips } from '../data/perkWave';

export type Tone = 'up' | 'down' | 'flat';

/** Where a number comes from: a topping, a pizza, the Pizzeria's upgrades, the peel. */
export interface Src {
  key: string;
  name: string;
  /** Emoji (toppings, upgrades) or an image (pizzas, peels). */
  icon?: string;
  img?: string;
  tone: Tone;
  /** What it does (a topping's text at its level, a pizza's perk line): the chip's tooltip. */
  tip?: string;
}

export type NumFmt = 'int' | 'dec' | 'pct' | 'x' | 'sec' | 'text';

export interface Tile {
  label: string;
  num: number;
  fmt: NumFmt;
  pre?: string;
  post?: string;
  /** fmt 'text': shown as is. */
  text?: string;
  icon: string;
  img?: string;
  tone: Tone;
  note?: string;
  from: Src[];
  /** The big tiles lead their section. */
  big?: boolean;
}

/** An automatic attack: its own DPS (null when it needs a measured rate first), and what was measured. */
export interface AutoTile extends Tile {
  key: string;
  color: string;
  dps: number | null;
  /** What its DPS rides on: time, your smacks, your kills, or an event (a stomp, a wave) with no DPS. */
  rate: 'time' | 'smack' | 'kill' | 'event';
  measured: number | null;
  /** Its DPS as a share of all automatic DPS (0..1). */
  share: number;
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  color: string;
  sub?: string;
  tiles: Tile[];
  auto?: AutoTile[];
  empty?: string;
}

export interface PerkCard {
  id: string;
  name: string;
  slices: number;
  max: number;
  line: string;
  enhanced: boolean;
  status: 'stale' | 'frozen' | 'toast' | null;
  note?: string;
  stale: boolean;
  dead: boolean;
}

export interface Bar {
  key: string;
  label: string;
  color: string;
  value: number;
}

export interface BuildView {
  /** Expected damage of one landed smack on one foot (crit, follow-ups and multipliers folded in). */
  perSmack: number;
  /** Chain lightning, splash and the like that ride along with each landed smack. */
  smackExtras: number;
  /** Smacks landed per second with a foot on the table (null: nothing measured yet). */
  pace: number | null;
  paceFrom: string;
  smackDps: number | null;
  /** Automatic DPS at full momentum (the player keeps smacking); idle it cools to autoDps × momentumFloor. */
  autoDps: number;
  /** What automatic damage cools to when the player stops smacking (the heat's momentum floor). */
  momentumFloor: number;
  /** Automatic sources that need a measured rate before they get a DPS. */
  autoWaiting: number;
  total: number | null;
  measured: { dps: number; label: string } | null;
  bars: Bar[];
  barsLabel: string;
  sections: Section[];
  pizzas: PerkCard[];
  heat: string;
  /** Feet on the table the worked-out numbers assume (measured, or 3 before a wave is). */
  feet: number;
  feetMeasured: boolean;
}

export interface TablePizza {
  id: string;
  name: string;
  /** The perk it grants now (null: stale, frozen or gone). */
  perk: PizzaPerk | null;
  line: string;
  enhanced: boolean;
  stale: boolean;
  frozen: boolean;
  dead: boolean;
  slices: number;
  max: number;
  /** Its perk's strength (1, 1.5 enhanced, Napoletana's boost). */
  pk: number;
  img: string;
}

export interface BuildInput {
  stats: Stats;
  /** What each topping, pizza, upgrade and the peel change, stat by stat (the scene leaves each out in turn). */
  from: Partial<Record<keyof Stats, Src[]>>;
  owned: Record<string, number>;
  procs: { id: string; p: Proc; lvl: number }[];
  ability: Ability | null;
  peel: { id: string; name: string; img: string };
  pizzas: TablePizza[];
  /** The heat: autoDmg scales automatic damage; momentumFloor is what it cools to when the player stops smacking. */
  heat: { name: string; autoDmg: number; momentumFloor: number; tips: number; freshness: number };
  /** The wave in play, or the next one while in the shop. */
  wave: number;
  inWave: boolean;
  bossWave: boolean;
  /** Pizza Romana's follow-up chance (on top of doubleChance). */
  extraDouble: number;
  /** Seaside Fritto pays more this wave (or the next, in the shop): a slice was lost in the one before. */
  lossTips: boolean;
  /** Phantom Waltz's friendly ghosts out guarding pizzas now. */
  ghosts: number;
  /** Colossus Forge: waves survived this run. */
  forgeWaves: number;
  hero: { smack: number; all: number; reach: number; crit: boolean; meter: number };
  /** Every hit's multiplier this wave, whatever the foot (Victory Lap, Night Shift, Moon Cheese). */
  waveMult: number;
  /** Smacks hit every foot in range (Bigger Peel, The Last Slice). */
  areaSmack: boolean;
  /** Table-wide perk strength. */
  c: (perk: PizzaPerk) => number;
  /** Napoletana's boost to every other perk (1 without one). */
  boost: number;
  tally: DmgTally;
  armed: string[];
  meter: number;
  /** The wave-clear bonus the next clear pays (before the perfect ×1.5). */
  clearBonus: number;
  /** A drawn texture as an image (the cutter, the olive, the drone…). */
  tex: (key: string) => string;
}

// ——— helpers ———

/** Stats where more is worse (feet tougher or faster, extra slices lost, dearer shops). */
const BAD_UP = new Set<keyof Stats>(['footHp', 'speedMult', 'stompExtra', 'counterMult', 'rerollMult', 'noEvents', 'noGolden']);

export function toneOf(k: keyof Stats, now: number | boolean, base: number | boolean): Tone {
  const a = Number(now);
  const b = Number(base);
  if (Math.abs(a - b) < 1e-9) return 'flat';
  return a > b !== BAD_UP.has(k) ? 'up' : 'down';
}

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

/** Feet on the table to hit, on average (measured; 3 before anything is): attacks on several feet only find this many. */
let feetAround = 3;

/** Feet a target reaches, counted the way the DPS counts them: a fixed number counts each (as many as there are
 *  feet around), an area counts once. */
function reach(t: Target): number {
  return t.to === 'random' || t.to === 'front' || t.to === 'toughest' || t.to === 'blast' ? Math.min(t.n, feetAround) : 1;
}

/** Chain lightning jumps from one foot to others: as many as there are. */
const jumpsAround = (n: number) => Math.min(n, Math.max(0, feetAround - 1));

function whoShort(t: Target): string {
  switch (t.to) {
    case 'all':
      return 'every foot';
    case 'peel':
      return 'feet near the peel';
    case 'hit':
      return t.r ? 'it and nearby' : 'that foot';
    case 'random':
      return t.n === 1 ? 'a random foot' : `${t.n} random feet`;
    case 'front':
      return t.n === 1 ? 'the front foot' : `${t.n} front feet`;
    case 'toughest':
      return t.n === 1 ? 'the toughest foot' : `${t.n} toughest feet`;
    case 'pizzas':
      return 'feet near pizzas';
    case 'blast':
      return `${t.n} blast${t.n > 1 ? 's' : ''}`;
  }
}

/** One firing of a list of effects: damage to the feet it reaches (hit), and burning over time (burn, total). */
function fxDamage(fx: Effect[], dmg: number, auto: number, fromAbility: boolean): { hit: number; burn: number; burnSec: number; who: string } {
  let hit = 0;
  let burn = 0;
  let burnSec = 0;
  let who = '';
  for (const e of fx) {
    if ('at' in e && !who) who = whoShort(e.at);
    switch (e.e) {
      case 'dmg':
        // topping procs are automatic damage (the heat scales them); the peel's own ability isn't
        hit += e.x * dmg * reach(e.at) * (fromAbility ? 1 : auto);
        break;
      case 'burn':
        burn = Math.max(burn, e.x * dmg * auto * reach(e.at));
        burnSec = Math.max(burnSec, e.sec);
        break;
      case 'chain':
        hit += e.x * dmg * jumpsAround(e.jumps);
        break;
      case 'throw': {
        const n = Math.min(throwCount(e), Math.max(1, feetAround));
        hit += (e.x + (e.more ?? []).reduce((a, b) => a + b, 0)) * dmg * n + (e.splash ?? 0) * dmg;
        for (const r of e.on ?? []) {
          const sub = fxDamage([r], dmg, auto, fromAbility);
          hit += sub.hit * n;
          if (sub.burn > burn) {
            burn = sub.burn * n;
            burnSec = sub.burnSec;
          }
        }
        break;
      }
    }
  }
  return { hit, burn, burnSec, who };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** A fresh run's average smack: 10 damage, 5% crits at ×2.5. */
const BASE_PER_SMACK = (() => {
  const b = baseStats();
  return b.damage * (1 + b.critChance * (b.critMult - 1));
})();

/** Pace and rates from the tally: the wave in play once it has some time on it, else the last wave. */
function rates(t: DmgTally): { span: TallySpan | null; label: string } {
  if (t.inWave && t.wave.sec >= 8 && t.wave.smacks > 0) return { span: t.wave, label: 'this wave so far' };
  if (t.last && t.last.sec >= 2) return { span: t.last, label: `wave ${t.lastWave}` };
  const run = t.runSoFar();
  if (run.sec >= 2) return { span: run, label: 'this run' };
  return { span: null, label: '' };
}

/** Names and colours for the measured tally's keys. */
const SRC_INFO: Record<string, { label: string; color: string; icon: string }> = {
  smack: { label: 'Smacks', color: '#e5402a', icon: '👋' },
  chain: { label: 'Chain lightning', color: '#4cc9f0', icon: '⚡' },
  splash: { label: 'Splash', color: '#ff7a5a', icon: '💦' },
  explode: { label: 'Explosions', color: '#ff9f1c', icon: '💥' },
  burn: { label: 'Burning', color: '#ff6a1a', icon: '🔥' },
  cutter: { label: 'Orbiting cutters', color: '#9aa4b2', icon: '⚙️' },
  olive: { label: 'Olives', color: '#6b8e23', icon: '🫒' },
  garlic: { label: 'Garlic auras', color: '#9bd35a', icon: '🧄' },
  trap: { label: 'Mousetraps', color: '#a0785a', icon: '🪤' },
  slam: { label: 'Peel Slam', color: '#7c6cff', icon: '🏓' },
  ability: { label: 'Peel ability', color: '#b06bff', icon: '✨' },
  direct: { label: 'Hero moves', color: '#ff7ad9', icon: '🦸' },
  kit: { label: 'Topping tricks', color: '#d9a066', icon: '🎲' },
  'kit:woodfired': { label: 'Wood-Fired', color: '#e0662a', icon: '🏕️' },
  'kit:drone': { label: 'Pizza Drone', color: '#5fd8ff', icon: '🛸' },
  'perk:meteor': { label: 'Meteors', color: '#ff8c42', icon: '🌠' },
  'perk:fireLane': { label: 'Dragon fire', color: '#ff4d1a', icon: '🐉' },
  'perk:erupt': { label: 'Eruption', color: '#c8321a', icon: '🌋' },
  'perk:meatball': { label: 'Meatballs', color: '#b0603a', icon: '🧆' },
  'perk:orbitRing': { label: 'Ghost rings', color: '#8aff9a', icon: '💍' },
  'perk:tripleBite': { label: 'Three-headed bites', color: '#ff8a3a', icon: '🐕' },
};

export function sourceInfo(key: string): { label: string; color: string; icon: string } {
  if (SRC_INFO[key]) return SRC_INFO[key];
  if (key.startsWith('proc:')) {
    const u = UPGRADE_BY_ID[key.slice(5)];
    if (u) return { label: u.name, color: hex(u.proc?.color ?? 0xd9a066), icon: u.icon };
  }
  return { label: key, color: '#a08a70', icon: '•' };
}

// ——— the view ———

export function buildView(inp: BuildInput): BuildView {
  const st = inp.stats;
  const base = baseStats();
  const from = (...keys: (keyof Stats)[]): Src[] => {
    const out: Src[] = [];
    for (const k of keys) for (const s of inp.from[k] ?? []) if (!out.some((o) => o.key === s.key)) out.push(s);
    return out;
  };
  const tone = (k: keyof Stats) => toneOf(k, st[k] as number | boolean, base[k] as number | boolean);
  const auto = inp.heat.autoDmg;
  const g = inp.hero.all * inp.waveMult;
  const dmg = st.damage;
  const lv = (id: string) => inp.owned[id] ?? 0;

  // ——— measured ———
  const { span, label: paceFrom } = rates(inp.tally);
  const pace = span && span.sec > 0 ? span.smacks / span.sec : null;
  const killRate = span && span.sec > 0 ? span.kills / span.sec : null;
  const measuredOf = (key: string): number | null => (span && span.sec > 0 ? (span.by[key] ?? 0) / span.sec : null);
  feetAround = span && span.sec > 0 && span.feetSec > 0 ? Math.max(1, span.feetSec / span.sec) : 3;

  // ——— one smack ———
  const tenth = st.tenthCrit ? (inp.pizzas.some((p) => p.perk === 'tenthCrit' && p.enhanced) ? 7 : 10) : 0;
  const pc0 = inp.hero.crit ? 1 : st.critChance;
  const pCrit = tenth ? pc0 + (1 - pc0) / tenth : pc0;
  const critAvg = 1 + pCrit * (st.critMult - 1);
  const dbl = Math.min(DOUBLE_CAP, st.doubleChance + inp.extraDouble);
  const fold = lv('foldover') ? 1 / (lv('foldover') >= 2 ? 3 : 4) : 0;
  const echo = lv('echochamber') ? 0.2 + 0.1 * (lv('echochamber') - 1) : 0;
  const hits = 1 + dbl + fold + echo;
  const hitDmg = dmg * critAvg * inp.hero.smack * g;
  const perSmack = hitDmg * hits;
  // rides along with every hit: chain lightning to its targets, splash on one foot nearby
  const chainPer = st.chainChance * jumpsAround(st.chainCount) * dmg * st.chainDmg * g;
  const splashPer = st.splashDmg * g;
  let firePer = 0;
  for (const p of inp.pizzas) if (p.perk === 'fireLane') firePer += 0.1 * p.pk * dmg * g;
  const smackExtras = (chainPer + splashPer + firePer) * hits;

  // ——— the peel's meter ———
  const a = inp.ability;
  const charge = a ? a.charge : 1;
  const meterPerHit = 0.018 * st.superGain * charge * inp.hero.meter;
  const meterPerKill = 0.05 * st.superGain * charge * inp.hero.meter;
  const usesMeter = !a || a.trigger.t === 'active' || a.trigger.t === 'auto';
  const fillSec = pace !== null && usesMeter ? 1 / Math.max(1e-6, meterPerHit * hits * pace + meterPerKill * (killRate ?? 0)) : null;
  const smacksToFill = Math.ceil(Math.max(0, 1 - st.superStart) / Math.max(1e-6, meterPerHit * hits));

  // ——— automatic attacks ———
  const autos: AutoTile[] = [];
  const addAuto = (t: Omit<AutoTile, 'share' | 'tone' | 'fmt' | 'num' | 'rate'> & { tone?: Tone; num?: number; fmt?: NumFmt; rate?: AutoTile['rate'] }) =>
    autos.push({ tone: 'up', fmt: 'int', num: t.dps ?? 0, share: 0, rate: 'time', ...t });

  if (st.cutters > 0) {
    // the blades go round once every 1.5s; each foot takes a hit at most every 0.35s
    const per = (st.cutterDmg + 0.4 * dmg) * auto * g;
    const rate = Math.min(1 / 0.35, st.cutters / ((Math.PI * 2) / 4.2));
    addAuto({ key: 'cutter', label: 'Orbiting cutters', icon: '⚙️', img: inp.tex('cutter'), color: SRC_INFO.cutter.color, dps: per * rate, measured: measuredOf('cutter'), note: `${st.cutters} blade${st.cutters > 1 ? 's' : ''} · ${Math.round(per)} a hit`, from: from('cutters', 'cutterDmg') });
  }
  if (st.oliveRate > 0) {
    const per = (st.oliveDmg + 0.5 * dmg) * auto * g;
    addAuto({ key: 'olive', label: 'Olive Launcher', icon: '🫒', img: inp.tex('olive'), color: SRC_INFO.olive.color, dps: per * st.oliveRate, measured: measuredOf('olive'), note: `1 every ${r1(1 / st.oliveRate)}s · ${Math.round(per)} a hit`, from: from('oliveRate', 'oliveDmg') });
  }
  // auras: the garlic toppings everywhere, Marinara and Tarte Flambée over their own pizza
  let aura = 0;
  const auraFrom: Src[] = [];
  for (const p of inp.pizzas) {
    const k = p.enhanced ? 1.5 : 1;
    const v = (p.perk === 'garlic' ? 6 * k : 0) + (p.perk === 'heatAbove' ? 3 * k : 0);
    if (v > aura) aura = v;
    if (v > 0) auraFrom.push({ key: `pizza:${p.id}`, name: p.name, img: p.img, tone: 'up', tip: p.line });
  }
  if (st.garlicDps > 0 || aura > 0) {
    addAuto({ key: 'garlic', label: 'Garlic aura', icon: '🧄', color: SRC_INFO.garlic.color, dps: (st.garlicDps + aura) * auto * g, measured: measuredOf('garlic'), note: aura ? `on feet near a pizza · +${r1(aura)} over ${auraFrom.map((s) => s.name).join(', ')}` : 'on every foot near a pizza', from: [...from('garlicDps'), ...auraFrom] });
  }
  if (st.burnDps > 0) {
    addAuto({ key: 'burn', label: 'Burning smacks', icon: '🔥', color: SRC_INFO.burn.color, dps: st.burnDps * auto * g, measured: measuredOf('burn'), note: 'each smacked foot burns for 3s', from: from('burnDps') });
  }
  // topping procs
  for (const pr of inp.procs) {
    const u = UPGRADE_BY_ID[pr.id];
    if (!u) continue;
    const t = pr.p.trigger;
    const one = fxDamage(pr.p.fx, dmg * g, auto, false);
    // a burn adds what it burns beyond the smack's own fire (burns don't stack, the hotter one wins)
    const burnExtra = Math.max(0, one.burn - st.burnDps * auto * g);
    let dps: number | null = null;
    let note = '';
    let per = one.hit + burnExtra * one.burnSec;
    const rate: AutoTile['rate'] = t.t === 'every' ? 'time' : t.t === 'smack' ? 'smack' : t.t === 'kill' ? 'kill' : 'event';
    if (t.t === 'every') {
      dps = one.hit / t.sec + burnExtra * Math.min(one.burnSec, t.sec) / t.sec;
      note = `every ${r1(t.sec)}s · ${one.who}`;
    } else if (t.t === 'smack') {
      per = (one.hit + burnExtra * one.burnSec) * t.p * hits;
      dps = pace !== null ? per * pace : null;
      note = `${Math.round(t.p * 100)}% of smacks · ${r1(per)} a smack`;
    } else if (t.t === 'kill') {
      per = (one.hit + burnExtra * one.burnSec) * t.p;
      dps = killRate !== null ? per * killRate : null;
      note = `${Math.round(t.p * 100)}% of kills · ${r1(per)} a kill`;
    } else if (t.t === 'stomp') {
      note = `on a stomp · ${Math.round(per)}`;
    } else note = `each wave · ${Math.round(per)}`;
    if (per <= 0 && !(dps && dps > 0)) continue;
    addAuto({ key: `proc:${pr.id}`, label: u.name, icon: u.icon, color: hex(pr.p.color), dps, rate, measured: measuredOf(`proc:${pr.id}`), note, from: [topSrc(u.id, pr.lvl)] });
  }
  // topping tricks
  if (lv('pizzadrone')) {
    const per = 0.25 * lv('pizzadrone') * dmg * auto * g;
    addAuto({ key: 'kit:drone', label: 'Pizza Drone', icon: '🛸', img: inp.tex('tp_drone'), color: SRC_INFO['kit:drone'].color, dps: per / 2, measured: measuredOf('kit:drone'), note: `a zap every 2s · ${Math.round(per)} a zap`, from: [topSrc('pizzadrone', lv('pizzadrone'))] });
  }
  if (lv('woodfired')) {
    const n = lv('woodfired') >= 2 ? 7 : 10;
    const per = (4 * dmg * auto + Math.max(0, 1 * dmg * auto - st.burnDps * auto) * 3) * g / n;
    addAuto({ key: 'kit:woodfired', label: 'Wood-Fired', icon: '🏕️', color: SRC_INFO['kit:woodfired'].color, dps: pace !== null ? per * pace : null, rate: 'smack', measured: measuredOf('kit:woodfired'), note: `every ${n}th smack is a fireball · ${r1(per)} a smack`, from: [topSrc('woodfired', lv('woodfired'))] });
  }
  // pizza perks that attack on their own
  const pzSrc = (p: TablePizza): Src => ({ key: `pizza:${p.id}`, name: p.name, img: p.img, tone: 'up', tip: p.line });
  const met = inp.c('meteor');
  if (met > 0) {
    const per = 3 * dmg * g;
    addAuto({ key: 'perk:meteor', label: 'Meteors', icon: '🌠', img: inp.tex('pk_meteor'), color: SRC_INFO['perk:meteor'].color, dps: per / (15 / met), measured: measuredOf('perk:meteor'), note: `one every ${r1(15 / met)}s · ${Math.round(per)} a hit`, from: inp.pizzas.filter((p) => p.perk === 'meteor').map(pzSrc) });
  }
  const rings = inp.pizzas.filter((p) => p.perk === 'orbitRing');
  if (rings.length) {
    const n = rings.reduce((t, p) => t + (p.enhanced ? 2 : 1), 0);
    // a ring comes round every 2.9s; a foot it touches takes a hit at most every 0.6s
    const per = dmg * auto * g;
    addAuto({ key: 'perk:orbitRing', label: 'Ghost pineapple rings', icon: '💍', img: inp.tex('pk_ring'), color: SRC_INFO['perk:orbitRing'].color, dps: per * Math.min(1 / 0.6, n / ((Math.PI * 2) / 2.2)), measured: measuredOf('perk:orbitRing'), note: `${n} ring${n > 1 ? 's' : ''} over the pizza · ${Math.round(per)} a hit`, from: rings.map(pzSrc) });
  }
  const meatballs = inp.pizzas.filter((p) => p.perk === 'meatball');
  if (meatballs.length) {
    const per = dmg * auto * g * Math.max(...meatballs.map((p) => p.pk));
    // kills over those pizzas: their share of the table
    const share = meatballs.length / Math.max(1, inp.pizzas.filter((p) => !p.dead).length);
    addAuto({ key: 'perk:meatball', label: 'Rolling meatballs', icon: '🧆', img: inp.tex('pk_meatball'), color: SRC_INFO['perk:meatball'].color, dps: killRate !== null ? per * killRate * share : null, rate: 'kill', measured: measuredOf('perk:meatball'), note: `kills above it · ${Math.round(per)} a meatball`, from: meatballs.map(pzSrc) });
  }
  const burners = inp.pizzas.filter((p) => p.perk === 'burnAbove');
  if (burners.length) {
    const v = Math.max(...burners.map((p) => 6 * p.pk)) * auto * g;
    // (burns don't stack: it adds what it burns beyond the smacks' own fire)
    addAuto({ key: 'burn', label: 'Inferno Calzone', icon: '♨️', color: SRC_INFO.burn.color, dps: Math.max(0, v - st.burnDps * auto * g), measured: null, note: `feet above it burn ${r1(v)}/s`, from: burners.map(pzSrc) });
  }
  // the peel's ability, when it attacks by itself
  if (a && !usesMeter) {
    const t = a.trigger;
    const one = fxDamage(a.fx, dmg * g, auto, true);
    const boost = passiveBoost(st.superGain);
    let dps: number | null = null;
    let note = '';
    const rate: AutoTile['rate'] = t.t === 'every' ? 'time' : t.t === 'smack' ? 'smack' : t.t === 'kill' ? 'kill' : 'event';
    if (t.t === 'every') {
      const sec = t.sec / boost.timer;
      dps = one.hit / sec + one.burn * Math.min(one.burnSec, sec) / sec;
      note = `every ${r1(sec)}s · ${one.who}`;
    } else if (t.t === 'smack') {
      const per = one.hit * Math.min(1, t.p * boost.chance) * hits;
      dps = pace !== null ? per * pace : null;
      note = `${Math.round(Math.min(1, t.p * boost.chance) * 100)}% of smacks`;
    } else if (t.t === 'kill') {
      const per = one.hit * Math.min(1, t.p * boost.chance);
      dps = killRate !== null ? per * killRate : null;
      note = `${Math.round(Math.min(1, t.p * boost.chance) * 100)}% of kills`;
    }
    if (one.hit > 0 || one.burn > 0) addAuto({ key: 'ability', label: a.name, icon: '✨', img: inp.peel.img, color: SRC_INFO.ability.color, dps, rate, measured: measuredOf('ability'), note, from: [{ key: 'peel', name: inp.peel.name, img: inp.peel.img, tone: 'up', tip: describeAbility(a) }] });
  }
  // a throwing peel's passive throw
  if (a?.also) {
    const t = a.also.trigger;
    const one = fxDamage(a.also.fx, dmg * g, auto, false);
    if (one.hit > 0 && t.t === 'every') addAuto({ key: 'ability', label: `${a.name}: throw`, icon: '🎯', img: inp.peel.img, color: SRC_INFO.ability.color, dps: one.hit / t.sec, measured: null, note: `every ${r1(t.sec)}s · ${one.who}`, from: [{ key: 'peel', name: inp.peel.name, img: inp.peel.img, tone: 'up', tip: describeAbility(a) }] });
  }
  // the auras and burns over one pizza don't add up across pizzas: the foot is only over one
  const autoDps = autos.reduce((t, x) => t + (x.dps ?? 0), 0);
  const autoWaiting = autos.filter((x) => x.dps === null && x.rate !== 'event').length;
  for (const x of autos) {
    x.num = x.dps ?? 0;
    x.share = autoDps > 0 && x.dps ? x.dps / autoDps : 0;
  }
  autos.sort((p, q) => (q.dps ?? -1) - (p.dps ?? -1));

  // the meter ability's damage per fill, shared over the time it takes to fill
  let slamHit = 0;
  if (usesMeter) slamHit = a ? fxDamage(a.fx, dmg * g, auto, true).hit : (60 + 4 * dmg) * g;
  const slamDps = fillSec ? slamHit / fillSec : null;
  const smackDps = pace !== null ? pace * (perSmack + smackExtras) + (slamDps ?? 0) : null;
  const totalDps = smackDps !== null ? smackDps + autoDps : null;

  // ——— measured, last wave ———
  const last = inp.tally.inWave && inp.tally.wave.sec >= 8 ? inp.tally.wave : inp.tally.last;
  const barsLabel = last === inp.tally.wave && inp.tally.inWave ? 'This wave so far' : inp.tally.last ? `Wave ${inp.tally.lastWave}` : '';
  const bars: Bar[] = last
    ? Object.entries(last.by)
        .filter(([, v]) => v > 0)
        .sort((p, q) => q[1] - p[1])
        .map(([key, value]) => ({ key, value, label: sourceInfo(key).label, color: sourceInfo(key).color }))
    : [];
  const lastTotal = last ? total(last) : 0;
  const measured = last && last.sec >= 2 && lastTotal > 0 ? { dps: lastTotal / last.sec, label: barsLabel.toLowerCase() } : null;

  // ——— sections ———
  const pct = (n: number) => Math.round(n * 100);
  const sections: Section[] = [];

  // Damage
  const dmgTiles: Tile[] = [
    { label: 'Smack damage', num: dmg, fmt: 'int', icon: '👋', tone: tone('damage'), from: from('damage'), big: true, note: inp.hero.smack !== 1 ? `×${r1(inp.hero.smack)} from your hero` : undefined },
    { label: 'Average per smack', num: perSmack, fmt: 'int', icon: '🎯', tone: perSmack > BASE_PER_SMACK + 0.01 ? 'up' : perSmack < BASE_PER_SMACK - 0.01 ? 'down' : 'flat', from: from('damage', 'critChance', 'critMult', 'doubleChance'), big: true, note: `crits and ${hits > 1.005 ? `${r1(hits)} hits` : 'follow-ups'} folded in` },
    { label: 'Crit chance', num: pct(Math.min(1, pCrit)), fmt: 'pct', icon: '💥', tone: inp.hero.crit ? 'up' : tone('critChance'), from: from('critChance', 'tenthCrit'), note: tenth ? `every ${tenth}th smack is a sure crit` : inp.hero.crit ? 'your hero always crits' : undefined },
    { label: 'Crit damage', num: st.critMult, fmt: 'x', icon: '💢', tone: tone('critMult'), from: from('critMult') },
  ];
  if (dbl > 0) dmgTiles.push({ label: 'Double smack', num: pct(dbl), fmt: 'pct', icon: '👏', tone: 'up', from: [...from('doubleChance'), ...inp.pizzas.filter((p) => p.perk === 'fullSpeed' || p.perk === 'smackSpeed').map(pzSrc)], note: dbl >= DOUBLE_CAP - 1e-6 ? `at the ${pct(DOUBLE_CAP)}% cap` : 'chance to smack again' });
  if (fold) dmgTiles.push({ label: 'Fold Over', num: lv('foldover') >= 2 ? 3 : 4, fmt: 'int', pre: 'every ', post: 'th', icon: '🌮', tone: 'up', from: [topSrc('foldover', lv('foldover'))], note: 'smack hits twice' });
  if (echo) dmgTiles.push({ label: 'Echo smacks', num: pct(echo), fmt: 'pct', icon: '📣', tone: 'up', from: [topSrc('echochamber', lv('echochamber'))] });
  if (st.execute > 0) dmgTiles.push({ label: 'Finishes feet under', num: pct(st.execute), fmt: 'pct', icon: '🔪', tone: 'up', from: from('execute'), note: 'health, not bosses' });
  // conditional multipliers
  const fullBoss = inp.pizzas.filter((p) => p.perk === 'fullBoss' && p.slices === p.max).reduce((m, p) => m * (1 + 0.15 * p.pk), 1);
  const bossX = (1 + st.bossDmg) * (1 + 0.2 * inp.c('slayer')) * fullBoss;
  const bossFrom = [...from('bossDmg'), ...inp.pizzas.filter((p) => p.perk === 'slayer' || p.perk === 'fullBoss').map(pzSrc)];
  if (bossX > 1.001) dmgTiles.push({ label: 'vs bosses', num: bossX, fmt: 'x', icon: '👹', tone: 'up', from: bossFrom });
  const miniX = (1 + st.bossDmg) * (1 + 0.25 * inp.c('miniDmg'));
  if (miniX > 1.001 || st.miniWeak > 0) dmgTiles.push({ label: 'vs mini-bosses', num: miniX, fmt: 'x', icon: '👺', tone: 'up', from: [...from('bossDmg', 'miniWeak'), ...inp.pizzas.filter((p) => p.perk === 'miniDmg').map(pzSrc)], note: st.miniWeak > 0 ? `they spawn with ${pct(st.miniWeak)}% less health` : undefined });
  if (st.bigHurt > 0) dmgTiles.push({ label: 'vs healthy feet', num: 1 + st.bigHurt, fmt: 'x', icon: '💪', tone: 'up', from: from('bigHurt'), note: 'above half health' });
  const fast = inp.c('fastDmg');
  if (fast > 0) dmgTiles.push({ label: 'vs fast feet', num: 1 + 0.15 * fast, fmt: 'x', icon: '💨', tone: 'up', from: inp.pizzas.filter((p) => p.perk === 'fastDmg').map(pzSrc) });
  for (const p of inp.pizzas.filter((q) => q.perk === 'nearDmg')) dmgTiles.push({ label: `near ${p.name}`, num: 1 + 0.1 * p.pk, fmt: 'x', icon: '📍', tone: 'up', from: [pzSrc(p)], note: 'smacks near it' });
  const undead = inp.c('undeadDmg');
  if (undead > 0) dmgTiles.push({ label: 'vs ghosts and undead', num: 1 + 0.1 * undead, fmt: 'x', icon: '👻', tone: 'up', from: inp.pizzas.filter((p) => p.perk === 'undeadDmg').map(pzSrc), note: 'zombified feet too' });
  const rush = inp.c('killRush');
  if (rush > 0) dmgTiles.push({ label: 'After a kill', num: pct(0.05 * rush), fmt: 'pct', pre: '+', icon: '⛸️', tone: 'up', from: inp.pizzas.filter((p) => p.perk === 'killRush').map(pzSrc), note: 'faster smacks for 3s' });
  // the Epic Chef's Specials: T-Rex Ribs' table shake, Comet Calzone's comet
  const quake = inp.c('critQuake');
  if (quake > 0) dmgTiles.push({ label: 'Table shake', num: 1 + 0.1 * quake, fmt: 'x', icon: '🦖', tone: 'up', from: inp.pizzas.filter((p) => p.perk === 'critQuake').map(pzSrc), note: 'every foot, for 3s after a crit' });
  const comet = inp.c('comet');
  if (comet > 0) dmgTiles.push({ label: 'Comet', num: 4, fmt: 'x', icon: '☄️', tone: 'up', from: inp.pizzas.filter((p) => p.perk === 'comet').map(pzSrc), note: `the toughest foot, every ${r1(12 / comet)}s` });
  // the Epic Pizzeria pizzas: Colossus Forge, Three-Headed Hound, Gorgon's Gaze, Ember Shade
  for (const p of inp.pizzas.filter((q) => q.perk === 'forgeWaves')) dmgTiles.push({ label: 'The Forge', num: r1(Math.min(40, inp.forgeWaves) * p.pk), fmt: 'pct', pre: '+', icon: '⚒️', tone: 'up', from: [pzSrc(p)], note: `${inp.forgeWaves} wave${inp.forgeWaves === 1 ? '' : 's'} survived · +${r1(p.pk)}% a wave, up to +${r1(40 * p.pk)}%` });
  for (const p of inp.pizzas.filter((q) => q.perk === 'tripleBite')) dmgTiles.push({ label: 'Three bites', num: p.enhanced ? 2 : 3, fmt: 'int', pre: 'every ', post: ' smacks', icon: '🐕', tone: 'up', from: [pzSrc(p)], note: 'the smack bites three times' });
  for (const p of inp.pizzas.filter((q) => q.perk === 'gorgonGaze')) dmgTiles.push({ label: 'Stone gaze', num: 2, fmt: 'x', icon: '🐍', tone: 'up', from: [pzSrc(p)], note: `the first foot over ${p.name} each wave, stone for ${p.enhanced ? 5 : 3}s` });
  const embers = inp.pizzas.filter((p) => p.perk === 'emberTrail');
  if (embers.length) dmgTiles.push({ label: 'Embers', num: Math.round(6 * (embers.some((p) => p.enhanced) ? 1.5 : 1) * inp.boost), fmt: 'int', post: '/s', icon: '🔥', tone: 'up', from: embers.map(pzSrc), note: 'kills leave embers; the next foot through burns 3s' });
  for (const p of inp.pizzas.filter((q) => q.perk === 'stunVuln')) dmgTiles.push({ label: 'vs stunned feet', num: p.enhanced ? 1.75 : 1.5, fmt: 'x', icon: '😵', tone: 'up', from: [pzSrc(p)], note: `over ${p.name}` });
  if (Math.abs(inp.waveMult - 1) > 0.001) dmgTiles.push({ label: inp.inWave ? 'This wave' : 'Next wave', num: inp.waveMult, fmt: 'x', icon: '🌙', tone: 'up', from: inp.pizzas.filter((p) => p.perk === 'actStart' || p.perk === 'nightDmg' || p.perk === 'postBoss').map(pzSrc), note: 'every hit' });
  if (inp.hero.all !== 1) dmgTiles.push({ label: 'Hero passive', num: inp.hero.all, fmt: 'x', icon: '🦸', tone: inp.hero.all > 1 ? 'up' : 'down', from: [{ key: 'peel', name: inp.peel.name, img: inp.peel.img, tone: 'up' }], note: 'every hit' });
  const reachNow = st.radius * inp.hero.reach;
  dmgTiles.push({ label: 'Smack reach', num: reachNow, fmt: 'int', icon: '🏓', tone: tone('radius'), from: from('radius'), note: inp.areaSmack ? 'hits every foot in range' : undefined });
  if (st.chainChance > 0) dmgTiles.push({ label: 'Chain lightning', num: pct(st.chainChance), fmt: 'pct', icon: '⚡', tone: 'up', from: from('chainChance', 'chainCount', 'chainDmg'), note: `to ${st.chainCount} feet for ${Math.round(dmg * st.chainDmg * g)} each` });
  if (st.splashDmg > 0) dmgTiles.push({ label: 'Splash', num: st.splashDmg * g, fmt: 'int', icon: '💦', tone: 'up', from: from('splashDmg'), note: 'on each foot nearby' });
  if (st.explodeDmg > 0) dmgTiles.push({ label: 'Kills explode', num: st.explodeDmg * g, fmt: 'int', icon: '🍍', tone: 'up', from: from('explodeDmg'), note: 'to every foot nearby' });
  sections.push({ id: 'damage', title: 'Damage', icon: '👊', color: '#e5402a', sub: 'per smack, before armour', tiles: dmgTiles });

  sections.push({ id: 'auto', title: 'Automatic attacks', icon: '⚙️', color: '#ff9f1c', sub: `they hit without a smack · ${pct(auto)}% strength on ${inp.heat.name}, shown at full momentum · keep smacking and they stay at full; idle they cool to ${pct(inp.heat.momentumFloor)}%`, tiles: [], auto: autos, empty: 'Nothing attacks on its own yet. Orbiting cutters, olives, auras and timed toppings would show here.' });

  // Crowd control
  const cc: Tile[] = [];
  if (st.stunChance > 0) cc.push({ label: 'Stun chance', num: pct(st.stunChance), fmt: 'pct', icon: '😵', tone: 'up', from: from('stunChance'), note: 'smacks stun feet 1.2s', big: true });
  if (st.slowPct > 0) cc.push({ label: 'Chill', num: pct(st.slowPct), fmt: 'pct', icon: '❄️', tone: 'up', from: from('slowPct'), note: 'slower for 2s after a smack', big: true });
  cc.push({ label: 'Knockback', num: st.knockback, fmt: 'int', icon: '🌀', tone: tone('knockback'), from: from('knockback') });
  if (Math.abs(st.speedMult - 1) > 0.001) cc.push({ label: st.speedMult < 1 ? 'Feet slower' : 'Feet faster', num: pct(Math.abs(1 - st.speedMult)), fmt: 'pct', icon: st.speedMult < 1 ? '🐌' : '🏃', tone: tone('speedMult'), from: from('speedMult') });
  if (Math.abs(st.footHp - 1) > 0.001) cc.push({ label: 'Feet health', num: st.footHp, fmt: 'x', icon: '🦶', tone: tone('footHp'), from: from('footHp') });
  if (st.freezeSlam) cc.push({ label: a && !usesMeter ? `${a.name} chills` : 'Slam freezes', num: a && !usesMeter ? 40 : 3, fmt: a && !usesMeter ? 'pct' : 'sec', icon: '⏳', tone: 'up', from: from('freezeSlam'), note: a && !usesMeter ? 'for 2s' : 'every foot' });
  if (st.slamStun) cc.push({ label: a && !usesMeter ? `${a.name} stuns` : 'Slam stuns', num: inp.pizzas.some((p) => p.perk === 'slamStun' && p.enhanced) ? 2.5 : 1.5, fmt: 'sec', icon: '🦐', tone: 'up', from: from('slamStun') });
  for (const pr of inp.procs) {
    const cl = pr.p.fx.find((e) => e.e === 'stun' || e.e === 'slow' || e.e === 'knock' || e.e === 'mark');
    if (!cl) continue;
    const u = UPGRADE_BY_ID[pr.id];
    if (!u) continue;
    const t = pr.p.trigger;
    const when = t.t === 'every' ? `every ${r1(t.sec)}s` : t.t === 'smack' ? `${pct(t.p)}% of smacks` : t.t === 'kill' ? `${pct(t.p)}% of kills` : t.t === 'stomp' ? 'on a stomp' : 'each wave';
    const what = cl.e === 'stun' ? `${cl.freeze ? 'freeze' : 'stun'} ${whoShort(cl.at)}` : cl.e === 'slow' ? `slow ${whoShort(cl.at)} ${pct(cl.pct)}%` : cl.e === 'mark' ? `mark ${whoShort(cl.at)} ×${cl.mult}` : `knock ${whoShort(cl.at)} back`;
    // the number is how often: a share of smacks or kills, or the seconds between
    const num = t.t === 'smack' || t.t === 'kill' ? pct(t.p) : t.t === 'every' ? t.sec : 0;
    const fmt: NumFmt = t.t === 'smack' || t.t === 'kill' ? 'pct' : t.t === 'every' ? 'sec' : 'text';
    cc.push({ label: u.name, num, fmt, pre: t.t === 'every' ? 'every ' : undefined, text: t.t === 'stomp' ? 'ON A STOMP' : 'EACH WAVE', icon: u.icon, tone: 'up', from: [topSrc(u.id, pr.lvl)], note: `${t.t === 'smack' ? 'of smacks' : t.t === 'kill' ? 'of kills' : when}: ${what}` });
  }
  const perkCc: Partial<Record<PizzaPerk, (p: TablePizza) => Tile>> = {
    slowAbove: (p) => ({ label: 'Slow above', num: p.enhanced ? 38 : 25, fmt: 'pct', icon: '🌿', tone: 'up', from: [pzSrc(p)], note: `feet over ${p.name}` }),
    slowWait: (p) => ({ label: 'Waiting feet slow', num: Math.round(10 * p.pk), fmt: 'pct', post: '/s', icon: '🐢', tone: 'up', from: [pzSrc(p)], note: `over ${p.name}, up to 60%` }),
    timeStop: () => ({ label: 'Time stop', num: Math.min(5, 3 * inp.c('timeStop')), fmt: 'sec', icon: '⏱️', tone: 'up', from: inp.pizzas.filter((q) => q.perk === 'timeStop').map(pzSrc), note: 'feet frozen as each wave starts' }),
    firstFreeze: (p) => ({ label: 'First stomper frozen', num: p.enhanced ? 3 : 2, fmt: 'sec', icon: '🐟', tone: 'up', from: [pzSrc(p)] }),
    slipStomp: (p) => ({ label: 'Stompers slip', num: p.enhanced ? 0.8 : 0.5, fmt: 'sec', icon: '🍅', tone: 'up', from: [pzSrc(p)], note: `on ${p.name}` }),
    stickyStomp: (p) => ({ label: 'Sticky stompers', num: Math.round(40 * p.pk), fmt: 'pct', icon: '🍯', tone: 'up', from: [pzSrc(p)], note: 'slower for 3s' }),
    honeyStomp: (p) => ({ label: 'Hot honey', num: Math.round(40 * p.pk), fmt: 'pct', icon: '🍯', tone: 'up', from: [pzSrc(p)], note: `stompers slowed and burn ${Math.round(dmg * p.pk)}/s` }),
    frostFire: (p) => ({ label: 'Fire and ice', num: p.enhanced ? 2 : 1.5, fmt: 'sec', icon: '🧊', tone: 'up', from: [pzSrc(p)], note: 'stompers frozen, then burned' }),
    knockAbove: (p) => ({ label: 'Knockback above', num: 1 + 0.4 * p.pk, fmt: 'x', icon: '🌪️', tone: 'up', from: [pzSrc(p)], note: `over ${p.name}` }),
    fondueStick: (p) => ({ label: 'Stuck in fondue', num: p.enhanced ? 0.5 : 0.3, fmt: 'sec', icon: '🫕', tone: 'up', from: [pzSrc(p)], note: `stompers of ${p.name}` }),
    roofKnock: (p) => ({ label: 'Knockback above', num: 1 + 0.08 * p.pk, fmt: 'x', icon: '🌿', tone: 'up', from: [pzSrc(p)], note: `over ${p.name}` }),
    stoneStomp: (p) => ({ label: 'Turned to stone', num: p.enhanced ? 1.5 : 1, fmt: 'sec', icon: '🗿', tone: 'up', from: [pzSrc(p)], note: `once a wave a stomp on ${p.name} is blocked, its stomper stunned` }),
    danceBeat: () => ({ label: 'Dance beat', num: Math.round(30 / Math.max(1e-6, inp.c('danceBeat'))), fmt: 'sec', pre: 'every ', icon: '🪩', tone: 'up', from: inp.pizzas.filter((q) => q.perk === 'danceBeat').map(pzSrc), note: 'every foot 30% slower for 2s' }),
    inkSpray: (p) => ({ label: 'Ink spray', num: p.enhanced ? 2.5 : 1.5, fmt: 'sec', icon: '🦑', tone: 'up', from: [pzSrc(p)], note: 'smacked feet lose their lane and wander' }),
    snowball: (p) => ({ label: 'Snowball', num: p.enhanced ? 5 : 8, fmt: 'int', pre: 'every ', post: ' smacks', icon: '☃️', tone: 'up', from: [pzSrc(p)], note: 'freezes the foot nearest the table 2s' }),
    pieSplat: (p) => ({ label: 'Pie splat', num: p.enhanced ? 1.5 : 1, fmt: 'sec', icon: '🥧', tone: 'up', from: [pzSrc(p)], note: 'kills leave a splat; the next foot on it slips' }),
    steamVent: () => ({ label: 'Steam vents', num: r1(20 / Math.max(1e-6, inp.c('steamVent'))), fmt: 'sec', pre: 'every ', icon: '♨️', tone: 'up', from: inp.pizzas.filter((q) => q.perk === 'steamVent').map(pzSrc), note: 'every diving foot blown back up' }),
    sootAbove: (p) => ({ label: 'Lost in soot', num: p.enhanced ? 3 : 2, fmt: 'sec', icon: '🧹', tone: 'up', from: [pzSrc(p)], note: `feet arriving over ${p.name} can't dive` }),
    mazeLost: (p) => ({ label: 'Lost in the maze', num: p.enhanced ? 3 : 2, fmt: 'sec', pre: '+', icon: '🌀', tone: 'up', from: [pzSrc(p)], note: `feet that stomp ${p.name} dive later, in another lane` }),
    sirenSong: () => ({ label: "Siren's song", num: r1(25 / Math.max(1e-6, inp.c('sirenSong'))), fmt: 'sec', pre: 'every ', icon: '🧜', tone: 'up', from: inp.pizzas.filter((q) => q.perk === 'sirenSong').map(pzSrc), note: 'every foot enchanted 1.5s (bosses slowed)' }),
    harpyGust: (p) => ({ label: 'Harpy gust', num: p.enhanced ? 150 : 100, fmt: 'int', post: 'px', icon: '🪶', tone: 'up', from: [pzSrc(p)], note: `every 5s, feet over ${p.name} blown back up` }),
    whirlpool: () => ({ label: 'Whirlpool', num: pct(Math.min(0.4, 0.1 * inp.c('whirlpool'))), fmt: 'pct', icon: '🌊', tone: 'up', from: inp.pizzas.filter((q) => q.perk === 'whirlpool').map(pzSrc), note: 'of smacks stun the foot 1.5s' }),
    disarm: (p) => ({ label: 'Disarm', num: p.enhanced ? 5 : 3, fmt: 'sec', icon: '🫒', tone: 'up', from: [pzSrc(p)], note: 'smacked feet above lose their trait' }),
  };
  const seenCc = new Set<PizzaPerk>();
  for (const p of inp.pizzas) {
    if (!p.perk || !perkCc[p.perk]) continue;
    if ((p.perk === 'timeStop' || p.perk === 'danceBeat' || p.perk === 'steamVent' || p.perk === 'sirenSong' || p.perk === 'whirlpool') && seenCc.has(p.perk)) continue;
    seenCc.add(p.perk);
    cc.push(perkCc[p.perk]!(p));
  }
  if (lv('coldfeet')) cc.push({ label: 'Cold Feet', num: 5, fmt: 'sec', icon: '🧦', tone: 'up', from: [topSrc('coldfeet', 1)], note: 'half speed as each wave starts' });
  sections.push({ id: 'cc', title: 'Crowd control', icon: '🧊', color: '#4cc9f0', sub: 'stuns, slows and shoves', tiles: cc, empty: 'Nothing stuns or slows feet yet.' });

  // Economy
  const eco: Tile[] = [];
  const tipX = st.coinMult * inp.heat.tips;
  eco.push({ label: 'Tips from feet', num: st.coinMult, fmt: 'x', icon: '🪙', tone: tone('coinMult'), from: from('coinMult'), note: [st.coinMult >= TIP_MULT_CAP - 1e-6 ? 'at the ×2.5 cap' : '', inp.heat.tips !== 1 ? `×${r1(tipX)} with ${inp.heat.name}'s tips` : ''].filter(Boolean).join(' · ') || undefined, big: true });
  eco.push({ label: inp.inWave ? 'This wave clear pays' : 'Next wave clear pays', num: inp.clearBonus, fmt: 'int', post: ' tips', icon: '🏁', tone: st.coinsPerWave > 0 ? 'up' : 'flat', from: from('coinsPerWave'), note: `${Math.round(inp.clearBonus * 1.5)} if perfect`, big: true });
  const tunas = inp.pizzas.filter((p) => p.perk === 'wave5Tips');
  if (tunas.length) {
    const boost = inp.boost;
    eco.push({ label: 'Tuna Time', num: Math.round(tunas.reduce((t, p) => t + tunaTips(inp.wave, p.enhanced), 0) * boost), fmt: 'int', post: ' tips', icon: '🐟', tone: 'up', from: tunas.map(pzSrc), note: `at the end of wave ${inp.wave}` });
  }
  // Golden Fleece: bosses and mini-bosses pay more
  const fleece = inp.c('goldenFleece');
  if (fleece > 0) eco.push({ label: 'Boss tips', num: pct(0.5 * fleece), fmt: 'pct', pre: '+', icon: '🐏', tone: 'up', from: inp.pizzas.filter((p) => p.perk === 'goldenFleece').map(pzSrc), note: 'from bosses and mini-bosses' });
  const fritto = inp.c('lossTips');
  if (fritto > 0) eco.push({ label: 'After a lost slice', num: pct(0.12 * fritto), fmt: 'pct', pre: '+', icon: '🦑', tone: inp.lossTips ? 'up' : 'flat', from: inp.pizzas.filter((p) => p.perk === 'lossTips').map(pzSrc), note: inp.lossTips ? `tips ${inp.inWave ? 'this' : 'next'} wave` : 'tips the wave after a slice is lost' });
  const tarte = inp.pizzas.filter((p) => p.perk === 'waveTips');
  if (tarte.length) eco.push({ label: 'Wave start', num: tarte.reduce((t, p) => t + Math.round(6 * p.pk), 0), fmt: 'int', pre: '+', post: ' tips', icon: '🏘️', tone: 'up', from: tarte.map(pzSrc), note: 'as every wave starts' });
  if (st.goldenTouch > 0) eco.push({ label: 'Golden feet', num: pct(st.goldenTouch), fmt: 'pct', icon: '👑', tone: 'up', from: from('goldenTouch'), note: 'of kills pay 5× tips' });
  if (st.quickTips > 0) eco.push({ label: 'Quick kills', num: st.quickTips, fmt: 'int', pre: '+', post: ' tips', icon: '⚡', tone: 'up', from: from('quickTips'), note: 'within 1s of the last' });
  for (const pr of inp.procs) {
    const tp = pr.p.fx.find((e): e is Extract<Effect, { e: 'tips' }> => e.e === 'tips');
    const u = UPGRADE_BY_ID[pr.id];
    if (!tp || !u) continue;
    const t = pr.p.trigger;
    eco.push({ label: u.name, num: Math.round(tp.n * inp.heat.tips), fmt: 'int', pre: '+', post: ' tips', icon: u.icon, tone: 'up', from: [topSrc(u.id, pr.lvl)], note: t.t === 'kill' ? `${pct(t.p)}% of kills` : t.t === 'wave' ? 'each wave' : t.t === 'every' ? `every ${r1(t.sec)}s` : 'sometimes' });
  }
  if (st.luck > 0) eco.push({ label: 'Luck', num: st.luck, fmt: 'int', pre: '+', icon: '🍀', tone: 'up', from: from('luck'), note: 'rarer cards, more golden feet' });
  if (st.freeRerolls > 0) eco.push({ label: 'Free rerolls', num: st.freeRerolls, fmt: 'int', icon: '🎲', tone: 'up', from: from('freeRerolls'), note: 'every shop' });
  if (st.shopDiscount !== 0) eco.push({ label: st.shopDiscount > 0 ? 'Topping discount' : 'Topping surcharge', num: pct(Math.abs(Math.min(0.6, st.shopDiscount))), fmt: 'pct', icon: '🏷️', tone: tone('shopDiscount'), from: from('shopDiscount') });
  if (st.consumableDiscount > 0) eco.push({ label: 'One-use discount', num: pct(st.consumableDiscount), fmt: 'pct', icon: '🧇', tone: 'up', from: from('consumableDiscount') });
  if (st.counterDiscount > 0 || st.counterMult !== 1) eco.push({ label: 'Pizza counter', num: (1 - st.counterDiscount) * st.counterMult, fmt: 'x', icon: '🍕', tone: (1 - st.counterDiscount) * st.counterMult <= 1 ? 'up' : 'down', from: from('counterDiscount', 'counterMult'), note: 'prices' });
  if (st.rerollLess > 0 || st.rerollMult !== 1) eco.push({ label: 'Rerolls', num: st.rerollMult, fmt: 'x', icon: '🔄', tone: st.rerollMult > 1 ? 'down' : 'up', from: from('rerollLess', 'rerollMult'), note: st.rerollLess ? `${st.rerollLess} tips off each` : undefined });
  if (st.cardDelta !== 0) eco.push({ label: 'Cards per shop', num: Math.abs(st.cardDelta), fmt: 'int', pre: st.cardDelta > 0 ? '+' : '−', icon: '🃏', tone: tone('cardDelta'), from: from('cardDelta') });
  if (st.goldenDiscount > 0) eco.push({ label: 'Golden Menu off', num: pct(st.goldenDiscount), fmt: 'pct', icon: '🎫', tone: 'up', from: from('goldenDiscount') });
  if (st.crustBonus > 0 || st.endCrustMult > 0) eco.push({ label: 'End-of-run crusts', num: pct(st.crustBonus + st.endCrustMult), fmt: 'pct', pre: '+', icon: '🥧', tone: 'up', from: from('crustBonus', 'endCrustMult') });
  if (st.scoreMult !== 1) eco.push({ label: 'Score', num: st.scoreMult, fmt: 'x', icon: '⭐', tone: tone('scoreMult'), from: from('scoreMult') });
  if (st.comboBonus !== 0) eco.push({ label: 'Combo window', num: COMBO_BASE_WINDOW + st.comboBonus, fmt: 'sec', icon: '⏲️', tone: tone('comboBonus'), from: from('comboBonus') });
  if (st.eventTips > 0) eco.push({ label: 'Event tips', num: pct(st.eventTips), fmt: 'pct', pre: '+', icon: '💰', tone: 'up', from: from('eventTips') });
  if (st.noEvents) eco.push({ label: 'Wave events', num: 0, fmt: 'text', text: 'OFF', icon: '🚫', tone: 'down', from: from('noEvents') });
  else if (st.eventAlways || st.eventMult !== 1) eco.push({ label: 'Wave events', num: st.eventMult, fmt: st.eventAlways ? 'text' : 'x', text: st.eventAlways ? 'EVERY WAVE' : undefined, icon: '🎪', tone: st.eventAlways || st.eventMult > 1 ? 'up' : 'down', from: from('eventMult', 'eventAlways') });
  if (st.shinyMult !== 1) eco.push({ label: 'Shiny feet', num: st.shinyMult, fmt: 'x', icon: '✨', tone: 'up', from: from('shinyMult', 'shinyCrusts'), note: st.shinyCrusts ? `${st.shinyCrusts} crusts each` : undefined });
  sections.push({ id: 'eco', title: 'Economy', icon: '🪙', color: '#ffbf1f', sub: 'tips, coins and crusts', tiles: eco });

  // Sustain
  const sus: Tile[] = [];
  const regrow = st.regenPerWave + st.regenAll;
  if (regrow > 0) sus.push({ label: 'Regrowth each wave', num: regrow, fmt: 'int', pre: '+', post: regrow === 1 ? ' slice' : ' slices', icon: '🌱', tone: 'up', from: from('regenPerWave', 'regenAll'), note: 'on every pizza', big: true });
  if (st.healWeakest > 0) sus.push({ label: 'Patch the weakest', num: st.healWeakest, fmt: 'int', pre: '+', post: st.healWeakest === 1 ? ' slice' : ' slices', icon: '🩹', tone: 'up', from: from('healWeakest'), note: 'after each wave', big: true });
  const perkShield = inp.pizzas.filter((p) => p.perk === 'shield');
  if (st.shields > 0 || perkShield.length) sus.push({ label: 'Stomp shields', num: st.shields, fmt: 'int', post: ' each', icon: '🧀', tone: tone('shields'), from: [...from('shields'), ...perkShield.map(pzSrc)], note: `every pizza, every wave${perkShield.length ? ' · +1 on Quattro Formaggi' : ''}${lv('crustarmour') ? ` · +${lv('crustarmour')} in boss waves` : ''}` });
  if (st.shrugChance > 0) sus.push({ label: 'Shrug off a stomp', num: pct(st.shrugChance), fmt: 'pct', icon: '🧱', tone: 'up', from: from('shrugChance') });
  if (st.traps > 0) sus.push({ label: 'Mousetraps', num: Math.round(100 * auto * g), fmt: 'int', icon: '🪤', tone: 'up', from: from('traps'), note: `${st.traps} under every pizza each wave, + stun` });
  if (st.stompBurn > 0) sus.push({ label: 'Stompers burn', num: st.stompBurn * auto * g, fmt: 'int', post: '/s', icon: '♨️', tone: 'up', from: from('stompBurn') });
  if (st.stompExtra > 0) sus.push({ label: 'Extra slice lost', num: pct(st.stompExtra), fmt: 'pct', icon: '💔', tone: 'down', from: from('stompExtra'), note: 'chance on each stomp' });
  if (inp.heat.freshness > 0 && st.freshBonus !== 0) sus.push({ label: 'Freshness', num: Math.abs(st.freshBonus), fmt: 'int', pre: st.freshBonus > 0 ? '+' : '−', icon: '🧊', tone: tone('freshBonus'), from: from('freshBonus'), note: 'on every pizza' });
  const sand = inp.pizzas.filter((p) => p.perk === 'sandWall');
  if (sand.length) sus.push({ label: 'Sand wall', num: sand.reduce((n, p) => n + (p.enhanced ? 3 : 2), 0), fmt: 'int', post: ' stomps', icon: '🏰', tone: 'up', from: sand.map(pzSrc), note: 'blocked each wave, on any pizza' });
  const waltz = inp.c('ghostAlly');
  if (waltz > 0) sus.push({ label: 'Friendly ghosts', num: pct(Math.min(0.6, 0.15 * waltz)), fmt: 'pct', icon: '👻', tone: 'up', from: inp.pizzas.filter((p) => p.perk === 'ghostAlly').map(pzSrc), note: `of kills rise; each blocks a stomp${inp.ghosts ? ` (${inp.ghosts} on guard)` : ''}` });
  for (const p of inp.pizzas) if (p.perk === 'halfStomp') sus.push({ label: 'Half-slice stomps', num: p.enhanced ? 2 : 1, fmt: 'int', post: ' a wave', icon: '🧀', tone: 'up', from: [pzSrc(p)], note: `the first on ${p.name} take half a slice` });
  for (const p of inp.pizzas) if (p.perk === 'regen') sus.push({ label: 'Regrows a slice', num: p.enhanced ? 13 : 20, fmt: 'sec', pre: 'every ', icon: '🥗', tone: 'up', from: [pzSrc(p)], note: p.name });
  for (const pr of inp.procs) {
    const e = pr.p.fx.find((x) => x.e === 'heal' || x.e === 'shield');
    const u = UPGRADE_BY_ID[pr.id];
    if (!e || !u || (e.e !== 'heal' && e.e !== 'shield')) continue;
    sus.push({ label: u.name, num: e.n, fmt: 'int', pre: '+', post: e.e === 'heal' ? ' slice' : ' shield', icon: u.icon, tone: 'up', from: [topSrc(u.id, pr.lvl)], note: `each wave · ${e.who === 'all' ? 'every pizza' : 'the weakest pizza'}` });
  }
  for (const id of inp.armed) {
    const u = UPGRADE_BY_ID[id];
    if (u) sus.push({ label: u.name, num: 0, fmt: 'text', text: 'READY', icon: u.icon, tone: 'up', from: [topSrc(id, 1)], note: u.desc(1) });
  }
  sections.push({ id: 'sustain', title: 'Sustain', icon: '💚', color: '#3f9a2e', sub: 'heals, regrowth and protection', tiles: sus, empty: 'Nothing heals or shields your pizzas yet. Slow Proof, Mozzarella Shield and friends would show here.' });

  // Peel and super
  const ps: Tile[] = [];
  const meterTiles = usesMeter;
  if (meterTiles) {
    ps.push({ label: a ? a.name : 'Peel Slam', num: slamHit, fmt: 'int', icon: '🏓', img: a ? inp.peel.img : undefined, tone: 'up', from: a ? [{ key: 'peel', name: inp.peel.name, img: inp.peel.img, tone: 'up', tip: describeAbility(a) }] : from('damage'), note: a ? (slamHit > 0 ? 'damage per fire, as written' : describeAbility(a)) : 'to every foot on screen', big: true });
    ps.push({ label: 'Meter per smack', num: meterPerHit * hits * 100, fmt: 'dec', post: '%', icon: '🔋', tone: tone('superGain'), from: from('superGain'), note: `full in about ${smacksToFill} smacks${fillSec ? ` · ${Math.round(fillSec)}s at your pace` : ''}`, big: true });
    if (st.superStart > 0) ps.push({ label: 'Starts each wave', num: pct(Math.min(1, st.superStart)), fmt: 'pct', icon: '🍫', tone: 'up', from: from('superStart'), note: 'charged' });
    if (inp.inWave) ps.push({ label: 'Meter now', num: pct(inp.meter), fmt: 'pct', icon: '⚡', tone: 'flat', from: [] });
  } else if (a) {
    ps.push({ label: a.name, num: 0, fmt: 'text', text: a.trigger.t === 'always' ? 'ALWAYS ON' : a.trigger.t === 'every' ? `EVERY ${r1(a.trigger.sec / passiveBoost(st.superGain).timer)}s` : 'PASSIVE', icon: '✨', img: inp.peel.img, tone: 'up', from: [{ key: 'peel', name: inp.peel.name, img: inp.peel.img, tone: 'up', tip: describeAbility(a) }], note: describeAbility(a), big: true });
    if (st.superGain !== 1 && (a.trigger.t === 'every' || a.trigger.t === 'smack' || a.trigger.t === 'kill')) ps.push({ label: a.trigger.t === 'every' ? 'Fires faster' : 'More likely', num: a.trigger.t === 'every' ? passiveBoost(st.superGain).timer : passiveBoost(st.superGain).chance, fmt: 'x', icon: '🔋', tone: tone('superGain'), from: from('superGain') });
  }
  if (a && meterTiles) ps.push({ label: 'What it does', num: 0, fmt: 'text', text: a.trigger.t === 'auto' ? 'AUTO' : 'ACTIVE', icon: '📜', tone: 'flat', from: [], note: describeAbility(a) });
  if (inp.hero.smack !== 1) ps.push({ label: 'Hero smacks', num: inp.hero.smack, fmt: 'x', icon: '🦸', tone: inp.hero.smack > 1 ? 'up' : 'down', from: [{ key: 'peel', name: inp.peel.name, img: inp.peel.img, tone: 'up' }] });
  if (inp.hero.reach !== 1) ps.push({ label: 'Hero reach', num: inp.hero.reach, fmt: 'x', icon: '📏', tone: inp.hero.reach > 1 ? 'up' : 'down', from: [{ key: 'peel', name: inp.peel.name, img: inp.peel.img, tone: 'up' }] });
  if (inp.hero.meter !== 1) ps.push({ label: 'Hero meter', num: inp.hero.meter, fmt: 'x', icon: '🔋', tone: inp.hero.meter > 1 ? 'up' : 'down', from: [{ key: 'peel', name: inp.peel.name, img: inp.peel.img, tone: 'up' }] });
  sections.push({ id: 'peel', title: 'Peel and super', icon: '🏓', color: '#b06bff', sub: inp.peel.name, tiles: ps });

  const pizzas: PerkCard[] = inp.pizzas.map((p) => ({
    id: p.id,
    name: p.name,
    slices: p.slices,
    max: p.max,
    line: p.line,
    enhanced: p.enhanced,
    status: p.dead ? 'toast' : p.stale ? 'stale' : p.frozen ? 'frozen' : null,
    note: perkNote(p, inp, dmg * g, auto),
    stale: p.stale,
    dead: p.dead,
  }));

  return {
    perSmack,
    smackExtras,
    pace,
    paceFrom,
    smackDps,
    autoDps,
    momentumFloor: inp.heat.momentumFloor,
    autoWaiting,
    total: totalDps,
    measured,
    bars,
    barsLabel,
    sections,
    pizzas,
    heat: inp.heat.name,
    feet: feetAround,
    feetMeasured: !!span && span.feetSec > 0,
  };
}

/** A topping as a "from:" chip: its icon, name and level, and its text at that level. */
export function topSrc(id: string, lvl: number): Src {
  const u = UPGRADE_BY_ID[id];
  const l = Math.max(1, lvl);
  return { key: `top:${id}`, name: u ? `${u.name}${u.max > 1 ? ` LV${l}` : ''}` : id, icon: u?.icon, tone: 'up', tip: u ? `${u.desc(l)}${u.downside ? ` · ▼ ${u.downside}` : ''}` : undefined };
}

/** A line on what a pizza's perk is worth right now, where there's a number to give. */
function perkNote(p: TablePizza, inp: BuildInput, dmg: number, auto: number): string | undefined {
  if (p.dead) return 'Destroyed: its perk is gone';
  if (p.stale) return 'Stale: its perk is off until it is reheated';
  if (p.frozen) return 'Frozen: its perk is off for a moment';
  switch (p.perk) {
    case 'wave5Tips':
      return inp.boost > 1 ? `With Napoletana: ${Math.round(tunaTips(inp.wave, p.enhanced) * inp.boost)} tips this wave` : undefined;
    case 'meteor':
      return `Meteors hit for ${Math.round(3 * dmg)}, one every ${r1(15 / Math.max(1e-6, inp.c('meteor')))}s`;
    case 'orbitRing':
      return `Rings hit for ${Math.round(dmg * auto)}`;
    case 'erupt':
      return `Its eruption would deal ${Math.round(dmg * (p.enhanced ? 15 : 10))} to every foot`;
    case 'fireLane':
      return `Dragon fire: ${Math.round(dmg)} down the lane, then a ${Math.round(dmg * 0.5)}/s burn`;
    case 'meatball':
      return `Meatballs hit for ${Math.round(dmg * p.pk * auto)}`;
    case 'varietyDmg':
      return `+${Math.round(5 * inp.c('varietyDmg') * new Set(inp.pizzas.filter((q) => !q.dead).map((q) => q.id)).size)}% damage now`;
    default:
      return undefined;
  }
}
