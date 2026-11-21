// Art kinds for Kratos's nemesis bosses (src/content/feet/kratos.ts): Kronos the Titan King, a colossal bare foot of
// weathered stone bound in bronze shackles, with a carved Titan face on the instep whose stone jaw opens to bite;
// and Zeus, a towering white-marble foot in a gold gladiator sandal, a laurel at the ankle and a thunderbolt
// inlaid on the instep. Same rules as the other Feetza 2.0 kinds: one silhouette painted inside a clip, lit from
// the top left, outlined once. Design frame: centre x = CX (110), the ankle opens at y = -6, the sole at contactY.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, type Toe, barePath, drawToe, glossy, outlineOf, skinBodyFill } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, rgba, roundRect, shade } from '../../art/util';

/** Where Kronos's stone mouth sits (design space; contact y below): Devour's jaw prop rides on it in play. */
export const TITAN_JAW = { x: CX + 4, y: 150, contact: 270 };
/** Where Zeus's thunderbolt inlay glows (design space): his bolts leave from it. */
export const ZEUS_BOLT = { x: CX, y: 112, contact: 270 };

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Polished bronze: a bright band along the top, dark below. */
function bronze(ctx: Ctx, y0: number, y1: number, col = '#c9873a'): CanvasGradient {
  return lin(ctx, 0, y0, 0, y1, [
    [0, shade(col, 0.45)],
    [0.35, col],
    [0.7, shade(col, -0.3)],
    [1, shade(col, -0.5)],
  ]);
}

/** Toes a little bigger than the stock bare foot (these are giants). */
const BIG_TOES: Toe[] = [
  { cx: 32, cy: 214, rx: 21, ry: 24 },
  { cx: 69, cy: 226, rx: 23, ry: 28 },
  { cx: 106, cy: 233, rx: 25, ry: 30 },
  { cx: 145, cy: 235, rx: 27, ry: 32 },
  { cx: 188, cy: 232, rx: 34, ry: 37 },
];

const ART_BARE: FootArt = { kind: 'bare', skin: '#888888', leg: 'skin' };

// ——— KRONOS THE TITAN KING ———

/** A chain of oval links hanging from (x0, y0) along a sagging curve to (x1, y1). */
function hangingChain(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, sag: number, n: number, col: string): void {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    const ang = Math.atan2(y1 - y0 + Math.cos(t * Math.PI) * sag * Math.PI, x1 - x0);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + (i % 2 ? Math.PI / 2 : 0));
    ellipse(ctx, 0, 0, i % 2 ? 7 : 12, i % 2 ? 12 : 7);
    ctx.lineWidth = 9;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = lin(ctx, -10, -10, 10, 10, [
      [0, shade(col, 0.4)],
      [1, shade(col, -0.35)],
    ]);
    ctx.stroke();
    ctx.restore();
  }
}

/** A bronze hourglass, sand in both bulbs. */
function hourglass(ctx: Ctx, x: number, y: number, s: number, sand: string): void {
  const h = 46 * s;
  const w = 24 * s;
  for (const d of [-1, 1]) {
    roundRect(ctx, x - w - 6 * s, y + d * h - (d > 0 ? 0 : 8 * s), (w + 6 * s) * 2, 8 * s, 3 * s);
    ctx.fillStyle = bronze(ctx, y + d * h - 8 * s, y + d * h + 8 * s);
    ctx.fill();
    ink(ctx, 3);
  }
  ctx.beginPath();
  ctx.moveTo(x - w, y - h);
  ctx.quadraticCurveTo(x - w, y - 8 * s, x - 4 * s, y);
  ctx.quadraticCurveTo(x - w, y + 8 * s, x - w, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.quadraticCurveTo(x + w, y + 8 * s, x + 4 * s, y);
  ctx.quadraticCurveTo(x + w, y - 8 * s, x + w, y - h);
  ctx.closePath();
  ctx.fillStyle = rgba('#e8f4ff', 0.35);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(x - w, y + h);
  ctx.quadraticCurveTo(x, y + h * 0.25, x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - w, y - h * 0.55, w * 2, h * 0.5);
  ctx.fillRect(x - 1.5 * s, y - h * 0.1, 3 * s, h * 0.8);
  ctx.restore();
  ink(ctx, 3.5);
  ellipse(ctx, x - w * 0.5, y - h * 0.6, 3 * s, 10 * s, 0.2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
}

function drawTitanKing(ctx: Ctx, art: FootArt, r: () => number): void {
  const stone = art.skin;
  const dark = art.primary!;
  const brz = art.secondary!;
  const sand = String(art.extra?.sand ?? '#f0c860');
  // broken chains hang from the shackles, behind the foot
  hangingChain(ctx, 14, 84, -26, 214, 22, 9, '#8a7a6a');
  hangingChain(ctx, 206, 84, 250, 206, 26, 9, '#8a7a6a');
  // the body: a bare giant's foot of weathered stone
  barePath(ctx, ART_BARE);
  ctx.fillStyle = skinBodyFill(ctx, stone);
  ctx.fill();
  ctx.save();
  barePath(ctx, ART_BARE);
  ctx.clip();
  glossy(ctx, 72, 70, 50, 84, 0.18);
  // weathering: mottled patches, moss in the hollows, chisel marks
  for (let i = 0; i < 26; i++) {
    ellipse(ctx, 20 + r() * 190, r() * 220, 6 + r() * 18, 4 + r() * 12, r() * 3);
    ctx.fillStyle = rgba(r() < 0.5 ? shade(stone, -0.3) : shade(stone, 0.18), 0.22 + r() * 0.18);
    ctx.fill();
  }
  for (let i = 0; i < 7; i++) {
    ellipse(ctx, 26 + r() * 40, 120 + r() * 90, 8 + r() * 10, 4 + r() * 6, r());
    ctx.fillStyle = rgba('#5a7a3a', 0.35);
    ctx.fill();
  }
  // the carved Titan face on the instep: a heavy brow, deep-set glowing eyes, a stone beard, the mouth he bites with
  const fx = CX + 4;
  ctx.beginPath();
  ctx.moveTo(fx - 64, 74);
  ctx.quadraticCurveTo(fx, 48, fx + 64, 74);
  ctx.quadraticCurveTo(fx + 30, 84, fx, 80);
  ctx.quadraticCurveTo(fx - 30, 84, fx - 64, 74);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 50, 0, 86, [
    [0, shade(stone, 0.2)],
    [1, shade(stone, -0.25)],
  ]);
  ctx.fill();
  ink(ctx, 3.5, rgba(INK, 0.85));
  for (const d of [-1, 1]) {
    ellipse(ctx, fx + d * 30, 96, 17, 11);
    ctx.fillStyle = '#1a1410';
    ctx.fill();
    ink(ctx, 3);
    const g = ctx.createRadialGradient(fx + d * 30, 96, 0, fx + d * 30, 96, 14);
    g.addColorStop(0, '#fff6c0');
    g.addColorStop(0.5, sand);
    g.addColorStop(1, rgba(sand, 0));
    ctx.fillStyle = g;
    ellipse(ctx, fx + d * 30, 96, 12, 8);
    ctx.fill();
  }
  // the nose ridge
  ctx.beginPath();
  ctx.moveTo(fx, 84);
  ctx.lineTo(fx - 9, 124);
  ctx.quadraticCurveTo(fx, 130, fx + 9, 124);
  ink(ctx, 3, rgba(INK, 0.7));
  // the stone beard round the mouth, carved in ridged locks
  ctx.beginPath();
  ctx.moveTo(fx - 58, 118);
  ctx.quadraticCurveTo(fx - 64, 186, fx, 204);
  ctx.quadraticCurveTo(fx + 64, 186, fx + 58, 118);
  ctx.quadraticCurveTo(fx, 132, fx - 58, 118);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, fx - 60, 120, fx + 60, 204, [
    [0, shade(dark, 0.25)],
    [1, shade(dark, -0.3)],
  ]);
  ctx.fill();
  ink(ctx, 3.5, rgba(INK, 0.8));
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(fx + k * 15, 130);
    ctx.quadraticCurveTo(fx + k * 18 + 6, 166, fx + k * 12, 196 - Math.abs(k) * 6);
    ink(ctx, 2, rgba(INK, 0.45));
  }
  // the mouth: a dark slot with square stone teeth (it opens in play)
  const J = TITAN_JAW;
  roundRect(ctx, J.x - 34, J.y - 11, 68, 22, 8);
  ctx.fillStyle = '#140c08';
  ctx.fill();
  ink(ctx, 3);
  for (let k = 0; k < 5; k++) {
    roundRect(ctx, J.x - 30 + k * 12.5, J.y - 10, 10, 8, 2);
    ctx.fillStyle = '#d8d0c0';
    ctx.fill();
    roundRect(ctx, J.x - 30 + k * 12.5, J.y + 3, 10, 7, 2);
    ctx.fill();
  }
  // cracks that leak the golden light of stolen time
  for (const pts of [
    [[30, 40], [44, 70], [36, 96], [50, 126]],
    [[186, 30], [176, 64], [190, 92]],
    [[150, 150], [168, 176], [160, 200]],
  ] as [number, number][][]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ink(ctx, 6, rgba(INK, 0.8));
    ink(ctx, 2.5, sand);
  }
  // a shadow down the right and occlusion towards the toes
  ctx.fillStyle = rgba('#000000', 0.14);
  ctx.fillRect(176, -10, 60, 240);
  ctx.restore();
  barePath(ctx, ART_BARE, true);
  ink(ctx, OUT + 0.5, outlineOf(stone));
  for (const t of BIG_TOES) {
    drawToe(ctx, t, shade(stone, -0.04), { nail: '#6a645e', ol: outlineOf(stone), r });
  }
  // a chip off the big toe, gold glinting in it
  ctx.beginPath();
  ctx.moveTo(176, 214);
  ctx.lineTo(186, 222);
  ctx.lineTo(198, 214);
  ink(ctx, 3, sand);
  // the bronze shackle round the ankle, studded, with the hourglass hung at the front
  roundRect(ctx, 40, 18, 140, 44, 10);
  ctx.fillStyle = bronze(ctx, 18, 62, brz);
  ctx.fill();
  ink(ctx, 4.5);
  ctx.strokeStyle = rgba(shade(brz, -0.5), 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 52; x < 172; x += 20) {
    ctx.moveTo(x, 50);
    ctx.lineTo(x, 32);
    ctx.lineTo(x + 10, 32);
    ctx.lineTo(x + 10, 44);
  }
  ctx.stroke();
  for (const x of [48, 172]) {
    ctx.beginPath();
    ctx.arc(x, 40, 5, 0, Math.PI * 2);
    ctx.fillStyle = shade(brz, 0.5);
    ctx.fill();
    ink(ctx, 2);
  }
  // shackle rings where the chains were bolted on
  for (const [x, d] of [[22, -1], [198, 1]] as const) {
    ellipse(ctx, x, 70, 12, 16, d * 0.3);
    ctx.lineWidth = 10;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = bronze(ctx, 54, 86, brz);
    ctx.stroke();
  }
  hourglass(ctx, CX, 10, 0.62, sand);
}

// ——— ZEUS ———

function drawZeus(ctx: Ctx, art: FootArt, r: () => number): void {
  const marble = art.skin;
  const gold = art.secondary!;
  const bolt = String(art.extra?.bolt ?? '#9fd8ff');
  // the body: a bare foot of white marble
  barePath(ctx, ART_BARE);
  ctx.fillStyle = skinBodyFill(ctx, marble);
  ctx.fill();
  ctx.save();
  barePath(ctx, ART_BARE);
  ctx.clip();
  glossy(ctx, 70, 66, 52, 86, 0.4);
  // grey-blue marble veins
  for (let i = 0; i < 9; i++) {
    let x = 20 + r() * 190;
    let y = -6 + r() * 60;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (r() - 0.5) * 34;
      y += 18 + r() * 14;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba('#8a96aa', 0.25 + r() * 0.25);
    ctx.lineWidth = 1 + r() * 2.2;
    ctx.stroke();
  }
  // the sandal: gold straps criss-crossing up the ankle, a wide band across the instep
  const strap = (y0: number, y1: number, x0: number, x1: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0 - 6);
    ctx.lineTo(x1, y1 - 6);
    ctx.lineTo(x1, y1 + 6);
    ctx.lineTo(x0, y0 + 6);
    ctx.closePath();
    ctx.fillStyle = bronze(ctx, Math.min(y0, y1) - 6, Math.max(y0, y1) + 6, gold);
    ctx.fill();
    ink(ctx, 3);
  };
  for (const y of [6, 40, 74]) {
    strap(y, y + 26, 20, 200);
    strap(y + 26, y, 20, 200);
  }
  // the thunderbolt inlay on the instep, glowing sky-blue
  const B = ZEUS_BOLT;
  // a round gold medallion with a sky-blue enamel field
  ctx.beginPath();
  ctx.arc(B.x, B.y + 20, 46, 0, Math.PI * 2);
  ctx.fillStyle = bronze(ctx, B.y - 26, B.y + 66, gold);
  ctx.fill();
  ink(ctx, 4);
  ctx.beginPath();
  ctx.arc(B.x, B.y + 20, 35, 0, Math.PI * 2);
  ctx.fillStyle = '#1a2a4a';
  ctx.fill();
  ink(ctx, 3);
  const g = ctx.createRadialGradient(B.x, B.y + 20, 2, B.x, B.y + 20, 46);
  g.addColorStop(0, rgba(bolt, 0.9));
  g.addColorStop(1, rgba(bolt, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(B.x, B.y + 20, 35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(B.x + 8, B.y - 4);
  ctx.lineTo(B.x - 14, B.y + 24);
  ctx.lineTo(B.x - 1, B.y + 24);
  ctx.lineTo(B.x - 10, B.y + 48);
  ctx.lineTo(B.x + 16, B.y + 16);
  ctx.lineTo(B.x + 3, B.y + 16);
  ctx.closePath();
  ctx.fillStyle = '#f4fbff';
  ctx.fill();
  ink(ctx, 2.5);
  // the strap ending at the toes, and a soft shadow down the right
  strap(196, 200, 10, 214);
  ctx.fillStyle = rgba('#3a4a6a', 0.1);
  ctx.fillRect(176, -10, 60, 240);
  ctx.restore();
  barePath(ctx, ART_BARE, true);
  ink(ctx, OUT + 0.5, outlineOf('#c8c0b4'));
  for (const t of BIG_TOES) drawToe(ctx, t, shade(marble, -0.02), { nail: '#fff8ee', ol: outlineOf('#c8c0b4'), r });
  // a gold ring on the big toe
  ctx.beginPath();
  ctx.ellipse(188, 220, 30, 9, 0, 0, Math.PI);
  ink(ctx, 9);
  ink(ctx, 5, gold);
  // the laurel round the ankle: two gold sprays meeting at the front
  for (const d of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const x = CX + d * (14 + k * 15);
      const y = -2 + k * 1.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(d * (0.6 + k * 0.08));
      ellipse(ctx, 0, -8, 6, 13);
      ctx.fillStyle = bronze(ctx, -22, 6, gold);
      ctx.fill();
      ink(ctx, 2.5);
      ellipse(ctx, 0, 8, 6, 12);
      ctx.fill();
      ink(ctx, 2.5);
      ctx.restore();
    }
  }
  ctx.beginPath();
  ctx.arc(CX, 0, 7, 0, Math.PI * 2);
  ctx.fillStyle = bolt;
  ctx.fill();
  ink(ctx, 2.5);
}

registerKind('nz_titanking', { draw: drawTitanKing, contactY: TITAN_JAW.contact, halfWidth: 112 });
registerKind('nz_zeus', { draw: drawZeus, contactY: ZEUS_BOLT.contact, halfWidth: 110 });
