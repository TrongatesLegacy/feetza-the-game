// Sprites for the phase 3 pizza perks (src/game/pizzaPerks.ts): Bolognese's meatball, the
// Meteorite Margherita's meteor, the Haunted Hawaiian's ghost pineapple ring and the Pirate's
// Treasure chest. Drawn once on canvases in the game's style: dark outline, soft gradient, a sheen.

import { blob, ellipse, makeCanvas, rgba, rng, roundRect, shade, type Ctx } from './util';

const INK = '#2a1810';

function sheen(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55): void {
  ctx.fillStyle = rgba('#ffffff', a);
  ellipse(ctx, x, y, rx, ry, -0.6);
  ctx.fill();
}

/** A glossy meatball in sauce with herb flecks. */
export function drawMeatball(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(84, 84);
  const r = rng(7);
  ctx.translate(42, 42);
  blob(ctx, 0, 0, 31, 0.12, r, 12);
  ctx.fillStyle = INK;
  ctx.fill();
  blob(ctx, 0, 0, 27, 0.12, r, 12);
  const g = ctx.createRadialGradient(-9, -10, 3, 0, 0, 30);
  g.addColorStop(0, '#b0603a');
  g.addColorStop(0.6, '#7a3a1e');
  g.addColorStop(1, '#4a2010');
  ctx.fillStyle = g;
  ctx.fill();
  // sauce glaze on top
  blob(ctx, -2, -6, 17, 0.4, r, 9);
  ctx.fillStyle = rgba('#c22f1c', 0.75);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 3 ? '#2f5d1c' : '#fff6d8';
    ctx.fillRect((r() - 0.5) * 34, (r() - 0.5) * 34, 3, 2.5);
  }
  sheen(ctx, -10, -13, 8, 4);
  return c;
}

/** A small meteor: a dark cratered rock wrapped in fire, travelling down-left. */
export function drawMeteor(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 200);
  const r = rng(11);
  // fiery tail up and to the right
  ctx.save();
  ctx.translate(100, 100);
  ctx.rotate(-Math.PI / 4);
  for (const [w, col, a] of [[70, '#ff5a1a', 0.35], [46, '#ffb03a', 0.55], [22, '#fff2b0', 0.8]] as const) {
    const g = ctx.createLinearGradient(0, 0, 0, -100);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(0, -120, w / 2, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.translate(100, 100);
  const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 46);
  glow.addColorStop(0, rgba('#ffb03a', 0.7));
  glow.addColorStop(1, rgba('#ff5a1a', 0));
  ctx.fillStyle = glow;
  ellipse(ctx, 0, 0, 46, 46);
  ctx.fill();
  blob(ctx, 0, 0, 27, 0.25, r, 9);
  ctx.fillStyle = INK;
  ctx.fill();
  blob(ctx, 0, 0, 23, 0.25, r, 9);
  const g = ctx.createRadialGradient(-7, -8, 2, 0, 0, 26);
  g.addColorStop(0, '#6a5a58');
  g.addColorStop(1, '#2a2226');
  ctx.fillStyle = g;
  ctx.fill();
  // glowing cracks and craters
  ctx.strokeStyle = '#ffb03a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-14, 4);
  ctx.lineTo(-4, -2);
  ctx.lineTo(4, 8);
  ctx.lineTo(14, 2);
  ctx.moveTo(-4, -2);
  ctx.lineTo(-2, -14);
  ctx.stroke();
  for (const [x, y, s] of [[8, -10, 5], [-12, -8, 4], [6, 14, 3.5]]) {
    ctx.fillStyle = rgba('#141014', 0.7);
    ellipse(ctx, x, y, s, s * 0.8);
    ctx.fill();
  }
  return c;
}

/** A ghostly pineapple ring: pale yellow-green, see-through, with a faint glow. */
export function drawGhostRing(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 120);
  ctx.translate(60, 60);
  const glow = ctx.createRadialGradient(0, 0, 20, 0, 0, 58);
  glow.addColorStop(0, rgba('#b8ffb0', 0));
  glow.addColorStop(0.7, rgba('#b8ffb0', 0.35));
  glow.addColorStop(1, rgba('#b8ffb0', 0));
  ctx.fillStyle = glow;
  ellipse(ctx, 0, 0, 58, 58);
  ctx.fill();
  const ring = (rr: number) => {
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.arc(0, 0, 15, 0, Math.PI * 2, true);
  };
  ring(42);
  ctx.fillStyle = INK;
  ctx.fill('evenodd');
  ring(38);
  const g = ctx.createRadialGradient(-10, -12, 6, 0, 0, 40);
  g.addColorStop(0, '#fbffc8');
  g.addColorStop(0.7, '#e2f27a');
  g.addColorStop(1, '#a8c84a');
  ctx.fillStyle = g;
  ctx.fill('evenodd');
  // fibre lines
  ctx.strokeStyle = rgba('#8aa83a', 0.7);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
    ctx.lineTo(Math.cos(a) * 36, Math.sin(a) * 36);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba('#ffffff', 0.7);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 33, -2.6, -1.4);
  ctx.stroke();
  // ghost eyes: it's haunted
  for (const sx of [-1, 1]) {
    ctx.fillStyle = INK;
    ellipse(ctx, sx * 9, -25, 3.5, 5);
    ctx.fill();
  }
  return c;
}

/** A pirate's treasure chest made from a pizza box, closed or open with gold spilling out. */
export function drawChest(open: boolean): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(180, 160);
  const wood = '#c88a4a';
  ctx.translate(90, 96);
  // gold glow behind an open chest
  if (open) {
    const gl = ctx.createRadialGradient(0, -30, 10, 0, -30, 90);
    gl.addColorStop(0, rgba('#fff2a0', 0.8));
    gl.addColorStop(1, rgba('#ffd23f', 0));
    ctx.fillStyle = gl;
    ellipse(ctx, 0, -30, 90, 70);
    ctx.fill();
  }
  // body
  roundRect(ctx, -66, -24, 132, 72, 10);
  ctx.fillStyle = INK;
  ctx.fill();
  roundRect(ctx, -61, -20, 122, 64, 8);
  const g = ctx.createLinearGradient(0, -20, 0, 44);
  g.addColorStop(0, shade(wood, 0.2));
  g.addColorStop(1, shade(wood, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  // cardboard corrugation lines and a red pizza-box stripe
  ctx.strokeStyle = rgba('#6a3a18', 0.4);
  ctx.lineWidth = 2;
  for (let x = -50; x <= 50; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, -16);
    ctx.lineTo(x, 40);
    ctx.stroke();
  }
  ctx.fillStyle = '#d23a2a';
  ctx.fillRect(-61, 2, 122, 10);
  // metal bands and lock
  ctx.fillStyle = '#ffd23f';
  for (const x of [-48, 48]) {
    ctx.fillRect(x - 5, -20, 10, 64);
  }
  roundRect(ctx, -12, -6, 24, 26, 5);
  ctx.fillStyle = INK;
  ctx.fill();
  roundRect(ctx, -9, -3, 18, 20, 4);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.fillStyle = INK;
  ellipse(ctx, 0, 6, 3, 4);
  ctx.fill();
  // lid
  ctx.save();
  if (open) {
    ctx.translate(0, -24);
    ctx.scale(1, -0.45);
    ctx.translate(0, 24);
  }
  ctx.beginPath();
  ctx.moveTo(-66, -22);
  ctx.quadraticCurveTo(0, -78, 66, -22);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-61, -24);
  ctx.quadraticCurveTo(0, -72, 61, -24);
  ctx.closePath();
  const lg = ctx.createLinearGradient(0, -70, 0, -24);
  lg.addColorStop(0, shade(wood, 0.35));
  lg.addColorStop(1, shade(wood, -0.1));
  ctx.fillStyle = lg;
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  for (const x of [-48, 48]) ctx.fillRect(x - 5, -44, 10, 20);
  ctx.restore();
  if (open) {
    // a heap of gold coins and a pepperoni or two
    const r = rng(5);
    for (let i = 0; i < 16; i++) {
      const x = (r() - 0.5) * 100;
      const y = -26 - r() * 26 + Math.abs(x) * 0.25;
      ellipse(ctx, x, y, 11, 8);
      ctx.fillStyle = '#8a5a10';
      ctx.fill();
      ellipse(ctx, x, y - 1.5, 9.5, 6.5);
      ctx.fillStyle = i % 5 === 0 ? '#c8432a' : '#ffd23f';
      ctx.fill();
    }
    sheen(ctx, -20, -44, 10, 4, 0.7);
  } else sheen(ctx, -24, -52, 16, 5, 0.45);
  return c;
}
