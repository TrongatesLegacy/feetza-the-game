// Sprites for the pizza plan's Act 3 Legendaries (src/content/pizzas/p10.ts): the Cosmic Croc's crouton moon (a
// toasted cube drawn turning, frame by frame) and the portal it opens, a star streaking in; the Alpine Lodge's hearth
// (a roaring column of flame, a glowing coal, heat shimmer); and Space's black hole (its event horizon, the accretion
// disc spinning round it, the big black olive that opens it). Drawn once on canvases in the game's style
// (src/art/perkProps.ts): a dark outline, soft gradients, one light from the top left, a sheen.

import { blob, ellipse, makeCanvas, rgba, rng, shade } from './util';

const INK = '#2a1810';
const TAU = Math.PI * 2;

// ════════════════════════════ the crouton moon ════════════════════════════

/** Frames of the crouton turning (CROUTON_FRAMES of them, a quarter turn: a cube looks the same each quarter). */
export const CROUTON_FRAMES = 12;

type V3 = [number, number, number];

/** Toasted crumb colours, light to dark. */
const TOAST = ['#ffe6a8', '#f2c46a', '#d8963a', '#a8661e', '#6a3a10'];

/** One frame of the crouton: a toasted bread cube, slightly rounded, drawn turning about a tilted axis (frame i of
 *  CROUTON_FRAMES, a quarter turn in all), lit from the top left; crumb pits, a few herb flecks and a golden edge
 *  where it caught the oven. 96 px. */
export function drawCroutonFrame(i: number): HTMLCanvasElement {
  const S = 96;
  const [c, ctx] = makeCanvas(S, S);
  const th = (i / CROUTON_FRAMES) * (Math.PI / 2) + 0.35;
  const tilt = 0.55;
  const rot = (v: V3): V3 => {
    // about the vertical axis, then tipped towards the camera
    const x1 = v[0] * Math.cos(th) + v[2] * Math.sin(th);
    const z1 = -v[0] * Math.sin(th) + v[2] * Math.cos(th);
    const y2 = v[1] * Math.cos(tilt) - z1 * Math.sin(tilt);
    const z2 = v[1] * Math.sin(tilt) + z1 * Math.cos(tilt);
    return [x1, y2, z2];
  };
  const k = 24;
  const P = (v: V3): [number, number] => [S / 2 + v[0] * k, S / 2 + 2 + v[1] * k];
  const faces: { n: V3; q: V3[]; seed: number }[] = [
    { n: [0, -1, 0], q: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], seed: 1 },
    { n: [0, 1, 0], q: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]], seed: 2 },
    { n: [1, 0, 0], q: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], seed: 3 },
    { n: [-1, 0, 0], q: [[-1, -1, -1], [-1, 1, -1], [-1, 1, 1], [-1, -1, 1]], seed: 4 },
    { n: [0, 0, 1], q: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], seed: 5 },
    { n: [0, 0, -1], q: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]], seed: 6 },
  ];
  const L: V3 = [-0.45, -0.75, 0.5];
  const ln = Math.hypot(...L);
  // the drop shadow first
  ctx.fillStyle = 'rgba(20,10,4,0.28)';
  ellipse(ctx, S / 2 + 3, S / 2 + 34, 26, 7);
  ctx.fill();
  const vis = faces
    .map((f) => ({ ...f, rn: rot(f.n), pts: f.q.map((v) => P(rot(v))) }))
    .filter((f) => f.rn[2] > 0.02)
    .sort((a, b) => a.rn[2] - b.rn[2]);
  for (const f of vis) {
    const lit = Math.max(0, (f.rn[0] * L[0] + f.rn[1] * L[1] + f.rn[2] * L[2]) / ln);
    // a cube's corners are softened: the face drawn as a rounded quad
    ctx.save();
    ctx.beginPath();
    const pts = f.pts;
    for (let j = 0; j < 4; j++) {
      const a = pts[j];
      const b = pts[(j + 1) % 4];
      const m: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (j === 0) ctx.moveTo(m[0], m[1]);
      const nx = pts[(j + 1) % 4];
      const nn = pts[(j + 2) % 4];
      ctx.quadraticCurveTo(nx[0], nx[1], (nx[0] + nn[0]) / 2, (nx[1] + nn[1]) / 2);
    }
    ctx.closePath();
    const cx = pts.reduce((s, p) => s + p[0], 0) / 4;
    const cy = pts.reduce((s, p) => s + p[1], 0) / 4;
    const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
    const base = lit > 0.75 ? TOAST[1] : lit > 0.45 ? TOAST[2] : TOAST[3];
    g.addColorStop(0, shade(base, 0.12 + 0.1 * lit));
    g.addColorStop(1, shade(base, -0.12));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    // the bread's crumb: pits and toasted flecks, a few green herb flecks, olive-oil gloss
    const r = rng(f.seed * 97 + 11);
    for (let n = 0; n < 34; n++) {
      const u = r();
      const v = r();
      const x = pts[0][0] + (pts[1][0] - pts[0][0]) * u + (pts[3][0] - pts[0][0]) * v;
      const y = pts[0][1] + (pts[1][1] - pts[0][1]) * u + (pts[3][1] - pts[0][1]) * v;
      ctx.fillStyle = n % 5 === 0 ? rgba(TOAST[0], 0.55) : rgba(TOAST[4], 0.25 + r() * 0.25);
      blob(ctx, x, y, 0.8 + r() * 1.8, 0.5, r, 6);
      ctx.fill();
    }
    for (let n = 0; n < 4; n++) {
      const u = 0.15 + r() * 0.7;
      const v = 0.15 + r() * 0.7;
      const x = pts[0][0] + (pts[1][0] - pts[0][0]) * u + (pts[3][0] - pts[0][0]) * v;
      const y = pts[0][1] + (pts[1][1] - pts[0][1]) * u + (pts[3][1] - pts[0][1]) * v;
      ctx.fillStyle = n % 2 ? '#4a7a22' : '#6a9a32';
      ellipse(ctx, x, y, 1.6, 0.8, r() * 3);
      ctx.fill();
    }
    // a toasted edge darkening towards the corners, a gloss on the lit face
    const eg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 30);
    eg.addColorStop(0, 'rgba(0,0,0,0)');
    eg.addColorStop(1, rgba('#4a2408', 0.35));
    ctx.fillStyle = eg;
    ctx.fillRect(0, 0, S, S);
    if (lit > 0.6) {
      ctx.fillStyle = rgba('#fff6d8', 0.22 * lit);
      ellipse(ctx, cx - 5, cy - 4, 9, 4, -0.5);
      ctx.fill();
    }
    ctx.restore();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  // a pin of light on its top corner
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ellipse(ctx, S / 2 - 8, S / 2 - 16, 3, 1.6, -0.5);
  ctx.fill();
  return c;
}

/** The crouton portal: a rift in space edged with toasted gold (the crouton's crust), a swirl of the Cosmic Croc's
 *  blue and cyan spiralling into a dark violet eye, stars caught in it. 256 px, drawn flat (squash it to tilt it). */
export function drawPortal(): HTMLCanvasElement {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const C = S / 2;
  const R = 112;
  const r = rng(77);
  // the deep: violet to black at the eye
  const deep = ctx.createRadialGradient(C, C, 4, C, C, R);
  deep.addColorStop(0, '#050210');
  deep.addColorStop(0.35, '#140a3a');
  deep.addColorStop(0.75, '#2b3d8f');
  deep.addColorStop(1, '#5a4ad0');
  ctx.fillStyle = deep;
  ctx.beginPath();
  ctx.arc(C, C, R, 0, TAU);
  ctx.fill();
  // spiral arms of cyan and violet light winding in
  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, R, 0, TAU);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (let arm = 0; arm < 4; arm++) {
    const a0 = (arm / 4) * TAU;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.02) {
      const rr = R * (1 - t * 0.92);
      const a = a0 + t * 4.2;
      const x = C + Math.cos(a) * rr;
      const y = C + Math.sin(a) * rr;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = arm % 2 ? 'rgba(125,249,255,0.5)' : 'rgba(176,124,255,0.55)';
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // stars caught in the swirl
  for (let i = 0; i < 40; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r()) * R * 0.95;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`;
    ctx.beginPath();
    ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 0.6 + r() * 1.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // the eye: a soft glow at the very middle
  const eye = ctx.createRadialGradient(C, C, 0, C, C, 26);
  eye.addColorStop(0, 'rgba(220,240,255,0.55)');
  eye.addColorStop(1, 'rgba(120,140,255,0)');
  ctx.fillStyle = eye;
  ctx.fillRect(0, 0, S, S);
  // its rim: toasted gold, crumbed, with a bright inner lip (the crouton's crust torn open)
  ctx.beginPath();
  ctx.arc(C, C, R + 4, 0, TAU);
  ctx.arc(C, C, R - 8, 0, TAU, true);
  const rim = ctx.createLinearGradient(C - R, C - R, C + R, C + R);
  rim.addColorStop(0, '#ffe6a8');
  rim.addColorStop(0.5, '#d8963a');
  rim.addColorStop(1, '#8a4e14');
  ctx.fillStyle = rim;
  ctx.fill('evenodd');
  for (let i = 0; i < 90; i++) {
    const a = r() * TAU;
    const d = R - 8 + r() * 12;
    ctx.fillStyle = i % 4 ? rgba(TOAST[4], 0.35) : rgba(TOAST[0], 0.7);
    ctx.beginPath();
    ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 0.8 + r() * 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(C, C, R + 4, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(125,249,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(C, C, R - 9, 0, TAU);
  ctx.stroke();
  return c;
}

/** A star streaking in: a white-blue head and a fading tail (64 × 12, its head on the right). */
export function drawStarStreak(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 12);
  const g = ctx.createLinearGradient(0, 6, 64, 6);
  g.addColorStop(0, 'rgba(160,190,255,0)');
  g.addColorStop(0.7, 'rgba(200,220,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(58, 3.6);
  ctx.arc(58, 6, 2.4, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  const h = ctx.createRadialGradient(58, 6, 0, 58, 6, 6);
  h.addColorStop(0, 'rgba(255,255,255,1)');
  h.addColorStop(1, 'rgba(200,220,255,0)');
  ctx.fillStyle = h;
  ctx.fillRect(50, 0, 14, 12);
  return c;
}

// ════════════════════════════ the Lodge's hearth ════════════════════════════

/** The hearth's roar: a tall column of flame (tongues painted in layers, a red skin to a white-hot core) roaring up
 *  from its foot (origin 0.5, 1). 220 × 460. `ph` (0…1) turns the tongues, for a few frames of flicker. */
export function drawHearthFlame(ph = 0): HTMLCanvasElement {
  const Wd = 220;
  const Ht = 460;
  const [c, ctx] = makeCanvas(Wd, Ht);
  const r = rng(31 + Math.round(ph * 100));
  const layers: [string, string, number][] = [
    ['#8a1a08', '#d8321a', 1],
    ['#e2481a', '#ff8a2a', 0.8],
    ['#ff9a2a', '#ffd04a', 0.6],
    ['#ffe27a', '#fff8e0', 0.38],
    ['#fff6d0', '#ffffff', 0.2],
  ];
  for (const [c0, c1, k] of layers) {
    ctx.beginPath();
    const base = Ht - 6;
    const w = (Wd / 2 - 8) * k;
    ctx.moveTo(Wd / 2 - w, base);
    // tongues up the left side, a crown of tips, and down the right
    const tips = 5;
    for (let i = 0; i <= tips; i++) {
      const u = i / tips;
      const x = Wd / 2 - w + u * w * 2;
      const tall = (0.55 + 0.45 * Math.sin(u * Math.PI)) * (Ht - 30) * (0.55 + 0.45 * k) * (0.85 + 0.3 * r());
      const sway = Math.sin(ph * TAU + i * 1.7) * 14 * k;
      const tx = x + sway;
      const ty = base - tall;
      const prevx = Wd / 2 - w + ((i - 0.5) / tips) * w * 2;
      if (i === 0) ctx.quadraticCurveTo(Wd / 2 - w * 1.05, base - tall * 0.4, tx, ty);
      else ctx.quadraticCurveTo(prevx + sway * 0.4, base - tall * 0.35, tx, ty);
    }
    ctx.quadraticCurveTo(Wd / 2 + w * 1.05, base - Ht * 0.2 * k, Wd / 2 + w, base);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, base, 0, base - Ht * k);
    g.addColorStop(0, c1);
    g.addColorStop(0.55, c0);
    g.addColorStop(1, rgba(c0, 0));
    ctx.fillStyle = g;
    ctx.fill();
  }
  // licks of flame torn off its crown, rising free
  for (let i = 0; i < 4; i++) {
    const x = Wd / 2 + (i - 1.5) * 34 + Math.sin(ph * TAU + i) * 10;
    const y = 70 + r() * 90;
    const h = 30 + r() * 30;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.quadraticCurveTo(x + h * 0.35, y - h * 0.2, x, y);
    ctx.quadraticCurveTo(x - h * 0.35, y - h * 0.2, x, y - h);
    const lg = ctx.createLinearGradient(0, y, 0, y - h);
    lg.addColorStop(0, 'rgba(255,200,80,0.85)');
    lg.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = lg;
    ctx.fill();
  }
  // a glow at its foot
  const fg = ctx.createRadialGradient(Wd / 2, Ht - 20, 4, Wd / 2, Ht - 20, 90);
  fg.addColorStop(0, 'rgba(255,248,220,0.9)');
  fg.addColorStop(1, 'rgba(255,160,60,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, Ht - 120, Wd, 120);
  return c;
}

/** A glowing coal from the hearth: a lump of charcoal burning through, mostly glowing orange under a crust of ash
 *  and char, its cracks white-hot (40 px). */
export function drawCoal(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(40, 40);
  const r = rng(53);
  const g0 = ctx.createRadialGradient(20, 21, 2, 20, 21, 19);
  g0.addColorStop(0, 'rgba(255,170,60,0.7)');
  g0.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g0;
  ctx.fillRect(0, 0, 40, 40);
  blob(ctx, 20, 21, 10, 0.3, r, 9);
  const g = ctx.createRadialGradient(18, 23, 1, 20, 21, 11);
  g.addColorStop(0, '#ffe07a');
  g.addColorStop(0.35, '#ff8a1a');
  g.addColorStop(0.75, '#c8300a');
  g.addColorStop(1, '#4a1004');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the char on its top, broken by glowing cracks
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = rgba('#2a1410', 0.75);
    blob(ctx, 14 + r() * 12, 13 + r() * 8, 3 + r() * 3, 0.4, r, 6);
    ctx.fill();
  }
  ctx.restore();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = rgba(INK, 0.8);
  blob(ctx, 20, 21, 10, 0.3, rng(53), 9);
  ctx.stroke();
  ctx.strokeStyle = '#fff2b0';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(13, 22);
  ctx.lineTo(18, 24);
  ctx.lineTo(22, 20);
  ctx.lineTo(27, 23);
  ctx.stroke();
  return c;
}

/** Heat shimmer: a few wavering threads of hot air, faint, rising (48 × 160, origin at its foot). */
export function drawHeatShimmer(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(48, 160);
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    const x0 = 12 + k * 12;
    for (let y = 158; y >= 4; y -= 3) {
      const x = x0 + Math.sin(y * 0.09 + k * 2) * (3 + (158 - y) * 0.04);
      if (y === 158) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const g = ctx.createLinearGradient(0, 160, 0, 0);
    g.addColorStop(0, 'rgba(255,220,170,0.0)');
    g.addColorStop(0.25, 'rgba(255,220,170,0.55)');
    g.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  return c;
}

// ════════════════════════════ the black hole ════════════════════════════

/** The event horizon: a disc of perfect black, the photon ring hugging it (a thin white-gold line of bent light) and
 *  a soft glow of the light it's eating. 256 px; the black fills to 0.4 of it. */
export function drawEventHorizon(): HTMLCanvasElement {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const C = S / 2;
  const glow = ctx.createRadialGradient(C, C, 40, C, C, 128);
  glow.addColorStop(0, 'rgba(255,190,110,0.85)');
  glow.addColorStop(0.45, 'rgba(255,150,70,0.35)');
  glow.addColorStop(0.75, 'rgba(160,110,255,0.12)');
  glow.addColorStop(1, 'rgba(120,90,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);
  // the photon ring
  ctx.strokeStyle = 'rgba(255,248,230,0.95)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(C, C, 54, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,200,120,0.6)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(C, C, 57, 0, TAU);
  ctx.stroke();
  // the black
  const b = ctx.createRadialGradient(C, C, 40, C, C, 52);
  b.addColorStop(0, '#000000');
  b.addColorStop(0.85, '#020008');
  b.addColorStop(1, 'rgba(10,4,20,0.9)');
  ctx.fillStyle = b;
  ctx.beginPath();
  ctx.arc(C, C, 52, 0, TAU);
  ctx.fill();
  return c;
}

/** The accretion disc, drawn flat from above (squash it to tilt it; turn it to spin it): a ring of matter glowing
 *  white-hot at its inner edge (R0 px out of 256), orange and red further out, streaked by its spin, clear in the
 *  middle. 512 px. (The table's aura uses a wide hole, R0 150, so its hot edge hugs the plate.) */
export function drawAccretionDisc(R0 = 70): HTMLCanvasElement {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  const C = S / 2;
  const r = rng(141);
  const R1 = 250;
  const g = ctx.createRadialGradient(C, C, R0, C, C, R1);
  g.addColorStop(0, 'rgba(255,255,240,0)');
  g.addColorStop(0.03, 'rgba(255,250,235,0.95)');
  g.addColorStop(0.15, 'rgba(255,210,140,0.85)');
  g.addColorStop(0.4, 'rgba(255,140,60,0.6)');
  g.addColorStop(0.7, 'rgba(200,60,40,0.3)');
  g.addColorStop(1, 'rgba(120,40,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(C, C, R1, 0, TAU);
  ctx.arc(C, C, R0, 0, TAU, true);
  ctx.fill('evenodd');
  // streaks: arcs of brighter and darker matter wound round by the spin
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 120; i++) {
    const rr = R0 + 6 + Math.pow(r(), 1.6) * (R1 - R0 - 20);
    const a = r() * TAU;
    const len = 0.3 + r() * 0.9;
    const hot = 1 - (rr - R0) / (R1 - R0);
    ctx.strokeStyle = `rgba(255,${Math.round(170 + 80 * hot)},${Math.round(90 + 140 * hot)},${0.12 + 0.3 * hot * r()})`;
    ctx.lineWidth = 1 + r() * 3;
    ctx.beginPath();
    ctx.arc(C, C, rr, a, a + len);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 40; i++) {
    const rr = R0 + 20 + r() * (R1 - R0 - 30);
    const a = r() * TAU;
    ctx.strokeStyle = `rgba(0,0,0,${0.2 + r() * 0.3})`;
    ctx.lineWidth = 2 + r() * 5;
    ctx.beginPath();
    ctx.arc(C, C, rr, a, a + 0.2 + r() * 0.6);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

/** The big black olive that opens the hole: glossy, near black with a plum depth, its pit-hole showing a glint of
 *  light it's swallowing (80 px). */
export function drawBigOlive(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(80, 80);
  ellipse(ctx, 40, 41, 30, 26);
  const g = ctx.createRadialGradient(30, 30, 2, 40, 41, 32);
  g.addColorStop(0, '#5a4a66');
  g.addColorStop(0.35, '#241a2e');
  g.addColorStop(1, '#06040a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the hole where the pit was
  ellipse(ctx, 41, 42, 10, 8.5);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,110,0.85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // its gloss
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ellipse(ctx, 27, 27, 8, 4, -0.7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ellipse(ctx, 55, 55, 6, 2.5, -0.7);
  ctx.fill();
  return c;
}
