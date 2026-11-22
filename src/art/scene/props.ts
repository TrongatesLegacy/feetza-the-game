// Props for the location kit: small things a scene sets about (bottles, lamps, flames, pots, rope and chain), each
// one silhouette lit by the one light, with its material and one outline.

import { LIGHT, spec } from '../style/kit';
import { type Ctx, mix, rgba, shade } from '../util';
import { type Air, type R, castShadow, ellPath, glassStreak, groundShadow, lightPool, lineAt, rim, solid, within } from './kit';

/** A glass bottle standing at (x, y = its base): dark translucent glass, the light's streak down its left shoulder,
 * a cool rim on the right, the table showing through the low edge. kind sets the shape. */
export function bottle(ctx: Ctx, x: number, y: number, h: number, glass: string, o: { kind?: 'wine' | 'oil' | 'jar' | 'flask'; label?: string; cork?: string; depth?: number; air?: Air; straw?: boolean; shadow?: boolean } = {}): void {
  const kind = o.kind ?? 'wine';
  const w = kind === 'jar' ? h * 0.62 : kind === 'flask' ? h * 0.5 : kind === 'oil' ? h * 0.3 : h * 0.26;
  const neckW = kind === 'jar' ? w * 0.8 : w * 0.34;
  const shoulder = kind === 'jar' ? h * 0.12 : kind === 'flask' ? h * 0.55 : h * 0.42;
  const top = y - h;
  const path = (c: Ctx) => {
    c.beginPath();
    if (kind === 'flask') {
      // a round-bellied chianti fiasco
      c.moveTo(x - neckW / 2, top);
      c.lineTo(x - neckW / 2, y - h * 0.5);
      c.bezierCurveTo(x - w * 0.7, y - h * 0.46, x - w * 0.62, y, x, y);
      c.bezierCurveTo(x + w * 0.62, y, x + w * 0.7, y - h * 0.46, x + neckW / 2, y - h * 0.5);
      c.lineTo(x + neckW / 2, top);
      c.closePath();
      return;
    }
    c.moveTo(x - neckW / 2, top);
    c.lineTo(x - neckW / 2, top + h - shoulder - h * 0.12);
    c.quadraticCurveTo(x - w / 2, top + h - shoulder - h * 0.05, x - w / 2, top + h - shoulder + h * 0.06);
    c.lineTo(x - w / 2, y - 4);
    c.quadraticCurveTo(x - w / 2, y, x - w / 2 + 4, y);
    c.lineTo(x + w / 2 - 4, y);
    c.quadraticCurveTo(x + w / 2, y, x + w / 2, y - 4);
    c.lineTo(x + w / 2, top + h - shoulder + h * 0.06);
    c.quadraticCurveTo(x + w / 2, top + h - shoulder - h * 0.05, x + neckW / 2, top + h - shoulder - h * 0.12);
    c.lineTo(x + neckW / 2, top);
    c.closePath();
  };
  const depth = o.depth ?? 0.2;
  if (o.shadow !== false) groundShadow(ctx, x + w * 0.2, y, w * 0.7, Math.max(3, w * 0.16), 0.4);
  solid(ctx, path, { x: x - w / 2, y: top, w, h }, 'plastic', glass, { depth, air: o.air, spec: false, formSize: w * 0.3, form: 0.7 });
  within(ctx, path, () => {
    // the liquid line and the darker core
    ctx.fillStyle = rgba(shade(glass, -0.5), 0.35);
    ctx.fillRect(x - w * 0.18, top + h * 0.3, w * 0.36, h * 0.7);
    if (o.straw) {
      // the straw basket of a fiasco
      ctx.fillStyle = '#c89a52';
      ctx.fillRect(x - w, y - h * 0.4, w * 2, h * 0.4);
      ctx.strokeStyle = rgba('#7a5420', 0.6);
      ctx.lineWidth = 1.2;
      for (let k = -w; k < w; k += 4) {
        ctx.beginPath();
        ctx.moveTo(x + k, y - h * 0.4);
        ctx.lineTo(x + k + 3, y);
        ctx.stroke();
      }
      const g = ctx.createLinearGradient(x - w * 0.6, 0, x + w * 0.6, 0);
      g.addColorStop(0, rgba(LIGHT.key, 0.25));
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(40,20,6,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(x - w, y - h * 0.4, w * 2, h * 0.4);
      ctx.fillStyle = 'rgba(90,50,14,0.7)';
      ctx.fillRect(x - w, y - h * 0.41, w * 2, 3);
    }
    if (o.label) {
      ctx.fillStyle = o.label;
      ctx.fillRect(x - w / 2, y - h * 0.36, w, h * 0.2);
      ctx.fillStyle = rgba('#000000', 0.15);
      ctx.fillRect(x + w * 0.1, y - h * 0.36, w * 0.4, h * 0.2);
    }
  });
  rim(ctx, path, 0.55, 2);
  glassStreak(ctx, x - w * 0.28, top + h * 0.5, x - w * 0.24, y - h * 0.12, Math.max(1.2, w * 0.07), 0.6);
  glassStreak(ctx, x - neckW * 0.2, top + 4, x - neckW * 0.2, top + h * 0.3, Math.max(1, neckW * 0.12), 0.45);
  if (o.cork) {
    ctx.beginPath();
    ctx.roundRect(x - neckW * 0.46, top - h * 0.06, neckW * 0.92, h * 0.08, 2);
    ctx.fillStyle = o.cork;
    ctx.fill();
    ctx.strokeStyle = rgba('#2a1408', 0.8);
    ctx.lineWidth = lineAt(depth) * 0.6;
    ctx.stroke();
  }
}

/** A teardrop flame (painted still; live layers use their own flickering sprites). */
export function flameShape(ctx: Ctx, x: number, y: number, w: number, h: number, cols: [string, string, string] = ['#ff7a1a', '#ffc23a', '#fff6d0'], lean = 0): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lobe = (k: number, col: string, a: number) => {
    const ww = w * k;
    const hh = h * k;
    ctx.beginPath();
    ctx.moveTo(x - ww / 2, y);
    ctx.bezierCurveTo(x - ww * 0.6, y - hh * 0.5, x - ww * 0.1 + lean * hh * 0.3, y - hh * 0.7, x + lean * hh, y - hh);
    ctx.bezierCurveTo(x + ww * 0.1 + lean * hh * 0.3, y - hh * 0.7, x + ww * 0.6, y - hh * 0.5, x + ww / 2, y);
    ctx.quadraticCurveTo(x, y + ww * 0.3, x - ww / 2, y);
    ctx.fillStyle = rgba(col, a);
    ctx.fill();
  };
  lobe(1, cols[0], 0.75);
  lobe(0.7, cols[1], 0.85);
  lobe(0.4, cols[2], 0.95);
  ctx.restore();
}

/** A candle (wax stub with drips) with its flame and halo. */
export function candle(ctx: Ctx, x: number, y: number, h: number, wax = '#f4ead2', lit = true): void {
  const w = h * 0.34;
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.lineTo(x - w / 2, y - h + 3);
    c.quadraticCurveTo(x, y - h - 3, x + w / 2, y - h + 3);
    c.lineTo(x + w / 2, y);
    c.closePath();
  };
  solid(ctx, path, { x: x - w / 2, y: y - h, w, h }, 'plastic', wax, { line: 2, form: 0.4, formSize: w * 0.3, spec: false });
  // drips
  ctx.fillStyle = shade(wax, 0.05);
  for (const [dx, len] of [[-0.3, 0.35], [0.2, 0.55], [0.42, 0.25]] as const) {
    ctx.beginPath();
    ctx.ellipse(x + dx * w, y - h + len * h * 0.5, w * 0.1, len * h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#2a1408';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + 1, y - h - 6);
  ctx.stroke();
  if (lit) {
    lightPool(ctx, x, y - h - 14, 70, 70, '#ffb04a', 0.35);
    flameShape(ctx, x, y - h - 3, 10, 26);
  }
}

/** A pendant lamp hanging from (x, y0) with its shade's rim at y: an enamel shade, a brass fitting and a bulb.
 * lit lays its glow. Returns the shade's path (to cast its shadow). */
export function pendantLamp(ctx: Ctx, x: number, y0: number, y: number, enamel: string, o: { lit?: number; w?: number; depth?: number; air?: Air; glow?: boolean } = {}): void {
  const w = o.w ?? 150;
  const depth = o.depth ?? 0.12;
  // cord
  ctx.strokeStyle = '#1a100a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y - 74);
  ctx.stroke();
  // fitting
  const fit = (c: Ctx) => {
    c.beginPath();
    c.roundRect(x - 13, y - 80, 26, 26, 5);
  };
  solid(ctx, fit, { x: x - 13, y: y - 80, w: 26, h: 26 }, 'chrome', '#c89a4a', { depth, line: 2.5 });
  const shade_ = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 16, y - 58);
    c.bezierCurveTo(x - 30, y - 40, x - w / 2 + 6, y - 22, x - w / 2, y);
    c.quadraticCurveTo(x, y + 12, x + w / 2, y);
    c.bezierCurveTo(x + w / 2 - 6, y - 22, x + 30, y - 40, x + 16, y - 58);
    c.closePath();
  };
  solid(ctx, shade_, { x: x - w / 2, y: y - 58, w, h: 66 }, 'enamel', enamel, { depth, formSize: 20 });
  // the white inside of the shade's rim and the bulb
  const lit = o.lit ?? 1;
  ctx.beginPath();
  ctx.ellipse(x, y + 1, w / 2 - 3, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = lit > 0 ? '#fff4d6' : '#d8d0c0';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 17, 10, 0, 0, Math.PI);
  ctx.fillStyle = lit > 0 ? '#fffbe8' : '#e8e0c8';
  ctx.fill();
  if (lit > 0 && o.glow !== false) {
    lightPool(ctx, x, y + 6, 110, 40, '#ffd890', 0.55 * lit);
    lightPool(ctx, x, y + 4, 40, 18, '#ffffff', 0.6 * lit);
  }
  spec(ctx, x - w * 0.2, y - 30, 22, 8, 0.4, -0.5);
}

/** A terracotta pot with a leafy herb (basil) at (x, y = its base). */
export function herbPot(ctx: Ctx, r: R, x: number, y: number, s: number, leaf = '#4f8a2e'): void {
  const pw = 46 * s;
  const ph = 40 * s;
  // leaves first (behind the rim), as a bushy mound of lit ovals
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * (0.1 + r() * 0.8);
    const d = (10 + r() * 26) * s;
    const lx = x + Math.cos(a) * d * 1.1;
    const ly = y - ph - 6 * s + Math.sin(a) * d * 0.9;
    const rot = a + Math.PI / 2 + (r() - 0.5);
    const leafPath = ellPath(lx, ly, 9 * s, 5.5 * s, rot);
    solid(ctx, leafPath, { x: lx - 9 * s, y: ly - 9 * s, w: 18 * s, h: 18 * s }, 'plastic', shade(leaf, (r() - 0.3) * 0.3), { line: 1.4, formSize: 4 * s, spec: false, form: 0.5 });
    ctx.strokeStyle = rgba('#d8f0a0', 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx - Math.cos(rot) * 6 * s, ly - Math.sin(rot) * 6 * s);
    ctx.lineTo(lx + Math.cos(rot) * 6 * s, ly + Math.sin(rot) * 6 * s);
    ctx.stroke();
  }
  const pot = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - pw / 2, y - ph);
    c.lineTo(x + pw / 2, y - ph);
    c.lineTo(x + pw * 0.38, y);
    c.lineTo(x - pw * 0.38, y);
    c.closePath();
  };
  groundShadow(ctx, x + 6 * s, y, pw * 0.55, 5 * s, 0.4);
  solid(ctx, pot, { x: x - pw / 2, y: y - ph, w: pw, h: ph }, 'stone', '#c0663a', { line: 2.2, formSize: 10 * s });
  const lip = (c: Ctx) => {
    c.beginPath();
    c.roundRect(x - pw * 0.56, y - ph - 4 * s, pw * 1.12, 11 * s, 3);
  };
  solid(ctx, lip, { x: x - pw * 0.56, y: y - ph - 4 * s, w: pw * 1.12, h: 11 * s }, 'stone', '#cc7044', { line: 2.2, formSize: 4 });
}

/** A rope or chain hanging between two points with a sag (chain: rings). */
export function hang(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, sag: number, col: string, w = 3, chain = false): void {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 + sag;
  if (!chain) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.stroke();
    return;
  }
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / (w * 2.6)));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1;
    ctx.beginPath();
    ctx.ellipse(x, y, i % 2 ? w * 0.5 : w * 1.1, i % 2 ? w * 1.4 : w * 1.25, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#1a120c';
    ctx.lineWidth = w * 0.9;
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w * 0.45;
    ctx.stroke();
  }
}

/** A wall-hung flat thing's shadow (a sign, a frame, a board) a little behind it. */
export function wallShadow(ctx: Ctx, path: (c: Ctx) => void, dist = 12, soft = 14, a = 0.45): void {
  castShadow(ctx, path, dist, soft, a, '#1a0a06');
}

export const tone = (base: string, k: number) => (k >= 0 ? shade(base, k) : mix(shade(base, k), '#2a1020', 0.2));
