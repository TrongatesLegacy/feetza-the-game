// Art kinds for King Leonidas's nemesis bosses (src/content/feet/leonidas.ts): the Immortal Brute, a hulking boot in
// dark iron scale with a blank white mask on its instep, a chain wound round it and spikes on the toe; and Xerxes, a
// bare bronze foot in a golden sandal, hung with rings, piercings and fine chains, a ruby anklet and painted gold
// lines. Our own designs. Same rules as the other Feetza 2.0 kinds: one silhouette painted inside a clip, lit from the
// top left, outlined once. Design frame: centre x = CX (110), the ankle at y = -6, the sole at contactY.

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

function lit(ctx: Ctx, base: string, x0: number, y0: number, x1: number, y1: number, k = 0.26): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, shade(base, k));
  g.addColorStop(0.42, base);
  g.addColorStop(1, shade(base, -k * 1.5));
  return g;
}

const gold = (ctx: Ctx, y0: number, y1: number, col = '#e8b23a') => lit(ctx, col, 0, y0, 0, y1, 0.45);

// ——— THE IMMORTAL BRUTE ———

function brutePath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(CX - 70, -6);
  ctx.bezierCurveTo(CX - 84, 50, CX - 102, 110, CX - 108, 170);
  ctx.bezierCurveTo(CX - 114, 230, CX - 100, 262, CX - 70, 270);
  ctx.lineTo(CX + 74, 270);
  ctx.bezierCurveTo(CX + 108, 262, CX + 118, 230, CX + 112, 170);
  ctx.bezierCurveTo(CX + 106, 110, CX + 86, 50, CX + 70, -6);
  ctx.closePath();
}

function drawBrute(ctx: Ctx, art: FootArt): void {
  const iron = art.primary!;
  const steel = art.secondary!;
  const mask = String(art.extra?.mask ?? '#e8e4dc');
  // spikes jutting from the toe (behind the outline)
  for (const [x, a] of [[CX - 70, -2.5], [CX - 20, -1.9], [CX + 30, -1.3], [CX + 80, -0.7]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 12, 250);
    ctx.lineTo(x + Math.cos(a) * 46, 250 - Math.sin(-a) * 10 + 30);
    ctx.lineTo(x + 12, 254);
    ctx.closePath();
    ctx.fillStyle = lit(ctx, steel, x - 12, 240, x + 30, 290, 0.4);
    ctx.fill();
    ink(ctx, 3);
  }
  brutePath(ctx);
  ctx.fillStyle = lit(ctx, iron, -10, -6, 240, 270, 0.4);
  ctx.fill();
  ctx.save();
  brutePath(ctx);
  ctx.clip();
  // iron scale armour: overlapping rows of rounded plates, each lit on its top edge
  for (let row = 0; row < 12; row++) {
    const y = 4 + row * 22;
    for (let x = (row % 2) * 13 - 10; x < 240; x += 26) {
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI);
      ctx.fillStyle = lit(ctx, shade(iron, 0.08), x - 14, y, x + 14, y + 14, 0.3);
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.55);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 12, Math.PI * 0.15, Math.PI * 0.55);
      ctx.strokeStyle = rgba('#ffffff', 0.18);
      ctx.stroke();
    }
  }
  // the mask: blank, white and smooth, two narrow eye slits and a grille mouth
  ctx.beginPath();
  ctx.moveTo(CX - 54, 70);
  ctx.bezierCurveTo(CX - 60, 20, CX + 60, 20, CX + 54, 70);
  ctx.bezierCurveTo(CX + 50, 140, CX + 20, 176, CX, 178);
  ctx.bezierCurveTo(CX - 20, 176, CX - 50, 140, CX - 54, 70);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, mask, CX - 54, 30, CX + 54, 178, 0.22);
  ctx.fill();
  ink(ctx, 4);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 12, 80);
    ctx.quadraticCurveTo(CX + s * 28, 72, CX + s * 42, 78);
    ctx.quadraticCurveTo(CX + s * 28, 88, CX + s * 12, 86);
    ctx.closePath();
    ctx.fillStyle = '#120808';
    ctx.fill();
    // a red glint in the slit
    ctx.beginPath();
    ctx.arc(CX + s * 26, 81, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4a2a';
    ctx.fill();
  }
  for (let k = -2; k <= 2; k++) {
    roundRect(ctx, CX + k * 9 - 3, 128, 6, 26, 3);
    ctx.fillStyle = '#2a2020';
    ctx.fill();
  }
  ellipse(ctx, CX - 22, 58, 16, 7, -0.4);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  // the chain wound round the ankle
  for (let i = 0; i < 11; i++) {
    const x = -4 + i * 22;
    const y = 200 + Math.sin(i * 0.6) * 6;
    ellipse(ctx, x, y, i % 2 ? 6 : 12, i % 2 ? 11 : 7);
    ctx.lineWidth = 8;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = lit(ctx, '#9aa3ad', x - 10, y - 10, x + 10, y + 10, 0.5);
    ctx.stroke();
  }
  // the toe cap: hammered steel with rivets
  ctx.beginPath();
  ctx.moveTo(-10, 236);
  ctx.quadraticCurveTo(CX, 214, 230, 236);
  ctx.lineTo(230, 280);
  ctx.lineTo(-10, 280);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, steel, 0, 214, 0, 280, 0.4);
  ctx.fill();
  ink(ctx, 3);
  for (let x = 20; x < 220; x += 30) {
    ctx.beginPath();
    ctx.arc(x, 246, 4, 0, Math.PI * 2);
    ctx.fillStyle = shade(steel, 0.4);
    ctx.fill();
    ink(ctx, 1.5);
  }
  const ao = ctx.createLinearGradient(230 - 34, 0, 230, 0);
  ao.addColorStop(0, 'rgba(200,180,255,0)');
  ao.addColorStop(1, 'rgba(200,180,255,0.3)');
  ctx.fillStyle = ao;
  ctx.fillRect(196, -10, 40, 290);
  ctx.restore();
  brutePath(ctx);
  ink(ctx, OUT + 0.5, outlineOf(iron));
}

// ——— XERXES ———

const ART_BARE: FootArt = { kind: 'bare', skin: '#888888', leg: 'skin' };
const TOES: Toe[] = [
  { cx: 32, cy: 214, rx: 20, ry: 23 },
  { cx: 69, cy: 226, rx: 22, ry: 27 },
  { cx: 106, cy: 233, rx: 24, ry: 29 },
  { cx: 145, cy: 235, rx: 26, ry: 31 },
  { cx: 188, cy: 232, rx: 33, ry: 36 },
];

function drawXerxes(ctx: Ctx, art: FootArt): void {
  const skin = art.skin;
  const g = art.primary!;
  const gem = String(art.extra?.gem ?? '#c8102e');
  barePath(ctx, ART_BARE);
  ctx.fillStyle = skinBodyFill(ctx, skin);
  ctx.fill();
  ctx.save();
  barePath(ctx, ART_BARE);
  ctx.clip();
  glossy(ctx, 72, 70, 48, 84, 0.3);
  // painted gold lines, like a god's markings
  ctx.strokeStyle = rgba('#ffd890', 0.7);
  ctx.lineWidth = 3;
  for (const [x0, y0, x1, y1] of [[40, 40, 70, 160], [180, 40, 150, 160], [100, 10, 110, 100]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 10, (y0 + y1) / 2, x1, y1);
    ctx.stroke();
  }
  // the golden sandal straps fanning over the instep to a great medallion
  for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) {
    ctx.beginPath();
    ctx.moveTo(CX, 110);
    ctx.lineTo(CX + Math.sin(a) * 140, 110 + Math.cos(a) * 110);
    ctx.lineWidth = 14;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.strokeStyle = gold(ctx, 100, 220, g);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(CX, 110, 30, 0, Math.PI * 2);
  ctx.fillStyle = gold(ctx, 80, 140, g);
  ctx.fill();
  ink(ctx, 4);
  ctx.beginPath();
  ctx.arc(CX, 110, 13, 0, Math.PI * 2);
  ctx.fillStyle = lit(ctx, gem, CX - 13, 97, CX + 13, 123, 0.5);
  ctx.fill();
  ink(ctx, 2.5);
  // fine chains swagging between rings pierced through the skin
  const rings: [number, number][] = [[34, 70], [70, 50], [150, 50], [186, 70]];
  for (const [x, y] of rings) {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd23f';
    ctx.stroke();
  }
  for (let i = 0; i < rings.length - 1; i++) {
    const [x0, y0] = rings[i];
    const [x1, y1] = rings[i + 1];
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 6);
    ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 34, x1, y1 + 6);
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd23f';
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = rgba('#000000', 0.12);
  ctx.fillRect(176, -10, 60, 240);
  ctx.restore();
  barePath(ctx, ART_BARE, true);
  ink(ctx, OUT + 0.5, outlineOf(skin));
  for (const t of TOES) drawToe(ctx, t, skin, { nail: '#ffd23f', ol: outlineOf(skin) });
  // gold toe rings
  for (const t of [TOES[1], TOES[3], TOES[4]]) {
    ctx.beginPath();
    ctx.ellipse(t.cx, t.cy - t.ry * 0.3, t.rx * 0.95, 6, 0, 0, Math.PI);
    ink(ctx, 7);
    ink(ctx, 4, '#ffd23f');
  }
  // the heavy gold anklet with a ruby, and chains hanging off it
  roundRect(ctx, 46, 0, 128, 24, 10);
  ctx.fillStyle = gold(ctx, 0, 24, g);
  ctx.fill();
  ink(ctx, 4);
  ellipse(ctx, CX, 12, 12, 9);
  ctx.fillStyle = lit(ctx, gem, CX - 12, 3, CX + 12, 21, 0.5);
  ctx.fill();
  ink(ctx, 2.5);
  for (const x of [56, 164]) {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.quadraticCurveTo(x + (x < CX ? -20 : 20), 60, x + (x < CX ? -10 : 10), 90);
    ctx.setLineDash([5, 3]);
    ink(ctx, 4, '#ffd23f');
    ctx.setLineDash([]);
  }
}

registerKind('lx_brute', { draw: drawBrute, contactY: 270, halfWidth: 114 });
registerKind('lx_xerxes', { draw: drawXerxes, contactY: 270, halfWidth: 110 });
