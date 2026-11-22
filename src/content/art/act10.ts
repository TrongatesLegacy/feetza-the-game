// Art kinds for Act 10 · Finale (data in src/content/feet/act10.ts). Same design frame as the built-in
// kinds: centre x = CX (110), the ankle opens at y = -6, the canvas spans x -40..260, y -8..337.
//
// - echo-*: an echo is two earlier feet at once. Foot A is drawn whole, foot B shows through it in
//   glitch bands, with a red/cyan split behind the silhouette and scanlines over it. The runtime glitch
//   (slice jitter, RGB split) is the GLSL pass in src/game/finale.ts.
// - mirrorpeel: a dark obsidian peel (its runtime look is the player's own peel, mirrored).
// - ghostfuture: a pale holographic foot with a clock on it.
// - soleprop / soleunbound: a cosmic foot in a pinstripe trouser, gold on every toe; unbound, cracked with light.

import type { FootArt, FootType } from '../../data/feet';
import { FOOT_BY_ID } from '../../data/feet';
import { drawFoot } from '../../art/feetArt';
import { CX, INK, OUT, barePath, drawBare, outlineOf, toesFor } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, makeCanvas, rgba, shade } from '../../art/util';

// feetArt's padding around the design frame
const PX = 40;
const PY = 8;

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// ——— Echoes ———

const srcCache = new Map<string, HTMLCanvasElement>();

/** An earlier foot drawn at design scale (1 px = 1 design unit), padding included. */
function srcFoot(id: string): HTMLCanvasElement | null {
  const hit = srcCache.get(id);
  if (hit) return hit;
  const t = FOOT_BY_ID[id];
  if (!t || t.art.kind.startsWith('echo')) return null;
  const c = drawFoot({ ...t, scale: 1 } as FootType, 1).foot;
  srcCache.set(id, c);
  return c;
}

/** The source silhouette filled flat with one colour (the chromatic split behind the echo). */
function flat(src: HTMLCanvasElement, col: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function drawEcho(ctx: Ctx, art: FootArt, r: () => number): void {
  const ex = art.extra ?? {};
  const A = srcFoot(String(ex.a));
  const B = srcFoot(String(ex.b));
  const glitch = String(ex.glitch ?? '#ff3df0');
  if (!A) return;
  // the echo never quite lines up with itself: a red and a cyan copy, off to each side
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.drawImage(flat(A, '#ff2d6f'), -PX - 8, -PY + 1);
  ctx.drawImage(flat(A, '#2de1ff'), -PX + 8, -PY - 1);
  ctx.restore();
  ctx.drawImage(A, -PX, -PY);
  // the second foot shows through in torn horizontal bands
  if (B) {
    const bands: [number, number, number][] = [
      [30 + r() * 20, 78 + r() * 14, 8],
      [128 + r() * 10, 168 + r() * 10, -10],
      [206 + r() * 8, 236 + r() * 10, 6],
    ];
    for (const [y0, y1, dx] of bands) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-40, y0, 300, y1 - y0);
      ctx.clip();
      ctx.drawImage(B, -PX + dx, -PY);
      ctx.restore();
    }
    // bright seams where the bands tear (only on the foot itself)
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    for (const [y0, y1] of bands) {
      for (const y of [y0, y1]) {
        ctx.fillStyle = rgba(glitch, 0.85);
        ctx.fillRect(-40, y - 1.5, 300, 3);
        ctx.fillStyle = rgba('#ffffff', 0.6);
        ctx.fillRect(-40, y - 0.5, 300, 1);
      }
    }
    ctx.restore();
  }
  // scanlines and a few dead pixel blocks in the glitch colour, clipped to the foot
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = rgba('#000000', 0.12);
  for (let y = -8; y < 337; y += 6) ctx.fillRect(-40, y, 300, 2);
  for (let i = 0; i < 9; i++) {
    const w = 10 + r() * 34;
    const h = 4 + r() * 9;
    ctx.fillStyle = rgba(i % 3 ? glitch : '#ffffff', 0.35 + r() * 0.35);
    ctx.fillRect(10 + r() * 190, 10 + r() * 240, w, h);
  }
  // a top-left light across the whole mash-up so the two halves sit in one light
  const hl = ctx.createLinearGradient(10, 0, 210, 260);
  hl.addColorStop(0, rgba('#ffffff', 0.16));
  hl.addColorStop(0.5, rgba('#ffffff', 0));
  hl.addColorStop(1, rgba('#000000', 0.16));
  ctx.fillStyle = hl;
  ctx.fillRect(-40, -8, 300, 345);
  ctx.restore();
}

// contact and width follow foot A's kind (feetArt's tables)
for (const [k, contactY, halfWidth] of [
  ['robot', 258, 104],
  ['bare', 260, 104],
  ['cowboy', 272, 104],
  ['clown', 270, 148],
  ['dino', 292, 104],
] as [string, number, number][]) {
  registerKind(`echo-${k}`, { draw: drawEcho, contactY, halfWidth });
}

// ——— The Mirror Peel ———

/** The peel's head, pointing down at the pizzas. */
function peelHead(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(CX - 26, 70);
  ctx.bezierCurveTo(CX - 40, 92, CX - 112, 110, CX - 108, 196);
  ctx.bezierCurveTo(CX - 104, 266, CX - 52, 302, CX, 302);
  ctx.bezierCurveTo(CX + 52, 302, CX + 104, 266, CX + 108, 196);
  ctx.bezierCurveTo(CX + 112, 110, CX + 40, 92, CX + 26, 70);
  ctx.closePath();
}

function drawMirrorPeel(ctx: Ctx, art: FootArt, r: () => number): void {
  const glow = art.secondary ?? '#b06bff';
  // the handle, from the ankle down into the head
  ctx.beginPath();
  ctx.moveTo(CX - 24, -6);
  ctx.lineTo(CX - 24, 86);
  ctx.lineTo(CX + 24, 86);
  ctx.lineTo(CX + 24, -6);
  const hg = ctx.createLinearGradient(CX - 24, 0, CX + 24, 0);
  hg.addColorStop(0, '#120e1c');
  hg.addColorStop(0.45, '#4a3a70');
  hg.addColorStop(1, '#0c0a14');
  ctx.fillStyle = hg;
  ctx.fill();
  ink(ctx, OUT, '#08060c');
  // a violet halo behind the head
  const halo = ctx.createRadialGradient(CX, 200, 40, CX, 200, 150);
  halo.addColorStop(0, rgba(glow, 0.45));
  halo.addColorStop(1, rgba(glow, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(-40, 40, 300, 297);
  // obsidian head with a mirror sheen
  peelHead(ctx);
  const g = ctx.createLinearGradient(CX - 110, 80, CX + 110, 300);
  g.addColorStop(0, '#3a2c5c');
  g.addColorStop(0.35, '#17122a');
  g.addColorStop(0.6, '#241a3e');
  g.addColorStop(1, '#0a0812');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  peelHead(ctx);
  ctx.clip();
  // the reflection: two bright diagonal streaks from the top-left light
  ctx.fillStyle = rgba('#ffffff', 0.22);
  ctx.beginPath();
  ctx.moveTo(CX - 120, 150);
  ctx.lineTo(CX - 40, 70);
  ctx.lineTo(CX - 10, 70);
  ctx.lineTo(CX - 110, 190);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.1);
  ctx.beginPath();
  ctx.moveTo(CX - 100, 220);
  ctx.lineTo(CX + 20, 90);
  ctx.lineTo(CX + 40, 90);
  ctx.lineTo(CX - 86, 240);
  ctx.closePath();
  ctx.fill();
  // mirror cracks spreading from a chip near the rim
  ctx.strokeStyle = rgba('#e0c8ff', 0.7);
  ctx.lineWidth = 2.2;
  const ox = CX + 58;
  const oy = 246;
  for (let i = 0; i < 7; i++) {
    let x = ox;
    let y = oy;
    const a0 = Math.PI * (0.7 + r() * 1.3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      const a = a0 + (r() - 0.5) * 0.7;
      x += Math.cos(a) * (12 + r() * 18);
      y += Math.sin(a) * (12 + r() * 18);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // inner rim glow
  ctx.lineWidth = 14;
  ctx.strokeStyle = rgba(glow, 0.35);
  peelHead(ctx);
  ctx.stroke();
  ctx.restore();
  peelHead(ctx);
  ink(ctx, OUT + 1, '#08060c');
  // angry glowing eyes: it's you, but it doesn't like you
  for (const s of [-1, 1]) {
    const ex = CX + s * 36;
    const ey = 176;
    const eg = ctx.createRadialGradient(ex, ey, 2, ex, ey, 30);
    eg.addColorStop(0, rgba('#ffffff', 0.95));
    eg.addColorStop(0.3, rgba(glow, 0.9));
    eg.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = eg;
    ctx.fillRect(ex - 32, ey - 32, 64, 64);
    ellipse(ctx, ex, ey, 13, 9, s * 0.25);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ink(ctx, 3, '#1a0f30');
    // a heavy brow slanting in
    ctx.beginPath();
    ctx.moveTo(ex - s * 22, ey - 24);
    ctx.lineTo(ex + s * 16, ey - 10);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#08060c';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // a grim mouth
  ctx.beginPath();
  ctx.moveTo(CX - 26, 236);
  ctx.quadraticCurveTo(CX, 222, CX + 26, 236);
  ctx.lineWidth = 6;
  ctx.strokeStyle = rgba(glow, 0.9);
  ctx.stroke();
}

registerKind('mirrorpeel', { draw: drawMirrorPeel, contactY: 300, halfWidth: 104 });

// ——— The Ghost of Feet Future ———

function drawGhostFuture(ctx: Ctx, art: FootArt, r: () => number): void {
  drawBare(ctx, art, r);
  const holo = art.secondary ?? '#7df9ff';
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  // holographic scanlines
  ctx.fillStyle = rgba(holo, 0.16);
  for (let y = 0; y < 240; y += 7) ctx.fillRect(0, y, 230, 2.5);
  // a clock on the top of the foot, running backwards (the hands are mirrored)
  const cx = 112;
  const cy = 104;
  ctx.beginPath();
  ctx.arc(cx, cy, 36, 0, Math.PI * 2);
  ctx.fillStyle = rgba('#ffffff', 0.55);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = rgba(shade(holo, -0.5), 0.9);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
    ctx.lineTo(cx + Math.cos(a) * (i % 3 ? 32 : 24), cy + Math.sin(a) * (i % 3 ? 32 : 24));
    ctx.lineWidth = i % 3 ? 2 : 4;
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - 14, cy - 14);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 2, cy - 26);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2a4a6a';
  ctx.stroke();
  // a chrome band at the ankle with a readout from the future
  const bg = ctx.createLinearGradient(0, 6, 0, 36);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.4, '#b8d4e8');
  bg.addColorStop(1, '#6a8aa8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 8, 230, 26);
  ctx.fillStyle = rgba('#0a2030', 0.85);
  ctx.fillRect(84, 12, 56, 18);
  ctx.fillStyle = holo;
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T-1s', 112, 22);
  ctx.restore();
  barePath(ctx, art, true);
  ink(ctx, OUT, outlineOf(art.skin));
  // chrome caps on the toes catch a cold blue rim light
  for (const t of toesFor(art)) {
    ellipse(ctx, t.cx - t.rx * 0.3, t.cy - t.ry * 0.5, t.rx * 0.35, t.ry * 0.2, -0.4);
    ctx.fillStyle = rgba('#ffffff', 0.6);
    ctx.fill();
    ellipse(ctx, t.cx, t.cy, t.rx + 2, t.ry + 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(holo, 0.75);
    ctx.stroke();
  }
}

registerKind('ghostfuture', { draw: drawGhostFuture, contactY: 264, halfWidth: 104 });

// ——— The Sole Proprietor ———

const GOLD = ['#fff4b0', '#ffd23f', '#b07a10'] as const;

function goldFill(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, GOLD[0]);
  g.addColorStop(0.45, GOLD[1]);
  g.addColorStop(1, GOLD[2]);
  return g;
}

/** A cosmos inside the foot: nebula washes and stars, lit from the top left. */
function cosmos(ctx: Ctx, art: FootArt, r: () => number): void {
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  for (const [x, y, rad, col] of [
    [70, 80, 90, '#ff4fd8'],
    [160, 150, 100, '#36e0ff'],
    [100, 200, 70, '#b06bff'],
  ] as [number, number, number, string][]) {
    const g = ctx.createRadialGradient(x, y, 4, x, y, rad);
    g.addColorStop(0, rgba(col, 0.45));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, -10, 230, 250);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 70; i++) {
    const x = 16 + r() * 200;
    const y = -4 + r() * 230;
    const s = r() < 0.12 ? 2.6 : 1.1 + r() * 0.8;
    ctx.fillStyle = rgba('#ffffff', 0.5 + r() * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  // a constellation shaped like a pizza slice: he owns the stars too
  const pts: [number, number][] = [[80, 64], [140, 60], [110, 132]];
  ctx.strokeStyle = rgba('#fff4b0', 0.7);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.stroke();
  for (const [x, y] of pts) {
    ctx.fillStyle = '#fff4b0';
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Gold on every toe: rings, and a signet with a pizza slice on the big toe. */
function bling(ctx: Ctx, art: FootArt): void {
  const toes = toesFor(art);
  for (const [i, t] of toes.entries()) {
    if (i === 4) continue;
    ctx.beginPath();
    ctx.ellipse(t.cx, t.cy - t.ry * 0.55, t.rx * 0.95, t.ry * 0.24, 0, 0, Math.PI * 2);
    ctx.lineWidth = 7;
    ctx.strokeStyle = GOLD[2];
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = GOLD[1];
    ctx.stroke();
  }
  const big = toes[4];
  const sx = big.cx;
  const sy = big.cy - big.ry * 0.5;
  ctx.beginPath();
  ctx.ellipse(sx, sy, big.rx * 0.98, big.ry * 0.26, 0, 0, Math.PI * 2);
  ctx.lineWidth = 9;
  ctx.strokeStyle = GOLD[2];
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = GOLD[1];
  ctx.stroke();
  ellipse(ctx, sx, sy - 4, 17, 13);
  ctx.fillStyle = goldFill(ctx, sx - 17, sy - 17, sx + 17, sy + 9);
  ctx.fill();
  ink(ctx, 3.5);
  // the slice emblem
  ctx.beginPath();
  ctx.moveTo(sx - 9, sy - 11);
  ctx.lineTo(sx + 9, sy - 11);
  ctx.lineTo(sx, sy + 6);
  ctx.closePath();
  ctx.fillStyle = '#e5542f';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** A gold cuff at the ankle, set with gems: a crown worn on the foot. */
function cuff(ctx: Ctx, broken: boolean): void {
  ctx.beginPath();
  ctx.moveTo(48, 4);
  ctx.lineTo(172, 4);
  ctx.lineTo(176, 34);
  ctx.lineTo(44, 34);
  ctx.closePath();
  ctx.fillStyle = goldFill(ctx, 0, 4, 0, 34);
  ctx.fill();
  ink(ctx);
  // crown points along the top edge
  for (let i = 0; i < 5; i++) {
    const x = 58 + i * 26;
    ctx.beginPath();
    ctx.moveTo(x - 10, 6);
    ctx.lineTo(x, -16);
    ctx.lineTo(x + 10, 6);
    ctx.closePath();
    ctx.fillStyle = goldFill(ctx, 0, -16, 0, 6);
    ctx.fill();
    ink(ctx, 3.5);
  }
  for (const [i, col] of ['#ff3d6e', '#36e0ff', '#7be04a', '#b06bff', '#ff3d6e'].entries()) {
    const x = 62 + i * 24;
    ellipse(ctx, x, 20, 6.5, 6);
    ctx.fillStyle = col;
    ctx.fill();
    ink(ctx, 2.2);
    ellipse(ctx, x - 2, 17.5, 2.2, 1.6);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  if (broken) {
    // the cuff has burst: a jagged split with light pouring through
    ctx.beginPath();
    ctx.moveTo(108, -18);
    ctx.lineTo(116, 2);
    ctx.lineTo(104, 14);
    ctx.lineTo(118, 38);
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#fffbe0';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function drawSoleProp(ctx: Ctx, art: FootArt, r: () => number): void {
  // a deep violet foot, the toenails gilded
  const a = { ...art, skin: '#6a4bb8', nails: '#ffd23f' };
  drawBare(ctx, a, r);
  cosmos(ctx, a, r);
  barePath(ctx, a, true);
  ink(ctx, OUT, outlineOf('#6a4bb8'));
  bling(ctx, a);
  cuff(ctx, false);
}

function drawSoleUnbound(ctx: Ctx, art: FootArt, r: () => number): void {
  // flames of light lick round the foot before anything else is drawn
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const x = 18 + t * 196;
    const y = 120 + Math.sin(t * Math.PI) * 110;
    const h = 40 + r() * 50;
    const g = ctx.createLinearGradient(x, y, x, y - h);
    g.addColorStop(0, rgba('#ffd23f', 0.75));
    g.addColorStop(1, rgba('#ff4fd8', 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.quadraticCurveTo(x - 10, y - h * 0.6, x + (r() - 0.5) * 16, y - h);
    ctx.quadraticCurveTo(x + 12, y - h * 0.5, x + 16, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const a = { ...art, skin: '#4a2f96', nails: '#fff4b0' };
  drawBare(ctx, a, r);
  cosmos(ctx, a, r);
  // cracks of light: the power inside is getting out
  ctx.save();
  barePath(ctx, a);
  ctx.clip();
  const cracks: [number, number][][] = [
    [[60, -6], [74, 40], [62, 74], [86, 120], [76, 160]],
    [[150, -6], [140, 36], [158, 70], [136, 116], [150, 150], [138, 196]],
    [[100, 60], [112, 92], [102, 128]],
  ];
  for (const pts of cracks) {
    for (const [lw, col] of [[16, rgba('#ffd23f', 0.35)], [8, '#fff4b0'], [3, '#ffffff']] as [number, string][]) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineWidth = lw;
      ctx.strokeStyle = col;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }
  ctx.restore();
  barePath(ctx, a, true);
  ink(ctx, OUT + 0.5, '#1a0f30');
  bling(ctx, a);
  cuff(ctx, true);
  // a broken chain hangs off each side of the ankle: unbound
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = CX + s * (70 + i * 5);
      const y = 40 + i * 20;
      ellipse(ctx, x, y, 8, 12, s * 0.3 + (i % 2 ? Math.PI / 2 : 0));
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#2a2440';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#9aa3c8';
      ctx.stroke();
    }
  }
}

registerKind('soleprop', { draw: drawSoleProp, contactY: 260, halfWidth: 104 });
registerKind('soleunbound', { draw: drawSoleUnbound, contactY: 260, halfWidth: 104 });
