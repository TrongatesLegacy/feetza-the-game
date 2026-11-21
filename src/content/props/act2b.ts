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

/** The straw's tube on its canvas: STRAW.w wide, centred, running off the top (it comes out of the boss). */
export const STRAW = { cw: 200, ch: 800, x0: 35, w: 130, mouth: 772 } as const;

/** A huge bendy milkshake straw pointing down: a ribbed bend near the top, candy stripes, an open mouth. */
function straw(): HTMLCanvasElement {
  const { cw, ch, x0, w, mouth } = STRAW;
  const [c, ctx] = makeCanvas(cw, ch);
  const body = () => roundRect(ctx, x0, -40, w, mouth + 40, 26);
  body();
  ctx.fillStyle = '#fff6f0';
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  // candy stripes, slanting down to the right
  ctx.fillStyle = '#ff4fa0';
  for (let y = -60; y < ch + 60; y += 96) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + w, y + 46);
    ctx.lineTo(x0 + w, y + 86);
    ctx.lineTo(x0, y + 40);
    ctx.closePath();
    ctx.fill();
  }
  // the bendy section: accordion ribs, darker in the grooves
  for (let i = 0; i < 7; i++) {
    const y = 34 + i * 15;
    ctx.fillStyle = rgba(INK, 0.22);
    ctx.fillRect(x0, y + 9, w, 5);
    ctx.fillStyle = rgba('#ffffff', 0.45);
    ctx.fillRect(x0, y + 2, w, 4);
  }
  // round shading
  ctx.fillStyle = lin(ctx, x0, 0, x0 + w, 0, [[0, rgba('#000000', 0.32)], [0.3, rgba('#ffffff', 0.3)], [0.5, rgba('#ffffff', 0)], [1, rgba('#000000', 0.4)]]);
  ctx.fillRect(x0, -40, w, ch + 40);
  ctx.restore();
  body();
  stroke(ctx, 7);
  // rib outlines bulge past the tube a little
  for (let i = 0; i < 7; i++) {
    ellipse(ctx, x0 + w / 2, 45 + i * 15, w / 2 + 4, 4);
    stroke(ctx, 3, rgba(INK, 0.55));
  }
  // open mouth at the bottom, milkshake inside
  ellipse(ctx, x0 + w / 2, mouth, w / 2 - 4, 13);
  ctx.fillStyle = '#d23a84';
  ctx.fill();
  stroke(ctx, 5);
  ellipse(ctx, x0 + w / 2, mouth + 2, w / 2 - 18, 7);
  ctx.fillStyle = '#ff9ac8';
  ctx.fill();
  shine(ctx, x0 + 30, 420, 9, 200, 0.45, 0);
  return c;
}

/** The milkshake rising inside the straw (cropped from the bottom up as it slurps). */
function strawFill(): HTMLCanvasElement {
  const { cw, ch, x0, w, mouth } = STRAW;
  const [c, ctx] = makeCanvas(cw, ch);
  const inner = () => roundRect(ctx, x0 + 9, 0, w - 18, mouth - 6, 18);
  inner();
  ctx.fillStyle = lin(ctx, x0, 0, x0 + w, 0, [[0, '#e0408a'], [0.35, '#ffa0cc'], [0.6, '#ff7ab8'], [1, '#c0306e']]);
  ctx.fill();
  ctx.save();
  inner();
  ctx.clip();
  // bubbles in the shake
  for (let y = 30; y < mouth; y += 46) {
    for (const [dx, r] of [[-30, 7], [18, 5], [36, 4]] as const) {
      ctx.beginPath();
      ctx.arc(x0 + w / 2 + dx + ((y * 7) % 13) - 6, y + ((y * 3) % 17), r, 0, Math.PI * 2);
      ctx.fillStyle = rgba('#ffffff', 0.55);
      ctx.fill();
    }
  }
  ctx.restore();
  shine(ctx, x0 + 34, 400, 7, 220, 0.4, 0);
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
  const [c, ctx] = makeCanvas(200, 300);
  // handle: a thick, slightly curved hickory haft with a knob at the end
  ctx.beginPath();
  ctx.moveTo(84, 14);
  ctx.bezierCurveTo(78, 80, 90, 150, 86, 214);
  ctx.lineTo(118, 214);
  ctx.bezierCurveTo(122, 150, 110, 80, 116, 14);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 80, 0, 120, 0, [[0, '#8a5420'], [0.35, '#e8b070'], [0.6, '#c88a48'], [1, '#6a3c14']]);
  ctx.fill();
  stroke(ctx, 6);
  // wood grain
  ctx.beginPath();
  ctx.moveTo(98, 30);
  ctx.bezierCurveTo(94, 90, 104, 150, 100, 200);
  stroke(ctx, 2.5, rgba('#6a3c14', 0.6));
  ellipse(ctx, 100, 16, 24, 12);
  ctx.fillStyle = '#b87838';
  ctx.fill();
  stroke(ctx, 5);
  // red grip wrap
  for (let y = 34; y < 96; y += 14) {
    roundRect(ctx, 80, y, 40, 9, 4);
    ctx.fillStyle = lin(ctx, 80, 0, 120, 0, [[0, '#a01818'], [0.4, '#ff5a4a'], [1, '#8a1010']]);
    ctx.fill();
    stroke(ctx, 3);
  }
  // steel head: a fat wedge with a red-painted cheek and a bright honed edge
  const head = () => {
    ctx.beginPath();
    ctx.moveTo(62, 186);
    ctx.lineTo(138, 186);
    ctx.lineTo(146, 222);
    ctx.quadraticCurveTo(186, 238, 190, 288);
    ctx.quadraticCurveTo(100, 262, 10, 288);
    ctx.quadraticCurveTo(14, 238, 54, 222);
    ctx.closePath();
  };
  head();
  ctx.fillStyle = lin(ctx, 0, 186, 0, 288, [[0, '#4a525c'], [0.45, '#9aa4ae'], [0.75, '#e8eef4'], [1, '#aab4be']]);
  ctx.fill();
  ctx.save();
  head();
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, 186, 0, 230, [[0, '#a01818'], [1, '#e03a2a']]);
  ctx.fillRect(0, 186, 200, 42);
  ctx.restore();
  head();
  stroke(ctx, 7);
  // the eye the haft goes through
  roundRect(ctx, 84, 192, 32, 22, 6);
  ctx.fillStyle = '#6a3c14';
  ctx.fill();
  stroke(ctx, 4);
  // honed edge
  ctx.beginPath();
  ctx.moveTo(22, 278);
  ctx.quadraticCurveTo(100, 254, 178, 278);
  stroke(ctx, 5, rgba('#ffffff', 0.95));
  shine(ctx, 50, 246, 14, 6, 0.7, -0.3);
  return c;
}

/** An icicle, point down. */
function icicle(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 270);
  // a big central spike with two short ones on its shoulders
  const spike = (pts: [number, number][]) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
  };
  for (const [x, len] of [[30, 96], [110, 84]] as const) {
    spike([[x - 20, 26], [x + 20, 26], [x + 6, 26 + len * 0.6], [x, 26 + len]]);
    ctx.fillStyle = lin(ctx, x - 20, 0, x + 20, 0, [[0, '#3a86c8'], [0.45, '#d8f0ff'], [1, '#2a6aa8']]);
    ctx.fill();
    stroke(ctx, 5, '#12304e');
  }
  const main = () => spike([[34, 22], [106, 22], [94, 80], [82, 150], [70, 262], [58, 150], [46, 80]]);
  main();
  ctx.fillStyle = lin(ctx, 34, 0, 106, 0, [[0, '#2f7cc0'], [0.3, '#bfe6ff'], [0.5, '#ffffff'], [0.7, '#9ad2f8'], [1, '#2464a0']]);
  ctx.fill();
  // facets
  ctx.save();
  main();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(70, 22);
  ctx.lineTo(70, 262);
  ctx.moveTo(46, 80);
  ctx.lineTo(70, 120);
  ctx.lineTo(94, 80);
  stroke(ctx, 3, rgba('#12304e', 0.35));
  ctx.restore();
  main();
  stroke(ctx, 6, '#12304e');
  ctx.beginPath();
  ctx.moveTo(56, 36);
  ctx.lineTo(64, 180);
  stroke(ctx, 6, rgba('#ffffff', 0.9));
  // frosty snow cap
  ctx.beginPath();
  ctx.moveTo(4, 28);
  ctx.quadraticCurveTo(12, 4, 40, 8);
  ctx.quadraticCurveTo(70, -2, 100, 8);
  ctx.quadraticCurveTo(130, 4, 136, 28);
  ctx.quadraticCurveTo(110, 40, 90, 32);
  ctx.quadraticCurveTo(70, 42, 50, 32);
  ctx.quadraticCurveTo(28, 40, 4, 28);
  ctx.fillStyle = lin(ctx, 0, 0, 0, 40, [[0, '#ffffff'], [1, '#d4e8fa']]);
  ctx.fill();
  stroke(ctx, 5, '#12304e');
  return c;
}

/** A big rolling avalanche snowball, packed with ice chunks and twigs. */
function bigSnowball(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 240);
  // twigs poking out (behind the ball)
  for (const [x0, y0, x1, y1] of [[40, 70, 4, 40], [196, 170, 232, 196], [170, 40, 196, 8]] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    stroke(ctx, 11);
    stroke(ctx, 6, '#8a5a2a');
  }
  // a lumpy outline
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = 102 + Math.sin(a * 7) * 4 + Math.sin(a * 3 + 1) * 3;
    const x = 120 + Math.cos(a) * r;
    const y = 120 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = rad(ctx, 120, 120, 112, [[0, '#ffffff'], [0.55, '#e4f0ff'], [0.85, '#a8c4e4'], [1, '#6e94c0']]);
  ctx.fill();
  stroke(ctx, 7);
  // packed-snow seams
  for (const [x, y, r, a0] of [[78, 160, 22, 0.1], [168, 86, 18, 2.2], [146, 172, 14, 3.6], [64, 92, 12, 4.6], [176, 140, 12, 0.8]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a0 + Math.PI * 1.1);
    stroke(ctx, 4, rgba('#3e5f8e', 0.65));
  }
  // ice chunks
  for (const [x, y, s] of [[112, 64, 13], [150, 128, 11], [86, 122, 12], [122, 180, 9]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y - 2);
    ctx.lineTo(x + 3, y + s);
    ctx.lineTo(x - s, y + 2);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, x - s, y - s, x + s, y + s, [[0, '#e8f8ff'], [1, '#5aaee8']]);
    ctx.fill();
    stroke(ctx, 3, '#12304e');
  }
  shine(ctx, 84, 70, 30, 15, 0.85);
  return c;
}

/** The Yeti's thrown snowball: a smaller version of the avalanche ball. */
function yetiBall(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(130, 130);
  ctx.beginPath();
  ctx.arc(65, 65, 54, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 65, 65, 58, [[0, '#ffffff'], [0.6, '#e0eeff'], [1, '#7a9ec8']]);
  ctx.fill();
  stroke(ctx, 6);
  for (const [x, y, r, a0] of [[46, 82, 12, 0.2], [86, 50, 10, 2.4], [84, 92, 8, 3.8]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a0 + Math.PI);
    stroke(ctx, 3, rgba('#3e5f8e', 0.6));
  }
  shine(ctx, 46, 42, 16, 9, 0.85);
  return c;
}

/** The Rink Queen's hockey puck: a black rubber disc with her pink crown on top. */
function puck(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(160, 120);
  // side band
  roundRect(ctx, 10, 38, 140, 50, 22);
  ctx.fillStyle = lin(ctx, 10, 0, 150, 0, [[0, '#101014'], [0.4, '#4a4a58'], [0.6, '#2a2a34'], [1, '#08080c']]);
  ctx.fill();
  stroke(ctx, 6, '#000000');
  // grip ridges round the side
  for (let x = 24; x < 140; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 66);
    ctx.lineTo(x, 84);
    stroke(ctx, 3, rgba('#ffffff', 0.18));
  }
  // top face
  ellipse(ctx, 80, 42, 70, 26);
  ctx.fillStyle = rad(ctx, 80, 42, 76, [[0, '#5a5a6a'], [0.6, '#2a2a34'], [1, '#14141a']]);
  ctx.fill();
  stroke(ctx, 6, '#000000');
  // her crown, in neon pink
  ctx.beginPath();
  ctx.moveTo(56, 52);
  ctx.lineTo(52, 30);
  ctx.lineTo(66, 40);
  ctx.lineTo(80, 24);
  ctx.lineTo(94, 40);
  ctx.lineTo(108, 30);
  ctx.lineTo(104, 52);
  ctx.closePath();
  ctx.fillStyle = '#ff4fd8';
  ctx.fill();
  stroke(ctx, 3, '#ffd0f4');
  // a bright rim so it reads on the dark rink
  ellipse(ctx, 80, 42, 70, 26);
  stroke(ctx, 2.5, rgba('#b8b8d0', 0.9));
  shine(ctx, 50, 34, 16, 6, 0.4, -0.2);
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
  p_strawfill: strawFill,
  p_yetiball: yetiBall,
  p_puck: puck,
  p_chainsaw: chainsaw,
  p_axe: axe,
  p_icicle: icicle,
  p_bigsnow: bigSnowball,
  p_cough: coughCloud,
  p_slurp: slurpDrop,
};
