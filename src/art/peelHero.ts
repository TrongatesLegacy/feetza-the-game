// Living hero peels (a crafted kind, 'hero': src/art/peelCraft.ts runs them). No frame, no window: the head IS the
// hero, and it comes alive from its own parts (src/art/heroHeads.ts paints each on a layer of its own):
// - the cape billows (rows drawn with a travelling wave, the shoulders held, folds of light and shade moving across
//   it, a swing blowing it back), wings flap, antennae and cat ears twitch, wasp wings buzz, flame crowns flicker,
//   a tail sways and flicks;
// - eyes blink (or narrow, behind a mask's lenses), glowing eyes breathe, heat vision charges;
// - the emblem's glyph spins, flips like a thrown shield, beats, swings, bobs, springs or catches a sweep of light;
// - and the hero's power plays on and round the head, from the power families below (lightning crackling round the
//   rim, webs strung to the head, embers rising, frost spilling, a mandala turning behind, a lasso circling, speed
//   ghosts and lines, a sonar's rings, the lamp's light, a reticle locking on, bats flitting past …).
// A smack lands in the hero's style: an impact word bursts out (a comic sound of our own: POW!, KRAK!, BOING! …),
// with the power's own burst (heat beams, a repulsor ring, claw slashes, a bolt from above, cards, a web shot).
// Specs are data per hero (HERO_SPECS), grouped by the power families' effects; the variants build on their base
// hero's. Everything cosmetic uses crand(). Every costume and emblem is the heads' own parody design.

import { PEEL_HEAD, headPath, sparkleStar, type PeelShape } from './peelArt';
import { drawHeroPart, heroArtOf, heroPatternLit, type HeroArt, type HeroPart } from './heroHeads';
import { INK } from './feetCommon';
import { ellipse, makeCanvas, mix, rgba, shade, type Ctx } from './util';
import { crand } from '../systems/cosmeticRandom';
import { noise1 } from '../game/liveKit';
import { save } from '../systems/save';

const { x: HX, y: HY, r: R } = PEEL_HEAD;
const EYE_Y = HY - 12;
const EYE_DX = 24;
const EMB_Y = HY + 58;

/** The box a hero's surface covers (peel units): the head, its ears and hats, and the cape down past the head. */
export const HERO_BOX = { x: 0, y: 0, w: 220, h: 252 };
const B = HERO_BOX;

const reduced = () => !!save.settings.reducedMotion;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const rnd = (a: number, b: number) => a + crand() * (b - a);
const TAU = Math.PI * 2;

// ════════════════════════════ the impact words ════════════════════════════

type WordStyle = [fill: string, edge: string, text: string];
const ST: Record<string, WordStyle> = {
  yellow: ['#ffe14a', '#ff9a1c', '#e0242f'],
  red: ['#ff6a4a', '#c8102e', '#fff2a0'],
  cyan: ['#a8f0ff', '#3aa8e8', '#1f3fa8'],
  green: ['#a8e85a', '#3a9a2a', '#5a1a8a'],
  white: ['#ffffff', '#c8ccd8', '#1a1418'],
  pink: ['#ffa8e0', '#e04aa8', '#5a0a3a'],
  orange: ['#ffb84a', '#e0601a', '#7a1008'],
  purple: ['#d8b8ff', '#8a5ad8', '#2a0a5a'],
  ice: ['#e4f8ff', '#8ac8f0', '#1f5ab8'],
  silver: ['#eef2f6', '#9aa3ad', '#2a2d3a'],
  gold: ['#ffd23f', '#c88a10', '#7a1a10'],
  brown: ['#f4dcb0', '#b07a3a', '#5a2a10'],
  blue: ['#6ab0ff', '#2a5ad8', '#ffffff'],
};
/** The impact words (our own comic sounds), each in its burst's colours: frames of the word sprite. */
export const WORDS: [string, WordStyle][] = [
  ['POW!', ST.yellow],
  ['BAM!', ST.orange],
  ['WHAM!', ST.red],
  ['ZAP!', ST.cyan],
  ['KRAK!', ST.blue],
  ['BOOM!', ST.orange],
  ['FWOOSH!', ST.orange],
  ['SHING!', ST.silver],
  ['BOING!', ST.pink],
  ['SPLAT!', ST.white],
  ['THWACK!', ST.yellow],
  ['ZZZT!', ST.yellow],
  ['BZZZ!', ST.green],
  ['SMASH!', ST.green],
  ['CRUNCH!', ST.brown],
  ['CLANG!', ST.silver],
  ['WHOOSH!', ST.ice],
  ['TWANG!', ST.purple],
  ['THUNK!', ST.brown],
  ['POOF!', ST.purple],
  ['NOM!', ST.brown],
  ['ORDER!', ST.purple],
  ['I AM CRUST!', ST.green],
  ['BLAM!', ST.red],
  ['BRRR!', ST.ice],
  ['SPLOOSH!', ST.cyan],
  ['KA-POW!', ST.yellow],
  ['SKREE!', ST.gold],
  ['RRRAH!', ST.green],
  ['PING!', ST.white],
  ['ZWOOM!', ST.pink],
  ['BOP!', ST.orange],
  ['HISS!', ST.purple],
  ['TA-DA!', ST.gold],
  ['SPROING!', ST.pink],
  ['SQUELCH!', ST.green],
  ['OOF!', ST.red],
];
const W = Object.fromEntries(WORDS.map(([w], i) => [w.replace(/[^A-Z]/g, ''), i])) as Record<string, number>;
export const WORD_W = 100;
export const WORD_H = 64;

/** One impact word: a jagged comic burst (lit from the top left, an ink edge), the word in bold over it. */
export function drawWord(ctx: Ctx, i: number): void {
  const [text, [fill, edge, tc]] = WORDS[i];
  const cx = WORD_W / 2;
  const cy = WORD_H / 2;
  // the burst: points alternating out and in round an ellipse, a little uneven
  const n = 14;
  const pts: [number, number][] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = (k / (n * 2)) * TAU - Math.PI / 2;
    const out = k % 2 === 0;
    const wob = 0.92 + 0.08 * Math.sin(k * 2.7 + i);
    const rr = out ? wob : 0.74 + 0.05 * Math.cos(k * 1.9 + i);
    pts.push([cx + Math.cos(a) * 47 * rr, cy + Math.sin(a) * 29 * rr]);
  }
  const path = () => {
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  // a soft shadow under it, then the burst: light, lit from the top left, the hero's colour only on its border
  void tc;
  ctx.save();
  ctx.translate(1.5, 2);
  path();
  ctx.fillStyle = 'rgba(42,24,16,0.35)';
  ctx.fill();
  ctx.restore();
  path();
  const g = ctx.createRadialGradient(cx - 12, cy - 10, 2, cx, cy, 48);
  g.addColorStop(0, '#fffdf2');
  g.addColorStop(0.6, mix(fill, '#fffdf2', 0.72));
  g.addColorStop(1, mix(fill, '#fffdf2', 0.45));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5.5;
  ctx.stroke();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // the word: as big as fits, ink-edged, with a lit top
  let size = 28;
  ctx.font = `${size}px 'Lilita One', 'Fredoka', sans-serif`;
  while (ctx.measureText(text).width > 74 && size > 10) {
    size -= 1;
    ctx.font = `${size}px 'Lilita One', 'Fredoka', sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(cx, cy + 1);
  ctx.rotate(-0.06);
  ctx.lineWidth = 6.5;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 0, 0);
  const tg = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  tg.addColorStop(0, '#fffbe0');
  tg.addColorStop(0.45, '#ffe14a');
  tg.addColorStop(1, '#ffa81c');
  ctx.fillStyle = tg;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// ——— the other things heroes throw ———

/** A music note (Star-Lard's headphones): frame 0 a quaver, 1 two beamed. Orange, lit, ink-edged. */
export function drawNote(ctx: Ctx, i: number): void {
  ctx.save();
  ctx.translate(12, 12);
  ctx.lineJoin = 'round';
  const head = (x: number, y: number) => {
    ellipse(ctx, x, y, 3.6, 2.7, -0.4);
  };
  ctx.beginPath();
  if (i === 0) {
    head(-2, 6);
    ctx.moveTo(1.2, 5.5);
    ctx.lineTo(1.2, -8);
    ctx.quadraticCurveTo(6, -5, 6, 0);
  } else {
    head(-5, 7);
    head(5, 5);
    ctx.moveTo(-1.8, 6.5);
    ctx.lineTo(-1.8, -6);
    ctx.lineTo(8.2, -8);
    ctx.lineTo(8.2, 4.5);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = '#ffb040';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  if (i === 0) head(-2, 6);
  else {
    head(-5, 7);
    head(5, 5);
  }
  ctx.fillStyle = '#ffc860';
  ctx.fill();
  ctx.restore();
}

/** A leaf (I Am Crust, the swamp): a green blade, lit on its top, a midrib; frame 1 autumn-brown. */
export function drawLeaf(ctx: Ctx, i: number): void {
  ctx.save();
  ctx.translate(12, 12);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(-1, -8, 10, 0);
  ctx.quadraticCurveTo(-1, 8, -10, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -7, 0, 7);
  const c = i ? ['#e0a04a', '#a8642a', '#6a3a14'] : ['#b8f070', '#5fb84a', '#2f6a22'];
  g.addColorStop(0, c[0]);
  g.addColorStop(0.5, c[1]);
  g.addColorStop(1, c[2]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(42,24,16,0.8)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-9, 0.5);
  ctx.quadraticCurveTo(0, -1, 9, 0);
  ctx.strokeStyle = rgba(c[2], 0.9);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
}

/** A bubble (Aqua-Toe): a clear skin, darker at its rim, a window highlight top left and a glint bottom right. */
export function drawBubble(ctx: Ctx): void {
  const g = ctx.createRadialGradient(12, 12, 4, 12, 12, 10.5);
  g.addColorStop(0, 'rgba(200,240,255,0.06)');
  g.addColorStop(0.75, 'rgba(160,220,255,0.25)');
  g.addColorStop(0.92, 'rgba(230,250,255,0.85)');
  g.addColorStop(1, 'rgba(120,190,230,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(12, 12, 10.5, 0, TAU);
  ctx.fill();
  ellipse(ctx, 8.4, 8, 3, 2, -0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  ellipse(ctx, 15.6, 16, 1.4, 1, -0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
}

/** A playing card glowing with kinetic charge (Gambeet): pink glow round a cream card, a red pip. */
export function drawCard(ctx: Ctx, i: number): void {
  const g = ctx.createRadialGradient(12, 14, 2, 12, 14, 13);
  g.addColorStop(0, 'rgba(255,90,170,0.7)');
  g.addColorStop(1, 'rgba(255,60,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 24, 28);
  ctx.save();
  ctx.translate(12, 14);
  ctx.rotate(i ? 0.25 : -0.2);
  ctx.beginPath();
  ctx.roundRect(-6, -8.5, 12, 17, 2);
  const cg = ctx.createLinearGradient(-6, -8, 6, 8);
  cg.addColorStop(0, '#fffdf6');
  cg.addColorStop(1, '#f0d8e4');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(4, -1, 3.5, 3, 0, 1.5);
  ctx.bezierCurveTo(-3.5, 3, -4, -1, 0, -4);
  ctx.fillStyle = i ? '#1a1418' : '#e0242f';
  ctx.fill();
  ctx.restore();
}

/** A little five-pointed star, lit, ink-edged: frames gold, white, pink, cyan. */
export const STAR_COLS = ['#ffd23f', '#ffffff', '#ff8ad8', '#8fe8ff'];
export function drawStar(ctx: Ctx, i: number): void {
  const c = STAR_COLS[i];
  const gl = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
  gl.addColorStop(0, rgba(c, 0.5));
  gl.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, 24, 24);
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? 3.2 : 7.5;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    if (k) ctx.lineTo(12 + Math.cos(a) * rr, 12 + Math.sin(a) * rr);
    else ctx.moveTo(12 + Math.cos(a) * rr, 12 + Math.sin(a) * rr);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(6, 5, 18, 19);
  g.addColorStop(0, shade(c, 0.6));
  g.addColorStop(1, shade(c, -0.15));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(42,24,16,0.75)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
}

// ════════════════════════════ the specs ════════════════════════════

/** What a hero throws (the crafted sprite pool's names: src/art/peelCraft.ts maps them). */
export type HeroSpr =
  | 'word' | 'note' | 'leaf' | 'bubble' | 'card' | 'goo' | 'star' | 'spark' | 'sparkN' | 'sparkB' | 'sparkG' | 'sparkV'
  | 'ember' | 'gold' | 'glint' | 'flake' | 'mist' | 'smoke' | 'drop' | 'feather' | 'ruby' | 'white' | 'confetti' | 'crumb' | 'dust'
  // the gods' (src/art/peelGod.ts)
  | 'heart' | 'petal' | 'featherK' | 'coin';

export type HeroEmit = (spr: HeroSpr, lx: number, ly: number, vx: number, vy: number, s0: number, s1: number, life: number, o?: { grav?: number; drag?: number; a?: number; fin?: number; spin?: number; rot?: number; frame?: number }) => void;

type EarMode = 'flap' | 'buzz' | 'twitch' | 'sway' | 'flicker' | 'perk';
type GlyphMode = 'pulse' | 'spin' | 'flip' | 'beat' | 'sweep' | 'swing' | 'flicker' | 'bob' | 'boing';
type EyeGlow = { col: string; mode: 'steady' | 'heat' | 'flicker'; a?: number };
export type At = 'top' | 'below' | 'rim' | 'head' | 'emblem' | 'eyes' | [number, number][];

export interface Burst {
  spr: HeroSpr;
  n: number;
  at: At;
  speed?: [number, number];
  size?: [number, number];
  life?: [number, number];
  grav?: number;
  drag?: number;
  frame?: number;
  up?: number;
}

/** How a crafted peel takes a smack and a swing (as FEEL in src/art/peelCraft.ts). */
export interface HeroFeel {
  squash: number;
  k: number;
  c: number;
  wob: number;
  shake: number;
  vib: number;
  sway: number;
  wk: number;
  wc: number;
}
export const HERO_FEEL: HeroFeel = { squash: 0.06, k: 560, c: 17, wob: 0.024, shake: 0.9, vib: 0, sway: 0.5, wk: 210, wc: 13 };
/** Stretchy heroes boing. */
const STRETCHY: Partial<HeroFeel> = { squash: 0.24, k: 170, c: 4.2, wob: 0.08, sway: 1.5, wk: 70, wc: 3.6 };

export interface HeroSpec {
  /** The cape's billow (× the usual). */
  cape?: number;
  ears?: EarMode;
  tail?: boolean;
  /** Natural eyes blink; masks' lenses narrow. */
  blink?: 'blink' | 'squint';
  eyeGlow?: EyeGlow;
  glyph?: GlyphMode;
  glyphCol?: string;
  /** A soft glow behind the head (its colour, strength and size × the head's radius). */
  glow?: { col: number; a: number; r?: number };
  /** The power: effects built fresh for each place the peel plays. */
  fx?: (a: HeroArt) => Fx[];
  words: number[];
  burst: Burst[];
  feel?: Partial<HeroFeel>;
}

// ════════════════════════════ the effects ════════════════════════════

/** What an effect reads off the living peel it plays on (a hero, or a god: src/art/peelGod.ts). */
export interface FxHost {
  /** Its clock, and seconds since the last smack. */
  t: number;
  sm: number;
  menu: boolean;
  /** The peel's speed and sideways velocity in its own frame (peel units/s). */
  speed: number;
  vx: number;
  // set by the effects, read by the peel
  rage: number;
  heat: number;
  phase: number;
  scale: number;
  jx: number;
  jy: number;
  kickQ: number;
  /** The head's outline (for effects that keep to it). */
  readonly shape: PeelShape;
  emitP(spr: HeroSpr, x: number, y: number, vx: number, vy: number, s0: number, s1: number, life: number, o?: Parameters<HeroEmit>[8]): void;
  scratch(name: string, w: number, h: number): [HTMLCanvasElement, Ctx];
}

/** One effect of a hero's power: it updates, draws behind the head and/or in front of it, and answers a smack. */
export interface Fx {
  update?(L: FxHost, dt: number): void;
  back?(L: FxHost, ctx: Ctx): void;
  front?(L: FxHost, ctx: Ctx): void;
  smack?(L: FxHost): void;
}

export const lighter = (ctx: Ctx, fn: () => void) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  fn();
  ctx.restore();
};

/** A soft round light (additive), fading to nothing at its edge. */
export function glowDot(ctx: Ctx, x: number, y: number, r: number, col: string, a: number): void {
  if (a <= 0.005 || r <= 0.2) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.4, rgba(col, a * 0.45));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A timer that fires every [a, b] seconds and runs for `dur`: progress 0–1 while running, else -1. */
export class Every {
  next: number;
  t = -1;
  constructor(
    private a: number,
    private b: number,
    private dur: number,
    first = rnd(0.5, 1) * a,
  ) {
    this.next = first;
  }
  tick(dt: number): number {
    if (this.t < 0) {
      this.next -= dt;
      if (this.next <= 0) this.t = 0;
      else return -1;
    }
    this.t += dt / this.dur;
    if (this.t >= 1) {
      this.t = -1;
      this.next = rnd(this.a, this.b);
      return -1;
    }
    return this.t;
  }
  fire(): void {
    this.t = 0;
  }
}

/** Where on the peel `at` means (a random point there). */
export function pointAt(at: At): [number, number] {
  if (Array.isArray(at)) return at[Math.floor(crand() * at.length)];
  switch (at) {
    case 'top':
      return [HX + rnd(-50, 50), HY - R + rnd(4, 18)];
    case 'below':
      return [HX + rnd(-56, 56), HY + R - rnd(6, 20)];
    case 'rim': {
      const a = crand() * TAU;
      return [HX + Math.cos(a) * (R - 4), HY + Math.sin(a) * (R - 4)];
    }
    case 'head': {
      const a = crand() * TAU;
      const d = Math.sqrt(crand()) * R * 0.8;
      return [HX + Math.cos(a) * d, HY + Math.sin(a) * d];
    }
    case 'emblem':
      return [HX + rnd(-10, 10), EMB_Y + rnd(-10, 10)];
    case 'eyes':
      return [HX + (crand() < 0.5 ? -EYE_DX : EYE_DX), EYE_Y];
  }
}

// ——— lightning crackling (Stormy, Static Cling, Flashfoot, Shazamozza, Night Wings, the Wasp's stings, the Window's bite) ———

interface Arc {
  pts: number[];
  age: number;
  life: number;
  rej: number;
  a0: number;
  a1: number;
  big: number;
}
export class Arcs implements Fx {
  private arcs: Arc[] = [];
  private acc = 0;
  constructor(
    private o: { col: string; hot?: string; cx?: number; cy?: number; r?: number; rate: number; from?: number; to?: number; len?: number; jag?: number; w?: number; smackN?: number },
  ) {}
  private spawn(big: number): void {
    const o = this.o;
    const from = o.from ?? 0;
    const to = o.to ?? TAU;
    const a0 = from + crand() * (to - from);
    const len = (o.len ?? 0.7) * (0.6 + crand() * 0.6) * (big > 0 ? 1.4 : 1);
    const arc: Arc = { pts: [], age: 0, life: rnd(0.12, 0.26) * (big > 0 ? 1.6 : 1), rej: 0, a0, a1: a0 + (crand() < 0.5 ? -len : len), big };
    this.jag(arc);
    if (this.arcs.length > 10) this.arcs.shift();
    this.arcs.push(arc);
  }
  private jag(arc: Arc): void {
    const o = this.o;
    const cx = o.cx ?? HX;
    const cy = o.cy ?? HY;
    const r = o.r ?? R;
    const j = (o.jag ?? 16) * (arc.big > 0 ? 1.5 : 1);
    const n = 8;
    arc.pts.length = 0;
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const a = arc.a0 + (arc.a1 - arc.a0) * u;
      // the ends sit on the rim, the middle arcs out, jagged
      const out = Math.sin(u * Math.PI) * j * 0.6 + (k && k < n ? (crand() - 0.3) * j : 0);
      arc.pts.push(cx + Math.cos(a) * (r + out), cy + Math.sin(a) * (r + out));
    }
  }
  update(_L: FxHost, dt: number): void {
    this.acc += dt * this.o.rate * (reduced() ? 0.4 : 1);
    while (this.acc >= 1) {
      this.acc -= 1;
      this.spawn(0);
    }
    for (const a of this.arcs) {
      a.age += dt;
      a.rej -= dt;
      if (a.rej <= 0) {
        a.rej = 0.045;
        this.jag(a);
      }
    }
    this.arcs = this.arcs.filter((a) => a.age < a.life);
  }
  front(_L: FxHost, ctx: Ctx): void {
    if (!this.arcs.length) return;
    const o = this.o;
    const w = o.w ?? 1;
    lighter(ctx, () => {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const a of this.arcs) {
        const k = a.age / a.life;
        const al = (1 - k) * (0.75 + 0.25 * Math.sin(a.age * 90));
        ctx.beginPath();
        for (let i = 0; i < a.pts.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, a.pts[i], a.pts[i + 1]);
        const bw = a.big > 0 ? 1.5 : 1;
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
    for (let i = 0; i < (this.o.smackN ?? 4); i++) this.spawn(1);
  }
}

// ——— speed: afterimages and lines streaking past (the Flashfoot) ———

class Speed implements Fx {
  private zoom = new Every(2.6, 5, 0.7);
  private z = 0;
  private dir = -1;
  constructor(private col: string) {}
  update(L: FxHost, dt: number): void {
    const p = this.zoom.tick(dt);
    this.z = Math.max(p >= 0 ? Math.sin(p * Math.PI) : 0, clamp(L.speed / 900, 0, 1), L.sm < 0.5 ? 1 - L.sm / 0.5 : 0);
    if (L.speed > 150) this.dir = L.vx > 0 ? -1 : 1;
  }
  back(L: FxHost, ctx: Ctx): void {
    const z = this.z * (reduced() ? 0.5 : 1);
    // afterimages in the suit's colour, trailing where it came from
    for (let k = 2; k >= 1; k--) {
      const a = (0.1 + 0.22 * z) * (k === 1 ? 1 : 0.55);
      ctx.save();
      ctx.translate(this.dir * k * (7 + 12 * z), 0);
      headPath(ctx, L.shape);
      ctx.fillStyle = rgba(this.col, a);
      ctx.fill();
      ctx.restore();
    }
    // lines streaking past behind the head
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const y = HY - 64 + i * 26 + Math.sin(i * 2.3) * 6;
      const sp = 260 + 160 * z + i * 23;
      const span = 300;
      const x = ((((-this.dir * L.t * sp + i * 97) % span) + span) % span) - 40;
      const len = 30 + 40 * z + (i % 3) * 8;
      const x1 = x + -this.dir * len;
      const g = ctx.createLinearGradient(x, 0, x1, 0);
      // (faded out before the surface's edge: never a hard cut)
      const a = (0.35 + 0.45 * z) * clamp(Math.min(x, x1, B.w - x, B.w - x1) / 30, 0, 1);
      if (a <= 0.01) continue;
      g.addColorStop(0, rgba(this.col, 0));
      g.addColorStop(0.7, rgba(this.col, a));
      g.addColorStop(1, rgba('#ffffff', a));
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.6 + (i % 2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
  }
}

// ——— webs strung from the head (Spider-Pan), or the symbiote's tendrils ———

class Webs implements Fx {
  private shot = -1;
  private shotA = 0;
  constructor(private goo: boolean) {}
  /** Strands: [angle on the rim, length, pair id]. */
  private static S: [number, number, number][] = [
    [-2.42, 26, 0],
    [-1.86, 22, 0],
    [-0.66, 26, 1],
    [-0.06, 22, 1],
    [2.6, 20, 2],
  ];
  private end(L: FxHost, i: number, out: number[]): void {
    const [a, len] = Webs.S[i];
    const sway = Math.sin(L.t * 1.3 + i * 1.7) * 0.06 + (this.goo ? Math.sin(L.t * 2.6 + i) * 0.12 : 0);
    const l = len * (this.goo ? 0.9 + 0.25 * Math.sin(L.t * 1.9 + i * 2.1) : 1) * (L.sm < 0.4 ? 1 + 0.6 * (1 - L.sm / 0.4) : 1);
    out[0] = HX + Math.cos(a) * (R - 6);
    out[1] = HY + Math.sin(a) * (R - 6);
    out[2] = HX + Math.cos(a + sway) * (R + l);
    out[3] = HY + Math.sin(a + sway) * (R + l);
  }
  update(_L: FxHost, dt: number): void {
    if (this.shot >= 0) {
      this.shot += dt;
      if (this.shot > 0.7) this.shot = -1;
    }
  }
  back(L: FxHost, ctx: Ctx): void {
    const e = [0, 0, 0, 0];
    const e2 = [0, 0, 0, 0];
    ctx.lineCap = 'round';
    for (let i = 0; i < Webs.S.length; i++) {
      this.end(L, i, e);
      if (this.goo) {
        this.tendril(L, ctx, e, i);
        continue;
      }
      const sag = 4 + 2 * Math.sin(L.t * 1.1 + i);
      const mx = (e[0] + e[2]) / 2 + sag * 0.4;
      const my = (e[1] + e[3]) / 2 + sag;
      for (const [w, c, a] of [[2.8, '#28243a', 0.4], [1.4, '#fafaff', 0.92]] as const) {
        ctx.beginPath();
        ctx.moveTo(e[0], e[1]);
        ctx.quadraticCurveTo(mx, my, e[2], e[3]);
        // (each strand fades out at its free end)
        const fg = ctx.createLinearGradient(e[0], e[1], e[2], e[3]);
        fg.addColorStop(0, rgba(c, a));
        fg.addColorStop(0.55, rgba(c, a));
        fg.addColorStop(1, rgba(c, 0));
        ctx.strokeStyle = fg;
        ctx.lineWidth = w;
        ctx.stroke();
      }
      // cross threads to its pair
      const nx = Webs.S[i + 1];
      if (nx && nx[2] === Webs.S[i][2]) {
        this.end(L, i + 1, e2);
        for (const u of [0.45, 0.8]) {
          const ax = e[0] + (e[2] - e[0]) * u;
          const ay = e[1] + (e[3] - e[1]) * u + sag * Math.sin(u * Math.PI) * 0.8;
          const bx = e2[0] + (e2[2] - e2[0]) * u;
          const by = e2[1] + (e2[3] - e2[1]) * u + sag * Math.sin(u * Math.PI) * 0.8;
          for (const [w, c] of [[2.4, 'rgba(40,36,56,0.3)'], [1.1, 'rgba(250,250,255,0.85)']] as const) {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 3, bx, by);
            ctx.strokeStyle = c;
            ctx.lineWidth = w;
            ctx.stroke();
          }
        }
      }
    }
  }
  /** A writhing black tendril, thick at the head, tapering, lit along its top edge. */
  private tendril(L: FxHost, ctx: Ctx, e: number[], i: number): void {
    const n = 9;
    const dx = e[2] - e[0];
    const dy = e[3] - e[1];
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    let lx = e[0];
    let ly = e[1];
    for (let k = 1; k <= n; k++) {
      const u = k / n;
      const wv = Math.sin(L.t * 4.2 - u * 5 + i * 1.3) * 6 * u;
      const x = e[0] + dx * u + px * wv;
      const y = e[1] + dy * u + py * wv;
      const w = 7.5 * (1 - u * 0.85);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#2a1810';
      ctx.lineWidth = w + 2;
      ctx.stroke();
      ctx.strokeStyle = '#16161e';
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx - 1, ly - 1.2);
      ctx.lineTo(x - 1, y - 1.2);
      ctx.strokeStyle = 'rgba(140,130,230,0.55)';
      ctx.lineWidth = Math.max(0.8, w * 0.22);
      ctx.stroke();
      lx = x;
      ly = y;
    }
  }
  front(_L: FxHost, ctx: Ctx): void {
    if (this.shot < 0 || this.goo) return;
    // the web shot: a line flies out and splats
    const k = this.shot;
    const reach = smooth(0, 0.08, k);
    const fade = 1 - smooth(0.25, 0.7, k);
    const a = this.shotA;
    const x0 = HX + Math.cos(a) * (R - 4);
    const y0 = HY + Math.sin(a) * (R - 4);
    const L1 = 70 * reach;
    const x1 = HX + Math.cos(a) * (R + L1);
    const y1 = HY + Math.sin(a) * (R + L1);
    ctx.lineCap = 'round';
    for (const [w, c] of [[3, `rgba(40,36,56,${0.4 * fade})`], [1.6, `rgba(255,255,255,${0.95 * fade})`]] as const) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.stroke();
    }
    if (reach >= 1) {
      // the splat: spokes and two rings, spreading
      const s = 6 + 10 * smooth(0.08, 0.2, k);
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * fade})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const b = (i / 8) * TAU + 0.3;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + Math.cos(b) * s, y1 + Math.sin(b) * s);
      }
      ctx.stroke();
      for (const rr of [0.45, 0.8]) {
        ctx.beginPath();
        ctx.arc(x1, y1, s * rr, 0, TAU);
        ctx.stroke();
      }
    }
  }
  smack(): void {
    this.shot = 0;
    this.shotA = -Math.PI / 2 + (crand() - 0.5) * 1.6;
  }
}

// ——— particles shed while it's idle ———

export interface EmitO {
  spr: HeroSpr;
  rate: number;
  at: At;
  vx?: [number, number];
  vy?: [number, number];
  grav?: number;
  drag?: number;
  size?: [number, number];
  life?: [number, number];
  spin?: number;
  a?: number;
  fin?: number;
  /** Faster while it's swung. */
  move?: number;
}
export class Emitter implements Fx {
  private acc = crand();
  constructor(private o: EmitO) {}
  update(L: FxHost, dt: number): void {
    const o = this.o;
    this.acc += dt * o.rate * (reduced() ? 0.4 : 1) * (1 + (o.move ?? 0) * clamp(L.speed / 600, 0, 2));
    while (this.acc >= 1) {
      this.acc -= 1;
      const [x, y] = pointAt(o.at);
      const s = o.size ?? [8, 6];
      L.emitP(o.spr, x, y, rnd(...(o.vx ?? [-10, 10])), rnd(...(o.vy ?? [-30, -10])), s[0], s[1], rnd(...(o.life ?? [0.8, 1.4])), { grav: o.grav ?? 0, drag: o.drag ?? 0.6, spin: o.spin, a: o.a, fin: o.fin ?? 0.2 });
    }
  }
}

// ——— the suit's pattern lighting up in a wave (plates, cracks, embers, scales, frost, bolts, flames) ———

class PatWave implements Fx {
  private flash = 0;
  constructor(private o: { a: number; base?: number; speed?: number; dir?: 'up' | 'across' | 'down'; width?: number }) {}
  update(_L: FxHost, dt: number): void {
    this.flash *= Math.exp(-dt / 0.25);
  }
  front(L: HeroLive, ctx: Ctx): void {
    const p = L.mini.pat;
    if (!p) return;
    const o = this.o;
    const [sc, sx] = L.scratch('pat', p.c.width, p.c.height);
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.globalCompositeOperation = 'source-over';
    sx.clearRect(0, 0, sc.width, sc.height);
    sx.drawImage(p.c, 0, 0);
    // a band running through it
    const per = 1 / (o.speed ?? 0.35);
    const u = ((L.t % per) / per) * 1.8 - 0.4;
    const w = o.width ?? 0.28;
    const dir = o.dir ?? 'up';
    const g = dir === 'across' ? sx.createLinearGradient(0, 0, sc.width, 0) : dir === 'up' ? sx.createLinearGradient(0, sc.height, 0, 0) : sx.createLinearGradient(0, 0, 0, sc.height);
    const base = (o.base ?? 0.12) + L.rage * 0.4;
    const stop = (at: number, a: number) => g.addColorStop(clamp(at, 0, 1), `rgba(0,0,0,${clamp(a, 0, 1)})`);
    stop(0, base);
    if (u - w > 0) stop(u - w, base);
    stop(u, 1);
    if (u + w < 1) stop(u + w, base);
    stop(1, base);
    sx.globalCompositeOperation = 'destination-in';
    sx.fillStyle = g;
    sx.fillRect(0, 0, sc.width, sc.height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(o.a * (1 + L.rage) + this.flash, 0, 1);
    ctx.drawImage(sc, p.x, p.y, p.w, p.h);
    if (this.flash > 0.02) {
      ctx.globalAlpha = this.flash * 0.8;
      ctx.drawImage(p.c, p.x, p.y, p.w, p.h);
    }
    ctx.restore();
  }
  smack(): void {
    this.flash = 0.9;
  }
}

// ——— a sweep of light over polished metal, the whole head or a round part of it ———

export class Sheen implements Fx {
  private run: Every;
  private p = -1;
  constructor(
    private o: { a: number; every?: [number, number]; cx?: number; cy?: number; r?: number; col?: string },
  ) {
    const [a, b] = o.every ?? [3.5, 6.5];
    this.run = new Every(a, b, 0.9);
  }
  update(_L: FxHost, dt: number): void {
    this.p = this.run.tick(dt);
  }
  front(L: FxHost, ctx: Ctx): void {
    if (this.p < 0) return;
    const o = this.o;
    const round = o.r !== undefined;
    const cx = o.cx ?? HX;
    const cy = o.cy ?? HY;
    const r = o.r ?? R;
    ctx.save();
    if (round) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
    } else headPath(ctx, L.shape);
    ctx.clip();
    const u = -1.3 + this.p * 2.6;
    const x = cx + u * r;
    const g = ctx.createLinearGradient(x - r * 0.45, cy - r, x + r * 0.45, cy + r);
    const col = o.col ?? '#ffffff';
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.42, rgba(col, o.a * 0.35));
    g.addColorStop(0.5, rgba(col, o.a));
    g.addColorStop(0.58, rgba(col, o.a * 0.35));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r - 4, cy - r - 4, r * 2 + 8, r * 2 + 8);
    ctx.restore();
  }
  smack(): void {
    this.run.fire();
  }
}

// ——— twinkles: four-pointed glints at given points, or anywhere in an area ———

interface Tw {
  x: number;
  y: number;
  t: number;
  s: number;
}
export class Sparkle implements Fx {
  private tw: Tw[] = [];
  private acc = crand();
  constructor(private o: { col: string; pts?: [number, number][]; area?: [number, number, number, number]; rate: number; size?: number; smackN?: number }) {}
  private spawn(): void {
    const o = this.o;
    let x: number;
    let y: number;
    if (o.pts) [x, y] = o.pts[Math.floor(crand() * o.pts.length)];
    else {
      const [cx, cy, rx, ry] = o.area ?? [HX, HY, R + 14, R + 14];
      const a = crand() * TAU;
      const d = Math.sqrt(crand());
      x = cx + Math.cos(a) * rx * d;
      y = cy + Math.sin(a) * ry * d;
    }
    if (this.tw.length > 8) this.tw.shift();
    this.tw.push({ x, y, t: 0, s: (o.size ?? 7) * rnd(0.7, 1.2) });
  }
  update(_L: FxHost, dt: number): void {
    this.acc += dt * this.o.rate;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.spawn();
    }
    for (const w of this.tw) w.t += dt / 0.55;
    this.tw = this.tw.filter((w) => w.t < 1);
  }
  front(_L: FxHost, ctx: Ctx): void {
    for (const w of this.tw) {
      const k = Math.sin(w.t * Math.PI);
      const s = w.s * k;
      if (s < 0.5) continue;
      lighter(ctx, () => glowDot(ctx, w.x, w.y, s * 2.2, this.o.col, 0.55 * k));
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(w.t * 0.8);
      sparkleStar(ctx, 0, 0, s);
      ctx.fillStyle = `rgba(255,255,255,${0.95 * k})`;
      ctx.fill();
      ctx.restore();
    }
  }
  smack(): void {
    for (let i = 0; i < (this.o.smackN ?? 3); i++) this.spawn();
  }
}

// ——— rings: a sonar's pings (Dare-Dough), a repulsor's blast (Iron Pan), a kinetic burst (Black Pan-ther) ———

export class Rings implements Fx {
  private rs: number[] = [];
  private acc = 0;
  constructor(private o: { col: string; rate: number; cx?: number; cy?: number; r0?: number; grow?: number; life?: number; w?: number; front?: boolean; smackN?: number }) {}
  update(_L: FxHost, dt: number): void {
    this.acc += dt * this.o.rate;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.rs.push(0);
    }
    const life = this.o.life ?? 1.4;
    this.rs = this.rs.map((t) => t + dt / life).filter((t) => t < 1);
  }
  private draw(ctx: Ctx): void {
    const o = this.o;
    const cx = o.cx ?? HX;
    const cy = o.cy ?? HY;
    lighter(ctx, () => {
      for (const t of this.rs) {
        if (t <= 0) continue;
        const r = (o.r0 ?? R * 0.7) + t * (o.grow ?? 70);
        const a = Math.sin(Math.min(1, t * 4) * Math.PI * 0.5) * (1 - t) * (1 - t);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.strokeStyle = rgba(o.col, 0.25 * a);
        ctx.lineWidth = 9 * (o.w ?? 1);
        ctx.stroke();
        ctx.strokeStyle = rgba(o.col, 0.85 * a);
        ctx.lineWidth = 2.4 * (o.w ?? 1);
        ctx.stroke();
      }
    });
  }
  back(_L: FxHost, ctx: Ctx): void {
    if (!this.o.front) this.draw(ctx);
  }
  front(_L: FxHost, ctx: Ctx): void {
    if (this.o.front) this.draw(ctx);
  }
  smack(): void {
    for (let i = 0; i < (this.o.smackN ?? 1); i++) this.rs.push(-i * 0.12);
  }
}

// ——— a mandala of light turning behind the head (Doctor Strangeloaf's ring of sparks, Scarlet Pitch's hex) ———

export class Mandala implements Fx {
  private flare = 0;
  constructor(private o: { col: string; hot: string; r: number; hex?: boolean; haze?: number; a?: number }) {}
  update(L: FxHost, dt: number): void {
    this.flare *= Math.exp(-dt / 0.35);
    // sparks thrown off the ring as it turns
    if (!this.o.hex && crand() < dt * 5) {
      const a = crand() * TAU;
      const r = this.o.r + 4;
      const t = L.t * 0.9 + a;
      L.emitP('ember', HX + Math.cos(a) * r, HY + Math.sin(a) * r, -Math.sin(t) * 40, Math.cos(t) * 40 + 10, 6, 3, rnd(0.3, 0.6), { grav: 120, drag: 1 });
    }
  }
  back(L: FxHost, ctx: Ctx): void {
    const o = this.o;
    const pulse = 0.75 + 0.25 * Math.sin(L.t * 2.1) + this.flare;
    lighter(ctx, () => {
      ctx.lineCap = 'round';
      // a soft glow ring
      ctx.beginPath();
      ctx.arc(HX, HY, o.r + 4, 0, TAU);
      ctx.strokeStyle = rgba(o.col, 0.16 * pulse * (o.haze ?? 1));
      ctx.lineWidth = 16;
      ctx.stroke();
      if (o.hex) {
        // a hexagram and its circle, turning slowly
        const rot = L.t * 0.25;
        for (const ph of [0, Math.PI / 3]) {
          ctx.beginPath();
          for (let k = 0; k < 3; k++) {
            const a = rot + ph + (k / 3) * TAU - Math.PI / 2;
            const x = HX + Math.cos(a) * (o.r + 10);
            const y = HY + Math.sin(a) * (o.r + 10);
            if (k) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = rgba(o.col, 0.7 * pulse);
          ctx.lineWidth = 2.4;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(HX, HY, o.r + 10, 0, TAU);
        ctx.strokeStyle = rgba(o.hot, 0.6 * pulse);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        return;
      }
      // two rings of sparks turning opposite ways, with runes between
      for (const [rr, sp, n, len] of [
        [o.r, 0.8, 30, 0.12],
        [o.r + 11, -0.55, 22, 0.1],
      ] as const) {
        for (let k = 0; k < n; k++) {
          const a = L.t * sp + (k / n) * TAU;
          const fl = 0.55 + 0.45 * noise1(L.t * 6 + k * 3.1);
          ctx.beginPath();
          ctx.arc(HX, HY, rr, a, a + len);
          ctx.strokeStyle = rgba(k % 3 ? o.col : o.hot, Math.min(1, 0.85 * fl * pulse * (o.a ?? 1)));
          ctx.lineWidth = 3.2;
          ctx.stroke();
        }
      }
      for (let k = 0; k < 12; k++) {
        const a = -L.t * 0.3 + (k / 12) * TAU;
        const x = HX + Math.cos(a) * (o.r + 5.5);
        const y = HY + Math.sin(a) * (o.r + 5.5);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(-2.5, -2);
        ctx.lineTo(0, 2);
        ctx.lineTo(2.5, -2);
        ctx.strokeStyle = rgba(o.hot, 0.7 * pulse);
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.restore();
      }
    });
  }
  smack(): void {
    this.flare = 1;
  }
}

// ——— wisps of chaos magic orbiting the head (Scarlet Pitch) ———

export class Wisps implements Fx {
  constructor(private o: { col: string; n: number }) {}
  private at(L: FxHost, i: number, back: number): [number, number, number] {
    const th = L.t * (1.1 + 0.25 * i) + (i / this.o.n) * TAU - back;
    const r = R + 6 + 9 * Math.sin(L.t * 1.4 + i * 2);
    return [HX + Math.cos(th) * r, HY + Math.sin(th) * r * 0.9 - 4, Math.sin(th)];
  }
  front(L: FxHost, ctx: Ctx): void {
    lighter(ctx, () => {
      for (let i = 0; i < this.o.n; i++) {
        for (let k = 7; k >= 0; k--) {
          const [x, y] = this.at(L, i, k * 0.07);
          const a = (1 - k / 8) * 0.55;
          glowDot(ctx, x, y, 9 - k * 0.8, this.o.col, a);
        }
        const [x, y] = this.at(L, i, 0);
        glowDot(ctx, x, y, 3.5, '#ffffff', 0.8);
      }
    });
  }
}

// ——— rage: surges that shake the head and light its cracks (the Bulk) ———

class Rage implements Fx {
  private surge = new Every(3, 5.5, 1.1);
  update(L: FxHost, dt: number): void {
    const p = this.surge.tick(dt);
    const s = p >= 0 ? Math.sin(p * Math.PI) : 0;
    const hit = L.sm < 0.8 ? 1 - L.sm / 0.8 : 0;
    L.rage = Math.max(s, hit) * (reduced() ? 0.4 : 1);
    L.jx = noise1(L.t * 40) * 1.8 * L.rage;
    L.jy = noise1(L.t * 40 + 9) * 1.2 * L.rage;
  }
}

// ——— beams: heat vision from the eyes (Superpeel), an optic blast from the visor (Cyclopizza) ———

class Beams implements Fx {
  private b = -1;
  constructor(private o: { col: string; visor?: boolean; len?: number }) {}
  update(_L: FxHost, dt: number): void {
    if (this.b >= 0) {
      this.b += dt / 0.5;
      if (this.b >= 1) this.b = -1;
    }
  }
  front(_L: FxHost, ctx: Ctx): void {
    if (this.b < 0) return;
    const k = this.b;
    const a = smooth(0, 0.08, k) * (1 - smooth(0.55, 1, k));
    const len = (this.o.len ?? 130) * smooth(0, 0.16, k);
    const src: [number, number, number][] = this.o.visor ? [[HX + 30, EYE_Y, 0.02]] : [
      [HX - EYE_DX, EYE_Y, -0.42],
      [HX + EYE_DX, EYE_Y, -0.3],
    ];
    lighter(ctx, () => {
      ctx.lineCap = 'round';
      for (const [x, y, ang] of src) {
        const x1 = x + Math.cos(ang) * len;
        const y1 = y + Math.sin(ang) * len;
        const g = (al: number, c: string) => {
          const gr = ctx.createLinearGradient(x, y, x1, y1);
          gr.addColorStop(0, rgba(c, al));
          gr.addColorStop(0.7, rgba(c, al * 0.8));
          gr.addColorStop(1, rgba(c, 0));
          return gr;
        };
        for (const [w, al, c] of [
          [this.o.visor ? 22 : 13, 0.3, this.o.col],
          [this.o.visor ? 10 : 5.5, 0.9, this.o.col],
          [this.o.visor ? 4 : 2, 1, '#ffffff'],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x1, y1);
          ctx.strokeStyle = g(al * a, c);
          ctx.lineWidth = w;
          ctx.stroke();
        }
        glowDot(ctx, x, y, this.o.visor ? 26 : 16, this.o.col, 0.9 * a);
      }
    });
  }
  smack(L: FxHost): void {
    this.b = 0;
    L.heat = 1;
  }
}

// ——— a targeting reticle turning and locking on (Hawk-Eye-Talian's target, Cy-Pork's cyber eye) ———

class Reticle implements Fx {
  private lock = new Every(2.4, 4.2, 0.8);
  private p = -1;
  constructor(private o: { col: string; cx: number; cy: number; r: number }) {}
  update(_L: FxHost, dt: number): void {
    this.p = this.lock.tick(dt);
  }
  front(L: FxHost, ctx: Ctx): void {
    const o = this.o;
    const lk = this.p >= 0 ? Math.sin(this.p * Math.PI) : 0;
    const hit = L.sm < 0.5 ? 1 - L.sm / 0.5 : 0;
    const r = o.r * (1 - 0.2 * Math.max(lk, hit));
    const rot = L.t * 0.9 + lk * 1.5;
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.lineCap = 'round';
    for (const [w, c] of [[3.6, 'rgba(42,24,16,0.45)'], [1.7, rgba(o.col, 0.9)]] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      for (let k = 0; k < 4; k++) {
        const a = rot + (k / 4) * TAU;
        ctx.beginPath();
        ctx.arc(0, 0, r, a + 0.22, a + TAU / 4 - 0.22);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
        ctx.lineTo(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5));
        ctx.stroke();
      }
    }
    ctx.restore();
    if (Math.max(lk, hit) > 0.6) lighter(ctx, () => glowDot(ctx, o.cx, o.cy, r * 1.4, o.col, 0.5 * Math.max(lk, hit)));
  }
}

// ——— a golden lasso circling the head, its far side behind it (Wonder Wedge, the Amazon Queen) ———

class Lasso implements Fx {
  private tight = 0;
  update(L: FxHost): void {
    this.tight = L.sm < 0.6 ? Math.sin((L.sm / 0.6) * Math.PI) : 0;
  }
  private rope(L: FxHost, ctx: Ctx, a0: number, a1: number): void {
    const rx = R + 14 - this.tight * 12;
    const ry = 18 + 3 * Math.sin(L.t * 1.3);
    const cy = HY + 24 + 3 * Math.sin(L.t * 0.9);
    const tilt = -0.1 + 0.05 * Math.sin(L.t * 0.7);
    const path = () => {
      ctx.beginPath();
      ctx.ellipse(HX, cy, rx, ry, tilt, a0, a1);
    };
    ctx.lineCap = 'round';
    lighter(ctx, () => {
      path();
      ctx.strokeStyle = `rgba(255,210,63,${0.22 + 0.25 * this.tight})`;
      ctx.lineWidth = 11;
      ctx.stroke();
    });
    path();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5.5;
    ctx.stroke();
    path();
    ctx.strokeStyle = '#e8b23a';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    // the twist of the rope running round it
    path();
    ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = -L.t * 22;
    ctx.strokeStyle = '#fff6b0';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  back(L: FxHost, ctx: Ctx): void {
    this.rope(L, ctx, Math.PI, TAU);
  }
  front(L: FxHost, ctx: Ctx): void {
    this.rope(L, ctx, 0, Math.PI);
  }
}

// ——— a glowing construct round the head and the lamp's light (Green Lampshade) ———

class Aura implements Fx {
  private ring = -1;
  constructor(private col: string) {}
  update(_L: FxHost, dt: number): void {
    if (this.ring >= 0) {
      this.ring += dt / 0.6;
      if (this.ring >= 1) this.ring = -1;
    }
  }
  private outline(L: FxHost, ctx: Ctx, s: number, a: number, w: number): void {
    ctx.save();
    ctx.translate(HX, HY);
    ctx.scale(s, s);
    ctx.translate(-HX, -HY);
    headPath(ctx, L.shape);
    ctx.restore();
    ctx.strokeStyle = rgba(this.col, a);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  back(L: FxHost, ctx: Ctx): void {
    const p = 0.5 + 0.5 * Math.sin(L.t * 2.4);
    lighter(ctx, () => {
      this.outline(L, ctx, 1.1 + 0.025 * p, 0.14, 14);
      this.outline(L, ctx, 1.08 + 0.025 * p, 0.55 + 0.25 * p, 2.6);
      if (this.ring >= 0) {
        const k = this.ring;
        // (soft on both sides: a wide faint band, a narrower one, a bright core)
        const s = 1.1 + k * 0.45;
        const a = 1 - k;
        this.outline(L, ctx, s, 0.12 * a, 16);
        this.outline(L, ctx, s, 0.25 * a, 8);
        this.outline(L, ctx, s, 0.45 * a, 3);
      }
    });
  }
  smack(): void {
    this.ring = 0;
  }
}
class Cone implements Fx {
  constructor(private col: string) {}
  front(L: FxHost, ctx: Ctx): void {
    const p = 0.6 + 0.25 * Math.sin(L.t * 3.1) + 0.15 * noise1(L.t * 9) + (L.sm < 0.5 ? 1 - L.sm / 0.5 : 0);
    const y0 = EMB_Y + 6;
    const y1 = EMB_Y + 44;
    lighter(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(HX - 12, y0);
      ctx.lineTo(HX + 12, y0);
      ctx.lineTo(HX + 30, y1);
      ctx.lineTo(HX - 30, y1);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, rgba(this.col, 0.55 * p));
      g.addColorStop(1, rgba(this.col, 0));
      ctx.fillStyle = g;
      ctx.fill();
    });
  }
}

// ——— phasing: the head goes see-through now and then (Martian Mozzarella) ———

class Phase implements Fx {
  private run = new Every(3, 5.5, 0.6);
  update(L: FxHost, dt: number): void {
    const p = this.run.tick(dt);
    const s = p >= 0 ? smooth(0, 0.25, p) * (1 - smooth(0.6, 1, p)) : 0;
    L.phase = s * (0.85 + 0.15 * Math.sin(L.t * 30));
  }
  smack(): void {
    this.run.fire();
  }
}

// ——— bats flitting past behind the head (Batpeel, the Dark Kneader) ———

interface Bat {
  x: number;
  y: number;
  dir: number;
  t: number;
  s: number;
}
class Bats implements Fx {
  private bats: Bat[] = [];
  private next = rnd(1, 3);
  private spawn(n: number): void {
    for (let i = 0; i < n; i++) {
      const dir = crand() < 0.5 ? -1 : 1;
      this.bats.push({ x: dir > 0 ? -16 - i * 14 : B.w + 16 + i * 14, y: rnd(HY + 96, HY + 132) - i * 10, dir, t: crand() * 5, s: rnd(2.3, 2.8) });
    }
  }
  update(_L: FxHost, dt: number): void {
    this.next -= dt;
    if (this.next <= 0) {
      this.next = rnd(2.8, 6);
      this.spawn(crand() < 0.4 ? 2 : 1);
    }
    for (const b of this.bats) {
      b.t += dt;
      b.x += b.dir * 120 * dt;
    }
    this.bats = this.bats.filter((b) => b.x > -40 && b.x < B.w + 40);
  }
  front(_L: FxHost, ctx: Ctx): void {
    for (const b of this.bats) {
      const y = b.y + Math.sin(b.t * 5) * 6;
      // (whole before the surface's edge, faded out there)
      const edge = Math.min(b.x - 38, B.w - 38 - b.x);
      const a = clamp(edge / 30, 0, 1);
      if (a <= 0.01) continue;
      const w = Math.sin(b.t * 22);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(b.x, y);
      ctx.scale(b.s * b.dir, b.s);
      ctx.beginPath();
      // wings: scalloped, beating
      for (const s of [-1, 1]) {
        ctx.moveTo(0, -1);
        ctx.quadraticCurveTo(s * 6, -7 * w - 2, s * 13, -5 * w - 1);
        ctx.quadraticCurveTo(s * 10, -1, s * 9, 2);
        ctx.quadraticCurveTo(s * 7, 0, s * 5, 3);
        ctx.quadraticCurveTo(s * 3, 1, 0, 3);
      }
      // a soft violet rim of moonlight round a dark silhouette
      ctx.save();
      ctx.shadowColor = 'rgba(170,140,255,0.9)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#1d1f2b';
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(180,150,255,0.85)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ellipse(ctx, 0, 1, 2.6, 3.2);
      ctx.fillStyle = '#1d1f2b';
      ctx.fill();
      ctx.restore();
    }
  }
  smack(): void {
    this.spawn(3);
  }
}

// ——— a bolt from above on a smack (Shazamozza's word) ———

export class Strike implements Fx {
  private s = -1;
  private pts: number[] = [];
  constructor(private col: string) {}
  update(_L: FxHost, dt: number): void {
    if (this.s >= 0) {
      this.s += dt / 0.45;
      if (this.s >= 1) this.s = -1;
      else if (crand() < dt * 25) this.jag();
    }
  }
  private jag(): void {
    this.pts = [];
    const x0 = HX + 34;
    const x1 = HX + 4;
    const y1 = HY - R + 4;
    for (let k = 0; k <= 7; k++) {
      const u = k / 7;
      this.pts.push(x0 + (x1 - x0) * u + (k && k < 7 ? (crand() - 0.5) * 18 : 0), u * y1);
    }
  }
  front(_L: FxHost, ctx: Ctx): void {
    if (this.s < 0 || !this.pts.length) return;
    const a = 1 - smooth(0.3, 1, this.s);
    lighter(ctx, () => {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < this.pts.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, this.pts[i], this.pts[i + 1]);
      // fading in from the box's top edge, so it never ends in a hard line
      const g = (al: number, c: string) => {
        const gr = ctx.createLinearGradient(0, 0, 0, 24);
        gr.addColorStop(0, rgba(c, 0));
        gr.addColorStop(1, rgba(c, al));
        return gr;
      };
      for (const [w, al, c] of [[14, 0.25, this.col], [5, 0.85, this.col], [2, 1, '#ffffff']] as const) {
        ctx.strokeStyle = g(al * a, c);
        ctx.lineWidth = w;
        ctx.stroke();
      }
      glowDot(ctx, HX + 4, HY - R + 4, 30, this.col, 0.7 * a);
    });
  }
  smack(): void {
    this.s = 0;
    this.jag();
  }
}

// ——— spider-sense: wavy lines tingling round the head ———

class Sense implements Fx {
  private run = new Every(3, 6, 0.6);
  private p = -1;
  update(_L: FxHost, dt: number): void {
    this.p = this.run.tick(dt);
  }
  smack(): void {
    this.run.fire();
  }
  front(L: FxHost, ctx: Ctx): void {
    if (this.p < 0) return;
    const a = Math.sin(this.p * Math.PI);
    ctx.lineCap = 'round';
    for (const s of [-1, 1])
      for (let k = 0; k < 3; k++) {
        const ang = -Math.PI / 2 + s * (0.62 + k * 0.28);
        const r0 = R + 6;
        const r1 = R + 18 + 4 * a;
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          const rr = r0 + (r1 - r0) * u;
          const off = Math.sin(u * 10 + L.t * 40) * 2.2;
          const x = HX + Math.cos(ang) * rr - Math.sin(ang) * off;
          const y = HY + Math.sin(ang) * rr + Math.cos(ang) * off;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * a})`;
        ctx.lineWidth = 4.4;
        ctx.stroke();
        ctx.strokeStyle = rgba(INK, 0.9 * a);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
  }
}

// ——— shrinking now and then, and back (Ant-Pan) ———

class Shrink implements Fx {
  private run = new Every(3.5, 6.5, 1);
  update(L: FxHost, dt: number): void {
    const p = this.run.tick(dt);
    let s = 1;
    if (p >= 0) {
      // down fast, a beat small, then up past full size and settle
      s = p < 0.15 ? 1 - 0.2 * smooth(0, 0.15, p) : p < 0.5 ? 0.8 : 0.8 + 0.2 * smooth(0.5, 0.62, p) + 0.07 * Math.sin(smooth(0.5, 1, p) * Math.PI) * (1 - p);
      if (p < 0.02 || (p > 0.5 && p < 0.52)) {
        // pym sparkles ring out as it changes size
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          L.emitP('ruby', HX + Math.cos(a) * R * 0.9, HY + Math.sin(a) * R * 0.9, Math.cos(a) * 60, Math.sin(a) * 60, 7, 3, 0.4, { drag: 2 });
        }
      }
    }
    L.scale = reduced() ? 1 + (s - 1) * 0.4 : s;
  }
  smack(): void {
    this.run.fire();
  }
}

// ——— boing: a stretchy hero springs up now and then (Plastic Pan, Mr Elastic Cheese) ———

class Boing implements Fx {
  private next = rnd(2, 4);
  update(L: FxHost, dt: number): void {
    this.next -= dt;
    if (this.next <= 0) {
      this.next = rnd(2.6, 5);
      L.kickQ -= reduced() ? 0.8 : 2.4;
    }
  }
}

// ——— drips forming on the rim and falling (the symbiote's goo, the swamp's moss) ———

class Drips implements Fx {
  private d: { a: number; l: number; dur: number }[] = [];
  constructor(private o: { col: string; hi: string; spr: HeroSpr; n?: number }) {
    for (let i = 0; i < (o.n ?? 3); i++) this.d.push({ a: rnd(0.5, 2.6), l: crand(), dur: rnd(1.3, 2.4) });
  }
  update(L: FxHost, dt: number): void {
    for (const d of this.d) {
      d.l += dt / d.dur;
      if (d.l >= 1) {
        const [x, y] = this.tip(d);
        L.emitP(this.o.spr, x, y + 2, 0, 30, 7, 6, 0.7, { grav: 500, drag: 0.2, spin: 0, rot: 0 });
        d.l = 0;
        d.a = rnd(0.45, 2.7);
        d.dur = rnd(1.3, 2.4);
      }
    }
  }
  private tip(d: { a: number; l: number }): [number, number] {
    const x = HX + Math.cos(d.a) * (R - 3);
    const y = HY + Math.sin(d.a) * (R - 3);
    return [x, y + 3 + 13 * d.l * d.l];
  }
  front(_L: FxHost, ctx: Ctx): void {
    for (const d of this.d) {
      const x = HX + Math.cos(d.a) * (R - 3);
      const y = HY + Math.sin(d.a) * (R - 3);
      const [tx, ty] = this.tip(d);
      const br = 2.2 + 2.2 * d.l;
      ctx.beginPath();
      ctx.moveTo(x - 4.5, y - 1);
      ctx.quadraticCurveTo(x - 1.5, y + 3, tx - br, ty);
      ctx.arc(tx, ty, br, Math.PI, 0, true);
      ctx.quadraticCurveTo(x + 1.5, y + 3, x + 4.5, y - 1);
      ctx.closePath();
      ctx.fillStyle = this.o.col;
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.8);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ellipse(ctx, tx - br * 0.35, ty - br * 0.3, br * 0.3, br * 0.22, -0.5);
      ctx.fillStyle = this.o.hi;
      ctx.fill();
    }
  }
}

// ——— the rocket's exhaust (Rocket Rucola) ———

class Exhaust implements Fx {
  update(L: FxHost, dt: number): void {
    if (crand() < dt * 2.2) L.emitP('smoke', HX + rnd(-3, 3), EMB_Y + 20, rnd(-20, 10), rnd(15, 35), 10, 24, rnd(0.6, 1), { drag: 1.2, a: 0.55, fin: 0.15 });
  }
  front(L: FxHost, ctx: Ctx): void {
    const f = 0.8 + 0.2 * noise1(L.t * 18) + (L.sm < 0.4 ? 0.6 * (1 - L.sm / 0.4) : 0);
    const y = EMB_Y + 12;
    const len = 9 * f;
    lighter(ctx, () => glowDot(ctx, HX, y + 3, 10 * f, '#ff9a2a', 0.5));
    ctx.beginPath();
    ctx.moveTo(HX - 3.5, y);
    ctx.quadraticCurveTo(HX - 3, y + len * 0.6, HX, y + len);
    ctx.quadraticCurveTo(HX + 3, y + len * 0.6, HX + 3.5, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, '#fff6c0');
    g.addColorStop(0.5, '#ffb030');
    g.addColorStop(1, 'rgba(255,90,20,0.2)');
    ctx.fillStyle = g;
    ctx.fill();
  }
}

// ——— claw slashes across the head on a smack (Wolverpeel) ———

class Slash implements Fx {
  private s = -1;
  constructor(private col: string) {}
  update(_L: FxHost, dt: number): void {
    if (this.s >= 0) {
      this.s += dt / 0.5;
      if (this.s >= 1) this.s = -1;
    }
  }
  front(_L: FxHost, ctx: Ctx): void {
    if (this.s < 0) return;
    lighter(ctx, () => {
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const t = this.s - k * 0.06;
        if (t <= 0) continue;
        const reach = smooth(0, 0.18, t);
        const a = 1 - smooth(0.35, 1, t);
        const x0 = HX + 52 - k * 18;
        const y0 = HY - 62 + k * 6;
        const x1 = x0 - 80 * reach;
        const y1 = y0 + 110 * reach;
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, rgba(this.col, 0));
        g.addColorStop(0.6, rgba(this.col, 0.8 * a));
        g.addColorStop(1, rgba('#ffffff', a));
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2 + 10, (y0 + y1) / 2, x1, y1);
        ctx.strokeStyle = g;
        ctx.lineWidth = 4.5;
        ctx.stroke();
      }
    });
  }
  smack(): void {
    this.s = 0;
  }
}

// ——— stones glowing in turn (Iron Pan Mark Infinity's six) ———

class Gems implements Fx {
  constructor(private o: { pts: [number, number][]; cols: string[] }) {}
  front(L: FxHost, ctx: Ctx): void {
    const n = this.o.pts.length;
    const hit = L.sm < 0.6 ? 1 - L.sm / 0.6 : 0;
    lighter(ctx, () =>
      this.o.pts.forEach(([x, y], i) => {
        const ph = (L.t * 1.6 - i / n) % 1;
        const a = Math.max(Math.pow(Math.max(0, Math.sin(((ph + 1) % 1) * Math.PI)), 6), hit);
        glowDot(ctx, x, y, 12 + 6 * a, this.o.cols[i], 0.75 * a);
      }),
    );
  }
}

// ——— portals opening beside the head (the Endgame variants' ring of portals), and a glint on the hex badge ———

class Portals implements Fx {
  private ps: { x: number; y: number; t: number }[] = [];
  private next = rnd(1.5, 3);
  private open(side: number): void {
    this.ps.push({ x: HX + side * (R + 14), y: HY + rnd(-30, 40), t: 0 });
  }
  update(_L: FxHost, dt: number): void {
    this.next -= dt;
    if (this.next <= 0) {
      this.next = rnd(4.5, 7.5);
      this.open(crand() < 0.5 ? -1 : 1);
    }
    for (const p of this.ps) p.t += dt / 1.6;
    this.ps = this.ps.filter((p) => p.t < 1);
  }
  back(L: FxHost, ctx: Ctx): void {
    lighter(ctx, () => {
      for (const p of this.ps) {
        const r = 18 * smooth(0, 0.2, p.t) * (1 - smooth(0.8, 1, p.t));
        if (r < 0.5) continue;
        glowDot(ctx, p.x, p.y, r * 1.4, '#ff8a1c', 0.15);
        for (let k = 0; k < 14; k++) {
          const a = L.t * 4 + (k / 14) * TAU;
          const fl = 0.5 + 0.5 * noise1(L.t * 8 + k * 2.3);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, a, a + 0.25);
          ctx.strokeStyle = rgba(k % 2 ? '#ffd23f' : '#ff7a1a', 0.9 * fl);
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
      }
    });
  }
  smack(): void {
    this.open(-1);
    this.open(1);
  }
}

// ——— a light breathing at a point, a beat every couple of seconds (an arc reactor, a badge's charge) ———

class Breathe implements Fx {
  constructor(private o: { col: string; cx: number; cy: number; r: number; hz?: number; a?: number }) {}
  front(L: FxHost, ctx: Ctx): void {
    const o = this.o;
    const ph = (L.t * (o.hz ?? 0.45)) % 1;
    // a slow swell to a bright beat, then down
    const b = Math.pow(Math.sin(ph * Math.PI), 3);
    const hit = L.sm < 0.5 ? 1 - L.sm / 0.5 : 0;
    const a = (o.a ?? 0.6) * (0.25 + 0.75 * Math.max(b, hit));
    lighter(ctx, () => {
      glowDot(ctx, o.cx, o.cy, o.r * (1 + 0.25 * b), o.col, a);
      glowDot(ctx, o.cx, o.cy, o.r * 0.35, '#ffffff', a * 0.6);
    });
  }
}

// ——— a light running along a visor (Cyclopizza, the Wasp) ———

class Visor implements Fx {
  constructor(private o: { col: string; x0: number; x1: number; y: number }) {}
  front(L: FxHost, ctx: Ctx): void {
    const o = this.o;
    const u = 0.5 + 0.5 * Math.sin(L.t * 1.7);
    const x = o.x0 + (o.x1 - o.x0) * u;
    // a steady hum, and a pulse every 2.6 s
    const pulse = Math.pow(Math.max(0, Math.sin(L.t * 1.2)), 12);
    const p = 0.7 + 0.3 * Math.sin(L.t * 3.3) + 1.6 * pulse + (L.sm < 0.5 ? 1 - L.sm / 0.5 : 0);
    lighter(ctx, () => {
      const g = ctx.createLinearGradient(o.x0 - 10, 0, o.x1 + 10, 0);
      g.addColorStop(0, rgba(o.col, 0));
      g.addColorStop(0.15, rgba(o.col, 0.22 * p));
      g.addColorStop(0.85, rgba(o.col, 0.22 * p));
      g.addColorStop(1, rgba(o.col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(o.x0 - 10, o.y - 9, o.x1 - o.x0 + 20, 18);
      ctx.save();
      ctx.translate(x, o.y);
      ctx.scale(2.2, 0.55);
      glowDot(ctx, 0, 0, 10, '#ffffff', 0.7);
      ctx.restore();
    });
  }
}

// ════════════════════════════ every hero's spec ════════════════════════════

const gold = (n: number, at: At = 'emblem'): Burst => ({ spr: 'gold', n, at });
const sparks = (spr: HeroSpr, n: number, at: At = 'rim', speed: [number, number] = [90, 200]): Burst => ({ spr, n, at, speed });
const emblemGlint = (rate = 0.5): Fx => new Sparkle({ col: '#ffffff', pts: [[HX - 8, EMB_Y - 10], [HX + 10, EMB_Y + 6]], rate, size: 6 });

/** Each hero, by its base id (the variants: VARIANT below). */
const HERO_SPECS: Record<string, HeroSpec> = {
  superpeel: {
    cape: 1,
    blink: 'blink',
    eyeGlow: { col: '#ff4a3a', mode: 'heat' },
    glyph: 'flip',
    glyphCol: '#ffd23f',
    fx: () => [new Beams({ col: '#ff3a2a' }), emblemGlint()],
    words: [W.POW, W.WHAM, W.KAPOW],
    burst: [gold(8), sparks('spark', 5, 'eyes')],
  },
  batpeel: {
    cape: 1.2,
    glyph: 'sweep',
    glyphCol: '#ffd23f',
    fx: () => [new Bats()],
    words: [W.THWACK, W.BAM, W.POW],
    burst: [{ spr: 'smoke', n: 3, at: 'below', speed: [20, 60], size: [14, 34], life: [0.5, 0.8] }, gold(5)],
  },
  wonderwedge: {
    blink: 'blink',
    glyph: 'pulse',
    glyphCol: '#ffd23f',
    fx: () => [new Lasso(), new Sparkle({ col: '#3ad8c8', pts: [[HX, HY - 54]], rate: 0.6, size: 8 })],
    words: [W.WHAM, W.POW, W.KAPOW],
    burst: [gold(8, 'rim'), { spr: 'glint', n: 3, at: 'rim' }],
  },
  flashfoot: {
    ears: 'sway',
    blink: 'squint',
    glyph: 'flicker',
    glyphCol: '#ffd23f',
    fx: () => [new Speed('#ffd23f'), new Arcs({ col: '#ffd23f', hot: '#fff6c0', rate: 1.6, len: 0.5, jag: 12 })],
    words: [W.WHOOSH, W.ZAP, W.ZZZT],
    burst: [sparks('spark', 10, 'rim', [180, 320])],
    feel: { sway: 1 },
  },
  aquatoe: {
    blink: 'blink',
    glyph: 'sweep',
    glyphCol: '#bff4ff',
    fx: () => [
      new Emitter({ spr: 'bubble', rate: 2.4, at: 'below', vx: [-8, 8], vy: [-44, -24], size: [8, 13], life: [1.4, 2.2], drag: 0.3, move: 1, fin: 0.3 }),
      new PatWave({ a: 0.6, speed: 0.4, dir: 'across', width: 0.22 }),
    ],
    words: [W.SPLOOSH, W.WHAM],
    burst: [{ spr: 'drop', n: 8, at: 'rim', speed: [120, 220], grav: 500, size: [8, 6] }, { spr: 'bubble', n: 5, at: 'below', speed: [30, 80], size: [6, 10], life: [0.8, 1.2] }],
  },
  greenlampshade: {
    blink: 'squint',
    glyph: 'pulse',
    glyphCol: '#7dff9a',
    glow: { col: 0x5dff8a, a: 0.22, r: 1.15 },
    fx: () => [new Aura('#7dff9a'), new Cone('#9dffb0')],
    words: [W.WHAM, W.POW],
    burst: [sparks('sparkG', 10, 'rim', [120, 240])],
  },
  spiderpan: {
    blink: 'squint',
    glyph: 'beat',
    glyphCol: '#ff5a5a',
    fx: () => [new Webs(false), new Sense()],
    words: [W.SPLAT, W.THWACK, W.POW],
    burst: [{ spr: 'white', n: 6, at: 'rim', speed: [80, 160] }],
  },
  ironpan: {
    eyeGlow: { col: '#bff4ff', mode: 'steady', a: 0.55 },
    glyph: 'beat',
    glyphCol: '#9ff0ff',
    glow: { col: 0x6ae8ff, a: 0.12, r: 0.9 },
    fx: () => [new Breathe({ col: '#9ff0ff', cx: HX, cy: EMB_Y, r: 34, a: 0.7 }), new Sheen({ a: 0.45, every: [2, 3.2] }), new Rings({ col: '#9ff0ff', rate: 0, cx: HX, cy: EMB_Y, r0: 14, grow: 90, life: 0.5, front: true, smackN: 2 })],
    words: [W.CLANG, W.BOOM, W.BLAM],
    burst: [sparks('sparkN', 8, 'emblem', [160, 260]), { spr: 'white', n: 4, at: 'emblem', speed: [60, 120] }],
  },
  captainpizzeria: {
    ears: 'perk',
    blink: 'blink',
    glyph: 'flip',
    glyphCol: '#ffffff',
    fx: () => [new Sheen({ a: 0.8, cx: HX, cy: EMB_Y, r: 22, every: [1.6, 2.6] }), new Sparkle({ col: '#ffffff', pts: [[HX + 12, EMB_Y - 12]], rate: 0.5, size: 8 })],
    words: [W.CLANG, W.PING, W.WHAM],
    burst: [{ spr: 'star', n: 6, at: 'emblem', speed: [100, 200], frame: 1 }, gold(4)],
  },
  incrediblebulk: {
    blink: 'blink',
    glow: { col: 0x6aff4a, a: 0.06, r: 1.15 },
    fx: () => [new Rage(), new PatWave({ a: 0.35, base: 0.2, speed: 0.6, dir: 'up', width: 0.35 })],
    words: [W.SMASH, W.RRRAH, W.WHAM],
    burst: [{ spr: 'dust', n: 4, at: 'below', speed: [40, 100], size: [16, 40], life: [0.5, 0.8] }, { spr: 'crumb', n: 8, at: 'below', speed: [120, 220], grav: 600 }],
    feel: { shake: 2.6, squash: 0.05 },
  },
  blackwindow: {
    blink: 'blink',
    glyph: 'pulse',
    glyphCol: '#ff3a3a',
    fx: () => [new Arcs({ col: '#6ab8ff', rate: 0.7, len: 0.3, jag: 10, r: R - 2, w: 0.8 }), new Sheen({ a: 0.3 })],
    words: [W.BAM, W.ZZZT, W.WHAM],
    burst: [sparks('sparkB', 8, 'rim', [140, 240]), { spr: 'ruby', n: 3, at: 'emblem', speed: [50, 100] }],
  },
  hawkeyetalian: {
    ears: 'sway',
    blink: 'squint',
    fx: () => [new Reticle({ col: '#ffd23f', cx: HX, cy: EMB_Y, r: 28 })],
    words: [W.TWANG, W.THUNK],
    burst: [{ spr: 'sparkV', n: 6, at: 'emblem', speed: [100, 200] }, { spr: 'glint', n: 2, at: 'emblem' }],
  },
  wolverpeel: {
    blink: 'blink',
    glyph: 'sweep',
    glyphCol: '#ffffff',
    fx: () => [new Slash('#bfe0ff')],
    words: [W.SHING, W.KRAK],
    burst: [sparks('spark', 8, 'rim', [180, 300])],
  },
  stormyweather: {
    eyeGlow: { col: '#e8f4ff', mode: 'flicker', a: 0.7 },
    glyph: 'flicker',
    glyphCol: '#e8f4ff',
    glow: { col: 0x9ac8ff, a: 0.12, r: 1.2 },
    fx: () => [
      new Arcs({ col: '#9ad0ff', hot: '#ffffff', rate: 2.2, from: Math.PI * 1.05, to: Math.PI * 1.95, len: 0.55, jag: 20 }),
      new Emitter({ spr: 'smoke', rate: 1.1, at: 'top', vx: [-14, 14], vy: [-14, -4], size: [16, 34], life: [1.2, 1.8], a: 0.32, drag: 0.4, fin: 0.3 }),
    ],
    words: [W.KRAK, W.BOOM],
    burst: [sparks('sparkB', 8, 'top', [120, 240]), { spr: 'white', n: 4, at: 'top', speed: [60, 120] }],
  },
  cyclopizza: {
    glyph: 'pulse',
    glyphCol: '#ff4a3a',
    fx: () => [new Visor({ col: '#ff3a2a', x0: HX - 54, x1: HX + 54, y: EYE_Y }), new Beams({ col: '#ff2a2a', visor: true, len: 120 })],
    words: [W.BLAM, W.ZAP],
    burst: [{ spr: 'ruby', n: 6, at: 'eyes', speed: [120, 220] }],
  },
  blackpanther: {
    ears: 'twitch',
    glyph: 'pulse',
    glyphCol: '#c9a8ff',
    glow: { col: 0xa77dff, a: 0.12, r: 1.12 },
    fx: () => [new PatWave({ a: 0.75, base: 0.08, speed: 0.4, dir: 'down', width: 0.22 }), new Sheen({ a: 0.25 }), new Rings({ col: '#c9a8ff', rate: 0, r0: R * 0.8, grow: 60, life: 0.6, front: true, smackN: 2 })],
    words: [W.WHAM, W.BOOM],
    burst: [sparks('sparkV', 10, 'rim', [140, 260])],
  },
  strangeloaf: {
    cape: 0.7,
    blink: 'blink',
    glyph: 'pulse',
    glyphCol: '#7dff9a',
    fx: () => [new Mandala({ col: '#ff9a2a', hot: '#ffe08a', r: R + 10, a: 1.25 })],
    words: [W.ZWOOM, W.KAPOW],
    burst: [sparks('ember', 10, 'rim', [140, 240]), { spr: 'sparkG', n: 4, at: 'emblem', speed: [60, 120] }],
  },
  scarletpitch: {
    eyeGlow: { col: '#ff7ad9', mode: 'steady', a: 0.6 },
    glyph: 'beat',
    glyphCol: '#ff7ad9',
    glow: { col: 0xff4a8a, a: 0.07, r: 1.12 },
    fx: () => [new Mandala({ col: '#ff4a8a', hot: '#ffb0e0', r: R + 6, hex: true, haze: 0.5 }), new Wisps({ col: '#ff5ab0', n: 3 })],
    words: [W.ZWOOM, W.KRAK],
    burst: [{ spr: 'star', n: 6, at: 'rim', speed: [100, 200], frame: 2 }, sparks('sparkV', 6)],
  },
  antpan: {
    ears: 'twitch',
    eyeGlow: { col: '#ff6a5a', mode: 'steady', a: 0.45 },
    glyph: 'boing',
    fx: () => [new Shrink()],
    words: [W.PING, W.WHAM],
    burst: [{ spr: 'ruby', n: 8, at: 'rim', speed: [100, 200] }],
  },
  daredough: {
    glyph: 'pulse',
    glyphCol: '#ff5a4a',
    fx: () => [new Rings({ col: '#ff4a3a', rate: 0.9, r0: R * 0.85, grow: 40, life: 1.6, w: 1.5, smackN: 2 }), new Breathe({ col: '#ff5a4a', cx: HX, cy: EMB_Y, r: 30, hz: 0.9, a: 0.5 })],
    words: [W.WHAM, W.THWACK],
    burst: [{ spr: 'ruby', n: 6, at: 'rim', speed: [100, 180] }],
  },
  deadpeel: {
    blink: 'squint',
    glyph: 'spin',
    glyphCol: '#ff5a5a',
    fx: () => [new Sparkle({ col: '#dfe8f0', pts: [[64, 18], [156, 18], [76, 40], [144, 40]], rate: 0.9, size: 7 })],
    words: [W.OOF, W.BLAM, W.SPLAT],
    burst: [{ spr: 'confetti', n: 8, at: 'top', speed: [100, 200], grav: 300 }, { spr: 'ruby', n: 3, at: 'rim' }],
  },
  silverslicer: {
    eyeGlow: { col: '#ffffff', mode: 'steady', a: 0.5 },
    glyph: 'sweep',
    glyphCol: '#ffffff',
    glow: { col: 0xbfefff, a: 0.12, r: 1.15 },
    fx: () => [new Sheen({ a: 0.8, every: [1.4, 2.6] }), new Sparkle({ col: '#bfefff', rate: 2.4, size: 7 })],
    words: [W.WHOOSH, W.SHING],
    burst: [{ spr: 'white', n: 8, at: 'rim', speed: [120, 240] }, sparks('sparkB', 4)],
  },
  iamcrust: {
    ears: 'sway',
    glyph: 'bob',
    fx: () => [new Emitter({ spr: 'leaf', rate: 0.5, at: 'top', vx: [-20, 20], vy: [-10, 10], grav: 40, drag: 1.4, size: [9, 9], life: [1.8, 2.6], spin: 2, fin: 0.1 })],
    words: [W.IAMCRUST],
    burst: [{ spr: 'leaf', n: 8, at: 'top', speed: [80, 160], grav: 160, drag: 1.2, size: [10, 10], life: [0.9, 1.4] }],
  },
  rocketrucola: {
    ears: 'twitch',
    blink: 'blink',
    glyph: 'bob',
    fx: () => [new Exhaust()],
    words: [W.BOOM, W.KAPOW],
    burst: [{ spr: 'smoke', n: 3, at: 'emblem', speed: [30, 70], size: [14, 30], life: [0.5, 0.8] }, sparks('ember', 6, 'emblem')],
  },
  starlard: {
    eyeGlow: { col: '#ff4a3a', mode: 'steady', a: 0.5 },
    glyph: 'beat',
    glyphCol: '#ff9f1c',
    fx: () => [new Emitter({ spr: 'note', rate: 1.2, at: [[HX - R + 2, HY - 10], [HX + R - 2, HY - 10]], vx: [-16, 16], vy: [-42, -26], size: [10, 12], life: [1.1, 1.6], drag: 0.6, spin: 0, fin: 0.15 })],
    words: [W.BOP, W.BOOM],
    burst: [{ spr: 'note', n: 6, at: 'rim', speed: [80, 160], size: [12, 12], life: [0.8, 1.1] }],
  },
  captainmarvellous: {
    eyeGlow: { col: '#ffe680', mode: 'steady', a: 0.6 },
    glyph: 'spin',
    glyphCol: '#ffd23f',
    glow: { col: 0xffd23f, a: 0.16, r: 1.2 },
    fx: () => [
      new Sparkle({ col: '#ffd23f', rate: 1.6, size: 7 }),
      new Emitter({ spr: 'gold', rate: 2.5, at: 'rim', vy: [-40, -20], size: [6, 3], life: [0.6, 1], drag: 0.5 }),
    ],
    words: [W.KAPOW, W.BOOM],
    burst: [gold(10, 'rim'), { spr: 'star', n: 5, at: 'rim', speed: [100, 200], frame: 0 }],
  },
  shazamozza: {
    cape: 1,
    blink: 'blink',
    glyph: 'flicker',
    glyphCol: '#ffe680',
    fx: () => [new Arcs({ col: '#ffd23f', hot: '#fff6c0', rate: 0.8, cx: HX, cy: EMB_Y, r: 24, len: 0.9, jag: 8, w: 0.7 }), new Strike('#ffd23f')],
    words: [W.KRAK, W.BOOM],
    burst: [gold(8, 'top'), sparks('spark', 5, 'top')],
  },
  cypork: {
    eyeGlow: { col: '#ff2a2a', mode: 'flicker', a: 0.6 },
    glyph: 'pulse',
    glyphCol: '#ff4a3a',
    fx: () => [new Reticle({ col: '#ff4a3a', cx: HX - EYE_DX, cy: EYE_Y, r: 17 }), new Breathe({ col: '#ff3a3a', cx: HX, cy: EMB_Y, r: 30, hz: 0.5, a: 0.55 })],
    words: [W.ZZZT, W.CLANG],
    burst: [sparks('spark', 8, 'rim', [160, 280]), { spr: 'white', n: 3, at: 'eyes' }],
  },
  robinpizza: {
    cape: 1.1,
    blink: 'squint',
    glyph: 'flip',
    glyphCol: '#fff2a0',
    fx: () => [emblemGlint(0.6)],
    words: [W.POW, W.THWACK],
    burst: [gold(6), { spr: 'feather', n: 3, at: 'top', speed: [60, 120], grav: 120 }],
  },
  cattoewoman: {
    ears: 'twitch',
    blink: 'blink',
    glyph: 'beat',
    glyphCol: '#c9a8ff',
    fx: () => [new Sparkle({ col: '#c9a8ff', pts: [[HX - 26, 50], [HX + 18, 50]], rate: 0.6, size: 7 }), new Sheen({ a: 0.25 })],
    words: [W.HISS, W.WHAM],
    burst: [sparks('sparkV', 8, 'rim', [120, 220])],
  },
  martianmozzarella: {
    cape: 0.8,
    eyeGlow: { col: '#ff3a2a', mode: 'steady', a: 0.6 },
    glyph: 'pulse',
    glyphCol: '#ff5a4a',
    fx: () => [new Phase()],
    words: [W.WHAM, W.ZWOOM],
    burst: [sparks('sparkG', 8, 'rim', [120, 220]), { spr: 'ruby', n: 3, at: 'eyes' }],
  },
  greenpepperarrow: {
    blink: 'squint',
    glyph: 'sweep',
    glyphCol: '#ffffff',
    fx: () => [new Sparkle({ col: '#ffffff', pts: [[HX, EMB_Y - 12]], rate: 0.5, size: 7 })],
    words: [W.THUNK, W.TWANG],
    burst: [{ spr: 'sparkG', n: 6, at: 'emblem', speed: [100, 200] }, { spr: 'leaf', n: 3, at: 'top', speed: [60, 120], grav: 120, size: [9, 9] }],
  },
  plasticpan: {
    glyph: 'boing',
    fx: () => [new Boing()],
    words: [W.BOING, W.SPROING],
    burst: [{ spr: 'star', n: 6, at: 'rim', speed: [100, 200], frame: 0 }],
    feel: STRETCHY,
  },
  hawkcrust: {
    ears: 'flap',
    blink: 'blink',
    glyph: 'sweep',
    glyphCol: '#fff2b0',
    fx: () => [new Emitter({ spr: 'feather', rate: 0.35, at: [[HX - 96, HY - 16], [HX + 96, HY - 16]], vx: [-20, 20], vy: [-10, 10], grav: 60, drag: 1.2, size: [10, 10], life: [1.4, 2], spin: 2 }), new Sheen({ a: 0.3 })],
    words: [W.SKREE, W.WHAM],
    burst: [{ spr: 'feather', n: 6, at: [[HX - 90, HY - 20], [HX + 90, HY - 20]], speed: [80, 160], grav: 140, drag: 1, size: [10, 10] }, gold(4)],
  },
  bluebeetroot: {
    eyeGlow: { col: '#5fd8ff', mode: 'steady', a: 0.5 },
    glyph: 'beat',
    glyphCol: '#9ff0ff',
    glow: { col: 0x5fd8ff, a: 0.12, r: 1.12 },
    fx: () => [new PatWave({ a: 0.8, base: 0.1, speed: 0.35, dir: 'up', width: 0.2 }), new Sheen({ a: 0.25 })],
    words: [W.ZAP, W.WHAM],
    burst: [sparks('sparkB', 8, 'rim', [140, 240]), sparks('sparkN', 4, 'emblem')],
  },
  boostergouda: {
    glyph: 'bob',
    fx: () => [new Sparkle({ col: '#ffd23f', pts: [[HX - EYE_DX, EYE_Y], [HX + EYE_DX, EYE_Y]], rate: 0.9, size: 8 }), new Sparkle({ col: '#ffd23f', rate: 0.8, size: 6 }), new Sheen({ a: 0.25 })],
    words: [W.PING, W.KAPOW],
    burst: [{ spr: 'star', n: 7, at: 'rim', speed: [100, 200], frame: 0 }],
  },
  staticcling: {
    blink: 'squint',
    glyph: 'flicker',
    glyphCol: '#ffd23f',
    fx: () => [new Arcs({ col: '#5fd8ff', hot: '#fff6c0', rate: 2, len: 0.6, jag: 14 }), new PatWave({ a: 0.7, base: 0.15, speed: 0.8, dir: 'across', width: 0.18 })],
    words: [W.ZZZT, W.ZAP],
    burst: [sparks('sparkN', 10, 'rim', [160, 280]), gold(4, 'rim')],
  },
  zatannapanna: {
    blink: 'blink',
    glyph: 'flip',
    glyphCol: '#ffffff',
    fx: () => [new Sparkle({ col: '#e0c8ff', area: [HX, HY - R + 8, 50, 30], rate: 1.4, size: 6 }), new Sparkle({ col: '#ffffff', pts: [[HX + 10, EMB_Y - 12]], rate: 0.8, size: 6 })],
    words: [W.POOF, W.TADA],
    burst: [{ spr: 'smoke', n: 3, at: 'top', speed: [30, 70], size: [16, 36], life: [0.5, 0.8] }, { spr: 'star', n: 6, at: 'top', speed: [100, 200], frame: 1 }],
  },
  swampthincrust: {
    ears: 'sway',
    eyeGlow: { col: '#ff3a2a', mode: 'flicker', a: 0.55 },
    glyph: 'bob',
    fx: () => [new Drips({ col: '#5a8a2a', hi: '#c8f08a', spr: 'drop', n: 2 }), new Emitter({ spr: 'sparkG', rate: 1.6, at: 'head', vy: [-24, -10], size: [4, 2], life: [1, 1.6], drag: 0.4, fin: 0.3 })],
    words: [W.SQUELCH, W.SPLAT],
    burst: [{ spr: 'leaf', n: 6, at: 'rim', speed: [80, 160], grav: 160, size: [9, 9] }, sparks('sparkG', 6)],
  },
  nightwings: {
    blink: 'squint',
    glyph: 'pulse',
    glyphCol: '#5aa8ff',
    fx: () => [new Arcs({ col: '#3a8aff', hot: '#d8ecff', rate: 2.2, cx: HX, cy: EMB_Y, r: 23, len: 1, jag: 10, w: 0.9 }), new Breathe({ col: '#3a8aff', cx: HX, cy: EMB_Y, r: 32, hz: 0.5, a: 0.55 })],
    words: [W.THWACK, W.WHAM],
    burst: [sparks('sparkB', 8, 'emblem', [140, 240])],
  },
  ghostroaster: {
    ears: 'flicker',
    eyeGlow: { col: '#ffb030', mode: 'flicker', a: 0.6 },
    glyph: 'flicker',
    glyphCol: '#ffb030',
    fx: () => [new PatWave({ a: 0.7, base: 0.25, speed: 0.5, dir: 'up', width: 0.3 }), new Emitter({ spr: 'ember', rate: 4, at: 'top', vx: [-12, 12], vy: [-60, -30], size: [6, 2], life: [0.6, 1], drag: 0.3, move: 1 })],
    words: [W.FWOOSH, W.BOOM],
    burst: [sparks('ember', 10, 'top', [140, 260]), { spr: 'smoke', n: 2, at: 'top', speed: [20, 50], size: [14, 30], life: [0.5, 0.8] }],
  },
  moonknife: {
    cape: 1,
    eyeGlow: { col: '#d8f0ff', mode: 'steady', a: 0.55 },
    glyph: 'sweep',
    glyphCol: '#ffffff',
    glow: { col: 0xd8f0ff, a: 0.1, r: 1.15 },
    fx: () => [new Sparkle({ col: '#d8f0ff', rate: 0.7, size: 5 })],
    words: [W.THWACK, W.KRAK],
    burst: [{ spr: 'white', n: 8, at: 'rim', speed: [120, 220] }],
  },
  shebulk: {
    blink: 'blink',
    glyph: 'swing',
    glow: { col: 0x7be04a, a: 0.08, r: 1.12 },
    words: [W.ORDER, W.SMASH],
    burst: [{ spr: 'dust', n: 3, at: 'below', speed: [40, 90], size: [14, 34], life: [0.5, 0.8] }, sparks('sparkG', 5)],
    feel: { shake: 1.8 },
  },
  wasabiwasp: {
    ears: 'buzz',
    glyph: 'pulse',
    glyphCol: '#7be04a',
    fx: () => [new Visor({ col: '#7be04a', x0: HX - 54, x1: HX + 54, y: EYE_Y }), new Arcs({ col: '#7be04a', hot: '#f0ffd0', rate: 0.6, cx: HX, cy: EMB_Y, r: 24, len: 0.8, jag: 9, w: 0.7 })],
    words: [W.BZZZ, W.ZAP],
    burst: [sparks('sparkG', 10, 'rim', [140, 260])],
  },
  gambeet: {
    glyph: 'pulse',
    glyphCol: '#ff3d6e',
    fx: () => [new Sparkle({ col: '#ff5a9a', pts: [[HX - 6, EMB_Y - 8], [HX + 6, EMB_Y + 4]], rate: 1, size: 6 })],
    words: [W.BOOM, W.BAM],
    burst: [{ spr: 'card', n: 5, at: 'emblem', speed: [120, 220], size: [14, 14], life: [0.7, 1], drag: 1 }, sparks('sparkV', 5, 'emblem')],
  },
  icecreamman: {
    eyeGlow: { col: '#ffffff', mode: 'steady', a: 0.5 },
    glyph: 'spin',
    glyphCol: '#ffffff',
    glow: { col: 0xbfe8ff, a: 0.14, r: 1.15 },
    fx: () => [
      new PatWave({ a: 0.7, base: 0.15, speed: 0.3, dir: 'down', width: 0.25 }),
      new Emitter({ spr: 'mist', rate: 1.3, at: 'below', vx: [-12, 12], vy: [6, 20], size: [14, 34], life: [1, 1.6], a: 0.5, drag: 0.6, fin: 0.25 }),
      new Breathe({ col: '#d8f6ff', cx: HX, cy: EMB_Y, r: 32, hz: 0.45, a: 0.55 }),
      new Sparkle({ col: '#d8f6ff', rate: 1.4, size: 6 }),
      new Emitter({ spr: 'flake', rate: 2, at: 'top', vx: [-14, 14], vy: [-10, 6], grav: 30, size: [6, 6], life: [1.2, 1.8], drag: 1, spin: 1.5 }),
    ],
    words: [W.BRRR, W.KRAK],
    burst: [{ spr: 'flake', n: 10, at: 'rim', speed: [100, 200], size: [7, 6], grav: 80 }, { spr: 'mist', n: 2, at: 'below', speed: [20, 50], size: [16, 36], life: [0.6, 0.9] }],
  },
  humanscorch: {
    ears: 'flicker',
    eyeGlow: { col: '#fff6c0', mode: 'flicker', a: 0.6 },
    glyph: 'spin',
    glyphCol: '#fff6c0',
    fx: () => [new PatWave({ a: 0.65, base: 0.2, speed: 0.7, dir: 'up', width: 0.3 }), new Emitter({ spr: 'ember', rate: 5, at: 'top', vx: [-14, 14], vy: [-70, -36], size: [6, 2], life: [0.5, 0.9], drag: 0.3, move: 1 })],
    words: [W.FWOOSH, W.BOOM],
    burst: [sparks('ember', 12, 'rim', [160, 280])],
  },
  mrelasticcheese: {
    blink: 'blink',
    glyph: 'boing',
    fx: () => [new Boing()],
    words: [W.BOING, W.SPROING],
    burst: [gold(6, 'rim')],
    feel: STRETCHY,
  },
  squirrelgourmet: {
    ears: 'twitch',
    tail: true,
    glyph: 'bob',
    words: [W.NOM, W.CRUNCH],
    burst: [{ spr: 'crumb', n: 8, at: 'below', speed: [100, 200], grav: 600 }, { spr: 'leaf', n: 2, at: 'top', speed: [60, 100], grav: 120, size: [9, 9] }],
  },
};

/** Infinity's six stones, where its detail sets them. */
const INFINITY_GEMS: [number, number][] = Array.from({ length: 6 }, (_, i) => {
  const a = Math.PI * (0.15 + (i / 5) * 0.7);
  return [HX - Math.cos(a) * 64, HY + 30 + Math.sin(a) * 40];
});

/** The variants: their base hero's spec, changed. */
function variantSpec(id: string): HeroSpec | null {
  const v = (base: string, over: Partial<HeroSpec>): HeroSpec => ({ ...HERO_SPECS[base], ...over });
  switch (id) {
    case 'superpeelprime':
      return v('superpeel', {
        eyeGlow: { col: '#ff4a2a', mode: 'heat', a: 0.5 },
        glyph: 'sweep',
        glyphCol: '#ffffff',
        glow: { col: 0xff3a2a, a: 0.1, r: 1.15 },
        fx: () => [new Beams({ col: '#ff2a1a', len: 170 }), new Sheen({ a: 0.35 })],
        words: [W.BLAM, W.KAPOW, W.BOOM],
        burst: [sparks('ember', 10, 'eyes', [140, 260]), sparks('ruby', 4, 'eyes')],
      });
    case 'darkkneader':
      return v('batpeel', {
        eyeGlow: { col: '#ffffff', mode: 'steady', a: 0.5 },
        fx: () => [new Bats(), new Sheen({ a: 0.25 })],
        words: [W.THWACK, W.KRAK, W.BAM],
      });
    case 'amazonqueen':
      return v('wonderwedge', {
        fx: () => [new Lasso(), new Sparkle({ col: '#ffd23f', pts: [[HX - 76, HY - R + 4], [HX + 76, HY - R + 4], [HX - 40, HY - R - 4], [HX + 40, HY - R - 4], [HX, HY - 54]], rate: 1.2, size: 8 }), new Sheen({ a: 0.3 })],
      });
    case 'symbiotepan':
      return v('spiderpan', {
        glyphCol: '#c8c8ff',
        glow: { col: 0x7a6aff, a: 0.1, r: 1.1 },
        fx: () => [new Webs(true), new Drips({ col: '#16161e', hi: '#8a8ad8', spr: 'goo' }), new Sense()],
        words: [W.SPLAT, W.SMASH, W.SQUELCH],
        burst: [{ spr: 'goo', n: 8, at: 'rim', speed: [120, 220], grav: 500 }],
      });
    case 'ironpaninfinity':
      return v('ironpan', {
        fx: () => [
          new Sheen({ a: 0.45 }),
          new Rings({ col: '#ffffff', rate: 0, cx: HX, cy: EMB_Y, r0: 14, grow: 100, life: 0.55, front: true, smackN: 3 }),
          new Gems({ pts: INFINITY_GEMS, cols: ['#9a7aff', '#ff5a5a', '#5a9aff', '#ffe04a', '#ffa04a', '#5ae08a'] }),
        ],
        burst: [{ spr: 'star', n: 6, at: 'emblem', speed: [140, 240], frame: 3 }, sparks('sparkN', 6, 'emblem', [160, 260]), gold(4)],
      });
    case 'shieldofliberty':
      return v('captainpizzeria', {
        fx: () => [new Sheen({ a: 0.75, cx: HX + 46, cy: HY + 62, r: 34, every: [2, 4] }), new Sparkle({ col: '#ffffff', pts: [[HX + 46, HY + 62]], rate: 0.6, size: 9 }), new Sheen({ a: 0.2 })],
        burst: [{ spr: 'star', n: 8, at: [[HX + 46, HY + 62]], speed: [120, 220], frame: 1 }, gold(5, [[HX + 46, HY + 62]])],
      });
  }
  return null;
}

/** Each Endgame variant's own extra, over its base hero's life (beside the portals every Endgame shares). */
const ENDGAME_EXTRA: Record<string, () => Fx[]> = {
  captainmarvellous: () => [new Wisps({ col: '#ffd23f', n: 2 })],
  starlard: () => [new Wisps({ col: '#ff9f1c', n: 2 })],
  incrediblebulk: () => [new Rings({ col: '#7be04a', rate: 0.5, r0: R * 0.9, grow: 30, life: 1.4 })],
  blackwindow: () => [new Arcs({ col: '#6ab8ff', rate: 1.6, len: 0.5, jag: 12, w: 0.9 })],
  hawkeyetalian: () => [new Rings({ col: '#c9a8ff', rate: 0.7, cx: HX, cy: EMB_Y, r0: 18, grow: 26, life: 1, front: true })],
  blackpanther: () => [new Arcs({ col: '#b48aff', hot: '#f0e8ff', rate: 1.8, len: 0.6, jag: 14 })],
  strangeloaf: () => [new Sparkle({ col: '#7dff9a', area: [HX, HY, R + 16, R + 16], rate: 1.6, size: 6 })],
  scarletpitch: () => [new Wisps({ col: '#ff9ad8', n: 2 })],
  antpan: () => [new Rings({ col: '#ff6a5a', rate: 0.8, cx: HX, cy: HY, r0: R * 0.5, grow: 50, life: 1.1, front: true })],
  wasabiwasp: () => [new Arcs({ col: '#7be04a', hot: '#f0ffd0', rate: 1.5, len: 0.5, jag: 12 })],
  rocketrucola: () => [new Emitter({ spr: 'spark', rate: 3, at: 'emblem', vx: [-60, 60], vy: [40, 90], grav: 200, size: [12, 6], life: [0.3, 0.5], drag: 1 })],
  iamcrust: () => [new Sparkle({ col: '#9bff6a', area: [HX, HY - R + 10, 50, 26], rate: 1.4, size: 6 })],
};

/** The Endgame band's hex badge. */
const HEX = { x: HX + R * 0.62, y: HY + R * 0.58 };

/** A hero peel's spec (null for a peel that isn't a hero with a head of parts). */
export function heroSpecOf(peelId: string): HeroSpec | null {
  if (!peelId.startsWith('hero:') || !heroArtOf(peelId)) return null;
  const id = peelId.slice(5);
  if (HERO_SPECS[id]) return HERO_SPECS[id];
  const v = variantSpec(id);
  if (v) return v;
  if (id.endsWith('endgame')) {
    const base = HERO_SPECS[id.slice(0, -'endgame'.length)];
    if (!base) return null;
    const extra = ENDGAME_EXTRA[id.slice(0, -'endgame'.length)];
    return {
      ...base,
      fx: (a) => [...(base.fx?.(a) ?? []), ...(extra?.() ?? []), new Portals(), new Sparkle({ col: '#ffd23f', pts: [[HEX.x, HEX.y]], rate: 0.7, size: 7 })],
      burst: [...base.burst, gold(4, [[HEX.x, HEX.y]])],
    };
  }
  return null;
}

// ════════════════════════════ the rig's parts ════════════════════════════

/** A layer, cut to what it paints: its canvas (at the rig's detail) and its box in peel units. */
export interface Lyr {
  c: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Paint into the hero's box (or another), then cut the canvas down to what was painted (null when nothing was). */
export function cropLayer(RR: number, draw: (ctx: Ctx) => void, B: { x: number; y: number; w: number; h: number } = HERO_BOX): Lyr | null {
  const [c, ctx] = makeCanvas(B.w * RR, B.h * RR);
  ctx.setTransform(RR, 0, 0, RR, -B.x * RR, -B.y * RR);
  draw(ctx);
  const W0 = c.width;
  const H0 = c.height;
  const d = ctx.getImageData(0, 0, W0, H0).data;
  let x0 = W0;
  let y0 = H0;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H0; y++) {
    const row = y * W0 * 4;
    for (let x = 0; x < W0; x++)
      if (d[row + x * 4 + 3] > 2) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 1);
  y0 = Math.max(0, y0 - 1);
  x1 = Math.min(W0 - 1, x1 + 1);
  y1 = Math.min(H0 - 1, y1 + 1);
  const [out, octx] = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  octx.drawImage(c, -x0, -y0);
  return { c: out, x: B.x + x0 / RR, y: B.y + y0 / RR, w: out.width / RR, h: out.height / RR };
}

export interface HeroMini {
  id: string;
  art: HeroArt;
  spec: HeroSpec;
  RR: number;
  shape: PeelShape;
  glow: Lyr | null;
  tail: Lyr | null;
  cape: Lyr | null;
  earsB: Lyr | null;
  head: Lyr;
  eyes: Lyr | null;
  glyph: Lyr | null;
  top: Lyr | null;
  earsF: Lyr | null;
  /** The suit's pattern lit (for a pattern wave). */
  pat: Lyr | null;
}

/** Where each kind of ear turns about, on the right side (mirrored on the left): [dx from the head's centre, dy]. */
const EAR_PIVOT: Partial<Record<NonNullable<HeroArt['ears']>, [number, number]>> = {
  bat: [40, -72],
  cat: [40, -74],
  boltWings: [78, -24],
  smallWings: [76, -24],
  wings: [76, -22],
  fins: [56, -40],
  fletching: [52, -50],
  antennae: [22, -R + 8],
  round: [52, -52],
  squirrel: [44, -66],
  waspWings: [70, -26],
  roots: [40, -74],
};
const FRONT_EARS = new Set(['flames', 'leaves']);

/** A hero's rig parts: each moving part on a layer of its own, the rest on the head's layer. */
export function* heroMiniSteps(peelId: string, RR: number): Generator<void, HeroMini | null> {
  const art = heroArtOf(peelId);
  const spec = heroSpecOf(peelId);
  if (!art || !spec) return null;
  const apart = new Set<HeroPart>();
  if (art.glow) apart.add('glow');
  if (spec.tail && art.extras?.includes('tail')) apart.add('tail');
  if (art.cape) apart.add('cape');
  if (spec.ears && art.ears) {
    if (EAR_PIVOT[art.ears] || art.ears === 'flames') apart.add('earsB');
    if (FRONT_EARS.has(art.ears)) apart.add('earsF');
  }
  if (spec.blink && art.eyes !== 'none') apart.add('eyes');
  if (spec.glyph && art.emblem) apart.add('glyph');
  if (apart.has('eyes') || apart.has('glyph')) apart.add('top');
  const part = (p: HeroPart) => cropLayer(RR, (ctx) => drawHeroPart(ctx, art, peelId, p, apart));
  const got = (p: HeroPart) => (apart.has(p) ? part(p) : null);
  const glow = got('glow');
  const tail = got('tail');
  yield;
  const cape = got('cape');
  const earsB = got('earsB');
  yield;
  const head = part('head');
  if (!head) return null;
  yield;
  const eyes = got('eyes');
  const glyph = got('glyph');
  const top = got('top');
  const earsF = got('earsF');
  yield;
  const pat = art.pattern && spec.fx?.(art).some((f) => f instanceof PatWave) ? cropLayer(RR, (ctx) => heroPatternLit(ctx, art, peelId, litOf(art))) : null;
  return { id: peelId, art, spec, RR, shape: art.shape ?? 'round', glow, tail, cape, earsB, head, eyes, glyph, top, earsF, pat };
}

/** The colour a suit's pattern lights in. */
function litOf(a: HeroArt): string {
  const pc = a.patternColor ?? a.suit;
  switch (a.pattern) {
    case 'cracks':
      return '#9bff6a';
    case 'plates':
      return a.glow ?? a.trail;
    case 'embers':
    case 'flames':
      return '#ffd27a';
    case 'frost':
      return '#ffffff';
    case 'scales':
      return '#8fe8ff';
    case 'bolts':
      return '#fff27a';
  }
  return shade(pc, 0.5);
}

// ════════════════════════════ the motion ════════════════════════════

export interface HeroGlow {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: number;
  a: number;
}

const scratches = new Map<string, [HTMLCanvasElement, Ctx]>();

export class HeroLive {
  t = crand() * 20;
  /** Seconds since the last smack. */
  sm = 9;
  menu = true;
  emit: HeroEmit | null = null;
  readonly glows: HeroGlow[] = [];
  /** A kick for the head's spring (the stretchy heroes' boing), taken by the crafted peel each frame. */
  kickQ = 0;
  // read by the effects
  speed = 0;
  vx = 0;
  rage = 0;
  heat = 0;
  phase = 0;
  scale = 1;
  jx = 0;
  jy = 0;
  readonly mini: HeroMini;
  readonly spec: HeroSpec;
  get shape(): PeelShape {
    return this.mini.shape;
  }
  private fx: Fx[];
  // eyes
  private blinkNext = rnd(1, 4);
  private blinkT = -1;
  private blinkTwice = false;
  private squint = 0;
  private heatRun = new Every(4.5, 8, 2.2);
  // glyph
  private flip = new Every(4, 8, 0.75);
  private boing = new Every(2.5, 5, 1);
  private swing = new Every(2.2, 4, 0.7);
  private flipP = -1;
  private boingP = -1;
  private swingP = -1;
  private perkP = -1;
  private glyphFlash = 0;
  private spinV = 0;
  private spinA = 0;
  // ears and tail
  private tw = [0, 0];
  private twV = [0, 0];
  private twNext = rnd(1, 3);
  private flapBoost = 0;
  private perk = new Every(2.5, 5, 0.6);
  private tailFlick = 0;
  private tailV = 0;
  private tailNext = rnd(2, 4);
  // cape
  private lag = 0;
  private lift = 0;
  private gust = new Every(2, 3.4, 1.5);
  private gustA = 0;
  private wordCool = 0;
  private glowFlare = 0;

  constructor(mini: HeroMini) {
    this.mini = mini;
    this.spec = mini.spec;
    this.fx = mini.spec.fx?.(mini.art) ?? [];
    const g = this.spec.glow;
    if (g) this.glows.push({ x: HX, y: HY, rx: R * (g.r ?? 1.15), ry: R * (g.r ?? 1.15), color: g.col, a: 0 });
  }

  /** Shed a sprite (peel units). */
  emitP(spr: HeroSpr, x: number, y: number, vx: number, vy: number, s0: number, s1: number, life: number, o?: Parameters<HeroEmit>[8]): void {
    this.emit?.(spr, x, y, vx, vy, s0, s1, life, o);
  }

  /** A scratch canvas of this size (shared: used and done with inside one paint). */
  scratch(name: string, w: number, h: number): [HTMLCanvasElement, Ctx] {
    const key = `${name}:${w}x${h}`;
    let s = scratches.get(key);
    if (!s) scratches.set(key, (s = makeCanvas(w, h)));
    return s;
  }

  update(dt: number, vx = 0, vy = 0): void {
    const calm = reduced() ? 0.35 : 1;
    this.t += dt;
    this.sm += dt;
    this.wordCool -= dt;
    this.vx = vx;
    this.speed = Math.hypot(vx, vy);
    const sp = this.spec;
    // eyes: blinks (sometimes twice), a squint now and then and on a smack, heat building
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      if (this.blinkT > 0.15) {
        this.blinkT = this.blinkTwice ? -0.12 : -1;
        if (this.blinkTwice) {
          this.blinkTwice = false;
          this.blinkT = 0;
          this.blinkNext = 0;
        }
      }
    } else {
      this.blinkNext -= dt;
      if (this.blinkNext <= 0) {
        this.blinkT = 0;
        this.blinkTwice = crand() < 0.25;
        this.blinkNext = rnd(1.8, 3.6);
      }
    }
    this.squint = Math.max(0, this.squint - dt * 2.2);
    if (sp.eyeGlow?.mode === 'heat') {
      const p = this.heatRun.tick(dt);
      const h = p >= 0 ? smooth(0, 0.45, p) * (1 - smooth(0.75, 1, p)) : 0;
      this.heat = Math.max(h, this.heat - dt * 1.5);
    }
    // the glyph
    this.glyphFlash *= Math.exp(-dt / 0.3);
    this.spinV *= Math.exp(-dt / 0.6);
    this.spinA += dt * (0.85 + this.spinV) * calm;
    this.flipP = this.flip.tick(dt);
    this.boingP = this.boing.tick(dt);
    this.swingP = this.swing.tick(dt);
    this.perkP = this.perk.tick(dt);
    // ears: twitches on springs, a flap's beat, the perk of small wings
    for (let s = 0; s < 2; s++) {
      this.twV[s] += (-this.tw[s] * 420 - this.twV[s] * 14) * dt;
      this.tw[s] += this.twV[s] * dt;
    }
    this.twNext -= dt;
    if (this.twNext <= 0) {
      this.twNext = rnd(1.2, 3.5);
      const s = Math.floor(crand() * 2);
      this.twV[s] += 9 * calm;
      if (crand() < 0.3) this.twV[1 - s] += 7 * calm;
    }
    this.flapBoost *= Math.exp(-dt / 0.5);
    // the tail: a slow sway, a flick now and then
    this.tailV += (-this.tailFlick * 160 - this.tailV * 6) * dt;
    this.tailFlick += this.tailV * dt;
    this.tailNext -= dt;
    if (this.tailNext <= 0) {
      this.tailNext = rnd(2.2, 4.5);
      this.tailV -= 3 * calm;
    }
    // the cape: blown back by a swing
    const lagT = this.menu ? 0 : clamp(-vx * 0.018, -16, 16) * calm;
    this.lag += (lagT - this.lag) * Math.min(1, dt * 5);
    this.lift += (clamp(this.speed / 900, 0, 1) - this.lift) * Math.min(1, dt * 4);
    const gp = this.gust.tick(dt);
    this.gustA = gp >= 0 ? Math.sin(gp * Math.PI) : 0;
    // the glow behind
    this.glowFlare *= Math.exp(-dt / 0.35);
    const g = this.glows[0];
    if (g && sp.glow) g.a = sp.glow.a * (0.85 + 0.15 * Math.sin(this.t * 2.2)) + sp.glow.a * (1.5 * this.glowFlare + 2 * this.rage);
    this.rage = 0;
    this.jx = this.jy = 0;
    for (const f of this.fx) f.update?.(this, dt);
  }

  smack(): void {
    this.sm = 0;
    const sp = this.spec;
    const n = reduced() ? 0.4 : 1;
    this.squint = 1;
    this.glyphFlash = 1;
    this.spinV = 6;
    this.flip.fire();
    this.boing.fire();
    this.swing.fire();
    this.flapBoost = 1;
    this.perk.fire();
    this.glowFlare = 1;
    this.tailV -= 5;
    this.twV[0] += 8;
    this.twV[1] += 8;
    for (const f of this.fx) f.smack?.(this);
    // the power's burst
    const m = this.menu ? 0.6 : 1;
    for (const b of sp.burst) {
      for (let i = 0; i < Math.round(b.n * n); i++) {
        const [x, y] = pointAt(b.at);
        const out = Math.atan2(y - HY, x - HX) + (crand() - 0.5) * 0.9;
        const v = rnd(...(b.speed ?? [100, 200])) * m;
        const s = b.size ?? [8, 4];
        this.emitP(b.spr, x, y, Math.cos(out) * v, Math.sin(out) * v - (b.up ?? 40), s[0], s[1], rnd(...(b.life ?? [0.45, 0.8])), { grav: b.grav ?? 120, drag: b.drag ?? 1.4, frame: b.frame });
      }
    }
    // the impact word (in play, not on every smack: it would crowd the table)
    if (this.menu || (this.wordCool <= 0 && crand() < 0.65)) {
      this.wordCool = 2.4;
      // (on a tile, only the short words: a long one won't read that small)
      const short = sp.words.filter((i) => WORDS[i][0].replace(/[^A-Z]/g, '').length <= 5);
      const pool = this.menu ? (short.length ? short : [W.POW]) : sp.words;
      const w = pool[Math.floor(crand() * pool.length)];
      // in play up and to the left, away from the game's own floating text at the hit
      const side = this.menu ? (crand() < 0.5 ? -1 : 1) : -1;
      const ws = this.menu ? 1.25 : 1.75;
      this.emitP('word', HX + side * 34, HY - 74, side * 14, -22, 84 * ws, 108 * ws, 1.05, { drag: 3, a: 1, fin: 0.02, spin: 0, rot: side * 0.12 + (crand() - 0.5) * 0.1, frame: w });
    }
  }

  // ——— drawing ———

  private lyr(ctx: Ctx, l: Lyr | null): void {
    if (l) ctx.drawImage(l.c, l.x, l.y, l.w, l.h);
  }

  /** Draw the hero (ctx in peel units). */
  draw(ctx: Ctx): void {
    const m = this.mini;
    const sp = this.spec;
    ctx.save();
    if (this.jx || this.jy) ctx.translate(this.jx, this.jy);
    if (this.scale !== 1) {
      ctx.translate(HX, HY + R);
      ctx.scale(this.scale, this.scale);
      ctx.translate(-HX, -(HY + R));
    }
    for (const f of this.fx) f.back?.(this, ctx);
    // (phasing: only the head's fill ghosts, a little; the cape, outline and eyes stay)
    const ghost = 1 - 0.38 * this.phase;
    if (m.glow) {
      ctx.globalAlpha = (0.7 + 0.3 * Math.sin(this.t * 2.3) + 0.3 * this.glowFlare) * ghost;
      this.lyr(ctx, m.glow);
    }
    ctx.globalAlpha = 1;
    if (m.tail) this.drawTail(ctx, m.tail);
    if (m.cape) this.drawCape(ctx, m.cape);
    if (m.earsB) this.drawEars(ctx, m.earsB);
    ctx.globalAlpha = ghost;
    this.lyr(ctx, m.head);
    ctx.globalAlpha = 1;
    if (this.phase > 0.02) {
      // its edge shimmering green as it phases, the outline kept
      headPath(ctx, m.shape);
      ctx.strokeStyle = rgba('#2a1810', this.phase);
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#7dff9a', 0.5 * this.phase * (0.6 + 0.4 * Math.sin(this.t * 40)));
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    if (m.eyes) this.drawEyes(ctx, m.eyes);
    if (sp.eyeGlow) this.eyeGlow(ctx, sp.eyeGlow);
    if (m.glyph) this.drawGlyph(ctx, m.glyph);
    this.lyr(ctx, m.top);
    if (m.earsF) this.drawEars(ctx, m.earsF);
    for (const f of this.fx) f.front?.(this, ctx);
    ctx.restore();
  }

  private drawTail(ctx: Ctx, l: Lyr): void {
    const a = 0.05 * Math.sin(this.t * 1.7) + this.tailFlick * 0.08;
    ctx.save();
    ctx.translate(HX + 40, HY + 112);
    ctx.rotate(a);
    ctx.translate(-(HX + 40), -(HY + 112));
    this.lyr(ctx, l);
    ctx.restore();
  }

  /** The cape, drawn in rows: held at the shoulders, a travelling wave and a swing's lag growing towards the hem,
   *  then folds of light and shade moving across it. */
  private drawCape(ctx: Ctx, l: Lyr): void {
    const RR = this.mini.RR;
    const M = 18;
    const [sc, sx] = this.scratch('cape', Math.ceil((l.w + M * 2) * RR), l.c.height);
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.globalCompositeOperation = 'source-over';
    sx.clearRect(0, 0, sc.width, sc.height);
    const top = HY - 10;
    const bot = HY + 146;
    const calm = reduced() ? 0.35 : 1;
    const amp = (this.spec.cape ?? 1) * (1 + this.gustA * 1.1 + this.lift * 1.5 + (this.sm < 0.6 ? 1.2 * (1 - this.sm / 0.6) : 0)) * calm;
    const step = 3;
    const rows = Math.ceil(l.h / step);
    const t = this.t;
    for (let i = 0; i < rows; i++) {
      const y = l.y + i * step;
      const d = clamp((y - top) / (bot - top), 0, 1);
      const e = d * d;
      const wave = Math.sin(t * 2.1 - y * 0.045) + 0.45 * Math.sin(t * 3.4 - y * 0.085 + 1.7);
      const dx = e * (4.6 * amp * wave + this.lag);
      const k = 1 + e * (0.035 * amp * Math.sin(t * 1.6 - y * 0.03 + 0.8) + 0.05 * this.lift);
      const sy0 = Math.floor(i * step * RR);
      const sh = Math.min(Math.ceil(step * RR) + 1, l.c.height - sy0);
      if (sh <= 0) break;
      const x = HX + (l.x - HX) * k + dx;
      sx.drawImage(l.c, 0, sy0, l.c.width, sh, (x - l.x + M) * RR, sy0, l.c.width * k, sh);
    }
    // folds of light and shade moving across it
    const g = sx.createLinearGradient(0, 0, sc.width, 0);
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      const v = Math.sin(u * Math.PI * 5 - t * 1.9) * (0.5 + 0.5 * Math.sin(t * 0.7 + u * 3)) * Math.min(1, amp);
      g.addColorStop(u, v > 0 ? `rgba(255,255,255,${(0.08 * v).toFixed(3)})` : `rgba(0,0,0,${(-0.2 * v).toFixed(3)})`);
    }
    sx.globalCompositeOperation = 'source-atop';
    sx.fillStyle = g;
    // (only below the shoulders: the top stays as painted)
    const y0 = Math.max(0, (HY + 20 - l.y) * RR);
    sx.fillRect(0, y0, sc.width, sc.height - y0);
    sx.globalCompositeOperation = 'source-over';
    ctx.drawImage(sc, l.x - M, l.y, l.w + M * 2, l.h);
  }

  /** The ears (or wings, antennae, flame crown): each side turned about its pivot. */
  private drawEars(ctx: Ctx, l: Lyr): void {
    const kind = this.mini.art.ears!;
    const mode = this.spec.ears ?? 'sway';
    const RR = this.mini.RR;
    const calm = reduced() ? 0.35 : 1;
    const t = this.t;
    const piv = EAR_PIVOT[kind];
    if (!piv || mode === 'flicker' || FRONT_EARS.has(kind)) {
      // a crown of flames or leaves: the whole layer, flickering or swaying about its base
      const by = HY - R + 10;
      ctx.save();
      if (mode === 'flicker') {
        const k = 1 + (0.06 * noise1(t * 7) + 0.04 * Math.sin(t * 11)) * calm + (this.sm < 0.4 ? 0.15 * (1 - this.sm / 0.4) : 0);
        ctx.translate(HX, by);
        ctx.transform(1, 0, 0.05 * noise1(t * 5 + 3) * calm, k, 0, 0);
        ctx.translate(-HX, -by);
      } else {
        ctx.translate(HX, by);
        ctx.rotate((0.06 * Math.sin(t * 1.4) + 0.03 * Math.sin(t * 2.7)) * calm + this.flapBoost * 0.15 * Math.sin(t * 20));
        ctx.translate(-HX, -by);
      }
      this.lyr(ctx, l);
      ctx.restore();
      return;
    }
    const [pdx, pdy] = piv;
    for (const s of [-1, 1]) {
      // the half of the layer on this side
      const xs = s < 0 ? l.x : Math.max(l.x, HX);
      const xe = s < 0 ? Math.min(l.x + l.w, HX) : l.x + l.w;
      if (xe - xs < 0.5) continue;
      let a = 0;
      let blur = 0;
      switch (mode) {
        case 'flap':
          a = (0.14 * Math.sin(t * 3.4) + this.flapBoost * 0.25 * Math.sin(t * 16)) * calm;
          break;
        case 'buzz':
          a = 0.12 * Math.sin(t * 52 + (s > 0 ? 0 : 1)) * calm;
          blur = 0.45;
          break;
        case 'twitch':
          a = -this.tw[s < 0 ? 0 : 1] * 0.06;
          break;
        case 'perk': {
          const p = this.perkP;
          a = (p >= 0 ? 0.18 * Math.sin(p * Math.PI * 6) * (1 - p) : 0.02 * Math.sin(t * 2)) * calm;
          break;
        }
        default:
          a = (0.05 * Math.sin(t * 1.5 + s) + this.flapBoost * 0.12 * Math.sin(t * 18)) * calm + clamp(-this.vx * 0.0002, -0.15, 0.15);
      }
      const px = HX + s * pdx;
      const py = HY + pdy;
      const sx0 = (xs - l.x) * RR;
      const sw = (xe - xs) * RR;
      const one = (ang: number, alpha: number) => {
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(px, py);
        ctx.rotate(s * ang);
        ctx.translate(-px, -py);
        ctx.drawImage(l.c, sx0, 0, sw, l.c.height, xs, l.y, xe - xs, l.h);
        ctx.restore();
      };
      if (blur) {
        one(a + 0.1, blur);
        one(a - 0.1, blur);
      } else one(a, 1);
    }
  }

  private drawEyes(ctx: Ctx, l: Lyr): void {
    let k = 1;
    if (this.blinkT >= 0 && this.spec.blink === 'blink') k = 1 - 0.92 * Math.sin(clamp(this.blinkT / 0.15, 0, 1) * Math.PI);
    if (this.spec.blink === 'squint') {
      // masks' lenses narrow: now and then, and on a smack
      const now = this.blinkT >= 0 ? Math.sin(clamp(this.blinkT / 0.15, 0, 1) * Math.PI) * 0.55 : 0;
      k = 1 - Math.max(now, this.squint * 0.45);
    } else k = Math.min(k, 1 - this.squint * 0.3);
    if (k > 0.995) {
      this.lyr(ctx, l);
      return;
    }
    const cy = EYE_Y + 2;
    ctx.save();
    ctx.translate(0, cy);
    ctx.scale(1, k);
    ctx.translate(0, -cy);
    this.lyr(ctx, l);
    ctx.restore();
  }

  private eyeGlow(ctx: Ctx, g: EyeGlow): void {
    const a0 = g.a ?? 0.5;
    let a: number;
    if (g.mode === 'heat') a = a0 * 0.3 + this.heat * 0.9;
    else if (g.mode === 'flicker') a = a0 * (0.75 + 0.25 * noise1(this.t * 6));
    else a = a0 * (0.8 + 0.2 * Math.sin(this.t * 2));
    if (this.sm < 0.5) a += (1 - this.sm / 0.5) * 0.5;
    const eyes = this.mini.art.eyes;
    const pts: [number, number, number][] =
      eyes === 'cyber' ? [[HX - EYE_DX, EYE_Y, 14]] : eyes === 'visor' ? [[HX - 30, EYE_Y, 16], [HX + 30, EYE_Y, 16], [HX, EYE_Y, 16]] : eyes === 'bugVisor' || eyes === 'bugGlossy' ? [[HX - 26, EYE_Y, 22], [HX + 26, EYE_Y, 22]] : [[HX - EYE_DX, EYE_Y, 15], [HX + EYE_DX, EYE_Y, 15]];
    lighter(ctx, () => {
      for (const [x, y, r] of pts) {
        glowDot(ctx, x, y, r * (1.3 + 0.4 * this.heat), g.col, Math.min(1, a));
        if (this.heat > 0.4) glowDot(ctx, x, y, r * 0.5, '#ffffff', (this.heat - 0.4) * 0.9);
      }
    });
  }

  private drawGlyph(ctx: Ctx, l: Lyr): void {
    const sp = this.spec;
    const mode = sp.glyph!;
    const cx = HX;
    const cy = EMB_Y;
    const calm = reduced() ? 0.35 : 1;
    const t = this.t;
    let p = 0;
    ctx.save();
    switch (mode) {
      case 'spin':
        ctx.translate(cx, cy);
        ctx.rotate(this.spinA);
        ctx.translate(-cx, -cy);
        break;
      case 'flip': {
        const f = this.flipP;
        if (f >= 0) {
          const e = smooth(0, 1, f);
          ctx.translate(cx, cy);
          ctx.scale(Math.cos(e * TAU) || 0.02, 1);
          ctx.translate(-cx, -cy);
        }
        break;
      }
      case 'beat': {
        // a heartbeat: two quick thumps a beat
        const ph = (t * 1.1) % 1;
        const b = Math.max(Math.exp(-Math.pow((ph - 0.1) / 0.05, 2)), 0.7 * Math.exp(-Math.pow((ph - 0.28) / 0.05, 2)));
        const s = 1 + 0.07 * b * calm + 0.08 * this.glyphFlash;
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        ctx.translate(-cx, -cy);
        p = b * 0.5;
        break;
      }
      case 'swing': {
        // the gavel: raised, then struck down
        const f = this.swingP;
        const a = f >= 0 ? (f < 0.6 ? -0.5 * smooth(0, 0.6, f) : -0.5 + 0.65 * smooth(0.6, 0.72, f) - 0.15 * smooth(0.72, 1, f)) : 0;
        ctx.translate(cx + 6, cy + 10);
        ctx.rotate(a * calm);
        ctx.translate(-(cx + 6), -(cy + 10));
        break;
      }
      case 'bob':
        ctx.translate(0, 1.6 * Math.sin(t * 2.3) * calm);
        break;
      case 'boing': {
        const f = this.boingP;
        if (f >= 0) {
          const s = 1 + 0.2 * Math.sin(f * 22) * Math.exp(-f * 4) * calm;
          ctx.translate(cx, cy + 16);
          ctx.scale(1 / Math.sqrt(s), s);
          ctx.translate(-cx, -(cy + 16));
        }
        break;
      }
      case 'pulse':
        p = 0.35 + 0.35 * Math.sin(t * 2.6);
        break;
      case 'flicker':
        p = 0.4 + 0.4 * noise1(t * 8) + (noise1(t * 3) > 0.6 ? 0.4 : 0);
        break;
    }
    this.lyr(ctx, l);
    p = Math.max(0, p) + this.glyphFlash * 0.8;
    const col = sp.glyphCol ?? this.mini.art.emblemColor ?? '#ffffff';
    if (p > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, p * 0.55);
      this.lyr(ctx, l);
      ctx.globalAlpha = 1;
      glowDot(ctx, cx, cy, 30, col, Math.min(0.6, p * 0.35));
      ctx.restore();
    }
    ctx.restore();
    if (mode === 'sweep') this.glyphSweep(ctx, l, col);
  }

  /** A band of light sweeping over the glyph, only where it's drawn. */
  private glyphSweep(ctx: Ctx, l: Lyr, col: string): void {
    const per = 2.6;
    const u = ((this.t % per) / per) * 1.6 - 0.3;
    if (u < -0.2 || u > 1.2) return;
    const RR = this.mini.RR;
    const [sc, sx] = this.scratch('glyph', l.c.width, l.c.height);
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.globalCompositeOperation = 'source-over';
    sx.clearRect(0, 0, sc.width, sc.height);
    sx.drawImage(l.c, 0, 0);
    sx.globalCompositeOperation = 'source-in';
    const x = u * sc.width;
    const g = sx.createLinearGradient(x - 10 * RR, 0, x + 10 * RR, sc.height);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, 0.95));
    g.addColorStop(1, rgba(col, 0));
    sx.fillStyle = g;
    sx.fillRect(0, 0, sc.width, sc.height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(sc, l.x, l.y, l.w, l.h);
    ctx.restore();
  }
}
