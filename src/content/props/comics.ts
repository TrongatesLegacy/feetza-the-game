// Props for the comic heroes' nemesis fights (src/game/bosses/comics.ts): the Red Sole's Cosmic Crouton in its cradle
// and HYDRANT's hydrant turret; Venomnom's tongue tip, the goo that binds a pizza and the lab's sonic emitter; the
// Cheetoe's claw marks, and the eyes that glint in the leaves (hers amber, the fireflies' green) with the bush they
// hide in. Same style as src/art/eventArt.ts: thick ink outlines, gradients and a sheen, lit from the top left.
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

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55, rot = -0.5): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

// ——— the Red Sole ———

/** The Cosmic Crouton: a glowing blue cube (a crouton of pure power) floating in a bronze cradle. */
function cube(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 240);
  const g = ctx.createRadialGradient(110, 100, 10, 110, 100, 110);
  g.addColorStop(0, 'rgba(160,220,255,0.75)');
  g.addColorStop(1, 'rgba(60,140,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 220, 220);
  // the cube in three faces
  const faces: [string, [number, number][]][] = [
    ['#bfe8ff', [[110, 40], [168, 70], [110, 100], [52, 70]]],
    ['#4a9aff', [[52, 70], [110, 100], [110, 166], [52, 134]]],
    ['#2a6ad8', [[110, 100], [168, 70], [168, 134], [110, 166]]],
  ];
  for (const [col, pts] of faces) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    stroke(ctx, 5);
  }
  // crouton crust: little toasted bumps on the faces, and a glowing core line
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const [x, y] of [[90, 66], [124, 60], [76, 104], [84, 128], [136, 112], [148, 92]]) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  shine(ctx, 96, 62, 18, 6, 0.6, 0.45);
  // the bronze cradle under it
  ctx.beginPath();
  ctx.moveTo(30, 170);
  ctx.quadraticCurveTo(110, 230, 190, 170);
  ctx.lineTo(176, 160);
  ctx.quadraticCurveTo(110, 206, 44, 160);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 160, 0, 220, [
    [0, '#ffd890'],
    [1, '#8a5a1c'],
  ]);
  ctx.fill();
  stroke(ctx, 4);
  for (const x of [44, 176]) {
    roundRect(ctx, x - 6, 120, 12, 52, 5);
    ctx.fillStyle = lin(ctx, x - 6, 0, x + 6, 0, [
      [0, '#ffd890'],
      [1, '#8a5a1c'],
    ]);
    ctx.fill();
    stroke(ctx, 3);
  }
  return c;
}

/** HYDRANT's turret: a red fire hydrant on a steel mount, its nozzle a cannon, the emblem on its chest. */
function turret(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 260);
  // the mount
  roundRect(ctx, 30, 210, 140, 40, 10);
  ctx.fillStyle = lin(ctx, 0, 210, 0, 250, [
    [0, '#9aa3ad'],
    [1, '#4a5058'],
  ]);
  ctx.fill();
  stroke(ctx, 5);
  // the hydrant body
  ctx.beginPath();
  ctx.moveTo(56, 214);
  ctx.lineTo(62, 90);
  ctx.quadraticCurveTo(100, 60, 138, 90);
  ctx.lineTo(144, 214);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 56, 0, 144, 0, [
    [0, '#ff6a5a'],
    [0.45, '#c8102e'],
    [1, '#6a0a14'],
  ]);
  ctx.fill();
  stroke(ctx, 6);
  // its cap and the cannon nozzle pointing out
  ctx.beginPath();
  ctx.arc(100, 78, 30, Math.PI, 0);
  ctx.fillStyle = '#a80e24';
  ctx.fill();
  stroke(ctx, 5);
  roundRect(ctx, 90, 30, 20, 20, 4);
  ctx.fillStyle = '#9aa3ad';
  ctx.fill();
  stroke(ctx, 4);
  roundRect(ctx, 136, 120, 52, 30, 8);
  ctx.fillStyle = lin(ctx, 0, 120, 0, 150, [
    [0, '#d8dde4'],
    [1, '#5a6068'],
  ]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.beginPath();
  ctx.arc(184, 135, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1418';
  ctx.fill();
  // the side bolts and the emblem
  for (const y of [110, 190]) {
    roundRect(ctx, 40, y, 120, 12, 4);
    ctx.fillStyle = '#8a0a1a';
    ctx.fill();
    stroke(ctx, 3);
  }
  ctx.beginPath();
  ctx.arc(100, 152, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#f4efe6';
  ctx.fill();
  stroke(ctx, 3);
  ctx.fillStyle = '#1e1c20';
  roundRect(ctx, 94, 140, 12, 16, 2);
  ctx.fill();
  ctx.fillRect(88, 148, 24, 4);
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(100, 158);
    ctx.lineTo(86 + k * 7, 166);
    stroke(ctx, 2.5, '#1e1c20');
  }
  shine(ctx, 76, 110, 8, 28, 0.4, 0.05);
  return c;
}

// ——— Venomnom ———

/** The goo that binds a pizza: a black mass with reaching tendrils and white highlights. */
function goo(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 200);
  const blob = () => {
    ctx.beginPath();
    ctx.moveTo(30, 150);
    ctx.bezierCurveTo(10, 90, 60, 60, 90, 80);
    ctx.bezierCurveTo(90, 30, 150, 10, 170, 60);
    ctx.bezierCurveTo(210, 20, 280, 60, 260, 110);
    ctx.bezierCurveTo(300, 140, 270, 190, 220, 170);
    ctx.bezierCurveTo(180, 200, 100, 200, 70, 176);
    ctx.bezierCurveTo(40, 190, 20, 170, 30, 150);
    ctx.closePath();
  };
  blob();
  ctx.fillStyle = lin(ctx, 0, 20, 0, 190, [
    [0, '#3a3a52'],
    [0.5, '#16161e'],
    [1, '#0a0a10'],
  ]);
  ctx.fill();
  stroke(ctx, 6, '#0a0a10');
  // tendrils reaching out
  for (const [x0, y0, x1, y1] of [[40, 120, -10, 60], [250, 90, 296, 30], [150, 30, 140, -10], [220, 170, 290, 196]] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 20, (y0 + y1) / 2 - 10, x1, y1);
    stroke(ctx, 14, '#0a0a10');
    stroke(ctx, 8, '#20202c');
  }
  shine(ctx, 110, 70, 24, 8, 0.4, -0.3);
  shine(ctx, 210, 70, 14, 5, 0.3, 0.2);
  ctx.strokeStyle = rgba('#8a8aff', 0.4);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(150, 120, 50, Math.PI * 1.1, Math.PI * 1.7);
  ctx.stroke();
  return c;
}

/** The tongue's tip: a fat pink tongue end with a split, glistening. */
function tongue(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(160, 110);
  ctx.beginPath();
  ctx.moveTo(10, 40);
  ctx.bezierCurveTo(60, 20, 120, 10, 150, 50);
  ctx.bezierCurveTo(140, 90, 70, 96, 10, 72);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 10, 0, 100, [
    [0, '#ff8aa8'],
    [1, '#a82a4a'],
  ]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.beginPath();
  ctx.moveTo(150, 52);
  ctx.quadraticCurveTo(110, 56, 80, 54);
  stroke(ctx, 3, rgba(INK, 0.6));
  shine(ctx, 90, 34, 24, 6, 0.55, -0.1);
  return c;
}

/** The lab's sonic emitter: a heavy speaker cone on a wall bracket, with a power lamp. */
function emitter(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 220);
  roundRect(ctx, 20, 20, 160, 180, 18);
  ctx.fillStyle = lin(ctx, 0, 20, 0, 200, [
    [0, '#6a7480'],
    [1, '#2a3038'],
  ]);
  ctx.fill();
  stroke(ctx, 6);
  for (const [r, col] of [[64, '#1a1e24'], [52, '#3a424c'], [30, '#1a1e24'], [14, '#9aa3ad']] as const) {
    ctx.beginPath();
    ctx.arc(100, 110, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    stroke(ctx, 3);
  }
  // sound rings already rippling off the cone
  ctx.strokeStyle = rgba('#9ff0ff', 0.7);
  ctx.lineWidth = 3;
  for (const r of [72, 80]) {
    ctx.beginPath();
    ctx.arc(100, 110, r, -0.5, 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(100, 110, r, Math.PI - 0.5, Math.PI + 0.5);
    ctx.stroke();
  }
  // the power lamp and bolts in the corners
  ctx.beginPath();
  ctx.arc(160, 40, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#7dff9a';
  ctx.fill();
  stroke(ctx, 3);
  for (const [x, y] of [[36, 36], [36, 184], [164, 184]]) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#c9cfd8';
    ctx.fill();
    stroke(ctx, 2);
  }
  shine(ctx, 60, 50, 20, 7, 0.35, -0.3);
  return c;
}

// ——— the Cheetoe ———

/** Three claw rakes across a pizza: torn red-orange gashes. */
function scratch(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 200);
  for (let k = 0; k < 3; k++) {
    const x = 50 + k * 60;
    ctx.beginPath();
    ctx.moveTo(x - 20, 20);
    ctx.quadraticCurveTo(x + 10, 100, x + 30, 180);
    ctx.quadraticCurveTo(x + 4, 100, x - 6, 24);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, 20, 0, 180, [
      [0, '#ffd890'],
      [0.5, '#e0402a'],
      [1, '#7a1008'],
    ]);
    ctx.fill();
    stroke(ctx, 4);
  }
  return c;
}

/** A pair of eyes glinting in the dark leaves: amber slits for her, round green for a firefly pair. */
function eyes(hers: boolean): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(200, 150);
    // the bush they hide in
    for (const [x, y, r] of [[50, 90, 46], [100, 70, 54], [150, 92, 44], [80, 116, 40], [128, 118, 40]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = lin(ctx, 0, y - r, 0, y + r, [
        [0, '#2e6a3a'],
        [1, '#0e2a16'],
      ]);
      ctx.fill();
      stroke(ctx, 4);
    }
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.ellipse(30 + k * 24, 40 + (k % 2) * 30, 12, 5, k * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = rgba('#5aa86a', 0.6);
      ctx.fill();
    }
    // the eyes
    for (const s of [-1, 1]) {
      const x = 100 + s * 24;
      const y = 84;
      const g = ctx.createRadialGradient(x, y, 0, x, y, hers ? 34 : 24);
      g.addColorStop(0, hers ? 'rgba(255,170,30,1)' : 'rgba(170,255,120,0.7)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 34, y - 34, 68, 68);
      ellipse(ctx, x, y, 13, hers ? 9 : 10, hers ? s * 0.25 : 0);
      ctx.fillStyle = hers ? '#ffc83a' : '#b8ff7a';
      ctx.fill();
      stroke(ctx, 3);
      ellipse(ctx, x, y, hers ? 2.5 : 5, hers ? 8 : 5);
      ctx.fillStyle = '#140a04';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 4, y - 4, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    return c;
  };
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_cm_cube: cube,
  p_cm_turret: turret,
  p_cm_goo: goo,
  p_cm_tongue: tongue,
  p_cm_emitter: emitter,
  p_cm_scratch: scratch,
  p_cm_eyes: eyes(true),
  p_cm_fireflies: eyes(false),
};
