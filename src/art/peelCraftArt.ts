// Crafted peels' paint: the Classic Peel and the Golden Crust set (Marble Slab, Copper Pan, Neon Night, Obsidian),
// and their mastered versions, painted as the material each is made of, lit from the top left like the rest of the
// game, with thick dark outlines:
// - wood (the Classic): three glued beech planks with flat-sawn grain, a scorched front edge from the oven, a
//   dusting of flour and semolina where the pies sit, a varnished sheen;
// - marble: cloudy white stone with soft-edged grey veins, a chamfered polished edge and a window's reflection;
// - copper: a spun copper pan, its lathe rings and the radial highlight spun metal throws, a rolled rim, riveted on;
// - neon: dark glass over a circuit (a chip, traces and pads) lit cyan, in a pink neon tube;
// - obsidian: polished volcanic glass, black as a mirror, its flow banding smoky violet with a sheen in it.
// The head is painted in layers so the living peel (src/art/peelCraft.ts) can move what moves between them: the
// material (under), what glows or catches the light (its own layers), the reflection that drifts as the light moves,
// and the rim, studs and outline (over). The still is all of them at rest. Patterns are seeded by the material
// (not the peel), so a mastered peel shows the same wood, stone or circuit as its base, gold-trimmed and foiled.

import { INK } from './feetCommon';
import { PEEL_HEAD, headPath, sparkleStar, type CraftKind, type PeelLook, type PeelShape } from './peelArt';
import { ellipse, hashStr, makeCanvas, mix, rgba, rng, roundRect, shade, type Ctx } from './util';

const { x: HX, y: HY, r: R } = PEEL_HEAD;

/** The box (peel units) a crafted head's layers are cut to: the head and its outline, whatever its shape. */
export const SB = { x: 14, y: 2, w: 192, h: 202 };
/** Where the head meets the handle: it flexes about here. */
export const PIVOT = { x: HX, y: HY + R + 8 };

export type Pt = [number, number];

// ════════════════════════════ geometry (seeded by material) ════════════════════════════

function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(1e-6, r()))) * Math.cos(2 * Math.PI * r());
}

/** A natural wandering line between two points (midpoint displacement on n = 2^k segments): veins, cracks. */
function wander(r: () => number, x0: number, y0: number, x1: number, y1: number, n = 32, amp = 20, rough = 0.55): Pt[] {
  const off = new Float32Array(n + 1);
  let step = n;
  let a = 1;
  while (step > 1) {
    const half = step >> 1;
    for (let i = half; i < n; i += step) off[i] = (off[i - half] + off[i + half]) / 2 + (r() * 2 - 1) * a;
    step = half;
    a *= rough;
  }
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d;
  const ny = dx / d;
  return Array.from({ length: n + 1 }, (_, i) => [x0 + (dx * i) / n + nx * off[i] * amp, y0 + (dy * i) / n + ny * off[i] * amp] as Pt);
}

let probe: Ctx | null = null;
/** Is (x, y) inside the head, at least `margin` from its edge? */
function inside(shape: PeelShape, x: number, y: number, margin = 0): boolean {
  probe ??= makeCanvas(1, 1)[1];
  headPath(probe, shape);
  if (!probe.isPointInPath(x, y)) return false;
  for (let k = 0; margin && k < 8; k++) {
    const a = (k * Math.PI) / 4;
    if (!probe.isPointInPath(x + Math.cos(a) * margin, y + Math.sin(a) * margin)) return false;
  }
  return true;
}

export interface WoodGeo {
  seams: number[];
  tones: number[];
  grain: { pts: Pt[]; w: number; a: number }[];
  arches: { pts: Pt[]; w: number }[];
  pores: [number, number, number][];
  blobs: [number, number, number, number][];
  specks: [number, number, number, number][];
  grits: [number, number, number][];
  chars: [number, number, number, number][];
}

export interface MarbleGeo {
  veins: { pts: Pt[]; w: number }[];
  minor: { pts: Pt[]; w: number; a: number }[];
  hair: Pt[][];
  clouds: [number, number, number, number, number][];
}

export interface NeonGeo {
  chip: { x: number; y: number; w: number; h: number };
  /** Traces from the chip's pins out to pads: polylines and their lengths. */
  traces: { pts: Pt[]; len: number }[];
}

export interface ObsidianGeo {
  flows: Pt[][];
  /** From near the middle outwards: the fracture a smack lights up. */
  cracks: Pt[][];
}

const geoCache = new Map<string, unknown>();
function cached<T>(k: string, make: () => T): T {
  if (!geoCache.has(k)) geoCache.set(k, make());
  return geoCache.get(k) as T;
}

export function woodGeo(): WoodGeo {
  return cached('wood', () => {
    const r = rng(hashStr('craft:wood'));
    const seams = [HX - 29, HX + 31];
    const edges = [HX - R - 8, ...seams, HX + R + 8];
    const grain: WoodGeo['grain'] = [];
    for (let p = 0; p < 3; p++) {
      const xa = edges[p];
      const xb = edges[p + 1];
      const n = Math.round((xb - xa) / (p === 1 ? 11 : 7));
      for (let k = 0; k < n; k++) {
        const x = xa + ((k + 0.25 + r() * 0.5) * (xb - xa)) / n;
        const ph = r() * 6;
        const f = 0.018 + r() * 0.025;
        const amp = 0.5 + r() * 1.5;
        const drift = (r() - 0.5) * 0.05;
        const pts: Pt[] = [];
        for (let y = 2; y <= 206; y += 6) pts.push([x + Math.sin(y * f + ph) * amp + (y - 100) * drift, y]);
        grain.push({ pts, w: 0.6 + r() * 1.1, a: 0.14 + r() * 0.24 });
      }
    }
    // flat-sawn "cathedral" grain in the middle plank: nested arches, rounded at the crown
    const arches: WoodGeo['arches'] = [];
    const cx = (seams[0] + seams[1]) / 2 + 2;
    for (let j = 0; j < 4; j++) {
      // a rounded crown, then legs running down the plank, spreading a little
      const ay = 46 + j * 13;
      const wk = 9 + j * 7;
      const ry = wk * 0.8;
      const ph = r() * 6;
      const leg = (sd: number): Pt[] => {
        const out: Pt[] = [];
        for (let y = ay + ry; y <= 208; y += 6) out.push([cx + sd * (wk + 0.06 * (y - ay - ry)) + Math.sin(y * 0.05 + ph + sd) * 0.8, y]);
        return out;
      };
      const crown: Pt[] = [];
      for (let k = 0; k <= 12; k++) {
        const th = -Math.PI / 2 + (k / 12) * Math.PI;
        crown.push([cx + Math.sin(th) * wk, ay + ry - Math.cos(th) * ry]);
      }
      arches.push({ pts: [...leg(-1).reverse(), ...crown, ...leg(1)], w: 0.8 + r() * 0.7 });
    }
    const pores: WoodGeo['pores'] = [];
    for (let i = 0; i < 80; i++) pores.push([HX - R + r() * R * 2, HY - R + r() * R * 2, 1.5 + r() * 3.5]);
    // flour where the pies sit (a little below the middle), never right out at the rim
    const blobs: WoodGeo['blobs'] = [];
    // (a few patches, each a cluster of soft dabs: flour lies in drifts, not evenly)
    for (let p = 0; p < 5; p++) {
      const px = HX + 4 + gauss(r) * 20;
      const py = HY + 16 + gauss(r) * 16;
      const k = 4 + Math.floor(r() * 5);
      for (let i = 0; i < k; i++) blobs.push([px + gauss(r) * 10, py + gauss(r) * 7, 6 + r() * 12, 0.12 + r() * 0.16]);
    }
    for (let i = 0; i < 8; i++) blobs.push([HX + 4 + gauss(r) * 30, HY + 14 + gauss(r) * 24, 14 + r() * 16, 0.05 + r() * 0.06]);
    const specks: WoodGeo['specks'] = [];
    while (specks.length < 70) {
      const x = HX + 4 + gauss(r) * 28;
      const y = HY + 14 + gauss(r) * 24;
      if (Math.hypot(x - HX, y - HY) < R * 0.8) specks.push([x, y, 0.4 + r() * 0.6, 0.35 + r() * 0.45]);
    }
    const grits: WoodGeo['grits'] = [];
    while (grits.length < 26) {
      const x = HX + 2 + gauss(r) * 30;
      const y = HY + 14 + gauss(r) * 26;
      if (Math.hypot(x - HX, y - HY) < R * 0.8) grits.push([x, y, r() * Math.PI]);
    }
    // char flecks along the scorched front edge
    const chars: WoodGeo['chars'] = [];
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI * 0.88 + r() * Math.PI * 0.76;
      const d = R - 1 - r() * 6;
      chars.push([HX + Math.cos(a) * d, HY + Math.sin(a) * d, 1.2 + r() * 2.4, a]);
    }
    return { seams, tones: [-0.05, 0.06, -0.1], grain, arches, pores, blobs, specks, grits, chars };
  });
}

export function marbleGeo(): MarbleGeo {
  return cached('marble', () => {
    const r = rng(hashStr('craft:marble'));
    const ends: [number, number, number, number, number, number][] = [
      // x0, y0, x1, y1, amplitude, width
      [8, 44 + r() * 20, 212, 126 + r() * 30, 26, 2.8],
      [44 + r() * 20, -4, 150 + r() * 30, 212, 30, 1.9],
      [118 + r() * 30, -4, 214, 74 + r() * 20, 14, 1.5],
    ];
    const veins = ends.map(([x0, y0, x1, y1, amp, w]) => ({ pts: wander(r, x0, y0, x1, y1, 32, amp, 0.44), w }));
    const minor: MarbleGeo['minor'] = [];
    for (let i = 0; i < 8; i++) {
      const v = veins[i % 2 ? 0 : Math.floor(r() * veins.length)];
      const at = 5 + Math.floor(r() * 22);
      const [x0, y0] = v.pts[at];
      const [x1, y1] = v.pts[at + 2];
      const ang = Math.atan2(y1 - y0, x1 - x0) + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.6);
      const len = 22 + r() * 44;
      minor.push({ pts: wander(r, x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len, 16, 6, 0.45), w: 0.6 + r() * 0.6, a: 0.18 + r() * 0.16 });
    }
    const hair: Pt[][] = [];
    for (let i = 0; i < 6; i++) hair.push(wander(r, 4 + r() * 60, -4 + r() * 210, 150 + r() * 70, -4 + r() * 210, 32, 16, 0.6));
    const clouds: MarbleGeo['clouds'] = [];
    for (let i = 0; i < 20; i++) clouds.push([HX + (r() - 0.5) * R * 2.1, HY + (r() - 0.5) * R * 2.1, 14 + r() * 30, r() < 0.45 ? 1 : 0, 0.05 + r() * 0.08]);
    return { veins, minor, hair, clouds };
  });
}

const DIRS: Pt[] = [[1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2], [-1, 0], [-Math.SQRT1_2, -Math.SQRT1_2], [0, -1], [Math.SQRT1_2, -Math.SQRT1_2]];

export function neonGeo(shape: PeelShape): NeonGeo {
  return cached(`neon:${shape}`, () => {
    const r = rng(hashStr('craft:neon'));
    const chip = { x: HX + 2, y: HY + 4, w: 28, h: 20 };
    const pins: [number, number, number][] = [];
    // pins round the chip: [x, y, outward direction (index into DIRS)]
    for (const dy of [-6, 0, 6]) {
      pins.push([chip.x - chip.w / 2, chip.y + dy, 4]);
      pins.push([chip.x + chip.w / 2, chip.y + dy, 0]);
    }
    for (const dx of [-7, 7]) {
      pins.push([chip.x + dx, chip.y - chip.h / 2, 6]);
      pins.push([chip.x + dx, chip.y + chip.h / 2, 2]);
    }
    const taken: Pt[] = [];
    const near = (x: number, y: number, d: number) => taken.some(([a, b]) => Math.hypot(a - x, b - y) < d);
    const inChip = (x: number, y: number) => Math.abs(x - chip.x) < chip.w / 2 + 3 && Math.abs(y - chip.y) < chip.h / 2 + 3;
    const traces: NeonGeo['traces'] = [];
    for (const [px, py, d0] of pins) {
      for (let attempt = 0; attempt < 40; attempt++) {
        const turn = r() < 0.5 ? 1 : -1;
        const legs: [number, number][] = [[d0, 6 + r() * 14], [(d0 + turn + 8) % 8, 10 + r() * 30]];
        if (r() < 0.75) legs.push([r() < 0.6 ? d0 : (d0 + turn * 2 + 8) % 8, 8 + r() * 26]);
        const pts: Pt[] = [[px, py]];
        let x = px;
        let y = py;
        let ok = true;
        const samples: Pt[] = [];
        for (const [di, len] of legs) {
          const [dx, dy] = DIRS[di];
          for (let s = 3; s <= len; s += 3) {
            const sx = x + dx * s;
            const sy = y + dy * s;
            if (!inside(shape, sx, sy, 24) || near(sx, sy, 8) || (inChip(sx, sy) && Math.hypot(sx - px, sy - py) > 4)) ok = false;
            samples.push([sx, sy]);
          }
          if (!ok) break;
          x += dx * len;
          y += dy * len;
          pts.push([x, y]);
        }
        if (!ok) continue;
        let len = 0;
        for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        traces.push({ pts, len });
        taken.push(...samples);
        break;
      }
    }
    return { chip, traces };
  });
}

export function obsidianGeo(): ObsidianGeo {
  return cached('obsidian', () => {
    const r = rng(hashStr('craft:obsidian'));
    const flows: Pt[][] = [];
    // flow lines that bunch and part as glass does, running across it on a slant
    for (const y0 of [8, 30, 38, 92, 104, 150, 196]) {
      const y1 = y0 + 34 + r() * 30;
      flows.push(wander(r, 8, y0 + (r() - 0.5) * 8, 212, y1, 32, 14, 0.52));
    }
    const cracks: Pt[][] = [];
    const k = 7;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + (r() - 0.5) * 0.5;
      const x0 = HX + gauss(r) * 3;
      const y0 = HY + gauss(r) * 3;
      const len = 46 + r() * 40;
      const c = wander(r, x0, y0, x0 + Math.cos(a) * len * 0.86, y0 + Math.sin(a) * len * 1.08, 16, 6, 0.62);
      cracks.push(c);
      if (r() < 0.55) {
        const [bx, by] = c[8];
        const ba = a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5);
        cracks.push(wander(r, bx, by, bx + Math.cos(ba) * len * 0.4, by + Math.sin(ba) * len * 0.4, 8, 4, 0.6));
      }
    }
    return { flows, cracks };
  });
}

// ════════════════════════════ helpers ════════════════════════════

function polyline(ctx: Ctx, pts: Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

/** A smooth line through the points (midpoints joined by quadratic curves). */
function smooth(ctx: Ctx, pts: Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  const l = pts[pts.length - 1];
  ctx.lineTo(l[0], l[1]);
}

/** A vein that swells in the middle and tapers to its ends. */
function taperedLine(ctx: Ctx, pts: Pt[], w: number, col: string): void {
  const n = pts.length - 1;
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    ctx.lineWidth = w * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * t), 0.6)) * (0.8 + 0.4 * Math.sin(i * 1.7));
    ctx.beginPath();
    ctx.moveTo(pts[i][0], pts[i][1]);
    ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
    ctx.stroke();
  }
}

/** A soft radial dab (fades to nothing at its edge). */
function dab(ctx: Ctx, x: number, y: number, r: number, col: string, a: number, sy = 1, rot = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.5, rgba(col, a * 0.55));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

/** The inner edge of the head, lit along its top left and shaded along its bottom right: a bevel or chamfer. */
function bevel(ctx: Ctx, shape: PeelShape, w: number, light: string, la: number, dark: string, da: number): void {
  ctx.save();
  headPath(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(HX - R * 0.75, HY - R * 0.75, HX + R * 0.75, HY + R * 0.75);
  g.addColorStop(0, rgba(light, la));
  g.addColorStop(0.42, rgba(light, 0));
  g.addColorStop(0.58, rgba(dark, 0));
  g.addColorStop(1, rgba(dark, da));
  headPath(ctx, shape);
  ctx.strokeStyle = g;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

/** A shade towards the head's rim (the material curving away), lighter in the top left. */
function rimShade(ctx: Ctx, col: string, a: number, inner = 0.55): void {
  const g = ctx.createRadialGradient(HX - 10, HY - 12, R * inner, HX + 4, HY + 4, R * 1.12);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(1, rgba(col, a));
  ctx.fillStyle = g;
  ctx.fillRect(HX - R - 12, HY - R - 12, R * 2 + 24, R * 2 + 32);
}

/** A window's reflection: two slanted bars that fade out at their ends, and a soft bloom round them. */
export function windowBars(ctx: Ctx, x: number, y: number, len: number, a: number, soft = 0.25, rot = -0.66): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (soft > 0) dab(ctx, 0, 4, len * 0.75, '#ffffff', soft, 0.5);
  const bar = (off: number, w: number, l: number, k: number) => {
    const g = ctx.createLinearGradient(-l / 2, 0, l / 2, 0);
    g.addColorStop(0, rgba('#ffffff', 0));
    g.addColorStop(0.22, rgba('#ffffff', a * k));
    g.addColorStop(0.7, rgba('#ffffff', a * k));
    g.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = g;
    roundRect(ctx, -l / 2, off - w / 2, l, w, w / 2);
    ctx.fill();
  };
  bar(0, len * 0.13, len, 1);
  bar(len * 0.2, len * 0.06, len * 0.86, 0.75);
  ctx.restore();
}

const FOIL = ['#ff5f6d', '#ffc371', '#fff06a', '#7dff9a', '#5fd8ff', '#a77dff', '#ff7ad9'];

function foil(ctx: Ctx, look: PeelLook): void {
  if (!look.shiny) return;
  const fg = ctx.createLinearGradient(HX - R, HY - R, HX + R, HY + R);
  FOIL.forEach((c, i) => fg.addColorStop(i / (FOIL.length - 1), c));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = fg;
  ctx.fillRect(HX - R - 12, HY - R - 12, R * 2 + 24, R * 2 + 32);
  ctx.restore();
}

/** Mastered peels: the foil's sparkles and the gold studs round the rim. */
function trims(ctx: Ctx, look: PeelLook): void {
  if (look.shiny) {
    const sr = rng(hashStr(look.seed + 'sparkle'));
    ctx.save();
    headPath(ctx, look.shape);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 7; i++) {
      sparkleStar(ctx, HX - R + 14 + sr() * (R * 2 - 28), HY - R + 14 + sr() * (R * 2 - 28), 4 + sr() * 7);
      ctx.fill();
    }
    ctx.restore();
  }
  if (look.studs) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.75 + (i / (n - 1)) * Math.PI * 1.5;
      const sx = HX + Math.cos(a) * (R - 12);
      const sy = HY + Math.sin(a) * (R - 12);
      ellipse(ctx, sx + 0.8, sy + 1.2, 5.5, 5.5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();
      ellipse(ctx, sx, sy, 5.5, 5.5);
      const g = ctx.createRadialGradient(sx - 2, sy - 2, 0.5, sx, sy, 6);
      g.addColorStop(0, shade(look.studs, 0.6));
      g.addColorStop(0.6, look.studs);
      g.addColorStop(1, shade(look.studs, -0.35));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
      ellipse(ctx, sx - 1.6, sy - 1.6, 1.8, 1.8);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
    }
  }
}

function outline(ctx: Ctx, look: PeelLook): void {
  headPath(ctx, look.shape);
  ctx.strokeStyle = look.rim ?? INK;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** The handle's shaft, inset from its outline: extras are painted inside it. */
function inHandle(ctx: Ctx, draw: () => void): void {
  ctx.save();
  roundRect(ctx, HX - 11.5, HY + R - 12, 23, 166, 10);
  ctx.clip();
  draw();
  ctx.restore();
}

// ════════════════════════════ wood ════════════════════════════

function woodUnder(ctx: Ctx, look: PeelLook): void {
  const g = woodGeo();
  const base = look.head[1];
  const edges = [HX - R - 10, ...g.seams, HX + R + 10];
  // the planks, each its own tone
  for (let p = 0; p < 3; p++) {
    const tone = shade(base, g.tones[p]);
    const lg = ctx.createLinearGradient(0, HY - R, 0, HY + R + 10);
    lg.addColorStop(0, shade(tone, 0.1));
    lg.addColorStop(0.55, tone);
    lg.addColorStop(1, shade(tone, -0.08));
    ctx.fillStyle = lg;
    ctx.fillRect(edges[p], HY - R - 12, edges[p + 1] - edges[p], R * 2 + 32);
  }
  const dark = shade(base, -0.52);
  // cathedral grain in the middle plank: a soft band, then the line
  ctx.save();
  ctx.beginPath();
  ctx.rect(g.seams[0] + 1, 0, g.seams[1] - g.seams[0] - 2, 220);
  ctx.clip();
  for (const a of g.arches) {
    smooth(ctx, a.pts);
    ctx.strokeStyle = rgba(dark, 0.05);
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.16);
    ctx.lineWidth = a.w;
    ctx.stroke();
  }
  ctx.restore();
  for (const l of g.grain) {
    // (the middle plank's straight grain stays off its arches' crown)
    smooth(ctx, l.pts);
    ctx.strokeStyle = rgba(dark, l.a);
    ctx.lineWidth = l.w;
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(dark, 0.22);
  ctx.lineWidth = 0.9;
  for (const [x, y, len] of g.pores) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.3, y + len);
    ctx.stroke();
  }
  // glued seams: a dark join and a lit lip beside it
  for (const x of g.seams) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 1, 210);
    ctx.strokeStyle = rgba(INK, 0.38);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 1.4, 0);
    ctx.lineTo(x + 2.4, 210);
    ctx.strokeStyle = rgba('#fff2d8', 0.3);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // light pooling in the top left, the wood curving away at the rim
  dab(ctx, HX - 30, HY - 36, R * 1.05, '#fff0d0', 0.3);
  rimShade(ctx, '#4a2208', 0.42, 0.5);
  // the front edge scorched from the oven: darkest at the rim, fading down the sides
  const [sc, sx] = makeCanvas(220, 220);
  const rg = sx.createRadialGradient(HX, HY, R * 0.6, HX, HY, R * 1.0);
  rg.addColorStop(0, 'rgba(90,40,12,0)');
  rg.addColorStop(0.5, 'rgba(100,42,10,0.3)');
  rg.addColorStop(0.82, 'rgba(60,22,5,0.62)');
  rg.addColorStop(1, 'rgba(30,10,2,0.9)');
  sx.fillStyle = rg;
  sx.fillRect(0, 0, 220, 220);
  sx.globalCompositeOperation = 'destination-in';
  const vg = sx.createLinearGradient(0, HY - R * 0.85, 0, HY + R * 0.15);
  vg.addColorStop(0, 'rgba(0,0,0,1)');
  vg.addColorStop(1, 'rgba(0,0,0,0)');
  sx.fillStyle = vg;
  sx.fillRect(0, 0, 220, 220);
  ctx.drawImage(sc, 0, 0);
  for (const [x, y, rr, a] of g.chars) {
    dab(ctx, x, y, rr * 2.4, '#2a1004', 0.45, 0.55, a + Math.PI / 2);
    ellipse(ctx, x, y, rr, rr * 0.6, a + Math.PI / 2);
    ctx.fillStyle = rgba('#1e0a02', 0.55);
    ctx.fill();
  }
  // a dusting of flour and semolina where the pies sit
  for (const [x, y, rr, a] of g.blobs) dab(ctx, x, y, rr, '#fffaf0', a);
  for (const [x, y, rr, a] of g.specks) {
    ellipse(ctx, x, y, rr, rr);
    ctx.fillStyle = rgba('#fffbf2', a);
    ctx.fill();
  }
  for (const [x, y, rot] of g.grits) {
    ellipse(ctx, x + 0.3, y + 0.4, 1.5, 0.9, rot);
    ctx.fillStyle = rgba('#8a5a22', 0.35);
    ctx.fill();
    ellipse(ctx, x, y, 1.4, 0.85, rot);
    ctx.fillStyle = rgba('#f4dca0', 0.9);
    ctx.fill();
  }
  foil(ctx, look);
}

/** The grain caught by the light: the sheen sweeping the varnish lights these (src/art/peelCraft.ts). */
export function woodGrainLit(ctx: Ctx): void {
  const g = woodGeo();
  ctx.strokeStyle = '#fff4dc';
  for (const l of g.grain) {
    smooth(ctx, l.pts);
    ctx.lineWidth = l.w + 0.5;
    ctx.globalAlpha = Math.min(1, l.a * 2.6);
    ctx.stroke();
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(g.seams[0] + 1, 0, g.seams[1] - g.seams[0] - 2, 220);
  ctx.clip();
  for (const a of g.arches) {
    smooth(ctx, a.pts);
    ctx.lineWidth = a.w + 0.6;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function woodOver(ctx: Ctx, look: PeelLook): void {
  // varnish: a soft pool and a crisp highlight, top left
  ctx.save();
  headPath(ctx, look.shape);
  ctx.clip();
  dab(ctx, HX - 34, HY - 44, 44, '#ffffff', 0.32, 0.42, -0.62);
  ctx.restore();
  ellipse(ctx, HX - 40, HY - 50, 12, 4.2, -0.62);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  ellipse(ctx, HX - 21, HY - 61, 3.4, 1.5, -0.62);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  bevel(ctx, look.shape, 12, '#fff4dc', 0.55, '#3a1a06', 0.38);
  trims(ctx, look);
  outline(ctx, look);
}

function woodHandle(ctx: Ctx, look: PeelLook): void {
  inHandle(ctx, () => {
    const dark = shade(look.handle[1], -0.35);
    const r = rng(hashStr('craft:woodhandle'));
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 5; i++) {
      const x = HX - 9 + i * 4.4 + r() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, HY + R);
      ctx.bezierCurveTo(x + 2, HY + R + 50, x - 2, HY + R + 100, x + 1, HY + R + 150);
      ctx.strokeStyle = rgba(dark, 0.18 + r() * 0.15);
      ctx.stroke();
    }
  });
}

// ════════════════════════════ marble ════════════════════════════

function marbleUnder(ctx: Ctx, look: PeelLook): void {
  const g = marbleGeo();
  const gr = ctx.createRadialGradient(HX - 30, HY - 36, 8, HX, HY, R * 1.2);
  gr.addColorStop(0, shade(look.head[0], 0.2));
  gr.addColorStop(0.6, look.head[1]);
  gr.addColorStop(1, shade(look.head[1], -0.1));
  ctx.fillStyle = gr;
  ctx.fillRect(HX - R - 12, HY - R - 12, R * 2 + 24, R * 2 + 32);
  // cloudy stone
  for (const [x, y, rr, light, a] of g.clouds) dab(ctx, x, y, rr, light ? '#ffffff' : '#9a908c', light ? a * 1.6 : a);
  const pc = look.patternColor;
  const vein = mix(pc, '#4a4858', 0.2);
  for (const h of g.hair) {
    smooth(ctx, h);
    ctx.strokeStyle = rgba(pc, 0.13);
    ctx.lineWidth = 0.55;
    ctx.stroke();
  }
  // the veins: a soft halo bleeding into the stone, then the vein, swelling and tapering
  for (const v of g.veins) {
    smooth(ctx, v.pts);
    ctx.strokeStyle = rgba(pc, 0.045);
    ctx.lineWidth = v.w * 9;
    ctx.stroke();
    ctx.strokeStyle = rgba(pc, 0.08);
    ctx.lineWidth = v.w * 4;
    ctx.stroke();
    ctx.strokeStyle = rgba(pc, 0.12);
    ctx.lineWidth = v.w * 2;
    ctx.stroke();
    taperedLine(ctx, v.pts, v.w, rgba(vein, 0.5));
  }
  for (const m of g.minor) {
    smooth(ctx, m.pts);
    ctx.strokeStyle = rgba(pc, 0.06);
    ctx.lineWidth = m.w * 4;
    ctx.stroke();
    taperedLine(ctx, m.pts, m.w * 1.2, rgba(vein, m.a));
  }
  rimShade(ctx, '#5a5060', 0.2, 0.6);
  foil(ctx, look);
}

/** The veins lit gold (a smack's light floods out along them; glints travel them). */
export function marbleVeinsLit(ctx: Ctx): void {
  const g = marbleGeo();
  for (const v of g.veins) {
    smooth(ctx, v.pts);
    ctx.strokeStyle = 'rgba(255,190,70,0.22)';
    ctx.lineWidth = v.w * 7;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,196,80,0.55)';
    ctx.lineWidth = v.w * 3.2;
    ctx.stroke();
    taperedLine(ctx, v.pts, v.w * 1.5, 'rgba(255,248,214,1)');
  }
  for (const m of g.minor) {
    smooth(ctx, m.pts);
    ctx.strokeStyle = 'rgba(255,196,80,0.4)';
    ctx.lineWidth = m.w * 3.5;
    ctx.stroke();
    taperedLine(ctx, m.pts, m.w * 1.5, 'rgba(255,246,210,0.9)');
  }
}

function marbleOver(ctx: Ctx, look: PeelLook): void {
  // the slab's chamfered edge
  bevel(ctx, look.shape, 17, '#ffffff', 0.75, '#4a4458', 0.32);
  ctx.save();
  headPath(ctx, look.shape);
  ctx.clip();
  // the chamfer's inner line
  ctx.translate(HX, HY);
  ctx.scale(0.93, 0.93);
  ctx.translate(-HX, -HY);
  headPath(ctx, look.shape);
  ctx.strokeStyle = 'rgba(90,84,100,0.16)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  trims(ctx, look);
  outline(ctx, look);
}

// ════════════════════════════ copper ════════════════════════════

function copperUnder(ctx: Ctx, look: PeelLook): void {
  const base = look.head[1];
  const gr = ctx.createRadialGradient(HX - 26, HY - 34, 4, HX, HY, R * 1.08);
  gr.addColorStop(0, shade(base, 0.66));
  gr.addColorStop(0.2, shade(base, 0.3));
  gr.addColorStop(0.55, base);
  gr.addColorStop(0.84, shade(base, -0.34));
  gr.addColorStop(1, shade(base, -0.52));
  ctx.fillStyle = gr;
  ctx.fillRect(HX - R - 12, HY - R - 12, R * 2 + 24, R * 2 + 32);
  // lathe rings from spinning
  for (let i = 0, rr = 3; rr < R; i++, rr += 2.1) {
    ctx.beginPath();
    ctx.arc(HX, HY, rr, 0, Math.PI * 2);
    ctx.strokeStyle = i % 2 ? `rgba(255,236,214,${0.04 + (i % 5) * 0.008})` : `rgba(70,24,6,${0.05 + (i % 3) * 0.012})`;
    ctx.lineWidth = 1.05;
    ctx.stroke();
  }
  copperSpin(ctx, 0, 1);
  // the room's horizon across the lower half, and warm bounce light under it
  const hg = ctx.createLinearGradient(HX - R * 0.7, HY - R * 0.7, HX + R * 0.7, HY + R * 0.7);
  hg.addColorStop(0.52, 'rgba(80,28,8,0)');
  hg.addColorStop(0.66, 'rgba(80,28,8,0.26)');
  hg.addColorStop(0.8, 'rgba(80,28,8,0)');
  hg.addColorStop(0.95, 'rgba(255,186,140,0.2)');
  ctx.fillStyle = hg;
  ctx.fillRect(HX - R - 12, HY - R - 12, R * 2 + 24, R * 2 + 32);
  foil(ctx, look);
}

/** Spun metal's radial highlight: bright lobes towards the light (and a weaker one opposite), dark lobes across.
 *  `turn`: radians the lobes have swung; a: strength. */
export function copperSpin(ctx: Ctx, turn: number, a: number): void {
  const [c, cx] = makeCanvas(R * 2 + 8, R * 2 + 8);
  const o = R + 4;
  const cg = cx.createConicGradient(turn, o, o);
  const lobe = (at: number, w: number, col: string, k: number) => {
    cg.addColorStop(Math.max(0, at - w), rgba(col, 0));
    cg.addColorStop(at, rgba(col, k * a));
    cg.addColorStop(Math.min(1, at + w), rgba(col, 0));
  };
  cg.addColorStop(0, 'rgba(0,0,0,0)');
  lobe(0.125, 0.045, '#ffeede', 0.22);
  lobe(0.375, 0.05, '#3c1204', 0.2);
  lobe(0.625, 0.05, '#fff2e4', 0.45);
  lobe(0.875, 0.05, '#3c1204', 0.18);
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = cg;
  cx.fillRect(0, 0, c.width, c.height);
  // (it meets in a point in the middle: soften that)
  cx.globalCompositeOperation = 'destination-in';
  const rg = cx.createRadialGradient(o, o, 0, o, o, 22);
  rg.addColorStop(0, 'rgba(0,0,0,0.15)');
  rg.addColorStop(1, 'rgba(0,0,0,1)');
  cx.fillStyle = rg;
  cx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(c, HX - o, HY - o);
}

function copperOver(ctx: Ctx, look: PeelLook): void {
  const base = look.head[1];
  ctx.save();
  headPath(ctx, look.shape);
  ctx.clip();
  // the rolled rim
  const rg = ctx.createLinearGradient(HX - R * 0.75, HY - R * 0.75, HX + R * 0.75, HY + R * 0.75);
  rg.addColorStop(0, shade(base, 0.62));
  rg.addColorStop(0.45, shade(base, 0.12));
  rg.addColorStop(0.7, shade(base, -0.25));
  rg.addColorStop(1, shade(base, -0.5));
  headPath(ctx, look.shape);
  ctx.strokeStyle = rg;
  ctx.lineWidth = 15;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(HX, HY, R - 7.5, Math.PI * 0.64, Math.PI * 2.36);
  ctx.strokeStyle = 'rgba(60,18,4,0.34)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(HX, HY, R - 4, Math.PI * 1.02, Math.PI * 1.48);
  ctx.strokeStyle = 'rgba(255,240,226,0.75)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // the dimple where it was spun
  dab(ctx, HX, HY, 5, '#fff0e0', 0.35);
  ctx.restore();
  trims(ctx, look);
  outline(ctx, look);
}

function copperHandle(ctx: Ctx, look: PeelLook): void {
  // riveted on
  for (const y of [HY + R + 22, HY + R + 40]) {
    ellipse(ctx, HX + 0.8, y + 1.2, 4.4, 4.4);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ellipse(ctx, HX, y, 4.2, 4.2);
    const g = ctx.createRadialGradient(HX - 1.5, y - 1.6, 0.4, HX, y, 4.6);
    g.addColorStop(0, shade(look.head[1], 0.6));
    g.addColorStop(0.55, look.head[1]);
    g.addColorStop(1, shade(look.head[1], -0.45));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.85);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ellipse(ctx, HX - 1.4, y - 1.5, 1.3, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  }
}

// ════════════════════════════ neon ════════════════════════════

const CYAN = '#3ae8ff';
const PINK = '#ff4fa3';

/** The pink tube's path: the head's shape, inset. */
function tubePath(ctx: Ctx, shape: PeelShape): void {
  ctx.save();
  ctx.translate(HX, HY - 6);
  ctx.scale(0.81, 0.81);
  ctx.translate(-HX, -HY);
  headPath(ctx, shape);
  ctx.restore();
}

function neonChip(ctx: Ctx, g: NeonGeo): void {
  const { x, y, w, h } = g.chip;
  // pins
  ctx.fillStyle = '#9aa0b0';
  for (const dy of [-6, 0, 6]) {
    ctx.fillRect(x - w / 2 - 3, y + dy - 1.2, 3, 2.4);
    ctx.fillRect(x + w / 2, y + dy - 1.2, 3, 2.4);
  }
  for (const dx of [-7, 7]) {
    ctx.fillRect(x + dx - 1.2, y - h / 2 - 3, 2.4, 3);
    ctx.fillRect(x + dx - 1.2, y + h / 2, 2.4, 3);
  }
  roundRect(ctx, x - w / 2 + 1, y - h / 2 + 2, w, h, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 3);
  const cg = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
  cg.addColorStop(0, '#2e2a3e');
  cg.addColorStop(1, '#0a0910');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  roundRect(ctx, x - w / 2 + 2.5, y - h / 2 + 2, w - 5, 2.2, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fill();
  ellipse(ctx, x - w / 2 + 5, y + h / 2 - 5, 1.6, 1.6);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();
}

function neonUnder(ctx: Ctx, look: PeelLook, lit: boolean): void {
  const g = neonGeo(look.shape);
  const gr = ctx.createRadialGradient(HX - 34, HY - 40, 6, HX, HY, R * 1.2);
  gr.addColorStop(0, shade(look.head[1], 0.32));
  gr.addColorStop(0.5, look.head[1]);
  gr.addColorStop(1, shade(look.head[1], -0.62));
  ctx.fillStyle = gr;
  ctx.fillRect(HX - R - 12, HY - R - 12, R * 2 + 24, R * 2 + 32);
  // the board under the glass
  ctx.strokeStyle = 'rgba(140,110,255,0.07)';
  ctx.lineWidth = 0.8;
  for (let x = HX - R - 6; x < HX + R + 6; x += 9) {
    ctx.beginPath();
    ctx.moveTo(x, HY - R - 10);
    ctx.lineTo(x, HY + R + 14);
    ctx.stroke();
  }
  for (let y = HY - R - 6; y < HY + R + 14; y += 9) {
    ctx.beginPath();
    ctx.moveTo(HX - R - 10, y);
    ctx.lineTo(HX + R + 10, y);
    ctx.stroke();
  }
  // unlit, the tubes are dark glass
  for (const t of g.traces) {
    polyline(ctx, t.pts);
    ctx.strokeStyle = '#143a48';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#2a6676';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const t of g.traces) neonPad(ctx, t.pts[t.pts.length - 1], '#143a48', '#2a6676');
  tubePath(ctx, look.shape);
  ctx.strokeStyle = '#4a1e3a';
  ctx.lineWidth = 3.8;
  ctx.stroke();
  ctx.strokeStyle = '#7a3a62';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  neonChip(ctx, g);
  if (lit) {
    neonTracesLit(ctx, look);
    neonTubeLit(ctx, look);
  }
  rimShade(ctx, '#000000', 0.45, 0.6);
  foil(ctx, look);
}

function neonPad(ctx: Ctx, [x, y]: Pt, ring: string, core: string): void {
  ellipse(ctx, x, y, 3.6, 3.6);
  ctx.fillStyle = '#05040a';
  ctx.fill();
  ctx.strokeStyle = ring;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ellipse(ctx, x, y, 1.2, 1.2);
  ctx.fillStyle = core;
  ctx.fill();
}

/** The circuit lit: a glow, the tube and its white-hot core. */
export function neonTracesLit(ctx: Ctx, look: PeelLook, glow = 1): void {
  const g = neonGeo(look.shape);
  for (const t of g.traces) {
    polyline(ctx, t.pts);
    ctx.strokeStyle = rgba(CYAN, 0.2 * glow);
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = rgba(CYAN, 0.95);
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.strokeStyle = '#e4feff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const t of g.traces) {
    const [x, y] = t.pts[t.pts.length - 1];
    dab(ctx, x, y, 9, CYAN, 0.35 * glow);
    neonPad(ctx, [x, y], CYAN, '#e4feff');
  }
}

/** The pink tube lit. */
export function neonTubeLit(ctx: Ctx, look: PeelLook, glow = 1): void {
  tubePath(ctx, look.shape);
  ctx.strokeStyle = rgba(PINK, 0.2 * glow);
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.strokeStyle = rgba(PINK, 0.26 * glow);
  ctx.lineWidth = 6.5;
  ctx.stroke();
  ctx.strokeStyle = '#ff6ab4';
  ctx.lineWidth = 3.6;
  ctx.stroke();
  ctx.strokeStyle = '#ffe6f3';
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function neonOver(ctx: Ctx, look: PeelLook): void {
  bevel(ctx, look.shape, 10, '#c8b4ff', 0.3, '#000000', 0.5);
  trims(ctx, look);
  outline(ctx, look);
}

function neonHandle(ctx: Ctx): void {
  inHandle(ctx, () => {
    // the handle is a lit tube too: a bright core down its length
    const g = ctx.createLinearGradient(0, HY + R + 4, 0, HY + R + 140);
    g.addColorStop(0, 'rgba(255,214,236,0)');
    g.addColorStop(0.15, 'rgba(255,214,236,0.6)');
    g.addColorStop(0.85, 'rgba(255,214,236,0.6)');
    g.addColorStop(1, 'rgba(255,214,236,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(HX - 3, HY + R + 4);
    ctx.lineTo(HX - 3, HY + R + 140);
    ctx.stroke();
  });
}

// ════════════════════════════ obsidian ════════════════════════════

/** A flow band, as a soft ribbon of width w (peel units). */
function bandStroke(ctx: Ctx, pts: Pt[], w: number, col: string, a: number): void {
  smooth(ctx, pts);
  ctx.strokeStyle = rgba(col, a * 0.35);
  ctx.lineWidth = w * 2.2;
  ctx.stroke();
  ctx.strokeStyle = rgba(col, a);
  ctx.lineWidth = w;
  ctx.stroke();
}

function obsidianUnder(ctx: Ctx, look: PeelLook): void {
  const g = obsidianGeo();
  const base = look.head[1];
  const gr = ctx.createRadialGradient(HX - 28, HY - 40, 4, HX, HY, R * 1.15);
  gr.addColorStop(0, shade(base, 0.32));
  gr.addColorStop(0.42, base);
  gr.addColorStop(1, shade(base, -0.72));
  ctx.fillStyle = gr;
  ctx.fillRect(HX - R - 12, HY - R - 12, R * 2 + 24, R * 2 + 32);
  // the glass's flow banding: smoky violet ribbons deep in it, a fine bright line in some
  const pc = look.patternColor;
  g.flows.forEach((f, i) => {
    bandStroke(ctx, f, 4 + (i % 3) * 3, mix(pc, '#2a1a4a', 0.6), 0.16);
    if (i % 3 === 0) {
      smooth(ctx, f);
      ctx.strokeStyle = rgba(pc, 0.22);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  });
  // the sheen the banding throws (sheen obsidian), faint at rest
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.16;
  obsidianSheen(ctx);
  ctx.restore();
  // a deep glow pooled in the glass, low on the far side from the light
  dab(ctx, HX + 22, HY + 30, 50, pc, 0.12, 0.8, -0.6);
  foil(ctx, look);
}

/** The flow bands lit from within (the glass's slow inner fire). */
export function obsidianFlowLit(ctx: Ctx): void {
  obsidianGeo().flows.forEach((f, i) => {
    bandStroke(ctx, f, 3 + (i % 3) * 2.5, '#9a5aff', 0.4);
    smooth(ctx, f);
    ctx.strokeStyle = 'rgba(226,196,255,0.9)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  });
}

/** Sheen obsidian's iridescence: violet, blue and green-gold in the bands, where the light catches them. */
export function obsidianSheen(ctx: Ctx): void {
  const cols = ['#b07aff', '#6a9aff', '#5ad8c8', '#d8c070', '#ff8ad0'];
  obsidianGeo().flows.forEach((f, i) => {
    const g = ctx.createLinearGradient(f[0][0], f[0][1], f[f.length - 1][0], f[f.length - 1][1]);
    for (let k = 0; k < 4; k++) g.addColorStop(k / 3, cols[(i + k) % cols.length]);
    smooth(ctx, f);
    ctx.strokeStyle = g;
    ctx.lineWidth = 6 + (i % 3) * 3;
    ctx.stroke();
  });
}

function obsidianOver(ctx: Ctx, look: PeelLook): void {
  ctx.save();
  headPath(ctx, look.shape);
  ctx.clip();
  // light through the thin edge of the glass
  headPath(ctx, look.shape);
  ctx.strokeStyle = 'rgba(120,76,176,0.34)';
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.restore();
  bevel(ctx, look.shape, 7, '#ffffff', 0.7, '#000000', 0.4);
  trims(ctx, look);
  outline(ctx, look);
}

// ════════════════════════════ the reflection that drifts ════════════════════════════

/** The room's reflection on a polished head (marble, copper, glass), at rest. The living peel moves it about. */
export function craftReflect(ctx: Ctx, kind: CraftKind): void {
  switch (kind) {
    case 'marble':
      windowBars(ctx, HX - 36, HY - 40, 64, 0.5, 0.22);
      break;
    case 'copper':
      windowBars(ctx, HX - 34, HY - 38, 56, 0.55, 0.3);
      break;
    case 'neon':
      windowBars(ctx, HX - 38, HY - 44, 60, 0.3, 0.1);
      break;
    case 'obsidian':
      windowBars(ctx, HX - 30, HY - 46, 52, 0.75, 0.12);
      ellipse(ctx, HX + 34, HY + 50, 6, 2.2, -0.66);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      break;
    case 'wood':
      break;
  }
}

/** Does this material have a reflection to drift? */
export const hasReflect = (k: CraftKind): boolean => k !== 'wood';

// ════════════════════════════ the head, in layers ════════════════════════════

/** The material, inside the head (the caller clips). `lit`: neon tubes lit (the still) or dark (the living peel
 *  lights them itself). */
export function craftUnder(ctx: Ctx, look: PeelLook, lit = true): void {
  switch (look.craft) {
    case 'wood':
      return woodUnder(ctx, look);
    case 'marble':
      return marbleUnder(ctx, look);
    case 'copper':
      return copperUnder(ctx, look);
    case 'neon':
      return neonUnder(ctx, look, lit);
    case 'obsidian':
      return obsidianUnder(ctx, look);
  }
}

/** Over the material: rims, bevels, highlights, studs, foil sparkles and the outline. */
export function craftOver(ctx: Ctx, look: PeelLook): void {
  switch (look.craft) {
    case 'wood':
      return woodOver(ctx, look);
    case 'marble':
      return marbleOver(ctx, look);
    case 'copper':
      return copperOver(ctx, look);
    case 'neon':
      return neonOver(ctx, look);
    case 'obsidian':
      return obsidianOver(ctx, look);
  }
}

/** On the handle (drawn before the head): the material's touches, and the head's contact shadow on it. */
export function craftHandle(ctx: Ctx, look: PeelLook): void {
  if (look.craft === 'wood') woodHandle(ctx, look);
  if (look.craft === 'copper') copperHandle(ctx, look);
  if (look.craft === 'neon') neonHandle(ctx);
  inHandle(ctx, () => {
    const g = ctx.createLinearGradient(0, HY + R + 4, 0, HY + R + 24);
    g.addColorStop(0, 'rgba(30,12,2,0.5)');
    g.addColorStop(1, 'rgba(30,12,2,0)');
    ctx.fillStyle = g;
    ctx.fillRect(HX - 14, HY + R + 4, 28, 20);
  });
}

/** A crafted peel's head, whole (the still): handle touches, the material, its reflection, and the rim. Drawn over
 *  the handle (it is the look's `custom`). */
export function paintCraftHead(ctx: Ctx, look: PeelLook): void {
  if (!look.craft) return;
  craftHandle(ctx, look);
  ctx.save();
  headPath(ctx, look.shape);
  ctx.clip();
  craftUnder(ctx, look, true);
  craftReflect(ctx, look.craft);
  ctx.restore();
  craftOver(ctx, look);
}
