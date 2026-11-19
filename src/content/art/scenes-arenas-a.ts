// Feetza 2.0 boss arenas, part 1: Moon Crater, Nonna's Pantry, Bell Tower.

import type { GlowSpot } from '../../art/backdrops';
import { registerScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  HY,
  OL,
  TY,
  VX,
  W,
  blob,
  clipRect,
  cone,
  contactShadow,
  cylH,
  cylV,
  darkSpot,
  ellipse,
  fillOl,
  fogBand,
  glow,
  grade,
  grainRect,
  hgrad,
  laneCalm,
  lgrad,
  mottle,
  outline,
  pendant,
  planksTop,
  range,
  rgba,
  roundRect,
  shade,
  stars,
  stoneBlocks,
  stoneFront,
  stoneTop,
  tableLight,
  vgrad,
  vignette,
  woodLip,
} from '../../art/sceneKit';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

// ---------------------------------------------------------------------------------------------
// Moon Crater (Cosmic Croc)

const MC = {
  earth: { x: 1440, y: 250, r: 110 },
  lander: { x: 330, y: 650 },
  ground: 500,
  front: 1040,
};

function earth(ctx: Ctx, r: R, x: number, y: number, rad: number): void {
  glow(ctx, x, y, rad * 2.4, '#4ab0ff', 0.35);
  ellipse(ctx, x, y, rad, rad);
  const eg = ctx.createRadialGradient(x - rad * 0.4, y - rad * 0.4, rad * 0.1, x, y, rad);
  eg.addColorStop(0, '#6ac0ff');
  eg.addColorStop(0.5, '#1e64b8');
  eg.addColorStop(1, '#0a2458');
  fillOl(ctx, eg, 4);
  ctx.save();
  ellipse(ctx, x, y, rad, rad);
  ctx.clip();
  for (let k = 0; k < 12; k++) {
    blob(ctx, x + (r() - 0.6) * rad * 1.4, y + (r() - 0.5) * rad * 1.4, rad * (0.12 + r() * 0.2), 0.7, r, 9);
    ctx.fillStyle = k % 3 ? '#3f7a3a' : '#8a8048';
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 10; k++) {
    darkSpot(ctx, x + (r() - 0.5) * rad * 1.6, y + (r() - 0.5) * rad * 1.6, rad * (0.2 + r() * 0.3), rad * 0.06, 0.4, '#ffffff');
  }
  ctx.globalCompositeOperation = 'source-over';
  // night side
  ctx.fillStyle = lgrad(ctx, x - rad * 0.2, y - rad * 0.2, x + rad, y + rad, [
    [0, 'rgba(2,4,20,0)'],
    [0.45, 'rgba(2,4,20,0.75)'],
    [1, 'rgba(2,4,20,0.95)'],
  ]);
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  ctx.restore();
  ellipse(ctx, x, y, rad, rad);
  ctx.strokeStyle = 'rgba(140,210,255,0.55)';
  ctx.lineWidth = 4;
  ctx.stroke();
}

function crater(ctx: Ctx, x: number, y: number, rx: number, ry: number, base: string): void {
  ellipse(ctx, x, y - ry * 0.25, rx * 1.12, ry * 1.25);
  ctx.fillStyle = shade(base, 0.12);
  ctx.fill();
  ellipse(ctx, x, y, rx, ry);
  ctx.fillStyle = lgrad(ctx, 0, y - ry, 0, y + ry, [
    [0, shade(base, -0.55)],
    [1, shade(base, -0.1)],
  ]);
  ctx.fill();
  ctx.strokeStyle = rgba(OL, 0.5);
  ctx.lineWidth = Math.max(1.5, rx * 0.04);
  ctx.stroke();
}

function lander(ctx: Ctx, r: R, x: number, base: number): void {
  // legs
  for (const sd of [-1, 1]) {
    ctx.strokeStyle = OL;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x + sd * 70, base - 140);
    ctx.lineTo(x + sd * 150, base - 10);
    ctx.moveTo(x + sd * 60, base - 100);
    ctx.lineTo(x + sd * 130, base - 40);
    ctx.stroke();
    ctx.strokeStyle = '#c8ccd4';
    ctx.lineWidth = 6;
    ctx.stroke();
    ellipse(ctx, x + sd * 152, base - 6, 30, 9);
    fillOl(ctx, '#b8bcc4', 4);
  }
  // descent stage: gold foil
  ctx.beginPath();
  ctx.moveTo(x - 110, base - 190);
  ctx.lineTo(x + 110, base - 190);
  ctx.lineTo(x + 96, base - 90);
  ctx.lineTo(x - 96, base - 90);
  ctx.closePath();
  fillOl(ctx, hgrad(ctx, x - 110, x + 110, [
    [0, '#8a5a10'],
    [0.3, '#ffd860'],
    [0.5, '#d89a2a'],
    [0.7, '#ffe48a'],
    [1, '#7a4a0a'],
  ]), 5);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(90,50,0,0.4)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const sx = x - 110 + r() * 220;
    const sy = base - 190 + r() * 100;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (r() - 0.5) * 40, sy + (r() - 0.5) * 30);
    ctx.stroke();
  }
  ctx.restore();
  // ascent stage
  ctx.beginPath();
  ctx.moveTo(x - 80, base - 190);
  ctx.lineTo(x - 90, base - 260);
  ctx.lineTo(x - 40, base - 310);
  ctx.lineTo(x + 50, base - 310);
  ctx.lineTo(x + 90, base - 260);
  ctx.lineTo(x + 80, base - 190);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, x - 90, base - 310, x + 90, base - 190, [
    [0, '#e8eaf0'],
    [1, '#8a909c'],
  ]), 5);
  ctx.beginPath();
  ctx.moveTo(x - 50, base - 280);
  ctx.lineTo(x - 20, base - 296);
  ctx.lineTo(x - 10, base - 250);
  ctx.lineTo(x - 50, base - 246);
  ctx.closePath();
  fillOl(ctx, '#1a2440', 4);
  ctx.fillStyle = 'rgba(160,200,255,0.4)';
  ctx.fillRect(x - 44, base - 284, 10, 6);
  // antenna dish
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 40, base - 310);
  ctx.lineTo(x + 70, base - 360);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + 76, base - 366, 30, 12, -0.5, 0, Math.PI);
  fillOl(ctx, '#d8dce4', 3.5);
  // nozzle
  ctx.beginPath();
  ctx.moveTo(x - 26, base - 90);
  ctx.lineTo(x + 26, base - 90);
  ctx.lineTo(x + 40, base - 52);
  ctx.lineTo(x - 40, base - 52);
  ctx.closePath();
  fillOl(ctx, '#4a4e58', 4);
  // beacon lights
  for (const [bx, by, c] of [
    [x - 86, base - 262, '#ff4a4a'],
    [x + 86, base - 262, '#4aff8a'],
  ] as [number, number, string][]) {
    ellipse(ctx, bx, by, 6, 6);
    fillOl(ctx, c, 2.5);
    glow(ctx, bx, by, 40, c, 0.7);
  }
}

function drawMoonCrater(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, MC.ground, [
    [0, '#010208'],
    [1, '#0c1028'],
  ]);
  stars(ctx, r, 0, 0, W, MC.ground, 420);
  // faint milky way band
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    darkSpot(ctx, t * W, 380 - t * 300 + (r() - 0.5) * 60, 160 + r() * 120, 40 + r() * 30, 0.06, i % 2 ? '#8a7aff' : '#5ab0ff');
  }
  ctx.restore();
  stars(ctx, r, 0, 0, W, MC.ground, 160, 0.5);
  earth(ctx, r, MC.earth.x, MC.earth.y, MC.earth.r);
  // far crater rim mountains, lit from the left
  range(ctx, 560, [
    [-40, 520], [160, 430], [300, 470], [520, 400], [700, 470], [900, 440], [1100, 480], [1300, 420], [1520, 470], [1720, 410], [1980, 480],
  ], lgrad(ctx, 0, 400, 0, 560, [
    [0, '#6a6c78'],
    [1, '#3a3c48'],
  ]));
  ctx.strokeStyle = 'rgba(230,236,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const [ax, ay, bx, by] of [
    [160, 430, 60, 475],
    [520, 400, 400, 450],
    [1300, 420, 1200, 450],
    [1720, 410, 1620, 440],
  ]) {
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
  // ground
  vgrad(ctx, 0, MC.ground, W, TY - MC.ground, [
    [0, '#3a3c48'],
    [0.5, '#62646e'],
    [1, '#7e808a'],
  ]);
  ctx.save();
  clipRect(ctx, 0, MC.ground, W, TY - MC.ground);
  mottle(ctx, 0, MC.ground, W, TY - MC.ground, 0.22, 1.2);
  // craters in perspective (smaller near the horizon)
  for (let i = 0; i < 26; i++) {
    const y = MC.ground + 30 + r() * r() * (TY - MC.ground - 40);
    const k = (y - HY) / (TY - HY);
    const x = r() * W;
    const rx = (20 + r() * 70) * k;
    crater(ctx, x, y, rx, rx * 0.28, '#6a6c76');
  }
  grainRect(ctx, 0, MC.ground, W, TY - MC.ground, 0.25);
  // rover tracks
  ctx.strokeStyle = 'rgba(40,42,50,0.35)';
  ctx.lineWidth = 4;
  for (const dx of [-24, 24]) {
    ctx.beginPath();
    ctx.moveTo(VX + 240 + dx * 0.3, MC.ground + 10);
    ctx.quadraticCurveTo(VX + 500, 640, VX + 900 + dx, TY);
    ctx.stroke();
  }
  ctx.restore();
  // big crater rim on the right
  ctx.beginPath();
  ctx.moveTo(1380, TY + 4);
  ctx.quadraticCurveTo(1500, 600, 1700, 590);
  ctx.quadraticCurveTo(1860, 588, W + 20, 620);
  ctx.lineTo(W + 20, TY + 4);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 1380, 590, 1920, TY, [
    [0, '#b8bac2'],
    [1, '#5a5c66'],
  ]), 5);
  ctx.beginPath();
  ctx.ellipse(1720, 640, 160, 30, 0, 0, Math.PI * 2);
  ctx.fillStyle = lgrad(ctx, 0, 610, 0, 670, [
    [0, '#2a2c34'],
    [1, '#6a6c76'],
  ]);
  ctx.fill();
  outline(ctx, 4);
  lander(ctx, r, MC.lander.x, MC.lander.y);
  // low-gravity dust puffs
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 12; i++) darkSpot(ctx, r() * W, 640 + r() * 110, 120 + r() * 160, 18 + r() * 16, 0.18, '#c8ccd8');
  ctx.restore();
  laneCalm(ctx, 0.1, 60, 520, '#000008');
  // moon rock slab
  stoneTop(ctx, r, MC.front, '#a8a4b4', 0.6);
  stoneFront(ctx, r, MC.front, '#6a6878');
  contactShadow(ctx, 0.55);
  glow(ctx, MC.earth.x, 860, 900, '#6ab0ff', 0.06, 0.3);
  tableLight(ctx, '#d8e0ff', 0.04, 0.5);
  grade(ctx, 0.15);
  vignette(ctx, 0.75, '#010208');
}

// ---------------------------------------------------------------------------------------------
// Nonna's Pantry

const NP = {
  bulb: { x: 960, y: 250 },
  pot: { x: 1600, y: 660 },
  counter: 640,
  shelves: [
    { x0: 30, x1: 560 },
    { x0: 1360, x1: 1890 },
  ],
  shelfY: [190, 330, 470],
  front: 1040,
};

function jar(ctx: Ctx, r: R, x: number, base: number, w: number, h: number, fill: string): void {
  roundRect(ctx, x - w / 2, base - h, w, h, w * 0.22);
  fillOl(ctx, lgrad(ctx, x - w / 2, 0, x + w / 2, 0, [
    [0, shade(fill, -0.35)],
    [0.35, shade(fill, 0.1)],
    [1, shade(fill, -0.45)],
  ]), 3.5);
  // contents texture
  ctx.save();
  roundRect(ctx, x - w / 2, base - h, w, h, w * 0.22);
  ctx.clip();
  for (let k = 0; k < 6; k++) {
    ellipse(ctx, x + (r() - 0.5) * w * 0.7, base - h * (0.15 + r() * 0.65), w * 0.16, w * 0.14);
    ctx.fillStyle = rgba(shade(fill, -0.3), 0.6);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x - w * 0.32, base - h * 0.85, w * 0.1, h * 0.6);
  roundRect(ctx, x - w / 2 - 2, base - h - 10, w + 4, 12, 3);
  fillOl(ctx, '#c8a050', 3);
  roundRect(ctx, x - w * 0.36, base - h * 0.55, w * 0.72, h * 0.28, 3);
  ctx.fillStyle = '#f2e6c8';
  ctx.fill();
}

function tin(ctx: Ctx, x: number, base: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.rect(x - w / 2, base - h, w, h);
  fillOl(ctx, cylH(ctx, x - w / 2, w, '#c8302a'), 3.5);
  ctx.fillStyle = '#f2e6c8';
  ctx.fillRect(x - w / 2 + 1, base - h * 0.62, w - 2, h * 0.24);
  ellipse(ctx, x, base - h * 0.5, w * 0.16, w * 0.14);
  ctx.fillStyle = '#e0402a';
  ctx.fill();
  ctx.fillStyle = '#3a7a2a';
  ctx.fillRect(x - 3, base - h * 0.5 - w * 0.18, 6, 4);
  ctx.fillStyle = cylH(ctx, x - w / 2, w, '#b8bcc4');
  ctx.fillRect(x - w / 2, base - h, w, 5);
  ctx.fillRect(x - w / 2, base - 5, w, 5);
}

function salami(ctx: Ctx, x: number, y0: number, len: number, w: number): void {
  ctx.strokeStyle = '#d8c8a0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y0 + 26);
  ctx.stroke();
  roundRect(ctx, x - w / 2, y0 + 22, w, len, w / 2);
  fillOl(ctx, cylH(ctx, x - w / 2, w, '#8a2a20'), 4);
  ctx.save();
  roundRect(ctx, x - w / 2, y0 + 22, w, len, w / 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(240,230,210,0.25)';
  ctx.fillRect(x - w / 2, y0 + 22, w * 0.35, len);
  ctx.strokeStyle = 'rgba(240,230,210,0.55)';
  ctx.lineWidth = 2;
  for (let y = y0 + 40; y < y0 + len + 16; y += 22) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x, y + 6, x + w / 2, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPantry(ctx: Ctx, r: R): void {
  // vertical board wall
  const bw = 80;
  for (let x = 0; x < W; x += bw) {
    const c = shade('#5a3822', (r() - 0.5) * 0.18);
    ctx.fillStyle = hgrad(ctx, x, x + bw, [
      [0, shade(c, -0.25)],
      [0.2, shade(c, 0.06)],
      [1, shade(c, -0.15)],
    ]);
    ctx.fillRect(x, 0, bw, TY);
    ctx.fillStyle = 'rgba(15,6,2,0.7)';
    ctx.fillRect(x, 0, 3, TY);
  }
  grainRect(ctx, 0, 0, W, TY, 0.35);
  mottle(ctx, 0, 0, W, TY, 0.3, 1);
  vgrad(ctx, 0, 0, W, TY, [
    [0, 'rgba(10,4,0,0.65)'],
    [0.5, 'rgba(10,4,0,0.2)'],
    [1, 'rgba(10,4,0,0.45)'],
  ]);
  // giant wooden spoon on the wall
  ctx.save();
  ctx.translate(960, 400);
  ctx.rotate(-0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.translate(12, 14);
  roundRect(ctx, -260, -16, 330, 32, 16);
  ctx.fill();
  ellipse(ctx, 140, 0, 100, 66);
  ctx.fill();
  ctx.translate(-12, -14);
  roundRect(ctx, -260, -16, 330, 32, 16);
  fillOl(ctx, cylV(ctx, -16, 32, '#b8844a'), 5);
  ellipse(ctx, 140, 0, 100, 66);
  fillOl(ctx, lgrad(ctx, 40, -66, 240, 66, [
    [0, '#d8a466'],
    [1, '#8a5a2a'],
  ]), 5);
  ellipse(ctx, 150, 4, 70, 44);
  ctx.fillStyle = 'rgba(90,50,20,0.35)';
  ctx.fill();
  ellipse(ctx, -236, 0, 7, 7);
  ctx.fillStyle = OL;
  ctx.fill();
  ctx.restore();
  // rolling pins on pegs below it
  for (const [py, len, col] of [
    [560, 300, '#c89a62'],
    [610, 250, '#a8784a'],
  ] as [number, number, string][]) {
    for (const px of [960 - len / 2 + 40, 960 + len / 2 - 40]) {
      ctx.beginPath();
      ctx.rect(px - 6, py + 10, 12, 18);
      fillOl(ctx, '#3a2414', 3);
    }
    roundRect(ctx, 960 - len / 2, py - 12, len, 24, 12);
    fillOl(ctx, cylV(ctx, py - 12, 24, col), 4);
    for (const sd of [-1, 1]) {
      roundRect(ctx, 960 + sd * (len / 2 + 22) - 22, py - 7, 44, 14, 7);
      fillOl(ctx, cylV(ctx, py - 7, 14, shade(col, -0.15)), 3.5);
    }
  }
  // ceiling rack with salami
  ctx.beginPath();
  ctx.rect(560, 40, 800, 16);
  fillOl(ctx, cylV(ctx, 40, 16, '#4a2c18'), 4);
  for (const sx of [560, 1360]) {
    ctx.strokeStyle = OL;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx + (sx < 900 ? 20 : -20), -5);
    ctx.lineTo(sx + (sx < 900 ? 20 : -20), 40);
    ctx.stroke();
  }
  const sal: [number, number, number][] = [
    [620, 120, 40],
    [700, 90, 34],
    [1220, 110, 38],
    [1300, 140, 44],
  ];
  for (const [sx, len, w] of sal) salami(ctx, sx, 56, len, w);
  // shelves with jars and tins
  for (const sh of NP.shelves) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(sh.x0 + 12, 120, sh.x1 - sh.x0, NP.counter - 120);
    ctx.beginPath();
    ctx.rect(sh.x0, 120, sh.x1 - sh.x0, NP.counter - 120);
    fillOl(ctx, '#2a180e', 5);
    for (const sy of NP.shelfY) {
      let x = sh.x0 + 34;
      while (x < sh.x1 - 40) {
        const kind = r();
        if (kind < 0.35) {
          tin(ctx, x + 18, sy, 40, 54);
          if (r() < 0.6) tin(ctx, x + 18, sy - 54, 40, 54);
          x += 48;
        } else {
          const w = 44 + r() * 20;
          const h = 60 + r() * 40;
          const fills = ['#c8402a', '#d8a02a', '#5a8a3a', '#e8d8a0', '#a83a5a', '#d87a2a'];
          jar(ctx, r, x + w / 2, sy, w, h, fills[Math.floor(r() * fills.length)]);
          x += w + 10;
        }
      }
      ctx.beginPath();
      ctx.rect(sh.x0 - 10, sy, sh.x1 - sh.x0 + 20, 18);
      fillOl(ctx, cylV(ctx, sy, 18, '#7a4a28'), 4);
      vgrad(ctx, sh.x0, sy + 18, sh.x1 - sh.x0, 30, [
        [0, 'rgba(0,0,0,0.5)'],
        [1, 'rgba(0,0,0,0)'],
      ]);
    }
    // shelf side posts
    for (const px of [sh.x0 - 6, sh.x1 - 10]) {
      ctx.beginPath();
      ctx.rect(px, 110, 16, NP.counter - 110);
      fillOl(ctx, cylH(ctx, px, 16, '#6a4024'), 4);
    }
  }
  // counter / sideboard
  const cy = NP.counter;
  ctx.beginPath();
  ctx.rect(-10, cy, W + 20, TY - cy + 6);
  fillOl(ctx, lgrad(ctx, 0, cy, 0, TY, [
    [0, '#6a4024'],
    [1, '#3a2010'],
  ]), 5);
  for (let x = 40; x < W; x += 240) {
    roundRect(ctx, x, cy + 30, 200, TY - cy - 40, 6);
    ctx.strokeStyle = 'rgba(10,4,0,0.55)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,160,0.1)';
    ctx.lineWidth = 2;
    roundRect(ctx, x + 6, cy + 36, 188, TY - cy - 52, 4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(-10, cy - 14, W + 20, 20);
  fillOl(ctx, cylV(ctx, cy - 14, 20, '#8a5a32'), 5);
  // garlic and onions in a basket on the counter
  ctx.beginPath();
  ctx.moveTo(240, cy - 14);
  ctx.lineTo(420, cy - 14);
  ctx.lineTo(400, cy - 70);
  ctx.lineTo(260, cy - 70);
  ctx.closePath();
  for (const [ox, oy, c] of [
    [290, cy - 84, '#c88a4a'],
    [340, cy - 92, '#f2eadc'],
    [380, cy - 80, '#a85a6a'],
  ] as [number, number, string][]) {
    ellipse(ctx, ox, oy, 26, 24);
    fillOl(ctx, cylH(ctx, ox - 26, 52, c), 3.5);
  }
  ctx.beginPath();
  ctx.moveTo(240, cy - 14);
  ctx.lineTo(420, cy - 14);
  ctx.lineTo(430, cy - 72);
  ctx.lineTo(230, cy - 72);
  ctx.closePath();
  fillOl(ctx, '#a8784a', 4);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(60,30,10,0.5)';
  ctx.lineWidth = 3;
  for (let y = cy - 64; y < cy - 14; y += 12) {
    ctx.beginPath();
    ctx.moveTo(220, y);
    ctx.lineTo(440, y);
    ctx.stroke();
  }
  ctx.restore();
  // sauce pot on a little burner, steaming
  const { pot } = NP;
  ctx.beginPath();
  ctx.rect(pot.x - 110, cy - 40, 220, 30);
  fillOl(ctx, '#1e1a18', 4);
  glow(ctx, pot.x, cy - 40, 90, '#ff6a1a', 0.5, 0.4);
  for (const sd of [-1, 1]) {
    roundRect(ctx, pot.x + sd * 108 - 16, cy - 140, 32, 16, 8);
    fillOl(ctx, '#3a3634', 4);
  }
  ctx.beginPath();
  ctx.rect(pot.x - 96, cy - 160, 192, 120);
  fillOl(ctx, cylH(ctx, pot.x - 96, 192, '#3a3a40'), 5);
  ellipse(ctx, pot.x, cy - 160, 104, 18);
  fillOl(ctx, '#4a4a52', 5);
  ellipse(ctx, pot.x, cy - 158, 90, 12);
  const sg = ctx.createRadialGradient(pot.x - 20, cy - 162, 4, pot.x, cy - 158, 90);
  sg.addColorStop(0, '#ff7a4a');
  sg.addColorStop(1, '#8a1408');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    darkSpot(ctx, pot.x + Math.sin(t * 6) * 40 * t, cy - 180 - t * 260, 30 + t * 50, 20 + t * 34, 0.4 * (1 - t), '#fff0e0');
  }
  ctx.restore();
  // wooden spoon resting in the pot
  ctx.save();
  ctx.translate(pot.x + 30, cy - 170);
  ctx.rotate(0.5);
  roundRect(ctx, -8, -140, 16, 150, 8);
  fillOl(ctx, cylH(ctx, -8, 16, '#c89a62'), 3.5);
  ctx.restore();
  laneCalm(ctx, 0.12, 60, 560, '#0a0400');
  // bare bulb
  pendant(ctx, NP.bulb.x, NP.bulb.y, '#4a3a2a', 1);
  cone(ctx, NP.bulb.x, NP.bulb.y, 160, NP.bulb.x, TY + 40, 700, '#ffc070', 0.07);
  glow(ctx, NP.bulb.x, NP.bulb.y + 4, 220, '#ffc070', 0.6, 0.6);
  glow(ctx, NP.bulb.x, NP.bulb.y + 2, 60, '#ffffff', 0.45, 0.5);
  // butcher block table
  planksTop(ctx, r, NP.front, 0.14, '#b8885a', 0.3, 5);
  woodLip(ctx, r, NP.front, '#8a5a32');
  contactShadow(ctx, 0.55);
  glow(ctx, NP.bulb.x, 860, 420, '#ffc070', 0.16, 0.25);
  tableLight(ctx, '#ffc880', 0.06, 0.55);
  grade(ctx, 0.12);
  vignette(ctx, 0.85, '#0a0400');
}

// ---------------------------------------------------------------------------------------------
// Bell Tower (The Gargoyle)

const BL = {
  bell: { x: 960, y: 110 },
  bolt: { x: 1470, y: 150 },
  lantern: { x: 320, y: 360 },
  arches: [
    { x0: 300, x1: 880 },
    { x0: 1040, x1: 1620 },
  ],
  archTop: 150,
  ledge: 620,
  front: 1040,
};

function gargoyle(ctx: Ctx, x: number, base: number, dir: number): void {
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(dir, 1);
  const stone = '#7a7a84';
  // wing
  ctx.beginPath();
  ctx.moveTo(-20, -140);
  ctx.quadraticCurveTo(-120, -240, -150, -170);
  ctx.lineTo(-120, -160);
  ctx.lineTo(-130, -120);
  ctx.lineTo(-96, -116);
  ctx.lineTo(-96, -80);
  ctx.quadraticCurveTo(-60, -90, -30, -80);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, -150, -240, 0, -80, [
    [0, '#5a5a64'],
    [1, '#3a3a44'],
  ]), 5);
  // haunch + body
  ctx.beginPath();
  ctx.moveTo(-70, 0);
  ctx.quadraticCurveTo(-90, -70, -50, -120);
  ctx.quadraticCurveTo(-10, -170, 40, -150);
  ctx.quadraticCurveTo(70, -120, 60, -60);
  ctx.lineTo(70, 0);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, -90, -170, 70, 0, [
    [0, shade(stone, 0.2)],
    [1, shade(stone, -0.4)],
  ]), 5);
  // front legs / claws on the ledge
  roundRect(ctx, 30, -70, 30, 72, 12);
  fillOl(ctx, shade(stone, -0.1), 4);
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(34 + k * 10, 0);
    ctx.lineTo(40 + k * 10, 12);
    ctx.lineTo(46 + k * 10, 0);
    fillOl(ctx, '#4a4a54', 2.5);
  }
  // head
  ctx.beginPath();
  ctx.moveTo(20, -150);
  ctx.quadraticCurveTo(30, -200, 80, -196);
  ctx.quadraticCurveTo(120, -190, 126, -160);
  ctx.lineTo(108, -150);
  ctx.lineTo(120, -134);
  ctx.quadraticCurveTo(80, -120, 50, -130);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 20, -200, 126, -120, [
    [0, shade(stone, 0.25)],
    [1, shade(stone, -0.3)],
  ]), 5);
  // horns
  ctx.beginPath();
  ctx.moveTo(48, -190);
  ctx.quadraticCurveTo(30, -236, 6, -240);
  ctx.quadraticCurveTo(36, -220, 64, -196);
  ctx.closePath();
  fillOl(ctx, '#5a5a64', 3.5);
  // eye glow + teeth
  ellipse(ctx, 84, -172, 7, 5);
  ctx.fillStyle = '#ff6a3a';
  ctx.fill();
  glow(ctx, 84, -172, 30, '#ff6a3a', 0.6);
  ctx.fillStyle = '#e8e8f0';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(94 + k * 8, -150);
    ctx.lineTo(98 + k * 8, -142);
    ctx.lineTo(102 + k * 8, -150);
    ctx.fill();
  }
  // moss + cracks
  ctx.strokeStyle = 'rgba(20,20,26,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-40, -100);
  ctx.lineTo(-20, -70);
  ctx.lineTo(-30, -40);
  ctx.stroke();
  darkSpot(ctx, -30, -10, 40, 14, 0.5, '#3a5a2a');
  ctx.restore();
}

function pigeon(ctx: Ctx, x: number, y: number, dir: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ellipse(ctx, 0, -14, 22, 14);
  fillOl(ctx, '#7a7e8a', 3);
  ellipse(ctx, 18, -28, 9, 9);
  fillOl(ctx, '#6a6e7a', 3);
  ctx.fillStyle = 'rgba(120,200,160,0.5)';
  ctx.fillRect(10, -22, 12, 5);
  ctx.beginPath();
  ctx.moveTo(26, -29);
  ctx.lineTo(34, -26);
  ctx.lineTo(26, -24);
  ctx.fillStyle = '#e8b04a';
  ctx.fill();
  ellipse(ctx, 20, -31, 2, 2);
  ctx.fillStyle = '#ff7a2a';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-18, -14);
  ctx.lineTo(-34, -4);
  ctx.lineTo(-14, -6);
  fillOl(ctx, '#5a5e6a', 2.5);
  ctx.restore();
}

function drawBellTower(ctx: Ctx, r: R): void {
  // stormy sky (seen through the arches)
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#06081a'],
    [0.6, '#1e2246'],
    [1, '#3a3a5a'],
  ]);
  mottle(ctx, 0, 0, W, 600, 0.5, 1.6, 'multiply');
  for (let i = 0; i < 30; i++) {
    const x = r() * W;
    const y = 80 + r() * 380;
    darkSpot(ctx, x, y, 160 + r() * 220, 40 + r() * 50, 0.5, i % 3 ? '#0a0c1e' : '#4a4a78');
  }
  // lightning
  const { bolt } = BL;
  glow(ctx, bolt.x, bolt.y + 140, 420, '#9ab0ff', 0.4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pts: [number, number][] = [[bolt.x, bolt.y - 40]];
  let bx = bolt.x;
  for (let y = bolt.y; y < 520; y += 34 + r() * 20) {
    bx += (r() - 0.5) * 70;
    pts.push([bx, y]);
  }
  for (const [lw, c] of [
    [18, 'rgba(140,170,255,0.25)'],
    [8, 'rgba(190,210,255,0.6)'],
    [3, 'rgba(255,255,255,1)'],
  ] as [number, string][]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
  }
  ctx.restore();
  // town far below
  vgrad(ctx, 0, 520, W, 120, [
    [0, 'rgba(10,10,30,0.2)'],
    [1, 'rgba(10,10,30,0.9)'],
  ]);
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(255,200,110,${0.3 + r() * 0.6})`;
    ctx.fillRect(r() * W, 560 + r() * 60, 3, 2);
  }
  // tower masonry with arched openings
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, TY);
  for (const a of BL.arches) {
    const w = a.x1 - a.x0;
    ctx.moveTo(a.x0, BL.ledge);
    ctx.lineTo(a.x0, BL.archTop + w / 2);
    ctx.arc((a.x0 + a.x1) / 2, BL.archTop + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(a.x1, BL.ledge);
    ctx.closePath();
  }
  ctx.clip('evenodd');
  stoneBlocks(ctx, r, 0, 0, W, TY, ['#5a5a66', '#4e4e5a', '#666672'], '#26262e', 66, 8);
  vgrad(ctx, 0, 0, W, TY, [
    [0, 'rgba(4,4,14,0.75)'],
    [1, 'rgba(4,4,14,0.25)'],
  ]);
  ctx.restore();
  for (const a of BL.arches) {
    const w = a.x1 - a.x0;
    ctx.beginPath();
    ctx.moveTo(a.x0, BL.ledge);
    ctx.lineTo(a.x0, BL.archTop + w / 2);
    ctx.arc((a.x0 + a.x1) / 2, BL.archTop + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(a.x1, BL.ledge);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 30;
    ctx.stroke();
    ctx.strokeStyle = '#7a7a86';
    ctx.lineWidth = 20;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,180,255,0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  // timber headstock and the great bell
  const { bell } = BL;
  ctx.beginPath();
  ctx.rect(560, bell.y - 50, 800, 44);
  fillOl(ctx, cylV(ctx, bell.y - 50, 44, '#5a3a22'), 5);
  ctx.beginPath();
  ctx.rect(bell.x - 40, bell.y - 10, 80, 40);
  fillOl(ctx, '#3a2414', 4);
  ctx.beginPath();
  ctx.moveTo(bell.x - 70, bell.y + 30);
  ctx.quadraticCurveTo(bell.x - 90, bell.y + 150, bell.x - 120, bell.y + 250);
  ctx.quadraticCurveTo(bell.x - 170, bell.y + 270, bell.x - 172, bell.y + 300);
  ctx.lineTo(bell.x + 172, bell.y + 300);
  ctx.quadraticCurveTo(bell.x + 170, bell.y + 270, bell.x + 120, bell.y + 250);
  ctx.quadraticCurveTo(bell.x + 90, bell.y + 150, bell.x + 70, bell.y + 30);
  ctx.closePath();
  fillOl(ctx, hgrad(ctx, bell.x - 172, bell.x + 172, [
    [0, '#3a2410'],
    [0.25, '#c8904a'],
    [0.4, '#8a5a2a'],
    [0.75, '#5a3a1a'],
    [1, '#2a180a'],
  ]), 6);
  ctx.strokeStyle = 'rgba(40,20,6,0.6)';
  ctx.lineWidth = 4;
  for (const yy of [bell.y + 70, bell.y + 230]) {
    ctx.beginPath();
    ctx.moveTo(bell.x - 100, yy);
    ctx.quadraticCurveTo(bell.x, yy + 10, bell.x + 100, yy);
    ctx.stroke();
  }
  darkSpot(ctx, bell.x + 40, bell.y + 180, 50, 60, 0.35, '#3a7a6a');
  ellipse(ctx, bell.x, bell.y + 300, 172, 22);
  fillOl(ctx, '#1a0e06', 5);
  ellipse(ctx, bell.x, bell.y + 318, 26, 24);
  fillOl(ctx, cylH(ctx, bell.x - 26, 52, '#6a4a2a'), 4);
  // bell rope
  ctx.strokeStyle = OL;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(bell.x + 150, bell.y - 10);
  ctx.quadraticCurveTo(bell.x + 220, bell.y + 260, bell.x + 200, BL.ledge);
  ctx.stroke();
  ctx.strokeStyle = '#c8a870';
  ctx.lineWidth = 5;
  ctx.stroke();
  // lightning rim on the bell
  glow(ctx, bell.x + 130, bell.y + 180, 140, '#9ab0ff', 0.15);
  // wall lantern
  const { lantern: L } = BL;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(L.x - 60, L.y - 70);
  ctx.lineTo(L.x, L.y - 70);
  ctx.lineTo(L.x, L.y - 40);
  ctx.stroke();
  roundRect(ctx, L.x - 22, L.y - 40, 44, 70, 6);
  fillOl(ctx, lgrad(ctx, 0, L.y - 40, 0, L.y + 30, [
    [0, '#fff0b0'],
    [1, '#ff9a30'],
  ]), 5);
  ctx.fillStyle = OL;
  ctx.fillRect(L.x - 2, L.y - 40, 4, 70);
  glow(ctx, L.x, L.y, 240, '#ffa040', 0.45);
  laneCalm(ctx, 0.15, 60, 560, '#02030a');
  // ledge with gargoyles and pigeons
  const ly = BL.ledge;
  stoneBlocks(ctx, r, 0, ly, W, TY - ly, ['#6a6a76', '#5a5a66'], '#2a2a32', 60, 6);
  vgrad(ctx, 0, ly, W, TY - ly, [
    [0, 'rgba(0,0,10,0.15)'],
    [1, 'rgba(0,0,10,0.55)'],
  ]);
  ctx.beginPath();
  ctx.rect(-10, ly - 18, W + 20, 26);
  fillOl(ctx, cylV(ctx, ly - 18, 26, '#8a8a96'), 5);
  gargoyle(ctx, 150, ly - 18, 1);
  gargoyle(ctx, 1770, ly - 18, -1);
  pigeon(ctx, 560, ly - 18, 1);
  pigeon(ctx, 620, ly - 18, -1);
  pigeon(ctx, 1330, ly - 18, 1);
  fogBand(ctx, r, 600, 100, '#8a9ac8', 0.15, 24);
  // mossy stone slab table
  stoneTop(ctx, r, BL.front, '#7e7c88', 0.7);
  ctx.save();
  clipRect(ctx, 0, TY, W, BL.front - TY);
  for (let i = 0; i < 18; i++) darkSpot(ctx, r() * W, TY + r() * 260, 50 + r() * 80, 12 + r() * 14, 0.35, '#3a5a2a');
  ctx.restore();
  stoneFront(ctx, r, BL.front, '#5a5a66');
  contactShadow(ctx, 0.55);
  glow(ctx, bolt.x, 860, 800, '#9ab0ff', 0.08, 0.3);
  glow(ctx, L.x, 860, 400, '#ffa040', 0.1, 0.3);
  tableLight(ctx, '#b0c0e8', 0.04, 0.5);
  grade(ctx, 0.15);
  vignette(ctx, 0.85, '#02030a');
}

// ---------------------------------------------------------------------------------------------

registerScene('cosmiccroc', {
  info: {
    name: 'Moon Crater',
    subtitle: 'Boss: COSMIC CROC',
    ambient: ['stars'],
    glows: [
      g(MC.earth.x, MC.earth.y, 240, '#4ab0ff', 0.05),
      g(MC.lander.x - 86, MC.lander.y - 262, 40, '#ff4a4a', 0.8),
      g(MC.lander.x + 86, MC.lander.y - 262, 40, '#4aff8a', 0.8),
    ],
    light: '#d8e0ff',
    tableTint: '#eef0ff',
  },
  draw: drawMoonCrater,
});

registerScene('nonna', {
  info: {
    name: "Nonna's Pantry",
    subtitle: "Boss: NONNA'S SLIPPER",
    ambient: ['dust'],
    glows: [
      g(NP.bulb.x, NP.bulb.y + 4, 200, '#ffc070', 0.15),
      g(NP.pot.x, NP.counter - 40, 120, '#ff6a1a', 0.7),
    ],
    light: '#ffc880',
    tableTint: '#fff0dc',
  },
  draw: drawPantry,
});

registerScene('gargoyle', {
  info: {
    name: 'Bell Tower',
    subtitle: 'Boss: THE GARGOYLE',
    ambient: ['fog'],
    glows: [
      g(BL.bolt.x, BL.bolt.y + 140, 380, '#9ab0ff', 0.9),
      g(BL.lantern.x, BL.lantern.y, 200, '#ffa040', 0.5),
      g(150 + 84, BL.ledge - 18 - 172, 30, '#ff6a3a', 0.6),
      g(1770 - 84, BL.ledge - 18 - 172, 30, '#ff6a3a', 0.6),
    ],
    light: '#b0c0e8',
    tableTint: '#e4e8f4',
  },
  draw: drawBellTower,
});

