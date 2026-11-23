// Feetza 2.0 boss arenas, part 2: Shipwreck, Skate Bowl, Summit. All three have been redrawn with the location kit
// (scene-kraken.ts, scene-rinkqueen.ts and scene-yeti.ts); their old art here stays for the before/after page
// (?dev&stages).

import type { GlowSpot } from '../../art/backdrops';
import { registerLegacyScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  BLOCK,
  FOC,
  H,
  OL,
  TY,
  VX,
  W,
  ZB,
  aurora,
  blob,
  bubbles,
  clipRect,
  cone,
  contactShadow,
  cylH,
  cylV,
  darkSpot,
  ellipse,
  fillOl,
  fogBand,
  frond,
  frontFace,
  glow,
  grade,
  grainRect,
  hgrad,
  laneCalm,
  lgrad,
  mottle,
  neonStroke,
  planksTop,
  range,
  rgba,
  roundRect,
  shade,
  skyline,
  snowfall,
  starPath,
  stars,
  tableLight,
  vgrad,
  vignette,
  woodLip,
  xAt,
  yAt,
  zFront,
} from '../../art/sceneKit';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

// ---------------------------------------------------------------------------------------------
// Shipwreck (Kraken Toes)

const SW = {
  masts: [
    { x: 360, top: -20, tilt: -0.04 },
    { x: 1580, top: 170, tilt: 0.07 },
  ],
  chest: { x: 1720, y: 700 },
  rail: 630,
  front: 1040,
};

/** Tapered tentacle along a list of points, with suckers on the underside. */
function tentacle(ctx: Ctx, pts: [number, number][], w0: number, w1: number, col: string): void {
  const N = 60;
  const P: [number, number][] = [];
  // Catmull-Rom through pts
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * (pts.length - 1);
    const k = Math.min(pts.length - 2, Math.floor(t));
    const u = t - k;
    const p0 = pts[Math.max(0, k - 1)];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[Math.min(pts.length - 1, k + 2)];
    const f = (a: number, b: number, c: number, d: number): number =>
      0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
    P.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
  }
  const L: [number, number][] = [];
  const Rr: [number, number][] = [];
  const nrm: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = P[Math.max(0, i - 1)];
    const b = P[Math.min(N - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d;
    const ny = dx / d;
    const w = w0 + (w1 - w0) * (i / (N - 1));
    nrm.push([nx, ny]);
    L.push([P[i][0] + nx * w, P[i][1] + ny * w]);
    Rr.push([P[i][0] - nx * w, P[i][1] - ny * w]);
  }
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = N - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
  ctx.closePath();
  fillOl(ctx, col, 5);
  // lighter underside band
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const w = (w0 + (w1 - w0) * (i / (N - 1))) * 0.55;
    const x = P[i][0] - nrm[i][0] * w;
    const y = P[i][1] - nrm[i][1] * w;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  for (let i = N - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
  ctx.closePath();
  ctx.fillStyle = rgba(shade(col, 0.45), 0.8);
  ctx.fill();
  // suckers
  for (let i = 3; i < N - 2; i += 3) {
    const w = w0 + (w1 - w0) * (i / (N - 1));
    const x = P[i][0] - nrm[i][0] * w * 0.6;
    const y = P[i][1] - nrm[i][1] * w * 0.6;
    const sr = Math.max(2, w * 0.28);
    ellipse(ctx, x, y, sr, sr);
    ctx.fillStyle = shade(col, 0.6);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(col, -0.4), 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // top-side highlight
  ctx.strokeStyle = 'rgba(255,220,240,0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 2; i < N - 4; i++) {
    const w = (w0 + (w1 - w0) * (i / (N - 1))) * 0.6;
    const x = P[i][0] + nrm[i][0] * w;
    const y = P[i][1] + nrm[i][1] * w;
    if (i > 2) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

function mast(ctx: Ctx, r: R, x: number, top: number, tilt: number): void {
  ctx.save();
  ctx.translate(x, SW.rail);
  ctx.rotate(tilt);
  const h = SW.rail - top;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(-18, -h);
  ctx.lineTo(18, -h);
  ctx.lineTo(26, 0);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, -26, 52, '#4a3a2a'), 5);
  // yard + tattered sail
  if (top < 100) {
    const yy = -h + 150;
    ctx.beginPath();
    ctx.moveTo(-14, yy);
    ctx.lineTo(260, yy + 30);
    ctx.lineTo(250, yy + 50);
    ctx.lineTo(-14, yy + 24);
    ctx.closePath();
    fillOl(ctx, '#3a2c20', 4);
    ctx.beginPath();
    ctx.moveTo(10, yy + 24);
    ctx.lineTo(240, yy + 48);
    let px = 240;
    for (let k = 0; k < 7; k++) {
      px -= 32;
      ctx.lineTo(px + (r() - 0.5) * 20, yy + 200 + r() * 90);
    }
    ctx.lineTo(16, yy + 170);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, yy, 0, yy + 280, [
      [0, rgba('#8aa098', 0.85)],
      [1, rgba('#4a6a66', 0.5)],
    ]), 4);
    for (let k = 0; k < 4; k++) {
      ellipse(ctx, 60 + r() * 160, yy + 70 + r() * 120, 8 + r() * 14, 6 + r() * 10);
      ctx.fillStyle = 'rgba(6,30,40,0.85)';
      ctx.fill();
    }
  } else {
    // splintered top
    ctx.beginPath();
    ctx.moveTo(-18, -h);
    ctx.lineTo(-8, -h - 40);
    ctx.lineTo(0, -h - 14);
    ctx.lineTo(8, -h - 52);
    ctx.lineTo(18, -h);
    ctx.closePath();
    fillOl(ctx, '#5a4a36', 4);
  }
  // barnacles + seaweed strands
  for (let k = 0; k < 10; k++) {
    const by = -r() * h * 0.7;
    ellipse(ctx, (r() - 0.5) * 36, by, 4 + r() * 4, 3 + r() * 3);
    fillOl(ctx, '#c8c0a8', 1.5);
  }
  ctx.restore();
  frond(ctx, x - 10, SW.rail - 10, 180, -1.7, 0.4, '#2a6a4a', 4, 0.6);
}

function treasureChest(ctx: Ctx, r: R, x: number, y: number): void {
  glow(ctx, x, y - 60, 220, '#ffd060', 0.5);
  // coins spilling
  for (let i = 0; i < 26; i++) {
    const cx = x - 120 + r() * 240;
    const cy = y - 4 + r() * 24;
    ellipse(ctx, cx, cy, 11, 5);
    fillOl(ctx, r() > 0.5 ? '#ffd84a' : '#e8a82a', 2.5);
  }
  ctx.beginPath();
  ctx.rect(x - 90, y - 90, 180, 90);
  fillOl(ctx, cylH(ctx, x - 90, 180, '#6a3a1a'), 5);
  // heaped gold
  ctx.beginPath();
  ctx.moveTo(x - 86, y - 86);
  ctx.quadraticCurveTo(x, y - 140, x + 86, y - 86);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, y - 130, 0, y - 86, [
    [0, '#fff2a0'],
    [1, '#d8982a'],
  ]), 4);
  for (let i = 0; i < 10; i++) {
    ellipse(ctx, x - 60 + r() * 120, y - 96 - r() * 26, 8, 4);
    ctx.strokeStyle = 'rgba(140,80,10,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  starPath(ctx, x + 30, y - 118, 12, 4, 4, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // open lid
  ctx.beginPath();
  ctx.moveTo(x - 92, y - 92);
  ctx.lineTo(x - 80, y - 190);
  ctx.quadraticCurveTo(x, y - 220, x + 80, y - 190);
  ctx.lineTo(x + 92, y - 92);
  ctx.quadraticCurveTo(x, y - 120, x - 92, y - 92);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, y - 220, 0, y - 92, [
    [0, '#8a4a20'],
    [1, '#3a1a08'],
  ]), 5);
  for (const dx of [-60, 60]) {
    ctx.beginPath();
    ctx.rect(x + dx - 9, y - 90, 18, 90);
    fillOl(ctx, '#c8902a', 3);
  }
  roundRect(ctx, x - 14, y - 70, 28, 30, 4);
  fillOl(ctx, '#e8b84a', 3);
}

function drawShipwreck(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#1a7a98'],
    [0.35, '#0e4a6a'],
    [0.8, '#062a42'],
    [1, '#04202e'],
  ]);
  // surface shimmer at the top
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(160,240,255,${0.04 + r() * 0.08})`;
    const x = r() * W;
    ctx.beginPath();
    ctx.ellipse(x, 20 + r() * 60, 40 + r() * 90, 6 + r() * 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // god rays
  for (const [x0, x1, a] of [
    [300, 520, 0.05],
    [760, 980, 0.07],
    [1180, 1360, 0.05],
    [1500, 1760, 0.04],
  ])
    cone(ctx, x0, -20, 120, x1, TY, 340, '#8af0ff', a);
  // distant seabed rocks + kelp silhouettes
  ctx.fillStyle = '#083248';
  ctx.beginPath();
  ctx.moveTo(-10, 560);
  for (let x = -10; x <= W + 40; x += 80) ctx.lineTo(x, 520 + Math.sin(x * 0.01) * 30 + r() * 30);
  ctx.lineTo(W + 10, TY);
  ctx.lineTo(-10, TY);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 12; i++) frond(ctx, r() * W, 560 + r() * 40, 120 + r() * 120, -Math.PI / 2 + (r() - 0.5) * 0.5, (r() - 0.5) * 0.8, '#0c3e4a', 4, 0.5);
  // fish silhouettes
  ctx.fillStyle = 'rgba(6,30,46,0.8)';
  for (const [fx, fy, fs] of [
    [760, 300, 1],
    [820, 330, 0.7],
    [1240, 250, 0.8],
  ]) {
    ctx.beginPath();
    ctx.ellipse(fx, fy, 26 * fs, 10 * fs, 0, 0, Math.PI * 2);
    ctx.moveTo(fx + 22 * fs, fy);
    ctx.lineTo(fx + 40 * fs, fy - 12 * fs);
    ctx.lineTo(fx + 40 * fs, fy + 12 * fs);
    ctx.fill();
  }
  // masts with tentacles wound round them
  const [m0, m1] = SW.masts;
  tentacle(ctx, [
    [-60, 700],
    [120, 600],
    [440, 520],
    [300, 430],
    [260, 360],
    [440, 300],
    [460, 230],
    [380, 190],
  ], 52, 8, '#c03a6a');
  mast(ctx, r, m0.x, m0.top, m0.tilt);
  tentacle(ctx, [
    [440, 520],
    [470, 470],
    [440, 420],
    [300, 400],
  ], 40, 30, '#c03a6a');
  tentacle(ctx, [
    [W + 60, 690],
    [1760, 600],
    [1500, 500],
    [1640, 420],
    [1700, 340],
    [1600, 280],
    [1520, 290],
  ], 50, 8, '#b03464');
  mast(ctx, r, m1.x, m1.top, m1.tilt);
  tentacle(ctx, [
    [1500, 500],
    [1520, 450],
    [1600, 430],
    [1660, 440],
  ], 38, 30, '#b03464');
  bubbles(ctx, r, 0, 0, W, TY, 70, 0.45);
  laneCalm(ctx, 0.18, 60, 560, '#021018');
  // ship's rail (balustrade), one section broken
  const ry = SW.rail;
  ctx.fillStyle = '#1a140e';
  ctx.fillRect(0, ry + 30, W, TY - ry);
  for (let x = 20; x < W; x += 46) {
    if (x > 980 && x < 1180) continue;
    ctx.beginPath();
    ctx.moveTo(x - 9, ry + 20);
    ctx.quadraticCurveTo(x - 16, ry + 70, x - 9, TY);
    ctx.lineTo(x + 9, TY);
    ctx.quadraticCurveTo(x + 16, ry + 70, x + 9, ry + 20);
    ctx.closePath();
    fillOl(ctx, cylH(ctx, x - 16, 32, '#5a4632'), 3);
  }
  ctx.beginPath();
  ctx.rect(-10, ry, 990, 24);
  ctx.rect(1190, ry, W - 1180, 24);
  fillOl(ctx, cylV(ctx, ry, 24, '#6a5238'), 5);
  ctx.beginPath();
  ctx.moveTo(980, ry);
  ctx.lineTo(1010, ry + 12);
  ctx.lineTo(990, ry + 24);
  ctx.lineTo(970, ry + 24);
  ctx.closePath();
  fillOl(ctx, '#6a5238', 3);
  for (let i = 0; i < 30; i++) {
    ellipse(ctx, r() * W, ry + 4 + r() * (TY - ry), 4 + r() * 5, 3 + r() * 4);
    fillOl(ctx, '#b8b098', 1.5);
  }
  vgrad(ctx, 0, ry, W, TY - ry, [
    [0, 'rgba(4,30,40,0.2)'],
    [1, 'rgba(4,30,40,0.6)'],
  ]);
  treasureChest(ctx, r, SW.chest.x, SW.chest.y);
  // wet, barnacled deck planks
  planksTop(ctx, r, SW.front, 0.26, '#6a5a44', 0.35, 6);
  ctx.save();
  clipRect(ctx, 0, TY, W, SW.front - TY);
  for (let i = 0; i < 40; i++) {
    const X = (r() - 0.5) * 4.2;
    const z = ZB - r() * (ZB - zFront(SW.front));
    const s = FOC / z / 460;
    ctx.save();
    ctx.translate(xAt(X, z), yAt(z));
    ctx.scale(s, s * 0.5);
    if (i % 3) {
      ellipse(ctx, 0, 0, 7, 6);
      fillOl(ctx, '#c8c0a8', 2);
    } else {
      blob(ctx, 0, 0, 22, 0.6, r, 8);
      ctx.fillStyle = 'rgba(40,90,60,0.5)';
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
  woodLip(ctx, r, SW.front, '#4a3c2c');
  contactShadow(ctx, 0.5);
  grade(ctx, 0.18, '#8ad8e8', 0.3);
  cone(ctx, 860, -20, 200, 960, TY + 100, 900, '#8af0ff', 0.03);
  glow(ctx, SW.chest.x, 860, 300, '#ffd060', 0.08, 0.3);
  tableLight(ctx, '#80d0e0', 0.05, 0.5);
  vignette(ctx, 0.85, '#010a12');
}

// ---------------------------------------------------------------------------------------------
// Skate Bowl (Queen of the Rink)

const SB = {
  coping: 380,
  lights: [
    { x: 120, y: 120, tx: 1100 },
    { x: 1800, y: 120, tx: 820 },
  ],
  crown: { x: 1480, y: 300 },
  front: 1040,
};

function tag(ctx: Ctx, text: string, x: number, y: number, size: number, fill: string, edge: string, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `${size}px ${BLOCK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = size * 0.28;
  ctx.strokeText(text, 0, 0);
  ctx.strokeStyle = edge;
  ctx.lineWidth = size * 0.14;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = lgrad(ctx, 0, -size / 2, 0, size / 2, [
    [0, shade(fill, 0.3)],
    [1, shade(fill, -0.2)],
  ]);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawSkateBowl(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, 460, [
    [0, '#05031a'],
    [0.7, '#1a0a3e'],
    [1, '#3a1460'],
  ]);
  stars(ctx, r, 0, 0, W, 300, 140, 0.7);
  skyline(ctx, r, 340, 60, 200, 60, 150, '#140a2c', 0.25, '#ff9ae0');
  vgrad(ctx, 0, 200, W, 140, [
    [0, 'rgba(255,79,163,0)'],
    [1, 'rgba(255,79,163,0.18)'],
  ]);
  // deck fence behind the bowl
  const cp = SB.coping;
  ctx.fillStyle = '#2a2434';
  ctx.fillRect(0, cp - 50, W, 50);
  ctx.strokeStyle = 'rgba(160,150,190,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -40; x < W + 40; x += 20) {
    ctx.moveTo(x, 260);
    ctx.lineTo(x + 40, cp - 50);
    ctx.moveTo(x + 40, 260);
    ctx.lineTo(x, cp - 50);
  }
  ctx.stroke();
  ctx.fillStyle = OL;
  for (let x = 0; x < W; x += 240) ctx.fillRect(x - 4, 250, 8, cp - 300);
  ctx.fillRect(0, 252, W, 6);
  // bowl transition: concrete curving down toward us
  ctx.fillStyle = lgrad(ctx, 0, cp, 0, TY, [
    [0, '#767284'],
    [0.35, '#5a5668'],
    [0.75, '#3e3a4c'],
    [1, '#4a4658'],
  ]);
  ctx.fillRect(0, cp, W, TY - cp);
  ctx.save();
  clipRect(ctx, 0, cp, W, TY - cp);
  mottle(ctx, 0, cp, W, TY - cp, 0.25, 1.2);
  // curvature bands
  for (let k = 0; k < 10; k++) {
    const y = cp + 20 + Math.pow(k / 10, 1.6) * (TY - cp - 40);
    ctx.fillStyle = `rgba(0,0,0,${0.03 + k * 0.006})`;
    ctx.fillRect(0, y, W, 16);
  }
  // graffiti on the bowl wall
  tag(ctx, 'FEETZA', 420, 520, 96, '#ff4fa3', '#ffd84a', -0.06);
  tag(ctx, 'RAD', 1500, 500, 88, '#3ae8ff', '#8a5aff', 0.08);
  for (const [bx, by, c] of [
    [180, 610, '#ffd84a'],
    [760, 620, '#5aff8a'],
    [1220, 600, '#ff7a3a'],
    [1760, 620, '#ff4fa3'],
  ] as [number, number, string][]) {
    blob(ctx, bx, by, 46, 0.5, r, 9);
    fillOl(ctx, rgba(c, 0.8), 4);
    starPath(ctx, bx, by, 22, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  }
  // flat bottom of the bowl and the side transitions curving up toward us
  ctx.beginPath();
  ctx.ellipse(VX, TY + 40, 820, 150, 0, Math.PI, 0);
  ctx.fillStyle = lgrad(ctx, 0, TY - 110, 0, TY, [
    [0, 'rgba(150,146,170,0.55)'],
    [1, 'rgba(110,106,130,0.4)'],
  ]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,225,255,0.35)';
  ctx.lineWidth = 4;
  ctx.stroke();
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 0 : W;
    ctx.fillStyle = hgrad(ctx, x0, x0 - sd * 360, [
      [0, 'rgba(0,0,0,0.4)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillRect(sd < 0 ? 0 : W - 360, cp, 360, TY - cp);
  }
  // drips
  ctx.fillStyle = 'rgba(255,79,163,0.7)';
  for (let k = 0; k < 8; k++) ctx.fillRect(300 + k * 32, 560, 4, 20 + r() * 40);
  grainRect(ctx, 0, cp, W, TY - cp, 0.3);
  ctx.restore();
  // coping pipe with a pink neon edge
  ctx.beginPath();
  ctx.rect(-10, cp - 12, W + 20, 24);
  fillOl(ctx, cylV(ctx, cp - 12, 24, '#c8ccd8'), 5);
  neonStroke(ctx, '#ff4fa3', 5, () => {
    ctx.beginPath();
    ctx.moveTo(-10, cp + 22);
    ctx.lineTo(W + 10, cp + 22);
    ctx.stroke();
  });
  // neon crown sign for the Queen
  const { crown } = SB;
  neonStroke(ctx, '#ffd84a', 7, () => {
    ctx.beginPath();
    ctx.moveTo(crown.x - 70, crown.y + 30);
    ctx.lineTo(crown.x - 80, crown.y - 40);
    ctx.lineTo(crown.x - 36, crown.y - 6);
    ctx.lineTo(crown.x, crown.y - 56);
    ctx.lineTo(crown.x + 36, crown.y - 6);
    ctx.lineTo(crown.x + 80, crown.y - 40);
    ctx.lineTo(crown.x + 70, crown.y + 30);
    ctx.closePath();
    ctx.stroke();
  });
  // spotlight poles and beams
  for (const L of SB.lights) {
    ctx.beginPath();
    ctx.rect(L.x - 10, L.y, 20, TY - L.y);
    fillOl(ctx, cylH(ctx, L.x - 10, 20, '#4a4658'), 4);
    cone(ctx, L.x, L.y + 20, 60, L.tx, TY, 420, '#e8e0ff', 0.05);
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate(L.x < VX ? 0.6 : -0.6);
    roundRect(ctx, -40, -26, 80, 52, 10);
    fillOl(ctx, '#2a2634', 5);
    ellipse(ctx, 0, 22, 34, 10);
    fillOl(ctx, '#fffbe8', 3);
    ctx.restore();
    glow(ctx, L.x, L.y + 20, 120, '#fffbe8', 0.5);
    glow(ctx, L.tx, 640, 300, '#e8e0ff', 0.12, 0.4);
  }
  laneCalm(ctx, 0.16, 60, 600, '#04020c');
  // plywood ramp deck with grip tape strip and stickers
  const f = SB.front;
  planksTop(ctx, r, f, 0.4, '#a8845a', 0.22, 4);
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY);
  ctx.fillStyle = 'rgba(20,18,26,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, TY);
  ctx.lineTo(W, TY);
  ctx.lineTo(W, TY + 26);
  ctx.lineTo(0, TY + 26);
  ctx.fill();
  grainRect(ctx, 0, TY, W, 26, 0.5);
  for (let i = 0; i < 9; i++) {
    const X = (r() - 0.5) * 4;
    const z = ZB - 0.1 - r() * (ZB - zFront(f) - 0.2);
    const s = FOC / z / 460;
    ctx.save();
    ctx.translate(xAt(X, z), yAt(z));
    ctx.scale(s, s * 0.5);
    ctx.rotate(r() * 6);
    const c = ['#ff4fa3', '#3ae8ff', '#ffd84a', '#5aff8a'][i % 4];
    if (i % 2) roundRect(ctx, -30, -18, 60, 36, 8);
    else starPath(ctx, 0, 0, 26, 12);
    ctx.fillStyle = rgba(c, 0.75);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  woodLip(ctx, r, f, '#a07a4a');
  neonStroke(ctx, '#3ae8ff', 5, () => {
    ctx.beginPath();
    ctx.moveTo(-10, f + 16);
    ctx.lineTo(W + 10, f + 16);
    ctx.stroke();
  });
  contactShadow(ctx, 0.5);
  tableLight(ctx, '#e0a8ff', 0.05, 0.5);
  grade(ctx, 0.05);
  vignette(ctx, 0.75, '#04020c');
}

// ---------------------------------------------------------------------------------------------
// Summit (The Yeti Ski Boot)

const SM = {
  flag: { x: 1180, y: 250 },
  plateau: 560,
  front: 1040,
};

function iceCliff(ctx: Ctx, r: R, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, 100, 0, TY, [
    [0, '#a8d8f0'],
    [0.5, '#5a8ab8'],
    [1, '#2a4a7a'],
  ]), 5);
  ctx.save();
  ctx.clip();
  // facets
  for (let i = 0; i < 18; i++) {
    const x = pts[0][0] + (r() - 0.2) * 420;
    const y = 120 + r() * 600;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40 + r() * 80, y + 60 + r() * 120);
    ctx.lineTo(x - 30 + r() * 30, y + 140 + r() * 100);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? 'rgba(220,245,255,0.22)' : 'rgba(10,30,70,0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,250,255,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function footprint(ctx: Ctx, x: number, y: number, s: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s * 0.32);
  ctx.rotate(rot);
  ellipse(ctx, 0, 0, 46, 80);
  ctx.fillStyle = 'rgba(70,100,160,0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 80, 0, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  for (let k = 0; k < 4; k++) {
    ellipse(ctx, -30 + k * 20, -100 + Math.abs(k - 1.5) * 8, 12, 16);
    ctx.fillStyle = 'rgba(70,100,160,0.45)';
    ctx.fill();
  }
  ctx.restore();
}

function drawSummit(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, SM.plateau, [
    [0, '#02051a'],
    [0.55, '#0c1840'],
    [1, '#2a3a6a'],
  ]);
  stars(ctx, r, 0, 0, W, 420, 260, 0.9);
  aurora(ctx, [
    [-60, 210],
    [300, 90],
    [600, 260],
    [960, 150],
    [1300, 60],
    [1600, 230],
    [W + 60, 120],
  ], ['#4affb0', '#5ad0ff', '#4affb0', '#b05aff'], 170, 0.16, r);
  aurora(ctx, [
    [-60, 300],
    [400, 220],
    [800, 330],
    [1200, 240],
  ], ['#7aff9a', '#4affd0'], 110, 0.1, r);
  // summit peak with the flag
  range(ctx, SM.plateau + 20, [
    [-40, 520], [300, 430], [620, 470], [900, 360], [SM.flag.x, SM.flag.y + 20], [1460, 380], [1700, 450], [1980, 470],
  ], lgrad(ctx, 0, 260, 0, 580, [
    [0, '#a4b8dc'],
    [1, '#5a70a0'],
  ]), '#e8f0fc', 0.4, 4);
  // shadow side of the peak
  ctx.beginPath();
  ctx.moveTo(SM.flag.x, SM.flag.y + 20);
  ctx.lineTo(1460, 380);
  ctx.lineTo(1700, 450);
  ctx.lineTo(1700, 580);
  ctx.lineTo(SM.flag.x + 40, 580);
  ctx.closePath();
  ctx.fillStyle = 'rgba(20,30,80,0.35)';
  ctx.fill();
  const { flag } = SM;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(flag.x, flag.y + 24);
  ctx.lineTo(flag.x, flag.y - 110);
  ctx.stroke();
  ctx.strokeStyle = '#c8ccd4';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(flag.x, flag.y - 110);
  ctx.quadraticCurveTo(flag.x + 40, flag.y - 124, flag.x + 70, flag.y - 104);
  ctx.quadraticCurveTo(flag.x + 96, flag.y - 90, flag.x + 120, flag.y - 100);
  ctx.lineTo(flag.x + 116, flag.y - 54);
  ctx.quadraticCurveTo(flag.x + 90, flag.y - 46, flag.x + 64, flag.y - 60);
  ctx.quadraticCurveTo(flag.x + 36, flag.y - 74, flag.x, flag.y - 64);
  ctx.closePath();
  fillOl(ctx, hgrad(ctx, flag.x, flag.x + 120, [
    [0, '#e0302a'],
    [0.5, '#ff6a4a'],
    [1, '#a01a14'],
  ]), 4);
  // ice cliffs at both sides
  iceCliff(ctx, r, [
    [-20, TY],
    [-20, 90],
    [120, 150],
    [180, 80],
    [300, 260],
    [260, 400],
    [380, 560],
    [340, TY],
  ]);
  iceCliff(ctx, r, [
    [W + 20, TY],
    [W + 20, 60],
    [1800, 160],
    [1740, 110],
    [1640, 300],
    [1690, 420],
    [1560, 580],
    [1600, TY],
  ]);
  // icicles hanging from cliff ledges
  ctx.fillStyle = 'rgba(220,245,255,0.85)';
  for (const [ix, iy] of [
    [130, 150],
    [250, 280],
    [1790, 170],
    [1670, 320],
  ])
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(ix + k * 14 - 20, iy);
      ctx.lineTo(ix + k * 14 - 14, iy + 30 + r() * 40);
      ctx.lineTo(ix + k * 14 - 8, iy);
      ctx.fill();
    }
  // snow plateau with drifts
  ctx.beginPath();
  ctx.moveTo(-10, SM.plateau + 20);
  for (let x = -10; x <= W + 10; x += 160) ctx.quadraticCurveTo(x + 80, SM.plateau + 6 - r() * 12, x + 160, SM.plateau + 20);
  ctx.lineTo(W + 10, TY + 4);
  ctx.lineTo(-10, TY + 4);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, SM.plateau, 0, TY, [
    [0, '#d0dcf0'],
    [1, '#8a9cc4'],
  ]), 4);
  // giant footprints trailing in from the edges
  footprint(ctx, 120, 700, 1.2, 0.2);
  footprint(ctx, 70, 620, 0.9, 0.3);
  footprint(ctx, 1810, 690, 1.15, -0.25);
  footprint(ctx, 1860, 610, 0.85, -0.3);
  // blizzard streaks
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 2;
  for (let i = 0; i < 160; i++) {
    const x = r() * W;
    const y = r() * TY;
    const l = 20 + r() * 50;
    ctx.strokeStyle = `rgba(220,235,255,${0.05 + r() * 0.12})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - l, y + l * 0.35);
    ctx.stroke();
  }
  ctx.restore();
  snowfall(ctx, r, 0, 0, W, TY, 160, 0.6, 3);
  fogBand(ctx, r, 600, 120, '#c8d8f0', 0.22, 30);
  laneCalm(ctx, 0.14, 60, 560, '#02051a');
  // ice slab table
  const f = SM.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  vgrad(ctx, 0, TY, W, f - TY, [
    [0, '#5a8ac0'],
    [0.5, '#9ac8e8'],
    [1, '#c0e4f8'],
  ]);
  mottle(ctx, 0, TY, W, f - TY, 0.2, 1.4, 'soft-light');
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    let X = (r() - 0.5) * 4;
    let z = ZB - r() * 0.3;
    ctx.beginPath();
    ctx.moveTo(xAt(X, z), yAt(z));
    for (let k = 0; k < 6; k++) {
      X += (r() - 0.5) * 0.3;
      z -= 0.05 + r() * 0.1;
      ctx.lineTo(xAt(X, z), yAt(z));
    }
    ctx.stroke();
  }
  for (let i = 0; i < 50; i++) {
    const X = (r() - 0.5) * 4;
    const z = ZB - r() * (ZB - zFront(f));
    const s = (FOC / z / 460) * (2 + r() * 4);
    ellipse(ctx, xAt(X, z), yAt(z), s, s * 0.6);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  darkSpot(ctx, VX, TY + 80, 900, 60, 0.14, '#c8e8ff');
  ctx.restore();
  grainRect(ctx, 0, TY, W, f - TY, 0.15);
  ctx.restore();
  frontFace(ctx, f, () => {
    ctx.fillStyle = lgrad(ctx, 0, f, 0, H, [
      [0, '#7ab0d8'],
      [1, '#3a6a98'],
    ]);
    ctx.fillRect(0, f, W, H - f);
  }, 0.2);
  ctx.fillStyle = 'rgba(230,248,255,0.9)';
  for (let x = 10; x < W; x += 34 + r() * 30) {
    ctx.beginPath();
    ctx.moveTo(x, f + 2);
    ctx.lineTo(x + 6, f + 14 + r() * 22);
    ctx.lineTo(x + 12, f + 2);
    ctx.fill();
  }
  contactShadow(ctx, 0.45);
  glow(ctx, 960, 200, 900, '#4affb0', 0.05, 0.4);
  tableLight(ctx, '#c0d8ff', 0.04, 0.45);
  vignette(ctx, 0.8, '#02051a');
}

// ---------------------------------------------------------------------------------------------

// (redrawn with the location kit in scene-kraken.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('kraken', {
  info: {
    name: 'Shipwreck',
    subtitle: 'Boss: KRAKEN TOES',
    ambient: ['sparkle'],
    glows: [
      g(SW.chest.x, SW.chest.y - 80, 200, '#ffd060', 0.35),
      g(870, 120, 300, '#8af0ff', 0.1),
      g(1270, 140, 240, '#8af0ff', 0.1),
    ],
    light: '#80d0e0',
    tableTint: '#d8f0f0',
  },
  draw: drawShipwreck,
});

// (redrawn with the location kit in scene-rinkqueen.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('rinkqueen', {
  info: {
    name: 'Skate Bowl',
    subtitle: 'Boss: QUEEN OF THE RINK',
    ambient: ['neon', 'confetti'],
    glows: [
      ...SB.lights.map((L) => g(L.x, L.y + 20, 120, '#fffbe8', 0.15)),
      g(SB.crown.x, SB.crown.y, 200, '#ffd84a', 0.35),
      g(960, SB.coping + 22, 400, '#ff4fa3', 0.25),
    ],
    light: '#e0a8ff',
    tableTint: '#f4e8ff',
  },
  draw: drawSkateBowl,
});

// (redrawn with the location kit in scene-yeti.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('yeti', {
  info: {
    name: 'Summit',
    subtitle: 'Boss: THE YETI SKI BOOT',
    ambient: ['snow', 'fog'],
    glows: [g(600, 180, 380, '#4affb0', 0.2), g(1300, 120, 340, '#b05aff', 0.2), g(SM.flag.x + 60, SM.flag.y - 80, 90, '#ff6a4a', 0.05)],
    light: '#c0d8ff',
    tableTint: '#eaf2ff',
  },
  draw: drawSummit,
});
