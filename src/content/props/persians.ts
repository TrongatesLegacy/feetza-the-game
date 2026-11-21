// Persian army props (src/game/acts/persians.ts): the archers' arrow and bow, the chariot's scythed wheel and the
// Satrap's armour pip. Same style as the other props: thick dark-brown outlines, soft gradients lit from the top
// left and a sheen.
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

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function poly(ctx: Ctx, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

// ——— the arrow (nose to the right): a reed shaft, a bronze leaf head, red and cream fletching ———
const arrow = pad(110, 34, (ctx) => {
  roundRect(ctx, 20, 14.5, 66, 5, 2);
  ctx.fillStyle = lin(ctx, 0, 14, 0, 20, [[0, '#e0b070'], [1, '#8a5a2a']]);
  ctx.fill();
  ink(ctx, 2.4);
  poly(ctx, [[106, 17], [88, 6], [80, 17], [88, 28]]);
  ctx.fillStyle = lin(ctx, 80, 6, 80, 28, [[0, '#f2c27a'], [0.5, '#c9873a'], [1, '#7a4a1a']]);
  ctx.fill();
  ink(ctx, 2.6);
  for (const [dy, c] of [[-1, '#e8402f'], [1, '#f4efe8']] as [number, string][]) {
    poly(ctx, [[34, 17], [14, 17 + dy * 13], [4, 17 + dy * 13], [18, 17]]);
    ctx.fillStyle = c;
    ctx.fill();
    ink(ctx, 2.4);
  }
  ellipse(ctx, 92, 13, 4, 1.6, -0.5);
  ctx.fillStyle = rgba('#ffffff', 0.7);
  ctx.fill();
});

// ——— the composite bow, string on the left: horn-tipped limbs curling back at the ends ———
const bow = pad(60, 150, (ctx) => {
  const limb = () => {
    ctx.beginPath();
    ctx.moveTo(18, 8);
    ctx.bezierCurveTo(34, 6, 30, 30, 40, 50);
    ctx.bezierCurveTo(50, 66, 48, 84, 40, 100);
    ctx.bezierCurveTo(30, 120, 34, 144, 18, 142);
  };
  ctx.beginPath();
  ctx.moveTo(18, 10);
  ctx.lineTo(10, 75);
  ctx.lineTo(18, 140);
  ink(ctx, 2, '#f4efe8');
  limb();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.stroke();
  limb();
  ctx.strokeStyle = lin(ctx, 0, 0, 60, 0, [[0, '#5a3a1e'], [0.5, '#a8743e'], [1, '#4a2a14']]);
  ctx.lineWidth = 6;
  ctx.stroke();
  // the leather grip and gold bands
  roundRect(ctx, 40, 64, 12, 22, 4);
  ctx.fillStyle = '#7a2a1e';
  ctx.fill();
  ink(ctx, 2.4);
  for (const y of [62, 86]) {
    roundRect(ctx, 39, y - 2, 14, 4, 2);
    ctx.fillStyle = '#e8b43a';
    ctx.fill();
  }
});

// ——— the chariot's war wheel: eight spokes, a bronze-shod rim, a gold hub with a scythe blade. 160 units square,
// the rim at radius 62 round (80, 80). The Chariot Wheel's foot art paints the same wheel (its peel shows it), and in
// play this prop sits exactly over it and spins. ———
export function paintWheel(ctx: Ctx): void {
  const c = 80;
  // the scythe blade sticking out of the hub (drawn first, under the rim)
  ctx.beginPath();
  ctx.moveTo(c + 6, c - 8);
  ctx.bezierCurveTo(c + 50, c - 30, c + 74, c - 10, c + 78, c + 18);
  ctx.bezierCurveTo(c + 60, c + 2, c + 40, c - 2, c + 6, c + 8);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, c, c - 30, c, c + 18, [[0, '#f4f6fa'], [0.6, '#a8b0bc'], [1, '#5a6270']]);
  ctx.fill();
  ink(ctx, 2.6);
  // the rim: wood with a bronze tyre
  ctx.beginPath();
  ctx.arc(c, c, 62, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 20;
  ctx.stroke();
  ctx.strokeStyle = lin(ctx, 20, 20, 140, 140, [[0, '#f2c27a'], [0.45, '#c9873a'], [1, '#6a3a14']]);
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, 52, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = '#8a5a2e';
  ctx.lineWidth = 5;
  ctx.stroke();
  // studs on the tyre
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ellipse(ctx, c + Math.cos(a) * 62, c + Math.sin(a) * 62, 2.6, 2.6);
    ctx.fillStyle = '#fff2c0';
    ctx.fill();
  }
  // spokes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 14, c + Math.sin(a) * 14);
    ctx.lineTo(c + Math.cos(a) * 50, c + Math.sin(a) * 50);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#b07a44';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  // the hub: the gold boss the player aims for
  ellipse(ctx, c, c, 19, 19);
  const g = ctx.createRadialGradient(c - 6, c - 7, 2, c, c, 19);
  g.addColorStop(0, '#fff2a8');
  g.addColorStop(0.5, '#f0c040');
  g.addColorStop(1, '#9a6a14');
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 3.4);
  ellipse(ctx, c, c, 7, 7);
  ctx.fillStyle = shade('#9a6a14', -0.2);
  ctx.fill();
  ink(ctx, 2);
  ellipse(ctx, c - 7, c - 8, 5, 3, -0.6);
  ctx.fillStyle = rgba('#ffffff', 0.7);
  ctx.fill();
}
const wheel = pad(160, 160, paintWheel);

// ——— the Satrap's armour pip: a little gold shield with a crimson boss ———
const crest = pad(40, 46, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(20, 3);
  ctx.bezierCurveTo(30, 7, 36, 7, 37, 8);
  ctx.bezierCurveTo(37, 28, 30, 38, 20, 43);
  ctx.bezierCurveTo(10, 38, 3, 28, 3, 8);
  ctx.bezierCurveTo(4, 7, 10, 7, 20, 3);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 3, 3, 37, 43, [[0, '#fff2a8'], [0.45, '#f0c040'], [1, '#9a6a14']]);
  ctx.fill();
  ink(ctx, 3);
  ellipse(ctx, 20, 21, 7, 7);
  ctx.fillStyle = '#c8102e';
  ctx.fill();
  ink(ctx, 2);
  ellipse(ctx, 12, 13, 4, 2.5, -0.6);
  ctx.fillStyle = rgba('#ffffff', 0.75);
  ctx.fill();
});

export const props: Record<string, () => HTMLCanvasElement> = {
  pa_arrow: arrow,
  pa_bow: bow,
  pa_wheel: wheel,
  pa_crest: crest,
};
