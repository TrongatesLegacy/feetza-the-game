// Thrown props (src/game/projectiles.ts): one per throw, plus a few pieces they break into. Same style as
// the other props: thick dark-brown outlines, soft gradients and a highlight sheen.
// Each is drawn in units (the sizes in projectiles.ts) on a canvas 2.5× that, and shown at 1.25× in play, so the
// canvas is about twice its size on screen and stays crisp. The light comes from the top left, like everything else.
import { type Ctx, blob, ellipse, makeCanvas, rgba, rng, roundRect } from '../../art/util';

const INK = '#2a1810';
const K = 2.5; // canvas px per drawing unit
const LW = 3.2; // outline width, in units

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

/** Radial gradient lit from the top left. */
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

// ——— food ———
const tomato = pad(66, 66, (ctx) => {
  const c = 33;
  circle(ctx, c, c, 30);
  fs(ctx, rad(ctx, c, c, 31, [[0, '#ff6a4a'], [0.7, '#e5402a'], [1, '#a8261a']]));
  // flesh and seed chambers
  circle(ctx, c, c, 24);
  ctx.fillStyle = '#ff8a5a';
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    ellipse(ctx, c + Math.cos(a) * 14, c + Math.sin(a) * 14, 8, 5.2, a);
    ctx.fillStyle = '#d8301c';
    ctx.fill();
    stroke(ctx, 1.4, rgba(INK, 0.5));
    for (const s of [-1, 1]) {
      ellipse(ctx, c + Math.cos(a) * 14 + Math.cos(a + Math.PI / 2) * s * 2.6, c + Math.sin(a) * 14 + Math.sin(a + Math.PI / 2) * s * 2.6, 1.8, 1.1, a);
      ctx.fillStyle = '#ffe9a8';
      ctx.fill();
    }
  }
  circle(ctx, c, c, 5.5);
  ctx.fillStyle = '#ffb08a';
  ctx.fill();
  circle(ctx, c, c, 30);
  stroke(ctx);
  shine(ctx, 21, 19, 9, 4.5, 0.55);
});

const toenail = pad(50, 30, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(4, 20);
  ctx.quadraticCurveTo(25, -2, 46, 20);
  ctx.quadraticCurveTo(44, 27, 40, 24);
  ctx.quadraticCurveTo(25, 10, 10, 24);
  ctx.quadraticCurveTo(5, 27, 4, 20);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 4, 0, 26, [[0, '#fffbe8'], [0.55, '#f3e6c0'], [1, '#cdb688']]));
  ctx.beginPath();
  ctx.moveTo(12, 17);
  ctx.quadraticCurveTo(25, 6, 38, 17);
  stroke(ctx, 1.6, rgba('#ffffff', 0.8));
});

const polish = pad(52, 58, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(26, 4);
  ctx.bezierCurveTo(32, 16, 46, 24, 46, 36);
  ctx.bezierCurveTo(46, 48, 37, 54, 26, 54);
  ctx.bezierCurveTo(15, 54, 6, 48, 6, 36);
  ctx.bezierCurveTo(6, 24, 20, 16, 26, 4);
  ctx.closePath();
  fs(ctx, rad(ctx, 26, 36, 22, [[0, '#ff9fd0'], [0.55, '#ff4fa8'], [1, '#b81870']]));
  shine(ctx, 18, 30, 5, 9, 0.75, 0.3);
  circle(ctx, 33, 45, 2.6);
  ctx.fillStyle = rgba('#ffffff', 0.6);
  ctx.fill();
});

const crust = pad(74, 46, (ctx) => {
  const r = rng(11);
  ctx.beginPath();
  ctx.moveTo(6, 30);
  ctx.bezierCurveTo(10, 8, 62, 2, 69, 22);
  ctx.bezierCurveTo(72, 32, 66, 40, 56, 38);
  ctx.bezierCurveTo(44, 30, 28, 32, 18, 40);
  ctx.bezierCurveTo(9, 44, 4, 38, 6, 30);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 6, 0, 42, [[0, '#f6c77a'], [0.5, '#d99a4a'], [1, '#9a5a24']]));
  // bready inside where it broke off
  ellipse(ctx, 62, 30, 6, 6.5, 0.3);
  ctx.fillStyle = '#fbe6b8';
  ctx.fill();
  stroke(ctx, 1.6, rgba(INK, 0.5));
  for (let i = 0; i < 7; i++) {
    ellipse(ctx, 14 + r() * 42, 14 + r() * 14, 2.4, 1.4, r() * 3);
    ctx.fillStyle = r() < 0.5 ? rgba('#5a2a10', 0.55) : '#fff4d6';
    ctx.fill();
  }
  shine(ctx, 28, 13, 12, 3.2, 0.5, -0.15);
});

const pineapple = pad(80, 80, (ctx) => {
  const c = 40;
  circle(ctx, c, c, 36);
  fs(ctx, rad(ctx, c, c, 37, [[0, '#fff09a'], [0.6, '#ffd23f'], [1, '#e8a020']]));
  // fibres
  ctx.strokeStyle = rgba('#c88a10', 0.55);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 16, c + Math.sin(a) * 16);
    ctx.lineTo(c + Math.cos(a) * 32, c + Math.sin(a) * 32);
    ctx.stroke();
  }
  // rind edge
  circle(ctx, c, c, 33);
  stroke(ctx, 3, '#f0b030');
  circle(ctx, c, c, 36);
  stroke(ctx);
  // the hole
  circle(ctx, c, c, 12);
  ctx.fillStyle = '#000000';
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill();
  ctx.restore();
  circle(ctx, c, c, 12);
  stroke(ctx);
  circle(ctx, c, c, 15);
  stroke(ctx, 2, rgba('#c88a10', 0.6));
  shine(ctx, 25, 22, 10, 4.5, 0.55);
});

const square = pad(66, 66, (ctx) => {
  const r = rng(5);
  roundRect(ctx, 5, 5, 56, 56, 9);
  fs(ctx, lin(ctx, 0, 5, 0, 61, [[0, '#f6c77a'], [1, '#b8742e']]));
  roundRect(ctx, 11, 11, 44, 44, 6);
  ctx.fillStyle = '#d8301c';
  ctx.fill();
  // melted cheese
  blob(ctx, 33, 33, 20, 0.35, r, 12);
  ctx.fillStyle = lin(ctx, 0, 12, 0, 54, [[0, '#fff2a0'], [1, '#ffc23d']]);
  ctx.fill();
  for (const [x, y] of [[22, 22], [43, 26], [28, 43], [45, 45]]) {
    circle(ctx, x, y, 5.5);
    fs(ctx, rad(ctx, x, y, 6, [[0, '#ff6a4a'], [1, '#a8261a']]), 1.6);
  }
  ellipse(ctx, 36, 34, 3, 1.6, 0.6);
  ctx.fillStyle = '#4caf50';
  ctx.fill();
  roundRect(ctx, 5, 5, 56, 56, 9);
  stroke(ctx);
  shine(ctx, 18, 12, 9, 2.8, 0.55, -0.1);
});

const dough = pad(68, 62, (ctx) => {
  const r = rng(3);
  blob(ctx, 34, 33, 27, 0.18, r, 9);
  fs(ctx, rad(ctx, 34, 33, 29, [[0, '#fffaf0'], [0.65, '#f6e6c4'], [1, '#d8bf92']]));
  // flour dust
  for (let i = 0; i < 14; i++) {
    circle(ctx, 14 + r() * 40, 14 + r() * 36, 0.8 + r() * 1.2);
    ctx.fillStyle = rgba('#ffffff', 0.85);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(22, 40);
  ctx.quadraticCurveTo(32, 46, 44, 40);
  stroke(ctx, 1.6, rgba('#b8986a', 0.7));
  shine(ctx, 24, 20, 9, 4.5, 0.6);
});

const flatbread = pad(104, 104, (ctx) => {
  const r = rng(21);
  const c = 52;
  blob(ctx, c, c, 48, 0.08, r, 14);
  fs(ctx, rad(ctx, c, c, 50, [[0, '#f6c77a'], [0.85, '#e0a050'], [1, '#a8682a']]));
  blob(ctx, c, c, 40, 0.1, r, 14);
  ctx.fillStyle = rad(ctx, c, c, 42, [[0, '#f07a3a'], [1, '#c8481c']]);
  ctx.fill();
  // minced meat, parsley, char
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 34;
    ellipse(ctx, c + Math.cos(a) * d, c + Math.sin(a) * d, 2.6 + r() * 2, 2 + r() * 1.5, r() * 3);
    ctx.fillStyle = r() < 0.65 ? '#8a2a14' : '#5a9a2a';
    ctx.fill();
  }
  for (let i = 0; i < 8; i++) {
    const a = r() * Math.PI * 2;
    circle(ctx, c + Math.cos(a) * 45, c + Math.sin(a) * 45, 2.2);
    ctx.fillStyle = rgba('#4a2410', 0.6);
    ctx.fill();
  }
  blob(ctx, c, c, 48, 0.08, rng(21), 14);
  stroke(ctx);
  shine(ctx, 32, 26, 16, 5, 0.4);
});

const pie = pad(96, 70, (ctx) => {
  // tin and crust
  ctx.beginPath();
  ctx.moveTo(8, 42);
  ctx.lineTo(16, 62);
  ctx.quadraticCurveTo(48, 70, 80, 62);
  ctx.lineTo(88, 42);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 42, 0, 66, [[0, '#e8ecf2'], [0.5, '#a8b0bc'], [1, '#6a727e']]));
  for (let x = 20; x < 80; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 45);
    ctx.lineTo(x + 2, 62);
    stroke(ctx, 1.2, rgba(INK, 0.35));
  }
  ellipse(ctx, 48, 42, 41, 10);
  fs(ctx, lin(ctx, 0, 32, 0, 52, [[0, '#f6c77a'], [1, '#c08040']]));
  // cream dome with swirls
  ctx.beginPath();
  ctx.moveTo(12, 42);
  ctx.bezierCurveTo(10, 14, 30, 6, 48, 8);
  ctx.bezierCurveTo(66, 6, 86, 14, 84, 42);
  ctx.quadraticCurveTo(48, 50, 12, 42);
  ctx.closePath();
  fs(ctx, rad(ctx, 44, 26, 40, [[0, '#ffffff'], [0.7, '#fff4e0'], [1, '#e8d4b4']]));
  for (const [x, y, w] of [[30, 30, 14], [52, 24, 16], [70, 33, 11], [44, 38, 12]]) {
    ctx.beginPath();
    ctx.arc(x, y, w * 0.6, Math.PI * 1.1, Math.PI * 1.9);
    stroke(ctx, 1.6, rgba('#c8b090', 0.7));
  }
  // a cherry on top
  circle(ctx, 50, 9, 6.5);
  fs(ctx, rad(ctx, 50, 9, 7, [[0, '#ff6a6a'], [1, '#a8101a']]), 2.4);
  ctx.beginPath();
  ctx.moveTo(51, 3);
  ctx.quadraticCurveTo(54, -2, 60, 1);
  stroke(ctx, 1.8, '#5a3a10');
  shine(ctx, 30, 18, 10, 4, 0.7);
  shine(ctx, 48, 7, 2, 1.4, 0.8);
});

const pieSplat = pad(110, 90, (ctx) => {
  const r = rng(9);
  // drips run down from under the splat
  for (const [x, len] of [[38, 30], [57, 36], [72, 26]]) {
    ctx.beginPath();
    ctx.moveTo(x - 6, 50);
    ctx.lineTo(x - 4.5, 50 + len - 5);
    ctx.arc(x, 50 + len - 5, 4.5, Math.PI, 0, true);
    ctx.lineTo(x + 6, 50);
    ctx.closePath();
    fs(ctx, '#fff4e0', 2.4);
  }
  blob(ctx, 55, 38, 34, 0.5, r, 13);
  fs(ctx, rad(ctx, 52, 42, 44, [[0, '#ffffff'], [0.6, '#fff4e0'], [1, '#e8d4b4']]));
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2;
    circle(ctx, 55 + Math.cos(a) * 44, 45 + Math.sin(a) * 36, 4 + r() * 4);
    fs(ctx, '#fff4e0', 2);
  }
  circle(ctx, 58, 40, 6);
  fs(ctx, rad(ctx, 58, 40, 7, [[0, '#ff6a6a'], [1, '#a8101a']]), 2.2);
  shine(ctx, 42, 30, 12, 5, 0.6);
});

const olive = pad(46, 38, (ctx) => {
  ellipse(ctx, 23, 19, 20, 15, -0.2);
  fs(ctx, rad(ctx, 23, 19, 21, [[0, '#9ac85a'], [0.6, '#5a8a2a'], [1, '#2e5214']]));
  ellipse(ctx, 30, 16, 6.5, 5.2, -0.2);
  fs(ctx, rad(ctx, 30, 16, 7, [[0, '#ff7a5a'], [1, '#c8201a']]), 2);
  shine(ctx, 14, 12, 5, 2.6, 0.7);
});

const coconut = pad(80, 80, (ctx) => {
  const r = rng(13);
  circle(ctx, 40, 40, 34);
  fs(ctx, rad(ctx, 40, 40, 36, [[0, '#b07a4a'], [0.6, '#8a5a32'], [1, '#4a2a14']]));
  // husk hairs
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2;
    const d = 8 + r() * 24;
    const x = 40 + Math.cos(a) * d;
    const y = 40 + Math.sin(a) * d;
    ctx.strokeStyle = r() < 0.5 ? rgba('#3a1e0c', 0.55) : rgba('#d8a878', 0.45);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a + 1.4) * 5, y + Math.sin(a + 1.4) * 5);
    ctx.stroke();
  }
  // three eyes
  for (const [x, y] of [[33, 26], [47, 26], [40, 37]]) {
    ellipse(ctx, x, y, 3.6, 4.4);
    ctx.fillStyle = '#2a1408';
    ctx.fill();
  }
  circle(ctx, 40, 40, 34);
  stroke(ctx);
  shine(ctx, 26, 22, 10, 5, 0.35);
});

const coconutHalf = pad(60, 40, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(4, 8);
  ctx.quadraticCurveTo(30, 54, 56, 8);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 8, 0, 34, [[0, '#8a5a32'], [1, '#4a2a14']]));
  ellipse(ctx, 30, 9, 25, 5);
  fs(ctx, '#fffaf0', 2.4);
  ellipse(ctx, 30, 9, 16, 2.6);
  ctx.fillStyle = '#efe6d4';
  ctx.fill();
});

// ——— kitchen and table ———
const plate = pad(96, 96, (ctx) => {
  const c = 48;
  circle(ctx, c, c, 44);
  fs(ctx, rad(ctx, c, c, 46, [[0, '#ffffff'], [0.8, '#eef1f6'], [1, '#b8c0cc']]));
  circle(ctx, c, c, 38);
  stroke(ctx, 3, '#4c7dff');
  circle(ctx, c, c, 34.5);
  stroke(ctx, 1.2, rgba('#4c7dff', 0.6));
  circle(ctx, c, c, 26);
  ctx.fillStyle = rad(ctx, c, c, 27, [[0, '#ffffff'], [1, '#dfe4ec']]);
  ctx.fill();
  stroke(ctx, 1.6, rgba(INK, 0.25));
  circle(ctx, c, c, 44);
  stroke(ctx);
  shine(ctx, 30, 24, 14, 5, 0.75);
});

const mug = pad(76, 68, (ctx) => {
  ctx.beginPath();
  ctx.arc(54, 34, 13, -Math.PI / 2, Math.PI / 2);
  stroke(ctx, 9);
  ctx.beginPath();
  ctx.arc(54, 34, 13, -Math.PI / 2, Math.PI / 2);
  stroke(ctx, 4, '#d8301c');
  roundRect(ctx, 10, 12, 44, 50, 8);
  fs(ctx, lin(ctx, 10, 0, 54, 0, [[0, '#ff6a4a'], [0.5, '#e5402a'], [1, '#a8261a']]));
  ellipse(ctx, 32, 13, 22, 5);
  fs(ctx, '#5a2a14', 2.4);
  // a heart on the side
  ctx.beginPath();
  ctx.moveTo(32, 46);
  ctx.bezierCurveTo(20, 38, 24, 28, 32, 33);
  ctx.bezierCurveTo(40, 28, 44, 38, 32, 46);
  fs(ctx, '#fff4e0', 1.8);
  shine(ctx, 18, 30, 3.4, 12, 0.5, 0);
});

const spoon = pad(76, 30, (ctx) => {
  roundRect(ctx, 4, 12, 46, 7, 3.5);
  fs(ctx, lin(ctx, 0, 12, 0, 19, [[0, '#e8b070'], [1, '#a8682a']]));
  ellipse(ctx, 58, 15, 15, 11);
  fs(ctx, rad(ctx, 58, 15, 15, [[0, '#f0c080'], [1, '#a8682a']]));
  ellipse(ctx, 59, 15, 9, 6);
  ctx.fillStyle = rgba('#6a3a14', 0.35);
  ctx.fill();
  shine(ctx, 52, 10, 5, 2, 0.6, -0.2);
});

const clock = pad(68, 76, (ctx) => {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(34 + s * 14, 66);
    ctx.lineTo(34 + s * 22, 74);
    stroke(ctx, 4);
  }
  for (const s of [-1, 1]) {
    circle(ctx, 34 + s * 20, 16, 10);
    fs(ctx, rad(ctx, 34 + s * 20, 16, 11, [[0, '#fff09a'], [1, '#c88a10']]));
  }
  circle(ctx, 34, 44, 28);
  fs(ctx, rad(ctx, 34, 44, 30, [[0, '#ff9fd0'], [1, '#c8287a']]));
  circle(ctx, 34, 44, 21);
  fs(ctx, '#fffaf0', 2.2);
  ctx.beginPath();
  ctx.moveTo(34, 44);
  ctx.lineTo(34, 30);
  ctx.moveTo(34, 44);
  ctx.lineTo(44, 48);
  stroke(ctx, 2.6);
  shine(ctx, 22, 32, 6, 3, 0.6);
});

const rattle = pad(82, 44, (ctx) => {
  roundRect(ctx, 40, 18, 30, 8, 4);
  fs(ctx, lin(ctx, 0, 18, 0, 26, [[0, '#ffffff'], [1, '#c8d0dc']]));
  circle(ctx, 72, 22, 7);
  stroke(ctx, 7);
  circle(ctx, 72, 22, 7);
  stroke(ctx, 3.4, '#5fd8ff');
  circle(ctx, 24, 22, 19);
  fs(ctx, rad(ctx, 24, 22, 20, [[0, '#ffc0e6'], [0.6, '#ff7ad9'], [1, '#c8287a']]));
  // stripes and dots
  ctx.save();
  circle(ctx, 24, 22, 19);
  ctx.clip();
  for (const x of [14, 30]) {
    roundRect(ctx, x, 0, 5, 44, 2);
    ctx.fillStyle = rgba('#ffffff', 0.55);
    ctx.fill();
  }
  ctx.restore();
  circle(ctx, 24, 22, 19);
  stroke(ctx);
  shine(ctx, 17, 13, 6, 3, 0.7);
});

const duck = pad(78, 70, (ctx) => {
  // body
  ctx.beginPath();
  ctx.moveTo(8, 36);
  ctx.bezierCurveTo(4, 62, 64, 72, 72, 44);
  ctx.bezierCurveTo(76, 34, 66, 32, 60, 38);
  ctx.bezierCurveTo(50, 40, 40, 36, 34, 34);
  ctx.bezierCurveTo(22, 30, 12, 26, 8, 36);
  ctx.closePath();
  fs(ctx, rad(ctx, 36, 46, 36, [[0, '#fff6a0'], [0.6, '#ffd23f'], [1, '#e89a10']]));
  // wing
  ctx.beginPath();
  ctx.moveTo(30, 44);
  ctx.quadraticCurveTo(44, 38, 54, 48);
  ctx.quadraticCurveTo(42, 58, 30, 44);
  fs(ctx, '#f8b820', 2);
  // head
  circle(ctx, 26, 22, 16);
  fs(ctx, rad(ctx, 26, 22, 17, [[0, '#fff6a0'], [0.65, '#ffd23f'], [1, '#e89a10']]));
  // beak
  ctx.beginPath();
  ctx.moveTo(10, 22);
  ctx.quadraticCurveTo(-2, 24, 2, 30);
  ctx.quadraticCurveTo(8, 32, 14, 28);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 22, 0, 32, [[0, '#ffa040'], [1, '#e85a10']]), 2.4);
  circle(ctx, 21, 17, 3.4);
  ctx.fillStyle = INK;
  ctx.fill();
  circle(ctx, 20, 16, 1.1);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  shine(ctx, 30, 13, 6, 3, 0.65);
  shine(ctx, 22, 44, 8, 3, 0.4, -0.3);
});

const ring = pad(96, 96, (ctx) => {
  const c = 48;
  // segmented red and white torus
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 1) / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(c, c, 43, a0, a1);
    ctx.arc(c, c, 23, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? rad(ctx, c, c, 44, [[0, '#ffffff'], [0.8, '#eef1f6'], [1, '#b8c0cc']]) : rad(ctx, c, c, 44, [[0, '#ff8a6a'], [0.75, '#e5402a'], [1, '#a8261a']]);
    ctx.fill();
  }
  circle(ctx, c, c, 43);
  stroke(ctx);
  circle(ctx, c, c, 23);
  stroke(ctx);
  // rope loops round the outside
  ctx.strokeStyle = '#c8904a';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * 43, c + Math.sin(a) * 43, 6, a - 1.2, a + 1.2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(c, c, 33, Math.PI * 1.05, Math.PI * 1.45);
  stroke(ctx, 4, rgba('#ffffff', 0.7));
});

const lasso = pad(104, 80, (ctx) => {
  const ropeLine = (path: () => void) => {
    path();
    stroke(ctx, 7);
    path();
    stroke(ctx, 4, '#c8904a');
    path();
    ctx.setLineDash([3, 4]);
    stroke(ctx, 1.4, rgba('#6a4020', 0.8));
    ctx.setLineDash([]);
  };
  ropeLine(() => {
    ctx.beginPath();
    ctx.ellipse(46, 34, 40, 26, -0.15, 0, Math.PI * 2);
  });
  ropeLine(() => {
    ctx.beginPath();
    ctx.ellipse(46, 34, 33, 20, -0.15, 0.4, Math.PI * 2 - 0.4);
  });
  // the honda knot and the tail
  ropeLine(() => {
    ctx.beginPath();
    ctx.moveTo(82, 46);
    ctx.quadraticCurveTo(92, 60, 100, 74);
  });
  ellipse(ctx, 82, 44, 6, 5);
  fs(ctx, '#a87030', 2.4);
});

const lassoLoop = pad(90, 50, (ctx) => {
  for (const [w, c] of [[7, INK], [4, '#c8904a']] as const) {
    ctx.beginPath();
    ctx.ellipse(45, 25, 40, 19, 0, 0, Math.PI * 2);
    stroke(ctx, w, c);
  }
  ctx.beginPath();
  ctx.ellipse(45, 25, 40, 19, 0, 0, Math.PI * 2);
  ctx.setLineDash([3, 4]);
  stroke(ctx, 1.4, rgba('#6a4020', 0.8));
  ctx.setLineDash([]);
  ellipse(ctx, 82, 30, 6, 5);
  fs(ctx, '#a87030', 2.4);
});

// ——— sport and gym ———
const football = pad(78, 78, (ctx) => {
  const c = 39;
  circle(ctx, c, c, 35);
  fs(ctx, rad(ctx, c, c, 37, [[0, '#ffffff'], [0.75, '#eef1f6'], [1, '#a8b0bc']]));
  ctx.save();
  circle(ctx, c, c, 35);
  ctx.clip();
  const pent = (x: number, y: number, r: number, rot: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = rot + (i / 5) * Math.PI * 2;
      if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#2a2a30';
    ctx.fill();
  };
  pent(c, c, 10, -Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2 + Math.PI / 5;
    pent(c + Math.cos(a) * 30, c + Math.sin(a) * 30, 9, a);
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 10, c + Math.sin(a) * 10);
    ctx.lineTo(c + Math.cos(a) * 22, c + Math.sin(a) * 22);
    stroke(ctx, 1.6, rgba(INK, 0.45));
  }
  ctx.restore();
  circle(ctx, c, c, 35);
  stroke(ctx);
  shine(ctx, 26, 22, 10, 5, 0.7);
});

const bowling = pad(88, 88, (ctx) => {
  const r = rng(4);
  const c = 44;
  circle(ctx, c, c, 40);
  fs(ctx, rad(ctx, c, c, 42, [[0, '#9ab8ff'], [0.55, '#4c7dff'], [1, '#1a2a8a']]));
  // marbling
  ctx.save();
  circle(ctx, c, c, 40);
  ctx.clip();
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = rgba(i % 2 ? '#b06bff' : '#ffffff', 0.3);
    ctx.beginPath();
    ctx.moveTo(r() * 88, r() * 88);
    ctx.bezierCurveTo(r() * 88, r() * 88, r() * 88, r() * 88, r() * 88, r() * 88);
    ctx.stroke();
  }
  ctx.restore();
  for (const [x, y, rr] of [[52, 30, 5.2], [62, 40, 5.2], [50, 48, 6.4]]) {
    circle(ctx, x, y, rr);
    fs(ctx, rad(ctx, x + 2, y + 2, rr, [[0, '#0a0a20'], [1, '#2a3a8a']]), 2);
  }
  circle(ctx, c, c, 40);
  stroke(ctx);
  shine(ctx, 26, 22, 13, 6, 0.75);
});

const cannon = pad(82, 82, (ctx) => {
  const c = 41;
  circle(ctx, c, c, 37);
  fs(ctx, rad(ctx, c, c, 39, [[0, '#8a909c'], [0.5, '#3a3a44'], [1, '#121218']]));
  ctx.beginPath();
  ctx.ellipse(c, c, 37, 10, -0.5, 0, Math.PI);
  stroke(ctx, 2, rgba('#000000', 0.45));
  for (const [x, y] of [[28, 50], [42, 44], [56, 37]]) {
    circle(ctx, x, y, 2);
    ctx.fillStyle = rgba('#c8ccd4', 0.6);
    ctx.fill();
  }
  shine(ctx, 26, 22, 12, 6, 0.6);
  shine(ctx, 22, 18, 4, 2, 0.9);
});

const dumbbell = pad(112, 56, (ctx) => {
  roundRect(ctx, 22, 23, 68, 10, 5);
  fs(ctx, lin(ctx, 0, 23, 0, 33, [[0, '#ffffff'], [0.4, '#c8d0dc'], [1, '#6a727e']]));
  // knurled grip
  for (let x = 42; x < 70; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x + 2, 32);
    stroke(ctx, 1, rgba(INK, 0.35));
  }
  for (const s of [-1, 1]) {
    const x = s < 0 ? 6 : 82;
    roundRect(ctx, x, 6, 24, 44, 6);
    fs(ctx, lin(ctx, x, 0, x + 24, 0, [[0, '#5a5a66'], [0.4, '#2a2a34'], [1, '#121218']]));
    roundRect(ctx, s < 0 ? 26 : 76, 12, 10, 32, 4);
    fs(ctx, lin(ctx, 0, 12, 0, 44, [[0, '#ff8a6a'], [1, '#a8261a']]));
    shine(ctx, x + 7, 14, 3, 6, 0.45, 0);
  }
});

const spinach = pad(56, 78, (ctx) => {
  roundRect(ctx, 6, 10, 44, 60, 6);
  fs(ctx, lin(ctx, 6, 0, 50, 0, [[0, '#2e7a32'], [0.35, '#5ac85e'], [1, '#1e5a22']]));
  // label
  roundRect(ctx, 6, 26, 44, 28, 2);
  ctx.fillStyle = lin(ctx, 6, 0, 50, 0, [[0, '#d8d0b8'], [0.35, '#fffaf0'], [1, '#b8ae94']]);
  ctx.fill();
  stroke(ctx, 2);
  // leaf icon
  ctx.beginPath();
  ctx.moveTo(18, 48);
  ctx.bezierCurveTo(16, 34, 30, 28, 40, 30);
  ctx.bezierCurveTo(40, 42, 30, 50, 18, 48);
  fs(ctx, '#3a9a3e', 2);
  ctx.beginPath();
  ctx.moveTo(19, 47);
  ctx.lineTo(36, 33);
  stroke(ctx, 1.4, '#c8f0b8');
  // rims
  for (const y of [10, 70]) {
    ellipse(ctx, 28, y, 22, 5);
    fs(ctx, lin(ctx, 6, 0, 50, 0, [[0, '#8a929e'], [0.4, '#ffffff'], [1, '#6a727e']]), 2.4);
  }
  shine(ctx, 14, 40, 2.6, 18, 0.35, 0);
});

const grenade = pad(60, 74, (ctx) => {
  // a bell-pepper grenade: lobes, a lever and a pin
  ctx.beginPath();
  ctx.moveTo(30, 20);
  ctx.bezierCurveTo(4, 14, 0, 44, 10, 60);
  ctx.bezierCurveTo(16, 72, 26, 68, 30, 64);
  ctx.bezierCurveTo(34, 68, 44, 72, 50, 60);
  ctx.bezierCurveTo(60, 44, 56, 14, 30, 20);
  ctx.closePath();
  fs(ctx, rad(ctx, 28, 42, 30, [[0, '#9ad85a'], [0.55, '#4c9a2a'], [1, '#1e4a10']]));
  ctx.beginPath();
  ctx.moveTo(30, 24);
  ctx.quadraticCurveTo(27, 44, 30, 62);
  stroke(ctx, 1.8, rgba('#1e4a10', 0.7));
  // cap, lever, ring pin
  roundRect(ctx, 22, 10, 16, 11, 3);
  fs(ctx, lin(ctx, 22, 0, 38, 0, [[0, '#6a727e'], [0.45, '#e8ecf2'], [1, '#4a525e']]), 2.4);
  ctx.beginPath();
  ctx.moveTo(36, 12);
  ctx.quadraticCurveTo(50, 12, 50, 30);
  stroke(ctx, 6);
  ctx.beginPath();
  ctx.moveTo(36, 12);
  ctx.quadraticCurveTo(50, 12, 50, 30);
  stroke(ctx, 3, '#c8d0dc');
  circle(ctx, 18, 9, 6);
  stroke(ctx, 5);
  circle(ctx, 18, 9, 6);
  stroke(ctx, 2.4, '#ffd23f');
  shine(ctx, 18, 34, 5, 9, 0.5, 0.3);
});

const skateboard = pad(124, 48, (ctx) => {
  for (const x of [30, 94]) {
    for (const y of [8, 40]) {
      ellipse(ctx, x, y, 7, 5.5);
      fs(ctx, rad(ctx, x, y, 7, [[0, '#fff09a'], [1, '#e8a020']]), 2.4);
    }
    roundRect(ctx, x - 4, 6, 8, 36, 2);
    fs(ctx, lin(ctx, 0, 6, 0, 42, [[0, '#e8ecf2'], [1, '#6a727e']]), 2);
  }
  roundRect(ctx, 4, 10, 116, 28, 14);
  fs(ctx, lin(ctx, 0, 10, 0, 38, [[0, '#ffc060'], [0.5, '#ff9f1c'], [1, '#c85a10']]));
  // grip tape and a flame
  roundRect(ctx, 14, 15, 96, 18, 9);
  ctx.fillStyle = '#3a3a44';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(36, 30);
  ctx.bezierCurveTo(44, 20, 50, 26, 54, 17);
  ctx.bezierCurveTo(58, 26, 66, 22, 70, 18);
  ctx.bezierCurveTo(74, 26, 82, 24, 86, 30);
  ctx.closePath();
  ctx.fillStyle = '#ff5a3c';
  ctx.fill();
  for (const x of [26, 98]) {
    for (const y of [20, 28]) {
      circle(ctx, x, y, 1.4);
      ctx.fillStyle = '#c8d0dc';
      ctx.fill();
    }
  }
  shine(ctx, 30, 13, 16, 2, 0.5, 0);
});

// ——— money ———
const coin = pad(58, 58, (ctx) => {
  const c = 29;
  circle(ctx, c, c, 26);
  fs(ctx, rad(ctx, c, c, 27, [[0, '#fff6a0'], [0.6, '#ffd23f'], [1, '#c88a10']]));
  circle(ctx, c, c, 20);
  stroke(ctx, 2.2, '#c88a10');
  // a pizza slice stamped on it
  ctx.beginPath();
  ctx.moveTo(c, c + 12);
  ctx.lineTo(c - 10, c - 8);
  ctx.quadraticCurveTo(c, c - 13, c + 10, c - 8);
  ctx.closePath();
  ctx.fillStyle = '#e8a820';
  ctx.fill();
  stroke(ctx, 2, '#a86a10');
  for (const [x, y] of [[c - 3, c - 4], [c + 3, c + 2]]) {
    circle(ctx, x, y, 2);
    ctx.fillStyle = '#c87a10';
    ctx.fill();
  }
  shine(ctx, 19, 16, 7, 3.4, 0.75);
});

export const props: Record<string, () => HTMLCanvasElement> = {
  t_tomato: tomato,
  t_toenail: toenail,
  t_polish: polish,
  t_coin: coin,
  t_crust: crust,
  t_plate: plate,
  t_duck: duck,
  t_ring: ring,
  t_pineapple: pineapple,
  t_spinach: spinach,
  t_grenade: grenade,
  t_square: square,
  t_dumbbell: dumbbell,
  t_dough: dough,
  t_rattle: rattle,
  t_football: football,
  t_bowling: bowling,
  t_cannon: cannon,
  t_flatbread: flatbread,
  t_pie: pie,
  t_pie_splat: pieSplat,
  t_olive: olive,
  t_clutter_mug: mug,
  t_clutter_spoon: spoon,
  t_clutter_clock: clock,
  t_coconut: coconut,
  t_coconut_half: coconutHalf,
  t_lasso: lasso,
  t_lasso_loop: lassoLoop,
  t_skateboard: skateboard,
};
