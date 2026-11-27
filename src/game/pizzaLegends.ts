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
// Each perk's moment is a show-piece (the ladle's swing, the tray's run across the table, the oven's breath) with its
// own sound, landing on its targets and never covering the table; lighter in a boss fight. Gameplay randomness is
// Math.random, cosmetic crand; nothing starts a tween as the scene shuts down.

import Phaser from 'phaser';
import { HOVER_Y, W } from '../config';
import type { PizzaPerk } from '../data/pizzas';
import { crand } from '../systems/cosmeticRandom';
import { drawFlour, drawLadle, drawOvenMouth, drawRaguFleck, drawSilverTray } from '../art/perkPropsLegend';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';
import type { Run } from './Run';
import { legendDmg, legendLook } from './legendary';

/** Sounds the Legendaries' perks play that aren't loaded at boot: Nonna's spoon and rolling pin, the Head Waiter's
 *  tray, wood and sauce smacks. All credited already. (The Legendaries' own synthesized sounds, sfx_legendbake,
 *  sfx_legendpuff, sfx_legendfanfare, sfx_legendreveal and sfx_legendstamp, have one-word names: loaded at boot.) */
export const LEGEND_SFX = [
  'sfx_nonna_spoon', 'sfx_nonna_pin', 'sfx_smack_wood_heavy', 'sfx_smack_sauce_heavy', 'sfx_smack_sauce_1',
  'sfx_headwaiter_traytoss', 'sfx_headwaiter_traybat', 'sfx_headwaiter_trayclang', 'sfx_headwaiter_service', 'sfx_smack_metal_heavy',
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
  /** Sprites in flight (dropped at once if the scene goes). */
  private live = new Set<Phaser.GameObjects.GameObject>();
  private quipAt: Record<string, number> = {};

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
    ];
    for (const [k, draw] of tex) if (!this.sc.textures.exists(k)) this.sc.textures.addCanvas(k, draw());
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

  private img(x: number, y: number, key: string, under = false): Phaser.GameObjects.Image {
    const o = this.sc.add.image(x, y, key);
    if (under) this.a.fxLayer.addAt(o, 0);
    else this.a.fxLayer.add(o);
    this.live.add(o);
    o.once('destroy', () => this.live.delete(o));
    return o;
  }

  // ——— the run and its waves ———

  runStart(): void {
    this.silverT = 0;
    this.ladleUsed = 0;
    this.baked.clear();
    this.ovenStage = -1;
  }

  waveStart(_n: number): void {
    this.ladleUsed = 0;
    // The First Bake: every pizza starts the wave fresh (one bought in the shop too), and the first time each starts a
    // wave whole it gets its slice over the top
    const bakers = this.h.granting('firstBake');
    if (!bakers.length) return;
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

  waveClear(n: number): void {
    // The First Bake tops every pizza up as the wave clears, so the shop shows them fresh
    if (this.h.granting('firstBake').length) this.freshen(Math.floor((n - 1) / 5));
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
  ladle(f: Foot, p: Pizza): boolean {
    if (p === this.a.possessed() || !f.alive) return false;
    const pies = this.h.granting('nonnaLadle');
    if (!pies.length) return false;
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

  update(dt: number): void {
    const k = this.h.c('silverTray');
    if (k <= 0) return;
    this.silverT += dt;
    if (this.silverT < 15 / k) return;
    if (!this.a.allFeet().some((f) => this.batable(f) && f.y > 300)) return;
    this.silverT = 0;
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

  // ——— the scene ———

  /** The scene is shutting down: everything in flight goes at once (no tweens). */
  clear(): void {
    for (const o of [...this.live]) o.destroy();
    this.live.clear();
  }
}
