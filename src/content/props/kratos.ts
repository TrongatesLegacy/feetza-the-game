// Props for Kratos's nemesis fights (src/game/bosses/kratos.ts): Kronos's great hourglass, his stone jaw, the Titan
// chains that lock a lane and the shackle on them; Zeus's storm cloud and thunderbolt, and the Olympians' gifts:
// Poseidon's trident and his wave, Ares's crested war helmet, Hera's crown and its peacock-eye gems, and a medallion
// for each god as they're called in. Same style as src/art/eventArt.ts: thick ink outlines, gradients and a sheen,
// lit from the top left. Every emblem is our own.
import { type Ctx, ellipse, makeCanvas, rgba, roundRect, shade } from '../../art/util';

const INK = '#2a1810';
const SAND = '#f0c860';

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

function rad(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

const bronze = (ctx: Ctx, y0: number, y1: number, col = '#c9873a') =>
  lin(ctx, 0, y0, 0, y1, [
    [0, shade(col, 0.5)],
    [0.35, col],
    [0.75, shade(col, -0.3)],
    [1, shade(col, -0.5)],
  ]);

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55, rot = -0.5): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

// ——— Kronos ———

/** The great hourglass of the Titan king: bronze caps and pillars, sand pouring. */
function hourglass(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 300);
  const x = 110;
  // the glass
  ctx.beginPath();
  ctx.moveTo(x - 66, 40);
  ctx.bezierCurveTo(x - 70, 120, x - 10, 130, x - 8, 150);
  ctx.bezierCurveTo(x - 10, 170, x - 70, 180, x - 66, 260);
  ctx.lineTo(x + 66, 260);
  ctx.bezierCurveTo(x + 70, 180, x + 10, 170, x + 8, 150);
  ctx.bezierCurveTo(x + 10, 130, x + 70, 120, x + 66, 40);
  ctx.closePath();
  ctx.fillStyle = rgba('#dff0ff', 0.32);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // sand: a full top bulb draining, a heap below and the falling stream
  ctx.fillStyle = lin(ctx, 0, 60, 0, 140, [
    [0, shade(SAND, 0.2)],
    [1, shade(SAND, -0.2)],
  ]);
  ctx.beginPath();
  ctx.moveTo(x - 70, 76);
  ctx.quadraticCurveTo(x, 92, x + 70, 76);
  ctx.lineTo(x + 70, 160);
  ctx.lineTo(x - 70, 160);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 70, 262);
  ctx.quadraticCurveTo(x, 196, x + 70, 262);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 3, 140, 6, 90);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - 66, 40);
  ctx.bezierCurveTo(x - 70, 120, x - 10, 130, x - 8, 150);
  ctx.bezierCurveTo(x - 10, 170, x - 70, 180, x - 66, 260);
  ctx.lineTo(x + 66, 260);
  ctx.bezierCurveTo(x + 70, 180, x + 10, 170, x + 8, 150);
  ctx.bezierCurveTo(x + 10, 130, x + 70, 120, x + 66, 40);
  ctx.closePath();
  stroke(ctx, 6);
  shine(ctx, x - 40, 90, 8, 28, 0.6, 0.15);
  shine(ctx, x - 42, 215, 7, 22, 0.45, -0.15);
  // the pillars either side
  for (const d of [-1, 1]) {
    roundRect(ctx, x + d * 84 - 9, 30, 18, 240, 6);
    ctx.fillStyle = lin(ctx, x + d * 84 - 9, 0, x + d * 84 + 9, 0, [
      [0, '#f0c070'],
      [0.5, '#b87a30'],
      [1, '#6a4418'],
    ]);
    ctx.fill();
    stroke(ctx, 4);
  }
  // the caps, carved with the Greek key
  for (const y of [14, 262]) {
    roundRect(ctx, 6, y, 208, 26, 8);
    ctx.fillStyle = bronze(ctx, y, y + 26);
    ctx.fill();
    stroke(ctx, 5);
    ctx.strokeStyle = rgba('#5a3410', 0.8);
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 18; k < 200; k += 22) {
      ctx.moveTo(k, y + 20);
      ctx.lineTo(k, y + 7);
      ctx.lineTo(k + 12, y + 7);
      ctx.lineTo(k + 12, y + 15);
    }
    ctx.stroke();
  }
  return c;
}

/** Kronos's stone lower jaw: it closes over a pizza in Devour. Square stone teeth, a beard below. */
function jaw(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 170);
  const x = 150;
  // the beard under the jaw
  ctx.beginPath();
  ctx.moveTo(30, 60);
  ctx.quadraticCurveTo(40, 150, x, 166);
  ctx.quadraticCurveTo(260, 150, 270, 60);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 60, 0, 166, [
    [0, '#7a766e'],
    [1, '#3e3a34'],
  ]);
  ctx.fill();
  stroke(ctx, 5);
  for (let k = -4; k <= 4; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * 26, 70);
    ctx.quadraticCurveTo(x + k * 30 + 8, 110, x + k * 20, 150 - Math.abs(k) * 10);
    stroke(ctx, 2.5, rgba(INK, 0.5));
  }
  // the jaw: a stone crescent with a row of teeth
  ctx.beginPath();
  ctx.moveTo(14, 30);
  ctx.quadraticCurveTo(x, 120, 286, 30);
  ctx.lineTo(270, 8);
  ctx.quadraticCurveTo(x, 84, 30, 8);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 8, 0, 100, [
    [0, '#b4aea4'],
    [1, '#6a665e'],
  ]);
  ctx.fill();
  stroke(ctx, 6);
  for (let k = 0; k < 8; k++) {
    const t = (k + 0.5) / 8;
    const tx = 40 + t * 220;
    const ty = 20 + Math.sin(t * Math.PI) * 44;
    roundRect(ctx, tx - 11, ty - 26, 22, 26, 4);
    ctx.fillStyle = lin(ctx, 0, ty - 26, 0, ty, [
      [0, '#fbf6ea'],
      [1, '#c8c0ae'],
    ]);
    ctx.fill();
    stroke(ctx, 3);
  }
  // golden cracks: the Titan's light leaking through
  ctx.beginPath();
  ctx.moveTo(70, 60);
  ctx.lineTo(90, 76);
  ctx.lineTo(84, 92);
  stroke(ctx, 6, rgba(INK, 0.8));
  stroke(ctx, 2.5, SAND);
  shine(ctx, 70, 34, 26, 7, 0.4, 0.3);
  return c;
}

/** A Titan chain hanging down a lane, from the top of the screen to the table (tall, one link column). */
function chain(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 760);
  for (let i = 0, y = 0; y < 740; i++, y += 46) {
    if (i % 2) {
      roundRect(ctx, 52, y - 4, 16, 58, 8);
      ctx.fillStyle = lin(ctx, 52, 0, 68, 0, [
        [0, '#c8bca8'],
        [1, '#5a5048'],
      ]);
      ctx.fill();
      stroke(ctx, 5);
    } else {
      ellipse(ctx, 60, y + 23, 30, 34);
      ctx.lineWidth = 22;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = 13;
      ctx.strokeStyle = lin(ctx, 30, y, 90, y + 50, [
        [0, '#d8ccb4'],
        [0.5, '#8a7e6e'],
        [1, '#4a423a'],
      ]);
      ctx.stroke();
      ellipse(ctx, 44, y + 10, 5, 9, 0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
    }
  }
  return c;
}

/** The bronze shackle-lock clamped on a Titan chain: break it to break the chain. */
function shackle(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(170, 190);
  ctx.beginPath();
  ctx.arc(85, 72, 52, Math.PI, 0);
  ctx.lineWidth = 30;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 20;
  ctx.strokeStyle = bronze(ctx, 20, 80);
  ctx.stroke();
  roundRect(ctx, 22, 70, 126, 104, 18);
  ctx.fillStyle = bronze(ctx, 70, 174);
  ctx.fill();
  stroke(ctx, 6);
  // the hourglass seal of Kronos
  ctx.beginPath();
  ctx.moveTo(62, 96);
  ctx.lineTo(108, 96);
  ctx.lineTo(85, 122);
  ctx.lineTo(108, 148);
  ctx.lineTo(62, 148);
  ctx.lineTo(85, 122);
  ctx.closePath();
  ctx.fillStyle = '#3a2410';
  ctx.fill();
  stroke(ctx, 3, '#3a2410');
  ctx.beginPath();
  ctx.moveTo(70, 140);
  ctx.lineTo(100, 140);
  ctx.lineTo(85, 128);
  ctx.closePath();
  ctx.fillStyle = SAND;
  ctx.fill();
  for (const [x, y] of [[36, 84], [134, 84], [36, 160], [134, 160]]) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe0a0';
    ctx.fill();
    stroke(ctx, 2.5);
  }
  shine(ctx, 50, 86, 16, 6, 0.5, -0.2);
  return c;
}

// ——— Zeus ———

/** A dark storm cloud with a crackling blue underside (Zeus's strike tell). */
function stormCloud(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(340, 210);
  const puffs: [number, number, number][] = [
    [80, 120, 60],
    [140, 86, 72],
    [214, 92, 66],
    [270, 126, 54],
    [170, 140, 70],
    [100, 150, 48],
    [240, 152, 50],
  ];
  ctx.beginPath();
  for (const [x, y, r] of puffs) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = lin(ctx, 0, 20, 0, 200, [
    [0, '#7a86a8'],
    [0.5, '#3e4668'],
    [1, '#1e2238'],
  ]);
  ctx.fill();
  stroke(ctx, 6);
  // lit tops
  for (const [x, y, r] of puffs.slice(0, 4)) {
    ellipse(ctx, x - r * 0.25, y - r * 0.45, r * 0.5, r * 0.25, -0.3);
    ctx.fillStyle = rgba('#c8d4f0', 0.35);
    ctx.fill();
  }
  // the charged underside
  const g = ctx.createRadialGradient(170, 190, 4, 170, 180, 140);
  g.addColorStop(0, rgba('#bfe8ff', 0.9));
  g.addColorStop(1, rgba('#5fb8ff', 0));
  ctx.fillStyle = g;
  ctx.fillRect(20, 120, 300, 90);
  // little forks of lightning hanging below
  for (const [x0, d] of [[120, -1], [210, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, 170);
    ctx.lineTo(x0 + d * 10, 186);
    ctx.lineTo(x0 - d * 2, 192);
    ctx.lineTo(x0 + d * 8, 208);
    stroke(ctx, 6, rgba(INK, 0.6));
    stroke(ctx, 3, '#f4fbff');
  }
  return c;
}

/** Zeus's thunderbolt: a chunky gold-and-white zigzag with blue glow. */
function bolt(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 240);
  const g = ctx.createRadialGradient(75, 120, 6, 75, 120, 110);
  g.addColorStop(0, rgba('#9fd8ff', 0.75));
  g.addColorStop(1, rgba('#9fd8ff', 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 150, 240);
  ctx.beginPath();
  ctx.moveTo(96, 10);
  ctx.lineTo(34, 128);
  ctx.lineTo(70, 128);
  ctx.lineTo(48, 230);
  ctx.lineTo(118, 96);
  ctx.lineTo(80, 96);
  ctx.lineTo(108, 10);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 40, 10, 110, 230, [
    [0, '#fffbe6'],
    [0.5, '#ffe680'],
    [1, '#e8a820'],
  ]);
  ctx.fill();
  stroke(ctx, 6);
  ctx.beginPath();
  ctx.moveTo(92, 26);
  ctx.lineTo(54, 112);
  stroke(ctx, 4, 'rgba(255,255,255,0.8)');
  return c;
}

/** Poseidon's trident, standing upright (it's plunged into the table). */
function trident(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 420);
  const x = 100;
  roundRect(ctx, x - 9, 120, 18, 290, 8);
  ctx.fillStyle = lin(ctx, x - 9, 0, x + 9, 0, [
    [0, '#f0d080'],
    [0.5, '#c89030'],
    [1, '#6a4410'],
  ]);
  ctx.fill();
  stroke(ctx, 5);
  // the prongs
  ctx.beginPath();
  ctx.moveTo(x - 70, 20);
  ctx.lineTo(x - 56, 60);
  ctx.quadraticCurveTo(x - 60, 120, x, 130);
  ctx.quadraticCurveTo(x + 60, 120, x + 56, 60);
  ctx.lineTo(x + 70, 20);
  ctx.lineTo(x + 40, 56);
  ctx.quadraticCurveTo(x + 40, 100, x + 12, 106);
  ctx.lineTo(x + 12, 40);
  ctx.lineTo(x, 4);
  ctx.lineTo(x - 12, 40);
  ctx.lineTo(x - 12, 106);
  ctx.quadraticCurveTo(x - 40, 100, x - 40, 56);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, x - 70, 0, x + 70, 130, [
    [0, '#fff2c0'],
    [0.5, '#e8b23a'],
    [1, '#8a5a14'],
  ]);
  ctx.fill();
  stroke(ctx, 6);
  // a sea-green jewel and a wrap of kelp
  ctx.beginPath();
  ctx.arc(x, 132, 14, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, x, 132, 14, [
    [0, '#c0fff0'],
    [1, '#1a8a7a'],
  ]);
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  for (let y = 170; y < 260; y += 18) {
    ctx.moveTo(x - 12, y);
    ctx.quadraticCurveTo(x, y + 12, x + 12, y + 6);
  }
  stroke(ctx, 4, '#2f8a5a');
  shine(ctx, x - 40, 40, 6, 16, 0.6, 0.3);
  return c;
}

/** A curling sea wave (Poseidon's), foam on the crest. */
function wave(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(520, 360);
  ctx.beginPath();
  ctx.moveTo(0, 360);
  ctx.lineTo(0, 200);
  ctx.bezierCurveTo(60, 80, 220, 0, 360, 40);
  ctx.bezierCurveTo(470, 70, 520, 150, 470, 200);
  ctx.bezierCurveTo(440, 150, 380, 130, 340, 170);
  ctx.bezierCurveTo(300, 210, 360, 250, 400, 240);
  ctx.bezierCurveTo(440, 300, 500, 330, 520, 360);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 40, 0, 360, [
    [0, '#7fe0ff'],
    [0.4, '#2a9ad0'],
    [1, '#0a4a7a'],
  ]);
  ctx.fill();
  stroke(ctx, 7);
  // foam along the crest
  ctx.beginPath();
  ctx.moveTo(40, 160);
  ctx.bezierCurveTo(120, 60, 260, 20, 370, 52);
  ctx.bezierCurveTo(450, 80, 490, 140, 466, 186);
  stroke(ctx, 18, '#f4fbff');
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    ctx.arc(80 + k * 44, 70 + Math.abs(k - 5) * 12, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#f4fbff';
    ctx.fill();
  }
  // inner swirls
  for (const [x, y, r] of [[160, 220, 50], [270, 270, 40]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 0.8, Math.PI * 2.1);
    stroke(ctx, 5, rgba('#bff0ff', 0.6));
  }
  return c;
}

/** Ares's crested bronze war helmet (it lands on the table and roars until it's smashed). */
function aresHelm(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 280);
  // the crest: a red horsehair plume
  ctx.beginPath();
  ctx.moveTo(40, 120);
  ctx.bezierCurveTo(40, 20, 210, 10, 230, 110);
  ctx.bezierCurveTo(200, 60, 80, 60, 64, 128);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 40, 20, 230, 120, [
    [0, '#ff6a4a'],
    [0.6, '#c8201a'],
    [1, '#6a0a0a'],
  ]);
  ctx.fill();
  stroke(ctx, 6);
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    ctx.moveTo(60 + k * 18, 56 + Math.abs(k - 4) * 6);
    ctx.lineTo(70 + k * 18, 96);
    stroke(ctx, 2.5, rgba('#3a0606', 0.5));
  }
  // the helm with its cheek guards and T-shaped opening
  ctx.beginPath();
  ctx.moveTo(48, 130);
  ctx.bezierCurveTo(48, 80, 212, 80, 212, 130);
  ctx.lineTo(214, 230);
  ctx.quadraticCurveTo(190, 262, 160, 256);
  ctx.lineTo(150, 196);
  ctx.lineTo(110, 196);
  ctx.lineTo(100, 256);
  ctx.quadraticCurveTo(70, 262, 46, 230);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 48, 90, 212, 260, [
    [0, '#ffd890'],
    [0.4, '#c9873a'],
    [1, '#5a3010'],
  ]);
  ctx.fill();
  stroke(ctx, 7);
  ctx.beginPath();
  ctx.moveTo(84, 150);
  ctx.lineTo(176, 150);
  ctx.lineTo(176, 170);
  ctx.lineTo(142, 172);
  ctx.lineTo(140, 246);
  ctx.lineTo(120, 246);
  ctx.lineTo(118, 172);
  ctx.lineTo(84, 170);
  ctx.closePath();
  ctx.fillStyle = '#1a0a06';
  ctx.fill();
  stroke(ctx, 4);
  // red eyes burning in the dark
  for (const x of [104, 156]) {
    ctx.beginPath();
    ctx.arc(x, 160, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4a2a';
    ctx.fill();
  }
  shine(ctx, 86, 110, 22, 9, 0.5, -0.4);
  return c;
}

/** Hera's crown: gold, with a peacock fan of points. */
function crown(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 190);
  ctx.beginPath();
  ctx.moveTo(30, 170);
  for (let k = 0; k <= 6; k++) {
    const x = 30 + k * 40;
    const tip = k % 2 ? 60 : 20;
    ctx.lineTo(x - 20 * (k ? 1 : 0), 100);
    ctx.lineTo(x, tip);
  }
  ctx.lineTo(270, 100);
  ctx.lineTo(270, 170);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 20, 0, 170, [
    [0, '#fff2b0'],
    [0.45, '#e8b23a'],
    [1, '#8a5a14'],
  ]);
  ctx.fill();
  stroke(ctx, 6);
  roundRect(ctx, 22, 140, 256, 34, 10);
  ctx.fillStyle = lin(ctx, 0, 140, 0, 174, [
    [0, '#ffe080'],
    [1, '#a8701c'],
  ]);
  ctx.fill();
  stroke(ctx, 5);
  // jewels along the band: teal and violet like peacock feathers
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    ctx.arc(50 + k * 40, 157, 9, 0, Math.PI * 2);
    ctx.fillStyle = k % 2 ? '#5fd0c0' : '#7a5aff';
    ctx.fill();
    stroke(ctx, 3);
  }
  for (const x of [30, 110, 190, 270]) {
    ctx.beginPath();
    ctx.arc(x, 20, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    stroke(ctx, 3);
  }
  shine(ctx, 60, 120, 20, 6, 0.5, -0.2);
  return c;
}

/** A peacock-feather eye: a teal gem ringed in gold and violet (break 3 to break the crown). */
function peacock(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 200);
  // the feather barbs fanning out
  ctx.beginPath();
  ctx.moveTo(75, 196);
  ctx.bezierCurveTo(-10, 150, 0, 20, 75, 8);
  ctx.bezierCurveTo(150, 20, 160, 150, 75, 196);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 0, 0, 200, [
    [0, '#6ad89a'],
    [1, '#1a6a4a'],
  ]);
  ctx.fill();
  stroke(ctx, 5);
  for (let k = -5; k <= 5; k++) {
    ctx.beginPath();
    ctx.moveTo(75, 180);
    ctx.quadraticCurveTo(75 + k * 10, 100, 75 + k * 12, 30 + Math.abs(k) * 8);
    stroke(ctx, 2, rgba('#c8ffd8', 0.35));
  }
  // the eye
  for (const [r, col] of [[44, '#e8b23a'], [34, '#5fd0c0'], [22, '#2a3aa8'], [11, '#0a0a2a']] as const) {
    ellipse(ctx, 75, 84, r, r * 1.15);
    ctx.fillStyle = col;
    ctx.fill();
    stroke(ctx, 3);
  }
  shine(ctx, 64, 70, 8, 5, 0.75);
  return c;
}

/** An Olympian's medallion as they're called in: a gold disc with their symbol. */
function medallion(sym: 'trident' | 'helm' | 'peacock' | 'bolt', bg: string): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(200, 200);
    ctx.beginPath();
    ctx.arc(100, 100, 92, 0, Math.PI * 2);
    ctx.fillStyle = lin(ctx, 0, 8, 0, 192, [
      [0, '#fff2b0'],
      [0.5, '#e8b23a'],
      [1, '#8a5a14'],
    ]);
    ctx.fill();
    stroke(ctx, 7);
    ctx.beginPath();
    ctx.arc(100, 100, 72, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, 100, 100, 72, [
      [0, shade(bg, 0.3)],
      [1, shade(bg, -0.35)],
    ]);
    ctx.fill();
    stroke(ctx, 4);
    ctx.fillStyle = '#fff6d8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (sym === 'trident') {
      ctx.moveTo(94, 160);
      ctx.lineTo(94, 92);
      ctx.lineTo(64, 84);
      ctx.lineTo(62, 46);
      ctx.lineTo(74, 70);
      ctx.lineTo(94, 74);
      ctx.lineTo(94, 38);
      ctx.lineTo(100, 26);
      ctx.lineTo(106, 38);
      ctx.lineTo(106, 74);
      ctx.lineTo(126, 70);
      ctx.lineTo(138, 46);
      ctx.lineTo(136, 84);
      ctx.lineTo(106, 92);
      ctx.lineTo(106, 160);
    } else if (sym === 'helm') {
      ctx.moveTo(56, 104);
      ctx.bezierCurveTo(56, 40, 144, 40, 144, 104);
      ctx.lineTo(144, 150);
      ctx.lineTo(116, 150);
      ctx.lineTo(112, 112);
      ctx.lineTo(88, 112);
      ctx.lineTo(84, 150);
      ctx.lineTo(56, 150);
    } else if (sym === 'peacock') {
      ctx.moveTo(100, 160);
      ctx.bezierCurveTo(40, 130, 46, 44, 100, 36);
      ctx.bezierCurveTo(154, 44, 160, 130, 100, 160);
    } else {
      ctx.moveTo(112, 30);
      ctx.lineTo(70, 108);
      ctx.lineTo(96, 108);
      ctx.lineTo(82, 170);
      ctx.lineTo(132, 86);
      ctx.lineTo(106, 86);
      ctx.lineTo(124, 30);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    shine(ctx, 62, 46, 26, 9, 0.45, -0.6);
    return c;
  };
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_nz_hourglass: hourglass,
  p_nz_jaw: jaw,
  p_nz_chain: chain,
  p_nz_shackle: shackle,
  p_nz_cloud: stormCloud,
  p_nz_bolt: bolt,
  p_nz_trident: trident,
  p_nz_wave: wave,
  p_nz_helm: aresHelm,
  p_nz_crown: crown,
  p_nz_peacock: peacock,
  p_nz_medal_poseidon: medallion('trident', '#1a8aaa'),
  p_nz_medal_ares: medallion('helm', '#a81a1a'),
  p_nz_medal_hera: medallion('peacock', '#2a9a8a'),
  p_nz_medal_zeus: medallion('bolt', '#2a3a8a'),
};
