// More scene materials for the location kit: riveted metal plate (a ship's or a station's hull, a boiler), glazed
// ceramic wall tiles, dressed stone (ashlar) and floors laid on the table plane (tiles, flags, steel deck). Same
// rules as materials.ts: lit by the one light (top left), shadows and occlusion in the joints, colour drift and wear.

import { TY, VX, ZB, xAt, yAt, zAt } from '../backdrops';
import { LIGHT } from '../style/kit';
import { type Ctx, mix, rgba, shade } from '../util';
import { type Box, type R, W, jitter } from './kit';
import { grain, planeQuad } from './materials';
import { drift, grime, lay, noiseMask, surface } from './paint';

// ——— paths ———

/** A rounded rect traced the other way round (anticlockwise): add it after a clockwise shape to cut a hole with the
 * default (nonzero) fill, e.g. the ring of a porthole's frame. */
export function rrBack(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const P = Math.PI;
  c.moveTo(x + r, y);
  c.arc(x + r, y + r, r, -P / 2, -P, true);
  c.lineTo(x, y + h - r);
  c.arc(x + r, y + h - r, r, P, P / 2, true);
  c.lineTo(x + w - r, y + h);
  c.arc(x + w - r, y + h - r, r, P / 2, 0, true);
  c.lineTo(x + w, y + r);
  c.arc(x + w - r, y + r, r, 0, -P / 2, true);
  c.closePath();
}

// ——— metal ———

/** A dome-headed rivet: a soft cast shadow down-right, the head lit top-left with a hard glint. */
export function rivet(ctx: Ctx, x: number, y: number, rad: number, base: string, a = 1): void {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(6,8,16,0.45)';
  ctx.beginPath();
  ctx.ellipse(x + rad * 0.45, y + rad * 0.6, rad * 1.15, rad * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - rad * 0.4, y - rad * 0.45, rad * 0.1, x, y, rad * 1.05);
  g.addColorStop(0, shade(base, 0.45));
  g.addColorStop(0.45, base);
  g.addColorStop(1, mix(shade(base, -0.45), '#0a0c18', 0.3));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.55);
  ctx.beginPath();
  ctx.ellipse(x - rad * 0.38, y - rad * 0.42, rad * 0.32, rad * 0.2, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface PlateOpts {
  /** Seams between plates: screen x positions of the vertical seams and y positions of the horizontal ones. */
  seamsX: number[];
  seamsY: number[];
  /** Rivet spacing along each plate's edge (px, 0 for none) and inset from the seam. */
  rivetGap?: number;
  rivetInset?: number;
  rivetR?: number;
  /** Per-plate tone variation (0…1, default 0.5). */
  vary?: number;
  /** Grime and wear (0…1, default 0.5): dirt along the bottom, streaks run down from rivets. */
  wear?: number;
  /** Texture: brushed (default) or cast. */
  tex?: 'brushed' | 'cast';
  seed?: number;
}

/**
 * Riveted metal plate over a box: each plate a slightly different tone (no two sheets alike), brushed along its
 * length, its top-left edges catching the light and its bottom-right falling away into the seam's shadow; rivets
 * along the seams with a streak of dirt run down from some; grime gathered low.
 */
export function plates(ctx: Ctx, r: R, box: Box, base: string, o: PlateOpts): void {
  const seed = o.seed ?? 13;
  const vary = o.vary ?? 0.5;
  const wear = o.wear ?? 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  surface(ctx, r, box, base, { vary: 0.45, cells: 5, mottle: 0.3, strokes: 0.25, strokeLen: 260, strokeW: 10, grain: 0, seed, cool: mix(shade(base, -0.3), '#2a3458', 0.35) });
  const xs = [box.x, ...o.seamsX.filter((x) => x > box.x && x < box.x + box.w), box.x + box.w];
  const ys = [box.y, ...o.seamsY.filter((y) => y > box.y && y < box.y + box.h), box.y + box.h];
  const gap = 3;
  for (let j = 0; j < ys.length - 1; j++)
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i] + (i ? gap / 2 : 0);
      const x1 = xs[i + 1] - (i < xs.length - 2 ? gap / 2 : 0);
      const y0 = ys[j] + (j ? gap / 2 : 0);
      const y1 = ys[j + 1] - (j < ys.length - 2 ? gap / 2 : 0);
      // each sheet its own tone, and a soft sheen from the top left falling off across it
      ctx.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#0a0c18', (0.02 + r() * 0.05) * vary * 2);
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      const sg = ctx.createLinearGradient(x0, y0, x0 + (x1 - x0) * 0.6, y1);
      sg.addColorStop(0, rgba('#ffffff', 0.07));
      sg.addColorStop(1, rgba('#000010', 0.06));
      ctx.fillStyle = sg;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      // edges: lit top and left, dark bottom and right
      ctx.fillStyle = rgba(LIGHT.key, 0.16);
      ctx.fillRect(x0, y0, x1 - x0, 1.5);
      ctx.fillRect(x0, y0, 1.5, y1 - y0);
      ctx.fillStyle = 'rgba(4,6,14,0.45)';
      ctx.fillRect(x0, y1 - 2, x1 - x0, 2);
      ctx.fillRect(x1 - 2, y0, 2, y1 - y0);
    }
  // the seams themselves, dark
  ctx.fillStyle = 'rgba(4,6,12,0.7)';
  for (const x of xs.slice(1, -1)) ctx.fillRect(x - gap / 2, box.y, gap, box.h);
  for (const y of ys.slice(1, -1)) ctx.fillRect(box.x, y - gap / 2, box.w, gap);
  grain(ctx, box, o.tex ?? 'brushed', 0.22, 1.6);
  // rivets along the seams, dirt run down from some
  const rg = o.rivetGap ?? 0;
  if (rg > 0) {
    const ins = o.rivetInset ?? 10;
    const rr = o.rivetR ?? 3.2;
    const rivetCol = shade(base, 0.08);
    for (const y of ys.slice(1, -1))
      for (let x = box.x + rg / 2; x < box.x + box.w; x += rg) {
        for (const dy of [-ins, ins]) {
          rivet(ctx, x, y + dy, rr, rivetCol);
          if (dy > 0 && r() < 0.18 * wear) {
            const g = ctx.createLinearGradient(0, y + dy, 0, y + dy + 40 + r() * 60);
            g.addColorStop(0, 'rgba(60,40,24,0.22)');
            g.addColorStop(1, 'rgba(60,40,24,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - 2, y + dy + 2, 4 + r() * 3, 100);
          }
        }
      }
    for (const x of xs.slice(1, -1))
      for (let y = box.y + rg / 2; y < box.y + box.h; y += rg) for (const dx of [-ins, ins]) rivet(ctx, x + dx, y, rr, rivetCol);
  }
  ctx.restore();
  if (wear > 0) grime(ctx, box, { bottom: box.h * 0.3, top: box.h * 0.08, a: 0.35 * wear, patchy: 0.7, seed: seed + 5, col: '#0c0a10' });
}

// ——— ceramic ———

export interface TileOpts {
  /** Tile colours (one picked per tile, jittered). */
  pal?: string[];
  /** The glaze's gloss: soft reflections and a lit cushion (0…1, default 0.6). */
  glaze?: number;
  /** Crazing in the glaze (0…1, default 0.3). */
  crackle?: number;
  /** Where lights sit across the wall (screen x): each reflected as a soft streak in every glazed tile under it. */
  lights?: { x: number; a?: number; w?: number; col?: string }[];
  seed?: number;
}

/** Glazed ceramic tiles over a box on a grid of `size` px: recessed grout in shadow on its upper-left, each tile a
 * slightly cushioned glaze lit from the top left, the room's lights reflected in it, fine crazing. */
export function tiles(ctx: Ctx, r: R, box: Box, base: string, grout: string, size: number, o: TileOpts = {}): void {
  const pal = o.pal ?? [base];
  const glaze = o.glaze ?? 0.6;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.fillStyle = grout;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  grain(ctx, box, 'speckle', 0.3, 1);
  const g = Math.max(2, Math.round(size * 0.05));
  for (let y = box.y; y < box.y + box.h; y += size)
    for (let x = box.x; x < box.x + box.w; x += size) {
      const c = jitter(pal[Math.floor(r() * pal.length)], r, 0.04);
      const tx = x + g / 2;
      const ty = y + g / 2;
      const s = size - g;
      const gr = ctx.createLinearGradient(tx, ty, tx + s * 0.6, ty + s);
      gr.addColorStop(0, shade(c, 0.06 * glaze));
      gr.addColorStop(0.55, c);
      gr.addColorStop(1, shade(c, -0.08 * glaze));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.roundRect(tx, ty, s, s, Math.max(1, s * 0.06));
      ctx.fill();
      // the cushioned glaze's lit top-left lip and the dark bottom-right where it rounds into the grout
      ctx.fillStyle = rgba('#ffffff', 0.22 * glaze);
      ctx.fillRect(tx + 2, ty + 1, s - 4, 1.2);
      ctx.fillRect(tx + 1, ty + 2, 1.2, s - 4);
      ctx.fillStyle = rgba('#1a1008', 0.2);
      ctx.fillRect(tx + 2, ty + s - 1.6, s - 3, 1.6);
      ctx.fillRect(tx + s - 1.6, ty + 2, 1.6, s - 3);
    }
  // grout in shadow under each course (its upper half under the tile above)
  ctx.fillStyle = 'rgba(20,10,4,0.25)';
  for (let y = box.y + size; y < box.y + box.h; y += size) ctx.fillRect(box.x, y - g / 2, box.w, g * 0.6);
  // the glaze reflects: each light a soft vertical smear in the tiles under it, broken tile by tile
  ctx.globalCompositeOperation = 'screen';
  for (const l of o.lights ?? []) {
    const w = l.w ?? 60;
    for (let y = box.y; y < box.y + box.h; y += size) {
      const fall = 1 - (y - box.y) / box.h;
      const x = l.x + (r() - 0.5) * 8;
      const lg = ctx.createLinearGradient(x - w, 0, x + w, 0);
      lg.addColorStop(0, rgba(l.col ?? '#fff6e0', 0));
      lg.addColorStop(0.5, rgba(l.col ?? '#fff6e0', (l.a ?? 0.25) * glaze * (0.5 + fall * 0.5)));
      lg.addColorStop(1, rgba(l.col ?? '#fff6e0', 0));
      ctx.fillStyle = lg;
      ctx.fillRect(x - w, y + g, w * 2, size - g * 2);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  lay(ctx, noiseMask(14, (o.seed ?? 3) + 31, { cover: 0.3, soft: 0.03, kind: 'web', col: shade(base, -0.4) }), box, 0.12 * (o.crackle ?? 0.3));
  lay(ctx, drift(shade(base, 0.08), shade(base, -0.18), 5, (o.seed ?? 3) + 7), box, 0.3);
  ctx.restore();
}

// ——— stone ———

export interface AshlarOpts {
  /** Course height (px) and block lengths (px). */
  rowH?: number;
  minW?: number;
  maxW?: number;
  /** Weathering: colour drift, pitting and soft erosion of the arrises (0…1, default 0.5). */
  weather?: number;
  /** Lichen or moss gathering on the tops of the blocks (colour; none by default). */
  moss?: string;
  mossA?: number;
  seed?: number;
}

/**
 * Dressed stone (ashlar) over a box: courses of blocks, each its own stone, its face tooled and gently cushioned,
 * the top and left arrises catching the light and the bottom and right ones in shadow, the mortar recessed; chips
 * off some corners, weathering and lichen on the tops of blocks where water sits.
 */
export function ashlar(ctx: Ctx, r: R, box: Box, pal: string[], mortar: string, o: AshlarOpts = {}): void {
  const rowH = o.rowH ?? 56;
  const minW = o.minW ?? 80;
  const maxW = o.maxW ?? 170;
  const weather = o.weather ?? 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.fillStyle = mortar;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  grain(ctx, box, 'speckle', 0.3, 1);
  const g = Math.max(3, Math.round(rowH * 0.08));
  for (let y = box.y - r() * rowH * 0.5; y < box.y + box.h; ) {
    const h = rowH * (0.85 + r() * 0.3);
    ctx.fillStyle = 'rgba(10,8,14,0.4)';
    ctx.fillRect(box.x, y + h - g * 0.5, box.w, g * 0.6);
    for (let x = box.x - r() * maxW; x < box.x + box.w; ) {
      const w = minW + r() * (maxW - minW);
      const c = jitter(pal[Math.floor(r() * pal.length)], r, 0.06);
      const bx = x + g / 2;
      const by = y + g / 2;
      const bw = w - g;
      const bh = h - g;
      const gr = ctx.createLinearGradient(bx, by, bx + bw * 0.35, by + bh * 1.3);
      gr.addColorStop(0, shade(c, 0.1));
      gr.addColorStop(0.5, c);
      gr.addColorStop(1, mix(shade(c, -0.22), '#141020', 0.2));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 3 + weather * 4);
      ctx.fill();
      // tooling: faint diagonal chisel strokes across the face
      ctx.strokeStyle = rgba(shade(c, -0.25), 0.1);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = bx + 4; k < bx + bw; k += 5 + r() * 4) {
        ctx.moveTo(k, by + 3);
        ctx.lineTo(k - bh * 0.25, by + bh - 3);
      }
      ctx.stroke();
      ctx.fillStyle = rgba(LIGHT.key, 0.2);
      ctx.fillRect(bx + 3, by, bw - 6, 2);
      ctx.fillRect(bx, by + 3, 2, bh - 6);
      ctx.fillStyle = 'rgba(8,6,14,0.42)';
      ctx.fillRect(bx + 3, by + bh - 2.5, bw - 4, 2.5);
      ctx.fillRect(bx + bw - 2.5, by + 3, 2.5, bh - 4);
      // a chipped corner
      if (r() < 0.22 * (0.5 + weather)) {
        const cx = r() < 0.5 ? bx : bx + bw;
        const cy = r() < 0.5 ? by : by + bh;
        const s = 5 + r() * 9;
        ctx.fillStyle = rgba(shade(c, -0.35), 0.7);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + (cx === bx ? s : -s), cy);
        ctx.lineTo(cx, cy + (cy === by ? s : -s));
        ctx.closePath();
        ctx.fill();
      }
      // lichen and moss on the block's top, where water sits
      if (o.moss && r() < 0.45) {
        const mw = bw * (0.2 + r() * 0.5);
        const mx = bx + r() * (bw - mw);
        const mg = ctx.createLinearGradient(0, by, 0, by + 10 + r() * 10);
        mg.addColorStop(0, rgba(o.moss, (o.mossA ?? 0.5) * (0.5 + r() * 0.5)));
        mg.addColorStop(1, rgba(o.moss, 0));
        ctx.fillStyle = mg;
        ctx.fillRect(mx, by, mw, 20);
      }
      x += w;
    }
    y += h;
  }
  grain(ctx, box, 'grain', 0.3, 1.3);
  grain(ctx, box, 'speckle', 0.15, 1);
  lay(ctx, drift(shade(pal[0], 0.15), '#1a1424', 6, (o.seed ?? 5) + 3), box, 0.35 * weather + 0.1);
  lay(ctx, noiseMask(18, (o.seed ?? 5) + 9, { cover: 0.2, soft: 0.1, col: '#0e0a12' }), box, 0.18 * weather);
  ctx.restore();
}

// ——— floors on the table plane ———

export interface FloorOpts {
  /** Tile size in table units (X across, z into the scene), and the grid's lateral offset. */
  size?: number;
  depthK?: number;
  off?: number;
  /** Colours: checker A and B (each list jittered per tile); give only `a` for one kind. */
  a: string[];
  b?: string[];
  grout: string;
  /** Grout width as a fraction of a tile (default 0.06). */
  gap?: number;
  /** Gloss: a soft sheen from the far lights (0…1, default 0.3). */
  gloss?: number;
  /** Wear: paler, smoother where feet (and plates) have passed (0…1, default 0.4). */
  wear?: number;
  /** Texture over all (default 'stone'). */
  tex?: 'stone' | 'grain' | 'cast' | 'speckle';
  seed?: number;
}

/**
 * Tiles or flags laid on the table plane from its back edge (TY) to `front`: each tile its own colour, recessed grout
 * in perspective, the far rows darker and duller, wear down the middle, a sheen from the room's light.
 */
export function floorPlane(ctx: Ctx, r: R, front: number, o: FloorOpts): void {
  const size = o.size ?? 0.3;
  const dz = size * (o.depthK ?? 1);
  const off = o.off ?? 0;
  const gap = (o.gap ?? 0.06) * size;
  const zf = zAt(front + 4);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, front - TY + 4);
  ctx.clip();
  ctx.fillStyle = o.grout;
  ctx.fillRect(0, TY, W, front - TY + 4);
  const n = Math.ceil(3 / size);
  let j = 0;
  for (let z0 = ZB; z0 > zf; z0 -= dz, j++) {
    const z1 = Math.max(z0 - dz, 0.5);
    for (let i = -n; i < n; i++) {
      const list = o.b && (i + j) % 2 !== 0 ? o.b : o.a;
      const c = jitter(list[Math.floor(r() * list.length)], r, 0.05);
      const X0 = i * size + off + gap / 2;
      const X1 = (i + 1) * size + off - gap / 2;
      const za = z0 - gap / 2;
      const zb = z1 + gap / 2;
      ctx.fillStyle = c;
      ctx.beginPath();
      planeQuad(ctx, X0, X1, za, zb);
      ctx.fill();
      // the near lip of each tile catches the light a hair; its far edge sits in the grout's shadow
      ctx.strokeStyle = rgba(LIGHT.key, 0.12);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xAt(X0, zb), yAt(zb) - 0.5);
      ctx.lineTo(xAt(X1, zb), yAt(zb) - 0.5);
      ctx.stroke();
    }
  }
  const box = { x: 0, y: TY, w: W, h: front - TY + 4 };
  grain(ctx, box, o.tex ?? 'grain', 0.28, 1.2);
  lay(ctx, drift('#fff0dc', '#2a1a20', 7, (o.seed ?? 3) + 1, 256, 64), box, 0.18);
  lay(ctx, noiseMask(10, (o.seed ?? 3) + 4, { cover: 0.25, soft: 0.2, col: '#1a1010' }), box, 0.14);
  // wear: a paler, smoother path down the middle where things have been slid for years
  const wear = o.wear ?? 0.4;
  if (wear > 0) {
    ctx.save();
    ctx.translate(VX, (TY + front) / 2 + 40);
    ctx.scale(1, 0.28);
    const wg = ctx.createRadialGradient(0, 0, 0, 0, 0, 900);
    wg.addColorStop(0, rgba('#fff4e4', 0.1 * wear));
    wg.addColorStop(1, rgba('#fff4e4', 0));
    ctx.fillStyle = wg;
    ctx.fillRect(-1000, -1000, 2000, 2000);
    ctx.restore();
  }
  // gloss: the far end catches the room's light at a grazing angle
  const gl = o.gloss ?? 0.3;
  if (gl > 0) {
    const g = ctx.createLinearGradient(0, TY, 0, TY + 90);
    g.addColorStop(0, rgba('#ffffff', 0.12 * gl));
    g.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, TY, W, 90);
  }
  // the far rows darker (less light reaches them), the near middle the brightest
  const fg = ctx.createLinearGradient(0, TY, 0, front);
  fg.addColorStop(0, 'rgba(10,6,12,0.34)');
  fg.addColorStop(0.4, 'rgba(10,6,12,0.08)');
  fg.addColorStop(1, 'rgba(10,6,12,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, TY, W, front - TY + 4);
  ctx.restore();
}

/** Plate on the table plane: brushed steel (or any metal) sheets with seams running into the scene and across it,
 * brushed along X, a sheen where the light grazes it and soft reflections of the lights over it. */
export function metalPlane(ctx: Ctx, r: R, front: number, base: string, o: { seamsX?: number[]; seamsZ?: number[]; lights?: { x: number; col: string; a: number }[]; seed?: number } = {}): void {
  const zf = zAt(front + 4);
  const box = { x: 0, y: TY, w: W, h: front - TY + 4 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, TY, 0, front);
  g.addColorStop(0, shade(base, -0.25));
  g.addColorStop(0.5, base);
  g.addColorStop(1, shade(base, 0.06));
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  // brushing: fine horizontal streaks, tighter in the distance
  for (let i = 0; i < 520; i++) {
    const y = TY + (front - TY) * r() ** 1.3;
    const x = r() * W;
    const len = 80 + r() * 380;
    ctx.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#080a14', 0.03 + r() * 0.05);
    ctx.fillRect(x, y, len, 0.8 + ((y - TY) / (front - TY)) * 1.2);
  }
  lay(ctx, drift(shade(base, 0.2), shade(base, -0.3), 6, (o.seed ?? 3) + 2, 256, 48), box, 0.3);
  // reflections of the lights: long soft streaks straight towards us under each one
  ctx.globalCompositeOperation = 'screen';
  for (const l of o.lights ?? []) {
    ctx.save();
    ctx.translate(l.x, TY);
    ctx.scale(1, 4);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
    rg.addColorStop(0, rgba(l.col, l.a));
    rg.addColorStop(0.5, rgba(l.col, l.a * 0.3));
    rg.addColorStop(1, rgba(l.col, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(-120, -10, 240, 130);
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  // seams
  ctx.lineCap = 'butt';
  for (const X of o.seamsX ?? []) {
    ctx.strokeStyle = 'rgba(4,6,12,0.6)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB), TY);
    ctx.lineTo(xAt(X, zf), front + 4);
    ctx.stroke();
    ctx.strokeStyle = rgba(LIGHT.key, 0.14);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB) + 2, TY);
    ctx.lineTo(xAt(X, zf) + 2.5, front + 4);
    ctx.stroke();
  }
  for (const z of o.seamsZ ?? []) {
    const y = yAt(z);
    ctx.fillStyle = 'rgba(4,6,12,0.55)';
    ctx.fillRect(0, y - 1, W, 2.2);
    ctx.fillStyle = rgba(LIGHT.key, 0.12);
    ctx.fillRect(0, y + 1.2, W, 1);
  }
  grain(ctx, box, 'brushed', 0.2, 1.4);
  ctx.restore();
}
