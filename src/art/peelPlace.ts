// Place peels: each carries a living miniature of its location in a window set into its head (the peel's own shape,
// colours, pattern and handle round it). The window shows a corner of the location's redrawn backdrop, painted by
// the scene's own layers (src/art/scene/layers.ts paintCropSteps: only the layers that reach the window, at the
// window's size, never the whole backdrop), and its hero motion played over it from the scene's own frame painters
// (the trattoria's oven fire, the beach's surf, the rink's mirror ball …), baked to a small loop per place
// (src/art/peelPlaceDefs.ts says which, and what each place does when a smack lands).
//
// The window is recessed into the head behind a bezel, lit from the top left like everything else: the bezel throws
// a soft shadow on the head round it and the head's edge throws one into the window; a faint reflection lies on the
// glass. It lives as the crafted peels do (src/art/peelCraft.ts: kind 'place'): the rig holds the window's painted
// base and its loops' frames, built a step at a time in idle time; each frame the window is composed (the base,
// the loops cross-faded, the place's own touches) and drawn into the head's surface, which flexes about the neck.
//
// The window's base (the slow part: a handful of the scene's layers) is kept per place once painted, and saved to the
// art cache so the next visit only decodes it. Everything cosmetic uses crand().

import type { LocationId } from './backdrops';
import { PEEL_HEAD, headPath, plainHeadOver, plainHeadUnder, type PeelLook, type PeelShape } from './peelArt';
import { windowBars } from './peelCraftArt';
import { PLACE_HEADS, headOver } from './peelPlaceHeads';
import { PLACE_DEFS, type LoopDef, type PlaceDef, type PlaceEmit, type PlaceState } from './peelPlaceDefs';
import { kitSpec, paintCropSteps } from './scene/layers';
import { makeCanvas, rgba, shade, type Ctx } from './util';
import { INK } from './feetCommon';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import { bitmapCanvas, cachedArt, readArt, writeArt } from '../game/artCache';
import PEEL_VERSION from 'virtual:peel-version';

export type { PlaceEmit, PlaceSpr } from './peelPlaceDefs';

const { x: HX, y: HY, r: R } = PEEL_HEAD;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Does this location's peel have a window (a place def)? */
export const hasPlaceWindow = (loc: string): loc is LocationId => !!PLACE_DEFS[loc as LocationId];

// ════════════════════════════ the window's shape ════════════════════════════

/** Paddle and spade windows are the head's own outline, drawn smaller about this point. */
const WC = { x: HX, y: HY - 4, k: 0.66 };

/** The window's opening, in peel units (`grow`: out past it, for the bezel's edge). */
export function winPath(ctx: Ctx, shape: PeelShape, grow = 0): void {
  ctx.beginPath();
  if (shape === 'round') ctx.arc(HX, HY - 3, 58 + grow, 0, Math.PI * 2);
  else if (shape === 'oval') ctx.ellipse(HX, HY - 3, 47 + grow, 62 + grow, 0, 0, Math.PI * 2);
  else if (shape === 'square') {
    const x0 = 50 - grow;
    const y0 = 40 - grow;
    const w = 120 + grow * 2;
    const h = 108 + grow * 2;
    const r = 14 + grow;
    ctx.moveTo(x0 + r, y0);
    ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
    ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    ctx.arcTo(x0, y0 + h, x0, y0, r);
    ctx.arcTo(x0, y0, x0 + w, y0, r);
    ctx.closePath();
  } else {
    // the head's outline, smaller (grown a little for the bezel by drawing it a touch bigger)
    const k = WC.k + grow / R;
    ctx.save();
    ctx.translate(WC.x, WC.y);
    ctx.scale(k, k);
    ctx.translate(-WC.x, -WC.y);
    headPath(ctx, shape);
    ctx.restore();
  }
}

/** The window's bounding box (peel units). */
export function winBox(shape: PeelShape): Box {
  switch (shape) {
    case 'round':
      return { x: 51, y: 38, w: 118, h: 118 };
    case 'oval':
      return { x: 62, y: 34, w: 96, h: 126 };
    case 'square':
      return { x: 49, y: 39, w: 122, h: 110 };
    case 'paddle':
      return { x: 49, y: 44, w: 122, h: 118 };
    default:
      return { x: 48, y: 38, w: 124, h: 124 };
  }
}

/** A place's head: its own silhouette (src/art/peelPlaceHeads.ts), or the old window in the head's shape. */
export function placePath(ctx: Ctx, loc: LocationId, shape: PeelShape): void {
  const h = PLACE_HEADS[loc];
  if (h) h.path(ctx);
  else winPath(ctx, shape);
}

/** Is a place's head painted whole (the object itself, not its window)? */
export const placePainted = (loc: LocationId): boolean => !!PLACE_HEADS[loc]?.paint;

/** The box a place's window fills (peel units). */
export const placeBox = (loc: LocationId, shape: PeelShape): Box => PLACE_HEADS[loc]?.box ?? winBox(shape);

/** The box of the scene the window shows: as wide as its def's crop (scaled to its head's box, moved and zoomed as
 *  the head says) about its centre, as tall as the box's shape asks. */
function cropOf(def: PlaceDef, loc: LocationId, shape: PeelShape, box: Box): Box {
  const hd = PLACE_HEADS[loc];
  const w = hd ? (def.crop.w * box.w) / winBox(shape).w / (hd.zoom ?? 1) : def.crop.w;
  const cx = def.crop.cx + (hd?.dx ?? 0);
  const cy = def.crop.cy + (hd?.dy ?? 0);
  const h = (w * box.h) / box.w;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

// ════════════════════════════ the window's base (the scene's layers, painted once) ════════════════════════════

/** Base canvases are painted at this many px per peel unit and drawn down for smaller rigs. */
const BASE_RR = 2;
/** A place's window, painted once: the scene's layers behind (base) and, if it has any, in front of its motion; and
 *  the window at rest (the still: the base, each loop's first frame, the front and the place's touches), so a
 *  thumbnail is a single draw. */
interface Painted {
  base: HTMLCanvasElement;
  front: HTMLCanvasElement | null;
  still: HTMLCanvasElement;
}
const bases = new Map<LocationId, Painted>();
const baseKey = (loc: LocationId) => `place:${PEEL_VERSION}:${loc}`;

function* baseSteps(loc: LocationId, shape: PeelShape): Generator<void, Painted | null> {
  const have = bases.get(loc);
  if (have) return have;
  const def = PLACE_DEFS[loc];
  const spec = kitSpec(loc);
  if (!def || !spec) return null;
  const box = placeBox(loc, shape);
  const crop = cropOf(def, loc, shape, box);
  const px = Math.ceil(box.w * BASE_RR);
  const from = def.frontFrom ? spec.layers.findIndex((l) => l.id === def.frontFrom) : -1;
  const front = new Set([...(def.front ?? []), ...(from >= 0 ? spec.layers.slice(from + 1).map((l) => l.id) : [])]);
  const base = yield* paintCropSteps(spec, crop, px, { skip: new Set([...(def.skip ?? []), ...front]) });
  def.base?.(base.getContext('2d')!, base.width / crop.w, crop);
  const fr = front.size ? yield* paintCropSteps(spec, crop, px, { only: front, clear: true }) : null;
  const k = px / crop.w;
  const frames: HTMLCanvasElement[][] = [];
  for (const lp of def.loops ?? []) {
    frames.push([loopFrame(lp, k, 0)]);
    yield;
  }
  const live = new PlaceLive({ loc, def, shape, RR: BASE_RR, box, crop, k, base, front: fr, frames });
  live.rest(def.stillT ?? 0);
  const still = live.compose();
  const out = { base, front: fr, still };
  bases.set(loc, out);
  writeArt(baseKey(loc), fr ? [base, still, fr] : [base, still], null, true);
  return out;
}

/** A place's window base from the art cache, if it's there (decoded off the main thread). */
async function baseFromCache(loc: LocationId): Promise<boolean> {
  if (bases.has(loc)) return true;
  const key = baseKey(loc);
  if (!cachedArt(key)) return false;
  const r = await readArt(key, 1500);
  if (!r || r.bitmaps.length < 2) return false;
  if (!bases.has(loc)) bases.set(loc, { base: bitmapCanvas(r.bitmaps[0]), still: bitmapCanvas(r.bitmaps[1]), front: r.bitmaps[2] ? bitmapCanvas(r.bitmaps[2]) : null });
  else r.bitmaps.forEach((b) => b.close());
  return true;
}

const pending = new Map<LocationId, Promise<void>>();
const idle = (fn: () => void) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => fn(), { timeout: 200 });
  else setTimeout(fn, 16);
};

/** Have a place's window base ready (from the art cache, or painted a layer per idle moment): the locker waits on
 *  it before drawing the place's thumbnail, and a run warms its location's so an unlock's toast is a quick draw. */
export function placeBaseAsync(loc: LocationId, shape: PeelShape): Promise<void> {
  if (bases.has(loc) || !PLACE_DEFS[loc]) return Promise.resolve();
  let p = pending.get(loc);
  if (!p) {
    p = (async () => {
      if (await baseFromCache(loc)) return;
      const gen = baseSteps(loc, shape);
      await new Promise<void>((done) => {
        const step = () => {
          const t0 = performance.now();
          try {
            for (;;) {
              const r = gen.next();
              if (r.done) return done();
              if (performance.now() - t0 > 6) break;
            }
          } catch (e) {
            if (import.meta.env?.DEV) console.error('[peelPlace] painting', loc, e);
            return done();
          }
          idle(step);
        };
        idle(step);
      });
    })().finally(() => pending.delete(loc));
    pending.set(loc, p);
  }
  return p;
}

/** Is a place's window base in memory? */
export const placeBaseReady = (loc: LocationId): boolean => bases.has(loc);

/** The base now (painted on the spot if it isn't ready). */
function baseNow(loc: LocationId, shape: PeelShape): Painted | null {
  const gen = baseSteps(loc, shape);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

/** A canvas drawn down to w × h, halved step by step first so it stays smooth. */
export function downTo(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  if (src.width === w && src.height === h) return src;
  while (src.width / 2 >= w * 1.4) {
    const [c, cx] = makeCanvas(Math.ceil(src.width / 2), Math.ceil(src.height / 2));
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(src, 0, 0, c.width, c.height);
    src = c;
  }
  const [c, cx] = makeCanvas(w, h);
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(src, 0, 0, w, h);
  return c;
}

// ════════════════════════════ the mini: the base and the loops' frames at a rig's size ════════════════════════════

export interface PlaceMini {
  loc: LocationId;
  def: PlaceDef;
  shape: PeelShape;
  RR: number;
  /** The window's box (peel units) and the scene's box it shows. */
  box: Box;
  crop: Box;
  /** Canvas px per scene px. */
  k: number;
  base: HTMLCanvasElement;
  front: HTMLCanvasElement | null;
  /** Each loop's frames, painted at k. */
  frames: HTMLCanvasElement[][];
}

function miniOf(loc: LocationId, shape: PeelShape, RR: number, p: Painted, frames: (k: number) => HTMLCanvasElement[][]): PlaceMini {
  const def = PLACE_DEFS[loc]!;
  const box = placeBox(loc, shape);
  const crop = cropOf(def, loc, shape, box);
  const pw = Math.ceil(box.w * RR);
  const ph = Math.ceil(box.h * RR);
  const k = pw / crop.w;
  return { loc, def, shape, RR, box, crop, k, base: downTo(p.base, pw, ph), front: p.front ? downTo(p.front, pw, ph) : null, frames: frames(k) };
}

/** The mini for a rig (canvas px per peel unit RR): its base, then its loops' frames, a step at a time. */
export function* placeMiniSteps(loc: LocationId, shape: PeelShape, RR: number): Generator<void, PlaceMini | null> {
  const def = PLACE_DEFS[loc];
  if (!def) return null;
  const p = yield* baseSteps(loc, shape);
  if (!p) return null;
  const box = placeBox(loc, shape);
  const k = Math.ceil(box.w * RR) / cropOf(def, loc, shape, box).w;
  const frames: HTMLCanvasElement[][] = [];
  for (const lp of def.loops ?? []) {
    const fr: HTMLCanvasElement[] = [];
    for (let i = 0; i < lp.n; i++) {
      fr.push(loopFrame(lp, k, i));
      yield;
    }
    frames.push(fr);
  }
  return miniOf(loc, shape, RR, p, () => frames);
}

function loopFrame(lp: LoopDef, k: number, i: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(lp.box.w * k, lp.box.h * k);
  ctx.scale(k, k);
  lp.paint(ctx, i / lp.n, i);
  return c;
}

// ════════════════════════════ the living window ════════════════════════════

const reduced = () => !!save.settings.reducedMotion;

/** One place a place peel's window shows (a locker canvas, the cursor peel). */
export class PlaceLive implements PlaceState {
  t = crand() * 20;
  sm = 9;
  readonly r = crand;
  readonly win: HTMLCanvasElement;
  private wctx: Ctx;
  private ph: number[];
  /** Anything a place keeps between frames (its own clocks, what it's doing). */
  readonly mem: Record<string, number> = {};
  /** The still: every loop on its first frame, nothing moving. */
  still = false;

  constructor(readonly mini: PlaceMini) {
    [this.win, this.wctx] = makeCanvas(mini.base.width, mini.base.height);
    this.ph = (mini.def.loops ?? []).map((lp) => crand() * lp.n);
  }

  /** At rest at time t (the still): every loop on its first frame. */
  rest(t: number): void {
    this.t = t;
    this.sm = 9;
    this.ph.fill(0);
    this.still = true;
  }

  get calm(): number {
    return reduced() ? 0.35 : 1;
  }

  /** The smack's envelope: 1 as it lands, easing to 0 over `len` seconds. */
  hit(len = 0.8): number {
    const u = this.sm / len;
    return u >= 1 ? 0 : (1 - u) * (1 - u);
  }

  update(dt: number): void {
    this.t += dt;
    this.sm += dt;
    PLACE_HEADS[this.mini.loc]?.update?.(this, dt);
    (this.mini.def.loops ?? []).forEach((lp, i) => {
      const rush = 1 + (lp.rush ?? 0.8) * this.hit(0.9);
      this.ph[i] = (this.ph[i] + dt * lp.fps * rush * (reduced() ? 0.6 : 1)) % lp.n;
    });
  }

  smack(emit: PlaceEmit): void {
    this.sm = 0;
    this.mini.def.smack?.(this, emit);
  }

  /** The window this frame. */
  compose(): HTMLCanvasElement {
    const m = this.mini;
    const def = m.def;
    const g = this.wctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.drawImage(m.base, 0, 0);
    const k = m.k;
    const sceneT = () => g.setTransform(k, 0, 0, k, -m.crop.x * k, -m.crop.y * k);
    const front = () => {
      if (!m.front) return;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(m.front, 0, 0);
      sceneT();
    };
    sceneT();
    def.under?.(g, this);
    if (def.frontUnder) front();
    (def.loops ?? []).forEach((lp, li) => {
      const fr = m.frames[li];
      const at = lp.at?.(this);
      if (at === null) return;
      let p = this.still ? 0 : lp.show?.(this) ?? this.ph[li];
      p = ((p % lp.n) + lp.n) % lp.n;
      const i = Math.floor(p) % lp.n;
      const f = this.still ? 0 : p - Math.floor(p);
      const b = lp.box;
      const a0 = ((typeof lp.alpha === 'function' ? lp.alpha(this) : lp.alpha) ?? 1) * (at?.a ?? 1);
      if (a0 <= 0.005) return;
      g.save();
      if (at) {
        const px = at.px ?? b.x + b.w / 2;
        const py = at.py ?? b.y + b.h / 2;
        g.translate(px + (at.dx ?? 0), py + (at.dy ?? 0));
        g.rotate(at.rot ?? 0);
        g.scale((at.sc ?? 1) * (at.flip ? -1 : 1), at.sc ?? 1);
        g.translate(-px, -py);
      }
      g.globalCompositeOperation = lp.add ? 'lighter' : 'source-over';
      // (cross-faded: the next frame over this one, as sceneAnim's Loop does)
      g.globalAlpha = a0;
      g.drawImage(fr[i], b.x, b.y, b.w, b.h);
      if (f > 0.01 && fr.length > 1) {
        // (the next frame wraps within its run of frames: a gull's idle doesn't fade into its call)
        const seg = lp.segs?.find(([a, z]) => i >= a && i < z) ?? [0, lp.n];
        const nx = i + 1 >= seg[1] ? seg[0] : i + 1;
        g.globalAlpha = a0 * f;
        g.drawImage(fr[nx % fr.length], b.x, b.y, b.w, b.h);
      }
      const fl = this.still ? 0 : (lp.flare ?? 0) * this.hit(0.9);
      if (fl > 0.01) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = Math.min(1, fl);
        g.drawImage(fr[i], b.x, b.y, b.w, b.h);
      }
      g.restore();
    });
    if (!def.frontUnder) front();
    def.fx?.(g, this);
    // a flash of light over the whole window as the smack lands (so it reads at the cursor's size)
    const [fc, fa] = def.flash ?? ['#fff2dc', 0.25];
    const fl = this.still ? 0 : this.hit(0.45) * fa;
    if (fl > 0.01) {
      const c = m.crop;
      g.save();
      g.globalCompositeOperation = 'lighter';
      const rg = g.createRadialGradient(c.x + c.w / 2, c.y + c.h * 0.45, 0, c.x + c.w / 2, c.y + c.h / 2, c.w * 0.75);
      rg.addColorStop(0, rgba(fc, fl));
      rg.addColorStop(0.6, rgba(fc, fl * 0.5));
      rg.addColorStop(1, rgba(fc, 0));
      g.fillStyle = rg;
      g.fillRect(c.x, c.y, c.w, c.h);
      g.restore();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    return this.win;
  }

  /** Scene px → peel units (for what flies off the peel). */
  toPeel(sx: number, sy: number): [number, number] {
    const m = this.mini;
    return [m.box.x + ((sx - m.crop.x) * m.box.w) / m.crop.w, m.box.y + ((sy - m.crop.y) * m.box.h) / m.crop.h];
  }

  /** Draw the window into a head's surface (peel units; the caller keeps it inside the head). */
  draw(ctx: Ctx): void {
    const m = this.mini;
    const hd = PLACE_HEADS[m.loc];
    if (hd?.paint) return hd.paint(ctx, this);
    ctx.save();
    placePath(ctx, m.loc, m.shape);
    ctx.clip();
    ctx.drawImage(this.compose(), m.box.x, m.box.y, m.box.w, m.box.h);
    ctx.restore();
  }
}

// ════════════════════════════ the head round the window ════════════════════════════

/** The head under the window: its material, pattern and foil, clipped to the head. */
export function placeUnder(ctx: Ctx, look: PeelLook): void {
  // (a head of its own has nothing under its window)
  if (look.place && PLACE_HEADS[look.place]) return;
  plainHeadUnder(ctx, look);
  // the bezel's shadow on the head round it (light from the top left)
  ctx.save();
  headPath(ctx, look.shape);
  ctx.clip();
  ctx.translate(2.5, 3.5);
  for (let i = 0; i < 4; i++) {
    winPath(ctx, look.shape, 5 + i * 2.2);
    ctx.strokeStyle = 'rgba(20,8,2,0.1)';
    ctx.lineWidth = 3 + i * 3;
    ctx.stroke();
  }
  ctx.restore();
}

/** Over the window: the head's edge shadow inside it, the glass, the bezel; then the head's studs, outline and gloss. */
export function placeOver(ctx: Ctx, look: PeelLook): void {
  const hd = look.place ? PLACE_HEADS[look.place] : undefined;
  if (hd) return headOver(ctx, hd);
  const def = look.place ? PLACE_DEFS[look.place] : undefined;
  const col = def?.bezel ?? '#b08a4a';
  const shape = look.shape;
  const box = winBox(shape);
  // inside the opening: the bezel's shadow falls in from its top left edge, and the glass catches the light
  ctx.save();
  winPath(ctx, shape);
  ctx.clip();
  ctx.save();
  ctx.translate(2.2, 3);
  for (let i = 0; i < 5; i++) {
    winPath(ctx, shape, 1.5 - i * 0.2);
    ctx.strokeStyle = `rgba(8,4,12,${(0.16 - i * 0.025).toFixed(3)})`;
    ctx.lineWidth = 3 + i * 3.2;
    ctx.stroke();
  }
  ctx.restore();
  const gl = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  gl.addColorStop(0, 'rgba(255,255,255,0.14)');
  gl.addColorStop(0.32, 'rgba(255,255,255,0.03)');
  gl.addColorStop(0.5, 'rgba(255,255,255,0)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  windowBars(ctx, box.x + box.w * 0.3, box.y + box.h * 0.24, box.w * 0.3, 0.14, 0.04);
  ctx.restore();
  // the bezel: a ring lit on its top left, shaded on its bottom right, a fine lit edge where it meets the glass
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  g.addColorStop(0, shade(col, 0.55));
  g.addColorStop(0.3, shade(col, 0.15));
  g.addColorStop(0.62, col);
  g.addColorStop(1, shade(col, -0.45));
  winPath(ctx, shape, 4.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 13;
  ctx.stroke();
  winPath(ctx, shape, 4.5);
  ctx.strokeStyle = g;
  ctx.lineWidth = 8.4;
  ctx.stroke();
  const hl = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  hl.addColorStop(0, 'rgba(255,255,255,0.55)');
  hl.addColorStop(0.45, 'rgba(255,255,255,0)');
  winPath(ctx, shape, 6.2);
  ctx.strokeStyle = hl;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const sh = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  sh.addColorStop(0.55, rgba(shade(col, -0.7), 0));
  sh.addColorStop(1, rgba(shade(col, -0.7), 0.6));
  winPath(ctx, shape, 2.6);
  ctx.strokeStyle = sh;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  winPath(ctx, shape, 0.4);
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // the glass's own lit edge just inside the bezel: bright on the bottom right (catching the light through it), faint
  // on the top left
  ctx.save();
  winPath(ctx, shape);
  ctx.clip();
  const ge = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  ge.addColorStop(0, 'rgba(255,255,255,0.12)');
  ge.addColorStop(0.55, 'rgba(255,255,255,0.08)');
  ge.addColorStop(1, 'rgba(255,255,255,0.42)');
  winPath(ctx, shape, -1.4);
  ctx.strokeStyle = ge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  if (look.studs) bandStuds(ctx, look);
  // (no flat gloss over the window: the glass has its own)
  plainHeadOver(ctx, { ...look, studs: undefined }, false);
}

let probe: Ctx | null = null;
const studCache = new Map<PeelShape, [number, number][]>();

/** Where the studs sit round the head's band (peel units), set in from its own edge. */
export function studSpots(shape: PeelShape): [number, number][] {
  let out = studCache.get(shape);
  if (out) return out;
  probe ??= makeCanvas(1, 1)[1];
  const p = probe;
  const n = 12;
  out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 0.75 + (i / (n - 1)) * Math.PI * 1.5;
    let lo = 0;
    let hi = R * 1.3;
    for (let k = 0; k < 14; k++) {
      const m = (lo + hi) / 2;
      headPath(p, shape);
      if (p.isPointInPath(HX + Math.cos(a) * m, HY + Math.sin(a) * m)) lo = m;
      else hi = m;
    }
    const inset = shape === 'square' ? 8.5 : 10;
    out.push([HX + Math.cos(a) * (lo - inset), HY + Math.sin(a) * (lo - inset)]);
  }
  studCache.set(shape, out);
  return out;
}

/** Studs round the head's band, set in from its own edge (on a circle they'd sit on the bezel or off a narrow head). */
export function bandStuds(ctx: Ctx, look: PeelLook): void {
  for (const [sx, sy] of studSpots(look.shape)) {
    ctx.beginPath();
    ctx.arc(sx + 0.8, sy + 1.2, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(sx - 2, sy - 2, 0.5, sx, sy, 5.5);
    g.addColorStop(0, shade(look.studs!, 0.6));
    g.addColorStop(0.6, look.studs!);
    g.addColorStop(1, shade(look.studs!, -0.35));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx - 1.5, sy - 1.5, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  }
}

/** A place's window at rest (painted on the spot if it isn't ready), or null. */
export function placeStillNow(loc: LocationId, shape: PeelShape): HTMLCanvasElement | null {
  return baseNow(loc, shape)?.still ?? null;
}

/** A place peel's head, whole (the still): the head, the window at rest, the bezel. Drawn over the handle. */
export function paintPlaceHead(ctx: Ctx, look: PeelLook): void {
  const loc = look.place;
  placeUnder(ctx, look);
  const hd = loc ? PLACE_HEADS[loc] : undefined;
  if (hd?.paint) {
    // a painted head at rest
    const st: PlaceState = { t: PLACE_DEFS[loc!]?.stillT ?? 0, sm: 9, hit: () => 0, r: () => 0.5, calm: 1, mem: {}, still: true };
    hd.paint(ctx, st);
    return;
  }
  const p = loc ? baseNow(loc, look.shape) : null;
  if (p) {
    // the window at rest, drawn down to the canvas's own scale
    const m = ctx.getTransform();
    const RR = Math.max(1, Math.hypot(m.a, m.b));
    const box = placeBox(loc!, look.shape);
    ctx.save();
    placePath(ctx, loc!, look.shape);
    ctx.clip();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(downTo(p.still, Math.ceil(box.w * RR), Math.ceil(box.h * RR)), box.x, box.y, box.w, box.h);
    ctx.restore();
  }
  placeOver(ctx, look);
}
