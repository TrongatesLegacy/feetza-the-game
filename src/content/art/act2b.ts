// Art kinds for the Stage 10–12 fights: the Zombie Loafer (the cellar mini-boss, id poltergeist in
// src/content/feet/bosses.ts). Same design frame as kinds-bosses.ts: centre x = CX (110), the ankle
// opens at y = -6, the leg comes from FootArt.leg and the canvas spans x -40..260, y -8..337.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, drawToe, glossy, leatherFill, outlineOf } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, rgba, roundRect, shade } from '../../art/util';

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** Cross-stitches along a line: a dark seam with little ties across it. */
function stitches(ctx: Ctx, pts: [number, number][], n: number): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ink(ctx, 4, '#3a2a20');
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
    const k = t * (pts.length - 1) - seg;
    const [x0, y0] = pts[seg];
    const [x1, y1] = pts[seg + 1];
    const x = x0 + (x1 - x0) * k;
    const y = y0 + (y1 - y0) * k;
    const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * 10, y - Math.sin(a) * 10);
    ctx.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
    ink(ctx, 6, INK);
    ink(ctx, 3, '#e8dcc0');
  }
}

// ——— ZOMBIE LOAFER: a rotten penny loafer, stitched up, with a torn sock and a dangling toe ———

function drawZombieLoafer(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const sock = art.secondary!;
  const skin = art.skin;
  // torn sock over the ankle
  const sockPath = () => {
    ctx.beginPath();
    ctx.moveTo(54, -6);
    ctx.bezierCurveTo(52, 50, 30, 90, 26, 140);
    ctx.lineTo(196, 140);
    ctx.bezierCurveTo(192, 90, 168, 50, 166, -6);
    ctx.closePath();
  };
  sockPath();
  ctx.fillStyle = leatherFill(ctx, sock);
  ctx.fill();
  ctx.save();
  sockPath();
  ctx.clip();
  // ribbing
  ctx.strokeStyle = rgba(INK, 0.22);
  ctx.lineWidth = 3;
  for (let x = 30; x < 200; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.lineTo(x + (x - CX) * 0.15, 140);
    ctx.stroke();
  }
  // holes in the sock showing grey-green skin
  for (const [x, y, rx, ry] of [[80, 40, 16, 12], [146, 76, 12, 16], [64, 104, 10, 8]] as const) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const j = 0.7 + r() * 0.5;
      const px = x + Math.cos(a) * rx * j;
      const py = y + Math.sin(a) * ry * j;
      if (k) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = shade(skin, -0.05);
    ctx.fill();
    ink(ctx, 3, outlineOf(sock));
    // dangling threads
    ctx.beginPath();
    ctx.moveTo(x - rx * 0.4, y + ry * 0.8);
    ctx.quadraticCurveTo(x - rx * 0.2, y + ry * 1.8, x + 2, y + ry * 2.2);
    ink(ctx, 2.5, shade(sock, -0.3));
  }
  ctx.restore();
  sockPath();
  ink(ctx, OUT, outlineOf(sock));
  // the dangling toe hangs below the front by a thread (drawn first, behind the sole flap)
  ctx.beginPath();
  ctx.moveTo(150, 250);
  ctx.bezierCurveTo(156, 272, 146, 286, 152, 300);
  ink(ctx, 3, '#d8cfb0');
  ctx.save();
  ctx.translate(152, 312);
  ctx.rotate(0.35);
  drawToe(ctx, { cx: 0, cy: 0, rx: 15, ry: 19 }, skin, { nail: '#6a6a3a', ol: outlineOf(skin), lw: 4 });
  ctx.restore();
  // sole, with the front peeled open like a mouth
  ctx.beginPath();
  ctx.moveTo(10, 222);
  ctx.bezierCurveTo(12, 252, 48, 262, 88, 262);
  ctx.lineTo(96, 262);
  ctx.lineTo(108, 248);
  ctx.lineTo(208, 236);
  ctx.bezierCurveTo(214, 230, 212, 222, 208, 218);
  ctx.closePath();
  ctx.fillStyle = '#3a3428';
  ctx.fill();
  ink(ctx);
  // the flap hangs down at the toe
  ctx.beginPath();
  ctx.moveTo(108, 248);
  ctx.lineTo(208, 236);
  ctx.lineTo(214, 262);
  ctx.quadraticCurveTo(170, 282, 118, 272);
  ctx.closePath();
  ctx.fillStyle = '#4a4234';
  ctx.fill();
  ink(ctx);
  // a couple of loose nails like teeth
  for (const x of [130, 158, 186]) {
    ctx.beginPath();
    ctx.moveTo(x - 5, 248 - (x - 108) * 0.12);
    ctx.lineTo(x, 238 - (x - 108) * 0.12);
    ctx.lineTo(x + 5, 248 - (x - 108) * 0.12);
    ctx.closePath();
    ctx.fillStyle = '#c8c0a8';
    ctx.fill();
    ink(ctx, 2.5);
  }
  // loafer body
  const shoe = () => {
    ctx.beginPath();
    ctx.moveTo(18, 132);
    ctx.bezierCurveTo(4, 176, 6, 228, 40, 240);
    ctx.bezierCurveTo(90, 252, 150, 240, 206, 228);
    ctx.bezierCurveTo(222, 200, 216, 156, 204, 130);
    ctx.bezierCurveTo(170, 120, 150, 146, CX, 146);
    ctx.bezierCurveTo(70, 146, 50, 120, 18, 132);
    ctx.closePath();
  };
  shoe();
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoe();
  ctx.clip();
  // rot patches
  for (let i = 0; i < 7; i++) {
    ellipse(ctx, 20 + r() * 190, 150 + r() * 90, 10 + r() * 18, 6 + r() * 12, r() * 3);
    ctx.fillStyle = rgba(r() > 0.5 ? '#3a4a20' : '#6a5a3a', 0.35 + r() * 0.2);
    ctx.fill();
  }
  // moc seam
  ctx.beginPath();
  ctx.moveTo(40, 236);
  ctx.bezierCurveTo(40, 176, 180, 170, 196, 226);
  ink(ctx, 3.5, rgba(INK, 0.6));
  glossy(ctx, CX - 46, 186, 22, 36, 0.18);
  ctx.restore();
  shoe();
  ink(ctx, OUT, outlineOf(p));
  // penny strap with the slot (a mouldy penny still in it)
  roundRect(ctx, 46, 156, 132, 26, 8);
  ctx.fillStyle = shade(p, -0.18);
  ctx.fill();
  ink(ctx, 4, outlineOf(p));
  roundRect(ctx, 92, 162, 40, 14, 7);
  ctx.fillStyle = '#1e1a10';
  ctx.fill();
  ellipse(ctx, 112, 166, 13, 8);
  ctx.fillStyle = '#8a9a4a';
  ctx.fill();
  ink(ctx, 2.5);
  // a stitched-up tear across the vamp
  stitches(ctx, [[30, 198], [70, 214], [120, 204], [170, 220], [200, 210]], 8);
  // grime drips off the collar
  for (const [x, len] of [[34, 26], [178, 20]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 6, 134);
    ctx.quadraticCurveTo(x - 6, 134 + len, x, 138 + len);
    ctx.quadraticCurveTo(x + 6, 134 + len, x + 6, 134);
    ctx.fillStyle = '#8acf4a';
    ctx.fill();
    ink(ctx, 2.5, '#2a3a10');
  }
  // flies
  for (const [x, y] of [[-14, 120], [236, 80], [228, 170]] as const) {
    ellipse(ctx, x, y, 5, 4);
    ctx.fillStyle = INK;
    ctx.fill();
    for (const s of [-1, 1]) {
      ellipse(ctx, x + s * 5, y - 5, 5, 3, s * 0.6);
      ctx.fillStyle = rgba('#ffffff', 0.7);
      ctx.fill();
    }
  }
}

registerKind('zombieloafer', { draw: drawZombieLoafer, contactY: 266, halfWidth: 108 });
