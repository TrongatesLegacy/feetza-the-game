// The place peels' heads (src/art/peelPlace.ts): no frame, no bezel. Each head is cut to a silhouette of its own, the
// place's living window (its scene's layers and loops, src/art/peelPlaceDefs.ts) showing through it:
//
// - object heads, where a place is known for one thing: the trattoria's wood-fired oven (a beehive with its flue),
//   the diner's jukebox, the lodge's chimney breast, Space's ringed planet, the kitchen's saucepan, the rink's mirror
//   ball, the Doom Lab's vat, Metropizza's Art Deco crown, Tartarus's soul fire (a flame), the Oven Between Worlds'
//   broken portal, the First Pizzeria's first slice, the Hot Gates' Spartan helmet, the Labyrinth's amphora;
// - shaped scenes, where the view is the point: the rooftop under a gable, the beach on a surfboard, Old Town in its
//   campanile, the pier under a swell, the slopes cut to their peaks, the cellar's gothic arch, Jotunheim in an ice
//   shard, Bifröst in a rune-stone, Goth-Ham in the signal's oval.
//
// Each has its silhouette (peel units: the head's centre is (110, 100); the handle's top is at y 172, the neck at
// 194, so every silhouette reaches down over it), the box the window fills (inside the crafted surface's box, SB),
// how the scene's crop moves and zooms against the old window's, and a few touches over it in its own material (a
// flue's cap, a ring round the planet, the pan's handles, the vat's steel bands, a slice's crust, a crest).

import type { LocationId } from './backdrops';
import { INK } from './feetCommon';
import { rgba, rng, shade, type Ctx } from './util';
import type { PlaceState } from './peelPlaceDefs';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlaceHead {
  /** Object (the place's one thing) or a shaped scene (the view cut to a shape). */
  kind: 'object' | 'scene';
  /** The silhouette (peel units): begins its own path. */
  path(c: Ctx): void;
  /** The box the window fills (peel units). */
  box: Box;
  /** The scene's crop against the window's: moved (scene px) and zoomed in (bigger: closer). */
  dx?: number;
  dy?: number;
  zoom?: number;
  /** Its material's edge (the light catching the silhouette's rim) and touches over the window. */
  rim?: string;
  dress?(c: Ctx): void;
  /** A painted head: the object itself, drawn whole each frame with its own edges (the window isn't shown). */
  paint?(c: Ctx, s: HeadState): void;
  update?(s: HeadState, dt: number): void;
}

export type HeadState = PlaceState;

const TAU = Math.PI * 2;

function lin(c: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

/** Fill and ink the current path. */
function fs(c: Ctx, fill: string | CanvasGradient, lw = 3): void {
  c.fillStyle = fill;
  c.fill();
  if (lw) {
    c.strokeStyle = INK;
    c.lineWidth = lw;
    c.stroke();
  }
}

/** A metal band or bar, lit from the top (a rounded rect). */
function bar(c: Ctx, x: number, y: number, w: number, h: number, col: string, r = h / 2): void {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  fs(c, lin(c, 0, y, 0, y + h, [[0, shade(col, 0.5)], [0.45, col], [1, shade(col, -0.45)]]), 2.6);
}

/** A polygon. */
function poly(c: Ctx, pts: number[]): void {
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}

/** The oven's broken edge: an oval, chipped all round (fixed: the same chips every time). */
const PORTAL = (() => {
  const r = rng(91);
  const pts: number[] = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2;
    const k = i % 2 ? 0.93 - r() * 0.05 : 1 - r() * 0.03;
    pts.push(110 + Math.cos(a) * 82 * k, 98 + Math.sin(a) * 92 * k);
  }
  return pts;
})();

// ════════════════════════════ painted heads: the object itself, alive ════════════════════════════

/** A painted head's static layer, per canvas scale (peel units in, cut to the surface's box SB). */
const layers = new Map<string, HTMLCanvasElement>();
const SBX = { x: 14, y: 2, w: 192, h: 202 };
function layer(key: string, ctx: Ctx, paint: (c: Ctx) => void): HTMLCanvasElement {
  const m = ctx.getTransform();
  const k = Math.max(1, Math.round(Math.hypot(m.a, m.b) * 2) / 2);
  const id = `${key}@${k}`;
  let c = layers.get(id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.ceil(SBX.w * k);
    c.height = Math.ceil(SBX.h * k);
    const g = c.getContext('2d')!;
    g.setTransform(k, 0, 0, k, -SBX.x * k, -SBX.y * k);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    paint(g);
    layers.set(id, c);
  }
  return c;
}
const drawLayer = (ctx: Ctx, c: HTMLCanvasElement) => ctx.drawImage(c, SBX.x, SBX.y, SBX.w, SBX.h);

/** A soft round glow (added light). */
function glowAt(g: Ctx, x: number, y: number, r: number, col: string, a: number): void {
  if (a <= 0.005) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, Math.min(1, a)));
  gr.addColorStop(0.45, rgba(col, Math.min(1, a) * 0.4));
  gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A four-pointed glint. */
function glint(g: Ctx, x: number, y: number, s: number, a: number): void {
  if (a <= 0.01 || s <= 0.3) return;
  g.save();
  g.globalAlpha = Math.min(1, a);
  glowAt(g, x, y, s * 1.4, '#ffffff', 0.6);
  g.beginPath();
  g.moveTo(x, y - s);
  g.quadraticCurveTo(x + s * 0.12, y - s * 0.12, x + s, y);
  g.quadraticCurveTo(x + s * 0.12, y + s * 0.12, x, y + s);
  g.quadraticCurveTo(x - s * 0.12, y + s * 0.12, x - s, y);
  g.quadraticCurveTo(x - s * 0.12, y - s * 0.12, x, y - s);
  g.fillStyle = '#ffffff';
  g.fill();
  g.restore();
}

// ——— the Roller Rink's mirror ball ———

const BALL = { x: 110, y: 90, r: 78 };
const LAT = 13;
const LON = 26;
/** Light from the top left and in front; the half-vector for the mirror's flash. */
const LD = (() => {
  const v = [-0.5, 0.62, 0.6];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
})();
const HV = (() => {
  const v = [LD[0], LD[1], LD[2] + 1];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
})();
const TINTS = ['#ffffff', '#ffd0f0', '#c8f0ff', '#fff0c0', '#e0d0ff'];

/** The ball's hanger at the handle's top, its cap, and the ball's dark body (the grout between the mirrors). */
function ballBase(c: Ctx): void {
  const { x, y, r } = BALL;
  // the hanger: a ring and a short chain down to the handle
  c.beginPath();
  c.moveTo(x, y + r - 4);
  c.lineTo(x, 182);
  c.strokeStyle = INK;
  c.lineWidth = 7;
  c.stroke();
  c.strokeStyle = '#c7ccd4';
  c.lineWidth = 3.4;
  c.stroke();
  for (const ly of [172, 180]) {
    c.beginPath();
    c.ellipse(x, ly, 4.4, 5.2, 0, 0, TAU);
    c.strokeStyle = INK;
    c.lineWidth = 4.6;
    c.stroke();
    c.strokeStyle = '#e8edf2';
    c.lineWidth = 2;
    c.stroke();
  }
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#4a4866');
  g.addColorStop(1, '#14121e');
  c.fillStyle = g;
  c.fill();
}

/** Over the ball: its shading, its rim catching the light, its ink edge, its cap. */
function ballOver(c: Ctx): void {
  const { x, y, r } = BALL;
  c.save();
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.clip();
  const sh = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.4, x, y, r * 1.05);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(0.75, 'rgba(10,6,24,0.15)');
  sh.addColorStop(1, 'rgba(10,6,24,0.6)');
  c.fillStyle = sh;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.strokeStyle = INK;
  c.lineWidth = 5;
  c.stroke();
  c.beginPath();
  c.arc(x, y, r - 3.5, Math.PI * 1.05, Math.PI * 1.6);
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 2;
  c.stroke();
  // the cap where the hanger meets it
  c.beginPath();
  c.roundRect(x - 9, y + r - 8, 18, 10, 3);
  c.fillStyle = lin(c, 0, y + r - 8, 0, y + r + 2, [[0, '#f0f2f6'], [1, '#6a7480']]);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 2.4;
  c.stroke();
}

function hash(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function paintBall(c: Ctx, s: HeadState): void {
  const m = s.mem;
  const { x, y, r } = BALL;
  const hit = s.still ? 0 : s.hit(1.2);
  // it turns slowly; a smack spins it up
  const spin = s.still ? 0.3 : (m.spin ?? 0);
  // the spots it throws, wheeling round it (behind and past its edge)
  if (!s.still) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 11; i++) {
      const a = i * 0.57 + spin * 1.3 + hash(i) * TAU;
      const rr = r + 6 + hash(i + 40) * 14;
      const sx = x + Math.cos(a) * rr;
      const sy = y + Math.sin(a) * rr * 0.8;
      const tw = 0.35 + 0.35 * Math.sin(s.t * 3 + i * 1.9) + hit * 0.6;
      glowAt(c, sx, sy, 6 + hash(i + 9) * 4, TINTS[i % TINTS.length], tw);
    }
    c.restore();
  }
  drawLayer(c, layer('ball', c, ballBase));
  // the mirrors: each tile on the sphere, lit by the light and flashing where it catches it straight on
  c.save();
  c.beginPath();
  c.arc(x, y, r - 0.5, 0, TAU);
  c.clip();
  const gap = 0.07;
  for (let i = 0; i < LAT; i++) {
    const la0 = -Math.PI / 2 + (i / LAT) * Math.PI;
    const la1 = la0 + Math.PI / LAT;
    const lm = (la0 + la1) / 2;
    // fewer tiles round the poles
    const n = Math.max(6, Math.round(LON * Math.cos(lm)));
    for (let j = 0; j < n; j++) {
      const lo0 = (j / n) * TAU + spin;
      const lo1 = lo0 + TAU / n;
      const lmid = (lo0 + lo1) / 2;
      const nz = Math.cos(lm) * Math.cos(lmid);
      if (nz <= 0.02) continue;
      const nx = Math.cos(lm) * Math.sin(lmid);
      const ny = Math.sin(lm);
      const d = Math.max(0, nx * LD[0] + ny * LD[1] + nz * LD[2]);
      const h = Math.max(0, nx * HV[0] + ny * HV[1] + nz * HV[2]);
      const id = i * 64 + j;
      const flash = Math.pow(h, 60) + (hash(id) > 0.93 ? Math.max(0, Math.sin(s.t * 2.2 + hash(id + 7) * 20)) ** 8 : 0) + hit * (hash(id + 3) > 0.7 ? 0.8 : 0);
      const v = 0.38 + 0.5 * d + Math.min(1, flash) * 0.8;
      const tint = TINTS[Math.floor(hash(id + 11) * TINTS.length)];
      const pts: [number, number][] = [];
      for (const [la, lo] of [[la0 + gap * (la1 - la0), lo0 + gap * (lo1 - lo0)], [la0 + gap * (la1 - la0), lo1 - gap * (lo1 - lo0)], [la1 - gap * (la1 - la0), lo1 - gap * (lo1 - lo0)], [la1 - gap * (la1 - la0), lo0 + gap * (lo1 - lo0)]] as const)
        pts.push([x + r * Math.cos(la) * Math.sin(lo), y - r * Math.sin(la)]);
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < 4; k++) c.lineTo(pts[k][0], pts[k][1]);
      c.closePath();
      const base = Math.round(80 + 170 * Math.min(1, v));
      c.fillStyle = v > 0.9 ? rgba(tint, Math.min(1, v - 0.1)) : `rgb(${Math.round(base * 0.92)},${Math.round(base * 0.9)},${base})`;
      c.fill();
    }
  }
  c.restore();
  drawLayer(c, layer('ballOver', c, ballOver));
  // glints on the brightest mirrors
  if (!s.still)
    for (let k = 0; k < 3; k++) {
      const u = (s.t * 0.7 + k * 0.33) % 1;
      if (u > 0.3) continue;
      const a = Math.sin((u / 0.3) * Math.PI);
      const ang = k * 2.1 + Math.floor(s.t * 0.7 + k * 0.33) * 1.3;
      glint(c, x - 20 + Math.cos(ang) * 30, y - 22 + Math.sin(ang) * 26, 9 * a, a);
    }
  else glint(c, x - 30, y - 34, 8, 1);
  if (hit > 0.05) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    glowAt(c, x - 10, y - 10, r * 1.2, '#ffe8ff', 0.35 * hit);
    c.restore();
  }
}

// ——— the First Pizzeria's first slice ———

const SL = { tip: [110, 192] as const, l: [24, 44] as const, r: [196, 44] as const, top: -2 };

function slicePath(c: Ctx): void {
  c.beginPath();
  c.moveTo(SL.tip[0], SL.tip[1]);
  c.lineTo(SL.l[0], SL.l[1]);
  c.quadraticCurveTo(110, SL.top, SL.r[0], SL.r[1]);
  c.closePath();
}

/** The slice at rest: cheese, sauce at its edge, pepperoni, basil, char; a puffed, blistered crust. */
function slicePaint(c: Ctx): void {
  // the cheese
  slicePath(c);
  const ch = c.createLinearGradient(110, 20, 110, 192);
  ch.addColorStop(0, '#ffe27a');
  ch.addColorStop(0.5, '#ffc83a');
  ch.addColorStop(1, '#f0a020');
  c.fillStyle = ch;
  c.fill();
  c.save();
  slicePath(c);
  c.clip();
  // sauce peeking at the edges, under a melted, wavy cheese line
  c.beginPath();
  c.moveTo(110, 192);
  c.lineTo(24, 44);
  c.lineTo(36, 44);
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    c.lineTo(36 + (110 - 36) * u + Math.sin(i * 2.1) * 3.4, 50 + (186 - 50) * u);
  }
  c.closePath();
  c.fillStyle = '#c8321e';
  c.fill();
  c.beginPath();
  c.moveTo(110, 192);
  c.lineTo(196, 44);
  c.lineTo(184, 44);
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    c.lineTo(184 - (184 - 110) * u + Math.sin(i * 1.7 + 1) * 3.4, 50 + (186 - 50) * u);
  }
  c.closePath();
  c.fillStyle = '#b82a18';
  c.fill();
  // browned cheese blisters
  const r = rng(77);
  for (let i = 0; i < 18; i++) {
    const y = 50 + r() * 120;
    const half = ((192 - y) / 148) * 72;
    const x = 110 + (r() - 0.5) * half * 1.5;
    c.beginPath();
    c.ellipse(x, y, 2.6 + r() * 4, 1.8 + r() * 2.4, r() * 3, 0, TAU);
    c.fillStyle = `rgba(190,100,20,${(0.25 + r() * 0.3).toFixed(2)})`;
    c.fill();
  }
  // the light on its top left
  const lg = c.createLinearGradient(30, 30, 150, 150);
  lg.addColorStop(0, 'rgba(255,255,230,0.35)');
  lg.addColorStop(0.5, 'rgba(255,255,230,0)');
  lg.addColorStop(1, 'rgba(120,40,0,0.18)');
  c.fillStyle = lg;
  c.fillRect(20, 0, 180, 196);
  c.restore();
  // pepperoni, lit, with a curl of fat
  for (const [x, y, rr] of [[80, 72, 13], [134, 68, 12], [106, 106, 12], [88, 136, 9], [126, 138, 8], [110, 166, 6]] as const) {
    c.beginPath();
    c.ellipse(x + 1, y + 2, rr, rr * 0.92, 0, 0, TAU);
    c.fillStyle = 'rgba(120,40,0,0.35)';
    c.fill();
    c.beginPath();
    c.ellipse(x, y, rr, rr * 0.92, 0, 0, TAU);
    const pg = c.createRadialGradient(x - rr * 0.35, y - rr * 0.4, rr * 0.1, x, y, rr);
    pg.addColorStop(0, '#f05a3a');
    pg.addColorStop(0.7, '#c8281a');
    pg.addColorStop(1, '#7a1008');
    c.fillStyle = pg;
    c.fill();
    c.strokeStyle = 'rgba(60,8,2,0.8)';
    c.lineWidth = 1.6;
    c.stroke();
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.arc(x + (hash(x + k) - 0.5) * rr, y + (hash(y + k) - 0.5) * rr, 1.2, 0, TAU);
      c.fillStyle = 'rgba(255,210,170,0.6)';
      c.fill();
    }
    c.beginPath();
    c.ellipse(x - rr * 0.35, y - rr * 0.4, rr * 0.3, rr * 0.16, -0.6, 0, TAU);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fill();
  }
  // basil
  for (const [x, y, a] of [[108, 76, -0.4], [70, 104, 0.6], [146, 102, -0.9]] as const) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.beginPath();
    c.moveTo(-9, 0);
    c.quadraticCurveTo(0, -7, 9, 0);
    c.quadraticCurveTo(0, 7, -9, 0);
    c.fillStyle = lin(c, 0, -6, 0, 6, [[0, '#5ac84a'], [1, '#1e7a22']]);
    c.fill();
    c.strokeStyle = 'rgba(10,50,10,0.8)';
    c.lineWidth = 1.2;
    c.stroke();
    c.beginPath();
    c.moveTo(-7, 0);
    c.lineTo(7, 0);
    c.strokeStyle = 'rgba(200,255,180,0.6)';
    c.lineWidth = 0.8;
    c.stroke();
    c.restore();
  }
  // the outline
  slicePath(c);
  c.strokeStyle = INK;
  c.lineWidth = 5.4;
  c.stroke();
  // the crust: puffed, golden brown, blistered and charred, lit along its top
  c.beginPath();
  c.moveTo(SL.l[0] - 2, SL.l[1] + 2);
  c.quadraticCurveTo(110, SL.top, SL.r[0] + 2, SL.r[1] + 2);
  c.strokeStyle = INK;
  c.lineWidth = 24;
  c.stroke();
  c.strokeStyle = lin(c, 0, 10, 0, 50, [[0, '#f8c870'], [0.5, '#d88a30'], [1, '#8a4a14']]);
  c.lineWidth = 18;
  c.stroke();
  c.beginPath();
  c.moveTo(34, 36);
  c.quadraticCurveTo(110, -4, 186, 36);
  c.strokeStyle = 'rgba(255,240,200,0.75)';
  c.lineWidth = 3;
  c.stroke();
  for (const [x, y, w] of [[46, 34, 4], [70, 24, 3], [98, 18, 4.4], [128, 18, 3], [152, 24, 4], [176, 34, 3]] as const) {
    c.beginPath();
    c.ellipse(x, y, w, w * 0.6, 0, 0, TAU);
    c.fillStyle = 'rgba(70,26,4,0.65)';
    c.fill();
  }
}

function paintSlice(c: Ctx, s: HeadState): void {
  const hit = s.still ? 0 : s.hit(0.9);
  // the oven's glow still on it, breathing (and flaring on a smack)
  const br = s.still ? 0.5 : 0.5 + 0.12 * Math.sin(s.t * 1.7) + 0.08 * Math.sin(s.t * 4.3) + 0.5 * hit;
  c.save();
  c.globalCompositeOperation = 'lighter';
  glowAt(c, 110, 96, 104, '#ff9a3a', 0.22 * br);
  c.restore();
  drawLayer(c, layer('slice', c, slicePaint));
  c.save();
  slicePath(c);
  c.clip();
  // the cheese glistening: a sheen sliding over it
  const u = s.still ? 0.4 : ((s.t * 0.28) % 1.4) - 0.2;
  if (u > -0.2 && u < 1.2) {
    const cx = 20 + u * 180;
    const g = c.createLinearGradient(cx - 30, 20, cx + 30, 70);
    g.addColorStop(0, 'rgba(255,255,240,0)');
    g.addColorStop(0.5, `rgba(255,255,240,${(0.32 * Math.sin(Math.PI * Math.min(1, Math.max(0, u)))).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,255,240,0)');
    c.fillStyle = g;
    c.fillRect(20, 0, 180, 196);
  }
  // bubbles in the hot cheese, rising and popping
  if (!s.still)
    for (let i = 0; i < 5; i++) {
      const p = (s.t * 0.6 + i * 0.37) % 1;
      const bx = 110 + (hash(i + Math.floor(s.t * 0.6 + i * 0.37) * 5) - 0.5) * 80;
      const by = 70 + hash(i * 3 + Math.floor(s.t * 0.6 + i * 0.37)) * 70;
      const rr = 1.5 + p * 4.5;
      c.beginPath();
      c.arc(bx, by, rr, 0, TAU);
      c.strokeStyle = `rgba(255,250,210,${(0.75 * (1 - p)).toFixed(3)})`;
      c.lineWidth = 1.3;
      c.stroke();
    }
  // a warm flash when it's smacked
  if (hit > 0.02) {
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,200,120,${(0.3 * hit).toFixed(3)})`;
    c.fillRect(20, 0, 180, 196);
  }
  c.restore();
  // steam curling up off it (more after a smack)
  if (!s.still) {
    c.save();
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const p = (s.t * 0.32 + i * 0.25) % 1;
      const x0 = 62 + i * 32;
      const y0 = 84 - p * 58;
      const a = Math.sin(Math.PI * p) * (0.4 + 0.4 * hit);
      c.beginPath();
      c.moveTo(x0, y0 + 14);
      c.bezierCurveTo(x0 - 8, y0 + 6, x0 + 8, y0 - 2, x0 + Math.sin(s.t + i) * 4, y0 - 12);
      c.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      c.lineWidth = 5 - p * 2;
      c.stroke();
    }
    c.restore();
  }
}

export const PLACE_HEADS: Partial<Record<LocationId, PlaceHead>> = {
  trattoria: {
    kind: 'object',
    // the wood-fired oven: a beehive dome on its base, its flue on top
    path(c) {
      c.beginPath();
      c.moveTo(30, 188);
      c.lineTo(30, 140);
      c.ellipse(110, 140, 80, 112, 0, Math.PI, TAU);
      c.lineTo(190, 188);
      c.quadraticCurveTo(190, 194, 184, 194);
      c.lineTo(36, 194);
      c.quadraticCurveTo(30, 194, 30, 188);
      c.closePath();
      c.moveTo(97, 40);
      c.lineTo(97, 8);
      c.lineTo(123, 8);
      c.lineTo(123, 40);
      c.closePath();
    },
    box: { x: 30, y: 8, w: 160, h: 186 },
    zoom: 1.05,
    dy: -6,
    rim: '#ffd9a8',
    dress(c) {
      // the flue's cap
      bar(c, 92, 4, 36, 9, '#6a5a52', 3);
    },
  },
  rooftop: {
    kind: 'scene',
    // a gable end, its chimney on the slope
    path(c) {
      c.beginPath();
      poly(c, [110, 12, 202, 94, 186, 94, 186, 194, 34, 194, 34, 94, 18, 94]);
      c.moveTo(146, 62);
      c.lineTo(146, 24);
      c.lineTo(170, 24);
      c.lineTo(170, 82);
      c.closePath();
    },
    box: { x: 18, y: 12, w: 184, h: 182 },
    zoom: 1,
    rim: '#ffe0b0',
    dress(c) {
      bar(c, 141, 18, 34, 9, '#b8683a', 2);
    },
  },
  beach: {
    kind: 'scene',
    // a surfboard, its stringer down the middle
    path(c) {
      c.beginPath();
      c.moveTo(110, 4);
      c.bezierCurveTo(158, 30, 176, 90, 172, 132);
      c.bezierCurveTo(168, 176, 140, 196, 110, 196);
      c.bezierCurveTo(80, 196, 52, 176, 48, 132);
      c.bezierCurveTo(44, 90, 62, 30, 110, 4);
      c.closePath();
    },
    box: { x: 46, y: 4, w: 128, h: 192 },
    zoom: 1.1,
    rim: '#ffffff',
    dress(c) {
      // its racing stripe across the nose, and its fin off the tail
      c.save();
      PLACE_HEADS.beach!.path(c);
      c.clip();
      c.fillStyle = '#ff6a4a';
      c.beginPath();
      c.moveTo(40, 52);
      c.lineTo(180, 30);
      c.lineTo(180, 40);
      c.lineTo(40, 62);
      c.closePath();
      c.fill();
      c.fillStyle = '#3fb6c9';
      c.beginPath();
      c.moveTo(40, 66);
      c.lineTo(180, 44);
      c.lineTo(180, 48);
      c.lineTo(40, 70);
      c.closePath();
      c.fill();
      c.restore();
      c.beginPath();
      c.moveTo(166, 150);
      c.quadraticCurveTo(190, 156, 194, 180);
      c.quadraticCurveTo(180, 176, 160, 176);
      c.closePath();
      fs(c, lin(c, 160, 150, 194, 180, [[0, '#4ad0e0'], [1, '#1a7a8a']]), 2.6);
      // a glossy wax sheen down its left
      c.beginPath();
      c.moveTo(78, 46);
      c.bezierCurveTo(64, 90, 62, 130, 72, 166);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 4;
      c.stroke();
    },
  },
  diner: {
    kind: 'object',
    // the jukebox: its arch
    path(c) {
      c.beginPath();
      c.moveTo(32, 194);
      c.lineTo(32, 94);
      c.arc(110, 94, 78, Math.PI, TAU);
      c.lineTo(188, 194);
      c.closePath();
    },
    box: { x: 32, y: 16, w: 156, h: 178 },
    zoom: 1.1,
    dy: 8,
    rim: '#e8f6ff',
    dress(c) {
      // its chrome plinth
      bar(c, 26, 182, 168, 12, '#c7ccd4', 4);
    },
  },
  lodge: {
    kind: 'object',
    // the chimney breast: the stone hearth below, the stack narrowing above its mantel
    path(c) {
      c.beginPath();
      poly(c, [24, 194, 24, 108, 40, 96, 58, 96, 62, 10, 158, 10, 162, 96, 180, 96, 196, 108, 196, 194]);
    },
    box: { x: 24, y: 10, w: 172, h: 184 },
    zoom: 1.05,
    dy: -20,
    rim: '#f0d8b8',
    dress(c) {
      // the mantel shelf
      bar(c, 18, 92, 184, 10, '#7a4a2b', 3);
    },
  },
  space: {
    kind: 'object',
    // a planet, its ring round it
    path(c) {
      c.beginPath();
      c.arc(110, 100, 80, 0, TAU);
    },
    box: { x: 30, y: 20, w: 160, h: 174 },
    zoom: 1.45,
    dy: 50,
    rim: '#bfe4ff',
    dress(c) {
      const ring = (a0: number, a1: number) => {
        c.beginPath();
        c.ellipse(110, 104, 94, 20, -0.28, a0, a1);
      };
      // the ring where it's out past the planet, and in front of it
      const draw = () => {
        c.strokeStyle = INK;
        c.lineWidth = 9;
        c.stroke();
        c.strokeStyle = lin(c, 16, 0, 204, 0, [[0, '#ffe6a0'], [0.5, '#d8a05a'], [1, '#8a5a3a']]);
        c.lineWidth = 5.4;
        c.stroke();
        c.strokeStyle = 'rgba(255,250,230,0.6)';
        c.lineWidth = 1.2;
        c.stroke();
      };
      c.save();
      c.beginPath();
      c.rect(0, 0, 220, 220);
      c.arc(110, 100, 80, 0, TAU, true);
      c.clip();
      ring(0, TAU);
      draw();
      c.restore();
      ring(0, Math.PI);
      draw();
    },
  },
  kitchen: {
    kind: 'object',
    // the saucepan: its lip, its belly and its two handles
    path(c) {
      c.beginPath();
      c.roundRect(36, 58, 148, 136, [6, 6, 30, 30]);
      c.roundRect(28, 52, 164, 14, 6);
    },
    box: { x: 28, y: 52, w: 164, h: 142 },
    zoom: 1.75,
    dy: 30,
    rim: '#ffffff',
    dress(c) {
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.roundRect(sx < 0 ? 8 : 188, 72, 24, 16, 7);
        fs(c, lin(c, 0, 72, 0, 88, [[0, '#e8edf2'], [1, '#6a7480']]), 3);
      }
      // the pan's steel catching the light
      c.beginPath();
      c.moveTo(50, 80);
      c.lineTo(50, 170);
      c.strokeStyle = 'rgba(255,255,255,0.3)';
      c.lineWidth = 5;
      c.stroke();
    },
  },
  oldtown: {
    kind: 'scene',
    // the campanile: its tower and pyramid roof
    path(c) {
      c.beginPath();
      poly(c, [56, 194, 56, 64, 48, 64, 110, 6, 172, 64, 164, 64, 164, 194]);
    },
    box: { x: 48, y: 6, w: 124, h: 188 },
    zoom: 1.5,
    dy: -10,
    rim: '#ffd8b0',
    dress(c) {
      // the roof's tiles, and the bell's arch under it
      c.save();
      c.beginPath();
      poly(c, [110, 6, 172, 64, 48, 64]);
      c.clip();
      c.fillStyle = 'rgba(160,70,40,0.75)';
      c.fillRect(40, 0, 140, 70);
      c.strokeStyle = 'rgba(80,30,16,0.6)';
      c.lineWidth = 1.2;
      c.beginPath();
      for (let y = 18; y < 64; y += 9) {
        c.moveTo(40, y);
        c.lineTo(180, y);
      }
      c.stroke();
      c.restore();
      bar(c, 44, 60, 132, 8, '#c9b8a0', 2);
    },
  },
  pier: {
    kind: 'scene',
    // a swell: three crests along its top
    path(c) {
      c.beginPath();
      c.moveTo(24, 176);
      c.lineTo(24, 66);
      c.quadraticCurveTo(44, 30, 72, 54);
      c.quadraticCurveTo(92, 72, 110, 24);
      c.quadraticCurveTo(128, 72, 148, 54);
      c.quadraticCurveTo(176, 30, 196, 66);
      c.lineTo(196, 176);
      c.quadraticCurveTo(196, 194, 178, 194);
      c.lineTo(42, 194);
      c.quadraticCurveTo(24, 194, 24, 176);
      c.closePath();
    },
    box: { x: 24, y: 24, w: 172, h: 170 },
    zoom: 1.05,
    rim: '#e8f8ff',
    dress(c) {
      // foam along the crests
      c.beginPath();
      c.moveTo(26, 64);
      c.quadraticCurveTo(44, 32, 72, 56);
      c.quadraticCurveTo(92, 72, 110, 27);
      c.quadraticCurveTo(128, 72, 148, 56);
      c.quadraticCurveTo(176, 32, 194, 64);
      c.strokeStyle = 'rgba(255,255,255,0.85)';
      c.lineWidth = 3;
      c.stroke();
    },
  },
  rink: {
    kind: 'object',
    // the mirror ball itself, no frame: hung from its cap at the handle's top, turning, its mirrors catching the
    // light and throwing spots round it; a smack spins it up and scatters the light
    path(c) {
      c.beginPath();
      c.arc(BALL.x, BALL.y, BALL.r, 0, TAU);
    },
    box: { x: 30, y: 12, w: 160, h: 182 },
    zoom: 3.6,
    dy: -42,
    update(s, dt) {
      s.mem.spin = ((s.mem.spin ?? 0) + dt * (0.22 + 3.2 * s.hit(1.2))) % TAU;
    },
    paint: paintBall,
  },

  slopes: {
    kind: 'scene',
    // the peaks
    path(c) {
      c.beginPath();
      poly(c, [24, 194, 24, 122, 58, 70, 76, 90, 110, 8, 146, 84, 164, 62, 196, 118, 196, 194]);
    },
    box: { x: 24, y: 8, w: 172, h: 186 },
    zoom: 1.05,
    dy: 10,
    rim: '#ffffff',
    dress(c) {
      // snow caps on the peaks
      c.beginPath();
      poly(c, [110, 8, 124, 42, 116, 38, 110, 48, 102, 36, 96, 42]);
      c.moveTo(58, 70);
      c.lineTo(66, 82);
      c.lineTo(58, 80);
      c.lineTo(50, 84);
      c.closePath();
      c.moveTo(164, 62);
      c.lineTo(174, 76);
      c.lineTo(164, 74);
      c.lineTo(156, 78);
      c.closePath();
      c.fillStyle = 'rgba(255,255,255,0.92)';
      c.fill();
    },
  },
  cellar: {
    kind: 'scene',
    // a gothic arch
    path(c) {
      c.beginPath();
      c.moveTo(32, 194);
      c.lineTo(32, 104);
      c.quadraticCurveTo(34, 34, 110, 8);
      c.quadraticCurveTo(186, 34, 188, 104);
      c.lineTo(188, 194);
      c.closePath();
    },
    box: { x: 32, y: 8, w: 156, h: 186 },
    zoom: 1.1,
    rim: '#c8a8d8',
    dress(c) {
      // its keystone
      c.beginPath();
      poly(c, [102, 6, 118, 6, 115, 22, 105, 22]);
      fs(c, lin(c, 0, 6, 0, 22, [[0, '#8a7a7a'], [1, '#4a3a3e']]), 2.4);
    },
  },
  metropizza: {
    kind: 'object',
    // the tower's Art Deco crown, stepped
    path(c) {
      c.beginPath();
      poly(c, [30, 194, 30, 98, 48, 98, 48, 68, 70, 68, 70, 40, 92, 40, 92, 14, 128, 14, 128, 40, 150, 40, 150, 68, 172, 68, 172, 98, 190, 98, 190, 194]);
    },
    box: { x: 30, y: 14, w: 160, h: 180 },
    zoom: 1.05,
    dy: 10,
    rim: '#ffe680',
  },
  doomlab: {
    kind: 'object',
    // the vat: a glass capsule in steel bands
    path(c) {
      c.beginPath();
      c.roundRect(50, 10, 120, 184, 52);
    },
    box: { x: 50, y: 10, w: 120, h: 184 },
    zoom: 1.2,
    rim: '#c8ffd8',
    dress(c) {
      bar(c, 44, 30, 132, 12, '#7a838e', 4);
      bar(c, 44, 166, 132, 12, '#7a838e', 4);
      // the glass's long highlight
      c.beginPath();
      c.moveTo(68, 52);
      c.lineTo(68, 156);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 6;
      c.stroke();
    },
  },
  jotunheim: {
    kind: 'scene',
    // a shard of ice
    path(c) {
      c.beginPath();
      poly(c, [110, 4, 170, 50, 182, 148, 132, 194, 88, 194, 38, 148, 50, 50]);
    },
    box: { x: 38, y: 4, w: 144, h: 190 },
    zoom: 1.1,
    rim: '#e8fbff',
    dress(c) {
      // its facets
      c.beginPath();
      c.moveTo(110, 4);
      c.lineTo(96, 70);
      c.lineTo(50, 50);
      c.moveTo(96, 70);
      c.lineTo(38, 148);
      c.moveTo(110, 4);
      c.lineTo(124, 64);
      c.lineTo(170, 50);
      c.strokeStyle = 'rgba(255,255,255,0.22)';
      c.lineWidth = 1.2;
      c.stroke();
    },
  },
  bifrost: {
    kind: 'scene',
    // a rune-stone, set on its point
    path(c) {
      c.beginPath();
      poly(c, [110, 6, 196, 96, 120, 194, 100, 194, 24, 96]);
    },
    box: { x: 24, y: 6, w: 172, h: 188 },
    zoom: 1.35,
    dy: 20,
    rim: '#ffe6b0',
    dress(c) {
      // runes cut along its upper edges, lit by the bridge
      c.strokeStyle = 'rgba(255,214,120,0.85)';
      c.lineWidth = 2;
      c.beginPath();
      for (const [x, y, s] of [[60, 58, 1], [76, 41, -1], [144, 41, 1], [160, 58, -1]] as const) {
        c.moveTo(x, y + 9);
        c.lineTo(x, y - 7);
        c.moveTo(x, y - 3);
        c.lineTo(x + s * 6, y - 8);
        c.moveTo(x, y + 2);
        c.lineTo(x + s * 6, y - 3);
      }
      c.stroke();
    },
  },
  labyrinth: {
    kind: 'object',
    // an amphora: lip, neck, shoulders, belly
    path(c) {
      c.beginPath();
      c.moveTo(82, 10);
      c.lineTo(138, 10);
      c.lineTo(132, 22);
      c.quadraticCurveTo(124, 30, 126, 46);
      c.bezierCurveTo(182, 58, 198, 104, 182, 142);
      c.bezierCurveTo(170, 172, 140, 188, 124, 194);
      c.lineTo(96, 194);
      c.bezierCurveTo(80, 188, 50, 172, 38, 142);
      c.bezierCurveTo(22, 104, 38, 58, 94, 46);
      c.quadraticCurveTo(96, 30, 88, 22);
      c.closePath();
    },
    box: { x: 28, y: 10, w: 164, h: 184 },
    zoom: 1.45,
    dy: 10,
    rim: '#ffd8a0',
    dress(c) {
      // its two handles, neck to shoulder, and a meander band round its shoulder
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.moveTo(110 + sx * 16, 30);
        c.bezierCurveTo(110 + sx * 54, 18, 110 + sx * 66, 40, 110 + sx * 50, 62);
        c.strokeStyle = INK;
        c.lineWidth = 9;
        c.stroke();
        c.strokeStyle = '#c9732a';
        c.lineWidth = 4.6;
        c.stroke();
      }
      c.save();
      c.beginPath();
      c.rect(20, 60, 180, 12);
      c.clip();
      PLACE_HEADS.labyrinth!.path(c);
      c.clip();
      c.fillStyle = '#1a0e08';
      c.fillRect(20, 60, 180, 12);
      c.strokeStyle = '#e8a050';
      c.lineWidth = 1.6;
      c.beginPath();
      for (let x = 30; x < 190; x += 12) {
        c.moveTo(x, 70);
        c.lineTo(x, 63);
        c.lineTo(x + 8, 63);
        c.lineTo(x + 8, 68);
        c.lineTo(x + 4, 68);
      }
      c.stroke();
      c.restore();
    },
  },
  tartarus: {
    kind: 'object',
    // a soul fire: a flame, its tongues licking up
    path(c) {
      c.beginPath();
      c.moveTo(110, 194);
      c.bezierCurveTo(68, 194, 34, 170, 34, 130);
      c.bezierCurveTo(34, 104, 48, 92, 46, 62);
      c.bezierCurveTo(62, 78, 66, 92, 72, 90);
      c.bezierCurveTo(70, 60, 82, 36, 98, 22);
      c.bezierCurveTo(98, 46, 104, 58, 110, 60);
      c.bezierCurveTo(116, 36, 122, 18, 120, 2);
      c.bezierCurveTo(140, 24, 150, 50, 146, 76);
      c.bezierCurveTo(154, 72, 160, 60, 160, 46);
      c.bezierCurveTo(180, 70, 188, 100, 186, 130);
      c.bezierCurveTo(186, 170, 152, 194, 110, 194);
      c.closePath();
    },
    box: { x: 32, y: 2, w: 156, h: 192 },
    zoom: 1.25,
    dy: -6,
    rim: '#9ae0ff',
  },

  oven: {
    kind: 'object',
    // the portal, its edge broken
    path(c) {
      c.beginPath();
      poly(c, PORTAL);
    },
    box: { x: 28, y: 6, w: 164, h: 188 },
    zoom: 1.2,
    rim: '#ffb070',
  },
  firstpizzeria: {
    kind: 'object',
    // the first slice itself: golden cheese, pepperoni, basil, a puffed and blistered crust, still glowing from the
    // first oven, its cheese glistening and bubbling, steam curling off it
    path: slicePath,
    box: { x: 26, y: 16, w: 168, h: 178 },
    zoom: 1.05,
    dy: -14,
    paint: paintSlice,
  },

  gotham: {
    kind: 'scene',
    // the skyline: gothic spires, the clock tower in the middle
    path(c) {
      c.beginPath();
      poly(c, [
        22, 176, 22, 92, 32, 92, 38, 60, 44, 92, 54, 92, 54, 70, 62, 52, 70, 70, 70, 100, 84, 100, 84, 34, 92, 34, 92, 22,
        110, 2, 128, 22, 128, 34, 136, 34, 136, 100, 150, 100, 150, 66, 158, 44, 166, 66, 166, 92, 176, 92, 182, 56, 188, 92,
        198, 92, 198, 176,
      ]);
      c.lineTo(198, 176);
      c.quadraticCurveTo(198, 194, 180, 194);
      c.lineTo(40, 194);
      c.quadraticCurveTo(22, 194, 22, 176);
      c.closePath();
    },
    box: { x: 22, y: 2, w: 176, h: 192 },
    zoom: 1.05,
    rim: '#ffe680',
    dress(c) {
      // lit windows in the spires
      c.fillStyle = 'rgba(255,220,120,0.85)';
      for (const [x, y] of [[60, 76], [104, 46], [114, 46], [156, 72], [40, 100]] as const) c.fillRect(x, y, 3.4, 5);
    },
  },

  hotgates: {
    kind: 'object',
    // a Spartan helmet: its dome, its cheek guards and nose guard round the T of its face, its crest over it
    path(c) {
      c.beginPath();
      c.moveTo(110, 26);
      c.bezierCurveTo(160, 26, 188, 58, 186, 116);
      c.lineTo(182, 160);
      c.quadraticCurveTo(176, 186, 150, 194);
      c.lineTo(70, 194);
      c.quadraticCurveTo(44, 186, 38, 160);
      c.lineTo(34, 116);
      c.bezierCurveTo(32, 58, 60, 26, 110, 26);
      c.closePath();
    },
    box: { x: 32, y: 26, w: 156, h: 168 },
    zoom: 1.05,
    rim: '#ffe0a0',
    dress(c) {
      // its eye slits either side of the nose guard, dark
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.moveTo(110 + sx * 10, 104);
        c.quadraticCurveTo(110 + sx * 36, 98, 110 + sx * 58, 106);
        c.quadraticCurveTo(110 + sx * 40, 118, 110 + sx * 10, 114);
        c.closePath();
        c.fillStyle = rgba(INK, 0.92);
        c.fill();
      }
      // the nose guard down the middle
      c.beginPath();
      c.roundRect(104, 96, 12, 56, 4);
      fs(c, lin(c, 104, 0, 116, 0, [[0, '#f0c070'], [0.5, '#c8862e'], [1, '#7a4a14']]), 2.4);
      // the brow ridge
      c.beginPath();
      c.moveTo(40, 98);
      c.quadraticCurveTo(110, 78, 180, 98);
      c.strokeStyle = INK;
      c.lineWidth = 6;
      c.stroke();
      c.strokeStyle = '#e0a84a';
      c.lineWidth = 3;
      c.stroke();
      // the red horsehair crest
      c.beginPath();
      c.moveTo(34, 64);
      c.bezierCurveTo(50, 4, 170, 4, 186, 64);
      c.bezierCurveTo(168, 30, 52, 30, 34, 64);
      c.closePath();
      fs(c, lin(c, 0, 8, 0, 60, [[0, '#ff5a4a'], [0.6, '#b8141c'], [1, '#6a0a10']]), 3);
      c.strokeStyle = 'rgba(255,190,170,0.5)';
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < 9; i++) {
        const u = 0.12 + i * 0.095;
        const x = 34 + u * 152;
        const y = 64 - Math.sin(u * Math.PI) * 44;
        c.moveTo(x, y);
        c.lineTo(x + 3, y + 10);
      }
      c.stroke();
    },
  },

};

/** The over-layer for a place head: its edge shaded inside, the light along its rim, its ink outline, its touches. */
export function headOver(c: Ctx, h: PlaceHead): void {
  // (a painted head draws its own edges)
  if (h.paint) return;
  const b = h.box;
  c.save();
  h.path(c);
  c.clip();
  // the edge shaded inside (so the scene sits in the object, not on it), lit from the top left
  h.path(c);
  c.strokeStyle = 'rgba(8,4,14,0.14)';
  c.lineWidth = 12;
  c.lineJoin = 'round';
  c.stroke();
  h.path(c);
  c.strokeStyle = 'rgba(8,4,14,0.12)';
  c.lineWidth = 6;
  c.stroke();
  const gl = c.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  gl.addColorStop(0, 'rgba(255,255,255,0.12)');
  gl.addColorStop(0.4, 'rgba(255,255,255,0)');
  c.fillStyle = gl;
  c.fillRect(b.x, b.y, b.w, b.h);
  c.restore();
  // the ink outline and its lit edge
  h.path(c);
  c.lineJoin = 'round';
  c.strokeStyle = INK;
  c.lineWidth = 6.4;
  c.stroke();
  const rl = c.createLinearGradient(b.x, b.y, b.x + b.w * 0.7, b.y + b.h * 0.7);
  rl.addColorStop(0, rgba(h.rim ?? '#ffffff', 0.75));
  rl.addColorStop(0.5, rgba(h.rim ?? '#ffffff', 0));
  c.save();
  h.path(c);
  c.clip();
  h.path(c);
  c.strokeStyle = rl;
  c.lineWidth = 6;
  c.stroke();
  c.restore();
  h.dress?.(c);
}
