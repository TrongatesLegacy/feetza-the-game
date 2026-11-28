// Act 4's Legendaries' looks and sounds (docs/pizza-plan.md, section 15): the choreography of the rules in
// src/game/pizzaLegends4.ts, kept in its own view file (docs/core-split-plan.md). It draws what the rules tell it,
// from their plain state objects, and decides nothing: cosmetic randomness is crand(), and the only clock tweens here
// are the ones that carry a dying foot away (its picture's last move, ending in its destroy, as the black hole's
// swallow does).
//
// - Pigeon King's Catch: the King's pigeon (crowned) swoops in from the nearer side, wings beating, throws its talons
//   forward and grips the foot by the ankle: feathers burst, "SNATCHED!", a coo and a flurry; then it labours up and
//   away off the far top corner with the foot dangling, swinging, a feather or two drifting down. Missed (the foot
//   slipped away): it pulls up and flies off.
// - Second Rise: out of the beaten foot a dough copy of it swells up (squash and stretch, a flour puff), floured and
//   glazed, and floats bobbing beside the feet; each bite it lunges, its dough jaws snap shut on the foot ("CHOMP!",
//   flour flying); as its 6 s end it sags and slumps away in a puff.
// - Cathedral Crust: as the wave starts each pizza settles into a ring of carved cathedral stone (under it, round the
//   plate), dust rising; the first stomp on one CLANGS on the stone: the foot greys over as it's turned to stone,
//   the ring cracks and bursts in chips with shards of stained glass, the rose window's coloured light flashes across
//   the table, the cathedral's bell tolls once. "SET IN STONE!"
// Restrained: everything stays off the pies' faces, labels and freshness bars (the stone sits under the plates, the
// risen float above the table), and plays lighter in a boss fight.

import { clockOf } from '../core/clock';
import Phaser from 'phaser';
import { W } from '../config';
import { drawFlour } from '../art/perkPropsLegend';
import { doughCopy, drawBell, drawDoughJaw, drawFeather, drawGlassShard, drawLightShaft, drawPigeonFrame, drawRoseWindow, drawStoneChip, drawStoneRing, GLASS, PIGEON_FRAMES } from '../art/perkPropsLegend4';
import { hashStr } from '../art/util';
import { crand } from '../systems/cosmeticRandom';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';
import { legendLook } from './legendary';
import type { Risen, Swoop } from './pizzaLegends4';
import { ACT4 } from './perkEffects';

/** Sounds these moments play that aren't loaded at boot (all credited already): the Pigeon King's coo and flock, wing
 *  beats and a swoop; the Dough Boy's rise and splat, dough smacks, a bite; the Gargoyle's stone, its crack and break,
 *  stone and glass smacks, the bells. */
export const LEGEND4_SFX = [
  'sfx_pigeonking_coo', 'sfx_pigeonking_flock', 'sfx_hero_wings', 'sfx_gargoyle_swoop', 'sfx_smack_fur_heavy',
  'sfx_doughboy_rise', 'sfx_doughboy_splat', 'sfx_smack_dough_heavy', 'sfx_smack_dough_1', 'sfx_poltergeist_bite',
  'sfx_gargoyle_stone', 'sfx_gargoyle_stonecrack', 'sfx_gargoyle_stonebreak', 'sfx_smack_stone_heavy', 'sfx_smack_glass_1', 'sfx_soleprop_bell', 'sfx_smack_tail_bell',
];

const ADD = Phaser.BlendModes.ADD;

/** Make the moments' textures (once a scene). */
export function ensure4(sc: Phaser.Scene): void {
  const tex: [string, () => HTMLCanvasElement][] = [
    ['pk_feather', drawFeather],
    ['pk_doughjaw', drawDoughJaw],
    ['pk_stonering', drawStoneRing],
    ['pk_stonechip', drawStoneChip],
    ['pk_rosewindow', () => drawRoseWindow(220)],
    ['pk_lightshaft', drawLightShaft],
    ['pk_bell', drawBell],
    ['pk_flour', drawFlour],
  ];
  for (let i = 0; i < PIGEON_FRAMES; i++) tex.push([`pk_pigeon${i}`, () => drawPigeonFrame(i)]);
  for (let i = 0; i < GLASS.length; i++) tex.push([`pk_glass${i}`, () => drawGlassShard(i)]);
  for (const [k, d] of tex) if (!sc.textures.exists(k)) sc.textures.addCanvas(k, d());
}

interface Bird {
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  fr: number;
  px: number;
  py: number;
}

interface RisenLook {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  x: number;
  y: number;
  ph: number;
  /** Seconds since it rose (its swell), and its lunge's pull (0…1, eased back). */
  t: number;
  pull: number;
  tx: number;
  ty: number;
  base: number;
}

export class Legends4View {
  private a: Arena;
  private sc: Phaser.Scene;
  private img: (x: number, y: number, key: string, under?: boolean | 'back') => Phaser.GameObjects.Image;
  private every: (key: string, gap: number) => boolean;
  private birds = new Map<Swoop, Bird>();
  private risen = new Map<Risen, RisenLook>();
  private rings = new Map<Pizza, Phaser.GameObjects.Image>();

  constructor(arena: Arena, img: Legends4View['img'], every: Legends4View['every']) {
    this.a = arena;
    this.sc = arena.sc;
    this.img = img;
    this.every = every;
    ensure4(this.sc);
  }

  // ════════════════════════════ Pigeon King's Catch ════════════════════════════

  swoopIn(s: Swoop): void {
    const a = this.a;
    const b: Bird = {
      img: this.img(s.x0, s.y0, 'pk_pigeon0').setScale(1.5).setFlipX(s.side > 0),
      shadow: this.img(s.x0, s.y0, 'glow', true).setTint(0x000000).setAlpha(0),
      fr: 0,
      px: s.x0,
      py: s.y0,
    };
    this.birds.set(s, b);
    a.sfx('sfx_pigeonking_coo', { volume: s.light ? 0.45 : 0.65, throttle: 250 });
    a.sfx('sfx_hero_wings', { volume: s.light ? 0.4 : 0.6, throttle: 200 });
    // the foot it's after flinches
    s.f.flash(0xe8ecff, 80);
  }

  /** The pigeon's place along its swoop (u: 0…1): in high from the side and down onto the foot's ankle, beating its
   *  wings, then talons out for the last stretch. */
  swoopAt(s: Swoop): void {
    const b = this.birds.get(s);
    if (!b || !b.img.active) return;
    const u = s.u;
    // a curve: in level, then dropping onto the foot
    const cx = s.x0 + (s.x1 - s.x0) * 0.55;
    const cy = Math.min(s.y0, s.y1) - 40;
    const x = (1 - u) * (1 - u) * s.x0 + 2 * (1 - u) * u * cx + u * u * s.x1;
    const y = (1 - u) * (1 - u) * s.y0 + 2 * (1 - u) * u * cy + u * u * (s.y1 - 26);
    const dir = s.side < 0 ? 1 : -1;
    const ang = Math.atan2(y - b.py, (x - b.px) * dir || 1e-3);
    b.px = x;
    b.py = y;
    // (wings beating, quicker as it closes; talons out, wings up for the last fifth)
    b.fr = (b.fr + 0.55) % 4;
    const fr = u > 0.8 ? 4 : Math.floor(b.fr);
    b.img.setTexture(`pk_pigeon${fr}`).setPosition(x, y).setRotation(dir * Math.max(-0.5, Math.min(0.6, ang)) * 0.6);
    b.shadow.setPosition(x, s.f.y + 10).setScale(0.6, 0.15).setAlpha(0.18 * u);
    if (crand() < 0.25) this.a.fx.propTrail(x - dir * 40, y + 10, 0xd2d6e4, 0.35);
  }

  /** The foot got away (or was gone): the pigeon pulls up and flies off over the far side. */
  swoopMiss(s: Swoop): void {
    const b = this.birds.get(s);
    this.birds.delete(s);
    if (!b) return;
    const dir = s.side < 0 ? 1 : -1;
    this.a.sfx('sfx_pigeonking_coo', { volume: 0.4, rate: 1.2, throttle: 250 });
    b.shadow.destroy();
    let fr = 0;
    const flap = this.sc.time.addEvent({ delay: 60, repeat: 14, callback: () => b.img.active && b.img.setTexture(`pk_pigeon${(fr = (fr + 1) % 4)}`) });
    this.sc.tweens.add({ targets: b.img, x: b.img.x + dir * 700, y: -120, rotation: -dir * 0.4, duration: 900, ease: 'Quad.In', onComplete: () => { flap.remove(); b.img.destroy(); } });
  }

  /** The talons close on the foot (it's beaten: a kill): feathers burst, then the pigeon labours up and away with it,
   *  off the far top corner, the foot swinging under it. The foot's death is this flight (its own yank stopped); it's
   *  destroyed when it's gone. */
  carryOff(s: Swoop): void {
    const a = this.a;
    const f = s.f;
    const b = this.birds.get(s);
    this.birds.delete(s);
    const look = legendLook('pigeoncatch');
    const light = s.light;
    const gx = s.x1;
    const gy = s.y1;
    a.sfx('sfx_smack_fur_heavy', { volume: light ? 0.5 : 0.7 });
    a.sfx('sfx_pigeonking_flock', { volume: light ? 0.35 : 0.55, throttle: 600 });
    a.shake(light ? 60 : 110, light ? 0.002 : 0.004);
    a.fx.ring(gx, gy, look.col, 1.4, 0.6);
    for (let i = 0; i < (light ? 5 : 10); i++) this.feather(gx + (crand() - 0.5) * 40, gy + (crand() - 0.5) * 30, true);
    if (this.every('snatched', 0.6)) a.quip(gx, Math.max(150, gy - 150), 'SNATCHED!', look.css, 42);
    // the carry, on the game clock (it's the foot's last move: it's destroyed when it's off the screen)
    const root = f.root;
    if (!root.active) {
      b?.img.destroy();
      b?.shadow.destroy();
      return;
    }
    this.sc.tweens.killTweensOf(root);
    const dir = s.side < 0 ? 1 : -1;
    const x0 = root.x;
    const y0 = root.y;
    const r0 = root.rotation;
    // (out over the far top corner)
    const x1 = dir > 0 ? Math.max(x0 + 420, W * 0.75) : Math.min(x0 - 420, W * 0.25);
    const y1 = -f.meta.footHeight * f.scale - 160;
    const bx0 = b ? b.img.x : x0;
    const by0 = b ? b.img.y : gy - 26;
    let fr = 0;
    let fx = 0;
    if (b) b.shadow.destroy();
    clockOf(this.sc).tween({
      from: 0,
      to: 1,
      duration: 1050,
      ease: 'Sine.In',
      onUpdate: (tw) => {
        const u = tw.getValue() ?? 0;
        // (a laboured climb: it dips under the weight first, then hauls up and away)
        const dip = Math.sin(Math.min(1, u * 3) * Math.PI) * 30;
        const px = bx0 + (x1 - bx0) * u;
        const py = by0 + (y1 - 120 - by0) * u * u + dip;
        if (b?.img.active) {
          fr = (fr + 0.7) % 4;
          b.img.setTexture(`pk_pigeon${Math.floor(fr)}`).setPosition(px, py).setRotation(-dir * 0.35 * Math.min(1, u * 2));
        }
        if (root.active) {
          // the foot hangs from its talons and swings
          const sw = Math.sin(u * 9) * 0.22 * (1 - u * 0.5);
          root.setPosition(x0 + (px - bx0), y0 + (py - by0));
          root.setRotation(r0 + sw - dir * 0.2 * u);
        }
        fx += 1;
        if (fx % 9 === 0 && crand() < 0.6) this.feather(px, py + 20, false);
      },
      onComplete: () => {
        b?.img.destroy();
        f.destroy();
      },
    });
  }

  /** A feather off the pigeon: burst out, or drifting down, rocking. */
  private feather(x: number, y: number, burst: boolean): void {
    const fe = this.img(x, y, 'pk_feather').setScale(0.6 + crand() * 0.4).setRotation(crand() * 6);
    const vx = (crand() - 0.5) * (burst ? 260 : 60);
    const fall = burst ? 120 + crand() * 160 : 220 + crand() * 160;
    this.sc.tweens.add({ targets: fe, x: x + vx, y: y + fall, angle: fe.angle + (crand() - 0.5) * 220, alpha: 0, duration: burst ? 900 + crand() * 400 : 1600 + crand() * 600, ease: 'Sine.Out', onComplete: () => fe.destroy() });
  }

  // ════════════════════════════ Second Rise ════════════════════════════

  /** The dough copy of a foot's picture (made once per picture). */
  private doughKey(key: string): string {
    const k = `pk_dough_${key}`;
    if (!this.sc.textures.exists(k) && this.sc.textures.exists(key)) {
      const src = this.sc.textures.get(key).getSourceImage() as HTMLCanvasElement;
      this.sc.textures.addCanvas(k, doughCopy(src, hashStr(key)));
    }
    return this.sc.textures.exists(k) ? k : 'pk_doughjaw';
  }

  /** Make the dough copy of one picture not made yet among these feet (ordinary ones: only they rise), at most one a
   *  frame. */
  warmDough(feet: readonly Foot[]): void {
    for (const f of feet) {
      if (!f.alive || f.isBossLike) continue;
      const key = f.meta.footKey;
      if (this.sc.textures.exists(`pk_dough_${key}`)) continue;
      this.doughKey(key);
      return;
    }
  }

  /** The highest a risen foot floats down to: above every pie (their faces and labels stay clear). */
  private floor(): number {
    let top = Infinity;
    for (const p of this.a.alivePizzas()) top = Math.min(top, p.surfaceY - p.radius);
    return top === Infinity ? 620 : top - 150;
  }

  rise(r: Risen, f: Foot, pies: Pizza[]): void {
    const a = this.a;
    const x = f.x;
    const y = Math.max(420, Math.min(f.y + 120, this.floor()));
    const img = this.img(x, y, this.doughKey(r.key)).setOrigin(0.5, r.originY).setScale(r.scale * 0.4, r.scale * 0.2).setAlpha(0);
    const glow = this.img(x, y - 40, 'glow', true).setTint(0xffd08a).setBlendMode(ADD).setAlpha(0).setScale(1.4);
    const L: RisenLook = { img, glow, x, y, ph: crand() * 6, t: 0, pull: 0, tx: x, ty: y, base: r.scale * 0.8 };
    this.risen.set(r, L);
    a.sfx('sfx_doughboy_rise', { volume: r.light ? 0.4 : 0.6, throttle: 250 });
    a.fx.puff(x, y - 20, r.light ? 3 : 6);
    for (let i = 0; i < (r.light ? 3 : 6); i++) {
      const fl = this.img(x + (crand() - 0.5) * 60, y - 10, 'pk_flour').setBlendMode(ADD).setScale(1.5 + crand() * 1.5).setAlpha(0.9);
      this.sc.tweens.add({ targets: fl, y: fl.y - 60 - crand() * 60, x: fl.x + (crand() - 0.5) * 60, alpha: 0, scale: 3, duration: 700 + crand() * 300, onComplete: () => fl.destroy() });
    }
    if (this.every('risen', 1.2)) a.quip(x, Math.max(150, y - 220), 'SECOND RISE!', legendLook('secondrise').css, 38);
    if (this.every('riseFired', 0.8)) for (const p of pies) p.perkFired({ quip: false });
  }

  /** Every frame: the risen float (bobbing, breathing like proving dough) beside the foot they're after, swell up as
   *  they rise and sag as their time runs out. */
  risenStep(list: readonly Risen[], dt: number): void {
    const fl = this.floor();
    for (const r of list) {
      const L = this.risen.get(r);
      if (!L || !L.img.active) continue;
      L.t += dt;
      L.pull = Math.max(0, L.pull - dt * 4);
      // (beside where it last bit and below it, between the feet and the pies: low enough to show whole)
      const side = L.x < W / 2 ? 1 : -1;
      const hx = r.ax + side * 170;
      const hy = Math.max(420, Math.min(fl, r.ay + 200));
      L.x += (hx - L.x) * Math.min(1, dt * 2.5);
      L.y += (hy - L.y) * Math.min(1, dt * 2.5);
      const bob = Math.sin(L.t * 3 + L.ph) * 8;
      const x = L.x + (L.tx - L.x) * L.pull;
      const y = Math.min(fl, L.y + bob + (L.ty - L.y) * L.pull);
      // the swell as it rises (overshoot, settle), its breathing, and its sag at the end
      const sw = L.t < 0.45 ? Phaser.Math.Easing.Back.Out(L.t / 0.45) : 1;
      const br = 1 + 0.04 * Math.sin(L.t * 2.2 + L.ph);
      const left = ACT4.riseFor - r.age;
      const sag = left < 0.8 ? left / 0.8 : 1;
      const sx = L.base * sw * br * (1 + 0.08 * L.pull) * (0.85 + 0.15 * sag);
      const sy = L.base * sw * (2 - br) * (1 - 0.1 * L.pull) * (0.6 + 0.4 * sag);
      L.img.setPosition(x, y).setScale(sx, sy).setAlpha(Math.min(0.94, L.t * 4) * (0.5 + 0.5 * sag)).setRotation(Math.sin(L.t * 1.7 + L.ph) * 0.08 - side * 0.1 * L.pull);
      L.glow.setPosition(x, y - 50).setAlpha(0.28 * Math.min(1, L.t * 3) * sag).setScale(1.5 * L.base * 4);
    }
  }

  /** A bite coming: the risen lunges at its foot. */
  lunge(r: Risen, f: Foot): void {
    const L = this.risen.get(r);
    if (!L) return;
    L.tx = f.cx;
    L.ty = Math.max(420, Math.min(this.floor(), f.y + 140));
    L.pull = 0.75;
  }

  /** The bite lands: dough jaws snap shut on the foot, flour flies. */
  chomp(r: Risen, f: Foot): void {
    const a = this.a;
    const x = f.cx;
    const y = f.cy;
    const up = this.img(x, y - 34, 'pk_doughjaw').setScale(0.7).setAlpha(0.95);
    const dn = this.img(x, y + 34, 'pk_doughjaw').setScale(0.7, -0.7).setAlpha(0.95);
    this.sc.tweens.add({ targets: up, y: y - 6, duration: 90, ease: 'Quad.In' });
    this.sc.tweens.add({ targets: dn, y: y + 6, duration: 90, ease: 'Quad.In' });
    this.sc.tweens.add({ targets: [up, dn], alpha: 0, scaleX: 0.85, delay: 160, duration: 220, onComplete: () => { up.destroy(); dn.destroy(); } });
    a.sfx('sfx_poltergeist_bite', { volume: r.light ? 0.35 : 0.5, throttle: 120 });
    a.sfx('sfx_smack_dough_1', { volume: r.light ? 0.3 : 0.45, throttle: 120 });
    a.fx.puff(x, y, r.light ? 1 : 3);
    if (this.every('chomp', 0.9)) a.quip(x + (crand() - 0.5) * 40, y - 130, 'CHOMP!', '#ffe6b0', 32);
  }

  /** Its time's up (or the wave's over): it sags and slumps away in a puff of flour. */
  sink(r: Risen, quick: boolean): void {
    const L = this.risen.get(r);
    this.risen.delete(r);
    if (!L) return;
    const a = this.a;
    if (!quick) a.sfx('sfx_doughboy_splat', { volume: r.light ? 0.25 : 0.4, throttle: 300 });
    a.fx.puff(L.img.x, L.img.y - 30, quick ? 2 : 4);
    this.sc.tweens.add({ targets: L.img, scaleY: L.img.scaleY * 0.2, scaleX: L.img.scaleX * 1.3, alpha: 0, y: L.img.y + 30, duration: quick ? 220 : 380, ease: 'Quad.In', onComplete: () => L.img.destroy() });
    this.sc.tweens.add({ targets: L.glow, alpha: 0, duration: 300, onComplete: () => L.glow.destroy() });
  }

  // ════════════════════════════ Cathedral Crust ════════════════════════════

  /** Where a pizza's stone ring sits: round its plate, under it. */
  private ringAt(p: Pizza): [number, number, number] {
    // (the ring's inner edge, 126 of its 320 px, just outside the plate)
    const k = (p.radius * 1.12) / 126;
    return [p.x, p.surfaceY + 4, k];
  }

  /** A wave starts: each pizza settles into its ring of stone, dust rising, a grind of stone (once). */
  stoneSettle(ps: Pizza[], light: boolean): void {
    const a = this.a;
    a.sfx('sfx_gargoyle_stone', { volume: light ? 0.3 : 0.45, rate: 0.8, throttle: 500 });
    for (const p of ps) {
      const [x, y, k] = this.ringAt(p);
      const ring = this.ring(p);
      ring.setPosition(x, y + 30).setScale(k, k * 0.6).setAlpha(0);
      this.sc.tweens.add({ targets: ring, y, scaleY: k, alpha: 1, duration: 420, ease: 'Back.Out' });
      for (let i = 0; i < (light ? 2 : 4); i++) a.fx.puff(x + (crand() - 0.5) * p.radius * 2.2, y + 10, 2);
    }
  }

  private ring(p: Pizza): Phaser.GameObjects.Image {
    let r = this.rings.get(p);
    if (!r || !r.active) {
      r = this.img(p.x, p.surfaceY, 'pk_stonering', 'back');
      this.rings.set(p, r);
    }
    return r;
  }

  /** Every frame: each pizza's stone, while it has a stone stomp left (dimmed while no Cathedral Crust grants). */
  stoneShells(ps: Pizza[], on: boolean): void {
    for (const [p, r] of this.rings) {
      if (!r.active) {
        this.rings.delete(p);
        continue;
      }
      if (p.dead || !ps.includes(p) || !(Number(p.flags.stoneLeft ?? 0) > 0)) {
        if (!this.sc.tweens.isTweening(r)) {
          this.rings.delete(p);
          this.sc.tweens.add({ targets: r, alpha: 0, duration: 200, onComplete: () => r.destroy() });
        }
        continue;
      }
      if (this.sc.tweens.isTweening(r)) continue;
      const [x, y, k] = this.ringAt(p);
      r.setPosition(x, y).setScale(k).setAlpha(on ? 1 : 0.45);
    }
  }

  /** The stomp meets the stone: a CLANG, the foot greys over (turned to stone), the ring cracks and bursts in chips
   *  and stained glass, the rose window's light flashes across the table and the bell tolls. */
  stoneBlock(f: Foot, p: Pizza, src: Pizza, left: number, stoned: boolean, light: boolean): void {
    const a = this.a;
    const look = legendLook('cathedralcrust');
    const [x, y, k] = this.ringAt(p);
    src.perkFired({ quip: false });
    p.stoneFlash(light ? 650 : 1100);
    a.sfx('sfx_smack_stone_heavy', { volume: light ? 0.6 : 0.85 });
    a.sfx('sfx_gargoyle_stonecrack', { volume: light ? 0.45 : 0.65, throttle: 120 });
    this.sc.time.delayedCall(110, () => a.sfx('sfx_gargoyle_stonebreak', { volume: light ? 0.4 : 0.6, throttle: 150 }));
    if (this.every('bell', 1.2)) this.sc.time.delayedCall(180, () => a.sfx('sfx_soleprop_bell', { volume: light ? 0.3 : 0.5 }));
    a.shake(light ? 90 : 160, light ? 0.003 : 0.005);
    a.fx.ring(x, y - 20, 0xcfc6b4, 2.4, 0.4);
    a.fx.ring(f.cx, p.surfaceY - 60, 0xffffff, 1.4, 0.5);
    // the ring cracks and bursts (a stone left: it cracks and stays)
    const ring = this.rings.get(p);
    if (ring?.active) {
      this.sc.tweens.killTweensOf(ring);
      if (left <= 0) {
        this.rings.delete(p);
        this.sc.tweens.add({ targets: ring, scaleX: k * 1.12, scaleY: k * 1.2, alpha: 0, duration: 260, ease: 'Quad.Out', onComplete: () => ring.destroy() });
      } else {
        ring.setScale(k * 1.06);
        this.sc.tweens.add({ targets: ring, scaleX: k, scaleY: k, duration: 200 });
      }
    }
    const n = light ? 8 : 16;
    for (let i = 0; i < n; i++) {
      const ang = Math.PI + crand() * Math.PI;
      const sp = 160 + crand() * 280;
      const side = crand() < 0.5 ? -1 : 1;
      const sx = x + side * p.radius * (0.9 + crand() * 0.3);
      const key = i % 3 === 0 ? `pk_glass${Math.floor(crand() * GLASS.length)}` : 'pk_stonechip';
      const chip = this.img(sx, y - 10, key).setScale(0.6 + crand() * 0.6).setRotation(crand() * 6);
      this.sc.tweens.add({ targets: chip, x: sx + side * Math.abs(Math.cos(ang)) * sp * 0.6, y: y - 10 + Math.sin(ang) * sp * 0.45 + 90, angle: (crand() - 0.5) * 420, alpha: 0, duration: 620 + crand() * 300, ease: 'Quad.Out', onComplete: () => chip.destroy() });
    }
    for (let i = 0; i < (light ? 2 : 5); i++) a.fx.puff(f.x + (crand() - 0.5) * 120, p.surfaceY - 30, 2);
    // the rose window's light, flashing across the table behind the pie
    const rose = this.img(p.x, p.surfaceY - p.radius * 0.9, 'pk_rosewindow', 'back').setBlendMode(ADD).setScale(0.2).setAlpha(0.9);
    this.sc.tweens.add({ targets: rose, scale: (p.radius * 2.8) / 220, alpha: 0, angle: 30, duration: 700, ease: 'Quad.Out', onComplete: () => rose.destroy() });
    for (let i = 0; i < (light ? 2 : 4); i++) {
      const sh = this.img(p.x + (i - 1.5) * p.radius * 0.7, p.surfaceY + 20, 'pk_lightshaft', 'back').setOrigin(0.5, 1).setBlendMode(ADD).setAlpha(0).setScale(1.2, 0.4).setRotation(0.25);
      this.sc.tweens.add({ targets: sh, alpha: 0.85, scaleY: 1.4, duration: 160, delay: i * 40, yoyo: true, hold: 120, onComplete: () => sh.destroy() });
    }
    // the foot turned to stone: a pale flash, then grey while it stands stunned (a boss is only blocked)
    if (stoned) {
      f.flash(0xe8e0d0, 110);
      // (held grey while it stands there, after the knock's own flash has cleared; then its own tint back)
      const was = f.tintNow();
      const clock = clockOf(this.sc);
      for (const ms of [130, 300, 600, 1000]) clock.after(ms, () => f.alive && f.stunT > 0 && f.tint(0x9a968e));
      clock.after(1600, () => f.alive && f.tint(was));
    }
    a.quip(f.x, p.surfaceY - 160, left > 0 ? `SET IN STONE! ${left} LEFT` : 'SET IN STONE!', look.css, 44);
  }

  /** The wave closes: the stone comes off every pizza. */
  stoneOff(): void {
    for (const r of this.rings.values()) {
      if (!r.active) continue;
      this.sc.tweens.killTweensOf(r);
      this.sc.tweens.add({ targets: r, alpha: 0, y: r.y + 20, duration: 300, onComplete: () => r.destroy() });
    }
    this.rings.clear();
  }

  // ——— the scene ———

  clear(): void {
    for (const b of this.birds.values()) {
      b.img.destroy();
      b.shadow.destroy();
    }
    this.birds.clear();
    for (const L of this.risen.values()) {
      L.img.destroy();
      L.glow.destroy();
    }
    this.risen.clear();
    for (const r of this.rings.values()) r.destroy();
    this.rings.clear();
  }
}
