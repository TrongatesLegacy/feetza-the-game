// Shaped god peel heads: the head itself is the god's symbol (Zeus's thunderbolt, Poseidon's trident, Thor's
// hammer…), sitting on the handle like any peel head. Each head is a few chunky parts, each filled with the
// god's material and outlined in ink:
// - Greek: veined marble with a gold inner band, gold parts, and marble tinted towards the god's colour.
// - Norse: oak with grain and an iron inner band, iron parts, and runes glowing in the god's colour.
// The parts are drawn in the 220×360 peel frame: the head fills roughly x 16–204, y 4–186, and meets the
// handle (which starts at y 172) at x 110, under a gold or iron collar.
// Frigg keeps a round head with her spindle carved in it (src/art/godHeads.ts): a spindle is too thin to be
// a head on its own.

import { INK } from './feetCommon';
import type { GodArt } from './godHeads';
import { noteGem, noteRune, want } from './godParts';
import { type Ctx, ellipse, hashStr, mix, rgba, rng, roundRect, shade } from './util';

type P = [number, number];
type Mat = 'marble' | 'tint' | 'gold' | 'dark' | 'wood' | 'iron' | 'bone';
/** A part: its material, its outline, and (for a part that moves on a living peel) its key (src/art/godParts.ts). */
type Part = [Mat, () => void, string?];

const X = 110;

function ink(ctx: Ctx, lw = 4.5, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function lit(ctx: Ctx, x: number, y: number, r: number, base: string, k = 0.35): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r * 1.05);
  g.addColorStop(0, shade(base, k));
  g.addColorStop(0.65, base);
  g.addColorStop(1, shade(base, -0.32));
  return g;
}

function goldG(ctx: Ctx, base = '#e8b43a'): CanvasGradient {
  const g = ctx.createLinearGradient(20, 0, 200, 190);
  g.addColorStop(0, shade(base, 0.6));
  g.addColorStop(0.35, shade(base, 0.15));
  g.addColorStop(0.55, base);
  g.addColorStop(0.8, shade(base, -0.3));
  g.addColorStop(1, shade(base, 0.05));
  return g;
}

function ironG(ctx: Ctx, base = '#6a7078'): CanvasGradient {
  const g = ctx.createLinearGradient(20, 0, 200, 190);
  g.addColorStop(0, shade(base, 0.55));
  g.addColorStop(0.4, base);
  g.addColorStop(0.6, shade(base, 0.2));
  g.addColorStop(1, shade(base, -0.45));
  return g;
}

function poly(ctx: Ctx, pts: P[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/** Mirror a right-half outline (x offsets from the centre) into a whole closed outline. */
function sym(ctx: Ctx, half: P[]): void {
  const pts: P[] = [...half.map(([x, y]) => [X + x, y] as P), ...[...half].reverse().map(([x, y]) => [X - x, y] as P)];
  poly(ctx, pts);
}

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function bez(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** A tapering band along a cubic curve (horns, ears of wheat, feathers, harp frames). */
function taper(ctx: Ctx, c: [P, P, P, P], w0: number, w1: number, round = true, n = 28): void {
  const L: P[] = [];
  const Rr: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = bez(...c, t);
    const [x2, y2] = bez(...c, Math.min(1, t + 0.01));
    const [x1, y1] = bez(...c, Math.max(0, t - 0.01));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const d = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * t) / 2;
    L.push([x - (dy / d) * w, y + (dx / d) * w]);
    Rr.push([x + (dy / d) * w, y - (dx / d) * w]);
  }
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (round) {
    const [ex, ey] = c[3];
    ctx.arc(ex, ey, w1 / 2, Math.atan2(L[n][1] - ey, L[n][0] - ex), Math.atan2(Rr[n][1] - ey, Rr[n][0] - ex), false);
  }
  [...Rr].reverse().forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
}

function star(ctx: Ctx, x: number, y: number, r: number, points: number, inner: number, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = rot + (i * Math.PI) / points;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.45, rot = -0.6): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

// ——— runes (shared with the round Norse heads) ———
/** Simple Elder Futhark-style runes as strokes in a 10×16 box. */
export const RUNES: P[][][] = [
  [[[2, 0], [2, 16]], [[2, 3], [8, 0]], [[2, 7], [8, 4]]],
  [[[2, 16], [2, 0], [8, 5], [8, 16]]],
  [[[2, 0], [2, 16]], [[2, 4], [8, 8], [2, 12]]],
  [[[2, 0], [2, 16]], [[2, 0], [8, 4]], [[2, 5], [8, 9]]],
  [[[2, 16], [2, 0], [8, 4], [2, 8], [8, 16]]],
  [[[8, 0], [2, 8], [8, 16]]],
  [[[1, 0], [9, 16]], [[9, 0], [1, 16]]],
  [[[5, 0], [5, 16]], [[1, 4], [5, 8], [9, 4]]],
  [[[5, 0], [5, 16]], [[1, 4], [5, 0], [9, 4]]],
  [[[2, 0], [2, 16]], [[8, 0], [8, 16]], [[2, 6], [8, 10]]],
  [[[2, 0], [2, 16], [8, 12], [2, 8], [8, 4], [2, 0]]],
  [[[2, 16], [2, 0], [5, 6], [8, 0], [8, 16]]],
];

export function runeAt(ctx: Ctx, idx: number, x: number, y: number, ang: number, s = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  ctx.translate(-5, -8);
  ctx.beginPath();
  for (const stroke of RUNES[idx % RUNES.length]) stroke.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.restore();
}

/** A rune cut into the wood, glowing in the god's colour. */
function glowRune(ctx: Ctx, idx: number, x: number, y: number, col: string, s = 1.1, ang = 0): void {
  noteRune({ idx, x, y, ang, s, col });
  runeAt(ctx, idx, x, y, ang, s);
  ctx.strokeStyle = 'rgba(20,10,4,0.85)';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = col;
  ctx.shadowBlur = 10;
  runeAt(ctx, idx, x, y, ang, s);
  ctx.strokeStyle = shade(col, 0.4);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.stroke();
  ctx.restore();
}

function gem(ctx: Ctx, x: number, y: number, r: number, col: string): void {
  noteGem({ x, y, r, col });
  circle(ctx, x, y, r);
  ctx.fillStyle = lit(ctx, x, y, r, col, 0.55);
  ctx.fill();
  ink(ctx, 2.4);
  shine(ctx, x - r * 0.35, y - r * 0.35, r * 0.35, r * 0.2, 0.8);
}

function glowDot(ctx: Ctx, x: number, y: number, r: number, col: string): void {
  ctx.save();
  ctx.shadowColor = col;
  ctx.shadowBlur = 12;
  circle(ctx, x, y, r);
  ctx.fillStyle = shade(col, 0.35);
  ctx.fill();
  ctx.restore();
}

// ——— materials ———
function fill(ctx: Ctx, path: () => void, mat: Mat, a: GodArt, r: () => number): void {
  const greek = a.pantheon === 'greek';
  const marble = a.base ?? '#efe9dc';
  const wood = a.base ?? '#9a6a3e';
  const iron = a.rim ?? '#5c6068';
  path();
  if (mat === 'marble' || mat === 'tint' || mat === 'dark') {
    const base = mat === 'marble' ? marble : mat === 'tint' ? mix(marble, a.color, 0.42) : mix('#3a3448', a.color, 0.25);
    ctx.fillStyle = lit(ctx, 90, 70, 150, base, 0.22);
  } else if (mat === 'gold') ctx.fillStyle = goldG(ctx);
  else if (mat === 'wood') ctx.fillStyle = lit(ctx, 90, 70, 150, wood, 0.3);
  else if (mat === 'iron') ctx.fillStyle = ironG(ctx, iron);
  else ctx.fillStyle = lit(ctx, 90, 70, 150, '#ece2c8', 0.25);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  if (mat === 'marble' || mat === 'tint' || mat === 'dark') {
    // veins
    for (let i = 0; i < 4; i++) {
      let x = 20 + r() * 180;
      let y = 0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        x += (r() - 0.45) * 44;
        y += 26;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(mat === 'dark' ? '#c8c0e0' : '#6a645a', 0.22);
      ctx.lineWidth = 4 + r() * 3;
      ctx.stroke();
      ctx.strokeStyle = rgba(mat === 'dark' ? '#e8e0ff' : '#4a463e', 0.32);
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    // the gold inner band
    path();
    ctx.strokeStyle = goldG(ctx);
    ctx.lineWidth = 11;
    ctx.stroke();
  } else if (mat === 'wood') {
    for (let i = 0; i < 18; i++) {
      const y0 = i * 11 + r() * 5;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (let x = 0; x <= 220; x += 14) ctx.lineTo(x, y0 + Math.sin(x * 0.05 + i) * 4);
      ctx.strokeStyle = rgba(shade(wood, -0.55), 0.28 + r() * 0.2);
      ctx.lineWidth = 1.5 + r() * 1.8;
      ctx.stroke();
    }
    // the iron inner band
    path();
    ctx.strokeStyle = ironG(ctx, iron);
    ctx.lineWidth = 10;
    ctx.stroke();
  } else if (mat === 'gold' || mat === 'iron') {
    // a bright bevel inside the top-left edge
    ctx.translate(-2.5, -2.5);
    path();
    ctx.strokeStyle = rgba('#ffffff', 0.5);
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();
  path();
  ink(ctx, greek ? 4.5 : 4.8);
}


// ——— the shapes ———
interface Shape {
  parts: Part[];
  /** Drawn after the parts: gems, eyes, strings, carvings. */
  detail?: (ctx: Ctx, a: GodArt) => void;
  /** Norse: runes glowing at these points (Greek: gems). */
  marks?: P[];
  /** Where the top-left sheen goes. */
  sheen?: [number, number, number, number];
  /** Heads that are more than parts (Zeus's sword): drawn whole, instead of the parts, collar and glow. */
  draw?: (ctx: Ctx, a: GodArt) => void;
  /** The key the detail is painted under, or 'own' when the detail asks for its pieces' keys itself. */
  detailKey?: string;
  /** The key the runes are painted under (Skadi's turn with her snowflake), or each rune's (Freya's ride her wings). */
  marksKey?: string | string[];
  /** The key the collar is painted under, when a moving part sits under it (Dionysus's grapes). */
  collarKey?: string;
}

const S: Record<string, Shape> = {};

// ——— GREEK ———
// Zeus: a sword forged from a thunderbolt. The blade's spine zig-zags like a bolt, the crossguard is gold and
// marble with an eagle's wings, and a storm gem sits in the pommel. Its live lightning is in animatedLooks.ts.
/** The blade's spine, hilt to tip, as [x, y, width] in the peel frame (the live arcs crawl along it too). */
export const ZEUS_BLADE: [number, number, number][] = [
  [110, 176, 66], [110, 156, 66], [121, 132, 60], [99, 106, 54], [119, 80, 46], [102, 54, 36], [114, 30, 24], [110, 3, 0],
];
/** The pommel gem's centre. */
export const ZEUS_POMMEL: P = [110, 336];
// the edges follow the spine, and each zig juts out into a sharp bolt-step on its outer side
const bladeEdge = (side: number): P[] =>
  ZEUS_BLADE.map(([x, y, w], i) => {
    const prev = ZEUS_BLADE[i - 1]?.[0] ?? x;
    const next = ZEUS_BLADE[i + 1]?.[0] ?? x;
    const bend = x - (prev + next) / 2;
    const jut = Math.sign(bend) === side && i > 1 && w > 0 ? 7 : 0;
    return [x + side * (w / 2 + jut), y + (jut ? 3 : 0)] as P;
  });
const bladeL = (): P[] => bladeEdge(-1);
function bladePath(ctx: Ctx): void {
  poly(ctx, [...bladeL(), ...bladeEdge(1).reverse().slice(1)]);
}

/** A feather: a band along a cubic that narrows to a round tip (the cap always bulges forwards). */
function feather(ctx: Ctx, c: [P, P, P, P], w0: number, w1: number, n = 20): void {
  const L: P[] = [];
  const Rr: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = bez(...c, t);
    const [x2, y2] = bez(...c, Math.min(1, t + 0.01));
    const [x1, y1] = bez(...c, Math.max(0, t - 0.01));
    const d = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / d;
    const ny = (x2 - x1) / d;
    // a little belly in the middle of the vane
    const w = ((w0 + (w1 - w0) * t) / 2) * (1 + 0.25 * Math.sin(t * Math.PI));
    L.push([x + nx * w, y + ny * w]);
    Rr.push([x - nx * w, y - ny * w]);
  }
  const [ex, ey] = c[3];
  const a0 = Math.atan2(L[n][1] - ey, L[n][0] - ex);
  const a1 = Math.atan2(Rr[n][1] - ey, Rr[n][0] - ex);
  const [px, py] = bez(...c, 0.99);
  const fwd = Math.atan2(ey - py, ex - px);
  // sweep the way that passes through the forward direction
  const cwMid = a0 + (((a1 - a0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / 2;
  const ccw = Math.cos(cwMid - fwd) < 0;
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.arc(ex, ey, w1 / 2, a0, a1, ccw);
  [...Rr].reverse().forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
}

/** One eagle wing of the crossguard (side 1 right, -1 left): a fan of chunky gold feathers swept up and out. */
function eagleWing(ctx: Ctx, side: number): void {
  const fx = (x: number) => X + side * x;
  // back to front: the long top primary down to the short low one; [tip x, tip y, bend, width]
  const feathers: [number, number, number, number][] = [
    [90, 126, -14, 22],
    [96, 150, -8, 21],
    [92, 172, -2, 20],
    [78, 192, 4, 19],
  ];
  for (const [tx, ty, bend, w] of feathers) {
    const c: [P, P, P, P] = [[fx(36), 184], [fx(52), 182 + bend], [fx(tx - 22), ty + 8], [fx(tx), ty]];
    feather(ctx, c, w, w * 0.62);
    const g = ctx.createLinearGradient(fx(36), 184, fx(tx), ty);
    g.addColorStop(0, '#c8861e');
    g.addColorStop(0.45, '#f4c24a');
    g.addColorStop(1, '#ffd862');
    ctx.fillStyle = g;
    ctx.fill();
    // the quill
    ctx.beginPath();
    ctx.moveTo(fx(44), 183 + bend * 0.2);
    ctx.bezierCurveTo(fx(56), 181 + bend, fx(tx - 22), ty + 7, fx(tx - 5), ty + 1);
    ctx.strokeStyle = rgba('#8a5410', 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
    feather(ctx, c, w, w * 0.62);
    ink(ctx, 3.8);
  }
  // a plump covert over the roots, with a bright edge
  ellipse(ctx, fx(50), 180, 22, 14, side * -0.35);
  ctx.fillStyle = lit(ctx, fx(46), 176, 22, '#f4c24a', 0.45);
  ctx.fill();
  ink(ctx, 3.8);
  ellipse(ctx, fx(46), 173, 10, 3.5, side * -0.35);
  ctx.fillStyle = rgba('#ffffff', 0.6);
  ctx.fill();
}

function drawZeusSword(ctx: Ctx, a: GodArt): void {
  const elec = '#7fd0ff';
  // Zeus's gold handle: a spiral of gold wire over it, and a gold pommel with a storm gem
  ctx.save();
  roundRect(ctx, X - 14, 172, 28, 170, 12);
  ctx.clip();
  for (let y = 206; y < 340; y += 13) {
    ctx.beginPath();
    ctx.moveTo(X - 16, y);
    ctx.lineTo(X + 16, y + 8);
    ctx.strokeStyle = rgba(INK, 0.55);
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = '#ffe9a0';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  ctx.restore();
  const [px, py] = ZEUS_POMMEL;
  star(ctx, px, py, 20, 8, 0.84, -Math.PI / 2);
  ctx.fillStyle = goldG(ctx);
  ctx.fill();
  ink(ctx, 3.8);
  ctx.save();
  ctx.shadowColor = elec;
  ctx.shadowBlur = 16;
  gem(ctx, px, py, 10.5, a.color);
  ctx.restore();

  // the divine glow behind the blade
  ctx.save();
  ctx.shadowColor = rgba('#bfe6ff', 0.95);
  ctx.shadowBlur = 26;
  bladePath(ctx);
  ctx.fillStyle = '#e8f6ff';
  ctx.fill();
  ctx.restore();
  // the blade: white-hot down the middle, electric blue to the edges, brighter towards the tip
  bladePath(ctx);
  const g = ctx.createLinearGradient(80, 0, 140, 0);
  g.addColorStop(0, '#3f8fe0');
  g.addColorStop(0.3, '#a8e0ff');
  g.addColorStop(0.5, '#ffffff');
  g.addColorStop(0.7, '#a8e0ff');
  g.addColorStop(1, '#3f8fe0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  bladePath(ctx);
  ctx.clip();
  const v = ctx.createLinearGradient(0, 0, 0, 172);
  v.addColorStop(0, rgba('#ffffff', 0.55));
  v.addColorStop(0.5, rgba('#ffffff', 0));
  v.addColorStop(1, rgba('#1a4a9a', 0.25));
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 220, 180);
  // the light catches the left facet of every zig
  ctx.beginPath();
  bladeL().forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  [...ZEUS_BLADE].reverse().forEach(([x, y]) => ctx.lineTo(x - 2, y));
  ctx.closePath();
  ctx.fillStyle = rgba('#ffffff', 0.32);
  ctx.fill();
  // gold edges, like the marble heads' inner band
  bladePath(ctx);
  ctx.strokeStyle = goldG(ctx);
  ctx.lineWidth = 11;
  ctx.stroke();
  bladePath(ctx);
  ctx.strokeStyle = rgba('#fff6c8', 0.6);
  ctx.lineWidth = 2;
  ctx.translate(-2, -2);
  ctx.stroke();
  ctx.restore();
  // the dark core line down the spine, with a hot glow either side
  const spine = (lw: number, col: string) => {
    ctx.beginPath();
    ZEUS_BLADE.slice(0, -1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'miter';
    ctx.stroke();
    ctx.lineJoin = 'round';
  };
  spine(9, rgba('#ffffff', 0.85));
  spine(3.4, '#1d3c7a');
  bladePath(ctx);
  ink(ctx, 4.5);

  // the crossguard: eagle wings either side of a gold-and-marble block
  eagleWing(ctx, -1);
  eagleWing(ctx, 1);
  const guard = () => {
    ctx.beginPath();
    ctx.moveTo(X - 46, 168);
    ctx.quadraticCurveTo(X, 160, X + 46, 168);
    ctx.quadraticCurveTo(X + 50, 186, X + 32, 202);
    ctx.lineTo(X - 32, 202);
    ctx.quadraticCurveTo(X - 50, 186, X - 46, 168);
    ctx.closePath();
  };
  guard();
  ctx.fillStyle = lit(ctx, 96, 176, 60, '#efe9dc', 0.2);
  ctx.fill();
  ctx.save();
  guard();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(X - 46, 180);
  ctx.lineTo(X - 20, 186);
  ctx.lineTo(X - 4, 178);
  ctx.strokeStyle = rgba('#4a463e', 0.3);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  guard();
  ctx.strokeStyle = goldG(ctx);
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.restore();
  guard();
  ink(ctx, 4.5);
  // the storm gem set in the guard
  ctx.save();
  ctx.shadowColor = elec;
  ctx.shadowBlur = 14;
  gem(ctx, X, 184, 10.5, a.color);
  ctx.restore();
  shine(ctx, 100, 34, 5, 16, 0.55, 0.45);
}
S.bolt = { parts: [], draw: drawZeusSword };

S.peacock = {
  parts: [
    ...[-3, -2, -1, 0, 1, 2, 3].map((i): Part => ['tint', () => {
      const ang = -Math.PI / 2 + i * 0.27;
      taper(ctx0(), [[X, 176], [X + Math.cos(ang) * 50, 176 + Math.sin(ang) * 50], [X + Math.cos(ang) * 100, 176 + Math.sin(ang) * 100], [X + Math.cos(ang) * 146, 176 + Math.sin(ang) * 146]], 10, 42);
    }, `f${i + 3}`]),
    ['gold', () => poly(ctx0(), [[78, 186], [72, 150], [92, 162], [110, 140], [128, 162], [148, 150], [142, 186]])],
  ],
  detailKey: 'own',
  detail: (ctx, a) => {
    for (let i = -3; i <= 3; i++) {
      if (!want(`f${i + 3}`)) continue;
      const ang = -Math.PI / 2 + i * 0.27;
      const x = X + Math.cos(ang) * 134;
      const y = 176 + Math.sin(ang) * 134;
      ellipse(ctx, x, y, 12, 15, ang + Math.PI / 2);
      ctx.fillStyle = lit(ctx, x, y, 14, '#2a8a7a', 0.4);
      ctx.fill();
      ink(ctx, 2.2);
      gem(ctx, x, y + 1, 6, a.color);
    }
    if (want()) gem(ctx, X, 166, 6, '#e0402a');
  },
};

S.trident = {
  parts: [['gold', () => sym(ctx0(), [[0, 2], [17, 36], [8, 39], [8, 76], [40, 72], [43, 28], [52, 4], [66, 24], [68, 86], [42, 106], [12, 114], [12, 188]])]],
  sheen: [80, 40, 6, 22],
  detail: (ctx, a) => {
    gem(ctx, X, 96, 9, a.color);
    // wave curls along the crossbar
    ctx.strokeStyle = rgba(INK, 0.55);
    ctx.lineWidth = 2.6;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(X + s * 34, 92, 8, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 2.2 : -Math.PI * 1.2, s < 0);
      ctx.stroke();
    }
  },
};

const ear = (ang: number) => {
  const ex = X + Math.cos(ang) * 140;
  const ey = 184 + Math.sin(ang) * 140;
  return [[X, 184], [X + Math.cos(ang) * 50, 184 + Math.sin(ang) * 50], [X + Math.cos(ang) * 100, 184 + Math.sin(ang) * 100], [ex, ey]] as [P, P, P, P];
};
S.wheat = {
  parts: [
    ...[-0.42, 0, 0.42].map((d, i): Part => ['gold', () => taper(ctx0(), ear(-Math.PI / 2 + d), 12, 40), `e${i}`]),
    ['marble', () => roundRect(ctx0(), 82, 140, 56, 22, 8)],
  ],
  detailKey: 'own',
  detail: (ctx, a) => {
    for (const [e, d] of [-0.42, 0, 0.42].entries()) {
      if (!want(`e${e}`)) continue;
      const c = ear(-Math.PI / 2 + d);
      for (let i = 0; i < 6; i++) {
        const [x, y] = bez(...c, 0.5 + i * 0.085);
        for (const s of [-1, 1]) {
          ellipse(ctx, x + s * 8 * Math.cos(d), y + s * 8 * Math.sin(d), 6.5, 9.5, d + s * 0.5);
          ctx.fillStyle = lit(ctx, x, y, 10, '#f2c84a', 0.45);
          ctx.fill();
          ink(ctx, 1.8);
        }
      }
    }
    if (want()) gem(ctx, X, 151, 6, a.color);
  },
};

S.owl = {
  parts: [
    ['marble', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(48, 20);
      c.lineTo(80, 46);
      c.quadraticCurveTo(110, 36, 140, 46);
      c.lineTo(172, 20);
      c.bezierCurveTo(196, 70, 194, 140, 140, 176);
      c.lineTo(130, 188);
      c.lineTo(90, 188);
      c.lineTo(80, 176);
      c.bezierCurveTo(26, 140, 24, 70, 48, 20);
      c.closePath();
    }],
  ],
  sheen: [70, 70, 14, 26],
  detailKey: 'own',
  detail: (ctx, a) => {
    if (!want()) {
      // (the pupils alone: on a living peel they look about)
      if (want('pupils'))
        for (const s of [-1, 1]) {
          circle(ctx, X + s * 26, 83, 5);
          ctx.fillStyle = INK;
          ctx.fill();
        }
      return;
    }
    // folded wings
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X + s * 62, 96);
      ctx.quadraticCurveTo(X + s * 70, 150, X + s * 30, 176);
      ctx.strokeStyle = rgba(INK, 0.5);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 4 - (row % 2); i++) {
        ctx.beginPath();
        ctx.arc(86 + i * 16 + (row % 2) * 8, 132 + row * 13, 7, 0, Math.PI);
        ctx.strokeStyle = rgba(INK, 0.45);
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
    for (const s of [-1, 1]) {
      circle(ctx, X + s * 26, 82, 22);
      ctx.fillStyle = goldG(ctx);
      ctx.fill();
      ink(ctx, 3.5);
      gem(ctx, X + s * 26, 83, 12, a.color);
      if (!want('pupils')) continue;
      circle(ctx, X + s * 26, 83, 5);
      ctx.fillStyle = INK;
      ctx.fill();
    }
    poly(ctx, [[100, 100], [120, 100], [110, 120]]);
    ctx.fillStyle = goldG(ctx);
    ctx.fill();
    ink(ctx, 2.6);
  },
};

/** The lyre's strings (x from the middle; they run from y 46 to 138). */
export const LYRE_STRINGS = [-21, -7, 7, 21];
S.lyre = {
  parts: [['gold', () => {
    const c = ctx0();
    c.beginPath();
    c.moveTo(72, 188);
    c.bezierCurveTo(14, 150, 14, 60, 44, 8);
    c.lineTo(64, 14);
    c.lineTo(64, 32);
    c.lineTo(156, 32);
    c.lineTo(156, 14);
    c.lineTo(176, 8);
    c.bezierCurveTo(206, 60, 206, 150, 148, 188);
    c.closePath();
    c.moveTo(82, 46);
    c.bezierCurveTo(68, 80, 68, 118, 84, 138);
    c.lineTo(136, 138);
    c.bezierCurveTo(152, 118, 152, 80, 138, 46);
    c.closePath();
  }]],
  detailKey: 'own',
  detail: (ctx, a) => {
    // strings across the open middle (plucked on a living peel: src/art/peelGod.ts)
    if (want('strings')) {
      ctx.strokeStyle = '#fff6d8';
      ctx.lineWidth = 2.4;
      for (const dx of LYRE_STRINGS) {
        ctx.beginPath();
        ctx.moveTo(X + dx, 46);
        ctx.lineTo(X + dx, 138);
        ctx.stroke();
      }
    }
    if (!want()) return;
    // a marble sound box with the sun on it
    const box = () => roundRect(ctx, 76, 138, 68, 40, 14);
    box();
    ctx.fillStyle = lit(ctx, 100, 150, 50, '#efe9dc', 0.2);
    ctx.fill();
    ink(ctx, 3.5);
    ctx.save();
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 10;
    star(ctx, X, 158, 15, 10, 0.6);
    ctx.fillStyle = a.color;
    ctx.fill();
    ctx.restore();
    star(ctx, X, 158, 15, 10, 0.6);
    ink(ctx, 2);
  },
};
// the lyre's middle is open: fill with even-odd
const evenOdd = new Set(['lyre']);

S.bow = {
  parts: [['marble', () => {
    const c = ctx0();
    c.beginPath();
    c.moveTo(16, 66);
    c.bezierCurveTo(14, 214, 206, 214, 204, 66);
    c.quadraticCurveTo(110, 150, 16, 66);
    c.closePath();
  }]],
  sheen: [44, 120, 10, 22],
  detailKey: 'own',
  detail: (ctx, a) => {
    // the bowstring, drawn back to the nock (drawn and loosed on a living peel: src/art/peelGod.ts)
    if (want('string')) {
      ctx.beginPath();
      ctx.moveTo(18, 68);
      ctx.lineTo(X, 124);
      ctx.lineTo(202, 68);
      ctx.strokeStyle = '#fff6d8';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (!want('arrow')) return;
    // the silver arrow, nocked and pointing up
    roundRect(ctx, X - 4, 18, 8, 112, 3);
    ctx.fillStyle = goldG(ctx);
    ctx.fill();
    ink(ctx, 2.8);
    poly(ctx, [[X - 16, 34], [X, 2], [X + 16, 34], [X, 26]]);
    ctx.fillStyle = lit(ctx, X, 20, 18, '#e8eef4', 0.4);
    ctx.fill();
    ink(ctx, 3);
    for (const s of [-1, 1]) {
      poly(ctx, [[X, 104], [X + s * 14, 118], [X + s * 14, 132], [X, 122]]);
      ctx.fillStyle = a.color;
      ctx.fill();
      ink(ctx, 2.2);
    }
  },
};

S.helmet = {
  parts: [
    ['tint', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(42, 44);
      c.bezierCurveTo(40, -8, 180, -8, 178, 44);
      c.quadraticCurveTo(150, 22, 110, 24);
      c.quadraticCurveTo(70, 22, 42, 44);
      c.closePath();
    }],
    ['marble', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(44, 186);
      c.bezierCurveTo(20, 120, 26, 40, 110, 34);
      c.bezierCurveTo(194, 40, 200, 120, 176, 186);
      c.lineTo(132, 186);
      c.lineTo(126, 120);
      c.lineTo(94, 120);
      c.lineTo(88, 186);
      c.closePath();
    }],
  ],
  sheen: [70, 60, 22, 9],
  detail: (ctx, a) => {
    // the T-shaped face opening, dark inside, with glowing eyes
    poly(ctx, [[58, 96], [162, 96], [158, 120], [126, 120], [126, 186], [94, 186], [94, 120], [62, 120]]);
    ctx.fillStyle = '#1a1014';
    ctx.fill();
    ink(ctx, 4);
    for (const s of [-1, 1]) glowDot(ctx, X + s * 30, 108, 5, a.color);
    // a gold brow band
    ctx.beginPath();
    ctx.moveTo(40, 86);
    ctx.quadraticCurveTo(110, 66, 180, 86);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.strokeStyle = goldG(ctx);
    ctx.lineWidth = 6;
    ctx.stroke();
  },
};

S.shell = {
  parts: [['marble', () => {
    const c = ctx0();
    c.beginPath();
    c.moveTo(94, 188);
    c.lineTo(78, 172);
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const ang = Math.PI * (1.12 + (i / n) * 0.76);
      const x = X + Math.cos(ang) * 92;
      const y = 176 + Math.sin(ang) * 170;
      if (i === 0) c.lineTo(x, y);
      else {
        const pa = Math.PI * (1.12 + ((i - 0.5) / n) * 0.76);
        c.quadraticCurveTo(X + Math.cos(pa) * 106, 176 + Math.sin(pa) * 190, x, y);
      }
    }
    c.lineTo(142, 172);
    c.lineTo(126, 188);
    c.closePath();
  }]],
  sheen: [70, 50, 16, 8],
  detailKey: 'own',
  detail: (ctx, a) => {
    ctx.strokeStyle = rgba(INK, 0.5);
    ctx.lineWidth = 3;
    for (let i = 1; i < 9 && want(); i++) {
      const ang = Math.PI * (1.12 + (i / 9) * 0.76);
      ctx.beginPath();
      ctx.moveTo(X, 174);
      ctx.lineTo(X + Math.cos(ang) * 86, 176 + Math.sin(ang) * 160);
      ctx.stroke();
    }
    // a heart-shaped pearl at the hinge (it beats on a living peel)
    if (!want('heart')) return;
    ctx.beginPath();
    ctx.moveTo(X, 176);
    ctx.bezierCurveTo(X - 26, 158, X - 12, 136, X, 150);
    ctx.bezierCurveTo(X + 12, 136, X + 26, 158, X, 176);
    ctx.fillStyle = lit(ctx, X, 156, 20, a.color, 0.5);
    ctx.fill();
    ink(ctx, 3);
  },
};

S.anvil = {
  parts: [['iron', () => poly(ctx0(), [[14, 54], [40, 40], [72, 38], [196, 38], [206, 46], [198, 76], [150, 78], [136, 106], [138, 128], [168, 176], [168, 188], [52, 188], [52, 176], [82, 128], [84, 106], [70, 80], [42, 74]])]],
  detailKey: 'own',
  detail: (ctx, a) => {
    // the hot face, and a gold hammer resting on it (raised and struck on a living peel: src/art/peelGod.ts)
    if (want()) {
      roundRect(ctx, 76, 36, 112, 7, 3);
      ctx.fillStyle = a.color;
      ctx.fill();
    }
    if (want('hammer')) {
      ctx.save();
      ctx.translate(150, 18);
      ctx.rotate(-0.35);
      roundRect(ctx, -30, -12, 44, 22, 5);
      ctx.fillStyle = goldG(ctx);
      ctx.fill();
      ink(ctx, 3.4);
      roundRect(ctx, -60, -4, 34, 8, 3);
      ctx.fillStyle = lit(ctx, -40, 0, 20, '#efe9dc', 0.2);
      ctx.fill();
      ink(ctx, 3);
      ctx.restore();
    }
    if (!want()) return;
    // a marble plaque with a flame on the waist
    roundRect(ctx, 88, 120, 44, 36, 8);
    ctx.fillStyle = lit(ctx, 100, 130, 30, '#efe9dc', 0.2);
    ctx.fill();
    ink(ctx, 3);
    ctx.save();
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(100, 150);
    ctx.quadraticCurveTo(96, 134, X, 124);
    ctx.quadraticCurveTo(124, 134, 120, 150);
    ctx.closePath();
    ctx.fillStyle = a.color;
    ctx.fill();
    ctx.restore();
  },
};

const wing = (s: number, cx: number, cy: number, w: number, h: number) => () => {
  const c = ctx0();
  c.beginPath();
  c.moveTo(cx, cy + h * 0.3);
  c.bezierCurveTo(cx + s * w * 0.3, cy - h * 0.5, cx + s * w * 0.8, cy - h * 0.7, cx + s * w, cy - h * 0.6);
  c.lineTo(cx + s * w * 0.86, cy - h * 0.28);
  c.lineTo(cx + s * w * 0.98, cy - h * 0.18);
  c.lineTo(cx + s * w * 0.76, cy + h * 0.04);
  c.lineTo(cx + s * w * 0.84, cy + h * 0.16);
  c.lineTo(cx + s * w * 0.56, cy + h * 0.32);
  c.lineTo(cx + s * w * 0.58, cy + h * 0.46);
  c.quadraticCurveTo(cx + s * w * 0.2, cy + h * 0.6, cx, cy + h * 0.3);
  c.closePath();
};

S.caduceus = {
  // Hermes: a winged traveller's helmet
  parts: [
    ['gold', wing(-1, 66, 70, 58, 90), 'wL'],
    ['gold', wing(1, 154, 70, 58, 90), 'wR'],
    ['marble', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(52, 140);
      c.bezierCurveTo(46, 50, 174, 50, 168, 140);
      c.closePath();
    }],
    ['tint', () => {
      const c = ctx0();
      ellipse(c, X, 146, 92, 22);
    }],
    ['marble', () => roundRect(ctx0(), 88, 164, 44, 26, 8)],
  ],
  sheen: [80, 84, 16, 8],
  detail: (ctx, a) => {
    // the herald's staff, carved on the crown
    ctx.beginPath();
    ctx.moveTo(X, 76);
    ctx.lineTo(X, 130);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = goldG(ctx);
    ctx.lineWidth = 4;
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.05) ctx.lineTo(X + s * Math.sin(t * Math.PI * 2.5) * 10, 84 + t * 42);
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    gem(ctx, X, 74, 6, a.color);
  },
};

/** Dionysus's grapes (x from the middle, y; radius 19). */
export const GRAPES: P[] = [[-48, 64], [-16, 60], [16, 60], [48, 64], [-34, 92], [0, 90], [34, 92], [-50, 120], [-18, 120], [18, 120], [50, 120], [-32, 148], [0, 150], [32, 148], [-14, 172], [14, 172]];
S.grapes = {
  parts: [
    ['gold', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(X, 38);
      c.bezierCurveTo(70, -6, 20, 20, 30, 50);
      c.quadraticCurveTo(64, 36, X, 46);
      c.bezierCurveTo(150, 30, 196, 26, 190, 56);
      c.bezierCurveTo(180, 10, 140, 4, X, 38);
      c.closePath();
    }],
    ...GRAPES.map(([dx, y]): Part => ['tint', () => circle(ctx0(), X + dx, y, 19), 'bunch']),
  ],
  detailKey: 'bunch',
  collarKey: 'collar',
  detail: (ctx) => {
    for (const [dx, y] of GRAPES) shine(ctx, X + dx - 6, y - 7, 5, 3, 0.6);
  },
};

S.hearth = {
  parts: [
    ['gold', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(48, 140);
      c.bezierCurveTo(10, 90, 60, 60, 54, 10);
      c.bezierCurveTo(90, 40, 84, 70, 98, 76);
      c.bezierCurveTo(96, 40, 110, 20, 132, 2);
      c.bezierCurveTo(134, 50, 176, 60, 160, 96);
      c.bezierCurveTo(182, 80, 186, 62, 180, 48);
      c.bezierCurveTo(214, 96, 196, 130, 172, 140);
      c.closePath();
    }, 'flame'],
    ['tint', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(74, 140);
      c.bezierCurveTo(60, 110, 92, 96, 96, 66);
      c.bezierCurveTo(116, 90, 112, 104, 124, 110);
      c.bezierCurveTo(130, 92, 140, 86, 146, 80);
      c.bezierCurveTo(160, 110, 160, 130, 148, 140);
      c.closePath();
    }, 'flame'],
    ['marble', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(30, 132);
      c.lineTo(190, 132);
      c.quadraticCurveTo(184, 176, 140, 182);
      c.lineTo(80, 182);
      c.quadraticCurveTo(36, 176, 30, 132);
      c.closePath();
    }],
  ],
  sheen: [66, 150, 16, 6],
  detailKey: 'own',
  detail: (ctx, a) => {
    if (want('flame')) {
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath();
      ctx.moveTo(98, 132);
      ctx.quadraticCurveTo(96, 112, 110, 100);
      ctx.quadraticCurveTo(124, 112, 122, 132);
      ctx.closePath();
      ctx.fill();
    }
    if (want()) gem(ctx, X, 160, 7, a.color);
  },
};

S.bident = {
  parts: [['dark', () => sym(ctx0(), [[10, 120], [10, 98], [28, 86], [34, 30], [46, 4], [62, 34], [60, 98], [36, 122], [12, 130], [12, 188]])]],
  sheen: [70, 40, 5, 20],
  detail: (ctx, a) => {
    // a little skull where the prongs meet, its eyes glowing
    ctx.beginPath();
    ctx.arc(X, 116, 20, Math.PI, 0);
    ctx.lineTo(X + 13, 140);
    ctx.lineTo(X - 13, 140);
    ctx.closePath();
    ctx.fillStyle = lit(ctx, X, 116, 22, '#efe6d0', 0.25);
    ctx.fill();
    ink(ctx, 3.5);
    for (const s of [-1, 1]) glowDot(ctx, X + s * 8, 118, 5, a.color);
  },
};

/** The seeds in Persephone's cut pomegranate (radius 5). */
export const POM_SEEDS: P[] = Array.from({ length: 9 }, (_, i) => [128 + Math.cos(i * 1.3) * 16, 126 + Math.sin(i * 2.1) * 11] as P);
S.pomegranate = {
  parts: [
    ['tint', () => circle(ctx0(), X, 110, 74)],
    ['gold', () => poly(ctx0(), [[86, 48], [78, 14], [96, 30], [110, 6], [124, 30], [142, 14], [134, 48]])],
  ],
  sheen: [72, 76, 20, 10],
  detailKey: 'own',
  detail: (ctx, a) => {
    // a cut window of seeds
    if (want()) {
      ellipse(ctx, 128, 126, 30, 24, -0.3);
      ctx.fillStyle = '#ffe8d8';
      ctx.fill();
      ink(ctx, 3);
      for (const [x, y] of POM_SEEDS) {
        circle(ctx, x, y, 5);
        ctx.fillStyle = lit(ctx, 128, 126, 8, shade(a.color, -0.1), 0.5);
        ctx.fill();
      }
    }
    // spring leaves at the stalk (they stir on a living peel)
    for (const s of [-1, 1]) {
      if (!want(s < 0 ? 'leafL' : 'leafR')) continue;
      ellipse(ctx, X + s * 40, 40, 20, 8, s * -0.5);
      ctx.fillStyle = lit(ctx, X + s * 40, 40, 20, '#7ac05a', 0.4);
      ctx.fill();
      ink(ctx, 2.6);
    }
    if (!want()) return;
    // the stalk down to the handle
    roundRect(ctx, X - 8, 178, 16, 12, 4);
    ctx.fillStyle = goldG(ctx);
    ctx.fill();
    ink(ctx, 2.6);
  },
};

S.wings = {
  parts: [
    ['gold', wing(-1, 98, 108, 96, 150), 'wL'],
    ['gold', wing(1, 122, 108, 96, 150), 'wR'],
    ['marble', () => circle(ctx0(), X, 140, 30)],
  ],
  detailKey: 'own',
  detail: (ctx, a) => {
    for (const s of [-1, 1])
      for (const k of [0.4, 0.62, 0.84]) {
        if (!want(s < 0 ? 'wL' : 'wR')) continue;
        ctx.beginPath();
        ctx.moveTo(X + s * 14, 140);
        ctx.quadraticCurveTo(X + s * 60 * k, 80, X + s * 92 * k, 50 + k * 90);
        ctx.strokeStyle = rgba(INK, 0.4);
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
    if (!want()) return;
    // a laurel wreath round the disc
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      ellipse(ctx, X + Math.cos(ang) * 22, 140 + Math.sin(ang) * 22, 7, 3.5, ang + Math.PI / 2);
      ctx.fillStyle = goldG(ctx);
      ctx.fill();
      ink(ctx, 1.6);
    }
    gem(ctx, X, 140, 9, a.color);
    roundRect(ctx, X - 8, 168, 16, 22, 4);
    ctx.fillStyle = goldG(ctx);
    ctx.fill();
    ink(ctx, 2.6);
  },
};

S.veil = {
  parts: [
    ['dark', () => star(ctx0(), X, 96, 92, 8, 0.52)],
    ['marble', () => roundRect(ctx0(), 94, 160, 32, 30, 6)],
  ],
  detail: (ctx, a) => {
    // a gold crescent moon, and stars glowing on the night
    ctx.beginPath();
    ctx.arc(X - 2, 98, 40, 0, Math.PI * 2);
    ctx.arc(X + 16, 86, 34, 0, Math.PI * 2, true);
    ctx.fillStyle = goldG(ctx);
    ctx.fill('evenodd');
    ink(ctx, 3);
    for (const [x, y, r] of [[136, 70, 6], [146, 112, 4], [120, 132, 5], [88, 50, 3.5]] as [number, number, number][]) {
      ctx.save();
      ctx.shadowColor = a.color;
      ctx.shadowBlur = 10;
      star(ctx, x, y, r * 1.8, 4, 0.3);
      ctx.fillStyle = '#fff8e0';
      ctx.fill();
      ctx.restore();
    }
  },
};

// ——— NORSE ———
S.eye = {
  // Odin: one of his ravens, Huginn or Muninn
  parts: [['wood', () => {
    const c = ctx0();
    c.beginPath();
    c.moveTo(16, 70);
    c.lineTo(54, 50);
    c.bezierCurveTo(60, 14, 120, 8, 138, 40);
    c.bezierCurveTo(196, 70, 204, 130, 186, 176);
    c.lineTo(160, 160);
    c.lineTo(150, 188);
    c.lineTo(84, 188);
    c.bezierCurveTo(70, 150, 70, 110, 80, 86);
    c.lineTo(54, 80);
    c.closePath();
  }]],
  marks: [[150, 120], [128, 150]],
  detail: (ctx, a) => {
    // the folded wing
    ctx.beginPath();
    ctx.moveTo(100, 80);
    ctx.bezierCurveTo(170, 80, 186, 140, 176, 170);
    ctx.moveTo(110, 100);
    ctx.bezierCurveTo(150, 110, 164, 140, 160, 160);
    ctx.strokeStyle = rgba(INK, 0.55);
    ctx.lineWidth = 3;
    ctx.stroke();
    // the beak in iron, and the knowing eye
    poly(ctx, [[16, 70], [54, 50], [60, 66], [54, 80]]);
    ctx.fillStyle = ironG(ctx);
    ctx.fill();
    ink(ctx, 3);
    circle(ctx, 86, 50, 11);
    ctx.fillStyle = '#141018';
    ctx.fill();
    ink(ctx, 2.4);
    glowDot(ctx, 86, 50, 6, a.color);
  },
};

S.hammer = {
  parts: [
    ['iron', () => poly(ctx0(), [[22, 30], [42, 14], [178, 14], [198, 30], [198, 116], [178, 132], [42, 132], [22, 116]])],
    ['wood', () => roundRect(ctx0(), 96, 130, 28, 60, 8)],
  ],
  marks: [[60, 74], [110, 74], [160, 74]],
  sheen: [60, 30, 30, 8],
  detail: (ctx) => {
    // bevelled faces and a leather wrap at the neck
    ctx.strokeStyle = rgba(INK, 0.45);
    ctx.lineWidth = 3;
    for (const x of [46, 174]) {
      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(96, 144 + i * 11);
      ctx.lineTo(124, 150 + i * 11);
      ctx.strokeStyle = rgba('#3a2010', 0.6);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  },
};

S.serpent = {
  // Loki: a horned trickster's mask
  parts: [
    ['iron', () => taper(ctx0(), [[70, 70], [30, 60], [10, 20], [50, 6]], 30, 8)],
    ['iron', () => taper(ctx0(), [[150, 70], [190, 60], [210, 20], [170, 6]], 30, 8)],
    ['wood', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(40, 64);
      c.bezierCurveTo(60, 30, 160, 30, 180, 64);
      c.bezierCurveTo(186, 120, 160, 160, 130, 176);
      c.lineTo(124, 188);
      c.lineTo(96, 188);
      c.lineTo(90, 176);
      c.bezierCurveTo(60, 160, 34, 120, 40, 64);
      c.closePath();
    }],
  ],
  marks: [[X, 60]],
  detail: (ctx, a) => {
    // slanted eye slits and a sly grin, glowing
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X + s * 14, 98);
      ctx.lineTo(X + s * 52, 84);
      ctx.lineTo(X + s * 46, 104);
      ctx.closePath();
      ctx.fillStyle = '#120c08';
      ctx.fill();
      ink(ctx, 2.6);
      ctx.save();
      ctx.shadowColor = a.color;
      ctx.shadowBlur = 12;
      ellipse(ctx, X + s * 38, 95, 7, 3, s * -0.3);
      ctx.fillStyle = shade(a.color, 0.4);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(78, 136);
    ctx.quadraticCurveTo(X, 158, 146, 128);
    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = shade(a.color, 0.3);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  },
};

S.falcon = {
  parts: [
    ['wood', wing(-1, 96, 96, 92, 120), 'wL'],
    ['wood', wing(1, 124, 96, 92, 120), 'wR'],
    ['wood', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(X, 30);
      c.bezierCurveTo(140, 30, 140, 70, 132, 100);
      c.lineTo(140, 170);
      c.lineTo(124, 160);
      c.lineTo(124, 188);
      c.lineTo(96, 188);
      c.lineTo(96, 160);
      c.lineTo(80, 170);
      c.lineTo(88, 100);
      c.bezierCurveTo(80, 70, 80, 30, X, 30);
      c.closePath();
    }],
  ],
  marks: [[54, 84], [166, 84]],
  marksKey: ['wL', 'wR'],
  detail: (ctx, a) => {
    poly(ctx, [[X - 8, 56], [X + 8, 56], [X, 74]]);
    ctx.fillStyle = ironG(ctx);
    ctx.fill();
    ink(ctx, 2.4);
    for (const s of [-1, 1]) glowDot(ctx, X + s * 11, 48, 4.5, a.color);
    // Brísingamen, the gold necklace
    ctx.beginPath();
    ctx.arc(X, 96, 22, 0.3, Math.PI - 0.3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = goldG(ctx);
    ctx.lineWidth = 4;
    ctx.stroke();
  },
};

S.boar = {
  parts: [['wood', () => {
    const c = ctx0();
    c.beginPath();
    c.moveTo(18, 110);
    c.quadraticCurveTo(14, 60, 70, 52);
    c.lineTo(84, 30);
    c.lineTo(98, 52);
    c.quadraticCurveTo(160, 50, 184, 86);
    c.lineTo(204, 94);
    c.lineTo(194, 118);
    c.lineTo(168, 122);
    c.lineTo(160, 150);
    c.lineTo(132, 150);
    c.lineTo(124, 188);
    c.lineTo(96, 188);
    c.lineTo(88, 150);
    c.lineTo(54, 150);
    c.lineTo(48, 132);
    c.quadraticCurveTo(22, 130, 18, 110);
    c.closePath();
  }]],
  marks: [[90, 104]],
  detail: (ctx, a) => {
    // gold bristles along his back (Gullinbursti)
    for (let i = 0; i < 9; i++) {
      const x = 46 + i * 15;
      const y = 60 - Math.sin((i / 8) * Math.PI) * 8;
      poly(ctx, [[x - 6, y + 6], [x - 2, y - 14], [x + 6, y + 6]]);
      ctx.fillStyle = goldG(ctx);
      ctx.fill();
      ink(ctx, 2);
    }
    // an iron tusk and a glowing eye
    ctx.beginPath();
    ctx.moveTo(184, 108);
    ctx.quadraticCurveTo(200, 100, 196, 80);
    ctx.lineTo(188, 98);
    ctx.closePath();
    ctx.fillStyle = '#f4ead0';
    ctx.fill();
    ink(ctx, 2.4);
    glowDot(ctx, 154, 80, 5, a.color);
  },
};

S.sword = {
  parts: [
    ['iron', () => poly(ctx0(), [[X, 2], [X + 22, 28], [X + 20, 132], [X - 20, 132], [X - 22, 28]])],
    ['wood', () => roundRect(ctx0(), 44, 128, 132, 22, 9)],
    ['wood', () => roundRect(ctx0(), 96, 148, 28, 42, 6)],
  ],
  marks: [[X, 52], [X, 96]],
  detail: (ctx) => {
    // the fuller down the blade
    ctx.beginPath();
    ctx.moveTo(X, 20);
    ctx.lineTo(X, 124);
    ctx.strokeStyle = rgba(INK, 0.35);
    ctx.lineWidth = 3;
    ctx.stroke();
    for (const x of [52, 168]) {
      circle(ctx, x, 139, 7);
      ctx.fillStyle = ironG(ctx);
      ctx.fill();
      ink(ctx, 2.2);
    }
  },
};

S.horn = {
  parts: [
    ['bone', () => taper(ctx0(), [[X, 188], [36, 160], [24, 60], [150, 34]], 20, 76, false)],
    ['iron', () => {
      const c = ctx0();
      c.save();
      c.translate(150, 34);
      c.rotate(-0.25);
      ellipse(c, 0, 0, 14, 40);
      c.restore();
    }],
  ],
  marks: [[54, 106]],
  detail: (ctx, a) => {
    // iron bands round the horn
    for (const t of [0.3, 0.55, 0.78]) {
      const [x, y] = bez([X, 188], [36, 160], [24, 60], [150, 34], t);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 2.2 - 0.6);
      roundRect(ctx, -6, -(10 + t * 30), 12, 20 + t * 60, 4);
      ctx.fillStyle = ironG(ctx);
      ctx.fill();
      ink(ctx, 2.4);
      ctx.restore();
    }
    // the bell glows from inside
    ctx.save();
    ctx.translate(150, 34);
    ctx.rotate(-0.25);
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 16;
    ellipse(ctx, 0, 0, 7, 28);
    ctx.fillStyle = shade(a.color, 0.2);
    ctx.fill();
    ctx.restore();
  },
};

S.sun = {
  parts: [
    ['wood', () => star(ctx0(), X, 96, 92, 12, 0.7), 'rays'],
    ['iron', () => circle(ctx0(), X, 96, 48)],
    ['wood', () => roundRect(ctx0(), 96, 160, 28, 30, 6)],
  ],
  marks: [],
  detail: (ctx, a) => {
    ctx.save();
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 18;
    circle(ctx, X, 96, 30);
    ctx.fillStyle = shade(a.color, 0.1);
    ctx.fill();
    ctx.restore();
    circle(ctx, X, 96, 30);
    ink(ctx, 3);
    glowRune(ctx, 10, X, 96, '#fff6c0', 1.6);
  },
};

S.halfskull = {
  parts: [
    ['wood', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(X, 10);
      c.bezierCurveTo(30, 10, 22, 90, 42, 126);
      c.lineTo(52, 160);
      c.lineTo(82, 170);
      c.lineTo(88, 188);
      c.lineTo(X, 188);
      c.closePath();
    }],
    ['bone', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(X, 10);
      c.bezierCurveTo(190, 10, 198, 90, 178, 126);
      c.lineTo(168, 160);
      c.lineTo(138, 170);
      c.lineTo(132, 188);
      c.lineTo(X, 188);
      c.closePath();
    }],
  ],
  marks: [[70, 50]],
  detail: (ctx, a) => {
    // the bone side: a hollow eye with a cold glow, a nose hole and teeth
    ellipse(ctx, 144, 92, 22, 20);
    ctx.fillStyle = '#16120e';
    ctx.fill();
    ink(ctx, 3);
    glowDot(ctx, 144, 92, 7, a.color);
    poly(ctx, [[X + 4, 112], [X + 18, 132], [X + 4, 134]]);
    ctx.fillStyle = '#16120e';
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      roundRect(ctx, X + 4 + i * 13, 150, 11, 16, 3);
      ctx.fillStyle = '#f4ecd8';
      ctx.fill();
      ink(ctx, 2);
    }
    // the living side: a calm closed eye
    ctx.beginPath();
    ctx.arc(78, 90, 16, 0.2, Math.PI - 0.2);
    ink(ctx, 3.5);
    ctx.beginPath();
    ctx.moveTo(X, 10);
    ctx.lineTo(X, 188);
    ink(ctx, 3);
  },
};

S.ship = {
  parts: [
    ['wood', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(X, 4);
      c.lineTo(X + 6, 4);
      c.lineTo(X + 6, 124);
      c.lineTo(X - 6, 124);
      c.lineTo(X - 6, 4);
      c.closePath();
    }],
    ['bone', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(46, 20);
      c.quadraticCurveTo(X, 10, 174, 20);
      c.quadraticCurveTo(186, 70, 174, 118);
      c.quadraticCurveTo(X, 110, 46, 118);
      c.quadraticCurveTo(34, 70, 46, 20);
      c.closePath();
    }, 'sail'],
    ['wood', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(10, 100);
      c.bezierCurveTo(4, 70, 30, 60, 34, 80);
      c.lineTo(28, 84);
      c.bezierCurveTo(34, 120, 60, 128, X, 128);
      c.bezierCurveTo(160, 128, 186, 120, 192, 84);
      c.lineTo(186, 80);
      c.bezierCurveTo(190, 60, 216, 70, 210, 100);
      c.bezierCurveTo(206, 150, 160, 166, 124, 168);
      c.lineTo(124, 188);
      c.lineTo(96, 188);
      c.lineTo(96, 168);
      c.bezierCurveTo(60, 166, 14, 150, 10, 100);
      c.closePath();
    }],
  ],
  marks: [[70, 142], [150, 142]],
  detailKey: 'own',
  detail: (ctx, a) => {
    // stripes on the sail in the god's colour, and shields along the gunwale
    if (want('sail')) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(46, 20);
      ctx.quadraticCurveTo(X, 10, 174, 20);
      ctx.quadraticCurveTo(186, 70, 174, 118);
      ctx.quadraticCurveTo(X, 110, 46, 118);
      ctx.quadraticCurveTo(34, 70, 46, 20);
      ctx.clip();
      for (const x of [66, 106, 146]) {
        ctx.fillStyle = rgba(a.color, 0.75);
        ctx.fillRect(x, 0, 18, 130);
      }
      ctx.restore();
    }
    if (!want()) return;
    for (const x of [52, 82, 112, 142, 172]) {
      circle(ctx, x, 128, 9);
      ctx.fillStyle = lit(ctx, x, 128, 9, x % 60 < 30 ? '#c8402a' : '#e8c060', 0.4);
      ctx.fill();
      ink(ctx, 2.2);
    }
  },
};

S.snowflake = {
  parts: [
    ...[0, 1, 2, 3, 4, 5].map((i): Part => ['wood', () => {
      const c = ctx0();
      c.save();
      c.translate(X, 98);
      c.rotate((i / 6) * Math.PI * 2 + Math.PI / 2);
      c.beginPath();
      c.moveTo(0, -14);
      c.lineTo(58, -14);
      c.lineTo(66, -34);
      c.lineTo(76, -26);
      c.lineTo(70, -10);
      c.lineTo(90, 0);
      c.lineTo(70, 10);
      c.lineTo(76, 26);
      c.lineTo(66, 34);
      c.lineTo(58, 14);
      c.lineTo(0, 14);
      c.closePath();
      c.restore();
    }, 'flake']),
    ['iron', () => star(ctx0(), X, 98, 30, 6, 0.75, 0), 'flake'],
  ],
  marks: [[X, 26], [48, 134], [172, 134]],
  marksKey: 'flake',
  detailKey: 'flake',
  detail: (ctx, a) => glowDot(ctx, X, 98, 10, a.color),
};

S.apple = {
  parts: [
    ['gold', () => {
      const c = ctx0();
      c.beginPath();
      c.moveTo(X, 46);
      c.bezierCurveTo(150, 14, 210, 50, 190, 120);
      c.bezierCurveTo(176, 170, 140, 184, X, 172);
      c.bezierCurveTo(80, 184, 44, 170, 30, 120);
      c.bezierCurveTo(10, 50, 70, 14, X, 46);
      c.closePath();
    }],
    ['wood', () => roundRect(ctx0(), 103, 14, 14, 40, 5)],
    ['wood', () => roundRect(ctx0(), 96, 168, 28, 22, 6)],
  ],
  marks: [[80, 116], [140, 116]],
  sheen: [70, 82, 16, 26],
  detailKey: 'leaf',
  detail: () => {
    const c = ctx0();
    c.beginPath();
    c.ellipse(144, 30, 26, 11, -0.5, 0, Math.PI * 2);
    c.fillStyle = lit(c, 144, 30, 26, '#6ab04a', 0.4);
    c.fill();
    ink(c, 3);
  },
};

/** Bragi's harp strings: [x, top, bottom]. */
export const HARP_STRINGS: [number, number, number][] = Array.from({ length: 6 }, (_, i) => {
  const tx = 74 + i * 18;
  const [, ty] = bez([56, 16], [110, -2], [170, 30], [184, 70], (tx - 56) / 128);
  const by = 186 - (tx - 68) * 1.02;
  return [tx, ty + 10, Math.min(176, by + 8)];
});
S.harp = {
  parts: [
    ['wood', () => taper(ctx0(), [[54, 186], [50, 130], [46, 70], [56, 16]], 26, 22)],
    ['wood', () => taper(ctx0(), [[56, 16], [110, -2], [170, 30], [184, 70]], 22, 30)],
    ['wood', () => taper(ctx0(), [[184, 70], [160, 110], [120, 150], [80, 186]], 30, 26)],
    ['iron', () => roundRect(ctx0(), 88, 172, 48, 18, 6)],
  ],
  marks: [[50, 110]],
  detailKey: 'own',
  detail: (ctx, a) => {
    // glowing strings from the neck down to the soundboard (plucked on a living peel: src/art/peelGod.ts)
    if (want('strings')) {
      ctx.save();
      ctx.shadowColor = a.color;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = shade(a.color, 0.35);
      ctx.lineWidth = 2.2;
      for (const [tx, y0, y1] of HARP_STRINGS) {
        ctx.beginPath();
        ctx.moveTo(tx, y0);
        ctx.lineTo(tx, y1);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (!want()) return;
    // a carved dragon-head finial
    circle(ctx, 184, 70, 12);
    ctx.fillStyle = ironG(ctx);
    ctx.fill();
    ink(ctx, 2.6);
    glowDot(ctx, 188, 66, 3.5, a.color);
  },
};

/** Use up the random numbers a part's fill would (its veins or grain), so the parts after it look as in the still. */
function skipFill(mat: Mat, r: () => number): void {
  if (mat === 'marble' || mat === 'tint' || mat === 'dark') for (let i = 0; i < 40; i++) r();
  else if (mat === 'wood') for (let i = 0; i < 54; i++) r();
}

// the part paths draw onto whichever context is being painted
let cur: Ctx | null = null;
function ctx0(): Ctx {
  return cur!;
}

/** Draw a god's shaped head; false when its symbol keeps a round head. */
export function drawShaped(ctx: Ctx, a: GodArt, id: string): boolean {
  const sh = S[a.symbol];
  if (!sh) return false;
  if (sh.draw) {
    sh.draw(ctx, a);
    return true;
  }
  cur = ctx;
  const r = rng(hashStr(id));
  const greek = a.pantheon === 'greek';
  // a soft divine glow behind the Greek heads; a faint rune-light behind the Norse ones
  ctx.save();
  ctx.shadowColor = greek ? rgba('#fff2b0', 0.95) : rgba(a.color, 0.55);
  ctx.shadowBlur = greek ? 22 : 14;
  for (const [, p, key] of sh.parts) {
    // (a living peel paints the glow behind each moving part with it, and the rest's as a layer of its own)
    if (!want(key ? `${key}:glow` : 'glow')) continue;
    p();
    ctx.fillStyle = greek ? '#fff4d0' : shade(a.color, -0.3);
    if (evenOdd.has(a.symbol)) ctx.fill('evenodd');
    else ctx.fill();
  }
  ctx.restore();
  for (const [mat, p, key] of sh.parts) {
    // (a part not painted now still uses up the random numbers its veins or grain would)
    if (!want(key)) {
      if (!evenOdd.has(a.symbol)) skipFill(mat, r);
      continue;
    }
    if (evenOdd.has(a.symbol)) {
      // even-odd parts keep their hole: fill once with the rule, then the band and outline
      p();
      ctx.fillStyle = mat === 'gold' ? goldG(ctx) : lit(ctx, 90, 70, 150, a.base ?? '#efe9dc', 0.22);
      ctx.fill('evenodd');
      ctx.save();
      p();
      ctx.clip('evenodd');
      ctx.translate(-2.5, -2.5);
      p();
      ctx.strokeStyle = rgba('#ffffff', 0.5);
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
      p();
      ink(ctx, 4.5);
    } else fill(ctx, p, mat, a, r);
  }
  // the collar where the head meets the handle
  if (want(sh.collarKey)) {
    roundRect(ctx, X - 21, 180, 42, 14, 5);
    ctx.fillStyle = greek ? goldG(ctx) : ironG(ctx, a.rim ?? '#5c6068');
    ctx.fill();
    ink(ctx, 3.5);
  }
  if (sh.detailKey === 'own' || want(sh.detailKey)) sh.detail?.(ctx, a);
  if (!greek)
    (sh.marks ?? []).forEach(([x, y], i) => {
      const idx = Math.floor(r() * RUNES.length) + i;
      if (want(Array.isArray(sh.marksKey) ? sh.marksKey[i] : sh.marksKey)) glowRune(ctx, idx, x, y, a.color);
    });
  if (sh.sheen && want()) {
    const [x, y, rx, ry] = sh.sheen;
    shine(ctx, x, y, rx, ry, 0.42);
  }
  cur = null;
  return true;
}
