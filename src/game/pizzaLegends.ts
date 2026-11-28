// The Legendaries' perks (docs/pizza-plan.md, section 12), kept out of the Epics' kit (src/game/pizzaPerks.ts) and
// run through it: the kit calls in at each moment (a wave starting and clearing, every frame, a stomp about to land,
// the scene going) and hands over its strength and table helpers.
//
// Act 1 (batch 1):
// - Nonna's Masterpiece (nonnaLadle): once a wave (enhanced twice; one more each copy) Nonna's ladle swats the first
//   foot to reach any pizza. The stomp is blocked and the foot takes ×5 (Legendary damage: scaled with the heat).
// - Silver Service (silverTray): every 15 s of wave (enhanced 10; two copies twice as often), once a foot is diving, the
//   Head Waiter's silver tray skims the table and bats every diving foot back up to the top. Bosses and mini-bosses
//   are only knocked back; feet a fight moves by hand and friendly zombies are left alone.
// - The First Bake (firstBake): every pizza starts each wave fully fresh (topped up as each wave clears, so the shop
//   shows it, and again as the next starts), and once a run each pizza gets one slice over its maximum (enhanced two),
//   the first time it starts a wave whole. A slice over is eaten first and never grows back.
//
// Act 2 (batch 2, docs/pizza-plan.md section 13):
// - Big Top Pie (bigTopCannon): every 20 s of wave with a foot on the table (enhanced 13; two copies twice as often)
//   King Honk's circus cannon fires a cream pie at the toughest foot (bosses too) for ×8, Legendary damage, and every
//   foot laughs: ordinary ones stunned 1 s; bosses, mini-bosses and feet a fight moves by hand only giggle (40% slower
//   for 1 s); a frozen foot stays frozen.
// - Sandcastle Citadel (citadelWall): as each wave starts Sandcastle Sam's citadel goes up and takes 3 stomps (enhanced
//   4; copies add) on any pizza. It's checked where Pizza Stone is, after Phantom Waltz's ghost and Sandcastle
//   Sundae's wall (the Sundae's 2 go first, then the citadel's), so a piercing stomp goes through; bosses are blocked
//   too; once up it lasts the wave even if its pie is lost. Its keep (the aura) flies a pennant for each stomp left.
// - Tidal Tiki (tidalWash): every 4th wave of the run (waves 4, 8, 12…; enhanced every 3rd) the tide comes in once, a
//   few seconds in when the feet are diving: every foot it reaches is washed back up to the top (bosses and
//   mini-bosses knocked back; feet a fight moves by hand and friendly zombies left alone) and every pizza gets a slice
//   back (one for each Tidal Tiki on the table). One tide however many copies.
//
// On the trigger bus (docs/effects-plan.md, step 3): every moment of these perks is declared in src/game/perkEffects.ts
// (the Legendaries' section) and runs here as a one-off of the kit's (Custom.*), in the old order: the walls and the
// tide as a wave starts, the ladle and the Citadel among a stomp's defences, the cannon and the tray as Effect.Every
// timers, the tide, the hole and the roar's timers every frame, the portal on a smack. Their hits go through the shared
// Action.Damage with Hit.Legend (legendDmg), except the ladle's ×5, worked out as the swing starts (as it always was).
//
// Each perk's moment is a show-piece (the ladle's swing, the tray's run across the table, the oven's breath) with its
// own sound, landing on its targets and never covering the table; lighter in a boss fight. Gameplay randomness is
// Math.random, cosmetic crand; nothing starts a tween as the scene shuts down.

import Phaser from 'phaser';
import { HOVER_Y, W } from '../config';
import type { PizzaPerk } from '../data/pizzas';
import { crand } from '../systems/cosmeticRandom';
import { drawFlour, drawLadle, drawOvenMouth, drawRaguFleck, drawSilverTray } from '../art/perkPropsLegend';
import { drawCannonBarrel, drawCannonCart, drawCannonPie, drawCitadelWall, drawConfetti, drawFoam, drawPennant, drawSandGrain, drawTideWave } from '../art/perkPropsLegend2';
import { TILT } from '../art/pizzaArt';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';
import type { Run } from './Run';
import { legendDmg, legendLook } from './legendary';
import { Action, Hit, Unit, type ActionData } from '../effects';
import { Act3Legends, LEGEND3_SFX } from './pizzaLegends3';
import { Act4Legends, LEGEND4_SFX } from './pizzaLegends4';
import { Legends4View } from './legendView4';

/** Sounds the Legendaries' perks play that aren't loaded at boot: Nonna's spoon and rolling pin, the Head Waiter's
 *  tray, wood and sauce smacks. All credited already. (The Legendaries' own synthesized sounds, sfx_legendbake,
 *  sfx_legendpuff, sfx_legendfanfare, sfx_legendreveal and sfx_legendstamp, have one-word names: loaded at boot.) */
export const LEGEND_SFX = [
  'sfx_nonna_spoon', 'sfx_nonna_pin', 'sfx_smack_wood_heavy', 'sfx_smack_sauce_heavy', 'sfx_smack_sauce_1',
  'sfx_headwaiter_traytoss', 'sfx_headwaiter_traybat', 'sfx_headwaiter_trayclang', 'sfx_headwaiter_service', 'sfx_smack_metal_heavy',
  // Act 2: King Honk's horn, pie and slide whistle, a cannon boom and the feet's giggles; Sandcastle Sam's walls, pour and
  // shovel; the Beach's wave, gulls and splashes
  'sfx_clownking_honkwind', 'sfx_clownking_honk', 'sfx_clownking_piesplat', 'sfx_clownking_pie', 'sfx_clownking_leap', 'sfx_hitboom', 'sfx_jokester_giggle',
  'sfx_sandcastle_walls', 'sfx_sandcastle_pour', 'sfx_sandcastle_shovel', 'sfx_sandcastle_sandland', 'sfx_smack_sand_heavy',
  'sfx_zeus_wave', 'sfx_seagull', 'sfx_kraken_splash', 'sfx_smack_water_heavy', 'sfx_smack_water_1', 'sfx_smack_tail_kinghonk',
  // Act 3: src/game/pizzaLegends3.ts
  ...LEGEND3_SFX,
  // Act 4: src/game/pizzaLegends4.ts (its looks: src/game/legendView4.ts)
  ...LEGEND4_SFX,
];

/** What the Epics' kit lends the Legendaries. */
export interface LegendHost {
  run(): Run;
  /** Table-wide strength of a perk (enhanced counts 1.5; Napoletana's boost). */
  c(perk: PizzaPerk): number;
  /** The pizzas granting a perk now (not stale, frozen or possessed). */
  granting(perk: PizzaPerk): Pizza[];
  bossFight(): boolean;
  dealDamage(f: Foot, amount: number, source: 'explode' | 'olive' | 'cutter' | 'direct', knock?: number, tag?: string): void;
  recompute(): void;
  /** Give a pizza slices back (up to its maximum). */
  heal(p: Pizza, n: number): void;
  /** Defeat a foot outright (a portal, the black hole): a kill, paid and counted like any (as an 'explode' kill, so
   *  it never sets off Explode's chain blast). */
  kill(f: Foot): void;
  /** Run a shared action on a foot for a perk (Action.Damage with Hit.Legend: legendDmg), at strength k. */
  strike(f: Foot, perk: PizzaPerk, act: ActionData, k?: number): void;
}

export class LegendKit {
  private a: Arena;
  private h: LegendHost;
  private sc: Phaser.Scene;
  /** Nonna's ladle: swats used this wave. */
  ladleUsed = 0;
  /** Silver Service: seconds of wave since the last tray (it carries over between waves). */
  silverT = 0;
  /** The First Bake: the pizza types that have had their slice over the top this run (once a run each, however often
   *  one leaves the table and comes back; saved with the run). */
  baked = new Set<string>();
  /** The First Bake: the stage its oven last breathed in (its moment plays at most once a stage). */
  private ovenStage = -1;
  /** Big Top Pie: seconds of wave (with a foot on the table) since the last cannon pie (it carries over). */
  bigTopT = 0;
  /** Sprites in flight (dropped at once if the scene goes). */
  private live = new Set<Phaser.GameObjects.GameObject>();
  private quipAt: Record<string, number> = {};
  /** Act 3's perks (src/game/pizzaLegends3.ts). */
  readonly act3: Act3Legends;
  /** Act 4's perks (src/game/pizzaLegends4.ts) and their looks (src/game/legendView4.ts). */
  readonly act4: Act4Legends;

  constructor(arena: Arena, host: LegendHost) {
    this.a = arena;
    this.h = host;
    this.sc = arena.sc;
    const tex: [string, () => HTMLCanvasElement][] = [
      ['pk_ladle', drawLadle],
      ['pk_tray', drawSilverTray],
      ['pk_oven', drawOvenMouth],
      ['pk_flour', drawFlour],
      ['pk_ragu', drawRaguFleck],
      ['pk_cannoncart', drawCannonCart],
      ['pk_cannonbarrel', drawCannonBarrel],
      ['pk_cannonpie', drawCannonPie],
      ['pk_confetti', drawConfetti],
      ['pk_citadelwall', drawCitadelWall],
      ['pk_pennant', drawPennant],
      ['pk_tide', drawTideWave],
      ['pk_foam', drawFoam],
      ['pk_sand', drawSandGrain],
    ];
    for (const [k, draw] of tex) if (!this.sc.textures.exists(k)) this.sc.textures.addCanvas(k, draw());
    this.act3 = new Act3Legends(arena, host, (x, y, k, u) => this.img(x, y, k, u), (k, g) => this.every(k, g));
    this.act4 = new Act4Legends(arena, host, new Legends4View(arena, (x, y, k, u) => this.img(x, y, k, u), (k, g) => this.every(k, g)));
  }

  private get run(): Run {
    return this.h.run();
  }

  private every(key: string, gap: number): boolean {
    const now = this.a.now();
    if (now - (this.quipAt[key] ?? -99) < gap) return false;
    this.quipAt[key] = now;
    return true;
  }

  /** A sprite in flight: over the table (`under`: under the other effects), or `back` behind the pizzas. */
  private img(x: number, y: number, key: string, under: boolean | 'back' = false): Phaser.GameObjects.Image {
    const o = this.sc.add.image(x, y, key);
    if (under === 'back') this.a.underLayer.add(o);
    else if (under) this.a.fxLayer.addAt(o, 0);
    else this.a.fxLayer.add(o);
    this.live.add(o);
    o.once('destroy', () => this.live.delete(o));
    return o;
  }

  // ——— the run and its waves ———

  runStart(): void {
    this.silverT = 0;
    this.bigTopT = 0;
    this.tideDue = false;
    this.citadel = [];
    this.ladleUsed = 0;
    this.baked.clear();
    this.ovenStage = -1;
    this.act3.runStart();
    this.act4.runStart();
  }

  /** A wave starts: Nonna's ladle has its swats again. */
  ladleReady(): void {
    this.ladleUsed = 0;
  }

  /** A wave starts: Tidal Tiki's tide is due every 4th wave (enhanced every 3rd). (A Tiki frozen or stale as the wave
   *  starts still brings its tide: it comes once the Tiki grants again.) */
  tideReady(wave: number, perk: PizzaPerk): void {
    const tiki = [...new Set([...this.h.granting(perk), ...this.a.alivePizzas().filter((p) => p.type.perk === perk && !p.haunted)])];
    this.tideDue = tiki.length > 0 && wave % (tiki.some((p) => p.enhanced) ? 3 : 4) === 0;
    this.tideT = 0;
  }

  /** A wave starts: The First Bake. Every pizza starts the wave fresh (one bought in the shop too), and the first time
   *  each starts a wave whole it gets its slice over the top. */
  firstBake(bakers: Pizza[]): void {
    this.freshen();
    const n = bakers.some((p) => p.enhanced) ? 2 : 1;
    const got: Pizza[] = [];
    for (const p of this.a.alivePizzas()) {
      if (this.baked.has(p.type.id) || p.slices < p.maxSlices) continue;
      this.baked.add(p.type.id);
      p.flags.bakeExtra = n;
      p.addSlices(n);
      got.push(p);
    }
    if (got.length) this.sc.time.delayedCall(900, () => this.bakeSlices(got, n, bakers[0]));
  }

  /** The wave closes: the citadel's keep flies all its pennants again in the shop (ready for the next wave). */
  citadelDown(perk: string): void {
    this.citadel = [];
    for (const p of this.a.alivePizzas()) if (p.perk === perk) p.flags.citadelLeft = p.enhanced ? 4 : 3;
  }

  /** The wave closes: no tide still to come. */
  tideOff(): void {
    this.tideDue = false;
  }

  /** The wave closes: The First Bake tops every pizza up, so the shop shows them fresh. */
  bakeFreshen(n: number): void {
    this.freshen(Math.floor((n - 1) / 5));
  }

  /** Every pizza fully fresh, quietly. When one was really low (half fresh or less, or stale) the oven breathes across
   *  the table, at most once a stage (`stage`: the stage it's in; none as a wave starts). */
  freshen(stage?: number): void {
    const topped: Pizza[] = [];
    let low = false;
    for (const p of this.a.alivePizzas()) {
      if (!p.freshOn || p.fresh >= p.maxFresh) continue;
      low ||= p.fresh <= p.maxFresh / 2;
      topped.push(p);
      p.setFresh(p.maxFresh);
    }
    if (!topped.length) return;
    this.h.recompute();
    if (stage === undefined || !low || stage === this.ovenStage) return;
    this.ovenStage = stage;
    this.ovenBreath(topped);
  }

  // ——— Nonna's Masterpiece ———

  /** A stomp is about to land on p: Nonna's ladle swats it if she has a swat left this wave. True when it's blocked. */
  ladle(f: Foot, p: Pizza, pies: Pizza[]): boolean {
    const allowed = pies.reduce((n, q) => n + (q.enhanced ? 2 : 1), 0);
    if (this.ladleUsed >= allowed) return false;
    this.ladleUsed++;
    const src = pies.includes(p) ? p : pies.reduce((b, q) => (Math.abs(q.x - p.x) < Math.abs(b.x - p.x) ? q : b));
    this.swat(f, p, src);
    return true;
  }

  /** The ladle comes up from beside the pie, winds back and swats the foot off it: a wooden THWACK, ragù and flour
   *  flying, the foot knocked away and hit for ×5. */
  private swat(f: Foot, p: Pizza, src: Pizza): void {
    const a = this.a;
    const light = this.h.bossFight();
    const dmg = legendDmg(5, this.run.stats.damage, this.run.heat);
    // (from beside the pie on the side the foot came down, outside its plate: the swing never crosses the pie or its face)
    const dir = f.cx >= p.x ? 1 : -1;
    const px = p.x + dir * p.radius * 1.4;
    const py = p.surfaceY + 40;
    const tx = f.cx;
    const ty = Math.min(p.surfaceY - 40, f.cy + 50);
    const aim = Math.atan2(tx - px, -(ty - py));
    const len = Math.hypot(tx - px, ty - py);
    const scale = Phaser.Math.Clamp(len / 360, 0.55, 1.15);
    const lad = this.img(px, py, 'pk_ladle').setOrigin(0.5, 0.97).setScale(scale * 0.6).setRotation(aim + dir * 1.2).setAlpha(0);
    a.sfx('sfx_whoosh', { volume: 0.55, rate: 0.8 });
    // up into view, winding back (anticipation)…
    this.sc.tweens.add({ targets: lad, alpha: 1, scale, rotation: aim + dir * 1.5, duration: 120, ease: 'Quad.Out' });
    // …then the swing
    this.sc.time.delayedCall(130, () => {
      if (!lad.active) return;
      a.sfx('sfx_nonna_spoon', { volume: 0.75, throttle: 200 });
      this.sc.tweens.add({ targets: lad, rotation: aim - dir * 0.08, scaleY: scale * 1.06, duration: 110, ease: 'Cubic.In' });
    });
    this.sc.time.delayedCall(240, () => {
      // the THWACK: the ladle squashes against the foot, the ragù flies
      a.sfx('sfx_smack_wood_heavy', { volume: 0.85 });
      a.sfx('sfx_smack_sauce_heavy', { volume: 0.45 });
      a.shake(light ? 80 : 150, light ? 0.003 : 0.006);
      if (lad.active) {
        this.sc.tweens.add({ targets: lad, scaleX: scale * 1.12, scaleY: scale * 0.94, duration: 60, yoyo: true });
        // follow-through, then away
        this.sc.tweens.add({ targets: lad, rotation: aim + dir * 0.6, delay: 120, duration: 220, ease: 'Sine.Out' });
        this.sc.tweens.add({ targets: lad, alpha: 0, y: py + 60, delay: 320, duration: 260, ease: 'Quad.In', onComplete: () => lad.destroy() });
      }
      a.fx.impact(tx, ty, true);
      a.fx.ring(tx, ty, 0xffb070, 1.6, 0.5);
      a.fx.ring(p.x, p.surfaceY - 24, 0xffe6c0, 2, 0.4);
      const n = light ? 6 : 11;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (crand() - 0.5) * 2.4 - dir * 0.4;
        const sp = 160 + crand() * 240;
        const fl = this.img(tx, ty, i % 3 ? 'pk_ragu' : 'pk_flour').setScale(0.5 + crand() * 0.6).setRotation(crand() * 6);
        if (i % 3 === 0) fl.setBlendMode(Phaser.BlendModes.ADD).setScale(1.5 + crand());
        this.sc.tweens.add({ targets: fl, x: tx + Math.cos(ang) * sp, y: ty + Math.sin(ang) * sp * 0.7 + 70, angle: (crand() - 0.5) * 300, alpha: 0, duration: 520 + crand() * 260, ease: 'Quad.Out', onComplete: () => fl.destroy() });
      }
      for (let i = 0; i < (light ? 2 : 4); i++) a.fx.puff(tx + (crand() - 0.5) * 70, ty + 10, 2);
      a.quip(tx, ty - 150, "NONNA'S LADLE! ×5", legendLook('nonnasmasterpiece').css, 44);
      src.perkFired({ quip: false });
      if (!f.alive) return;
      f.flash(0xffe6c0, 90);
      f.knock(1000);
      this.h.dealDamage(f, dmg, 'explode', 300, 'perk:nonnaLadle');
    });
  }

  // ——— Silver Service ———

  /** Every hit's multiplier from the Legendaries now (Roar Roast's +30%). */
  damageMult(): number {
    return this.act3.damageMult();
  }

  /** Big Top Pie's cannon fires at the toughest foot (its timer: Effect.Every in src/game/perkEffects.ts). */
  cannon(tough: Foot): void {
    this.bigTop(tough);
  }

  /** Silver Service's tray (its timer: Effect.Every in src/game/perkEffects.ts). */
  tray(): void {
    this.service();
  }

  /** A foot the tray bats: diving or stomping, and not one a fight moves by hand or a friendly zombie. */
  private batable(f: Foot): boolean {
    return f.alive && f.hittable && !f.zombieHold && !f.puppet && !f.brain.free && (f.state === 'descend' || f.state === 'stomp');
  }

  /** The Head Waiter's silver tray skims the table from one side to the other, just over the pies, batting every
   *  diving foot back up as it passes under it. */
  private service(): void {
    const a = this.a;
    const light = this.h.bossFight();
    const pies = this.h.granting('silverTray');
    const src = pies[0];
    if (!src) return;
    for (const p of pies) p.perkFired({ quip: false });
    const table = Math.min(...a.alivePizzas().map((p) => p.surfaceY), src.surfaceY);
    const y = table - 205;
    // (from the side its pie is on, across to the other)
    const dir = src.x <= W / 2 ? 1 : -1;
    const x0 = dir > 0 ? -170 : W + 170;
    const x1 = dir > 0 ? W + 170 : -170;
    const ms = 820;
    a.sfx('sfx_headwaiter_traytoss', { volume: 0.7 });
    a.sfx('sfx_headwaiter_service', { volume: 0.55 });
    a.quip(src.x, src.surfaceY - 330, 'SILVER SERVICE!', legendLook('silverservice').css, 48);
    const glow = this.img(x0, y, 'glow', true).setTint(0xdfe8f6).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2, 0.75).setAlpha(0.65);
    const tray = this.img(x0, y, 'pk_tray').setScale(0.9).setRotation(dir * -0.08);
    this.sc.tweens.add({
      targets: [tray, glow],
      x: x1,
      duration: ms,
      ease: 'Sine.InOut',
      onUpdate: (tw) => {
        const u = tw.progress;
        // a little lift and tilt through its run, catching the light
        tray.y = y - Math.sin(u * Math.PI) * 26;
        glow.y = tray.y + 8;
        tray.rotation = dir * (-0.08 + Math.sin(u * Math.PI * 3) * 0.05);
        if (!light && crand() < 0.5) a.fx.propTrail(tray.x - dir * 80, tray.y + (crand() - 0.5) * 30, crand() < 0.5 ? 0xffffff : 0xcfe0f4, 0.5);
      },
      onComplete: () => {
        tray.destroy();
        glow.destroy();
      },
    });
    // each diver is batted as the tray passes under it
    const cross = (x: number) => Phaser.Math.Clamp((x - x0) / (x1 - x0), 0, 1);
    for (const f of a.allFeet()) {
      if (!f.alive || f.zombieHold || f.puppet || f.brain.free) continue;
      if (!this.batable(f) && !(f.isBossLike && (f.state === 'descend' || f.state === 'stomp'))) continue;
      // (Sine.InOut: where along its run the tray is at each moment)
      const u = cross(f.cx);
      const t = (Math.acos(1 - 2 * u) / Math.PI) * ms;
      this.sc.time.delayedCall(t, () => this.bat(f, light));
    }
    this.sc.time.delayedCall(ms - 120, () => a.sfx('sfx_headwaiter_trayclang', { volume: 0.4 }));
  }

  private bat(f: Foot, light: boolean): void {
    const a = this.a;
    if (!f.alive || (f.state !== 'descend' && f.state !== 'stomp')) return;
    a.sfx('sfx_headwaiter_traybat', { volume: 0.7, throttle: 70 });
    a.fx.ring(f.cx, f.cy + 60, 0xdfe8f6, 1.3, 0.5);
    a.fx.glint(f.cx, f.cy + 40, light ? 2 : 4);
    if (this.every('bat', 0.45)) a.quip(f.x, f.cy - 120, 'BATTED!', '#e8f0fa', 34);
    // a streak of silver light behind it as it flies
    const st = this.img(f.cx, f.cy + 70, 'glow', true).setOrigin(0.5, 0).setTint(0xdfe8f6).setBlendMode(Phaser.BlendModes.ADD).setScale(0.12, 0.6).setAlpha(0.6);
    this.sc.tweens.add({ targets: st, scaleY: 1.7, alpha: 0, duration: 420, ease: 'Quad.Out', onComplete: () => st.destroy() });
    if (f.isBossLike) {
      f.knock(1400);
      return;
    }
    // back up to the top (the lift slows as it rises and stops at the hover line, where it picks a new target)
    f.setState('lift');
    f.vy = -Math.sqrt(1400 * Math.max(40, f.y - HOVER_Y + 20));
  }

  // ——— The First Bake ———

  /** The oven breathes across the table: its mouth glows up behind The First Bake, a warm wave rolls out over the
   *  table, steam puffs off every pie it freshened and their freshness glints full. */
  private ovenBreath(pies: Pizza[]): void {
    const a = this.a;
    const src = this.h.granting('firstBake')[0] ?? pies[0];
    if (!src) return;
    const light = this.h.bossFight();
    src.perkFired({ quip: false });
    a.sfx('sfx_legendbake', { volume: 0.75, throttle: 600 });
    const look = legendLook('firstbake');
    // (beside its pie, towards the middle of the table: clear of its freshness bar and its neighbours' faces)
    const oy = src.surfaceY - 40;
    const ox = src.x + (src.x > W / 2 ? -1 : 1) * src.radius * 1.15;
    const oven = this.img(ox, oy + 40, 'pk_oven', true).setOrigin(0.5, 1).setScale(0.35).setAlpha(0);
    this.sc.tweens.add({ targets: oven, y: oy, scale: 0.5, alpha: 0.95, duration: 260, ease: 'Back.Out' });
    this.sc.tweens.add({ targets: oven, alpha: 0, y: oy - 30, delay: 900, duration: 380, onComplete: () => oven.destroy() });
    // the warm wave rolling out along the table
    for (let i = 0; i < 2; i++) this.sc.time.delayedCall(180 + i * 160, () => a.fx.ring(src.x, src.surfaceY - 10, look.col, 3 + i * 1.6, 0.28));
    a.quip(src.x, src.surfaceY - 300, 'THE FIRST BAKE: ALL FRESH!', look.css, 42);
    pies.forEach((p, i) => {
      this.sc.time.delayedCall(260 + Math.abs(p.x - src.x) * 0.25 + i * 20, () => {
        if (p.dead) return;
        for (let k = 0; k < (light ? 2 : 4); k++) {
          const s = this.img(p.x + (crand() - 0.5) * p.radius, p.surfaceY - 30, 'p_steam', true).setScale(0.25).setAlpha(0.8);
          this.sc.tweens.add({ targets: s, y: s.y - 120 - crand() * 60, scale: 0.55, alpha: 0, delay: k * 60, duration: 700, ease: 'Quad.Out', onComplete: () => s.destroy() });
        }
        a.fx.glint(p.x, p.surfaceY - p.radius * 0.45 - 24, 2);
        a.fx.ring(p.x, p.surfaceY - 24, look.col2, 1.6, 0.4);
      });
    });
  }

  /** The slice over the top: a golden ring and "+1 SLICE OVER!" on every pie that got it. */
  private bakeSlices(pies: Pizza[], n: number, src: Pizza): void {
    const a = this.a;
    const look = legendLook('firstbake');
    a.sfx('sfx_legendpuff', { volume: 0.7, throttle: 300 });
    if (!src.dead) src.perkFired({ quip: false });
    pies.forEach((p, i) => {
      this.sc.time.delayedCall(i * 110, () => {
        if (p.dead) return;
        a.fx.ring(p.x, p.surfaceY - 24, look.col, 2, 0.42);
        a.fx.glint(p.x, p.surfaceY - 40, 3);
        a.quip(p.x, p.surfaceY - 200, `+${n} SLICE${n > 1 ? 'S' : ''} OVER!`, look.css, 32);
      });
    });
  }

  // ════════════════════════════ Act 2 (batch 2) ════════════════════════════

  // ——— Big Top Pie ———

  /** King Honk's cannon fires a cream pie at the toughest foot on the table (bosses too) for ×8, and every foot laughs:
   *  ordinary ones stunned 1 s, bosses, mini-bosses and feet a fight moves by hand only giggle (40% slower, 1 s). */
  private bigTop(target: Foot): void {
    const a = this.a;
    const pies = this.h.granting('bigTopCannon');
    const src = pies[0];
    if (!src) return;
    const light = this.h.bossFight();
    const look = legendLook('bigtoppie');
    for (const p of pies) p.perkFired({ quip: false });
    // the cannon rolls up beside its pie, on the side towards the target, clear of its plate
    const dir = target.cx >= src.x ? 1 : -1;
    const cx = Phaser.Math.Clamp(src.x + dir * src.radius * 1.25, 80, W - 80);
    const cy = src.surfaceY - 24;
    const k = 0.62;
    const cart = this.img(cx, cy + 40, 'pk_cannoncart').setOrigin(0.5, 0.42).setScale(k * 0.6).setAlpha(0).setFlipX(dir < 0);
    const barrel = this.img(cx, cy + 40, 'pk_cannonbarrel').setOrigin(0.16, 0.5).setScale(k * 0.6).setAlpha(0).setFlipY(dir < 0);
    // (aim: from the trunnion at the target, kept above the horizon)
    const aimAt = () => {
      const ang = Math.atan2(target.cy - cy, target.cx - cx);
      return dir > 0 ? Phaser.Math.Clamp(ang, -1.1, -0.3) : Phaser.Math.Clamp(ang, -Math.PI + 0.3, -Math.PI + 1.1);
    };
    barrel.setRotation(dir > 0 ? -0.2 : -Math.PI + 0.2);
    a.sfx('sfx_clownking_honkwind', { volume: 0.6 });
    a.quip(src.x, src.surfaceY - 320, 'BIG TOP!', look.css, 50);
    this.sc.tweens.add({ targets: [cart, barrel], y: cy, alpha: 1, scale: k, duration: 260, ease: 'Back.Out' });
    // it swings round to aim (anticipation), squashes, and fires
    this.sc.time.delayedCall(260, () => {
      if (!barrel.active) return;
      this.sc.tweens.add({ targets: barrel, rotation: aimAt(), duration: 220, ease: 'Sine.InOut' });
      this.sc.tweens.add({ targets: [cart, barrel], scaleY: k * 0.9, scaleX: k * 1.06, duration: 200, ease: 'Quad.In' });
    });
    this.sc.time.delayedCall(500, () => {
      if (!barrel.active) return;
      const ang = barrel.rotation;
      const len = 300 * 0.84 * k;
      const mx = cx + Math.cos(ang) * len;
      const my = cy + Math.sin(ang) * len;
      a.sfx('sfx_hitboom', { volume: light ? 0.5 : 0.7 });
      a.sfx('sfx_clownking_honk', { volume: 0.5 });
      a.shake(light ? 90 : 160, light ? 0.003 : 0.006);
      // the recoil: the barrel kicks back and stretches, then settles
      this.sc.tweens.add({ targets: [cart, barrel], scaleX: k * 0.92, scaleY: k * 1.08, duration: 70, yoyo: true });
      this.sc.tweens.add({ targets: barrel, x: cx - Math.cos(ang) * 18, y: cy - Math.sin(ang) * 18, duration: 70, yoyo: true });
      // muzzle flash, smoke and confetti
      const flash = this.img(mx, my, 'glow').setTint(0xfff2b0).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setAlpha(0.95);
      this.sc.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
      for (let i = 0; i < (light ? 2 : 4); i++) a.fx.puff(mx + (crand() - 0.5) * 30, my + (crand() - 0.5) * 20, 2);
      this.confetti(mx, my, ang, light ? 10 : 22);
      // the pie flies, spinning, in a short arc to wherever the foot is now
      const pie = this.img(mx, my, 'pk_cannonpie').setScale(0.42).setRotation(crand() * 0.6);
      const x0 = mx;
      const y0 = my;
      const ms = 360;
      // (where it's going: the foot, or where it last was if it falls first)
      let lx = target.cx;
      let ly = target.cy;
      this.sc.tweens.addCounter({
        from: 0,
        to: 1,
        duration: ms,
        ease: 'Sine.In',
        onUpdate: (tw) => {
          if (!pie.active) return;
          const u = tw.getValue() ?? 0;
          if (target.alive) {
            lx = target.cx;
            ly = target.cy;
          }
          pie.setPosition(x0 + (lx - x0) * u, y0 + (ly - y0) * u - Math.sin(u * Math.PI) * 90);
          pie.rotation += 0.25 * dir;
          pie.setScale(0.42 + u * 0.22);
          if (!light && crand() < 0.6) a.fx.propTrail(pie.x - Math.cos(ang) * 30, pie.y, crand() < 0.5 ? 0xffffff : 0xffd23f, 0.5);
        },
        onComplete: () => {
          const px = pie.x;
          const py = pie.y;
          pie.destroy();
          this.splat(target, px, py, light);
        },
      });
      // the cannon rolls away
      this.sc.tweens.add({ targets: [cart, barrel], alpha: 0, y: cy + 50, delay: 700, duration: 320, ease: 'Quad.In', onComplete: () => {
        cart.destroy();
        barrel.destroy();
      } });
    });
  }

  /** The pie lands: SPLAT, cream everywhere, ×8 (Legendary-scaled), then every foot laughs. */
  private splat(target: Foot, x: number, y: number, light: boolean): void {
    const a = this.a;
    a.sfx('sfx_clownking_piesplat', { volume: 0.8 });
    a.fx.ring(x, y, 0xffffff, 1.8, 0.5);
    a.fx.ring(x, y, legendLook('bigtoppie').col, 2.4, 0.45);
    for (let i = 0; i < (light ? 7 : 14); i++) {
      const ang = crand() * Math.PI * 2;
      const sp = 90 + crand() * 200;
      const c = this.img(x, y, 'pk_foam').setTint(crand() < 0.25 ? 0xffe0e8 : 0xffffff).setScale(0.4 + crand() * 0.6);
      this.sc.tweens.add({ targets: c, x: x + Math.cos(ang) * sp, y: y + Math.sin(ang) * sp * 0.7 + 60, alpha: 0, angle: crand() * 200, duration: 560 + crand() * 200, ease: 'Quad.Out', onComplete: () => c.destroy() });
    }
    if (target.alive) {
      target.flash(0xffffff, 120);
      this.h.strike(target, 'bigTopCannon', Action.Damage(Hit.Legend(Unit.Mult(8)), { knock: Unit.Amount(350) }));
      a.quip(target.x, target.cy - 200, 'CANNON PIE! ×8', legendLook('bigtoppie').css, 44);
    }
    this.sc.time.delayedCall(220, () => this.laugh(light, target));
  }

  /** Every foot on the table laughs: "HA!"s over them, a giggle, and they're stunned (bosses only giggle, slowed). */
  private laugh(light: boolean, target: Foot): void {
    const a = this.a;
    const feet = a.allFeet().filter((f) => f.alive && f.hittable && f.y > 0 && !f.zombieHold);
    if (!feet.length) return;
    a.sfx('sfx_jokester_giggle', { volume: 0.6, throttle: 400 });
    const words = ['HA!', 'HO HO!', 'HEE!', 'HAHA!'];
    let shown = 0;
    for (const f of feet) {
      if (f.isBossLike || f.puppet || f.brain.free) {
        // (only a slow about to run out is replaced: a longer one is never made stronger)
        if (!f.type.traits.includes('immuneSlow') && (f.slowT <= 1 || f.slowPct >= 0.4)) {
          if (f.slowT <= 1) f.slowPct = 0.4;
          f.slowT = Math.max(f.slowT, 1);
        }
      } else if (!(f.stunT > 0 && f.frozen)) {
        f.stun(1);
      }
      // (a few laughs, not one over every foot, and none over the pie's target: its own quip is there)
      if (f !== target && shown < (light ? 2 : 4)) {
        a.quip(f.x + (crand() - 0.5) * 40, f.cy - 110, words[shown % words.length], '#fff2b0', 30);
        shown++;
      }
    }
    if (feet.length > 1) a.quip(W / 2, 260, 'EVERY FOOT LAUGHS!', legendLook('bigtoppie').css, 40);
  }

  /** A burst of circus confetti from (x, y), thrown along `ang`. */
  private confetti(x: number, y: number, ang: number, n: number): void {
    const cols = legendLook('bigtoppie').confetti.map((c) => parseInt(c.slice(1), 16));
    for (let i = 0; i < n; i++) {
      const a2 = ang + (crand() - 0.5) * 1.6;
      const sp = 140 + crand() * 260;
      const c = this.img(x, y, 'pk_confetti').setTint(cols[i % cols.length]).setScale(0.8 + crand() * 0.6).setRotation(crand() * 6);
      this.sc.tweens.add({
        targets: c,
        x: x + Math.cos(a2) * sp,
        y: y + Math.sin(a2) * sp + 120,
        rotation: c.rotation + (crand() - 0.5) * 12,
        scaleY: { from: c.scaleY, to: -c.scaleY },
        alpha: 0,
        duration: 800 + crand() * 400,
        ease: 'Quad.Out',
        onComplete: () => c.destroy(),
      });
    }
  }

  // ——— Sandcastle Citadel ———

  /** The citadel's walls this wave: each Citadel pie's stomps left (it lasts the wave even if its pie is lost). */
  private citadel: { p: Pizza; perk: string; left: number }[] = [];

  /** The stomps the citadel can still take this wave. */
  get citadelLeft(): number {
    return this.citadel.reduce((n, c) => n + c.left, 0);
  }

  /** As a wave starts the citadel's walls go up: 3 stomps a pie (enhanced 4), its keep's pennants rising one a stomp. */
  citadelUp(perk: PizzaPerk): void {
    const pies = this.h.granting(perk);
    this.citadel = pies.map((p) => ({ p, perk, left: p.enhanced ? 4 : 3 }));
    for (const c of this.citadel) c.p.flags.citadelLeft = c.left;
    const n = this.citadelLeft;
    if (!n) return;
    const a = this.a;
    const look = legendLook('sandcastlecitadel');
    this.sc.time.delayedCall(700, () => {
      a.sfx('sfx_sandcastle_walls', { volume: 0.5, throttle: 300 });
      for (const c of this.citadel) {
        if (c.p.dead || c.p.type.perk !== c.perk) continue;
        const [kx, ky] = this.keepAt(c.p);
        a.fx.ring(kx, ky + 10, look.col, 1.2, 0.45);
        for (let i = 0; i < 6; i++) {
          const g = this.img(kx + (crand() - 0.5) * 60, ky + 10, 'pk_sand').setScale(0.8 + crand() * 0.6);
          this.sc.tweens.add({ targets: g, y: g.y - 30 - crand() * 30, alpha: 0, duration: 500, ease: 'Quad.Out', onComplete: () => g.destroy() });
        }
      }
      const p = this.citadel.find((c) => !c.p.dead)?.p;
      if (p) {
        a.quip(p.x, p.surfaceY - 300, `THE CITADEL: ${n} STOMPS`, look.css, 32);
        p.perkFired({ quip: false });
      }
    });
  }

  /** Where a Citadel pie's keep stands (world): beside its back, on the right (as its aura draws it). */
  private keepAt(p: Pizza): [number, number] {
    return [p.x + p.radius * 1.02, p.surfaceY - p.radius * 0.5 * 0.62];
  }

  /** A stomp on p, after Phantom Waltz's ghost and Sandcastle Sundae's wall: the citadel takes it if it can (checked
   *  where Pizza Stone is, so a piercing stomp goes through; bosses are blocked too). True when blocked. */
  citadelStomp(f: Foot, p: Pizza): boolean {
    const open = this.citadel.filter((c) => c.left > 0);
    if (!open.length) return false;
    // (from the Citadel nearest the stomped pie)
    const c = open.reduce((b, q) => (Math.abs(q.p.x - p.x) < Math.abs(b.p.x - p.x) ? q : b));
    c.left--;
    c.p.flags.citadelLeft = c.left;
    this.citadelBlock(f, p, c.p, c.left, c.perk);
    return true;
  }

  /** Sam's citadel wall bursts up out of the sand behind the pie, the foot slams into it and bounces off, sand flies, a
   *  pennant is torn off the keep. */
  private citadelBlock(f: Foot, p: Pizza, src: Pizza, leftHere: number, perk: string): void {
    const a = this.a;
    const light = this.h.bossFight();
    const look = legendLook('sandcastlecitadel');
    const total = this.citadelLeft;
    // (it rises behind the stomped pie, in the layer under the pizzas: the pie, its face, label and freshness bar all
    // draw over it, and it towers up behind them into the foot's way)
    const wy = p.surfaceY - p.radius * TILT * 0.55;
    const wx = p.x;
    const k = Phaser.Math.Clamp(p.radius / 240, 0.5, 0.78);
    const wall = this.img(wx, wy + 20, 'pk_citadelwall', 'back').setOrigin(0.5, 1).setScale(k * 1.05, 0);
    this.sc.tweens.add({ targets: wall, scaleY: k, y: wy, duration: 140, ease: 'Back.Out' });
    // the thud: it squashes as the foot hits, then sinks back into the sand
    this.sc.time.delayedCall(140, () => {
      if (!wall.active) return;
      this.sc.tweens.add({ targets: wall, scaleY: k * 0.9, scaleX: k * 1.1, duration: 70, yoyo: true });
      this.sc.tweens.add({ targets: wall, scaleY: 0, alpha: 0, delay: 560, duration: 340, ease: 'Quad.In', onComplete: () => wall.destroy() });
    });
    for (let i = 0; i < (light ? 8 : 16); i++) {
      const ang = -Math.PI / 2 + (crand() - 0.5) * 2.4;
      const sp = 120 + crand() * 220;
      const g = this.img(wx + (crand() - 0.5) * 220, wy - 120 - crand() * 80, 'pk_sand').setScale(0.8 + crand() * 1.2);
      this.sc.tweens.add({ targets: g, x: g.x + Math.cos(ang) * sp * 0.5, y: g.y + Math.sin(ang) * sp * 0.5 + 90, angle: crand() * 360, alpha: 0, duration: 650, ease: 'Quad.Out', onComplete: () => g.destroy() });
    }
    for (let i = 0; i < (light ? 1 : 3); i++) a.fx.puff(f.cx + (crand() - 0.5) * 120, Math.min(f.cy + 60, wy - 160), 2);
    a.fx.ring(f.cx, Math.min(f.cy + 60, wy - 160), look.col, 1.8, 0.45);
    a.shake(light ? 90 : 150, light ? 0.003 : 0.005);
    a.sfx('sfx_sandcastle_walls', { volume: 0.7, throttle: 120 });
    a.sfx('sfx_smack_sand_heavy', { volume: 0.6 });
    this.sc.time.delayedCall(420, () => a.sfx('sfx_sandcastle_pour', { volume: 0.35, throttle: 300 }));
    a.quip(f.x, Math.min(f.cy - 140, wy - 300), total > 0 ? `THE CITADEL! ${total} LEFT` : 'THE CITADEL HELD!', look.css, 40);
    // a pennant torn off the keep, fluttering away (an Echo Slice copying the Citadel has no keep)
    if (!src.dead && src.type.perk === perk) {
      const [kx, ky] = this.keepAt(src);
      const pen = this.img(kx, ky - 50 - leftHere * 6, 'pk_pennant').setOrigin(0, 0.5).setScale(0.45);
      this.sc.tweens.add({ targets: pen, x: kx + 120 + crand() * 60, y: ky - 180, angle: 300 + crand() * 200, scaleY: { from: 0.45, to: -0.45 }, alpha: 0, duration: 900, ease: 'Quad.Out', onComplete: () => pen.destroy() });
      src.perkFired({ quip: false });
    }
    f.knock(900);
  }

  // ——— Tidal Tiki ———

  /** Tidal Tiki: this wave's tide is still to come, and seconds of wave so far. */
  private tideDue = false;
  private tideT = 0;

  /** Every 4th wave (enhanced every 3rd) the tide comes in once, a few seconds in, once the feet are pressing. */
  tideTick(dt: number, tikis: Pizza[]): void {
    if (!this.tideDue) return;
    this.tideT += dt;
    if (this.tideT < 3) return;
    const feet = this.a.allFeet();
    const diving = feet.some((f) => this.batable(f) && f.y > 300);
    const any = feet.some((f) => f.alive && f.hittable && f.y > 60);
    if (!diving && !(this.tideT >= 10 && any)) return;
    // (the tide waits for a Tiki that grants it)
    if (!tikis.length) return;
    this.tideDue = false;
    this.tide();
  }

  /** The tide rolls across the table behind the pizzas from the Tiki's side: every foot it reaches is washed back up
   *  to the top (bosses and mini-bosses knocked back; feet a fight moves by hand and friendly zombies left alone), and
   *  as it passes every pizza gets a slice back (one for each Tidal Tiki). */
  private tide(): void {
    const a = this.a;
    const pies = this.h.granting('tidalWash');
    const src = pies[0];
    if (!src) return;
    const light = this.h.bossFight();
    const look = legendLook('tidaltiki');
    for (const p of pies) p.perkFired({ quip: false });
    const table = Math.min(...a.alivePizzas().map((p) => p.surfaceY - p.radius * TILT), src.surfaceY - src.radius * TILT);
    // (its foot along the back of the table, behind the freshness bars: it washes the lanes, not the pies)
    const y = table - 40;
    const dir = src.x <= W / 2 ? 1 : -1;
    const sc = 1.3;
    const x0 = dir > 0 ? -520 : W + 520;
    const x1 = dir > 0 ? W + 520 : -520;
    const ms = 1600;
    a.sfx('sfx_zeus_wave', { volume: light ? 0.55 : 0.75 });
    a.sfx('sfx_seagull', { volume: 0.4 });
    a.quip(src.x, src.surfaceY - 330, 'TIDAL TIKI! THE TIDE’S IN', look.css, 44);
    const wave = this.img(x0, y, 'pk_tide', true).setOrigin(0.5, 1).setScale(sc * dir, sc).setAlpha(0.92);
    const sheen = this.img(x0, y, 'glow', true).setTint(look.col).setBlendMode(Phaser.BlendModes.ADD).setScale(4, 1.2).setAlpha(0.35);
    this.sc.tweens.add({
      targets: [wave, sheen],
      x: x1,
      duration: ms,
      ease: 'Sine.InOut',
      onUpdate: (tw) => {
        const u = tw.progress;
        // it rears up as it crosses the middle and spills spray off its foot
        wave.setScale(sc * dir * (1 + 0.08 * Math.sin(u * Math.PI)), sc * (0.85 + 0.25 * Math.sin(u * Math.PI)));
        sheen.y = y - 60;
        if (!light && crand() < 0.6) {
          const s = this.img(wave.x + dir * 260 * sc, y - 20 - crand() * 40, 'pk_foam').setScale(0.6 + crand() * 0.8).setAlpha(0.9);
          this.sc.tweens.add({ targets: s, x: s.x + dir * (40 + crand() * 80), y: s.y - 40 - crand() * 60, alpha: 0, duration: 500, ease: 'Quad.Out', onComplete: () => s.destroy() });
        }
      },
      onComplete: () => {
        wave.destroy();
        sheen.destroy();
      },
    });
    // each foot is washed up as the wave's front reaches it
    const cross = (x: number) => Phaser.Math.Clamp((x - x0) / (x1 - x0), 0, 1);
    for (const f of a.allFeet()) {
      if (!f.alive || !f.hittable || f.zombieHold || f.puppet || f.brain.free) continue;
      // (the crest runs 260 px ahead of the wave's middle)
      const u = cross(f.cx - dir * 260 * sc);
      const t = (Math.acos(1 - 2 * u) / Math.PI) * ms;
      this.sc.time.delayedCall(t, () => this.wash(f, light));
    }
    // and as it passes each pizza, a slice back
    const n = pies.length;
    for (const p of a.alivePizzas()) {
      const u = cross(p.x - dir * 260 * sc);
      const t = (Math.acos(1 - 2 * u) / Math.PI) * ms;
      this.sc.time.delayedCall(t, () => {
        if (p.dead) return;
        this.h.heal(p, n);
        a.fx.ring(p.x, p.surfaceY - 24, look.col, 2, 0.42);
        for (let i = 0; i < (light ? 3 : 6); i++) {
          const d = this.img(p.x + (crand() - 0.5) * p.radius * 1.6, p.surfaceY - p.radius * TILT, 'pk_foam').setScale(0.5 + crand() * 0.5).setAlpha(0.9);
          this.sc.tweens.add({ targets: d, y: d.y - 50 - crand() * 40, alpha: 0, duration: 520, ease: 'Quad.Out', onComplete: () => d.destroy() });
        }
        a.quip(p.x, p.surfaceY - 200, `+${n} SLICE${n > 1 ? 'S' : ''}`, look.css2, 30);
      });
    }
    this.sc.time.delayedCall(ms * 0.5, () => a.sfx('sfx_kraken_splash', { volume: 0.45 }));
  }

  private wash(f: Foot, light: boolean): void {
    const a = this.a;
    if (!f.alive || !f.hittable || f.zombieHold || f.puppet || f.brain.free) return;
    a.sfx('sfx_smack_water_heavy', { volume: 0.5, throttle: 90 });
    a.fx.ring(f.cx, f.cy + 60, 0x8af0f0, 1.3, 0.5);
    for (let i = 0; i < (light ? 2 : 4); i++) {
      const s = this.img(f.cx + (crand() - 0.5) * 60, f.cy + 50, 'pk_foam').setScale(0.5 + crand() * 0.6);
      this.sc.tweens.add({ targets: s, y: s.y - 60 - crand() * 50, x: s.x + (crand() - 0.5) * 60, alpha: 0, duration: 520, ease: 'Quad.Out', onComplete: () => s.destroy() });
    }
    if (f.isBossLike) {
      f.knock(1400);
      return;
    }
    if (f.state === 'descend' || f.state === 'stomp') {
      // swept back up to the top (the lift slows as it rises and stops at the hover line, where it picks a new target)
      f.setState('lift');
      f.vy = -Math.sqrt(1400 * Math.max(40, f.y - HOVER_Y + 20));
    } else if (f.state === 'hover') {
      // (a hovering foot starts its wait over, and backs off a little: never down)
      f.stateT = 0;
      f.y = Math.min(f.y, Math.max(HOVER_Y - 30, f.y - 50));
    }
  }

  // ——— the scene ———

  /** The scene is shutting down: everything in flight goes at once (no tweens). */
  clear(): void {
    this.act3.clear();
    this.act4.clear();
    for (const o of [...this.live]) o.destroy();
    this.live.clear();
  }
}
