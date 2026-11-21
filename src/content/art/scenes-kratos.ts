// Arenas for Kratos's nemesis bosses (src/game/nemesis.ts; the fights are in src/game/bosses/kratos.ts):
// - The Titans' Prison (Kronos the Titan King, wave 88): the deepest pit of Tartarus. A colossal clock face is carved
//   into the rock behind him, Titan chains as thick as pillars hang out of the dark, broken columns lean in from the
//   sides and streams of golden sand (stolen time) pour down into the abyss. The clock's hands, the sand, the swaying
//   chains and the ember glow are live (src/content/live/kratos.ts).
// - The Storm Throne (Zeus, wave 90): Olympus, torn up and dragged down to the gates of Tartarus. A white-marble
//   colonnade on a sea of storm cloud, Zeus's golden throne under a split in the sky, braziers of blue lightning-fire.
//   The lightning, drifting cloud and brazier flames are live.
// Every emblem is our own.

import type { GlowSpot } from '../../art/backdrops';
import { registerScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  H,
  OL,
  TY,
  VX,
  W,
  ZB,
  clipRect,
  contactShadow,
  cylH,
  cylV,
  darkSpot,
  ellipse,
  fillOl,
  frontFace,
  glow,
  grade,
  laneCalm,
  lgrad,
  mottle,
  outline,
  rgba,
  roundRect,
  shade,
  stars,
  stoneTop,
  tableLight,
  vgrad,
  vignette,
  xAt,
  yAt,
  zFront,
} from '../../art/sceneKit';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

/** The Greek key, as unit steps (one repeat). */
const KEY: [number, number][] = [
  [0, 1],
  [0, 0],
  [0.75, 0],
  [0.75, 0.75],
  [0.25, 0.75],
  [0.25, 0.4],
  [0.5, 0.4],
];

/** Veins across a table top, wandering back from the front edge. */
function veins(ctx: Ctx, r: R, front: number, col: string, a: number, n: number): void {
  const zf = zFront(front);
  ctx.save();
  clipRect(ctx, 0, TY, W, front - TY);
  for (let i = 0; i < n; i++) {
    let X = (r() - 0.5) * 4;
    let z = zf + r() * 0.2;
    ctx.beginPath();
    ctx.moveTo(xAt(X, z), yAt(z));
    for (let k = 0; k < 14; k++) {
      X += (r() - 0.45) * 0.32;
      z += 0.09 + r() * 0.08;
      if (z > ZB) break;
      ctx.lineTo(xAt(X, z), yAt(z));
    }
    ctx.strokeStyle = rgba(col, a * (0.5 + r() * 0.5));
    ctx.lineWidth = 1.5 + r() * 2.5;
    ctx.stroke();
  }
  ctx.restore();
}

/** The table's front: a band with the Greek key in `key` over `face`, and a bright rim along the edge. */
function keyFront(ctx: Ctx, front: number, face: string, key: string, rim: string): void {
  frontFace(ctx, front, () => {
    ctx.fillStyle = lgrad(ctx, 0, front, 0, H, [
      [0, shade(face, 0.05)],
      [1, shade(face, -0.45)],
    ]);
    ctx.fillRect(0, front, W, H - front);
    const y0 = front + 12;
    const hgt = 24;
    ctx.strokeStyle = key;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'miter';
    for (let x = -10; x < W; x += 38) {
      ctx.beginPath();
      KEY.forEach(([a, b], j) => (j ? ctx.lineTo(x + a * 38, y0 + b * hgt) : ctx.moveTo(x + a * 38, y0 + b * hgt)));
      ctx.stroke();
    }
    ctx.fillStyle = rgba(key, 0.6);
    ctx.fillRect(0, y0 - 6, W, 3);
    ctx.fillRect(0, y0 + hgt + 4, W, 3);
  }, 0.4);
  ctx.fillStyle = cylV(ctx, front - 6, 12, rim);
  ctx.fillRect(0, front - 6, W, 12);
  ctx.fillStyle = rgba(OL, 0.9);
  ctx.fillRect(0, front + 5, W, 3);
}

/** A fluted column from y0 (top of the shaft) to y1 (its base), with a capital and a plinth. */
function column(ctx: Ctx, x: number, y0: number, y1: number, w: number, base: string, broken = 0): void {
  const top = y0 + broken;
  ctx.beginPath();
  if (broken) {
    ctx.moveTo(x - w / 2, y1);
    ctx.lineTo(x - w / 2, top + 30);
    ctx.lineTo(x - w * 0.2, top);
    ctx.lineTo(x + w * 0.05, top + 26);
    ctx.lineTo(x + w * 0.3, top + 8);
    ctx.lineTo(x + w / 2, top + 40);
    ctx.lineTo(x + w / 2, y1);
  } else ctx.rect(x - w / 2, y0, w, y1 - y0);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, x - w / 2, w, base), 5);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 3;
  for (let k = 1; k < 6; k++) {
    const fx = x - w / 2 + (w * k) / 6;
    ctx.beginPath();
    ctx.moveTo(fx, top);
    ctx.lineTo(fx, y1);
    ctx.stroke();
  }
  ctx.restore();
  if (!broken) {
    roundRect(ctx, x - w / 2 - 18, y0 - 26, w + 36, 26, 6);
    fillOl(ctx, cylV(ctx, y0 - 26, 26, shade(base, 0.08)), 4);
    roundRect(ctx, x - w / 2 - 28, y0 - 44, w + 56, 20, 4);
    fillOl(ctx, cylV(ctx, y0 - 44, 20, shade(base, 0.12)), 4);
  }
  roundRect(ctx, x - w / 2 - 16, y1 - 4, w + 32, 30, 6);
  fillOl(ctx, cylV(ctx, y1 - 4, 30, shade(base, -0.06)), 4);
}

/** A great chain of oval links along a sagging line (in the painting; the live layer sways the near ones). */
function bigChain(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, sag: number, link: number, col: string): void {
  const len = Math.hypot(x1 - x0, y1 - y0) + sag;
  const n = Math.max(2, Math.round(len / (link * 1.25)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    const dx = (x1 - x0) / n;
    const dy = (y1 - y0) / n + Math.cos(t * Math.PI) * sag * (Math.PI / n);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(dy, dx) + (i % 2 ? Math.PI / 2 : 0));
    ellipse(ctx, 0, 0, i % 2 ? link * 0.42 : link * 0.75, i % 2 ? link * 0.75 : link * 0.42);
    ctx.lineWidth = link * 0.42 + 6;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = link * 0.42;
    ctx.strokeStyle = lgrad(ctx, -link, -link, link, link, [
      [0, shade(col, 0.35)],
      [1, shade(col, -0.45)],
    ]);
    ctx.stroke();
    ctx.restore();
  }
}

/** A bank of cloud puffs along y, lit from above. */
function cloudBank(ctx: Ctx, r: R, y: number, h: number, top: string, bot: string, n: number, x0 = -100, x1 = W + 100): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + r() * 0.6)) / n;
    const rr = h * (0.5 + r() * 0.6);
    const cy = y + (r() - 0.5) * h * 0.5;
    const gr = ctx.createRadialGradient(x - rr * 0.2, cy - rr * 0.5, rr * 0.1, x, cy, rr);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bot);
    ctx.beginPath();
    ctx.arc(x, cy, rr, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();
  }
}

// =============================================================================================
// The Titans' Prison (Kronos the Titan King)

export const TP = {
  clock: { x: 960, y: 330, r: 300 },
  pillars: [{ x: 210, broken: 140 }, { x: 1710, broken: 90 }],
  sand: [520, 760, 1170, 1400],
  front: 1040,
};

function drawTitansPrison(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#050307'],
    [0.5, '#130a12'],
    [1, '#2a1208'],
  ]);
  // the rock wall: layered basalt, darker at the top, catching the abyss glow from below
  ctx.save();
  clipRect(ctx, 0, 0, W, TY);
  mottle(ctx, 0, 0, W, TY, 0.35, 1.4);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 3;
  for (let y = 60; y < TY; y += 70 + r() * 40) {
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 60) ctx.lineTo(x, y + (r() - 0.5) * 26);
    ctx.stroke();
  }
  ctx.restore();
  // the great clock carved into the rock: a stone ring, twelve hourglass marks and gold inlay
  const C = TP.clock;
  glow(ctx, C.x, C.y, C.r * 1.5, '#ffb040', 0.18);
  ctx.beginPath();
  ctx.arc(C.x, C.y, C.r, 0, Math.PI * 2);
  const face = ctx.createRadialGradient(C.x - 80, C.y - 100, 30, C.x, C.y, C.r);
  face.addColorStop(0, '#5a4c44');
  face.addColorStop(0.7, '#2e2420');
  face.addColorStop(1, '#1a1210');
  ctx.fillStyle = face;
  ctx.fill();
  outline(ctx, 8);
  ctx.beginPath();
  ctx.arc(C.x, C.y, C.r - 40, 0, Math.PI * 2);
  ctx.strokeStyle = '#c9873a';
  ctx.lineWidth = 10;
  ctx.stroke();
  outline(ctx, 3);
  ctx.beginPath();
  ctx.arc(C.x, C.y, C.r - 120, 0, Math.PI * 2);
  ctx.strokeStyle = rgba('#c9873a', 0.5);
  ctx.lineWidth = 4;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const mx = C.x + Math.cos(a) * (C.r - 80);
    const my = C.y + Math.sin(a) * (C.r - 80);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(a + Math.PI / 2);
    // an hourglass mark for each hour
    ctx.beginPath();
    ctx.moveTo(-14, -22);
    ctx.lineTo(14, -22);
    ctx.lineTo(0, 0);
    ctx.lineTo(14, 22);
    ctx.lineTo(-14, 22);
    ctx.lineTo(0, 0);
    ctx.closePath();
    fillOl(ctx, i % 3 ? '#a8763a' : '#ffd27a', 3);
    ctx.restore();
  }
  // cracks across the face where Tartarus split it, leaking gold
  for (const pts of [
    [[C.x - 220, C.y - 140], [C.x - 150, C.y - 60], [C.x - 170, C.y + 20], [C.x - 90, C.y + 90]],
    [[C.x + 240, C.y + 90], [C.x + 170, C.y + 120], [C.x + 120, C.y + 220]],
  ] as [number, number][][]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = OL;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#ffc860';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // the hub (the hands turn in the live layer)
  ctx.beginPath();
  ctx.arc(C.x, C.y, 30, 0, Math.PI * 2);
  fillOl(ctx, cylV(ctx, C.y - 30, 60, '#c9873a'), 5);
  // Titan chains hang out of the dark: two vast ones sagging across, two dropping into the pit
  bigChain(ctx, -40, 120, 700, 220, 160, 46, '#6a6058');
  bigChain(ctx, 1220, 230, W + 40, 100, 150, 46, '#6a6058');
  bigChain(ctx, 380, -40, 420, 640, 10, 40, '#5a524a');
  bigChain(ctx, 1540, -40, 1500, 600, 10, 40, '#5a524a');
  // broken columns leaning in from the sides
  for (const p of TP.pillars) column(ctx, p.x, 120, 700, 150, '#5a5250', p.broken);
  // the abyss below the ledge: falling sand catches the glow
  ctx.beginPath();
  ctx.rect(0, 600, W, TY - 600);
  ctx.fillStyle = lgrad(ctx, 0, 600, 0, TY, [
    [0, '#2a1208'],
    [1, '#ff7a2a'],
  ]);
  ctx.fill();
  glow(ctx, VX, TY, 900, '#ff6a1a', 0.35, 0.3);
  for (const x of TP.sand) {
    ctx.beginPath();
    ctx.moveTo(x - 16, 0);
    ctx.lineTo(x + 16, 0);
    ctx.lineTo(x + 22, TY);
    ctx.lineTo(x - 22, TY);
    ctx.closePath();
    ctx.fillStyle = lgrad(ctx, x - 20, 0, x + 20, 0, [
      [0, rgba('#c8902a', 0.1)],
      [0.5, rgba('#ffd27a', 0.55)],
      [1, rgba('#c8902a', 0.1)],
    ]);
    ctx.fill();
  }
  // the ledge the table stands on: a basalt shelf with molten seams
  ctx.beginPath();
  ctx.moveTo(0, 680);
  for (let x = 0; x <= W; x += 80) ctx.lineTo(x, 680 + Math.sin(x * 0.01) * 10 + (r() - 0.5) * 8);
  ctx.lineTo(W, TY);
  ctx.lineTo(0, TY);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, 680, 0, TY, [
    [0, '#3a302c'],
    [1, '#1a1210'],
  ]), 5);
  laneCalm(ctx, 0.25, 60, 640, '#050307');
  // the table: dark basalt with golden veins and a bronze key on its face
  stoneTop(ctx, r, TP.front, '#3a3430', 0.5);
  veins(ctx, r, TP.front, '#ffc860', 0.5, 10);
  keyFront(ctx, TP.front, '#2a2420', '#c9873a', '#c9873a');
  contactShadow(ctx, 0.6);
  tableLight(ctx, '#ffb060', 0.06, 0.55);
  grade(ctx, 0.06);
  vignette(ctx, 0.8, '#050307', 0.6);
}

// =============================================================================================
// The Storm Throne (Zeus)

export const ST = {
  throne: { x: 960, y: 640 },
  braziers: [{ x: 560, y: 650 }, { x: 1360, y: 650 }],
  columns: [120, 360, 600, 1320, 1560, 1800],
  rift: { x: 960, y: 70 },
  front: 1040,
};

function drawStormThrone(ctx: Ctx, r: R): void {
  // the storm sky, with a split of light where Olympus was torn from the heavens
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#0e1230'],
    [0.45, '#2a2a58'],
    [1, '#4a4070'],
  ]);
  stars(ctx, r, 0, 0, W, 260, 60, 0.4);
  const R0 = ST.rift;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createRadialGradient(R0.x, R0.y, 10, R0.x, R0.y, 520);
  rg.addColorStop(0, 'rgba(220,240,255,0.65)');
  rg.addColorStop(0.3, 'rgba(140,190,255,0.28)');
  rg.addColorStop(1, 'rgba(80,100,200,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, 600);
  ctx.restore();
  // the split itself: a jagged white crack
  ctx.beginPath();
  let x = 560;
  ctx.moveTo(x, 40);
  for (; x < 1380; x += 40) ctx.lineTo(x, 70 + (r() - 0.5) * 40 + Math.sin(x * 0.02) * 10);
  ctx.strokeStyle = 'rgba(160,210,255,0.5)';
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.strokeStyle = '#f4fbff';
  ctx.lineWidth = 5;
  ctx.stroke();
  // storm cloud banks: far, mid and the sea of cloud below the temple
  cloudBank(ctx, r, 200, 90, 'rgba(110,110,170,0.9)', 'rgba(40,40,80,0.9)', 14);
  cloudBank(ctx, r, 330, 110, 'rgba(140,140,190,0.95)', 'rgba(50,50,90,0.95)', 12);
  // the colonnade: white marble columns under a broken entablature
  ctx.beginPath();
  ctx.rect(-20, 150, W + 40, 50);
  fillOl(ctx, cylV(ctx, 150, 50, '#e8e2d6'), 5);
  ctx.strokeStyle = '#c9a23a';
  ctx.lineWidth = 4;
  for (let kx = -10; kx < W; kx += 44) {
    ctx.beginPath();
    KEY.forEach(([a, b], j) => (j ? ctx.lineTo(kx + a * 44, 160 + b * 28) : ctx.moveTo(kx + a * 44, 160 + b * 28)));
    ctx.stroke();
  }
  // a broken gap in the entablature over the throne
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(800, 140);
  ctx.lineTo(840, 210);
  ctx.lineTo(900, 180);
  ctx.lineTo(960, 214);
  ctx.lineTo(1030, 178);
  ctx.lineTo(1080, 212);
  ctx.lineTo(1120, 140);
  ctx.closePath();
  ctx.clip();
  vgrad(ctx, 780, 130, 360, 90, [
    [0, '#9ab8ff'],
    [1, '#4a4a8a'],
  ]);
  ctx.restore();
  for (const cx of ST.columns) column(ctx, cx, 244, 640, 96, '#e8e2d6');
  // the sea of cloud the temple floats on
  cloudBank(ctx, r, 600, 90, 'rgba(200,200,235,1)', 'rgba(90,90,140,1)', 18);
  cloudBank(ctx, r, 690, 80, 'rgba(170,170,215,1)', 'rgba(70,70,120,1)', 16);
  // the throne: gold, a high back with a thunderbolt crest, on three marble steps
  const T = ST.throne;
  for (let k = 0; k < 3; k++) {
    roundRect(ctx, T.x - 280 + k * 44, T.y + 40 - k * 30, 560 - k * 88, 32, 6);
    fillOl(ctx, cylV(ctx, T.y + 40 - k * 30, 32, '#ece6da'), 4);
  }
  ctx.beginPath();
  ctx.moveTo(T.x - 130, T.y - 20);
  ctx.lineTo(T.x - 150, T.y - 330);
  ctx.quadraticCurveTo(T.x, T.y - 430, T.x + 150, T.y - 330);
  ctx.lineTo(T.x + 130, T.y - 20);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, T.x - 150, 0, T.x + 150, 0, [
    [0, '#8a5a14'],
    [0.35, '#ffe08a'],
    [0.6, '#e8b23a'],
    [1, '#6a4410'],
  ]), 6);
  // the crest: a big thunderbolt in white marble on a sky-blue field
  ctx.beginPath();
  ctx.arc(T.x, T.y - 300, 70, 0, Math.PI * 2);
  const crest = ctx.createRadialGradient(T.x - 20, T.y - 320, 6, T.x, T.y - 300, 70);
  crest.addColorStop(0, '#9fd8ff');
  crest.addColorStop(1, '#2a4a9a');
  ctx.fillStyle = crest;
  ctx.fill();
  outline(ctx, 5);
  ctx.beginPath();
  ctx.moveTo(T.x + 14, T.y - 352);
  ctx.lineTo(T.x - 24, T.y - 296);
  ctx.lineTo(T.x - 2, T.y - 296);
  ctx.lineTo(T.x - 16, T.y - 246);
  ctx.lineTo(T.x + 26, T.y - 310);
  ctx.lineTo(T.x + 4, T.y - 310);
  ctx.closePath();
  fillOl(ctx, '#f4fbff', 4);
  // the seat and arms, ending in eagle heads of our own design
  roundRect(ctx, T.x - 170, T.y - 120, 340, 100, 16);
  fillOl(ctx, cylV(ctx, T.y - 120, 100, '#e8b23a'), 5);
  roundRect(ctx, T.x - 150, T.y - 112, 300, 26, 10);
  fillOl(ctx, cylV(ctx, T.y - 112, 26, '#5a3a9a'), 3);
  for (const d of [-1, 1]) {
    roundRect(ctx, T.x + d * 170 - 32, T.y - 180, 64, 160, 14);
    fillOl(ctx, cylH(ctx, T.x + d * 170 - 32, 64, '#e8b23a'), 5);
    const hx = T.x + d * 170;
    const hy = T.y - 196;
    ctx.beginPath();
    ctx.moveTo(hx - d * 30, hy + 20);
    ctx.quadraticCurveTo(hx - d * 30, hy - 30, hx + d * 6, hy - 30);
    ctx.quadraticCurveTo(hx + d * 40, hy - 26, hx + d * 46, hy - 4);
    ctx.lineTo(hx + d * 24, hy + 2);
    ctx.quadraticCurveTo(hx + d * 20, hy + 20, hx + d * 30, hy + 24);
    ctx.closePath();
    fillOl(ctx, '#f4efe4', 4);
    ellipse(ctx, hx + d * 10, hy - 14, 5, 5);
    ctx.fillStyle = OL;
    ctx.fill();
  }
  // the braziers' bowls (their blue fire is live)
  for (const b of ST.braziers) {
    ctx.beginPath();
    ctx.moveTo(b.x - 20, b.y + 40);
    ctx.lineTo(b.x - 34, b.y - 70);
    ctx.lineTo(b.x + 34, b.y - 70);
    ctx.lineTo(b.x + 20, b.y + 40);
    ctx.closePath();
    fillOl(ctx, cylH(ctx, b.x - 34, 68, '#c9873a'), 4);
    ellipse(ctx, b.x, b.y - 74, 70, 20);
    fillOl(ctx, cylV(ctx, b.y - 94, 40, '#e8b23a'), 4);
    glow(ctx, b.x, b.y - 110, 180, '#7fc8ff', 0.5);
  }
  glow(ctx, T.x, T.y - 300, 300, '#9fd8ff', 0.25);
  laneCalm(ctx, 0.22, 60, 640, '#0a0c20');
  // the table: white marble with gold veins on a gold-keyed face
  stoneTop(ctx, r, ST.front, '#d8d2c6', 0.25);
  veins(ctx, r, ST.front, '#c9a23a', 0.55, 11);
  veins(ctx, r, ST.front, '#8a96aa', 0.35, 8);
  keyFront(ctx, ST.front, '#c8c0b2', '#c9a23a', '#e8b23a');
  darkSpot(ctx, VX, 800, 600, 60, 0.12, '#3a4a8a');
  contactShadow(ctx, 0.5);
  tableLight(ctx, '#bfe0ff', 0.08, 0.45);
  grade(ctx, 0.04);
  vignette(ctx, 0.7, '#0a0c20', 0.55);
}

registerScene('titanking', {
  info: {
    name: 'The Titans’ Prison',
    subtitle: 'Mini-boss: KRONOS THE TITAN KING',
    ambient: ['embers', 'dust'],
    glows: [g(TP.clock.x, TP.clock.y, 380, '#ffb040', 0.2), ...TP.sand.map((x) => g(x, 640, 140, '#ffd27a', 0.3)), g(VX, TY - 40, 600, '#ff6a1a', 0.35)],
    light: '#e8c0a0',
    tableTint: '#f4e8de',
  },
  draw: drawTitansPrison,
});

registerScene('zeus', {
  info: {
    name: 'The Storm Throne',
    subtitle: 'Boss: ZEUS',
    ambient: ['wisps'],
    glows: [g(ST.throne.x, ST.throne.y - 300, 260, '#9fd8ff', 0.3), ...ST.braziers.map((b) => g(b.x, b.y - 120, 160, '#7fc8ff', 0.6)), g(ST.rift.x, ST.rift.y, 420, '#d8ecff', 0.15)],
    light: '#c8d8ff',
    tableTint: '#eef2ff',
  },
  draw: drawStormThrone,
});
