// Toppings for the pizza plan's Epic milestone pizzas and Echo Slice (src/content/pizzas/p7.ts), each from Act 8's
// Norse bosses and the Echo Phantom: Fenrir's paw prints and Gleipnir, the Bifröst's span, the Skald's mead and runes,
// Thrym's ice blocks and hail, Surtr's sword and the coals of Muspelheim, Jörmungandr biting its own tail and its
// venom, and the Echo Phantom's glitching doubles.
//
// Piece toppings draw one piece centred at the origin, already placed and turned by the caller. Overlays (count 1)
// reset the transform and paint across the 400×400 top; registered toppings draw after the built-in ones, in the
// pizza's order. Every topping is wrapped in save/restore by the caller, so clips and composite modes are safe.

import { PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
import { type Ctx, blob, ellipse, rgba, roundRect } from '../../art/util';

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

/** A smooth open path through points. */
function curve(ctx: Ctx, pts: Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const l = pts[pts.length - 1];
  ctx.lineTo(l[0], l[1]);
}

/** A ribbon along points, `w(u)` wide: its outline as a closed path. */
function ribbon(ctx: Ctx, pts: Pt[], w: (u: number) => number): void {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
    const [px, py] = pts[Math.max(0, i - 1)];
    const dx = nx - px;
    const dy = ny - py;
    const d = Math.hypot(dx, dy) || 1;
    const ww = w(i / (pts.length - 1));
    left.push([x - (dy / d) * ww, y + (dx / d) * ww]);
    right.push([x + (dy / d) * ww, y - (dx / d) * ww]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const [x, y] of left) ctx.lineTo(x, y);
  for (const [x, y] of right.reverse()) ctx.lineTo(x, y);
  ctx.closePath();
}

/** Points along a quadratic bezier. */
function bez(a: Pt, c: Pt, b: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = 1 - u;
    out.push([v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]);
  }
  return out;
}

// ════════════════════════════ Fenrir: Fenrir's Howl ════════════════════════════

piece('wolfPrints', 2.4, {
  count: 4,
  minDist: 80,
  draw(ctx, rand) {
    // Fenrir's paw pressed into the cheese as it baked: a heel pad and four toes sunk in, each a dark hollow lit on
    // its far rim, and the claw marks scored in front of the toes
    const hollow = (x: number, y: number, rx: number, ry: number, rot: number) => {
      ellipse(ctx, x, y, rx + 1.2, ry + 1.2, rot);
      ctx.fillStyle = rgba('#fff2c8', 0.55);
      ctx.fill();
      ellipse(ctx, x, y, rx, ry, rot);
      const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 0.5, x, y, Math.max(rx, ry));
      g.addColorStop(0, '#5a2410');
      g.addColorStop(0.7, '#8a3a1a');
      g.addColorStop(1, '#b8602e');
      ctx.fillStyle = g;
      ctx.fill();
      // the baked rim catching the light on the far side
      ctx.strokeStyle = rgba('#ffe8b0', 0.6);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0.1, Math.PI * 0.9);
      ctx.stroke();
    };
    // the heel pad: three lobes, wider than it's long
    ctx.beginPath();
    ctx.moveTo(-9, 6);
    ctx.bezierCurveTo(-11, -2, -5, -6, 0, -5);
    ctx.bezierCurveTo(5, -6, 11, -2, 9, 6);
    ctx.bezierCurveTo(7, 11, 3, 9, 0, 10);
    ctx.bezierCurveTo(-3, 9, -7, 11, -9, 6);
    ctx.closePath();
    ctx.fillStyle = rgba('#fff2c8', 0.5);
    ctx.save();
    ctx.translate(-0.6, -0.8);
    ctx.fill();
    ctx.restore();
    const pg = ctx.createRadialGradient(-2, -1, 0.5, 0, 3, 11);
    pg.addColorStop(0, '#5a2410');
    pg.addColorStop(0.7, '#8a3a1a');
    pg.addColorStop(1, '#b8602e');
    ctx.fillStyle = pg;
    ctx.fill();
    // the four toes, the middle two further forward
    const toes: [number, number, number][] = [[-10, -10, -0.5], [-3.5, -15, -0.15], [3.5, -15, 0.15], [10, -10, 0.5]];
    for (const [x, y, rot] of toes) {
      hollow(x, y, 3.2, 4.4, rot);
      // a claw scored ahead of each toe
      ctx.strokeStyle = rgba('#4a1a08', 0.75);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(rot) * 5, y - 5);
      ctx.lineTo(x + Math.sin(rot) * 8, y - 9.5);
      ctx.stroke();
    }
    // a few wolf-grey hairs caught in it
    ctx.strokeStyle = rgba('#5e5a66', 0.7);
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 3; i++) {
      const a = rand() * TAU;
      const x = Math.cos(a) * 12;
      const y = Math.sin(a) * 9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 3, y - 2, x + 5 + rand() * 2, y + (rand() - 0.5) * 3);
      ctx.stroke();
    }
  },
});

registerTopping('gleipnirChain', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx, PIZZA_R * 0.86);
    // Gleipnir, the silken fetter that bound Fenrir: a chain of glowing silver-blue silk links laid across the pie, the
    // wolf's snap at the middle (two links torn open, frayed threads, a glint of the magic leaking out)
    const path = bez([C - 160, C - 70], [C - 10, C + 70], [C + 160, C - 40], 36);
    const links: { x: number; y: number; a: number; i: number }[] = [];
    for (let i = 1; i < path.length - 1; i += 3) {
      const [x, y] = path[i];
      const [nx, ny] = path[i + 1];
      const [px, py] = path[i - 1];
      links.push({ x, y, a: Math.atan2(ny - py, nx - px), i });
    }
    const mid = Math.floor(links.length / 2);
    // its glow on the cheese under it
    ctx.globalCompositeOperation = 'lighter';
    for (const l of links) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 20);
      g.addColorStop(0, rgba('#7fd8ff', 0.16));
      g.addColorStop(1, rgba('#7fd8ff', 0));
      ctx.fillStyle = g;
      ctx.fillRect(l.x - 20, l.y - 20, 40, 40);
    }
    ctx.globalCompositeOperation = 'source-over';
    links.forEach((l, k) => {
      if (Math.abs(k - mid) < 1) return;
      const broken = Math.abs(k - mid) === 1;
      const flat = k % 2 === 0;
      ctx.save();
      ctx.translate(l.x + (broken ? (k < mid ? -4 : 4) : 0), l.y);
      ctx.rotate(l.a + (broken ? (k < mid ? 0.5 : -0.5) : 0));
      const rx = 13;
      const ry = flat ? 8 : 3.6;
      // a link: a thick silk ring, its shadow on the pie, the silk's sheen along its top
      ctx.lineWidth = flat ? 5 : 4.4;
      ctx.strokeStyle = rgba('#1a2a3a', 0.35);
      ctx.beginPath();
      ctx.ellipse(1.5, 2.5, rx, ry, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = '#4a5466';
      ctx.lineWidth = flat ? 6 : 5.2;
      ctx.beginPath();
      if (broken) ctx.ellipse(0, 0, rx, ry, 0, 0.5, TAU - 0.5);
      else ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      ctx.stroke();
      const sg = ctx.createLinearGradient(0, -ry, 0, ry);
      sg.addColorStop(0, '#f4f9ff');
      sg.addColorStop(0.5, '#bfe6ff');
      sg.addColorStop(1, '#a8b8cc');
      ctx.strokeStyle = sg;
      ctx.lineWidth = flat ? 3.8 : 3.2;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.85);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.7);
      ctx.stroke();
      // the frayed silk at a torn link
      if (broken) {
        ctx.strokeStyle = rgba('#dff4ff', 0.9);
        ctx.lineWidth = 0.7;
        const ex = k < mid ? rx : -rx;
        for (let t = 0; t < 4; t++) {
          ctx.beginPath();
          ctx.moveTo(ex * 0.95, (t - 1.5) * 1.2);
          ctx.quadraticCurveTo(ex * 1.3, (t - 1.5) * 2.4 + (rand() - 0.5) * 2, ex * (1.5 + rand() * 0.3), (t - 1.5) * 3.5);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
    // the snap: magic leaking out of the break, a burst of blue-white glints
    const [sx, sy] = [links[mid].x, links[mid].y];
    ctx.globalCompositeOperation = 'lighter';
    const burst = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26);
    burst.addColorStop(0, rgba('#ffffff', 0.55));
    burst.addColorStop(0.4, rgba('#7fd8ff', 0.3));
    burst.addColorStop(1, rgba('#7fd8ff', 0));
    ctx.fillStyle = burst;
    ctx.fillRect(sx - 26, sy - 26, 52, 52);
    ctx.strokeStyle = rgba('#e8f8ff', 0.8);
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * 6, sy + Math.sin(a) * 6);
      ctx.lineTo(sx + Math.cos(a) * 14, sy + Math.sin(a) * 14);
      ctx.stroke();
    }
    ctx.restore();
  },
});

// ════════════════════════════ the Bifröst: Rainbow Bridge ════════════════════════════

registerTopping('bifrostSpan', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx, PIZZA_R * 0.84);
    // the Bifröst laid across the pie: a span of seven roasted pepper ribbons, red through to violet, arching from rim
    // to rim on a crystal deck of sliced onion, its far end burning (the bridge's fire), frost glittering on its edge
    const cols = ['#d8321e', '#f07a1a', '#f4c41a', '#5ab83a', '#2a9ad0', '#3a5ad0', '#8a4ac8'];
    const A: Pt = [C - 170, C + 70];
    const B: Pt = [C + 170, C - 30];
    const ctl: Pt = [C - 10, C - 110];
    // the crystal deck under the bands: a pale, glassy span with its shadow on the sauce
    const deck = bez(A, ctl, B, 48);
    ribbon(ctx, deck, () => 37);
    drop(ctx, 0.35, 3, 6);
    ribbon(ctx, deck, () => 35);
    const dg = ctx.createLinearGradient(C, C - 120, C, C + 80);
    dg.addColorStop(0, rgba('#f4fbff', 0.85));
    dg.addColorStop(1, rgba('#bcd8f0', 0.85));
    ctx.fillStyle = dg;
    ctx.fill();
    cols.forEach((col, i) => {
      const off = (i - 3) * 9.6;
      const pts = bez([A[0], A[1] + off], [ctl[0], ctl[1] + off], [B[0], B[1] + off], 48);
      ribbon(ctx, pts, (u) => 4.6 + Math.sin(u * 27 + i) * 0.35);
      const g = ctx.createLinearGradient(0, ctl[1] + off - 6, 0, ctl[1] + off + 6);
      g.addColorStop(0, col);
      g.addColorStop(1, col);
      ctx.fillStyle = col;
      ctx.fill();
      // the roasted pepper's char and gloss along each band
      ctx.strokeStyle = rgba('#2a0e04', 0.22);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      for (let k = 3; k < pts.length - 3; k += 4) {
        const [x, y] = pts[k];
        if (rand() < 0.35) {
          ctx.fillStyle = rgba('#3a1a08', 0.25);
          ellipse(ctx, x + (rand() - 0.5) * 4, y, 2 + rand() * 2, 1.2, rand());
          ctx.fill();
        }
        ctx.fillStyle = rgba('#ffffff', 0.32);
        ellipse(ctx, x, y - 1.6, 2.6, 0.8, 0.2);
        ctx.fill();
      }
    });
    // frost glittering along its near edge (the bridge is crystal and ice), and the fire at its far end
    const edge = bez([A[0], A[1] + 34], [ctl[0], ctl[1] + 34], [B[0], B[1] + 34], 30);
    for (let k = 1; k < edge.length - 1; k += 2) {
      const [x, y] = edge[k];
      ctx.fillStyle = rgba('#ffffff', 0.85);
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x + 1.2, y);
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x - 1.2, y);
      ctx.closePath();
      ctx.fill();
    }
    const fx = C + 130;
    const fy = C - 30;
    ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 46);
    fg.addColorStop(0, rgba('#fff0a0', 0.6));
    fg.addColorStop(0.5, rgba('#ff7a1a', 0.3));
    fg.addColorStop(1, rgba('#ff4a1a', 0));
    ctx.fillStyle = fg;
    ctx.fillRect(fx - 46, fy - 46, 92, 92);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 5; i++) {
      const x = fx - 22 + i * 11 + (rand() - 0.5) * 4;
      const h = 14 + rand() * 12;
      ctx.beginPath();
      ctx.moveTo(x - 5, fy + 10);
      ctx.quadraticCurveTo(x - 6, fy - h * 0.3, x + (rand() - 0.5) * 4, fy - h);
      ctx.quadraticCurveTo(x + 6, fy - h * 0.3, x + 5, fy + 10);
      ctx.closePath();
      const lg = ctx.createLinearGradient(0, fy + 10, 0, fy - h);
      lg.addColorStop(0, '#ff5a1a');
      lg.addColorStop(0.6, '#ffb020');
      lg.addColorStop(1, rgba('#fff4b0', 0.9));
      ctx.fillStyle = lg;
      ctx.fill();
    }
    ctx.restore();
  },
});

// ════════════════════════════ the Skald: Skald's Saga ════════════════════════════

registerTopping('meadGlaze', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx);
    // the mead of poetry the Skald drinks before he sings: a honey-mead glaze drizzled in a Norse knot (a triquetra at
    // the middle, its loops running out across the pie), glossy and amber, pooling where the lines cross
    const knot: Pt[] = [];
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * TAU;
      // a three-lobed knot curve
      const r = 64 + 50 * Math.cos(3 * t);
      knot.push([C + Math.cos(t) * r, C + Math.sin(t) * r]);
    }
    const strokeHoney = (pts: Pt[], w: number) => {
      curve(ctx, pts);
      ctx.strokeStyle = rgba('#5a2a04', 0.3);
      ctx.lineWidth = w + 2.4;
      ctx.save();
      ctx.translate(1.5, 2.5);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#c07818';
      ctx.lineWidth = w + 1;
      ctx.stroke();
      ctx.strokeStyle = '#f0b030';
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff2b0', 0.75);
      ctx.lineWidth = w * 0.3;
      ctx.save();
      ctx.translate(-0.8, -1);
      ctx.stroke();
      ctx.restore();
    };
    strokeHoney(knot, 4.2);
    // loose drizzle running off the knot towards the crust
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.6 + rand() * 0.3;
      const pts: Pt[] = [];
      for (let k = 0; k <= 10; k++) {
        const d = 95 + k * 6.5;
        pts.push([C + Math.cos(a + Math.sin(k * 0.9) * 0.12) * d, C + Math.sin(a + Math.sin(k * 0.9) * 0.12) * d]);
      }
      strokeHoney(pts, 2.4);
    }
    // pools of mead where the knot crosses itself
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + Math.PI / 3;
      const x = C + Math.cos(a) * 14;
      const y = C + Math.sin(a) * 14;
      ellipse(ctx, x, y, 6, 4.5, a);
      ctx.fillStyle = '#e89a20';
      ctx.fill();
      shine(ctx, x - 1.5, y - 1.5, 2.2, 1.2, 0.7);
    }
    ctx.restore();
  },
});

/** The Elder Futhark runes the Skald sings: each a few straight strokes on a 10×16 stave. */
const RUNES: [number, number, number, number][][] = [
  [[0, 8, 0, -8], [0, -8, 5, -4], [0, -2, 5, 2]], // fehu
  [[-3, 8, -3, -8], [-3, -8, 3, -4], [3, -4, 3, 8]], // uruz
  [[-2, 8, -2, -8], [-2, -4, 3, 0], [3, 0, -2, 4]], // thurisaz
  [[0, 8, 0, -8], [0, -8, 4, -5], [0, -3, 4, 0]], // ansuz
  [[-2, 8, -2, -8], [-2, -8, 3, -5], [3, -5, -2, -1], [-2, -1, 3, 8]], // raidho
  [[3, -8, -3, 0], [-3, 0, 3, 8]], // kenaz
  [[-4, -8, 4, 8], [4, -8, -4, 8]], // gebo
  [[-3, 8, -3, -8], [3, 8, 3, -8], [-3, -2, 3, 2]], // hagalaz
  [[0, -8, 0, 8], [-4, -8, 0, -3], [4, -8, 0, -3]], // algiz
  [[-3, -8, 3, -2], [3, -2, -3, 2], [-3, 2, 3, 8]], // sowilo
  [[0, -8, 0, 8], [0, -8, -4, -4], [0, -8, 4, -4]], // tiwaz
];

piece('skaldRunes', 2.2, {
  count: 5,
  minDist: 60,
  draw(ctx, rand) {
    // round rye crispbread off the Skald's longship, each with a rune of his saga burnt into it (some painted in his
    // red and blue), docked with little holes, its edge toasted darker
    const r = 11.5 + rand() * 1.5;
    blob(ctx, 0, 0, r + 0.8, 0.06, rand, 12);
    drop(ctx, 0.4, 1.5, 2.5);
    blob(ctx, 0, 0, r, 0.06, rand, 12);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 1, 0, 0, r);
    g.addColorStop(0, '#e8c080');
    g.addColorStop(0.6, '#c8904a');
    g.addColorStop(1, '#8a5420');
    ctx.fillStyle = g;
    ctx.fill();
    // the dock holes in rings
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + rand() * 0.2;
      const d = r * (i % 2 ? 0.78 : 0.62);
      ctx.fillStyle = rgba('#6a3a14', 0.55);
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, 0.8, 0.7);
      ctx.fill();
    }
    // the rune, burnt in, then (on some) painted
    const rune = RUNES[Math.floor(rand() * RUNES.length)];
    const paint = rand();
    const k = r / 15;
    const strokeRune = (col: string, w: number, dx = 0, dy = 0) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (const [x0, y0, x1, y1] of rune) {
        ctx.moveTo(x0 * k + dx, y0 * k + dy);
        ctx.lineTo(x1 * k + dx, y1 * k + dy);
      }
      ctx.stroke();
    };
    strokeRune(rgba('#fff0c0', 0.5), 2.6, 0.5, 0.6);
    strokeRune('#3a1a08', 2.4);
    if (paint < 0.35) strokeRune('#c8302a', 1.3);
    else if (paint < 0.6) strokeRune('#3a6aaa', 1.3);
    else strokeRune('#d8a83a', 1);
    shine(ctx, -r * 0.4, -r * 0.45, r * 0.35, r * 0.15, 0.3);
  },
});

// ════════════════════════════ Thrym: Frostbite ════════════════════════════

piece('thrymIce', 2.3, {
  count: 7,
  minDist: 62,
  draw(ctx, rand) {
    // mozzarella frozen into one of Thrym's ice blocks: a clear blue-white cube seen from above, the cheese a pale
    // ghost inside it, a crack running across, frost at its edges, glass-bright where the light hits its top
    const s = 9 + rand() * 2;
    const tilt = (rand() - 0.5) * 0.5;
    ctx.rotate(tilt);
    const top: Pt[] = [[-s, -s * 0.55], [s * 0.15, -s * 1.05], [s, -s * 0.35], [-s * 0.15, s * 0.15]];
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.55);
      ctx.lineTo(s * 0.15, -s * 1.05);
      ctx.lineTo(s, -s * 0.35);
      ctx.lineTo(s, s * 0.6);
      ctx.lineTo(-s * 0.15, s * 1.1);
      ctx.lineTo(-s, s * 0.4);
      ctx.closePath();
    };
    shape();
    drop(ctx, 0.3, 2, 3);
    // its sides, darker blue, and the top face lighter
    shape();
    ctx.fillStyle = rgba('#5aa0e0', 0.95);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, s * 0.15);
    ctx.lineTo(s, -s * 0.35);
    ctx.lineTo(s, s * 0.6);
    ctx.lineTo(-s * 0.15, s * 1.1);
    ctx.closePath();
    ctx.fillStyle = rgba('#2a6aac', 0.92);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (const [x, y] of top) ctx.lineTo(x, y);
    ctx.closePath();
    const tg = ctx.createLinearGradient(-s, -s, s, s * 0.2);
    tg.addColorStop(0, '#ffffff');
    tg.addColorStop(0.45, '#c8e8ff');
    tg.addColorStop(1, '#7ab8ec');
    ctx.fillStyle = tg;
    ctx.fill();
    // the mozzarella frozen inside, a soft pale shape seen through the ice
    ctx.fillStyle = rgba('#fffaf0', 0.45);
    ellipse(ctx, 0, s * 0.1, s * 0.5, s * 0.35, 0.3);
    ctx.fill();
    // the edges: a dark outline, then frosted
    shape();
    ctx.strokeStyle = rgba('#1a3a6a', 0.75);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (const [x, y] of top) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.strokeStyle = rgba('#f4fbff', 0.95);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // a crack across it
    ctx.strokeStyle = rgba('#ffffff', 0.9);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.2);
    ctx.lineTo(-s * 0.2, -s * 0.05);
    ctx.lineTo(0, s * 0.35);
    ctx.lineTo(s * 0.5, s * 0.45);
    ctx.stroke();
    ctx.strokeStyle = rgba('#2a5a8a', 0.5);
    ctx.lineWidth = 0.5;
    ctx.stroke();
    shine(ctx, -s * 0.35, -s * 0.55, s * 0.35, s * 0.12, 0.8, -0.4);
  },
});

piece('hailPearls', 1.4, {
  count: 10,
  minDist: 26,
  draw(ctx, rand) {
    // pearl onions frosted white like Thrym's hailstones: round and glassy, rimed, a cold glint on each
    const r = 4.2 + rand() * 1.4;
    ellipse(ctx, 0, 0, r, r);
    drop(ctx, 0.3, 1.2, 1.8);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 0.4, 0, 0, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#e4f2fc');
    g.addColorStop(1, '#a8c8e0');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#3a6a9a', 0.75);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // the onion's rings showing faintly through the frost
    ctx.strokeStyle = rgba('#c8b8a0', 0.35);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0.4, Math.PI * 1.4);
    ctx.stroke();
    // rime crystals on it
    ctx.strokeStyle = rgba('#ffffff', 0.9);
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const a = rand() * TAU;
      const x = Math.cos(a) * r * 0.6;
      const y = Math.sin(a) * r * 0.6;
      ctx.beginPath();
      ctx.moveTo(x - 1.2, y);
      ctx.lineTo(x + 1.2, y);
      ctx.moveTo(x, y - 1.2);
      ctx.lineTo(x, y + 1.2);
      ctx.stroke();
    }
    shine(ctx, -r * 0.35, -r * 0.4, r * 0.32, r * 0.18, 0.95);
  },
});

// ════════════════════════════ Surtr: Surtr's Ember Crust ════════════════════════════

piece('muspelCoals', 1.7, {
  count: 7,
  minDist: 44,
  draw(ctx, rand) {
    // nduja baked to coals from Muspelheim: black, blistered lava rock split by molten seams of orange and gold, still
    // glowing from inside, a heat haze of glow round each
    const r = 9 + rand() * 2.5;
    const g0 = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2);
    g0.addColorStop(0, rgba('#ff7a1a', 0.35));
    g0.addColorStop(1, rgba('#ff4a1a', 0));
    ctx.fillStyle = g0;
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
    blob(ctx, 0, 0, r, 0.22, rand, 9);
    drop(ctx, 0.45, 1.5, 2.5);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r);
    g.addColorStop(0, '#4a2a22');
    g.addColorStop(0.6, '#2a1614');
    g.addColorStop(1, '#140a0a');
    ctx.fillStyle = g;
    ctx.fill();
    // the molten seams: a branching crack, white-gold at its core
    const seams: Pt[][] = [];
    for (let i = 0; i < 3; i++) {
      const a = rand() * TAU;
      const pts: Pt[] = [[0, 0]];
      let x = 0;
      let y = 0;
      for (let k = 0; k < 3; k++) {
        x += Math.cos(a + (rand() - 0.5) * 1.2) * r * 0.3;
        y += Math.sin(a + (rand() - 0.5) * 1.2) * r * 0.3;
        pts.push([x, y]);
      }
      seams.push(pts);
    }
    for (const [w, col] of [[3, '#c83a0a'], [1.8, '#ff8a1a'], [0.7, '#fff2a0']] as [number, string][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      for (const s of seams) {
        curve(ctx, s);
        ctx.stroke();
      }
    }
    // a lick of flame off the top of one
    if (rand() < 0.5) {
      ctx.beginPath();
      ctx.moveTo(-3, -r * 0.5);
      ctx.quadraticCurveTo(-3, -r * 1.2, 0, -r * 1.55);
      ctx.quadraticCurveTo(3, -r * 1.1, 3, -r * 0.5);
      ctx.closePath();
      const fl = ctx.createLinearGradient(0, -r * 0.5, 0, -r * 1.55);
      fl.addColorStop(0, '#ff6a1a');
      fl.addColorStop(1, rgba('#fff0a0', 0.85));
      ctx.fillStyle = fl;
      ctx.fill();
    }
    shine(ctx, -r * 0.35, -r * 0.45, r * 0.25, r * 0.12, 0.25);
  },
});

registerTopping('surtrBlade', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx, PIZZA_R * 0.86);
    // Surtr's flaming sword laid across the pie: a long blade of fire-roasted red pepper, blackened at its spine and
    // glowing white-hot along its edge, flames streaming off it; its hilt of charred chorizo with a gold guard
    const a = -0.42;
    ctx.translate(C + 8, C + 4);
    ctx.rotate(a);
    const L = 250;
    // its heat on the cheese
    ctx.globalCompositeOperation = 'lighter';
    const heat = ctx.createLinearGradient(0, -30, 0, 30);
    heat.addColorStop(0, rgba('#ff6a1a', 0));
    heat.addColorStop(0.5, rgba('#ff6a1a', 0.32));
    heat.addColorStop(1, rgba('#ff6a1a', 0));
    ctx.fillStyle = heat;
    ctx.fillRect(-L * 0.6, -30, L * 1.25, 60);
    ctx.globalCompositeOperation = 'source-over';
    // flames streaming up off the edge
    for (let i = 0; i < 12; i++) {
      const x = -L * 0.42 + i * (L * 0.9) / 11 + (rand() - 0.5) * 5;
      const h = 22 + rand() * 18;
      ctx.beginPath();
      ctx.moveTo(x - 7, -8);
      ctx.quadraticCurveTo(x - 9, -h * 0.5, x - 2 + (rand() - 0.5) * 6, -h);
      ctx.quadraticCurveTo(x + 7, -h * 0.45, x + 7, -8);
      ctx.closePath();
      const fg = ctx.createLinearGradient(0, -2, 0, -h);
      fg.addColorStop(0, '#ff4a14');
      fg.addColorStop(0.55, '#ff9a1a');
      fg.addColorStop(1, rgba('#fff0a0', 0.8));
      ctx.fillStyle = fg;
      ctx.fill();
    }
    // the blade: shadow, body, spine and edge
    const blade = () => {
      ctx.beginPath();
      ctx.moveTo(-L * 0.46, -14);
      ctx.lineTo(L * 0.42, -10);
      ctx.lineTo(L * 0.56, 0);
      ctx.lineTo(L * 0.42, 10);
      ctx.lineTo(-L * 0.46, 14);
      ctx.closePath();
    };
    blade();
    drop(ctx, 0.45, 2, 4);
    blade();
    const bg = ctx.createLinearGradient(0, -14, 0, 14);
    bg.addColorStop(0, '#fff2a0');
    bg.addColorStop(0.25, '#ff8a1a');
    bg.addColorStop(0.55, '#c8321a');
    bg.addColorStop(1, '#5a140a');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = rgba('#2a0a04', 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    // the fuller down its middle, and the pepper's char
    ctx.strokeStyle = rgba('#5a140a', 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-L * 0.45, 1);
    ctx.lineTo(L * 0.45, 0.5);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = rgba('#1a0804', 0.35);
      ellipse(ctx, -L * 0.4 + rand() * L * 0.85, 2 + rand() * 2, 2 + rand() * 3, 1, 0);
      ctx.fill();
    }
    // the guard and the hilt
    roundRect(ctx, -L * 0.5, -24, 11, 48, 4);
    drop(ctx, 0.4, 1.5, 2.5);
    const gg = ctx.createLinearGradient(0, -24, 0, 24);
    gg.addColorStop(0, '#fff0a0');
    gg.addColorStop(0.5, '#d8a030');
    gg.addColorStop(1, '#8a5a10');
    ctx.fillStyle = gg;
    ctx.fill();
    roundRect(ctx, -L * 0.5 - 34, -6, 34, 12, 5);
    ctx.fillStyle = '#4a1a10';
    ctx.fill();
    ctx.strokeStyle = rgba('#d8a030', 0.8);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const x = -L * 0.5 - 30 + i * 6.5;
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.lineTo(x + 3.5, 6);
      ctx.stroke();
    }
    ellipse(ctx, -L * 0.5 - 37, 0, 7, 7);
    ctx.fillStyle = '#d8a030';
    ctx.fill();
    shine(ctx, -L * 0.5 - 38, -2, 2.6, 1.5, 0.7);
    ctx.restore();
  },
});

// ════════════════════════════ Jörmungandr: Serpent's Coil ════════════════════════════

registerTopping('jormCoil', {
  count: 1,
  draw(ctx) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx, PIZZA_R * 0.88);
    // the World Serpent coiled round the pie, biting its own tail: a courgette serpent in Jörmungandr's sea-green, a
    // row of scales down its back, its gold belly showing at the turns, its head at the top with a gold eye and the
    // tail in its jaws
    const R = PIZZA_R * 0.66;
    const head = -Math.PI / 2;
    const pts: Pt[] = [];
    // from just behind the head, round the pie, to the tail tip in its mouth
    for (let i = 0; i <= 90; i++) {
      const u = i / 90;
      const t = head + 0.32 + u * (TAU - 0.4);
      const r = R + Math.sin(u * TAU * 3) * 6;
      pts.push([C + Math.cos(t) * r, C + Math.sin(t) * r * 0.98]);
    }
    const w = (u: number) => 16 * (1 - Math.pow(u, 2.2) * 0.8) + 1;
    ribbon(ctx, pts, (u) => w(u) + 1.5);
    drop(ctx, 0.4, 2.5, 4);
    ribbon(ctx, pts, w);
    const body = ctx.createRadialGradient(C, C, R - 14, C, C, R + 14);
    body.addColorStop(0, '#1e5a40');
    body.addColorStop(0.45, '#3f8a6a');
    body.addColorStop(0.7, '#5fae86');
    body.addColorStop(1, '#2f6e56');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = rgba('#0e2a1e', 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    // the gold belly, showing along its inner edge
    ribbon(ctx, pts.map(([x, y]) => [C + (x - C) * 0.965, C + (y - C) * 0.965] as Pt), (u) => w(u) * 0.32);
    ctx.fillStyle = rgba('#e8d36a', 0.85);
    ctx.fill();
    // scales: overlapping arcs along its back, and a dark ridge
    for (let i = 2; i < pts.length - 4; i += 2) {
      const [x, y] = pts[i];
      const [nx, ny] = pts[i + 1];
      const a = Math.atan2(ny - y, nx - x);
      const ww = w(i / (pts.length - 1));
      for (const side of [-0.5, 0, 0.5]) {
        const sx = x - Math.sin(a) * ww * side;
        const sy = y + Math.cos(a) * ww * side;
        ctx.strokeStyle = rgba('#0e3a28', 0.45);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(sx, sy, ww * 0.32, a + Math.PI * 0.6, a + Math.PI * 1.4);
        ctx.stroke();
      }
      if (i % 4 === 0) {
        ctx.fillStyle = rgba('#a8e0b8', 0.35);
        ellipse(ctx, x - Math.sin(a) * ww * 0.45, y + Math.cos(a) * ww * 0.45, ww * 0.25, ww * 0.1, a);
        ctx.fill();
      }
    }
    // the head: a broad wedge with a gold eye, jaws closed on the tail tip
    const hx = C + Math.cos(head) * R;
    const hy = C + Math.sin(head) * R;
    ctx.save();
    ctx.translate(hx + 4, hy);
    ctx.rotate(Math.PI * 0.95);
    ctx.scale(1.35, 1.35);
    ctx.beginPath();
    ctx.moveTo(-14, -12);
    ctx.quadraticCurveTo(10, -16, 24, -4);
    ctx.quadraticCurveTo(28, 0, 24, 4);
    ctx.quadraticCurveTo(10, 16, -14, 12);
    ctx.quadraticCurveTo(-20, 0, -14, -12);
    ctx.closePath();
    drop(ctx, 0.45, 2, 3);
    const hg = ctx.createLinearGradient(0, -16, 0, 16);
    hg.addColorStop(0, '#5fae86');
    hg.addColorStop(0.5, '#3f8a6a');
    hg.addColorStop(1, '#1e5a40');
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = rgba('#0e2a1e', 0.7);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // its crest of spines
    ctx.fillStyle = '#e8d36a';
    for (let i = 0; i < 4; i++) {
      const x = -10 + i * 6;
      ctx.beginPath();
      ctx.moveTo(x - 2.5, -11 + i * 0.5);
      ctx.lineTo(x, -17 + i);
      ctx.lineTo(x + 2.5, -11 + i * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    // the eye
    ellipse(ctx, 6, -5, 4, 3);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    ellipse(ctx, 6.5, -5, 1, 2.6);
    ctx.fillStyle = '#1a1208';
    ctx.fill();
    shine(ctx, 5, -6.5, 1.2, 0.6, 0.9);
    // the mouth line, closed on its tail
    ctx.strokeStyle = rgba('#0e2a1e', 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(26, 1);
    ctx.quadraticCurveTo(12, 6, 0, 5);
    ctx.stroke();
    // a nostril and a fang showing
    ctx.fillStyle = '#0e2a1e';
    ellipse(ctx, 21, -3, 1, 0.7);
    ctx.fill();
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.moveTo(14, 4.6);
    ctx.lineTo(15.5, 9);
    ctx.lineTo(17, 4.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  },
});

piece('venomDrops', 1.3, {
  count: 7,
  minDist: 30,
  draw(ctx, rand) {
    // drops of Jörmungandr's venom, in basil oil: glossy green beads, the colour deepening at their heart, each with a
    // small spatter
    const r = 4.5 + rand() * 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.5);
    ctx.bezierCurveTo(r * 0.9, -r * 0.4, r, r * 0.3, r, r * 0.4);
    ctx.arc(0, r * 0.4, r, 0, Math.PI);
    ctx.bezierCurveTo(-r, r * 0.3, -r * 0.9, -r * 0.4, 0, -r * 1.5);
    ctx.closePath();
    drop(ctx, 0.35, 1.2, 2);
    const g = ctx.createRadialGradient(-r * 0.3, 0, 0.5, 0, r * 0.3, r * 1.4);
    g.addColorStop(0, '#d8ff8a');
    g.addColorStop(0.45, '#7ad83a');
    g.addColorStop(1, '#2a7a1a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#1a4a0e', 0.6);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    shine(ctx, -r * 0.3, 0, r * 0.26, r * 0.5, 0.75, 0.2);
    for (let i = 0; i < 3; i++) {
      const a = rand() * TAU;
      ctx.fillStyle = rgba('#7ad83a', 0.85);
      ellipse(ctx, Math.cos(a) * r * 1.8, Math.sin(a) * r * 1.6 + r * 0.4, 0.9 + rand() * 0.6, 0.8);
      ctx.fill();
    }
  },
});

// ════════════════════════════ the Echo Phantom: Echo Slice ════════════════════════════

/** The Echo Phantom's glitch: everything has a cyan and a magenta double, slipped either side of it. */
const ECHO_A = '#7df9ff';
const ECHO_B = '#ff3df0';

function pepperoniDisc(ctx: Ctx, r: number, rand: () => number): void {
  ellipse(ctx, 0, 0, r, r);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
  g.addColorStop(0, '#d8483a');
  g.addColorStop(0.7, '#a8281e');
  g.addColorStop(1, '#6a140e');
  ctx.fillStyle = g;
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = rand() * TAU;
    const d = rand() * r * 0.65;
    ctx.fillStyle = rgba('#f0b0a0', 0.5);
    ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, 1.4, 1.1);
    ctx.fill();
  }
}

piece('echoPepperoni', 1.5, {
  count: 8,
  minDist: 40,
  draw(ctx, rand) {
    // pepperoni with its echo: a cyan double slipped one way and a magenta one the other, see-through, the way the
    // Echo Phantom flickers between two places
    const r = 10 + rand() * 1.5;
    const off = 3 + rand() * 1.5;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(-off, -off * 0.3);
    ellipse(ctx, 0, 0, r, r);
    ctx.fillStyle = ECHO_A;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.translate(off, off * 0.3);
    ellipse(ctx, 0, 0, r, r);
    ctx.fillStyle = ECHO_B;
    ctx.fill();
    ctx.restore();
    ellipse(ctx, 0, 0, r, r);
    drop(ctx, 0.3, 1.5, 2.5);
    pepperoniDisc(ctx, r, rand);
    // a glitch: a thin band of it slipped sideways
    const y = (rand() - 0.5) * r;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-r - 4, y - 1.3, r * 2 + 8, 2.6);
    ctx.clip();
    ctx.translate(rand() < 0.5 ? -3 : 3, 0);
    ellipse(ctx, 0, 0, r, r);
    ctx.fillStyle = rgba(ECHO_A, 0.75);
    ctx.fill();
    ctx.restore();
    shine(ctx, -r * 0.35, -r * 0.4, r * 0.3, r * 0.14, 0.4);
  },
});

piece('echoBasil', 1.4, {
  count: 4,
  minDist: 48,
  draw(ctx, rand) {
    // a basil leaf and its echo, a cyan ghost of it a little turned
    const leaf = (w: number) => {
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.quadraticCurveTo(-2, -w, 9, 0);
      ctx.quadraticCurveTo(-2, w, -9, 0);
      ctx.closePath();
    };
    ctx.save();
    ctx.rotate(0.35);
    ctx.translate(-2, -3);
    leaf(6.5);
    ctx.fillStyle = rgba(ECHO_A, 0.45);
    ctx.fill();
    ctx.restore();
    leaf(6.5);
    drop(ctx, 0.25, 1, 2);
    const g = ctx.createLinearGradient(-9, -6, 9, 6);
    g.addColorStop(0, '#5ab83a');
    g.addColorStop(1, '#2a7a1e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#d8ffb0', 0.6);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    if (rand() < 0.5) shine(ctx, -2, -2.5, 3, 1, 0.35, 0);
  },
});

registerTopping('echoGlitch', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx, PIZZA_R * 0.86);
    // the Echo Phantom's glitch across the whole pie: a few bands of it slipped sideways (a copy of the pie as baked so
    // far, shifted), fringed cyan and magenta, and faint scanlines, as if the pie were half here and half an echo
    const cv = ctx.canvas as HTMLCanvasElement;
    const k = cv.width / PIZZA_SIZE;
    for (let i = 0; i < 4; i++) {
      const y = C - 120 + i * 70 + rand() * 30;
      const h = 6 + rand() * 9;
      const dx = (rand() < 0.5 ? -1 : 1) * (7 + rand() * 9);
      ctx.drawImage(cv, 0, y * k, cv.width, h * k, dx, y, PIZZA_SIZE, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(dx < 0 ? ECHO_A : ECHO_B, 0.22);
      ctx.fillRect(0, y, PIZZA_SIZE, h);
      ctx.fillStyle = rgba(dx < 0 ? ECHO_B : ECHO_A, 0.35);
      ctx.fillRect(0, y - 1, PIZZA_SIZE, 1);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = rgba('#ffffff', 0.06);
    for (let y = 0; y < PIZZA_SIZE; y += 4) ctx.fillRect(0, y, PIZZA_SIZE, 1.2);
    // a soft cyan bloom at the centre: the echo's heart
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(C, C, 0, C, C, 150);
    g.addColorStop(0, rgba(ECHO_A, 0.16));
    g.addColorStop(1, rgba(ECHO_A, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.restore();
  },
});
