// A silhouette for the style kit: the union of a foot's parts (body, toes, ears, tufts…) painted as ONE shape.
//
// The parts are filled into a mask, everything is painted on a layer that is clipped to that mask at the end,
// and the outline is grown out of the mask (a dilation), so the whole union gets one continuous outline: notches
// where toes part, no seams where parts overlap, and no outline drawn over the top where the leg covers it.

import { type Ctx, mix, rgba, shade } from '../util';
import { type Box, type FormOpts, type PathFn, LIGHT, STYLE, pxPerUnit, trace } from './kit';

function layerLike(ctx: Ctx): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = ctx.canvas.width;
  c.height = ctx.canvas.height;
  const l = c.getContext('2d')!;
  l.setTransform(ctx.getTransform());
  l.lineJoin = 'round';
  l.lineCap = 'round';
  return [c, l];
}

export class Sil {
  readonly k: number;
  /** The paint layer (design space, same transform as the target). Paint anything here; it's clipped at the end. */
  readonly g: Ctx;
  private readonly paintC: HTMLCanvasElement;
  readonly mask: HTMLCanvasElement;
  private outside: HTMLCanvasElement | null = null;

  constructor(private readonly ctx: Ctx, readonly parts: PathFn[], readonly box: Box) {
    this.k = pxPerUnit(ctx);
    const [m, mx] = layerLike(ctx);
    mx.fillStyle = '#fff';
    for (const p of parts) {
      trace(mx, p);
      mx.fill();
    }
    this.mask = m;
    [this.paintC, this.g] = layerLike(ctx);
  }

  /** Fill every part (in one go, as a union) on the paint layer. */
  fillParts(fill: string | CanvasGradient | CanvasPattern): void {
    const g = this.g;
    g.fillStyle = fill;
    for (const p of this.parts) {
      trace(g, p);
      g.fill();
    }
  }

  /** The area outside the silhouette (device space), made once. */
  private out(): HTMLCanvasElement {
    if (this.outside) return this.outside;
    const c = document.createElement('canvas');
    c.width = this.mask.width;
    c.height = this.mask.height;
    const x = c.getContext('2d')!;
    x.fillStyle = '#000';
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-out';
    x.drawImage(this.mask, 0, 0);
    this.outside = c;
    return c;
  }

  /**
   * Inner shadow (or glow) along the inside of the whole silhouette: the outside casts a blurred shadow offset by
   * (dx, dy) design units. Offset towards the light it shades the far edges; a light colour offset away from the
   * light bevels the near edges.
   */
  edge(col: string, blur: number, dx: number, dy: number, op: GlobalCompositeOperation = 'source-over'): void {
    const k = this.k;
    const c = document.createElement('canvas');
    c.width = this.mask.width;
    c.height = this.mask.height;
    const x = c.getContext('2d')!;
    x.shadowColor = col;
    x.shadowBlur = blur * k;
    x.shadowOffsetX = dx * k;
    x.shadowOffsetY = dy * k;
    x.drawImage(this.out(), 0, 0);
    x.shadowColor = 'transparent';
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(this.mask, 0, 0);
    const g = this.g;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = op;
    g.drawImage(c, 0, 0);
    g.restore();
  }

  /** Light the base fill with the one light: a ramp along the light, form shadow, bevel and rim. */
  form(o: FormOpts): void {
    const tint = o.shadowTint ?? '#2c2448';
    const ramp = o.ramp ?? 0.5;
    const [lx, ly] = LIGHT.dir;
    const b = this.box;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const r = Math.max(b.w, b.h) / 2;
    const gr = this.g.createLinearGradient(cx + lx * r, cy + ly * r, cx - lx * r, cy - ly * r);
    gr.addColorStop(0, shade(o.base, 0.22 * ramp));
    gr.addColorStop(0.45, o.base);
    gr.addColorStop(1, mix(shade(o.base, -0.42 * ramp), tint, 0.25 * ramp));
    this.fillParts(gr);
    const fs = o.formSize ?? Math.min(b.w, b.h) * 0.16;
    const form = o.form ?? 0.55;
    if (form > 0) this.edge(rgba(mix(shade(o.base, -0.75), tint, 0.4), form), fs, lx * fs * 0.55, ly * fs * 0.55);
    const bevel = o.bevel ?? 0.35;
    if (bevel > 0) this.edge(rgba(LIGHT.key, bevel), fs * 0.45, -lx * fs * 0.22, -ly * fs * 0.22);
    const rim = o.rim ?? 0.45;
    if (rim > 0) this.edge(rgba(LIGHT.rim, rim), 2.2, lx * 2.4, ly * 2.4);
  }

  /**
   * Put it all on the target: the outline grown out of the mask (w design units, in `col`), then the paint layer
   * clipped to the silhouette. Nothing is outlined above `openTop` (where the leg covers the foot).
   */
  finish(col: string, o: { w?: number; openTop?: number; inner?: number } = {}): void {
    const k = this.k;
    const w = (o.w ?? STYLE.outline) * 0.62 * k;
    const ctx = this.ctx;
    // outline: the mask stamped round a circle, flooded with the ink colour
    const c = document.createElement('canvas');
    c.width = this.mask.width;
    c.height = this.mask.height;
    const x = c.getContext('2d')!;
    const n = 24;
    for (const rr of [w, w * 0.55]) for (let i = 0; i < n; i++) x.drawImage(this.mask, Math.cos((i / n) * Math.PI * 2) * rr, Math.sin((i / n) * Math.PI * 2) * rr);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = col;
    x.fillRect(0, 0, c.width, c.height);
    if (o.openTop !== undefined) {
      x.globalCompositeOperation = 'destination-out';
      x.setTransform(ctx.getTransform());
      x.fillRect(-4000, -4000, 8000, 4000 + o.openTop);
    }
    // a thin dark contact line just inside the edge, so the outline sits on the form rather than beside it
    this.edge(rgba(col, o.inner ?? 0.55), 1.2 * (o.w ?? STYLE.outline) * 0.25, 0, 0);
    const g = this.g;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(this.mask, 0, 0);
    g.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, 0, 0);
    ctx.drawImage(this.paintC, 0, 0);
    ctx.restore();
  }
}

/**
 * Shade one rounded lobe inside a silhouette (a toe, a knuckle, a pad): its own form shadow on the far edge and a
 * soft light on the near side, kept inside `clip` (design box) and faded out above `fadeFrom`…`fadeTo` (design y)
 * so it melts into the body it grows from. Draws on `g` (a Sil's paint layer).
 */
export function lobe(g: Ctx, path: PathFn, clip: Box, fadeFrom: number, fadeTo: number, dark: string, darkA: number, size: number, lightA: number): void {
  const k = pxPerUnit(g);
  const c = document.createElement('canvas');
  c.width = g.canvas.width;
  c.height = g.canvas.height;
  const x = c.getContext('2d')!;
  x.setTransform(g.getTransform());
  const [lx, ly] = LIGHT.dir;
  // the lobe's inside edge, shaded from the outside of its path
  x.save();
  trace(x, path);
  x.clip();
  x.shadowColor = rgba(dark, darkA);
  x.shadowBlur = size * k;
  x.shadowOffsetX = lx * size * 0.6 * k;
  x.shadowOffsetY = ly * size * 0.6 * k;
  trace(x, path);
  x.rect(-3000, -3000, 6000, 6000);
  x.fillStyle = '#000';
  x.fill('evenodd');
  x.shadowColor = rgba(LIGHT.key, lightA);
  x.shadowOffsetX = -lx * size * 0.35 * k;
  x.shadowOffsetY = -ly * size * 0.35 * k;
  x.shadowBlur = size * 1.2 * k;
  trace(x, path);
  x.rect(-3000, -3000, 6000, 6000);
  x.fill('evenodd');
  x.restore();
  // keep it in its column and fade it out towards the root
  x.globalCompositeOperation = 'destination-in';
  const f = x.createLinearGradient(0, fadeFrom, 0, fadeTo);
  f.addColorStop(0, 'rgba(0,0,0,0)');
  f.addColorStop(1, 'rgba(0,0,0,1)');
  x.fillStyle = f;
  x.fillRect(-3000, -3000, 6000, 6000);
  x.globalCompositeOperation = 'destination-in';
  x.fillStyle = '#000';
  x.fillRect(clip.x, clip.y, clip.w, clip.h);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(c, 0, 0);
  g.restore();
}
