// Shoe-making helpers for the base roster batch: a parametric shoe shape (collar, ball, toe), its sole, and the common
// painting steps (a lit part in a material, a sole with tread, laces up a throat, patent gloss). Used by
// src/content/style/base-shoes.ts and base-gear.ts.

import { CX } from '../../art/feetCommon';
import { LIGHT, type Box, type PathFn, ao, glint, inkOf, spec, texture } from '../../art/style/kit';
import { type Material, type MaterialId, MATERIALS, paint } from '../../art/style/materials';
import { contact, eyelet, laceRun } from '../../art/style/details';
import { type Ctx, mix, rgba, shade } from '../../art/util';
import { LX, LY, clipTo } from './base-kit';

/** A shoe's plan view: the collar at the top, the widest point at the ball, the toe at the bottom. */
export interface ShoeShape {
  top: number;
  topHW: number;
  ballY: number;
  ballHW: number;
  toeY: number;
  /** Half width of the toe's front: small for a pointed toe, large for a round or square one. */
  toeR: number;
  /** How far the toe's sides keep their width before turning in (0…1). */
  box?: number;
}

export function shoePath(s: ShoeShape): PathFn {
  const b = s.box ?? 0.6;
  return (c) => {
    c.beginPath();
    c.moveTo(CX - s.topHW, s.top);
    c.bezierCurveTo(CX - s.topHW - 4, s.top + (s.ballY - s.top) * 0.4, CX - s.ballHW, s.ballY - (s.ballY - s.top) * 0.35, CX - s.ballHW, s.ballY);
    c.bezierCurveTo(CX - s.ballHW, s.ballY + (s.toeY - s.ballY) * b, CX - s.toeR, s.toeY, CX, s.toeY);
    c.bezierCurveTo(CX + s.toeR, s.toeY, CX + s.ballHW + 2, s.ballY + (s.toeY - s.ballY) * b, CX + s.ballHW + 2, s.ballY);
    c.bezierCurveTo(CX + s.ballHW + 2, s.ballY - (s.ballY - s.top) * 0.35, CX + s.topHW + 4, s.top + (s.ballY - s.top) * 0.4, CX + s.topHW, s.top);
    c.closePath();
  };
}

/** The sole round a shoe's front: `grow` wider, `drop` deeper at the toe, from `from` (design y) down. */
export function soleOf(s: ShoeShape, grow: number, drop: number, from = s.ballY - 40): ShoeShape {
  return { top: from, topHW: s.ballHW + grow - 8, ballY: s.ballY + 6, ballHW: s.ballHW + grow, toeY: s.toeY + drop, toeR: s.toeR + grow, box: s.box };
}

export function shapeBox(s: ShoeShape, pad = 12): Box {
  return { x: CX - s.ballHW - pad, y: s.top - pad, w: s.ballHW * 2 + pad * 2, h: s.toeY - s.top + pad * 2 };
}

/** Paint a part in a material, lit by the one light (clipped to the part). */
export function part(g: Ctx, path: PathFn, box: Box, mat: Material | MaterialId, base: string, o: { spec?: boolean; texA?: number } = {}): void {
  paint(g, path, box, mat, base, o);
}

/** A sole: its side face (dark at the bottom), tread notches along the ground edge and a lit welt line at the top. */
export function paintSole(g: Ctx, path: PathFn, box: Box, col: string, o: { tread?: boolean; welt?: string; tex?: 'rubber' | 'leather' | 'wood' } = {}): void {
  clipTo(g, path, () => {
    const sg = g.createLinearGradient(0, box.y, 0, box.y + box.h);
    sg.addColorStop(0, shade(col, 0.2));
    sg.addColorStop(0.6, col);
    sg.addColorStop(1, mix(shade(col, -0.5), '#14102a', 0.3));
    g.fillStyle = sg;
    g.fillRect(box.x - 10, box.y - 10, box.w + 20, box.h + 20);
    texture(g, o.tex ?? 'rubber', box, 0.4, 1.1);
    if (o.tread) {
      g.fillStyle = rgba('#000000', 0.3);
      for (let x = box.x; x < box.x + box.w; x += 9) g.fillRect(x, box.y + box.h - 9, 4, 9);
    }
    // the sole's side catches the light along its top edge
    const hl = g.createLinearGradient(box.x, 0, box.x + box.w, 0);
    hl.addColorStop(0, rgba(LIGHT.key, 0.35));
    hl.addColorStop(0.5, rgba(LIGHT.key, 0.1));
    hl.addColorStop(1, rgba(LIGHT.rim, 0.25));
    g.fillStyle = hl;
    g.fillRect(box.x, box.y + box.h * 0.35, box.w, 3);
  });
  if (o.welt) {
    g.save();
    g.setLineDash([3, 3]);
    g.strokeStyle = o.welt;
    g.lineWidth = 1.3;
    path(g);
    g.stroke();
    g.restore();
  }
}

/** A part sitting on top of the rest: its contact shadow, then the part painted in a material. */
export function raised(g: Ctx, path: PathFn, box: Box, mat: Material | MaterialId, base: string, shadow = 0.45, o: { spec?: boolean; texA?: number } = {}): void {
  contact(g, (c) => {
    path(c);
    c.fill();
  }, shadow, 2.6, 3.4);
  paint(g, path, box, mat, base, o);
}

/** Patent leather's mirror gloss: a long window reflection and a hard glint, along a direction. */
export function patent(g: Ctx, x: number, y: number, len: number, w: number, ang: number, a = 0.85): void {
  spec(g, x, y, len, w, a, ang, '#ffffff');
  spec(g, x + Math.cos(ang) * len * 0.1, y + Math.sin(ang) * len * 0.1, len * 0.55, w * 0.4, 1, ang, '#ffffff');
  glint(g, x - Math.cos(ang) * len * 0.35, y - Math.sin(ang) * len * 0.35, w * 1.1, 0.9);
}

/** Laces up a throat: pairs of eyelets from (y0, hw0) to (y1, hw1), criss-crossed laces. */
export function lacing(g: Ctx, n: number, y0: number, hw0: number, y1: number, hw1: number, lace: string, metal = '#d9dde3', w = 5): [number, number][] {
  const rows: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const u = i / Math.max(1, n - 1);
    rows.push([y0 + (y1 - y0) * u, hw0 + (hw1 - hw0) * u]);
  }
  for (const [y, hw] of rows) for (const s of [-1, 1]) eyelet(g, CX + s * hw, y, 4);
  for (let i = rows.length - 1; i > 0; i--) {
    const [ya, wa] = rows[i];
    const [yb, wb] = rows[i - 1];
    laceRun(g, CX - wa, ya, CX + wb, yb, lace, w);
    laceRun(g, CX + wa, ya, CX - wb, yb, lace, w);
  }
  void metal;
  return rows;
}

/** A lace bow at (x, y) with two loops. */
export function bow(g: Ctx, x: number, y: number, lace: string, s = 1): void {
  for (const side of [-1, 1]) {
    const loop = (c: Ctx) => {
      c.beginPath();
      c.ellipse(x + side * 13 * s, y, 13 * s, 6.5 * s, side * -0.35, 0, Math.PI * 2);
    };
    contact(g, (c) => {
      loop(c);
      c.lineWidth = 5 * s;
      c.stroke();
    }, 0.4);
    g.strokeStyle = mix(shade(lace, -0.45), '#3a3040', 0.3);
    g.lineWidth = 6 * s;
    loop(g);
    g.stroke();
    g.strokeStyle = lace;
    g.lineWidth = 4.4 * s;
    g.stroke();
  }
  g.fillStyle = lace;
  g.beginPath();
  g.ellipse(x, y + 1, 5 * s, 4.5 * s, 0, 0, Math.PI * 2);
  g.fill();
  ao(g, x + 2, y + 4, 5 * s, 3 * s, 0.35);
}

/** The finishing light over a whole shoe and its one outline. */
export function finishShoe(sil: { edge(col: string, blur: number, dx: number, dy: number): void; finish(col: string, o?: { w?: number; openTop?: number; inner?: number }): void }, base: string, o: { openTop?: number; deep?: string; form?: number } = {}): void {
  sil.edge(rgba(o.deep ?? mix(shade(base, -0.7), '#1a1030', 0.4), o.form ?? 0.38), 18, LX * 10, LY * 10);
  sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
  sil.finish(inkOf(base), { openTop: o.openTop ?? -6 });
}

/** A tube along a centre line with a width at each point (curled toes, pegs, tails), closed into one path. */
export function tubePath(pts: [number, number][], widths: number[]): PathFn {
  return (c) => {
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    pts.forEach(([x, y], i) => {
      const [px, py] = pts[Math.max(0, i - 1)];
      const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
      const dx = nx - px;
      const dy = ny - py;
      const d = Math.hypot(dx, dy) || 1;
      const w = widths[i];
      left.push([x - (dy / d) * w, y + (dx / d) * w]);
      right.push([x + (dy / d) * w, y - (dx / d) * w]);
    });
    c.beginPath();
    left.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    const [ex, ey] = pts[pts.length - 1];
    const wl = widths[widths.length - 1];
    const [lx, ly] = left[left.length - 1];
    c.arc(ex, ey, wl, Math.atan2(ly - ey, lx - ex), Math.atan2(ly - ey, lx - ex) + Math.PI, true);
    for (let i = right.length - 1; i >= 0; i--) c.lineTo(right[i][0], right[i][1]);
    c.closePath();
  };
}

/** Points on a cubic bezier. */
export function bez(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], n = 20): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}

export { MATERIALS };
