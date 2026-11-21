// Props for the Stage 10–12 fights (src/game/bosses/act2b.ts): Milkshake Max's hot-water bowl and
// straw, the Lumberjack's chainsaw and axe, the Yeti's icicle and avalanche snowball, and the
// Zombie Loafer's cough cloud. Same style as src/art/eventArt.ts: thick ink outlines, gradients, a sheen.
import { type Ctx, ellipse, makeCanvas, rgba, roundRect, shade } from '../../art/util';

const INK = '#2a1810';

function stroke(ctx: Ctx, lw = 4, col = INK): void {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.stroke();
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

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55, rot = -0.5): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

/** A steaming bowl of hot water: hold the peel over it to melt a brain freeze. */
function hotBowl(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 230);
  // steam wisps
  ctx.lineCap = 'round';
  for (const [x, bend] of [[80, -1], [120, 1], [160, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, 108);
    ctx.bezierCurveTo(x + bend * 22, 84, x - bend * 22, 58, x + bend * 6, 20);
    stroke(ctx, 14, rgba('#ffffff', 0.35));
    stroke(ctx, 7, rgba('#ffffff', 0.85));
  }
  // bowl body
  ctx.beginPath();
  ctx.moveTo(18, 128);
  ctx.bezierCurveTo(22, 200, 70, 218, 120, 218);
  ctx.bezierCurveTo(170, 218, 218, 200, 222, 128);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 18, 0, 222, 0, [[0, '#b8432a'], [0.4, '#ff7a4a'], [0.55, '#ff9a6a'], [1, '#9a2f1c']]);
  ctx.fill();
  stroke(ctx, 6);
  // stripe
  ctx.save();
  ctx.clip();
  ctx.fillStyle = rgba('#fff2d8', 0.85);
  ctx.fillRect(0, 160, 240, 12);
  ctx.restore();
  // foot ring
  roundRect(ctx, 80, 210, 80, 14, 6);
  ctx.fillStyle = '#8a2a18';
  ctx.fill();
  stroke(ctx, 4);
  // rim and hot water
  ellipse(ctx, 120, 128, 104, 28);
  ctx.fillStyle = '#ffd2b0';
  ctx.fill();
  stroke(ctx, 6);
  ellipse(ctx, 120, 130, 88, 20);
  ctx.fillStyle = rad(ctx, 120, 134, 90, [[0, '#ffe08a'], [0.5, '#ffb24a'], [1, '#e06a2a']]);
  ctx.fill();
  stroke(ctx, 3, rgba(INK, 0.6));
  // bubbles
  for (const [x, y, r] of [[86, 128, 6], [140, 134, 5], [160, 124, 4], [108, 138, 4]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#ffffff', 0.7);
    ctx.fill();
  }
  shine(ctx, 54, 160, 12, 22, 0.45, 0.4);
  return c;
}

/** A huge bendy milkshake straw, pointing down (the bend is at the top). */
function straw(): HTMLCanvasElement {
  const w = 150;
  const [c, ctx] = makeCanvas(w + 80, 760);
  const x0 = 20;
  // body
  const body = () => roundRect(ctx, x0, 90, w, 660, 22);
  body();
  ctx.fillStyle = '#fff6f0';
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  // candy stripes
  ctx.fillStyle = '#ff4fa0';
  for (let y = 40; y < 800; y += 90) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + w, y - 50);
    ctx.lineTo(x0 + w, y - 10);
    ctx.lineTo(x0, y + 40);
    ctx.closePath();
    ctx.fill();
  }
  // round shading
  ctx.fillStyle = lin(ctx, x0, 0, x0 + w, 0, [[0, rgba('#000000', 0.28)], [0.35, rgba('#ffffff', 0.25)], [0.55, rgba('#ffffff', 0)], [1, rgba('#000000', 0.35)]]);
  ctx.fillRect(x0, 0, w, 760);
  // milkshake showing through near the bottom
  ctx.fillStyle = rgba('#ffc0dc', 0.55);
  ctx.fillRect(x0, 560, w, 200);
  ctx.restore();
  body();
  stroke(ctx, 7);
  // bendy ribs and the elbow at the top
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x0 + 4, 108 + i * 16);
    ctx.lineTo(x0 + w - 4, 108 + i * 16);
    stroke(ctx, 3, rgba(INK, 0.5));
  }
  ctx.beginPath();
  ctx.moveTo(x0, 100);
  ctx.quadraticCurveTo(x0, 20, x0 + w * 0.5 + 30, 14);
  ctx.lineTo(x0 + w + 50, 14);
  ctx.lineTo(x0 + w + 50, 76);
  ctx.quadraticCurveTo(x0 + w, 76, x0 + w, 100);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 14, 0, 100, [[0, '#ff7ab8'], [1, '#ff4fa0']]);
  ctx.fill();
  stroke(ctx, 7);
  // open mouth at the bottom
  ellipse(ctx, x0 + w / 2, 742, w / 2 - 6, 10);
  ctx.fillStyle = '#c23a7a';
  ctx.fill();
  stroke(ctx, 4);
  shine(ctx, x0 + 36, 300, 9, 120, 0.4, 0);
  return c;
}

/** A chainsaw, blade pointing down. */
function chainsaw(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(170, 330);
  // blade bar
  const bar = () => {
    ctx.beginPath();
    ctx.moveTo(52, 120);
    ctx.lineTo(118, 120);
    ctx.lineTo(118, 290);
    ctx.arc(85, 290, 33, 0, Math.PI);
    ctx.closePath();
  };
  bar();
  ctx.fillStyle = lin(ctx, 52, 0, 118, 0, [[0, '#6a7480'], [0.4, '#e8edf2'], [0.6, '#b8c2cc'], [1, '#5a6470']]);
  ctx.fill();
  stroke(ctx, 6);
  // chain teeth round the edge
  ctx.fillStyle = INK;
  for (let y = 128; y < 290; y += 16) {
    for (const [x, d] of [[52, -1], [118, 1]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + d * 10, y + 4);
      ctx.lineTo(x, y + 10);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (let k = 0.1; k < 1; k += 0.2) {
    const a = k * Math.PI;
    const x = 85 + Math.cos(a) * 33;
    const y = 290 + Math.sin(a) * 33;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(85, 140);
  ctx.lineTo(85, 300);
  stroke(ctx, 3, rgba(INK, 0.35));
  // engine body
  roundRect(ctx, 22, 30, 126, 104, 26);
  ctx.fillStyle = lin(ctx, 22, 0, 148, 0, [[0, '#c4500e'], [0.4, '#ff8a2a'], [0.6, '#ffa04a'], [1, '#a8400a']]);
  ctx.fill();
  stroke(ctx, 6);
  // vents
  for (let i = 0; i < 4; i++) {
    roundRect(ctx, 44 + i * 22, 66, 12, 40, 5);
    ctx.fillStyle = '#2a1810';
    ctx.fill();
  }
  // handle loop on top
  ctx.beginPath();
  ctx.moveTo(40, 36);
  ctx.bezierCurveTo(40, -6, 130, -6, 130, 36);
  stroke(ctx, 18);
  stroke(ctx, 10, '#3a3a44');
  shine(ctx, 50, 50, 16, 8, 0.55);
  return c;
}

/** A lumberjack's axe, head down. */
function axe(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 240);
  // handle
  roundRect(ctx, 64, 8, 22, 180, 10);
  ctx.fillStyle = lin(ctx, 64, 0, 86, 0, [[0, '#8a5a2a'], [0.5, '#d8a060'], [1, '#7a4a20']]);
  ctx.fill();
  stroke(ctx, 5);
  // grip wrap
  for (let y = 20; y < 70; y += 12) {
    ctx.beginPath();
    ctx.moveTo(64, y);
    ctx.lineTo(86, y + 6);
    stroke(ctx, 4, '#c62828');
  }
  // head
  ctx.beginPath();
  ctx.moveTo(50, 160);
  ctx.lineTo(100, 160);
  ctx.lineTo(104, 186);
  ctx.quadraticCurveTo(140, 200, 138, 232);
  ctx.quadraticCurveTo(76, 214, 12, 232);
  ctx.quadraticCurveTo(10, 200, 46, 186);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 160, 0, 232, [[0, '#5a6470'], [0.5, '#c8d0d8'], [0.8, '#f4f8fc'], [1, '#8a949e']]);
  ctx.fill();
  stroke(ctx, 6);
  ctx.beginPath();
  ctx.moveTo(18, 226);
  ctx.quadraticCurveTo(76, 210, 132, 226);
  stroke(ctx, 3, rgba('#ffffff', 0.9));
  return c;
}

/** An icicle, point down. */
function icicle(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(110, 230);
  ctx.beginPath();
  ctx.moveTo(10, 14);
  ctx.quadraticCurveTo(55, 2, 100, 14);
  ctx.lineTo(86, 60);
  ctx.lineTo(74, 110);
  ctx.lineTo(56, 222);
  ctx.lineTo(40, 120);
  ctx.lineTo(26, 70);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 10, 0, 100, 0, [[0, '#7ab8e8'], [0.35, '#e8f6ff'], [0.55, '#ffffff'], [1, '#6aa8d8']]);
  ctx.fill();
  stroke(ctx, 5, '#1e3a5a');
  ctx.beginPath();
  ctx.moveTo(42, 30);
  ctx.lineTo(52, 160);
  stroke(ctx, 5, rgba('#ffffff', 0.85));
  // frosty cap
  ctx.beginPath();
  ctx.moveTo(4, 16);
  ctx.quadraticCurveTo(55, -6, 106, 16);
  ctx.quadraticCurveTo(80, 30, 55, 22);
  ctx.quadraticCurveTo(30, 30, 4, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  stroke(ctx, 4, '#1e3a5a');
  return c;
}

/** A big rolling avalanche snowball, packed with ice chunks. */
function bigSnowball(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 220);
  ctx.beginPath();
  ctx.arc(110, 110, 96, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 110, 110, 104, [[0, '#ffffff'], [0.7, '#dcecff'], [1, '#8ab0d8']]);
  ctx.fill();
  stroke(ctx, 7);
  // lumps and ice chunks
  for (const [x, y, r] of [[70, 140, 14], [150, 80, 12], [130, 160, 10], [60, 80, 8], [160, 130, 9]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0.2, Math.PI * 1.3);
    stroke(ctx, 3.5, rgba('#5a7aa8', 0.6));
  }
  for (const [x, y] of [[100, 60], [140, 120], [80, 110]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 9, y);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x - 9, y);
    ctx.closePath();
    ctx.fillStyle = '#a8dcff';
    ctx.fill();
    stroke(ctx, 2.5, '#1e3a5a');
  }
  shine(ctx, 80, 66, 26, 14, 0.8);
  return c;
}

/** A sickly green cough cloud. */
function coughCloud(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 200);
  const puffs: [number, number, number][] = [[80, 120, 56], [150, 90, 70], [220, 118, 54], [120, 140, 50], [190, 146, 46]];
  ctx.beginPath();
  for (const [x, y, r] of puffs) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.save();
  ctx.lineWidth = 12;
  ctx.strokeStyle = rgba('#2a3a10', 0.85);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = rad(ctx, 150, 110, 140, [[0, '#d8ff9a'], [0.5, '#9adf4a'], [1, '#5a9a2a']]);
  ctx.fill();
  // germ specks
  for (const [x, y] of [[110, 100], [170, 80], [200, 130], [140, 150], [90, 140]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = shade('#5a9a2a', -0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#ffffff', 0.7);
    ctx.fill();
  }
  shine(ctx, 120, 64, 30, 12, 0.5);
  return c;
}

/** A drop of milkshake sucked up the straw. */
function slurpDrop(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(44, 56);
  ctx.beginPath();
  ctx.moveTo(22, 4);
  ctx.quadraticCurveTo(40, 30, 38, 38);
  ctx.arc(22, 38, 16, 0, Math.PI);
  ctx.quadraticCurveTo(4, 30, 22, 4);
  ctx.fillStyle = rad(ctx, 22, 36, 20, [[0, '#ffe0ee'], [1, '#ff7ab8']]);
  ctx.fill();
  stroke(ctx, 3.5);
  shine(ctx, 16, 34, 4, 6, 0.8, 0);
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_hotbowl: hotBowl,
  p_straw: straw,
  p_chainsaw: chainsaw,
  p_axe: axe,
  p_icicle: icicle,
  p_bigsnow: bigSnowball,
  p_cough: coughCloud,
  p_slurp: slurpDrop,
};
