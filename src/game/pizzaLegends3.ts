// Act 3's Legendaries' perks (docs/pizza-plan.md, section 14), run by the Legendary kit (src/game/pizzaLegends.ts),
// which calls in at each moment and lends its helpers.
//
// - Cosmic Crouton Supreme (croutonPortal): each landed smack has a 1% chance (enhanced 1.5%; copies add, at most 5%)
//   to open a crouton portal on the foot it hit. An ordinary foot is taken through it: it's a kill, paid and counted
//   like any (tips, kill counts, the meter, milestones; combo counts smacks, and the smack that opened it counted). A
//   boss or mini-boss is too big to go through: it takes ×10 instead (Legendary damage, scaled with the heat). Friendly
//   zombies and feet a fight moves by hand are left alone.
// - Roar Roast (hearthRoar): every 25 s of wave with a foot on the table (enhanced 17; two copies twice as often) the
//   Alpine Lodge's hearth roars up behind it: every foot reels, stunned 2 s (bosses, mini-bosses and feet a fight moves
//   by hand only slowed 40% for 2 s; a frozen foot stays frozen; friendly zombies left alone), and for 4 s every hit
//   does +30% (one roar's boost: copies don't stack it).
// - Black Olive Hole (blackHole): every 20 s of wave with a foot on the table (enhanced 13; two copies twice as often)
//   the olive at its centre rises into its lane and opens an event horizon for 2 s. Every foot on the table is pulled
//   towards it, hardest in its own lane and weaker with distance (the lane beside it a strong tug, the far side a
//   slight drift). An ordinary foot in its own lane under 30% health is swallowed whole (a kill, counted like the
//   portal's); every other foot caught in the pull takes ×5 near it, less further out (Legendary damage), and is flung
//   back to the top as the hole closes. Bosses and mini-bosses aren't dragged (their fights move them): they take the
//   hit and a knock. Friendly zombies, feet a fight moves by hand, unreachable feet (phased, buried, off the top) and
//   feet pinned by a set-piece are left alone. The pull holds a foot (it can't dive or stomp while it's caught).
//
// Gameplay randomness is Math.random, cosmetic crand; nothing starts a tween as the scene shuts down.

import Phaser from 'phaser';
import { HOVER_Y, W } from '../config';
import { CROUTON_FRAMES, drawAccretionDisc, drawBigOlive, drawCoal, drawCroutonFrame, drawEventHorizon, drawHearthFlame, drawPortal, drawStarStreak } from '../art/perkPropsLegend3';
import { crand } from '../systems/cosmeticRandom';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';
import type { LegendHost } from './pizzaLegends';
import { legendLook } from './legendary';
import { Action, Hit, Unit } from '../effects';
import { lensIdle, lensOff, lensOn, type LensFX } from './lensFx';

/** Sounds Act 3's perks play that aren't loaded at boot (all credited already): the Cosmic Croc's black hole and its
 *  closing, Thanfoot's portal, UFO Toe's abduction, the cosmic smacks; the fire's ignite and roar. The roar's own
 *  synthesized sound (sfx_legendroar) has a one-word name: loaded at boot. */
export const LEGEND3_SFX = [
  'sfx_cosmiccroc_blackhole', 'sfx_cosmiccroc_holeclose', 'sfx_thanfoot_portal', 'sfx_ufotoe_abduct', 'sfx_smack_cosmic_heavy', 'sfx_smack_cosmic_2',
  'sfx_surtr_ignite', 'sfx_hero_firedup', 'sfx_smack_fire_heavy', 'sfx_smack_fire_1', 'sfx_soleunbound_hole',
];

/** Seconds the event horizon stays open, and the olive's rise before it. */
const HOLE_OPEN = 2;
const HOLE_RISE = 0.45;

/** How hard the hole pulls a foot `lanes` lanes from its own (dx over the table's lane spacing): 1 in its own lane, 0.65
 *  in the next, a third two lanes over, 0.2 three over, 0.12 further (the far side's slight drift). */
const PULL = [1, 0.65, 0.33, 0.2, 0.12];
export function holePull(lanes: number): number {
  const d = Math.max(0, lanes - 0.35);
  const i = Math.min(PULL.length - 1, Math.floor(d));
  const j = Math.min(PULL.length - 1, i + 1);
  return PULL[i] + (PULL[j] - PULL[i]) * (d - Math.floor(d));
}

interface Caught {
  f: Foot;
  /** How hard it's pulled (holePull), how far of the way in it's dragged, and whether it's in the hole's own lane. */
  k: number;
  m: number;
  own: boolean;
  boss: boolean;
  /** Where it was (its sole) when the pull caught it. */
  x0: number;
  y0: number;
  /** Sucked in: no longer pulled (it's on its way into the hole). */
  gone: boolean;
  trailT: number;
}

interface Hole {
  src: Pizza;
  x: number;
  y: number;
  /** Seconds since the olive began to rise. */
  t: number;
  light: boolean;
  caught: Caught[];
  olive: Phaser.GameObjects.Image;
  horizon: Phaser.GameObjects.Image;
  disc: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image;
  /** The disc and its lensed ring are spun flat inside boxes that tilt them. */
  discBox: Phaser.GameObjects.Container;
  ringBox: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Image;
  lens: LensFX | null;
  starT: number;
  opened: boolean;
}

export class Act3Legends {
  private a: Arena;
  private h: LegendHost;
  private sc: Phaser.Scene;
  private img: (x: number, y: number, key: string, under?: boolean | 'back') => Phaser.GameObjects.Image;
  private every: (key: string, gap: number) => boolean;
  /** Roar Roast: seconds of wave (with a foot on the table) since the last roar (it carries over); the boost's end. */
  roarT = 0;
  roarUntil = -99;
  /** Black Olive Hole: seconds of wave (with a foot on the table) since the last hole (it carries over). */
  holeT = 0;
  private hole: Hole | null = null;
  /** The lens pass, while the roar's ripple rolls out. */
  private wave: { lens: LensFX; t: number; x: number; y: number } | null = null;

  constructor(arena: Arena, host: LegendHost, img: Act3Legends['img'], every: Act3Legends['every']) {
    this.a = arena;
    this.h = host;
    this.sc = arena.sc;
    this.img = img;
    this.every = every;
    const tex: [string, () => HTMLCanvasElement][] = [
      ['pk_portal', drawPortal],
      ['pk_starstreak', drawStarStreak],
      ['pk_hearthflame0', () => drawHearthFlame(0)],
      ['pk_hearthflame1', () => drawHearthFlame(0.33)],
      ['pk_hearthflame2', () => drawHearthFlame(0.66)],
      ['pk_coal', drawCoal],
      ['pk_horizon', drawEventHorizon],
      ['pk_disc', drawAccretionDisc],
      ['pk_bigolive', drawBigOlive],
    ];
    for (let i = 0; i < CROUTON_FRAMES; i++) tex.push([`pk_crouton${i}`, () => drawCroutonFrame(i)]);
    for (const [k, draw] of tex) if (!this.sc.textures.exists(k)) this.sc.textures.addCanvas(k, draw());
  }

  /** A foot a perk may move or take: on the table and reachable, not a friendly zombie or one a fight moves by hand. */
  private reachable(f: Foot): boolean {
    return f.alive && f.hittable && !f.zombieHold && !f.puppet && !f.brain.free && !f.pinned && f.y > 0;
  }

  runStart(): void {
    this.roarT = 0;
    this.roarUntil = -99;
    this.holeT = 0;
  }

  /** The wave closes: the roar's boost ends with its wave. */
  roarEnd(): void {
    this.roarUntil = -99;
  }

  /** The wave closes: an open hole closes as the wave clears. */
  holeEnd(): void {
    if (this.hole) this.closeHole(this.hole, true);
  }

  /** Is a Black Olive Hole open now? */
  holeOpen(): boolean {
    return !!this.hole;
  }

  /** Every frame: Roar Roast's and Black Olive Hole's timers (one frame's look at the field for both, as they always
   *  had: a roar can't change whether the hole's clock runs this frame). */
  timersTick(dt: number): void {
    const roar = this.h.c('hearthRoar');
    const bh = this.h.c('blackHole');
    if (roar > 0 || bh > 0) {
      let on = false;
      for (const f of this.a.allFeet()) if (f.alive && f.hittable && f.y > 60) {
        on = true;
        break;
      }
      this.timers(dt, roar, bh, on);
    }
  }

  /** Every frame: an open hole pulls. */
  holeStep(dt: number): void {
    if (this.hole) this.holeTick(this.hole, dt);
  }

  /** Every frame: the roar's ripple rolls out. */
  rippleStep(dt: number): void {
    if (this.wave) this.waveTick(dt);
  }

  private timers(dt: number, roar: number, bh: number, on: boolean): void {
    // Roar Roast: every 25 s (two pies: 12.5) of wave with a foot on the table
    if (roar > 0) {
      if (on) this.roarT += dt;
      if (this.roarT >= 25 / roar && on) {
        this.roarT = 0;
        this.roar();
      }
    }
    // Black Olive Hole: every 20 s (two pies: 10) with a foot on the table, one hole at a time
    if (bh > 0 && !this.hole) {
      if (on) this.holeT += dt;
      if (this.holeT >= 20 / bh && this.a.allFeet().some((f) => this.reachable(f))) {
        this.holeT = 0;
        this.openHole();
      }
    }
  }

  /** Every hit's multiplier from these perks now: the roar's +30%. */
  damageMult(): number {
    return this.a.now() < this.roarUntil ? 1.3 : 1;
  }

  /** Roar Roast's boost is on. */
  roaring(): boolean {
    return this.a.now() < this.roarUntil;
  }

  // ════════════════════════════ Cosmic Crouton Supreme ════════════════════════════

  /** A smack landed on f: Roar Roast's boost shows on the smacks it strengthens, embers off the foot. */
  roarSparks(f: Foot): void {
    if (this.roaring() && f.alive && this.every('roarHit', 0.12)) {
      this.a.fx.burn(f.cx + (crand() - 0.5) * 30, f.cy + 20);
      this.a.fx.ring(f.cx, f.cy + 30, 0xff8a2a, 0.7, 0.5);
    }
  }

  /** A smack's 1% (enhanced 1.5%, copies add; rolled on the bus: src/game/perkEffects.ts) came up: the crouton opens a
   *  portal on f (a boss takes ×10 instead). */
  portalOn(f: Foot): void {
    const pies = this.h.granting('croutonPortal');
    const src = pies[0];
    if (!src) return;
    for (const p of pies) p.perkFired({ quip: false });
    if (f.isBossLike) this.croutonBlast(f, src);
    else this.portal(f, src);
  }

  /** The crouton flies off its orbit to the foot, trailing stardust, and tears a portal open where it lands. */
  private croutonFly(src: Pizza, tx: number, ty: number, ms: number): void {
    const x0 = src.x + src.radius * 0.9;
    const y0 = src.surfaceY - src.radius * 0.3;
    const cr = this.img(x0, y0, 'pk_crouton0').setScale(0.55);
    let fr = 0;
    this.sc.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms,
      ease: 'Sine.In',
      onUpdate: (tw) => {
        if (!cr.active) return;
        const u = tw.getValue() ?? 0;
        cr.setPosition(x0 + (tx - x0) * u, y0 + (ty - y0) * u - Math.sin(u * Math.PI) * 140);
        fr = (fr + 1) % CROUTON_FRAMES;
        cr.setTexture(`pk_crouton${fr}`).setScale(0.55 - 0.2 * u);
        if (crand() < 0.7) this.a.fx.propTrail(cr.x, cr.y, crand() < 0.5 ? 0x9a8cff : 0xffe2a0, 0.45);
      },
      onComplete: () => cr.destroy(),
    });
  }

  /** An ordinary foot taken through the portal: it opens round the foot, the foot is sucked in spinning and shrinking,
   *  and the portal snaps shut. A kill. */
  private portal(f: Foot, src: Pizza): void {
    const a = this.a;
    const light = this.h.bossFight();
    const look = legendLook('cosmiccrouton');
    // (kept fully on screen; the foot is held while the portal opens)
    const px = Phaser.Math.Clamp(f.cx, 150, W - 150);
    const py = Math.max(f.cy + 10, 170);
    f.brain.portal = 1;
    f.stunT = Math.max(f.stunT, 0.25);
    this.croutonFly(src, px, py, 220);
    a.sfx('sfx_thanfoot_portal', { volume: 0.7, throttle: 150 });
    // the portal, behind the foot's middle (it's under the other effects: the foot is drawn into it)
    const ring = this.img(px, py, 'glow', true).setTint(look.col).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setAlpha(0);
    const por = this.img(px, py, 'pk_portal', true).setScale(0.05).setAlpha(0);
    this.sc.time.delayedCall(200, () => {
      if (!por.active) return;
      this.sc.tweens.add({ targets: por, scale: 1.05, alpha: 1, duration: 220, ease: 'Back.Out' });
      this.sc.tweens.add({ targets: por, angle: -540, duration: 1100 });
      this.sc.tweens.add({ targets: ring, scale: 2.6, alpha: 0.6, duration: 220, ease: 'Quad.Out' });
      a.fx.ring(px, py, 0x7df9ff, 1.8, 0.9);
      a.shake(light ? 60 : 110, light ? 0.002 : 0.004);
      a.quip(px, Math.max(150, py - 220), 'COSMIC CROUTON!', look.css, 42);
      // stars streaking into it
      for (let i = 0; i < (light ? 5 : 10); i++) this.streak(px, py, 140 + crand() * 260, 300 + crand() * 200, crand() * 160);
      // the foot goes: a kill, then drawn in spinning and shrinking (unless it's slipped out of reach meanwhile)
      if (!f.alive) return;
      if (!this.reachable(f)) {
        f.brain.portal = 0;
        return;
      }
      this.h.kill(f);
      if (f.alive) {
        // (a foot that comes back from a killing blow is spat out)
        f.brain.portal = 0;
        f.knock(900);
        return;
      }
      a.sfx('sfx_ufotoe_abduct', { volume: 0.7, throttle: 120 });
      this.suckIn(f, px, py, 460, 4);
      a.quip(px, Math.min(Math.max(150, py - 220) + 330, src.surfaceY - src.radius - 90), 'LOST IN SPACE!', '#bff6ff', 36);
    });
    // the snap shut
    this.sc.time.delayedCall(760, () => {
      if (!por.active) return;
      a.sfx('sfx_cosmiccroc_holeclose', { volume: 0.6, throttle: 150 });
      a.fx.glint(px, py, light ? 3 : 6);
      a.fx.ring(px, py, look.col2, 1.2, 0.9);
      this.sc.tweens.add({ targets: por, scale: 0, alpha: 0.4, duration: 180, ease: 'Back.In', onComplete: () => por.destroy() });
      this.sc.tweens.add({ targets: ring, scale: 0.1, alpha: 0, duration: 200, onComplete: () => ring.destroy() });
    });
  }

  /** A boss is too big for the portal: it opens behind it and a cosmic blast hits it for ×10 (Legendary-scaled). */
  private croutonBlast(f: Foot, src: Pizza): void {
    const a = this.a;
    const light = this.h.bossFight();
    const look = legendLook('cosmiccrouton');
    const px = f.cx;
    const py = f.cy;
    this.croutonFly(src, px, py, 220);
    a.sfx('sfx_thanfoot_portal', { volume: 0.7, throttle: 150 });
    const por = this.img(px, py, 'pk_portal', true).setScale(0.05).setAlpha(0);
    this.sc.time.delayedCall(200, () => {
      if (!por.active) return;
      this.sc.tweens.add({ targets: por, scale: 1.6, alpha: 0.95, duration: 220, ease: 'Back.Out' });
      this.sc.tweens.add({ targets: por, angle: -400, duration: 700 });
      this.sc.tweens.add({ targets: por, scale: 0, alpha: 0, delay: 420, duration: 220, ease: 'Back.In', onComplete: () => por.destroy() });
      a.sfx('sfx_smack_cosmic_heavy', { volume: 0.8 });
      a.shake(light ? 90 : 150, light ? 0.003 : 0.005);
      a.fx.ring(px, py, 0x7df9ff, 2.2, 0.9);
      a.fx.ring(px, py, look.col2, 1.6, 0.9);
      for (let i = 0; i < (light ? 4 : 8); i++) this.streak(px, py, 160 + crand() * 220, 280 + crand() * 160, crand() * 120);
      if (!f.alive) return;
      f.flash(0xbff6ff, 120);
      this.h.strike(f, 'croutonPortal', Action.Damage(Hit.Legend(Unit.Mult(10)), { knock: Unit.Amount(300) }));
      a.quip(px, py - 220, 'COSMIC CROUTON! ×10', look.css, 44);
    });
  }

  /** A star streaking in towards (x, y) from `r` px out over `ms`. */
  private streak(x: number, y: number, r: number, ms: number, delay = 0): void {
    const ang = crand() * Math.PI * 2;
    const sx = x + Math.cos(ang) * r;
    const sy = y + Math.sin(ang) * r * 0.75;
    const s = this.img(sx, sy, 'pk_starstreak').setBlendMode(Phaser.BlendModes.ADD).setRotation(Math.atan2(y - sy, x - sx)).setScale(0.6 + crand() * 0.6, 0.8).setAlpha(0);
    this.sc.tweens.add({ targets: s, x, y, alpha: { from: 0.95, to: 0.2 }, scaleX: 0.2, delay, duration: ms, ease: 'Quad.In', onComplete: () => s.destroy() });
  }

  /** A defeated foot drawn into a point: stretched towards it, spinning and shrinking to nothing (its death tween
   *  replaced: it's destroyed at the end). */
  private suckIn(f: Foot, x: number, y: number, ms: number, turns: number): void {
    const root = f.root;
    if (!root.active) return;
    this.sc.tweens.killTweensOf(root);
    f.setBodyScale(0.75, 1.35);
    const s0 = root.scaleX;
    const x0 = root.x;
    const y0 = root.y;
    // (its middle goes to the point: the root is its sole, the middle above it by 0.45 of its height)
    const mid = f.meta.footHeight * f.scale * 0.45;
    const r0 = root.rotation;
    this.sc.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms,
      ease: 'Quad.In',
      onUpdate: (tw) => {
        if (!root.active) return;
        const u = tw.getValue() ?? 0;
        const k = 1 - u * 0.95;
        root.setScale(s0 * k);
        root.setPosition(x0 + (x - x0) * u, y0 + (y + mid * k - y0) * u);
        root.setRotation(r0 + u * u * turns * Math.PI);
        root.setAlpha(1 - u * u * 0.6);
      },
      onComplete: () => f.destroy(),
    });
  }

  // ════════════════════════════ Roar Roast ════════════════════════════

  /** The Lodge's hearth roars up behind the Roast: a breath in, then the roar, a blast of heat rolling out across the
   *  table, every foot reeling (stunned 2 s; bosses slowed), and every hit +30% for 4 s. */
  private roar(): void {
    const a = this.a;
    const pies = this.h.granting('hearthRoar');
    const src = pies[0];
    if (!src) return;
    const light = this.h.bossFight();
    const look = legendLook('roarroast');
    for (const p of pies) p.perkFired({ quip: false });
    const fx = src.x;
    const fy = src.surfaceY - src.radius * 0.35;
    // the breath in: embers drawn in to the pie from round it
    a.sfx('sfx_surtr_ignite', { volume: 0.5 });
    for (let i = 0; i < (light ? 5 : 10); i++) {
      const ang = -Math.PI * (0.1 + crand() * 0.8);
      const d = 180 + crand() * 160;
      const e = this.img(fx + Math.cos(ang) * d, fy + Math.sin(ang) * d * 0.7, 'pza_ember').setBlendMode(Phaser.BlendModes.ADD).setScale(1.2 + crand()).setAlpha(0.9);
      this.sc.tweens.add({ targets: e, x: fx, y: fy, scale: 0.4, alpha: 0.2, duration: 320, ease: 'Quad.In', onComplete: () => e.destroy() });
    }
    this.sc.time.delayedCall(340, () => {
      // THE ROAR: the hearth's flame bursts up behind the pie, flickering, and dies back
      a.sfx('sfx_legendroar', { volume: light ? 0.6 : 0.8 });
      a.sfx('sfx_fire', { volume: 0.5 });
      a.shake(light ? 140 : 260, light ? 0.004 : 0.008);
      a.quip(src.x, src.surfaceY - 470, 'ROAR!', look.css, light ? 56 : 70);
      const k = Phaser.Math.Clamp(src.radius / 190, 0.6, 1.1);
      const flame = this.img(src.x, src.surfaceY - src.radius * 0.3, 'pk_hearthflame0', 'back').setOrigin(0.5, 1).setScale(k * 1.2, 0).setAlpha(0.95);
      const fglow = this.img(src.x, src.surfaceY - src.radius * 0.6, 'glow', 'back').setTint(0xff7a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4, 2).setAlpha(0);
      this.sc.tweens.add({ targets: flame, scaleY: k * 1.15, duration: 180, ease: 'Back.Out' });
      this.sc.tweens.add({ targets: fglow, alpha: 0.7, duration: 160 });
      let fr = 0;
      const flick = this.sc.time.addEvent({ delay: 70, repeat: 10, callback: () => flame.active && flame.setTexture(`pk_hearthflame${(fr = (fr + 1) % 3)}`) });
      this.sc.tweens.add({ targets: flame, scaleY: 0, alpha: 0, delay: 640, duration: 260, ease: 'Quad.In', onComplete: () => { flick.remove(); flame.destroy(); } });
      this.sc.tweens.add({ targets: fglow, alpha: 0, delay: 600, duration: 300, onComplete: () => fglow.destroy() });
      // the blast of heat rolling across the table, and its ripple through the air
      for (let i = 0; i < 2; i++) this.sc.time.delayedCall(i * 120, () => a.fx.ring(src.x, src.surfaceY - 20, i ? 0xffd27a : 0xff7a2a, 5 + i * 1.5, 0.3));
      const lens = lensOn(this.sc);
      if (lens) {
        this.wave = { lens, t: 0, x: src.x, y: src.surfaceY - 80 };
        lens.wx = src.x;
        lens.wy = src.surfaceY - 80;
      }
      // every foot reels
      const feet = a.allFeet().filter((f) => f.alive && f.hittable && f.y > 0 && !f.zombieHold);
      for (const f of feet) {
        const d = Math.hypot(f.cx - src.x, f.cy - src.surfaceY);
        this.sc.time.delayedCall(Math.min(380, d * 0.25), () => this.reel(f, light));
      }
      // FIRED UP: +30% for 4 s
      this.roarUntil = a.now() + 4;
      this.sc.time.delayedCall(420, () => {
        if (feet.length) a.quip(W / 2, 250, 'FIRED UP! +30% DAMAGE', look.css, 40);
        a.sfx('sfx_hero_firedup', { volume: 0.45, throttle: 400 });
      });
    });
  }

  /** A foot hit by the roar: a hot gust and embers off it, stunned 2 s (bosses and fights' feet slowed 40%). */
  private reel(f: Foot, light: boolean): void {
    if (!f.alive || !f.hittable || f.zombieHold) return;
    const a = this.a;
    a.fx.ring(f.cx, f.cy + 40, 0xff8a2a, 1.2, 0.5);
    for (let i = 0; i < (light ? 1 : 2); i++) a.fx.burn(f.cx + (crand() - 0.5) * 50, f.cy + 30);
    a.fx.puff(f.cx, f.cy + 40, light ? 2 : 4);
    if (f.isBossLike || f.puppet || f.brain.free) {
      // (only a slow about to run out is replaced: a longer one is never made stronger)
      if (!f.type.traits.includes('immuneSlow') && (f.slowT <= 2 || f.slowPct >= 0.4)) {
        if (f.slowT <= 2) f.slowPct = 0.4;
        f.slowT = Math.max(f.slowT, 2);
      }
      return;
    }
    f.flash(0xffb070, 110);
    if (!(f.stunT > 0 && f.frozen)) f.stun(2);
    f.knock(300);
  }

  private waveTick(dt: number): void {
    const w = this.wave!;
    w.t += dt;
    const u = w.t / 0.8;
    const lens = w.lens;
    if (u >= 1) {
      lens.waveAmp = 0;
      lensIdle(this.sc, lens);
      this.wave = null;
      return;
    }
    lens.wx = w.x;
    lens.wy = w.y;
    lens.wave = 60 + u * 1500;
    lens.waveW = 90;
    lens.waveAmp = (this.h.bossFight() ? 9 : 16) * (1 - u);
  }

  // ════════════════════════════ Black Olive Hole ════════════════════════════

  /** The olive rises out of the pie into its lane and opens the event horizon there. */
  private openHole(): void {
    const a = this.a;
    const pies = this.h.granting('blackHole');
    // (from the pie whose lane has the most feet in it: any of them would do, this is the best show)
    const src = pies.slice().sort((p, q) => this.laneCount(q) - this.laneCount(p))[0];
    if (!src) return;
    for (const p of pies) p.perkFired({ quip: false });
    const light = this.h.bossFight();
    const look = legendLook('blackolivehole');
    // (in its lane, between the hover line and the table: its pull's lensing stops short of the pies and their bars)
    const x = Phaser.Math.Clamp(src.x, 160, W - 160);
    const y = src.surfaceY - src.radius * 0.5 - 290;
    a.sfx('sfx_cosmiccroc_blackhole', { volume: light ? 0.6 : 0.85 });
    a.quip(src.x, y - 230, 'BLACK OLIVE HOLE!', look.css, light ? 40 : 48);
    const olive = this.img(src.x, src.surfaceY - 20, 'pk_bigolive').setScale(0.4).setAlpha(0);
    this.sc.tweens.add({ targets: olive, alpha: 1, duration: 120 });
    const glow = this.img(x, y, 'glow', true).setTint(look.col).setBlendMode(Phaser.BlendModes.ADD).setScale(0).setAlpha(0.5);
    const ring = this.sc.add.image(0, 0, 'pk_disc').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55);
    const disc = this.sc.add.image(0, 0, 'pk_disc').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.95);
    const ringBox = this.sc.add.container(x, y, [ring]).setScale(0);
    const discBox = this.sc.add.container(x, y, [disc]).setScale(0);
    a.fxLayer.addAt(ringBox, 0);
    a.fxLayer.addAt(discBox, 1);
    const horizon = this.img(x, y, 'pk_horizon', true).setScale(0);
    this.hole = { src, x, y, t: 0, light, caught: [], olive, horizon, disc, ring, discBox, ringBox, glow, lens: null, starT: 0, opened: false };
  }

  private laneCount(p: Pizza): number {
    return this.a.allFeet().filter((f) => this.reachable(f) && Math.abs(f.cx - p.x) < p.radius * 1.2).length;
  }

  private holeTick(h: Hole, dt: number): void {
    const a = this.a;
    h.t += dt;
    const light = h.light;
    // the olive's rise: up out of the pie into the lane, spinning, swelling (anticipation)
    if (h.t < HOLE_RISE) {
      const u = Phaser.Math.Easing.Cubic.InOut(h.t / HOLE_RISE);
      const sy = h.src.surfaceY - 20;
      h.olive.setPosition(h.src.x + (h.x - h.src.x) * u, sy + (h.y - sy) * u).setScale(0.4 + u * 0.5).setRotation(u * 4);
      return;
    }
    if (!h.opened) {
      h.opened = true;
      h.olive.destroy();
      this.capture(h);
      a.sfx('sfx_soleunbound_hole', { volume: light ? 0.4 : 0.6 });
      a.shake(light ? 160 : 320, light ? 0.003 : 0.006);
      a.fx.ring(h.x, h.y, 0xffe0b0, 2.4, 0.9);
      h.lens = lensOn(this.sc);
    }
    const t = h.t - HOLE_RISE;
    const open = Math.min(1, t / 0.3);
    const close = t > HOLE_OPEN - 0.3 ? Math.max(0, (HOLE_OPEN - t) / 0.3) : 1;
    const on = open * close;
    const s = 1 - 0.25 * Number(light);
    // the horizon, the disc spinning round it (tilted), and its far side bent up round the hole (the lensed ring)
    const wob = 1 + 0.03 * Math.sin(t * 13);
    h.horizon.setScale(1.05 * on * s * wob);
    h.discBox.setScale(0.78 * on * s, 0.22 * on * s);
    h.disc.setRotation(-t * 2.2);
    h.ringBox.setScale(0.42 * on * s, 0.46 * on * s);
    h.ring.setRotation(t * 1.5).setAlpha(0.5 * on);
    h.glow.setScale(3.4 * on * s).setAlpha(0.4 * on);
    if (h.lens) {
      h.lens.cx = h.x;
      h.lens.cy = h.y;
      h.lens.hole = 52 * s;
      h.lens.radius = 250 * s;
      h.lens.strength = on * (light ? 0.6 : 1);
    }
    // stars streaking in
    h.starT += dt * (light ? 7 : 16) * on;
    while (h.starT >= 1) {
      h.starT -= 1;
      this.streak(h.x, h.y, 260 + crand() * 380, 340 + crand() * 240);
    }
    this.pull(h, Math.min(1, t / 0.9), dt);
    if (t >= HOLE_OPEN) this.closeHole(h, false);
  }

  /** The table's lane spacing: the average gap between the pizzas (a lone pizza: a fifth of the table). */
  private laneGap(): number {
    const xs = this.a.alivePizzas().map((p) => p.x).sort((p, q) => p - q);
    if (xs.length < 2) return W / 5;
    return (xs[xs.length - 1] - xs[0]) / (xs.length - 1);
  }

  /** Every foot it can reach is caught as the horizon opens. */
  private capture(h: Hole): void {
    const gap = this.laneGap();
    for (const f of this.a.allFeet()) {
      if (!this.reachable(f)) continue;
      const lanes = Math.abs(f.cx - h.x) / gap;
      const k = holePull(lanes);
      // (dragged all the way in its own lane; across the table a tug that falls off fast: the next lane well over
      // towards it, the far side a drift)
      const dist = Math.hypot(h.x - f.x, h.y - 44 - f.y) || 1;
      const m = lanes < 0.35 ? 1 : Math.min(Math.pow(k, 1.8), (600 * Math.pow(k, 1.5)) / dist);
      const c: Caught = { f, k, m, own: lanes < 0.35, boss: f.isBossLike, x0: f.x, y0: f.y, gone: false, trailT: crand() * 0.1 };
      h.caught.push(c);
      if (!c.boss) {
        // (held: it can't dive or stomp while it's caught, by a short stun topped up each frame; its own stun or
        // freeze, or one it's given while held, carries on after)
        f.stunT = Math.max(f.stunT, 0.2);
        if (f.state === 'descend' || f.state === 'stomp' || f.state === 'lift') f.vy = 0;
      }
    }
  }

  /** The pull, `u` (0…1) of the way in: each foot dragged towards the hole by its pull, leaning and stretching into
   *  it; an ordinary foot in its own lane under 30% health is swallowed. */
  private pull(h: Hole, u: number, dt: number): void {
    const e = Phaser.Math.Easing.Quadratic.Out(u);
    // (the soles go to just above the horizon: the feet's bodies sit on its rim)
    const tx = h.x;
    const ty = h.y - 44;
    for (const c of h.caught) {
      const f = c.f;
      if (c.gone) continue;
      if (c.boss) continue;
      // (a foot that died, or stopped being one the hole can move (a friendly zombie now, pinned or moved by a fight,
      // phased or buried), is let go, its pose put back)
      if (!f.alive || !this.reachable(f)) {
        c.gone = true;
        f.leanFx = 0;
        f.setBodyScale(1, 1);
        continue;
      }
      const k = c.k;
      const jit = c.own ? Math.sin(h.t * 40 + c.x0) * 4 * e : 0;
      f.x = c.x0 + (tx - c.x0) * c.m * e + jit;
      f.y = c.y0 + (ty - c.y0) * c.m * e;
      f.stunT = Math.max(f.stunT, 0.2);
      // leaning into it and stretched towards it (more the closer it's drawn)
      const dir = Math.sign(tx - f.x) || 0;
      f.leanFx = dir * 0.4 * k * e;
      f.setBodyScale(1 - 0.12 * k * e, 1 + 0.22 * k * e);
      // streaks of its light pulled off it towards the hole
      c.trailT -= dt;
      if (c.trailT <= 0 && k > 0.3) {
        c.trailT = h.light ? 0.16 : 0.08;
        const st = this.img(f.cx, f.cy, 'pk_starstreak').setBlendMode(Phaser.BlendModes.ADD).setTint(c.own ? 0xffc890 : 0xb8a8ff).setRotation(Math.atan2(h.y - f.cy, h.x - f.cx)).setScale(1.2 * k, 1.4).setAlpha(0.8);
        this.sc.tweens.add({ targets: st, x: f.cx + (h.x - f.cx) * 0.5, y: f.cy + (h.y - f.cy) * 0.5, alpha: 0, scaleX: 0.3, duration: 260, ease: 'Quad.In', onComplete: () => st.destroy() });
      }
      if (c.own && u > 0.55 && !f.isBossLike && f.hp / f.maxHp < 0.3) this.swallow(h, c);
    }
  }

  /** Swallowed whole: a kill, the foot stretched and drawn into the black. */
  private swallow(h: Hole, c: Caught): void {
    const a = this.a;
    const f = c.f;
    c.gone = true;
    f.leanFx = 0;
    this.h.kill(f);
    if (f.alive) {
      // (a foot that comes back from a killing blow is spat back out with the rest)
      c.gone = false;
      return;
    }
    a.sfx('sfx_ufotoe_abduct', { volume: 0.6, rate: 0.8, throttle: 120 });
    a.fx.ring(h.x, h.y, 0xffc890, 1.4, 0.9);
    this.suckIn(f, h.x, h.y, 380, 3);
    if (this.every('swallow', 0.5)) a.quip(h.x + (h.x > W / 2 ? -360 : 360), h.y - 40, 'SWALLOWED WHOLE!', '#ffe2c0', 36);
  }

  /** The horizon closes: everything still caught is flung back to the top, hit ×5 near it (less further out); the
   *  hole implodes in a flash. `quiet`: the wave ended (no hits). */
  private closeHole(h: Hole, quiet: boolean): void {
    const a = this.a;
    this.hole = null;
    const light = h.light;
    if (!h.opened) {
      h.olive.destroy();
    } else if (!quiet) {
      a.sfx('sfx_cosmiccroc_holeclose', { volume: light ? 0.6 : 0.85 });
      a.shake(light ? 120 : 220, light ? 0.004 : 0.007);
      a.fx.ring(h.x, h.y, 0xffe0b0, 3, 0.9);
      a.fx.ring(h.x, h.y, legendLook('blackolivehole').col2, 4.2, 0.6);
      a.fx.glint(h.x, h.y, light ? 4 : 10);
    }
    for (const o of [h.horizon, h.discBox, h.ringBox, h.glow]) {
      if (!o.active) continue;
      if (quiet) o.destroy();
      else this.sc.tweens.add({ targets: o, scale: 0, alpha: 0, duration: 200, ease: 'Back.In', onComplete: () => o.destroy() });
    }
    if (h.lens) {
      h.lens.strength = 0;
      lensIdle(this.sc, h.lens);
    }
    let hits = 0;
    for (const c of h.caught) {
      const f = c.f;
      if (c.gone || !f.alive) continue;
      if (!c.boss) {
        f.leanFx = 0;
        f.setBodyScale(1, 1);
        // (the pull's hold ends; a longer stun or freeze, its own or one given while it was held, carries on)
        if (f.stunT <= 0.3) f.stunT = 0.01;
      }
      if (!quiet && f.hittable) {
        this.h.strike(f, 'blackHole', Action.Damage(Hit.Legend(Unit.Mult(5)), { knock: Unit.Amount(0) }), c.k);
        hits++;
      }
      if (!f.alive) continue;
      if (c.boss) {
        if (!quiet) f.knock(1400 * c.k);
        continue;
      }
      if (!quiet) a.fx.ring(f.cx, f.cy + 40, 0xffc890, 1.1 * c.k + 0.4, 0.5);
      // flung back up to the top (the lift slows as it rises and stops at the hover line, where it picks a new target)
      f.setState('lift');
      f.vy = -Math.sqrt(1400 * Math.max(40, f.y - HOVER_Y + 20)) * (0.7 + 0.3 * c.k);
    }
    if (hits) a.quip(h.x, h.y - 160, 'FLUNG OUT! ×5', legendLook('blackolivehole').css, 40);
  }

  // ——— the scene ———

  clear(): void {
    if (this.hole) {
      this.hole.discBox.destroy();
      this.hole.ringBox.destroy();
      for (const c of this.hole.caught) {
        if (c.f.alive && !c.boss) {
          c.f.leanFx = 0;
          c.f.setBodyScale(1, 1);
        }
      }
    }
    this.hole = null;
    this.wave = null;
    lensOff(this.sc);
  }
}
