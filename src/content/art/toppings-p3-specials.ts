// Toppings for the phase 3 Chef's Specials in src/content/pizzas/p3.ts (Pugliese to Hot Honey Chicken).
//
// Piece toppings draw one piece centred at the origin, already translated and rotated by the caller.
// Overlays (count 1) reset the transform and paint across the whole 400x400 pizza top: the garlic
// butter glaze, the bolognese ragù, the olive oil drizzle and the sloppy joe mince. Registered toppings
// are drawn after the built-in ones, so the ragù and the mince put their own garnish back on top.

import { PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
import { drawExtraTopping } from '../../art/toppingsExtra';
import { type Ctx, blob, ellipse, rgba, shade } from '../../art/util';

const C = PIZZA_SIZE / 2;

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

function overlay(ctx: Ctx): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Draw `fn` at (x, y) rotated by `rot`, in the current (overlay) frame. */
function at(ctx: Ctx, x: number, y: number, rot: number, fn: () => void, s = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (s !== 1) ctx.scale(s, s);
  fn();
  ctx.restore();
}

/** Poisson-ish scatter of points inside radius `r` of the centre (overlay coords). */
function spread(n: number, minDist: number, rand: () => number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let tries = 0; pts.length < n && tries < n * 80; tries++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * r;
    const x = C + Math.cos(a) * d;
    const y = C + Math.sin(a) * d;
    if (pts.every(([px, py]) => (px - x) ** 2 + (py - y) ** 2 > minDist * minDist)) pts.push([x, y]);
  }
  return pts;
}

/** A sauce line traced through points, with a dark under-stroke, a body and a highlight. */
function sauceLine(ctx: Ctx, pts: [number, number][], body: string, under: string, hi: string, w: number): void {
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  trace();
  ctx.strokeStyle = rgba(under, 0.45);
  ctx.lineWidth = w + 2;
  ctx.save();
  ctx.translate(1.2, 2);
  ctx.stroke();
  ctx.restore();
  trace();
  ctx.strokeStyle = body;
  ctx.lineWidth = w;
  ctx.stroke();
  trace();
  ctx.strokeStyle = hi;
  ctx.lineWidth = Math.max(1, w * 0.35);
  ctx.save();
  ctx.translate(-w * 0.2, -w * 0.2);
  ctx.stroke();
  ctx.restore();
}

// ——— Pieces ———

piece('sunDried', 1.25, {
  count: 10,
  minDist: 34,
  draw(ctx, rand) {
    // a wrinkly, oily strip of sun-dried tomato
    const L = 15 + rand() * 4;
    const W = 6 + rand() * 1.5;
    const edge = () => {
      ctx.beginPath();
      ctx.moveTo(-L, 0);
      for (let i = 0; i <= 6; i++) {
        const x = -L + (i / 6) * L * 2;
        ctx.lineTo(x, -W - (i % 2 ? 1.6 : -0.6) - Math.sin((i / 6) * Math.PI) * 2);
      }
      ctx.quadraticCurveTo(L + 3, 0, L, W * 0.6);
      for (let i = 6; i >= 0; i--) {
        const x = -L + (i / 6) * L * 2;
        ctx.lineTo(x, W + (i % 2 ? 1.4 : -0.4) + Math.sin((i / 6) * Math.PI) * 1.5);
      }
      ctx.quadraticCurveTo(-L - 3, 0, -L, -W * 0.5);
      ctx.closePath();
    };
    edge();
    drop(ctx, 0.35);
    const g = ctx.createLinearGradient(0, -W, 0, W);
    g.addColorStop(0, '#c0381c');
    g.addColorStop(0.55, '#8e1e10');
    g.addColorStop(1, '#5a0e06');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade('#8e1e10', -0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    // wrinkles
    ctx.strokeStyle = rgba('#3a0602', 0.6);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const x = -L * 0.75 + i * L * 0.5 + (rand() - 0.5) * 3;
      ctx.beginPath();
      ctx.moveTo(x - 2, -W * 0.7);
      ctx.quadraticCurveTo(x + 2, 0, x - 1, W * 0.7);
      ctx.stroke();
    }
    // oily sheen
    ctx.strokeStyle = rgba('#ffc8a0', 0.7);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-L * 0.6, -W * 0.45);
    ctx.quadraticCurveTo(0, -W * 0.8, L * 0.5, -W * 0.4);
    ctx.stroke();
    shine(ctx, -L * 0.3, -W * 0.4, 3, 1.1, 0.75);
  },
});

piece('pineNut', 1.3, {
  count: 14,
  minDist: 22,
  draw(ctx, rand) {
    // a little cluster of toasted pine nuts
    const n = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand();
      ctx.save();
      ctx.translate(Math.cos(a) * 4.5, Math.sin(a) * 4.5);
      ctx.rotate(a + rand() * 0.8);
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.quadraticCurveTo(-4, -3.2, 1, -2.8);
      ctx.quadraticCurveTo(5.5, -1.2, 5.5, 0);
      ctx.quadraticCurveTo(5.5, 1.2, 1, 2.8);
      ctx.quadraticCurveTo(-4, 3.2, -5, 0);
      ctx.closePath();
      drop(ctx, 0.3, 1, 1.5);
      const g = ctx.createLinearGradient(-5, 0, 5.5, 0);
      g.addColorStop(0, '#f8ecc4');
      g.addColorStop(0.6, '#ecd294');
      g.addColorStop(1, '#c07a2a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = shade('#d8b46a', -0.45);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      shine(ctx, -1.5, -1.2, 2.2, 0.8, 0.75);
      ctx.restore();
    }
  },
});

piece('tuna', 1.35, {
  count: 11,
  minDist: 34,
  draw(ctx, rand) {
    // a chunk of flaked tuna: pale pinky-beige, broken by light cracks into layered flakes
    ctx.save();
    ctx.scale(1.2, 0.9);
    blob(ctx, 0, 0, 12, 0.5, rand, 9);
    ctx.restore();
    drop(ctx, 0.3);
    const g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 15);
    g.addColorStop(0, '#fce6d2');
    g.addColorStop(0.6, '#f0c4a2');
    g.addColorStop(1, '#c88a62');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#9a5a36';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    // faint muscle layers running across
    ctx.strokeStyle = rgba('#a86c50', 0.35);
    ctx.lineWidth = 1;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-16, k * 3.4);
      ctx.quadraticCurveTo(0, k * 3.4 - 3, 16, k * 3.4 + 1);
      ctx.stroke();
    }
    // flake cracks: a pale line with a shadowed edge
    for (let k = 0; k < 1; k++) {
      const x = 2 + (rand() - 0.5) * 3;
      ctx.beginPath();
      ctx.moveTo(x - 2, -12);
      ctx.lineTo(x + 1.5, -3);
      ctx.lineTo(x - 1, 3);
      ctx.lineTo(x + 2, 12);
      ctx.strokeStyle = rgba('#8a5038', 0.55);
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff6ee', 0.9);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
    shine(ctx, -5, -5, 4, 1.4, 0.55);
  },
});

piece('sweetcorn', 1.3, {
  count: 14,
  minDist: 22,
  draw(ctx, rand) {
    // a small cluster of plump yellow kernels
    const n = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.5;
      const d = i === 0 ? 0 : 5.5;
      ctx.save();
      ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
      ctx.rotate(rand() * 3);
      ctx.beginPath();
      ctx.moveTo(-3.2, -3.4);
      ctx.quadraticCurveTo(0, -4.6, 3.2, -3.4);
      ctx.quadraticCurveTo(4.2, 0, 2.6, 3.6);
      ctx.quadraticCurveTo(0, 4.6, -2.6, 3.6);
      ctx.quadraticCurveTo(-4.2, 0, -3.2, -3.4);
      ctx.closePath();
      drop(ctx, 0.3, 1, 1.5);
      const g = ctx.createRadialGradient(-1, -1.5, 0.5, 0, 0, 5);
      g.addColorStop(0, '#fff28a');
      g.addColorStop(0.6, '#ffd21e');
      g.addColorStop(1, '#e8a00a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = shade('#f0b818', -0.45);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // the pale germ dent
      ctx.fillStyle = rgba('#fff8d0', 0.8);
      ellipse(ctx, 0, 1.6, 1.3, 0.9);
      ctx.fill();
      shine(ctx, -1.2, -1.6, 1.6, 0.8, 0.8);
      ctx.restore();
    }
  },
});

piece('meatball', 1.5, {
  count: 9,
  minDist: 50,
  draw(ctx, rand) {
    // a browned meatball, kept browner than the ragù so it pops off the sauce
    const r = 15;
    ellipse(ctx, 0, 0, r, r);
    drop(ctx, 0.5, 2.5, 4);
    const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, r);
    g.addColorStop(0, '#d89462');
    g.addColorStop(0.45, '#a0582e');
    g.addColorStop(1, '#4e2410');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade('#7a3c1c', -0.45);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // seared, crumbly surface
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * (r - 4);
      blob(ctx, Math.cos(a) * d, Math.sin(a) * d, 1.2 + rand() * 1.4, 0.6, rand, 5);
      ctx.fillStyle = rgba(i % 3 ? '#4a1e08' : '#e8b080', 0.5);
      ctx.fill();
    }
    // herb flecks
    ctx.fillStyle = '#3a7a22';
    for (let i = 0; i < 5; i++) ctx.fillRect((rand() - 0.5) * 18, (rand() - 0.5) * 18, 2, 1.5);
    shine(ctx, -6, -7, 5, 2.2, 0.65);
  },
});

piece('jerkChicken', 1.3, {
  count: 10,
  minDist: 38,
  draw(ctx, rand) {
    // a long charred jerk chicken strip: orange-red glaze, black spice crust, grill marks
    ctx.save();
    ctx.scale(1.4, 0.78);
    blob(ctx, 0, 0, 12, 0.35, rand, 10);
    ctx.restore();
    drop(ctx, 0.4);
    const g = ctx.createRadialGradient(-4, -3, 1, 0, 0, 17);
    g.addColorStop(0, '#ff9a3a');
    g.addColorStop(0.5, '#d8541a');
    g.addColorStop(0.85, '#7a240a');
    g.addColorStop(1, '#2a0c04');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#2a0c04';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    // grill marks across the strip
    ctx.strokeStyle = rgba('#1e0802', 0.85);
    ctx.lineWidth = 2.4;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 6.5 - 4, -12);
      ctx.lineTo(i * 6.5 + 4, 12);
      ctx.stroke();
    }
    // charred spice patches
    for (let i = 0; i < 4; i++) {
      blob(ctx, (rand() - 0.5) * 26, (rand() - 0.5) * 12, 1.6 + rand() * 2, 0.6, rand, 6);
      ctx.fillStyle = rgba('#2a0e04', 0.7);
      ctx.fill();
    }
    ctx.restore();
    // allspice and thyme specks, then the sticky glaze shine
    ctx.fillStyle = rgba('#ffc060', 0.8);
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, (rand() - 0.5) * 22, (rand() - 0.5) * 9, 0.9, 0.9);
      ctx.fill();
    }
    ctx.fillStyle = '#3a6a1c';
    for (let i = 0; i < 3; i++) ctx.fillRect((rand() - 0.5) * 22, (rand() - 0.5) * 9, 1.6, 1.2);
    shine(ctx, -5, -4, 6, 1.6, 0.6);
  },
});

piece('scotchBonnet', 1.3, {
  count: 8,
  minDist: 34,
  draw(ctx, rand) {
    // a squat, lobed lantern chilli seen from above, with its green stalk
    const cols = ['#ff7a10', '#e8240c', '#ffc016'];
    const col = cols[Math.floor(rand() * 3)];
    const r = 9;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rr = r * (1 + Math.cos(a * 4) * 0.12);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    drop(ctx, 0.35);
    const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, r * 1.1);
    g.addColorStop(0, shade(col, 0.35));
    g.addColorStop(0.7, col);
    g.addColorStop(1, shade(col, -0.25));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade(col, -0.45);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // lobe creases
    ctx.strokeStyle = rgba(shade(col, -0.45), 0.6);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
      ctx.lineTo(Math.cos(a) * (r - 1), Math.sin(a) * (r - 1));
      ctx.stroke();
    }
    // stalk
    ctx.fillStyle = '#3f8a22';
    ellipse(ctx, 0, 0, 3.2, 3.2);
    ctx.fill();
    ctx.strokeStyle = '#1e4a10';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#4c9a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(3, -2, 5, -5);
    ctx.stroke();
    shine(ctx, -4, -4, 2.6, 1.2, 0.75);
  },
});

piece('springOnion', 1.3, {
  count: 13,
  minDist: 22,
  draw(ctx, rand) {
    // a few bright green spring onion rings, a couple sliced on the bias
    const n = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand();
      const x = Math.cos(a) * 5;
      const y = Math.sin(a) * 5;
      const rx = 3.6 + rand() * 0.8;
      const ry = rand() < 0.5 ? rx : rx * 0.6;
      const rot = rand() * 3;
      ellipse(ctx, x, y, rx, ry, rot);
      ctx.strokeStyle = rgba('#14380a', 0.4);
      ctx.lineWidth = 3.6;
      ctx.save();
      ctx.translate(0.8, 1.2);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#2f8a1e';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = '#7ad04a';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // pale inner layer
      ellipse(ctx, x, y, rx - 1.8, Math.max(0.6, ry - 1.8), rot);
      ctx.strokeStyle = rgba('#e4f8c0', 0.85);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  },
});

piece('chorizo', 1.15, {
  count: 11,
  minDist: 40,
  draw(ctx, rand) {
    const r = 17 + rand() * 2;
    // paprika oil halo bleeding into the cheese
    blob(ctx, 0, 0, r + 6, 0.25, rand, 10);
    ctx.fillStyle = rgba('#ff7a14', 0.35);
    ctx.fill();
    ellipse(ctx, 0, 0, r, r);
    drop(ctx, 0.4);
    const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, r);
    g.addColorStop(0, '#f07a32');
    g.addColorStop(0.65, '#cc4418');
    g.addColorStop(1, '#8a240a');
    ctx.fillStyle = g;
    ctx.fill();
    // coarse marbled meat: dark chunks and big white fat flecks, coarser than pepperoni
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * (r - 5);
      blob(ctx, Math.cos(a) * d, Math.sin(a) * d, 2.4 + rand() * 2, 0.6, rand, 6);
      ctx.fillStyle = rgba('#7a1a06', 0.65);
      ctx.fill();
    }
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * (r - 4);
      blob(ctx, Math.cos(a) * d, Math.sin(a) * d, 1.6 + rand() * 1.6, 0.6, rand, 6);
      ctx.fillStyle = rgba('#fff0dc', 0.9);
      ctx.fill();
    }
    // casing ring
    ctx.strokeStyle = shade('#cc4418', -0.45);
    ctx.lineWidth = 2.6;
    ellipse(ctx, 0, 0, r - 1, r - 1);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffb070', 0.5);
    ctx.lineWidth = 1;
    ellipse(ctx, 0, 0, r - 3.5, r - 3.5);
    ctx.stroke();
    shine(ctx, -r * 0.35, -r * 0.4, r * 0.32, r * 0.13, 0.6);
  },
});

piece('yellowTomato', 1.0, {
  count: 7,
  minDist: 38,
  draw(ctx, rand) {
    // the built-in tomato slice, ripened golden
    ellipse(ctx, 0, 0, 17, 17);
    drop(ctx, 0.3);
    const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, 17);
    g.addColorStop(0, '#ffd23a');
    g.addColorStop(1, '#f0a010');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade('#f0a010', -0.45);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ffe890';
    const off = rand() * 0.6;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + off;
      ellipse(ctx, Math.cos(a) * 8, Math.sin(a) * 8, 5, 3.5, a);
      ctx.fill();
    }
    ctx.fillStyle = '#fff8d8';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + off;
      ellipse(ctx, Math.cos(a) * 9, Math.sin(a) * 9, 1.2, 1.2);
      ctx.fill();
    }
    shine(ctx, -5, -7, 5, 2, 0.55);
  },
});

piece('broccoli', 1.3, {
  count: 10,
  minDist: 34,
  draw(ctx, rand) {
    // a floret from above: a short pale stalk under a bumpy crown of buds
    ctx.beginPath();
    ctx.moveTo(-3, 4);
    ctx.lineTo(-2.4, 15);
    ctx.quadraticCurveTo(0, 17, 2.4, 15);
    ctx.lineTo(3, 4);
    ctx.closePath();
    ctx.fillStyle = '#a8d070';
    ctx.fill();
    ctx.strokeStyle = shade('#a8d070', -0.45);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    const buds: [number, number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rand() * 0.3;
      buds.push([Math.cos(a) * 6.5, Math.sin(a) * 6.5 - 2, 5 + rand() * 1.2]);
    }
    buds.push([0, -2, 6]);
    ctx.fillStyle = rgba('#0e2a06', 0.4);
    for (const [x, y, r] of buds) {
      ellipse(ctx, x + 1.5, y + 2.5, r, r);
      ctx.fill();
    }
    for (const [x, y, r] of buds) {
      const g = ctx.createRadialGradient(x - 1.5, y - 1.5, 0.5, x, y, r);
      g.addColorStop(0, '#6ab83a');
      g.addColorStop(0.7, '#2f7a1e');
      g.addColorStop(1, '#1e5212');
      ellipse(ctx, x, y, r, r);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = shade('#2f7a1e', -0.45);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // bud texture dots
    ctx.fillStyle = rgba('#a8e070', 0.8);
    for (let i = 0; i < 10; i++) {
      ellipse(ctx, (rand() - 0.5) * 16, (rand() - 0.5) * 14 - 2, 0.9, 0.9);
      ctx.fill();
    }
    shine(ctx, -4, -6, 3, 1.3, 0.45);
  },
});

piece('friedChicken', 1.3, {
  count: 10,
  minDist: 36,
  draw(ctx, rand) {
    // a craggy golden fried chicken bite
    blob(ctx, 0, 0, 12.5, 0.32, rand, 16);
    drop(ctx, 0.4);
    const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 14);
    g.addColorStop(0, '#ffe696');
    g.addColorStop(0.55, '#f0aa3a');
    g.addColorStop(1, '#b0661a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade('#c8781e', -0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    // crags: darker pits with bright ridges beside them
    for (let i = 0; i < 8; i++) {
      const x = (rand() - 0.5) * 17;
      const y = (rand() - 0.5) * 17;
      blob(ctx, x, y, 1.6 + rand() * 1.6, 0.6, rand, 6);
      ctx.fillStyle = rgba('#7a3a08', 0.55);
      ctx.fill();
      ellipse(ctx, x - 1.4, y - 1.4, 1.3, 0.9, -0.6);
      ctx.fillStyle = rgba('#fff0b0', 0.75);
      ctx.fill();
    }
    shine(ctx, -4, -5, 4, 1.5, 0.5);
  },
});

// ——— Overlays ———

/** Trace the union of wobbly heaps as one path (smooth subpaths), so heaps merge into one layer. */
function heapLayer(ctx: Ctx, heaps: [number, number, number][], rand: () => number): void {
  ctx.beginPath();
  for (const [x, y, r] of heaps) {
    const n = 10;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.8 + rand() * 0.4);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    for (let i = 0; i <= n; i++) {
      const p0 = pts[i % n];
      const p1 = pts[(i + 1) % n];
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
    }
    ctx.closePath();
  }
}

/** Paint the current heap path: drop shadow, outer edge (stroked under, so inner seams vanish), body. */
function paintLayer(ctx: Ctx, body: string | CanvasGradient, edge: string, shadow: string): void {
  ctx.save();
  ctx.translate(2, 3);
  ctx.fillStyle = shadow;
  ctx.fill('nonzero');
  ctx.restore();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.fill('nonzero');
}

registerTopping('garlicButter', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // brush the crust with butter: a golden toasted ring that reads as garlic bread
    ctx.save();
    ellipse(ctx, C, C, PIZZA_R - 2, PIZZA_R - 2);
    ellipse(ctx, C, C, PIZZA_R * 0.8, PIZZA_R * 0.8);
    ctx.clip('evenodd');
    const rg = ctx.createRadialGradient(C, C, PIZZA_R * 0.8, C, C, PIZZA_R);
    rg.addColorStop(0, rgba('#ffcc3a', 0.6));
    rg.addColorStop(0.6, rgba('#f0a81e', 0.4));
    rg.addColorStop(1, rgba('#a85a10', 0.25));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const d = PIZZA_R * 0.84 + rand() * 20;
      blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 3 + rand() * 5, 0.6, rand, 7);
      ctx.fillStyle = rgba('#8a4a0c', 0.35);
      ctx.fill();
    }
    ctx.strokeStyle = rgba('#fff6c8', 0.7);
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
      ctx.beginPath();
      ctx.arc(C, C, PIZZA_R * 0.9 + (rand() - 0.5) * 8, a, a + 0.25 + rand() * 0.2);
      ctx.stroke();
    }
    ctx.restore();
    // a thin golden glaze over the whole white top
    const R = PIZZA_R * 0.8;
    const wash = ctx.createRadialGradient(C - 40, C - 40, 10, C, C, R);
    wash.addColorStop(0, rgba('#ffd84a', 0.18));
    wash.addColorStop(1, rgba('#e89a1a', 0.3));
    ellipse(ctx, C, C, R, R);
    ctx.fillStyle = wash;
    ctx.fill();
    // flat, irregular melted-butter puddles with browned, sizzled edges
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 112;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 16 + rand() * 14;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * 3);
      ctx.scale(1.4, 0.75);
      blob(ctx, 0, 0, r, 0.5, rand, 11);
      ctx.restore();
      ctx.fillStyle = rgba('#f8c232', 0.3);
      ctx.fill();
      ellipse(ctx, x - r * 0.3, y - r * 0.25, r * 0.3, r * 0.08, -0.5);
      ctx.fillStyle = rgba('#ffffff', 0.6);
      ctx.fill();
    }
    // toasted golden-brown spots across the top
    for (let i = 0; i < 34; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 135;
      blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 2 + rand() * 4, 0.6, rand, 6);
      ctx.fillStyle = rgba('#b0600e', 0.35 + rand() * 0.25);
      ctx.fill();
    }
    // golden toasted minced garlic on top of the butter
    for (let i = 0; i < 34; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 130;
      at(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, rand() * 6.3, () => {
        blob(ctx, 0, 0, 3 + rand() * 1.6, 0.5, rand, 5);
        ctx.fillStyle = rand() < 0.5 ? '#fff2c4' : '#f0c870';
        ctx.fill();
        ctx.strokeStyle = rgba('#a8701e', 0.8);
        ctx.lineWidth = 0.9;
        ctx.stroke();
      });
    }
  },
});

registerTopping('ragu', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // spoonfuls of rich ragù merged into one saucy layer, with melted cheese peeking through
    const R = PIZZA_R * 0.74;
    const heaps = spread(13, 34, rand, R - 20).map(([x, y]): [number, number, number] => [x, y, 22 + rand() * 6]);
    heapLayer(ctx, heaps, rand);
    const g = ctx.createRadialGradient(C - 40, C - 40, 10, C, C, R);
    g.addColorStop(0, '#cc3c1c');
    g.addColorStop(1, '#8e200c');
    paintLayer(ctx, g, '#4a0a02', rgba('#3a0a02', 0.35));
    // browned mince bits through the sauce
    for (let i = 0; i < 280; i++) {
      const [sx, sy, sr] = heaps[i % heaps.length];
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * (sr - 4);
      blob(ctx, sx + Math.cos(a) * d, sy + Math.sin(a) * d, 1.5 + rand() * 1.8, 0.7, rand, 6);
      ctx.fillStyle = ['#6a2a12', '#4e1a08', '#8a3a1a'][i % 3];
      ctx.fill();
    }
    // diced carrot and glossy sauce glints
    for (let i = 0; i < 30; i++) {
      const [sx, sy, sr] = heaps[i % heaps.length];
      const a = rand() * Math.PI * 2;
      const d = rand() * (sr - 6);
      ctx.fillStyle = '#f07a1e';
      ctx.fillRect(sx + Math.cos(a) * d, sy + Math.sin(a) * d, 2.4, 2.4);
    }
    for (const [x, y] of heaps) {
      ellipse(ctx, x - 7, y - 8, 5, 1.6, -0.6);
      ctx.fillStyle = rgba('#ffffff', 0.4);
      ctx.fill();
    }
    // the parmesan and basil sit under this layer, so scatter a fresh garnish back on top
    for (let i = 0; i < 18; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * (R - 10);
      at(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, rand() * 6.3, () => {
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.lineTo(7, -4);
        ctx.lineTo(5, 3);
        ctx.lineTo(-5, 4);
        ctx.closePath();
        ctx.fillStyle = '#fff6d8';
        ctx.fill();
        ctx.strokeStyle = rgba('#b8a070', 0.7);
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rand();
      const d = 40 + rand() * (R - 60);
      at(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, rand() * 6.3, () => {
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.quadraticCurveTo(0, -15, 15, 0);
        ctx.quadraticCurveTo(0, 15, -15, 0);
        const lg = ctx.createLinearGradient(0, -11, 0, 11);
        lg.addColorStop(0, shade('#2f8a2a', 0.25));
        lg.addColorStop(1, shade('#2f8a2a', -0.35));
        ctx.fillStyle = lg;
        ctx.fill();
        ctx.strokeStyle = shade('#2f8a2a', -0.5);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-13, 0);
        ctx.lineTo(13, 0);
        ctx.strokeStyle = rgba('#cdf0a0', 0.6);
        ctx.stroke();
      });
    }
  },
});

registerTopping('oliveOil', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a few loose threads of golden-green olive oil, poured freehand, with glints
    for (let s = 0; s < 3; s++) {
      const pts: [number, number][] = [];
      let a = rand() * Math.PI * 2;
      const sa = (s / 3) * Math.PI * 2 + rand();
      let x = C + Math.cos(sa) * 75;
      let y = C + Math.sin(sa) * 75;
      for (let i = 0; i < 26; i++) {
        if ((x - C) ** 2 + (y - C) ** 2 > 140 ** 2) {
          // turn back towards the middle at the sauce edge
          a = Math.atan2(C - y, C - x) + (rand() - 0.5);
        }
        pts.push([x, y]);
        a += (rand() - 0.5) * 0.9;
        x += Math.cos(a) * 11;
        y += Math.sin(a) * 11;
      }
      sauceLine(ctx, pts, rgba('#c4b222', 0.85), '#4a4208', rgba('#fffac0', 0.9), 3.4);
    }
    // oil beads pooling on the top
    for (let i = 0; i < 10; i++) {
      const a = rand() * Math.PI * 2;
      const d = 20 + rand() * 115;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 3 + rand() * 4;
      ellipse(ctx, x, y, r, r * 0.75, rand() * 3);
      ctx.fillStyle = rgba('#d0bc22', 0.6);
      ctx.fill();
      ctx.strokeStyle = rgba('#6a5a08', 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
      ellipse(ctx, x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.18, -0.6);
      ctx.fillStyle = rgba('#ffffff', 0.85);
      ctx.fill();
    }
  },
});

registerTopping('sloppyMince', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a messy, saucy layer of mince over most of the bbq base, slopping over the crust in places
    const R = PIZZA_R * 0.78;
    const heaps = spread(30, 20, rand, R - 12).map(([x, y]): [number, number, number] => [x, y, 22 + rand() * 8]);
    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2;
      heaps.push([C + Math.cos(a) * (R + 4), C + Math.sin(a) * (R + 4), 16 + rand() * 4]);
    }
    heapLayer(ctx, heaps, rand);
    const g = ctx.createRadialGradient(C - 40, C - 40, 10, C, C, R + 20);
    g.addColorStop(0, '#a83a1a');
    g.addColorStop(1, '#6a1e0a');
    paintLayer(ctx, g, '#2a0802', rgba('#2a0802', 0.4));
    // chunky mince crumbs, bigger and browner than the bolognese ragù
    for (let i = 0; i < 380; i++) {
      const [hx, hy, hr] = heaps[i % heaps.length];
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * (hr - 5);
      blob(ctx, hx + Math.cos(a) * d, hy + Math.sin(a) * d, 2.2 + rand() * 2.4, 0.7, rand, 6);
      ctx.fillStyle = ['#8a4424', '#6a2e14', '#a85a30'][i % 3];
      ctx.fill();
      ctx.strokeStyle = rgba('#2a0c02', 0.6);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    // sticky sauce glints
    for (let i = 0; i < 26; i++) {
      const [hx, hy, hr] = heaps[i % heaps.length];
      ellipse(ctx, hx + (rand() - 0.5) * hr, hy + (rand() - 0.5) * hr, 4 + rand() * 2, 1.5, -0.6);
      ctx.fillStyle = rgba('#ffd0a8', 0.5);
      ctx.fill();
    }
    // the cheddar sits under this layer, so melt a fresh handful over the top
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * (R - 12);
      at(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, rand() * 6.3, () => {
        drawExtraTopping(ctx, 'cheddar', rand);
      }, 1.1);
    }
  },
});
