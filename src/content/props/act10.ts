// Props for the Act 10 · Finale fights (src/game/bosses/act10.ts): the Mirror Peel's dark echo peel, the
// Sole Proprietor's contract, SOLD stamp and pocket watch, the Ghost of Feet Future's footprint, and the
// Unbound's gauntlet, frost crystal, flame, mirror shield, black hole, comic burst and the golden peel of
// the Last Slice. Same style as src/art/eventArt.ts: thick ink outlines, gradients, a sheen.
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

function softGlow(ctx: Ctx, x: number, y: number, r: number, col: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A peel head pointing down with its handle up (the echo peels and the golden peel). */
function peelShape(ctx: Ctx, cx: number, top: number, w: number, h: number): void {
  const hw = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 14, top);
  ctx.lineTo(cx + 14, top);
  ctx.lineTo(cx + 14, top + h * 0.34);
  ctx.bezierCurveTo(cx + hw * 0.6, top + h * 0.38, cx + hw, top + h * 0.5, cx + hw, top + h * 0.7);
  ctx.bezierCurveTo(cx + hw, top + h * 0.9, cx + hw * 0.5, top + h, cx, top + h);
  ctx.bezierCurveTo(cx - hw * 0.5, top + h, cx - hw, top + h * 0.9, cx - hw, top + h * 0.7);
  ctx.bezierCurveTo(cx - hw, top + h * 0.5, cx - hw * 0.6, top + h * 0.38, cx - 14, top + h * 0.34);
  ctx.closePath();
}

/** The Mirror Peel's copy of your smack: a dark glass peel falling onto a pizza. */
function echoPeel(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 280);
  softGlow(ctx, 100, 190, 100, '#b06bff', 0.55);
  peelShape(ctx, 100, 8, 168, 262);
  ctx.fillStyle = lin(ctx, 20, 80, 180, 270, [[0, '#4a3a70'], [0.4, '#17122a'], [1, '#08060c']]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = rgba('#ffffff', 0.25);
  ctx.beginPath();
  ctx.moveTo(10, 190);
  ctx.lineTo(80, 110);
  ctx.lineTo(104, 110);
  ctx.lineTo(24, 214);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba('#e0c8ff', 0.6);
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(140, 230);
    ctx.lineTo(140 + Math.cos(i * 1.1) * 50, 230 + Math.sin(i * 1.1) * 40);
    ctx.stroke();
  }
  ctx.lineWidth = 12;
  ctx.strokeStyle = rgba('#b06bff', 0.45);
  peelShape(ctx, 100, 8, 168, 262);
  ctx.stroke();
  ctx.restore();
  peelShape(ctx, 100, 8, 168, 262);
  stroke(ctx, 6, '#08060c');
  return c;
}

/** The Sole Proprietor's contract: a long gold-edged scroll with a wax seal. */
function contract(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 360);
  roundRect(ctx, 40, 30, 220, 300, 10);
  ctx.fillStyle = lin(ctx, 40, 0, 260, 0, [[0, '#e8d8b0'], [0.5, '#fff6dc'], [1, '#d8c498']]);
  ctx.fill();
  stroke(ctx, 6);
  ctx.strokeStyle = rgba('#b07a10', 0.8);
  ctx.lineWidth = 4;
  ctx.strokeRect(56, 46, 188, 268);
  ctx.fillStyle = '#3a2a1a';
  ctx.font = 'bold 26px "Rockwell", "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('DEED OF SALE', 150, 88);
  ctx.fillStyle = rgba('#3a2a1a', 0.55);
  for (let i = 0; i < 9; i++) ctx.fillRect(74, 110 + i * 18, 152 - (i % 3) * 22, 5);
  // the signature line, already signed with a flourish
  ctx.beginPath();
  ctx.moveTo(80, 280);
  ctx.bezierCurveTo(110, 250, 130, 300, 160, 268);
  ctx.bezierCurveTo(180, 250, 200, 290, 224, 270);
  stroke(ctx, 3, '#2a1a4a');
  // rolled ends
  for (const y of [30, 330]) {
    roundRect(ctx, 28, y - 14, 244, 28, 14);
    ctx.fillStyle = lin(ctx, 0, y - 14, 0, y + 14, [[0, '#fff4b0'], [0.5, '#ffd23f'], [1, '#8a5a10']]);
    ctx.fill();
    stroke(ctx, 5);
  }
  // wax seal with a slice
  ellipse(ctx, 220, 230, 30, 30);
  ctx.fillStyle = rad(ctx, 220, 230, 30, [[0, '#ff6a7a'], [1, '#8a1020']]);
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(208, 220);
  ctx.lineTo(232, 220);
  ctx.lineTo(220, 244);
  ctx.closePath();
  ctx.fillStyle = rgba('#ffd0d8', 0.8);
  ctx.fill();
  return c;
}

/** A huge rubber SOLD stamp mark (stamped across the shop). */
function soldStamp(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(520, 240);
  ctx.translate(260, 120);
  ctx.rotate(-0.12);
  roundRect(ctx, -240, -96, 480, 192, 26);
  ctx.lineWidth = 22;
  ctx.strokeStyle = '#e5242f';
  ctx.stroke();
  roundRect(ctx, -214, -72, 428, 144, 16);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = '#e5242f';
  ctx.font = '150px "Lilita One", "Impact", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SOLD', 0, 8);
  // ink wear: the stamp isn't quite even
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = rgba('#000000', 0.2 + ((i * 37) % 10) / 20);
    ctx.fillRect(-240 + ((i * 97) % 480), -96 + ((i * 53) % 192), 3 + (i % 5), 2 + (i % 3));
  }
  return c;
}

/** The Sole Proprietor's gold pocket watch (the 60 s timer; the hands are drawn live). */
function pocketWatch(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 300);
  // crown and ring
  ellipse(ctx, 130, 28, 22, 20);
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#ffd23f';
  ctx.stroke();
  stroke(ctx, 3);
  roundRect(ctx, 114, 40, 32, 26, 6);
  ctx.fillStyle = lin(ctx, 114, 0, 146, 0, [[0, '#8a5a10'], [0.5, '#fff4b0'], [1, '#8a5a10']]);
  ctx.fill();
  stroke(ctx, 4);
  ellipse(ctx, 130, 176, 116, 116);
  ctx.fillStyle = lin(ctx, 14, 60, 246, 292, [[0, '#fff4b0'], [0.35, '#ffd23f'], [1, '#7a4a08']]);
  ctx.fill();
  stroke(ctx, 6);
  ellipse(ctx, 130, 176, 96, 96);
  ctx.fillStyle = rad(ctx, 130, 176, 96, [[0, '#fffaf0'], [1, '#e8dcc0']]);
  ctx.fill();
  stroke(ctx, 4);
  ctx.fillStyle = INK;
  ctx.font = 'bold 22px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    if (i % 3 === 0) ctx.fillText(['XII', 'III', 'VI', 'IX'][i / 3], 130 + Math.cos(a) * 74, 176 + Math.sin(a) * 74);
    else {
      ctx.beginPath();
      ctx.arc(130 + Math.cos(a) * 78, 176 + Math.sin(a) * 78, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  shine(ctx, 86, 120, 30, 14, 0.5, -0.6);
  return c;
}

/** A pale glowing footprint: where the Ghost of Feet Future will stomp. */
function futurePrint(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 260);
  softGlow(ctx, 110, 140, 110, '#bfe6ff', 0.6);
  const fill = rgba('#ffffff', 0.85);
  ctx.beginPath();
  ctx.moveTo(70, 70);
  ctx.bezierCurveTo(46, 120, 50, 200, 96, 236);
  ctx.bezierCurveTo(130, 256, 166, 230, 160, 180);
  ctx.bezierCurveTo(156, 130, 170, 90, 146, 66);
  ctx.bezierCurveTo(124, 46, 86, 48, 70, 70);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  stroke(ctx, 6, '#5aa8d8');
  for (const [x, y, r] of [[66, 44, 14], [92, 30, 15], [120, 26, 16], [146, 34, 15], [168, 52, 13]] as const) {
    ellipse(ctx, x, y, r * 0.85, r);
    ctx.fillStyle = fill;
    ctx.fill();
    stroke(ctx, 5, '#5aa8d8');
  }
  return c;
}

/** The Unbound's comic gauntlet: a huge armoured fist, knuckles down. */
function gauntlet(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 320);
  // the cuff
  roundRect(ctx, 70, 10, 160, 110, 22);
  ctx.fillStyle = lin(ctx, 70, 0, 230, 0, [[0, '#3a2058'], [0.45, '#8a5ad8'], [0.6, '#b08af0'], [1, '#2a1640']]);
  ctx.fill();
  stroke(ctx, 7);
  for (let i = 0; i < 4; i++) {
    ellipse(ctx, 96 + i * 36, 60, 9, 9);
    ctx.fillStyle = rad(ctx, 96 + i * 36, 60, 9, [[0, '#fff4b0'], [1, '#b07a10']]);
    ctx.fill();
    stroke(ctx, 3);
  }
  // the fist
  roundRect(ctx, 40, 100, 220, 170, 50);
  ctx.fillStyle = lin(ctx, 40, 100, 260, 270, [[0, '#ffe28a'], [0.4, '#ffd23f'], [1, '#8a5a10']]);
  ctx.fill();
  stroke(ctx, 7);
  // fingers curled under (knuckles at the bottom)
  for (let i = 0; i < 4; i++) {
    const x = 70 + i * 52;
    roundRect(ctx, x - 26, 220, 52, 78, 24);
    ctx.fillStyle = lin(ctx, x - 26, 220, x + 26, 298, [[0, '#fff0b0'], [0.5, '#ffd23f'], [1, '#9a6a10']]);
    ctx.fill();
    stroke(ctx, 6);
    shine(ctx, x - 8, 240, 10, 6, 0.6, -0.4);
  }
  // the thumb across the front
  ctx.beginPath();
  ctx.moveTo(60, 170);
  ctx.bezierCurveTo(120, 150, 190, 170, 200, 210);
  ctx.bezierCurveTo(170, 226, 100, 220, 60, 206);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 60, 150, 200, 226, [[0, '#fff4b0'], [1, '#c8941a']]);
  ctx.fill();
  stroke(ctx, 6);
  shine(ctx, 100, 140, 40, 14, 0.5, -0.3);
  return c;
}

/** A shard of magic ice frozen over a pizza (the Norse frost). */
function frostCrystal(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 260);
  softGlow(ctx, 120, 150, 120, '#9ad8ff', 0.5);
  const spikes: [number, number, number, number][] = [[120, 20, 30, 230], [70, 70, 24, 230], [170, 60, 26, 230], [36, 130, 20, 232], [204, 120, 20, 232]];
  for (const [x, top, w, bot] of spikes) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, bot - 60);
    ctx.lineTo(x + w * 0.6, bot);
    ctx.lineTo(x - w * 0.6, bot);
    ctx.lineTo(x - w, bot - 60);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, x - w, top, x + w, bot, [[0, '#ffffff'], [0.35, '#bfeaff'], [1, '#3a8ad8']]);
    ctx.fill();
    stroke(ctx, 5, '#1a3a6a');
    ctx.beginPath();
    ctx.moveTo(x, top + 10);
    ctx.lineTo(x - w * 0.4, bot - 70);
    ctx.lineWidth = 4;
    ctx.strokeStyle = rgba('#ffffff', 0.8);
    ctx.stroke();
  }
  return c;
}

/** Surtr-style fire burning on a pizza: smack it out. */
function pizzaFlame(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 260);
  softGlow(ctx, 110, 180, 110, '#ff7a2a', 0.55);
  const layers: [number, string][] = [[1, '#e5242f'], [0.75, '#ff7a2a'], [0.5, '#ffd23f'], [0.25, '#fff6c0']];
  for (const [k, col] of layers) {
    ctx.beginPath();
    ctx.moveTo(110 - 90 * k, 240);
    ctx.bezierCurveTo(110 - 100 * k, 160, 110 - 50 * k, 140, 110 - 30 * k, 60 + (1 - k) * 80);
    ctx.bezierCurveTo(110 - 10 * k, 110, 110 + 10 * k, 90, 110 + 6 * k, 20 + (1 - k) * 110);
    ctx.bezierCurveTo(110 + 50 * k, 90, 110 + 100 * k, 150, 110 + 90 * k, 240);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    if (k === 1) stroke(ctx, 6, '#6a1008');
  }
  return c;
}

/** A polished bronze shield: smack it to throw the gaze back. */
function mirrorShield(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 260);
  ellipse(ctx, 130, 130, 120, 120);
  ctx.fillStyle = lin(ctx, 10, 10, 250, 250, [[0, '#fff0c8'], [0.3, '#d8a050'], [1, '#6a3a10']]);
  ctx.fill();
  stroke(ctx, 7);
  ellipse(ctx, 130, 130, 92, 92);
  ctx.fillStyle = rad(ctx, 130, 130, 92, [[0, '#ffffff'], [0.4, '#e8f4ff'], [1, '#8aa8c8']]);
  ctx.fill();
  stroke(ctx, 4);
  // the meander border
  ctx.strokeStyle = rgba('#5a3008', 0.8);
  ctx.lineWidth = 4;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(130 + Math.cos(a) * 100, 130 + Math.sin(a) * 100);
    ctx.lineTo(130 + Math.cos(a) * 112, 130 + Math.sin(a) * 112);
    ctx.stroke();
  }
  shine(ctx, 96, 92, 40, 18, 0.75, -0.7);
  shine(ctx, 160, 170, 16, 8, 0.35, -0.7);
  return c;
}

/** A black hole with a glowing accretion ring. */
function blackHole(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(360, 360);
  softGlow(ctx, 180, 180, 180, '#b06bff', 0.55);
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.translate(180, 180);
    ctx.rotate(i * 0.55);
    ctx.scale(1, 0.42);
    ellipse(ctx, 0, 0, 150 - i * 10, 150 - i * 10);
    ctx.lineWidth = 12;
    ctx.strokeStyle = rgba(['#ffd23f', '#ff7a2a', '#ff4fd8', '#b06bff', '#36e0ff', '#ffffff'][i], 0.7);
    ctx.stroke();
    ctx.restore();
  }
  ellipse(ctx, 180, 180, 78, 78);
  ctx.fillStyle = rad(ctx, 200, 200, 78, [[0, '#000000'], [0.85, '#0a0418'], [1, '#3a1a6a']]);
  ctx.fill();
  stroke(ctx, 6, '#ffffff');
  stroke(ctx, 3, '#b06bff');
  return c;
}

/** A comic-book starburst behind the impact words. */
function comicBurst(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(420, 300);
  ctx.translate(210, 150);
  ctx.beginPath();
  const n = 16;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? 90 : 140 + ((i * 29) % 40);
    ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 0.95);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // halftone dots
  ctx.save();
  ctx.clip();
  ctx.fillStyle = rgba('#ff7a2a', 0.55);
  for (let y = -150; y < 150; y += 14) for (let x = -210 + ((y / 14) % 2) * 7; x < 210; x += 14) {
    const d = Math.hypot(x, y) / 200;
    ctx.beginPath();
    ctx.arc(x, y, 1 + d * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return c;
}

/** The Last Slice: every peel on the wall poured into one giant golden peel. */
function goldPeel(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(320, 440);
  softGlow(ctx, 160, 300, 160, '#ffd23f', 0.7);
  peelShape(ctx, 160, 10, 270, 420);
  ctx.fillStyle = lin(ctx, 20, 100, 300, 430, [[0, '#fffbe0'], [0.35, '#ffd23f'], [0.7, '#e8a010'], [1, '#8a5a10']]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = rgba('#ffffff', 0.4);
  ctx.beginPath();
  ctx.moveTo(30, 300);
  ctx.lineTo(140, 170);
  ctx.lineTo(176, 170);
  ctx.lineTo(50, 340);
  ctx.closePath();
  ctx.fill();
  // little peels engraved round the rim: all of them, in one
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * (0.1 + (i / 11) * 0.8);
    const x = 160 + Math.cos(a) * 108;
    const y = 300 + Math.sin(a) * 100 - 40;
    ellipse(ctx, x, y, 9, 12, a);
    ctx.fillStyle = rgba(shade('#ffd23f', -0.45), 0.6);
    ctx.fill();
  }
  ctx.restore();
  peelShape(ctx, 160, 10, 270, 420);
  stroke(ctx, 8);
  return c;
}

/** The Mirror Peel's eyes and mouth, worn over its copy of your peel. */
function mirrorEyes(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 200);
  for (const s of [-1, 1]) {
    const ex = 130 + s * 50;
    const ey = 80;
    softGlow(ctx, ex, ey, 46, '#b06bff', 0.9);
    ellipse(ctx, ex, ey, 19, 13, s * 0.25);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    stroke(ctx, 4, '#1a0f30');
    ellipse(ctx, ex + s * 3, ey + 1, 6, 6);
    ctx.fillStyle = '#3a1a6a';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ex - s * 32, ey - 36);
    ctx.lineTo(ex + s * 22, ey - 14);
    ctx.lineCap = 'round';
    stroke(ctx, 10, '#08060c');
  }
  ctx.beginPath();
  ctx.moveTo(90, 160);
  ctx.quadraticCurveTo(130, 138, 170, 160);
  ctx.lineCap = 'round';
  stroke(ctx, 12, '#08060c');
  stroke(ctx, 6, '#c8a8ff');
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_mirroreyes: mirrorEyes,
  p_echopeel: echoPeel,
  p_contract: contract,
  p_sold: soldStamp,
  p_watch: pocketWatch,
  p_futureprint: futurePrint,
  p_gauntlet: gauntlet,
  p_frost: frostCrystal,
  p_pizzaflame: pizzaFlame,
  p_mirrorshield: mirrorShield,
  p_blackhole: blackHole,
  p_comicburst: comicBurst,
  p_goldpeel: goldPeel,
};
