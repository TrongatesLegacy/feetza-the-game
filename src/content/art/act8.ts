// Art kinds for Act 8 · Norse (data in src/content/feet/act8.ts): the Frost Giant, Draugr, Troll and
// Valkyrie feet, and the bosses Fenrir's Paw, Thrym, Jörmungandr and Surtr. Same design frame as
// kinds-bosses.ts: centre x = CX (110), the ankle opens at y = -6, the leg comes from FootArt.leg and
// the canvas spans x -40..260, y -8..337. These lean towards the new style: one outer silhouette
// drawn once, details painted inside it (clipped), light from the top left, one outline weight.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, outlineOf, skinBodyFill } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, mix, rgba, shade } from '../../art/util';

type P = [number, number];

// ——— Shared helpers ———

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function vgrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

/** Side-to-side body shading: dark rim on the right, lit on the left (top-left key light). */
function bodyFill(ctx: Ctx, col: string, x0 = 6, x1 = 216): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, -0.25));
  g.addColorStop(0.22, shade(col, 0.12));
  g.addColorStop(0.42, shade(col, 0.2));
  g.addColorStop(0.7, col);
  g.addColorStop(1, shade(col, -0.42));
  return g;
}

/** Soft key light from the top left, and occlusion at the bottom, inside the current clip. */
function lightInside(ctx: Ctx, top = -6, bottom = 300, a = 0.3): void {
  const hl = ctx.createRadialGradient(80, 50, 4, 90, 70, 130);
  hl.addColorStop(0, rgba('#ffffff', a));
  hl.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = hl;
  ctx.fillRect(-40, top, 300, bottom - top);
  ctx.fillStyle = vgrad(ctx, bottom - 70, bottom, [[0, rgba('#000000', 0)], [1, rgba('#000000', 0.28)]]);
  ctx.fillRect(-40, bottom - 70, 300, 70);
}

function poly(ctx: Ctx, pts: P[], close = true): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

/** A glowing stroke (runes, lava, grave-fire): a wide soft halo, then a bright core. */
function glowStroke(ctx: Ctx, col: string, core: string, lw: number, blur = 12): void {
  ctx.save();
  ctx.shadowColor = col;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = col;
  ctx.lineWidth = lw + 3;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = core;
  ctx.lineWidth = Math.max(1.5, lw * 0.45);
  ctx.stroke();
  ctx.restore();
}

/** A rune glyph (a few strokes) centred at x, y, size s. */
const RUNES: P[][][] = [
  // fehu
  [[[0, -1], [0, 1]], [[0, -0.2], [0.55, -0.75]], [[0, 0.25], [0.55, -0.3]]],
  // thurisaz
  [[[0, -1], [0, 1]], [[0, -0.5], [0.5, 0], [0, 0.5]]],
  // ansuz
  [[[0, -1], [0, 1]], [[0, -0.75], [0.5, -0.3]], [[0, -0.25], [0.5, 0.2]]],
  // kenaz
  [[[0.45, -0.7], [-0.25, 0], [0.45, 0.7]]],
  // isa
  [[[0, -1], [0, 1]]],
  // algiz
  [[[0, -1], [0, 1]], [[-0.55, -0.6], [0, -0.05], [0.55, -0.6]]],
  // tiwaz
  [[[0, -1], [0, 1]], [[-0.5, -0.45], [0, -1], [0.5, -0.45]]],
  // sowilo
  [[[0.35, -1], [-0.3, -0.25], [0.3, 0.25], [-0.35, 1]]],
];

function rune(ctx: Ctx, i: number, x: number, y: number, s: number): void {
  ctx.beginPath();
  for (const seg of RUNES[i % RUNES.length]) {
    seg.forEach(([px, py], k) => (k ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)));
  }
}

/** Little frost crystals and rime speckle. */
function rime(ctx: Ctx, r: () => number, x: number, y: number, w: number, h: number, n: number, a = 0.8): void {
  for (let i = 0; i < n; i++) {
    const px = x + r() * w;
    const py = y + r() * h;
    const s = 1.5 + r() * 3.5;
    ctx.fillStyle = rgba('#ffffff', a * (0.4 + r() * 0.6));
    ctx.beginPath();
    ctx.arc(px, py, s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function snowflake(ctx: Ctx, x: number, y: number, s: number, col = '#ffffff', lw = 2.5): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -s);
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(-s * 0.28, -s * 0.85);
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(s * 0.28, -s * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

/** A hanging icicle from (x, y) down `len`. */
function icicle(ctx: Ctx, x: number, y: number, w: number, len: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.4, y + len * 0.6, x + w * 0.1, y + len);
  ctx.quadraticCurveTo(x + w * 0.5, y + len * 0.5, x + w, y);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, y, y + len, [[0, '#f4fbff'], [0.5, '#bfe6ff'], [1, '#7fc4f0']]);
  ctx.fill();
  ink(ctx, 3, '#3d6a8a');
  ctx.beginPath();
  ctx.moveTo(x - w * 0.45, y + 3);
  ctx.lineTo(x - w * 0.1, y + len * 0.6);
  ctx.strokeStyle = rgba('#ffffff', 0.85);
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ——— Bare-foot silhouettes (giant, troll) ———

/** A broad, big-boned bare foot: one outline round body and toes, so toes are painted inside it. */
function bigFootPath(ctx: Ctx, wide: number, toes: { cx: number; cy: number; rx: number; ry: number }[]): void {
  ctx.beginPath();
  ctx.moveTo(52, -6);
  ctx.bezierCurveTo(50, 50, 12 - wide, 96, 10 - wide, 160);
  // round the toes, left to right, along their lower edges
  const first = toes[0];
  ctx.bezierCurveTo(8 - wide, 186, first.cx - first.rx - 4, first.cy - 6, first.cx - first.rx, first.cy + 4);
  for (const t of toes) {
    ctx.ellipse(t.cx, t.cy, t.rx, t.ry, 0, Math.PI, 0, true);
  }
  const last = toes[toes.length - 1];
  ctx.bezierCurveTo(last.cx + last.rx + 4, last.cy - 20, 214 + wide, 190, 212 + wide, 156);
  ctx.bezierCurveTo(208 + wide, 96, 170, 52, 168, -6);
  ctx.closePath();
}

// ——— FROST GIANT TOES: huge blue-grey bare toes, rimed in hoarfrost, icicles off the nails ———

const GIANT_TOES = [
  { cx: 30, cy: 204, rx: 25, ry: 29 },
  { cx: 74, cy: 219, rx: 27, ry: 33 },
  { cx: 120, cy: 226, rx: 28, ry: 35 },
  { cx: 166, cy: 225, rx: 29, ry: 36 },
  { cx: 212, cy: 214, rx: 32, ry: 39 },
];

function drawFrostGiant(ctx: Ctx, art: FootArt, r: () => number): void {
  // a deeper, stonier blue-grey than the data colour, so the frost on it reads
  const skin = mix(shade(art.skin, -0.22), '#6a7f94', 0.3);
  const ol = outlineOf(skin);
  // icicles first, so they hang out from under the toes
  for (const t of GIANT_TOES) icicle(ctx, t.cx + 2, t.cy + t.ry * 0.7, 6 + t.rx * 0.16, 16 + t.rx * 0.55);
  bigFootPath(ctx, 8, GIANT_TOES);
  ctx.fillStyle = skinBodyFill(ctx, skin);
  ctx.fill();
  ctx.save();
  bigFootPath(ctx, 8, GIANT_TOES);
  ctx.clip();
  lightInside(ctx, -6, 270, 0.32);
  // knobbly ankle bones and big knuckles
  for (const [x, y, rx, ry] of [[40, 60, 18, 26], [178, 64, 16, 24]] as const) {
    ellipse(ctx, x, y, rx, ry);
    ctx.fillStyle = rgba(shade(skin, 0.25), 0.45);
    ctx.fill();
  }
  // tendons
  ctx.strokeStyle = rgba(shade(skin, 0.3), 0.55);
  ctx.lineWidth = 5;
  for (const [x0, x1] of [[92, 72], [110, 112], [128, 152], [142, 192]]) {
    ctx.beginPath();
    ctx.moveTo(x0, 30);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 4, 120, x1, 178);
    ctx.stroke();
  }
  // hoarfrost: a frosted crust over the top and the sides (patchy, painted inside the silhouette)
  ctx.fillStyle = rgba('#f2fbff', 0.4);
  for (let i = 0; i < 9; i++) {
    const x = r() < 0.5 ? 10 + r() * 50 : 160 + r() * 60;
    const y = 10 + r() * 170;
    ellipse(ctx, x, y, 10 + r() * 16, 6 + r() * 10, r() * 3);
    ctx.fill();
  }
  rime(ctx, r, 0, 0, 230, 200, 34, 0.85);
  snowflake(ctx, 70, 120, 13, rgba('#ffffff', 0.75), 2.5);
  snowflake(ctx, 158, 40, 10, rgba('#ffffff', 0.6), 2);
  // toe creases (each toe is part of the one silhouette)
  for (const t of GIANT_TOES) {
    ctx.beginPath();
    ctx.ellipse(t.cx, t.cy, t.rx, t.ry, 0, Math.PI * 1.05, Math.PI * 1.95);
    ink(ctx, 3.2, rgba(ol, 0.7));
    // per-toe shading: lit top-left
    const g = ctx.createRadialGradient(t.cx - t.rx * 0.4, t.cy - t.ry * 0.4, 2, t.cx, t.cy, t.ry * 1.1);
    g.addColorStop(0, rgba('#ffffff', 0.28));
    g.addColorStop(1, rgba('#000000', 0.08));
    ellipse(ctx, t.cx, t.cy, t.rx - 2, t.ry - 2);
    ctx.fillStyle = g;
    ctx.fill();
    // frosted nail
    // a thick, ridged, frost-blue nail (flat-topped, so it never reads as an eye)
    ctx.beginPath();
    ctx.moveTo(t.cx - t.rx * 0.48, t.cy + t.ry * 0.05);
    ctx.lineTo(t.cx + t.rx * 0.52, t.cy + t.ry * 0.05);
    ctx.quadraticCurveTo(t.cx + t.rx * 0.56, t.cy + t.ry * 0.7, t.cx + 2, t.cy + t.ry * 0.74);
    ctx.quadraticCurveTo(t.cx - t.rx * 0.52, t.cy + t.ry * 0.7, t.cx - t.rx * 0.48, t.cy + t.ry * 0.05);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, t.cy, t.cy + t.ry * 0.75, [[0, '#d8eefa'], [1, '#7fb0d0']]);
    ctx.fill();
    ink(ctx, 2.4, '#2e5a7a');
    ctx.beginPath();
    ctx.moveTo(t.cx - t.rx * 0.25, t.cy + t.ry * 0.15);
    ctx.lineTo(t.cx - t.rx * 0.25, t.cy + t.ry * 0.55);
    ctx.strokeStyle = rgba('#ffffff', 0.85);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // knuckle hair rimed white
    ctx.strokeStyle = rgba('#ffffff', 0.85);
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const hx = t.cx - 8 + k * 8;
      ctx.beginPath();
      ctx.moveTo(hx, t.cy - t.ry * 0.55);
      ctx.lineTo(hx + 3, t.cy - t.ry * 0.85);
      ctx.stroke();
    }
  }
  ctx.restore();
  bigFootPath(ctx, 8, GIANT_TOES);
  ink(ctx, OUT + 0.5, ol);
  // a cold sheen top-left
  ellipse(ctx, 62, 80, 14, 40, 0.25);
  ctx.fillStyle = rgba('#ffffff', 0.35);
  ctx.fill();
}

// ——— TROLL FEET: warty, mossy, long dirty nails, hairy knuckles, a toadstool ———

const TROLL_TOES = [
  { cx: 38, cy: 208, rx: 20, ry: 24 },
  { cx: 75, cy: 220, rx: 21, ry: 27 },
  { cx: 113, cy: 226, rx: 22, ry: 28 },
  { cx: 151, cy: 226, rx: 23, ry: 29 },
  { cx: 192, cy: 218, rx: 27, ry: 32 },
];

function drawTroll(ctx: Ctx, art: FootArt, r: () => number): void {
  const skin = art.skin;
  const ol = outlineOf(skin);
  const moss = art.primary ?? '#6b7a45';
  // long dirty nails hang over the toe ends (drawn behind the silhouette, so only the tips show)
  for (const t of TROLL_TOES) {
    ctx.beginPath();
    ctx.moveTo(t.cx - t.rx * 0.55, t.cy + t.ry * 0.4);
    ctx.quadraticCurveTo(t.cx - 4, t.cy + t.ry * 1.7, t.cx + t.rx * 0.25, t.cy + t.ry * 1.45);
    ctx.quadraticCurveTo(t.cx + t.rx * 0.7, t.cy + t.ry * 0.9, t.cx + t.rx * 0.55, t.cy + t.ry * 0.4);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, t.cy, t.cy + t.ry * 1.6, [[0, '#d8cb98'], [0.6, '#a08a52'], [1, '#5a4a2a']]);
    ctx.fill();
    ink(ctx, 3.5, '#3c3020');
  }
  bigFootPath(ctx, 4, TROLL_TOES);
  ctx.fillStyle = skinBodyFill(ctx, skin);
  ctx.fill();
  ctx.save();
  bigFootPath(ctx, 4, TROLL_TOES);
  ctx.clip();
  lightInside(ctx, -6, 262, 0.24);
  // mottled hide
  for (let i = 0; i < 22; i++) {
    ellipse(ctx, r() * 230, r() * 230, 8 + r() * 18, 6 + r() * 12, r() * 3);
    ctx.fillStyle = rgba(r() < 0.5 ? shade(skin, -0.25) : shade(skin, 0.15), 0.35);
    ctx.fill();
  }
  // warts: a bump with a highlight
  for (let i = 0; i < 14; i++) {
    const x = 20 + r() * 190;
    const y = 10 + r() * 170;
    const s = 4 + r() * 6;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fillStyle = shade(skin, -0.12);
    ctx.fill();
    ink(ctx, 2, rgba(ol, 0.8));
    ctx.beginPath();
    ctx.arc(x - s * 0.35, y - s * 0.35, s * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#ffffff', 0.45);
    ctx.fill();
  }
  // moss over the top of the foot
  ctx.beginPath();
  ctx.moveTo(30, -10);
  for (let x = 30; x <= 196; x += 12) ctx.lineTo(x, 40 + Math.sin(x * 0.12) * 10 + r() * 14);
  ctx.lineTo(196, -10);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -10, 60, [[0, shade(moss, -0.2)], [1, shade(moss, 0.15)]]);
  ctx.fill();
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rgba(r() < 0.5 ? '#a8c060' : '#3c4a24', 0.7);
    ctx.beginPath();
    ctx.arc(34 + r() * 160, r() * 50, 2 + r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // toe creases and knuckle hair
  for (const t of TROLL_TOES) {
    ctx.beginPath();
    ctx.ellipse(t.cx, t.cy, t.rx, t.ry, 0, Math.PI * 1.05, Math.PI * 1.95);
    ink(ctx, 3, rgba(ol, 0.75));
    ctx.strokeStyle = '#2e2418';
    ctx.lineWidth = 2.2;
    for (let k = 0; k < 4; k++) {
      const hx = t.cx - 10 + k * 7;
      ctx.beginPath();
      ctx.moveTo(hx, t.cy - t.ry * 0.5);
      ctx.quadraticCurveTo(hx + 4, t.cy - t.ry * 0.8, hx + 1, t.cy - t.ry * 1.05);
      ctx.stroke();
    }
    // grubby nail bed
    ellipse(ctx, t.cx + 2, t.cy + t.ry * 0.3, t.rx * 0.52, t.ry * 0.38);
    ctx.fillStyle = '#c9b47a';
    ctx.fill();
    ink(ctx, 2, '#5a4a2a');
    ctx.fillStyle = rgba('#3c3020', 0.5);
    ctx.fillRect(t.cx - t.rx * 0.4, t.cy + t.ry * 0.5, t.rx * 0.9, 3);
  }
  ctx.restore();
  bigFootPath(ctx, 4, TROLL_TOES);
  ink(ctx, OUT, ol);
  // moss tufts spill over the outline on the left
  for (const [x, y] of [[14, 120], [8, 150], [214, 110]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = moss;
    ctx.fill();
    ink(ctx, 3, shade(moss, -0.5));
  }
  // a little toadstool growing out of the top
  const mx = 160;
  const my = 36;
  ctx.beginPath();
  ctx.moveTo(mx - 6, my + 26);
  ctx.lineTo(mx - 5, my);
  ctx.lineTo(mx + 5, my);
  ctx.lineTo(mx + 6, my + 26);
  ctx.closePath();
  ctx.fillStyle = '#f4ead0';
  ctx.fill();
  ink(ctx, 3);
  ctx.beginPath();
  ctx.ellipse(mx, my, 22, 15, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, my - 15, my, [[0, '#ff5a4a'], [1, '#b8281e']]);
  ctx.fill();
  ink(ctx, 3.5);
  ctx.fillStyle = '#fff6e2';
  for (const [dx, dy, s] of [[-9, -7, 3.5], [5, -10, 3], [12, -4, 2.5]] as const) {
    ctx.beginPath();
    ctx.arc(mx + dx, my + dy, s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ——— DRAUGR BOOTS: rusty iron-shod grave boots bound in grave cloth, grave-fire in the eyelets ———

function draugrPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(48, -6);
  ctx.bezierCurveTo(46, 60, 14, 100, 12, 170);
  ctx.bezierCurveTo(10, 222, 40, 256, 110, 258);
  ctx.bezierCurveTo(180, 256, 210, 222, 208, 170);
  ctx.bezierCurveTo(206, 100, 174, 60, 172, -6);
  ctx.closePath();
}

function drawDraugr(ctx: Ctx, art: FootArt, r: () => number): void {
  const leather = art.primary ?? '#4a4f4c';
  const fire = art.secondary ?? '#7fe8ff';
  draugrPath(ctx);
  ctx.fillStyle = bodyFill(ctx, leather);
  ctx.fill();
  ctx.save();
  draugrPath(ctx);
  ctx.clip();
  // rot and mould on the leather
  for (let i = 0; i < 16; i++) {
    ellipse(ctx, r() * 220, r() * 250, 6 + r() * 14, 4 + r() * 10, r() * 3);
    ctx.fillStyle = rgba(r() < 0.5 ? '#2a302c' : '#6a7a5a', 0.4);
    ctx.fill();
  }
  // rusty iron toe cap
  ctx.beginPath();
  ctx.moveTo(-10, 172);
  ctx.quadraticCurveTo(CX, 140, 230, 172);
  ctx.lineTo(230, 270);
  ctx.lineTo(-10, 270);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 150, 262, [[0, '#9a6a44'], [0.35, '#7a4a2c'], [1, '#3a2418']]);
  ctx.fill();
  ink(ctx, 4.5);
  // rust bloom and rivets
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = rgba(r() < 0.5 ? '#c8783a' : '#5a3020', 0.55);
    ctx.beginPath();
    ctx.arc(20 + r() * 180, 175 + r() * 70, 2 + r() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 7; i++) {
    const x = 30 + i * 27;
    const y = 176 - Math.sin((i / 6) * Math.PI) * 18 + 10;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#b8b0a0';
    ctx.fill();
    ink(ctx, 2);
  }
  ctx.fillStyle = rgba('#ffffff', 0.3);
  ellipse(ctx, 70, 196, 30, 8, -0.15);
  ctx.fill();
  // grave cloth wraps diagonally across the shaft
  const cloth = '#b8ae94';
  for (const [y, tilt] of [[26, 18], [70, -14], [118, 20]] as const) {
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(230, y + tilt);
    ctx.lineTo(230, y + tilt + 24);
    ctx.lineTo(-10, y + 24);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, y, y + 24, [[0, shade(cloth, 0.12)], [1, shade(cloth, -0.18)]]);
    ctx.fill();
    ink(ctx, 3.5, '#4a4230');
    ctx.strokeStyle = rgba('#4a4230', 0.45);
    ctx.lineWidth = 1.5;
    for (let x = 0; x < 220; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x, y + 4 + (tilt * x) / 240);
      ctx.lineTo(x + 3, y + 20 + (tilt * x) / 240);
      ctx.stroke();
    }
  }
  // grave-fire glowing through the eyelets
  for (const [x, y] of [[62, 54], [158, 50], [58, 102], [162, 98], [70, 146], [150, 144]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#101418';
    ctx.fill();
    ctx.save();
    ctx.shadowColor = fire;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = fire;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ink(ctx, 3, '#8a8a80');
  }
  // the lace: a frayed old cord
  ctx.beginPath();
  ctx.moveTo(62, 54);
  ctx.lineTo(162, 98);
  ctx.moveTo(158, 50);
  ctx.lineTo(58, 102);
  ctx.moveTo(58, 102);
  ctx.lineTo(150, 144);
  ctx.strokeStyle = '#3a3428';
  ctx.lineWidth = 4;
  ctx.stroke();
  lightInside(ctx, -6, 262, 0.18);
  ctx.restore();
  // a hobnailed iron sole strip under the toe
  ctx.beginPath();
  ctx.moveTo(30, 238);
  ctx.quadraticCurveTo(CX, 274, 190, 238);
  ink(ctx, 8, '#2a2622');
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    const x = 30 + t * 160;
    const y = 238 + Math.sin(t * Math.PI) * 18;
    ctx.beginPath();
    ctx.arc(x, y + 3, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#9aa0a8';
    ctx.fill();
  }
  draugrPath(ctx);
  ink(ctx, OUT, outlineOf(leather));
  // a loose strip of cloth trailing off the side
  ctx.beginPath();
  ctx.moveTo(206, 120);
  ctx.bezierCurveTo(236, 138, 222, 170, 244, 192);
  ctx.lineTo(234, 200);
  ctx.bezierCurveTo(214, 178, 222, 148, 200, 138);
  ctx.closePath();
  ctx.fillStyle = cloth;
  ctx.fill();
  ink(ctx, 3.5, '#4a4230');
}

// ——— VALKYRIE-CURSED CLOGS: carved wooden clogs with white wings and gold trim ———

function clogPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(42, -6);
  ctx.bezierCurveTo(40, 40, 12, 80, 10, 150);
  ctx.bezierCurveTo(8, 222, 50, 262, 110, 262);
  ctx.bezierCurveTo(170, 262, 212, 222, 210, 150);
  ctx.bezierCurveTo(208, 80, 180, 40, 178, -6);
  ctx.closePath();
}

function wing(ctx: Ctx, x: number, y: number, dir: 1 | -1, feather: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  // three tiers of feathers fanning up and out
  for (let tier = 0; tier < 3; tier++) {
    const n = 4 - tier;
    for (let i = n - 1; i >= 0; i--) {
      const len = 96 - tier * 20 - i * 8;
      const ang = -1.45 + i * 0.3 + tier * 0.1;
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(len * 0.6, -20, len, -2);
      ctx.quadraticCurveTo(len * 0.6, 15, 0, 10);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, -16, 12, [[0, '#ffffff'], [1, shade(feather, -0.12 - tier * 0.04)]]);
      ctx.fill();
      ink(ctx, 3, '#5a5040');
      ctx.beginPath();
      ctx.moveTo(4, 1);
      ctx.lineTo(len * 0.8, -2);
      ctx.strokeStyle = rgba('#8a8070', 0.6);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }
  // the gold wing root
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fillStyle = vgrad(ctx, -11, 11, [[0, '#ffe88a'], [1, '#b8862a']]);
  ctx.fill();
  ink(ctx, 3);
  ctx.restore();
}

function drawValkyrie(ctx: Ctx, art: FootArt, r: () => number): void {
  const wood = art.primary ?? '#c98a3a';
  const feather = art.secondary ?? '#f4f1e8';
  wing(ctx, 28, 100, -1, feather);
  wing(ctx, 192, 100, 1, feather);
  clogPath(ctx);
  ctx.fillStyle = bodyFill(ctx, wood);
  ctx.fill();
  ctx.save();
  clogPath(ctx);
  ctx.clip();
  // carved wood grain
  ctx.strokeStyle = rgba(shade(wood, -0.45), 0.45);
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const x = 14 + i * 17 + r() * 6;
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.bezierCurveTo(x + 6, 80, x - 8, 170, x + 2, 270);
    ctx.stroke();
  }
  // a knot
  ellipse(ctx, 150, 90, 9, 13, 0.3);
  ctx.strokeStyle = rgba(shade(wood, -0.55), 0.7);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // gold trim band round the opening, and a gold toe plate with a rune
  ctx.beginPath();
  ctx.moveTo(-10, 18);
  ctx.quadraticCurveTo(CX, 40, 230, 18);
  ctx.lineTo(230, 40);
  ctx.quadraticCurveTo(CX, 62, -10, 40);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 18, 62, [[0, '#fff0a8'], [0.5, '#e8b84a'], [1, '#9a6a1a']]);
  ctx.fill();
  ink(ctx, 3.5);
  ctx.beginPath();
  ctx.moveTo(40, 196);
  ctx.quadraticCurveTo(CX, 170, 180, 196);
  ctx.quadraticCurveTo(CX, 270, 40, 196);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 176, 236, [[0, '#fff0a8'], [0.5, '#e8b84a'], [1, '#9a6a1a']]);
  ctx.fill();
  ink(ctx, 3.5);
  rune(ctx, 5, CX, 206, 14);
  ink(ctx, 4, '#6a3a10');
  // the curse: a pale violet glow crawling up from the toe
  const cg = ctx.createRadialGradient(CX, 250, 4, CX, 250, 110);
  cg.addColorStop(0, rgba('#c8a8ff', 0.35));
  cg.addColorStop(1, rgba('#c8a8ff', 0));
  ctx.fillStyle = cg;
  ctx.fillRect(-10, 140, 240, 140);
  lightInside(ctx, -6, 266, 0.3);
  ctx.restore();
  clogPath(ctx);
  ink(ctx, OUT, outlineOf(wood));
  // the clog's raised sole lip
  ctx.beginPath();
  ctx.moveTo(26, 230);
  ctx.quadraticCurveTo(CX, 282, 194, 230);
  ink(ctx, 7, shade(wood, -0.55));
  // a sheen
  ellipse(ctx, 62, 120, 12, 44, 0.15);
  ctx.fillStyle = rgba('#ffffff', 0.35);
  ctx.fill();
}

// ——— FENRIR'S PAW: a colossal wolf paw, shaggy fur, black claws, a glowing rune shackle ———

function pawPath(ctx: Ctx, r: () => number): void {
  // a shaggy silhouette: jagged fur tufts down the sides, four big toes along the bottom
  ctx.beginPath();
  ctx.moveTo(44, -6);
  const left: P[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const y = -6 + t * 190;
    const x = 44 - Math.sin(t * Math.PI * 0.6) * 44 - 4;
    left.push([x + (i % 2 ? -10 - r() * 4 : 0), y]);
  }
  for (const [x, y] of left) ctx.lineTo(x, y);
  const toes: [number, number, number][] = [
    [30, 222, 26],
    [82, 246, 30],
    [138, 246, 30],
    [190, 222, 26],
  ];
  for (const [cx, cy, rr] of toes) ctx.arc(cx, cy - 6, rr, Math.PI * 1.05, Math.PI * 0.05, true);
  const right: P[] = [];
  for (let i = 8; i >= 0; i--) {
    const t = i / 8;
    const y = -6 + t * 190;
    const x = 176 + Math.sin(t * Math.PI * 0.6) * 44 + 4;
    right.push([x + (i % 2 ? 10 + r() * 4 : 0), y]);
  }
  for (const [x, y] of right) ctx.lineTo(x, y);
  ctx.closePath();
}

function drawFenrir(ctx: Ctx, art: FootArt, _r: () => number): void {
  const fur = art.skin;
  const dark = art.primary ?? '#3e3a46';
  const runeCol = '#9ad8ff';
  const r = (() => {
    let s = 7;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  })();
  // claws first (they poke out from under the toes)
  for (const [cx, cy] of [[30, 236], [82, 262], [138, 262], [190, 236]] as const) {
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 4);
    ctx.quadraticCurveTo(cx - 6, cy + 34, cx + 4, cy + 44);
    ctx.quadraticCurveTo(cx + 12, cy + 26, cx + 12, cy - 4);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, cy, cy + 44, [[0, '#3a3438'], [0.5, '#16141a'], [1, '#000000']]);
    ctx.fill();
    ink(ctx, 3);
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 4);
    ctx.quadraticCurveTo(cx - 3, cy + 22, cx + 2, cy + 32);
    ctx.strokeStyle = rgba('#ffffff', 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  pawPath(ctx, r);
  ctx.fillStyle = bodyFill(ctx, fur, -10, 230);
  ctx.fill();
  ctx.save();
  pawPath(ctx, r);
  ctx.clip();
  lightInside(ctx, -6, 270, 0.26);
  // fur strokes, flowing down, darker in the gaps between toes
  ctx.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const x = -10 + r() * 240;
    const y = -6 + r() * 250;
    const len = 12 + r() * 16;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (x - CX) * 0.05 + 3, y + len * 0.5, x + (x - CX) * 0.1, y + len);
    ctx.strokeStyle = rgba(r() < 0.6 ? shade(fur, -0.35) : shade(fur, 0.3), 0.5);
    ctx.lineWidth = 2 + r() * 2;
    ctx.stroke();
  }
  // toe divisions
  for (const x of [56, 110, 164]) {
    ctx.beginPath();
    ctx.moveTo(x, 186);
    ctx.quadraticCurveTo(x + 2, 214, x, 236);
    ink(ctx, 4, rgba(dark, 0.8));
  }
  // the shackle: a band of rune-carved iron at the ankle
  ctx.beginPath();
  ctx.moveTo(-10, 18);
  ctx.quadraticCurveTo(CX, 40, 230, 18);
  ctx.lineTo(230, 58);
  ctx.quadraticCurveTo(CX, 80, -10, 58);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 18, 80, [[0, '#c8d0dc'], [0.4, '#6a7280'], [1, '#2c3038']]);
  ctx.fill();
  ink(ctx, 4.5);
  for (let i = 0; i < 5; i++) {
    const x = 36 + i * 37;
    const y = 50 + Math.sin(((x - 0) / 220) * Math.PI) * 8;
    rune(ctx, i * 2 + 1, x, y, 11);
    glowStroke(ctx, runeCol, '#ffffff', 3.5, 10);
  }
  ctx.restore();
  pawPath(ctx, r);
  ink(ctx, OUT, outlineOf(fur));
  // a broken link dangling from the shackle
  ctx.beginPath();
  ctx.ellipse(196, 92, 12, 20, 0.3, 0, Math.PI * 2);
  ink(ctx, 9, INK);
  ctx.beginPath();
  ctx.ellipse(196, 92, 12, 20, 0.3, 0, Math.PI * 2);
  ctx.strokeStyle = '#a8b0bc';
  ctx.lineWidth = 5;
  ctx.stroke();
}

// ——— THRYM: the Frost King's boot of blue glacier ice, a crown of icicles, white fur trim ———

function thrymPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(40, -6);
  ctx.lineTo(30, 70);
  ctx.bezierCurveTo(6, 120, 0, 200, 14, 246);
  ctx.bezierCurveTo(40, 280, 180, 280, 206, 246);
  ctx.bezierCurveTo(222, 200, 214, 120, 190, 70);
  ctx.lineTo(180, -6);
  ctx.closePath();
}

function drawThrym(ctx: Ctx, art: FootArt, r: () => number): void {
  const ice = art.primary ?? '#5fa8d8';
  const pale = art.secondary ?? '#eaf8ff';
  thrymPath(ctx);
  const g = ctx.createLinearGradient(0, 0, 220, 0);
  g.addColorStop(0, shade(ice, -0.4));
  g.addColorStop(0.25, shade(ice, 0.2));
  g.addColorStop(0.42, mix(ice, '#ffffff', 0.5));
  g.addColorStop(0.65, ice);
  g.addColorStop(1, shade(ice, -0.5));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  thrymPath(ctx);
  ctx.clip();
  // glacier facets: big triangles of lighter and darker ice
  for (let i = 0; i < 16; i++) {
    const x = r() * 220;
    const y = 60 + r() * 210;
    const s = 26 + r() * 34;
    poly(ctx, [[x, y], [x + s, y + s * 0.3 * (r() - 0.5)], [x + s * 0.4, y + s]]);
    ctx.fillStyle = rgba(r() < 0.5 ? '#ffffff' : shade(ice, -0.5), 0.13 + r() * 0.1);
    ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // deep cracks with cold blue light
  for (let i = 0; i < 4; i++) {
    let x = 30 + r() * 160;
    let y = 90 + r() * 30;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (r() - 0.5) * 40;
      y += 16 + r() * 18;
      ctx.lineTo(x, y);
    }
    glowStroke(ctx, '#6fd0ff', '#e8fbff', 2.5, 8);
  }
  // the king's rune on the toe
  rune(ctx, 6, CX, 210, 24);
  glowStroke(ctx, '#7fe0ff', '#ffffff', 6, 16);
  lightInside(ctx, -6, 280, 0.35);
  // the fur cuff
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.lineTo(230, -10);
  ctx.lineTo(230, 46);
  for (let x = 230; x >= -10; x -= 14) ctx.lineTo(x, 46 + (x % 28 === 0 ? 12 : 0) + r() * 6);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -10, 60, [[0, '#ffffff'], [1, '#c8d8e4']]);
  ctx.fill();
  ink(ctx, 3, '#7a8a98');
  for (let i = 0; i < 40; i++) {
    const x = r() * 220;
    const y = r() * 50;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2, y + 8);
    ctx.strokeStyle = rgba('#8aa0b0', 0.55);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
  // the crown: a ring of ice spikes rising from the fur, drawn over the outline so it reads as a crown
  const spikes: [number, number][] = [[46, 30], [76, 42], [110, 52], [144, 42], [174, 30]];
  for (const [x, h] of spikes) {
    poly(ctx, [[x - 13, 66], [x - 2, 66 - h - 6], [x + 3, 66 - h - 10], [x + 13, 66]]);
    ctx.fillStyle = vgrad(ctx, 66 - h - 10, 66, [[0, '#ffffff'], [0.5, pale], [1, '#7fc4f0']]);
    ctx.fill();
    ink(ctx, 3.5, '#2e5a7a');
  }
  ctx.beginPath();
  ctx.moveTo(26, 66);
  ctx.quadraticCurveTo(CX, 78, 194, 66);
  ink(ctx, 10, '#2e5a7a');
  ctx.beginPath();
  ctx.moveTo(26, 66);
  ctx.quadraticCurveTo(CX, 78, 194, 66);
  ctx.strokeStyle = '#bfe8ff';
  ctx.lineWidth = 5;
  ctx.stroke();
  // a jewel of frozen light
  ctx.save();
  ctx.shadowColor = '#7fe0ff';
  ctx.shadowBlur = 14;
  poly(ctx, [[CX, 60], [CX + 9, 70], [CX, 82], [CX - 9, 70]]);
  ctx.fillStyle = '#e8fbff';
  ctx.fill();
  ctx.restore();
  poly(ctx, [[CX, 60], [CX + 9, 70], [CX, 82], [CX - 9, 70]]);
  ink(ctx, 2.5, '#2e5a7a');
  thrymPath(ctx);
  ink(ctx, OUT, '#1e3a52');
  // icicles hanging off the sole edge
  for (const x of [34, 70, 150, 186]) icicle(ctx, x, 252 + Math.sin(((x - 10) / 200) * Math.PI) * 18, 6, 22);
  // a strong glassy sheen
  ellipse(ctx, 56, 150, 11, 60, 0.12);
  ctx.fillStyle = rgba('#ffffff', 0.5);
  ctx.fill();
}

// ——— JÖRMUNGANDR: a snakeskin boot whose toe is the world serpent's head ———

function serpentPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(46, -6);
  ctx.bezierCurveTo(44, 60, 6, 110, 6, 170);
  ctx.bezierCurveTo(6, 220, 60, 262, 110, 300);
  ctx.bezierCurveTo(160, 262, 214, 220, 214, 170);
  ctx.bezierCurveTo(214, 110, 176, 60, 174, -6);
  ctx.closePath();
}

function drawJormungandr(ctx: Ctx, art: FootArt, _r: () => number): void {
  const scale = art.primary ?? '#2f6e56';
  const belly = '#e8dcaa';
  const eye = art.secondary ?? '#e8d36a';
  // fangs first (they hang below the snout)
  for (const dx of [-16, 16]) {
    ctx.beginPath();
    ctx.moveTo(CX + dx - 7, 280);
    ctx.quadraticCurveTo(CX + dx - 2, 306, CX + dx + 1, 316);
    ctx.quadraticCurveTo(CX + dx + 5, 300, CX + dx + 7, 278);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, 278, 316, [[0, '#ffffff'], [1, '#d8d0b0']]);
    ctx.fill();
    ink(ctx, 3);
  }
  serpentPath(ctx);
  ctx.fillStyle = bodyFill(ctx, scale);
  ctx.fill();
  ctx.save();
  serpentPath(ctx);
  ctx.clip();
  // scales: overlapping rows, each lit on its upper left
  for (let row = 0; row < 18; row++) {
    const y = -6 + row * 17;
    for (let col = 0; col < 12; col++) {
      const x = -6 + col * 21 + (row % 2) * 10.5;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI);
      ctx.fillStyle = rgba(shade(scale, 0.18 - (x / 220) * 0.3), 0.55);
      ctx.fill();
      ctx.strokeStyle = rgba(shade(scale, -0.55), 0.6);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  // the cream belly plates running down the front, narrowing into the jaw
  for (let i = 0; i < 9; i++) {
    const y = 0 + i * 20;
    const w = 30 - i * 1.2;
    ctx.beginPath();
    ctx.ellipse(CX, y + 10, w, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = vgrad(ctx, y, y + 20, [[0, shade(belly, 0.1)], [1, shade(belly, -0.15)]]);
    ctx.fill();
    ink(ctx, 2.5, shade(belly, -0.55));
  }
  // the head: a darker brow ridge, then the snout
  ctx.beginPath();
  ctx.moveTo(-10, 190);
  ctx.quadraticCurveTo(CX, 150, 230, 190);
  ctx.lineTo(230, 320);
  ctx.lineTo(-10, 320);
  ctx.closePath();
  ctx.fillStyle = rgba(shade(scale, -0.3), 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, 190);
  ctx.quadraticCurveTo(CX, 150, 230, 190);
  ink(ctx, 4, shade(scale, -0.6));
  // nostrils
  for (const dx of [-12, 12]) {
    ellipse(ctx, CX + dx, 262, 4, 7, dx * 0.03);
    ctx.fillStyle = '#10201a';
    ctx.fill();
  }
  // the mouth line
  ctx.beginPath();
  ctx.moveTo(56, 236);
  ctx.quadraticCurveTo(CX, 286, 164, 236);
  ink(ctx, 4, '#10201a');
  lightInside(ctx, -6, 300, 0.25);
  ctx.restore();
  serpentPath(ctx);
  ink(ctx, OUT, outlineOf(scale));
  // eyes: big glowing yellow slits on either side of the head
  for (const dir of [-1, 1] as const) {
    const ex = CX + dir * 58;
    const ey = 200;
    ellipse(ctx, ex, ey, 20, 14, dir * 0.35);
    ctx.save();
    ctx.shadowColor = eye;
    ctx.shadowBlur = 16;
    ctx.fillStyle = vgrad(ctx, ey - 14, ey + 14, [[0, '#fff6a8'], [1, eye]]);
    ctx.fill();
    ctx.restore();
    ellipse(ctx, ex, ey, 20, 14, dir * 0.35);
    ink(ctx, 4);
    ellipse(ctx, ex, ey, 4, 12, dir * 0.2);
    ctx.fillStyle = '#10140c';
    ctx.fill();
    ellipse(ctx, ex - 7, ey - 5, 4, 3);
    ctx.fillStyle = rgba('#ffffff', 0.8);
    ctx.fill();
    // a horned brow over each eye
    poly(ctx, [[ex - dir * 22, ey - 12], [ex + dir * 34, ey - 34], [ex + dir * 10, ey - 8]]);
    ctx.fillStyle = vgrad(ctx, ey - 34, ey - 8, [[0, '#f0e6c0'], [1, '#9a8a5a']]);
    ctx.fill();
    ink(ctx, 3);
  }
  // a little forked tongue flicking out under the fangs
  ctx.beginPath();
  ctx.moveTo(CX, 296);
  ctx.lineTo(CX + 2, 318);
  ctx.lineTo(CX - 6, 330);
  ctx.moveTo(CX + 2, 318);
  ctx.lineTo(CX + 9, 330);
  ink(ctx, 6, INK);
  ctx.strokeStyle = '#e0405a';
  ctx.lineWidth = 3;
  ctx.stroke();
}

// ——— SURTR: an obsidian magma boot, glowing lava cracks, a cuff of flame ———

function surtrPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(40, -6);
  ctx.lineTo(30, 80);
  ctx.bezierCurveTo(4, 130, 2, 210, 16, 248);
  ctx.bezierCurveTo(46, 280, 174, 280, 204, 248);
  ctx.bezierCurveTo(218, 210, 216, 130, 190, 80);
  ctx.lineTo(180, -6);
  ctx.closePath();
}

function flameTongue(ctx: Ctx, x: number, base: number, h: number, w: number, lean: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w, base);
  ctx.bezierCurveTo(x - w * 0.9, base - h * 0.5, x + lean - w * 0.3, base - h * 0.7, x + lean, base - h);
  ctx.bezierCurveTo(x + lean + w * 0.2, base - h * 0.6, x + w, base - h * 0.4, x + w, base);
  ctx.closePath();
}

function drawSurtr(ctx: Ctx, art: FootArt, r: () => number): void {
  const rock = art.primary ?? '#2a1a18';
  surtrPath(ctx);
  ctx.fillStyle = bodyFill(ctx, '#3a2a2a');
  ctx.fill();
  ctx.save();
  surtrPath(ctx);
  ctx.clip();
  // obsidian plates: angular facets with glassy edges
  for (let i = 0; i < 18; i++) {
    const x = r() * 220;
    const y = 30 + r() * 240;
    const s = 22 + r() * 30;
    poly(ctx, [[x, y], [x + s, y + s * 0.25], [x + s * 0.6, y + s], [x - s * 0.2, y + s * 0.7]]);
    ctx.fillStyle = rgba(r() < 0.5 ? shade(rock, -0.4) : '#4a3a3e', 0.65);
    ctx.fill();
    ctx.strokeStyle = rgba('#a090a0', 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // the magma heart glowing through the toe
  const mg = ctx.createRadialGradient(CX, 250, 4, CX, 250, 120);
  mg.addColorStop(0, rgba('#ffb040', 0.65));
  mg.addColorStop(0.5, rgba('#ff5a10', 0.25));
  mg.addColorStop(1, rgba('#ff5a10', 0));
  ctx.fillStyle = mg;
  ctx.fillRect(-10, 120, 240, 170);
  // lava cracks, branching
  ctx.lineJoin = 'round';
  for (let i = 0; i < 4; i++) {
    let x = 20 + r() * 180;
    let y = 70 + r() * 60;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (r() - 0.5) * 46;
      y += 14 + r() * 20;
      ctx.lineTo(x, y);
    }
    glowStroke(ctx, '#ff6a10', '#ffe08a', 4, 14);
  }
  // a fire rune on the toe
  rune(ctx, 3, CX, 222, 22);
  glowStroke(ctx, '#ff8a1a', '#fff2b0', 7, 18);
  lightInside(ctx, -6, 280, 0.18);
  ctx.restore();
  surtrPath(ctx);
  ink(ctx, OUT, '#120806');
  // a glowing sole seam
  ctx.beginPath();
  ctx.moveTo(22, 252);
  ctx.quadraticCurveTo(CX, 292, 198, 252);
  glowStroke(ctx, '#ff6a10', '#ffd060', 4, 10);
  // the flame cuff: a band of hot iron, with fire licking up out of it
  ctx.beginPath();
  ctx.moveTo(30, 70);
  ctx.quadraticCurveTo(CX, 88, 190, 70);
  ctx.lineTo(186, 96);
  ctx.quadraticCurveTo(CX, 114, 34, 96);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 70, 114, [[0, '#ff9a3a'], [0.5, '#a03a10'], [1, '#3a1008']]);
  ctx.fill();
  ink(ctx, 4);
  const tongues: [number, number, number, number][] = [
    [40, 70, 10, -6], [62, 92, 13, 4], [86, 78, 12, -4], [110, 104, 15, 3], [134, 82, 12, 5], [158, 94, 13, -3], [180, 68, 10, 6],
  ];
  for (const [x, h, w, lean] of tongues) {
    const base = 78 + Math.sin(((x - 30) / 160) * Math.PI) * 8;
    flameTongue(ctx, x, base, h, w, lean);
    ctx.fillStyle = vgrad(ctx, base - h, base, [[0, '#ffe680'], [0.45, '#ff9a1a'], [1, '#e0400a']]);
    ctx.fill();
    ink(ctx, 3, '#5a1a06');
    flameTongue(ctx, x + lean * 0.2, base - 2, h * 0.55, w * 0.45, lean * 0.5);
    ctx.fillStyle = rgba('#fff8d0', 0.85);
    ctx.fill();
  }
  // embers
  ctx.save();
  ctx.shadowColor = '#ff8a1a';
  ctx.shadowBlur = 8;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = r() < 0.5 ? '#ffd060' : '#ff7a1a';
    ctx.beginPath();
    ctx.arc(20 + r() * 180, -4 + r() * 30, 2 + r() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // a hard glassy glint top left
  ellipse(ctx, 50, 160, 8, 40, 0.12);
  ctx.fillStyle = rgba('#ffffff', 0.3);
  ctx.fill();
}

registerKind('n_frostgiant', { draw: drawFrostGiant, contactY: 262, halfWidth: 118 });
registerKind('n_troll', { draw: drawTroll, contactY: 266, halfWidth: 112 });
registerKind('n_draugr', { draw: drawDraugr, contactY: 262, halfWidth: 104 });
registerKind('n_valkyrie', { draw: drawValkyrie, contactY: 266, halfWidth: 104 });
registerKind('n_fenrir', { draw: drawFenrir, contactY: 290, halfWidth: 116 });
registerKind('n_thrym', { draw: drawThrym, contactY: 276, halfWidth: 112 });
registerKind('n_jormungandr', { draw: drawJormungandr, contactY: 306, halfWidth: 108 });
registerKind('n_surtr', { draw: drawSurtr, contactY: 278, halfWidth: 110 });
