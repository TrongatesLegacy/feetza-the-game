// Hero props: what the heroes throw (t_*), the bits their moves use (h_*), and the eight hero sightings that
// streak across the top of the screen (s_*). Same style as the other props: thick dark-brown outlines, soft
// gradients lit from the top left and a sheen. Every emblem is our own.
import { type Ctx, ellipse, makeCanvas, rgba, roundRect, shade } from '../../art/util';

const INK = '#2a1810';

function pad(w: number, h: number, draw: (ctx: Ctx) => void, k = 2.5): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(w * k, h * k);
    ctx.scale(k, k);
    draw(ctx);
    return c;
  };
}

function ink(ctx: Ctx, lw = 3.2, col = INK): void {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function fs(ctx: Ctx, fill: string | CanvasGradient, lw = 3.2): void {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) ink(ctx, lw);
}

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function rad(ctx: Ctx, x: number, y: number, r: number, base: string, k = 0.4): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  g.addColorStop(0, shade(base, k));
  g.addColorStop(0.65, base);
  g.addColorStop(1, shade(base, -0.35));
  return g;
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55, rot = -0.6): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function poly(ctx: Ctx, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function star(ctx: Ctx, x: number, y: number, r: number, n = 5, inner = 0.45, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = rot + (i * Math.PI) / n;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function slice(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x - 11 * s, y - 9 * s);
  ctx.quadraticCurveTo(x, y - 14 * s, x + 11 * s, y - 9 * s);
  ctx.lineTo(x, y + 12 * s);
  ctx.closePath();
}

/** A little hero peel in flight: round head, costume colour, a cape behind (the sightings' silhouettes). */
function flyer(ctx: Ctx, x: number, y: number, suit: string, cape: string | null, s = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (cape) {
    // the cape streams out behind, with a ripple
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.bezierCurveTo(-60, -34, -100, -6, -150, -22);
    ctx.bezierCurveTo(-132, -6, -150, 10, -128, 18);
    ctx.bezierCurveTo(-96, 6, -60, 24, -10, 16);
    ctx.closePath();
    fs(ctx, lin(ctx, -150, 0, 0, 0, [[0, shade(cape, -0.35)], [0.6, cape], [1, shade(cape, 0.2)]]), 3.5);
    ctx.beginPath();
    ctx.moveTo(-40, -14);
    ctx.quadraticCurveTo(-80, -4, -120, -10);
    ink(ctx, 2, rgba(INK, 0.4));
  }
  // the handle trails behind like legs
  roundRect(ctx, -70, -6, 64, 12, 6);
  fs(ctx, lin(ctx, 0, -6, 0, 6, [[0, '#c8904a'], [1, '#7a4a22']]), 3);
  // head
  circle(ctx, 24, 0, 30);
  fs(ctx, rad(ctx, 24, 0, 30, suit), 3.5);
  // eyes and a little mask
  ellipse(ctx, 34, -6, 18, 7);
  fs(ctx, shade(suit, -0.4), 2);
  for (const dx of [28, 40]) {
    ellipse(ctx, dx, -6, 3.5, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  shine(ctx, 14, -12, 9, 4.5, 0.45);
  ctx.restore();
}

// ——— thrown props (drawn pointing right, about 2.5× their display size) ———
const wingrang = pad(104, 56, (ctx) => {
  // a boomerang with scalloped wing edges and a gold edge stripe
  ctx.beginPath();
  ctx.moveTo(52, 22);
  ctx.bezierCurveTo(40, 8, 20, 4, 4, 14);
  ctx.quadraticCurveTo(12, 22, 8, 34);
  ctx.quadraticCurveTo(18, 30, 22, 40);
  ctx.quadraticCurveTo(32, 34, 38, 44);
  ctx.quadraticCurveTo(44, 36, 52, 40);
  ctx.quadraticCurveTo(60, 36, 66, 44);
  ctx.quadraticCurveTo(72, 34, 82, 40);
  ctx.quadraticCurveTo(86, 30, 96, 34);
  ctx.quadraticCurveTo(92, 22, 100, 14);
  ctx.bezierCurveTo(84, 4, 64, 8, 52, 22);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 6, 0, 44, [[0, '#4a4d5e'], [1, '#1d1f2b']]), 3.4);
  ctx.beginPath();
  ctx.moveTo(8, 15);
  ctx.bezierCurveTo(22, 8, 40, 12, 52, 24);
  ctx.bezierCurveTo(64, 12, 82, 8, 96, 15);
  ink(ctx, 3, '#ffd23f');
  circle(ctx, 52, 28, 6);
  fs(ctx, rad(ctx, 52, 28, 6, '#ffd23f'), 2.4);
  shine(ctx, 30, 16, 9, 3, 0.35, -0.2);
});

const shieldProp = pad(110, 110, (ctx) => {
  const c = 55;
  circle(ctx, c, c, 50);
  fs(ctx, rad(ctx, c, c, 50, '#9aa3ad', 0.5), 3.6);
  circle(ctx, c, c, 42);
  fs(ctx, rad(ctx, c, c, 42, '#2a5ad8'), 3);
  // eight rivets round the rim
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    circle(ctx, c + Math.cos(a) * 46, c + Math.sin(a) * 46, 2.6);
    fs(ctx, '#e8edf2', 1.5);
  }
  circle(ctx, c, c, 24);
  fs(ctx, rad(ctx, c, c, 24, '#f4f1ea', 0.2), 3);
  slice(ctx, c, c + 2, 1.5);
  fs(ctx, lin(ctx, 0, c - 20, 0, c + 20, [[0, '#ffe680'], [1, '#e89a1a']]), 2.8);
  for (const [x, y] of [[-5, -4], [4, 0], [0, 8]] as const) {
    circle(ctx, c + x, c + y, 2.6);
    ctx.fillStyle = '#c8301a';
    ctx.fill();
  }
  shine(ctx, c - 18, c - 22, 16, 6, 0.5);
});

const arrow = pad(96, 30, (ctx) => {
  roundRect(ctx, 18, 12.5, 62, 5, 2);
  fs(ctx, lin(ctx, 0, 12, 0, 18, [[0, '#c8904a'], [1, '#7a4a22']]), 2.4);
  poly(ctx, [[94, 15], [76, 5], [80, 15], [76, 25]]);
  fs(ctx, lin(ctx, 76, 5, 76, 25, [[0, '#e8edf2'], [1, '#7a8494']]), 2.6);
  for (const dy of [-1, 1]) {
    poly(ctx, [[26, 15], [8, 15 + dy * 11], [2, 15 + dy * 11], [14, 15]]);
    fs(ctx, '#7a4a9a', 2.4);
  }
});

const card = pad(56, 76, (ctx) => {
  ctx.save();
  ctx.shadowColor = '#ff3d6e';
  ctx.shadowBlur = 10;
  roundRect(ctx, 6, 6, 44, 64, 6);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  ctx.restore();
  roundRect(ctx, 6, 6, 44, 64, 6);
  ink(ctx, 3);
  roundRect(ctx, 11, 11, 34, 54, 4);
  ink(ctx, 1.5, '#ff3d6e');
  // a spade in the middle, corners in pink
  ctx.beginPath();
  ctx.moveTo(28, 24);
  ctx.bezierCurveTo(42, 34, 38, 48, 28, 42);
  ctx.bezierCurveTo(18, 48, 14, 34, 28, 24);
  fs(ctx, '#1a1418', 1.5);
  poly(ctx, [[28, 40], [32, 50], [24, 50]]);
  fs(ctx, '#1a1418', 1.2);
  ctx.fillStyle = '#ff3d6e';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('A', 13, 20);
});

const bolt = pad(72, 26, (ctx) => {
  ctx.save();
  ctx.shadowColor = '#ff7a2a';
  ctx.shadowBlur = 10;
  ellipse(ctx, 38, 13, 32, 8);
  ctx.fillStyle = '#ff7a2a';
  ctx.fill();
  ctx.restore();
  ellipse(ctx, 38, 13, 32, 8);
  ink(ctx, 2.6);
  ellipse(ctx, 44, 13, 22, 4);
  ctx.fillStyle = '#fff6c0';
  ctx.fill();
});

const rocket = pad(92, 40, (ctx) => {
  // flame first
  ctx.beginPath();
  ctx.moveTo(18, 20);
  ctx.quadraticCurveTo(4, 12, 0, 20);
  ctx.quadraticCurveTo(4, 28, 18, 20);
  fs(ctx, lin(ctx, 0, 0, 18, 0, [[0, '#ff4a1a'], [1, '#fff6c0']]), 0);
  roundRect(ctx, 16, 11, 56, 18, 8);
  fs(ctx, lin(ctx, 0, 11, 0, 29, [[0, '#e8edf2'], [0.5, '#9aa3ad'], [1, '#5a636e']]), 3);
  ctx.beginPath();
  ctx.moveTo(70, 11);
  ctx.quadraticCurveTo(90, 20, 70, 29);
  ctx.closePath();
  fs(ctx, rad(ctx, 76, 18, 12, '#e5402a'), 3);
  for (const dy of [-1, 1]) {
    poly(ctx, [[22, 20 + dy * 8], [12, 20 + dy * 18], [34, 20 + dy * 9]]);
    fs(ctx, '#e5402a', 2.4);
  }
  ctx.fillStyle = '#ff9f1c';
  ctx.fillRect(44, 12, 5, 16);
  shine(ctx, 38, 15, 12, 2.5, 0.6, 0);
});

const crescent = pad(70, 70, (ctx) => {
  ctx.beginPath();
  ctx.arc(35, 35, 30, Math.PI * 0.25, Math.PI * 1.75);
  ctx.arc(46, 35, 22, Math.PI * 1.6, Math.PI * 0.4, true);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 5, 0, 65, [[0, '#ffffff'], [0.5, '#c9cfd8'], [1, '#7a8494']]), 3.4);
  shine(ctx, 18, 22, 6, 3, 0.7);
});

// ——— the moves' bits (drawn at display size ×2) ———
const fin = pad(80, 64, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(4, 60);
  ctx.quadraticCurveTo(30, 40, 52, 4);
  ctx.quadraticCurveTo(58, 34, 76, 60);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 4, 0, 60, [[0, '#7a9aae'], [1, '#3a5a6e']]), 3.4);
  ctx.beginPath();
  ctx.moveTo(48, 14);
  ctx.quadraticCurveTo(40, 34, 26, 50);
  ink(ctx, 2.5, rgba('#ffffff', 0.4));
  // the water line
  ctx.beginPath();
  ctx.moveTo(0, 60);
  for (let x = 0; x <= 80; x += 10) ctx.quadraticCurveTo(x + 5, 54, x + 10, 60);
  ink(ctx, 3, '#d8f6ff');
}, 2);

const jaws = pad(130, 100, (ctx) => {
  for (const top of [true, false]) {
    ctx.beginPath();
    const y = top ? 50 : 50;
    const d = top ? -1 : 1;
    ctx.moveTo(6, y);
    ctx.quadraticCurveTo(65, y + d * 54, 124, y);
    ctx.quadraticCurveTo(65, y + d * 14, 6, y);
    fs(ctx, lin(ctx, 0, y + d * 50, 0, y, [[0, '#6a8a9e'], [1, '#a8c0cc']]), 3.4);
    for (let i = 0; i < 9; i++) {
      const x = 14 + i * 12.5;
      poly(ctx, [[x - 5, y + d * 6], [x + 5, y + d * 6], [x, y + d * -6]]);
      fs(ctx, '#fffaf0', 1.6);
    }
  }
}, 2);

const board = pad(210, 60, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(8, 44);
  ctx.quadraticCurveTo(10, 32, 40, 30);
  ctx.lineTo(176, 30);
  ctx.quadraticCurveTo(206, 34, 202, 44);
  ctx.quadraticCurveTo(190, 54, 160, 54);
  ctx.lineTo(40, 54);
  ctx.quadraticCurveTo(10, 54, 8, 44);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 30, 0, 54, [[0, '#ffffff'], [0.4, '#c9cfd8'], [0.6, '#e8edf2'], [1, '#7a8494']]), 3.4);
  // a chrome rider: a peel standing up, arms out
  roundRect(ctx, 98, 6, 10, 26, 4);
  fs(ctx, lin(ctx, 98, 0, 108, 0, [[0, '#7a8494'], [1, '#e8edf2']]), 2.6);
  circle(ctx, 103, 8, 9);
  fs(ctx, rad(ctx, 103, 8, 9, '#c9cfd8', 0.6), 2.6);
  shine(ctx, 70, 36, 26, 3, 0.7, 0);
}, 2);

const tree = pad(280, 260, (ctx) => {
  // trunk with a face (I am Crust), roots spreading at the base
  ctx.beginPath();
  ctx.moveTo(110, 258);
  ctx.quadraticCurveTo(118, 170, 104, 110);
  ctx.lineTo(176, 110);
  ctx.quadraticCurveTo(162, 170, 170, 258);
  ctx.closePath();
  fs(ctx, lin(ctx, 104, 0, 176, 0, [[0, '#5a3a1a'], [0.5, '#8a5a32'], [1, '#4a2a14']]), 4);
  for (const [x0, x1] of [[96, 40], [184, 240], [120, 70], [160, 210]] as const) {
    ctx.beginPath();
    ctx.moveTo(140, 244);
    ctx.quadraticCurveTo((140 + x1) / 2, 250, x1, 258);
    ink(ctx, 12, INK);
    ink(ctx, 7, '#7a4a22');
    void x0;
  }
  // canopy
  for (const [x, y, r] of [[80, 92, 56], [140, 60, 70], [200, 92, 56], [110, 118, 44], [172, 118, 44]] as const) {
    circle(ctx, x, y, r);
    fs(ctx, rad(ctx, x, y, r, '#4a9a3a', 0.35), 4);
  }
  for (const [x, y] of [[70, 80], [120, 40], [190, 70], [150, 100]] as const) {
    circle(ctx, x, y, 10);
    ctx.fillStyle = rgba('#a8e070', 0.6);
    ctx.fill();
  }
  // a happy little face on the trunk
  for (const dx of [-14, 14]) {
    circle(ctx, 140 + dx, 170, 5);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(140, 182, 12, 0.2, Math.PI - 0.2);
  ink(ctx, 3.5);
}, 2);

const bigGun = pad(130, 70, (ctx) => {
  roundRect(ctx, 30, 14, 92, 28, 8);
  fs(ctx, lin(ctx, 0, 14, 0, 42, [[0, '#9aa3ad'], [1, '#4a525c']]), 3.4);
  for (const y of [18, 28]) {
    roundRect(ctx, 100, y, 28, 9, 4);
    fs(ctx, '#3a3d4c', 2.4);
  }
  roundRect(ctx, 40, 40, 22, 26, 6);
  fs(ctx, lin(ctx, 0, 40, 0, 66, [[0, '#ff9f1c'], [1, '#c8601a']]), 3);
  roundRect(ctx, 4, 20, 34, 18, 6);
  fs(ctx, '#ff8a1c', 3);
  for (let x = 46; x < 96; x += 12) {
    circle(ctx, x, 28, 3);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  }
  shine(ctx, 70, 20, 30, 3, 0.6, 0);
}, 2);

const glove = pad(100, 84, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(30, 70);
  ctx.bezierCurveTo(6, 64, 6, 20, 34, 12);
  ctx.bezierCurveTo(60, 4, 92, 10, 94, 40);
  ctx.bezierCurveTo(96, 66, 70, 76, 30, 70);
  fs(ctx, rad(ctx, 56, 36, 44, '#e5242f', 0.45), 3.6);
  ctx.beginPath();
  ctx.moveTo(30, 40);
  ctx.quadraticCurveTo(46, 26, 62, 38);
  ink(ctx, 3);
  roundRect(ctx, 2, 50, 26, 26, 6);
  fs(ctx, '#f4f1ea', 3.2);
  shine(ctx, 50, 22, 16, 6, 0.55);
}, 2);

const gavel = pad(170, 130, (ctx) => {
  ctx.save();
  ctx.translate(60, 64);
  ctx.rotate(-0.4);
  roundRect(ctx, -6, -4, 12, 110, 5);
  fs(ctx, lin(ctx, -6, 0, 6, 0, [[0, '#c8904a'], [1, '#6a3a1a']]), 3.2);
  roundRect(ctx, -52, -46, 104, 44, 12);
  fs(ctx, lin(ctx, 0, -46, 0, -2, [[0, '#b07a3a'], [1, '#5a3a1a']]), 3.6);
  for (const x of [-46, 38]) {
    roundRect(ctx, x, -48, 8, 48, 3);
    fs(ctx, '#ffd23f', 2.4);
  }
  shine(ctx, -10, -36, 26, 4, 0.5, 0);
  ctx.restore();
}, 2);

const wasp = pad(100, 84, (ctx) => {
  for (const s of [-1, 1]) {
    ellipse(ctx, 50 + s * 14, 22, 20, 12, s * 0.5);
    ctx.fillStyle = rgba('#d8f6ff', 0.75);
    ctx.fill();
    ink(ctx, 2.4);
  }
  ellipse(ctx, 50, 48, 24, 30);
  fs(ctx, rad(ctx, 50, 48, 28, '#f2c230'), 3.2);
  ctx.save();
  ellipse(ctx, 50, 48, 24, 30);
  ctx.clip();
  ctx.fillStyle = '#1a1418';
  for (const y of [40, 56, 72]) ctx.fillRect(20, y, 60, 7);
  ctx.restore();
  ellipse(ctx, 50, 48, 24, 30);
  ink(ctx, 3.2);
  roundRect(ctx, 34, 26, 32, 10, 5);
  fs(ctx, '#7be04a', 2.4);
  poly(ctx, [[46, 78], [54, 78], [50, 84]]);
  fs(ctx, '#1a1418', 1.6);
}, 2);

const squirrel = pad(100, 84, (ctx) => {
  // bushy tail curling up behind
  ctx.beginPath();
  ctx.moveTo(30, 60);
  ctx.bezierCurveTo(-4, 56, 0, 4, 30, 8);
  ctx.bezierCurveTo(46, 10, 40, 30, 30, 28);
  ctx.bezierCurveTo(22, 30, 30, 50, 42, 54);
  ctx.closePath();
  fs(ctx, rad(ctx, 20, 30, 30, '#c8803a', 0.35), 3);
  // body and head
  ellipse(ctx, 56, 56, 22, 16, -0.3);
  fs(ctx, rad(ctx, 56, 56, 22, '#a8642a'), 3);
  circle(ctx, 78, 40, 13);
  fs(ctx, rad(ctx, 78, 40, 13, '#a8642a'), 3);
  poly(ctx, [[72, 30], [74, 18], [80, 28]]);
  fs(ctx, '#a8642a', 2.4);
  circle(ctx, 82, 38, 2.6);
  ctx.fillStyle = INK;
  ctx.fill();
  circle(ctx, 90, 42, 2.4);
  ctx.fillStyle = '#3a1a14';
  ctx.fill();
  ellipse(ctx, 60, 60, 10, 7);
  ctx.fillStyle = rgba('#f2dcb0', 0.8);
  ctx.fill();
  // legs mid-scamper
  for (const [x, a] of [[46, 0.5], [66, -0.4]] as const) {
    ctx.save();
    ctx.translate(x, 66);
    ctx.rotate(a);
    roundRect(ctx, -3, 0, 6, 14, 3);
    fs(ctx, '#8a5222', 2);
    ctx.restore();
  }
  // an acorn in its paws
  ellipse(ctx, 86, 52, 5, 6);
  fs(ctx, '#c8803a', 2);
}, 2);

// ——— the sightings: one flyby each (drawn facing right) ———
const sBird = pad(190, 80, (ctx) => {
  // speed lines, then the caped flyer
  for (const [y, w] of [[26, 60], [40, 90], [54, 50]] as const) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(10 + w, y);
    ink(ctx, 3, rgba('#ffffff', 0.6));
  }
  flyer(ctx, 150, 40, '#2a5fd0', '#e0242f', 0.95);
  // a gold star badge on the chest
  star(ctx, 170, 52, 7, 4, 0.4);
  fs(ctx, '#ffd23f', 1.8);
}, 2);

const sComet = pad(200, 90, (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 160, 0);
  g.addColorStop(0, 'rgba(125,255,154,0)');
  g.addColorStop(1, 'rgba(125,255,154,0.85)');
  ctx.beginPath();
  ctx.moveTo(0, 45);
  ctx.quadraticCurveTo(80, 20, 160, 30);
  ctx.lineTo(160, 60);
  ctx.quadraticCurveTo(80, 70, 0, 45);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.shadowColor = '#7dff9a';
  ctx.shadowBlur = 18;
  circle(ctx, 162, 45, 22);
  ctx.strokeStyle = '#7dff9a';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();
  circle(ctx, 162, 45, 22);
  ink(ctx, 2.5);
  circle(ctx, 162, 45, 14);
  fs(ctx, rad(ctx, 162, 45, 14, '#c8ffd4', 0.6), 2.5);
}, 2);

const sVisor = pad(200, 60, (ctx) => {
  ctx.save();
  ctx.shadowColor = '#ff2a2a';
  ctx.shadowBlur = 16;
  roundRect(ctx, 20, 22, 160, 16, 8);
  ctx.fillStyle = '#ff3a2a';
  ctx.fill();
  ctx.restore();
  roundRect(ctx, 20, 22, 160, 16, 8);
  ink(ctx, 3);
  roundRect(ctx, 40, 27, 120, 5, 2.5);
  ctx.fillStyle = '#fff0e0';
  ctx.fill();
  // the glint
  star(ctx, 150, 30, 22, 4, 0.18, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}, 2);

const sCassette = pad(200, 90, (ctx) => {
  // music notes trail behind
  for (const [x, y] of [[20, 30], [50, 56], [80, 26]] as const) {
    ellipse(ctx, x, y + 10, 6, 4.5, -0.4);
    fs(ctx, '#ffd23f', 2);
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 9);
    ctx.lineTo(x + 5, y - 10);
    ctx.lineTo(x + 13, y - 6);
    ink(ctx, 2.6, '#ffd23f');
  }
  // the ship: a cassette with fins and an orange thruster
  poly(ctx, [[110, 30], [96, 14], [120, 26]]);
  fs(ctx, '#ff8a1c', 2.6);
  poly(ctx, [[110, 62], [96, 78], [120, 66]]);
  fs(ctx, '#ff8a1c', 2.6);
  roundRect(ctx, 104, 24, 84, 44, 8);
  fs(ctx, lin(ctx, 0, 24, 0, 68, [[0, '#5a4a42'], [1, '#2a1d18']]), 3.2);
  roundRect(ctx, 114, 30, 64, 20, 4);
  fs(ctx, '#ff9f1c', 2.4);
  for (const x of [130, 162]) {
    circle(ctx, x, 40, 6);
    fs(ctx, '#2a1d18', 2);
  }
  ellipse(ctx, 100, 46, 8, 12);
  ctx.fillStyle = rgba('#ff9a2a', 0.85);
  ctx.fill();
  shine(ctx, 140, 28, 20, 3, 0.5, 0);
}, 2);

const sKid = pad(160, 110, (ctx) => {
  // a lightning bolt wearing a little white cape
  ctx.beginPath();
  ctx.moveTo(58, 30);
  ctx.bezierCurveTo(30, 20, 14, 50, 4, 44);
  ctx.bezierCurveTo(14, 64, 40, 54, 62, 64);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 30, 62, 30, [[0, '#d8d4cc'], [1, '#ffffff']]), 3);
  ctx.save();
  ctx.shadowColor = '#fff6a0';
  ctx.shadowBlur = 16;
  poly(ctx, [[110, 6], [64, 58], [92, 58], [70, 104], [140, 44], [108, 44], [130, 6]]);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.restore();
  poly(ctx, [[110, 6], [64, 58], [92, 58], [70, 104], [140, 44], [108, 44], [130, 6]]);
  ink(ctx, 3.4);
  poly(ctx, [[114, 14], [82, 50], [96, 50]]);
  ctx.fillStyle = rgba('#ffffff', 0.6);
  ctx.fill();
}, 2);

const sSaucer = pad(170, 100, (ctx) => {
  // a little green figure phasing in a glass dome
  ctx.save();
  ctx.globalAlpha = 0.85;
  ellipse(ctx, 85, 40, 34, 28);
  fs(ctx, rad(ctx, 85, 40, 34, '#c8f6ff', 0.3), 3);
  ctx.globalAlpha = 0.7;
  circle(ctx, 85, 42, 14);
  fs(ctx, rad(ctx, 85, 42, 14, '#3a9a4a'), 2.4);
  for (const dx of [-5, 5]) {
    ellipse(ctx, 85 + dx, 40, 3, 2);
    ctx.fillStyle = '#ff3a2a';
    ctx.fill();
  }
  ctx.restore();
  ellipse(ctx, 85, 62, 80, 20);
  fs(ctx, lin(ctx, 0, 44, 0, 80, [[0, '#9aa3ad'], [1, '#4a525c']]), 3.4);
  for (let i = 0; i < 6; i++) {
    circle(ctx, 30 + i * 22, 66, 4);
    fs(ctx, i % 2 ? '#7dff9a' : '#ffd23f', 1.6);
  }
  shine(ctx, 60, 54, 26, 4, 0.5, 0);
}, 2);

const sTopHat = pad(130, 130, (ctx) => {
  // the hat, with a card fluttering out of it
  ellipse(ctx, 62, 60, 48, 10);
  fs(ctx, '#1a1820', 3.2);
  ctx.beginPath();
  ctx.moveTo(34, 60);
  ctx.lineTo(38, 14);
  ctx.quadraticCurveTo(62, 8, 86, 14);
  ctx.lineTo(90, 60);
  ctx.quadraticCurveTo(62, 66, 34, 60);
  fs(ctx, lin(ctx, 0, 8, 0, 60, [[0, '#3a3844'], [1, '#121016']]), 3.4);
  ctx.beginPath();
  ctx.moveTo(36, 50);
  ctx.quadraticCurveTo(62, 56, 88, 50);
  ctx.lineTo(87, 40);
  ctx.quadraticCurveTo(62, 46, 37, 40);
  fs(ctx, '#c8102e', 2.4);
  ctx.save();
  ctx.translate(80, 98);
  ctx.rotate(0.4);
  roundRect(ctx, -12, -16, 24, 32, 4);
  fs(ctx, '#fffaf0', 2.4);
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.bezierCurveTo(8, -1, 6, 7, 0, 4);
  ctx.bezierCurveTo(-6, 7, -8, -1, 0, -7);
  fs(ctx, '#c8102e', 1.2);
  ctx.restore();
  star(ctx, 100, 20, 8, 4, 0.35);
  fs(ctx, '#ffffff', 1.4);
  shine(ctx, 50, 26, 5, 12, 0.3, 0);
}, 2);

const sSignal = pad(220, 150, (ctx) => {
  // a winged slice, thrown onto the clouds by a beam of light
  const g = ctx.createRadialGradient(110, 75, 10, 110, 75, 100);
  g.addColorStop(0, 'rgba(255,240,180,0.85)');
  g.addColorStop(0.7, 'rgba(255,240,180,0.45)');
  g.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = g;
  ellipse(ctx, 110, 75, 104, 66);
  ctx.fill();
  ctx.fillStyle = rgba('#1d1f2b', 0.92);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(110 + s * 12, 70);
    ctx.quadraticCurveTo(110 + s * 50, 34, 110 + s * 86, 50);
    ctx.quadraticCurveTo(110 + s * 70, 62, 110 + s * 76, 78);
    ctx.quadraticCurveTo(110 + s * 56, 72, 110 + s * 52, 92);
    ctx.quadraticCurveTo(110 + s * 34, 80, 110 + s * 14, 92);
    ctx.closePath();
    ctx.fill();
  }
  slice(ctx, 110, 80, 2.4);
  ctx.fill();
}, 2);

const evSighting = pad(110, 110, (ctx) => {
  // the event's badge: a hero zooming past a star
  star(ctx, 70, 40, 26, 5, 0.45);
  fs(ctx, rad(ctx, 70, 40, 26, '#ffd23f'), 3);
  flyer(ctx, 60, 70, '#2a5fd0', '#e0242f', 0.5);
}, 2);

export const props: Record<string, () => HTMLCanvasElement> = {
  t_wingrang: wingrang,
  t_shield: shieldProp,
  t_arrow: arrow,
  t_card: card,
  t_bolt: bolt,
  t_rocket: rocket,
  t_crescent: crescent,
  h_fin: fin,
  h_jaws: jaws,
  h_board: board,
  h_tree: tree,
  h_biggun: bigGun,
  h_glove: glove,
  h_gavel: gavel,
  h_wasp: wasp,
  h_squirrel: squirrel,
  s_bird: sBird,
  s_comet: sComet,
  s_visor: sVisor,
  s_cassette: sCassette,
  s_kid: sKid,
  s_saucer: sSaucer,
  s_tophat: sTopHat,
  s_signal: sSignal,
  ev_sighting: evSighting,
};
