// Art kinds for the Feetza 2.0 bosses and mini-bosses (data in src/content/feet/bosses.ts).
// Same design frame as the built-in kinds: centre x = CX (110), the ankle opens at y = -6,
// the leg comes from FootArt.leg and the canvas spans x -40..260, y -8..337.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, type Toe, barePath, drawBareBody, drawHair, drawToe, glossy, laces, leatherFill, outlineOf, shoePath, skinBodyFill, toesFor } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, blob, ellipse, rgba, roundRect, shade } from '../../art/util';

type P = [number, number];

// ——— Shared helpers ———

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
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

function vgrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

function starPath(ctx: Ctx, x: number, y: number, R: number, r: number, n = 5, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const rr = i % 2 ? r : R;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** Four-point glint. */
function twinkle(ctx: Ctx, x: number, y: number, s: number, col = '#ffffff', glow = '#ffffff'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col;
  ctx.shadowColor = glow;
  ctx.shadowBlur = s * 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(0, 0, s, 0);
  ctx.quadraticCurveTo(0, 0, 0, s);
  ctx.quadraticCurveTo(0, 0, -s, 0);
  ctx.quadraticCurveTo(0, 0, 0, -s);
  ctx.fill();
  ctx.restore();
}

/** Fill several overlapping shapes as one outlined silhouette (stroke all thick, then fill all). */
function union(ctx: Ctx, shapes: (() => void)[], fill: string | CanvasGradient, ol = INK, lw = OUT): void {
  for (const s of shapes) {
    s();
    ctx.strokeStyle = ol;
    ctx.lineWidth = lw * 2;
    ctx.stroke();
  }
  ctx.fillStyle = fill;
  for (const s of shapes) {
    s();
    ctx.fill();
  }
}

function circles(list: [number, number, number][]): (ctx: Ctx) => (() => void)[] {
  return (ctx) => list.map(([x, y, rr]) => () => ellipse(ctx, x, y, rr, rr));
}

function bez(p0: P, p1: P, p2: P, p3: P, n = 28): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

/** Tapered ribbon along a polyline (tentacles, bird toes, straws). */
function ribbon(ctx: Ctx, pts: P[], w0: number, w1: number): void {
  const L: P[] = [];
  const R: P[] = [];
  const n = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = (w0 + (w1 - w0) * (i / n)) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  const end = pts[n];
  const a0 = Math.atan2(L[n][1] - end[1], L[n][0] - end[0]);
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i <= n; i++) ctx.lineTo(L[i][0], L[i][1]);
  ctx.arc(end[0], end[1], Math.max(0.5, w1 / 2), a0, a0 - Math.PI, true);
  for (let i = n; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
}

/** Tangent angle and point along a polyline at fraction t. */
function along(pts: P[], t: number): { x: number; y: number; a: number } {
  const i = Math.min(pts.length - 2, Math.max(0, Math.floor(t * (pts.length - 1))));
  const [x0, y0] = pts[i];
  const [x1, y1] = pts[i + 1];
  return { x: x0, y: y0, a: Math.atan2(y1 - y0, x1 - x0) };
}

/** Crown with its base centred at (x, y). */
function crown(ctx: Ctx, x: number, y: number, w: number, h: number, gold: string, gems: string[], peaks = 5): void {
  const l = x - w / 2;
  const step = w / (peaks - 1);
  ctx.beginPath();
  ctx.moveTo(l + 2, y);
  ctx.lineTo(l, y - h);
  for (let i = 1; i < peaks; i++) {
    ctx.lineTo(l + (i - 0.5) * step, y - h * (i === Math.floor(peaks / 2) || i === Math.ceil(peaks / 2) ? 0.42 : 0.5));
    ctx.lineTo(l + i * step, y - h * (i === Math.floor(peaks / 2) && peaks % 2 ? 1.12 : 1));
  }
  ctx.lineTo(l + w - 2, y);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, y - h, y, [[0, shade(gold, 0.55)], [0.45, gold], [1, shade(gold, -0.4)]]);
  ctx.fill();
  ink(ctx, 4);
  // band
  roundRect(ctx, l - 1, y - h * 0.34, w + 2, h * 0.34, 3);
  ctx.fillStyle = vgrad(ctx, y - h * 0.34, y, [[0, shade(gold, 0.25)], [1, shade(gold, -0.45)]]);
  ctx.fill();
  ink(ctx, 3.5);
  // finials + gems
  for (let i = 0; i < peaks; i++) {
    const py = y - h * (i === Math.floor(peaks / 2) && peaks % 2 ? 1.12 : 1);
    ellipse(ctx, l + i * step, py, h * 0.1, h * 0.1);
    ctx.fillStyle = shade(gold, 0.5);
    ctx.fill();
    ink(ctx, 2.5);
  }
  gems.forEach((g, i) => {
    const gx = l + (w * (i + 1)) / (gems.length + 1);
    ellipse(ctx, gx, y - h * 0.17, h * 0.11, h * 0.11);
    ctx.fillStyle = g;
    ctx.fill();
    ink(ctx, 2);
    ellipse(ctx, gx - 1.5, y - h * 0.2, h * 0.04, h * 0.04);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });
  glossy(ctx, l + w * 0.3, y - h * 0.62, w * 0.12, h * 0.14, 0.6);
}

function bareToes(ctx: Ctx, art: FootArt, r: () => number): void {
  for (const t of toesFor(art)) drawToe(ctx, t, art.skin, { nail: art.nails, r });
}

// ——— COSMIC CROC: foam clog with holes, space charms and heel rockets ———

function drawSpaceClog(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const glow = art.secondary!;
  // heel rockets (behind), nozzles up, flames up
  for (const sx of [-1, 1]) {
    const x = CX + sx * 110;
    ctx.save();
    ctx.shadowColor = '#ffb02e';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(x - 12, 34);
    ctx.quadraticCurveTo(x - 16, 10, x, -6);
    ctx.quadraticCurveTo(x + 16, 10, x + 12, 34);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -6, 34, [[0, '#ff4d1a'], [0.5, '#ffb02e'], [1, '#fff3b0']]);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x - 6, 34);
    ctx.quadraticCurveTo(x - 6, 18, x, 8);
    ctx.quadraticCurveTo(x + 6, 18, x + 6, 34);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // fins
    ctx.beginPath();
    ctx.moveTo(x - 14, 50);
    ctx.lineTo(x - 26, 36);
    ctx.lineTo(x - 26, 66);
    ctx.lineTo(x - 14, 80);
    ctx.moveTo(x + 14, 50);
    ctx.lineTo(x + 26, 36);
    ctx.lineTo(x + 26, 66);
    ctx.lineTo(x + 14, 80);
    ctx.fillStyle = '#e5242f';
    ctx.fill();
    ink(ctx, 3.5);
    // nozzle
    ctx.beginPath();
    ctx.moveTo(x - 10, 32);
    ctx.lineTo(x + 10, 32);
    ctx.lineTo(x + 14, 46);
    ctx.lineTo(x - 14, 46);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, x - 14, x + 14, '#59626d');
    ctx.fill();
    ink(ctx, 3.5);
    // body + nose cone (points down)
    ctx.beginPath();
    ctx.moveTo(x - 15, 44);
    ctx.lineTo(x + 15, 44);
    ctx.lineTo(x + 15, 118);
    ctx.quadraticCurveTo(x + 14, 140, x, 156);
    ctx.quadraticCurveTo(x - 14, 140, x - 15, 118);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, x - 15, x + 15, '#dfe5ee');
    ctx.fill();
    ink(ctx, 4);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#e5242f';
    ctx.fillRect(x - 16, 120, 32, 40);
    ctx.fillStyle = rgba('#000000', 0.25);
    ctx.fillRect(x - 16, 118, 32, 3);
    ctx.restore();
    // porthole
    ellipse(ctx, x, 78, 8, 8);
    ctx.fillStyle = '#123';
    ctx.fill();
    ink(ctx, 3);
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
    ellipse(ctx, x, 78, 5, 5);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.restore();
  }
  drawBareBody(ctx, art, r);
  // chunky foam sole
  roundRect(ctx, CX - 104, 244, 208, 36, 17);
  ctx.fillStyle = vgrad(ctx, 244, 280, [[0, shade(p, -0.1)], [1, shade(p, -0.6)]]);
  ctx.fill();
  ink(ctx);
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 12;
  roundRect(ctx, CX - 94, 262, 188, 5, 2.5);
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.restore();
  const path = (open = false) => {
    ctx.beginPath();
    ctx.moveTo(4, 94);
    ctx.bezierCurveTo(-8, 182, 24, 266, CX, 268);
    ctx.bezierCurveTo(196, 266, 228, 182, 216, 94);
    if (!open) ctx.quadraticCurveTo(CX, 46, 4, 94);
  };
  path();
  const g = ctx.createRadialGradient(CX - 34, 140, 10, CX, 180, 160);
  g.addColorStop(0, shade(p, 0.4));
  g.addColorStop(0.55, p);
  g.addColorStop(1, shade(p, -0.5));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // nebula + stars
  const neb = ctx.createRadialGradient(150, 200, 4, 150, 200, 80);
  neb.addColorStop(0, rgba('#c86bff', 0.55));
  neb.addColorStop(1, rgba('#c86bff', 0));
  ctx.fillStyle = neb;
  ctx.fillRect(0, 90, 230, 190);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rgba('#ffffff', 0.4 + r() * 0.6);
    ellipse(ctx, 10 + r() * 200, 90 + r() * 170, 0.8 + r() * 1.6, 0.8 + r() * 1.6);
    ctx.fill();
  }
  // glowing vent holes
  const rows = [[150, 5], [188, 6], [226, 5]] as const;
  for (const [y, n] of rows) {
    for (let i = 0; i < n; i++) {
      const x = CX + (i - (n - 1) / 2) * 33;
      ellipse(ctx, x, y, 10, 8);
      ctx.fillStyle = shade(p, -0.7);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 8;
      ellipse(ctx, x, y + 2, 7, 4);
      ctx.fillStyle = rgba(glow, 0.8);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 8, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = rgba('#ffffff', 0.35);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  glossy(ctx, CX - 56, 124, 34, 18, 0.6);
  glossy(ctx, CX + 70, 220, 16, 10, 0.3);
  ctx.restore();
  path();
  ink(ctx);
  // opening rim with glow piping
  ctx.beginPath();
  ctx.moveTo(4, 94);
  ctx.quadraticCurveTo(CX, 46, 216, 94);
  ctx.strokeStyle = shade(p, -0.3);
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  // heel-strap rivets
  for (const x of [10, 210]) {
    ellipse(ctx, x, 108, 11, 11);
    ctx.fillStyle = metal(ctx, x - 11, x + 11, '#c3cdd8');
    ctx.fill();
    ink(ctx, 3.5);
  }
  // charms: ringed planet, star, moon
  const charm = (x: number, y: number) => {
    ellipse(ctx, x, y, 16, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ink(ctx, 3.5);
  };
  charm(58, 112);
  ellipse(ctx, 58, 112, 8, 8);
  ctx.fillStyle = '#ff9f1c';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(58, 112, 14, 4, -0.35, 0, Math.PI * 2);
  ctx.strokeStyle = '#8a4fb8';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  charm(CX + 2, 102);
  starPath(ctx, CX + 2, 103, 11, 4.5);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ink(ctx, 2);
  charm(162, 114);
  ctx.beginPath();
  ctx.arc(162, 114, 10, 0.6, Math.PI * 2 - 0.6, false);
  ctx.arc(167, 114, 7.5, Math.PI * 2 - 1.0, 1.0, true);
  ctx.closePath();
  ctx.fillStyle = '#c3cdd8';
  ctx.fill();
  ink(ctx, 2);
}

// ——— NONNA'S SLIPPER: fuzzy knitted slipper, pom-pom, wooden spoon ———

function drawNonna(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const s = art.secondary!;
  const W = 112;
  const B = 272;
  const l = CX - W;
  const rr = CX + W;
  const path = () => shoePath(ctx, { bottom: B, width: W });
  const rim: P[] = [
    ...bez([52, 30], [50, 60], [l + 4, 100], [l, 168], 16),
    ...bez([l, 168], [l - 2, B - 16], [CX - 50, B], [CX, B], 20).slice(1),
    ...bez([CX, B], [CX + 50, B], [rr + 2, B - 16], [rr, 168], 20).slice(1),
    ...bez([rr, 168], [rr - 4, 100], [170, 60], [168, 30], 16).slice(1),
  ];
  // fuzzy halo along the outline
  for (const [x, y] of rim) {
    for (let k = 0; k < 2; k++) {
      const a = Math.atan2(y - 150, x - CX) + (r() - 0.5) * 0.8;
      const len = 7 + r() * 7;
      ctx.strokeStyle = k ? shade(p, 0.2) : outlineOf(p);
      ctx.lineWidth = k ? 3.5 : 5;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * 3, y - Math.sin(a) * 3);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
  }
  path();
  ctx.fillStyle = p;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // knitted stripes
  const stripes: [number, number][] = [[96, 16], [150, 18], [210, 18]];
  for (const [y0, h] of stripes) {
    ctx.fillStyle = s;
    ctx.fillRect(-20, y0, 260, h);
  }
  // V stitches
  for (let y = 0; y < 280; y += 12) {
    const inStripe = stripes.some(([y0, h]) => y >= y0 && y < y0 + h);
    const base = inStripe ? s : p;
    for (let x = -16; x < 240; x += 13) {
      ctx.strokeStyle = shade(base, 0.28);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6.5, y + 9);
      ctx.lineTo(x + 13, y);
      ctx.stroke();
      ctx.strokeStyle = rgba(shade(base, -0.5), 0.45);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 4);
      ctx.lineTo(x + 6.5, y + 12);
      ctx.lineTo(x + 12, y + 4);
      ctx.stroke();
    }
  }
  // volume shading
  const vol = ctx.createRadialGradient(CX - 30, 120, 20, CX, 160, 160);
  vol.addColorStop(0, rgba('#ffffff', 0.25));
  vol.addColorStop(0.6, rgba('#ffffff', 0));
  vol.addColorStop(1, rgba('#000000', 0.38));
  ctx.fillStyle = vol;
  ctx.fillRect(-20, -10, 260, 290);
  ctx.restore();
  path();
  ink(ctx, OUT, outlineOf(p));
  // wooden spoon tucked into the cuff, bowl hanging out on the left
  const sx0 = 74;
  const sy0 = 14;
  const sx1 = 22;
  const sy1 = 104;
  ctx.beginPath();
  ctx.moveTo(sx0, sy0);
  ctx.lineTo(sx1, sy1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 21;
  ctx.stroke();
  ctx.strokeStyle = '#c98b4a';
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.35);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx0 - 5, sy0 + 2);
  ctx.lineTo(sx1 - 3, sy1 - 4);
  ctx.stroke();
  const ang = Math.atan2(sy1 - sy0, sx1 - sx0);
  ctx.save();
  ctx.translate(sx1 + Math.cos(ang) * 22, sy1 + Math.sin(ang) * 22);
  ctx.rotate(ang);
  ellipse(ctx, 0, 0, 30, 21);
  ctx.fillStyle = vgrad(ctx, -21, 21, [[0, '#e8b070'], [1, '#9a5f2c']]);
  ctx.fill();
  ink(ctx);
  ellipse(ctx, 2, 0, 20, 12);
  ctx.fillStyle = rgba('#6b3f1c', 0.35);
  ctx.fill();
  glossy(ctx, -4, -7, 13, 5, 0.6);
  ctx.restore();
  // rolled ribbed cuff
  const cuff = () => roundRect(ctx, 34, -6, 152, 38, 16);
  cuff();
  ctx.fillStyle = vgrad(ctx, -6, 32, [[0, shade(s, 0.25)], [0.6, s], [1, shade(s, -0.3)]]);
  ctx.fill();
  ctx.save();
  cuff();
  ctx.clip();
  ctx.strokeStyle = rgba(shade(s, -0.5), 0.5);
  ctx.lineWidth = 2;
  for (let x = 40; x < 186; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.lineTo(x, 32);
    ctx.stroke();
  }
  ctx.restore();
  cuff();
  ink(ctx, 4.5, outlineOf(p));
  // pom-pom on the toe
  const px = CX;
  const py = 196;
  const pom = '#fff0f4';
  ellipse(ctx, px, py + 5, 44, 40);
  ctx.fillStyle = rgba('#000000', 0.2);
  ctx.fill();
  ellipse(ctx, px, py, 40, 38);
  const pg = ctx.createRadialGradient(px - 14, py - 16, 2, px, py, 44);
  pg.addColorStop(0, '#ffffff');
  pg.addColorStop(0.55, pom);
  pg.addColorStop(1, shade(pom, -0.28));
  ctx.fillStyle = pg;
  ctx.fill();
  ink(ctx, 4, outlineOf('#e8c8d0'));
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2;
    const d = 4 + r() * 36;
    const x = px + Math.cos(a) * d;
    const y = py + Math.sin(a) * d * 0.95;
    ctx.strokeStyle = d > 30 ? pom : r() > 0.4 ? '#ffffff' : shade(pom, -0.22);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * 5, y + Math.sin(a + 0.4) * 5, x + Math.cos(a) * 10, y + Math.sin(a) * 10);
    ctx.stroke();
  }
  glossy(ctx, px - 14, py - 16, 14, 10, 0.7);
}

// ——— THE GARGOYLE: clawed stone foot, moss, bat wings ———

function drawGargoyle(ctx: Ctx, art: FootArt, r: () => number): void {
  const stone = art.skin;
  const wing = art.primary!;
  const moss = art.secondary!;
  // bat wings (behind)
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(CX, 0);
    ctx.scale(sx, 1);
    const tips: P[] = [[146, -4], [138, 60], [108, 84], [72, 76]];
    ctx.beginPath();
    ctx.moveTo(46, 22);
    ctx.quadraticCurveTo(92, -14, tips[0][0], tips[0][1]);
    ctx.quadraticCurveTo(122, 26, tips[1][0], tips[1][1]);
    ctx.quadraticCurveTo(116, 54, tips[2][0], tips[2][1]);
    ctx.quadraticCurveTo(88, 60, tips[3][0], tips[3][1]);
    ctx.quadraticCurveTo(58, 58, 46, 64);
    ctx.closePath();
    const wg = ctx.createLinearGradient(46, 0, 146, 60);
    wg.addColorStop(0, shade(wing, 0.15));
    wg.addColorStop(1, shade(wing, -0.4));
    ctx.fillStyle = wg;
    ctx.fill();
    ink(ctx);
    ctx.strokeStyle = shade(stone, 0.05);
    ctx.lineWidth = 5;
    for (const [tx, ty] of tips) {
      ctx.beginPath();
      ctx.moveTo(52, 26);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 1.5;
    for (const [tx, ty] of tips) {
      ctx.beginPath();
      ctx.moveTo(52, 28);
      ctx.lineTo(tx, ty + 2);
      ctx.stroke();
    }
    // wing claw
    ctx.beginPath();
    ctx.moveTo(tips[0][0] - 6, tips[0][1] + 2);
    ctx.lineTo(tips[0][0] + 8, tips[0][1] - 2);
    ctx.lineTo(tips[0][0] - 2, tips[0][1] + 8);
    ctx.fillStyle = '#3a3640';
    ctx.fill();
    ctx.restore();
  }
  // stone body
  barePath(ctx, art);
  ctx.fillStyle = skinBodyFill(ctx, stone);
  ctx.fill();
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  // speckle + chisel facets
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = r() > 0.5 ? rgba('#ffffff', 0.18) : rgba('#000000', 0.2);
    ellipse(ctx, r() * 230, r() * 230, 1 + r() * 2, 1 + r() * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba('#ffffff', 0.12);
  ctx.beginPath();
  ctx.moveTo(70, 20);
  ctx.lineTo(120, 30);
  ctx.lineTo(104, 120);
  ctx.lineTo(60, 100);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba('#000000', 0.12);
  ctx.beginPath();
  ctx.moveTo(150, 60);
  ctx.lineTo(206, 150);
  ctx.lineTo(150, 190);
  ctx.closePath();
  ctx.fill();
  // cracks
  const crack = (x: number, y: number, n: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < n; k++) {
      x += (r() - 0.5) * 34;
      y += 12 + r() * 16;
      ctx.lineTo(x, y);
      if (r() > 0.6) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - 0.5) * 30, y + 10);
        ctx.moveTo(x, y);
      }
    }
    ctx.strokeStyle = rgba('#1e1c22', 0.75);
    ctx.lineWidth = 2.6;
    ctx.stroke();
  };
  crack(84, 30, 5);
  crack(150, 70, 6);
  crack(40, 120, 3);
  // moss
  for (const [mx, my, mr] of [[60, 14, 22], [168, 18, 18], [30, 188, 16], [196, 176, 14], [120, 210, 12]] as const) {
    for (let k = 0; k < 7; k++) {
      ellipse(ctx, mx + (r() - 0.5) * mr * 1.6, my + (r() - 0.5) * mr, mr * (0.35 + r() * 0.3), mr * (0.3 + r() * 0.25));
      ctx.fillStyle = k % 2 ? moss : shade(moss, 0.3);
      ctx.fill();
    }
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = shade(moss, 0.55);
      ellipse(ctx, mx + (r() - 0.5) * mr * 1.4, my + (r() - 0.5) * mr * 0.8, 1.6, 1.6);
      ctx.fill();
    }
  }
  ctx.restore();
  barePath(ctx, art, true);
  ink(ctx, OUT, outlineOf(stone));
  // four stone toes with long claws
  const toes: Toe[] = [
    { cx: 40, cy: 218, rx: 27, ry: 30 },
    { cx: 88, cy: 232, rx: 28, ry: 33 },
    { cx: 136, cy: 234, rx: 28, ry: 33 },
    { cx: 184, cy: 220, rx: 29, ry: 31 },
  ];
  for (const t of toes) {
    // claw
    ctx.beginPath();
    ctx.moveTo(t.cx - t.rx * 0.55, t.cy + t.ry * 0.35);
    ctx.quadraticCurveTo(t.cx - t.rx * 0.2, t.cy + t.ry * 1.9, t.cx + t.rx * 0.35, t.cy + t.ry * 1.9);
    ctx.quadraticCurveTo(t.cx + t.rx * 0.2, t.cy + t.ry * 1.2, t.cx + t.rx * 0.55, t.cy + t.ry * 0.35);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, t.cy, t.cy + t.ry * 1.9, [[0, '#6a6672'], [1, '#1e1c22']]);
    ctx.fill();
    ink(ctx, 3.5);
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.cx - t.rx * 0.25, t.cy + t.ry * 0.6);
    ctx.quadraticCurveTo(t.cx - t.rx * 0.05, t.cy + t.ry * 1.5, t.cx + t.rx * 0.2, t.cy + t.ry * 1.7);
    ctx.stroke();
    drawToe(ctx, t, stone, { nail: null, ol: outlineOf(stone) });
    // facet + crack on each toe
    ctx.strokeStyle = rgba('#1e1c22', 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.cx - t.rx * 0.5, t.cy - t.ry * 0.1);
    ctx.lineTo(t.cx - t.rx * 0.1, t.cy + t.ry * 0.2);
    ctx.lineTo(t.cx + t.rx * 0.1, t.cy + t.ry * 0.55);
    ctx.stroke();
  }
  // a little moss drip on the outer toe
  ellipse(ctx, 196, 200, 12, 7, 0.3);
  ctx.fillStyle = moss;
  ctx.fill();
}

// ——— KRAKEN TOES: purple foot with tentacle toes, barnacles, seaweed ———

function drawKraken(ctx: Ctx, art: FootArt, r: () => number): void {
  const col = art.skin;
  const suck = art.secondary!;
  const ol = outlineOf(col);
  // tentacles (outer ones first so the middle overlaps)
  const roots = [
    { x: 30, w: 38, p1: [8, 250], p2: [-34, 290], p3: [-22, 252] },
    { x: 192, w: 40, p1: [214, 252], p2: [254, 292], p3: [244, 250] },
    { x: 68, w: 40, p1: [60, 270], p2: [24, 312], p3: [38, 286] },
    { x: 152, w: 42, p1: [160, 272], p2: [198, 314], p3: [184, 288] },
    { x: 110, w: 44, p1: [114, 266], p2: [92, 320], p3: [124, 304] },
  ];
  for (const t of roots) {
    const pts = bez([t.x, 196], t.p1 as P, t.p2 as P, t.p3 as P, 36);
    ribbon(ctx, pts, t.w, 7);
    const g = ctx.createLinearGradient(t.x - 40, 200, t.x + 40, 300);
    g.addColorStop(0, shade(col, 0.2));
    g.addColorStop(0.5, col);
    g.addColorStop(1, shade(col, -0.35));
    ctx.fillStyle = g;
    ctx.fill();
    ink(ctx, OUT, ol);
    // pale underside stripe + suckers
    for (let i = 4; i < 32; i += 3) {
      const q = along(pts, i / 36);
      const w = (t.w + (7 - t.w) * (i / 36)) * 0.24;
      const ox = Math.cos(q.a + Math.PI / 2) * w * 0.55;
      const oy = Math.sin(q.a + Math.PI / 2) * w * 0.55;
      ellipse(ctx, q.x + ox, q.y + oy, w, w * 0.85, q.a);
      ctx.fillStyle = suck;
      ctx.fill();
      ctx.strokeStyle = rgba(shade(suck, -0.55), 0.9);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ellipse(ctx, q.x + ox, q.y + oy, w * 0.42, w * 0.36, q.a);
      ctx.fillStyle = shade(suck, -0.3);
      ctx.fill();
    }
    // shine along the top edge
    ctx.beginPath();
    for (let i = 2; i < 26; i++) {
      const q = along(pts, i / 36);
      const w = (t.w + (7 - t.w) * (i / 36)) * 0.3;
      const x = q.x - Math.cos(q.a + Math.PI / 2) * w;
      const y = q.y - Math.sin(q.a + Math.PI / 2) * w;
      if (i === 2) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // body
  barePath(ctx, art);
  ctx.fillStyle = skinBodyFill(ctx, col);
  ctx.fill();
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  for (let i = 0; i < 16; i++) {
    const x = 30 + r() * 170;
    const y = 10 + r() * 190;
    const rr = 3 + r() * 7;
    ellipse(ctx, x, y, rr, rr);
    ctx.fillStyle = rgba(shade(col, 0.4), 0.45);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(col, -0.4), 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const hl = ctx.createRadialGradient(110, 80, 4, 110, 90, 100);
  hl.addColorStop(0, rgba('#ffffff', 0.25));
  hl.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = hl;
  ctx.fillRect(0, -10, 230, 240);
  ctx.restore();
  barePath(ctx, art, true);
  ink(ctx, OUT, ol);
  // barnacles
  const barnacle = (x: number, y: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.6);
    ctx.lineTo(x - s * 0.55, y - s * 0.7);
    ctx.lineTo(x + s * 0.55, y - s * 0.7);
    ctx.lineTo(x + s, y + s * 0.6);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, y - s, y + s, [[0, '#fbf3dc'], [1, '#b8a98a']]);
    ctx.fill();
    ink(ctx, 2.5);
    ellipse(ctx, x, y - s * 0.66, s * 0.5, s * 0.2);
    ctx.fillStyle = '#3a2a2a';
    ctx.fill();
    ctx.strokeStyle = rgba('#8a7a5c', 0.8);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y + s * 0.5);
    ctx.lineTo(x - s * 0.2, y - s * 0.5);
    ctx.moveTo(x + s * 0.3, y + s * 0.5);
    ctx.lineTo(x + s * 0.2, y - s * 0.5);
    ctx.stroke();
  };
  barnacle(58, 120, 10);
  barnacle(74, 136, 7);
  barnacle(48, 142, 6);
  barnacle(164, 72, 9);
  barnacle(176, 90, 6);
  barnacle(140, 168, 8);
  // seaweed draped over the ankle
  for (const [x, dir, len] of [[58, -1, 120], [72, 1, 70], [162, 1, 110], [150, -1, 60]] as const) {
    const pts: P[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      pts.push([x + Math.sin(t * 9) * 8 * dir + t * dir * 6, -6 + t * len]);
    }
    ribbon(ctx, pts, 14, 5);
    ctx.fillStyle = vgrad(ctx, -6, len, [[0, '#3f9a4a'], [1, '#1f6a3a']]);
    ctx.fill();
    ink(ctx, 3, '#143a22');
    ctx.strokeStyle = rgba('#a8ff9a', 0.4);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
  }
}

// ——— QUEEN OF THE RINK: glitter roller skate, crown, neon wheels ———

function drawRinkQueen(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const gold = art.secondary!;
  const neon = ['#39f3ff', '#b6ff3a'];
  // gold plate
  roundRect(ctx, CX - 104, 238, 208, 20, 8);
  ctx.fillStyle = metal(ctx, CX - 104, CX + 104, gold);
  ctx.fill();
  ink(ctx, 4);
  // neon wheels
  [CX - 78, CX + 78].forEach((x, i) => {
    ctx.save();
    ctx.shadowColor = neon[i];
    ctx.shadowBlur = 22;
    roundRect(ctx, x - 26, 250, 52, 56, 20);
    const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
    g.addColorStop(0, shade(neon[i], -0.45));
    g.addColorStop(0.4, shade(neon[i], 0.45));
    g.addColorStop(1, shade(neon[i], -0.45));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x - 26, 250, 52, 56, 20);
    ink(ctx, 4);
    ellipse(ctx, x, 278, 10, 14);
    ctx.fillStyle = metal(ctx, x - 10, x + 10, '#e8edf2');
    ctx.fill();
    ink(ctx, 2.5);
    ctx.fillStyle = rgba('#ffffff', 0.6);
    roundRect(ctx, x - 18, 256, 7, 40, 3.5);
    ctx.fill();
  });
  // toe stop
  ellipse(ctx, CX, 266, 26, 22);
  ctx.fillStyle = vgrad(ctx, 244, 288, [[0, '#ff8fc4'], [1, '#b0135f']]);
  ctx.fill();
  ink(ctx, 4);
  // boot
  shoePath(ctx, { bottom: 250, width: 96 });
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoePath(ctx, { bottom: 250, width: 96 });
  ctx.clip();
  // toe cap
  ellipse(ctx, CX, 252, 90, 46);
  ctx.fillStyle = shade(p, -0.12);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.4);
  ctx.lineWidth = 3;
  ctx.stroke();
  // gold lightning flashes
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + sx * 98, 70);
    ctx.lineTo(CX + sx * 64, 120);
    ctx.lineTo(CX + sx * 82, 124);
    ctx.lineTo(CX + sx * 56, 186);
    ctx.lineTo(CX + sx * 98, 130);
    ctx.lineTo(CX + sx * 80, 126);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, CX - 98, CX + 98, gold);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  // glitter
  for (let i = 0; i < 220; i++) {
    const v = r();
    ctx.fillStyle = v > 0.66 ? rgba('#ffffff', 0.85) : v > 0.33 ? rgba('#ffd9f0', 0.7) : rgba(shade(p, -0.4), 0.5);
    ellipse(ctx, r() * 230, r() * 260, 1 + r() * 1.6, 1 + r() * 1.6);
    ctx.fill();
  }
  glossy(ctx, CX - 38, 110, 30, 70, 0.35);
  ctx.restore();
  shoePath(ctx, { bottom: 250, width: 96, open: true });
  ink(ctx);
  roundRect(ctx, CX - 28, 40, 56, 116, 14);
  ctx.fillStyle = shade(p, -0.05);
  ctx.fill();
  ink(ctx, 3, rgba(INK, 0.7));
  laces(ctx, 60, 172, '#ffffff', 5, 24);
  // neon pom-poms
  for (const [x, c] of [[CX - 22, neon[0]], [CX + 22, neon[1]]] as const) {
    ctx.save();
    ctx.shadowColor = c;
    ctx.shadowBlur = 14;
    blob(ctx, x, 188, 22, 0.35, r, 14);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.restore();
    blob(ctx, x, 188, 22, 0.35, r, 14);
    ink(ctx, 3.5);
    drawHair(ctx, r, x - 18, 170, 36, 34, rgba('#ffffff', 0.75), 18);
  }
  // crown
  crown(ctx, CX, 52, 112, 52, gold, ['#ff3fa4', '#39f3ff', '#ff3fa4']);
  // sparkle aura
  for (const [x, y, sz] of [[-14, 118, 12], [238, 78, 14], [226, 204, 10], [-4, 214, 9], [196, 20, 9], [20, 30, 8]] as const) {
    twinkle(ctx, x, y, sz, '#ffffff', gold);
  }
}

// ——— THE YETI SKI BOOT: furry foot jammed in a buckled ski boot on a binding ———

function drawYetiBoot(ctx: Ctx, art: FootArt, r: () => number): void {
  const fur = art.primary!;
  const shell = art.secondary!;
  // ski
  roundRect(ctx, -34, 282, 288, 18, 9);
  ctx.fillStyle = vgrad(ctx, 282, 300, [[0, '#4d8ff0'], [1, '#183f8a']]);
  ctx.fill();
  ink(ctx);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-24, 288, 276, 4);
  // sole block
  roundRect(ctx, 8, 232, 204, 34, 10);
  ctx.fillStyle = vgrad(ctx, 232, 266, [[0, '#4a4f58'], [1, '#1d2026']]);
  ctx.fill();
  ink(ctx);
  // shell
  const path = (open = false) => {
    ctx.beginPath();
    ctx.moveTo(32, -6);
    ctx.lineTo(22, 96);
    ctx.bezierCurveTo(4, 140, 2, 214, 20, 248);
    ctx.lineTo(200, 248);
    ctx.bezierCurveTo(218, 214, 216, 140, 198, 96);
    ctx.lineTo(188, -6);
    if (!open) ctx.closePath();
  };
  path();
  const g = ctx.createLinearGradient(4, 0, 218, 0);
  g.addColorStop(0, shade(shell, -0.45));
  g.addColorStop(0.28, shade(shell, 0.05));
  g.addColorStop(0.42, shade(shell, 0.5));
  g.addColorStop(0.58, shell);
  g.addColorStop(1, shade(shell, -0.5));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // toe box seam
  ctx.beginPath();
  ctx.moveTo(8, 150);
  ctx.quadraticCurveTo(CX, 120, 212, 150);
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(8, 156);
  ctx.quadraticCurveTo(CX, 126, 212, 156);
  ctx.stroke();
  // snowflake decal
  ctx.save();
  ctx.translate(CX + 4, 200);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -22);
    ctx.moveTo(0, -13);
    ctx.lineTo(-7, -19);
    ctx.moveTo(0, -13);
    ctx.lineTo(7, -19);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = rgba('#ffffff', 0.5);
  roundRect(ctx, 46, 10, 12, 210, 6);
  ctx.fill();
  roundRect(ctx, 64, 30, 5, 170, 2.5);
  ctx.fill();
  ctx.restore();
  path(true);
  ink(ctx);
  // buckles: strap across, lever on the right
  for (const [y, w] of [[42, 78], [92, 86], [138, 96], [184, 100]] as const) {
    ctx.beginPath();
    ctx.moveTo(CX - w, y + 6);
    ctx.quadraticCurveTo(CX, y - 8, CX + w, y + 6);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.strokeStyle = '#c3cdd8';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX - w + 6, y + 2);
    ctx.quadraticCurveTo(CX, y - 11, CX + w - 6, y + 2);
    ctx.stroke();
    roundRect(ctx, CX + w - 18, y - 4, 32, 18, 6);
    ctx.fillStyle = metal(ctx, CX + w - 18, CX + w + 14, '#2b2f36');
    ctx.fill();
    ink(ctx, 3.5);
    ellipse(ctx, CX + w - 10, y + 5, 3.5, 3.5);
    ctx.fillStyle = '#c3cdd8';
    ctx.fill();
  }
  // fur squeezing out at the side gaps
  for (const [x, y, sx] of [[12, 116, -1], [8, 164, -1], [208, 116, 1], [212, 162, 1]] as const) {
    for (let k = 0; k < 7; k++) {
      ctx.strokeStyle = k % 2 ? fur : shade(fur, -0.25);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - sx * 4, y + (k - 3) * 3);
      ctx.quadraticCurveTo(x + sx * 6, y + (k - 3) * 3, x + sx * (12 + r() * 6), y + (k - 3) * 4 + 6);
      ctx.stroke();
    }
  }
  // binding toe-piece
  roundRect(ctx, CX - 48, 238, 96, 50, 12);
  ctx.fillStyle = metal(ctx, CX - 48, CX + 48, '#9aa3ad');
  ctx.fill();
  ink(ctx);
  roundRect(ctx, CX - 30, 248, 60, 22, 6);
  ctx.fillStyle = '#e5242f';
  ctx.fill();
  ink(ctx, 3);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DIN 12', CX, 265);
  // the furry ankle bursting out of the top
  const tufts: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) tufts.push([28 + i * 20.5, 14 + (i % 2) * 8, 20 + (i % 3) * 3]);
  union(ctx, circles(tufts)(ctx), fur, outlineOf('#b8c4d0'));
  ctx.save();
  ctx.beginPath();
  for (const [x, y, rr] of tufts) {
    ctx.moveTo(x + rr, y);
    ctx.arc(x, y, rr, 0, Math.PI * 2);
  }
  ctx.clip();
  const fg = ctx.createLinearGradient(0, -8, 0, 40);
  fg.addColorStop(0, '#ffffff');
  fg.addColorStop(1, '#b8c8da');
  ctx.fillStyle = fg;
  ctx.fillRect(0, -10, 230, 60);
  drawHair(ctx, r, 10, -6, 200, 46, shade(fur, -0.3), 120);
  drawHair(ctx, r, 10, -6, 200, 40, '#ffffff', 60);
  ctx.restore();
  // a couple of loose fur wisps over the outline
  for (let i = 0; i < 26; i++) {
    const x = 10 + r() * 200;
    const y = 30 + r() * 10;
    ctx.strokeStyle = r() > 0.5 ? '#ffffff' : '#c6d2de';
    ctx.lineWidth = 2.5 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 8, y, x + (r() - 0.5) * 12, y + 8 + r() * 6);
    ctx.stroke();
  }
}

// ——— THE HEAD WAITER: patent dress shoe, white spat, bow tie, silver tray ———

function drawWaiter(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const spat = art.secondary!;
  void r;
  // napkin over the left of the ankle (behind)
  ctx.beginPath();
  ctx.moveTo(30, -6);
  ctx.lineTo(70, -6);
  ctx.lineTo(54, 82);
  ctx.quadraticCurveTo(30, 96, 4, 84);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -6, 96, [[0, '#ffffff'], [1, '#d9dde3']]);
  ctx.fill();
  ink(ctx, 4);
  ctx.strokeStyle = rgba('#8a93a0', 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(44, 0);
  ctx.lineTo(28, 82);
  ctx.moveTo(56, 4);
  ctx.lineTo(44, 86);
  ctx.stroke();
  // sole
  roundRect(ctx, CX - 98, 236, 196, 22, 10);
  ctx.fillStyle = '#3a2a22';
  ctx.fill();
  ink(ctx);
  // patent shoe
  const shoe = () => shoePath(ctx, { bottom: 246, width: 94 });
  shoe();
  const g = ctx.createLinearGradient(16, 0, 204, 0);
  g.addColorStop(0, shade(p, -0.4));
  g.addColorStop(0.3, shade(p, 0.15));
  g.addColorStop(0.42, shade(p, 0.55));
  g.addColorStop(0.52, p);
  g.addColorStop(1, shade(p, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  shoe();
  ctx.clip();
  // cap toe seam + brogue dots
  ctx.beginPath();
  ctx.moveTo(8, 196);
  ctx.quadraticCurveTo(CX, 168, 212, 196);
  ctx.strokeStyle = rgba('#000000', 0.7);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.25);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 200);
  ctx.quadraticCurveTo(CX, 172, 212, 200);
  ctx.stroke();
  ctx.fillStyle = rgba('#000000', 0.6);
  for (let i = 1; i < 14; i++) {
    const t = i / 14;
    const x = (1 - t) * (1 - t) * 8 + 2 * (1 - t) * t * CX + t * t * 212;
    const y = (1 - t) * (1 - t) * 206 + 2 * (1 - t) * t * 178 + t * t * 206;
    ellipse(ctx, x, y, 2, 2);
    ctx.fill();
  }
  // mirror shine
  ctx.fillStyle = rgba('#ffffff', 0.8);
  ellipse(ctx, CX - 44, 220, 22, 7, -0.25);
  ctx.fill();
  ellipse(ctx, CX + 30, 230, 7, 3, -0.1);
  ctx.fill();
  glossy(ctx, CX - 40, 214, 50, 20, 0.5);
  // white spat over the top
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.lineTo(240, -10);
  ctx.lineTo(240, 104);
  ctx.bezierCurveTo(190, 104, 150, 136, CX, 140);
  ctx.bezierCurveTo(70, 136, 30, 104, -10, 104);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -6, 140, [[0, shade(spat, -0.12)], [0.5, spat], [1, shade(spat, -0.18)]]);
  ctx.fill();
  const sg = ctx.createLinearGradient(16, 0, 204, 0);
  sg.addColorStop(0, rgba('#000000', 0.28));
  sg.addColorStop(0.4, rgba('#000000', 0));
  sg.addColorStop(1, rgba('#000000', 0.32));
  ctx.fillStyle = sg;
  ctx.fillRect(-10, -10, 250, 152);
  ctx.beginPath();
  ctx.moveTo(-10, 104);
  ctx.bezierCurveTo(30, 104, 70, 136, CX, 140);
  ctx.bezierCurveTo(150, 136, 190, 104, 240, 104);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  // spat buttons
  for (let i = 0; i < 4; i++) {
    const y = 16 + i * 24;
    const x = 40 - i * 4;
    ellipse(ctx, x, y, 5, 5);
    ctx.fillStyle = '#1b1b1b';
    ctx.fill();
    ellipse(ctx, x - 1.5, y - 1.5, 1.6, 1.6);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();
  shoe();
  ink(ctx);
  laces(ctx, 140, 186, '#1b1b1b', 3, 18);
  // bow tie
  ctx.save();
  ctx.translate(CX + 4, 40);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sx * 34, -18);
    ctx.quadraticCurveTo(sx * 40, 0, sx * 34, 18);
    ctx.closePath();
    ctx.fillStyle = '#16161c';
    ctx.fill();
    ink(ctx, 3.5);
    ctx.strokeStyle = rgba('#ffffff', 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx * 8, -4);
    ctx.lineTo(sx * 28, -12);
    ctx.stroke();
  }
  roundRect(ctx, -9, -10, 18, 20, 5);
  ctx.fillStyle = '#2a2a34';
  ctx.fill();
  ink(ctx, 3.5);
  ctx.restore();
  // silver tray + cloche, carried on the right
  const tx = 208;
  const ty = 86;
  ellipse(ctx, tx, ty + 4, 52, 14);
  ctx.fillStyle = '#5b626c';
  ctx.fill();
  ink(ctx, 4);
  ellipse(ctx, tx, ty, 52, 14);
  ctx.fillStyle = metal(ctx, tx - 52, tx + 52, '#d9dde3');
  ctx.fill();
  ink(ctx, 4);
  ellipse(ctx, tx, ty, 40, 9);
  ctx.strokeStyle = rgba('#5b626c', 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx - 36, ty);
  ctx.bezierCurveTo(tx - 36, ty - 46, tx + 36, ty - 46, tx + 36, ty);
  ctx.closePath();
  ctx.fillStyle = metal(ctx, tx - 36, tx + 36, '#e8edf2');
  ctx.fill();
  ink(ctx, 4);
  glossy(ctx, tx - 14, ty - 22, 12, 8, 0.9);
  ellipse(ctx, tx, ty - 38, 7, 6);
  ctx.fillStyle = metal(ctx, tx - 7, tx + 7, '#e8edf2');
  ctx.fill();
  ink(ctx, 3);
  twinkle(ctx, tx + 22, ty - 26, 8);
}

// ——— DOUGH BOY: soft lumpy dough, poke marks, flour ———

function drawDough(ctx: Ctx, art: FootArt, r: () => number): void {
  const d = art.skin;
  const ol = outlineOf(shade(d, -0.15));
  const toes: Toe[] = [
    { cx: 36, cy: 214, rx: 24, ry: 24 },
    { cx: 74, cy: 228, rx: 25, ry: 26 },
    { cx: 112, cy: 234, rx: 27, ry: 28 },
    { cx: 152, cy: 234, rx: 28, ry: 29 },
    { cx: 192, cy: 224, rx: 32, ry: 32 },
  ];
  const body = () => barePath(ctx, art, true);
  const shapes = [
    body,
    () => ellipse(ctx, 20, 150, 22, 34),
    () => ellipse(ctx, 206, 118, 20, 30),
    ...toes.map((t) => () => ellipse(ctx, t.cx, t.cy, t.rx, t.ry)),
  ];
  const fill = ctx.createLinearGradient(-4, 0, 230, 0);
  fill.addColorStop(0, shade(d, -0.2));
  fill.addColorStop(0.35, shade(d, 0.05));
  fill.addColorStop(0.55, shade(d, 0.2));
  fill.addColorStop(1, shade(d, -0.22));
  union(ctx, shapes, fill, ol);
  // soft top light + baked edges
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  const hl = ctx.createRadialGradient(118, 80, 6, 118, 90, 110);
  hl.addColorStop(0, rgba('#ffffff', 0.4));
  hl.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = hl;
  ctx.fillRect(-10, -10, 250, 250);
  // air bubbles
  for (let i = 0; i < 7; i++) {
    ellipse(ctx, 30 + r() * 170, 10 + r() * 190, 1.5 + r() * 2.5, 1.5 + r() * 2.5);
    ctx.fillStyle = rgba(shade(d, -0.35), 0.3);
    ctx.fill();
  }
  ctx.restore();
  // toe shading (soft, no hard outlines inside the dough)
  for (const t of toes) {
    const g = ctx.createRadialGradient(t.cx - t.rx * 0.3, t.cy - t.ry * 0.4, 1, t.cx, t.cy, t.ry * 1.1);
    g.addColorStop(0, rgba('#ffffff', 0.45));
    g.addColorStop(0.6, rgba('#ffffff', 0));
    g.addColorStop(1, rgba(shade(d, -0.5), 0.3));
    ellipse(ctx, t.cx, t.cy, t.rx, t.ry);
    ctx.fillStyle = g;
    ctx.fill();
    // soft crease where the toe meets the next one
    ctx.strokeStyle = rgba(ol, 0.55);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.cx, t.cy, t.rx * 0.98, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.strokeStyle = rgba(ol, 0.4);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(t.cx, t.cy - t.ry * 0.55, t.rx * 0.6, 0.5, Math.PI - 0.5);
    ctx.stroke();
  }
  // poke marks
  const poke = (x: number, y: number, s: number) => {
    ellipse(ctx, x, y, s, s * 0.8);
    const g = ctx.createRadialGradient(x - s * 0.2, y - s * 0.3, 0, x, y, s);
    g.addColorStop(0, rgba(shade(d, -0.55), 0.75));
    g.addColorStop(1, rgba(shade(d, -0.2), 0.1));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y, s * 1.1, s * 0.9, 0, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = rgba('#ffffff', 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  for (const [x, y, s] of [[52, 58, 7], [160, 40, 6], [176, 172, 8], [44, 186, 6], [140, 200, 5], [72, 140, 5]] as const) poke(x, y, s);
  // a happy face pressed into the dough
  poke(CX - 24, 100, 10);
  poke(CX + 26, 100, 10);
  ctx.beginPath();
  ctx.arc(CX + 1, 120, 26, 0.35, Math.PI - 0.35);
  ctx.strokeStyle = rgba(shade(d, -0.55), 0.7);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX + 1, 123, 27, 0.4, Math.PI - 0.4);
  ctx.strokeStyle = rgba('#ffffff', 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const sx of [-1, 1]) {
    ellipse(ctx, CX + sx * 46, 128, 12, 7);
    ctx.fillStyle = rgba('#ff9a8a', 0.35);
    ctx.fill();
  }
  // flour dust + puffs
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = rgba('#ffffff', 0.5 + r() * 0.4);
    ellipse(ctx, 30 + r() * 170, 20 + r() * 150, 1.2 + r() * 2, 1.2 + r() * 2);
    ctx.fill();
  }
  for (const [x, y, s] of [[-12, 238, 16], [236, 214, 15], [-18, 96, 10]] as const) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    union(ctx, [() => ellipse(ctx, x, y, s, s * 0.8), () => ellipse(ctx, x + s * 0.8, y + 3, s * 0.7, s * 0.6), () => ellipse(ctx, x - s * 0.7, y + 4, s * 0.6, s * 0.5)], '#ffffff', rgba('#c9b99a', 0.6), 1.5);
    ctx.restore();
  }
}

// ——— CHIMNEY SWEEP: sooty boot, chimney brush, soot puffs ———

function sootCloud(ctx: Ctx, x: number, y: number, s: number): void {
  const puffs: [number, number, number][] = [
    [x, y, s],
    [x + s * 0.9, y + s * 0.2, s * 0.75],
    [x - s * 0.85, y + s * 0.25, s * 0.7],
    [x + s * 0.2, y - s * 0.6, s * 0.65],
  ];
  const g = ctx.createRadialGradient(x - s * 0.4, y - s * 0.6, 2, x, y, s * 1.8);
  g.addColorStop(0, '#8a8488');
  g.addColorStop(1, '#2a2628');
  union(ctx, circles(puffs)(ctx), g, '#141012', 3.5);
  ctx.fillStyle = rgba('#ffffff', 0.18);
  ellipse(ctx, x - s * 0.3, y - s * 0.4, s * 0.4, s * 0.25);
  ctx.fill();
}

function drawSweep(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const wood = art.secondary!;
  // chimney brush (behind, on the left): handle up the leg, round bristle head
  roundRect(ctx, 0, -8, 14, 70, 6);
  ctx.fillStyle = leatherFill(ctx, wood);
  ctx.fill();
  ink(ctx, 4);
  const bx = 7;
  const by = 74;
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    const len = 34 + r() * 8;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2 + 0.03;
    const len = 30 + r() * 8;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
    ctx.strokeStyle = i % 3 ? '#3a302a' : '#6a5a4a';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ellipse(ctx, bx, by, 10, 10);
  ctx.fillStyle = metal(ctx, bx - 10, bx + 10, '#9aa3ad');
  ctx.fill();
  ink(ctx, 3);
  // sole
  roundRect(ctx, CX - 104, 226, 208, 40, 14);
  ctx.fillStyle = '#1e1a1a';
  ctx.fill();
  ink(ctx);
  ctx.fillStyle = '#3a3434';
  for (let i = 0; i < 8; i++) {
    roundRect(ctx, CX - 94 + i * 24, 250, 14, 10, 3);
    ctx.fill();
  }
  // boot
  const shoe = () => shoePath(ctx, { bottom: 240, width: 98 });
  shoe();
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoe();
  ctx.clip();
  // toe cap
  ellipse(ctx, CX, 240, 92, 52);
  ctx.fillStyle = shade(p, -0.15);
  ctx.fill();
  ctx.strokeStyle = rgba('#000000', 0.5);
  ctx.lineWidth = 3;
  ctx.stroke();
  // patch with stitches
  ctx.save();
  ctx.translate(150, 214);
  ctx.rotate(0.2);
  roundRect(ctx, -22, -16, 44, 32, 4);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = '#e7d3a8';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  roundRect(ctx, -17, -11, 34, 22, 3);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // soot smudges + dusty scuffs
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = rgba('#000000', 0.25 + r() * 0.2);
    ellipse(ctx, 20 + r() * 180, 20 + r() * 210, 8 + r() * 16, 5 + r() * 10, r() * 3);
    ctx.fill();
  }
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = rgba('#ffffff', 0.08 + r() * 0.1);
    ctx.lineWidth = 1.5;
    const x = 20 + r() * 180;
    const y = 30 + r() * 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 + r() * 10, y + (r() - 0.5) * 4);
    ctx.stroke();
  }
  glossy(ctx, CX - 40, 100, 26, 56, 0.16);
  ctx.restore();
  shoe();
  ink(ctx);
  roundRect(ctx, CX - 30, -6, 60, 128, 12);
  ctx.fillStyle = shade(p, -0.2);
  ctx.fill();
  ink(ctx, 3.5, rgba(INK, 0.8));
  laces(ctx, 6, 150, '#8a8488', 5, 26);
  // soot puffs
  sootCloud(ctx, 4, 232, 20);
  sootCloud(ctx, 222, 240, 17);
  sootCloud(ctx, 226, 150, 14);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = rgba('#1a1618', 0.5 + r() * 0.4);
    ellipse(ctx, -20 + r() * 270, 120 + r() * 170, 1.5 + r() * 2.5, 1.5 + r() * 2.5);
    ctx.fill();
  }
}

// ——— THE PIGEON KING: feathered leg, scaly three-toed foot, little crown ———

function drawPigeon(ctx: Ctx, art: FootArt, r: () => number): void {
  const scale = art.skin;
  const feather = art.primary!;
  const ol = outlineOf(scale);
  // three front toes
  const toes: { pts: P[]; w0: number }[] = [
    { pts: bez([CX - 8, 176], [70, 200], [36, 236], [22, 270], 24), w0: 30 },
    { pts: bez([CX + 8, 176], [150, 200], [184, 236], [198, 270], 24), w0: 30 },
    { pts: bez([CX, 176], [CX - 2, 220], [CX + 2, 256], [CX, 286], 24), w0: 34 },
  ];
  for (const t of toes) {
    const end = t.pts[t.pts.length - 1];
    const q = along(t.pts, 0.97);
    // talon
    ctx.save();
    ctx.translate(end[0], end[1]);
    ctx.rotate(q.a - Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.quadraticCurveTo(-6, 18, 2, 22);
    ctx.quadraticCurveTo(8, 10, 8, -4);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -4, 22, [[0, '#4a4048'], [1, '#141014']]);
    ctx.fill();
    ink(ctx, 3);
    ctx.restore();
    ribbon(ctx, t.pts, t.w0, 15);
    const g = ctx.createLinearGradient(end[0] - 20, 0, end[0] + 20, 0);
    g.addColorStop(0, shade(scale, -0.3));
    g.addColorStop(0.5, shade(scale, 0.2));
    g.addColorStop(1, shade(scale, -0.3));
    ctx.fillStyle = g;
    ctx.fill();
    ink(ctx, OUT, ol);
    // scutes across the toe
    for (let i = 3; i < 24; i += 3) {
      const s = along(t.pts, i / 24);
      const w = (t.w0 + (15 - t.w0) * (i / 24)) * 0.45;
      const nx = Math.cos(s.a + Math.PI / 2) * w;
      const ny = Math.sin(s.a + Math.PI / 2) * w;
      ctx.beginPath();
      ctx.moveTo(s.x - nx, s.y - ny);
      ctx.quadraticCurveTo(s.x + Math.cos(s.a) * 4, s.y + Math.sin(s.a) * 4, s.x + nx, s.y + ny);
      ctx.strokeStyle = rgba(ol, 0.55);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  // tarsus (scaly shin)
  const shin = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 26, 70);
    ctx.lineTo(CX - 22, 174);
    ctx.quadraticCurveTo(CX, 190, CX + 22, 174);
    ctx.lineTo(CX + 26, 70);
    ctx.closePath();
  };
  shin();
  const sg = ctx.createLinearGradient(CX - 26, 0, CX + 26, 0);
  sg.addColorStop(0, shade(scale, -0.35));
  sg.addColorStop(0.45, shade(scale, 0.25));
  sg.addColorStop(1, shade(scale, -0.35));
  ctx.fillStyle = sg;
  ctx.fill();
  ink(ctx, OUT, ol);
  ctx.save();
  shin();
  ctx.clip();
  for (let y = 80; y < 180; y += 11) {
    ctx.beginPath();
    ctx.moveTo(CX - 30, y);
    ctx.quadraticCurveTo(CX, y + 8, CX + 30, y);
    ctx.strokeStyle = rgba(ol, 0.55);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
  // joint knob
  ellipse(ctx, CX, 178, 26, 18);
  ctx.fillStyle = shade(scale, 0.05);
  ctx.fill();
  ink(ctx, OUT, ol);
  glossy(ctx, CX - 8, 172, 10, 5, 0.5);
  // the little crown, worn just above the joint
  ctx.save();
  ctx.translate(CX + 2, 160);
  ctx.rotate(-0.18);
  crown(ctx, 0, 0, 62, 40, art.secondary!, ['#d8343f', '#3a6ad0', '#d8343f']);
  ctx.restore();
  // feathered trousers
  const feathers = () => {
    ctx.beginPath();
    ctx.moveTo(40, -6);
    ctx.bezierCurveTo(30, 20, 12, 50, 22, 78);
    for (let i = 0; i < 7; i++) {
      const x0 = 22 + i * 25.4;
      ctx.quadraticCurveTo(x0 + 12.7, 112 - Math.abs(i - 3) * 6, x0 + 25.4, 78 + (i === 6 ? 0 : 4));
    }
    ctx.bezierCurveTo(208, 50, 190, 20, 180, -6);
    ctx.closePath();
  };
  feathers();
  const fg = ctx.createLinearGradient(12, 0, 210, 0);
  fg.addColorStop(0, shade(feather, -0.35));
  fg.addColorStop(0.45, shade(feather, 0.2));
  fg.addColorStop(1, shade(feather, -0.4));
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.save();
  feathers();
  ctx.clip();
  // iridescent band
  const ir = ctx.createLinearGradient(0, -6, 0, 40);
  ir.addColorStop(0, rgba('#3fbf8a', 0.6));
  ir.addColorStop(0.5, rgba('#9b5cff', 0.5));
  ir.addColorStop(1, rgba('#9b5cff', 0));
  ctx.fillStyle = ir;
  ctx.fillRect(0, -8, 230, 50);
  // feather scallops
  for (let row = 0; row < 5; row++) {
    const y = 10 + row * 18;
    for (let x = 20 + (row % 2) * 12; x < 210; x += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0.15, Math.PI - 0.15);
      ctx.strokeStyle = rgba(shade(feather, -0.55), 0.55);
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y - 2, 9, 0.5, Math.PI - 0.5);
      ctx.strokeStyle = rgba('#ffffff', 0.25);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.restore();
  feathers();
  ink(ctx, OUT, outlineOf(feather));
  // stray feather fluff at the sides
  for (const [x, y, sx] of [[22, 40, -1], [26, 66, -1], [198, 40, 1], [194, 64, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sx * 14, y + 2, x + sx * 18, y + 14);
    ctx.quadraticCurveTo(x + sx * 6, y + 12, x, y + 8);
    ctx.fillStyle = shade(feather, -0.1);
    ctx.fill();
    ink(ctx, 2.5, outlineOf(feather));
  }
  void r;
}

// ——— SANDCASTLE SAM: sandy foot crowned with a sandcastle ———

function sandFill(ctx: Ctx, col: string, x0: number, x1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, -0.3));
  g.addColorStop(0.4, shade(col, 0.12));
  g.addColorStop(0.6, col);
  g.addColorStop(1, shade(col, -0.32));
  return g;
}

function sandGrain(ctx: Ctx, r: () => number, x: number, y: number, w: number, h: number, col: string, n: number): void {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = r() > 0.5 ? rgba(shade(col, -0.45), 0.45) : rgba('#ffffff', 0.4);
    ellipse(ctx, x + r() * w, y + r() * h, 0.9 + r() * 1.4, 0.9 + r() * 1.4);
    ctx.fill();
  }
}

function tower(ctx: Ctx, cx: number, top: number, bottom: number, wTop: number, wBot: number, col: string, r: () => number): void {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(cx - wBot / 2, bottom);
    ctx.lineTo(cx - wTop / 2, top);
    const mer = 4;
    const step = wTop / (mer * 2 - 1);
    for (let i = 0; i < mer * 2 - 1; i++) {
      const x = cx - wTop / 2 + i * step;
      if (i % 2 === 0) {
        ctx.lineTo(x, top - 12);
        ctx.lineTo(x + step, top - 12);
      } else {
        ctx.lineTo(x, top);
        ctx.lineTo(x + step, top);
      }
    }
    ctx.lineTo(cx + wTop / 2, top);
    ctx.lineTo(cx + wBot / 2, bottom);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = sandFill(ctx, col, cx - wBot / 2, cx + wBot / 2);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // bucket-mould ridges
  for (let y = top + 18; y < bottom - 4; y += 20) {
    ctx.fillStyle = rgba(shade(col, -0.45), 0.35);
    ctx.fillRect(cx - wBot, y, wBot * 2, 3);
    ctx.fillStyle = rgba('#ffffff', 0.3);
    ctx.fillRect(cx - wBot, y + 3, wBot * 2, 2);
  }
  sandGrain(ctx, r, cx - wBot / 2, top - 12, wBot, bottom - top + 12, col, 50);
  ctx.restore();
  path();
  ink(ctx, 4.5, outlineOf(col));
  // arrow slit
  roundRect(ctx, cx - 3.5, top + 16, 7, 18, 3.5);
  ctx.fillStyle = shade(col, -0.6);
  ctx.fill();
}

function drawSandcastle(ctx: Ctx, art: FootArt, r: () => number): void {
  const skin = art.skin;
  const sand = art.primary!;
  drawBareBody(ctx, art, r);
  // sand crust on the foot
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  ctx.fillStyle = rgba(sand, 0.55);
  ctx.fillRect(0, 150, 230, 90);
  sandGrain(ctx, r, 0, -6, 230, 236, skin, 160);
  ctx.restore();
  for (const t of toesFor(art)) {
    drawToe(ctx, t, skin, { nail: art.nails, r });
    sandGrain(ctx, r, t.cx - t.rx * 0.8, t.cy - t.ry * 0.2, t.rx * 1.6, t.ry, skin, 12);
  }
  // starfish on a toe
  starPath(ctx, 186, 234, 15, 6.5, 5, -1.2);
  ctx.fillStyle = '#ff7a4d';
  ctx.fill();
  ink(ctx, 3);
  for (let i = 0; i < 5; i++) {
    const a = -1.2 + (i * 2 * Math.PI) / 5;
    ellipse(ctx, 186 + Math.cos(a) * 7, 234 + Math.sin(a) * 7, 1.6, 1.6);
    ctx.fillStyle = '#ffd3b0';
    ctx.fill();
  }
  // side towers (stick out past the foot)
  tower(ctx, 6, 38, 156, 46, 58, sand, r);
  tower(ctx, 214, 38, 156, 46, 58, sand, r);
  // curtain wall between them
  const wall = () => {
    ctx.beginPath();
    ctx.moveTo(16, 150);
    ctx.lineTo(16, 82);
    for (let i = 0; i < 9; i++) {
      const x = 16 + i * 21.5;
      ctx.lineTo(x, i % 2 ? 82 : 72);
      ctx.lineTo(x + 21.5, i % 2 ? 82 : 72);
    }
    ctx.lineTo(209.5, 82);
    ctx.lineTo(204, 150);
    ctx.quadraticCurveTo(CX, 166, 16, 150);
    ctx.closePath();
  };
  wall();
  ctx.fillStyle = sandFill(ctx, shade(sand, -0.04), 16, 204);
  ctx.fill();
  ctx.save();
  wall();
  ctx.clip();
  // brick courses
  for (let y = 96; y < 160; y += 18) {
    ctx.strokeStyle = rgba(shade(sand, -0.45), 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(214, y);
    ctx.stroke();
  }
  sandGrain(ctx, r, 10, 70, 200, 100, sand, 90);
  ctx.restore();
  wall();
  ink(ctx, 4.5, outlineOf(sand));
  // central keep
  tower(ctx, CX, 16, 156, 70, 82, shade(sand, 0.06), r);
  // gate
  ctx.beginPath();
  ctx.moveTo(CX - 17, 156);
  ctx.lineTo(CX - 17, 128);
  ctx.arc(CX, 128, 17, Math.PI, 0);
  ctx.lineTo(CX + 17, 156);
  ctx.closePath();
  ctx.fillStyle = shade(sand, -0.62);
  ctx.fill();
  ink(ctx, 3.5, outlineOf(sand));
  // scallop shell on the wall
  ctx.save();
  ctx.translate(48, 124);
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.arc(0, 2, 13, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fillStyle = '#ffc6d9';
  ctx.fill();
  ink(ctx, 2.5);
  ctx.strokeStyle = rgba('#c25a7a', 0.7);
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(i * 5, -9);
    ctx.stroke();
  }
  ctx.restore();
  // flag on the keep
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(CX, 6);
  ctx.lineTo(CX, -6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX + 1, -6);
  ctx.quadraticCurveTo(CX + 18, -8, CX + 34, -2);
  ctx.quadraticCurveTo(CX + 18, 2, CX + 1, 6);
  ctx.closePath();
  ctx.fillStyle = art.secondary!;
  ctx.fill();
  ink(ctx, 2.5);
  // drips of wet sand
  for (const [x, y] of [[30, 158], [190, 158], [CX + 30, 160]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 4);
    ctx.quadraticCurveTo(x - 6, y + 12, x, y + 14);
    ctx.quadraticCurveTo(x + 6, y + 12, x + 6, y - 4);
    ctx.fillStyle = shade(sand, -0.15);
    ctx.fill();
    ink(ctx, 2.5, outlineOf(sand));
  }
}

// ——— JELLYFISH FLIP-FLOP: glowing translucent jelly sole + tentacles ———

function drawJellyFlop(ctx: Ctx, art: FootArt, r: () => number): void {
  const jelly = art.primary!;
  const glow = art.secondary!;
  // dangling tentacles
  ctx.save();
  ctx.shadowColor = jelly;
  ctx.shadowBlur = 10;
  for (let i = 0; i < 9; i++) {
    const x = -2 + i * 28;
    const len = 46 + ((i * 37) % 30);
    ctx.beginPath();
    ctx.moveTo(x, 262);
    for (let k = 1; k <= 12; k++) {
      const t = k / 12;
      ctx.lineTo(x + Math.sin(t * 7 + i) * 6 * t, 262 + t * len);
    }
    ctx.strokeStyle = rgba(shade(jelly, -0.3), 0.9);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = rgba(shade(jelly, 0.4), 0.95);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
  // frilly oral arms
  for (const [x, dir] of [[78, -1], [142, 1]] as const) {
    const pts: P[] = [];
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      pts.push([x + Math.sin(t * 6) * 10 * dir + t * dir * 10, 258 + t * 64]);
    }
    ribbon(ctx, pts, 18, 5);
    ctx.fillStyle = rgba(glow, 0.75);
    ctx.fill();
    ink(ctx, 3, rgba(shade(glow, -0.6), 0.9));
    ctx.strokeStyle = rgba('#ffffff', 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach(([px, py], k) => {
      const wx = px + Math.sin(k * 1.7) * 4;
      if (k) ctx.lineTo(wx, py);
      else ctx.moveTo(wx, py);
    });
    ctx.stroke();
  }
  // the bell-shaped jelly sole, wider than the foot
  const bell = () => {
    ctx.beginPath();
    ctx.moveTo(-14, 246);
    ctx.bezierCurveTo(-14, 212, 40, 206, CX, 206);
    ctx.bezierCurveTo(180, 206, 234, 212, 234, 246);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const x0 = 234 - (i * 248) / n;
      const x1 = 234 - ((i + 1) * 248) / n;
      ctx.quadraticCurveTo((x0 + x1) / 2, 276, x1, 246 + (i === n - 1 ? 0 : 6));
    }
    ctx.closePath();
  };
  ctx.save();
  ctx.shadowColor = jelly;
  ctx.shadowBlur = 24;
  bell();
  const bg = ctx.createRadialGradient(CX - 30, 216, 6, CX, 240, 140);
  bg.addColorStop(0, rgba('#ffffff', 0.9));
  bg.addColorStop(0.35, rgba(shade(jelly, 0.3), 0.8));
  bg.addColorStop(1, rgba(shade(jelly, -0.2), 0.75));
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();
  ctx.save();
  bell();
  ctx.clip();
  for (let i = 0; i < 10; i++) {
    ellipse(ctx, -4 + r() * 230, 222 + r() * 40, 4 + r() * 6, 3 + r() * 4);
    ctx.fillStyle = rgba(glow, 0.55);
    ctx.fill();
  }
  ctx.strokeStyle = rgba('#ffffff', 0.5);
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(CX, 212);
    ctx.lineTo(-14 + i * 31, 270);
    ctx.stroke();
  }
  ctx.restore();
  bell();
  ink(ctx, 4.5, rgba(shade(jelly, -0.6), 0.95));
  // foot
  drawBareBody(ctx, art, r);
  bareToes(ctx, art, r);
  // glossy jelly straps
  for (const [x0, y0] of [[30, 122], [204, 118]] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + 160) / 2, 152, 160, 206);
    ctx.save();
    ctx.shadowColor = jelly;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = rgba(shade(jelly, -0.55), 0.95);
    ctx.lineWidth = 24;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = rgba(jelly, 0.85);
    ctx.lineWidth = 17;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.6);
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  // bubbles in the strap
  for (const [x, y] of [[70, 140], [100, 150], [186, 140], [172, 172]] as const) {
    ellipse(ctx, x, y, 3, 3);
    ctx.fillStyle = rgba('#ffffff', 0.85);
    ctx.fill();
  }
  // glowing jelly bead at the toe post
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ellipse(ctx, 160, 206, 16, 14);
  ctx.fillStyle = rgba(glow, 0.95);
  ctx.fill();
  ctx.restore();
  ellipse(ctx, 160, 206, 16, 14);
  ink(ctx, 3.5, rgba(shade(glow, -0.6), 0.95));
  glossy(ctx, 155, 200, 7, 5, 0.9);
}

// ——— SHORT-ORDER SHOE: greasy chef clog, checker sole, ketchup, order ticket ———

function drawChefClog(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const check = art.secondary!;
  drawBareBody(ctx, { ...art, skin: '#f4f1ea' }, r);
  // checkered platform sole
  const sole = () => roundRect(ctx, CX - 108, 222, 216, 46, 16);
  sole();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save();
  sole();
  ctx.clip();
  for (let y = 222, row = 0; y < 270; y += 15, row++) {
    for (let x = CX - 108, col = 0; x < CX + 110; x += 15, col++) {
      if ((row + col) % 2) {
        ctx.fillStyle = check;
        ctx.fillRect(x, y, 15, 15);
      }
    }
  }
  ctx.fillStyle = vgrad(ctx, 222, 268, [[0, rgba('#ffffff', 0.25)], [1, rgba('#000000', 0.35)]]);
  ctx.fillRect(0, 222, 230, 46);
  ctx.restore();
  sole();
  ink(ctx);
  // clog upper
  const path = (open = false) => {
    ctx.beginPath();
    ctx.moveTo(12, 92);
    ctx.bezierCurveTo(4, 170, 22, 236, CX, 238);
    ctx.bezierCurveTo(198, 236, 216, 170, 208, 92);
    if (!open) ctx.quadraticCurveTo(CX, 52, 12, 92);
  };
  path();
  const g = ctx.createRadialGradient(CX - 30, 130, 10, CX, 170, 140);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, p);
  g.addColorStop(1, shade(p, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // grease sheen
  for (let i = 0; i < 7; i++) {
    ellipse(ctx, 30 + r() * 160, 100 + r() * 120, 10 + r() * 16, 5 + r() * 8, r() * 3);
    ctx.fillStyle = rgba('#e8c34a', 0.22);
    ctx.fill();
  }
  // ketchup splats with drips
  const splat = (x: number, y: number, s: number, col: string) => {
    blob(ctx, x, y, s, 0.6, r, 9);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = shade(col, -0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y + s * 0.5);
    ctx.quadraticCurveTo(x - s * 0.35, y + s * 1.6, x - s * 0.1, y + s * 1.7);
    ctx.quadraticCurveTo(x + s * 0.1, y + s * 1.5, x + s * 0.1, y + s * 0.5);
    ctx.fill();
    ellipse(ctx, x - s * 0.3, y - s * 0.3, s * 0.3, s * 0.18, -0.5);
    ctx.fillStyle = rgba('#ffffff', 0.6);
    ctx.fill();
  };
  splat(62, 168, 16, '#d8202a');
  splat(154, 124, 11, '#d8202a');
  splat(128, 206, 8, '#f2c21f');
  for (let i = 0; i < 6; i++) {
    ellipse(ctx, 40 + r() * 140, 120 + r() * 100, 2 + r() * 2, 2 + r() * 2);
    ctx.fillStyle = '#d8202a';
    ctx.fill();
  }
  glossy(ctx, CX - 50, 120, 32, 18, 0.7);
  glossy(ctx, CX + 54, 200, 14, 10, 0.5);
  ctx.restore();
  path();
  ink(ctx);
  // opening rim
  ctx.beginPath();
  ctx.moveTo(12, 92);
  ctx.quadraticCurveTo(CX, 52, 208, 92);
  ctx.strokeStyle = shade(p, -0.25);
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  // order ticket taped on, sticking out to the right
  ctx.save();
  ctx.translate(206, 150);
  ctx.rotate(0.28);
  ctx.beginPath();
  ctx.moveTo(-26, -40);
  ctx.lineTo(26, -40);
  ctx.lineTo(26, 36);
  for (let i = 0; i < 6; i++) ctx.lineTo(26 - (i + 0.5) * (52 / 6), i % 2 ? 36 : 42);
  ctx.lineTo(-26, 36);
  ctx.closePath();
  ctx.fillStyle = '#fffbe9';
  ctx.fill();
  ink(ctx, 3.5);
  ctx.fillStyle = '#d8343f';
  ctx.fillRect(-24, -38, 48, 12);
  ctx.fillStyle = '#2a2a2a';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('#86', 0, -12);
  ctx.strokeStyle = rgba('#3a3a3a', 0.6);
  ctx.lineWidth = 2;
  for (const y of [0, 10, 20, 28]) {
    ctx.beginPath();
    ctx.moveTo(-18, y);
    ctx.lineTo(y === 28 ? 4 : 18, y);
    ctx.stroke();
  }
  // tape
  ctx.rotate(-0.4);
  roundRect(ctx, -30, -50, 26, 12, 2);
  ctx.fillStyle = rgba('#fff3b0', 0.85);
  ctx.fill();
  ctx.strokeStyle = rgba('#b8a060', 0.8);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  // a wisp of griddle steam
  ctx.strokeStyle = rgba('#ffffff', 0.7);
  ctx.lineWidth = 4;
  for (const x of [-8, 6]) {
    ctx.beginPath();
    ctx.moveTo(x, 200);
    ctx.bezierCurveTo(x - 10, 180, x + 10, 170, x, 150);
    ctx.stroke();
  }
}

// ——— MILKSHAKE MAX: milkshake-glass boot, whipped cream, straw, cherry ———

function drawMilkshake(ctx: Ctx, art: FootArt, r: () => number): void {
  const shake = art.primary!;
  const cherry = art.secondary!;
  // straw (behind the cream)
  ctx.save();
  ctx.translate(150, 70);
  ctx.rotate(-0.62);
  roundRect(ctx, -8, -112, 16, 120, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save();
  roundRect(ctx, -8, -112, 16, 120, 6);
  ctx.clip();
  ctx.fillStyle = '#e5242f';
  for (let y = -120; y < 10; y += 18) {
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(10, y - 8);
    ctx.lineTo(10, y);
    ctx.lineTo(-10, y + 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = rgba('#ffffff', 0.45);
  ctx.fillRect(-5, -112, 4, 120);
  ctx.restore();
  roundRect(ctx, -8, -112, 16, 120, 6);
  ink(ctx, 4);
  ctx.restore();
  // pedestal
  ellipse(ctx, CX, 262, 72, 13);
  ctx.fillStyle = vgrad(ctx, 250, 275, [[0, rgba('#ffffff', 0.95)], [1, rgba('#9fc8e0', 0.95)]]);
  ctx.fill();
  ink(ctx, 4.5);
  roundRect(ctx, CX - 16, 238, 32, 24, 6);
  ctx.fillStyle = metal(ctx, CX - 16, CX + 16, '#cfe6f2');
  ctx.fill();
  ink(ctx, 4);
  // the glass
  const glass = () => {
    ctx.beginPath();
    ctx.moveTo(-8, 44);
    ctx.lineTo(228, 44);
    ctx.bezierCurveTo(222, 150, 196, 230, CX, 246);
    ctx.bezierCurveTo(24, 230, -2, 150, -8, 44);
    ctx.closePath();
  };
  glass();
  const sg = ctx.createLinearGradient(-8, 0, 228, 0);
  sg.addColorStop(0, shade(shake, -0.3));
  sg.addColorStop(0.35, shade(shake, 0.12));
  sg.addColorStop(0.55, shade(shake, 0.25));
  sg.addColorStop(1, shade(shake, -0.35));
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.save();
  glass();
  ctx.clip();
  // fluted glass ridges
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(CX + i * 28, 44);
    ctx.quadraticCurveTo(CX + i * 22, 160, CX + i * 6, 246);
    ctx.strokeStyle = rgba('#ffffff', 0.22);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = rgba(shade(shake, -0.5), 0.18);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX + i * 28 + 8, 44);
    ctx.quadraticCurveTo(CX + i * 22 + 7, 160, CX + i * 6 + 2, 246);
    ctx.stroke();
  }
  // glass rim band (clear) at the top
  ctx.fillStyle = rgba('#e8f6ff', 0.55);
  ctx.fillRect(-10, 44, 240, 18);
  // big glass highlights
  ctx.fillStyle = rgba('#ffffff', 0.55);
  ctx.beginPath();
  ctx.moveTo(18, 60);
  ctx.quadraticCurveTo(22, 150, 58, 214);
  ctx.lineTo(70, 210);
  ctx.quadraticCurveTo(38, 150, 34, 60);
  ctx.closePath();
  ctx.fill();
  // condensation drops
  for (let i = 0; i < 14; i++) {
    const x = 20 + r() * 180;
    const y = 70 + r() * 150;
    ellipse(ctx, x, y, 2.5, 3.4);
    ctx.fillStyle = rgba('#ffffff', 0.7);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(shake, -0.5), 0.4);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
  glass();
  ink(ctx);
  // whipped cream cloud on top
  const puffs: [number, number, number][] = [
    [4, 40, 20], [34, 30, 24], [70, 22, 26], [110, 18, 28], [150, 22, 26], [186, 30, 24], [216, 40, 20],
    [52, 46, 20], [110, 44, 22], [168, 46, 20],
  ];
  const cg = ctx.createLinearGradient(0, -8, 0, 66);
  cg.addColorStop(0, '#ffffff');
  cg.addColorStop(0.7, '#fff4ec');
  cg.addColorStop(1, '#e6d2c8');
  union(ctx, circles(puffs)(ctx), cg, outlineOf('#d8c0b8'));
  ctx.strokeStyle = rgba('#d8c0b8', 0.8);
  ctx.lineWidth = 2.5;
  for (const [x, y, rr] of puffs.slice(0, 7)) {
    ctx.beginPath();
    ctx.arc(x, y + 2, rr * 0.6, 0.3, Math.PI - 0.6);
    ctx.stroke();
  }
  // sprinkles
  const cols = ['#ff4d6d', '#ffd23f', '#3ddc97', '#4cc9f0', '#7b5cff'];
  for (let i = 0; i < 22; i++) {
    const x = 0 + r() * 220;
    const y = 10 + r() * 36;
    const a = r() * Math.PI;
    ctx.strokeStyle = cols[i % cols.length];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * 4, y - Math.sin(a) * 4);
    ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
    ctx.stroke();
  }
  // cherry
  ctx.beginPath();
  ctx.moveTo(78, 0);
  ctx.quadraticCurveTo(86, -10, 104, -6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#5a8a2a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ellipse(ctx, 74, 14, 19, 18);
  const chg = ctx.createRadialGradient(68, 8, 2, 74, 14, 22);
  chg.addColorStop(0, shade(cherry, 0.45));
  chg.addColorStop(0.6, cherry);
  chg.addColorStop(1, shade(cherry, -0.45));
  ctx.fillStyle = chg;
  ctx.fill();
  ink(ctx, 4.5);
  ellipse(ctx, 67, 7, 6, 4, -0.5);
  ctx.fillStyle = rgba('#ffffff', 0.85);
  ctx.fill();
}

// ——— ICE SKATE IVY: white figure skate, ivy vine, fur trim, gleaming blade ———

function drawFigureSkate(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const acc = art.secondary!;
  // stanchions
  for (const x of [CX - 52, CX + 52]) {
    ctx.beginPath();
    ctx.moveTo(x - 16, 226);
    ctx.lineTo(x + 16, 226);
    ctx.lineTo(x + 7, 276);
    ctx.lineTo(x - 7, 276);
    ctx.closePath();
    ctx.fillStyle = metal(ctx, x - 16, x + 16, '#c3cdd8');
    ctx.fill();
    ink(ctx, 4);
  }
  // toe picks
  ctx.beginPath();
  ctx.moveTo(CX - 40, 286);
  for (let i = 0; i < 6; i++) {
    const x = CX - 40 + i * 16;
    ctx.lineTo(x + 8, 302);
    ctx.lineTo(x + 16, 286);
  }
  ctx.closePath();
  ctx.fillStyle = metal(ctx, CX - 40, CX + 56, '#d9dde3');
  ctx.fill();
  ink(ctx, 3.5);
  // blade
  ctx.beginPath();
  ctx.moveTo(CX - 98, 272);
  ctx.quadraticCurveTo(CX - 104, 284, CX - 86, 290);
  ctx.lineTo(CX + 86, 290);
  ctx.quadraticCurveTo(CX + 108, 286, CX + 100, 270);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 270, 292, [[0, '#ffffff'], [0.45, '#c3cdd8'], [0.55, '#7d8592'], [1, '#e8edf2']]);
  ctx.fill();
  ink(ctx, 4);
  ctx.fillStyle = rgba('#ffffff', 0.9);
  roundRect(ctx, CX - 80, 274, 120, 3, 1.5);
  ctx.fill();
  // fur trim behind the boot top
  // boot
  const shoe = () => shoePath(ctx, { bottom: 244, width: 90 });
  shoe();
  const bg = ctx.createLinearGradient(18, 0, 202, 0);
  bg.addColorStop(0, shade(p, -0.25));
  bg.addColorStop(0.45, '#ffffff');
  bg.addColorStop(0.7, p);
  bg.addColorStop(1, shade(p, -0.3));
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.save();
  shoe();
  ctx.clip();
  // ivy vine
  for (const sx of [-1, 1]) {
    const pts: P[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push([CX + sx * (66 + Math.sin(t * 8) * 8 - t * 6), 30 + t * 196]);
    }
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = '#2f7a3a';
    ctx.lineWidth = 3;
    ctx.stroke();
    for (let i = 2; i < 24; i += 3) {
      const [x, y] = pts[i];
      const side = i % 2 ? 1 : -1;
      ctx.save();
      ctx.translate(x + side * 6, y);
      ctx.rotate(side * 0.8);
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-12, 0, -8, -10, 0, -4);
      ctx.bezierCurveTo(8, -10, 12, 0, 0, 8);
      ctx.fillStyle = i % 2 ? '#4cae4f' : '#3a9442';
      ctx.fill();
      ctx.strokeStyle = '#1f5a28';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }
  }
  // lavender sole welt
  ctx.fillStyle = acc;
  ctx.fillRect(0, 226, 230, 24);
  // glitter
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = r() > 0.5 ? rgba(acc, 0.6) : rgba('#ffffff', 0.9);
    ellipse(ctx, r() * 230, r() * 230, 0.8 + r() * 1.3, 0.8 + r() * 1.3);
    ctx.fill();
  }
  glossy(ctx, CX - 30, 100, 30, 70, 0.4);
  ctx.restore();
  shoe();
  ink(ctx);
  roundRect(ctx, CX - 28, 6, 56, 150, 14);
  ctx.fillStyle = '#f4f0ff';
  ctx.fill();
  ink(ctx, 3, rgba(INK, 0.7));
  laces(ctx, 24, 176, acc, 6, 24);
  // fluffy fur trim at the top
  const tufts: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) tufts.push([48 + i * 20.7, 8 + (i % 2) * 5, 17]);
  union(ctx, circles(tufts)(ctx), '#ffffff', outlineOf('#c8c0e0'));
  ctx.save();
  ctx.beginPath();
  for (const [x, y, rr] of tufts) {
    ctx.moveTo(x + rr, y);
    ctx.arc(x, y, rr, 0, Math.PI * 2);
  }
  ctx.clip();
  ctx.fillStyle = vgrad(ctx, -8, 30, [[0, '#ffffff'], [1, '#d9d0f2']]);
  ctx.fillRect(20, -10, 190, 44);
  drawHair(ctx, r, 30, -8, 160, 36, '#b9addb', 60);
  ctx.restore();
  // pom-poms on the laces
  for (const sx of [-1, 1]) {
    blob(ctx, CX + sx * 16, 194, 13, 0.35, r, 12);
    ctx.fillStyle = sx < 0 ? acc : '#ffffff';
    ctx.fill();
    ink(ctx, 3, outlineOf('#c8c0e0'));
  }
  // gleam
  twinkle(ctx, CX + 70, 280, 16, '#ffffff', '#bfe6ff');
  twinkle(ctx, CX - 74, 278, 9, '#ffffff', '#bfe6ff');
  for (const [x, y, s] of [[-10, 160, 10], [232, 110, 12], [222, 220, 8], [-2, 60, 8]] as const) twinkle(ctx, x, y, s, '#ffffff', acc);
}

// ——— THE LUMBERJACK: leather work boot, plaid sock, hatchet, wood chips ———

function woodChip(ctx: Ctx, x: number, y: number, s: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-s, -s * 0.3);
  ctx.quadraticCurveTo(0, -s * 0.9, s, -s * 0.4);
  ctx.lineTo(s * 0.8, s * 0.35);
  ctx.quadraticCurveTo(0, -s * 0.1, -s * 0.9, s * 0.4);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -s, s, [[0, '#f2d6a2'], [1, '#c89a5a']]);
  ctx.fill();
  ink(ctx, 2.5);
  ctx.strokeStyle = rgba('#8a5a2a', 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-s * 0.7, 0);
  ctx.quadraticCurveTo(0, -s * 0.5, s * 0.7, -s * 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawLumberBoot(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const plaid = art.secondary!;
  // hatchet tucked in at the right (behind)
  ctx.save();
  ctx.translate(196, 60);
  ctx.rotate(0.35);
  roundRect(ctx, -6, -66, 12, 110, 5);
  ctx.fillStyle = leatherFill(ctx, '#b07a40');
  ctx.fill();
  ink(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(-4, -60);
  ctx.lineTo(34, -70);
  ctx.quadraticCurveTo(46, -50, 36, -28);
  ctx.lineTo(-4, -40);
  ctx.closePath();
  ctx.fillStyle = metal(ctx, -4, 46, '#9aa3ad');
  ctx.fill();
  ink(ctx, 4);
  ctx.strokeStyle = rgba('#ffffff', 0.85);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(38, -64);
  ctx.quadraticCurveTo(44, -50, 38, -34);
  ctx.stroke();
  ctx.restore();
  // lug sole with teeth
  ctx.beginPath();
  ctx.moveTo(CX - 108, 228);
  ctx.lineTo(CX + 108, 228);
  ctx.lineTo(CX + 110, 256);
  for (let i = 0; i < 9; i++) {
    const x = CX + 110 - (i + 0.5) * (220 / 9);
    ctx.lineTo(x + 6, 256);
    ctx.lineTo(x, 270);
    ctx.lineTo(x - 6, 256);
  }
  ctx.lineTo(CX - 110, 256);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 228, 270, [[0, '#5a4030'], [1, '#2a1c12']]);
  ctx.fill();
  ink(ctx);
  ctx.fillStyle = '#c9a25a';
  ctx.fillRect(CX - 104, 234, 208, 4);
  // boot
  const shoe = () => shoePath(ctx, { bottom: 242, width: 102 });
  shoe();
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoe();
  ctx.clip();
  // moc toe
  ctx.beginPath();
  ctx.moveTo(44, 248);
  ctx.bezierCurveTo(40, 170, 180, 170, 176, 248);
  ctx.fillStyle = shade(p, 0.1);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.strokeStyle = '#f2c86b';
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(52, 248);
  ctx.bezierCurveTo(50, 182, 170, 182, 168, 248);
  ctx.stroke();
  shoePath(ctx, { bottom: 232, width: 92, open: true });
  ctx.stroke();
  ctx.setLineDash([]);
  // scuffs
  for (let i = 0; i < 22; i++) {
    ctx.strokeStyle = rgba('#ffffff', 0.08 + r() * 0.1);
    ctx.lineWidth = 1.5;
    const x = 20 + r() * 180;
    const y = 40 + r() * 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 + r() * 10, y + (r() - 0.5) * 4);
    ctx.stroke();
  }
  glossy(ctx, CX - 44, 120, 28, 56, 0.22);
  ctx.restore();
  shoe();
  ink(ctx);
  roundRect(ctx, CX - 32, 20, 64, 120, 12);
  ctx.fillStyle = shade(p, -0.12);
  ctx.fill();
  ink(ctx, 3.5, rgba(INK, 0.8));
  laces(ctx, 40, 168, plaid, 4, 30);
  // speed hooks
  for (let i = 0; i < 3; i++) {
    for (const sx of [-1, 1]) {
      const y = 30 + i * 14;
      ctx.beginPath();
      ctx.arc(CX + sx * 34, y, 5, sx < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, sx < 0 ? Math.PI * 1.5 : Math.PI * 0.5);
      ctx.strokeStyle = '#2b2f36';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = '#c3cdd8';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  // plaid sock folded over the top
  const sock = () => roundRect(ctx, 34, -6, 152, 40, 14);
  sock();
  ctx.fillStyle = plaid;
  ctx.fill();
  ctx.save();
  sock();
  ctx.clip();
  ctx.fillStyle = rgba('#1b1b1b', 0.55);
  for (let x = 34; x < 190; x += 32) ctx.fillRect(x, -10, 16, 50);
  for (let y = -6; y < 40; y += 22) ctx.fillRect(30, y, 160, 11);
  ctx.strokeStyle = rgba('#000000', 0.4);
  ctx.lineWidth = 1.5;
  for (let x = 42; x < 190; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.lineTo(x, 40);
    ctx.stroke();
  }
  ctx.fillStyle = vgrad(ctx, -6, 34, [[0, rgba('#ffffff', 0.2)], [1, rgba('#000000', 0.35)]]);
  ctx.fillRect(30, -10, 160, 50);
  ctx.restore();
  sock();
  ink(ctx, 4.5);
  // fuzzy knit edge
  for (let x = 40; x < 182; x += 6) {
    ctx.strokeStyle = r() > 0.5 ? shade(plaid, 0.2) : '#2a1a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, 32);
    ctx.lineTo(x + (r() - 0.5) * 4, 38 + r() * 4);
    ctx.stroke();
  }
  // wood chips
  for (const [x, y, s, a] of [[-14, 150, 12, 0.4], [-8, 222, 10, -0.6], [236, 214, 12, 0.9], [234, 142, 9, -0.3], [78, 212, 9, 0.2], [152, 230, 8, -0.8], [20, 90, 8, 1.2]] as const) {
    woodChip(ctx, x, y, s, a);
  }
}

// ——— UFO TOE: one giant alien toe with an orbiting saucer ———

function drawUfoToe(ctx: Ctx, art: FootArt, r: () => number): void {
  const col = art.skin;
  const nail = art.secondary!;
  const ol = outlineOf(col);
  const ox = CX;
  const oy = 176;
  const orbit = (from: number, to: number) => {
    ctx.beginPath();
    ctx.ellipse(ox, oy, 136, 32, -0.22, from, to);
  };
  // back half of the orbit
  ctx.save();
  ctx.setLineDash([10, 8]);
  orbit(Math.PI, Math.PI * 2);
  ctx.strokeStyle = rgba('#d4ff5a', 0.55);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  // the toe
  const body = (open = false) => {
    ctx.beginPath();
    ctx.moveTo(54, -6);
    ctx.bezierCurveTo(52, 50, 26, 90, 24, 150);
    ctx.bezierCurveTo(22, 236, 68, 284, CX, 284);
    ctx.bezierCurveTo(152, 284, 198, 236, 196, 150);
    ctx.bezierCurveTo(194, 90, 168, 50, 166, -6);
    if (!open) ctx.closePath();
  };
  body();
  ctx.fillStyle = skinBodyFill(ctx, col);
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  const hl = ctx.createRadialGradient(96, 150, 6, 104, 170, 110);
  hl.addColorStop(0, rgba('#ffffff', 0.4));
  hl.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = hl;
  ctx.fillRect(0, 0, 230, 290);
  for (let i = 0; i < 14; i++) {
    const rr = 3 + r() * 9;
    ellipse(ctx, 40 + r() * 140, 10 + r() * 230, rr, rr * 0.85);
    ctx.fillStyle = rgba(shade(col, -0.35), 0.4);
    ctx.fill();
  }
  ctx.restore();
  body(true);
  ink(ctx, OUT, ol);
  // knuckle creases
  ctx.strokeStyle = rgba(ol, 0.55);
  ctx.lineWidth = 3;
  for (const [y, w] of [[96, 40], [108, 30]] as const) {
    ctx.beginPath();
    ctx.moveTo(CX - w, y);
    ctx.quadraticCurveTo(CX, y + 12, CX + w, y);
    ctx.stroke();
  }
  // glowing nail
  ctx.save();
  ctx.shadowColor = nail;
  ctx.shadowBlur = 22;
  ellipse(ctx, CX, 236, 50, 38);
  ctx.fillStyle = vgrad(ctx, 198, 274, [[0, shade(nail, 0.4)], [1, shade(nail, -0.2)]]);
  ctx.fill();
  ctx.restore();
  ellipse(ctx, CX, 236, 50, 38);
  ink(ctx, 3.5, rgba(outlineOf(nail), 0.85));
  ellipse(ctx, CX - 18, 222, 16, 9, -0.4);
  ctx.fillStyle = rgba('#ffffff', 0.75);
  ctx.fill();
  // antennae nubs
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + sx * 40, 60);
    ctx.quadraticCurveTo(CX + sx * 70, 40, CX + sx * 78, 18);
    ctx.strokeStyle = ol;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = nail;
    ctx.shadowBlur = 12;
    ellipse(ctx, CX + sx * 78, 16, 8, 8);
    ctx.fillStyle = nail;
    ctx.fill();
    ctx.restore();
    ellipse(ctx, CX + sx * 78, 16, 8, 8);
    ink(ctx, 3, ol);
  }
  // front half of the orbit
  ctx.save();
  ctx.setLineDash([10, 8]);
  orbit(0, Math.PI);
  ctx.strokeStyle = rgba('#d4ff5a', 0.9);
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();
  // saucer on the front of the orbit
  const sx = 214;
  const sy = 186;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-0.22);
  // tractor beam
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.lineTo(10, 6);
  ctx.lineTo(22, 50);
  ctx.lineTo(-22, 50);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 6, 50, [[0, rgba('#fff7a0', 0.7)], [1, rgba('#fff7a0', 0)]]);
  ctx.fill();
  // dome
  ctx.beginPath();
  ctx.ellipse(0, -4, 17, 17, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = rgba('#9ff3ff', 0.85);
  ctx.fill();
  ink(ctx, 3.5);
  ellipse(ctx, 0, -8, 6, 7);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = ol;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const ex of [-2.5, 2.5]) {
    ellipse(ctx, ex, -9, 1.6, 2.2);
    ctx.fillStyle = '#111';
    ctx.fill();
  }
  glossy(ctx, -7, -12, 5, 4, 0.9);
  // disc
  ellipse(ctx, 0, 0, 40, 11);
  ctx.fillStyle = metal(ctx, -40, 40, art.primary!);
  ctx.fill();
  ink(ctx, 4);
  ellipse(ctx, 0, 4, 22, 5);
  ctx.fillStyle = '#5b626c';
  ctx.fill();
  ['#ff4d6d', '#ffd23f', '#3ddc97', '#4cc9f0', '#ff4d6d'].forEach((c, i) => {
    ctx.save();
    ctx.shadowColor = c;
    ctx.shadowBlur = 8;
    ellipse(ctx, -28 + i * 14, 1 + Math.abs(i - 2) * -1, 3, 3);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
  // motion trail behind the saucer
  ctx.strokeStyle = rgba('#ffffff', 0.7);
  ctx.lineWidth = 3;
  for (const dy of [-6, 4]) {
    ctx.beginPath();
    ctx.moveTo(sx - 46, sy + 14 + dy);
    ctx.lineTo(sx - 70, sy + 20 + dy);
    ctx.stroke();
  }
}

// ——— POLTERGEIST PUMP: ghostly pump with a face, floating cutlery ———

function drawGhostPump(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const s = art.secondary!;
  // stiletto heel peeking up behind the ankle
  ctx.beginPath();
  ctx.moveTo(176, 118);
  ctx.lineTo(196, 112);
  ctx.lineTo(234, 4);
  ctx.lineTo(226, 2);
  ctx.closePath();
  ctx.fillStyle = metal(ctx, 176, 234, s);
  ctx.fill();
  ink(ctx, 4);
  roundRect(ctx, 220, -4, 18, 10, 3);
  ctx.fillStyle = shade(s, -0.4);
  ctx.fill();
  ink(ctx, 3);
  // ectoplasm wisps at the sides
  ctx.save();
  ctx.shadowColor = s;
  ctx.shadowBlur = 16;
  for (const [x, dir] of [[14, -1], [206, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, 210);
    ctx.bezierCurveTo(x + dir * 30, 180, x + dir * 6, 140, x + dir * 34, 110);
    ctx.bezierCurveTo(x + dir * 20, 150, x + dir * 44, 180, x + dir * 4, 236);
    ctx.closePath();
    ctx.fillStyle = rgba(shade(s, 0.55), 0.6);
    ctx.fill();
  }
  ctx.restore();
  drawBareBody(ctx, art, r);
  // vamp
  const vamp = () => {
    ctx.beginPath();
    ctx.moveTo(14, 110);
    ctx.bezierCurveTo(8, 194, 58, 252, CX + 4, 282);
    ctx.bezierCurveTo(162, 252, 214, 194, 208, 108);
    ctx.bezierCurveTo(176, 132, 146, 142, CX + 2, 144);
    ctx.bezierCurveTo(74, 142, 44, 132, 14, 110);
    ctx.closePath();
  };
  ctx.save();
  ctx.shadowColor = s;
  ctx.shadowBlur = 22;
  vamp();
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.restore();
  ctx.save();
  vamp();
  ctx.clip();
  const hl = ctx.createRadialGradient(CX - 30, 170, 4, CX - 20, 180, 80);
  hl.addColorStop(0, rgba('#ffffff', 0.7));
  hl.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = hl;
  ctx.fillRect(0, 100, 230, 190);
  ctx.fillStyle = rgba(s, 0.25);
  ctx.fillRect(0, 238, 230, 50);
  ctx.restore();
  vamp();
  ink(ctx, OUT, outlineOf(s));
  // spooky face
  for (const sx of [-1, 1]) {
    ellipse(ctx, CX + 2 + sx * 26, 190, 12, 17);
    ctx.fillStyle = '#2a1f4a';
    ctx.fill();
    ellipse(ctx, CX + 2 + sx * 26 - 3, 184, 4, 5);
    ctx.fillStyle = rgba('#ffffff', 0.8);
    ctx.fill();
  }
  ellipse(ctx, CX + 2, 228, 11, 15);
  ctx.fillStyle = '#2a1f4a';
  ctx.fill();
  // drips off the vamp edge
  for (const [x, y, len] of [[44, 138, 18], [CX + 2, 146, 22], [178, 134, 14]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 4);
    ctx.quadraticCurveTo(x - 7, y + len, x, y + len + 4);
    ctx.quadraticCurveTo(x + 7, y + len, x + 7, y - 4);
    ctx.fillStyle = shade(s, 0.45);
    ctx.fill();
    ink(ctx, 2.5, outlineOf(s));
  }
  // bow
  ctx.save();
  ctx.translate(CX + 2, 138);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(sx * 22, -18, sx * 34, 0, sx * 24, 12);
    ctx.bezierCurveTo(sx * 14, 16, sx * 6, 6, 0, 0);
    ctx.fillStyle = s;
    ctx.fill();
    ink(ctx, 3);
  }
  ellipse(ctx, 0, 0, 7, 7);
  ctx.fillStyle = shade(s, -0.2);
  ctx.fill();
  ink(ctx, 3);
  ctx.restore();
  // floating cutlery: fork on the left, teacup on the right
  ctx.save();
  ctx.translate(-14, 150);
  ctx.rotate(-0.5);
  ctx.globalAlpha = 0.9;
  roundRect(ctx, -4, -6, 8, 64, 4);
  ctx.fillStyle = metal(ctx, -4, 4, '#d9dde3');
  ctx.fill();
  ink(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(-10, -6);
  ctx.lineTo(10, -6);
  ctx.lineTo(10, -30);
  ctx.moveTo(-10, -6);
  ctx.lineTo(-10, -30);
  ctx.moveTo(-3.3, -6);
  ctx.lineTo(-3.3, -30);
  ctx.moveTo(3.3, -6);
  ctx.lineTo(3.3, -30);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#e8edf2';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(234, 176);
  ctx.rotate(0.4);
  ctx.beginPath();
  ctx.moveTo(-16, -12);
  ctx.lineTo(16, -12);
  ctx.quadraticCurveTo(16, 14, 0, 14);
  ctx.quadraticCurveTo(-16, 14, -16, -12);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -12, 14, [[0, '#ffffff'], [1, '#c9d6ef']]);
  ctx.fill();
  ink(ctx, 3.5);
  ctx.beginPath();
  ctx.arc(18, 0, 7, -1.3, 1.3);
  ink(ctx, 3.5);
  ctx.fillStyle = s;
  ctx.fillRect(-14, -6, 28, 4);
  ctx.restore();
  // shimmer motes
  for (let i = 0; i < 8; i++) twinkle(ctx, -20 + r() * 270, 20 + r() * 260, 4 + r() * 5, '#ffffff', s);
}

// ——— Registration ———

registerKind('spaceclog', { draw: drawSpaceClog, contactY: 280, halfWidth: 116 });
registerKind('nonnaslipper', { draw: drawNonna, contactY: 274, halfWidth: 116 });
registerKind('gargoyle', { draw: drawGargoyle, contactY: 292, halfWidth: 110 });
registerKind('kraken', { draw: drawKraken, contactY: 300, halfWidth: 128 });
registerKind('rinkqueen', { draw: drawRinkQueen, contactY: 306, halfWidth: 108 });
registerKind('yetiboot', { draw: drawYetiBoot, contactY: 300, halfWidth: 118 });
registerKind('waiter', { draw: drawWaiter, contactY: 258, halfWidth: 100 });
registerKind('dough', { draw: drawDough, contactY: 262, halfWidth: 112 });
registerKind('sweep', { draw: drawSweep, contactY: 266, halfWidth: 104 });
registerKind('pigeon', { draw: drawPigeon, contactY: 300, halfWidth: 90 });
registerKind('sandcastle', { draw: drawSandcastle, contactY: 262, halfWidth: 106 });
registerKind('jellyflop', { draw: drawJellyFlop, contactY: 268, halfWidth: 122 });
registerKind('chefclog', { draw: drawChefClog, contactY: 268, halfWidth: 108 });
registerKind('milkshake', { draw: drawMilkshake, contactY: 275, halfWidth: 112 });
registerKind('figureskate', { draw: drawFigureSkate, contactY: 302, halfWidth: 94 });
registerKind('lumberboot', { draw: drawLumberBoot, contactY: 270, halfWidth: 110 });
registerKind('ufotoe', { draw: drawUfoToe, contactY: 284, halfWidth: 90 });
registerKind('ghostpump', { draw: drawGhostPump, contactY: 282, halfWidth: 100 });

