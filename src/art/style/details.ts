// Details for the style kit, painted inside a silhouette under the one light: stitching, eyelets, laces, rivets,
// claws, fur, tufts and eyes. Each one is lit from the top left and casts its own soft contact shadow, so details
// sit on the surface instead of floating on it.

import { type Ctx, mix, rgba, shade } from '../util';
import { LIGHT, type PathFn, ao, fbm, glint, pxPerUnit, spec } from './kit';

/**
 * Patchy cover from fractal noise (soot, dirt, rust, worn paint): `col` (#rrggbb) laid over the box where the noise
 * is above `at`, fading in over `soft`. `scale` is the patch size in design units. A tiny `soft` makes hard-edged
 * paint chips.
 */
export function blotches(g: Ctx, box: { x: number; y: number; w: number; h: number }, col: string, a: number, scale: number, at: number, soft: number, seed: number, op: GlobalCompositeOperation = 'source-over'): void {
  const step = Math.max(1, Math.min(3, scale / 8));
  const w = Math.ceil(box.w / step);
  const h = Math.ceil(box.h / step);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d')!;
  const img = x.createImageData(w, h);
  const r = parseInt(col.slice(1, 3), 16);
  const gg = parseInt(col.slice(3, 5), 16);
  const b = parseInt(col.slice(5, 7), 16);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const n = fbm((box.x + i * step) / scale, (box.y + j * step) / scale, 4, seed);
      const v = Math.max(0, Math.min(1, (n - at) / Math.max(0.001, soft)));
      const o = (j * w + i) * 4;
      img.data[o] = r;
      img.data[o + 1] = gg;
      img.data[o + 2] = b;
      img.data[o + 3] = v * a * 255;
    }
  x.putImageData(img, 0, 0);
  g.save();
  g.globalCompositeOperation = op;
  g.imageSmoothingQuality = 'high';
  g.drawImage(c, box.x, box.y, box.w, box.h);
  g.restore();
}

const [LX, LY] = LIGHT.dir;

/** A soft drop shadow for a detail: `draw` paints its shape (any colour), shifted away from the light. */
export function contact(g: Ctx, draw: (g: Ctx) => void, a = 0.35, d = 2.2, blur = 2.5, col = LIGHT.ao): void {
  const k = pxPerUnit(g);
  g.save();
  g.shadowColor = rgba(col, a);
  g.shadowBlur = blur * k;
  g.shadowOffsetX = -LX * d * k;
  g.shadowOffsetY = -LY * d * k;
  // draw the shape far away so only its shadow lands here
  g.translate(-5000, 0);
  g.shadowOffsetX += 5000 * k;
  draw(g);
  g.restore();
}

/** Dashed thread stitching along a path: dark holes, light thread. */
export function stitches(g: Ctx, path: (g: Ctx) => void, thread: string, w = 1.8, dash = 5, gap = 4): void {
  g.save();
  g.lineCap = 'round';
  g.setLineDash([dash, gap]);
  g.beginPath();
  path(g);
  g.strokeStyle = rgba('#000000', 0.35);
  g.lineWidth = w + 1.4;
  g.stroke();
  g.translate(-LX * 0.5, -LY * 0.5);
  g.beginPath();
  path(g);
  g.strokeStyle = thread;
  g.lineWidth = w;
  g.stroke();
  g.restore();
}

/** A metal eyelet ring. */
export function eyelet(g: Ctx, x: number, y: number, r: number, metal = '#d9dde3'): void {
  contact(g, (c) => {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }, 0.4, 1.5, 2);
  const rg = g.createLinearGradient(x - r, y - r, x + r, y + r);
  rg.addColorStop(0, shade(metal, 0.5));
  rg.addColorStop(0.5, metal);
  rg.addColorStop(1, shade(metal, -0.5));
  g.fillStyle = rg;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1a1414';
  g.beginPath();
  g.arc(x + 0.3, y + 0.3, r * 0.5, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = rgba('#ffffff', 0.85);
  g.lineWidth = Math.max(0.8, r * 0.22);
  g.beginPath();
  g.arc(x, y, r * 0.74, Math.PI * 1.05, Math.PI * 1.6);
  g.stroke();
}

/** One flat cotton lace run from a to b: a lit band with a woven texture and soft shadow under it. */
export function laceRun(g: Ctx, ax: number, ay: number, bx: number, by: number, col: string, w: number): void {
  const draw = (c: Ctx) => {
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(bx, by);
  };
  contact(g, (c) => {
    c.lineCap = 'round';
    c.lineWidth = w;
    c.strokeStyle = '#000';
    draw(c);
    c.stroke();
  }, 0.45, 2.4, 2.5);
  g.save();
  g.lineCap = 'round';
  draw(g);
  g.strokeStyle = mix(shade(col, -0.45), '#3a3040', 0.3);
  g.lineWidth = w + 1.2;
  g.stroke();
  draw(g);
  g.strokeStyle = col;
  g.lineWidth = w;
  g.stroke();
  // a lit edge and the weave
  const nx = -(by - ay);
  const ny = bx - ax;
  const n = Math.hypot(nx, ny) || 1;
  const ox = (nx / n) * w * 0.22 * Math.sign(nx * LX + ny * LY || 1);
  const oy = (ny / n) * w * 0.22 * Math.sign(nx * LX + ny * LY || 1);
  g.beginPath();
  g.moveTo(ax + ox, ay + oy);
  g.lineTo(bx + ox, by + oy);
  g.strokeStyle = rgba('#ffffff', 0.45);
  g.lineWidth = w * 0.3;
  g.stroke();
  g.setLineDash([1.4, 2.2]);
  draw(g);
  g.strokeStyle = rgba(shade(col, -0.4), 0.35);
  g.lineWidth = w * 0.55;
  g.stroke();
  g.restore();
}

/** A domed rivet. */
export function rivet(g: Ctx, x: number, y: number, r: number, metal = '#9aa0a8'): void {
  contact(g, (c) => {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }, 0.5, r * 0.5, r * 0.6);
  const rg = g.createRadialGradient(x + LX * r * 0.45, y + LY * r * 0.45, r * 0.1, x, y, r);
  rg.addColorStop(0, shade(metal, 0.65));
  rg.addColorStop(0.5, metal);
  rg.addColorStop(1, shade(metal, -0.55));
  g.fillStyle = rg;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  spec(g, x + LX * r * 0.4, y + LY * r * 0.4, r * 0.45, r * 0.3, 0.8, -0.6);
}

/** A hooked claw of keratin from (x, y) pointing along `ang` (radians, π/2 = down), length len, base width w.
 * `hook` bends the tip (+ towards the foot's centre line when mirrored by the caller). */
export function clawPath(x: number, y: number, ang: number, len: number, w: number, hook = 0.35): PathFn {
  return (c: Ctx) => {
    c.save();
    c.translate(x, y);
    c.rotate(ang - Math.PI / 2);
    c.beginPath();
    c.moveTo(-w / 2, 0);
    c.bezierCurveTo(-w * 0.55, len * 0.45, -w * 0.15 + hook * w, len * 0.85, hook * w * 1.2, len);
    c.bezierCurveTo(w * 0.1 + hook * w, len * 0.7, w * 0.55, len * 0.4, w / 2, 0);
    c.closePath();
    c.restore();
  };
}

/** Paint a claw (already in the silhouette) with horn shading: pale lit side, a sharp highlight, ridges. */
export function paintClaw(g: Ctx, x: number, y: number, ang: number, len: number, w: number, hook: number, horn = '#e6d8a8', dark = '#3e2c14'): void {
  const p = clawPath(x, y, ang, len, w, hook);
  g.save();
  p(g);
  g.clip();
  const tx = x + Math.cos(ang) * len;
  const ty = y + Math.sin(ang) * len;
  const gr = g.createLinearGradient(x, y, tx, ty);
  gr.addColorStop(0, shade(horn, -0.35));
  gr.addColorStop(0.35, horn);
  gr.addColorStop(1, dark);
  g.fillStyle = gr;
  g.fillRect(x - len - w, y - len - w, (len + w) * 2, (len + w) * 2);
  // the shade side and a long highlight on the lit side
  g.translate(x, y);
  g.rotate(ang - Math.PI / 2);
  const sg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  sg.addColorStop(0, rgba('#ffffff', 0.35));
  sg.addColorStop(0.45, rgba('#ffffff', 0));
  sg.addColorStop(1, rgba(dark, 0.55));
  g.fillStyle = sg;
  g.fillRect(-w, 0, w * 2, len);
  g.strokeStyle = rgba('#fff8e0', 0.8);
  g.lineWidth = Math.max(0.8, w * 0.1);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-w * 0.22, len * 0.08);
  g.quadraticCurveTo(-w * 0.18 + hook * w * 0.3, len * 0.6, hook * w * 0.9, len * 0.9);
  g.stroke();
  g.strokeStyle = rgba(dark, 0.35);
  g.lineWidth = Math.max(0.6, w * 0.06);
  for (const f of [0.25, 0.42]) {
    g.beginPath();
    g.moveTo(-w * 0.45, len * f);
    g.quadraticCurveTo(0, len * (f + 0.06), w * 0.45, len * f);
    g.stroke();
  }
  g.restore();
}

/** A tuft (a lock of fur) as a path: a pointed flame from a root at (x, y), pointing along `ang`, length len, width w,
 * bending by `bend` (radians over its length). */
export function tuftPath(x: number, y: number, ang: number, len: number, w: number, bend = 0.3): PathFn {
  return (c: Ctx) => {
    c.save();
    c.translate(x, y);
    c.rotate(ang - Math.PI / 2);
    const tipX = Math.sin(bend) * len;
    const tipY = Math.cos(bend) * len;
    c.beginPath();
    c.moveTo(-w / 2, 0);
    c.bezierCurveTo(-w * 0.55, len * 0.4, tipX * 0.5 - w * 0.2, len * 0.75, tipX, tipY);
    c.bezierCurveTo(tipX * 0.5 + w * 0.25, len * 0.65, w * 0.6, len * 0.35, w / 2, 0);
    c.closePath();
    c.restore();
  };
}

/** Fur: many fine strands over a region, flowing along `ang` (radians, π/2 = down), lit from the top left.
 * `r` is a seeded random; dark/mid/light are the fur's tones. */
export function furStrands(g: Ctx, r: () => number, area: { x: number; y: number; w: number; h: number }, ang: number, n: number, len: number, tones: { dark: string; mid: string; light: string }, wiggle = 0.35): void {
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = area.x + r() * area.w;
    const y = area.y + r() * area.h;
    const a = ang + (r() - 0.5) * wiggle;
    const l = len * (0.6 + r() * 0.6);
    const ex = x + Math.cos(a) * l;
    const ey = y + Math.sin(a) * l;
    const bx = x + Math.cos(a + 0.4) * l * 0.5;
    const by = y + Math.sin(a + 0.4) * l * 0.5;
    // lit strands face the light: brighter towards the top left of the area
    const u = ((x - area.x) / area.w) * 0.5 + ((y - area.y) / area.h) * 0.5;
    const t = r();
    const col = t < 0.38 ? tones.dark : t < 0.8 ? tones.mid : tones.light;
    g.strokeStyle = rgba(col, 0.35 + r() * 0.45 - (col === tones.light ? u * 0.3 : 0));
    g.lineWidth = 0.9 + r() * 1.5;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(bx, by, ex, ey);
    g.stroke();
  }
  g.restore();
}

/** A glossy bead eye (plush toys, critters): dark ball, coloured iris ring, a wet glint. */
export function beadEye(g: Ctx, x: number, y: number, rx: number, ry: number, iris: string, lookX = 0, lookY = 0): void {
  contact(g, (c) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }, 0.4, 2.5, 3);
  const gr = g.createRadialGradient(x + LX * rx * 0.3 + lookX, y + LY * ry * 0.3 + lookY, 1, x, y, Math.max(rx, ry));
  gr.addColorStop(0, mix(iris, '#000000', 0.2));
  gr.addColorStop(0.5, '#120a10');
  gr.addColorStop(1, '#040204');
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = rgba(iris, 0.5);
  g.lineWidth = Math.max(1, rx * 0.12);
  g.beginPath();
  g.ellipse(x + lookX * 0.6, y + lookY * 0.6 + ry * 0.15, rx * 0.55, ry * 0.5, 0, 0.2, Math.PI - 0.2);
  g.stroke();
  spec(g, x - rx * 0.32 + lookX * 0.3, y - ry * 0.38 + lookY * 0.3, rx * 0.4, ry * 0.3, 0.95, -0.5);
  glint(g, x - rx * 0.3 + lookX * 0.3, y - ry * 0.36 + lookY * 0.3, rx * 0.28, 1);
  ao(g, x + rx * 0.3, y + ry * 0.55, rx * 0.5, ry * 0.25, 0.25, 0, '#000');
}
