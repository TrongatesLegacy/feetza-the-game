// Event and act peels: a medallion set into the head (the peel's own shape, colours, pattern, studs and handle round
// it), recessed behind a bezel and a glass, with something alive inside (a crafted kind each: src/art/peelCraft.ts).
//
// - event: the wave event in miniature, doing what it does on the table (src/art/peelEventDefs.ts): the Tip Balloon
//   bobbing on its string, the drone hovering with its parcel swinging, the moth fluttering round a lamp, the golden
//   gull flapping over the sea, the pizza box chest letting gold light out of its lid, the mimic wobbling and licking
//   its lips, a hero streaking past, Charybdis turning. A smack gets the event's answer (the balloon pops and blows
//   up again, the chest bursts open, the mimic chomps, the whirlpool clamps shut …).
// - act: a trophy. Through a round window in a gold bezel the act's two places play (their place peels' own living
//   windows, src/art/peelPlace.ts), turning from one to the other, with the act's number struck in gold in front,
//   a sweep of light running over it now and then and the studs glinting in turn. A smack brings the act's boss's
//   foot stomping down into the place (it reacts as its place peel does), the number jolting and flaring.
//
// The medallion lives in disc units: a 120 × 120 square, its centre at (60, 60), drawn into the head's surface scaled
// to the medallion's size. What's painted (the scene's background and its parts) is painted once per rig detail, a
// part per idle step; each frame the scene is drawn from those parts, moved, turned and squashed, with a few things
// drawn live (strings, cables, trails). Small things inside the medallion (pepper, foam, sparkles, dust) are a pool
// of their own, clipped to it; what flies off the peel is the crafted peels' sprite pool. Everything cosmetic uses
// crand().

import { PEEL_HEAD, headPath, plainHeadOver, plainHeadUnder, sparkleStar, type PeelLook, type PeelShape } from './peelArt';
import { windowBars } from './peelCraftArt';
import { EVENT_SCENES, type EventScene } from './peelEventDefs';
import { PlaceLive, bandStuds, downTo, placeBaseAsync, placeBaseReady, placeMiniSteps, placeStillNow, studSpots, type PlaceMini } from './peelPlace';
import type { PlaceEmit } from './peelPlaceDefs';
import type { LocationId } from './backdrops';
import { INK } from './feetCommon';
import { ellipse, makeCanvas, rgba, shade, type Ctx } from './util';
import { STAGES } from '../data/stages';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import { noise1 } from '../game/liveKit';

const { x: HX, y: HY } = PEEL_HEAD;

// ════════════════════════════ geometry ════════════════════════════

/** The medallion in peel units: its centre and the glass's radius (the bezel sits just outside it). */
export interface Disc {
  cx: number;
  cy: number;
  r: number;
}

/** Where the medallion sits on each head shape: as big as the head allows with a band of the head left round it (and
 *  room for the studs on a narrow oval). */
export function discOf(shape: PeelShape, studs = false): Disc {
  const d = { ...DISCS[shape] };
  // with studs round the band: the bezel (its ink reaches 11 past the glass) stays clear of them (5 across)
  if (studs) for (const [x, y] of studSpots(shape)) d.r = Math.min(d.r, Math.hypot(x - d.cx, y - d.cy) - 17);
  return d;
}

const DISCS: Record<PeelShape, Disc> = {
  round: { cx: HX, cy: HY - 3, r: 60 },
  oval: { cx: HX, cy: HY - 2, r: 52 },
  square: { cx: HX, cy: HY - 5, r: 60 },
  paddle: { cx: HX, cy: HY - 8, r: 58 },
  spade: { cx: HX, cy: HY + 2, r: 56 },
};

function discPath(ctx: Ctx, d: Disc, grow = 0): void {
  ctx.beginPath();
  ctx.arc(d.cx, d.cy, d.r + grow, 0, Math.PI * 2);
}

// ════════════════════════════ painted parts ════════════════════════════

/** A painted part: a canvas and the box it fills, in disc units, about its own anchor (0, 0). */
export interface Part {
  c: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Parts = Record<string, Part>;

/** Paint a part covering the box (x, y, w, h) about its anchor, at px canvas pixels per disc unit. */
export function part(px: number, x: number, y: number, w: number, h: number, draw: (ctx: Ctx) => void): Part {
  const [c, ctx] = makeCanvas(Math.max(1, Math.ceil(w * px)), Math.max(1, Math.ceil(h * px)));
  ctx.setTransform(px, 0, 0, px, -x * px, -y * px);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  return { c, x, y, w, h };
}

/** Draw a part at its anchor (the ctx's transform places it). */
export function drawPart(ctx: Ctx, p: Part | undefined, a = 1): void {
  if (!p || a <= 0.005) return;
  if (a < 1) ctx.globalAlpha = a;
  ctx.drawImage(p.c, p.x, p.y, p.w, p.h);
  if (a < 1) ctx.globalAlpha = 1;
}

/** Draw a part at (x, y), turned rot, scaled sx × sy about its anchor. */
export function placePart(ctx: Ctx, p: Part | undefined, x: number, y: number, rot = 0, sx = 1, sy = sx, a = 1): void {
  if (!p || a <= 0.005) return;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  drawPart(ctx, p, a);
  ctx.restore();
}

// ════════════════════════════ small things inside the medallion ════════════════════════════

export type DotKind = 'spark' | 'foam' | 'pepper' | 'dust' | 'glow' | 'drop';

const DOT_KINDS: DotKind[] = ['spark', 'foam', 'pepper', 'dust', 'glow', 'drop'];
let dotSprites: Record<DotKind, HTMLCanvasElement> | null = null;

function dotSprite(k: DotKind): HTMLCanvasElement {
  if (!dotSprites) {
    const out = {} as Record<DotKind, HTMLCanvasElement>;
    for (const kind of DOT_KINDS) {
      const [c, ctx] = makeCanvas(32, 32);
      paintDot(ctx, kind);
      out[kind] = c;
    }
    dotSprites = out;
  }
  return dotSprites[k];
}

function paintDot(ctx: Ctx, k: DotKind): void {
  const rg = (stops: [number, string][], r = 15, x = 16, y = 16) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  };
  if (k === 'spark') {
    rg([[0, 'rgba(255,250,220,0.9)'], [0.3, 'rgba(255,214,90,0.5)'], [1, 'rgba(255,190,60,0)']]);
    sparkleStar(ctx, 16, 16, 13);
    ctx.fillStyle = '#fffbe8';
    ctx.fill();
  } else if (k === 'foam') {
    rg([[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(236,250,255,0.85)'], [0.8, 'rgba(160,210,230,0.3)'], [1, 'rgba(160,210,230,0)']], 12, 15, 15);
  } else if (k === 'pepper') {
    ctx.beginPath();
    ctx.moveTo(9, 13);
    ctx.lineTo(18, 7);
    ctx.lineTo(25, 15);
    ctx.lineTo(20, 24);
    ctx.lineTo(10, 22);
    ctx.closePath();
    const g = ctx.createLinearGradient(9, 7, 23, 24);
    g.addColorStop(0, '#8a6a4a');
    g.addColorStop(0.35, '#3a2618');
    g.addColorStop(1, '#120a06');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(12,6,2,0.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  } else if (k === 'dust') {
    rg([[0, 'rgba(236,222,198,0.75)'], [0.5, 'rgba(206,188,160,0.4)'], [1, 'rgba(180,160,130,0)']]);
  } else if (k === 'glow') {
    rg([[0, 'rgba(255,255,240,1)'], [0.22, 'rgba(255,236,160,0.95)'], [0.5, 'rgba(255,190,80,0.35)'], [1, 'rgba(255,160,40,0)']]);
  } else {
    const g = ctx.createRadialGradient(13, 13, 0, 16, 16, 11);
    g.addColorStop(0, 'rgba(250,255,255,0.95)');
    g.addColorStop(0.5, 'rgba(170,226,244,0.8)');
    g.addColorStop(0.85, 'rgba(60,140,180,0.55)');
    g.addColorStop(1, 'rgba(60,140,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(16, 16, 11, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The medallion's own little particles (disc units), drawn inside it. */
export class Dots {
  readonly n = 40;
  x = new Float32Array(this.n);
  y = new Float32Array(this.n);
  vx = new Float32Array(this.n);
  vy = new Float32Array(this.n);
  grav = new Float32Array(this.n);
  drag = new Float32Array(this.n);
  s0 = new Float32Array(this.n);
  s1 = new Float32Array(this.n);
  age = new Float32Array(this.n).fill(9);
  life = new Float32Array(this.n).fill(1);
  a = new Float32Array(this.n);
  rot = new Float32Array(this.n);
  spin = new Float32Array(this.n);
  kind: DotKind[] = new Array(this.n).fill('foam');
  add: boolean[] = new Array(this.n).fill(false);
  private next = 0;

  spawn(kind: DotKind, x: number, y: number, vx: number, vy: number, s0: number, s1: number, life: number, o: { grav?: number; drag?: number; a?: number; add?: boolean; spin?: number } = {}): void {
    const i = this.next;
    this.next = (i + 1) % this.n;
    this.kind[i] = kind;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.s0[i] = s0;
    this.s1[i] = s1;
    this.life[i] = life;
    this.age[i] = 0;
    this.grav[i] = o.grav ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.a[i] = o.a ?? 1;
    this.add[i] = o.add ?? false;
    this.rot[i] = crand() * Math.PI * 2;
    this.spin[i] = o.spin ?? (crand() - 0.5) * 4;
  }

  tick(dt: number): void {
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vx[i] *= d;
      this.vy[i] = this.vy[i] * d + this.grav[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.rot[i] += this.spin[i] * dt;
    }
  }

  draw(ctx: Ctx): void {
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) continue;
      const k = this.age[i] / this.life[i];
      const a = this.a[i] * Math.min(1, k / 0.08) * (1 - k * k);
      if (a <= 0.01) continue;
      const s = this.s0[i] + (this.s1[i] - this.s0[i]) * Math.sqrt(k);
      ctx.save();
      ctx.translate(this.x[i], this.y[i]);
      ctx.rotate(this.rot[i]);
      ctx.globalAlpha = Math.min(1, a);
      if (this.add[i]) ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(dotSprite(this.kind[i]), -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }
}

// ════════════════════════════ the state a scene sees ════════════════════════════

/** What flies off the medallion (the crafted peels' sprites): from (x, y), moving (vx, vy), sized s0 → s1, all in disc
 *  units; gravity in disc units/s². */
export type MedalSpr = 'coin' | 'shred' | 'pepper' | 'feather' | 'drop' | 'smoke' | 'dust' | 'confetti' | 'glint' | 'sparkN' | 'spark' | 'gold' | 'crumb' | 'ember';
export type MedalEmit = (spr: MedalSpr, x: number, y: number, vx: number, vy: number, s0: number, s1: number, life: number, o?: { grav?: number; drag?: number; a?: number; fin?: number; spin?: number }) => void;

export interface MedalState {
  /** Seconds, and seconds since the last smack. */
  t: number;
  sm: number;
  /** The still (a thumbnail): at rest. */
  still: boolean;
  /** 1, or less with reduced motion. */
  calm: number;
  /** In the locker (smaller throws), or on the cursor in play. */
  menu: boolean;
  mem: Record<string, number>;
  r: () => number;
  /** The smack's envelope: 1 as it lands, easing to 0 over len seconds. */
  hit(len?: number): number;
  dots: Dots;
  /** A soft flash over the whole medallion (colour, strength), faded over its own time. */
  flash(col: string, a: number, len?: number): void;
  /** Shake the medallion's contents (disc units). */
  shake(a: number): void;
}

const reduced = () => !!save.settings.reducedMotion;

// ════════════════════════════ an act: its places, its boss, its number ════════════════════════════

/** An act's two places and its last boss (the boss of its second stage). */
export function actInfo(n: number): { places: LocationId[]; boss: string } | null {
  const st = STAGES.filter((s) => !s.dev);
  const a = st[(n - 1) * 2];
  const b = st[(n - 1) * 2 + 1];
  if (!a) return null;
  return { places: b ? [a.location, b.location] : [a.location], boss: (b ?? a).boss as string };
}

/** The place peels' own window shapes (their bases are painted for them, and shared). */
let placeShapes: ((loc: LocationId) => PeelShape) | null = null;
/** The boss's foot, cut for its peel (from src/game/peels.ts), and getting it drawn; set by src/game/peels.ts. */
let bossArt: ((id: string) => HTMLCanvasElement | null) | null = null;
let bossReady: ((id: string) => boolean) | null = null;
let bossArtAsync: ((id: string) => Promise<void>) | null = null;
export function medalHooks(h: {
  placeShape: (loc: LocationId) => PeelShape;
  /** The foot cut for its peel (a moment's work: the rig asks for it in a step of its own). */
  boss: (id: string) => HTMLCanvasElement | null;
  /** Is the foot drawn (or in from the art cache)? */
  bossReady: (id: string) => boolean;
  bossAsync: (id: string) => Promise<void>;
}): void {
  placeShapes = h.placeShape;
  bossArt = h.boss;
  bossReady = h.bossReady;
  bossArtAsync = h.bossAsync;
}

const FONT = "'Lilita One', 'Fredoka', sans-serif";
const fontReady = () => typeof document === 'undefined' || !!document.fonts?.check(`80px 'Lilita One'`);

/** Everything an act's medallion needs before its rig is built: its places' window bases and the number's font (its
 *  boss's foot comes later, only where it can stomp: see MedalLive.wantBoss). */
export function actReady(n: number): boolean {
  const info = actInfo(n);
  if (!info || !placeShapes) return true;
  return fontReady() && info.places.every((l) => placeBaseReady(l));
}

export async function actPrepAsync(n: number): Promise<void> {
  const info = actInfo(n);
  if (!info || !placeShapes) return;
  const ps: Promise<unknown>[] = info.places.map((l) => placeBaseAsync(l, placeShapes!(l)));
  if (!fontReady() && typeof document !== 'undefined') ps.push(document.fonts.load(`80px 'Lilita One'`).catch(() => null));
  await Promise.all(ps);
}

/** A boss's foot drawn down for its stomp, per size (canvas px per disc unit), shared by every rig. */
const stompArt = new Map<string, Stomp | 'pending'>();

/** The boss's foot for a stomp at px, or null while it's on its way (asked for the first time, it's fetched: the
 *  foot's art from the art cache or drawn, then cut and drawn down in an idle moment). */
function stompOf(id: string, px: number): Stomp {
  const key = `${id}@${px.toFixed(2)}`;
  const have = stompArt.get(key);
  if (have && have !== 'pending') return have;
  if (have === 'pending' || !bossArt || !bossArtAsync) return null;
  stompArt.set(key, 'pending');
  const cut = () => {
    const art = bossArt?.(id) ?? null;
    if (!art) return stompArt.delete(key);
    const w = 70;
    const h = (art.height * w) / art.width;
    stompArt.set(key, { art: downTo(art, Math.ceil(w * px), Math.ceil(h * px)), w, h });
  };
  const later = (fn: () => void) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 300 }) : setTimeout(fn, 30));
  if (bossReady?.(id)) later(cut);
  else void bossArtAsync(id).then(() => later(cut), () => stompArt.delete(key));
  return null;
}

/** The act's number struck in gold: its relief (shadow, ink, gold, bevel) and a white copy for the light's sweep. */
function numeral(px: number, n: number): [Part, Part] {
  const s = String(n);
  const size = s.length > 1 ? 58 : 74;
  const box = { x: -46, y: -46, w: 92, h: 92 };
  const text = (ctx: Ctx) => {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  };
  const relief = part(px, box.x, box.y, box.w, box.h, (ctx) => {
    text(ctx);
    // a soft shadow thrown down and right onto the place behind
    for (let i = 4; i >= 1; i--) {
      ctx.strokeStyle = `rgba(10,4,2,${(0.09 * (5 - i)).toFixed(3)})`;
      ctx.lineWidth = 7 + i * 3;
      ctx.strokeText(s, 3, 4.5);
    }
    ctx.lineWidth = 8.5;
    ctx.strokeStyle = INK;
    ctx.strokeText(s, 0, 2);
    const g = ctx.createLinearGradient(0, -size * 0.42, 0, size * 0.42);
    g.addColorStop(0, '#fff6c0');
    g.addColorStop(0.32, '#ffd23f');
    g.addColorStop(0.62, '#e8a420');
    g.addColorStop(1, '#a8600a');
    ctx.fillStyle = g;
    ctx.fillText(s, 0, 2);
    // the bevel: a lit edge on the top left, a shaded one on the bottom right, kept inside the figure
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(122,62,6,0.75)';
    ctx.strokeText(s, 1.6, 3.8);
    ctx.strokeStyle = 'rgba(255,255,236,0.85)';
    ctx.lineWidth = 2.2;
    ctx.strokeText(s, -1.4, 0.6);
    // a broad soft band of light across its upper half
    const hl = ctx.createLinearGradient(0, -size * 0.45, 0, size * 0.05);
    hl.addColorStop(0, 'rgba(255,255,255,0.35)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(box.x, box.y, box.w, box.h * 0.55);
    ctx.restore();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = rgba(INK, 0.9);
    ctx.strokeText(s, 0, 2);
  });
  const lit = part(px, box.x, box.y, box.w, box.h, (ctx) => {
    text(ctx);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(s, 0, 2);
  });
  return [relief, lit];
}

export interface ActMini {
  n: number;
  places: PlaceMini[];
  num: Part;
  numLit: Part;
  /** The act's boss: its foot (sole down) stomps when a smack lands. */
  bossId: string;
}

/** The place an act's still shows where its second says the act's name better (Out of This World: space). */
const STILL_PLACE: Record<number, number> = { 3: 1 };

/** Where the boss's sole lands, and how long its stomp lasts (s). */
const GROUND = 108;
const STOMP = 0.66;

/** Where the number stands in the medallion (disc units). */
const NUM = { x: 60, y: 76 };

function* actMiniSteps(n: number, px: number, RR: number): Generator<void, ActMini | null> {
  const info = actInfo(n);
  if (!info || !placeShapes) return null;
  const places: PlaceMini[] = [];
  for (const loc of info.places) {
    const m = yield* placeMiniSteps(loc, placeShapes(loc), RR);
    if (m) places.push(m);
  }
  if (!places.length) return null;
  yield;
  const [num, numLit] = numeral(px, n);
  return { n, places, num, numLit, bossId: info.boss };
}
type Stomp = { art: HTMLCanvasElement; w: number; h: number } | null;

// ════════════════════════════ the mini: what a rig holds ════════════════════════════

export interface MedalMini {
  kind: 'event' | 'act';
  look: PeelLook;
  disc: Disc;
  RR: number;
  /** Canvas px per disc unit. */
  px: number;
  scene: EventScene | null;
  parts: Parts;
  act: ActMini | null;
}

export function* medalMiniSteps(look: PeelLook, RR: number): Generator<void, MedalMini | null> {
  const disc = discOf(look.shape, !!look.studs);
  const px = (RR * disc.r) / 60;
  if (look.craft === 'act' && look.act) {
    const act = yield* actMiniSteps(look.act, px, RR);
    if (!act) return null;
    return { kind: 'act', look, disc, RR, px, scene: null, parts: {}, act };
  }
  const scene = look.event ? EVENT_SCENES[look.event] : undefined;
  if (!scene) return null;
  const parts = yield* scene.paint(px);
  return { kind: 'event', look, disc, RR, px, scene, parts, act: null };
}

/** The mini now (the still, dev tools): painted on the spot. */
function medalMiniNow(look: PeelLook, RR: number): MedalMini | null {
  const gen = medalMiniSteps(look, RR);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

/** An event's mini per rig detail, for its stills (cheap to paint, kept). */
const stillMinis = new Map<string, MedalMini | null>();

// ════════════════════════════ the living medallion ════════════════════════════

export class MedalLive implements MedalState {
  t = crand() * 20;
  sm = 9;
  still = false;
  menu = true;
  readonly mem: Record<string, number> = {};
  readonly r = crand;
  readonly dots = new Dots();
  /** Where what flies off goes (peel units); set by the crafted peel. */
  emit: ((spr: MedalSpr, lx: number, ly: number, vx: number, vy: number, s0: number, s1: number, life: number, o?: { grav?: number; drag?: number; a?: number; fin?: number; spin?: number }) => void) | null = null;
  /** And what a place throws (an act's place reacting to its boss's stomp), in peel units. */
  emitPlace: PlaceEmit | null = null;
  private flashC = '#ffffff';
  private flashA = 0;
  private flashLen = 0.4;
  private flashT = 9;
  private shakeA = 0;
  // ——— an act's ———
  private places: PlaceLive[] = [];
  private turn = 0;
  private sweepT = -1;
  private sweepNext = 2 + crand() * 2;
  private studT = 0;
  private stompT = 9;
  private numY = 0;
  private numV = 0;
  private studs: [number, number][] = [];
  /** The boss's foot, once it's here (asked for where a smack can land: in play, the big preview). */
  private boss: Stomp = null;
  private bossWanted = false;

  constructor(readonly mini: MedalMini) {
    if (mini.act) {
      this.places = mini.act.places.map((m) => new PlaceLive(m));
      // (from the place its still shows, so a tile doesn't jump when it comes alive)
      this.turn = (STILL_PLACE[mini.act.n] ? 8 : 0) + crand() * 3;
      if (mini.look.studs) this.studs = studSpots(mini.look.shape);
    }
    mini.scene?.init?.(this);
  }

  get calm(): number {
    return reduced() ? 0.35 : 1;
  }

  hit(len = 0.8): number {
    const u = this.sm / len;
    return u >= 1 ? 0 : (1 - u) * (1 - u);
  }

  flash(col: string, a: number, len = 0.4): void {
    this.flashC = col;
    this.flashA = a;
    this.flashLen = len;
    this.flashT = 0;
  }

  shake(a: number): void {
    this.shakeA = Math.max(this.shakeA, a * this.calm);
  }

  /** At rest (the still). */
  rest(): void {
    this.still = true;
    this.sm = 9;
    this.t = 0;
    this.turn = this.mini.act && STILL_PLACE[this.mini.act.n] ? 8 : 0;
    this.mini.scene?.rest?.(this);
    for (const p of this.places) p.rest(p.mini.def.stillT ?? 0);
  }

  /** From disc units to the peel's. */
  private toPeel(x: number, y: number): [number, number] {
    const d = this.mini.disc;
    const k = d.r / 60;
    return [d.cx + (x - 60) * k, d.cy + (y - 60) * k];
  }

  private out: MedalEmit = (spr, x, y, vx, vy, s0, s1, life, o) => {
    if (!this.emit) return;
    const k = this.mini.disc.r / 60;
    const [lx, ly] = this.toPeel(x, y);
    const o2 = o ? { ...o, grav: o.grav !== undefined ? o.grav * k : undefined } : undefined;
    this.emit(spr, lx, ly, vx * k, vy * k, s0 * k, s1 * k, life, o2);
  };

  smack(): void {
    this.sm = 0;
    if (this.mini.scene) this.mini.scene.smack(this, this.out);
    else this.actSmack();
  }

  update(dt: number): void {
    this.t += dt;
    this.sm += dt;
    this.flashT += dt;
    this.shakeA *= Math.exp(-dt / 0.08);
    if (this.mini.scene) this.mini.scene.update(this, dt);
    else this.actUpdate(dt);
    this.dots.tick(dt);
  }

  // ——— an act ———

  /** How far through turning from the first place to the second: 0 (the first) … 1 (the second). */
  private mixAB(): number {
    if (this.places.length < 2) return 0;
    const P = 16;
    const u = ((this.turn % P) + P) % P;
    // 7 s on each, a 1 s turn between
    if (u < 7) return 0;
    if (u < 8) return smooth((u - 7) / 1);
    if (u < 15) return 1;
    return 1 - smooth(u - 15);
  }

  /** Have the act's boss ready to stomp (fetched in the background the first time). */
  wantBoss(): void {
    const act = this.mini.act;
    if (!act || this.boss) return;
    this.bossWanted = true;
    this.boss = stompOf(act.bossId, this.mini.px);
  }

  private actUpdate(dt: number): void {
    if (this.bossWanted && !this.boss) this.boss = stompOf(this.mini.act!.bossId, this.mini.px);
    // (a smack's stomp holds the place it lands in: the turn waits)
    if (this.stompT > STOMP) this.turn += dt;
    const m = this.mixAB();
    this.places.forEach((p, i) => {
      if ((i === 0 && m < 0.999) || (i === 1 && m > 0.001)) p.update(dt);
    });
    // the light's sweep over the number every few seconds
    if (this.sweepT < 0) {
      this.sweepNext -= dt;
      if (this.sweepNext <= 0) this.sweepT = 0;
    } else {
      this.sweepT += dt / 1.1;
      if (this.sweepT >= 1) {
        this.sweepT = -1;
        this.sweepNext = 3 + crand() * 3;
      }
    }
    this.studT += dt;
    this.stompT += dt;
    // the number's jolt: a spring
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.numV += (-this.numY * 520 - this.numV * 14) * h;
      this.numY += this.numV * h;
    }
  }

  /** The place showing now (the one the stomp lands in). */
  private current(): PlaceLive | null {
    if (!this.places.length) return null;
    return this.places[this.mixAB() < 0.5 ? 0 : 1];
  }

  /** Scene px of the place showing → disc units → peel units (what a place throws). */
  private placeOut(pl: PlaceLive): PlaceEmit {
    return (spr, sx, sy, vx, vy, s0, s1, life, o) => {
      if (!this.emitPlace) return;
      const [bx, by] = pl.toPeel(sx, sy);
      const b = pl.mini.box;
      const side = Math.min(b.w, b.h);
      const dx = 60 + ((bx - (b.x + b.w / 2)) * 120) / side;
      const dy = 60 + ((by - (b.y + b.h / 2)) * 120) / side;
      const [lx, ly] = this.toPeel(dx, dy);
      this.emitPlace(spr, lx, ly, vx, vy, s0, s1, life, o);
    };
  }

  private actSmack(): void {
    const calm = this.calm;
    const out = this.out;
    const m = this.menu ? 0.6 : 1;
    this.numV -= 170 * calm;
    this.flash('#fff0c0', 0.32, 0.35);
    // the place reacts as its peel does
    const pl = this.current();
    pl?.smack(this.placeOut(pl));
    // the boss stomps down on it (from just above, so it lands at once in play); a smack while a stomp is still
    // going (fast clicking in play) only rings the number, so the place isn't always under a foot
    this.wantBoss();
    const stomp = !!this.boss && this.stompT >= STOMP;
    if (stomp) this.stompT = 0;
    this.shake(stomp ? 2.6 : 1.2);
    // dust out from under the sole
    if (stomp) for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1;
      this.dots.spawn('dust', 60 + s * (18 + crand() * 22), 102 + crand() * 6, s * (40 + crand() * 50), -10 - crand() * 20, 14, 34, 0.55 + crand() * 0.25, { drag: 2.5, a: 0.8 });
    }
    if (stomp) for (let i = 0; i < 3; i++) {
      const s = i % 2 ? 1 : -1;
      out('dust', 60 + s * 50, 104, s * 120 * m, -40, 16, this.menu ? 30 : 46, 0.45, { drag: 2.6, a: 0.6 });
    }
    // the number rings: glints burst off it
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * 2.4;
      const sp = (90 + crand() * 110) * m;
      out('glint', NUM.x + Math.cos(a) * 16, NUM.y - 10 + Math.sin(a) * 12, Math.cos(a) * sp, Math.sin(a) * sp, 10 + crand() * 5, 2, 0.4 + crand() * 0.2, { drag: 2 });
    }
  }

  // ——— drawing ———

  /** Draw the medallion's contents into a head's surface (peel units), kept inside it. */
  draw(ctx: Ctx): void {
    const d = this.mini.disc;
    const k = d.r / 60;
    ctx.save();
    discPath(ctx, d);
    ctx.clip();
    ctx.translate(d.cx - 60 * k, d.cy - 60 * k);
    ctx.scale(k, k);
    if (this.shakeA > 0.05 && !this.still) ctx.translate(this.shakeA * noise1(this.t * 55), this.shakeA * noise1(this.t * 55 + 9) * 0.7);
    if (this.mini.scene) this.mini.scene.draw(ctx, this, this.mini.parts);
    else this.actDraw(ctx);
    this.dots.draw(ctx);
    const fu = this.flashT / this.flashLen;
    if (!this.still && fu < 1 && this.flashA > 0.01) {
      const a = this.flashA * (1 - fu) * (1 - fu);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(60, 52, 0, 60, 60, 80);
      g.addColorStop(0, rgba(this.flashC, a));
      g.addColorStop(0.6, rgba(this.flashC, a * 0.5));
      g.addColorStop(1, rgba(this.flashC, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-10, -10, 140, 140);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  /** Over the bezel and studs (peel units): the studs glinting in turn. */
  drawOver(ctx: Ctx): void {
    if (this.still) return;
    if (this.mini.look.shiny) {
      // a shiny's foil twinkles round the band, here and there
      const d = this.mini.disc;
      for (let i = 0; i < 4; i++) {
        const u = (this.t * 0.45 + i * 0.27) % 1;
        if (u > 0.22) continue;
        const a = Math.sin((u / 0.22) * Math.PI);
        const ang = i * 2.39 + Math.floor(this.t * 0.45 + i * 0.27) * 1.7;
        const rr = d.r + 15;
        star(ctx, d.cx + Math.cos(ang) * rr, d.cy + Math.sin(ang) * rr * 1.05, 8 * a, a);
      }
    }
    if (!this.studs.length) return;
    const n = this.studs.length;
    // one at a time round the band, then a rest
    const P = n * 0.22 + 2.2;
    const u = (this.studT % P) / 0.22;
    const i = Math.floor(u);
    const flare = this.hit(0.6);
    for (let j = 0; j < n; j++) {
      let a = 0;
      if (j === i) a = Math.sin(Math.PI * (u - i));
      // a smack lights them all, from the middle out
      if (flare > 0.01) a = Math.max(a, flare * smooth(1 - Math.abs(j - (n - 1) / 2) / n - (1 - flare)));
      if (a <= 0.02) continue;
      const [x, y] = this.studs[j];
      star(ctx, x - 1.5, y - 1.5, 7 * a, a);
    }
  }

  private actDraw(g: Ctx): void {
    const act = this.mini.act!;
    const m = this.mixAB();
    // the places: their own living windows, the middle of each
    this.places.forEach((p, i) => {
      const a = i === 0 ? 1 - m : m;
      if (a <= 0.001) return;
      const win = p.compose();
      const side = Math.min(win.width, win.height);
      g.globalAlpha = i === 0 ? 1 : a;
      g.drawImage(win, (win.width - side) / 2, (win.height - side) / 2, side, side, 0, 0, 120, 120);
      g.globalAlpha = 1;
    });
    // the boss's foot stomping down on the medallion, in front of everything: down fast (already on its way, so it
    // lands at once in play), a squash as it lands, a beat, then up and away
    const st = this.stompT;
    const boss = this.boss;
    const stomping = !!boss && st < STOMP && !this.still;
    let footY = 0;
    let sq = 0;
    if (stomping) {
      if (st < 0.07) footY = GROUND - 50 * (1 - st / 0.07) * (1 - st / 0.07);
      else if (st < 0.3) {
        footY = GROUND;
        const u = (st - 0.07) / 0.25;
        sq = u < 1 ? Math.sin(u * Math.PI * 2.2) * Math.exp(-u * 3) * 0.12 : 0;
      } else footY = GROUND - 170 * Math.pow((st - 0.3) / (STOMP - 0.3), 2);
      // its shadow, darker as it nears
      const near = Math.max(0, 1 - (GROUND - footY) / 90);
      ellipse(g, 60, GROUND + 1, boss!.w * 0.5 * (0.7 + 0.3 * near), 7 * (0.7 + 0.3 * near));
      g.fillStyle = `rgba(10,4,2,${(0.45 * near).toFixed(3)})`;
      g.fill();
    }
    // the foot, behind the number: the number stays in front, squashed flat under the sole
    if (stomping) {
      const b = boss!;
      g.save();
      g.translate(60, footY);
      g.scale(1 + sq, 1 - sq);
      g.drawImage(b.art, -b.w / 2, -b.h, b.w, b.h);
      g.restore();
    }
    // the number, struck in gold, jolting (and squashed under the foot)
    const ny = NUM.y + this.numY * 0.06;
    const nsq = stomping && st < 0.3 ? 0.72 - sq * 0.6 : stomping && st < 0.45 ? 0.72 + (st - 0.3) / 0.15 * 0.28 : 1;
    placePart(g, act.num, NUM.x, ny + (1 - nsq) * 30, 0, 1 + (1 - nsq) * 0.5, nsq);
    // the light's sweep over it, and a flare when the stomp lands
    const sw = this.sweepT;
    const fl = this.still ? 0 : this.hit(0.5);
    if ((sw >= 0 && !this.still) || fl > 0.01) {
      const [sc, sx] = this.scratch(act.numLit);
      sx.setTransform(1, 0, 0, 1, 0, 0);
      sx.globalCompositeOperation = 'source-over';
      sx.clearRect(0, 0, sc.width, sc.height);
      const W = sc.width;
      const H = sc.height;
      if (sw >= 0) {
        const c = -0.3 + 1.6 * sw;
        const gr = sx.createLinearGradient(W * (c - 0.25), H * (c - 0.25), W * (c + 0.05), H * (c + 0.05));
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(0.5, `rgba(255,255,240,${(0.85 * Math.sin(Math.PI * sw)).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        sx.fillStyle = gr;
        sx.fillRect(0, 0, W, H);
      }
      if (fl > 0.01) {
        sx.fillStyle = `rgba(255,236,170,${(0.7 * fl).toFixed(3)})`;
        sx.fillRect(0, 0, W, H);
      }
      sx.globalCompositeOperation = 'destination-in';
      sx.drawImage(act.numLit.c, 0, 0);
      g.save();
      g.translate(NUM.x, ny + (1 - nsq) * 30);
      g.scale(1 + (1 - nsq) * 0.5, nsq);
      g.globalCompositeOperation = 'lighter';
      g.drawImage(sc, act.numLit.x, act.numLit.y, act.numLit.w, act.numLit.h);
      g.restore();
    }
    // a glint on the number's shoulder now and then
    if (!this.still) {
      const gp = (this.t * 0.37) % 1;
      if (gp < 0.12 && !stomping) star(g, NUM.x - 14, ny - 26, 9 * Math.sin((gp / 0.12) * Math.PI), Math.sin((gp / 0.12) * Math.PI));
    }
  }

  private sc: [HTMLCanvasElement, Ctx] | null = null;
  private scratch(p: Part): [HTMLCanvasElement, Ctx] {
    if (!this.sc || this.sc[0].width !== p.c.width || this.sc[0].height !== p.c.height) this.sc = makeCanvas(p.c.width, p.c.height);
    return this.sc;
  }
}

function smooth(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

let glintImg: HTMLCanvasElement | null = null;
/** A four-pointed glint in its own soft light. */
export function star(ctx: Ctx, x: number, y: number, size: number, a: number): void {
  if (size <= 0.3 || a <= 0.01) return;
  if (!glintImg) {
    const [c, g] = makeCanvas(32, 32);
    const rg = g.createRadialGradient(16, 16, 0, 16, 16, 15);
    rg.addColorStop(0, 'rgba(255,255,255,0.7)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 32, 32);
    sparkleStar(g, 16, 16, 13);
    g.fillStyle = '#ffffff';
    g.fill();
    glintImg = c;
  }
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glintImg, x - size, y - size, size * 2, size * 2);
  ctx.globalAlpha = 1;
}

// ════════════════════════════ the head round the medallion ════════════════════════════

/** The bezel's metal: an event's own, an act's gold. */
function bezelOf(look: PeelLook): string {
  if (look.craft === 'act') return '#e0a92a';
  return (look.event && EVENT_SCENES[look.event]?.bezel) || '#b08a4a';
}

/** The head under the medallion: its material, pattern and foil, and the medallion's shadow on it. */
export function medalUnder(ctx: Ctx, look: PeelLook): void {
  plainHeadUnder(ctx, look);
  const d = discOf(look.shape, !!look.studs);
  ctx.save();
  headPath(ctx, look.shape);
  ctx.clip();
  ctx.translate(2.5, 3.5);
  for (let i = 0; i < 4; i++) {
    discPath(ctx, d, 6 + i * 2.2);
    ctx.strokeStyle = 'rgba(20,8,2,0.1)';
    ctx.lineWidth = 3 + i * 3;
    ctx.stroke();
  }
  ctx.restore();
}

/** Over the medallion: the bezel's shadow into it, the glass, the bezel (an act's milled like a coin's edge); then the
 *  head's studs and outline. */
export function medalOver(ctx: Ctx, look: PeelLook): void {
  const d = discOf(look.shape, !!look.studs);
  const col = bezelOf(look);
  const act = look.craft === 'act';
  const box = { x: d.cx - d.r, y: d.cy - d.r, w: d.r * 2, h: d.r * 2 };
  ctx.save();
  discPath(ctx, d);
  ctx.clip();
  ctx.save();
  ctx.translate(2, 2.8);
  for (let i = 0; i < 5; i++) {
    discPath(ctx, d, 1.5 - i * 0.2);
    ctx.strokeStyle = `rgba(8,4,12,${(0.15 - i * 0.025).toFixed(3)})`;
    ctx.lineWidth = 3 + i * 3;
    ctx.stroke();
  }
  ctx.restore();
  // the glass: a soft lit sheen on its top left, a faint window's reflection
  const gl = ctx.createRadialGradient(d.cx - d.r * 0.45, d.cy - d.r * 0.5, 0, d.cx - d.r * 0.3, d.cy - d.r * 0.3, d.r * 1.1);
  gl.addColorStop(0, 'rgba(255,255,255,0.16)');
  gl.addColorStop(0.45, 'rgba(255,255,255,0.04)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  windowBars(ctx, d.cx - d.r * 0.38, d.cy - d.r * 0.5, d.r * 0.55, 0.13, 0.04);
  // the glass's lit edge: bright on the bottom right where the light comes through
  const ge = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  ge.addColorStop(0, 'rgba(255,255,255,0.1)');
  ge.addColorStop(0.55, 'rgba(255,255,255,0.06)');
  ge.addColorStop(1, 'rgba(255,255,255,0.4)');
  discPath(ctx, d, -1.4);
  ctx.strokeStyle = ge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // the bezel: a ring lit on its top left and shaded on its bottom right
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  g.addColorStop(0, shade(col, 0.6));
  g.addColorStop(0.3, shade(col, 0.18));
  g.addColorStop(0.62, col);
  g.addColorStop(1, shade(col, -0.5));
  discPath(ctx, d, 4.6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 13;
  ctx.stroke();
  discPath(ctx, d, 4.6);
  ctx.strokeStyle = g;
  ctx.lineWidth = 8.6;
  ctx.stroke();
  if (act) {
    // milled like a coin's edge: fine ridges round the ring, each lit on its top-left side
    const n = Math.round(d.r * 1.4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const lit = 0.5 - 0.5 * Math.cos(a + Math.PI / 4 + Math.PI);
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(d.cx + c * (d.r + 1.8), d.cy + s * (d.r + 1.8));
      ctx.lineTo(d.cx + c * (d.r + 7.4), d.cy + s * (d.r + 7.4));
      ctx.strokeStyle = `rgba(90,46,4,${(0.18 + 0.3 * (1 - lit)).toFixed(3)})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  }
  const hl = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  hl.addColorStop(0, 'rgba(255,255,255,0.6)');
  hl.addColorStop(0.45, 'rgba(255,255,255,0)');
  discPath(ctx, d, 6.3);
  ctx.strokeStyle = hl;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const sh = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  sh.addColorStop(0.55, rgba(shade(col, -0.7), 0));
  sh.addColorStop(1, rgba(shade(col, -0.7), 0.6));
  discPath(ctx, d, 2.6);
  ctx.strokeStyle = sh;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  discPath(ctx, d, 0.4);
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  if (look.studs) bandStuds(ctx, look);
  plainHeadOver(ctx, { ...look, studs: undefined }, false);
}

/** An event or act peel's head, whole (the still): the head, the medallion at rest, the bezel. */
export function paintMedalHead(ctx: Ctx, look: PeelLook): void {
  medalUnder(ctx, look);
  const m = ctx.getTransform();
  const RR = Math.max(1, Math.round(Math.hypot(m.a, m.b) * 2) / 2);
  if (look.craft === 'act' && look.act) {
    // the first place at rest (its window's still), the number over it
    const info = actInfo(look.act);
    const d = discOf(look.shape, !!look.studs);
    const k = d.r / 60;
    const loc = info ? info.places[STILL_PLACE[look.act] ?? 0] ?? info.places[0] : null;
    const still = loc && placeShapes ? placeStillNow(loc, placeShapes(loc)) : null;
    ctx.save();
    discPath(ctx, d);
    ctx.clip();
    ctx.translate(d.cx - 60 * k, d.cy - 60 * k);
    ctx.scale(k, k);
    if (still) {
      const side = Math.min(still.width, still.height);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(still, (still.width - side) / 2, (still.height - side) / 2, side, side, 0, 0, 120, 120);
    }
    const [num] = numeral((RR * d.r) / 60, look.act);
    placePart(ctx, num, NUM.x, NUM.y);
    ctx.restore();
  } else {
    const key = `${look.event}:${look.shape}:${!!look.studs}@${RR}`;
    let mini = stillMinis.get(key);
    if (mini === undefined) {
      mini = medalMiniNow(look, RR);
      stillMinis.set(key, mini);
    }
    if (mini) {
      const live = new MedalLive(mini);
      live.rest();
      live.draw(ctx);
    }
  }
  medalOver(ctx, look);
}
