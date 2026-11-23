// Helpers for batch F (Gotham, comics, heroes, Kratos, Leonidas and the Persians: src/content/style/acts-f*.ts).
// Nothing here registers a foot. Built on the shared kit (src/art/style) and the other batches' content kits.

import { CX } from '../../art/feetCommon';
import { LIGHT, type Box, type PathFn, glint, inkOf, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { contact } from '../../art/style/details';
import { type Ctx, mix, rgba, shade } from '../../art/util';

export { CX };
export const [LX, LY] = LIGHT.dir;

export type Pt = [number, number];
export type Opts = { live: boolean; emissive?: boolean; heat?: boolean };

/** A smooth closed (or open) path through points (Catmull-Rom as béziers). `t` is the tension (0.5 natural). */
export function smooth(pts: Pt[], closed = true, t = 0.5): PathFn {
  return (c) => {
    c.beginPath();
    smoothTo(c, pts, closed, t, true);
    if (closed) c.closePath();
  };
}

/** Add a smooth curve through points to the current path (moveTo first when `move`). */
export function smoothTo(c: Ctx, pts: Pt[], closed: boolean, t = 0.5, move = false): void {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  if (move) c.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = t / 3;
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
}

/** Mirror points about CX (a symmetric silhouette from its left half, top to bottom). */
export function mirror(left: Pt[]): Pt[] {
  return [...left, ...left.slice().reverse().map(([x, y]) => [2 * CX - x, y] as Pt)];
}

/** A fill with its own contact shadow under it (a detail raised off the surface). */
export function lifted(g: Ctx, path: PathFn, f: string | CanvasGradient, a = 0.45, d = 2.4, blur = 3): void {
  contact(g, (c) => {
    path(c);
    c.fill();
  }, a, d, blur);
  path(g);
  g.fillStyle = f;
  g.fill();
}

/** A polished metal ramp along a direction (gold, bronze, chrome): bright band, dark core, bright reflection. */
export function metalGrad(g: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, k = 1): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, shade(col, -0.25 * k));
  gr.addColorStop(0.18, mix(shade(col, 0.55 * k), '#fffbe8', 0.25 * k));
  gr.addColorStop(0.36, col);
  gr.addColorStop(0.58, shade(col, -0.5 * k));
  gr.addColorStop(0.78, shade(col, 0.12 * k));
  gr.addColorStop(1, shade(col, -0.6 * k));
  return gr;
}

/** A metal piece (band, plate, ring): contact shadow, a metal ramp across `box`, brushed texture, edge lights. */
export function metal(g: Ctx, path: PathFn, box: Box, col: string, o: { vertical?: boolean; shadow?: number; tex?: number; glints?: boolean } = {}): void {
  if ((o.shadow ?? 0.5) > 0) contact(g, (c) => { path(c); c.fill(); }, o.shadow ?? 0.5, 2.4, 3);
  g.save();
  path(g);
  g.clip();
  g.fillStyle = o.vertical ? metalGrad(g, 0, box.y, 0, box.y + box.h, col) : metalGrad(g, box.x, box.y, box.x + box.w * 0.6, box.y + box.h * 1.2, col);
  g.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
  texture(g, 'brushed', box, o.tex ?? 0.14);
  g.restore();
  // a crisp lit lip on the upper-left edge, a dark lip on the lower right
  g.save();
  path(g);
  g.clip();
  g.lineWidth = 2.2;
  g.strokeStyle = rgba('#000000', 0.35);
  g.translate(LX * 1.2, LY * 1.2);
  path(g);
  g.stroke();
  g.restore();
  g.save();
  path(g);
  g.clip();
  g.lineWidth = 1.6;
  g.strokeStyle = rgba(mix(col, '#ffffff', 0.7), 0.7);
  g.translate(-LX * 1.1, -LY * 1.1);
  path(g);
  g.stroke();
  g.restore();
  g.save();
  g.lineJoin = 'round';
  path(g);
  g.strokeStyle = rgba(shade(col, -0.7), 0.85);
  g.lineWidth = 1.3;
  g.stroke();
  g.restore();
  if (o.glints !== false) glint(g, box.x + box.w * 0.28, box.y + box.h * 0.3, Math.min(6, Math.max(2.5, Math.min(box.w, box.h) * 0.35)), 0.85);
}

/** A cut gem: a dark rim, lit facets, a hot core and a glint. */
export function gem(g: Ctx, x: number, y: number, r: number, col: string, shape: 'round' | 'diamond' = 'round'): void {
  const path: PathFn = (c) => {
    c.beginPath();
    if (shape === 'round') c.arc(x, y, r, 0, Math.PI * 2);
    else {
      c.moveTo(x, y - r * 1.25);
      c.lineTo(x + r, y);
      c.lineTo(x, y + r * 1.25);
      c.lineTo(x - r, y);
      c.closePath();
    }
  };
  contact(g, (c) => { path(c); c.fill(); }, 0.55, r * 0.25, r * 0.4);
  const gr = g.createRadialGradient(x + LX * r * 0.3, y + LY * r * 0.3, r * 0.05, x, y, r * 1.2);
  gr.addColorStop(0, mix(col, '#ffffff', 0.55));
  gr.addColorStop(0.35, col);
  gr.addColorStop(0.8, shade(col, -0.55));
  gr.addColorStop(1, shade(col, -0.75));
  path(g);
  g.fillStyle = gr;
  g.fill();
  // facets: a star of light and dark wedges
  g.save();
  path(g);
  g.clip();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.fillStyle = rgba(i % 2 ? '#000000' : '#ffffff', i % 2 ? 0.16 : 0.12);
    g.beginPath();
    g.moveTo(x, y);
    g.arc(x, y, r * 1.4, a, a + Math.PI / 4);
    g.closePath();
    g.fill();
  }
  g.restore();
  spec(g, x - r * 0.3, y - r * 0.35, r * 0.5, r * 0.3, 0.9, -0.6);
  glint(g, x - r * 0.32, y - r * 0.38, r * 0.42, 1);
}

/** A pearl: soft milky ball with a pink-blue lustre and a small sharp highlight. */
export function pearl(g: Ctx, x: number, y: number, r: number, col = '#fff4e8'): void {
  contact(g, (c) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }, 0.45, r * 0.35, r * 0.5);
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.5, col);
  gr.addColorStop(0.85, mix(col, '#a89cc8', 0.45));
  gr.addColorStop(1, mix(col, '#6a5a70', 0.6));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = rgba('#ffd8e8', 0.25);
  g.beginPath();
  g.arc(x + r * 0.3, y + r * 0.3, r * 0.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = rgba('#ffffff', 0.95);
  g.beginPath();
  g.ellipse(x - r * 0.35, y - r * 0.38, r * 0.26, r * 0.17, -0.6, 0, Math.PI * 2);
  g.fill();
}

/** Chain links along a polyline (alternating face-on rings and edge-on bars), in `col` metal. */
export function chain(g: Ctx, pts: Pt[], r: number, col: string): void {
  // resample at link spacing
  const out: Pt[] = [];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0);
    let d = carry;
    while (d <= L) {
      out.push([x0 + ((x1 - x0) * d) / L, y0 + ((y1 - y0) * d) / L]);
      d += r * 1.55;
    }
    carry = d - L;
  }
  out.forEach(([x, y], i) => {
    const [nx, ny] = out[Math.min(out.length - 1, i + 1)];
    const [px, py] = out[Math.max(0, i - 1)];
    const a = Math.atan2(ny - py, nx - px);
    g.save();
    g.translate(x, y);
    g.rotate(a);
    const face = i % 2 === 0;
    const rx = r;
    const ry = face ? r * 0.62 : r * 0.22;
    contact(g, (c) => { c.beginPath(); c.ellipse(0, 0, rx, ry + 1, 0, 0, Math.PI * 2); c.fill(); }, 0.5, 1.6, 2);
    g.lineWidth = face ? r * 0.34 : r * 0.4;
    g.strokeStyle = shade(col, -0.65);
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = face ? r * 0.22 : r * 0.26;
    g.strokeStyle = metalGrad(g, -rx, -ry - 2, rx, ry + 2, col);
    g.stroke();
    g.restore();
    if (face) glint(g, x - r * 0.35, y - r * 0.3, r * 0.32, 0.7);
  });
}

/** A hanging chain as a sampled catenary-ish sag from a to b. */
export function sag(ax: number, ay: number, bx: number, by: number, drop: number, n = 16): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([ax + (bx - ax) * t, ay + (by - ay) * t + Math.sin(t * Math.PI) * drop]);
  }
  return pts;
}

/** A detail with its own small silhouette, outline and light, drawn straight onto g (a part's sprite, a prop). */
export function partSil(g: Ctx, parts: PathFn[], box: Box, paint: (pg: Ctx, s: Sil) => void, ink: string, o: { w?: number; rim?: number; form?: number } = {}): void {
  const s = new Sil(g, parts, box);
  paint(s.g, s);
  if ((o.form ?? 0.3) > 0) s.edge(rgba('#06060e', o.form ?? 0.3), 8, LX * 4, LY * 4);
  s.edge(rgba(LIGHT.rim, o.rim ?? 0.5), 2, LX * 2.2, LY * 2.2);
  s.finish(ink, { w: o.w ?? 3.6, inner: 0.35 });
}

/** A lit tapered tube along points (hoses, tails, tentacles, spider legs): width w(s) at s 0…1, round tip. */
export function tube(pts: Pt[], w: (s: number) => number): PathFn {
  return (c) => {
    const L: Pt[] = [];
    const R: Pt[] = [];
    pts.forEach(([x, y], j) => {
      const [nx, ny] = pts[Math.min(j + 1, pts.length - 1)];
      const [qx, qy] = pts[Math.max(j - 1, 0)];
      const d = Math.hypot(nx - qx, ny - qy) || 1;
      const ww = w(j / (pts.length - 1));
      L.push([x + (-(ny - qy) / d) * ww, y + ((nx - qx) / d) * ww]);
      R.push([x - (-(ny - qy) / d) * ww, y - ((nx - qx) / d) * ww]);
    });
    c.beginPath();
    L.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
    const [ex, ey] = pts[pts.length - 1];
    const [px, py] = pts[pts.length - 2] ?? pts[0];
    const a = Math.atan2(ey - py, ex - px);
    c.arc(ex, ey, w(1), a - Math.PI / 2, a + Math.PI / 2);
    for (let j = R.length - 1; j >= 0; j--) c.lineTo(R[j][0], R[j][1]);
    const [sx, sy] = pts[0];
    const [s2x, s2y] = pts[1] ?? pts[0];
    const b = Math.atan2(s2y - sy, s2x - sx);
    c.arc(sx, sy, w(0), b + Math.PI / 2, b + Math.PI * 1.5);
    c.closePath();
  };
}

/** Points along a curve from (x0, y0) heading a0 (radians) for len, bending by `bend` overall. */
export function arcPts(x0: number, y0: number, a0: number, len: number, bend: number, n = 14): Pt[] {
  const pts: Pt[] = [];
  let x = x0;
  let y = y0;
  for (let j = 0; j <= n; j++) {
    pts.push([x, y]);
    const a = a0 + bend * (j / n);
    x += Math.cos(a) * (len / n);
    y += Math.sin(a) * (len / n);
  }
  return pts;
}

/** Shade a tube's inside as a cylinder along its run: a lit stripe on the near side, a dark one on the far side. */
export function tubeShade(g: Ctx, pts: Pt[], w: number, col: string, a = 0.5): void {
  const line = (dx: number, dy: number) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
  };
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  line(-LX * w * 0.45, -LY * w * 0.45);
  g.strokeStyle = rgba(shade(col, -0.6), a);
  g.lineWidth = w * 0.7;
  g.stroke();
  line(LX * w * 0.35, LY * w * 0.35);
  g.strokeStyle = rgba(mix(shade(col, 0.5), LIGHT.key, 0.3), a * 0.9);
  g.lineWidth = w * 0.35;
  g.stroke();
  g.restore();
}

/** A soft, pulsing-ready glow stroke along points (veins, hose cores) for emissive layers. */
export function glowLine(g: Ctx, pts: Pt[], w: number, col: string, a = 1): void {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [ww, aa] of [[w * 3.2, 0.25], [w * 1.8, 0.5], [w, 1]] as const) {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = rgba(aa === 1 ? mix(col, '#ffffff', 0.4) : col, aa * a);
    g.lineWidth = ww;
    g.stroke();
  }
  g.restore();
}

/** Ink for a base colour (re-export). */
export { inkOf };
