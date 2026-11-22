// Painting bits shared by the Rooftop, Diner, Lodge and their arenas (scene-rooftop.ts and the rest), on top of the
// location kit (src/art/scene): foliage painted as masses of leaves (no outlines: a body in shade, dabs turning lit
// where they face the light, a cool rim where they turn away), conifers and far tree lines, smooth ridges, a tartan
// cloth on the table plane, string-light bulbs and perspective rows of floor tiles behind the table.

import { FOC, VX, ZB, yAt, zAt } from '../../art/backdrops';
import { type Air, type Ctx, type R, TY, W, airMix } from '../../art/scene/kit';
import { grain, planeQuad } from '../../art/scene/materials';
import { drift, lay, noiseMask, softly } from '../../art/scene/paint';
import { mix, rgba, shade } from '../../art/util';

// ——— foliage ———

export interface LeafOpts {
  /** Shade, body and lit colours of the leaves. */
  dark: string;
  mid: string;
  lit: string;
  /** A cool rim on the side turned from the light (sky, moon), and its strength. */
  rim?: string;
  rimA?: number;
  /** Leaf size (px) and how densely they cover the mass (1 = about one layer). */
  size: number;
  density?: number;
  shape?: 'leaf' | 'needle' | 'round' | 'blade';
  /** Direction towards the light (default the key: top left). */
  toLight?: [number, number];
  /** Leaf angle at a point (default random). */
  angle?: (x: number, y: number, r: R) => number;
  depth?: number;
  air?: Air;
  /** Underpaint the body softly first (default true). */
  body?: boolean;
}

/**
 * A mass of foliage: the union of `blobs` (x, y, radius) painted as leaves. A soft body in shade first, then leaves
 * dabbed over it, sorted so the lit ones (those on the side of each blob facing the light) sit on top; the edge
 * breaks into single leaves, so the silhouette is never a clean line.
 */
export function leafMass(ctx: Ctx, r: R, blobs: [number, number, number][], o: LeafOpts): void {
  const [lx0, ly0] = o.toLight ?? [-0.6, -0.8];
  const ll = Math.hypot(lx0, ly0) || 1;
  const lx = lx0 / ll;
  const ly = ly0 / ll;
  const air = (c: string) => (o.air ? airMix(c, o.depth ?? 0, o.air) : c);
  const dark = air(o.dark);
  const mid = air(o.mid);
  const lit = air(o.lit);
  if (o.body !== false) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y, rad] of blobs) {
      x0 = Math.min(x0, x - rad);
      y0 = Math.min(y0, y - rad);
      x1 = Math.max(x1, x + rad);
      y1 = Math.max(y1, y + rad);
    }
    const box = { x: x0 - 8, y: y0 - 8, w: x1 - x0 + 16, h: y1 - y0 + 16 };
    softly(ctx, box, (g) => {
      for (const [x, y, rad] of blobs) {
        const gr = g.createRadialGradient(x + lx * rad * 0.3, y + ly * rad * 0.3, rad * 0.1, x, y, rad * 0.86);
        gr.addColorStop(0, mix(dark, mid, 0.35));
        gr.addColorStop(1, dark);
        g.fillStyle = gr;
        g.beginPath();
        g.arc(x, y, rad * 0.86, 0, Math.PI * 2);
        g.fill();
      }
    }, 0.5);
  }
  type Dab = { x: number; y: number; t: number; a: number; s: number; rimK: number };
  const dabs: Dab[] = [];
  const size = o.size;
  const dens = o.density ?? 1;
  for (const [bx, by, rad] of blobs) {
    const n = Math.round(((Math.PI * rad * rad) / (size * size * 0.9)) * dens);
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt(r()) * rad;
      const th = r() * Math.PI * 2;
      const dx = Math.cos(th) * d;
      const dy = Math.sin(th) * d;
      const u = (dx * lx + dy * ly) / rad;
      // tone: facing the light (u), the outer leaves more so (d), a little noise
      const t = Math.max(0, Math.min(1, 0.42 + u * 0.55 * (0.4 + (d / rad) * 0.6) + (r() - 0.5) * 0.36));
      const rimK = Math.max(0, -u) * (d / rad) ** 2;
      const x = bx + dx;
      const y = by + dy;
      dabs.push({ x, y, t, a: o.angle ? o.angle(x, y, r) : r() * Math.PI * 2, s: size * (0.7 + r() * 0.6), rimK });
    }
  }
  dabs.sort((a, b) => a.t - b.t);
  const shape = o.shape ?? 'leaf';
  const rimCol = o.rim ? air(o.rim) : null;
  const rimA = o.rimA ?? 0.5;
  ctx.save();
  ctx.lineCap = 'round';
  for (const d of dabs) {
    const col = d.t < 0.5 ? mix(dark, mid, d.t * 2) : mix(mid, lit, (d.t - 0.5) * 2);
    const c = rimCol && d.rimK > 0.2 ? mix(col, rimCol, Math.min(1, (d.rimK - 0.2) * rimA * 1.6)) : col;
    if (shape === 'needle' || shape === 'blade') {
      ctx.strokeStyle = c;
      ctx.lineWidth = shape === 'needle' ? Math.max(1, d.s * 0.22) : d.s * 0.4;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      const ex = d.x + Math.cos(d.a) * d.s * 1.6;
      const ey = d.y + Math.sin(d.a) * d.s * 1.6;
      ctx.quadraticCurveTo((d.x + ex) / 2 + Math.sin(d.a) * d.s * 0.2, (d.y + ey) / 2 + d.s * 0.15, ex, ey);
      ctx.stroke();
    } else {
      ctx.fillStyle = c;
      ctx.beginPath();
      if (shape === 'round') ctx.ellipse(d.x, d.y, d.s * 0.55, d.s * 0.45, d.a, 0, Math.PI * 2);
      else {
        // a pointed leaf: two arcs meeting at the tip
        const ca = Math.cos(d.a);
        const sa = Math.sin(d.a);
        const L = d.s;
        const Wd = d.s * 0.42;
        ctx.moveTo(d.x - ca * L * 0.5, d.y - sa * L * 0.5);
        ctx.quadraticCurveTo(d.x - sa * Wd, d.y + ca * Wd, d.x + ca * L * 0.5, d.y + sa * L * 0.5);
        ctx.quadraticCurveTo(d.x + sa * Wd, d.y - ca * Wd, d.x - ca * L * 0.5, d.y - sa * L * 0.5);
      }
      ctx.fill();
    }
  }
  ctx.restore();
}

// ——— trees ———

export interface ConiferOpts {
  dark: string;
  mid: string;
  lit: string;
  rim?: string;
  rimA?: number;
  /** Tiers of boughs (default from the height). */
  tiers?: number;
  depth?: number;
  air?: Air;
  toLight?: [number, number];
  /** Snow lying on the boughs. */
  snow?: number;
  /** Needle size (default h/60). */
  size?: number;
}

/** A spruce/fir painted as tiers of drooping boughs of needles (no polygon outline): its top at (x, y - h). */
export function conifer(ctx: Ctx, r: R, x: number, y: number, h: number, w: number, o: ConiferOpts): void {
  const tiers = o.tiers ?? Math.max(5, Math.round(h / 34));
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < tiers; i++) {
    const t = (i + 0.5) / tiers;
    const ty = y - h + t * h * 0.94;
    const half = (w / 2) * (0.12 + t * 0.88);
    const rad = Math.max(4, (h / tiers) * 0.62);
    // a bough's mass: out to each side, drooping at the tips, and a fill in the middle
    const n = Math.max(1, Math.round(half / (rad * 0.8)));
    for (let k = -n; k <= n; k++) {
      const u = k / n;
      blobs.push([x + u * half * 0.92 + (r() - 0.5) * rad * 0.3, ty + Math.abs(u) ** 1.6 * rad * 0.9 + (r() - 0.5) * rad * 0.2, rad * (1 - Math.abs(u) * 0.3)]);
    }
  }
  // the trunk, in the shade under the lowest boughs
  ctx.fillStyle = airMix('#2a1a12', o.depth ?? 0, o.air ?? { color: '#000', far: 0 });
  ctx.fillRect(x - w * 0.035, y - h * 0.12, w * 0.07, h * 0.14);
  const size = o.size ?? Math.max(2.5, h / 60);
  leafMass(ctx, r, blobs, {
    dark: o.dark, mid: o.mid, lit: o.lit, rim: o.rim, rimA: o.rimA, size, density: 1.1, shape: 'needle', depth: o.depth, air: o.air, toLight: o.toLight,
    // needles sweep out and down from the trunk
    angle: (px, _py, rr) => (px < x ? Math.PI * 0.78 : Math.PI * 0.22) + (rr() - 0.5) * 0.9,
  });
  if (o.snow) {
    // snow sits on the tops of the boughs, brightest on the lit side
    ctx.save();
    for (const [bx, by, rad] of blobs) {
      if (r() > 0.75) continue;
      const g = ctx.createLinearGradient(bx - rad, 0, bx + rad, 0);
      g.addColorStop(0, rgba('#ffffff', 0.9 * o.snow));
      g.addColorStop(1, rgba('#c8d4ec', 0.7 * o.snow));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(bx, by - rad * 0.45, rad * 0.75, rad * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * A fir in silhouette (for far ranks, cheap): tiers of drooping skirts with curved edges and a fringe of needles
 * under each, one colour through the air; the edges turned to the light catch it (no outline anywhere else).
 */
export function firSilhouette(ctx: Ctx, r: R, x: number, base: number, h: number, w: number, col: string, lit?: string, litA = 0.35): void {
  const n = Math.max(4, Math.round(h / 24));
  const top = base - h;
  ctx.fillStyle = col;
  ctx.fillRect(x - w * 0.03, base - h * 0.1, w * 0.06, h * 0.1);
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = Math.min(1, (i + 1.5) / n);
    const ty = top + t0 * h * 0.88;
    const by = top + t1 * h * 0.88;
    const hw = (w / 2) * (0.12 + 0.88 * t1) * (0.9 + r() * 0.2);
    const droop = (by - ty) * 0.25;
    ctx.beginPath();
    ctx.moveTo(x, ty);
    ctx.quadraticCurveTo(x - hw * 0.35, (ty + by) / 2, x - hw, by + droop);
    // the skirt's hem: a few soft scallops back across
    const k = 3 + Math.floor(r() * 2);
    for (let j = 1; j <= k; j++) {
      const u = -1 + (2 * j) / k;
      ctx.quadraticCurveTo(x + hw * (u - 1 / k), by - droop * 0.2, x + hw * u, by + droop * (1 - Math.abs(u)) * 0.4 + (Math.abs(u) > 0.9 ? droop : 0));
    }
    ctx.quadraticCurveTo(x + hw * 0.35, (ty + by) / 2, x, ty);
    ctx.closePath();
    ctx.fill();
    // needles fringing the hem
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, w * 0.012);
    ctx.beginPath();
    for (let j = 0; j < 8; j++) {
      const u = -0.95 + 1.9 * r();
      const nx = x + hw * u;
      const ny = by + droop * (1 - Math.abs(u)) * 0.3 + (Math.abs(u) > 0.8 ? droop * 0.8 : 0);
      ctx.moveTo(nx, ny - 2);
      ctx.lineTo(nx + (u < 0 ? -1 : 1) * 2, ny + 3 + r() * 4);
    }
    ctx.stroke();
    if (lit) {
      // the light on the left of each skirt (the key comes from the top left)
      ctx.strokeStyle = rgba(lit, litA);
      ctx.lineWidth = Math.max(1, w * 0.02);
      ctx.beginPath();
      ctx.moveTo(x - 1, ty + 2);
      ctx.quadraticCurveTo(x - hw * 0.35, (ty + by) / 2, x - hw + 2, by + droop - 1);
      ctx.stroke();
    }
  }
}

/** A far rank of firs along a line, seen through the air: silhouettes standing on a solid band, mist at their feet. */
export function treeLine(ctx: Ctx, r: R, x0: number, x1: number, base: number, hMin: number, hMax: number, col: string, o: { depth: number; air: Air; rim?: string; rimA?: number; mist?: string; mistA?: number; step?: number }): void {
  const c = airMix(col, o.depth, o.air);
  const step = o.step ?? (hMin + hMax) * 0.22;
  const trees: [number, number][] = [];
  for (let x = x0 - step; x < x1 + step; x += step * (0.55 + r() * 0.6)) trees.push([x, hMin + r() * (hMax - hMin)]);
  // the band they stand in (no gaps between the trunks)
  ctx.fillStyle = c;
  ctx.fillRect(x0, base - hMin * 0.3, x1 - x0, hMin * 0.3 + 6);
  for (const [x, h] of trees) firSilhouette(ctx, r, x, base + 4, h, h * 0.46, shade(c, (r() - 0.5) * 0.06), o.rim ? airMix(o.rim, o.depth * 0.7, o.air) : undefined, o.rimA);
  if (o.mist) {
    const mg = ctx.createLinearGradient(0, base - hMin * 0.8, 0, base + 6);
    mg.addColorStop(0, rgba(o.mist, 0));
    mg.addColorStop(1, rgba(o.mist, o.mistA ?? 0.5));
    ctx.fillStyle = mg;
    ctx.fillRect(x0, base - hMin * 0.8, x1 - x0, hMin * 0.8 + 6);
  }
}

// ——— land ———

/** A smooth ridge (hills, a mountain's flank): a height function sampled finely, so the line is never faceted. */
export function ridgePath(x0: number, x1: number, base: number, top: (x: number) => number, step = 6): (c: Ctx) => void {
  return (c) => {
    c.beginPath();
    c.moveTo(x0, base);
    for (let x = x0; x <= x1 + step; x += step) c.lineTo(Math.min(x, x1), top(Math.min(x, x1)));
    c.lineTo(x1, base);
    c.closePath();
  };
}

/** Smooth 1-D noise (a sum of sines with incommensurate rates) in about −1…1. */
export const wave1 = (x: number, seed: number): number =>
  Math.sin(x * 0.0061 + seed) * 0.5 + Math.sin(x * 0.0137 + seed * 1.7) * 0.28 + Math.sin(x * 0.031 + seed * 2.9) * 0.14 + Math.sin(x * 0.071 + seed * 4.1) * 0.08;

// ——— cloth ———

/** A tartan sett: stripes of (colour, width in table units), repeated and mirrored. */
export type Sett = [string, number][];

/**
 * A tartan cloth on the table from its back edge to `front`: the warp stripes running away from us, the weft across,
 * mixing where they cross (each a twill: darker where both are dark), soft creases and the light falling off.
 */
export function tartanCloth(ctx: Ctx, r: R, front: number, ground: string, sett: Sett, o: { off?: number; scale?: number } = {}): void {
  const zf = zAt(front + 4);
  const k = o.scale ?? 1;
  const box = { x: 0, y: TY, w: W, h: front - TY + 4 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.fillStyle = ground;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const full: Sett = [...sett, ...sett.slice(0, -1).reverse()];
  const period = full.reduce((s, [, w]) => s + w * k, 0);
  // warp (running to the vanishing point) then weft (across), each at half strength: crossings get both
  for (const pass of ['warp', 'weft'] as const) {
    ctx.globalAlpha = 0.58;
    for (let base = -3; base < 3; base += period) {
      let p = base + (o.off ?? 0);
      for (const [col, w] of full) {
        const w2 = w * k;
        ctx.fillStyle = col;
        ctx.beginPath();
        if (pass === 'warp') planeQuad(ctx, p, p + w2, ZB, zf);
        else {
          const z0 = ZB - (p + 3);
          const z1 = z0 - w2;
          if (z1 < zf - 0.1 || z0 > ZB + 0.1) {
            p += w2;
            continue;
          }
          planeQuad(ctx, -6, 6, Math.min(ZB, z0), Math.max(zf, z1));
        }
        ctx.fill();
        p += w2;
      }
    }
  }
  ctx.globalAlpha = 1;
  // the twill: fine diagonal ribs over everything
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -600; x < W + 600; x += 5) {
    ctx.moveTo(x, TY);
    ctx.lineTo(x + (front - TY) * 0.7, front + 4);
  }
  ctx.stroke();
  grain(ctx, box, 'canvas', 0.35, 0.8);
  grain(ctx, box, 'knit', 0.12, 1.4);
  lay(ctx, drift('#fff0e0', '#1a0a10', 6, 63, 256, 48), box, 0.14);
  lay(ctx, noiseMask(9, 67, { cover: 0.25, soft: 0.2, col: '#2a1410' }), box, 0.1);
  // creases from the fold
  for (let i = 0; i < 4; i++) {
    const zc = ZB - (i + 0.5 + (r() - 0.5) * 0.4) * ((ZB - zf) / 4);
    const y = yAt(zc);
    for (const [dy, col, al] of [[-3, '#ffffff', 0.06], [3, '#000000', 0.12]] as const) {
      const gr = ctx.createLinearGradient(0, y + dy - 8, 0, y + dy + 8);
      gr.addColorStop(0, rgba(col, 0));
      gr.addColorStop(0.5, rgba(col, al));
      gr.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(0, y + dy - 8, W, 16);
    }
  }
  const g = ctx.createLinearGradient(0, TY, 0, front);
  g.addColorStop(0, 'rgba(20,6,4,0.34)');
  g.addColorStop(0.35, 'rgba(20,6,4,0.08)');
  g.addColorStop(1, 'rgba(20,6,4,0)');
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

/** The cloth's front edge falling in folds, its pattern drawn by `stripe(x)` (a colour per screen column). */
export function foldedFront(ctx: Ctx, front: number, stripe: (x: number, y: number) => string, rows = 1): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, front, W, 1080 - front);
  ctx.clip();
  const fold = (x: number) => Math.sin(x * 0.011 + 1.3) * 10 + Math.sin(x * 0.027 + 0.4) * 5;
  const slope = (x: number) => Math.cos(x * 0.011 + 1.3) * 0.11 + Math.cos(x * 0.027 + 0.4) * 0.135;
  const h = (1080 - front) / rows;
  for (let x = 0; x < W; x += 3) {
    for (let j = 0; j < rows; j++) {
      ctx.fillStyle = stripe(x + fold(x), front + j * h);
      ctx.fillRect(x, front + j * h, 3.5, h + 0.5);
    }
    const s = slope(x);
    ctx.fillStyle = s > 0 ? rgba('#fff4e0', Math.min(0.14, s * 0.8)) : rgba('#140404', Math.min(0.42, -s * 2.2));
    ctx.fillRect(x, front, 3.5, 1080 - front);
  }
  grain(ctx, { x: 0, y: front, w: W, h: 1080 - front }, 'canvas', 0.3, 0.9);
  const g = ctx.createLinearGradient(0, front, 0, front + 50);
  g.addColorStop(0, 'rgba(14,4,2,0.45)');
  g.addColorStop(1, 'rgba(14,4,2,0.14)');
  ctx.fillStyle = g;
  ctx.fillRect(0, front, W, 1080 - front);
  ctx.restore();
  ctx.fillStyle = rgba('#fff6e8', 0.3);
  ctx.fillRect(0, front - 3, W, 3);
  ctx.fillStyle = 'rgba(30,8,6,0.6)';
  ctx.fillRect(0, front, W, 2);
}

/** Screen x of a table-plane X at the front edge (for a front drape that continues the table's pattern). */
export const frontX = (x: number, front: number): number => (x - VX) * (zAt(front) / FOC);

// ——— lights ———

/** Points along a hanging wire between two posts (a catenary-ish sag). */
export function swag(x0: number, y0: number, x1: number, y1: number, sag: number, n: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];
  });
}

/** A hanging wire drawn through a sag. */
export function wire(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, sag: number, col: string, w = 2): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1);
  ctx.stroke();
}

/** A clear glass festoon bulb hanging from a wire at (x, y): its socket, the glass (filament showing), unlit or lit. */
export function bulb(ctx: Ctx, x: number, y: number, s: number, lit: number, glass = '#fff2d0'): void {
  ctx.fillStyle = '#1e1612';
  ctx.fillRect(x - s * 0.32, y - s * 0.2, s * 0.64, s * 0.62);
  const cy = y + s * 0.95;
  const g = ctx.createRadialGradient(x - s * 0.15, cy - s * 0.2, s * 0.05, x, cy, s * 0.62);
  if (lit > 0) {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, mix('#ffe8b0', glass, 0.4));
    g.addColorStop(1, rgba(mix('#ffb860', glass, 0.3), 0.85));
  } else {
    g.addColorStop(0, rgba('#ffffff', 0.85));
    g.addColorStop(0.5, rgba(mix(glass, '#a8a0a0', 0.5), 0.55));
    g.addColorStop(1, rgba('#4a4040', 0.6));
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, cy, s * 0.5, s * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = lit > 0 ? rgba('#fff0c0', 0.9) : rgba('#5a3a20', 0.7);
  ctx.lineWidth = Math.max(0.8, s * 0.08);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, cy + s * 0.1);
  ctx.lineTo(x - s * 0.06, cy - s * 0.15);
  ctx.lineTo(x + s * 0.06, cy + s * 0.05);
  ctx.lineTo(x + s * 0.12, cy - s * 0.15);
  ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', 0.8);
  ctx.beginPath();
  ctx.ellipse(x - s * 0.2, cy - s * 0.22, s * 0.08, s * 0.16, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ——— floors ———

/**
 * Rows of square floor tiles on a floor plane seen from above eye level, between `y0` (far, the skirting) and `y1`
 * (near, under the table's back edge): tiles widen and deepen towards us, each with its own value, grout recessed.
 */
export function tileFloor(ctx: Ctx, r: R, y0: number, y1: number, cols: [string, string], o: { size?: number; vx?: number; grout?: string; checker?: boolean } = {}): void {
  const vx = o.vx ?? VX;
  const hy = y0 - 260;
  const size = o.size ?? 60;
  // depth of a screen row: z = 1/(y - hy); tile edges at equal steps of world depth
  const zAtY = (y: number) => 1 / (y - hy);
  const z0 = zAtY(y0);
  const z1 = zAtY(y1);
  const rows = 6;
  const dz = (z0 - z1) / rows;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, W, y1 - y0);
  ctx.clip();
  for (let j = 0; j < rows + 1; j++) {
    const za = z0 - j * dz;
    const zb = za - dz;
    const ya = hy + 1 / za;
    const yb = hy + 1 / zb;
    const kA = (ya - hy) / 260;
    const kB = (yb - hy) / 260;
    for (let i = -40; i < 40; i++) {
      const X0 = i * size;
      const X1 = X0 + size;
      const on = o.checker === false ? r() < 0.5 : (((i + j) % 2) + 2) % 2 === 0;
      const base = on ? cols[0] : cols[1];
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.08);
      ctx.beginPath();
      ctx.moveTo(vx + X0 * kA, ya);
      ctx.lineTo(vx + X1 * kA, ya);
      ctx.lineTo(vx + X1 * kB, yb);
      ctx.lineTo(vx + X0 * kB, yb);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = rgba(o.grout ?? '#1a1414', 0.6);
    ctx.fillRect(0, ya - 0.5, W, 1.2);
  }
  ctx.strokeStyle = rgba(o.grout ?? '#1a1414', 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -40; i < 40; i++) {
    const X = i * size;
    ctx.moveTo(vx + X * ((y0 - hy) / 260), y0);
    ctx.lineTo(vx + X * ((y1 - hy) / 260), y1);
  }
  ctx.stroke();
  ctx.restore();
}

/** A colour mixed towards another by a 0…1 amount, as a number for Phaser tints. */
export const tintNum = (hex: string): number => parseInt(hex.slice(1), 16);

// ——— painted animation frames (a phase ph in 0…1 of a seamless cycle) ———

const TAU = Math.PI * 2;

/**
 * A fire at phase ph: a bed of tongues, each licking up and falling back on its own beat (heights, leans and widths
 * from sines of the phase, so frame n wraps to frame 0), and a loose tongue breaking off the top and burning out as
 * it rises. (x, y) is the base's middle, w its width, h the tallest tongue.
 */
export function fireFrame(ctx: Ctx, x: number, y: number, w: number, h: number, ph: number, o: { tongues?: number; cols?: [string, string, string]; seed?: number } = {}): void {
  const n = o.tongues ?? 5;
  const cols = o.cols ?? ['#ff4a10', '#ff9a20', '#ffe08a'];
  const s = o.seed ?? 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the glow of the bed
  const g = ctx.createRadialGradient(x, y - h * 0.15, 0, x, y - h * 0.15, w * 0.75);
  g.addColorStop(0, rgba(cols[1], 0.4));
  g.addColorStop(1, rgba(cols[0], 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - w, y - h, w * 2, h * 1.2);
  const tongue = (tx: number, th: number, tw: number, lean: number, curl: number, a: number) => {
    for (const [k, col, al] of [[1, cols[0], 0.7], [0.68, cols[1], 0.8], [0.36, cols[2], 0.9]] as const) {
      const ww = tw * k;
      const hh = th * (0.55 + k * 0.45);
      ctx.beginPath();
      ctx.moveTo(tx - ww / 2, y);
      ctx.bezierCurveTo(tx - ww * 0.7, y - hh * 0.45, tx - ww * 0.15 + lean * hh * 0.4 - curl * ww, y - hh * 0.72, tx + lean * hh, y - hh);
      ctx.bezierCurveTo(tx + ww * 0.2 + lean * hh * 0.4 + curl * ww, y - hh * 0.7, tx + ww * 0.7, y - hh * 0.42, tx + ww / 2, y);
      ctx.quadraticCurveTo(tx, y + ww * 0.25, tx - ww / 2, y);
      ctx.fillStyle = rgba(col, al * a);
      ctx.fill();
    }
  };
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const mid = 1 - Math.abs(u - 0.5) * 1.3;
    const p = TAU * ph;
    const tx = x + (u - 0.5) * w * 0.8 + Math.sin(p * 2 + i * 2.1 + s) * w * 0.03;
    const th = h * mid * (0.72 + Math.sin(p * 3 + i * 1.7 + s) * 0.16 + Math.sin(p * 5 + i * 2.9) * 0.08);
    const tw = (w / n) * 1.7 * (0.9 + Math.sin(p * 2 + i) * 0.12);
    tongue(tx, th, tw, Math.sin(p * 2 + i * 1.3 + s) * 0.12, Math.sin(p * 4 + i) * 0.2, 1);
  }
  // the loose tongue: born at the tip, rising and shrinking over the cycle (two, half a cycle apart)
  for (const off of [0, 0.5]) {
    const q = (ph + off + s * 0.1) % 1;
    const ty = y - h * (0.45 + q * 0.5);
    const tw = (w / n) * (1 - q) ** 1.5 * 0.8;
    if (tw > 1) {
      ctx.save();
      ctx.translate(0, ty - y);
      tongue(x + Math.sin(TAU * (q + off)) * w * 0.12, h * 0.3 * (1 - q * 0.6), tw, 0.1, 0, 1 - q);
      ctx.restore();
    }
  }
  ctx.restore();
}

/**
 * A rising column of smoke or steam at phase ph, in a frame w×h (its source at the bottom middle): lobes that are
 * born small at the source, climb, swell, drift with the wind and thin out; each lobe lit on the light's side and
 * shaded on the other, so the volume billows rather than slides. Periodic in ph.
 */
export function smokeFrame(ctx: Ctx, w: number, h: number, ph: number, o: { lit: string; body: string; shade: string; wind?: number; lobes?: number; a?: number; toLight?: [number, number]; seed?: number }): void {
  const n = o.lobes ?? 9;
  const wind = o.wind ?? 0.35;
  const [lx0, ly0] = o.toLight ?? [-0.6, -0.8];
  const ll = Math.hypot(lx0, ly0) || 1;
  const lx = lx0 / ll;
  const ly = ly0 / ll;
  const s = o.seed ?? 0;
  const lobes: [number, number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const q = (ph + i / n) % 1;
    const y = h - 10 - q * (h - 40);
    const x = w / 2 + q * q * wind * w * 0.7 + Math.sin(TAU * q * 1.5 + i * 2.3 + s) * w * 0.06 * (0.3 + q);
    const rad = w * (0.07 + q * 0.2) * (0.85 + Math.sin(i * 3.1 + s) * 0.15);
    const a = Math.min(1, q * 8) * (1 - q) ** 1.3;
    lobes.push([x, y, rad, a]);
  }
  ctx.save();
  for (const [x, y, rad, a] of lobes) {
    const al = a * (o.a ?? 0.7);
    // body, then the lit side, then the shaded side: soft-edged
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba(o.body, al));
    g.addColorStop(0.6, rgba(o.body, al * 0.7));
    g.addColorStop(1, rgba(o.body, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const gl = ctx.createRadialGradient(x + lx * rad * 0.35, y + ly * rad * 0.35, 0, x + lx * rad * 0.35, y + ly * rad * 0.35, rad * 0.7);
    gl.addColorStop(0, rgba(o.lit, al * 0.8));
    gl.addColorStop(1, rgba(o.lit, 0));
    ctx.fillStyle = gl;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const gs = ctx.createRadialGradient(x - lx * rad * 0.4, y - ly * rad * 0.4, 0, x - lx * rad * 0.4, y - ly * rad * 0.4, rad * 0.7);
    gs.addColorStop(0, rgba(o.shade, al * 0.55));
    gs.addColorStop(1, rgba(o.shade, 0));
    ctx.fillStyle = gs;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.restore();
}

/**
 * A banner or flag hanging from its top edge (x, y, w wide, h long) at phase ph: a travelling wave down and across
 * it, stronger towards the free end; each column shaded by its slope (folds turned to the light lit, the rest in
 * shade), the pattern drawn by `paint` in the cloth's own flat frame and bent with it.
 */
export function clothFrame(ctx: Ctx, x: number, y: number, w: number, h: number, ph: number, paint: (c: Ctx, w: number, h: number) => void, o: { amp?: number; waves?: number; tail?: 'swallow' | 'point' | 'flat'; light?: string; dark?: string } = {}): void {
  const amp = o.amp ?? w * 0.06;
  const waves = o.waves ?? 1.5;
  const [flat, fc] = makeFlat(w, h);
  paint(fc, w, h);
  // the tail cut
  fc.globalCompositeOperation = 'destination-out';
  fc.beginPath();
  if (o.tail === 'swallow') {
    fc.moveTo(0, h);
    fc.lineTo(w / 2, h * 0.84);
    fc.lineTo(w, h);
    fc.lineTo(w, h + 2);
    fc.lineTo(0, h + 2);
  } else if (o.tail === 'point') {
    fc.moveTo(0, h * 0.86);
    fc.lineTo(w / 2, h);
    fc.lineTo(w, h * 0.86);
    fc.lineTo(w, h + 2);
    fc.lineTo(0, h + 2);
  }
  fc.fill();
  const off = (yy: number, xx: number) => Math.sin(TAU * (ph - (yy / h) * 0.6) + (xx / w) * waves * 2) * amp * (0.15 + (yy / h) * 0.85);
  const slope = (yy: number, xx: number) => Math.cos(TAU * (ph - (yy / h) * 0.6) + (xx / w) * waves * 2) * (0.15 + (yy / h) * 0.85);
  // light and shade by slope, laid on the flat cloth first (the folds across it), so it bends with it
  fc.globalCompositeOperation = 'source-atop';
  for (let j = 0; j < h; j += 3) {
    for (let i = 0; i < w; i += 4) {
      const sl = slope(j, i);
      fc.fillStyle = sl > 0 ? rgba(o.light ?? '#fff0d8', sl * 0.28) : rgba(o.dark ?? '#1a0608', -sl * 0.5);
      fc.fillRect(i, j, 4.5, 3.5);
    }
  }
  fc.globalCompositeOperation = 'source-over';
  // drawn in thin horizontal strips, each shifted by the wave and narrowed where it turns away
  for (let j = 0; j < h; j += 2) {
    const dx = off(j, w / 2);
    const sq = 1 - Math.abs(slope(j, w / 2)) * 0.06;
    ctx.drawImage(flat, 0, j, w, 2, x + dx + (w * (1 - sq)) / 2, y + j, w * sq, 2.4);
  }
}

function makeFlat(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h) + 2;
  return [c, c.getContext('2d')!];
}
