// Props for the Act 8 · Norse fights (src/game/bosses/act8.ts): Fenrir's chain Gleipnir, Thrym's ice
// fortress and ice shells, Jörmungandr's coils, head and venom, and Surtr's fire, fuse, sword and the
// counter rune. Same style as src/art/eventArt.ts: thick ink outlines, gradients, a sheen.
import { type Ctx, ellipse, makeCanvas, rgba, shade } from '../../art/util';

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

// ——— Jörmungandr ———

const SCALE = '#2f6e56';
const SCALE_LT = '#4f9a74';
const BELLY = '#e8dcaa';

/** Scales painted inside the current clip. */
function scales(ctx: Ctx, x0: number, y0: number, w: number, h: number, size = 14): void {
  for (let row = 0; row * size * 0.7 < h + size; row++) {
    const y = y0 + row * size * 0.7;
    for (let col = 0; col * size < w + size; col++) {
      const x = x0 + col * size + (row % 2) * size * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.55, 0, Math.PI);
      ctx.fillStyle = rgba('#ffffff', 0.08 + ((x - x0) / w < 0.4 ? 0.08 : 0));
      ctx.fill();
      ctx.strokeStyle = rgba('#0e2a20', 0.5);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }
}

function coil(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(340, 170);
  const hump = () => {
    ctx.beginPath();
    ctx.moveTo(0, 170);
    ctx.bezierCurveTo(30, 170, 60, 34, 170, 30);
    ctx.bezierCurveTo(280, 34, 310, 170, 340, 170);
    ctx.lineTo(300, 170);
    ctx.bezierCurveTo(280, 120, 250, 86, 170, 84);
    ctx.bezierCurveTo(90, 86, 60, 120, 40, 170);
    ctx.closePath();
  };
  hump();
  ctx.fillStyle = lin(ctx, 0, 30, 0, 110, [[0, SCALE_LT], [0.6, SCALE], [1, shade(SCALE, -0.4)]]);
  ctx.fill();
  ctx.save();
  hump();
  ctx.clip();
  scales(ctx, 0, 20, 340, 150, 16);
  // the cream belly runs along the inside of the arch
  ctx.beginPath();
  ctx.moveTo(30, 170);
  ctx.bezierCurveTo(56, 110, 90, 70, 170, 68);
  ctx.bezierCurveTo(250, 70, 284, 110, 310, 170);
  ctx.lineTo(300, 170);
  ctx.bezierCurveTo(280, 120, 250, 86, 170, 84);
  ctx.bezierCurveTo(90, 86, 60, 120, 40, 170);
  ctx.closePath();
  ctx.fillStyle = BELLY;
  ctx.fill();
  ctx.strokeStyle = rgba('#8a7a4a', 0.7);
  ctx.lineWidth = 2;
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const a = Math.PI * (1 - t);
    ctx.beginPath();
    ctx.moveTo(170 + Math.cos(a) * 138, 170 - Math.sin(a) * 98);
    ctx.lineTo(170 + Math.cos(a) * 128, 170 - Math.sin(a) * 86);
    ctx.stroke();
  }
  // a top highlight
  ctx.beginPath();
  ctx.moveTo(60, 120);
  ctx.bezierCurveTo(90, 50, 140, 40, 170, 40);
  ctx.strokeStyle = rgba('#ffffff', 0.3);
  ctx.lineWidth = 8;
  ctx.stroke();
  // fade the ends into the table edge
  ctx.fillStyle = lin(ctx, 0, 130, 0, 170, [[0, rgba('#0e2a20', 0)], [1, rgba('#0e2a20', 0.55)]]);
  ctx.fillRect(0, 130, 340, 40);
  ctx.restore();
  hump();
  stroke(ctx, 5, '#0e2a20');
  // dorsal spines along the crest
  for (let i = 0; i < 7; i++) {
    const t = 0.2 + (i / 6) * 0.6;
    const a = Math.PI * (1 - t);
    const x = 170 + Math.cos(a) * 140;
    const y = 160 - Math.sin(a) * 124;
    const nx = Math.cos(a);
    const ny = -Math.sin(a);
    poly(ctx, [[x - ny * 10, y + nx * 10], [x + nx * 26, y + ny * 26], [x + ny * 10, y - nx * 10]]);
    ctx.fillStyle = lin(ctx, x, y, x + nx * 26, y + ny * 26, [[0, '#c8b45a'], [1, '#f4e8b0']]);
    ctx.fill();
    stroke(ctx, 3, '#0e2a20');
  }
  return c;
}

/** The serpent's head from the front. open = lunging, mouth wide. */
function serpentHead(open: boolean): HTMLCanvasElement {
  const W = 300;
  const H = open ? 320 : 280;
  const [c, ctx] = makeCanvas(W, H);
  const cx = 150;
  // horns and frills behind the head
  for (const d of [-1, 1] as const) {
    poly(ctx, [[cx + d * 60, 70], [cx + d * 140, 8], [cx + d * 118, 54], [cx + d * 96, 96]]);
    ctx.fillStyle = lin(ctx, 0, 8, 0, 96, [[0, '#f4e8c0'], [1, '#9a8a5a']]);
    ctx.fill();
    stroke(ctx, 4);
    // a webbed frill
    poly(ctx, [[cx + d * 78, 110], [cx + d * 146, 96], [cx + d * 138, 132], [cx + d * 146, 162], [cx + d * 78, 160]]);
    ctx.fillStyle = lin(ctx, cx + d * 78, 0, cx + d * 146, 0, [[0, '#3f8a6a'], [1, '#b84a3a']]);
    ctx.fill();
    stroke(ctx, 4);
    for (const y of [112, 132, 150]) {
      ctx.beginPath();
      ctx.moveTo(cx + d * 80, y + 4);
      ctx.lineTo(cx + d * 140, y - 4);
      ctx.strokeStyle = rgba('#0e2a20', 0.6);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  const jaw = open ? 120 : 0;
  // lower jaw (open only): dropped down and round, the mouth gaping inside it
  if (open) {
    ctx.beginPath();
    ctx.ellipse(cx, 236, 76, 78, 0, 0, Math.PI * 2);
    ctx.fillStyle = lin(ctx, 0, 160, 0, 316, [[0, SCALE], [1, shade(SCALE, -0.35)]]);
    ctx.fill();
    ctx.save();
    ctx.clip();
    scales(ctx, cx - 80, 160, 160, 160, 16);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(cx, 236, 76, 78, 0, 0, Math.PI * 2);
    stroke(ctx, 5, '#0e2a20');
    // mouth interior
    ctx.beginPath();
    ctx.ellipse(cx, 238, 58, 62, 0, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, cx, 222, 70, [[0, '#2a0a12'], [0.55, '#7a1424'], [1, '#d0485a']]);
    ctx.fill();
    stroke(ctx, 4, '#2a0a12');
    // the tongue, forked, curling out
    ctx.beginPath();
    ctx.moveTo(cx, 296);
    ctx.quadraticCurveTo(cx + 14, 262, cx - 2, 236);
    ctx.moveTo(cx - 2, 236);
    ctx.lineTo(cx - 16, 220);
    ctx.moveTo(cx - 2, 236);
    ctx.lineTo(cx + 10, 218);
    stroke(ctx, 10, '#2a0a12');
    ctx.strokeStyle = '#e8405a';
    ctx.lineWidth = 5.5;
    ctx.stroke();
    // lower fangs pointing up
    for (const d of [-1, 1] as const) {
      poly(ctx, [[cx + d * 44, 290], [cx + d * 38, 254], [cx + d * 30, 292]]);
      ctx.fillStyle = '#fffbe8';
      ctx.fill();
      stroke(ctx, 3);
    }
  }
  // the head: a broad wedge, wider at the back
  const head = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - 84, 80);
    ctx.bezierCurveTo(cx - 100, 140, cx - 74, 190 - jaw * 0.25, cx - 40, 214 - jaw * 0.3);
    ctx.quadraticCurveTo(cx, 236 - jaw * 0.32, cx + 40, 214 - jaw * 0.3);
    ctx.bezierCurveTo(cx + 74, 190 - jaw * 0.25, cx + 100, 140, cx + 84, 80);
    ctx.bezierCurveTo(cx + 60, 40, cx - 60, 40, cx - 84, 80);
    ctx.closePath();
  };
  // upper fangs hang from the head
  for (const d of [-1, 1] as const) {
    const fy = open ? 184 : 206;
    poly(ctx, [[cx + d * 30, fy - 8], [cx + d * 25, fy + 44], [cx + d * 16, fy - 6]]);
    ctx.fillStyle = lin(ctx, 0, fy, 0, fy + 44, [[0, '#ffffff'], [1, '#d8d0b0']]);
    ctx.fill();
    stroke(ctx, 3.5);
    if (open) {
      // venom drips
      ctx.beginPath();
      ctx.moveTo(cx + d * 25, fy + 44);
      ctx.quadraticCurveTo(cx + d * 22, fy + 60, cx + d * 25, fy + 70);
      ctx.strokeStyle = '#8aef4a';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + d * 25, fy + 74, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#8aef4a';
      ctx.fill();
      stroke(ctx, 2, '#2a5a10');
    }
  }
  head();
  ctx.fillStyle = lin(ctx, cx - 100, 0, cx + 100, 0, [[0, shade(SCALE, -0.2)], [0.3, SCALE_LT], [0.6, SCALE], [1, shade(SCALE, -0.45)]]);
  ctx.fill();
  ctx.save();
  head();
  ctx.clip();
  scales(ctx, cx - 100, 40, 200, 200, 16);
  // the brow ridge in shadow, snout lit
  ctx.fillStyle = lin(ctx, 0, 60, 0, 120, [[0, rgba('#0e2a20', 0.35)], [1, rgba('#0e2a20', 0)]]);
  ctx.fillRect(0, 40, W, 80);
  ctx.restore();
  head();
  stroke(ctx, 5.5, '#0e2a20');
  // nostrils
  const ny = open ? 172 : 196;
  for (const d of [-1, 1] as const) {
    ellipse(ctx, cx + d * 14, ny, 5, 8, d * 0.3);
    ctx.fillStyle = '#0e1a14';
    ctx.fill();
  }
  // glowing eyes with slit pupils and a horned brow
  for (const d of [-1, 1] as const) {
    const ex = cx + d * 46;
    const ey = open ? 104 : 112;
    ctx.save();
    ctx.shadowColor = '#ffe060';
    ctx.shadowBlur = 22;
    ellipse(ctx, ex, ey, 22, 15, d * 0.35);
    ctx.fillStyle = lin(ctx, 0, ey - 15, 0, ey + 15, [[0, '#fff8b0'], [1, '#e8b820']]);
    ctx.fill();
    ctx.restore();
    ellipse(ctx, ex, ey, 22, 15, d * 0.35);
    stroke(ctx, 4);
    ellipse(ctx, ex, ey, 4.5, 13, d * 0.2);
    ctx.fillStyle = '#10140c';
    ctx.fill();
    ellipse(ctx, ex - 8, ey - 6, 4, 3);
    ctx.fillStyle = rgba('#ffffff', 0.85);
    ctx.fill();
    // angry brow plate
    poly(ctx, [[ex - d * 26, ey - 16], [ex + d * 30, ey - 30], [ex + d * 22, ey - 12]]);
    ctx.fillStyle = shade(SCALE, -0.4);
    ctx.fill();
    stroke(ctx, 3, '#0e2a20');
  }
  // closed mouth line with a sly curl
  if (!open) {
    ctx.beginPath();
    ctx.moveTo(cx - 62, 178);
    ctx.quadraticCurveTo(cx, 214, cx + 62, 178);
    stroke(ctx, 4.5, '#0e1a14');
  }
  shine(ctx, cx - 44, 72, 18, 8, 0.4, -0.3);
  return c;
}

function serpentNeck(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 128);
  // body column (seamless top/bottom: everything is straight vertical bands plus a 128px-periodic pattern)
  ctx.fillStyle = lin(ctx, 8, 0, 142, 0, [[0, shade(SCALE, -0.3)], [0.25, SCALE_LT], [0.55, SCALE], [1, shade(SCALE, -0.5)]]);
  ctx.fillRect(8, 0, 134, 128);
  ctx.save();
  ctx.beginPath();
  ctx.rect(8, 0, 134, 128);
  ctx.clip();
  // scales: rows every 16 px, so 8 rows tile the 128 height exactly
  for (let row = -1; row < 9; row++) {
    const y = row * 16;
    for (let col = 0; col < 9; col++) {
      const x = 8 + col * 18 + (row % 2 ? 9 : 0);
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI);
      ctx.fillStyle = rgba('#ffffff', 0.08);
      ctx.fill();
      ctx.strokeStyle = rgba('#0e2a20', 0.5);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }
  // belly plates down the front: 4 per tile
  for (let i = 0; i < 5; i++) {
    const y = i * 32;
    ctx.beginPath();
    ctx.ellipse(75, y, 34, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = lin(ctx, 0, y - 14, 0, y + 14, [[0, shade(BELLY, 0.12)], [1, shade(BELLY, -0.2)]]);
    ctx.fill();
    ctx.strokeStyle = '#8a7a4a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#0e2a20';
  ctx.fillRect(4, 0, 6, 128);
  ctx.fillRect(140, 0, 6, 128);
  ctx.fillStyle = rgba('#ffffff', 0.25);
  ctx.fillRect(26, 0, 6, 128);
  return c;
}

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

function constrict(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(420, 160);
  // the front half of a loop: a thick band bowing down across the front of the pizza
  const band = () => {
    ctx.beginPath();
    ctx.moveTo(6, 40);
    ctx.bezierCurveTo(60, 150, 360, 150, 414, 40);
    ctx.lineTo(414, 92);
    ctx.bezierCurveTo(360, 168, 60, 168, 6, 92);
    ctx.closePath();
  };
  band();
  ctx.fillStyle = lin(ctx, 0, 60, 0, 160, [[0, SCALE_LT], [0.55, SCALE], [1, shade(SCALE, -0.4)]]);
  ctx.fill();
  ctx.save();
  band();
  ctx.clip();
  scales(ctx, 0, 40, 420, 130, 16);
  // belly stripe on the lower edge
  ctx.beginPath();
  ctx.moveTo(6, 82);
  ctx.bezierCurveTo(60, 160, 360, 160, 414, 82);
  ctx.lineTo(414, 96);
  ctx.bezierCurveTo(360, 172, 60, 172, 6, 96);
  ctx.closePath();
  ctx.fillStyle = BELLY;
  ctx.fill();
  // squeeze lines
  ctx.strokeStyle = rgba('#0e2a20', 0.45);
  ctx.lineWidth = 3;
  for (let i = 1; i < 9; i++) {
    const x = 6 + (i / 9) * 408;
    ctx.beginPath();
    ctx.moveTo(x - 6, 70);
    ctx.lineTo(x + 6, 150);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(30, 60);
  ctx.bezierCurveTo(100, 132, 320, 132, 390, 60);
  ctx.strokeStyle = rgba('#ffffff', 0.3);
  ctx.lineWidth = 7;
  ctx.stroke();
  // the ends darken where the loop goes behind the pizza
  ctx.fillStyle = lin(ctx, 0, 0, 420, 0, [[0, rgba('#0e2a20', 0.6)], [0.12, rgba('#0e2a20', 0)], [0.88, rgba('#0e2a20', 0)], [1, rgba('#0e2a20', 0.6)]]);
  ctx.fillRect(0, 0, 420, 160);
  ctx.restore();
  band();
  stroke(ctx, 5.5, '#0e2a20');
  // dorsal spines on top
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const x = 6 + t * 408;
    const y = 40 + Math.sin(t * Math.PI) * 82;
    poly(ctx, [[x - 10, y + 4], [x - 2, y - 20], [x + 10, y + 4]]);
    ctx.fillStyle = '#e8d890';
    ctx.fill();
    stroke(ctx, 3, '#0e2a20');
  }
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
  p_coil: coil,
  p_serpenthead: () => serpentHead(false),
  p_serpentbite: () => serpentHead(true),
  p_serpentneck: serpentNeck,
  p_venom: venom,
  p_constrict: constrict,
  p_fireball: fireball,
  p_pizzaflame: pizzaFlame,
  p_fuse: fuse,
  p_sword: sword,
  p_rune: runeDisc,
  p_swordarc: swordArc,
};
