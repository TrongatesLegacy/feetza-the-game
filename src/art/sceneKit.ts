// Painting kit for the Feetza 2.0 scenes in src/content/art: re-exports the helpers the built-in
// backdrops use, plus a few extra props (tiles, stone, barrels, ranges, rails, ground planes).

import {
  type R,
  FOC,
  H,
  OL,
  TY,
  VX,
  HY,
  W,
  ZB,
  clipRect,
  cylH,
  cylV,
  darkSpot,
  fillOl,
  frontFace,
  glow,
  grainRect,
  lgrad,
  mottle,
  outline,
  vgrad,
  xAt,
  yAt,
  zFront,
} from './backdrops';
import { type Ctx, blob, ellipse, rgba, roundRect, shade } from './util';

export * from './backdrops';
export { blob, ellipse, mix, rgba, roundRect, shade } from './util';
export type { Ctx } from './util';

/** Square glazed tiles with grout, bevel and slight colour variation. */
export function tiles(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, size: number, pal: string[], grout: string, pattern?: (i: number, j: number) => number): void {
  ctx.save();
  clipRect(ctx, x, y, w, h);
  ctx.fillStyle = grout;
  ctx.fillRect(x, y, w, h);
  for (let j = 0, ty = y; ty < y + h; j++, ty += size)
    for (let i = 0, tx = x; tx < x + w; i++, tx += size) {
      const k = pattern ? pattern(i, j) : Math.floor(r() * pal.length);
      const c = shade(pal[k % pal.length], (r() - 0.5) * 0.08);
      roundRect(ctx, tx + 2, ty + 2, size - 4, size - 4, 3);
      ctx.fillStyle = lgrad(ctx, tx, ty, tx + size, ty + size, [
        [0, shade(c, 0.14)],
        [1, shade(c, -0.1)],
      ]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(tx + 5, ty + 4, size * 0.4, 2);
    }
  grainRect(ctx, x, y, w, h, 0.18);
  ctx.restore();
}

/** Irregular ashlar blocks (rows of varying height). */
export function stoneBlocks(ctx: Ctx, r: R, x0: number, y0: number, w: number, h: number, pal: string[], mortar: string, rowH = 70, round = 10): void {
  ctx.save();
  clipRect(ctx, x0, y0, w, h);
  ctx.fillStyle = mortar;
  ctx.fillRect(x0, y0, w, h);
  for (let y = y0 - 6; y < y0 + h; ) {
    const sh = rowH * (0.8 + r() * 0.4);
    let x = x0 - r() * rowH * 1.4;
    while (x < x0 + w) {
      const sw = rowH * (1.1 + r() * 1.3);
      const c = shade(pal[Math.floor(r() * pal.length)], (r() - 0.5) * 0.18);
      roundRect(ctx, x + 3, y + 3, sw - 6, sh - 6, round);
      ctx.fillStyle = lgrad(ctx, 0, y, 0, y + sh, [
        [0, shade(c, 0.12)],
        [1, shade(c, -0.22)],
      ]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 8, y + 5, sw - 16, 3);
      if (r() < 0.2) {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cx = x + sw * (0.2 + r() * 0.6);
        ctx.moveTo(cx, y + 4);
        ctx.lineTo(cx + (r() - 0.5) * 20, y + sh * 0.5);
        ctx.lineTo(cx + (r() - 0.5) * 30, y + sh - 4);
        ctx.stroke();
      }
      x += sw;
    }
    y += sh;
  }
  mottle(ctx, x0, y0, w, h, 0.3, 1.2);
  grainRect(ctx, x0, y0, w, h, 0.3);
  ctx.restore();
}

/** Mountain range silhouette with snow caps. peaks are [x, y] in pixels. */
export function range(ctx: Ctx, base: number, peaks: [number, number][], col: string | CanvasGradient, snow?: string, cap = 0.3, ol = 0): void {
  ctx.beginPath();
  ctx.moveTo(peaks[0][0], base);
  for (const [px, py] of peaks) ctx.lineTo(px, py);
  ctx.lineTo(peaks[peaks.length - 1][0], base);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  if (ol) outline(ctx, ol);
  if (!snow) return;
  ctx.fillStyle = snow;
  for (let i = 1; i < peaks.length - 1; i++) {
    const [px, py] = peaks[i];
    const [ax, ay] = peaks[i - 1];
    const [bx, by] = peaks[i + 1];
    if (py > ay || py > by) continue; // only true peaks
    const t = cap;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (ax - px) * t, py + (ay - py) * t);
    ctx.lineTo(px + (ax - px) * t * 0.55, py + (ay - py) * t * 0.75);
    ctx.lineTo(px + (ax - px) * t * 0.2, py + (ay - py) * t * 1.05);
    ctx.lineTo(px + (bx - px) * t * 0.3, py + (by - py) * t * 0.7);
    ctx.lineTo(px + (bx - px) * t * 0.6, py + (by - py) * t * 0.95);
    ctx.lineTo(px + (bx - px) * t, py + (by - py) * t);
    ctx.closePath();
    ctx.fill();
  }
}

/** Wooden barrel seen side-on, centred at (x, y). */
export function barrel(ctx: Ctx, x: number, y: number, w: number, h: number, wood = '#7a4a26', hoop = '#4a4440'): void {
  const bulge = w * 0.08;
  const shape = (): void => {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h / 2);
    ctx.quadraticCurveTo(x - w / 2 - bulge, y, x - w / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.quadraticCurveTo(x + w / 2 + bulge, y, x + w / 2, y - h / 2);
    ctx.closePath();
  };
  shape();
  fillOl(ctx, cylH(ctx, x - w / 2 - bulge, w + bulge * 2, wood), 5);
  ctx.save();
  shape();
  ctx.clip();
  ctx.strokeStyle = rgba(shade(wood, -0.55), 0.6);
  ctx.lineWidth = 2;
  for (let k = 1; k < 6; k++) {
    const sx = x - w / 2 + (w * k) / 6;
    ctx.beginPath();
    ctx.moveTo(sx, y - h / 2);
    ctx.quadraticCurveTo(sx + (sx - x) * 0.12, y, sx, y + h / 2);
    ctx.stroke();
  }
  for (const f of [-0.36, -0.18, 0.18, 0.36]) {
    ctx.beginPath();
    ctx.rect(x - w, y + f * h - 7, w * 2, 14);
    ctx.fillStyle = cylH(ctx, x - w / 2 - bulge, w + bulge * 2, hoop);
    ctx.fill();
    ctx.strokeStyle = rgba(OL, 0.8);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
  shape();
  outline(ctx, 5);
}

/** Barrel lying on its side, end facing the viewer. */
export function barrelEnd(ctx: Ctx, x: number, y: number, rad: number, wood = '#8a5a30', hoop = '#3e3a36'): void {
  ellipse(ctx, x, y, rad, rad);
  fillOl(ctx, hoop, 5);
  ellipse(ctx, x, y, rad * 0.88, rad * 0.88);
  const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, rad * 0.1, x, y, rad);
  g.addColorStop(0, shade(wood, 0.2));
  g.addColorStop(1, shade(wood, -0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ellipse(ctx, x, y, rad * 0.88, rad * 0.88);
  ctx.clip();
  ctx.strokeStyle = rgba(shade(wood, -0.6), 0.55);
  ctx.lineWidth = 2;
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * rad * 0.26, y - rad);
    ctx.lineTo(x + k * rad * 0.26, y + rad);
    ctx.stroke();
  }
  ctx.restore();
  ellipse(ctx, x + rad * 0.3, y + rad * 0.45, rad * 0.1, rad * 0.1);
  fillOl(ctx, '#3a2414', 2.5);
}

/** Railing of posts and rails across the full width (in front of the wall, behind the table). */
export function railing(ctx: Ctx, top: number, bottom: number, spacing: number, col: string, postW = 18, rails: number[] = [0], baluster = 0): void {
  if (baluster)
    for (let x = spacing / 2; x < W; x += baluster) {
      ctx.beginPath();
      ctx.rect(x - 5, top, 10, bottom - top);
      fillOl(ctx, cylH(ctx, x - 5, 10, shade(col, -0.1)), 3);
    }
  for (let x = 0; x < W + spacing; x += spacing) {
    ctx.beginPath();
    ctx.rect(x - postW / 2, top - 14, postW, bottom - top + 14);
    fillOl(ctx, cylH(ctx, x - postW / 2, postW, col), 4);
  }
  for (const ry of rails) {
    const y = top + ry;
    ctx.beginPath();
    ctx.rect(-10, y - 9, W + 20, 18);
    fillOl(ctx, cylV(ctx, y - 9, 18, shade(col, 0.1)), 4);
  }
}

/** Flat ground plane between the horizon-ish line y0 and the table, with perspective streaks. */
export function groundPlane(ctx: Ctx, y0: number, top: string, bottom: string, streak?: string): void {
  vgrad(ctx, 0, y0, W, TY - y0, [
    [0, top],
    [1, bottom],
  ]);
  if (!streak) return;
  ctx.strokeStyle = streak;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let X = -40; X <= 40; X += 2.5) {
    ctx.moveTo(VX + X * 6, y0);
    ctx.lineTo(VX + X * 6 * ((TY - HY) / (y0 - HY)), TY);
  }
  ctx.stroke();
}

/** Stone slab table top in perspective with mottle, cracks and pits. */
export function stoneTop(ctx: Ctx, r: R, f: number, base: string, crack = 0.5): void {
  const zf = zFront(f);
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  vgrad(ctx, 0, TY, W, f - TY, [
    [0, shade(base, -0.35)],
    [0.5, base],
    [1, shade(base, 0.12)],
  ]);
  mottle(ctx, 0, TY, W, f - TY, 0.22, 1.4);
  // slab joints with a lit bevel
  for (const X of [-1.5, -0.5, 0.5, 1.5]) {
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB), TY);
    ctx.lineTo(xAt(X, zf), f);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xAt(X + 0.02, ZB), TY);
    ctx.lineTo(xAt(X + 0.02, zf), f);
    ctx.stroke();
  }
  const zj = ZB - (ZB - zf) * 0.45;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, yAt(zj));
  ctx.lineTo(W, yAt(zj));
  ctx.stroke();
  for (let i = 0; i < 40; i++) {
    const X = (r() - 0.5) * 4;
    const z = ZB - r() * (ZB - zf);
    const s = FOC / z / 460;
    ctx.save();
    ctx.translate(xAt(X, z), yAt(z));
    ctx.scale(s, s * 0.45);
    blob(ctx, 0, 0, 6 + r() * 16, 0.5, r, 8);
    ctx.fillStyle = rgba(shade(base, -0.45), 0.45);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = `rgba(0,0,0,${0.35 * crack})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    let X = (r() - 0.5) * 3.6;
    let z = ZB - r() * 0.4;
    ctx.beginPath();
    ctx.moveTo(xAt(X, z), yAt(z));
    for (let k = 0; k < 7; k++) {
      X += (r() - 0.5) * 0.18;
      z -= 0.04 + r() * 0.08;
      ctx.lineTo(xAt(X, z), yAt(z));
    }
    ctx.stroke();
  }
  grainRect(ctx, 0, TY, W, f - TY, 0.35);
  ctx.restore();
}

/** Rough stone front face for stoneTop. */
export function stoneFront(ctx: Ctx, r: R, f: number, base: string): void {
  frontFace(ctx, f, () => {
    ctx.fillStyle = lgrad(ctx, 0, f, 0, H, [
      [0, shade(base, -0.1)],
      [1, shade(base, -0.45)],
    ]);
    ctx.fillRect(0, f, W, H - f);
    mottle(ctx, 0, f, W, H - f, 0.4, 0.8);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    for (let x = r() * 200; x < W; x += 160 + r() * 200) {
      ctx.beginPath();
      ctx.moveTo(x, f);
      ctx.lineTo(x + (r() - 0.5) * 20, H);
      ctx.stroke();
    }
  }, 0.35);
}

/** Small floating bubbles (underwater). */
export function bubbles(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, n: number, a = 0.5): void {
  for (let i = 0; i < n; i++) {
    const bx = x + r() * w;
    const by = y + r() * h;
    const br = 2 + r() * r() * 12;
    ellipse(ctx, bx, by, br, br);
    ctx.strokeStyle = `rgba(210,250,255,${a * (0.5 + r() * 0.5)})`;
    ctx.lineWidth = Math.max(1, br * 0.2);
    ctx.stroke();
    ellipse(ctx, bx - br * 0.35, by - br * 0.35, br * 0.25, br * 0.25);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  }
}

/** Snow flakes painted into the still frame. */
export function snowfall(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, n: number, a = 0.7, max = 3): void {
  for (let i = 0; i < n; i++) {
    const s = 0.8 + r() * r() * max;
    ellipse(ctx, x + r() * w, y + r() * h, s, s);
    ctx.fillStyle = `rgba(255,255,255,${a * (0.3 + r() * 0.7)})`;
    ctx.fill();
  }
}

/** Soft curved aurora ribbon. */
export function aurora(ctx: Ctx, pts: [number, number][], cols: string[], width: number, a: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    ctx.strokeStyle = rgba(cols[k % cols.length], a * (1 - k * 0.15));
    ctx.lineWidth = width * (1 - k * 0.17);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1] + k * width * 0.18);
    for (let i = 1; i + 2 < pts.length + 1; i += 3)
      ctx.bezierCurveTo(pts[i][0], pts[i][1] + k * width * 0.18, pts[i + 1][0], pts[i + 1][1] + k * width * 0.18, pts[i + 2][0], pts[i + 2][1] + k * width * 0.22);
    ctx.stroke();
  }
  ctx.restore();
}

/** Darken the band where feet travel so busy backgrounds read as backdrop, not foreground. */
export function laneCalm(ctx: Ctx, a: number, y0 = 0, y1 = 700, color = '#000000'): void {
  darkSpot(ctx, VX, (y0 + y1) / 2, 900, (y1 - y0) * 0.75, a, color);
}

/** Additive glow wrapper that keeps code short in scenes. */
export function lamp(ctx: Ctx, x: number, y: number, rr: number, col: string, a: number): void {
  glow(ctx, x, y, rr, col, a);
  glow(ctx, x, y, rr * 0.3, '#ffffff', a * 0.5);
}
