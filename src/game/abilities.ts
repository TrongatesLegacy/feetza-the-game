// Peel abilities: every peel but the Classic has its own, used in place of the Peel Slam.
// Shiny peels share their base peel's ability. Abilities are built from shared triggers and effects
// so the game can run (and describe) all of them the same way.
//
// Damage is in "smacks": ×1 is one smack at your current damage, so abilities grow with your toppings.

import type { Stats } from '../data/upgrades';
import { slamPrompt } from '../systems/gamepad';

export type Target =
  | { to: 'all' }
  /** Feet within r of the peel. */
  | { to: 'peel'; r: number }
  /** The foot that set it off (the one smacked, killed or stomping), and anything within r of it. */
  | { to: 'hit'; r?: number }
  | { to: 'random'; n: number }
  /** The feet closest to the pizzas. */
  | { to: 'front'; n: number }
  /** The healthiest feet (bosses first). */
  | { to: 'toughest'; n: number }
  /** Feet within r of any pizza. */
  | { to: 'pizzas'; r: number }
  /** Blasts: pick n feet (random, front-most or toughest) and hit everything within r of each. */
  | { to: 'blast'; n: number; r: number; pick: 'random' | 'front' | 'toughest' };

type NumStat = { [K in keyof Stats]: Stats[K] extends number ? K : never }[keyof Stats];

export type Effect =
  | { e: 'dmg'; x: number; at: Target; knock?: number }
  | { e: 'burn'; x: number; sec: number; at: Target }
  | { e: 'slow'; pct: number; sec: number; at: Target }
  | { e: 'stun'; sec: number; at: Target; freeze?: boolean }
  | { e: 'knock'; px: number; at: Target }
  | { e: 'mark'; mult: number; sec: number; at: Target }
  | { e: 'chain'; x: number; jumps: number; at: Target }
  | { e: 'execute'; below: number; at: Target }
  | { e: 'heal'; n: number; who: 'weakest' | 'all' }
  | { e: 'shield'; n: number; who: 'weakest' | 'all' }
  | { e: 'fresh'; n: number; who: 'weakest' | 'all' }
  | { e: 'tips'; n: number }
  | { e: 'stat'; mods: Partial<Record<NumStat, number>> }
  /** A hand-built move (hero signature moves, src/game/heroMoves.ts): the scene's hero director runs it by id. */
  | { e: 'move'; id: string }
  | ThrowFx;

/** How a thrown prop flies (see src/game/projectiles.ts). */
export type ThrowHow = 'lob' | 'straight' | 'bounce' | 'pierce' | 'ricochet' | 'boomerang' | 'explode' | 'stick' | 'split' | 'roll' | 'beam';

/** A drawn prop thrown from the peel's head: one per foot `at` picks. Its hit lands when it arrives. */
export interface ThrowFx {
  e: 'throw';
  /** Prop key in THROW_PROPS (art: t_<prop> in src/content/props/throws.ts). */
  prop: ThrowProp;
  how: ThrowHow;
  /** First hit, in smacks (0: no damage, just its riders). */
  x: number;
  at: Target;
  /** Bounce, ricochet and boomerang: the later hits, in smacks each. */
  more?: number[];
  /** Explode: blast radius. Roll: half-height of the lane it rolls through. */
  r?: number;
  /** Explode: smacks dealt to the other feet in the blast. */
  splash?: number;
  knock?: number;
  /** Stick: seconds the prop stays on the foot. */
  stick?: number;
  /** Stick: seconds the foot can't see (its next stomp misses). */
  blind?: number;
  /** Ropes every foot it hits together for this many seconds (the lasso). */
  tether?: number;
  /** Riders on every foot it hits (their target is that foot). */
  on?: Effect[];
}

/** Every prop that can be thrown: [one, many] for the descriptions. */
export const THROW_PROPS = {
  tomato: ['tomato slice', 'tomato slices'],
  toenail: ['toenail clipping', 'toenail clippings'],
  polish: ['blob of nail polish', 'blobs of nail polish'],
  coin: ['stolen coin', 'stolen coins'],
  crust: ['crust chunk', 'crust chunks'],
  plate: ['plate', 'plates'],
  duck: ['rubber duck', 'rubber ducks'],
  ring: ['life ring', 'life rings'],
  pineapple: ['pineapple ring', 'pineapple rings'],
  spinach: ['can of spinach', 'cans of spinach'],
  grenade: ['pepper grenade', 'pepper grenades'],
  square: ['square slice', 'square slices'],
  dumbbell: ['dumbbell', 'dumbbells'],
  dough: ['sticky dough ball', 'sticky dough balls'],
  rattle: ['rattle', 'rattles'],
  football: ['football', 'footballs'],
  bowling: ['bowling ball', 'bowling balls'],
  cannon: ['cannonball', 'cannonballs'],
  flatbread: ['flatbread', 'flatbreads'],
  pie: ['cream pie', 'cream pies'],
  olive: ['olive', 'olives'],
  clutter: ['piece of clutter', 'pieces of clutter'],
  coconut: ['coconut', 'coconuts'],
  lasso: ['lasso', 'lassos'],
  skateboard: ['skateboard', 'skateboards'],
  // topping throws (src/content/props/toppings3.ts)
  anchovy: ['anchovy', 'anchovies'],
  meatball: ['meatball', 'meatballs'],
  pizzacutter: ['pizza cutter', 'pizza cutters'],
  calzone: ['calzone', 'calzones'],
  napkin: ['napkin', 'napkins'],
  wheelcutter: ['rolling cutter', 'rolling cutters'],
  // hero props (src/content/props/heroes.ts)
  wingrang: ['wing-boomerang', 'wing-boomerangs'],
  shield: ['star shield', 'star shields'],
  arrow: ['trick arrow', 'trick arrows'],
  card: ['playing card', 'playing cards'],
  bolt: ['blaster bolt', 'blaster bolts'],
  rocket: ['rocket', 'rockets'],
  crescent: ['crescent dart', 'crescent darts'],
  // god props (src/content/props/gods.ts)
  hammer: ['thunder hammer', 'thunder hammers'],
} as const;
export type ThrowProp = keyof typeof THROW_PROPS;

export type Trigger =
  /** Charge the meter, then fire it (Space, the controller's slam button, or a tap on the meter). */
  | { t: 'active' }
  /** Fires by itself when the meter fills. */
  | { t: 'auto' }
  | { t: 'every'; sec: number }
  | { t: 'smack'; p: number }
  | { t: 'kill'; p: number }
  /** When a foot stomps a pizza. */
  | { t: 'stomp' }
  /** At the start of every wave. */
  | { t: 'wave' }
  /** Always on: changes your stats. */
  | { t: 'always' };

export type Vfx = 'burst' | 'frost' | 'fire' | 'zap' | 'rain' | 'heal' | 'gold' | 'ink' | 'wind' | 'slam';

export interface Ability {
  name: string;
  trigger: Trigger;
  fx: Effect[];
  /** A second, passive part (the throwing peels keep their ability and add a throw). */
  also?: { trigger: Trigger; fx: Effect[] };
  /** Meter speed for active and auto abilities (1 = the Peel Slam's). */
  charge: number;
  color: number;
  vfx: Vfx;
  /** Hand-written description (hero peels): replaces the generated one. `{slam}` becomes the meter prompt. */
  desc?: string;
  /** Hand-built peels (heroes) stage their own big moment, so the generic flash and shout are skipped. */
  custom?: boolean;
}

export function isPassive(a: Ability): boolean {
  return a.trigger.t !== 'active';
}

export function usesMeter(a: Ability): boolean {
  return a.trigger.t === 'active' || a.trigger.t === 'auto';
}

// ——— builders ———
const all: Target = { to: 'all' };
const peel = (r = 220): Target => ({ to: 'peel', r });
const hit = (r?: number): Target => ({ to: 'hit', r });
const rnd = (n: number): Target => ({ to: 'random', n });
const front = (n: number): Target => ({ to: 'front', n });
const tough = (n: number): Target => ({ to: 'toughest', n });
const nearP = (r = 200): Target => ({ to: 'pizzas', r });
const BL = (n: number, r: number, pick: 'random' | 'front' | 'toughest' = 'random'): Target => ({ to: 'blast', n, r, pick });

const D = (x: number, at: Target, knock?: number): Effect => ({ e: 'dmg', x, at, knock });
const B = (x: number, sec: number, at: Target): Effect => ({ e: 'burn', x, sec, at });
const S = (pct: number, sec: number, at: Target): Effect => ({ e: 'slow', pct, sec, at });
const ST = (sec: number, at: Target): Effect => ({ e: 'stun', sec, at });
const FZ = (sec: number, at: Target): Effect => ({ e: 'stun', sec, at, freeze: true });
const K = (px: number, at: Target): Effect => ({ e: 'knock', px, at });
const M = (mult: number, sec: number, at: Target): Effect => ({ e: 'mark', mult, sec, at });
const C = (x: number, jumps: number, at: Target = hit()): Effect => ({ e: 'chain', x, jumps, at });
const EX = (below: number, at: Target): Effect => ({ e: 'execute', below, at });
const H = (n: number, who: 'weakest' | 'all' = 'weakest'): Effect => ({ e: 'heal', n, who });
const SH = (n: number, who: 'weakest' | 'all' = 'weakest'): Effect => ({ e: 'shield', n, who });
const FR = (n: number, who: 'weakest' | 'all' = 'all'): Effect => ({ e: 'fresh', n, who });
const T = (n: number): Effect => ({ e: 'tips', n });
const STAT = (mods: Partial<Record<NumStat, number>>): Effect => ({ e: 'stat', mods });
/** Throw a prop: TH('tomato', 'bounce', 2, rnd(1), { more: [1.5, 1] }). */
const TH = (prop: ThrowProp, how: ThrowHow, x: number, at: Target, opts: Omit<ThrowFx, 'e' | 'prop' | 'how' | 'x' | 'at'> = {}): ThrowFx => ({ e: 'throw', prop, how, x, at, ...opts });

/** Builders shared with the topping procs. */
export const P = { all, peel, hit, rnd, front, tough, nearP, BL, D, B, S, ST, FZ, K, M, C, EX, H, SH, FR, T, STAT, TH };

const act: Trigger = { t: 'active' };
const auto: Trigger = { t: 'auto' };
const every = (sec: number): Trigger => ({ t: 'every', sec });
const smack = (p: number): Trigger => ({ t: 'smack', p });
const kill = (p: number): Trigger => ({ t: 'kill', p });
const stomp: Trigger = { t: 'stomp' };
const wave: Trigger = { t: 'wave' };
const always: Trigger = { t: 'always' };

export const TRIG = {
  every: (sec: number): Trigger => ({ t: 'every', sec }),
  smack: (p: number): Trigger => ({ t: 'smack', p }),
  kill: (p: number): Trigger => ({ t: 'kill', p }),
  stomp: { t: 'stomp' } as Trigger,
  wave: { t: 'wave' } as Trigger,
};

/** A topping proc: an ability-style trigger and effects, scaled by the topping's level. */
export interface Proc {
  trigger: Trigger;
  fx: Effect[];
  color: number;
  vfx: Vfx;
}

/** Level scaling for topping procs: +50% effect per extra level, more often, a little longer. */
export function scaleProc(p: Proc, lvl: number): Proc {
  if (lvl <= 1) return p;
  const k = 1 + 0.5 * (lvl - 1);
  const more = 1 + 0.25 * (lvl - 1);
  const trig: Trigger =
    p.trigger.t === 'smack' || p.trigger.t === 'kill'
      ? { ...p.trigger, p: Math.min(0.9, +(p.trigger.p * more).toFixed(2)) }
      : p.trigger.t === 'every'
        ? { t: 'every', sec: +(p.trigger.sec / (1 + 0.2 * (lvl - 1))).toFixed(1) }
        : p.trigger;
  const fx = p.fx.map((e): Effect => {
    switch (e.e) {
      case 'dmg':
      case 'burn':
      case 'chain':
        return { ...e, x: +(e.x * k).toFixed(2) };
      case 'mark':
        return { ...e, mult: +(1 + (e.mult - 1) * k).toFixed(2) };
      case 'slow':
        return { ...e, pct: Math.min(0.8, +(e.pct * (1 + 0.2 * (lvl - 1))).toFixed(2)) };
      case 'stun':
        return { ...e, sec: +(e.sec * more).toFixed(1) };
      case 'tips':
        return { ...e, n: Math.round(e.n * k) };
      case 'throw':
        return {
          ...e,
          x: +(e.x * k).toFixed(2),
          more: e.more?.map((m) => +(m * k).toFixed(2)),
          splash: e.splash === undefined ? undefined : +(e.splash * k).toFixed(2),
          on: e.on?.map((r) => scaleProc({ trigger: p.trigger, fx: [r], color: p.color, vfx: p.vfx }, lvl).fx[0]),
        };
      default:
        return e;
    }
  });
  return { ...p, trigger: trig, fx };
}

/** Short form for topping cards: "Every 8s: hit 3 random feet and nearby for 5×, then burn them (1×/s, 3s)." (× = your smack damage) */
export function describeProc(p: Proc): string {
  const sameAt = (a: Effect, b: Effect | undefined) => !!b && 'at' in a && 'at' in b && JSON.stringify(a.at) === JSON.stringify(b.at);
  const parts = p.fx.map((f, i) => shortEffect(f, sameAt(f, p.fx[i - 1])));
  return `${shortTrigger(p.trigger)}: ${parts.join(', then ')}.`;
}

function shortWho(t: Target): string {
  switch (t.to) {
    case 'all':
      return 'every foot';
    case 'peel':
      return 'feet near the peel';
    case 'hit':
      return t.r ? 'it and nearby feet' : 'it';
    case 'random':
      return t.n === 1 ? 'a random foot' : `${t.n} random feet`;
    case 'front':
      return t.n === 1 ? 'the front foot' : `the ${t.n} front feet`;
    case 'toughest':
      return t.n === 1 ? 'the toughest foot' : `the ${t.n} toughest feet`;
    case 'pizzas':
      return 'feet near pizzas';
    case 'blast':
      return `${t.n === 1 ? (t.pick === 'front' ? 'the front foot' : t.pick === 'toughest' ? 'the toughest foot' : 'a random foot') : `${t.n} ${t.pick === 'front' ? 'front' : t.pick === 'toughest' ? 'toughest' : 'random'} feet`} and nearby`;
  }
}

function shortEffect(f: Effect, same: boolean): string {
  const w = (t: Target) => (same ? 'them' : shortWho(t));
  switch (f.e) {
    case 'dmg':
      return `hit ${w(f.at)} for ${fmtX(f.x)}${f.knock && f.knock > 300 ? ' with knockback' : ''}`;
    case 'burn':
      return `burn ${w(f.at)} (${fmtX(f.x)}/s, ${sec(f.sec)})`;
    case 'slow':
      return `slow ${w(f.at)} ${Math.round(f.pct * 100)}% (${sec(f.sec)})`;
    case 'stun':
      return `${f.freeze ? 'freeze' : 'stun'} ${w(f.at)} ${sec(f.sec)}`;
    case 'knock':
      return `knock ${w(f.at)} back`;
    case 'mark':
      return `mark ${w(f.at)}: ${fmtX(f.mult)} damage taken (${sec(f.sec)})`;
    case 'chain':
      return `chain lightning from ${w(f.at)} to ${f.jumps} more (${fmtX(f.x)})`;
    case 'throw':
      return throwText(f, true);
    default:
      return effectText(f);
  }
}

function shortTrigger(t: Trigger): string {
  switch (t.t) {
    case 'every':
      return `Every ${sec(t.sec)}`;
    case 'smack':
      return `${Math.round(t.p * 100)}% of smacks`;
    case 'kill':
      return `${Math.round(t.p * 100)}% of kills`;
    case 'stomp':
      return 'On a stomp';
    case 'wave':
      return 'Each wave';
    default:
      return triggerText(t);
  }
}

const RED = 0xff5a3c;
const ORANGE = 0xff9f1c;
const GOLD = 0xffd23f;
const GREEN = 0x7be04a;
const CYAN = 0x5fd8ff;
const BLUE = 0x4c7dff;
const PURPLE = 0xa77dff;
const PINK = 0xff7ad9;
const WHITE = 0xffffff;
const BROWN = 0xb07a3a;

function ab(name: string, trigger: Trigger, fx: Effect[], color: number, vfx: Vfx, charge = 1): Ability {
  return { name, trigger, fx, charge, color, vfx };
}

/** A throwing peel: its ability, plus a passive throw. */
function plus(a: Ability, trigger: Trigger, ...fx: Effect[]): Ability {
  return { ...a, also: { trigger, fx } };
}

/** Ability per peel type (shiny peels use their base type's key). */
export const ABILITIES: Record<string, Ability> = {
  // ——— Classic, Golden Crust and jewellery ———
  classic: ab('Peel Slam', act, [D(10, all, 1100)], GOLD, 'slam'),
  marble: ab('Marble Run', act, [D(6, all, 600), ST(2, all)], WHITE, 'burst', 1.1),
  copper: ab('Copper Conductor', smack(0.25), [C(1.2, 3)], ORANGE, 'zap'),
  neon: ab('Neon Pulse', every(5), [D(2.5, all), S(0.3, 2, all)], PINK, 'zap'),
  obsidian: ab('Obsidian Edge', always, [STAT({ critChance: 0.1, critMult: 1 })], PURPLE, 'burst'),
  silver: ab('Silver Lining', wave, [SH(1, 'all'), H(1, 'weakest'), T(15)], WHITE, 'heal'),
  gold: ab('Midas Slam', act, [D(9, all, 1000), T(40)], GOLD, 'gold'),
  ruby: ab('Ruby Rage', kill(0.4), [D(2, hit(180)), B(1, 3, hit(180))], RED, 'fire'),
  sapphire: ab('Sapphire Tide', auto, [D(6, all, 900), S(0.4, 4, all)], BLUE, 'wind', 0.9),
  emerald: ab('Emerald Grove', every(8), [H(1, 'weakest'), D(3, nearP(220))], GREEN, 'heal'),
  amethyst: ab('Amethyst Hex', act, [M(2, 6, all), D(4, all)], PURPLE, 'zap'),
  pearl: ab('Pearl Shell', wave, [SH(2, 'all')], WHITE, 'heal'),
  diamond: ab('Diamond Storm', act, [D(16, all, 1200), ST(1.5, all)], CYAN, 'slam', 0.85),

  // ——— Mastered (prestige): stronger takes on the Crust peels ———
  'master:classic': ab('Grand Peel Slam', act, [D(14, all, 1300), ST(1.5, all)], GOLD, 'slam', 1.15),
  'master:marble': ab('Marble Avalanche', act, [D(9, all, 800), ST(3, all)], WHITE, 'burst', 1.1),
  'master:copper': ab('Tesla Coil', smack(0.4), [C(1.5, 5)], ORANGE, 'zap'),
  'master:neon': ab('Neon Rave', every(3.5), [D(3, all), S(0.35, 2, all)], PINK, 'zap'),
  'master:obsidian': ab('Volcanic Glass', always, [STAT({ critChance: 0.18, critMult: 1.8 })], PURPLE, 'burst'),
  'master:silver': ab('Silver Service', wave, [SH(2, 'all'), H(1, 'all'), T(30)], WHITE, 'heal'),
  'master:gold': ab('King Midas', act, [D(13, all, 1100), T(90)], GOLD, 'gold', 1.1),
  'master:ruby': ab('Heart of Fire', kill(0.6), [D(3, hit(220)), B(1.5, 4, hit(220))], RED, 'fire'),
  'master:sapphire': ab('Tidal Wave', auto, [D(9, all, 1200), S(0.5, 5, all)], BLUE, 'wind', 1),
  'master:emerald': ab('Evergreen', every(6), [H(1, 'all'), D(4, nearP(240))], GREEN, 'heal'),
  'master:amethyst': ab('Grand Hex', act, [M(2.5, 8, all), D(6, all)], PURPLE, 'zap', 1.1),
  'master:pearl': ab('Oyster Fortress', wave, [SH(3, 'all'), FR(1)], WHITE, 'heal'),
  'master:diamond': ab('Forever', act, [D(22, all, 1400), ST(2.5, all)], CYAN, 'slam', 0.9),

  // ——— Ultra-rare event jewels ———
  'ultra:rosegold': ab('Rose Gold Bloom', every(6), [D(3, rnd(3)), T(3)], PINK, 'gold'),
  'ultra:platinum': ab('Platinum Drones', every(2.5), [D(2, front(1)), C(1, 2, front(1))], WHITE, 'zap'),
  'ultra:opal': ab('Fire Opal', smack(0.35), [B(1.4, 4, hit(160)), S(0.25, 2, hit(160))], ORANGE, 'fire'),
  'ultra:goldfeather': ab('Golden Flock', every(4), [D(3, rnd(4)), T(2)], GOLD, 'rain'),
  'ultra:prism': ab('Prism Break', act, [D(12, all, 1000), M(1.6, 6, all), ST(1.5, all)], WHITE, 'slam', 0.95),
  'ultra:blackdiamond': ab('Black Diamond', always, [STAT({ critChance: 0.15, critMult: 1.5, damage: 2 })], PURPLE, 'burst'),
  'ultra:crownjewel': ab('Crown Jewels', act, [D(10, all, 1000), SH(1, 'all'), T(50)], GOLD, 'gold', 0.95),
  'ultra:cosmic': ab('Big Bang', auto, [D(14, all, 1300), ST(2, all)], PURPLE, 'slam', 0.9),

  // ——— Places ———
  'place:trattoria': ab('House Special', wave, [H(1, 'weakest'), T(6)], RED, 'heal'),
  'place:rooftop': ab('Rooftop Lights', every(6), [D(3, rnd(3)), ST(1, rnd(3))], GOLD, 'zap'),
  'place:beach': ab('Rogue Wave', act, [K(1400, all), D(5, all), S(0.4, 3, all)], CYAN, 'wind'),
  'place:diner': ab('Jukebox Hit', act, [D(7, all), ST(2.5, all)], PINK, 'zap'),
  'place:lodge': ab('Cabin Fever', every(7), [FZ(2, front(2)), D(2, front(2))], CYAN, 'frost'),
  'place:space': ab('Zero-G', act, [K(1600, all), ST(3, all)], PURPLE, 'wind', 1.1),
  'place:kitchen': ab('Mise en Place', always, [STAT({ damage: 2, radius: 4 })], WHITE, 'burst'),
  'place:oldtown': ab('Bell Toll', every(9), [D(4, all), ST(0.8, all)], BROWN, 'burst'),
  'place:pier': ab('Sea Spray', smack(0.3), [S(0.35, 3, hit(200)), D(0.8, hit(200))], CYAN, 'wind'),
  'place:rink': ab('Spin Out', act, [D(6, all), ST(2, all), K(800, all)], PINK, 'wind'),
  'place:slopes': ab('Whiteout', auto, [FZ(3, all)], WHITE, 'frost', 1),
  'place:cellar': ab('Dark Cellar', every(5), [D(4, tough(1)), M(1.5, 4, tough(1))], PURPLE, 'ink'),

  // ——— Acts: one for completing each act ———
  'act:1': ab('Grand Opening', wave, [T(12), SH(1, 'weakest')], RED, 'gold'),
  'act:2': ab('Heatwave', every(6), [B(1, 3, rnd(3)), S(0.2, 3, rnd(3))], ORANGE, 'fire'),
  'act:3': ab('Orbit', every(7), [K(1000, front(2)), S(0.4, 3, front(2))], PURPLE, 'wind'),
  'act:4': ab('Comfort Food', wave, [H(1, 'weakest'), FR(1)], 0xf2dfb0, 'heal'),
  'act:5': ab('Riptide', smack(0.25), [S(0.35, 2.5, hit(160)), K(500, hit(160))], CYAN, 'wind'),
  'act:6': ab('Long Night', kill(0.35), [FZ(1.2, hit(170)), D(1, hit(170))], BLUE, 'frost'),
  'act:7': ab('KRAK!', act, [D(8, all, 1000), ST(1.5, all)], GOLD, 'slam'),
  'act:8': ab('Thunderclap', smack(0.2), [C(1.3, 4)], CYAN, 'zap'),
  'act:9': ab('Heroic Labours', always, [STAT({ damage: 2, bossDmg: 0.15 })], WHITE, 'burst'),
  'act:10': ab('Curtain Call', auto, [D(12, all, 1200), ST(2, all), T(20)], GOLD, 'gold', 0.9),

  // ——— Wave events ———
  'event:balloon': ab('Pop!', kill(0.35), [D(1.5, hit(200)), T(1)], RED, 'burst'),
  'event:drone': ab('Air Support', every(3), [D(2, front(1))], CYAN, 'zap'),
  'event:moth': ab('Moth Flame', smack(0.25), [B(1.2, 3, hit(150))], ORANGE, 'fire'),
  'event:seagull': ab('Dive-Bomb', every(5), [D(4, rnd(2)), K(500, rnd(2))], GOLD, 'rain'),
  'event:chest': ab('Treasure Trove', wave, [T(25)], GOLD, 'gold'),
  'event:mimic': ab('Gotcha!', stomp, [D(5, hit()), ST(1.5, hit())], BROWN, 'burst'),
  'event:sighting': ab('Hero Cameo', every(8), [TH('shield', 'ricochet', 2, rnd(1), { more: [2, 2] })], BLUE, 'burst'),

  // ——— Bosses and mini-bosses ———
  'boss:bigfoot': ab('Big Stomp', act, [D(10, all, 1300), ST(0.8, all)], BROWN, 'slam', 0.95),
  'boss:ironheel': ab('Piston Barrage', act, [D(6, rnd(6)), D(4, all)], ORANGE, 'rain'),
  'boss:clownking': ab('Pie Face', every(5), [TH('pie', 'stick', 2, rnd(2), { stick: 2, blind: 3, on: [ST(2, hit())] })], PINK, 'burst'),
  'boss:trex': ab('Extinction Roar', act, [K(1500, all), D(7, all), S(0.3, 4, all)], GREEN, 'wind'),
  'boss:colossus': ab('Earthquake', auto, [D(9, all, 900), ST(1.2, all)], BROWN, 'slam', 0.9),
  'boss:phantomking': ab('Possession', act, [M(2.2, 8, all), D(3, all)], PURPLE, 'ink'),
  'boss:cosmiccroc': ab('Meteor Shower', act, [D(8, rnd(5)), B(1, 3, rnd(5))], ORANGE, 'rain'),
  'boss:nonna': ab("Nonna's Slipper", every(4), [D(4, tough(1)), ST(1, tough(1))], RED, 'burst'),
  'boss:gargoyle': ab('Stone Skin', wave, [SH(2, 'all')], 0xc7ccd4, 'heal'),
  'boss:kraken': ab('Ink Burst', act, [S(0.6, 6, all), D(5, all)], PURPLE, 'ink'),
  'boss:rinkqueen': ab('Triple Axel', act, [D(5, all), D(5, all), K(900, all)], PINK, 'wind'),
  'boss:yeti': ab('Avalanche', act, [FZ(3.5, all), D(6, all)], WHITE, 'frost'),
  'boss:headwaiter': ab('Silver Platter', smack(0.25), [D(1.2, hit(140)), ST(1.2, hit()), T(1)], WHITE, 'burst'),
  'boss:sweep': ab('Clean Sweep', every(7), [K(900, front(4)), D(2, front(4))], BROWN, 'wind'),
  'boss:sandcastle': ab('Moat', wave, [SH(1, 'all'), H(1, 'weakest')], GOLD, 'heal'),
  'boss:shortorder': ab('Order Up!', kill(0.4), [D(2, hit(160)), B(1, 3, hit(160))], ORANGE, 'fire'),
  'boss:iceskate': ab('Black Ice', smack(0.25), [FZ(1.5, hit(140))], CYAN, 'frost'),
  'boss:ufotoe': ab('Tractor Beam', every(6), [K(1200, front(2)), ST(1.5, front(2))], GREEN, 'zap'),
  'boss:doughboy': ab('Rising Dough', always, [STAT({ regenPerWave: 1, shrugChance: 0.08 })], 0xf2dfb0, 'heal'),
  'boss:pigeonking': ab('Pigeon Army', every(3.5), [D(2, rnd(3))], 0x8f93ad, 'rain'),
  'boss:jellyfish': ab('Sting', smack(0.3), [ST(1, hit(150)), D(0.8, hit(150))], PINK, 'zap'),
  'boss:milkshake': ab('Brain Freeze', act, [FZ(3, all), M(1.5, 5, all)], PINK, 'frost'),
  'boss:lumberjack': ab('Timber!', act, [D(14, front(3), 900)], BROWN, 'slam'),
  'boss:poltergeist': ab('Grave Shove', every(5), [K(800, rnd(3)), D(2.5, rnd(3))], PURPLE, 'ink'),

  // ——— The God Peel (src/game/peels.ts): its move and passive are in src/game/godMoves.ts ———
  'god:pizzagods': {
    name: 'Divine Feast',
    trigger: act,
    fx: [{ e: 'move', id: 'divineFeast' }],
    charge: 0.8,
    color: GOLD,
    vfx: 'gold',
    custom: true,
    desc: 'Active ({slam}): a golden peel sweeps down from the heavens. Every foot takes ×25, is stunned for 3 s and burns (2×/s for 4 s); then every pizza gets 2 shields and a slice back, and you get +50 tips. Passive, Pantheon: every 3 s it throws a projectile borrowed at random from the throwing peels, at ×2.',
  },

  // ——— Feet ———
  'foot:bob': plus(ab('Barefoot Basics', always, [STAT({ damage: 2 })], 0xf0c8a0, 'burst'), every(5), TH('toenail', 'pierce', 1.5, front(1))),
  'foot:patty': plus(ab('Fresh Polish', always, [STAT({ critChance: 0.08 })], PINK, 'burst'), every(6), TH('polish', 'stick', 1, tough(1), { stick: 4, on: [M(1.5, 4, hit())] })),
  'foot:sock': ab('Soggy Socks', smack(0.3), [S(0.35, 2.5, hit(130))], 0xd8e8f0, 'wind'),
  'foot:baby': ab('Tiny Tantrum', every(4), [TH('rattle', 'bounce', 1.5, rnd(2), { more: [1.5] })], PINK, 'burst'),
  'foot:flipflop': ab('Flip-Flop Slap', smack(0.2), [D(1, hit()), D(1, hit())], CYAN, 'burst'),
  'foot:tina': ab('Little Piggies', every(5), [D(1.4, rnd(5))], PINK, 'rain'),
  'foot:harold': ab('Hair Trigger', smack(0.25), [B(1, 3, hit(140))], BROWN, 'fire'),
  'foot:sneaker': ab('Fresh Kicks', kill(0.3), [D(1.5, hit(160))], RED, 'burst'),
  'foot:stan': ab('Stink Cloud', every(6), [D(2, peel(260)), S(0.25, 2, peel(260))], GREEN, 'ink'),
  'foot:bella': ab('Pirouette', act, [D(6, all), K(900, all)], PINK, 'wind'),
  'foot:boot': ab('Steel Toe', always, [STAT({ knockback: 120, damage: 1 })], 0x8a929e, 'burst'),
  'foot:cowboy': ab('Lasso', every(6), [TH('lasso', 'bounce', 0, front(1), { more: [0], tether: 2, on: [ST(2, hit())] })], BROWN, 'wind'),
  'foot:skate': ab('Cold Shoulder', smack(0.2), [FZ(1.2, hit())], CYAN, 'frost'),
  'foot:flipper': ab('Bubble Net', act, [S(0.5, 5, all), D(4, all)], CYAN, 'wind'),
  'foot:clown': ab('Honk!', act, [ST(3, all)], PINK, 'burst', 1.1),
  'foot:ghost': ab('Spooky', every(7), [M(1.6, 4, rnd(3))], PURPLE, 'ink'),
  'foot:zombie': ab('Undead Pizza', stomp, [H(1, 'weakest'), D(2, hit(160))], GREEN, 'heal'),
  'foot:robo': ab('Laser Grid', every(4), [D(2, front(3))], RED, 'zap'),
  'foot:lava': ab('Magma Trail', smack(0.35), [B(1.5, 3, hit(120))], ORANGE, 'fire'),
  'foot:mitosis': ab('Seeing Double', always, [STAT({ doubleChance: 0.12 })], GREEN, 'burst'),
  'foot:sasha': ab('Stiletto', smack(0.35), [EX(0.3, hit())], RED, 'burst'),
  'foot:bunny': ab('Hop Along', every(5), [K(900, front(3))], PINK, 'wind'),
  'foot:rita': ab('Roller Disco', act, [D(5, all), S(0.3, 4, all), T(10)], PINK, 'wind'),
  'foot:gus': ab('Shield Wall', wave, [SH(2, 'weakest')], GOLD, 'heal'),
  'foot:clyde': ab('Clog Dance', every(6), [D(2.5, peel(240)), ST(0.6, peel(240))], BROWN, 'burst'),
  'foot:wendy': ab('Puddle Jump', smack(0.25), [S(0.4, 2, hit(160)), K(400, hit(160))], 0xffd23f, 'wind'),
  'foot:moe': ab('Moonwalk', act, [K(1600, all), D(4, all)], WHITE, 'wind', 1.1),
  'foot:stompalot': ab('Knight Charge', act, [D(10, front(4), 1000)], 0x8a929e, 'slam'),
  'foot:jingle': ab('Jingle Bells', wave, [T(12), H(1, 'weakest')], GREEN, 'gold'),
  'foot:pete': ab('Walk the Plank', every(8), [TH('cannon', 'explode', 6, tough(1), { knock: 1000, r: 160, splash: 2 })], BROWN, 'burst'),
  'foot:dino': ab('Jurassic Stomp', act, [D(8, all), ST(1, all)], GREEN, 'slam'),
  'foot:xeno': ab('Abduction', every(9), [D(8, front(1)), K(1400, front(1))], GREEN, 'zap'),
  'foot:mummy': ab('Wrapped Up', smack(0.25), [ST(1.5, hit())], 0xe8e0c8, 'burst'),
  'foot:bill': ab('Plaster Cast', always, [STAT({ shrugChance: 0.1 })], WHITE, 'heal'),
  'foot:dad': ab('Dad Joke', every(8), [ST(1.5, all)], 0xd8c0a0, 'burst'),
  'foot:tappy': ab('Tap Routine', every(2), [D(1.2, peel(180))], GOLD, 'burst'),
  'foot:disco': ab('Disco Fever', act, [ST(2, all), M(1.5, 5, all)], PINK, 'zap'),
  'foot:striker': ab('Penalty Kick', every(5), [TH('football', 'ricochet', 5, front(1), { knock: 1300, more: [2.5] })], WHITE, 'burst'),
  'foot:quack': plus(ab('Duck and Cover', stomp, [SH(1, 'weakest')], GOLD, 'heal'), every(6), TH('duck', 'lob', 1, rnd(1), { on: [ST(1, hit())] })),
  'foot:wally': ab('Full Moon', kill(0.3), [D(2.5, hit(200))], BROWN, 'burst'),
  'foot:tony': ab('Tough Ink', always, [STAT({ bigHurt: 0.25 })], BLUE, 'burst'),
  'foot:clara': ab('Fumble', every(7), [TH('clutter', 'lob', 3, rnd(2), { knock: 600 })], PINK, 'burst'),
  'foot:arthur': ab('Argyle Armour', wave, [SH(1, 'all')], PURPLE, 'heal'),
  'foot:sue': ab('Sunburn', smack(0.3), [B(1.3, 4, hit())], ORANGE, 'fire'),
  'foot:fred': ab('Frostbite', smack(0.3), [S(0.5, 3, hit(140))], CYAN, 'frost'),
  'foot:golden': ab('Gold Rush', always, [STAT({ coinMult: 0.25, goldenTouch: 0.03 })], GOLD, 'gold'),
  'foot:waiter': plus(ab('Table Service', every(10), [H(1, 'weakest')], WHITE, 'heal'), every(7), TH('plate', 'ricochet', 2, rnd(1), { more: [2, 2] })),
  'foot:garlicgary': ab('Garlic Aura', always, [STAT({ garlicDps: 8 })], GREEN, 'ink'),
  'foot:espresso': ab('Double Shot', always, [STAT({ superGain: 0.4, doubleChance: 0.05 })], BROWN, 'burst'),
  'foot:saucysal': ab('Sauce Splash', kill(0.4), [D(1.6, hit(170)), S(0.25, 2, hit(170))], RED, 'burst'),
  'foot:antenna': ab('Signal Boost', every(6), [C(1.5, 4, rnd(1))], CYAN, 'zap'),
  'foot:parkour': ab('Free Running', always, [STAT({ radius: 8 })], ORANGE, 'wind'),
  'foot:sandy': ab('Sand Trap', every(5), [S(0.5, 3, nearP(220)), D(1.5, nearP(220))], GOLD, 'wind'),
  'foot:seaweed': ab('Tangled', smack(0.3), [S(0.6, 2, hit(140)), D(0.8, hit(140))], GREEN, 'ink'),
  'foot:coconut': ab('Coconut Drop', every(5), [TH('coconut', 'lob', 4, rnd(1), { on: [ST(1.2, hit())] })], BROWN, 'burst'),
  'foot:tidepool': ab('Rock Pool', wave, [H(1, 'all')], CYAN, 'heal'),
  'foot:riot': ab('Riot Shield', stomp, [D(3, hit()), K(1000, hit())], 0x8a929e, 'burst'),
  'foot:waffle': ab('Waffle Iron', smack(0.2), [D(1.5, hit()), M(1.3, 3, hit())], GOLD, 'burst'),
  'foot:ketchup': ab('Ketchup Squirt', every(5), [D(2, front(2)), S(0.3, 2, front(2))], RED, 'ink'),
  'foot:frycook': ab('Deep Fryer', every(6), [B(1.5, 4, rnd(3))], ORANGE, 'fire'),
  'foot:moose': ab('Antler Charge', act, [D(9, front(4), 1200)], BROWN, 'slam'),
  'foot:hottub': ab('Hot Tub Time', wave, [H(1, 'weakest'), FR(1)], CYAN, 'heal'),
  'foot:fireside': ab('Campfire', always, [STAT({ burnDps: 6 })], ORANGE, 'fire'),
  'foot:magnet': ab('Magnetic Field', every(5), [D(2, peel(300)), S(0.5, 2, peel(300))], RED, 'zap'),
  'foot:gravity': ab('Gravity Well', act, [ST(2, all), D(4, all), S(0.3, 3, all)], PURPLE, 'wind'),
  'foot:alienal': ab('Probe', every(6), [M(1.8, 5, tough(2))], GREEN, 'zap'),
  'foot:robosock': ab('Overclock', always, [STAT({ chainChance: 0.12 })], CYAN, 'zap'),
  'foot:comet': ab('Comet Tail', act, [D(9, rnd(4)), B(1, 3, rnd(4))], ORANGE, 'rain'),
  'foot:rover': ab('Survey Laser', every(4), [D(2.5, tough(1))], RED, 'zap'),
  'foot:starlight': ab('Star Wish', kill(0.3), [T(2), D(1, rnd(2))], GOLD, 'gold'),
  'foot:thief': plus(ab('Pickpocket', smack(0.15), [T(1)], PURPLE, 'gold'), every(5), TH('coin', 'straight', 2, rnd(1), { on: [T(2)] })),
  'foot:fruitfly': ab('Swarm', every(3), [D(1, rnd(5))], GREEN, 'rain'),
  'foot:doughtoes': plus(ab('Proving Drawer', always, [STAT({ regenPerWave: 1 })], 0xf2dfb0, 'heal'), every(6), TH('dough', 'stick', 1, front(1), { stick: 3, on: [S(0.4, 3, hit())] })),
  'foot:pigeon': ab('Pigeon Dive', every(4), [D(2.5, front(1))], 0x8f93ad, 'rain'),
  'foot:chimney': ab('Chimney Drop', every(6), [D(3, rnd(2)), ST(1, rnd(2))], BROWN, 'rain'),
  'foot:rainy': ab('Downpour', act, [S(0.5, 6, all), D(3, all)], BLUE, 'rain'),
  'foot:gymbro': plus(ab('Gains', always, [STAT({ damage: 3 })], RED, 'burst'), every(8), TH('dumbbell', 'lob', 4, tough(1), { on: [ST(1.2, hit())] })),
  'foot:crabby': ab('Pinch', smack(0.25), [ST(1, hit()), D(0.8, hit())], RED, 'burst'),
  'foot:lifeguard': plus(ab('Rescue', stomp, [H(1, 'weakest')], RED, 'heal'), every(8), TH('ring', 'stick', 0, front(1), { stick: 3, on: [S(0.5, 3, hit())] })),
  'foot:surfsully': ab('Hang Ten', act, [K(1300, all), D(5, all)], CYAN, 'wind'),
  'foot:pogo': ab('Boing!', smack(0.3), [K(700, hit(150))], PINK, 'wind'),
  'foot:graffiti': ab('Tagged', smack(0.3), [M(1.5, 4, hit())], PINK, 'ink'),
  'foot:bowling': ab('Strike!', every(7), [TH('bowling', 'roll', 4, front(1), { knock: 700, r: 100 })], BLUE, 'burst'),
  'foot:jukebox': ab('Drop the Beat', every(8), [D(3, all)], PINK, 'zap'),
  'foot:skateboard': ab('Kickflip', smack(0.2), [TH('skateboard', 'ricochet', 2, hit(), { more: [2] })], ORANGE, 'burst'),
  'foot:snowshoe': ab('Snowdrift', every(6), [S(0.45, 3, all)], WHITE, 'frost'),
  'foot:hiking': ab('Trailblazer', always, [STAT({ damage: 1, bossDmg: 0.15 })], BROWN, 'burst'),
  'foot:skier': ab('Downhill', act, [D(7, front(5), 1000), S(0.3, 3, all)], WHITE, 'wind'),
  'foot:mime': ab('Invisible Wall', wave, [SH(3, 'weakest')], WHITE, 'heal'),
  'foot:neon': ab('Glow Up', every(5), [M(1.4, 4, all)], PINK, 'zap'),
  'foot:crusty': plus(ab('Crust Lust', kill(0.08), [T(5)], GOLD, 'gold'), kill(0.3), TH('crust', 'lob', 3, rnd(1))),
  'foot:mimic': ab('Surprise!', kill(0.25), [D(3, hit(220))], BROWN, 'burst'),
  'foot:blacksmith': ab('Anvil Drop', every(6), [D(4, tough(1)), ST(1, tough(1))], 0x9aa3ad, 'rain'),
  'foot:gargoylet': ab('Petrify', smack(0.25), [ST(1.2, hit()), M(1.3, 3, hit())], 0x9a9488, 'burst'),
  'foot:batfeet': ab('Night Swoop', every(5), [D(2, front(1)), ST(1, front(1))], PURPLE, 'rain'),
  'foot:spidersocks': ab('Web Shot', smack(0.25), [S(0.6, 2.5, hit())], WHITE, 'ink'),
  // the Kratos Peel's feet (src/content/feet/gods.ts)
  'foot:elephant': ab('Elephant Stomp', every(8), [D(3, front(3), 1100)], 0x8e8a86, 'slam'),
  // its late-wave +25% is a passive in src/game/godMoves.ts
  'foot:spartan': { ...ab('Phalanx', wave, [SH(1, 'weakest')], 0xc9873a, 'heal'), desc: 'Each wave: a bronze shield on your weakest pizza. When only a quarter of the wave’s feet are left, +25% damage.' },

  // ——— Pizzas ———
  'pizza:margherita': plus(ab('Classic Crust', always, [STAT({ damage: 1.5 })], RED, 'burst'), every(6), TH('tomato', 'bounce', 2, rnd(1), { more: [1.5, 1] })),
  'pizza:pepperoni': ab('Pepperoni Rain', every(5), [D(2, rnd(4))], RED, 'rain'),
  'pizza:funghi': ab('Spore Cloud', every(6), [ST(1.2, rnd(3))], BROWN, 'ink'),
  'pizza:hawaiian': plus(ab('Pineapple Express', kill(0.3), [D(2.5, hit(200))], GOLD, 'burst'), every(7), TH('pineapple', 'roll', 1.5, front(1), { r: 90 })),
  'pizza:veggie': ab('Garden Patch', wave, [H(1, 'all')], GREEN, 'heal'),
  'pizza:formaggi': ab('Cheese Pull', smack(0.3), [S(0.4, 3, hit(150))], GOLD, 'wind'),
  'pizza:diavola': ab('Devil’s Heat', smack(0.35), [B(1.5, 3, hit())], RED, 'fire'),
  'pizza:bbq': ab('Smokehouse', every(6), [B(1, 4, all)], BROWN, 'fire'),
  'pizza:meat': ab('Meat Sweats', act, [D(8, all, 1000), B(0.6, 3, all)], RED, 'slam'),
  'pizza:pesto': ab('Basil Breeze', every(5), [S(0.3, 3, all)], GREEN, 'wind'),
  'pizza:sicilian': plus(ab('Square Deal', always, [STAT({ radius: 5, damage: 1 })], GOLD, 'burst'), every(5), TH('square', 'straight', 1.5, rnd(2))),
  'pizza:dessert': ab('Sugar Rush', always, [STAT({ superGain: 0.35 })], PINK, 'burst'),
  'pizza:truffle': ab('Truffle Hunt', kill(0.3), [D(1.2, hit(160)), T(3)], BROWN, 'gold'),
  'pizza:marinara': ab('Red Sea', act, [K(1200, all), S(0.4, 4, all)], RED, 'wind'),
  'pizza:capricciosa': ab('Capriccio', every(4), [D(2, rnd(2)), ST(0.8, rnd(1))], GREEN, 'burst'),
  'pizza:calzone': ab('Folded Over', stomp, [D(4, hit()), SH(1, 'weakest')], GOLD, 'burst'),
  'pizza:prosciutto': ab('Rocket Salad', every(5), [D(4, front(1))], GREEN, 'zap'),
  'pizza:buffalo': ab('Buffalo Stampede', act, [D(7, front(6), 1200)], ORANGE, 'slam'),
  'pizza:breakfast': ab('Early Bird', wave, [SH(1, 'all'), T(8)], GOLD, 'gold'),
  'pizza:seafood': ab('Fresh Catch', every(6), [S(0.4, 3, rnd(3)), D(2, rnd(3))], CYAN, 'wind'),
  'pizza:taco': ab('Taco Tuesday', smack(0.2), [D(1, hit(150)), B(0.8, 2, hit(150))], ORANGE, 'fire'),
  'pizza:spinach': plus(ab('Iron Leaves', always, [STAT({ damage: 1, knockback: 80 })], GREEN, 'burst'), every(6), TH('spinach', 'lob', 2, front(1), { knock: 1300 })),
  'pizza:detroit': ab('Motor City', every(3), [D(1.5, front(2))], RED, 'zap'),
  'pizza:deepdish': ab('Deep Defence', wave, [SH(1, 'all'), H(1, 'weakest')], GOLD, 'heal'),
  'pizza:smores': ab('Campfire Treat', every(7), [B(1.2, 4, rnd(3)), H(1, 'weakest')], BROWN, 'fire'),
  'pizza:bianca': ab('Rosemary Roast', always, [STAT({ burnDps: 4, critChance: 0.03 })], WHITE, 'fire'),
  'pizza:unicorn': ab('Rainbow Blast', act, [D(8, all), ST(1.5, all), T(15)], PINK, 'gold'),
  'pizza:golden': ab('Golden Pie', always, [STAT({ goldenTouch: 0.05, coinMult: 0.15 })], GOLD, 'gold'),
  'pizza:nduja': ab('Spicy Spread', kill(0.4), [B(1.5, 3, hit(200))], RED, 'fire'),
  'pizza:hothoney': ab('Sweet Heat', smack(0.25), [B(1, 3, hit()), T(1)], GOLD, 'fire'),
  'pizza:calabrese': ab('Chilli Kick', smack(0.2), [D(1.5, hit(140)), B(0.8, 2, hit(140))], RED, 'fire'),
  'pizza:puttanesca': ab('Olive Volley', every(3), [TH('olive', 'pierce', 1.5, rnd(2))], GREEN, 'burst'),
  'pizza:philly': ab('Steak Sizzle', every(6), [D(2.5, peel(260)), B(1, 3, peel(260))], ORANGE, 'fire'),
  'pizza:grandma': ab('Grandma’s Love', wave, [H(1, 'all'), FR(1)], PINK, 'heal'),
  'pizza:stromboli': ab('Rolled Up', act, [ST(3, front(5)), D(5, front(5))], GOLD, 'burst'),
  'pizza:whitepie': ab('White Out', act, [FZ(2.5, all)], WHITE, 'frost'),
  'pizza:flambee': ab('Flambé!', act, [B(2, 5, all), D(4, all)], ORANGE, 'fire'),
  'pizza:stagioni': ab('Four Seasons', every(8), [D(2, all), S(0.3, 2, all), B(0.6, 2, all)], GREEN, 'wind'),
  'pizza:nyslice': ab('Quick Fold', always, [STAT({ quickTips: 1, damage: 1 })], GOLD, 'gold'),
  'pizza:kebab': ab('Skewered', smack(0.25), [D(1, hit()), C(1, 2)], BROWN, 'zap'),
  'pizza:maccheese': ab('Comfort Food', stomp, [H(1, 'weakest'), FR(1, 'weakest')], GOLD, 'heal'),
  'pizza:fig': ab('Fine Dining', always, [STAT({ coinMult: 0.2, scoreMult: 0.1 })], PURPLE, 'gold'),
  'pizza:taglio': ab('Slice Strike', every(4), [D(2.5, tough(1))], RED, 'burst'),
  'pizza:pickle': ab('Sour Face', smack(0.25), [ST(1, hit(130))], GREEN, 'ink'),
  'pizza:pumpkin': ab('Spice Storm', every(6), [B(1, 3, all)], ORANGE, 'fire'),
  'pizza:fritta': ab('Hot Oil', stomp, [B(2, 4, hit()), D(2, hit())], GOLD, 'fire'),
  'pizza:carbonara': plus(ab('Cracked Pepper', always, [STAT({ critChance: 0.06, critMult: 0.5 })], WHITE, 'burst'), every(7), TH('grenade', 'explode', 1, rnd(1), { r: 170, splash: 1, on: [ST(1, hit())] })),
  'pizza:lahmacun': ab('Flatbread Fling', every(5), [TH('flatbread', 'boomerang', 3, rnd(1), { knock: 600, more: [3] })], RED, 'burst'),
  'pizza:okonomiyaki': ab('Bonito Dance', smack(0.25), [ST(1, hit()), M(1.3, 3, hit())], BROWN, 'burst'),
  'pizza:tandoori': ab('Tandoor Heat', always, [STAT({ burnDps: 5, bigHurt: 0.1 })], ORANGE, 'fire'),
  'pizza:greek': ab('Olympian', act, [D(9, all), C(2, 4, rnd(1))], BLUE, 'zap'),
  'pizza:cajun': ab('Cajun Kick', kill(0.35), [D(2, hit(180)), B(1, 2, hit(180))], RED, 'fire'),
  'pizza:salsiccia': ab('Bitter Greens', every(5), [M(1.5, 4, front(2)), D(2, front(2))], GREEN, 'ink'),
  'pizza:marshmallow': ab('Marshmallow Bounce', stomp, [K(1300, hit()), SH(1, 'weakest')], PINK, 'wind'),
  'pizza:napoletana': ab('Wood-Fired', act, [B(2.5, 4, all), D(5, all)], ORANGE, 'fire'),
  'pizza:birthday': ab('Party Time', wave, [T(15), H(1, 'weakest')], PINK, 'gold'),
  // ——— Phase 3 pizzas ———
  'pizza:pugliese': ab('Heel of the Boot', kill(0.3), [D(1.5, hit(170)), T(2)], GOLD, 'burst'),
  'pizza:hammushroom': ab('Button Bash', smack(0.25), [D(1.2, hit(140)), ST(0.6, hit())], BROWN, 'burst'),
  'pizza:chickenpesto': ab('Pesto Pool', every(6), [S(0.45, 3, front(3)), D(1.5, front(3))], GREEN, 'wind'),
  'pizza:tunasweetcorn': ab('Corn Popper', every(4), [D(1.8, rnd(3))], GOLD, 'rain'),
  'pizza:romana': ab('Roman Rush', always, [STAT({ doubleChance: 0.08, damage: 0.5 })], RED, 'burst'),
  'pizza:garlicbread': ab('Garlic Butter', wave, [H(1, 'weakest'), FR(1)], GOLD, 'heal'),
  'pizza:bolognese': ab('Meatball Bowl', act, [D(6, front(5), 900), ST(1.5, front(5))], RED, 'slam', 0.9),
  'pizza:jerk': ab('Scotch Bonnet', smack(0.25), [B(1.4, 3, hit(150))], ORANGE, 'fire'),
  'pizza:bufala': ab('Buffalo Guard', wave, [SH(1, 'weakest'), H(1, 'weakest')], WHITE, 'heal'),
  'pizza:chorizo': ab('Paprika Flare', every(5), [B(1.2, 3, front(3)), D(1, front(3))], RED, 'fire'),
  'pizza:mediterranean': ab('Sun-Dried', always, [STAT({ coinMult: 0.12, freshBonus: 1 })], GOLD, 'gold'),
  'pizza:sloppyjoe': ab('Sloppy Seconds', stomp, [S(0.6, 4, hit(220)), D(3, hit())], BROWN, 'ink'),
  'pizza:pomodori': ab('Tomato Toss', every(4), [D(1.5, rnd(4))], RED, 'rain'),
  'pizza:veggiesupreme': ab('Harvest', wave, [H(1, 'all')], GREEN, 'heal'),
  'pizza:honeychicken': ab('Honey Trap', smack(0.25), [S(0.4, 3, hit()), B(1, 3, hit())], GOLD, 'fire'),
  'pizza:saffronlobster': ab('Saffron Storm', act, [D(8, all), B(1, 3, all)], GOLD, 'fire'),
  'pizza:wagyu': ab('Marbled', always, [STAT({ scoreMult: 0.2, damage: 1 })], RED, 'burst'),
  'pizza:caviar': ab('Black Pearls', kill(0.3), [D(2, hit(180)), T(4)], PURPLE, 'gold'),
  'pizza:burrata': ab('Creamy Centre', stomp, [H(1, 'weakest'), SH(1, 'weakest')], WHITE, 'heal'),
  'pizza:salmon': ab('Cold Smoke', every(7), [FZ(1.8, front(3)), D(2, front(3))], CYAN, 'frost'),
  'pizza:duck': ab('Orange Glaze', smack(0.2), [D(1.2, hit(150)), T(1)], ORANGE, 'gold'),
  'pizza:napolidoc': ab('Denominazione', act, [D(9, all, 800)], RED, 'slam'),
  'pizza:porcini': ab('Forest Floor', every(6), [M(1.5, 4, tough(2)), D(2, tough(2))], BROWN, 'ink'),
  'pizza:champagne': ab('Pop the Cork', wave, [T(12), SH(1, 'weakest')], GOLD, 'gold'),
  'pizza:thermidor': ab('Claw Snap', every(5), [D(3, tough(1)), ST(1, tough(1))], RED, 'zap'),
  'pizza:figrose': ab('Bed of Roses', kill(0.3), [H(1, 'weakest'), D(1.2, hit(160))], PINK, 'heal'),
  'pizza:marrow': ab('Bone Crunch', smack(0.2), [D(2, hit()), K(900, hit())], WHITE, 'burst'),
  'pizza:oyster': ab('Pearl Shell', wave, [SH(1, 'all')], CYAN, 'heal'),
  'pizza:goldmargherita': ab('Gilded Peel', always, [STAT({ goldenTouch: 0.06, coinMult: 0.1 })], GOLD, 'gold'),
  'pizza:victorylap': ab('Lap of Honour', every(5), [D(2, front(3), 500)], GOLD, 'wind'),
  'pizza:slayer': ab('Giant Killer', every(4), [D(3.5, tough(1))], RED, 'zap'),
  'pizza:century': ab('Hundred Up', act, [D(10, all), H(2, 'all')], GOLD, 'slam', 0.85),
  'pizza:thousand': ab('Feast Mode', kill(0.35), [D(1.5, hit(200)), H(1, 'weakest')], RED, 'burst'),
  'pizza:perfectpie': ab('Flawless', wave, [SH(1, 'all'), T(6)], GOLD, 'gold'),
  'pizza:infernocalzone': ab('Inferno', act, [B(3, 5, all), D(4, all)], ORANGE, 'fire'),
  'pizza:anniversary': ab('Golden Years', always, [STAT({ crustBonus: 0.08, coinMult: 0.1 })], GOLD, 'gold'),
  'pizza:peelcollector': ab('Peel Parade', every(5), [D(1.5, rnd(5))], BROWN, 'rain'),
  'pizza:comboking': ab('Royal Combo', always, [STAT({ comboBonus: 1, scoreMult: 0.15 })], PURPLE, 'gold'),
  'pizza:untouchable': ab('Hands Off', stomp, [K(1400, hit()), SH(1, 'weakest')], WHITE, 'wind'),
  'pizza:speedslice': ab('Lightning Slice', smack(0.3), [C(1.2, 3)], GOLD, 'zap'),
  'pizza:nightshift': ab('Lights Out', act, [ST(2.5, all), D(6, all)], BLUE, 'ink'),
  'pizza:ragnarok': ab('Fire and Ice', act, [FZ(2, all), B(2.5, 4, all), D(5, all)], ORANGE, 'frost'),
  'pizza:olympian': ab('Feast of the Gods', act, [D(8, all), C(2, 5, rnd(1)), H(1, 'all')], BLUE, 'zap'),
  'pizza:arcobaleno': ab('Over the Rainbow', every(6), [D(2, rnd(3)), S(0.3, 2, rnd(3)), B(0.8, 2, rnd(3))], PINK, 'gold'),
  'pizza:mooncheese': ab('Moonbeam', every(5), [D(3, tough(1)), ST(1.2, tough(1))], CYAN, 'zap'),
  'pizza:dragonfruit': ab('Dragon’s Breath', smack(0.2), [D(1.5, hit(220)), B(1.5, 3, hit(220))], PINK, 'fire'),
  'pizza:fantasma': ab('Boo!', every(7), [ST(1.5, front(4)), K(800, front(4))], CYAN, 'ink'),
  'pizza:mysterymeat': ab('Mystery Box', wave, [T(10), SH(1, 'weakest'), H(1, 'weakest')], PURPLE, 'gold'),
  'pizza:clover': ab('Lucky Strike', kill(0.25), [T(5), D(1.5, hit(160))], GREEN, 'gold'),
  'pizza:tikka': ab('Time Out', act, [FZ(3.5, all), D(5, all)], CYAN, 'frost'),
  'pizza:meteorite': ab('Meteor Shower', every(6), [D(3, BL(2, 160))], ORANGE, 'rain'),
  'pizza:volcano': ab('Eruption', act, [D(11, all, 1000), B(2, 4, all)], RED, 'fire', 0.8),
  'pizza:pinata': ab('Sweet Smash', kill(0.3), [T(4), D(1.5, hit(180))], PINK, 'gold'),
  'pizza:haunted': ab('Ghost Ring', every(4), [D(2, peel(260)), S(0.3, 2, peel(260))], GREEN, 'ink'),
  'pizza:royalwedding': ab('Royal Toast', wave, [T(10), H(1, 'all')], PINK, 'gold'),
  'pizza:pirate': ab('Cannonade', every(5), [D(3, BL(1, 220, 'front'))], GOLD, 'burst'),
  'pizza:nonnasecret': ab('Nonna’s Hug', wave, [H(2, 'weakest'), FR(1, 'weakest')], PINK, 'heal'),

  // ——— Act 7 · Comics: places, bosses and villain feet ———
  'place:metropizza': ab('Searchlight', every(6), [M(1.6, 4, tough(2)), D(2, tough(2))], GOLD, 'zap'),
  'place:doomlab': ab('Mad Science', every(7), [C(1.4, 4, rnd(1)), S(0.3, 2, all)], GREEN, 'zap'),
  'boss:lexlugtoe': ab('Hostile Takeover', kill(0.35), [T(3), D(1.5, hit(170))], GREEN, 'gold'),
  'boss:doomstomp': ab('Comeback', act, [D(11, all, 1200), ST(1, all)], 0x8a9a7a, 'slam', 0.95),
  'boss:ultoe': ab('Upload', every(5), [D(2, rnd(4)), M(1.3, 3, rnd(4))], RED, 'zap'),
  'boss:thanfoot': ab('The Snap', act, [D(6, all), EX(0.5, all)], PURPLE, 'slam', 0.85),
  'foot:henchman': ab('Gang Up', smack(0.25), [D(1, rnd(3))], RED, 'burst'),
  'foot:jetpack': ab('Afterburner', every(5), [B(1.2, 3, front(2)), K(600, front(2))], ORANGE, 'fire'),
  'foot:goon': plus(ab('Hired Muscle', always, [STAT({ knockback: 100, damage: 1 })], GOLD, 'burst'), every(7), TH('grenade', 'explode', 3, rnd(1), { r: 170, splash: 1.5 })),
  'foot:ultodrone': ab('Drone Swarm', every(3), [D(1, rnd(3))], CYAN, 'zap'),

  // ——— Act 8 · Norse: places, bosses and feet ———
  'place:jotunheim': ab('Land of Giants', every(7), [FZ(2, front(2)), M(1.5, 4, front(2))], CYAN, 'frost'),
  'place:bifrost': ab('Rainbow Bridge', act, [D(8, all, 900), ST(1.5, all), T(8)], GOLD, 'burst'),
  'boss:fenrir': ab('Gleipnir Snaps', act, [D(7, front(5), 1000), ST(1.2, front(5))], 0x9aa3ad, 'slam'),
  'boss:thrym': ab('Frost King', act, [FZ(4, all), M(1.6, 5, all)], CYAN, 'frost'),
  'boss:jormungandr': ab('World Serpent', every(6), [D(3, rnd(3)), S(0.5, 3, rnd(3))], GREEN, 'ink'),
  'boss:surtr': ab('Ragnarök', act, [D(12, all, 1200), B(2, 5, all)], ORANGE, 'fire', 0.9),
  'foot:frostgiant': ab("Giant's Chill", smack(0.25), [FZ(1.5, hit(170)), D(1, hit(170))], CYAN, 'frost'),
  'foot:draugr': ab('Barrow Blaze', kill(0.3), [B(1.5, 3, hit(200)), D(1.5, hit(200))], GREEN, 'fire'),
  'foot:troll': ab('Sunlight', every(8), [ST(2.5, tough(1)), M(2, 3, tough(1))], GOLD, 'burst'),
  'foot:valkyrie': ab('Ride of the Valkyries', every(5), [D(2.5, rnd(2)), K(600, rnd(2))], WHITE, 'rain'),

  // ——— Act 9 · Greek myths: its place, event, feet, Titans and bosses ———
  'place:labyrinth': ab('Dead End', every(7), [ST(1.5, front(3)), D(2, front(3))], BROWN, 'burst'),
  'place:tartarus': ab('River Styx', smack(0.25), [S(0.4, 3, hit(180)), M(1.3, 3, hit(180))], CYAN, 'ink'),
  'event:charybdis': ab('Whirlpool', act, [D(6, all), S(0.5, 4, all), ST(1, all)], CYAN, 'wind'),
  'foot:satyr': ab('Panic', smack(0.25), [ST(1.2, hit(150))], GREEN, 'burst'),
  'foot:cyclops': ab('One Eye Open', always, [STAT({ critChance: 0.1 })], RED, 'burst'),
  'foot:harpy': ab('Snatch and Grab', kill(0.3), [T(3)], GOLD, 'gold'),
  'foot:titantoes': ab('Titan Stomp', auto, [D(11, all, 1300), ST(1.2, all)], BROWN, 'slam', 0.85),
  'foot:hoplite': ab('Phalanx', wave, [SH(1, 'all'), D(2, front(3))], 0xc9873a, 'heal'),
  'foot:siren': ab('Siren Song', every(7), [ST(1.2, all), M(1.3, 3, all)], CYAN, 'wind'),
  'foot:gorgonsnake': ab('Venom', smack(0.25), [B(1, 3, hit())], GREEN, 'ink'),
  'foot:kronos': ab('Time Stop', act, [ST(4, all), M(1.5, 4, all)], 0xd9c27a, 'zap', 1.05),
  'foot:atlas': ab('Weight of the World', every(8), [D(5, tough(1), 900), ST(1.5, tough(1))], BLUE, 'burst'),
  'foot:hyperion': ab('Solar Flare', every(6), [B(2, 3, rnd(3))], ORANGE, 'fire'),
  'boss:minotaur': ab('Bull Rush', act, [D(7, front(4), 1300), ST(1.5, front(4))], BROWN, 'wind'),
  'boss:medusa': ab('Stone Gaze', act, [FZ(3, all), M(1.6, 5, all)], 0x9dff6a, 'frost'),
  'boss:cerberus': ab('Three Tempers', every(6), [B(1.5, 3, front(1)), FZ(1.5, tough(1)), S(0.5, 3, rnd(2)), D(2, rnd(2))], RED, 'fire'),
  'boss:hades': ab('Shadow Grasp', every(5), [EX(0.3, front(2)), D(2.5, front(2))], PURPLE, 'ink'),

  // ——— Act 10 · Finale: places, echoes and the four finale fights ———
  'place:oven': ab('Memory Lane', every(8), [D(3, rnd(3)), ST(1.2, rnd(3)), T(2)], PURPLE, 'zap'),
  'place:firstpizzeria': ab('First Fire', wave, [FR(2), H(1, 'weakest'), SH(1, 'weakest')], ORANGE, 'fire'),
  'foot:echobot': ab('Glitch Step', smack(0.25), [ST(1, hit()), C(1, 2)], 0x33e1ff, 'zap'),
  'foot:echoghost': ab('Phase Out', every(6), [S(0.5, 3, front(2)), D(2, front(2))], 0x7df9ff, 'ink'),
  'foot:echocowboy': ab('Low Gravity', every(7), [K(1300, front(2)), S(0.4, 3, front(2))], 0x7df9ff, 'wind'),
  'foot:echoclown': ab('Jousting Honk', kill(0.35), [K(1100, hit(200)), D(2, hit(200))], RED, 'burst'),
  'foot:echodino': ab('Phalanx Claw', smack(0.2), [D(2, hit(160)), ST(0.8, hit(160))], 0xb06bff, 'burst'),
  'boss:mirrorpeel': ab('Reflection', stomp, [D(5, hit()), M(1.6, 4, hit())], PURPLE, 'zap'),
  'boss:soleprop': ab('Hostile Takeover', wave, [T(30)], GOLD, 'gold'),
  'boss:ghostfuture': ab('Foresight', smack(0.3), [D(1.5, rnd(1)), ST(1, rnd(1))], 0xbfe6ff, 'frost'),
  'boss:soleunbound': ab('Every Peel at Once', act, [D(14, all, 1300), B(1.5, 4, all), FZ(1.5, all), T(25)], GOLD, 'slam', 0.85),

  // ——— Nemesis stages: Batpeel's Gotham (src/game/nemesis.ts; the Dark Kneader is in src/content/peels/nemesis.ts) ———
  'place:gotham': ab('Rooftop Vigil', every(7), [S(0.3, 3, all), M(1.5, 4, tough(1)), ST(1, tough(1))], BLUE, 'ink'),
  'boss:bunion': plus(ab('Venom', always, [STAT({ damage: 2, knockback: 80 })], GREEN, 'burst'), every(9), D(5, tough(1), 1200), ST(1.5, tough(1))),
  'boss:jokester': plus(ab('Last Laugh', act, [ST(2.5, all), D(5, all), T(10)], 0x9be23a, 'gold'), every(6), TH('card', 'explode', 2, rnd(1), { r: 150, splash: 1 })),

  // ——— Nemesis bosses: Kratos in Tartarus (src/game/bosses/kratos.ts) ———
  'boss:titanking': plus(ab('Time Eater', every(8), [S(0.45, 3, all), ST(1, tough(1))], GOLD, 'frost'), kill(0.2), H(1)),
  'boss:zeus': plus(ab('King of the Sky', act, [D(7, all, 400), ST(1.5, all), SH(1, 'all')], 0x9fd8ff, 'zap', 0.9), every(7), TH('bolt', 'straight', 3, tough(1))),
  // ——— Nemesis bosses: the comic heroes' minis (src/game/bosses/comics.ts) ———
  'boss:redsole': plus(ab('Cosmic Crouton', every(9), [D(4, rnd(1), 300), ST(1.5, rnd(1))], 0x5fb8ff, 'zap'), kill(0.2), T(2)),
  'boss:venomnom': plus(ab('We Are Hungry', smack(0.15), [S(0.5, 2.5, hit()), D(1, hit(120))], 0x8a8aff, 'ink'), every(10), H(1)),
  'boss:cheetoe': plus(ab('Pounce', every(5), [D(3, front(1), 400), ST(1, front(1))], 0xf0a040, 'wind'), always, STAT({ radius: 6 })),

  // ——— Event shinies use their event's ability (see abilityKey) ———
};

/** Shiny peels use their base type's ability. */
export function abilityKey(peelId: string): string {
  if (peelId.startsWith('shiny:')) return `foot:${peelId.slice(6)}`;
  if (peelId.startsWith('shinyev:')) return `event:${peelId.slice(8)}`;
  return peelId;
}

export function abilityFor(peelId: string): Ability {
  return ABILITIES[abilityKey(peelId)] ?? ABILITIES.classic;
}

/** Peels with no ability of their own (they'd fall back to the Classic's Peel Slam). Every peel but the
 * Classic needs one: a new foot, boss, pizza, location or event gets its peel automatically, but its
 * ability is written by hand in ABILITIES. The dev build reports these at boot. */
export function peelsWithoutAbility(ids: string[]): string[] {
  return ids.filter((id) => id !== 'classic' && !ABILITIES[abilityKey(id)]);
}

// ——— plain-English descriptions ———
const fmtX = (x: number) => `${Number.isInteger(x) ? x : x.toFixed(1)}×`;
const sec = (s: number) => `${Number.isInteger(s) ? s : s.toFixed(1)}s`;

function who(t: Target, verbObj = true): string {
  switch (t.to) {
    case 'all':
      return 'every foot';
    case 'peel':
      return 'feet near your peel';
    case 'hit':
      return t.r ? (verbObj ? 'that foot and feet around it' : 'feet around it') : 'that foot';
    case 'random':
      return t.n === 1 ? 'a random foot' : `${t.n} random feet`;
    case 'front':
      return t.n === 1 ? 'the foot closest to a pizza' : `the ${t.n} feet closest to the pizzas`;
    case 'toughest':
      return t.n === 1 ? 'the toughest foot' : `the ${t.n} toughest feet`;
    case 'pizzas':
      return 'feet near your pizzas';
    case 'blast': {
      const what = t.pick === 'front' ? 'the foot closest to a pizza' : t.pick === 'toughest' ? 'the toughest foot' : 'a random foot';
      const whats = t.pick === 'front' ? `the ${t.n} feet closest to the pizzas` : t.pick === 'toughest' ? `the ${t.n} toughest feet` : `${t.n} random feet`;
      return `everything around ${t.n === 1 ? what : whats}`;
    }
  }
}

const STAT_LABEL: Partial<Record<NumStat, (v: number) => string>> = {
  damage: (v) => `+${v} smack damage`,
  critChance: (v) => `+${Math.round(v * 100)}% crit chance`,
  critMult: (v) => `+${Math.round(v * 100)}% crit damage`,
  radius: (v) => `+${v} smack reach`,
  knockback: (v) => `+${v} knockback`,
  burnDps: (v) => `smacks burn for ${v}/s`,
  garlicDps: (v) => `feet near pizzas take ${v} dmg/s`,
  doubleChance: (v) => `+${Math.round(v * 100)}% double-smack chance`,
  chainChance: (v) => `+${Math.round(v * 100)}% chain lightning chance`,
  shrugChance: (v) => `+${Math.round(v * 100)}% chance pizzas shrug off a stomp`,
  regenPerWave: (v) => `+${v} slice regrowth per wave`,
  coinMult: (v) => `+${Math.round(v * 100)}% tips`,
  goldenTouch: (v) => `${Math.round(v * 100)}% of feet turn to gold`,
  superGain: (v) => `+${Math.round(v * 100)}% meter charge`,
  bigHurt: (v) => `+${Math.round(v * 100)}% damage to healthy feet`,
  bossDmg: (v) => `+${Math.round(v * 100)}% boss damage`,
  quickTips: (v) => `+${v} tip per quick kill`,
  crustBonus: (v) => `+${Math.round(v * 100)}% Golden Crusts`,
  scoreMult: (v) => `+${Math.round(v * 100)}% score`,
};

function effectText(f: Effect): string {
  switch (f.e) {
    case 'dmg':
      return `hit ${who(f.at)} for ${fmtX(f.x)} smack damage${f.knock ? ' and knock them back' : ''}`;
    case 'burn':
      return `set ${who(f.at)} on fire (${fmtX(f.x)} a second for ${sec(f.sec)})`;
    case 'slow':
      return `slow ${who(f.at)} by ${Math.round(f.pct * 100)}% for ${sec(f.sec)}`;
    case 'stun':
      return `${f.freeze ? 'freeze' : 'stun'} ${who(f.at)} for ${sec(f.sec)}`;
    case 'knock':
      return `knock ${who(f.at)} back`;
    case 'mark':
      return `mark ${who(f.at)}: they take ${fmtX(f.mult)} damage for ${sec(f.sec)}`;
    case 'chain':
      return `chain lightning from ${who(f.at)} to ${f.jumps} more (${fmtX(f.x)} smack damage)`;
    case 'execute':
      return `finish ${who(f.at)} under ${Math.round(f.below * 100)}% health`;
    case 'heal':
      return f.who === 'all' ? `heal every pizza ${f.n} slice${f.n > 1 ? 's' : ''}` : `heal your weakest pizza ${f.n} slice${f.n > 1 ? 's' : ''}`;
    case 'shield':
      return `give ${f.who === 'all' ? 'every pizza' : 'your weakest pizza'} ${f.n > 1 ? `${f.n} stomp shields` : 'a stomp shield'}`;
    case 'fresh':
      return f.who === 'all' ? `+${f.n} freshness on every pizza` : `+${f.n} freshness on your stalest pizza`;
    case 'tips':
      return `+${f.n} tips`;
    case 'throw':
      return throwText(f, false);
    case 'move':
      return 'a hand-built move';
    case 'stat':
      return Object.entries(f.mods)
        .map(([k, v]) => STAT_LABEL[k as NumStat]?.(v as number) ?? `${k} +${v}`)
        .join(', ');
  }
}

/** How many props a throw sends (one per foot its target picks). */
export function throwCount(f: ThrowFx): number {
  const t = f.at;
  return t.to === 'random' || t.to === 'front' || t.to === 'toughest' ? t.n : 1;
}

/** "throws a tomato slice that bounces between 3 feet (2×, then 1.5×, 1×)" */
function throwText(f: ThrowFx, short: boolean): string {
  const n = throwCount(f);
  const [one, many] = THROW_PROPS[f.prop];
  const name = n > 1 ? `${n} ${many}` : `${/^[aeiou]/.test(one) ? 'an' : 'a'} ${one}`;
  const v = (sing: string, plural: string) => (n > 1 ? plural : sing);
  const target = f.at.to === 'hit' ? (short ? 'it' : 'that foot') : short ? shortWho(f.at) : who(f.at);
  const at = n > 1 && (f.at.to === 'random' || f.at.to === 'front' || f.at.to === 'toughest') ? `${f.at.to === 'random' ? 'random feet' : f.at.to === 'front' ? 'the front feet' : 'the toughest feet'}` : target;
  const dmg = f.x > 0 ? ` (${fmtX(f.x)}${n > 1 && f.how !== 'pierce' && f.how !== 'roll' ? ' each' : ''})` : '';
  const later = (f.more ?? []).filter((m) => m > 0).map(fmtX);
  // "2× each" when every hit is the same, else "2×, then 1.5×, 1×"
  const seq = (first: number | string, rest: string[]) => {
    const a = typeof first === 'number' ? fmtX(first) : first;
    return rest.every((r) => r === a) ? `${a} ${rest.length ? 'a hit' : ''}`.trim() : `${a}, then ${rest.join(', ')}`;
  };
  const knock = f.knock && f.knock > 300 ? ' with knockback' : '';
  let main: string;
  switch (f.how) {
    case 'lob':
      main = `lobs ${name} at ${at}${dmg}${knock}`;
      break;
    case 'straight':
      main = `throws ${name} at ${at}${dmg}${knock}`;
      break;
    case 'bounce':
      main = f.tether
        ? `throws ${name} that ${v('ropes', 'rope')} ${1 + (f.more?.length ?? 0)} feet together`
        : `throws ${name} that ${v('bounces', 'each bounce')} between ${1 + (f.more?.length ?? 0)} feet (${seq(f.x, later)})`;
      break;
    case 'pierce':
      main = `throws ${name} that ${v('flies', 'fly')} through every foot in ${v('its', 'their')} path (${fmtX(f.x)} each)`;
      break;
    case 'ricochet':
      main = `throws ${name} at ${at}${dmg} that ${v('ricochets', 'ricochet')} off the edge into ${later.length === 1 ? 'another foot' : `${later.length} more`} (${seq(later[0], later.slice(1))})`;
      break;
    case 'boomerang':
      main = `throws ${name} like a boomerang: it hits a foot on the way out and another on the way back (${seq(f.x, later)})`;
      break;
    case 'explode':
      main = `lobs ${name} at ${at}${dmg} that ${v('explodes', 'explode')}${f.splash ? `, ${fmtX(f.splash)} to feet nearby` : ''}`;
      break;
    case 'stick':
      main = `throws ${name} that ${v('sticks', 'stick')} to ${at}${dmg}`;
      break;
    case 'split':
      main = `throws ${name} that ${v('splits', 'split')} into 3 pieces, each finding a foot (${fmtX(f.x)} each)`;
      break;
    case 'roll':
      main = `rolls ${name} through a lane of feet (${fmtX(f.x)} each${knock})`;
      break;
    case 'beam':
      main = `fires a beam through every foot in a line (${fmtX(f.x)} each)`;
      break;
  }
  const many_ = n > 1 || f.how === 'pierce' || f.how === 'roll' || f.how === 'explode' || f.how === 'bounce' || f.how === 'beam' || f.how === 'split';
  const it = many_ ? 'them' : 'it';
  const riders = (f.on ?? []).map((r) => riderText(r, it)).filter(Boolean);
  if (f.blind) riders.push(`blinding ${it} so ${many_ ? 'their' : 'its'} next stomp misses (${sec(f.blind)})`);
  return riders.length ? `${main}, ${riders.join(' and ')}` : main;
}

function riderText(f: Effect, it: string): string {
  switch (f.e) {
    case 'dmg':
      return `hitting ${it} for ${fmtX(f.x)}`;
    case 'burn':
      return `setting ${it} on fire (${fmtX(f.x)}/s, ${sec(f.sec)})`;
    case 'slow':
      return `slowing ${it} ${Math.round(f.pct * 100)}% for ${sec(f.sec)}`;
    case 'stun':
      return `${f.freeze ? 'freezing' : 'stunning'} ${it} for ${sec(f.sec)}`;
    case 'knock':
      return `knocking ${it} back`;
    case 'mark':
      return `marking ${it}: ${fmtX(f.mult)} damage taken for ${sec(f.sec)}`;
    case 'tips':
      return `dropping +${f.n} tips`;
    default:
      return effectText(f);
  }
}

function triggerText(t: Trigger): string {
  switch (t.t) {
    case 'active':
      return `${slamPrompt()} when the meter is full`;
    case 'auto':
      return 'Fires by itself when the meter fills';
    case 'every':
      return `Every ${sec(t.sec)}`;
    case 'smack':
      return `${Math.round(t.p * 100)}% of smacks`;
    case 'kill':
      return `${Math.round(t.p * 100)}% of kills`;
    case 'stomp':
      return 'When a foot stomps a pizza';
    case 'wave':
      return 'At the start of every wave';
    case 'always':
      return 'Always on';
  }
}

/** "Every 5s: hit 4 random feet for 2× smack damage." */
export function describeAbility(a: Ability): string {
  if (a.desc) return a.desc.replace(/\{slam\}/g, slamPrompt());
  // merge repeated shields/heals into one phrase
  const parts: string[] = [];
  for (const f of a.fx) {
    const t = effectText(f);
    if (!parts.includes(t)) parts.push(t);
  }
  const body = parts.join(', then ');
  const lead = triggerText(a.trigger);
  const main = `${lead}: ${body.charAt(0) + body.slice(1)}.`;
  if (!a.also) return main;
  return `${main} ${triggerText(a.also.trigger)}: ${a.also.fx.map(effectText).join(', then ')}.`;
}

export function abilityKindLabel(a: Ability): string {
  if (a.trigger.t === 'active') return 'ACTIVE';
  if (a.trigger.t === 'auto') return 'AUTO';
  return 'PASSIVE';
}
