// Batpeel's Gotham backdrops (a nemesis stage, src/game/nemesis.ts): Goth-Ham Rooftops (waves 61–64 with Batpeel
// equipped), The Pit (Bunion's arena, he takes the stage over at wave 63) and the Ha-Ha Funhouse (the Jokester,
// wave 65). A gothic night city in cold blues under a storm, still printed like the act's pulp comic. Rain, the
// drifting cloud over the moon, the searchlight and its pizza-slice signal, lightning, dripping gargoyles and the
// funhouse bulbs are live layers on top (src/content/live/gotham.ts), and the weather worsens wave by wave.
// Every emblem and sign is our own. Goth-Ham Rooftops is redrawn with the location kit (scene-gotham.ts): its old art
// here stays for the before/after page.

import type { GlowSpot } from '../../art/backdrops';
import { registerLegacyScene, registerScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  BLOCK,
  H,
  OL,
  TY,
  W,
  checkerTop,
  clipRect,
  contactShadow,
  cylH,
  ellipse,
  fillOl,
  fogBand,
  frontFace,
  glow,
  gothicArch,
  laneCalm,
  lgrad,
  moon,
  neonText,
  rgba,
  rivet,
  roundRect,
  shade,
  stars,
  stoneBlocks,
  tableLight,
  vgrad,
  vignette,
} from '../../art/sceneKit';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

/** Ben-Day dots over a rectangle (the act's comic print), growing from a0 to a1 of the step down the area. */
function benDay(ctx: Ctx, x: number, y: number, w: number, h: number, col: string, alpha: number, step = 14, a0 = 0.05, a1 = 0.32): void {
  ctx.save();
  clipRect(ctx, x, y, w, h);
  ctx.fillStyle = rgba(col, alpha);
  for (let yy = y; yy < y + h + step; yy += step) {
    const k = (yy - y) / h;
    const rr = step * (a0 + (a1 - a0) * Math.min(1, Math.max(0, k)));
    const off = Math.round((yy - y) / step) % 2 ? step / 2 : 0;
    ctx.beginPath();
    for (let xx = x + off; xx < x + w + step; xx += step) {
      ctx.moveTo(xx + rr, yy);
      ctx.arc(xx, yy, rr, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
}

/** A heavy storm cloud bank: overlapping lit-edged puffs. */
function cloudBank(ctx: Ctx, r: R, y: number, h: number, top: string, bot: string, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = (i / n) * (W + 300) - 150 + r() * 80;
    const rr = h * (0.5 + r() * 0.5);
    const cy = y + r() * h * 0.4;
    const gr = ctx.createRadialGradient(x - rr * 0.3, cy - rr * 0.5, rr * 0.1, x, cy, rr);
    gr.addColorStop(0, top);
    gr.addColorStop(0.75, bot);
    gr.addColorStop(1, rgba(bot, 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, cy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A gothic tower: a tall block with pointed windows, a steep spire and pinnacles. */
function spire(ctx: Ctx, r: R, x: number, w: number, top: number, base: number, wall: string, win: string, lit: number): void {
  const roof = top - w * 1.1;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, top);
  ctx.lineTo(x + w / 2, roof);
  ctx.lineTo(x + w, top);
  ctx.lineTo(x + w, base);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, x, 0, x + w, 0, [[0, shade(wall, 0.14)], [0.55, wall], [1, shade(wall, -0.4)]]), 4);
  // pinnacles at the corners
  for (const px of [x, x + w]) {
    ctx.beginPath();
    ctx.moveTo(px - 8, top + 4);
    ctx.lineTo(px, top - 44);
    ctx.lineTo(px + 8, top + 4);
    ctx.closePath();
    fillOl(ctx, shade(wall, -0.1), 3);
  }
  const cols = Math.max(1, Math.floor((w - 16) / 30));
  const cw = (w - 16) / cols;
  for (let wy = top + 30; wy < base - 40; wy += 62) {
    for (let i = 0; i < cols; i++) {
      const wx = x + 8 + i * cw + 5;
      gothicArch(ctx, wx, wx + cw - 10, wy, wy + 40);
      ctx.fillStyle = r() < lit ? rgba(win, 0.6 + r() * 0.4) : rgba('#060812', 0.65);
      ctx.fill();
    }
  }
}

/** A stone gargoyle of our own: a crouching winged imp with a pizza-slice tongue, perched on a ledge, facing `dir`. */
function gargoyle(ctx: Ctx, x: number, y: number, s: number, dir: 1 | -1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const stone = '#7a8090';
  // a folded wing behind
  ctx.beginPath();
  ctx.moveTo(-20, -60);
  ctx.quadraticCurveTo(-90, -120, -110, -40);
  ctx.quadraticCurveTo(-80, -60, -70, -20);
  ctx.quadraticCurveTo(-54, -40, -40, -6);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, -110, -120, -20, 0, [[0, shade(stone, 0.1)], [1, shade(stone, -0.4)]]), 4);
  // the crouched body
  ctx.beginPath();
  ctx.moveTo(-50, 0);
  ctx.bezierCurveTo(-60, -50, -30, -84, 6, -80);
  ctx.bezierCurveTo(30, -78, 46, -60, 50, -40);
  ctx.bezierCurveTo(70, -40, 84, -30, 84, -16);
  ctx.bezierCurveTo(84, -4, 60, 0, 40, 0);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, -50, -84, 84, 0, [[0, shade(stone, 0.25)], [0.5, stone], [1, shade(stone, -0.45)]]), 4);
  // horned head jutting out over the street
  ctx.beginPath();
  ctx.moveTo(40, -44);
  ctx.bezierCurveTo(50, -76, 96, -78, 108, -52);
  ctx.bezierCurveTo(118, -30, 96, -18, 74, -22);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 40, -78, 118, -18, [[0, shade(stone, 0.3)], [1, shade(stone, -0.35)]]), 4);
  for (const hx of [56, 76]) {
    ctx.beginPath();
    ctx.moveTo(hx, -66);
    ctx.quadraticCurveTo(hx - 6, -96, hx + 8, -104);
    ctx.quadraticCurveTo(hx + 4, -86, hx + 12, -68);
    ctx.closePath();
    fillOl(ctx, shade(stone, -0.1), 3);
  }
  // a glowing eye and a gaping mouth (the rain spout)
  ellipse(ctx, 88, -56, 5, 4);
  ctx.fillStyle = '#ffd86a';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(98, -38);
  ctx.lineTo(118, -36);
  ctx.lineTo(100, -28);
  ctx.closePath();
  fillOl(ctx, '#1a1c24', 2);
  // claws over the ledge
  for (const cx of [-30, -12, 22, 40]) {
    ctx.beginPath();
    ctx.moveTo(cx - 6, -4);
    ctx.lineTo(cx, 8);
    ctx.lineTo(cx + 6, -4);
    ctx.closePath();
    fillOl(ctx, shade(stone, -0.2), 2);
  }
  ctx.restore();
}

/** A raindrop texture painted into the sky (live rain falls over the top). */
function paintedRain(ctx: Ctx, r: R, y0: number, y1: number, n: number, a: number): void {
  ctx.strokeStyle = rgba('#c8d8ff', a);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = r() * (W + 200) - 100;
    const y = y0 + r() * (y1 - y0);
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8, y + 30);
  }
  ctx.stroke();
}

// ---------------------------------------------------------------------------------------------
// Goth-Ham Rooftops

const GH = {
  moon: { x: 1480, y: 150, r: 92 },
  clock: { x: 700, y: 250 },
  lamp: { x: 1640, y: 600 },
  gargoyles: [
    [200, 640, 1.05, 1],
    [1760, 640, 1.05, -1],
  ] as [number, number, number, 1 | -1][],
  front: 1040,
};

function drawGotham(ctx: Ctx, r: R): void {
  // storm night: deep navy overhead, a sickly teal glow low over the city, Ben-Day printed
  vgrad(ctx, 0, 0, W, 660, [
    [0, '#070a18'],
    [0.45, '#141c38'],
    [0.82, '#2a3a5a'],
    [1, '#4a5a6a'],
  ]);
  benDay(ctx, 0, 0, W, 460, '#000000', 0.45, 16, 0.32, 0.03);
  stars(ctx, r, 0, 0, W, 220, 40, 0.5);
  // the moon, half behind the cloud bank (live clouds drift over it)
  glow(ctx, GH.moon.x, GH.moon.y, 360, '#d8e4ff', 0.25);
  moon(ctx, GH.moon.x, GH.moon.y, GH.moon.r, r, '#eef2ff');
  cloudBank(ctx, r, 120, 120, 'rgba(120,134,170,0.95)', 'rgba(40,50,80,0.92)', 10);
  cloudBank(ctx, r, 230, 110, 'rgba(90,104,140,0.95)', 'rgba(26,32,56,0.95)', 12);
  // far city: a ragged line of gothic towers and spires in cold blue, a few warm windows
  for (let i = 0; i < 14; i++) {
    const x = -60 + i * 150 + r() * 40;
    const w = 70 + r() * 70;
    spire(ctx, r, x, w, 380 + r() * 140, 660, '#1e2844', '#e8c878', 0.14);
  }
  fogBand(ctx, r, 560, 80, '#5a7090', 0.22, 24);
  // the clock tower: a great gothic face with luminous hands (our own landmark)
  const C = GH.clock;
  spire(ctx, r, C.x - 90, 180, 190, 660, '#2a3452', '#ffd88a', 0.3);
  ellipse(ctx, C.x, C.y, 62, 62);
  fillOl(ctx, lgrad(ctx, C.x - 62, C.y - 62, C.x + 62, C.y + 62, [[0, '#fff4c8'], [1, '#d8b060']]), 6);
  glow(ctx, C.x, C.y, 150, '#ffe0a0', 0.35);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(C.x + Math.cos(a) * 48, C.y + Math.sin(a) * 48);
    ctx.lineTo(C.x + Math.cos(a) * 56, C.y + Math.sin(a) * 56);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(C.x, C.y);
  ctx.lineTo(C.x, C.y - 44);
  ctx.moveTo(C.x, C.y);
  ctx.lineTo(C.x + 30, C.y + 10);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 6;
  ctx.stroke();
  // mid rooftops: dark stone blocks with arched windows and water tanks on stilts
  spire(ctx, r, 40, 200, 420, 720, '#2e3450', '#ffd88a', 0.3);
  spire(ctx, r, 1280, 170, 450, 720, '#343a58', '#ffe2a0', 0.25);
  spire(ctx, r, 1460, 220, 400, 720, '#2a3048', '#ffd88a', 0.32);
  // a neon sign of our own over a mid roof, half its letters out
  roundRect(ctx, 960, 470, 260, 74, 8);
  fillOl(ctx, '#140c18', 4);
  neonText(ctx, 'ALL-NIGHT SLICES', 1090, 507, 30, BLOCK, '#ff4a6a', [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1]);
  // the searchlight on the right roof (its beam and the signal are live)
  const L = GH.lamp;
  ctx.beginPath();
  ctx.rect(L.x - 46, L.y, 92, 110);
  fillOl(ctx, cylH(ctx, L.x - 46, 92, '#4a4e5a'), 4);
  ctx.save();
  ctx.translate(L.x, L.y);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.rect(-50, -36, 100, 60);
  fillOl(ctx, lgrad(ctx, -50, -36, 50, 24, [[0, '#a8aeb8'], [1, '#3a3e48']]), 5);
  ellipse(ctx, 0, -38, 52, 16);
  fillOl(ctx, '#fff8d8', 4);
  ctx.restore();
  for (let k = 0; k < 4; k++) rivet(ctx, L.x - 34 + k * 22, L.y + 20, 4);
  glow(ctx, L.x - 20, L.y - 40, 140, '#fff4c0', 0.4);
  paintedRain(ctx, r, 0, 720, 260, 0.18);
  laneCalm(ctx, 0.14, 60, 640, '#04060e');
  // the near parapet: wet slate blocks with a carved cornice, and the two gargoyles keeping watch
  ctx.beginPath();
  ctx.rect(0, 640, W, TY - 640);
  fillOl(ctx, lgrad(ctx, 0, 640, 0, TY, [[0, '#4a5066'], [1, '#262a3a']]), 4);
  stoneBlocks(ctx, r, 0, 652, W, TY - 652, ['#454b60', '#3e4458', '#4c5268'], '#1e2230', 36, 4);
  benDay(ctx, 0, 650, W, TY - 650, '#04060e', 0.35, 12, 0.05, 0.3);
  ctx.beginPath();
  ctx.rect(-10, 626, W + 20, 22);
  fillOl(ctx, lgrad(ctx, 0, 626, 0, 648, [[0, '#9aa2b8'], [1, '#5a6278']]), 4);
  // wet sheen along the cornice
  ctx.fillStyle = 'rgba(200,220,255,0.25)';
  ctx.fillRect(0, 628, W, 3);
  for (const [gx, gy, gs, gd] of GH.gargoyles) gargoyle(ctx, gx, gy - 14, gs, gd);
  // the table: a rain-soaked charcoal and slate-violet check, dot-shaded, with puddle glints
  checkerTop(ctx, 0.2, '#2e3244', '#4a3a62', GH.front);
  ctx.save();
  clipRect(ctx, 0, TY, W, GH.front - TY);
  benDay(ctx, 0, TY, W, GH.front - TY, '#000000', 0.25, 12, 0.32, 0.04);
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const y = TY + 20 + r() * (GH.front - TY - 40);
    ellipse(ctx, x, y, 40 + r() * 60, 5 + r() * 6);
    ctx.fillStyle = rgba('#b8c8ff', 0.08 + r() * 0.1);
    ctx.fill();
  }
  ctx.restore();
  frontFace(ctx, GH.front, () => {
    vgrad(ctx, 0, GH.front, W, H - GH.front, [[0, '#3a3e52'], [1, '#14161e']]);
    benDay(ctx, 0, GH.front, W, H - GH.front, '#000000', 0.4, 10, 0.1, 0.35);
  });
  contactShadow(ctx, 0.55);
  glow(ctx, 960, 860, 900, '#a8c0ff', 0.05, 0.3);
  tableLight(ctx, '#c8d8ff', 0.04, 0.5);
  vignette(ctx, 0.62, '#02030a', 0.4);
}

// ---------------------------------------------------------------------------------------------
// The Pit (Bunion)

const PT = {
  sky: { x: 960, y: 70, rx: 360, ry: 70 },
  tanks: [250, 1670],
  front: 1040,
};

function venomTank(ctx: Ctx, x: number, base: number): void {
  // a tall glass tank of glowing Venom, with steel bands and a pressure dial
  ctx.beginPath();
  ctx.rect(x - 70, base - 330, 140, 320);
  fillOl(ctx, lgrad(ctx, x - 70, 0, x + 70, 0, [[0, '#2a6a2a'], [0.4, '#6aff4a'], [1, '#1a4a1a']]), 5);
  glow(ctx, x, base - 170, 220, '#7dff6a', 0.35);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x - 54, base - 316, 14, 290);
  for (const yy of [base - 340, base - 180, base - 20]) {
    ctx.beginPath();
    ctx.rect(x - 80, yy, 160, 26);
    fillOl(ctx, lgrad(ctx, 0, yy, 0, yy + 26, [[0, '#a8aeb8'], [1, '#4a4e58']]), 4);
    for (let k = 0; k < 5; k++) rivet(ctx, x - 64 + k * 32, yy + 13, 4);
  }
  ellipse(ctx, x + 44, base - 260, 22, 22);
  fillOl(ctx, '#f4f0e0', 4);
  ctx.beginPath();
  ctx.moveTo(x + 44, base - 260);
  ctx.lineTo(x + 58, base - 270);
  ctx.strokeStyle = '#d0202a';
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawPit(ctx: Ctx, r: R): void {
  // the well wall: rough dark blocks, lit from the opening far above
  ctx.fillStyle = '#16181e';
  ctx.fillRect(0, 0, W, TY);
  stoneBlocks(ctx, r, 0, 0, W, 660, ['#34363e', '#2c2e36', '#3a3c44', '#30323a'], '#121318', 64, 8);
  // light falling from the round opening above
  const S = PT.sky;
  ellipse(ctx, S.x, S.y, S.rx, S.ry);
  ctx.fillStyle = lgrad(ctx, 0, 0, 0, 140, [[0, '#a8c0e8'], [1, '#5a6a8a']]);
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const shaft = ctx.createLinearGradient(0, 70, 0, 760);
  shaft.addColorStop(0, 'rgba(160,190,240,0.32)');
  shaft.addColorStop(1, 'rgba(160,190,240,0)');
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(S.x - S.rx, S.y);
  ctx.lineTo(S.x + S.rx, S.y);
  ctx.lineTo(S.x + 560, 760);
  ctx.lineTo(S.x - 560, 760);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // a dangling climbing rope from the opening, and chains on the walls
  ctx.beginPath();
  ctx.moveTo(1120, 80);
  ctx.bezierCurveTo(1130, 260, 1110, 420, 1124, 600);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.strokeStyle = '#a8804a';
  ctx.lineWidth = 6;
  ctx.stroke();
  for (const cx of [560, 1360]) {
    for (let y = 120; y < 520; y += 22) {
      ellipse(ctx, cx + Math.sin(y * 0.02) * 6, y, 8, 12);
      ctx.strokeStyle = OL;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = '#7a7e88';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  // Venom pipes along the wall, feeding the two tanks
  for (const y of [300, 330]) {
    ctx.beginPath();
    ctx.rect(0, y, W, 18);
    fillOl(ctx, lgrad(ctx, 0, y, 0, y + 18, [[0, '#4a7a4a'], [1, '#1a3a1a']]), 3);
  }
  for (const x of PT.tanks) venomTank(ctx, x, 700);
  // a scrawled tally of days on the wall
  ctx.strokeStyle = rgba('#c8c0a8', 0.45);
  ctx.lineWidth = 3;
  for (let k = 0; k < 14; k++) {
    const x = 760 + (k % 5) * 14 + Math.floor(k / 5) * 90;
    ctx.beginPath();
    ctx.moveTo(x, 420);
    ctx.lineTo(x + (k % 5 === 4 ? -60 : 2), 470);
    ctx.stroke();
  }
  fogBand(ctx, r, 600, 80, '#3a5a3a', 0.25, 20);
  benDay(ctx, 0, 0, W, 660, '#000000', 0.25, 14, 0.04, 0.3);
  laneCalm(ctx, 0.14, 60, 640, '#000000');
  // a rough stone ledge across the back
  ctx.beginPath();
  ctx.rect(0, 640, W, TY - 640);
  fillOl(ctx, lgrad(ctx, 0, 640, 0, TY, [[0, '#4a4c54'], [1, '#22242a']]), 4);
  stoneBlocks(ctx, r, 0, 648, W, TY - 648, ['#44464e', '#3a3c44'], '#16171c', 40, 4);
  // the table: a stone slab, wet with green drips
  ctx.save();
  clipRect(ctx, 0, TY, W, PT.front - TY + 4);
  vgrad(ctx, 0, TY, W, PT.front - TY, [[0, '#2e3036'], [0.6, '#4a4c54'], [1, '#5a5c64']]);
  for (let i = 0; i < 40; i++) {
    ellipse(ctx, r() * W, TY + 10 + r() * (PT.front - TY - 20), 20 + r() * 50, 4 + r() * 6);
    ctx.fillStyle = rgba(r() < 0.3 ? '#5aff4a' : '#1a1c20', 0.12 + r() * 0.12);
    ctx.fill();
  }
  benDay(ctx, 0, TY, W, PT.front - TY, '#000000', 0.25, 12, 0.3, 0.04);
  ctx.restore();
  frontFace(ctx, PT.front, () => {
    vgrad(ctx, 0, PT.front, W, H - PT.front, [[0, '#3a3c44'], [1, '#141518']]);
    stoneBlocks(ctx, r, 0, PT.front, W, H - PT.front, ['#3a3c44', '#34363e'], '#121318', 24, 3);
  });
  contactShadow(ctx, 0.6);
  glow(ctx, 960, 860, 800, '#a8c0e8', 0.06, 0.3);
  tableLight(ctx, '#b8ffb0', 0.03, 0.5);
  vignette(ctx, 0.7, '#020302', 0.35);
}

// ---------------------------------------------------------------------------------------------
// Ha-Ha Funhouse (the Jokester)

const FH = {
  face: { x: 960, y: 330 },
  front: 1040,
};

function tentStripes(ctx: Ctx, x0: number, x1: number, top: number, base: number, a: string, b: string): void {
  ctx.save();
  clipRect(ctx, x0, top, x1 - x0, base - top);
  const n = 10;
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(x0 + i * w, base);
    ctx.lineTo(x0 + i * w + w * 0.3, top);
    ctx.lineTo(x0 + (i + 1) * w + w * 0.3, top);
    ctx.lineTo(x0 + (i + 1) * w, base);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? a : b;
    ctx.fill();
  }
  vgrad(ctx, x0, top, x1 - x0, base - top, [[0, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.55)']]);
  ctx.restore();
}

function drawFunhouse(ctx: Ctx, r: R): void {
  // storm sky behind the funhouse front
  vgrad(ctx, 0, 0, W, 660, [[0, '#0a0a1a'], [0.6, '#24183a'], [1, '#3a2a4a']]);
  cloudBank(ctx, r, 60, 120, 'rgba(110,90,150,0.9)', 'rgba(30,20,50,0.9)', 12);
  // the striped tent walls left and right, sagging, purple and acid green
  tentStripes(ctx, -20, 640, 150, 660, '#5b2a86', '#3a7a2a');
  tentStripes(ctx, 1280, 1940, 150, 660, '#3a7a2a', '#5b2a86');
  for (const [x0, x1] of [[-20, 640], [1280, 1940]] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, 150);
    for (let x = x0; x <= x1; x += 66) ctx.quadraticCurveTo(x + 33, 186, x + 66, 150);
    ctx.lineTo(x1, 140);
    ctx.lineTo(x0, 140);
    ctx.closePath();
    fillOl(ctx, '#e0202a', 4);
  }
  // the funhouse front: a giant grinning face of our own, its mouth the doorway
  const F = FH.face;
  ctx.beginPath();
  ctx.moveTo(F.x - 330, 660);
  ctx.lineTo(F.x - 330, 160);
  ctx.quadraticCurveTo(F.x, 40, F.x + 330, 160);
  ctx.lineTo(F.x + 330, 660);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, F.x - 330, 60, F.x + 330, 660, [[0, '#f8f0e4'], [0.6, '#d8ccc0'], [1, '#9a8c80']]), 7);
  // wild green hair across the top
  for (let k = 0; k < 11; k++) {
    const a = Math.PI + (k / 10) * Math.PI;
    const hx = F.x + Math.cos(a) * 320;
    const hy = 190 + Math.sin(a) * 150;
    ctx.beginPath();
    ctx.arc(hx, hy, 52, 0, Math.PI * 2);
    fillOl(ctx, lgrad(ctx, hx - 50, hy - 50, hx + 50, hy + 50, [[0, '#b8f05a'], [1, '#3a7a1a']]), 5);
  }
  // diamond eyes that glow (they flicker in play)
  for (const s of [-1, 1]) {
    const ex = F.x + s * 130;
    const ey = 290;
    ctx.beginPath();
    ctx.moveTo(ex, ey - 70);
    ctx.lineTo(ex + 50, ey);
    ctx.lineTo(ex, ey + 70);
    ctx.lineTo(ex - 50, ey);
    ctx.closePath();
    fillOl(ctx, '#3a1a5a', 5);
    ellipse(ctx, ex, ey, 24, 16);
    ctx.fillStyle = '#d8ff6a';
    ctx.fill();
    glow(ctx, ex, ey, 70, '#d8ff6a', 0.6);
  }
  // the nose
  ctx.beginPath();
  ctx.arc(F.x, 380, 34, 0, Math.PI * 2);
  fillOl(ctx, lgrad(ctx, F.x - 34, 346, F.x + 34, 414, [[0, '#ff6a6a'], [1, '#a8101a']]), 5);
  // the grin: a huge red mouth, the dark doorway inside, teeth along the top
  ctx.beginPath();
  ctx.moveTo(F.x - 260, 440);
  ctx.quadraticCurveTo(F.x, 700, F.x + 260, 440);
  ctx.quadraticCurveTo(F.x, 520, F.x - 260, 440);
  ctx.closePath();
  fillOl(ctx, '#c8101a', 6);
  ctx.beginPath();
  ctx.moveTo(F.x - 200, 480);
  ctx.quadraticCurveTo(F.x, 640, F.x + 200, 480);
  ctx.quadraticCurveTo(F.x, 530, F.x - 200, 480);
  ctx.closePath();
  ctx.fillStyle = '#0a0410';
  ctx.fill();
  for (let k = -5; k <= 5; k++) {
    const tx = F.x + k * 34;
    const ty = 492 + Math.abs(k) * -2;
    ctx.beginPath();
    ctx.moveTo(tx - 14, ty);
    ctx.lineTo(tx, ty + 22);
    ctx.lineTo(tx + 14, ty);
    ctx.closePath();
    fillOl(ctx, '#fffaf0', 2.5);
  }
  // a sign over the doorway
  roundRect(ctx, F.x - 170, 96, 340, 64, 10);
  fillOl(ctx, '#1a0a24', 5);
  neonText(ctx, 'HA-HA FUNHOUSE', F.x, 128, 40, BLOCK, '#9be23a');
  // posters and a giant playing card stuck on the tent walls (our own designs)
  for (const [px, py, rot, col] of [[200, 400, -0.1, '#ffd23f'], [460, 340, 0.08, '#ff7ad9'], [1480, 360, -0.06, '#5fd8ff'], [1720, 420, 0.1, '#ffd23f']] as const) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    roundRect(ctx, -70, -90, 140, 180, 8);
    fillOl(ctx, '#fbf2d8', 4);
    ctx.fillStyle = col;
    ctx.fillRect(-58, -78, 116, 100);
    ctx.font = `bold 34px ${BLOCK}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2a1810';
    ctx.fillText('HA!', 0, 66);
    ctx.restore();
  }
  // a string of bulbs swagged across the front (they chase in play)
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 10) {
    const k = (x % 480) / 480;
    const y = 100 + Math.sin(k * Math.PI) * 60;
    if (x) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  fogBand(ctx, r, 600, 60, '#6a4a8a', 0.2, 20);
  laneCalm(ctx, 0.14, 60, 640, '#06020a');
  // the low back rail: a candy-striped barrier
  ctx.beginPath();
  ctx.rect(0, 640, W, TY - 640);
  fillOl(ctx, lgrad(ctx, 0, 640, 0, TY, [[0, '#3a2a4a'], [1, '#1a1024']]), 4);
  ctx.save();
  clipRect(ctx, 0, 650, W, 40);
  for (let x = -40; x < W + 40; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 690);
    ctx.lineTo(x + 30, 650);
    ctx.lineTo(x + 60, 650);
    ctx.lineTo(x + 30, 690);
    ctx.closePath();
    ctx.fillStyle = '#e0202a';
    ctx.fill();
  }
  ctx.restore();
  // the table: a purple and green harlequin check
  checkerTop(ctx, 0.2, '#5b2a86', '#3a7a2a', FH.front);
  ctx.save();
  clipRect(ctx, 0, TY, W, FH.front - TY);
  benDay(ctx, 0, TY, W, FH.front - TY, '#000000', 0.22, 12, 0.32, 0.04);
  ctx.restore();
  frontFace(ctx, FH.front, () => {
    vgrad(ctx, 0, FH.front, W, H - FH.front, [[0, '#e0202a'], [1, '#6a0a10']]);
    for (let x = 0; x < W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, FH.front);
      ctx.lineTo(x + 40, FH.front + 30);
      ctx.lineTo(x + 80, FH.front);
      ctx.closePath();
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
    }
  });
  contactShadow(ctx, 0.5);
  glow(ctx, 960, 860, 900, '#d8ff6a', 0.05, 0.3);
  tableLight(ctx, '#e8c8ff', 0.05, 0.45);
  vignette(ctx, 0.6, '#06020a', 0.4);
}

// ---------------------------------------------------------------------------------------------

// (redrawn with the location kit in scene-gotham.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('gotham', {
  info: {
    name: 'Goth-Ham Rooftops',
    subtitle: 'Waves 61–64 · with Batpeel',
    ambient: ['fog'],
    glows: [
      g(GH.clock.x, GH.clock.y, 180, '#ffe0a0', 0.08),
      g(GH.lamp.x - 20, GH.lamp.y - 40, 170, '#fff4c0', 0.15),
      g(1090, 507, 200, '#ff4a6a', 0.55),
      g(GH.moon.x, GH.moon.y, 220, '#d8e4ff', 0.05),
    ],
    light: '#b8c8f0',
    tableTint: '#e8ecff',
  },
  draw: drawGotham,
});

registerScene('bunion', {
  info: {
    name: 'The Pit',
    subtitle: 'Mini-boss: BUNION',
    ambient: ['dust', 'fog'],
    glows: [...PT.tanks.map((x) => g(x, 530, 260, '#7dff6a', 0.35)), g(PT.sky.x, 200, 420, '#a8c0e8', 0.05)],
    light: '#c0e8c0',
    tableTint: '#e8ffe8',
  },
  draw: drawPit,
});

registerScene('jokester', {
  info: {
    name: 'Ha-Ha Funhouse',
    subtitle: 'Boss: THE JOKESTER',
    ambient: ['confetti'],
    glows: [g(FH.face.x - 130, 290, 120, '#d8ff6a', 0.6), g(FH.face.x + 130, 290, 120, '#d8ff6a', 0.6), g(FH.face.x, 128, 240, '#9be23a', 0.3)],
    light: '#e0c8ff',
    tableTint: '#f4e8ff',
  },
  draw: drawFunhouse,
});
