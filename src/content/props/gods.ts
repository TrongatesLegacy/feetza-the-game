// God props: the thunder hammer the Norse gods throw (t_hammer), the bits the god moves use (g_*), and the
// Spartan Sandals' bronze shield (g_aspis). Same style as the other props: thick dark-brown outlines, soft
// gradients lit from the top left and a sheen. Drawn from the myths, never from a film or game.
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
  g.addColorStop(1, shade(base, -0.3));
  return g;
}

const goldG = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, base = '#e8b43a') =>
  lin(ctx, x0, y0, x1, y1, [[0, shade(base, 0.55)], [0.4, shade(base, 0.1)], [0.6, base], [1, shade(base, -0.3)]]);

function sheen(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.5, rot = -0.5): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

// ——— Mjölnir, as a thrown prop: a short-hafted iron hammer with runes and a leather loop ———
const hammer = pad(100, 70, (ctx) => {
  // haft
  roundRect(ctx, 44, 30, 12, 38, 4);
  fs(ctx, lin(ctx, 44, 0, 56, 0, [[0, '#5a3a22'], [0.5, '#9a6a3e'], [1, '#4a2a14']]), 3);
  ctx.strokeStyle = rgba('#2a1810', 0.5);
  ctx.lineWidth = 2;
  for (let y = 38; y < 66; y += 6) {
    ctx.beginPath();
    ctx.moveTo(44, y);
    ctx.lineTo(56, y + 3);
    ctx.stroke();
  }
  // the head: a heavy block with bevelled faces
  ctx.beginPath();
  ctx.moveTo(12, 6);
  ctx.lineTo(88, 6);
  ctx.lineTo(94, 18);
  ctx.lineTo(88, 32);
  ctx.lineTo(12, 32);
  ctx.lineTo(6, 18);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 4, 0, 34, [[0, '#c4ccd6'], [0.45, '#8a929e'], [1, '#4a5058']]), 3.6);
  // runes glowing blue
  ctx.save();
  ctx.shadowColor = '#9fd8ff';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = '#cfeeff';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(30, 12);
  ctx.lineTo(30, 26);
  ctx.moveTo(30, 14);
  ctx.lineTo(36, 18);
  ctx.moveTo(50, 12);
  ctx.lineTo(56, 26);
  ctx.moveTo(56, 12);
  ctx.lineTo(50, 26);
  ctx.moveTo(70, 12);
  ctx.lineTo(70, 26);
  ctx.moveTo(66, 16);
  ctx.lineTo(70, 12);
  ctx.lineTo(74, 16);
  ctx.stroke();
  ctx.restore();
  sheen(ctx, 26, 11, 14, 3, 0.55, 0);
  // leather wrist loop
  ctx.beginPath();
  ctx.ellipse(50, 70, 7, 4, 0, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = '#8a5a32';
  ctx.lineWidth = 2;
  ctx.stroke();
});

// ——— Hera's crown: gold, with teal peacock-eye gems ———
const crown = pad(110, 80, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(10, 70);
  ctx.lineTo(6, 20);
  ctx.lineTo(28, 42);
  ctx.lineTo(40, 8);
  ctx.lineTo(55, 38);
  ctx.lineTo(70, 8);
  ctx.lineTo(82, 42);
  ctx.lineTo(104, 20);
  ctx.lineTo(100, 70);
  ctx.closePath();
  fs(ctx, goldG(ctx, 0, 0, 110, 80), 3.6);
  roundRect(ctx, 8, 58, 94, 14, 5);
  fs(ctx, goldG(ctx, 0, 58, 0, 72, '#d9a02a'), 3);
  for (const [x, y, r] of [[40, 14, 5], [70, 14, 5], [55, 46, 7], [6, 24, 4], [104, 24, 4]] as [number, number, number][]) {
    ellipse(ctx, x, y, r, r);
    fs(ctx, rad(ctx, x, y, r, '#2ab0a0', 0.6), 2);
  }
  for (const x of [24, 42, 68, 86]) {
    ellipse(ctx, x, 65, 3.5, 3.5);
    fs(ctx, rad(ctx, x, 65, 3.5, '#e0402a', 0.6), 1.6);
  }
  sheen(ctx, 30, 50, 10, 4, 0.55);
});

// ——— Poseidon's trident ———
const trident = pad(80, 300, (ctx) => {
  roundRect(ctx, 35, 70, 10, 226, 5);
  fs(ctx, goldG(ctx, 35, 0, 45, 0), 3.2);
  ctx.beginPath();
  ctx.moveTo(8, 6);
  ctx.lineTo(16, 0);
  ctx.lineTo(18, 54);
  ctx.quadraticCurveTo(40, 82, 62, 54);
  ctx.lineTo(64, 0);
  ctx.lineTo(72, 6);
  ctx.lineTo(70, 64);
  ctx.quadraticCurveTo(40, 100, 10, 64);
  ctx.closePath();
  ctx.moveTo(34, 64);
  ctx.lineTo(40, -2);
  ctx.lineTo(46, 64);
  ctx.closePath();
  fs(ctx, goldG(ctx, 0, 0, 80, 90), 3.6);
  // the barbs
  for (const x of [16, 64]) {
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x + (x < 40 ? 8 : -8), 16);
    ctx.lineTo(x, 18);
    ctx.closePath();
    fs(ctx, goldG(ctx, x - 4, 0, x + 4, 20), 2);
  }
  ellipse(ctx, 40, 80, 9, 9);
  fs(ctx, rad(ctx, 40, 80, 9, '#3ab0e0', 0.6), 2.6);
  sheen(ctx, 36, 150, 2, 40, 0.5, 0);
});

// ——— Demeter's wheat stalk (grows from the bottom) ———
const wheat = pad(40, 160, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(20, 160);
  ctx.quadraticCurveTo(16, 100, 20, 50);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#c8a040';
  ctx.lineWidth = 3;
  ctx.stroke();
  // a leaf
  ctx.beginPath();
  ctx.moveTo(19, 120);
  ctx.quadraticCurveTo(36, 100, 34, 80);
  ctx.quadraticCurveTo(26, 104, 19, 110);
  fs(ctx, '#a8b84a', 2);
  // the ear: plump grains in pairs
  for (let i = 0; i < 7; i++) {
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(20 + s * 5, 54 - i * 7);
      ctx.rotate(s * 0.45);
      ellipse(ctx, 0, 0, 5, 8.5);
      fs(ctx, rad(ctx, 0, 0, 8, '#f2c84a', 0.45), 2);
      ctx.restore();
    }
  }
  // the awns
  ctx.strokeStyle = rgba('#c8a040', 0.9);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(20 + (i % 2 ? 5 : -5), 50 - i * 7);
    ctx.lineTo(20 + (i % 2 ? 16 : -16), 30 - i * 7);
    ctx.stroke();
  }
});

// ——— Athena's owl, as the emblem on the Aegis ———
const owl = pad(200, 170, (ctx) => {
  // spread wings behind
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(100 + s * 30, 70);
    ctx.quadraticCurveTo(100 + s * 90, 30, 100 + s * 98, 100);
    ctx.lineTo(100 + s * 84, 96);
    ctx.lineTo(100 + s * 86, 120);
    ctx.lineTo(100 + s * 70, 112);
    ctx.lineTo(100 + s * 68, 134);
    ctx.quadraticCurveTo(100 + s * 40, 120, 100 + s * 30, 110);
    ctx.closePath();
    fs(ctx, lin(ctx, 100, 30, 100 + s * 100, 130, [[0, '#c8d4ea'], [1, '#6a7aa8']]), 3.6);
  }
  // the body
  ctx.beginPath();
  ctx.moveTo(62, 30);
  ctx.lineTo(78, 46);
  ctx.quadraticCurveTo(100, 38, 122, 46);
  ctx.lineTo(138, 30);
  ctx.quadraticCurveTo(152, 100, 128, 150);
  ctx.quadraticCurveTo(100, 168, 72, 150);
  ctx.quadraticCurveTo(48, 100, 62, 30);
  ctx.closePath();
  fs(ctx, rad(ctx, 100, 90, 80, '#e8eef8', 0.25), 4);
  // breast feathers
  ctx.strokeStyle = rgba(INK, 0.45);
  ctx.lineWidth = 2.4;
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 4 - (row % 2); i++) {
      ctx.beginPath();
      ctx.arc(80 + i * 14 + (row % 2) * 7, 112 + row * 12, 6, 0, Math.PI);
      ctx.stroke();
    }
  // big eyes
  for (const s of [-1, 1]) {
    ellipse(ctx, 100 + s * 20, 76, 17, 17);
    fs(ctx, '#fff8e0', 3);
    ellipse(ctx, 100 + s * 20, 77, 10, 10);
    fs(ctx, rad(ctx, 100 + s * 20, 77, 10, '#e8b43a', 0.5), 2);
    ellipse(ctx, 100 + s * 20, 77, 5, 5);
    ctx.fillStyle = INK;
    ctx.fill();
    sheen(ctx, 100 + s * 20 - 3, 73, 2.5, 1.8, 0.9);
  }
  ctx.beginPath();
  ctx.moveTo(94, 90);
  ctx.lineTo(106, 90);
  ctx.lineTo(100, 104);
  ctx.closePath();
  fs(ctx, '#e8a03a', 2.4);
});

// ——— Apollo's sun chariot: a gold car with a blazing sun wheel, drawn by a fiery horse ———
const chariot = pad(260, 150, (ctx) => {
  // the horse, galloping ahead (to the right)
  ctx.beginPath();
  ctx.moveTo(150, 70);
  ctx.quadraticCurveTo(170, 46, 210, 52);
  ctx.quadraticCurveTo(222, 30, 238, 24);
  ctx.lineTo(250, 30);
  ctx.lineTo(244, 44);
  ctx.quadraticCurveTo(236, 50, 232, 62);
  ctx.quadraticCurveTo(230, 82, 214, 88);
  ctx.lineTo(228, 120);
  ctx.lineTo(218, 122);
  ctx.lineTo(200, 92);
  ctx.lineTo(174, 94);
  ctx.lineTo(160, 124);
  ctx.lineTo(150, 120);
  ctx.lineTo(158, 90);
  ctx.closePath();
  fs(ctx, lin(ctx, 150, 20, 250, 120, [[0, '#fff0b0'], [0.5, '#ffc24a'], [1, '#e8802a']]), 3.6);
  // its flaming mane and tail
  for (const [x, y, a] of [[226, 30, -0.4], [214, 38, -0.6], [204, 48, -0.8], [152, 72, 2.6]] as [number, number, number][]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(-4, -18, 0, -26);
    ctx.quadraticCurveTo(4, -18, 6, 0);
    ctx.closePath();
    fs(ctx, '#ff6a1a', 2);
    ctx.restore();
  }
  ellipse(ctx, 238, 34, 2.4, 2.4);
  ctx.fillStyle = INK;
  ctx.fill();
  // the reins
  ctx.beginPath();
  ctx.moveTo(110, 70);
  ctx.quadraticCurveTo(170, 60, 236, 44);
  ctx.strokeStyle = '#8a5a22';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // the car
  ctx.beginPath();
  ctx.moveTo(20, 56);
  ctx.quadraticCurveTo(30, 40, 60, 44);
  ctx.lineTo(120, 60);
  ctx.quadraticCurveTo(128, 90, 112, 108);
  ctx.lineTo(30, 108);
  ctx.quadraticCurveTo(14, 84, 20, 56);
  ctx.closePath();
  fs(ctx, goldG(ctx, 20, 40, 120, 110), 4);
  ctx.strokeStyle = rgba(INK, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(28, 70);
  ctx.quadraticCurveTo(70, 66, 116, 74);
  ctx.stroke();
  // the sun wheel
  ctx.save();
  ctx.shadowColor = '#ffb020';
  ctx.shadowBlur = 16;
  ellipse(ctx, 70, 110, 34, 34);
  fs(ctx, rad(ctx, 70, 110, 34, '#ffd23f', 0.6), 4);
  ctx.restore();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(70 + Math.cos(a) * 10, 110 + Math.sin(a) * 10);
    ctx.lineTo(70 + Math.cos(a) * 30, 110 + Math.sin(a) * 30);
    ctx.strokeStyle = '#c87a1a';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ellipse(ctx, 70, 110, 9, 9);
  fs(ctx, '#fff6d0', 2.6);
  sheen(ctx, 44, 54, 14, 4, 0.6);
});

// ——— a bronze war horn (Ares) / Gjallarhorn ———
const horn = pad(160, 90, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(8, 18);
  ctx.bezierCurveTo(40, 80, 110, 90, 150, 30);
  ctx.lineTo(132, 12);
  ctx.bezierCurveTo(104, 56, 50, 56, 22, 10);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 0, 160, 90, [[0, '#f4ead0'], [0.6, '#d8c49a'], [1, '#a88a5a']]), 3.6);
  // bronze bands
  for (const t of [0.25, 0.5, 0.75]) {
    const x = 14 + t * 130;
    const y = 34 + Math.sin(t * Math.PI) * 32;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.6 + t * 1.4);
    roundRect(ctx, -4, -16, 8, 32, 3);
    fs(ctx, goldG(ctx, -4, -16, 4, 16, '#c9873a'), 2.4);
    ctx.restore();
  }
  // the bell
  ctx.beginPath();
  ctx.ellipse(141, 21, 16, 10, -0.8, 0, Math.PI * 2);
  fs(ctx, goldG(ctx, 125, 10, 157, 32, '#c9873a'), 3.2);
  ctx.beginPath();
  ctx.ellipse(141, 21, 9, 5, -0.8, 0, Math.PI * 2);
  ctx.fillStyle = '#3a2210';
  ctx.fill();
  sheen(ctx, 60, 54, 18, 4, 0.5, 0.3);
});

// ——— Aphrodite's heart ———
const heart = pad(60, 56, (ctx) => {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(30, 52);
    ctx.bezierCurveTo(-6, 30, 6, 0, 30, 14);
    ctx.bezierCurveTo(54, 0, 66, 30, 30, 52);
    ctx.closePath();
  };
  path();
  fs(ctx, rad(ctx, 28, 26, 30, '#ff5a9a', 0.5), 3.6);
  sheen(ctx, 18, 18, 7, 4, 0.7);
});

// ——— Hephaestus's anvil ———
const anvil = pad(140, 100, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(8, 18);
  ctx.lineTo(30, 10);
  ctx.lineTo(118, 10);
  ctx.lineTo(136, 22);
  ctx.lineTo(118, 34);
  ctx.lineTo(96, 36);
  ctx.lineTo(86, 64);
  ctx.lineTo(110, 90);
  ctx.lineTo(28, 90);
  ctx.lineTo(52, 64);
  ctx.lineTo(42, 36);
  ctx.quadraticCurveTo(20, 34, 8, 18);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 8, 0, 92, [[0, '#b8c0ca'], [0.3, '#7a838d'], [1, '#3a4048']]), 4);
  // the hot glowing face
  roundRect(ctx, 34, 8, 80, 6, 3);
  ctx.fillStyle = '#ff9a3a';
  ctx.fill();
  sheen(ctx, 60, 20, 26, 4, 0.45, 0);
});

// ——— golden wings (Nike, Hermes) ———
const wings = pad(220, 110, (ctx) => {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(110 + s * 10, 70);
    ctx.bezierCurveTo(110 + s * 40, 10, 110 + s * 90, 0, 110 + s * 106, 10);
    ctx.lineTo(110 + s * 96, 30);
    ctx.lineTo(110 + s * 104, 40);
    ctx.lineTo(110 + s * 88, 56);
    ctx.lineTo(110 + s * 94, 66);
    ctx.lineTo(110 + s * 74, 80);
    ctx.lineTo(110 + s * 76, 92);
    ctx.lineTo(110 + s * 50, 96);
    ctx.quadraticCurveTo(110 + s * 24, 90, 110 + s * 10, 70);
    ctx.closePath();
    fs(ctx, lin(ctx, 110, 0, 110 + s * 110, 100, [[0, '#fff6c0'], [0.5, '#ffd23f'], [1, '#d8902a']]), 3.6);
    ctx.strokeStyle = rgba(INK, 0.4);
    ctx.lineWidth = 2;
    for (const k of [0.35, 0.6, 0.82]) {
      ctx.beginPath();
      ctx.moveTo(110 + s * 14, 72);
      ctx.quadraticCurveTo(110 + s * 60 * k, 40, 110 + s * 100 * k, 20 + k * 60);
      ctx.stroke();
    }
  }
});

// ——— Persephone's spring flower ———
const flower = pad(50, 50, (ctx) => {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.save();
    ctx.translate(25 + Math.cos(a) * 11, 25 + Math.sin(a) * 11);
    ctx.rotate(a);
    ellipse(ctx, 0, 0, 10, 7);
    fs(ctx, rad(ctx, 0, 0, 10, i % 2 ? '#ff8aa8' : '#ffb0c8', 0.4), 2.2);
    ctx.restore();
  }
  ellipse(ctx, 25, 25, 7, 7);
  fs(ctx, rad(ctx, 25, 25, 7, '#ffd23f', 0.5), 2.2);
});

// ——— one of Odin's ravens, wings up ———
const raven = pad(100, 70, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(10, 40);
  ctx.quadraticCurveTo(30, 30, 46, 36);
  ctx.lineTo(30, 6);
  ctx.quadraticCurveTo(56, 14, 62, 34);
  ctx.lineTo(80, 30);
  ctx.lineTo(96, 34);
  ctx.lineTo(82, 40);
  ctx.quadraticCurveTo(74, 56, 50, 56);
  ctx.lineTo(30, 66);
  ctx.lineTo(34, 54);
  ctx.quadraticCurveTo(18, 52, 10, 40);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 0, 100, 70, [[0, '#4a4a5a'], [1, '#14141c']]), 3);
  ellipse(ctx, 78, 34, 2.4, 2.4);
  ctx.fillStyle = '#9fd8ff';
  ctx.fill();
  sheen(ctx, 40, 24, 10, 3, 0.25, -0.8);
});

// ——— Gungnir, Odin's spear (pointing right) ———
const spear = pad(260, 40, (ctx) => {
  roundRect(ctx, 6, 16, 190, 8, 4);
  fs(ctx, lin(ctx, 0, 16, 0, 24, [[0, '#b8865a'], [1, '#5a3a22']]), 2.6);
  ctx.beginPath();
  ctx.moveTo(190, 10);
  ctx.lineTo(254, 20);
  ctx.lineTo(190, 30);
  ctx.lineTo(198, 20);
  ctx.closePath();
  fs(ctx, lin(ctx, 190, 8, 190, 32, [[0, '#e8eef4'], [0.5, '#9aa3ad'], [1, '#5a6068']]), 3);
  ctx.save();
  ctx.shadowColor = '#7ab8ff';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#cfeeff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(212, 16);
  ctx.lineTo(220, 24);
  ctx.moveTo(220, 16);
  ctx.lineTo(212, 24);
  ctx.stroke();
  ctx.restore();
  for (const x of [176, 184]) {
    roundRect(ctx, x, 13, 5, 14, 2);
    fs(ctx, goldG(ctx, x, 13, x + 5, 27), 1.6);
  }
});

// ——— Freya's falcon cloak: a pair of brown-and-cream falcon wings ———
const falcon = pad(240, 120, (ctx) => {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(120 + s * 10, 64);
    ctx.bezierCurveTo(120 + s * 50, 10, 120 + s * 100, 4, 120 + s * 116, 20);
    ctx.lineTo(120 + s * 104, 36);
    ctx.lineTo(120 + s * 114, 50);
    ctx.lineTo(120 + s * 96, 62);
    ctx.lineTo(120 + s * 100, 76);
    ctx.lineTo(120 + s * 78, 84);
    ctx.lineTo(120 + s * 76, 98);
    ctx.quadraticCurveTo(120 + s * 30, 96, 120 + s * 10, 64);
    ctx.closePath();
    fs(ctx, lin(ctx, 120, 0, 120 + s * 120, 100, [[0, '#f2dcb0'], [0.5, '#b07a3a'], [1, '#6a4422']]), 3.6);
    ctx.fillStyle = rgba('#2a1810', 0.35);
    for (let i = 0; i < 6; i++) {
      ellipse(ctx, 120 + s * (40 + i * 12), 40 + (i % 2) * 14, 4, 2.4, s * 0.5);
      ctx.fill();
    }
  }
});

// ——— Freyr's golden boar, charging (facing right) ———
const boar = pad(200, 130, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(18, 80);
  ctx.quadraticCurveTo(14, 36, 70, 30);
  ctx.lineTo(84, 12);
  ctx.lineTo(96, 30);
  ctx.quadraticCurveTo(150, 30, 176, 58);
  ctx.lineTo(194, 64);
  ctx.lineTo(186, 84);
  ctx.lineTo(164, 86);
  ctx.lineTo(160, 118);
  ctx.lineTo(144, 118);
  ctx.lineTo(140, 98);
  ctx.lineTo(70, 100);
  ctx.lineTo(62, 122);
  ctx.lineTo(46, 122);
  ctx.lineTo(44, 98);
  ctx.quadraticCurveTo(20, 96, 18, 80);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 10, 0, 120, [[0, '#fff0a0'], [0.45, '#ffc83a'], [1, '#c8862a']]), 4);
  // bristles along the back
  ctx.strokeStyle = '#a8701a';
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(40 + i * 13, 34 - Math.sin((i / 8) * Math.PI) * 4);
    ctx.lineTo(36 + i * 13, 22 - Math.sin((i / 8) * Math.PI) * 6);
    ctx.stroke();
  }
  // tusk, eye and snout
  ctx.beginPath();
  ctx.moveTo(176, 76);
  ctx.quadraticCurveTo(190, 70, 188, 56);
  ctx.lineTo(182, 70);
  ctx.closePath();
  fs(ctx, '#fff8e8', 2);
  ellipse(ctx, 150, 52, 4, 4);
  ctx.fillStyle = INK;
  ctx.fill();
  ellipse(ctx, 192, 74, 5, 8);
  fs(ctx, '#e8a030', 2);
  sheen(ctx, 70, 44, 26, 6, 0.55, -0.1);
});

// ——— Idun's golden apple ———
const apple = pad(50, 56, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(25, 14);
  ctx.bezierCurveTo(40, 2, 54, 20, 46, 38);
  ctx.bezierCurveTo(40, 54, 30, 54, 25, 50);
  ctx.bezierCurveTo(20, 54, 10, 54, 4, 38);
  ctx.bezierCurveTo(-4, 20, 10, 2, 25, 14);
  ctx.closePath();
  fs(ctx, rad(ctx, 22, 28, 26, '#ffd23f', 0.55), 3.4);
  roundRect(ctx, 23, 2, 4, 12, 2);
  fs(ctx, '#6a4422', 2);
  ctx.beginPath();
  ctx.ellipse(34, 8, 8, 4, -0.5, 0, Math.PI * 2);
  fs(ctx, '#6ab04a', 2);
  sheen(ctx, 14, 22, 5, 7, 0.7, 0.3);
});

// ——— the Spartan Sandals' round bronze shield (our own emblem: a red field with a black sun) ———
const aspis = pad(120, 120, (ctx) => {
  ellipse(ctx, 60, 60, 56, 56);
  fs(ctx, rad(ctx, 60, 60, 56, '#c9873a', 0.55), 5);
  ellipse(ctx, 60, 60, 46, 46);
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ellipse(ctx, 60, 60, 38, 38);
  fs(ctx, rad(ctx, 60, 60, 38, '#c8102e', 0.3), 3);
  // a black eight-rayed sun on the red field (our own emblem)
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? 11 : 30;
    if (i) ctx.lineTo(60 + Math.cos(a) * rr, 60 + Math.sin(a) * rr);
    else ctx.moveTo(60 + Math.cos(a) * rr, 60 + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#1a1210';
  ctx.fill();
  ellipse(ctx, 60, 60, 8, 8);
  ctx.fillStyle = '#c8102e';
  ctx.fill();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ellipse(ctx, 60 + Math.cos(a) * 51, 60 + Math.sin(a) * 51, 2.8, 2.8);
    ctx.fillStyle = '#f2d48a';
    ctx.fill();
  }
  sheen(ctx, 40, 36, 16, 7, 0.45);
});

// ——— Loki, peeking out from behind the title screen's chalkboard: a shadowy horned figure with a sly grin ———
const loki = pad(120, 150, (ctx) => {
  // the shadowy shoulders and cloak
  ctx.beginPath();
  ctx.moveTo(10, 150);
  ctx.quadraticCurveTo(14, 96, 60, 92);
  ctx.quadraticCurveTo(106, 96, 110, 150);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 90, 0, 150, [[0, '#24301e'], [1, '#0c100a']]), 3.4);
  // the head
  ellipse(ctx, 60, 66, 32, 36);
  fs(ctx, rad(ctx, 60, 66, 36, '#2e3a28', 0.25), 3.4);
  // the long curling horns of his helm
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(60 + s * 18, 40);
    ctx.bezierCurveTo(60 + s * 40, 10, 60 + s * 30, -2, 60 + s * 52, 4);
    ctx.bezierCurveTo(60 + s * 40, 10, 60 + s * 44, 28, 60 + s * 28, 48);
    ctx.closePath();
    fs(ctx, lin(ctx, 60, 0, 60 + s * 52, 48, [[0, '#e8c860'], [1, '#8a6a1a']]), 3);
  }
  // glowing green eyes and a sly grin
  ctx.save();
  ctx.shadowColor = '#7be04a';
  ctx.shadowBlur = 10;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(60 + s * 12, 62, 7, 3.2, s * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#b8ff8a';
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(44, 82);
  ctx.quadraticCurveTo(60, 94, 78, 78);
  ctx.strokeStyle = '#b8ff8a';
  ctx.lineWidth = 2.6;
  ctx.stroke();
});

export const props: Record<string, () => HTMLCanvasElement> = {
  g_loki: loki,
  t_hammer: hammer,
  g_crown: crown,
  g_trident: trident,
  g_wheat: wheat,
  g_owl: owl,
  g_chariot: chariot,
  g_horn: horn,
  g_heart: heart,
  g_anvil: anvil,
  g_wings: wings,
  g_flower: flower,
  g_raven: raven,
  g_spear: spear,
  g_falcon: falcon,
  g_boar: boar,
  g_apple: apple,
  g_aspis: aspis,
};
