// Foot kinds for the Feetza 2.0 regular roster (src/content/feet/roster.ts).
// Same design frame as the built-in kinds: centre x = CX, toes pointing down, sole contact near y 260.

import type { FootArt } from '../../data/feet';
import { registerKind } from '../../art/registry';
import { drawSneaker } from '../../art/feetArt';
import { CX, INK, OUT, barePath, drawBare, drawBareBody, drawHair, drawToe, glossy, laces, leatherFill, outlineOf, shoePath, skinBodyFill, toesFor } from '../../art/feetCommon';
import { type Ctx, blob, ellipse, mix, rgba, roundRect, shade } from '../../art/util';

type Pt = [number, number];

// ——— shared helpers ———

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** Fill a path, optionally decorate inside it (clipped), then outline it. */
function paint(ctx: Ctx, path: () => void, fill: string | CanvasGradient, inner?: () => void, lw = OUT, col = INK): void {
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  if (inner) {
    ctx.save();
    path();
    ctx.clip();
    inner();
    ctx.restore();
  }
  if (lw > 0) {
    path();
    ink(ctx, lw, col);
  }
}

function vGrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

/** Side-lit horizontal gradient (like leatherFill) over any x range. */
function hGrad(ctx: Ctx, x0: number, x1: number, col: string, sheen = 0.22, edge = -0.36): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, edge));
  g.addColorStop(0.32, shade(col, 0.04));
  g.addColorStop(0.48, shade(col, sheen));
  g.addColorStop(0.7, col);
  g.addColorStop(1, shade(col, edge - 0.04));
  return g;
}

function metal(ctx: Ctx, x0: number, x1: number, col = '#c7ccd4'): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, -0.5));
  g.addColorStop(0.3, shade(col, 0.1));
  g.addColorStop(0.42, shade(col, 0.65));
  g.addColorStop(0.55, col);
  g.addColorStop(1, shade(col, -0.55));
  return g;
}

function radial(ctx: Ctx, x: number, y: number, rad: number, col: string, hi = 0.4, lo = -0.35): CanvasGradient {
  const g = ctx.createRadialGradient(x - rad * 0.35, y - rad * 0.4, 1, x, y, rad * 1.1);
  g.addColorStop(0, shade(col, hi));
  g.addColorStop(0.55, col);
  g.addColorStop(1, shade(col, lo));
  return g;
}

function bareToes(ctx: Ctx, art: FootArt, r: () => number, nail: string | null | undefined = art.nails): void {
  for (const t of toesFor(art)) drawToe(ctx, t, art.skin, { nail, r });
}

function starPath(ctx: Ctx, x: number, y: number, ro: number, ri: number, n = 5, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? ri : ro;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** Four-point twinkle, outlined so it reads on light backgrounds. */
function sparkle(ctx: Ctx, x: number, y: number, s: number, col = '#ffffff', ol: string | null = INK): void {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.closePath();
  if (ol) ink(ctx, 3, ol);
  ctx.fillStyle = col;
  ctx.fill();
}

/** Teardrop pointing up, centred on its round bottom. */
function dropPath(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.9);
  ctx.bezierCurveTo(x + s * 0.4, y - s * 1.1, x + s, y - s * 0.6, x + s, y);
  ctx.arc(x, y, s, 0, Math.PI);
  ctx.bezierCurveTo(x - s, y - s * 0.6, x - s * 0.4, y - s * 1.1, x, y - s * 1.9);
  ctx.closePath();
}

function drop(ctx: Ctx, x: number, y: number, s: number, col: string, ol = INK, lw = 2.5): void {
  dropPath(ctx, x, y, s);
  ctx.fillStyle = col;
  ctx.fill();
  ink(ctx, lw, ol);
  ellipse(ctx, x - s * 0.35, y - s * 0.2, s * 0.25, s * 0.4, 0.3);
  ctx.fillStyle = rgba('#ffffff', 0.7);
  ctx.fill();
}

/** Drip hanging down from (x, y): straight sides, round bottom. Only the sides and bottom are outlined. */
function drip(ctx: Ctx, x: number, y: number, w: number, len: number, fill: string | CanvasGradient, ol = INK, lw = 3.5): void {
  const path = (close: boolean) => {
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x - w * 0.8, y + len);
    ctx.arc(x, y + len, w * 0.8, Math.PI, 0, true);
    ctx.lineTo(x + w, y);
    if (close) ctx.closePath();
  };
  path(true);
  ctx.fillStyle = fill;
  ctx.fill();
  path(false);
  ink(ctx, lw, ol);
  ellipse(ctx, x - w * 0.3, y + len - w * 0.2, w * 0.22, w * 0.35);
  ctx.fillStyle = rgba('#ffffff', 0.55);
  ctx.fill();
}

/** Cloud of circles with one shared outline (steam, soot, snow, spray). */
function puff(ctx: Ctx, circles: [number, number, number][], fill: string | CanvasGradient, ol: string, lw = 4): void {
  for (const [x, y, rad] of circles) {
    ellipse(ctx, x, y, rad, rad);
    ink(ctx, lw * 2, ol);
  }
  ctx.fillStyle = fill;
  for (const [x, y, rad] of circles) {
    ellipse(ctx, x, y, rad, rad);
    ctx.fill();
  }
}

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function sampleCubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) out.push(cubic(p0, p1, p2, p3, i / n));
  return out;
}

/** Closed band along a polyline whose width tapers from w0 to w1 (kelp, tentacles, cords). */
function ribbon(ctx: Ctx, pts: Pt[], w0: number, w1: number): void {
  const n = pts.length;
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L) ctx.lineTo(p[0], p[1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
}

/** Smooth closed path through points (quadratic through midpoints). */
function smoothPath(ctx: Ctx, pts: Pt[]): void {
  const n = pts.length;
  ctx.beginPath();
  const m0: Pt = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

function flamePath(ctx: Ctx, x: number, base: number, w: number, h: number, lean = 0): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, base);
  ctx.bezierCurveTo(x - w / 2, base - h * 0.45, x - w * 0.1 + lean * 0.5, base - h * 0.6, x + lean, base - h);
  ctx.bezierCurveTo(x + w * 0.15 + lean * 0.5, base - h * 0.6, x + w / 2, base - h * 0.45, x + w / 2, base);
  ctx.quadraticCurveTo(x, base + w * 0.3, x - w / 2, base);
  ctx.closePath();
}

function flame(ctx: Ctx, x: number, base: number, w: number, h: number, lean = 0): void {
  flamePath(ctx, x, base, w, h, lean);
  ctx.fillStyle = vGrad(ctx, base - h, base, [
    [0, '#ffe14d'],
    [0.5, '#ff8a1a'],
    [1, '#d8341a'],
  ]);
  ctx.fill();
  ink(ctx, 4, '#6a1a08');
  flamePath(ctx, x, base - 2, w * 0.45, h * 0.55, lean * 0.6);
  ctx.fillStyle = rgba('#fff6c0', 0.9);
  ctx.fill();
}

/** Low-cut shoe body from `top` down to `bottom`. */
function lowShoePath(ctx: Ctx, top: number, bottom: number, w: number): void {
  const h = bottom - top;
  ctx.beginPath();
  ctx.moveTo(CX - w + 12, top);
  ctx.quadraticCurveTo(CX, top - 14, CX + w - 12, top);
  ctx.bezierCurveTo(CX + w + 2, top + h * 0.35, CX + w + 2, bottom - 22, CX + w - 26, bottom - 2);
  ctx.quadraticCurveTo(CX, bottom + 8, CX - w + 26, bottom - 2);
  ctx.bezierCurveTo(CX - w - 2, bottom - 22, CX - w - 2, top + h * 0.35, CX - w + 12, top);
  ctx.closePath();
}

/** Clog-style front cover (opening at about y 96), as used by Clog Clyde. */
function coverPath(ctx: Ctx, top = 96, bottom = 268): void {
  ctx.beginPath();
  ctx.moveTo(10, top);
  ctx.bezierCurveTo(2, top + 84, 30, bottom - 2, CX, bottom);
  ctx.bezierCurveTo(190, bottom - 2, 222, top + 84, 212, top);
  ctx.quadraticCurveTo(CX, top - 46, 10, top);
  ctx.closePath();
}

function noteGlyph(ctx: Ctx, x: number, y: number, s: number, col: string, double = false): void {
  ctx.save();
  ctx.translate(x, y);
  const heads: Pt[] = double ? [[0, 0], [s * 1.5, -s * 0.4]] : [[0, 0]];
  ctx.beginPath();
  for (const [hx, hy] of heads) {
    ctx.moveTo(hx + s * 0.55, hy);
    ctx.lineTo(hx + s * 0.55, hy - s * 2.2);
  }
  if (double) ctx.lineTo(s * 0.55, -s * 2.2);
  else ctx.quadraticCurveTo(s * 1.4, -s * 1.6, s * 1.2, -s * 0.9);
  ink(ctx, 7, INK);
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.stroke();
  for (const [hx, hy] of heads) {
    ellipse(ctx, hx, hy, s * 0.62, s * 0.45, -0.4);
    ctx.fillStyle = col;
    ctx.fill();
    ink(ctx, 3);
  }
  ctx.restore();
}

/** Short zig-zag "motion/jitter" line. */
function zig(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, amp: number, n: number, col = INK, lw = 4): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const off = i === n ? 0 : (i % 2 ? amp : -amp);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    ctx.lineTo(x0 + dx * t - (dy / len) * off, y0 + dy * t + (dx / len) * off);
  }
  ink(ctx, lw, col);
}

function speedLines(ctx: Ctx, lines: [number, number, number][], col = '#ffffff'): void {
  ctx.lineCap = 'round';
  for (const [x0, x1, y] of lines) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ink(ctx, 10);
    ctx.strokeStyle = col;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
}

function bezierPts(): [Pt, Pt, Pt, Pt][] {
  // The bare-foot silhouette (barePath, non-chubby) as cubic segments.
  return [
    [[56, -6], [54, 58], [16, 104], [18, 168]],
    [[18, 168], [19, 198], [30, 214], [50, 220]],
    [[50, 220], [94, 222], [138, 224], [182, 226]],
    [[182, 226], [206, 216], [213, 190], [211, 158]],
    [[211, 158], [207, 98], [168, 58], [164, -6]],
  ];
}

// ——— Trattoria ———

registerKind('r_waiter', {
  contactY: 264,
  draw(ctx, art) {
    const p = art.primary!;
    const s = art.secondary!;
    roundRect(ctx, CX - 102, 232, 204, 32, 14);
    ctx.fillStyle = vGrad(ctx, 232, 264, [[0, '#4a4a56'], [1, '#0b0b0f']]);
    ctx.fill();
    ink(ctx);
    ctx.strokeStyle = rgba('#ffffff', 0.3);
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX - 88, 242);
    ctx.lineTo(CX + 88, 242);
    ctx.stroke();
    ctx.setLineDash([]);
    const up = () => shoePath(ctx, { bottom: 250, width: 96 });
    paint(ctx, up, leatherFill(ctx, p), () => {
      ctx.beginPath();
      ctx.ellipse(CX, 252, 92, 60, 0, Math.PI, Math.PI * 2);
      ink(ctx, 3, rgba('#000000', 0.7));
      ctx.fillStyle = rgba('#ffffff', 0.22);
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + 0.25 + (i / 12) * (Math.PI - 0.5);
        ellipse(ctx, CX + Math.cos(a) * 82, 252 + Math.sin(a) * 50, 2.4, 2.4);
        ctx.fill();
      }
      // patent shine
      ctx.fillStyle = rgba('#ffffff', 0.8);
      ellipse(ctx, CX - 46, 220, 26, 8, -0.35);
      ctx.fill();
      ellipse(ctx, CX + 40, 228, 10, 4, 0.3);
      ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.35);
      ellipse(ctx, CX - 70, 110, 7, 46, 0.06);
      ctx.fill();
    });
    roundRect(ctx, CX - 24, -6, 48, 100, 10);
    ctx.fillStyle = shade(p, 0.18);
    ctx.fill();
    ink(ctx, 3);
    laces(ctx, 4, 100, '#3a3a44', 4, 18);
    // napkin draped over the instep
    const nap = () => {
      ctx.beginPath();
      ctx.moveTo(12, 96);
      ctx.bezierCurveTo(50, 62, 150, 54, 204, 72);
      ctx.lineTo(224, 150);
      ctx.lineTo(198, 214);
      ctx.lineTo(170, 152);
      ctx.bezierCurveTo(130, 138, 70, 142, 22, 156);
      ctx.quadraticCurveTo(4, 126, 12, 96);
      ctx.closePath();
    };
    paint(ctx, nap, vGrad(ctx, 60, 214, [[0, '#ffffff'], [1, shade(s, -0.08)]]), () => {
      ctx.strokeStyle = rgba('#b8b2a0', 0.75);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(70, 78);
      ctx.quadraticCurveTo(90, 110, 80, 148);
      ctx.moveTo(136, 70);
      ctx.quadraticCurveTo(156, 108, 148, 142);
      ctx.moveTo(198, 84);
      ctx.lineTo(198, 206);
      ctx.stroke();
      ctx.fillStyle = rgba('#a8a090', 0.25);
      ctx.beginPath();
      ctx.moveTo(198, 70);
      ctx.lineTo(230, 150);
      ctx.lineTo(198, 216);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba('#d8343f', 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(26, 146);
      ctx.bezierCurveTo(70, 132, 130, 128, 168, 142);
      ctx.stroke();
    });
    // bow tie
    ctx.save();
    ctx.translate(CX, 20);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(sx * 32, -15);
      ctx.quadraticCurveTo(sx * 38, 0, sx * 32, 15);
      ctx.closePath();
      ctx.fillStyle = radial(ctx, sx * 18, 0, 22, '#d8343f');
      ctx.fill();
      ink(ctx, 3.5);
    }
    roundRect(ctx, -8, -9, 16, 18, 5);
    ctx.fillStyle = '#a81f28';
    ctx.fill();
    ink(ctx, 3);
    ctx.restore();
  },
});

function garlicBulb(ctx: Ctx, x: number, y: number, s: number, rot: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.3);
  ctx.bezierCurveTo(s * 0.3, -s * 0.9, s * 1.1, -s * 0.6, s * 1.05, s * 0.15);
  ctx.bezierCurveTo(s * 1.0, s * 0.9, s * 0.4, s * 1.05, 0, s * 1.0);
  ctx.bezierCurveTo(-s * 0.4, s * 1.05, -s * 1.0, s * 0.9, -s * 1.05, s * 0.15);
  ctx.bezierCurveTo(-s * 1.1, -s * 0.6, -s * 0.3, -s * 0.9, 0, -s * 1.3);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, 0, 0, s, col, 0.6, -0.22);
  ctx.fill();
  ink(ctx, 3.5);
  ctx.strokeStyle = rgba('#a27aa8', 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.05);
  ctx.quadraticCurveTo(-s * 0.55, 0, -s * 0.22, s * 0.95);
  ctx.moveTo(0, -s * 1.05);
  ctx.quadraticCurveTo(s * 0.55, 0, s * 0.22, s * 0.95);
  ctx.moveTo(0, -s * 1.05);
  ctx.lineTo(0, s * 0.98);
  ctx.stroke();
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 2, s);
    ctx.lineTo(i * 4, s * 1.35);
    ctx.stroke();
  }
  ctx.restore();
}

registerKind('r_garlic', {
  draw(ctx, art, r) {
    // stink fumes
    ctx.lineCap = 'round';
    for (const [x, y, dir] of [[2, 170, -1], [-8, 226, -1], [218, 168, 1], [228, 230, 1]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + dir * 16, y - 20, x - dir * 8, y - 38, x + dir * 12, y - 60);
      ctx.strokeStyle = rgba('#4a6a12', 0.7);
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = '#c8e070';
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    drawBare(ctx, art, r);
    for (const t of toesFor(art)) {
      ellipse(ctx, t.cx, t.cy + t.ry * 0.95, t.rx * 0.7, 6);
      ctx.fillStyle = rgba(art.secondary!, 0.45);
      ctx.fill();
    }
    // braided cord + bulbs
    ctx.beginPath();
    ctx.moveTo(22, 34);
    ctx.quadraticCurveTo(CX, 86, 200, 34);
    ink(ctx, 15);
    ctx.strokeStyle = '#c9a46a';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#8a6a3a';
    ctx.setLineDash([5, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
    const q = (t: number): Pt => [
      (1 - t) * (1 - t) * 22 + 2 * (1 - t) * t * CX + t * t * 200,
      (1 - t) * (1 - t) * 34 + 2 * (1 - t) * t * 86 + t * t * 34,
    ];
    for (let i = 0; i < 5; i++) {
      const [x, y] = q((i + 0.5) / 5);
      garlicBulb(ctx, x, y + 20, i === 2 ? 20 : 17, (i - 2) * 0.18, art.primary!);
    }
  },
});

registerKind('r_espresso', {
  contactY: 268,
  halfWidth: 112,
  draw(ctx, art, r) {
    const cup = art.primary!;
    const brew = art.secondary!;
    // saucer
    ellipse(ctx, CX, 254, 132, 20);
    ctx.fillStyle = vGrad(ctx, 234, 274, [[0, '#ffffff'], [1, '#d9d4ca']]);
    ctx.fill();
    ink(ctx);
    // handle
    ctx.beginPath();
    ctx.ellipse(212, 176, 34, 30, 0, -1.4, 1.4);
    ink(ctx, 24);
    ctx.strokeStyle = cup;
    ctx.lineWidth = 13;
    ctx.stroke();
    // coffee surface behind the ankle
    ellipse(ctx, CX, 120, 108, 20);
    ctx.fillStyle = brew;
    ctx.fill();
    ink(ctx, 4);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-40, -10, 300, 132);
    ctx.clip();
    drawBareBody(ctx, art, r);
    ctx.restore();
    // crema crescent in front of the foot
    ctx.beginPath();
    ctx.ellipse(CX, 120, 106, 18, 0, 0, Math.PI);
    ctx.ellipse(CX, 117, 88, 9, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fillStyle = '#c98a4a';
    ctx.fill();
    // cup body
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(2, 120);
      ctx.bezierCurveTo(4, 190, 30, 240, 70, 246);
      ctx.quadraticCurveTo(CX, 252, 150, 246);
      ctx.bezierCurveTo(190, 240, 216, 190, 218, 120);
      ctx.ellipse(CX, 120, 108, 20, 0, 0, Math.PI);
      ctx.closePath();
    };
    paint(ctx, body, hGrad(ctx, 0, 220, cup, 0.6, -0.2), () => {
      ctx.fillStyle = brew;
      ctx.fillRect(0, 204, 230, 10);
      // coffee bean logo
      ellipse(ctx, CX, 172, 14, 20, 0.4);
      ctx.fillStyle = '#7a4424';
      ctx.fill();
      ink(ctx, 3);
      ctx.beginPath();
      ctx.moveTo(CX - 5, 156);
      ctx.quadraticCurveTo(CX + 6, 172, CX + 4, 188);
      ink(ctx, 2.5);
      glossy(ctx, CX - 60, 170, 18, 40, 0.8);
    });
    // jitter lines + splashes
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const x = CX + sx * (122 + k * 16);
        zig(ctx, x, 18 + k * 22, x, 92 + k * 22, 6, 7, INK, 4);
      }
    }
    drop(ctx, -14, 100, 7, brew);
    drop(ctx, 236, 88, 6, brew);
    drop(ctx, 30, 70, 5, brew);
  },
});

registerKind('r_saucy', {
  draw(ctx, art, r) {
    const sauce = art.primary!;
    const ol = mix(shade(sauce, -0.6), INK, 0.4);
    const fill = vGrad(ctx, 110, 270, [[0, shade(sauce, 0.2)], [0.5, sauce], [1, shade(sauce, -0.3)]]);
    const sauceLayer = () => {
      ctx.beginPath();
      ctx.moveTo(-40, 340);
      ctx.lineTo(-40, 128);
      for (let x = -40; x <= 260; x += 20) {
        const y = 124 + Math.sin(x * 0.07) * 9 + Math.cos(x * 0.13) * 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(260, 340);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = ol;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', 0.35);
      ellipse(ctx, 60, 160, 16, 6, -0.3);
      ctx.fill();
      ellipse(ctx, 150, 150, 10, 4, 0.2);
      ctx.fill();
    };
    drawBareBody(ctx, art, r);
    ctx.save();
    barePath(ctx, art);
    ctx.clip();
    sauceLayer();
    ctx.restore();
    barePath(ctx, art, true);
    ink(ctx, OUT, ol);
    for (const t of toesFor(art)) {
      drawToe(ctx, t, art.skin, { nail: art.nails, r });
      ctx.save();
      ellipse(ctx, t.cx, t.cy, t.rx, t.ry);
      ctx.clip();
      sauceLayer();
      ctx.restore();
      ellipse(ctx, t.cx, t.cy, t.rx, t.ry);
      ink(ctx, OUT, ol);
      glossy(ctx, t.cx - t.rx * 0.3, t.cy - t.ry * 0.2, t.rx * 0.4, t.ry * 0.3, 0.7);
    }
    // splatters on the skin above
    ctx.fillStyle = sauce;
    for (const [x, y, s] of [[70, 92, 6], [150, 84, 5], [120, 100, 3.5], [44, 108, 4]] as const) {
      ellipse(ctx, x, y, s, s);
      ctx.fill();
    }
    // drips under the toes
    const toes = toesFor(art);
    for (const [i, len] of [[1, 18], [2, 30], [3, 16], [4, 34]] as const) {
      const t = toes[i];
      drip(ctx, t.cx + 2, t.cy + t.ry - 4, 7, len, fill, ol);
    }
    // basil leaf
    ctx.save();
    ctx.translate(150, 168);
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.quadraticCurveTo(0, -24, 28, 0);
    ctx.quadraticCurveTo(0, 24, -28, 0);
    ctx.closePath();
    ctx.fillStyle = radial(ctx, 0, 0, 26, art.secondary!);
    ctx.fill();
    ink(ctx, 3.5);
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(24, 0);
    ink(ctx, 2, shade(art.secondary!, -0.5));
    ctx.restore();
  },
});

// ——— Rooftop ———

registerKind('r_antenna', {
  contactY: 262,
  draw(ctx, art) {
    drawSneaker(ctx, art);
    const bx = CX;
    const by = 188;
    for (const [tx, ty, dir] of [[-12, 44, -1], [232, 44, 1]] as const) {
      ctx.beginPath();
      ctx.moveTo(bx + dir * 10, by);
      ctx.lineTo(tx, ty);
      ink(ctx, 10);
      ctx.strokeStyle = '#d6dbe2';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.8);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ellipse(ctx, tx, ty, 9, 9);
      ctx.fillStyle = radial(ctx, tx, ty, 9, '#c7ccd4', 0.6);
      ctx.fill();
      ink(ctx, 3.5);
      const base = dir < 0 ? Math.PI * 1.25 : Math.PI * 1.75;
      for (const rad of [17, 28]) {
        ctx.beginPath();
        ctx.arc(tx, ty, rad, base - 0.55, base + 0.55);
        ink(ctx, 8);
        ctx.strokeStyle = art.secondary!;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    }
    ctx.beginPath();
    ctx.ellipse(bx, by + 4, 32, 24, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = radial(ctx, bx, by - 6, 30, '#3a3f4a', 0.5);
    ctx.fill();
    ink(ctx, 4);
    roundRect(ctx, bx - 38, by, 76, 16, 6);
    ctx.fillStyle = '#23262e';
    ctx.fill();
    ink(ctx, 3.5);
    ellipse(ctx, bx + 16, by - 8, 5, 5);
    ctx.fillStyle = art.secondary!;
    ctx.fill();
    ink(ctx, 2);
    ellipse(ctx, bx - 14, by - 8, 4, 4);
    ctx.fillStyle = '#ff4d4d';
    ctx.fill();
  },
});

registerKind('r_parkour', {
  contactY: 268,
  draw(ctx, art, r) {
    const p = art.primary!;
    const s = art.secondary!;
    speedLines(ctx, [[-36, 2, 84], [-30, -2, 124], [-36, 6, 164]]);
    const toes = toesFor(art);
    for (const t of toes) {
      ellipse(ctx, t.cx, t.cy + 7, t.rx + 2, t.ry);
      ctx.fillStyle = s;
      ctx.fill();
      ink(ctx, 4);
    }
    barePath(ctx, art);
    ctx.fillStyle = skinBodyFill(ctx, p);
    ctx.fill();
    ctx.save();
    barePath(ctx, art);
    ctx.clip();
    // mesh
    ctx.fillStyle = rgba('#ffffff', 0.08);
    for (let y = 60; y < 200; y += 10) for (let x = 20 + ((y / 10) % 2) * 5; x < 210; x += 10) {
      ellipse(ctx, x, y, 2, 2);
      ctx.fill();
    }
    // sole rim
    ctx.fillStyle = s;
    ctx.fillRect(0, 206, 230, 30);
    // velcro strap
    ctx.beginPath();
    ctx.moveTo(0, 78);
    ctx.lineTo(230, 58);
    ctx.lineTo(230, 92);
    ctx.lineTo(0, 112);
    ctx.closePath();
    ctx.fillStyle = shade(p, 0.25);
    ctx.fill();
    ink(ctx, 4);
    roundRect(ctx, 150, 66, 40, 28, 4);
    ctx.fillStyle = s;
    ctx.fill();
    // athletic tape on the ankle
    for (const [y, rot] of [[6, -0.08], [26, 0.06], [-10, 0.12]] as const) {
      ctx.save();
      ctx.translate(CX, y);
      ctx.rotate(rot);
      ctx.fillStyle = '#f7f5ef';
      ctx.fillRect(-120, -8, 240, 16);
      ctx.strokeStyle = rgba(INK, 0.5);
      ctx.lineWidth = 2;
      ctx.strokeRect(-120, -8, 240, 16);
      ctx.restore();
    }
    glossy(ctx, CX - 30, 140, 40, 50, 0.15);
    ctx.restore();
    barePath(ctx, art, true);
    ink(ctx);
    for (const t of toes) {
      drawToe(ctx, t, p, { nail: null, ol: INK });
      ctx.save();
      ellipse(ctx, t.cx, t.cy, t.rx, t.ry);
      ctx.clip();
      ctx.fillStyle = s;
      ctx.fillRect(t.cx - t.rx, t.cy + t.ry * 0.45, t.rx * 2, t.ry);
      ctx.restore();
      ellipse(ctx, t.cx, t.cy, t.rx, t.ry);
      ink(ctx);
    }
    // chalk handprint smudge
    ctx.fillStyle = rgba('#ffffff', 0.35);
    for (let i = 0; i < 8; i++) {
      ellipse(ctx, 60 + r() * 30, 150 + r() * 20, 4 + r() * 4, 3);
      ctx.fill();
    }
  },
});

// ——— Beach ———

registerKind('r_sandy', {
  contactY: 270,
  halfWidth: 112,
  draw(ctx, art, r) {
    const sand = art.primary!;
    drawBareBody(ctx, art, r);
    ctx.save();
    barePath(ctx, art);
    ctx.clip();
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = rgba(r() > 0.5 ? shade(sand, -0.25) : shade(sand, 0.3), 0.75);
      const y = 20 + r() * 140;
      if (r() > 0.25 + y / 300) continue;
      ctx.fillRect(20 + r() * 190, y, 2.5, 2.5);
    }
    ctx.restore();
    // spade stuck in the sand (behind the mound)
    ctx.save();
    ctx.translate(-8, 150);
    ctx.rotate(-0.35);
    roundRect(ctx, -6, -70, 12, 100, 5);
    ctx.fillStyle = hGrad(ctx, -6, 6, '#c98a4a');
    ctx.fill();
    ink(ctx, 3.5);
    roundRect(ctx, -14, -82, 28, 16, 6);
    ctx.fillStyle = art.secondary!;
    ctx.fill();
    ink(ctx, 3.5);
    ctx.restore();
    const mound = () => {
      ctx.beginPath();
      ctx.moveTo(-36, 272);
      ctx.bezierCurveTo(-32, 206, 0, 164, 40, 152);
      ctx.quadraticCurveTo(110, 136, 182, 150);
      ctx.bezierCurveTo(222, 160, 252, 204, 256, 272);
      ctx.quadraticCurveTo(110, 284, -36, 272);
      ctx.closePath();
    };
    paint(ctx, mound, vGrad(ctx, 140, 284, [[0, shade(sand, 0.3)], [0.5, sand], [1, shade(sand, -0.22)]]), () => {
      for (let i = 0; i < 420; i++) {
        ctx.fillStyle = rgba(r() > 0.5 ? '#ffffff' : shade(sand, -0.45), 0.35 + r() * 0.3);
        ctx.fillRect(-36 + r() * 292, 136 + r() * 150, 2.5, 2.5);
      }
      ctx.strokeStyle = rgba(shade(sand, -0.4), 0.55);
      ctx.lineWidth = 3;
      for (const [y, x0, x1] of [[190, -10, 90], [214, 120, 236], [236, 0, 120], [256, 140, 250]] as const) {
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.quadraticCurveTo((x0 + x1) / 2, y - 10, x1, y);
        ctx.stroke();
      }
    }, OUT, outlineOf(sand));
    // big toe poking out of the sand
    const t = { cx: 176, cy: 160, rx: 26, ry: 22 };
    drawToe(ctx, t, art.skin, { nail: art.nails, r });
    ctx.beginPath();
    ctx.moveTo(142, 170);
    ctx.quadraticCurveTo(176, 186, 210, 168);
    ctx.lineTo(214, 182);
    ctx.quadraticCurveTo(176, 196, 140, 182);
    ctx.closePath();
    ctx.fillStyle = shade(sand, 0.15);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(142, 170);
    ctx.quadraticCurveTo(176, 186, 210, 168);
    ink(ctx, 3.5, outlineOf(sand));
    // starfish + shell
    starPath(ctx, 62, 228, 20, 8, 5, -1.2);
    ctx.fillStyle = radial(ctx, 62, 228, 20, art.secondary!);
    ctx.fill();
    ink(ctx, 3.5);
    ctx.fillStyle = rgba('#ffffff', 0.7);
    for (let i = 0; i < 5; i++) {
      const a = -1.2 + (i / 5) * Math.PI * 2;
      ellipse(ctx, 62 + Math.cos(a) * 10, 228 + Math.sin(a) * 10, 1.8, 1.8);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(166, 240);
    ctx.rotate(0.2);
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(-20, -6);
    ctx.quadraticCurveTo(0, -24, 20, -6);
    ctx.closePath();
    ctx.fillStyle = radial(ctx, 0, -4, 20, '#ffe2cc', 0.5, -0.15);
    ctx.fill();
    ink(ctx, 3.5);
    ctx.strokeStyle = rgba('#c98a6a', 0.8);
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(i * 8, -12 + Math.abs(i) * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
});

registerKind('r_seaweed', {
  draw(ctx, art, r) {
    const kelp = art.primary!;
    const lite = art.secondary!;
    drawBare(ctx, art, r);
    // wet sheen
    for (let i = 0; i < 6; i++) drop(ctx, 40 + r() * 140, 30 + r() * 140, 3 + r() * 2, rgba('#bfe8ff', 0.85), rgba('#3a7a9a', 0.8), 1.5);
    const strands = [
      { x: 30, y: 16, len: 276, amp: 13, w: 26, ph: 0 },
      { x: 92, y: 40, len: 238, amp: 10, w: 20, ph: 1.6 },
      { x: 150, y: 6, len: 314, amp: 15, w: 28, ph: 3 },
      { x: 200, y: 64, len: 236, amp: 12, w: 20, ph: 4.4 },
    ];
    for (const st of strands) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        pts.push([st.x + Math.sin(t * 7 + st.ph) * st.amp * (0.4 + t), st.y + t * st.len]);
      }
      ribbon(ctx, pts, st.w, st.w * 0.35);
      ctx.fillStyle = hGrad(ctx, st.x - st.w, st.x + st.w, kelp, 0.3, -0.3);
      ctx.fill();
      ink(ctx, 4, mix(shade(kelp, -0.6), INK, 0.4));
      ctx.beginPath();
      ctx.moveTo(pts[1][0], pts[1][1]);
      for (const p of pts.slice(2, -2)) ctx.lineTo(p[0], p[1]);
      ctx.strokeStyle = rgba(lite, 0.8);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // air bladders
      for (const k of [8, 15]) {
        const [bx, by] = pts[k];
        ellipse(ctx, bx + 10, by, 7, 8);
        ctx.fillStyle = radial(ctx, bx + 10, by, 7, '#c8d84a', 0.5);
        ctx.fill();
        ink(ctx, 2.5, mix(shade(kelp, -0.6), INK, 0.4));
      }
      drop(ctx, pts[24][0], pts[24][1] + 12, 4, rgba('#bfe8ff', 0.9), rgba('#3a7a9a', 0.9), 2);
    }
  },
});

registerKind('r_coconut', {
  contactY: 270,
  halfWidth: 110,
  draw(ctx, art, r) {
    const shell = art.primary!;
    drawBareBody(ctx, art, r);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(0, 150);
      ctx.bezierCurveTo(-2, 232, 56, 270, CX, 270);
      ctx.bezierCurveTo(164, 270, 222, 232, 220, 150);
      ctx.quadraticCurveTo(CX, 122, 0, 150);
      ctx.closePath();
    };
    paint(ctx, path, radial(ctx, CX - 10, 200, 120, shell, 0.25, -0.45), () => {
      drawHair(ctx, r, 0, 140, 220, 140, shade(shell, -0.5), 150);
      drawHair(ctx, r, 0, 140, 220, 140, shade(shell, 0.35), 50);
      for (const [x, y] of [[CX - 30, 214], [CX + 30, 214], [CX, 240]] as const) {
        ellipse(ctx, x, y, 9, 8);
        ctx.fillStyle = shade(shell, -0.65);
        ctx.fill();
      }
      // polished shine (glossy)
      ctx.fillStyle = rgba('#ffffff', 0.75);
      ellipse(ctx, CX - 58, 192, 12, 30, 0.5);
      ctx.fill();
      ellipse(ctx, CX - 34, 172, 6, 10, 0.5);
      ctx.fill();
    });
    // coconut-meat rim
    ctx.beginPath();
    ctx.moveTo(0, 150);
    ctx.quadraticCurveTo(CX, 122, 220, 150);
    ink(ctx, 20);
    ctx.strokeStyle = '#fbf6ea';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = rgba('#d8cfb8', 0.9);
    ctx.lineWidth = 3;
    ctx.stroke();
    // cocktail umbrella
    ctx.beginPath();
    ctx.moveTo(178, 146);
    ctx.lineTo(212, 46);
    ink(ctx, 7);
    ctx.strokeStyle = '#e8c88a';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.save();
    ctx.translate(214, 42);
    ctx.rotate(0.35);
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const a0 = Math.PI + (i / segs) * Math.PI;
      const a1 = Math.PI + ((i + 1) / segs) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(Math.cos(a0) * 38, Math.sin(a0) * 24 + 8);
      ctx.lineTo(Math.cos(a1) * 38, Math.sin(a1) * 24 + 8);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#ffffff' : art.secondary!;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-38, 8);
    ctx.quadraticCurveTo(0, -36, 38, 8);
    ctx.closePath();
    ink(ctx, 3.5);
    ctx.restore();
  },
});

function barnacle(ctx: Ctx, x: number, y: number, s: number): void {
  ellipse(ctx, x, y, s, s * 0.85);
  ctx.fillStyle = radial(ctx, x, y, s, '#e8e2d4', 0.4, -0.35);
  ctx.fill();
  ink(ctx, 2.5);
  ellipse(ctx, x, y + 1, s * 0.42, s * 0.32);
  ctx.fillStyle = '#4a4038';
  ctx.fill();
  ctx.strokeStyle = rgba('#8a8070', 0.8);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.38);
    ctx.lineTo(x + Math.cos(a) * s * 0.9, y + Math.sin(a) * s * 0.78);
    ctx.stroke();
  }
}

registerKind('r_tidepool', {
  draw(ctx, art, r) {
    drawBare(ctx, art, r);
    for (let i = 0; i < 5; i++) drop(ctx, 50 + r() * 120, 40 + r() * 120, 3 + r() * 2, rgba('#d8f4ff', 0.85), rgba('#3a7a9a', 0.8), 1.5);
    for (const [x, y, s] of [[30, 132, 11], [46, 152, 9], [26, 172, 10], [42, 112, 7], [58, 176, 7], [182, 46, 9], [196, 66, 7], [172, 70, 6]] as const) barnacle(ctx, x, y, s);
    // anemone
    const ax = CX + 6;
    const ay = 96;
    ctx.lineCap = 'round';
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + 0.2 + (i / 10) * (Math.PI - 0.4);
      const len = 26 + (i % 3) * 6;
      const ex = ax + Math.cos(a) * len;
      const ey = ay + Math.sin(a) * len * 0.9;
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(a) * 8, ay);
      ctx.quadraticCurveTo(ax + Math.cos(a) * len * 0.7 + 6, ay + Math.sin(a) * len * 0.5, ex, ey);
      ink(ctx, 10);
      ctx.strokeStyle = art.secondary!;
      ctx.lineWidth = 6;
      ctx.stroke();
      ellipse(ctx, ex, ey, 4, 4);
      ctx.fillStyle = shade(art.secondary!, 0.55);
      ctx.fill();
    }
    ellipse(ctx, ax, ay + 4, 22, 12);
    ctx.fillStyle = radial(ctx, ax, ay + 4, 22, shade(art.secondary!, -0.15));
    ctx.fill();
    ink(ctx, 3.5);
    // starfish clinging to the big toes
    ctx.save();
    ctx.translate(186, 200);
    ctx.rotate(0.3);
    starPath(ctx, 0, 0, 38, 15);
    ctx.fillStyle = radial(ctx, 0, 0, 36, art.primary!);
    ctx.fill();
    ink(ctx, 4);
    ctx.fillStyle = rgba('#fff2d8', 0.85);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      for (const d of [10, 20, 28]) {
        ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, 2.2, 2.2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
});

// ——— Diner ———

registerKind('r_riot', {
  contactY: 266,
  draw(ctx, art) {
    const p = art.primary!;
    const glass = art.secondary!;
    roundRect(ctx, CX - 108, 220, 216, 46, 16);
    ctx.fillStyle = '#151619';
    ctx.fill();
    ink(ctx);
    ctx.fillStyle = '#383a42';
    for (let i = 0; i < 8; i++) {
      roundRect(ctx, CX - 98 + i * 25, 250, 16, 12, 3);
      ctx.fill();
    }
    const up = () => shoePath(ctx, { bottom: 240, width: 100 });
    paint(ctx, up, leatherFill(ctx, shade(p, 0.12)), () => {
      ellipse(ctx, CX, 246, 98, 52);
      ctx.fillStyle = '#2c2e35';
      ctx.fill();
      ink(ctx, 3, rgba('#000', 0.8));
      ctx.strokeStyle = rgba('#8a8f9a', 0.6);
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2.5;
      shoePath(ctx, { bottom: 230, width: 90, open: true });
      ctx.stroke();
      ctx.setLineDash([]);
      glossy(ctx, CX - 40, 210, 28, 10, 0.35);
    });
    // shin strap
    for (const y of [104, 172]) {
      roundRect(ctx, -12, y, 244, 18, 6);
      ctx.fillStyle = '#26282e';
      ctx.fill();
      ink(ctx, 3.5);
      roundRect(ctx, 200, y - 3, 22, 24, 4);
      ctx.fillStyle = metal(ctx, 200, 222, '#9aa3ad');
      ctx.fill();
      ink(ctx, 2.5);
    }
    // riot shield
    const sh = () => {
      ctx.beginPath();
      ctx.moveTo(-4, 4);
      ctx.quadraticCurveTo(CX, -10, 224, 4);
      ctx.lineTo(224, 150);
      ctx.quadraticCurveTo(CX, 168, -4, 150);
      ctx.closePath();
    };
    sh();
    ctx.fillStyle = rgba(glass, 0.55);
    ctx.fill();
    ctx.save();
    sh();
    ctx.clip();
    ctx.fillStyle = rgba('#ffffff', 0.35);
    ctx.beginPath();
    ctx.moveTo(10, 150);
    ctx.lineTo(70, -10);
    ctx.lineTo(100, -10);
    ctx.lineTo(40, 160);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(56, 160);
    ctx.lineTo(116, -10);
    ctx.lineTo(126, -10);
    ctx.lineTo(66, 160);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    sh();
    ink(ctx, 11, '#121318');
    ctx.strokeStyle = '#5a5e68';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = '900 38px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = INK;
    ctx.strokeText('RIOT', CX, 62);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('RIOT', CX, 62);
    for (const [x, y] of [[8, 12], [212, 12], [8, 140], [212, 140]] as const) {
      ellipse(ctx, x, y, 4.5, 4.5);
      ctx.fillStyle = metal(ctx, x - 4, x + 4, '#c7ccd4');
      ctx.fill();
      ink(ctx, 2);
    }
  },
});

registerKind('r_waffle', {
  contactY: 268,
  draw(ctx, art, r) {
    const p = art.primary!;
    drawBareBody(ctx, art, r);
    paint(ctx, () => coverPath(ctx), radial(ctx, CX - 20, 150, 150, p, 0.3, -0.35), () => {
      const cell = 28;
      ctx.fillStyle = shade(p, 0.25);
      ctx.fillRect(-10, 40, 240, 240);
      for (let y = 52; y < 280; y += cell) {
        for (let x = -4; x < 230; x += cell) {
          roundRect(ctx, x + 4, y + 4, cell - 8, cell - 8, 4);
          ctx.fillStyle = shade(p, -0.25);
          ctx.fill();
          roundRect(ctx, x + 4, y + 4, cell - 8, 6, 3);
          ctx.fillStyle = rgba('#5a2a08', 0.35);
          ctx.fill();
        }
      }
      const edge = ctx.createRadialGradient(CX, 180, 60, CX, 180, 150);
      edge.addColorStop(0, rgba('#7a3a08', 0));
      edge.addColorStop(1, rgba('#7a3a08', 0.45));
      ctx.fillStyle = edge;
      ctx.fillRect(-10, 40, 240, 240);
    });
    ctx.beginPath();
    ctx.moveTo(10, 96);
    ctx.quadraticCurveTo(CX, 50, 212, 96);
    ctx.strokeStyle = shade(p, -0.25);
    ctx.lineWidth = 10;
    ctx.stroke();
    ink(ctx, 3);
    // syrup
    const syrup = vGrad(ctx, 80, 220, [[0, '#d27a2a'], [1, '#8a3a0a']]);
    ctx.beginPath();
    ctx.moveTo(108, 100);
    ctx.bezierCurveTo(130, 88, 180, 90, 204, 104);
    ctx.lineTo(206, 120);
    ctx.bezierCurveTo(180, 126, 140, 130, 110, 120);
    ctx.closePath();
    ctx.fillStyle = syrup;
    ctx.fill();
    ink(ctx, 3);
    for (const [x, len] of [[128, 40], [160, 70], [192, 30]] as const) drip(ctx, x, 118, 7, len, syrup, INK, 3);
    // butter pat
    ctx.save();
    ctx.translate(CX - 10, 140);
    ctx.rotate(0.12);
    blob(ctx, 0, 6, 34, 0.25, r, 9);
    ctx.fillStyle = rgba('#fff3a0', 0.8);
    ctx.fill();
    roundRect(ctx, -26, -18, 52, 36, 8);
    ctx.fillStyle = vGrad(ctx, -18, 18, [[0, '#fff8c8'], [1, art.secondary!]]);
    ctx.fill();
    ink(ctx, 3.5);
    glossy(ctx, -10, -8, 14, 6, 0.9);
    ctx.restore();
  },
});

registerKind('r_ketchup', {
  contactY: 284,
  halfWidth: 100,
  draw(ctx, art) {
    const p = art.primary!;
    const s = art.secondary!;
    const bottle = () => {
      ctx.beginPath();
      ctx.moveTo(56, -6);
      ctx.bezierCurveTo(54, 40, 16, 60, 14, 110);
      ctx.lineTo(14, 196);
      ctx.bezierCurveTo(14, 222, 46, 230, 74, 232);
      ctx.lineTo(146, 232);
      ctx.bezierCurveTo(174, 230, 206, 222, 206, 196);
      ctx.lineTo(206, 110);
      ctx.bezierCurveTo(204, 60, 166, 40, 164, -6);
      ctx.closePath();
    };
    // cap + nozzle
    ctx.beginPath();
    ctx.moveTo(58, 222);
    ctx.lineTo(162, 222);
    ctx.lineTo(146, 262);
    ctx.quadraticCurveTo(CX, 268, 74, 262);
    ctx.closePath();
    ctx.fillStyle = hGrad(ctx, 58, 162, s, 0.5, -0.25);
    ctx.fill();
    ink(ctx);
    ctx.strokeStyle = rgba('#000', 0.18);
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(CX + i * 13, 228);
      ctx.lineTo(CX + i * 10, 258);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(CX - 12, 262);
    ctx.lineTo(CX - 6, 280);
    ctx.lineTo(CX + 6, 280);
    ctx.lineTo(CX + 12, 262);
    ctx.closePath();
    ctx.fillStyle = hGrad(ctx, CX - 12, CX + 12, s, 0.5, -0.25);
    ctx.fill();
    ink(ctx, 3.5);
    // ketchup blob on the nozzle
    ellipse(ctx, CX, 288, 11, 10);
    ctx.fillStyle = radial(ctx, CX, 288, 11, p);
    ctx.fill();
    ink(ctx, 3);
    paint(ctx, bottle, hGrad(ctx, 14, 206, p, 0.35, -0.4), () => {
      roundRect(ctx, 0, 96, 230, 74, 0);
      ctx.fillStyle = vGrad(ctx, 96, 170, [[0, '#ffffff'], [1, shade(s, -0.08)]]);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 96);
      ctx.lineTo(230, 96);
      ctx.moveTo(0, 170);
      ctx.lineTo(230, 170);
      ink(ctx, 3.5);
      // tomato badge
      ellipse(ctx, CX - 58, 134, 18, 16);
      ctx.fillStyle = radial(ctx, CX - 58, 134, 18, '#e5242f');
      ctx.fill();
      ink(ctx, 3);
      starPath(ctx, CX - 58, 120, 9, 3.5, 5);
      ctx.fillStyle = '#3f9a3a';
      ctx.fill();
      ctx.font = '900 25px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = p;
      ctx.fillText('KETCHUP', CX + 22, 143);
      ctx.fillStyle = rgba('#ffffff', 0.55);
      roundRect(ctx, 34, 10, 12, 80, 6);
      ctx.fill();
      roundRect(ctx, 34, 178, 12, 40, 6);
      ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.3);
      roundRect(ctx, 54, 20, 6, 60, 3);
      ctx.fill();
    });
  },
});

registerKind('r_frycook', {
  contactY: 266,
  draw(ctx, art, r) {
    const wire = art.primary!;
    drawBareBody(ctx, art, r);
    bareToes(ctx, art, r);
    const basket = () => {
      ctx.beginPath();
      ctx.moveTo(-4, 140);
      ctx.lineTo(224, 140);
      ctx.lineTo(216, 246);
      ctx.quadraticCurveTo(CX, 272, 4, 246);
      ctx.closePath();
    };
    // fries, poking above the rim
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-4, 40);
    ctx.lineTo(224, 40);
    ctx.lineTo(216, 246);
    ctx.quadraticCurveTo(CX, 272, 4, 246);
    ctx.closePath();
    ctx.clip();
    for (let i = 0; i < 11; i++) {
      const x = 8 + i * 19 + r() * 6;
      const top = 104 + r() * 26 + (i % 2) * 10;
      ctx.save();
      ctx.translate(x, top);
      ctx.rotate((r() - 0.5) * 0.35);
      roundRect(ctx, -7, 0, 14, 170, 3);
      ctx.fillStyle = hGrad(ctx, -7, 7, art.secondary!, 0.4, -0.25);
      ctx.fill();
      ink(ctx, 3);
      ctx.fillStyle = rgba('#c87a1a', 0.6);
      ctx.fillRect(-6, 1, 12, 5);
      ctx.restore();
    }
    ctx.restore();
    // mesh
    ctx.save();
    basket();
    ctx.clip();
    ctx.fillStyle = rgba('#2a2a30', 0.16);
    ctx.fillRect(-10, 130, 240, 150);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rgba('#5a626c', 0.95);
    for (let x = -4; x < 230; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, 130);
      ctx.lineTo(x, 280);
      ctx.stroke();
    }
    for (let y = 150; y < 280; y += 15) {
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.lineTo(230, y);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba('#ffffff', 0.4);
    ctx.lineWidth = 1;
    for (let x = -3; x < 230; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, 130);
      ctx.lineTo(x, 280);
      ctx.stroke();
    }
    ctx.restore();
    basket();
    ink(ctx, OUT, '#2a2e36');
    // handle
    ctx.beginPath();
    ctx.moveTo(214, 142);
    ctx.lineTo(244, 96);
    ink(ctx, 12);
    ctx.strokeStyle = wire;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(242, 100);
    ctx.lineTo(256, 30);
    ink(ctx, 24);
    ctx.strokeStyle = '#d8343f';
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(240, 92);
    ctx.lineTo(252, 36);
    ctx.stroke();
    // rim
    ctx.beginPath();
    ctx.moveTo(-8, 140);
    ctx.lineTo(228, 140);
    ink(ctx, 16);
    ctx.strokeStyle = metal(ctx, -8, 228, wire);
    ctx.lineWidth = 9;
    ctx.stroke();
    // sizzle
    for (const [x, y] of [[-20, 120], [-26, 190], [236, 170], [232, 230]] as const) {
      zig(ctx, x, y, x + (x < 0 ? -8 : 8), y - 34, 5, 5, INK, 3.5);
    }
    for (const [x, y] of [[20, 112], [190, 106], [100, 100]] as const) drop(ctx, x, y, 4.5, '#ffe58a', '#8a5a10', 2);
  },
});

// ——— Lodge ———

registerKind('r_moose', {
  contactY: 272,
  halfWidth: 108,
  draw(ctx, art, r) {
    const fur = art.primary!;
    const hoof = art.skin;
    for (const sx of [-1, 1]) {
      ellipse(ctx, CX + sx * 96, 158, 15, 22, sx * 0.5);
      ctx.fillStyle = radial(ctx, CX + sx * 96, 158, 18, hoof, 0.4);
      ctx.fill();
      ink(ctx, 4);
    }
    const leg = () => {
      ctx.beginPath();
      ctx.moveTo(54, -6);
      ctx.bezierCurveTo(52, 50, 26, 100, 22, 168);
      ctx.lineTo(198, 168);
      ctx.bezierCurveTo(194, 100, 168, 50, 166, -6);
      ctx.closePath();
    };
    paint(ctx, leg, skinBodyFill(ctx, fur), () => {
      drawHair(ctx, r, 20, -6, 180, 180, shade(fur, -0.45), 300);
      drawHair(ctx, r, 20, -6, 180, 180, shade(fur, 0.3), 110);
    }, OUT, outlineOf(fur));
    for (const sx of [-1, 1]) {
      const X = (dx: number) => CX + sx * dx;
      const half = () => {
        ctx.beginPath();
        ctx.moveTo(X(5), 138);
        ctx.bezierCurveTo(X(2), 200, X(6), 250, X(14), 268);
        ctx.quadraticCurveTo(X(62), 282, X(94), 254);
        ctx.bezierCurveTo(X(114), 220, X(106), 160, X(86), 138);
        ctx.quadraticCurveTo(X(46), 126, X(5), 138);
        ctx.closePath();
      };
      paint(ctx, half, radial(ctx, X(46), 200, 80, mix(hoof, '#7a5a40', 0.35), 0.45, -0.45), () => {
        ctx.strokeStyle = rgba('#000000', 0.25);
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(X(10), 170 + i * 22);
          ctx.quadraticCurveTo(X(56), 160 + i * 24, X(100), 172 + i * 20);
          ctx.stroke();
        }
        ctx.fillStyle = rgba('#ffffff', 0.4);
        ellipse(ctx, X(44), 176, 10, 28, sx * 0.25);
        ctx.fill();
      });
    }
    // fur fringe over the hoof tops
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = 16 + (i / 39) * 188 + (r() - 0.5) * 6;
      const y = 150 + r() * 8;
      ctx.strokeStyle = i % 3 ? shade(fur, -0.3) : fur;
      ctx.lineWidth = 4 + r() * 3;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 8, y + 4, x + (r() - 0.5) * 10, y + 12 + r() * 6);
      ctx.stroke();
    }
  },
});

registerKind('r_hottub', {
  draw(ctx, art, r) {
    // steam curls
    ctx.lineCap = 'round';
    for (const [x, y] of [[-14, 120], [-24, 60], [228, 110], [238, 50]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y + 40);
      ctx.bezierCurveTo(x - 14, y + 20, x + 14, y + 10, x, y - 10);
      ctx.bezierCurveTo(x - 10, y - 24, x + 6, y - 34, x + 2, y - 44);
      ctx.strokeStyle = rgba('#8aa8b8', 0.8);
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    drawBare(ctx, art, r);
    // prune wrinkles
    ctx.strokeStyle = rgba(outlineOf(art.skin), 0.5);
    ctx.lineWidth = 2;
    for (const t of toesFor(art)) {
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(t.cx, t.cy + t.ry * (0.05 + k * 0.22), t.rx * 0.55, 0.5, Math.PI - 0.5);
        ctx.stroke();
      }
    }
    for (let i = 0; i < 6; i++) drop(ctx, 40 + r() * 140, 100 + r() * 80, 3 + r() * 2, rgba('#d8f4ff', 0.85), rgba('#3a7a9a', 0.8), 1.5);
    // towel round the ankle
    const towel = () => {
      ctx.beginPath();
      ctx.moveTo(44, 0);
      ctx.quadraticCurveTo(CX, 22, 178, 0);
      ctx.lineTo(186, 58);
      ctx.quadraticCurveTo(CX, 82, 36, 58);
      ctx.closePath();
    };
    paint(ctx, towel, vGrad(ctx, 0, 80, [[0, '#ffffff'], [1, '#e2ddd2']]), () => {
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = rgba(r() > 0.5 ? '#ffffff' : '#b8b2a6', 0.5);
        ellipse(ctx, 36 + r() * 150, r() * 80, 1.5, 1.5);
        ctx.fill();
      }
      ctx.fillStyle = rgba('#4cc9f0', 0.8);
      for (const y of [40, 50]) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.quadraticCurveTo(CX, y + 22, 190, y);
        ctx.lineTo(190, y + 4);
        ctx.quadraticCurveTo(CX, y + 26, 30, y + 4);
        ctx.closePath();
        ctx.fill();
      }
    });
    ctx.beginPath();
    ctx.moveTo(176, 8);
    ctx.lineTo(206, 50);
    ctx.lineTo(178, 62);
    ctx.closePath();
    ctx.fillStyle = '#f2efe8';
    ctx.fill();
    ink(ctx, 3.5);
    // rubber duck on the big toe
    const dx = 186;
    const dy = 206;
    ellipse(ctx, dx + 2, dy + 8, 30, 18);
    ctx.fillStyle = radial(ctx, dx, dy + 6, 30, art.secondary!);
    ctx.fill();
    ink(ctx, 3.5);
    ctx.beginPath();
    ctx.moveTo(dx + 26, dy + 2);
    ctx.lineTo(dx + 38, dy - 10);
    ctx.lineTo(dx + 30, dy + 10);
    ctx.closePath();
    ctx.fillStyle = art.secondary!;
    ctx.fill();
    ink(ctx, 3);
    ellipse(ctx, dx - 12, dy - 14, 15, 14);
    ctx.fillStyle = radial(ctx, dx - 12, dy - 14, 15, art.secondary!);
    ctx.fill();
    ink(ctx, 3.5);
    ellipse(ctx, dx - 29, dy - 11, 9, 5, 0.1);
    ctx.fillStyle = '#ff8a1a';
    ctx.fill();
    ink(ctx, 2.5);
    ellipse(ctx, dx - 16, dy - 18, 3, 3.5);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx + 4, dy + 4, 12, 0.2, 1.6);
    ink(ctx, 2.5, shade(art.secondary!, -0.5));
  },
});

registerKind('r_fireside', {
  contactY: 262,
  draw(ctx, art, r) {
    const knit = art.primary!;
    const wool = art.secondary!;
    for (const [x, h, lean] of [[6, 96, -10], [44, 120, 6], [84, 104, -4], [124, 128, 4], [166, 108, 8], [206, 92, 10]] as const) flame(ctx, x, 300, 52, h, lean);
    const up = () => shoePath(ctx, { bottom: 256, width: 100 });
    paint(ctx, up, skinBodyFill(ctx, knit), () => {
      ctx.fillStyle = wool;
      // zig-zag band
      for (const y0 of [20, 196]) {
        ctx.beginPath();
        ctx.moveTo(-10, y0 + 10);
        for (let x = -10; x <= 240; x += 16) ctx.lineTo(x + 8, y0 + ((x / 16) % 2 ? 0 : 16));
        ctx.lineTo(240, y0 + 26);
        ctx.lineTo(-10, y0 + 26);
        ctx.closePath();
        ctx.fill();
      }
      // snowflakes
      ctx.strokeStyle = wool;
      ctx.lineWidth = 4;
      for (const x of [44, 110, 176]) {
        const y = 112;
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(a) * 18, y - Math.sin(a) * 18);
          ctx.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18);
          ctx.stroke();
        }
        ellipse(ctx, x, y, 4, 4);
        ctx.fillStyle = knit;
        ctx.fill();
      }
      ctx.fillStyle = wool;
      for (let x = 10; x < 220; x += 18) {
        ellipse(ctx, x, 162, 3.5, 3.5);
        ctx.fill();
      }
      // knit stitches
      ctx.strokeStyle = rgba('#000000', 0.12);
      ctx.lineWidth = 1.5;
      for (let y = -4; y < 260; y += 9) {
        for (let x = 4 + ((y / 9) % 2) * 4; x < 220; x += 8) {
          ctx.beginPath();
          ctx.moveTo(x - 3, y);
          ctx.lineTo(x, y + 5);
          ctx.lineTo(x + 3, y);
          ctx.stroke();
        }
      }
      // firelight on the toe
      const g = ctx.createRadialGradient(CX, 270, 10, CX, 270, 120);
      g.addColorStop(0, rgba('#ffb03a', 0.55));
      g.addColorStop(1, rgba('#ffb03a', 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 140, 230, 130);
    }, OUT, outlineOf(knit));
    // flame tips in front
    for (const [x, h] of [[40, 52], [CX, 62], [180, 50]] as const) flame(ctx, x, 290, 30, h);
    // embers
    for (let i = 0; i < 7; i++) {
      const x = -20 + r() * 260;
      const y = 150 + r() * 100;
      ctx.save();
      ctx.shadowColor = '#ff8a1a';
      ctx.shadowBlur = 8;
      ellipse(ctx, x, y, 3, 3);
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
      ctx.restore();
    }
  },
});

// ——— Space ———

registerKind('r_magnet', {
  contactY: 304,
  draw(ctx, art) {
    const p = art.primary!;
    const red = art.secondary!;
    const u = () => {
      ctx.beginPath();
      ctx.moveTo(CX - 102, 304);
      ctx.lineTo(CX - 102, 214);
      ctx.arc(CX, 214, 102, Math.PI, Math.PI * 2);
      ctx.lineTo(CX + 102, 304);
      ctx.lineTo(CX + 50, 304);
      ctx.lineTo(CX + 50, 214);
      ctx.arc(CX, 214, 50, 0, Math.PI, true);
      ctx.lineTo(CX - 50, 304);
      ctx.closePath();
    };
    // field lines
    ctx.setLineDash([8, 7]);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(CX, 302, 76, 8 + k * 9, 0, 0.1, Math.PI - 0.1);
      ink(ctx, 7);
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // attracted bolts
    for (const [x, y, a] of [[-24, 286, 0.6], [244, 278, -0.5]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos((i / 6) * Math.PI * 2) * 11, Math.sin((i / 6) * Math.PI * 2) * 11);
      ctx.closePath();
      ctx.fillStyle = metal(ctx, -11, 11);
      ctx.fill();
      ink(ctx, 3);
      ellipse(ctx, 0, 0, 4.5, 4.5);
      ctx.fillStyle = '#4a4f58';
      ctx.fill();
      ctx.restore();
      zig(ctx, x + (x < 0 ? 16 : -16), y - 4, x + (x < 0 ? 34 : -34), y - 4, 3, 4, INK, 3);
    }
    // boot
    roundRect(ctx, CX - 100, 218, 200, 22, 8);
    ctx.fillStyle = metal(ctx, CX - 100, CX + 100, '#9aa3ad');
    ctx.fill();
    ink(ctx, 4);
    const up = () => shoePath(ctx, { bottom: 232, width: 96 });
    paint(ctx, up, leatherFill(ctx, p), () => {
      ctx.strokeStyle = rgba('#000', 0.35);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 150);
      ctx.lineTo(230, 150);
      ctx.moveTo(CX, 150);
      ctx.lineTo(CX, 240);
      ctx.stroke();
      ctx.save();
      ctx.shadowColor = '#4cc9f0';
      ctx.shadowBlur = 14;
      roundRect(ctx, 30, 176, 160, 9, 4);
      ctx.fillStyle = '#7fe6ff';
      ctx.fill();
      ctx.restore();
      glossy(ctx, CX - 40, 90, 30, 60, 0.25);
    });
    for (const y of [40, 100]) {
      roundRect(ctx, CX - 70, y, 140, 24, 8);
      ctx.fillStyle = shade(p, -0.3);
      ctx.fill();
      ink(ctx, 3.5);
      roundRect(ctx, CX + 40, y + 2, 24, 20, 4);
      ctx.fillStyle = red;
      ctx.fill();
      ink(ctx, 2.5);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(-40, 196, 300, 140);
    ctx.clip();
    paint(ctx, u, hGrad(ctx, CX - 102, CX + 102, red, 0.4, -0.4), () => {
      for (const x of [CX - 104, CX + 48]) {
        ctx.fillStyle = metal(ctx, x, x + 56);
        ctx.fillRect(x, 266, 56, 42);
        ctx.beginPath();
        ctx.moveTo(x, 266);
        ctx.lineTo(x + 56, 266);
        ink(ctx, 4);
      }
    });
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(CX - 104, 198);
    ctx.lineTo(CX - 48, 198);
    ctx.moveTo(CX + 48, 198);
    ctx.lineTo(CX + 104, 198);
    ink(ctx, 4);
  },
});

registerKind('r_gravity', {
  contactY: 278,
  halfWidth: 108,
  draw(ctx, art) {
    const p = art.primary!;
    const s = art.secondary!;
    // jets
    for (const x of [CX - 54, CX + 54]) {
      ctx.save();
      ctx.shadowColor = '#4cc9f0';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(x - 20, 272);
      ctx.bezierCurveTo(x - 22, 300, x - 8, 318, x, 334);
      ctx.bezierCurveTo(x + 8, 318, x + 22, 300, x + 20, 272);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, 272, 334, [[0, '#ffffff'], [0.4, '#7fe6ff'], [1, rgba('#2fa3ff', 0.1)]]);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(x - 9, 274);
      ctx.quadraticCurveTo(x, 312, x + 9, 274);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    roundRect(ctx, CX - 104, 228, 208, 26, 10);
    ctx.fillStyle = vGrad(ctx, 228, 254, [[0, '#b8c0cc'], [1, '#6a7280']]);
    ctx.fill();
    ink(ctx);
    const up = () => shoePath(ctx, { bottom: 244, width: 100 });
    paint(ctx, up, hGrad(ctx, 10, 210, p, 0.35, -0.3), () => {
      for (let y = 10; y < 110; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(CX, y + 10, 230, y);
        ink(ctx, 3, rgba('#5a6070', 0.45));
      }
      ellipse(ctx, CX, 246, 96, 52);
      ctx.fillStyle = hGrad(ctx, 10, 210, s, 0.3, -0.3);
      ctx.fill();
      ink(ctx, 3.5);
      glossy(ctx, CX - 40, 150, 30, 40, 0.5);
    });
    // mission patch
    ellipse(ctx, CX + 46, 140, 22, 22);
    ctx.fillStyle = radial(ctx, CX + 46, 140, 22, '#1d3a8a', 0.3);
    ctx.fill();
    ink(ctx, 3.5);
    starPath(ctx, CX + 46, 140, 10, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(CX + 46, 140, 17, 7, -0.4, 0, Math.PI * 2);
    ctx.strokeStyle = s;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // nozzles
    for (const x of [CX - 54, CX + 54]) {
      ctx.beginPath();
      ctx.moveTo(x - 13, 248);
      ctx.lineTo(x + 13, 248);
      ctx.lineTo(x + 22, 276);
      ctx.lineTo(x - 22, 276);
      ctx.closePath();
      ctx.fillStyle = metal(ctx, x - 22, x + 22, '#8a929c');
      ctx.fill();
      ink(ctx, 4);
      ellipse(ctx, x, 276, 21, 5);
      ctx.fillStyle = '#ff8a1a';
      ctx.fill();
      ink(ctx, 2.5);
    }
    sparkle(ctx, -22, 220, 10, '#ffffff', '#2fa3ff');
    sparkle(ctx, 244, 196, 8, '#ffffff', '#2fa3ff');
  },
});

registerKind('r_alienal', {
  contactY: 280,
  halfWidth: 110,
  draw(ctx, art, r) {
    const col = art.skin;
    const ol = outlineOf(col);
    for (const [bx, dir] of [[40, -1], [88, -1], [134, 1], [182, 1]] as const) {
      const pts = sampleCubic([bx, 180], [bx + dir * 4, 250], [bx + dir * 44, 290], [bx + dir * 46, 252], 22);
      ribbon(ctx, pts, 34, 10);
      ctx.fillStyle = radial(ctx, bx, 230, 50, col, 0.3, -0.3);
      ctx.fill();
      ink(ctx, OUT, ol);
      ctx.fillStyle = shade(col, 0.5);
      for (const k of [8, 12, 16]) {
        const [x, y] = pts[k];
        ellipse(ctx, x - dir * 6, y, 4, 3.5);
        ctx.fill();
        ink(ctx, 1.5, ol);
      }
    }
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(56, -6);
      ctx.bezierCurveTo(54, 58, 16, 104, 18, 168);
      ctx.bezierCurveTo(18, 200, 40, 214, CX, 216);
      ctx.bezierCurveTo(180, 214, 210, 200, 211, 158);
      ctx.bezierCurveTo(207, 98, 168, 58, 164, -6);
      ctx.closePath();
    };
    paint(ctx, body, skinBodyFill(ctx, col), () => {
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = rgba(shade(col, -0.3), 0.4);
        ellipse(ctx, 30 + r() * 170, 10 + r() * 200, 4 + r() * 8, 4 + r() * 6);
        ctx.fill();
      }
      const hl = ctx.createRadialGradient(CX, 60, 4, CX, 70, 90);
      hl.addColorStop(0, rgba('#ffffff', 0.3));
      hl.addColorStop(1, rgba('#ffffff', 0));
      ctx.fillStyle = hl;
      ctx.fillRect(0, -10, 230, 230);
    }, OUT, ol);
    // the eye
    ellipse(ctx, CX, 124, 50, 42);
    ctx.fillStyle = shade(col, -0.12);
    ctx.fill();
    ink(ctx, 4, ol);
    ellipse(ctx, CX, 128, 41, 33);
    ctx.fillStyle = radial(ctx, CX, 128, 40, '#ffffff', 0, -0.12);
    ctx.fill();
    ink(ctx, 3.5);
    ellipse(ctx, CX + 6, 132, 21, 21);
    ctx.fillStyle = radial(ctx, CX + 6, 132, 21, art.secondary!, 0.3, -0.4);
    ctx.fill();
    ink(ctx, 3);
    ellipse(ctx, CX + 6, 132, 6, 15);
    ctx.fillStyle = '#120a1a';
    ctx.fill();
    ellipse(ctx, CX - 6, 120, 7, 5, -0.4);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(CX, 124, 50, 42, 0, Math.PI + 0.25, Math.PI * 2 - 0.25);
    ink(ctx, 6, ol);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + 0.5 + i * 0.53;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a) * 50, 124 + Math.sin(a) * 42);
      ctx.lineTo(CX + Math.cos(a) * 62, 124 + Math.sin(a) * 54);
      ink(ctx, 4, ol);
    }
  },
});

registerKind('r_robosock', {
  contactY: 306,
  halfWidth: 100,
  draw(ctx, art) {
    const p = art.primary!;
    const led = art.secondary!;
    const drill = () => {
      ctx.beginPath();
      ctx.moveTo(CX - 58, 200);
      ctx.lineTo(CX + 58, 200);
      ctx.lineTo(CX + 4, 304);
      ctx.quadraticCurveTo(CX, 310, CX - 4, 304);
      ctx.closePath();
    };
    paint(ctx, drill, metal(ctx, CX - 58, CX + 58, '#d0d6de'), () => {
      for (let k = 0; k < 7; k++) {
        const y0 = 196 + k * 16;
        ctx.beginPath();
        ctx.moveTo(CX - 62, y0);
        ctx.quadraticCurveTo(CX - 6, y0 + 22, CX + 62, y0 + 6);
        ink(ctx, 5, rgba('#000000', 0.5));
        ctx.beginPath();
        ctx.moveTo(CX - 62, y0 + 5);
        ctx.quadraticCurveTo(CX - 6, y0 + 27, CX + 62, y0 + 11);
        ink(ctx, 2, rgba('#ffffff', 0.7));
      }
    });
    // spin marks
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(CX, 250, 76, sx < 0 ? Math.PI - 0.5 : -0.1, sx < 0 ? Math.PI + 0.1 : 0.5);
      ink(ctx, 4);
    }
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(54, -6);
      ctx.bezierCurveTo(52, 58, 16, 104, 18, 160);
      ctx.bezierCurveTo(18, 190, 40, 206, 64, 210);
      ctx.lineTo(156, 210);
      ctx.bezierCurveTo(180, 206, 206, 190, 206, 158);
      ctx.bezierCurveTo(204, 98, 168, 58, 166, -6);
      ctx.closePath();
    };
    paint(ctx, body, metal(ctx, 16, 208, p), () => {
      for (let y = 0; y < 210; y += 11) {
        ctx.fillStyle = rgba('#000000', 0.16);
        ctx.fillRect(0, y, 230, 4);
        ctx.fillStyle = rgba('#ffffff', 0.2);
        ctx.fillRect(0, y + 4, 230, 2);
      }
      ctx.fillStyle = rgba(shade(p, -0.5), 0.5);
      ellipse(ctx, CX, 176, 80, 34);
      ctx.fill();
      ctx.strokeStyle = rgba('#000', 0.5);
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
    roundRect(ctx, CX - 34, 36, 68, 42, 8);
    ctx.fillStyle = '#16161e';
    ctx.fill();
    ink(ctx, 3.5);
    ctx.save();
    ctx.shadowColor = led;
    ctx.shadowBlur = 12;
    ctx.font = '900 32px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = led;
    ctx.fillText('9', CX, 69);
    ctx.restore();
    for (const [x, y] of [[CX - 26, 44], [CX + 26, 44], [CX - 26, 70], [CX + 26, 70]] as const) {
      ellipse(ctx, x, y, 2.5, 2.5);
      ctx.fillStyle = '#5a626c';
      ctx.fill();
    }
    roundRect(ctx, CX - 72, 192, 144, 20, 8);
    ctx.fillStyle = metal(ctx, CX - 72, CX + 72, '#7a828e');
    ctx.fill();
    ink(ctx, 4);
    for (const x of [CX - 50, CX, CX + 50]) {
      ctx.save();
      ctx.shadowColor = led;
      ctx.shadowBlur = 8;
      ellipse(ctx, x, 202, 4, 4);
      ctx.fillStyle = led;
      ctx.fill();
      ctx.restore();
    }
  },
});

registerKind('r_comet', {
  draw(ctx, art, r) {
    const glow = art.primary!;
    const hot = art.secondary!;
    // blazing tail
    const tail = (shrink: number) => {
      ctx.beginPath();
      ctx.moveTo(14 + shrink, 226);
      ctx.bezierCurveTo(-30 + shrink * 1.6, 160, -26 + shrink * 1.6, 70, -38 + shrink * 2, -8);
      ctx.lineTo(258 - shrink * 2, -8);
      ctx.bezierCurveTo(246 - shrink * 1.6, 70, 250 - shrink * 1.6, 160, 206 - shrink, 226);
      ctx.closePath();
    };
    tail(0);
    ctx.fillStyle = vGrad(ctx, -8, 230, [[0, rgba(glow, 0)], [0.35, rgba(glow, 0.7)], [1, glow]]);
    ctx.fill();
    ctx.strokeStyle = vGrad(ctx, -8, 230, [[0, rgba(INK, 0)], [0.5, rgba(INK, 0.7)], [1, INK]]);
    ctx.lineWidth = OUT;
    ctx.stroke();
    tail(34);
    ctx.fillStyle = vGrad(ctx, -8, 230, [[0, rgba(hot, 0)], [0.45, rgba(hot, 0.8)], [1, '#ffffff']]);
    ctx.fill();
    // icy rock body
    const rock = mix(art.skin, '#5a6a80', 0.3);
    barePath(ctx, art);
    ctx.fillStyle = skinBodyFill(ctx, rock);
    ctx.fill();
    ctx.save();
    barePath(ctx, art);
    ctx.clip();
    for (const [x, y, s] of [[64, 70, 16], [150, 110, 22], [90, 168, 12], [170, 40, 10], [50, 140, 9]] as const) {
      ellipse(ctx, x, y, s, s * 0.8);
      ctx.fillStyle = shade(rock, -0.25);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.8, 0, 0.2, Math.PI - 0.2);
      ink(ctx, 3, shade(rock, 0.35));
    }
    for (let i = 0; i < 8; i++) {
      const x = 30 + r() * 170;
      const y = 20 + r() * 180;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x, y + 8);
      ctx.lineTo(x - 6, y);
      ctx.closePath();
      ctx.fillStyle = rgba('#e8f8ff', 0.85);
      ctx.fill();
    }
    ctx.restore();
    barePath(ctx, art, true);
    ink(ctx, OUT, outlineOf(rock));
    for (const t of toesFor(art)) {
      blob(ctx, t.cx, t.cy, (t.rx + t.ry) / 2, 0.3, r, 8);
      ctx.fillStyle = radial(ctx, t.cx, t.cy, t.ry, rock, 0.35, -0.3);
      ctx.fill();
      ink(ctx, OUT, outlineOf(rock));
    }
    // white-hot leading edge
    ctx.save();
    ctx.shadowColor = hot;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(28, 250);
    ctx.quadraticCurveTo(CX, 286, 206, 256);
    ctx.strokeStyle = rgba('#ffffff', 0.9);
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
    for (const [x, y, s] of [[-20, 250, 9], [240, 236, 11], [CX, 296, 7]] as const) sparkle(ctx, x, y, s, hot);
  },
});

registerKind('r_rover', {
  contactY: 274,
  halfWidth: 140,
  draw(ctx, art, r) {
    const p = art.primary!;
    const dust = art.secondary!;
    // solar panels
    for (const sx of [-1, 1]) {
      const X = (dx: number) => CX + sx * dx;
      const panel = () => {
        ctx.beginPath();
        ctx.moveTo(X(90), 84);
        ctx.lineTo(X(148), 72);
        ctx.lineTo(X(148), 142);
        ctx.lineTo(X(90), 150);
        ctx.closePath();
      };
      paint(ctx, panel, vGrad(ctx, 72, 150, [[0, '#3a6ad0'], [1, '#14246a']]), () => {
        ctx.strokeStyle = rgba('#9fd8ff', 0.7);
        ctx.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(X(90 + i * 14.5), 60);
          ctx.lineTo(X(90 + i * 14.5), 160);
          ctx.stroke();
        }
        for (const y of [100, 122]) {
          ctx.beginPath();
          ctx.moveTo(X(86), y + 4);
          ctx.lineTo(X(150), y - 6);
          ctx.stroke();
        }
      });
    }
    // rocker-bogie struts + wheels
    for (const x of [-12, 54, 166, 232]) {
      ctx.beginPath();
      ctx.moveTo(x < CX ? 40 : 180, 190);
      ctx.lineTo(x, 226);
      ink(ctx, 12);
      ctx.strokeStyle = '#9aa3ad';
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    for (const x of [-12, 54, 166, 232]) {
      roundRect(ctx, x - 24, 206, 48, 68, 14);
      ctx.fillStyle = hGrad(ctx, x - 24, x + 24, '#4a4f58', 0.3, -0.4);
      ctx.fill();
      ink(ctx, 4.5);
      ctx.strokeStyle = rgba('#1a1c20', 0.8);
      ctx.lineWidth = 3;
      for (let y = 214; y < 270; y += 10) {
        ctx.beginPath();
        ctx.moveTo(x - 20, y);
        ctx.lineTo(x, y + 5);
        ctx.lineTo(x + 20, y);
        ctx.stroke();
      }
      ellipse(ctx, x, 240, 9, 9);
      ctx.fillStyle = metal(ctx, x - 9, x + 9);
      ctx.fill();
      ink(ctx, 2.5);
    }
    // neck gimbal
    roundRect(ctx, CX - 48, -6, 96, 56, 10);
    ctx.fillStyle = metal(ctx, CX - 48, CX + 48, '#9aa3ad');
    ctx.fill();
    ink(ctx);
    // chassis
    const body = () => roundRect(ctx, 14, 40, 192, 172, 18);
    paint(ctx, body, hGrad(ctx, 14, 206, p, 0.25, -0.3), () => {
      for (let i = 0; i < 26; i++) {
        const x = 14 + r() * 192;
        const y = 40 + r() * 172;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 10 + r() * 16, y + (r() - 0.5) * 10);
        ctx.lineTo(x + r() * 10, y + 10 + r() * 10);
        ctx.closePath();
        ctx.fillStyle = rgba(r() > 0.5 ? '#ffffff' : '#a89a80', 0.25);
        ctx.fill();
      }
      ctx.fillStyle = vGrad(ctx, 120, 212, [[0, rgba(dust, 0)], [1, rgba(dust, 0.6)]]);
      ctx.fillRect(10, 120, 200, 100);
      ctx.strokeStyle = rgba('#000', 0.3);
      ctx.lineWidth = 2.5;
      ctx.strokeRect(34, 60, 72, 60);
      ctx.strokeRect(116, 60, 70, 60);
    });
    ctx.font = '900 20px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = shade(dust, -0.3);
    ctx.fillText('RORY', 70, 98);
    for (const x of [CX - 30, CX + 30]) {
      ellipse(ctx, x, 172, 11, 11);
      ctx.fillStyle = '#1a1c24';
      ctx.fill();
      ink(ctx, 3);
      ellipse(ctx, x - 3, 168, 3.5, 3.5);
      ctx.fillStyle = '#9fd8ff';
      ctx.fill();
    }
    // camera mast
    ctx.beginPath();
    ctx.moveTo(196, 50);
    ctx.lineTo(196, 10);
    ink(ctx, 12);
    ctx.strokeStyle = '#c7ccd4';
    ctx.lineWidth = 6;
    ctx.stroke();
    roundRect(ctx, 172, -6, 52, 28, 6);
    ctx.fillStyle = hGrad(ctx, 172, 224, p);
    ctx.fill();
    ink(ctx, 4);
    for (const x of [186, 210]) {
      ellipse(ctx, x, 8, 7, 7);
      ctx.fillStyle = '#16246a';
      ctx.fill();
      ink(ctx, 2.5);
    }
  },
});

registerKind('r_starlight', {
  contactY: 288,
  halfWidth: 100,
  draw(ctx, art, r) {
    const p = art.primary!;
    const gold = art.secondary!;
    const up = () => shoePath(ctx, { bottom: 266, width: 94, pointed: true });
    paint(ctx, up, leatherFill(ctx, p), () => {
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = rgba('#ffffff', 0.4 + r() * 0.6);
        ellipse(ctx, 10 + r() * 200, -6 + r() * 270, 1 + r() * 1.5, 1 + r() * 1.5);
        ctx.fill();
      }
      for (const [x, y, s] of [[60, 60, 9], [160, 90, 11], [80, 200, 8], [150, 180, 7], [120, 30, 7]] as const) sparkle(ctx, x, y, s, r() > 0.5 ? gold : '#ffffff', null);
      // crescent moon
      ellipse(ctx, CX - 40, 128, 22, 22);
      ctx.fillStyle = gold;
      ctx.fill();
      ellipse(ctx, CX - 30, 120, 19, 19);
      ctx.fillStyle = shade(p, 0.05);
      ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(60, 60);
      ctx.lineTo(120, 30);
      ctx.lineTo(160, 90);
      ctx.lineTo(150, 180);
      ctx.stroke();
      glossy(ctx, CX - 36, 200, 26, 40, 0.25);
    });
    // star pompom on the toe
    starPath(ctx, CX + 6, 262, 30, 13);
    ctx.fillStyle = radial(ctx, CX + 6, 262, 30, gold, 0.5, -0.3);
    ctx.fill();
    ink(ctx, 4);
    starPath(ctx, CX + 4, 258, 12, 5);
    ctx.fillStyle = rgba('#ffffff', 0.7);
    ctx.fill();
    for (const [x, y, s] of [[-20, 180, 12], [-8, 230, 8], [236, 160, 11], [246, 214, 7], [CX + 52, 298, 7]] as const) sparkle(ctx, x, y, s, gold);
  },
});

// ——— Kitchen ———

registerKind('r_thief', {
  draw(ctx, art) {
    const p = art.primary!;
    const gold = art.secondary!;
    // rope to the loot sack
    ctx.beginPath();
    ctx.moveTo(168, 26);
    ctx.quadraticCurveTo(206, 34, 222, 74);
    ink(ctx, 8);
    ctx.strokeStyle = '#c9a46a';
    ctx.lineWidth = 4;
    ctx.stroke();
    // split-toe tabi body
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(54, -6);
      ctx.bezierCurveTo(52, 58, 14, 104, 16, 168);
      ctx.lineTo(212, 160);
      ctx.bezierCurveTo(208, 98, 168, 58, 166, -6);
      ctx.closePath();
    };
    const lobeA = () => {
      ctx.beginPath();
      ctx.moveTo(16, 150);
      ctx.bezierCurveTo(10, 220, 40, 256, 88, 258);
      ctx.bezierCurveTo(130, 258, 150, 240, 152, 200);
      ctx.lineTo(152, 150);
      ctx.closePath();
    };
    const lobeB = () => {
      ctx.beginPath();
      ctx.moveTo(156, 150);
      ctx.lineTo(156, 214);
      ctx.bezierCurveTo(158, 250, 176, 264, 190, 262);
      ctx.bezierCurveTo(210, 260, 216, 230, 212, 150);
      ctx.closePath();
    };
    const fill = leatherFill(ctx, shade(p, 0.15));
    paint(ctx, lobeA, fill, () => glossy(ctx, 70, 210, 30, 14, 0.25));
    paint(ctx, lobeB, fill, () => glossy(ctx, 178, 220, 12, 14, 0.25));
    paint(ctx, body, fill, () => {
      ctx.strokeStyle = rgba('#ffffff', 0.18);
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX, 0);
      ctx.lineTo(CX + 4, 170);
      ctx.stroke();
      ctx.setLineDash([]);
      // ankle clasps
      for (const y of [20, 52, 84]) {
        roundRect(ctx, 150, y, 14, 8, 3);
        ctx.fillStyle = gold;
        ctx.fill();
      }
      glossy(ctx, CX - 44, 90, 22, 60, 0.2);
    });
    // the split between the toes
    ctx.beginPath();
    ctx.moveTo(154, 160);
    ctx.lineTo(154, 222);
    ink(ctx, 4.5);
    // loot sack
    const sack = () => {
      ctx.beginPath();
      ctx.moveTo(212, 76);
      ctx.bezierCurveTo(186, 104, 190, 176, 224, 182);
      ctx.bezierCurveTo(258, 178, 262, 104, 236, 76);
      ctx.quadraticCurveTo(224, 70, 212, 76);
      ctx.closePath();
    };
    paint(ctx, sack, radial(ctx, 220, 132, 50, '#b8905a', 0.35, -0.35), () => {
      ctx.strokeStyle = rgba('#6a4a2a', 0.5);
      ctx.lineWidth = 2;
      for (const x of [206, 222, 240]) {
        ctx.beginPath();
        ctx.moveTo(x, 90);
        ctx.quadraticCurveTo(x - 4, 130, x + 2, 176);
        ctx.stroke();
      }
    });
    for (const [x0, x1, x2] of [[214, 204, 222], [234, 246, 228]] as const) {
      ctx.beginPath();
      ctx.moveTo(x0, 76);
      ctx.lineTo(x1, 54);
      ctx.lineTo(x2, 68);
      ctx.closePath();
      ctx.fillStyle = '#c9a46a';
      ctx.fill();
      ink(ctx, 3);
    }
    ellipse(ctx, 224, 78, 15, 6);
    ctx.fillStyle = '#8a6a3a';
    ctx.fill();
    ink(ctx, 3);
    ctx.font = '900 34px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.strokeText('$', 224, 148);
    ctx.fillStyle = gold;
    ctx.fillText('$', 224, 148);
    for (const [x, y] of [[196, 188], [212, 196]] as const) {
      ellipse(ctx, x, y, 9, 5);
      ctx.fillStyle = radial(ctx, x, y, 9, gold);
      ctx.fill();
      ink(ctx, 2.5);
    }
  },
});

function fly(ctx: Ctx, x: number, y: number, rot: number, s = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  for (const sx of [-1, 1]) {
    ellipse(ctx, sx * 8, -8, 9, 6, sx * 0.6);
    ctx.fillStyle = rgba('#ffffff', 0.85);
    ctx.fill();
    ink(ctx, 2, rgba(INK, 0.8));
  }
  ellipse(ctx, 0, 0, 6, 8.5);
  ctx.fillStyle = '#1e1a18';
  ctx.fill();
  ink(ctx, 2);
  for (const sx of [-1, 1]) {
    ellipse(ctx, sx * 4, -7, 3.2, 3.2);
    ctx.fillStyle = '#d8343f';
    ctx.fill();
  }
  ctx.restore();
}

registerKind('r_fruitfly', {
  draw(ctx, art, r) {
    const bruise = art.primary!;
    const mould = art.secondary!;
    // buzzing paths
    ctx.setLineDash([3, 6]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rgba(INK, 0.6);
    for (const [x, y, rx, ry] of [[-8, 80, 26, 18], [230, 60, 24, 20], [-10, 190, 22, 16], [236, 180, 20, 22]] as const) {
      ellipse(ctx, x, y, rx, ry, 0.4);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    drawBareBody(ctx, art, r);
    ctx.save();
    barePath(ctx, art);
    ctx.clip();
    for (let i = 0; i < 11; i++) {
      ellipse(ctx, 30 + r() * 170, 20 + r() * 190, 6 + r() * 14, 5 + r() * 10, r() * 3);
      ctx.fillStyle = rgba(bruise, 0.35 + r() * 0.3);
      ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rgba(bruise, 0.6);
      ctx.fillRect(30 + r() * 170, 20 + r() * 190, 2.5, 2.5);
    }
    for (const [x, y] of [[60, 130], [160, 70]] as const) {
      for (let k = 0; k < 12; k++) {
        ellipse(ctx, x + (r() - 0.5) * 30, y + (r() - 0.5) * 20, 3 + r() * 4, 3 + r() * 4);
        ctx.fillStyle = rgba(k % 2 ? '#eef6d8' : mould, 0.75);
        ctx.fill();
      }
    }
    ctx.restore();
    for (const t of toesFor(art)) {
      drawToe(ctx, t, mix(art.skin, bruise, 0.25), { nail: art.nails, r });
      ellipse(ctx, t.cx + t.rx * 0.2, t.cy - t.ry * 0.2, t.rx * 0.35, t.ry * 0.25, 0.4);
      ctx.fillStyle = rgba(bruise, 0.45);
      ctx.fill();
    }
    // stink lines
    ctx.lineCap = 'round';
    for (const x of [70, 150]) {
      ctx.beginPath();
      ctx.moveTo(x, 270);
      ctx.bezierCurveTo(x - 12, 284, x + 12, 296, x, 312);
      ink(ctx, 5, rgba('#6a7a2a', 0.7));
    }
    for (const [x, y, a, s] of [[-8, 62, -0.4, 1.1], [232, 42, 0.5, 1], [-14, 182, 0.2, 1], [242, 168, -0.3, 1.1], [24, 284, 0.8, 0.9], [196, 290, -0.6, 0.9], [120, 40, 0.1, 0.9]] as const) fly(ctx, x, y, a, s);
  },
});

registerKind('r_dough', {
  contactY: 268,
  draw(ctx, art, r) {
    const dough = art.primary!;
    const ol = mix(shade(dough, -0.6), INK, 0.45);
    // stretched strand
    const strand = sampleCubic([44, 230], [30, 262], [20, 280], [16, 300], 14);
    ribbon(ctx, strand, 22, 10);
    ctx.fillStyle = hGrad(ctx, 0, 60, dough, 0.2, -0.25);
    ctx.fill();
    ink(ctx, 4, ol);
    ellipse(ctx, 16, 304, 14, 12);
    ctx.fillStyle = radial(ctx, 16, 304, 14, dough);
    ctx.fill();
    ink(ctx, 4, ol);
    const pts: Pt[] = [
      [56, -10], [50, 40], [32, 84], [18, 126], [10, 170], [20, 206], [40, 232], [62, 250],
      [86, 258], [108, 250], [126, 262], [150, 258], [170, 266], [196, 254], [214, 222],
      [218, 180], [210, 130], [196, 82], [172, 44], [166, -10], [110, -16],
    ];
    paint(ctx, () => smoothPath(ctx, pts), radial(ctx, CX - 20, 110, 140, dough, 0.2, -0.2), () => {
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = rgba('#ffffff', 0.35 + r() * 0.4);
        ellipse(ctx, 10 + r() * 210, r() * 260, 1 + r() * 2, 1 + r() * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba('#ffffff', 0.45);
      blob(ctx, 70, 60, 26, 0.5, r, 9);
      ctx.fill();
      blob(ctx, 170, 150, 20, 0.5, r, 9);
      ctx.fill();
      // bubbles
      for (const [x, y, s] of [[130, 60, 7], [60, 170, 6], [176, 200, 5], [100, 120, 4]] as const) {
        ellipse(ctx, x, y, s, s);
        ctx.fillStyle = shade(dough, 0.15);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, s, 0.2, Math.PI - 0.2);
        ink(ctx, 2, rgba(ol, 0.5));
      }
      // fingerprint poke
      ctx.strokeStyle = rgba(ol, 0.35);
      ctx.lineWidth = 2;
      for (let k = 1; k <= 4; k++) {
        ctx.beginPath();
        ctx.ellipse(138, 126, k * 4.5, k * 5.5, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      // toe creases
      ctx.strokeStyle = rgba(ol, 0.5);
      ctx.lineWidth = 3;
      for (const [x, y] of [[74, 236], [116, 240], [160, 240]] as const) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 4, y + 10, x + 2, y + 20);
        ctx.stroke();
      }
    }, OUT, ol);
    // stuck-on pepperoni
    ellipse(ctx, 62, 108, 20, 18);
    ctx.fillStyle = radial(ctx, 62, 108, 20, '#c8361f', 0.3, -0.35);
    ctx.fill();
    ink(ctx, 3.5);
    ctx.fillStyle = rgba('#ffd2b0', 0.7);
    for (const [dx, dy] of [[-6, -4], [6, 2], [-2, 8], [8, -8]] as const) {
      ellipse(ctx, 62 + dx, 108 + dy, 2.5, 2);
      ctx.fill();
    }
  },
});

// ——— Old Town ———

registerKind('r_pigeon', {
  contactY: 276,
  halfWidth: 100,
  draw(ctx, art) {
    const pink = art.skin;
    const grey = art.primary!;
    const ol = outlineOf(pink);
    const palm: Pt = [CX, 150];
    const tips: Pt[] = [[CX - 92, 246], [CX + 2, 268], [CX + 94, 244]];
    ctx.lineCap = 'round';
    for (const [tx, ty] of tips) {
      ctx.beginPath();
      ctx.moveTo(palm[0], palm[1]);
      ctx.lineTo(tx, ty);
      ink(ctx, 36, ol);
      ctx.strokeStyle = pink;
      ctx.lineWidth = 26;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.28);
      ctx.lineWidth = 6;
      ctx.stroke();
      // scale rings
      const dx = tx - palm[0];
      const dy = ty - palm[1];
      const len = Math.hypot(dx, dy);
      const nx = -dy / len;
      const ny = dx / len;
      ctx.strokeStyle = rgba(ol, 0.6);
      ctx.lineWidth = 2.5;
      for (let k = 0.3; k < 0.95; k += 0.12) {
        const x = palm[0] + dx * k;
        const y = palm[1] + dy * k;
        ctx.beginPath();
        ctx.moveTo(x - nx * 11, y - ny * 11);
        ctx.quadraticCurveTo(x + (dx / len) * 4, y + (dy / len) * 4, x + nx * 11, y + ny * 11);
        ctx.stroke();
      }
      // talon
      const ux = dx / len;
      const uy = dy / len;
      ctx.beginPath();
      ctx.moveTo(tx - nx * 9, ty - ny * 9);
      ctx.quadraticCurveTo(tx + ux * 20, ty + uy * 20, tx + ux * 24 + nx * 6, ty + uy * 24 + ny * 6);
      ctx.quadraticCurveTo(tx + ux * 8 + nx * 6, ty + uy * 8 + ny * 6, tx + nx * 9, ty + ny * 9);
      ctx.closePath();
      ctx.fillStyle = '#2a2420';
      ctx.fill();
      ink(ctx, 2.5);
    }
    ellipse(ctx, palm[0], palm[1] + 4, 38, 32);
    ctx.fillStyle = radial(ctx, palm[0], palm[1], 36, pink);
    ctx.fill();
    ink(ctx, OUT, ol);
    // feather trousers
    const pants = () => {
      ctx.beginPath();
      ctx.moveTo(52, -6);
      ctx.bezierCurveTo(44, 40, 14, 80, 16, 122);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const x0 = 16 + (i / n) * 188;
        const x1 = 16 + ((i + 1) / n) * 188;
        ctx.quadraticCurveTo((x0 + x1) / 2, 150 + (i % 2) * 6, x1, 122);
      }
      ctx.bezierCurveTo(206, 80, 176, 40, 168, -6);
      ctx.closePath();
    };
    paint(ctx, pants, skinBodyFill(ctx, grey), () => {
      ctx.fillStyle = vGrad(ctx, -6, 50, [[0, rgba(art.secondary!, 0.95)], [0.5, rgba('#9a5ad0', 0.7)], [1, rgba('#9a5ad0', 0)]]);
      ctx.fillRect(0, -10, 230, 60);
      for (let row = 0; row < 3; row++) {
        const y = 50 + row * 26;
        for (let i = 0; i < 7; i++) {
          const x = 20 + i * 30 + (row % 2) * 15;
          ctx.beginPath();
          ctx.arc(x, y, 16, 0.2, Math.PI - 0.2);
          ink(ctx, 2.5, rgba(shade(grey, -0.5), 0.6));
          ctx.beginPath();
          ctx.arc(x, y - 2, 12, 0.4, Math.PI - 0.4);
          ink(ctx, 2, rgba('#ffffff', 0.35));
        }
      }
    }, OUT, outlineOf(grey));
  },
});

registerKind('r_chimney', {
  contactY: 266,
  draw(ctx, art, r) {
    const brick = art.primary!;
    const soot = art.secondary!;
    puff(ctx, [[-14, 20, 18], [-26, 44, 14], [-4, 52, 12]], radial(ctx, -14, 30, 30, '#5a5a60', 0.3), INK, 3);
    puff(ctx, [[236, 6, 16], [246, 34, 13], [226, 40, 11]], radial(ctx, 236, 20, 30, '#5a5a60', 0.3), INK, 3);
    // opening
    ellipse(ctx, CX, 42, 96, 16);
    ctx.fillStyle = '#141414';
    ctx.fill();
    // sooty ankle
    const ankle = () => {
      ctx.beginPath();
      ctx.moveTo(54, -6);
      ctx.lineTo(166, -6);
      ctx.lineTo(170, 48);
      ctx.lineTo(50, 48);
      ctx.closePath();
    };
    paint(ctx, ankle, skinBodyFill(ctx, art.skin), () => {
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = rgba(soot, 0.25 + r() * 0.3);
        ellipse(ctx, 54 + r() * 112, r() * 50, 6 + r() * 12, 4 + r() * 8, r() * 3);
        ctx.fill();
      }
      ctx.fillStyle = vGrad(ctx, 10, 48, [[0, rgba(soot, 0)], [1, rgba(soot, 0.8)]]);
      ctx.fillRect(40, 10, 140, 40);
    }, OUT, outlineOf(art.skin));
    // stack
    const stack = () => roundRect(ctx, 14, 52, 192, 212, 6);
    paint(ctx, stack, '#d8c8b0', () => {
      const bh = 24;
      for (let row = 0; row * bh < 220; row++) {
        const y = 54 + row * bh;
        const off = row % 2 ? 22 : 0;
        for (let x = 10 - off; x < 214; x += 44) {
          roundRect(ctx, x + 2, y + 2, 40, bh - 4, 3);
          ctx.fillStyle = vGrad(ctx, y, y + bh, [[0, shade(brick, 0.12 + r() * 0.1)], [1, shade(brick, -0.15 - r() * 0.15)]]);
          ctx.fill();
        }
      }
      ctx.fillStyle = vGrad(ctx, 52, 160, [[0, rgba(soot, 0.75)], [1, rgba(soot, 0)]]);
      ctx.fillRect(10, 52, 200, 110);
      const side = ctx.createLinearGradient(14, 0, 206, 0);
      side.addColorStop(0, rgba('#000000', 0.3));
      side.addColorStop(0.4, rgba('#000000', 0));
      side.addColorStop(1, rgba('#000000', 0.35));
      ctx.fillStyle = side;
      ctx.fillRect(10, 52, 200, 220);
    });
    // cap ledge
    roundRect(ctx, 2, 34, 216, 30, 6);
    ctx.fillStyle = vGrad(ctx, 34, 64, [[0, '#9aa0a8'], [1, '#5a6068']]);
    ctx.fill();
    ink(ctx);
    ctx.save();
    roundRect(ctx, 2, 34, 216, 30, 6);
    ctx.clip();
    ctx.fillStyle = rgba(soot, 0.5);
    ctx.fillRect(40, 30, 140, 12);
    ctx.restore();
    // the ankle re-enters the chimney behind the ledge front
    ctx.beginPath();
    ctx.moveTo(50, 36);
    ctx.lineTo(170, 36);
    ink(ctx, 4, rgba('#000', 0.6));
  },
});

registerKind('r_rainy', {
  draw(ctx, art, r) {
    drawBare(ctx, art, r);
    for (let i = 0; i < 8; i++) drop(ctx, 40 + r() * 140, 90 + r() * 110, 3.5 + r() * 2, rgba('#d8f4ff', 0.85), rgba('#3a7a9a', 0.85), 1.5);
    // falling rain at the canopy edges
    for (const [x, y] of [[-26, 110], [-18, 160], [-30, 210], [244, 104], [236, 156], [250, 206]] as const) drop(ctx, x, y, 6, '#8fd3ff', '#2a6a9a', 2.5);
    // puddle splash
    for (const [x, y, s] of [[18, 258, 5], [6, 244, 4], [204, 262, 5], [220, 246, 4], [CX, 282, 4]] as const) drop(ctx, x, y, s, '#8fd3ff', '#2a6a9a', 2);
    // umbrella canopy
    const canopy = () => {
      ctx.beginPath();
      ctx.moveTo(-36, 66);
      ctx.bezierCurveTo(-30, 18, 36, -6, CX, -6);
      ctx.bezierCurveTo(184, -6, 250, 18, 256, 66);
      const n = 6;
      const w = 292 / n;
      for (let i = 0; i < n; i++) {
        const x0 = 256 - i * w;
        const x1 = x0 - w;
        ctx.quadraticCurveTo((x0 + x1) / 2, 46, x1, 66);
      }
      ctx.closePath();
    };
    paint(ctx, canopy, art.primary!, () => {
      const n = 6;
      const w = 292 / n;
      for (let i = 0; i < n; i++) {
        if (i % 2) continue;
        const x0 = -36 + i * w;
        ctx.beginPath();
        ctx.moveTo(CX, -40);
        ctx.lineTo(x0, 80);
        ctx.lineTo(x0 + w, 80);
        ctx.closePath();
        ctx.fillStyle = art.secondary!;
        ctx.fill();
      }
      const sh = ctx.createLinearGradient(-36, 0, 256, 0);
      sh.addColorStop(0, rgba('#000', 0.3));
      sh.addColorStop(0.4, rgba('#fff', 0.2));
      sh.addColorStop(1, rgba('#000', 0.35));
      ctx.fillStyle = sh;
      ctx.fillRect(-40, -10, 300, 90);
      ctx.strokeStyle = rgba(INK, 0.6);
      ctx.lineWidth = 3;
      for (let i = 0; i <= n; i++) {
        ctx.beginPath();
        ctx.moveTo(CX, -6);
        ctx.quadraticCurveTo(CX + (-36 + i * w - CX) * 0.6, 10, -36 + i * w, 66);
        ctx.stroke();
      }
    });
    ellipse(ctx, CX, -2, 9, 6);
    ctx.fillStyle = '#c7ccd4';
    ctx.fill();
    ink(ctx, 3);
  },
});

// ——— Pier ———

registerKind('r_gymbro', {
  contactY: 266,
  draw(ctx, art) {
    const skin = art.skin;
    const neon = art.primary!;
    const pinkc = art.secondary!;
    const ol = outlineOf(skin);
    const calf = () => {
      ctx.beginPath();
      ctx.moveTo(56, -6);
      ctx.bezierCurveTo(18, 4, -16, 40, -8, 84);
      ctx.bezierCurveTo(-2, 118, 30, 128, 42, 136);
      ctx.lineTo(178, 136);
      ctx.bezierCurveTo(194, 126, 228, 112, 230, 76);
      ctx.bezierCurveTo(234, 34, 198, 2, 164, -6);
      ctx.closePath();
    };
    paint(ctx, calf, hGrad(ctx, -14, 234, skin, 0.2, -0.32), () => {
      ctx.fillStyle = rgba('#ffffff', 0.28);
      ellipse(ctx, 70, 54, 56, 44, 0.15);
      ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.6);
      ellipse(ctx, 40, 40, 10, 20, 0.4);
      ctx.fill();
      ctx.fillStyle = rgba(shade(skin, -0.5), 0.25);
      ellipse(ctx, 190, 70, 30, 46, -0.2);
      ctx.fill();
      ctx.strokeStyle = rgba(ol, 0.55);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(10, 100);
      ctx.quadraticCurveTo(40, 112, 64, 104);
      ctx.moveTo(210, 96);
      ctx.quadraticCurveTo(180, 112, 156, 104);
      ctx.stroke();
      ctx.strokeStyle = rgba('#5a7ad0', 0.45);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(150, 12);
      ctx.bezierCurveTo(162, 40, 140, 60, 156, 96);
      ctx.moveTo(156, 60);
      ctx.lineTo(176, 76);
      ctx.stroke();
    }, OUT, ol);
    // tube sock
    const sock = () => {
      ctx.beginPath();
      ctx.moveTo(38, 120);
      ctx.quadraticCurveTo(CX, 136, 182, 120);
      ctx.lineTo(190, 204);
      ctx.quadraticCurveTo(CX, 218, 30, 204);
      ctx.closePath();
    };
    paint(ctx, sock, hGrad(ctx, 30, 190, '#f7f5ef', 0.3, -0.18), () => {
      for (const [y, c] of [[132, neon], [150, pinkc]] as const) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.quadraticCurveTo(CX, y + 16, 200, y);
        ctx.lineTo(200, y + 10);
        ctx.quadraticCurveTo(CX, y + 26, 20, y + 10);
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
      }
      ctx.strokeStyle = rgba('#000', 0.07);
      ctx.lineWidth = 2;
      for (let x = 30; x < 200; x += 7) {
        ctx.beginPath();
        ctx.moveTo(x, 110);
        ctx.lineTo(x, 220);
        ctx.stroke();
      }
    });
    // trainer
    roundRect(ctx, CX - 108, 230, 216, 34, 16);
    ctx.fillStyle = vGrad(ctx, 230, 264, [[0, '#ffffff'], [1, '#c9ced6']]);
    ctx.fill();
    ink(ctx);
    roundRect(ctx, CX + 20, 238, 60, 16, 8);
    ctx.fillStyle = rgba(pinkc, 0.7);
    ctx.fill();
    ink(ctx, 3);
    paint(ctx, () => lowShoePath(ctx, 186, 246, 104), leatherFill(ctx, neon), () => {
      ctx.beginPath();
      ctx.moveTo(10, 214);
      ctx.lineTo(70, 196);
      ctx.lineTo(62, 214);
      ctx.lineTo(130, 200);
      ctx.lineTo(118, 222);
      ctx.lineTo(206, 206);
      ctx.lineTo(206, 220);
      ctx.lineTo(10, 232);
      ctx.closePath();
      ctx.fillStyle = pinkc;
      ctx.fill();
      ink(ctx, 3);
      glossy(ctx, CX - 40, 200, 30, 10, 0.5);
    });
    roundRect(ctx, CX - 24, 178, 48, 30, 8);
    ctx.fillStyle = shade(neon, 0.2);
    ctx.fill();
    ink(ctx, 3);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(CX - 16, 188 + (sx + 1) * 5);
      ctx.lineTo(CX + 16, 188 + (1 - sx) * 5);
      ink(ctx, 6);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    sparkle(ctx, -24, 24, 12, '#ffffff');
    sparkle(ctx, 246, 28, 10, '#ffffff');
  },
});

function crabClaw(ctx: Ctx, x: number, y: number, sx: number, shell: string, belly: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx * 1.35, 1.35);
  ctx.beginPath();
  ctx.moveTo(-34, 30);
  ctx.quadraticCurveTo(-8, 18, 0, 0);
  ink(ctx, 24);
  ctx.strokeStyle = shell;
  ctx.lineWidth = 15;
  ctx.stroke();
  // lower (moving) finger
  ctx.beginPath();
  ctx.moveTo(12, 8);
  ctx.bezierCurveTo(30, 24, 48, 22, 58, 8);
  ctx.bezierCurveTo(46, 12, 34, 8, 26, -2);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, 36, 12, 22, shell, 0.35);
  ctx.fill();
  ink(ctx, 3.5);
  // palm
  ellipse(ctx, 8, -4, 28, 22, -0.35);
  ctx.fillStyle = radial(ctx, 8, -4, 28, shell, 0.45, -0.35);
  ctx.fill();
  ink(ctx, 4);
  // fixed finger
  ctx.beginPath();
  ctx.moveTo(22, -20);
  ctx.bezierCurveTo(40, -42, 58, -38, 64, -24);
  ctx.bezierCurveTo(52, -24, 40, -16, 32, -6);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, 42, -26, 24, shell, 0.35);
  ctx.fill();
  ink(ctx, 3.5);
  ctx.fillStyle = belly;
  for (const [tx, ty] of [[40, -20], [48, -22], [36, 10], [44, 12]] as const) {
    ellipse(ctx, tx, ty, 2.5, 2.5);
    ctx.fill();
  }
  ellipse(ctx, 2, 2, 14, 9, -0.35);
  ctx.fillStyle = rgba(belly, 0.7);
  ctx.fill();
  ctx.restore();
}

registerKind('r_crab', {
  halfWidth: 112,
  draw(ctx, art, r) {
    const shell = art.primary!;
    const belly = art.secondary!;
    crabClaw(ctx, CX - 96, 124, -1, shell, belly);
    crabClaw(ctx, CX + 96, 124, 1, shell, belly);
    roundRect(ctx, 6, 230, 218, 28, 12);
    ctx.fillStyle = leatherFill(ctx, shade(shell, -0.15));
    ctx.fill();
    ink(ctx);
    drawBareBody(ctx, art, r);
    const strap = (y: number, sag: number, w: number) => {
      ctx.save();
      barePath(ctx, art);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(CX, y + sag, 230, y);
      ink(ctx, w + 7);
      ctx.strokeStyle = shell;
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.3);
      ctx.lineWidth = 4;
      ctx.setLineDash([3, 14]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };
    strap(70, 14, 26);
    strap(150, 16, 22);
    bareToes(ctx, art, r);
    // eyes on stalks
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(CX + sx * 16, 76);
      ctx.lineTo(CX + sx * 24, 34);
      ink(ctx, 12);
      ctx.strokeStyle = shell;
      ctx.lineWidth = 6;
      ctx.stroke();
      ellipse(ctx, CX + sx * 24, 30, 10, 11);
      ctx.fillStyle = '#16120e';
      ctx.fill();
      ink(ctx, 3);
      ellipse(ctx, CX + sx * 24 - 3, 26, 3.5, 3.5);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  },
});

registerKind('r_lifeguard', {
  contactY: 264,
  draw(ctx, art, r) {
    const red = art.primary!;
    roundRect(ctx, 2, 226, 226, 38, 14);
    ctx.fillStyle = vGrad(ctx, 226, 264, [[0, shade(red, 0.2)], [1, shade(red, -0.3)]]);
    ctx.fill();
    ink(ctx);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 238, 214, 7);
    drawBareBody(ctx, art, r);
    const strap = () => {
      ctx.beginPath();
      ctx.moveTo(4, 96);
      ctx.quadraticCurveTo(CX, 128, 216, 96);
      ctx.lineTo(222, 172);
      ctx.quadraticCurveTo(CX, 204, -2, 172);
      ctx.closePath();
    };
    paint(ctx, strap, leatherFill(ctx, red), () => {
      ctx.strokeStyle = rgba('#ffffff', 0.7);
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(4, 106);
      ctx.quadraticCurveTo(CX, 138, 216, 106);
      ctx.moveTo(2, 162);
      ctx.quadraticCurveTo(CX, 194, 220, 162);
      ctx.stroke();
      ctx.setLineDash([]);
      glossy(ctx, CX - 50, 130, 30, 12, 0.35);
    });
    const cross = () => {
      ctx.beginPath();
      ctx.rect(CX - 12, 116, 24, 64);
      ctx.rect(CX - 32, 136, 64, 24);
    };
    cross();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(CX - 12, 116);
    ctx.lineTo(CX + 12, 116);
    ctx.lineTo(CX + 12, 136);
    ctx.lineTo(CX + 32, 136);
    ctx.lineTo(CX + 32, 160);
    ctx.lineTo(CX + 12, 160);
    ctx.lineTo(CX + 12, 180);
    ctx.lineTo(CX - 12, 180);
    ctx.lineTo(CX - 12, 160);
    ctx.lineTo(CX - 32, 160);
    ctx.lineTo(CX - 32, 136);
    ctx.lineTo(CX - 12, 136);
    ctx.closePath();
    ink(ctx, 3.5);
    bareToes(ctx, art, r);
    // zinc stripe on the big toe
    const big = toesFor(art)[4];
    roundRect(ctx, big.cx - 18, big.cy - 16, 36, 9, 4);
    ctx.fillStyle = rgba('#ffffff', 0.92);
    ctx.fill();
    // lanyard + whistle
    ctx.beginPath();
    ctx.moveTo(46, 12);
    ctx.quadraticCurveTo(CX, 56, 176, 12);
    ink(ctx, 9);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = red;
    ctx.setLineDash([7, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(146, 30);
    ctx.lineTo(150, 50);
    ink(ctx, 4);
    ctx.save();
    ctx.translate(156, 64);
    ctx.rotate(0.35);
    roundRect(ctx, -4, -9, 34, 14, 4);
    ctx.fillStyle = metal(ctx, -4, 30, '#d6dbe2');
    ctx.fill();
    ink(ctx, 3);
    ellipse(ctx, 0, 2, 15, 13);
    ctx.fillStyle = radial(ctx, 0, 2, 15, '#d6dbe2', 0.6);
    ctx.fill();
    ink(ctx, 3);
    ellipse(ctx, 0, 2, 5, 5);
    ctx.fillStyle = '#3a3f47';
    ctx.fill();
    ctx.restore();
  },
});

registerKind('r_surf', {
  draw(ctx, art, r) {
    const board = art.primary!;
    const teal = art.secondary!;
    ctx.save();
    ctx.translate(CX, 162);
    ctx.rotate(0.74);
    ctx.scale(1.18, 1.3);
    const b = () => {
      ctx.beginPath();
      ctx.moveTo(-160, 0);
      ctx.bezierCurveTo(-150, -40, 60, -44, 162, 0);
      ctx.bezierCurveTo(60, 44, -150, 40, -160, 0);
      ctx.closePath();
    };
    paint(ctx, b, vGrad(ctx, -44, 44, [[0, shade(board, 0.35)], [0.5, board], [1, shade(board, -0.3)]]), () => {
      ctx.fillStyle = teal;
      ctx.fillRect(90, -50, 26, 100);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-170, -3, 340, 6);
      ctx.fillStyle = rgba('#ffffff', 0.5);
      ellipse(ctx, -40, -22, 60, 6, 0.04);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(-140, 16);
    ctx.lineTo(-118, 44);
    ctx.lineTo(-108, 20);
    ctx.closePath();
    ctx.fillStyle = '#2a3a4a';
    ctx.fill();
    ink(ctx, 3);
    ctx.restore();
    drawBare(ctx, art, r);
    // leash cuff + coiled cord
    const cuff = () => {
      ctx.beginPath();
      ctx.moveTo(50, 16);
      ctx.quadraticCurveTo(CX, 34, 170, 16);
      ctx.lineTo(172, 44);
      ctx.quadraticCurveTo(CX, 62, 48, 44);
      ctx.closePath();
    };
    paint(ctx, cuff, hGrad(ctx, 48, 172, shade(teal, -0.3)), () => {
      roundRect(ctx, 130, 20, 30, 36, 4);
      ctx.fillStyle = rgba('#000', 0.25);
      ctx.fill();
    });
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      ellipse(ctx, 176 + t * 64, 46 + t * 104, 11, 7, 0.9);
      ink(ctx, 7);
      ctx.strokeStyle = teal;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    // spray
    for (const [x, y, s] of [[-24, 250, 6], [-10, 276, 5], [10, 292, 4], [234, 96, 5], [250, 74, 4]] as const) drop(ctx, x, y, s, '#bfe8ff', '#2a6a9a', 2);
    puff(ctx, [[-14, 236, 14], [6, 252, 12], [-30, 262, 10]], '#ffffff', '#5aa8d8', 3);
  },
});

// ——— Rink ———

registerKind('r_pogo', {
  contactY: 314,
  draw(ctx, art) {
    const blue = art.secondary!;
    const coil = (front: boolean) => {
      for (let i = 0; i < 8; i++) {
        const y = 214 + i * 10;
        ctx.beginPath();
        ctx.ellipse(CX, y, 40, 8, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        ink(ctx, 9);
        ctx.strokeStyle = front ? '#d6dbe2' : '#8a929c';
        ctx.lineWidth = 5;
        ctx.stroke();
        if (front) {
          ctx.strokeStyle = rgba('#ffffff', 0.8);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    };
    coil(false);
    roundRect(ctx, CX - 8, 196, 16, 104, 4);
    ctx.fillStyle = metal(ctx, CX - 8, CX + 8);
    ctx.fill();
    ink(ctx, 3);
    coil(true);
    roundRect(ctx, CX - 24, 292, 48, 24, 11);
    ctx.fillStyle = vGrad(ctx, 292, 316, [[0, '#4a4a52'], [1, '#141418']]);
    ctx.fill();
    ink(ctx, 4);
    // bounce lines
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(CX, 300, 52, sx < 0 ? Math.PI - 0.15 : -0.35, sx < 0 ? Math.PI + 0.35 : 0.15);
      ink(ctx, 4);
      ctx.beginPath();
      ctx.arc(CX, 300, 66, sx < 0 ? Math.PI - 0.12 : -0.3, sx < 0 ? Math.PI + 0.3 : 0.12);
      ink(ctx, 4);
    }
    roundRect(ctx, CX - 114, 192, 228, 20, 8);
    ctx.fillStyle = vGrad(ctx, 192, 212, [[0, shade(blue, 0.3)], [1, shade(blue, -0.35)]]);
    ctx.fill();
    ink(ctx);
    for (const x of [CX - 96, CX + 96]) {
      ellipse(ctx, x, 202, 5, 5);
      ctx.fillStyle = metal(ctx, x - 5, x + 5);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(0, -6);
    ctx.scale(1, 0.75);
    ctx.translate(0, 6);
    drawSneaker(ctx, art);
    ctx.restore();
  },
});

registerKind('r_graffiti', {
  contactY: 262,
  draw(ctx, art, r) {
    const canvasCol = art.primary!;
    const purple = art.secondary!;
    const paints = ['#ff3d7f', '#ffd23f', '#3ddc97', purple, '#36c5ff'];
    roundRect(ctx, CX - 104, 228, 208, 34, 16);
    ctx.fillStyle = vGrad(ctx, 228, 262, [[0, '#ffffff'], [1, '#c9ced6']]);
    ctx.fill();
    ink(ctx);
    ctx.fillStyle = purple;
    ctx.fillRect(CX - 96, 242, 192, 5);
    const up = () => shoePath(ctx, { bottom: 244, width: 98 });
    paint(ctx, up, hGrad(ctx, 12, 208, canvasCol, 0.25, -0.22), () => {
      ctx.strokeStyle = rgba('#000', 0.05);
      ctx.lineWidth = 1.5;
      for (let y = -6; y < 250; y += 5) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(230, y);
        ctx.stroke();
      }
      ellipse(ctx, CX, 248, 88, 44);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ink(ctx, 3.5);
      ctx.strokeStyle = rgba('#8a929c', 0.6);
      ctx.lineWidth = 2;
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath();
        ctx.moveTo(CX + i * 14, 210);
        ctx.lineTo(CX + i * 14 + 6, 240);
        ctx.stroke();
      }
      // splats + drips
      for (let i = 0; i < 16; i++) {
        const col = paints[i % paints.length];
        const x = 14 + r() * 190;
        const y = 10 + r() * 230;
        blob(ctx, x, y, 5 + r() * 11, 0.7, r, 9);
        ctx.fillStyle = col;
        ctx.fill();
        if (i % 3 === 0) drip(ctx, x, y + 4, 3, 10 + r() * 16, col, rgba(INK, 0.4), 1.5);
        for (let k = 0; k < 3; k++) {
          ellipse(ctx, x + (r() - 0.5) * 34, y + (r() - 0.5) * 34, 1.5 + r() * 2, 1.5 + r() * 2);
          ctx.fill();
        }
      }
      // tag scribble
      ctx.beginPath();
      ctx.moveTo(30, 160);
      ctx.bezierCurveTo(40, 120, 80, 130, 60, 160);
      ctx.bezierCurveTo(44, 184, 90, 190, 96, 150);
      ink(ctx, 6, '#ff3d7f');
    });
    roundRect(ctx, CX - 30, -6, 60, 140, 18);
    ctx.fillStyle = shade(canvasCol, 0.05);
    ctx.fill();
    ink(ctx, 3.5);
    laces(ctx, 8, 150, purple, 6, 22);
    // ankle patch
    ellipse(ctx, 42, 70, 22, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ink(ctx, 3.5);
    ctx.beginPath();
    ctx.moveTo(46, 54);
    ctx.lineTo(34, 72);
    ctx.lineTo(44, 72);
    ctx.lineTo(38, 88);
    ctx.lineTo(52, 66);
    ctx.lineTo(42, 66);
    ctx.closePath();
    ctx.fillStyle = purple;
    ctx.fill();
    ink(ctx, 2);
    // spray can tucked in the laces
    ctx.save();
    ctx.translate(214, 104);
    ctx.rotate(0.28);
    roundRect(ctx, -16, -38, 32, 80, 7);
    ctx.fillStyle = metal(ctx, -16, 16, '#c7ccd4');
    ctx.fill();
    ink(ctx, 4);
    roundRect(ctx, -16, -12, 32, 30, 0);
    ctx.fillStyle = hGrad(ctx, -16, 16, '#ff3d7f', 0.3, -0.3);
    ctx.fill();
    ink(ctx, 3);
    roundRect(ctx, -11, -54, 22, 18, 5);
    ctx.fillStyle = hGrad(ctx, -11, 11, purple, 0.4, -0.3);
    ctx.fill();
    ink(ctx, 3.5);
    roundRect(ctx, -4, -62, 8, 9, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ink(ctx, 2.5);
    ctx.restore();
    puff(ctx, [[236, 26, 12], [250, 12, 9], [224, 12, 8]], rgba(purple, 0.75), rgba(INK, 0.6), 2);
    ctx.fillStyle = purple;
    for (let i = 0; i < 8; i++) {
      ellipse(ctx, 218 + r() * 40, -4 + r() * 40, 2, 2);
      ctx.fill();
    }
  },
});

registerKind('r_bowling', {
  contactY: 262,
  halfWidth: 108,
  draw(ctx, art) {
    const red = art.primary!;
    const cream = art.secondary!;
    roundRect(ctx, CX - 100, 232, 200, 30, 14);
    ctx.fillStyle = vGrad(ctx, 232, 262, [[0, '#d8b07a'], [1, '#8a6232']]);
    ctx.fill();
    ink(ctx);
    const up = () => shoePath(ctx, { bottom: 248, width: 96 });
    paint(ctx, up, leatherFill(ctx, red), () => {
      const saddle = () => {
        ctx.beginPath();
        ctx.moveTo(CX - 60, -6);
        ctx.lineTo(CX + 60, -6);
        ctx.bezierCurveTo(CX + 72, 80, CX + 86, 150, CX + 70, 192);
        ctx.quadraticCurveTo(CX, 214, CX - 70, 192);
        ctx.bezierCurveTo(CX - 86, 150, CX - 72, 80, CX - 60, -6);
        ctx.closePath();
      };
      saddle();
      ctx.fillStyle = leatherFill(ctx, cream);
      ctx.fill();
      ink(ctx, 4);
      ctx.strokeStyle = rgba(shade(red, -0.4), 0.8);
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(CX - 54, 0);
      ctx.bezierCurveTo(CX - 64, 80, CX - 78, 150, CX - 62, 186);
      ctx.quadraticCurveTo(CX, 206, CX + 62, 186);
      ctx.bezierCurveTo(CX + 78, 150, CX + 64, 80, CX + 54, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      glossy(ctx, CX - 40, 226, 30, 10, 0.5);
    });
    roundRect(ctx, CX - 26, -6, 52, 128, 14);
    ctx.fillStyle = shade(cream, -0.06);
    ctx.fill();
    ink(ctx, 3);
    laces(ctx, 8, 150, '#ffffff', 5, 22);
    // size tag
    ellipse(ctx, 186, 108, 22, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ink(ctx, 3.5);
    ctx.font = '900 22px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = red;
    ctx.fillText('10', 186, 116);
    // bowling ball
    const bx = -2;
    const by = 238;
    ellipse(ctx, bx, by, 36, 36);
    ctx.fillStyle = radial(ctx, bx, by, 36, '#3a5ad8', 0.45, -0.5);
    ctx.fill();
    ctx.save();
    ellipse(ctx, bx, by, 36, 36);
    ctx.clip();
    ctx.strokeStyle = rgba('#9fd8ff', 0.45);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx - 40, by + 10);
    ctx.bezierCurveTo(bx - 10, by - 20, bx + 10, by + 30, bx + 40, by - 4);
    ctx.stroke();
    ctx.restore();
    ellipse(ctx, bx, by, 36, 36);
    ink(ctx);
    for (const [dx, dy, s] of [[-8, -14, 5], [6, -16, 5], [0, -2, 6]] as const) {
      ellipse(ctx, bx + dx, by + dy, s, s);
      ctx.fillStyle = '#0c1030';
      ctx.fill();
    }
    glossy(ctx, bx - 14, by - 16, 12, 8, 0.8);
  },
});

registerKind('r_jukebox', {
  contactY: 266,
  halfWidth: 106,
  draw(ctx, art) {
    const wood = art.primary!;
    const gold = art.secondary!;
    roundRect(ctx, 0, 246, 220, 20, 8);
    ctx.fillStyle = metal(ctx, 0, 220);
    ctx.fill();
    ink(ctx);
    const cab = () => {
      ctx.beginPath();
      ctx.moveTo(8, 250);
      ctx.lineTo(8, 96);
      ctx.arc(CX, 96, 102, Math.PI, Math.PI * 2);
      ctx.lineTo(212, 250);
      ctx.closePath();
    };
    paint(ctx, cab, hGrad(ctx, 8, 212, wood, 0.3, -0.4), () => {
      // record window
      ctx.beginPath();
      ctx.moveTo(CX - 44, 190);
      ctx.lineTo(CX - 44, 96);
      ctx.arc(CX, 96, 44, Math.PI, Math.PI * 2);
      ctx.lineTo(CX + 44, 190);
      ctx.closePath();
      ctx.fillStyle = '#1a0f14';
      ctx.fill();
      ellipse(ctx, CX, 112, 34, 34);
      ctx.fillStyle = '#0c0c0e';
      ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.15);
      ctx.lineWidth = 1.5;
      for (const rr of [14, 20, 26, 31]) {
        ellipse(ctx, CX, 112, rr, rr);
        ctx.stroke();
      }
      ellipse(ctx, CX, 112, 10, 10);
      ctx.fillStyle = '#e5242f';
      ctx.fill();
      // neon tubes
      const tubes = ['#ff3d3d', '#ff9f1c', '#ffe14d', '#3ddc97', '#36c5ff'];
      tubes.forEach((col, k) => {
        const R = 92 - k * 9;
        ctx.beginPath();
        ctx.moveTo(CX - R, 210);
        ctx.lineTo(CX - R, 96);
        ctx.arc(CX, 96, R, Math.PI, Math.PI * 2);
        ctx.lineTo(CX + R, 210);
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = col;
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = rgba('#ffffff', 0.6);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      // selector buttons
      for (let i = 0; i < 6; i++) {
        roundRect(ctx, CX - 54 + i * 18, 194, 14, 9, 3);
        ctx.fillStyle = i % 2 ? gold : '#ffffff';
        ctx.fill();
        ink(ctx, 2);
      }
    });
    // chrome grille
    roundRect(ctx, 24, 208, 172, 40, 8);
    ctx.fillStyle = metal(ctx, 24, 196);
    ctx.fill();
    ink(ctx, 4);
    ctx.fillStyle = rgba('#2a2a30', 0.7);
    for (let y = 216; y < 244; y += 7) ctx.fillRect(32, y, 156, 3);
    for (const [x, y, s, c, d] of [[-22, 64, 11, gold, false], [238, 40, 12, '#ff3d7f', true], [242, 130, 10, '#36c5ff', false], [-20, 150, 10, '#3ddc97', true]] as const) noteGlyph(ctx, x, y, s, c, d);
  },
});

registerKind('r_skateboard', {
  contactY: 278,
  halfWidth: 122,
  draw(ctx, art) {
    const pinkc = art.secondary!;
    for (const x of [CX - 98, CX + 98]) {
      roundRect(ctx, x - 26, 236, 52, 14, 4);
      ctx.fillStyle = metal(ctx, x - 26, x + 26);
      ctx.fill();
      ink(ctx, 3.5);
      for (const dx of [-18, 18]) {
        roundRect(ctx, x + dx - 12, 248, 24, 30, 9);
        ctx.fillStyle = hGrad(ctx, x + dx - 12, x + dx + 12, '#f2f2f2', 0.3, -0.25);
        ctx.fill();
        ink(ctx, 4);
        ellipse(ctx, x + dx, 263, 4, 6);
        ctx.fillStyle = pinkc;
        ctx.fill();
      }
    }
    const deckPts: Pt[] = [];
    for (let i = 0; i <= 30; i++) {
      const x = -34 + (i / 30) * 288;
      const k = x < 4 ? (4 - x) / 38 : x > 216 ? (x - 216) / 38 : 0;
      deckPts.push([x, 232 - k * k * 26]);
    }
    ribbon(ctx, deckPts, 18, 18);
    ctx.fillStyle = vGrad(ctx, 200, 242, [[0, '#3a3a42'], [0.45, '#2a2a30'], [0.55, pinkc], [1, shade(pinkc, -0.3)]]);
    ctx.fill();
    ink(ctx);
    ctx.save();
    ctx.translate(0, -6);
    ctx.scale(1, 0.84);
    ctx.translate(0, 6);
    drawSneaker(ctx, art);
    ctx.restore();
    speedLines(ctx, [[-36, -6, 196], [226, 256, 186]], pinkc);
  },
});

// ——— Slopes ———

registerKind('r_snowshoe', {
  contactY: 298,
  halfWidth: 140,
  draw(ctx, art, r) {
    const wood = art.primary!;
    const boot = art.secondary!;
    ctx.save();
    ellipse(ctx, CX, 222, 144, 78);
    ctx.clip();
    ctx.fillStyle = rgba('#f4e8cc', 0.35);
    ctx.fillRect(-40, 140, 300, 170);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d8c090';
    for (let i = -16; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(-40 + i * 20, 140);
      ctx.lineTo(-40 + i * 20 + 160, 310);
      ctx.moveTo(-40 + i * 20, 310);
      ctx.lineTo(-40 + i * 20 + 160, 140);
      ctx.stroke();
    }
    ctx.restore();
    ellipse(ctx, CX, 222, 144, 78);
    ink(ctx, 22);
    ctx.strokeStyle = wood;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(CX, 220, 144, 78, 0, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
    for (const y of [176, 268]) {
      const half = Math.sqrt(Math.max(0, 1 - ((y - 222) / 78) ** 2)) * 144;
      ctx.beginPath();
      ctx.moveTo(CX - half, y);
      ctx.lineTo(CX + half, y);
      ink(ctx, 14);
      ctx.strokeStyle = wood;
      ctx.lineWidth = 8;
      ctx.stroke();
    }
    puff(ctx, [[-20, 214, 12], [-10, 200, 9], [-24, 232, 8]], '#ffffff', '#8ab0d0', 3);
    puff(ctx, [[238, 248, 12], [226, 262, 9], [248, 234, 8]], '#ffffff', '#8ab0d0', 3);
    puff(ctx, [[CX - 40, 296, 10], [CX - 24, 300, 8]], '#ffffff', '#8ab0d0', 3);
    // winter boot
    roundRect(ctx, CX - 96, 228, 192, 26, 12);
    ctx.fillStyle = '#3a2a20';
    ctx.fill();
    ink(ctx);
    const up = () => shoePath(ctx, { bottom: 244, width: 90 });
    paint(ctx, up, leatherFill(ctx, boot), () => {
      for (let y = 20; y < 180; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(CX, y + 14, 230, y);
        ink(ctx, 3, rgba('#000', 0.3));
      }
      ellipse(ctx, CX, 246, 86, 50);
      ctx.fillStyle = leatherFill(ctx, '#6a4a32');
      ctx.fill();
      ink(ctx, 3.5);
      glossy(ctx, CX - 34, 110, 26, 50, 0.3);
    });
    // binding straps
    for (const y of [188, 222]) {
      roundRect(ctx, CX - 132, y, 264, 16, 6);
      ctx.fillStyle = '#1e1e24';
      ctx.fill();
      ink(ctx, 3);
      roundRect(ctx, CX + 50, y - 3, 22, 22, 4);
      ctx.fillStyle = metal(ctx, CX + 50, CX + 72);
      ctx.fill();
      ink(ctx, 2.5);
    }
    // fresh snow sprinkles
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      ellipse(ctx, -30 + r() * 280, 150 + r() * 150, 2.5, 2.5);
      ctx.fill();
    }
  },
});

registerKind('r_hiking', {
  contactY: 268,
  draw(ctx, art, r) {
    const suede = art.primary!;
    const lace = art.secondary!;
    // coiled rope + carabiner on the side
    for (let k = 0; k < 5; k++) {
      ellipse(ctx, 214 + k * 7, 140 + k * 4, 30 - k, 58, 0.12 + k * 0.06);
      ink(ctx, 12);
      ctx.strokeStyle = '#ff9f1c';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([3, 8]);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    roundRect(ctx, CX - 110, 220, 220, 48, 16);
    ctx.fillStyle = '#3a2e26';
    ctx.fill();
    ink(ctx);
    ctx.fillStyle = '#5e4c3e';
    for (let i = 0; i < 7; i++) {
      const x = CX - 92 + i * 30;
      ctx.beginPath();
      ctx.moveTo(x, 250);
      ctx.lineTo(x + 12, 260);
      ctx.lineTo(x + 24, 250);
      ctx.lineTo(x + 24, 256);
      ctx.lineTo(x + 12, 266);
      ctx.lineTo(x, 256);
      ctx.closePath();
      ctx.fill();
    }
    starPath(ctx, CX + 76, 236, 8, 8, 4, 0);
    ctx.fillStyle = '#ffcf1a';
    ctx.fill();
    ink(ctx, 2);
    const up = () => shoePath(ctx, { bottom: 238, width: 102 });
    paint(ctx, up, leatherFill(ctx, suede), () => {
      for (let i = 0; i < 300; i++) {
        ctx.fillStyle = rgba(r() > 0.5 ? '#ffffff' : '#000000', 0.06);
        ctx.fillRect(10 + r() * 210, r() * 240, 3, 3);
      }
      ellipse(ctx, CX, 250, 106, 56);
      ctx.fillStyle = leatherFill(ctx, shade(suede, -0.5));
      ctx.fill();
      ink(ctx, 3.5);
      ctx.strokeStyle = '#f2c86b';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(CX, 250, 96, 46, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // mud
      for (let i = 0; i < 6; i++) {
        blob(ctx, 20 + r() * 180, 180 + r() * 50, 5 + r() * 8, 0.6, r, 8);
        ctx.fillStyle = rgba('#4a3a22', 0.75);
        ctx.fill();
      }
    });
    roundRect(ctx, CX - 64, -6, 128, 30, 12);
    ctx.fillStyle = hGrad(ctx, CX - 64, CX + 64, '#5a3a2a');
    ctx.fill();
    ink(ctx, 4);
    roundRect(ctx, CX - 30, 12, 60, 150, 14);
    ctx.fillStyle = shade(suede, -0.15);
    ctx.fill();
    ink(ctx, 3);
    laces(ctx, 48, 176, lace, 4, 30);
    for (const sx of [-1, 1]) {
      for (const y of [22, 36]) {
        ctx.beginPath();
        ctx.arc(CX + sx * 32, y, 6, sx < 0 ? -Math.PI / 2 : Math.PI / 2, sx < 0 ? Math.PI / 2 : Math.PI * 1.5);
        ink(ctx, 6);
        ctx.strokeStyle = '#c7ccd4';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    ctx.beginPath();
    ctx.moveTo(CX - 32, 29);
    ctx.lineTo(CX + 32, 29);
    ink(ctx, 7);
    ctx.strokeStyle = lace;
    ctx.lineWidth = 4;
    ctx.stroke();
    // carabiner
    ctx.save();
    ctx.translate(214, 76);
    ctx.rotate(0.15);
    roundRect(ctx, -10, -18, 20, 36, 10);
    ink(ctx, 9);
    ctx.strokeStyle = '#ff7a1a';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  },
});

registerKind('r_skier', {
  contactY: 310,
  draw(ctx, art) {
    const shell = art.primary!;
    const yel = art.secondary!;
    const ski = () => {
      ctx.beginPath();
      ctx.moveTo(CX - 62, 218);
      ctx.lineTo(CX + 62, 218);
      ctx.lineTo(CX + 72, 292);
      ctx.quadraticCurveTo(CX + 72, 314, CX, 316);
      ctx.quadraticCurveTo(CX - 72, 314, CX - 72, 292);
      ctx.closePath();
    };
    paint(ctx, ski, vGrad(ctx, 218, 316, [[0, '#f2f2f2'], [0.7, '#ffffff'], [1, '#c9ced6']]), () => {
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.moveTo(CX - 80, 270);
      ctx.lineTo(CX + 80, 240);
      ctx.lineTo(CX + 80, 258);
      ctx.lineTo(CX - 80, 288);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d8343f';
      ctx.beginPath();
      ctx.moveTo(CX - 80, 292);
      ctx.lineTo(CX + 80, 262);
      ctx.lineTo(CX + 80, 270);
      ctx.lineTo(CX - 80, 300);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.8);
      ellipse(ctx, CX - 20, 304, 34, 5);
      ctx.fill();
    });
    ctx.strokeStyle = '#8a929c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX - 64, 222);
    ctx.lineTo(CX - 73, 292);
    ctx.moveTo(CX + 64, 222);
    ctx.lineTo(CX + 73, 292);
    ctx.stroke();
    puff(ctx, [[CX - 86, 306, 12], [CX - 102, 296, 9], [CX - 74, 318, 8]], '#ffffff', '#8ab0d0', 3);
    puff(ctx, [[CX + 88, 304, 12], [CX + 104, 292, 9], [CX + 78, 318, 8]], '#ffffff', '#8ab0d0', 3);
    roundRect(ctx, CX - 44, 214, 88, 24, 6);
    ctx.fillStyle = hGrad(ctx, CX - 44, CX + 44, '#d8343f', 0.35, -0.35);
    ctx.fill();
    ink(ctx, 4);
    const up = () => shoePath(ctx, { bottom: 234, width: 98 });
    paint(ctx, up, hGrad(ctx, 12, 208, shell, 0.55, -0.4), () => {
      ctx.strokeStyle = rgba('#000', 0.3);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CX - 40, -6);
      ctx.bezierCurveTo(CX - 50, 80, CX - 70, 150, CX - 96, 190);
      ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', 0.6);
      roundRect(ctx, CX - 72, 10, 10, 150, 5);
      ctx.fill();
    });
    for (const y of [30, 82, 134, 182]) {
      roundRect(ctx, CX - 80, y - 6, 62, 12, 4);
      ctx.fillStyle = '#1e1e24';
      ctx.fill();
      ink(ctx, 2.5);
      ctx.fillStyle = '#5a626c';
      for (let i = 0; i < 5; i++) ctx.fillRect(CX - 74 + i * 11, y - 3, 4, 6);
      roundRect(ctx, CX - 20, y - 9, 70, 18, 7);
      ctx.fillStyle = metal(ctx, CX - 20, CX + 50);
      ctx.fill();
      ink(ctx, 3);
      roundRect(ctx, CX + 26, y - 6, 20, 12, 4);
      ctx.fillStyle = yel;
      ctx.fill();
      ink(ctx, 2);
    }
    roundRect(ctx, CX - 64, -6, 128, 22, 6);
    ctx.fillStyle = '#1e1e24';
    ctx.fill();
    ink(ctx, 3.5);
    roundRect(ctx, CX - 14, -2, 28, 14, 3);
    ctx.fillStyle = yel;
    ctx.fill();
  },
});

// ——— Cellar ———

registerKind('r_mime', {
  draw(ctx, art) {
    const black = art.primary!;
    const white = art.secondary!;
    barePath(ctx, art);
    ctx.fillStyle = skinBodyFill(ctx, white);
    ctx.fill();
    ctx.save();
    barePath(ctx, art);
    ctx.clip();
    ctx.fillStyle = black;
    for (let y = 6; y < 200; y += 34) ctx.fillRect(0, y, 230, 15);
    ctx.strokeStyle = rgba('#000', 0.06);
    ctx.lineWidth = 2;
    for (let x = 10; x < 220; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.lineTo(x, 230);
      ctx.stroke();
    }
    ctx.restore();
    barePath(ctx, art, true);
    ink(ctx);
    const slip = () => {
      ctx.beginPath();
      ctx.moveTo(12, 132);
      ctx.quadraticCurveTo(CX, 104, 212, 132);
      ctx.bezierCurveTo(222, 200, 192, 262, CX, 264);
      ctx.bezierCurveTo(28, 262, -2, 200, 12, 132);
      ctx.closePath();
    };
    paint(ctx, slip, leatherFill(ctx, shade(black, 0.12)), () => {
      ctx.fillStyle = rgba('#ffffff', 0.5);
      ellipse(ctx, 44, 190, 8, 36, 0.2);
      ctx.fill();
      ellipse(ctx, 180, 196, 5, 24, -0.2);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(12, 132);
    ctx.quadraticCurveTo(CX, 104, 212, 132);
    ink(ctx, 5, '#5a5a66');
    // white face on the toe
    ellipse(ctx, CX, 206, 46, 40);
    ctx.fillStyle = radial(ctx, CX, 206, 46, '#ffffff', 0, -0.08);
    ctx.fill();
    ink(ctx, 3.5);
    for (const sx of [-1, 1]) {
      const ex = CX + sx * 17;
      ctx.beginPath();
      ctx.moveTo(ex, 180);
      ctx.lineTo(ex + 5, 196);
      ctx.lineTo(ex, 212);
      ctx.lineTo(ex - 5, 196);
      ctx.closePath();
      ctx.fillStyle = '#141418';
      ctx.fill();
      ellipse(ctx, ex, 196, 4.5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ellipse(ctx, ex, 197, 2.5, 3);
      ctx.fillStyle = '#141418';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex, 184, 10, Math.PI + 0.5, Math.PI * 2 - 0.5);
      ink(ctx, 2.5, '#141418');
    }
    drop(ctx, CX - 22, 220, 3.5, '#141418', '#141418', 1);
    ctx.beginPath();
    ctx.moveTo(CX - 14, 228);
    ctx.quadraticCurveTo(CX - 6, 222, CX, 226);
    ctx.quadraticCurveTo(CX + 6, 222, CX + 14, 228);
    ctx.quadraticCurveTo(CX, 238, CX - 14, 228);
    ctx.closePath();
    ctx.fillStyle = '#e5242f';
    ctx.fill();
    ink(ctx, 2);
    // beret
    ellipse(ctx, CX + 8, 166, 32, 10, -0.12);
    ctx.fillStyle = radial(ctx, CX + 8, 164, 30, '#2a2a32', 0.3);
    ctx.fill();
    ink(ctx, 3);
    ctx.beginPath();
    ctx.moveTo(CX + 8, 157);
    ctx.lineTo(CX + 12, 148);
    ink(ctx, 4);
  },
});

registerKind('r_neon', {
  draw(ctx, art) {
    const body = art.skin;
    const pinkc = art.primary!;
    const cyan = art.secondary!;
    barePath(ctx, art);
    ctx.fillStyle = skinBodyFill(ctx, body);
    ctx.fill();
    ctx.save();
    barePath(ctx, art);
    ctx.clip();
    ctx.strokeStyle = rgba('#ffffff', 0.05);
    ctx.lineWidth = 2;
    for (let y = 10; y < 230; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(230, y);
      ctx.stroke();
    }
    ctx.restore();
    barePath(ctx, art, true);
    ink(ctx);
    const toes = toesFor(art);
    for (const t of toes) drawToe(ctx, t, shade(body, 0.08), { nail: null, ol: INK });
    const tube = (col: string, path: () => void, dash?: number[]) => {
      ctx.save();
      if (dash) ctx.setLineDash(dash);
      path();
      ctx.shadowColor = col;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = col;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = mix(col, '#ffffff', 0.6);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    };
    tube(pinkc, () => {
      ctx.save();
      ctx.translate(CX, 110);
      ctx.scale(0.84, 0.86);
      ctx.translate(-CX, -110);
      barePath(ctx, art, true);
      ctx.restore();
    }, [240, 16, 600]);
    for (const t of toes) {
      tube(cyan, () => ellipse(ctx, t.cx, t.cy + 2, t.rx * 0.62, t.ry * 0.62));
    }
    tube(cyan, () => starPath(ctx, CX + 4, 96, 26, 11));
    // tube clips
    for (const [x, y] of [[38, 120], [184, 120], [70, 30], [150, 30]] as const) {
      roundRect(ctx, x - 5, y - 4, 10, 8, 2);
      ctx.fillStyle = '#8a929c';
      ctx.fill();
      ink(ctx, 2);
    }
  },
});

// ——— Rare ———

registerKind('r_crusty', {
  contactY: 266,
  draw(ctx, art, r) {
    const crust = art.primary!;
    const flour = art.secondary!;
    const lump = (x: number, y: number, s: number, pass: number) => {
      ellipse(ctx, x, y, s, s * 0.9);
      if (pass === 0) {
        ink(ctx, 7, mix(shade(crust, -0.6), INK, 0.4));
        return;
      }
      ctx.fillStyle = radial(ctx, x, y, s, crust, 0.45, -0.3);
      ctx.fill();
    };
    drawBareBody(ctx, art, r);
    // crust along the sides and across the ankle
    const pts: Pt[] = [];
    for (const [i, seg] of bezierPts().entries()) {
      if (i === 2) continue;
      for (const p of sampleCubic(seg[0], seg[1], seg[2], seg[3], 11)) pts.push(p);
    }
    for (let x = 60; x <= 160; x += 12) pts.push([x, 14 + Math.sin(x) * 3]);
    const sizes = pts.map(() => 15 + r() * 7);
    for (let pass = 0; pass < 2; pass++) pts.forEach(([x, y], i) => lump(x, y, sizes[i], pass));
    for (const [x, y] of pts) {
      if (r() > 0.5) {
        ellipse(ctx, x - 3, y - 4, 4, 2.5, -0.5);
        ctx.fillStyle = rgba('#ffffff', 0.55);
        ctx.fill();
      }
      if (r() > 0.6) {
        ellipse(ctx, x + 4, y + 3, 3, 1.8, r() * 3);
        ctx.fillStyle = flour;
        ctx.fill();
      }
      if (r() > 0.75) {
        ellipse(ctx, x + 2, y - 2, 3, 2.5);
        ctx.fillStyle = rgba('#6a3a10', 0.6);
        ctx.fill();
      }
    }
    for (const t of toesFor(art)) {
      drawToe(ctx, t, art.skin, { nail: art.nails, r });
      ctx.beginPath();
      ctx.ellipse(t.cx, t.cy, t.rx + 2, t.ry + 2, 0, 0.12 * Math.PI, 0.88 * Math.PI);
      ink(ctx, 15, mix(shade(crust, -0.6), INK, 0.4));
      ctx.strokeStyle = crust;
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.4);
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    // falling crumbs
    for (const [x, y, s] of [[-14, 230, 6], [234, 246, 7], [30, 292, 5], [190, 296, 5], [CX, 304, 4]] as const) {
      blob(ctx, x, y, s, 0.5, r, 6);
      ctx.fillStyle = radial(ctx, x, y, s, crust, 0.4);
      ctx.fill();
      ink(ctx, 2.5, mix(shade(crust, -0.6), INK, 0.4));
    }
  },
});

registerKind('r_mimic', {
  draw(ctx, art, r) {
    drawBare(ctx, art, r);
    const ol = outlineOf(art.skin);
    // sly grin crease across the instep, one corner hooked up
    ctx.beginPath();
    ctx.moveTo(74, 122);
    ctx.quadraticCurveTo(112, 150, 156, 116);
    ctx.quadraticCurveTo(162, 110, 168, 112);
    ink(ctx, 4, ol);
    ctx.beginPath();
    ctx.moveTo(126, 136);
    ctx.lineTo(132, 148);
    ctx.lineTo(137, 133);
    ctx.closePath();
    ctx.fillStyle = '#fffbe6';
    ctx.fill();
    ink(ctx, 2, ol);
    // the big toe's nail is pointed, like a claw
    const t = toesFor(art)[4];
    ctx.beginPath();
    ctx.moveTo(t.cx - t.rx * 0.55, t.cy + t.ry * 0.05);
    ctx.quadraticCurveTo(t.cx, t.cy - t.ry * 0.1, t.cx + t.rx * 0.6, t.cy + t.ry * 0.05);
    ctx.lineTo(t.cx + t.rx * 0.08, t.cy + t.ry * 1.05);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, t.cy, t.cy + t.ry, [[0, '#fff4c0'], [1, '#d8a020']]);
    ctx.fill();
    ink(ctx, 2.5, ol);
  },
});
