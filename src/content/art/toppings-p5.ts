// Toppings for the pizza plan's first Epic Chef's Specials (src/content/pizzas/p5.ts), each from the boss it's named
// for: the Kraken's tentacles and ink, the Yeti's snowballs and frost, King Honk's cream pies, Sandcastle Sam's
// castles and shells, T-Rex Toes' ribs, Iron Heel's cogs and steamed buns, the Chimney Sweep's bricks and soot, the
// Cosmic Croc's comet and the Phantom King's ghostly roses.
//
// Piece toppings draw one piece centred at the origin, already placed and turned by the caller. Overlays (count 1)
// reset the transform and paint across the 400×400 top; registered toppings draw after the built-in ones, in the
// pizza's order. Every topping is wrapped in save/restore by the caller, so clips and composite modes are safe.

import { CALZONE_CY, CALZONE_VENTS, PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
import { type Ctx, blob, ellipse, rgba, roundRect, shade } from '../../art/util';

const C = PIZZA_SIZE / 2;
const TAU = Math.PI * 2;
type Pt = [number, number];

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.5, rot = -0.6): void {
  ctx.fillStyle = rgba('#ffffff', a);
  ellipse(ctx, x, y, rx, ry, rot);
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

/** Register a piece topping drawn `scale` times larger than its design size (upright: it never lies on its side). */
function piece(id: string, scale: number, d: { count?: number; minDist?: number; upright?: boolean; draw(ctx: Ctx, rand: () => number): void }): void {
  registerTopping(id, {
    count: d.count,
    minDist: d.minDist === undefined ? undefined : d.minDist * (1 + (scale - 1) * 0.7),
    draw(ctx, rand) {
      if (d.upright) {
        const m = ctx.getTransform();
        const k = Math.hypot(m.a, m.b);
        ctx.setTransform(k, 0, 0, k, m.e, m.f);
        ctx.rotate((rand() - 0.5) * 0.4);
      }
      ctx.scale(scale, scale);
      d.draw(ctx, rand);
    },
  });
}

function overlay(ctx: Ctx): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Clip to the sauce (r: wider, to reach the crust). */
function clipRound(ctx: Ctx, r = PIZZA_R * 0.8): void {
  ctx.beginPath();
  ctx.arc(C, C, r, 0, TAU);
  ctx.clip();
}

/** A smooth closed path through points. */
function smooth(ctx: Ctx, pts: Pt[]): void {
  ctx.beginPath();
  const n = pts.length;
  const mid = (i: number): Pt => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
  const m0 = mid(0);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 1; i <= n; i++) {
    const m = mid(i);
    ctx.quadraticCurveTo(pts[i % n][0], pts[i % n][1], m[0], m[1]);
  }
  ctx.closePath();
}

// ════════════════════════════ the Kraken: Squid Ink Nero ════════════════════════════

piece('inkTentacle', 2.1, {
  count: 6,
  minDist: 44,
  draw(ctx, rand) {
    // a baby octopus tentacle, curled tight at the tip, seared deep violet, suckers pale along its inside
    const L = 30 + rand() * 6;
    const curl = 2.6 + rand() * 0.8;
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      // a spiral that tightens as it goes
      const a = u * curl;
      const r = L * (1 - u * 0.72);
      pts.push([Math.cos(a) * r - L * 0.35, Math.sin(a) * r * 0.9 - 4]);
    }
    const width = (u: number) => 8.5 * (1 - u * 0.82) + 1;
    const body = (grow: number) => {
      ctx.beginPath();
      const left: Pt[] = [];
      const right: Pt[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
        const [px, py] = pts[Math.max(0, i - 1)];
        const dx = nx - px;
        const dy = ny - py;
        const d = Math.hypot(dx, dy) || 1;
        const w = width(i / (pts.length - 1)) + grow;
        left.push([x - (dy / d) * w, y + (dx / d) * w]);
        right.push([x + (dy / d) * w, y - (dx / d) * w]);
      }
      ctx.moveTo(left[0][0], left[0][1]);
      for (const [x, y] of left) ctx.lineTo(x, y);
      for (const [x, y] of right.reverse()) ctx.lineTo(x, y);
      ctx.closePath();
    };
    body(1.4);
    drop(ctx, 0.4, 2, 3);
    ctx.fillStyle = '#12061e';
    ctx.fill();
    body(0);
    const g = ctx.createLinearGradient(-L, -L, L * 0.4, L * 0.6);
    g.addColorStop(0, '#6a2a6e');
    g.addColorStop(0.5, '#4a1a52');
    g.addColorStop(1, '#2a0e34');
    ctx.fillStyle = g;
    ctx.fill();
    // a charred edge where it hit the grill
    ctx.strokeStyle = rgba('#120414', 0.55);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // suckers along the inside of the curl
    for (let i = 2; i < pts.length - 2; i += 2) {
      const u = i / (pts.length - 1);
      const [x, y] = pts[i];
      const [nx, ny] = pts[i + 1];
      const d = Math.hypot(nx - x, ny - y) || 1;
      const w = width(u) * 0.55;
      const sx = x + ((ny - y) / d) * w;
      const sy = y - ((nx - x) / d) * w;
      const r = Math.max(0.9, 2.6 * (1 - u * 0.8));
      ctx.fillStyle = '#e8b8d8';
      ellipse(ctx, sx, sy, r, r * 0.8);
      ctx.fill();
      ctx.fillStyle = rgba('#7a2a5a', 0.8);
      ellipse(ctx, sx + 0.3, sy + 0.3, r * 0.45, r * 0.35);
      ctx.fill();
    }
    // a glossy ink sheen down its back
    ctx.strokeStyle = rgba('#d8a8ff', 0.5);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 1; i < 14; i++) {
      const [x, y] = pts[i];
      if (i === 1) ctx.moveTo(x - 2, y - 3);
      else ctx.lineTo(x - 2, y - 3);
    }
    ctx.stroke();
  },
});

registerTopping('inkPool', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx);
    // squid-ink sauce pooled glossy over the black base: lacquered blots with a violet sheen, and drips of it
    const pools = 6;
    for (let i = 0; i < pools; i++) {
      const a = (i / pools) * TAU + rand() * 0.6;
      const d = 40 + rand() * 100;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 16 + rand() * 18;
      blob(ctx, x, y, r, 0.35, rand, 11);
      ctx.fillStyle = rgba('#05020c', 0.75);
      ctx.fill();
      blob(ctx, x - 1, y - 1, r * 0.86, 0.3, rand, 11);
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
      g.addColorStop(0, '#8a5ac8');
      g.addColorStop(0.3, '#3a1a6a');
      g.addColorStop(1, '#0a0418');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba('#a87ae8', 0.55);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // a swirl in the ink, like the Kraken's, and the lacquer's highlights
      ctx.strokeStyle = rgba('#c8a8ff', 0.45);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k <= 16; k++) {
        const b = k * 0.55;
        const rr = r * 0.62 * (1 - k / 18);
        ctx.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr);
      }
      ctx.stroke();
      shine(ctx, x - r * 0.38, y - r * 0.42, r * 0.3, r * 0.13, 0.85, -0.5);
      shine(ctx, x + r * 0.3, y + r * 0.3, r * 0.12, r * 0.05, 0.4, -0.5);
    }
    // fine drizzled lines of ink catching the light
    ctx.strokeStyle = rgba('#a88ae8', 0.5);
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = rand() * TAU;
      const d = 60 + rand() * 80;
      ctx.beginPath();
      ctx.arc(C, C, d, a, a + 0.6 + rand() * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  },
});

// ════════════════════════════ the Yeti: Snowball Pie ════════════════════════════

piece('snowball', 1.85, {
  count: 8,
  minDist: 42,
  draw(ctx, rand) {
    // a bocconcino rolled into a snowball: cold white, blue in its shade, packed snow flecks and a glint of ice
    const r = 13 + rand() * 2.5;
    blob(ctx, 0, 0, r, 0.16, rand, 14);
    drop(ctx, 0.25, 2, 3.5);
    ctx.fillStyle = '#a8c0d8';
    ctx.fill();
    blob(ctx, -0.4, -0.4, r - 0.9, 0.16, rand, 14);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#eef6ff');
    g.addColorStop(1, '#a8c4e4');
    ctx.fillStyle = g;
    ctx.fill();
    // packed-snow texture: little dimples and crumbs
    for (let i = 0; i < 9; i++) {
      const a = rand() * TAU;
      const d = rand() * r * 0.8;
      ctx.fillStyle = rand() < 0.5 ? rgba('#9ab8d8', 0.55) : rgba('#ffffff', 0.9);
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, 1.1 + rand(), 0.8 + rand() * 0.6, rand());
      ctx.fill();
    }
    shine(ctx, -r * 0.35, -r * 0.42, r * 0.26, r * 0.14, 0.95);
    // the icy glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const gx = r * 0.32;
    const gy = -r * 0.5;
    ctx.moveTo(gx, gy - 3.5);
    ctx.lineTo(gx + 0.8, gy - 0.8);
    ctx.lineTo(gx + 3.5, gy);
    ctx.lineTo(gx + 0.8, gy + 0.8);
    ctx.lineTo(gx, gy + 3.5);
    ctx.lineTo(gx - 0.8, gy + 0.8);
    ctx.lineTo(gx - 3.5, gy);
    ctx.lineTo(gx - 0.8, gy - 0.8);
    ctx.closePath();
    ctx.fill();
  },
});

registerTopping('frostRim', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the Yeti's frost creeping in off the crust: a rime of hoar frost round the rim, icy crystals, a dusting of snow
    ctx.save();
    clipRound(ctx, PIZZA_R + 2);
    const ring = ctx.createRadialGradient(C, C, PIZZA_R - 60, C, C, PIZZA_R + 2);
    ring.addColorStop(0, rgba('#ffffff', 0));
    ring.addColorStop(0.65, rgba('#e8f4ff', 0.28));
    ring.addColorStop(1, rgba('#ffffff', 0.62));
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // frost feathers growing in from the edge
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + rand() * 0.2;
      const r0 = PIZZA_R - 2;
      const len = 14 + rand() * 22;
      const x0 = C + Math.cos(a) * r0;
      const y0 = C + Math.sin(a) * r0;
      const x1 = C + Math.cos(a) * (r0 - len);
      const y1 = C + Math.sin(a) * (r0 - len);
      ctx.strokeStyle = rgba('#ffffff', 0.7);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      for (let k = 1; k <= 3; k++) {
        const u = k / 4;
        const mx = x0 + (x1 - x0) * u;
        const my = y0 + (y1 - y0) * u;
        const bl = (1 - u) * 7 + 2;
        for (const s of [-1, 1]) {
          ctx.moveTo(mx, my);
          ctx.lineTo(mx + Math.cos(a + Math.PI + s * 0.7) * bl, my + Math.sin(a + Math.PI + s * 0.7) * bl);
        }
      }
      ctx.stroke();
    }
    // a dusting of snow over it all, thicker near the edge
    for (let i = 0; i < 160; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * Math.pow(rand(), 0.45);
      ctx.fillStyle = rgba('#ffffff', 0.35 + rand() * 0.55);
      const s = 0.8 + rand() * 1.6;
      ellipse(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, s, s);
      ctx.fill();
    }
    ctx.restore();
  },
});

// ════════════════════════════ King Honk: Cream Pie Supreme ════════════════════════════

piece('miniCreamPie', 2.15, {
  count: 4,
  minDist: 64,
  draw(ctx, rand) {
    // one of King Honk's cream pies, shrunk: a fluted tin, golden pastry, a heap of whipped cream and a cherry
    const r = 15;
    // the tin and its fluted edge
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * TAU;
      const k = r + (i % 2 ? 1.2 : 2.4);
      ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k);
    }
    ctx.closePath();
    drop(ctx, 0.35, 2, 3.5);
    ctx.fillStyle = '#8a929e';
    ctx.fill();
    ctx.strokeStyle = '#4a505a';
    ctx.lineWidth = 1;
    ctx.stroke();
    // the pastry rim
    ellipse(ctx, 0, 0, r, r);
    const pg = ctx.createRadialGradient(-4, -4, 2, 0, 0, r);
    pg.addColorStop(0, '#f2c27a');
    pg.addColorStop(1, '#b87a34');
    ctx.fillStyle = pg;
    ctx.fill();
    // the cream, piled in soft swirls
    const swirl = (x: number, y: number, s: number) => {
      blob(ctx, x, y, s, 0.22, rand, 9);
      ctx.fillStyle = '#d8d0c4';
      ctx.fill();
      blob(ctx, x - 0.6, y - 0.8, s * 0.88, 0.2, rand, 9);
      const cg = ctx.createRadialGradient(x - s * 0.4, y - s * 0.5, 0.5, x, y, s);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(1, '#f0e8dc');
      ctx.fillStyle = cg;
      ctx.fill();
    };
    swirl(0, 1, 12);
    swirl(-4, -2, 7.5);
    swirl(4, -3, 7);
    swirl(0, -6, 6);
    // piping ridges
    ctx.strokeStyle = rgba('#c8bca8', 0.7);
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(0, -2, 4 + i * 2, -2.4 + i * 0.2, -0.6 + i * 0.3);
      ctx.stroke();
    }
    // the cherry on top
    ellipse(ctx, 0.5, -7, 4.2, 4);
    ctx.fillStyle = '#9a0e1e';
    ctx.fill();
    ellipse(ctx, 0.2, -7.3, 3.6, 3.4);
    ctx.fillStyle = '#e02a3a';
    ctx.fill();
    shine(ctx, -1, -8.6, 1.4, 0.8, 0.9);
    ctx.strokeStyle = '#4a6a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1, -10.5);
    ctx.quadraticCurveTo(3, -15, 6, -16);
    ctx.stroke();
  },
});

registerTopping('creamSplats', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx);
    // splats of whipped cream thrown across the pie, with flecks flung off them
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.5 + rand() * 0.6;
      const d = 55 + rand() * 75;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 21 + rand() * 7;
      // the splat's rays
      // a soft dollop with a few runs of cream off it
      const pts: Pt[] = [];
      for (let k = 0; k < 12; k++) {
        const b = (k / 12) * TAU;
        const rr = r * (0.85 + rand() * 0.3);
        pts.push([x + Math.cos(b) * rr, y + Math.sin(b) * rr * 0.9]);
      }
      for (let k = 0; k < 3; k++) {
        const b = rand() * TAU;
        const rr = r * (1.25 + rand() * 0.35);
        const bx = x + Math.cos(b) * rr;
        const by = y + Math.sin(b) * rr;
        ellipse(ctx, bx, by, r * 0.32, r * 0.26, b);
        ctx.fillStyle = '#fbf6ee';
        ctx.fill();
      }
      smooth(ctx, pts);
      ctx.fillStyle = rgba('#8a5a60', 0.35);
      ctx.save();
      ctx.translate(1.5, 2.5);
      ctx.fill();
      ctx.restore();
      smooth(ctx, pts);
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r * 1.3);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#efe6d6');
      ctx.fillStyle = g;
      ctx.fill();
      for (let k = 0; k < 4; k++) {
        const b = rand() * TAU;
        const rr = r * (1.5 + rand() * 0.6);
        ctx.fillStyle = '#fbf6ee';
        ellipse(ctx, x + Math.cos(b) * rr, y + Math.sin(b) * rr, 2 + rand() * 1.6, 1.6 + rand());
        ctx.fill();
      }
      shine(ctx, x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.14, 0.8);
    }
    ctx.restore();
  },
});

// ════════════════════════════ Sandcastle Sam: Sandcastle Sundae ════════════════════════════

piece('sandcastle', 2.4, {
  count: 3,
  minDist: 90,
  upright: true,
  draw(ctx, rand) {
    // a little sandcastle of pressed biscuit crumb: a keep with crenellations between two towers, a flag on top
    const sand = '#e2b46a';
    const dark = '#a8743a';
    const crumbs = (x: number, y: number, w: number, h: number) => {
      for (let i = 0; i < (w * h) / 14; i++) {
        ctx.fillStyle = rand() < 0.5 ? rgba('#fff0c8', 0.6) : rgba('#8a5a22', 0.45);
        ctx.fillRect(x + rand() * w, y + rand() * h, 1.2, 1.2);
      }
    };
    const block = (x: number, y: number, w: number, h: number, teeth: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y);
      const tw = w / (teeth * 2 - 1);
      for (let i = 0; i < teeth * 2 - 1; i++) {
        const tx = x + i * tw;
        if (i % 2 === 0) {
          ctx.lineTo(tx, y - 3.5);
          ctx.lineTo(tx + tw, y - 3.5);
        } else {
          ctx.lineTo(tx, y);
          ctx.lineTo(tx + tw, y);
        }
      }
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
    };
    // the base mound
    ellipse(ctx, 0, 13, 20, 6);
    drop(ctx, 0.35, 2, 3);
    ctx.fillStyle = dark;
    ctx.fill();
    ellipse(ctx, 0, 12.4, 19, 5.2);
    ctx.fillStyle = sand;
    ctx.fill();
    // the towers and the keep
    for (const [x, y, w, h, t] of [[-17, -2, 10, 15, 2], [7, -2, 10, 15, 2], [-8, -8, 16, 21, 3]] as const) {
      block(x, y, w, h, t);
      ctx.fillStyle = dark;
      ctx.save();
      ctx.translate(0.8, 0.8);
      ctx.fill();
      ctx.restore();
      block(x, y, w, h, t);
      const g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, shade(sand, 0.12));
      g.addColorStop(1, shade(sand, -0.15));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba('#6a4418', 0.6);
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.save();
      block(x, y, w, h, t);
      ctx.clip();
      crumbs(x, y - 4, w, h + 4);
      ctx.restore();
    }
    // the door, an arch, and two window slits
    ctx.fillStyle = '#5a3412';
    ctx.beginPath();
    ctx.moveTo(-3, 13);
    ctx.lineTo(-3, 7);
    ctx.arc(0, 7, 3, Math.PI, 0);
    ctx.lineTo(3, 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-13, 3, 1.6, 3.2);
    ctx.fillRect(11.4, 3, 1.6, 3.2);
    // the flag: a lolly stick and a red pennant
    ctx.strokeStyle = '#f6e6c8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(0, -24);
    ctx.stroke();
    ctx.fillStyle = rand() < 0.5 ? '#e83a3a' : '#2a8ae0';
    ctx.beginPath();
    ctx.moveTo(0.4, -24);
    ctx.quadraticCurveTo(5, -23, 9, -20.5);
    ctx.quadraticCurveTo(5, -19.6, 0.4, -18.4);
    ctx.closePath();
    ctx.fill();
    shine(ctx, -5, -6, 2.4, 1, 0.45);
  },
});

registerTopping('beachSand', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx);
    // a beach of golden biscuit crumb over the vanilla, rippled by the tide, with a blue-raspberry sea lapping in at
    // one edge and its foam
    const sand = ctx.createRadialGradient(C - 40, C - 40, 20, C, C, PIZZA_R);
    sand.addColorStop(0, '#f2cf8a');
    sand.addColorStop(1, '#d8a45a');
    ctx.fillStyle = sand;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    for (let i = 0; i < 520; i++) {
      const x = rand() * PIZZA_SIZE;
      const y = rand() * PIZZA_SIZE;
      ctx.fillStyle = rand() < 0.5 ? rgba('#fff0c8', 0.55) : rgba('#9a6a2a', 0.4);
      ctx.fillRect(x, y, 1.4 + rand(), 1.4 + rand());
    }
    // ripples left by the tide
    ctx.strokeStyle = rgba('#b07a38', 0.45);
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y0 = 70 + i * 34 + rand() * 8;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (let x = 0; x <= PIZZA_SIZE; x += 20) ctx.lineTo(x, y0 + Math.sin(x * 0.04 + i) * 5 + x * 0.12);
      ctx.stroke();
    }
    // the sea, in at the bottom right
    const sea = () => {
      ctx.beginPath();
      ctx.moveTo(PIZZA_SIZE, 150);
      for (let x = PIZZA_SIZE; x >= 160; x -= 16) ctx.lineTo(x, 150 + (PIZZA_SIZE - x) * 0.95 + Math.sin(x * 0.09) * 7);
      ctx.lineTo(160, PIZZA_SIZE);
      ctx.lineTo(PIZZA_SIZE, PIZZA_SIZE);
      ctx.closePath();
    };
    sea();
    const sg = ctx.createLinearGradient(300, 260, 380, 380);
    sg.addColorStop(0, '#4ac8f0');
    sg.addColorStop(1, '#1a6ad0');
    ctx.fillStyle = sg;
    ctx.fill();
    // the foam along the water's edge, and a glint on the sea
    ctx.strokeStyle = rgba('#ffffff', 0.9);
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = PIZZA_SIZE; x >= 160; x -= 8) {
      const y = 150 + (PIZZA_SIZE - x) * 0.95 + Math.sin(x * 0.09) * 7;
      if (x === PIZZA_SIZE) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i < 18; i++) {
      const x = 170 + rand() * 230;
      const y = 154 + (PIZZA_SIZE - x) * 0.95 + rand() * 30;
      ctx.fillStyle = rgba('#ffffff', 0.5 + rand() * 0.4);
      ellipse(ctx, x, y, 2 + rand() * 3, 1.2 + rand());
      ctx.fill();
    }
    shine(ctx, 300, 300, 22, 5, 0.35, -0.8);
    ctx.restore();
  },
});

piece('seaShell', 1.75, {
  count: 7,
  minDist: 34,
  draw(ctx, rand) {
    // a white-chocolate scallop shell, ribbed, blushing pink at its hinge
    const pink = rand() < 0.5;
    const fan = () => {
      ctx.beginPath();
      ctx.moveTo(-3, 9);
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * 1.08 + (i / 10) * Math.PI * 0.84;
        const r = 12 + (i % 2 ? 0 : 1.4);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r + 6);
      }
      ctx.lineTo(3, 9);
      ctx.closePath();
    };
    fan();
    drop(ctx, 0.3, 1.5, 2.5);
    ctx.fillStyle = '#b8987a';
    ctx.fill();
    fan();
    const g = ctx.createLinearGradient(0, -8, 0, 9);
    g.addColorStop(0, '#fff8ee');
    g.addColorStop(1, pink ? '#f4b8b8' : '#f0dcc0');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#a07858', 0.7);
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 6; i++) {
      const a = Math.PI * 1.1 + (i / 6) * Math.PI * 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12 + 6);
      ctx.stroke();
    }
    // its hinge
    roundRect(ctx, -4.5, 7.5, 9, 3.4, 1.4);
    ctx.fillStyle = pink ? '#e89a9a' : '#e0c4a0';
    ctx.fill();
    shine(ctx, -3, -2, 3, 1.2, 0.6);
  },
});

// ════════════════════════════ T-Rex Toes: T-Rex Ribs ════════════════════════════

piece('ribBone', 2.0, {
  count: 5,
  minDist: 58,
  draw(ctx, rand) {
    // a sticky BBQ rib: lacquered, charred at its edges, the bone poking out each end
    const L = 20 + rand() * 4;
    const bone = (x: number) => {
      ctx.beginPath();
      ctx.arc(x, -2.4, 2.8, 0, TAU);
      ctx.arc(x, 2.4, 2.8, 0, TAU);
      roundRect(ctx, x - 2.4, -2.4, 4.8, 4.8, 1);
      ctx.fillStyle = '#e8dcc0';
      ctx.fill();
      ctx.strokeStyle = '#8a7a5a';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      shine(ctx, x - 1, -3.2, 1.4, 0.8, 0.7);
    };
    bone(-L - 2);
    bone(L + 2);
    // the meat
    const meat = () => {
      ctx.beginPath();
      ctx.moveTo(-L, -6);
      ctx.quadraticCurveTo(0, -9.5, L, -6);
      ctx.quadraticCurveTo(L + 3, 0, L, 6);
      ctx.quadraticCurveTo(0, 9.5, -L, 6);
      ctx.quadraticCurveTo(-L - 3, 0, -L, -6);
      ctx.closePath();
    };
    meat();
    drop(ctx, 0.4, 2, 3.5);
    ctx.fillStyle = '#3a1206';
    ctx.fill();
    meat();
    const g = ctx.createLinearGradient(0, -9, 0, 9);
    g.addColorStop(0, '#a83a14');
    g.addColorStop(0.5, '#7a220a');
    g.addColorStop(1, '#4a1406');
    ctx.fillStyle = g;
    ctx.fill();
    // char marks across it
    ctx.strokeStyle = rgba('#1a0602', 0.7);
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 7 - 2, -7);
      ctx.lineTo(i * 7 + 3, 7);
      ctx.stroke();
    }
    // the sticky glaze highlight and a few sesame seeds
    ctx.strokeStyle = rgba('#ffb070', 0.55);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-L * 0.8, -4.5);
    ctx.quadraticCurveTo(0, -7, L * 0.8, -4.5);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#f6e6b8';
      ellipse(ctx, (rand() - 0.5) * L * 1.5, (rand() - 0.5) * 8, 1.3, 0.7, rand() * 3);
      ctx.fill();
    }
  },
});

registerTopping('dinoPrints', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx);
    // T-Rex Toes walked across it: three-toed prints pressed into the sauce, a trail from edge to edge
    const a = -0.5 + rand() * 0.3;
    for (let i = 0; i < 4; i++) {
      const t = -1.2 + i * 0.8;
      const side = i % 2 ? 1 : -1;
      const x = C + Math.cos(a) * t * 120 + Math.cos(a + Math.PI / 2) * side * 22;
      const y = C + Math.sin(a) * t * 120 + Math.sin(a + Math.PI / 2) * side * 22;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      const toe = (tx: number, ty: number, len: number, rot: number) => {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(-3.5, 0);
        ctx.quadraticCurveTo(-2.5, -len, 0, -len - 4);
        ctx.quadraticCurveTo(2.5, -len, 3.5, 0);
        ctx.closePath();
        ctx.restore();
      };
      for (const [w, col] of [[1.5, rgba('#1a0400', 0.6)], [0, rgba('#5a1406', 0.75)]] as const) {
        ctx.save();
        ctx.translate(w, w * 1.5);
        ctx.scale(1.5, 1.5);
        ellipse(ctx, 0, 4, 7, 6);
        ctx.fillStyle = col;
        ctx.fill();
        for (const [tx, len, rot] of [[-5, 13, -0.45], [0, 16, 0], [5, 13, 0.45]] as const) {
          toe(tx, 1, len, rot);
          ctx.fill();
        }
        ctx.restore();
      }
      // the raised sauce lip round the print
      ctx.strokeStyle = rgba('#ff8a5a', 0.35);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 6, 13, 0.3, Math.PI - 0.3);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
});

// ════════════════════════════ Iron Heel: Steam Bun Pie ════════════════════════════

piece('baoBun', 2.05, {
  count: 5,
  minDist: 64,
  draw(ctx, rand) {
    // a little steamed bun: soft and matte white, its top pleated and twisted shut, a blush of char siu showing
    const r = 13;
    ellipse(ctx, 0, 0, r, r * 0.92);
    drop(ctx, 0.3, 2, 3.5);
    ctx.fillStyle = '#c8bca8';
    ctx.fill();
    ellipse(ctx, -0.4, -0.5, r - 1.2, r * 0.92 - 1.2);
    const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#f8f2e6');
    g.addColorStop(1, '#e2d6c2');
    ctx.fillStyle = g;
    ctx.fill();
    // the pleats twisting into the top
    const tw = rand() * TAU;
    ctx.strokeStyle = rgba('#b8a88a', 0.85);
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 9; i++) {
      const a = tw + (i / 9) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2 - 1);
      ctx.quadraticCurveTo(Math.cos(a + 0.5) * 6, Math.sin(a + 0.5) * 6 - 1, Math.cos(a + 0.7) * 10, Math.sin(a + 0.7) * 9.4 - 1);
      ctx.stroke();
    }
    ellipse(ctx, 0, -1, 2.6, 2.2);
    ctx.fillStyle = '#c84a2a';
    ctx.fill();
    shine(ctx, -5, -6, 3.4, 1.6, 0.7);
  },
});

piece('carrotGear', 1.55, {
  count: 8,
  minDist: 34,
  draw(ctx, rand) {
    // a carrot coin cut as one of Iron Heel's cogs: teeth all round, a hub, glazed and glossy
    const teeth = 8;
    const ro = 11;
    const ri = 8.6;
    const spin = rand() * TAU;
    const cog = () => {
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a = spin + (i / teeth) * TAU;
        const h = (TAU / teeth) * 0.24;
        ctx.lineTo(Math.cos(a - h * 1.3) * ri, Math.sin(a - h * 1.3) * ri);
        ctx.lineTo(Math.cos(a - h) * ro, Math.sin(a - h) * ro);
        ctx.lineTo(Math.cos(a + h) * ro, Math.sin(a + h) * ro);
        ctx.lineTo(Math.cos(a + h * 1.3) * ri, Math.sin(a + h * 1.3) * ri);
      }
      ctx.closePath();
    };
    cog();
    drop(ctx, 0.35, 1.5, 2.5);
    ctx.fillStyle = '#8a3a06';
    ctx.fill();
    cog();
    const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, ro);
    g.addColorStop(0, '#ffb04a');
    g.addColorStop(1, '#e06a12');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#9a4208';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // the carrot's paler core ring and the hub hole
    ctx.strokeStyle = rgba('#ffd08a', 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, TAU);
    ctx.stroke();
    ellipse(ctx, 0, 0, 2, 2);
    ctx.fillStyle = '#7a3004';
    ctx.fill();
    shine(ctx, -4, -4.5, 2.6, 1.1, 0.65);
  },
});

// ════════════════════════════ the Chimney Sweep: Chimney Soot Pie ════════════════════════════

piece('brickChorizo', 1.8, {
  count: 8,
  minDist: 44,
  draw(ctx, rand) {
    // a chorizo cut into a brick: rust red, marbled with fat, sooty at its edges, a mortar line of cheese
    const w = 20;
    const h = 11;
    roundRect(ctx, -w / 2, -h / 2, w, h, 2);
    drop(ctx, 0.4, 2, 3);
    ctx.fillStyle = '#3a0c06';
    ctx.fill();
    roundRect(ctx, -w / 2 + 0.8, -h / 2 + 0.8, w - 1.6, h - 1.6, 1.6);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#d0482a');
    g.addColorStop(1, '#8a2010');
    ctx.fillStyle = g;
    ctx.fill();
    // fat marbling
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = rgba('#ffc8a0', 0.6);
      ellipse(ctx, (rand() - 0.5) * (w - 6), (rand() - 0.5) * (h - 5), 1.4 + rand() * 1.2, 0.8 + rand() * 0.6, rand() * 3);
      ctx.fill();
    }
    // soot on its edges
    const sg = ctx.createRadialGradient(0, 0, 3, 0, 0, w * 0.62);
    sg.addColorStop(0, rgba('#000000', 0));
    sg.addColorStop(1, rgba('#1a1210', 0.55));
    ctx.fillStyle = sg;
    roundRect(ctx, -w / 2 + 0.8, -h / 2 + 0.8, w - 1.6, h - 1.6, 1.6);
    ctx.fill();
    // the mortar: a line of cheese along one long side
    ctx.strokeStyle = rgba('#fff0c8', 0.85);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, h / 2 + 0.6);
    ctx.lineTo(w / 2 - 2, h / 2 + 0.6);
    ctx.stroke();
    shine(ctx, -w * 0.25, -h * 0.25, 3.4, 1.1, 0.55, 0);
  },
});

registerTopping('sootDust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx, PIZZA_R + 2);
    // the Chimney Sweep's soot: a smoky smudge drifting across, charcoal flakes and a dusting of black ash
    for (let i = 0; i < 5; i++) {
      const a = rand() * TAU;
      const d = rand() * 120;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 40 + rand() * 40;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, rgba('#1a1614', 0.32));
      g.addColorStop(1, rgba('#1a1614', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // the rim blackened, as if the crust came out of the chimney
    const rim = ctx.createRadialGradient(C, C, PIZZA_R - 34, C, C, PIZZA_R + 2);
    rim.addColorStop(0, rgba('#000000', 0));
    rim.addColorStop(1, rgba('#14100e', 0.55));
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    for (let i = 0; i < 130; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * Math.sqrt(rand());
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      if (rand() < 0.15) {
        // a charcoal flake, catching a little light
        blob(ctx, x, y, 2 + rand() * 2.4, 0.5, rand, 5);
        ctx.fillStyle = '#16120f';
        ctx.fill();
        ctx.fillStyle = rgba('#8a8078', 0.5);
        ctx.fillRect(x - 0.8, y - 1, 1.4, 0.8);
      } else {
        ctx.fillStyle = rgba('#120e0c', 0.4 + rand() * 0.4);
        ctx.fillRect(x, y, 1 + rand() * 1.2, 1 + rand() * 1.2);
      }
    }
    ctx.restore();
  },
});

// ════════════════════════════ the Cosmic Croc: Comet Calzone ════════════════════════════

registerTopping('cometCalzone', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    const R = PIZZA_R;
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(C + R, CALZONE_CY);
      ctx.arc(C, CALZONE_CY, R, 0, Math.PI);
      ctx.quadraticCurveTo(C, CALZONE_CY - R * 0.22, C + R, CALZONE_CY);
      ctx.closePath();
    };
    ctx.save();
    shape();
    ctx.clip();
    // a deep-space glaze of butterfly-pea and blackberry: violet at the fold to midnight blue at the belly
    const g = ctx.createLinearGradient(0, CALZONE_CY - 20, 0, CALZONE_CY + R);
    g.addColorStop(0, rgba('#3a1a70', 0.72));
    g.addColorStop(0.55, rgba('#1c2a78', 0.58));
    g.addColorStop(1, rgba('#14205a', 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // nebulae baked into the glaze: soft clouds of pink and teal
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const [nx, ny, nr, col] of [[C - 90, CALZONE_CY + 60, 70, '#c84ad8'], [C + 60, CALZONE_CY + 50, 60, '#2ab8d8'], [C - 20, CALZONE_CY + 130, 55, '#6a5aff']] as const) {
      const ng = ctx.createRadialGradient(nx, ny, 2, nx, ny, nr);
      ng.addColorStop(0, rgba(col, 0.42));
      ng.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = ng;
      ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
    }
    ctx.restore();
    // a field of stars: sea salt and edible silver, a few bright ones with a cross of light
    for (let i = 0; i < 130; i++) {
      const a = rand() * Math.PI;
      const d = Math.sqrt(rand()) * R * 0.95;
      const x = C + Math.cos(a) * d;
      const y = CALZONE_CY + Math.sin(a) * d;
      ctx.fillStyle = rand() < 0.3 ? rgba('#bfe6ff', 0.95) : rgba('#ffffff', 0.55 + rand() * 0.45);
      const sz = rand() < 0.15 ? 2.4 : 1.2;
      ctx.fillRect(x, y, sz, sz);
    }
    for (let i = 0; i < 7; i++) {
      const a = 0.2 + rand() * (Math.PI - 0.4);
      const d = (0.35 + rand() * 0.55) * R;
      const x = C + Math.cos(a) * d;
      const y = CALZONE_CY + Math.sin(a) * d;
      ctx.strokeStyle = rgba('#ffffff', 0.85);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
      ellipse(ctx, x, y, 1.8, 1.8);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    // the comet: its head of icy mozzarella blazing blue-white, its tail of stracciatella streaming across the belly
    const hx = C + 104;
    const hy = CALZONE_CY + 112;
    const tx = C - 160;
    const ty = CALZONE_CY + 36;
    const cx1 = C - 10;
    const cy1 = CALZONE_CY + 120;
    for (const [w, col, a] of [[46, '#3a7aff', 0.32], [30, '#7ac0ff', 0.5], [16, '#d8f0ff', 0.8], [6, '#ffffff', 0.95]] as const) {
      const lg = ctx.createLinearGradient(hx, hy, tx, ty);
      lg.addColorStop(0, rgba(col, a));
      lg.addColorStop(0.7, rgba(col, a * 0.35));
      lg.addColorStop(1, rgba(col, 0));
      ctx.strokeStyle = lg;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(cx1, cy1, tx, ty);
      ctx.stroke();
    }
    // streaks of dust in the tail
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      const off = (i - 2.5) * 6;
      const lg = ctx.createLinearGradient(hx, hy, tx, ty);
      lg.addColorStop(0, rgba('#ffffff', 0.7));
      lg.addColorStop(1, rgba('#ffffff', 0));
      ctx.strokeStyle = lg;
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy + off * 0.3);
      ctx.quadraticCurveTo(cx1, cy1 + off, tx + 30 + rand() * 40, ty + off * 1.4);
      ctx.stroke();
    }
    // the head
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const hg = ctx.createRadialGradient(hx, hy, 2, hx, hy, 58);
    hg.addColorStop(0, rgba('#ffffff', 0.95));
    hg.addColorStop(0.35, rgba('#9ad0ff', 0.6));
    hg.addColorStop(1, rgba('#3a7aff', 0));
    ctx.fillStyle = hg;
    ctx.fillRect(hx - 58, hy - 58, 116, 116);
    ctx.restore();
    blob(ctx, hx, hy, 16, 0.2, rand, 10);
    ctx.fillStyle = '#2a3a6a';
    ctx.fill();
    blob(ctx, hx - 1, hy - 1, 13.5, 0.2, rand, 10);
    const rg = ctx.createRadialGradient(hx - 5, hy - 6, 1, hx, hy, 14);
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(0.5, '#cfe6ff');
    rg.addColorStop(1, '#7a9ad8');
    ctx.fillStyle = rg;
    ctx.fill();
    for (const [x, y, r] of [[4, -4, 3], [-5, 4, 2.4], [6, 6, 1.8]] as const) {
      ellipse(ctx, hx + x, hy + y, r, r * 0.8);
      ctx.fillStyle = rgba('#5a7ab8', 0.55);
      ctx.fill();
    }
    shine(ctx, hx - 5, hy - 7, 4.5, 2, 0.9);
    // a little second comet far off by the fold
    const sx = C - 70;
    const sy = CALZONE_CY + 22;
    const sg = ctx.createLinearGradient(sx, sy, sx - 50, sy - 14);
    sg.addColorStop(0, rgba('#d8f0ff', 0.85));
    sg.addColorStop(1, rgba('#d8f0ff', 0));
    ctx.strokeStyle = sg;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 50, sy - 14);
    ctx.stroke();
    ellipse(ctx, sx, sy, 3.2, 3.2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // the vents are craters, cheese glowing hot inside them
    for (const [vx, vy] of CALZONE_VENTS) {
      if (Math.hypot(vx - hx, vy - hy) < 44) continue;
      const r = vx === C ? 17 : 13;
      ellipse(ctx, vx, vy, r + 4, (r + 4) * 0.8);
      ctx.fillStyle = '#2a1a3a';
      ctx.fill();
      ellipse(ctx, vx, vy, r + 2, (r + 2) * 0.8);
      ctx.strokeStyle = rgba('#9ad0ff', 0.6);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ellipse(ctx, vx, vy, r, r * 0.8);
      const vg = ctx.createRadialGradient(vx, vy, 1, vx, vy, r);
      vg.addColorStop(0, '#fff6c0');
      vg.addColorStop(0.55, '#ffc23a');
      vg.addColorStop(1, '#c85a12');
      ctx.fillStyle = vg;
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const og = ctx.createRadialGradient(vx, vy, 2, vx, vy, r * 2.2);
      og.addColorStop(0, rgba('#ffc84a', 0.45));
      og.addColorStop(1, rgba('#ffc84a', 0));
      ctx.fillStyle = og;
      ctx.fillRect(vx - r * 2.2, vy - r * 2.2, r * 4.4, r * 4.4);
      ctx.restore();
      shine(ctx, vx - r * 0.3, vy - r * 0.3, r * 0.25, r * 0.1, 0.7);
    }
    ctx.restore();
  },
});

// ════════════════════════════ the Phantom King: Phantom Waltz ════════════════════════════

piece('ghostRose', 1.6, {
  count: 5,
  minDist: 56,
  draw(ctx, rand) {
    // a radicchio rose, gone ghostly: pale violet petals spiralling in, glowing faintly at their edges
    const petals = 11;
    ctx.save();
    ctx.shadowColor = '#b48aff';
    ctx.shadowBlur = 8;
    ellipse(ctx, 0, 0, 13, 13);
    ctx.fillStyle = rgba('#d8c8ff', 0.6);
    ctx.fill();
    ctx.restore();
    ellipse(ctx, 0, 0, 13, 13);
    drop(ctx, 0.25, 2, 3);
    for (let i = petals - 1; i >= 0; i--) {
      const u = i / petals;
      const a = u * TAU * 2.2 + rand() * 0.3;
      const d = 2 + u * 8;
      const pr = 5.8 - u * 2.4;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      ellipse(ctx, x, y, pr * 1.25, pr, a + Math.PI / 2);
      const g = ctx.createRadialGradient(x, y, 0.5, x, y, pr * 1.3);
      g.addColorStop(0, i % 3 ? '#8a3a8a' : '#a04a9a');
      g.addColorStop(0.7, '#d8a8e8');
      g.addColorStop(1, '#f4ecff');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba('#5a1a5a', 0.45);
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // the pale vein down the petal
      ctx.strokeStyle = rgba('#ffffff', 0.55);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * pr * 0.6, y - Math.sin(a) * pr * 0.6);
      ctx.lineTo(x + Math.cos(a) * pr * 0.6, y + Math.sin(a) * pr * 0.6);
      ctx.stroke();
    }
    shine(ctx, -4, -5, 2.6, 1.2, 0.6);
  },
});
