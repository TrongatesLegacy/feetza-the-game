// Art for the Kratos Peel's two feet (data in src/content/feet/gods.ts). Same design frame as the built-in kinds:
// centre x = CX (110), the ankle opens at y = -6, toes at the bottom, the sole touching at contactY. Leaning
// toward the cohesive style: one outer silhouette with the details painted inside it (clipped), light from the
// top left, one outline weight. The Spartan's bronze shield is a separate prop (g_aspis, src/content/props/gods.ts)
// held in front of the foot, so it can rise and drop in play.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, type Toe, barePath, drawToe, glossy, outlineOf, skinBodyFill } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, rgba, roundRect, shade } from '../../art/util';

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function bronze(ctx: Ctx, x0: number, x1: number, col = '#c9873a'): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, -0.5));
  g.addColorStop(0.25, shade(col, 0.05));
  g.addColorStop(0.38, shade(col, 0.6));
  g.addColorStop(0.5, col);
  g.addColorStop(1, shade(col, -0.55));
  return g;
}

// ——— PERSIAN ELEPHANT FEET: a huge wrinkled pillar of a foot, broad nails, a gold-fringed caparison ———
function elephantPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(34, -6);
  ctx.bezierCurveTo(26, 60, 4, 140, 6, 206);
  ctx.bezierCurveTo(8, 244, 40, 262, 110, 264);
  ctx.bezierCurveTo(180, 262, 212, 244, 214, 206);
  ctx.bezierCurveTo(216, 140, 194, 60, 186, -6);
  ctx.closePath();
}

function drawElephant(ctx: Ctx, art: FootArt, r: () => number): void {
  const skin = art.skin;
  const cloth = art.primary ?? '#b8202a';
  const gold = art.secondary ?? '#e8b43a';
  const ol = outlineOf(skin);
  elephantPath(ctx);
  ctx.fillStyle = skinBodyFill(ctx, skin);
  ctx.fill();
  ctx.save();
  elephantPath(ctx);
  ctx.clip();
  glossy(ctx, 70, 120, 40, 90, 0.16);
  ctx.fillStyle = rgba('#000000', 0.12);
  ctx.fillRect(172, -10, 60, 290);
  // deep wrinkle rings round the pillar, and a crackle of fine creases
  for (let i = 0; i < 7; i++) {
    const y = 110 + i * 20 + r() * 6;
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.quadraticCurveTo(CX, y + 16 + r() * 8, 210, y - 2);
    ctx.strokeStyle = rgba(shade(skin, -0.5), 0.5);
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, y + 3);
    ctx.quadraticCurveTo(CX, y + 19 + r() * 8, 208, y + 1);
    ctx.strokeStyle = rgba(shade(skin, 0.35), 0.35);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const x = 20 + r() * 180;
    const y = 100 + r() * 140;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 16, y + r() * 8);
    ctx.strokeStyle = rgba(shade(skin, -0.45), 0.35);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // a rounded sole pad shadow at the bottom
  ellipse(ctx, CX, 258, 104, 16);
  ctx.fillStyle = rgba(shade(skin, -0.5), 0.45);
  ctx.fill();
  ctx.restore();
  elephantPath(ctx);
  ink(ctx, OUT, ol);
  // four broad, flat, ivory nails across the front
  for (const [x, w] of [[38, 30], [82, 34], [134, 34], [180, 30]] as [number, number][]) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, 252);
    ctx.quadraticCurveTo(x - w / 2 - 2, 226, x, 224);
    ctx.quadraticCurveTo(x + w / 2 + 2, 226, x + w / 2, 252);
    ctx.quadraticCurveTo(x, 258, x - w / 2, 252);
    const ng = ctx.createLinearGradient(0, 224, 0, 256);
    ng.addColorStop(0, shade(art.nails ?? '#efe6d0', 0.15));
    ng.addColorStop(1, shade(art.nails ?? '#efe6d0', -0.2));
    ctx.fillStyle = ng;
    ctx.fill();
    ink(ctx, 3.5, ol);
    ellipse(ctx, x - 5, 234, 5, 3, -0.4);
    ctx.fillStyle = rgba('#ffffff', 0.6);
    ctx.fill();
  }
  // the caparison: a Persian cloth draped round the top, a patterned border and gold fringe
  const cap = () => {
    ctx.beginPath();
    ctx.moveTo(20, -8);
    ctx.lineTo(200, -8);
    ctx.lineTo(206, 70);
    for (let i = 0; i <= 8; i++) {
      const x = 206 - i * 24.5;
      ctx.quadraticCurveTo(x + 12, 96 + (i % 2) * 6, x - 12, 78);
    }
    ctx.lineTo(14, 70);
    ctx.closePath();
  };
  cap();
  const cg = ctx.createLinearGradient(14, 0, 206, 0);
  cg.addColorStop(0, shade(cloth, -0.35));
  cg.addColorStop(0.35, shade(cloth, 0.15));
  cg.addColorStop(1, shade(cloth, -0.4));
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.save();
  cap();
  ctx.clip();
  // a woven band of gold diamonds and a row of little boteh (teardrop) motifs
  ctx.fillStyle = rgba(gold, 0.95);
  ctx.fillRect(10, 8, 200, 6);
  ctx.fillRect(10, 52, 200, 5);
  for (let x = 18; x < 210; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 33);
    ctx.lineTo(x + 8, 22);
    ctx.lineTo(x + 16, 33);
    ctx.lineTo(x + 8, 44);
    ctx.closePath();
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.5);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ellipse(ctx, x + 8, 33, 3, 3);
    ctx.fillStyle = '#2a6ab8';
    ctx.fill();
  }
  ctx.fillStyle = rgba('#ffffff', 0.12);
  ctx.fillRect(14, -8, 70, 90);
  ctx.restore();
  cap();
  ink(ctx, 4.5);
  // gold tassels hanging from the scalloped hem
  for (let i = 0; i <= 8; i++) {
    const x = 194 - i * 24.5;
    const y = 90 + (i % 2) * 6;
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.strokeStyle = shade(gold, -0.3);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 6);
    ctx.lineTo(x + 6, y + 6);
    ctx.lineTo(x + 3, y + 22);
    ctx.lineTo(x - 3, y + 22);
    ctx.closePath();
    ctx.fillStyle = gold;
    ctx.fill();
    ink(ctx, 2);
  }
  // a bronze ankle plate with studs over the cloth
  roundRect(ctx, 44, 100, 132, 22, 9);
  ctx.fillStyle = bronze(ctx, 44, 176, '#c9873a');
  ctx.fill();
  ink(ctx, 3.5);
  for (let x = 56; x < 172; x += 20) {
    ellipse(ctx, x, 111, 4, 4);
    ctx.fillStyle = '#f2d48a';
    ctx.fill();
    ink(ctx, 1.6);
  }
}

// ——— SPARTAN SANDALS: a sun-browned bare foot in criss-cross leather straps, a bronze greave and a red cloak ———
const SP_TOES: Toe[] = [
  { cx: 34, cy: 212, rx: 18, ry: 21 },
  { cx: 70, cy: 223, rx: 20.5, ry: 25 },
  { cx: 106, cy: 230, rx: 22, ry: 27 },
  { cx: 144, cy: 232, rx: 24, ry: 29 },
  { cx: 186, cy: 229, rx: 31, ry: 34 },
];

function drawSpartan(ctx: Ctx, art: FootArt, r: () => number): void {
  const skin = art.skin;
  const leather = art.primary ?? '#7a4a24';
  const cloak = art.secondary ?? '#c8102e';
  const bz = String(art.extra?.bronze ?? '#c9873a');
  const ol = outlineOf(skin);
  // the sole of the sandal, peeking out under the foot
  ctx.beginPath();
  ctx.moveTo(10, 214);
  ctx.bezierCurveTo(10, 250, 60, 262, 120, 262);
  ctx.bezierCurveTo(190, 262, 222, 250, 220, 214);
  ctx.lineTo(214, 236);
  ctx.bezierCurveTo(200, 252, 60, 254, 16, 236);
  ctx.closePath();
  ctx.fillStyle = shade(leather, -0.2);
  ctx.fill();
  ink(ctx, 4);
  // the foot
  barePath(ctx, art);
  ctx.fillStyle = skinBodyFill(ctx, skin);
  ctx.fill();
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  glossy(ctx, 74, 70, 46, 80, 0.2);
  ctx.fillStyle = rgba('#000000', 0.1);
  ctx.fillRect(170, -10, 60, 240);
  // tendons and a vein: a foot that marches
  ctx.strokeStyle = rgba(shade(skin, -0.4), 0.4);
  ctx.lineWidth = 2.4;
  for (const dx of [-30, 0, 30]) {
    ctx.beginPath();
    ctx.moveTo(CX + dx * 0.5, 120);
    ctx.quadraticCurveTo(CX + dx, 170, CX + dx * 1.4, 206);
    ctx.stroke();
  }
  // criss-cross leather straps up the foot
  const strap = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 8, x1, y1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 15;
    ctx.stroke();
    ctx.strokeStyle = leather;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.strokeStyle = rgba(shade(leather, 0.5), 0.6);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };
  for (let i = 0; i < 4; i++) {
    const y = 110 + i * 26;
    strap(14, y + 26, 214, y);
    strap(14, y, 214, y + 26);
  }
  // the toe strap
  strap(10, 200, 220, 204);
  ctx.restore();
  barePath(ctx, art, true);
  ink(ctx, OUT, ol);
  for (const t of SP_TOES) drawToe(ctx, t, skin, { nail: null, ol });
  // a bronze knot-ring where the straps meet
  for (const [x, y] of [[CX, 136], [CX, 188]] as [number, number][]) {
    ellipse(ctx, x, y, 9, 9);
    ctx.fillStyle = bronze(ctx, x - 9, x + 9, bz);
    ctx.fill();
    ink(ctx, 2.6);
  }
  // the bronze greave on the shin, with embossed muscle lines
  const greave = () => {
    ctx.beginPath();
    ctx.moveTo(50, -8);
    ctx.bezierCurveTo(44, 30, 36, 66, 42, 100);
    ctx.quadraticCurveTo(CX, 116, 178, 100);
    ctx.bezierCurveTo(184, 66, 176, 30, 170, -8);
    ctx.closePath();
  };
  greave();
  ctx.fillStyle = bronze(ctx, 36, 184, bz);
  ctx.fill();
  ctx.save();
  greave();
  ctx.clip();
  ctx.strokeStyle = rgba(INK, 0.35);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX - 4, -6);
  ctx.bezierCurveTo(CX - 28, 30, CX - 10, 60, CX - 34, 96);
  ctx.moveTo(CX + 4, -6);
  ctx.bezierCurveTo(CX + 28, 30, CX + 10, 60, CX + 34, 96);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    ellipse(ctx, 50 + r() * 120, 10 + r() * 80, 3 + r() * 5, 2 + r() * 3);
    ctx.fillStyle = rgba('#4fa89a', 0.4);
    ctx.fill();
  }
  ctx.fillStyle = rgba('#ffffff', 0.25);
  ctx.beginPath();
  ctx.ellipse(76, 30, 12, 34, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  greave();
  ink(ctx, OUT, outlineOf(bz));
  // the red cloak's hem swinging behind, top left
  const hem = () => {
    ctx.beginPath();
    ctx.moveTo(34, -8);
    ctx.bezierCurveTo(10, 20, -20, 40, -30, 70);
    ctx.lineTo(-18, 64);
    ctx.lineTo(-14, 80);
    ctx.lineTo(-2, 70);
    ctx.lineTo(6, 84);
    ctx.bezierCurveTo(20, 50, 40, 26, 52, -8);
    ctx.closePath();
  };
  hem();
  const hg = ctx.createLinearGradient(-30, 0, 52, 0);
  hg.addColorStop(0, shade(cloak, -0.45));
  hg.addColorStop(0.6, cloak);
  hg.addColorStop(1, shade(cloak, -0.2));
  ctx.fillStyle = hg;
  ctx.fill();
  ink(ctx, 4);
}

registerKind('g_elephant', { draw: drawElephant, contactY: 264, halfWidth: 108 });
registerKind('g_spartan', { draw: drawSpartan, contactY: 262, halfWidth: 104 });
