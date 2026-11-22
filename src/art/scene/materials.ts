// Scene-scale materials for the location kit: big surfaces (walls, tables, floors, water, sand, rock) lit by the one
// light. Small props use the feet's materials through solid() (kit.ts); these paint the surfaces they stand on.

import { FOC, TY, VX, ZB, cloud, mottle, xAt, yAt, zAt } from '../backdrops';
import { LIGHT, texture, vnoise } from '../style/kit';
import { type Ctx, makeCanvas, mix, rgba, shade } from '../util';
import { type Box, type R, W, crevice, jitter } from './kit';

// ——— noise ———

const noiseCache = new Map<string, HTMLCanvasElement>();

/** A smooth fractal-noise field (grey, 128 = no change) sized w×h at low resolution, cached: drawn stretched it is
 * a soft painterly variation, cheap to make. `cells` sets the size of its blotches. */
export function field(w: number, h: number, cells: number, seed: number, oct = 4, gain = 0.55): HTMLCanvasElement {
  const key = `${w}x${h}:${cells}:${seed}:${oct}:${gain}`;
  const hit = noiseCache.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let s = 0;
      let a = 1;
      let f = cells / Math.max(w, h);
      let n = 0;
      for (let o = 0; o < oct; o++) {
        s += vnoise(i * f, j * f, seed + o * 31) * a;
        n += a;
        a *= gain;
        f *= 2;
      }
      const v = Math.max(0, Math.min(255, 128 + (s / n - 0.5) * 2.2 * 127));
      const k = (j * w + i) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = v;
      img.data[k + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  noiseCache.set(key, c);
  return c;
}

/** Lay a noise field over a box (soft value variation, like a painter's broken colour). */
export function broken(ctx: Ctx, box: Box, a: number, cells = 8, seed = 1, op: GlobalCompositeOperation = 'soft-light'): void {
  const f = field(160, 90, cells, seed);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = op;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(f, box.x, box.y, box.w, box.h);
  ctx.restore();
}

/** The feet kit's fine material texture laid over a box at scene scale. */
export function grain(ctx: Ctx, box: Box, kind: Parameters<typeof texture>[1], a: number, scale = 1, op: GlobalCompositeOperation = 'overlay'): void {
  texture(ctx, kind, box, a, scale, op);
}

// ——— plaster ———

export interface PlasterOpts {
  /** Lime-wash brush strokes (0…1). */
  wash?: number;
  /** Hairline cracks. */
  cracks?: number;
  seed?: number;
}

/** Lime-washed plaster: a broken, chalky colour with soft brush strokes, fine grain and a few hairline cracks. */
export function plaster(ctx: Ctx, r: R, box: Box, base: string, o: PlasterOpts = {}): void {
  ctx.fillStyle = base;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  broken(ctx, box, 0.55, 6, o.seed ?? 3);
  broken(ctx, box, 0.35, 22, (o.seed ?? 3) + 7, 'overlay');
  // brush strokes: wide, faint, curved, lighter and darker than the base
  const wash = o.wash ?? 0.6;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.lineCap = 'round';
  const n = Math.round((box.w * box.h) / 9000 * wash);
  for (let i = 0; i < n; i++) {
    const x = box.x + r() * box.w;
    const y = box.y + r() * box.h;
    const len = 60 + r() * 160;
    const ang = (r() - 0.5) * 1.2;
    ctx.strokeStyle = rgba(r() < 0.55 ? shade(base, 0.12) : shade(base, -0.1), 0.06 + r() * 0.08);
    ctx.lineWidth = 14 + r() * 30;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5 + (r() - 0.5) * 30, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  grain(ctx, box, 'grain', 0.2, 1.4);
  grain(ctx, box, 'speckle', 0.12, 1);
  // hairline cracks: a dark line with a lit lip below it
  const cracks = Math.round(o.cracks ?? 3);
  for (let i = 0; i < cracks; i++) {
    let x = box.x + r() * box.w;
    let y = box.y + r() * box.h * 0.8;
    const pts: [number, number][] = [[x, y]];
    for (let k = 0; k < 7; k++) {
      x += (r() - 0.4) * 26;
      y += 8 + r() * 16;
      pts.push([x, y]);
    }
    for (const [dx, dy, col, w] of [[1, 1.2, rgba(LIGHT.key, 0.25), 1.4], [0, 0, rgba(shade(base, -0.55), 0.55), 1.2]] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      pts.forEach(([px, py], j) => (j ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy)));
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ——— brick ———

/** Courses of brick: each brick its own colour, a lit top-left bevel, a shaded bottom-right edge, recessed mortar. */
export function bricks(ctx: Ctx, r: R, box: Box, pal: string[], mortar: string, bw = 74, bh = 30): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.fillStyle = mortar;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  grain(ctx, box, 'speckle', 0.3, 1);
  const g = 5;
  for (let row = 0, y = box.y - (r() * bh) / 2; y < box.y + box.h; row++, y += bh) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = box.x - bw + off - r() * 8; x < box.x + box.w; x += bw) {
      const w = bw - g + (r() - 0.5) * 4;
      const h = bh - g + (r() - 0.5) * 2;
      const c = jitter(pal[Math.floor(r() * pal.length)], r, 0.06);
      ctx.beginPath();
      ctx.roundRect(x + g / 2, y + g / 2, w, h, 3);
      const gr = ctx.createLinearGradient(x, y, x + w * 0.35, y + h * 1.6);
      gr.addColorStop(0, shade(c, 0.1));
      gr.addColorStop(1, shade(c, -0.12));
      ctx.fillStyle = gr;
      ctx.fill();
      // lit top edge, dark bottom edge (the mortar's shadow)
      ctx.fillStyle = rgba(LIGHT.key, 0.16);
      ctx.fillRect(x + g / 2 + 2, y + g / 2, w - 4, 2);
      ctx.fillStyle = 'rgba(30,8,4,0.32)';
      ctx.fillRect(x + g / 2 + 2, y + g / 2 + h - 2.5, w - 3, 2.5);
      // a chip or two
      if (r() < 0.25) {
        ctx.fillStyle = rgba(shade(c, -0.3), 0.5);
        ctx.beginPath();
        ctx.arc(x + g / 2 + r() * w, y + g / 2 + r() * h, 2 + r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  grain(ctx, box, 'cast', 0.28, 1.2);
  broken(ctx, box, 0.4, 10, 11);
  ctx.restore();
}

/** An irregular patch where plaster has fallen away to show brick: the plaster's broken edge casts a little shadow on
 * the brick (down-right) and catches the light along its lip. */
export function brickPatch(ctx: Ctx, r: R, cx: number, cy: number, rx: number, ry: number, pal: string[], mortar: string, plasterCol: string, bw = 60, bh = 24): void {
  const pts: [number, number][] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.72 + r() * 0.38;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const path = (c: Ctx) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  };
  ctx.save();
  path(ctx);
  ctx.clip();
  bricks(ctx, r, { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 }, pal, mortar, bw, bh);
  ctx.restore();
  // the plaster edge: shadow inside (down-right of the top-left rim), a light lip outside
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.shadowColor = 'rgba(20,6,2,0.55)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  path(ctx);
  ctx.rect(cx - rx * 3, cy - ry * 3, rx * 6, ry * 6);
  ctx.fillStyle = '#000';
  ctx.fill('evenodd');
  ctx.restore();
  // the broken plaster edge: a soft lit lip, a faint dark break line, crumbs of plaster round it
  ctx.save();
  path(ctx);
  ctx.filter = 'blur(1.5px)';
  ctx.strokeStyle = rgba(shade(plasterCol, 0.15), 0.6);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.filter = 'none';
  ctx.strokeStyle = rgba(shade(plasterCol, -0.45), 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();
  for (const [px, py] of pts) {
    if (r() < 0.5) continue;
    ctx.fillStyle = rgba(shade(plasterCol, (r() - 0.5) * 0.2), 0.8);
    ctx.beginPath();
    ctx.ellipse(px + (r() - 0.5) * 10, py + (r() - 0.5) * 8, 3 + r() * 5, 2 + r() * 3, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ——— wood ———

/** Wood grain inside the current clip: long soft streaks along x (or y) with a few knots. */
export function woodGrain(ctx: Ctx, r: R, box: Box, base: string, vertical = false, a = 1): void {
  ctx.save();
  ctx.globalAlpha = a;
  const len = vertical ? box.h : box.w;
  const across = vertical ? box.w : box.h;
  const n = Math.max(3, Math.round(across / 5));
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = (i + r()) / n;
    const dark = r() < 0.5;
    ctx.strokeStyle = rgba(dark ? shade(base, -0.35) : shade(base, 0.18), 0.1 + r() * 0.14);
    ctx.lineWidth = 0.8 + r() * 1.8;
    ctx.beginPath();
    const wob = 2 + r() * 5;
    const ph = r() * 6;
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const u = s * len;
      const v = t * across + Math.sin(s * 9 + ph) * wob * 0.4 + Math.sin(s * 2.3 + ph) * wob;
      const [x, y] = vertical ? [box.x + v, box.y + u] : [box.x + u, box.y + v];
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // knots
  for (let k = 0; k < Math.round((box.w * box.h) / 60000); k++) {
    const x = box.x + r() * box.w;
    const y = box.y + r() * box.h;
    for (let ring = 3; ring > 0; ring--) {
      ctx.strokeStyle = rgba(shade(base, -0.4), 0.18);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, ring * (vertical ? 2.5 : 5), ring * (vertical ? 5 : 2.5), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
  grain(ctx, box, 'wood', 0.22, 1.6);
}

/** A wooden board or rail lit as a cylinder-ish prism across y (top lit, bottom shaded), with grain. */
export function board(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, base: string, vertical = false): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(base, 0.16));
  g.addColorStop(0.35, base);
  g.addColorStop(1, mix(shade(base, -0.3), '#2a1008', 0.2));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  woodGrain(ctx, r, { x, y, w, h }, base, vertical);
  ctx.restore();
}

// ——— the table plane ———

/** Perspective quad on the table plane between X0..X1 and depths z0..z1. */
export function planeQuad(ctx: Ctx, X0: number, X1: number, z0: number, z1: number): void {
  ctx.moveTo(xAt(X0, z0), yAt(z0));
  ctx.lineTo(xAt(X1, z0), yAt(z0));
  ctx.lineTo(xAt(X1, z1), yAt(z1));
  ctx.lineTo(xAt(X0, z1), yAt(z1));
  ctx.closePath();
}

export interface ClothOpts {
  /** Checker cell size (table units). */
  cell?: number;
  /** Lateral offset of the pattern. */
  off?: number;
}

/**
 * A checked tablecloth on the table, from its back edge (TY) to its front edge `front`: woven cotton with soft
 * creases from being folded, the light falling off towards the back and the corners.
 */
export function checkerCloth(ctx: Ctx, r: R, front: number, a: string, b: string, o: ClothOpts = {}): void {
  const cell = o.cell ?? 0.2;
  const off = o.off ?? 0.1;
  const zf = zAt(front + 4);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, front - TY + 4);
  ctx.clip();
  ctx.fillStyle = a;
  ctx.fillRect(0, TY, W, front - TY + 4);
  ctx.fillStyle = b;
  ctx.beginPath();
  const n = Math.ceil(2.6 / cell);
  let j = 0;
  for (let z0 = ZB; z0 > zf; z0 -= cell, j++) {
    const z1 = Math.max(z0 - cell, 0.5);
    for (let i = -n; i < n; i++) if ((((i + j) % 2) + 2) % 2 === 0) planeQuad(ctx, i * cell + off, (i + 1) * cell + off, z0, z1);
  }
  ctx.fill();
  // the weave where the two colours cross: thin lines of b through a (gingham)
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = b;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -n * 4; i < n * 4; i++) {
    const X = (i * cell) / 4 + off;
    ctx.moveTo(xAt(X, ZB), TY);
    ctx.lineTo(xAt(X, zf), front + 4);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  grain(ctx, { x: 0, y: TY, w: W, h: front - TY + 4 }, 'canvas', 0.3, 0.9);
  // creases from the fold: soft long ridges across the cloth (a lit side and a shaded side)
  for (let k = 0; k < 5; k++) {
    const zc = ZB - (k + 0.5 + (r() - 0.5) * 0.4) * ((ZB - zf) / 5);
    const y = yAt(zc);
    const tilt = (r() - 0.5) * 18;
    for (const [dy, col, al] of [[-3, '#ffffff', 0.07], [3, '#2a0a06', 0.1]] as const) {
      const gr = ctx.createLinearGradient(0, y + dy - 8, 0, y + dy + 8);
      gr.addColorStop(0, rgba(col, 0));
      gr.addColorStop(0.5, rgba(col, al));
      gr.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gr;
      ctx.save();
      ctx.translate(VX, y);
      ctx.rotate((tilt * Math.PI) / 1800);
      ctx.fillRect(-W, dy - 8, W * 2, 16);
      ctx.restore();
    }
  }
  // the back of the table is further from the lamps: darker; the near middle brightest
  const g = ctx.createLinearGradient(0, TY, 0, front);
  g.addColorStop(0, 'rgba(30,8,4,0.32)');
  g.addColorStop(0.35, 'rgba(30,8,4,0.08)');
  g.addColorStop(1, 'rgba(30,8,4,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, TY, W, front - TY + 4);
  ctx.restore();
}

/** The table's front edge: a cloth drape falling in soft vertical folds (the checks bend with them). */
export function clothDrape(ctx: Ctx, front: number, a: string, b: string, cell = 0.2, off = 0.1): void {
  const zf = zAt(front);
  const px = (FOC * cell) / zf;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, front, W, 1080 - front);
  ctx.clip();
  // folds: x is displaced by a sum of sines; the slope sets the light
  const fold = (x: number) => Math.sin(x * 0.011 + 1.3) * 10 + Math.sin(x * 0.027 + 0.4) * 5;
  const slope = (x: number) => Math.cos(x * 0.011 + 1.3) * 0.11 + Math.cos(x * 0.027 + 0.4) * 0.135;
  const step = 4;
  for (let x = 0; x < W; x += step) {
    const X = (x - VX) * (zf / FOC) - off;
    const col = Math.floor((X + fold(x) * 0.002) / cell);
    for (let row = 0; row < 6; row++) {
      const on = (((col + row) % 2) + 2) % 2 === 0;
      ctx.fillStyle = on ? b : a;
      ctx.fillRect(x, front + row * px, step + 0.5, px + 0.5);
    }
    const s = slope(x);
    ctx.fillStyle = s > 0 ? rgba('#fff4e0', Math.min(0.16, s * 0.9)) : rgba('#2a0a06', Math.min(0.4, -s * 2.2));
    ctx.fillRect(x, front, step + 0.5, 1080 - front);
  }
  grain(ctx, { x: 0, y: front, w: W, h: 1080 - front }, 'canvas', 0.3, 0.9);
  // under the edge: deep shade
  const g = ctx.createLinearGradient(0, front, 0, front + 50);
  g.addColorStop(0, 'rgba(20,6,2,0.42)');
  g.addColorStop(1, 'rgba(20,6,2,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, front, W, 1080 - front);
  ctx.restore();
  // the edge itself: the cloth turning over (a lit roll)
  ctx.fillStyle = rgba('#fff6e8', 0.35);
  ctx.fillRect(0, front - 3, W, 3);
  ctx.fillStyle = 'rgba(40,12,6,0.6)';
  ctx.fillRect(0, front, W, 2);
}

/** Planks running away from us on the table plane (a bar top, a deck). */
export function planksPlane(ctx: Ctx, r: R, front: number, base: string, period = 0.32, gap = 0.012): void {
  const zf = zAt(front + 4);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, front - TY + 4);
  ctx.clip();
  ctx.fillStyle = shade(base, -0.5);
  ctx.fillRect(0, TY, W, front - TY + 4);
  const n = Math.ceil(3 / period);
  for (let i = -n; i < n; i++) {
    const X0 = i * period + gap;
    const X1 = (i + 1) * period - gap;
    const c = jitter(base, r, 0.07);
    ctx.beginPath();
    planeQuad(ctx, X0, X1, ZB, zf);
    const g = ctx.createLinearGradient(0, TY, 0, front);
    g.addColorStop(0, shade(c, -0.18));
    g.addColorStop(1, shade(c, 0.06));
    ctx.fillStyle = g;
    ctx.fill();
    // grain lines converging to the vanishing point
    ctx.save();
    ctx.clip();
    for (let k = 0; k < 7; k++) {
      const X = X0 + ((X1 - X0) * (k + r())) / 7;
      ctx.strokeStyle = rgba(r() < 0.5 ? shade(c, -0.35) : shade(c, 0.2), 0.16 + r() * 0.12);
      ctx.lineWidth = 0.8 + r();
      ctx.beginPath();
      ctx.moveTo(xAt(X, ZB), TY);
      ctx.lineTo(xAt(X + (r() - 0.5) * 0.01, zf), front + 4);
      ctx.stroke();
    }
    ctx.restore();
    // the lit bevel on the plank's left edge
    ctx.strokeStyle = rgba(LIGHT.key, 0.18);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xAt(X0, ZB), TY);
    ctx.lineTo(xAt(X0, zf), front + 4);
    ctx.stroke();
  }
  grain(ctx, { x: 0, y: TY, w: W, h: front - TY + 4 }, 'grain', 0.16, 1.2);
  mottle(ctx, 0, TY, W, front - TY, 0.1, 1.4);
  ctx.restore();
}

/** The back edge of the table against what's behind it: occlusion above and below the seam, a dark lip line. */
export function tableSeam(ctx: Ctx, a = 0.5, lip = '#2a1810', above = true): void {
  if (above) crevice(ctx, 0, W, TY, -60, a * 0.6);
  crevice(ctx, 0, W, TY, 44, a);
  ctx.fillStyle = rgba(lip, 0.8);
  ctx.fillRect(0, TY - 1.5, W, 3);
}

/** Soft vignette on the table (the corners further from every light). */
export function tableFalloff(ctx: Ctx, front: number, a = 0.35, col = '#1a0804'): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, 1080 - TY);
  ctx.clip();
  ctx.translate(VX, 900);
  ctx.scale(1, 0.32);
  const g = ctx.createRadialGradient(0, 0, 200, 0, 0, 1250);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(1, rgba(col, a));
  ctx.fillStyle = g;
  ctx.fillRect(-W, -2000, W * 2, 4000);
  ctx.restore();
  void front;
}

// ——— water ———

export interface WaterOpts {
  /** Colour at the horizon and at the near edge. */
  far: string;
  near: string;
  /** Ripple colour and how many. */
  ripple?: string;
  ripples?: number;
  /** Where the sun or a light sits: its glitter path runs down the water under it. */
  glitterX?: number;
  glitter?: string;
  glitterA?: number;
}

/** A body of water from y0 (horizon side) to y1 (near side): the colour deepens with distance, ripples shrink and
 * crowd towards the horizon, and a light's glitter path runs down under it. */
export function water(ctx: Ctx, r: R, x0: number, x1: number, y0: number, y1: number, o: WaterOpts): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, o.far);
  g.addColorStop(1, o.near);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  broken(ctx, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, 0.3, 14, 21);
  const n = o.ripples ?? 220;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = r() ** 1.6; // more near the horizon
    const y = y0 + t * (y1 - y0);
    const sz = 0.25 + t * 1.3;
    const x = x0 + r() * (x1 - x0);
    const len = (10 + r() * 26) * sz;
    ctx.strokeStyle = rgba(o.ripple ?? '#ffffff', (0.12 + r() * 0.2) * (0.6 + t * 0.5));
    ctx.lineWidth = Math.max(0.8, 1.6 * sz);
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.quadraticCurveTo(x, y - 2.5 * sz, x + len / 2, y);
    ctx.stroke();
    // the trough below each crest
    ctx.strokeStyle = rgba(shade(o.near, -0.4), 0.12);
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y + 2 * sz);
    ctx.quadraticCurveTo(x, y + 4 * sz, x + len / 2, y + 2 * sz);
    ctx.stroke();
  }
  if (o.glitterX !== undefined) {
    const col = o.glitter ?? '#fff6d0';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 160; i++) {
      const t = r() ** 0.8;
      const y = y0 + 2 + t * (y1 - y0 - 4);
      const spread = 20 + t * 220;
      const x = o.glitterX + (r() + r() + r() - 1.5) * spread;
      const len = (6 + r() * 22) * (0.4 + t);
      ctx.fillStyle = rgba(col, (o.glitterA ?? 0.6) * (0.3 + r() * 0.7) * (1 - t * 0.5));
      ctx.fillRect(x - len / 2, y, len, Math.max(1, 2 * (0.4 + t)));
    }
    ctx.restore();
  }
}

// ——— sand ———

/** Sand: warm grain, soft dune shading, footprints and drift lines. */
export function sand(ctx: Ctx, r: R, box: Box, base: string, o: { ripples?: number; seed?: number } = {}): void {
  ctx.fillStyle = base;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  broken(ctx, box, 0.55, 5, o.seed ?? 41);
  // wind ripples: shallow arcs, lit on the left
  for (let i = 0; i < (o.ripples ?? 60); i++) {
    const x = box.x + r() * box.w;
    const y = box.y + r() * box.h;
    const t = (y - box.y) / box.h;
    const len = (30 + r() * 70) * (0.5 + t);
    ctx.strokeStyle = rgba(shade(base, -0.25), 0.16);
    ctx.lineWidth = 1.2 + t * 1.5;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.quadraticCurveTo(x, y - 3 - t * 3, x + len / 2, y + 1);
    ctx.stroke();
    ctx.strokeStyle = rgba(LIGHT.key, 0.2);
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y - 2);
    ctx.quadraticCurveTo(x, y - 5 - t * 3, x + len / 2, y - 1);
    ctx.stroke();
  }
  grain(ctx, box, 'speckle', 0.35, 1);
  grain(ctx, box, 'grain', 0.25, 1.4);
}

// ——— shared tiny helper ———

/** A small cloud of noise from the backdrop kit for soft blotches. */
export const cloudTile = cloud;
export const fieldNoise = (x: number, y: number, seed = 0) => vnoise(x, y, seed);
export { mottle };
