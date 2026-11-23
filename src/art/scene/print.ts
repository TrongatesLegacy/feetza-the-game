// Comic print: the location kit's finish for places drawn as a pulp-comic page (Act 7: Metropizza and the rest).
// Bold ink outlines that carry their weight on the shadow side, flat colour fields modelled with halftone dots
// (a dot screen whose dots grow with the shade, at the screen angles of a printed page), Ben-Day tints, ink hatching
// in the deepest shade, speed lines and comic lightning. Everything is screen space and seeded like the rest of the kit.

import { FALL, type Box, type Ctx, type PathFn, type R } from './kit';
import { rgba } from '../util';

/** The tone of the shade at a point: 0 none … 1 full (the dots touch). */
export type Tone = (x: number, y: number) => number;

export interface DotOpts {
  /** Distance between dot centres (px). */
  step?: number;
  /** Screen angle (radians): 0.26 (15°) for the cyan plate, 1.31 (75°) magenta, 0.79 (45°) black, 0 yellow. */
  angle?: number;
  /** Opacity of the ink. */
  a?: number;
  /** Largest dot radius as a share of the step (0.5 just touches; a little over fills the gaps). */
  max?: number;
  /** Tones under this print nothing (a clean paper white between the dots). */
  floor?: number;
}

/**
 * A halftone dot screen over a box: each dot's area follows the tone at its centre, so a smooth shade prints as dots
 * that grow from specks to a solid. One colour, one path, one fill.
 */
export function dots(ctx: Ctx, box: Box, tone: Tone, col: string, o: DotOpts = {}): void {
  const step = o.step ?? 9;
  const ang = o.angle ?? 0.26;
  const max = (o.max ?? 0.62) * step;
  const floor = o.floor ?? 0.03;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  // the box's corners in the screen's rotated frame, to cover it
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const rad = Math.hypot(box.w, box.h) / 2 + step;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.fillStyle = rgba(col, o.a ?? 1);
  ctx.beginPath();
  for (let v = -rad; v <= rad; v += step) {
    for (let u = -rad; u <= rad; u += step) {
      const x = cx + u * ca - v * sa;
      const y = cy + u * sa + v * ca;
      if (x < box.x - step || x > box.x + box.w + step || y < box.y - step || y > box.y + box.h + step) continue;
      const t = tone(x, y);
      if (t <= floor) continue;
      const r = max * Math.sqrt(Math.min(1, t));
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

/** Dots clipped to a shape (the shade of a form). */
export function dotsIn(ctx: Ctx, path: PathFn, box: Box, tone: Tone, col: string, o: DotOpts = {}): void {
  ctx.save();
  path(ctx);
  ctx.clip();
  dots(ctx, box, tone, col, o);
  ctx.restore();
}

/** A tone that runs linearly from t0 at (x0, y0) to t1 at (x1, y1) (and holds beyond). */
export function linTone(x0: number, y0: number, x1: number, y1: number, t0: number, t1: number): Tone {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l2 = dx * dx + dy * dy || 1;
  return (x, y) => {
    const u = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l2));
    return t0 + (t1 - t0) * u;
  };
}

/** A tone that runs from t0 at a centre to t1 at radius r (and holds beyond); sy squashes it vertically. */
export function radTone(cx: number, cy: number, r: number, t0: number, t1: number, sy = 1): Tone {
  return (x, y) => {
    const u = Math.min(1, Math.hypot(x - cx, (y - cy) / sy) / r);
    return t0 + (t1 - t0) * u;
  };
}

/** A Ben-Day tint: even dots over a box, growing from a0 to a1 (as a share of full) from top to bottom. */
export function benDay(ctx: Ctx, box: Box, col: string, a: number, step: number, t0: number, t1: number, angle = 0.79): void {
  dots(ctx, box, linTone(0, box.y, 0, box.y + box.h, t0, t1), col, { step, a, angle, max: 0.55 });
}

/**
 * The ink line round a shape, with its weight on the shadow side: a line of width w all round, thickened outside the
 * shape along the light's fall (the bottom-right edges), as an inker's brush lays it.
 */
export function ink(ctx: Ctx, path: PathFn, w: number, col: string, weight = 0.6): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  path(ctx);
  ctx.stroke();
  if (weight > 0) {
    // the heavier stroke, outside the shape only
    path(ctx);
    ctx.rect(-4000, -4000, 12000, 12000);
    ctx.clip('evenodd');
    ctx.translate(FALL[0] * w * weight, FALL[1] * w * weight);
    ctx.lineWidth = w * (0.6 + weight * 0.4);
    path(ctx);
    ctx.stroke();
  }
  ctx.restore();
}

/** Fill a shape flat and ink it. */
export function flat(ctx: Ctx, path: PathFn, fill: string | CanvasGradient, w: number, col: string, weight = 0.6): void {
  ctx.save();
  path(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  if (w > 0) ink(ctx, path, w, col, weight);
}

/** Parallel ink hatching clipped to a shape: lines `gap` apart at an angle, each tapering at its ends. */
export function hatch(ctx: Ctx, path: PathFn, box: Box, angle: number, gap: number, w: number, col: string, a = 1, r?: R): void {
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.strokeStyle = rgba(col, a);
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const rad = Math.hypot(box.w, box.h) / 2;
  ctx.beginPath();
  for (let v = -rad; v <= rad; v += gap) {
    const j = r ? (r() - 0.5) * gap * 0.5 : 0;
    const l0 = -rad * (r ? 0.8 + r() * 0.2 : 1);
    const l1 = rad * (r ? 0.8 + r() * 0.2 : 1);
    ctx.moveTo(cx + l0 * ca - (v + j) * sa, cy + l0 * sa + (v + j) * ca);
    ctx.lineTo(cx + l1 * ca - (v + j) * sa, cy + l1 * sa + (v + j) * ca);
  }
  ctx.stroke();
  ctx.restore();
}

/** Comic speed lines: thin tapered wedges radiating from a point between radii r0 and r1. */
export function speedLines(ctx: Ctx, r: R, cx: number, cy: number, r0: number, r1: number, n: number, col: string, a: number, a0 = 0, a1 = Math.PI * 2): void {
  ctx.save();
  ctx.fillStyle = rgba(col, a);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const ang = a0 + ((i + r() * 0.6) / n) * (a1 - a0);
    const w = 0.003 + r() * 0.008;
    const rr0 = r0 * (0.9 + r() * 0.3);
    ctx.moveTo(cx + Math.cos(ang - w) * rr0, cy + Math.sin(ang - w) * rr0);
    ctx.lineTo(cx + Math.cos(ang) * r1 * (0.8 + r() * 0.2), cy + Math.sin(ang) * r1 * (0.8 + r() * 0.2));
    ctx.lineTo(cx + Math.cos(ang + w) * rr0, cy + Math.sin(ang + w) * rr0);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

/** A comic lightning bolt's points: a jagged main stroke from (x0, y0) to (x1, y1), with forks. */
export function boltPath(r: R, x0: number, y0: number, x1: number, y1: number, segs = 9, jag = 0.22): [number, number][][] {
  const main: [number, number][] = [[x0, y0]];
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  for (let i = 1; i < segs; i++) {
    const u = i / segs;
    const off = (r() - 0.5) * 2 * jag * len * (1 / segs) * 2.2;
    main.push([x0 + (x1 - x0) * u + nx * off, y0 + (y1 - y0) * u + ny * off]);
  }
  main.push([x1, y1]);
  const out = [main];
  // forks off the upper two thirds
  for (let i = 2; i < segs - 2; i++) {
    if (r() > 0.45) continue;
    const [fx, fy] = main[i];
    const side = r() < 0.5 ? -1 : 1;
    const fl = len * (0.12 + r() * 0.2);
    const ang = Math.atan2(y1 - y0, x1 - x0) + side * (0.5 + r() * 0.5);
    const fork: [number, number][] = [[fx, fy]];
    const n = 3 + Math.floor(r() * 3);
    for (let k = 1; k <= n; k++) {
      const u = k / n;
      const off = (r() - 0.5) * fl * 0.3;
      fork.push([fx + Math.cos(ang) * fl * u - Math.sin(ang) * off, fy + Math.sin(ang) * fl * u + Math.cos(ang) * off]);
    }
    out.push(fork);
  }
  return out;
}

/** A comic bolt: a flat tapered ribbon along each stroke (white core, coloured body, ink edge). */
export function bolt(ctx: Ctx, strokes: [number, number][][], w: number, body: string, core: string, inkCol: string): void {
  const ribbon = (pts: [number, number][], w0: number) => {
    // a polygon tapering from w0 at the start to a point
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [ax, ay] = pts[Math.max(0, i - 1)];
      const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
      const dx = bx - ax;
      const dy = by - ay;
      const l = Math.hypot(dx, dy) || 1;
      const ww = w0 * (1 - i / (pts.length - 1)) ** 0.8 + 0.6;
      left.push([x - (dy / l) * ww, y + (dx / l) * ww]);
      right.push([x + (dy / l) * ww, y - (dx / l) * ww]);
    }
    return (c: Ctx) => {
      c.beginPath();
      c.moveTo(left[0][0], left[0][1]);
      for (const p of left) c.lineTo(p[0], p[1]);
      for (let i = right.length - 1; i >= 0; i--) c.lineTo(right[i][0], right[i][1]);
      c.closePath();
    };
  };
  strokes.forEach((s, i) => {
    const ww = i === 0 ? w : w * 0.5;
    const p = ribbon(s, ww);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = inkCol;
    ctx.lineWidth = Math.max(2, ww * 0.55);
    p(ctx);
    ctx.stroke();
    ctx.fillStyle = body;
    ctx.fill();
    const q = ribbon(s, ww * 0.45);
    q(ctx);
    ctx.fillStyle = core;
    ctx.fill();
    ctx.restore();
  });
}
