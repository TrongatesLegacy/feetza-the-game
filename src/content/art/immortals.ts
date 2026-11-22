// Art for the Immortals: the Immortal Sandals (src/content/feet/persians.ts) and their champion, the Immortal Brute
// (src/content/feet/leonidas.ts). Ported from the approved mockup (scratchpad immortal/mock4.html), so most of the
// drawing below is in the mockup's own coordinates: x = 0 is the foot's centre line, y = 0 the top of the ankle
// (the wrap or the iron band), toes near y = 300. `mock()` maps that frame onto the design frame (centre CX, ankle
// at y = -6, sole at contactY).
//
// Style pass ("darker, grittier, more menacing"): cold, desaturated steel and hide under the kit's one top-left key
// light and its cool rim light (src/art/style/kit.ts), outlines in a cold ink.
//
// - Immortal Sandals: a polished chrome leg, a dark cloth head-wrap wound round the ankle in folded bands and knotted
//   at the side, a chrome war mask, a gorget of dark lamellar plates under its chin, and under it all a foot made of
//   black smoke. The mask is mirror chrome: each plane of the face reflects the sky, a hard horizon or the dark
//   ground, with hard speculars, scratches and a cold rim. It scowls: heavy brow ridges pressed down into a V, hollow
//   black sockets, a long nose, gaunt cheeks and a downturned open snarl. The smoke is live in play
//   (src/game/footLive.ts): the body boils through pre-drawn frames and particles pour off the toes, the sides, the
//   lamellar's edge, the eyes and the mouth.
// - Immortal Brute: veined, wrinkled, leathery grey hide over a lumpy skull, one great deep-set eye under a furrowed,
//   scowling brow, a maw of jagged, uneven fangs, hooked claw-nails and an iron ankle band. In play the eye looks
//   about and blinks, and black smoke seeps from round it and from the maw (footLive.ts).
//
// The texture each kind registers is the whole foot at rest (the Peel Locker, the Pizzapedia and the boss lab show
// it); footLive.ts draws the in-play variants (the foot minus its live parts) with the exported painters here.
// The grit and mottling below come from fixed seeds, so every texture of a foot comes out the same.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type StyleToe, poseToes } from '../../art/style/anatomy';
import { LIGHT, type Pose, REST } from '../../art/style/kit';
import type { Ctx } from '../../art/util';
import { mix, rgba, shade } from '../../art/util';

/** The Immortals' ink: the kit's ink cooled towards their steel. */
const MINK = '#0d0f14';

/** A mockup-to-design mapping: design = (CX + x·k, y0 + y·k). */
export interface MockFrame {
  k: number;
  y0: number;
  contactY: number;
}

/** The Immortal Sandals: wrap top (mock y −32) at design y −6, toe tips (mock ~300) round the contact line. */
export const IMM: MockFrame = { k: 0.86, y0: 21.5, contactY: 278 };
/** The head-wrap: a third taller than the mockup's scarf (Tron's call), reaching up over the chrome leg; its bottom
 * edge still sits on the mask's forehead. Wound round in `wraps` folded bands. */
export const SCARF = { top: -32, h: 62, w: 96, wraps: 4 };
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

/** A fixed-seed generator for the painted grit (the same texture every time it's drawn). */
function seeded(s: number): () => number {
  let seed = s;
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
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

// ——— shared painting helpers ———

type P = [number, number];

/** A smooth open path through points (midpoint quadratics). */
function smooth(x: Ctx, pts: P[]): void {
  x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    x.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
  }
  const l = pts[pts.length - 1];
  x.lineTo(l[0], l[1]);
}

function line(x: Ctx, pts: P[], w: number, col: string | CanvasGradient, dx = 0, dy = 0): void {
  x.save();
  x.translate(dx, dy);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.strokeStyle = col;
  x.lineWidth = w;
  x.beginPath();
  smooth(x, pts);
  x.stroke();
  x.restore();
}

/** A crease cut into a surface lit from the top left: a dark groove, its lower lip catching the light. */
function crease(x: Ctx, pts: P[], w: number, a = 1): void {
  line(x, pts, w, `rgba(3,4,8,${0.62 * a})`);
  line(x, pts, w * 0.42, `rgba(222,230,244,${0.26 * a})`, 0.5, w * 0.72);
}

/** A raised vein: its cast shadow, the vein, and a thin highlight on its lit side. */
function vein(x: Ctx, pts: P[], w: number, col: string): void {
  line(x, pts, w + 3, 'rgba(3,4,8,.18)', 1.4, 2.4);
  line(x, pts, w + 1, 'rgba(3,4,8,.3)', 0.8, 1.4);
  line(x, pts, w, col);
  line(x, pts, w * 0.55, rgba(shade(col, 0.18), 0.8), -w * 0.12, -w * 0.16);
  line(x, pts, w * 0.22, 'rgba(226,234,248,.32)', -w * 0.24, -w * 0.3);
}

/** A hard four-point specular glint. */
function glint(x: Ctx, gx: number, gy: number, r: number, a = 1): void {
  x.save();
  const g = x.createRadialGradient(gx, gy, 0, gx, gy, r * 0.8);
  g.addColorStop(0, `rgba(255,255,255,${0.7 * a})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.beginPath();
  x.arc(gx, gy, r * 0.8, 0, 7);
  x.fill();
  x.fillStyle = `rgba(255,255,255,${a})`;
  x.beginPath();
  x.moveTo(gx, gy - r);
  x.quadraticCurveTo(gx, gy, gx + r * 0.6, gy);
  x.quadraticCurveTo(gx, gy, gx, gy + r);
  x.quadraticCurveTo(gx, gy, gx - r * 0.6, gy);
  x.quadraticCurveTo(gx, gy, gx, gy - r);
  x.fill();
  x.restore();
}

function curvePlane(x: Ctx, draw: () => void, fill: string | CanvasGradient): void {
  x.fillStyle = fill;
  x.beginPath();
  draw();
  x.fill();
}

function grad(x: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = x.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

// ════════════════════════════ IMMORTAL SANDALS ════════════════════════════

export interface ImmortalLook {
  dark: string;
  light: string;
  /** The pale grey of the smoke's curls, as "r,g,b". */
  curl: string;
}

export function immortalLook(art: FootArt): ImmortalLook {
  return { dark: art.primary ?? '#262b33', light: art.secondary ?? '#c3cbd6', curl: String(art.extra?.curl ?? '112,120,136') };
}

/** The mask's top, scale and the y of its armour edge (for the smoke that pours out from under it). */
export const MASK = { my: -2, ms: 1 };
/** Where smoke streams from the mask: the eye sockets' centres (±x, y) and the mouth's (y). */
export const MASK_HOLES = { eyeX: 46, eyeY: 76, mouthY: 160 };

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

/** The mask's bottom edge at mock x (it arches up in the middle, like the mouth). */
export function maskEdge(px: number): number {
  return 186 + 20 * Math.pow(Math.min(1, Math.abs(px) / 84), 1.6);
}

/** The lamellar gorget's lowest edge at mock x (where the smoke pours out from under the armour). */
export function gorgetBottom(px: number): number {
  return maskEdge(px) + 36;
}

/** The chrome war mask. Every plane is a mirror: the brow's top and the forehead catch the sky, the cheekbones a hard
 * horizon, the hollows and the under-planes the dark ground, the lower lip and the chin a bright bounce. It scowls:
 * heavy brow ridges pressed down into a V with a knotted glabella, hollow black sockets slanting down to the nose,
 * gaunt cheeks, deep snarl folds and a wide, downturned open mouth. Scratched, with hard glints and a cold rim. */
function warMask(x: Ctx, o: ImmortalLook): void {
  const pale = o.light;
  const deep = o.dark;
  const rnd = seeded(23);
  x.save();
  x.lineCap = 'round';
  x.lineJoin = 'round';
  // the base: sky, a hard horizon low across the face, the dark ground, a bright bounce at the chin
  maskPath(x);
  x.fillStyle = grad(x, 0, -10, 0, 206, [
    [0, '#f6f9fd'], [0.2, pale], [0.4, shade(pale, -0.32)], [0.47, shade(deep, -0.25)], [0.6, shade(pale, -0.55)],
    [0.84, shade(pale, -0.18)], [1, shade(deep, -0.1)],
  ]);
  x.fill();
  x.save();
  maskPath(x);
  x.clip();
  // the sides turn away: the lit side mirrors a bright window in a hard-edged streak, the far side the dark ground
  curvePlane(x, () => {
    x.moveTo(-92, 40);
    x.bezierCurveTo(-80, 90, -78, 150, -84, 206);
    x.lineTo(-74, 200);
    x.bezierCurveTo(-68, 150, -70, 96, -80, 40);
    x.closePath();
  }, grad(x, 0, 40, 0, 206, [[0, 'rgba(255,255,255,.95)'], [0.45, 'rgba(255,255,255,.75)'], [0.5, 'rgba(20,24,32,.6)'], [1, 'rgba(255,255,255,.4)']]));
  curvePlane(x, () => {
    x.moveTo(94, 40);
    x.bezierCurveTo(82, 90, 80, 150, 84, 206);
    x.lineTo(70, 198);
    x.bezierCurveTo(66, 150, 68, 96, 78, 40);
    x.closePath();
  }, grad(x, 0, 40, 0, 206, [[0, rgba(o.dark, 0.5)], [0.5, 'rgba(2,3,6,.75)'], [1, rgba(o.dark, 0.6)]]));
  // the forehead's dome in the V between the brows: a soft sky reflection
  const fg = x.createRadialGradient(-10, 40, 2, -4, 46, 34);
  fg.addColorStop(0, 'rgba(255,255,255,.9)');
  fg.addColorStop(1, 'rgba(255,255,255,0)');
  curvePlane(x, () => x.ellipse(-4, 46, 34, 16, 0, 0, 7), fg);
  // forehead furrows, bent into the scowl's V
  crease(x, [[-22, 40], [-8, 50], [0, 52], [8, 50], [22, 40]], 2.4, 0.8);
  crease(x, [[-14, 32], [0, 42], [14, 32]], 2, 0.6);
  // the brow ridges: heavy lumps pressed down at the centre (the scowl), sky on top, horizon on the face, ground under
  for (const s of [-1, 1]) {
    const lit = s < 0;
    const brow = () => {
      x.moveTo(s * 3, 58);
      x.bezierCurveTo(s * 22, 40, s * 56, 30, s * 94, 34);
      x.lineTo(s * 94, 54);
      x.bezierCurveTo(s * 62, 50, s * 30, 60, s * 8, 80);
      x.closePath();
    };
    // its shadow falls into the socket
    x.save();
    x.translate(s * 1, 7);
    curvePlane(x, brow, 'rgba(2,3,6,.55)');
    x.restore();
    curvePlane(x, brow, grad(x, s * 40, 34, s * 50, 72, [
      [0, lit ? '#ffffff' : shade(pale, 0.2)], [0.3, pale], [0.5, shade(pale, -0.3)], [0.56, shade(deep, -0.3)],
      [0.75, shade(pale, -0.5)], [1, shade(deep, -0.45)],
    ]));
    // the crest's hard specular
    line(x, [[s * 6, 54], [s * 24, 40], [s * 56, 32], [s * 90, 35]], lit ? 3 : 2, lit ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.55)');
    // a sharp-edged window reflection on the lit brow
    if (lit) curvePlane(x, () => {
      x.moveTo(-28, 42);
      x.lineTo(-58, 35);
      x.lineTo(-62, 40);
      x.lineTo(-32, 48);
      x.closePath();
    }, 'rgba(255,255,255,.8)');
  }
  // the glabella: a pinched knot between the brows, cut by two deep vertical furrows
  const kg = x.createRadialGradient(-3, 56, 1, 0, 62, 12);
  kg.addColorStop(0, rgba(pale, 0.9));
  kg.addColorStop(0.6, rgba(shade(pale, -0.3), 0.6));
  kg.addColorStop(1, rgba(deep, 0));
  curvePlane(x, () => x.ellipse(0, 62, 7, 12, 0, 0, 7), kg);
  for (const s of [-1, 1]) crease(x, [[s * 6, 40], [s * 8, 56], [s * 6, 76]], 2.6);
  // the eye sockets: hollow black, slanting down to the nose under the pressed-down brow
  for (const s of [-1, 1]) {
    const eg = x.createRadialGradient(s * 44, 76, 4, s * 44, 76, 40);
    eg.addColorStop(0, '#000');
    eg.addColorStop(0.55, 'rgba(2,3,5,.9)');
    eg.addColorStop(1, 'rgba(2,3,5,0)');
    curvePlane(x, () => {
      x.moveTo(s * 8, 78);
      x.bezierCurveTo(s * 26, 62, s * 64, 50, s * 92, 54);
      x.bezierCurveTo(s * 86, 90, s * 52, 108, s * 14, 92);
      x.closePath();
    }, eg);
    curvePlane(x, () => {
      x.moveTo(s * 14, 80);
      x.bezierCurveTo(s * 30, 68, s * 60, 58, s * 82, 60);
      x.bezierCurveTo(s * 74, 86, s * 46, 98, s * 20, 90);
      x.closePath();
    }, '#000');
    // the socket's lower bevel catches a thin line of light
    line(x, [[s * 22, 93], [s * 48, 98], [s * 76, 82]], 1.6, s < 0 ? 'rgba(255,255,255,.7)' : 'rgba(220,230,245,.3)', 0, 2);
  }
  // the cheekbones: sharp planes under the sockets, mirroring a hard horizon
  for (const s of [-1, 1]) {
    const lit = s < 0;
    curvePlane(x, () => {
      x.moveTo(s * 26, 106);
      x.bezierCurveTo(s * 50, 100, s * 74, 90, s * 94, 76);
      x.lineTo(s * 94, 100);
      x.bezierCurveTo(s * 80, 116, s * 60, 124, s * 36, 122);
      x.closePath();
    }, grad(x, 0, 80, 0, 124, [
      [0, lit ? '#ffffff' : shade(pale, 0.1)], [0.42, lit ? pale : shade(pale, -0.25)], [0.47, shade(deep, -0.35)], [0.62, shade(pale, -0.5)],
      [1, shade(deep, -0.2)],
    ]));
    line(x, [[s * 30, 106], [s * 56, 99], [s * 92, 78]], lit ? 2.4 : 1.6, lit ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.45)');
    // the gaunt hollow under it, falling into the dark ground
    curvePlane(x, () => {
      x.moveTo(s * 36, 124);
      x.bezierCurveTo(s * 62, 122, s * 84, 108, s * 96, 100);
      x.lineTo(s * 94, 156);
      x.bezierCurveTo(s * 84, 176, s * 70, 184, s * 60, 182);
      x.bezierCurveTo(s * 62, 160, s * 54, 138, s * 36, 124);
      x.closePath();
    }, grad(x, s * 40, 120, s * 80, 170, [[0, 'rgba(4,6,10,.15)'], [0.5, 'rgba(4,6,10,.6)'], [1, 'rgba(4,6,10,.35)']]));
  }
  // the nose: a long bridge, the lit side a bright mirror, the far side the ground; wide flared wings
  curvePlane(x, () => {
    x.moveTo(-5, 74);
    x.bezierCurveTo(-8, 94, -20, 112, -32, 126);
    x.bezierCurveTo(-20, 134, -8, 134, 0, 132);
    x.lineTo(0, 74);
    x.closePath();
  }, grad(x, -32, 0, 0, 0, [[0, shade(pale, -0.2)], [0.6, pale], [1, '#ffffff']]));
  curvePlane(x, () => {
    x.moveTo(5, 74);
    x.bezierCurveTo(8, 94, 20, 112, 32, 126);
    x.bezierCurveTo(20, 134, 8, 134, 0, 132);
    x.lineTo(0, 74);
    x.closePath();
  }, grad(x, 0, 0, 32, 0, [[0, shade(pale, -0.3)], [0.35, shade(deep, -0.1)], [1, shade(deep, -0.45)]]));
  curvePlane(x, () => {
    x.moveTo(-1, 84);
    x.quadraticCurveTo(-3, 104, -6, 122);
    x.lineTo(-1, 125);
    x.quadraticCurveTo(-0.5, 104, 0, 84);
    x.closePath();
  }, 'rgba(255,255,255,.95)');
  // the scowl wrinkles the bridge
  crease(x, [[-8, 86], [0, 90], [8, 86]], 1.8, 0.8);
  crease(x, [[-9, 95], [0, 99], [9, 95]], 1.6, 0.6);
  for (const s of [-1, 1]) {
    curvePlane(x, () => x.ellipse(s * 26, 123, 8, 8, s * 0.3, 0, 7), grad(x, s * 18, 114, s * 34, 132, s < 0 ? [[0, shade(pale, -0.05)], [1, shade(pale, -0.5)]] : [[0, shade(pale, -0.45)], [1, shade(deep, -0.45)]]));
    curvePlane(x, () => x.ellipse(s * 16, 129, 9, 4.5, s * 0.45, 0, 7), '#010203');
  }
  // the snarl folds: deep furrows from the nose's wings, round the mouth, down to the jaw
  for (const s of [-1, 1]) {
    curvePlane(x, () => {
      x.moveTo(s * 32, 126);
      x.bezierCurveTo(s * 52, 138, s * 62, 164, s * 58, 194);
      x.lineTo(s * 50, 194);
      x.bezierCurveTo(s * 52, 168, s * 46, 146, s * 28, 132);
      x.closePath();
    }, 'rgba(2,3,6,.75)');
    line(x, [[s * 36, 124], [s * 60, 140], [s * 68, 168], [s * 64, 196]], s < 0 ? 2.6 : 1.8, s < 0 ? 'rgba(255,255,255,.85)' : 'rgba(225,232,245,.4)');
  }
  // the mouth: a wide, downturned, open snarl, the upper lip hitched up at its centre; the lips bright, the hole black
  const mouth = () => {
    x.moveTo(-54, 188);
    x.bezierCurveTo(-50, 166, -36, 148, -17, 142);
    x.quadraticCurveTo(-7, 139, 0, 145);
    x.quadraticCurveTo(7, 139, 17, 142);
    x.bezierCurveTo(36, 148, 50, 166, 54, 188);
    x.bezierCurveTo(38, 177, 18, 171, 0, 171);
    x.bezierCurveTo(-18, 171, -38, 177, -54, 188);
    x.closePath();
  };
  x.beginPath();
  mouth();
  x.lineWidth = 7;
  x.strokeStyle = grad(x, -54, 0, 54, 0, [[0, 'rgba(255,255,255,.6)'], [0.3, 'rgba(255,255,255,.85)'], [0.6, 'rgba(190,200,218,.35)'], [1, 'rgba(120,132,150,.2)']]);
  x.stroke();
  const mg = x.createRadialGradient(0, 160, 2, 0, 162, 52);
  mg.addColorStop(0, '#000');
  mg.addColorStop(1, '#06080c');
  curvePlane(x, mouth, mg);
  // the chin: a crease under the lip and a bright bounce on its bulge
  crease(x, [[-26, 186], [0, 181], [26, 186]], 2.4);
  const cg = x.createRadialGradient(-10, 192, 1, -6, 194, 22);
  cg.addColorStop(0, 'rgba(255,255,255,.85)');
  cg.addColorStop(1, 'rgba(255,255,255,0)');
  curvePlane(x, () => x.ellipse(-6, 194, 24, 8, 0, 0, 7), cg);
  // scratches and small dents: a mask that has seen battle
  x.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const px = (rnd() - 0.5) * 170;
    const py = 36 + rnd() * 168;
    const a = -0.4 + rnd() * 1.2;
    const len = 3 + rnd() * 12;
    x.strokeStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.2 + rnd() * 0.35})` : `rgba(4,6,10,${0.2 + rnd() * 0.3})`;
    x.lineWidth = 0.6 + rnd() * 0.6;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    x.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const px = (rnd() - 0.5) * 150;
    const py = 110 + rnd() * 80;
    curvePlane(x, () => x.ellipse(px, py, 2.6, 1.8, 0, 0, 7), 'rgba(4,6,10,.45)');
    line(x, [[px - 2, py + 1.5], [px + 2, py + 1.8]], 0.9, 'rgba(255,255,255,.6)');
  }
  // the light: the far side falls off towards the ground, then a cold rim along the right and the jaw
  maskPath(x);
  x.fillStyle = grad(x, -92, 0, 92, 0, [[0, 'rgba(255,255,255,.1)'], [0.45, 'rgba(0,0,0,0)'], [0.78, 'rgba(3,5,10,.3)'], [1, 'rgba(3,5,10,.5)']]);
  x.fill();
  maskPath(x);
  x.lineWidth = 12;
  x.strokeStyle = grad(x, -40, 20, 96, 210, [[0, rgba(LIGHT.rim, 0)], [0.62, rgba(LIGHT.rim, 0)], [1, rgba(LIGHT.rim, 0.8)]]);
  x.stroke();
  // the bevel: the mask's edge turning away
  maskPath(x);
  x.lineWidth = 5;
  x.strokeStyle = 'rgba(2,3,6,.55)';
  x.stroke();
  // hard glints
  glint(x, -60, 37, 10);
  glint(x, -70, 88, 8);
  glint(x, -6, 116, 6, 0.9);
  glint(x, -14, 193, 7, 0.85);
  glint(x, 70, 150, 5, 0.5);
  x.restore();
  maskPath(x);
  x.strokeStyle = MINK;
  x.lineWidth = 5;
  x.stroke();
  x.restore();
}

/** One lamella: a narrow steel plate with a rounded foot, bent down the middle, laced at the top. */
function lamella(x: Ctx, px: number, ty: number, w: number, len: number, tilt: number, o: ImmortalLook): void {
  x.save();
  x.translate(px, ty);
  x.rotate(tilt);
  const path = () => {
    x.beginPath();
    x.moveTo(-w / 2, 0);
    x.lineTo(w / 2, 0);
    x.lineTo(w / 2, len - w * 0.45);
    x.quadraticCurveTo(w / 2, len, 0, len);
    x.quadraticCurveTo(-w / 2, len, -w / 2, len - w * 0.45);
    x.closePath();
  };
  path();
  x.fillStyle = grad(x, -w / 2, 0, w / 2, len, [[0, shade(o.light, -0.3)], [0.3, shade(o.dark, 0.3)], [0.55, o.dark], [1, shade(o.dark, -0.6)]]);
  x.fill();
  // bent down the middle: the far half darker, a hard specular down the lit edge
  x.fillStyle = 'rgba(2,3,6,.32)';
  x.fillRect(w * 0.08, 0, w * 0.42, len);
  x.strokeStyle = 'rgba(255,255,255,.8)';
  x.lineWidth = 1.3;
  x.beginPath();
  x.moveTo(-w / 2 + 2, 3);
  x.lineTo(-w / 2 + 2, len - w * 0.55);
  x.stroke();
  x.fillStyle = 'rgba(255,255,255,.9)';
  x.beginPath();
  x.arc(-w / 2 + 2.4, len - w * 0.5, 1.3, 0, 7);
  x.fill();
  // lace holes
  x.fillStyle = '#030406';
  for (const hx of [-w * 0.22, w * 0.22]) {
    x.beginPath();
    x.arc(hx, 6, 1.3, 0, 7);
    x.fill();
  }
  path();
  x.strokeStyle = MINK;
  x.lineWidth = 1.5;
  x.stroke();
  x.restore();
}

/** The gorget under the mask's chin: two rows of dark lamellar plates, laced in rows, fanning slightly outward.
 * The smoke pours out from under its edge (gorgetBottom). */
function lamellar(x: Ctx, o: ImmortalLook): void {
  const W = 20;
  const L = 30;
  for (const r of [1, 0]) {
    const off = r ? 9.5 : 0;
    const n = r ? 9 : 10;
    for (let i = 0; i < n; i++) {
      const px = -85.5 + off + i * 19;
      lamella(x, px, maskEdge(px) - 10 + r * 17, W, L, -px * 0.003, o);
    }
    // the lacing cord along the row
    const pts: P[] = [];
    for (let px = -86 + off; px <= 86 - off; px += 8) pts.push([px, maskEdge(px) - 3 + r * 17]);
    line(x, pts, 2.6, '#14121a');
    line(x, pts, 1, 'rgba(200,210,230,.25)', -0.4, -0.8);
  }
  // the mask's shadow over the top row
  const pts: P[] = [];
  for (let px = -86; px <= 86; px += 8) pts.push([px, maskEdge(px) + 3]);
  line(x, pts, 10, 'rgba(2,3,6,.5)');
}

/** Toes of the smoke foot's body (x, y, rx, ry in the mock frame): big toe on the right, like the game's other feet.
 * The armoured toes (IMM_TOES) sit over them. */
const SMOKE_TOES: [number, number, number, number][] = [
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
  SMOKE_TOES.forEach(([tx, ty, rx, ry], i) => {
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
  c.fillStyle = 'rgba(6,7,11,.4)';
  footShape(c, t, 8);
  c.fill();
  c.fillStyle = 'rgba(4,5,8,.95)';
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
    const a = SMOKE_TOES[i];
    const b = SMOKE_TOES[i + 1];
    const gx = (a[0] + a[2] + b[0] - b[2]) / 2;
    const gy = (a[1] + b[1]) / 2 + 10;
    c.fillStyle = 'rgba(0,0,0,.9)';
    c.beginPath();
    c.ellipse(gx, gy, 3, 17, 0, 0, 7);
    c.fill();
  }
  for (const [tx, ty, rx, ry] of SMOKE_TOES) {
    c.fillStyle = `rgba(${o.curl},.38)`;
    c.beginPath();
    c.ellipse(tx - rx * 0.3, ty + ry * 0.1, rx * 0.35, ry * 0.28, 0, 0, 7);
    c.fill();
  }
  // the mockup blurs this layer by 2.5 px on a card drawn at 0.82
  blurDraw(ctx, L, (2.5 / 0.82) * pxPerUnit(ctx));
}

const CLOTH = { hi: '#4a5260', lit: '#2c313b', mid: '#1a1d24', deep: '#08090c' };

/** The dark head-wrap wound round the ankle: `wraps` bands of cloth, each crossing the last at a slight slant, lit
 * on top and tucked under the next, pulled into tension folds towards a knot at the side; two tails hang from the
 * knot over the mask's cheek. Call inside mock(IMM). */
function headWrap(x: Ctx, top: number, h: number, w: number, wraps: number): void {
  const rnd = seeded(5);
  const sil = () => {
    x.beginPath();
    x.moveTo(-w + 8, top);
    x.lineTo(w - 8, top);
    x.bezierCurveTo(w + 4, top + h * 0.5, w + 6, top + h * 0.85, w, top + h);
    x.bezierCurveTo(w * 0.4, top + h + 12, -w * 0.3, top + h + 4, -w - 2, top + h + 8);
    x.bezierCurveTo(-w - 8, top + h * 0.6, -w - 2, top + h * 0.3, -w + 8, top);
    x.closePath();
  };
  x.save();
  x.lineCap = 'round';
  x.lineJoin = 'round';
  sil();
  x.fillStyle = CLOTH.deep;
  x.fill();
  x.save();
  sil();
  x.clip();
  const bh = (h + 14) / wraps;
  // a band's edge at mock x: bowed round the ankle, slanted one way then the other
  const edge = (px: number, base: number, i: number) => base + (i % 2 ? 5 : -5) * (px / w) + 6 * (1 - (px / w) ** 2);
  for (let i = 0; i < wraps; i++) {
    const t0 = top - 4 + i * bh;
    const band = () => {
      x.beginPath();
      for (let px = -w - 12; px <= w + 12; px += 6) x.lineTo(px, edge(px, t0, i));
      for (let px = w + 12; px >= -w - 12; px -= 6) x.lineTo(px, edge(px, t0 + bh + 7, i));
      x.closePath();
    };
    band();
    x.fillStyle = grad(x, 0, t0, 0, t0 + bh + 7, [[0, CLOTH.hi], [0.16, CLOTH.lit], [0.55, CLOTH.mid], [1, CLOTH.deep]]);
    x.fill();
    // tension folds, slanting towards the knot on the right
    x.save();
    band();
    x.clip();
    // (pulled towards the knot: each fold runs along the pull, longer and straighter nearer the knot)
    const kx = w - 10;
    const ky = top + h - 6;
    for (let k = 0; k < 3; k++) {
      const fx = -w + 16 + k * 58 + rnd() * 34;
      const fy = t0 + bh * (0.25 + rnd() * 0.5);
      const dx = kx - fx;
      const dy = ky - fy;
      const d = Math.hypot(dx, dy);
      const len = 22 + rnd() * 18 + (1 - d / (w * 2)) * 14;
      const ux = dx / d;
      const uy = dy / d;
      const bow = (rnd() - 0.5) * 8;
      const pts: P[] = [[fx - ux * len * 0.5, fy - uy * len * 0.5], [fx - uy * bow, fy + ux * bow], [fx + ux * len * 0.5, fy + uy * len * 0.5]];
      line(x, pts, 11, 'rgba(0,0,0,.22)', 0, 2.5);
      line(x, pts, 3, 'rgba(0,0,0,.45)');
      line(x, pts, 2.4, 'rgba(150,166,195,.2)', uy * 3.2, -ux * 3.2);
    }
    x.restore();
    // the lit top edge of the band
    const pts: P[] = [];
    for (let px = -w; px <= w; px += 12) pts.push([px, edge(px, t0, i) + 1.5]);
    line(x, pts, 1.4, 'rgba(190,205,232,.35)');
  }
  // the weave
  for (let i = 0; i < 700; i++) {
    x.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${rnd() * 0.25})` : `rgba(190,205,230,${rnd() * 0.07})`;
    x.fillRect((rnd() - 0.5) * w * 2.2, top + rnd() * (h + 14), 1.2, 1.2);
  }
  // the light falls off to the right; a cold rim on the far edge
  x.fillStyle = grad(x, -w, 0, w + 6, 0, [[0, 'rgba(255,255,255,.04)'], [0.5, 'rgba(0,0,0,0)'], [0.85, 'rgba(0,0,0,.3)'], [0.94, rgba(LIGHT.rim, 0.05)], [1, rgba(LIGHT.rim, 0.32)]]);
  x.fillRect(-w - 10, top - 4, w * 2 + 20, h + 20);
  x.restore();
  sil();
  x.strokeStyle = MINK;
  x.lineWidth = 5;
  x.stroke();
  // the tails hanging from the knot, with their shadow on the mask
  const tails = () => {
    x.beginPath();
    x.moveTo(w - 16, top + h - 4);
    x.bezierCurveTo(w + 20, top + h + 14, w + 26, top + h + 54, w + 12, top + h + 84);
    x.lineTo(w + 6, top + h + 78);
    x.lineTo(w + 2, top + h + 86);
    x.lineTo(w - 4, top + h + 76);
    x.bezierCurveTo(w + 8, top + h + 46, w - 2, top + h + 20, w - 28, top + h + 6);
    x.closePath();
    x.moveTo(w - 24, top + h + 2);
    x.bezierCurveTo(w - 30, top + h + 24, w - 20, top + h + 44, w - 26, top + h + 60);
    x.lineTo(w - 31, top + h + 55);
    x.lineTo(w - 36, top + h + 58);
    x.bezierCurveTo(w - 34, top + h + 38, w - 42, top + h + 20, w - 36, top + h + 4);
    x.closePath();
  };
  x.save();
  x.translate(-4, 6);
  tails();
  x.fillStyle = 'rgba(2,3,6,.45)';
  x.fill();
  x.restore();
  tails();
  x.fillStyle = grad(x, w - 40, 0, w + 26, 0, [[0, CLOTH.lit], [0.45, CLOTH.mid], [1, CLOTH.deep]]);
  x.fill();
  x.strokeStyle = MINK;
  x.lineWidth = 3.5;
  x.stroke();
  // their folds
  line(x, [[w - 6, top + h + 6], [w + 12, top + h + 34], [w + 6, top + h + 72]], 2.2, 'rgba(0,0,0,.6)');
  line(x, [[w - 10, top + h + 8], [w + 7, top + h + 34], [w + 1, top + h + 70]], 1.2, 'rgba(150,165,192,.25)');
  line(x, [[w - 30, top + h + 8], [w - 31, top + h + 30], [w - 29, top + h + 52]], 1.6, 'rgba(0,0,0,.55)');
  // the knot: bunched cloth, folds pulled into it
  const kx = w - 10;
  const ky = top + h - 6;
  const kg = x.createRadialGradient(kx - 5, ky - 5, 1, kx, ky, 15);
  kg.addColorStop(0, CLOTH.hi);
  kg.addColorStop(0.5, CLOTH.lit);
  kg.addColorStop(1, CLOTH.deep);
  x.fillStyle = kg;
  x.beginPath();
  x.ellipse(kx, ky, 15, 12, -0.3, 0, 7);
  x.fill();
  x.strokeStyle = MINK;
  x.lineWidth = 3.5;
  x.stroke();
  for (const [a, b, c, d] of [[-12, -4, -3, 0], [-8, 8, -1, 3], [10, -8, 3, -2]]) line(x, [[kx + a, ky + b], [kx + c, ky + d]], 1.8, 'rgba(0,0,0,.6)');
  line(x, [[kx - 9, ky - 6], [kx - 2, ky - 9]], 1.4, 'rgba(190,205,232,.4)');
  x.restore();
}

// ——— the armoured toes ———
//
// Each foot's toes are StyleToes (src/art/style/anatomy.ts) laid out in its mock frame, offset by CX so the kit's
// poseToes curls, splays and spreads them about the centre line exactly as it does for the redrawn feet. footLive.ts
// draws them as a toe band at the live kit's curl poses (curled on the wind-up, splayed on landing).

/** Rest toes in a mock frame (x, y, rx, ry, rot), little toe first, as StyleToes centred on CX. */
function styleToes(rest: [number, number, number, number, number][]): StyleToe[] {
  return rest.map(([cx, cy, rx, ry, rot]) => ({ cx: CX + cx, cy, rx, ry, rot }));
}

/** The Immortal's armoured toes at rest (mock frame), big toe on the right. */
const IMM_REST = styleToes([
  [-70, 265, 16.5, 25, 0.25],
  [-38, 274, 19, 28.5, 0.12],
  [-3, 279, 20.5, 31, 0.04],
  [33, 280, 22, 32, -0.03],
  [74, 273, 27.5, 36, -0.1],
]);

/** The armoured toes at rest as [x, y, rx, ry] in the mock frame (where the smoke boils off them in play). */
export const TOES: [number, number, number, number][] = IMM_REST.map((t) => [t.cx - CX, t.cy, t.rx, t.ry]);

/** The box the Immortal's toe band covers (mock frame), with room for curl, splay and outlines. */
export const IMM_TOE_BOX = { x: -112, y: 214, w: 224, h: 112 };

/** Run `fn` in a toe's own frame: origin at its centre, y running from its root (−ry) to its tip (+ry). */
function inToeFrame(x: Ctx, t: StyleToe, fn: () => void): void {
  x.save();
  x.translate(t.cx - CX, t.cy);
  x.rotate(t.rot);
  fn();
  x.restore();
}

/** One armoured toe: dark steel scales over it, rows overlapping down the toe, and a polished chrome cap on its tip
 * (sky, a hard horizon, a bright bounce, a hard glint), riveted on, with a cold rim. */
function armouredToe(x: Ctx, t: StyleToe, o: ImmortalLook, big: boolean): void {
  inToeFrame(x, t, () => {
    const { rx, ry } = t;
    const toe = () => {
      x.beginPath();
      x.ellipse(0, 0, rx, ry, 0, 0, 7);
    };
    toe();
    x.fillStyle = grad(x, -rx, -ry, rx, ry, [[0, shade(o.dark, 0.25)], [0.5, o.dark], [1, shade(o.dark, -0.6)]]);
    x.fill();
    x.save();
    toe();
    x.clip();
    // the scales: rows from the root down, each row overlapping the one below it
    const sw = rx * 0.66;
    const sh = ry * 0.42;
    for (let r = 2; r >= 0; r--) {
      const y0 = -ry * 1.02 + r * sh * 0.78;
      const off = r % 2 ? sw * 0.5 : 0;
      for (let sx = -rx - off; sx <= rx + sw; sx += sw * 0.9) {
        const scale = () => {
          x.beginPath();
          x.moveTo(sx - sw / 2, y0);
          x.lineTo(sx + sw / 2, y0);
          x.lineTo(sx + sw / 2, y0 + sh * 0.55);
          x.quadraticCurveTo(sx + sw / 2, y0 + sh, sx, y0 + sh);
          x.quadraticCurveTo(sx - sw / 2, y0 + sh, sx - sw / 2, y0 + sh * 0.55);
          x.closePath();
        };
        scale();
        x.fillStyle = grad(x, sx - sw / 2, y0, sx + sw / 2, y0 + sh, [[0, shade(o.light, -0.3)], [0.35, shade(o.dark, 0.3)], [1, shade(o.dark, -0.55)]]);
        x.fill();
        x.strokeStyle = MINK;
        x.lineWidth = 1.2;
        x.stroke();
        line(x, [[sx - sw / 2 + 1.6, y0 + 2], [sx - sw / 2 + 1.6, y0 + sh * 0.5], [sx - sw * 0.1, y0 + sh * 0.92]], 1.1, 'rgba(255,255,255,.7)');
      }
    }
    // the chrome cap over the tip
    const capTop = ry * 0.12;
    const cap = () => {
      x.beginPath();
      x.moveTo(-rx * 1.1, capTop + ry * 0.14);
      x.quadraticCurveTo(0, capTop - ry * 0.12, rx * 1.1, capTop + ry * 0.14);
      x.lineTo(rx * 1.1, ry * 1.2);
      x.lineTo(-rx * 1.1, ry * 1.2);
      x.closePath();
    };
    cap();
    x.fillStyle = grad(x, 0, capTop - ry * 0.1, 0, ry, [
      [0, '#f6f9fd'], [0.3, o.light], [0.46, shade(o.light, -0.3)], [0.52, shade(o.dark, -0.3)], [0.72, shade(o.light, -0.5)], [1, shade(o.light, -0.15)],
    ]);
    x.fill();
    x.save();
    cap();
    x.clip();
    x.fillStyle = grad(x, -rx, 0, rx, 0, [[0, 'rgba(255,255,255,.18)'], [0.45, 'rgba(0,0,0,0)'], [0.8, 'rgba(3,5,10,.35)'], [1, 'rgba(3,5,10,.5)']]);
    x.fillRect(-rx * 1.2, capTop - ry * 0.2, rx * 2.4, ry * 1.5);
    // the cold rim round the tip's lower right
    x.lineWidth = rx * 0.32;
    x.strokeStyle = rgba(LIGHT.rim, 0.65);
    x.beginPath();
    x.ellipse(0, 0, rx, ry, 0, -0.1, 1.4);
    x.stroke();
    // a hard window reflection down the lit side
    x.fillStyle = 'rgba(255,255,255,.85)';
    x.beginPath();
    x.moveTo(-rx * 0.62, capTop + ry * 0.16);
    x.quadraticCurveTo(-rx * 0.78, ry * 0.55, -rx * 0.5, ry * 0.86);
    x.lineTo(-rx * 0.38, ry * 0.8);
    x.quadraticCurveTo(-rx * 0.6, ry * 0.52, -rx * 0.46, capTop + ry * 0.14);
    x.closePath();
    x.fill();
    x.restore();
    // the cap's rolled edge and its rivets
    x.beginPath();
    x.moveTo(-rx * 1.1, capTop + ry * 0.14);
    x.quadraticCurveTo(0, capTop - ry * 0.12, rx * 1.1, capTop + ry * 0.14);
    x.strokeStyle = MINK;
    x.lineWidth = 2.4;
    x.stroke();
    line(x, [[-rx * 0.8, capTop + ry * 0.06], [0, capTop - ry * 0.04], [rx * 0.5, capTop + ry * 0.03]], 1.2, 'rgba(255,255,255,.85)', 0, 1.6);
    for (const rvx of big ? [-0.45, 0, 0.45] : [-0.35, 0.35]) {
      const g = x.createRadialGradient(rx * rvx - 0.8, capTop + ry * 0.12 - 0.8, 0.2, rx * rvx, capTop + ry * 0.12, 2.6);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, '#8d97a6');
      g.addColorStop(1, '#1c2028');
      x.fillStyle = g;
      x.beginPath();
      x.arc(rx * rvx, capTop + ry * 0.12, 2.4, 0, 7);
      x.fill();
    }
    x.restore();
    glint(x, -rx * 0.42, ry * 0.42, big ? 6 : 4.5, 0.95);
    toe();
    x.strokeStyle = MINK;
    x.lineWidth = 3.6;
    x.stroke();
  });
}

/** A point in a toe's own frame, in the mock frame. */
function toePt(t: StyleToe, lx: number, ly: number): P {
  const c = Math.cos(t.rot);
  const s = Math.sin(t.rot);
  return [t.cx - CX + lx * c - ly * s, t.cy + lx * s + ly * c];
}

/** The sandal's straps: one across the toes' roots, studded in chrome, and a thong rising from between the big toe
 * and the next up under the lamellar. Follows the toes as they move. */
function sandalStraps(x: Ctx, toes: StyleToe[]): void {
  const pts: P[] = [toePt(toes[0], -toes[0].rx * 1.15, -toes[0].ry * 0.3)];
  for (const t of toes) pts.push(toePt(t, 0, -t.ry * 0.42));
  const b = toes[4];
  pts.push(toePt(b, b.rx * 1.12, -b.ry * 0.36));
  const a = toes[3];
  const mid: P = [(a.cx + a.rx * 0.6 + b.cx - b.rx * 0.6) / 2 - CX, (a.cy + b.cy) / 2 - Math.max(a.ry, b.ry) * 0.42];
  const thong: P[] = [mid, [mid[0] - 4, mid[1] - 16], [mid[0] - 10, 226]];
  for (const path of [thong, pts]) {
    line(x, path, 9, MINK);
    line(x, path, 6.4, grad(x, 0, 220, 0, 270, [[0, '#3a3440'], [1, '#17141b']]));
    line(x, path, 1.4, 'rgba(200,190,210,.3)', -0.6, -1.8);
  }
  // chrome studs where the strap crosses each toe, and a boss where the thong meets it
  const stud = (sx: number, sy: number, r: number) => {
    const g = x.createRadialGradient(sx - r * 0.4, sy - r * 0.4, 0.2, sx, sy, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#aeb7c4');
    g.addColorStop(1, '#232830');
    x.fillStyle = g;
    x.beginPath();
    x.arc(sx, sy, r, 0, 7);
    x.fill();
    x.strokeStyle = MINK;
    x.lineWidth = 1.2;
    x.stroke();
  };
  toes.forEach((t, i) => {
    const [sx, sy] = toePt(t, 0, -t.ry * 0.42);
    stud(sx, sy, i === 4 ? 3.6 : 2.8);
  });
  stud(mid[0], mid[1], 5);
}

/** The Immortal's armoured toes and sandal straps at a pose. Call inside mock(IMM). */
export function immortalToes(ctx: Ctx, o: ImmortalLook, p: Pose): void {
  const toes = poseToes(IMM_REST, p);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // the toes' shadow on the smoke under them
  for (const t of toes) {
    inToeFrame(ctx, t, () => {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(2, 4, t.rx + 3, t.ry + 2, 0, 0, 7);
      ctx.fill();
    });
  }
  toes.forEach((t, i) => armouredToe(ctx, t, o, i === 4));
  sandalStraps(ctx, toes);
  ctx.restore();
}

/** The mask, its lamellar gorget and the head-wrap (everything of the Immortal but its smoke). Call inside
 * mock(IMM). */
export function immortalArmour(ctx: Ctx, o: ImmortalLook): void {
  ctx.save();
  ctx.translate(0, MASK.my);
  ctx.scale(MASK.ms, MASK.ms);
  lamellar(ctx, o);
  warMask(ctx, o);
  // the wrap's shadow on the mask's brow
  ctx.save();
  maskPath(ctx);
  ctx.clip();
  ctx.fillStyle = grad(ctx, 0, 26, 0, 52, [[0, 'rgba(2,3,6,.65)'], [1, 'rgba(2,3,6,0)']]);
  ctx.fillRect(-100, 20, 200, 34);
  ctx.restore();
  ctx.restore();
  headWrap(ctx, SCARF.top, SCARF.h, SCARF.w, SCARF.wraps);
}

function drawImmortal(ctx: Ctx, art: FootArt): void {
  const o = immortalLook(art);
  mock(ctx, IMM, () => {
    smokeBody(ctx, 0, o);
    immortalToes(ctx, o, REST);
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
export const EYE = { y: 124, w: 122, h: 62 };

/** The maw's lips at mock x: the upper lip arches up in the middle and its corners drag down (a downturned snarl). */
export const MAW = {
  w: 80,
  upper: (px: number) => 194 + 42 * Math.pow(Math.min(1, Math.abs(px) / 80), 2.2),
  lower: (px: number) => 230 + 6 * Math.pow(Math.min(1, Math.abs(px) / 80), 2),
};

/** The vein colour: the hide's grey pulled towards a cold, bloodless blue. */
const veinCol = (base: string) => shade(mix(base, '#3e4d6a', 0.4), -0.08);

/** Leathery mottling, knotted lumps and pitted grit, in the hide's palette (shared by the hide and the brow). */
function leather(x: Ctx, base: string, rnd: () => number, x0: number, y0: number, w: number, h: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const px = x0 + rnd() * w;
    const py = y0 + rnd() * h;
    const r = 3 + rnd() * 14;
    const dark = rnd() < 0.55;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, dark ? `rgba(4,6,10,${0.05 + rnd() * 0.09})` : rgba(shade(base, 0.5), 0.04 + rnd() * 0.06));
    g.addColorStop(1, 'rgba(4,6,10,0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, r, 0, 7);
    x.fill();
  }
  // the hide's fine crackle: short, crossing wrinkles
  x.lineCap = 'round';
  for (let i = 0; i < n * 1.6; i++) {
    const px = x0 + rnd() * w;
    const py = y0 + rnd() * h;
    const a = rnd() * Math.PI;
    const len = 2 + rnd() * 5;
    x.strokeStyle = `rgba(3,4,8,${0.1 + rnd() * 0.14})`;
    x.lineWidth = 0.9;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a + 0.6) * len * 0.6, py + Math.sin(a + 0.6) * len * 0.6, px + Math.cos(a) * len, py + Math.sin(a) * len);
    x.stroke();
  }
  for (let i = 0; i < n * 5; i++) {
    x.fillStyle = rnd() < 0.62 ? `rgba(0,0,0,${rnd() * 0.22})` : `rgba(226,234,248,${rnd() * 0.1})`;
    x.beginPath();
    x.arc(x0 + rnd() * w, y0 + rnd() * h, rnd() * 1.6 + 0.4, 0, 7);
    x.fill();
  }
}

/** The hide: cold grey leather over knotted muscle and a lumpy skull, lit from the top left; mottled and pitted,
 * crossed by raised blue-grey veins, creased round the eye, the maw and the toes, with two old scars and a cold rim. */
function bruteHide(x: Ctx, base: string): void {
  const rnd = seeded(11);
  x.save();
  x.lineCap = 'round';
  x.lineJoin = 'round';
  footOutline(x);
  x.fillStyle = grad(x, -120, -10, 110, 290, [[0, shade(base, 0.06)], [0.35, base], [0.72, shade(base, -0.38)], [1, shade(base, -0.62)]]);
  x.fill();
  x.clip();
  leather(x, base, rnd, -130, -10, 260, 300, 300);
  // knotted muscle, bone and the lumpy skull under the hide
  const M: [number, number, number, number][] = [
    [-86, 182, 34, 48], [86, 180, 34, 48], [-78, 92, 26, 34], [78, 96, 26, 34], [0, 30, 44, 20], [-42, 44, 20, 15],
    [42, 46, 20, 15], [-100, 236, 18, 20], [100, 234, 18, 20],
  ];
  for (let i = 0; i < 18; i++) M.push([(rnd() - 0.5) * 140, 10 + rnd() * 60, 5 + rnd() * 8, 4 + rnd() * 6]);
  for (const [mx, my, rx, ry] of M) {
    const gg = x.createRadialGradient(mx - rx * 0.35, my - ry * 0.5, 1, mx, my + ry * 0.2, Math.max(rx, ry) * 1.15);
    gg.addColorStop(0, shade(base, 0.28));
    gg.addColorStop(0.5, rgba(base, 0.6));
    gg.addColorStop(1, rgba(base, 0));
    x.fillStyle = gg;
    x.beginPath();
    x.ellipse(mx, my, rx, ry, 0, 0, 7);
    x.fill();
    x.fillStyle = 'rgba(4,6,10,.32)';
    x.beginPath();
    x.ellipse(mx + rx * 0.1, my + ry * 0.85, rx * 0.9, ry * 0.26, 0, 0, 7);
    x.fill();
  }
  // wrinkles: crow's feet fanning from the eye's corners, folds down the sides, snarl lines round the maw
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const y0 = EYE.y - 8 + k * 13;
      crease(x, [[s * 70, y0], [s * 86, y0 - 4 + k * 4], [s * (102 + k * 2), y0 - 10 + k * 10]], 3 - k * 0.4, 0.7);
    }
    crease(x, [[s * 106, 150], [s * 90, 168], [s * 70, 160]], 3.6);
    crease(x, [[s * 108, 194], [s * 96, 206], [s * 82, 200]], 3);
    crease(x, [[s * 84, MAW.upper(80) - 2], [s * 96, 224], [s * 106, 214]], 2.8);
    crease(x, [[s * 76, MAW.upper(70) - 12], [s * 88, 202], [s * 94, 188]], 2.4, 0.8);
  }
  // knuckle folds where the toes leave the foot
  crease(x, [[-74, 248], [-40, 256], [0, 258], [40, 256], [74, 248]], 4.2);
  crease(x, [[-60, 240], [0, 247], [60, 240]], 2, 0.6);
  // veins: raised, branching, cold blue-grey
  const vc = veinCol(base);
  const veins: [P[], number][] = [
    [[[-50, 4], [-62, 30], [-54, 56], [-72, 86], [-84, 118]], 6],
    [[[-60, 36], [-80, 50], [-96, 76]], 3.6],
    [[[54, 8], [64, 34], [56, 60], [76, 90]], 5.4],
    [[[62, 40], [86, 50], [100, 72]], 3.4],
    [[[-110, 156], [-98, 182], [-106, 212]], 4.4],
    [[[106, 150], [96, 176], [104, 204]], 4],
  ];
  for (const [v, w] of veins) vein(x, v, w, vc);
  // occlusion: under the iron band, and down at the toes
  x.fillStyle = grad(x, 0, 18, 0, 46, [[0, 'rgba(3,4,8,.6)'], [1, 'rgba(3,4,8,0)']]);
  x.fillRect(-140, 18, 280, 30);
  x.fillStyle = grad(x, 0, 236, 0, 276, [[0, 'rgba(3,4,8,0)'], [1, 'rgba(3,4,8,.55)']]);
  x.fillRect(-140, 236, 280, 40);
  // the cold rim along the right side and the bottom
  footOutline(x);
  x.lineWidth = 16;
  x.strokeStyle = grad(x, -60, 60, 130, 280, [[0, rgba(LIGHT.rim, 0)], [0.6, rgba(LIGHT.rim, 0)], [1, rgba(LIGHT.rim, 0.6)]]);
  x.stroke();
  x.restore();
  footOutline(x);
  x.strokeStyle = MINK;
  x.lineWidth = 5.5;
  x.stroke();
}

/** The lid line at blink `b` (0 open … 1 shut): even open, the lid hangs low over the eye (hooded, deep-set). */
function lidCurve(x: Ctx, w: number, h: number, b: number): void {
  const peak = -h * 0.7 * (1 - b) + h * 0.5 * b;
  x.moveTo(-w / 2, 0);
  x.bezierCurveTo(-w * 0.28, peak, w * 0.28, peak, w / 2, 0);
}

/** The sunken socket (wrinkled round) and the eyeball's dark wet base (no iris), clipped to the open lids. Call
 * inside mock(BRUTE). */
export function bruteSocket(x: Ctx): void {
  const { y, w, h } = EYE;
  x.save();
  x.translate(0, y);
  const sg = x.createRadialGradient(0, 2, 8, 0, 2, w * 0.8);
  sg.addColorStop(0, 'rgba(2,3,6,.95)');
  sg.addColorStop(0.55, 'rgba(2,3,6,.6)');
  sg.addColorStop(1, 'rgba(2,3,6,0)');
  x.fillStyle = sg;
  x.beginPath();
  x.ellipse(0, 4, w * 0.8, h * 1.2, 0, 0, 7);
  x.fill();
  x.beginPath();
  lidCurve(x, w, h, 0);
  x.bezierCurveTo(w * 0.3, h * 0.62, -w * 0.3, h * 0.62, -w / 2, 0);
  x.closePath();
  x.clip();
  const eg = x.createRadialGradient(-8, -6, 2, 0, 4, w * 0.5);
  eg.addColorStop(0, '#271a1f');
  eg.addColorStop(0.45, '#0b0709');
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

/** The hood's shadow over the top of the ball. */
function lidShadow(x: Ctx): void {
  const { y, w, h } = EYE;
  x.save();
  x.translate(0, y);
  x.beginPath();
  lidCurve(x, w, h, 0);
  x.bezierCurveTo(w * 0.3, h * 0.62, -w * 0.3, h * 0.62, -w / 2, 0);
  x.closePath();
  x.clip();
  x.fillStyle = grad(x, 0, -h * 0.7, 0, -h * 0.05, [[0, 'rgba(0,0,0,.85)'], [1, 'rgba(0,0,0,0)']]);
  x.fillRect(-w, -h, w * 2, h);
  x.restore();
}

/** One lobe of the brow (s = −1 left, 1 right): pressed down at the centre into the scowl, overhanging the lid. */
function browLobe(x: Ctx, s: number, w: number, h: number): void {
  x.beginPath();
  x.moveTo(s * 2, -h * 0.74);
  x.bezierCurveTo(s * w * 0.2, -h * 0.96, s * w * 0.44, -h * 0.98, s * (w / 2 + 26), -h * 0.32);
  x.bezierCurveTo(s * (w / 2 + 32), -h * 0.92, s * w * 0.42, -h * 1.5, s * w * 0.16, -h * 1.52);
  x.bezierCurveTo(s * w * 0.05, -h * 1.52, s * 4, -h * 1.34, s * 2, -h * 0.74);
  x.closePath();
}

/** The upper lid closed by `b` (0 open … 1 shut) under the heavy furrowed brow, and the lower lid with its bags.
 * Call inside mock(BRUTE). */
export function bruteLids(x: Ctx, base: string, b: number): void {
  const { y, w, h } = EYE;
  const rnd = seeded(31);
  x.save();
  x.translate(0, y);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  // the lower lid, pouched, with heavy bags under it
  x.fillStyle = grad(x, 0, 0, 0, h, [[0, shade(base, -0.35)], [1, shade(base, -0.1)]]);
  x.beginPath();
  x.moveTo(-w / 2 - 4, -2);
  x.bezierCurveTo(-w * 0.3, h * 0.62, w * 0.3, h * 0.62, w / 2 + 4, -2);
  x.bezierCurveTo(w * 0.36, h * 0.94, -w * 0.36, h * 0.94, -w / 2 - 4, -2);
  x.fill();
  crease(x, [[-w * 0.34, h * 0.7], [0, h * 0.86], [w * 0.34, h * 0.7]], 2.6, 0.9);
  crease(x, [[-w * 0.24, h * 0.9], [0, h * 1.0], [w * 0.24, h * 0.9]], 2, 0.6);
  x.strokeStyle = '#06070a';
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(-w / 2, 0);
  x.bezierCurveTo(-w * 0.3, h * 0.62, w * 0.3, h * 0.62, w / 2, 0);
  x.stroke();
  line(x, [[-w * 0.36, h * 0.52], [0, h * 0.64], [w * 0.36, h * 0.52]], 1.6, 'rgba(226,234,248,.28)', 0, 2);
  // the upper lid: a hood of hide in the brow's shadow, down to the lid line
  x.fillStyle = grad(x, 0, -h * 1.1, 0, h * 0.5 * b, [[0, shade(base, -0.62)], [0.6, shade(base, -0.42)], [1, shade(base, -0.22)]]);
  x.beginPath();
  x.moveTo(-w / 2 - 12, 6);
  x.bezierCurveTo(-w * 0.42, -h * 1.1, w * 0.42, -h * 1.1, w / 2 + 12, 6);
  x.lineTo(w / 2, 0);
  const peak = -h * 0.7 * (1 - b) + h * 0.5 * b;
  x.bezierCurveTo(w * 0.28, peak, -w * 0.28, peak, -w / 2, 0);
  x.closePath();
  x.fill();
  // folds in the lid as it closes
  if (b > 0.15) {
    const fp = peak - 7;
    line(x, [[-w * 0.4, -4], [-w * 0.2, fp * 0.8], [0, fp], [w * 0.2, fp * 0.8], [w * 0.4, -4]], 1.8, 'rgba(3,4,8,.5)');
  }
  x.strokeStyle = '#05060a';
  x.lineWidth = 4.5;
  x.beginPath();
  lidCurve(x, w, h, b);
  x.stroke();
  // the brow: two heavy lobes of knotted hide pressed down into a V over the eye, furrowed, with a deep cleft
  for (const s of [-1, 1]) {
    // the brow's shadow on the lid
    for (const [dy, a] of [[6, 0.35], [12, 0.25]]) {
      x.save();
      x.translate(0, dy);
      browLobe(x, s, w, h);
      x.fillStyle = `rgba(2,3,6,${a})`;
      x.fill();
      x.restore();
    }
  }
  for (const s of [-1, 1]) {
    const lit = s < 0;
    browLobe(x, s, w, h);
    x.fillStyle = grad(x, s * w * 0.18, -h * 1.5, s * w * 0.26, -h * 0.8, [
      [0, shade(base, lit ? 0.34 : 0.14)], [0.4, lit ? shade(base, 0.08) : shade(base, -0.08)], [0.78, shade(base, -0.42)], [1, shade(base, -0.7)],
    ]);
    x.fill();
    x.save();
    browLobe(x, s, w, h);
    x.clip();
    leather(x, base, rnd, s < 0 ? -w : 0, -h * 1.6, w, h, 40);
    // furrows across the lobe, bent with it
    // a knot of muscle on the lobe, and two deep furrows bent with it
    const kg = x.createRadialGradient(s * w * 0.22, -h * 1.32, 1, s * w * 0.24, -h * 1.25, w * 0.2);
    kg.addColorStop(0, rgba(shade(base, lit ? 0.32 : 0.14), 0.9));
    kg.addColorStop(1, rgba(base, 0));
    x.fillStyle = kg;
    x.fillRect(s < 0 ? -w : 0, -h * 1.7, w, h);
    for (const k of [0, 1]) {
      const yy = -h * (1.22 - k * 0.18);
      const pts: P[] = [[s * 10, yy + 4], [s * w * 0.2, yy - 6], [s * w * 0.4, yy - 2], [s * w * 0.56, yy + 14 + k * 8]];
      line(x, pts, 6, 'rgba(3,4,8,.22)', 0, 1);
      crease(x, pts, 2.8 - k * 0.6, 0.9);
    }
    // a raised vein over the brow
    vein(x, [[s * w * 0.12, -h * 1.5], [s * w * 0.2, -h * 1.3], [s * w * 0.16, -h * 1.12]], 2.4, veinCol(base));
    x.restore();
    // the crest catches the key light; the underside rolls into shadow
    line(x, [[s * 8, -h * 1.3], [s * w * 0.16, -h * 1.46], [s * w * 0.4, -h * 1.3], [s * (w / 2 + 24), -h * 0.7]], lit ? 3.2 : 2.2, lit ? 'rgba(236,242,252,.6)' : 'rgba(236,242,252,.3)');
    line(x, [[s * 4, -h * 0.76], [s * w * 0.22, -h * 0.94], [s * w * 0.44, -h * 0.94], [s * (w / 2 + 24), -h * 0.36]], 3, 'rgba(2,3,6,.65)');
  }
  // the cleft between the lobes and the scowl's pinched furrows
  line(x, [[0, -h * 1.3], [0, -h * 1.05], [0, -h * 0.78]], 4.5, 'rgba(2,3,6,.85)');
  line(x, [[0, -h * 1.5], [0, -h * 1.3]], 2.2, 'rgba(2,3,6,.5)');
  for (const s of [-1, 1]) crease(x, [[s * 6, -h * 0.86], [s * 12, -h * 1.1], [s * 10, -h * 1.36]], 2.2, 0.8);
  x.restore();
}

/** The lid frames' box in the mock frame (everything bruteLids draws, with room for the strokes). */
export const LID_BOX = { x: -100, y: EYE.y - EYE.h * 1.62 - 6, w: 200, h: EYE.h * 2.7 + 12 };
/** The iris sprite's box in the mock frame (at look 0). */
export const IRIS_BOX = { x: -34, y: EYE.y - 28, w: 68, h: 68 };

/** A fang: from (bx, by) on the gum `len` long (dir 1 down, −1 up), `wd` wide, leaning, maybe chipped. */
function fang(x: Ctx, bx: number, by: number, len: number, wd: number, dir: number, lean: number, chipped: boolean): void {
  const tx = bx + lean * len;
  const ty = by + dir * len;
  const path = () => {
    x.beginPath();
    x.moveTo(bx - wd / 2, by - dir * 3);
    x.quadraticCurveTo(bx - wd * 0.55, by + dir * len * 0.5, tx - (chipped ? wd * 0.22 : 0), ty - (chipped ? dir * 2 : 0));
    if (chipped) x.lineTo(tx + wd * 0.05, ty - dir * 4.5);
    if (chipped) x.lineTo(tx + wd * 0.24, ty);
    x.quadraticCurveTo(bx + wd * 0.5, by + dir * len * 0.45, bx + wd / 2, by - dir * 3);
    x.closePath();
  };
  path();
  x.fillStyle = grad(x, bx, by, tx, ty, [[0, '#4b443a'], [0.35, '#9d957f'], [0.8, '#d7d1bf'], [1, '#ebe7da']]);
  x.fill();
  // the far side in shadow, a hard light on the near edge
  x.save();
  path();
  x.clip();
  x.fillStyle = 'rgba(8,8,12,.32)';
  x.fillRect(bx + wd * 0.08, Math.min(by, ty) - 4, wd, len + 8);
  x.restore();
  line(x, [[bx - wd * 0.3, by + dir * 2], [bx - wd * 0.3 + lean * len * 0.5, by + dir * len * 0.55], [tx - wd * 0.08, ty - dir * 3]], 1.1, 'rgba(255,255,248,.75)');
  path();
  x.strokeStyle = '#08080b';
  x.lineWidth = 1.6;
  x.stroke();
}

/** The maw: a wide downturned snarl across the foot under the eye, thick leathery lips, and a jumble of jagged,
 * uneven fangs (two upper canines hanging over the lower lip, two tusks jutting up). */
function bruteMaw(x: Ctx, base: string): void {
  const { upper, lower, w } = MAW;
  x.save();
  x.lineCap = 'round';
  x.lineJoin = 'round';
  const mouth = () => {
    x.beginPath();
    for (let px = -w; px <= w; px += 4) x.lineTo(px, upper(px));
    for (let px = w; px >= -w; px -= 4) x.lineTo(px, lower(px));
    x.closePath();
  };
  // the lips: a thick, lit upper lip and a heavy lower one
  mouth();
  x.lineWidth = 16;
  x.strokeStyle = grad(x, 0, 182, 0, 244, [[0, shade(base, 0.12)], [0.5, shade(base, -0.2)], [1, shade(base, -0.5)]]);
  x.stroke();
  const up: P[] = [];
  for (let px = -w + 6; px <= w - 6; px += 10) up.push([px, upper(px) - 8.5]);
  line(x, up, 1.8, 'rgba(226,234,248,.35)');
  // snarl wrinkles over the upper lip
  for (const px of [-44, -18, 14, 40]) crease(x, [[px, upper(px) - 10], [px + (px < 0 ? -3 : 3), upper(px) - 19]], 2.4, 0.8);
  // inside: a black throat, a gum line, a dark tongue
  mouth();
  const ig = x.createRadialGradient(0, 214, 2, 0, 214, 70);
  ig.addColorStop(0, '#22080b');
  ig.addColorStop(0.6, '#0c0305');
  ig.addColorStop(1, '#030102');
  x.fillStyle = ig;
  x.fill();
  x.save();
  mouth();
  x.clip();
  x.fillStyle = '#3a1418';
  x.beginPath();
  x.ellipse(4, 236, 38, 10, 0, 0, 7);
  x.fill();
  const gl: P[] = [];
  for (let px = -w; px <= w; px += 8) gl.push([px, upper(px) + 2]);
  line(x, gl, 5, '#3b1b1e');
  const gl2: P[] = [];
  for (let px = -w; px <= w; px += 8) gl2.push([px, lower(px) - 2]);
  line(x, gl2, 4, '#2e1316');
  x.restore();
  mouth();
  x.strokeStyle = MINK;
  x.lineWidth = 3;
  x.stroke();
  // the fangs: [x, length, width, lean, chipped]; lower first so the upper ones hang over them
  const lowerF: [number, number, number, number, boolean][] = [
    [-62, 8, 8, 0.15, false], [-48, 14, 11, -0.12, true], [-31, 30, 14, 0.14, false], [-16, 10, 10, 0, true], [-3, 15, 11, -0.08, false],
    [10, 8, 9, 0.22, true], [23, 13, 10, -0.12, false], [40, 25, 14, -0.18, false], [55, 10, 9, 0.12, true], [68, 6, 7, -0.2, false],
  ];
  const upperF: [number, number, number, number, boolean][] = [
    [-68, 8, 8, -0.12, false], [-54, 28, 15, 0.08, false], [-39, 11, 10, 0.18, true], [-27, 17, 11, -0.12, false], [-14, 8, 10, 0.12, true],
    [-1, 14, 11, -0.06, false], [12, 9, 10, 0.2, true], [27, 31, 15, -0.1, false], [42, 12, 10, 0.14, true], [58, 9, 9, -0.12, false],
  ];
  for (const [px, len, wd, lean, chip] of lowerF) fang(x, px, lower(px) + 1, len, wd, -1, lean, chip);
  for (const [px, len, wd, lean, chip] of upperF) fang(x, px, upper(px) - 1, len, wd, 1, lean, chip);
  x.restore();
}

/** The Brute's toes at rest (mock frame): thick and graduated, big toe on the right, splayed a little. */
const BRUTE_REST = styleToes([
  [-84, 272, 20, 26, 0.22],
  [-46, 283, 22, 28, 0.1],
  [-6, 290, 24, 30, 0.02],
  [36, 292, 26, 31, -0.05],
  [82, 287, 33, 35, -0.12],
]);

/** The box the Brute's toe band covers (mock frame): the toes with their claws, curled or splayed. */
export const BRUTE_TOE_BOX = { x: -132, y: 224, w: 264, h: 130 };

/** A gnarled toe's outline in its own frame: a knuckle that bulges, a waist, a fat pad and a blunt tip. */
function gnarledToe(x: Ctx, k: number, L: number, open = false): void {
  x.beginPath();
  x.moveTo(-k * 0.78, -L * (open ? 0.72 : 1.02));
  x.bezierCurveTo(-k * 0.9, -L * 0.7, -k * 1.14, -L * 0.52, -k * 1.06, -L * 0.22);
  x.bezierCurveTo(-k, 0, -k * 0.84, L * 0.12, -k * 0.88, L * 0.32);
  x.bezierCurveTo(-k * 0.96, L * 0.5, -k * 1.02, L * 0.7, -k * 0.84, L * 0.88);
  x.bezierCurveTo(-k * 0.6, L * 1.08, k * 0.6, L * 1.08, k * 0.84, L * 0.88);
  x.bezierCurveTo(k * 1.02, L * 0.7, k * 0.96, L * 0.5, k * 0.88, L * 0.32);
  x.bezierCurveTo(k * 0.84, L * 0.12, k, 0, k * 1.06, -L * 0.22);
  x.bezierCurveTo(k * 1.14, -L * 0.52, k * 0.9, -L * 0.7, k * 0.78, -L * (open ? 0.72 : 1.02));
  if (!open) {
    x.quadraticCurveTo(0, -L * 1.18, -k * 0.78, -L * 1.02);
    x.closePath();
  }
}

/** One of the Brute's toes: grey hide lit from the top left over a knobbly knuckle, wrinkled across it, a raised vein,
 * mottled leather, a cold rim; then its claw: a hooked nail of yellowed horn, dark where it grows from the toe,
 * cracked, grimed in its ridges and chipped at the edge. */
function gnarled(x: Ctx, t: StyleToe, base: string, i: number, rnd: () => number): void {
  inToeFrame(x, t, () => {
    const k = t.rx;
    const L = t.ry;
    const toe = () => gnarledToe(x, k, L);
    // its shadow on the foot
    x.save();
    x.translate(3, 6);
    toe();
    x.fillStyle = 'rgba(2,3,6,.4)';
    x.fill();
    x.restore();
    toe();
    const g = x.createRadialGradient(-k * 0.4, -L * 0.5, 2, 0, 0, Math.max(k, L) * 1.25);
    g.addColorStop(0, shade(base, 0.26));
    g.addColorStop(0.5, shade(base, -0.06));
    g.addColorStop(1, shade(base, -0.62));
    x.fillStyle = g;
    x.fill();
    x.save();
    toe();
    x.clip();
    leather(x, base, rnd, -k, -L, k * 2, L * 2, 14);
    // occlusion where it leaves the foot
    x.fillStyle = grad(x, 0, -L * 1.15, 0, -L * 0.55, [[0, 'rgba(2,3,6,.5)'], [1, 'rgba(2,3,6,0)']]);
    x.fillRect(-k * 1.2, -L * 1.2, k * 2.4, L * 0.7);
    // the knuckle: a lit knob, wrinkled across
    const kg = x.createRadialGradient(-k * 0.25, -L * 0.42, 1, -k * 0.1, -L * 0.32, k * 0.85);
    kg.addColorStop(0, rgba(shade(base, 0.36), 0.85));
    kg.addColorStop(1, rgba(base, 0));
    x.fillStyle = kg;
    x.beginPath();
    x.ellipse(-k * 0.1, -L * 0.32, k * 0.9, L * 0.4, 0, 0, 7);
    x.fill();
    for (const [r, w, a, a0, a1] of [[0.42, 2.6, 1, 0.5, 2.5], [0.6, 2.2, 0.85, 0.3, 2.7], [0.78, 1.8, 0.65, 0.7, 2.2], [0.26, 1.6, 0.6, 0.9, 2.1]]) {
      const pts: P[] = [];
      const j = (rnd() - 0.5) * 0.3;
      for (let u = a0 + j; u <= a1 + j; u += 0.25) pts.push([-k * 0.08 + Math.cos(u) * k * r * 1.1, -L * 0.42 + Math.sin(u) * L * r * 0.42 + (rnd() - 0.5) * 1.2]);
      crease(x, pts, w, a);
    }
    // the pad under the tip, and the crease between it and the knuckle
    crease(x, [[-k * 0.8, L * 0.3], [0, L * 0.38], [k * 0.8, L * 0.3]], 1.8, 0.6);
    // a raised vein down the bigger toes
    if (i >= 2) vein(x, [[-k * 0.55, -L * 1.05], [-k * 0.62, -L * 0.6], [-k * 0.45, -L * 0.2], [-k * 0.58, L * 0.15]], i === 4 ? 3.6 : 2.8, veinCol(base));
    // the cold rim round the lower right
    x.lineWidth = k * 0.34;
    x.strokeStyle = rgba(LIGHT.rim, 0.45);
    gnarledToe(x, k, L);
    x.save();
    x.clip();
    x.beginPath();
    x.ellipse(0, L * 0.05, k, L * 0.98, 0, -0.5, 1.5);
    x.stroke();
    x.restore();
    x.restore();
    gnarledToe(x, k, L, true);
    x.strokeStyle = MINK;
    x.lineWidth = 5;
    x.stroke();
    // the claw
    const nw = k * 0.54;
    const top = L * 0.3;
    const tip = L * 1.7;
    const hook = k * 0.14;
    const nail = () => {
      x.beginPath();
      x.moveTo(-nw, top + L * 0.08);
      x.quadraticCurveTo(0, top - L * 0.2, nw, top + L * 0.08);
      x.bezierCurveTo(nw * 0.98, L * 0.86, nw * 0.38, L * 1.28, hook, tip);
      x.bezierCurveTo(-nw * 0.22, L * 1.24, -nw * 0.92, L * 0.86, -nw, top + L * 0.08);
      x.closePath();
    };
    nail();
    x.fillStyle = grad(x, 0, top - L * 0.1, hook, tip, [[0, '#1d1308'], [0.22, '#4a3818'], [0.5, '#9c8648'], [0.82, '#cfc08a'], [1, '#e6dcb4']]);
    x.fill();
    x.save();
    nail();
    x.clip();
    // the far side in shadow
    x.fillStyle = 'rgba(6,5,4,.3)';
    x.beginPath();
    x.ellipse(nw * 0.7, L * 0.95, nw * 0.6, L, 0, 0, 7);
    x.fill();
    // grime in the growth ridges
    for (const f of [0.52, 0.74, 0.98]) line(x, [[-nw, L * f], [0, L * (f + 0.1)], [nw, L * f]], 1.2, 'rgba(36,24,8,.6)');
    // a crack running down from the root
    const cx0 = -nw * 0.15 + (i % 2 ? nw * 0.25 : 0);
    const crack: P[] = [[cx0, top], [cx0 + nw * 0.12, L * 0.56], [cx0 - nw * 0.08, L * 0.8], [cx0 + nw * 0.1, L * 1.04]];
    line(x, crack, 1.6, 'rgba(14,9,4,.85)');
    line(x, crack, 0.8, 'rgba(255,248,220,.5)', -1.2, 0.4);
    // a chip out of the far edge
    x.fillStyle = MINK;
    x.beginPath();
    x.moveTo(nw * 1.05, L * 0.6);
    x.lineTo(nw * 0.55, L * 0.74);
    x.lineTo(nw * 0.9, L * 0.9);
    x.closePath();
    x.fill();
    x.restore();
    nail();
    x.strokeStyle = MINK;
    x.lineWidth = 2.6;
    x.stroke();
    // a hard light down the lit edge to the point
    line(x, [[-nw * 0.55, L * 0.46], [-nw * 0.45, L * 0.9], [-nw * 0.1, L * 1.28], [hook * 0.6, tip - 3]], 1.5, 'rgba(255,250,232,.75)');
  });
}

/** The Brute's toes at a pose, big toe on the right, each with its claw. Call inside mock(BRUTE). */
export function bruteToes(ctx: Ctx, base: string, p: Pose): void {
  const toes = poseToes(BRUTE_REST, p);
  const rnd = seeded(47);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  toes.forEach((t, i) => gnarled(ctx, t, base, i, rnd));
  ctx.restore();
}

/** The iron ankle band: cold dark iron with three rivets, scratched, a hard specular along its top. */
function ironBand(x: Ctx): void {
  x.fillStyle = grad(x, 0, -8, 0, 22, [[0, '#6a717c'], [0.25, '#4a505a'], [1, '#1b1d22']]);
  x.beginPath();
  x.roundRect(-70, -8, 140, 30, 8);
  x.fill();
  x.save();
  x.clip();
  const rnd = seeded(3);
  for (let i = 0; i < 30; i++) {
    const px = -66 + rnd() * 132;
    const py = -6 + rnd() * 26;
    x.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.35)';
    x.lineWidth = 0.8;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + 3 + rnd() * 8, py + (rnd() - 0.5) * 4);
    x.stroke();
  }
  x.fillStyle = grad(x, -70, 0, 70, 0, [[0, 'rgba(255,255,255,.06)'], [0.7, 'rgba(0,0,0,0)'], [1, rgba(LIGHT.rim, 0.35)]]);
  x.fillRect(-70, -8, 140, 30);
  x.restore();
  line(x, [[-62, -4], [62, -4]], 1.6, 'rgba(255,255,255,.55)');
  x.beginPath();
  x.roundRect(-70, -8, 140, 30, 8);
  x.strokeStyle = MINK;
  x.lineWidth = 5;
  x.stroke();
  for (const bx of [-50, 0, 50]) {
    const g = x.createRadialGradient(bx - 1.5, 5.5, 0.5, bx, 7, 5);
    g.addColorStop(0, '#e4e9f0');
    g.addColorStop(0.5, '#8a929e');
    g.addColorStop(1, '#2a2e35');
    x.fillStyle = g;
    x.beginPath();
    x.arc(bx, 7, 5, 0, 7);
    x.fill();
  }
}

export const bruteHideColour = (art: FootArt) => art.primary ?? '#6f7782';

/** The Brute minus its live parts (the iris, the lids and the toes): what play draws under their sprites. */
export function bruteBody(ctx: Ctx, art: FootArt): void {
  const base = bruteHideColour(art);
  mock(ctx, BRUTE, () => {
    bruteHide(ctx, base);
    bruteSocket(ctx);
    lidShadow(ctx);
    bruteMaw(ctx, base);
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
    bruteMaw(ctx, base);
    bruteToes(ctx, base, REST);
    ironBand(ctx);
  });
}

registerKind('p_immortal', { draw: drawImmortal, contactY: IMM.contactY, halfWidth: 82 });
registerKind('lx_brute', { draw: drawBrute, contactY: BRUTE.contactY, halfWidth: 112 });
