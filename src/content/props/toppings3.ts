// Props for the event, mixed and wildcard toppings: thrown ones (t_*, sized in units like throws.ts) and the
// things they put on screen (tp_*): the Pizza Drone and its rotor, Garlic Dip's pot, a crust crumb and the
// pizza stone. Same style as everything else: thick dark-brown outlines, soft gradients, a highlight sheen,
// light from the top left.
import { type Ctx, blob, ellipse, makeCanvas, rgba, rng, roundRect } from '../../art/util';

const INK = '#2a1810';
const K = 2.5;
const LW = 3.2;

function pad(w: number, h: number, draw: (ctx: Ctx) => void): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(w * K, h * K);
    ctx.scale(K, K);
    draw(ctx);
    return c;
  };
}

function stroke(ctx: Ctx, lw = LW, col = INK): void {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function fs(ctx: Ctx, fill: string | CanvasGradient, lw = LW): void {
  ctx.fillStyle = fill;
  ctx.fill();
  stroke(ctx, lw);
}

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function rad(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.6, rot = -0.6): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

// ——— thrown ———

/** Anchovy Toss: a silver fish, tail flicked up. */
const anchovy = pad(84, 40, (ctx) => {
  // tail
  ctx.beginPath();
  ctx.moveTo(66, 20);
  ctx.lineTo(80, 6);
  ctx.quadraticCurveTo(76, 20, 81, 34);
  ctx.closePath();
  fs(ctx, lin(ctx, 66, 0, 82, 0, [[0, '#6a8aa8'], [1, '#3a5470']]));
  // body
  ctx.beginPath();
  ctx.moveTo(6, 21);
  ctx.quadraticCurveTo(22, 4, 50, 8);
  ctx.quadraticCurveTo(66, 12, 70, 20);
  ctx.quadraticCurveTo(64, 30, 46, 32);
  ctx.quadraticCurveTo(20, 34, 6, 21);
  fs(ctx, lin(ctx, 0, 6, 0, 33, [[0, '#4a6a8a'], [0.45, '#a8c4dc'], [0.55, '#e8f2fa'], [1, '#c8d8e6']]));
  // gill, fin and a stripe of silver
  ctx.beginPath();
  ctx.moveTo(20, 13);
  ctx.quadraticCurveTo(24, 21, 20, 29);
  stroke(ctx, 2, rgba(INK, 0.6));
  ctx.beginPath();
  ctx.moveTo(24, 21);
  ctx.lineTo(62, 19);
  stroke(ctx, 1.6, rgba('#ffffff', 0.85));
  ctx.beginPath();
  ctx.moveTo(38, 30);
  ctx.lineTo(44, 38);
  ctx.lineTo(50, 31);
  fs(ctx, '#6a8aa8', 2);
  // eye
  circle(ctx, 13, 18, 3.4);
  fs(ctx, '#ffffff', 1.6);
  circle(ctx, 13.6, 18, 1.7);
  ctx.fillStyle = INK;
  ctx.fill();
  shine(ctx, 32, 12, 10, 2.4, 0.7, -0.1);
});

/** Meatball Bounce: a glossy meatball with a dab of sauce and parsley. */
const meatball = pad(64, 64, (ctx) => {
  const r = rng(5);
  blob(ctx, 32, 32, 28, 0.06, r, 12);
  fs(ctx, rad(ctx, 32, 32, 30, [[0, '#c8784a'], [0.65, '#8a4a28'], [1, '#4a2410']]));
  // seared texture
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 22;
    ellipse(ctx, 32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 1.8 + r() * 1.6, 1.2 + r(), r() * 3);
    ctx.fillStyle = r() < 0.6 ? rgba('#3a1a0a', 0.55) : rgba('#e8a070', 0.5);
    ctx.fill();
  }
  // sauce on top
  blob(ctx, 30, 20, 13, 0.25, rng(9), 9);
  fs(ctx, rad(ctx, 30, 20, 13, [[0, '#ff6a4a'], [1, '#b0281a']]), 2.2);
  for (const [x, y] of [[26, 18], [34, 22]]) {
    ellipse(ctx, x, y, 2.6, 1.6, 0.6);
    ctx.fillStyle = '#4caf50';
    ctx.fill();
  }
  shine(ctx, 22, 14, 6, 2.6, 0.7);
});

/** Pizza Cutter: a steel wheel on a red handle. */
const pizzacutter = pad(96, 96, (ctx) => {
  // handle (behind the wheel)
  ctx.save();
  ctx.translate(48, 48);
  ctx.rotate(0.75);
  roundRect(ctx, -7, 6, 14, 42, 6);
  fs(ctx, lin(ctx, -7, 0, 7, 0, [[0, '#ff6a4a'], [0.5, '#e5402a'], [1, '#8a1a10']]));
  roundRect(ctx, -9, 2, 18, 9, 3);
  fs(ctx, lin(ctx, -9, 0, 9, 0, [[0, '#e8ecf2'], [1, '#7a828e']]), 2.2);
  ctx.restore();
  // wheel
  circle(ctx, 48, 48, 30);
  fs(ctx, rad(ctx, 48, 48, 32, [[0, '#ffffff'], [0.55, '#c7ccd4'], [1, '#6a727e']]));
  circle(ctx, 48, 48, 24);
  stroke(ctx, 1.4, rgba(INK, 0.35));
  circle(ctx, 48, 48, 7);
  fs(ctx, rad(ctx, 48, 48, 7, [[0, '#ffe08a'], [1, '#b8860b']]), 2.4);
  // edge glint
  ctx.beginPath();
  ctx.arc(48, 48, 27, -2.6, -1.4);
  stroke(ctx, 2.4, rgba('#ffffff', 0.9));
});

/** Calzone Cannon: a golden folded calzone, crimped edge, a little steam hole. */
const calzone = pad(100, 66, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(8, 50);
  ctx.quadraticCurveTo(14, 6, 54, 8);
  ctx.quadraticCurveTo(92, 10, 94, 50);
  ctx.quadraticCurveTo(52, 62, 8, 50);
  fs(ctx, rad(ctx, 44, 26, 50, [[0, '#ffd890'], [0.6, '#e8a040'], [1, '#a8601a']]));
  // crimped edge
  for (let x = 12; x <= 90; x += 7) {
    ctx.beginPath();
    ctx.arc(x, 50 + Math.sin((x / 90) * Math.PI) * 4, 3.6, 0, Math.PI);
    stroke(ctx, 2, rgba('#7a3a10', 0.75));
  }
  // char spots and a steam slit oozing sauce
  const r = rng(3);
  for (let i = 0; i < 9; i++) {
    ellipse(ctx, 22 + r() * 58, 18 + r() * 22, 2 + r() * 2, 1.4 + r(), r() * 3);
    ctx.fillStyle = rgba('#6a2e0c', 0.45);
    ctx.fill();
  }
  ellipse(ctx, 52, 24, 9, 3.4, -0.1);
  fs(ctx, '#d8301c', 2);
  shine(ctx, 34, 16, 14, 4, 0.5, -0.2);
});

/** Napkin Ninja / Spare Napkin: a folded red-and-white checked napkin. */
const napkin = pad(76, 70, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(8, 14);
  ctx.quadraticCurveTo(38, 4, 68, 12);
  ctx.quadraticCurveTo(72, 40, 64, 62);
  ctx.quadraticCurveTo(36, 68, 10, 60);
  ctx.quadraticCurveTo(4, 36, 8, 14);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#fff6ea';
  ctx.fillRect(0, 0, 76, 70);
  ctx.fillStyle = rgba('#e5402a', 0.85);
  for (let x = 0; x < 76; x += 12) ctx.fillRect(x, 0, 6, 70);
  ctx.fillStyle = rgba('#e5402a', 0.55);
  for (let y = 0; y < 70; y += 12) ctx.fillRect(0, y, 76, 6);
  ctx.fillStyle = lin(ctx, 0, 0, 76, 70, [[0, rgba('#ffffff', 0.35)], [0.6, rgba('#000000', 0)], [1, rgba('#5a1a10', 0.3)]]);
  ctx.fillRect(0, 0, 76, 70);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(8, 14);
  ctx.quadraticCurveTo(38, 4, 68, 12);
  ctx.quadraticCurveTo(72, 40, 64, 62);
  ctx.quadraticCurveTo(36, 68, 10, 60);
  ctx.quadraticCurveTo(4, 36, 8, 14);
  ctx.closePath();
  stroke(ctx);
  // the fold
  ctx.beginPath();
  ctx.moveTo(12, 58);
  ctx.quadraticCurveTo(40, 34, 66, 14);
  stroke(ctx, 2, rgba(INK, 0.5));
  shine(ctx, 26, 18, 10, 3, 0.55, -0.2);
});

/** Rolling Cutter: a big pizza-cutter wheel standing on its edge, rolling. */
const wheelcutter = pad(100, 100, (ctx) => {
  circle(ctx, 50, 50, 44);
  fs(ctx, rad(ctx, 50, 50, 46, [[0, '#ffffff'], [0.55, '#c7ccd4'], [1, '#5a626e']]));
  // spokes
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(50 + Math.cos(a) * 10, 50 + Math.sin(a) * 10);
    ctx.lineTo(50 + Math.cos(a) * 34, 50 + Math.sin(a) * 34);
    stroke(ctx, 4, rgba(INK, 0.55));
  }
  circle(ctx, 50, 50, 36);
  stroke(ctx, 1.6, rgba(INK, 0.35));
  circle(ctx, 50, 50, 11);
  fs(ctx, rad(ctx, 50, 50, 11, [[0, '#ff8a6a'], [1, '#b0281a']]), 2.6);
  ctx.beginPath();
  ctx.arc(50, 50, 41, -2.7, -1.3);
  stroke(ctx, 2.6, rgba('#ffffff', 0.9));
});

// ——— on screen ———

/** Pizza Drone: a little pizza-box drone with a red light and a zapper underneath. */
const drone = pad(120, 96, (ctx) => {
  // arms
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(60 + s * 18, 36);
    ctx.lineTo(60 + s * 46, 24);
    stroke(ctx, 8);
    ctx.beginPath();
    ctx.moveTo(60 + s * 18, 36);
    ctx.lineTo(60 + s * 46, 24);
    stroke(ctx, 4, '#8a929e');
    // little motor pods
    roundRect(ctx, 60 + s * 46 - 7, 16, 14, 12, 4);
    fs(ctx, lin(ctx, 0, 16, 0, 28, [[0, '#e8ecf2'], [1, '#6a727e']]), 2.4);
  }
  // body: a pizza box
  ctx.beginPath();
  ctx.moveTo(26, 34);
  ctx.lineTo(94, 34);
  ctx.lineTo(100, 58);
  ctx.lineTo(20, 58);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 34, 0, 58, [[0, '#f2d8a8'], [0.6, '#d8a868'], [1, '#a8763a']]));
  ctx.beginPath();
  ctx.moveTo(26, 34);
  ctx.lineTo(60, 28);
  ctx.lineTo(94, 34);
  ctx.closePath();
  fs(ctx, '#f8e6c0', 2.4);
  // the logo: a red slice
  ctx.beginPath();
  ctx.moveTo(60, 54);
  ctx.lineTo(51, 39);
  ctx.quadraticCurveTo(60, 35, 69, 39);
  ctx.closePath();
  fs(ctx, '#e5402a', 2);
  circle(ctx, 58, 43, 1.8);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  // zapper
  ctx.beginPath();
  ctx.moveTo(54, 58);
  ctx.lineTo(66, 58);
  ctx.lineTo(62, 72);
  ctx.lineTo(58, 72);
  ctx.closePath();
  fs(ctx, lin(ctx, 54, 0, 66, 0, [[0, '#c7ccd4'], [1, '#5a626e']]), 2.2);
  circle(ctx, 60, 76, 5);
  fs(ctx, rad(ctx, 60, 76, 5, [[0, '#ffffff'], [0.4, '#9fe8ff'], [1, '#2a8ad8']]), 2);
  // tail light
  circle(ctx, 96, 46, 3.6);
  fs(ctx, rad(ctx, 96, 46, 4, [[0, '#fff0f0'], [0.5, '#ff4a3a'], [1, '#a8100a']]), 1.8);
  shine(ctx, 40, 40, 10, 2.4, 0.6, -0.1);
});

/** The drone's rotor blur (scaled sideways in play so it seems to spin). */
const rotor = pad(120, 24, (ctx) => {
  for (const s of [-1, 1]) {
    ellipse(ctx, 60 + s * 46, 12, 24, 5);
    ctx.fillStyle = rgba('#e8ecf2', 0.55);
    ctx.fill();
    stroke(ctx, 1.6, rgba(INK, 0.5));
    ellipse(ctx, 60 + s * 46, 12, 3, 3);
    ctx.fillStyle = INK;
    ctx.fill();
  }
});

/** Garlic Dip: a little pot of creamy dip, a garlic clove on top. */
const dip = pad(90, 84, (ctx) => {
  // pot
  ctx.beginPath();
  ctx.moveTo(12, 36);
  ctx.lineTo(18, 72);
  ctx.quadraticCurveTo(45, 82, 72, 72);
  ctx.lineTo(78, 36);
  ctx.closePath();
  fs(ctx, lin(ctx, 12, 0, 78, 0, [[0, '#e8ecf2'], [0.35, '#ffffff'], [1, '#8a929e']]));
  ctx.beginPath();
  ctx.moveTo(15, 52);
  ctx.quadraticCurveTo(45, 60, 75, 52);
  stroke(ctx, 4, '#4c7dff');
  // dip
  ellipse(ctx, 45, 36, 33, 10);
  fs(ctx, rad(ctx, 40, 32, 34, [[0, '#fffbe8'], [0.7, '#f2e6b8'], [1, '#d8c890']]));
  // swirl and herbs
  ctx.beginPath();
  ctx.ellipse(45, 36, 18, 5, 0, 0.3, Math.PI * 1.6);
  stroke(ctx, 1.6, rgba('#a89860', 0.8));
  for (const [x, y] of [[30, 34], [56, 38], [44, 31]]) {
    ellipse(ctx, x, y, 2.2, 1.2, 0.5);
    ctx.fillStyle = '#4caf50';
    ctx.fill();
  }
  // a garlic clove
  ctx.beginPath();
  ctx.moveTo(52, 30);
  ctx.quadraticCurveTo(54, 12, 64, 8);
  ctx.quadraticCurveTo(72, 18, 66, 30);
  ctx.quadraticCurveTo(58, 34, 52, 30);
  fs(ctx, rad(ctx, 60, 18, 14, [[0, '#ffffff'], [1, '#e8dcc8']]), 2.4);
  ctx.beginPath();
  ctx.moveTo(60, 12);
  ctx.quadraticCurveTo(60, 22, 58, 30);
  stroke(ctx, 1.2, rgba(INK, 0.35));
  shine(ctx, 22, 44, 3, 10, 0.6, 0);
});

/** Crust Crumbs: a golden crumb of crust. */
const crumb = pad(44, 40, (ctx) => {
  blob(ctx, 22, 20, 17, 0.22, rng(4), 8);
  fs(ctx, rad(ctx, 22, 20, 18, [[0, '#ffe08a'], [0.6, '#e0a040'], [1, '#9a5a1a']]));
  const r = rng(8);
  for (let i = 0; i < 6; i++) {
    circle(ctx, 14 + r() * 16, 13 + r() * 14, 1.2 + r());
    ctx.fillStyle = rgba('#7a3e10', 0.6);
    ctx.fill();
  }
  shine(ctx, 15, 13, 5, 2.4, 0.8);
});

/** Pizza Stone: a round baking stone that sits under the middle pizza. */
const stone = pad(220, 70, (ctx) => {
  ellipse(ctx, 110, 34, 104, 28);
  fs(ctx, lin(ctx, 0, 6, 0, 62, [[0, '#f0dcc0'], [0.5, '#d2b48e'], [1, '#9a7a58']]), 4);
  ellipse(ctx, 110, 30, 96, 22);
  ctx.fillStyle = rad(ctx, 100, 26, 96, [[0, '#fff0da'], [1, '#e0c49e']]);
  ctx.fill();
  const r = rng(12);
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const d = r();
    circle(ctx, 110 + Math.cos(a) * 88 * d, 30 + Math.sin(a) * 18 * d, 0.8 + r() * 1.4);
    ctx.fillStyle = r() < 0.6 ? rgba('#5a4030', 0.5) : rgba('#ffffff', 0.35);
    ctx.fill();
  }
  shine(ctx, 70, 20, 30, 5, 0.35, -0.05);
});

export const props: Record<string, () => HTMLCanvasElement> = {
  t_anchovy: anchovy,
  t_meatball: meatball,
  t_pizzacutter: pizzacutter,
  t_calzone: calzone,
  t_napkin: napkin,
  t_wheelcutter: wheelcutter,
  tp_drone: drone,
  tp_rotor: rotor,
  tp_dip: dip,
  tp_crumb: crumb,
  tp_stone: stone,
};
