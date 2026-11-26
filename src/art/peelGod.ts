// Living god peels (a crafted kind, 'god': src/art/peelCraft.ts runs them). No frame, no window: the head IS the god's
// symbol (or helm, or the God Peel's sun), carved in marble and gold or in oak and iron (src/art/godShapes.ts,
// src/art/godHeads.ts), and it comes alive from its own parts, which the heads' drawing code paints one at a time
// (src/art/godParts.ts): Hera's train fans and shivers, Hermes's and Nike's wings beat, Demeter's wheat sways, the
// lyre and the harp are plucked, Artemis draws her bow, Hephaestus's hammer strikes the anvil, the hearth's flame
// flickers, the owl looks about and blinks, Baldur's sun and Skadi's snowflake turn, Njord's sail fills, Kratos's crest
// and Leonidas's cloak stream, the God Peel's halo floats over turning rays while its crown of tiny peels hops.
// What every god shares: on the Greek heads a light runs over the gold relief now and then and the gems breathe and
// glint; on the Norse heads the runes light in sequence. Each god's domain plays on and round the head, from the hero
// kind's effects (src/art/peelHero.ts: arcs, sparkles, rings, wisps, emitters, a bolt from above) and the gods' own
// (rays of light, ravens, illusions, sea water and caustics, sound from a horn, threads of fate). A smack lands in the
// god's style (no comic words: this is myth): the head flashes in the god's colour, the gold or the runes blaze, and
// the god answers (a thunderclap on the hammer, a splash off the trident, the anvil struck, a horn blast, the train
// flared). Everything cosmetic uses crand(). Myth figures are public domain; every look is the game's own.

import { PEEL_HEAD, type PeelShape } from './peelArt';
import { INK } from './feetCommon';
import { ellipse, mix, rgba, shade, type Ctx } from './util';
import { crand } from '../systems/cosmeticRandom';
import { noise1 } from '../game/liveKit';
import { save } from '../systems/save';
import { GRAPES, HARP_STRINGS, LYRE_STRINGS, POM_SEEDS, RUNES, runeAt } from './godShapes';
import { godCrownAt, GOD_CROWN } from './godHeads';
import { paintPart, type GemMark, type PartsSeen, type RuneMark } from './godParts';
import { Arcs, Emitter, Every, HERO_FEEL, Rings, Sparkle, Strike, Wisps, cropLayer, glowDot, lighter, pointAt, type At, type Burst, type EmitO, type Fx, type FxHost, type HeroEmit, type HeroFeel, type HeroGlow, type HeroSpr, type Lyr } from './peelHero';
import { drawPeelHandle, type PeelLook } from './peelArt';

const { x: HX, y: HY, r: R } = PEEL_HEAD;
const TAU = Math.PI * 2;
const reduced = () => !!save.settings.reducedMotion;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const rnd = (a: number, b: number) => a + crand() * (b - a);
type P = [number, number];

/** The box a god's surface covers (peel units): the head and what plays round it. Kratos's chain and Leonidas's cloak
 *  reach further down the handle. */
const BOX = { x: 0, y: 0, w: 220, h: 236 };
const TALL = { x: 0, y: 0, w: 220, h: 360 };

// ════════════════════════════ the spec ════════════════════════════

/** One of a god's effects: the hero kind's, plus (optionally) drawing one of the head's moving layers itself. */
export interface GodFx extends Fx {
  /** Draw the layer `key` (moved as this effect moves it); true when it did. */
  layer?(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean;
}

export interface GodSpec {
  /** The head's layers in the order they're drawn: 'base' is the head without its moving pieces. */
  layers?: string[];
  /** Its surface's box, when not the usual. */
  box?: typeof BOX;
  /** The god's colour (its smack flash and the glow behind). */
  col: string;
  /** A light runs over the gold relief now and then (the Greek heads); the gems breathe and glint. */
  gold?: boolean;
  gems?: boolean;
  /** The runes light in sequence (the Norse heads). */
  runes?: boolean;
  fx?: () => GodFx[];
  burst: Burst[];
  feel?: Partial<HeroFeel>;
  /** How strongly the head flashes in the god's colour on a smack. */
  flash?: number;
  /** The handle is painted into the head's base layer too, over a part behind it (Ghost of Sparta's flames lick up
   *  behind the handle). */
  handleInBase?: boolean;
}

// ════════════════════════════ the gods' own effects ════════════════════════════

const drawL = (ctx: Ctx, l: Lyr) => ctx.drawImage(l.c, l.x, l.y, l.w, l.h);

/** Draw a layer turned by `a` about (px, py). */
function turned(ctx: Ctx, l: Lyr, px: number, py: number, a: number): void {
  if (Math.abs(a) < 1e-4) return drawL(ctx, l);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(a);
  ctx.translate(-px, -py);
  drawL(ctx, l);
  ctx.restore();
}

/** A layer in the god's colour, added over what's there (a flash where it's painted). */
function flashLayer(L: GodLive, ctx: Ctx, l: Lyr, col: string, a: number): void {
  if (a <= 0.01) return;
  const [sc, sx] = L.scratch('flash', l.c.width, l.c.height);
  sx.setTransform(1, 0, 0, 1, 0, 0);
  sx.globalCompositeOperation = 'source-over';
  sx.clearRect(0, 0, sc.width, sc.height);
  sx.drawImage(l.c, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = col;
  sx.fillRect(0, 0, sc.width, sc.height);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(sc, l.x, l.y, l.w, l.h);
  ctx.restore();
}

/** A band of light (or a gradient of colours) swept across a layer, only where it's painted: u runs -0.3 → 1.3. */
function sweepLayer(L: GodLive, ctx: Ctx, l: Lyr, u: number, cols: string[], a: number, w = 0.16, slant = 0.6, op: GlobalCompositeOperation = 'lighter'): void {
  if (a <= 0.01 || u < -0.35 || u > 1.35) return;
  const RR = l.c.width / l.w;
  const [sc, sx] = L.scratch('sweep', l.c.width, l.c.height);
  sx.setTransform(1, 0, 0, 1, 0, 0);
  sx.globalCompositeOperation = 'source-over';
  sx.clearRect(0, 0, sc.width, sc.height);
  sx.drawImage(l.c, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  const W0 = sc.width;
  const H0 = sc.height;
  const x = u * (W0 + H0 * slant) - H0 * slant * 0.5;
  const g = sx.createLinearGradient(x - W0 * w, H0 * 0.5 - (W0 * w) / slant, x + W0 * w, H0 * 0.5 + (W0 * w) / slant);
  g.addColorStop(0, rgba(cols[0], 0));
  cols.forEach((c, i) => g.addColorStop(0.25 + (0.5 * i) / Math.max(1, cols.length - 1), rgba(c, a)));
  g.addColorStop(1, rgba(cols[cols.length - 1], 0));
  sx.fillStyle = g;
  sx.fillRect(0, 0, W0, H0);
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.drawImage(sc, l.x, l.y, l.w, l.h);
  ctx.restore();
  void RR;
}

/** Wings (or ears of wheat, leaves) beating about their roots: a gentle idle, now and then a few strong beats, a
 *  flurry on a smack, and a swing lifts them. `up` turns each so its tip rises. */
class Flap implements GodFx {
  private beat = new Every(2.4, 4.6, 1.3);
  private p = -1;
  private boost = 0;
  constructor(private o: { keys: [string, string]; piv: [P, P]; amp: number; idle?: number; hz?: number }) {}
  update(L: GodLive, dt: number): void {
    this.p = this.beat.tick(dt);
    this.boost *= Math.exp(-dt / 0.6);
    void L;
  }
  private ang(L: GodLive): number {
    const o = this.o;
    const calm = reduced() ? 0.35 : 1;
    const hz = o.hz ?? 3.2;
    let a = (o.idle ?? 0.05) * (0.5 + 0.5 * Math.sin(L.t * 1.6));
    if (this.p >= 0) a += o.amp * (0.5 + 0.5 * Math.sin(this.p * Math.PI * 2 * hz - Math.PI / 2)) * Math.sin(this.p * Math.PI);
    a += this.boost * o.amp * 1.3 * (0.5 + 0.5 * Math.sin(L.t * 22));
    a += clamp(L.speed / 1200, 0, 0.6) * o.amp * 0.6;
    // (only up from rest: beating down, the tips would leave the peel's frame)
    return Math.max(-0.015, a) * calm;
  }
  layer(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    const i = this.o.keys.indexOf(key);
    if (i < 0) return false;
    const a = this.ang(L);
    const [px, py] = this.o.piv[i];
    turned(ctx, l, px, py, i === 0 ? a : -a);
    return true;
  }
  smack(): void {
    this.boost = 1;
    this.beat.fire();
  }
}

/** Layers swaying about their roots on the breeze (wheat, a leaf, the bunch of grapes), each a little out of step. */
class Sway implements GodFx {
  private gust = new Every(2.5, 4.5, 1.6);
  private g = 0;
  private kick = 0;
  private kv = 0;
  constructor(private o: { keys: string[]; piv: P[]; amp: number; hz?: number; gust?: number; kick?: number }) {}
  update(L: GodLive, dt: number): void {
    const p = this.gust.tick(dt);
    this.g = p >= 0 ? Math.sin(p * Math.PI) : 0;
    this.kv += (-this.kick * 90 - this.kv * 5) * dt;
    this.kick += this.kv * dt;
    void L;
  }
  layer(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    const i = this.o.keys.indexOf(key);
    if (i < 0) return false;
    const o = this.o;
    const calm = reduced() ? 0.35 : 1;
    const hz = o.hz ?? 1.3;
    const a = (o.amp * (Math.sin(L.t * hz + i * 1.3) + 0.4 * Math.sin(L.t * hz * 2.3 + i)) + this.g * (o.gust ?? o.amp * 1.5) * Math.sin(L.t * 5 + i)) * calm + this.kick * (o.kick ?? 0.12) + clamp(-L.vx * 0.00015, -0.12, 0.12);
    const [px, py] = o.piv[Math.min(i, o.piv.length - 1)];
    turned(ctx, l, px, py, a);
    return true;
  }
  smack(): void {
    this.kv += 7;
  }
}

/** Hera's train: seven feathers about their root, breathing open and shut, now and then a rattling shiver; a smack
 *  flares it wide. The eyes shimmer, teal to blue to gold. */
class Fan implements GodFx {
  private shiver = new Every(3, 5.5, 0.9);
  private p = -1;
  private flare = 0;
  private eyeT = 0;
  update(_L: GodLive, dt: number): void {
    this.p = this.shiver.tick(dt);
    this.flare *= Math.exp(-dt / 0.5);
    this.eyeT += dt;
  }
  layer(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key[0] !== 'f') return false;
    const i = Number(key.slice(1)) - 3;
    const calm = reduced() ? 0.35 : 1;
    const open = 0.04 * Math.sin(L.t * 1.1) + 0.07 * this.flare;
    const sh = this.p >= 0 ? 0.03 * Math.sin(this.p * 90 + i * 2) * Math.sin(this.p * Math.PI) : 0;
    turned(ctx, l, HX, 176, (i * open + sh) * calm);
    return true;
  }
  front(L: GodLive, ctx: Ctx): void {
    // the eyes' sheen, each in turn
    const open = 0.04 * Math.sin(L.t * 1.1) + 0.07 * this.flare;
    lighter(ctx, () => {
      for (let i = -3; i <= 3; i++) {
        const ang = -Math.PI / 2 + i * 0.27 + i * open * (reduced() ? 0.35 : 1);
        const x = HX + Math.cos(ang) * 134;
        const y = 176 + Math.sin(ang) * 134;
        const k = 0.5 + 0.5 * Math.sin(this.eyeT * 1.8 - i * 0.9);
        const col = k > 0.66 ? '#ffe27a' : k > 0.33 ? '#7ae0ff' : '#5fd0c0';
        glowDot(ctx, x, y + 1, 15, col, 0.2 + 0.55 * k * k + this.flare * 0.4);
      }
    });
  }
  smack(): void {
    this.flare = 1;
    this.shiver.fire();
  }
}

/** A flame (the hearth's): it leans and stretches about its base, licking up. */
class Flicker implements GodFx {
  private surge = 0;
  constructor(private o: { key: string; base: P; amt?: number }) {}
  update(_L: GodLive, dt: number): void {
    this.surge *= Math.exp(-dt / 0.4);
  }
  layer(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key !== this.o.key) return false;
    const [bx, by] = this.o.base;
    const calm = reduced() ? 0.35 : 1;
    const t = L.t;
    const amt = this.o.amt ?? 1;
    const k = 1 + (0.05 * noise1(t * 6) + 0.035 * Math.sin(t * 10.3)) * calm * amt + this.surge * 0.16;
    ctx.save();
    ctx.translate(bx, by);
    ctx.transform(1 / Math.sqrt(k), 0, (0.05 * noise1(t * 4 + 5) - clamp(L.vx * 0.00005, -0.08, 0.08)) * calm * amt, k, 0, 0);
    ctx.translate(-bx, -by);
    drawL(ctx, l);
    ctx.restore();
    return true;
  }
  smack(): void {
    this.surge = 1;
  }
}

/** A layer turning about its centre (the God Peel's gold rays and sunburst), or (with `spring`) rocking to and fro
 *  and springing back after a smack's spin, so a carved, lit part keeps its light from the top left (Baldur's rays,
 *  Skadi's snowflake). */
class Spin implements GodFx {
  private a = 0;
  private v = 0;
  constructor(private o: { key: string; c: P; rate: number; kick?: number; rock?: number; spring?: boolean; alpha?: number }) {}
  update(_L: GodLive, dt: number): void {
    if (this.o.spring) {
      // a spring back to rest, lightly damped
      const n = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let i = 0; i < n; i++) {
        this.v += (-this.a * 26 - this.v * 3.2) * (dt / n);
        this.a += this.v * (dt / n);
      }
      return;
    }
    this.v *= Math.exp(-dt / 0.7);
    this.a += dt * (this.o.rate * (reduced() ? 0.35 : 1) + this.v);
  }
  layer(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key !== this.o.key) return false;
    ctx.save();
    if (this.o.alpha !== undefined) ctx.globalAlpha *= this.o.alpha;
    const rock = this.o.rock ? this.o.rock * (Math.sin(L.t * 0.8) + 0.3 * Math.sin(L.t * 1.9)) * (reduced() ? 0.35 : 1) : 0;
    turned(ctx, l, this.o.c[0], this.o.c[1], this.a + rock);
    ctx.restore();
    return true;
  }
  smack(): void {
    this.v = this.o.kick ?? 3;
  }
}

/** A layer beating like a heart about a point (Aphrodite's pearl), or swelling and settling on a smack. */
class Beat implements GodFx {
  private f = 0;
  constructor(private o: { key: string; c: P; hz?: number; amt?: number }) {}
  update(_L: GodLive, dt: number): void {
    this.f *= Math.exp(-dt / 0.3);
  }
  layer(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key !== this.o.key) return false;
    const ph = (L.t * (this.o.hz ?? 1.05)) % 1;
    const b = Math.max(Math.exp(-Math.pow((ph - 0.1) / 0.05, 2)), 0.7 * Math.exp(-Math.pow((ph - 0.28) / 0.05, 2)));
    const s = 1 + (this.o.amt ?? 0.08) * b * (reduced() ? 0.35 : 1) + 0.12 * this.f;
    const [cx, cy] = this.o.c;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    drawL(ctx, l);
    ctx.restore();
    if (b > 0.05 || this.f > 0.02) lighter(ctx, () => glowDot(ctx, cx, cy - 4, 30, '#ffb0d8', 0.25 * b + 0.4 * this.f));
    return true;
  }
  smack(): void {
    this.f = 1;
  }
}

/** Athena's owl looking about: its pupils dart side to side and settle; on a smack they snap wide to the front. */
class Look implements GodFx {
  private x = 0;
  private tx = 0;
  private y = 0;
  private ty = 0;
  private next = rnd(0.8, 2);
  constructor(private key: string) {}
  update(_L: GodLive, dt: number): void {
    this.next -= dt;
    if (this.next <= 0) {
      this.next = rnd(0.9, 2.6);
      const r = crand();
      this.tx = r < 0.35 ? -4 : r < 0.7 ? 4 : 0;
      this.ty = crand() < 0.3 ? -2 : 0.5;
    }
    const k = Math.min(1, dt * 18);
    this.x += (this.tx - this.x) * k;
    this.y += (this.ty - this.y) * k;
  }
  layer(_L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key !== this.key) return false;
    const c = reduced() ? 0.5 : 1;
    ctx.save();
    ctx.translate(this.x * c, this.y * c);
    drawL(ctx, l);
    ctx.restore();
    return true;
  }
  smack(): void {
    this.tx = this.x = 0;
    this.ty = this.y = 0;
    this.next = 0.8;
  }
}

/** Eyelids blinking over round eyes (the owl's, the raven's): a lid of the head's material closes from the top. */
class Lids implements GodFx {
  private t = -1;
  private next = rnd(1.5, 3.5);
  private twice = false;
  constructor(private o: { eyes: [number, number, number][]; col: string; every?: [number, number] }) {}
  update(_L: GodLive, dt: number): void {
    if (this.t >= 0) {
      this.t += dt / 0.17;
      if (this.t >= 1) {
        this.t = this.twice ? 0 : -1;
        this.twice = false;
      }
    } else if ((this.next -= dt) <= 0) {
      this.t = 0;
      this.twice = crand() < 0.25;
      const [a, b] = this.o.every ?? [2, 4.2];
      this.next = rnd(a, b);
    }
  }
  front(_L: GodLive, ctx: Ctx): void {
    if (this.t < 0) return;
    const k = Math.sin(this.t * Math.PI);
    for (const [x, y, r] of this.o.eyes) {
      const edge = y - r + 2 * r * k;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.clip();
      ctx.beginPath();
      ctx.rect(x - r - 1, y - r - 1, r * 2 + 2, edge - (y - r) + 1);
      const g = ctx.createLinearGradient(0, y - r, 0, edge);
      g.addColorStop(0, shade(this.o.col, 0.25));
      g.addColorStop(1, shade(this.o.col, -0.2));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - r, edge);
      ctx.lineTo(x + r, edge);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** Eyes (or a bell, a core) glowing: breathing, flickering like embers, and blazing on a smack. */
class Glow implements GodFx {
  private f = 0;
  private surge: Every | null;
  private sp = -1;
  constructor(private o: { pts: [number, number, number][]; col: string; a?: number; mode?: 'breathe' | 'ember' | 'pulse'; hz?: number; hot?: string; surge?: [number, number] }) {
    this.surge = o.surge ? new Every(o.surge[0], o.surge[1], 0.9) : null;
  }
  update(_L: GodLive, dt: number): void {
    this.f *= Math.exp(-dt / 0.45);
    if (this.surge) this.sp = this.surge.tick(dt);
  }
  front(L: GodLive, ctx: Ctx): void {
    const o = this.o;
    const a0 = o.a ?? 0.55;
    const t = L.t * (o.hz ?? 1);
    let a = o.mode === 'ember' ? a0 * (0.7 + 0.3 * noise1(t * 7)) : o.mode === 'pulse' ? a0 * (0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.4), 2)) : a0 * (0.75 + 0.25 * Math.sin(t * 2));
    if (this.sp >= 0) a += a0 * 0.8 * Math.sin(this.sp * Math.PI);
    a += this.f;
    lighter(ctx, () => {
      for (const [x, y, r] of o.pts) {
        glowDot(ctx, x, y, r * (1.6 + 0.5 * this.f), o.col, Math.min(1, a));
        if (a > 0.7) glowDot(ctx, x, y, r * 0.6, o.hot ?? '#ffffff', Math.min(1, (a - 0.7) * 1.4));
      }
    });
  }
  smack(): void {
    this.f = 1;
  }
}

/** Strings plucked (the lyre's, the harp's): one now and then, its note rising off it; a smack strums them all. Each
 *  string bows out and rings down, drawn over the head where its still had it. */
class Strings implements GodFx {
  private amp: number[];
  private ph: number[];
  private next = rnd(0.6, 1.6);
  /** Plucks still to come in a run up the strings: [seconds to wait, string]. */
  private run: [number, number][] = [];
  constructor(private o: { s: [number, number, number][]; col: string; w: number; glow?: string; note?: boolean }) {
    this.amp = o.s.map(() => 0);
    this.ph = o.s.map(() => 0);
  }
  private pluck(L: GodLive, i: number, a: number): void {
    this.amp[i] = Math.max(this.amp[i], a);
    if (this.o.note && crand() < 0.8) {
      const [x, y0, y1] = this.o.s[i];
      L.emitP('note', x + rnd(-4, 4), (y0 + y1) * 0.5, rnd(-14, 14), rnd(-50, -34), 18, 22, rnd(1, 1.5), { drag: 0.6, fin: 0.15, spin: 0, rot: rnd(-0.3, 0.3) });
    }
  }
  update(L: GodLive, dt: number): void {
    if ((this.next -= dt) <= 0) {
      this.next = rnd(0.5, 1.4);
      this.pluck(L, Math.floor(crand() * this.o.s.length), rnd(2.2, 3.4));
      // now and then a run up the strings
      if (crand() < 0.2) this.run = this.o.s.map((_s, i) => [i * 0.07, i]);
    }
    for (const r of this.run) if ((r[0] -= dt) <= 0) this.pluck(L, r[1], 2.4);
    this.run = this.run.filter((r) => r[0] > 0);
    for (let i = 0; i < this.amp.length; i++) {
      this.amp[i] *= Math.exp(-dt / 0.55);
      this.ph[i] += dt * (52 + i * 6);
    }
  }
  front(_L: GodLive, ctx: Ctx): void {
    const o = this.o;
    const calm = reduced() ? 0.4 : 1;
    ctx.save();
    ctx.lineCap = 'round';
    o.s.forEach(([x, y0, y1], i) => {
      const d = this.amp[i] * Math.sin(this.ph[i]) * calm;
      const draw = (dd: number) => {
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.quadraticCurveTo(x + dd * 2, (y0 + y1) / 2, x, y1);
      };
      if (o.glow) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        draw(d);
        ctx.strokeStyle = rgba(o.glow, 0.3 + Math.min(0.5, this.amp[i] * 0.15));
        ctx.lineWidth = o.w * 3.2;
        ctx.stroke();
        ctx.restore();
      }
      // a blur of the string's swing while it rings
      if (Math.abs(this.amp[i]) > 0.4) {
        ctx.globalAlpha = 0.35;
        draw(this.amp[i]);
        ctx.strokeStyle = o.col;
        ctx.lineWidth = o.w;
        ctx.stroke();
        draw(-this.amp[i]);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      draw(d);
      ctx.strokeStyle = o.col;
      ctx.lineWidth = o.w;
      ctx.stroke();
    });
    ctx.restore();
  }
  smack(L: FxHost): void {
    this.o.s.forEach((_s, i) => this.pluck(L as GodLive, i, 3.6));
  }
}

/** Artemis's bow: the string drawn back with the arrow and eased off, now and then; on a smack it's loosed: the
 *  string snaps and rings, the arrow leaps and a streak of moonlight flies up off its tip. */
class Bow implements GodFx {
  private draw = new Every(1.6, 3, 2.2);
  private p = -1;
  private loose = -1;
  private ring = 0;
  private ph = 0;
  update(L: GodLive, dt: number): void {
    this.p = this.draw.tick(dt);
    this.ring *= Math.exp(-dt / 0.35);
    this.ph += dt * 46;
    if (this.loose >= 0) {
      this.loose += dt / 0.55;
      if (this.loose >= 1) this.loose = -1;
    }
    void L;
  }
  /** How far back the string is (peel units). */
  private pull(): number {
    if (this.loose >= 0) return this.loose < 0.08 ? 15 * (1 - this.loose / 0.08) : 0;
    if (this.p < 0) return 0;
    return 15 * smooth(0, 0.35, this.p) * (1 - smooth(0.72, 1, this.p)) * (reduced() ? 0.5 : 1);
  }
  layer(_L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key !== 'arrow') return false;
    const d = this.pull();
    // the loosed arrow leaps up and settles back to the nock
    const leap = this.loose >= 0 ? -18 * Math.sin(Math.min(1, this.loose / 0.5) * Math.PI) : 0;
    ctx.save();
    ctx.translate(0, d + leap);
    drawL(ctx, l);
    ctx.restore();
    return true;
  }
  front(_L: GodLive, ctx: Ctx): void {
    const d = this.pull();
    const vib = this.ring * Math.sin(this.ph) * 5;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(18, 68);
    ctx.quadraticCurveTo(64, 96 + d * 0.5 - vib, HX, 124 + d - vib);
    ctx.quadraticCurveTo(156, 96 + d * 0.5 - vib, 202, 68);
    ctx.strokeStyle = '#fff6d8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    if (this.loose >= 0) {
      // the streak of moonlight off the tip, fading as it goes up out of the box
      const u = this.loose;
      const y = 18 - u * 90;
      lighter(ctx, () => {
        const g = ctx.createLinearGradient(0, y, 0, y + 70);
        g.addColorStop(0, rgba('#ffffff', 0.9 * (1 - u)));
        g.addColorStop(1, 'rgba(184,208,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(HX - 3, Math.max(0, y), 6, 70);
        glowDot(ctx, HX, Math.max(6, y), 14, '#d8e8ff', 0.7 * (1 - u));
      });
    }
  }
  smack(L: FxHost): void {
    this.loose = 0;
    this.ring = 1;
    this.p = -1;
    L.emitP('white', HX, 12, 0, -320, 12, 6, 0.4, { drag: 0.5, fin: 0.01 });
  }
}

/** Hephaestus's hammer: lifted and struck down on the hot face every couple of seconds, sparks flying off the
 *  strike; a smack is a great blow. The face glows hotter at each strike. */
class Hammer implements GodFx {
  private cyc = new Every(1.8, 3.2, 0.7, 0.6);
  private p = -1;
  private hit = 0;
  private big = 0;
  update(L: GodLive, dt: number): void {
    const was = this.p;
    this.p = this.cyc.tick(dt);
    this.hit *= Math.exp(-dt / 0.35);
    this.big *= Math.exp(-dt / 0.5);
    // the moment it lands
    if (was >= 0 && was < 0.62 && (this.p >= 0.62 || this.p < 0)) this.strike(L, 0.6);
  }
  private strike(L: GodLive, k: number): void {
    this.hit = Math.max(this.hit, k);
    const n = Math.round((reduced() ? 3 : 7) * k);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rnd(-1.2, 1.2);
      const v = rnd(120, 260) * (L.menu ? 0.6 : 1);
      L.emitP('ember', rnd(118, 150), 34, Math.cos(a) * v, Math.sin(a) * v, 7, 3, rnd(0.25, 0.5), { grav: 520, drag: 0.6, fin: 0.01 });
    }
  }
  private ang(): number {
    // lifted (back about its grip), held, then brought down past rest and bouncing off
    const p = this.p;
    if (p < 0) return 0;
    const calm = reduced() ? 0.4 : 1;
    if (p < 0.45) return -0.22 * smooth(0, 0.45, p) * calm;
    if (p < 0.62) return (-0.22 + 0.27 * smooth(0.45, 0.62, p)) * calm;
    return 0.05 * (1 - smooth(0.62, 1, p)) * Math.cos((p - 0.62) * 30) * calm;
  }
  layer(_L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key !== 'hammer') return false;
    turned(ctx, l, 93.6, 38.6, this.ang());
    return true;
  }
  front(_L: GodLive, ctx: Ctx): void {
    const h = Math.max(this.hit, this.big);
    lighter(ctx, () => {
      // the hot face glowing, white at a strike
      const g = ctx.createLinearGradient(0, 30, 0, 50);
      g.addColorStop(0, 'rgba(255,190,90,0)');
      g.addColorStop(0.5, rgba('#ffb04a', 0.25 + 0.5 * h));
      g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g;
      ctx.fillRect(72, 30, 120, 20);
      if (h > 0.05) glowDot(ctx, 134, 38, 26 * (0.6 + h), '#fff2c0', 0.5 * h);
    });
  }
  smack(L: FxHost): void {
    this.big = 1;
    this.cyc.fire();
    this.strike(L as GodLive, 1.6);
  }
}

/** Rows (or columns) of a layer shifted on a travelling wave, held at one end and freer towards the other: a cloak
 *  billowing, a crest streaming, a sail filling. */
class Billow implements GodFx {
  private gust = new Every(2.2, 3.8, 1.5);
  private g = 0;
  private lag = 0;
  constructor(private o: { key: string; mode: 'rows' | 'cols' | 'fill'; from: number; to: number; amp: number; cx?: number }) {}
  update(L: GodLive, dt: number): void {
    const p = this.gust.tick(dt);
    this.g = p >= 0 ? Math.sin(p * Math.PI) : 0;
    const lagT = L.menu ? 0 : clamp(-L.vx * 0.018, -14, 14);
    this.lag += (lagT - this.lag) * Math.min(1, dt * 5);
  }
  layer(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key !== this.o.key) return false;
    const o = this.o;
    const RR = l.c.width / l.w;
    const calm = reduced() ? 0.35 : 1;
    const amp = o.amp * (1 + this.g * 0.9 + (L.sm < 0.6 ? 1.2 * (1 - L.sm / 0.6) : 0) + clamp(L.speed / 900, 0, 1)) * calm;
    const t = L.t;
    const M = 16;
    const step = 3;
    if (o.mode === 'cols') {
      // columns shifted up and down, freer away from `from` (x)
      const [sc, sx] = L.scratch('billow', l.c.width, Math.ceil((l.h + M * 2) * RR));
      sx.setTransform(1, 0, 0, 1, 0, 0);
      sx.clearRect(0, 0, sc.width, sc.height);
      const cols = Math.ceil(l.w / step);
      for (let i = 0; i < cols; i++) {
        const x = l.x + i * step;
        const d = clamp(Math.abs(x - o.from) / Math.abs(o.to - o.from), 0, 1);
        const dy = d * (amp * (Math.sin(t * 2.6 - x * 0.05) + 0.4 * Math.sin(t * 4.1 - x * 0.09)) + this.lag * 0.3);
        const sx0 = Math.floor(i * step * RR);
        const sw = Math.min(Math.ceil(step * RR) + 1, l.c.width - sx0);
        if (sw <= 0) break;
        sx.drawImage(l.c, sx0, 0, sw, l.c.height, sx0, (dy + M) * RR, sw, l.c.height);
      }
      ctx.drawImage(sc, l.x, l.y - M, l.w, l.h + M * 2);
      return true;
    }
    const [sc, sx] = L.scratch('billow', Math.ceil((l.w + M * 2) * RR), l.c.height);
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.clearRect(0, 0, sc.width, sc.height);
    const rows = Math.ceil(l.h / step);
    const cx = o.cx ?? HX;
    for (let i = 0; i < rows; i++) {
      const y = l.y + i * step;
      const d = clamp((y - o.from) / (o.to - o.from), 0, 1);
      let dx: number;
      let k: number;
      if (o.mode === 'fill') {
        // a sail: rows swelling out and back as the wind fills it, most in the middle
        const bell = Math.sin(d * Math.PI);
        k = 1 + bell * (0.03 * amp * (0.6 + 0.4 * Math.sin(t * 1.4)) + 0.04 * this.g);
        dx = bell * (amp * 1.6 * Math.sin(t * 1.4 - y * 0.03) + this.lag * 0.3);
      } else {
        const e = d * d;
        const wave = Math.sin(t * 2.1 - y * 0.045) + 0.45 * Math.sin(t * 3.4 - y * 0.085 + 1.7);
        dx = e * (4.6 * amp * wave + this.lag);
        k = 1 + e * 0.035 * amp * Math.sin(t * 1.6 - y * 0.03 + 0.8);
      }
      const sy0 = Math.floor(i * step * RR);
      const sh = Math.min(Math.ceil(step * RR) + 1, l.c.height - sy0);
      if (sh <= 0) break;
      const x = cx + (l.x - cx) * k + dx;
      sx.drawImage(l.c, 0, sy0, l.c.width, sh, (x - l.x + M) * RR, sy0, l.c.width * k, sh);
    }
    ctx.drawImage(sc, l.x - M, l.y, l.w + M * 2, l.h);
    return true;
  }
  smack(): void {
    this.gust.fire();
  }
}

/** Light rays turning slowly behind (or over) a point, fading out along their length: Baldur's and Apollo's sun,
 *  Odin's eye, the God Peel. */
class Rays implements GodFx {
  private f = 0;
  private a = crand() * TAU;
  constructor(private o: { c: P; n: number; r0: number; r1: number; col: string; a: number; rate?: number; w?: number; front?: boolean; down?: boolean }) {}
  update(_L: GodLive, dt: number): void {
    this.f *= Math.exp(-dt / 0.5);
    this.a += dt * ((this.o.rate ?? 0.12) * (reduced() ? 0.35 : 1) + this.f * 1.5);
  }
  private draw(L: GodLive, ctx: Ctx): void {
    const o = this.o;
    const [cx, cy] = o.c;
    const r1 = o.r1 * (1 + 0.25 * this.f);
    const g = ctx.createRadialGradient(cx, cy, o.r0, cx, cy, r1);
    const a = o.a * (0.75 + 0.25 * Math.sin(L.t * 1.3)) + this.f * 0.5;
    g.addColorStop(0, rgba(o.col, Math.min(1, a)));
    g.addColorStop(0.5, rgba(o.col, Math.min(1, a) * 0.4));
    g.addColorStop(1, rgba(o.col, 0));
    const w = (o.w ?? 0.5) * (TAU / o.n) * 0.5;
    lighter(ctx, () => {
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i < o.n; i++) {
        const th = o.down ? Math.PI / 2 + (i / (o.n - 1) - 0.5) * 1.6 + 0.08 * Math.sin(L.t * 0.9 + i) : this.a + (i / o.n) * TAU;
        const len = o.down ? 0.85 + 0.15 * Math.sin(L.t * 2 + i * 1.7) : 1;
        ctx.moveTo(cx + Math.cos(th - w * 0.3) * o.r0, cy + Math.sin(th - w * 0.3) * o.r0);
        ctx.lineTo(cx + Math.cos(th - w) * r1 * len, cy + Math.sin(th - w) * r1 * len);
        ctx.lineTo(cx + Math.cos(th + w) * r1 * len, cy + Math.sin(th + w) * r1 * len);
        ctx.lineTo(cx + Math.cos(th + w * 0.3) * o.r0, cy + Math.sin(th + w * 0.3) * o.r0);
        ctx.closePath();
      }
      ctx.fill();
    });
  }
  back(L: GodLive, ctx: Ctx): void {
    if (!this.o.front) this.draw(L, ctx);
  }
  front(L: GodLive, ctx: Ctx): void {
    if (this.o.front) this.draw(L, ctx);
  }
  smack(): void {
    this.f = 1;
  }
}

/** Odin's ravens, Huginn and Muninn: now and then one flies past behind the head, wings beating; a smack sends both
 *  out. Dark silhouettes with a soft rim of the god's light. */
class Ravens implements GodFx {
  private rs: { t: number; dir: number; y: number; s: number; dur: number }[] = [];
  private next = rnd(1.5, 3.5);
  constructor(private col: string) {}
  update(_L: GodLive, dt: number): void {
    if ((this.next -= dt) <= 0) {
      this.next = rnd(3.5, 6.5);
      this.rs.push({ t: 0, dir: crand() < 0.5 ? -1 : 1, y: rnd(30, 70), s: rnd(0.85, 1.1), dur: rnd(1.6, 2.2) });
    }
    for (const r of this.rs) r.t += dt / r.dur;
    this.rs = this.rs.filter((r) => r.t < 1);
  }
  private one(ctx: Ctx, x: number, y: number, s: number, dir: number, flap: number, a: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * s, s);
    ctx.globalAlpha = a;
    const up = Math.sin(flap);
    const body = () => {
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 5, 0.08, 0, TAU);
      ctx.moveTo(11, -2);
      ctx.lineTo(19, 0);
      ctx.lineTo(11, 2.5);
      ctx.moveTo(-11, -1);
      ctx.lineTo(-20, -4);
      ctx.lineTo(-19, 3);
      ctx.closePath();
      for (const side of [-1, 1]) {
        ctx.moveTo(-3, 0);
        ctx.quadraticCurveTo(-8, -14 * up * side - 4, -18, -22 * up * side - 2);
        ctx.quadraticCurveTo(-4, -8 * up * side, 5, 0);
        ctx.closePath();
      }
    };
    // a soft rim of light, then the dark bird
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    body();
    ctx.strokeStyle = rgba(this.col, 0.5);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    body();
    ctx.fillStyle = '#16121c';
    ctx.fill();
    ctx.restore();
  }
  private all(ctx: Ctx, back: boolean): void {
    for (const r of this.rs) {
      if ((r.s > 1.05) !== !back) continue;
      const x = r.dir > 0 ? -20 + r.t * 260 : 240 - r.t * 260;
      const y = r.y + Math.sin(r.t * 7) * 6 - r.t * 20;
      const a = Math.min(1, r.t * 6, (1 - r.t) * 6);
      this.one(ctx, x, y, r.s * 1.7, r.dir, r.t * 40, a);
    }
  }
  back(_L: GodLive, ctx: Ctx): void {
    this.all(ctx, true);
  }
  front(_L: GodLive, ctx: Ctx): void {
    this.all(ctx, false);
  }
  smack(): void {
    // both ravens burst out, one each way, in front
    this.rs.push({ t: 0.32, dir: 1, y: 60, s: 1.15, dur: 1.1 });
    this.rs.push({ t: 0.32, dir: -1, y: 40, s: 1.12, dur: 1.2 });
  }
}

/** Loki's illusions: now and then the mask splits into green ghosts of itself that drift apart and snap back; a smack
 *  throws two out to the sides. */
class Illusion implements GodFx {
  private run = new Every(3, 5.5, 1.1);
  private p = -1;
  private big = -1;
  update(_L: GodLive, dt: number): void {
    this.p = this.run.tick(dt);
    if (this.big >= 0) {
      this.big += dt / 0.7;
      if (this.big >= 1) this.big = -1;
    }
  }
  back(L: GodLive, ctx: Ctx): void {
    const base = L.mini.layers.get('base');
    if (!base) return;
    const k = this.big >= 0 ? Math.sin(this.big * Math.PI) : this.p >= 0 ? Math.sin(this.p * Math.PI) * 0.6 : 0;
    if (k < 0.02) return;
    const off = (this.big >= 0 ? 34 * this.big : 14) * k * (reduced() ? 0.5 : 1);
    // a see-through copy of the mask, washed green
    const [sc, sx] = L.scratch('ghost', base.c.width, base.c.height);
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.globalCompositeOperation = 'source-over';
    sx.clearRect(0, 0, sc.width, sc.height);
    sx.drawImage(base.c, 0, 0);
    sx.globalCompositeOperation = 'source-atop';
    sx.fillStyle = 'rgba(120,240,90,0.7)';
    sx.fillRect(0, 0, sc.width, sc.height);
    sx.globalCompositeOperation = 'source-over';
    const fadeOut = this.big >= 0 ? 1 - this.big : 1;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3 * k * fadeOut;
      ctx.drawImage(sc, base.x + s * off, base.y - 2 * k, base.w, base.h);
      ctx.restore();
    }
  }
  smack(): void {
    this.big = 0;
  }
}

/** Lightning crawling the edges of a polygon (Mjölnir's head): short jagged arcs between nearby points on its edge,
 *  re-jagged every few hundredths of a second; a smack sets the whole edge crackling. */
class EdgeArcs implements GodFx {
  private arcs: { pts: number[]; age: number; life: number; rej: number; u: number; len: number; big: boolean }[] = [];
  private acc = 0;
  private per: number;
  private cum: number[] = [0];
  constructor(private o: { poly: P[]; col: string; hot?: string; rate: number; jag?: number; w?: number }) {
    for (let i = 0; i < o.poly.length; i++) {
      const a = o.poly[i];
      const b = o.poly[(i + 1) % o.poly.length];
      this.cum.push(this.cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    this.per = this.cum[this.cum.length - 1];
  }
  private at(d: number): P {
    d = ((d % this.per) + this.per) % this.per;
    let i = 0;
    while (this.cum[i + 1] < d) i++;
    const a = this.o.poly[i];
    const b = this.o.poly[(i + 1) % this.o.poly.length];
    const k = (d - this.cum[i]) / (this.cum[i + 1] - this.cum[i] || 1);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }
  private jag(arc: (typeof this.arcs)[number]): void {
    const n = 8;
    const j = (this.o.jag ?? 10) * (arc.big ? 1.6 : 1);
    arc.pts.length = 0;
    for (let k = 0; k <= n; k++) {
      const [x, y] = this.at(arc.u + (arc.len * k) / n);
      // pushed out from the head's middle, jagged
      const dx = x - HX;
      const dy = y - 73;
      const d = Math.hypot(dx, dy) || 1;
      const out = Math.sin((k / n) * Math.PI) * j * 0.5 + (k && k < n ? (crand() - 0.35) * j : 0);
      arc.pts.push(x + (dx / d) * out, y + (dy / d) * out);
    }
  }
  private spawn(big: boolean): void {
    const arc = { pts: [] as number[], age: 0, life: rnd(0.12, 0.26) * (big ? 1.6 : 1), rej: 0, u: crand() * this.per, len: rnd(40, 90) * (big ? 1.6 : 1), big };
    this.jag(arc);
    if (this.arcs.length > 12) this.arcs.shift();
    this.arcs.push(arc);
  }
  update(_L: GodLive, dt: number): void {
    this.acc += dt * this.o.rate * (reduced() ? 0.4 : 1);
    while (this.acc >= 1) {
      this.acc -= 1;
      this.spawn(false);
    }
    for (const a of this.arcs) {
      a.age += dt;
      if ((a.rej -= dt) <= 0) {
        a.rej = 0.045;
        this.jag(a);
      }
    }
    this.arcs = this.arcs.filter((a) => a.age < a.life);
  }
  front(_L: GodLive, ctx: Ctx): void {
    if (!this.arcs.length) return;
    const o = this.o;
    const w = o.w ?? 1;
    lighter(ctx, () => {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const a of this.arcs) {
        const al = (1 - a.age / a.life) * (0.75 + 0.25 * Math.sin(a.age * 90));
        ctx.beginPath();
        for (let i = 0; i < a.pts.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, a.pts[i], a.pts[i + 1]);
        const bw = a.big ? 1.5 : 1;
        ctx.strokeStyle = rgba(o.col, 0.22 * al);
        ctx.lineWidth = 9 * w * bw;
        ctx.stroke();
        ctx.strokeStyle = rgba(o.col, 0.8 * al);
        ctx.lineWidth = 3 * w * bw;
        ctx.stroke();
        ctx.strokeStyle = rgba(o.hot ?? '#ffffff', 0.95 * al);
        ctx.lineWidth = 1.2 * w * bw;
        ctx.stroke();
      }
    });
  }
  smack(): void {
    for (let i = 0; i < 6; i++) this.spawn(true);
  }
}

/** Wind streaming past behind the head (Hermes the swift, the sea wind): curved streaks, faster when swung. */
class Wind implements GodFx {
  private ls: { y: number; t: number; len: number; dur: number; bend: number }[] = [];
  private acc = 0;
  constructor(private o: { col: string; rate: number; y0: number; y1: number; front?: boolean; a?: number }) {}
  update(L: GodLive, dt: number): void {
    this.acc += dt * this.o.rate * (1 + clamp(L.speed / 500, 0, 2)) * (reduced() ? 0.4 : 1);
    while (this.acc >= 1) {
      this.acc -= 1;
      this.ls.push({ y: rnd(this.o.y0, this.o.y1), t: 0, len: rnd(40, 80), dur: rnd(0.45, 0.8), bend: rnd(-10, 10) });
    }
    for (const l of this.ls) l.t += dt / l.dur;
    this.ls = this.ls.filter((l) => l.t < 1);
  }
  private draw(ctx: Ctx): void {
    lighter(ctx, () => {
      ctx.lineCap = 'round';
      for (const l of this.ls) {
        const x = 230 - l.t * 280;
        const a = Math.sin(l.t * Math.PI) * (this.o.a ?? 0.5);
        const g = ctx.createLinearGradient(x, 0, x + l.len, 0);
        g.addColorStop(0, rgba(this.o.col, a));
        g.addColorStop(1, rgba(this.o.col, 0));
        ctx.beginPath();
        ctx.moveTo(x, l.y);
        ctx.quadraticCurveTo(x + l.len * 0.5, l.y + l.bend, x + l.len, l.y + l.bend * 0.4);
        ctx.strokeStyle = g;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
    });
  }
  back(_L: GodLive, ctx: Ctx): void {
    if (!this.o.front) this.draw(ctx);
  }
  front(_L: GodLive, ctx: Ctx): void {
    if (this.o.front) this.draw(ctx);
  }
  smack(): void {
    for (let i = 0; i < 6; i++) this.ls.push({ y: rnd(this.o.y0, this.o.y1), t: rnd(0, 0.2), len: rnd(60, 100), dur: rnd(0.35, 0.55), bend: rnd(-14, 14) });
  }
}

/** Sea light rippling over the trident's gold (caustics), and a coil of water winding up its shaft, foam at its crest;
 *  a smack throws a splash off the tines. */
class Sea implements GodFx {
  private splash = 0;
  update(L: GodLive, dt: number): void {
    this.splash *= Math.exp(-dt / 0.45);
    if (crand() < dt * 2.5) L.emitP('drop', HX + rnd(-10, 10), rnd(110, 170), rnd(-40, 40), rnd(-60, -20), 7, 5, rnd(0.5, 0.8), { grav: 380, drag: 0.4 });
  }
  back(L: GodLive, ctx: Ctx): void {
    // the coil of water, its far side behind the shaft
    this.coil(L, ctx, true);
  }
  front(L: GodLive, ctx: Ctx): void {
    const gold = L.mini.gold;
    if (gold) {
      // caustic light: bright bands crossing and drifting over the gold, only where it's painted
      const [sc, sx] = L.scratch('sea', gold.c.width, gold.c.height);
      const RR = gold.c.width / gold.w;
      sx.setTransform(1, 0, 0, 1, 0, 0);
      sx.globalCompositeOperation = 'source-over';
      sx.clearRect(0, 0, sc.width, sc.height);
      sx.setTransform(RR, 0, 0, RR, -gold.x * RR, -gold.y * RR);
      sx.lineCap = 'round';
      const t = L.t;
      for (let k = 0; k < 7; k++) {
        sx.beginPath();
        const y0 = 10 + k * 26 + 8 * Math.sin(t * 0.7 + k);
        for (let x = 20; x <= 200; x += 12) sx.lineTo(x, y0 + 7 * Math.sin(x * 0.07 + t * 1.6 + k * 1.3) + 4 * Math.sin(x * 0.13 - t * 2.1));
        sx.strokeStyle = rgba('#bff4ff', 0.4 + 0.2 * Math.sin(t * 1.1 + k));
        sx.lineWidth = 3.4;
        sx.stroke();
      }
      // (only where the gold is)
      sx.setTransform(1, 0, 0, 1, 0, 0);
      sx.globalCompositeOperation = 'destination-in';
      sx.drawImage(gold.c, 0, 0);
      sx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(sc, gold.x, gold.y, gold.w, gold.h);
      ctx.restore();
    }
    this.coil(L, ctx, false);
    if (this.splash > 0.02) lighter(ctx, () => glowDot(ctx, HX, 20, 70 * (0.6 + this.splash * 0.6), '#bff4ff', 0.55 * this.splash));
  }
  private coil(L: GodLive, ctx: Ctx, back: boolean): void {
    // a ribbon of water spiralling up the shaft (y 186 → 108): its near runs in front of the shaft, its far ones
    // behind, each a deep body, a lit body and a glint, fading in at the foot and out at the crest
    const t = L.t;
    const n = 48;
    const pts: [number, number, boolean][] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const ph = u * TAU * 1.5 - t * 2.4;
      pts.push([HX + Math.sin(ph) * (17 + 7 * u), 186 - u * 78 + Math.cos(ph) * 3, Math.cos(ph) > 0]);
    }
    const fade = (col: string, a: number) => {
      const g = ctx.createLinearGradient(0, 188, 0, 104);
      g.addColorStop(0, rgba(col, 0));
      g.addColorStop(0.18, rgba(col, a));
      g.addColorStop(0.75, rgba(col, a));
      g.addColorStop(1, rgba(col, 0));
      return g;
    };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let on = false;
    for (let i = 0; i <= n; i++) {
      const [x, y, front] = pts[i];
      if (front === back) {
        on = false;
        continue;
      }
      if (!on) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      on = true;
    }
    const k = back ? 0.55 : 1;
    ctx.strokeStyle = fade('#1a5a9a', 0.55 * k);
    ctx.lineWidth = back ? 8 : 11;
    ctx.stroke();
    ctx.strokeStyle = fade('#4ab8ec', 0.8 * k);
    ctx.lineWidth = back ? 5 : 7;
    ctx.stroke();
    if (!back) {
      ctx.translate(-1, -1.6);
      ctx.strokeStyle = fade('#e8fbff', 0.85);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();
  }
  smack(L: FxHost): void {
    this.splash = 1;
    const n = reduced() ? 6 : 14;
    for (let i = 0; i < n; i++) {
      const x = [HX, 58, 162][i % 3] + rnd(-6, 6);
      const a = -Math.PI / 2 + rnd(-1, 1);
      const v = rnd(120, 240) * (L.menu ? 0.6 : 1);
      L.emitP('drop', x, 10, Math.cos(a) * v, Math.sin(a) * v, rnd(8, 12), 6, rnd(0.5, 0.8), { grav: 520, drag: 0.4 });
    }
    L.emitP('mist', HX, 14, 0, -30, 40, 110, 0.6, { drag: 2, a: 0.8 });
  }
}

/** Glows lighting in turn round a set of points (Persephone's seeds, Freyr's bristles, the laurel's leaves). */
class Seq implements GodFx {
  private f = 0;
  constructor(private o: { pts: [number, number, number][]; col: string; hot?: string; a: number; speed?: number; glint?: boolean }) {}
  update(_L: GodLive, dt: number): void {
    this.f *= Math.exp(-dt / 0.45);
  }
  front(L: GodLive, ctx: Ctx): void {
    const o = this.o;
    const n = o.pts.length;
    const ph = (L.t * (o.speed ?? 3)) % (n + 3);
    lighter(ctx, () => {
      o.pts.forEach(([x, y, r], i) => {
        const k = Math.exp(-Math.pow(ph - i, 2) / 1.4);
        const a = o.a * (0.2 + k) + this.f;
        glowDot(ctx, x, y, r * (1.5 + k * 0.6), o.col, Math.min(1, a));
        if (k > 0.5 && o.hot) glowDot(ctx, x, y, r * 0.6, o.hot, (k - 0.5) * 1.2);
      });
    });
  }
  smack(): void {
    this.f = 0.9;
  }
}

/** A light running along a path (Frigg's thread of fate, wound round her spindle and drifting off); a smack throws
 *  threads of light out from it. */
class Thread implements GodFx {
  private f = 0;
  private len: number;
  private cum: number[] = [0];
  constructor(private o: { path: P[]; col: string }) {
    for (let i = 1; i < o.path.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(o.path[i][0] - o.path[i - 1][0], o.path[i][1] - o.path[i - 1][1]));
    this.len = this.cum[this.cum.length - 1];
  }
  private at(d: number): P {
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const k = clamp((d - this.cum[i - 1]) / (this.cum[i] - this.cum[i - 1] || 1), 0, 1);
    const a = this.o.path[i - 1];
    const b = this.o.path[i];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }
  update(_L: GodLive, dt: number): void {
    this.f *= Math.exp(-dt / 0.6);
  }
  front(L: GodLive, ctx: Ctx): void {
    const head = ((L.t * 70) % (this.len + 60)) - 20;
    lighter(ctx, () => {
      for (let k = 0; k < 10; k++) {
        const d = head - k * 5;
        if (d < 0 || d > this.len) continue;
        const [x, y] = this.at(d);
        glowDot(ctx, x, y, 9 - k * 0.6, this.o.col, (1 - k / 10) * 0.7);
      }
      if (this.f > 0.02) {
        // threads of fate flung out from the spindle
        ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU + 0.3;
          const r0 = 26;
          const r1 = 26 + 54 * (1 - this.f * 0.5);
          const g = ctx.createLinearGradient(HX + Math.cos(a) * r0, HY + Math.sin(a) * r0, HX + Math.cos(a) * r1, HY + Math.sin(a) * r1);
          g.addColorStop(0, rgba(this.o.col, 0.8 * this.f));
          g.addColorStop(1, rgba(this.o.col, 0));
          ctx.beginPath();
          ctx.moveTo(HX + Math.cos(a) * r0, HY - 4 + Math.sin(a) * r0);
          ctx.quadraticCurveTo(HX + Math.cos(a + 0.3) * (r0 + r1) * 0.5, HY - 4 + Math.sin(a + 0.3) * (r0 + r1) * 0.5, HX + Math.cos(a + 0.15) * r1, HY - 4 + Math.sin(a + 0.15) * r1);
          ctx.strokeStyle = g;
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
      }
    });
  }
  smack(): void {
    this.f = 1;
  }
}

/** Sound pouring out of Gjallarhorn's bell: arcs of light spreading out to the right, a blast of them on a smack, and
 *  the bell glowing. */
class Horn implements GodFx {
  private rs: number[] = [];
  private acc = 0;
  private f = 0;
  update(_L: GodLive, dt: number): void {
    this.acc += dt * 0.9;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.rs.push(0);
    }
    this.f *= Math.exp(-dt / 0.5);
    this.rs = this.rs.map((t) => t + dt / 1.3).filter((t) => t < 1);
  }
  front(L: GodLive, ctx: Ctx): void {
    lighter(ctx, () => {
      glowDot(ctx, 152, 34, 26 + 10 * this.f, '#ffe680', 0.4 + 0.2 * Math.sin(L.t * 2.4) + this.f * 0.5);
      ctx.lineCap = 'round';
      for (const t of this.rs) {
        if (t <= 0) continue;
        const cx = 150 + t * 30;
        const cy = 34 - t * 8;
        const r = 16 + t * 46;
        const a = Math.sin(Math.min(1, t * 4) * Math.PI * 0.5) * (1 - t) * (1 - t);
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 0.45, r, -0.25, -1.1, 1.1);
        ctx.strokeStyle = rgba('#ffe680', 0.3 * a);
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.strokeStyle = rgba('#fff8d8', 0.85 * a);
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    });
  }
  smack(): void {
    this.f = 1;
    for (let i = 0; i < 3; i++) this.rs.push(-i * 0.1);
  }
}

/** Hel's living eye: shut, now and then it opens a crack, and on a smack it snaps open, pale and glowing. */
class HelEye implements GodFx {
  private run = new Every(4, 7, 1.4);
  private p = -1;
  private f = 0;
  update(_L: GodLive, dt: number): void {
    this.p = this.run.tick(dt);
    this.f *= Math.exp(-dt / 0.7);
  }
  front(_L: GodLive, ctx: Ctx): void {
    const open = Math.max(this.p >= 0 ? 0.45 * Math.sin(this.p * Math.PI) : 0, this.f);
    if (open < 0.03) return;
    const x = 78;
    const y = 92;
    const h = 11 * open;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - 17, y - 2);
    ctx.quadraticCurveTo(x, y - 2 - h * 1.6, x + 17, y - 2);
    ctx.quadraticCurveTo(x, y - 2 + h * 0.6, x - 17, y - 2);
    ctx.closePath();
    ctx.fillStyle = '#e8fff6';
    ctx.fill();
    ctx.clip();
    glowDot(ctx, x, y - 3, 9, '#a8f0d8', 0.9);
    ctx.beginPath();
    ctx.arc(x, y - 3, 4, 0, TAU);
    ctx.fillStyle = '#1a3a30';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x - 17, y - 2);
    ctx.quadraticCurveTo(x, y - 2 - h * 1.6, x + 17, y - 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  smack(): void {
    this.f = 1;
  }
}

/** Njord's ship riding the swell: waves rolling along under the hull, spray off their crests. */
class Waves implements GodFx {
  private f = 0;
  update(L: GodLive, dt: number): void {
    this.f *= Math.exp(-dt / 0.5);
    if (crand() < dt * 2) L.emitP('drop', rnd(30, 190), 168, rnd(-30, 30), rnd(-70, -30), 6, 4, rnd(0.4, 0.7), { grav: 400, drag: 0.4 });
  }
  /** One wave rolling along under the hull: a band of sea, lit at its crest, white foam on it, fading at its ends
   *  and below. */
  private wave(L: GodLive, ctx: Ctx, y: number, ph: number, sp: number, deep: string, lit: string): void {
    const t = L.t;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let x = 6; x <= 214; x += 6) {
      xs.push(x);
      ys.push(y + 4 * Math.sin(x * 0.06 + t * sp * 2 + ph) + 2 * Math.sin(x * 0.13 - t * sp * 3) - this.f * 7 * Math.exp(-Math.pow((x - 110) / 50, 2)));
    }
    ctx.save();
    // fading out at both ends
    const side = ctx.createLinearGradient(6, 0, 214, 0);
    side.addColorStop(0, 'rgba(0,0,0,0)');
    side.addColorStop(0.16, 'rgba(0,0,0,1)');
    side.addColorStop(0.84, 'rgba(0,0,0,1)');
    side.addColorStop(1, 'rgba(0,0,0,0)');
    const [sc, sx] = L.scratch('wave', Math.ceil(220 * L.mini.RR), Math.ceil(40 * L.mini.RR));
    const RR = L.mini.RR;
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.globalCompositeOperation = 'source-over';
    sx.clearRect(0, 0, sc.width, sc.height);
    sx.setTransform(RR, 0, 0, RR, 0, -(y - 12) * RR);
    sx.beginPath();
    xs.forEach((x, i) => (i ? sx.lineTo(x, ys[i]) : sx.moveTo(x, ys[i])));
    sx.lineTo(214, y + 26);
    sx.lineTo(6, y + 26);
    sx.closePath();
    const body = sx.createLinearGradient(0, y - 6, 0, y + 24);
    body.addColorStop(0, lit);
    body.addColorStop(0.45, rgba(deep, 0.85));
    body.addColorStop(1, rgba(deep, 0));
    sx.fillStyle = body;
    sx.fill();
    sx.beginPath();
    xs.forEach((x, i) => (i ? sx.lineTo(x, ys[i]) : sx.moveTo(x, ys[i])));
    sx.strokeStyle = 'rgba(240,252,255,0.9)';
    sx.lineWidth = 2;
    sx.lineCap = 'round';
    sx.stroke();
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.globalCompositeOperation = 'destination-in';
    sx.setTransform(RR, 0, 0, RR, 0, -(y - 12) * RR);
    sx.fillStyle = side;
    sx.fillRect(0, y - 12, 220, 40);
    sx.globalCompositeOperation = 'source-over';
    ctx.drawImage(sc, 0, y - 12, 220, 40);
    ctx.restore();
  }
  back(L: GodLive, ctx: Ctx): void {
    this.wave(L, ctx, 156, 2, -1.1, '#1a5a8a', '#7ad8ff');
  }
  front(L: GodLive, ctx: Ctx): void {
    this.wave(L, ctx, 172, 0, 1.5, '#1f6aa8', '#9fe8ff');
  }
  smack(L: FxHost): void {
    this.f = 1;
    for (let i = 0; i < (reduced() ? 5 : 12); i++) {
      const a = -Math.PI / 2 + rnd(-1.1, 1.1);
      const v = rnd(110, 220) * (L.menu ? 0.6 : 1);
      L.emitP('drop', HX + rnd(-50, 50), 166, Math.cos(a) * v, Math.sin(a) * v, rnd(7, 11), 5, rnd(0.5, 0.8), { grav: 500, drag: 0.4 });
    }
  }
}

/** A shooting star across the night behind Nyx, now and then. */
class Shooting implements GodFx {
  private run = new Every(2.5, 5, 0.7);
  private p = -1;
  private y = 30;
  update(_L: GodLive, dt: number): void {
    const was = this.p;
    this.p = this.run.tick(dt);
    if (was < 0 && this.p >= 0) this.y = rnd(14, 60);
  }
  back(_L: GodLive, ctx: Ctx): void {
    if (this.p < 0) return;
    const u = this.p;
    const x = 210 - u * 200;
    const y = this.y + u * 50;
    const a = Math.sin(u * Math.PI);
    lighter(ctx, () => {
      const g = ctx.createLinearGradient(x, y, x + 50, y - 12);
      g.addColorStop(0, rgba('#ffffff', 0.9 * a));
      g.addColorStop(1, 'rgba(160,138,255,0)');
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 50, y - 12);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.stroke();
      glowDot(ctx, x, y, 8, '#ffffff', 0.8 * a);
    });
  }
}

/** The God Peel's halo: floating over the head, a light running round it and glints catching on it; it flares on a
 *  smack. */
class Halo implements GodFx {
  private f = 0;
  update(_L: GodLive, dt: number): void {
    this.f *= Math.exp(-dt / 0.5);
  }
  private y(L: GodLive): number {
    return -3 * Math.sin(L.t * 1.3) * (reduced() ? 0.4 : 1) - 5 * this.f;
  }
  layer(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key !== 'halo') return false;
    ctx.save();
    ctx.translate(0, this.y(L));
    drawL(ctx, l);
    ctx.restore();
    return true;
  }
  front(L: GodLive, ctx: Ctx): void {
    const cy = HY - R + 2 + this.y(L);
    const th = L.t * 1.7;
    lighter(ctx, () => {
      // a light running round the ring (brighter on its near side)
      for (let k = 0; k < 6; k++) {
        const a = th - k * 0.12;
        const x = HX + Math.cos(a) * 64;
        const y = cy + Math.sin(a) * 15;
        const near = 0.55 + 0.45 * Math.sin(a);
        glowDot(ctx, x, y, 12 - k, '#fff6c8', (1 - k / 6) * 0.75 * near + this.f * 0.3);
      }
      if (this.f > 0.02) {
        ctx.beginPath();
        ctx.ellipse(HX, cy, 64, 15, 0, 0, TAU);
        ctx.strokeStyle = rgba('#fff8d8', 0.6 * this.f);
        ctx.lineWidth = 7;
        ctx.stroke();
      }
    });
  }
  smack(): void {
    this.f = 1;
  }
}

/** The God Peel's crown of tiny peels: they bob in a wave round the rim, each catching the light in turn; a smack
 *  makes them hop one after another. */
class Crown implements GodFx {
  private hop = -1;
  update(_L: GodLive, dt: number): void {
    if (this.hop >= 0) {
      this.hop += dt / 0.9;
      if (this.hop >= 1) this.hop = -1;
    }
  }
  private lift(L: GodLive, i: number): number {
    const calm = reduced() ? 0.4 : 1;
    let d = 1.6 * Math.max(0, Math.sin(L.t * 2.4 - i * 0.7)) * calm;
    if (this.hop >= 0) {
      const u = clamp((this.hop - i * 0.06) / 0.4, 0, 1);
      d += 9 * Math.sin(u * Math.PI);
    }
    return d;
  }
  layer(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key[0] !== 'p') return false;
    const i = Number(key.slice(1));
    const [, , rot] = godCrownAt(i);
    const d = this.lift(L, i);
    const ang = rot - Math.PI / 2;
    ctx.save();
    ctx.translate(Math.cos(ang) * d, Math.sin(ang) * d);
    drawL(ctx, l);
    ctx.restore();
    return true;
  }
  front(L: GodLive, ctx: Ctx): void {
    // each in turn catches the light
    const n = GOD_CROWN.length;
    const ph = (L.t * 2.2) % (n + 4);
    lighter(ctx, () => {
      for (let i = 0; i < n; i++) {
        const k = Math.exp(-Math.pow(ph - i, 2) / 0.8);
        if (k < 0.05) continue;
        const [x, y, rot] = godCrownAt(i);
        const d = this.lift(L, i);
        const ang = rot - Math.PI / 2;
        const hx = x + Math.cos(ang) * (d + 6);
        const hy = y + Math.sin(ang) * (d + 6);
        glowDot(ctx, hx, hy, 14, GOD_CROWN[i][0], 0.6 * k);
        glowDot(ctx, hx, hy, 6, '#ffffff', 0.5 * k);
      }
      if (this.hop >= 0)
        for (let i = 0; i < n; i++) {
          const u = clamp((this.hop - i * 0.06) / 0.4, 0, 1);
          const k = Math.sin(u * Math.PI);
          if (k < 0.03) continue;
          const [x, y, rot] = godCrownAt(i);
          const ang = rot - Math.PI / 2;
          const d = this.lift(L, i) + 6;
          glowDot(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, 24, GOD_CROWN[i][0], 0.85 * k);
        }
    });
  }
  smack(): void {
    this.hop = 0;
  }
}

/** A rainbow sheen sweeping over a layer now and then (the God Peel's prism, Aphrodite's nacre, Heimdall's Bifröst). */
class Prism implements GodFx {
  private run: Every;
  private p = -1;
  constructor(private o: { key?: string; a: number; every?: [number, number]; cols?: string[]; w?: number; op?: GlobalCompositeOperation }) {
    const [a, b] = o.every ?? [3, 5.5];
    this.run = new Every(a, b, 1.4);
  }
  update(_L: GodLive, dt: number): void {
    this.p = this.run.tick(dt);
  }
  front(L: GodLive, ctx: Ctx): void {
    if (this.p < 0) return;
    const l = L.mini.layers.get(this.o.key ?? 'base');
    if (!l) return;
    const env = Math.sin(this.p * Math.PI);
    sweepLayer(L, ctx, l, -0.3 + this.p * 1.6, this.o.cols ?? ['#ff7ad9', '#ffd23f', '#7dff9a', '#5fd8ff', '#a77dff'], this.o.a * env, this.o.w ?? 0.3, 0.6, this.o.op);
  }
  smack(): void {
    this.run.fire();
  }
}

/** The God Peel's slice of the sun: the gold slice breathing light, and motes of every colour drifting up round it. */
class Radiance implements GodFx {
  private f = 0;
  update(L: GodLive, dt: number): void {
    this.f *= Math.exp(-dt / 0.6);
    if (crand() < dt * 3) {
      const a = crand() * TAU;
      const d = rnd(30, 70);
      L.emitP(crand() < 0.5 ? 'gold' : 'star', HX + Math.cos(a) * d, HY + Math.sin(a) * d, rnd(-8, 8), rnd(-30, -14), rnd(5, 8), 3, rnd(0.9, 1.4), { drag: 0.5, fin: 0.25 });
    }
  }
  layer(L: GodLive, ctx: Ctx, key: string, l: Lyr): boolean {
    if (key !== 'slice') return false;
    lighter(ctx, () => {
      glowDot(ctx, HX, HY + 6, 50, '#fff2a0', 0.28 + 0.15 * Math.sin(L.t * 1.8) + this.f * 0.45);
      glowDot(ctx, HX, HY + 6, 18, '#ffffff', 0.3 + 0.2 * Math.sin(L.t * 1.8) + this.f * 0.4);
    });
    drawL(ctx, l);
    return true;
  }
  smack(): void {
    this.f = 1;
  }
}

// ════════════════════════════ the gods ════════════════════════════

const burst = (spr: HeroSpr, n: number, at: At, o: Partial<Burst> = {}): Burst => ({ spr, n, at, ...o });
const SHAPED_TOP: At = [[HX, 10], [60, 40], [160, 40]];
const ember = (rate: number, at: At = 'top'): GodFx => new Emitter({ spr: 'ember', rate, at, vx: [-14, 14], vy: [-60, -30], size: [6, 3], life: [0.7, 1.2], drag: 0.5, move: 1 });
const smoke = (rate: number, at: At, col: HeroSpr = 'smoke'): GodFx => new Emitter({ spr: col, rate, at, vx: [-8, 8], vy: [-30, -14], size: [18, 44], life: [1.2, 1.8], drag: 0.5, a: 0.5, fin: 0.3 });
const motes = (spr: HeroSpr, rate: number, at: At = 'head', o: Partial<EmitO> = {}): GodFx =>
  new Emitter({ spr, rate, at, vx: [-10, 10], vy: [-34, -16], size: [6, 3], life: [0.9, 1.5], drag: 0.6, fin: 0.25, ...o });

/** Hera's seven feathers, and the layers of a head with a wing either side (each wing's glow moves with it). */
const FEATHERS = ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6'];
const WINGS = ['wL:glow', 'wR:glow', 'glow', 'wL', 'wR', 'base'];

const GOD_SPECS: Record<string, GodSpec> = {
  // ——— GREEK ———
  hera: {
    col: '#5fd0c0',
    layers: [...FEATHERS.map((k) => `${k}:glow`), 'glow', ...FEATHERS, 'base'],
    gold: true,
    gems: true,
    fx: () => [new Fan(), new Sparkle({ col: '#7ae0ff', area: [HX, 70, 80, 60], rate: 1.2, size: 6 })],
    burst: [burst('sparkB', 6, SHAPED_TOP), burst('gold', 5, 'head'), burst('feather', 3, 'top', { speed: [60, 120], size: [12, 10], life: [0.8, 1.2], grav: 60 })],
  },
  poseidon: {
    col: '#3ab0e0',
    gold: true,
    gems: true,
    fx: () => [new Sea(), new Sparkle({ col: '#bff4ff', pts: [[HX, 6], [58, 8], [162, 8]], rate: 0.9, size: 7 })],
    burst: [burst('sparkB', 5, 'head')],
  },
  demeter: {
    col: '#e8c040',
    layers: ['e0:glow', 'e1:glow', 'e2:glow', 'glow', 'e0', 'e1', 'e2', 'base'],
    gold: true,
    gems: true,
    fx: () => [
      new Sway({ keys: ['e0', 'e1', 'e2'], piv: [[HX, 184]], amp: 0.06, hz: 1.3, gust: 0.09, kick: 0.2 }),
      motes('gold', 1.4, [[60, 30], [HX, 20], [160, 30]], { vy: [-20, -6], vx: [-16, 16] }),
      new Emitter({ spr: 'leaf', rate: 0.5, at: 'top', vx: [-20, 20], vy: [10, 30], size: [10, 12], life: [1.4, 2.2], drag: 0.4, spin: 2, fin: 0.2 }),
    ],
    burst: [burst('gold', 10, [[60, 30], [HX, 20], [160, 30]], { speed: [80, 180] }), burst('leaf', 4, 'top', { speed: [60, 120], size: [12, 12], life: [0.8, 1.3], grav: 80, frame: 0 })],
  },
  athena: {
    col: '#8aa8ff',
    layers: ['base', 'pupils'],
    gold: true,
    gems: true,
    fx: () => [new Look('pupils'), new Lids({ eyes: [[HX - 26, 83, 13], [HX + 26, 83, 13]], col: '#c8a040' }), new Rings({ col: '#ffe27a', rate: 0, r0: 60, grow: 50, life: 0.8, smackN: 2 })],
    burst: [burst('feather', 4, 'head', { speed: [60, 140], size: [12, 10], life: [0.8, 1.2], grav: 60 }), burst('sparkB', 6, [[HX - 26, 83], [HX + 26, 83]])],
  },
  apollo: {
    col: '#ffb020',
    layers: ['base'],
    gold: true,
    gems: false,
    fx: () => [
      new Rays({ c: [HX, 158], n: 10, r0: 14, r1: 44, col: '#fff2a0', a: 0.5, rate: 0.5, w: 0.5, front: true }),
      new Glow({ pts: [[HX, 158, 14]], col: '#ffd060', a: 0.5, mode: 'breathe' }),
      new Strings({ s: LYRE_STRINGS.map((dx) => [HX + dx, 46, 138] as [number, number, number]), col: '#fff6d8', w: 2.4, glow: '#ffd060', note: true }),
    ],
    burst: [burst('note', 5, [[HX, 90]], { speed: [80, 160], size: [19, 22], life: [0.8, 1.2], grav: -20 }), burst('gold', 6, [[HX, 158]])],
  },
  artemis: {
    col: '#d8e4f0',
    layers: ['base', 'arrow'],
    fx: () => [
      new Bow(),
      new Sparkle({ col: '#d8e8ff', area: [HX, 90, 96, 70], rate: 1.4, size: 6 }),
      new Glow({ pts: [[HX, 26, 10]], col: '#d8e8ff', a: 0.35, mode: 'pulse', hz: 0.6 }),
    ],
    burst: [burst('white', 8, 'head', { speed: [80, 200] }), burst('star', 3, 'top', { speed: [40, 100], frame: 1 })],
  },
  ares: {
    col: '#e0402a',
    layers: ['base'],
    fx: () => [
      new Glow({ pts: [[HX - 30, 108, 7], [HX + 30, 108, 7]], col: '#ff4a2a', a: 0.6, mode: 'ember', hot: '#fff0c0', surge: [2.5, 4.5] }),
      ember(2.2, [[60, 20], [HX, 6], [160, 20]]),
      new Sparkle({ col: '#ffd0a0', pts: [[60, 86], [160, 86], [HX, 70]], rate: 0.7, size: 6 }),
    ],
    burst: [burst('ember', 10, 'head', { speed: [140, 260], grav: 300 }), burst('spark', 5, [[HX, 86]])],
    feel: { shake: 2.2 },
  },
  aphrodite: {
    col: '#ff7ab8',
    layers: ['base', 'heart'],
    fx: () => [
      new Beat({ key: 'heart', c: [HX, 160], hz: 1 }),
      new Prism({ a: 0.3, every: [2.6, 4.5], cols: ['#ff9ad0', '#7ad8ff', '#ffe08a', '#c8a0ff'], w: 0.25, op: 'source-over' }),
      new Emitter({ spr: 'heart', rate: 0.9, at: [[HX, 150], [80, 120], [140, 120]], vx: [-12, 12], vy: [-40, -22], size: [9, 12], life: [1.2, 1.8], drag: 0.5, fin: 0.25, spin: 0 }),
      new Emitter({ spr: 'petal', rate: 0.8, at: 'top', vx: [-20, 20], vy: [8, 24], size: [9, 10], life: [1.4, 2.2], drag: 0.4, spin: 2.5, fin: 0.2 }),
    ],
    burst: [burst('heart', 7, [[HX, 156]], { speed: [90, 170], size: [12, 14], life: [0.8, 1.2], grav: -30 }), burst('petal', 6, 'head', { speed: [70, 150], size: [10, 10], life: [0.9, 1.4], grav: 60 })],
  },
  hephaestus: {
    col: '#ff8a2a',
    layers: ['base', 'hammer'],
    fx: () => [new Hammer(), smoke(0.6, [[150, 30], [100, 30]])],
    burst: [burst('ember', 6, [[134, 36]], { speed: [160, 300], grav: 520 })],
    feel: { shake: 2.6, squash: 0.03 },
  },
  hermes: {
    col: '#7be0a0',
    layers: WINGS,
    gold: true,
    gems: true,
    fx: () => [
      new Flap({ keys: ['wL', 'wR'], piv: [[72, 98], [148, 98]], amp: 0.22, idle: 0.06, hz: 3.4 }),
      new Wind({ col: '#c8ffe0', rate: 3.5, y0: 30, y1: 170, a: 0.45 }),
      new Sparkle({ col: '#7be0a0', pts: [[HX, 80], [HX, 110]], rate: 0.8, size: 6 }),
    ],
    burst: [burst('feather', 6, [[40, 60], [180, 60]], { speed: [90, 180], size: [12, 10], life: [0.7, 1.1], grav: 60 }), burst('sparkG', 5, 'head')],
  },
  dionysus: {
    col: '#9a4ad0',
    layers: ['glow', 'bunch:glow', 'base', 'bunch', 'collar'],
    gold: true,
    fx: () => [
      new Sway({ keys: ['bunch'], piv: [[HX, 40]], amp: 0.04, hz: 1.2, gust: 0.05, kick: 0.3 }),
      new Sparkle({ col: '#e8c8ff', pts: GRAPES.map(([dx, y]) => [HX + dx - 6, y - 7] as P), rate: 2.2, size: 5 }),
      new Emitter({ spr: 'bubble', rate: 1.4, at: 'below', vx: [-8, 8], vy: [-44, -24], size: [7, 11], life: [1.3, 2], drag: 0.3, fin: 0.3 }),
    ],
    burst: [burst('sparkV', 8, 'head', { speed: [100, 200] }), burst('ruby', 5, 'head', { speed: [80, 160], grav: 300 }), burst('bubble', 4, 'below', { speed: [40, 90], size: [10, 12], life: [0.9, 1.3], grav: -60 })],
  },
  hestia: {
    col: '#ff9a3a',
    layers: ['flame:glow', 'glow', 'flame', 'base'],
    gold: true,
    gems: true,
    fx: () => [new Flicker({ key: 'flame', base: [HX, 140] }), new Glow({ pts: [[HX, 118, 18]], col: '#ffd27a', a: 0.4, mode: 'ember' }), ember(2, [[80, 30], [HX, 10], [140, 30]])],
    burst: [burst('ember', 10, [[HX, 60]], { speed: [120, 220], grav: 200 })],
  },
  hades: {
    col: '#7a5aff',
    layers: ['base'],
    fx: () => [
      new Glow({ pts: [[HX - 8, 118, 5], [HX + 8, 118, 5]], col: '#9a7aff', a: 0.7, mode: 'pulse', hz: 0.8, hot: '#e8e0ff' }),
      new Wisps({ col: '#8a6aff', n: 3 }),
      new Glow({ pts: [[64, 8, 6], [156, 8, 6]], col: '#7a5aff', a: 0.4, mode: 'ember' }),
    ],
    burst: [burst('sparkV', 12, 'head', { speed: [100, 220] }), burst('smoke', 3, [[HX, 120]], { speed: [20, 60], size: [20, 50], life: [0.6, 0.9] })],
  },
  persephone: {
    col: '#ff5a7a',
    layers: ['base', 'leafL', 'leafR'],
    fx: () => [
      new Sway({ keys: ['leafL', 'leafR'], piv: [[HX - 22, 46], [HX + 22, 46]], amp: 0.1, hz: 1.5, kick: 0.35 }),
      new Seq({ pts: POM_SEEDS.map(([x, y]) => [x, y, 5] as [number, number, number]), col: '#ff5a7a', hot: '#fff0f4', a: 0.55, speed: 4 }),
      new Emitter({ spr: 'petal', rate: 0.7, at: 'top', vx: [-20, 20], vy: [8, 24], size: [9, 10], life: [1.4, 2.2], drag: 0.4, spin: 2.5, fin: 0.2 }),
    ],
    burst: [burst('ruby', 9, [[128, 126]], { speed: [100, 200], grav: 260 }), burst('petal', 6, 'head', { speed: [70, 150], size: [10, 10], life: [0.9, 1.4], grav: 60 })],
  },
  nike: {
    col: '#ffd23f',
    layers: WINGS,
    gold: true,
    gems: true,
    fx: () => [
      new Flap({ keys: ['wL', 'wR'], piv: [[104, 142], [116, 142]], amp: 0.16, idle: 0.04, hz: 2.6 }),
      new Seq({ pts: Array.from({ length: 10 }, (_, i) => [HX + Math.cos((i / 10) * TAU) * 22, 140 + Math.sin((i / 10) * TAU) * 22, 5] as [number, number, number]), col: '#fff2a0', a: 0.4, speed: 5 }),
      new Wind({ col: '#fff2c0', rate: 1.6, y0: 40, y1: 160, a: 0.35 }),
    ],
    burst: [burst('feather', 6, [[30, 80], [190, 80]], { speed: [90, 180], size: [12, 10], life: [0.7, 1.1], grav: 60 }), burst('gold', 8, 'head')],
  },
  nyx: {
    col: '#a08aff',
    layers: ['base'],
    gold: true,
    fx: () => [
      new Shooting(),
      new Sparkle({ col: '#c8b8ff', pts: [[136, 70], [146, 112], [120, 132], [88, 50]], rate: 2, size: 8 }),
      new Glow({ pts: [[92, 100, 22]], col: '#ffe8a0', a: 0.25, mode: 'breathe', hz: 0.7 }),
      smoke(0.7, 'below', 'smoke'),
      new Rings({ col: '#a08aff', rate: 0, r0: 50, grow: 60, life: 0.9, smackN: 2 }),
    ],
    burst: [burst('star', 8, 'head', { speed: [80, 180], frame: 3 })],
  },
  kratos: {
    col: '#ff6a1a',
    layers: ['crest', 'base'],
    box: TALL,
    fx: () => [
      new Billow({ key: 'crest', mode: 'cols', from: HX - 70, to: HX + 100, amp: 4 }),
      new Glow({ pts: [[HX - 18, HY + 2, 8], [HX + 18, HY + 2, 8]], col: '#ff8a2a', a: 0.6, mode: 'ember', hot: '#fff0c0', surge: [3, 5] }),
      ember(1.6, 'top'),
    ],
    burst: [burst('ember', 12, 'head', { speed: [140, 260], grav: 260 }), burst('spark', 4, [[HX, HY]])],
    feel: { shake: 2.4 },
  },
  ghostofsparta: {
    col: '#ff3a1a',
    layers: ['flames', 'base'],
    box: TALL,
    handleInBase: true,
    fx: () => [
      new Flicker({ key: 'flames', base: [HX, HY + 110], amt: 1.6 }),
      new Glow({ pts: [[HX - 18, HY + 2, 9], [HX + 18, HY + 2, 9]], col: '#ff4a2a', a: 0.7, mode: 'ember', hot: '#ffffff', surge: [2.5, 4.5] }),
      ember(3, 'head'),
      new Emitter({ spr: 'dust', rate: 0.8, at: 'top', vx: [-10, 10], vy: [-30, -12], size: [10, 26], life: [1, 1.5], drag: 0.5, a: 0.45, fin: 0.3 }),
    ],
    burst: [burst('ember', 14, 'head', { speed: [160, 280], grav: 260 }), burst('dust', 3, 'head', { speed: [30, 80], size: [20, 44], life: [0.6, 0.9] })],
    feel: { shake: 2.6 },
  },
  leonidas: {
    col: '#c9873a',
    layers: ['cloak', 'base'],
    box: TALL,
    fx: () => [
      new Billow({ key: 'cloak', mode: 'rows', from: HY + 20, to: HY + 262, amp: 1.9 }),
      new Glow({ pts: [[HX - 16, HY + 2, 6], [HX + 16, HY + 2, 6]], col: '#ffd27a', a: 0.45, mode: 'breathe' }),
      new Sweep({ c: [HX - 52, HY + 92], r: 44, every: [3, 5] }),
      new Emitter({ spr: 'dust', rate: 0.6, at: 'below', vx: [-14, 14], vy: [-16, -4], size: [10, 24], life: [1, 1.5], drag: 0.6, a: 0.35, fin: 0.3 }),
    ],
    burst: [burst('spark', 6, [[HX - 52, HY + 92]], { speed: [140, 260] }), burst('dust', 3, 'below', { speed: [30, 80], size: [20, 40], life: [0.5, 0.8] })],
    feel: { shake: 2 },
  },
  hotgates: {
    col: '#ff6a2a',
    layers: ['cloak', 'base'],
    box: TALL,
    fx: () => [
      new Billow({ key: 'cloak', mode: 'rows', from: HY + 20, to: HY + 262, amp: 2.3 }),
      new Glow({ pts: [[HX - 16, HY + 2, 6], [HX + 16, HY + 2, 6]], col: '#ff8a3a', a: 0.6, mode: 'ember', surge: [3, 5] }),
      new Sweep({ c: [HX - 52, HY + 92], r: 44, every: [3.5, 6], col: '#ffd0a0' }),
      ember(2.4, 'head'),
      smoke(0.8, 'top'),
    ],
    burst: [burst('ember', 12, 'head', { speed: [140, 260], grav: 260 }), burst('spark', 5, [[HX - 52, HY + 92]], { speed: [140, 260] })],
    feel: { shake: 2.2 },
  },

  // ——— NORSE ———
  odin: {
    col: '#7ab8ff',
    runes: true,
    fx: () => [
      new Lids({ eyes: [[86, 50, 11]], col: '#9a6a3e', every: [2.5, 5] }),
      new Glow({ pts: [[86, 50, 6]], col: '#7ab8ff', a: 0.6, mode: 'breathe', hot: '#e8f4ff' }),
      new Ravens('#7ab8ff'),
    ],
    burst: [burst('featherK', 6, 'head', { speed: [80, 160], size: [12, 10], life: [0.8, 1.2], grav: 60 }), burst('sparkB', 5, [[86, 50]])],
  },
  odinascended: {
    col: '#ffd23f',
    runes: true,
    fx: () => [
      new Rays({ c: [86, 50], n: 7, r0: 8, r1: 150, col: '#ffe680', a: 0.22, down: true, w: 0.25, front: true }),
      new Lids({ eyes: [[86, 50, 11]], col: '#3a3048', every: [3, 6] }),
      new Glow({ pts: [[86, 50, 7]], col: '#ffd23f', a: 0.75, mode: 'breathe', hot: '#ffffff' }),
      new Ravens('#ffd23f'),
      new Sparkle({ col: '#ffe680', pts: [[50, 50], [172, 60], [HX, 16]], rate: 1.2, size: 7 }),
    ],
    burst: [burst('featherK', 6, 'head', { speed: [80, 160], size: [12, 10], life: [0.8, 1.2], grav: 60 }), burst('gold', 8, [[86, 50]])],
  },
  thor: {
    col: '#9fd8ff',
    runes: true,
    fx: () => [new EdgeArcs({ poly: HAMMER, col: '#6cc4ff', rate: 4, jag: 10 }), new Strike('#9fd8ff'), motes('spark', 1.2, 'top', { vy: [-70, -40], size: [5, 2], life: [0.3, 0.5] })],
    burst: [burst('spark', 10, 'head', { speed: [180, 320], grav: 400 })],
    flash: 0.28,
  },
  thorunleashed: {
    col: '#ffe680',
    runes: true,
    fx: () => [
      new EdgeArcs({ poly: HAMMER, col: '#ffd23f', hot: '#fffbe0', rate: 7, jag: 13, w: 1.2 }),
      new Arcs({ col: '#bfe8ff', rate: 1.4, r: R + 4, len: 0.5, jag: 14 }),
      new Strike('#ffe680'),
      motes('gold', 1.6, 'top', { vy: [-70, -40], size: [5, 2], life: [0.3, 0.5] }),
    ],
    burst: [burst('spark', 12, 'head', { speed: [180, 320], grav: 400 }), burst('gold', 6, 'head')],
    flash: 0,
  },
  loki: {
    col: '#7be04a',
    runes: true,
    fx: () => [
      new Illusion(),
      new Glow({ pts: [[HX - 38, 95, 7], [HX + 38, 95, 7]], col: '#9bff6a', a: 0.55, mode: 'ember', hot: '#f0fff0' }),
      new Wisps({ col: '#7be04a', n: 2 }),
    ],
    burst: [burst('sparkG', 10, 'head', { speed: [100, 220] }), burst('smoke', 2, 'head', { speed: [20, 60], size: [24, 50], life: [0.6, 0.9] })],
  },
  frigg: {
    col: '#c8b0ff',
    runes: true,
    fx: () => [
      new Thread({ path: [[92, 80], [128, 84], [92, 92], [128, 96], [92, 104], [128, 108], [92, 116], [128, 118], [150, 126], [148, 92], [140, 66], [162, 60]], col: '#e0d0ff' }),
      smoke(0.5, 'below', 'mist'),
      new Sparkle({ col: '#e0d0ff', area: [HX, HY, 70, 70], rate: 1, size: 6 }),
    ],
    burst: [burst('sparkV', 8, 'rim'), burst('white', 5, 'head')],
  },
  freya: {
    col: '#ffb0d8',
    layers: WINGS,
    runes: true,
    fx: () => [
      new Flap({ keys: ['wL', 'wR'], piv: [[100, 118], [120, 118]], amp: 0.2, idle: 0.06, hz: 2.8 }),
      new Glow({ pts: [[HX - 11, 48, 4], [HX + 11, 48, 4]], col: '#ffb0d8', a: 0.5, mode: 'breathe' }),
      new Seq({ pts: Array.from({ length: 7 }, (_, i) => [HX + Math.cos(0.3 + (i / 6) * (Math.PI - 0.6)) * 22, 96 + Math.sin(0.3 + (i / 6) * (Math.PI - 0.6)) * 22, 4] as [number, number, number]), col: '#ffe680', a: 0.35, speed: 4 }),
      new Emitter({ spr: 'petal', rate: 0.6, at: 'top', vx: [-20, 20], vy: [8, 24], size: [9, 10], life: [1.4, 2.2], drag: 0.4, spin: 2.5, fin: 0.2 }),
    ],
    burst: [burst('feather', 6, [[20, 70], [200, 70]], { speed: [80, 160], size: [12, 10], life: [0.7, 1.1], grav: 60 }), burst('gold', 6, [[HX, 110]])],
  },
  freyr: {
    col: '#ffd23f',
    runes: true,
    fx: () => [
      new Seq({ pts: Array.from({ length: 9 }, (_, i) => [46 + i * 15, 60 - Math.sin((i / 8) * Math.PI) * 8 - 6, 6] as [number, number, number]), col: '#ffe680', hot: '#ffffff', a: 0.4, speed: 5 }),
      new Glow({ pts: [[154, 80, 5]], col: '#ffd23f', a: 0.55, mode: 'breathe' }),
      new Emitter({ spr: 'mist', rate: 0.45, at: [[204, 104]], vx: [20, 40], vy: [-8, 4], size: [10, 26], life: [0.6, 0.9], drag: 1.5, a: 0.5, fin: 0.2 }),
      motes('gold', 1, 'head'),
    ],
    burst: [burst('coin', 6, 'head', { speed: [100, 200], grav: 420, size: [10, 10] }), burst('mist', 2, [[204, 104]], { speed: [60, 100], size: [16, 36], life: [0.4, 0.6] })],
  },
  tyr: {
    col: '#ff6a4a',
    runes: true,
    fx: () => [new Sweep({ poly: BLADE, every: [2.4, 4], col: '#fff2e8', a: 0.75 }), ember(1.2, [[HX, 8]]), new Glow({ pts: [[HX, 4, 6]], col: '#ffd0c0', a: 0.3, mode: 'pulse', hz: 0.8 })],
    burst: [burst('spark', 8, [[HX, 30], [HX, 70], [HX, 110]], { speed: [140, 260] }), burst('ember', 5, [[HX, 8]])],
    flash: 0.3,
  },
  heimdall: {
    col: '#ffe680',
    runes: true,
    fx: () => [new Horn(), new Prism({ a: 0.25, every: [3.5, 6], w: 0.3, op: 'source-over' }), new Sparkle({ col: '#fff2c0', pts: [[150, 34], [36, 150], [60, 70]], rate: 0.8, size: 6 })],
    burst: [burst('star', 6, [[160, 34]], { speed: [100, 200] }), burst('gold', 5, [[150, 34]])],
  },
  baldur: {
    col: '#fff2a0',
    layers: ['rays:glow', 'glow', 'rays', 'base'],
    runes: true,
    fx: () => [
      new Spin({ key: 'rays', c: [HX, 96], rate: 0, kick: 2.6, rock: 0.07, spring: true }),
      new Rays({ c: [HX, 96], n: 12, r0: 50, r1: 118, col: '#fff2a0', a: 0.22, rate: -0.1, w: 0.35 }),
      new Glow({ pts: [[HX, 96, 26]], col: '#fff6c0', a: 0.45, mode: 'breathe', hz: 0.8 }),
      motes('gold', 1.5, 'head'),
    ],
    burst: [burst('gold', 10, 'head', { speed: [100, 220] }), burst('white', 5, [[HX, 96]])],
  },
  hel: {
    col: '#a8f0d8',
    runes: true,
    fx: () => [
      new Glow({ pts: [[144, 92, 8]], col: '#a8f0d8', a: 0.65, mode: 'pulse', hz: 0.7, hot: '#f0fff8' }),
      new HelEye(),
      smoke(0.9, 'below', 'mist'),
      new Sparkle({ col: '#c8fff0', pts: [[110, 40], [110, 100], [110, 160]], rate: 0.8, size: 6 }),
    ],
    burst: [burst('mist', 4, 'head', { speed: [30, 80], size: [24, 56], life: [0.6, 0.9] }), burst('white', 6, [[144, 92]])],
  },
  njord: {
    col: '#5fd8ff',
    layers: ['glow', 'sail:glow', 'base', 'sail'],
    runes: true,
    fx: () => [new Billow({ key: 'sail', mode: 'fill', from: 14, to: 120, amp: 1.4, cx: HX }), new Waves()],
    burst: [burst('drop', 6, 'below', { speed: [100, 200], grav: 500, size: [9, 6] })],
  },
  skadi: {
    col: '#d8f6ff',
    layers: ['flake:glow', 'glow', 'flake', 'base'],
    fx: () => [
      new Spin({ key: 'flake', c: [HX, 98], rate: 0, kick: 4.5, rock: 0.1, spring: true }),
      new Sparkle({ col: '#ffffff', area: [HX, 98, 84, 84], rate: 2.4, size: 6 }),
      new Emitter({ spr: 'flake', rate: 1.6, at: 'top', vx: [-14, 14], vy: [14, 34], size: [7, 9], life: [1.4, 2.2], drag: 0.3, spin: 1.5, fin: 0.2 }),
      smoke(0.5, 'below', 'mist'),
    ],
    burst: [burst('flake', 10, 'head', { speed: [100, 220], size: [9, 7] }), burst('white', 6, [[HX, 98]])],
  },
  idun: {
    col: '#ffd23f',
    layers: ['base', 'leaf'],
    runes: true,
    gold: true,
    fx: () => [
      new Sway({ keys: ['leaf'], piv: [[122, 40]], amp: 0.06, hz: 1.5, kick: 0.35 }),
      new Sparkle({ col: '#fff2a0', area: [HX, 112, 70, 50], rate: 1.6, size: 6 }),
      motes('gold', 1.2, 'head'),
    ],
    burst: [burst('gold', 10, 'head', { speed: [100, 200] }), burst('leaf', 4, [[144, 30]], { speed: [60, 120], size: [12, 12], life: [0.8, 1.2], grav: 80, frame: 0 })],
  },
  bragi: {
    col: '#ffb070',
    runes: true,
    fx: () => [new Strings({ s: HARP_STRINGS, col: '#ffd8a8', w: 2.2, glow: '#ffb070', note: true }), new Glow({ pts: [[188, 66, 4]], col: '#ffb070', a: 0.5, mode: 'breathe' })],
    burst: [burst('note', 6, [[120, 100]], { speed: [80, 160], size: [19, 22], life: [0.8, 1.2], grav: -20 }), burst('gold', 4, 'head')],
  },

  // ——— the final trophy ———
  pizzagods: {
    col: '#ffd23f',
    layers: ['burst', 'halo', 'base', 'rays', 'slice', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'finish'],
    fx: () => [
      new Spin({ key: 'burst', c: [HX, HY], rate: 0.12, kick: 1.2, alpha: 0.55 }),
      new Rays({ c: [HX, HY], n: 16, r0: R * 0.7, r1: R + 22, col: '#fff2a8', a: 0.5, rate: -0.08, w: 0.45 }),
      new Rays({ c: [HX, HY], n: 9, r0: R * 0.75, r1: R + 22, col: '#ffd0f0', a: 0.25, rate: 0.13, w: 0.3 }),
      new Halo(),
      new Spin({ key: 'rays', c: [HX, HY + 4], rate: 0.35, kick: 5 }),
      new Radiance(),
      new Prism({ a: 0.22, every: [2.2, 3.6], op: 'source-over' }),
      new Crown(),
      new Mandala2(),
      new Sparkle({ col: '#ffffff', area: [HX, HY, R + 6, R + 6], rate: 2.4, size: 8, smackN: 6 }),
      new Rings({ col: '#ffe27a', rate: 0, r0: 40, grow: 70, life: 0.9, smackN: 3, front: true }),
    ],
    burst: [burst('star', 10, 'rim', { speed: [120, 240] }), burst('gold', 10, 'head', { speed: [100, 220] }), burst('confetti', 6, 'top', { speed: [80, 160], grav: 200, size: [8, 8] })],
    flash: 0.06,
  },
};

/** Thor's hammer head and Tyr's blade (for the lightning crawling its edge, the light running up it). */
const HAMMER: P[] = [[22, 30], [42, 14], [178, 14], [198, 30], [198, 116], [178, 132], [42, 132], [22, 116]];
const BLADE: P[] = [[HX, 2], [HX + 22, 28], [HX + 20, 132], [HX - 20, 132], [HX - 22, 28]];

/** A band of light sweeping over a round part (Leonidas's shield) or a polygon (Tyr's blade). */
class Sweep implements GodFx {
  private run: Every;
  private p = -1;
  constructor(private o: { c?: P; r?: number; poly?: P[]; every?: [number, number]; col?: string; a?: number }) {
    const [a, b] = o.every ?? [3, 5];
    this.run = new Every(a, b, 0.9);
  }
  update(_L: GodLive, dt: number): void {
    this.p = this.run.tick(dt);
  }
  front(_L: GodLive, ctx: Ctx): void {
    if (this.p < 0) return;
    const o = this.o;
    ctx.save();
    ctx.beginPath();
    let x0: number;
    let y0: number;
    let x1: number;
    let y1: number;
    if (o.poly) {
      o.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      x0 = Math.min(...o.poly.map((p) => p[0]));
      x1 = Math.max(...o.poly.map((p) => p[0]));
      y0 = Math.min(...o.poly.map((p) => p[1]));
      y1 = Math.max(...o.poly.map((p) => p[1]));
    } else {
      const [cx, cy] = o.c!;
      const r = o.r!;
      ctx.arc(cx, cy, r, 0, TAU);
      x0 = cx - r;
      x1 = cx + r;
      y0 = cy - r;
      y1 = cy + r;
    }
    ctx.clip();
    // up the blade, or across the shield
    const a = (o.a ?? 0.6) * Math.sin(this.p * Math.PI);
    const col = o.col ?? '#fff2d8';
    const g = o.poly ? ctx.createLinearGradient(0, y1 - (y1 - y0 + 60) * this.p, 0, y1 - (y1 - y0 + 60) * this.p + 60) : ctx.createLinearGradient(x0 + (x1 - x0 + 60) * this.p - 60, y0, x0 + (x1 - x0 + 60) * this.p, y1);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    ctx.restore();
  }
  smack(): void {
    this.run.fire();
  }
}

/** The God Peel's ring of light: gold sparks turning round the rim in two rings, the pantheons' marks between them
 *  (Greek keys and runes, in turn), bright on a smack. */
class Mandala2 implements GodFx {
  private f = 0;
  update(_L: GodLive, dt: number): void {
    this.f *= Math.exp(-dt / 0.4);
  }
  back(L: GodLive, ctx: Ctx): void {
    const t = L.t;
    const pulse = 0.7 + 0.3 * Math.sin(t * 1.9) + this.f;
    lighter(ctx, () => {
      ctx.lineCap = 'round';
      for (const [rr, sp, n, len] of [
        [R + 9, 0.5, 36, 0.09],
        [R + 18, -0.32, 28, 0.08],
      ] as const) {
        for (let k = 0; k < n; k++) {
          const a = t * sp + (k / n) * TAU;
          // (only the top and sides: the handle meets the head below)
          if (Math.sin(a) > 0.75) continue;
          const fl = 0.5 + 0.5 * noise1(t * 5 + k * 3.1);
          ctx.beginPath();
          ctx.arc(HX, HY, rr, a, a + len);
          ctx.strokeStyle = rgba(k % 4 ? '#ffd23f' : '#ffffff', Math.min(1, 0.6 * fl * pulse));
          ctx.lineWidth = 2.6;
          ctx.stroke();
        }
      }
      for (let k = 0; k < 10; k++) {
        const a = -t * 0.22 + (k / 10) * TAU;
        if (Math.sin(a) > 0.7) continue;
        const x = HX + Math.cos(a) * (R + 13.5);
        const y = HY + Math.sin(a) * (R + 13.5);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI / 2);
        if (k % 2) {
          runeAt(ctx, k, 0, 0, 0, 0.45);
        } else {
          // a little Greek key
          ctx.beginPath();
          ctx.moveTo(-3, 2);
          ctx.lineTo(-3, -2);
          ctx.lineTo(2, -2);
          ctx.lineTo(2, 1);
          ctx.lineTo(0, 1);
        }
        ctx.strokeStyle = rgba('#fff6c8', 0.75 * pulse);
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.restore();
      }
    });
  }
  smack(): void {
    this.f = 1;
  }
}

/** A god peel's spec (null for a peel that isn't a living god: Zeus has his own living blade in animatedLooks.ts). */
export function godSpecOf(peelId: string): GodSpec | null {
  const id = peelId.startsWith('hero:') ? peelId.slice(5) : peelId.startsWith('god:') ? peelId.slice(4) : '';
  return GOD_SPECS[id] ?? null;
}

// ════════════════════════════ the rig ════════════════════════════

export interface GodMini {
  id: string;
  spec: GodSpec;
  RR: number;
  box: typeof BOX;
  /** The head's layers by key ('base': the head without its moving pieces). */
  layers: Map<string, Lyr | null>;
  /** The gold relief on the head, lit (the Greek heads). */
  gold: Lyr | null;
  /** The runes, each lit on its own layer. */
  runes: { m: RuneMark; l: Lyr }[];
  gems: GemMark[];
}

/** A god's rig: its head painted without its moving pieces, each piece alone, the gold lit and each rune lit. */
export function* godMiniSteps(peelId: string, look: PeelLook, RR: number): Generator<void, GodMini | null> {
  const spec = godSpecOf(peelId);
  if (!spec) return null;
  const custom = look.custom;
  if (!custom) return null;
  const box = spec.box ?? BOX;
  const keys = (spec.layers ?? ['base']).filter((k) => k !== 'base');
  const seen: PartsSeen = { runes: [], gems: [] };
  const layers = new Map<string, Lyr | null>();
  const base = cropLayer(
    RR,
    (ctx) => {
      paintPart(null, keys, () => custom(ctx), seen);
      if (spec.handleInBase) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        drawPeelHandle(ctx, look);
        ctx.restore();
      }
    },
    box,
  );
  if (!base) return null;
  layers.set('base', base);
  yield;
  for (const k of keys) {
    layers.set(k, cropLayer(RR, (ctx) => paintPart(k, [], () => custom(ctx)), box));
    yield;
  }
  // the gold relief: the head's own gold, picked out of the base by its colour (warm, bright, saturated)
  let gold: Lyr | null = null;
  if (spec.gold) {
    const [c, ctx] = makeLike(base);
    ctx.drawImage(base.c, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const isGold = r > 150 && g > 90 && b < g * 0.8 && r - b > 70 && px[i + 3] > 200;
      px[i + 3] = isGold ? Math.min(255, (r - b - 50) * 2.5) : 0;
    }
    ctx.putImageData(d, 0, 0);
    gold = { c, x: base.x, y: base.y, w: base.w, h: base.h };
    yield;
  }
  // each rune lit hot, on a layer of its own
  const runes: { m: RuneMark; l: Lyr }[] = [];
  if (spec.runes)
    for (const m of seen.runes) {
      const l = cropLayer(
        RR,
        (ctx) => {
          ctx.save();
          ctx.shadowColor = m.col;
          ctx.shadowBlur = 14;
          runeAt(ctx, m.idx % RUNES.length, m.x, m.y, m.ang, m.s);
          ctx.strokeStyle = mix(m.col, '#ffffff', 0.55);
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.stroke();
          ctx.restore();
        },
        box,
      );
      if (l) runes.push({ m, l });
    }
  return { id: peelId, spec, RR, box, layers, gold, runes, gems: spec.gems ? seen.gems : [] };
}

function makeLike(l: Lyr): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = l.c.width;
  c.height = l.c.height;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

/** The box a god's surface covers. */
export const godBox = (peelId: string) => godSpecOf(peelId)?.box ?? BOX;
export const GOD_FEEL: HeroFeel = { ...HERO_FEEL, squash: 0.04, k: 760, c: 22, wob: 0.016, shake: 1.4, sway: 0.3, wk: 280, wc: 18 };

// ════════════════════════════ the motion ════════════════════════════

const scratches = new Map<string, [HTMLCanvasElement, Ctx]>();

export class GodLive implements FxHost {
  t = crand() * 20;
  sm = 9;
  menu = true;
  emit: HeroEmit | null = null;
  readonly glows: HeroGlow[] = [];
  kickQ = 0;
  speed = 0;
  vx = 0;
  rage = 0;
  heat = 0;
  phase = 0;
  scale = 1;
  jx = 0;
  jy = 0;
  readonly shape: PeelShape = 'round';
  readonly mini: GodMini;
  readonly spec: GodSpec;
  private fx: GodFx[];
  private goldRun = new Every(3, 5.5, 1.1);
  private goldP = -1;
  private flash = 0;
  private gemTw: Sparkle | null = null;

  constructor(mini: GodMini) {
    this.mini = mini;
    this.spec = mini.spec;
    this.fx = mini.spec.fx?.() ?? [];
    if (mini.gems.length) this.gemTw = new Sparkle({ col: '#ffffff', pts: mini.gems.map((g) => [g.x - g.r * 0.3, g.y - g.r * 0.3] as P), rate: 1.1, size: 6, smackN: 4 });
    // a flare of the god's colour behind the head on a smack
    this.glows.push({ x: HX, y: HY, rx: R * 1.5, ry: R * 1.5, color: parseInt(mini.spec.col.slice(1), 16), a: 0 });
  }

  emitP(spr: HeroSpr, x: number, y: number, vx: number, vy: number, s0: number, s1: number, life: number, o?: Parameters<HeroEmit>[8]): void {
    this.emit?.(spr, x, y, vx, vy, s0, s1, life, o);
  }

  scratch(name: string, w: number, h: number): [HTMLCanvasElement, Ctx] {
    const key = `${name}:${w}x${h}`;
    let s = scratches.get(key);
    if (!s) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      scratches.set(key, (s = [c, c.getContext('2d')!]));
    }
    return s;
  }

  update(dt: number, vx = 0, vy = 0): void {
    this.t += dt;
    this.sm += dt;
    this.vx = vx;
    this.speed = Math.hypot(vx, vy);
    this.flash *= Math.exp(-dt / 0.28);
    this.goldP = this.goldRun.tick(dt);
    this.glows[0].a = 0.5 * this.flash;
    this.rage = 0;
    this.jx = this.jy = 0;
    this.gemTw?.update(this, dt);
    for (const f of this.fx) f.update?.(this, dt);
    if (this.rage > 0) {
      this.jx = (crand() - 0.5) * 2.4 * this.rage;
      this.jy = (crand() - 0.5) * 2.4 * this.rage;
    }
  }

  smack(): void {
    this.sm = 0;
    this.flash = 1;
    this.gemTw?.smack();
    for (const f of this.fx) f.smack?.(this);
    // the god's burst
    const n = reduced() ? 0.4 : 1;
    const m = this.menu ? 0.6 : 1;
    for (const b of this.spec.burst) {
      for (let i = 0; i < Math.round(b.n * n); i++) {
        const [x, y] = pointAt(b.at);
        const out = Math.atan2(y - HY, x - HX) + (crand() - 0.5) * 0.9;
        const v = rnd(...(b.speed ?? [100, 200])) * m;
        const s = b.size ?? [8, 4];
        this.emitP(b.spr, x, y, Math.cos(out) * v, Math.sin(out) * v - (b.up ?? 40), s[0], s[1], rnd(...(b.life ?? [0.45, 0.8])), { grav: b.grav ?? 120, drag: b.drag ?? 1.4, frame: b.frame });
      }
    }
  }

  /** Draw the god (ctx in peel units). */
  draw(ctx: Ctx): void {
    const m = this.mini;
    const sp = this.spec;
    ctx.save();
    if (this.jx || this.jy) ctx.translate(this.jx, this.jy);
    for (const f of this.fx) f.back?.(this, ctx);
    for (const key of sp.layers ?? ['base']) {
      const l = m.layers.get(key);
      if (!l) continue;
      // (a part's glow moves with it)
      const mk = key.endsWith(':glow') ? key.slice(0, -5) : key;
      if (!this.fx.some((f) => f.layer?.(this, ctx, mk, l))) drawL(ctx, l);
    }
    const base = m.layers.get('base')!;
    // the gold relief catching a light now and then
    if (m.gold && this.goldP >= 0) sweepLayer(this, ctx, m.gold, -0.3 + this.goldP * 1.6, ['#fff6d8', '#ffffff', '#fff6d8'], 0.5 * Math.sin(this.goldP * Math.PI), 0.13);
    // the runes lighting in sequence, all at once on a smack
    if (m.runes.length) {
      const n = m.runes.length;
      const ph = (this.t * 1.2) % (n + 2.5);
      const hit = this.sm < 0.9 ? 1 - this.sm / 0.9 : 0;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      m.runes.forEach(({ l }, i) => {
        const k = Math.exp(-Math.pow(ph - i, 2) / 0.7);
        const a = Math.min(1, 0.12 + 0.12 * Math.sin(this.t * 1.7 + i) + 0.85 * k + hit);
        if (a < 0.02) return;
        ctx.globalAlpha = a;
        drawL(ctx, l);
      });
      ctx.restore();
    }
    // the gems breathing
    if (m.gems.length) {
      lighter(ctx, () => m.gems.forEach((g, i) => glowDot(ctx, g.x, g.y, g.r * 2, g.col, 0.18 + 0.14 * Math.sin(this.t * 2.2 + i * 1.7) + this.flash * 0.15)));
      this.gemTw!.front(this, ctx);
    }
    // a smack: the head flashes in the god's colour, the gold flares white
    if (this.flash > 0.02) {
      flashLayer(this, ctx, base, sp.col, (sp.flash ?? 0.12) * this.flash);
      if (m.gold) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.14 * this.flash;
        drawL(ctx, m.gold);
        ctx.restore();
      }
    }
    for (const f of this.fx) f.front?.(this, ctx);
    ctx.restore();
  }
}

// ════════════════════════════ sprites the gods throw ════════════════════════════

/** A little heart (Aphrodite's): lit pink, an ink edge, a glint. */
export function drawHeart(ctx: Ctx, i: number): void {
  const col = ['#ff7ab8', '#ff4a6a'][i];
  ctx.save();
  ctx.translate(12, 13);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-12, -1, -6, -10, 0, -4);
    ctx.bezierCurveTo(6, -10, 12, -1, 0, 7);
    ctx.closePath();
  };
  path();
  const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 10);
  g.addColorStop(0, shade(col, 0.5));
  g.addColorStop(0.6, col);
  g.addColorStop(1, shade(col, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,16,40,0.85)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ellipse(ctx, -3.5, -3, 2, 1.2, -0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
  ctx.restore();
}

/** A petal: pink or white, curled, lit from the top left. */
export function drawPetal(ctx: Ctx, i: number): void {
  const c = [['#ffe0ee', '#ff9ac8', '#c85a8a'], ['#ffffff', '#f4e8f0', '#b8a0b0'], ['#ffd0dc', '#ff6a8a', '#a83a5a']][i];
  ctx.save();
  ctx.translate(12, 12);
  ctx.rotate(0.4 * i - 0.3);
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.bezierCurveTo(-6, -8, 6, -8, 8, 0);
  ctx.bezierCurveTo(4, 6, -4, 7, -8, 2);
  ctx.closePath();
  const g = ctx.createLinearGradient(-6, -6, 6, 6);
  g.addColorStop(0, c[0]);
  g.addColorStop(0.55, c[1]);
  g.addColorStop(1, c[2]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(c[2], 0.8);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
}

/** A raven's feather: blue-black, a sheen on its vane. */
export function drawRavenFeather(ctx: Ctx, i: number): void {
  ctx.save();
  ctx.translate(12, 12);
  ctx.rotate(i ? 0.6 : -0.4);
  ctx.beginPath();
  ctx.moveTo(-10, 1);
  ctx.quadraticCurveTo(-1, -7, 10, -1);
  ctx.quadraticCurveTo(0, 5, -10, 1);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -6, 0, 5);
  g.addColorStop(0, '#5a6a8a');
  g.addColorStop(0.45, '#22202c');
  g.addColorStop(1, '#0c0a10');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(122,184,255,0.45)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-11, 1.5);
  ctx.quadraticCurveTo(0, -1, 9, -1.5);
  ctx.strokeStyle = 'rgba(160,170,200,0.8)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}
