// Phase 3 pizza perks: the 57 new pizzas' effects, kept out of GameScene. The scene calls a hook at
// each moment that matters (wave start and clear, smack, damage, kill, stomp, a pizza destroyed,
// every frame) and the kit does the rest through the Arena and a few scene callbacks.
//
// Strength: an enhanced pizza's perk counts 1.5 (about +50%), Napoletana adds 5% per copy, and
// Mystery Meat's perk is "big" (counts half as much again). Run.perkCounts already sums the enhanced
// half, so table-wide perks read `c(perk)`; perks tied to one pizza read `pk(p)`.

import Phaser from 'phaser';
import { drawChest, drawDiscoBall, drawGhostRing, drawLightBeam, drawMeatball, drawMeteor, drawMusicNote, drawWaltzGhost, drawComet, drawSandWall, drawMaze, drawEmbers, drawFeather, drawFleece } from '../art/perkProps';
import { drawBifrostBand, drawHowlingWolf, drawRuneStone, drawSerpentCoil } from '../art/perkPropsNorse';
import { PIZZAS, enhancedText, type PizzaPerk } from '../data/pizzas';
import { FOOT_BY_ID } from '../data/feet';
import { HOVER_Y } from '../config';
import { tunaTips } from '../data/perkWave';
import { WAVES_PER_ACT } from '../data/stages';
import { save } from '../systems/save';
import { audio } from '../systems/audio';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';
import type { Run } from './Run';
import { applyAll, Effect, Grows, Op, Phase, Stat, Unit, UnitKind, type EffectData } from '../effects';
import { isGrowing, type Ledger, type ValueCtx } from '../effects/ledger';
import { Source, type PizzaSource, type SourceKey, type SourceRef, type SourceShare } from '../effects/source';
import { STAT_DEFS } from '../effects/stats';
import { TILT } from '../art/pizzaArt';
import { toppingDrawer } from '../art/registry';
import { makeCanvas, rng } from '../art/util';
import { crand } from '../systems/cosmeticRandom';
import { LEGEND_SFX, LegendKit } from './pizzaLegends';
import { Answer, GameEvent, HitStat, grantsPerk, type ActionHost, type Fire, type HitQuery, type HitStatId } from '../effects';
import { runAction } from '../effects/actions';
import { legendDmg } from './legendary';
import type { AtData } from '../effects/actions';
import { PerkBus, type BusHost } from './perkBus';
import { Custom, Factor, Flag, Look, type CustomId, type FactorId, type FlagId, type LookId } from './perkEffects';
import { pizzaOf } from '../effects/events';
import { Rule } from '../effects/rule';
import { boostOf, declares, hasRule, ruleOf } from './perkRules';
import { Rarity } from '../data/rarity';

/** Perks Arcobaleno can't borrow: set up when a pizza is placed, tied to its own type, or another borrower. */
const BORROW_SKIP = new Set<PizzaPerk>([
  'rainbow', 'mystery', 'rotate', 'slices', 'bossRegrow', 'neverStale', 'staleHeal', 'riseOnce', 'refund',
  'bigStart', 'erupt', 'surviveOnce', 'firstBack', 'crustWaves', 'crustBonus', 'crustRun', 'echo',
  // the Legendaries' once-a-run perks (The First Bake's slice over the top)
  'firstBake',
]);
/** Perks Arcobaleno never borrows besides those: the Legendaries' (they're kept scarce by their price and gates). */
const LEGEND_PERKS = new Set<PizzaPerk>(PIZZAS.filter((p) => p.rarity === Rarity.Legendary).map((p) => p.perk));
/** Perks Echo Slice won't copy: the same as Arcobaleno's (set up when a pizza is placed, tied to its own type, once a
 *  run, the crust earners, the other borrowers) and itself. It does copy a Legendary's once-a-wave or timed perk
 *  (Nonna's ladle: one more swat a wave; Silver Service: the tray twice as often; Big Top Pie: the cannon twice as
 *  often; Sandcastle Citadel: 3 more stomps a wave; Tidal Tiki: one more slice from the tide; Cosmic Crouton Supreme:
 *  its 1% more; Roar Roast and Black Olive Hole: twice as often), never a once-a-run one (The First Bake). It counts as a second copy of anything else, doing what two
 *  of that pizza would. */
export const ECHO_SKIP = BORROW_SKIP;
/** Every perk a pizza has, for Echo Slice's flag (it keeps its copy as an index: 1 + its place here; 0 nothing). */
const ALL_PERKS: PizzaPerk[] = [...new Set(PIZZAS.map((p) => p.perk))];

/** The pizza an Echo Slice is copying now, or null. */
export function echoSource(p: Pizza): (typeof PIZZAS)[number] | null {
  return PIZZAS[Number(p.flags.echoFrom ?? 0) - 1] ?? null;
}

/** The perk an Echo Slice copies now, or null (nothing beside it to copy). */
export function echoPerk(p: Pizza): PizzaPerk | null {
  return ALL_PERKS[Number(p.flags.echo ?? 0) - 1] ?? null;
}
/** Arcobaleno's pool: every other pizza's perk. */
export const BORROW_POOL: PizzaPerk[] = [...new Set(PIZZAS.map((p) => p.perk))].filter((k) => !BORROW_SKIP.has(k) && !LEGEND_PERKS.has(k));
/** Mystery Meat's big perks: strong on any table. */
export const MYSTERY_POOL: PizzaPerk[] = ['damage', 'coins', 'crit', 'critDmg', 'double', 'execute', 'burnHits', 'explode', 'splash', 'radius', 'regenAll', 'meteor', 'timeStop', 'fireLane', 'orbitRing', 'ghostPass'];

/** Sounds the perks play that aren't loaded at boot (the scene loads them with the run): Granite Crust's stone,
 *  Disco Diner Pie's jukebox, Lodge Fondue Pie's cheese, and the Epic Chef's Specials' sounds from their bosses (the
 *  Kraken's ink, the Yeti's snowball, King Honk's pie, Sandcastle Sam's walls, T-Rex Toes' growl, Iron Heel's steam,
 *  the Chimney Sweep's soot, the Cosmic Croc's meteor, the Phantom King's stir). All CC0 or CC-BY and credited already. */
export const PERK_SFX = [
  'sfx_gargoyle_stone', 'sfx_smack_tail_jukebox', 'sfx_venomnom_goo',
  'sfx_kraken_squirt', 'sfx_kraken_inked', 'sfx_yeti_snowball', 'sfx_smack_snow_heavy', 'sfx_clownking_piesplat', 'sfx_clownking_honk',
  'sfx_sandcastle_walls', 'sfx_sandcastle_sandland', 'sfx_smack_sand_heavy', 'sfx_trex_growl', 'sfx_smack_stone_heavy', 'sfx_ironheel_steam',
  'sfx_ironheel_vent', 'sfx_sweep_soot', 'sfx_cosmiccroc_meteor', 'sfx_cosmiccroc_impact', 'sfx_phantomking_stir', 'sfx_phantomking_fade',
  'sfx_smack_ghost_heavy',
  // the Epic Pizzeria pizzas (step 4, batch 2), from Act 9's myths: the Colossus's anvil, Medusa's gaze and stone,
  // Cerberus's barks, the Minotaur's walls, Hades' flare, the Sirens' song, the Harpies' screech, Charybdis's whirlpool
  // and the Golden Fleece's coins
  'sfx_colossus_anvil', 'sfx_colossus_clang', 'sfx_medusa_gaze', 'sfx_medusa_petrify', 'sfx_medusa_crumble', 'sfx_cerberus_bark',
  'sfx_cerberus_growl', 'sfx_minotaur_walls', 'sfx_minotaur_snort', 'sfx_hades_flare', 'sfx_sirensong', 'sfx_harpy', 'sfx_whirlpool',
  'sfx_kraken_splash', 'sfx_hero_coins', 'sfx_smack_gold_heavy',
  // the Epic milestones and Echo Slice (step 4, batch 3), from Act 8's Norse bosses: Fenrir's howl and snap, the
  // Bifröst's parting clouds, the Skald's saga, Thrym's cracking ice, Surtr's fireball and ignite, Jörmungandr's
  // constrict and hiss, and the Mirror Peel's echo
  'sfx_fenrir_howl', 'sfx_fenrir_snap', 'sfx_sungap', 'sfx_skaldsong', 'sfx_thrym_crack', 'sfx_thrym_shatter', 'sfx_surtr_fireball',
  'sfx_surtr_ignite', 'sfx_jormungandr_constrict', 'sfx_jormungandr_hiss', 'sfx_mirrorpeel_echo',
  // the Legendaries (step 5): src/game/pizzaLegends.ts
  ...LEGEND_SFX,
];

/** The perk a borrowing pizza (Arcobaleno, Mystery Meat) has right now, or null. */
export function borrowedPerk(p: Pizza): PizzaPerk | null {
  // Echo Slice: the perk of the pizza beside it (PizzaPerkKit.syncEchoes keeps it up to date)
  const own = p.type.perk;
  if (declares(own, Rule.Echo)) return echoPerk(p);
  if (declares(own, Rule.Borrow)) return p.flags.borrow === undefined ? null : BORROW_POOL[Number(p.flags.borrow) % BORROW_POOL.length];
  if (declares(own, Rule.Mystery)) return p.flags.mystery === undefined ? null : MYSTERY_POOL[Number(p.flags.mystery) % MYSTERY_POOL.length];
  return null;
}

/** A perk's card line, plain or enhanced (from the first pizza that has it). */
export function perkTextOf(perk: PizzaPerk, enhanced: boolean): string {
  if (enhanced) return enhancedText(perk);
  return PIZZAS.find((q) => q.perk === perk)?.perkText ?? perk;
}

/** Kitchen Sink's three picks: what it adds this wave (PizzaPerkKit.modifiers, below). */
export const SINK_PICKS = ['smack damage', 'tips', 'crit chance'] as const;

/** Kitchen Sink's bonus in whole percent at a strength (5% plain; enhanced 7.5% reads 8, as other perks round). */
export function sinkPct(k: number): number {
  return Math.round(5 * k);
}

/** The line a borrowing pizza shows on the table and its shop card (Kitchen Sink: this wave's pick). */
export function borrowLine(p: Pizza, enhanced: boolean): string | null {
  const own = p.type.perk;
  if (declares(own, Rule.Sink)) return p.flags.sink === undefined ? null : `This wave: +${sinkPct(enhanced ? 1.5 : 1)}% ${SINK_PICKS[Number(p.flags.sink) % 3]}`;
  if (declares(own, Rule.Mystery) && !p.flags.revealed) return enhanced ? enhancedText(own) : p.type.perkText;
  // (the pizza it copies sits right beside it with its perk in full; the STATS tab spells the copy out)
  if (declares(own, Rule.Echo)) return echoPerk(p) ? `Echoing ${echoSource(p)?.name ?? 'its neighbour'}` : 'Echoing nothing';
  const b = borrowedPerk(p);
  return b ? perkTextOf(b, enhanced || declares(own, Rule.Mystery)) : null;
}

/** What the scene lends the kit (its private parts, as callbacks). */
export interface PerkHost {
  run(): Run;
  /** tag: where the STATS tab files it (each perk's own key). */
  dealDamage(f: Foot, amount: number, source: 'explode' | 'olive' | 'cutter' | 'direct', knock?: number, tag?: string): void;
  giveTips(n: number, x: number, y: number): void;
  healPizza(p: Pizza, n: number): void;
  neighbours(p: Pizza): Pizza[];
  recompute(): void;
  /** One more free reroll in the next shop. */
  addReroll(): void;
  toast(id: string, title: string, body: string): void;
  /** Move a foot to a free lane over another pizza (Squid Ink Nero): the new pizza, or null if none is free. */
  relane(f: Foot): Pizza | null;
  /** Defeat a foot outright (Act 3's portal and black hole): a kill, paid and counted like any. */
  kill(f: Foot): void;
}

/** Sandcastle Sundae's wall towers: its sandcastle topping, drawn large. */
function drawSandcastle(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 150);
  ctx.translate(75, 84);
  ctx.scale(2.6, 2.6);
  toppingDrawer('sandcastle')?.draw(ctx, rng(5));
  return c;
}

/** Phantom Waltz's friendly ghost: a sprite guarding a pizza (never a foot, so nothing can zombify it). */
interface Ghost {
  p: Pizza;
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  ph: number;
  ready: boolean;
}

interface Chest {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  open: boolean;
}

export class PizzaPerkKit {
  private a: Arena;
  private h: PerkHost;
  private sc: Phaser.Scene;
  private timeStopT = 0;
  /** Tikka Time Machine's freeze, waiting for the wave's first feet to arrive. */
  private timeStopPending = 0;
  private rings: { p: Pizza; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; i: number }[] = [];
  private ringAngle = 0;
  private ringCd = new WeakMap<Foot, number>();
  private phases = new WeakMap<Foot, number>();
  private lastStomp = new WeakMap<Pizza, number>();
  private chest: Chest | null = null;
  /** Seconds this wave with a foot on the table (Speed Slice's goal), and kills this wave. */
  private footTime = 0;
  private waveKills = 0;
  /** A pizza was destroyed this run (Untouchable's goal). */
  private lost = false;
  /** A wave's opening changed a perk (a new colour, a pick): the stats are worked out again after it. */
  private changed = false;
  /** Seaside Fritto: a slice was lost last wave, so this one pays more (saved with the run). */
  lostLastWave = false;
  /** Rinkside Pretzel Pie: smacks are quicker until then (arena seconds). */
  private rushUntil = -99;
  // ——— the Epic Chef's Specials (step 4, batch 1) ———
  /** Squid Ink Nero: inked feet, wandering off to a new lane until then (arena seconds), and the ink on them. */
  private inked = new Map<Foot, { until: number; bx: number; ph: number; blobs: Phaser.GameObjects.Image[]; tintAt: number }>();
  /** Cream Pie Supreme: the pie splat left on a pizza, where it lies. */
  private splats = new Map<Pizza, { img: Phaser.GameObjects.Image; dx: number }>();
  /** Sandcastle Sundae: stomps the sand wall can still block this wave, and its towers beside the pies. */
  private sandLeft = 0;
  private sandTowers: Phaser.GameObjects.Image[] = [];
  /** T-Rex Ribs: the table shakes (+damage) until then (arena seconds); when its last shake played. */
  private quakeUntil = -99;
  private quakeFx = -99;
  /** Chimney Soot Pie: the pizza each foot was last sooted over (once per arrival), and the soot on it now. */
  private sootFor = new WeakMap<Foot, Pizza>();
  private sooted = new Map<Foot, { until: number; bx: number; ph: number; clouds: Phaser.GameObjects.Image[]; tintAt: number }>();
  /** Phantom Waltz: the friendly ghosts guarding pizzas (sprites, never feet: nothing can zombify them). */
  private ghosts: Ghost[] = [];
  // ——— the Epic Pizzeria pizzas (step 4, batch 2) ———
  /** Colossus Forge: waves survived this run (saved with the run). */
  forgeWaves = 0;
  /** Gorgon's Gaze: feet turned to stone (×2 damage) until then, and the cracks on them. */
  private stoned = new Map<Foot, { until: number; crack: Phaser.GameObjects.Image; tintAt: number }>();
  /** Labyrinth Lasagne: lost feet. Their wait starts when they're back in their hover (start < 0 till then). */
  private lostFeet = new Map<Foot, { start: number; sec: number; maze: Phaser.GameObjects.Image }>();
  /** Ember Shade: embers left where feet fell, waiting for the next foot through. */
  private embers: { x: number; y: number; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; ph: number; done: boolean }[] = [];
  /** Harpy Feather Pie: seconds since each pie's last gust, and the feet being blown up (px still to go). */
  private harpyT = new Map<Pizza, number>();
  private blown = new Map<Foot, number>();
  /** Charybdis Swirl: feet spinning in a whirlpool, and the whirl under them. */
  private whirled = new Map<Foot, { until: number; img: Phaser.GameObjects.Image; tintAt: number }>();
  // ——— the Epic milestones (step 4, batch 3) ———
  /** Rainbow Bridge: the lanes bridged this wave (+40% damage to feet in them) and the Bifröst over each. */
  private bridges: { src: Pizza; perk: string; lane: Pizza; x: number; r: number; k: number; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; ph: number }[] = [];
  /** Serpent's Coil: feet held in Jörmungandr's coils until then, and the coils on them. */
  private coiled = new Map<Foot, { until: number; img: Phaser.GameObjects.Image; tintAt: number; s: number }>();
  /** When a quip of each kind last played (they'd stack up over a busy wave). */
  private quipAt: Record<string, number> = {};
  /** The Legendaries' perks (src/game/pizzaLegends.ts). */
  readonly legends: LegendKit;
  /** The trigger bus the ported perks run on (src/game/perkBus.ts, src/game/perkEffects.ts), and its view of the game. */
  private bus: PerkBus;
  private host: BusHost;

  constructor(arena: Arena, host: PerkHost) {
    this.a = arena;
    this.h = host;
    this.sc = arena.sc;
    const tex: [string, () => HTMLCanvasElement][] = [
      ['pk_meatball', drawMeatball],
      ['pk_meteor', drawMeteor],
      ['pk_ring', drawGhostRing],
      ['pk_chest', () => drawChest(false)],
      ['pk_chest_open', () => drawChest(true)],
      ['pk_disco', drawDiscoBall],
      ['pk_note', drawMusicNote],
      ['pk_beam', drawLightBeam],
      ['pk_waltzghost', drawWaltzGhost],
      ['pk_comet', drawComet],
      ['pk_sandcastle', drawSandcastle],
      ['pk_sandwall', drawSandWall],
      ['pk_maze', drawMaze],
      ['pk_embers', drawEmbers],
      ['pk_feather', drawFeather],
      ['pk_fleece', drawFleece],
      ['pk_bifrost', drawBifrostBand],
      ['pk_coil', drawSerpentCoil],
      ['pk_wolf', drawHowlingWolf],
      ['pk_rune0', () => drawRuneStone(0)],
      ['pk_rune1', () => drawRuneStone(1)],
      ['pk_rune2', () => drawRuneStone(2)],
    ];
    for (const [k, draw] of tex) if (!this.sc.textures.exists(k)) this.sc.textures.addCanvas(k, draw());
    this.legends = new LegendKit(arena, {
      run: () => this.run,
      c: (perk) => this.c(perk),
      granting: (perk) => this.with(perk),
      bossFight: () => this.bossOn(),
      dealDamage: (f, n, source, knock, tag) => host.dealDamage(f, n, source, knock, tag),
      recompute: () => host.recompute(),
      heal: (p, n) => host.healPizza(p, n),
      kill: (f) => host.kill(f),
      strike: (f, perk, act, k = 1) => void runAction(act, this.host, { perk, ev: { foot: f }, foot: f, pizza: null, pizzas: [], k: () => k }),
    });
    this.host = this.busHost();
    this.bus = new PerkBus(this.host);
  }

  /** The shared actions' game side (tips, heals, the clock, hits…), for the peel's bus too (src/game/peelBus.ts). */
  actionHost(): ActionHost {
    return this.host;
  }

  /** The bus's view of the game: the table and its strengths, the field, and the shared actions' game side. */
  private busHost() {
    const a = this.a;
    const h = this.h;
    const where = (at: AtData, fire: Fire): [number, number] => {
      if (at.at === 'foot' && fire.foot) return [fire.foot.cx, fire.foot.cy + at.dy];
      const p = fire.pizza ?? fire.pizzas[0];
      return p ? [p.x, p.surfaceY + at.dy] : [960, 800 + at.dy];
    };
    const host: BusHost = {
      c: (perk) => this.c(perk),
      pk: (p) => this.pk(p),
      granting: (perk) => this.with(perk),
      feet: () => a.allFeet(),
      possessed: () => a.possessed(), // eslint-disable-line effects/no-own-off-switch -- the bus's own view of the Ghost
      tips: (n, at, fire) => {
        const [x, y] = where(at, fire);
        h.giveTips(n, x, y);
      },
      reroll: () => h.addReroll(),
      heal: (p, n) => h.healPizza(p, n),
      table: () => a.alivePizzas(),
      neighbours: (p) => h.neighbours(p),
      meter: (add) => (this.run.super = Math.min(1, this.run.super + add)),
      crust: (n) => this.run.bank(n),
      damage: () => this.run.stats.damage,
      wave: () => this.wave(),
      boost: () => this.boost(),
      later: (ms, fn) => void this.sc.time.delayedCall(ms, fn),
      summon: (_ally, fire) => fire.foot && this.raiseGhost(fire.foot),
      show: (look, fire) => this.LOOKS[look as LookId](fire),
      custom: (id, fire) => this.CUSTOM[id as CustomId](fire),
      tunaTips: (wave, enhanced) => tunaTips(wave, enhanced),
      legendDmg: (m) => legendDmg(m, this.run.stats.damage, this.run.heat),
      hurt: (f, n, o, fire) => {
        if (o.push) f.knock(o.push);
        h.dealDamage(f, n, 'explode', o.knock, `perk:${fire.perk}`);
      },
      factor: (id, q) => this.FACTORS[id as FactorId](q),
      flag: (id) => this.FLAGS[id as FlagId](),
    };
    return host;
  }

  /** What's shown when a ported perk fires (Action.Show): quips, sounds, the pizza's moment. Never gameplay. */
  private readonly LOOKS: Record<LookId, (fire: Fire) => void> = {
    [Look.Fired]: (fire) => {
      for (const p of fire.pizzas) p.perkFired();
    },
    [Look.Pinata]: ({ foot: f }) => {
      if (!f) return;
      this.a.fx.party(f.cx, f.cy, 50);
      this.a.quip(f.cx, f.cy - 120, 'PIÑATA!', '#ff7ad9', 46);
      audio.sfx('sfx_combo', { rate: 1.2 });
    },
    [Look.FreeReroll]: ({ pizza: t }) => {
      if (!t) return;
      this.a.quip(t.x, t.surfaceY - 170, 'FREE REROLL!', '#ffb347', 36);
      t.perkFired({ quip: false });
      audio.sfx('sfx_coin', { rate: 1.3 });
    },
    [Look.Feast]: ({ pizza: p }) => {
      if (!p) return;
      this.a.quip(p.x, p.surfaceY - 180, 'FEAST! +1 SLICE ALL ROUND', '#7dff9a', 34);
      p.perkFired({ quip: false });
    },
    [Look.GarlicMeter]: ({ pizza: p }) => {
      if (!p) return;
      this.a.quip(p.x, p.surfaceY - 150, 'GARLIC BUTTER: METER UP', '#ffe08a', 30);
      p.perkFired({ quip: false });
    },
    [Look.Sticky]: ({ foot: f }) => {
      if (!f) return;
      f.tint(0xb07a4a);
      this.a.quip(f.x, f.cy - 120, 'STICKY!', '#d8a060', 36);
    },
    [Look.Fondue]: ({ foot: f, pizza: p }) => {
      if (!f) return;
      f.tint(0xffd870);
      this.a.quip(f.x, f.cy - 120, 'STUCK IN THE FONDUE!', '#ffd870', 34);
      this.a.sfx('sfx_venomnom_goo', { volume: 0.45, rate: 1.25, throttle: 200 });
      p?.perkFired({ quip: false });
    },
    [Look.Slipped]: ({ foot: f }) => {
      if (!f) return;
      this.a.quip(f.x, f.cy - 120, 'SLIPPED!', '#ff6a4d', 38);
      this.a.sfx('sfx_boing', { volume: 0.6, rate: 1.4 });
    },
    [Look.HotHoney]: ({ foot: f }) => {
      if (!f) return;
      if (!f.type.traits.includes('immuneSlow')) f.tint(0xffc040);
      this.a.quip(f.x, f.cy - 120, 'HOT HONEY!', '#ffb020', 38);
      this.a.sfx('sfx_fire', { volume: 0.5 });
    },
    [Look.ColdSmoked]: ({ foot: f }) => {
      if (!f) return;
      this.a.fx.frost(f.cx, f.cy);
      this.a.quip(f.x, f.cy - 120, 'COLD SMOKED!', '#a8e0ff', 38);
      this.a.sfx('sfx_freeze');
    },
    [Look.OldTown]: (fire) => {
      const p = fire.pizza;
      if (!p) return;
      this.a.quip(p.x, p.surfaceY - 170, `OLD TOWN: +${Math.round(6 * fire.k())} TIPS`, '#ffd23f', 32);
      p.perkFired({ quip: false });
    },
    [Look.MoonCheese]: (fire) => {
      this.a.quip(960, 330, 'MOON CHEESE: DOUBLE DAMAGE!', '#cfe4ff', 40);
      for (const p of fire.pizzas) p.perkFired({ quip: false });
    },
    [Look.VictoryLap]: () => this.a.quip(960, 330, 'VICTORY LAP!', '#ffd23f', 44),
    [Look.Tuna]: ({ pizzas: [p] }) => {
      if (!p) return;
      this.a.quip(p.x, p.surfaceY - 170, 'TUNA TIME!', '#ffe08a', 34);
      p.perkFired({ quip: false });
    },
    [Look.PerfectPie]: ({ pizzas: [p] }) => {
      if (p) this.a.quip(p.x, p.surfaceY - 190, 'PERFECT PIE!', '#ffd23f', 36);
    },
    [Look.FireLane]: ({ foot, ev, pizzas }) => void (foot && this.fireLane(foot.cx || ('x' in ev ? ev.x : 0), pizzas)),
    [Look.DanceBreak]: ({ pizzas }) => this.danceBreak(pizzas),
    [Look.DanceNote]: ({ foot }) => void (foot && this.danceNote(foot)),
    [Look.GhostPass]: ({ foot: f, pizza: p }) => {
      if (!f || !p) return;
      const a = this.a;
      a.quip(f.x, p.surfaceY - 140, 'PASSED RIGHT THROUGH!', '#bfe8ff', 38);
      p.perkFired({ quip: false });
      a.sfx('sfx_whoosh', { volume: 0.7, rate: 0.6 });
      a.fx.ring(p.x, p.surfaceY - 20, 0xbfe8ff, 2, 0.45);
      this.sc.tweens.add({ targets: p.root, alpha: { from: 0.25, to: 1 }, duration: 600, ease: 'Sine.Out' });
    },
    [Look.GoldenCrust]: ({ pizza: p }) => {
      if (!p) return;
      this.a.quip(p.x, p.surfaceY - 190, '+1 GOLDEN CRUST', '#ffd23f', 36);
      p.perkFired({ quip: false });
      this.a.fx.glint(p.x, p.surfaceY - 60, 8);
    },
  };

  /** The ported perks' one-offs (Action.Custom): each still the kit's own, with its look. False: it didn't happen. */
  private readonly CUSTOM: Record<CustomId, (fire: Fire) => boolean | void> = {
    [Custom.Meteor]: ({ foot }) => void (foot && this.meteor(foot, this.run.stats.damage * 3)),
    [Custom.SteamVents]: () => this.steamVents(),
    [Custom.Comet]: ({ foot }) => void (foot && this.comet(foot)),
    [Custom.SirenSong]: () => this.sirenSong(),
    [Custom.PieSplat]: ({ foot }) => void (foot && this.pieSplat(foot)),
    [Custom.Embers]: ({ foot }) => void (foot && this.dropEmbers(foot)),
    [Custom.Fleece]: ({ foot }) => void (foot && this.fleece(foot)),
    [Custom.SpreadFire]: ({ foot }) => void (foot && this.spreadFire(foot)),
    [Custom.SagaVerse]: () => {
      this.h.recompute();
      for (const p of this.with('skaldSaga')) this.saga(p);
    },
    // Rinkside Pretzel Pie: a kill gets the smacks going (its pop shows when a rush starts, not on every kill)
    [Custom.KillRush]: () => {
      if (!this.rushing()) for (const p of this.with('killRush')) p.perkFired({ quip: false });
      this.rushUntil = this.a.now() + 3;
    },
    [Custom.Meatball]: (fire) => {
      const f = fire.foot;
      const t = fire.pizza;
      if (!f || !t) return;
      const k = fire.k();
      const x = f.cx;
      const y = f.cy;
      this.sc.time.delayedCall(120, () => this.meatball(x, y, t, k));
    },
    [Custom.InkSpray]: ({ foot, pizzas }) => void (foot && this.inkSpray(foot, pizzas)),
    [Custom.Snowball]: ({ pizza }) => !!pizza && this.snowball(pizza),
    [Custom.Whirlpool]: ({ foot }) => void (foot && this.whirlpool(foot)),
    [Custom.TripleBite]: ({ foot, pizza }) => void (foot && pizza && this.tripleBite(foot, pizza)),
    [Custom.Quake]: (fire) => void (fire.foot && this.quake(fire.foot, fire.k())),
    [Custom.Lose]: ({ foot, pizza }) => void (foot && pizza && this.lose(foot, pizza)),
    // Fire and Ice: frozen, then (once it thaws) burning
    [Custom.FrostFire]: (fire) => {
      const f = fire.foot;
      const p = fire.pizza;
      if (!f || !p) return;
      const a = this.a;
      if (!f.isBossLike) {
        f.stun(p.enhanced ? 2 : 1.5, true);
        a.fx.frost(f.cx, f.cy);
        a.sfx('sfx_freeze');
      }
      a.quip(f.x, f.cy - 120, 'FIRE AND ICE!', '#ffb070', 38);
      p.perkFired({ quip: false });
      const dps = 10 * fire.k();
      const canBurn = !f.type.traits.includes('immuneBurn');
      this.sc.time.delayedCall(f.isBossLike ? 100 : p.enhanced ? 2000 : 1500, () => {
        if (!f.alive || !canBurn) return;
        f.burnT = Math.max(f.burnT, 4);
        f.burnDps = Math.max(f.burnDps, dps);
        a.fx.burn(f.cx, f.cy);
        a.sfx('sfx_fire', { volume: 0.6 });
      });
    },
    [Custom.ForgeStrike]: ({ pizza }) => {
      if (pizza && this.forgeWaves > 0) this.forgeStrike(pizza);
    },
    [Custom.LossTipsQuip]: () => {
      if (!this.lossTipsOn()) return;
      const a = this.a;
      this.sc.time.delayedCall(1200, () => {
        const ps = this.with('lossTips');
        if (!ps.length) return;
        a.quip(ps[0].x, ps[0].surfaceY - 190, `SEASIDE FRITTO: +${Math.round(12 * this.c('lossTips'))}% TIPS`, '#8fe0ff', 30);
        for (const p of ps) p.perkFired({ quip: false });
      });
    },
    [Custom.Chest]: () => this.spawnChest(),
    // ——— the stomp defences: true when this one blocked it (the moment's pizza: pizzaOf) ———
    [Custom.Slip]: ({ foot, ev }) => {
      const p = pizzaOf(ev);
      return !!foot && !!p && this.slip(foot, p);
    },
    [Custom.ShellShut]: ({ foot: f, pizza: p }) => {
      if (!f || !p) return false;
      const a = this.a;
      const last = this.lastStomp.get(p) ?? -99;
      if (a.now() - last >= (p.enhanced ? 3 : 2)) return false;
      a.quip(f.x, p.surfaceY - 140, 'SHELL SHUT!', '#cfe8e0', 38);
      p.perkFired({ quip: false });
      a.sfx('sfx_shield', { volume: 0.7 });
      a.fx.ring(p.x, p.surfaceY - 20, 0xcfe8e0, 2, 0.45);
      f.knock(520);
      return true;
    },
    // Nonna's Masterpiece: her ladle swats the first stomp(s) of a wave (src/game/pizzaLegends.ts)
    [Custom.Ladle]: ({ foot, ev, pizzas }) => {
      const p = pizzaOf(ev);
      return !!foot && !!p && this.legends.ladle(foot, p, pizzas);
    },
    // Granite Crust: the stomp turns to stone on the pie
    [Custom.Stone]: ({ foot, pizza }) => {
      if (!foot || !pizza) return false;
      this.stone(foot, pizza);
      return true;
    },
    [Custom.GhostGuard]: ({ foot, ev }) => {
      const p = pizzaOf(ev);
      const g = p && this.ghosts.find((o) => o.p === p && o.ready);
      if (!foot || !g) return false;
      this.ghostBlock(g, foot);
      return true;
    },
    [Custom.SandWall]: ({ foot, ev }) => {
      const p = pizzaOf(ev);
      if (!foot || !p || this.sandLeft <= 0) return false;
      this.sandBlock(foot, p);
      return true;
    },
    // Sandcastle Citadel: its walls take what the Sundae's leave (src/game/pizzaLegends.ts)
    [Custom.CitadelWall]: ({ foot, ev }) => {
      const p = pizzaOf(ev);
      return !!foot && !!p && this.legends.citadelStomp(foot, p);
    },
    // ——— the per-foot auras ———
    [Custom.TimeStopArrive]: () => {
      const a = this.a;
      if (!(this.timeStopPending > 0 && a.allFeet().some((f) => f.alive && !f.isBossLike && f.y > 60))) return false;
      this.timeStopT = this.timeStopPending;
      this.timeStopPending = 0;
      a.flash(300, 140, 220, 255);
      a.quip(960, 300, 'TIME STOP!', '#9ae6ff', 56);
      a.sfx('sfx_freeze', { volume: 0.8 });
      for (const p of this.with('timeStop')) {
        a.fx.ring(p.x, p.surfaceY - 30, 0x9ae6ff, 2.4, 0.45);
        p.perkFired({ quip: false });
      }
    },
    [Custom.PestoSlow]: (fire) => {
      const f = fire.foot;
      if (!f) return false;
      f.brain.pestoT = Number(f.brain.pestoT ?? 0) + ('dt' in fire.ev ? fire.ev.dt : 0);
      f.slowAbove = Math.min(0.6, f.slowAbove + 0.1 * fire.k() * Number(f.brain.pestoT));
    },
    [Custom.PestoLetGo]: ({ foot: f }) => {
      if (f?.brain.pestoT) f.brain.pestoT = 0;
    },
    [Custom.ChorizoFlare]: ({ foot: f, pizza: t, ev }) => {
      if (!f || !t) return false;
      f.brain.chorizoT = Number(f.brain.chorizoT ?? 0) + ('dt' in ev ? ev.dt : 0);
      if (Number(f.brain.chorizoT) < (t.enhanced ? 1.3 : 2)) return;
      f.brain.chorizoT = -99;
      f.burnT = Math.max(f.burnT, 4);
      f.burnDps = Math.max(f.burnDps, 10);
      this.a.quip(f.x, f.cy - 120, 'CHORIZO FLARE!', '#ff7a3a', 34);
      this.a.sfx('sfx_fire', { volume: 0.5, throttle: 200 });
    },
    [Custom.TimeStopHold]: ({ foot: f, ev }) => {
      if (!f || !(this.timeStopT > 0 && !f.isBossLike && f.stunT < this.timeStopT)) return false;
      f.stun(this.timeStopT, true);
      if (crand() < ('dt' in ev ? ev.dt : 0) * 3) this.a.fx.frost(f.cx, f.cy);
    },
    [Custom.PhaseHeal]: ({ foot: f }) => {
      if (!f) return false;
      const a = this.a;
      const was = this.phases.get(f) ?? f.phase;
      if (f.phase > was) for (const p of this.with('phaseHeal')) {
        this.h.healPizza(p, p.enhanced ? 2 : 1);
        a.quip(p.x, p.surfaceY - 170, 'BURRATA BALM', '#fff6e2', 32);
        p.perkFired({ quip: false });
      }
      this.phases.set(f, f.phase);
    },
    // ——— a wave opening ———
    [Custom.GhostsBack]: () => {
      // the ghosts come back out to guard their pizzas (one whose pizza left the table in the shop goes with it)
      const table = this.a.alivePizzas();
      this.ghosts = this.ghosts.filter((g) => {
        if (table.includes(g.p)) return true;
        g.img.destroy();
        g.glow.destroy();
        return false;
      });
      for (const g of this.ghosts) {
        g.img.setVisible(true);
        g.glow.setVisible(true);
      }
    },
    // Bufala: shields up for the boss
    [Custom.BossShield]: ({ pizza: p }) => {
      if (!p) return false;
      p.setShield(p.shieldCharges + (p.enhanced ? 2 : 1));
      this.a.fx.ring(p.x, p.surfaceY - 30, 0xffe680, 2, 0.45);
      p.perkFired({ quip: false });
    },
    // Arcobaleno takes a new colour every wave
    [Custom.RainbowShift]: ({ pizza: p }) => {
      if (!p) return false;
      const a = this.a;
      const was = Number(p.flags.borrow ?? -1);
      let next = Math.floor(Math.random() * BORROW_POOL.length);
      if (next === was) next = (next + 1) % BORROW_POOL.length;
      p.flags.borrow = next;
      p.redraw();
      this.changed = true;
      this.sc.time.delayedCall(900, () => {
        if (p.dead) return;
        a.quip(p.x, p.surfaceY - 190, `RAINBOW: ${perkTextOf(BORROW_POOL[next], p.enhanced).toUpperCase()}`, '#ff9ae6', 26);
        p.perkFired({ quip: false });
      });
    },
    // Mystery Meat shows its hand on the first wave it plays (an Echo Slice beside it can copy it now)
    [Custom.MysteryReveal]: ({ pizza: p }) => {
      if (!p || p.flags.revealed) return false;
      const a = this.a;
      p.flags.revealed = true;
      p.redraw();
      this.changed = true;
      const line = borrowLine(p, p.enhanced) ?? '';
      this.sc.time.delayedCall(1000, () => {
        a.quip(p.x, p.surfaceY - 190, 'MYSTERY MEAT REVEALED!', '#c8a8ff', 34);
        p.perkFired({ quip: false });
        this.h.toast(p.type.id, 'MYSTERY MEAT REVEALED', line);
        a.sfx('sfx_levelup', { volume: 0.5, rate: 1.3 });
      });
    },
    // Kitchen Sink: this wave's pick (made when it was placed or the last wave cleared, so the shop shows it)
    [Custom.SinkWave]: ({ pizza: p }) => {
      if (!p) return false;
      if (p.flags.sink === undefined) {
        p.flags.sink = Math.floor(Math.random() * 3);
        p.redraw();
        this.changed = true;
      }
      this.sc.time.delayedCall(900, () => {
        if (p.dead) return;
        this.a.quip(p.x, p.surfaceY - 190, `KITCHEN SINK: +${sinkPct(this.pk(p))}% ${SINK_PICKS[Number(p.flags.sink) % 3].toUpperCase()}`, '#ffd23f', 28);
        p.perkFired({ quip: false });
      });
    },
    [Custom.SandUp]: () => this.sandUp(),
    [Custom.BridgeUp]: (fire) => this.bridgeUp(fire.perk, fire.pizzas),
    [Custom.HarpyReset]: () => this.harpyT.clear(),
    // Tikka Time Machine: the clock stops once the wave's first feet are on the table (they arrive a moment after the
    // banner)
    [Custom.TimeStopSet]: () => {
      const k = this.c('timeStop');
      this.timeStopPending = k > 0 ? Math.min(5, 3 * k) : 0;
      this.timeStopT = 0;
    },
    // ——— placed, enhanced, destroyed (the moment's pizza) ———
    [Custom.CenturyStart]: ({ ev }) => void pizzaOf(ev)?.addSlices(2),
    [Custom.BorrowFirst]: ({ ev }) => {
      const p = pizzaOf(ev);
      if (!p || p.flags.borrow !== undefined) return false;
      p.flags.borrow = Math.floor(Math.random() * BORROW_POOL.length);
    },
    [Custom.MysteryFirst]: ({ ev }) => {
      const p = pizzaOf(ev);
      if (!p || p.flags.mystery !== undefined) return false;
      p.flags.mystery = Math.floor(Math.random() * MYSTERY_POOL.length);
    },
    [Custom.SinkFirst]: ({ ev }) => {
      const p = pizzaOf(ev);
      if (!p || p.flags.sink !== undefined) return false;
      p.flags.sink = Math.floor(Math.random() * 3);
    },
    [Custom.CenturyGrow]: ({ ev }) => void pizzaOf(ev)?.addSlices(2),
    [Custom.CitadelPennant]: ({ ev }) => {
      const p = pizzaOf(ev);
      if (p) p.flags.citadelLeft = 4;
    },
    // Volcano Calzone: ×10 to every foot on the screen
    [Custom.Erupt]: ({ ev }) => {
      const p = pizzaOf(ev);
      if (p) this.erupt(p);
    },
    // Olympian Feast: the gods say not today (once a run)
    [Custom.Olympian]: ({ ev }) => {
      const p = pizzaOf(ev);
      if (!p || p.flags.olympUsed || !('answer' in ev)) return false;
      const a = this.a;
      p.flags.olympUsed = true;
      p.revive(p.enhanced ? 3 : 1);
      a.fx.healBurst(p.x, p.surfaceY);
      a.fx.ring(p.x, p.surfaceY - 30, 0xffe680, 2.4, 0.45);
      a.quip(p.x, p.surfaceY - 170, 'THE GODS SAY NOT TODAY!', '#ffe680', 38);
      p.perkFired({ quip: false });
      a.sfx('sfx_shield');
      ev.answer = Answer.Survive;
    },
    // Fenrir's Howl: the wolf howls for the lost pizza (its own loss too, a last howl)
    [Custom.FenrirHowl]: (fire) => {
      const ev = fire.ev;
      const p = pizzaOf(ev);
      if (!p || !('fresh' in ev)) return false;
      // (its own loss: a last howl, unless its perk was frozen as it went)
      // eslint-disable-next-line effects/no-own-off-switch -- its own moment (Outlives.OwnMoment): the lost pizza's own state
      const ownHowl = (p.type.perk === fire.perk || (declares(p.type.perk, Rule.Echo) && echoPerk(p) === fire.perk)) && ev.fresh && !p.perkFrozen;
      if (!(this.c('fenrirHowl') > 0 || ownHowl)) return false;
      this.howl(p, (ownHowl && p.enhanced) || this.with('fenrirHowl').some((q) => q.enhanced));
    },
    // Untouchable: the first pizza lost each run (it included) comes back
    [Custom.Untouchable]: ({ ev, perk }) => {
      const p = pizzaOf(ev);
      if (!p || !('answer' in ev)) return false;
      const a = this.a;
      // (its own loss counts: the run's first loss, it included)
      const keeper = [...this.a.alivePizzas(), p].find((q) => q.type.perk === perk && !q.perkOff && !q.flags.untouchUsed); // eslint-disable-line effects/no-own-off-switch -- its own loss: the keeper is whichever Untouchable still grants, the lost one too
      if (!keeper || this.untouchUsed(perk)) return false;
      keeper.flags.untouchUsed = true;
      const full = keeper.enhanced;
      this.sc.time.delayedCall(1100, () => {
        p.revive(full ? p.maxSlices : Math.max(2, Math.ceil(p.maxSlices / 2)));
        a.fx.healBurst(p.x, p.surfaceY);
        a.fx.ring(p.x, p.surfaceY - 30, 0xffffff, 2.4, 0.45);
        a.quip(p.x, p.surfaceY - 160, 'UNTOUCHABLE!', '#ffffff', 48);
        p.perkFired({ quip: false });
        a.sfx('sfx_heal');
        this.h.recompute();
      });
      ev.answer = Answer.Rise;
    },
    // ——— the ticking props ———
    [Custom.HarpyTick]: ({ ev, pizzas }) => this.harpyGusts('dt' in ev ? ev.dt : 0, pizzas),
    [Custom.HarpyBlown]: ({ ev }) => this.harpyBlown('dt' in ev ? ev.dt : 0),
    [Custom.BridgeTick]: () => this.bridgeTick(),
    [Custom.CoilTick]: ({ pizzas }) => this.coilCatch(pizzas),
    [Custom.CoilHold]: () => this.coilHold(),
    [Custom.GorgonTick]: ({ perk }) => this.gorgonGaze(perk),
    [Custom.GorgonStone]: () => this.gorgonStone(),
    [Custom.MazeTick]: () => this.mazeTick(),
    [Custom.EmberTick]: ({ pizzas }) => this.emberTick(pizzas),
    [Custom.WhirlTick]: () => this.whirlTick(),
    [Custom.InkTick]: ({ ev }) => this.inkTick('dt' in ev ? ev.dt : 0),
    [Custom.SootTick]: ({ perk }) => this.sootSettle(perk),
    [Custom.SootCloud]: ({ ev }) => this.sootClouds('dt' in ev ? ev.dt : 0),
    [Custom.GhostTick]: () => this.ghostTick(),
    [Custom.RingsTick]: ({ ev }) => this.ringsTick('dt' in ev ? ev.dt : 0),
    [Custom.NonnaSecret]: ({ pizzas }) => this.nonnaCheck(pizzas[0]),
    // ——— the wave closing ———
    [Custom.RingsDown]: () => this.dropRings(),
    [Custom.EpicsAway]: () => this.clearEpics(false),
    [Custom.SinkNext]: ({ pizza: p }) => {
      if (!p) return false;
      p.flags.sink = Math.floor(Math.random() * 3);
      p.redraw();
    },
    // ——— the Legendaries (src/game/pizzaLegends*.ts) ———
    [Custom.BridgeSparks]: ({ foot: f }) => {
      if (f && this.bridges.length && this.bridgeMult(f) > 1) this.bridgeHit(f);
    },
    [Custom.FrostSparks]: ({ foot: f }) => void (f && this.frostbiteHit(f)),
    [Custom.RoarSparks]: ({ foot: f }) => void (f && this.legends.act3.roarSparks(f)),
    [Custom.Portal]: ({ foot: f }) => void (f && this.legends.act3.portalOn(f)),
    [Custom.RoarEnd]: () => this.legends.act3.roarEnd(),
    [Custom.HoleEnd]: () => this.legends.act3.holeEnd(),
    [Custom.CitadelDown]: ({ perk }) => this.legends.citadelDown(perk),
    [Custom.TideOff]: () => this.legends.tideOff(),
    [Custom.BakeFreshen]: ({ ev }) => this.legends.bakeFreshen('wave' in ev ? ev.wave : this.wave()),
    [Custom.LadleReady]: () => this.legends.ladleReady(),
    [Custom.CitadelUp]: ({ perk }) => this.legends.citadelUp(perk as PizzaPerk),
    [Custom.TideReady]: ({ ev, perk }) => this.legends.tideReady('wave' in ev ? ev.wave : this.wave(), perk as PizzaPerk),
    [Custom.FirstBake]: ({ pizzas }) => this.legends.firstBake(pizzas),
    [Custom.Act3Timers]: ({ ev }) => this.legends.act3.timersTick('dt' in ev ? ev.dt : 0),
    [Custom.HoleStep]: ({ ev }) => this.legends.act3.holeStep('dt' in ev ? ev.dt : 0),
    [Custom.RippleStep]: ({ ev }) => this.legends.act3.rippleStep('dt' in ev ? ev.dt : 0),
    [Custom.TideTick]: ({ ev, pizzas }) => this.legends.tideTick('dt' in ev ? ev.dt : 0, pizzas),
    [Custom.Cannon]: ({ foot }) => void (foot && this.legends.cannon(foot)),
    [Custom.Tray]: () => this.legends.tray(),
    [Custom.HalfStomp]: ({ foot, pizza, ev }) => {
      if (!foot || !pizza || !('dmg' in ev)) return false;
      ev.dmg = this.halfStomp(foot, pizza, ev.dmg);
      return true;
    },
  };

  // ——— strength ———
  private get run(): Run {
    return this.h.run();
  }

  /** Napoletana's boost to every other perk. */
  boost(): number {
    return boostOf(this.run.perkCounts);
  }

  /** Table-wide strength of a perk (0 when no pizza has it). */
  c(perk: PizzaPerk): number {
    return (this.run.perkCounts[perk] ?? 0) * this.boost();
  }

  /** One pizza's strength: 1, 1.5 enhanced, half as much again for Mystery Meat. */
  pk(p: Pizza): number {
    return (1 + (p.enhanced ? 0.5 : 0) + (ruleOf(p, Rule.Mystery) ?? 0)) * this.boost();
  }

  /** The pizzas granting a perk now, by the bus's off-switch (grantsPerk: a possessed pizza's perk is the Ghost's, not
   *  yours, so it's left out, as Tuna is). */
  private with(perk: PizzaPerk): Pizza[] {
    return this.a.alivePizzas().filter((p) => grantsPerk(p, perk));
  }

  private wave(): number {
    return this.run.wave;
  }

  /** Which act this is, counting endless loops on (a fresh act each 10 waves). */
  private act(): number {
    return Math.floor((this.wave() - 1) / WAVES_PER_ACT);
  }

  /** Mystery Meat's perk counts as a big (enhanced-strength) one. */
  bigPerks(live: Pizza[]): PizzaPerk[] {
    return live.filter((p) => hasRule(p, Rule.Mystery) && p.perk).map((p) => p.perk!);
  }

  // ——— placing and the run ———
  /** A pizza joins the table: Century Crust's extra slices, the borrowers' first perks (on the bus). */
  placed(p: Pizza, fresh: boolean): void {
    this.bus.emit(GameEvent.Placed, { pizza: p, fresh });
  }

  /** A pizza was enhanced: Century Crust grows to 12 slices, the Citadel's fourth pennant (on the bus). */
  enhanced(p: Pizza): void {
    this.bus.emit(GameEvent.Enhanced, { pizza: p });
  }

  /** A new run (not a continue): count night runs, start the perfect streak over. */
  runStart(): void {
    const g = save.pizzaGoals;
    const hr = new Date().getHours();
    if (hr >= 22 || hr < 5) g.nightRuns = (g.nightRuns ?? 0) + 1;
    g.perfectStreak = 0;
    this.lost = false;
    this.lostLastWave = false;
    this.bus.resetRun();
    this.forgeWaves = 0;
    this.legends.runStart();
  }

  /** A saved run comes back: did it lose a pizza already? */
  restored(pizzas: Pizza[]): void {
    this.lost = pizzas.some((p) => p.dead || p.flags.lost);
    // older saves (and dev scenarios) may lack a borrower's pick
    for (const p of pizzas) this.placed(p, false);
  }

  /** The run is over: Untouchable's and Combo King's records. */
  runEnd(victory: boolean): void {
    const g = save.pizzaGoals;
    g.bestCombo = Math.max(g.bestCombo ?? 0, this.run.bestCombo);
    if (victory && !this.lost) g.untouched = 1;
  }

  // ——— stats ———
  /** Each pizza's ledger id, for as long as it's on the table (moving it keeps it). */
  private uids = new WeakMap<Pizza, number>();
  private nextUid = 1;

  /** A pizza's ledger source: its kind and its own id ('pizza:colossusforge#7'). */
  srcOf(p: Pizza): PizzaSource {
    let id = this.uids.get(p);
    if (id === undefined) this.uids.set(p, (id = this.nextUid++));
    return Source.Pizza(p.type.id, id);
  }

  /** The pizza on the table a ledger source names (null: gone). */
  pizzaOf(source: SourceKey): Pizza | null {
    return this.a.allPizzas().find((p) => this.srcOf(p) === source) ?? null;
  }

  /** What the growing perks count right now (Peel Collector's peels, the Forge's waves, the Saga's bosses, Napoli
   *  DOC's kinds of pizza). */
  valueCtx(): ValueCtx {
    return {
      peels: new Set(['classic', ...save.peels]).size,
      forgeWaves: this.forgeWaves,
      bosses: this.skaldBosses(),
      kinds: new Set(this.a.alivePizzas().map((p) => p.type.id)).size,
      wave: this.run.wave,
    };
  }

  /** The table-shaped perks, on the capped stats (the ledger's Table phase). skip: pizzas whose perk is off (the
   *  Ghost's). A perk the whole table shares is shared by the pizzas granting it, by strength. */
  modifiers(L: Ledger, skip: (Pizza | null | undefined)[] = []): void {
    const put = (source: SourceRef, list: EffectData[]) => applyAll(list, { ledger: L, source, phase: Phase.Table });
    const shared = (perk: PizzaPerk): SourceShare => this.run.withBoost(Object.fromEntries(this.with(perk).filter((p) => !skip.includes(p)).map((p) => [this.srcOf(p), this.pk(p) / this.boost()])) as SourceShare);
    /** One pizza, with Napoletana's part of it. */
    const one = (p: Pizza) => this.run.withBoost({ [this.srcOf(p)]: 1 });
    const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
    // Napoli DOC: +5% damage for every kind of pizza out
    const variety = this.c('varietyDmg');
    if (variety) put(shared('varietyDmg'), [
      Effect.Stat(
        Stat.Damage,
        Op.Boost(Grows((x) => Unit.scale(Unit.scale(Unit.Percent(5), variety), x.kinds), (x) => `${many(x.kinds, 'kind', 'kinds')} of pizza out`)),
      ),
    ]);
    // Peel Collector: +1% damage for every 10 peels owned
    const peels = this.c('peelDmg');
    if (peels) put(shared('peelDmg'), [
      Effect.Stat(
        Stat.Damage,
        Op.Boost(Grows((x) => Unit.scale(Unit.scale(Unit.Percent(1), peels), Unit.groups(x.peels, 10)), (x) => `${many(x.peels, 'peel', 'peels')} owned`)),
      ),
    ]);
    // Combo Champ: the whole combo window (its base length too) lasts longer
    const combo = this.c('comboLong');
    if (combo) put(shared('comboLong'), [
      Effect.Stat(
        Stat.ComboBonus,
        Op.Boost(Unit.of(UnitKind.Percent, combo)),
      ),
    ]);
    // there's no smack cooldown, so "faster smacks" are extra quick follow-up smacks
    const speed = this.c('smackSpeed');
    if (speed) put(shared('smackSpeed'), [
      Effect.Stat(
        Stat.DoubleChance,
        Op.Add(Unit.scale(Unit.Chance(15), speed)),
      ),
    ]);
    const crust = this.c('crustRun');
    if (crust) put(shared('crustRun'), [
      Effect.Stat(
        Stat.CrustBonus,
        Op.Add(Unit.scale(Unit.Percent(10), crust)),
      ),
    ]);
    // Colossus Forge: +1% damage a wave survived this run (up to +40%; enhanced 1.5% and 60%)
    for (const p of this.with('forgeWaves'))
      if (!skip.includes(p)) put(one(p), [
        Effect.Stat(
          Stat.Damage,
          Op.Boost(Grows((x) => Unit.Percent(this.forgePct(p, x.forgeWaves)), (x) => `${many(x.forgeWaves, 'wave', 'waves')} survived`)),
        ),
      ]);
    // Skald's Saga: +3% damage for every boss beaten this run (enhanced 4.5%)
    for (const p of this.with('skaldSaga'))
      if (!skip.includes(p)) put(one(p), [
        Effect.Stat(
          Stat.Damage,
          Op.Boost(Grows((x) => Unit.Percent(this.skaldPct(p, x.bosses)), (x) => `${many(x.bosses, 'boss', 'bosses')} beaten`)),
        ),
      ]);
    // Kitchen Sink: this wave's pick (tips and crits stay under their caps)
    for (const p of this.with('kitchenSink')) {
      if (p.flags.sink === undefined || skip.includes(p)) continue;
      const k = Unit.scale(Unit.Percent(5), this.pk(p));
      const pick = Number(p.flags.sink) % 3;
      if (pick === 0) {
        put(one(p), [
          Effect.Stat(
            Stat.Damage,
            Op.Boost(k),
          ),
        ]);
      } else if (pick === 1) {
        put(one(p), [
          Effect.Stat(
            Stat.CoinMult,
            Op.Add(k),
          ),
        ]);
      } else {
        put(one(p), [
          Effect.Stat(
            Stat.CritChance,
            Op.Add(Unit.of(UnitKind.Chance, k)),
          ),
        ]);
      }
    }
  }

  /** Colossus Forge's bonus now, in percent (to one decimal): 1% a wave survived, up to 40% (scaled by its strength). */
  forgePct(p: Pizza, waves = this.forgeWaves): number {
    const k = this.pk(p);
    return Math.round(Math.min(40, waves) * k * 10) / 10;
  }

  /** Bosses beaten this run (not mini-bosses; a boss's Ghost echoes and its twins never count): Skald's Saga. */
  skaldBosses(): number {
    return this.run.bossesBeaten.filter((id) => !FOOT_BY_ID[id]?.mini).length;
  }

  /** Skald's Saga's bonus now, in percent (to one decimal): 3% a boss beaten this run (scaled by its strength). */
  skaldPct(p: Pizza, bosses = this.skaldBosses()): number {
    return Math.round(3 * bosses * this.pk(p) * 10) / 10;
  }

  /** What a growing perk is worth right now, for its card's NOW tag: read from the run's ledger (the same growing
   *  values the stats use: Peel Collector's peels, the Forge's waves, the Saga's bosses, Napoli DOC's kinds), this
   *  pizza's part of it, worked out now. Null for perks with no running total, or while its perk is off. */
  perkNow(p: Pizza): { total: string; why: string } | null {
    const L = this.run.ledger;
    if (!p.perk || !L) return null;
    const src = this.srcOf(p);
    // (Napoletana has a share in every boosted perk, but no running total of its own)
    if (src in this.run.boosters) return null;
    const ctx = this.valueCtx();
    for (const m of L.of(src)) {
      if (m.op.op === 'on' || !isGrowing(m.op.value)) continue;
      // (its own part: Napoletana's share of the boost is still in this pizza's number, as it always was)
      const part = L.partOf(m, src, ctx, (id) => !(id in this.run.boosters));
      if (!part) continue;
      // (to one decimal; the nudge keeps a shared part on the same side of .x5 as the per-pizza sum it splits)
      const r1 = (n: number) => Math.round(n * 10 + 1e-7) / 10;
      return { total: `+${r1(part.value * 100)}% ${STAT_DEFS[m.stat].short ?? STAT_DEFS[m.stat].label.toLowerCase()}`, why: part.why ?? '' };
    }
    return null;
  }

  /** A per-hit number now (Effect.PerHit on the bus: src/game/perkEffects.ts). */
  private hit(stat: HitStatId, foot: Foot | null = null, smack = false, golden = false, wave = this.wave()): number {
    return this.bus.hit(stat, { foot, smack, golden, wave });
  }

  /** Follow-up smacks: Pizza Romana while it has every slice, Rinkside Pretzel Pie's rush. */
  extraDouble(): number {
    return this.hit(HitStat.ExtraDouble);
  }

  /** Rinkside Pretzel Pie's rush: the 3 s after a kill. */
  rushing(): boolean {
    return this.a.now() < this.rushUntil;
  }

  /** Seaside Fritto pays more this wave (a slice was lost last wave). */
  lossTipsOn(): boolean {
    return this.lostLastWave && this.c('lossTips') > 0;
  }

  shinyMult(): number {
    return this.hit(HitStat.ShinyRate);
  }

  eventRateMult(): number {
    return this.hit(HitStat.EventRate);
  }

  eventDropMult(): number {
    return this.hit(HitStat.EventDrops);
  }

  goldenMult(): number {
    return this.hit(HitStat.GoldenPrice);
  }

  // ——— damage, tips, score, knockback (per hit, on the bus) ———
  damageMult(f: Foot, smack: boolean): number {
    return this.hit(HitStat.Damage, f, smack) * this.waveDmgMult(this.wave());
  }

  /** What every hit in wave n is worth, whatever the foot: Victory Lap, Night Shift, Moon Cheese. */
  waveDmgMult(n: number): number {
    return this.hit(HitStat.WaveDamage, null, false, false, n);
  }

  tipMult(f: Foot, golden: boolean): number {
    return this.hit(HitStat.Tips, f, false, golden);
  }

  scoreMult(f: Foot): number {
    return this.hit(HitStat.Score, f);
  }

  knockMult(f: Foot): number {
    return this.hit(HitStat.Knock, f);
  }

  /** The one-offs' own per-hit factors (Grow.By). */
  private readonly FACTORS: Record<FactorId, (q: HitQuery) => number> = {
    [Factor.Stone]: ({ foot }) => (foot && this.stoneOn(foot) ? 2 : 1),
    [Factor.Bridge]: ({ foot }) => (foot ? this.bridgeMult(foot) : 1),
    [Factor.LegendRoar]: () => this.legends.damageMult(),
  };

  /** What the kit keeps that a condition can ask about (Cond.Flag). */
  private readonly FLAGS: Record<FlagId, () => boolean> = {
    [Flag.Quaking]: () => this.quaking(),
    [Flag.Rushing]: () => this.rushing(),
    [Flag.LostLastWave]: () => this.lostLastWave,
  };

  // ——— hooks ———
  /** A smack landed on f at (x, y): the bus's smack triggers (Dragon Fruit Flambé, Squid Ink Nero, Snowball Pie,
   *  Charybdis Swirl: src/game/perkEffects.ts), then what shows on the smacks the bridges and the frost strengthen. */
  smacked(f: Foot, x: number): void {
    // (then Rainbow Bridge's and Frostbite's sparks on the smacks they strengthen, Roar Roast's embers and Cosmic
    // Crouton Supreme's portal: on the bus too)
    this.bus.emit(GameEvent.Smack, { foot: f, x });
  }

  /** A swing of the peel landed (once a swing, however many feet it hit; f: the foot it hit first): Three-Headed
   *  Hound's bites (on the bus). */
  swung(f: Foot): void {
    this.bus.emit(GameEvent.Swing, { foot: f });
  }

  /** A smack crit f: T-Rex Ribs shakes the table (on the bus). */
  crit(f: Foot): void {
    this.bus.emit(GameEvent.Crit, { foot: f });
  }

  private fireLane(x: number, pies: Pizza[]): void {
    const a = this.a;
    const table = (a.alivePizzas()[0]?.surfaceY ?? 820) - 20;
    // a tall column of fire from the table up through the lane
    const col = this.sc.add.image(x, table, 'glow').setOrigin(0.5, 1).setTint(0xff6a1a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9, 0.2).setAlpha(0.95);
    const core = this.sc.add.image(x, table, 'glow').setOrigin(0.5, 1).setTint(0xfff0a0).setBlendMode(Phaser.BlendModes.ADD).setScale(0.4, 0.2).setAlpha(1);
    a.fxLayer.add([col, core]);
    this.sc.tweens.add({ targets: col, scaleY: table / 120, duration: 160, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: core, scaleY: table / 130, duration: 160, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: [col, core], alpha: 0, scaleX: 0.2, delay: 260, duration: 420, onComplete: () => { col.destroy(); core.destroy(); } });
    for (let y = table; y > 80; y -= 55) this.sc.time.delayedCall((table - y) * 0.25, () => a.fx.burn(x + (crand() - 0.5) * 60, y));
    a.quip(x, 260, 'DRAGON FIRE!', '#ff7a3a', 40);
    a.sfx('sfx_fire', { volume: 0.8 });
    for (const p of pies) p.perkFired({ quip: false });
    a.shake(160, 0.004);
  }

  /** f was defeated (coins: what it paid; echo: a boss's Ghost echo or one of several of a boss, paying a tenth). Every
   *  kill perk is on the bus (src/game/perkEffects.ts). */
  killed(f: Foot, coins: number, echo = false, byAbility = false): void {
    this.waveKills++;
    this.bus.emit(GameEvent.Kill, { foot: f, coins, echo, byAbility, x: f.cx, y: f.cy });
  }

  /** Bolognese: a meatball drops from the defeated foot and rolls into the next one. */
  private meatball(x: number, y: number, from: Pizza, k: number): void {
    const a = this.a;
    const ball = this.sc.add.image(x, y, 'pk_meatball').setScale(0.9);
    a.fxLayer.add(ball);
    const targets = a.allFeet().filter((o) => o.hittable).sort((p, q) => Math.abs(p.cx - x) - Math.abs(q.cx - x));
    const t = targets[0];
    // it drops to the pizza first, then rolls off to its target (or off the table)
    const floor = from.surfaceY - 40;
    this.sc.tweens.add({
      targets: ball,
      y: floor,
      angle: 180,
      duration: 260,
      ease: 'Bounce.Out',
      onComplete: () => {
        if (!ball.active) return;
        const tx = t ? t.cx : x + (x < 960 ? -700 : 700);
        const ty = t ? t.cy : floor;
        audio.sfx('sfx_boing', { volume: 0.4, rate: 0.7, throttle: 120 });
        this.sc.tweens.add({
          targets: ball,
          x: tx,
          y: ty,
          angle: 180 + (tx > x ? 720 : -720),
          duration: 380,
          ease: 'Quad.In',
          onComplete: () => {
            ball.destroy();
            if (t && t.alive) {
              this.h.dealDamage(t, this.run.stats.damage * k, 'olive', 300, 'perk:meatball');
              a.fx.impact(t.cx, t.cy, false);
              a.fx.splat(t.cx, t.cy, false);
              a.quip(t.x, t.cy - 110, 'MEATBALL!', '#ff8a5a', 34);
            }
          },
        });
      },
    });
  }

  /** Before a stomp lands on p, piercing ones too: true when it misses. The early defences on the bus, first that
   *  blocks wins (src/game/perkEffects.ts: the cream pie's slip, the ghost pass, the oyster shell, Nonna's ladle). */
  preStomp(f: Foot, p: Pizza): boolean {
    const ev = { foot: f, pizza: p, blocked: false };
    this.bus.emit(GameEvent.PreStomp, ev);
    return ev.blocked;
  }

  /** The stomp meets p's walls (where Pizza Stone is: a piercing stomp never gets here): true when it's blocked. The
   *  wall defences on the bus (Granite Crust, Phantom Waltz's ghost, Sandcastle Sundae's wall, Sandcastle Citadel's). */
  wallStomp(f: Foot, p: Pizza): boolean {
    const ev = { foot: f, pizza: p, blocked: false };
    this.bus.emit(GameEvent.StompWall, ev);
    return ev.blocked;
  }

  /** Granite Crust: the stomp turns to stone on the pie. The pie flashes grey and cracks, stone dust bursts off it,
   *  and the foot greys over and stands stunned (a boss is only blocked). */
  private stone(f: Foot, p: Pizza): void {
    const a = this.a;
    const boss = f.isBossLike;
    p.stoneFlash(boss ? 650 : p.enhanced ? 1500 : 1000);
    p.perkFired({ quip: false });
    a.quip(f.x, p.surfaceY - 150, 'TURNED TO STONE!', '#f2ece0', 44);
    a.sfx('sfx_gargoyle_stone', { volume: 0.75, rate: 1.15 });
    a.shake(140, 0.004);
    a.fx.ring(p.x, p.surfaceY - 24, 0xcfc6b4, 2.2, 0.45);
    a.fx.ring(f.x, p.surfaceY - 60, 0xffffff, 1.4, 0.5);
    // the dust and chips flying off the stone
    for (let i = 0; i < 14; i++) {
      const ang = Math.PI + crand() * Math.PI;
      const sp = 140 + crand() * 260;
      const chip = this.sc.add.image(f.x + (crand() - 0.5) * 80, p.surfaceY - 40, i % 3 ? 'crumb2' : 'shard').setTint(i % 2 ? 0x9a9488 : 0xcfc6b4).setScale(0.5 + crand() * 0.5);
      a.fxLayer.add(chip);
      this.sc.tweens.add({ targets: chip, x: chip.x + Math.cos(ang) * sp * 0.5, y: chip.y + Math.sin(ang) * sp * 0.4 + 60, angle: (crand() - 0.5) * 360, alpha: 0, duration: 520 + crand() * 260, ease: 'Quad.Out', onComplete: () => chip.destroy() });
    }
    for (let i = 0; i < 5; i++) a.fx.puff(f.x + (crand() - 0.5) * 120, p.surfaceY - 30, 2);
    if (!f.alive || boss) return;
    f.knock(700);
    const sec = p.enhanced ? 1.5 : 1;
    f.stun(sec);
    // a pale flash of stone, then it stays grey while it stands there
    f.flash(0xe8e0d0, 110);
    this.sc.time.delayedCall(130, () => f.alive && f.stunT > 0 && f.tint(0xa09c96));
  }

  /** The slices a stomp on p takes, after the defences that soften it (Raclette Run, on the bus). */
  stompDmg(f: Foot, p: Pizza, dmg: number): number {
    const ev = { foot: f, pizza: p, dmg };
    this.bus.emit(GameEvent.StompDamage, ev);
    return ev.dmg;
  }

  /** Raclette Run: its first stomp each wave (enhanced: two) takes half a slice. The half left over waits on the
   *  pizza, so two such stomps make one whole slice. Returns the slices this stomp takes. */
  private halfStomp(f: Foot, p: Pizza, dmg: number): number {
    const w = this.wave();
    const used = p.flags.halfWave === w ? Number(p.flags.halfUses ?? 0) : 0;
    if (used >= (p.enhanced ? 2 : 1)) return dmg;
    p.flags.halfWave = w;
    p.flags.halfUses = used + 1;
    const owed = Number(p.flags.halfOwed ?? 0) + dmg / 2;
    const whole = Math.floor(owed + 1e-9);
    p.flags.halfOwed = owed - whole;
    this.a.quip(f.x, p.surfaceY - 150, whole > 0 ? 'ONLY HALF A SLICE!' : 'HALF A SLICE: SAVED!', '#ffe08a', 36);
    this.a.sfx('sfx_boing', { volume: 0.5, rate: 0.85 });
    p.perkFired({ quip: false });
    return whole;
  }

  /** A stomp landed on p: the stomper pays for it (the bus's stomp triggers: src/game/perkEffects.ts). */
  afterStomp(f: Foot, p: Pizza): void {
    this.lastStomp.set(p, this.a.now());
    this.bus.emit(GameEvent.Stomp, { foot: f, pizza: p });
  }

  /** p has just been destroyed. 'survive': it's back on its feet (Olympian Feast); 'rise': it comes
   * back in a moment (Untouchable); null: it's gone. Volcano Calzone erupts either way. */
  destroyed(p: Pizza): 'survive' | 'rise' | null {
    // (a possessed pizza's perks are off to the end, as a stale one's: Pizza.haunted)
    const fresh = (!p.freshOn || p.fresh > 0) && !p.haunted;
    // Volcano Calzone erupts; Olympian Feast may keep it (on the bus)
    const d = { pizza: p, fresh, answer: Answer.None as Answer };
    this.bus.emit(GameEvent.Destroyed, d);
    if (d.answer) return d.answer;
    p.flags.lost = true;
    this.lost = true;
    // Fenrir's Howl, then Untouchable may bring it back (on the bus)
    const l = { pizza: p, fresh, answer: Answer.None as Answer };
    this.bus.emit(GameEvent.Lost, l);
    return l.answer;
  }

  private untouchUsed(perk: string): boolean {
    return this.a.allPizzas().some((q) => q.type.perk === perk && q.flags.untouchUsed);
  }

  /** Volcano Calzone: ×10 to every foot on the screen. */
  private erupt(p: Pizza): void {
    const a = this.a;
    const dmg = this.run.stats.damage * (p.enhanced ? 15 : 10);
    a.flash(500, 255, 110, 30);
    a.shake(900, 0.016);
    a.rumble(1, 600);
    a.dramatic(0.6);
    a.fx.explosion(p.x, p.surfaceY - 40, 420);
    a.quip(p.x, p.surfaceY - 220, 'ERUPTION!', '#ff5a1a', 72);
    p.perkFired({ quip: false });
    a.sfx('sfx_explosion');
    a.sfx('sfx_fire');
    // lava bombs arc out of the calzone onto every foot
    for (const f of a.allFeet()) {
      if (!f.hittable) continue;
      const bomb = this.sc.add.image(p.x, p.surfaceY - 40, 'glow').setTint(0xff5a1a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.35);
      a.fxLayer.add(bomb);
      const tx = f.cx;
      const ty = f.cy;
      this.sc.tweens.add({
        targets: bomb,
        x: tx,
        y: ty,
        duration: 420 + Math.random() * 200,
        ease: 'Quad.In',
        onUpdate: () => crand() < 0.4 && a.fx.burn(bomb.x, bomb.y),
        onComplete: () => {
          bomb.destroy();
          if (!f.alive) return;
          a.fx.explosion(tx, ty, 140);
          this.h.dealDamage(f, dmg, 'explode', 700, 'perk:erupt');
          if (f.alive && !f.type.traits.includes('immuneBurn')) {
            f.burnT = Math.max(f.burnT, 4);
            f.burnDps = Math.max(f.burnDps, this.run.stats.damage);
          }
        },
      });
    }
    for (let i = 0; i < 24; i++) this.sc.time.delayedCall(i * 40, () => a.fx.burn(p.x + (crand() - 0.5) * 220, p.surfaceY - crand() * 200));
  }

  /** A wave begins. */
  waveStart(n: number): void {
    this.footTime = 0;
    this.waveKills = 0;
    this.removeChest();
    // the table opens the wave (on the bus): the ghosts back out, Bufala, Arcobaleno, Mystery Meat, Kitchen Sink; then
    // the stats again if a colour or a pick changed
    this.changed = false;
    this.bus.emit(GameEvent.WaveOpen, { wave: n });
    if (this.changed) this.h.recompute();
    // the bus: the walls and lanes (Sandcastle Sundae's wall, the Bifröst, the harpies, Tikka's clock), then the Forge,
    // Old Town Tarte, Seaside Fritto, Moon Cheese, Victory Lap, Pirate's Treasure (and the timers that start over each
    // wave)
    // (and last the Legendaries': Nonna's swats, the Citadel, the tide, The First Bake)
    this.bus.emit(GameEvent.WaveStart, { wave: n });
  }

  /** The wave is clear. earned: tips this wave so far. */
  waveClear(n: number, perfect: boolean, earned: number): void {
    // the wave closes (on the bus): the rings, the splats, the soot, the ink and the sand wall go; the Legendaries'
    // walls, holes and boosts end; The First Bake tops the table up
    this.bus.emit(GameEvent.WaveClose, { wave: n });
    const g = save.pizzaGoals;
    g.perfectStreak = perfect ? (g.perfectStreak ?? 0) + 1 : 0;
    g.perfectBest = Math.max(g.perfectBest ?? 0, g.perfectStreak);
    g.bestCombo = Math.max(g.bestCombo ?? 0, this.run.bestCombo);
    // Speed Slice's goal: the time feet were on the table, on a wave of 6 or more
    if (this.waveKills >= 6) g.fastWave = Math.min(g.fastWave ?? 99, Math.round(this.footTime * 10) / 10);
    this.removeChest(true);
    // Seaside Fritto pays more next wave when a slice went in this one
    this.lostLastWave = !perfect;
    // Colossus Forge: one more wave survived (it counts whether or not the Forge is out; its bonus shows in the shop)
    this.forgeWaves++;
    if (this.c('forgeWaves') > 0) this.h.recompute();
    // the bus: Kitchen Sink's next pick (so the shop shows the one you'll get), Tuna & Sweetcorn, Perfect Pie, then
    // Supreme's and Caviar's counts, pizza by pizza
    this.bus.emit(GameEvent.WaveClear, { wave: n, perfect, earned });
  }

  /** Every frame of a wave. */
  update(dt: number): void {
    const a = this.a;
    if (!a.inWave()) return;
    const feet = a.allFeet();
    if (feet.some((f) => f.alive && f.hittable)) this.footTime += dt;
    // Tikka's clock stopping, then the per-foot auras (Chicken Pesto, Chorizo & Pepper, Inferno Calzone, Tikka's
    // freeze, Burrata's phase heal), foot by foot, on the bus
    this.bus.emit(GameEvent.FrameStart, { dt });
    for (const f of feet) if (f.alive) this.bus.emit(GameEvent.FootTick, { foot: f, dt });
    if (this.timeStopT > 0) this.timeStopT -= dt;
    // the timers (Meteorite Margherita, Disco Diner Pie, Steam Bun Pie, Comet Calzone, Siren's Song) on the bus
    this.bus.emit(GameEvent.Tick, { dt });
    // (then the ticking props, on the bus: the harpies, the Bifröst, the coils, the Gorgon, the maze, the embers, the
    // whirlpools, the ink, the soot, the ghosts, the rings, Nonna's Secret)
    // (and last the Legendaries': their clocks, the hole, the ripple, the tide, the cannon, the tray)
    if (this.chest) this.chest.img.y += Math.sin(a.now() * 3) * 0.3;
  }

  /** Disco Diner Pie: a dance beat. The mirror ball drops in over the pie, coloured lights sweep the table, notes
   *  bounce over every foot and they all slow 30% for 2 s, dancing. */
  /** Disco Diner Pie's dance break: the ball drops in over the pie and swings its light across the table. */
  private danceBreak(pies: Pizza[]): void {
    const a = this.a;
    const src = pies[0];
    const cols = [0xff4a9a, 0x38d8ff, 0xffd23f, 0x7dff7a];
    a.quip(960, 300, 'DANCE BREAK!', '#ff7ad9', 54);
    a.sfx('sfx_smack_tail_jukebox', { volume: 0.9 });
    this.sc.time.delayedCall(260, () => a.sfx('sfx_smack_tail_jukebox', { volume: 0.7, rate: 1.26 }));
    for (const p of pies) p.perkFired({ quip: false });
    if (src) {
      // the ball drops in above the pie, spins its light about and goes back up
      const bx = src.x;
      const by = src.surfaceY - 330;
      const ball = this.sc.add.image(bx, -140, 'pk_disco').setScale(1.15);
      const halo = this.sc.add.image(bx, by, 'glow').setTint(0xffd8f4).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0);
      a.fxLayer.add([halo, ball]);
      this.sc.tweens.add({ targets: ball, y: by, duration: 320, ease: 'Back.Out' });
      this.sc.tweens.add({ targets: halo, alpha: 0.55, duration: 300, yoyo: true, hold: 1300 });
      this.sc.tweens.add({ targets: ball, angle: { from: -8, to: 8 }, duration: 300, yoyo: true, repeat: 3, ease: 'Sine.InOut' });
      this.sc.tweens.add({ targets: ball, y: -160, delay: 1900, duration: 360, ease: 'Back.In', onComplete: () => { ball.destroy(); halo.destroy(); } });
      // four beams of coloured light swing out of the ball across the table
      for (let i = 0; i < 4; i++) {
        const beam = this.sc.add.image(bx, by, 'pk_beam').setOrigin(0.5, 0).setTint(cols[i]).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6, 1.5).setAlpha(0);
        beam.setRotation(-0.9 + i * 0.6);
        a.fxLayer.addAt(beam, 0);
        this.sc.tweens.add({ targets: beam, alpha: 0.75, duration: 220, delay: 200 + i * 60 });
        this.sc.tweens.add({ targets: beam, rotation: beam.rotation + (i % 2 ? -0.7 : 0.7), duration: 900, delay: 200, yoyo: true, ease: 'Sine.InOut' });
        this.sc.tweens.add({ targets: beam, alpha: 0, delay: 1800, duration: 300, onComplete: () => beam.destroy() });
      }
    }
  }

  /** The dance break on a foot: a note bouncing over it in time, and a ring of the light on it. */
  private danceNote(f: Foot): void {
    const a = this.a;
    const cols = [0xff4a9a, 0x38d8ff, 0xffd23f, 0x7dff7a];
    for (let n = 0; n < 2; n++) {
      const note = this.sc.add.image(f.cx + (n ? 40 : -40), f.cy - 90, 'pk_note').setTint(cols[(n + Math.floor(f.cx)) % 4]).setScale(0.75).setAlpha(0);
      a.fxLayer.add(note);
      this.sc.tweens.add({ targets: note, alpha: 1, duration: 140, delay: n * 220 });
      this.sc.tweens.add({ targets: note, y: note.y - 36, duration: 260, delay: n * 220, yoyo: true, repeat: 2, ease: 'Sine.InOut' });
      this.sc.tweens.add({ targets: note, alpha: 0, x: note.x + (n ? 30 : -30), delay: 1500 + n * 220, duration: 400, onComplete: () => note.destroy() });
    }
    a.fx.ring(f.cx, f.cy + 40, cols[Math.floor(f.cx) % 4], 1.3, 0.4);
  }

  private meteor(f: Foot, dmg: number): void {
    const a = this.a;
    const sx = f.cx + 520;
    const sy = -120;
    const m = this.sc.add.image(sx, sy, 'pk_meteor').setScale(0.85);
    a.fxLayer.add(m);
    a.sfx('sfx_whoosh', { volume: 0.6, rate: 0.7 });
    this.sc.tweens.add({
      targets: m,
      x: f.cx,
      y: f.cy,
      duration: 480,
      ease: 'Quad.In',
      onUpdate: () => crand() < 0.5 && a.fx.burn(m.x + 20, m.y - 20),
      onComplete: () => {
        m.destroy();
        a.fx.explosion(f.cx, f.cy, 180);
        a.shake(180, 0.006);
        a.sfx('sfx_explosion', { volume: 0.7, throttle: 80 });
        if (f.alive) {
          this.h.dealDamage(f, dmg, 'explode', 500, 'perk:meteor');
          a.quip(f.x, f.cy - 130, 'METEOR!', '#ff9a3a', 40);
        }
      },
    });
  }

  /** Haunted Hawaiian's pineapple rings circle above it, hitting feet (×1). */
  private ringsTick(dt: number): void {
    const a = this.a;
    const want: { p: Pizza; i: number }[] = [];
    for (const p of this.with('orbitRing')) for (let i = 0; i < (p.enhanced ? 2 : 1); i++) want.push({ p, i });
    // keep the sprites in step with the pizzas that have the perk
    this.rings = this.rings.filter((r) => {
      const keep = want.some((w) => w.p === r.p && w.i === r.i);
      if (!keep) {
        r.img.destroy();
        r.glow.destroy();
      }
      return keep;
    });
    for (const w of want) {
      if (this.rings.some((r) => r.p === w.p && r.i === w.i)) continue;
      const glow = this.sc.add.image(0, 0, 'glow').setTint(0x8aff9a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.85).setAlpha(0.45);
      const img = this.sc.add.image(0, 0, 'pk_ring').setAlpha(0.85);
      a.fxLayer.add([glow, img]);
      this.rings.push({ p: w.p, img, glow, i: w.i });
    }
    if (!this.rings.length) return;
    this.ringAngle += dt * 2.2;
    const dmg = this.run.stats.damage;
    for (const r of this.rings) {
      const n = r.p.enhanced ? 2 : 1;
      const ang = this.ringAngle + (r.i / n) * Math.PI * 2;
      const x = r.p.x + Math.cos(ang) * r.p.radius * 0.95;
      const y = r.p.surfaceY - 260 + Math.sin(ang) * 90;
      r.img.setPosition(x, y).setRotation(ang * 1.5).setScale(1.15 + Math.sin(ang) * 0.12);
      r.glow.setPosition(x, y).setAlpha(0.35 + Math.sin(a.now() * 5) * 0.1);
      for (const f of a.allFeet()) {
        if (!f.hittable || f.distanceTo(x, y) > 70) continue;
        if ((this.ringCd.get(f) ?? 0) > a.now()) continue;
        this.ringCd.set(f, a.now() + 0.6);
        this.h.dealDamage(f, dmg, 'cutter', 120, 'perk:orbitRing');
        a.fx.impact(x, y, false);
        a.sfx('sfx_slap_2', { volume: 0.35, rate: 1.2, throttle: 80 });
      }
    }
  }

  /** Nonna's Secret: when a pizza is down to its last 2 slices, Nonna heals every pizza (once an act). */
  private nonnaCheck(nonna: Pizza | undefined): void {
    const a = this.a;
    if (!nonna) return;
    const act = this.act();
    const uses = nonna.flags.nonnaAct === act ? Number(nonna.flags.nonnaUses ?? 0) : 0;
    if (uses >= (nonna.enhanced ? 2 : 1)) return;
    const low = a.alivePizzas().find((p) => p.slices <= 2 && p.maxSlices > 3);
    if (!low) return;
    nonna.flags.nonnaAct = act;
    nonna.flags.nonnaUses = uses + 1;
    a.banner("NONNA'S SECRET!", 'Every pizza back to full', 'clear');
    a.sfx('sfx_heal');
    a.sfx('sfx_levelup', { volume: 0.6 });
    for (const p of a.alivePizzas()) {
      this.h.healPizza(p, p.maxSlices);
      a.fx.ring(p.x, p.surfaceY - 30, 0xff9a9a, 2, 0.45);
    }
    nonna.perkFired({ quip: false });
  }

  // ——— the Epic Chef's Specials (step 4, batch 1): each from a boss, its props and its sounds ———

  /** A quip (or a pizza's moment) of this kind at most every `gap` seconds. */
  private every(key: string, gap: number): boolean {
    const now = this.a.now();
    if (now - (this.quipAt[key] ?? -99) < gap) return false;
    this.quipAt[key] = now;
    return true;
  }

  /** A boss or mini-boss is in the fight: the perks' effects play lighter. */
  private bossOn(): boolean {
    return this.a.allFeet().some((f) => f.alive && f.isBossLike);
  }

  /** Squid Ink Nero: the smack sprays the Kraken's ink. A foot loses its lane (it's given another, if one's free) and
   *  wanders off towards it, unable to dive, for 1.5 s (enhanced 2.5). Bosses and mini-bosses are only splattered. */
  private inkSpray(f: Foot, pies: Pizza[]): void {
    const a = this.a;
    const now = a.now();
    const light = this.bossOn();
    // the spray: ink drops flung off the foot
    for (let i = 0; i < (light ? 3 : 6); i++) {
      const ang = -Math.PI / 2 + (crand() - 0.5) * 2.6;
      const sp = 90 + crand() * 160;
      const d = this.sc.add.image(f.cx + (crand() - 0.5) * 40, f.cy + (crand() - 0.5) * 40, 'p_ink').setScale(0.03 + crand() * 0.04).setAlpha(0.95);
      a.fxLayer.add(d);
      this.sc.tweens.add({ targets: d, x: d.x + Math.cos(ang) * sp, y: d.y + Math.sin(ang) * sp * 0.6 + 70, scale: d.scale * 0.5, alpha: 0, duration: 420 + crand() * 200, ease: 'Quad.Out', onComplete: () => d.destroy() });
    }
    a.sfx('sfx_kraken_squirt', { volume: 0.45, rate: 1.1 + crand() * 0.2, throttle: 140 });
    // (bosses and mini-bosses are only splattered; a foot a fight moves by hand keeps its place)
    if (f.isBossLike || f.puppet || f.brain.free) return;
    const sec = pies.some((p) => p.enhanced) ? 2.5 : 1.5;
    const have = this.inked.get(f);
    if (have) {
      have.until = Math.max(have.until, now + sec);
      return;
    }
    // it loses its lane (another, if there's one free) and can't dive till the ink wears off
    this.holdDive(f, sec);
    this.h.relane(f);
    const blobs = [0, 1].map((i) => {
      const b = this.sc.add.image(f.cx, f.cy, 'p_inkblob').setScale(0.32 - i * 0.08).setAlpha(0.9).setRotation(crand() * 6);
      a.fxLayer.add(b);
      return b;
    });
    // (it's tinted inky once the smack's flash is over: a flash clears it. Its wander is gameplay: Math.random)
    this.inked.set(f, { until: now + sec, bx: f.x, ph: Math.random() * 6, blobs, tintAt: 0 });
    if (this.every('inkQuip', 1.2)) a.quip(f.x, f.cy - 130, 'INKED! LOST ITS LANE', '#c8a8ff', 32);
    if (this.every('inkFire', 1.5)) {
      a.sfx('sfx_kraken_inked', { volume: 0.4, throttle: 400 });
      for (const p of pies) p.perkFired({ quip: false });
    }
  }

  /** Ink and soot: the foot can't dive for `sec` more. A diving foot is pulled back to its hover, at the end of its
   *  wait (so a mole doesn't bury itself again); the hover is held with holdHoverT, as a boss holds its own. */
  private holdDive(f: Foot, sec: number): void {
    if (f.state === 'descend') {
      f.setState('hover');
      f.stateT = f.hoverTime;
    }
    f.brain.holdHoverT = sec;
  }

  /** Ink or soot wore off: the foot may dive again (unless the other still holds it: its tick holds it again), and its
   *  tint goes. */
  private release(f: Foot): void {
    if (!f.alive || this.inked.has(f) || this.sooted.has(f) || this.lostFeet.has(f)) return;
    f.brain.holdHoverT = 0;
    if (f.stunT <= 0) f.clearTint();
  }

  /** Keep a foot tinted while the effect lasts: every smack's flash clears a tint, so it goes back on after. */
  private keepTint(f: Foot, col: number, at: number, now: number): number {
    if (f.flashing || f.stunT > 0 || now - at < 0.2) return at;
    f.tint(col);
    return now;
  }

  /** Inked feet wander, weaving towards their new lane, and can't dive; the ink rides on them. */
  private inkTick(dt: number): void {
    if (!this.inked.size) return;
    const now = this.a.now();
    for (const [f, ink] of this.inked) {
      const end = !f.alive || now >= ink.until;
      ink.blobs.forEach((b, i) => b.setPosition(f.cx + (i ? 26 : -18), f.cy + (i ? -30 : 10)));
      if (end) {
        this.inked.delete(f);
        this.dropImgs(ink.blobs);
        this.release(f);
        continue;
      }
      ink.tintAt = this.keepTint(f, 0x6a5a8a, ink.tintAt, now);
      this.holdDive(f, ink.until - now);
      if (f.state !== 'hover' || f.stunT > 0 || f.held || f.pinned) continue;
      ink.bx += ((f.laneX ?? ink.bx) - ink.bx) * Math.min(1, dt * 1.6);
      const off = Math.sin(now * 3.1 + ink.ph) * 70 + Math.sin(now * 1.7 + ink.ph * 2) * 40;
      f.x = Phaser.Math.Clamp(ink.bx + off, 90, 1830);
    }
  }

  /** Snowball Pie: the Yeti's snowball, lobbed from the pie at the foot nearest the table (bosses aren't frozen: it
   *  chills them 30% for 2 s). */
  private snowball(p: Pizza): boolean {
    const a = this.a;
    const feet = a.allFeet().filter((f) => f.alive && f.hittable && f.y > 60 && !(f.stunT > 0 && f.frozen));
    const pool = feet.filter((f) => !f.isBossLike);
    const t = (pool.length ? pool : feet).sort((x, y) => y.y - x.y)[0];
    if (!t) return false;
    const sx = p.x;
    const sy = p.surfaceY - 70;
    const ball = this.sc.add.image(sx, sy, 'p_snowball').setScale(0.85);
    a.fxLayer.add(ball);
    a.sfx('sfx_yeti_snowball', { volume: 0.55, throttle: 120 });
    p.perkFired({ quip: false });
    this.sc.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 380,
      onUpdate: (tw) => {
        const u = tw.getValue() ?? 0;
        ball.setPosition(sx + (t.cx - sx) * u, sy + (t.cy - sy) * u - Math.sin(Math.PI * u) * 170).setRotation(u * 7);
        if (crand() < 0.35) a.fx.propTrail(ball.x, ball.y, 0xdff2ff, 0.4);
      },
      onComplete: () => {
        ball.destroy();
        a.fx.frost(t.cx, t.cy);
        a.fx.ring(t.cx, t.cy + 30, 0xbfe8ff, 1.3, 0.45);
        // packed snow bursting off it
        for (let i = 0; i < 8; i++) {
          const ang = crand() * Math.PI * 2;
          const c = this.sc.add.image(t.cx, t.cy, 'p_snowball').setScale(0.18 + crand() * 0.14);
          a.fxLayer.add(c);
          this.sc.tweens.add({ targets: c, x: c.x + Math.cos(ang) * 90, y: c.y + Math.sin(ang) * 60 + 50, alpha: 0, scale: 0.05, duration: 420, ease: 'Quad.Out', onComplete: () => c.destroy() });
        }
        a.sfx('sfx_smack_snow_heavy', { volume: 0.6, throttle: 100 });
        if (!t.alive) return;
        if (!t.isBossLike) {
          t.stun(2, true);
          a.quip(t.x, t.cy - 130, t.insulated ? 'SNOWBALL! (INSULATED)' : 'SNOWBALL! FROZEN', '#bfe8ff', 34);
        } else {
          if (!t.type.traits.includes('immuneSlow') && (t.slowT <= 0 || t.slowPct <= 0.3)) {
            t.slowPct = 0.3;
            t.slowT = Math.max(t.slowT, 2);
          }
          a.quip(t.x, t.cy - 130, 'SNOWBALL! CHILLED', '#bfe8ff', 34);
        }
      },
    });
    return true;
  }

  /** T-Rex Ribs is shaking the table (+damage to every foot). */
  quaking(): boolean {
    return this.a.now() < this.quakeUntil;
  }

  /** T-Rex Ribs: a crit stamps the table like T-Rex Toes: it shakes, dust jumps off round the pies, and every foot
   *  takes +10% (enhanced 15%) for 3 s. */
  private quake(f: Foot, k: number): void {
    const a = this.a;
    const now = a.now();
    const was = this.quaking();
    this.quakeUntil = now + 3;
    if (now - this.quakeFx < 0.4) return;
    this.quakeFx = now;
    const light = this.bossOn();
    a.shake(light ? 80 : 130, light ? 0.002 : 0.0035);
    a.sfx('sfx_smack_stone_heavy', { volume: 0.4, rate: 0.7, throttle: 250 });
    a.fx.ring(f.cx, f.cy + 40, 0xffb070, 1.2, 0.4);
    for (const p of a.alivePizzas()) for (let i = 0; i < (light ? 1 : 2); i++) a.fx.puff(p.x + (crand() - 0.5) * p.radius * 1.7, p.surfaceY + p.radius * 0.32, 2);
    if (was) return;
    a.sfx('sfx_trex_growl', { volume: 0.5, throttle: 1500 });
    if (this.every('quakeQuip', 2.5)) a.quip(960, 300, `TABLE SHAKE! +${Math.round(10 * k)}% DAMAGE`, '#ffb070', 40);
    for (const p of this.with('critQuake')) p.perkFired({ quip: false });
  }

  /** Cream Pie Supreme: a smacked-down foot drops one of King Honk's pies on the pizza it was over: a splat lies there
   *  (one a pizza) until the next foot comes down on it. */
  private pieSplat(f: Foot): void {
    const p = f.target;
    if (!p || p.dead || p.haunted || this.splats.has(p)) return;
    const a = this.a;
    const r = p.radius;
    const dx = Phaser.Math.Clamp(f.x - p.x, -r * 0.55, r * 0.55);
    // (on the back half of the pie, where the feet come down: its face is on the front half)
    const ly = p.surfaceY - p.y - r * TILT * 0.42;
    const img = this.sc.add.image(dx, ly, 'p_creamsplat').setAlpha(0.96);
    img.setDisplaySize(r * 0.62, r * 0.62 * TILT);
    const sx = img.scaleX;
    const sy = img.scaleY;
    img.setScale(0);
    p.addOnPie(img);
    this.splats.set(p, { img, dx });
    // the pie falls from where the foot went down and lands face first
    const pie = this.sc.add.image(f.cx, f.cy, 'p_pie2').setScale(0.4);
    a.fxLayer.add(pie);
    this.sc.tweens.add({
      targets: pie,
      x: p.x + dx,
      y: p.surfaceY - r * TILT * 0.42,
      angle: 200,
      duration: 260,
      ease: 'Quad.In',
      onComplete: () => {
        pie.destroy();
        if (!img.active) return;
        this.sc.tweens.add({ targets: img, scaleX: sx, scaleY: sy, duration: 160, ease: 'Back.Out' });
        for (let i = 0; i < 6; i++) {
          const ang = Math.PI + crand() * Math.PI;
          const c = this.sc.add.image(p.x + dx, p.surfaceY - r * TILT * 0.42, 'p_cream').setScale(0.03 + crand() * 0.03);
          a.fxLayer.add(c);
          this.sc.tweens.add({ targets: c, x: c.x + Math.cos(ang) * 80, y: c.y + Math.sin(ang) * 40 + 30, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => c.destroy() });
        }
        a.sfx('sfx_clownking_piesplat', { volume: 0.5, throttle: 150 });
        if (this.every('pieQuip', 1.5)) a.quip(p.x + dx, p.surfaceY - 120, 'PIE SPLAT!', '#fff0e0', 30);
      },
    });
  }

  /** The next foot down on a splat slips on it: its stomp misses, and it's stunned 1 s (enhanced 1.5). */
  private slip(f: Foot, p: Pizza): boolean {
    const sp = this.splats.get(p);
    if (!sp || f.isBossLike) return false;
    const a = this.a;
    this.splats.delete(p);
    this.sc.tweens.add({ targets: sp.img, scaleX: sp.img.scaleX * 1.7, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => sp.img.destroy() });
    const sec = this.with('pieSplat').some((q) => q.enhanced) ? 1.5 : 1;
    f.knock(650);
    f.stun(sec);
    f.flash(0xfff4e4, 120);
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI / 2 + (crand() - 0.5) * 2.4;
      const c = this.sc.add.image(f.x + (crand() - 0.5) * 60, p.surfaceY - 30, 'p_cream').setScale(0.03 + crand() * 0.04);
      a.fxLayer.add(c);
      this.sc.tweens.add({ targets: c, x: c.x + Math.cos(ang) * 120, y: c.y + Math.sin(ang) * 90 + 60, alpha: 0, angle: crand() * 300, duration: 520, ease: 'Quad.Out', onComplete: () => c.destroy() });
    }
    a.sfx('sfx_clownking_honk', { volume: 0.4, throttle: 300 });
    a.sfx('sfx_boing', { volume: 0.5, rate: 1.3 });
    a.quip(f.x, p.surfaceY - 150, 'SLIPPED ON THE PIE!', '#fff0e0', 36);
    for (const q of this.with('pieSplat')) q.perkFired({ quip: false });
    return true;
  }

  /** Sandcastle Sundae: Sandcastle Sam's wall goes up as the wave starts, 2 stomps' worth a pie (enhanced 3), a sand
   *  tower for each standing on the table at the plate's sides. */
  private sandUp(): void {
    const a = this.a;
    this.dropImgs(this.sandTowers);
    this.sandTowers = [];
    const ps = this.with('sandWall');
    this.sandLeft = ps.reduce((n, p) => n + (p.enhanced ? 3 : 2), 0);
    if (!this.sandLeft) return;
    for (const p of ps) {
      const n = p.enhanced ? 3 : 2;
      for (let i = 0; i < n; i++) {
        // alternately left and right of the plate, stepping outwards
        const side = i % 2 ? 1 : -1;
        const x = p.x + side * p.radius * (1.12 + Math.floor(i / 2) * 0.2);
        const t = this.sc.add.image(x, p.y + p.radius * TILT * 0.5, 'pk_sandcastle').setOrigin(0.5, 0.92);
        t.setScale((p.radius * 0.3) / t.width);
        const s = t.scaleY;
        t.setScale(t.scaleX, 0);
        a.fxLayer.addAt(t, 0);
        this.sandTowers.push(t);
        this.sc.tweens.add({ targets: t, scaleY: s, delay: 500 + i * 120, duration: 300, ease: 'Back.Out' });
      }
    }
    this.sc.time.delayedCall(560, () => a.sfx('sfx_sandcastle_sandland', { volume: 0.45 }));
    this.sc.time.delayedCall(900, () => {
      const p = ps.find((q) => !q.dead);
      if (!p || !this.sandLeft) return;
      a.quip(p.x, p.surfaceY - 170, `SAND WALL: ${this.sandLeft} STOMPS`, '#ffd88a', 30);
      p.perkFired({ quip: false });
    });
  }

  /** The wall takes a stomp: sand bursts up under the foot, a wall of it, and the foot bounces off; a tower crumbles. */
  private sandBlock(f: Foot, p: Pizza): void {
    const a = this.a;
    this.sandLeft--;
    const tower = this.sandTowers.pop();
    if (tower) {
      this.sc.tweens.killTweensOf(tower);
      this.sc.tweens.add({ targets: tower, scaleY: 0, alpha: 0, duration: 300, ease: 'Quad.In', onComplete: () => tower.destroy() });
    }
    // (it rises from the back of the pie, between the foot and it, clear of the pie's face)
    const wall = this.sc.add.image(f.x, p.surfaceY - p.radius * TILT * 0.35, 'pk_sandwall').setOrigin(0.5, 1).setScale(0.72, 0);
    a.fxLayer.addAt(wall, 0);
    this.sc.tweens.add({ targets: wall, scaleY: 0.72, duration: 150, ease: 'Back.Out' });
    this.sc.tweens.add({ targets: wall, scaleY: 0, alpha: 0, delay: 520, duration: 320, ease: 'Quad.In', onComplete: () => wall.destroy() });
    for (let i = 0; i < 12; i++) {
      const ang = -Math.PI / 2 + (crand() - 0.5) * 2.2;
      const sp = 120 + crand() * 200;
      const g = this.sc.add.image(f.x + (crand() - 0.5) * 150, p.surfaceY - 20, 'crumb2').setTint(crand() < 0.5 ? 0xe2b46a : 0xc89a52).setScale(0.5 + crand() * 0.5);
      a.fxLayer.add(g);
      this.sc.tweens.add({ targets: g, x: g.x + Math.cos(ang) * sp * 0.5, y: g.y + Math.sin(ang) * sp * 0.5 + 80, angle: crand() * 360, alpha: 0, duration: 600, ease: 'Quad.Out', onComplete: () => g.destroy() });
    }
    f.knock(750);
    a.shake(100, 0.003);
    a.sfx('sfx_sandcastle_walls', { volume: 0.55, throttle: 120 });
    a.sfx('sfx_smack_sand_heavy', { volume: 0.5 });
    a.quip(f.x, p.surfaceY - 160, this.sandLeft > 0 ? 'SAND WALL!' : 'SAND WALL CRUMBLED!', '#ffd88a', 40);
    for (const q of this.with('sandWall')) q.perkFired({ quip: false });
  }

  /** Steam Bun Pie: Iron Heel's vents burst open under every diving foot and blow it back up the lane. */
  private steamVents(): void {
    const a = this.a;
    const light = this.bossOn();
    a.quip(960, 300, 'STEAM VENTS!', '#e8f0ff', 50);
    a.sfx('sfx_ironheel_vent', { volume: 0.75 });
    a.sfx('sfx_ironheel_steam', { volume: 0.6 });
    for (const p of this.with('steamVent')) p.perkFired({ quip: false });
    const table = (a.alivePizzas()[0]?.surfaceY ?? 820) - 10;
    for (const f of a.allFeet()) {
      if (!f.alive || !f.hittable || (f.state !== 'descend' && f.state !== 'stomp')) continue;
      const x = f.cx;
      // a jet of steam rushing up the lane from the table to the foot, its glow behind it
      const jet = this.sc.add.image(x, table, 'glow').setOrigin(0.5, 1).setTint(0xf4f8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.7, 0.2).setAlpha(0.7);
      a.fxLayer.addAt(jet, 0);
      this.sc.tweens.add({ targets: jet, scaleY: Math.max(0.5, (table - f.cy) / 110), duration: 140, ease: 'Quad.Out' });
      this.sc.tweens.add({ targets: jet, alpha: 0, scaleX: 0.25, delay: 200, duration: 380, onComplete: () => jet.destroy() });
      for (let i = 0; i < (light ? 4 : 7); i++) {
        const puff = this.sc.add.image(x + (crand() - 0.5) * 40, table, 'p_steam').setScale(0.2).setAlpha(0.85);
        a.fxLayer.addAt(puff, 0);
        this.sc.tweens.add({ targets: puff, y: f.cy + 40 + crand() * 80, x: puff.x + (crand() - 0.5) * 60, scale: 0.45 + crand() * 0.25, alpha: 0, delay: i * 35, duration: 520 + crand() * 200, ease: 'Quad.Out', onComplete: () => puff.destroy() });
      }
      a.fx.ring(x, table - 10, 0xe8f0ff, 1.2, 0.35);
      f.knock(1100);
    }
  }

  /** Chimney Soot Pie: a foot arriving over it (once each time it comes) is lost in the Chimney Sweep's soot for 2 s
   *  (enhanced 3): it can't find the pie to dive on it, and gropes about. Bosses and mini-bosses see through it. */
  private sootSettle(perk: string): void {
    for (const f of this.a.allFeet()) {
      if (!f.alive || f.isBossLike || f.puppet || f.brain.free || f.zombieHold || f.state !== 'hover' || f.y < 40) continue;
      const t = f.target;
      if (!grantsPerk(t, perk) || this.sootFor.get(f) === t) continue;
      this.sootFor.set(f, t);
      this.soot(f, t);
    }
  }

  /** Chimney Soot Pie: the soot clouds hang on their feet, and drift them off their lane. */
  private sootClouds(dt: number): void {
    const now = this.a.now();
    for (const [f, s] of this.sooted) {
      const end = !f.alive || now >= s.until;
      s.clouds.forEach((c, i) => c.setPosition(f.cx + Math.cos(now * 1.3 + i * 2.1) * 50, f.cy + Math.sin(now * 1.1 + i * 2.1) * 34 - 10).setRotation(now * 0.3 + i));
      if (end) {
        this.sooted.delete(f);
        this.dropImgs(s.clouds);
        this.release(f);
        continue;
      }
      if (!this.inked.has(f)) s.tintAt = this.keepTint(f, 0x6a6462, s.tintAt, now);
      this.holdDive(f, s.until - now);
      if (f.state !== 'hover' || f.stunT > 0 || f.held || f.pinned || this.inked.has(f)) continue;
      s.bx += ((f.laneX ?? s.bx) - s.bx) * Math.min(1, dt * 3);
      f.x = Phaser.Math.Clamp(s.bx + Math.sin(now * 2.4 + s.ph) * 45, 90, 1830);
    }
  }

  private soot(f: Foot, t: Pizza): void {
    const a = this.a;
    const sec = t.enhanced ? 3 : 2;
    // a gust of soot up the chimney (a column off the pie), then the cloud wraps the foot
    const col = this.sc.add.image(f.cx, t.surfaceY - 20, 'p_sootcol').setOrigin(0.5, 1).setAlpha(0.75);
    col.setScale(0.32, 0.05);
    a.fxLayer.addAt(col, 0);
    this.sc.tweens.add({ targets: col, scaleY: Math.max(0.1, (t.surfaceY - f.cy) / col.height), duration: 220, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: col, alpha: 0, delay: 260, duration: 400, onComplete: () => col.destroy() });
    const clouds = [0, 1, 2].map((i) => {
      const c = this.sc.add.image(f.cx, f.cy, 'p_soot').setScale(0.1).setAlpha(0);
      a.fxLayer.add(c);
      this.sc.tweens.add({ targets: c, scale: 0.4 + i * 0.06, alpha: 0.78, delay: 120 + i * 60, duration: 260, ease: 'Quad.Out' });
      return c;
    });
    // (its groping is gameplay: Math.random)
    this.sooted.set(f, { until: a.now() + sec, bx: f.x, ph: Math.random() * 6, clouds, tintAt: 0 });
    f.tint(0x6a6462);
    a.sfx('sfx_sweep_soot', { volume: 0.5, throttle: 250 });
    if (this.every('sootQuip', 1.2)) a.quip(f.x, f.cy - 140, 'LOST IN SOOT!', '#cfc6bc', 34);
    if (this.every('sootFire', 1.5)) t.perkFired({ quip: false });
  }

  /** Comet Calzone: the Cosmic Croc's comet streaks down onto the toughest foot on the table for ×4. */
  private comet(f: Foot): void {
    const a = this.a;
    const dmg = this.run.stats.damage * 4;
    const light = this.bossOn();
    const dir = f.cx > 1200 ? -1 : 1;
    const sx = f.cx + dir * 640;
    const sy = -90;
    // (its tail streams up behind it, whichever side it comes from)
    const m = this.sc.add.image(sx, sy, 'pk_comet').setScale(0.9).setFlipX(dir < 0).setOrigin(dir < 0 ? 1 - 110 / 320 : 110 / 320, 210 / 320);
    const halo = this.sc.add.image(sx, sy, 'glow').setTint(0x7ab8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setAlpha(0.8);
    a.fxLayer.add([halo, m]);
    a.sfx('sfx_cosmiccroc_meteor', { volume: 0.6, throttle: 200 });
    for (const p of this.with('comet')) p.perkFired({ quip: false });
    this.sc.tweens.add({
      targets: [m, halo],
      x: f.cx,
      y: f.cy,
      duration: 480,
      ease: 'Sine.In',
      onUpdate: () => {
        if (crand() < 0.7) a.fx.propTrail(m.x + dir * 14, m.y - 14, crand() < 0.5 ? 0x9ad0ff : 0xffffff, 0.7);
      },
      onComplete: () => {
        m.destroy();
        halo.destroy();
        a.fx.explosion(f.cx, f.cy, light ? 120 : 170);
        a.fx.ring(f.cx, f.cy + 20, 0x9ad0ff, 2, 0.45);
        a.shake(light ? 110 : 170, light ? 0.004 : 0.006);
        a.sfx('sfx_cosmiccroc_impact', { volume: 0.6, throttle: 120 });
        if (!f.alive) return;
        this.h.dealDamage(f, dmg, 'explode', 500, 'perk:comet');
        a.quip(f.x, f.cy - 140, 'COMET! ×4', '#9ad0ff', 42);
      },
    });
  }

  /** Phantom Waltz: a fallen foot rises as a friendly ghost of the Phantom King's court. It waltzes a turn, then glides
   *  to a pizza with no ghost (the one it fell over, else the most hurt) and guards it from the next stomp. It's a
   *  sprite, never a foot: nothing zombifies it, smacks pass through it, and it waits out the shop. */
  private raiseGhost(f: Foot): void {
    const a = this.a;
    const free = a.alivePizzas().filter((p) => !p.haunted && !this.ghosts.some((g) => g.p === p));
    if (!free.length) return;
    const p = f.target && free.includes(f.target) ? f.target : free.sort((x, y) => x.slices / x.maxSlices - y.slices / y.maxSlices)[0];
    const img = this.sc.add.image(f.cx, f.cy, 'pk_waltzghost').setScale(0.2).setAlpha(0);
    const glow = this.sc.add.image(f.cx, f.cy, 'glow').setTint(0xc8a8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setAlpha(0);
    a.fxLayer.add([glow, img]);
    const g = { p, img, glow, ph: crand() * 6, ready: false };
    this.ghosts.push(g);
    const [gx, gy] = this.ghostSpot(p);
    // up out of the fallen foot, a twirl, then off to its pizza
    this.sc.tweens.add({ targets: img, alpha: 0.92, scale: 0.72, y: f.cy - 90, duration: 380, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: glow, alpha: 0.5, y: f.cy - 90, duration: 380, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: img, angle: 360, delay: 380, duration: 520, ease: 'Sine.InOut' });
    this.sc.tweens.add({
      targets: [img, glow],
      x: gx,
      y: gy,
      delay: 900,
      duration: 620,
      ease: 'Sine.InOut',
      onComplete: () => {
        img.setAngle(0);
        g.ready = true;
      },
    });
    a.sfx('sfx_phantomking_stir', { volume: 0.45, throttle: 400 });
    if (this.every('ghostQuip', 1.5)) a.quip(f.x, f.cy - 150, 'A FRIENDLY GHOST!', '#d8c8ff', 32);
    for (const q of this.with('ghostAlly')) q.perkFired({ quip: false });
  }

  /** Where a ghost guards its pizza: beside the pie, over its rim, clear of its face. */
  private ghostSpot(p: Pizza): [number, number] {
    const side = p.x > 960 ? -1 : 1;
    return [p.x + side * p.radius * 0.95, p.surfaceY - 150];
  }

  /** The ghosts bob and sway (a slow waltz) by their pizzas; one whose pizza is gone drifts away. */
  private ghostTick(): void {
    if (!this.ghosts.length) return;
    const now = this.a.now();
    for (const g of [...this.ghosts]) {
      if (g.p.dead) {
        this.ghosts.splice(this.ghosts.indexOf(g), 1);
        this.sc.tweens.killTweensOf([g.img, g.glow]);
        this.sc.tweens.add({ targets: [g.img, g.glow], alpha: 0, y: '-=120', duration: 700, onComplete: () => { g.img.destroy(); g.glow.destroy(); } });
        continue;
      }
      if (!g.ready) continue;
      const [gx, gy] = this.ghostSpot(g.p);
      const x = gx + Math.sin(now * 1.4 + g.ph) * 14;
      const y = gy + Math.sin(now * 2.2 + g.ph) * 9;
      g.img.setPosition(x, y).setRotation(Math.sin(now * 1.4 + g.ph) * 0.14);
      g.glow.setPosition(x, y + 6).setAlpha(0.38 + Math.sin(now * 3 + g.ph) * 0.1);
    }
  }

  /** A ghost takes the stomp for its pizza: it swoops into the foot with a "BOO!" and is gone. */
  private ghostBlock(g: Ghost, f: Foot): void {
    const a = this.a;
    const p = g.p;
    g.ready = false;
    this.ghosts.splice(this.ghosts.indexOf(g), 1);
    this.sc.tweens.killTweensOf([g.img, g.glow]);
    this.sc.tweens.add({
      targets: [g.img, g.glow],
      x: f.cx,
      y: f.cy + 20,
      duration: 140,
      ease: 'Quad.In',
      onComplete: () => {
        a.fx.ring(f.cx, f.cy, 0xc8a8ff, 1.6, 0.45);
        this.sc.tweens.add({ targets: [g.img, g.glow], alpha: 0, scale: 0.9, duration: 360, ease: 'Quad.Out', onComplete: () => { g.img.destroy(); g.glow.destroy(); } });
      },
    });
    f.knock(800);
    if (!f.isBossLike) f.stun(0.5);
    a.quip(f.x, p.surfaceY - 160, 'BOO! BLOCKED!', '#d8c8ff', 44);
    a.sfx('sfx_smack_ghost_heavy', { volume: 0.55 });
    a.sfx('sfx_phantomking_fade', { volume: 0.4, throttle: 300 });
    for (const q of this.with('ghostAlly')) q.perkFired({ quip: false });
  }

  /** Phantom Waltz's ghosts on the table now (the STATS tab). */
  ghostCount(): number {
    return this.ghosts.length;
  }

  /** The wave's over (or the scene's going): the ink, soot, splats and sand go; the ghosts hide till the next wave
   *  (all: they go too). */
  private clearEpics(all: boolean): void {
    const held = [...this.inked.keys(), ...this.sooted.keys()];
    for (const ink of this.inked.values()) this.dropImgs(ink.blobs, all);
    for (const so of this.sooted.values()) this.dropImgs(so.clouds, all);
    this.inked.clear();
    this.sooted.clear();
    if (!all) for (const f of held) this.release(f);
    for (const sp of this.splats.values()) if (sp.img.active) sp.img.destroy();
    this.splats.clear();
    this.dropImgs(this.sandTowers, all);
    this.sandTowers = [];
    this.sandLeft = 0;
    for (const g of this.ghosts) {
      if (all) {
        g.img.destroy();
        g.glow.destroy();
        continue;
      }
      this.sc.tweens.killTweensOf([g.img, g.glow]);
      g.img.setAngle(0).setScale(0.72).setAlpha(0.92).setVisible(false);
      g.glow.setAlpha(0.4).setVisible(false);
      g.ready = true;
    }
    if (all) this.ghosts = [];
    // the Epic Pizzeria pizzas': stone, lost feet, embers, gusts and whirlpools go with the wave
    const lost = [...this.lostFeet.keys()];
    for (const st of this.stoned.values()) this.dropImgs([st.crack], all);
    for (const l of this.lostFeet.values()) this.dropImgs([l.maze], all);
    for (const w of this.whirled.values()) this.dropImgs([w.img], all);
    for (const e of this.embers) this.dropImgs([e.img, e.glow], all);
    const tinted = [...this.stoned.keys(), ...this.whirled.keys()];
    this.stoned.clear();
    this.lostFeet.clear();
    this.whirled.clear();
    this.embers = [];
    this.blown.clear();
    // the Epic milestones': the Bifröst and the coils go with the wave
    for (const b of this.bridges) this.dropImgs([b.img, b.glow], all);
    this.bridges = [];
    for (const co of this.coiled.values()) this.dropImgs([co.img], all);
    tinted.push(...this.coiled.keys());
    this.coiled.clear();
    if (!all) {
      for (const f of lost) this.release(f);
      for (const f of tinted) if (f.alive && f.stunT <= 0) f.clearTint();
    }
  }

  /** Fade images out (now: the scene is going, so destroy them without starting tweens). */
  private dropImgs(imgs: Phaser.GameObjects.Image[], now = false): void {
    for (const o of imgs) {
      if (!o.active) continue;
      this.sc.tweens.killTweensOf(o);
      if (now) o.destroy();
      else this.sc.tweens.add({ targets: o, alpha: 0, duration: 250, onComplete: () => o.destroy() });
    }
  }

  // ——— the Epic Pizzeria pizzas (step 4, batch 2): Act 9's myths, each from its boss's props and sounds ———

  /** Colossus Forge, as a wave starts: the hammer comes down on the anvil, sparks fly off the pie, and its bonus shows. */
  private forgeStrike(p: Pizza): void {
    const a = this.a;
    const light = this.bossOn();
    const y = p.surfaceY - 40;
    a.sfx('sfx_colossus_anvil', { volume: 0.6 });
    this.sc.time.delayedCall(140, () => a.sfx('sfx_colossus_clang', { volume: 0.45, rate: 0.9 }));
    a.fx.ring(p.x, p.surfaceY - 20, 0xffa040, 1.8, 0.45);
    // sparks thrown up and out off the pie, falling back as they cool
    for (let i = 0; i < (light ? 8 : 16); i++) {
      const ang = -Math.PI / 2 + (crand() - 0.5) * 2.4;
      const sp = 220 + crand() * 260;
      const s = this.sc.add.image(p.x + (crand() - 0.5) * 40, y, 'glow').setTint(crand() < 0.5 ? 0xffd070 : 0xff7a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.08 + crand() * 0.06);
      a.fxLayer.add(s);
      this.sc.tweens.add({ targets: s, x: s.x + Math.cos(ang) * sp * 0.6, y: s.y + Math.sin(ang) * sp * 0.5 + 90, alpha: 0, scale: 0.02, duration: 520 + crand() * 300, ease: 'Quad.Out', onComplete: () => s.destroy() });
    }
    // a bronze plate glinting up off the pie
    const plate = this.sc.add.image(p.x, y, 'p_colossus_glint').setScale(0.3).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD);
    a.fxLayer.add(plate);
    this.sc.tweens.add({ targets: plate, y: y - 70, scale: 0.6, alpha: 0, duration: 600, ease: 'Quad.Out', onComplete: () => plate.destroy() });
    a.quip(p.x, p.surfaceY - 180, `THE FORGE: +${Math.round(this.forgePct(p))}% DAMAGE`, '#ffb060', 32);
    p.perkFired({ quip: false });
  }

  /** Gorgon's Gaze is turning a foot to stone now (it takes double). */
  private stoneOn(f: Foot): boolean {
    const st = this.stoned.get(f);
    return !!st && this.a.now() < st.until;
  }

  /** Gorgon's Gaze: the first ordinary foot to hover over the pie each wave meets Medusa's eyes. */
  private gorgonGaze(perk: string): void {
    const a = this.a;
    for (const f of a.allFeet()) {
      if (!f.alive || !f.hittable || f.isBossLike || f.puppet || f.brain.free || f.state !== 'hover' || f.y < 60 || this.stoned.has(f)) continue;
      const t = f.target;
      if (!grantsPerk(t, perk) || t.flags.gorgonWave === this.wave()) continue;
      t.flags.gorgonWave = this.wave();
      this.gaze(f, t);
    }
  }

  /** Gorgon's Gaze: the stone feet stay stone for their time, and crumble back. */
  private gorgonStone(): void {
    const now = this.a.now();
    for (const [f, st] of this.stoned) {
      st.crack.setPosition(f.cx, this.stoneY(f));
      if (!f.alive || now >= st.until) {
        this.stoned.delete(f);
        this.crumble(f, st.crack);
        continue;
      }
      // (a smack's flash clears the grey: it goes back on after)
      if (!f.flashing && now - st.tintAt > 0.2) {
        f.tint(0x86847e);
        st.tintAt = now;
      }
    }
  }

  /** Medusa's gaze: a green glare from the pie up to the foot, and it greys over into a statue for 3 s (enhanced 5). */
  private gaze(f: Foot, p: Pizza): void {
    const a = this.a;
    const sec = p.enhanced ? 5 : 3;
    const x0 = p.x;
    const y0 = p.surfaceY - 30;
    // two eyes opening on the back of the pie, then the glare
    for (const s of [-1, 1]) {
      const e = this.sc.add.image(x0 + s * 22, y0 - 8, 'glow').setTint(0x9dff6a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.05, 0.02).setAlpha(0.95);
      a.fxLayer.add(e);
      this.sc.tweens.add({ targets: e, scaleX: 0.22, scaleY: 0.12, duration: 160, yoyo: true, hold: 360, onComplete: () => e.destroy() });
    }
    const len = Math.max(60, Math.hypot(f.cx - x0, f.cy - y0));
    const beam = this.sc.add.image(x0, y0, 'pk_beam').setOrigin(0.5, 0).setTint(0x9dff6a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    beam.setRotation(Math.atan2(f.cy - y0, f.cx - x0) - Math.PI / 2).setScale(0.8, len / 512);
    const core = this.sc.add.image(x0, y0, 'pk_beam').setOrigin(0.5, 0).setTint(0xeaffd8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    core.setRotation(beam.rotation).setScale(0.28, len / 512);
    a.fxLayer.addAt(core, 0);
    a.fxLayer.addAt(beam, 0);
    this.sc.tweens.add({ targets: beam, alpha: 1, duration: 140, delay: 120 });
    this.sc.tweens.add({ targets: core, alpha: 0.9, duration: 140, delay: 120 });
    this.sc.tweens.add({ targets: [beam, core], alpha: 0, scaleX: 0.1, delay: 620, duration: 320, onComplete: () => { beam.destroy(); core.destroy(); } });
    a.sfx('sfx_medusa_gaze', { volume: 0.55, throttle: 300 });
    p.perkFired({ quip: false });
    this.sc.time.delayedCall(260, () => {
      if (!f.alive || this.stoned.has(f)) return;
      a.sfx('sfx_medusa_petrify', { volume: 0.5, throttle: 300 });
      f.knock(300);
      // (a frozen foot stays frozen under the stone: a plain stun would thaw it)
      if (!(f.stunT > 0 && f.frozen)) f.stun(sec);
      f.flash(0xf0ece0, 120);
      a.fx.ring(f.cx, f.cy + 30, 0x9dff6a, 1.4, 0.45);
      // grey stone flecks puff off it as it sets
      for (let i = 0; i < 8; i++) {
        const ang = crand() * Math.PI * 2;
        const c = this.sc.add.image(f.cx + Math.cos(ang) * 30, f.cy + Math.sin(ang) * 40, 'crumb2').setTint(crand() < 0.5 ? 0xb8b6ac : 0x8a877c).setScale(0.4 + crand() * 0.4);
        a.fxLayer.add(c);
        this.sc.tweens.add({ targets: c, x: c.x + Math.cos(ang) * 50, y: c.y + Math.sin(ang) * 40 + 40, alpha: 0, duration: 500, ease: 'Quad.Out', onComplete: () => c.destroy() });
      }
      const crack = this.sc.add.image(f.cx, this.stoneY(f), 'p9_crack2').setAlpha(0).setScale(0.95);
      a.fxLayer.add(crack);
      this.sc.tweens.add({ targets: crack, alpha: 0.95, duration: 200 });
      this.stoned.set(f, { until: a.now() + sec, crack, tintAt: -1 });
      a.quip(f.x, f.cy - 140, 'TURNED TO STONE! ×2', '#c8ffa0', 36);
    });
  }

  /** Where a stone foot's crack shows: low on the foot, the part that's always on screen. */
  private stoneY(f: Foot): number {
    return f.y - f.meta.footHeight * f.scale * 0.22;
  }

  /** The stone wears off: it crumbles away off the foot. */
  private crumble(f: Foot, crack: Phaser.GameObjects.Image): void {
    const a = this.a;
    this.dropImgs([crack]);
    if (!f.alive) return;
    if (f.stunT <= 0) f.clearTint();
    a.sfx('sfx_medusa_crumble', { volume: 0.35, throttle: 300 });
    for (let i = 0; i < 6; i++) {
      const c = this.sc.add.image(f.cx + (crand() - 0.5) * 70, f.cy + (crand() - 0.5) * 60, 'crumb2').setTint(0xb8b6ac).setScale(0.35 + crand() * 0.35);
      a.fxLayer.add(c);
      this.sc.tweens.add({ targets: c, y: c.y + 120, alpha: 0, angle: crand() * 200, duration: 600, ease: 'Quad.In', onComplete: () => c.destroy() });
    }
  }

  /** Three-Headed Hound: the smack's bite and two more, one for each of Cerberus's heads (fire, ice, poison). The two
   *  extra bites hit for a smack's damage each (no crit). */
  private tripleBite(f: Foot, p: Pizza): void {
    const a = this.a;
    const heads = ['p9_temper_fire', 'p9_temper_ice', 'p9_temper_poison'];
    const tints = [0xff8a3a, 0x9ad8ff, 0x9dff6a];
    const side = f.cx > 960 ? -1 : 1;
    heads.forEach((key, i) => {
      this.sc.time.delayedCall(i * 120, () => {
        if (!f.alive && i > 0) return;
        const x = f.cx + side * (60 - i * 50);
        const y = f.cy - 30 + (i % 2 ? 26 : -10);
        const head = this.sc.add.image(x - side * 30, y, key).setScale(0.12).setAlpha(0);
        a.fxLayer.add(head);
        this.sc.tweens.add({ targets: head, x, scale: 0.62, alpha: 1, duration: 90, ease: 'Back.Out' });
        this.sc.tweens.add({ targets: head, alpha: 0, scale: 0.5, delay: 260, duration: 220, onComplete: () => head.destroy() });
        a.fx.ring(f.cx, f.cy + 10, tints[i], 0.9, 0.5);
        a.sfx('sfx_cerberus_bark', { volume: 0.32, rate: [0.95, 1.05, 1.15][i] + crand() * 0.05, throttle: 60 });
        if (i > 0 && f.alive) {
          this.h.dealDamage(f, this.run.stats.damage, 'direct', 120, 'perk:tripleBite');
          a.fx.impact(f.cx + (crand() - 0.5) * 40, f.cy + (crand() - 0.5) * 40, false);
        }
      });
    });
    if (this.every('biteQuip', 1.2)) a.quip(f.x, f.cy - 140, 'THREE BITES!', '#ffb070', 34);
    if (this.every('biteFire', 1)) p.perkFired({ quip: false });
  }

  /** Labyrinth Lasagne: its stomper is lost in the Minotaur's maze. It's sent to another lane (if one's free) and,
   *  once back up in its hover, waits 2 s (enhanced 3) longer before its next dive. */
  private lose(f: Foot, p: Pizza): void {
    const a = this.a;
    const sec = p.enhanced ? 3 : 2;
    const have = this.lostFeet.get(f);
    if (have) {
      have.start = -1;
      have.sec = sec;
      return;
    }
    this.h.relane(f);
    const maze = this.sc.add.image(f.cx, f.cy - 120, 'pk_maze').setScale(0).setAlpha(0.95);
    a.fxLayer.add(maze);
    this.sc.tweens.add({ targets: maze, scale: 0.8, duration: 220, ease: 'Back.Out' });
    this.lostFeet.set(f, { start: -1, sec, maze });
    // the Minotaur's walls jut up either side of the pie for a moment
    for (const s of [-1, 1]) {
      const w = this.sc.add.image(f.x + s * 80, p.surfaceY - 10, 'p9_wall').setOrigin(0.5, 1).setScale(0.3, 0);
      a.fxLayer.addAt(w, 0);
      this.sc.tweens.add({ targets: w, scaleY: 0.3, duration: 140, ease: 'Back.Out' });
      this.sc.tweens.add({ targets: w, scaleY: 0, alpha: 0, delay: 500, duration: 260, ease: 'Quad.In', onComplete: () => w.destroy() });
    }
    a.sfx('sfx_minotaur_walls', { volume: 0.4, rate: 1.2, throttle: 400 });
    if (this.every('mazeQuip', 1.2)) a.quip(f.x, f.cy - 160, 'LOST IN THE LABYRINTH!', '#f2d08a', 32);
    if (this.every('mazeFire', 1)) p.perkFired({ quip: false });
  }

  /** Lost feet wait out their extra time in their hover, the maze turning over them. */
  private mazeTick(): void {
    if (!this.lostFeet.size) return;
    const now = this.a.now();
    for (const [f, l] of this.lostFeet) {
      l.maze.setPosition(f.cx, f.cy - f.meta.footHeight * f.type.scale * 0.55 - 40).setRotation(now * 1.6);
      if (l.start < 0 && f.alive && f.state === 'hover') l.start = now;
      const end = !f.alive || (l.start >= 0 && now >= l.start + f.hoverTime + l.sec);
      if (end) {
        this.lostFeet.delete(f);
        this.dropImgs([l.maze]);
        this.release(f);
        continue;
      }
      // (on top of its usual wait in the hover: the foot dives that much later)
      if (l.start >= 0) f.brain.holdHoverT = l.start + f.hoverTime + l.sec - now;
    }
  }

  /** Ember Shade: a fallen foot leaves embers hanging where it fell (at most six at once). */
  private dropEmbers(f: Foot): void {
    const a = this.a;
    if (this.embers.length >= 6) return;
    const table = (a.alivePizzas()[0]?.surfaceY ?? 820) - 140;
    const x = Phaser.Math.Clamp(f.cx, 90, 1830);
    const y = Phaser.Math.Clamp(f.cy, 220, table);
    const glow = this.sc.add.image(x, y, 'glow').setTint(0xff6a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setAlpha(0);
    const img = this.sc.add.image(x, y, 'pk_embers').setScale(0.2).setAlpha(0);
    a.fxLayer.add([glow, img]);
    this.sc.tweens.add({ targets: img, scale: 0.8, alpha: 1, duration: 260, ease: 'Back.Out' });
    this.sc.tweens.add({ targets: glow, scale: 0.75, alpha: 0.5, duration: 260 });
    this.embers.push({ x, y, img, glow, ph: crand() * 6, done: false });
    a.sfx('sfx_hades_flare', { volume: 0.25, rate: 1.3, throttle: 500 });
    if (this.every('emberFire', 2)) for (const p of this.with('emberTrail')) p.perkFired({ quip: false });
  }

  /** The embers flicker where they hang; the next foot through catches them and burns (6 a second; enhanced 9). */
  /** Ember Shade's embers glow where they fell (props: they outlive their kill) and leap onto the next foot through
   *  while a pie grants the perk (`pies`: the bus's grant). Each ember glows, then looks for its foot, in turn. */
  private emberTick(pies: Pizza[]): void {
    if (!this.embers.length) return;
    const a = this.a;
    const now = a.now();
    const dps = 6 * (pies.some((p) => p.enhanced) ? 1.5 : 1) * this.boost();
    for (const e of this.embers) {
      if (e.done) continue;
      const fl = Math.sin(now * 7 + e.ph) * 0.04 + Math.sin(now * 11.3 + e.ph) * 0.03;
      e.img.setScale(0.8 + fl, 0.8 - fl);
      e.glow.setAlpha(0.42 + fl * 3);
      if (crand() < 0.04) a.fx.propTrail(e.x + (crand() - 0.5) * 30, e.y - 20, crand() < 0.5 ? 0xff8a3a : 0x6ab8ff, 0.35);
      if (!pies.length) continue;
      const f = a.allFeet().find((o) => o.alive && o.hittable && !o.type.traits.includes('immuneBurn') && !o.insulated && o.distanceTo(e.x, e.y) < 80);
      if (!f) continue;
      e.done = true;
      f.burnT = Math.max(f.burnT, 3);
      f.burnDps = Math.max(f.burnDps, dps);
      // the embers leap onto it and it catches
      this.sc.tweens.killTweensOf([e.img, e.glow]);
      this.sc.tweens.add({ targets: [e.img, e.glow], x: f.cx, y: f.cy, scale: 0.2, alpha: 0, duration: 220, ease: 'Quad.In', onComplete: () => { e.img.destroy(); e.glow.destroy(); } });
      for (let i = 0; i < 4; i++) this.sc.time.delayedCall(i * 70, () => f.alive && a.fx.burn(f.cx + (crand() - 0.5) * 50, f.cy + (crand() - 0.5) * 50));
      a.sfx('sfx_fire', { volume: 0.4, throttle: 200 });
      if (this.every('emberQuip', 1.2)) a.quip(f.x, f.cy - 130, `EMBERS! ${Math.round(dps)}/s`, '#ff9a5a', 32);
    }
    this.embers = this.embers.filter((e) => !e.done);
  }

  /** Siren's Song: the Sirens sing from the pie, notes drift to every foot, and they all stand enchanted for 1.5 s
   *  (bosses and mini-bosses are only lulled: 40% slower for 1.5 s). */
  private sirenSong(): void {
    const a = this.a;
    const pies = this.with('sirenSong');
    const src = pies[0];
    const light = this.bossOn();
    a.quip(960, 300, "SIREN'S SONG!", '#8ff0e0', 50);
    a.sfx('sfx_sirensong', { volume: 0.7 });
    for (const p of pies) p.perkFired({ quip: false });
    if (src) {
      // the song rolling out over the table from the pie, in soft rings
      for (let i = 0; i < 3; i++) this.sc.time.delayedCall(i * 180, () => a.fx.ring(src.x, src.surfaceY - 30, 0x8ff0e0, 1.6 + i * 0.5, 0.4));
    }
    for (const f of a.allFeet()) {
      if (!f.alive || !f.hittable) continue;
      // (bosses, mini-bosses and feet a fight moves by hand are only lulled; a frozen foot stays frozen)
      if (f.isBossLike || f.puppet || f.brain.free) {
        if (!f.type.traits.includes('immuneSlow') && (f.slowT <= 0 || f.slowPct <= 0.4)) {
          f.slowPct = 0.4;
          f.slowT = Math.max(f.slowT, 1.5);
        }
      } else if (!(f.stunT > 0 && f.frozen)) {
        f.stun(1.5);
        f.tint(0x9ae8e0);
      }
      // notes drifting from the pie to it, and swaying over it
      const sx = src?.x ?? 960;
      const sy = (src?.surfaceY ?? 820) - 60;
      for (let n = 0; n < (light ? 1 : 2); n++) {
        const note = this.sc.add.image(sx, sy, 'p9_note').setScale(0.3).setAlpha(0).setTint(n ? 0xd8c8ff : 0x9af0e0);
        a.fxLayer.add(note);
        const tx = f.cx + (n ? 40 : -40);
        const ty = f.cy - 90;
        this.sc.tweens.add({ targets: note, alpha: 1, duration: 120, delay: n * 160 });
        this.sc.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 520,
          delay: n * 160,
          ease: 'Sine.Out',
          onUpdate: (tw) => {
            const u = tw.getValue() ?? 0;
            note.setPosition(sx + (tx - sx) * u, sy + (ty - sy) * u - Math.sin(Math.PI * u) * 90).setScale(0.3 + 0.25 * u);
          },
        });
        this.sc.tweens.add({ targets: note, angle: { from: -14, to: 14 }, duration: 300, yoyo: true, repeat: 2, delay: 680 + n * 160, ease: 'Sine.InOut' });
        this.sc.tweens.add({ targets: note, alpha: 0, y: ty - 50, delay: 1500 + n * 160, duration: 400, onComplete: () => note.destroy() });
      }
      a.fx.ring(f.cx, f.cy + 30, 0x8ff0e0, 1.1, 0.4);
    }
  }

  /** Harpy Feather Pie: every 5 s, once a foot is over it, a gust off the pie blows the feet above it 100 px back up
   *  (enhanced 150; heavy feet and bosses move less, as with any knock). */
  private harpyGusts(dt: number, pies: Pizza[]): void {
    const a = this.a;
    const on = a.allFeet().some((f) => f.alive && f.hittable && f.y > 60);
    for (const p of pies) {
      const t = (this.harpyT.get(p) ?? 0) + (on ? dt : 0);
      const above = a.allFeet().filter((f) => f.alive && f.hittable && f.target === p && (f.state === 'hover' || f.state === 'descend') && f.y > 120 && !f.puppet && !f.brain.free);
      if (t >= 5 && above.length) {
        this.harpyT.set(p, 0);
        this.gust(p, above);
      } else this.harpyT.set(p, t);
    }
  }

  /** The feet being blown up rise quickly through what's left of their push. */
  private harpyBlown(dt: number): void {
    for (const [f, left] of this.blown) {
      if (!f.alive || left <= 0 || f.stunT > 0 || f.held || f.pinned) {
        this.blown.delete(f);
        continue;
      }
      const step = Math.min(left, 700 * dt);
      // (never down: a foot already near the top stays where it is)
      f.y = Math.min(f.y, Math.max(110, f.y - step));
      if (f.state === 'descend') f.vy = Math.min(f.vy, 0);
      if (f.y <= 110) this.blown.delete(f);
      else this.blown.set(f, left - step);
    }
  }

  private gust(p: Pizza, feet: Foot[]): void {
    const a = this.a;
    const light = this.bossOn();
    const px = p.enhanced ? 150 : 100;
    a.sfx('sfx_harpy', { volume: 0.4, throttle: 400 });
    a.sfx('sfx_whoosh', { volume: 0.5, rate: 0.8, throttle: 200 });
    if (this.every('harpyQuip', 3)) a.quip(p.x, p.surfaceY - 200, 'HARPY GUST!', '#d8c0ff', 36);
    p.perkFired({ quip: false });
    const table = p.surfaceY - 30;
    for (const f of feet) {
      let push = px;
      if (f.type.traits.includes('heavy')) push *= 0.35;
      if (f.isBossLike) push *= 0.4;
      this.blown.set(f, push);
      // feathers whirled up from the pie past the foot, and streaks of wind
      for (let i = 0; i < (light ? 2 : 4); i++) {
        const fe = this.sc.add.image(f.x + (crand() - 0.5) * 80, table, 'pk_feather').setScale(0.5 + crand() * 0.2).setRotation(crand() * 6).setAlpha(0.95);
        a.fxLayer.add(fe);
        this.sc.tweens.add({ targets: fe, y: f.cy - 60 - crand() * 80, x: fe.x + (crand() - 0.5) * 120, rotation: fe.rotation + (crand() - 0.5) * 8, duration: 520 + crand() * 200, delay: i * 50, ease: 'Quad.Out' });
        this.sc.tweens.add({ targets: fe, alpha: 0, delay: 500 + i * 50, duration: 300, onComplete: () => fe.destroy() });
      }
      for (let i = 0; i < 3; i++) {
        const sx = f.x + (i - 1) * 34;
        const st = this.sc.add.image(sx, table - 40, 'glow').setOrigin(0.5, 1).setTint(0xf0e8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.06, 0.2).setAlpha(0.6);
        a.fxLayer.addAt(st, 0);
        this.sc.tweens.add({ targets: st, y: f.cy + 40, scaleY: 1.1, alpha: 0, duration: 380, delay: i * 40, ease: 'Quad.Out', onComplete: () => st.destroy() });
      }
    }
  }

  /** Golden Fleece: a boss or mini-boss falls and the Fleece shines over it, its tips half as much again. */
  private fleece(f: Foot): void {
    const a = this.a;
    const x = f.cx;
    const y = Math.max(220, f.cy - 60);
    const glow = this.sc.add.image(x, y, 'glow').setTint(0xffd04a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.4).setAlpha(0);
    const img = this.sc.add.image(x, y - 80, 'pk_fleece').setScale(0.4).setAlpha(0);
    a.fxLayer.add([glow, img]);
    this.sc.tweens.add({ targets: img, y, scale: 1, alpha: 1, duration: 420, ease: 'Back.Out' });
    this.sc.tweens.add({ targets: glow, scale: 1.6, alpha: 0.7, duration: 420, yoyo: true, hold: 700 });
    this.sc.tweens.add({ targets: img, angle: { from: -5, to: 5 }, duration: 400, yoyo: true, repeat: 1, delay: 420, ease: 'Sine.InOut' });
    this.sc.tweens.add({ targets: img, alpha: 0, y: y - 60, delay: 1500, duration: 400, onComplete: () => { img.destroy(); glow.destroy(); } });
    a.fx.glint(x, y, 6);
    a.fx.ring(x, y + 40, 0xffd04a, 2, 0.45);
    a.sfx('sfx_smack_gold_heavy', { volume: 0.5 });
    this.sc.time.delayedCall(200, () => a.sfx('sfx_hero_coins', { volume: 0.5 }));
    const pct = Math.round(50 * this.c('goldenFleece'));
    a.quip(x, y - 120, `GOLDEN FLEECE: +${pct}% TIPS`, '#ffd23f', 38);
    for (const p of this.with('goldenFleece')) p.perkFired({ quip: false });
  }

  /** Charybdis Swirl: the smack drags the foot down into Charybdis's whirlpool, spinning, for 1.5 s. Bosses, mini-bosses
   *  and feet a fight moves by hand don't go under. */
  private whirlpool(f: Foot): void {
    if (f.isBossLike || f.puppet || f.brain.free || this.whirled.has(f) || (f.stunT > 0 && f.frozen)) return;
    const a = this.a;
    const now = a.now();
    f.stun(1.5);
    // pulled down a little (a hovering foot only: a diving one could be pulled onto the pie)
    if (f.state === 'hover') f.y += 24;
    const img = this.sc.add.image(f.cx, f.y + 14, 'ev_charybdis').setAlpha(0).setBlendMode(Phaser.BlendModes.NORMAL);
    img.setScale(200 / img.width, (200 / img.width) * 0.4);
    a.fxLayer.addAt(img, 0);
    this.sc.tweens.add({ targets: img, alpha: 0.9, duration: 160 });
    this.whirled.set(f, { until: now + 1.5, img, tintAt: -1 });
    for (let i = 0; i < 8; i++) {
      const ang = crand() * Math.PI * 2;
      const b = this.sc.add.image(f.cx + Math.cos(ang) * 70, f.y + 14 + Math.sin(ang) * 22, 'glow').setTint(0xbfe8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.06);
      a.fxLayer.add(b);
      this.sc.tweens.add({ targets: b, x: f.cx, y: f.y + 14, scale: 0.02, alpha: 0, duration: 500 + crand() * 300, ease: 'Quad.In', onComplete: () => b.destroy() });
    }
    a.sfx('sfx_whirlpool', { volume: 0.4, throttle: 500 });
    a.sfx('sfx_kraken_splash', { volume: 0.35, throttle: 200 });
    if (this.every('whirlQuip', 1.2)) a.quip(f.x, f.cy - 140, 'WHIRLPOOL!', '#9ae0ff', 36);
    if (this.every('whirlFire', 1.5)) for (const p of this.with('whirlpool')) p.perkFired({ quip: false });
  }

  /** The whirls turn under their feet, sea-blue, until the stun's over. */
  private whirlTick(): void {
    if (!this.whirled.size) return;
    const now = this.a.now();
    for (const [f, w] of this.whirled) {
      w.img.setPosition(f.cx, f.y + 14).setRotation(now * 5);
      if (!f.alive || now >= w.until) {
        this.whirled.delete(f);
        this.dropImgs([w.img]);
        if (f.alive && f.stunT <= 0) f.clearTint();
        continue;
      }
      if (!f.flashing && now - w.tintAt > 0.2) {
        f.tint(0x8ac8e8);
        w.tintAt = now;
      }
    }
  }

  // ——— the Epic milestones (step 4, batch 3): Act 8's Norse bosses, and Echo Slice ———

  /** Echo Slice: what each one copies now. It copies the pizza on its right in table order, else the one on its left:
   *  never another Echo Slice, a dead, stale or frozen pizza (nothing to copy), the Ghost's possessed one, a Mystery Meat
   *  not yet revealed, or a perk in ECHO_SKIP. Run on every recompute (a swap, a loss, a pizza going stale or coming
   *  back), so it re-copies whenever the table changes. Returns whether any changed. */
  syncEchoes(): boolean {
    const a = this.a;
    const seats = [...a.allPizzas()].sort((p, q) => p.x - q.x);
    let changed = false;
    seats.forEach((e, i) => {
      if (!hasRule(e, Rule.Echo)) return;
      const pick = (q: Pizza | undefined): { k: PizzaPerk; q: Pizza } | null => {
        if (!q || hasRule(q, Rule.Echo) || q.haunted || q.flags.eaten) return null;
        if (hasRule(q, Rule.Mystery) && !q.flags.revealed) return null;
        const k = q.perk;
        return k && !ECHO_SKIP.has(k) ? { k, q } : null;
      };
      const next = pick(seats[i + 1]) ?? pick(seats[i - 1]);
      const n = next ? ALL_PERKS.indexOf(next.k) + 1 : 0;
      const from = next ? PIZZAS.indexOf(next.q.type) + 1 : 0;
      if (Number(e.flags.echo ?? 0) === n && Number(e.flags.echoFrom ?? 0) === from) return;
      e.flags.echo = n;
      e.flags.echoFrom = from;
      changed = true;
      if (e.root.active) e.redraw();
      // a new echo mid-wave: it rings out from the pie with the name of the pizza it's copying
      // eslint-disable-next-line effects/no-own-off-switch -- the echo's own ring: only an Echo Slice whose perk is on rings out
      if (next && a.inWave() && !e.dead && !e.perkOff) {
        a.quip(e.x, e.surfaceY - 190, `ECHOING ${next.q.type.name.toUpperCase()}!`, '#7df9ff', 30);
        a.sfx('sfx_mirrorpeel_echo', { volume: 0.45, throttle: 400 });
        e.perkFired({ quip: false });
      }
    });
    return changed;
  }

  /** Fenrir's Howl: a pizza is lost and the wolf howls. Every ordinary foot flees: a diving or stomping one flies back
   *  up to the top, a hovering one starts its wait over (enhanced: and they're all stunned 1 s once they're up). Bosses
   *  and mini-bosses are only knocked back; feet a fight moves by hand, and friendly zombies, stay where they are. */
  private howl(p: Pizza, enhanced: boolean): void {
    const a = this.a;
    const light = this.bossOn();
    const x = p.x;
    const y = p.surfaceY;
    a.sfx('sfx_fenrir_howl', { volume: 0.8, throttle: 600 });
    this.sc.time.delayedCall(120, () => a.sfx('sfx_fenrir_snap', { volume: 0.45 }));
    for (const q of this.with('fenrirHowl')) q.perkFired({ quip: false });
    a.shake(light ? 100 : 170, light ? 0.003 : 0.005);
    // the wolf rises behind its own pie (the lost one, for a last howl), throws back its head and howls, and fades
    const src = this.with('fenrirHowl')[0] ?? p;
    const wy = src.surfaceY - 90;
    a.quip(src.x, wy - 340, "FENRIR'S HOWL! THE FEET FLEE", '#dfe4ff', 40);
    const wolf = this.sc.add.image(src.x, wy + 30, 'pk_wolf').setOrigin(0.5, 1).setScale(0.3).setAlpha(0);
    a.fxLayer.addAt(wolf, 0);
    this.sc.tweens.add({ targets: wolf, y: wy, scale: 0.85, alpha: 1, duration: 280, ease: 'Back.Out' });
    this.sc.tweens.add({ targets: wolf, angle: -7, duration: 500, delay: 280, ease: 'Sine.Out' });
    this.sc.tweens.add({ targets: wolf, alpha: 0, y: wy - 40, delay: 1000, duration: 420, onComplete: () => wolf.destroy() });
    // the howl rolling out over the table, and Gleipnir's links flung off the pie
    for (let i = 0; i < 3; i++) this.sc.time.delayedCall(140 + i * 150, () => a.fx.ring(x, y - 150, 0xdfe4ff, 2 + i * 0.9, 0.45));
    for (let i = 0; i < (light ? 4 : 7); i++) {
      const ang = -Math.PI / 2 + (crand() - 0.5) * 2.6;
      const sp = 180 + crand() * 200;
      const link = this.sc.add.image(x + (crand() - 0.5) * 50, y - 40, 'p_chainlink').setScale(0.3 + crand() * 0.15).setRotation(crand() * 6);
      a.fxLayer.add(link);
      this.sc.tweens.add({ targets: link, x: link.x + Math.cos(ang) * sp, y: link.y + Math.sin(ang) * sp * 0.6 + 80, rotation: link.rotation + (crand() - 0.5) * 8, alpha: 0, duration: 650 + crand() * 250, ease: 'Quad.Out', onComplete: () => link.destroy() });
    }
    for (const f of a.allFeet()) {
      if (!f.alive || f.zombieHold || f.puppet || f.brain.free) continue;
      if (f.isBossLike) {
        f.knock(1400);
        continue;
      }
      if (f.state === 'descend' || f.state === 'stomp') {
        // it turns tail and flies back up to the top (the lift slows as it rises and stops at the hover line)
        f.setState('lift');
        f.vy = -Math.sqrt(1400 * Math.max(40, f.y - HOVER_Y + 20));
      } else if (f.state === 'hover') {
        // (it starts its wait over, and backs off a little: never down, a foot waiting high stays where it is)
        f.stateT = 0;
        f.y = Math.min(f.y, Math.max(HOVER_Y - 30, f.y - 50));
      } else continue;
      // a streak of wind behind it as it flees
      const st = this.sc.add.image(f.cx, f.cy + 60, 'glow').setOrigin(0.5, 0).setTint(0xdfe4ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.1, 0.6).setAlpha(0.55);
      a.fxLayer.addAt(st, 0);
      this.sc.tweens.add({ targets: st, scaleY: 1.6, alpha: 0, duration: 420, ease: 'Quad.Out', onComplete: () => st.destroy() });
      if (enhanced) this.sc.time.delayedCall(650, () => f.alive && !(f.stunT > 0 && f.frozen) && f.stun(1));
    }
  }

  /** Rainbow Bridge, as a wave starts: each pie bridges a lane (a different one each, while there are lanes to spare),
   *  and the Bifröst comes down over it, faint and behind the pizzas and the feet. */
  private bridgeUp(perk: string, pies: Pizza[]): void {
    const a = this.a;
    const lanes = a.alivePizzas();
    if (!lanes.length) return;
    for (const p of pies) {
      const free = lanes.filter((q) => !this.bridges.some((b) => b.lane === q));
      const pool = free.length ? free : lanes;
      // (which lane is gameplay: Math.random)
      const lane = pool[Math.floor(Math.random() * pool.length)];
      const r = Math.max(110, lane.radius * 1.2);
      const top = 70;
      const h = Math.max(200, lane.surfaceY - 20 - top);
      const glow = this.sc.add.image(lane.x, lane.surfaceY - 30, 'glow').setTint(0xfff2c8).setBlendMode(Phaser.BlendModes.ADD).setScale(1.2, 0.5).setAlpha(0);
      const img = this.sc.add.image(lane.x, lane.surfaceY - 20, 'pk_bifrost').setOrigin(0.5, 1).setScale((r * 2) / 200, 0).setAlpha(0.32);
      a.underLayer.add([glow, img]);
      this.sc.tweens.add({ targets: img, scaleY: h / 512, duration: 520, ease: 'Quad.Out' });
      this.sc.tweens.add({ targets: glow, alpha: 0.5, duration: 300, yoyo: true, hold: 400 });
      this.bridges.push({ src: p, perk, lane, x: lane.x, r, k: this.pk(p), img, glow, ph: crand() * 6 });
      a.sfx('sfx_sungap', { volume: 0.5, throttle: 600 });
      this.sc.time.delayedCall(200, () => a.sfx('sfx_smack_tail_glint', { volume: 0.5, throttle: 300 }));
      a.quip(lane.x, lane.surfaceY - 210, `RAINBOW BRIDGE: +${Math.round(40 * this.pk(p))}% HERE`, '#ffe0a0', 30);
      p.perkFired({ quip: false });
    }
  }

  /** Rainbow Bridge: what a foot in a bridged lane takes (the best bridge it's under; they don't stack). */
  private bridgeMult(f: Foot): number {
    let m = 1;
    // (a bridge whose pizza stopped bridging counts for nothing, even before its tick takes it down)
    for (const b of this.bridges) if (grantsPerk(b.src, b.perk) && Math.abs(f.x - b.x) < b.r) m = Math.max(m, 1 + 0.4 * b.k);
    return m;
  }

  /** The Bifröst shimmers over its lane, and goes when its pizza stops bridging it (lost, stale, its perk frozen or
   *  possessed by the Ghost, or an Echo Slice that no longer copies it). */
  private bridgeTick(): void {
    if (!this.bridges.length) return;
    const now = this.a.now();
    for (const b of this.bridges) {
      if (!grantsPerk(b.src, b.perk)) {
        this.dropImgs([b.img, b.glow]);
        b.k = 0;
        continue;
      }
      b.img.setAlpha(0.28 + 0.06 * Math.sin(now * 2.2 + b.ph));
    }
    this.bridges = this.bridges.filter((b) => b.k > 0);
  }

  /** A smack on a foot in a bridged lane: rainbow sparks off it. */
  private bridgeHit(f: Foot): void {
    if (!this.every('bridgeHit', 0.3)) return;
    const a = this.a;
    const cols = [0xff4d4d, 0xff9f1c, 0xffd23f, 0x5fe06a, 0x4cc9f0, 0x6a7dff, 0xb06bff];
    for (let i = 0; i < (this.bossOn() ? 4 : 7); i++) {
      const ang = (i / 7) * Math.PI * 2 + crand() * 0.4;
      const s = this.sc.add.image(f.cx, f.cy, 'glow').setTint(cols[i % 7]).setBlendMode(Phaser.BlendModes.ADD).setScale(0.07);
      a.fxLayer.add(s);
      this.sc.tweens.add({ targets: s, x: f.cx + Math.cos(ang) * 70, y: f.cy + Math.sin(ang) * 50 - 30, scale: 0.02, alpha: 0, duration: 380 + crand() * 160, ease: 'Quad.Out', onComplete: () => s.destroy() });
    }
    if (this.every('bridgeQuip', 3)) a.quip(f.x, f.cy - 140, `BIFRÖST! +${Math.round((this.bridgeMult(f) - 1) * 100)}%`, '#ffe0a0', 30);
    if (this.every('bridgeFire', 2)) for (const b of this.bridges) b.src.perkFired({ quip: false });
  }

  /** Frostbite: a smack on a cold foot cracks its frost, Thrym's hail chipping off it. */
  private frostbiteHit(f: Foot): void {
    if (!this.every('frostbiteFx', 0.25)) return;
    const a = this.a;
    a.fx.ring(f.cx, f.cy + 20, 0xbfe8ff, 1, 0.45);
    for (let i = 0; i < (this.bossOn() ? 2 : 4); i++) {
      const ang = -Math.PI / 2 + (crand() - 0.5) * 2.8;
      const h = this.sc.add.image(f.cx + (crand() - 0.5) * 40, f.cy + (crand() - 0.5) * 30, 'p_hail').setScale(0.24 + crand() * 0.1).setRotation(crand() * 6);
      a.fxLayer.add(h);
      this.sc.tweens.add({ targets: h, x: h.x + Math.cos(ang) * 90, y: h.y + Math.sin(ang) * 60 + 70, rotation: h.rotation + 3, alpha: 0, duration: 480, ease: 'Quad.Out', onComplete: () => h.destroy() });
    }
    a.sfx('sfx_thrym_crack', { volume: 0.3, rate: 1.2 + crand() * 0.2, throttle: 300 });
    if (this.every('frostbiteQuip', 2.5)) a.quip(f.x, f.cy - 140, `FROSTBITE! +${Math.round(25 * this.c('frostbite'))}%`, '#bfe8ff', 32);
    if (this.every('frostbiteFire', 1.5)) for (const p of this.with('frostbite')) p.perkFired({ quip: false });
  }

  /** Surtr's Ember Crust: a burning foot dies and Surtr's fire leaps from it to the nearest foot (enhanced: the two
   *  nearest; two pies add up, to three), as a fireball. The foot it lands on burns as hot and as long (3 s at least).
   *  Burn-proof and insulated feet don't catch. */
  private spreadFire(f: Foot): void {
    const a = this.a;
    const x = f.cx;
    const y = f.cy;
    const dps = f.burnDps;
    const sec = Math.max(3, f.burnT);
    const fromAbility = f.burnFromAbility;
    const n = Math.min(3, Math.max(1, Math.round(this.c('surtrSpread'))));
    const near = a.allFeet()
      .filter((o) => o !== f && o.alive && o.hittable && !o.type.traits.includes('immuneBurn') && !o.insulated && Math.hypot(o.cx - x, o.cy - y) < 700)
      .sort((p, q) => Math.hypot(p.cx - x, p.cy - y) - Math.hypot(q.cx - x, q.cy - y))
      .slice(0, n);
    if (!near.length) return;
    a.sfx('sfx_surtr_fireball', { volume: 0.45, throttle: 250 });
    if (this.every('surtrQuip', 1.5)) a.quip(x, y - 140, "SURTR'S FIRE SPREADS!", '#ffb060', 34);
    if (this.every('surtrFire', 1.5)) for (const p of this.with('surtrSpread')) p.perkFired({ quip: false });
    for (const o of near) {
      const ball = this.sc.add.image(x, y, 'p_fireball').setScale(0.5);
      a.fxLayer.add(ball);
      const tx = o.cx;
      const ty = o.cy;
      let px = x;
      let py = y;
      // (it arcs over, less near the top of the screen so it stays in sight)
      const lift = Phaser.Math.Clamp(Math.min(y, ty) - 70, 20, 120);
      this.sc.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 360,
        onUpdate: (tw) => {
          const u = tw.getValue() ?? 0;
          const bx = x + (tx - x) * u;
          const by = y + (ty - y) * u - Math.sin(Math.PI * u) * lift;
          // (it points the way it flies, its flames trailing: the drawing falls head down)
          if (bx !== px || by !== py) ball.setRotation(Math.atan2(by - py, bx - px) - Math.PI / 2);
          ball.setPosition(bx, by);
          px = bx;
          py = by;
          if (crand() < 0.6) a.fx.propTrail(bx, by, crand() < 0.5 ? 0xff7a1a : 0xffd070, 0.45);
        },
        onComplete: () => {
          ball.destroy();
          a.fx.burn(tx, ty);
          a.fx.ring(tx, ty + 20, 0xff7a1a, 1.1, 0.45);
          a.sfx('sfx_surtr_ignite', { volume: 0.35, throttle: 200 });
          if (!o.alive || o.insulated || o.type.traits.includes('immuneBurn')) return;
          // (whose fire it is: a foot that wasn't burning takes the spread fire's source with it)
          if (o.burnT <= 0) o.burnFromAbility = fromAbility;
          o.burnT = Math.max(o.burnT, sec);
          o.burnDps = Math.max(o.burnDps, dps);
          for (let i = 0; i < 3; i++) this.sc.time.delayedCall(i * 80, () => o.alive && a.fx.burn(o.cx + (crand() - 0.5) * 50, o.cy + (crand() - 0.5) * 50));
        },
      });
    }
  }

  /** Skald's Saga: a boss falls and the Skald sings it into his saga: runes and notes rise off the pie, and the
   *  damage it adds shows. */
  private saga(p: Pizza): void {
    const a = this.a;
    const light = this.bossOn();
    const x = p.x;
    const y = p.surfaceY - 60;
    a.sfx('sfx_skaldsong', { volume: 0.7, throttle: 1500 });
    a.fx.ring(p.x, p.surfaceY - 24, 0xffd070, 2, 0.45);
    for (let i = 0; i < (light ? 2 : 3); i++) {
      const r = this.sc.add.image(x + (i - 1) * 56, y, `pk_rune${i}`).setScale(0.15).setAlpha(0).setAngle((i - 1) * 8);
      a.fxLayer.add(r);
      this.sc.tweens.add({ targets: r, y: y - 110 - i * 20, scale: 0.55, alpha: 1, duration: 520, delay: i * 140, ease: 'Back.Out' });
      this.sc.tweens.add({ targets: r, alpha: 0, y: y - 170 - i * 20, delay: 1300 + i * 140, duration: 400, onComplete: () => r.destroy() });
    }
    const tints = [0xffd070, 0x6a9ae0, 0xe8584a];
    for (let i = 0; i < (light ? 3 : 6); i++) {
      const n = this.sc.add.image(x + (crand() - 0.5) * 80, y, 'p9_note').setScale(0.22).setTint(tints[i % 3]).setAlpha(0);
      a.fxLayer.add(n);
      this.sc.tweens.add({ targets: n, alpha: 1, duration: 150, delay: i * 90 });
      this.sc.tweens.add({ targets: n, y: y - 150 - crand() * 70, x: n.x + (crand() - 0.5) * 90, angle: (crand() - 0.5) * 40, delay: i * 90, duration: 1100, ease: 'Sine.Out' });
      this.sc.tweens.add({ targets: n, alpha: 0, delay: 900 + i * 90, duration: 350, onComplete: () => n.destroy() });
    }
    a.quip(p.x, p.surfaceY - 210, `SKALD'S SAGA: +${this.skaldPct(p)}% DAMAGE`, '#ffd070', 32);
    p.perkFired({ quip: false });
  }

  /** Serpent's Coil: once a wave, the first ordinary foot to dive on the pie is caught in Jörmungandr's coils and held
   *  where it is for 3 s (enhanced 4.5). Bosses, mini-bosses, feet a fight moves by hand and a foot already frozen
   *  aren't caught (the coil waits for the next). */
  private coilCatch(pies: Pizza[]): void {
    const a = this.a;
    for (const p of pies) {
      if (p.flags.coilWave === this.wave()) continue;
      // (caught well into its dive, low enough that the coils show clear of the top of the screen)
      const f = a.allFeet().find((o) => o.alive && o.hittable && o.state === 'descend' && o.target === p && o.y > Math.max(420, p.surfaceY - 360) && !o.isBossLike && !o.puppet && !o.brain.free && !o.zombieHold && !(o.stunT > 0 && o.frozen) && !this.coiled.has(o));
      if (!f) continue;
      p.flags.coilWave = this.wave();
      this.coil(f, p);
    }
  }

  /** Serpent's Coil: the coils hold their feet, and let go. */
  private coilHold(): void {
    const now = this.a.now();
    for (const [f, co] of this.coiled) {
      const sq = 1 + 0.05 * Math.sin(now * 9);
      co.img.setPosition(f.cx, this.coilY(f)).setScale(co.s * sq, co.s / sq);
      if (!f.alive || now >= co.until) {
        this.coiled.delete(f);
        this.dropImgs([co.img]);
        if (f.alive && f.stunT <= 0) f.clearTint();
        continue;
      }
      // (sea-green while it's held: it's a stun, so keepTint would skip it; a smack's flash clears it, so it goes back on)
      if (!f.flashing && now - co.tintAt > 0.2) {
        f.tint(0x9ad8b0);
        co.tintAt = now;
      }
    }
  }

  /** Where the coils sit on a foot: round its middle. */
  private coilY(f: Foot): number {
    return f.y - f.meta.footHeight * f.scale * 0.34;
  }

  private coil(f: Foot, p: Pizza): void {
    const a = this.a;
    const sec = p.enhanced ? 4.5 : 3;
    f.stun(sec);
    f.flash(0x9ad8b0, 100);
    // the serpent's body whips up out of the pie to the foot, then wraps it
    const sx = p.x;
    const sy = p.surfaceY - 30;
    const len = Math.max(40, sy - f.cy);
    const lash = this.sc.add.image(sx, sy, 'glow').setOrigin(0.5, 1).setTint(0x3f8a6a).setScale(0.18, 0.1).setAlpha(0.9);
    a.fxLayer.addAt(lash, 0);
    this.sc.tweens.add({ targets: lash, x: f.cx, scaleY: len / 110, duration: 140, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: lash, alpha: 0, scaleX: 0.05, delay: 160, duration: 220, onComplete: () => lash.destroy() });
    const full = Phaser.Math.Clamp((f.meta.footHeight * f.scale * 0.95) / 260, 0.45, 1.3);
    const img = this.sc.add.image(f.cx, this.coilY(f), 'pk_coil').setScale(full * 0.3).setAlpha(0);
    a.fxLayer.add(img);
    this.sc.tweens.add({ targets: img, alpha: 1, duration: 160, delay: 120 });
    const co = { until: a.now() + sec, img, tintAt: -1, s: full * 0.3 };
    this.coiled.set(f, co);
    // (the coils tighten: their size grows in through coilTick)
    this.sc.tweens.add({ targets: co, s: full, duration: 260, delay: 120, ease: 'Back.Out' });
    a.fx.ring(f.cx, f.cy + 30, 0x5fcf9a, 1.3, 0.45);
    a.sfx('sfx_jormungandr_constrict', { volume: 0.5, throttle: 400 });
    this.sc.time.delayedCall(200, () => a.sfx('sfx_jormungandr_hiss', { volume: 0.35, throttle: 400 }));
    a.quip(f.x, f.cy - 150, `COILED! HELD ${sec}s`, '#9af0c0', 36);
    p.perkFired({ quip: false });
  }

  // ——— Pirate's Treasure ———
  private spawnChest(): void {
    const a = this.a;
    if (!a.inWave() || this.chest) return;
    const ps = a.alivePizzas();
    if (!ps.length) return;
    const x = Phaser.Utils.Array.GetRandom(ps).x + (Math.random() - 0.5) * 160;
    const glow = this.sc.add.image(x, 430, 'glow').setTint(0xffd23f).setBlendMode(Phaser.BlendModes.ADD).setScale(1.4).setAlpha(0.5);
    const img = this.sc.add.image(x, -120, 'pk_chest').setScale(0.9);
    a.fxLayer.add([glow, img]);
    const chest: Chest = { img, glow, open: false };
    this.chest = chest;
    this.sc.tweens.add({ targets: img, y: 430, duration: 700, ease: 'Bounce.Out' });
    this.sc.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.65 }, duration: 700, yoyo: true, repeat: -1 });
    a.quip(x, 300, 'TREASURE! SMACK IT OPEN', '#ffd23f', 40);
    a.sfx('sfx_levelup', { volume: 0.5, rate: 0.9 });
    a.addClickable({
      x,
      y: 430,
      r: 80,
      priority: 1,
      alive: () => this.chest === chest && !chest.open,
      hit: () => this.openChest(chest),
    });
  }

  private openChest(chest: Chest): void {
    const a = this.a;
    if (chest.open) return;
    chest.open = true;
    const rich = this.c('treasure') > 1.2;
    chest.img.setTexture('pk_chest_open');
    this.sc.tweens.add({ targets: chest.img, scaleY: { from: 0.7, to: 0.9 }, duration: 300, ease: 'Back.Out' });
    a.fx.party(chest.img.x, chest.img.y - 40, 70);
    a.shake(160, 0.005);
    audio.sfx('sfx_coin');
    a.sfx('sfx_combo');
    const tips = Math.round((20 + this.wave() * 3) * (rich ? 1.5 : 1));
    const crusts = rich ? 2 : 1;
    this.h.giveTips(tips, chest.img.x, chest.img.y - 40);
    this.run.bank(crusts);
    a.quip(chest.img.x, chest.img.y - 150, `+${crusts} GOLDEN CRUST${crusts > 1 ? 'S' : ''}`, '#ffd23f', 40);
    this.sc.time.delayedCall(1600, () => this.chest === chest && this.removeChest());
  }

  /** The chest goes (sinks away if nobody opened it). */
  private removeChest(missed = false): void {
    const ch = this.chest;
    if (!ch) return;
    this.chest = null;
    if (missed && !ch.open) this.a.quip(ch.img.x, 300, 'THE TREASURE SANK!', '#c8a060', 34);
    this.sc.tweens.killTweensOf(ch.glow);
    this.sc.tweens.add({ targets: [ch.img, ch.glow], alpha: 0, y: '+=60', duration: 500, onComplete: () => { ch.img.destroy(); ch.glow.destroy(); } });
  }

  /** The scene is shutting down. */
  clear(): void {
    this.dropRings();
    this.chest = null;
    this.clearEpics(true);
    this.legends.clear();
  }

  private dropRings(): void {
    for (const r of this.rings) {
      r.img.destroy();
      r.glow.destroy();
    }
    this.rings = [];
  }
}
