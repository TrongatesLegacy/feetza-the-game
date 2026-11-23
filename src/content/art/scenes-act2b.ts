// Feetza 2.0 locations, part 2: Roller Rink, Ski Slopes, Haunted Cellar.

import type { GlowSpot } from '../../art/backdrops';
import { registerLegacyScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  FOC,
  H,
  HY,
  OL,
  TY,
  VX,
  W,
  ZB,
  barrel,
  barrelEnd,
  blob,
  clipRect,
  cobweb,
  cone,
  contactShadow,
  cylH,
  cylV,
  darkSpot,
  ellipse,
  fillOl,
  flame,
  fogBand,
  frontFace,
  glow,
  gothicArch,
  grade,
  grainRect,
  laneCalm,
  lgrad,
  neonStroke,
  neonText,
  outline,
  pine,
  planksTop,
  railing,
  range,
  rgba,
  ROUND,
  roundRect,
  shade,
  snowfall,
  stoneBlocks,
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
// Roller Rink

const RK = {
  ball: { x: 960, y: 170 },
  floor: 470,
  barrier: 690,
  booth: { x: 300, y: 520 },
  cabs: [1500, 1640, 1780],
  front: 1036,
};

function discoBall(ctx: Ctx, x: number, y: number, rad: number, r: R): void {
  ctx.strokeStyle = OL;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, -5);
  ctx.lineTo(x, y - rad);
  ctx.stroke();
  glow(ctx, x, y, rad * 3.2, '#c8a8ff', 0.3);
  ellipse(ctx, x, y, rad, rad);
  fillOl(ctx, '#6a6a8a', 5);
  ctx.save();
  ellipse(ctx, x, y, rad, rad);
  ctx.clip();
  const n = 10;
  for (let j = 0; j < n; j++) {
    const lat0 = -Math.PI / 2 + (j / n) * Math.PI;
    const lat1 = -Math.PI / 2 + ((j + 1) / n) * Math.PI;
    const y0 = y + Math.sin(lat0) * rad;
    const y1 = y + Math.sin(lat1) * rad;
    const rw = Math.cos((lat0 + lat1) / 2) * rad;
    const cols = Math.max(3, Math.round(rw / 9));
    for (let i = 0; i < cols; i++) {
      const a0 = -Math.PI / 2 + (i / cols) * Math.PI;
      const a1 = -Math.PI / 2 + ((i + 1) / cols) * Math.PI;
      const x0 = x + Math.sin(a0) * rw;
      const x1 = x + Math.sin(a1) * rw;
      const lit = (i / cols) * 0.6 + (1 - j / n) * 0.4 + r() * 0.5;
      ctx.fillStyle = lit > 0.95 ? '#ffffff' : shade('#8a8aa8', (lit - 0.6) * 0.9);
      ctx.fillRect(x0 + 0.8, y0 + 0.8, x1 - x0 - 1.6, y1 - y0 - 1.6);
    }
  }
  ctx.restore();
  for (const [sx, sy, c] of [
    [x - rad * 0.4, y - rad * 0.4, '#ffffff'],
    [x + rad * 0.3, y + rad * 0.2, '#ff7ad9'],
    [x - rad * 0.1, y + rad * 0.55, '#5ae0ff'],
  ] as [number, number, string][]) {
    glow(ctx, sx, sy, 22, c, 0.8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - 1, sy - 9, 2, 18);
    ctx.fillRect(sx - 9, sy - 1, 18, 2);
  }
}

function arcadeCab(ctx: Ctx, x: number, base: number, body: string, screen: string): void {
  const w = 120;
  const h = 250;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, base);
  ctx.lineTo(x - w / 2, base - h);
  ctx.lineTo(x + w / 2, base - h);
  ctx.lineTo(x + w / 2, base - 120);
  ctx.lineTo(x + w / 2 + 14, base - 96);
  ctx.lineTo(x + w / 2, base - 80);
  ctx.lineTo(x + w / 2, base);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, x - w / 2, w, body), 5);
  // marquee
  roundRect(ctx, x - w / 2 + 8, base - h + 8, w - 16, 34, 4);
  fillOl(ctx, shade(screen, 0.2), 3);
  glow(ctx, x, base - h + 25, 70, screen, 0.4, 0.5);
  // screen
  roundRect(ctx, x - w / 2 + 12, base - h + 54, w - 24, 78, 8);
  fillOl(ctx, '#060410', 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(screen, 0.65);
  for (let k = 0; k < 5; k++) ctx.fillRect(x - 38 + k * 16, base - h + 72 + (k % 2) * 16, 10, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(x - 6, base - h + 110, 12, 8);
  ctx.restore();
  glow(ctx, x, base - h + 92, 90, screen, 0.3);
  // control deck
  ctx.beginPath();
  ctx.rect(x - w / 2, base - 120, w + 14, 22);
  fillOl(ctx, shade(body, -0.2), 4);
  ellipse(ctx, x - 22, base - 112, 7, 7);
  fillOl(ctx, '#ff3a5a', 2.5);
  ellipse(ctx, x + 6, base - 112, 7, 7);
  fillOl(ctx, '#ffd84a', 2.5);
  ellipse(ctx, x + 28, base - 112, 7, 7);
  fillOl(ctx, '#3ae8ff', 2.5);
}

function drawRink(ctx: Ctx, r: R): void {
  const fy = RK.floor;
  // back wall
  vgrad(ctx, 0, 0, W, fy, [
    [0, '#0c0618'],
    [1, '#2a1050'],
  ]);
  // memphis squiggles + triangles, faint
  ctx.lineWidth = 6;
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const y = 60 + r() * (fy - 160);
    const c = ['#ff4fa3', '#3ae8ff', '#ffd84a', '#8a5aff'][i % 4];
    ctx.strokeStyle = rgba(c, 0.13);
    ctx.fillStyle = rgba(c, 0.11);
    if (i % 3 === 0) {
      ctx.beginPath();
      for (let k = 0; k < 5; k++) ctx.lineTo(x + k * 18, y + (k % 2 ? 14 : 0));
      ctx.stroke();
    } else if (i % 3 === 1) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 30, y + 10);
      ctx.lineTo(x + 8, y + 34);
      ctx.closePath();
      ctx.fill();
    } else {
      ellipse(ctx, x, y, 12, 12);
      ctx.stroke();
    }
  }
  grainRect(ctx, 0, 0, W, fy, 0.25);
  // wall neon stripes
  for (const [yy, c] of [
    [fy - 92, '#ff4fa3'],
    [fy - 70, '#3ae8ff'],
  ] as [number, string][])
    neonStroke(ctx, c, 6, () => {
      ctx.beginPath();
      ctx.moveTo(-10, yy);
      ctx.lineTo(W + 10, yy);
      ctx.stroke();
    });
  neonText(ctx, 'ROLLER RINK', 960, 352, 64, ROUND, '#ffd84a', [1, 1, 1, 1, 1, 1, 0.3, 1, 1, 1, 1], 4);
  // beams from the ball
  const { ball } = RK;
  const beams: [number, string][] = [
    [180, '#ff4fa3'],
    [520, '#3ae8ff'],
    [1420, '#ffd84a'],
    [1760, '#8a5aff'],
  ];
  for (const [tx, c] of beams) cone(ctx, ball.x, ball.y, 20, tx, TY, 260, c, 0.035);
  // light specks scattered on the wall
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 120; i++) {
    const c = ['#ffffff', '#ff9ae0', '#9af0ff'][i % 3];
    ctx.fillStyle = rgba(c, 0.25 + r() * 0.4);
    const s = 2 + r() * 4;
    ctx.fillRect(r() * W, 70 + r() * (fy - 140), s, s * 0.6);
  }
  ctx.restore();
  // glossy maple floor in perspective
  vgrad(ctx, 0, fy, W, RK.barrier - fy, [
    [0, '#6a3a22'],
    [1, '#b8783e'],
  ]);
  ctx.strokeStyle = 'rgba(40,16,4,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let X = -60; X <= 60; X += 1) {
    const x0 = VX + X * 26 * ((fy - HY) / (TY - HY));
    const x1 = VX + X * 26 * ((RK.barrier - HY) / (TY - HY));
    ctx.moveTo(x0, fy);
    ctx.lineTo(x1, RK.barrier);
  }
  ctx.stroke();
  // painted rink circle
  ctx.strokeStyle = 'rgba(255,90,170,0.5)';
  ctx.lineWidth = 6;
  ellipse(ctx, VX, 600, 620, 70);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,230,255,0.4)';
  ellipse(ctx, VX, 600, 660, 80);
  ctx.stroke();
  // floor reflections of the neon and beams
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [tx, c] of beams) darkSpot(ctx, tx * 0.6 + ball.x * 0.4, 600, 160, 70, 0.22, c);
  vgrad(ctx, 0, fy, W, 60, [
    [0, 'rgba(255,79,163,0.25)'],
    [1, 'rgba(255,79,163,0)'],
  ]);
  ctx.restore();
  ctx.fillStyle = rgba(OL, 0.9);
  ctx.fillRect(0, fy - 2, W, 4);
  // DJ booth
  const { booth } = RK;
  for (const sx of [booth.x - 220, booth.x + 220]) {
    roundRect(ctx, sx - 50, booth.y - 220, 100, 220, 8);
    fillOl(ctx, '#1a1626', 5);
    for (const [cy, rr] of [
      [booth.y - 170, 30],
      [booth.y - 76, 40],
    ]) {
      ellipse(ctx, sx, cy, rr, rr);
      fillOl(ctx, '#2a2636', 4);
      ellipse(ctx, sx, cy, rr * 0.4, rr * 0.4);
      ctx.fillStyle = '#4a4660';
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.moveTo(booth.x - 170, booth.y);
  ctx.lineTo(booth.x - 150, booth.y - 120);
  ctx.lineTo(booth.x + 150, booth.y - 120);
  ctx.lineTo(booth.x + 170, booth.y);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, booth.y - 120, 0, booth.y, [
    [0, '#3a2a5a'],
    [1, '#160c26'],
  ]), 5);
  neonStroke(ctx, '#3ae8ff', 4, () => {
    ctx.beginPath();
    ctx.moveTo(booth.x - 150, booth.y - 96);
    ctx.lineTo(booth.x + 150, booth.y - 96);
    ctx.stroke();
  });
  neonText(ctx, 'DJ', booth.x, booth.y - 50, 54, ROUND, '#ff4fa3', undefined, 4);
  for (const dx of [-80, 80]) {
    ellipse(ctx, booth.x + dx, booth.y - 128, 52, 12);
    fillOl(ctx, '#111018', 4);
    ellipse(ctx, booth.x + dx, booth.y - 128, 14, 4);
    ctx.fillStyle = '#ff4fa3';
    ctx.fill();
  }
  // arcade cabinets
  const cols: [string, string][] = [
    ['#3a1a6a', '#3ae8ff'],
    ['#6a1a3a', '#ffd84a'],
    ['#1a3a6a', '#ff4fa3'],
  ];
  RK.cabs.forEach((cx, i) => arcadeCab(ctx, cx, 560, cols[i][0], cols[i][1]));
  laneCalm(ctx, 0.15, 60, 560, '#05020c');
  discoBall(ctx, ball.x, ball.y, 62, r);
  // rink barrier with carpeted panel
  const by = RK.barrier;
  ctx.beginPath();
  ctx.rect(-10, by, W + 20, TY - by + 6);
  fillOl(ctx, '#2a1250', 5);
  ctx.save();
  clipRect(ctx, 0, by, W, TY - by);
  for (let i = 0; i < 160; i++) {
    const c = ['#ff4fa3', '#3ae8ff', '#ffd84a'][i % 3];
    ctx.fillStyle = rgba(c, 0.5);
    const x = r() * W;
    const y = by + r() * (TY - by);
    if (i % 2) ctx.fillRect(x, y, 10, 3);
    else {
      ellipse(ctx, x, y, 3, 3);
      ctx.fill();
    }
  }
  ctx.restore();
  roundRect(ctx, -10, by - 16, W + 20, 26, 12);
  fillOl(ctx, cylV(ctx, by - 16, 26, '#d03a8a'), 5);
  // memphis confetti laminate counter
  const f = RK.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  vgrad(ctx, 0, TY, W, f - TY, [
    [0, '#1e1a3a'],
    [1, '#3a3260'],
  ]);
  for (let i = 0; i < 130; i++) {
    const X = (r() - 0.5) * 4.4;
    const z = ZB - r() * (ZB - zFront(f));
    const s = FOC / z / 460;
    ctx.save();
    ctx.translate(xAt(X, z), yAt(z));
    ctx.scale(s, s * 0.5);
    ctx.rotate(r() * 6.28);
    ctx.fillStyle = rgba(['#ff4fa3', '#3ae8ff', '#ffd84a', '#f2f2ff', '#8a5aff'][i % 5], 0.7);
    if (i % 3 === 0) ctx.fillRect(-12, -3, 24, 6);
    else if (i % 3 === 1) {
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(9, 7);
      ctx.lineTo(-9, 7);
      ctx.fill();
    } else {
      ellipse(ctx, 0, 0, 6, 6);
      ctx.fill();
    }
    ctx.restore();
  }
  // gloss streak
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  darkSpot(ctx, VX, TY + 60, 900, 50, 0.16, '#c8a8ff');
  ctx.restore();
  grainRect(ctx, 0, TY, W, f - TY, 0.2);
  ctx.restore();
  frontFace(ctx, f, () => {
    ctx.fillStyle = lgrad(ctx, 0, f, 0, H, [
      [0, '#2a1a4a'],
      [1, '#120a20'],
    ]);
    ctx.fillRect(0, f, W, H - f);
  }, 0.2);
  neonStroke(ctx, '#ff4fa3', 5, () => {
    ctx.beginPath();
    ctx.moveTo(-10, f + 14);
    ctx.lineTo(W + 10, f + 14);
    ctx.stroke();
  });
  contactShadow(ctx, 0.5);
  tableLight(ctx, '#d8b0ff', 0.05, 0.45);
  vignette(ctx, 0.75, '#05020c');
}

// ---------------------------------------------------------------------------------------------
// Ski Slopes

const SL = {
  sun: { x: 520, y: 150 },
  hut: { x: 270, y: 640 },
  front: 1040,
  cable: { x0: -40, y0: 470, x1: W + 40, y1: 150 },
};

function liftChair(ctx: Ctx, x: number, y: number, col: string): void {
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 60);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 34, y + 60);
  ctx.lineTo(x + 34, y + 60);
  ctx.lineTo(x + 34, y + 88);
  ctx.lineTo(x - 34, y + 88);
  ctx.closePath();
  ctx.moveTo(x - 34, y + 60);
  ctx.lineTo(x - 34, y + 30);
  ctx.lineTo(x + 34, y + 30);
  ctx.lineTo(x + 34, y + 60);
  ctx.stroke();
  roundRect(ctx, x - 36, y + 80, 72, 12, 4);
  fillOl(ctx, col, 3);
  roundRect(ctx, x - 36, y + 34, 72, 10, 4);
  fillOl(ctx, col, 3);
}

function chalet(ctx: Ctx, x: number, base: number): void {
  const w = 300;
  const h = 150;
  // chimney smoke
  for (let i = 0; i < 8; i++) darkSpot(ctx, x + 90 + i * 12, base - h - 160 - i * 26, 30 + i * 6, 20 + i * 4, 0.35 - i * 0.03, '#f4f8ff');
  ctx.beginPath();
  ctx.rect(x + 70, base - h - 130, 36, 80);
  fillOl(ctx, '#6a5a52', 4);
  ctx.beginPath();
  ctx.rect(x - w / 2, base - h, w, h);
  fillOl(ctx, lgrad(ctx, 0, base - h, 0, base, [
    [0, '#8a5232'],
    [1, '#5a321e'],
  ]), 5);
  ctx.strokeStyle = 'rgba(30,12,4,0.45)';
  ctx.lineWidth = 2;
  for (let y = base - h + 18; y < base; y += 18) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.stroke();
  }
  for (const dx of [-80, 80]) {
    roundRect(ctx, dx + x - 32, base - h + 34, 64, 54, 4);
    fillOl(ctx, lgrad(ctx, 0, base - h + 34, 0, base - h + 88, [
      [0, '#fff0b0'],
      [1, '#ffaa40'],
    ]), 4);
    ctx.fillStyle = OL;
    ctx.fillRect(dx + x - 2, base - h + 34, 4, 54);
    ctx.fillStyle = '#c83a2a';
    ctx.fillRect(dx + x - 46, base - h + 30, 12, 62);
    ctx.fillRect(dx + x + 34, base - h + 30, 12, 62);
    glow(ctx, dx + x, base - h + 60, 70, '#ffb050', 0.35);
  }
  roundRect(ctx, x - 30, base - 70, 60, 70, 6);
  fillOl(ctx, '#3a2010', 4);
  // roof with heavy snow
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 40, base - h + 6);
  ctx.lineTo(x, base - h - 110);
  ctx.lineTo(x + w / 2 + 40, base - h + 6);
  ctx.closePath();
  fillOl(ctx, '#4a2a18', 5);
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 50, base - h + 4);
  ctx.lineTo(x, base - h - 122);
  ctx.lineTo(x + w / 2 + 50, base - h + 4);
  for (let k = 10; k >= 0; k--) {
    const t = k / 10;
    const px = x - w / 2 - 50 + t * (w + 100);
    ctx.lineTo(px, base - h - 10 - Math.abs(t - 0.5) * 2 * -10 + (k % 2 ? 14 : 4) - (1 - Math.abs(t - 0.5) * 2) * 110 + 4);
  }
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, base - h - 120, 0, base - h + 10, [
    [0, '#ffffff'],
    [1, '#c8d8f0'],
  ]), 5);
}

function drawSlopes(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, 560, [
    [0, '#2a6ad0'],
    [0.6, '#6aa8ec'],
    [1, '#c8e4ff'],
  ]);
  glow(ctx, SL.sun.x, SL.sun.y, 520, '#fff4c8', 0.35);
  ellipse(ctx, SL.sun.x, SL.sun.y, 58, 58);
  ctx.fillStyle = '#fffbe8';
  ctx.fill();
  // puffy clouds
  for (const [cx, cy, s] of [
    [1100, 150, 1],
    [1500, 250, 0.8],
    [250, 290, 0.7],
  ]) {
    ctx.beginPath();
    for (const [dx, dy, rr] of [
      [-80, 10, 44],
      [-30, -14, 58],
      [40, -6, 50],
      [90, 14, 36],
    ]) {
      ctx.moveTo(cx + dx * s + rr * s, cy + dy * s);
      ctx.arc(cx + dx * s, cy + dy * s, rr * s, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.fillStyle = 'rgba(150,180,230,0.35)';
    ctx.fillRect(cx - 130 * s, cy + 14 * s, 260 * s, 30 * s);
  }
  // far range
  range(ctx, 560, [
    [-40, 470], [140, 300], [320, 420], [520, 250], [760, 400], [980, 220], [1220, 380], [1440, 270], [1680, 400], [1860, 300], [1980, 420],
  ], lgrad(ctx, 0, 220, 0, 560, [
    [0, '#8aa8d8'],
    [1, '#b8cce8'],
  ]), '#f4f8ff', 0.35);
  vgrad(ctx, 0, 380, W, 180, [
    [0, 'rgba(220,236,255,0)'],
    [1, 'rgba(220,236,255,0.6)'],
  ]);
  // main slope
  ctx.beginPath();
  ctx.moveTo(-10, 440);
  ctx.bezierCurveTo(500, 430, 1100, 520, W + 10, 500);
  ctx.lineTo(W + 10, TY);
  ctx.lineTo(-10, TY);
  ctx.closePath();
  ctx.fillStyle = lgrad(ctx, 0, 440, 0, TY, [
    [0, '#e4ecfa'],
    [0.5, '#c4d2ea'],
    [1, '#9eb0d2'],
  ]);
  ctx.fill();
  outline(ctx, 4);
  // piste grooming lines + ski tracks
  ctx.strokeStyle = 'rgba(120,150,200,0.25)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 10; k++) {
    ctx.beginPath();
    const y = 470 + k * 22;
    ctx.moveTo(-10, y);
    ctx.bezierCurveTo(600, y + 10, 1200, y + 60, W + 10, y + 40);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(90,120,180,0.35)';
  ctx.lineWidth = 3;
  for (const sx of [720, 1240]) {
    ctx.beginPath();
    ctx.moveTo(sx, 470);
    for (let k = 1; k <= 8; k++) ctx.lineTo(sx + (k % 2 ? 40 : -40) + k * 10, 470 + k * 24);
    ctx.stroke();
  }
  for (let i = 0; i < 22; i++) {
    const px = 380 + r() * 1200;
    const base = 470 + ((px - 380) / 1200) * 60 + r() * 20;
    const ph = 30 + r() * 30;
    pine(ctx, px, base, ph, ph * 0.5, '#2a5a5a', 4, 'rgba(240,246,255,0.8)');
  }
  darkSpot(ctx, 1100, 600, 900, 90, 0.25, '#5a70a8');
  // pines on the slope edges
  for (let i = 0; i < 14; i++) {
    const side = i % 2;
    const px = side ? 1380 + r() * 520 : 520 + r() * 260;
    const base = 520 + r() * 60;
    const ph = 90 + r() * 90;
    pine(ctx, px, base, ph, ph * 0.5, '#1e4a3a', 5, 'rgba(240,246,255,0.95)');
  }
  // ski lift
  const { cable } = SL;
  for (const tx of [560, 1420]) {
    const ty = cable.y0 + ((tx - cable.x0) / (cable.x1 - cable.x0)) * (cable.y1 - cable.y0);
    ctx.beginPath();
    ctx.rect(tx - 9, ty, 18, 600 - ty);
    fillOl(ctx, cylH(ctx, tx - 9, 18, '#8a8e98'), 4);
    ctx.beginPath();
    ctx.rect(tx - 60, ty - 6, 120, 12);
    fillOl(ctx, '#5a5e68', 3);
  }
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cable.x0, cable.y0);
  ctx.lineTo(cable.x1, cable.y1);
  ctx.moveTo(cable.x0, cable.y0 + 10);
  ctx.lineTo(cable.x1, cable.y1 + 10);
  ctx.stroke();
  for (const [t, c] of [
    [0.15, '#d0342a'],
    [0.42, '#2a6ac8'],
    [0.62, '#d0342a'],
    [0.86, '#f0b030'],
  ] as [number, string][]) {
    const x = cable.x0 + t * (cable.x1 - cable.x0);
    const y = cable.y0 + t * (cable.y1 - cable.y0);
    liftChair(ctx, x, y, c);
  }
  chalet(ctx, SL.hut.x, SL.hut.y);
  laneCalm(ctx, 0.06, 80, 600, '#1a2a50');
  // terrace railing with snow on top
  railing(ctx, 660, TY, 180, '#8a5a32', 22, [0, 52], 0);
  for (let x = 0; x < W + 180; x += 180) {
    ctx.beginPath();
    ctx.ellipse(x, 646, 22, 10, 0, Math.PI, 0);
    ctx.fillStyle = '#f4f8ff';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-10, 652);
  for (let x = -10; x <= W + 10; x += 40) ctx.quadraticCurveTo(x + 20, 640 - r() * 8, x + 40, 652);
  ctx.lineTo(W + 10, 658);
  ctx.lineTo(-10, 658);
  ctx.closePath();
  fillOl(ctx, '#f4f8ff', 3);
  // snow bank against the railing
  ctx.beginPath();
  ctx.moveTo(-10, TY + 4);
  for (let x = -10; x <= W + 10; x += 120) ctx.quadraticCurveTo(x + 60, TY - 40 - r() * 30, x + 120, TY - 10);
  ctx.lineTo(W + 10, TY + 4);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, TY - 70, 0, TY, [
    [0, '#ffffff'],
    [1, '#b8c8e4'],
  ]), 4);
  // skis and poles stuck in the snow
  for (const [sx, rot, col] of [
    [1700, -0.12, '#f0b030'],
    [1770, 0.05, '#d0342a'],
  ] as [number, number, string][]) {
    ctx.save();
    ctx.translate(sx, TY - 20);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-15, -300);
    ctx.quadraticCurveTo(-15, -350, 8, -360);
    ctx.quadraticCurveTo(15, -334, 15, -300);
    ctx.lineTo(15, 0);
    ctx.closePath();
    fillOl(ctx, cylH(ctx, -15, 30, col), 5);
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(-15, -200, 30, 14);
    ctx.restore();
  }
  for (const [px, rot] of [
    [1640, -0.25],
    [1840, 0.2],
  ]) {
    ctx.save();
    ctx.translate(px, TY - 16);
    ctx.rotate(rot);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -280);
    ctx.stroke();
    ctx.strokeStyle = '#c8ccd4';
    ctx.lineWidth = 5;
    ctx.stroke();
    ellipse(ctx, 0, -20, 18, 5);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  snowfall(ctx, r, 0, 0, W, TY, 90, 0.5, 2.5);
  // pale pine plank table
  planksTop(ctx, r, SL.front, 0.28, '#c8945e', 0.28, 6);
  woodLip(ctx, r, SL.front, '#a06a3a');
  contactShadow(ctx, 0.4);
  glow(ctx, SL.sun.x, 860, 900, '#fff4d8', 0.07, 0.3);
  tableLight(ctx, '#fff4e0', 0.04, 0.35);
  vignette(ctx, 0.5, '#0a1430', 0.35);
}

// ---------------------------------------------------------------------------------------------
// Haunted Cellar

const CL = {
  arch: { x0: 660, x1: 1260, y0: 150 },
  racks: [
    { x0: 260, x1: 560 },
    { x0: 1360, x1: 1660 },
  ],
  candles: [
    { x: 150, y: 470 },
    { x: 1770, y: 520 },
    { x: 590, y: 660 },
  ],
  front: 1040,
};

function wineRack(ctx: Ctx, r: R, x0: number, x1: number, y0: number, y1: number): void {
  const w = x1 - x0;
  ctx.fillStyle = '#0a0806';
  ctx.fillRect(x0, y0, w, y1 - y0);
  // bottle ends in a grid
  const cell = 46;
  for (let y = y0 + cell / 2; y < y1; y += cell)
    for (let x = x0 + cell / 2; x < x1; x += cell) {
      if (r() < 0.18) continue;
      ellipse(ctx, x, y, 15, 15);
      const c = r() < 0.6 ? '#1e3a1e' : '#3a1420';
      fillOl(ctx, c, 3);
      ellipse(ctx, x, y, 7, 7);
      ctx.fillStyle = shade(c, -0.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(200,255,220,0.35)';
      ctx.fillRect(x - 9, y - 9, 4, 4);
    }
  // diagonal lattice
  ctx.save();
  clipRect(ctx, x0, y0, w, y1 - y0);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 11;
  ctx.beginPath();
  for (let k = -(y1 - y0); k < w + (y1 - y0); k += cell * 2) {
    ctx.moveTo(x0 + k, y0);
    ctx.lineTo(x0 + k + (y1 - y0), y1);
    ctx.moveTo(x0 + k, y1);
    ctx.lineTo(x0 + k + (y1 - y0), y0);
  }
  ctx.stroke();
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.rect(x0, y0, w, y1 - y0);
  ctx.strokeStyle = '#4a2c18';
  ctx.lineWidth = 16;
  ctx.stroke();
  outline(ctx, 4);
}

function candle(ctx: Ctx, r: R, x: number, y: number, h: number): void {
  // wax drips
  roundRect(ctx, x - 12, y - h, 24, h, 4);
  fillOl(ctx, cylH(ctx, x - 12, 24, '#e8e0c8'), 4);
  ctx.fillStyle = '#f4eedc';
  for (let k = 0; k < 3; k++) {
    const dx = x - 9 + k * 8;
    roundRect(ctx, dx, y - h - 2, 6, 14 + r() * 22, 3);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - 30, y);
  ctx.quadraticCurveTo(x, y - 12, x + 30, y);
  ctx.closePath();
  ctx.fillStyle = '#e8e0c8';
  ctx.fill();
  flame(ctx, x, y - h - 2, 18, 40, r, ['#ff6a1a', '#ffb030', '#fff6c0']);
  glow(ctx, x, y - h - 20, 160, '#ffb050', 0.35);
  glow(ctx, x, y - h - 16, 40, '#fff2c0', 0.6);
}

function drawCellar(ctx: Ctx, r: R): void {
  stoneBlocks(ctx, r, 0, 0, W, TY, ['#4a4a44', '#55524a', '#3e3e3a', '#5a564c'], '#24221e', 74, 12);
  vgrad(ctx, 0, 0, W, TY, [
    [0, 'rgba(2,8,6,0.7)'],
    [0.5, 'rgba(2,8,6,0.25)'],
    [1, 'rgba(2,8,6,0.45)'],
  ]);
  // damp streaks
  for (let i = 0; i < 14; i++) {
    const x = r() * W;
    vgrad(ctx, x, 0, 20 + r() * 30, 200 + r() * 300, [
      [0, 'rgba(20,40,20,0.35)'],
      [1, 'rgba(20,40,20,0)'],
    ]);
  }
  // ceiling vault ribs
  ctx.strokeStyle = OL;
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(-40, 160);
  ctx.quadraticCurveTo(VX, -150, W + 40, 160);
  ctx.stroke();
  ctx.strokeStyle = '#5a564c';
  ctx.lineWidth = 26;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-40, 148);
  ctx.quadraticCurveTo(VX, -162, W + 40, 148);
  ctx.stroke();
  // central arch: tunnel receding into a ghostly glow
  const { x0, x1, y0 } = CL.arch;
  const ax = (x0 + x1) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, TY);
  ctx.lineTo(x0, y0 + (x1 - x0) / 2);
  ctx.arc(ax, y0 + (x1 - x0) / 2, (x1 - x0) / 2, Math.PI, 0);
  ctx.lineTo(x1, TY);
  ctx.closePath();
  ctx.fillStyle = '#040806';
  ctx.fill();
  ctx.clip();
  for (let k = 1; k <= 6; k++) {
    const s = Math.pow(0.78, k);
    const hw = ((x1 - x0) / 2) * s;
    const cy = 470 + (y0 + (x1 - x0) / 2 - 470) * s;
    const bot = 470 + (TY - 470) * s;
    ctx.beginPath();
    ctx.moveTo(ax - hw, bot);
    ctx.lineTo(ax - hw, cy);
    ctx.arc(ax, cy, hw, Math.PI, 0);
    ctx.lineTo(ax + hw, bot);
    ctx.strokeStyle = rgba(mixGreen(k), 0.9);
    ctx.lineWidth = 26 * s + 4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fill();
  }
  glow(ctx, ax, 470, 260, '#4dffb0', 0.45);
  glow(ctx, ax, 470, 90, '#c8ffe8', 0.4);
  // floor of the tunnel
  ctx.beginPath();
  ctx.moveTo(x0, TY);
  ctx.lineTo(ax - 40, 560);
  ctx.lineTo(ax + 40, 560);
  ctx.lineTo(x1, TY);
  ctx.closePath();
  ctx.fillStyle = 'rgba(30,60,40,0.45)';
  ctx.fill();
  ctx.restore();
  // voussoirs around the arch
  const rad = (x1 - x0) / 2;
  const cy = y0 + rad;
  for (let k = 0; k <= 12; k++) {
    const a0 = Math.PI + (k / 13) * Math.PI;
    const a1 = Math.PI + ((k + 1) / 13) * Math.PI;
    ctx.beginPath();
    ctx.arc(ax, cy, rad + 54, a0, a1);
    ctx.arc(ax, cy, rad, a1, a0, true);
    ctx.closePath();
    fillOl(ctx, shade(k % 2 ? '#6a665a' : '#5e5a50', (r() - 0.5) * 0.15), 4);
  }
  for (const sx of [x0 - 54, x1]) {
    for (let y = cy; y < TY; y += 64) {
      ctx.beginPath();
      ctx.rect(sx, y, 54, 64);
      fillOl(ctx, shade('#5e5a50', (r() - 0.5) * 0.2), 4);
    }
  }
  // wine racks in side alcoves
  for (const rk of CL.racks) {
    const top = 260;
    gothicArch(ctx, rk.x0 - 20, rk.x1 + 20, top - 40, TY);
    ctx.fillStyle = '#0c0a08';
    ctx.fill();
    outline(ctx, 6);
    wineRack(ctx, r, rk.x0, rk.x1, top + 120, TY - 10);
  }
  // barrels: a stack on the left, one upright on the right
  barrelEnd(ctx, 80, 690, 74);
  barrelEnd(ctx, 230, 690, 74);
  barrelEnd(ctx, 155, 566, 74);
  barrel(ctx, 1770, 650, 170, 220, '#6a4022');
  ellipse(ctx, 1770, 540, 85, 20);
  fillOl(ctx, '#7a4a28', 4);
  barrel(ctx, 600, 700, 110, 120, '#5a3a20');
  ellipse(ctx, 600, 640, 55, 13);
  fillOl(ctx, '#6a4426', 4);
  // cobwebs
  cobweb(ctx, 0, 0, 280, 0, Math.PI / 2, r, 0.4);
  cobweb(ctx, W, 0, 300, Math.PI / 2, Math.PI, r, 0.4);
  cobweb(ctx, CL.racks[0].x1 + 20, 260, 120, Math.PI / 2, Math.PI, r, 0.35);
  cobweb(ctx, CL.racks[1].x0 - 20, 260, 120, 0, Math.PI / 2, r, 0.35);
  cobweb(ctx, 1770 - 85, 540, 90, -Math.PI / 2, 0, r, 0.3);
  // hanging chain lantern, unlit
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(1560, 0);
  ctx.lineTo(1560, 150);
  ctx.stroke();
  laneCalm(ctx, 0.18, 60, 600, '#010403');
  // candles
  candle(ctx, r, 155, 492, 54);
  candle(ctx, r, 1770, 530, 70);
  candle(ctx, r, 600, 636, 40);
  // ghostly mist low
  fogBand(ctx, r, 700, 120, '#7affc8', 0.18, 30);
  // old, dark table planks with wax drips
  planksTop(ctx, r, CL.front, 0.24, '#5a3a24', 0.35, 8);
  ctx.save();
  clipRect(ctx, 0, TY, W, CL.front - TY);
  for (let i = 0; i < 10; i++) {
    const X = (r() - 0.5) * 3.6;
    const z = ZB - r() * 1.2;
    const s = FOC / z / 460;
    ctx.save();
    ctx.translate(xAt(X, z), yAt(z));
    ctx.scale(s, s * 0.45);
    blob(ctx, 0, 0, 10 + r() * 16, 0.5, r, 8);
    ctx.fillStyle = 'rgba(232,224,200,0.55)';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  woodLip(ctx, r, CL.front, '#4a2c18');
  contactShadow(ctx, 0.6);
  grade(ctx, 0.3, '#a8d8c0', 0.35);
  glow(ctx, ax, 600, 600, '#4dffb0', 0.1, 0.5);
  for (const c of CL.candles) glow(ctx, c.x, 860, 300, '#ffb050', 0.08, 0.3);
  tableLight(ctx, '#b0e0b8', 0.05, 0.55);
  fogBand(ctx, r, 990, 140, '#9fe8d0', 0.1, 20);
  vignette(ctx, 0.9, '#010403', 0.6);
}

function mixGreen(k: number): string {
  return shade('#3a5a4a', -0.1 * k + 0.1);
}

// ---------------------------------------------------------------------------------------------

// (redrawn with the location kit in scene-rink.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('rink', {
  info: {
    name: 'Roller Rink',
    subtitle: 'Waves 46–49',
    ambient: ['neon'],
    glows: [
      g(RK.ball.x, RK.ball.y, 200, '#c8a8ff', 0.3),
      g(RK.booth.x, RK.booth.y - 50, 160, '#ff4fa3', 0.35),
      ...RK.cabs.map((x, i) => g(x, 400, 110, ['#3ae8ff', '#ffd84a', '#ff4fa3'][i], 0.4)),
      g(960, 352, 300, '#ffd84a', 0.25),
    ],
    light: '#d8b0ff',
    tableTint: '#f0e6ff',
  },
  draw: drawRink,
});

// (redrawn with the location kit in scene-slopes.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('slopes', {
  info: {
    name: 'Ski Slopes',
    subtitle: 'Waves 51–54',
    ambient: ['snow'],
    glows: [g(SL.sun.x, SL.sun.y, 260, '#fff4c8', 0.05), g(SL.hut.x - 80, SL.hut.y - 90, 80, '#ffb050', 0.3), g(SL.hut.x + 80, SL.hut.y - 90, 80, '#ffb050', 0.3)],
    light: '#f4f8ff',
    tableTint: '#fbfcff',
  },
  draw: drawSlopes,
});

// (redrawn with the location kit in scene-cellar.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('cellar', {
  info: {
    name: 'Haunted Cellar',
    subtitle: 'Waves 56–59',
    ambient: ['wisps', 'fog'],
    glows: [
      g((CL.arch.x0 + CL.arch.x1) / 2, 470, 260, '#4dffb0', 0.6),
      g(155, 420, 140, '#ffb050', 0.7),
      g(1770, 440, 140, '#ffb050', 0.7),
      g(600, 580, 120, '#ffb050', 0.7),
    ],
    light: '#b0e0b8',
    tableTint: '#e2f0e4',
  },
  draw: drawCellar,
});
