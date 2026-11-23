// Scene-scale materials for the location kit: big surfaces (walls, tables, floors, water, sand, rock) lit by the one
// light. Small props use the feet's materials through solid() (kit.ts); these paint the surfaces they stand on.

import { FOC, TY, VX, ZB, cloud, mottle, xAt, yAt, zAt } from '../backdrops';
import { LIGHT, texture, vnoise } from '../style/kit';
import { type Ctx, makeCanvas, mix, rgba, shade } from '../util';
import { type Box, type R, W, crevice, jitter } from './kit';
import { crack, drift, grime, lay, noiseMask, softly, surface } from './paint';

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
  /** Hairline cracks at random (0 by default: place cracks where stress gathers with paint.crack instead). */
  cracks?: number;
  /** Patina: how much the plaster has aged (0…1, default 0.5): colour drift, damp blooms, thin spots in the wash. */
  patina?: number;
  /** Grime gathered along its edges (see paint.grime), px per edge. */
  grime?: { top?: number; bottom?: number; left?: number; right?: number; a?: number };
  /** The colour drift's light and dark (default: warm lights, warm-earth darks). */
  warm?: string;
  cool?: string;
  seed?: number;
}

/**
 * Lime-washed plaster: chalky colour drifting warm and cool, the wash laid on in soft brush strokes, thin spots
 * where the coat under it shows, damp blooms, fine grain; grime gathered along the edges. (Random cracks are off by
 * default: crack() them where they belong, at the corners of openings and under beams.)
 */
export function plaster(ctx: Ctx, r: R, box: Box, base: string, o: PlasterOpts = {}): void {
  const seed = o.seed ?? 3;
  const patina = o.patina ?? 0.5;
  surface(ctx, r, box, base, { vary: 0.45 + patina * 0.35, cells: 5, mottle: 0.5, strokes: 0, grain: 0, seed, warm: o.warm ?? shade(base, 0.22), cool: o.cool ?? mix(shade(base, -0.22), '#9a4a30', 0.3) });
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // the wash: wide, faint, curved strokes, lighter and darker than the base
  const wash = o.wash ?? 0.6;
  ctx.lineCap = 'round';
  const n = Math.round((box.w * box.h) / 9000 * wash);
  for (let i = 0; i < n; i++) {
    const x = box.x + r() * box.w;
    const y = box.y + r() * box.h;
    const len = 60 + r() * 160;
    const ang = (r() - 0.5) * 1.2;
    ctx.strokeStyle = rgba(r() < 0.55 ? shade(base, 0.12) : shade(base, -0.1), 0.05 + r() * 0.07);
    ctx.lineWidth = 14 + r() * 30;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5 + (r() - 0.5) * 30, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  // thin spots: the warmer, rougher coat under the wash showing through in soft islands
  lay(ctx, noiseMask(7, seed + 11, { cover: 0.18 * patina + 0.04, soft: 0.1, col: mix(shade(base, -0.12), '#b0603a', 0.25) }), box, 0.55);
  // damp blooms: soft darker clouds with a faint tide-line edge
  lay(ctx, noiseMask(4, seed + 17, { cover: 0.22 * patina, soft: 0.16, col: shade(base, -0.22) }), box, 0.4);
  lay(ctx, noiseMask(4, seed + 17, { cover: 0.22 * patina, soft: 0.02, kind: 'web', col: shade(base, -0.3) }), box, 0.12 * patina);
  grain(ctx, box, 'grain', 0.1, 1.4);
  grain(ctx, box, 'speckle', 0.06, 1);
  grain(ctx, box, 'stone', 0.08, 2.6);
  // (legacy) cracks at random
  for (let i = 0; i < Math.round(o.cracks ?? 0); i++) crack(ctx, r, box.x + r() * box.w, box.y + r() * box.h * 0.6, Math.PI / 2 + (r() - 0.5), 60 + r() * 80, { col: shade(base, -0.6) });
  ctx.restore();
  if (o.grime) grime(ctx, box, { ...o.grime, seed: seed + 23, col: mix(shade(base, -0.7), '#2a1206', 0.5) });
}

// ——— brick ———

/** Courses of brick: each brick its own colour, a lit top-left bevel, a shaded bottom-right edge, recessed mortar. */
export function bricks(ctx: Ctx, r: R, box: Box, pal: string[], mortar: string, bw = 74, bh = 30): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // the mortar, recessed: its top in the shadow of the brick course above, its bottom catching the light
  ctx.fillStyle = mortar;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  grain(ctx, box, 'speckle', 0.35, 1);
  const g = Math.max(3, Math.round(bh * 0.17));
  const faces: [number, number, number, number, string][] = [];
  for (let row = 0, y = box.y - (r() * bh) / 2; y < box.y + box.h; row++, y += bh) {
    const off = row % 2 ? bw / 2 : 0;
    // the shadow under this course, in the joint below it
    ctx.fillStyle = 'rgba(30,10,4,0.42)';
    ctx.fillRect(box.x, y + bh - g / 2, box.w, g * 0.55);
    for (let x = box.x - bw + off - r() * 8; x < box.x + box.w; x += bw) {
      const w = bw - g + (r() - 0.5) * 4;
      const h = bh - g + (r() - 0.5) * 2;
      // a few bricks fired darker (clinkers), a few paler (salmon)
      const roll = r();
      const pick = pal[Math.floor(r() * pal.length)];
      const c = jitter(roll < 0.08 ? mix(pick, '#3a1a14', 0.45) : roll > 0.93 ? mix(pick, '#e8a878', 0.3) : pick, r, 0.07);
      faces.push([x + g / 2, y + g / 2, w, h, c]);
    }
  }
  for (const [x, y, w, h, c] of faces) {
    // each brick a slightly cushioned block: its face lit across from the top left, its arrises softened
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(4, h * 0.18));
    const gr = ctx.createLinearGradient(x, y, x + w * 0.3, y + h * 1.4);
    gr.addColorStop(0, shade(c, 0.12));
    gr.addColorStop(0.5, c);
    gr.addColorStop(1, mix(shade(c, -0.2), '#2a0e10', 0.15));
    ctx.fillStyle = gr;
    ctx.fill();
    // lit top and left arrises, the bottom and right ones turned away
    ctx.fillStyle = rgba(LIGHT.key, 0.2);
    ctx.fillRect(x + 2, y, w - 4, 1.6);
    ctx.fillRect(x, y + 2, 1.4, h - 4);
    ctx.fillStyle = 'rgba(30,8,4,0.38)';
    ctx.fillRect(x + 2, y + h - 2, w - 3, 2);
    ctx.fillRect(x + w - 1.6, y + 2, 1.6, h - 3);
    // spalls and pits
    if (r() < 0.3) {
      const px = x + 4 + r() * (w - 8);
      const py = y + 3 + r() * (h - 6);
      const s = 1.5 + r() * 3;
      ctx.fillStyle = rgba(shade(c, -0.35), 0.55);
      ctx.beginPath();
      ctx.ellipse(px, py, s * 1.4, s, r(), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(LIGHT.key, 0.18);
      ctx.beginPath();
      ctx.ellipse(px + s * 0.5, py + s * 0.6, s * 0.8, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  grain(ctx, box, 'cast', 0.28, 1.2);
  lay(ctx, drift(shade(pal[0], 0.2), '#3a2030', 6, 11), box, 0.3);
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

/** A light reflected in a varnished or polished surface. */
export interface Reflect {
  /** Where the light is across the surface (screen x) and how strong (0…1). */
  x: number;
  a?: number;
  col?: string;
  /** Width of the reflection (px, default 60). */
  w?: number;
}

/**
 * Varnish over wood (or any polished surface) in a box: a soft sheen from the ceiling or sky at the top, and each
 * light's reflection as a soft streak running along the surface's grain (vertical on upright panels), broken up by
 * the grain. Paint inside the board's clip.
 */
export function varnish(ctx: Ctx, box: Box, lights: Reflect[], o: { sheen?: number; vertical?: boolean; seed?: number } = {}): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  const sheen = o.sheen ?? 0.12;
  if (sheen > 0) {
    const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
    g.addColorStop(0, rgba('#fff4e0', sheen));
    g.addColorStop(0.4, rgba('#fff4e0', sheen * 0.25));
    g.addColorStop(1, rgba('#fff4e0', 0));
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  for (const l of lights) {
    const w = l.w ?? 60;
    const a = l.a ?? 0.35;
    const col = l.col ?? '#ffe6b8';
    if (l.x < box.x - w * 2 || l.x > box.x + box.w + w * 2) continue;
    ctx.save();
    if (o.vertical === false) {
      // (a horizontal surface: the streak lies along it, w wide, squashed to the board's height)
      ctx.translate(l.x, box.y + box.h / 2);
      ctx.scale(1, (box.h * 0.45) / w);
    } else {
      ctx.translate(l.x, box.y + box.h * 0.3);
      ctx.scale(1, (box.h * 0.45) / w);
    }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.35, rgba(col, a * 0.45));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-w, -w, w * 2, w * 2);
    ctx.restore();
  }
  ctx.restore();
  // the grain breaks the reflection up a little
  grain(ctx, box, 'wood', 0.12, 1.8, 'soft-light');
}

export interface PanelOpts {
  /** Bevel width (px, default 14% of the short side). */
  bevel?: number;
  /** Lights reflected in the varnish (see varnish). */
  lights?: Reflect[];
  /** Grain direction on the field (default vertical). */
  vertical?: boolean;
}

/**
 * A raised-and-fielded panel (wainscot, a cupboard door, a chest): a recessed groove, four bevels each lit by how it
 * faces the key light (top and left lit, bottom and right turned away), and the proud field with its grain, its lit
 * top-left lip and the small shadow it drops on the bevel below and right; varnish over all.
 */
export function panel(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, base: string, o: PanelOpts = {}): void {
  const b = o.bevel ?? Math.round(Math.min(w, h) * 0.14);
  const vertical = o.vertical ?? true;
  // the groove round the panel (it sits in the frame's rebate): a dark line with a lit far lip
  ctx.fillStyle = 'rgba(18,6,2,0.65)';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = rgba(LIGHT.key, 0.16);
  ctx.fillRect(x - 3, y + h + 1, w + 6, 2);
  ctx.fillRect(x + w + 1, y - 3, 2, h + 6);
  const quad = (pts: [number, number][], col: string, along: 'x' | 'y') => {
    ctx.save();
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
    woodGrain(ctx, r, { x, y, w, h }, col, along === 'y', 0.6);
    ctx.restore();
  };
  const x1 = x + w;
  const y1 = y + h;
  quad([[x, y], [x1, y], [x1 - b, y + b], [x + b, y + b]], shade(base, 0.3), 'x');
  // the varnish catches the light along the top bevel's outer edge
  ctx.fillStyle = rgba('#fff0d0', 0.45);
  ctx.fillRect(x + 2, y + 1, w - 4, 1.4);
  quad([[x, y], [x + b, y + b], [x + b, y1 - b], [x, y1]], shade(base, 0.08), 'y');
  quad([[x, y1], [x + b, y1 - b], [x1 - b, y1 - b], [x1, y1]], mix(shade(base, -0.34), '#1a0806', 0.2), 'x');
  quad([[x1, y], [x1, y1], [x1 - b, y1 - b], [x1 - b, y + b]], mix(shade(base, -0.24), '#1a0806', 0.15), 'y');
  // the field
  const fx = x + b;
  const fy = y + b;
  const fw = w - b * 2;
  const fh = h - b * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(20,6,2,0.45)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = base;
  ctx.fillRect(fx, fy, fw, fh);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, fw, fh);
  ctx.clip();
  const g = ctx.createLinearGradient(fx, fy, fx + fw * 0.4, fy + fh);
  g.addColorStop(0, shade(base, 0.1));
  g.addColorStop(1, shade(base, -0.1));
  ctx.fillStyle = g;
  ctx.fillRect(fx, fy, fw, fh);
  woodGrain(ctx, r, { x: fx, y: fy, w: fw, h: fh }, base, vertical, 0.9);
  ctx.restore();
  ctx.fillStyle = rgba(LIGHT.key, 0.4);
  ctx.fillRect(fx, fy, fw, 1.5);
  ctx.fillRect(fx, fy, 1.5, fh);
  varnish(ctx, { x, y, w, h }, o.lights ?? [], { sheen: 0.08 });
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
  // the cloth's life: washed unevenly (paler and duller patches), the weave catching the light in soft drifts
  const cb = { x: 0, y: TY, w: W, h: front - TY + 4 };
  lay(ctx, drift('#fff6e8', '#5a2a20', 6, 57, 256, 48), cb, 0.16);
  lay(ctx, noiseMask(9, 59, { cover: 0.25, soft: 0.2, col: '#d8c8b0' }), cb, 0.12);
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

/** Planks running away from us on the table plane (a bar top, a deck; `joints` false for full-length boards, a table top). */
export function planksPlane(ctx: Ctx, r: R, front: number, base: string, period = 0.32, gap = 0.012, joints = true): void {
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
    // grain: long wavering lines running to the vanishing point, darker latewood and paler earlywood
    for (let k = 0; k < 14; k++) {
      const X = X0 + ((X1 - X0) * (k + r())) / 14;
      const wob = (r() - 0.5) * 0.012;
      ctx.strokeStyle = rgba(r() < 0.55 ? shade(c, -0.38) : shade(c, 0.22), 0.12 + r() * 0.14);
      ctx.lineWidth = 0.7 + r() * 1.2;
      ctx.beginPath();
      ctx.moveTo(xAt(X, ZB), TY);
      ctx.quadraticCurveTo(xAt(X + wob, (ZB + zf) / 2), yAt((ZB + zf) / 2), xAt(X + (r() - 0.5) * 0.01, zf), front + 4);
      ctx.stroke();
    }
    // a knot now and then, foreshortened, the grain swirling round it
    if (r() < 0.22) {
      const z = zf + (ZB - zf) * (0.05 + r() * 0.9);
      const kx = xAt(X0 + (X1 - X0) * (0.3 + r() * 0.4), z);
      const ky = yAt(z);
      const s = FOC / z;
      for (let ring = 3; ring > 0; ring--) {
        ctx.strokeStyle = rgba(shade(c, -0.45), 0.2 + ring * 0.05);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(kx, ky, ring * s * 0.012, ring * s * 0.005, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(shade(c, -0.5), 0.5);
      ctx.beginPath();
      ctx.ellipse(kx, ky, s * 0.01, s * 0.004, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // butt joints where one length of plank meets the next, each with its pair of nails
    for (let j = 0; joints && j < 2; j++) {
      if (r() < 0.35) continue;
      const z = zf + (ZB - zf) * (0.1 + r() * 0.85);
      const y = yAt(z);
      const s = FOC / z;
      ctx.strokeStyle = rgba(shade(c, -0.6), 0.6);
      ctx.lineWidth = Math.max(1, s * 0.004);
      ctx.beginPath();
      ctx.moveTo(xAt(X0, z), y);
      ctx.lineTo(xAt(X1, z), y);
      ctx.stroke();
      ctx.strokeStyle = rgba(LIGHT.key, 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xAt(X0, z), y + Math.max(1, s * 0.004));
      ctx.lineTo(xAt(X1, z), y + Math.max(1, s * 0.004));
      ctx.stroke();
      for (const u of [0.22, 0.78])
        for (const dz of [-0.012, 0.012]) {
          const nz = z + dz;
          ctx.fillStyle = rgba('#2a1a10', 0.6);
          ctx.beginPath();
          ctx.ellipse(xAt(X0 + (X1 - X0) * u, nz), yAt(nz), Math.max(1, s * 0.004), Math.max(0.6, s * 0.0022), 0, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    const xs = [xAt(X0, ZB), xAt(X1, ZB), xAt(X0, zf), xAt(X1, zf)];
    lay(ctx, drift(shade(c, 0.15), shade(c, -0.2), 3, Math.round(X0 * 100) + 9, 24, 64), { x: Math.min(...xs), y: TY, w: Math.max(...xs) - Math.min(...xs), h: front - TY + 4 }, 0.35);
    ctx.restore();
    // the lit bevel on the plank's left edge, the shaded arris on its right
    ctx.strokeStyle = rgba(LIGHT.key, 0.26);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xAt(X0, ZB), TY);
    ctx.lineTo(xAt(X0, zf), front + 4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(30,14,6,0.35)';
    ctx.beginPath();
    ctx.moveTo(xAt(X1, ZB), TY);
    ctx.lineTo(xAt(X1, zf), front + 4);
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
  /** Half-width of the glitter path near us (px, default 220). */
  glitterW?: number;
  /** The sky reflected at a grazing angle: a paler band along the horizon (fresnel), default none. */
  sky?: string;
  skyA?: number;
  /** The deep colour in the middle distance (default between far and near). */
  deep?: string;
  /** Rows of swell: long broken bands, a lit crest (crest colour) over a dark trough, perspective-spaced. */
  swells?: number;
  crest?: string;
  seed?: number;
}

/** A body of water from y0 (horizon side) to y1 (near side): the sky reflected along the horizon, the colour
 * deepening below it, long swells and short ripples shrinking and crowding towards the horizon, and a light's
 * glitter path running down under it. */
export function water(ctx: Ctx, r: R, x0: number, x1: number, y0: number, y1: number, o: WaterOpts): void {
  const box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, o.far);
  if (o.deep) g.addColorStop(0.4, o.deep);
  g.addColorStop(1, o.near);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // broken colour, stretched along the water (wind lanes and slicks)
  const seed = o.seed ?? 21;
  lay(ctx, drift(shade(o.deep ?? o.near, 0.18), shade(o.deep ?? o.near, -0.22), 5, seed, 256, 32), box, 0.5);
  broken(ctx, box, 0.22, 14, seed);
  if (o.sky) {
    const sg = ctx.createLinearGradient(0, y0, 0, y0 + box.h * 0.35);
    sg.addColorStop(0, rgba(o.sky, o.skyA ?? 0.6));
    sg.addColorStop(1, rgba(o.sky, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(x0, y0, box.w, box.h * 0.35);
  }
  // swells: long bands, broken, perspective-spaced
  const rows = o.swells ?? 0;
  ctx.lineCap = 'round';
  for (let j = 0; j < rows; j++) {
    const t = ((j + 0.5 + (r() - 0.5) * 0.4) / rows) ** 1.7;
    const y = y0 + t * box.h;
    const amp = 0.6 + t * 3.5;
    const f = 0.012 / (0.25 + t);
    const ph = r() * 10;
    const seg = 10 + t * 26;
    for (const [dy, col, al, w] of [[amp * 0.9, shade(o.deep ?? o.near, -0.4), 0.1 + t * 0.18, 1 + t * 3.5], [-amp * 0.4, o.crest ?? o.sky ?? '#ffffff', 0.08 + t * 0.2, 0.7 + t * 1.8]] as const) {
      ctx.strokeStyle = rgba(col, al);
      ctx.lineWidth = w;
      ctx.beginPath();
      let on = false;
      for (let x = x0; x <= x1; x += seg) {
        const vis = Math.sin(x * f * 3.1 + ph * 2) + Math.sin(x * f * 7.3 + j) > -0.3;
        const yy = y + dy + Math.sin(x * f + ph) * amp;
        if (vis && !on) ctx.moveTo(x, yy);
        else if (vis) ctx.lineTo(x, yy);
        on = vis;
      }
      ctx.stroke();
    }
  }
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
    const gw = o.glitterW ?? 220;
    // the path's glow on the water under the light
    const pg = ctx.createLinearGradient(0, y0, 0, y1);
    pg.addColorStop(0, rgba(col, (o.glitterA ?? 0.6) * 0.35));
    pg.addColorStop(1, rgba(col, (o.glitterA ?? 0.6) * 0.08));
    const gx = o.glitterX;
    softly(ctx, { x: gx - gw - 20, y: y0 - 10, w: gw * 2 + 40, h: y1 - y0 + 20 }, (q) => {
      q.fillStyle = pg;
      q.beginPath();
      q.moveTo(gx - gw * 0.12, y0);
      q.lineTo(gx + gw * 0.12, y0);
      q.lineTo(gx + gw * 0.9, y1);
      q.lineTo(gx - gw * 0.9, y1);
      q.closePath();
      q.fill();
    }, 0.2, 'lighter');
    for (let i = 0; i < 160 + gw * 0.4; i++) {
      const t = r() ** 0.8;
      const y = y0 + 2 + t * (y1 - y0 - 4);
      const spread = gw * (0.09 + t);
      const x = o.glitterX + (r() + r() + r() - 1.5) * spread;
      const len = (6 + r() * 22) * (0.4 + t);
      ctx.fillStyle = rgba(col, (o.glitterA ?? 0.6) * (0.3 + r() * 0.7) * (1 - t * 0.5));
      ctx.fillRect(x - len / 2, y, len, Math.max(1, 2 * (0.4 + t)));
    }
    ctx.restore();
  }
}

// ——— sand ———

export interface SandOpts {
  ripples?: number;
  seed?: number;
  /** The light on it (sun colour) and the cool of its shadows (sky colour). */
  light?: string;
  shadow?: string;
  /** Glints of quartz in the light (count per 100×100 px, default 0.6). */
  sparkle?: number;
}

/**
 * Sand: warm grain drifting in colour, wind ripples in perspective (each a lit windward face towards the key light
 * and a cool lee shadow, smaller and tighter with distance), soft hollows, and quartz glints in the light.
 */
export function sand(ctx: Ctx, r: R, box: Box, base: string, o: SandOpts = {}): void {
  const seed = o.seed ?? 41;
  const light = o.light ?? LIGHT.key;
  const shadow = o.shadow ?? '#7a6a9a';
  surface(ctx, r, box, base, { vary: 0.55, cells: 5, mottle: 0.45, strokes: 0, grain: 0, seed, warm: shade(base, 0.18), cool: mix(shade(base, -0.18), shadow, 0.3) });
  // hollows: broad soft dips (the far side of each in cool shade, the near side lit)
  lay(ctx, noiseMask(5, seed + 5, { cover: 0.3, soft: 0.25, col: mix(shade(base, -0.2), shadow, 0.35) }), box, 0.35);
  // wind ripples: rows across the sand, perspective-spaced
  const n = o.ripples ?? 60;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = r() ** 0.8;
    const y = box.y + t * box.h;
    const x = box.x + r() * box.w;
    const s = 0.35 + t * 1.1;
    const len = (40 + r() * 110) * s;
    const bend = (3 + r() * 3) * s;
    ctx.strokeStyle = rgba(mix(shade(base, -0.28), shadow, 0.4), 0.13 + t * 0.08);
    ctx.lineWidth = 1 + s * 1.8;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y + 1);
    ctx.quadraticCurveTo(x, y - bend + 2 * s, x + len / 2, y + 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(light, 0.12 + t * 0.12);
    ctx.lineWidth = 0.8 + s * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y - 1.5 * s);
    ctx.quadraticCurveTo(x, y - bend - 1.5 * s, x + len / 2, y - 1);
    ctx.stroke();
  }
  ctx.restore();
  grain(ctx, box, 'speckle', 0.22, 1);
  grain(ctx, box, 'grain', 0.1, 1.4);
  // quartz glints
  const sp = Math.round(((box.w * box.h) / 10000) * (o.sparkle ?? 0.6));
  for (let i = 0; i < sp; i++) {
    ctx.fillStyle = rgba('#fffaf0', 0.35 + r() * 0.5);
    ctx.fillRect(box.x + r() * box.w, box.y + r() * box.h, 1.2, 1.2);
  }
}

/** A shoreline foam lace along a curve top(x): a dense bright front edge, a web of lace behind it thinning out,
 * the foam's own soft blue shadow just in front of it. `depth` is how far the lace reaches back (up) from the edge. */
export function foamLace(ctx: Ctx, r: R, top: (x: number) => number, x0: number, x1: number, depth: number, o: { a?: number; col?: string; shadow?: string; seed?: number } = {}): void {
  const a = o.a ?? 0.9;
  const col = o.col ?? '#ffffff';
  let lo = Infinity;
  let hi = -Infinity;
  for (let x = x0; x <= x1; x += 20) {
    lo = Math.min(lo, top(x));
    hi = Math.max(hi, top(x));
  }
  const pad = 8;
  const box = { x: x0, y: lo - depth - pad, w: x1 - x0, h: hi - lo + depth + pad * 2 + 6 };
  const [c, g] = makeCanvas(box.w, box.h);
  g.translate(-box.x, -box.y);
  // the lace: a band back from the edge, cut into a web by noise, thinning with distance from the edge
  g.beginPath();
  g.moveTo(x0, top(x0));
  for (let x = x0; x <= x1; x += 10) g.lineTo(x, top(x));
  for (let x = x1; x >= x0; x -= 10) g.lineTo(x, top(x) - depth * (0.55 + 0.45 * Math.sin(x * 0.013 + 1.7) * Math.sin(x * 0.005)));
  g.closePath();
  const lg = g.createLinearGradient(0, lo - depth, 0, hi);
  lg.addColorStop(0, rgba(col, 0));
  lg.addColorStop(0.6, rgba(col, a * 0.6));
  lg.addColorStop(1, rgba(col, a));
  g.fillStyle = lg;
  g.fill();
  g.globalCompositeOperation = 'destination-in';
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = true;
  g.drawImage(noiseMask(34, o.seed ?? 77, { kind: 'web', cover: 0.75, soft: 0.12, col: '#ffffff', w: 512, h: 40 }), 0, 0, box.w, box.h);
  g.globalCompositeOperation = 'source-over';
  g.translate(-box.x, -box.y);
  // the front edge: a dense rolled line of foam, broken here and there
  g.lineCap = 'round';
  for (const [dy, w, al] of [[-1.5, 7, 0.45], [0, 3, 0.95]] as const) {
    g.strokeStyle = rgba(col, al * a);
    g.lineWidth = w;
    g.beginPath();
    let on = false;
    for (let x = x0; x <= x1; x += 6) {
      const vis = Math.sin(x * 0.05 + (o.seed ?? 0)) + Math.sin(x * 0.013) > -1.2;
      const y = top(x) + dy;
      if (vis && !on) g.moveTo(x, y);
      else if (vis) g.lineTo(x, y);
      on = vis;
    }
    g.stroke();
  }
  // the foam's shadow just in front of it
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.strokeStyle = rgba(o.shadow ?? '#4a6a8a', 0.3 * a);
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 12) (x === x0 ? ctx.moveTo(x, top(x) + 5) : ctx.lineTo(x, top(x) + 5));
  ctx.stroke();
  ctx.restore();
  ctx.drawImage(c, box.x, box.y);
  void r;
}

/** Clear shallow water over sand: the water's colour thinning to nothing at the edge, sunlight's caustic net
 * rippling on the bottom through it. The region runs from the curve top(x) down to y1 (the water's edge). */
export function shallows(ctx: Ctx, top: (x: number) => number, edge: (x: number) => number, x0: number, x1: number, col: string, a = 0.7, caustic = '#fff6d8', causticA = 0.35, seed = 5): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, top(x0));
  for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, top(x));
  for (let x = x1; x >= x0; x -= 12) ctx.lineTo(x, edge(x));
  ctx.closePath();
  ctx.clip();
  let lo = Infinity;
  let hi = -Infinity;
  for (let x = x0; x <= x1; x += 20) {
    lo = Math.min(lo, top(x));
    hi = Math.max(hi, edge(x));
  }
  const g = ctx.createLinearGradient(0, lo, 0, hi);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(0.55, rgba(col, a));
  g.addColorStop(0.75, rgba(col, a * 0.45));
  g.addColorStop(1, rgba(col, 0.05));
  ctx.fillStyle = g;
  ctx.fillRect(x0, lo, x1 - x0, hi - lo);
  const m = noiseMask(40, seed, { kind: 'web', cover: 0.5, soft: 0.1, col: caustic, w: 384, h: 48 });
  lay(ctx, m, { x: x0, y: lo, w: x1 - x0, h: hi - lo }, causticA, 'screen');
  ctx.restore();
}

// ——— shared tiny helper ———

/** A small cloud of noise from the backdrop kit for soft blotches. */
export const cloudTile = cloud;
export const fieldNoise = (x: number, y: number, seed = 0) => vnoise(x, y, seed);
export { mottle };
