// Act 8 · Norse: Jotunheim Ice Fields and Bifröst Bridge, plus the four fight arenas (Lyngvi Isle for
// Fenrir's Paw, Thrym's Hall, the Edge of the World for Jörmungandr, the Burning Bridge for Surtr).
// The road to Ragnarök: cold and calm at wave 71, fire by wave 80. The animated layers (aurora,
// weather that changes wave by wave, the bridge catching fire) live in src/content/live/act8.ts; Jotunheim is
// redrawn with the location kit (scene-jotunheim.ts), and Thrym's Hall (scene-thrym.ts), Bifröst (scene-bifrost.ts),
// the Burning Bridge (scene-surtr.ts), Lyngvi Isle (scene-fenrir.ts) and the Edge of the World (scene-jormungandr.ts)
// too: their old art here stays for the before/after page.

import type { GlowSpot } from '../../art/backdrops';
import { registerLegacyScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  FOC,
  H,
  OL,
  TY,
  W,
  ZB,
  aurora,
  blob,
  clipRect,
  cloudStreak,
  contactShadow,
  cylH,
  darkSpot,
  ellipse,
  fillOl,
  flame,
  fogBand,
  frontFace,
  glow,
  grade,
  grainRect,
  laneCalm,
  lgrad,
  mix,
  mottle,
  moon,
  outline,
  planksTop,
  quad,
  range,
  rgba,
  roundRect,
  shade,
  snowfall,
  stars,
  stoneBlocks,
  stoneFront,
  stoneTop,
  tableLight,
  vgrad,
  vignette,
  woodLip,
  xAt,
  yAt,
  zFront,
} from '../../art/sceneKit';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

/** The table's front edge in every Act 8 scene. */
const FRONT = 1040;

// ---------------------------------------------------------------------------------------------
// Shared Norse kit: runes, ice, clouds, flames

/** A few Elder Futhark runes as strokes in a 0..1 box (shared with the redrawn Act 8 scenes: scene-jotunheim.ts). */
export const RUNES: number[][][] = [
  [[0.3, 0, 0.3, 1], [0.3, 0.15, 0.8, 0], [0.3, 0.42, 0.8, 0.25]], // fehu
  [[0.2, 1, 0.2, 0], [0.2, 0, 0.8, 0.3], [0.8, 0.3, 0.8, 1]], // uruz
  [[0.3, 0, 0.3, 1], [0.3, 0.25, 0.75, 0.5], [0.75, 0.5, 0.3, 0.75]], // thurisaz
  [[0.3, 0, 0.3, 1], [0.3, 0, 0.75, 0.25], [0.75, 0.25, 0.3, 0.5], [0.3, 0.5, 0.75, 1]], // raido
  [[0.5, 0, 0.5, 1], [0.5, 0.42, 0.1, 0], [0.5, 0.42, 0.9, 0]], // algiz
  [[0.5, 0, 0.5, 1], [0.5, 0, 0.12, 0.35], [0.5, 0, 0.88, 0.35]], // tiwaz
  [[0.7, 0, 0.3, 0.4], [0.3, 0.4, 0.7, 0.6], [0.7, 0.6, 0.3, 1]], // sowilo
  [[0.1, 0, 0.1, 1], [0.9, 0, 0.9, 1], [0.1, 0, 0.9, 1], [0.9, 0, 0.1, 1]], // dagaz
  [[0.5, 0, 0.85, 0.38], [0.85, 0.38, 0.5, 0.72], [0.5, 0.72, 0.15, 0.38], [0.15, 0.38, 0.5, 0], [0.5, 0.72, 0.15, 1], [0.5, 0.72, 0.85, 1]], // othala
  [[0.25, 0, 0.25, 1], [0.75, 0, 0.75, 1], [0.25, 0.1, 0.75, 0.45], [0.75, 0.1, 0.25, 0.45]], // mannaz
];

/** A carved rune: a dark cut, then a glowing inlay. */
function rune(ctx: Ctx, k: number, x: number, y: number, s: number, col: string, a: number): void {
  const strokes = RUNES[((k % RUNES.length) + RUNES.length) % RUNES.length];
  const path = () => {
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of strokes) {
      ctx.moveTo(x + x0 * s * 0.6, y + y0 * s);
      ctx.lineTo(x + x1 * s * 0.6, y + y1 * s);
    }
  };
  ctx.lineCap = 'round';
  path();
  outline(ctx, Math.max(4, s * 0.16), rgba(OL, 0.8));
  path();
  outline(ctx, Math.max(2, s * 0.08), rgba(col, a));
  if (a > 0.4) glow(ctx, x + s * 0.3, y + s * 0.5, s * 1.1, col, a * 0.35);
  ctx.lineCap = 'butt';
}

function runeRow(ctx: Ctx, r: R, x0: number, x1: number, y: number, s: number, col: string, a: number): void {
  for (let x = x0; x < x1; x += s * 0.95) rune(ctx, Math.floor(r() * 100), x, y, s, col, a * (0.6 + r() * 0.4));
}

/** A faceted ice mass: gradient fill, lit facet planes inside, a frosty rim and an ink outline. */
function iceMass(ctx: Ctx, r: R, pts: [number, number][], light: string, deep: string, lw = 5): void {
  const ys = pts.map((p) => p[1]);
  const top = Math.min(...ys);
  const bot = Math.max(...ys);
  const xs = pts.map((p) => p[0]);
  const path = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  path();
  ctx.fillStyle = lgrad(ctx, 0, top, 0, bot, [
    [0, light],
    [0.55, shade(light, -0.25)],
    [1, deep],
  ]);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // facets: lighter wedges falling from the top edge
  for (let i = 0; i < 9; i++) {
    const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs));
    const w = 30 + r() * 90;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, top);
    ctx.lineTo(x + w * 0.3 + (r() - 0.5) * 60, bot);
    ctx.closePath();
    ctx.fillStyle = rgba('#ffffff', 0.05 + r() * 0.1);
    ctx.fill();
  }
  // crevasse lines
  ctx.strokeStyle = rgba(shade(deep, -0.3), 0.45);
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 7; i++) {
    let x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs));
    let y = top + r() * (bot - top) * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (r() - 0.5) * 30;
      y += 30 + r() * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  mottle(ctx, Math.min(...xs), top, Math.max(...xs) - Math.min(...xs), bot - top, 0.18, 1.2);
  ctx.restore();
  path();
  outline(ctx, lw);
}

/** Icicles hanging from a line. */
function icicles(ctx: Ctx, r: R, x0: number, x1: number, y: number, len: number, col = '#dff4ff'): void {
  for (let x = x0; x < x1; x += 14 + r() * 22) {
    const l = len * (0.3 + r() * 0.7);
    const w = 6 + r() * 8;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + (r() - 0.5) * 3, y + l);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, y, 0, y + l, [
      [0, col],
      [1, rgba(col, 0.55)],
    ]), 2.5);
  }
}

/** A lumpy cloud bank: overlapping puffs with one outer outline, shaded underneath and lit on top.
 * `hang` makes a ceiling of cloud (puffs bulge downward from the top of the screen). */
function cloudBank(ctx: Ctx, r: R, x0: number, x1: number, y: number, size: number, top: string, bot: string, ol = 0, hang = false): void {
  const puffs: [number, number, number][] = [];
  for (let x = x0; x < x1; x += size * (0.55 + r() * 0.5)) {
    const rr = size * (0.5 + r() * 0.65);
    puffs.push([x, hang ? y + r() * size * 0.5 : y - r() * size * 0.5, rr]);
  }
  const shape = (grow: number, dy: number) => {
    ctx.beginPath();
    for (const [x, cy, rr] of puffs) {
      ctx.moveTo(x + rr + grow, cy + dy);
      ctx.arc(x, cy + dy, rr + grow, 0, Math.PI * 2);
    }
    if (hang) ctx.rect(x0 - size, -20, x1 - x0 + size * 2, y + 20);
    else ctx.rect(x0 - size, y, x1 - x0 + size * 2, size * 1.6);
  };
  // the outline: every puff stroked fat, then filled over, so only the outside edge shows
  if (ol) {
    shape(0, 0);
    ctx.strokeStyle = rgba(OL, 0.45);
    ctx.lineWidth = ol * 2;
    ctx.stroke();
  }
  shape(0, 0);
  ctx.fillStyle = lgrad(ctx, 0, y - size * 1.2, 0, y + size, [
    [0, top],
    [1, bot],
  ]);
  ctx.fill();
  // lit crowns: smaller puffs nudged up, a touch lighter
  ctx.save();
  shape(0, 0);
  ctx.clip();
  ctx.beginPath();
  for (const [x, cy, rr] of puffs) {
    ctx.moveTo(x + rr * 0.7, cy - rr * 0.25);
    ctx.arc(x - rr * 0.1, cy - rr * 0.25, rr * 0.7, 0, Math.PI * 2);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.restore();
}

/** A broken chain lying in a curve (Gleipnir, or iron). */
function chainCurve(ctx: Ctx, pts: [number, number][], link: number, col: string, glowCol?: string): void {
  let k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const ang = Math.atan2(by - ay, bx - ax);
    for (let d = 0; d < len; d += link * 0.78, k++) {
      const x = ax + Math.cos(ang) * d;
      const y = ay + Math.sin(ang) * d;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      if (k % 2) {
        roundRect(ctx, -link * 0.5, -link * 0.12, link, link * 0.24, link * 0.12);
        fillOl(ctx, shade(col, -0.2), 3);
      } else {
        ellipse(ctx, 0, 0, link * 0.55, link * 0.34);
        ctx.strokeStyle = OL;
        ctx.lineWidth = link * 0.3;
        ctx.stroke();
        ctx.strokeStyle = col;
        ctx.lineWidth = link * 0.15;
        ctx.stroke();
      }
      ctx.restore();
      if (glowCol && k % 3 === 0) glow(ctx, x, y, link * 1.2, glowCol, 0.25);
    }
  }
}

/** An ice slab table: stone-cut glacier ice with frost, a polished sheen and runes round the lip. */
function iceTable(ctx: Ctx, r: R, base: string, runeCol: string, runeA: number): void {
  stoneTop(ctx, r, FRONT, base, 0.4);
  ctx.save();
  clipRect(ctx, 0, TY, W, FRONT - TY);
  // a polished sheen and frost at the corners
  vgrad(ctx, 0, TY, W, FRONT - TY, [
    [0, 'rgba(255,255,255,0.12)'],
    [0.4, 'rgba(255,255,255,0)'],
    [1, 'rgba(220,244,255,0.12)'],
  ]);
  for (const x of [0, W]) darkSpot(ctx, x, FRONT - 40, 520, 200, 0.35, '#f4fbff');
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const X = (r() - 0.5) * 3.4;
    const z = ZB - 0.2 - r() * 1.2;
    ctx.beginPath();
    ctx.moveTo(xAt(X, z), yAt(z));
    ctx.lineTo(xAt(X + 0.25 + r() * 0.3, z - 0.05), yAt(z - 0.05));
    ctx.stroke();
  }
  ctx.restore();
  stoneFront(ctx, r, FRONT, shade(base, -0.15));
  runeRow(ctx, r, 30, W, FRONT + 6, 30, runeCol, runeA);
  // snow drifts along the back edge of the table
  ctx.beginPath();
  ctx.moveTo(-10, TY + 6);
  for (let x = -10; x <= W + 10; x += 90) ctx.quadraticCurveTo(x + 45, TY - 14 - r() * 18, x + 90, TY + 2);
  ctx.lineTo(W + 10, TY + 10);
  ctx.lineTo(-10, TY + 10);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, TY - 30, 0, TY + 10, [
    [0, '#ffffff'],
    [1, '#b8d0ea'],
  ]), 3);
}

/** A section of Bifröst: crystal planks banded in the rainbow, glassy highlights, gold rails. */
const RAINBOW = ['#ff4d5a', '#ff9a3d', '#ffd84a', '#5ee06a', '#3ec8ff', '#5a6cff', '#b06bff'];

function rainbowTop(ctx: Ctx, r: R, burnt: number): void {
  const zf = zFront(FRONT);
  ctx.save();
  clipRect(ctx, 0, TY, W, FRONT - TY + 4);
  const period = 0.42;
  for (let i = -8; i <= 8; i++) {
    const X0 = i * period;
    // softened towards pale crystal so the pizzas stay the brightest thing on the table
    const c = mix(RAINBOW[((i % 7) + 7) % 7], '#ece6ff', 0.4);
    const col = burnt > 0 ? mix(c, '#1e0c08', 0.75 * burnt) : shade(c, (r() - 0.5) * 0.06);
    ctx.beginPath();
    quad(ctx, X0, X0 + period, ZB, zf);
    ctx.fillStyle = lgrad(ctx, 0, TY, 0, FRONT, [
      [0, shade(col, -0.35)],
      [0.5, col],
      [1, shade(col, 0.18)],
    ]);
    ctx.fill();
    // glassy streak along the plank
    ctx.beginPath();
    quad(ctx, X0 + period * 0.12, X0 + period * 0.24, ZB, zf);
    ctx.fillStyle = rgba('#ffffff', 0.22 * (1 - burnt));
    ctx.fill();
  }
  // cross joints and seams
  ctx.strokeStyle = rgba('#1a0f30', 0.55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = -8; i <= 8; i++) {
    ctx.moveTo(xAt(i * period, ZB), TY);
    ctx.lineTo(xAt(i * period, zf), FRONT);
  }
  for (const z of [ZB - 0.55, ZB - 1.3]) {
    ctx.moveTo(0, yAt(z));
    ctx.lineTo(W, yAt(z));
  }
  ctx.stroke();
  // a soft prismatic shimmer over the whole deck (calmer in the middle, where the pizzas sit)
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const X = (r() - 0.5) * 3.6;
    const z = ZB - r() * (ZB - zf);
    darkSpot(ctx, xAt(X, z), yAt(z), 60 + r() * 80, 18 + r() * 20, 0.12 * (1 - burnt), '#ffffff');
  }
  ctx.globalCompositeOperation = 'source-over';
  grainRect(ctx, 0, TY, W, FRONT - TY, 0.2);
  // a calm pool where the pizzas sit
  darkSpot(ctx, 960, 900, 900, 120, 0.2, '#20123a');
  ctx.restore();
  // gold rail front face with runes
  frontFace(ctx, FRONT, () => {
    ctx.fillStyle = lgrad(ctx, 0, FRONT, 0, H, [
      [0, burnt ? shade('#b88a2a', -0.5 * burnt) : '#e8b84a'],
      [0.3, burnt ? shade('#8a6020', -0.5 * burnt) : '#b8862a'],
      [1, '#4a3010'],
    ]);
    ctx.fillRect(0, FRONT, W, H - FRONT);
    for (let x = 60; x < W; x += 240) {
      ellipse(ctx, x, FRONT + 22, 9, 9);
      fillOl(ctx, '#ffe9a0', 3);
    }
  }, 0.3);
  runeRow(ctx, r, 110, W - 60, FRONT + 8, 26, burnt ? '#ff9a3d' : '#fff2b0', 0.75);
}

/** A ragged blaze for scenery: several licking tongues of flame with a hot core and a glow. */
function fire(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, a = 1): void {
  glow(ctx, x, y - h * 0.3, w * 1.8, '#ff6a1a', 0.32 * a);
  ctx.save();
  ctx.globalAlpha = a;
  const n = 3 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const dx = (k / (n - 1 || 1) - 0.5) * w * 0.7;
    const hk = h * (0.45 + r() * 0.55) * (1 - Math.abs(dx) / w);
    flame(ctx, x + dx, y, w * (0.45 + r() * 0.25), hk, r, ['#e8380e', '#ff8a1e', '#ffe28a']);
  }
  flame(ctx, x, y, w * 0.5, h * 0.55, r, ['#ff9a2a', '#ffd060', '#ffffff']);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Jotunheim Ice Fields

const JH = {
  face: { x: 1370, y: 430 },
  runes: [
    [1290, 330],
    [1450, 330],
    [520, 420],
  ] as [number, number][],
};

/** The half-buried face of a frozen giant, carved into the glacier wall. */
function giantFace(ctx: Ctx, r: R, x: number, y: number, s: number): void {
  // head
  ctx.beginPath();
  ctx.moveTo(x - 190 * s, y + 130 * s);
  ctx.bezierCurveTo(x - 220 * s, y - 60 * s, x - 150 * s, y - 210 * s, x, y - 215 * s);
  ctx.bezierCurveTo(x + 150 * s, y - 210 * s, x + 220 * s, y - 60 * s, x + 190 * s, y + 130 * s);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, y - 215 * s, 0, y + 130 * s, [
    [0, '#9ab0c4'],
    [1, '#4a5e78'],
  ]), 6);
  ctx.save();
  ctx.clip();
  mottle(ctx, x - 230 * s, y - 230 * s, 460 * s, 380 * s, 0.35, 0.9);
  ctx.restore();
  // a band of runes across the brow, like a crown
  roundRect(ctx, x - 170 * s, y - 150 * s, 340 * s, 46 * s, 10 * s);
  fillOl(ctx, '#56687e', 4);
  for (let i = 0; i < 6; i++) rune(ctx, i * 3 + 1, x - 150 * s + i * 52 * s, y - 145 * s, 36 * s, '#7ff4ff', 0.9);
  // heavy brow, closed eyes, nose
  ctx.beginPath();
  ctx.moveTo(x - 150 * s, y - 70 * s);
  ctx.quadraticCurveTo(x - 80 * s, y - 108 * s, x - 14 * s, y - 70 * s);
  ctx.moveTo(x + 150 * s, y - 70 * s);
  ctx.quadraticCurveTo(x + 80 * s, y - 108 * s, x + 14 * s, y - 70 * s);
  outline(ctx, 12 * s, '#2e3a4c');
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + d * 130 * s, y - 40 * s);
    ctx.quadraticCurveTo(x + d * 80 * s, y - 20 * s, x + d * 34 * s, y - 40 * s);
    outline(ctx, 7 * s, '#1e2838');
  }
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y - 60 * s);
  ctx.lineTo(x - 42 * s, y + 40 * s);
  ctx.quadraticCurveTo(x, y + 62 * s, x + 42 * s, y + 40 * s);
  ctx.lineTo(x + 10 * s, y - 60 * s);
  fillOl(ctx, '#6a809a', 5);
  // a frozen beard: thick braided strands of ice hanging into the glacier
  for (let i = 0; i < 9; i++) {
    const bx = x + (i - 4) * 42 * s;
    const len = (120 + (4 - Math.abs(i - 4)) * 30 + (i % 2) * 40 + r() * 30) * s;
    const top = y + (46 + Math.abs(i - 4) * 6) * s;
    const sway = ((i - 4) * 12 + (r() - 0.5) * 30) * s;
    ctx.beginPath();
    ctx.moveTo(bx - 30 * s, top);
    ctx.bezierCurveTo(bx - 34 * s, top + len * 0.4, bx - 4 * s + sway * 0.3, top + len * 0.6, bx + sway - 6 * s, top + len * 0.86);
    ctx.quadraticCurveTo(bx + sway, top + len * 1.02, bx + sway + 4 * s, top + len);
    ctx.bezierCurveTo(bx + 14 * s + sway * 0.5, top + len * 0.7, bx + 34 * s, top + len * 0.4, bx + 30 * s, top);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, top, 0, top + len, [
      [0, '#a8c8e4'],
      [0.5, '#d8f2ff'],
      [1, '#8ec4e8'],
    ]), 4);
    ctx.strokeStyle = rgba('#4a6a8a', 0.6);
    ctx.lineWidth = 4 * s;
    for (const t of [0.35, 0.65]) {
      ctx.beginPath();
      ctx.moveTo(bx - 20 * s * (1 - t * 0.5), top + len * t);
      ctx.lineTo(bx + 20 * s * (1 - t * 0.5), top + len * t);
      ctx.stroke();
    }
  }
  // moustache over the beard
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y + 44 * s);
    ctx.bezierCurveTo(x + d * 60 * s, y + 30 * s, x + d * 130 * s, y + 50 * s, x + d * 160 * s, y + 120 * s);
    ctx.bezierCurveTo(x + d * 110 * s, y + 80 * s, x + d * 60 * s, y + 76 * s, x, y + 70 * s);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, y + 30 * s, 0, y + 120 * s, [
      [0, '#e8f8ff'],
      [1, '#9ccbea'],
    ]), 4);
  }
}

/** A giant's war axe, buried head-first in the snow, runes along the haft. */
function giantAxe(ctx: Ctx, x: number, y: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  roundRect(ctx, -14, -330, 28, 330, 10);
  fillOl(ctx, cylH(ctx, -14, 28, '#6a4a32'), 5);
  for (let k = 0; k < 4; k++) rune(ctx, k * 3 + 2, -8, -300 + k * 60, 26, '#7ff4ff', 0.8);
  ctx.beginPath();
  ctx.moveTo(10, -60);
  ctx.quadraticCurveTo(120, -110, 150, -10);
  ctx.quadraticCurveTo(110, 20, 10, 10);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, -110, 0, 20, [
    [0, '#c8d4e0'],
    [1, '#5a6878'],
  ]), 5);
  ctx.beginPath();
  ctx.moveTo(140, -40);
  ctx.quadraticCurveTo(156, -10, 140, 10);
  outline(ctx, 4, 'rgba(255,255,255,0.6)');
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(x + 30, y + 4, 90, 22, 0, Math.PI, 0);
  fillOl(ctx, '#eef4ff', 4);
}

function drawJotunheim(ctx: Ctx, r: R): void {
  // dusk sky: deep night blue down to a cold rose horizon
  vgrad(ctx, 0, 0, W, 620, [
    [0, '#0a0f2a'],
    [0.35, '#1a2e60'],
    [0.7, '#56649c'],
    [1, '#e0a8b4'],
  ]);
  glow(ctx, 960, 560, 900, '#ffb8c0', 0.18, 0.3);
  stars(ctx, r, 0, 100, W, 320, 260, 0.8);
  ctx.save();
  ctx.filter = 'blur(5px)';
  aurora(ctx, [[-50, 330], [420, 260], [900, 310], [1400, 240], [1980, 300]], ['#3dffb4', '#4ae0ff', '#9a7bff'], 240, 0.32, r);
  ctx.restore();
  // a heavy cloud ceiling: the light breaks through in gaps
  cloudBank(ctx, r, -100, W + 100, 70, 70, '#141c3c', '#3a4878', 3, true);
  // far peaks, then a nearer darker range
  range(ctx, 600, [
    [-40, 480], [150, 300], [330, 400], [560, 230], [800, 380], [1040, 220], [1260, 360], [1480, 260], [1700, 380], [1980, 290],
  ], lgrad(ctx, 0, 220, 0, 600, [
    [0, '#7a86bc'],
    [1, '#a8b2d8'],
  ]), '#f2f6ff', 0.3);
  fogBand(ctx, r, 470, 90, '#e0e8ff', 0.3, 18);
  range(ctx, 620, [
    [-40, 520], [120, 420], [300, 500], [480, 400], [700, 510], [900, 430], [1120, 520], [1340, 420], [1560, 500], [1780, 410], [1980, 500],
  ], lgrad(ctx, 0, 400, 0, 620, [
    [0, '#4a5a90'],
    [1, '#6a7ab0'],
  ]), '#dce8ff', 0.28, 4);
  // the glacier wall behind, its seracs jagged, with the frozen giant set into it
  iceMass(ctx, r, [[-20, 640], [260, 520], [380, 560], [520, 480], [640, 540], [780, 470], [930, 530], [1100, 430], [1200, 380], [1560, 360], [1700, 470], [1940, 450], [1940, 720], [-20, 720]], '#b8e2ff', '#2e5c98', 5);
  giantFace(ctx, r, JH.face.x, JH.face.y, 0.85);
  // towering ice cliffs framing the valley
  iceMass(ctx, r, [[-30, 60], [110, 30], [240, 150], [320, 330], [280, 520], [350, 720], [-30, 720]], '#c4ecff', '#1c4682', 6);
  iceMass(ctx, r, [[1950, 50], [1800, 20], [1670, 160], [1610, 360], [1660, 560], [1590, 720], [1950, 720]], '#c4ecff', '#1c4682', 6);
  icicles(ctx, r, 20, 290, 150, 70);
  icicles(ctx, r, 1650, 1910, 165, 80);
  // a ruined rune stone on each side of the valley
  for (const [x, y, k] of [[520, 420, 4], [1080, 470, 6]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(x - 46, y + 190);
    ctx.lineTo(x - 52, y + 30);
    ctx.quadraticCurveTo(x, y - 30, x + 52, y + 30);
    ctx.lineTo(x + 46, y + 190);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, x - 50, 0, x + 50, 0, [
      [0, '#3a4a62'],
      [0.4, '#6a7a96'],
      [1, '#222c40'],
    ]), 5);
    rune(ctx, k, x - 16, y + 50, 56, '#7ff4ff', 0.95);
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 48, 14, 0, Math.PI, 0);
    ctx.fillStyle = '#f4f8ff';
    ctx.fill();
  }
  // snowfield running up to the table, with wind-carved ridges and the cliffs' blue shadows
  ctx.beginPath();
  ctx.moveTo(-10, 650);
  ctx.bezierCurveTo(500, 610, 1300, 670, W + 10, 620);
  ctx.lineTo(W + 10, TY);
  ctx.lineTo(-10, TY);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, 610, 0, TY, [
    [0, '#c4d2ee'],
    [1, '#eef4ff'],
  ]), 4);
  ctx.save();
  ctx.clip();
  darkSpot(ctx, 160, 700, 360, 90, 0.35, '#3a5a9a');
  darkSpot(ctx, 1760, 700, 360, 90, 0.35, '#3a5a9a');
  ctx.strokeStyle = 'rgba(90,120,180,0.3)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 14; k++) {
    const y = 640 + k * 9;
    const x = r() * W;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 120, y - 8, x + 260 + r() * 200, y + 2);
    ctx.stroke();
  }
  ctx.restore();
  giantAxe(ctx, 760, 700, -0.35);
  // giant footprints in the snow
  for (const [x, y, s] of [[1000, 690, 0.8], [1210, 712, 1]] as [number, number, number][]) {
    ellipse(ctx, x, y, 70 * s, 16 * s);
    ctx.fillStyle = 'rgba(80,110,170,0.35)';
    ctx.fill();
    for (let t = 0; t < 4; t++) {
      ellipse(ctx, x - 50 * s + t * 26 * s, y - 20 * s, 12 * s, 5 * s);
      ctx.fill();
    }
  }
  snowfall(ctx, r, 0, 0, W, TY, 70, 0.4, 2);
  laneCalm(ctx, 0.18, 120, 620, '#081030');
  iceTable(ctx, r, '#7898ba', '#7ff4ff', 0.7);
  contactShadow(ctx, 0.35);
  tableLight(ctx, '#cfe8ff', 0.05, 0.35);
  vignette(ctx, 0.55, '#060c22', 0.45);
}

// ---------------------------------------------------------------------------------------------
// Bifröst Bridge

const BF = {
  asgard: { x: 1460, y: 330 },
  tower: { x: 250, y: 190 },
};

/** Asgard: golden halls with shield roofs on a floating crag, far away. */
function asgard(ctx: Ctx, x: number, y: number, s: number, burnt = 0): void {
  // the floating crag: a lit top, layered rocky underside, waterfalls spilling off its rim
  ctx.beginPath();
  ctx.moveTo(x - 330 * s, y + 60 * s);
  ctx.quadraticCurveTo(x, y + 36 * s, x + 330 * s, y + 60 * s);
  ctx.lineTo(x + 260 * s, y + 110 * s);
  ctx.lineTo(x + 200 * s, y + 190 * s);
  ctx.lineTo(x + 120 * s, y + 230 * s);
  ctx.lineTo(x + 40 * s, y + 340 * s);
  ctx.lineTo(x - 30 * s, y + 250 * s);
  ctx.lineTo(x - 120 * s, y + 220 * s);
  ctx.lineTo(x - 210 * s, y + 150 * s);
  ctx.lineTo(x - 280 * s, y + 120 * s);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, y + 40 * s, 0, y + 340 * s, [
    [0, burnt ? '#3a2a2a' : '#9a8aa0'],
    [0.3, burnt ? '#2a1a18' : '#6a5a7a'],
    [1, burnt ? '#100808' : '#2e2440'],
  ]), 4);
  ctx.save();
  ctx.clip();
  mottle(ctx, x - 340 * s, y, 680 * s, 360 * s, 0.35, 0.8);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 3;
  for (const k of [0.3, 0.55, 0.8]) {
    ctx.beginPath();
    ctx.moveTo(x - 330 * s * (1 - k * 0.6), y + (60 + k * 220) * s);
    ctx.lineTo(x + 300 * s * (1 - k * 0.6), y + (60 + k * 200) * s);
    ctx.stroke();
  }
  ctx.restore();
  // the crag's grassy, sunlit top
  ctx.beginPath();
  ctx.moveTo(x - 330 * s, y + 60 * s);
  ctx.quadraticCurveTo(x, y + 36 * s, x + 330 * s, y + 60 * s);
  ctx.lineTo(x + 330 * s, y + 72 * s);
  ctx.quadraticCurveTo(x, y + 52 * s, x - 330 * s, y + 74 * s);
  ctx.closePath();
  fillOl(ctx, burnt ? '#4a1a0a' : '#7ac860', 3);
  if (!burnt) {
    for (const wx of [-250, 210]) {
      ctx.fillStyle = lgrad(ctx, 0, y + 66 * s, 0, y + 330 * s, [
        [0, 'rgba(230,246,255,0.95)'],
        [1, 'rgba(230,246,255,0)'],
      ]);
      ctx.fillRect(x + wx * s, y + 66 * s, 16 * s, 260 * s);
    }
  }
// halls: gables with golden shield roofs, rising to a great hall
  const halls: [number, number, number][] = [[-230, 70, 70], [-140, 120, 90], [-30, 190, 120], [90, 150, 100], [200, 100, 80]];
  for (const [dx, h, w] of halls) {
    const bx = x + dx * s;
    const by = y + 60 * s;
    ctx.beginPath();
    ctx.rect(bx - (w / 2) * s, by - h * s * 0.55, w * s, h * s * 0.55);
    fillOl(ctx, burnt ? '#4a3020' : '#e8d8b8', 3);
    for (let k = 0; k < 3; k++) {
      roundRect(ctx, bx - (w / 2) * s + (k + 0.5) * (w / 3) * s - 4 * s, by - h * s * 0.42, 8 * s, 18 * s, 4 * s);
      ctx.fillStyle = burnt ? '#ff7a1a' : '#ffe9a0';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(bx - (w / 2 + 12) * s, by - h * s * 0.55);
    ctx.lineTo(bx, by - h * s);
    ctx.lineTo(bx + (w / 2 + 12) * s, by - h * s * 0.55);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, by - h * s, 0, by - h * s * 0.55, [
      [0, burnt ? '#6a3a1a' : '#fff0a0'],
      [1, burnt ? '#3a1a0a' : '#c8902a'],
    ]), 3);
    // shield shingles
    ctx.fillStyle = rgba(burnt ? '#ff9a3d' : '#a87020', 0.6);
    for (let k = 0; k < 4; k++) {
      ellipse(ctx, bx + (k - 1.5) * (w / 5) * s, by - h * s * 0.66, 5 * s, 5 * s);
      ctx.fill();
    }
    // a carved dragon-head finial
    ctx.beginPath();
    ctx.moveTo(bx, by - h * s);
    ctx.lineTo(bx + 10 * s, by - h * s - 16 * s);
    ctx.lineTo(bx + 18 * s, by - h * s - 10 * s);
    outline(ctx, 4 * s, burnt ? '#3a1a0a' : '#c8902a');
  }
  glow(ctx, x, y + 20 * s, 340 * s, burnt ? '#ff6a1a' : '#ffe08a', burnt ? 0.45 : 0.32);
}

/** Heimdall's watchtower with the Gjallarhorn hung under its roof. */
function watchtower(ctx: Ctx, x: number, y: number, burnt = 0): void {
  ctx.beginPath();
  ctx.moveTo(x - 70, 760);
  ctx.lineTo(x - 52, y + 120);
  ctx.lineTo(x + 52, y + 120);
  ctx.lineTo(x + 70, 760);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, x - 70, 140, burnt ? '#4a3a3a' : '#9a92a8'), 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  for (let yy = y + 150; yy < 760; yy += 34) {
    ctx.beginPath();
    ctx.moveTo(x - 64, yy);
    ctx.lineTo(x + 64, yy);
    ctx.stroke();
  }
  for (let k = 0; k < 3; k++) rune(ctx, k * 4 + 1, x - 12, y + 200 + k * 110, 40, burnt ? '#ff9a3d' : '#ffe08a', 0.85);
  // lookout with a glowing window
  ctx.beginPath();
  ctx.rect(x - 78, y + 40, 156, 84);
  fillOl(ctx, burnt ? '#3a2a2a' : '#7a7090', 5);
  roundRect(ctx, x - 24, y + 56, 48, 52, 22);
  fillOl(ctx, burnt ? '#ff8a2a' : '#ffe08a', 4);
  glow(ctx, x, y + 82, 120, burnt ? '#ff6a1a' : '#ffd060', 0.5);
  // roof
  ctx.beginPath();
  ctx.moveTo(x - 110, y + 44);
  ctx.lineTo(x, y - 70);
  ctx.lineTo(x + 110, y + 44);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, y - 70, 0, y + 44, [
    [0, burnt ? '#5a2a1a' : '#ffe08a'],
    [1, burnt ? '#2a1008' : '#b07820'],
  ]), 5);
  // the Gjallarhorn: a great curved horn bound in gold bands, slung from the eaves
  // a tapering tube along a curve, from the mouthpiece to a flared bell
  const at = (t: number): [number, number, number] => {
    const u = 1 - t;
    const px = u * u * (x + 96) + 2 * u * t * (x + 150) + t * t * (x + 250);
    const py = u * u * (y + 70) + 2 * u * t * (y + 190) + t * t * (y + 90);
    return [px, py, 5 + 26 * t * t];
  };
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 70, y + 44);
  ctx.lineTo(at(0.15)[0], at(0.15)[1]);
  ctx.moveTo(x + 70, y + 44);
  ctx.lineTo(at(0.75)[0], at(0.75)[1]);
  ctx.stroke();
  const tube = (grow: number) => {
    ctx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.02) {
      const [px, py, rr] = at(t);
      ctx.moveTo(px + rr + grow, py);
      ctx.arc(px, py, rr + grow, 0, Math.PI * 2);
    }
  };
  tube(4);
  ctx.fillStyle = OL;
  ctx.fill();
  tube(0);
  ctx.fillStyle = lgrad(ctx, 0, y + 60, 0, y + 200, [
    [0, '#fff6dc'],
    [1, '#c89a58'],
  ]);
  ctx.fill();
  // gold bands and the bell's mouth
  for (const t of [0.3, 0.55, 0.8]) {
    const [px, py, rr] = at(t);
    ellipse(ctx, px, py, rr * 0.35, rr + 2, 0.4);
    fillOl(ctx, '#e8b840', 3);
  }
  const [bx, by, br] = at(1);
  ellipse(ctx, bx, by, br * 0.5, br, 0.5);
  fillOl(ctx, '#5a3a1a', 4);
}

/** A point along the top edge of the rainbow bridge's arc (t = 0 at the left edge, 1 at Asgard). */
function arcPt(t: number): [number, number] {
  const u = 1 - t;
  const P = [[-60, 630], [500, 460], [1000, 260], [BF.asgard.x - 140, 394]];
  const x = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
  const y = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
  return [x, y];
}

/** The rainbow bridge arching away from the table towards Asgard. */
function bridgeArc(ctx: Ctx, burnt = 0): void {
  const bands = RAINBOW.length;
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    ctx.beginPath();
    ctx.moveTo(-60, 700 - t * 70);
    ctx.bezierCurveTo(500, 520 - t * 60, 1000, 300 - t * 40, BF.asgard.x - 140, 420 - t * 26);
    ctx.lineTo(BF.asgard.x - 140, 420 - (t + 1 / bands) * 26);
    ctx.bezierCurveTo(1000, 300 - (t + 1 / bands) * 40, 500, 520 - (t + 1 / bands) * 60, -60, 700 - (t + 1 / bands) * 70);
    ctx.closePath();
    const c = RAINBOW[bands - 1 - i];
    ctx.fillStyle = burnt ? mix(c, '#2a0e08', 0.85 * burnt) : rgba(c, 0.9);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-60, 700);
  ctx.bezierCurveTo(500, 520, 1000, 300, BF.asgard.x - 140, 420);
  ctx.moveTo(-60, 630);
  ctx.bezierCurveTo(500, 460, 1000, 260, BF.asgard.x - 140, 394);
  outline(ctx, 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.moveTo(-60, 672);
  ctx.bezierCurveTo(500, 498, 1000, 284, BF.asgard.x - 140, 410);
  outline(ctx, 6, rgba('#ffffff', burnt ? 0.1 : 0.35));
  ctx.restore();
}

function drawBifrost(ctx: Ctx, r: R): void {
  // high, bright sky over a sea of cloud
  vgrad(ctx, 0, 0, W, 640, [
    [0, '#163684'],
    [0.45, '#4a8ae0'],
    [0.8, '#a8d4ff'],
    [1, '#ffe8c0'],
  ]);
  glow(ctx, 1120, 140, 700, '#fff4d0', 0.4);
  // a pale ceiling of high cloud, broken
  cloudBank(ctx, r, -100, W + 100, 40, 60, '#e8f0ff', '#b4c8f0', 2, true);
  // far cloud tops, then the sea of cloud far below
  cloudBank(ctx, r, -100, W + 100, 520, 60, '#f8f4ff', '#c8d2f0', 2);
  cloudBank(ctx, r, -100, W + 100, 600, 90, '#ffffff', '#aebce4', 3);
  asgard(ctx, BF.asgard.x, BF.asgard.y, 1.15);
  bridgeArc(ctx);
  cloudBank(ctx, r, -100, W + 100, 690, 70, '#f4f0ff', '#98a8d8', 3);
  watchtower(ctx, BF.tower.x, BF.tower.y);
  // Odin's ravens circling far off
  ctx.strokeStyle = rgba(OL, 0.7);
  ctx.lineWidth = 3;
  for (const [bx, by] of [[880, 210], [930, 240]]) {
    ctx.beginPath();
    ctx.moveTo(bx - 16, by - 4);
    ctx.quadraticCurveTo(bx - 8, by - 12, bx, by);
    ctx.quadraticCurveTo(bx + 8, by - 12, bx + 16, by - 4);
    ctx.stroke();
  }
  laneCalm(ctx, 0.12, 120, 620, '#102050');
  // the bridge deck the table sits on: posts and a gold rail across the back
  for (let x = 0; x <= W; x += 240) {
    ctx.beginPath();
    ctx.rect(x - 12, 660, 24, TY - 660);
    fillOl(ctx, cylH(ctx, x - 12, 24, '#e0b040'), 4);
    ellipse(ctx, x, 656, 18, 18);
    fillOl(ctx, '#ffe08a', 4);
  }
  roundRect(ctx, -10, 676, W + 20, 18, 9);
  fillOl(ctx, lgrad(ctx, 0, 676, 0, 694, [
    [0, '#fff0a0'],
    [1, '#b88a2a'],
  ]), 4);
  rainbowTop(ctx, r, 0);
  contactShadow(ctx, 0.3);
  tableLight(ctx, '#fff0d0', 0.05, 0.3);
  vignette(ctx, 0.45, '#0a1440', 0.4);
}

// ---------------------------------------------------------------------------------------------
// Lyngvi Isle (Fenrir's Paw)

/** A dark pine silhouette with a moonlit edge. */
function darkPine(ctx: Ctx, x: number, base: number, h: number, col: string, rim: string): void {
  const tiers = 6;
  ctx.beginPath();
  ctx.moveTo(x, base - h);
  for (let i = 1; i <= tiers; i++) {
    const y = base - h + (h * 0.85 * i) / tiers;
    const w = (h * 0.32 * i) / tiers;
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.45, y - 4);
  }
  for (let i = tiers; i >= 1; i--) {
    const y = base - h + (h * 0.85 * i) / tiers;
    const w = (h * 0.32 * i) / tiers;
    ctx.lineTo(x - w * 0.45, y - 4);
    ctx.lineTo(x - w, y);
  }
  ctx.closePath();
  fillOl(ctx, col, 4);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = rgba(rim, 0.35);
  ctx.fillRect(x + 4, base - h, h * 0.4, h);
  ctx.restore();
  ctx.fillStyle = col;
  ctx.fillRect(x - 5, base - h * 0.15, 10, h * 0.15);
}

function drawLyngvi(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, 520, [
    [0, '#05081c'],
    [0.6, '#152450'],
    [1, '#3a4a80'],
  ]);
  stars(ctx, r, 0, 40, W, 420, 320, 0.9);
  moon(ctx, 1380, 190, 86, r, '#eef0ff');
  cloudStreak(ctx, r, 1250, 260, 420, 34, 'rgba(90,110,170,0.8)', 'rgba(40,50,100,0.6)');
  cloudStreak(ctx, r, 420, 160, 520, 30, 'rgba(70,90,150,0.7)', 'rgba(30,40,90,0.5)');
  // the lake, with the moon's road on it
  vgrad(ctx, 0, 500, W, TY - 500, [
    [0, '#1a2a58'],
    [1, '#060c24'],
  ]);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let y = 510; y < TY; y += 9) {
    const w = 30 + (y - 500) * 0.7;
    ctx.fillStyle = `rgba(200,220,255,${0.25 * (1 - (y - 500) / 300)})`;
    ctx.fillRect(1380 - w / 2 + (r() - 0.5) * 40, y, w * (0.4 + r() * 0.6), 3);
  }
  ctx.restore();
  // far shore: a ridge of dark pines
  range(ctx, 520, [[-40, 500], [200, 440], [420, 470], [700, 420], [1000, 480], [1300, 450], [1600, 470], [1980, 430]], '#0c1630');
  for (let x = 20; x < W; x += 26 + r() * 30) darkPine(ctx, x, 512 + r() * 10, 40 + r() * 40, '#0a1228', '#4a5a90');
  // ice floes drifting on the black water
  for (const [x, y, w] of [[240, 600, 120], [1600, 620, 160], [480, 680, 90], [1780, 700, 110]] as [number, number, number][]) {
    ellipse(ctx, x, y, w, w * 0.16);
    fillOl(ctx, lgrad(ctx, 0, y - 10, 0, y + 10, [
      [0, '#e8f2ff'],
      [1, '#8aa0c8'],
    ]), 3);
  }
  // the island, its pines, and the bound wolf's rock
  ctx.beginPath();
  ctx.moveTo(360, 640);
  ctx.quadraticCurveTo(820, 550, 1280, 640);
  ctx.closePath();
  fillOl(ctx, '#1a2238', 5);
  for (const [px, ph] of [[460, 110], [520, 150], [1160, 140], [1220, 100], [600, 90]] as [number, number][]) darkPine(ctx, px, 630, ph, '#0e162c', '#6a7ab8');
  ctx.beginPath();
  ctx.moveTo(660, 620);
  ctx.lineTo(690, 470);
  ctx.lineTo(740, 390);
  ctx.lineTo(800, 330);
  ctx.lineTo(880, 350);
  ctx.lineTo(950, 290);
  ctx.lineTo(1000, 360);
  ctx.lineTo(1040, 460);
  ctx.lineTo(1080, 620);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, 290, 0, 620, [
    [0, '#6a7490'],
    [1, '#1e2436'],
  ]), 6);
  ctx.save();
  ctx.clip();
  mottle(ctx, 640, 280, 460, 350, 0.4, 0.9);
  // moonlight on the right face
  ctx.beginPath();
  ctx.moveTo(950, 290);
  ctx.lineTo(1000, 360);
  ctx.lineTo(1040, 460);
  ctx.lineTo(1080, 620);
  ctx.lineTo(980, 620);
  ctx.closePath();
  ctx.fillStyle = 'rgba(190,210,255,0.18)';
  ctx.fill();
  ctx.restore();
  // the rock is carved with binding runes, glowing violet
  for (let i = 0; i < 4; i++) rune(ctx, i * 2 + 3, 760 + i * 60, 440 + (i % 2) * 20, 46, '#c8a0ff', 0.85);
  // Gleipnir, snapped: magic chains hanging off the rock, and a broken iron chain on the shore
  chainCurve(ctx, [[800, 340], [750, 470], [726, 600]], 26, '#b8a8e0', '#c8a0ff');
  chainCurve(ctx, [[960, 300], [1040, 430], [1110, 520]], 26, '#b8a8e0', '#c8a0ff');
  // great claw gouges down the rock
  ctx.strokeStyle = 'rgba(8,10,20,0.6)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(880 + k * 24, 380);
    ctx.lineTo(900 + k * 24, 470);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // foreground shore rocks framing the view
  for (const [pts, col] of [
    [[[-20, 560], [90, 520], [220, 600], [300, 700], [-20, 720]], '#141a2c'],
    [[[1940, 540], [1810, 510], [1700, 600], [1620, 720], [1940, 720]], '#141a2c'],
  ] as [[number, number][], string][]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, 510, 0, 720, [
      [0, '#3a4462'],
      [1, col],
    ]), 5);
    ctx.save();
    ctx.clip();
    mottle(ctx, pts[0][0] - 400, 480, 800, 260, 0.45, 0.6);
    darkSpot(ctx, pts[1][0], pts[1][1] + 10, 120, 30, 0.5, '#dfe8ff');
    ctx.restore();
  }
  darkPine(ctx, 90, 560, 300, '#0a1024', '#5a6aa8');
  darkPine(ctx, 1840, 540, 330, '#0a1024', '#5a6aa8');
  chainCurve(ctx, [[150, 730], [360, 708], [520, 736]], 28, '#8a8aa0');
  fogBand(ctx, r, 640, 110, '#a8b8e8', 0.18, 30);
  laneCalm(ctx, 0.15, 120, 620, '#000010');
  // a flat slab of island rock as the table
  stoneTop(ctx, r, FRONT, '#4e5a70', 0.7);
  stoneFront(ctx, r, FRONT, '#3a4458');
  // claw marks scored into the slab
  ctx.strokeStyle = 'rgba(10,12,24,0.55)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const cx of [260, 1660]) {
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * 26, 800);
      ctx.lineTo(cx + k * 26 + 50, 900);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
  runeRow(ctx, r, 40, W, FRONT + 8, 28, '#c8a0ff', 0.6);
  contactShadow(ctx, 0.45);
  tableLight(ctx, '#bcd0ff', 0.06, 0.5);
  vignette(ctx, 0.7, '#02040e', 0.5);
}

// ---------------------------------------------------------------------------------------------
// Thrym's Hall

const TH = {
  throne: { x: 960, y: 470 },
  columns: [180, 520, 1400, 1740],
  windows: [350, 1570],
};

function drawThrymHall(ctx: Ctx, r: R): void {
  // back wall: irregular blocks of glacier ice, darker up into the vault
  stoneBlocks(ctx, r, 0, 0, W, TY, ['#3a6a9e', '#4a80b4', '#2e5a8c', '#5a90c0'], '#16305a', 64, 8);
  vgrad(ctx, 0, 0, W, TY, [
    [0, 'rgba(4,10,30,0.7)'],
    [0.5, 'rgba(4,10,30,0.2)'],
    [1, 'rgba(180,230,255,0.15)'],
  ]);
  // vault ribs arching overhead
  ctx.strokeStyle = OL;
  ctx.lineWidth = 30;
  for (const [x0, x1] of [[-200, 960], [960, 2120]]) {
    ctx.beginPath();
    ctx.moveTo(x0, 80);
    ctx.quadraticCurveTo((x0 + x1) / 2, -120, x1, 80);
    ctx.stroke();
  }
  ctx.strokeStyle = '#a8d8f4';
  ctx.lineWidth = 20;
  for (const [x0, x1] of [[-200, 960], [960, 2120]]) {
    ctx.beginPath();
    ctx.moveTo(x0, 80);
    ctx.quadraticCurveTo((x0 + x1) / 2, -120, x1, 80);
    ctx.stroke();
  }
  // tall frosted windows with the aurora outside
  for (const wx of TH.windows) {
    const win = () => {
      ctx.beginPath();
      ctx.moveTo(wx - 90, 560);
      ctx.lineTo(wx - 90, 230);
      ctx.quadraticCurveTo(wx, 110, wx + 90, 230);
      ctx.lineTo(wx + 90, 560);
      ctx.closePath();
    };
    win();
    ctx.save();
    ctx.fillStyle = lgrad(ctx, 0, 140, 0, 560, [
      [0, '#08163a'],
      [1, '#1e4070'],
    ]);
    ctx.fill();
    ctx.clip();
    stars(ctx, r, wx - 90, 150, 180, 300, 30, 0.8);
    aurora(ctx, [[wx - 120, 360], [wx, 320], [wx + 120, 350]], ['#3dffb4', '#4ae0ff'], 160, 0.22, r);
    range(ctx, 560, [[wx - 100, 520], [wx - 40, 460], [wx + 20, 500], [wx + 100, 450]], '#0a1838', '#c8dcff', 0.3);
    ctx.restore();
    win();
    outline(ctx, 12, '#bfe6ff');
    outline(ctx, 4);
    ctx.strokeStyle = rgba('#bfe6ff', 0.8);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(wx, 170);
    ctx.lineTo(wx, 560);
    ctx.moveTo(wx - 90, 380);
    ctx.lineTo(wx + 90, 380);
    ctx.stroke();
    // frost creeping in from the corners of the glass
    darkSpot(ctx, wx - 80, 540, 90, 60, 0.6, '#e8f6ff');
    darkSpot(ctx, wx + 80, 540, 90, 60, 0.6, '#e8f6ff');
  }
  // the frost throne on its dais: a jagged crown of ice over a carved seat
  const { x, y } = TH.throne;
  glow(ctx, x, y - 80, 440, '#7ff4ff', 0.22);
  for (let k = 0; k < 3; k++) {
    roundRect(ctx, x - 260 + k * 40, y + 170 - k * 34, 520 - k * 80, 40, 6);
    fillOl(ctx, lgrad(ctx, 0, y + 130 - k * 34, 0, y + 210 - k * 34, [
      [0, '#cfeeff'],
      [1, '#5a90c8'],
    ]), 5);
  }
  iceMass(ctx, r, [[x - 190, y + 110], [x - 200, y - 40], [x - 160, y - 210], [x - 110, y - 90], [x - 60, y - 290], [x, y - 150], [x + 60, y - 290], [x + 110, y - 90], [x + 160, y - 210], [x + 200, y - 40], [x + 190, y + 110]], '#e8faff', '#4a88c8', 6);
  roundRect(ctx, x - 120, y - 80, 240, 120, 18);
  fillOl(ctx, lgrad(ctx, 0, y - 80, 0, y + 40, [
    [0, '#7ab0dc'],
    [1, '#2a5a94'],
  ]), 5);
  for (let i = 0; i < 4; i++) rune(ctx, i * 2 + 1, x - 86 + i * 48, y - 58, 40, '#7ff4ff', 0.9);
  // seat and armrests
  roundRect(ctx, x - 150, y + 40, 300, 50, 12);
  fillOl(ctx, lgrad(ctx, 0, y + 40, 0, y + 90, [
    [0, '#e0f6ff'],
    [1, '#6aa0d0'],
  ]), 5);
  for (const d of [-1, 1]) {
    roundRect(ctx, x + d * 170 - 30, y - 20, 60, 110, 14);
    fillOl(ctx, lgrad(ctx, 0, y - 20, 0, y + 90, [
      [0, '#d8f2ff'],
      [1, '#5a90c8'],
    ]), 5);
    ellipse(ctx, x + d * 170, y - 24, 36, 22);
    fillOl(ctx, '#eaf8ff', 4);
  }
  // frozen columns with icicle capitals
  for (const cx of TH.columns) {
    ctx.beginPath();
    ctx.rect(cx - 60, 80, 120, TY - 80);
    fillOl(ctx, cylH(ctx, cx - 60, 120, '#9ad0f0'), 6);
    ctx.save();
    ctx.clip();
    mottle(ctx, cx - 60, 80, 120, TY - 80, 0.3, 0.8);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 4;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(cx - 40 + k * 24, 80);
      ctx.lineTo(cx - 40 + k * 24 + (r() - 0.5) * 20, TY);
      ctx.stroke();
    }
    ctx.restore();
    roundRect(ctx, cx - 82, 60, 164, 40, 8);
    fillOl(ctx, '#e0f6ff', 5);
    icicles(ctx, r, cx - 76, cx + 76, 100, 70);
    roundRect(ctx, cx - 82, TY - 40, 164, 40, 8);
    fillOl(ctx, '#7ab0d8', 5);
  }
  // banners of the frost giants under the windows
  for (const bx of TH.windows) {
    ctx.beginPath();
    ctx.moveTo(bx - 60, 590);
    ctx.lineTo(bx + 60, 590);
    ctx.lineTo(bx + 60, 700);
    ctx.lineTo(bx, 730);
    ctx.lineTo(bx - 60, 700);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, 590, 0, 730, [
      [0, '#2a4a8a'],
      [1, '#16285a'],
    ]), 4);
    rune(ctx, bx === TH.windows[0] ? 4 : 5, bx - 18, 620, 60, '#dff4ff', 0.9);
  }
  // an icicle chandelier hanging over the hall
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(800, 0);
  ctx.lineTo(820, 30);
  ctx.moveTo(1120, 0);
  ctx.lineTo(1100, 30);
  ctx.stroke();
  roundRect(ctx, 760, 30, 400, 24, 12);
  fillOl(ctx, '#e0f6ff', 4);
  icicles(ctx, r, 770, 1150, 54, 90);
  glow(ctx, 960, 70, 300, '#bff0ff', 0.18);
  fogBand(ctx, r, 710, 80, '#e0f4ff', 0.3, 26);
  laneCalm(ctx, 0.2, 100, 620, '#04102a');
  iceTable(ctx, r, '#8cb4d8', '#7ff4ff', 0.8);
  contactShadow(ctx, 0.35);
  tableLight(ctx, '#d8f4ff', 0.06, 0.35);
  vignette(ctx, 0.6, '#020a1e', 0.5);
}

// ---------------------------------------------------------------------------------------------
// Edge of the World (Jörmungandr)

/** A loop of the world serpent breaking the waves: a thick scaly arch with a pale belly and spines. */
function serpentHump(ctx: Ctx, x: number, y: number, w: number, h: number, col: string): void {
  const t = h * 0.42; // body thickness
  const arch = () => {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.bezierCurveTo(x - w / 2, y - h * 1.3, x + w / 2, y - h * 1.3, x + w / 2, y);
    ctx.lineTo(x + w / 2 - t, y);
    ctx.bezierCurveTo(x + w / 2 - t, y - (h - t) * 1.25, x - w / 2 + t, y - (h - t) * 1.25, x - w / 2 + t, y);
    ctx.closePath();
  };
  arch();
  ctx.fillStyle = lgrad(ctx, 0, y - h, 0, y, [
    [0, shade(col, 0.25)],
    [1, shade(col, -0.5)],
  ]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // scales: little arcs in rows along the body
  ctx.strokeStyle = rgba(shade(col, -0.5), 0.6);
  ctx.lineWidth = 2;
  for (let yy = y - h * 1.1; yy < y; yy += 10)
    for (let xx = x - w / 2 + ((yy / 10) % 2) * 7; xx < x + w / 2; xx += 14) {
      ctx.beginPath();
      ctx.arc(xx, yy, 7, 0, Math.PI);
      ctx.stroke();
    }
  // pale belly on the inner curve
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + t, y);
  ctx.bezierCurveTo(x - w / 2 + t, y - (h - t) * 1.25, x + w / 2 - t, y - (h - t) * 1.25, x + w / 2 - t, y);
  ctx.lineWidth = t * 0.5;
  ctx.strokeStyle = rgba('#e8d8a0', 0.5);
  ctx.stroke();
  ctx.restore();
  arch();
  outline(ctx, 4);
  // dorsal spines along the crown
  for (let k = 1; k < 8; k++) {
    const u = k / 8;
    const bx = (1 - u) ** 3 * (x - w / 2) + 3 * (1 - u) ** 2 * u * (x - w / 2) + 3 * (1 - u) * u * u * (x + w / 2) + u ** 3 * (x + w / 2);
    const by = (1 - u) ** 3 * y + 3 * (1 - u) ** 2 * u * (y - h * 1.3) + 3 * (1 - u) * u * u * (y - h * 1.3) + u ** 3 * y;
    ctx.beginPath();
    ctx.moveTo(bx - 9, by + 2);
    ctx.lineTo(bx + (u - 0.5) * 14, by - 26);
    ctx.lineTo(bx + 9, by + 2);
    ctx.closePath();
    fillOl(ctx, '#e8d36a', 3);
  }
  // white water where it breaks the surface
  for (const ex of [x - w / 2 + t / 2, x + w / 2 - t / 2]) {
    ellipse(ctx, ex, y, t * 0.9, t * 0.25);
    ctx.fillStyle = 'rgba(230,244,255,0.85)';
    ctx.fill();
  }
}

/** A forked lightning bolt painted into the sky. */
function bolt(ctx: Ctx, r: R, x: number, y0: number, y1: number, col: string): void {
  const pts: [number, number][] = [[x, y0]];
  let px = x;
  for (let y = y0 + 30; y < y1; y += 30 + r() * 30) {
    px += (r() - 0.5) * 70;
    pts.push([px, y]);
  }
  for (const [lw, c] of [[12, rgba(col, 0.25)], [6, rgba(col, 0.7)], [2.5, '#ffffff']] as [number, string][]) {
    ctx.beginPath();
    pts.forEach(([bx, by], i) => (i ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by)));
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  glow(ctx, x, (y0 + y1) / 2, 200, col, 0.25);
}

function drawEdge(ctx: Ctx, r: R): void {
  // a rainbow-lit storm over the black sea
  vgrad(ctx, 0, 0, W, 560, [
    [0, '#07060e'],
    [0.5, '#1a1a32'],
    [1, '#3a3256'],
  ]);
  // Bifröst burning through the storm as a vast arc of light
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < RAINBOW.length; i++) {
    ctx.beginPath();
    ctx.arc(960, 980, 900 - i * 26, Math.PI, 0);
    ctx.lineWidth = 26;
    ctx.strokeStyle = rgba(RAINBOW[i], 0.3);
    ctx.stroke();
  }
  ctx.restore();
  cloudBank(ctx, r, -100, W + 100, 120, 90, '#2a2844', '#14141f', 3, true);

  bolt(ctx, r, 1500, 200, 470, '#d8b0ff');
  // the rim of the world: the sea pours over the edge into a starry void
  ctx.fillStyle = '#020208';
  ctx.fillRect(0, 466, W, 36);
  stars(ctx, r, 0, 466, W, 36, 90, 0.9);
  vgrad(ctx, 0, 498, W, TY - 498, [
    [0, '#0e1a28'],
    [1, '#1e3446'],
  ]);
  ctx.fillStyle = 'rgba(200,230,255,0.75)';
  ctx.fillRect(0, 496, W, 4);
  for (let x = 0; x < W; x += 24) darkSpot(ctx, x + r() * 20, 494, 36, 14, 0.45, '#cfe8ff');
  // the world serpent's coils breaking the far waves
  for (const [x, y, w, h] of [[300, 572, 300, 110], [680, 550, 190, 70], [1300, 560, 260, 96], [1680, 586, 360, 140]] as [number, number, number, number][]) serpentHump(ctx, x, y, w, h, '#2f6e56');
  // rolling waves, bigger and closer towards the ship, with white caps
  for (let row = 0; row < 6; row++) {
    const y = 600 + row * 30;
    const s = 0.6 + row * 0.22;
    ctx.beginPath();
    ctx.moveTo(-40, y + 40);
    for (let x = -40 - r() * 80; x < W + 80; x += 90 * s) ctx.quadraticCurveTo(x + 30 * s, y - (14 + r() * 14) * s, x + 90 * s, y);
    ctx.lineTo(W + 80, y + 40);
    ctx.closePath();
    ctx.fillStyle = lgrad(ctx, 0, y - 20 * s, 0, y + 40, [
      [0, shade('#2a4a62', row * 0.04)],
      [1, '#0e1c2a'],
    ]);
    ctx.fill();
    outline(ctx, 2 + row * 0.5, rgba('#bfe0f4', 0.35 + row * 0.07));
  }
  fogBand(ctx, r, 620, 90, '#9ab0c8', 0.2, 24);
  laneCalm(ctx, 0.16, 100, 620, '#000000');
  // a longship deck as the table, shields along its rail
  planksTop(ctx, r, FRONT, 0.32, '#7a5232', 0.3, 8);
  woodLip(ctx, r, FRONT, '#5a3a20');
  for (let x = 70; x < W; x += 150) {
    const c = ['#c8342a', '#e8c04a', '#2a5ac8', '#f4f0e0'][Math.floor(x / 150) % 4];
    ellipse(ctx, x, FRONT + 22, 46, 18);
    fillOl(ctx, c, 4);
    ellipse(ctx, x, FRONT + 22, 12, 6);
    fillOl(ctx, '#b8bcc8', 3);
  }
  // the prow's dragon head curling up at the left, the stern at the right
  for (const d of [-1, 1]) {
    const bx = d < 0 ? 40 : W - 40;
    ctx.beginPath();
    ctx.moveTo(bx, TY + 30);
    ctx.quadraticCurveTo(bx - d * 10, 520, bx + d * 70, 470);
    ctx.quadraticCurveTo(bx + d * 120, 450, bx + d * 110, 500);
    ctx.quadraticCurveTo(bx + d * 60, 490, bx + d * 40, 560);
    ctx.lineTo(bx + d * 50, TY + 30);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, 450, 0, TY, [
      [0, '#9a6a3a'],
      [1, '#4a2a14'],
    ]), 5);
  }
  contactShadow(ctx, 0.45);
  tableLight(ctx, '#b8d8e8', 0.05, 0.45);
  vignette(ctx, 0.7, '#000006', 0.5);
}

// ---------------------------------------------------------------------------------------------
// The Burning Bridge (Surtr)

function drawBurningBridge(ctx: Ctx, r: R): void {
  // Muspelheim's fire sky, smoke rolling over it
  vgrad(ctx, 0, 0, W, 640, [
    [0, '#160303'],
    [0.4, '#560c06'],
    [0.75, '#c8380e'],
    [1, '#ffa040'],
  ]);
  cloudBank(ctx, r, -100, W + 100, 90, 80, '#1a0606', '#4a140a', 3, true);
  // black volcanic peaks with lava rivers
  range(ctx, 620, [[-40, 520], [180, 330], [360, 470], [560, 260], [760, 420], [980, 300], [1180, 450], [1400, 280], [1620, 440], [1800, 330], [1980, 480]], lgrad(ctx, 0, 260, 0, 620, [
    [0, '#2a0e0a'],
    [1, '#120606'],
  ]), undefined, 0, 4);
  for (const [x0, y0] of [[560, 270], [1400, 290], [180, 340], [1800, 340]]) {
    glow(ctx, x0, y0, 200, '#ff5a1a', 0.55);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 - 30, y0 + 100, x0 + 40, y0 + 200, x0 - 10, 620);
    outline(ctx, 9, '#7a1a08');
    outline(ctx, 4, '#ffb040');
    fire(ctx, r, x0, y0 + 6, 60, 90, 0.9);
  }
  // a sea of fire below the bridge
  vgrad(ctx, 0, 560, W, TY - 560, [
    [0, '#ff8a2a'],
    [0.4, '#c8300a'],
    [1, '#3a0804'],
  ]);
  for (let i = 0; i < 26; i++) fire(ctx, r, r() * W, 600 + r() * 60, 60 + r() * 60, 60 + r() * 70, 0.75);
  // burning Asgard far off
  asgard(ctx, 1460, 330, 0.9, 1);
  for (let i = 0; i < 6; i++) fire(ctx, r, 1250 + r() * 420, 380 + r() * 20, 50, 110, 0.9);
  // the charred rainbow arching away, on fire along its length
  bridgeArc(ctx, 0.7);
  for (let t = 0.08; t < 0.95; t += 0.11) {
    const [x, y] = arcPt(t);
    fire(ctx, r, x, y + 6, 80, 120 + r() * 70, 0.85);
  }
  for (let i = 0; i < 14; i++) darkSpot(ctx, r() * W, 120 + r() * 260, 200 + r() * 200, 60 + r() * 40, 0.22, '#0a0202');
  laneCalm(ctx, 0.18, 100, 620, '#100000');
  // the bridge deck's rail, blackened and glowing at the joints
  for (let x = 0; x <= W; x += 240) {
    ctx.beginPath();
    ctx.rect(x - 12, 660, 24, TY - 660);
    fillOl(ctx, cylH(ctx, x - 12, 24, '#4a3018'), 4);
    glow(ctx, x, 690, 40, '#ff6a1a', 0.4);
  }
  roundRect(ctx, -10, 676, W + 20, 18, 9);
  fillOl(ctx, lgrad(ctx, 0, 676, 0, 694, [
    [0, '#8a5a1a'],
    [1, '#3a2008'],
  ]), 4);
  rainbowTop(ctx, r, 0.7);
  // glowing cracks in the charred deck, kept to the edges so the pizzas' places stay calm
  ctx.save();
  clipRect(ctx, 0, TY, W, FRONT - TY);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    let X = side * (1.4 + r() * 0.7);
    let z = ZB - r() * 0.3;
    ctx.beginPath();
    ctx.moveTo(xAt(X, z), yAt(z));
    for (let k = 0; k < 5; k++) {
      X += (r() - 0.5) * 0.18;
      z -= 0.1 + r() * 0.12;
      ctx.lineTo(xAt(X, z), yAt(z));
    }
    outline(ctx, 7, 'rgba(255,90,20,0.35)');
    outline(ctx, 2.5, 'rgba(255,200,90,0.8)');
  }
  ctx.restore();
  contactShadow(ctx, 0.4);
  tableLight(ctx, '#ffb070', 0.08, 0.4);
  vignette(ctx, 0.6, '#120202', 0.5);
}

void FOC;
void grade;
void blob;

// ---------------------------------------------------------------------------------------------

// (redrawn with the location kit in scene-jotunheim.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('jotunheim', {
  info: {
    name: 'Jotunheim Ice Fields',
    subtitle: 'Waves 71–74',
    ambient: [],
    glows: [...JH.runes.map(([x, y]) => g(x, y, 120, '#7ff4ff', 0.4)), g(JH.face.x, JH.face.y - 120, 260, '#7ff4ff', 0.2)],
    light: '#cfe0ff',
    tableTint: '#eef6ff',
  },
  draw: drawJotunheim,
});

// (redrawn with the location kit in scene-bifrost.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('bifrost', {
  info: {
    name: 'Bifröst Bridge',
    subtitle: 'Waves 76–79',
    ambient: ['sparkle'],
    glows: [g(BF.asgard.x, BF.asgard.y + 20, 300, '#ffe08a', 0.2), g(BF.tower.x, BF.tower.y + 82, 120, '#ffd060', 0.4)],
    light: '#fff2dc',
    tableTint: '#fff8f0',
  },
  draw: drawBifrost,
});

// (redrawn with the location kit in scene-fenrir.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('fenrir', {
  info: {
    name: 'Lyngvi Isle',
    subtitle: "Mini-boss: FENRIR'S PAW",
    ambient: ['fog'],
    glows: [g(1380, 200, 300, '#cfe0ff', 0.05), g(850, 440, 220, '#c8a0ff', 0.5)],
    light: '#a8b8f0',
    tableTint: '#e0e6ff',
  },
  draw: drawLyngvi,
});

// (redrawn with the location kit in scene-thrym.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('thrym', {
  info: {
    name: "Thrym's Hall",
    subtitle: 'Boss: THRYM THE FROST KING',
    ambient: ['snow'],
    glows: [g(TH.throne.x, TH.throne.y - 60, 360, '#7ff4ff', 0.3), ...TH.windows.map((x) => g(x, 340, 160, '#4affc8', 0.4))],
    light: '#c8e8ff',
    tableTint: '#eef8ff',
  },
  draw: drawThrymHall,
});

// (redrawn with the location kit in scene-jormungandr.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('jormungandr', {
  info: {
    name: 'Edge of the World',
    subtitle: 'Mini-boss: JÖRMUNGANDR',
    ambient: ['fog'],
    glows: [g(960, 480, 600, '#b06bff', 0.3)],
    light: '#a8c0d8',
    tableTint: '#e0ecf4',
  },
  draw: drawEdge,
});

// (redrawn with the location kit in scene-surtr.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('surtr', {
  info: {
    name: 'The Burning Bridge',
    subtitle: 'Boss: SURTR THE FIRE GIANT',
    ambient: ['embers'],
    glows: [g(560, 270, 220, '#ff5a1a', 0.6), g(1400, 290, 220, '#ff5a1a', 0.6), g(1460, 360, 320, '#ff7a1a', 0.5)],
    light: '#ffa070',
    tableTint: '#ffe4d0',
  },
  draw: drawBurningBridge,
});
