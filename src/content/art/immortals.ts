// Art for the Immortals: the Immortal Sandals (src/content/feet/persians.ts) and their champion, the Immortal Brute
// (src/content/feet/leonidas.ts). Ported from the approved mockup (scratchpad immortal/mock4.html), so most of the
// drawing below is in the mockup's own coordinates: x = 0 is the foot's centre line, y = 0 the top of the ankle
// (the wrap or the iron band), toes near y = 300. `mock()` maps that frame onto the design frame (centre CX, ankle
// at y = -6, sole at contactY).
//
// - Immortal Sandals: a polished chrome leg, a black cloth head-scarf wrapped round the ankle, a chrome war mask,
//   and under it a foot made of black smoke. The smoke is live in play (src/game/footLive.ts): the body boils
//   through pre-drawn frames and particles pour off the toes, the sides, the armour's edge, the eyes and the mouth.
// - Immortal Brute: a stone blue-grey hide with one great dark eye in a socket, hooked claw-nails and an iron
//   ankle band. In play the eye looks about and blinks, and black smoke seeps from round it (footLive.ts).
//
// The texture each kind registers is the whole foot at rest (the Peel Locker, the Pizzapedia and the boss lab show
// it); footLive.ts draws the in-play variants (the foot minus its live parts) with the exported painters here.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import type { Ctx } from '../../art/util';
import { shade } from '../../art/util';

const MINK = '#1d120c';

/** A mockup-to-design mapping: design = (CX + x·k, y0 + y·k). */
export interface MockFrame {
  k: number;
  y0: number;
  contactY: number;
}

/** The Immortal Sandals: scarf top (mock y −32) at design y −6, toe tips (mock ~300) round the contact line. */
export const IMM: MockFrame = { k: 0.86, y0: 21.5, contactY: 278 };
/** The head-scarf: a third taller than the mockup's (Tron's call), reaching up over the chrome leg; its bottom edge
 * still sits on the mask's forehead. */
export const SCARF = { top: -32, h: 62, w: 96, cords: 6 };
/** The Immortal Brute: iron band top (mock y −8) at design y −6, claws reaching past the sole. */
export const BRUTE: MockFrame = { k: 0.9, y0: 1.2, contactY: 290 };

/** Run `draw` in the mockup's frame. */
export function mock(ctx: Ctx, f: MockFrame, draw: () => void): void {
  ctx.save();
  ctx.translate(CX, f.y0);
  ctx.scale(f.k, f.k);
  draw();
  ctx.restore();
}

// ——— noise (the mockup's, so frames and particles drift the same way) ———
function hash(i: number): number {
  i = (i << 13) ^ i;
  return 1 - ((i * (i * i * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824;
}
export function noise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}

/** Draw `layer` (a canvas the size of ctx's canvas) onto ctx, blurred by px device pixels. */
function blurDraw(ctx: Ctx, layer: HTMLCanvasElement, px: number): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if ('filter' in ctx && typeof ctx.filter === 'string') {
    ctx.filter = `blur(${px.toFixed(2)}px)`;
    ctx.drawImage(layer, 0, 0);
    ctx.filter = 'none';
    // browsers that ignore the filter still drew it once, sharp: good enough
  } else {
    (ctx as Ctx).drawImage(layer, 0, 0);
  }
  ctx.restore();
}

/** A blank canvas matching ctx (same size and transform), for a layer that gets blurred as a whole. */
function layerFor(ctx: Ctx): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = ctx.canvas.width;
  c.height = ctx.canvas.height;
  const l = c.getContext('2d')!;
  l.setTransform(ctx.getTransform());
  l.lineJoin = 'round';
  l.lineCap = 'round';
  return [c, l];
}

/** Device pixels per mockup unit at ctx's current transform (inside mock()). */
const pxPerUnit = (ctx: Ctx) => Math.hypot(ctx.getTransform().a, ctx.getTransform().b);

// ════════════════════════════ IMMORTAL SANDALS ════════════════════════════

export interface ImmortalLook {
  dark: string;
  light: string;
  /** The pale grey of the smoke's curls, as "r,g,b". */
  curl: string;
}

export function immortalLook(art: FootArt): ImmortalLook {
  return { dark: art.primary ?? '#3a3f47', light: art.secondary ?? '#c9d0da', curl: String(art.extra?.curl ?? '120,112,135') };
}

/** The mask's top, scale and the y of its armour edge (for the smoke that pours out from under it). */
export const MASK = { my: -2, ms: 1 };

function maskPath(x: Ctx): void {
  x.beginPath();
  x.moveTo(0, -10);
  x.bezierCurveTo(52, -10, 90, 18, 92, 64);
  x.bezierCurveTo(94, 112, 92, 166, 84, 206);
  x.bezierCurveTo(54, 192, 20, 186, 0, 186);
  x.bezierCurveTo(-20, 186, -54, 192, -84, 206);
  x.bezierCurveTo(-92, 166, -94, 112, -92, 64);
  x.bezierCurveTo(-90, 18, -52, -10, 0, -10);
  x.closePath();
}

function chromeFill(x: Ctx, dark: string, light: string): CanvasGradient {
  const g = x.createLinearGradient(-90, 0, 90, 40);
  const stops: [number, string][] = [
    [0, dark], [0.12, shade(light, -0.15)], [0.2, '#ffffff'], [0.3, shade(light, -0.3)], [0.44, dark],
    [0.56, shade(light, -0.1)], [0.68, '#f6f8fb'], [0.8, shade(light, -0.35)], [1, dark],
  ];
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function curvePlane(x: Ctx, draw: () => void, fill: string | CanvasGradient): void {
  x.fillStyle = fill;
  x.beginPath();
  draw();
  x.fill();
}

/** The chrome war mask: long face, heavy V brow, hollow black eyes, a broad flared nose, deep folds and a wide
 * downturned open grimace; a short armour band under the mouth whose bottom edge arches up like the mouth. */
function warMask(x: Ctx, o: ImmortalLook): void {
  x.save();
  maskPath(x);
  x.fillStyle = chromeFill(x, o.dark, o.light);
  x.fill();
  x.save();
  maskPath(x);
  x.clip();
  const sh = 'rgba(8,10,16,.62)';
  const mid = 'rgba(8,10,16,.32)';
  const hl = 'rgba(255,255,255,.8)';
  const hl2 = 'rgba(255,255,255,.45)';
  // forehead: a smooth dome with a bright band
  curvePlane(x, () => x.ellipse(-18, 8, 40, 14, -0.2, 0, 7), 'rgba(255,255,255,.35)');
  // the brow: a heavy V ridge, bright on top, deep shadow beneath
  curvePlane(x, () => {
    x.moveTo(-84, 40);
    x.bezierCurveTo(-60, 22, -26, 22, -6, 44);
    x.lineTo(6, 44);
    x.bezierCurveTo(26, 22, 60, 22, 84, 40);
    x.lineTo(84, 52);
    x.bezierCurveTo(60, 40, 30, 42, 8, 62);
    x.lineTo(-8, 62);
    x.bezierCurveTo(-30, 42, -60, 40, -84, 52);
    x.closePath();
  }, shade(o.light, -0.05));
  x.strokeStyle = hl;
  x.lineWidth = 3;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(-80, 38);
  x.bezierCurveTo(-58, 22, -26, 22, -8, 42);
  x.moveTo(8, 42);
  x.bezierCurveTo(26, 22, 58, 22, 80, 38);
  x.stroke();
  // glabella: two deep vertical furrows and a pinched knot
  for (const s of [-1, 1]) {
    curvePlane(x, () => {
      x.moveTo(s * 3, 18);
      x.quadraticCurveTo(s * 10, 34, s * 7, 58);
      x.lineTo(s * 2, 58);
      x.quadraticCurveTo(s * 4, 34, s * 0.5, 18);
      x.closePath();
    }, sh);
  }
  // eye hollows: deep, angled down toward the nose, dark falling into black
  for (const s of [-1, 1]) {
    x.save();
    x.scale(s, 1);
    const eg = x.createRadialGradient(40, 68, 2, 40, 66, 34);
    eg.addColorStop(0, '#000');
    eg.addColorStop(0.45, '#050509');
    eg.addColorStop(0.8, 'rgba(8,10,16,.55)');
    eg.addColorStop(1, 'rgba(8,10,16,0)');
    x.fillStyle = eg;
    x.beginPath();
    x.moveTo(10, 58);
    x.bezierCurveTo(24, 48, 60, 46, 82, 56);
    x.bezierCurveTo(72, 84, 40, 92, 14, 74);
    x.closePath();
    x.fill();
    x.fillStyle = '#000';
    x.beginPath();
    x.moveTo(18, 62);
    x.bezierCurveTo(30, 56, 56, 56, 72, 60);
    x.bezierCurveTo(62, 78, 38, 82, 20, 70);
    x.closePath();
    x.fill();
    // a high, sharp cheekbone plane
    x.fillStyle = hl2;
    x.beginPath();
    x.moveTo(30, 92);
    x.bezierCurveTo(52, 86, 74, 80, 86, 70);
    x.bezierCurveTo(86, 92, 70, 108, 46, 110);
    x.closePath();
    x.fill();
    x.strokeStyle = hl;
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(34, 90);
    x.bezierCurveTo(54, 85, 72, 80, 84, 72);
    x.stroke();
    // the hollow cheek under it
    x.fillStyle = mid;
    x.beginPath();
    x.moveTo(44, 112);
    x.bezierCurveTo(68, 108, 84, 96, 88, 84);
    x.bezierCurveTo(90, 120, 76, 148, 58, 160);
    x.bezierCurveTo(56, 140, 52, 124, 44, 112);
    x.fill();
    x.restore();
  }
  // nose: a long bridge and a broad flared base
  curvePlane(x, () => {
    x.moveTo(-7, 62);
    x.bezierCurveTo(-10, 84, -26, 104, -30, 118);
    x.bezierCurveTo(-18, 128, 18, 128, 30, 118);
    x.bezierCurveTo(26, 104, 10, 84, 7, 62);
    x.closePath();
  }, mid);
  curvePlane(x, () => {
    x.moveTo(-4, 62);
    x.bezierCurveTo(-6, 82, -10, 100, -7, 112);
    x.lineTo(1, 112);
    x.bezierCurveTo(-1, 96, 0, 80, 1, 62);
    x.closePath();
  }, hl);
  for (const s of [-1, 1]) {
    curvePlane(x, () => x.ellipse(s * 19, 116, 9, 5, s * 0.5, 0, 7), '#020203');
    curvePlane(x, () => x.ellipse(s * 27, 110, 7, 9, s * 0.3, 0, 7), hl2);
  }
  // deep nasolabial folds down to the mouth's corners
  for (const s of [-1, 1]) {
    curvePlane(x, () => {
      x.moveTo(s * 30, 112);
      x.bezierCurveTo(s * 48, 126, s * 54, 148, s * 48, 170);
      x.lineTo(s * 42, 170);
      x.bezierCurveTo(s * 46, 150, s * 40, 130, s * 26, 118);
      x.closePath();
    }, sh);
    x.strokeStyle = hl;
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(s * 34, 110);
    x.bezierCurveTo(s * 54, 124, s * 60, 148, s * 54, 170);
    x.stroke();
  }
  // the mouth: a wide, downturned, open grimace, black inside
  curvePlane(x, () => {
    x.moveTo(-40, 146);
    x.bezierCurveTo(-20, 136, 20, 136, 40, 146);
    x.bezierCurveTo(44, 160, 40, 172, 34, 178);
    x.bezierCurveTo(14, 170, -14, 170, -34, 178);
    x.bezierCurveTo(-40, 172, -44, 160, -40, 146);
    x.closePath();
  }, '#020203');
  x.strokeStyle = hl;
  x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(-40, 144);
  x.bezierCurveTo(-20, 133, 20, 133, 40, 144);
  x.stroke();
  curvePlane(x, () => {
    x.moveTo(-30, 182);
    x.bezierCurveTo(-12, 176, 12, 176, 30, 182);
    x.bezierCurveTo(18, 192, -18, 192, -30, 182);
  }, hl2);
  x.strokeStyle = hl2;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(-78, 200);
  x.bezierCurveTo(-48, 188, -16, 181, 0, 181);
  x.bezierCurveTo(16, 181, 48, 188, 78, 200);
  x.stroke();
  x.restore();
  maskPath(x);
  x.strokeStyle = MINK;
  x.lineWidth = 5;
  x.stroke();
  x.restore();
}

/** Toes of the smoke foot (x, y, rx, ry in the mock frame): big toe on the right, like the game's other feet. */
export const TOES: [number, number, number, number][] = [
  [-64, 252, 16, 22],
  [-34, 263, 18, 25],
  [-2, 270, 19.5, 27],
  [30, 272, 21, 29],
  [66, 266, 26, 33],
];

function footShape(c: Ctx, t: number, grow = 0): void {
  const n = (k: number) => noise(k + t * 1.4) * 6 + grow;
  c.beginPath();
  c.moveTo(-62 - n(1), 96);
  c.bezierCurveTo(-78 - n(2), 140, -88 - n(3), 190, -82 - n(4), 236);
  TOES.forEach(([tx, ty, rx, ry], i) => {
    const w = noise(i * 3 + t * 2.2) * 4 + grow * 0.6;
    c.bezierCurveTo(tx - rx - 2, ty + 2, tx - rx * 0.75, ty + ry + w, tx, ty + ry + w);
    c.bezierCurveTo(tx + rx * 0.75, ty + ry + w, tx + rx + 2, ty + 2, tx + rx * 0.9, ty - ry * 0.25);
  });
  c.bezierCurveTo(98 + n(5), 220, 90 + n(6), 150, 62 + n(7), 96);
  c.closePath();
}

/** The foot's body of black smoke at time t: no outlines, dark gaps between the toes, pale curls for volume.
 * Call inside mock(IMM). */
export function smokeBody(ctx: Ctx, t: number, o: ImmortalLook): void {
  const [L, c] = layerFor(ctx);
  c.fillStyle = 'rgba(8,6,12,.4)';
  footShape(c, t, 8);
  c.fill();
  c.fillStyle = 'rgba(6,5,9,.95)';
  footShape(c, t);
  c.fill();
  for (let k = 0; k < 30; k++) {
    const px = -72 + ((k * 53) % 148) + noise(k * 0.7 + t * 1.9) * 18;
    const py = 150 + ((k * 29) % 118) + noise(k * 1.3 - t * 1.6) * 12;
    const r = 10 + ((k * 11) % 13);
    const g = c.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r);
    g.addColorStop(0, `rgba(${o.curl},.42)`);
    g.addColorStop(1, `rgba(${o.curl},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(px, py, r, 0, 7);
    c.fill();
  }
  for (let i = 0; i < 4; i++) {
    const a = TOES[i];
    const b = TOES[i + 1];
    const gx = (a[0] + a[2] + b[0] - b[2]) / 2;
    const gy = (a[1] + b[1]) / 2 + 10;
    c.fillStyle = 'rgba(0,0,0,.9)';
    c.beginPath();
    c.ellipse(gx, gy, 3, 17, 0, 0, 7);
    c.fill();
  }
  for (const [tx, ty, rx, ry] of TOES) {
    c.fillStyle = `rgba(${o.curl},.38)`;
    c.beginPath();
    c.ellipse(tx - rx * 0.3, ty + ry * 0.1, rx * 0.35, ry * 0.28, 0, 0, 7);
    c.fill();
  }
  // the mockup blurs this layer by 2.5 px on a card drawn at 0.82
  blurDraw(ctx, L, (2.5 / 0.82) * pxPerUnit(ctx));
}

/** The black head-scarf wrapped round the ankle: binding cords and a hanging tail. Call inside mock(IMM). */
function scarfWrap(x: Ctx, top: number, h: number, w: number, cords: number): void {
  const g = x.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, '#060508');
  g.addColorStop(0.4, '#1d1922');
  g.addColorStop(0.6, '#2a2530');
  g.addColorStop(1, '#060508');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(-w + 8, top);
  x.lineTo(w - 8, top);
  x.bezierCurveTo(w + 4, top + h * 0.5, w + 6, top + h * 0.85, w, top + h);
  x.bezierCurveTo(w * 0.4, top + h + 12, -w * 0.3, top + h + 4, -w - 2, top + h + 8);
  x.bezierCurveTo(-w - 8, top + h * 0.6, -w - 2, top + h * 0.3, -w + 8, top);
  x.fill();
  x.strokeStyle = MINK;
  x.lineWidth = 5;
  x.stroke();
  for (let i = 1; i < cords; i++) {
    const y = top + (i * h) / cords;
    x.strokeStyle = 'rgba(0,0,0,.6)';
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(-w, y + 6);
    x.bezierCurveTo(-20, y + (i % 2 ? 14 : -2), 20, y + (i % 2 ? -4 : 12), w + 2, y);
    x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.13)';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(-w, y + 2);
    x.bezierCurveTo(-20, y + (i % 2 ? 10 : -6), 20, y + (i % 2 ? -8 : 8), w + 2, y - 4);
    x.stroke();
  }
  x.fillStyle = '#1d1922';
  x.beginPath();
  x.moveTo(w - 14, top + h - 6);
  x.bezierCurveTo(w + 22, top + h + 12, w + 26, top + h + 52, w + 8, top + h + 80);
  x.lineTo(w - 4, top + h + 72);
  x.bezierCurveTo(w + 8, top + h + 42, w - 2, top + h + 16, w - 28, top + h + 4);
  x.fill();
  x.strokeStyle = MINK;
  x.lineWidth = 4;
  x.stroke();
}

/** The mask and the scarf (everything of the Immortal but its smoke). Call inside mock(IMM). */
export function immortalArmour(ctx: Ctx, o: ImmortalLook): void {
  ctx.save();
  ctx.translate(0, MASK.my);
  ctx.scale(MASK.ms, MASK.ms);
  warMask(ctx, o);
  ctx.restore();
  scarfWrap(ctx, SCARF.top, SCARF.h, SCARF.w, SCARF.cords);
}

function drawImmortal(ctx: Ctx, art: FootArt): void {
  const o = immortalLook(art);
  mock(ctx, IMM, () => {
    smokeBody(ctx, 0, o);
    immortalArmour(ctx, o);
  });
}

// ════════════════════════════ THE IMMORTAL BRUTE ════════════════════════════

function footOutline(x: Ctx, s = 1.08): void {
  x.beginPath();
  x.moveTo(-58 * s, 0);
  x.bezierCurveTo(-62 * s, 70, -112 * s, 120, -116 * s, 200);
  x.bezierCurveTo(-118 * s, 236, -104 * s, 262, -80 * s, 270);
  x.lineTo(80 * s, 272);
  x.bezierCurveTo(104 * s, 262, 118 * s, 236, 116 * s, 200);
  x.bezierCurveTo(112 * s, 120, 62 * s, 70, 58 * s, 0);
  x.closePath();
}

/** The eye: centre y and size in the mock frame. */
export const EYE = { y: 118, w: 128, h: 66 };

/** The stone blue-grey sculpted hide: muscle masses lit from the top left, folds, side veins, stitched scars,
 * pitted grit and a cool rim light. */
function bruteHide(x: Ctx, base: string): void {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.save();
  footOutline(x);
  const g = x.createLinearGradient(-120, 0, 120, 280);
  g.addColorStop(0, shade(base, -0.35));
  g.addColorStop(0.4, shade(base, 0.08));
  g.addColorStop(1, shade(base, -0.55));
  x.fillStyle = g;
  x.fill();
  x.clip();
  const M: [number, number, number, number][] = [[-84, 176, 36, 56], [84, 174, 36, 56], [0, 222, 90, 28], [-74, 96, 28, 40], [74, 100, 28, 40], [0, 40, 40, 26]];
  for (const [mx, my, rx, ry] of M) {
    const gg = x.createRadialGradient(mx - rx * 0.35, my - ry * 0.5, 2, mx, my + ry * 0.2, Math.max(rx, ry) * 1.15);
    gg.addColorStop(0, shade(base, 0.32));
    gg.addColorStop(0.5, base);
    gg.addColorStop(1, 'rgba(10,12,18,0)');
    x.fillStyle = gg;
    x.beginPath();
    x.ellipse(mx, my, rx, ry, 0, 0, 7);
    x.fill();
    x.fillStyle = 'rgba(8,10,16,.35)';
    x.beginPath();
    x.ellipse(mx + rx * 0.1, my + ry * 0.85, rx * 0.9, ry * 0.28, 0, 0, 7);
    x.fill();
  }
  x.lineCap = 'round';
  for (const [a, b, c, d, e, f] of [[-106, 150, -84, 170, -64, 152], [58, 152, 82, 172, 106, 152], [-62, 244, 0, 256, 62, 244]]) {
    x.strokeStyle = 'rgba(6,8,12,.7)';
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(a, b);
    x.quadraticCurveTo(c, d, e, f);
    x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.22)';
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(a + 1, b + 6);
    x.quadraticCurveTo(c + 1, d + 6, e + 1, f + 6);
    x.stroke();
  }
  const veins: [number, number][][] = [[[-46, 0], [-58, 30], [-50, 58], [-66, 84]], [[48, 6], [60, 34], [52, 62], [70, 86]]];
  for (const v of veins) {
    x.lineWidth = 5;
    x.strokeStyle = 'rgba(8,10,16,.4)';
    x.beginPath();
    v.forEach(([a, b], i) => (i ? x.lineTo(a + 2, b + 3) : x.moveTo(a + 2, b + 3)));
    x.stroke();
    x.lineWidth = 3.5;
    x.strokeStyle = shade(base, 0.18);
    x.beginPath();
    v.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
    x.stroke();
  }
  for (const [sx, sy, len, ang] of [[-70, 150, 40, 0.35], [64, 210, 36, 0.1], [26, 30, 30, -0.4]]) {
    x.save();
    x.translate(sx, sy);
    x.rotate(ang);
    x.strokeStyle = 'rgba(90,40,40,.75)';
    x.lineWidth = 9;
    x.beginPath();
    x.moveTo(-len / 2, 0);
    x.lineTo(len / 2, 0);
    x.stroke();
    x.strokeStyle = 'rgba(225,205,205,.7)';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(-len / 2, -2);
    x.lineTo(len / 2, -2);
    x.stroke();
    x.strokeStyle = '#120c0c';
    x.lineWidth = 2;
    for (let k = -len / 2 + 5; k < len / 2; k += 8) {
      x.beginPath();
      x.moveTo(k, -7);
      x.lineTo(k + 3, 7);
      x.stroke();
    }
    x.restore();
  }
  for (let i = 0; i < 1400; i++) {
    const px = (rnd() - 0.5) * 260;
    const py = rnd() * 290;
    x.fillStyle = rnd() < 0.6 ? `rgba(0,0,0,${rnd() * 0.18})` : `rgba(255,255,255,${rnd() * 0.1})`;
    x.beginPath();
    x.arc(px, py, rnd() * 1.8 + 0.4, 0, 7);
    x.fill();
  }
  const rim = x.createLinearGradient(90, 0, 130, 0);
  rim.addColorStop(0, 'rgba(150,180,230,0)');
  rim.addColorStop(1, 'rgba(150,180,230,.45)');
  x.fillStyle = rim;
  x.fillRect(80, 0, 60, 300);
  x.restore();
  footOutline(x);
  x.strokeStyle = MINK;
  x.lineWidth = 6;
  x.stroke();
}

function lidCurve(x: Ctx, w: number, h: number, b: number): void {
  x.moveTo(-w / 2, 0);
  x.bezierCurveTo(-w * 0.28, -h * (1 - b) * 0.95 + h * 0.5 * b, w * 0.28, -h * (1 - b) * 0.95 + h * 0.5 * b, w / 2, 0);
}

/** The socket and the eyeball's dark wet base (no iris), clipped to the open lids. Call inside mock(BRUTE). */
export function bruteSocket(x: Ctx): void {
  const { y, w, h } = EYE;
  x.save();
  x.translate(0, y);
  const sg = x.createRadialGradient(0, 4, 8, 0, 4, w * 0.62);
  sg.addColorStop(0, 'rgba(4,5,8,.85)');
  sg.addColorStop(0.7, 'rgba(4,5,8,.45)');
  sg.addColorStop(1, 'rgba(4,5,8,0)');
  x.fillStyle = sg;
  x.beginPath();
  x.ellipse(0, 4, w * 0.62, h * 0.95, 0, 0, 7);
  x.fill();
  x.beginPath();
  lidCurve(x, w, h, 0);
  x.bezierCurveTo(w * 0.3, h * 0.62, -w * 0.3, h * 0.62, -w / 2, 0);
  x.closePath();
  x.clip();
  const eg = x.createRadialGradient(-8, -6, 2, 0, 4, w * 0.5);
  eg.addColorStop(0, '#2b1d22');
  eg.addColorStop(0.45, '#0d080a');
  eg.addColorStop(1, '#000');
  x.fillStyle = eg;
  x.fillRect(-w, -h, w * 2, h * 2);
  x.restore();
}

/** The iris, pupil and glint, centred on the eye with the pupil looking `look` mock units to the side. Call inside
 * mock(BRUTE) (footLive.ts draws it at look 0 and slides the sprite). */
export function bruteIris(x: Ctx, look: number): void {
  const { y } = EYE;
  x.save();
  x.translate(0, y);
  const ig = x.createRadialGradient(look, 6, 10, look, 6, 30);
  ig.addColorStop(0, 'rgba(0,0,0,0)');
  ig.addColorStop(0.7, 'rgba(150,16,20,.55)');
  ig.addColorStop(1, 'rgba(150,16,20,0)');
  x.fillStyle = ig;
  x.beginPath();
  x.arc(look, 6, 30, 0, 7);
  x.fill();
  x.fillStyle = '#000';
  x.beginPath();
  x.ellipse(look, 6, 8, 19, 0, 0, 7);
  x.fill();
  x.fillStyle = 'rgba(255,60,50,.95)';
  x.beginPath();
  x.ellipse(look - 12, -6, 5, 3.5, -0.5, 0, 7);
  x.fill();
  x.fillStyle = 'rgba(255,230,220,.95)';
  x.beginPath();
  x.arc(look - 13, -7, 1.8, 0, 7);
  x.fill();
  x.strokeStyle = 'rgba(255,70,60,.35)';
  x.lineWidth = 2;
  x.beginPath();
  x.arc(look, 6, 24, 3.6, 4.6);
  x.stroke();
  x.restore();
}

/** The lid's shadow over the top of the ball. */
function lidShadow(x: Ctx): void {
  const { y, w, h } = EYE;
  x.save();
  x.translate(0, y);
  x.beginPath();
  lidCurve(x, w, h, 0);
  x.bezierCurveTo(w * 0.3, h * 0.62, -w * 0.3, h * 0.62, -w / 2, 0);
  x.closePath();
  x.clip();
  x.fillStyle = 'rgba(0,0,0,.6)';
  x.fillRect(-w, -h, w * 2, h * 0.62);
  x.restore();
}

/** The upper lid closed by `b` (0 open … 1 shut), the lower lid and the hard brow over it. Call inside mock(BRUTE). */
export function bruteLids(x: Ctx, base: string, b: number): void {
  const { y, w, h } = EYE;
  x.save();
  x.translate(0, y);
  const lg = x.createLinearGradient(0, -h, 0, h * 0.4);
  lg.addColorStop(0, shade(base, 0.12));
  lg.addColorStop(0.6, shade(base, -0.15));
  lg.addColorStop(1, shade(base, -0.45));
  x.fillStyle = lg;
  x.beginPath();
  x.moveTo(-w / 2 - 10, 6);
  x.bezierCurveTo(-w * 0.4, -h * 1.05, w * 0.4, -h * 1.05, w / 2 + 10, 6);
  x.lineTo(w / 2, 0);
  x.bezierCurveTo(w * 0.28, -h * (1 - b) * 0.95 + h * 0.5 * b, -w * 0.28, -h * (1 - b) * 0.95 + h * 0.5 * b, -w / 2, 0);
  x.closePath();
  x.fill();
  x.strokeStyle = 'rgba(255,255,255,.3)';
  x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(-w / 2, -6);
  x.bezierCurveTo(-w * 0.38, -h * 0.95, w * 0.38, -h * 0.95, w / 2, -6);
  x.stroke();
  x.strokeStyle = '#07080b';
  x.lineWidth = 4;
  x.beginPath();
  lidCurve(x, w, h, b);
  x.stroke();
  // lower lid
  x.fillStyle = shade(base, -0.1);
  x.beginPath();
  x.moveTo(-w / 2, 0);
  x.bezierCurveTo(-w * 0.3, h * 0.62, w * 0.3, h * 0.62, w / 2, 0);
  x.bezierCurveTo(w * 0.34, h * 0.86, -w * 0.34, h * 0.86, -w / 2, 0);
  x.fill();
  x.strokeStyle = '#07080b';
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(-w / 2, 0);
  x.bezierCurveTo(-w * 0.3, h * 0.62, w * 0.3, h * 0.62, w / 2, 0);
  x.stroke();
  x.strokeStyle = 'rgba(255,255,255,.22)';
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(-w * 0.4, h * 0.55);
  x.bezierCurveTo(-w * 0.2, h * 0.78, w * 0.2, h * 0.78, w * 0.4, h * 0.55);
  x.stroke();
  // the brow: a hard ridge with deep creases
  x.strokeStyle = 'rgba(6,8,12,.75)';
  x.lineWidth = 6;
  x.lineCap = 'round';
  for (const s of [-1, 1]) {
    x.beginPath();
    x.moveTo(s * 6, -h * 1.15);
    x.quadraticCurveTo(s * w * 0.3, -h * 1.2, s * w * 0.62, -h * 0.5);
    x.stroke();
  }
  x.strokeStyle = 'rgba(255,255,255,.25)';
  x.lineWidth = 2.5;
  for (const s of [-1, 1]) {
    x.beginPath();
    x.moveTo(s * 8, -h * 1.25);
    x.quadraticCurveTo(s * w * 0.3, -h * 1.3, s * w * 0.64, -h * 0.6);
    x.stroke();
  }
  x.restore();
}

/** The lid frames' box in the mock frame (everything bruteLids draws, with room for the strokes). */
export const LID_BOX = { x: -90, y: EYE.y - EYE.h * 1.3 - 6, w: 180, h: EYE.h * 2.2 + 12 };
/** The iris sprite's box in the mock frame (at look 0). */
export const IRIS_BOX = { x: -34, y: EYE.y - 28, w: 68, h: 68 };

const BTOES: [number, number, number, number][] = [[-80, 270, 20, 23], [-44, 281, 22, 25], [-6, 288, 24, 27], [34, 290, 26, 29], [80, 286, 33, 35]];

/** Graduated toes, big toe on the right, each with a sharp hooked claw-nail of yellowed horn past its tip. */
function bruteToes(x: Ctx, base: string): void {
  for (const [tx, ty, rx, ry] of BTOES) {
    const g = x.createRadialGradient(tx - rx * 0.35, ty - ry * 0.45, 2, tx, ty, Math.max(rx, ry) * 1.1);
    g.addColorStop(0, shade(base, 0.3));
    g.addColorStop(0.55, base);
    g.addColorStop(1, shade(base, -0.6));
    x.fillStyle = g;
    x.beginPath();
    x.ellipse(tx, ty, rx, ry, 0, 0, 7);
    x.fill();
    x.strokeStyle = MINK;
    x.lineWidth = 5;
    x.stroke();
    x.strokeStyle = 'rgba(0,0,0,.4)';
    x.lineWidth = 2;
    x.beginPath();
    x.ellipse(tx, ty - ry * 0.2, rx * 0.7, ry * 0.66, 0, 3.4, 6);
    x.stroke();
    const nw = rx * 0.62;
    const top = ty - ry * 0.05;
    const tip = ty + ry * 1.42;
    const hook = rx * 0.12;
    const ng = x.createLinearGradient(tx - nw, top, tx + nw, tip);
    ng.addColorStop(0, '#e6d8a8');
    ng.addColorStop(0.45, '#b39a5e');
    ng.addColorStop(1, '#3e2c14');
    x.fillStyle = ng;
    x.beginPath();
    x.moveTo(tx - nw, top + ry * 0.08);
    x.quadraticCurveTo(tx, top - ry * 0.22, tx + nw, top + ry * 0.08);
    x.bezierCurveTo(tx + nw * 0.95, ty + ry * 0.6, tx + nw * 0.35, ty + ry * 1.1, tx + hook, tip);
    x.bezierCurveTo(tx - nw * 0.25, ty + ry * 1.05, tx - nw * 0.9, ty + ry * 0.62, tx - nw, top + ry * 0.08);
    x.closePath();
    x.fill();
    x.strokeStyle = MINK;
    x.lineWidth = 2.5;
    x.stroke();
    x.strokeStyle = 'rgba(255,250,225,.75)';
    x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(tx - nw * 0.55, top + ry * 0.15);
    x.bezierCurveTo(tx - nw * 0.5, ty + ry * 0.6, tx - nw * 0.15, ty + ry * 1.0, tx + hook * 0.6, tip - 3);
    x.stroke();
    x.strokeStyle = 'rgba(40,26,10,.55)';
    x.lineWidth = 1.2;
    for (const f of [0.3, 0.55]) {
      x.beginPath();
      x.moveTo(tx - nw * 0.8, ty + ry * f);
      x.quadraticCurveTo(tx, ty + ry * (f + 0.12), tx + nw * 0.8, ty + ry * f);
      x.stroke();
    }
  }
}

/** The iron ankle band with three rivets. */
function ironBand(x: Ctx): void {
  const g = x.createLinearGradient(0, -6, 0, 22);
  g.addColorStop(0, '#6d727b');
  g.addColorStop(1, '#2a2c31');
  x.fillStyle = g;
  x.beginPath();
  x.roundRect(-70, -8, 140, 30, 8);
  x.fill();
  x.strokeStyle = MINK;
  x.lineWidth = 5;
  x.stroke();
  x.fillStyle = '#b9bec6';
  for (const bx of [-50, 0, 50]) {
    x.beginPath();
    x.arc(bx, 7, 5, 0, 7);
    x.fill();
  }
}

export const bruteHideColour = (art: FootArt) => art.primary ?? '#7a838f';

/** The Brute minus its live eye parts (iris and lids): what play draws under the eye sprites. */
export function bruteBody(ctx: Ctx, art: FootArt): void {
  const base = bruteHideColour(art);
  mock(ctx, BRUTE, () => {
    bruteHide(ctx, base);
    bruteSocket(ctx);
    lidShadow(ctx);
    bruteToes(ctx, base);
    ironBand(ctx);
  });
}

function drawBrute(ctx: Ctx, art: FootArt): void {
  const base = bruteHideColour(art);
  mock(ctx, BRUTE, () => {
    bruteHide(ctx, base);
    bruteSocket(ctx);
    bruteIris(ctx, 0);
    lidShadow(ctx);
    bruteLids(ctx, base, 0);
    bruteToes(ctx, base);
    ironBand(ctx);
  });
}

registerKind('p_immortal', { draw: drawImmortal, contactY: IMM.contactY, halfWidth: 82 });
registerKind('lx_brute', { draw: drawBrute, contactY: BRUTE.contactY, halfWidth: 112 });
