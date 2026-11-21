// Art kinds for the Stage 4–6 fight feet (data in src/content/feet/act1b.ts).
// Same design frame as the built-in kinds: centre x = CX (110), the ankle opens at y = -6,
// the leg comes from FootArt.leg and the sole sits at the contact y.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, glossy, leatherFill, shoePath } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, rgba, roundRect, shade } from '../../art/util';

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function steel(ctx: Ctx, x0: number, x1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, '#4b525c');
  g.addColorStop(0.35, '#b9c2cc');
  g.addColorStop(0.5, '#eef2f6');
  g.addColorStop(1, '#5b636e');
  return g;
}

// ——— BLACKSMITH BOOT: a sturdy work boot with a leather apron flap and a hammer ———

function drawBlacksmith(ctx: Ctx, art: FootArt, r: () => number): void {
  const boot = art.primary!;
  const apron = art.secondary!;
  // hammer tucked behind at the right: wooden handle, iron head
  ctx.save();
  ctx.translate(204, 70);
  ctx.rotate(0.3);
  roundRect(ctx, -7, -40, 14, 130, 6);
  ctx.fillStyle = leatherFill(ctx, '#b07a40');
  ctx.fill();
  ink(ctx, 4);
  roundRect(ctx, -34, -74, 68, 38, 7);
  ctx.fillStyle = steel(ctx, -34, 34);
  ctx.fill();
  ink(ctx, 4.5);
  ctx.fillStyle = rgba('#ffffff', 0.7);
  ctx.fillRect(-26, -68, 30, 5);
  ctx.restore();
  // heavy flat sole
  roundRect(ctx, CX - 112, 226, 224, 34, 12);
  ctx.fillStyle = '#231a14';
  ctx.fill();
  ink(ctx);
  ctx.fillStyle = '#5a4434';
  ctx.fillRect(CX - 104, 232, 208, 5);
  // boot
  const shoe = () => shoePath(ctx, { bottom: 240, width: 104 });
  shoe();
  ctx.fillStyle = leatherFill(ctx, boot);
  ctx.fill();
  ctx.save();
  shoe();
  ctx.clip();
  // scorch marks and soot
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = rgba('#000000', 0.08 + r() * 0.1);
    ctx.beginPath();
    ctx.arc(20 + r() * 180, 60 + r() * 170, 4 + r() * 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // steel toe cap
  ctx.beginPath();
  ctx.moveTo(30, 250);
  ctx.bezierCurveTo(28, 186, 192, 186, 190, 250);
  ctx.fillStyle = steel(ctx, 30, 190);
  ctx.fill();
  ink(ctx, 4.5);
  glossy(ctx, CX - 46, 110, 26, 52, 0.2);
  ctx.restore();
  shoe();
  ink(ctx);
  // leather apron flap: hangs from the ankle over the front of the boot
  const flap = () => {
    ctx.beginPath();
    ctx.moveTo(48, -6);
    ctx.lineTo(172, -6);
    ctx.lineTo(178, 176);
    ctx.quadraticCurveTo(CX, 196, 42, 176);
    ctx.closePath();
  };
  flap();
  ctx.fillStyle = leatherFill(ctx, apron);
  ctx.fill();
  ink(ctx);
  // stitched hem
  ctx.save();
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(58, 4);
  ctx.lineTo(64, 166);
  ctx.quadraticCurveTo(CX, 182, 158, 166);
  ctx.lineTo(162, 4);
  ink(ctx, 2.5, '#f2d29a');
  ctx.restore();
  // pocket with tongs poking out
  ctx.beginPath();
  ctx.moveTo(136, 70);
  ctx.lineTo(146, 36);
  ctx.moveTo(146, 70);
  ctx.lineTo(160, 40);
  ink(ctx, 7, '#3a3a40');
  roundRect(ctx, 78, 66, 82, 58, 10);
  ctx.fillStyle = shade(apron, -0.15);
  ctx.fill();
  ink(ctx, 4);
  // brass rivets and a scorch
  for (const [x, y] of [[84, 72], [154, 72]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e8b84a';
    ctx.fill();
    ink(ctx, 2);
  }
  ctx.fillStyle = rgba('#000000', 0.25);
  ctx.beginPath();
  ctx.ellipse(70, 140, 14, 9, 0.4, 0, Math.PI * 2);
  ctx.fill();
  glossy(ctx, 76, 30, 18, 30, 0.25);
  // apron strap across the ankle
  roundRect(ctx, 38, -8, 144, 20, 8);
  ctx.fillStyle = shade(apron, -0.3);
  ctx.fill();
  ink(ctx, 4);
  roundRect(ctx, CX - 13, -10, 26, 24, 5);
  ctx.fillStyle = steel(ctx, CX - 13, CX + 13);
  ctx.fill();
  ink(ctx, 3);
}

registerKind('blacksmith', { draw: drawBlacksmith, contactY: 262, halfWidth: 112 });
