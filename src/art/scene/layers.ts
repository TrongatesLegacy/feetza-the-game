// A location as a stack of named layers, painted far to near. The still (Animated stages off, and every peel or
// portrait that shows the place) is every layer painted in order. With the live layer running, the layers that
// move are left out of the painted base and baked to their own textures, in the right place in the stack, for the
// live code to sway, drift or flicker (src/game/sceneLive.ts). Every layer has its own random stream, so a layer
// paints the same alone as in the still.

import type { BackdropId, BackdropInfo } from '../backdrops';
import { type Ctx, hashStr, makeCanvas, rng } from '../util';
import type { Box } from './kit';
import { H, W } from './kit';

export interface SceneLayer {
  id: string;
  /** Where it paints (screen px). Leave it out for the whole screen. It must hold everything the layer paints
   * (shadows and glows too): with the live layer running, a layer baked to its own texture is cut to its box. */
  box?: Box;
  /**
   * How it moves when the live layer runs:
   * - 'sprite': baked to its own texture, which the live code moves (a palm crown, a curtain, the far sea);
   * - 'slot': not painted at all; the live code puts its own objects here, at this point in the stack (a ferry on a
   *   river that passes behind columns). Its box is where those objects go: every still layer after it that
   *   overlaps the box has to be baked into an overlay over it, so keep slots tight.
   * - 'top': not painted at all; the live code's objects go over the whole stack (flames, glows, sparkles and
   *   birds that nothing stands in front of). It costs nothing: prefer it to a slot.
   * Leave it out for a still layer.
   */
  motion?: 'sprite' | 'slot' | 'top';
  /** Painted only when live (a night sky the live code fades in over the day one). */
  liveOnly?: boolean;
  /** A moving or live-only layer that is soft all over (a sky, a haze) can be baked smaller and shown stretched:
   * 0.5 bakes it at half size, a quarter of the memory. */
  res?: number;
  /** Painted only in the still (painted flames the live code replaces with moving ones: use a 'slot' for those). */
  stillOnly?: boolean;
  draw(ctx: Ctx, r: () => number): void;
}

export interface SceneSpec {
  id: BackdropId;
  info: Omit<BackdropInfo, 'id'>;
  layers: SceneLayer[];
  /** The colour grade over everything: pixel-local (each baked layer gets it too). */
  grade?(ctx: Ctx): void;
  /** Darkening over everything, painted with plain alpha (the vignette, calm behind the lanes, shade under the HUD):
   * smooth, so the live layer lays it over its stack as one small stretched texture. */
  shade?(ctx: Ctx): void;
}

const FULL: Box = { x: 0, y: 0, w: W, h: H };
const boxOf = (l: SceneLayer): Box => l.box ?? FULL;
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/** A layer's own random stream. */
export const layerRng = (spec: SceneSpec, l: SceneLayer) => rng(hashStr(`scene:${spec.id}:${l.id}`));

function paintLayer(ctx: Ctx, spec: SceneSpec, l: SceneLayer): void {
  ctx.save();
  l.draw(ctx, layerRng(spec, l));
  ctx.restore();
}

function run(ctx: Ctx, fn?: (ctx: Ctx) => void): void {
  if (!fn) return;
  ctx.save();
  fn(ctx);
  ctx.restore();
}

/** The still: every layer in order, then the grade and the shade. */
export function paintStill(spec: SceneSpec, ctx: Ctx): void {
  for (const l of spec.layers) if (!l.liveOnly) paintLayer(ctx, spec, l);
  run(ctx, spec.grade);
  run(ctx, spec.shade);
}

/** The shade alone, on a small transparent canvas (1/k of the screen) for the live layer to stretch over its stack. */
export function paintShade(spec: SceneSpec, k = 4): HTMLCanvasElement | null {
  if (!spec.shade) return null;
  const [c, ctx] = makeCanvas(W / k, H / k);
  ctx.scale(1 / k, 1 / k);
  run(ctx, spec.shade);
  return c;
}

/** One piece of the live stack, bottom to top. */
export type LivePiece =
  | { kind: 'overlay'; layers: SceneLayer[]; box: Box }
  | { kind: 'sprite'; layer: SceneLayer; box: Box }
  | { kind: 'slot'; layer: SceneLayer; box: Box };

/** The live plan: the layers painted into the base, and the pieces stacked over it. A still layer goes into the base
 * unless it overlaps a piece already over the base (then it has to draw over that piece: an overlay). */
export function planLive(spec: SceneSpec): { base: SceneLayer[]; pieces: LivePiece[]; tops: SceneLayer[] } {
  const base: SceneLayer[] = [];
  const pieces: LivePiece[] = [];
  const tops: SceneLayer[] = [];
  for (const l of spec.layers) {
    if (l.stillOnly) continue;
    if (l.motion === 'top') {
      tops.push(l);
      continue;
    }
    const b = boxOf(l);
    if (l.motion === 'sprite' || l.motion === 'slot') {
      pieces.push({ kind: l.motion, layer: l, box: b } as LivePiece);
      continue;
    }
    if (l.liveOnly) {
      // a live-only still layer is a sprite the live code shows or hides
      pieces.push({ kind: 'sprite', layer: l, box: b });
      continue;
    }
    if (!pieces.some((p) => overlaps(p.box, b))) {
      base.push(l);
      continue;
    }
    // (an overlay right before it takes it in when they overlap: one texture; otherwise it gets its own, so boxes
    // stay tight and later layers aren't pulled in by a box that grew round two things far apart)
    const last = pieces[pieces.length - 1];
    const area = (x: Box) => x.w * x.h;
    if (last.kind === 'overlay' && overlaps(last.box, b) && area(union(last.box, b)) <= (area(last.box) + area(b)) * 1.25) {
      last.layers.push(l);
      last.box = union(last.box, b);
    } else pieces.push({ kind: 'overlay', layers: [l], box: b });
  }
  return { base, pieces, tops };
}

/** Run the grade over a baked piece (pixel-local: see gradeAll). */
function gradePiece(spec: SceneSpec, ctx: Ctx, box: Box, res = 1): void {
  if (!spec.grade) return;
  ctx.save();
  ctx.scale(res, res);
  ctx.translate(-box.x, -box.y);
  spec.grade(ctx);
  ctx.restore();
}

/** The live base: the still layers that stay put, graded (the shade goes over the whole stack). */
export function paintLiveBase(spec: SceneSpec, base: SceneLayer[]): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  for (const l of base) paintLayer(ctx, spec, l);
  run(ctx, spec.grade);
  return c;
}

/** A piece baked to its own canvas (its box's size; graded). */
export function bakePiece(spec: SceneSpec, p: LivePiece): HTMLCanvasElement {
  const b = p.box;
  const res = p.kind === 'overlay' ? 1 : (p.layer.res ?? 1);
  const [c, ctx] = makeCanvas(b.w * res, b.h * res);
  ctx.scale(res, res);
  ctx.translate(-b.x, -b.y);
  for (const l of p.kind === 'overlay' ? p.layers : [p.layer]) paintLayer(ctx, spec, l);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  gradePiece(spec, ctx, b, res);
  return c;
}

/** One layer painted alone on a canvas of its box (for a live layer that wants an extra copy, e.g. a reflection). */
export function bakeLayer(spec: SceneSpec, id: string): { canvas: HTMLCanvasElement; box: Box } {
  const l = spec.layers.find((x) => x.id === id);
  if (!l) throw new Error(`scene ${spec.id}: no layer ${id}`);
  const b = boxOf(l);
  return { canvas: bakePiece(spec, { kind: 'sprite', layer: l, box: b }), box: b };
}

// ——— a window onto the place (the place peels: src/art/peelPlace.ts) ———

const specs = new Map<BackdropId, SceneSpec>();
/** Keep a kit scene's spec (registerKitScene does), for what paints a corner of it elsewhere. */
export function keepSpec(spec: SceneSpec): void {
  specs.set(spec.id, spec);
}
export const kitSpec = (id: BackdropId): SceneSpec | undefined => specs.get(id);

/**
 * A box of a scene (`crop`, screen px) as its still shows it, painted onto a canvas `px` wide, a layer per step (a
 * generator, for idle time): the layers that overlap it (only those in `only`, if given), less any in `skip` (what
 * the caller animates itself) and the live-only, slot and top layers; then the grade. Nothing outside the box is
 * kept. `clear`: on a transparent canvas (layers to lay over something), not black.
 */
export function* paintCropSteps(spec: SceneSpec, crop: Box, px: number, o: { skip?: ReadonlySet<string>; only?: ReadonlySet<string>; clear?: boolean } = {}): Generator<void, HTMLCanvasElement> {
  const k = px / crop.w;
  const [c, ctx] = makeCanvas(px, crop.h * k);
  if (!o.clear) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
  }
  for (const l of spec.layers) {
    if (l.liveOnly || l.motion === 'slot' || l.motion === 'top' || o.skip?.has(l.id) || (o.only && !o.only.has(l.id))) continue;
    if (!overlaps(boxOf(l), crop)) continue;
    ctx.save();
    ctx.setTransform(k, 0, 0, k, -crop.x * k, -crop.y * k);
    ctx.beginPath();
    ctx.rect(crop.x, crop.y, crop.w, crop.h);
    ctx.clip();
    paintLayer(ctx, spec, l);
    ctx.restore();
    yield;
  }
  if (spec.grade) {
    ctx.save();
    ctx.setTransform(k, 0, 0, k, -crop.x * k, -crop.y * k);
    spec.grade(ctx);
    ctx.restore();
  }
  return c;
}
