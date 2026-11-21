// Art kinds for Act 9 · Greek myths (data in src/content/feet/act9.ts): the myth feet of The Labyrinth
// and Tartarus, Medusa's snakes, the three Titans and the act's four bosses. Same design frame as
// kinds-bosses.ts: centre x = CX (110), the ankle opens at y = -6, the leg comes from FootArt.leg and
// the canvas spans x -40..260, y -8..337. Leaning toward the cohesive style: one outer silhouette with
// the details painted inside it (clipped), light from the top left, one outline weight (OUT).

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, type Toe, barePath, drawHair, drawToe, glossy, leatherFill, outlineOf, skinBodyFill } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, rgba, roundRect, shade } from '../../art/util';

type P = [number, number];

// ——— Shared helpers ———

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function vgrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

function rad(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

/** Polished bronze across x0..x1: dark edges, a bright band left of centre (top-left light). */
function bronze(ctx: Ctx, x0: number, x1: number, col = '#c9873a'): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, -0.5));
  g.addColorStop(0.25, shade(col, 0.05));
  g.addColorStop(0.38, shade(col, 0.6));
  g.addColorStop(0.5, col);
  g.addColorStop(1, shade(col, -0.55));
  return g;
}

function bez(p0: P, p1: P, p2: P, p3: P, n = 28): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

/** Tapered ribbon along a polyline (snakes, toes, flames). */
function ribbon(ctx: Ctx, pts: P[], w0: number, w1: number): void {
  const L: P[] = [];
  const R: P[] = [];
  const n = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = (w0 + (w1 - w0) * (i / n)) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  const end = pts[n];
  const a0 = Math.atan2(L[n][1] - end[1], L[n][0] - end[0]);
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i <= n; i++) ctx.lineTo(L[i][0], L[i][1]);
  ctx.arc(end[0], end[1], Math.max(0.5, w1 / 2), a0, a0 - Math.PI, true);
  for (let i = n; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
}

/** A Greek key (meander) band from x0 to x1 centred on y. */
function greekKey(ctx: Ctx, x0: number, x1: number, y: number, h: number, col: string, lw = 3): void {
  const u = h / 3;
  ctx.beginPath();
  let x = x0;
  ctx.moveTo(x, y + h / 2);
  while (x + 4 * u <= x1) {
    ctx.lineTo(x, y - h / 2);
    ctx.lineTo(x + 3 * u, y - h / 2);
    ctx.lineTo(x + 3 * u, y + u / 2);
    ctx.lineTo(x + u, y + u / 2);
    ctx.lineTo(x + u, y - u / 2);
    ctx.lineTo(x + 2 * u, y - u / 2);
    ctx.moveTo(x + 3 * u, y + h / 2);
    x += 4 * u;
    ctx.moveTo(x - u, y + h / 2);
    ctx.lineTo(x, y + h / 2);
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'miter';
  ctx.stroke();
  ctx.lineJoin = 'round';
}

/** A strap across the foot, from (x0, y0) to (x1, y1) bowing by `bow`. */
function strap(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, bow: number, w: number, col: string): void {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 + bow;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + OUT;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.35);
  ctx.lineWidth = Math.max(1.5, w * 0.22);
  ctx.beginPath();
  ctx.moveTo(x0, y0 - w * 0.2);
  ctx.quadraticCurveTo(mx, my - w * 0.25, x1, y1 - w * 0.2);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function stud(ctx: Ctx, x: number, y: number, rr: number, col = '#e8b04a'): void {
  ellipse(ctx, x, y, rr, rr);
  ctx.fillStyle = rad(ctx, x, y, rr, [[0, shade(col, 0.6)], [0.6, col], [1, shade(col, -0.45)]]);
  ctx.fill();
  ink(ctx, 2);
}

/** An almond eye with a slit or round pupil. */
function eye(ctx: Ctx, x: number, y: number, rx: number, ry: number, iris: string, slit: boolean, glowCol?: string): void {
  ctx.save();
  if (glowCol) {
    ctx.shadowColor = glowCol;
    ctx.shadowBlur = rx * 0.9;
  }
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.quadraticCurveTo(x, y - ry * 2, x + rx, y);
  ctx.quadraticCurveTo(x, y + ry * 2, x - rx, y);
  ctx.closePath();
  ctx.fillStyle = glowCol ? rad(ctx, x, y, rx, [[0, '#ffffff'], [0.5, shade(iris, 0.4)], [1, iris]]) : '#fffbf0';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.quadraticCurveTo(x, y - ry * 2, x + rx, y);
  ctx.quadraticCurveTo(x, y + ry * 2, x - rx, y);
  ctx.closePath();
  ctx.clip();
  if (!glowCol) {
    ellipse(ctx, x, y, ry * 0.95, ry * 0.95);
    ctx.fillStyle = rad(ctx, x, y, ry, [[0, shade(iris, 0.5)], [0.7, iris], [1, shade(iris, -0.5)]]);
    ctx.fill();
  }
  ctx.fillStyle = '#120a06';
  if (slit) ellipse(ctx, x, y, ry * 0.18, ry * 0.85);
  else ellipse(ctx, x, y, ry * 0.45, ry * 0.45);
  ctx.fill();
  ellipse(ctx, x - rx * 0.28, y - ry * 0.35, ry * 0.22, ry * 0.18);
  ctx.fillStyle = rgba('#ffffff', 0.9);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.quadraticCurveTo(x, y - ry * 2, x + rx, y);
  ctx.quadraticCurveTo(x, y + ry * 2, x - rx, y);
  ctx.closePath();
  ink(ctx, 3.5);
}

/** A cartoon snake along a path: scales, a belly stripe, and a head with an eye and a forked tongue. */
function snake(ctx: Ctx, pts: P[], w: number, col: string, belly: string, tongue = true): void {
  ribbon(ctx, pts, w * 0.9, w * 0.45);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.save();
  ribbon(ctx, pts, w * 0.9, w * 0.45);
  ctx.clip();
  // belly stripe and scale ticks
  ctx.strokeStyle = rgba(belly, 0.8);
  ctx.lineWidth = w * 0.22;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + w * 0.12, y + w * 0.12) : ctx.moveTo(x + w * 0.12, y + w * 0.12)));
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.3);
  ctx.lineWidth = w * 0.14;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x - w * 0.18, y - w * 0.2) : ctx.moveTo(x - w * 0.18, y - w * 0.2)));
  ctx.stroke();
  ctx.fillStyle = rgba(shade(col, -0.5), 0.45);
  for (let i = 1; i < pts.length - 1; i += 2) {
    ellipse(ctx, pts[i][0], pts[i][1], w * 0.14, w * 0.1);
    ctx.fill();
  }
  ctx.restore();
  ribbon(ctx, pts, w * 0.9, w * 0.45);
  ink(ctx, 3.5, outlineOf(col));
  // head at the end
  const [hx, hy] = pts[pts.length - 1];
  const [px, py] = pts[pts.length - 3];
  const a = Math.atan2(hy - py, hx - px);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(a);
  if (tongue) {
    ctx.beginPath();
    ctx.moveTo(w * 0.7, 0);
    ctx.lineTo(w * 1.4, 0);
    ctx.lineTo(w * 1.7, -w * 0.22);
    ctx.moveTo(w * 1.4, 0);
    ctx.lineTo(w * 1.7, w * 0.22);
    ctx.strokeStyle = '#e8402f';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ellipse(ctx, w * 0.15, 0, w * 0.78, w * 0.55);
  ctx.fillStyle = rad(ctx, w * 0.15, 0, w * 0.78, [[0, shade(col, 0.35)], [0.6, col], [1, shade(col, -0.3)]]);
  ctx.fill();
  ink(ctx, 3.5, outlineOf(col));
  ellipse(ctx, w * 0.25, -w * 0.25, w * 0.18, w * 0.16);
  ctx.fillStyle = '#ffe96a';
  ctx.fill();
  ink(ctx, 1.5);
  ellipse(ctx, w * 0.27, -w * 0.25, w * 0.05, w * 0.12);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}

/** Teardrop flame licking upward from (x, y). */
function flameLick(ctx: Ctx, x: number, y: number, w: number, h: number, lean: number, cols: [string, string, string]): void {
  const shape = (k: number) => {
    ctx.beginPath();
    ctx.moveTo(x - w * k, y);
    ctx.bezierCurveTo(x - w * k * 1.1, y - h * k * 0.5, x + lean * k, y - h * k * 0.7, x + lean * 1.2 * k, y - h * k);
    ctx.bezierCurveTo(x + w * k * 0.4 + lean * 0.4, y - h * k * 0.6, x + w * k * 1.1, y - h * k * 0.35, x + w * k, y);
    ctx.quadraticCurveTo(x, y + w * k * 0.4, x - w * k, y);
    ctx.closePath();
  };
  shape(1);
  ctx.fillStyle = cols[0];
  ctx.fill();
  ink(ctx, 3, rgba(INK, 0.8));
  shape(0.7);
  ctx.fillStyle = cols[1];
  ctx.fill();
  shape(0.4);
  ctx.fillStyle = cols[2];
  ctx.fill();
}

/** A cloven hoof: two rounded keratin halves with a split, bottoming out at `bottom`. */
function clovenHoof(ctx: Ctx, cx: number, top: number, bottom: number, half: number, col: string): void {
  for (const sx of [-1, 1]) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(cx + sx * 4, top);
      ctx.bezierCurveTo(cx + sx * half * 0.9, top - 6, cx + sx * (half + 6), top + (bottom - top) * 0.45, cx + sx * (half - 4), bottom - 10);
      ctx.quadraticCurveTo(cx + sx * half * 0.55, bottom + 4, cx + sx * 6, bottom - 4);
      ctx.closePath();
    };
    path();
    ctx.fillStyle = vgrad(ctx, top, bottom, [[0, shade(col, 0.25)], [0.55, col], [1, shade(col, -0.45)]]);
    ctx.fill();
    ctx.save();
    path();
    ctx.clip();
    // growth rings and a sheen
    ctx.strokeStyle = rgba(INK, 0.25);
    ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(cx - half - 10, top + (bottom - top) * k * 0.22);
      ctx.quadraticCurveTo(cx, top + (bottom - top) * k * 0.22 + 10, cx + half + 10, top + (bottom - top) * k * 0.22);
      ctx.stroke();
    }
    glossy(ctx, cx + sx * half * 0.42 - 8, top + (bottom - top) * 0.3, half * 0.25, (bottom - top) * 0.25, 0.5);
    ctx.restore();
    path();
    ink(ctx, OUT, outlineOf(col));
  }
}

/** A craggy stone texture with speckle, chisel facets and cracks (inside a clip). */
function stoneTexture(ctx: Ctx, r: () => number, x0: number, y0: number, w: number, h: number, cracks: number): void {
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = r() > 0.5 ? rgba('#ffffff', 0.16) : rgba('#000000', 0.16);
    ellipse(ctx, x0 + r() * w, y0 + r() * h, 1 + r() * 2.2, 1 + r() * 2.2);
    ctx.fill();
  }
  for (let c = 0; c < cracks; c++) {
    let x = x0 + 20 + r() * (w - 40);
    let y = y0 + r() * h * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (r() - 0.5) * 30;
      y += 10 + r() * 16;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba('#1a1614', 0.6);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
}

/** Skin-tone bare foot body with shading, clipped details via `inside`, then toes. */
function bareFoot(ctx: Ctx, art: FootArt, skin: string, inside: () => void, toes: Toe[], toeOpts: { nail?: string | null; claw?: boolean } = {}): void {
  barePath(ctx, art);
  ctx.fillStyle = skinBodyFill(ctx, skin);
  ctx.fill();
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  // top-left key light and a soft shadow down the right
  glossy(ctx, 74, 70, 46, 80, 0.22);
  ctx.fillStyle = rgba('#000000', 0.1);
  ctx.fillRect(170, -10, 60, 240);
  inside();
  ctx.restore();
  barePath(ctx, art, true);
  ink(ctx, OUT, outlineOf(skin));
  for (const t of toes) drawToe(ctx, t, skin, { nail: toeOpts.nail === undefined ? art.nails : toeOpts.nail, claw: toeOpts.claw, ol: outlineOf(skin) });
}

const TOES: Toe[] = [
  { cx: 34, cy: 212, rx: 19, ry: 22 },
  { cx: 70, cy: 224, rx: 21.5, ry: 26 },
  { cx: 106, cy: 231, rx: 23, ry: 28 },
  { cx: 144, cy: 233, rx: 25, ry: 30 },
  { cx: 186, cy: 230, rx: 32, ry: 35 },
];

function scaled(toes: Toe[], k: number, dy = 0): Toe[] {
  return toes.map((t) => ({ cx: CX + (t.cx - CX) * (0.96 + k * 0.04), cy: t.cy + dy, rx: t.rx * k, ry: t.ry * k }));
}

// ——— SATYR HOOVES: a shaggy goat fetlock, a cloven hoof, a pan pipe tied on with a vine ———

function drawSatyr(ctx: Ctx, art: FootArt, r: () => number): void {
  const fur = art.primary!;
  const hoof = '#6a5444';
  const pipe = art.secondary!;
  // the cloven hoof
  clovenHoof(ctx, CX, 158, 266, 86, hoof);
  // shaggy fetlock: one silhouette, fur painted inside, tufts spilling over the hoof
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(44, -6);
    ctx.bezierCurveTo(40, 60, 20, 110, 18, 160);
    ctx.quadraticCurveTo(CX, 196, 202, 160);
    ctx.bezierCurveTo(200, 110, 180, 60, 176, -6);
    ctx.closePath();
  };
  // tufts around the bottom edge (behind the outline)
  const edge: P[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    edge.push([18 + t * 184, 160 + Math.sin(t * Math.PI) * 18]);
  }
  ctx.save();
  ctx.translate(0, 0);
  for (let i = 0; i < edge.length - 1; i++) {
    const [x0, y0] = edge[i];
    const [x1, y1] = edge[i + 1];
    ctx.beginPath();
    ctx.moveTo(x0, y0 - 6);
    ctx.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * 6, y0 + 22 + r() * 10, x1, y1 - 6);
    ctx.closePath();
    ctx.fillStyle = shade(fur, -0.1);
    ctx.fill();
    ink(ctx, 3, outlineOf(fur));
  }
  ctx.restore();
  body();
  ctx.fillStyle = leatherFill(ctx, fur);
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  drawHair(ctx, r, 18, -6, 190, 190, shade(fur, -0.35), 150);
  drawHair(ctx, r, 30, -6, 120, 170, shade(fur, 0.3), 80);
  glossy(ctx, 70, 60, 36, 70, 0.2);
  ctx.restore();
  body();
  ink(ctx, OUT, outlineOf(fur));
  // vine anklet with laurel leaves
  ctx.beginPath();
  ctx.moveTo(30, 86);
  ctx.quadraticCurveTo(CX, 118, 192, 86);
  ink(ctx, 7, INK);
  ctx.strokeStyle = '#4f7a2a';
  ctx.lineWidth = 4;
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const t = (i + 0.5) / 7;
    const x = 30 + t * 162;
    const y = 86 + Math.sin(t * Math.PI) * 16;
    ellipse(ctx, x, y - 4, 10, 5, i % 2 ? 0.6 : -0.6);
    ctx.fillStyle = i % 2 ? '#6fa83a' : '#8cc44a';
    ctx.fill();
    ink(ctx, 2.2, '#24401a');
  }
  // pan pipe hanging off the vine (reed tubes, graded)
  ctx.save();
  ctx.translate(132, 104);
  ctx.rotate(0.12);
  for (let i = 0; i < 5; i++) {
    const h = 64 - i * 9;
    roundRect(ctx, i * 12, 0, 12, h, 4);
    ctx.fillStyle = vgrad(ctx, 0, h, [[0, shade(pipe, 0.25)], [1, shade(pipe, -0.3)]]);
    ctx.fill();
    ink(ctx, 2.5);
    ellipse(ctx, i * 12 + 6, 3, 3.5, 2);
    ctx.fillStyle = '#3a2a1a';
    ctx.fill();
  }
  roundRect(ctx, -3, 16, 66, 8, 3);
  ctx.fillStyle = '#c9873a';
  ctx.fill();
  ink(ctx, 2.5);
  ctx.restore();
  // little horn nubs poking from the fur at the top (a satyr through and through)
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + sx * 54, 22);
    ctx.quadraticCurveTo(CX + sx * 84, 4, CX + sx * 80, -6);
    ctx.quadraticCurveTo(CX + sx * 70, 10, CX + sx * 44, 30);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -6, 30, [[0, '#fff4dc'], [1, (art.extra?.horn as string) ?? '#efe2c4']]);
    ctx.fill();
    ink(ctx, 3.5);
  }
}

// ——— CYCLOPS SANDALS: a strappy bronze-studded sandal with one huge eye on the instep plate ———

/** Cyclops eye: design-space centre and radii (the lead places a glow sprite here). */
export const CYCLOPS_EYE = { x: CX, y: 92, rx: 58, ry: 34 };

function drawCyclops(ctx: Ctx, art: FootArt, r: () => number): void {
  const skin = art.skin;
  const leather = art.primary!;
  const studCol = art.secondary!;
  const toes = scaled(TOES, 1.12, 10);
  // sole under everything
  ctx.beginPath();
  ctx.moveTo(14, 200);
  ctx.bezierCurveTo(10, 262, 60, 282, CX, 282);
  ctx.bezierCurveTo(166, 282, 214, 262, 212, 196);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 196, 282, [[0, '#a06a3a'], [1, '#4a2c18']]);
  ctx.fill();
  ink(ctx);
  bareFoot(ctx, art, skin, () => {
    stoneTexture(ctx, r, 10, 0, 210, 230, 0);
  }, toes, { nail: '#c8b48a' });
  // straps between the toes and across
  strap(ctx, 22, 186, 200, 186, 26, 13, leather);
  strap(ctx, 30, 140, 194, 140, 10, 13, leather);
  for (const x of [52, 168]) stud(ctx, x, 190 + (x === 52 ? 10 : 10), 6, studCol);
  stud(ctx, CX, 211, 7, studCol);
  // the instep plate: a bronze-rimmed leather shield carrying the eye
  const plate = () => {
    ctx.beginPath();
    ctx.ellipse(CX, 94, 90, 66, 0, 0, Math.PI * 2);
  };
  plate();
  ctx.fillStyle = leatherFill(ctx, leather);
  ctx.fill();
  ink(ctx, 7);
  plate();
  ctx.strokeStyle = bronze(ctx, 20, 200, '#d9a441');
  ctx.lineWidth = 8;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    stud(ctx, CX + Math.cos(a) * 90, 94 + Math.sin(a) * 66, 5.5, studCol);
  }
  // heavy brow
  ctx.beginPath();
  ctx.moveTo(CX - 74, 64);
  ctx.quadraticCurveTo(CX, 22, CX + 74, 64);
  ctx.quadraticCurveTo(CX, 44, CX - 74, 64);
  ctx.closePath();
  ctx.fillStyle = '#3a2418';
  ctx.fill();
  ink(ctx, 3);
  // the eye, big and central (bloodshot veins)
  const E = CYCLOPS_EYE;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(E.x - E.rx, E.y);
  ctx.quadraticCurveTo(E.x, E.y - E.ry * 2, E.x + E.rx, E.y);
  ctx.quadraticCurveTo(E.x, E.y + E.ry * 2, E.x - E.rx, E.y);
  ctx.clip();
  ctx.fillStyle = '#fffbf0';
  ctx.fillRect(E.x - E.rx, E.y - E.ry * 2, E.rx * 2, E.ry * 4);
  ctx.strokeStyle = rgba('#d8343f', 0.55);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const sx = i % 2 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(E.x + sx * E.rx, E.y + (r() - 0.5) * 20);
    ctx.quadraticCurveTo(E.x + sx * E.rx * 0.6, E.y + (r() - 0.5) * 24, E.x + sx * E.rx * 0.35, E.y + (r() - 0.5) * 16);
    ctx.stroke();
  }
  const iris = (art.extra?.iris as string) ?? '#e8402f';
  ellipse(ctx, E.x, E.y, 28, 28);
  ctx.fillStyle = rad(ctx, E.x, E.y, 28, [[0, '#ffd23f'], [0.45, iris], [1, shade(iris, -0.5)]]);
  ctx.fill();
  ink(ctx, 2.5);
  ellipse(ctx, E.x, E.y, 12, 12);
  ctx.fillStyle = '#120a06';
  ctx.fill();
  ellipse(ctx, E.x - 9, E.y - 10, 7, 5);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // upper lid shadow
  ctx.fillStyle = rgba('#3a2418', 0.25);
  ctx.fillRect(E.x - E.rx, E.y - E.ry * 2, E.rx * 2, E.ry * 0.9);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(E.x - E.rx, E.y);
  ctx.quadraticCurveTo(E.x, E.y - E.ry * 2, E.x + E.rx, E.y);
  ctx.quadraticCurveTo(E.x, E.y + E.ry * 2, E.x - E.rx, E.y);
  ctx.closePath();
  ink(ctx, 5);
  // lashes
  for (let i = -3; i <= 3; i++) {
    const x = E.x + i * 15;
    const y = E.y - Math.cos((i / 3.6) * (Math.PI / 2)) * E.ry * 1.0 - 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + i * 2.5, y - 10);
    ink(ctx, 3.5);
  }
  // ankle strap with a bronze buckle
  strap(ctx, 44, 10, 176, 10, 8, 14, leather);
  roundRect(ctx, CX - 16, 2, 32, 22, 5);
  ctx.fillStyle = bronze(ctx, CX - 16, CX + 16, '#d9a441');
  ctx.fill();
  ink(ctx, 3);
}

// ——— HARPY TALONS: scaly gold-clawed bird foot, a feathered skirt and two dark wings ———

function feather(ctx: Ctx, x: number, y: number, len: number, a: number, w: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(w, len * 0.45, 0, len);
  ctx.quadraticCurveTo(-w, len * 0.45, 0, 0);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 0, len, [[0, shade(col, 0.2)], [1, shade(col, -0.35)]]);
  ctx.fill();
  ink(ctx, 3, outlineOf(col));
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, len * 0.85);
  ctx.strokeStyle = rgba('#ffffff', 0.35);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawHarpy(ctx: Ctx, art: FootArt, r: () => number): void {
  const plume = art.primary!;
  const gold = art.secondary!;
  const scale = (art.legColor as string) ?? '#d9b85a';
  // wings spread out to both sides (behind): one silhouette per wing, a scalloped trailing edge of
  // primaries, coverts painted inside, gold-tipped
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(CX, 0);
    ctx.scale(sx, 1);
    const wing = () => {
      ctx.beginPath();
      ctx.moveTo(34, 30);
      ctx.bezierCurveTo(70, -4, 120, -8, 148, 0);
      // scalloped primaries along the bottom edge, from the tip back in
      const tips: P[] = [[146, 40], [136, 82], [120, 116], [100, 140], [78, 150], [56, 140]];
      let prev: P = [148, 0];
      for (const t of tips) {
        ctx.quadraticCurveTo(prev[0] + 10, (prev[1] + t[1]) / 2 + 6, t[0], t[1]);
        ctx.quadraticCurveTo(t[0] - 6, t[1] - 10, t[0] - 4, t[1] - 18);
        prev = t;
      }
      ctx.quadraticCurveTo(44, 110, 38, 80);
      ctx.closePath();
    };
    wing();
    ctx.fillStyle = vgrad(ctx, -8, 150, [[0, shade(plume, 0.35)], [0.55, plume], [1, shade(plume, -0.35)]]);
    ctx.fill();
    ctx.save();
    wing();
    ctx.clip();
    // feather shafts fanning from the shoulder, coverts in rows, gold tips at the edge
    for (let i = 0; i < 7; i++) {
      const a = -0.15 + i * 0.27;
      ctx.beginPath();
      ctx.moveTo(44, 34);
      ctx.lineTo(44 + Math.cos(a) * 140, 34 + Math.sin(a) * 140);
      ctx.strokeStyle = rgba(INK, 0.35);
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    for (let row = 0; row < 3; row++)
      for (let k = 0; k < 5 - row; k++) {
        ctx.beginPath();
        ctx.arc(60 + k * 20 + row * 8, 22 + row * 18, 11, 0.15, Math.PI - 0.15);
        ctx.strokeStyle = rgba(shade(plume, -0.55), 0.6);
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    ctx.strokeStyle = rgba(gold, 0.9);
    ctx.lineWidth = 7;
    wing();
    ctx.stroke();
    glossy(ctx, 80, 20, 40, 14, 0.35);
    ctx.restore();
    wing();
    ink(ctx, 4.5, outlineOf(plume));
    ctx.restore();
  }
  // three front talons + a back spur, scaly, gold claws
  const toe = (pts: P[], w: number) => {
    const tip = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const a = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
    // claw
    ctx.save();
    ctx.translate(tip[0], tip[1]);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-4, -w * 0.4);
    ctx.quadraticCurveTo(w * 1.4, -w * 0.4, w * 1.6, w * 0.7);
    ctx.quadraticCurveTo(w * 0.8, w * 0.2, -4, w * 0.4);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -w, w, [[0, '#fff2a8'], [0.5, gold], [1, shade(gold, -0.45)]]);
    ctx.fill();
    ink(ctx, 3);
    ctx.restore();
    ribbon(ctx, pts, w, w * 0.75);
    ctx.fillStyle = vgrad(ctx, pts[0][1], tip[1], [[0, shade(scale, 0.25)], [1, shade(scale, -0.2)]]);
    ctx.fill();
    ctx.save();
    ribbon(ctx, pts, w, w * 0.75);
    ctx.clip();
    ctx.strokeStyle = rgba(INK, 0.35);
    ctx.lineWidth = 2;
    for (let i = 1; i < pts.length - 1; i += 2) {
      const [x, y] = pts[i];
      ctx.beginPath();
      ctx.arc(x, y - 6, w * 0.5, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
    ctx.restore();
    ribbon(ctx, pts, w, w * 0.75);
    ink(ctx, 4, outlineOf(scale));
  };
  toe(bez([CX - 20, 150], [CX - 50, 190], [CX - 80, 230], [CX - 92, 268], 12), 26);
  toe(bez([CX + 20, 150], [CX + 50, 190], [CX + 80, 230], [CX + 92, 268], 12), 26);
  toe(bez([CX, 150], [CX + 2, 200], [CX - 2, 240], [CX, 286], 12), 30);
  // scaly shank
  const shank = () => {
    ctx.beginPath();
    ctx.moveTo(70, 60);
    ctx.lineTo(64, 170);
    ctx.quadraticCurveTo(CX, 192, 156, 170);
    ctx.lineTo(150, 60);
    ctx.closePath();
  };
  shank();
  ctx.fillStyle = leatherFill(ctx, scale);
  ctx.fill();
  ctx.save();
  shank();
  ctx.clip();
  for (let y = 70; y < 190; y += 14)
    for (let x = 60 + ((y / 14) % 2) * 10; x < 160; x += 20) {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0.1, Math.PI - 0.1);
      ctx.strokeStyle = rgba(INK, 0.3);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  glossy(ctx, 88, 110, 16, 40, 0.3);
  ctx.restore();
  shank();
  ink(ctx, OUT, outlineOf(scale));
  // feathered skirt over the top of the shank
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    feather(ctx, 46 + t * 128, 2 + Math.sin(t * Math.PI) * 6, 70 + Math.sin(t * Math.PI) * 18, (0.5 - t) * 0.5, 16, i % 2 ? plume : shade(plume, 0.18));
  }
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    feather(ctx, 58 + t * 104, -4, 50, (0.5 - t) * 0.4, 14, shade(plume, 0.3));
  }
  void r;
}

// ——— TITAN TOES: a vast craggy stone foot with moss and a bronze toe ring ———

function drawTitanToes(ctx: Ctx, art: FootArt, r: () => number): void {
  const stone = art.skin;
  const moss = '#6f8a3a';
  bareFoot(ctx, art, stone, () => {
    stoneTexture(ctx, r, 10, 0, 210, 240, 5);
    // big chisel facets catching the top-left light
    ctx.fillStyle = rgba('#ffffff', 0.12);
    ctx.beginPath();
    ctx.moveTo(60, 10);
    ctx.lineTo(116, 20);
    ctx.lineTo(96, 130);
    ctx.lineTo(40, 110);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba('#000000', 0.12);
    ctx.beginPath();
    ctx.moveTo(150, 50);
    ctx.lineTo(210, 150);
    ctx.lineTo(150, 196);
    ctx.closePath();
    ctx.fill();
    for (const [mx, my, mr] of [[58, 10, 22], [168, 30, 16], [26, 170, 14]] as const)
      for (let k = 0; k < 7; k++) {
        ellipse(ctx, mx + (r() - 0.5) * mr * 1.6, my + (r() - 0.5) * mr, mr * (0.35 + r() * 0.3), mr * (0.3 + r() * 0.25));
        ctx.fillStyle = k % 2 ? moss : shade(moss, 0.3);
        ctx.fill();
      }
  }, [], {});
  // chunky stone toes with flat cracked nails
  const toes = scaled(TOES, 1.12, 6);
  for (const t of toes) {
    drawToe(ctx, t, stone, { nail: null, ol: outlineOf(stone) });
    ctx.strokeStyle = rgba('#1a1614', 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.cx - t.rx * 0.5, t.cy - t.ry * 0.2);
    ctx.lineTo(t.cx - t.rx * 0.05, t.cy + t.ry * 0.1);
    ctx.lineTo(t.cx + t.rx * 0.2, t.cy + t.ry * 0.5);
    ctx.stroke();
  }
  // bronze ring on the big toe
  const big = toes[4];
  ctx.beginPath();
  ctx.ellipse(big.cx, big.cy - big.ry * 0.45, big.rx * 0.95, big.ry * 0.22, 0, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = bronze(ctx, big.cx - big.rx, big.cx + big.rx, art.secondary!);
  ctx.lineWidth = 7;
  ctx.stroke();
  // pebbles clinging to the heel line
  for (let i = 0; i < 5; i++) {
    ellipse(ctx, 30 + r() * 160, 196 + r() * 20, 5 + r() * 4, 4 + r() * 3);
    ctx.fillStyle = shade(stone, (r() - 0.5) * 0.4);
    ctx.fill();
    ink(ctx, 2);
  }
}

// ——— SKELETON HOPLITE: bone toes, a bronze greave with a red crest, a round shield up front ———

function bone(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number): void {
  const knob = (x: number, y: number) => {
    ellipse(ctx, x - w * 0.35, y, w * 0.45, w * 0.45);
    ellipse(ctx, x + w * 0.35, y, w * 0.45, w * 0.45);
  };
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineCap = 'round';
  ink(ctx, w + OUT);
  ctx.strokeStyle = '#efe6d0';
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.lineCap = 'butt';
  for (const [x, y] of [[x0, y0], [x1, y1]] as const) {
    knob(x, y);
    ctx.fillStyle = '#efe6d0';
    ctx.fill();
  }
  ctx.strokeStyle = rgba('#8a7a5a', 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + 3, y0 + 3);
  ctx.lineTo(x1 + 3, y1 + 3);
  ctx.stroke();
}

function drawHoplite(ctx: Ctx, art: FootArt, r: () => number): void {
  const bz = art.primary!;
  const crest = art.secondary!;
  // bony toes (two phalanges each), splayed below the shield
  const toeX = [34, 72, 110, 148, 186];
  toeX.forEach((x, i) => {
    const y0 = 196;
    const y1 = 232 + Math.sin(((i + 0.5) / 5) * Math.PI) * 10;
    const y2 = y1 + 26;
    const x1 = x + (x - CX) * 0.08;
    bone(ctx, x, y0, x1, y1, 15);
    bone(ctx, x1, y1, x1 + (x - CX) * 0.05, y2, 13);
    // toe tip
    ellipse(ctx, x1 + (x - CX) * 0.05, y2 + 6, 9, 8);
    ctx.fillStyle = '#e8dcc0';
    ctx.fill();
    ink(ctx, 3);
  });
  // the bronze greave (shin armour) down to the instep
  const greave = () => {
    ctx.beginPath();
    ctx.moveTo(46, -6);
    ctx.bezierCurveTo(40, 50, 26, 110, 30, 170);
    ctx.quadraticCurveTo(CX, 196, 190, 170);
    ctx.bezierCurveTo(194, 110, 180, 50, 174, -6);
    ctx.closePath();
  };
  greave();
  ctx.fillStyle = bronze(ctx, 26, 194, bz);
  ctx.fill();
  ctx.save();
  greave();
  ctx.clip();
  // embossed muscle lines and verdigris spots
  ctx.strokeStyle = rgba(INK, 0.35);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX, 0);
  ctx.bezierCurveTo(CX - 30, 50, CX - 10, 100, CX - 40, 150);
  ctx.moveTo(CX + 4, 0);
  ctx.bezierCurveTo(CX + 30, 50, CX + 12, 100, CX + 40, 150);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    ellipse(ctx, 30 + r() * 160, 10 + r() * 160, 4 + r() * 8, 3 + r() * 5);
    ctx.fillStyle = rgba('#4fa89a', 0.45);
    ctx.fill();
  }
  ctx.restore();
  greave();
  ink(ctx, OUT, outlineOf(bz));
  // red horsehair crest sweeping off the greave's side like a helmet plume
  const plume = () => {
    ctx.beginPath();
    ctx.moveTo(150, 4);
    ctx.bezierCurveTo(196, -10, 250, 10, 256, 70);
    ctx.bezierCurveTo(244, 56, 236, 62, 230, 74);
    ctx.bezierCurveTo(220, 56, 206, 58, 200, 70);
    ctx.bezierCurveTo(194, 48, 178, 40, 168, 44);
    ctx.closePath();
  };
  plume();
  ctx.fillStyle = vgrad(ctx, -10, 74, [[0, shade(crest, 0.35)], [1, shade(crest, -0.3)]]);
  ctx.fill();
  ctx.save();
  plume();
  ctx.clip();
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    ctx.beginPath();
    ctx.moveTo(152, 8 + t * 30);
    ctx.quadraticCurveTo(200, -6 + t * 30, 236 + t * 20, 30 + t * 44);
    ctx.strokeStyle = rgba(i % 2 ? '#ffffff' : '#3a0a0a', i % 2 ? 0.25 : 0.35);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
  plume();
  ink(ctx, 4.5);
  // the crest's bronze holder
  roundRect(ctx, 140, 0, 26, 20, 6);
  ctx.fillStyle = bronze(ctx, 140, 166, bz);
  ctx.fill();
  ink(ctx, 3);
  // the round aspis shield, covering the front of the foot
  const SX = CX;
  const SY = 150;
  const SR = 98;
  ellipse(ctx, SX, SY, SR, SR * 0.92);
  ctx.fillStyle = rad(ctx, SX, SY, SR, [[0, shade(bz, 0.55)], [0.45, bz], [1, shade(bz, -0.5)]]);
  ctx.fill();
  ink(ctx, 7);
  ellipse(ctx, SX, SY, SR * 0.8, SR * 0.74);
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 3;
  ctx.stroke();
  // red field with a black-figure lambda
  ellipse(ctx, SX, SY, SR * 0.66, SR * 0.6);
  ctx.fillStyle = rad(ctx, SX, SY, SR * 0.66, [[0, shade(crest, 0.25)], [1, shade(crest, -0.35)]]);
  ctx.fill();
  ink(ctx, 3.5);
  ctx.beginPath();
  ctx.moveTo(SX - 34, SY + 36);
  ctx.lineTo(SX, SY - 38);
  ctx.lineTo(SX + 34, SY + 36);
  ctx.strokeStyle = '#1a1210';
  ctx.lineWidth = 13;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // rim rivets and a sheen
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    stud(ctx, SX + Math.cos(a) * SR * 0.9, SY + Math.sin(a) * SR * 0.83, 4.5, shade(bz, 0.3));
  }
  ctx.save();
  ellipse(ctx, SX, SY, SR, SR * 0.92);
  ctx.clip();
  ctx.fillStyle = rgba('#ffffff', 0.22);
  ctx.beginPath();
  ctx.ellipse(SX - 40, SY - 44, 46, 18, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ——— SIREN SLIPPERS: teal scaled slipper, fins at the heel, pearl straps and a shell ———

function drawSiren(ctx: Ctx, art: FootArt, r: () => number): void {
  const teal = art.primary!;
  const pearl = art.secondary!;
  // fins out to the sides
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(CX, 0);
    ctx.scale(sx, 1);
    ctx.beginPath();
    ctx.moveTo(86, 40);
    ctx.quadraticCurveTo(150, 10, 146, 90);
    ctx.quadraticCurveTo(132, 76, 122, 98);
    ctx.quadraticCurveTo(112, 84, 96, 108);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, 10, 110, [[0, shade(teal, 0.45)], [1, shade(teal, -0.2)]]);
    ctx.fill();
    ink(ctx, 4, outlineOf(teal));
    ctx.strokeStyle = rgba('#ffffff', 0.45);
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(92, 50 + k * 6);
      ctx.quadraticCurveTo(120, 40 + k * 10, 128 + k * 3, 80 + k * 4);
      ctx.stroke();
    }
    ctx.restore();
  }
  // the slipper: one silhouette, toes peeking from an open front
  const toes = scaled(TOES, 0.9, -4);
  for (const t of toes) drawToe(ctx, t, art.skin, { nail: art.nails, ol: outlineOf(art.skin) });
  const shoe = () => {
    ctx.beginPath();
    ctx.moveTo(52, -6);
    ctx.bezierCurveTo(46, 60, 14, 110, 16, 180);
    ctx.bezierCurveTo(30, 206, 60, 214, 70, 200);
    ctx.quadraticCurveTo(CX, 170, 152, 200);
    ctx.bezierCurveTo(166, 216, 200, 206, 206, 180);
    ctx.bezierCurveTo(208, 110, 174, 60, 168, -6);
    ctx.closePath();
  };
  shoe();
  ctx.fillStyle = leatherFill(ctx, teal);
  ctx.fill();
  ctx.save();
  shoe();
  ctx.clip();
  // fish scales
  for (let y = -4; y < 220; y += 16)
    for (let x = ((y / 16) % 2) * 12; x < 230; x += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0.15, Math.PI - 0.15);
      ctx.strokeStyle = rgba(shade(teal, -0.5), 0.45);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 2, y + 2, 7, 0.6, Math.PI - 0.9);
      ctx.strokeStyle = rgba('#d8fff6', 0.35);
      ctx.stroke();
    }
  glossy(ctx, 70, 70, 34, 70, 0.4);
  ctx.restore();
  shoe();
  ink(ctx, OUT, outlineOf(teal));
  // pearl straps
  const pearls = (pts: P[], rr: number) => {
    for (const [x, y] of pts) {
      ellipse(ctx, x, y, rr, rr);
      ctx.fillStyle = rad(ctx, x, y, rr, [[0, '#ffffff'], [0.6, pearl], [1, shade(pearl, -0.3)]]);
      ctx.fill();
      ink(ctx, 2);
    }
  };
  pearls(bez([28, 120], [70, 150], [150, 150], [192, 120], 11), 7);
  pearls(bez([50, 24], [80, 44], [140, 44], [170, 24], 9), 6);
  // scallop shell on the vamp
  ctx.save();
  ctx.translate(CX, 132);
  ctx.beginPath();
  ctx.moveTo(-10, 26);
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ctx.lineTo(Math.cos(a) * 40, -4 + Math.sin(a) * 40 + (i % 2 ? 4 : 0));
  }
  ctx.lineTo(10, 26);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -44, 26, [[0, '#fff0f0'], [1, '#f4a8b8']]);
  ctx.fill();
  ink(ctx, 3.5);
  ctx.strokeStyle = rgba('#b8586a', 0.6);
  ctx.lineWidth = 2;
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(Math.cos(a) * 36, -4 + Math.sin(a) * 36);
    ctx.stroke();
  }
  ctx.restore();
  void r;
}

// ——— GORGON SNAKE: a little green snake coiled into the shape of a sandal ———

function drawSnake(ctx: Ctx, art: FootArt, r: () => number): void {
  const col = art.primary!;
  const belly = art.secondary!;
  // coil loops stacked into a foot shape, from the ankle down, then the head rears at the toe
  // stacked coils, widening toward the toe like a sandal, each one drawn over the last
  const coils: [P, P, P, P][] = [
    [[CX - 30, -6], [CX - 80, 20], [CX + 80, 26], [CX + 56, 60]],
    [[CX + 56, 60], [CX + 30, 96], [CX - 96, 80], [CX - 74, 120]],
    [[CX - 74, 120], [CX - 60, 160], [CX + 104, 136], [CX + 86, 180]],
    [[CX + 86, 180], [CX + 70, 222], [CX - 100, 200], [CX - 76, 236]],
  ];
  coils.forEach((c, i) => {
    const pts = bez(c[0], c[1], c[2], c[3], 12);
    ribbon(ctx, pts, 62, 62);
    ctx.fillStyle = vgrad(ctx, c[0][1] - 30, c[3][1] + 30, [[0, shade(col, 0.25 - i * 0.05)], [1, shade(col, -0.2)]]);
    ctx.fill();
    ctx.save();
    ribbon(ctx, pts, 62, 62);
    ctx.clip();
    // diamond scale pattern and the yellow belly band showing on the lower edge
    ctx.fillStyle = rgba(shade(col, -0.45), 0.5);
    for (let k = 1; k < pts.length; k += 2) {
      ctx.beginPath();
      ctx.moveTo(pts[k][0], pts[k][1] - 10);
      ctx.lineTo(pts[k][0] + 8, pts[k][1]);
      ctx.lineTo(pts[k][0], pts[k][1] + 10);
      ctx.lineTo(pts[k][0] - 8, pts[k][1]);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(belly, 0.9);
    ctx.lineWidth = 12;
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y + 26) : ctx.moveTo(x, y + 26)));
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.lineWidth = 6;
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x - 4, y - 18) : ctx.moveTo(x - 4, y - 18)));
    ctx.stroke();
    ctx.restore();
    ribbon(ctx, pts, 62, 62);
    ink(ctx, OUT, outlineOf(col));
  });
  // the head rears up off the last coil at the toe, tongue out
  snake(ctx, bez([CX - 76, 236], [CX - 20, 270], [CX + 30, 236], [CX + 52, 262], 10), 54, shade(col, 0.1), belly, true);
  void r;
}

// ——— KRONOS: grey-blue stone foot with a carved clock dial, a sickle and an hourglass ———

function hourglass(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  for (const yy of [-34, 34]) {
    roundRect(ctx, -26, yy - 5, 52, 10, 4);
    ctx.fillStyle = bronze(ctx, -26, 26, '#d9a441');
    ctx.fill();
    ink(ctx, 3);
  }
  ctx.beginPath();
  ctx.moveTo(-20, -29);
  ctx.quadraticCurveTo(-20, -6, -3, 0);
  ctx.quadraticCurveTo(-20, 6, -20, 29);
  ctx.lineTo(20, 29);
  ctx.quadraticCurveTo(20, 6, 3, 0);
  ctx.quadraticCurveTo(20, -6, 20, -29);
  ctx.closePath();
  ctx.fillStyle = rgba('#dff6ff', 0.75);
  ctx.fill();
  ink(ctx, 3);
  // sand
  ctx.beginPath();
  ctx.moveTo(-12, -14);
  ctx.quadraticCurveTo(0, -8, 12, -14);
  ctx.lineTo(2, -2);
  ctx.lineTo(-2, -2);
  ctx.closePath();
  ctx.moveTo(-17, 27);
  ctx.quadraticCurveTo(0, 8, 17, 27);
  ctx.closePath();
  ctx.fillStyle = '#ffcf6a';
  ctx.fill();
  ctx.fillRect(-1, -2, 2, 22);
  ctx.fillStyle = rgba('#ffffff', 0.6);
  ctx.fillRect(-15, -24, 4, 14);
  ctx.restore();
}

function drawKronos(ctx: Ctx, art: FootArt, r: () => number): void {
  const stone = art.skin;
  const gold = art.secondary!;
  // the sickle behind the foot, blade curling out to the right
  ctx.beginPath();
  ctx.moveTo(196, 40);
  ctx.bezierCurveTo(270, 50, 270, 170, 214, 196);
  ctx.bezierCurveTo(244, 150, 236, 80, 192, 62);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 40, 196, [[0, '#f4f6f9'], [0.5, '#9aa3ad'], [1, '#5a6070']]);
  ctx.fill();
  ink(ctx, 4);
  roundRect(ctx, 176, 50, 26, 12, 4);
  ctx.fillStyle = '#5a3a22';
  ctx.fill();
  ink(ctx, 3);
  bareFoot(ctx, art, stone, () => {
    stoneTexture(ctx, r, 10, 0, 210, 240, 3);
    // carved clock dial on the instep
    const cx = CX;
    const cy = 120;
    ellipse(ctx, cx, cy, 56, 52);
    ctx.fillStyle = rgba('#000000', 0.16);
    ctx.fill();
    ctx.strokeStyle = rgba(gold, 0.95);
    ctx.lineWidth = 4;
    ctx.stroke();
    ellipse(ctx, cx, cy, 44, 40);
    ctx.strokeStyle = rgba(gold, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = gold;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ellipse(ctx, cx + Math.cos(a) * 50, cy + Math.sin(a) * 46, i % 3 ? 2.5 : 4.5, i % 3 ? 2.5 : 4.5);
      ctx.fill();
    }
    ctx.strokeStyle = gold;
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 2, cy - 32);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 24, cy + 10);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }, scaled(TOES, 1.04, 2), { nail: '#b8bccc' });
  // hourglass strapped at the ankle front
  strap(ctx, 46, 34, 174, 34, 12, 12, '#5a3a22');
  hourglass(ctx, CX, 40, 0.95);
}

// ——— ATLAS: muscled bronze-skinned foot, a celestial-sphere tattoo, blue cloth wraps ———

function drawAtlas(ctx: Ctx, art: FootArt, r: () => number): void {
  const skin = art.skin;
  const cloth = art.primary!;
  const gold = art.secondary!;
  bareFoot(ctx, art, skin, () => {
    // tendons and muscle bulk
    ctx.strokeStyle = rgba(INK, 0.22);
    ctx.lineWidth = 3;
    for (const x of [74, 98, 122, 146]) {
      ctx.beginPath();
      ctx.moveTo(x + (x - CX) * 0.1, 70);
      ctx.quadraticCurveTo(x + (x - CX) * 0.3, 140, x + (x - CX) * 0.5, 196);
      ctx.stroke();
    }
    // celestial sphere: a circle with meridians and stars
    const cx = CX + 4;
    const cy = 128;
    ellipse(ctx, cx, cy, 42, 42);
    ctx.fillStyle = rgba('#1d3a6e', 0.55);
    ctx.fill();
    ctx.strokeStyle = rgba('#1d2b5a', 0.9);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 42, 14, 0.3, 0, Math.PI * 2);
    ctx.moveTo(cx, cy - 42);
    ctx.ellipse(cx, cy, 16, 42, 0, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.fillStyle = '#ffe96a';
    for (let i = 0; i < 7; i++) {
      ellipse(ctx, cx + (r() - 0.5) * 60, cy + (r() - 0.5) * 60, 2.5, 2.5);
      ctx.fill();
    }
  }, scaled(TOES, 1.08, 4), { nail: null });
  // cloth wraps around the ankle, crossing over
  for (const [y, tilt] of [[18, 10], [44, -10], [70, 12]] as const) strap(ctx, 34, y - tilt, 188, y + tilt, 14, 18, cloth);
  // a gold band
  strap(ctx, 40, 92, 184, 92, 10, 9, gold);
}

// ——— HYPERION: molten gold sun foot with a halo of flame rays ———

function drawHyperion(ctx: Ctx, art: FootArt, r: () => number): void {
  const gold = art.skin;
  const fire = art.primary!;
  const white = art.secondary!;
  // sun rays behind, alternating long and short
  ctx.save();
  ctx.translate(CX, 120);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const L = i % 2 ? 128 : 150;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-16, 70);
    ctx.quadraticCurveTo(-6, L * 0.8, 0, L);
    ctx.quadraticCurveTo(6, L * 0.8, 16, 70);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, 70, L, [[0, white], [0.5, '#ffcf3a'], [1, fire]]);
    ctx.fill();
    ink(ctx, 3, rgba(INK, 0.7));
    ctx.restore();
  }
  ctx.restore();
  bareFoot(ctx, art, gold, () => {
    // white-hot core glow
    const g = ctx.createRadialGradient(CX, 120, 10, CX, 120, 130);
    g.addColorStop(0, rgba('#ffffff', 0.85));
    g.addColorStop(0.4, rgba(white, 0.4));
    g.addColorStop(1, rgba(fire, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 230, 240);
    // a sun face sigil
    ctx.strokeStyle = rgba(shade(fire, -0.3), 0.8);
    ctx.lineWidth = 3;
    ellipse(ctx, CX, 116, 26, 26);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a) * 32, 116 + Math.sin(a) * 32);
      ctx.lineTo(CX + Math.cos(a) * 44, 116 + Math.sin(a) * 44);
      ctx.stroke();
    }
    void r;
  }, scaled(TOES, 1.04, 2), { nail: '#fff6c8' });
  // flame wisps rising off the ankle
  for (const [x, h, lean] of [[50, 54, -10], [86, 64, -4], [134, 66, 4], [170, 52, 10]] as const) flameLick(ctx, x, 30, 14, h, lean, [fire, '#ffcf3a', '#fff6c8']);
}

// ——— THE MINOTAUR: a bull's hoof boot with horns, a bronze nose ring and a studded band ———

function drawMinotaur(ctx: Ctx, art: FootArt, r: () => number): void {
  const fur = art.skin;
  const dark = art.primary!;
  const gold = art.secondary!;
  const horn = (art.extra?.horn as string) ?? '#efe2c4';
  // horns sweeping out from the sides of the ankle (behind the fur)
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(CX, 0);
    ctx.scale(sx, 1);
    const pts = bez([50, 64], [110, 70], [150, 40], [140, -6], 16);
    ribbon(ctx, pts, 34, 6);
    ctx.fillStyle = vgrad(ctx, -6, 70, [[0, '#3a2a1a'], [0.35, shade(horn, -0.1)], [1, horn]]);
    ctx.fill();
    ctx.save();
    ribbon(ctx, pts, 34, 6);
    ctx.clip();
    ctx.strokeStyle = rgba(INK, 0.3);
    ctx.lineWidth = 2;
    for (let k = 2; k < pts.length - 4; k += 2) {
      const [x, y] = pts[k];
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 10);
      ctx.lineTo(x + 14, y + 10);
      ctx.stroke();
    }
    ctx.restore();
    ribbon(ctx, pts, 34, 6);
    ink(ctx, OUT);
    // bronze horn cap tips
    ctx.restore();
  }
  // the big cloven hoof
  clovenHoof(ctx, CX, 176, 278, 100, '#2a1e18');
  // the furry boot body
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(40, -6);
    ctx.bezierCurveTo(34, 60, 6, 110, 8, 176);
    ctx.quadraticCurveTo(CX, 210, 212, 176);
    ctx.bezierCurveTo(214, 110, 186, 60, 180, -6);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = leatherFill(ctx, fur);
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  drawHair(ctx, r, 6, -6, 210, 210, shade(fur, -0.4), 180);
  drawHair(ctx, r, 20, -6, 110, 190, shade(fur, 0.35), 90);
  // a lighter muzzle patch at the front where the bull's face sits
  ellipse(ctx, CX, 150, 70, 48);
  ctx.fillStyle = rgba(shade(fur, 0.45), 0.55);
  ctx.fill();
  glossy(ctx, 70, 60, 36, 70, 0.2);
  ctx.restore();
  body();
  ink(ctx, OUT, outlineOf(fur));
  // fur tufts spilling over the hoof
  const edge: P[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    edge.push([10 + t * 200, 176 + Math.sin(t * Math.PI) * 18]);
  }
  for (let i = 0; i < edge.length - 1; i++) {
    const [x0, y0] = edge[i];
    const [x1, y1] = edge[i + 1];
    ctx.beginPath();
    ctx.moveTo(x0, y0 - 4);
    ctx.quadraticCurveTo((x0 + x1) / 2, y0 + 18 + r() * 8, x1, y1 - 4);
    ctx.fillStyle = shade(fur, -0.15);
    ctx.fill();
    ink(ctx, 3, outlineOf(fur));
  }
  // bull face on the front: angry brows, eyes, nostrils and the bronze ring
  for (const sx of [-1, 1]) {
    ellipse(ctx, CX + sx * 36, 112, 12, 9);
    ctx.fillStyle = '#ffe9c0';
    ctx.fill();
    ink(ctx, 3);
    ellipse(ctx, CX + sx * 34, 113, 5, 6);
    ctx.fillStyle = '#c8102e';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(CX + sx * 54, 96);
    ctx.lineTo(CX + sx * 18, 106);
    ink(ctx, 7, INK);
    // nostrils
    ellipse(ctx, CX + sx * 20, 160, 10, 7, sx * 0.4);
    ctx.fillStyle = '#2a1408';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(CX, 176, 24, 20, 0, 0, Math.PI);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.strokeStyle = bronze(ctx, CX - 24, CX + 24, gold);
  ctx.lineWidth = 8;
  ctx.stroke();
  ellipse(ctx, CX - 12, 190, 4, 3);
  ctx.fillStyle = rgba('#ffffff', 0.7);
  ctx.fill();
  // studded bronze band round the ankle with a labrys emblem
  roundRect(ctx, 34, 18, 152, 28, 10);
  ctx.fillStyle = bronze(ctx, 34, 186, gold);
  ctx.fill();
  ink(ctx, 4.5);
  for (let i = 0; i < 7; i++) stud(ctx, 46 + i * 21.5, 32, 4.5, shade(gold, 0.2));
  // steam puffs from the nostrils (the snort tell lives in the brain; a hint here)
  for (const sx of [-1, 1]) {
    ellipse(ctx, CX + sx * 56, 182, 12, 9);
    ctx.fillStyle = rgba('#ffffff', 0.55);
    ctx.fill();
  }
  void dark;
}

// ——— MEDUSA: a gold gladiator sandal laced with living snakes, two glowing eyes on the vamp ———

/** Medusa's eyes: design-space centres and radii (the lead places glow sprites here). */
export const MEDUSA_EYES = [
  { x: 78, y: 128, rx: 22, ry: 13 },
  { x: 142, y: 128, rx: 22, ry: 13 },
];

function drawMedusa(ctx: Ctx, art: FootArt, r: () => number): void {
  const skin = art.skin;
  const gold = art.primary!;
  const green = art.secondary!;
  const glowCol = (art.extra?.eye as string) ?? '#9dff6a';
  // hair snakes rising out of the ankle, writhing out to both sides (behind)
  const hair: [P, P, P, P][] = [
    [[60, 20], [16, 0], [0, 40], [-18, 18]],
    [[66, 40], [6, 60], [-20, 90], [-14, 120]],
    [[160, 20], [204, 0], [220, 40], [238, 18]],
    [[154, 40], [214, 60], [240, 90], [234, 120]],
    [[80, 8], [60, -4], [36, 4], [22, 6]],
    [[140, 8], [160, -4], [184, 4], [198, 6]],
  ];
  hair.forEach(([a, b, c, d], i) => snake(ctx, bez(a, b, c, d, 16), 30, i % 2 ? green : shade(green, 0.15), '#e8d36a'));
  // gold sole
  ctx.beginPath();
  ctx.moveTo(10, 196);
  ctx.bezierCurveTo(6, 270, 60, 286, CX, 286);
  ctx.bezierCurveTo(166, 286, 216, 268, 212, 192);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 196, 286, [[0, shade(gold, 0.3)], [1, shade(gold, -0.45)]]);
  ctx.fill();
  ink(ctx);
  greekKey(ctx, 34, 186, 262, 12, rgba(INK, 0.55), 3);
  // scaly green-skinned foot
  bareFoot(ctx, art, skin, () => {
    for (let y = 0; y < 230; y += 13)
      for (let x = ((y / 13) % 2) * 9; x < 230; x += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 9, 0.2, Math.PI - 0.2);
        ctx.strokeStyle = rgba(shade(skin, -0.5), 0.35);
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    // the eye band: a dark green mask across the vamp so the eyes pop
    ctx.beginPath();
    ctx.moveTo(20, 116);
    ctx.quadraticCurveTo(CX, 86, 200, 116);
    ctx.quadraticCurveTo(CX, 168, 20, 116);
    ctx.fillStyle = rgba('#1e3a1a', 0.55);
    ctx.fill();
  }, scaled(TOES, 1.02, 4), { nail: gold });
  // snake straps lacing up the foot (they cross over the ankle)
  snake(ctx, bez([20, 178], [70, 206], [150, 150], [206, 176], 14), 20, green, '#e8d36a', false);
  snake(ctx, bez([200, 60], [140, 80], [80, 30], [30, 70], 14), 18, shade(green, 0.12), '#e8d36a', false);
  snake(ctx, bez([30, 20], [90, 50], [140, 0], [194, 30], 14), 16, green, '#e8d36a', false);
  // gold brooch at the ankle with a gorgon-face roundel
  ellipse(ctx, CX, 50, 20, 20);
  ctx.fillStyle = rad(ctx, CX, 50, 20, [[0, shade(gold, 0.6)], [0.6, gold], [1, shade(gold, -0.4)]]);
  ctx.fill();
  ink(ctx, 3.5);
  ellipse(ctx, CX, 50, 9, 9);
  ctx.fillStyle = green;
  ctx.fill();
  ink(ctx, 2);
  // brows, then the two eyes (slit pupils, faintly glowing even at rest)
  for (const e of MEDUSA_EYES) {
    const sx = e.x < CX ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(e.x - sx * 6 - e.rx, e.y - 22);
    ctx.quadraticCurveTo(e.x, e.y - 34, e.x + sx * 22 + (sx > 0 ? 0 : 0), e.y - 14);
    ink(ctx, 6, INK);
    eye(ctx, e.x, e.y, e.rx, e.ry, glowCol, true, glowCol);
  }
  // sheen on the top-left of the sole
  glossy(ctx, 50, 220, 30, 12, 0.4);
  void r;
}

// ——— CERBERUS: a black hound's paw with fat toe pads, claws and a spiked red collar ———

function drawCerberus(ctx: Ctx, art: FootArt, r: () => number): void {
  const fur = art.skin;
  const dark = art.primary!;
  const red = art.secondary!;
  const toes: Toe[] = [
    { cx: 34, cy: 214, rx: 30, ry: 34 },
    { cx: 84, cy: 238, rx: 32, ry: 36 },
    { cx: 136, cy: 238, rx: 32, ry: 36 },
    { cx: 186, cy: 214, rx: 30, ry: 34 },
  ];
  // claws first (they poke out below)
  for (const t of toes) {
    ctx.beginPath();
    ctx.moveTo(t.cx - t.rx * 0.38, t.cy + t.ry * 0.55);
    ctx.quadraticCurveTo(t.cx - t.rx * 0.1, t.cy + t.ry * 1.75, t.cx + t.rx * 0.3, t.cy + t.ry * 1.65);
    ctx.quadraticCurveTo(t.cx + t.rx * 0.18, t.cy + t.ry * 1.1, t.cx + t.rx * 0.38, t.cy + t.ry * 0.55);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, t.cy, t.cy + t.ry * 1.75, [[0, '#d8d0c0'], [1, '#4a4038']]);
    ctx.fill();
    ink(ctx, 3.5);
  }
  // one paw silhouette: body plus toe lobes
  const paw = () => {
    ctx.beginPath();
    ctx.moveTo(42, -6);
    ctx.bezierCurveTo(38, 60, 4, 110, 6, 180);
    for (const t of toes) ctx.ellipse(t.cx, t.cy, t.rx, t.ry, 0, Math.PI, 0, true);
    ctx.bezierCurveTo(216, 110, 182, 60, 178, -6);
    ctx.closePath();
  };
  // union: body and toes, stroked thick behind, then filled
  const shapes = [() => paw(), ...toes.map((t) => () => ellipse(ctx, t.cx, t.cy, t.rx, t.ry))];
  for (const s of shapes) {
    s();
    ctx.strokeStyle = outlineOf(fur);
    ctx.lineWidth = OUT * 2;
    ctx.stroke();
  }
  ctx.fillStyle = leatherFill(ctx, fur);
  for (const s of shapes) {
    s();
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  for (const s of shapes) s();
  paw();
  ctx.clip();
  drawHair(ctx, r, 4, -6, 216, 270, shade(fur, -0.4), 220);
  drawHair(ctx, r, 20, -6, 100, 230, shade(fur, 0.45), 100);
  glossy(ctx, 70, 60, 34, 70, 0.18);
  // toe divisions
  ctx.strokeStyle = rgba('#000000', 0.5);
  ctx.lineWidth = 3;
  for (const x of [60, 110, 160]) {
    ctx.beginPath();
    ctx.moveTo(x, 190);
    ctx.quadraticCurveTo(x, 220, x + (x - CX) * 0.2, 250);
    ctx.stroke();
  }
  ctx.restore();
  // spiked red collar round the ankle, with a bronze ring and a skull tag
  roundRect(ctx, 30, 20, 160, 34, 12);
  ctx.fillStyle = leatherFill(ctx, red);
  ctx.fill();
  ink(ctx, 4.5);
  for (let i = 0; i < 6; i++) {
    const x = 44 + i * 26.5;
    ctx.beginPath();
    ctx.moveTo(x - 9, 22);
    ctx.lineTo(x, 2);
    ctx.lineTo(x + 9, 22);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, 2, 22, [[0, '#ffffff'], [1, '#8a9098']]);
    ctx.fill();
    ink(ctx, 3);
    stud(ctx, x, 37, 4, '#c3cdd8');
  }
  ctx.beginPath();
  ctx.arc(CX, 62, 12, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = bronze(ctx, CX - 12, CX + 12, '#d9a441');
  ctx.lineWidth = 5;
  ctx.stroke();
  // skull tag
  ellipse(ctx, CX, 90, 16, 14);
  ctx.fillStyle = '#efe6d0';
  ctx.fill();
  ink(ctx, 3);
  for (const sx of [-1, 1]) {
    ellipse(ctx, CX + sx * 6, 88, 4, 4.5);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  ctx.fillRect(CX - 6, 98, 12, 4);
  void dark;
}

// ——— HADES: a black iron greave sandal wreathed in blue flame, with a bident and a skull clasp ———

function drawHades(ctx: Ctx, art: FootArt, r: () => number): void {
  const skin = art.skin;
  const iron = art.primary!;
  const blue = (art.extra?.flame as string) ?? art.secondary!;
  // blue flames licking out behind the ankle and shin
  for (const [x, h, lean] of [[30, 90, -26], [62, 118, -12], [96, 96, -4], [124, 104, 6], [158, 120, 14], [190, 86, 26]] as const)
    flameLick(ctx, x, 110, 22, h, lean, ['#1d5aa8', blue, '#e8fbff']);
  // pale toes in an iron sandal
  const toes = scaled(TOES, 1.06, 6);
  ctx.beginPath();
  ctx.moveTo(10, 200);
  ctx.bezierCurveTo(6, 270, 60, 288, CX, 288);
  ctx.bezierCurveTo(166, 288, 216, 270, 212, 196);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 196, 288, [[0, '#4a4658'], [1, '#141218']]);
  ctx.fill();
  ink(ctx);
  greekKey(ctx, 34, 186, 268, 12, rgba(blue, 0.7), 3);
  for (const t of toes) drawToe(ctx, t, skin, { nail: '#a8b4d0', ol: outlineOf(skin) });
  // the iron greave over the foot
  const greave = () => {
    ctx.beginPath();
    ctx.moveTo(42, -6);
    ctx.bezierCurveTo(36, 60, 14, 110, 18, 178);
    ctx.quadraticCurveTo(CX, 206, 202, 178);
    ctx.bezierCurveTo(206, 110, 184, 60, 178, -6);
    ctx.closePath();
  };
  greave();
  const g = ctx.createLinearGradient(14, 0, 206, 0);
  g.addColorStop(0, shade(iron, -0.4));
  g.addColorStop(0.28, shade(iron, 0.25));
  g.addColorStop(0.4, shade(iron, 0.75));
  g.addColorStop(0.55, iron);
  g.addColorStop(1, shade(iron, -0.5));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  greave();
  ctx.clip();
  // plate seams with rivets
  for (const y of [56, 116]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(CX, y + 22, 230, y);
    ctx.strokeStyle = rgba('#000000', 0.55);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.18);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + 4);
    ctx.quadraticCurveTo(CX, y + 26, 230, y + 4);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 32;
      stud(ctx, x, y + 6 + Math.sin(((x - 10) / 210) * Math.PI) * 10, 3.5, '#8a8aa0');
    }
  }
  // the bident, engraved and glowing blue
  ctx.save();
  ctx.shadowColor = blue;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = blue;
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(CX, 186);
  ctx.lineTo(CX, 120);
  ctx.moveTo(CX - 24, 96);
  ctx.quadraticCurveTo(CX - 24, 124, CX, 124);
  ctx.quadraticCurveTo(CX + 24, 124, CX + 24, 96);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = rgba('#ffffff', 0.12);
  ctx.beginPath();
  ctx.ellipse(66, 70, 18, 70, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  greave();
  ink(ctx, OUT, outlineOf(iron));
  // sandal straps over the toes
  strap(ctx, 16, 192, 204, 192, 22, 12, '#2e2c3a');
  // skull clasp at the ankle, eyes lit blue
  ellipse(ctx, CX, 30, 26, 24);
  ctx.fillStyle = vgrad(ctx, 6, 54, [[0, '#ffffff'], [1, '#c8c0a8']]);
  ctx.fill();
  ink(ctx, 4);
  roundRect(ctx, CX - 14, 44, 28, 16, 5);
  ctx.fillStyle = '#d8d0b8';
  ctx.fill();
  ink(ctx, 3);
  for (const x of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.moveTo(CX + x, 46);
    ctx.lineTo(CX + x, 58);
    ink(ctx, 2);
  }
  for (const sx of [-1, 1]) {
    ellipse(ctx, CX + sx * 10, 28, 7, 8);
    ctx.fillStyle = '#141218';
    ctx.fill();
    ctx.save();
    ctx.shadowColor = blue;
    ctx.shadowBlur = 10;
    ellipse(ctx, CX + sx * 10, 29, 3, 3.5);
    ctx.fillStyle = '#c8f4ff';
    ctx.fill();
    ctx.restore();
  }
  void r;
}

registerKind('m_satyr', { draw: drawSatyr, contactY: 266, halfWidth: 100 });
registerKind('m_cyclops', { draw: drawCyclops, contactY: 282, halfWidth: 106 });
registerKind('m_harpy', { draw: drawHarpy, contactY: 296, halfWidth: 92 });
registerKind('m_titantoes', { draw: drawTitanToes, contactY: 270, halfWidth: 108 });
registerKind('m_hoplite', { draw: drawHoplite, contactY: 270, halfWidth: 104 });
registerKind('m_siren', { draw: drawSiren, contactY: 260, halfWidth: 100 });
registerKind('m_snake', { draw: drawSnake, contactY: 270, halfWidth: 96 });
registerKind('m_kronos', { draw: drawKronos, contactY: 266, halfWidth: 106 });
registerKind('m_atlas', { draw: drawAtlas, contactY: 268, halfWidth: 106 });
registerKind('m_hyperion', { draw: drawHyperion, contactY: 266, halfWidth: 106 });
registerKind('m_minotaur', { draw: drawMinotaur, contactY: 278, halfWidth: 112 });
registerKind('m_medusa', { draw: drawMedusa, contactY: 286, halfWidth: 110 });
registerKind('m_cerberus', { draw: drawCerberus, contactY: 290, halfWidth: 112 });
registerKind('m_hades', { draw: drawHades, contactY: 288, halfWidth: 108 });
