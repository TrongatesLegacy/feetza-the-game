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

/** Disco Diner Pie's mirror ball: a sphere of little mirrors, lit from the top left, hung on a short chain. */
export function drawDiscoBall(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(112, 132);
  const r = rng(31);
  const cx = 56;
  const cy = 76;
  const R = 46;
  // the chain
  ctx.strokeStyle = '#8a8a96';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, cy - R);
  ctx.stroke();
  ellipse(ctx, cx, cy, R + 4, R + 4);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.save();
  ellipse(ctx, cx, cy, R, R);
  ctx.clip();
  const g = ctx.createRadialGradient(cx - 16, cy - 18, 4, cx, cy, R);
  g.addColorStop(0, '#f4f6ff');
  g.addColorStop(0.5, '#9aa2bc');
  g.addColorStop(1, '#3a3e5a');
  ctx.fillStyle = g;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  // the mirror tiles: rows of facets, each catching a different light
  const rows = 9;
  for (let i = 0; i < rows; i++) {
    const lat = -Math.PI / 2 + ((i + 0.5) / rows) * Math.PI;
    const y = cy + Math.sin(lat) * R;
    const w = Math.cos(lat) * R;
    const cols = Math.max(3, Math.round(w / 5));
    for (let j = 0; j < cols; j++) {
      const lon = -Math.PI / 2 + ((j + 0.5) / cols) * Math.PI;
      const x = cx + Math.sin(lon) * w;
      const fw = Math.max(2, (Math.cos(lon) * w * Math.PI) / cols - 1.2);
      const fh = (R * Math.PI) / rows - 1.4;
      const lit = 0.25 + 0.75 * Math.max(0, -Math.sin(lon) * 0.5 - Math.sin(lat) * 0.6 + 0.3) + (r() - 0.5) * 0.35;
      const tile = ['#dfe4ff', '#ffd6f4', '#d6f4ff', '#fff4c8'][Math.floor(r() * 4)];
      ctx.fillStyle = rgba(shade(tile, lit - 0.7), 0.95);
      ctx.fillRect(x - fw / 2, y - fh / 2, fw, fh);
    }
  }
  ctx.restore();
  // a hot glint top left and a sparkle
  sheen(ctx, cx - 18, cy - 20, 9, 5, 0.8);
  ctx.fillStyle = '#ffffff';
  for (const [x, y, s] of [[cx - 16, cy - 22, 10], [cx + 20, cy + 8, 6]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.2, y - s * 0.2);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x + s * 0.2, y + s * 0.2);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.2, y + s * 0.2);
    ctx.lineTo(x - s, y);
    ctx.lineTo(x - s * 0.2, y - s * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  return c;
}

/** A music note (a pair of joined quavers), white so it can be tinted. */
export function drawMusicNote(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 64);
  const draw = (col: string, w: number, k = 0) => {
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = w;
    ellipse(ctx, 18, 48, 9 + 2 - k, 6.5 + 2 - k, -0.4);
    ctx.fill();
    ellipse(ctx, 44, 42, 9 + 2 - k, 6.5 + 2 - k, -0.4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(26, 46);
    ctx.lineTo(26, 12);
    ctx.lineTo(52, 6);
    ctx.lineTo(52, 40);
    ctx.stroke();
    ctx.lineWidth = w + 4;
    ctx.beginPath();
    ctx.moveTo(26, 14);
    ctx.lineTo(52, 8);
    ctx.stroke();
  };
  ctx.save();
  ctx.translate(1, 2);
  draw(INK, 9);
  ctx.restore();
  draw(INK, 8);
  draw('#ffffff', 4, 2.2);
  return c;
}

/** A cone of stage light (white, so it can be tinted), bright at its tip and fading as it widens. */
export function drawLightBeam(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(160, 512);
  for (let y = 0; y < 512; y += 2) {
    const t = y / 512;
    const half = 6 + t * 74;
    const g = ctx.createLinearGradient(80 - half, 0, 80 + half, 0);
    const a = 0.85 * (1 - t) ** 1.2;
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, rgba('#ffffff', a));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(80 - half, y, half * 2, 2);
  }
  return c;
}

/** Phantom Waltz's friendly ghost: a little sheet ghost from the Phantom King's court, one arm raised to waltz, a
 *  violet bow tie, see-through at its hem. Drawn pale so the scene can tint it. */
export function drawWaltzGhost(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 160);
  ctx.translate(70, 76);
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-34, 44);
    ctx.lineTo(-34, -6);
    ctx.bezierCurveTo(-34, -46, 34, -46, 34, -6);
    ctx.lineTo(34, 44);
    // a wavy hem, swishing as it waltzes
    for (let i = 0; i < 4; i++) {
      const x0 = 34 - i * 17;
      ctx.quadraticCurveTo(x0 - 8.5, 44 + (i % 2 ? -10 : 14), x0 - 17, 44);
    }
    ctx.closePath();
  };
  // its soft glow
  const glow = ctx.createRadialGradient(0, 4, 10, 0, 4, 70);
  glow.addColorStop(0, rgba('#d8c0ff', 0.45));
  glow.addColorStop(1, rgba('#d8c0ff', 0));
  ctx.fillStyle = glow;
  ctx.fillRect(-70, -76, 140, 160);
  // the raised arm (behind) and the one on its hip
  ctx.lineCap = 'round';
  for (const [w, col] of [[15, '#5a4a78'], [11, '#f4f0ff']] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(26, -2);
    ctx.quadraticCurveTo(46, -18, 44, -40);
    ctx.moveTo(-28, 8);
    ctx.quadraticCurveTo(-46, 12, -36, 26);
    ctx.stroke();
  }
  body();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#4a3a6a';
  ctx.stroke();
  body();
  const g = ctx.createLinearGradient(0, -40, 0, 54);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#eee8ff');
  g.addColorStop(1, rgba('#c8b8f0', 0.55));
  ctx.fillStyle = g;
  ctx.fill();
  // eyes, cheeks and a happy little "o"
  ctx.fillStyle = '#2a2040';
  ellipse(ctx, -11, -10, 5, 7);
  ctx.fill();
  ellipse(ctx, 11, -10, 5, 7);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, -12.5, -13, 1.8, 1.8);
  ctx.fill();
  ellipse(ctx, 9.5, -13, 1.8, 1.8);
  ctx.fill();
  ctx.fillStyle = rgba('#ff9ad0', 0.5);
  ellipse(ctx, -19, 0, 4.5, 2.6);
  ctx.fill();
  ellipse(ctx, 19, 0, 4.5, 2.6);
  ctx.fill();
  ctx.fillStyle = '#2a2040';
  ellipse(ctx, 0, 4, 3.2, 3.8);
  ctx.fill();
  // the Phantom King's violet bow tie
  ctx.fillStyle = '#7a3ad0';
  ctx.strokeStyle = '#2e0f62';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.lineTo(-13, 9);
  ctx.lineTo(-13, 23);
  ctx.closePath();
  ctx.moveTo(0, 16);
  ctx.lineTo(13, 9);
  ctx.lineTo(13, 23);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ellipse(ctx, 0, 16, 3.4, 3.4);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  sheen(ctx, -16, -26, 9, 4, 0.7);
  return c;
}

/** Comet Calzone's comet, from the Cosmic Croc's sky: an icy head of rock and frost, blazing blue-white, with a long
 *  tail streaming up and to the right (it travels down-left). */
export function drawComet(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(320, 320);
  const r = rng(23);
  ctx.save();
  ctx.translate(110, 210);
  ctx.rotate(Math.PI / 4);
  // the tail: three layers, widest and faintest outside, with a few streaks of dust in it
  for (const [w, col, a] of [[84, '#4a8aff', 0.3], [54, '#9ad0ff', 0.5], [24, '#f4faff', 0.85]] as const) {
    const g = ctx.createLinearGradient(0, 0, 0, -200);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(-w * 0.1, -230, 0, -230);
    ctx.quadraticCurveTo(w * 0.1, -230, w / 2, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = rgba('#ffffff', 0.45);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const x = (r() - 0.5) * 40;
    ctx.beginPath();
    ctx.moveTo(x * 0.3, -20);
    ctx.lineTo(x, -110 - r() * 70);
    ctx.stroke();
  }
  ctx.restore();
  ctx.translate(110, 210);
  const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 52);
  glow.addColorStop(0, rgba('#e8f6ff', 0.9));
  glow.addColorStop(0.5, rgba('#6ab0ff', 0.45));
  glow.addColorStop(1, rgba('#2a6aff', 0));
  ctx.fillStyle = glow;
  ellipse(ctx, 0, 0, 52, 52);
  ctx.fill();
  blob(ctx, 0, 0, 25, 0.22, r, 9);
  ctx.fillStyle = '#1a2440';
  ctx.fill();
  blob(ctx, 0, 0, 21, 0.22, r, 9);
  const g = ctx.createRadialGradient(-6, -7, 2, 0, 0, 24);
  g.addColorStop(0, '#d8ecff');
  g.addColorStop(0.5, '#7a9ac8');
  g.addColorStop(1, '#3a4a6a');
  ctx.fillStyle = g;
  ctx.fill();
  // frost caps and craters on the rock
  for (const [x, y, s] of [[7, -9, 4.5], [-10, -6, 3.5], [5, 11, 3]]) {
    ctx.fillStyle = rgba('#22304a', 0.6);
    ellipse(ctx, x, y, s, s * 0.8);
    ctx.fill();
  }
  sheen(ctx, -8, -10, 7, 3, 0.8);
  return c;
}

/** Sandcastle Sundae's sand wall: Sandcastle Sam's rampart of pressed sand, a tower at each end with a pennant, in the
 *  style of the Sundae's sandcastles (shaded, crumbly, outlined), for the wall that rises to block a stomp. */
export function drawSandWall(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(280, 170);
  const r = rng(31);
  const sand = '#e2b46a';
  const dark = '#a8743a';
  const line = '#6a4418';
  const crenel = (x: number, y: number, w: number, h: number, teeth: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    const tw = w / (teeth * 2 - 1);
    for (let i = 0; i < teeth * 2 - 1; i++) {
      const tx = x + i * tw;
      const up = i % 2 === 0 ? -12 : 0;
      ctx.lineTo(tx, y + up);
      ctx.lineTo(tx + tw, y + up);
    }
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  };
  const part = (x: number, y: number, w: number, h: number, teeth: number) => {
    crenel(x, y, w, h, teeth);
    ctx.save();
    ctx.translate(3, 3);
    ctx.fillStyle = dark;
    ctx.fill();
    ctx.restore();
    crenel(x, y, w, h, teeth);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, shade(sand, 0.15));
    g.addColorStop(0.6, sand);
    g.addColorStop(1, shade(sand, -0.18));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = line;
    ctx.stroke();
    ctx.save();
    crenel(x, y, w, h, teeth);
    ctx.clip();
    for (let i = 0; i < (w * h) / 18; i++) {
      ctx.fillStyle = r() < 0.5 ? rgba('#fff0c8', 0.6) : rgba('#8a5a22', 0.45);
      ctx.fillRect(x + r() * w, y - 12 + r() * (h + 12), 2, 2);
    }
    // pressed-sand courses
    ctx.strokeStyle = rgba('#8a5a22', 0.35);
    ctx.lineWidth = 2;
    for (let yy = y + 18; yy < y + h; yy += 18) {
      ctx.beginPath();
      ctx.moveTo(x, yy + Math.sin(yy) * 2);
      ctx.lineTo(x + w, yy - Math.sin(yy) * 2);
      ctx.stroke();
    }
    ctx.restore();
  };
  // the rampart, then a tower at each end
  part(40, 62, 200, 100, 6);
  part(8, 30, 56, 132, 2);
  part(216, 30, 56, 132, 2);
  // the gate and arrow slits
  ctx.fillStyle = '#5a3412';
  ctx.beginPath();
  ctx.moveTo(122, 162);
  ctx.lineTo(122, 122);
  ctx.arc(140, 122, 18, Math.PI, 0);
  ctx.lineTo(158, 162);
  ctx.closePath();
  ctx.fill();
  for (const x of [30, 244]) ctx.fillRect(x, 70, 6, 18);
  // pennants on the towers
  for (const [x, col] of [[36, '#e83a3a'], [244, '#2a8ae0']] as const) {
    ctx.strokeStyle = '#f6e6c8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x, -2 + 4);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x + 1, 2);
    ctx.quadraticCurveTo(x + 12, 4, x + 22, 10);
    ctx.quadraticCurveTo(x + 12, 13, x + 1, 16);
    ctx.closePath();
    ctx.fill();
  }
  sheen(ctx, 70, 80, 14, 4, 0.35);
  return c;
}

// ——— the Epic Pizzeria pizzas (step 4, batch 2): Act 9's myths ———

/** Labyrinth Lasagne's lost foot: a little round Cretan labyrinth in sandstone, turning over its head. */
export function drawMaze(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 120);
  ctx.translate(60, 60);
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-16, -18, 4, 0, 0, 52);
  g.addColorStop(0, '#f2dca8');
  g.addColorStop(0.6, '#c8a064');
  g.addColorStop(1, '#8a6034');
  ctx.fillStyle = g;
  ctx.fill();
  // the paths: rings with gaps, the gaps turning, and a wall from each gap to the next ring
  ctx.lineCap = 'round';
  const rings = [42, 33, 24, 15];
  rings.forEach((rr, i) => {
    const gap = i * 1.7 + 0.4;
    for (const [w, col] of [[6, '#5a3a18'], [3.2, '#f6e2b4']] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(0, 0, rr, gap + 0.45, gap + Math.PI * 2 - 0.45);
      ctx.stroke();
      if (i < rings.length - 1) {
        const a = gap + Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        ctx.lineTo(Math.cos(a) * rings[i + 1], Math.sin(a) * rings[i + 1]);
        ctx.stroke();
      }
    }
  });
  // a dot at its heart (the lost foot looking for the way out)
  ctx.fillStyle = '#c8402a';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  sheen(ctx, -18, -24, 14, 5, 0.4);
  return c;
}

/** Ember Shade's embers: a little drift of the underworld's coals, glowing, a tongue of Hades' blue fire over them. */
export function drawEmbers(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 120);
  const r = rng(41);
  // the heat haze round them
  const haze = ctx.createRadialGradient(60, 74, 4, 60, 70, 56);
  haze.addColorStop(0, rgba('#ff7a2a', 0.55));
  haze.addColorStop(1, rgba('#ff3a0a', 0));
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, 120, 120);
  // the blue flame behind
  for (const [w, h, col] of [[22, 58, rgba('#3a8aff', 0.8)], [13, 40, '#bfe6ff']] as const) {
    ctx.beginPath();
    ctx.moveTo(60 - w, 80);
    ctx.bezierCurveTo(60 - w, 80 - h * 0.6, 60 - w * 0.2, 80 - h * 0.7, 62, 80 - h);
    ctx.bezierCurveTo(60 + w * 0.5, 80 - h * 0.6, 60 + w, 80 - h * 0.4, 60 + w, 80);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  }
  // the coals
  for (let i = 0; i < 6; i++) {
    const x = 34 + i * 10 + (r() - 0.5) * 6;
    const y = 82 + Math.sin(i * 1.7) * 5;
    const rr = 9 + r() * 5;
    blob(ctx, x, y, rr + 2, 0.3, r, 7);
    ctx.fillStyle = INK;
    ctx.fill();
    blob(ctx, x, y, rr, 0.3, r, 7);
    const g = ctx.createRadialGradient(x - 3, y - 4, 1, x, y, rr);
    g.addColorStop(0, '#ffe08a');
    g.addColorStop(0.35, '#ff7a2a');
    g.addColorStop(0.8, '#8a1a0a');
    g.addColorStop(1, '#2a0a06');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#fff2b0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - rr * 0.5, y);
    ctx.lineTo(x, y + rr * 0.2);
    ctx.lineTo(x + rr * 0.3, y - rr * 0.3);
    ctx.stroke();
  }
  return c;
}

/** Harpy Feather Pie's gust: one of the Harpies' feathers, dusky violet barred with gold. */
export function drawFeather(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 60);
  ctx.translate(70, 30);
  const vane = (grow: number) => {
    ctx.beginPath();
    ctx.moveTo(-60, 2);
    ctx.bezierCurveTo(-30, -22 - grow, 30, -20 - grow, 62, -2);
    ctx.bezierCurveTo(30, 18 + grow, -30, 20 + grow, -60, 2);
    ctx.closePath();
  };
  vane(3);
  ctx.fillStyle = '#1e1428';
  ctx.fill();
  vane(0);
  const g = ctx.createLinearGradient(0, -20, 0, 20);
  g.addColorStop(0, '#9a84b8');
  g.addColorStop(0.5, '#5a4a6a');
  g.addColorStop(1, '#3a2a4a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    const x = -40 + i * 18;
    ctx.fillStyle = rgba('#d9a441', 0.9);
    ctx.beginPath();
    ctx.moveTo(x - 4, -22);
    ctx.lineTo(x + 3, -22);
    ctx.lineTo(x - 2, 22);
    ctx.lineTo(x - 9, 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = rgba('#2a1a38', 0.5);
  ctx.lineWidth = 1;
  for (let x = -52; x < 58; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, 1);
    ctx.lineTo(x + 7, -20);
    ctx.moveTo(x, 1);
    ctx.lineTo(x + 7, 20);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#f2e6c8';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-68, 4);
  ctx.quadraticCurveTo(0, -2, 60, -2);
  ctx.stroke();
  sheen(ctx, -10, -8, 18, 3, 0.35);
  return c;
}

/** Golden Fleece's moment: the fleece itself, a golden ram's pelt of curls, gleaming. */
export function drawFleece(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(180, 130);
  const r = rng(53);
  ctx.translate(90, 66);
  // the pelt's outline: a body with its legs hanging and a little head, as it hung on the tree
  const pelt = (grow: number) => {
    ctx.beginPath();
    ctx.moveTo(-60 - grow, -22);
    ctx.quadraticCurveTo(-74 - grow, -40, -56, -48 - grow);
    ctx.quadraticCurveTo(0, -60 - grow, 56, -48 - grow);
    ctx.quadraticCurveTo(76 + grow, -40, 62 + grow, -20);
    ctx.lineTo(70 + grow, 40 + grow);
    ctx.lineTo(48, 34);
    ctx.quadraticCurveTo(0, 46 + grow, -48, 34);
    ctx.lineTo(-70 - grow, 40 + grow);
    ctx.closePath();
  };
  pelt(4);
  ctx.fillStyle = '#5a3206';
  ctx.fill();
  pelt(0);
  const g = ctx.createLinearGradient(-60, -50, 60, 40);
  g.addColorStop(0, '#fff2a8');
  g.addColorStop(0.5, '#ffc83a');
  g.addColorStop(1, '#b8740e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the curls
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 150;
    const y = -52 + r() * 96;
    const rr = 5 + r() * 4;
    ctx.fillStyle = rgba('#8a5210', 0.35);
    ellipse(ctx, x + 1.4, y + 1.8, rr, rr * 0.85);
    ctx.fill();
    const cg = ctx.createRadialGradient(x - rr * 0.4, y - rr * 0.4, 0.5, x, y, rr);
    cg.addColorStop(0, '#fffbe0');
    cg.addColorStop(0.5, '#ffd04a');
    cg.addColorStop(1, '#c8841a');
    ctx.fillStyle = cg;
    ellipse(ctx, x, y, rr, rr * 0.85);
    ctx.fill();
    ctx.strokeStyle = rgba('#8a5210', 0.6);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(x, y, rr * 0.5, r() * 6, r() * 6 + 4);
    ctx.stroke();
  }
  ctx.restore();
  // the ram's little head and curled horns at the top middle
  ctx.fillStyle = '#5a3206';
  ellipse(ctx, 0, -50, 15, 11);
  ctx.fill();
  ctx.fillStyle = '#ffd04a';
  ellipse(ctx, 0, -50, 12.5, 9);
  ctx.fill();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 13, -54, 7, s > 0 ? -2 : -1.2, s > 0 ? 1.8 : 4.6);
    ctx.strokeStyle = '#5a3206';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = '#e8b048';
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  sheen(ctx, -30, -30, 26, 6, 0.5);
  return c;
}
