// Shared helpers for drawing feet (design space: centre x = 110, toes at the bottom).

import type { FootArt } from '../data/feet';
import { type Ctx, ellipse, mix, rgba, shade } from './util';

export const CX = 110;
export const OUT = 5.5; // outline width
export const INK = '#2a1810';

export interface Toe {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export function toesFor(art: FootArt): Toe[] {
  const c = art.chubby ? 1.15 : 1;
  return [
    { cx: 34, cy: 212, rx: 19 * c, ry: 22 * c },
    { cx: 70, cy: 224, rx: 21.5 * c, ry: 26 * c },
    { cx: 106, cy: 231, rx: 23 * c, ry: 28 * c },
    { cx: 144, cy: 233, rx: 25 * c, ry: 30 * c },
    { cx: 186, cy: 230, rx: 32 * c, ry: 35 * c },
  ];
}

export function outlineOf(base: string): string {
  return mix(shade(base, -0.62), INK, 0.45);
}

/** Bare foot body silhouette. When open=true the top edge is left open so the stroke doesn't cross the ankle. */
export function barePath(ctx: Ctx, art: FootArt, open = false): void {
  const w = art.chubby ? 6 : 0;
  ctx.beginPath();
  ctx.moveTo(56, -6);
  ctx.bezierCurveTo(54, 58, 16 - w, 104, 18 - w, 168);
  ctx.bezierCurveTo(19 - w, 198, 30, 214, 50, 220);
  ctx.lineTo(182, 226);
  ctx.bezierCurveTo(206 + w, 216, 213 + w, 190, 211 + w, 158);
  ctx.bezierCurveTo(207 + w, 98, 168, 58, 164, -6);
  if (!open) ctx.closePath();
}

export function skinBodyFill(ctx: Ctx, skin: string): CanvasGradient {
  const g = ctx.createLinearGradient(14, 0, 214, 0);
  g.addColorStop(0, shade(skin, -0.28));
  g.addColorStop(0.28, shade(skin, -0.04));
  g.addColorStop(0.55, shade(skin, 0.12));
  g.addColorStop(0.8, shade(skin, -0.02));
  g.addColorStop(1, shade(skin, -0.3));
  return g;
}

export function drawBareBody(ctx: Ctx, art: FootArt, r: () => number): void {
  const skin = art.skin;
  const ol = outlineOf(skin);
  barePath(ctx, art);
  ctx.fillStyle = skinBodyFill(ctx, skin);
  ctx.fill();
  // soft top-light + toe shadow inside body
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  const hl = ctx.createRadialGradient(118, 70, 4, 118, 80, 95);
  hl.addColorStop(0, rgba('#ffffff', 0.32));
  hl.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = hl;
  ctx.fillRect(0, -10, 230, 240);
  const sh = ctx.createLinearGradient(0, 150, 0, 228);
  sh.addColorStop(0, rgba(shade(skin, -0.5), 0));
  sh.addColorStop(1, rgba(shade(skin, -0.5), 0.35));
  ctx.fillStyle = sh;
  ctx.fillRect(0, 150, 230, 80);
  // tendons
  ctx.strokeStyle = rgba(shade(skin, 0.35), 0.5);
  ctx.lineWidth = 3.5;
  for (const [x0, x1] of [[96, 70], [110, 104], [124, 140], [136, 178]]) {
    ctx.beginPath();
    ctx.moveTo(x0, 30);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 4, 120, x1, 196);
    ctx.stroke();
  }
  // vein
  ctx.strokeStyle = rgba(mix(skin, '#6a7fd0', 0.5), 0.22);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, 40);
  ctx.bezierCurveTo(90, 90, 70, 120, 92, 160);
  ctx.stroke();
  if (art.zombie) {
    // rot patches + stitches
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = rgba('#4d5e3a', 0.35 + r() * 0.2);
      ellipse(ctx, 40 + r() * 140, 30 + r() * 150, 10 + r() * 16, 8 + r() * 12, r());
      ctx.fill();
    }
    ctx.strokeStyle = '#2b2a22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 120);
    ctx.quadraticCurveTo(110, 100, 170, 132);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const x = 60 + t * 110;
      const y = 120 - Math.sin(t * Math.PI) * 14 + t * 12;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 8);
      ctx.lineTo(x + 3, y + 8);
      ctx.stroke();
    }
    // bandage band at ankle
    ctx.fillStyle = '#e8e0c8';
    ctx.beginPath();
    ctx.moveTo(40, 18);
    ctx.lineTo(190, 6);
    ctx.lineTo(190, 34);
    ctx.lineTo(40, 48);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba('#8a7d5c', 0.7);
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(50 + i * 30, 44 - i * 2.4);
      ctx.lineTo(70 + i * 30, 12 - i * 2.4);
      ctx.stroke();
    }
  }
  if (art.stink) {
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = rgba('#5d5a22', 0.12 + r() * 0.15);
      ellipse(ctx, 30 + r() * 170, 40 + r() * 170, 4 + r() * 9, 3 + r() * 6, r() * 3);
      ctx.fill();
    }
  }
  if (art.hair) drawHair(ctx, r, 30, 10, 170, 170, shade(skin, -0.6), 70);
  ctx.restore();
  barePath(ctx, art, true);
  ctx.strokeStyle = ol;
  ctx.lineWidth = OUT;
  ctx.stroke();
  // ankle bones
  ctx.strokeStyle = rgba(ol, 0.45);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(58, 34, 12, -0.6, 1.0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(162, 38, 12, Math.PI - 1.0, Math.PI + 0.6);
  ctx.stroke();
}

export function drawHair(ctx: Ctx, r: () => number, x: number, y: number, w: number, h: number, col: string, n: number): void {
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const hx = x + r() * w;
    const hy = y + r() * h;
    const a = Math.PI / 2 + (r() - 0.5) * 1.6;
    const len = 6 + r() * 10;
    ctx.lineWidth = 1.4 + r() * 1.4;
    ctx.globalAlpha = 0.5 + r() * 0.5;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx + Math.cos(a) * len * 0.5 + 3, hy + Math.sin(a) * len * 0.5, hx + Math.cos(a) * len, hy + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawToe(ctx: Ctx, t: Toe, fill: string, opts: { nail?: string | null; ol?: string; hair?: boolean; claw?: boolean; r?: () => number; lw?: number; stripe?: string }): void {
  const ol = opts.ol ?? outlineOf(fill);
  ellipse(ctx, t.cx, t.cy, t.rx, t.ry);
  const g = ctx.createRadialGradient(t.cx - t.rx * 0.35, t.cy - t.ry * 0.45, 1, t.cx, t.cy, t.ry * 1.15);
  g.addColorStop(0, shade(fill, 0.22));
  g.addColorStop(0.55, fill);
  g.addColorStop(1, shade(fill, -0.22));
  ctx.fillStyle = g;
  ctx.fill();
  if (opts.stripe) {
    ctx.save();
    ellipse(ctx, t.cx, t.cy, t.rx, t.ry);
    ctx.clip();
    ctx.fillStyle = opts.stripe;
    ctx.fillRect(t.cx - t.rx, t.cy - t.ry * 0.1, t.rx * 2, t.ry * 0.28);
    ctx.restore();
  }
  ctx.strokeStyle = ol;
  ctx.lineWidth = opts.lw ?? OUT;
  ctx.stroke();
  // knuckle crease
  ctx.strokeStyle = rgba(ol, 0.45);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(t.cx, t.cy - t.ry * 0.62, t.rx * 0.45, 0.35, Math.PI - 0.35);
  ctx.stroke();
  if (opts.claw) {
    ctx.beginPath();
    ctx.moveTo(t.cx - t.rx * 0.55, t.cy + t.ry * 0.2);
    ctx.quadraticCurveTo(t.cx, t.cy + t.ry * 1.75, t.cx + t.rx * 0.2, t.cy + t.ry * 1.55);
    ctx.quadraticCurveTo(t.cx + t.rx * 0.6, t.cy + t.ry * 0.9, t.cx + t.rx * 0.55, t.cy + t.ry * 0.2);
    ctx.closePath();
    const cg = ctx.createLinearGradient(t.cx, t.cy, t.cx, t.cy + t.ry * 1.6);
    cg.addColorStop(0, '#efe3c0');
    cg.addColorStop(1, '#6b5a3a');
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = '#2b1a10';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (opts.nail !== null) {
    const nx = t.cx + t.rx * 0.05;
    const ny = t.cy + t.ry * 0.3;
    const nrx = t.rx * 0.58;
    const nry = t.ry * 0.46;
    ellipse(ctx, nx, ny, nrx, nry);
    const nailCol = opts.nail ?? mix(fill, '#fff4ee', 0.62);
    const ng = ctx.createLinearGradient(nx, ny - nry, nx, ny + nry);
    ng.addColorStop(0, shade(nailCol, 0.18));
    ng.addColorStop(1, shade(nailCol, -0.12));
    ctx.fillStyle = ng;
    ctx.fill();
    ctx.strokeStyle = rgba(outlineOf(nailCol), 0.75);
    ctx.lineWidth = 2;
    ctx.stroke();
    ellipse(ctx, nx - nrx * 0.32, ny - nry * 0.35, nrx * 0.32, nry * 0.22, -0.4);
    ctx.fillStyle = rgba('#ffffff', opts.nail ? 0.75 : 0.55);
    ctx.fill();
  }
  if (opts.hair && opts.r) drawHair(ctx, opts.r, t.cx - t.rx * 0.6, t.cy - t.ry * 0.8, t.rx * 1.2, t.ry * 0.5, shade(fill, -0.6), 6);
}

export function drawBare(ctx: Ctx, art: FootArt, r: () => number): void {
  drawBareBody(ctx, art, r);
  const toes = toesFor(art);
  for (const t of toes) drawToe(ctx, t, art.skin, { nail: art.nails, hair: art.hair, r });
}

export function drawSock(ctx: Ctx, art: FootArt, r: () => number, toeSock: boolean): void {
  const base = art.primary!;
  const acc = art.secondary!;
  const ol = outlineOf(base);
  barePath(ctx, art);
  ctx.fillStyle = skinBodyFill(ctx, base);
  ctx.fill();
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  if (toeSock) {
    const cols = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#3ddc97', '#4cc9f0', '#7b5cff'];
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = rgba(cols[i % cols.length], 0.85);
      ctx.fillRect(0, -6 + i * 26, 230, 13);
    }
  } else if (art.argyle) {
    argyle(ctx, acc, 0, -6, 230, 236);
  } else {
    ctx.fillStyle = acc;
    ctx.fillRect(0, 4, 230, 14);
    ctx.fillRect(0, 26, 230, 7);
  }
  // knit ribbing
  ctx.strokeStyle = rgba('#000000', 0.06);
  ctx.lineWidth = 2;
  for (let x = 10; x < 220; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.lineTo(x, 230);
    ctx.stroke();
  }
  const hl = ctx.createRadialGradient(118, 80, 4, 118, 90, 100);
  hl.addColorStop(0, rgba('#ffffff', 0.25));
  hl.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = hl;
  ctx.fillRect(0, -10, 230, 240);
  if (!toeSock) {
    // sweat patches
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = rgba('#b9a77a', 0.18);
      ellipse(ctx, 40 + r() * 140, 120 + r() * 80, 14 + r() * 14, 10 + r() * 8, r());
      ctx.fill();
    }
  }
  ctx.restore();
  barePath(ctx, art, true);
  ctx.strokeStyle = ol;
  ctx.lineWidth = OUT;
  ctx.stroke();
  const toes = toesFor(art);
  const cols = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#3ddc97', '#4cc9f0'];
  toes.forEach((t, i) => {
    const fill = toeSock ? cols[i] : mix(acc, '#000000', 0.05);
    drawToe(ctx, { ...t, ry: t.ry * 0.95 }, fill, { nail: null, ol: outlineOf(fill) });
  });
  if (!toeSock) {
    // toe seam
    ctx.strokeStyle = rgba(shade(acc, -0.5), 0.5);
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(26, 200);
    ctx.quadraticCurveTo(110, 214, 204, 206);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function shoePath(ctx: Ctx, opts: { bottom: number; width: number; open?: boolean; pointed?: boolean }): void {
  const { bottom, width } = opts;
  const l = CX - width;
  const rr = CX + width;
  ctx.beginPath();
  ctx.moveTo(52, -6);
  ctx.bezierCurveTo(50, 60, l + 4, 100, l, 168);
  if (opts.pointed) {
    ctx.bezierCurveTo(l + 2, 214, CX - 30, bottom - 10, CX + 6, bottom);
    ctx.bezierCurveTo(CX + 40, bottom - 14, rr - 2, 214, rr, 168);
  } else {
    ctx.bezierCurveTo(l - 2, bottom - 16, CX - 50, bottom, CX, bottom);
    ctx.bezierCurveTo(CX + 50, bottom, rr + 2, bottom - 16, rr, 168);
  }
  ctx.bezierCurveTo(rr - 4, 100, 170, 60, 168, -6);
  if (!opts.open) ctx.closePath();
}

export function leatherFill(ctx: Ctx, col: string): CanvasGradient {
  const g = ctx.createLinearGradient(10, 0, 220, 0);
  g.addColorStop(0, shade(col, -0.35));
  g.addColorStop(0.35, shade(col, 0.05));
  g.addColorStop(0.5, shade(col, 0.22));
  g.addColorStop(0.7, col);
  g.addColorStop(1, shade(col, -0.38));
  return g;
}

export function glossy(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.35): void {
  const g = ctx.createRadialGradient(x, y, 1, x, y, Math.max(rx, ry));
  g.addColorStop(0, rgba('#ffffff', a));
  g.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = g;
  ellipse(ctx, x, y, rx, ry);
  ctx.fill();
}

export function laces(ctx: Ctx, top: number, bottom: number, col: string, n: number, half = 22): void {
  const step = (bottom - top) / n;
  for (let i = 0; i < n; i++) {
    const y = top + i * step + step * 0.3;
    // eyelets
    for (const sx of [-1, 1]) {
      ellipse(ctx, CX + sx * half, y, 4.5, 4.5);
      ctx.fillStyle = '#d9dde3';
      ctx.fill();
      ctx.strokeStyle = '#3a3f47';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const y0 = top + i * step + step * 0.3;
    const y1 = y0 + step;
    for (const [a, b] of [[-1, 1], [1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(CX + a * half, y0);
      ctx.lineTo(CX + b * half, y1);
      ctx.strokeStyle = outlineOf(col);
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
  }
}

export function argyle(ctx: Ctx, acc: string, x: number, y: number, w: number, h: number): void {
  const dw = 34;
  const dh = 46;
  for (let row = 0; (row * dh) / 2 < h + dh; row++) {
    for (let col = -1; col * dw < w + dw; col++) {
      if (row % 2) continue;
      const cx = x + col * dw;
      const cy = y + (row * dh) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - dh / 2);
      ctx.lineTo(cx + dw / 2, cy);
      ctx.lineTo(cx, cy + dh / 2);
      ctx.lineTo(cx - dw / 2, cy);
      ctx.closePath();
      ctx.fillStyle = (row / 2 + col) % 2 ? rgba(acc, 0.85) : rgba(shade(acc, -0.6), 0.35);
      ctx.fill();
    }
  }
  ctx.strokeStyle = rgba('#ffffff', 0.5);
  ctx.lineWidth = 1.5;
  for (let i = -10; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * dw, y);
    ctx.lineTo(x + i * dw + h * (dw / dh), y + h);
    ctx.moveTo(x + i * dw, y);
    ctx.lineTo(x + i * dw - h * (dw / dh), y + h);
    ctx.stroke();
  }
}
