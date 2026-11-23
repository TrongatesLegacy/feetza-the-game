// Procedural 1920x1080 scene backdrops (wall + table) for every location and boss arena.
// Everything is painted with Canvas 2D in the same bold cartoon style as the feet and pizzas.

import { legacySceneDef, onSceneRegistered, sceneDef } from './registry';
import { type Ctx, blob, ellipse, hashStr, makeCanvas, mix, rgba, rng, roundRect, shade } from './util';

export type LocationId = 'trattoria' | 'rooftop' | 'beach' | 'diner' | 'lodge' | 'space' | 'kitchen' | 'oldtown' | 'pier' | 'rink' | 'slopes' | 'cellar'
  // ——— Act 7 · Comics ———
  | 'metropizza'
  | 'doomlab'
  // ——— Act 8 · Norse ———
  | 'jotunheim'
  | 'bifrost'
  // ——— Act 9 · Greek myths ———
  | 'labyrinth'
  | 'tartarus'
  // Act 10 · Finale (src/content/art/scenes-act10.ts)
  | 'oven' | 'firstpizzeria'
  // ——— Nemesis stages (src/game/nemesis.ts; scenes in src/content/art/scenes-gotham.ts) ———
  | 'gotham'
  // King Leonidas's Hot Gates (src/content/art/scenes-leonidas.ts)
  | 'hotgates';
export type ArenaId = 'bigfoot' | 'ironheel' | 'clownking' | 'trex' | 'colossus' | 'phantomking' | 'cosmiccroc' | 'nonna' | 'gargoyle' | 'kraken' | 'rinkqueen' | 'yeti'
  // ——— Act 7 · Comics ———
  | 'doomstomp'
  | 'thanfoot'
  // ——— Act 8 · Norse (the two mini-bosses get arenas of their own too) ———
  | 'thrym'
  | 'surtr'
  | 'fenrir'
  | 'jormungandr'
  // ——— Act 9 · Greek myths (the mini-bosses get arenas of their own too) ———
  | 'minotaur'
  | 'medusa'
  | 'cerberus'
  | 'hades'
  // Act 10 · Finale
  | 'soleprop' | 'soleunbound'
  // ——— Nemesis stages: Batpeel's Gotham (the mini-boss gets an arena of its own too) ———
  | 'bunion'
  | 'jokester'
  // ——— Nemesis bosses: Kratos in Tartarus (src/content/art/scenes-kratos.ts) ———
  | 'titanking'
  | 'zeus'
  // ——— Nemesis bosses: the comic heroes' minis (src/content/art/scenes-comics.ts) ———
  | 'redsole'
  | 'venomnom'
  | 'cheetoe'
  // ——— Nemesis bosses: King Leonidas at the Hot Gates ———
  | 'immortalbrute'
  | 'xerxes';
export type BackdropId = LocationId | ArenaId;
export type AmbientKind =
  | 'dust'
  | 'fireflies'
  | 'sparkle'
  | 'neon'
  | 'snow'
  | 'stars'
  | 'fog'
  | 'sparks'
  | 'confetti'
  | 'embers'
  | 'torch'
  | 'wisps';

export interface GlowSpot {
  x: number;
  y: number;
  r: number;
  color: string;
  flicker: number; // 0..1 strength
}

export interface BackdropInfo {
  id: BackdropId;
  name: string;
  subtitle: string;
  ambient: AmbientKind[];
  glows: GlowSpot[];
  light: string;
  tableTint: string;
}

// ---------------------------------------------------------------------------------------------
// Layout constants

const W = 1920;
const H = 1080;
const TY = 760; // back edge of the table
const OL = '#2a1810';
const HY = 300; // horizon / vanishing point height
const VX = 960;
const FOC = 1210; // focal length (gives ~2:1 foreshortening at the pizza row)
const ZB = FOC / (TY - HY); // depth of the table's back edge (camera height = 1)

type R = () => number;
type Stop = [number, string];

const CHALK = '"Chalkduster", "Chalkboard SE", "Comic Sans MS", "Segoe Print", cursive';
const ROUND = '"Arial Rounded MT Bold", "Trebuchet MS", "Verdana", sans-serif';
const SCRIPT = '"Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive';
const SLAB = '"Rockwell", "Cooper Black", "Georgia", serif';
const BLOCK = '"Impact", "Haettenschweiler", "Arial Black", sans-serif';

// perspective helpers for the table plane
const yAt = (z: number): number => HY + FOC / z;
const xAt = (X: number, z: number): number => VX + (FOC * X) / z;
const zAt = (y: number): number => FOC / (y - HY);

function quad(ctx: Ctx, X0: number, X1: number, z0: number, z1: number): void {
  ctx.moveTo(xAt(X0, z0), yAt(z0));
  ctx.lineTo(xAt(X1, z0), yAt(z0));
  ctx.lineTo(xAt(X1, z1), yAt(z1));
  ctx.lineTo(xAt(X0, z1), yAt(z1));
  ctx.closePath();
}

/** Polygon through table-plane points (X, z). */
function planePoly(ctx: Ctx, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([X, z], i) => (i ? ctx.lineTo(xAt(X, z), yAt(z)) : ctx.moveTo(xAt(X, z), yAt(z))));
  ctx.closePath();
}

// ---------------------------------------------------------------------------------------------
// Generic painting helpers

let noiseTile: HTMLCanvasElement | null = null;
let speckTile: HTMLCanvasElement | null = null;

function noise(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const [c, ctx] = makeCanvas(256, 256);
  const img = ctx.createImageData(256, 256);
  const r = rng(7331);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

/** Black speckles with random alpha (for chalk erasure, wear, dirt). */
function speck(): HTMLCanvasElement {
  if (speckTile) return speckTile;
  const [c, ctx] = makeCanvas(256, 256);
  const img = ctx.createImageData(256, 256);
  const r = rng(9157);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r();
    img.data[i + 3] = v > 0.55 ? Math.round((v - 0.55) * 2.2 * 255) : 0;
  }
  ctx.putImageData(img, 0, 0);
  speckTile = c;
  return c;
}

function grainRect(ctx: Ctx, x: number, y: number, w: number, h: number, a: number, op: GlobalCompositeOperation = 'overlay'): void {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = ctx.createPattern(noise(), 'repeat')!;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

let cloudTile: HTMLCanvasElement | null = null;

/** Tileable fractal value noise (smooth), cached. */
function cloud(): HTMLCanvasElement {
  if (cloudTile) return cloudTile;
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  const r = rng(4242);
  const acc = new Float32Array(S * S);
  let amp = 1;
  let total = 0;
  for (const cells of [4, 8, 16, 32, 64]) {
    const grid = new Float32Array(cells * cells);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let y = 0; y < S; y++) {
      const gy = (y / S) * cells;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      const r0 = (y0 % cells) * cells;
      const r1 = ((y0 + 1) % cells) * cells;
      for (let x = 0; x < S; x++) {
        const gx = (x / S) * cells;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const c0 = x0 % cells;
        const c1 = (x0 + 1) % cells;
        const a = grid[r0 + c0] * (1 - sx) + grid[r0 + c1] * sx;
        const b = grid[r1 + c0] * (1 - sx) + grid[r1 + c1] * sx;
        acc[y * S + x] += amp * (a * (1 - sy) + b * sy);
      }
    }
    total += amp;
    amp *= 0.55;
  }
  for (let i = 0; i < S * S; i++) {
    const v = Math.max(0, Math.min(1, (acc[i] / total - 0.5) * 2.4 + 0.5)) * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  cloudTile = c;
  return c;
}

/** Large soft blotches for mottled stone / plaster / cloth. */
function mottle(ctx: Ctx, x: number, y: number, w: number, h: number, a: number, scale = 2, op: GlobalCompositeOperation = 'overlay'): void {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = op;
  const t = 256 * scale;
  for (let yy = y; yy < y + h; yy += t) for (let xx = x; xx < x + w; xx += t) ctx.drawImage(cloud(), xx, yy, t, t);
  ctx.restore();
}

function vgrad(ctx: Ctx, x: number, y: number, w: number, h: number, stops: Stop[]): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, a = 1, sy = 1): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  ctx.scale(1, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.3, rgba(color, a * 0.5));
  g.addColorStop(0.65, rgba(color, a * 0.14));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

function darkSpot(ctx: Ctx, x: number, y: number, rx: number, ry: number, a: number, color = '#000000'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** Soft additive light cone from a fixture down to the table. */
function cone(ctx: Ctx, x: number, y: number, w0: number, x1: number, y1: number, w1: number, color: string, a: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const f = 1 - k * 0.28;
    const g = ctx.createLinearGradient(0, y, 0, y1);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(1, rgba(color, a * 0.15));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - (w0 / 2) * f, y);
    ctx.lineTo(x + (w0 / 2) * f, y);
    ctx.lineTo(x1 + (w1 / 2) * f, y1);
    ctx.lineTo(x1 - (w1 / 2) * f, y1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function outline(ctx: Ctx, lw = 5, color = OL): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function fillOl(ctx: Ctx, fill: string | CanvasGradient | CanvasPattern, lw = 5): void {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) outline(ctx, lw);
}

function hgrad(ctx: Ctx, x0: number, x1: number, stops: Stop[]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function lgrad(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: Stop[]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Cylinder-ish horizontal shading for posts, pipes, poles. */
function cylH(ctx: Ctx, x: number, w: number, base: string): CanvasGradient {
  return hgrad(ctx, x, x + w, [
    [0, shade(base, -0.45)],
    [0.28, shade(base, 0.22)],
    [0.42, shade(base, 0.08)],
    [1, shade(base, -0.5)],
  ]);
}

function cylV(ctx: Ctx, y: number, h: number, base: string): CanvasGradient {
  return lgrad(ctx, 0, y, 0, y + h, [
    [0, shade(base, -0.4)],
    [0.3, shade(base, 0.25)],
    [0.45, shade(base, 0.08)],
    [1, shade(base, -0.5)],
  ]);
}

function grade(ctx: Ctx, desat: number, tint?: string, tintA = 0): void {
  ctx.save();
  if (desat > 0) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(128,128,128,${desat})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (tint && tintA > 0) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = tintA;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function vignette(ctx: Ctx, a: number, color = '#0a0604', top = 0.45): void {
  const g = ctx.createRadialGradient(VX, 600, 420, VX, 600, 1250);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.6, rgba(color, a * 0.45));
  g.addColorStop(1, rgba(color, a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // darker band under the HUD
  vgrad(ctx, 0, 0, W, 170, [
    [0, rgba(color, top)],
    [1, rgba(color, 0)],
  ]);
}

/** Shadow where wall meets table plus the table's back lip line. */
function contactShadow(ctx: Ctx, a = 0.55): void {
  vgrad(ctx, 0, TY - 70, W, 70, [
    [0, 'rgba(0,0,0,0)'],
    [1, `rgba(0,0,0,${a * 0.75})`],
  ]);
  vgrad(ctx, 0, TY, W, 60, [
    [0, `rgba(0,0,0,${a})`],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.fillStyle = rgba(OL, 0.85);
  ctx.fillRect(0, TY - 2, W, 4);
}

/** Warm/cool pool of light on the table plus darker corners. */
function tableLight(ctx: Ctx, color: string, a: number, dark = 0.4): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, H - TY);
  ctx.clip();
  const g = ctx.createRadialGradient(VX, 880, 100, VX, 880, 1150);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${dark})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, TY, W, H - TY);
  ctx.restore();
  if (a > 0) glow(ctx, VX, 880, 900, color, a, 0.28);
}

/** Vertical front face of the table (cloth drape / wooden lip). */
function frontFace(ctx: Ctx, y: number, paint: () => void, dark = 0.45, lip = true): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, W, H - y);
  ctx.clip();
  paint();
  vgrad(ctx, 0, y, W, H - y, [
    [0, `rgba(0,0,0,${dark * 0.4})`],
    [1, `rgba(0,0,0,${dark})`],
  ]);
  ctx.restore();
  if (lip) {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(0, y - 3, W, 3);
    ctx.fillStyle = rgba(OL, 0.9);
    ctx.fillRect(0, y, W, 4);
  }
}

function clipRect(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
}

function zFront(frontY: number): number {
  return zAt(frontY + 4);
}

/** Checkered cloth on the table plane. */
function checkerTop(ctx: Ctx, cell: number, a: string, b: string, frontY: number, off = 0): void {
  ctx.fillStyle = a;
  ctx.fillRect(0, TY, W, frontY - TY + 4);
  ctx.fillStyle = b;
  ctx.beginPath();
  const n = Math.ceil(2.4 / cell);
  const zf = zFront(frontY);
  let j = 0;
  for (let z0 = ZB; z0 > zf; z0 -= cell, j++) {
    const z1 = Math.max(z0 - cell, 0.5);
    for (let i = -n; i < n; i++) if ((((i + j) % 2) + 2) % 2 === 0) quad(ctx, i * cell + off, (i + 1) * cell + off, z0, z1);
  }
  ctx.fill();
}

/** Translucent stripes along X (receding to the vanishing point) and along Z (across). */
function bandsX(ctx: Ctx, period: number, width: number, offset: number, color: string, frontY: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  const zf = zFront(frontY);
  const n = Math.ceil(2.5 / period);
  for (let i = -n; i <= n; i++) quad(ctx, i * period + offset, i * period + offset + width, ZB, zf);
  ctx.fill();
}

function bandsZ(ctx: Ctx, period: number, width: number, offset: number, color: string, frontY: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  const zf = zFront(frontY);
  for (let z0 = ZB - offset; z0 > zf - period; z0 -= period) quad(ctx, -3, 3, Math.min(ZB, z0), Math.max(z0 - width, 0.5));
  ctx.fill();
}

/** Vertical drape continuing a column pattern below the table front. */
function drapeColumns(ctx: Ctx, frontY: number, cell: number, colorFor: (i: number, row: number) => string, off = 0): void {
  const zf = zAt(frontY);
  const px = (FOC * cell) / zf;
  const n = Math.ceil(2.4 / cell);
  for (let row = 0; row < 3; row++) {
    for (let i = -n; i < n; i++) {
      const x0 = xAt(i * cell + off, zf);
      ctx.fillStyle = colorFor(i, row);
      ctx.fillRect(x0, frontY + row * px * 0.9, px + 1, px * 0.9 + 1);
    }
  }
  // fold shading
  const g = ctx.createLinearGradient(0, 0, W, 0);
  for (let k = 0; k <= 16; k++) g.addColorStop(k / 16, k % 2 ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.06)');
  ctx.fillStyle = g;
  ctx.fillRect(0, frontY, W, H - frontY);
}

function clothWeave(ctx: Ctx, frontY: number, a = 0.08): void {
  ctx.save();
  clipRect(ctx, 0, TY, W, frontY - TY);
  grainRect(ctx, 0, TY, W, frontY - TY, a * 2.2);
  // fine thread lines across
  ctx.strokeStyle = `rgba(255,255,255,${a * 0.6})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let z = ZB; z > zFront(frontY); z -= 0.018) {
    const y = yAt(z);
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
  // soft folds / creases
  for (let i = -6; i <= 6; i++) {
    const X = i * 0.33 + 0.1;
    ctx.beginPath();
    quad(ctx, X - 0.03, X + 0.03, ZB, zFront(frontY));
    ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Shared props

/** Foot sole silhouette (toes up). s ~= total height. */
function footPath(ctx: Ctx, x: number, y: number, s: number, toes = true): void {
  ctx.moveTo(x - 0.2 * s, y - 0.16 * s);
  ctx.bezierCurveTo(x - 0.27 * s, y + 0.08 * s, x - 0.17 * s, y + 0.5 * s, x + 0.01 * s, y + 0.5 * s);
  ctx.bezierCurveTo(x + 0.19 * s, y + 0.5 * s, x + 0.17 * s, y + 0.18 * s, x + 0.24 * s, y - 0.1 * s);
  ctx.bezierCurveTo(x + 0.3 * s, y - 0.34 * s, x - 0.14 * s, y - 0.38 * s, x - 0.2 * s, y - 0.16 * s);
  ctx.closePath();
  if (!toes) return;
  const t: [number, number, number][] = [
    [0.17, -0.38, 0.085],
    [0.04, -0.43, 0.064],
    [-0.07, -0.415, 0.056],
    [-0.16, -0.37, 0.05],
    [-0.235, -0.3, 0.044],
  ];
  for (const [tx, ty, tr] of t) {
    ctx.moveTo(x + tx * s + tr * s, y + ty * s);
    ctx.ellipse(x + tx * s, y + ty * s, tr * s, tr * s * 1.15, 0, 0, Math.PI * 2);
  }
}

function neonStroke(ctx: Ctx, color: string, width: number, stroke: () => void, on = 1): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // tube shadow on the wall
  ctx.save();
  ctx.translate(5, 7);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = width + 2;
  stroke();
  ctx.restore();
  if (on <= 0) {
    ctx.strokeStyle = '#3b3640';
    ctx.lineWidth = width;
    stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = width * 0.3;
    stroke();
    ctx.restore();
    return;
  }
  ctx.globalCompositeOperation = 'lighter';
  const halo: [number, number][] = [
    [7, 0.05],
    [4.6, 0.08],
    [2.8, 0.16],
    [1.7, 0.3],
  ];
  for (const [k, a] of halo) {
    ctx.strokeStyle = rgba(color, a * on);
    ctx.lineWidth = width * k;
    stroke();
  }
  ctx.strokeStyle = rgba(color, on);
  ctx.lineWidth = width;
  stroke();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = rgba(shade(color, 0.75), 0.9 * on + 0.1);
  ctx.lineWidth = width * 0.38;
  stroke();
  ctx.restore();
}

/** Neon lettering. `on` per character (1 lit, 0 dead, between = dim). */
function neonText(ctx: Ctx, text: string, x: number, y: number, size: number, font: string, color: string, on?: number[], lw = 0): void {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  ctx.textBaseline = 'middle';
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((s, v) => s + v, 0);
  let cx = x - total / 2;
  const w = lw || Math.max(4, size * 0.07);
  [...text].forEach((ch, i) => {
    const o = on ? on[i] : 1;
    if (ch !== ' ') neonStroke(ctx, color, w, () => ctx.strokeText(ch, cx, y), o);
    cx += widths[i];
  });
  ctx.restore();
}

function cobweb(ctx: Ctx, x: number, y: number, size: number, a0: number, a1: number, r: R, alpha = 0.4): void {
  ctx.save();
  ctx.strokeStyle = `rgba(225,235,240,${alpha})`;
  ctx.lineWidth = 1.6;
  const n = 7;
  const spokes: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    const len = size * (0.8 + r() * 0.3);
    spokes.push([Math.cos(a) * len, Math.sin(a) * len]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + spokes[i][0], y + spokes[i][1]);
    ctx.stroke();
  }
  for (let ring = 1; ring <= 6; ring++) {
    const f = ring / 6.4;
    ctx.beginPath();
    for (let i = 0; i < n - 1; i++) {
      const p0 = spokes[i];
      const p1 = spokes[i + 1];
      const sx = x + p0[0] * f;
      const sy = y + p0[1] * f;
      const ex = x + p1[0] * f;
      const ey = y + p1[1] * f;
      const mx = (sx + ex) / 2 - (sx + ex - 2 * x) * 0.08;
      const my = (sy + ey) / 2 - (sy + ey - 2 * y) * 0.08;
      if (i === 0) ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function fogBand(ctx: Ctx, r: R, y: number, h: number, color: string, a: number, n = 26): void {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const yy = y + (r() - 0.5) * h;
    const rx = 180 + r() * 320;
    darkSpot(ctx, x, yy, rx, rx * (0.18 + r() * 0.15), a * (0.5 + r() * 0.5), color);
  }
  ctx.restore();
}

function stars(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, n: number, maxA = 1): void {
  for (let i = 0; i < n; i++) {
    const sx = x + r() * w;
    const sy = y + r() * h;
    const big = r();
    const a = (0.25 + r() * 0.75) * maxA;
    ctx.fillStyle = `rgba(255,255,240,${a})`;
    if (big > 0.97) {
      glow(ctx, sx, sy, 10, '#cfe0ff', a * 0.8);
      ctx.fillRect(sx - 1, sy - 5, 2, 10);
      ctx.fillRect(sx - 5, sy - 1, 10, 2);
    } else {
      const s = big > 0.8 ? 2.4 : 1.4;
      ctx.fillRect(sx, sy, s, s);
    }
  }
}

function moon(ctx: Ctx, x: number, y: number, rad: number, r: R, col = '#f4f0d8'): void {
  glow(ctx, x, y, rad * 4.2, '#9fb8ff', 0.35);
  glow(ctx, x, y, rad * 1.8, '#fff6dc', 0.4);
  ellipse(ctx, x, y, rad, rad);
  const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, rad * 0.1, x, y, rad);
  g.addColorStop(0, shade(col, 0.3));
  g.addColorStop(0.8, col);
  g.addColorStop(1, shade(col, -0.18));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ellipse(ctx, x, y, rad, rad);
  ctx.clip();
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * rad * 0.75;
    const cr = rad * (0.06 + r() * 0.16);
    ellipse(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, cr, cr);
    ctx.fillStyle = rgba(shade(col, -0.25), 0.55);
    ctx.fill();
  }
  ctx.restore();
}

function noFeetSign(ctx: Ctx, cx: number, cy: number, w: number, h: number, rot: number, cracked: boolean): void {
  ctx.save();
  ctx.translate(cx, cy);
  // hanging wire + nail
  ctx.strokeStyle = '#3a2a20';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-w * 0.32, -h / 2 + 6);
  ctx.lineTo(0, -h / 2 - 46);
  ctx.lineTo(w * 0.32, -h / 2 + 6);
  ctx.stroke();
  ellipse(ctx, 0, -h / 2 - 46, 6, 6);
  fillOl(ctx, '#8a8278', 3);
  ctx.rotate(rot);
  roundRect(ctx, -w / 2 + 10, -h / 2 + 14, w, h, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  roundRect(ctx, -w / 2, -h / 2, w, h, 10);
  fillOl(ctx, lgrad(ctx, -w / 2, -h / 2, w / 2, h / 2, [
    [0, '#e8b84a'],
    [0.45, '#b98422'],
    [0.55, '#d7a540'],
    [1, '#8a5a12'],
  ]));
  const m = 15;
  ctx.beginPath();
  ctx.rect(-w / 2 + m, -h / 2 + m, w - m * 2, h - m * 2);
  ctx.fillStyle = '#efe5cf';
  ctx.fill();
  ctx.strokeStyle = rgba(OL, 0.8);
  ctx.lineWidth = 3;
  ctx.stroke();
  const rr = Math.min(w, h) * 0.27;
  const cyy = -h * 0.08;
  ctx.beginPath();
  footPath(ctx, 0, cyy + rr * 0.05, rr * 1.45);
  ctx.fillStyle = '#2a1810';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, cyy, rr, 0, Math.PI * 2);
  ctx.moveTo(-rr * 0.7, cyy - rr * 0.7);
  ctx.lineTo(rr * 0.7, cyy + rr * 0.7);
  ctx.strokeStyle = '#d42a26';
  ctx.lineWidth = rr * 0.22;
  ctx.lineCap = 'butt';
  ctx.stroke();
  ctx.font = `bold ${Math.round(h * 0.12)}px ${BLOCK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b81f1c';
  ctx.fillText('NO FEET', 0, h * 0.3);
  // glass glare
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w / 2 + m, -h / 2 + m, w - m * 2, h - m * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2 + 20);
  ctx.lineTo(-w / 2 + 40, -h / 2);
  ctx.lineTo(-w / 2 + 90, -h / 2);
  ctx.lineTo(-w / 2, -h / 2 + 90);
  ctx.fill();
  if (cracked) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    const ox = w * 0.18;
    const oy = -h * 0.2;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a) * w * 0.25, oy + Math.sin(a) * w * 0.22);
      ctx.lineTo(ox + Math.cos(a + 0.15) * w * 0.6, oy + Math.sin(a + 0.15) * w * 0.55);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// 1 + 12. Trattoria Nonna / The Haunted Pizzeria

const TR = {
  oven: { x: 270, y: 560 },
  lamps: [610, 1310],
  lampY: 290,
  neon: { x: 960, y: 196 },
  sign: { x: 960, y: 420 },
  board: { x: 1478, y: 196, w: 360, h: 360 },
  front: 1040,
};

function brickWall(ctx: Ctx, r: R, y0: number, y1: number, pal: string[], mortar: string, haunted: boolean): void {
  ctx.fillStyle = mortar;
  ctx.fillRect(0, y0, W, y1 - y0);
  mottle(ctx, 0, y0, W, y1 - y0, 0.35, 1.5);
  const bw = 118;
  const bh = 46;
  for (let row = 0, y = y0 - 10; y < y1; row++, y += bh) {
    const off = row % 2 ? -bw / 2 : -r() * 20;
    for (let x = off; x < W; x += bw) {
      const bx = x + 3 + (r() - 0.5) * 2;
      const by = y + 3 + (r() - 0.5) * 2;
      const w = bw - 7 + (r() - 0.5) * 3;
      const h = bh - 7;
      if (haunted && r() < 0.05) {
        // missing brick
        roundRect(ctx, bx, by, w, h, 4);
        ctx.fillStyle = '#1c1210';
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, w, 8);
        continue;
      }
      const col = shade(pal[Math.floor(r() * pal.length)], (r() - 0.5) * 0.2);
      roundRect(ctx, bx, by, w, h, 5);
      ctx.fillStyle = lgrad(ctx, 0, by, 0, by + h, [
        [0, shade(col, 0.1)],
        [1, shade(col, -0.14)],
      ]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,225,190,0.16)';
      ctx.fillRect(bx + 4, by + 2, w - 8, 3);
      ctx.fillStyle = 'rgba(40,10,0,0.25)';
      ctx.fillRect(bx + 3, by + h - 5, w - 6, 5);
      // pits and chips
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = `rgba(40,10,0,${0.15 + r() * 0.2})`;
        ellipse(ctx, bx + 6 + r() * (w - 12), by + 6 + r() * (h - 12), 1 + r() * 2.5, 1 + r() * 2);
        ctx.fill();
      }
      if (r() < 0.12) {
        ctx.fillStyle = rgba(shade(col, -0.35), 0.5);
        ellipse(ctx, bx + r() * w, by + h * r(), 6 + r() * 10, 4 + r() * 5);
        ctx.fill();
      }
    }
  }
  grainRect(ctx, 0, y0, W, y1 - y0, 0.35);
  if (haunted) {
    ctx.strokeStyle = 'rgba(10,6,4,0.7)';
    ctx.lineWidth = 3;
    const cracks: [number, number][] = [
      [180, 40],
      [760, 520],
      [1700, 80],
      [1240, 560],
    ];
    for (const [cx0, cy0] of cracks) {
      let x = cx0;
      let y = cy0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 9; k++) {
        x += (r() - 0.5) * 60;
        y += (cy0 < 300 ? 1 : -1) * (14 + r() * 26);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

function wainscot(ctx: Ctx, r: R, y0: number, wood: string): void {
  vgrad(ctx, 0, y0, W, TY - y0, [
    [0, shade(wood, 0.05)],
    [1, shade(wood, -0.35)],
  ]);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 160; i++) {
    const x = r() * W;
    ctx.strokeStyle = `rgba(20,8,2,${0.08 + r() * 0.18})`;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.bezierCurveTo(x + (r() - 0.5) * 14, y0 + 60, x + (r() - 0.5) * 14, y0 + 120, x + (r() - 0.5) * 10, TY);
    ctx.stroke();
  }
  const pw = 240;
  for (let x = -40; x < W; x += pw) {
    const px = x + 22;
    const py = y0 + 46;
    const w = pw - 44;
    const h = 200;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 6;
    ctx.strokeRect(px, py, w, h);
    ctx.strokeStyle = 'rgba(255,220,180,0.14)';
    ctx.lineWidth = 3;
    ctx.strokeRect(px + 5, py + 5, w - 10, h - 10);
    ctx.fillStyle = 'rgba(255,220,180,0.05)';
    ctx.fillRect(px + 14, py + 14, w - 28, h - 28);
  }
  // cap rail
  const ry = y0 - 16;
  ctx.fillStyle = lgrad(ctx, 0, ry, 0, ry + 34, [
    [0, shade(wood, 0.35)],
    [0.35, shade(wood, 0.12)],
    [1, shade(wood, -0.3)],
  ]);
  ctx.fillRect(0, ry, W, 34);
  ctx.fillStyle = rgba(OL, 0.9);
  ctx.fillRect(0, ry - 2, W, 4);
  ctx.fillRect(0, ry + 32, W, 4);
  vgrad(ctx, 0, ry + 36, W, 30, [
    [0, 'rgba(0,0,0,0.4)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  vgrad(ctx, 0, ry - 30, W, 28, [
    [0, 'rgba(0,0,0,0)'],
    [1, 'rgba(0,0,0,0.25)'],
  ]);
}

function flame(ctx: Ctx, x: number, y: number, w: number, h: number, r: R, cols: [string, string, string]): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const layers: [number, string, number][] = [
    [1, cols[0], 0.75],
    [0.72, cols[1], 0.85],
    [0.42, cols[2], 0.95],
  ];
  for (const [k, c, a] of layers) {
    const fw = w * k;
    const fh = h * k;
    const lean = (r() - 0.5) * w * 0.4;
    ctx.beginPath();
    ctx.moveTo(x - fw / 2, y);
    ctx.bezierCurveTo(x - fw * 0.55, y - fh * 0.38, x - fw * 0.12 + lean * 0.4, y - fh * 0.62, x + lean, y - fh);
    ctx.bezierCurveTo(x + fw * 0.2 + lean * 0.3, y - fh * 0.55, x + fw * 0.58, y - fh * 0.36, x + fw / 2, y);
    ctx.quadraticCurveTo(x, y + fw * 0.3, x - fw / 2, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y, 0, y - fh);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, a * 0.2));
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

function logEnd(ctx: Ctx, x: number, y: number, rad: number, bark = '#4a2c18', wood = '#c89a62'): void {
  ellipse(ctx, x, y, rad, rad);
  fillOl(ctx, bark, 3);
  ellipse(ctx, x, y, rad * 0.8, rad * 0.8);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.strokeStyle = rgba(shade(wood, -0.4), 0.7);
  ctx.lineWidth = 1.5;
  for (let k = 1; k < 3; k++) {
    ellipse(ctx, x, y, rad * 0.25 * k, rad * 0.25 * k);
    ctx.stroke();
  }
}

function pizzaOven(ctx: Ctx, r: R, haunted: boolean): void {
  const { x } = TR.oven;
  const L = 40;
  const Rr = 500;
  const top = 250;
  // flue pipe
  ctx.beginPath();
  ctx.rect(x - 34, -10, 68, top + 30);
  fillOl(ctx, cylH(ctx, x - 34, 68, haunted ? '#6d6458' : '#b0662e'));
  for (const by of [70, 160]) {
    ctx.beginPath();
    ctx.rect(x - 40, by, 80, 16);
    fillOl(ctx, cylH(ctx, x - 40, 80, haunted ? '#4d463e' : '#8a4a1e'), 4);
  }
  // shadow on wall
  ctx.save();
  ctx.translate(16, 10);
  ctx.beginPath();
  ctx.moveTo(L, TY);
  ctx.lineTo(L, 430);
  ctx.bezierCurveTo(L, top - 30, Rr, top - 30, Rr, 430);
  ctx.lineTo(Rr, TY);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.restore();
  // dome body (plaster)
  ctx.beginPath();
  ctx.moveTo(L, TY + 10);
  ctx.lineTo(L, 430);
  ctx.bezierCurveTo(L, top - 30, Rr, top - 30, Rr, 430);
  ctx.lineTo(Rr, TY + 10);
  ctx.closePath();
  const plaster = haunted ? '#b9b3a6' : '#e2bf8e';
  const pg = ctx.createRadialGradient(x - 80, 330, 30, x, 480, 330);
  pg.addColorStop(0, shade(plaster, 0.25));
  pg.addColorStop(0.7, plaster);
  pg.addColorStop(1, shade(plaster, -0.35));
  fillOl(ctx, pg, 6);
  ctx.save();
  ctx.clip();
  mottle(ctx, L, top - 40, Rr - L, TY - top + 60, 0.22, 0.8);
  // decorative tile band
  const bandY = 352;
  for (let i = 0; i < 12; i++) {
    const tx = L + 12 + i * 38;
    roundRect(ctx, tx, bandY, 32, 32, 4);
    ctx.fillStyle = i % 2 ? (haunted ? '#5b6b70' : '#2f6e9a') : haunted ? '#d6d0c0' : '#f2e6c8';
    ctx.fill();
    ctx.strokeStyle = rgba(OL, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
    if (i % 2 === 0) {
      ellipse(ctx, tx + 16, bandY + 16, 7, 7);
      ctx.fillStyle = haunted ? '#7a7a6a' : '#d4572a';
      ctx.fill();
    }
  }
  // soot above the mouth
  darkSpot(ctx, x, 420, 150, 90, haunted ? 0.55 : 0.4, '#1a0e08');
  ctx.restore();
  // mouth voussoirs
  const my = 560;
  const mr = 112;
  const vr = 160;
  for (let i = 0; i < 11; i++) {
    const a0 = Math.PI + (i / 11) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 11) * Math.PI;
    ctx.beginPath();
    ctx.arc(x, my, vr, a0, a1);
    ctx.arc(x, my, mr, a1, a0, true);
    ctx.closePath();
    const c = shade(haunted ? '#8a7f78' : i % 2 ? '#a9452a' : '#c25e34', (r() - 0.5) * 0.15);
    fillOl(ctx, lgrad(ctx, 0, my - vr, 0, my, [
      [0, shade(c, 0.15)],
      [1, shade(c, -0.2)],
    ]), 3);
  }
  // keystone
  ctx.beginPath();
  ctx.moveTo(x - 20, my - vr - 10);
  ctx.lineTo(x + 20, my - vr - 10);
  ctx.lineTo(x + 14, my - mr + 4);
  ctx.lineTo(x - 14, my - mr + 4);
  ctx.closePath();
  fillOl(ctx, haunted ? '#9a948a' : '#e8d2a8', 4);
  // mouth jambs
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.rect(x + s * mr - (s > 0 ? 0 : 48), my, 48, 70);
    fillOl(ctx, haunted ? '#7d746c' : '#b24f2e', 3);
  }
  // mouth interior
  ctx.beginPath();
  ctx.moveTo(x - mr, my + 70);
  ctx.lineTo(x - mr, my);
  ctx.arc(x, my, mr, Math.PI, 0);
  ctx.lineTo(x + mr, my + 70);
  ctx.closePath();
  ctx.save();
  if (haunted) {
    ctx.fillStyle = '#07080a';
    ctx.fill();
  } else {
    const ig = ctx.createRadialGradient(x, my + 70, 10, x, my + 20, 170);
    ig.addColorStop(0, '#ffcf5a');
    ig.addColorStop(0.35, '#e8641c');
    ig.addColorStop(0.75, '#5a1608');
    ig.addColorStop(1, '#1e0804');
    ctx.fillStyle = ig;
    ctx.fill();
  }
  ctx.clip();
  if (!haunted) {
    // pizza baking inside + logs + flames
    for (let i = 0; i < 5; i++) logEnd(ctx, x - 70 + i * 26 + (i % 2) * 6, my + 50 - (i % 2) * 14, 13);
    for (let i = 0; i < 4; i++) flame(ctx, x - 66 + i * 44, my + 56, 74 + r() * 20, 90 + r() * 60, r, ['#ff3a0a', '#ff9a1a', '#fff27a']);
    glow(ctx, x, my + 40, 140, '#ffb040', 0.6);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rgba(r() > 0.5 ? '#ffe17a' : '#ff7a2a', 0.5 + r() * 0.5);
      ctx.fillRect(x - mr + r() * mr * 2, my - 40 + r() * 100, 2.5, 2.5);
    }
  } else {
    darkSpot(ctx, x, my + 60, 100, 50, 0.5, '#0a0a0a');
    for (let i = 0; i < 4; i++) logEnd(ctx, x - 50 + i * 32, my + 54 - (i % 2) * 10, 13, '#2a2a2a', '#4a4844');
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - mr, my + 70);
  ctx.lineTo(x - mr, my);
  ctx.arc(x, my, mr, Math.PI, 0);
  ctx.lineTo(x + mr, my + 70);
  outline(ctx, 5);
  // hearth ledge
  ctx.beginPath();
  ctx.rect(x - 175, my + 66, 350, 32);
  fillOl(ctx, cylV(ctx, my + 66, 32, haunted ? '#8d877e' : '#d6c3a2'), 5);
  // wood store
  ctx.beginPath();
  ctx.moveTo(x - 130, TY + 10);
  ctx.lineTo(x - 130, my + 150);
  ctx.quadraticCurveTo(x, my + 105, x + 130, my + 150);
  ctx.lineTo(x + 130, TY + 10);
  ctx.closePath();
  fillOl(ctx, '#170c07', 5);
  ctx.save();
  ctx.clip();
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 7; i++) logEnd(ctx, x - 108 + i * 36 + (row % 2) * 18, TY - 6 - row * 32, 17, haunted ? '#3a3632' : '#4a2c18', haunted ? '#6a6660' : '#b98656');
  ctx.restore();
  // fire light spill on the oven face
  if (!haunted) {
    glow(ctx, x, my + 80, 300, '#ff7a1a', 0.32);
    glow(ctx, x, my + 120, 220, '#ffb050', 0.2, 0.4);
  }
}

function pizzaPeel(ctx: Ctx, x: number, haunted: boolean): void {
  ctx.save();
  ctx.translate(x, TY);
  ctx.rotate(-0.1);
  ctx.translate(16, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, -10, -440, 20, 440, 8);
  ctx.fill();
  ctx.translate(-16, -16);
  const wood = haunted ? '#8a8476' : '#c99a5e';
  roundRect(ctx, -10, -430, 20, 430, 8);
  fillOl(ctx, cylH(ctx, -10, 20, wood), 4);
  ctx.beginPath();
  ctx.moveTo(-14, -420);
  ctx.lineTo(-58, -480);
  ctx.quadraticCurveTo(-62, -600, 0, -604);
  ctx.quadraticCurveTo(62, -600, 58, -480);
  ctx.lineTo(14, -420);
  ctx.closePath();
  fillOl(ctx, hgrad(ctx, -60, 60, [
    [0, shade(wood, -0.25)],
    [0.35, shade(wood, 0.25)],
    [1, shade(wood, -0.35)],
  ]), 5);
  ctx.strokeStyle = rgba(shade(wood, -0.45), 0.5);
  ctx.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 12, -590);
    ctx.lineTo(i * 9, -440);
    ctx.stroke();
  }
  ellipse(ctx, 0, -12, 5, 5);
  ctx.fillStyle = OL;
  ctx.fill();
  ctx.restore();
}

function pendant(ctx: Ctx, x: number, yb: number, color: string, lit: number, tilt = 0): void {
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, -5);
  const ax = x + Math.sin(tilt) * -70;
  ctx.lineTo(ax, yb - 70);
  ctx.stroke();
  ctx.save();
  ctx.translate(ax, yb - 70);
  ctx.rotate(tilt);
  roundRect(ctx, -12, -8, 24, 20, 5);
  fillOl(ctx, cylH(ctx, -12, 24, '#b08a4a'), 3);
  ctx.beginPath();
  ctx.moveTo(-22, 8);
  ctx.quadraticCurveTo(-34, 44, -84, 66);
  ctx.quadraticCurveTo(0, 78, 84, 66);
  ctx.quadraticCurveTo(34, 44, 22, 8);
  ctx.closePath();
  fillOl(ctx, hgrad(ctx, -84, 84, [
    [0, shade(color, -0.5)],
    [0.3, shade(color, 0.3)],
    [0.45, color],
    [1, shade(color, -0.55)],
  ]), 5);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-18, 18);
  ctx.quadraticCurveTo(-30, 46, -60, 60);
  ctx.stroke();
  ellipse(ctx, 0, 70, 82, 11);
  fillOl(ctx, lit > 0 ? mix('#5a4020', '#fff2c8', lit) : '#1a1614', 4);
  if (lit > 0) {
    ellipse(ctx, 0, 72, 22, 12);
    ctx.fillStyle = '#fffbe8';
    ctx.fill();
  }
  ctx.restore();
}

function lampLight(ctx: Ctx, x: number, yb: number, color: string, a: number): void {
  cone(ctx, x, yb, 160, x, TY + 40, 620, color, 0.09 * a);
  glow(ctx, x, yb + 4, 170, color, 0.75 * a, 0.6);
  glow(ctx, x, yb + 2, 60, '#ffffff', 0.5 * a, 0.5);
  glow(ctx, x, 860, 380, color, 0.22 * a, 0.22);
}

function chalkCanvas(w: number, h: number, draw: (c: Ctx) => void): HTMLCanvasElement {
  const [c, cx] = makeCanvas(w, h);
  draw(cx);
  cx.globalCompositeOperation = 'destination-out';
  cx.fillStyle = cx.createPattern(speck(), 'repeat')!;
  cx.fillRect(0, 0, w, h);
  cx.globalAlpha = 0.5;
  cx.fillRect(0, 0, w, h);
  return c;
}

function chalkText(c: Ctx, t: string, x: number, y: number, size: number, color: string, rot = 0, font = CHALK): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.font = `${size}px ${font}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = rgba(color, 0.55);
  for (let k = 0; k < 3; k++) c.fillText(t, (k - 1) * 1.2, (k % 2) * 1.2);
  c.restore();
}

function chalkboard(ctx: Ctx, r: R, haunted: boolean): void {
  const { x, y, w, h } = TR.board;
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  roundRect(ctx, x + 14, y + 16, w, h, 12);
  ctx.fill();
  roundRect(ctx, x, y, w, h, 12);
  const wood = haunted ? '#6b665d' : '#8a5a32';
  fillOl(ctx, lgrad(ctx, x, y, x + w, y + h, [
    [0, shade(wood, 0.3)],
    [0.5, wood],
    [1, shade(wood, -0.4)],
  ]), 6);
  const m = 22;
  ctx.beginPath();
  ctx.rect(x + m, y + m, w - m * 2, h - m * 2);
  const bg = ctx.createRadialGradient(x + w * 0.4, y + h * 0.35, 20, x + w / 2, y + h / 2, w * 0.8);
  bg.addColorStop(0, haunted ? '#33393a' : '#34463c');
  bg.addColorStop(1, haunted ? '#161a1a' : '#18241e');
  fillOl(ctx, bg, 4);
  // old chalk smudges
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 9; i++) darkSpot(ctx, x + m + r() * (w - m * 2), y + m + r() * (h - m * 2), 40 + r() * 70, 20 + r() * 30, 0.06, '#ffffff');
  const iw = w - m * 2;
  const ih = h - m * 2;
  const chalk = chalkCanvas(iw, ih, (c) => {
    chalkText(c, 'TODAY:', iw * 0.32, 40, 34, '#f4f1e6', -0.04);
    chalkText(c, 'PIZZA', iw * 0.5, 104, 66, haunted ? '#cfd6d0' : '#ffe9a8', -0.03);
    c.strokeStyle = rgba('#f4f1e6', 0.6);
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(iw * 0.18, 146);
    c.bezierCurveTo(iw * 0.4, 138, iw * 0.6, 156, iw * 0.84, 140);
    c.stroke();
    if (haunted) {
      chalkText(c, 'RUN!', iw * 0.5, 210, 70, '#cfe8d8', 0.08);
      c.strokeStyle = rgba('#f4f1e6', 0.45);
      c.lineWidth = 6;
      for (let k = 0; k < 5; k++) {
        c.beginPath();
        c.moveTo(iw * 0.1 + k * 10, 70 + k * 8);
        c.lineTo(iw * 0.9 - k * 6, 120 - k * 4);
        c.stroke();
      }
      chalkText(c, 'they come at night', iw * 0.5, 272, 22, '#f4f1e6', -0.05);
    } else {
      chalkText(c, 'NO FEET!', iw * 0.46, 200, 52, '#ff9a9a', 0.04);
      // slice doodle
      c.save();
      c.translate(iw * 0.22, 262);
      c.strokeStyle = rgba('#ffe9a8', 0.7);
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(-30, -22);
      c.quadraticCurveTo(0, -36, 30, -22);
      c.lineTo(0, 34);
      c.closePath();
      c.stroke();
      c.fillStyle = rgba('#ff9a9a', 0.7);
      for (const [px, py] of [
        [-10, -14],
        [10, -10],
        [0, 6],
      ])
        c.fillRect(px - 4, py - 4, 8, 8);
      c.restore();
      // crossed-out foot doodle
      c.save();
      c.translate(iw * 0.74, 266);
      c.strokeStyle = rgba('#f4f1e6', 0.65);
      c.lineWidth = 3.5;
      c.beginPath();
      footPath(c, 0, 0, 62);
      c.stroke();
      c.strokeStyle = rgba('#ff8a8a', 0.8);
      c.lineWidth = 5;
      c.beginPath();
      c.arc(0, 0, 38, 0, Math.PI * 2);
      c.moveTo(-27, -27);
      c.lineTo(27, 27);
      c.stroke();
      c.restore();
    }
  });
  ctx.drawImage(chalk, x + m, y + m);
  // glare
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.moveTo(x + m, y + m);
  ctx.lineTo(x + m + 120, y + m);
  ctx.lineTo(x + m, y + m + 140);
  ctx.fill();
  ctx.restore();
  // chalk tray
  ctx.beginPath();
  ctx.rect(x - 8, y + h - 16, w + 16, 20);
  fillOl(ctx, cylV(ctx, y + h - 16, 20, wood), 4);
  roundRect(ctx, x + w * 0.66, y + h - 26, 34, 10, 4);
  fillOl(ctx, '#f6f2e8', 2.5);
}

function trattoriaTable(ctx: Ctx, r: R, haunted: boolean): void {
  const f = TR.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  checkerTop(ctx, 0.2, haunted ? '#cfcbc0' : '#e3d0ac', haunted ? '#6e6c68' : '#a8352c', f, 0.1);
  clothWeave(ctx, f);
  if (haunted) {
    // stains, holes
    for (let i = 0; i < 9; i++) {
      const X = (r() - 0.5) * 3.2;
      const z = ZB - r() * 1.1;
      const sx = xAt(X, z);
      const sy = yAt(z);
      const s = FOC / z / 460;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(s, s * 0.42);
      blob(ctx, 0, 0, 30 + r() * 40, 0.6, r, 9);
      ctx.fillStyle = i < 4 ? '#1a1410' : 'rgba(70,60,30,0.3)';
      ctx.fill();
      if (i < 4) {
        ctx.strokeStyle = 'rgba(230,230,220,0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.restore();
  frontFace(ctx, f, () =>
    drapeColumns(ctx, f, 0.2, (i, row) =>
      (((i + row) % 2) + 2) % 2 === 0 ? (haunted ? '#5e5c58' : '#a52c25') : haunted ? '#b5b1a6' : '#ddd0b2', 0.1),
  );
  if (haunted) {
    // torn hem
    ctx.fillStyle = '#0a0806';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H - 6 - r() * 26);
    ctx.lineTo(W, H);
    ctx.fill();
  }
}

function drawTrattoria(ctx: Ctx, r: R, haunted: boolean): void {
  const pal = haunted
    ? ['#8a6a5a', '#7a5e52', '#95776a', '#6a5248']
    : ['#b5532f', '#a5452a', '#c0653a', '#93402a', '#b85c35', '#9e4b2e', '#c9713f'];
  brickWall(ctx, r, 0, 560, pal, haunted ? '#a29a8a' : '#c9a27a', haunted);
  // cool shading at the top, warm falloff
  vgrad(ctx, 0, 0, W, 560, [
    [0, 'rgba(20,6,2,0.62)'],
    [0.5, 'rgba(20,6,2,0.12)'],
    [1, 'rgba(20,6,2,0.3)'],
  ]);
  wainscot(ctx, r, 560, haunted ? '#4a443c' : '#5b3521');
  pizzaOven(ctx, r, haunted);
  if (!haunted) pizzaPeel(ctx, 560, haunted);
  noFeetSign(ctx, TR.sign.x, TR.sign.y, 170, 190, haunted ? 0.16 : 0, haunted);
  chalkboard(ctx, r, haunted);
  // neon mounting rails + dark backboard
  ctx.fillStyle = rgba(OL, 0.7);
  for (const dx of [-250, 250]) ctx.fillRect(TR.neon.x + dx - 3, 0, 6, TR.neon.y - 80);
  roundRect(ctx, TR.neon.x - 318 + 10, TR.neon.y - 112 + 12, 636, 216, 30);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  roundRect(ctx, TR.neon.x - 318, TR.neon.y - 112, 636, 216, 30);
  fillOl(ctx, lgrad(ctx, 0, TR.neon.y - 112, 0, TR.neon.y + 104, [
    [0, '#2a1a1e'],
    [1, '#120a0c'],
  ]), 5);
  for (const [bx, by] of [
    [-296, -90],
    [296, -90],
    [-296, 82],
    [296, 82],
  ])
    rivet(ctx, TR.neon.x + bx, TR.neon.y + by, 5, '#9a8a7a');
  if (haunted) {
    pendant(ctx, TR.lamps[0] - 40, TR.lampY + 50, '#3f5a4a', 0, 0.55);
    pendant(ctx, TR.lamps[1], TR.lampY, '#3f5a4a', 0.35);
  } else for (const lx of TR.lamps) pendant(ctx, lx, TR.lampY, '#2f6a46', 1);
  trattoriaTable(ctx, r, haunted);
  contactShadow(ctx);
  if (haunted) {
    grade(ctx, 0.78, '#7fa6b0', 0.85);
    vgrad(ctx, 0, 0, W, H, [
      [0, 'rgba(10,30,40,0.35)'],
      [1, 'rgba(10,30,40,0.2)'],
    ]);
    // ghost fire in the oven + ghostly lights
    glow(ctx, TR.oven.x, 600, 180, '#4dffb0', 0.35);
    for (let i = 0; i < 4; i++) flame(ctx, TR.oven.x - 50 + i * 32, 616, 40, 70 + r() * 40, r, ['#1aa070', '#4dffb0', '#c8ffe8']);
    glow(ctx, TR.lamps[1], TR.lampY + 2, 120, '#9ad8ff', 0.35, 0.6);
    cone(ctx, TR.lamps[1], TR.lampY, 160, TR.lamps[1], TY + 40, 600, '#9ad8ff', 0.04);
    neonText(ctx, 'FEETZA', TR.neon.x, TR.neon.y, 150, ROUND, '#ff4fa3', [1, 0, 0.6, 0.15, 0, 1]);
    // cobwebs
    cobweb(ctx, 0, 0, 240, 0, Math.PI / 2, r, 0.45);
    cobweb(ctx, W, 0, 280, Math.PI / 2, Math.PI, r, 0.45);
    cobweb(ctx, TR.lamps[0] - 40, 0, 120, 0.2, Math.PI - 0.2, r, 0.35);
    cobweb(ctx, TR.board.x + TR.board.w, TR.board.y, 110, Math.PI / 2, Math.PI, r, 0.4);
    cobweb(ctx, 0, 560 - 16, 120, -Math.PI / 2, 0, r, 0.35);
    fogBand(ctx, r, 720, 120, '#9fe8d0', 0.22, 30);
    fogBand(ctx, r, 980, 160, '#9fe8d0', 0.14, 24);
    vignette(ctx, 0.9, '#02080a', 0.6);
  } else {
    for (const lx of TR.lamps) lampLight(ctx, lx, TR.lampY, '#ffcf80', 1);
    neonText(ctx, 'FEETZA', TR.neon.x, TR.neon.y, 150, ROUND, '#ff4fa3');
    // orange frame tube
    neonStroke(ctx, '#ff9a2a', 7, () => {
      roundRect(ctx, TR.neon.x - 290, TR.neon.y - 92, 580, 176, 40);
      ctx.stroke();
    });
    glow(ctx, TR.neon.x, TR.neon.y, 420, '#ff4f8a', 0.22, 0.6);
    glow(ctx, TR.oven.x, 600, 360, '#ff6a1a', 0.22);
    tableLight(ctx, '#ffd9a0', 0.08, 0.45);
    grade(ctx, 0.1);
    vignette(ctx, 0.75);
  }
}

// ---------------------------------------------------------------------------------------------
// More shared helpers (tables, lights, silhouettes)

interface Band {
  period: number;
  width: number;
  offset: number;
  color: string;
}

function drapeFolds(ctx: Ctx, f: number): void {
  const g = ctx.createLinearGradient(0, 0, W, 0);
  for (let k = 0; k <= 16; k++) g.addColorStop(k / 16, k % 2 ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.06)');
  ctx.fillStyle = g;
  ctx.fillRect(0, f, W, H - f);
}

/** Cloth woven from bands in both directions (gingham, plaid). */
function bandCloth(ctx: Ctx, f: number, base: string, bands: Band[]): void {
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  ctx.fillStyle = base;
  ctx.fillRect(0, TY, W, f - TY + 4);
  for (const b of bands) {
    bandsX(ctx, b.period, b.width, b.offset, b.color, f);
    bandsZ(ctx, b.period, b.width, b.offset, b.color, f);
  }
  ctx.restore();
  clothWeave(ctx, f);
  frontFace(ctx, f, () => {
    ctx.fillStyle = base;
    ctx.fillRect(0, f, W, H - f);
    const zf = zAt(f);
    const k = FOC / zf;
    for (const b of bands) {
      ctx.fillStyle = b.color;
      const n = Math.ceil(2.6 / b.period);
      for (let i = -n; i <= n; i++) {
        const x0 = xAt(i * b.period + b.offset, zf);
        ctx.fillRect(x0, f, b.width * k, H - f);
      }
      for (let y = f + b.offset * k * 0.8; y < H; y += b.period * k * 0.8) ctx.fillRect(0, y, W, b.width * k * 0.8);
    }
    drapeFolds(ctx, f);
  });
}

/** Wooden planks running toward the vanishing point. */
function planksTop(ctx: Ctx, r: R, f: number, period: number, wood: string, grainA = 0.25, knots = 6, off = 0): void {
  const zf = zFront(f);
  const n = Math.ceil(2.6 / period);
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  for (let i = -n; i <= n; i++) {
    const X0 = i * period + off;
    const col = shade(wood, (r() - 0.5) * 0.24);
    ctx.beginPath();
    quad(ctx, X0, X0 + period, ZB, zf);
    ctx.fillStyle = hgrad(ctx, xAt(X0, 2), xAt(X0 + period, 2), [
      [0, shade(col, 0.08)],
      [0.5, col],
      [1, shade(col, -0.12)],
    ]);
    ctx.fill();
    // grain lines along the plank
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 9; k++) {
      const Xs = X0 + period * (0.08 + r() * 0.84);
      const amp = period * (0.02 + r() * 0.05);
      const ph = r() * 6;
      ctx.strokeStyle = rgba(r() > 0.3 ? shade(col, -0.45) : shade(col, 0.35), grainA * (0.4 + r() * 0.6));
      ctx.beginPath();
      for (let z = ZB; z >= zf - 0.05; z -= 0.04) {
        const X = Xs + Math.sin(z * 9 + ph) * amp;
        if (z === ZB) ctx.moveTo(xAt(X, z), yAt(z));
        else ctx.lineTo(xAt(X, z), yAt(z));
      }
      ctx.stroke();
    }
    // butt joint
    if (r() < 0.6) {
      const z = ZB - 0.1 - r() * (ZB - zf - 0.2);
      ctx.strokeStyle = 'rgba(20,8,2,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(xAt(X0, z), yAt(z));
      ctx.lineTo(xAt(X0 + period, z), yAt(z));
      ctx.stroke();
    }
  }
  for (let k = 0; k < knots; k++) {
    const X = (r() - 0.5) * 3;
    const z = ZB - r() * (ZB - zf);
    const s = FOC / z / 460;
    ctx.save();
    ctx.translate(xAt(X, z), yAt(z));
    ctx.scale(s, s * (1 / z) * 0.9);
    ellipse(ctx, 0, 0, 14, 9);
    ctx.fillStyle = rgba(shade(wood, -0.5), 0.7);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(wood, -0.3), 0.5);
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 22, 14);
    ctx.stroke();
    ctx.restore();
  }
  // gaps
  ctx.strokeStyle = 'rgba(15,6,2,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = -n; i <= n; i++) {
    const X0 = i * period + off;
    ctx.moveTo(xAt(X0, ZB), TY);
    ctx.lineTo(xAt(X0, zf), yAt(zf));
  }
  ctx.stroke();
  grainRect(ctx, 0, TY, W, f - TY, 0.25);
  ctx.restore();
}

function woodLip(ctx: Ctx, r: R, f: number, wood: string): void {
  frontFace(ctx, f, () => {
    ctx.fillStyle = lgrad(ctx, 0, f, 0, H, [
      [0, shade(wood, 0.1)],
      [0.25, shade(wood, -0.05)],
      [1, shade(wood, -0.35)],
    ]);
    ctx.fillRect(0, f, W, H - f);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const y = f + 4 + r() * (H - f);
      ctx.strokeStyle = rgba(shade(wood, -0.5), 0.3);
      ctx.beginPath();
      ctx.moveTo(r() * W, y);
      ctx.lineTo(r() * W, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,230,190,0.18)';
    ctx.fillRect(0, f + 8, W, 3);
  }, 0.4);
}

function catenaryPt(x0: number, y0: number, x1: number, y1: number, sag: number, t: number): [number, number] {
  return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];
}

interface Swag {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  sag: number;
}

interface Bulb {
  x: number;
  y: number;
  color: string;
}

function bulbsOn(swags: Swag[], spacing: number, colors: string[]): Bulb[] {
  const out: Bulb[] = [];
  let k = 0;
  for (const s of swags) {
    const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0) + s.sag;
    const n = Math.max(2, Math.round(len / spacing));
    for (let i = 1; i < n; i++) {
      const [x, y] = catenaryPt(s.x0, s.y0, s.x1, s.y1, s.sag, i / n);
      out.push({ x: Math.round(x), y: Math.round(y + 16), color: colors[k++ % colors.length] });
    }
  }
  return out;
}

function drawWires(ctx: Ctx, swags: Swag[], color = OL, lw = 3): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  for (const s of swags) {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const [x, y] = catenaryPt(s.x0, s.y0, s.x1, s.y1, s.sag, i / 40);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
}

function drawBulbs(ctx: Ctx, bulbs: Bulb[], size = 1, glowA = 0.55): void {
  for (const b of bulbs) {
    ctx.fillStyle = OL;
    ctx.fillRect(b.x - 5 * size, b.y - 16 * size, 10 * size, 9 * size);
    glow(ctx, b.x, b.y, 46 * size, b.color, glowA);
    ellipse(ctx, b.x, b.y, 8 * size, 10 * size);
    const g = ctx.createRadialGradient(b.x - 2, b.y - 3, 1, b.x, b.y, 10 * size);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, shade(b.color, 0.5));
    g.addColorStop(1, b.color);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba(OL, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function pine(ctx: Ctx, x: number, base: number, h: number, w: number, color: string | CanvasGradient, tiers = 5, snow?: string): void {
  const top = base - h;
  const L: [number, number][] = [];
  for (let i = 0; i < tiers; i++) {
    const yb = top + (h * 0.9 * (i + 1)) / tiers;
    const hw = (w / 2) * (0.22 + (0.78 * (i + 1)) / tiers);
    L.push([hw, yb]);
    if (i < tiers - 1) L.push([hw * 0.45, yb - (h * 0.9) / tiers / 4]);
  }
  ctx.beginPath();
  ctx.moveTo(x, top);
  for (const [dx, y] of L) ctx.lineTo(x + dx, y);
  ctx.lineTo(x + w * 0.05, L[L.length - 1][1]);
  ctx.lineTo(x + w * 0.05, base);
  ctx.lineTo(x - w * 0.05, base);
  ctx.lineTo(x - w * 0.05, L[L.length - 1][1]);
  for (let i = L.length - 1; i >= 0; i--) ctx.lineTo(x - L[i][0], L[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (snow) {
    ctx.fillStyle = snow;
    for (let i = 0; i < L.length; i += 2) {
      const [hw, yb] = L[i];
      const yt = i === 0 ? top : L[i - 1][1];
      ctx.beginPath();
      ctx.moveTo(x, i === 0 ? top : yt - h * 0.03);
      ctx.lineTo(x + hw * 0.85, yb - h * 0.02);
      ctx.quadraticCurveTo(x, yb - h * 0.06, x - hw * 0.85, yb - h * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function palm(ctx: Ctx, bx: number, by: number, tx: number, ty: number, s: number, color: string, r: R, rim?: string): void {
  // trunk
  const cx = (bx + tx) / 2 + (tx - bx) * 0.5;
  const cy = (by + ty) / 2;
  const N = 24;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cx + t * t * tx;
    const y = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * cy + t * t * ty;
    const w = (26 - 12 * t) * s;
    left.push([x - w, y]);
    right.push([x + w, y]);
  }
  ctx.beginPath();
  left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (rim) {
    ctx.strokeStyle = rgba(rim, 0.35);
    ctx.lineWidth = 2;
    for (let i = 1; i < N; i += 2) {
      ctx.beginPath();
      ctx.moveTo(left[i][0], left[i][1]);
      ctx.lineTo(right[i][0], right[i][1] - 6 * s);
      ctx.stroke();
    }
  }
  // fronds (filled sawtooth silhouettes)
  const angles = [-2.9, -2.4, -1.9, -1.3, -0.8, -0.3, 0.2, 2.6, 3.4];
  ctx.fillStyle = color;
  for (const a0 of angles) {
    const a = a0 + (r() - 0.5) * 0.2;
    const len = (200 + r() * 70) * s;
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.6 + len * 0.45;
    const mx = tx + Math.cos(a) * len * 0.55;
    const my = ty + Math.sin(a) * len * 0.55 - 30 * s;
    const N = 16;
    const spine: [number, number][] = [];
    const tipsA: [number, number][] = [];
    const tipsB: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const px = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * mx + t * t * ex;
      const py = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * my + t * t * ey;
      const dx = 2 * (1 - t) * (mx - tx) + 2 * t * (ex - mx);
      const dy = 2 * (1 - t) * (my - ty) + 2 * t * (ey - my);
      const dl = Math.hypot(dx, dy) || 1;
      const ux = dx / dl;
      const uy = dy / dl;
      const L = (1 - t * 0.8) * 70 * s + 4;
      spine.push([px, py]);
      tipsA.push([px - uy * L * 0.8 + ux * L * 0.5, py + ux * L * 0.8 + uy * L * 0.5 + L * 0.5]);
      tipsB.push([px + uy * L * 0.6 + ux * L * 0.5, py - ux * L * 0.6 + uy * L * 0.5 + L * 0.6]);
    }
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    for (let i = 1; i <= N; i++) {
      ctx.lineTo(tipsA[i][0], tipsA[i][1]);
      ctx.lineTo(spine[i][0], spine[i][1]);
    }
    for (let i = N; i >= 1; i--) {
      ctx.lineTo(tipsB[i][0], tipsB[i][1]);
      ctx.lineTo(spine[i - 1][0], spine[i - 1][1]);
    }
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    ellipse(ctx, tx - 10 * s + i * 12 * s, ty + 14 * s + (i % 2) * 6 * s, 11 * s, 11 * s);
    ctx.fillStyle = shade(color, 0.12);
    ctx.fill();
  }
}

function frond(ctx: Ctx, x: number, y: number, len: number, angle: number, curl: number, color: string, lw: number, leaf = 1): void {
  const ex = x + Math.cos(angle) * len;
  const ey = y + Math.sin(angle) * len;
  const mx = x + Math.cos(angle - curl) * len * 0.6;
  const my = y + Math.sin(angle - curl) * len * 0.6;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx, my, ex, ey);
  ctx.stroke();
  for (let i = 1; i <= 22; i++) {
    const t = i / 23;
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * mx + t * t * ex;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * my + t * t * ey;
    const dx = 2 * (1 - t) * (mx - x) + 2 * t * (ex - mx);
    const dy = 2 * (1 - t) * (my - y) + 2 * t * (ey - my);
    const dl = Math.hypot(dx, dy);
    const ux = dx / dl;
    const uy = dy / dl;
    const ll = Math.sin(t * Math.PI) * len * 0.2 * leaf + 6;
    const lwid = ll * 0.28;
    for (const sd of [-1, 1]) {
      const nx = -uy * sd;
      const ny = ux * sd;
      const tipx = px + nx * ll + ux * ll * 0.45;
      const tipy = py + ny * ll + uy * ll * 0.45;
      ctx.beginPath();
      ctx.moveTo(px - ux * lwid, py - uy * lwid);
      ctx.quadraticCurveTo(px + nx * ll * 0.5 - ux * lwid, py + ny * ll * 0.5 - uy * lwid, tipx, tipy);
      ctx.quadraticCurveTo(px + nx * ll * 0.5 + ux * lwid * 1.4, py + ny * ll * 0.5 + uy * lwid * 1.4, px + ux * lwid, py + uy * lwid);
      ctx.fill();
    }
  }
}

function skyline(ctx: Ctx, r: R, base: number, minH: number, maxH: number, minW: number, maxW: number, color: string, windows: number, winColor: string, olw = 0): void {
  let x = -20;
  while (x < W + 20) {
    const w = minW + r() * (maxW - minW);
    const h = minH + r() * (maxH - minH);
    const top = base - h;
    ctx.beginPath();
    ctx.rect(x, top, w, h + 4);
    if (r() < 0.3) {
      // stepped roof / spire
      ctx.rect(x + w * 0.25, top - h * 0.12, w * 0.5, h * 0.12 + 2);
      if (r() < 0.5) ctx.rect(x + w * 0.48, top - h * 0.3, 3, h * 0.2);
    }
    ctx.fillStyle = color;
    ctx.fill();
    if (olw) {
      ctx.strokeStyle = rgba(OL, 0.8);
      ctx.lineWidth = olw;
      ctx.stroke();
    }
    if (windows > 0) {
      const cw = 14;
      const ch = 20;
      for (let wy = top + 14; wy < base - 20; wy += ch + 10) {
        for (let wx = x + 10; wx < x + w - cw - 6; wx += cw + 10) {
          if (r() < windows) {
            ctx.fillStyle = rgba(winColor, 0.5 + r() * 0.5);
            ctx.fillRect(wx, wy, cw, ch);
          }
        }
      }
    }
    x += w + (r() < 0.3 ? r() * 20 : -2);
  }
}

function hazard(ctx: Ctx, x: number, y: number, w: number, h: number, s = 36): void {
  ctx.save();
  clipRect(ctx, x, y, w, h);
  ctx.fillStyle = '#e8b81e';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1e1a16';
  ctx.beginPath();
  for (let k = x - h; k < x + w + h; k += s * 2) {
    ctx.moveTo(k, y + h);
    ctx.lineTo(k + h, y);
    ctx.lineTo(k + h + s, y);
    ctx.lineTo(k + s, y + h);
    ctx.closePath();
  }
  ctx.fill();
  grainRect(ctx, x, y, w, h, 0.4);
  ctx.restore();
}

function rivet(ctx: Ctx, x: number, y: number, rr: number, base = '#8a9098'): void {
  ellipse(ctx, x + rr * 0.3, y + rr * 0.4, rr, rr);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();
  ellipse(ctx, x, y, rr, rr);
  const g = ctx.createRadialGradient(x - rr * 0.4, y - rr * 0.4, 0, x, y, rr);
  g.addColorStop(0, shade(base, 0.6));
  g.addColorStop(1, shade(base, -0.4));
  ctx.fillStyle = g;
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------
// 2. Rooftop Slice

const RT = {
  sun: { x: 1330, y: 420 },
  front: 1040,
  swags: [
    { x0: 70, y0: 130, x1: 1850, y1: 130, sag: 120 },
    { x0: 70, y0: 130, x1: 1850, y1: 130, sag: 300 },
  ] as Swag[],
};
const RT_BULBS = bulbsOn(RT.swags, 74, ['#ffd27a', '#ffe9a8', '#ffb86a']);

function terracottaPot(ctx: Ctx, x: number, y: number, w: number, h: number, r: R, plant: 'leafy' | 'tree' | 'cactus' | 'flowers'): void {
  // plant first (behind pot rim)
  if (plant === 'tree') {
    ctx.strokeStyle = OL;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 10, y - h, x + 4, y - h * 1.6);
    ctx.stroke();
    ctx.strokeStyle = '#5a3a24';
    ctx.lineWidth = 8;
    ctx.stroke();
    const cy = y - h * 2.1;
    const cr = w * 0.78;
    blob(ctx, x, cy, cr, 0.25, r, 12);
    fillOl(ctx, '#2a4a1e', 5);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * cr * 0.92;
      ctx.save();
      ctx.translate(x + Math.cos(a) * d, cy + Math.sin(a) * d);
      ctx.rotate(r() * Math.PI);
      ellipse(ctx, 0, 0, 13, 5.5);
      ctx.fillStyle = shade(i > 60 ? '#6a9a3a' : '#4a7a2e', (r() - 0.5) * 0.3);
      ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * cr * 0.75;
      ellipse(ctx, x + Math.cos(a) * d, cy + Math.sin(a) * d, 9, 7);
      fillOl(ctx, '#f2c42a', 2.5);
    }
  } else if (plant === 'cactus') {
    roundRect(ctx, x - 18, y - h * 1.3, 36, h * 1.4, 18);
    fillOl(ctx, cylH(ctx, x - 18, 36, '#4f8a3a'), 4);
    roundRect(ctx, x + 10, y - h * 1.0, 30, 22, 11);
    fillOl(ctx, '#4f8a3a', 4);
    roundRect(ctx, x + 22, y - h * 1.25, 20, 40, 10);
    fillOl(ctx, cylH(ctx, x + 22, 20, '#4f8a3a'), 4);
  } else {
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (i / 10 - 0.5) * 2.4;
      ctx.save();
      ctx.translate(x, y - 6);
      ctx.rotate(a + Math.PI / 2);
      ellipse(ctx, 0, -h * 0.55, w * 0.13, h * 0.55);
      fillOl(ctx, lgrad(ctx, -w * 0.13, 0, w * 0.13, 0, [
        [0, '#2f5a22'],
        [0.5, '#5f9a3a'],
        [1, '#2f5a22'],
      ]), 3.5);
      ctx.restore();
    }
    if (plant === 'flowers')
      for (let i = 0; i < 6; i++) {
        const fx = x + (r() - 0.5) * w * 1.1;
        const fy = y - h * 0.6 - r() * h * 0.6;
        for (let p = 0; p < 5; p++) {
          ellipse(ctx, fx + Math.cos((p / 5) * 6.28) * 7, fy + Math.sin((p / 5) * 6.28) * 7, 6, 6);
          fillOl(ctx, '#e8506a', 2);
        }
        ellipse(ctx, fx, fy, 4, 4);
        ctx.fillStyle = '#ffd84a';
        ctx.fill();
      }
  }
  // pot
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w * 0.38, y + h);
  ctx.lineTo(x - w * 0.38, y + h);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, x - w / 2, w, '#b8603a'), 5);
  roundRect(ctx, x - w / 2 - 8, y - 6, w + 16, 22, 6);
  fillOl(ctx, cylH(ctx, x - w / 2 - 8, w + 16, '#c96e44'), 5);
}

function cloudStreak(ctx: Ctx, r: R, cx: number, cy: number, cw: number, ch: number, top: string, bot: string): void {
  ctx.beginPath();
  ctx.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, ch / 2);
  const n = 2 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const bx = cx - cw * 0.3 + (cw * 0.6 * (k + r() * 0.5)) / n;
    const br = ch * (0.7 + r() * 0.6);
    ctx.moveTo(bx + br, cy - ch * 0.1);
    ctx.ellipse(bx, cy - ch * 0.1, br, br * 0.8, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = lgrad(ctx, 0, cy - ch * 1.4, 0, cy + ch / 2, [
    [0, top],
    [1, bot],
  ]);
  ctx.fill();
}

function drawRooftop(ctx: Ctx, r: R): void {
  const { sun } = RT;
  vgrad(ctx, 0, 0, W, 640, [
    [0, '#24184e'],
    [0.28, '#5a2f78'],
    [0.52, '#b44c7a'],
    [0.74, '#ec7e52'],
    [1, '#ffc06a'],
  ]);
  stars(ctx, r, 0, 90, W, 200, 60, 0.6);
  glow(ctx, sun.x, sun.y, 900, '#ff8a4a', 0.35, 0.6);
  glow(ctx, sun.x, sun.y, 300, '#ffd27a', 0.6);
  ellipse(ctx, sun.x, sun.y, 110, 110);
  const sg = ctx.createRadialGradient(sun.x - 20, sun.y - 30, 10, sun.x, sun.y, 110);
  sg.addColorStop(0, '#fff8d8');
  sg.addColorStop(0.6, '#ffd070');
  sg.addColorStop(1, '#ff9a4a');
  ctx.fillStyle = sg;
  ctx.fill();
  // retro sun slits
  ctx.fillStyle = '#f08a58';
  for (let k = 0; k < 4; k++) ctx.fillRect(sun.x - 120, sun.y + 18 + k * 22, 240, 4 + k * 2.5);
  // clouds
  for (let i = 0; i < 9; i++) {
    const cx = r() * W;
    const cy = 150 + r() * 300;
    const cw = 220 + r() * 380;
    const chh = 18 + r() * 22;
    cloudStreak(ctx, r, cx, cy, cw, chh, rgba('#ffc2a8', 0.6), rgba('#8a3a7a', 0.5));
  }
  // skyline layers
  skyline(ctx, r, 640, 60, 230, 50, 140, '#8a4a86', 0, '#000');
  vgrad(ctx, 0, 380, W, 260, [
    [0, rgba('#ff9a6a', 0)],
    [1, rgba('#ff9a6a', 0.35)],
  ]);
  skyline(ctx, r, 640, 90, 300, 80, 170, '#4a2a5e', 0.18, '#ffd27a');
  vgrad(ctx, 0, 450, W, 190, [
    [0, rgba('#f07a5a', 0)],
    [1, rgba('#f07a5a', 0.3)],
  ]);
  skyline(ctx, r, 640, 60, 170, 120, 240, '#241634', 0.28, '#ffcf6a', 3);
  // water tower
  const wx = 330;
  const wb = 470;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(wx - 50, wb + 170);
  ctx.lineTo(wx - 40, wb);
  ctx.moveTo(wx + 50, wb + 170);
  ctx.lineTo(wx + 40, wb);
  ctx.moveTo(wx - 46, wb + 90);
  ctx.lineTo(wx + 46, wb + 40);
  ctx.moveTo(wx + 46, wb + 90);
  ctx.lineTo(wx - 46, wb + 40);
  ctx.stroke();
  roundRect(ctx, wx - 62, wb - 120, 124, 126, 10);
  fillOl(ctx, cylH(ctx, wx - 62, 124, '#5a3a3e'), 5);
  ctx.strokeStyle = rgba(OL, 0.7);
  ctx.lineWidth = 3;
  for (const yy of [wb - 80, wb - 30]) {
    ctx.beginPath();
    ctx.moveTo(wx - 62, yy);
    ctx.lineTo(wx + 62, yy);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(wx - 74, wb - 118);
  ctx.lineTo(wx, wb - 180);
  ctx.lineTo(wx + 74, wb - 118);
  ctx.closePath();
  fillOl(ctx, hgrad(ctx, wx - 74, wx + 74, [
    [0, '#3a2228'],
    [0.6, '#7a4a48'],
    [1, '#2a181e'],
  ]), 5);
  ctx.fillStyle = rgba('#ffb070', 0.35);
  ctx.fillRect(wx + 30, wb - 116, 26, 118);
  // parapet
  const py = 610;
  ctx.fillStyle = '#5a2e2a';
  ctx.fillRect(0, py, W, TY - py);
  const bw = 90;
  const bh = 34;
  for (let row = 0, y = py + 26; y < TY; row++, y += bh) {
    for (let x = row % 2 ? -bw / 2 : 0; x < W; x += bw) {
      const c = shade('#8a4434', (r() - 0.5) * 0.25);
      roundRect(ctx, x + 3, y + 3, bw - 6, bh - 6, 4);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,190,140,0.15)';
      ctx.fillRect(x + 5, y + 4, bw - 10, 3);
    }
  }
  grainRect(ctx, 0, py, W, TY - py, 0.3);
  vgrad(ctx, 0, py, W, TY - py, [
    [0, 'rgba(30,8,20,0.15)'],
    [1, 'rgba(30,8,20,0.6)'],
  ]);
  // coping
  ctx.beginPath();
  ctx.rect(-10, py - 6, W + 20, 34);
  fillOl(ctx, lgrad(ctx, 0, py - 6, 0, py + 28, [
    [0, '#ffd2a8'],
    [0.3, '#c69a88'],
    [1, '#6a4a52'],
  ]), 5);
  // posts
  for (const px of [70, 1850]) {
    ctx.beginPath();
    ctx.rect(px - 16, 120, 32, TY - 120);
    fillOl(ctx, cylH(ctx, px - 16, 32, '#6a4630'), 5);
    ellipse(ctx, px, 120, 22, 10);
    fillOl(ctx, '#7a5236', 4);
  }
  // plants on the parapet
  terracottaPot(ctx, 190, py - 70, 110, 70, r, 'tree');
  terracottaPot(ctx, 420, py - 52, 80, 52, r, 'flowers');
  terracottaPot(ctx, 1530, py - 52, 80, 52, r, 'cactus');
  terracottaPot(ctx, 1740, py - 70, 110, 70, r, 'leafy');
  // string lights
  drawWires(ctx, RT.swags);
  drawBulbs(ctx, RT_BULBS, 1, 0.6);
  // gingham table
  bandCloth(ctx, RT.front, '#dfe2e8', [{ period: 0.16, width: 0.08, offset: 0, color: rgba('#2c5ca0', 0.42) }]);
  contactShadow(ctx, 0.5);
  // warm sunset rim on everything
  glow(ctx, sun.x, 900, 900, '#ff9a5a', 0.1, 0.3);
  tableLight(ctx, '#ffb886', 0.04, 0.5);
  grade(ctx, 0.08);
  vignette(ctx, 0.7, '#10061a');
}

// ---------------------------------------------------------------------------------------------
// 3. Shack Attack Beach Bar

const BE = {
  sun: { x: 1180, y: 505 },
  horizon: 520,
  torch: { x: 1560, y: 330 },
  front: 1036,
  swags: [{ x0: 70, y0: 180, x1: 1850, y1: 180, sag: 110 }] as Swag[],
};
const BE_BULBS = bulbsOn(BE.swags, 58, ['#ff6a8a', '#ffd84a', '#5ae0ff', '#8aff7a', '#ff9a3a']);

function bambooV(ctx: Ctx, x: number, y0: number, y1: number, w: number, base: string, r: R): void {
  ctx.beginPath();
  ctx.rect(x - w / 2, y0, w, y1 - y0);
  fillOl(ctx, cylH(ctx, x - w / 2, w, base), 5);
  let y = y0 + 40 + r() * 60;
  while (y < y1 - 20) {
    ctx.beginPath();
    ctx.rect(x - w / 2 - 3, y - 5, w + 6, 10);
    fillOl(ctx, cylH(ctx, x - w / 2 - 3, w + 6, shade(base, -0.1)), 3);
    y += 110 + r() * 60;
  }
}

function drawBeach(ctx: Ctx, r: R): void {
  const { sun, horizon: hz } = BE;
  vgrad(ctx, 0, 0, W, hz, [
    [0, '#1a2160'],
    [0.32, '#5a3586'],
    [0.62, '#d0587a'],
    [0.86, '#ffa25e'],
    [1, '#ffd890'],
  ]);
  stars(ctx, r, 0, 100, W, 160, 50, 0.5);
  glow(ctx, sun.x, sun.y, 820, '#ff8a5a', 0.4, 0.55);
  glow(ctx, sun.x, sun.y, 260, '#ffe08a', 0.65);
  ctx.save();
  clipRect(ctx, 0, 0, W, hz);
  ellipse(ctx, sun.x, sun.y, 130, 130);
  ctx.fillStyle = lgrad(ctx, 0, sun.y - 130, 0, sun.y + 60, [
    [0, '#fff6c8'],
    [1, '#ff9a4a'],
  ]);
  ctx.fill();
  ctx.fillStyle = '#f7a066';
  for (let k = 0; k < 4; k++) ctx.fillRect(sun.x - 140, sun.y - 50 + k * 20, 280, 3 + k * 2);
  ctx.restore();
  // clouds
  for (let i = 0; i < 7; i++) {
    const cx = r() * W;
    const cy = 220 + r() * 220;
    const cw = 260 + r() * 360;
    const chh = 16 + r() * 20;
    cloudStreak(ctx, r, cx, cy, cw, chh, rgba('#ffc8a0', 0.65), rgba('#7a3070', 0.5));
  }
  // island
  ctx.fillStyle = '#4a2a5a';
  ctx.beginPath();
  ctx.moveTo(220, hz + 2);
  ctx.quadraticCurveTo(330, hz - 46, 480, hz - 30);
  ctx.quadraticCurveTo(620, hz - 20, 700, hz + 2);
  ctx.fill();
  palm(ctx, 430, hz - 30, 450, hz - 110, 0.3, '#4a2a5a', r);
  palm(ctx, 520, hz - 26, 505, hz - 90, 0.25, '#4a2a5a', r);
  // ocean
  vgrad(ctx, 0, hz, W, TY - hz, [
    [0, '#5a4a8a'],
    [0.15, '#2e3a72'],
    [1, '#101a3e'],
  ]);
  ctx.strokeStyle = 'rgba(160,190,255,0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 60; i++) {
    const y = hz + 6 + Math.pow(r(), 1.6) * (TY - hz);
    const x = r() * W;
    const w = 40 + (y - hz) * 0.8 * r();
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x, y - 4, x + w / 2, y);
    ctx.stroke();
  }
  // glitter path
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 700; i++) {
    const t = Math.pow(r(), 1.3);
    const y = hz + 3 + t * (TY - hz);
    const spread = 70 + t * 520;
    const x = sun.x + (r() - 0.5) * spread * (r() + r()) * 0.6;
    const w = 6 + t * 40 * r();
    ctx.fillStyle = rgba(r() > 0.3 ? '#ffd890' : '#ff9a6a', (0.3 + r() * 0.7) * (1 - t * 0.5));
    ctx.fillRect(x - w / 2, y, w, 1.5 + t * 3);
  }
  ctx.restore();
  glow(ctx, sun.x, hz, 400, '#ffb070', 0.35, 0.2);
  // sand dunes + grass behind the bar
  ctx.beginPath();
  ctx.moveTo(0, TY);
  ctx.lineTo(0, 680);
  ctx.bezierCurveTo(300, 650, 600, 700, 900, 690);
  ctx.bezierCurveTo(1200, 680, 1500, 650, W, 690);
  ctx.lineTo(W, TY);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, 650, 0, TY, [
    [0, '#d8a070'],
    [1, '#7a4a48'],
  ]), 4);
  ctx.strokeStyle = '#3a3a2a';
  ctx.lineWidth = 3;
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const y = 690 + r() * 30;
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 10, y - 10, x + (r() - 0.5) * 30, y - 20 - r() * 20);
    ctx.stroke();
  }
  // palms
  palm(ctx, 150, TY, 330, 250, 1.05, '#1e1226', r, '#ff9a6a');
  palm(ctx, 1800, TY, 1640, 300, 0.95, '#1e1226', r, '#ff9a6a');
  // tiki torch
  const { torch } = BE;
  bambooV(ctx, torch.x, torch.y + 30, TY + 10, 22, '#9a6a34', r);
  ctx.beginPath();
  ctx.moveTo(torch.x - 22, torch.y + 40);
  ctx.lineTo(torch.x + 22, torch.y + 40);
  ctx.lineTo(torch.x + 16, torch.y);
  ctx.lineTo(torch.x - 16, torch.y);
  ctx.closePath();
  fillOl(ctx, '#5a3a20', 4);
  glow(ctx, torch.x, torch.y - 30, 200, '#ff8a2a', 0.5);
  flame(ctx, torch.x, torch.y + 2, 46, 96, r, ['#ff4a10', '#ffa020', '#fff0a0']);
  // surfboard
  ctx.save();
  ctx.translate(1700, 500);
  ctx.rotate(-0.12);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 18, 10, 64, 290);
  ctx.fill();
  ellipse(ctx, 0, 0, 64, 290);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = hgrad(ctx, -64, 64, [
    [0, '#1c8a8a'],
    [0.35, '#4ad6c8'],
    [1, '#126060'],
  ]);
  ctx.fillRect(-70, -300, 140, 600);
  ctx.fillStyle = '#ff7a3a';
  ctx.fillRect(-70, -120, 140, 40);
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(-70, -70, 140, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(-3, -300, 6, 600);
  ctx.restore();
  ellipse(ctx, 0, 0, 64, 290);
  outline(ctx, 5);
  ctx.restore();
  // bamboo frame posts
  bambooV(ctx, 40, 90, TY + 10, 70, '#b88a44', r);
  bambooV(ctx, W - 40, 90, TY + 10, 70, '#b88a44', r);
  // thatch roof
  ctx.fillStyle = '#5a3c1c';
  ctx.fillRect(0, 0, W, 120);
  for (let i = 0; i < 900; i++) {
    const x = r() * W;
    const y = r() * 120;
    const len = 30 + r() * 60;
    ctx.strokeStyle = shade(r() > 0.5 ? '#c8a050' : '#9a7434', (r() - 0.5) * 0.3);
    ctx.lineWidth = 2 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 10, y + len);
    ctx.stroke();
  }
  // fringe
  ctx.beginPath();
  ctx.moveTo(0, 100);
  for (let x = 0; x <= W; x += 24) ctx.lineTo(x + 12, 128 + r() * 34), ctx.lineTo(x + 24, 108 + r() * 10);
  ctx.lineTo(W, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 500; i++) {
    const x = r() * W;
    ctx.strokeStyle = shade('#b08840', (r() - 0.5) * 0.5);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, 90);
    ctx.lineTo(x + (r() - 0.5) * 8, 170);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, 100);
  for (let x = 0; x <= W; x += 24) ctx.lineTo(x + 12, 128 + r() * 34), ctx.lineTo(x + 24, 108 + r() * 10);
  ctx.strokeStyle = rgba(OL, 0.8);
  ctx.lineWidth = 3;
  ctx.stroke();
  vgrad(ctx, 0, 0, W, 170, [
    [0, 'rgba(0,0,0,0.35)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  // hanging sign
  const sx = 960;
  const sy = 205;
  ctx.strokeStyle = '#7a5a30';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(sx - 220, 120);
  ctx.lineTo(sx - 200, sy - 40);
  ctx.moveTo(sx + 220, 120);
  ctx.lineTo(sx + 200, sy - 40);
  ctx.stroke();
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-0.015);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, -300 + 10, -52 + 12, 600, 104, 14);
  ctx.fill();
  roundRect(ctx, -300, -52, 600, 104, 14);
  fillOl(ctx, lgrad(ctx, 0, -52, 0, 52, [
    [0, '#c48a4a'],
    [0.5, '#a06a34'],
    [1, '#6a4020'],
  ]), 6);
  ctx.strokeStyle = 'rgba(40,20,5,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-290, -36 + i * 15);
    ctx.bezierCurveTo(-100, -40 + i * 15 + r() * 8, 100, -30 + i * 15, 290, -36 + i * 15 + r() * 6);
    ctx.stroke();
  }
  ctx.font = `bold 62px ${SLAB}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3a1e0a';
  ctx.fillText('SHACK ATTACK', 3, 6);
  ctx.fillStyle = '#ffe2a0';
  ctx.fillText('SHACK ATTACK', 0, 2);
  ctx.restore();
  // fairy lights rope
  drawWires(ctx, BE.swags, '#8a6a3a', 6);
  drawWires(ctx, BE.swags, 'rgba(40,20,5,0.6)', 2);
  drawBulbs(ctx, BE_BULBS, 0.8, 0.6);
  // bamboo table
  const f = BE.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  ctx.fillStyle = '#4a3018';
  ctx.fillRect(0, TY, W, f - TY);
  const zf = zFront(f);
  let z = ZB;
  while (z > zf) {
    const dz = 0.085 + r() * 0.01;
    const y0 = yAt(z);
    const y1 = yAt(z - dz);
    const base = shade('#b88e50', (r() - 0.5) * 0.2);
    ctx.fillStyle = lgrad(ctx, 0, y0, 0, y1, [
      [0, shade(base, -0.4)],
      [0.3, shade(base, 0.25)],
      [0.55, base],
      [1, shade(base, -0.45)],
    ]);
    roundRect(ctx, -10, y0 + 1, W + 20, y1 - y0 - 1.5, (y1 - y0) / 2);
    ctx.fill();
    // nodes
    let X = -2.6 + r() * 0.5;
    while (X < 2.6) {
      const x0 = xAt(X, z);
      const hgt = y1 - y0;
      ctx.fillStyle = rgba(shade(base, -0.5), 0.7);
      ctx.fillRect(x0 - 2, y0 + 2, 4, hgt - 3);
      ctx.fillStyle = rgba(shade(base, 0.4), 0.6);
      ctx.fillRect(x0 + 2, y0 + 2, 2, hgt - 3);
      X += 0.5 + r() * 0.4;
    }
    z -= dz;
  }
  grainRect(ctx, 0, TY, W, f - TY, 0.25);
  ctx.restore();
  frontFace(ctx, f, () => {
    ctx.fillStyle = cylV(ctx, f, H - f, '#c09450');
    ctx.fillRect(0, f, W, H - f);
    // lashings
    for (let x = 140; x < W; x += 420) {
      ctx.fillStyle = '#6a4a26';
      ctx.fillRect(x, f, 26, H - f);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      for (let y = f + 6; y < H; y += 8) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 26, y + 4);
        ctx.stroke();
      }
    }
  }, 0.3);
  contactShadow(ctx, 0.45);
  glow(ctx, sun.x, 860, 700, '#ffb070', 0.1, 0.3);
  tableLight(ctx, '#ffc27a', 0.04, 0.5);
  grade(ctx, 0.08);
  vignette(ctx, 0.7, '#0e0618');
}

// ---------------------------------------------------------------------------------------------
// 4. Neon Diner '86

const DN = {
  open: { x: 330, y: 250 },
  pizza: { x: 960, y: 200 },
  foot: { x: 1500, y: 280 },
  juke: { x: 1760, y: 470 },
  front: 1036,
};

function drawDiner(ctx: Ctx, r: R): void {
  // upper wall: dark teal with vertical pinstripes
  vgrad(ctx, 0, 0, W, 430, [
    [0, '#0c1e2a'],
    [1, '#1c4a56'],
  ]);
  ctx.fillStyle = 'rgba(120,220,220,0.06)';
  for (let x = 0; x < W; x += 48) ctx.fillRect(x, 0, 18, 430);
  grainRect(ctx, 0, 0, W, 430, 0.25);
  // ceiling cove neon
  ctx.fillStyle = '#0a1016';
  ctx.fillRect(0, 0, W, 98);
  neonStroke(ctx, '#ff4fb0', 6, () => {
    ctx.beginPath();
    ctx.moveTo(-10, 104);
    ctx.lineTo(W + 10, 104);
    ctx.stroke();
  });
  // lower wall: pink tiles
  const ly = 430;
  ctx.fillStyle = '#7a2a52';
  ctx.fillRect(0, ly, W, TY - ly);
  for (let y = ly + 30; y < 690; y += 40)
    for (let x = ((y / 40) % 2) * 0; x < W; x += 40) {
      const c = shade('#d06a98', (r() - 0.5) * 0.1);
      ctx.fillStyle = c;
      ctx.fillRect(x + 2, y + 2, 36, 36);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + 3, y + 3, 34, 3);
    }
  // chrome band
  const chrome = (y: number, h: number): void => {
    ctx.fillStyle = lgrad(ctx, 0, y, 0, y + h, [
      [0, '#f4f8ff'],
      [0.3, '#8a96a8'],
      [0.5, '#e8eef6'],
      [0.75, '#5a6274'],
      [1, '#c8d0dc'],
    ]);
    ctx.fillRect(0, y, W, h);
    ctx.fillStyle = rgba(OL, 0.8);
    ctx.fillRect(0, y - 2, W, 3);
    ctx.fillRect(0, y + h - 1, W, 3);
  };
  chrome(ly, 30);
  // floor (checker) behind the counter
  const fy = 690;
  const h2 = 1.25;
  ctx.save();
  clipRect(ctx, 0, fy, W, TY - fy);
  ctx.fillStyle = '#e8e4dc';
  ctx.fillRect(0, fy, W, TY - fy);
  ctx.fillStyle = '#1a1820';
  ctx.beginPath();
  const zf0 = (FOC * h2) / (fy - HY);
  const cell = 0.42;
  for (let j = 0; j < 5; j++) {
    const z0 = zf0 - j * cell;
    const z1 = z0 - cell;
    for (let i = -14; i < 14; i++) {
      if ((i + j) % 2 === 0) continue;
      const pts: [number, number][] = [
        [i * cell, z0],
        [(i + 1) * cell, z0],
        [(i + 1) * cell, z1],
        [i * cell, z1],
      ];
      pts.forEach(([X, z], k) => {
        const px = VX + (FOC * X) / z;
        const py = HY + (FOC * h2) / z;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.closePath();
    }
  }
  ctx.fill();
  vgrad(ctx, 0, fy, W, TY - fy, [
    [0, 'rgba(10,0,20,0.55)'],
    [1, 'rgba(10,0,20,0.2)'],
  ]);
  ctx.restore();
  chrome(fy - 14, 16);
  // booths
  for (const [bx, bw] of [
    [360, 520],
    [1040, 520],
  ] as [number, number][]) {
    const top = 470;
    const bot = fy - 10;
    ctx.beginPath();
    ctx.roundRect(bx, top, bw, bot - top + 20, [40, 40, 0, 0]);
    fillOl(ctx, lgrad(ctx, 0, top, 0, bot, [
      [0, '#e2404a'],
      [1, '#7a1420'],
    ]), 6);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const cx = bx + 20 + ((bw - 40) * (i + 0.5)) / n;
      const cw = (bw - 40) / n - 6;
      roundRect(ctx, cx - cw / 2, top + 20, cw, bot - top - 26, cw / 2);
      ctx.fillStyle = hgrad(ctx, cx - cw / 2, cx + cw / 2, [
        [0, '#8a1a24'],
        [0.3, '#ff6a6a'],
        [0.5, '#d83440'],
        [1, '#6a1018'],
      ]);
      ctx.fill();
      ctx.strokeStyle = rgba(OL, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // chrome cap
    roundRect(ctx, bx - 6, top - 10, bw + 12, 22, 11);
    fillOl(ctx, cylV(ctx, top - 10, 22, '#c8d0dc'), 4);
  }
  // jukebox
  const { juke } = DN;
  const jx = juke.x;
  const jw = 230;
  const jt = 300;
  const jb = fy + 10;
  glow(ctx, jx, 520, 340, '#ff7ad9', 0.25);
  ctx.beginPath();
  ctx.moveTo(jx - jw / 2, jb);
  ctx.lineTo(jx - jw / 2, jt + jw / 2);
  ctx.arc(jx, jt + jw / 2, jw / 2, Math.PI, 0);
  ctx.lineTo(jx + jw / 2, jb);
  ctx.closePath();
  fillOl(ctx, hgrad(ctx, jx - jw / 2, jx + jw / 2, [
    [0, '#4a1a10'],
    [0.3, '#a8582a'],
    [0.7, '#7a3a1a'],
    [1, '#3a140a'],
  ]), 6);
  // rainbow tube arch
  const tubes = ['#ff3a6a', '#ffb02a', '#ffee5a', '#5aff9a', '#5ac8ff'];
  tubes.forEach((c, i) => {
    neonStroke(ctx, c, 6, () => {
      ctx.beginPath();
      ctx.arc(jx, jt + jw / 2, jw / 2 - 14 - i * 9, Math.PI, 0);
      ctx.lineTo(jx + jw / 2 - 14 - i * 9, jt + jw / 2 + 130);
      ctx.moveTo(jx - jw / 2 + 14 + i * 9, jt + jw / 2 + 130);
      ctx.lineTo(jx - jw / 2 + 14 + i * 9, jt + jw / 2);
      ctx.stroke();
    });
  });
  // record window
  roundRect(ctx, jx - 52, jt + 70, 104, 80, 10);
  fillOl(ctx, '#1a1020', 4);
  ellipse(ctx, jx, jt + 116, 36, 12);
  fillOl(ctx, '#0a0a0a', 2);
  ellipse(ctx, jx, jt + 114, 10, 4);
  ctx.fillStyle = '#ff4a6a';
  ctx.fill();
  // grille
  roundRect(ctx, jx - 60, jt + 200, 120, jb - jt - 220, 10);
  fillOl(ctx, '#2a1810', 4);
  ctx.strokeStyle = '#c8d0dc';
  ctx.lineWidth = 3;
  for (let x = jx - 48; x <= jx + 48; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, jt + 208);
    ctx.lineTo(x, jb - 28);
    ctx.stroke();
  }
  // neon signs
  const { open, pizza, foot } = DN;
  roundRect(ctx, open.x - 170, open.y - 80, 340, 160, 20);
  fillOl(ctx, 'rgba(10,8,18,0.6)', 4);
  neonText(ctx, 'Open', open.x, open.y + 4, 110, SCRIPT, '#ff3a5a', undefined, 6);
  neonStroke(ctx, '#3ae0ff', 5, () => {
    roundRect(ctx, open.x - 150, open.y - 62, 300, 124, 14);
    ctx.stroke();
  });
  neonText(ctx, 'PIZZA', pizza.x, pizza.y, 140, ROUND, '#3ae8ff', undefined, 8);
  neonStroke(ctx, '#ff4fb0', 6, () => {
    ctx.beginPath();
    ctx.moveTo(pizza.x - 260, pizza.y + 86);
    ctx.lineTo(pizza.x + 260, pizza.y + 86);
    ctx.stroke();
  });
  // neon foot with slash
  neonStroke(ctx, '#ffb84a', 6, () => {
    ctx.beginPath();
    footPath(ctx, foot.x, foot.y + 6, 150);
    ctx.stroke();
  });
  neonStroke(ctx, '#ff3a5a', 9, () => {
    ctx.beginPath();
    ctx.arc(foot.x, foot.y, 100, 0, Math.PI * 2);
    ctx.moveTo(foot.x - 70, foot.y - 70);
    ctx.lineTo(foot.x + 70, foot.y + 70);
    ctx.stroke();
  });
  glow(ctx, pizza.x, pizza.y, 520, '#3ae8ff', 0.18, 0.5);
  glow(ctx, open.x, open.y, 340, '#ff3a5a', 0.16);
  glow(ctx, foot.x, foot.y, 300, '#ff5a6a', 0.16);
  // formica counter
  const f = DN.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  ctx.fillStyle = lgrad(ctx, 0, TY, 0, f, [
    [0, '#2e7276'],
    [1, '#4a9894'],
  ]);
  ctx.fillRect(0, TY, W, f - TY);
  for (let i = 0; i < 1400; i++) {
    const X = (r() - 0.5) * 4.4;
    const z = zFront(f) + r() * (ZB - zFront(f));
    const x = xAt(X, z);
    if (x < -10 || x > W + 10) continue;
    const y = yAt(z);
    const s = FOC / z / 460;
    const c = r();
    ctx.fillStyle = c < 0.4 ? 'rgba(255,140,190,0.75)' : c < 0.7 ? 'rgba(255,255,255,0.6)' : 'rgba(10,50,60,0.6)';
    ctx.fillRect(x, y, (2 + r() * 4) * s, (1 + r() * 1.5) * s);
  }
  // boomerangs
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const X = (r() - 0.5) * 4.2;
    const z = zFront(f) + r() * (ZB - zFront(f));
    const x = xAt(X, z);
    const y = yAt(z);
    const s = FOC / z / 460;
    ctx.strokeStyle = r() > 0.5 ? 'rgba(255,120,180,0.45)' : 'rgba(255,230,120,0.4)';
    ctx.beginPath();
    ctx.moveTo(x - 16 * s, y + 3 * s);
    ctx.quadraticCurveTo(x, y - 6 * s, x + 16 * s, y + 2 * s);
    ctx.stroke();
  }
  // reflections of the neon
  glow(ctx, pizza.x, 800, 500, '#3ae8ff', 0.12, 0.2);
  glow(ctx, foot.x, 820, 320, '#ff5a8a', 0.1, 0.25);
  ctx.restore();
  // chrome back edge
  ctx.fillStyle = cylV(ctx, TY, 12, '#c8d0dc');
  ctx.fillRect(0, TY, W, 12);
  frontFace(ctx, f, () => {
    ctx.fillStyle = cylV(ctx, f, H - f, '#b8c2d0');
    ctx.fillRect(0, f, W, H - f);
    ctx.fillStyle = 'rgba(40,50,70,0.35)';
    for (let y = f + 10; y < H; y += 9) ctx.fillRect(0, y, W, 3);
    glow(ctx, VX, f + 20, 600, '#ff7ad9', 0.18, 0.1);
  }, 0.3);
  contactShadow(ctx, 0.5);
  tableLight(ctx, '#e6a8ff', 0.05, 0.45);
  grade(ctx, 0.06);
  vignette(ctx, 0.75, '#08040e');
}

// ---------------------------------------------------------------------------------------------
// 5. Alpine Lodge

const LG = {
  win: { x0: 650, x1: 1290, y0: 170, y1: 540 },
  fire: { x: 250, y: 650 },
  sconce: { x: 1490, y: 360 },
  front: 1040,
};

function drawLodge(ctx: Ctx, r: R): void {
  // log wall
  const lh = 64;
  for (let y = -20; y < TY; y += lh) {
    const base = shade('#a06a38', (r() - 0.5) * 0.2);
    ctx.fillStyle = '#d8c4a0';
    ctx.fillRect(0, y, W, lh);
    roundRect(ctx, -10, y + 5, W + 20, lh - 8, (lh - 8) / 2);
    ctx.fillStyle = cylV(ctx, y + 5, lh - 8, base);
    ctx.fill();
    ctx.strokeStyle = rgba(OL, 0.8);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 40; i++) {
      const x = r() * W;
      const yy = y + 12 + r() * (lh - 24);
      ctx.strokeStyle = rgba(shade(base, -0.5), 0.35);
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + 40 + r() * 120, yy + (r() - 0.5) * 4);
      ctx.stroke();
    }
    if (r() < 0.8) {
      const kx = r() * W;
      ellipse(ctx, kx, y + lh / 2, 12, 8);
      ctx.fillStyle = rgba(shade(base, -0.5), 0.7);
      ctx.fill();
    }
  }
  grainRect(ctx, 0, 0, W, TY, 0.25);
  vgrad(ctx, 0, 0, W, TY, [
    [0, 'rgba(20,8,2,0.55)'],
    [0.5, 'rgba(20,8,2,0.15)'],
    [1, 'rgba(20,8,2,0.35)'],
  ]);
  // window scene
  const { x0, x1, y0, y1 } = LG.win;
  const ww = x1 - x0;
  const wh = y1 - y0;
  ctx.save();
  clipRect(ctx, x0, y0, ww, wh);
  vgrad(ctx, x0, y0, ww, wh, [
    [0, '#070c24'],
    [0.6, '#1a2a5a'],
    [1, '#3a4f86'],
  ]);
  stars(ctx, r, x0, y0, ww, wh * 0.6, 120);
  moon(ctx, x1 - 130, y0 + 90, 42, r);
  // aurora
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = rgba(k % 2 ? '#5affc0' : '#5ad0ff', 0.08);
    ctx.lineWidth = 40 - k * 8;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 120 + k * 16);
    ctx.bezierCurveTo(x0 + ww * 0.3, y0 + 40, x0 + ww * 0.6, y0 + 170, x1, y0 + 80 + k * 10);
    ctx.stroke();
  }
  ctx.restore();
  const mtn = (peaks: number[][], col: string, snow: string): void => {
    ctx.beginPath();
    ctx.moveTo(x0 - 10, y1 + 10);
    for (const [px, py] of peaks) ctx.lineTo(x0 + px * ww, y0 + py * wh);
    ctx.lineTo(x1 + 10, y1 + 10);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.fillStyle = snow;
    for (let i = 1; i < peaks.length - 1; i++) {
      const [px, py] = peaks[i];
      const [ax, ay] = peaks[i - 1];
      const [bx, by] = peaks[i + 1];
      const t = 0.35;
      ctx.beginPath();
      ctx.moveTo(x0 + px * ww, y0 + py * wh);
      ctx.lineTo(x0 + (px + (ax - px) * t) * ww, y0 + (py + (ay - py) * t) * wh);
      ctx.lineTo(x0 + (px + (ax - px) * t * 0.5) * ww, y0 + (py + (ay - py) * t * 0.8) * wh);
      ctx.lineTo(x0 + px * ww, y0 + (py + 0.06) * wh);
      ctx.lineTo(x0 + (px + (bx - px) * t * 0.6) * ww, y0 + (py + (by - py) * t * 0.7) * wh);
      ctx.lineTo(x0 + (px + (bx - px) * t) * ww, y0 + (py + (by - py) * t) * wh);
      ctx.closePath();
      ctx.fill();
    }
  };
  mtn([[-0.05, 0.75], [0.12, 0.42], [0.25, 0.6], [0.42, 0.3], [0.6, 0.55], [0.78, 0.38], [0.95, 0.6], [1.05, 0.5]], '#4a5a8a', '#c8d8f0');
  mtn([[-0.05, 0.85], [0.18, 0.6], [0.35, 0.78], [0.55, 0.55], [0.75, 0.8], [0.9, 0.62], [1.05, 0.8]], '#2a3866', '#a8bce0');
  // snowy ground + pines
  ctx.fillStyle = '#b8c8e8';
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.quadraticCurveTo(x0 + ww * 0.5, y1 - 70, x1, y1 - 30);
  ctx.lineTo(x1, y1);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const px = x0 + 20 + r() * (ww - 40);
    const ph = 60 + r() * 80;
    pine(ctx, px, y1 - 10 + r() * 10, ph, ph * 0.55, '#142040', 5, 'rgba(220,235,255,0.85)');
  }
  for (let i = 0; i < 160; i++) {
    const sx = x0 + r() * ww;
    const sy = y0 + r() * wh;
    const s = 1 + r() * 2.5;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.5})`;
    ellipse(ctx, sx, sy, s, s);
    ctx.fill();
  }
  // frost corners + glare
  for (const [cx, cy] of [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ])
    darkSpot(ctx, cx, cy, 120, 120, 0.4, '#e8f4ff');
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.moveTo(x0 + 80, y0);
  ctx.lineTo(x0 + 200, y0);
  ctx.lineTo(x0 + 40, y1);
  ctx.lineTo(x0 - 80, y1);
  ctx.fill();
  ctx.restore();
  // frame & mullions
  const wood = '#6a4022';
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 46;
  ctx.strokeRect(x0 - 18, y0 - 18, ww + 36, wh + 36);
  ctx.strokeStyle = wood;
  ctx.lineWidth = 36;
  ctx.strokeRect(x0 - 18, y0 - 18, ww + 36, wh + 36);
  ctx.strokeStyle = shade(wood, 0.3);
  ctx.lineWidth = 4;
  ctx.strokeRect(x0 - 30, y0 - 30, ww + 60, wh + 60);
  ctx.lineJoin = 'round';
  for (const [mx, my, mw, mh] of [
    [x0 + ww / 2 - 9, y0, 18, wh],
    [x0, y0 + wh * 0.45 - 9, ww, 18],
  ]) {
    ctx.beginPath();
    ctx.rect(mx, my, mw, mh);
    fillOl(ctx, wood, 4);
  }
  // sill with snow-lantern
  ctx.beginPath();
  ctx.rect(x0 - 60, y1 + 30, ww + 120, 30);
  fillOl(ctx, cylV(ctx, y1 + 30, 30, '#8a5a32'), 5);
  vgrad(ctx, x0 - 60, y1 + 60, ww + 120, 30, [
    [0, 'rgba(0,0,0,0.4)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  // curtains (tied back)
  for (const side of [-1, 1]) {
    const cx = side < 0 ? x0 - 130 : x1 + 130;
    const top = y0 - 66;
    const bot = y1 + 90;
    const tie = y1 - 40;
    const shape = (): void => {
      ctx.beginPath();
      ctx.moveTo(-70, top);
      ctx.lineTo(80, top);
      ctx.bezierCurveTo(78, top + 120, 30, tie - 80, 20, tie);
      ctx.bezierCurveTo(30, tie + 40, 60, bot - 40, 70, bot);
      ctx.lineTo(-70, bot);
      ctx.closePath();
    };
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(-side, 1);
    ctx.save();
    ctx.translate(10, 12);
    shape();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.restore();
    shape();
    ctx.fillStyle = '#8a1e1e';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(20,60,30,0.55)';
    for (let x = -80; x < 100; x += 46) ctx.fillRect(x, top, 20, bot - top);
    for (let y = top; y < bot; y += 46) ctx.fillRect(-80, y, 180, 20);
    ctx.fillStyle = 'rgba(240,200,80,0.4)';
    for (let x = -70; x < 100; x += 46) ctx.fillRect(x, top, 3, bot - top);
    ctx.fillStyle = hgrad(ctx, -80, 90, [
      [0, 'rgba(0,0,0,0.45)'],
      [0.2, 'rgba(255,255,255,0.1)'],
      [0.45, 'rgba(0,0,0,0.35)'],
      [0.7, 'rgba(255,255,255,0.08)'],
      [1, 'rgba(0,0,0,0.4)'],
    ]);
    ctx.fillRect(-80, top, 180, bot - top);
    ctx.restore();
    shape();
    outline(ctx, 5);
    // tie-back
    roundRect(ctx, -76, tie - 12, 104, 24, 10);
    fillOl(ctx, cylV(ctx, tie - 12, 24, '#d8a83a'), 4);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.rect(x0 - 230, y0 - 74, ww + 460, 16);
  fillOl(ctx, cylV(ctx, y0 - 74, 16, '#3a2a1e'), 4);
  // fireplace (stone)
  const fx = LG.fire.x;
  const fl = 30;
  const fr = 470;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(fr, 0, 24, TY);
  ctx.save();
  ctx.beginPath();
  ctx.rect(fl, -10, fr - fl, TY + 10);
  ctx.fillStyle = '#4a4440';
  ctx.fill();
  ctx.clip();
  for (let y = -10; y < TY; y += 46) {
    let x = fl - r() * 40;
    while (x < fr) {
      const sw = 50 + r() * 50;
      const c = shade(r() > 0.5 ? '#8a8078' : '#9a8a72', (r() - 0.5) * 0.25);
      roundRect(ctx, x + 3, y + 3 + (r() - 0.5) * 4, sw - 6, 42, 14);
      ctx.fillStyle = lgrad(ctx, 0, y, 0, y + 46, [
        [0, shade(c, 0.15)],
        [1, shade(c, -0.25)],
      ]);
      ctx.fill();
      ctx.strokeStyle = rgba(OL, 0.6);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      x += sw;
    }
  }
  mottle(ctx, fl, 0, fr - fl, TY, 0.2, 0.6);
  ctx.restore();
  ctx.beginPath();
  ctx.rect(fl, -10, fr - fl, TY + 10);
  outline(ctx, 5);
  // firebox
  const fy = LG.fire.y;
  ctx.beginPath();
  ctx.moveTo(fx - 140, TY + 5);
  ctx.lineTo(fx - 140, fy - 80);
  ctx.quadraticCurveTo(fx, fy - 170, fx + 140, fy - 80);
  ctx.lineTo(fx + 140, TY + 5);
  ctx.closePath();
  const fg = ctx.createRadialGradient(fx, TY, 10, fx, fy - 40, 200);
  fg.addColorStop(0, '#ffc050');
  fg.addColorStop(0.3, '#d0501a');
  fg.addColorStop(0.7, '#3a1008');
  fg.addColorStop(1, '#100604');
  fillOl(ctx, fg, 6);
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, fx - 110 + i * 20, TY - 40 - i * 18, 200, 30, 15);
    fillOl(ctx, cylV(ctx, TY - 40 - i * 18, 30, '#5a3418'), 3);
  }
  for (let i = 0; i < 4; i++) flame(ctx, fx - 75 + i * 50, TY - 34, 90, 110 + r() * 70, r, ['#ff3a0a', '#ff9a1a', '#fff27a']);
  glow(ctx, fx, TY - 40, 160, '#ffb040', 0.6);
  ctx.restore();
  // mantel
  ctx.beginPath();
  ctx.rect(fl - 30, fy - 210, fr - fl + 60, 40);
  fillOl(ctx, cylV(ctx, fy - 210, 40, '#6a4022'), 6);
  vgrad(ctx, fl, fy - 170, fr - fl, 30, [
    [0, 'rgba(0,0,0,0.45)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  // candles on mantel
  for (const cx of [fl + 50, fr - 50]) {
    roundRect(ctx, cx - 12, fy - 270, 24, 60, 4);
    fillOl(ctx, cylH(ctx, cx - 12, 24, '#f2e6c8'), 4);
    flame(ctx, cx, fy - 268, 16, 34, r, ['#ff6a1a', '#ffb030', '#fff6c0']);
    glow(ctx, cx, fy - 290, 80, '#ffb050', 0.45);
  }
  // antlers above the mantel
  const ax = fx;
  const ay = 250;
  ctx.beginPath();
  ctx.moveTo(ax - 50, ay - 40);
  ctx.lineTo(ax + 50, ay - 40);
  ctx.lineTo(ax + 40, ay + 60);
  ctx.quadraticCurveTo(ax, ay + 80, ax - 40, ay + 60);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, ax - 50, 100, '#6a4022'), 5);
  for (const sd of [-1, 1]) {
    ctx.strokeStyle = OL;
    ctx.lineWidth = 20;
    const path = (): void => {
      ctx.beginPath();
      ctx.moveTo(ax + sd * 20, ay);
      ctx.bezierCurveTo(ax + sd * 90, ay - 10, ax + sd * 150, ay - 60, ax + sd * 160, ay - 150);
      ctx.moveTo(ax + sd * 70, ay - 12);
      ctx.quadraticCurveTo(ax + sd * 70, ay - 70, ax + sd * 50, ay - 110);
      ctx.moveTo(ax + sd * 115, ay - 40);
      ctx.quadraticCurveTo(ax + sd * 120, ay - 100, ax + sd * 100, ay - 150);
      ctx.moveTo(ax + sd * 145, ay - 80);
      ctx.quadraticCurveTo(ax + sd * 180, ay - 110, ax + sd * 200, ay - 120);
      ctx.stroke();
    };
    path();
    ctx.strokeStyle = '#e8dcc0';
    ctx.lineWidth = 11;
    path();
  }
  // skis on the right
  for (const [sx, rot, col] of [
    [1690, -0.1, '#c83a2a'],
    [1760, 0.06, '#2a6ac8'],
  ] as [number, number, string][]) {
    ctx.save();
    ctx.translate(sx, TY);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, -10, -560, 34, 560, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-17, 0);
    ctx.lineTo(-17, -520);
    ctx.quadraticCurveTo(-17, -580, 10, -590);
    ctx.quadraticCurveTo(17, -560, 17, -520);
    ctx.lineTo(17, 0);
    ctx.closePath();
    fillOl(ctx, cylH(ctx, -17, 34, col), 5);
    ctx.fillStyle = '#f2ead8';
    ctx.fillRect(-17, -330, 34, 18);
    ctx.fillRect(-4, -520, 8, 180);
    ctx.restore();
  }
  // wall sconce
  const { sconce } = LG;
  glow(ctx, sconce.x, sconce.y, 260, '#ffb050', 0.35);
  ctx.beginPath();
  ctx.rect(sconce.x - 10, sconce.y + 10, 20, 70);
  fillOl(ctx, '#3a2a1e', 4);
  ctx.beginPath();
  ctx.moveTo(sconce.x - 36, sconce.y + 20);
  ctx.lineTo(sconce.x + 36, sconce.y + 20);
  ctx.lineTo(sconce.x + 24, sconce.y - 40);
  ctx.lineTo(sconce.x - 24, sconce.y - 40);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, sconce.y - 40, 0, sconce.y + 20, [
    [0, '#fff0c0'],
    [1, '#ffb050'],
  ]), 5);
  glow(ctx, sconce.x, sconce.y - 10, 90, '#ffd080', 0.6);
  // plaid tablecloth
  bandCloth(ctx, LG.front, '#9a2620', [
    { period: 0.36, width: 0.15, offset: 0.02, color: rgba('#16381f', 0.62) },
    { period: 0.36, width: 0.04, offset: 0.24, color: rgba('#100806', 0.35) },
    { period: 0.36, width: 0.012, offset: 0.3, color: rgba('#f0c860', 0.55) },
  ]);
  contactShadow(ctx, 0.55);
  glow(ctx, LG.fire.x, 800, 500, '#ff8a3a', 0.16, 0.3);
  glow(ctx, LG.fire.x, 640, 360, '#ff7a2a', 0.18);
  tableLight(ctx, '#ffc890', 0.06, 0.45);
  grade(ctx, 0.1);
  vignette(ctx, 0.8, '#0a0402');
}

// ---------------------------------------------------------------------------------------------
// 6. Orbital Pizzeria

const SP = {
  win: { x0: 400, x1: 1520, y0: 140, y1: 560 },
  sign: { x: 1730, y: 330 },
  leds: [
    [250, 640, '#ff4a4a'],
    [290, 640, '#4aff8a'],
    [330, 640, '#4ad8ff'],
    [1600, 640, '#ffb84a'],
    [1640, 640, '#4aff8a'],
    [1680, 640, '#ff4a4a'],
  ] as [number, number, string][],
  front: 1036,
};

function drawSpace(ctx: Ctx, r: R): void {
  // hull panels
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#1a2030'],
    [1, '#3a4458'],
  ]);
  const pw = 240;
  const ph = 190;
  for (let y = 0; y < TY; y += ph)
    for (let x = ((y / ph) % 2) * (pw / 2) - pw / 2; x < W; x += pw) {
      const c = shade('#4a5468', (r() - 0.5) * 0.15);
      ctx.fillStyle = lgrad(ctx, x, y, x + pw, y + ph, [
        [0, shade(c, 0.12)],
        [1, shade(c, -0.2)],
      ]);
      ctx.fillRect(x + 4, y + 4, pw - 8, ph - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 4, y + 4, pw - 8, 2);
      ctx.fillRect(x + 4, y + 4, 2, ph - 8);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(x + 4, y + ph - 6, pw - 8, 2);
      for (const [rx, ry] of [
        [x + 16, y + 16],
        [x + pw - 16, y + 16],
        [x + 16, y + ph - 16],
        [x + pw - 16, y + ph - 16],
      ])
        rivet(ctx, rx, ry, 4.5);
    }
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 260; i++) {
    const y = r() * TY;
    const x = r() * W;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 60 + r() * 200, y);
    ctx.stroke();
  }
  vgrad(ctx, 0, 0, W, TY, [
    [0, 'rgba(0,0,10,0.5)'],
    [0.5, 'rgba(0,0,10,0.1)'],
    [1, 'rgba(0,0,10,0.3)'],
  ]);
  // big window
  const { x0, x1, y0, y1 } = SP.win;
  const ww = x1 - x0;
  const wh = y1 - y0;
  const rad = 70;
  ctx.save();
  roundRect(ctx, x0, y0, ww, wh, rad);
  ctx.clip();
  vgrad(ctx, x0, y0, ww, wh, [
    [0, '#02030c'],
    [1, '#0a1230'],
  ]);
  // nebula
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const neb: [number, number, number, string, number][] = [
    [x0 + ww * 0.2, y0 + wh * 0.3, 260, '#8a2aa8', 0.35],
    [x0 + ww * 0.32, y0 + wh * 0.2, 200, '#d04a8a', 0.25],
    [x0 + ww * 0.12, y0 + wh * 0.45, 180, '#2a6ad0', 0.3],
    [x0 + ww * 0.75, y0 + wh * 0.18, 160, '#2ac8c0', 0.18],
  ];
  for (const [nx, ny, nr, nc, na] of neb) glow(ctx, nx, ny, nr, nc, na, 0.7);
  ctx.restore();
  mottle(ctx, x0, y0, ww, wh * 0.7, 0.25, 1.2, 'multiply');
  stars(ctx, r, x0, y0, ww, wh, 380);
  // earth limb
  const ex = x0 + ww * 0.62;
  const ey = y1 + 820;
  const er = 1000;
  glow(ctx, ex, ey, er + 140, '#4ab0ff', 0.45);
  ellipse(ctx, ex, ey, er, er);
  const eg = ctx.createRadialGradient(ex + 250, ey - er + 40, 40, ex, ey - er * 0.4, er * 0.9);
  eg.addColorStop(0, '#4aa8f0');
  eg.addColorStop(0.35, '#1e64b8');
  eg.addColorStop(1, '#0a2458');
  ctx.fillStyle = eg;
  ctx.fill();
  ctx.save();
  ellipse(ctx, ex, ey, er, er);
  ctx.clip();
  // continents (clusters of soft blobs)
  const lands: [number, number, number][] = [
    [-0.32, 60, 1],
    [-0.12, 110, 0.8],
    [0.18, 70, 1.2],
    [0.36, 130, 0.7],
  ];
  for (const [la, ld, ls] of lands) {
    const a = -Math.PI / 2 + la;
    for (let k = 0; k < 7; k++) {
      const d = er - ld - r() * 90 * ls;
      const aa = a + (r() - 0.5) * 0.12 * ls;
      blob(ctx, ex + Math.cos(aa) * d, ey + Math.sin(aa) * d * 1, (30 + r() * 50) * ls, 0.6, r, 10);
      ctx.fillStyle = rgba(k % 4 ? (k % 2 ? '#2f6a36' : '#457a38') : '#7a7444', 0.95);
      ctx.fill();
    }
  }
  // clouds: soft swirls hugging the curvature
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 30; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.0;
    const d = er - 8 - r() * 220;
    const cxp = ex + Math.cos(a) * d;
    const cyp = ey + Math.sin(a) * d;
    ctx.save();
    ctx.translate(cxp, cyp);
    ctx.rotate(a + Math.PI / 2);
    const cl = 40 + r() * 90;
    const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, cl);
    g2.addColorStop(0, 'rgba(255,255,255,0.2)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.scale(1, 0.22);
    ctx.fillRect(-cl, -cl, cl * 2, cl * 2);
    ctx.restore();
  }
  ctx.restore();
  // atmosphere haze near the limb
  const ag = ctx.createRadialGradient(ex, ey, er * 0.82, ex, ey, er);
  ag.addColorStop(0, 'rgba(120,200,255,0)');
  ag.addColorStop(1, 'rgba(150,220,255,0.38)');
  ctx.fillStyle = ag;
  ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
  // night side with city lights
  ctx.fillStyle = hgrad(ctx, ex - er * 0.55, ex + er * 0.05, [
    [0, 'rgba(2,4,20,0.9)'],
    [1, 'rgba(2,4,20,0)'],
  ]);
  ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 120; i++) {
    const a = -Math.PI / 2 - 0.22 - r() * 0.4;
    const d = er - 20 - r() * 160;
    ctx.fillStyle = `rgba(255,200,110,${0.3 + r() * 0.6})`;
    ctx.fillRect(ex + Math.cos(a) * d, ey + Math.sin(a) * d, 2, 2);
  }
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.arc(ex, ey, er + 3, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.75);
  for (const [lw, a] of [
    [40, 0.06],
    [22, 0.12],
    [12, 0.25],
    [6, 0.6],
  ]) {
    ctx.strokeStyle = `rgba(120,210,255,${a})`;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
  // satellite / moon
  moon(ctx, x0 + ww * 0.88, y0 + wh * 0.22, 26, r, '#d8d4c8');
  // glass glare
  ctx.fillStyle = 'rgba(160,210,255,0.06)';
  ctx.beginPath();
  ctx.moveTo(x0 + 120, y0);
  ctx.lineTo(x0 + 300, y0);
  ctx.lineTo(x0 + 60, y1);
  ctx.lineTo(x0 - 120, y1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0 + 340, y0);
  ctx.lineTo(x0 + 380, y0);
  ctx.lineTo(x0 + 140, y1);
  ctx.lineTo(x0 + 100, y1);
  ctx.fill();
  ctx.restore();
  // chunky frame
  roundRect(ctx, x0 - 14, y0 - 14, ww + 28, wh + 28, rad + 14);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 46;
  ctx.stroke();
  ctx.strokeStyle = lgrad(ctx, 0, y0 - 30, 0, y1 + 30, [
    [0, '#c8d0dc'],
    [0.5, '#6a7488'],
    [1, '#3a4252'],
  ]);
  ctx.lineWidth = 36;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  roundRect(ctx, x0 - 28, y0 - 28, ww + 56, wh + 56, rad + 26);
  ctx.stroke();
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    rivet(ctx, x0 + t * ww + ww / 28, y0 - 14, 6, '#aab4c4');
    rivet(ctx, x0 + t * ww + ww / 28, y1 + 14, 6, '#aab4c4');
  }
  // console strip under the window
  const cy = 620;
  roundRect(ctx, 160, cy - 10, W - 320, 90, 14);
  fillOl(ctx, lgrad(ctx, 0, cy - 10, 0, cy + 80, [
    [0, '#5a6478'],
    [1, '#262c3a'],
  ]), 5);
  for (const [sx, sw] of [
    [430, 220],
    [1270, 220],
  ]) {
    roundRect(ctx, sx, cy + 6, sw, 56, 8);
    fillOl(ctx, '#06140e', 4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(80,255,160,0.85)';
    ctx.shadowColor = '#4aff9a';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= sw - 20; x += 4) {
      const y = cy + 34 + Math.sin(x * 0.09 + sx) * 12 * Math.sin(x * 0.02);
      if (x) ctx.lineTo(sx + 10 + x, y);
      else ctx.moveTo(sx + 10 + x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  for (let i = 0; i < 24; i++) {
    const bx = 700 + i * 22;
    const c = ['#ff4a4a', '#4aff8a', '#4ad8ff', '#ffb84a'][Math.floor(r() * 4)];
    const on = r() > 0.35;
    roundRect(ctx, bx, cy + 22, 14, 10, 3);
    ctx.fillStyle = on ? c : shade(c, -0.7);
    ctx.fill();
    if (on) glow(ctx, bx + 7, cy + 27, 18, c, 0.5);
  }
  for (const [lx, ly, lc] of SP.leds) {
    ellipse(ctx, lx, ly, 9, 9);
    fillOl(ctx, lc, 3);
    glow(ctx, lx, ly, 40, lc, 0.7);
  }
  // pipes on the left
  for (const [px, pw2, col] of [
    [70, 40, '#8a6a3a'],
    [130, 26, '#5a6a80'],
  ] as [number, number, string][]) {
    ctx.beginPath();
    ctx.rect(px - pw2 / 2, -10, pw2, TY + 10);
    fillOl(ctx, cylH(ctx, px - pw2 / 2, pw2, col), 4);
    for (let y = 120; y < TY; y += 200) {
      ctx.beginPath();
      ctx.rect(px - pw2 / 2 - 5, y, pw2 + 10, 16);
      fillOl(ctx, cylH(ctx, px - pw2 / 2 - 5, pw2 + 10, shade(col, -0.2)), 3);
    }
  }
  // valve wheel
  ellipse(ctx, 70, 420, 34, 34);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.strokeStyle = '#c83a2a';
  ctx.lineWidth = 7;
  ctx.stroke();
  // neon pizza sign
  const { sign } = SP;
  roundRect(ctx, sign.x - 150, sign.y - 170, 300, 340, 24);
  fillOl(ctx, 'rgba(6,8,18,0.75)', 5);
  neonText(ctx, 'PIZZA', sign.x, sign.y - 118, 64, ROUND, '#3ae8ff', undefined, 5);
  neonStroke(ctx, '#ff9a2a', 7, () => {
    ctx.beginPath();
    ctx.moveTo(sign.x - 90, sign.y - 50);
    ctx.quadraticCurveTo(sign.x, sign.y - 80, sign.x + 90, sign.y - 50);
    ctx.lineTo(sign.x, sign.y + 140);
    ctx.closePath();
    ctx.stroke();
  });
  neonStroke(ctx, '#ff4a6a', 5, () => {
    ctx.beginPath();
    for (const [px, py, pr] of [
      [-30, -30, 16],
      [26, -26, 13],
      [0, 30, 14],
      [-6, 86, 9],
    ]) {
      ctx.moveTo(sign.x + px + pr, sign.y + py);
      ctx.arc(sign.x + px, sign.y + py, pr, 0, Math.PI * 2);
    }
    ctx.stroke();
  });
  glow(ctx, sign.x, sign.y, 300, '#ff9a2a', 0.16);
  // ceiling light strip
  ctx.fillStyle = '#0a0e18';
  ctx.fillRect(0, 0, W, 96);
  neonStroke(ctx, '#7ad8ff', 5, () => {
    ctx.beginPath();
    ctx.moveTo(-10, 100);
    ctx.lineTo(W + 10, 100);
    ctx.stroke();
  });
  // earthlight spill
  glow(ctx, ex, y1, 900, '#4ab0ff', 0.18, 0.4);
  // brushed steel bench
  const f = SP.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  vgrad(ctx, 0, TY, W, f - TY, [
    [0, '#4a5262'],
    [0.4, '#727c8c'],
    [1, '#5a6272'],
  ]);
  ctx.lineWidth = 1;
  for (let i = 0; i < 1600; i++) {
    const y = TY + r() * (f - TY);
    const x = r() * W;
    ctx.strokeStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.12})` : `rgba(0,0,0,${r() * 0.12})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 80 + r() * 300, y);
    ctx.stroke();
  }
  // panel seams + rivets
  ctx.strokeStyle = 'rgba(20,24,34,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const X of [-1.8, -0.9, 0, 0.9, 1.8]) {
    ctx.moveTo(xAt(X, ZB), TY);
    ctx.lineTo(xAt(X, zFront(f)), f);
  }
  ctx.stroke();
  for (const X of [-1.8, -0.9, 0, 0.9, 1.8])
    for (let z = ZB - 0.08; z > zFront(f); z -= 0.24) rivet(ctx, xAt(X + 0.04, z), yAt(z), (4 * FOC) / z / 460, '#a8b2c0');
  glow(ctx, ex, 800, 800, '#6ac0ff', 0.12, 0.25);
  ctx.restore();
  ctx.fillStyle = '#1a2030';
  ctx.fillRect(0, TY, W, 6);
  neonStroke(ctx, '#3ae8ff', 3, () => {
    ctx.beginPath();
    ctx.moveTo(0, TY + 4);
    ctx.lineTo(W, TY + 4);
    ctx.stroke();
  });
  frontFace(ctx, f, () => {
    ctx.fillStyle = lgrad(ctx, 0, f, 0, H, [
      [0, '#3a4252'],
      [1, '#1a1e28'],
    ]);
    ctx.fillRect(0, f, W, H - f);
  }, 0.2);
  neonStroke(ctx, '#3ae8ff', 6, () => {
    ctx.beginPath();
    ctx.moveTo(-10, f + 14);
    ctx.lineTo(W + 10, f + 14);
    ctx.stroke();
  });
  contactShadow(ctx, 0.45);
  tableLight(ctx, '#a8d8ff', 0.04, 0.45);
  vignette(ctx, 0.75, '#020410');
}

// ---------------------------------------------------------------------------------------------
// 7. Moonlit Woods (Bigfoot)

const BF = {
  moon: { x: 1400, y: 220 },
  lantern: { x: 210, y: 420 },
  front: 1040,
};

function drawWoods(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#050a1c'],
    [0.5, '#14284a'],
    [1, '#2e5070'],
  ]);
  stars(ctx, r, 0, 90, W, 380, 220);
  moon(ctx, BF.moon.x, BF.moon.y, 105, r);
  // forest layers, far to near
  const layers = 5;
  for (let L = 0; L < layers; L++) {
    const t = L / (layers - 1);
    const col = mix('#4a6a8e', '#060a12', Math.pow(t, 0.8));
    const base = 600 + L * 40;
    const hMin = 160 + L * 40;
    const hMax = 300 + L * 70;
    let x = -60 + r() * 40;
    while (x < W + 60) {
      const h = hMin + r() * (hMax - hMin);
      pine(ctx, x, base + 30, h, h * (0.42 + r() * 0.12), col, 6 + L);
      x += h * (0.22 + r() * 0.16);
    }
    ctx.fillStyle = col;
    ctx.fillRect(0, base + 20, W, TY - base);
    if (L < layers - 1) fogBand(ctx, r, base + 10, 60, '#a8c4e8', 0.18 - L * 0.025, 22);
  }
  // giant near pines framing the scene
  for (const [px, ph] of [
    [-10, 1150],
    [1950, 1100],
  ]) {
    pine(ctx, px, TY + 40, ph, 560, '#03060a', 9);
    ctx.strokeStyle = rgba('#8aa8d8', 0.1);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // undergrowth ferns
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const base = TY + 10;
    for (let k = 0; k < 4; k++) frond(ctx, x, base, 90 + r() * 60, -Math.PI / 2 + (k - 1.5) * 0.5, (k - 1.5) * 0.3, '#060a10', 3, 0.8);
  }
  // hanging lantern on the left trunk
  const { lantern } = BF;
  glow(ctx, lantern.x, lantern.y, 300, '#ffb050', 0.45);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(110, lantern.y - 110);
  ctx.quadraticCurveTo(lantern.x, lantern.y - 110, lantern.x, lantern.y - 50);
  ctx.stroke();
  roundRect(ctx, lantern.x - 30, lantern.y - 40, 60, 80, 10);
  fillOl(ctx, lgrad(ctx, 0, lantern.y - 40, 0, lantern.y + 40, [
    [0, '#fff4c0'],
    [1, '#ffa040'],
  ]), 5);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(lantern.x, lantern.y - 40);
  ctx.lineTo(lantern.x, lantern.y + 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(lantern.x - 38, lantern.y - 40);
  ctx.lineTo(lantern.x, lantern.y - 64);
  ctx.lineTo(lantern.x + 38, lantern.y - 40);
  ctx.closePath();
  fillOl(ctx, '#3a2a20', 4);
  roundRect(ctx, lantern.x - 36, lantern.y + 38, 72, 12, 4);
  fillOl(ctx, '#3a2a20', 4);
  glow(ctx, lantern.x, lantern.y, 90, '#ffd080', 0.7);
  // log table with a red-check cloth
  const f = BF.front;
  planksTop(ctx, r, f, 0.3, '#6a4a32', 0.3, 8, 0.05);
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  const cxw = 0.25;
  const czw = 2.05;
  const rot = 0.6;
  const half = 0.85;
  const cell = 0.14;
  const toPlane = (u: number, v: number): [number, number] => [cxw + u * Math.cos(rot) - v * Math.sin(rot), czw + u * Math.sin(rot) + v * Math.cos(rot)];
  // cloth shadow
  ctx.save();
  ctx.translate(10, 14);
  planePoly(ctx, [toPlane(-half, -half), toPlane(half, -half), toPlane(half, half), toPlane(-half, half)]);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.restore();
  planePoly(ctx, [toPlane(-half, -half), toPlane(half, -half), toPlane(half, half), toPlane(-half, half)]);
  ctx.fillStyle = '#b0a690';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#7a221e';
  const n = Math.round((half * 2) / cell);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if ((i + j) % 2) continue;
      const u0 = -half + i * cell;
      const v0 = -half + j * cell;
      planePoly(ctx, [toPlane(u0, v0), toPlane(u0 + cell, v0), toPlane(u0 + cell, v0 + cell), toPlane(u0, v0 + cell)]);
      ctx.fill();
    }
  ctx.restore();
  planePoly(ctx, [toPlane(-half, -half), toPlane(half, -half), toPlane(half, half), toPlane(-half, half)]);
  outline(ctx, 4);
  ctx.restore();
  // log front
  frontFace(ctx, f, () => {
    ctx.fillStyle = cylV(ctx, f, 90, '#4a3424');
    ctx.fillRect(0, f, W, H - f);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 60; i++) {
      const x = r() * W;
      const y = f + 6 + r() * 34;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 30 + r() * 80, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
  }, 0.3);
  contactShadow(ctx, 0.6);
  // cool moonlight + warm lantern on the table
  glow(ctx, 1200, 860, 800, '#7aa0e0', 0.12, 0.3);
  glow(ctx, lantern.x + 100, 820, 400, '#ffa040', 0.14, 0.3);
  tableLight(ctx, '#a8c0ff', 0, 0.5);
  fogBand(ctx, r, 740, 60, '#b8d0f0', 0.2, 30);
  grade(ctx, 0.12);
  vignette(ctx, 0.85, '#02040a');
}

// ---------------------------------------------------------------------------------------------
// 8. The Foundry (Iron Heel)

const FD = {
  crucible: { x: 470, y: 300 },
  pour: { x: 560, y: 560 },
  door: { x: 1500, y: 420 },
  channel: 712,
  front: 1036,
};

function girder(ctx: Ctx, x: number, w: number, y0: number, y1: number, r: R): void {
  ctx.beginPath();
  ctx.rect(x - w / 2, y0, w, y1 - y0);
  fillOl(ctx, hgrad(ctx, x - w / 2, x + w / 2, [
    [0, '#2a2e36'],
    [0.15, '#7a808c'],
    [0.22, '#3a3e48'],
    [0.5, '#4a4e58'],
    [0.78, '#3a3e48'],
    [0.85, '#6a707c'],
    [1, '#1e2228'],
  ]), 5);
  for (let y = y0 + 30; y < y1; y += 60) {
    rivet(ctx, x - w * 0.38, y, 5);
    rivet(ctx, x + w * 0.38, y, 5);
  }
  grainRect(ctx, x - w / 2, y0, w, y1 - y0, 0.35);
  for (let i = 0; i < 6; i++) darkSpot(ctx, x + (r() - 0.5) * w * 0.6, y0 + r() * (y1 - y0), 20 + r() * 20, 30 + r() * 30, 0.25, '#6a2a10');
}

function chain(ctx: Ctx, x: number, y0: number, y1: number): void {
  let k = 0;
  for (let y = y0; y < y1; y += 22, k++) {
    if (k % 2) {
      roundRect(ctx, x - 4, y - 4, 8, 30, 4);
      fillOl(ctx, '#5a5e66', 3);
    } else {
      roundRect(ctx, x - 11, y - 4, 22, 30, 10);
      ctx.strokeStyle = OL;
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = '#7a808a';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
}

function drawFoundry(ctx: Ctx, r: R): void {
  // sooty brick back wall
  ctx.fillStyle = '#1a1210';
  ctx.fillRect(0, 0, W, TY);
  const bw = 96;
  const bh = 38;
  for (let row = 0, y = 0; y < TY; row++, y += bh)
    for (let x = row % 2 ? -bw / 2 : 0; x < W; x += bw) {
      roundRect(ctx, x + 3, y + 3, bw - 6, bh - 6, 4);
      ctx.fillStyle = shade('#4a2e26', (r() - 0.5) * 0.3);
      ctx.fill();
    }
  mottle(ctx, 0, 0, W, TY, 0.5, 1.2);
  grainRect(ctx, 0, 0, W, TY, 0.35);
  vgrad(ctx, 0, 0, W, TY, [
    [0, 'rgba(0,0,0,0.75)'],
    [0.6, 'rgba(0,0,0,0.3)'],
    [1, 'rgba(0,0,0,0.1)'],
  ]);
  // furnace glow from below
  glow(ctx, 900, TY, 1100, '#ff5a10', 0.35, 0.45);
  // smoke at the top
  for (let i = 0; i < 20; i++) darkSpot(ctx, r() * W, 60 + r() * 160, 200 + r() * 200, 60 + r() * 60, 0.35, '#0a0606');
  // furnace door on the right
  const { door } = FD;
  roundRect(ctx, door.x - 170, door.y - 170, 340, 330, 20);
  fillOl(ctx, lgrad(ctx, 0, door.y - 170, 0, door.y + 160, [
    [0, '#4a4e56'],
    [1, '#22252c'],
  ]), 6);
  roundRect(ctx, door.x - 120, door.y - 60, 240, 50, 10);
  const sg = ctx.createLinearGradient(0, door.y - 60, 0, door.y - 10);
  sg.addColorStop(0, '#ffe08a');
  sg.addColorStop(1, '#ff5a10');
  fillOl(ctx, sg, 5);
  ctx.fillStyle = '#2a1810';
  for (let k = -2; k <= 2; k++) ctx.fillRect(door.x + k * 46 - 4, door.y - 60, 8, 50);
  glow(ctx, door.x, door.y - 35, 260, '#ff7a20', 0.45, 0.6);
  for (const [rx, ry] of [
    [-150, -150],
    [150, -150],
    [-150, 140],
    [150, 140],
  ])
    rivet(ctx, door.x + rx, door.y + ry, 8);
  ellipse(ctx, door.x, door.y + 80, 46, 46);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.strokeStyle = '#b8402a';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    ctx.moveTo(door.x + Math.cos(a) * 46, door.y + 80 + Math.sin(a) * 46);
    ctx.lineTo(door.x - Math.cos(a) * 46, door.y + 80 - Math.sin(a) * 46);
  }
  ctx.strokeStyle = '#b8402a';
  ctx.lineWidth = 6;
  ctx.stroke();
  // warning sign
  const wsx = 1130;
  const wsy = 330;
  ctx.beginPath();
  ctx.moveTo(wsx, wsy - 70);
  ctx.lineTo(wsx + 80, wsy + 66);
  ctx.lineTo(wsx - 80, wsy + 66);
  ctx.closePath();
  fillOl(ctx, '#f2c21e', 7);
  ctx.beginPath();
  footPath(ctx, wsx, wsy + 18, 76);
  ctx.fillStyle = OL;
  ctx.fill();
  ctx.font = `bold 28px ${BLOCK}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2c21e';
  ctx.fillText('HOT FEET', wsx, wsy + 108);
  // hazard rail
  hazard(ctx, 0, 620, W, 40);
  ctx.fillStyle = rgba(OL, 0.9);
  ctx.fillRect(0, 618, W, 4);
  ctx.fillRect(0, 658, W, 4);
  vgrad(ctx, 0, 662, W, 26, [
    [0, 'rgba(0,0,0,0.5)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  // molten channel along the base
  const cy = FD.channel;
  ctx.fillStyle = '#100806';
  ctx.fillRect(0, cy - 26, W, 50);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = lgrad(ctx, 0, cy - 14, 0, cy + 16, [
    [0, '#ffe890'],
    [0.4, '#ff8a20'],
    [1, '#a02000'],
  ]);
  ctx.fillRect(0, cy - 14, W, 30);
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(255,255,200,${0.3 + r() * 0.5})`;
    ctx.fillRect(r() * W, cy - 12 + r() * 20, 10 + r() * 40, 2);
  }
  ctx.restore();
  glow(ctx, VX, cy, 1000, '#ff6a10', 0.4, 0.12);
  // girders + truss
  girder(ctx, 140, 90, 0, TY, r);
  girder(ctx, 1790, 90, 0, TY, r);
  ctx.beginPath();
  ctx.rect(0, 96, W, 30);
  fillOl(ctx, cylV(ctx, 96, 30, '#5a5e68'), 5);
  ctx.beginPath();
  ctx.rect(0, 186, W, 24);
  fillOl(ctx, cylV(ctx, 186, 24, '#4a4e58'), 5);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 14;
  ctx.beginPath();
  for (let x = 0; x < W; x += 120) {
    ctx.moveTo(x, 126);
    ctx.lineTo(x + 60, 186);
    ctx.lineTo(x + 120, 126);
  }
  ctx.stroke();
  ctx.strokeStyle = '#5a5e68';
  ctx.lineWidth = 7;
  ctx.stroke();
  for (let x = 0; x < W; x += 60) rivet(ctx, x, 111, 4);
  // chains with hooks
  for (const [chx, len] of [
    [820, 420],
    [1300, 300],
  ]) {
    chain(ctx, chx, 210, 210 + len);
    ctx.beginPath();
    ctx.arc(chx + 14, 210 + len + 30, 22, Math.PI, Math.PI * 2.6);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = '#8a8e98';
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  // crucible
  const { crucible: cr, pour } = FD;
  chain(ctx, cr.x - 40, 210, cr.y - 60);
  chain(ctx, cr.x + 60, 210, cr.y - 70);
  // pour stream
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = '#ff8a20';
  ctx.shadowBlur = 40;
  ctx.strokeStyle = '#ff9a2a';
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(cr.x + 104, cr.y + 4);
  ctx.bezierCurveTo(cr.x + 150, cr.y + 30, pour.x + 20, pour.y - 100, pour.x, cy - 10);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffe890';
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = '#fffbe0';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
  glow(ctx, pour.x, pour.y, 360, '#ff7a20', 0.5);
  glow(ctx, pour.x, cy - 10, 200, '#ffd060', 0.6, 0.5);
  // splash sparks
  for (let i = 0; i < 70; i++) {
    const a = -Math.PI * (0.1 + r() * 0.8);
    const d = 20 + r() * 160;
    ctx.fillStyle = rgba(r() > 0.5 ? '#ffe890' : '#ff9a2a', 0.5 + r() * 0.5);
    const sx = pour.x + Math.cos(a) * d;
    const sy = cy - 14 + Math.sin(a) * d * 0.7;
    ctx.fillRect(sx, sy, 3, 3);
  }
  ctx.save();
  ctx.translate(cr.x, cr.y);
  ctx.rotate(0.55);
  ctx.beginPath();
  ctx.moveTo(-90, -80);
  ctx.lineTo(90, -80);
  ctx.lineTo(70, 70);
  ctx.quadraticCurveTo(0, 96, -70, 70);
  ctx.closePath();
  fillOl(ctx, hgrad(ctx, -90, 90, [
    [0, '#2a2420'],
    [0.35, '#6a5a50'],
    [1, '#1a1410'],
  ]), 6);
  ellipse(ctx, 0, -80, 92, 22);
  fillOl(ctx, '#2a2420', 5);
  ellipse(ctx, 0, -78, 76, 15);
  ctx.fillStyle = '#ffd060';
  ctx.fill();
  ctx.restore();
  glow(ctx, cr.x + 60, cr.y - 30, 200, '#ff9a2a', 0.4);
  // riveted steel workbench
  const f = FD.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  vgrad(ctx, 0, TY, W, f - TY, [
    [0, '#3a3c42'],
    [1, '#5a5e66'],
  ]);
  mottle(ctx, 0, TY, W, f - TY, 0.2, 1.6);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 160; i++) {
    const x = r() * W;
    const y = TY + r() * (f - TY);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 12);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) darkSpot(ctx, r() * W, TY + 40 + r() * 200, 60 + r() * 80, 14 + r() * 16, 0.3, '#0a0806');
  const seams = [-1.6, -0.8, 0, 0.8, 1.6];
  ctx.strokeStyle = 'rgba(10,10,14,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const X of seams) {
    ctx.moveTo(xAt(X, ZB), TY);
    ctx.lineTo(xAt(X, zFront(f)), f);
  }
  const zs = 2.05;
  ctx.moveTo(0, yAt(zs));
  ctx.lineTo(W, yAt(zs));
  ctx.stroke();
  for (const X of seams)
    for (let z = ZB - 0.07; z > zFront(f); z -= 0.18) {
      const s = FOC / z / 460;
      rivet(ctx, xAt(X - 0.04, z), yAt(z), 4.5 * s, '#8a8e98');
      rivet(ctx, xAt(X + 0.04, z), yAt(z), 4.5 * s, '#8a8e98');
    }
  for (let X = -2.4; X < 2.4; X += 0.2) {
    const s = FOC / zs / 460;
    rivet(ctx, xAt(X, zs + 0.03), yAt(zs + 0.03), 4.5 * s, '#8a8e98');
  }
  glow(ctx, VX, TY, 900, '#ff6a10', 0.25, 0.15);
  ctx.restore();
  frontFace(ctx, f, () => hazard(ctx, 0, f, W, H - f, 44), 0.25);
  contactShadow(ctx, 0.55);
  tableLight(ctx, '#ff9a50', 0.06, 0.5);
  grade(ctx, 0.1);
  vignette(ctx, 0.85, '#060202');
}

// ---------------------------------------------------------------------------------------------
// 9. Big Top (King Honk)

const BT = {
  apex: { x: 960, y: -620 },
  spots: [
    { x: 150, y: 120, tx: 1240, ty: 880 },
    { x: 1770, y: 120, tx: 680, ty: 880 },
  ],
  poles: [330, 1590],
  front: 1040,
  swags: [
    { x0: -20, y0: 160, x1: 330, y1: 220, sag: 50 },
    { x0: 330, y0: 220, x1: 1590, y1: 220, sag: 150 },
    { x0: 1590, y0: 220, x1: 1940, y1: 160, sag: 50 },
  ] as Swag[],
};

function starPath(ctx: Ctx, x: number, y: number, ro: number, ri: number, n = 5, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const rr = i % 2 ? ri : ro;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawBigTop(ctx: Ctx, r: R): void {
  const { apex } = BT;
  // radiating tent stripes
  const n = 30;
  const a0 = Math.PI * 0.12;
  const a1 = Math.PI * 0.88;
  for (let i = 0; i < n; i++) {
    const s0 = a0 + ((a1 - a0) * i) / n;
    const s1 = a0 + ((a1 - a0) * (i + 1)) / n;
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(apex.x + Math.cos(s0) * 2600, apex.y + Math.sin(s0) * 2600);
    ctx.lineTo(apex.x + Math.cos(s1) * 2600, apex.y + Math.sin(s1) * 2600);
    ctx.closePath();
    const base = i % 2 ? '#b8222e' : '#efe2c4';
    const xm0 = apex.x + Math.cos(s0) * 1200;
    const xm1 = apex.x + Math.cos(s1) * 1200;
    ctx.fillStyle = hgrad(ctx, xm0, xm1, [
      [0, shade(base, -0.3)],
      [0.4, shade(base, 0.05)],
      [1, shade(base, -0.35)],
    ]);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(40,10,10,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    const s = a0 + ((a1 - a0) * i) / n;
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(apex.x + Math.cos(s) * 2600, apex.y + Math.sin(s) * 2600);
    ctx.stroke();
  }
  mottle(ctx, 0, 0, W, TY, 0.1, 1.5);
  vgrad(ctx, 0, 0, W, TY, [
    [0, 'rgba(30,6,40,0.8)'],
    [0.45, 'rgba(30,6,40,0.3)'],
    [1, 'rgba(30,6,40,0.55)'],
  ]);
  // scalloped valance
  const vy = 96;
  ctx.fillStyle = '#4a1a6a';
  ctx.fillRect(0, 0, W, vy);
  ctx.beginPath();
  ctx.moveTo(0, vy);
  for (let x = 0; x < W; x += 80) ctx.arc(x + 40, vy, 40, Math.PI, 0, true);
  ctx.lineTo(W, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, 0, 0, vy + 40, [
    [0, '#2a0a3e'],
    [1, '#6a2a8a'],
  ]), 5);
  for (let x = 0; x < W; x += 80) {
    ellipse(ctx, x + 40, vy + 36, 8, 8);
    fillOl(ctx, '#f2c24a', 3);
  }
  // bleachers with the crowd
  const by = 560;
  for (let row = 0; row < 5; row++) {
    const y = by + row * 34;
    ctx.fillStyle = shade('#2a1a3a', -row * 0.08);
    ctx.fillRect(0, y, W, 34);
    for (let x = -10; x < W; x += 26 + r() * 10) {
      const hy = y + 4 + r() * 4;
      ellipse(ctx, x, hy, 11, 13);
      ctx.fillStyle = shade('#120a1c', r() * 0.15);
      ctx.fill();
      ctx.fillRect(x - 14, hy + 8, 28, 22);
      if (r() < 0.012) glow(ctx, x, hy, 26, '#ffffff', 0.6);
    }
  }
  vgrad(ctx, 0, by - 20, W, 200, [
    [0, 'rgba(10,0,20,0.7)'],
    [1, 'rgba(10,0,20,0.35)'],
  ]);
  // ring curb
  const ry = 690;
  ctx.beginPath();
  ctx.rect(-10, ry, W + 20, TY - ry + 10);
  fillOl(ctx, lgrad(ctx, 0, ry, 0, TY, [
    [0, '#e83a3a'],
    [1, '#8a1420'],
  ]), 5);
  ctx.fillStyle = '#f2c24a';
  ctx.fillRect(0, ry + 8, W, 6);
  for (let x = 40; x < W; x += 120) {
    starPath(ctx, x, ry + 40, 16, 7);
    fillOl(ctx, '#f2c24a', 3);
  }
  // spotlight pools on the back wall
  for (const s of BT.spots) glow(ctx, s.tx, 470, 300, '#fff6d0', 0.18, 0.8);
  // striped poles
  for (const px of BT.poles) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(px - 20, 0, 40, TY);
    ctx.clip();
    ctx.fillStyle = '#f2ead8';
    ctx.fillRect(px - 20, 0, 40, TY);
    ctx.fillStyle = '#c8222e';
    for (let y = -40; y < TY; y += 60) {
      ctx.beginPath();
      ctx.moveTo(px - 20, y);
      ctx.lineTo(px + 20, y - 26);
      ctx.lineTo(px + 20, y + 4);
      ctx.lineTo(px - 20, y + 30);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = cylH(ctx, px - 20, 40, '#808080');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(px - 20, 0, 40, TY);
    ctx.restore();
    ctx.beginPath();
    ctx.rect(px - 20, -10, 40, TY + 10);
    outline(ctx, 5);
    starPath(ctx, px, 200, 30, 13);
    fillOl(ctx, '#f2c24a', 4);
  }
  // bunting
  drawWires(ctx, BT.swags, OL, 3);
  const cols = ['#e83a3a', '#f2c24a', '#3a7ae8', '#4ac86a', '#a84ae8'];
  let k = 0;
  for (const s of BT.swags) {
    const len = Math.abs(s.x1 - s.x0);
    const nf = Math.floor(len / 56);
    for (let i = 0; i < nf; i++) {
      const [ax, ay] = catenaryPt(s.x0, s.y0, s.x1, s.y1, s.sag, i / nf);
      const [bx, by2] = catenaryPt(s.x0, s.y0, s.x1, s.y1, s.sag, (i + 0.8) / nf);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by2);
      ctx.lineTo((ax + bx) / 2, (ay + by2) / 2 + 46);
      ctx.closePath();
      const c = cols[k++ % cols.length];
      fillOl(ctx, lgrad(ctx, ax, ay, bx, by2 + 40, [
        [0, shade(c, 0.2)],
        [1, shade(c, -0.25)],
      ]), 3);
    }
  }
  // spot fixtures + beams
  for (const s of BT.spots) {
    cone(ctx, s.x, s.y, 50, s.tx, s.ty, 480, '#fff6d0', 0.12);
    glow(ctx, s.tx, s.ty, 420, '#fff6d0', 0.22, 0.3);
  }
  for (const s of BT.spots) {
    const ang = Math.atan2(s.ty - s.y, s.tx - s.x);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);
    roundRect(ctx, -60, -34, 80, 68, 10);
    fillOl(ctx, cylV(ctx, -34, 68, '#3a3a44'), 5);
    ellipse(ctx, 20, 0, 12, 32);
    fillOl(ctx, '#fffbe8', 4);
    ctx.restore();
    glow(ctx, s.x + Math.cos(ang) * 24, s.y + Math.sin(ang) * 24, 100, '#fffbe8', 0.7);
  }
  // drum-top ring table
  const f = BT.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  ctx.fillStyle = '#7a1620';
  ctx.fillRect(0, TY, W, f - TY);
  const circle = (Rr: number): void => {
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const X = Math.cos(a) * Rr;
      const z = 2.05 + Math.sin(a) * Rr;
      if (i) ctx.lineTo(xAt(X, z), yAt(z));
      else ctx.moveTo(xAt(X, z), yAt(z));
    }
    ctx.closePath();
  };
  circle(1.0);
  ctx.fillStyle = '#c8303a';
  ctx.fill();
  circle(0.8);
  ctx.fillStyle = '#23347a';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#f2c24a';
  circle(1.0);
  ctx.stroke();
  circle(0.8);
  ctx.stroke();
  ctx.lineWidth = 2;
  circle(0.9);
  ctx.setLineDash([10, 14]);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.7;
    const z = 2.05 + Math.sin(a) * d;
    const s = FOC / z / 460;
    ctx.save();
    ctx.translate(xAt(Math.cos(a) * d, z), yAt(z));
    ctx.scale(1, 0.45);
    starPath(ctx, 0, 0, 14 * s, 6 * s);
    ctx.fillStyle = 'rgba(242,194,74,0.7)';
    ctx.fill();
    ctx.restore();
  }
  grainRect(ctx, 0, TY, W, f - TY, 0.25);
  ctx.restore();
  frontFace(ctx, f, () => {
    const dh = H - f;
    ctx.fillStyle = '#23347a';
    ctx.fillRect(0, f, W, dh);
    for (let x = 0, i = 0; x < W; x += 60, i++) {
      ctx.beginPath();
      ctx.moveTo(x, f + dh / 2);
      ctx.lineTo(x + 30, f);
      ctx.lineTo(x + 60, f + dh / 2);
      ctx.lineTo(x + 30, f + dh);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#c8303a' : '#f2c24a';
      ctx.fill();
    }
    ctx.fillStyle = '#f2c24a';
    ctx.fillRect(0, f + 2, W, 5);
  }, 0.3);
  contactShadow(ctx, 0.55);
  tableLight(ctx, '#fff0c0', 0, 0.5);
  grade(ctx, 0.08);
  vignette(ctx, 0.8, '#0a0210');
}

// ---------------------------------------------------------------------------------------------
// 10. Lost Valley (T-Rex Toes)

const LV = {
  crater: { x: 1240, y: 250 },
  front: 1036,
};

function ptero(ctx: Ctx, x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-60, -40, -150, -20);
  ctx.quadraticCurveTo(-90, -6, -70, 18);
  ctx.quadraticCurveTo(-30, 6, 0, 14);
  ctx.quadraticCurveTo(30, 6, 70, 18);
  ctx.quadraticCurveTo(90, -6, 150, -20);
  ctx.quadraticCurveTo(60, -40, 0, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.lineTo(10, -30);
  ctx.lineTo(50, -40);
  ctx.lineTo(16, -22);
  ctx.lineTo(8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -28);
  ctx.lineTo(-20, -52);
  ctx.lineTo(12, -34);
  ctx.fill();
  ctx.restore();
}

function drawLostValley(ctx: Ctx, r: R): void {
  const { crater: c } = LV;
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#2a0e1c'],
    [0.35, '#7a2a26'],
    [0.7, '#e07a3a'],
    [1, '#f8c070'],
  ]);
  glow(ctx, c.x, c.y, 700, '#ff5a1a', 0.35);
  // smoke plume
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const px = c.x - t * 700 + (r() - 0.5) * 120;
    const py = c.y - 40 - t * 240 + (r() - 0.5) * 60;
    const pr = 70 + t * 160 + r() * 40;
    blob(ctx, px, py, pr, 0.35, r, 12);
    ctx.fillStyle = lgrad(ctx, 0, py - pr, 0, py + pr, [
      [0, rgba('#9a7a7a', 0.85)],
      [0.55, rgba('#5a3a40', 0.85)],
      [1, rgba('#d0602a', 0.85)],
    ]);
    ctx.fill();
  }
  // far mountains
  ctx.fillStyle = '#8a3a3e';
  ctx.beginPath();
  ctx.moveTo(0, 560);
  ctx.lineTo(120, 430);
  ctx.lineTo(300, 500);
  ctx.lineTo(480, 380);
  ctx.lineTo(700, 520);
  ctx.lineTo(800, 560);
  ctx.closePath();
  ctx.fill();
  // volcano
  ctx.beginPath();
  ctx.moveTo(c.x - 640, 620);
  ctx.quadraticCurveTo(c.x - 200, 440, c.x - 90, c.y);
  ctx.lineTo(c.x + 90, c.y + 6);
  ctx.quadraticCurveTo(c.x + 220, 440, c.x + 720, 620);
  ctx.closePath();
  fillOl(ctx, hgrad(ctx, c.x - 640, c.x + 720, [
    [0, '#3a1a20'],
    [0.45, '#6a2e2a'],
    [0.6, '#4a2024'],
    [1, '#2a1218'],
  ]), 5);
  // lava rivers
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = '#ff6a1a';
  ctx.shadowBlur = 20;
  for (const [dx, ex, w0] of [
    [-40, -300, 12],
    [20, 160, 10],
    [-10, -60, 8],
  ]) {
    ctx.strokeStyle = '#ff7a2a';
    ctx.lineWidth = w0;
    ctx.beginPath();
    ctx.moveTo(c.x + dx, c.y + 10);
    ctx.bezierCurveTo(c.x + dx + ex * 0.2, c.y + 120, c.x + ex * 0.7, c.y + 200, c.x + ex, 600);
    ctx.stroke();
    ctx.strokeStyle = '#ffe08a';
    ctx.lineWidth = w0 * 0.35;
    ctx.stroke();
  }
  ctx.restore();
  // crater + fountain
  ellipse(ctx, c.x, c.y + 4, 92, 18);
  ctx.fillStyle = '#ffb040';
  ctx.fill();
  glow(ctx, c.x, c.y, 260, '#ffb040', 0.7);
  for (let i = 0; i < 5; i++) flame(ctx, c.x - 50 + i * 25, c.y + 6, 70, 150 + r() * 90, r, ['#ff3a0a', '#ff9a1a', '#fff27a']);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const dir = r() > 0.5 ? 1 : -1;
    const sx = c.x + (r() - 0.5) * 40;
    const hgt = 120 + r() * 120;
    const ex = sx + dir * (60 + r() * 160);
    const ey = c.y - hgt * 0.4 + r() * 80;
    ctx.strokeStyle = 'rgba(255,140,40,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, c.y);
    ctx.quadraticCurveTo((sx + ex) / 2, c.y - hgt, ex, ey);
    ctx.stroke();
    ellipse(ctx, ex, ey, 7, 7);
    ctx.fillStyle = '#ffd060';
    ctx.fill();
  }
  ctx.restore();
  glow(ctx, c.x, c.y - 70, 160, '#ffd060', 0.45);
  // pterodactyls
  ptero(ctx, 560, 210, 0.6, '#2a0e18');
  ptero(ctx, 760, 270, 0.4, '#3a1420');
  ptero(ctx, 1660, 170, 0.5, '#2a0e18');
  // haze
  fogBand(ctx, r, 600, 80, '#ffb070', 0.3, 30);
  // jungle mid layer
  for (let L = 0; L < 3; L++) {
    const col = mix('#5a4a2a', '#0e1a0e', L / 2);
    const base = 650 + L * 35;
    for (let i = 0; i < 26; i++) {
      const x = r() * W;
      blob(ctx, x, base - r() * 30, 40 + r() * 60, 0.4, r, 10);
      ctx.fillStyle = col;
      ctx.fill();
    }
    ctx.fillStyle = col;
    ctx.fillRect(0, base, W, TY - base + 10);
    // tree ferns poking up
    for (let i = 0; i < 3; i++) {
      let tx = r() * W;
      if (tx > 900 && tx < 1600) tx = tx < 1250 ? tx - 600 : tx + 400;
      const th = 120 + L * 70 + r() * 60;
      ctx.strokeStyle = col;
      ctx.lineWidth = 10 + L * 4;
      ctx.beginPath();
      ctx.moveTo(tx, base + 20);
      ctx.quadraticCurveTo(tx + 20, base - th / 2, tx + (r() - 0.5) * 40, base - th);
      ctx.stroke();
      for (let k = 0; k < 7; k++) frond(ctx, tx, base - th, 90 + L * 25, -Math.PI / 2 + (k - 3) * 0.48, (k - 3) * -0.12, col, 4, 0.8);
    }
    if (L < 2) fogBand(ctx, r, base, 50, '#ff9a5a', 0.14, 20);
  }
  // giant foreground ferns at both edges
  for (const [fx, dir] of [
    [-20, 1],
    [W + 20, -1],
  ]) {
    for (let k = 0; k < 6; k++) {
      const ang = dir > 0 ? -1.2 + k * 0.22 : -Math.PI + 1.2 - k * 0.22;
      frond(ctx, fx, TY + 20, 380 + k * 30, ang, dir * -0.35, k % 2 ? '#0a1a0c' : '#122612', 7, 1.1);
    }
  }
  // stone slab table
  const f = LV.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  vgrad(ctx, 0, TY, W, f - TY, [
    [0, '#5a4c40'],
    [1, '#958470'],
  ]);
  mottle(ctx, 0, TY, W, f - TY, 0.25, 1.6);
  grainRect(ctx, 0, TY, W, f - TY, 0.15);
  for (let i = 0; i < 10; i++) darkSpot(ctx, r() * W, TY + 60 + r() * 220, 120 + r() * 160, 26 + r() * 30, 0.12, r() > 0.5 ? '#e8d8c0' : '#2a2018');
  for (let i = 0; i < 4; i++) {
    let X = -1.6 + i * 1.05 + (r() - 0.5) * 0.3;
    let z = ZB;
    ctx.beginPath();
    ctx.moveTo(xAt(X, z), yAt(z));
    for (let k = 0; k < 4; k++) {
      X += (r() - 0.5) * 0.3;
      z -= 0.08 + r() * 0.1;
      ctx.lineTo(xAt(X, z), yAt(z));
    }
    ctx.save();
    ctx.translate(0, 2.5);
    ctx.strokeStyle = 'rgba(255,230,200,0.22)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(20,14,10,0.75)';
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }
  // moss at the back corners
  for (let i = 0; i < 40; i++) {
    const x = r() < 0.5 ? r() * 400 : W - r() * 400;
    const y = TY + r() * 60;
    blob(ctx, x, y, 14 + r() * 26, 0.6, r, 8);
    ctx.fillStyle = rgba(r() > 0.5 ? '#4a6a2a' : '#3a5a22', 0.6);
    ctx.fill();
  }
  glow(ctx, c.x, TY, 700, '#ff7a2a', 0.18, 0.2);
  ctx.restore();
  // chipped front edge
  frontFace(ctx, f, () => {
    ctx.fillStyle = lgrad(ctx, 0, f, 0, H, [
      [0, '#6a6058'],
      [1, '#3a3430'],
    ]);
    ctx.fillRect(0, f, W, H - f);
    mottle(ctx, 0, f, W, H - f, 0.5, 0.5);
  }, 0.35, false);
  ctx.beginPath();
  ctx.moveTo(0, f);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, f + (r() - 0.5) * 8);
  ctx.strokeStyle = 'rgba(255,230,200,0.35)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.stroke();
  contactShadow(ctx, 0.55);
  tableLight(ctx, '#ffb070', 0.05, 0.5);
  grade(ctx, 0.12);
  vignette(ctx, 0.8, '#0e0404');
}

// ---------------------------------------------------------------------------------------------
// 11. Hall of Kings (Colossus)

const HK = {
  win: { x0: 770, x1: 1150, y0: 120, y1: 560 },
  torches: [
    { x: 260, y: 360 },
    { x: 1660, y: 360 },
  ],
  banners: [480, 1440],
  front: 1030,
};

function gothicArch(ctx: Ctx, x0: number, x1: number, y0: number, y1: number): void {
  const w = x1 - x0;
  const sp = y0 + w * 0.75;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x0, sp);
  ctx.quadraticCurveTo(x0, y0 + w * 0.12, (x0 + x1) / 2, y0);
  ctx.quadraticCurveTo(x1, y0 + w * 0.12, x1, sp);
  ctx.lineTo(x1, y1);
  ctx.closePath();
}

function drawHall(ctx: Ctx, r: R): void {
  // ashlar stone wall
  ctx.fillStyle = '#26242a';
  ctx.fillRect(0, 0, W, TY);
  for (let y = 0, row = 0; y < TY; row++) {
    const sh = 70 + Math.floor(r() * 30);
    let x = -r() * 120;
    while (x < W) {
      const sw = 120 + r() * 110;
      const c = shade(r() > 0.5 ? '#6a6670' : '#5e6068', (r() - 0.5) * 0.22);
      roundRect(ctx, x + 3, y + 3, sw - 6, sh - 6, 6);
      ctx.fillStyle = lgrad(ctx, x, y, x + sw * 0.3, y + sh, [
        [0, shade(c, 0.12)],
        [1, shade(c, -0.22)],
      ]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(x + 6, y + 4, sw - 12, 3);
      x += sw;
    }
    y += sh;
    void row;
  }
  mottle(ctx, 0, 0, W, TY, 0.28, 1.2);
  grainRect(ctx, 0, 0, W, TY, 0.3);
  vgrad(ctx, 0, 0, W, TY, [
    [0, 'rgba(4,2,10,0.8)'],
    [0.5, 'rgba(4,2,10,0.3)'],
    [1, 'rgba(4,2,10,0.45)'],
  ]);
  // columns at the edges
  for (const cx of [70, W - 70]) {
    ctx.beginPath();
    ctx.rect(cx - 70, 0, 140, TY + 10);
    fillOl(ctx, cylH(ctx, cx - 70, 140, '#7a7680'), 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * 22, 0);
      ctx.lineTo(cx + k * 22, TY);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.rect(cx - 86, 560, 172, 40);
    fillOl(ctx, cylV(ctx, 560, 40, '#8a8690'), 5);
  }
  // stained glass window
  const { x0, x1, y0, y1 } = HK.win;
  const ww = x1 - x0;
  glow(ctx, (x0 + x1) / 2, (y0 + y1) / 2, 520, '#ffd8a0', 0.25);
  // stone surround
  ctx.save();
  ctx.translate(0, 0);
  gothicArch(ctx, x0 - 40, x1 + 40, y0 - 50, y1 + 30);
  fillOl(ctx, lgrad(ctx, x0, y0, x1, y1, [
    [0, '#9a96a0'],
    [1, '#4a4650'],
  ]), 6);
  ctx.restore();
  gothicArch(ctx, x0, x1, y0, y1);
  ctx.save();
  ctx.clip();
  const pal = ['#2a5ad0', '#c8283a', '#f2b82a', '#2a9a5a', '#7a3ac8', '#3ab8e8'];
  const cw = 54;
  const chh = 64;
  for (let y = y0; y < y1; y += chh)
    for (let x = x0; x < x1; x += cw) {
      const c = pal[Math.floor(r() * pal.length)];
      ctx.fillStyle = lgrad(ctx, x, y, x + cw, y + chh, [
        [0, shade(c, 0.35)],
        [1, shade(c, -0.15)],
      ]);
      ctx.beginPath();
      ctx.moveTo(x + (r() - 0.5) * 10, y + (r() - 0.5) * 10);
      ctx.lineTo(x + cw, y);
      ctx.lineTo(x + cw, y + chh);
      ctx.lineTo(x, y + chh);
      ctx.closePath();
      ctx.fill();
    }
  // rose medallion with crown
  const rcx = (x0 + x1) / 2;
  const rcy = y0 + 170;
  ellipse(ctx, rcx, rcy, 120, 120);
  ctx.fillStyle = '#2a3a9a';
  ctx.fill();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ellipse(ctx, rcx + Math.cos(a) * 82, rcy + Math.sin(a) * 82, 28, 28);
    ctx.fillStyle = i % 2 ? '#c8283a' : '#f2b82a';
    ctx.fill();
    ctx.strokeStyle = '#1a1418';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(rcx - 50, rcy + 30);
  ctx.lineTo(rcx - 56, rcy - 30);
  ctx.lineTo(rcx - 26, rcy);
  ctx.lineTo(rcx, rcy - 44);
  ctx.lineTo(rcx + 26, rcy);
  ctx.lineTo(rcx + 56, rcy - 30);
  ctx.lineTo(rcx + 50, rcy + 30);
  ctx.closePath();
  ctx.fillStyle = '#ffd84a';
  ctx.fill();
  ctx.strokeStyle = '#1a1418';
  ctx.lineWidth = 5;
  ctx.stroke();
  // lead lines
  ctx.strokeStyle = '#1a1418';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = x0 + cw; x < x1; x += cw) {
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
  }
  for (let y = y0 + chh; y < y1; y += chh) {
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
  }
  ctx.stroke();
  ellipse(ctx, rcx, rcy, 120, 120);
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, rcx, rcy, 300, '#fff0c0', 0.25);
  ctx.restore();
  ctx.restore();
  gothicArch(ctx, x0, x1, y0, y1);
  outline(ctx, 7);
  // mullion
  ctx.beginPath();
  ctx.rect(rcx - 8, rcy + 120, 16, y1 - rcy - 120);
  fillOl(ctx, '#6a6670', 4);
  // banners
  for (const bx of HK.banners) {
    const bw = 210;
    const top = 120;
    const bot = 640;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(bx - bw / 2 + 14, top + 14, bw, bot - top);
    ctx.beginPath();
    ctx.moveTo(bx - bw / 2, top);
    ctx.lineTo(bx + bw / 2, top);
    ctx.lineTo(bx + bw / 2, bot);
    ctx.lineTo(bx, bot - 70);
    ctx.lineTo(bx - bw / 2, bot);
    ctx.closePath();
    fillOl(ctx, hgrad(ctx, bx - bw / 2, bx + bw / 2, [
      [0, '#5a0a14'],
      [0.2, '#a8182a'],
      [0.4, '#7a1020'],
      [0.6, '#b01c2e'],
      [0.85, '#7a1020'],
      [1, '#4a0810'],
    ]), 5);
    ctx.strokeStyle = '#e8b83a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(bx - bw / 2 + 16, top + 10);
    ctx.lineTo(bx - bw / 2 + 16, bot - 26);
    ctx.lineTo(bx, bot - 92);
    ctx.lineTo(bx + bw / 2 - 16, bot - 26);
    ctx.lineTo(bx + bw / 2 - 16, top + 10);
    ctx.stroke();
    // emblem: shield with crown + foot
    const ey = 330;
    ctx.beginPath();
    ctx.moveTo(bx - 60, ey - 70);
    ctx.lineTo(bx + 60, ey - 70);
    ctx.lineTo(bx + 60, ey + 10);
    ctx.quadraticCurveTo(bx + 60, ey + 70, bx, ey + 96);
    ctx.quadraticCurveTo(bx - 60, ey + 70, bx - 60, ey + 10);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, bx - 60, ey - 70, bx + 60, ey + 90, [
      [0, '#ffe08a'],
      [1, '#b8862a'],
    ]), 5);
    ctx.beginPath();
    footPath(ctx, bx, ey + 14, 110);
    ctx.fillStyle = '#5a0a14';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx - 44, ey - 100);
    ctx.lineTo(bx - 48, ey - 140);
    ctx.lineTo(bx - 22, ey - 118);
    ctx.lineTo(bx, ey - 150);
    ctx.lineTo(bx + 22, ey - 118);
    ctx.lineTo(bx + 48, ey - 140);
    ctx.lineTo(bx + 44, ey - 100);
    ctx.closePath();
    fillOl(ctx, '#f2c24a', 4);
    // pole
    ctx.beginPath();
    ctx.rect(bx - bw / 2 - 30, top - 14, bw + 60, 16);
    fillOl(ctx, cylV(ctx, top - 14, 16, '#c8962a'), 4);
    for (const sx of [-1, 1]) {
      ellipse(ctx, bx + sx * (bw / 2 + 36), top - 6, 14, 14);
      fillOl(ctx, '#e8b83a', 4);
    }
  }
  // torches
  for (const t of HK.torches) {
    glow(ctx, t.x, t.y - 40, 380, '#ff8a2a', 0.4);
    ctx.beginPath();
    ctx.moveTo(t.x - 10, t.y + 110);
    ctx.lineTo(t.x - 44, t.y + 130);
    ctx.lineTo(t.x - 44, t.y + 150);
    ctx.lineTo(t.x - 10, t.y + 130);
    ctx.closePath();
    fillOl(ctx, '#2a2620', 4);
    ctx.beginPath();
    ctx.moveTo(t.x - 14, t.y);
    ctx.lineTo(t.x + 14, t.y);
    ctx.lineTo(t.x + 8, t.y + 130);
    ctx.lineTo(t.x - 8, t.y + 130);
    ctx.closePath();
    fillOl(ctx, cylH(ctx, t.x - 14, 28, '#6a4022'), 4);
    ctx.beginPath();
    ctx.moveTo(t.x - 30, t.y - 10);
    ctx.lineTo(t.x + 30, t.y - 10);
    ctx.lineTo(t.x + 18, t.y + 26);
    ctx.lineTo(t.x - 18, t.y + 26);
    ctx.closePath();
    fillOl(ctx, cylH(ctx, t.x - 30, 60, '#4a4440'), 5);
    flame(ctx, t.x, t.y - 6, 70, 130, r, ['#ff4a10', '#ffa020', '#fff0a0']);
    glow(ctx, t.x, t.y - 40, 120, '#ffc060', 0.6);
  }
  // light shafts from the window
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const shafts: [number, string][] = [
    [-0.2, '#ffe0a0'],
    [0.05, '#a0c0ff'],
    [0.3, '#ffb0c0'],
  ];
  for (const [dx, col] of shafts) {
    const g = ctx.createLinearGradient(0, y0 + 200, 0, 980);
    g.addColorStop(0, rgba(col, 0.13));
    g.addColorStop(1, rgba(col, 0.02));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 + ww * (0.15 + dx * 0.5), y0 + 200);
    ctx.lineTo(x0 + ww * (0.85 + dx * 0.5), y0 + 200);
    ctx.lineTo(VX + 500 + dx * 900, 1000);
    ctx.lineTo(VX - 260 + dx * 900, 1000);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // oak banquet table
  const f = HK.front;
  planksTop(ctx, r, f, 0.32, '#6a4224', 0.35, 10, 0.16);
  glow(ctx, VX + 120, 880, 500, '#ffd8a0', 0.12, 0.3);
  woodLip(ctx, r, f, '#5a3418');
  ctx.fillStyle = 'rgba(255,220,160,0.2)';
  ctx.fillRect(0, f + 22, W, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, f + 26, W, 3);
  contactShadow(ctx, 0.6);
  for (const t of HK.torches) glow(ctx, t.x, 820, 380, '#ff8a2a', 0.14, 0.3);
  tableLight(ctx, '#ffd090', 0, 0.5);
  grade(ctx, 0.1);
  vignette(ctx, 0.85, '#04020a');
}

// ---------------------------------------------------------------------------------------------
// Registry

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

const every = (bulbs: Bulb[], n: number, rr: number, flicker: number): GlowSpot[] =>
  bulbs.filter((_, i) => i % n === 0).map((b) => g(b.x, b.y, rr, b.color, flicker));

export const BACKDROPS = {
  trattoria: {
    id: 'trattoria',
    name: 'Trattoria Nonna',
    subtitle: 'Waves 1–4',
    ambient: ['dust'],
    glows: [
      g(TR.oven.x, 600, 230, '#ff7a1a', 0.75),
      g(TR.lamps[0], TR.lampY + 4, 170, '#ffcf80', 0.12),
      g(TR.lamps[1], TR.lampY + 4, 170, '#ffcf80', 0.12),
      g(TR.neon.x, TR.neon.y, 360, '#ff4fa3', 0.2),
    ],
    light: '#ffd9a0',
    tableTint: '#fff2e0',
  },
  rooftop: {
    id: 'rooftop',
    name: 'Rooftop Slice',
    subtitle: 'Waves 6–9',
    ambient: ['fireflies'],
    glows: [g(RT.sun.x, RT.sun.y, 320, '#ffb050', 0.05), ...every(RT_BULBS, 3, 56, 0.3)],
    light: '#ffb886',
    tableTint: '#ffe6dc',
  },
  beach: {
    id: 'beach',
    name: 'Shack Attack Beach Bar',
    subtitle: 'Waves 11–14',
    ambient: ['sparkle'],
    glows: [
      g(BE.sun.x, BE.sun.y, 320, '#ffc070', 0.05),
      g(BE.torch.x, BE.torch.y - 40, 180, '#ff8a2a', 0.85),
      ...every(BE_BULBS, 3, 44, 0.35),
    ],
    light: '#ffc27a',
    tableTint: '#fff0d8',
  },
  diner: {
    id: 'diner',
    name: "Neon Diner '86",
    subtitle: 'Waves 16–19',
    ambient: ['neon'],
    glows: [
      g(DN.open.x, DN.open.y, 260, '#ff3a5a', 0.3),
      g(DN.pizza.x, DN.pizza.y, 380, '#3ae8ff', 0.25),
      g(DN.foot.x, DN.foot.y, 230, '#ff5a6a', 0.4),
      g(DN.juke.x, DN.juke.y, 260, '#ff7ad9', 0.3),
    ],
    light: '#e6a8ff',
    tableTint: '#f4e8ff',
  },
  lodge: {
    id: 'lodge',
    name: 'Alpine Lodge',
    subtitle: 'Waves 21–24',
    ambient: ['snow', 'dust'],
    glows: [
      g(LG.fire.x, 690, 280, '#ff7a1a', 0.8),
      g(80, 360, 70, '#ffb050', 0.5),
      g(420, 360, 70, '#ffb050', 0.5),
      g(LG.sconce.x, LG.sconce.y - 10, 170, '#ffc070', 0.15),
      g(LG.win.x1 - 130, LG.win.y0 + 90, 90, '#cfe0ff', 0.05),
    ],
    light: '#ffc890',
    tableTint: '#fff0e0',
  },
  space: {
    id: 'space',
    name: 'Orbital Pizzeria',
    subtitle: 'Waves 26–29',
    ambient: ['stars'],
    glows: [
      g(SP.sign.x, SP.sign.y + 20, 250, '#ff9a2a', 0.2),
      g(SP.sign.x, SP.sign.y - 118, 150, '#3ae8ff', 0.2),
      g(1094, 400, 420, '#4ab0ff', 0.05),
      ...SP.leds.map(([x, y, c]) => g(x, y, 40, c, 0.7)),
    ],
    light: '#a8d8ff',
    tableTint: '#e6f2ff',
  },
  bigfoot: {
    id: 'bigfoot',
    name: 'Moonlit Woods',
    subtitle: 'Boss: BIGFOOT',
    ambient: ['fog', 'fireflies'],
    glows: [g(BF.moon.x, BF.moon.y, 280, '#cfe0ff', 0.05), g(BF.lantern.x, BF.lantern.y, 200, '#ffb050', 0.35)],
    light: '#a8c0ff',
    tableTint: '#dde6ff',
  },
  ironheel: {
    id: 'ironheel',
    name: 'The Foundry',
    subtitle: 'Boss: THE IRON HEEL',
    ambient: ['sparks', 'embers'],
    glows: [
      g(FD.pour.x, FD.pour.y, 300, '#ff7a20', 0.5),
      g(FD.crucible.x + 60, FD.crucible.y - 30, 180, '#ffb040', 0.4),
      g(400, FD.channel, 260, '#ff6a10', 0.4),
      g(960, FD.channel, 260, '#ff6a10', 0.4),
      g(1500, FD.channel, 260, '#ff6a10', 0.4),
      g(FD.door.x, FD.door.y - 35, 200, '#ff7a20', 0.45),
    ],
    light: '#ff9a50',
    tableTint: '#ffe0c8',
  },
  clownking: {
    id: 'clownking',
    name: 'Big Top',
    subtitle: 'Boss: KING HONK',
    ambient: ['confetti'],
    glows: [
      ...BT.spots.map((sp) => g(sp.tx, sp.ty, 320, '#fff6d0', 0.1)),
      ...BT.spots.map((sp) => g(sp.x, sp.y, 100, '#fffbe8', 0.15)),
    ],
    light: '#fff0c0',
    tableTint: '#fff6e6',
  },
  trex: {
    id: 'trex',
    name: 'Lost Valley',
    subtitle: 'Boss: T-REX TOES',
    ambient: ['embers', 'fog'],
    glows: [
      g(LV.crater.x, LV.crater.y, 300, '#ff6a1a', 0.6),
      g(LV.crater.x, LV.crater.y - 80, 180, '#ffd060', 0.5),
      g(LV.crater.x - 120, 450, 160, '#ff7a2a', 0.4),
    ],
    light: '#ffb070',
    tableTint: '#ffe8d0',
  },
  colossus: {
    id: 'colossus',
    name: 'Hall of Kings',
    subtitle: 'Boss: THE COLOSSUS',
    ambient: ['torch', 'dust'],
    glows: [
      ...HK.torches.map((t) => g(t.x, t.y - 40, 240, '#ffa040', 0.8)),
      g((HK.win.x0 + HK.win.x1) / 2, 340, 320, '#ffe0a0', 0.1),
    ],
    light: '#ffd090',
    tableTint: '#fff0dc',
  },
  phantomking: {
    id: 'phantomking',
    name: 'The Haunted Pizzeria',
    subtitle: 'Boss: GHOST OF FEET PAST',
    ambient: ['wisps', 'fog'],
    glows: [
      g(TR.oven.x, 600, 200, '#4dffb0', 0.6),
      g(TR.neon.x, TR.neon.y, 360, '#ff4fa3', 0.9),
      g(TR.lamps[1], TR.lampY + 4, 140, '#9ad8ff', 0.7),
    ],
    light: '#9fd8d0',
    tableTint: '#cfe0e0',
  },
} as Record<BackdropId, BackdropInfo>;

// Placeholders for the Feetza 2.0 locations and arenas until their own art lands: each borrows an
// existing backdrop's drawing and lighting under its own name.
const PLACEHOLDER: Partial<Record<BackdropId, BackdropId>> = {
  kitchen: 'trattoria',
  oldtown: 'rooftop',
  pier: 'beach',
  rink: 'diner',
  slopes: 'lodge',
  cellar: 'phantomking',
  cosmiccroc: 'space',
  nonna: 'trattoria',
  gargoyle: 'rooftop',
  kraken: 'beach',
  rinkqueen: 'diner',
  yeti: 'lodge',
};
const PLACEHOLDER_NAMES: Partial<Record<BackdropId, [string, string]>> = {
  kitchen: ["Nonna's Kitchen", 'Stage 7'],
  oldtown: ['Old Town Rooftops', 'Stage 8'],
  pier: ['The Pier', 'Stage 9'],
  rink: 'Roller Rink,Stage 10'.split(',') as [string, string],
  slopes: ['Ski Slopes', 'Stage 11'],
  cellar: ['Haunted Cellar', 'Stage 12'],
  cosmiccroc: ['Moon Crater', 'Boss: COSMIC CROC'],
  nonna: ["Nonna's Pantry", "Boss: NONNA'S SLIPPER"],
  gargoyle: ['Bell Tower', 'Boss: THE GARGOYLE'],
  kraken: ['Shipwreck', 'Boss: KRAKEN TOES'],
  rinkqueen: ['Skate Bowl', 'Boss: QUEEN OF THE RINK'],
  yeti: ['Summit', 'Boss: THE YETI SKI BOOT'],
};
for (const [id, from] of Object.entries(PLACEHOLDER) as [BackdropId, BackdropId][]) {
  if ((BACKDROPS as Partial<Record<BackdropId, BackdropInfo>>)[id]) continue;
  const [name, subtitle] = PLACEHOLDER_NAMES[id]!;
  (BACKDROPS as Record<BackdropId, BackdropInfo>)[id] = { ...BACKDROPS[from], id, name, subtitle };
}

/** Locations redrawn with the location kit (src/art/scene): their registered scene replaces the built-in art here,
 * which stays for the before/after page (drawLegacyBackdrop) and for the arenas that reuse it. */
const REDRAWN = new Set<BackdropId>(['trattoria', 'beach', 'space',
  // redrawn with the location kit and painted frame animation: scene-rooftop.ts
  'rooftop',
  // redrawn with the location kit and painted frame animation: scene-kitchen.ts
  'kitchen',
  // redrawn with the location kit and painted frame animation: scene-oldtown.ts
  'oldtown',
  // redrawn with the location kit and painted frame animation: scene-diner.ts
  'diner',
  // redrawn with the location kit and painted frame animation: scene-lodge.ts
  'lodge',
  // the Cosmic Croc's arena, redrawn with the location kit and painted frame animation: scene-cosmiccroc.ts
  'cosmiccroc',
  // Nonna's Slipper's arena, redrawn with the location kit and painted frame animation: scene-nonna.ts
  'nonna',
  // the Gargoyle's arena, redrawn with the location kit and painted frame animation: scene-gargoyle.ts
  'gargoyle',
  // the Iron Heel's arena (the Foundry), redrawn with the location kit and painted frame animation: scene-foundry.ts
  'ironheel',
  // T-Rex Toes' arena (Lost Valley), redrawn with the location kit and painted frame animation: scene-valley.ts
  'trex',
  // the Colossus's arena (the Hall of Kings), redrawn with the location kit and painted frame animation: scene-hall.ts
  'colossus',
  // Bigfoot's arena (the Moonlit Woods), redrawn with the location kit and painted frame animation: scene-woods.ts
  'bigfoot',
  // King Honk's arena (the Big Top), redrawn with the location kit and painted frame animation: scene-clownking.ts
  'clownking',
  // the Pier (Stage 9), redrawn with the location kit and painted frame animation: scene-pier.ts
  'pier']);

// redrawn scenes keep their old info for the before/after page (their old glows and particles with their old art)
const LEGACY_INFO: Partial<Record<BackdropId, BackdropInfo>> = {};
export const legacyInfo = (id: BackdropId): BackdropInfo | undefined => {
  const old = legacySceneDef(id);
  return old ? { ...old.info, id } : LEGACY_INFO[id];
};

// registered scenes replace their placeholder info as soon as they load
onSceneRegistered((id, def) => {
  const prev = (BACKDROPS as Partial<Record<BackdropId, BackdropInfo>>)[id];
  if (prev && REDRAWN.has(id) && !LEGACY_INFO[id]) LEGACY_INFO[id] = prev;
  (BACKDROPS as Record<BackdropId, BackdropInfo>)[id] = { ...def.info, id };
});


export function drawBackdrop(id: BackdropId): HTMLCanvasElement {
  if (REDRAWN.has(id) && sceneDef(id)) {
    const [c, ctx] = makeCanvas(W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    sceneDef(id)!.draw(ctx, rng(hashStr('backdrop:' + id)));
    return c;
  }
  return drawBuiltIn(id);
}

/** The art a redrawn scene had before the location kit (the before/after page, ?dev&stages). */
export function drawLegacyBackdrop(id: BackdropId): HTMLCanvasElement {
  const old = legacySceneDef(id);
  if (old) {
    const [c, ctx] = makeCanvas(W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    old.draw(ctx, rng(hashStr('backdrop:' + id)));
    return c;
  }
  return drawBuiltIn(id);
}

function drawBuiltIn(id: BackdropId): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(W, H);
  const r = rng(hashStr('backdrop:' + id));
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  switch (id) {
    case 'trattoria':
      drawTrattoria(ctx, r, false);
      break;
    case 'phantomking':
      drawTrattoria(ctx, r, true);
      break;
    case 'rooftop':
      drawRooftop(ctx, r);
      break;
    case 'beach':
      drawBeach(ctx, r);
      break;
    case 'diner':
      drawDiner(ctx, r);
      break;
    case 'lodge':
      drawLodge(ctx, r);
      break;
    case 'space':
      drawSpace(ctx, r);
      break;
    case 'bigfoot':
      drawWoods(ctx, r);
      break;
    case 'ironheel':
      drawFoundry(ctx, r);
      break;
    case 'clownking':
      drawBigTop(ctx, r);
      break;
    case 'trex':
      drawLostValley(ctx, r);
      break;
    case 'colossus':
      drawHall(ctx, r);
      break;
    default: {
      const def = sceneDef(id);
      if (def) {
        def.draw(ctx, r);
        break;
      }
      const from = PLACEHOLDER[id];
      if (from) return drawBuiltIn(from);
    }
  }
  return c;
}

// ---------------------------------------------------------------------------------------------
// Shared painting kit for scenes registered from src/content/art (re-exported by sceneKit.ts).

export type { R, Stop, Swag, Bulb, Band };
/** Which backdrops have been redrawn with the location kit (and so have old art to compare with). */
export const isRedrawn = (id: BackdropId): boolean => REDRAWN.has(id) || !!legacySceneDef(id);

export {
  W, H, TY, OL, HY, VX, FOC, ZB,
  CHALK, ROUND, SCRIPT, SLAB, BLOCK,
  yAt, xAt, zAt, quad, planePoly,
  noise, speck, grainRect, cloud, mottle, vgrad, glow, darkSpot, cone, outline, fillOl, hgrad, lgrad, cylH, cylV,
  grade, vignette, contactShadow, tableLight, frontFace, clipRect, zFront,
  checkerTop, bandsX, bandsZ, drapeColumns, clothWeave, drapeFolds, bandCloth, planksTop, woodLip,
  footPath, neonStroke, neonText, cobweb, fogBand, stars, moon, flame, logEnd, pendant, lampLight,
  brickWall, wainscot, catenaryPt, bulbsOn, drawWires, drawBulbs, pine, palm, frond, skyline, hazard, rivet,
  terracottaPot, cloudStreak, chain, girder, starPath, gothicArch, noFeetSign,
};
