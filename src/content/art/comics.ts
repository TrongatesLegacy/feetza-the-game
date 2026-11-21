// Art kinds for the comic heroes' nemesis bosses (src/content/feet/comics.ts): the Red Sole's polished jackboot with a
// crimson skull toe cap and a HYDRANT armband; Venomnom, a sneaker swallowed by a glossy black symbiote, all grin and
// tongue; and the Cheetoe, a cheese-dust cat-sneaker with rosettes, ears, claws and a lashing tail. Same rules as the
// other Feetza 2.0 kinds (src/content/art/gotham.ts): one silhouette painted inside a clip, lit from the top left
// with a rim light on the right, outlined once. Design frame: centre x = CX (110), ankle at y = -6, sole at contactY.
// Every emblem is our own.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, outlineOf } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, rgba, roundRect, shade } from '../../art/util';

/** Venomnom's mouth (design space, contact y 266): its tongue lashes out from here in play. */
export const NOM_MOUTH = { x: CX + 6, y: 196, contact: 266 };

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

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

// ——— THE RED SOLE: a tall polished jackboot, a crimson skull toe cap, a HYDRANT armband ———

function redPath(ctx: Ctx): void {
  // a tall straight shaft that kicks forward into a long, hard-toed boot
  ctx.beginPath();
  ctx.moveTo(CX - 62, -6);
  ctx.bezierCurveTo(CX - 66, 50, CX - 70, 110, CX - 84, 160);
  ctx.bezierCurveTo(CX - 100, 206, CX - 102, 250, CX - 80, 268);
  ctx.lineTo(CX + 78, 268);
  ctx.bezierCurveTo(CX + 108, 266, CX + 116, 236, CX + 106, 206);
  ctx.bezierCurveTo(CX + 96, 176, CX + 72, 150, CX + 66, 110);
  ctx.bezierCurveTo(CX + 62, 60, CX + 60, 20, CX + 62, -6);
  ctx.closePath();
}

function hydrantEmblem(ctx: Ctx, x: number, y: number, s: number, col: string): void {
  // our own emblem: a fire hydrant with six tentacle arms curling out from its base
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  for (let k = 0; k < 6; k++) {
    const a = Math.PI * (0.15 + (k / 5) * 0.7);
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(Math.cos(a) * 18, 6 + Math.sin(a) * 4, Math.cos(a) * 20, 14 + Math.sin(a) * 6);
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  roundRect(ctx, -7, -12, 14, 20, 3);
  ctx.fillStyle = col;
  ctx.fill();
  roundRect(ctx, -10, -15, 20, 5, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -16, 5, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-12, -6, 24, 5);
  ctx.restore();
}

function drawRedSole(ctx: Ctx, art: FootArt): void {
  const leather = art.primary!;
  const red = art.secondary!;
  redPath(ctx);
  ctx.fillStyle = lit(ctx, leather, -10, -6, 240, 268, 0.5);
  ctx.fill();
  ctx.save();
  redPath(ctx);
  ctx.clip();
  // the shine of polished leather: a long highlight down the shaft and creases at the ankle
  sheen(ctx, CX - 34, 70, 14, 70, 0.32, 0.06);
  ctx.strokeStyle = rgba('#000000', 0.45);
  ctx.lineWidth = 3;
  for (const y of [128, 142, 156]) {
    ctx.beginPath();
    ctx.moveTo(CX - 80, y);
    ctx.quadraticCurveTo(CX, y + 12, CX + 70, y - 6);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba('#ffffff', 0.12);
  ctx.lineWidth = 2;
  for (const y of [132, 146]) {
    ctx.beginPath();
    ctx.moveTo(CX - 78, y);
    ctx.quadraticCurveTo(CX, y + 12, CX + 68, y - 6);
    ctx.stroke();
  }
  // the crimson armband with the HYDRANT emblem
  roundRect(ctx, -10, 30, 240, 40, 6);
  ctx.fillStyle = lit(ctx, red, 0, 30, 0, 70, 0.3);
  ctx.fill();
  ink(ctx, 3, rgba(INK, 0.9));
  ctx.beginPath();
  ctx.arc(CX, 50, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#f4efe6';
  ctx.fill();
  ink(ctx, 2.5);
  hydrantEmblem(ctx, CX, 50, 0.62, '#1e1c20');
  // the strap and its brass buckle across the instep
  ctx.beginPath();
  ctx.moveTo(CX - 92, 186);
  ctx.quadraticCurveTo(CX, 168, CX + 92, 182);
  ctx.lineTo(CX + 96, 200);
  ctx.quadraticCurveTo(CX, 186, CX - 96, 204);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, '#2c2a30', 0, 168, 0, 204, 0.4);
  ctx.fill();
  ink(ctx, 3);
  roundRect(ctx, CX + 34, 176, 26, 22, 4);
  ctx.fillStyle = lit(ctx, '#d8b060', CX + 34, 176, CX + 60, 198, 0.5);
  ctx.fill();
  ink(ctx, 2.5);
  // the crimson skull toe cap: a domed cap with hollow eyes, a nose and clenched teeth
  ctx.beginPath();
  ctx.moveTo(CX - 98, 268);
  ctx.bezierCurveTo(CX - 100, 214, CX - 40, 196, CX + 20, 200);
  ctx.bezierCurveTo(CX + 86, 204, CX + 116, 226, CX + 110, 268);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, red, CX - 90, 200, CX + 110, 268, 0.4);
  ctx.fill();
  ink(ctx, 3.5);
  for (const dx of [-26, 30]) {
    ellipse(ctx, CX + dx, 226, 17, 12, dx < 0 ? 0.2 : -0.2);
    ctx.fillStyle = '#1a0606';
    ctx.fill();
    ink(ctx, 2.5);
  }
  ctx.beginPath();
  ctx.moveTo(CX + 2, 234);
  ctx.lineTo(CX - 6, 248);
  ctx.lineTo(CX + 10, 248);
  ctx.closePath();
  ctx.fillStyle = '#1a0606';
  ctx.fill();
  roundRect(ctx, CX - 34, 252, 72, 12, 3);
  ctx.fillStyle = '#f0e6d8';
  ctx.fill();
  ink(ctx, 2.2);
  for (let k = 1; k < 6; k++) {
    ctx.beginPath();
    ctx.moveTo(CX - 34 + k * 12, 252);
    ctx.lineTo(CX - 34 + k * 12, 264);
    ink(ctx, 1.6);
  }
  sheen(ctx, CX - 46, 218, 20, 8, 0.45, -0.3);
  // the heavy sole and heel
  ctx.fillStyle = '#100e12';
  ctx.fillRect(-10, 262, 240, 12);
  rimAndShade(ctx, -10, 230, -6, 268, '#ff9a8a', 0.4);
  ctx.restore();
  redPath(ctx);
  ink(ctx, OUT + 0.5, outlineOf(leather));
}

// ——— VENOMNOM: a sneaker swallowed by a glossy black symbiote, all grin and tongue ———

function nomPath(ctx: Ctx): void {
  // a chunky high-top gone lumpy: the goo bulges at the heel and the toe
  ctx.beginPath();
  ctx.moveTo(CX - 60, -6);
  ctx.bezierCurveTo(CX - 74, 40, CX - 70, 80, CX - 92, 120);
  ctx.bezierCurveTo(CX - 116, 160, CX - 112, 230, CX - 84, 262);
  ctx.quadraticCurveTo(CX, 274, CX + 92, 262);
  ctx.bezierCurveTo(CX + 122, 240, CX + 120, 190, CX + 98, 150);
  ctx.bezierCurveTo(CX + 78, 110, CX + 70, 50, CX + 62, -6);
  ctx.closePath();
}

function drawVenomnom(ctx: Ctx, art: FootArt): void {
  const goo = art.primary!;
  const white = art.secondary!;
  const tongue = String(art.extra?.tongue ?? '#e0507a');
  // goo drips hanging off the outline (behind)
  for (const [x, y, l] of [[CX - 104, 200, 36], [CX + 112, 210, 28], [CX - 70, 96, 30]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.quadraticCurveTo(x - 6, y + l, x, y + l + 6);
    ctx.quadraticCurveTo(x + 6, y + l, x + 8, y);
    ctx.closePath();
    ctx.fillStyle = '#16161e';
    ctx.fill();
    ink(ctx, 3);
  }
  nomPath(ctx);
  ctx.fillStyle = lit(ctx, '#3a3a50', -10, -6, 240, 266, 0.4);
  ctx.fill();
  ctx.save();
  nomPath(ctx);
  ctx.clip();
  ctx.fillStyle = lit(ctx, goo, -10, -6, 240, 266, 0.5);
  ctx.fillRect(-20, -10, 260, 290);
  // glossy blue-violet highlights rolling over the goo
  sheen(ctx, CX - 44, 70, 18, 60, 0.38, 0.1);
  sheen(ctx, CX + 36, 140, 12, 30, 0.22, -0.4);
  ctx.strokeStyle = rgba('#7a8aff', 0.35);
  ctx.lineWidth = 3;
  for (const [x0, y0, x1, y1] of [[CX - 80, 150, CX - 50, 100], [CX + 70, 120, CX + 90, 170], [CX - 30, 30, CX - 10, 80]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 14, (y0 + y1) / 2, x1, y1);
    ctx.stroke();
  }
  // the white spider shape stretched across the shaft (our own, jagged)
  ctx.beginPath();
  ctx.moveTo(CX, 20);
  for (const [dx, dy] of [[-16, 60], [-60, 40], [-30, 78], [-74, 108], [-20, 96], [0, 128], [20, 96], [74, 108], [30, 78], [60, 40], [16, 60]]) ctx.lineTo(CX + dx, dy);
  ctx.closePath();
  ctx.fillStyle = white;
  ctx.fill();
  ink(ctx, 3);
  // the eyes: two big white teardrop patches
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 14, 132);
    ctx.bezierCurveTo(CX + s * 18, 120, CX + s * 74, 112, CX + s * 82, 130);
    ctx.bezierCurveTo(CX + s * 84, 150, CX + s * 40, 162, CX + s * 18, 150);
    ctx.closePath();
    ctx.fillStyle = white;
    ctx.fill();
    ink(ctx, 3.5);
  }
  // the grin: a huge mouth across the toe with jagged white teeth
  const M = NOM_MOUTH;
  ctx.beginPath();
  ctx.moveTo(CX - 96, 186);
  ctx.quadraticCurveTo(CX, 266, CX + 104, 180);
  ctx.quadraticCurveTo(CX + 4, 214, CX - 96, 186);
  ctx.closePath();
  ctx.fillStyle = '#3a0a14';
  ctx.fill();
  ink(ctx, 3);
  ctx.save();
  ctx.clip();
  // the tongue lolling in the mouth
  ellipse(ctx, M.x + 18, M.y + 30, 34, 16, -0.15);
  ctx.fillStyle = lit(ctx, tongue, M.x - 10, M.y + 14, M.x + 50, M.y + 46, 0.3);
  ctx.fill();
  ink(ctx, 2.5);
  ctx.restore();
  ctx.fillStyle = '#fbfbff';
  for (let k = 0; k < 11; k++) {
    const t = (k + 0.5) / 11;
    const x = CX - 92 + t * 194;
    const yTop = 186 + Math.sin(t * Math.PI) * 18 - (t > 0.5 ? (t - 0.5) * 12 : 0);
    ctx.beginPath();
    ctx.moveTo(x - 8, yTop);
    ctx.lineTo(x + 8, yTop);
    ctx.lineTo(x, yTop + 15);
    ctx.closePath();
    ctx.fill();
    ink(ctx, 1.8);
    const yBot = 186 + Math.sin(t * Math.PI) * 56;
    ctx.beginPath();
    ctx.moveTo(x - 7, yBot);
    ctx.lineTo(x + 7, yBot);
    ctx.lineTo(x, yBot - 13);
    ctx.closePath();
    ctx.fill();
    ink(ctx, 1.8);
  }
  rimAndShade(ctx, -10, 230, -6, 266, '#9a8aff', 0.4);
  ctx.restore();
  nomPath(ctx);
  ink(ctx, OUT + 0.5, '#0a0a10');
}

// ——— THE CHEETOE: a cheese-dust cat-sneaker with rosettes, cat ears at the ankle, claws and a tail ———

function cheetPath(ctx: Ctx): void {
  // a lithe, low cat-paw sneaker: a slim ankle with two ears, a long sleek body, a rounded paw-toe
  ctx.beginPath();
  ctx.moveTo(CX - 58, -6);
  ctx.lineTo(CX - 62, -26);
  ctx.lineTo(CX - 32, -10);
  ctx.lineTo(CX + 32, -10);
  ctx.lineTo(CX + 62, -26);
  ctx.lineTo(CX + 58, -6);
  ctx.bezierCurveTo(CX + 56, 60, CX + 80, 110, CX + 100, 160);
  ctx.bezierCurveTo(CX + 118, 206, CX + 110, 252, CX + 78, 262);
  ctx.lineTo(CX - 78, 262);
  ctx.bezierCurveTo(CX - 108, 252, CX - 112, 206, CX - 96, 160);
  ctx.bezierCurveTo(CX - 80, 110, CX - 56, 60, CX - 58, -6);
  ctx.closePath();
}

function drawCheetoe(ctx: Ctx, art: FootArt, r: () => number): void {
  const fur = art.primary!;
  const dark = art.secondary!;
  const claw = String(art.extra?.claw ?? '#fff6e8');
  // the tail curling out behind the heel (behind the foot)
  ctx.beginPath();
  ctx.moveTo(CX - 70, 150);
  ctx.bezierCurveTo(CX - 150, 140, CX - 160, 40, CX - 120, 10);
  ctx.bezierCurveTo(CX - 110, 2, CX - 96, 10, CX - 102, 22);
  ctx.bezierCurveTo(CX - 130, 50, CX - 126, 120, CX - 66, 128);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, fur, CX - 160, 0, CX - 60, 150, 0.3);
  ctx.fill();
  ink(ctx, 4.5);
  for (const [x, y] of [[CX - 128, 40], [CX - 136, 80], [CX - 116, 118]]) {
    ellipse(ctx, x, y, 6, 4);
    ctx.fillStyle = dark;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(CX - 112, 14, 9, 0, Math.PI * 2);
  ctx.fillStyle = dark;
  ctx.fill();
  cheetPath(ctx);
  ctx.fillStyle = lit(ctx, fur, -10, -40, 240, 262, 0.34);
  ctx.fill();
  ctx.save();
  cheetPath(ctx);
  ctx.clip();
  // cheese dust: a fine speckle of lighter orange
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = rgba(r() < 0.5 ? '#ffd890' : '#ffb850', 0.4);
    ctx.fillRect(r() * 220, -40 + r() * 300, 2, 2);
  }
  // rosettes: broken rings of dark spots with a deeper middle
  for (let i = 0; i < 16; i++) {
    const x = 20 + r() * 180;
    const y = 10 + r() * 190;
    if (Math.abs(x - CX) < 40 && y > 70 && y < 150) continue;
    ellipse(ctx, x, y, 9, 7, r());
    ctx.fillStyle = rgba(shade(fur, -0.25), 0.8);
    ctx.fill();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + r();
      ellipse(ctx, x + Math.cos(a) * 9, y + Math.sin(a) * 7, 4, 3, a);
      ctx.fillStyle = dark;
      ctx.fill();
    }
  }
  // the inner ears
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 56, -12);
    ctx.lineTo(CX + s * 58, -20);
    ctx.lineTo(CX + s * 40, -12);
    ctx.closePath();
    ctx.fillStyle = '#f4b0a0';
    ctx.fill();
  }
  // a cream underside where the paw meets the floor
  ctx.beginPath();
  ctx.moveTo(-10, 222);
  ctx.quadraticCurveTo(CX, 200, 230, 222);
  ctx.lineTo(230, 270);
  ctx.lineTo(-10, 270);
  ctx.closePath();
  ctx.fillStyle = '#fff0d8';
  ctx.fill();
  ink(ctx, 3, rgba(INK, 0.6));
  // the face on the instep: slit-pupil eyes, a pink nose and whisker dots
  for (const s of [-1, 1]) {
    ellipse(ctx, CX + s * 24, 104, 15, 11, s * 0.25);
    ctx.fillStyle = '#d8ff6a';
    ctx.fill();
    ink(ctx, 3);
    ellipse(ctx, CX + s * 24, 104, 3, 9);
    ctx.fillStyle = '#1a1008';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(CX - 8, 126);
  ctx.lineTo(CX + 8, 126);
  ctx.lineTo(CX, 136);
  ctx.closePath();
  ctx.fillStyle = '#e06a7a';
  ctx.fill();
  ink(ctx, 2);
  ctx.beginPath();
  ctx.moveTo(CX, 136);
  ctx.quadraticCurveTo(CX - 10, 148, CX - 20, 142);
  ctx.moveTo(CX, 136);
  ctx.quadraticCurveTo(CX + 10, 148, CX + 20, 142);
  ink(ctx, 2.5);
  sheen(ctx, CX - 46, 60, 14, 40, 0.3, 0.2);
  rimAndShade(ctx, -10, 230, -40, 262, '#fff0c0', 0.36);
  ctx.restore();
  cheetPath(ctx);
  ink(ctx, OUT + 0.5, outlineOf(fur));
  // whiskers, outside the silhouette
  for (const s of [-1, 1]) {
    for (const dy of [-6, 4, 14]) {
      ctx.beginPath();
      ctx.moveTo(CX + s * 30, 140 + dy * 0.4);
      ctx.quadraticCurveTo(CX + s * 80, 132 + dy, CX + s * 128, 128 + dy * 1.6);
      ink(ctx, 2, rgba(INK, 0.7));
    }
  }
  // the claws curving out over the front of the paw
  for (let k = 0; k < 4; k++) {
    const x = CX - 54 + k * 36;
    ctx.beginPath();
    ctx.moveTo(x - 7, 244);
    ctx.quadraticCurveTo(x, 270, x + 10, 280);
    ctx.quadraticCurveTo(x + 6, 260, x + 7, 244);
    ctx.closePath();
    ctx.fillStyle = claw;
    ctx.fill();
    ink(ctx, 2.5);
  }
}

registerKind('cm_redsole', { draw: drawRedSole, contactY: 268, halfWidth: 108 });
registerKind('cm_venomnom', { draw: drawVenomnom, contactY: NOM_MOUTH.contact, halfWidth: 114 });
registerKind('cm_cheetoe', { draw: drawCheetoe, contactY: 270, halfWidth: 106 });
