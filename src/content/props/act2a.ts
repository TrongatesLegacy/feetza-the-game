// Props for the Stage 7–9 fights (Dough Boy, Nonna, Kraken): dough ball, rolling pin, big slipper,
// spoon bowl, big tentacle and the ink splat on a pizza. Same style as src/art/eventArt.ts.
import { type Ctx, ellipse, makeCanvas, rgba, roundRect } from '../../art/util';

const INK = '#2a1810';

function stroke(ctx: Ctx, lw = 4, col = INK): void {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.stroke();
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55, rot = -0.5): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function rad(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** A lumpy dough ball: golden-tan with a dark outline so it reads against Dough Boy's own cream. */
function doughBall(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 200);
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 78 + ((i * 37) % 5) * 3;
    const x = 100 + Math.cos(a) * r;
    const y = 104 + Math.sin(a) * r * 0.92;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(100 + Math.cos(a - 0.35) * r * 1.08, 104 + Math.sin(a - 0.35) * r, x, y);
  }
  ctx.fillStyle = rad(ctx, 100, 104, 90, [[0, '#fff1d2'], [0.6, '#e8c58a'], [1, '#b88448']]);
  ctx.fill();
  stroke(ctx, 7);
  // fold creases and flour dust
  ctx.strokeStyle = rgba(INK, 0.45);
  ctx.lineWidth = 4;
  for (const [x0, y0, x1, y1, cx, cy] of [[60, 120, 110, 150, 80, 150], [118, 70, 150, 112, 150, 80]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
  }
  ctx.fillStyle = rgba('#ffffff', 0.8);
  for (const [x, y, r] of [[70, 80, 5], [130, 150, 4], [150, 96, 3], [90, 132, 3], [112, 58, 4]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  shine(ctx, 72, 66, 24, 12, 0.6);
  return c;
}

/** A huge wooden rolling pin that spans the whole table (handles at both ends). */
function rollingPin(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(1560, 190);
  // handles
  for (const x of [20, 1400]) {
    roundRect(ctx, x, 70, 140, 50, 24);
    ctx.fillStyle = lin(ctx, 0, 70, 0, 120, [[0, '#d99a5a'], [1, '#7a4a20']]);
    ctx.fill();
    stroke(ctx, 6);
  }
  roundRect(ctx, 150, 14, 1260, 162, 70);
  ctx.fillStyle = lin(ctx, 0, 14, 0, 176, [[0, '#f6d29a'], [0.35, '#e8b46e'], [0.75, '#c2834a'], [1, '#8a5428']]);
  ctx.fill();
  stroke(ctx, 7);
  // wood grain
  ctx.strokeStyle = rgba('#8a5428', 0.5);
  ctx.lineWidth = 4;
  for (const y of [52, 96, 140]) {
    ctx.beginPath();
    ctx.moveTo(200, y);
    for (let x = 200; x < 1360; x += 120) ctx.quadraticCurveTo(x + 60, y + (x % 240 ? 8 : -8), x + 120, y);
    ctx.stroke();
  }
  // flour dust
  ctx.fillStyle = rgba('#ffffff', 0.7);
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(190 + ((i * 331) % 1180), 30 + ((i * 97) % 130), 3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  roundRect(ctx, 220, 30, 1120, 26, 13);
  ctx.fillStyle = rgba('#ffffff', 0.4);
  ctx.fill();
  return c;
}

/** A big fluffy house slipper (the one Nonna throws), drawn large so it reads at a big scale. */
function bigSlipper(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(320, 180);
  // sole
  ellipse(ctx, 160, 110, 146, 58);
  ctx.fillStyle = lin(ctx, 0, 60, 0, 170, [[0, '#8a2a52'], [1, '#4a1028']]);
  ctx.fill();
  stroke(ctx, 7);
  // upper
  ellipse(ctx, 160, 96, 134, 50);
  ctx.fillStyle = lin(ctx, 0, 46, 0, 146, [[0, '#ff9ad8'], [1, '#c2387e']]);
  ctx.fill();
  stroke(ctx, 6);
  // the toe cover, fluffy cream
  ctx.beginPath();
  ctx.ellipse(104, 80, 76, 38, 0, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(104, 104, 28, 80);
  ctx.fillStyle = lin(ctx, 0, 40, 0, 100, [[0, '#ffffff'], [1, '#f2d8e6']]);
  ctx.fill();
  stroke(ctx, 6);
  // pom-pom
  ctx.beginPath();
  ctx.arc(70, 44, 24, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 70, 44, 26, [[0, '#ffffff'], [1, '#ffb3d1']]);
  ctx.fill();
  stroke(ctx, 5);
  shine(ctx, 230, 80, 30, 12, 0.5, 0);
  return c;
}

/** The bowl end of Nonna's wooden spoon, hooked over the peel (the handle is drawn live). */
function spoonBowl(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(130, 150);
  ellipse(ctx, 65, 72, 52, 64);
  ctx.fillStyle = rad(ctx, 65, 72, 70, [[0, '#f6c88a'], [1, '#9a6430']]);
  ctx.fill();
  stroke(ctx, 7);
  ellipse(ctx, 65, 78, 34, 44);
  ctx.fillStyle = rgba('#7a4a20', 0.35);
  ctx.fill();
  shine(ctx, 46, 44, 14, 8, 0.6);
  return c;
}

/** A big, curling tentacle rising from under the table (origin at its base). */
function bigTentacle(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 680);
  ctx.beginPath();
  ctx.moveTo(60, 680);
  ctx.bezierCurveTo(10, 520, 200, 380, 130, 200);
  ctx.bezierCurveTo(108, 120, 136, 50, 190, 22);
  ctx.bezierCurveTo(210, 14, 226, 30, 212, 46);
  ctx.bezierCurveTo(182, 80, 176, 140, 196, 200);
  ctx.bezierCurveTo(250, 380, 110, 520, 200, 680);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 0, 260, 0, [[0, '#5a2484'], [0.5, '#9a52c8'], [1, '#c487e6']]);
  ctx.fill();
  stroke(ctx, 8);
  // suckers along the inner edge
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const y = 230 + t * 400;
    const x = 168 - Math.sin(t * 3.4) * 44 + t * 4;
    ellipse(ctx, x, y, 17 - t * 4, 13 - t * 3);
    ctx.fillStyle = '#ffd0ee';
    ctx.fill();
    stroke(ctx, 4);
    ellipse(ctx, x, y, 7 - t * 2, 5 - t);
    ctx.fillStyle = '#c45a9a';
    ctx.fill();
  }
  // sheen down the outer edge
  ctx.beginPath();
  ctx.moveTo(78, 640);
  ctx.bezierCurveTo(48, 520, 190, 400, 146, 230);
  ctx.strokeStyle = rgba('#ffffff', 0.35);
  ctx.lineWidth = 10;
  ctx.stroke();
  return c;
}

/** A glossy ink splat that sits on a pizza while its perk is frozen. */
function inkSplat(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 220);
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 96 + ((i * 53) % 7) * 7;
    const x = 150 + Math.cos(a) * r * 1.25;
    const y = 110 + Math.sin(a) * r * 0.72;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(150 + Math.cos(a - 0.22) * r * 1.5, 110 + Math.sin(a - 0.22) * r * 0.86, x, y);
  }
  ctx.fillStyle = rad(ctx, 150, 110, 140, [[0, '#4a3470'], [1, '#120a24']]);
  ctx.fill();
  stroke(ctx, 6);
  for (const [x, y, r] of [[30, 40, 12], [276, 60, 10], [260, 196, 14], [44, 190, 9]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1a48';
    ctx.fill();
    stroke(ctx, 4);
  }
  shine(ctx, 110, 80, 34, 14, 0.4);
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_doughball: doughBall,
  p_rollpin: rollingPin,
  p_bigslipper: bigSlipper,
  p_spoonbowl: spoonBowl,
  p_bigtentacle: bigTentacle,
  p_inkpizza: inkSplat,
};
