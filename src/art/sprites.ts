// Small procedural sprites: plate, particles, coin, the pizza-peel cursor, cutter, impact bursts.

import { PIZZA_R, TILT } from './pizzaArt';
import { ellipse, makeCanvas, rgba, rng, roundRect, shade } from './util';

const INK = '#2a1810';

export function drawPlate(): HTMLCanvasElement {
  const R = PIZZA_R + 40;
  const w = R * 2 + 40;
  const h = R * 2 * TILT + 60;
  const [c, ctx] = makeCanvas(w, h);
  const cx = w / 2;
  const cy = h / 2 - 6;
  // soft contact shadow
  ctx.save();
  ctx.translate(cx + 6, cy + 18);
  ctx.scale(1, TILT);
  const sg = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.08);
  sg.addColorStop(0, 'rgba(0,0,0,0.45)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ellipse(ctx, 0, 0, R * 1.1, R * 1.1);
  ctx.fill();
  ctx.restore();
  // plate side (thickness)
  ctx.save();
  ctx.translate(cx, cy + 8);
  ctx.scale(1, TILT);
  ellipse(ctx, 0, 0, R, R);
  ctx.fillStyle = '#b9bec8';
  ctx.fill();
  ctx.restore();
  // plate top
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, TILT);
  const g = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.75, '#f1f3f6');
  g.addColorStop(1, '#d5d9e0');
  ellipse(ctx, 0, 0, R, R);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba('#7d8592', 0.8);
  ctx.lineWidth = 3;
  ctx.stroke();
  // inner well
  ellipse(ctx, 0, 0, R * 0.8, R * 0.8);
  ctx.strokeStyle = rgba('#aab0ba', 0.6);
  ctx.lineWidth = 4;
  ctx.stroke();
  // rim highlight
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.92, Math.PI * 1.05, Math.PI * 1.6);
  ctx.strokeStyle = rgba('#ffffff', 0.95);
  ctx.lineWidth = 8;
  ctx.stroke();
  // blue rim stripe
  ellipse(ctx, 0, 0, R * 0.95, R * 0.95);
  ctx.strokeStyle = rgba('#3b6fd6', 0.35);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  return c;
}

/** A square pizza's platter: a white rectangular ceramic dish with rounded corners, the round plate's glaze, well
 * and blue stripe, same size and centre as the round plate so the pizza sits on it the same way. */
export function drawSquarePlate(): HTMLCanvasElement {
  const R = PIZZA_R + 40;
  const w = R * 2 + 40;
  const h = R * 2 * TILT + 60;
  const [c, ctx] = makeCanvas(w, h);
  const cx = w / 2;
  const cy = h / 2 - 6;
  const S = R - 8; // half its side
  const box = (half: number, rad: number) => roundRect(ctx, -half, -half, half * 2, half * 2, rad);
  // soft contact shadow
  ctx.save();
  ctx.translate(cx + 6, cy + 18);
  ctx.scale(1, TILT);
  ctx.filter = 'blur(14px)';
  box(S * 1.02, 46);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
  // its side (thickness)
  ctx.save();
  ctx.translate(cx, cy + 8);
  ctx.scale(1, TILT);
  box(S, 40);
  ctx.fillStyle = '#b9bec8';
  ctx.fill();
  ctx.restore();
  // its top
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, TILT);
  const g = ctx.createRadialGradient(-S * 0.3, -S * 0.4, S * 0.1, 0, 0, S * 1.3);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.7, '#f1f3f6');
  g.addColorStop(1, '#d5d9e0');
  box(S, 40);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba('#7d8592', 0.8);
  ctx.lineWidth = 3;
  ctx.stroke();
  // inner well
  box(S * 0.82, 26);
  ctx.strokeStyle = rgba('#aab0ba', 0.6);
  ctx.lineWidth = 4;
  ctx.stroke();
  // light along the back-left rim
  ctx.beginPath();
  ctx.moveTo(-S * 0.9, S * 0.3);
  ctx.lineTo(-S * 0.9, -S * 0.72);
  ctx.quadraticCurveTo(-S * 0.9, -S * 0.9, -S * 0.72, -S * 0.9);
  ctx.lineTo(S * 0.2, -S * 0.9);
  ctx.strokeStyle = rgba('#ffffff', 0.95);
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();
  // blue rim stripe
  box(S * 0.94, 34);
  ctx.strokeStyle = rgba('#3b6fd6', 0.35);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  return c;
}

function soft(size: number, inner: string, outer: string, stop = 0): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, stop, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function star(size: number, points: number, inner: number, fill: string, stroke?: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  ctx.translate(size / 2, size / 2);
  ctx.beginPath();
  const R = size / 2 - (stroke ? 4 : 1);
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 ? R * inner : R;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  return c;
}

function burst(size: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const r = rng(11);
  ctx.translate(size / 2, size / 2);
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? size * 0.22 : size * (0.38 + r() * 0.1);
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#2a1810';
  ctx.lineWidth = 6;
  ctx.stroke();
  return c;
}

function coin(size: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const s = size / 2;
  ellipse(ctx, s, s + 2, s - 3, s - 3);
  ctx.fillStyle = '#9a6a00';
  ctx.fill();
  ellipse(ctx, s, s, s - 3, s - 3);
  const g = ctx.createRadialGradient(s - 6, s - 8, 2, s, s, s);
  g.addColorStop(0, '#fff6b0');
  g.addColorStop(0.5, '#ffcf3a');
  g.addColorStop(1, '#d48f00');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#7a4a00';
  ctx.lineWidth = 3;
  ctx.stroke();
  ellipse(ctx, s, s, s - 9, s - 9);
  ctx.strokeStyle = rgba('#a86a00', 0.7);
  ctx.lineWidth = 2;
  ctx.stroke();
  // pizza-slice emblem
  ctx.beginPath();
  ctx.moveTo(s, s + s * 0.42);
  ctx.lineTo(s - s * 0.34, s - s * 0.3);
  ctx.quadraticCurveTo(s, s - s * 0.48, s + s * 0.34, s - s * 0.3);
  ctx.closePath();
  ctx.fillStyle = '#c47a00';
  ctx.fill();
  for (const [dx, dy] of [[-0.08, -0.1], [0.1, 0.02], [-0.02, 0.18]]) {
    ellipse(ctx, s + dx * s, s + dy * s, s * 0.07, s * 0.07);
    ctx.fillStyle = '#9a4a00';
    ctx.fill();
  }
  ellipse(ctx, s - s * 0.35, s - s * 0.4, s * 0.22, s * 0.1, -0.6);
  ctx.fillStyle = rgba('#ffffff', 0.7);
  ctx.fill();
  return c;
}

/** The wooden pizza peel used as the player's cursor/weapon. Hotspot = centre of the head. */
export function drawPeel(): { canvas: HTMLCanvasElement; hx: number; hy: number } {
  const w = 220;
  const h = 360;
  const [c, ctx] = makeCanvas(w, h);
  const hx = w / 2;
  const hy = 100;
  const R = 86;
  // handle
  roundRect(ctx, hx - 14, hy + R - 14, 28, 170, 12);
  const hg = ctx.createLinearGradient(hx - 14, 0, hx + 14, 0);
  hg.addColorStop(0, '#7a4a22');
  hg.addColorStop(0.45, '#d9a066');
  hg.addColorStop(1, '#6a3c18');
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.stroke();
  ellipse(ctx, hx, hy + R + 140, 9, 6);
  ctx.fillStyle = '#2a1810';
  ctx.fill();
  // head
  ctx.beginPath();
  ctx.arc(hx, hy, R, Math.PI * 0.62, Math.PI * 2.38);
  ctx.lineTo(hx + 18, hy + R + 8);
  ctx.lineTo(hx - 18, hy + R + 8);
  ctx.closePath();
  const g = ctx.createRadialGradient(hx - 30, hy - 36, 10, hx, hy, R * 1.1);
  g.addColorStop(0, '#f6cf94');
  g.addColorStop(0.7, '#d9a066');
  g.addColorStop(1, '#a8703a');
  ctx.fillStyle = g;
  ctx.fill();
  // grain
  ctx.save();
  ctx.clip();
  const r = rng(5);
  ctx.strokeStyle = rgba('#7a4a22', 0.35);
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const x = hx - R + i * 13 + r() * 6;
    ctx.beginPath();
    ctx.moveTo(x, hy - R);
    ctx.bezierCurveTo(x + 10, hy - 20, x - 10, hy + 20, x + 4, hy + R + 10);
    ctx.stroke();
  }
  // flour dusting
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = rgba('#ffffff', 0.25 * r());
    ellipse(ctx, hx + (r() - 0.5) * R * 1.6, hy + (r() - 0.5) * R * 1.6, 2 + r() * 4, 2 + r() * 3);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(hx, hy, R, Math.PI * 0.62, Math.PI * 2.38);
  ctx.lineTo(hx + 18, hy + R + 8);
  ctx.lineTo(hx - 18, hy + R + 8);
  ctx.closePath();
  ctx.stroke();
  ellipse(ctx, hx - 30, hy - 40, 26, 12, -0.6);
  ctx.fillStyle = rgba('#ffffff', 0.3);
  ctx.fill();
  return { canvas: c, hx, hy };
}

function cutter(size: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const s = size / 2;
  ellipse(ctx, s, s, s - 4, s - 4);
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, '#c7ccd4');
  g.addColorStop(0.6, '#8a929e');
  g.addColorStop(1, '#e8edf2');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ellipse(ctx, s, s, s - 12, s - 12);
  ctx.strokeStyle = rgba('#5b626c', 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(s + Math.cos(a) * 12, s + Math.sin(a) * 12);
    ctx.lineTo(s + Math.cos(a) * (s - 14), s + Math.sin(a) * (s - 14));
    ctx.strokeStyle = rgba('#5b626c', 0.5);
    ctx.stroke();
  }
  ellipse(ctx, s, s, 11, 11);
  ctx.fillStyle = '#e5242f';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  return c;
}

function crumb(size: number, col: string, seed: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const r = rng(seed);
  ctx.beginPath();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = (size / 2 - 2) * (0.6 + r() * 0.4);
    ctx.lineTo(size / 2 + Math.cos(a) * rr, size / 2 + Math.sin(a) * rr);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(size * 0.4, size * 0.4, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, shade(col, 0.3));
  g.addColorStop(1, shade(col, -0.25));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(shade(col, -0.6), 0.8);
  ctx.lineWidth = 2;
  ctx.stroke();
  return c;
}

function pepperoni(size: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const s = size / 2;
  ellipse(ctx, s, s, s - 2, s - 2);
  const g = ctx.createRadialGradient(s - 3, s - 3, 1, s, s, s);
  g.addColorStop(0, '#e2553a');
  g.addColorStop(1, '#8a1a0a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = rgba('#5a1206', 0.5);
  ellipse(ctx, s + 3, s - 2, 2, 2);
  ctx.fill();
  ellipse(ctx, s - 4, s + 4, 2.5, 2);
  ctx.fill();
  return c;
}

function sweat(size: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size * 1.4);
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(s, 2);
  ctx.bezierCurveTo(s + s * 0.9, size * 0.7, s + s * 0.8, size * 1.35, s, size * 1.35);
  ctx.bezierCurveTo(s - s * 0.8, size * 1.35, s - s * 0.9, size * 0.7, s, 2);
  ctx.fillStyle = '#8fd3ff';
  ctx.fill();
  ctx.strokeStyle = '#2a6aa0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, s - 3, size * 0.9, 2, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  return c;
}

function flame(size: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size * 1.4);
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.bezierCurveTo(s + s, size * 0.6, s + s * 0.8, size * 1.38, s, size * 1.38);
  ctx.bezierCurveTo(s - s * 0.8, size * 1.38, s - s, size * 0.6, s, 0);
  const g = ctx.createRadialGradient(s, size, 1, s, size * 0.9, size * 0.8);
  g.addColorStop(0, '#fff6a0');
  g.addColorStop(0.4, '#ffb21c');
  g.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = g;
  ctx.fill();
  return c;
}

function shard(size: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size * 0.8, size / 2);
  ctx.lineTo(size / 2, size);
  ctx.lineTo(size * 0.2, size / 2);
  ctx.closePath();
  ctx.fillStyle = '#dff3ff';
  ctx.fill();
  ctx.strokeStyle = '#6aa8d8';
  ctx.lineWidth = 2;
  ctx.stroke();
  return c;
}

function ring(size: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  ellipse(ctx, size / 2, size / 2, size / 2 - 6, size / 2 - 6);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.stroke();
  return c;
}

function olive(size: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const s = size / 2;
  ellipse(ctx, s, s, s - 3, s * 0.78);
  const g = ctx.createRadialGradient(s - 4, s - 4, 1, s, s, s);
  g.addColorStop(0, '#9fbf4a');
  g.addColorStop(1, '#3f5a12');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ellipse(ctx, s + 4, s, 5, 4);
  ctx.fillStyle = '#e5242f';
  ctx.fill();
  return c;
}

function blush(size: number): HTMLCanvasElement {
  return soft(size, 'rgba(255,40,40,0.75)', 'rgba(255,40,40,0)', size * 0.1);
}

function shadow(w: number, h: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w, h);
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  g.addColorStop(0, 'rgba(20,8,4,0.85)');
  g.addColorStop(0.6, 'rgba(20,8,4,0.45)');
  g.addColorStop(1, 'rgba(20,8,4,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -w / 2, w, w);
  return c;
}

function cheeseString(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(16, 48);
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.quadraticCurveTo(2, 24, 8, 46);
  ctx.quadraticCurveTo(14, 24, 12, 0);
  ctx.closePath();
  ctx.fillStyle = '#f9df8a';
  ctx.fill();
  ctx.strokeStyle = '#c4862a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  return c;
}

function vignette(w: number, h: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.35, w / 2, h * 0.55, h * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,4,2,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return c;
}

/** A pizza's shield: a force-field dome over it (the table's perspective squashes it), its edge brighter than its
 * middle like a bubble, a fine hex lattice catching the light, and its base ring on the table. 460 × 300; the pizza's
 * centre sits at (230, 230). */
function cheeseShield(square = false): HTMLCanvasElement {
  // it stands on the plate (just inside its rim) and covers every pizza shape, deep dish included; a square pizza's
  // is a rounded box standing on its platter (upright sides, a rounded lid) so its corners are inside too
  const W = 480;
  const H = 366;
  const cx = 240;
  const cy = 240;
  const R = 222;
  const RY = R * 0.92;
  // the base sits on the table in the pizza's own perspective (as squashed as the pizza is)
  const RB = R * TILT;
  const CR = 40; // a square base's corner radius (before the squash)
  const [c, ctx] = makeCanvas(W, H);
  // the base outline: a full ellipse, or a rounded square, in perspective
  const base = () => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, TILT);
    if (square) roundRect(ctx, -R, -R, R * 2, R * 2, CR);
    else ellipse(ctx, 0, 0, R, R);
    ctx.restore();
  };
  // the lid's outline over the top, left to right: a half ellipse, or a squarish arch (a superellipse) for the box
  const SIDE = RB - CR * TILT; // where a box's upright side meets its front corner
  const lid = () => {
    if (!square) {
      ctx.ellipse(cx, cy, R, RY, 0, Math.PI, 0);
      return;
    }
    ctx.moveTo(cx - R, cy + SIDE);
    for (let k = 0; k <= 48; k++) {
      const a = Math.PI + (Math.PI * k) / 48;
      const co = Math.cos(a);
      const si = Math.sin(a);
      ctx.lineTo(cx + Math.sign(co) * R * Math.abs(co) ** 0.45, cy + Math.sign(si) * RY * 0.86 * Math.abs(si) ** 0.45);
    }
    ctx.lineTo(cx + R, cy + SIDE);
  };
  // the front of the base, right to left (closes the outline)
  const front = () => {
    if (!square) {
      ctx.ellipse(cx, cy, R, RB, 0, 0, Math.PI);
      return;
    }
    const ry = CR * TILT;
    ctx.ellipse(cx + R - CR, cy + SIDE, CR, ry, 0, 0, Math.PI / 2);
    ctx.lineTo(cx - R + CR, cy + RB);
    ctx.ellipse(cx - R + CR, cy + SIDE, CR, ry, 0, Math.PI / 2, Math.PI);
  };
  const dome = () => {
    ctx.beginPath();
    lid();
    front();
    ctx.closePath();
  };
  // the field: clear in the middle, brighter towards its edge (looking through more of it there)
  ctx.save();
  dome();
  ctx.clip();
  const g = ctx.createRadialGradient(cx, cy - 20, R * 0.35, cx, cy, R * (square ? 1.12 : 1));
  g.addColorStop(0, 'rgba(40,200,255,0.1)');
  g.addColorStop(0.7, 'rgba(30,190,255,0.24)');
  g.addColorStop(0.92, 'rgba(70,220,255,0.6)');
  g.addColorStop(1, 'rgba(190,250,255,0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // the hex lattice, faint
  ctx.strokeStyle = 'rgba(120,235,255,0.32)';
  ctx.lineWidth = 1.6;
  const hs = 22;
  for (let row = -1; row * hs * 0.87 < H; row++) {
    for (let col = -1; col * hs * 1.5 < W; col++) {
      const x = col * hs * 1.5;
      const y = row * hs * 1.73 + (col % 2 ? hs * 0.87 : 0);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        const px = x + Math.cos(a) * hs * 0.98;
        const py = y + Math.sin(a) * hs * 0.98 * 0.8;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  // the light catching it top left
  const hl = ctx.createRadialGradient(cx - R * 0.45, cy - RY * 0.7, 4, cx - R * 0.45, cy - RY * 0.7, R * 0.5);
  hl.addColorStop(0, 'rgba(220,250,255,0.4)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // its outline glowing: a wide soft line under a crisp one
  const outline = () => {
    ctx.beginPath();
    lid();
  };
  ctx.save();
  ctx.shadowColor = 'rgba(60,220,255,0.95)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(90,225,255,0.9)';
  ctx.lineWidth = 5;
  outline();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(230,253,255,0.95)';
  ctx.lineWidth = 2;
  outline();
  ctx.stroke();
  // the base ring: its back faint (seen through the field), its front bright
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, cy);
  ctx.clip();
  base();
  ctx.strokeStyle = 'rgba(110,230,255,0.35)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, cy, W, H - cy);
  ctx.clip();
  base();
  ctx.shadowColor = 'rgba(60,220,255,0.9)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(110,230,255,0.9)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  return c;
}

/** A thin bright band that sweeps across a shield's dome now and then (the field's shimmer). */
function shieldSweep(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(60, 366);
  const g = ctx.createLinearGradient(0, 0, 60, 0);
  g.addColorStop(0, 'rgba(200,250,255,0)');
  g.addColorStop(0.5, 'rgba(230,253,255,0.55)');
  g.addColorStop(1, 'rgba(200,250,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 60, 366);
  return c;
}

function mousetrap(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 60);
  roundRect(ctx, 6, 18, 108, 36, 6);
  ctx.fillStyle = '#d9a066';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = '#9aa3ad';
  ctx.lineWidth = 5;
  roundRect(ctx, 22, 8, 76, 34, 6);
  ctx.stroke();
  ellipse(ctx, 92, 36, 9, 7);
  ctx.fillStyle = '#ffd34d';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  return c;
}

function eye(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(44, 52);
  ellipse(ctx, 22, 26, 18, 22);
  const g = ctx.createRadialGradient(16, 18, 2, 22, 26, 24);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#e4e8ee');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  return c;
}

function pupil(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(22, 22);
  ellipse(ctx, 11, 11, 9, 9);
  ctx.fillStyle = '#1b1210';
  ctx.fill();
  ellipse(ctx, 8, 7, 3, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  return c;
}

function squint(dir: 1 | -1): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(40, 36);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(20 - dir * 14, 6);
  ctx.lineTo(20 + dir * 12, 18);
  ctx.lineTo(20 - dir * 14, 30);
  ctx.stroke();
  return c;
}

function mouth(kind: 'smile' | 'o' | 'wobble'): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(48, 30);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  if (kind === 'smile') {
    ctx.beginPath();
    ctx.arc(24, 4, 14, 0.35, Math.PI - 0.35);
    ctx.stroke();
  } else if (kind === 'o') {
    ellipse(ctx, 24, 15, 9, 11);
    ctx.fillStyle = '#5a1206';
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(6, 16);
    for (let x = 6; x <= 42; x += 6) ctx.lineTo(x, 16 + ((x / 6) % 2 ? -5 : 5));
    ctx.stroke();
  }
  return c;
}

export function buildSprites(): Record<string, HTMLCanvasElement> {
  const peel = drawPeel();
  return {
    plate: drawPlate(),
    plateSquare: drawSquarePlate(),
    soft: soft(64, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
    glow: soft(256, 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)', 4),
    star: star(64, 4, 0.32, '#ffffff'),
    star5: star(56, 5, 0.45, '#ffe066', INK),
    burst: burst(200),
    coin: coin(48),
    peel: peel.canvas,
    cutter: cutter(84),
    crumb: crumb(24, '#d9963f', 3),
    crumb2: crumb(18, '#f7d77c', 9),
    pep: pepperoni(30),
    sweat: sweat(18),
    flame: flame(40),
    shard: shard(28),
    ring: ring(256),
    olive: olive(34),
    blush: blush(96),
    shadow: shadow(300, 110),
    cheese: cheeseString(),
    vignette: vignette(960, 540),
    shield: cheeseShield(),
    shieldSquare: cheeseShield(true),
    shieldSweep: shieldSweep(),
    trap: mousetrap(),
    eye: eye(),
    pupil: pupil(),
    squintL: squint(1),
    squintR: squint(-1),
    mouthSmile: mouth('smile'),
    mouthO: mouth('o'),
    mouthWobble: mouth('wobble'),
    confetti: (() => {
      const [c, ctx] = makeCanvas(14, 8);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 14, 8);
      return c;
    })(),
  };
}

export const PEEL_HOTSPOT = { x: 110 / 220, y: 100 / 360 };
