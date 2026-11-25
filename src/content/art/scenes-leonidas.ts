// King Leonidas's nemesis stage (src/game/nemesis.ts): with Leonidas equipped, the Labyrinth (waves 81–85) becomes
// the Hot Gates.
// - The Hot Gates (waves 81–84): the narrow pass between sheer cliffs and the sea. The old stone wall across the pass,
//   the sea breaking on the rocks to the left, and the Persian host's banners and dust filling the plain beyond. The
//   live layer (src/content/live/leonidas.ts) brings surf and dust, and the light moves across the stage: dawn, noon,
//   a sky dark with arrows, and a blood-red dusk.
// - The Goat Path (the Immortal Brute, wave 83): the hidden mountain track by night, torches of the Immortals
//   winding up it.
// - The God-King's Pavilion (Xerxes, wave 85): a golden canopy over a towering throne on a stepped platform, braziers
//   and the banners of the whole empire behind it.
// Every emblem is our own. The Hot Gates and the Goat Path are redrawn with the location kit (scene-hotgates.ts,
// scene-immortalbrute.ts): their old art here stays for the before/after page.

import type { GlowSpot } from '../../art/backdrops';
import { registerLegacyScene, registerScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  H,
  TY,
  VX,
  W,
  contactShadow,
  cylH,
  cylV,
  ellipse,
  fillOl,
  frontFace,
  glow,
  grade,
  laneCalm,
  lgrad,
  mottle,
  rgba,
  roundRect,
  shade,
  stars,
  stoneBlocks,
  stoneTop,
  tableLight,
  vgrad,
  vignette,
} from '../../art/sceneKit';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

/** A rugged cliff face rising from `base` to the jagged line `top` (x → y). */
function cliff(ctx: Ctx, r: R, x0: number, x1: number, base: number, top: (x: number) => number, col: string): void {
  ctx.beginPath();
  ctx.moveTo(x0, base);
  for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, top(x) + (r() - 0.5) * 14);
  ctx.lineTo(x1, base);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, x0, 0, x1, 0, [
    [0, shade(col, 0.15)],
    [1, shade(col, -0.35)],
  ]), 5);
  ctx.save();
  ctx.clip();
  mottle(ctx, x0, 0, x1 - x0, base, 0.35, 1.2);
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const x = x0 + r() * (x1 - x0);
    let y = top(x) + 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      y += 30 + r() * 40;
      ctx.lineTo(x + (r() - 0.5) * 40, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A Persian banner on a pole: a coloured swallowtail with a gold winged-sun emblem of our own. */
function banner(ctx: Ctx, x: number, y: number, s: number, col: string): void {
  ctx.beginPath();
  ctx.rect(x - 3 * s, y, 6 * s, 160 * s);
  ctx.fillStyle = '#5a3a22';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 3 * s, y + 6 * s);
  ctx.lineTo(x + 70 * s, y + 10 * s);
  ctx.lineTo(x + 56 * s, y + 34 * s);
  ctx.lineTo(x + 70 * s, y + 58 * s);
  ctx.lineTo(x + 3 * s, y + 54 * s);
  ctx.closePath();
  fillOl(ctx, col, 3 * s);
  ctx.beginPath();
  ctx.arc(x + 30 * s, y + 31 * s, 8 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.fillRect(x + 14 * s, y + 29 * s, 32 * s, 4 * s);
}

/** The table's front for the Hot Gates: weathered bronze with a running wave. */
function bronzeFront(ctx: Ctx, front: number, face: string): void {
  frontFace(ctx, front, () => {
    ctx.fillStyle = lgrad(ctx, 0, front, 0, H, [
      [0, shade(face, 0.1)],
      [1, shade(face, -0.45)],
    ]);
    ctx.fillRect(0, front, W, H - front);
    ctx.strokeStyle = rgba('#ffe0a0', 0.6);
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = -20; x < W + 40; x += 48) {
      ctx.moveTo(x, front + 30);
      ctx.bezierCurveTo(x + 12, front + 10, x + 34, front + 10, x + 34, front + 24);
      ctx.bezierCurveTo(x + 34, front + 34, x + 22, front + 34, x + 22, front + 26);
    }
    ctx.stroke();
  }, 0.38);
}

// =============================================================================================
// The Hot Gates

export const HG = {
  sea: 520,
  wall: { y: 560, x0: 520, x1: 1500 },
  front: 1040,
};

function drawHotGates(ctx: Ctx, r: R): void {
  // a hot, hazy Greek sky
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#8ab8e0'],
    [0.5, '#d8d0b8'],
    [1, '#e8c890'],
  ]);
  glow(ctx, 1500, 120, 260, '#fff6d0', 0.6);
  // the sea to the left, glittering, breaking white on the rocks
  ctx.beginPath();
  ctx.moveTo(0, HG.sea - 120);
  ctx.lineTo(700, HG.sea - 130);
  ctx.lineTo(560, TY);
  ctx.lineTo(0, TY);
  ctx.closePath();
  ctx.fillStyle = lgrad(ctx, 0, HG.sea - 130, 0, TY, [
    [0, '#3a8ab8'],
    [1, '#1a4a7a'],
  ]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const x = r() * 600;
    const y = HG.sea - 110 + r() * 260;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20 + r() * 30, y);
    ctx.stroke();
  }
  // the plain beyond the pass, choked with the Persian host: a haze of dust, spears and banners
  ctx.beginPath();
  ctx.rect(600, 380, 900, 200);
  ctx.fillStyle = lgrad(ctx, 0, 380, 0, 580, [
    [0, '#d8b878'],
    [1, '#b8905a'],
  ]);
  ctx.fill();
  for (let i = 0; i < 260; i++) {
    const x = 620 + r() * 860;
    const y = 400 + r() * 160;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 4, y - 14 - r() * 10);
    ctx.strokeStyle = rgba('#5a3a22', 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) banner(ctx, 660 + i * 95 + r() * 30, 360 + r() * 40, 0.6, ['#a8182e', '#5a2a7a', '#2a7a6a'][i % 3]);
  glow(ctx, 1050, 460, 500, '#f0d8a0', 0.35);
  // the cliffs: sheer on the right, broken rocks running down to the sea on the left
  cliff(ctx, r, 1380, W + 20, TY, (x) => 40 + Math.max(0, 1600 - x) * 0.35, '#9a8a74');
  cliff(ctx, r, -20, 420, TY, (x) => 360 + (x - 200) * (x - 200) * 0.0015, '#8a7a66');
  // the old Phocian wall of rough blocks across the pass, a gap where the Spartans stand
  const Wl = HG.wall;
  stoneBlocks(ctx, r, Wl.x0, Wl.y, 380, 120, ['#c8b898', '#b8a888', '#d8c8a8'], '#6a5a48', 40, 6);
  stoneBlocks(ctx, r, Wl.x1 - 380, Wl.y, 380, 120, ['#c8b898', '#b8a888', '#d8c8a8'], '#6a5a48', 40, 6);
  // Spartan shields propped along the wall top
  for (const x of [560, 640, 720, 1220, 1300, 1380, 1460]) {
    ctx.beginPath();
    ctx.arc(x, Wl.y - 18, 26, 0, Math.PI * 2);
    fillOl(ctx, lgrad(ctx, x - 26, Wl.y - 44, x + 26, Wl.y + 8, [
      [0, '#ffe0a0'],
      [0.4, '#c9873a'],
      [1, '#5a3410'],
    ]), 4);
    ctx.beginPath();
    ctx.moveTo(x - 12, Wl.y - 4);
    ctx.lineTo(x, Wl.y - 34);
    ctx.lineTo(x + 12, Wl.y - 4);
    ctx.strokeStyle = '#8a0a14';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  // the ground of the pass: packed dust
  vgrad(ctx, 0, 680, W, TY - 680, [
    [0, '#c8a878'],
    [1, '#a88858'],
  ]);
  laneCalm(ctx, 0.2, 60, 620, '#2a1810');
  // the table: sun-baked limestone with a bronze front
  stoneTop(ctx, r, HG.front, '#d8c8a4', 0.5);
  bronzeFront(ctx, HG.front, '#a8702c');
  contactShadow(ctx, 0.5);
  tableLight(ctx, '#ffe0a0', 0.1, 0.4);
  grade(ctx, 0.04);
  vignette(ctx, 0.5, '#3a2410', 0.45);
}

// =============================================================================================
// The Goat Path (the Immortal Brute)

export const GP = {
  torches: [[300, 260], [520, 330], [760, 300], [1040, 360], [1300, 300], [1560, 250]] as [number, number][],
  moon: { x: 1600, y: 140 },
  front: 1040,
};

function drawGoatPath(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#0a0e22'],
    [0.6, '#1e2440'],
    [1, '#2a2430'],
  ]);
  stars(ctx, r, 0, 0, W, 360, 140, 0.9);
  glow(ctx, GP.moon.x, GP.moon.y, 220, '#e8ecff', 0.35);
  ctx.beginPath();
  ctx.arc(GP.moon.x, GP.moon.y, 60, 0, Math.PI * 2);
  ctx.fillStyle = '#f0f0e0';
  ctx.fill();
  // ridge upon ridge of dark mountain
  for (const [base, col, amp] of [[420, '#262a44', 90], [520, '#1e2034', 120], [640, '#16182a', 100]] as const) {
    ctx.beginPath();
    ctx.moveTo(-20, TY);
    for (let x = -20; x <= W + 20; x += 40) ctx.lineTo(x, base - Math.abs(Math.sin(x * 0.004 + base)) * amp - r() * 20);
    ctx.lineTo(W + 20, TY);
    ctx.closePath();
    fillOl(ctx, col, 4);
  }
  // the goat path zig-zagging up the slope, lit by the Immortals' torches
  ctx.beginPath();
  ctx.moveTo(140, 640);
  GP.torches.forEach(([x, y]) => ctx.lineTo(x, y + 30));
  ctx.strokeStyle = 'rgba(200,170,120,0.35)';
  ctx.lineWidth = 18;
  ctx.stroke();
  for (const [x, y] of GP.torches) {
    glow(ctx, x, y, 120, '#ff9a3a', 0.45);
    ctx.beginPath();
    ctx.rect(x - 3, y, 6, 36);
    ctx.fillStyle = '#3a2a1a';
    ctx.fill();
    ellipse(ctx, x, y - 6, 9, 14);
    ctx.fillStyle = '#ffb040';
    ctx.fill();
    // a masked Immortal by each torch: a dark silhouette with a pale mask
    ctx.beginPath();
    ctx.ellipse(x + 22, y + 20, 12, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0e0c16';
    ctx.fill();
    ellipse(ctx, x + 22, y + 2, 7, 8);
    ctx.fillStyle = '#d8d4cc';
    ctx.fill();
  }
  // a twisted olive tree and boulders in front
  ctx.beginPath();
  ctx.moveTo(1700, 700);
  ctx.bezierCurveTo(1680, 600, 1760, 560, 1720, 460);
  ctx.lineTo(1750, 460);
  ctx.bezierCurveTo(1800, 560, 1730, 620, 1760, 700);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, 1680, 90, '#3a2a22'), 4);
  for (const [x, y, s] of [[1680, 440, 60], [1770, 430, 50], [1730, 400, 56]]) {
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    fillOl(ctx, '#2a3a2a', 4);
  }
  for (const [x, w] of [[200, 160], [420, 110], [1480, 140]]) {
    ellipse(ctx, x, 690, w, w * 0.4);
    fillOl(ctx, cylV(ctx, 690 - w * 0.4, w * 0.8, '#3a3844'), 4);
  }
  vgrad(ctx, 0, 690, W, TY - 690, [
    [0, '#2a2632'],
    [1, '#1a1822'],
  ]);
  laneCalm(ctx, 0.3, 60, 620, '#05060e');
  stoneTop(ctx, r, GP.front, '#6a6470', 0.5);
  bronzeFront(ctx, GP.front, '#7a5424');
  contactShadow(ctx, 0.6);
  tableLight(ctx, '#ffb070', 0.08, 0.55);
  grade(ctx, 0.08);
  vignette(ctx, 0.85, '#05060e', 0.6);
}

// =============================================================================================
// The God-King's Pavilion (Xerxes)

export const XP = {
  throne: { x: 960, y: 640 },
  braziers: [{ x: 420, y: 640 }, { x: 1500, y: 640 }],
  front: 1040,
};

function drawPavilion(ctx: Ctx, r: R): void {
  // a red-gold dusk over the plain
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#3a1430'],
    [0.5, '#a8402a'],
    [1, '#e8904a'],
  ]);
  glow(ctx, VX, 520, 700, '#ffb060', 0.4);
  // the endless host: banners and spears to the horizon
  for (let i = 0; i < 30; i++) banner(ctx, 40 + i * 64 + r() * 20, 420 + r() * 40, 0.55, ['#a8182e', '#5a2a7a', '#2a7a6a', '#c9873a'][i % 4]);
  // the canopy: gold cloth on four gilded posts, hung with tassels
  for (const x of [380, 760, 1160, 1540]) {
    ctx.beginPath();
    ctx.rect(x - 14, 140, 28, 520);
    fillOl(ctx, cylH(ctx, x - 14, 28, '#e8b23a'), 4);
  }
  ctx.beginPath();
  ctx.moveTo(300, 150);
  for (let k = 0; k <= 6; k++) ctx.quadraticCurveTo(300 + k * 220 - 110, 200, 300 + k * 220, 150);
  ctx.lineTo(1620, 80);
  ctx.lineTo(300, 80);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, 80, 0, 200, [
    [0, '#ffe08a'],
    [0.6, '#c8902a'],
    [1, '#8a5a14'],
  ]), 5);
  for (let k = 0; k < 7; k++) {
    const x = 300 + k * 220;
    ctx.beginPath();
    ctx.moveTo(x, 150);
    ctx.lineTo(x, 196);
    ctx.strokeStyle = '#8a0a1a';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, 200, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#c8102e';
    ctx.fill();
  }
  // the stepped platform and the towering throne
  const T = XP.throne;
  for (let k = 0; k < 4; k++) {
    roundRect(ctx, T.x - 320 + k * 50, T.y + 40 - k * 32, 640 - k * 100, 34, 6);
    fillOl(ctx, cylV(ctx, T.y + 40 - k * 32, 34, k % 2 ? '#c9873a' : '#e8d8b8'), 4);
  }
  ctx.beginPath();
  ctx.moveTo(T.x - 150, T.y - 80);
  ctx.lineTo(T.x - 170, T.y - 420);
  ctx.lineTo(T.x - 60, T.y - 470);
  ctx.lineTo(T.x, T.y - 520);
  ctx.lineTo(T.x + 60, T.y - 470);
  ctx.lineTo(T.x + 170, T.y - 420);
  ctx.lineTo(T.x + 150, T.y - 80);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, T.x - 170, 0, T.x + 170, 0, [
    [0, '#8a5a14'],
    [0.35, '#ffe08a'],
    [0.6, '#e8b23a'],
    [1, '#6a4410'],
  ]), 6);
  // a winged sun on the throne back (our own emblem)
  ctx.beginPath();
  ctx.arc(T.x, T.y - 340, 44, 0, Math.PI * 2);
  fillOl(ctx, '#c8102e', 4);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(T.x + s * (70 + k * 18), T.y - 340 + k * 10, 40 - k * 6, 9, s * 0.2, 0, Math.PI * 2);
      fillOl(ctx, '#ffd23f', 3);
    }
  }
  roundRect(ctx, T.x - 190, T.y - 160, 380, 100, 16);
  fillOl(ctx, cylV(ctx, T.y - 160, 100, '#e8b23a'), 5);
  roundRect(ctx, T.x - 170, T.y - 152, 340, 28, 10);
  fillOl(ctx, cylV(ctx, T.y - 152, 28, '#7a1a3a'), 3);
  // braziers either side
  for (const b of XP.braziers) {
    ctx.beginPath();
    ctx.moveTo(b.x - 20, b.y + 40);
    ctx.lineTo(b.x - 40, b.y - 80);
    ctx.lineTo(b.x + 40, b.y - 80);
    ctx.lineTo(b.x + 20, b.y + 40);
    ctx.closePath();
    fillOl(ctx, cylH(ctx, b.x - 40, 80, '#c9873a'), 4);
    ellipse(ctx, b.x, b.y - 84, 76, 20);
    fillOl(ctx, cylV(ctx, b.y - 104, 40, '#e8b23a'), 4);
    glow(ctx, b.x, b.y - 120, 200, '#ff9a3a', 0.55);
  }
  laneCalm(ctx, 0.22, 60, 620, '#1a0610');
  // the table: polished red marble with gold veins on a gold front
  stoneTop(ctx, r, XP.front, '#8a3a3a', 0.25);
  bronzeFront(ctx, XP.front, '#c8902a');
  contactShadow(ctx, 0.55);
  tableLight(ctx, '#ffc080', 0.08, 0.5);
  grade(ctx, 0.05);
  vignette(ctx, 0.75, '#1a0610', 0.55);
}

// (redrawn with the location kit in scene-hotgates.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('hotgates', {
  info: {
    name: 'The Hot Gates',
    subtitle: 'Waves 81–84 · with King Leonidas',
    ambient: ['dust'],
    glows: [g(1500, 120, 260, '#fff6d0', 0.05), g(1050, 460, 420, '#f0d8a0', 0.1)],
    light: '#ffe8c8',
    tableTint: '#fff4e4',
  },
  draw: drawHotGates,
});

// (redrawn with the location kit in scene-immortalbrute.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('immortalbrute', {
  info: {
    name: 'The Goat Path',
    subtitle: 'Mini-boss: THE IMMORTAL BRUTE',
    ambient: ['embers'],
    glows: GP.torches.map(([x, y]) => g(x, y - 6, 110, '#ff9a3a', 0.6)),
    light: '#c8b8e8',
    tableTint: '#f0ecf8',
  },
  draw: drawGoatPath,
});

registerScene('xerxes', {
  info: {
    name: 'The God-King’s Pavilion',
    subtitle: 'Boss: XERXES',
    ambient: ['embers'],
    glows: [...XP.braziers.map((b) => g(b.x, b.y - 120, 180, '#ff9a3a', 0.6)), g(XP.throne.x, XP.throne.y - 340, 200, '#ffd23f', 0.2)],
    light: '#ffd0a8',
    tableTint: '#fff0e4',
  },
  draw: drawPavilion,
});
