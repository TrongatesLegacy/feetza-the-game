// The second wave of foot styles.

import type { FootArt } from '../data/feet';
import { CX, INK, OUT, barePath, drawBareBody, drawHair, drawToe, glossy, laces, leatherFill, outlineOf, shoePath, skinBodyFill, toesFor } from './feetCommon';
import { type Ctx, ellipse, mix, rgba, roundRect, shade } from './util';

function strokeInk(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function bareToes(ctx: Ctx, art: FootArt, r: () => number): void {
  for (const t of toesFor(art)) drawToe(ctx, t, art.skin, { nail: art.nails, r });
}

function metal(ctx: Ctx, x0: number, x1: number, col: string): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, -0.5));
  g.addColorStop(0.3, shade(col, 0.1));
  g.addColorStop(0.42, shade(col, 0.65));
  g.addColorStop(0.55, col);
  g.addColorStop(1, shade(col, -0.55));
  return g;
}

function drawHeel(ctx: Ctx, art: FootArt, r: () => number): void {
  drawBareBody(ctx, art, r);
  const p = art.primary!;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(16, 116);
    ctx.bezierCurveTo(12, 190, 64, 248, CX + 4, 276);
    ctx.bezierCurveTo(160, 248, 216, 190, 212, 112);
    ctx.bezierCurveTo(180, 132, 150, 150, CX + 2, 156);
    ctx.bezierCurveTo(70, 152, 40, 134, 16, 116);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = rgba('#ffffff', 0.55);
  ellipse(ctx, CX - 46, 180, 10, 46, -0.3);
  ctx.fill();
  ellipse(ctx, CX + 44, 200, 5, 26, 0.3);
  ctx.fill();
  ctx.restore();
  path();
  strokeInk(ctx);
  // toe cleavage
  ctx.strokeStyle = rgba(outlineOf(art.skin), 0.6);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(CX - 6, 138);
  ctx.quadraticCurveTo(CX - 2, 148, CX - 4, 154);
  ctx.moveTo(CX + 10, 136);
  ctx.quadraticCurveTo(CX + 8, 148, CX + 10, 154);
  ctx.stroke();
  // jewel
  ctx.save();
  ctx.translate(CX + 2, 166);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = art.secondary!;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();
}

function drawSlipper(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const s = art.secondary!;
  // ears (behind)
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(CX + sx * 70, 110);
    ctx.rotate(sx * 1.05);
    ellipse(ctx, 0, -50, 26, 62);
    ctx.fillStyle = p;
    ctx.fill();
    strokeInk(ctx, OUT, outlineOf('#d8c8d0'));
    ellipse(ctx, 0, -46, 13, 44);
    ctx.fillStyle = s;
    ctx.fill();
    ctx.restore();
  }
  shoePath(ctx, { bottom: 262, width: 106 });
  const g = ctx.createRadialGradient(CX - 20, 120, 20, CX, 160, 150);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.7, p);
  g.addColorStop(1, shade(p, -0.18));
  ctx.fillStyle = g;
  ctx.fill();
  strokeInk(ctx, OUT, outlineOf('#d8c8d0'));
  // fluff
  ctx.save();
  shoePath(ctx, { bottom: 262, width: 106 });
  ctx.clip();
  drawHair(ctx, r, 10, 0, 200, 260, rgba('#c9b8c2', 0.7), 120);
  ctx.restore();
  for (let i = 0; i < 60; i++) {
    const t = i / 60;
    const a = Math.PI * (0.05 + t * 0.9);
    const x = CX + Math.cos(a) * 104;
    const y = 160 + Math.sin(a) * 100;
    ctx.strokeStyle = i % 2 ? '#ffffff' : '#e9dde4';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
    ctx.stroke();
  }
  // face
  for (const sx of [-1, 1]) {
    ellipse(ctx, CX + sx * 30, 186, 13, 17);
    ctx.fillStyle = '#1b1420';
    ctx.fill();
    ellipse(ctx, CX + sx * 30 - 4, 180, 5, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ellipse(ctx, CX + sx * 54, 214, 14, 8);
    ctx.fillStyle = rgba('#ff7aa2', 0.45);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(CX - 9, 210);
  ctx.lineTo(CX + 9, 210);
  ctx.lineTo(CX, 220);
  ctx.closePath();
  ctx.fillStyle = s;
  ctx.fill();
  ctx.strokeStyle = '#1b1420';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(CX, 220);
  ctx.quadraticCurveTo(CX - 8, 232, CX - 14, 224);
  ctx.moveTo(CX, 220);
  ctx.quadraticCurveTo(CX + 8, 232, CX + 14, 224);
  for (const sx of [-1, 1]) {
    ctx.moveTo(CX + sx * 18, 214);
    ctx.lineTo(CX + sx * 48, 206);
    ctx.moveTo(CX + sx * 18, 220);
    ctx.lineTo(CX + sx * 48, 224);
  }
  ctx.stroke();
}

function drawRoller(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const s = art.secondary!;
  // plate + wheels
  roundRect(ctx, CX - 92, 240, 184, 20, 8);
  ctx.fillStyle = metal(ctx, CX - 92, CX + 92, '#9aa3ad');
  ctx.fill();
  strokeInk(ctx, 4);
  for (const x of [CX - 62, CX + 62]) {
    roundRect(ctx, x - 20, 250, 40, 48, 14);
    const g = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
    g.addColorStop(0, shade(s, -0.4));
    g.addColorStop(0.4, shade(s, 0.35));
    g.addColorStop(1, shade(s, -0.4));
    ctx.fillStyle = g;
    ctx.fill();
    strokeInk(ctx, 4);
    ellipse(ctx, x, 274, 7, 10);
    ctx.fillStyle = '#e8edf2';
    ctx.fill();
  }
  ellipse(ctx, CX, 262, 24, 18);
  ctx.fillStyle = '#3a2a2a';
  ctx.fill();
  strokeInk(ctx, 4);
  // boot
  shoePath(ctx, { bottom: 248, width: 92 });
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoePath(ctx, { bottom: 248, width: 92 });
  ctx.clip();
  ellipse(ctx, CX, 248, 86, 46);
  ctx.fillStyle = shade(p, -0.08);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.4);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = s;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + sx * 92, 100);
    ctx.lineTo(CX + sx * 70, 150);
    ctx.lineTo(CX + sx * 92, 200);
    ctx.closePath();
    ctx.fill();
  }
  glossy(ctx, CX - 34, 110, 30, 70, 0.3);
  ctx.restore();
  shoePath(ctx, { bottom: 248, width: 92, open: true });
  strokeInk(ctx);
  roundRect(ctx, CX - 28, -6, 56, 150, 14);
  ctx.fillStyle = shade(p, -0.05);
  ctx.fill();
  strokeInk(ctx, 3, rgba(INK, 0.7));
  laces(ctx, 6, 170, s, 6, 24);
}

function drawSandal(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const s = art.secondary!;
  roundRect(ctx, 6, 230, 218, 28, 12);
  ctx.fillStyle = leatherFill(ctx, shade(p, 0.1));
  ctx.fill();
  strokeInk(ctx);
  drawBareBody(ctx, art, r);
  const strap = (y: number, sag: number, w = 15) => {
    ctx.save();
    barePath(ctx, art);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(CX, y + sag, 230, y);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w + 6;
    ctx.stroke();
    ctx.strokeStyle = p;
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.18);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  };
  for (const [y, sag] of [[24, 10], [70, 14], [116, 16], [160, 16]]) strap(y, sag);
  // centre strap + buckles
  ctx.beginPath();
  ctx.moveTo(CX + 4, -6);
  ctx.lineTo(CX + 8, 196);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.strokeStyle = shade(p, -0.1);
  ctx.lineWidth = 12;
  ctx.stroke();
  for (const y of [32, 78, 124, 168]) {
    roundRect(ctx, 168, y - 10, 18, 22, 4);
    ctx.fillStyle = metal(ctx, 168, 186, s);
    ctx.fill();
    strokeInk(ctx, 2.5);
  }
  bareToes(ctx, art, r);
  ctx.beginPath();
  ctx.moveTo(14, 204);
  ctx.quadraticCurveTo(CX, 222, 216, 200);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 20;
  ctx.stroke();
  ctx.strokeStyle = p;
  ctx.lineWidth = 14;
  ctx.stroke();
}

function drawClog(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  drawBareBody(ctx, art, r);
  const path = (open = false) => {
    ctx.beginPath();
    ctx.moveTo(10, 96);
    ctx.bezierCurveTo(2, 180, 30, 266, CX, 268);
    ctx.bezierCurveTo(190, 266, 222, 180, 212, 96);
    if (!open) ctx.quadraticCurveTo(CX, 50, 10, 96);
  };
  path();
  const g = ctx.createRadialGradient(CX - 30, 140, 10, CX, 180, 150);
  g.addColorStop(0, shade(p, 0.45));
  g.addColorStop(0.6, p);
  g.addColorStop(1, shade(p, -0.4));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // vent holes
  const rows = [[150, 5], [186, 6], [222, 5]] as const;
  for (const [y, n] of rows) {
    for (let i = 0; i < n; i++) {
      const x = CX + (i - (n - 1) / 2) * 32;
      ellipse(ctx, x, y, 9, 7);
      ctx.fillStyle = shade(p, -0.55);
      ctx.fill();
      ellipse(ctx, x, y + 2, 7, 4);
      ctx.fillStyle = rgba(art.skin, 0.6);
      ctx.fill();
    }
  }
  glossy(ctx, CX - 50, 120, 30, 18, 0.55);
  ctx.restore();
  path();
  strokeInk(ctx);
  // opening rim
  ctx.beginPath();
  ctx.moveTo(10, 96);
  ctx.quadraticCurveTo(CX, 50, 212, 96);
  ctx.strokeStyle = shade(p, -0.3);
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  // charms
  const charms: [number, number, string, string][] = [
    [56, 108, art.secondary!, 'star'],
    [CX + 4, 96, '#ff6fa8', 'heart'],
    [164, 110, '#4cc9f0', 'dot'],
  ];
  for (const [x, y, col, kind] of charms) {
    ellipse(ctx, x, y, 14, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    strokeInk(ctx, 3);
    ctx.fillStyle = col;
    ctx.beginPath();
    if (kind === 'star') {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const rr = i % 2 ? 4 : 9;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
    } else if (kind === 'heart') {
      ctx.moveTo(x, y + 7);
      ctx.bezierCurveTo(x - 14, y - 2, x - 5, y - 12, x, y - 4);
      ctx.bezierCurveTo(x + 5, y - 12, x + 14, y - 2, x, y + 7);
    } else ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWellie(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  roundRect(ctx, CX - 104, 232, 208, 32, 14);
  ctx.fillStyle = art.secondary!;
  ctx.fill();
  strokeInk(ctx);
  shoePath(ctx, { bottom: 248, width: 98 });
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoePath(ctx, { bottom: 248, width: 98 });
  ctx.clip();
  ellipse(ctx, CX, 252, 96, 34);
  ctx.fillStyle = shade(art.secondary!, 0.15);
  ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.6);
  roundRect(ctx, CX - 54, -6, 14, 190, 7);
  ctx.fill();
  roundRect(ctx, CX - 32, 20, 6, 150, 3);
  ctx.fill();
  // drips
  ctx.fillStyle = rgba('#8fd3ff', 0.75);
  for (const [x, y] of [[60, 130], [150, 90], [170, 180]]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.quadraticCurveTo(x + 7, y + 4, x, y + 8);
    ctx.quadraticCurveTo(x - 7, y + 4, x, y - 10);
    ctx.fill();
  }
  ctx.restore();
  shoePath(ctx, { bottom: 248, width: 98, open: true });
  strokeInk(ctx);
}

function drawMoonboot(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const s = art.secondary!;
  roundRect(ctx, -2, 234, 224, 42, 18);
  ctx.fillStyle = '#b8c0cc';
  ctx.fill();
  strokeInk(ctx);
  ctx.fillStyle = s;
  ctx.fillRect(4, 250, 212, 8);
  shoePath(ctx, { bottom: 248, width: 110 });
  const g = ctx.createLinearGradient(0, 0, 220, 0);
  g.addColorStop(0, shade(p, -0.3));
  g.addColorStop(0.45, '#ffffff');
  g.addColorStop(1, shade(p, -0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  shoePath(ctx, { bottom: 248, width: 110 });
  ctx.clip();
  for (let y = 22; y < 240; y += 40) {
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.quadraticCurveTo(CX, y + 22, 240, y);
    ctx.strokeStyle = rgba('#5a6070', 0.35);
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, y - 6);
    ctx.quadraticCurveTo(CX, y + 14, 240, y - 6);
    ctx.stroke();
  }
  ctx.restore();
  shoePath(ctx, { bottom: 248, width: 110, open: true });
  strokeInk(ctx);
  // star badge
  ctx.save();
  ctx.translate(CX + 54, 120);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 ? 9 : 20;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = s;
  ctx.fill();
  strokeInk(ctx, 3);
  ctx.restore();
}

function drawKnight(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const s = art.secondary!;
  // toe cap
  ctx.beginPath();
  ctx.moveTo(26, 196);
  ctx.bezierCurveTo(22, 236, 70, 262, CX + 2, 268);
  ctx.bezierCurveTo(150, 262, 198, 236, 194, 196);
  ctx.closePath();
  ctx.fillStyle = metal(ctx, 22, 198, p);
  ctx.fill();
  strokeInk(ctx);
  glossy(ctx, CX - 30, 226, 26, 10, 0.8);
  // lames (overlapping plates), widening toward the toe
  const bands = 6;
  for (let i = bands - 1; i >= 0; i--) {
    const y0 = -6 + i * 36;
    const w = 56 + i * 9;
    ctx.beginPath();
    ctx.moveTo(CX - w, y0);
    ctx.quadraticCurveTo(CX, y0 + 14, CX + w, y0);
    ctx.lineTo(CX + w + 3, y0 + 40);
    ctx.quadraticCurveTo(CX, y0 + 58, CX - w - 3, y0 + 40);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, CX - w, CX + w, p);
    ctx.fill();
    strokeInk(ctx, 4.5);
    ctx.beginPath();
    ctx.moveTo(CX - w - 1, y0 + 36);
    ctx.quadraticCurveTo(CX, y0 + 53, CX + w + 1, y0 + 36);
    ctx.strokeStyle = s;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    for (const sx of [-1, 1]) {
      ellipse(ctx, CX + sx * (w - 8), y0 + 20, 3.5, 3.5);
      ctx.fillStyle = shade(p, -0.45);
      ctx.fill();
    }
  }
  // ridge
  ctx.strokeStyle = rgba('#ffffff', 0.55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX - 4, 0);
  ctx.lineTo(CX - 2, 250);
  ctx.stroke();
}

function drawElf(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const s = art.secondary!;
  // curly toe
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(CX + 4, 236);
  ctx.bezierCurveTo(CX + 10, 284, CX + 72, 296, CX + 84, 262);
  ctx.bezierCurveTo(CX + 92, 236, CX + 58, 232, CX + 60, 252);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 26;
  ctx.stroke();
  ctx.strokeStyle = p;
  ctx.lineWidth = 18;
  ctx.stroke();
  // bell
  ellipse(ctx, CX + 60, 258, 12, 12);
  const bg = ctx.createRadialGradient(CX + 56, 254, 1, CX + 60, 258, 13);
  bg.addColorStop(0, '#fff4b0');
  bg.addColorStop(1, '#c99a12');
  ctx.fillStyle = bg;
  ctx.fill();
  strokeInk(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(CX + 54, 262);
  ctx.lineTo(CX + 66, 262);
  ctx.stroke();
  shoePath(ctx, { bottom: 252, width: 86, pointed: true });
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  strokeInk(ctx);
  // zig-zag cuff
  ctx.beginPath();
  ctx.moveTo(40, -6);
  ctx.lineTo(180, -6);
  for (let i = 0; i <= 7; i++) {
    const x = 180 - i * 20;
    ctx.lineTo(x - 10, 50 + (i % 2) * 8);
    ctx.lineTo(x - 20, 24);
  }
  ctx.closePath();
  ctx.fillStyle = s;
  ctx.fill();
  strokeInk(ctx, 4);
  for (let i = 0; i < 7; i++) {
    ellipse(ctx, 170 - i * 20, 52 + (i % 2) * 8, 5, 5);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  }
}

function drawPeg(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(72, -6);
    ctx.lineTo(148, -6);
    ctx.bezierCurveTo(146, 80, 134, 180, 130, 240);
    ctx.lineTo(90, 240);
    ctx.bezierCurveTo(86, 180, 74, 80, 72, -6);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.strokeStyle = rgba(shade(p, -0.5), 0.5);
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const x = 80 + i * 10;
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.bezierCurveTo(x + 6, 60, x - 6, 140, x + (i - 3) * -1.5, 240);
    ctx.stroke();
  }
  ellipse(ctx, 104, 120, 6, 10);
  ctx.strokeStyle = rgba(shade(p, -0.6), 0.7);
  ctx.stroke();
  ctx.restore();
  path();
  strokeInk(ctx);
  for (const [y, w] of [[34, 76], [168, 58]] as const) {
    roundRect(ctx, CX - w / 2 - 2, y, w + 4, 18, 6);
    ctx.fillStyle = metal(ctx, CX - w / 2, CX + w / 2, art.secondary!);
    ctx.fill();
    strokeInk(ctx, 3.5);
  }
  ellipse(ctx, CX, 246, 26, 15);
  ctx.fillStyle = '#2b2522';
  ctx.fill();
  strokeInk(ctx, 4);
}

function scales(ctx: Ctx, col: string, x: number, y: number, w: number, h: number): void {
  ctx.strokeStyle = rgba(shade(col, -0.45), 0.45);
  ctx.lineWidth = 2;
  for (let yy = y; yy < y + h; yy += 12) {
    const off = ((yy - y) / 12) % 2 ? 7 : 0;
    for (let xx = x + off; xx < x + w; xx += 14) {
      ctx.beginPath();
      ctx.arc(xx, yy, 7, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
  }
}

function drawDino(ctx: Ctx, art: FootArt, r: () => number): void {
  const col = art.skin;
  barePath(ctx, art);
  ctx.fillStyle = skinBodyFill(ctx, col);
  ctx.fill();
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  scales(ctx, col, 0, -6, 230, 240);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = rgba(shade(col, 0.35), 0.5);
    ellipse(ctx, 30 + r() * 170, 20 + r() * 170, 5 + r() * 10, 4 + r() * 7);
    ctx.fill();
  }
  ctx.restore();
  barePath(ctx, art, true);
  strokeInk(ctx, OUT, outlineOf(col));
  const toes = [
    { cx: 44, cy: 222, rx: 30, ry: 32 },
    { cx: CX, cy: 232, rx: 34, ry: 36 },
    { cx: 176, cy: 222, rx: 30, ry: 32 },
  ];
  for (const t of toes) drawToe(ctx, t, shade(col, -0.05), { claw: true, r });
}

function drawAlien(ctx: Ctx, art: FootArt, r: () => number): void {
  const col = art.skin;
  barePath(ctx, art);
  ctx.fillStyle = skinBodyFill(ctx, col);
  ctx.fill();
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = rgba(shade(col, 0.4), 0.45);
    ellipse(ctx, 30 + r() * 170, 10 + r() * 190, 3 + r() * 8, 3 + r() * 8);
    ctx.fill();
  }
  ctx.restore();
  barePath(ctx, art, true);
  strokeInk(ctx, OUT, outlineOf(col));
  const toes = [
    { cx: 50, cy: 226, rx: 22, ry: 40 },
    { cx: CX, cy: 240, rx: 24, ry: 46 },
    { cx: 170, cy: 226, rx: 22, ry: 40 },
  ];
  for (const t of toes) {
    drawToe(ctx, t, col, { nail: null });
    ctx.save();
    ctx.shadowColor = art.secondary!;
    ctx.shadowBlur = 16;
    ellipse(ctx, t.cx, t.cy + t.ry * 0.62, t.rx * 0.55, t.rx * 0.5);
    ctx.fillStyle = art.secondary!;
    ctx.fill();
    ctx.restore();
  }
}

function bandageStrips(ctx: Ctx, col: string, x0: number, y0: number, w: number, h: number, step = 20): void {
  for (let y = y0 - 40; y < y0 + h + 40; y += step) {
    ctx.save();
    ctx.translate(x0 + w / 2, y);
    ctx.rotate(-0.22 + ((y / step) % 2) * 0.12);
    ctx.fillStyle = mix(col, '#ffffff', ((y / step) % 3) * 0.12);
    ctx.fillRect(-w, -step / 2, w * 2, step);
    ctx.strokeStyle = rgba('#5a4e34', 0.45);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w, step / 2);
    ctx.lineTo(w, step / 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawMummy(ctx: Ctx, art: FootArt): void {
  const col = art.primary!;
  barePath(ctx, art);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  bandageStrips(ctx, col, 0, -6, 230, 240);
  const sh = ctx.createLinearGradient(14, 0, 214, 0);
  sh.addColorStop(0, rgba('#000', 0.3));
  sh.addColorStop(0.5, rgba('#000', 0));
  sh.addColorStop(1, rgba('#000', 0.32));
  ctx.fillStyle = sh;
  ctx.fillRect(0, -6, 230, 240);
  ctx.restore();
  barePath(ctx, art, true);
  strokeInk(ctx, OUT, outlineOf(col));
  for (const t of toesFor(art)) drawToe(ctx, t, col, { nail: null, stripe: rgba('#8a7d5c', 0.5) });
  // dangling strip
  ctx.beginPath();
  ctx.moveTo(196, 80);
  ctx.bezierCurveTo(230, 110, 210, 150, 236, 190);
  ctx.lineTo(222, 196);
  ctx.bezierCurveTo(198, 156, 216, 116, 190, 96);
  ctx.closePath();
  ctx.fillStyle = shade(col, -0.05);
  ctx.fill();
  strokeInk(ctx, 3, outlineOf(col));
}

function drawCast(ctx: Ctx, art: FootArt, r: () => number): void {
  for (const t of toesFor(art)) drawToe(ctx, { ...t, cy: t.cy + 4 }, art.skin, { nail: art.nails, r });
  const path = (open = false) => {
    ctx.beginPath();
    ctx.moveTo(50, -6);
    ctx.bezierCurveTo(48, 58, 10, 104, 12, 168);
    ctx.bezierCurveTo(12, 200, 30, 214, 60, 212);
    ctx.quadraticCurveTo(CX, 224, 170, 214);
    ctx.bezierCurveTo(210, 212, 220, 190, 218, 158);
    ctx.bezierCurveTo(214, 98, 174, 58, 170, -6);
    if (!open) ctx.closePath();
  };
  path();
  ctx.fillStyle = skinBodyFill(ctx, art.primary!);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = rgba(r() > 0.5 ? '#ffffff' : '#b8b0a0', 0.25);
    ctx.fillRect(10 + r() * 210, -6 + r() * 230, 2, 2);
  }
  // doodles & signatures
  ctx.lineCap = 'round';
  const inks = [art.secondary!, '#e5242f', '#1f9a4a', '#8a2be2'];
  ctx.lineWidth = 3;
  ctx.strokeStyle = inks[1];
  ctx.beginPath();
  ctx.moveTo(150, 70);
  ctx.bezierCurveTo(132, 52, 116, 76, 150, 98);
  ctx.bezierCurveTo(184, 76, 168, 52, 150, 70);
  ctx.stroke();
  ctx.fillStyle = inks[0];
  ctx.font = 'bold 22px "Comic Sans MS", "Chalkboard SE", cursive';
  ctx.save();
  ctx.translate(64, 140);
  ctx.rotate(-0.15);
  ctx.fillText('GET WELL', 0, 0);
  ctx.restore();
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = inks[k % inks.length];
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let x = 30 + r() * 80;
    const y = 30 + k * 40 + r() * 10;
    ctx.moveTo(x, y);
    for (let i = 0; i < 6; i++) {
      x += 8 + r() * 6;
      ctx.quadraticCurveTo(x - 4, y - 10 + r() * 20, x, y + (r() - 0.5) * 6);
    }
    ctx.stroke();
  }
  // smiley
  ctx.strokeStyle = inks[2];
  ctx.lineWidth = 2.5;
  ellipse(ctx, 70, 186, 13, 13);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(70, 188, 7, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();
  path(true);
  strokeInk(ctx, OUT, outlineOf(art.primary!));
}

function drawDadSandal(ctx: Ctx, art: FootArt, _r: () => number): void {
  const sock = art.legColor ?? '#f4f1ea';
  const p = art.primary!;
  // thick sole
  roundRect(ctx, 2, 226, 226, 38, 14);
  ctx.fillStyle = leatherFill(ctx, shade(p, -0.25));
  ctx.fill();
  strokeInk(ctx);
  ctx.fillStyle = '#d9c3a4';
  ctx.fillRect(8, 230, 214, 8);
  // sock foot
  barePath(ctx, art);
  ctx.fillStyle = skinBodyFill(ctx, sock);
  ctx.fill();
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  ctx.strokeStyle = rgba('#000', 0.06);
  ctx.lineWidth = 2;
  for (let x = 10; x < 220; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.lineTo(x, 230);
    ctx.stroke();
  }
  ctx.restore();
  barePath(ctx, art, true);
  strokeInk(ctx, OUT, outlineOf(sock));
  for (const t of toesFor(art)) drawToe(ctx, t, sock, { nail: null });
  // velcro straps
  for (const [y, h] of [[54, 34], [146, 36]] as const) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(CX, y + 16, 230, y);
    ctx.lineTo(230, y + h);
    ctx.quadraticCurveTo(CX, y + h + 16, 0, y + h);
    ctx.closePath();
    ctx.restore();
    ctx.save();
    barePath(ctx, art);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(CX, y + 16, 230, y);
    ctx.lineTo(230, y + h);
    ctx.quadraticCurveTo(CX, y + h + 16, 0, y + h);
    ctx.closePath();
    ctx.fillStyle = leatherFill(ctx, p);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = rgba('#000', 0.25);
    roundRect(ctx, 150, y + 8, 40, h - 12, 4);
    ctx.fill();
    ctx.restore();
  }
}

function drawTap(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  // tap plate
  ctx.beginPath();
  ctx.ellipse(CX, 252, 88, 22, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = metal(ctx, CX - 88, CX + 88, art.secondary!);
  ctx.fill();
  strokeInk(ctx, 4);
  shoePath(ctx, { bottom: 258, width: 94 });
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoePath(ctx, { bottom: 258, width: 94 });
  ctx.clip();
  ctx.strokeStyle = rgba('#ffffff', 0.18);
  ctx.lineWidth = 2;
  ellipse(ctx, CX, 252, 84, 64);
  ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', 0.2);
  for (let i = 0; i < 13; i++) {
    const a = Math.PI + 0.25 + (i / 12) * (Math.PI - 0.5);
    ellipse(ctx, CX + Math.cos(a) * 74, 252 + Math.sin(a) * 54, 2, 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba('#ffffff', 0.7);
  ellipse(ctx, CX - 44, 196, 22, 8, -0.4);
  ctx.fill();
  ellipse(ctx, CX - 54, 110, 6, 40);
  ctx.fill();
  ctx.restore();
  shoePath(ctx, { bottom: 258, width: 94, open: true });
  strokeInk(ctx, OUT, '#000000');
  roundRect(ctx, CX - 30, -6, 60, 118, 12);
  ctx.fillStyle = shade(p, 0.12);
  ctx.fill();
  strokeInk(ctx, 3, '#000');
  laces(ctx, 6, 130, '#2a2a2a', 4, 24);
}

function drawPlatform(ctx: Ctx, art: FootArt, r: () => number): void {
  ctx.save();
  ctx.translate(0, -4);
  ctx.scale(1, 0.84);
  drawBareBody(ctx, art, r);
  for (const t of toesFor(art)) drawToe(ctx, t, art.skin, { nail: art.secondary, r });
  ctx.restore();
  // metallic strap
  ctx.save();
  barePath(ctx, art);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(18, 110);
  ctx.quadraticCurveTo(CX, 150, 212, 104);
  ctx.lineTo(214, 140);
  ctx.quadraticCurveTo(CX, 186, 16, 146);
  ctx.closePath();
  ctx.fillStyle = metal(ctx, 16, 214, art.primary!);
  ctx.fill();
  strokeInk(ctx, 4);
  // platform block
  roundRect(ctx, 4, 200, 222, 82, 18);
  const g = ctx.createLinearGradient(0, 200, 0, 282);
  g.addColorStop(0, shade(art.secondary!, 0.4));
  g.addColorStop(1, shade(art.secondary!, -0.35));
  ctx.fillStyle = g;
  ctx.fill();
  strokeInk(ctx);
  ctx.fillStyle = art.primary!;
  ctx.fillRect(8, 232, 214, 10);
  ctx.save();
  roundRect(ctx, 4, 200, 222, 82, 18);
  ctx.clip();
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rgba('#ffffff', 0.4 + r() * 0.6);
    const x = 8 + r() * 214;
    const y = 204 + r() * 74;
    ctx.fillRect(x, y, 2.5, 2.5);
  }
  ctx.restore();
}

function drawCleat(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const s = art.secondary!;
  for (const x of [CX - 74, CX - 26, CX + 26, CX + 74]) {
    ctx.beginPath();
    ctx.moveTo(x - 12, 250);
    ctx.lineTo(x + 12, 250);
    ctx.lineTo(x + 7, 276);
    ctx.lineTo(x - 7, 276);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, x - 12, x + 12, '#e8edf2');
    ctx.fill();
    strokeInk(ctx, 3.5);
  }
  roundRect(ctx, CX - 100, 234, 200, 22, 10);
  ctx.fillStyle = s;
  ctx.fill();
  strokeInk(ctx, 4);
  shoePath(ctx, { bottom: 244, width: 94 });
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoePath(ctx, { bottom: 244, width: 94 });
  ctx.clip();
  ctx.strokeStyle = s;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + sx * 96, 210);
    ctx.bezierCurveTo(CX + sx * 60, 190, CX + sx * 70, 120, CX + sx * 30, 80);
    ctx.stroke();
  }
  glossy(ctx, CX - 30, 200, 30, 12, 0.5);
  ctx.restore();
  shoePath(ctx, { bottom: 244, width: 94, open: true });
  strokeInk(ctx, OUT, '#000');
  roundRect(ctx, CX - 26, -6, 52, 120, 12);
  ctx.fillStyle = shade(p, 0.12);
  ctx.fill();
  strokeInk(ctx, 3, '#000');
  laces(ctx, 6, 140, '#f2f2f2', 5, 22);
}

function drawWebbed(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const s = art.secondary!;
  const tips: [number, number][] = [
    [8, 246],
    [CX, 270],
    [212, 246],
  ];
  // web membrane
  ctx.beginPath();
  ctx.moveTo(CX - 26, 50);
  ctx.lineTo(tips[0][0], tips[0][1]);
  ctx.quadraticCurveTo(60, 236, tips[1][0], tips[1][1]);
  ctx.quadraticCurveTo(160, 236, tips[2][0], tips[2][1]);
  ctx.lineTo(CX + 26, 50);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 40, 0, 270);
  g.addColorStop(0, shade(p, -0.1));
  g.addColorStop(1, shade(p, 0.25));
  ctx.fillStyle = g;
  ctx.fill();
  strokeInk(ctx, OUT, outlineOf(p));
  // toe bones
  ctx.lineCap = 'round';
  for (const [x, y] of tips) {
    ctx.beginPath();
    ctx.moveTo(CX, 40);
    ctx.lineTo(x, y - 6);
    ctx.strokeStyle = outlineOf(s);
    ctx.lineWidth = 22;
    ctx.stroke();
    ctx.strokeStyle = s;
    ctx.lineWidth = 15;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.3);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 4);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x + 6, y - 4);
    ctx.closePath();
    ctx.fillStyle = '#3a2a1a';
    ctx.fill();
  }
  ellipse(ctx, CX, 36, 34, 30);
  ctx.fillStyle = s;
  ctx.fill();
  strokeInk(ctx, OUT, outlineOf(s));
  scales(ctx, s, CX - 30, 14, 60, 40);
}

export function drawExtraKind(ctx: Ctx, art: FootArt, r: () => number): boolean {
  switch (art.kind) {
    case 'heel':
      drawHeel(ctx, art, r);
      return true;
    case 'slipper':
      drawSlipper(ctx, art, r);
      return true;
    case 'roller':
      drawRoller(ctx, art);
      return true;
    case 'sandal':
      drawSandal(ctx, art, r);
      return true;
    case 'clog':
      drawClog(ctx, art, r);
      return true;
    case 'wellie':
      drawWellie(ctx, art);
      return true;
    case 'moonboot':
      drawMoonboot(ctx, art);
      return true;
    case 'knight':
      drawKnight(ctx, art);
      return true;
    case 'elf':
      drawElf(ctx, art);
      return true;
    case 'peg':
      drawPeg(ctx, art);
      return true;
    case 'dino':
      drawDino(ctx, art, r);
      return true;
    case 'alien':
      drawAlien(ctx, art, r);
      return true;
    case 'mummy':
      drawMummy(ctx, art);
      return true;
    case 'cast':
      drawCast(ctx, art, r);
      return true;
    case 'dadsandal':
      drawDadSandal(ctx, art, r);
      return true;
    case 'tap':
      drawTap(ctx, art);
      return true;
    case 'platform':
      drawPlatform(ctx, art, r);
      return true;
    case 'cleat':
      drawCleat(ctx, art);
      return true;
    case 'webbed':
      drawWebbed(ctx, art);
      return true;
    default:
      return false;
  }
}

/** Accessories layered over bare-ish feet. */
export function drawAccessories(ctx: Ctx, art: FootArt, r: () => number): void {
  const toes = toesFor(art);
  if (art.tattoo) {
    ctx.save();
    ctx.translate(CX + 4, 104);
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.bezierCurveTo(-34, 0, -22, -26, 0, -10);
    ctx.bezierCurveTo(22, -26, 34, 0, 0, 22);
    ctx.fillStyle = rgba('#d8343f', 0.85);
    ctx.fill();
    ctx.strokeStyle = rgba('#1d2b3a', 0.85);
    ctx.lineWidth = 3;
    ctx.stroke();
    roundRect(ctx, -34, -4, 68, 18, 3);
    ctx.fillStyle = rgba('#f2e6c8', 0.9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1d2b3a';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('MOM', 0, 10);
    ctx.restore();
    ctx.strokeStyle = rgba('#1d2b3a', 0.75);
    ctx.lineWidth = 2.5;
    for (const [x, y] of [[62, 50], [164, 160]]) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
        ctx.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  if (art.toeRing) {
    const t = toes[3];
    ctx.beginPath();
    ctx.ellipse(t.cx, t.cy - t.ry * 0.25, t.rx * 1.02, 6, 0, 0, Math.PI);
    ctx.strokeStyle = '#7a5a12';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  if (art.bandaids) {
    const plaster = (x: number, y: number, rot: number, w = 46, h = 16) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.fillStyle = '#f2c79a';
      ctx.fill();
      ctx.strokeStyle = '#a8784a';
      ctx.lineWidth = 2;
      ctx.stroke();
      roundRect(ctx, -w * 0.18, -h / 2 + 2, w * 0.36, h - 4, 3);
      ctx.fillStyle = '#fbe6cf';
      ctx.fill();
      ctx.fillStyle = rgba('#a8784a', 0.6);
      for (const dx of [-w * 0.36, -w * 0.28, w * 0.28, w * 0.36]) {
        ellipse(ctx, dx, 0, 1.2, 1.2);
        ctx.fill();
      }
      ctx.restore();
    };
    plaster(toes[4].cx, toes[4].cy - 4, 0.5, 54, 18);
    plaster(toes[1].cx, toes[1].cy, -0.6, 40, 14);
    plaster(80, 90, -0.3);
  }
  if (art.sunburn) {
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = rgba('#ffffff', 0.55);
      ellipse(ctx, 40 + r() * 140, 30 + r() * 150, 2 + r() * 4, 1.5 + r() * 2.5, r() * 3);
      ctx.fill();
    }
  }
  if (art.frost) {
    ctx.fillStyle = rgba('#ffffff', 0.55);
    for (let i = 0; i < 10; i++) {
      ellipse(ctx, 30 + r() * 170, 10 + r() * 190, 6 + r() * 12, 4 + r() * 8, r() * 3);
      ctx.fill();
    }
    for (const t of toes) {
      const n = 2;
      for (let k = 0; k < n; k++) {
        const x = t.cx + (k - 0.5) * t.rx * 0.8;
        const y = t.cy + t.ry * 0.8;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 4);
        ctx.lineTo(x + 5, y - 4);
        ctx.lineTo(x, y + 12 + r() * 10);
        ctx.closePath();
        ctx.fillStyle = rgba('#dff3ff', 0.95);
        ctx.fill();
        ctx.strokeStyle = rgba('#6aa8d8', 0.9);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }
}
