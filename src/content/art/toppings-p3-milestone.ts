// Toppings for the phase 3 milestone prizes and four Rare Finds (src/content/pizzas/p3.ts).
//
// Milestone prizes are trophies, so most of them get an overlay centrepiece (count 1) that resets
// the transform and paints across the whole 400×400 pizza top: a chequered flag, crossed swords,
// a pepperoni "100", a crown, a halo, a lightning bolt and so on. Portraits squash the top 2:1 on the
// table, so centrepieces are drawn stretched vertically (TALL) to read at ~150 px.
// The rest are ordinary pieces centred at the origin, already translated and rotated by the caller.

import { PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
import { type Ctx, blob, ellipse, rgba, roundRect, shade } from '../../art/util';

const C = PIZZA_SIZE / 2;
const TALL = 1.55; // vertical stretch for centrepieces, to survive the table tilt
const CALZONE_CY = PIZZA_SIZE / 2 - PIZZA_R * 0.36;

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.5): void {
  ctx.fillStyle = rgba('#ffffff', a);
  ellipse(ctx, x, y, rx, ry, -0.6);
  ctx.fill();
}

function drop(ctx: Ctx, alpha = 0.3, dx = 2, dy = 3): void {
  // soft contact shadow for the current path
  ctx.save();
  ctx.translate(dx, dy);
  ctx.fillStyle = rgba('#2a0e04', alpha);
  ctx.fill();
  ctx.restore();
}

/** Register a piece topping drawn `scale` times larger than its design size. */
function piece(id: string, scale: number, d: { count?: number; minDist?: number; draw(ctx: Ctx, rand: () => number): void }): void {
  registerTopping(id, {
    count: d.count,
    minDist: d.minDist === undefined ? undefined : d.minDist * (1 + (scale - 1) * 0.7),
    draw(ctx, rand) {
      ctx.scale(scale, scale);
      d.draw(ctx, rand);
    },
  });
}

/** Register an overlay: one call that paints across the whole untransformed pizza top. */
function overlayTopping(id: string, draw: (ctx: Ctx, rand: () => number) => void): void {
  registerTopping(id, {
    count: 1,
    minDist: 0,
    draw(ctx, rand) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      draw(ctx, rand);
    },
  });
}

/** Draw `fn` at (x, y) rotated by `rot`, in the current (overlay) frame. */
function at(ctx: Ctx, x: number, y: number, rot: number, fn: () => void, s = 1, sy = s): void {
  ctx.save();
  ctx.translate(x, y);
  if (sy !== s) ctx.scale(1, sy / s);
  ctx.rotate(rot);
  if (s !== 1) ctx.scale(s, s);
  fn();
  ctx.restore();
}

/** Keep the piece's position but drop the caller's random spin (for things with an "up", like a skull). */
function upright(ctx: Ctx, tilt: number): void {
  const m = ctx.getTransform();
  const k = Math.hypot(m.a, m.b);
  ctx.setTransform(k, 0, 0, k, m.e, m.f);
  ctx.rotate(tilt);
}

/** Poisson-ish scatter of points inside a predicate region (overlay coords). */
function spread(n: number, minDist: number, rand: () => number, inside: (x: number, y: number) => boolean, r = PIZZA_R * 0.75): [number, number][] {
  const pts: [number, number][] = [];
  for (let tries = 0; pts.length < n && tries < n * 80; tries++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * r;
    const x = C + Math.cos(a) * d;
    const y = C + Math.sin(a) * d;
    if (!inside(x, y)) continue;
    if (pts.every(([px, py]) => (px - x) ** 2 + (py - y) ** 2 > minDist * minDist)) pts.push([x, y]);
  }
  return pts;
}

/** A pepperoni round in the built-in style, at the origin. */
function pepperoni(ctx: Ctx, r: number, rand: () => number): void {
  ctx.fillStyle = rgba('#3a0c04', 0.35);
  ellipse(ctx, 2, 3, r, r);
  ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 1, 0, 0, r);
  g.addColorStop(0, '#e04a2e');
  g.addColorStop(0.75, '#b02a17');
  g.addColorStop(1, '#6a160a');
  ctx.fillStyle = g;
  ellipse(ctx, 0, 0, r, r);
  ctx.fill();
  ctx.fillStyle = rgba('#5a1206', 0.45);
  for (let i = 0; i < 5; i++) {
    ellipse(ctx, (rand() - 0.5) * r * 1.2, (rand() - 0.5) * r * 1.2, r * 0.07 + rand() * r * 0.08, r * 0.07 + rand() * r * 0.06);
    ctx.fill();
  }
  ctx.strokeStyle = rgba('#3a0a02', 0.8);
  ctx.lineWidth = Math.max(1.5, r * 0.11);
  ellipse(ctx, 0, 0, r - 1, r - 1);
  ctx.stroke();
  shine(ctx, -r * 0.35, -r * 0.4, r * 0.35, r * 0.15, 0.55);
}

/** A basil leaf along the x axis, `len` half-length. */
function leaf(ctx: Ctx, len: number, col: string, width = 1): void {
  const w = len * width;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.quadraticCurveTo(0, -w, len, 0);
  ctx.quadraticCurveTo(0, w, -len, 0);
  ctx.closePath();
  drop(ctx, 0.28, 1.5, 2);
  const g = ctx.createLinearGradient(0, -w * 0.7, 0, w * 0.7);
  g.addColorStop(0, shade(col, 0.28));
  g.addColorStop(1, shade(col, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(col, -0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-len * 0.85, 0);
  ctx.lineTo(len * 0.85, 0);
  ctx.strokeStyle = rgba('#e0f8b0', 0.55);
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** Polished gold gradient across a box. */
function gold(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#fff3a8');
  g.addColorStop(0.3, '#f7c83a');
  g.addColorStop(0.55, '#d89a14');
  g.addColorStop(0.75, '#ffe07a');
  g.addColorStop(1, '#b07808');
  return g;
}

/** A four- or five-point sparkle star. */
function sparkle(ctx: Ctx, x: number, y: number, r: number, col: string, a = 0.9): void {
  ctx.fillStyle = rgba(col, a);
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function starPath(ctx: Ctx, r: number, inner: number, pts = 5): void {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = -Math.PI / 2 + (i / (pts * 2)) * Math.PI * 2;
    const d = i % 2 ? r * inner : r;
    if (i === 0) ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d);
    else ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
}

// ——— Victory Lap ———

overlayTopping('chequerFlag', (ctx) => {
  // a chequered ribbon waving diagonally across the pie, three squares deep
  const ang = -0.42;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const sq = 22;
  const rows = 3;
  const wave = (u: number) => Math.sin(u * 0.024 + 0.6) * 20;
  const map = (u: number, v: number): [number, number] => {
    const vv = v + wave(u);
    return [C + ca * u - sa * vv, C + 8 + sa * u + ca * vv];
  };
  const half = (rows * sq) / 2;
  ctx.save();
  ellipse(ctx, C, C, 160, 160);
  ctx.clip();
  // shadow of the ribbon on the pie
  ctx.beginPath();
  for (let u = -190; u <= 190; u += 6) {
    const [x, y] = map(u, -half);
    if (u === -190) ctx.moveTo(x + 4, y + 7);
    else ctx.lineTo(x + 4, y + 7);
  }
  for (let u = 190; u >= -190; u -= 6) {
    const [x, y] = map(u, half);
    ctx.lineTo(x + 4, y + 7);
  }
  ctx.closePath();
  ctx.fillStyle = rgba('#2a0e04', 0.35);
  ctx.fill();
  // the squares: mozzarella and black olive
  for (let u = -198; u < 198; u += sq) {
    for (let j = 0; j < rows; j++) {
      const v0 = -half + j * sq;
      const p = [map(u, v0), map(u + sq, v0), map(u + sq, v0 + sq), map(u, v0 + sq)];
      ctx.beginPath();
      ctx.moveTo(p[0][0], p[0][1]);
      for (let k = 1; k < 4; k++) ctx.lineTo(p[k][0], p[k][1]);
      ctx.closePath();
      const dark = (Math.round((u + 198) / sq) + j) % 2 === 0;
      ctx.fillStyle = dark ? '#26222a' : '#fbf3dc';
      ctx.fill();
      ctx.strokeStyle = dark ? '#26222a' : '#fbf3dc';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      if (dark) {
        // olive skin sheen
        const [cx, cy] = map(u + sq * 0.35, v0 + sq * 0.3);
        ctx.fillStyle = rgba('#8a8aa0', 0.35);
        ellipse(ctx, cx, cy, 4, 1.6, ang);
        ctx.fill();
      }
    }
  }
  // folds: shade where the ribbon turns away, light where it faces up
  for (let u = -198; u < 198; u += 4) {
    const slope = Math.cos(u * 0.024 + 0.6);
    const [x0, y0] = map(u, -half);
    const [x1, y1] = map(u, half);
    ctx.strokeStyle = slope > 0 ? rgba('#ffffff', 0.12 * slope) : rgba('#1a0a04', -0.28 * slope);
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  // crisp edges so it reads at small size
  for (const v of [-half, half]) {
    ctx.beginPath();
    for (let u = -198; u <= 198; u += 6) {
      const [x, y] = map(u, v);
      if (u === -198) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#1a1418';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
});

// ——— Boss Slayer Supreme ———

function sword(ctx: Ctx, len: number, rand: () => number): void {
  // drawn pointing up the -y axis, hilt at the origin
  const bw = 15;
  // blade: a golden breadstick with a point
  ctx.beginPath();
  ctx.moveTo(-bw, -8);
  ctx.lineTo(-bw, -len + 22);
  ctx.quadraticCurveTo(-bw * 0.6, -len + 6, 0, -len);
  ctx.quadraticCurveTo(bw * 0.6, -len + 6, bw, -len + 22);
  ctx.lineTo(bw, -8);
  ctx.closePath();
  drop(ctx, 0.4, 5, 7);
  const g = ctx.createLinearGradient(-bw, 0, bw, 0);
  g.addColorStop(0, '#f2c470');
  g.addColorStop(0.35, '#d88a32');
  g.addColorStop(1, '#8a4410');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#3a1a08';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // twist scoring of the breadstick, plus salt flakes
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = rgba('#7a3a0c', 0.45);
  ctx.lineWidth = 2.2;
  for (let y = -16; y > -len + 10; y -= 15) {
    ctx.beginPath();
    ctx.moveTo(-bw, y + 6);
    ctx.quadraticCurveTo(0, y + 1, bw, y - 6);
    ctx.stroke();
  }
  ctx.fillStyle = rgba('#fffbe8', 0.95);
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(-bw + 2 + rand() * (bw * 2 - 4), -14 - rand() * (len - 30), 2.2, 1.8);
  }
  ctx.restore();
  // central fuller highlight
  ctx.strokeStyle = rgba('#fff4d0', 0.7);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-3, -14);
  ctx.lineTo(-3, -len + 26);
  ctx.stroke();
  // crossguard: a crusty bar
  roundRect(ctx, -36, -11, 72, 15, 7);
  drop(ctx, 0.35, 3, 4);
  const cg = ctx.createLinearGradient(0, -10, 0, 3);
  cg.addColorStop(0, '#c8843a');
  cg.addColorStop(1, '#7a3e14');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = '#3a1a08';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // grip wrapped in a basil-green band
  roundRect(ctx, -8, 3, 16, 30, 6);
  ctx.fillStyle = '#3a8a2a';
  ctx.fill();
  ctx.strokeStyle = '#1a4a10';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = rgba('#a8e070', 0.6);
  ctx.lineWidth = 1.5;
  for (let y = 9; y < 32; y += 7) {
    ctx.beginPath();
    ctx.moveTo(-6, y);
    ctx.lineTo(6, y - 3);
    ctx.stroke();
  }
  // pepperoni pommel
  ctx.save();
  ctx.translate(0, 44);
  pepperoni(ctx, 14, rand);
  ctx.restore();
}

overlayTopping('crossedSwords', (ctx, rand) => {
  // a glow of victory behind the crossing
  const glow = ctx.createRadialGradient(C, C, 10, C, C, 120);
  glow.addColorStop(0, rgba('#fff0a0', 0.45));
  glow.addColorStop(1, rgba('#fff0a0', 0));
  ctx.fillStyle = glow;
  ellipse(ctx, C, C, 120, 120);
  ctx.fill();
  const len = 190;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(C, C + 4);
    ctx.scale(1, TALL * 0.9);
    ctx.rotate(side * 0.68);
    ctx.translate(0, len * 0.5 - 22);
    sword(ctx, len, rand);
    ctx.restore();
  }
});

// ——— Century Crust ———

overlayTopping('hundred', (ctx, rand) => {
  // "100" spelled in pepperoni rounds laid on a ribbon of melted mozzarella, so it reads on the red
  const cy = C + 4;
  const sy = TALL * 0.86;
  const dots: [number, number][] = [];
  const paths: [number, number][][] = [];
  // the 1: a stem and a flag
  const one: [number, number][] = [];
  for (let i = 0; i < 5; i++) one.push([-88, -58 + i * 29]);
  paths.push([[-110, -36], [-88, -58], [-88, 58]]);
  dots.push(...one, [-109, -37]);
  // the two 0s
  for (const ox of [-10, 70]) {
    const ring: [number, number][] = [];
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      ring.push([ox + Math.cos(a) * 29, Math.sin(a) * 58]);
    }
    dots.push(...ring);
    paths.push([...ring, ring[0]]);
  }
  const toXY = ([x, y]: [number, number]): [number, number] => [C + x, cy + y * sy];
  // mozzarella ribbon under the numbers
  const trace = (p: [number, number][], dx = 0, dy = 0) => {
    ctx.beginPath();
    p.forEach((q, i) => {
      const [x, y] = toXY(q);
      if (i === 0) ctx.moveTo(x + dx, y + dy);
      else ctx.lineTo(x + dx, y + dy);
    });
  };
  for (const p of paths) {
    trace(p, 3, 5);
    ctx.strokeStyle = rgba('#3a1004', 0.4);
    ctx.lineWidth = 44;
    ctx.stroke();
  }
  for (const p of paths) {
    trace(p);
    ctx.strokeStyle = '#6a3a10';
    ctx.lineWidth = 44;
    ctx.stroke();
  }
  for (const p of paths) {
    trace(p);
    ctx.strokeStyle = '#fbefc4';
    ctx.lineWidth = 38;
    ctx.stroke();
    trace(p, -3, -3);
    ctx.strokeStyle = rgba('#ffffff', 0.55);
    ctx.lineWidth = 8;
    ctx.stroke();
  }
  for (const d of dots) {
    const [x, y] = toXY(d);
    at(ctx, x, y, rand() * 6, () => pepperoni(ctx, 12, rand));
  }
});

// ——— Perfect Pie ———

overlayTopping('perfectRing', (ctx) => {
  // every slice identical: three dead-true rings, then one basil leaf in the bullseye
  const rings: [number, number, number][] = [[46, 6, 0], [90, 12, Math.PI / 12], [132, 18, 0]];
  // a faint guide of oil showing how true the rings are
  for (const [rad] of rings) {
    ctx.strokeStyle = rgba('#ffcf6a', 0.25);
    ctx.lineWidth = 3;
    ellipse(ctx, C, C, rad, rad);
    ctx.stroke();
  }
  for (const [rad, n, off] of rings) {
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      // fixed seed per round so every slice is the same: perfection
      let s = 7;
      const same = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      at(ctx, C + Math.cos(a) * rad, C + Math.sin(a) * rad, 0, () => pepperoni(ctx, 18, same));
    }
  }
  at(ctx, C - 2, C + 2, -0.5 + Math.PI * 0.5, () => leaf(ctx, 17, '#3a9a30', 0.95));
  at(ctx, C, C, -0.5, () => leaf(ctx, 26, '#2f8a2a', 0.95));
  sparkle(ctx, C + 20, C - 24, 9, '#ffffff', 0.85);
});

// ——— Inferno Calzone ———

function calzoneClip(ctx: Ctx, r: number): void {
  ctx.beginPath();
  ctx.moveTo(C + r, CALZONE_CY);
  ctx.arc(C, CALZONE_CY, r, 0, Math.PI);
  ctx.quadraticCurveTo(C, CALZONE_CY - r * 0.22, C + r, CALZONE_CY);
  ctx.closePath();
}

overlayTopping('infernoCracks', (ctx, rand) => {
  const R = PIZZA_R;
  const inside = (x: number, y: number) => y > CALZONE_CY + 6 && (x - C) ** 2 + (y - CALZONE_CY) ** 2 < (R - 26) ** 2;
  const pick = (): [number, number] => {
    for (;;) {
      const x = C + (rand() * 2 - 1) * (R - 30);
      const y = CALZONE_CY + 8 + rand() * (R - 30);
      if (inside(x, y)) return [x, y];
    }
  };
  ctx.save();
  calzoneClip(ctx, R);
  ctx.clip();
  // scorched, smouldering crust: a deep red-black wash that's darker at the rim
  const wash = ctx.createRadialGradient(C, CALZONE_CY + 60, 20, C, CALZONE_CY + 40, R);
  wash.addColorStop(0, rgba('#ff6a1a', 0.25));
  wash.addColorStop(0.6, rgba('#5a1406', 0.35));
  wash.addColorStop(1, rgba('#1a0602', 0.7));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
  // charred patches
  for (let i = 0; i < 16; i++) {
    const [x, y] = pick();
    blob(ctx, x, y, 7 + rand() * 13, 0.7, rand, 8);
    ctx.fillStyle = rgba('#1a0804', 0.45 + rand() * 0.3);
    ctx.fill();
  }
  // molten cracks: jagged branching lines from a few hot spots
  const cracks: [number, number][][] = [];
  const grow = (x: number, y: number, a: number, len: number, depth: number) => {
    const pts: [number, number][] = [[x, y]];
    let cx = x;
    let cy = y;
    for (let s = 0; s < len; s++) {
      a += (rand() - 0.5) * 1.1;
      cx += Math.cos(a) * 11;
      cy += Math.sin(a) * 11;
      if (!inside(cx, cy)) break;
      pts.push([cx, cy]);
      if (depth > 0 && rand() < 0.22) grow(cx, cy, a + (rand() < 0.5 ? -1 : 1) * (0.7 + rand() * 0.5), Math.floor(len * 0.5), depth - 1);
    }
    if (pts.length > 1) cracks.push(pts);
  };
  const hot: [number, number][] = [[C - 70, CALZONE_CY + 70], [C, CALZONE_CY + 80], [C + 70, CALZONE_CY + 70], [C - 20, CALZONE_CY + 135]];
  for (const [hx, hy] of hot) {
    for (let k = 0; k < 3; k++) grow(hx, hy, rand() * Math.PI * 2, 9 + Math.floor(rand() * 5), 2);
  }
  const strokeAll = (col: string, w: number, blur = 0) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.shadowColor = blur ? '#ff5a00' : 'transparent';
    ctx.shadowBlur = blur;
    for (const p of cracks) {
      ctx.beginPath();
      ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  };
  strokeAll('#1a0602', 9);
  strokeAll(rgba('#ff4a08', 0.9), 6, 14);
  strokeAll('#ffb21a', 3);
  strokeAll('#fff4b0', 1.2);
  // glowing pools at the hot spots (over the vents)
  for (const [hx, hy] of hot) {
    const g = ctx.createRadialGradient(hx, hy, 2, hx, hy, 26);
    g.addColorStop(0, rgba('#fff2a0', 0.95));
    g.addColorStop(0.4, rgba('#ff8a1a', 0.7));
    g.addColorStop(1, rgba('#ff3a00', 0));
    ctx.fillStyle = g;
    ellipse(ctx, hx, hy, 26, 20);
    ctx.fill();
  }
  // chilli flakes
  for (let i = 0; i < 46; i++) {
    const [x, y] = pick();
    ctx.fillStyle = i % 3 ? '#d8260e' : '#ff8a1a';
    ellipse(ctx, x, y, 2 + rand() * 2.2, 1.2 + rand(), rand() * 3);
    ctx.fill();
  }
  // little flames licking up off the crimped rim
  for (let i = 0; i < 11; i++) {
    const a = 0.16 + (i / 10) * (Math.PI - 0.32);
    const x = C + Math.cos(a) * (R - 6);
    const y = CALZONE_CY + Math.sin(a) * (R - 6);
    const h = 30 + rand() * 16;
    at(ctx, x, y, a - Math.PI / 2 + (rand() - 0.5) * 0.3, () => {
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.quadraticCurveTo(-11, -h * 0.6, 0, -h);
      ctx.quadraticCurveTo(11, -h * 0.6, 10, 0);
      ctx.closePath();
      ctx.fillStyle = rgba('#ff6a12', 0.85);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.quadraticCurveTo(-6, -h * 0.4, 0, -h * 0.62);
      ctx.quadraticCurveTo(6, -h * 0.4, 5, 0);
      ctx.closePath();
      ctx.fillStyle = '#ffd84a';
      ctx.fill();
    });
  }
  ctx.restore();
  // embers drifting over it
  for (let i = 0; i < 14; i++) {
    const [x, y] = pick();
    ctx.fillStyle = rgba('#ffe27a', 0.9);
    ctx.shadowColor = '#ff7a10';
    ctx.shadowBlur = 6;
    ellipse(ctx, x, y - 10, 1.6, 1.6);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
});

// ——— Golden Anniversary & Royal Wedding ———

piece('pearl', 1.2, {
  count: 14,
  minDist: 26,
  draw(ctx, rand) {
    const one = (x: number, y: number, r: number) => {
      ellipse(ctx, x, y, r, r);
      drop(ctx, 0.3, 1.5, 2);
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 0.5, x, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.45, '#f4eef4');
      g.addColorStop(0.8, '#d8cce0');
      g.addColorStop(1, '#b8acc8');
      ctx.fillStyle = g;
      ctx.fill();
      // iridescent rim: pink one side, blue the other
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rgba('#ffb8d8', 0.7);
      ctx.beginPath();
      ctx.arc(x, y, r - 1, 0.2, 1.8);
      ctx.stroke();
      ctx.strokeStyle = rgba('#a8d8ff', 0.7);
      ctx.beginPath();
      ctx.arc(x, y, r - 1, 1.9, 3.3);
      ctx.stroke();
      ctx.strokeStyle = '#8a7c98';
      ctx.lineWidth = 1;
      ellipse(ctx, x, y, r, r);
      ctx.stroke();
      ellipse(ctx, x - r * 0.35, y - r * 0.38, r * 0.3, r * 0.2, -0.6);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };
    if (rand() < 0.4) {
      one(-6, 0, 6.5);
      one(6, 1, 6.5);
    } else one(0, 0, 7.5);
  },
});

overlayTopping('anniv25', (ctx, rand) => {
  const cy = C - 6;
  // warm golden glow behind the number
  const glow = ctx.createRadialGradient(C, cy, 10, C, cy, 130);
  glow.addColorStop(0, rgba('#ffe08a', 0.55));
  glow.addColorStop(1, rgba('#ffe08a', 0));
  ctx.fillStyle = glow;
  ellipse(ctx, C, cy, 130, 130);
  ctx.fill();
  ctx.save();
  ctx.translate(C, cy);
  ctx.scale(1, TALL * 0.9);
  ctx.font = 'bold 150px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // shadow, dark gold outline, gold leaf body, bright bevel
  ctx.fillStyle = rgba('#3a2004', 0.4);
  ctx.fillText('25', 4, 6);
  ctx.strokeStyle = '#6a4204';
  ctx.lineWidth = 9;
  ctx.strokeText('25', 0, 0);
  ctx.fillStyle = gold(ctx, -60, -50, 60, 50);
  ctx.fillText('25', 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  // gold leaf crinkles over the digits only
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = rgba(rand() < 0.5 ? '#fff6c0' : '#b07808', 0.45);
    blob(ctx, (rand() - 0.5) * 140, (rand() - 0.5) * 100, 3 + rand() * 6, 0.8, rand, 6);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = rgba('#fff8d0', 0.75);
  ctx.lineWidth = 2;
  ctx.strokeText('25', -1.5, -1.5);
  ctx.restore();
  // a small burgundy ribbon banner under the number
  const by = cy + 84;
  const bw = 92;
  const tail = (dir: number) => {
    ctx.beginPath();
    ctx.moveTo(C + dir * (bw - 8), by - 8);
    ctx.lineTo(C + dir * (bw + 22), by - 6);
    ctx.lineTo(C + dir * (bw + 12), by + 6);
    ctx.lineTo(C + dir * (bw + 24), by + 18);
    ctx.lineTo(C + dir * (bw - 8), by + 16);
    ctx.closePath();
    ctx.fillStyle = '#7a1428';
    ctx.fill();
    ctx.strokeStyle = '#3a0610';
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  tail(-1);
  tail(1);
  ctx.beginPath();
  ctx.moveTo(C - bw, by - 12);
  ctx.quadraticCurveTo(C, by - 22, C + bw, by - 12);
  ctx.lineTo(C + bw, by + 10);
  ctx.quadraticCurveTo(C, by, C - bw, by + 10);
  ctx.closePath();
  drop(ctx, 0.35, 3, 4);
  const rg = ctx.createLinearGradient(0, by - 18, 0, by + 10);
  rg.addColorStop(0, '#d83a5a');
  rg.addColorStop(1, '#8a1430');
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.strokeStyle = '#4a0818';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // gold trim along the banner
  ctx.strokeStyle = '#f7c83a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(C - bw + 4, by - 8);
  ctx.quadraticCurveTo(C, by - 17, C + bw - 4, by - 8);
  ctx.moveTo(C - bw + 4, by + 6);
  ctx.quadraticCurveTo(C, by - 3, C + bw - 4, by + 6);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    sparkle(ctx, C + (rand() - 0.5) * 220, cy + (rand() - 0.5) * 170, 6 + rand() * 5, '#fffbe0');
  }
});

// ——— Peel Collector ———

piece('miniPeel', 1.6, {
  count: 6,
  minDist: 46,
  draw(ctx, rand) {
    const wood = ['#d8a868', '#c08a4a', '#e2b878'][Math.floor(rand() * 3)];
    // handle
    roundRect(ctx, -3.5, 6, 7, 26, 3);
    drop(ctx, 0.35);
    ctx.fillStyle = shade(wood, -0.08);
    ctx.fill();
    ctx.strokeStyle = shade(wood, -0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ellipse(ctx, 0, 28, 1.6, 1.6);
    ctx.fillStyle = shade(wood, -0.55);
    ctx.fill();
    // paddle blade
    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(-13, 2);
    ctx.quadraticCurveTo(-16, -22, 0, -24);
    ctx.quadraticCurveTo(16, -22, 13, 2);
    ctx.lineTo(4, 8);
    ctx.closePath();
    drop(ctx, 0.35);
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, shade(wood, 0.25));
    g.addColorStop(1, shade(wood, -0.2));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade(wood, -0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
    // grain
    ctx.strokeStyle = rgba(shade(wood, -0.45), 0.45);
    ctx.lineWidth = 0.9;
    for (const gx of [-7, -2, 4, 9]) {
      ctx.beginPath();
      ctx.moveTo(gx, -20);
      ctx.quadraticCurveTo(gx + 1.5, -8, gx * 0.6, 4);
      ctx.stroke();
    }
    // a tiny pizza riding on the peel
    ellipse(ctx, 0, -10, 8, 8);
    ctx.fillStyle = '#e8b058';
    ctx.fill();
    ctx.strokeStyle = '#8a5020';
    ctx.lineWidth = 1;
    ctx.stroke();
    ellipse(ctx, 0, -10, 6, 6);
    ctx.fillStyle = '#d8402a';
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    blob(ctx, -1, -11, 3.5, 0.6, rand, 6);
    ctx.fill();
    ellipse(ctx, 2.5, -8, 1.4, 1.4);
    ctx.fillStyle = '#9a1a0a';
    ctx.fill();
    shine(ctx, -7, -16, 3, 1.4, 0.45);
  },
});

// ——— Combo King ———

overlayTopping('crown', (ctx, rand) => {
  const cy = C - 4;
  ctx.save();
  ctx.translate(C, cy);
  ctx.scale(1, TALL);
  const w = 84;
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(-w, 34);
    ctx.lineTo(-w, -6);
    ctx.lineTo(-w - 6, -40);
    ctx.lineTo(-w * 0.5, -12);
    ctx.lineTo(-w * 0.28, -48);
    ctx.lineTo(0, -16);
    ctx.lineTo(w * 0.28, -48);
    ctx.lineTo(w * 0.5, -12);
    ctx.lineTo(w + 6, -40);
    ctx.lineTo(w, -6);
    ctx.lineTo(w, 34);
    ctx.quadraticCurveTo(0, 42, -w, 34);
    ctx.closePath();
  };
  // royal glow
  const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
  glow.addColorStop(0, rgba('#fff2a0', 0.5));
  glow.addColorStop(1, rgba('#fff2a0', 0));
  ctx.fillStyle = glow;
  ellipse(ctx, 0, 0, 120, 80);
  ctx.fill();
  outline();
  drop(ctx, 0.4, 5, 6);
  // yellow pepper flesh
  const g = ctx.createLinearGradient(-w, -40, w, 40);
  g.addColorStop(0, '#fff07a');
  g.addColorStop(0.4, '#ffd21a');
  g.addColorStop(0.75, '#f0a808');
  g.addColorStop(1, '#c88000');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#6a4600';
  ctx.lineWidth = 4;
  ctx.stroke();
  // the band
  ctx.beginPath();
  ctx.moveTo(-w, 8);
  ctx.quadraticCurveTo(0, 14, w, 8);
  ctx.moveTo(-w, 26);
  ctx.quadraticCurveTo(0, 33, w, 26);
  ctx.strokeStyle = '#8a5a00';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // glossy pepper-skin streaks
  ctx.strokeStyle = rgba('#ffffff', 0.6);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w + 8, 0);
  ctx.lineTo(-w + 8, 28);
  ctx.moveTo(-w * 0.32, -36);
  ctx.lineTo(-w * 0.2, -16);
  ctx.stroke();
  // olive balls on the points
  for (const [px, py] of [[-w - 6, -40], [-w * 0.28, -48], [w * 0.28, -48], [w + 6, -40]]) {
    ellipse(ctx, px, py - 4, 8, 7);
    ctx.fillStyle = '#2a2430';
    ctx.fill();
    ctx.strokeStyle = '#0a080c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ellipse(ctx, px, py - 4, 3, 2.6);
    ctx.fillStyle = '#5a3a2a';
    ctx.fill();
    shine(ctx, px - 3, py - 7, 2.4, 1.2, 0.7);
  }
  // jewels in the band: tomato rubies and olive onyx
  const jewels: [number, string][] = [[-56, '#d8261a'], [-28, '#2a2430'], [0, '#e8301e'], [28, '#2a2430'], [56, '#d8261a']];
  for (const [jx, col] of jewels) {
    const r = jx === 0 ? 10 : 7.5;
    ellipse(ctx, jx, 18, r, r * 0.9);
    const jg = ctx.createRadialGradient(jx - 2, 15, 1, jx, 18, r);
    jg.addColorStop(0, shade(col, 0.4));
    jg.addColorStop(1, shade(col, -0.3));
    ctx.fillStyle = jg;
    ctx.fill();
    ctx.strokeStyle = shade(col, -0.6);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    shine(ctx, jx - r * 0.35, 18 - r * 0.4, r * 0.35, r * 0.18, 0.8);
  }
  ctx.restore();
  for (let i = 0; i < 4; i++) sparkle(ctx, C + (rand() - 0.5) * 200, cy - 40 + (rand() - 0.5) * 120, 7 + rand() * 4, '#ffffff');
});

// ——— Untouchable ———

overlayTopping('halo', (ctx, rand) => {
  // holy light over a pristine pie
  const light = ctx.createRadialGradient(C, C - 20, 10, C, C, 160);
  light.addColorStop(0, rgba('#fffbe0', 0.45));
  light.addColorStop(0.7, rgba('#ffe8a0', 0.15));
  light.addColorStop(1, rgba('#ffe8a0', 0));
  ctx.fillStyle = light;
  ellipse(ctx, C, C, 165, 165);
  ctx.fill();
  const hx = C;
  const hy = C - 34;
  const r = 98;
  // the halo's soft shadow on the pizza below it
  ctx.save();
  ctx.filter = 'blur(5px)';
  ctx.strokeStyle = rgba('#6a4a10', 0.4);
  ctx.lineWidth = 18;
  ellipse(ctx, hx + 6, hy + 54, r, r * 0.95);
  ctx.stroke();
  ctx.restore();
  // glow, gold body, dark gold edges and a bright inner line
  ctx.save();
  ctx.shadowColor = '#fff0a0';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = rgba('#fff4b0', 0.7);
  ctx.lineWidth = 26;
  ellipse(ctx, hx, hy, r, r);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#6a4602';
  ctx.lineWidth = 23;
  ellipse(ctx, hx, hy, r, r);
  ctx.stroke();
  ctx.strokeStyle = gold(ctx, hx - r, hy - r, hx + r, hy + r);
  ctx.lineWidth = 17;
  ellipse(ctx, hx, hy, r, r);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.75);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hx, hy, r - 2, Math.PI * 1.05, Math.PI * 1.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hx, hy, r + 2, Math.PI * 0.15, Math.PI * 0.45);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2;
    sparkle(ctx, hx + Math.cos(a) * (r + 4), hy + Math.sin(a) * (r + 4), 6 + rand() * 6, '#ffffff', 0.95);
  }
});

// ——— Speed Slice ———

overlayTopping('lightning', (ctx, rand) => {
  // the bolt runs mostly top-to-bottom so the table tilt doesn't flatten it
  const bolt: [number, number][] = [
    [252, 48], [180, 168], [222, 172], [150, 268], [190, 270], [128, 362],
    [262, 236], [216, 232], [282, 140], [238, 138], [300, 48],
  ];
  // speed streaks trailing off to the right
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const y = 90 + i * 38 + (rand() - 0.5) * 10;
    const x0 = 250 + (i % 2) * 14 - Math.abs(i - 3) * 6;
    const len = 50 + rand() * 40;
    const reach = Math.sqrt(Math.max(0, 150 ** 2 - (y - C) ** 2)) + C;
    const x1 = Math.min(reach - 4, x0 + len);
    if (x1 - x0 < 16) continue;
    ctx.strokeStyle = rgba('#fff6d8', 0.8);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffd21a', 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 + 6, y + 6);
    ctx.lineTo(x1 - 10, y + 6);
    ctx.stroke();
  }
  const trace = (dx = 0, dy = 0) => {
    ctx.beginPath();
    bolt.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
    ctx.closePath();
  };
  ctx.save();
  ctx.shadowColor = '#fff27a';
  ctx.shadowBlur = 22;
  trace();
  ctx.fillStyle = rgba('#fff8a0', 0.7);
  ctx.fill();
  ctx.restore();
  trace(5, 7);
  ctx.fillStyle = rgba('#2a0e04', 0.35);
  ctx.fill();
  trace();
  const g = ctx.createLinearGradient(140, 60, 290, 340);
  g.addColorStop(0, '#fff27a');
  g.addColorStop(0.5, '#ffd21a');
  g.addColorStop(1, '#f0a400');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#6a4600';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  // pepper flesh: lighter inner rim and a gloss line
  ctx.save();
  trace();
  ctx.clip();
  trace(4, 4);
  ctx.strokeStyle = rgba('#fff8c0', 0.6);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba('#ffffff', 0.8);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(245, 64);
  ctx.lineTo(198, 146);
  ctx.moveTo(206, 186);
  ctx.lineTo(176, 230);
  ctx.stroke();
});

// ——— Night Shift ———

overlayTopping('moonStars', (ctx, rand) => {
  // wash the cheese back into the night so it reads as wisps of cloud, not a pizza of moons
  const sky = ctx.createRadialGradient(C, C, 20, C, C, 156);
  sky.addColorStop(0, rgba('#1c1a2e', 0.62));
  sky.addColorStop(0.85, rgba('#1c1a2e', 0.7));
  sky.addColorStop(1, rgba('#1c1a2e', 0));
  ctx.fillStyle = sky;
  ellipse(ctx, C, C, 156, 156);
  ctx.fill();
  // twinkling specks first, so the moon and stars sit over them
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 140;
    ctx.fillStyle = rgba('#ffffff', 0.4 + rand() * 0.5);
    ellipse(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 0.9 + rand() * 1.1, 0.9 + rand() * 1.1);
    ctx.fill();
  }
  // crescent moon of mozzarella, upper left
  const mx = C - 44;
  const my = C - 14;
  const R = 62;
  const th = -0.75; // the bite faces the upper right
  const d = 36;
  const r2 = 58;
  const a = (R * R - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(R * R - a * a);
  const al = Math.atan2(h, a);
  const be = Math.atan2(h, d - a);
  const ix = mx + Math.cos(th) * d;
  const iy = my + Math.sin(th) * d;
  const crescent = (ox = 0, oy = 0) => {
    ctx.beginPath();
    ctx.arc(mx + ox, my + oy, R, th + al, th + Math.PI * 2 - al, false);
    ctx.arc(ix + ox, iy + oy, r2, th + Math.PI + be, th + Math.PI - be, true);
    ctx.closePath();
  };
  // stretched so the table tilt leaves a round moon, not a squashed one
  ctx.save();
  ctx.translate(mx, my);
  ctx.scale(1, 1.4);
  ctx.translate(-mx, -my);
  ctx.save();
  ctx.shadowColor = rgba('#fff6c8', 0.9);
  ctx.shadowBlur = 28;
  crescent();
  ctx.fillStyle = '#fff4d0';
  ctx.fill();
  ctx.restore();
  crescent(4, 6);
  ctx.fillStyle = rgba('#000000', 0.35);
  ctx.fill();
  crescent();
  const g = ctx.createRadialGradient(mx - 30, my + 10, 6, mx, my, R);
  g.addColorStop(0, '#fffbe8');
  g.addColorStop(0.7, '#f6e6b4');
  g.addColorStop(1, '#d8c088');
  ctx.fillStyle = g;
  ctx.fill();
  // melted-mozzarella texture: soft browned blisters
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 9; i++) {
    const aa = th + Math.PI + (rand() - 0.5) * 2.2;
    const dd = R * (0.55 + rand() * 0.35);
    ctx.fillStyle = rgba('#c8a060', 0.35);
    blob(ctx, mx + Math.cos(aa) * dd, my + Math.sin(aa) * dd, 3 + rand() * 4, 0.6, rand, 6);
    ctx.fill();
  }
  ctx.restore();
  crescent();
  ctx.strokeStyle = '#6a5428';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.7);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(mx, my, R - 7, th + Math.PI * 0.55, th + Math.PI * 0.95);
  ctx.stroke();
  ctx.restore();
  // cheese stars
  const stars = spread(8, 54, rand, (x, y) => (x - mx) ** 2 + ((y - my) / 1.4) ** 2 > (R + 22) ** 2, 128);
  for (const [sx, sy] of stars) {
    const r = 13 + rand() * 7;
    at(ctx, sx, sy, (rand() - 0.5) * 0.6, () => {
      ctx.save();
      ctx.shadowColor = '#fff2a0';
      ctx.shadowBlur = 12;
      starPath(ctx, r, 0.48);
      ctx.fillStyle = '#ffe98a';
      ctx.fill();
      ctx.restore();
      starPath(ctx, r, 0.48);
      const sg = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 1, 0, 0, r);
      sg.addColorStop(0, '#fffbe0');
      sg.addColorStop(1, '#f2c84a');
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = '#8a6a10';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      shine(ctx, -r * 0.2, -r * 0.3, r * 0.22, r * 0.12, 0.8);
    });
  }
  for (let i = 0; i < 6; i++) {
    const aa = rand() * Math.PI * 2;
    const dd = 40 + rand() * 100;
    sparkle(ctx, C + Math.cos(aa) * dd, C + Math.sin(aa) * dd, 4 + rand() * 3, '#ffffff', 0.85);
  }
});

// ——— Ragnarök Roast ———

overlayTopping('fireIce', (ctx, rand) => {
  // a jagged seam from top to bottom; fire to the left, ice to the right
  const seam: [number, number][] = [];
  for (let y = C - PIZZA_R - 4, k = 0; y <= C + PIZZA_R + 4; y += 22, k++) seam.push([C + (k % 2 ? 14 : -14) + (rand() - 0.5) * 8, y]);
  const half = (side: -1 | 1) => {
    ctx.beginPath();
    ctx.moveTo(seam[0][0], seam[0][1]);
    for (const [x, y] of seam) ctx.lineTo(x, y);
    ctx.lineTo(C + side * 220, C + 220);
    ctx.lineTo(C + side * 220, C - 220);
    ctx.closePath();
  };
  ctx.save();
  ellipse(ctx, C, C, PIZZA_R, PIZZA_R);
  ctx.clip();
  // ——— fire half ———
  ctx.save();
  half(-1);
  ctx.clip();
  const fire = ctx.createLinearGradient(C - PIZZA_R, 0, C, 0);
  fire.addColorStop(0, rgba('#3a0802', 0.55));
  fire.addColorStop(0.5, rgba('#ff5a0a', 0.25));
  fire.addColorStop(1, rgba('#ffb020', 0.18));
  ctx.fillStyle = fire;
  ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
  for (let i = 0; i < 18; i++) {
    const a = Math.PI * 0.5 + rand() * Math.PI;
    const d = 40 + rand() * 140;
    blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 5 + rand() * 10, 0.7, rand, 7);
    ctx.fillStyle = rgba('#1a0602', 0.35 + rand() * 0.3);
    ctx.fill();
  }
  // flames licking in from the rim
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * 0.6 + (i / 10) * Math.PI * 0.8;
    const x = C + Math.cos(a) * (PIZZA_R - 4);
    const y = C + Math.sin(a) * (PIZZA_R - 4);
    const h = 34 + rand() * 26;
    at(ctx, x, y, a - Math.PI / 2 + (rand() - 0.5) * 0.3, () => {
      for (const [w, hh, col] of [[13, 1, rgba('#e8380a', 0.9)], [9, 0.72, '#ff8a1a'], [5, 0.45, '#ffe066']] as [number, number, string][]) {
        ctx.beginPath();
        ctx.moveTo(-w, 0);
        ctx.quadraticCurveTo(-w * 1.1, h * hh * 0.55, w * 0.3, h * hh);
        ctx.quadraticCurveTo(w * 0.2, h * hh * 0.5, w, 0);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
      }
    });
  }
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * 0.5 + rand() * Math.PI;
    const d = rand() * 150;
    ctx.fillStyle = rgba(rand() < 0.5 ? '#ffd04a' : '#ff7a1a', 0.95);
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 8;
    ellipse(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 1.5 + rand() * 1.8, 1.5 + rand() * 1.8);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
  // ——— ice half ———
  ctx.save();
  half(1);
  ctx.clip();
  const ice = ctx.createLinearGradient(C, 0, C + PIZZA_R, 0);
  ice.addColorStop(0, rgba('#c8f0ff', 0.35));
  ice.addColorStop(1, rgba('#6ab8ff', 0.55));
  ctx.fillStyle = ice;
  ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
  // frosted rim
  ctx.strokeStyle = rgba('#f4fcff', 0.75);
  ctx.lineWidth = 16;
  ellipse(ctx, C, C, PIZZA_R - 8, PIZZA_R - 8);
  ctx.stroke();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI * 0.4 + (i / 9) * Math.PI * 0.8;
    const x = C + Math.cos(a) * (PIZZA_R - 14);
    const y = C + Math.sin(a) * (PIZZA_R - 14);
    // icicles hanging inwards
    at(ctx, x, y, a + Math.PI / 2, () => {
      const h = 14 + rand() * 14;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(0, h);
      ctx.lineTo(5, 0);
      ctx.closePath();
      ctx.fillStyle = rgba('#e8f8ff', 0.9);
      ctx.fill();
      ctx.strokeStyle = rgba('#5a9ad8', 0.8);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
  }
  // frost speckle
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI * 0.5 + rand() * Math.PI;
    const d = rand() * 170;
    ctx.fillStyle = rgba('#ffffff', 0.5 + rand() * 0.4);
    ellipse(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 1 + rand() * 1.6, 1 + rand() * 1.4);
    ctx.fill();
  }
  // snowflake crystals
  const flakes = spread(6, 46, rand, (x) => x > C + 22, 140);
  for (const [fx, fy] of flakes) {
    const r = 9 + rand() * 6;
    at(ctx, fx, fy, rand(), () => {
      for (const [col, w] of [['#3a7ac8', 4.5], ['#ffffff', 2.2]] as [string, number][]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const aa = (k / 6) * Math.PI * 2;
          const ex = Math.cos(aa) * r;
          const ey = Math.sin(aa) * r;
          ctx.moveTo(0, 0);
          ctx.lineTo(ex, ey);
          const bx = Math.cos(aa) * r * 0.55;
          const by = Math.sin(aa) * r * 0.55;
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(aa + 0.8) * r * 0.35, by + Math.sin(aa + 0.8) * r * 0.35);
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(aa - 0.8) * r * 0.35, by + Math.sin(aa - 0.8) * r * 0.35);
        }
        ctx.stroke();
      }
    });
  }
  ctx.fillStyle = rgba('#ffffff', 0.35);
  ellipse(ctx, C + 70, C - 60, 40, 12, -0.6);
  ctx.fill();
  ctx.restore();
  // the seam: a dark crack with a molten edge on one side and a frost edge on the other
  const traceSeam = (dx: number) => {
    ctx.beginPath();
    seam.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y)));
  };
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ff6a00';
  traceSeam(-4);
  ctx.strokeStyle = '#ffb020';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.shadowColor = '#8ad8ff';
  traceSeam(4);
  ctx.strokeStyle = '#d8f4ff';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  traceSeam(0);
  ctx.strokeStyle = '#1a0c10';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
});

// ——— Olympian Feast ———

overlayTopping('laurel', (ctx, rand) => {
  // two laurel branches rising from a gold tie at the bottom, almost meeting at the top
  const R = 136;
  const col = '#6f8f2a';
  for (const side of [-1, 1]) {
    const a0 = Math.PI / 2 + side * 0.16;
    const a1 = Math.PI / 2 + side * (Math.PI - 0.2);
    // the stem
    ctx.strokeStyle = shade(col, -0.35);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(C, C, R, a0, a1, side < 0);
    ctx.stroke();
    const n = 15;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const a = a0 + (a1 - a0) * t;
      const x = C + Math.cos(a) * R;
      const y = C + Math.sin(a) * R;
      const tang = a + side * (Math.PI / 2);
      const len = 15 - t * 4 + rand() * 2;
      for (const out of [1, -1]) {
        // leaves point along the branch, angled out and in
        const ang = tang - side * out * 0.55;
        const off = out * 5;
        at(ctx, x + Math.cos(a) * off, y + Math.sin(a) * off, ang, () => {
          ctx.translate(len * 0.8, 0);
          leaf(ctx, len, out > 0 ? col : shade(col, -0.08), 0.6);
        });
      }
    }
    // a berry or two
    for (let i = 0; i < 3; i++) {
      const a = a0 + (a1 - a0) * (0.2 + i * 0.28);
      ellipse(ctx, C + Math.cos(a) * (R - 12), C + Math.sin(a) * (R - 12), 4, 4);
      ctx.fillStyle = '#3a2a4a';
      ctx.fill();
      shine(ctx, C + Math.cos(a) * (R - 12) - 1.2, C + Math.sin(a) * (R - 12) - 1.4, 1.4, 0.8, 0.8);
    }
  }
  // gold ribbon tie at the bottom
  const tx = C;
  const ty = C + R;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + s * 10, ty + 18, tx + s * 18, ty + 24);
    ctx.lineTo(tx + s * 8, ty + 26);
    ctx.quadraticCurveTo(tx + s * 4, ty + 14, tx, ty);
    ctx.fillStyle = '#e8b22a';
    ctx.fill();
    ctx.strokeStyle = '#7a5004';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ellipse(ctx, tx + s * 9, ty - 1, 10, 6, s * 0.3);
    ctx.fillStyle = gold(ctx, tx - 20, ty - 8, tx + 20, ty + 6);
    ctx.fill();
    ctx.stroke();
  }
  ellipse(ctx, tx, ty, 5, 5);
  ctx.fillStyle = '#f7c83a';
  ctx.fill();
  ctx.stroke();
});

piece('grape', 1.25, {
  count: 9,
  minDist: 36,
  draw(ctx, rand) {
    const green = rand() < 0.4;
    const base = green ? '#9ac83a' : '#7a3a8a';
    const one = (x: number, y: number, r: number) => {
      ellipse(ctx, x, y, r, r * 0.9);
      drop(ctx, 0.3, 1.5, 2);
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0.5, x, y, r);
      g.addColorStop(0, shade(base, 0.45));
      g.addColorStop(0.6, base);
      g.addColorStop(1, shade(base, -0.4));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = shade(base, -0.5);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // the dusty bloom and a hard highlight
      ellipse(ctx, x + r * 0.2, y + r * 0.2, r * 0.5, r * 0.4);
      ctx.fillStyle = rgba('#e8e0f0', green ? 0.12 : 0.18);
      ctx.fill();
      shine(ctx, x - r * 0.35, y - r * 0.38, r * 0.3, r * 0.16, 0.8);
    };
    one(-5, 3, 6.5);
    one(5, 3, 6.5);
    one(0, -5, 6.5);
    // stem stub
    ctx.strokeStyle = '#6a4a20';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(2, -15);
    ctx.stroke();
  },
});

// ——— Royal Wedding ———

function rosePetalShape(ctx: Ctx, len: number, rand: () => number): void {
  // a rounded heart-topped petal pointing up the -y axis
  const w = len * 0.75;
  ctx.beginPath();
  ctx.moveTo(0, len * 0.5);
  ctx.bezierCurveTo(-w, len * 0.2, -w, -len * 0.55, -w * 0.15, -len * 0.5);
  ctx.quadraticCurveTo(0, -len * 0.38, w * 0.15, -len * 0.5);
  ctx.bezierCurveTo(w, -len * 0.55, w, len * 0.2, 0, len * 0.5);
  ctx.closePath();
  drop(ctx, 0.25, 1.5, 2);
  const base = rand() < 0.5 ? '#f27aa0' : '#ff9ab8';
  const g = ctx.createRadialGradient(0, -len * 0.2, 1, 0, 0, len * 0.7);
  g.addColorStop(0, shade(base, 0.35));
  g.addColorStop(0.7, base);
  g.addColorStop(1, shade(base, -0.25));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(base, -0.45);
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // curled lip and a faint vein
  ctx.strokeStyle = rgba('#ffffff', 0.6);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-w * 0.6, -len * 0.3);
  ctx.quadraticCurveTo(-w * 0.2, -len * 0.48, -w * 0.05, -len * 0.42);
  ctx.stroke();
  ctx.strokeStyle = rgba(shade(base, -0.3), 0.5);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, len * 0.35);
  ctx.lineTo(0, -len * 0.15);
  ctx.stroke();
}

function rose(ctx: Ctx, r: number, rand: () => number): void {
  // outer petals in a ring, then a tight spiral bud
  for (let i = 0; i < 6; i++) {
    at(ctx, 0, 0, (i / 6) * Math.PI * 2 + rand() * 0.3, () => {
      ctx.translate(0, -r * 0.55);
      rosePetalShape(ctx, r * 0.95, rand);
    });
  }
  ellipse(ctx, 0, 0, r * 0.5, r * 0.5);
  const g = ctx.createRadialGradient(-r * 0.15, -r * 0.15, 1, 0, 0, r * 0.5);
  g.addColorStop(0, '#ffb0c8');
  g.addColorStop(1, '#d04a78');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#8a1a48';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = '#a82a5a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let t = 0; t < 4 * Math.PI; t += 0.2) {
    const d = r * 0.04 + t * r * 0.033;
    const x = Math.cos(t) * d;
    const y = Math.sin(t) * d;
    if (t === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  shine(ctx, -r * 0.2, -r * 0.25, r * 0.15, r * 0.07, 0.6);
}

overlayTopping('rosePetal', (ctx, rand) => {
  // a wedding cake of a pizza: a piped icing border, a rose bouquet in the middle, petals strewn about
  const ringR = 140;
  const n = 30;
  // a gold piped line just inside the icing border
  ctx.strokeStyle = '#a87a10';
  ctx.lineWidth = 5;
  ellipse(ctx, C, C, ringR - 16, ringR - 16);
  ctx.stroke();
  ctx.strokeStyle = gold(ctx, C - ringR, C - ringR, C + ringR, C + ringR);
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    at(ctx, C + Math.cos(a) * ringR, C + Math.sin(a) * ringR, a + Math.PI / 2, () => {
      // one piped shell
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.quadraticCurveTo(-8, -10, 2, -9);
      ctx.quadraticCurveTo(12, -6, 10, 4);
      ctx.quadraticCurveTo(2, 9, -10, 2);
      ctx.closePath();
      drop(ctx, 0.35, 2, 3);
      const g = ctx.createLinearGradient(0, -10, 0, 8);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#e4d4bc');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#8a7650';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = rgba('#c8b898', 0.8);
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.quadraticCurveTo(0, -5, 6, -3);
      ctx.stroke();
    });
  }
  // strewn petals
  for (const [x, y] of spread(12, 34, rand, (x, y) => (x - C) ** 2 + ((y - C) / 1.3) ** 2 > 70 ** 2, 112)) {
    at(ctx, x, y, rand() * Math.PI * 2, () => rosePetalShape(ctx, 19 + rand() * 4, rand));
  }
  // the bouquet: three roses with a couple of leaves
  for (const [lx, ly, la] of [[C - 48, C + 26, 2.7], [C + 50, C + 24, 0.45], [C - 6, C - 56, -1.7], [C + 30, C + 50, 1.2]] as [number, number, number][]) {
    at(ctx, lx, ly, la, () => leaf(ctx, 20, '#4a8a3a', 0.6));
  }
  for (const [rx, ry, rr] of [[C - 28, C + 14, 28], [C + 30, C + 12, 28], [C, C - 26, 32]] as [number, number, number][]) {
    at(ctx, rx, ry, rand(), () => rose(ctx, rr, rand), 1, 1.3);
  }
});

// ——— Pirate's Treasure ———

piece('doubloon', 1.4, {
  count: 10,
  minDist: 34,
  draw(ctx, rand) {
    const coin = (x: number, y: number) => {
      const r = 12;
      ellipse(ctx, x, y, r, r);
      drop(ctx, 0.4);
      ctx.fillStyle = gold(ctx, x - r, y - r, x + r, y + r);
      ctx.fill();
      ctx.strokeStyle = '#6a4204';
      ctx.lineWidth = 2;
      ctx.stroke();
      // raised rim with beading
      ctx.strokeStyle = rgba('#8a5a08', 0.8);
      ctx.lineWidth = 1.2;
      ellipse(ctx, x, y, r - 3, r - 3);
      ctx.stroke();
      ctx.fillStyle = rgba('#fff4b0', 0.9);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        ellipse(ctx, x + Math.cos(a) * (r - 1.5), y + Math.sin(a) * (r - 1.5), 0.8, 0.8);
        ctx.fill();
      }
      // the stamped cross of a Spanish doubloon
      ctx.strokeStyle = '#8a5a08';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x, y - 5.5);
      ctx.lineTo(x, y + 5.5);
      ctx.moveTo(x - 5.5, y);
      ctx.lineTo(x + 5.5, y);
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff6c0', 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 1, y - 5.5);
      ctx.lineTo(x - 1, y + 5);
      ctx.moveTo(x - 5.5, y - 1);
      ctx.lineTo(x + 5, y - 1);
      ctx.stroke();
      shine(ctx, x - 4.5, y - 5, 4, 1.6, 0.75);
    };
    // sometimes a little stack, the top coin knocked askew
    if (rand() < 0.35) coin(3, 3);
    coin(0, 0);
  },
});

piece('skullMozz', 1.35, {
  count: 4,
  minDist: 70,
  draw(ctx, rand) {
    upright(ctx, (rand() - 0.5) * 0.5);
    const mozz = '#f6ecd0';
    const edge = shade(mozz, -0.45);
    // crossbones of mozzarella behind
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(0, 4);
      ctx.rotate(s * 0.8);
      ctx.rect(-22, -3.5, 44, 7);
      for (const ex of [-22, 22]) {
        ctx.moveTo(ex + 4.2, -3.5);
        ctx.arc(ex, -3.5, 4.2, 0, Math.PI * 2);
        ctx.moveTo(ex + 4.2, 3.5);
        ctx.arc(ex, 3.5, 4.2, 0, Math.PI * 2);
      }
      ctx.restore();
    }
    drop(ctx, 0.3);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = shade(mozz, -0.06);
    ctx.fill();
    // cranium + jaw
    ctx.beginPath();
    ctx.arc(0, -3, 14, Math.PI * 0.82, Math.PI * 2.18);
    ctx.lineTo(7, 14);
    ctx.lineTo(-7, 14);
    ctx.closePath();
    drop(ctx, 0.35);
    const g = ctx.createRadialGradient(-4, -8, 2, 0, 0, 18);
    g.addColorStop(0, '#fffdf2');
    g.addColorStop(0.7, mozz);
    g.addColorStop(1, '#d8c48c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // olive eye sockets
    for (const ex of [-5.5, 5.5]) {
      ellipse(ctx, ex, -2, 4.6, 4.2);
      ctx.fillStyle = '#1e1a22';
      ctx.fill();
      ellipse(ctx, ex, -2, 1.6, 1.4);
      ctx.fillStyle = '#5a4a3a';
      ctx.fill();
    }
    // nose and teeth
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.lineTo(-2, 7);
    ctx.lineTo(2, 7);
    ctx.closePath();
    ctx.fillStyle = '#3a2a20';
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-6, 10.5);
    ctx.lineTo(6, 10.5);
    for (const tx of [-3, 0, 3]) {
      ctx.moveTo(tx, 9);
      ctx.lineTo(tx, 14);
    }
    ctx.stroke();
    // melted cheese browning
    ctx.fillStyle = rgba('#c8984a', 0.4);
    ellipse(ctx, 8, -10, 2.5, 1.6);
    ctx.fill();
    shine(ctx, -6, -11, 4, 1.8, 0.6);
  },
});

// ——— Nonna's Secret ———

overlayTopping('basilHeart', (ctx, rand) => {
  // basil leaves laid round a big heart, like Nonna did it by hand
  const sy = 1.45;
  const s = 5.6;
  const cy = C - 14;
  const pt = (t: number): [number, number] => {
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return [C + x * s, cy + y * s * sy];
  };
  // a blush of love inside the heart
  ctx.beginPath();
  for (let t = 0; t <= Math.PI * 2; t += 0.05) {
    const [x, y] = pt(t);
    if (t === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = rgba('#ff9a8a', 0.3);
  ctx.fill();
  ctx.strokeStyle = rgba('#1a4a10', 0.5);
  ctx.lineWidth = 26;
  ctx.stroke();
  const n = 26;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + 0.06;
    const [x, y] = pt(t);
    const [x2, y2] = pt(t + 0.01);
    const tang = Math.atan2(y2 - y, x2 - x);
    const len = 15 + rand() * 3;
    at(ctx, x, y, tang + (i % 2 ? 0.45 : -0.45), () => leaf(ctx, len, i % 3 ? '#2f8a2a' : '#3a9a32', 0.85));
  }
  // little ricotta dollops inside
  for (const [dx, dy] of [[-30, -18], [28, -16], [0, 20]] as [number, number][]) {
    const x = C + dx;
    const y = cy + dy * sy;
    blob(ctx, x, y, 9 + rand() * 3, 0.5, rand, 8);
    drop(ctx, 0.25, 1.5, 2);
    const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#ece4d2');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#b8ab90';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ellipse(ctx, x + 2, y + 1, 2.5, 1.5);
    ctx.fillStyle = rgba('#c8b898', 0.6);
    ctx.fill();
  }
});

// ——— Four-Leaf Clover ———

piece('clover', 1.3, {
  count: 7,
  minDist: 48,
  draw(ctx) {
    const col = '#5ed83a';
    // stem
    ctx.strokeStyle = shade(col, -0.45);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(6, 12, 3, 20);
    ctx.stroke();
    ctx.strokeStyle = shade(col, -0.1);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      at(ctx, 0, 0, (i / 4) * Math.PI * 2 + Math.PI / 4, () => {
        // a heart-shaped leaflet, its notch pointing outwards
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-12, -2, -13, -15, -5, -16);
        ctx.quadraticCurveTo(-1.5, -16, 0, -12);
        ctx.quadraticCurveTo(1.5, -16, 5, -16);
        ctx.bezierCurveTo(13, -15, 12, -2, 0, 0);
        ctx.closePath();
        drop(ctx, 0.3, 1.5, 2);
        const g = ctx.createRadialGradient(0, -10, 1, 0, -8, 14);
        g.addColorStop(0, shade(col, 0.3));
        g.addColorStop(1, shade(col, -0.25));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = shade(col, -0.55);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        // the pale chevron clovers wear
        ctx.strokeStyle = rgba('#eaffd0', 0.75);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-5, -10);
        ctx.lineTo(0, -6);
        ctx.lineTo(5, -10);
        ctx.stroke();
      });
    }
    ellipse(ctx, 0, 0, 2.2, 2.2);
    ctx.fillStyle = shade(col, -0.35);
    ctx.fill();
    shine(ctx, -6, -6, 3, 1.3, 0.5);
  },
});
