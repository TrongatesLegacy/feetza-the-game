// Feetza 2.0 locations, part 1: Nonna's Kitchen, Old Town Rooftops, The Pier.

import { registerLegacyScene, registerScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  H,
  OL,
  TY,
  W,
  ZB,
  bandCloth,
  bandsX,
  bandsZ,
  catenaryPt,
  checkerTop,
  clipRect,
  contactShadow,
  cylH,
  cylV,
  darkSpot,
  ellipse,
  fillOl,
  flame,
  frontFace,
  glow,
  grade,
  grainRect,
  hgrad,
  laneCalm,
  lgrad,
  moon,
  mottle,
  outline,
  planksTop,
  railing,
  rgba,
  roundRect,
  shade,
  stars,
  terracottaPot,
  tableLight,
  tiles,
  vgrad,
  vignette,
  woodLip,
  xAt,
  yAt,
  zFront,
} from '../../art/sceneKit';
import type { GlowSpot } from '../../art/backdrops';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

// ---------------------------------------------------------------------------------------------
// Nonna's Kitchen

const KT = {
  pot: { x: 230, y: 470 },
  oven: { x: 285, y: 640 },
  front: 1040,
};

function copperPan(ctx: Ctx, x: number, hookY: number, rad: number, handle: number): void {
  const cy = hookY + handle + rad;
  // hook
  ctx.strokeStyle = OL;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, hookY + 4, 9, Math.PI * 0.1, Math.PI * 1.1, true);
  ctx.stroke();
  // handle
  roundRect(ctx, x - 9, hookY + 6, 18, handle + 14, 8);
  fillOl(ctx, cylH(ctx, x - 9, 18, '#8a5a36'), 4);
  ellipse(ctx, x, hookY + 20, 4, 6);
  ctx.fillStyle = OL;
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, x + 12, cy + 14, rad, rad);
  ctx.fill();
  ellipse(ctx, x, cy, rad, rad);
  const gr = ctx.createRadialGradient(x - rad * 0.35, cy - rad * 0.35, rad * 0.1, x, cy, rad);
  gr.addColorStop(0, '#ffd0a0');
  gr.addColorStop(0.35, '#d8804a');
  gr.addColorStop(0.8, '#a04a24');
  gr.addColorStop(1, '#5a2410');
  fillOl(ctx, gr, 5);
  ellipse(ctx, x, cy, rad * 0.78, rad * 0.78);
  ctx.strokeStyle = 'rgba(90,30,10,0.45)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,200,0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, cy, rad * 0.62, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
}

function garlicBraid(ctx: Ctx, r: R, x: number, y0: number, y1: number): void {
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  ctx.stroke();
  for (let y = y0 + 40, k = 0; y < y1 + 10; y += 30, k++) {
    const bx = x + (k % 2 ? 16 : -16) + (r() - 0.5) * 4;
    const br = 18 + r() * 4;
    ctx.beginPath();
    ctx.moveTo(bx, y - br * 1.5);
    ctx.quadraticCurveTo(bx + br * 1.2, y - br * 0.4, bx + br * 0.8, y + br * 0.5);
    ctx.quadraticCurveTo(bx, y + br * 1.1, bx - br * 0.8, y + br * 0.5);
    ctx.quadraticCurveTo(bx - br * 1.2, y - br * 0.4, bx, y - br * 1.5);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, bx - br, 0, bx + br, 0, [
      [0, '#c8b8a0'],
      [0.4, '#f6eee0'],
      [1, '#b0a088'],
    ]), 3.5);
    ctx.strokeStyle = 'rgba(150,110,140,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx - 6, y - br * 0.6);
    ctx.quadraticCurveTo(bx - 8, y + br * 0.3, bx - 3, y + br * 0.8);
    ctx.moveTo(bx + 5, y - br * 0.6);
    ctx.quadraticCurveTo(bx + 8, y + br * 0.3, bx + 3, y + br * 0.8);
    ctx.stroke();
  }
}

function herbBundle(ctx: Ctx, r: R, x: number, y0: number, len: number, col: string): void {
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y0 + 40);
  ctx.stroke();
  const top = y0 + 40;
  for (let i = 0; i < 14; i++) {
    const sx = x + (r() - 0.5) * 16;
    const ex = x + (r() - 0.5) * 70;
    const ey = top + len * (0.7 + r() * 0.3);
    ctx.strokeStyle = shade(col, -0.35);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, top);
    ctx.quadraticCurveTo(sx, top + len * 0.4, ex, ey);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const t = 0.35 + k * 0.18;
      const lx = sx + (ex - sx) * t * t;
      const ly = top + (ey - top) * t;
      ellipse(ctx, lx + (r() - 0.5) * 8, ly, 6, 11, (r() - 0.5) * 1.2);
      ctx.fillStyle = shade(col, (r() - 0.5) * 0.3);
      ctx.fill();
    }
  }
  roundRect(ctx, x - 12, top - 6, 24, 14, 4);
  fillOl(ctx, '#c83a2a', 3);
}

function stockPot(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, metal: string, sauce = true): void {
  for (const sd of [-1, 1]) {
    roundRect(ctx, x + sd * (w / 2 + 6) - 14, y - h + 22, 28, 14, 7);
    fillOl(ctx, metal, 4);
  }
  ctx.beginPath();
  ctx.rect(x - w / 2, y - h, w, h);
  fillOl(ctx, cylH(ctx, x - w / 2, w, metal), 5);
  ellipse(ctx, x, y - h, w / 2 + 6, 16);
  fillOl(ctx, cylH(ctx, x - w / 2 - 6, w + 12, shade(metal, 0.15)), 5);
  if (!sauce) return;
  ellipse(ctx, x, y - h + 2, w / 2 - 4, 11);
  const sg = ctx.createRadialGradient(x - w * 0.15, y - h - 2, 4, x, y - h, w / 2);
  sg.addColorStop(0, '#ff7a4a');
  sg.addColorStop(0.6, '#c42a18');
  sg.addColorStop(1, '#7a1408');
  ctx.fillStyle = sg;
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const bx = x + (r() - 0.5) * w * 0.7;
    const by = y - h + (r() - 0.5) * 10;
    ellipse(ctx, bx, by, 4 + r() * 5, 2 + r() * 2);
    ctx.strokeStyle = 'rgba(255,170,130,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function steam(ctx: Ctx, r: R, x: number, y: number, h: number, a: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const sx = x + Math.sin(t * 7 + r()) * 30 * t;
    const sy = y - t * h;
    darkSpot(ctx, sx, sy, 30 + t * 60, 22 + t * 40, a * (1 - t) * (0.6 + r() * 0.4), '#fff4ea');
  }
  ctx.restore();
}

function drawKitchen(ctx: Ctx, r: R): void {
  // warm plaster upper wall
  vgrad(ctx, 0, 0, W, 420, [
    [0, '#8a5a30'],
    [1, '#e0b070'],
  ]);
  mottle(ctx, 0, 0, W, 420, 0.4, 1.4);
  grainRect(ctx, 0, 0, W, 420, 0.25);
  // ceiling beam
  ctx.beginPath();
  ctx.rect(-10, -10, W + 20, 62);
  fillOl(ctx, cylV(ctx, -10, 62, '#5a361e'), 5);
  for (const bx of [380, 1540]) {
    ctx.beginPath();
    ctx.rect(bx - 26, -10, 52, 70);
    fillOl(ctx, cylH(ctx, bx - 26, 52, '#4a2c18'), 4);
  }
  // tiled backsplash with a majolica border
  const ty0 = 420;
  tiles(ctx, r, 0, ty0 + 44, W, TY - ty0 - 44, 64, ['#f2ead8', '#ece2cc', '#f6f0e2'], '#b8a88a');
  ctx.save();
  clipRect(ctx, 0, ty0, W, 44);
  ctx.fillStyle = '#1e4a8a';
  ctx.fillRect(0, ty0, W, 44);
  for (let x = 0; x < W; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x + 22, ty0 + 6);
    ctx.lineTo(x + 38, ty0 + 22);
    ctx.lineTo(x + 22, ty0 + 38);
    ctx.lineTo(x + 6, ty0 + 22);
    ctx.closePath();
    ctx.fillStyle = '#f2e6c8';
    ctx.fill();
    ellipse(ctx, x + 22, ty0 + 22, 6, 6);
    ctx.fillStyle = '#e8a82a';
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = rgba(OL, 0.85);
  ctx.fillRect(0, ty0 - 2, W, 4);
  ctx.fillRect(0, ty0 + 43, W, 3);
  vgrad(ctx, 0, ty0 + 46, W, 40, [
    [0, 'rgba(0,0,0,0.25)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  // shade the tiles toward the table
  vgrad(ctx, 0, ty0, W, TY - ty0, [
    [0, 'rgba(60,30,10,0.05)'],
    [1, 'rgba(60,30,10,0.4)'],
  ]);
  // open shelf with jars and plates (muted, behind the lanes)
  const sy = 330;
  for (let i = 0; i < 6; i++) {
    const px = 720 + i * 92;
    ellipse(ctx, px, sy - 44, 40, 40);
    fillOl(ctx, lgrad(ctx, px - 40, sy - 84, px + 40, sy - 4, [
      [0, '#f6eedc'],
      [1, '#c8b898'],
    ]), 4);
    ellipse(ctx, px, sy - 44, 28, 28);
    ctx.strokeStyle = i % 2 ? 'rgba(30,74,138,0.6)' : 'rgba(180,60,40,0.55)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  for (const [jx, jc, jh] of [
    [650, '#c8402a', 70],
    [1250, '#d8a02a', 60],
    [1310, '#5a8a3a', 76],
  ] as [number, string, number][]) {
    roundRect(ctx, jx - 24, sy - jh, 48, jh, 10);
    fillOl(ctx, lgrad(ctx, jx - 24, 0, jx + 24, 0, [
      [0, shade(jc, -0.3)],
      [0.35, shade(jc, 0.2)],
      [1, shade(jc, -0.4)],
    ]), 4);
    roundRect(ctx, jx - 26, sy - jh - 12, 52, 14, 4);
    fillOl(ctx, '#e8e0d0', 3);
    roundRect(ctx, jx - 18, sy - jh * 0.6, 36, 22, 3);
    ctx.fillStyle = '#f6eedc';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.rect(600, sy, 760, 22);
  fillOl(ctx, cylV(ctx, sy, 22, '#7a4a28'), 5);
  vgrad(ctx, 600, sy + 22, 760, 30, [
    [0, 'rgba(40,16,4,0.4)'],
    [1, 'rgba(40,16,4,0)'],
  ]);
  for (const bx of [640, 1320]) {
    ctx.beginPath();
    ctx.moveTo(bx - 10, sy + 22);
    ctx.lineTo(bx + 10, sy + 22);
    ctx.lineTo(bx + 10, sy + 50);
    ctx.closePath();
    fillOl(ctx, '#5a361e', 3);
  }
  // garlic and herbs hanging from the beam
  garlicBraid(ctx, r, 560, 52, 300);
  herbBundle(ctx, r, 1400, 52, 130, '#5a8a3a');
  herbBundle(ctx, r, 1480, 52, 110, '#7a9a4a');
  herbBundle(ctx, r, 480, 52, 100, '#6a8a3a');
  // copper pan rail on the right
  const railY = 200;
  ctx.beginPath();
  ctx.rect(1560, railY - 7, 340, 14);
  fillOl(ctx, cylV(ctx, railY - 7, 14, '#c8804a'), 4);
  for (const ex of [1570, 1890]) {
    ellipse(ctx, ex, railY, 12, 12);
    fillOl(ctx, '#8a5a36', 3);
  }
  copperPan(ctx, 1620, railY, 64, 70);
  copperPan(ctx, 1740, railY, 46, 60);
  copperPan(ctx, 1850, railY, 56, 80);
  // range hood
  ctx.beginPath();
  ctx.moveTo(110, 170);
  ctx.lineTo(460, 170);
  ctx.lineTo(530, 330);
  ctx.lineTo(40, 330);
  ctx.closePath();
  fillOl(ctx, hgrad(ctx, 40, 530, [
    [0, '#6a3418'],
    [0.3, '#e09a5e'],
    [0.5, '#b8683a'],
    [1, '#5a2a14'],
  ]), 6);
  ctx.beginPath();
  ctx.rect(150, 52, 270, 120);
  fillOl(ctx, cylH(ctx, 150, 270, '#9a5a32'), 5);
  ctx.beginPath();
  ctx.rect(30, 324, 510, 22);
  fillOl(ctx, cylV(ctx, 324, 22, '#d08a50'), 5);
  // stove
  const sx0 = 40;
  const sx1 = 530;
  const top = 500;
  ctx.beginPath();
  ctx.rect(sx0, top, sx1 - sx0, TY - top + 10);
  fillOl(ctx, lgrad(ctx, sx0, top, sx1, TY, [
    [0, '#f4ecd8'],
    [0.6, '#d8cbb0'],
    [1, '#a89a80'],
  ]), 6);
  ctx.beginPath();
  ctx.rect(sx0 - 10, top - 18, sx1 - sx0 + 20, 22);
  fillOl(ctx, cylV(ctx, top - 18, 22, '#2a2624'), 5);
  // knobs
  for (let k = 0; k < 5; k++) {
    const kx = sx0 + 60 + k * 92;
    ellipse(ctx, kx, top + 30, 14, 14);
    fillOl(ctx, '#2a2624', 3.5);
    ctx.fillStyle = '#d8c8a0';
    ctx.fillRect(kx - 2, top + 18, 4, 10);
  }
  // oven door window
  const { oven } = KT;
  roundRect(ctx, oven.x - 190, top + 64, 380, TY - top - 84, 14);
  fillOl(ctx, '#d8cbb0', 5);
  roundRect(ctx, oven.x - 150, top + 96, 300, 120, 12);
  const og = ctx.createRadialGradient(oven.x, top + 190, 10, oven.x, top + 150, 180);
  og.addColorStop(0, '#ffd070');
  og.addColorStop(0.4, '#e0601a');
  og.addColorStop(1, '#3a1008');
  fillOl(ctx, og, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(oven.x - 120, top + 96);
  ctx.lineTo(oven.x - 70, top + 96);
  ctx.lineTo(oven.x - 120, top + 216);
  ctx.lineTo(oven.x - 150, top + 216);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(oven.x - 160, top + 76, 320, 12);
  fillOl(ctx, cylV(ctx, top + 76, 12, '#c8ccd0'), 3.5);
  // pots on the hob
  stockPot(ctx, r, KT.pot.x, top - 16, 190, 120, '#b06838');
  stockPot(ctx, r, 450, top - 16, 110, 60, '#8a9098', false);
  ellipse(ctx, 450, top - 78, 58, 13);
  fillOl(ctx, cylH(ctx, 392, 116, '#a8b0b8'), 4);
  ellipse(ctx, 450, top - 90, 12, 8);
  fillOl(ctx, '#2a2624', 3);
  for (let k = 0; k < 6; k++) flame(ctx, KT.pot.x - 75 + k * 30, top - 18, 22, 22 + r() * 8, r, ['#2a5aff', '#5a9aff', '#c8e0ff']);
  steam(ctx, r, KT.pot.x, top - 150, 260, 0.45);
  steam(ctx, r, 450, top - 100, 160, 0.25);
  glow(ctx, KT.pot.x, top - 136, 140, '#ff7a4a', 0.22, 0.4);
  // tea towel on the oven rail
  ctx.beginPath();
  ctx.moveTo(oven.x + 40, top + 82);
  ctx.lineTo(oven.x + 120, top + 82);
  ctx.lineTo(oven.x + 116, top + 210);
  ctx.lineTo(oven.x + 44, top + 214);
  ctx.closePath();
  fillOl(ctx, '#f2ead8', 4);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(190,40,30,0.7)';
  for (let y = top + 96; y < top + 220; y += 30) ctx.fillRect(oven.x + 30, y, 100, 10);
  ctx.restore();
  // right side: a wooden dresser corner with a bowl of tomatoes
  ctx.beginPath();
  ctx.rect(1560, 560, 380, TY - 560 + 10);
  fillOl(ctx, cylV(ctx, 560, TY - 550, '#7a4a28'), 6);
  ctx.beginPath();
  ctx.rect(1540, 544, 400, 24);
  fillOl(ctx, cylV(ctx, 544, 24, '#8a5a32'), 5);
  for (const dx of [1600, 1760]) {
    roundRect(ctx, dx, 600, 140, 130, 8);
    ctx.strokeStyle = 'rgba(20,8,2,0.5)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ellipse(ctx, dx + 70, 660, 8, 8);
    fillOl(ctx, '#d8a84a', 3);
  }
  ctx.beginPath();
  ctx.moveTo(1640, 500);
  ctx.quadraticCurveTo(1720, 560, 1800, 500);
  ctx.closePath();
  for (const [tx, ty] of [
    [1680, 490],
    [1720, 478],
    [1760, 492],
    [1700, 470],
    [1742, 462],
  ]) {
    ellipse(ctx, tx, ty, 22, 19);
    fillOl(ctx, lgrad(ctx, tx - 20, ty - 18, tx + 20, ty + 18, [
      [0, '#ff6a4a'],
      [1, '#a01a10'],
    ]), 3.5);
    ctx.fillStyle = '#3a7a2a';
    ctx.fillRect(tx - 5, ty - 21, 10, 5);
  }
  ctx.beginPath();
  ctx.moveTo(1630, 494);
  ctx.lineTo(1810, 494);
  ctx.quadraticCurveTo(1800, 548, 1720, 550);
  ctx.quadraticCurveTo(1640, 548, 1630, 494);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, 494, 0, 550, [
    [0, '#f2e6c8'],
    [1, '#b8a88a'],
  ]), 5);
  ctx.strokeStyle = 'rgba(30,74,138,0.7)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(1650, 512);
  ctx.quadraticCurveTo(1720, 530, 1790, 512);
  ctx.stroke();
  laneCalm(ctx, 0.12, 60, 560, '#3a1a08');
  // gingham tablecloth dusted with flour
  bandCloth(ctx, KT.front, '#f4ecdc', [{ period: 0.18, width: 0.09, offset: 0.02, color: rgba('#c8302a', 0.48) }]);
  ctx.save();
  clipRect(ctx, 0, TY, W, KT.front - TY);
  for (let i = 0; i < 7; i++) {
    const X = (r() - 0.5) * 3.4;
    const z = ZB - 0.1 - r() * 1.2;
    darkSpot(ctx, xAt(X, z), yAt(z), 120 / z, 40 / z, 0.4, '#ffffff');
  }
  for (let i = 0; i < 400; i++) {
    const X = (r() - 0.5) * 4;
    const z = ZB - r() * (ZB - zFront(KT.front));
    ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`;
    ctx.fillRect(xAt(X, z), yAt(z), 2, 2);
  }
  ctx.restore();
  contactShadow(ctx, 0.5);
  glow(ctx, oven.x, top + 160, 380, '#ff7a2a', 0.18);
  glow(ctx, 960, 280, 900, '#ffcf80', 0.08, 0.5);
  tableLight(ctx, '#ffd8a0', 0.08, 0.45);
  grade(ctx, 0.06);
  vignette(ctx, 0.72, '#120602');
}

// ---------------------------------------------------------------------------------------------
// Old Town Rooftops

const OT = {
  moon: { x: 1560, y: 200 },
  tower: { x: 760, y: 170 },
  front: 1040,
  line: { x0: 250, y0: 420, x1: 900, y1: 400, sag: 70 },
  lanterns: [{ x: 150, y: 590 }, { x: 1770, y: 590 }],
};

interface House {
  x: number;
  w: number;
  h: number;
  roof: number;
}

function townRow(ctx: Ctx, r: R, base: number, minH: number, maxH: number, minW: number, maxW: number, wall: string, roof: string, win: string, winP: number, olw: number, fog: number): House[] {
  const out: House[] = [];
  let x = -40 - r() * 80;
  while (x < W + 40) {
    const w = minW + r() * (maxW - minW);
    const h = minH + r() * (maxH - minH);
    const rh = w * (0.22 + r() * 0.16);
    const top = base - h;
    const wc = shade(wall, (r() - 0.5) * 0.25);
    const rc = shade(roof, (r() - 0.5) * 0.2);
    // chimney
    if (r() < 0.55) {
      const cx = x + w * (0.25 + r() * 0.5);
      const ch = 30 + r() * 40;
      ctx.beginPath();
      ctx.rect(cx - 11, top - rh * 0.6 - ch, 22, ch + rh * 0.6);
      ctx.fillStyle = shade(wc, -0.15);
      ctx.fill();
      if (olw) outline(ctx, olw * 0.8);
      ctx.beginPath();
      ctx.rect(cx - 15, top - rh * 0.6 - ch - 8, 30, 10);
      ctx.fillStyle = shade(rc, -0.1);
      ctx.fill();
      if (olw) outline(ctx, olw * 0.8);
    }
    ctx.beginPath();
    ctx.rect(x, top, w, h + 6);
    ctx.fillStyle = wc;
    ctx.fill();
    if (olw) outline(ctx, olw);
    // windows with shutters
    for (let wy = top + 24; wy < base - 40; wy += 62)
      for (let wx = x + 20; wx < x + w - 34; wx += 52) {
        const lit = r() < winP;
        ctx.fillStyle = lit ? rgba(win, 0.75 + r() * 0.25) : rgba(shade(wc, -0.5), 0.8);
        ctx.fillRect(wx, wy, 18, 28);
        if (lit && olw) glow(ctx, wx + 9, wy + 14, 36, win, 0.25);
        if (olw) {
          ctx.fillStyle = rgba(shade('#3a6a5a', (r() - 0.5) * 0.2), 0.9);
          ctx.fillRect(wx - 9, wy, 8, 28);
          ctx.fillRect(wx + 19, wy, 8, 28);
        }
      }
    // roof (pitched, with tile rows)
    ctx.beginPath();
    ctx.moveTo(x - 10, top + 2);
    ctx.lineTo(x + w / 2, top - rh);
    ctx.lineTo(x + w + 10, top + 2);
    ctx.closePath();
    ctx.fillStyle = rc;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = rgba(shade(rc, -0.45), 0.6);
    ctx.lineWidth = 2;
    for (let yy = top - rh + 10; yy < top + 4; yy += 9) {
      ctx.beginPath();
      for (let xx = x - 10; xx < x + w + 10; xx += 12) ctx.arc(xx + 6, yy, 6, 0, Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(160,180,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, top - rh);
    ctx.lineTo(x + w + 10, top + 2);
    ctx.lineTo(x + w / 2, top + 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x - 10, top + 2);
    ctx.lineTo(x + w / 2, top - rh);
    ctx.lineTo(x + w + 10, top + 2);
    if (olw) outline(ctx, olw);
    out.push({ x, w, h, roof: rh });
    x += w + (r() < 0.25 ? 10 + r() * 20 : -4);
  }
  if (fog > 0)
    vgrad(ctx, 0, base - maxH - 60, W, maxH + 60, [
      [0, 'rgba(60,60,120,0)'],
      [1, `rgba(60,60,120,${fog})`],
    ]);
  return out;
}

function cathedral(ctx: Ctx, base: number): void {
  const col = '#1c2048';
  const { tower } = OT;
  ctx.fillStyle = col;
  // nave + dome
  ctx.beginPath();
  ctx.rect(880, base - 170, 360, 170);
  ctx.moveTo(1060 + 130, base - 170);
  ctx.arc(1060, base - 170, 130, 0, Math.PI, true);
  ctx.rect(1046, base - 340, 28, 50);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1060, base - 380);
  ctx.lineTo(1072, base - 340);
  ctx.lineTo(1048, base - 340);
  ctx.fill();
  // ribs on the dome
  ctx.strokeStyle = 'rgba(120,140,220,0.18)';
  ctx.lineWidth = 3;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(1060 + k * 52, base - 172);
    ctx.quadraticCurveTo(1060 + k * 40, base - 280, 1060, base - 298);
    ctx.stroke();
  }
  // bell tower
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.rect(tower.x - 50, tower.y + 60, 100, base - tower.y - 60);
  ctx.rect(tower.x - 60, tower.y + 50, 120, 16);
  ctx.moveTo(tower.x - 44, tower.y + 52);
  ctx.lineTo(tower.x, tower.y - 60);
  ctx.lineTo(tower.x + 44, tower.y + 52);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,200,110,0.55)';
  for (const dx of [-26, 6]) {
    ctx.beginPath();
    ctx.rect(tower.x + dx, tower.y + 86, 20, 46);
    ctx.fill();
  }
  ellipse(ctx, tower.x, tower.y + 186, 26, 26);
  ctx.fillStyle = 'rgba(255,236,190,0.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,30,60,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tower.x, tower.y + 186);
  ctx.lineTo(tower.x, tower.y + 168);
  ctx.moveTo(tower.x, tower.y + 186);
  ctx.lineTo(tower.x + 12, tower.y + 190);
  ctx.stroke();
  glow(ctx, tower.x, tower.y + 110, 110, '#ffc070', 0.2);
  ctx.fillStyle = 'rgba(255,200,110,0.45)';
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.rect(900 + k * 72, base - 140, 16, 40);
    ctx.fill();
  }
}

function washing(ctx: Ctx, r: R): void {
  const { x0, y0, x1, y1, sag } = OT.line;
  ctx.strokeStyle = 'rgba(30,24,40,0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 30; i++) {
    const [x, y] = catenaryPt(x0, y0, x1, y1, sag, i / 30);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  const cols = ['#c8c0d8', '#8aa0c8', '#d8a0a0', '#e8e0c8', '#a8c0a0', '#c8a8d0'];
  let t = 0.08;
  let k = 0;
  while (t < 0.92) {
    const [x, y] = catenaryPt(x0, y0, x1, y1, sag, t);
    const c = shade(cols[k % cols.length], -0.35);
    const kind = k % 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((r() - 0.5) * 0.06);
    ctx.beginPath();
    if (kind === 0) {
      // shirt
      ctx.moveTo(-26, 0);
      ctx.lineTo(26, 0);
      ctx.lineTo(42, 18);
      ctx.lineTo(32, 28);
      ctx.lineTo(24, 22);
      ctx.lineTo(24, 66);
      ctx.lineTo(-24, 66);
      ctx.lineTo(-24, 22);
      ctx.lineTo(-32, 28);
      ctx.lineTo(-42, 18);
      ctx.closePath();
    } else if (kind === 1) {
      ctx.rect(-36, 0, 72, 54);
    } else {
      ctx.moveTo(-24, 0);
      ctx.lineTo(24, 0);
      ctx.lineTo(28, 70);
      ctx.lineTo(6, 70);
      ctx.lineTo(0, 24);
      ctx.lineTo(-6, 70);
      ctx.lineTo(-28, 70);
      ctx.closePath();
    }
    fillOl(ctx, lgrad(ctx, -40, 0, 40, 60, [
      [0, shade(c, 0.15)],
      [1, shade(c, -0.25)],
    ]), 3.5);
    ctx.fillStyle = '#c8a070';
    ctx.fillRect(-20, -6, 5, 12);
    ctx.fillRect(15, -6, 5, 12);
    ctx.restore();
    t += 0.12 + r() * 0.04;
    k++;
  }
}

function drawOldTown(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, 700, [
    [0, '#080c26'],
    [0.45, '#18245a'],
    [0.8, '#3a3a72'],
    [1, '#6a4a6a'],
  ]);
  stars(ctx, r, 0, 60, W, 380, 220, 0.9);
  moon(ctx, OT.moon.x, OT.moon.y, 64, r);
  // wispy night clouds
  for (let i = 0; i < 6; i++) darkSpot(ctx, r() * W, 160 + r() * 220, 220 + r() * 200, 22 + r() * 16, 0.35, '#5a5a9a');
  cathedral(ctx, 560);
  townRow(ctx, r, 560, 60, 120, 90, 150, '#2a2c5a', '#3a2c4a', '#ffc070', 0.25, 0, 0.35);
  townRow(ctx, r, 640, 90, 170, 130, 210, '#4a3a5a', '#7a3a34', '#ffc070', 0.35, 3, 0.25);
  // washing strung between the near houses
  ctx.beginPath();
  ctx.rect(OT.line.x0 - 8, OT.line.y0 - 4, 16, 300);
  ctx.rect(OT.line.x1 - 8, OT.line.y1 - 4, 16, 300);
  fillOl(ctx, '#3a2a3a', 3);
  washing(ctx, r);
  // near row: warm terracotta roofs, bigger
  townRow(ctx, r, 700, 60, 110, 240, 330, '#8a5a50', '#b0502e', '#ffcf7a', 0.5, 4, 0);
  laneCalm(ctx, 0.18, 60, 620, '#060818');
  // terrace parapet with terracotta coping
  const py = 690;
  ctx.beginPath();
  ctx.rect(-10, py, W + 20, TY - py + 6);
  fillOl(ctx, lgrad(ctx, 0, py, 0, TY, [
    [0, '#c87a5a'],
    [1, '#6a3a34'],
  ]), 5);
  mottle(ctx, 0, py, W, TY - py, 0.35, 1);
  ctx.save();
  clipRect(ctx, 0, py - 24, W, 30);
  ctx.fillStyle = '#7a3a24';
  ctx.fillRect(0, py - 24, W, 30);
  for (let x = -20; x < W + 20; x += 40) {
    ctx.beginPath();
    ctx.ellipse(x + 20, py - 6, 21, 20, 0, Math.PI, 0);
    ctx.fillStyle = lgrad(ctx, x, 0, x + 40, 0, [
      [0, '#8a3a20'],
      [0.4, '#e08a5a'],
      [1, '#8a3a20'],
    ]);
    ctx.fill();
    ctx.strokeStyle = rgba(OL, 0.8);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = rgba(OL, 0.9);
  ctx.fillRect(0, py - 2, W, 4);
  // potted geraniums and wall lanterns
  terracottaPot(ctx, 330, py - 54, 90, 54, r, 'flowers');
  terracottaPot(ctx, 1600, py - 54, 90, 54, r, 'flowers');
  for (const l of OT.lanterns) {
    ctx.strokeStyle = OL;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(l.x, TY);
    ctx.lineTo(l.x, l.y + 40);
    ctx.stroke();
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(l.x - 26, l.y - 34);
    ctx.lineTo(l.x + 26, l.y - 34);
    ctx.lineTo(l.x + 18, l.y + 36);
    ctx.lineTo(l.x - 18, l.y + 36);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, l.y - 34, 0, l.y + 36, [
      [0, '#fff2c0'],
      [1, '#ffaa40'],
    ]), 5);
    ctx.beginPath();
    ctx.moveTo(l.x - 34, l.y - 34);
    ctx.lineTo(l.x, l.y - 64);
    ctx.lineTo(l.x + 34, l.y - 34);
    ctx.closePath();
    fillOl(ctx, '#2a2a2a', 4);
    ctx.fillStyle = OL;
    ctx.fillRect(l.x - 2, l.y - 34, 4, 70);
    glow(ctx, l.x, l.y, 220, '#ffb050', 0.45);
    glow(ctx, l.x, l.y, 60, '#fff2c0', 0.5);
  }
  // terracotta tile table top
  const f = OT.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  checkerTop(ctx, 0.2, '#c8603a', '#e8c49a', f, 0.1);
  bandsX(ctx, 0.2, 0.012, 0.094, 'rgba(60,24,10,0.55)', f);
  bandsZ(ctx, 0.2, 0.012, 0, 'rgba(60,24,10,0.55)', f);
  mottle(ctx, 0, TY, W, f - TY, 0.3, 1);
  grainRect(ctx, 0, TY, W, f - TY, 0.3);
  ctx.restore();
  frontFace(ctx, f, () => {
    ctx.fillStyle = lgrad(ctx, 0, f, 0, H, [
      [0, '#a84a2a'],
      [1, '#6a2a18'],
    ]);
    ctx.fillRect(0, f, W, H - f);
  }, 0.3);
  contactShadow(ctx, 0.5);
  for (const l of OT.lanterns) glow(ctx, l.x, 860, 420, '#ffb050', 0.14, 0.35);
  glow(ctx, OT.moon.x, 860, 900, '#9fb8ff', 0.05, 0.3);
  tableLight(ctx, '#ffc890', 0.05, 0.5);
  grade(ctx, 0.06);
  vignette(ctx, 0.75, '#040614');
}

// ---------------------------------------------------------------------------------------------
// The Pier

const PR = {
  sun: { x: 620, y: 500 },
  wheel: { x: 1620, y: 390, r: 225 },
  carousel: { x: 230, y: 330 },
  lamps: [560, 1360],
  front: 1040,
};

function ferrisWheel(ctx: Ctx): GlowSpot[] {
  const { x, y, r: R0 } = PR.wheel;
  const col = '#3a1e3a';
  // legs
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  for (const [lw, c] of [
    [22, OL],
    [14, col],
  ] as [number, string][]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x - 170, 640);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 170, 640);
    ctx.stroke();
  }
  // spokes
  ctx.strokeStyle = rgba(col, 0.95);
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * R0, y + Math.sin(a) * R0);
  }
  ctx.stroke();
  for (const rr of [R0, R0 - 26]) {
    ellipse(ctx, x, y, rr, rr);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = '#5a2a4a';
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  // gondolas
  const cols = ['#e8503a', '#f0b030', '#3aa0c8', '#6ac04a'];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    const gx = x + Math.cos(a) * R0;
    const gy = y + Math.sin(a) * R0;
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx - 26, gy + 18);
    ctx.lineTo(gx + 26, gy + 18);
    ctx.lineTo(gx + 20, gy + 50);
    ctx.lineTo(gx - 20, gy + 50);
    ctx.closePath();
    fillOl(ctx, shade(cols[k % 4], -0.3), 4);
    ctx.fillStyle = 'rgba(255,220,160,0.3)';
    ctx.fillRect(gx - 22, gy + 20, 44, 6);
  }
  // rim bulbs
  const out: GlowSpot[] = [];
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    const bx = x + Math.cos(a) * (R0 - 13);
    const by = y + Math.sin(a) * (R0 - 13);
    const c = k % 2 ? '#ffe08a' : '#ff9a6a';
    glow(ctx, bx, by, 22, c, 0.5);
    ellipse(ctx, bx, by, 4.5, 4.5);
    ctx.fillStyle = '#fff6d8';
    ctx.fill();
    if (k % 8 === 0) out.push({ x: Math.round(bx), y: Math.round(by), r: 50, color: c, flicker: 0.4 });
  }
  ellipse(ctx, x, y, 26, 26);
  fillOl(ctx, cylH(ctx, x - 26, 52, '#8a5a6a'), 5);
  return out;
}

function carousel(ctx: Ctx): void {
  const { x, y } = PR.carousel;
  const w = 380;
  const eave = y + 110;
  // poles + horses (simple silhouettes)
  for (let k = 0; k < 5; k++) {
    const px = x - 150 + k * 75;
    ctx.beginPath();
    ctx.rect(px - 5, eave, 10, 200);
    fillOl(ctx, cylH(ctx, px - 5, 10, '#e8c060'), 3);
    const hy = eave + 90 + (k % 2) * 30;
    ctx.beginPath();
    ctx.ellipse(px, hy, 30, 16, 0, 0, Math.PI * 2);
    ctx.moveTo(px + 22, hy - 6);
    ctx.lineTo(px + 34, hy - 34);
    ctx.lineTo(px + 46, hy - 30);
    ctx.lineTo(px + 34, hy - 4);
    fillOl(ctx, k % 2 ? '#f2ead8' : '#d8b8e0', 3.5);
  }
  // inner drum
  ctx.beginPath();
  ctx.rect(x - 60, eave, 120, 200);
  fillOl(ctx, cylH(ctx, x - 60, 120, '#b03a3a'), 4);
  // platform
  ellipse(ctx, x, eave + 210, w / 2 + 10, 26);
  fillOl(ctx, cylH(ctx, x - w / 2, w, '#8a3a2a'), 5);
  // canopy
  ctx.beginPath();
  ctx.moveTo(x - w / 2, eave);
  ctx.lineTo(x, y - 40);
  ctx.lineTo(x + w / 2, eave);
  ctx.closePath();
  ctx.fillStyle = '#f4e6c8';
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let k = -6; k <= 6; k += 2) {
    ctx.beginPath();
    ctx.moveTo(x, y - 40);
    ctx.lineTo(x + k * 30, eave);
    ctx.lineTo(x + (k + 1) * 30, eave);
    ctx.closePath();
    ctx.fillStyle = '#d0342a';
    ctx.fill();
  }
  ctx.fillStyle = hgrad(ctx, x - w / 2, x + w / 2, [
    [0, 'rgba(0,0,0,0.35)'],
    [0.45, 'rgba(255,255,255,0.1)'],
    [1, 'rgba(0,0,0,0.4)'],
  ]);
  ctx.fillRect(x - w / 2, y - 40, w, eave - y + 40);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, eave);
  ctx.lineTo(x, y - 40);
  ctx.lineTo(x + w / 2, eave);
  ctx.closePath();
  outline(ctx, 5);
  // scalloped valance with bulbs
  ctx.beginPath();
  ctx.moveTo(x - w / 2, eave);
  for (let k = 0; k < 10; k++) {
    const sx = x - w / 2 + (k * w) / 10;
    ctx.quadraticCurveTo(sx + w / 20, eave + 34, sx + w / 10, eave);
  }
  ctx.closePath();
  fillOl(ctx, '#f0b030', 4);
  for (let k = 0; k <= 10; k++) {
    const bx = x - w / 2 + (k * w) / 10;
    glow(ctx, bx, eave, 26, '#ffe08a', 0.55);
    ellipse(ctx, bx, eave, 5, 5);
    ctx.fillStyle = '#fff6d8';
    ctx.fill();
  }
  // finial flag
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y - 40);
  ctx.lineTo(x, y - 90);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 90);
  ctx.lineTo(x + 40, y - 78);
  ctx.lineTo(x, y - 66);
  fillOl(ctx, '#d0342a', 3);
}

function drawPier(ctx: Ctx, r: R): void {
  const { sun } = PR;
  const sea = 520;
  vgrad(ctx, 0, 0, W, sea, [
    [0, '#2a2a6a'],
    [0.35, '#7a3a7a'],
    [0.65, '#e0705a'],
    [1, '#ffcc7a'],
  ]);
  glow(ctx, sun.x, sun.y, 800, '#ff8a4a', 0.3, 0.5);
  glow(ctx, sun.x, sun.y, 240, '#ffd27a', 0.5);
  ctx.save();
  clipRect(ctx, 0, 0, W, sea);
  ellipse(ctx, sun.x, sun.y, 100, 100);
  const sg = ctx.createRadialGradient(sun.x, sun.y - 40, 10, sun.x, sun.y, 100);
  sg.addColorStop(0, '#fff8d8');
  sg.addColorStop(1, '#ffa04a');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.restore();
  // long clouds
  for (let i = 0; i < 7; i++) {
    const cx = r() * W;
    const cy = 120 + r() * 300;
    const cw = 260 + r() * 400;
    roundRect(ctx, cx - cw / 2, cy, cw, 14 + r() * 14, 12);
    ctx.fillStyle = rgba(i % 2 ? '#ffb08a' : '#c8607a', 0.4);
    ctx.fill();
  }
  // gulls
  ctx.strokeStyle = '#2a1830';
  ctx.lineWidth = 4;
  for (const [gx, gy, gs] of [
    [880, 200, 1],
    [960, 236, 0.7],
    [1180, 170, 0.85],
    [430, 140, 0.6],
  ]) {
    ctx.beginPath();
    ctx.moveTo(gx - 22 * gs, gy);
    ctx.quadraticCurveTo(gx - 10 * gs, gy - 14 * gs, gx, gy);
    ctx.quadraticCurveTo(gx + 10 * gs, gy - 14 * gs, gx + 22 * gs, gy);
    ctx.stroke();
  }
  // sea with a glittering sun path
  vgrad(ctx, 0, sea, W, 160, [
    [0, '#c86a6a'],
    [0.3, '#5a3a7a'],
    [1, '#1e2050'],
  ]);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 140; i++) {
    const yy = sea + 4 + r() * r() * 150;
    const spread = 40 + (yy - sea) * 1.6;
    const xx = sun.x + (r() - 0.5) * spread * 2;
    ctx.fillStyle = `rgba(255,210,140,${0.25 + r() * 0.5})`;
    ctx.fillRect(xx, yy, 10 + r() * 30, 2);
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,220,160,0.5)';
  ctx.fillRect(0, sea, W, 2);
  // pier deck behind the railing
  ctx.fillStyle = '#5a3a3a';
  ctx.fillRect(0, 630, W, TY - 630);
  ferrisWheel(ctx);
  carousel(ctx);
  laneCalm(ctx, 0.1, 80, 560, '#200a20');
  // lamp posts
  for (const lx of PR.lamps) {
    ctx.beginPath();
    ctx.rect(lx - 7, 380, 14, TY - 380);
    fillOl(ctx, cylH(ctx, lx - 7, 14, '#2a3a4a'), 4);
    ctx.beginPath();
    ctx.moveTo(lx - 22, 384);
    ctx.lineTo(lx + 22, 384);
    ctx.lineTo(lx + 14, 340);
    ctx.lineTo(lx - 14, 340);
    ctx.closePath();
    fillOl(ctx, '#fff0c0', 4);
    ctx.beginPath();
    ctx.moveTo(lx - 26, 340);
    ctx.lineTo(lx, 316);
    ctx.lineTo(lx + 26, 340);
    ctx.closePath();
    fillOl(ctx, '#2a3a4a', 4);
    glow(ctx, lx, 362, 150, '#ffc060', 0.5);
  }
  // white railing
  railing(ctx, 650, TY, 160, '#e8dcc8', 22, [0, 54], 32);
  vgrad(ctx, 0, 650, W, TY - 650, [
    [0, 'rgba(60,20,40,0.1)'],
    [1, 'rgba(60,20,40,0.5)'],
  ]);
  // life ring on the railing
  ellipse(ctx, 1240, 690, 40, 40);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 26;
  ctx.stroke();
  ctx.strokeStyle = '#f2ead8';
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.strokeStyle = '#e0402a';
  ctx.lineWidth = 18;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.arc(1240, 690, 40, (k * Math.PI) / 2, (k * Math.PI) / 2 + 0.6);
    ctx.stroke();
  }
  // weathered plank table
  planksTop(ctx, r, PR.front, 0.3, '#a87a58', 0.3, 7);
  woodLip(ctx, r, PR.front, '#8a5a3e');
  contactShadow(ctx, 0.5);
  glow(ctx, sun.x, 880, 900, '#ff9a5a', 0.12, 0.3);
  tableLight(ctx, '#ffc890', 0.05, 0.45);
  grade(ctx, 0.06);
  vignette(ctx, 0.7, '#140818');
}

// ---------------------------------------------------------------------------------------------

// (redrawn with the location kit in scene-kitchen.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('kitchen', {
  info: {
    name: "Nonna's Kitchen",
    subtitle: 'Waves 31–34',
    ambient: ['dust'],
    glows: [
      g(KT.oven.x, KT.oven.y - 20, 240, '#ff7a1a', 0.7),
      g(KT.pot.x, 500, 140, '#5a9aff', 0.5),
      g(KT.pot.x, 340, 160, '#ff8a5a', 0.15),
    ],
    light: '#ffd8a0',
    tableTint: '#fff2e0',
  },
  draw: drawKitchen,
});

registerScene('oldtown', {
  info: {
    name: 'Old Town Rooftops',
    subtitle: 'Waves 36–39',
    ambient: ['fireflies'],
    glows: [
      g(OT.moon.x, OT.moon.y, 220, '#cfe0ff', 0.05),
      ...OT.lanterns.map((l) => g(l.x, l.y, 200, '#ffb050', 0.45)),
      g(OT.tower.x, OT.tower.y + 110, 110, '#ffc070', 0.3),
    ],
    light: '#c8c0f0',
    tableTint: '#f0e6f0',
  },
  draw: drawOldTown,
});

registerScene('pier', {
  info: {
    name: 'The Pier',
    subtitle: 'Waves 41–44',
    ambient: ['sparkle'],
    glows: [
      g(PR.sun.x, PR.sun.y, 300, '#ffc070', 0.05),
      ...PR.lamps.map((x) => g(x, 362, 150, '#ffc060', 0.4)),
      g(PR.carousel.x, PR.carousel.y + 110, 220, '#ffe08a', 0.3),
      g(PR.wheel.x, PR.wheel.y, 280, '#ffb070', 0.2),
    ],
    light: '#ffc08a',
    tableTint: '#fff0dc',
  },
  draw: drawPier,
});

