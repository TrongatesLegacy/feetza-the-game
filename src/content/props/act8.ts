// Props for the Act 8 · Norse fights (src/game/bosses/act8.ts): Fenrir's chain Gleipnir, Thrym's ice
// fortress and ice shells, Jörmungandr's venom, and Surtr's fire, fuse, sword and the
// counter rune. Same style as src/art/eventArt.ts: thick ink outlines, gradients, a sheen.
import { type Ctx, ellipse, makeCanvas, rgba } from '../../art/util';

const INK = '#2a1810';
type P = [number, number];

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

function rad(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][], r0 = 0): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function poly(ctx: Ctx, pts: P[], close = true): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55, rot = -0.5): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

/** A seeded random, so props draw the same every time. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function glowStroke(ctx: Ctx, col: string, core: string, lw: number, blur = 12): void {
  ctx.save();
  ctx.shadowColor = col;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = col;
  ctx.lineWidth = lw + 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = core;
  ctx.lineWidth = Math.max(1.5, lw * 0.45);
  ctx.stroke();
  ctx.restore();
}

const RUNES: P[][][] = [
  [[[0, -1], [0, 1]], [[0, -0.2], [0.55, -0.75]], [[0, 0.25], [0.55, -0.3]]],
  [[[0, -1], [0, 1]], [[0, -0.5], [0.5, 0], [0, 0.5]]],
  [[[0, -1], [0, 1]], [[0, -0.75], [0.5, -0.3]], [[0, -0.25], [0.5, 0.2]]],
  [[[0.45, -0.7], [-0.25, 0], [0.45, 0.7]]],
  [[[0, -1], [0, 1]]],
  [[[0, -1], [0, 1]], [[-0.55, -0.6], [0, -0.05], [0.55, -0.6]]],
  [[[0, -1], [0, 1]], [[-0.5, -0.45], [0, -1], [0.5, -0.45]]],
  [[[0.35, -1], [-0.3, -0.25], [0.3, 0.25], [-0.35, 1]]],
  // hagalaz
  [[[-0.4, -1], [-0.4, 1]], [[0.4, -1], [0.4, 1]], [[-0.4, -0.25], [0.4, 0.25]]],
];

function rune(ctx: Ctx, i: number, x: number, y: number, s: number): void {
  ctx.beginPath();
  for (const seg of RUNES[i % RUNES.length]) seg.forEach(([px, py], k) => (k ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)));
}

// ——— Fenrir: Gleipnir ———

/** One silvery chain link in side or face view (an elongated ring), with faint runes. */
function link(ctx: Ctx, x: number, y: number, rx: number, ry: number, face: boolean, glow = '#bfe6ff'): void {
  if (face) {
    // a ring seen face-on: thick outer ellipse with a hole
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.ellipse(x, y, rx * 0.45, ry * 0.62, 0, 0, Math.PI * 2, true);
    ctx.fillStyle = lin(ctx, x - rx, 0, x + rx, 0, [[0, '#6a7486'], [0.3, '#e8f2ff'], [0.55, '#a8b8cc'], [1, '#4a5466']]);
    ctx.fill('evenodd');
    stroke(ctx, 4);
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.62, y - ry * 0.1, rx * 0.12, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#ffffff', 0.7);
    ctx.fill();
    ctx.save();
    rune(ctx, 6, x + rx * 0.72, y, ry * 0.22);
    glowStroke(ctx, glow, '#ffffff', 2, 8);
    ctx.restore();
  } else {
    // edge-on: a slim bar
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.32, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = lin(ctx, x - rx * 0.32, 0, x + rx * 0.32, 0, [[0, '#56606e'], [0.45, '#dfeaf8'], [1, '#424a58']]);
    ctx.fill();
    stroke(ctx, 4);
  }
}

/** Tileable chain: links at y = 0 (half above the top), 64 and 128 alternate face / edge. */
function gleipnir(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(72, 128);
  // a faint magic thread through the middle
  ctx.fillStyle = rgba('#bfe6ff', 0.25);
  ctx.fillRect(33, 0, 6, 128);
  link(ctx, 36, 0, 30, 40, true);
  link(ctx, 36, 128, 30, 40, true);
  link(ctx, 36, 64, 30, 40, false);
  return c;
}

function chainLink(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(170, 120);
  // glow under it
  ctx.fillStyle = rad(ctx, 85, 64, 80, [[0, rgba('#bfe6ff', 0.55)], [1, rgba('#bfe6ff', 0)]]);
  ctx.fillRect(0, 0, 170, 120);
  ctx.save();
  ctx.translate(85, 60);
  ctx.rotate(-0.25);
  // a big broken link: a thick oval with a gap at the right
  ctx.beginPath();
  ctx.ellipse(0, 0, 66, 38, 0, 0.35, Math.PI * 2 - 0.35);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 66, 38, 0, 0.35, Math.PI * 2 - 0.35);
  ctx.strokeStyle = lin(ctx, 0, -40, 0, 40, [[0, '#f4f9ff'], [0.4, '#a8b8cc'], [1, '#4a5466']]);
  ctx.lineWidth = 17;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -2, 60, 32, 0, 3.6, 5.6);
  ctx.strokeStyle = rgba('#ffffff', 0.8);
  ctx.lineWidth = 4;
  ctx.stroke();
  // glowing runes along it
  for (const [i, a] of [[0, 2.2], [5, 3.3], [6, 4.4]] as const) {
    rune(ctx, i, Math.cos(a) * 66, Math.sin(a) * 38, 6);
    glowStroke(ctx, '#7fd8ff', '#ffffff', 2, 8);
  }
  ctx.restore();
  // sparkles at the break
  ctx.save();
  ctx.shadowColor = '#bfe6ff';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  for (const [x, y, s] of [[146, 40, 5], [154, 60, 3.5], [140, 70, 3]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return c;
}

function shackle(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 110);
  const band = () => {
    ctx.beginPath();
    ctx.moveTo(14, 22);
    ctx.quadraticCurveTo(130, 54, 246, 22);
    ctx.lineTo(246, 78);
    ctx.quadraticCurveTo(130, 110, 14, 78);
    ctx.closePath();
  };
  band();
  ctx.fillStyle = lin(ctx, 0, 22, 0, 100, [[0, '#dfe6ee'], [0.35, '#7a8494'], [1, '#2c3038']]);
  ctx.fill();
  stroke(ctx, 5);
  // rivets at the ends
  for (const x of [30, 230]) {
    ctx.beginPath();
    ctx.arc(x, 52, 8, 0, Math.PI * 2);
    ctx.fillStyle = lin(ctx, 0, 44, 0, 60, [[0, '#ffffff'], [1, '#6a7280']]);
    ctx.fill();
    stroke(ctx, 3);
  }
  for (let i = 0; i < 5; i++) {
    const x = 66 + i * 32;
    const y = 62 + Math.sin(((x - 14) / 232) * Math.PI) * 14;
    rune(ctx, [0, 2, 6, 5, 7][i], x, y, 13);
    glowStroke(ctx, '#7fd8ff', '#ffffff', 3.5, 10);
  }
  ctx.save();
  band();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(14, 30);
  ctx.quadraticCurveTo(130, 62, 246, 30);
  ctx.strokeStyle = rgba('#ffffff', 0.6);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  return c;
}

// ——— Thrym: the ice fortress ———

function iceFill(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  return lin(ctx, x0, y0, x1, y1, [[0, '#f2fbff'], [0.35, '#bfe6fa'], [0.7, '#7cc0e8'], [1, '#4a8ac0']]);
}

function blockPath(ctx: Ctx): void {
  // a crenellated ice brick: three merlons on top
  poly(ctx, [
    [10, 140], [10, 46], [34, 46], [34, 18], [66, 18], [66, 46], [76, 46], [76, 14], [104, 14], [104, 46], [114, 46], [114, 18], [146, 18], [146, 46], [170, 46], [170, 140],
  ]);
}

function iceBlock(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(180, 150);
  blockPath(ctx);
  ctx.fillStyle = iceFill(ctx, 10, 14, 170, 140);
  ctx.fill();
  ctx.save();
  blockPath(ctx);
  ctx.clip();
  // brick courses
  ctx.strokeStyle = rgba('#2e5a7a', 0.45);
  ctx.lineWidth = 3;
  for (const y of [78, 110]) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(170, y);
    ctx.stroke();
  }
  for (const [x, y0, y1] of [[90, 46, 78], [50, 78, 110], [130, 78, 110], [90, 110, 140]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
  // facets
  const r = seeded(11);
  for (let i = 0; i < 8; i++) {
    const x = 10 + r() * 150;
    const y = 20 + r() * 110;
    poly(ctx, [[x, y], [x + 26, y + 6], [x + 10, y + 26]]);
    ctx.fillStyle = rgba('#ffffff', 0.18);
    ctx.fill();
  }
  // a carved rune that glows faintly
  rune(ctx, 8, 90, 94, 22);
  glowStroke(ctx, '#6fd0ff', '#e8fbff', 5, 12);
  // snow on the merlons
  ctx.fillStyle = '#ffffff';
  for (const [x0, x1, y] of [[34, 66, 18], [76, 104, 14], [114, 146, 18]] as const) {
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, y + 2, (x1 - x0) / 2 + 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // shade the right, light the left edge
  ctx.fillStyle = lin(ctx, 10, 0, 170, 0, [[0, rgba('#ffffff', 0.35)], [0.2, rgba('#ffffff', 0)], [0.8, rgba('#000000', 0)], [1, rgba('#0a2a4a', 0.3)]]);
  ctx.fillRect(0, 0, 180, 150);
  ctx.restore();
  blockPath(ctx);
  stroke(ctx, 5, '#1e3a52');
  shine(ctx, 28, 80, 5, 26, 0.7, 0);
  return c;
}

function iceCrack(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(180, 150);
  const r = seeded(29);
  const branch = (x: number, y: number, a: number, len: number, depth: number) => {
    const x1 = x + Math.cos(a) * len;
    const y1 = y + Math.sin(a) * len;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = '#1e3a52';
    ctx.lineWidth = 5 - depth;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.9);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 1.5, y - 1.5);
    ctx.lineTo(x1 - 1.5, y1 - 1.5);
    ctx.stroke();
    if (depth < 3) {
      branch(x1, y1, a + (r() - 0.5) * 1.2, len * 0.7, depth + 1);
      if (r() < 0.7) branch(x1, y1, a + (r() < 0.5 ? 0.8 : -0.8), len * 0.55, depth + 1);
    }
  };
  for (let i = 0; i < 5; i++) branch(92, 84, (i / 5) * Math.PI * 2 + 0.3, 26, 0);
  // the impact star
  ctx.beginPath();
  ctx.arc(92, 84, 7, 0, Math.PI * 2);
  ctx.fillStyle = rgba('#ffffff', 0.85);
  ctx.fill();
  return c;
}

function iceCase(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(420, 250);
  // a faceted dome over a pizza (pizza seen in perspective: ~ 330x110 ellipse at the bottom)
  const outline: P[] = [[18, 196], [30, 120], [82, 62], [160, 26], [262, 26], [340, 62], [392, 120], [404, 196], [350, 232], [210, 244], [70, 232]];
  poly(ctx, outline);
  ctx.fillStyle = lin(ctx, 0, 20, 0, 244, [[0, rgba('#f2fbff', 0.75)], [0.5, rgba('#a8dcfa', 0.55)], [1, rgba('#6aaee0', 0.62)]]);
  ctx.fill();
  ctx.save();
  poly(ctx, outline);
  ctx.clip();
  // facet planes: alternate lighter / darker so the shell reads as cut ice
  const facets: P[][] = [
    [[30, 120], [82, 62], [130, 150]], [[82, 62], [160, 26], [130, 150]], [[160, 26], [262, 26], [210, 140]], [[262, 26], [340, 62], [290, 150]],
    [[340, 62], [392, 120], [290, 150]], [[18, 196], [30, 120], [130, 150], [70, 232]], [[130, 150], [210, 140], [290, 150], [210, 244]], [[290, 150], [392, 120], [404, 196], [350, 232]],
  ];
  facets.forEach((f, i) => {
    poly(ctx, f);
    ctx.fillStyle = rgba(i % 2 ? '#ffffff' : '#2e6a9a', i % 2 ? 0.18 : 0.12);
    ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.6);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });
  // frost bloom at the base
  ctx.fillStyle = lin(ctx, 0, 180, 0, 244, [[0, rgba('#ffffff', 0)], [1, rgba('#ffffff', 0.55)]]);
  ctx.fillRect(0, 180, 420, 70);
  const r = seeded(5);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rgba('#ffffff', 0.5 + r() * 0.5);
    ctx.beginPath();
    ctx.arc(30 + r() * 360, 30 + r() * 210, 1.5 + r() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  poly(ctx, outline);
  stroke(ctx, 6, '#1e3a52');
  shine(ctx, 110, 80, 14, 40, 0.6, 0.9);
  shine(ctx, 150, 52, 22, 7, 0.65, -0.35);
  return c;
}

function keystone(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 300);
  // halo
  ctx.fillStyle = rad(ctx, 130, 150, 130, [[0, rgba('#9ae4ff', 0.6)], [1, rgba('#9ae4ff', 0)]]);
  ctx.fillRect(0, 0, 260, 300);
  const out: P[] = [[130, 14], [212, 96], [196, 238], [130, 288], [64, 238], [48, 96]];
  poly(ctx, out);
  ctx.fillStyle = iceFill(ctx, 48, 14, 212, 288);
  ctx.fill();
  // facets from the centre
  const ctr: P = [130, 150];
  out.forEach((p, i) => {
    const q = out[(i + 1) % out.length];
    poly(ctx, [ctr, p, q]);
    ctx.fillStyle = rgba(i % 2 ? '#ffffff' : '#1e4a7a', i % 2 ? 0.22 : 0.16);
    ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.55);
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  poly(ctx, out);
  stroke(ctx, 6, '#1e3a52');
  // Thrym's rune, burning cold
  rune(ctx, 6, 130, 158, 54);
  glowStroke(ctx, '#5fd8ff', '#ffffff', 10, 22);
  shine(ctx, 92, 92, 8, 30, 0.75, 0.6);
  return c;
}

function hail(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 170);
  // speed streaks above it
  ctx.strokeStyle = rgba('#e8f8ff', 0.6);
  ctx.lineCap = 'round';
  for (const [x, l] of [[40, 40], [60, 56], [80, 36]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x, 6 + l);
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  const shard: P[] = [[60, 164], [22, 70], [36, 40], [62, 30], [88, 44], [98, 72]];
  poly(ctx, shard);
  ctx.fillStyle = lin(ctx, 22, 0, 98, 0, [[0, '#f4fbff'], [0.45, '#bfe6fa'], [1, '#5a9ad0']]);
  ctx.fill();
  poly(ctx, [[60, 164], [36, 40], [62, 30]]);
  ctx.fillStyle = rgba('#ffffff', 0.3);
  ctx.fill();
  poly(ctx, [[60, 164], [88, 44], [98, 72]]);
  ctx.fillStyle = rgba('#1e4a7a', 0.2);
  ctx.fill();
  poly(ctx, shard);
  stroke(ctx, 5, '#1e3a52');
  shine(ctx, 46, 74, 4, 20, 0.8, 0.3);
  return c;
}

// ——— Jörmungandr: his venom (his body is painted in src/content/art/jormungandr.ts) ———

function venom(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 120);
  ctx.fillStyle = rad(ctx, 60, 60, 58, [[0, rgba('#a8ff5a', 0.5)], [1, rgba('#a8ff5a', 0)]]);
  ctx.fillRect(0, 0, 120, 120);
  ctx.beginPath();
  ctx.moveTo(60, 18);
  ctx.bezierCurveTo(76, 40, 94, 56, 92, 76);
  ctx.bezierCurveTo(90, 98, 74, 106, 60, 106);
  ctx.bezierCurveTo(44, 106, 28, 98, 28, 76);
  ctx.bezierCurveTo(28, 56, 46, 40, 60, 18);
  ctx.closePath();
  ctx.fillStyle = rad(ctx, 50, 66, 50, [[0, '#d8ff8a'], [0.5, '#6ad62a'], [1, '#2a7a10']], 2);
  ctx.fill();
  stroke(ctx, 5, '#173a08');
  // bubbles
  for (const [x, y, s] of [[70, 84, 6], [48, 90, 4], [66, 60, 3]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.strokeStyle = rgba('#eaffc8', 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  shine(ctx, 46, 62, 6, 12, 0.75, 0.4);
  return c;
}

// ——— Surtr: fire ———

function flamePath(ctx: Ctx, x: number, base: number, h: number, w: number, lean: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w, base);
  ctx.bezierCurveTo(x - w * 1.05, base - h * 0.45, x + lean - w * 0.35, base - h * 0.72, x + lean, base - h);
  ctx.bezierCurveTo(x + lean + w * 0.25, base - h * 0.62, x + w * 1.05, base - h * 0.42, x + w, base);
  ctx.closePath();
}

/** A layered flame: outer red-orange, mid orange-yellow, white-hot core. */
function flame(ctx: Ctx, x: number, base: number, h: number, w: number, lean: number, ol = true): void {
  flamePath(ctx, x, base, h, w, lean);
  ctx.fillStyle = lin(ctx, 0, base - h, 0, base, [[0, '#ffb020'], [0.5, '#ff6a10'], [1, '#c8280a']]);
  ctx.fill();
  if (ol) stroke(ctx, 4, '#5a1006');
  flamePath(ctx, x + lean * 0.12, base, h * 0.7, w * 0.62, lean * 0.6);
  ctx.fillStyle = lin(ctx, 0, base - h * 0.7, 0, base, [[0, '#ffe680'], [1, '#ff9a1a']]);
  ctx.fill();
  flamePath(ctx, x + lean * 0.2, base, h * 0.4, w * 0.3, lean * 0.3);
  ctx.fillStyle = '#fffbe0';
  ctx.fill();
}

function fireball(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 210);
  ctx.fillStyle = rad(ctx, 75, 150, 75, [[0, rgba('#ff9a1a', 0.55)], [1, rgba('#ff9a1a', 0)]]);
  ctx.fillRect(0, 60, 150, 150);
  // the tail: flames streaming up
  flame(ctx, 75, 168, 160, 46, 0);
  flame(ctx, 52, 150, 100, 20, -10);
  flame(ctx, 100, 150, 110, 20, 12);
  // the burning rock core
  ctx.beginPath();
  ctx.arc(75, 158, 36, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 64, 146, 40, [[0, '#ffe8a0'], [0.4, '#ff8a1a'], [1, '#8a2a0a']]);
  ctx.fill();
  stroke(ctx, 5, '#3a0a04');
  // cracks
  ctx.beginPath();
  ctx.moveTo(56, 146);
  ctx.lineTo(70, 160);
  ctx.lineTo(64, 178);
  ctx.moveTo(70, 160);
  ctx.lineTo(92, 164);
  ctx.strokeStyle = '#3a0a04';
  ctx.lineWidth = 3;
  ctx.stroke();
  shine(ctx, 62, 142, 9, 6, 0.75, -0.5);
  return c;
}

function pizzaFlame(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(360, 280);
  const base = 238;
  // heat glow
  ctx.fillStyle = rad(ctx, 180, base, 170, [[0, rgba('#ff8a1a', 0.5)], [1, rgba('#ff8a1a', 0)]]);
  ctx.fillRect(0, 60, 360, 220);
  const r = seeded(41);
  // back row (taller, darker) then front row
  const back: [number, number, number, number][] = [[70, 150, 34, -8], [130, 200, 40, 6], [190, 226, 44, -4], [250, 190, 40, 8], [300, 140, 32, 10]];
  for (const [x, h, w, l] of back) flame(ctx, x, base, h, w, l);
  const front: [number, number, number, number][] = [[40, 90, 30, -10], [100, 120, 32, 4], [160, 140, 36, -6], [220, 130, 34, 6], [280, 110, 32, -4], [326, 80, 26, 8]];
  for (const [x, h, w, l] of front) flame(ctx, x, base + 10, h, w, l);
  // embers floating up
  ctx.save();
  ctx.shadowColor = '#ff8a1a';
  ctx.shadowBlur = 8;
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = r() < 0.5 ? '#ffe080' : '#ff7a1a';
    ctx.beginPath();
    ctx.arc(30 + r() * 300, 10 + r() * 120, 2 + r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return c;
}

function fuse(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 150);
  ctx.fillStyle = rad(ctx, 70, 104, 70, [[0, rgba('#ffb040', 0.7)], [1, rgba('#ffb040', 0)]]);
  ctx.fillRect(0, 0, 140, 150);
  // trailing sparks to the left
  ctx.save();
  ctx.shadowColor = '#ffb040';
  ctx.shadowBlur = 8;
  const r = seeded(77);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = r() < 0.5 ? '#fff2a0' : '#ff8a1a';
    ctx.beginPath();
    ctx.arc(6 + r() * 50, 70 + r() * 60, 1.5 + r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  flame(ctx, 70, 126, 110, 34, 10);
  flame(ctx, 48, 126, 64, 18, 6);
  flame(ctx, 96, 126, 72, 18, 14);
  // the white-hot core where it bites the wood
  ctx.beginPath();
  ctx.ellipse(72, 124, 30, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 72, 124, 30, [[0, '#ffffff'], [0.5, '#ffe080'], [1, '#ff6a10']]);
  ctx.fill();
  stroke(ctx, 4, '#5a1006');
  return c;
}

function sword(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 980);
  const cx = 120;
  const hilt = 830; // the crossguard
  // fire licking up both edges of the blade (behind the blade)
  for (let i = 0; i < 12; i++) {
    const y = hilt - 40 - i * 62;
    const w = 30 - i * 1.4;
    const k = 1 - i / 14;
    flame(ctx, cx - 50 + i * 2, y, 120 * k + 30, w, -22, true);
    flame(ctx, cx + 50 - i * 2, y + 30, 120 * k + 30, w, 22, true);
  }
  flame(ctx, cx, 90, 90, 26, 0);
  // the blade: dark iron with a molten edge
  const blade = () => {
    ctx.beginPath();
    ctx.moveTo(cx - 32, hilt);
    ctx.lineTo(cx - 36, 160);
    ctx.lineTo(cx, 40);
    ctx.lineTo(cx + 36, 160);
    ctx.lineTo(cx + 32, hilt);
    ctx.closePath();
  };
  blade();
  ctx.save();
  ctx.shadowColor = '#ff6a10';
  ctx.shadowBlur = 30;
  ctx.fillStyle = lin(ctx, cx - 36, 0, cx + 36, 0, [[0, '#ff8a1a'], [0.12, '#3a1a14'], [0.45, '#5a3a34'], [0.55, '#2a1210'], [0.88, '#1a0a08'], [1, '#ff6a10']]);
  ctx.fill();
  ctx.restore();
  blade();
  stroke(ctx, 6, '#1a0604');
  // the fuller and its glowing runes
  ctx.beginPath();
  ctx.moveTo(cx, hilt - 20);
  ctx.lineTo(cx, 170);
  ctx.strokeStyle = '#120604';
  ctx.lineWidth = 10;
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    rune(ctx, [3, 7, 1, 6, 0, 5][i], cx, hilt - 90 - i * 100, 22);
    glowStroke(ctx, '#ff7a10', '#fff2b0', 4.5, 14);
  }
  // molten edge highlights
  for (const d of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + d * 30, hilt - 10);
    ctx.lineTo(cx + d * 33, 165);
    ctx.lineTo(cx + d * 4, 52);
    glowStroke(ctx, '#ff9a1a', '#fff6c0', 3, 12);
  }
  // crossguard
  ctx.beginPath();
  ctx.moveTo(cx - 108, hilt - 4);
  ctx.quadraticCurveTo(cx, hilt - 30, cx + 108, hilt - 4);
  ctx.lineTo(cx + 96, hilt + 26);
  ctx.quadraticCurveTo(cx, hilt + 6, cx - 96, hilt + 26);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, hilt - 30, 0, hilt + 26, [[0, '#8a5a3a'], [0.5, '#3a1a10'], [1, '#1a0806']]);
  ctx.fill();
  stroke(ctx, 5, '#1a0604');
  for (const d of [-1, 1] as const) {
    ctx.beginPath();
    ctx.arc(cx + d * 104, hilt + 10, 14, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, cx + d * 104, hilt + 10, 14, [[0, '#ffe080'], [1, '#ff4a10']]);
    ctx.fill();
    stroke(ctx, 4, '#1a0604');
  }
  // grip and pommel
  ctx.beginPath();
  ctx.rect(cx - 15, hilt + 22, 30, 96);
  ctx.fillStyle = lin(ctx, cx - 15, 0, cx + 15, 0, [[0, '#2a1410'], [0.4, '#5a3020'], [1, '#1a0806']]);
  ctx.fill();
  stroke(ctx, 4.5, '#1a0604');
  for (let y = hilt + 34; y < hilt + 116; y += 14) {
    ctx.beginPath();
    ctx.moveTo(cx - 15, y);
    ctx.lineTo(cx + 15, y + 8);
    ctx.strokeStyle = rgba('#000000', 0.5);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, hilt + 132, 20, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, cx - 5, hilt + 126, 22, [[0, '#fff2b0'], [0.4, '#ff8a1a'], [1, '#6a1a08']]);
  ctx.fill();
  stroke(ctx, 5, '#1a0604');
  return c;
}

function runeDisc(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 200);
  ctx.fillStyle = rad(ctx, 100, 100, 100, [[0.55, rgba('#ffd23f', 0.6)], [1, rgba('#ffd23f', 0)]]);
  ctx.fillRect(0, 0, 200, 200);
  // a carved stone disc
  ctx.beginPath();
  ctx.arc(100, 100, 74, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 80, 78, 90, [[0, '#9a948a'], [0.6, '#6a645c'], [1, '#3a3630']]);
  ctx.fill();
  stroke(ctx, 6);
  // an inner ring of tiny runes
  ctx.beginPath();
  ctx.arc(100, 100, 58, 0, Math.PI * 2);
  stroke(ctx, 3, rgba(INK, 0.6));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rune(ctx, i, 100 + Math.cos(a) * 66, 100 + Math.sin(a) * 66, 5);
    glowStroke(ctx, '#ffb020', '#fff6c0', 1.6, 6);
  }
  // the big rune: sowilo (the sun), blazing gold
  rune(ctx, 7, 100, 100, 40);
  glowStroke(ctx, '#ffb020', '#fffbe0', 12, 26);
  ctx.beginPath();
  ctx.arc(100, 100, 74, Math.PI * 1.1, Math.PI * 1.5);
  ctx.strokeStyle = rgba('#ffffff', 0.45);
  ctx.lineWidth = 5;
  ctx.stroke();
  return c;
}

function swordArc(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(900, 300);
  // a crescent of fire: outer arc wide at the middle, tapering to points at both ends
  const cres = (inset: number) => {
    ctx.beginPath();
    ctx.moveTo(20 + inset, 250 - inset * 0.2);
    ctx.quadraticCurveTo(450, -120 + inset * 1.6, 880 - inset, 250 - inset * 0.2);
    ctx.quadraticCurveTo(450, 90 + inset * 0.9, 20 + inset, 250 - inset * 0.2);
    ctx.closePath();
  };
  ctx.save();
  ctx.shadowColor = '#ff6a10';
  ctx.shadowBlur = 30;
  cres(0);
  ctx.fillStyle = lin(ctx, 0, 0, 0, 260, [[0, '#ffd060'], [0.4, '#ff7a10'], [1, '#a0200a']]);
  ctx.fill();
  ctx.restore();
  cres(0);
  stroke(ctx, 6, '#4a0a04');
  cres(40);
  ctx.fillStyle = lin(ctx, 0, 40, 0, 220, [[0, '#fff2a0'], [1, '#ffb020']]);
  ctx.fill();
  cres(80);
  ctx.fillStyle = '#fffbe8';
  ctx.fill();
  // flame tongues trailing off the back edge
  const r = seeded(13);
  for (let i = 0; i < 14; i++) {
    const t = 0.08 + (i / 13) * 0.84;
    const x = 20 + t * 860;
    const y = 250 - Math.sin(t * Math.PI) * 130 + 60;
    flame(ctx, x, y + 6, 40 + r() * 40, 14 + r() * 8, (t - 0.5) * 40, false);
  }
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_gleipnir: gleipnir,
  p_chainlink: chainLink,
  p_shackle: shackle,
  p_iceblock: iceBlock,
  p_icecrack: iceCrack,
  p_icecase: iceCase,
  p_keystone: keystone,
  p_hail: hail,
  p_venom: venom,
  p_fireball: fireball,
  p_pizzaflame: pizzaFlame,
  p_fuse: fuse,
  p_sword: sword,
  p_rune: runeDisc,
  p_swordarc: swordArc,
};
