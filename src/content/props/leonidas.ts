// Props for King Leonidas and his nemesis (src/game/bosses/leonidas.ts, src/game/acts/leonidas.ts): the Spartan spear
// he throws (t_spear, a throw prop), the round bronze lambda shield his phalanx locks into a wall, the Immortal
// Brute's blade on its chain, Xerxes's arrow volley, his war rhino and the golden ward his elephants hold over him.
// Same style as src/art/eventArt.ts: thick ink outlines, gradients and a sheen, lit from the top left. Our own designs.
import { type Ctx, ellipse, makeCanvas, rgba, roundRect } from '../../art/util';

const INK = '#2a1810';

function stroke(ctx: Ctx, lw = 4, col = INK): void {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

const BRONZE: [number, string][] = [
  [0, '#ffe0a0'],
  [0.35, '#c9873a'],
  [1, '#5a3410'],
];

/** The Spartan spear, pointing right (it flies point first). */
function spear(): HTMLCanvasElement {
  const k = 2.5;
  const [c, ctx] = makeCanvas(132 * k, 26 * k);
  ctx.scale(k, k);
  roundRect(ctx, 6, 11, 96, 5, 2);
  ctx.fillStyle = lin(ctx, 0, 11, 0, 16, [
    [0, '#c8904a'],
    [1, '#6a3e1a'],
  ]);
  ctx.fill();
  stroke(ctx, 2.2);
  // the leaf-shaped bronze head and the butt spike
  ctx.beginPath();
  ctx.moveTo(130, 13.5);
  ctx.quadraticCurveTo(116, 3, 100, 13.5);
  ctx.quadraticCurveTo(116, 24, 130, 13.5);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 100, 4, 100, 24, BRONZE);
  ctx.fill();
  stroke(ctx, 2.2);
  ctx.beginPath();
  ctx.moveTo(2, 13.5);
  ctx.lineTo(10, 9.5);
  ctx.lineTo(10, 17.5);
  ctx.closePath();
  ctx.fillStyle = '#c9873a';
  ctx.fill();
  stroke(ctx, 1.8);
  // a red cloth wrap at the grip
  roundRect(ctx, 50, 9.5, 12, 8, 2);
  ctx.fillStyle = '#c8102e';
  ctx.fill();
  stroke(ctx, 1.6);
  return c;
}

/** A round bronze Spartan shield with a lambda, face on. */
function shield(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 200);
  ctx.beginPath();
  ctx.arc(100, 100, 92, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, 20, 10, 180, 190, BRONZE);
  ctx.fill();
  stroke(ctx, 7);
  ctx.beginPath();
  ctx.arc(100, 100, 74, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, 30, 30, 170, 170, [
    [0, '#e8403a'],
    [1, '#7a0a10'],
  ]);
  ctx.fill();
  stroke(ctx, 4);
  // the lambda
  ctx.beginPath();
  ctx.moveTo(60, 150);
  ctx.lineTo(100, 46);
  ctx.lineTo(140, 150);
  ctx.lineWidth = 22;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'miter';
  ctx.stroke();
  ctx.lineWidth = 14;
  ctx.strokeStyle = lin(ctx, 60, 46, 140, 150, BRONZE);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(100 + Math.cos(a) * 83, 100 + Math.sin(a) * 83, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe8b0';
    ctx.fill();
  }
  ellipse(ctx, 62, 52, 26, 10, -0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  return c;
}

/** The Immortal Brute's blade: a broad curved cleaver with a chain ring. */
function blade(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 200);
  ctx.beginPath();
  ctx.moveTo(40, 60);
  ctx.quadraticCurveTo(140, 10, 240, 40);
  ctx.quadraticCurveTo(220, 150, 110, 186);
  ctx.quadraticCurveTo(120, 120, 40, 110);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 40, 20, 240, 190, [
    [0, '#f4f8fc'],
    [0.5, '#9aa3ad'],
    [1, '#3a4048'],
  ]);
  ctx.fill();
  stroke(ctx, 6);
  // the honed edge and nicks
  ctx.beginPath();
  ctx.moveTo(236, 46);
  ctx.quadraticCurveTo(216, 146, 112, 180);
  stroke(ctx, 3, 'rgba(255,255,255,0.85)');
  ctx.beginPath();
  ctx.arc(52, 84, 22, 0, Math.PI * 2);
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#8a929e';
  ctx.stroke();
  ellipse(ctx, 140, 54, 30, 8, -0.2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
  return c;
}

/** A volley of arrows falling point down. */
function volley(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 240);
  for (let i = 0; i < 7; i++) {
    const x = 30 + i * 24;
    const y = 20 + (i % 3) * 22;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.08 * (i - 3));
    roundRect(ctx, -3, 0, 6, 150, 3);
    ctx.fillStyle = '#8a5a2a';
    ctx.fill();
    stroke(ctx, 2.5);
    ctx.beginPath();
    ctx.moveTo(-9, 150);
    ctx.lineTo(0, 178);
    ctx.lineTo(9, 150);
    ctx.closePath();
    ctx.fillStyle = '#c9cfd8';
    ctx.fill();
    stroke(ctx, 2.5);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(s * 9, -6);
      ctx.lineTo(s * 9, 18);
      ctx.lineTo(0, 26);
      ctx.closePath();
      ctx.fillStyle = '#2a2430';
      ctx.fill();
    }
    ctx.restore();
  }
  return c;
}

/** The war rhino, head on and lowered: armoured plates, a great horn, red eyes. */
function rhino(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(280, 240);
  // the body behind
  ellipse(ctx, 140, 110, 120, 80);
  ctx.fillStyle = lin(ctx, 20, 30, 260, 190, [
    [0, '#9a9490'],
    [1, '#4a4440'],
  ]);
  ctx.fill();
  stroke(ctx, 6);
  // the armour: a bronze plate with studs over the brow
  ctx.beginPath();
  ctx.moveTo(70, 70);
  ctx.quadraticCurveTo(140, 30, 210, 70);
  ctx.lineTo(196, 110);
  ctx.quadraticCurveTo(140, 90, 84, 110);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 70, 40, 210, 110, BRONZE);
  ctx.fill();
  stroke(ctx, 4);
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(88 + i * 21, 74 - Math.sin((i / 5) * Math.PI) * 14, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe8b0';
    ctx.fill();
  }
  // the snout and its horn
  ellipse(ctx, 140, 160, 62, 50);
  ctx.fillStyle = lin(ctx, 80, 110, 200, 210, [
    [0, '#aaa49e'],
    [1, '#5a544e'],
  ]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.beginPath();
  ctx.moveTo(116, 140);
  ctx.quadraticCurveTo(136, 60, 160, 40);
  ctx.quadraticCurveTo(156, 100, 166, 140);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 116, 40, 166, 140, [
    [0, '#fff8e8'],
    [1, '#b8a888'],
  ]);
  ctx.fill();
  stroke(ctx, 5);
  for (const s of [-1, 1]) {
    ellipse(ctx, 140 + s * 50, 116, 9, 7);
    ctx.fillStyle = '#ff3a1a';
    ctx.fill();
    stroke(ctx, 2.5);
    ellipse(ctx, 140 + s * 20, 184, 7, 9);
    ctx.fillStyle = '#2a1810';
    ctx.fill();
  }
  // ears
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(140 + s * 90, 60);
    ctx.lineTo(140 + s * 120, 24);
    ctx.lineTo(140 + s * 110, 76);
    ctx.closePath();
    ctx.fillStyle = '#7a746e';
    ctx.fill();
    stroke(ctx, 4);
  }
  return c;
}

/** The golden ward the war elephants hold over Xerxes: a ring of sun rays. */
function ward(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 240);
  const g = ctx.createRadialGradient(120, 120, 20, 120, 120, 118);
  g.addColorStop(0, 'rgba(255,220,120,0)');
  g.addColorStop(0.7, 'rgba(255,200,80,0.35)');
  g.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 240, 240);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(120 + Math.cos(a) * 80, 120 + Math.sin(a) * 80);
    ctx.lineTo(120 + Math.cos(a + 0.1) * 108, 120 + Math.sin(a + 0.1) * 108);
    ctx.lineTo(120 + Math.cos(a - 0.1) * 108, 120 + Math.sin(a - 0.1) * 108);
    ctx.closePath();
    ctx.fillStyle = rgba('#ffd23f', 0.85);
    ctx.fill();
    stroke(ctx, 2.5);
  }
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  t_spear: spear,
  p_lx_shield: shield,
  p_lx_blade: blade,
  p_lx_volley: volley,
  p_lx_rhino: rhino,
  p_lx_ward: ward,
};
