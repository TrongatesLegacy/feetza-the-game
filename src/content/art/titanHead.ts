// Kronos's Titan head for DEVOUR (src/game/bosses/titanDevour.ts): ONE enormous carved stone head, crowned and
// bearded, split by magma cracks, that rises out of the lava pit behind the table. It's drawn live with the 2D canvas
// every frame it's up (its mouth stretches open, its cheeks hollow as it inhales, its eyes and cracks glow with the
// breath, lava drains off it), so this module is a painter, not a texture: drawHead() paints the head for a state,
// drawLava() the lava sheeting and streaming off it as it rises. Head units: the face is ~670 wide with its ears, its
// upper lip at y YU; the fight shows it at HEAD_S px per unit.
// Its stone, beard and lava are procedural canvases built once (headTextures(), a step a frame in idle time:
// buildHeadTextures()). headCard() is a still of the head for the phase card.

import { makeCanvas, type Ctx } from '../../art/util';

/** World px per head unit in the fight. */
export const HEAD_S = 1.6;
/** Outline ink. */
const OL = '#22140e';

// ——— small helpers ———
function rngOf(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sat = (v: number) => clamp(v, 0, 1);
export const ramp = (t: number, a: number, b: number) => sat((t - a) / (b - a));
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(pa >> 16, pb >> 16, t));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerp(pa & 255, pb & 255, t));
  return `rgb(${r},${g},${bl})`;
}
function rgba(hex: string, a: number): string {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${p >> 16},${(p >> 8) & 255},${p & 255},${a})`;
}
export function rampColor(stops: [number, string][], t: number): string {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mixHex(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return stops[stops.length - 1][1];
}
type P2 = [number, number];
/** A closed (or open) Catmull-Rom curve through points. */
export function crPath(c: Ctx, pts: P2[], closed = true, move = true): void {
  const n = pts.length;
  const P = (i: number) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  if (move) c.moveTo(pts[0][0], pts[0][1]);
  else c.lineTo(pts[0][0], pts[0][1]);
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) c.closePath();
}
const mirrorClosed = (R: P2[]): P2[] => R.concat(R.slice(1, -1).reverse().map(([x, y]) => [-x, y] as P2));

// ——— procedural textures ———
const TEX_RES = 1.6; // px per head unit
const TEX_X0 = -360;
const TEX_Y0 = -560;
const TEX_W = 720;
const TEX_H = 1320;

function makeStone(seed: number, base: string, lite: string, dark: string): HTMLCanvasElement {
  const w = Math.round(TEX_W * TEX_RES);
  const h = Math.round(TEX_H * TEX_RES);
  const k = TEX_RES / 2; // (the recipe was tuned at 2 px a unit)
  const r = rngOf(seed);
  const [c, x] = makeCanvas(w, h);
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) {
    const px = r() * w;
    const py = r() * h;
    const rad = (30 + r() * 220) * k;
    const g = x.createRadialGradient(px, py, 0, px, py, rad);
    const col = r() < 0.5 ? lite : dark;
    g.addColorStop(0, rgba(col, 0.1 + r() * 0.18));
    g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, rad, 0, 7);
    x.fill();
  }
  // weathered blocks: a loose brick bond with rounded, chipped corners
  x.lineJoin = 'round';
  for (let y = -40 * k; y < h + 60 * k; y += (70 + r() * 50) * k) {
    let xx = -r() * 120 * k;
    const rh = (70 + r() * 40) * k;
    while (xx < w + 60 * k) {
      const bw = (90 + r() * 150) * k;
      const jx = (r() - 0.5) * 10 * k;
      const jy = (r() - 0.5) * 10 * k;
      const rr = (14 + r() * 18) * k;
      x.beginPath();
      x.roundRect(xx + jx, y + jy, bw - 8 * k, rh - 8 * k, rr);
      x.strokeStyle = rgba(dark, 0.22 + r() * 0.2);
      x.lineWidth = (3 + r() * 3) * k;
      x.stroke();
      x.save();
      x.translate(2.5 * k, 2.5 * k);
      x.beginPath();
      x.roundRect(xx + jx, y + jy, bw - 8 * k, rh - 8 * k, rr);
      x.strokeStyle = rgba(lite, 0.1);
      x.lineWidth = 2 * k;
      x.stroke();
      x.restore();
      if (r() < 0.4) {
        x.beginPath();
        x.roundRect(xx + jx, y + jy, bw - 8 * k, rh - 8 * k, rr);
        x.fillStyle = rgba(r() < 0.5 ? lite : dark, 0.07 + r() * 0.06);
        x.fill();
      }
      xx += bw;
    }
  }
  for (let i = 0; i < 14000; i++) {
    const px = r() * w;
    const py = r() * h;
    const rad = (0.6 + r() * 2.4) * k;
    x.fillStyle = r() < 0.62 ? rgba('#221c18', 0.25 + r() * 0.35) : rgba('#e0d8cc', 0.16 + r() * 0.2);
    x.beginPath();
    x.arc(px, py, rad, 0, 7);
    x.fill();
  }
  for (let i = 0; i < 90; i++) {
    let px = r() * w;
    let py = r() * h;
    let a = r() * 7;
    const pts: P2[] = [[px, py]];
    const n = 3 + Math.floor(r() * 7);
    for (let j = 0; j < n; j++) {
      a += (r() - 0.5) * 1.3;
      px += Math.cos(a) * (10 + r() * 24) * k;
      py += Math.sin(a) * (10 + r() * 24) * k;
      pts.push([px, py]);
    }
    x.beginPath();
    pts.forEach(([u, v], j) => (j ? x.lineTo(u, v) : x.moveTo(u, v)));
    x.strokeStyle = rgba('#16110e', 0.55);
    x.lineWidth = (1.4 + r() * 1.8) * k;
    x.stroke();
    x.save();
    x.translate(1.6 * k, 1.6 * k);
    x.strokeStyle = rgba('#e0d8cc', 0.12);
    x.lineWidth = k;
    x.stroke();
    x.restore();
  }
  for (let i = 0; i < 220; i++) {
    const px = r() * w;
    const py = r() * h;
    const rad = (4 + r() * 18) * k;
    x.fillStyle = rgba(r() < 0.5 ? '#6a7a3a' : '#4a5a30', 0.08 + r() * 0.12);
    x.beginPath();
    x.arc(px, py, rad, 0, 7);
    x.fill();
  }
  return c;
}

function makeLava(seed: number): HTMLCanvasElement {
  const r = rngOf(seed);
  const w = 800;
  const h = 800;
  const [c, x] = makeCanvas(w, h);
  x.fillStyle = '#ff7a16';
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 320; i++) {
    const px = r() * w;
    const py = r() * h;
    const rad = 10 + r() * 60;
    const gg = x.createRadialGradient(px, py, 0, px, py, rad);
    const hot = r() < 0.45;
    gg.addColorStop(0, hot ? 'rgba(255,236,140,0.6)' : 'rgba(140,26,4,0.5)');
    gg.addColorStop(1, hot ? 'rgba(255,236,140,0)' : 'rgba(140,26,4,0)');
    x.fillStyle = gg;
    x.beginPath();
    x.arc(px, py, rad, 0, 7);
    x.fill();
  }
  for (let i = 0; i < 110; i++) {
    const cx = r() * w;
    const cy = r() * h;
    const rad = 10 + r() * 30;
    const pts: P2[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 6.283 + r() * 0.6;
      pts.push([cx + Math.cos(a) * rad * (0.6 + r() * 0.6), cy + Math.sin(a) * rad * (0.5 + r() * 0.6)]);
    }
    x.beginPath();
    crPath(x, pts, true);
    x.fillStyle = rgba('#3a0e04', 0.6 + r() * 0.3);
    x.fill();
    x.strokeStyle = 'rgba(255,214,110,0.75)';
    x.lineWidth = 2.5;
    x.stroke();
  }
  return c;
}

interface HeadTex {
  stone: HTMLCanvasElement;
  beard: HTMLCanvasElement;
  lava: HTMLCanvasElement;
}
const tex: Partial<HeadTex> = {};
const BUILD: [keyof HeadTex, () => HTMLCanvasElement][] = [
  ['stone', () => makeStone(11, '#77726b', '#a49e94', '#3a3632')],
  ['beard', () => makeStone(23, '#6c6862', '#9a948a', '#34302c')],
  ['lava', () => makeLava(5)],
];
/** Build the next missing texture (one per call, for idle time); true once all are built. */
export function buildHeadTextures(): boolean {
  for (const [k, make] of BUILD)
    if (!tex[k]) {
      tex[k] = make();
      return false;
    }
  return true;
}
function headTextures(): HeadTex {
  while (!buildHeadTextures());
  return tex as HeadTex;
}

// ——— geometry ———
/** The upper lip line. */
export const YU = 118;
function ribbonPath(c: Ctx, pts: P2[], wf: (f: number) => number): void {
  const L: P2[] = [];
  const R: P2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const d = Math.hypot(nx, ny) || 1;
    nx /= d;
    ny /= d;
    const w = wf(i / (pts.length - 1)) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  c.beginPath();
  crPath(c, L.concat(R.reverse()), true);
}
function smoothLine(pts: P2[], n = 6): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (j: 0 | 1) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function silhouette(J: number, k: number, pf: number): P2[] {
  return mirrorClosed([
    [0, -386], [130, -374], [228, -334], [288, -266], [316, -186], [322, -104],
    [336 + pf * 8, -26], [330 + pf * 12, 46], [310 - 34 * k + pf * 18, 112], [290 - 42 * k + pf * 12, 164],
    [270 - 22 * k, 224 + J], [236, 290 + J], [180, 342 + J], [100, 376 + J], [0, 388 + J],
  ]);
}
function beardPts(J: number, k: number): P2[] {
  return mirrorClosed([
    [0, YU + 44 + J], [70, YU + 38 + J], [150, YU + 56 + J], [230, 170 + J * 0.97], [292 - 30 * k, 196 + J * 0.96],
    [298 - 24 * k, 270 + J], [272, 352 + J], [226, 430 + J], [170, 492 + J], [104, 536 + J], [0, 560 + J],
  ]);
}
export interface Mouth {
  J: number;
  mw: number;
  top: number;
  bot: number;
  cy: number;
}
/** The mouth for an opening (0…1), a suck (cheeks in, lips pursed) and a snarl. J is how far the lower face drops. */
export function mouthGeom(o: number, suck: number, snarl: number): Mouth {
  const J = 170 * o;
  const mw = 126 - 32 * suck + 6 * snarl;
  const k3 = Math.min(1, o * 3);
  return { J, mw, top: YU - (6 + 12 * snarl + 6 * suck) * k3, bot: YU + J + 12 * k3, cy: YU + 0.32 * J };
}
function mouthPath(c: Ctx, m: Mouth): void {
  c.beginPath();
  c.moveTo(-m.mw, m.cy);
  c.bezierCurveTo(-m.mw * 0.86, m.top - 4, -m.mw * 0.4, m.top, 0, m.top);
  c.bezierCurveTo(m.mw * 0.4, m.top, m.mw * 0.86, m.top - 4, m.mw, m.cy);
  c.bezierCurveTo(m.mw * 1.02, m.bot - (m.bot - m.cy) * 0.1, m.mw * 0.6, m.bot + 4, 0, m.bot);
  c.bezierCurveTo(-m.mw * 0.6, m.bot + 4, -m.mw * 1.02, m.bot - (m.bot - m.cy) * 0.1, -m.mw, m.cy);
  c.closePath();
}
/** Magma slashes (lens shaped, like the gashes on Kronos's foot); `lo` ones ride the lower face. */
const CRACKS: { p: P2[]; lo: boolean; w: number; s: P2[] }[] = [
  { p: [[-78, -204], [-56, -176], [-74, -150], [-46, -120]], lo: false, w: 20 },
  { p: [[-280, -52], [-240, 2], [-252, 52], [-214, 118]], lo: false, w: 26 },
  { p: [[206, -222], [246, -176], [234, -132], [270, -94]], lo: false, w: 22 },
  { p: [[150, 6], [184, 44], [170, 88]], lo: false, w: 16 },
  { p: [[-130, -350], [-100, -306], [-118, -270]], lo: false, w: 14 },
  { p: [[52, -358], [74, -320], [58, -286]], lo: false, w: 12 },
  { p: [[-96, 300], [-62, 356], [-84, 410], [-50, 470]], lo: true, w: 20 },
  { p: [[196, 250], [226, 296], [208, 340]], lo: true, w: 14 },
].map((cr) => ({ ...(cr as { p: P2[]; lo: boolean; w: number }), s: smoothLine(cr.p as P2[], 6) }));

function earsPath(c: Ctx): void {
  for (const s of [-1, 1]) {
    const E: P2[] = [[s * 312, -92], [s * 352, -100], [s * 372, -64], [s * 366, -8], [s * 344, 36], [s * 318, 40]];
    c.moveTo(E[0][0], E[0][1]);
    crPath(c, E, true, false);
  }
}
function curl(c: Ctx, x: number, y: number, r: number, a = 1): void {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, 2, x, y, r);
  g.addColorStop(0, `rgba(190,184,174,${0.95 * a})`);
  g.addColorStop(0.6, `rgba(118,112,104,${0.95 * a})`);
  g.addColorStop(1, `rgba(58,52,48,${0.98 * a})`);
  c.beginPath();
  c.arc(x, y, r, 0, 7);
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 4.5;
  c.strokeStyle = OL;
  c.stroke();
  c.beginPath();
  for (let k = 0; k <= 26; k++) {
    const f = k / 26;
    const ang = f * 9.5;
    const rr = r * 0.78 * (1 - f * 0.85);
    const xx = x + Math.cos(ang) * rr;
    const yy = y + Math.sin(ang) * rr;
    if (k) c.lineTo(xx, yy);
    else c.moveTo(xx, yy);
  }
  c.lineWidth = 3.4;
  c.strokeStyle = 'rgba(26,14,10,0.85)';
  c.stroke();
}

/** Everything that moves on the head, frame to frame. */
export interface HeadState {
  x: number;
  y: number;
  S: number;
  rot: number;
  /** Mouth open 0…1 (the lower face stretches down). */
  open: number;
  /** Inhaling 0…1: cheeks hollow, lips purse, the throat glows, light runs along the cracks. */
  suck: number;
  /** Cheeks puffed (drawing breath, chewing). */
  puff: number;
  /** Eye glow (0 dead, ~1 normal, more is hotter). */
  glow: number;
  snarl: number;
  /** Crack heat 0…1. */
  crack: number;
  /** A hit's white flash 0…1. */
  flash: number;
  /** Dazed: heavy lids. */
  daze: number;
  /** Where the pit's surface is under him (world y): the underlight comes from there. */
  ridgeY: number;
  /** Seconds (drives the swirl and the light running along the cracks). */
  t: number;
  /** Pit light from below 0…1+. */
  under: number;
  /** Lava age in seconds (negative: none yet), see drawLava. */
  lavaT?: number;
  /** Paint into the mouth (behind the teeth), in head-local units. */
  inMouth?: (c: Ctx, m: Mouth) => void;
}

/** Paint the head. The context's transform is world space (or anything the caller likes): the head goes at
 *  (H.x, H.y), scaled by H.S, turned by H.rot. Returns the mouth it drew. */
export function drawHead(c: Ctx, H: HeadState): Mouth {
  const T = headTextures();
  const m = mouthGeom(H.open, H.suck, H.snarl);
  const J = m.J;
  const sil = silhouette(J, H.suck, H.puff);
  const bpts = beardPts(J, H.suck);
  const S = H.S;
  c.save();
  c.translate(H.x, H.y);
  c.rotate(H.rot);
  c.scale(S, S);
  const OLW = Math.max(5.5, (7 / S) * Math.min(1.5, S));
  const silP = () => {
    c.beginPath();
    crPath(c, sil, true);
  };
  const beardP = () => {
    c.beginPath();
    crPath(c, bpts, true);
  };
  const unionP = () => {
    c.beginPath();
    crPath(c, sil, true);
    crPath(c, bpts, true);
    earsPath(c);
  };
  const ridgeL = (H.ridgeY - H.y) / S;
  const stone = (dy: number, img = T.stone) => c.drawImage(img, TEX_X0, TEX_Y0 + dy, TEX_W, TEX_H);
  let g: CanvasGradient;
  c.lineJoin = 'round';

  // ears (behind the face)
  c.beginPath();
  earsPath(c);
  c.save();
  c.clip();
  stone(0);
  g = c.createLinearGradient(300, 0, 372, 0);
  g.addColorStop(0, 'rgba(10,6,6,0.55)');
  g.addColorStop(1, 'rgba(10,6,6,0.1)');
  c.fillStyle = g;
  c.fillRect(280, -120, 100, 200);
  g = c.createLinearGradient(-372, 0, -300, 0);
  g.addColorStop(0, 'rgba(10,6,6,0.2)');
  g.addColorStop(1, 'rgba(10,6,6,0.55)');
  c.fillStyle = g;
  c.fillRect(-380, -120, 100, 200);
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 330, -60);
    c.quadraticCurveTo(s * 362, -40, s * 350, 0);
    c.quadraticCurveTo(s * 340, 20, s * 330, 24);
    c.strokeStyle = 'rgba(16,10,8,0.7)';
    c.lineWidth = 7;
    c.stroke();
  }
  c.restore();
  c.beginPath();
  earsPath(c);
  c.lineWidth = OLW;
  c.strokeStyle = OL;
  c.stroke();

  // crown spikes
  const bandTop = (x: number) => -236 - 58 * (1 - (x / 300) ** 2);
  for (const [sx, sh, broken] of [[-206, 96, 0], [-104, 132, 1], [0, 168, 0], [104, 128, 0.7], [206, 92, 1]]) {
    const by = bandTop(sx) + 12;
    c.beginPath();
    c.moveTo(sx - 30, by);
    if (broken > 0.5) {
      c.lineTo(sx - 13, by - sh * 0.9);
      c.lineTo(sx - 2, by - sh * 0.72);
      c.lineTo(sx + 9, by - sh * 0.86);
      c.lineTo(sx + 30, by);
    } else {
      c.quadraticCurveTo(sx - 8, by - sh * 0.5, sx, by - sh);
      c.quadraticCurveTo(sx + 8, by - sh * 0.5, sx + 30, by);
    }
    c.closePath();
    g = c.createLinearGradient(sx - 30, 0, sx + 30, 0);
    g.addColorStop(0, '#5a3a10');
    g.addColorStop(0.3, '#f4cc66');
    g.addColorStop(0.5, '#c9873a');
    g.addColorStop(1, '#3a2408');
    c.fillStyle = g;
    c.fill();
    c.lineWidth = OLW;
    c.strokeStyle = OL;
    c.stroke();
  }

  // the stone of the face: the upper face, then the lower face dropped by J
  const split = YU + J * 0.5;
  c.save();
  silP();
  c.clip();
  c.save();
  c.beginPath();
  c.rect(-420, -620, 840, split + 620);
  c.clip();
  stone(0);
  c.restore();
  c.save();
  c.beginPath();
  c.rect(-420, split, 840, 1400);
  c.clip();
  stone(J);
  c.restore();
  // volume: key light from the upper left, the right side in shadow, the dome falling away at the top
  g = c.createRadialGradient(-170, -220, 20, -80, -60, 560);
  g.addColorStop(0, 'rgba(255,246,230,0.16)');
  g.addColorStop(0.5, 'rgba(255,246,230,0.02)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(-420, -620, 840, 1400);
  g = c.createLinearGradient(-340, 0, 340, 0);
  g.addColorStop(0, 'rgba(8,4,4,0.18)');
  g.addColorStop(0.35, 'rgba(8,4,4,0)');
  g.addColorStop(0.62, 'rgba(8,4,4,0.12)');
  g.addColorStop(1, 'rgba(8,4,4,0.58)');
  c.fillStyle = g;
  c.fillRect(-420, -620, 840, 1400);
  g = c.createLinearGradient(0, -400, 0, -200);
  g.addColorStop(0, 'rgba(8,4,4,0.5)');
  g.addColorStop(1, 'rgba(8,4,4,0)');
  c.fillStyle = g;
  c.fillRect(-420, -420, 840, 230);
  // hair: rows of carved curls on the crown of the head
  c.save();
  c.beginPath();
  c.rect(-420, -620, 840, 340);
  c.clip();
  for (let row = 0; row < 3; row++)
    for (let i = -6; i <= 6; i++) {
      const cxp = i * 54 + (row % 2) * 27;
      curl(c, cxp, -364 + row * 34 + (cxp / 300) ** 2 * 120, 25, 0.9);
    }
  c.restore();
  // deep sockets under the brow
  for (const s of [-1, 1]) {
    g = c.createRadialGradient(s * 124, -66, 10, s * 124, -60, 140);
    g.addColorStop(0, 'rgba(12,6,4,0.92)');
    g.addColorStop(0.55, 'rgba(12,6,4,0.55)');
    g.addColorStop(1, 'rgba(12,6,4,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(s * 124, -60, 140, 84, 0, 0, 7);
    c.fill();
  }
  // cheekbones catch the light; the hollows under them pull in as he inhales
  for (const s of [-1, 1]) {
    g = c.createRadialGradient(s * 214, -10, 4, s * 214, -10, 96);
    g.addColorStop(0, `rgba(255,244,226,${0.13 + 0.14 * H.suck})`);
    g.addColorStop(1, 'rgba(255,244,226,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(s * 214, -10, 104, 58, s * -0.2, 0, 7);
    c.fill();
    const hk = H.suck * 0.9 - H.puff * 0.4;
    if (hk > 0.01) {
      const yy = 100 + J * 0.25;
      g = c.createRadialGradient(s * 236, yy, 6, s * 230, yy, 130);
      g.addColorStop(0, `rgba(10,4,2,${0.85 * hk})`);
      g.addColorStop(0.55, `rgba(10,4,2,${0.42 * hk})`);
      g.addColorStop(1, 'rgba(10,4,2,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(s * 230, yy, 100, 126 + J * 0.2, 0, 0, 7);
      c.fill();
      c.beginPath();
      c.moveTo(s * 160, 18);
      c.quadraticCurveTo(s * (256 - 30 * H.suck), 56, s * (270 - 36 * H.suck), 150 + J * 0.4);
      c.strokeStyle = `rgba(14,6,4,${0.7 * hk})`;
      c.lineWidth = 7;
      c.stroke();
      c.save();
      c.translate(-s * 6, -6);
      c.strokeStyle = `rgba(255,240,220,${0.2 * hk})`;
      c.lineWidth = 3;
      c.stroke();
      c.restore();
    }
    if (H.puff > 0.01) {
      g = c.createRadialGradient(s * 226, 66, 4, s * 226, 66, 110);
      g.addColorStop(0, `rgba(255,236,214,${0.2 * H.puff})`);
      g.addColorStop(1, 'rgba(255,236,214,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(s * 226, 66, 110, 92, 0, 0, 7);
      c.fill();
    }
  }
  // furrowed brow
  for (const [y0, w0, a] of [[-186, 80, 0.6], [-166, 54, 0.5]]) {
    c.beginPath();
    c.moveTo(-w0, y0 + 12);
    c.quadraticCurveTo(0, y0 - 14, w0, y0 + 12);
    c.strokeStyle = `rgba(14,8,6,${a})`;
    c.lineWidth = 6;
    c.stroke();
    c.save();
    c.translate(0, 4);
    c.strokeStyle = 'rgba(255,240,220,0.12)';
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 18, -150);
    c.quadraticCurveTo(s * 30, -126, s * 16, -104);
    c.strokeStyle = 'rgba(14,8,6,0.55)';
    c.lineWidth = 6;
    c.stroke();
  }
  // folds from nose to mouth (they also hide the seam where the lower face drops)
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 70, 40);
    c.bezierCurveTo(s * 140, 66, s * (160 + 10 * H.suck), YU + 6, s * (m.mw + 40), split + 10);
    c.strokeStyle = 'rgba(14,8,6,0.65)';
    c.lineWidth = 9;
    c.stroke();
    c.save();
    c.translate(-s * 6, -5);
    c.strokeStyle = 'rgba(255,240,220,0.16)';
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }
  // inner edge darkening, so the mass reads round
  silP();
  c.lineWidth = 80;
  c.strokeStyle = 'rgba(8,4,4,0.22)';
  c.stroke();
  silP();
  c.lineWidth = 30;
  c.strokeStyle = 'rgba(8,4,4,0.22)';
  c.stroke();
  c.restore();

  silP();
  c.lineWidth = OLW;
  c.strokeStyle = OL;
  c.stroke();

  // eyes
  const eg = H.glow;
  for (const s of [-1, 1]) {
    const lid = 1 - 0.62 * H.daze;
    c.save();
    c.translate(s * 124, -58);
    c.beginPath();
    c.moveTo(-s * 66, 10);
    c.quadraticCurveTo(-s * 6, -34 * lid + 6, s * 68, -14);
    c.quadraticCurveTo(s * 12, 28 * lid, -s * 66, 10);
    c.closePath();
    c.fillStyle = '#120604';
    c.fill();
    g = c.createRadialGradient(s * 4, -1, 1, 0, 0, 74);
    const hot = sat(eg - 0.3);
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(0.1 + 0.16 * hot, '#ffe07a');
    g.addColorStop(0.36 + 0.18 * hot, '#ff9a22');
    g.addColorStop(0.78, '#d63a08');
    g.addColorStop(1, '#6a1404');
    c.globalAlpha = sat(eg * 1.2);
    c.fillStyle = g;
    c.fill();
    c.globalAlpha = 1;
    c.lineWidth = 6;
    c.strokeStyle = OL;
    c.stroke();
    c.beginPath();
    c.moveTo(-s * 74, 6);
    c.quadraticCurveTo(-s * 6, -38 * lid + 4, s * 76, -18);
    c.lineWidth = 13;
    c.strokeStyle = '#140a06';
    c.stroke();
    c.restore();
  }
  // brow ridge (overhangs the eyes)
  for (const s of [-1, 1]) {
    const B: P2[] = [[s * 6, -118], [s * 84, -156], [s * 198, -172], [s * 298, -152], [s * 306, -118], [s * 210, -128], [s * 112, -106], [s * 30, -84]];
    c.beginPath();
    crPath(c, B, true);
    c.save();
    c.clip();
    stone(0);
    g = c.createLinearGradient(0, -176, 0, -84);
    g.addColorStop(0, 'rgba(255,244,226,0.28)');
    g.addColorStop(0.45, 'rgba(255,244,226,0.04)');
    g.addColorStop(1, 'rgba(10,6,4,0.62)');
    c.fillStyle = g;
    c.fillRect(-330, -190, 660, 120);
    if (s > 0) {
      c.fillStyle = 'rgba(8,4,4,0.2)';
      c.fillRect(0, -190, 330, 120);
    }
    c.restore();
    c.lineWidth = 6.5;
    c.strokeStyle = OL;
    c.stroke();
  }
  // nose
  {
    const N: P2[] = [[0, -108], [28, -96], [38, -20], [70, 30], [62, 60], [30, 58], [0, 68], [-30, 58], [-62, 60], [-70, 30], [-38, -20], [-28, -96]];
    c.beginPath();
    crPath(c, N, true);
    c.save();
    c.clip();
    stone(0);
    g = c.createLinearGradient(-70, 0, 70, 0);
    g.addColorStop(0, 'rgba(255,246,230,0.26)');
    g.addColorStop(0.42, 'rgba(255,246,230,0.04)');
    g.addColorStop(0.55, 'rgba(10,6,4,0.25)');
    g.addColorStop(1, 'rgba(10,6,4,0.6)');
    c.fillStyle = g;
    c.fillRect(-80, -120, 160, 200);
    g = c.createLinearGradient(0, 10, 0, 70);
    g.addColorStop(0, 'rgba(10,6,4,0)');
    g.addColorStop(1, 'rgba(10,6,4,0.5)');
    c.fillStyle = g;
    c.fillRect(-80, 0, 160, 80);
    c.restore();
    c.lineWidth = 6.5;
    c.strokeStyle = OL;
    c.stroke();
    c.beginPath();
    c.moveTo(-12, -88);
    c.quadraticCurveTo(-18, -24, -34, 22);
    c.strokeStyle = 'rgba(255,248,235,0.3)';
    c.lineWidth = 6;
    c.stroke();
    const nf = 1 + 0.5 * H.suck + 0.3 * H.puff;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.ellipse(s * 28, 50, 16 * nf, 8.5 * nf, s * 0.3, 0, 7);
      c.fillStyle = '#0e0604';
      c.fill();
    }
  }

  // the mouth
  if (H.open > 0.004) {
    mouthPath(c, m);
    c.save();
    c.clip();
    const thr = 0.35 + 0.65 * H.suck;
    g = c.createRadialGradient(0, m.cy + J * 0.25, 4, 0, m.cy + J * 0.2, Math.max(m.mw, J) * 1.1);
    g.addColorStop(0, `rgba(255,${Math.round(150 + 80 * thr)},70,1)`);
    g.addColorStop(0.2, '#e2440c');
    g.addColorStop(0.5, '#5a1006');
    g.addColorStop(1, '#120404');
    c.fillStyle = g;
    c.fillRect(-m.mw - 10, m.top - 30, m.mw * 2 + 20, J + 80);
    if (H.suck > 0.02) {
      // the throat's swirl, pulling in
      c.globalCompositeOperation = 'lighter';
      const cy0 = m.cy + J * 0.22;
      for (let a = 0; a < 5; a++) {
        c.beginPath();
        for (let k = 0; k <= 30; k++) {
          const f = k / 30;
          const rr = (1 - f) * Math.max(m.mw, J * 0.6) * 1.05;
          const ang = a * ((Math.PI * 2) / 5) + f * 3.2 + H.t * 9;
          const xx = Math.cos(ang) * rr;
          const yy = cy0 + Math.sin(ang) * rr * 0.62;
          if (k) c.lineTo(xx, yy);
          else c.moveTo(xx, yy);
        }
        c.strokeStyle = `rgba(255,140,50,${0.22 * H.suck})`;
        c.lineWidth = 7;
        c.stroke();
      }
      c.globalCompositeOperation = 'source-over';
    }
    H.inMouth?.(c, m);
    const nT = 7;
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < nT; i++) {
        const f = ((i + 0.5) / nT) * 2 - 1;
        const x0 = f * m.mw * 0.86;
        const tw = ((m.mw * 2 * 0.86) / nT) * 0.92;
        const edge = row === 0 ? lerp(m.top, m.cy, Math.abs(f) ** 2) : lerp(m.bot, m.cy, Math.abs(f) ** 2);
        const th = (row === 0 ? 34 : 26) * (1 - 0.35 * Math.abs(f)) * (i === 1 || i === 5 ? 1.25 : 1);
        c.beginPath();
        if (row === 0) {
          c.moveTo(x0 - tw / 2, edge - 12);
          c.lineTo(x0 - tw / 2, edge + th - 8);
          c.quadraticCurveTo(x0, edge + th + 4, x0 + tw / 2, edge + th - 8);
          c.lineTo(x0 + tw / 2, edge - 12);
        } else {
          c.moveTo(x0 - tw / 2, edge + 12);
          c.lineTo(x0 - tw / 2, edge - th + 8);
          c.quadraticCurveTo(x0, edge - th - 4, x0 + tw / 2, edge - th + 8);
          c.lineTo(x0 + tw / 2, edge + 12);
        }
        c.closePath();
        const tg = c.createLinearGradient(x0 - tw / 2, 0, x0 + tw / 2, 0);
        tg.addColorStop(0, '#e8dcbc');
        tg.addColorStop(0.6, '#c4b690');
        tg.addColorStop(1, '#7e7052');
        c.fillStyle = tg;
        c.fill();
        c.lineWidth = 4;
        c.strokeStyle = OL;
        c.stroke();
        c.globalAlpha = 0.35 * thr;
        c.fillStyle = '#ff7a2a';
        c.fill();
        c.globalAlpha = 1;
      }
    c.restore();
    mouthPath(c, m);
    c.lineWidth = 9;
    c.strokeStyle = OL;
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(-m.mw, YU + 4);
    c.quadraticCurveTo(0, YU - 8, m.mw, YU + 4);
    c.lineWidth = 9;
    c.strokeStyle = OL;
    c.stroke();
  }

  // the beard: carved locks that end in curls, hanging from the jaw
  {
    beardP();
    c.save();
    c.clip();
    stone(J, T.beard);
    for (let i = -7; i <= 7; i++) {
      const x0 = i * 40;
      c.beginPath();
      for (let y = YU + 40; y <= 580; y += 20) {
        const f = (y - YU) / 460;
        const px = x0 * (1 - 0.45 * f) + Math.sin(y * 0.03 + i) * 12;
        if (y === YU + 40) c.moveTo(px, y + J);
        else c.lineTo(px, y + J);
      }
      c.strokeStyle = 'rgba(14,8,6,0.6)';
      c.lineWidth = 6;
      c.stroke();
      c.save();
      c.translate(7, 0);
      c.strokeStyle = 'rgba(255,240,220,0.13)';
      c.lineWidth = 4;
      c.stroke();
      c.restore();
    }
    const curls: P2[] = [[-232, 400], [-176, 462], [-112, 506], [-40, 528], [40, 528], [112, 506], [176, 462], [232, 400], [-200, 340], [-130, 420], [-60, 470], [10, 486], [80, 470], [150, 420], [214, 340]];
    for (const [cx0, cy0] of curls) curl(c, cx0, cy0 + J, 31, 1);
    g = c.createLinearGradient(-300, 0, 300, 0);
    g.addColorStop(0, 'rgba(255,246,230,0.1)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(8,4,4,0.5)');
    c.fillStyle = g;
    c.fillRect(-320, YU + J, 640, 520);
    g = c.createLinearGradient(0, YU + J + 30, 0, YU + J + 130);
    g.addColorStop(0, 'rgba(8,4,4,0.62)');
    g.addColorStop(1, 'rgba(8,4,4,0)');
    c.fillStyle = g;
    c.fillRect(-320, YU + J, 640, 140);
    beardP();
    c.lineWidth = 50;
    c.strokeStyle = 'rgba(8,4,4,0.2)';
    c.stroke();
    c.restore();
    beardP();
    c.lineWidth = OLW;
    c.strokeStyle = OL;
    c.stroke();
  }
  // moustache (it flares as he inhales)
  {
    const fl = H.suck * 16 + H.snarl * 8;
    const Rm: P2[] = [[0, 62], [64, 54], [140, 82 - fl * 0.3], [204 + fl, 136 - fl * 0.6], [222 + fl, 200 - fl], [196 + fl, 194 - fl], [152 + fl * 0.5, 140], [88, 114], [0, 106]];
    const Mpts = Rm.concat(Rm.slice(1, -1).reverse().map(([x, y]) => [-x, y] as P2));
    c.beginPath();
    crPath(c, Mpts, true);
    c.save();
    c.clip();
    stone(0, T.beard);
    for (let i = 0; i < 8; i++)
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(s * (8 + i * 8), 66 + i * 2);
        c.quadraticCurveTo(s * (92 + i * 10), 76 + i * 6, s * (156 + i * 8 + fl), 132 + i * 8 - fl * 0.5);
        c.strokeStyle = 'rgba(14,8,6,0.5)';
        c.lineWidth = 5;
        c.stroke();
      }
    g = c.createLinearGradient(0, 54, 0, 130);
    g.addColorStop(0, 'rgba(255,246,230,0.2)');
    g.addColorStop(1, 'rgba(8,4,4,0.45)');
    c.fillStyle = g;
    c.fillRect(-270, 50, 540, 170);
    g = c.createLinearGradient(-240, 0, 240, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(8,4,4,0.35)');
    c.fillStyle = g;
    c.fillRect(-270, 50, 540, 170);
    c.restore();
    c.beginPath();
    crPath(c, Mpts, true);
    c.lineWidth = 6.5;
    c.strokeStyle = OL;
    c.stroke();
  }

  // crown band (a meander in it, a chunk broken out)
  {
    const top = bandTop;
    const bot = (x: number) => -180 - 56 * (1 - (x / 306) ** 2);
    c.save();
    silP();
    c.clip();
    c.beginPath();
    for (let x = -330; x <= 330; x += 15) c.lineTo(x, top(x));
    for (let x = 330; x >= -330; x -= 15) c.lineTo(x, bot(x));
    c.closePath();
    g = c.createLinearGradient(0, -300, 0, -176);
    g.addColorStop(0, '#4a2a08');
    g.addColorStop(0.22, '#d89c34');
    g.addColorStop(0.42, '#ffe08a');
    g.addColorStop(0.66, '#b87a2a');
    g.addColorStop(1, '#3a2006');
    c.fillStyle = g;
    c.fill();
    g = c.createLinearGradient(-320, 0, 320, 0);
    g.addColorStop(0, 'rgba(255,240,200,0.06)');
    g.addColorStop(0.6, 'rgba(8,4,4,0.1)');
    g.addColorStop(1, 'rgba(8,4,4,0.55)');
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 6;
    c.strokeStyle = OL;
    c.stroke();
    c.strokeStyle = '#3a2006';
    c.lineWidth = 4.5;
    c.lineCap = 'square';
    for (let x = -300; x < 300; x += 30) {
      const y0 = (top(x) + bot(x)) / 2;
      const ang = Math.atan2((top(x + 1) + bot(x + 1)) / 2 - y0, 1);
      c.save();
      c.translate(x + 15, y0);
      c.rotate(ang);
      c.beginPath();
      c.moveTo(-15, 10);
      c.lineTo(-15, -10);
      c.lineTo(9, -10);
      c.lineTo(9, 5);
      c.lineTo(-4, 5);
      c.lineTo(-4, -2);
      c.stroke();
      c.restore();
    }
    c.lineCap = 'butt';
    for (const x of [-200, 0, 200]) {
      const y0 = (top(x) + bot(x)) / 2;
      c.beginPath();
      c.arc(x, y0, 7, 0, 7);
      c.fillStyle = '#ffe9a0';
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = OL;
      c.stroke();
    }
    c.beginPath();
    c.moveTo(118, top(118) - 2);
    c.lineTo(132, top(132) + 22);
    c.lineTo(150, top(150) + 12);
    c.lineTo(166, top(166) + 30);
    c.lineTo(178, top(178) - 2);
    c.closePath();
    c.fillStyle = '#3a2e28';
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = OL;
    c.stroke();
    c.restore();
  }

  // magma slashes, pulsing with the breath (light runs along them as he inhales)
  const pulse = H.crack;
  const prof = (f: number) => Math.pow(Math.sin(Math.PI * clamp(f, 0.02, 0.98)), 0.75);
  for (const cr of CRACKS) {
    const pts = cr.s.map(([x, y]) => [x, y + (cr.lo ? J : 0)] as P2);
    ribbonPath(c, pts, (f) => cr.w * prof(f) + 9);
    c.fillStyle = OL;
    c.fill();
    ribbonPath(c, pts, (f) => cr.w * prof(f));
    c.fillStyle = rampColor([[0, '#6a1204'], [0.5, '#f05a0e'], [1, '#ff9a2a']], sat(pulse));
    c.fill();
    ribbonPath(c, pts, (f) => cr.w * 0.42 * prof(f));
    c.fillStyle = rampColor([[0, '#c03a0a'], [0.5, '#ffcc50'], [1, '#fff8d0']], sat(pulse));
    c.fill();
    if (H.suck > 0.05) {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.setLineDash([12, 30]);
      c.lineDashOffset = -H.t * 150;
      c.lineCap = 'round';
      c.strokeStyle = `rgba(255,252,220,${0.85 * H.suck})`;
      c.lineWidth = cr.w * 0.3;
      c.stroke();
      c.setLineDash([]);
      c.lineCap = 'butt';
    }
  }

  // lava coating him as he rises
  if (H.lavaT !== undefined && H.lavaT >= 0) {
    c.save();
    unionP();
    c.clip();
    drawLava(c, J, H.lavaT, T.lava);
    c.restore();
  }

  // light: the pit from below, the rim, the eyes, the throat, the cracks
  c.save();
  unionP();
  c.clip();
  c.globalCompositeOperation = 'lighter';
  const ul = H.under;
  g = c.createLinearGradient(0, ridgeL, 0, ridgeL - 240);
  g.addColorStop(0, `rgba(255,104,26,${0.5 * ul})`);
  g.addColorStop(0.45, `rgba(255,84,18,${0.14 * ul})`);
  g.addColorStop(1, 'rgba(255,84,18,0)');
  c.fillStyle = g;
  c.fillRect(-420, ridgeL - 250, 840, 260);
  silP();
  c.lineWidth = 22;
  c.strokeStyle = 'rgba(255,140,50,0.22)';
  c.stroke();
  silP();
  c.lineWidth = 8;
  c.strokeStyle = 'rgba(255,170,80,0.28)';
  c.stroke();
  for (const s of [-1, 1]) {
    g = c.createRadialGradient(s * 124, -58, 10, s * 124, -58, 160);
    g.addColorStop(0, `rgba(255,140,40,${0.3 * eg})`);
    g.addColorStop(1, 'rgba(255,140,40,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(s * 124, -58, 160, 0, 7);
    c.fill();
  }
  if (H.open > 0.05) {
    g = c.createRadialGradient(0, m.cy, 10, 0, m.cy, 220);
    g.addColorStop(0, `rgba(255,120,40,${0.22 * H.suck + 0.06})`);
    g.addColorStop(1, 'rgba(255,120,40,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, m.cy, 220, 0, 7);
    c.fill();
  }
  for (const cr of CRACKS) {
    const [x, y] = cr.p[Math.floor(cr.p.length / 2)];
    const yy = y + (cr.lo ? J : 0);
    g = c.createRadialGradient(x, yy, 2, x, yy, 90);
    g.addColorStop(0, `rgba(255,120,30,${0.28 * pulse})`);
    g.addColorStop(1, 'rgba(255,100,20,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, yy, 90, 0, 7);
    c.fill();
  }
  if (H.flash > 0.001) {
    c.fillStyle = `rgba(255,255,255,${0.45 * H.flash})`;
    c.fillRect(-420, -620, 840, 1400);
  }
  c.globalCompositeOperation = 'source-over';
  c.restore();

  // bloom off the eyes and cracks
  c.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) {
    const r0 = 110 + 80 * eg;
    g = c.createRadialGradient(s * 124, -58, 4, s * 124, -58, r0);
    g.addColorStop(0, `rgba(255,206,100,${0.6 * eg})`);
    g.addColorStop(0.3, `rgba(255,110,30,${0.26 * eg})`);
    g.addColorStop(1, 'rgba(255,80,20,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(s * 124, -58, r0, 0, 7);
    c.fill();
  }
  for (const cr of CRACKS) {
    const pts = cr.s.map(([x, y]) => [x, y + (cr.lo ? J : 0)] as P2);
    ribbonPath(c, pts, (f) => cr.w * 2.6 * Math.sin(Math.PI * clamp(f, 0.02, 0.98)) + 10);
    c.fillStyle = `rgba(255,110,30,${0.16 * pulse})`;
    c.fill();
  }
  c.globalCompositeOperation = 'source-over';
  c.restore();
  return m;
}

// ——— lava on the head ———
interface Stream {
  x0: number;
  y0: number;
  ts: number;
  v: number;
  w: number;
  ph: number;
  hold: number;
  stop: number;
}
/** The lava runs that stream down him as he rises (head units). */
export const STREAMS: Stream[] = (() => {
  const r = rngOf(99);
  return [-300, 300, -268, 268, -190, 176, -96, 70, -20, 128, -150, 236, 18].map((x0) => {
    const side = Math.abs(x0) > 250;
    const y0 = -386 * Math.sqrt(Math.max(0.05, 1 - (x0 / 340) ** 2)) - 6;
    return { x0, y0, ts: r() * 0.5 + (side ? 0 : 0.12), v: 340 + r() * 380, w: (side ? 30 : 18) + r() * 20, ph: r() * 6, hold: 0.5 + r() * 0.9, stop: side ? 700 : r() < 0.4 ? -40 + r() * 140 : 700 };
  });
})();
/** Where a stream's front is at lava age te (head units), or null if it isn't running. */
export function streamFront(s: Stream, te: number): number | null {
  const a = te - s.ts;
  if (a <= 0 || a > 2.6) return null;
  return Math.min(s.y0 + s.v * a + 300 * a * a, 380);
}
const dripAt = (x: number) => Math.max(0, Math.sin(x * 0.06 + 1.3)) ** 6 * 60 + Math.max(0, Math.sin(x * 0.11 + 4)) ** 8 * 40;
/** The sheet of lava draining off him (it slides down and thins), then the runs that stream on down. */
function drawLava(c: Ctx, J: number, te: number, lavaTex: HTMLCanvasElement): void {
  const drain = -480 + te * 760;
  const sheetA = 1 - ramp(te, 0.8, 1.6);
  if (sheetA > 0) {
    c.save();
    c.beginPath();
    c.moveTo(-440, drain);
    for (let x = -440; x <= 440; x += 10) c.lineTo(x, drain + Math.sin(x * 0.04 + te * 5) * 12 + dripAt(x));
    c.lineTo(440, 1300);
    c.lineTo(-440, 1300);
    c.closePath();
    c.clip();
    c.globalAlpha = 0.95 * sheetA;
    const off = (te * 520) % 800;
    for (let yy = -1600 + off; yy < 1300; yy += 800) {
      c.drawImage(lavaTex, -440, yy, 440, 800);
      c.drawImage(lavaTex, 0, yy, 440, 800);
    }
    c.globalAlpha = 1;
    const g = c.createLinearGradient(0, drain - 10, 0, drain + 90);
    g.addColorStop(0, `rgba(255,250,210,${0.95 * sheetA})`);
    g.addColorStop(1, 'rgba(255,200,80,0)');
    c.fillStyle = g;
    c.fillRect(-440, drain - 30, 880, 140);
    c.restore();
    // its crusted edge
    c.beginPath();
    for (let x = -440; x <= 440; x += 10) {
      const y = drain + Math.sin(x * 0.04 + te * 5) * 12 + dripAt(x);
      if (x === -440) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.strokeStyle = `rgba(70,14,4,${0.7 * sheetA})`;
    c.lineWidth = 7;
    c.stroke();
  }
  for (const s of STREAMS) {
    const a = te - s.ts;
    if (a <= 0) continue;
    const front = Math.min(s.y0 + s.v * a + 280 * a * a, s.stop + J, 620 + J);
    const tail = s.y0 + Math.max(0, a - s.hold) * s.v * 0.8;
    if (tail >= front - 6) continue;
    const heat = 1 - ramp(a, 0.4, 3.4);
    const fade = 1 - ramp(a, 2.8, 4.2);
    if (fade <= 0) continue;
    const pts: P2[] = [];
    for (let y = tail; y <= front; y += 14) pts.push([s.x0 * (1 - (0.06 * (y + 300)) / 700) + Math.sin(y * 0.02 + s.ph) * 12 + Math.sin(y * 0.061 + s.ph) * 5, y]);
    if (pts.length < 3) continue;
    const len = front - tail;
    const wf = (f: number) => s.w * (0.32 + 0.5 * f + 0.5 * Math.max(0, (f - 0.82) / 0.18) ** 0.5 * (1 - Math.max(0, (f - 0.96) / 0.04))) * Math.min(1, len / 120);
    c.globalAlpha = fade;
    ribbonPath(c, pts, (f) => wf(f) + 8);
    c.fillStyle = 'rgba(46,8,2,0.75)';
    c.fill();
    ribbonPath(c, pts, wf);
    c.fillStyle = rampColor([[0, '#4a1004'], [0.3, '#b8280a'], [0.65, '#ff6a14'], [1, '#ffa630']], heat);
    c.fill();
    ribbonPath(c, pts.map(([x, y]) => [x - s.w * 0.12, y] as P2), (f) => wf(f) * 0.38);
    c.fillStyle = rampColor([[0, '#7a1a06'], [0.4, '#ff8a1a'], [1, '#fff2b0']], heat);
    c.fill();
    c.globalCompositeOperation = 'lighter';
    ribbonPath(c, pts, (f) => wf(f) * 2.4 + 10);
    c.fillStyle = `rgba(255,110,30,${0.14 * heat})`;
    c.fill();
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
  }
}

/** Whether a head-local point is on the head (its face, ears or beard), roughly. */
export function onHead(lx: number, ly: number, J: number): boolean {
  if (ly < -400 || ly > 560 + J) return false;
  // the dome and face: an ellipse-ish outline (the crown spikes above it don't count)
  if (ly < 120) return Math.abs(lx) < 372 * Math.sqrt(Math.max(0, 1 - ((ly + 20) / 400) ** 4)) + 4;
  // the jaw and beard narrow towards the chin
  const f = (ly - 120) / (440 + J);
  return Math.abs(lx) < lerp(320, 110, f * f);
}

/** A still of the head for the phase card: mouth open on a breath, eyes hot, cracks glowing. */
export function headCard(): HTMLCanvasElement {
  const S = 0.6;
  const [c, g] = makeCanvas(Math.round(780 * S), Math.round(1180 * S));
  drawHead(g, { x: 390 * S, y: 486 * S, S, rot: 0, open: 0.62, suck: 0.8, puff: 0, glow: 1.25, snarl: 0, crack: 0.9, flash: 0, daze: 0, ridgeY: 1180 * S, t: 0.3, under: 0.6 });
  return c;
}
