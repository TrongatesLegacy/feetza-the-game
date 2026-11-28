// Sprites for the pizza plan's Act 4 Legendaries (src/content/pizzas/p11.ts): the Pigeon King's own pigeon (in
// flight, frame by frame, and strutting), its feathers; the Dough Boy's dough jaws; and the Gargoyle's cathedral (a
// ring of carved stone, chips of it, shards of stained glass, the rose window, a shaft of its coloured light, the
// bell). Drawn once on canvases in the game's style (src/art/perkProps.ts): a dark outline, soft gradients, one light
// from the top left, a sheen.

import { ellipse, makeCanvas, rgba, rng, shade, type Ctx } from './util';

const INK = '#2a1810';
const TAU = Math.PI * 2;

// ════════════════════════════ the Pigeon King's pigeon ════════════════════════════

/** Frames of the pigeon's wingbeat (0: wings up … 3: wings down), and 4: talons out, wings held up as it grips. */
export const PIGEON_FRAMES = 5;
/** The wing's angle (radians from +x, on the canvas) in each frame. */
const WING = [-1.85, -2.35, -2.95, 2.55, -1.6];

const SLATE = '#8e93ab';
const SLATE_D = '#5c6078';
const SLATE_L = '#d2d6e4';

type P = [number, number];

/** One wing from its shoulder `s`, pointing at angle `th`, `len` long: the coverts with the pigeon's two black bars,
 *  then the fingered primaries, dark-tipped. `far`: the wing behind the body (darker, a touch shorter). */
function wing(ctx: Ctx, s: P, th: number, len: number, far: boolean): void {
  const u: P = [Math.cos(th), Math.sin(th)];
  // (the trailing edge is always towards the tail: the perpendicular with x < 0)
  let n: P = [-u[1], u[0]];
  if (n[0] > 0) n = [u[1], -u[0]];
  const at = (a: number, b: number): P => [s[0] + u[0] * a + n[0] * b, s[1] + u[1] * a + n[1] * b];
  const dk = far ? -0.22 : 0;
  // the primaries: seven long feathers fanned from the wrist to the tip
  const wrist = at(len * 0.5, len * 0.05);
  for (let i = 6; i >= 0; i--) {
    const t = i / 6;
    const fl = len * (0.62 - t * 0.2);
    const ang = th + (u[0] * n[1] - u[1] * n[0] > 0 ? 1 : -1) * t * 0.55;
    const tip: P = [wrist[0] + Math.cos(ang) * fl, wrist[1] + Math.sin(ang) * fl];
    const mx = (wrist[0] + tip[0]) / 2;
    const my = (wrist[1] + tip[1]) / 2;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(-fl / 2, 0, fl / 2, 0);
    g.addColorStop(0, shade(SLATE, dk + 0.05));
    g.addColorStop(0.6, shade(SLATE_D, dk));
    g.addColorStop(1, shade('#34364a', dk));
    ctx.beginPath();
    ctx.ellipse(0, 0, fl / 2, len * 0.075, 0, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // its shaft
    ctx.strokeStyle = rgba('#ffffff', far ? 0.12 : 0.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-fl / 2 + 3, 0);
    ctx.lineTo(fl / 2 - 4, 0);
    ctx.stroke();
    ctx.restore();
  }
  // the coverts: the wing's broad base from the shoulder to the wrist
  const a0 = at(0, -len * 0.06);
  const a1 = at(len * 0.58, -len * 0.04);
  const b1 = at(len * 0.52, len * 0.2);
  const b0 = at(len * 0.04, len * 0.3);
  ctx.beginPath();
  ctx.moveTo(a0[0], a0[1]);
  const c0 = at(len * 0.3, -len * 0.12);
  ctx.quadraticCurveTo(c0[0], c0[1], a1[0], a1[1]);
  ctx.lineTo(b1[0], b1[1]);
  const c1 = at(len * 0.25, len * 0.32);
  ctx.quadraticCurveTo(c1[0], c1[1], b0[0], b0[1]);
  ctx.closePath();
  const gc = ctx.createLinearGradient(a0[0], a0[1], b0[0], b0[1]);
  gc.addColorStop(0, shade(SLATE_L, dk - 0.05));
  gc.addColorStop(1, shade(SLATE, dk));
  ctx.fillStyle = gc;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the two black bars across it (a rock pigeon's mark)
  ctx.save();
  ctx.clip();
  for (const k of [0.55, 0.8]) {
    const p0 = at(len * 0.12, len * 0.3 * k - len * 0.02);
    const p1 = at(len * 0.52, len * 0.2 * k);
    ctx.strokeStyle = rgba('#1e1c2a', far ? 0.6 : 0.85);
    ctx.lineWidth = len * 0.045;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.stroke();
  }
  ctx.restore();
}

/** The King's own pigeon in flight, facing right, frame `i` of PIGEON_FRAMES: plump and slate-grey, its neck
 *  shimmering green and violet, an orange eye, the King's little gold crown, pink legs (talons out in the last
 *  frame). 240 × 190 px; its middle is the body at (116, 104). */
export function drawPigeonFrame(i: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 190);
  const th = WING[i % WING.length];
  const grab = i === 4;
  const sh: P = [118, 90];
  // the far wing, behind it all
  wing(ctx, [sh[0] + 8, sh[1] - 4], th + 0.18, 84, true);
  // the tail: a fan of grey feathers with a black band and a pale edge
  ctx.save();
  ctx.translate(66, 106);
  ctx.rotate(0.14);
  for (let k = -2; k <= 2; k++) {
    ctx.save();
    ctx.rotate(k * 0.12);
    ctx.beginPath();
    ctx.ellipse(-26, 0, 30, 7.5, 0, 0, TAU);
    const g = ctx.createLinearGradient(-56, 0, 4, 0);
    g.addColorStop(0, '#2a2a38');
    g.addColorStop(0.22, '#3a3a4c');
    g.addColorStop(0.3, SLATE);
    g.addColorStop(1, SLATE_L);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  // legs: tucked back in flight, reaching forward with talons spread as it grips
  const leg = (x: number, dx: number) => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    const kx = grab ? x + 18 + dx : x - 14 + dx;
    const ky = grab ? 158 : 138;
    ctx.beginPath();
    ctx.moveTo(x, 124);
    ctx.quadraticCurveTo((x + kx) / 2 + (grab ? 6 : -6), 140, kx, ky);
    ctx.stroke();
    ctx.strokeStyle = '#e07a86';
    ctx.lineWidth = 4.2;
    ctx.stroke();
    // the toes and claws
    for (const a of grab ? [0.3, 0.9, 1.5, -2.6] : [2.7, 2.3, 3.1]) {
      const tx = kx + Math.cos(a) * 11;
      const ty = ky + Math.sin(a) * 11;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.strokeStyle = '#ec8c96';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.fillStyle = '#2a2430';
      ctx.beginPath();
      ctx.arc(tx + Math.cos(a) * 2, ty + Math.sin(a) * 2, 1.8, 0, TAU);
      ctx.fill();
    }
  };
  leg(108, 0);
  leg(122, 4);
  // the body: an egg, lit from the top left, a paler belly
  ctx.beginPath();
  ctx.ellipse(114, 104, 50, 31, -0.12, 0, TAU);
  const gb = ctx.createRadialGradient(100, 88, 6, 114, 108, 56);
  gb.addColorStop(0, SLATE_L);
  gb.addColorStop(0.55, '#a6abc0');
  gb.addColorStop(1, SLATE_D);
  ctx.fillStyle = gb;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the neck: the shimmer, green to violet, and its sheen
  ctx.beginPath();
  ctx.moveTo(136, 84);
  ctx.quadraticCurveTo(150, 66, 166, 70);
  ctx.quadraticCurveTo(176, 90, 160, 112);
  ctx.quadraticCurveTo(146, 110, 134, 104);
  ctx.closePath();
  const gn = ctx.createLinearGradient(140, 70, 162, 110);
  gn.addColorStop(0, '#5fc89a');
  gn.addColorStop(0.45, '#3f9a8a');
  gn.addColorStop(0.75, '#9462d2');
  gn.addColorStop(1, '#6a4aa0');
  ctx.fillStyle = gn;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = rgba('#e8fff4', 0.4);
  ellipse(ctx, 152, 80, 8, 3.5, -0.7);
  ctx.fill();
  // the head
  ctx.beginPath();
  ctx.arc(168, 70, 17, 0, TAU);
  const gh = ctx.createRadialGradient(162, 63, 3, 168, 70, 19);
  gh.addColorStop(0, '#b4b9cc');
  gh.addColorStop(1, '#6e7390');
  ctx.fillStyle = gh;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the beak, with its pale cere
  ctx.beginPath();
  ctx.moveTo(181, 66);
  ctx.quadraticCurveTo(198, 70, 198, 75);
  ctx.quadraticCurveTo(190, 77, 181, 76);
  ctx.closePath();
  ctx.fillStyle = '#3c3842';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#f2eee6';
  ellipse(ctx, 183, 66, 4.5, 3, 0.2);
  ctx.fill();
  // the eye: an orange ring, a black pupil, a glint
  ctx.fillStyle = '#ff9a2a';
  ctx.beginPath();
  ctx.arc(172, 66, 5.2, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#120c10';
  ctx.beginPath();
  ctx.arc(173, 66, 2.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(174.2, 64.6, 1.1, 0, TAU);
  ctx.fill();
  // the King's little gold crown, a ruby in it
  ctx.save();
  ctx.translate(165, 52);
  ctx.rotate(-0.12);
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.lineTo(-11, -7);
  ctx.lineTo(-5, -1);
  ctx.lineTo(0, -10);
  ctx.lineTo(5, -1);
  ctx.lineTo(11, -7);
  ctx.lineTo(10, 4);
  ctx.closePath();
  const gk = ctx.createLinearGradient(0, -10, 0, 4);
  gk.addColorStop(0, '#fff0a0');
  gk.addColorStop(0.5, '#ffc83a');
  gk.addColorStop(1, '#b07a10');
  ctx.fillStyle = gk;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#e2324a';
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, TAU);
  ctx.fill();
  ctx.restore();
  // the near wing, over the body
  wing(ctx, sh, th, 92, false);
  return c;
}

/** The pigeon strutting (wings folded), facing right: frame 0 head forward, 1 head back. 120 × 100 px, its feet at the
 *  bottom middle. For the aura, strutting round its pie. */
export function drawPigeonWalk(i: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 100);
  const fwd = i % 2 === 0;
  // legs
  for (const [x, d] of [[56, fwd ? 6 : -4], [66, fwd ? -4 : 6]] as [number, number][]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, 70);
    ctx.lineTo(x + d, 92);
    ctx.lineTo(x + d + 7, 94);
    ctx.stroke();
    ctx.strokeStyle = '#e07a86';
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  // tail
  ctx.beginPath();
  ctx.moveTo(36, 58);
  ctx.lineTo(8, 70);
  ctx.lineTo(12, 78);
  ctx.lineTo(40, 70);
  ctx.closePath();
  ctx.fillStyle = '#3a3a4c';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.ellipse(58, 60, 28, 18, -0.15, 0, TAU);
  const gb = ctx.createRadialGradient(52, 50, 3, 58, 62, 30);
  gb.addColorStop(0, SLATE_L);
  gb.addColorStop(1, SLATE_D);
  ctx.fillStyle = gb;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the folded wing and its bars
  ctx.beginPath();
  ctx.ellipse(52, 58, 20, 10, -0.2, 0, TAU);
  ctx.fillStyle = '#a2a7bc';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = '#22202c';
  ctx.lineWidth = 2.6;
  for (const dx of [0, 7]) {
    ctx.beginPath();
    ctx.moveTo(44 + dx, 54);
    ctx.lineTo(48 + dx, 66);
    ctx.stroke();
  }
  // neck and head (bobbing forward or back)
  const hx = fwd ? 90 : 80;
  const hy = fwd ? 36 : 32;
  ctx.beginPath();
  ctx.moveTo(70, 50);
  ctx.quadraticCurveTo(hx - 6, hy + 6, hx, hy);
  ctx.quadraticCurveTo(hx + 6, hy + 18, 78, 64);
  ctx.closePath();
  const gn = ctx.createLinearGradient(70, hy, hx, 64);
  gn.addColorStop(0, '#5fc89a');
  gn.addColorStop(1, '#9462d2');
  ctx.fillStyle = gn;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hx, hy, 10, 0, TAU);
  ctx.fillStyle = '#7e839e';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx + 8, hy - 2);
  ctx.lineTo(hx + 18, hy + 2);
  ctx.lineTo(hx + 8, hy + 4);
  ctx.closePath();
  ctx.fillStyle = '#3c3842';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#ff9a2a';
  ctx.beginPath();
  ctx.arc(hx + 3, hy - 2, 2.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#120c10';
  ctx.beginPath();
  ctx.arc(hx + 3.6, hy - 2, 1.3, 0, TAU);
  ctx.fill();
  // its little crown
  ctx.beginPath();
  ctx.moveTo(hx - 7, hy - 8);
  ctx.lineTo(hx - 7, hy - 15);
  ctx.lineTo(hx - 3, hy - 11);
  ctx.lineTo(hx, hy - 17);
  ctx.lineTo(hx + 3, hy - 11);
  ctx.lineTo(hx + 7, hy - 15);
  ctx.lineTo(hx + 7, hy - 8);
  ctx.closePath();
  ctx.fillStyle = '#ffc83a';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  return c;
}

/** A pigeon feather drifting: slate grey, a darker tip, its shaft. 64 × 24 px. */
export function drawFeather(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 24);
  ctx.beginPath();
  ctx.moveTo(4, 12);
  ctx.quadraticCurveTo(26, 0, 60, 9);
  ctx.quadraticCurveTo(30, 24, 4, 12);
  const g = ctx.createLinearGradient(4, 0, 60, 0);
  g.addColorStop(0, SLATE_L);
  g.addColorStop(0.7, SLATE);
  g.addColorStop(1, '#3a3a4c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, 12);
  ctx.quadraticCurveTo(30, 9, 58, 10);
  ctx.stroke();
  return c;
}

// ════════════════════════════ the Dough Boy's dough ════════════════════════════

/** A dough jaw (the upper; the lower is it flipped): a soft crescent of risen dough with four blunt teeth, floured.
 *  96 × 50 px. */
export function drawDoughJaw(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(96, 50);
  ctx.beginPath();
  ctx.moveTo(6, 20);
  ctx.quadraticCurveTo(48, -8, 90, 20);
  ctx.quadraticCurveTo(84, 30, 76, 30);
  // the teeth along the bottom edge
  for (let i = 3; i >= 0; i--) {
    const x = 18 + i * 20;
    ctx.quadraticCurveTo(x + 9, 30, x + 7, 42);
    ctx.quadraticCurveTo(x, 47, x - 5, 40);
    ctx.quadraticCurveTo(x - 7, 31, x - 12, 30);
  }
  ctx.quadraticCurveTo(10, 30, 6, 20);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, 46);
  g.addColorStop(0, '#fff6e0');
  g.addColorStop(0.5, '#f0d8a4');
  g.addColorStop(1, '#d6aa66');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#6a4220';
  ctx.stroke();
  const r = rng(7);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = rgba('#ffffff', 0.4 + r() * 0.5);
    ctx.beginPath();
    ctx.arc(14 + r() * 68, 8 + r() * 16, 0.8 + r() * 1.4, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = rgba('#ffffff', 0.5);
  ellipse(ctx, 38, 10, 14, 3.5, -0.15);
  ctx.fill();
  return c;
}

/** A foot's picture turned into risen dough (Second Rise): its own shape and shading kept, its colours proved into
 *  dough (deep golden in the shadows, creamy in the light), a glaze on top and a dusting of flour. Made once per foot
 *  picture. */
export function doughCopy(src: CanvasImageSource & { width: number; height: number }, seed: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const [c, ctx] = makeCanvas(w, h);
  ctx.drawImage(src, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // the dough's ramp, dark to light: a baked edge, golden, the dough, cream, a floured white
  const ramp: [number, number, number][] = [
    [74, 40, 18],
    [168, 110, 52],
    [226, 182, 116],
    [246, 226, 184],
    [255, 250, 238],
  ];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    // (lifted a little: risen dough is light)
    const t = Math.min(0.999, Math.pow(l, 0.75) * 1.05) * (ramp.length - 1);
    const k = Math.floor(t);
    const f = t - k;
    const a = ramp[k];
    const b = ramp[Math.min(ramp.length - 1, k + 1)];
    d[i] = a[0] + (b[0] - a[0]) * f;
    d[i + 1] = a[1] + (b[1] - a[1]) * f;
    d[i + 2] = a[2] + (b[2] - a[2]) * f;
  }
  ctx.putImageData(img, 0, 0);
  // a soft glaze from the top left, and flour dusted over it (on the dough only)
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, w * 0.8, h);
  g.addColorStop(0, rgba('#ffffff', 0.28));
  g.addColorStop(0.5, rgba('#ffffff', 0));
  g.addColorStop(1, rgba('#7a4a1e', 0.12));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = rng(seed);
  const n = Math.round((w * h) / 260);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rgba('#ffffff', 0.25 + r() * 0.55);
    ctx.beginPath();
    ctx.arc(r() * w, r() * h * 0.8, 0.6 + r() * 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

// ════════════════════════════ the cathedral ════════════════════════════

const STONE = '#bdb3a0';
const STONE_D = '#7d7466';
const STONE_L = '#e8e0cf';

/** The ring of carved stone a pizza is set in (Cathedral Crust), seen on the tilted table: dressed blocks round an
 *  ellipse, their front faces showing below, mortar between, a quatrefoil carved in four of them, lichen here and
 *  there. 320 × 140 px; the plate fits inside (its rim at about 0.4 of the width either side). */
export function drawStoneRing(): HTMLCanvasElement {
  const W0 = 320;
  const H0 = 140;
  const [c, ctx] = makeCanvas(W0, H0);
  const cx = W0 / 2;
  const cy = 58;
  const RX = 154;
  const RY = 52;
  const rx = 126;
  const ry = 38;
  const T = 16;
  const r = rng(41);
  const N = 22;
  // the front faces (the ring's height), under the top, front half only
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU;
    const a1 = ((i + 1) / N) * TAU;
    if (Math.sin(a0) < -0.05 && Math.sin(a1) < -0.05) continue;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const a = a0 + ((a1 - a0) * k) / 6;
      const x = cx + Math.cos(a) * RX;
      const y = cy + Math.sin(a) * RY;
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    for (let k = 6; k >= 0; k--) {
      const a = a0 + ((a1 - a0) * k) / 6;
      ctx.lineTo(cx + Math.cos(a) * RX, cy + Math.sin(a) * RY + T);
    }
    ctx.closePath();
    const lit = 0.5 + 0.5 * -Math.cos((a0 + a1) / 2 + 0.6);
    ctx.fillStyle = shade(STONE_D, -0.1 + lit * 0.18 + (r() - 0.5) * 0.06);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  // the top of each block, between the outer and inner ellipse
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU + 0.012;
    const a1 = ((i + 1) / N) * TAU - 0.012;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const a = a0 + ((a1 - a0) * k) / 6;
      const x = cx + Math.cos(a) * RX;
      const y = cy + Math.sin(a) * RY;
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    for (let k = 6; k >= 0; k--) {
      const a = a0 + ((a1 - a0) * k) / 6;
      ctx.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
    }
    ctx.closePath();
    const mid = (a0 + a1) / 2;
    const lit = 0.5 + 0.5 * -Math.cos(mid + 0.9);
    const base = shade(STONE, (lit - 0.5) * 0.22 + (r() - 0.5) * 0.08);
    const g = ctx.createLinearGradient(cx + Math.cos(mid) * rx, cy + Math.sin(mid) * ry, cx + Math.cos(mid) * RX, cy + Math.sin(mid) * RY);
    g.addColorStop(0, shade(base, -0.06));
    g.addColorStop(0.4, shade(base, 0.08));
    g.addColorStop(1, base);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // its tooling: a few fine chisel lines and pits
    ctx.save();
    ctx.clip();
    for (let k = 0; k < 4; k++) {
      const a = a0 + (a1 - a0) * r();
      const u = 0.25 + r() * 0.5;
      const x = cx + Math.cos(a) * (rx + (RX - rx) * u);
      const y = cy + Math.sin(a) * (ry + (RY - ry) * u);
      ctx.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#3a3228', 0.18 + r() * 0.15);
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + r() * 1.4, 0, TAU);
      ctx.fill();
    }
    // lichen, here and there
    if (r() < 0.3) {
      const a = mid + (r() - 0.5) * 0.1;
      ctx.fillStyle = rgba(r() < 0.5 ? '#9ab06a' : '#d8c46a', 0.55);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * (RX - 8), cy + Math.sin(a) * (RY - 4), 2.5 + r() * 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // a quatrefoil carved in the four quarter blocks
    if (i % Math.round(N / 4) === 2) {
      const x = cx + Math.cos(mid) * (rx + RX) * 0.5;
      const y = cy + Math.sin(mid) * (ry + RY) * 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.55);
      for (let q = 0; q < 4; q++) {
        const qa = (q / 4) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(qa) * 4.5, Math.sin(qa) * 4.5, 4.4, 0, TAU);
        ctx.fillStyle = rgba('#3a3228', 0.35);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  // the light on the ring's inner lip
  ctx.strokeStyle = rgba(STONE_L, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 1, rx + 2, ry + 1, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  return c;
}

/** A chip of the stone, angular, lit on one face. 30 px. */
export function drawStoneChip(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(30, 30);
  ctx.beginPath();
  ctx.moveTo(4, 14);
  ctx.lineTo(12, 3);
  ctx.lineTo(26, 8);
  ctx.lineTo(24, 22);
  ctx.lineTo(10, 27);
  ctx.closePath();
  ctx.fillStyle = STONE;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, 14);
  ctx.lineTo(12, 3);
  ctx.lineTo(26, 8);
  ctx.lineTo(15, 14);
  ctx.closePath();
  ctx.fillStyle = STONE_L;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(15, 14);
  ctx.lineTo(26, 8);
  ctx.lineTo(24, 22);
  ctx.closePath();
  ctx.fillStyle = STONE_D;
  ctx.fill();
  return c;
}

/** A bubble rising in proving dough: a glossy cream dome, a floury base, a bright highlight. 48 px. */
export function drawDoughBubble(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(48, 48);
  ctx.beginPath();
  ctx.arc(24, 26, 18, 0, TAU);
  const g = ctx.createRadialGradient(18, 18, 2, 24, 26, 20);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(0.55, '#f4dcaa');
  g.addColorStop(1, '#c8965a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#7a4c22';
  ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', 0.85);
  ellipse(ctx, 17, 18, 5, 3, -0.6);
  ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.5);
  ellipse(ctx, 26, 40, 10, 2.5);
  ctx.fill();
  return c;
}

/** The stained glass's colours: ruby, sapphire, gold, emerald, violet. */
export const GLASS = ['#e0344c', '#3a6ae0', '#f6c23a', '#34b06a', '#9a5ad8'];

/** A shard of stained glass, leaded at its edges, lit through. `i` picks its colour (GLASS). 36 px. */
export function drawGlassShard(i: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(36, 36);
  const col = GLASS[i % GLASS.length];
  const r = rng(90 + i);
  ctx.beginPath();
  ctx.moveTo(6 + r() * 4, 6 + r() * 6);
  ctx.lineTo(28 + r() * 4, 4 + r() * 6);
  ctx.lineTo(18 + r() * 8, 30 + r() * 3);
  ctx.closePath();
  const g = ctx.createLinearGradient(6, 4, 30, 32);
  g.addColorStop(0, shade(col, 0.45));
  g.addColorStop(0.5, col);
  g.addColorStop(1, shade(col, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#1c1a22';
  ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', 0.55);
  ctx.beginPath();
  ctx.moveTo(10, 9);
  ctx.lineTo(18, 8);
  ctx.lineTo(12, 14);
  ctx.closePath();
  ctx.fill();
  return c;
}

/** The cathedral's rose window: a ring of twelve lancets in ruby and sapphire, six trefoils of gold and emerald inside
 *  them, a violet oculus at the heart, black leading and the stone tracery round it all, the light coming through.
 *  `size` px. */
export function drawRoseWindow(size = 220): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const k = size / 220;
  ctx.translate(size / 2, size / 2);
  ctx.scale(k, k);
  const R = 104;
  // the stone frame
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  const gs = ctx.createRadialGradient(-20, -24, 40, 0, 0, R);
  gs.addColorStop(0, STONE_L);
  gs.addColorStop(1, STONE_D);
  ctx.fillStyle = gs;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the glass behind the tracery
  ctx.beginPath();
  ctx.arc(0, 0, R - 10, 0, TAU);
  ctx.fillStyle = '#1c1a22';
  ctx.fill();
  const pane = (path: () => void, col: string, lx: number, ly: number) => {
    path();
    const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 46);
    g.addColorStop(0, shade(col, 0.55));
    g.addColorStop(0.45, col);
    g.addColorStop(1, shade(col, -0.35));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#18161e';
    ctx.stroke();
  };
  // twelve lancets
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU - Math.PI / 2;
    ctx.save();
    ctx.rotate(a);
    pane(
      () => {
        ctx.beginPath();
        ctx.moveTo(44, -9);
        ctx.lineTo(80, -12);
        ctx.quadraticCurveTo(94, 0, 80, 12);
        ctx.lineTo(44, 9);
        ctx.quadraticCurveTo(40, 0, 44, -9);
        ctx.closePath();
      },
      i % 2 ? GLASS[1] : GLASS[0],
      62,
      -4,
    );
    // a lead line across each lancet
    ctx.strokeStyle = '#18161e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(62, -11);
    ctx.lineTo(62, 11);
    ctx.stroke();
    ctx.restore();
  }
  // six trefoils
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU - Math.PI / 2 + Math.PI / 6;
    const x = Math.cos(a) * 28;
    const y = Math.sin(a) * 28;
    pane(
      () => {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, TAU);
      },
      i % 2 ? GLASS[2] : GLASS[3],
      x - 4,
      y - 4,
    );
  }
  // the oculus
  pane(
    () => {
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, TAU);
    },
    GLASS[4],
    -4,
    -4,
  );
  // the tracery's inner ring and spokes
  ctx.strokeStyle = shade(STONE, -0.1);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, TAU);
  ctx.arc(0, 0, 40, 0, TAU);
  ctx.stroke();
  // the light shining through, brightest at the top left
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(-30, -34, 4, -10, -10, 90);
  gl.addColorStop(0, rgba('#ffffff', 0.35));
  gl.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(0, 0, R - 10, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

/** A shaft of the rose window's light: soft bands of its colours falling down the shaft, faint at the top, brightest
 *  where it lands. 90 × 320 px; its foot at the bottom middle. Additive. */
export function drawLightShaft(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(90, 320);
  const cols = [GLASS[0], GLASS[2], GLASS[1], GLASS[4]];
  for (let i = 0; i < cols.length; i++) {
    const x = 18 + i * 18;
    const g = ctx.createLinearGradient(0, 0, 0, 320);
    g.addColorStop(0, rgba(cols[i], 0));
    g.addColorStop(0.6, rgba(cols[i], 0.25));
    g.addColorStop(1, rgba(cols[i], 0.55));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 6, 0);
    ctx.lineTo(x + 6, 0);
    ctx.lineTo(x + 12, 320);
    ctx.lineTo(x - 12, 320);
    ctx.closePath();
    ctx.fill();
  }
  // a soft white core
  const g = ctx.createLinearGradient(0, 0, 90, 0);
  g.addColorStop(0, rgba('#ffffff', 0));
  g.addColorStop(0.5, rgba('#fff8e8', 0.2));
  g.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 60, 90, 260);
  return c;
}

/** The cathedral's bell: bronze, its lip flared, a band of lettering, its clapper showing. 140 px. */
export function drawBell(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 150);
  // the yoke
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(40, 6, 60, 14);
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.strokeRect(40, 6, 60, 14);
  ctx.beginPath();
  ctx.moveTo(52, 22);
  ctx.quadraticCurveTo(50, 40, 40, 70);
  ctx.quadraticCurveTo(30, 108, 14, 124);
  ctx.quadraticCurveTo(70, 140, 126, 124);
  ctx.quadraticCurveTo(110, 108, 100, 70);
  ctx.quadraticCurveTo(90, 40, 88, 22);
  ctx.closePath();
  const g = ctx.createLinearGradient(20, 0, 120, 0);
  g.addColorStop(0, '#7a4a18');
  g.addColorStop(0.3, '#f2c26a');
  g.addColorStop(0.55, '#c08a3a');
  g.addColorStop(1, '#5a3410');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the band, and its lip
  ctx.strokeStyle = rgba('#3a2208', 0.7);
  ctx.lineWidth = 2;
  for (const y of [58, 66]) {
    ctx.beginPath();
    ctx.moveTo(44 - (y - 58) * 0.1, y);
    ctx.quadraticCurveTo(70, y + 5, 96 + (y - 58) * 0.1, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(18, 120);
  ctx.quadraticCurveTo(70, 134, 122, 120);
  ctx.stroke();
  // the clapper
  ctx.fillStyle = '#4a3018';
  ctx.beginPath();
  ctx.arc(70, 134, 9, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = rgba('#fff4d0', 0.55);
  ellipse(ctx, 50, 70, 5, 22, 0.25);
  ctx.fill();
  return c;
}
