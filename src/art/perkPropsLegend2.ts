// Sprites for the pizza plan's Act 2 Legendaries (src/content/pizzas/p9.ts): King Honk's circus cannon (its cart and
// its barrel, which turns to aim) and the cream pie it fires, the circus's confetti; Sandcastle Sam's citadel wall
// (rising to take a stomp), the little keep standing by the Citadel pie and its pennants; and the Beach's breaking
// wave and its foam. Drawn once on canvases in the game's style (src/art/perkProps.ts): a dark outline, soft
// gradients, one light from the top left, a sheen.

import { ellipse, makeCanvas, rgba, rng, shade } from './util';

const INK = '#2a1810';
const TAU = Math.PI * 2;

// ════════════════════════════ King Honk's circus cannon ════════════════════════════

/** The cannon's cart: a red wooden carriage on two big circus wheels (gold hubs, red and yellow spokes), a gold star
 *  on its side. Its barrel sits on the trunnion at CANNON_PIVOT (origin there: 0.5, 0.42 of the canvas). */
export function drawCannonCart(): HTMLCanvasElement {
  const W = 300;
  const H = 220;
  const [c, ctx] = makeCanvas(W, H);
  // the carriage: a wedge of red wood with gold trim
  ctx.beginPath();
  ctx.moveTo(60, 150);
  ctx.lineTo(118, 78);
  ctx.lineTo(182, 78);
  ctx.lineTo(240, 150);
  ctx.lineTo(220, 166);
  ctx.lineTo(80, 166);
  ctx.closePath();
  const wood = ctx.createLinearGradient(0, 78, 0, 166);
  wood.addColorStop(0, '#ff5a4a');
  wood.addColorStop(0.5, '#d22a1e');
  wood.addColorStop(1, '#8a1410');
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // gold trim and the star
  ctx.beginPath();
  ctx.moveTo(74, 150);
  ctx.lineTo(124, 88);
  ctx.lineTo(176, 88);
  ctx.lineTo(226, 150);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.save();
  ctx.translate(150, 128);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const r = i % 2 ? 9 : 22;
    if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  const sg = ctx.createRadialGradient(-6, -8, 2, 0, 0, 22);
  sg.addColorStop(0, '#fff6b0');
  sg.addColorStop(1, '#e0a010');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
  // the wheels
  for (const x of [84, 216]) {
    const y = 168;
    const R = 46;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, R - 8, 0, TAU);
    ctx.fillStyle = '#2a1810';
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * (R - 9), y + Math.sin(a) * (R - 9));
      ctx.strokeStyle = i % 2 ? '#e2322a' : '#ffd23f';
      ctx.lineWidth = 7;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, R - 8, 0, TAU);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    // the rim's shine and the hub
    ctx.beginPath();
    ctx.arc(x, y, R - 3, Math.PI * 1.05, Math.PI * 1.55);
    ctx.strokeStyle = rgba('#ffffff', 0.7);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, TAU);
    const hub = ctx.createRadialGradient(x - 4, y - 4, 1, x, y, 11);
    hub.addColorStop(0, '#fff6b0');
    hub.addColorStop(1, '#c88a10');
    ctx.fillStyle = hub;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  // the trunnion
  ctx.beginPath();
  ctx.arc(150, 84, 14, 0, TAU);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  return c;
}

/** The cannon's barrel, pointing right from its breech (origin 0.16, 0.5): candy-striped red and white with gold
 *  bands, a flared gold muzzle and King Honk's polka dots. */
export function drawCannonBarrel(): HTMLCanvasElement {
  const W = 300;
  const H = 110;
  const [c, ctx] = makeCanvas(W, H);
  const cy = H / 2;
  const x0 = 20;
  const x1 = 262;
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(x0 + 10, cy - 30);
    ctx.lineTo(x1, cy - 22);
    ctx.lineTo(x1, cy + 22);
    ctx.lineTo(x0 + 10, cy + 30);
    ctx.quadraticCurveTo(x0 - 14, cy, x0 + 10, cy - 30);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = '#fff6ea';
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  // the candy stripes, slanting
  for (let i = -2; i < 14; i++) {
    ctx.beginPath();
    const x = x0 + i * 22;
    ctx.moveTo(x, cy - 40);
    ctx.lineTo(x + 12, cy - 40);
    ctx.lineTo(x + 30, cy + 40);
    ctx.lineTo(x + 18, cy + 40);
    ctx.closePath();
    ctx.fillStyle = '#e2322a';
    ctx.fill();
  }
  // its roundness: light along the top, shadow below
  const g = ctx.createLinearGradient(0, cy - 30, 0, cy + 30);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.05)');
  g.addColorStop(1, 'rgba(60,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // polka dots
  const r = rng(77);
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(x0 + 40 + i * 36 + r() * 6, cy - 10 + r() * 20, 4.5, 0, TAU);
    ctx.fillStyle = i % 2 ? '#2a7ae0' : '#ffd23f';
    ctx.fill();
  }
  ctx.restore();
  body();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // gold bands
  for (const [x, h] of [[x0 + 30, 30], [x0 + 140, 26]] as const) {
    ctx.beginPath();
    ctx.rect(x - 6, cy - h - 2, 12, (h + 2) * 2);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = rgba('#ffffff', 0.6);
    ctx.fillRect(x - 4, cy - h, 3, h * 0.8);
  }
  // the flared muzzle
  ctx.beginPath();
  ctx.moveTo(x1 - 6, cy - 24);
  ctx.quadraticCurveTo(x1 + 18, cy - 34, x1 + 30, cy - 38);
  ctx.lineTo(x1 + 30, cy + 38);
  ctx.quadraticCurveTo(x1 + 18, cy + 34, x1 - 6, cy + 24);
  ctx.closePath();
  const mg = ctx.createLinearGradient(0, cy - 38, 0, cy + 38);
  mg.addColorStop(0, '#fff6b0');
  mg.addColorStop(0.5, '#ffc72a');
  mg.addColorStop(1, '#b07a10');
  ctx.fillStyle = mg;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ellipse(ctx, x1 + 30, cy, 6, 34);
  ctx.fillStyle = '#2a1008';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  // the breech's knob
  ctx.beginPath();
  ctx.arc(x0 - 6, cy, 10, 0, TAU);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  return c;
}

/** The pie it fires: a fluted silver tin heaped with swirls of whipped cream and a cherry, seen from the side. */
export function drawCannonPie(): HTMLCanvasElement {
  const W = 150;
  const H = 130;
  const [c, ctx] = makeCanvas(W, H);
  const cx = W / 2;
  // the tin
  ctx.beginPath();
  ctx.moveTo(18, 78);
  ctx.lineTo(132, 78);
  ctx.lineTo(120, 112);
  ctx.lineTo(30, 112);
  ctx.closePath();
  const tin = ctx.createLinearGradient(18, 0, 132, 0);
  tin.addColorStop(0, '#8a96a6');
  tin.addColorStop(0.3, '#f4f8ff');
  tin.addColorStop(0.6, '#b8c4d4');
  tin.addColorStop(1, '#6a7688');
  ctx.fillStyle = tin;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    ctx.beginPath();
    ctx.moveTo(18 + t * 114, 80);
    ctx.lineTo(30 + t * 90, 110);
    ctx.strokeStyle = rgba('#4a5668', 0.45);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // the cream: a heap of swirled dollops
  const blobs: [number, number, number][] = [[cx - 38, 72, 22], [cx + 38, 72, 22], [cx - 16, 62, 26], [cx + 16, 62, 26], [cx, 44, 26], [cx - 4, 26, 16]];
  for (const [x, y, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  for (const [x, y, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y, r - 3.5, 0, TAU);
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, 1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#fff4e4');
    g.addColorStop(1, '#e8d4bc');
    ctx.fillStyle = g;
    ctx.fill();
    // its swirl
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, r * 0.5, Math.PI * 0.9, Math.PI * 2.1);
    ctx.strokeStyle = rgba('#c8b090', 0.55);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // the cherry
  ctx.beginPath();
  ctx.moveTo(cx + 2, 8);
  ctx.quadraticCurveTo(cx + 12, 2, cx + 16, -2);
  ctx.strokeStyle = '#3a7a22';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, 14, 10, 0, TAU);
  const ch = ctx.createRadialGradient(cx - 3, 10, 1, cx, 14, 10);
  ch.addColorStop(0, '#ff8a80');
  ch.addColorStop(0.5, '#e2122a');
  ch.addColorStop(1, '#8a0410');
  ctx.fillStyle = ch;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ellipse(ctx, cx - 3, 10, 3, 2, -0.6);
  ctx.fillStyle = rgba('#ffffff', 0.85);
  ctx.fill();
  return c;
}

/** A confetti strip, white (tinted per piece). */
export function drawConfetti(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(18, 10);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(2, 1);
  ctx.lineTo(16, 1);
  ctx.quadraticCurveTo(17, 5, 16, 9);
  ctx.lineTo(2, 9);
  ctx.quadraticCurveTo(1, 5, 2, 1);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(2, 6, 14, 3);
  return c;
}

// ════════════════════════════ Sandcastle Sam's citadel ════════════════════════════

const SAND_L = '#ffe8b4';
const SAND_M = '#eabd72';
const SAND_D = '#b07a3a';

/** Packed sand: crumbs and a few pressed shells over the current clip. */
function sandGrain(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 40; i++) {
    const v = r();
    ctx.fillStyle = v < 0.4 ? rgba('#fff6dc', 0.7) : v < 0.8 ? rgba('#8a5a22', 0.4) : rgba('#c88a40', 0.6);
    ctx.fillRect(r() * w, r() * h, 1.4 + r() * 1.4, 1.2 + r());
  }
}

/** A crenellated block from (x, y) to (x + w, y + h) with `teeth` merlons on top, filled with sand lit from the left. */
function battlement(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, teeth: number, tooth = 14): void {
  const tw = w / (teeth * 2 - 1);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y);
  for (let i = 0; i < teeth * 2 - 1; i++) {
    const tx = x + i * tw;
    if (i % 2 === 0) {
      ctx.lineTo(tx, y - tooth);
      ctx.lineTo(tx + tw, y - tooth);
    } else {
      ctx.lineTo(tx, y);
      ctx.lineTo(tx + tw, y);
    }
  }
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function sandFill(ctx: CanvasRenderingContext2D, x: number, w: number): void {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, SAND_L);
  g.addColorStop(0.45, SAND_M);
  g.addColorStop(1, SAND_D);
  ctx.fillStyle = g;
  ctx.fill();
}

/** A pennant on its pole (pole foot at x, y; h tall). */
function flagPole(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, col: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#f6e6c8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 1, y - h);
  ctx.quadraticCurveTo(x + h * 0.4, y - h * 0.98, x + h * 0.75, y - h * 0.8);
  ctx.quadraticCurveTo(x + h * 0.4, y - h * 0.66, x + 1, y - h * 0.58);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - h - 3, 5, 0, TAU);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** Sam's citadel wall, rising to take a stomp: a curtain wall between two round towers, a gatehouse with its arch and
 *  portcullis, arrow slits, shells pressed in, Sam's pennants on the towers; drawn from its base (origin 0.5, 1). */
export function drawCitadelWall(): HTMLCanvasElement {
  const W = 460;
  const H = 300;
  const [c, ctx] = makeCanvas(W, H);
  const base = H - 14;
  // the mound it stands on
  ellipse(ctx, W / 2, base + 2, 220, 14);
  ctx.fillStyle = SAND_D;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the curtain wall
  battlement(ctx, 70, 150, 320, base - 150, 7, 18);
  sandFill(ctx, 70, 320);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.save();
  battlement(ctx, 70, 150, 320, base - 150, 7, 18);
  ctx.clip();
  ctx.translate(70, 120);
  sandGrain(ctx, 320, 180, 31);
  ctx.restore();
  // its courses: lines of packed sand
  for (let y = 180; y < base; y += 28) {
    ctx.beginPath();
    ctx.moveTo(72, y);
    ctx.lineTo(388, y + 2);
    ctx.strokeStyle = rgba('#8a5a22', 0.35);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // the gatehouse
  battlement(ctx, 176, 118, 108, base - 118, 3, 18);
  sandFill(ctx, 176, 108);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(206, base);
  ctx.lineTo(206, 212);
  ctx.arc(230, 212, 24, Math.PI, 0);
  ctx.lineTo(254, base);
  ctx.closePath();
  ctx.fillStyle = '#4a2a10';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  for (let x = 210; x < 254; x += 10) {
    ctx.fillStyle = '#2a1608';
    ctx.fillRect(x, 186, 3, base - 186);
  }
  for (let y = 214; y < base; y += 14) {
    ctx.fillStyle = '#2a1608';
    ctx.fillRect(206, y, 48, 3);
  }
  ctx.restore();
  // the towers
  for (const x of [70, 390]) {
    const tw = 84;
    battlement(ctx, x - tw / 2, 96, tw, base - 96, 3, 20);
    sandFill(ctx, x - tw / 2, tw);
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.save();
    battlement(ctx, x - tw / 2, 96, tw, base - 96, 3, 20);
    ctx.clip();
    ctx.translate(x - tw / 2, 70);
    sandGrain(ctx, tw, 230, x);
    ctx.restore();
    // its round shading and an arrow slit
    const g = ctx.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.25)');
    g.addColorStop(0.4, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(60,30,0,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(x - tw / 2 + 3, 96, tw - 6, base - 98);
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(x - 4, 150, 8, 26);
    // a shell pressed into it
    ctx.save();
    ctx.translate(x + 12, 214);
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-11, 5, -11, -8, 0, -10);
    ctx.bezierCurveTo(11, -8, 11, 5, 0, 8);
    ctx.fillStyle = x < W / 2 ? '#ffd8cc' : '#fff4ea';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    flagPole(ctx, x, 76, 70, x < W / 2 ? '#e2322a' : '#2a7ae0');
  }
  flagPole(ctx, 230, 100, 86, '#e2322a');
  return c;
}

/** The little keep that stands by the Citadel pie (origin 0.5, 1): a squat sand keep between two turrets, its poles
 *  empty (its pennants, one a stomp left, fly on them as their own sprites at KEEP_POLES). */
export function drawKeep(): HTMLCanvasElement {
  const W = 200;
  const H = 170;
  const [c, ctx] = makeCanvas(W, H);
  const base = H - 8;
  ellipse(ctx, W / 2, base, 92, 9);
  ctx.fillStyle = SAND_D;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  for (const [x, y, w, teeth] of [[20, 74, 46, 2], [134, 74, 46, 2], [60, 54, 80, 3]] as const) {
    battlement(ctx, x, y, w, base - y, teeth, 12);
    sandFill(ctx, x, w);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.save();
    battlement(ctx, x, y, w, base - y, teeth, 12);
    ctx.clip();
    ctx.translate(x, y - 14);
    sandGrain(ctx, w, base - y + 14, x + 3);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(88, base);
  ctx.lineTo(88, 118);
  ctx.arc(100, 118, 12, Math.PI, 0);
  ctx.lineTo(112, base);
  ctx.closePath();
  ctx.fillStyle = '#4a2a10';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  for (const x of [43, 157]) {
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(x - 2.5, 96, 5, 16);
  }
  // the poles (the pennants are their own sprites)
  for (const [x, y] of KEEP_POLES) {
    ctx.beginPath();
    ctx.moveTo(x * W, y * H + 30);
    ctx.lineTo(x * W, y * H);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = '#f6e6c8';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x * W, y * H - 2, 4, 0, TAU);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  return c;
}

/** Where the keep's pennants fly (the top of each pole, as a share of its canvas): the middle one first. A fourth or
 *  fifth flies lower on a pole (keepPennant). */
export const KEEP_POLES: [number, number][] = [
  [0.5, 0.06],
  [0.215, 0.2],
  [0.785, 0.2],
];

/** Where the keep's i-th pennant flies (a share of its canvas). */
export function keepPennant(i: number): [number, number] {
  const [x, y] = KEEP_POLES[i % 3];
  return [x, y + Math.floor(i / 3) * 0.1];
}

/** A pennant (origin at its pole side: 0, 0.5), red, flying right. */
export function drawPennant(): HTMLCanvasElement {
  const W = 70;
  const H = 40;
  const [c, ctx] = makeCanvas(W, H);
  ctx.beginPath();
  ctx.moveTo(3, 4);
  ctx.quadraticCurveTo(34, 6, 66, 20);
  ctx.quadraticCurveTo(34, 30, 3, 36);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 4, 0, 36);
  g.addColorStop(0, '#ff6a58');
  g.addColorStop(0.5, '#e2322a');
  g.addColorStop(1, '#a81a14');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, 10);
  ctx.quadraticCurveTo(30, 12, 50, 18);
  ctx.strokeStyle = rgba('#ffffff', 0.5);
  ctx.lineWidth = 2;
  ctx.stroke();
  return c;
}

// ════════════════════════════ the Beach's tide ════════════════════════════

/** A wave breaking as it runs to the right (origin 0.5, 1): its sea-green body rising from a long low back to a
 *  curling crest at the front, the tube dark under the lip, white water tumbling off it and foam along its foot. */
export function drawTideWave(): HTMLCanvasElement {
  const W = 760;
  const H = 360;
  const [c, ctx] = makeCanvas(W, H);
  const r = rng(4417);
  const base = H - 10;
  // the body
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(0, base);
    ctx.bezierCurveTo(140, base - 30, 300, base - 120, 470, base - 230);
    ctx.bezierCurveTo(560, base - 300, 660, base - 320, 712, base - 270);
    // the curl's lip, tipping over
    ctx.bezierCurveTo(744, base - 240, 736, base - 190, 700, base - 182);
    ctx.bezierCurveTo(670, base - 176, 650, base - 200, 668, base - 220);
    ctx.bezierCurveTo(640, base - 210, 620, base - 150, 650, base - 90);
    ctx.bezierCurveTo(672, base - 50, 700, base - 20, 730, base);
    ctx.closePath();
  };
  body();
  const g = ctx.createLinearGradient(0, base - 320, 0, base);
  g.addColorStop(0, '#2ad0d8');
  g.addColorStop(0.45, '#1a9ab8');
  g.addColorStop(1, '#0e5a8a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#0a2a4a';
  ctx.stroke();
  ctx.save();
  body();
  ctx.clip();
  // the light through its face, the swell lines, the tube's shadow
  const lit = ctx.createRadialGradient(560, base - 220, 10, 560, base - 200, 220);
  lit.addColorStop(0, 'rgba(180,255,240,0.55)');
  lit.addColorStop(1, 'rgba(180,255,240,0)');
  ctx.fillStyle = lit;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(40 + i * 40, base);
    ctx.bezierCurveTo(180 + i * 30, base - 50 - i * 8, 360 + i * 20, base - 140 - i * 10, 520 + i * 14, base - 230 - i * 6);
    ctx.strokeStyle = rgba(i % 2 ? '#bff6ff' : '#0a3a6a', i % 2 ? 0.35 : 0.22);
    ctx.lineWidth = i % 2 ? 3 : 5;
    ctx.stroke();
  }
  const tube = ctx.createRadialGradient(690, base - 150, 10, 690, base - 150, 90);
  tube.addColorStop(0, 'rgba(6,40,70,0.7)');
  tube.addColorStop(1, 'rgba(6,40,70,0)');
  ctx.fillStyle = tube;
  ctx.fillRect(560, base - 260, 200, 260);
  ctx.restore();
  // white water along the crest and tumbling off the lip
  ctx.beginPath();
  ctx.moveTo(420, base - 200);
  ctx.bezierCurveTo(520, base - 270, 620, base - 318, 700, base - 282);
  ctx.bezierCurveTo(740, base - 256, 738, base - 200, 702, base - 186);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = rgba('#bff6ff', 0.9);
  ctx.lineWidth = 4;
  ctx.stroke();
  for (let i = 0; i < 46; i++) {
    const t = r();
    const x = 440 + t * 300 + (r() - 0.5) * 20;
    const y = base - 210 - Math.sin(t * Math.PI * 0.9) * 90 + (r() - 0.6) * 40;
    ctx.beginPath();
    ctx.arc(x, y, 3 + r() * 9, 0, TAU);
    ctx.fillStyle = rgba('#ffffff', 0.7 + r() * 0.3);
    ctx.fill();
  }
  // the foam along its foot
  for (let i = 0; i < 60; i++) {
    const x = r() * W * 0.98;
    const y = base - 4 - r() * 18 - (x > 600 ? r() * 40 : 0);
    ctx.beginPath();
    ctx.arc(x, y, 4 + r() * 10, 0, TAU);
    ctx.fillStyle = rgba('#ffffff', 0.6 + r() * 0.35);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, base);
  ctx.lineTo(W, base);
  ctx.strokeStyle = rgba('#ffffff', 0.85);
  ctx.lineWidth = 8;
  ctx.stroke();
  return c;
}

/** A puff of sea foam (spray and the Tiki's aura). */
export function drawFoam(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(40, 40);
  const r = rng(91);
  for (let i = 0; i < 7; i++) {
    const x = 20 + (r() - 0.5) * 16;
    const y = 20 + (r() - 0.5) * 12;
    const rr = 6 + r() * 6;
    const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 0, x, y, rr);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.7, 'rgba(235,252,255,0.9)');
    g.addColorStop(1, 'rgba(200,240,250,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, TAU);
    ctx.fill();
  }
  return c;
}

/** A sand grain mote (the Citadel's swirling sand). */
export function drawSandGrain(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(12, 12);
  ctx.beginPath();
  ctx.arc(6, 6, 3.4, 0, TAU);
  ctx.fillStyle = shade(SAND_M, 0.05);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba('#7a4a18', 0.8);
  ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', 0.6);
  ctx.fillRect(4, 4, 1.6, 1.6);
  return c;
}

/** A marquee bulb (the Big Top's aura): a warm glass bulb in a gold socket, its own glow round it (drawn lit; dimmed by
 *  alpha when it's off). */
export function drawBulb(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(32, 32);
  const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
  g.addColorStop(0, 'rgba(255,230,140,0.9)');
  g.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  ctx.beginPath();
  ctx.arc(16, 16, 6.5, 0, TAU);
  ctx.fillStyle = '#b88418';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(16, 16, 4.2, 0, TAU);
  ctx.fillStyle = '#fff6c0';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(14, 13.5, 2, 2);
  return c;
}
