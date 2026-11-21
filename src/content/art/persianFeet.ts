// Art for the Persian army (data in src/content/feet/persians.ts). Same design frame as the built-in kinds:
// centre x = CX (110), the ankle opens at y = -6, toes at the bottom, the sole touching at contactY. Leaning
// toward the cohesive style: one outer silhouette with the details painted inside it (clipped), light from the
// top left, one outline weight. The four booted feet share one Persian boot (soft leather, a pointed toe that
// curls up); the cavalry is a horse's hoof. The archer's bow and the chariot's wheel are separate props
// (src/content/props/persians.ts) so they can move in play.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, glossy, leatherFill, outlineOf } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, rgba, roundRect, shade } from '../../art/util';
import { paintWheel } from '../props/persians';

/** The Chariot Wheel's wheel: its top-left corner in design space (it's 160 units square, rim radius 62). In play
 * the spinning pa_wheel prop covers it exactly (wheelSpot in src/game/acts/persians.ts). */
export const WHEEL_AT = { x: 96, y: 110 };

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function metal(ctx: Ctx, x0: number, x1: number, col: string): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, -0.5));
  g.addColorStop(0.25, shade(col, 0.05));
  g.addColorStop(0.38, shade(col, 0.6));
  g.addColorStop(0.5, col);
  g.addColorStop(1, shade(col, -0.55));
  return g;
}

// ——— the Persian boot: soft leather to the shin, the toe drawn to a point that curls back up ———
function bootPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(50, -6);
  ctx.bezierCurveTo(48, 56, 16, 100, 16, 164);
  ctx.bezierCurveTo(16, 214, 70, 240, 112, 252);
  ctx.bezierCurveTo(152, 240, 206, 214, 206, 164);
  ctx.bezierCurveTo(206, 100, 172, 56, 170, -6);
  ctx.closePath();
}

/** The boot body: leather, the top-left sheen, the shadowed right side and a sole line. Leaves its clip on
 * (the caller paints its details, then calls `bootEnd`). */
function bootBody(ctx: Ctx, col: string): void {
  bootPath(ctx);
  ctx.fillStyle = leatherFill(ctx, col);
  ctx.fill();
  ctx.save();
  bootPath(ctx);
  ctx.clip();
  glossy(ctx, 76, 120, 40, 70, 0.22);
  ctx.fillStyle = rgba('#000000', 0.12);
  ctx.fillRect(176, -10, 60, 280);
  // creases where the soft leather folds over the instep
  ctx.strokeStyle = rgba(shade(col, -0.5), 0.45);
  ctx.lineWidth = 3;
  for (const y of [120, 138, 156]) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.quadraticCurveTo(CX, y + 14, 182, y - 2);
    ctx.stroke();
  }
}

function bootEnd(ctx: Ctx, col: string): void {
  ctx.restore();
  bootPath(ctx);
  ink(ctx, OUT, outlineOf(col));
}

/** The curled toe tip, with a little ball at its end. */
function curl(ctx: Ctx, col: string, ball: string): void {
  ctx.beginPath();
  ctx.moveTo(112, 250);
  ctx.bezierCurveTo(116, 270, 140, 268, 140, 248);
  ctx.bezierCurveTo(140, 234, 124, 232, 122, 244);
  ctx.strokeStyle = outlineOf(col);
  ctx.lineWidth = 15;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = shade(col, 0.1);
  ctx.lineWidth = 8;
  ctx.stroke();
  ellipse(ctx, 122, 242, 8, 8);
  const g = ctx.createRadialGradient(119, 239, 1, 122, 242, 8);
  g.addColorStop(0, shade(ball, 0.6));
  g.addColorStop(1, shade(ball, -0.2));
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 2.6);
}

/** A woven band across the top of the boot: gold edges, diamonds with a blue eye. */
function band(ctx: Ctx, y: number, h: number, cloth: string, gold: string): void {
  ctx.fillStyle = cloth;
  ctx.fillRect(0, y, 230, h);
  ctx.fillStyle = gold;
  ctx.fillRect(0, y, 230, 4);
  ctx.fillRect(0, y + h - 4, 230, 4);
  const m = y + h / 2;
  for (let x = 14; x < 220; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, m);
    ctx.lineTo(x + 8, m - h * 0.3);
    ctx.lineTo(x + 16, m);
    ctx.lineTo(x + 8, m + h * 0.3);
    ctx.closePath();
    ctx.fillStyle = gold;
    ctx.fill();
    ellipse(ctx, x + 8, m, 2.6, 2.6);
    ctx.fillStyle = '#2a6ab8';
    ctx.fill();
  }
}

// ——— IMMORTAL SANDALS: a purple boot under gold scale armour, and a silver mask with glowing eye slits ———
function drawImmortal(ctx: Ctx, art: FootArt): void {
  const col = art.primary ?? '#5a2a7a';
  const gold = art.secondary ?? '#e8b43a';
  const silver = String(art.extra?.mask ?? '#d8dce4');
  bootBody(ctx, col);
  // overlapping gold scales down the shin, darker as they go into shadow
  for (let row = 0; row < 6; row++) {
    const y = 4 + row * 17;
    for (let x = (row % 2) * 11 - 4; x < 230; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x - 11, y);
      ctx.quadraticCurveTo(x - 11, y + 20, x, y + 20);
      ctx.quadraticCurveTo(x + 11, y + 20, x + 11, y);
      const k = x > 170 ? -0.35 : x < 40 ? -0.2 : 0.05;
      ctx.fillStyle = shade(gold, k - row * 0.03);
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.55);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 6);
      ctx.quadraticCurveTo(x - 5, y + 13, x, y + 14);
      ctx.strokeStyle = rgba('#ffffff', 0.45);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }
  // the scale skirt's lower edge
  ctx.fillStyle = rgba(INK, 0.35);
  ctx.fillRect(0, 108, 230, 4);
  bootEnd(ctx, col);
  // the silver mask: a calm face with dark eye slits that glow gold, and a curled black beard below
  const face = () => {
    ctx.beginPath();
    ctx.moveTo(70, 20);
    ctx.bezierCurveTo(70, 0, 150, 0, 150, 20);
    ctx.bezierCurveTo(152, 58, 138, 88, 110, 92);
    ctx.bezierCurveTo(82, 88, 68, 58, 70, 20);
    ctx.closePath();
  };
  // beard first, so the mask's chin sits over it
  for (let i = 0; i < 5; i++) {
    const x = 86 + i * 12;
    ellipse(ctx, x, 96 + (i % 2) * 4, 8, 11);
    ctx.fillStyle = '#1e1a2e';
    ctx.fill();
    ink(ctx, 2.4);
    ctx.beginPath();
    ctx.arc(x, 96 + (i % 2) * 4, 4, 0.5, 3.6);
    ctx.strokeStyle = rgba('#7a8aa8', 0.6);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  face();
  ctx.fillStyle = metal(ctx, 68, 152, silver);
  ctx.fill();
  ctx.save();
  face();
  ctx.clip();
  glossy(ctx, 92, 26, 18, 26, 0.55);
  ctx.restore();
  face();
  ink(ctx, 4, outlineOf(silver));
  // brow ridge and nose
  ctx.beginPath();
  ctx.moveTo(84, 36);
  ctx.quadraticCurveTo(110, 28, 136, 36);
  ctx.moveTo(110, 38);
  ctx.lineTo(106, 62);
  ctx.lineTo(114, 64);
  ink(ctx, 2.6, rgba(INK, 0.7));
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(110 + sx * 8, 46);
    ctx.quadraticCurveTo(110 + sx * 18, 40, 110 + sx * 28, 46);
    ctx.quadraticCurveTo(110 + sx * 18, 52, 110 + sx * 8, 46);
    ctx.closePath();
    ctx.fillStyle = '#1a1420';
    ctx.fill();
    // the glow behind the slits
    ctx.save();
    ctx.shadowColor = gold;
    ctx.shadowBlur = 10;
    ellipse(ctx, 110 + sx * 18, 46, 5, 2.4);
    ctx.fillStyle = shade(gold, 0.5);
    ctx.fill();
    ctx.restore();
  }
  // a thin mouth
  ctx.beginPath();
  ctx.moveTo(100, 76);
  ctx.quadraticCurveTo(110, 79, 120, 76);
  ink(ctx, 2.4, rgba(INK, 0.7));
  curl(ctx, col, gold);
}

// ——— ARCHER SLIPPERS: a saffron slipper, a teal trouser cuff and a quiver strapped to the side ———
function drawArcher(ctx: Ctx, art: FootArt): void {
  const col = art.primary ?? '#e8a030';
  const teal = art.secondary ?? '#2a7a6a';
  // the quiver behind the boot, top left: a tooled leather tube with fletchings poking out
  ctx.save();
  ctx.translate(30, 70);
  ctx.rotate(-0.32);
  for (const [dx, c] of [[-10, '#e8402f'], [0, '#f4efe8'], [10, '#e8402f']] as [number, string][]) {
    ctx.beginPath();
    ctx.moveTo(dx, -66);
    ctx.lineTo(dx - 7, -92);
    ctx.lineTo(dx, -86);
    ctx.lineTo(dx + 7, -92);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ink(ctx, 2.4);
    ctx.beginPath();
    ctx.moveTo(dx, -66);
    ctx.lineTo(dx, -50);
    ink(ctx, 3, '#5a3a1e');
  }
  roundRect(ctx, -20, -56, 40, 120, 12);
  ctx.fillStyle = leatherFill(ctx, '#7a4a24');
  ctx.fill();
  ink(ctx, 4);
  ctx.fillStyle = '#e8b43a';
  ctx.fillRect(-20, -48, 40, 6);
  ctx.fillRect(-20, 40, 40, 6);
  ctx.restore();
  bootBody(ctx, col);
  // the trouser cuff tucked into the slipper: teal with a gold band
  band(ctx, -8, 34, teal, '#e8c050');
  // a stitched vamp seam down the front
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(CX, 40);
  ctx.quadraticCurveTo(CX + 4, 150, CX + 2, 240);
  ctx.strokeStyle = rgba(shade(col, -0.5), 0.7);
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.setLineDash([]);
  bootEnd(ctx, col);
  // a strap across the instep holding the quiver on
  ctx.beginPath();
  ctx.moveTo(18, 96);
  ctx.quadraticCurveTo(CX, 116, 204, 92);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.strokeStyle = '#7a4a24';
  ctx.lineWidth = 8;
  ctx.stroke();
  ellipse(ctx, CX, 108, 9, 9);
  ctx.fillStyle = metal(ctx, CX - 9, CX + 9, '#e8b43a');
  ctx.fill();
  ink(ctx, 2.4);
  curl(ctx, col, '#e8402f');
}

// ——— CAVALRY HOOVES: a warhorse's leg, a feathered fetlock, a dark hoof shod in bronze, a saddle cloth ———
function legPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(62, -6);
  ctx.bezierCurveTo(60, 40, 52, 80, 40, 112);
  ctx.bezierCurveTo(26, 146, 34, 170, 46, 182);
  ctx.lineTo(174, 182);
  ctx.bezierCurveTo(186, 170, 194, 146, 180, 112);
  ctx.bezierCurveTo(168, 80, 160, 40, 158, -6);
  ctx.closePath();
}

function hoofPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(44, 172);
  ctx.bezierCurveTo(30, 206, 18, 236, 22, 250);
  ctx.bezierCurveTo(40, 266, 180, 266, 198, 250);
  ctx.bezierCurveTo(202, 236, 190, 206, 176, 172);
  ctx.closePath();
}

function drawCavalry(ctx: Ctx, art: FootArt, r: () => number): void {
  const coat = art.skin;
  const horn = art.nails ?? '#2e2420';
  const cloth = art.primary ?? '#b8202a';
  const gold = art.secondary ?? '#e8b43a';
  const ol = outlineOf(coat);
  legPath(ctx);
  ctx.fillStyle = leatherFill(ctx, coat);
  ctx.fill();
  ctx.save();
  legPath(ctx);
  ctx.clip();
  glossy(ctx, 82, 60, 26, 70, 0.28);
  // the tendon groove and a sheen down the cannon bone
  ctx.strokeStyle = rgba(shade(coat, -0.5), 0.5);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.quadraticCurveTo(150, 60, 162, 110);
  ctx.stroke();
  // the feathered fetlock: long pale hair falling over the hoof
  for (let i = 0; i < 46; i++) {
    const x = 30 + r() * 160;
    const y = 120 + r() * 30;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 10, y + 20, x + (r() - 0.5) * 16, y + 40 + r() * 16);
    ctx.strokeStyle = rgba(r() < 0.5 ? '#efe2c4' : shade(coat, 0.5), 0.7);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
  legPath(ctx);
  ink(ctx, OUT, ol);
  // the hoof: dark horn, lit from the top left, growth rings, a bronze shoe
  hoofPath(ctx);
  const hg = ctx.createLinearGradient(20, 0, 200, 0);
  hg.addColorStop(0, shade(horn, 0.1));
  hg.addColorStop(0.35, shade(horn, 0.45));
  hg.addColorStop(0.6, horn);
  hg.addColorStop(1, shade(horn, -0.4));
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.save();
  hoofPath(ctx);
  ctx.clip();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(20, 196 + i * 14);
    ctx.quadraticCurveTo(CX, 204 + i * 14, 200, 196 + i * 14);
    ctx.strokeStyle = rgba('#ffffff', 0.12);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ellipse(ctx, 72, 204, 18, 28, 0.3);
  ctx.fillStyle = rgba('#ffffff', 0.18);
  ctx.fill();
  // the bronze shoe along the bottom, with nail heads
  ctx.fillStyle = metal(ctx, 20, 200, '#c9873a');
  ctx.fillRect(0, 244, 230, 30);
  ctx.restore();
  hoofPath(ctx);
  ink(ctx, OUT, outlineOf(horn));
  for (const x of [44, 78, 110, 142, 176]) {
    ellipse(ctx, x, 252, 3.6, 3.6);
    ctx.fillStyle = '#f2d48a';
    ctx.fill();
    ink(ctx, 1.6);
  }
  // the saddle cloth hanging over the top of the leg: red with a gold border and fringe
  const cap = () => {
    ctx.beginPath();
    ctx.moveTo(40, -8);
    ctx.lineTo(180, -8);
    ctx.lineTo(186, 40);
    for (let i = 0; i <= 6; i++) {
      const x = 186 - i * 25;
      ctx.quadraticCurveTo(x + 12, 64 + (i % 2) * 6, x - 12, 48);
    }
    ctx.lineTo(34, 40);
    ctx.closePath();
  };
  cap();
  const cg = ctx.createLinearGradient(34, 0, 186, 0);
  cg.addColorStop(0, shade(cloth, -0.35));
  cg.addColorStop(0.35, shade(cloth, 0.15));
  cg.addColorStop(1, shade(cloth, -0.4));
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.save();
  cap();
  ctx.clip();
  band(ctx, 6, 26, shade(cloth, -0.1), gold);
  ctx.restore();
  cap();
  ink(ctx, 4.5);
  for (let i = 0; i <= 6; i++) {
    const x = 174 - i * 25;
    const y = 60 + (i % 2) * 6;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x + 2, y + 16);
    ctx.lineTo(x - 2, y + 16);
    ctx.closePath();
    ctx.fillStyle = gold;
    ctx.fill();
    ink(ctx, 2);
  }
}

// ——— CHARIOT WHEEL: the charioteer's boot in a bronze greave with a red cloth band (the wheel is a prop) ———
function drawChariot(ctx: Ctx, art: FootArt): void {
  const col = art.primary ?? '#8a4a24';
  const bz = art.secondary ?? '#c9873a';
  const cloth = String(art.extra?.cloth ?? '#b8202a');
  bootBody(ctx, col);
  band(ctx, 104, 22, cloth, '#e8b43a');
  bootEnd(ctx, col);
  // the bronze greave over the shin, embossed with a winged disc
  const greave = () => {
    ctx.beginPath();
    ctx.moveTo(52, -8);
    ctx.bezierCurveTo(46, 30, 38, 64, 44, 98);
    ctx.quadraticCurveTo(CX, 112, 176, 98);
    ctx.bezierCurveTo(182, 64, 174, 30, 168, -8);
    ctx.closePath();
  };
  greave();
  ctx.fillStyle = metal(ctx, 38, 182, bz);
  ctx.fill();
  ctx.save();
  greave();
  ctx.clip();
  ctx.fillStyle = rgba('#ffffff', 0.25);
  ctx.beginPath();
  ctx.ellipse(76, 30, 12, 34, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  greave();
  ink(ctx, OUT, outlineOf(bz));
  // the winged disc
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + sx * 12, 48);
    ctx.quadraticCurveTo(CX + sx * 40, 34, CX + sx * 52, 42);
    ctx.quadraticCurveTo(CX + sx * 40, 50, CX + sx * 48, 56);
    ctx.quadraticCurveTo(CX + sx * 30, 58, CX + sx * 12, 56);
    ctx.closePath();
    ctx.fillStyle = shade(bz, 0.35);
    ctx.fill();
    ink(ctx, 2.6, outlineOf(bz));
  }
  ellipse(ctx, CX, 52, 12, 12);
  ctx.fillStyle = metal(ctx, CX - 12, CX + 12, '#f0c040');
  ctx.fill();
  ink(ctx, 2.6);
  curl(ctx, col, bz);
  // the war wheel beside the boot, its rim on the ground
  ctx.save();
  ctx.translate(WHEEL_AT.x, WHEEL_AT.y);
  paintWheel(ctx);
  ctx.restore();
}

// ——— SATRAP'S SLIPPER: crimson silk thick with gold embroidery, a pearl rim, a ruby and a robe hem ———
function drawSatrap(ctx: Ctx, art: FootArt, r: () => number): void {
  const col = art.primary ?? '#a8182e';
  const gold = art.secondary ?? '#f0c040';
  const pearl = String(art.extra?.pearl ?? '#fff4e8');
  bootBody(ctx, col);
  // gold scrollwork: vines curling over the silk, with little leaves
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const x = 26 + (i % 3) * 64 + r() * 10;
    const y = 120 + Math.floor(i / 3) * 40 + r() * 6;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0.3, 5.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 12, y + 2, 6, 3.4, 8.6);
    ctx.stroke();
    ellipse(ctx, x - 8, y - 12, 5, 2.6, -0.6);
    ctx.fillStyle = gold;
    ctx.fill();
  }
  ctx.fillStyle = rgba('#000000', 0.12);
  ctx.fillRect(176, -10, 60, 280);
  bootEnd(ctx, col);
  // the robe's hem over the top: deep plum with a wide gold border and fringe
  const hem = () => {
    ctx.beginPath();
    ctx.moveTo(30, -8);
    ctx.lineTo(190, -8);
    ctx.bezierCurveTo(200, 30, 206, 60, 210, 84);
    ctx.lineTo(10, 84);
    ctx.bezierCurveTo(14, 60, 20, 30, 30, -8);
    ctx.closePath();
  };
  hem();
  const hg = ctx.createLinearGradient(10, 0, 210, 0);
  const plum = art.legColor ?? '#5a1a4a';
  hg.addColorStop(0, shade(plum, -0.3));
  hg.addColorStop(0.35, shade(plum, 0.2));
  hg.addColorStop(1, shade(plum, -0.4));
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.save();
  hem();
  ctx.clip();
  band(ctx, 52, 32, shade(gold, -0.25), gold);
  ctx.restore();
  hem();
  ink(ctx, 4.5);
  for (let x = 18; x <= 202; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 84);
    ctx.lineTo(x, 98);
    ctx.strokeStyle = shade(gold, -0.2);
    ctx.lineWidth = 3;
    ctx.stroke();
    ellipse(ctx, x, 100, 3.2, 3.2);
    ctx.fillStyle = gold;
    ctx.fill();
  }
  // a rim of pearls where the slipper opens
  for (let x = 30; x <= 190; x += 14) {
    const y = 108 + Math.sin((x - 30) / 160 * Math.PI) * 6;
    ellipse(ctx, x, y, 5.5, 5.5);
    const pg = ctx.createRadialGradient(x - 2, y - 2, 0.5, x, y, 5.5);
    pg.addColorStop(0, '#ffffff');
    pg.addColorStop(1, shade(pearl, -0.2));
    ctx.fillStyle = pg;
    ctx.fill();
    ink(ctx, 1.6);
  }
  // the ruby on the vamp, in a gold setting
  ctx.beginPath();
  ctx.moveTo(CX, 168);
  ctx.lineTo(CX + 18, 186);
  ctx.lineTo(CX, 206);
  ctx.lineTo(CX - 18, 186);
  ctx.closePath();
  ctx.fillStyle = metal(ctx, CX - 20, CX + 20, gold);
  ctx.fill();
  ink(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(CX, 174);
  ctx.lineTo(CX + 11, 186);
  ctx.lineTo(CX, 199);
  ctx.lineTo(CX - 11, 186);
  ctx.closePath();
  const rg = ctx.createRadialGradient(CX - 3, 182, 1, CX, 186, 12);
  rg.addColorStop(0, '#ff8a9a');
  rg.addColorStop(0.5, '#d8102e');
  rg.addColorStop(1, '#6a0818');
  ctx.fillStyle = rg;
  ctx.fill();
  ink(ctx, 2);
  ellipse(ctx, CX - 4, 181, 3, 2, -0.6);
  ctx.fillStyle = rgba('#ffffff', 0.8);
  ctx.fill();
  curl(ctx, col, pearl);
}

registerKind('p_immortal', { draw: drawImmortal, contactY: 254, halfWidth: 96 });
registerKind('p_archer', { draw: drawArcher, contactY: 254, halfWidth: 96 });
registerKind('p_cavalry', { draw: drawCavalry, contactY: 262, halfWidth: 92 });
registerKind('p_chariot', { draw: drawChariot, contactY: 254, halfWidth: 96 });
registerKind('p_satrap', { draw: drawSatrap, contactY: 254, halfWidth: 96 });
