// Art kinds for Batpeel's Gotham (a nemesis stage): Bunion's Venom-pumped wrestling boot and the Jokester's
// curly-toed winklepicker. Feet-style pilot rules, like src/content/art/act7.ts: one continuous silhouette
// painted inside a clip, lit from the top left with a rim light on the right and soft occlusion at the sole,
// outlined once. Design frame: centre x = CX (110), the ankle opens at y = -6, the sole sits at contactY.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, outlineOf } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, rgba, roundRect, shade } from '../../art/util';

/** Where Bunion's three Venom vials clip on (design space, contact y 272): left, toe, right. Tubes in play sit here. */
export const VIALS: [number, number][] = [
  [24, 118],
  [CX, 206],
  [196, 118],
];
export const BUNION_CONTACT = 272;
/** Where the Jokester's lapel flower sits (design space, contact y 262): his laughing gas comes out of it. */
export const FLOWER = { x: 168, y: 58, contact: 262 };

// ——— Shared materials ———

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** The key light: a diagonal ramp from the top left (lit) to the bottom right (shadow). */
function lit(ctx: Ctx, base: string, x0: number, y0: number, x1: number, y1: number, k = 0.26): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, shade(base, k));
  g.addColorStop(0.42, base);
  g.addColorStop(1, shade(base, -k * 1.5));
  return g;
}

function rimAndShade(ctx: Ctx, x0: number, x1: number, y0: number, y1: number, rim: string, ao = 0.32): void {
  const r = ctx.createLinearGradient(x1 - 34, 0, x1, 0);
  r.addColorStop(0, rgba(rim, 0));
  r.addColorStop(1, rgba(rim, 0.38));
  ctx.fillStyle = r;
  ctx.fillRect(x1 - 34, y0, 40, y1 - y0);
  const a = ctx.createLinearGradient(0, y1 - 46, 0, y1);
  a.addColorStop(0, 'rgba(0,0,0,0)');
  a.addColorStop(1, `rgba(0,0,0,${ao})`);
  ctx.fillStyle = a;
  ctx.fillRect(x0 - 10, y1 - 46, x1 - x0 + 20, 50);
}

function sheen(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.4, rot = -0.35): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, rgba('#ffffff', a));
  g.addColorStop(1, rgba('#ffffff', 0));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
}

function stud(ctx: Ctx, x: number, y: number, rr: number, base: string): void {
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - rr * 0.4, y - rr * 0.4, 0, x, y, rr);
  g.addColorStop(0, shade(base, 0.6));
  g.addColorStop(1, shade(base, -0.4));
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 2, rgba(INK, 0.7));
}

// ——— BUNION: a hulking high-top wrestling boot, laced tight, a studded strap, and Venom vials clipped on ———

function bunionPath(ctx: Ctx): void {
  // broad, bulging and squat: a shaft that swells at the calf, a wide toe box and a slab sole
  ctx.beginPath();
  ctx.moveTo(CX - 64, -6);
  ctx.bezierCurveTo(CX - 78, 30, CX - 98, 70, CX - 100, 120);
  ctx.bezierCurveTo(CX - 102, 160, CX - 112, 190, CX - 110, 226);
  ctx.bezierCurveTo(CX - 108, 256, CX - 92, 270, CX - 58, 272);
  ctx.lineTo(CX + 58, 272);
  ctx.bezierCurveTo(CX + 92, 270, CX + 108, 256, CX + 110, 226);
  ctx.bezierCurveTo(CX + 112, 190, CX + 102, 160, CX + 100, 120);
  ctx.bezierCurveTo(CX + 98, 70, CX + 78, 30, CX + 64, -6);
  ctx.closePath();
}

function drawBunion(ctx: Ctx, art: FootArt): void {
  const hide = art.primary!;
  const venom = art.secondary!;
  bunionPath(ctx);
  ctx.fillStyle = lit(ctx, hide, -10, -6, 240, 272, 0.34);
  ctx.fill();
  ctx.save();
  bunionPath(ctx);
  ctx.clip();
  // the lace panel down the front: a lighter tongue with criss-cross laces
  ctx.beginPath();
  ctx.moveTo(CX - 30, -6);
  ctx.lineTo(CX - 34, 168);
  ctx.quadraticCurveTo(CX, 182, CX + 34, 168);
  ctx.lineTo(CX + 30, -6);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, shade(hide, 0.18), CX - 34, 0, CX + 34, 170, 0.2);
  ctx.fill();
  ink(ctx, 3, rgba(INK, 0.75));
  for (let y = 16; y < 160; y += 24) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(CX + s * 28, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#c9cfd8';
      ctx.fill();
      ink(ctx, 1.6);
    }
    ctx.beginPath();
    ctx.moveTo(CX - 28, y);
    ctx.lineTo(CX + 28, y + 24);
    ctx.moveTo(CX + 28, y);
    ctx.lineTo(CX - 28, y + 24);
    ink(ctx, 5, INK);
    ink(ctx, 2.6, '#e8e2d2');
  }
  // the studded strap across the calf
  roundRect(ctx, -10, 54, 240, 26, 6);
  ctx.fillStyle = lit(ctx, '#1a1b20', 0, 54, 0, 80, 0.4);
  ctx.fill();
  ink(ctx, 3, rgba(INK, 0.9));
  for (let x = 14; x < 210; x += 22) if (Math.abs(x - CX) > 36) stud(ctx, x, 67, 5.5, '#c9cfd8');
  // the buckle
  roundRect(ctx, CX - 18, 52, 36, 30, 5);
  ctx.fillStyle = lit(ctx, '#b8bec8', CX - 18, 52, CX + 18, 82, 0.5);
  ctx.fill();
  ink(ctx, 3);
  roundRect(ctx, CX - 9, 60, 18, 14, 3);
  ctx.fillStyle = '#1a1b20';
  ctx.fill();
  // Venom hoses: dark rubber from each vial up into the cuff, ribbed, with a green gleam
  const hose = (x0: number, y0: number, x1: number, y1: number, bend: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + bend, y0 - 40, x1 - bend * 0.4, y1 + 50, x1, y1);
    ink(ctx, 14, INK);
    ink(ctx, 9, '#24302a');
    ink(ctx, 3, rgba(venom, 0.55));
  };
  hose(VIALS[0][0] + 6, VIALS[0][1] - 40, CX - 52, -6, 18);
  hose(VIALS[2][0] - 6, VIALS[2][1] - 40, CX + 52, -6, -18);
  hose(VIALS[1][0] + 26, VIALS[1][1] - 10, CX + 40, -6, 30);
  // vial clamps on the sides and toe (the vials themselves are props in play)
  for (const [vx, vy] of VIALS) {
    roundRect(ctx, vx - 24, vy - 46, 48, 14, 5);
    ctx.fillStyle = lit(ctx, '#9aa3ad', vx - 24, vy - 46, vx + 24, vy - 32, 0.5);
    ctx.fill();
    ink(ctx, 3);
    roundRect(ctx, vx - 24, vy + 32, 48, 14, 5);
    ctx.fillStyle = lit(ctx, '#9aa3ad', vx - 24, vy + 32, vx + 24, vy + 46, 0.5);
    ctx.fill();
    ink(ctx, 3);
    // the empty socket glass, dark until a vial glows in it
    roundRect(ctx, vx - 15, vy - 32, 30, 64, 10);
    ctx.fillStyle = rgba('#0a120c', 0.75);
    ctx.fill();
    ink(ctx, 2.5, rgba(INK, 0.9));
  }
  // a toe cap scuffed from the ring, and stitching round it
  ctx.beginPath();
  ctx.moveTo(-10, 196);
  ctx.bezierCurveTo(40, 168, 180, 168, 230, 196);
  ctx.lineTo(230, 290);
  ctx.lineTo(-10, 290);
  ctx.closePath();
  ctx.fillStyle = rgba('#000000', 0.18);
  ctx.fill();
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(4, 202);
  ctx.bezierCurveTo(50, 180, 170, 180, 216, 202);
  ink(ctx, 2, rgba('#d8d0c0', 0.5));
  ctx.restore();
  // swollen green veins across the leather (the Venom showing through)
  for (const [x0, y0, x1, y1] of [
    [30, 160, 70, 120],
    [150, 120, 196, 170],
    [50, 240, 92, 214],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 10, (y0 + y1) / 2 - 12, x1, y1);
    ink(ctx, 5, rgba(shade(venom, -0.5), 0.55));
    ink(ctx, 2, rgba(venom, 0.45));
  }
  // the thick lugged sole
  ctx.fillStyle = '#16171b';
  ctx.fillRect(-10, 250, 240, 30);
  for (let x = 6; x < 220; x += 26) {
    roundRect(ctx, x, 256, 16, 10, 3);
    ctx.fillStyle = '#2e3038';
    ctx.fill();
  }
  sheen(ctx, 52, 96, 18, 44, 0.3, 0.25);
  sheen(ctx, 60, 214, 26, 12, 0.35, -0.2);
  rimAndShade(ctx, -10, 230, -6, 272, '#b8ffb0', 0.38);
  ctx.restore();
  bunionPath(ctx);
  ink(ctx, OUT + 0.5, outlineOf(hide));
}

// ——— THE JOKESTER: a plum winklepicker with pinstripes, a green spat, a painted grin and a curling toe ———

function jokesterPath(ctx: Ctx): void {
  // slim at the ankle, a long body that narrows into a pointed toe, which curls up into a spiral
  ctx.beginPath();
  ctx.moveTo(CX - 50, -6);
  ctx.bezierCurveTo(CX - 56, 50, CX - 96, 110, CX - 100, 160);
  ctx.bezierCurveTo(CX - 104, 206, CX - 70, 240, CX - 30, 252);
  ctx.bezierCurveTo(CX - 12, 258, CX + 4, 262, CX + 24, 258);
  // the curled tip: out to the right and back up over itself
  ctx.bezierCurveTo(CX + 62, 252, CX + 100, 236, CX + 112, 206);
  ctx.bezierCurveTo(CX + 122, 180, CX + 104, 160, CX + 86, 170);
  ctx.bezierCurveTo(CX + 96, 140, CX + 98, 110, CX + 84, 80);
  ctx.bezierCurveTo(CX + 70, 50, CX + 54, 30, CX + 50, -6);
  ctx.closePath();
}

function drawJokester(ctx: Ctx, art: FootArt): void {
  const plum = art.primary!;
  const lime = art.secondary!;
  const grin = String(art.extra?.grin ?? '#e0202a');
  jokesterPath(ctx);
  ctx.fillStyle = lit(ctx, plum, -10, -6, 230, 262, 0.34);
  ctx.fill();
  ctx.save();
  jokesterPath(ctx);
  ctx.clip();
  // pinstripes that follow the curve of the shoe
  for (let i = -6; i < 12; i++) {
    const x = 10 + i * 18;
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.bezierCurveTo(x + 4, 90, x + 26, 170, x + 50, 270);
    ink(ctx, 1.6, rgba('#d8b8ff', 0.28));
  }
  // the acid-green spat over the upper, buttoned up the side
  ctx.beginPath();
  ctx.moveTo(CX - 54, -6);
  ctx.bezierCurveTo(CX - 60, 40, CX - 84, 84, CX - 92, 116);
  ctx.quadraticCurveTo(CX, 136, CX + 88, 100);
  ctx.bezierCurveTo(CX + 72, 60, CX + 58, 30, CX + 54, -6);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, lime, 0, -6, 200, 130, 0.3);
  ctx.fill();
  ink(ctx, 3.5, rgba(INK, 0.85));
  for (let k = 0; k < 4; k++) {
    const y = 14 + k * 24;
    const x = CX - 50 - k * 9;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = lit(ctx, '#7a3ab0', x - 6, y - 6, x + 6, y + 6, 0.5);
    ctx.fill();
    ink(ctx, 2);
  }
  // a playing card tucked in the spat: a slice suit of our own, not a real card
  ctx.save();
  ctx.translate(CX + 40, 50);
  ctx.rotate(0.32);
  roundRect(ctx, -20, -30, 40, 56, 6);
  ctx.fillStyle = '#fbf6ea';
  ctx.fill();
  ink(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(-9, -8);
  ctx.quadraticCurveTo(0, -14, 9, -8);
  ctx.lineTo(0, 12);
  ctx.closePath();
  ctx.fillStyle = grin;
  ctx.fill();
  ink(ctx, 1.6);
  ctx.font = "bold 13px 'Lilita One', sans-serif";
  ctx.fillStyle = INK;
  ctx.fillText('J', -16, -16);
  ctx.restore();
  // the painted face on the vamp: a white diamond mask with sly eyes and a huge red grin
  ctx.beginPath();
  ctx.moveTo(CX - 4, 130);
  ctx.quadraticCurveTo(CX + 64, 150, CX + 72, 196);
  ctx.quadraticCurveTo(CX + 30, 246, CX - 20, 236);
  ctx.quadraticCurveTo(CX - 76, 210, CX - 72, 176);
  ctx.quadraticCurveTo(CX - 52, 140, CX - 4, 130);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, art.skin, CX - 70, 130, CX + 70, 240, 0.12);
  ctx.fill();
  ink(ctx, 3, rgba(INK, 0.7));
  for (const [ex, ey, rot] of [
    [CX - 30, 164, -0.25],
    [CX + 22, 162, 0.25],
  ] as const) {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(rot);
    // diamond eye paint, then a narrow sly eye
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 16);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fillStyle = rgba('#3a1a5a', 0.85);
    ctx.fill();
    ellipse(ctx, 0, 1, 8, 4.5);
    ctx.fillStyle = '#fff8e0';
    ctx.fill();
    ink(ctx, 1.6);
    ellipse(ctx, 2, 1, 3, 3.5);
    ctx.fillStyle = '#2a8a2a';
    ctx.fill();
    ctx.restore();
  }
  // the grin: corner to corner, with a row of teeth
  ctx.beginPath();
  ctx.moveTo(CX - 52, 190);
  ctx.quadraticCurveTo(CX - 6, 236, CX + 52, 186);
  ctx.quadraticCurveTo(CX - 4, 214, CX - 52, 190);
  ctx.closePath();
  ctx.fillStyle = grin;
  ctx.fill();
  ink(ctx, 3);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(CX - 50, 196, 100, 9);
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 1.5;
  for (let x = CX - 40; x < CX + 46; x += 11) {
    ctx.beginPath();
    ctx.moveTo(x, 196);
    ctx.lineTo(x, 205);
    ctx.stroke();
  }
  ctx.restore();
  // smile creases at the corners
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(CX + s * 56, 186 + (s < 0 ? 4 : 0), 8, s < 0 ? -0.4 : Math.PI - 0.6, s < 0 ? 1.4 : Math.PI + 1.2);
    ink(ctx, 2.4, rgba(INK, 0.7));
  }
  // the curl's spiral line, and a little red pompom at its tip
  ctx.beginPath();
  ctx.moveTo(CX + 30, 254);
  ctx.bezierCurveTo(CX + 76, 246, CX + 108, 222, CX + 106, 196);
  ctx.bezierCurveTo(CX + 104, 178, CX + 90, 178, CX + 88, 188);
  ink(ctx, 3, rgba(INK, 0.6));
  // the sole: a thin lime welt and a shiny black heel line
  ctx.beginPath();
  ctx.moveTo(CX - 80, 236);
  ctx.bezierCurveTo(CX - 40, 262, CX + 20, 266, CX + 70, 250);
  ink(ctx, 6, '#18121e');
  ink(ctx, 2, rgba(lime, 0.8));
  sheen(ctx, 50, 70, 16, 40, 0.35, 0.3);
  sheen(ctx, CX - 34, 220, 22, 9, 0.3, -0.3);
  rimAndShade(ctx, -10, 230, -6, 262, '#e8c8ff', 0.36);
  ctx.restore();
  jokesterPath(ctx);
  ink(ctx, OUT + 0.5, outlineOf(plum));
  // the pompom on the curled tip, outside the clip so it reads as its own bobble
  ctx.beginPath();
  ctx.arc(CX + 86, 172, 13, 0, Math.PI * 2);
  ctx.fillStyle = lit(ctx, grin, CX + 73, 159, CX + 99, 185, 0.4);
  ctx.fill();
  ink(ctx, 3.5);
  sheen(ctx, CX + 81, 166, 5, 3, 0.7);
  // the lapel flower pinned on the side (the laughing gas comes out of it in play)
  const F = FLOWER;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    ellipse(ctx, F.x + Math.cos(a) * 12, F.y + Math.sin(a) * 12, 10, 7, a);
    ctx.fillStyle = lit(ctx, '#fbf6ea', F.x - 20, F.y - 20, F.x + 20, F.y + 20, 0.2);
    ctx.fill();
    ink(ctx, 2.4);
  }
  ctx.beginPath();
  ctx.arc(F.x, F.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = lit(ctx, lime, F.x - 8, F.y - 8, F.x + 8, F.y + 8, 0.5);
  ctx.fill();
  ink(ctx, 2.4);
  sheen(ctx, F.x - 3, F.y - 3, 3, 2, 0.8);
}

registerKind('gt_bunion', { draw: drawBunion, contactY: BUNION_CONTACT, halfWidth: 112 });
registerKind('gt_jokester', { draw: drawJokester, contactY: FLOWER.contact, halfWidth: 108 });
