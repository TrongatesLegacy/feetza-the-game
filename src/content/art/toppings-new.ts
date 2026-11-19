// Toppings for the 28 Feetza 2.0 pizzas in src/content/pizzas/new.ts.
//
// Most entries draw one piece centred at the origin, already rotated, like the built-in toppings.
// A few are "overlays" (count 1) that reset the transform and paint across the whole pizza top:
// drizzles, the Quattro Stagioni quarters, the stromboli loaf, the carbonara yolk, the marshmallow
// mountain, the Napoletana leopard rim and the birthday candles. The pizza top is drawn on an
// untransformed PIZZA_SIZE canvas, and drawTopping wraps every piece in save/restore, so this is safe.

import { PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping, toppingDrawer } from '../../art/registry';
import { drawExtraTopping } from '../../art/toppingsExtra';
import { type Ctx, blob, ellipse, rgba, roundRect, shade } from '../../art/util';

const C = PIZZA_SIZE / 2;
const INK = '#3a1a08';

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
  ctx.strokeStyle = rgba(under, 0.55);
  ctx.lineWidth = w + 3;
  ctx.save();
  ctx.translate(1.5, 2.5);
  ctx.stroke();
  ctx.restore();
  trace();
  ctx.strokeStyle = body;
  ctx.lineWidth = w;
  ctx.stroke();
  trace();
  ctx.strokeStyle = hi;
  ctx.lineWidth = Math.max(1, w * 0.3);
  ctx.save();
  ctx.translate(-w * 0.18, -w * 0.18);
  ctx.stroke();
  ctx.restore();
}

/** Points of a zigzag drizzle across the pizza, limited to radius `r`. */
function zigzag(angle: number, rows: number, amp: number, step: number, r: number, rand: () => number, phase = 0): [number, number][][] {
  const lines: [number, number][][] = [];
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  for (let i = 0; i < rows; i++) {
    const v = (i - (rows - 1) / 2) * ((r * 2) / rows);
    const half = Math.sqrt(Math.max(0, r * r - v * v));
    const pts: [number, number][] = [];
    let k = 0;
    for (let u = -half; u <= half; u += step) {
      const off = (k++ % 2 ? amp : -amp) + (rand() - 0.5) * 4 + phase;
      pts.push([C + ca * u - sa * (v + off), C + sa * u + ca * (v + off)]);
    }
    if (pts.length > 1) lines.push(pts);
  }
  return lines;
}

// ——— Offence ———

piece('nduja', 1.3, {
  count: 9,
  minDist: 42,
  draw(ctx, rand) {
    // oily halo, then the spreadable dollop
    blob(ctx, 0, 0, 22, 0.5, rand, 9);
    ctx.fillStyle = rgba('#ff6a12', 0.32);
    ctx.fill();
    blob(ctx, 0, 0, 16, 0.55, rand, 9);
    drop(ctx, 0.35);
    const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, 18);
    g.addColorStop(0, '#ff8a3a');
    g.addColorStop(0.6, '#e04a14');
    g.addColorStop(1, '#8a2006');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#4a0c02';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = rgba('#5a0a02', 0.6);
    for (let i = 0; i < 6; i++) {
      ellipse(ctx, (rand() - 0.5) * 18, (rand() - 0.5) * 18, 1.4 + rand() * 1.6, 1.2);
      ctx.fill();
    }
    ctx.fillStyle = rgba('#ffd08a', 0.8);
    for (let i = 0; i < 3; i++) {
      ellipse(ctx, (rand() - 0.5) * 14, (rand() - 0.5) * 14, 1.2, 1);
      ctx.fill();
    }
    shine(ctx, -5, -6, 5, 2, 0.55);
  },
});

piece('cupPepperoni', 1.05, {
  count: 15,
  minDist: 34,
  draw(ctx, rand) {
    const r = 15 + rand() * 3;
    ellipse(ctx, 0, 0, r, r);
    drop(ctx, 0.4);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    g.addColorStop(0, '#e8562a');
    g.addColorStop(0.55, '#b42a14');
    g.addColorStop(0.8, '#7a1406');
    g.addColorStop(1, '#3a0802');
    ctx.fillStyle = g;
    ctx.fill();
    // grease pool in the cup
    ellipse(ctx, 1, 1, r * 0.45, r * 0.4);
    ctx.fillStyle = rgba('#ff9a2a', 0.65);
    ctx.fill();
    ctx.strokeStyle = '#2a0602';
    ctx.lineWidth = 2.5;
    ellipse(ctx, 0, 0, r - 1, r - 1);
    ctx.stroke();
    // curled-up charred rim catching the light
    ctx.strokeStyle = rgba('#ff8a5a', 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, Math.PI * 0.9, Math.PI * 1.6);
    ctx.stroke();
    shine(ctx, -2, -2, 3, 1.3, 0.75);
  },
});

registerTopping('honeyDrizzle', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // loose looping honey ribbons poured diagonally
    for (let i = 0; i < 4; i++) {
      const pts: [number, number][] = [];
      const off = (i - 1.5) * 64;
      for (let t = -1; t <= 1.001; t += 0.1) {
        const u = t * 130;
        const w = Math.sin(t * 7 + i * 1.7) * 18 + (rand() - 0.5) * 6;
        const x = C + u * 0.75 - (off + w) * 0.66;
        const y = C + u * 0.66 + (off + w) * 0.75;
        if ((x - C) ** 2 + (y - C) ** 2 < 148 ** 2) pts.push([x, y]);
      }
      if (pts.length > 2) sauceLine(ctx, pts, '#f5b324', '#5a2e02', rgba('#fff4b0', 0.9), 7);
    }
    // honey drips pooling
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * 120;
      ellipse(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 4 + rand() * 3, 3 + rand() * 2);
      ctx.fillStyle = rgba('#f7b52a', 0.85);
      ctx.fill();
    }
  },
});

registerTopping('calabreseSalami', {
  count: 10,
  minDist: 42,
  draw(ctx, rand) {
    const r = 20;
    // half-moon spianata slices: bold and unmistakably different from round pepperoni
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI);
    ctx.closePath();
    drop(ctx, 0.4);
    const g = ctx.createRadialGradient(-4, 4, 2, 0, 4, r);
    g.addColorStop(0, '#c42a1e');
    g.addColorStop(0.8, '#8a1410');
    g.addColorStop(1, '#4a0806');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#2a0402';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // fat + chili flecks
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI;
      const d = rand() * (r - 4);
      ctx.fillStyle = i % 3 ? rgba('#ffe4d8', 0.85) : '#ff9a1a';
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.95 + 1, 1.6 + rand() * 1.4, 1.3);
      ctx.fill();
    }
    shine(ctx, -6, 4, 6, 1.6, 0.4);
  },
});

registerTopping('longChili', {
  count: 5,
  minDist: 56,
  draw(ctx, rand) {
    const bend = (rand() - 0.5) * 10;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(-4, -8 + bend, 18, -3);
    ctx.quadraticCurveTo(26, 2, 20, 4);
    ctx.quadraticCurveTo(-4, 8 + bend, -22, 4);
    ctx.closePath();
    drop(ctx, 0.35);
    const g = ctx.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, '#ff5a2a');
    g.addColorStop(0.5, '#e01a0a');
    g.addColorStop(1, '#8a0a04');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#4a0402';
    ctx.lineWidth = 2;
    ctx.stroke();
    // green stem
    ctx.fillStyle = '#3f8a22';
    ellipse(ctx, -23, 2, 4, 5);
    ctx.fill();
    ctx.strokeStyle = '#1f4a10';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#3f8a22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-26, 2);
    ctx.lineTo(-32, -2);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffd0c0', 0.7);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-14, -2 + bend * 0.3);
    ctx.quadraticCurveTo(0, -5 + bend * 0.5, 12, -2);
    ctx.stroke();
  },
});

piece('anchovy', 1.35, {
  count: 8,
  minDist: 36,
  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.quadraticCurveTo(0, -11, 20, 0);
    ctx.quadraticCurveTo(0, 11, -20, 0);
    ctx.closePath();
    drop(ctx, 0.35);
    const g = ctx.createLinearGradient(0, -6, 0, 6);
    g.addColorStop(0, '#9a6a52');
    g.addColorStop(0.5, '#6a3a2a');
    g.addColorStop(1, '#4a2418');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#2a1008';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // silver skin stripe
    ctx.strokeStyle = rgba('#d8dce0', 0.9);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, -1);
    ctx.quadraticCurveTo(0, -5, 16, -1);
    ctx.stroke();
    ctx.strokeStyle = rgba('#2a1008', 0.5);
    ctx.lineWidth = 1;
    for (let i = -12; i <= 12; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 1);
      ctx.lineTo(i + 2, 4);
      ctx.stroke();
    }
  },
});

piece('caper', 1.3, {
  count: 26,
  minDist: 15,
  draw(ctx, rand) {
    const r = 4 + rand() * 1.2;
    ellipse(ctx, 0, 0, r, r * 0.9);
    drop(ctx, 0.35, 1, 1.5);
    const g = ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, r);
    g.addColorStop(0, '#a8b85a');
    g.addColorStop(1, '#4a5a1a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#26300a';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    shine(ctx, -1.4, -1.6, 1.6, 0.8, 0.7);
  },
});

piece('steak', 1.3, {
  count: 15,
  minDist: 28,
  draw(ctx, rand) {
    // shaved ribbon of ribeye
    const w = 15 + rand() * 6;
    ctx.beginPath();
    ctx.moveTo(-w, -3);
    ctx.bezierCurveTo(-w * 0.4, -10, w * 0.3, 2, w, -5);
    ctx.lineTo(w - 2, 4);
    ctx.bezierCurveTo(w * 0.3, 10, -w * 0.4, -1, -w, 6);
    ctx.closePath();
    drop(ctx, 0.35);
    const g = ctx.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, '#9a5a3a');
    g.addColorStop(1, '#5a2a16');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#2e1006';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.strokeStyle = rgba('#d8a07a', 0.7);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-w + 3, 0);
    ctx.bezierCurveTo(-w * 0.3, -5, w * 0.3, 4, w - 3, -1);
    ctx.stroke();
    ctx.fillStyle = rgba('#2a0e04', 0.55);
    for (let i = 0; i < 3; i++) {
      ellipse(ctx, (rand() - 0.5) * w * 1.4, (rand() - 0.5) * 5, 1.5, 1);
      ctx.fill();
    }
  },
});

registerTopping('provolone', {
  count: 6,
  minDist: 70,
  draw(ctx, rand) {
    // a melting round of provolone, slightly translucent so the filling shows through
    blob(ctx, 0, 0, 28, 0.22, rand, 12);
    const g = ctx.createRadialGradient(-6, -6, 3, 0, 0, 30);
    g.addColorStop(0, rgba('#fff8d6', 0.95));
    g.addColorStop(0.7, rgba('#f6dc8a', 0.88));
    g.addColorStop(1, rgba('#d8a84a', 0.8));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#a8742a', 0.6);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = rgba('#c87a2a', 0.45);
    for (let i = 0; i < 4; i++) {
      blob(ctx, (rand() - 0.5) * 34, (rand() - 0.5) * 34, 2 + rand() * 3, 0.5, rand, 6);
      ctx.fill();
    }
    shine(ctx, -9, -9, 8, 3, 0.45);
  },
});

// ——— Defence ———

registerTopping('crushedTomato', {
  count: 10,
  minDist: 52,
  draw(ctx, rand) {
    blob(ctx, 0, 0, 21 + rand() * 4, 0.55, rand, 11);
    drop(ctx, 0.3);
    const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, 24);
    g.addColorStop(0, '#e0442a');
    g.addColorStop(1, '#9a1a0e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#5a0c04';
    ctx.lineWidth = 2;
    ctx.stroke();
    // chunky pulp + seeds
    for (let i = 0; i < 5; i++) {
      blob(ctx, (rand() - 0.5) * 22, (rand() - 0.5) * 22, 3 + rand() * 4, 0.6, rand, 6);
      ctx.fillStyle = rgba('#ff7a5a', 0.75);
      ctx.fill();
    }
    ctx.fillStyle = rgba('#ffe0a8', 0.85);
    for (let i = 0; i < 5; i++) {
      ellipse(ctx, (rand() - 0.5) * 20, (rand() - 0.5) * 20, 1.4, 0.9, rand() * 3);
      ctx.fill();
    }
    shine(ctx, -6, -8, 6, 2, 0.45);
  },
});

registerTopping('stromboliLoaf', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // flat baked seam dough fills the tray, the rolled loaf sits on top
    roundRect(ctx, 20, 20, PIZZA_SIZE - 40, PIZZA_SIZE - 40, 20);
    const bg = ctx.createLinearGradient(0, 20, 0, PIZZA_SIZE - 20);
    bg.addColorStop(0, '#d08a40');
    bg.addColorStop(1, '#9a5a24');
    ctx.fillStyle = bg;
    ctx.fill();
    // a little molten cheese and sauce that leaked onto the tray
    for (let i = 0; i < 6; i++) {
      const x = 50 + rand() * 300;
      const y = i % 2 ? 44 + rand() * 12 : 344 + rand() * 12;
      blob(ctx, x, y, 7 + rand() * 6, 0.6, rand, 8);
      ctx.fillStyle = i % 3 ? rgba('#f7d77c', 0.9) : rgba('#b42a14', 0.85);
      ctx.fill();
    }
    const x0 = 34;
    const x1 = PIZZA_SIZE - 34;
    const y0 = 76;
    const y1 = PIZZA_SIZE - 76;
    const hr = (y1 - y0) / 2;
    roundRect(ctx, x0, y0, x1 - x0, y1 - y0, hr);
    drop(ctx, 0.45, 0, 10);
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#f6cf82');
    g.addColorStop(0.35, '#e0a24e');
    g.addColorStop(0.8, '#b8702e');
    g.addColorStop(1, '#7a4416');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.7);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    roundRect(ctx, x0, y0, x1 - x0, y1 - y0, hr);
    ctx.clip();
    // char blisters
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rgba('#5a2a0a', 0.15 + rand() * 0.35);
      blob(ctx, x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0), 2 + rand() * 5, 0.6, rand, 7);
      ctx.fill();
    }
    // diagonal slashes with sauce + cheese bubbling out
    for (let i = 0; i < 5; i++) {
      const sx = x0 + 70 + i * 58;
      ctx.save();
      ctx.translate(sx, C - 4);
      ctx.rotate(-0.55);
      ellipse(ctx, 0, 0, 34, 7);
      ctx.fillStyle = '#6a1a0a';
      ctx.fill();
      ellipse(ctx, 0, 1, 28, 4.5);
      ctx.fillStyle = '#c42a14';
      ctx.fill();
      blob(ctx, 6, 1, 10, 0.5, rand, 7);
      ctx.fillStyle = '#f7d77c';
      ctx.fill();
      ellipse(ctx, -12, 0, 6, 2.4);
      ctx.fillStyle = '#9a1e1a';
      ctx.fill();
      ctx.restore();
    }
    // egg-wash gloss along the top of the roll
    ctx.fillStyle = rgba('#fff4d8', 0.4);
    ellipse(ctx, C - 30, y0 + 34, 140, 14);
    ctx.fill();
    // sesame + oregano
    for (let i = 0; i < 70; i++) {
      const x = x0 + 20 + rand() * (x1 - x0 - 40);
      const y = y0 + 12 + rand() * (y1 - y0 - 24);
      if (rand() > 0.4) {
        ctx.fillStyle = '#fbf0d0';
        ellipse(ctx, x, y, 2.4, 1.3, rand() * 3);
      } else {
        ctx.fillStyle = '#3a5a1a';
        ellipse(ctx, x, y, 1.5, 1.2);
      }
      ctx.fill();
    }
    ctx.restore();
    // spiral cut face at the right end
    const ex = x1 - hr * 0.55;
    ellipse(ctx, ex, C, hr * 0.5, hr * 0.85);
    ctx.fillStyle = '#f0c27a';
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 5; t += 0.2) {
      const k = 1 - t / (Math.PI * 5);
      const px = ex + Math.cos(t) * hr * 0.42 * k;
      const py = C + Math.sin(t) * hr * 0.75 * k;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#b42a14';
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#f7d77c';
    ctx.stroke();
  },
});

piece('ricotta', 1.2, {
  count: 9,
  minDist: 44,
  draw(ctx, rand) {
    blob(ctx, 0, 0, 15 + rand() * 3, 0.45, rand, 10);
    drop(ctx, 0.22);
    const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, 18);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.75, '#f8f4e8');
    g.addColorStop(1, '#e0d6bc');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#a89a78', 0.7);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // curd texture + cracked pepper
    ctx.fillStyle = rgba('#d6ccb0', 0.9);
    for (let i = 0; i < 7; i++) {
      ellipse(ctx, (rand() - 0.5) * 18, (rand() - 0.5) * 18, 1.6, 1.2);
      ctx.fill();
    }
    ctx.fillStyle = '#2a2420';
    for (let i = 0; i < 3; i++) {
      ellipse(ctx, (rand() - 0.5) * 14, (rand() - 0.5) * 14, 0.9, 0.9);
      ctx.fill();
    }
  },
});

piece('lemon', 1.3, {
  count: 7,
  minDist: 52,
  draw(ctx) {
    const r = 15;
    ellipse(ctx, 0, 0, r, r);
    drop(ctx, 0.3);
    ctx.fillStyle = '#f2c418';
    ctx.fill();
    ctx.strokeStyle = '#8a6a06';
    ctx.lineWidth = 2;
    ctx.stroke();
    ellipse(ctx, 0, 0, r - 3, r - 3);
    ctx.fillStyle = '#fff8d8';
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2 + 0.06;
      const a1 = ((i + 1) / 8) * Math.PI * 2 - 0.06;
      ctx.beginPath();
      ctx.moveTo(Math.cos((a0 + a1) / 2) * 1.5, Math.sin((a0 + a1) / 2) * 1.5);
      ctx.arc(0, 0, r - 4.5, a0, a1);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#ffe04a' : '#ffd52a';
      ctx.fill();
    }
    shine(ctx, -5, -6, 4, 1.8, 0.6);
  },
});

piece('lardons', 1.5, {
  count: 26,
  minDist: 24,
  draw(ctx, rand) {
    roundRect(ctx, -8, -4.5, 16, 9, 2.5);
    drop(ctx, 0.35, 1.5, 2);
    const g = ctx.createLinearGradient(-8, 0, 8, 0);
    g.addColorStop(0, '#fbe8dc');
    g.addColorStop(0.35, '#e8907a');
    g.addColorStop(1, '#b8523a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#6a2414';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = rgba('#7a2a10', 0.45 + rand() * 0.3);
    ellipse(ctx, 5, 1, 2.5, 2);
    ctx.fill();
  },
});

piece('whiteOnion', 1.4, {
  count: 14,
  minDist: 24,
  draw(ctx, rand) {
    const r = 11 + rand() * 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#a89060';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.3, 2.3);
    ctx.stroke();
    ctx.strokeStyle = '#f8f0d8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = rgba('#c87a2a', 0.8);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 2.0, 2.3);
    ctx.stroke();
  },
});

piece('chives', 1.3, {
  count: 26,
  minDist: 13,
  draw(ctx, rand) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const x = (rand() - 0.5) * 8;
      const y = (rand() - 0.5) * 8;
      const a = rand() * Math.PI;
      ctx.strokeStyle = '#1f5a12';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * 3, y - Math.sin(a) * 3);
      ctx.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3);
      ctx.stroke();
      ctx.strokeStyle = '#5ab83a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  },
});

piece('cremeFraiche', 1.2, {
  count: 7,
  minDist: 56,
  draw(ctx, rand) {
    // glossy spoon-swoosh of crème fraîche
    ctx.beginPath();
    ctx.moveTo(-22, 4);
    ctx.bezierCurveTo(-14, -14, 10, -12, 22, -2);
    ctx.bezierCurveTo(14, 2, 0, 12 + rand() * 4, -22, 4);
    ctx.closePath();
    drop(ctx, 0.18);
    const g = ctx.createLinearGradient(0, -12, 0, 10);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#efe6cc');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#b8a478', 0.75);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    shine(ctx, -2, -5, 10, 2, 0.8);
  },
});

/** Local pieces for the Quattro Stagioni quarters. */
function mushroomPiece(ctx: Ctx): void {
  ctx.beginPath();
  ctx.arc(0, 0, 13, Math.PI, 0);
  ctx.lineTo(5, 0);
  ctx.lineTo(4.5, 11);
  ctx.quadraticCurveTo(0, 14, -4.5, 11);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  drop(ctx, 0.3);
  ctx.fillStyle = '#d9c3a4';
  ctx.fill();
  ctx.strokeStyle = '#5a3a1e';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.strokeStyle = rgba('#8a6a48', 0.7);
  ctx.lineWidth = 1.2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 3.5, -1.5);
    ctx.lineTo(i * 2, -10);
    ctx.stroke();
  }
}

function olivePiece(ctx: Ctx): void {
  ellipse(ctx, 0, 0, 7, 7);
  ctx.strokeStyle = '#141412';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = rgba('#9aa094', 0.8);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, 0, 8, -2.4, -1.2);
  ctx.stroke();
}

function basilPiece(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.quadraticCurveTo(0, -13, 13, 0);
  ctx.quadraticCurveTo(0, 13, -13, 0);
  const g = ctx.createLinearGradient(0, -10, 0, 10);
  g.addColorStop(0, '#5ab84a');
  g.addColorStop(1, '#1f5a1a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#143a10';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = rgba('#cdf0a0', 0.6);
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(11, 0);
  ctx.stroke();
}

registerTopping('stagioni', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    const R = PIZZA_R * 0.8;
    // quarter tints so the seasons read at a glance even when tiny
    const tints = ['#7ab84a', '#e0402a', '#a8743a', '#f4f0e4'];
    for (let q = 0; q < 4; q++) {
      const a0 = -Math.PI / 2 + (q * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(C, C);
      ctx.arc(C, C, R - 4, a0, a0 + Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = rgba(tints[q], 0.22);
      ctx.fill();
    }
    const inQuarter = (q: number) => (x: number, y: number) => {
      const dx = x - C;
      const dy = y - C;
      const m = 22;
      return [dx > m && dy < -m, dx > m && dy > m, dx < -m && dy > m, dx < -m && dy < -m][q];
    };
    // spring: artichokes (top right)
    for (const [x, y] of spread(5, 46, rand, inQuarter(0))) at(ctx, x, y, rand() * 6.3, () => drawExtraTopping(ctx, 'artichoke', rand));
    // summer: cherry tomatoes + basil (bottom right)
    const tom = toppingDrawer('cherryTomato');
    for (const [x, y] of spread(6, 36, rand, inQuarter(1))) at(ctx, x, y, rand() * 6.3, () => tom?.draw(ctx, rand));
    for (const [x, y] of spread(3, 30, rand, inQuarter(1))) at(ctx, x, y, rand() * 6.3, () => basilPiece(ctx), 0.85);
    // autumn: mushrooms (bottom left)
    for (const [x, y] of spread(7, 34, rand, inQuarter(2))) at(ctx, x, y, rand() * 6.3, () => mushroomPiece(ctx));
    // winter: prosciutto + black olives (top left)
    for (const [x, y] of spread(3, 50, rand, inQuarter(3))) at(ctx, x, y, rand() * 6.3, () => drawExtraTopping(ctx, 'prosciutto', rand), 0.8);
    for (const [x, y] of spread(5, 26, rand, inQuarter(3))) at(ctx, x, y, 0, () => olivePiece(ctx));
    // dough strips dividing the seasons
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(C, C);
      ctx.lineTo(C + dx * (R + 4), C + dy * (R + 4));
      ctx.strokeStyle = rgba(INK, 0.6);
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = '#e8b464';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff0c8', 0.7);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ellipse(ctx, C, C, 9, 9);
    ctx.fillStyle = '#e8b464';
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
  },
});

// ——— Economy ———

piece('grease', 1.2, {
  count: 16,
  minDist: 30,
  draw(ctx, rand) {
    blob(ctx, 0, 0, 7 + rand() * 7, 0.5, rand, 8);
    ctx.fillStyle = rgba('#f07a10', 0.42);
    ctx.fill();
    shine(ctx, -2, -2, 3, 1.2, 0.55);
  },
});

registerTopping('oregano', {
  count: 22,
  minDist: 18,
  draw(ctx, rand) {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#3a5a1a' : '#5a7a2a';
      ellipse(ctx, (rand() - 0.5) * 12, (rand() - 0.5) * 12, 1.6 + rand(), 1 + rand() * 0.8, rand() * 3);
      ctx.fill();
    }
  },
});

registerTopping('blackPepper', {
  count: 24,
  minDist: 16,
  draw(ctx, rand) {
    ctx.fillStyle = '#1a1410';
    for (let i = 0; i < 6; i++) {
      ellipse(ctx, (rand() - 0.5) * 12, (rand() - 0.5) * 12, 1 + rand() * 0.8, 0.9 + rand() * 0.6);
      ctx.fill();
    }
  },
});

piece('kebabMeat', 1.15, {
  count: 13,
  minDist: 32,
  draw(ctx, rand) {
    // wide curled doner shaving with crisp dark edges
    ctx.beginPath();
    ctx.moveTo(-17, -6);
    ctx.quadraticCurveTo(-4, -13, 15, -8);
    ctx.quadraticCurveTo(20, 0, 14, 8);
    ctx.quadraticCurveTo(-2, 12, -16, 6);
    ctx.quadraticCurveTo(-10, 0, -17, -6);
    ctx.closePath();
    drop(ctx, 0.4);
    const g = ctx.createRadialGradient(-2, -2, 2, 0, 0, 18);
    g.addColorStop(0, '#c88a5a');
    g.addColorStop(0.7, '#a0582a');
    g.addColorStop(1, '#5a2a0e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#2e1004';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = rgba('#3a1606', 0.7);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, 5);
    ctx.quadraticCurveTo(0, 9, 12, 6);
    ctx.stroke();
    ctx.fillStyle = rgba('#e05a1a', 0.8);
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, (rand() - 0.5) * 22, (rand() - 0.5) * 10, 1.2, 1);
      ctx.fill();
    }
  },
});

piece('pepperoncini', 1.2, {
  count: 7,
  minDist: 40,
  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(-14, -3);
    ctx.quadraticCurveTo(0, -9, 12, -2);
    ctx.quadraticCurveTo(16, 2, 12, 4);
    ctx.quadraticCurveTo(0, 6, -14, 4);
    ctx.closePath();
    drop(ctx, 0.3);
    const g = ctx.createLinearGradient(0, -8, 0, 6);
    g.addColorStop(0, '#e8e070');
    g.addColorStop(1, '#a8a020');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#5a5408';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#6a8a22';
    ellipse(ctx, -15, 0.5, 3, 4);
    ctx.fill();
    shine(ctx, -2, -3, 6, 1.4, 0.55);
  },
});

registerTopping('garlicSauce', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    for (const line of zigzag(0.08, 6, 9, 22, 140, rand)) sauceLine(ctx, line, '#fbf8ee', '#5a3a1a', rgba('#ffffff', 0.9), 4.5);
  },
});

piece('macaroni', 1.3, {
  count: 28,
  minDist: 20,
  draw(ctx) {
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0.2, Math.PI * 1.15);
    ctx.strokeStyle = rgba('#6a3a06', 0.4);
    ctx.lineWidth = 10;
    ctx.save();
    ctx.translate(1.5, 2);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#a8700e';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#f7c844';
    ctx.lineWidth = 6.5;
    ctx.stroke();
    ctx.strokeStyle = rgba('#fff2b0', 0.85);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0.6, Math.PI * 0.9);
    ctx.stroke();
    // open tube end
    ellipse(ctx, Math.cos(0.2) * 8, Math.sin(0.2) * 8, 3, 2.2, 0.2);
    ctx.fillStyle = '#c88a1a';
    ctx.fill();
  },
});

registerTopping('breadcrumbs', {
  count: 22,
  minDist: 16,
  draw(ctx, rand) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#b8742a' : '#d89a4a';
      blob(ctx, (rand() - 0.5) * 10, (rand() - 0.5) * 10, 1.6 + rand() * 1.6, 0.6, rand, 5);
      ctx.fill();
    }
  },
});

piece('fig', 1.15, {
  count: 8,
  minDist: 46,
  draw(ctx, rand) {
    // halved fig, cut side up
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(8, -14, 16, 0, 12, 10);
    ctx.bezierCurveTo(8, 18, -8, 18, -12, 10);
    ctx.bezierCurveTo(-16, 0, -8, -14, 0, -18);
    ctx.closePath();
    drop(ctx, 0.35);
    ctx.fillStyle = '#5a1a3a';
    ctx.fill();
    ctx.strokeStyle = '#2a0618';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.bezierCurveTo(6, -10, 12, 0, 9, 8);
    ctx.bezierCurveTo(6, 14, -6, 14, -9, 8);
    ctx.bezierCurveTo(-12, 0, -6, -10, 0, -13);
    ctx.closePath();
    ctx.fillStyle = '#f4dcc0';
    ctx.fill();
    ellipse(ctx, 0, 3, 7, 8);
    const g = ctx.createRadialGradient(0, 3, 1, 0, 3, 8);
    g.addColorStop(0, '#f05a6a');
    g.addColorStop(1, '#a01a3a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = '#ffe8a0';
    for (let i = 0; i < 9; i++) {
      ellipse(ctx, (rand() - 0.5) * 9, 3 + (rand() - 0.5) * 11, 0.9, 0.9);
      ctx.fill();
    }
  },
});

piece('gorgonzola', 1.2, {
  count: 10,
  minDist: 34,
  draw(ctx, rand) {
    blob(ctx, 0, 0, 12 + rand() * 3, 0.6, rand, 9);
    drop(ctx, 0.25);
    ctx.fillStyle = '#f6eccb';
    ctx.fill();
    ctx.strokeStyle = '#a8986a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#4a7a6e';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const x = (rand() - 0.5) * 14;
      const y = (rand() - 0.5) * 14;
      ctx.moveTo(x - 4, y);
      ctx.quadraticCurveTo(x, y - 4, x + 4, y + 1);
      ctx.stroke();
    }
  },
});

registerTopping('balsamic', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a fine balsamic glaze zigzag
    for (const line of zigzag(-0.5, 4, 16, 26, 138, rand)) sauceLine(ctx, line, '#3a140e', '#1a0604', rgba('#b87a6a', 0.75), 4);
  },
});

registerTopping('mortadella', {
  count: 6,
  minDist: 60,
  draw(ctx, rand) {
    // ruffled, folded slice of mortadella with white fat dice
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = 24 + Math.sin(a * 6) * 2.5 + (rand() - 0.5) * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.82;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    drop(ctx, 0.3);
    const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, 26);
    g.addColorStop(0, '#ffc6c8');
    g.addColorStop(0.8, '#f09aa2');
    g.addColorStop(1, '#c86a76');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#8a3a48';
    ctx.lineWidth = 2;
    ctx.stroke();
    // fold line
    ctx.strokeStyle = rgba('#a84a58', 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 6);
    ctx.quadraticCurveTo(0, -2, 18, 4);
    ctx.stroke();
    ctx.fillStyle = '#fff6ee';
    for (let i = 0; i < 6; i++) {
      roundRect(ctx, (rand() - 0.5) * 30 - 2, (rand() - 0.5) * 24 - 2, 4, 3.5, 1);
      ctx.fill();
    }
  },
});

registerTopping('pistachio', {
  count: 22,
  minDist: 15,
  draw(ctx, rand) {
    for (let i = 0; i < 3; i++) {
      blob(ctx, (rand() - 0.5) * 8, (rand() - 0.5) * 8, 2.2 + rand() * 1.4, 0.6, rand, 6);
      ctx.fillStyle = i % 2 ? '#8ab83a' : '#b8d45a';
      ctx.fill();
      ctx.strokeStyle = '#3a5a12';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },
});

piece('zucchini', 1.15, {
  count: 10,
  minDist: 34,
  draw(ctx, rand) {
    const r = 11.5;
    ellipse(ctx, 0, 0, r, r);
    drop(ctx, 0.3);
    ctx.fillStyle = '#2f6a1e';
    ctx.fill();
    ctx.strokeStyle = '#143a0a';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ellipse(ctx, 0, 0, r - 2.6, r - 2.6);
    const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, r);
    g.addColorStop(0, '#f6f8d0');
    g.addColorStop(1, '#c8d88a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = rgba('#8aa04a', 0.8);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ellipse(ctx, Math.cos(a) * 3.5, Math.sin(a) * 3.5, 1.2, 0.8, a);
      ctx.fill();
    }
    // grill char
    ctx.strokeStyle = rgba('#3a2a10', 0.45 + rand() * 0.2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(4, 6);
    ctx.stroke();
  },
});

// ——— Freshness and healing ———

piece('pickle', 1.15, {
  count: 11,
  minDist: 34,
  draw(ctx, rand) {
    // crinkle-cut dill pickle chip
    const r = 13;
    ctx.beginPath();
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const rr = r + (i % 2 ? 1.6 : -0.6);
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    drop(ctx, 0.35);
    ctx.fillStyle = '#5a7a1a';
    ctx.fill();
    ctx.strokeStyle = '#2a3e08';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ellipse(ctx, 0, 0, r - 3.5, r - 3.5);
    const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, r);
    g.addColorStop(0, '#e4eca0');
    g.addColorStop(1, '#a8c050');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = rgba('#f8f8d8', 0.95);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rand() * 0.3;
      ellipse(ctx, Math.cos(a) * 4.5, Math.sin(a) * 4.5, 1.6, 1, a);
      ctx.fill();
    }
    shine(ctx, -4, -5, 4, 1.5, 0.5);
  },
});

registerTopping('dill', {
  count: 10,
  minDist: 30,
  draw(ctx, rand) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f6a1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(0, -3, 14, 0);
    ctx.stroke();
    ctx.strokeStyle = '#5aa83a';
    ctx.lineWidth = 1.3;
    for (let i = -12; i <= 12; i += 3) {
      const l = 4 + rand() * 3;
      ctx.beginPath();
      ctx.moveTo(i, -1);
      ctx.lineTo(i + 2, -1 - l);
      ctx.moveTo(i, -1);
      ctx.lineTo(i + 2, -1 + l);
      ctx.stroke();
    }
  },
});

piece('pumpkin', 1.3, {
  count: 12,
  minDist: 34,
  draw(ctx, rand) {
    // roasted pumpkin cube
    roundRect(ctx, -9, -8, 18, 16, 4);
    drop(ctx, 0.4);
    const g = ctx.createLinearGradient(-9, -8, 9, 8);
    g.addColorStop(0, '#ffb64a');
    g.addColorStop(0.6, '#f07a12');
    g.addColorStop(1, '#a84a08');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#5a2404';
    ctx.lineWidth = 2;
    ctx.stroke();
    // caramelised corner + green skin edge
    ctx.fillStyle = rgba('#6a2a04', 0.55);
    ellipse(ctx, 5, 4, 3.5 + rand() * 2, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#4a6a1a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-8, 7.5);
    ctx.lineTo(8, 7.5);
    ctx.stroke();
    shine(ctx, -4, -4, 4, 1.6, 0.5);
  },
});

piece('sage', 1.2, {
  count: 8,
  minDist: 36,
  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(0, -9, 14, 0);
    ctx.quadraticCurveTo(0, 9, -14, 0);
    drop(ctx, 0.3);
    const g = ctx.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, '#8aaa72');
    g.addColorStop(1, '#4a6a3a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#26381a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = rgba('#d8e8c0', 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    for (let i = -8; i <= 8; i += 4) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 3, -4);
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 3, 4);
    }
    ctx.stroke();
  },
});

piece('pepita', 1.2, {
  count: 18,
  minDist: 16,
  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(0, -4.5, 6, 0);
    ctx.quadraticCurveTo(0, 4.5, -6, 0);
    ctx.fillStyle = '#5a8a2a';
    ctx.fill();
    ctx.strokeStyle = '#26400e';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    shine(ctx, -1, -1, 2.5, 0.8, 0.5);
  },
});

piece('friedPuff', 1.25, {
  count: 13,
  minDist: 50,
  draw(ctx, rand) {
    // a puffed, deep-fried dough blister
    blob(ctx, 0, 0, 18 + rand() * 5, 0.35, rand, 10);
    drop(ctx, 0.35);
    const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, 22);
    g.addColorStop(0, '#ffeaa0');
    g.addColorStop(0.5, '#f2b84a');
    g.addColorStop(1, '#a8621e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#6a3608';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = rgba('#c87a22', 0.6);
    for (let i = 0; i < 5; i++) {
      ellipse(ctx, (rand() - 0.5) * 24, (rand() - 0.5) * 24, 1.6 + rand() * 1.5, 1.4);
      ctx.fill();
    }
    shine(ctx, -6, -7, 7, 3, 0.6);
  },
});

piece('guanciale', 1.2, {
  count: 14,
  minDist: 30,
  draw(ctx, rand) {
    // crispy cube with a thick band of fat
    roundRect(ctx, -9, -7, 18, 14, 3);
    drop(ctx, 0.4);
    ctx.fillStyle = '#f8e6d2';
    ctx.fill();
    ctx.save();
    roundRect(ctx, -9, -7, 18, 14, 3);
    ctx.clip();
    ctx.fillStyle = '#c4604a';
    ctx.fillRect(-9, -7, 18, 4.5);
    ctx.fillStyle = '#a84a34';
    ctx.fillRect(-9, 3, 18, 4);
    ctx.fillStyle = rgba('#8a3a10', 0.55);
    ellipse(ctx, 6, 0, 4 + rand() * 2, 7);
    ctx.fill();
    ctx.restore();
    roundRect(ctx, -9, -7, 18, 14, 3);
    ctx.strokeStyle = '#5a1e0e';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    shine(ctx, -4, -1, 4, 1.2, 0.55);
  },
});

registerTopping('carbonaraYolk', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // one big glossy yolk dead centre, ringed with pecorino
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rand() * 0.2;
      const d = 46 + rand() * 10;
      ctx.fillStyle = '#fff4d0';
      ctx.beginPath();
      ctx.moveTo(C + Math.cos(a) * d - 4, C + Math.sin(a) * d - 2);
      ctx.lineTo(C + Math.cos(a) * d + 5, C + Math.sin(a) * d - 3);
      ctx.lineTo(C + Math.cos(a) * d + 3, C + Math.sin(a) * d + 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba('#b8a070', 0.6);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ellipse(ctx, C + 3, C + 5, 36, 36);
    ctx.fillStyle = rgba('#5a2a04', 0.35);
    ctx.fill();
    ellipse(ctx, C, C, 36, 36);
    const g = ctx.createRadialGradient(C - 10, C - 10, 3, C, C, 38);
    g.addColorStop(0, '#ffe680');
    g.addColorStop(0.55, '#ffaa14');
    g.addColorStop(1, '#d87a00');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#8a4a00';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    shine(ctx, C - 12, C - 13, 12, 5, 0.85);
    ctx.fillStyle = '#1a1410';
    for (let i = 0; i < 10; i++) {
      ellipse(ctx, C + (rand() - 0.3) * 40, C + (rand() - 0.3) * 40, 1.2, 1.1);
      ctx.fill();
    }
  },
});

registerTopping('mince', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // lahmacun's thin layer of spiced minced lamb, spread right to the edge, with red onion rings
    for (let i = 0; i < 340; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 146;
      blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 2.6 + rand() * 3, 0.7, rand, 6);
      ctx.fillStyle = ['#8a4422', '#a85a2e', '#6a2e14'][i % 3];
      ctx.fill();
      ctx.strokeStyle = rgba('#2a0c02', 0.7);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const d = 20 + rand() * 110;
      at(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, rand() * 6.3, () => {
        ctx.strokeStyle = '#5a1a4a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0.2, 2.8);
        ctx.stroke();
        ctx.strokeStyle = '#c86aaa';
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.strokeStyle = rgba('#f8dcef', 0.9);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0.6, 1.8);
        ctx.stroke();
      });
    }
  },
});

piece('parsley', 1.3, {
  count: 10,
  minDist: 32,
  draw(ctx) {
    // three-lobed flat-leaf parsley / coriander
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(-0.9 + i * 0.9);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-6, -6, -3, -11);
      ctx.lineTo(0, -9);
      ctx.lineTo(3, -12);
      ctx.quadraticCurveTo(7, -6, 0, 0);
      ctx.closePath();
      ctx.fillStyle = i === 1 ? '#3aa02a' : '#2f8a22';
      ctx.fill();
      ctx.strokeStyle = '#143a0a';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = '#2f6a1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 7);
    ctx.stroke();
  },
});

// ——— Control ———

registerTopping('mayoZigzag', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // tight diagonal kewpie-mayo lattice over the okonomi sauce
    for (const line of zigzag(Math.PI / 4, 6, 11, 20, 142, rand)) sauceLine(ctx, line, '#fff8e0', '#1a0802', rgba('#ffffff', 0.9), 5);
  },
});

piece('bonito', 1.5, {
  count: 16,
  minDist: 26,
  draw(ctx, rand) {
    // curly, translucent bonito flake
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.bezierCurveTo(-4, -12, 6, -2, 11, -7);
    ctx.bezierCurveTo(12, 0, 6, 8, -2, 6);
    ctx.bezierCurveTo(-6, 6, -12, 4, -10, -4);
    ctx.closePath();
    ctx.fillStyle = rgba(rand() > 0.5 ? '#f0c0a0' : '#e8a888', 0.92);
    ctx.fill();
    ctx.strokeStyle = '#8a4a2a';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = rgba('#fff0e0', 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-7, -2);
    ctx.quadraticCurveTo(0, -6, 8, -3);
    ctx.stroke();
  },
});

piece('aonori', 1.4, {
  count: 20,
  minDist: 16,
  draw(ctx, rand) {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#2f8a1a' : '#4ab02a';
      ctx.fillRect((rand() - 0.5) * 12, (rand() - 0.5) * 12, 2 + rand() * 1.5, 1.6 + rand());
    }
  },
});

piece('pickledGinger', 1.3, {
  count: 6,
  minDist: 50,
  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.bezierCurveTo(-4, -10, 6, -6, 12, -4);
    ctx.bezierCurveTo(8, 4, -4, 8, -12, 4);
    ctx.closePath();
    drop(ctx, 0.25);
    ctx.fillStyle = '#f27a92';
    ctx.fill();
    ctx.strokeStyle = '#a82a4a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    shine(ctx, -2, -3, 6, 1.2, 0.5);
  },
});

piece('tandooriChicken', 1.35, {
  count: 13,
  minDist: 32,
  draw(ctx, rand) {
    blob(ctx, 0, 0, 13, 0.45, rand, 8);
    drop(ctx, 0.4);
    const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 14);
    g.addColorStop(0, '#ffb060');
    g.addColorStop(0.7, '#f06a1e');
    g.addColorStop(1, '#a8340a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#4a0e02';
    ctx.lineWidth = 2;
    ctx.stroke();
    // tandoor char
    ctx.fillStyle = rgba('#2a0a02', 0.7);
    for (let i = 0; i < 3; i++) {
      blob(ctx, (rand() - 0.5) * 14, (rand() - 0.5) * 14, 1.8 + rand() * 1.6, 0.6, rand, 6);
      ctx.fill();
    }
    shine(ctx, -4, -5, 4, 1.6, 0.45);
  },
});

piece('raita', 1.4, {
  count: 8,
  minDist: 44,
  draw(ctx, rand) {
    blob(ctx, 0, 0, 10 + rand() * 3, 0.45, rand, 9);
    drop(ctx, 0.2);
    ctx.fillStyle = '#f4f8e8';
    ctx.fill();
    ctx.strokeStyle = '#9ab08a';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#3a9a3a';
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, (rand() - 0.5) * 10, (rand() - 0.5) * 10, 1.4, 0.8, rand() * 3);
      ctx.fill();
    }
  },
});

piece('kalamata', 1.4, {
  count: 10,
  minDist: 32,
  draw(ctx) {
    ellipse(ctx, 0, 0, 10, 6.5);
    drop(ctx, 0.35);
    const g = ctx.createRadialGradient(-3, -2, 1, 0, 0, 10);
    g.addColorStop(0, '#8a4a6a');
    g.addColorStop(1, '#3a1428');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#1a0610';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ellipse(ctx, 1, 0, 3.5, 2);
    ctx.fillStyle = '#c89aa8';
    ctx.fill();
    shine(ctx, -4, -2.5, 3, 1.2, 0.6);
  },
});

registerTopping('cajunShrimp', {
  count: 9,
  minDist: 40,
  draw(ctx, rand) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6a1a06';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0.3, Math.PI * 1.55);
    ctx.stroke();
    ctx.strokeStyle = '#e8502a';
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffb08a', 0.75);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0.6, Math.PI * 1.3);
    ctx.stroke();
    // blackened spice crust
    ctx.fillStyle = rgba('#3a0a02', 0.8);
    for (let i = 0; i < 9; i++) {
      const a = 0.4 + rand() * 4.4;
      const d = 9 + rand() * 6;
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, 1.2, 1);
      ctx.fill();
    }
    ctx.fillStyle = '#a8200a';
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.lineTo(21, 2);
    ctx.lineTo(19, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4a0a02';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  },
});

piece('andouille', 1.1, {
  count: 10,
  minDist: 34,
  draw(ctx, rand) {
    const r = 12;
    ellipse(ctx, 0, 0, r, r);
    drop(ctx, 0.4);
    ctx.fillStyle = '#4a1a0a';
    ctx.fill();
    ellipse(ctx, 0, 0, r - 2.5, r - 2.5);
    const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, r);
    g.addColorStop(0, '#c87a5a');
    g.addColorStop(1, '#8a3a22');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = rgba('#f8d8c8', 0.8);
    for (let i = 0; i < 6; i++) {
      blob(ctx, (rand() - 0.5) * 12, (rand() - 0.5) * 12, 1.4 + rand(), 0.6, rand, 5);
      ctx.fill();
    }
    ctx.strokeStyle = '#2a0a02';
    ctx.lineWidth = 1.6;
    ellipse(ctx, 0, 0, r, r);
    ctx.stroke();
  },
});

piece('friarielli', 1.1, {
  count: 10,
  minDist: 36,
  draw(ctx, rand) {
    // wilted broccoli rabe: dark crinkled leaf + a little floret
    ctx.beginPath();
    ctx.moveTo(-18, 2);
    for (let i = 0; i < 6; i++) ctx.quadraticCurveTo(-15 + i * 6, -10 - (i % 2) * 4, -12 + i * 6, -5);
    ctx.lineTo(18, 0);
    for (let i = 0; i < 6; i++) ctx.quadraticCurveTo(15 - i * 6, 9 + (i % 2) * 3, 12 - i * 6, 5);
    ctx.closePath();
    drop(ctx, 0.35);
    const g = ctx.createLinearGradient(0, -12, 0, 10);
    g.addColorStop(0, '#3a7a26');
    g.addColorStop(1, '#173a0e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#0c2206';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = rgba('#a8d87a', 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, -1);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ellipse(ctx, 10 + (rand() - 0.5) * 6, -6 + (rand() - 0.5) * 6, 2.4, 2.4);
      ctx.fillStyle = i % 2 ? '#4a8a2a' : '#6aa83a';
      ctx.fill();
    }
  },
});

// ——— Wild ———

registerTopping('grahamCrumb', {
  count: 20,
  minDist: 18,
  draw(ctx, rand) {
    for (let i = 0; i < 3; i++) {
      blob(ctx, (rand() - 0.5) * 10, (rand() - 0.5) * 10, 2.4 + rand() * 2, 0.6, rand, 5);
      ctx.fillStyle = i % 2 ? '#b8783a' : '#d89a5a';
      ctx.fill();
      ctx.strokeStyle = rgba('#6a3a12', 0.7);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },
});

function marshPiece(ctx: Ctx, rand: () => number, toast: number): void {
  // a standing marshmallow, seen from above at an angle: top face + front side
  roundRect(ctx, -13, -4, 26, 22, 7);
  ctx.fillStyle = '#e8ddd0';
  ctx.fill();
  ctx.strokeStyle = '#a8907a';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ellipse(ctx, 0, -4, 13, 9);
  const g = ctx.createRadialGradient(-2, -5, 1, 0, -4, 14);
  g.addColorStop(0, toast > 0.5 ? '#c8722a' : '#fffaf2');
  g.addColorStop(0.5, toast > 0.5 ? '#f0c088' : '#fff6ea');
  g.addColorStop(1, '#fffaf2');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#b8a088';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (toast > 0.8) {
    ctx.fillStyle = rgba('#5a2a0a', 0.6);
    blob(ctx, 1, -4, 4, 0.6, rand, 6);
    ctx.fill();
  }
  shine(ctx, -5, -7, 4, 1.6, 0.7);
}

registerTopping('marshMountain', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a heaped mountain of toasted marshmallows in the middle of the pie
    const pieces: [number, number, number][] = [];
    for (const [ring, n] of [[108, 11], [72, 8], [38, 5], [0, 1]] as const) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.05 + rand() * 0.2;
        const lift = (1 - ring / 108) * 80; // higher towards the summit
        pieces.push([C + Math.cos(a) * ring, C + Math.sin(a) * ring * 0.9 - lift, lift]);
      }
    }
    // mountain shadow, then a dome of melted fluff for the pile to sit on
    ellipse(ctx, C + 8, C + 16, 140, 126);
    ctx.fillStyle = rgba('#1a0804', 0.4);
    ctx.fill();
    blob(ctx, C, C - 18, 126, 0.12, rand, 14);
    const mg = ctx.createRadialGradient(C - 20, C - 70, 10, C, C - 10, 140);
    mg.addColorStop(0, '#fffaf0');
    mg.addColorStop(0.6, '#f4e4cc');
    mg.addColorStop(1, '#c8a07a');
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.5);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    pieces.sort((p, q) => p[2] - q[2] || p[1] - q[1]);
    for (const [x, y, lift] of pieces) at(ctx, x, y, (rand() - 0.5) * 0.3, () => marshPiece(ctx, rand, rand() * 0.6 + lift / 160), 1.45);
    // caramel drizzle over the peak
    for (let i = 0; i < 3; i++) {
      const pts: [number, number][] = [];
      for (let t = -1; t <= 1.001; t += 0.12) {
        const x = C + t * 100;
        pts.push([x, C - 50 + i * 34 + Math.sin(t * 9 + i) * 14 - (1 - Math.abs(t)) * 50]);
      }
      sauceLine(ctx, pts, '#d8892a', '#4a2404', rgba('#ffe0a0', 0.85), 5);
    }
  },
});

registerTopping('leopard', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // leopard-spotted cornicione and a drizzle of olive oil
    ctx.save();
    ellipse(ctx, C, C, PIZZA_R - 1, PIZZA_R - 1);
    ctx.clip();
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2;
      const d = PIZZA_R - 10 - rand() * 26;
      blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 3 + rand() * 6, 0.6, rand, 7);
      ctx.fillStyle = rgba('#1e0c04', 0.55 + rand() * 0.35);
      ctx.fill();
    }
    ctx.restore();
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2;
      const d = 30 + rand() * 100;
      ellipse(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 6 + rand() * 6, 3 + rand() * 2, rand() * 3);
      ctx.fillStyle = rgba('#d8b82a', 0.35);
      ctx.fill();
    }
  },
});

piece('buffalo', 1.25, {
  count: 11,
  minDist: 54,
  draw(ctx, rand) {
    // torn buffalo mozzarella with a milky pool
    blob(ctx, 0, 0, 24, 0.4, rand, 11);
    ctx.fillStyle = rgba('#fffef6', 0.5);
    ctx.fill();
    blob(ctx, 0, 0, 17, 0.55, rand, 9);
    drop(ctx, 0.2);
    const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, 19);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.8, '#fbf8ee');
    g.addColorStop(1, '#e8dcc0');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#b8a888', 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // torn strands
    ctx.strokeStyle = rgba('#d8ccb0', 0.9);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo((rand() - 0.5) * 14, (rand() - 0.5) * 14);
      ctx.lineTo((rand() - 0.5) * 20, (rand() - 0.5) * 20);
      ctx.stroke();
    }
    shine(ctx, -6, -6, 6, 2.5, 0.8);
  },
});

piece('cherryTomato', 1.4, {
  count: 15,
  minDist: 34,
  draw(ctx, rand) {
    const r = 11;
    ellipse(ctx, 0, 0, r, r * 0.92);
    drop(ctx, 0.35);
    ctx.fillStyle = '#c8180a';
    ctx.fill();
    ctx.strokeStyle = '#5a0602';
    ctx.lineWidth = 2;
    ctx.stroke();
    ellipse(ctx, 0, 0, r - 2.5, r * 0.92 - 2.5);
    ctx.fillStyle = '#f04a2a';
    ctx.fill();
    // seed chambers
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + rand() * 0.3;
      ellipse(ctx, Math.cos(a) * 4, Math.sin(a) * 4, 3, 2.2, a);
      ctx.fillStyle = '#ffb08a';
      ctx.fill();
      ctx.fillStyle = '#fff0b8';
      ellipse(ctx, Math.cos(a) * 4, Math.sin(a) * 4, 1, 0.8);
      ctx.fill();
    }
    shine(ctx, -4, -4, 3.5, 1.5, 0.65);
  },
});

piece('frostingRosette', 1.3, {
  count: 10,
  minDist: 40,
  draw(ctx, rand) {
    const pink = rand() > 0.35;
    const col = pink ? '#ff8ab8' : '#8ad8f0';
    ellipse(ctx, 0, 0, 15, 15);
    drop(ctx, 0.3);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = shade(col, -0.45);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // piped swirl
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 4; t += 0.25) {
      const d = 12 * (1 - t / (Math.PI * 4.4));
      const x = Math.cos(t) * d;
      const y = Math.sin(t) * d;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = shade(col, -0.3);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    shine(ctx, -5, -5, 4, 1.8, 0.6);
  },
});

registerTopping('candles', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // five candles standing in a ring. The top is squashed 2:1 on the table, so they're drawn tall.
    const cols = ['#ff5a8a', '#4cc9f0', '#ffd23f', '#3ddc97', '#b06bff'];
    const spots: [number, number, string][] = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      spots.push([C + Math.cos(a) * 62, C + 30 + Math.sin(a) * 52, cols[i]]);
    }
    spots.sort((p, q) => p[1] - q[1]);
    for (const [x, y, col] of spots) {
      const h = 78;
      ellipse(ctx, x + 3, y + 3, 9, 6);
      ctx.fillStyle = rgba('#2a0e04', 0.35);
      ctx.fill();
      roundRect(ctx, x - 6, y - h, 12, h, 4);
      const g = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
      g.addColorStop(0, shade(col, 0.35));
      g.addColorStop(1, shade(col, -0.25));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      roundRect(ctx, x - 6, y - h, 12, h, 4);
      ctx.clip();
      ctx.strokeStyle = rgba('#ffffff', 0.85);
      ctx.lineWidth = 3.5;
      for (let s = -h; s < 10; s += 14) {
        ctx.beginPath();
        ctx.moveTo(x - 8, y + s + 8);
        ctx.lineTo(x + 8, y + s);
        ctx.stroke();
      }
      ctx.restore();
      roundRect(ctx, x - 6, y - h, 12, h, 4);
      ctx.strokeStyle = shade(col, -0.55);
      ctx.lineWidth = 2;
      ctx.stroke();
      // wick + flame
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x, y - h - 6);
      ctx.stroke();
      const fy = y - h - 18;
      const glow = ctx.createRadialGradient(x, fy, 2, x, fy, 22);
      glow.addColorStop(0, rgba('#fff2a0', 0.75));
      glow.addColorStop(1, rgba('#ffb020', 0));
      ctx.fillStyle = glow;
      ellipse(ctx, x, fy, 22, 22);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, fy - 16 - rand() * 3);
      ctx.quadraticCurveTo(x + 8, fy + 2, x, fy + 10);
      ctx.quadraticCurveTo(x - 8, fy + 2, x, fy - 16);
      ctx.fillStyle = '#ffb020';
      ctx.fill();
      ctx.strokeStyle = '#c85a00';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ellipse(ctx, x, fy + 3, 3, 5);
      ctx.fillStyle = '#fff8d0';
      ctx.fill();
    }
  },
});
