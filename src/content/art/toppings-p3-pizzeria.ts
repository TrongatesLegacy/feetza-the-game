// Toppings for the Pizzeria pizzas in src/content/pizzas/p3.ts: the fanciest pies, bought with
// Golden Crusts, so everything here leans glossy and luxurious (lobster, caviar, gold leaf).
//
// Piece toppings draw one piece centred at the origin (already translated and rotated by the caller).
// Overlays (burrata, hollandaise, thermidorSauce, goldRim) use count 1 and reset the transform to
// paint across the whole PIZZA_SIZE pizza top; drawTopping wraps each call in save/restore.

import { PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
import { type Ctx, blob, ellipse, mix, rgba, shade } from '../../art/util';

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

/** Poisson-ish scatter of points inside a disc of radius `r` (overlay coords). */
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
function zigzag(angle: number, rows: number, amp: number, step: number, r: number, rand: () => number): [number, number][][] {
  const lines: [number, number][][] = [];
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  for (let i = 0; i < rows; i++) {
    const v = (i - (rows - 1) / 2) * ((r * 2) / rows);
    const half = Math.sqrt(Math.max(0, r * r - v * v));
    const pts: [number, number][] = [];
    let k = 0;
    for (let u = -half; u <= half; u += step) {
      const off = (k++ % 2 ? amp : -amp) + (rand() - 0.5) * 4;
      pts.push([C + ca * u - sa * (v + off), C + sa * u + ca * (v + off)]);
    }
    if (pts.length > 1) lines.push(pts);
  }
  return lines;
}

/** A four-point glint, the universal "this is expensive" sparkle. */
function sparkle(ctx: Ctx, x: number, y: number, s: number, a = 0.95): void {
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s * 0.7, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s * 0.7, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

// ——— Seafood ———

piece('lobster', 1.45, {
  count: 13,
  minDist: 38,
  draw(ctx, rand) {
    // a curled chunk of tail meat: coral-red streaked back fading into white flesh, in a C shape
    const chunk = () => {
      ctx.beginPath();
      ctx.moveTo(-15, 4);
      ctx.bezierCurveTo(-17, -12, 6, -17, 15, -6);
      ctx.quadraticCurveTo(18, 4, 12, 10);
      ctx.quadraticCurveTo(6, 7, 1, 8);
      ctx.quadraticCurveTo(-4, 9, -6, 12);
      ctx.quadraticCurveTo(-14, 12, -15, 4);
      ctx.closePath();
    };
    chunk();
    drop(ctx, 0.34);
    const g = ctx.createLinearGradient(0, -15, 0, 10);
    g.addColorStop(0, '#d8301a');
    g.addColorStop(0.35, '#f86a42');
    g.addColorStop(0.6, '#ffd8c4');
    g.addColorStop(1, '#fffaf2');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    chunk();
    ctx.clip();
    // segment bands of the tail and red streaks running into the meat
    ctx.strokeStyle = rgba('#a01a08', 0.6);
    ctx.lineWidth = 1.4;
    for (const x of [-7, 1, 9]) {
      ctx.beginPath();
      ctx.moveTo(x - 2, -16);
      ctx.quadraticCurveTo(x + 1, -8, x - 1, -2);
      ctx.stroke();
    }
    ctx.fillStyle = rgba('#e83a1e', 0.55);
    for (let i = 0; i < 6; i++) {
      ellipse(ctx, -12 + rand() * 24, -6 + rand() * 6, 2.5, 0.9, rand() * 0.6);
      ctx.fill();
    }
    ctx.restore();
    chunk();
    ctx.strokeStyle = shade('#e8482a', -0.45);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // butter glaze
    shine(ctx, -5, -7, 6, 2, 0.65);
    shine(ctx, -9, 5, 3, 1.2, 0.6);
  },
});

piece('caviar', 1.45, {
  count: 13,
  minDist: 38,
  draw(ctx, rand) {
    // crème fraîche quenelle under a glossy mound of black pearls
    blob(ctx, 0, 0, 16, 0.3, rand, 10);
    drop(ctx, 0.28);
    const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, 17);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#ece2cc');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#b8a888', 0.8);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ellipse(ctx, 1, 1, 11, 10);
    ctx.fillStyle = '#0a0a10';
    ctx.fill();
    // pearls: outer ring first, inner last so the mound looks domed
    const pearls: [number, number][] = [];
    for (let ring = 0; ring < 3; ring++) {
      const n = [12, 7, 1][ring];
      const d = [8, 4, 0][ring];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand() * 0.4;
        pearls.push([Math.cos(a) * d + rand() - 0.5, Math.sin(a) * d + rand() - 0.5]);
      }
    }
    for (const [x, y] of pearls) {
      const pg = ctx.createRadialGradient(x - 0.8, y - 0.8, 0.2, x, y, 3);
      pg.addColorStop(0, '#5a5a6a');
      pg.addColorStop(0.6, '#1a1a24');
      pg.addColorStop(1, '#050508');
      ellipse(ctx, x, y, 2.8, 2.8);
      ctx.fillStyle = pg;
      ctx.fill();
      ellipse(ctx, x - 0.9, y - 1, 0.9, 0.7);
      ctx.fillStyle = rgba('#ffffff', 0.9);
      ctx.fill();
    }
    shine(ctx, -3, -4, 4, 1.4, 0.45);
  },
});

piece('smokedSalmon', 1.5, {
  count: 14,
  minDist: 40,
  draw(ctx, rand) {
    // a loose ribbon folded back on itself
    const len = 20;
    const wave = 4 + rand() * 2;
    const half = (x: number) => 8 + Math.sin(x * 0.2 + 1) * 2;
    const mid = (x: number) => Math.sin(x * 0.16) * wave;
    const strip = () => {
      ctx.beginPath();
      for (let x = -len; x <= len; x += 2) ctx.lineTo(x, mid(x) - half(x));
      for (let x = len; x >= -len; x -= 2) ctx.lineTo(x, mid(x) + half(x));
      ctx.closePath();
    };
    strip();
    drop(ctx, 0.3);
    const g = ctx.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, '#ffa070');
    g.addColorStop(0.5, '#f4743e');
    g.addColorStop(1, '#d0502a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    strip();
    ctx.clip();
    // white fat lines running diagonally across the slice
    ctx.strokeStyle = rgba('#fff2e6', 0.75);
    ctx.lineWidth = 1.3;
    for (let x = -len - 10; x < len + 10; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, -14);
      ctx.quadraticCurveTo(x + 4, 0, x + 2, 14);
      ctx.stroke();
    }
    // fold shadows at the crests
    ctx.fillStyle = rgba('#8a2a10', 0.28);
    ellipse(ctx, -9, 0, 3, 12);
    ctx.fill();
    ellipse(ctx, 10, 0, 3, 12);
    ctx.fill();
    ctx.restore();
    strip();
    ctx.strokeStyle = shade('#f4743e', -0.45);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // translucent sheen
    shine(ctx, -2, mid(-2) - 3, 9, 2, 0.45);
  },
});

piece('oyster', 1.6, {
  count: 10,
  minDist: 50,
  draw(ctx, rand) {
    // rough grey half shell, a pearly lip, then spinach butter and golden crumbs
    blob(ctx, 0, 0, 20, 0.28, rand, 11);
    drop(ctx, 0.38);
    const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, 22);
    g.addColorStop(0, '#d8d4cc');
    g.addColorStop(0.7, '#9e9a92');
    g.addColorStop(1, '#6a665e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#3e3a34';
    ctx.lineWidth = 2;
    ctx.stroke();
    // ridged growth rings
    ctx.strokeStyle = rgba('#4e4a44', 0.55);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) {
      blob(ctx, 0, 0, 19 - i * 2, 0.25, rand, 11);
      ctx.stroke();
    }
    // nacre lip
    ellipse(ctx, 0.5, 0.5, 14, 12);
    const n = ctx.createRadialGradient(-4, -4, 1, 0, 0, 15);
    n.addColorStop(0, '#ffffff');
    n.addColorStop(0.7, '#ece6f2');
    n.addColorStop(1, '#c8c0d4');
    ctx.fillStyle = n;
    ctx.fill();
    // spinach-butter filling
    blob(ctx, 1, 1, 11, 0.3, rand, 9);
    const s = ctx.createRadialGradient(-2, -2, 1, 1, 1, 12);
    s.addColorStop(0, '#7ab23a');
    s.addColorStop(1, '#3a6a1a');
    ctx.fillStyle = s;
    ctx.fill();
    ctx.strokeStyle = shade('#4e8a24', -0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
    // golden crumbs
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 3 ? '#e8b048' : '#b87420';
      ellipse(ctx, (rand() - 0.5) * 14 + 1, (rand() - 0.5) * 14 + 1, 1.4 + rand() * 0.9, 1.1, rand() * 3);
      ctx.fill();
    }
    shine(ctx, -4, -4, 4, 1.6, 0.6);
  },
});

piece('lobsterClaw', 1.6, {
  count: 8,
  minDist: 54,
  draw(ctx, rand) {
    // the star of the thermidor: a bold red claw, pincers slightly open
    const red = '#d8341a';
    const outline = shade(red, -0.45);
    const claw = () => {
      ctx.beginPath();
      // knuckle at the back
      ctx.moveTo(-26, -5);
      ctx.quadraticCurveTo(-30, 0, -26, 5);
      ctx.lineTo(-16, 8);
      // palm underside sweeping into the lower (moving) finger
      ctx.quadraticCurveTo(-4, 16, 8, 10);
      ctx.quadraticCurveTo(20, 9, 30, 4);
      ctx.quadraticCurveTo(22, 3, 10, 3);
      // the gape between the fingers
      ctx.quadraticCurveTo(6, 0, 10, -3);
      // upper (fixed) finger, longer and hooked
      ctx.quadraticCurveTo(24, -4, 32, -2);
      ctx.quadraticCurveTo(26, -12, 8, -13);
      ctx.quadraticCurveTo(-6, -17, -16, -8);
      ctx.closePath();
    };
    claw();
    drop(ctx, 0.4, 3, 4);
    const g = ctx.createRadialGradient(-8, -6, 2, -2, 0, 30);
    g.addColorStop(0, '#ff7a4a');
    g.addColorStop(0.55, red);
    g.addColorStop(1, '#8a1406');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    // joint line between knuckle and palm
    ctx.strokeStyle = rgba(outline, 0.8);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-17, -8);
    ctx.quadraticCurveTo(-13, 0, -16, 8);
    ctx.stroke();
    // bumpy shell texture
    ctx.fillStyle = rgba('#ffb08a', 0.75);
    for (let i = 0; i < 7; i++) {
      ellipse(ctx, -10 + rand() * 22, -8 + rand() * 12, 1.2, 1);
      ctx.fill();
    }
    // creamy pincer tips
    ctx.fillStyle = '#f6e2c8';
    ellipse(ctx, 30, -2.5, 2.2, 1.4, -0.2);
    ctx.fill();
    ellipse(ctx, 28, 4.5, 2, 1.3, 0.2);
    ctx.fill();
    shine(ctx, -6, -9, 8, 2.4, 0.6);
  },
});

registerTopping('thermidorSauce', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // creamy gratin sauce, browned and bubbling under the grill
    ctx.save();
    ellipse(ctx, C, C, PIZZA_R * 0.79, PIZZA_R * 0.79);
    ctx.clip();
    for (let i = 0; i < 34; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 140;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 20 + rand() * 18;
      blob(ctx, x, y, r, 0.4, rand, 9);
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
      g.addColorStop(0, '#fff4cc');
      g.addColorStop(0.8, '#f4dc9a');
      g.addColorStop(1, '#e0bc72');
      ctx.fillStyle = g;
      ctx.fill();
    }
    // browned patches
    for (let i = 0; i < 16; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 135;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 10 + rand() * 16;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, rgba('#8a4a14', 0.85));
      g.addColorStop(0.5, rgba('#c07a30', 0.6));
      g.addColorStop(1, rgba('#d89a48', 0));
      ctx.fillStyle = g;
      blob(ctx, x, y, r, 0.5, rand, 8);
      ctx.fill();
    }
    // bubbles with a bright rim
    for (let i = 0; i < 30; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 138;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 2 + rand() * 3.5;
      ellipse(ctx, x, y, r, r);
      ctx.fillStyle = rgba('#a85a1c', 0.45);
      ctx.fill();
      ellipse(ctx, x - r * 0.3, y - r * 0.3, r * 0.45, r * 0.35);
      ctx.fillStyle = rgba('#ffffff', 0.7);
      ctx.fill();
    }
    // paprika dust
    for (let i = 0; i < 50; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 135;
      ctx.fillStyle = rgba('#c8301a', 0.6);
      ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1.6, 1.6);
    }
    ctx.restore();
  },
});

// ——— Meat ———

piece('duck', 1.5, {
  count: 11,
  minDist: 42,
  draw(ctx, rand) {
    // a fan of thick rosy breast slices, each with a crisp mahogany skin edge
    for (let k = 0; k < 2; k++) {
      ctx.save();
      ctx.translate(k * 5 - 2.5, k * 7 - 4);
      ctx.rotate(k * 0.22 - 0.1);
      const slice = () => {
        ctx.beginPath();
        ctx.moveTo(-17, -3);
        ctx.quadraticCurveTo(0, -15, 17, -4);
        ctx.quadraticCurveTo(20, 2, 15, 7);
        ctx.quadraticCurveTo(0, 2, -15, 7);
        ctx.quadraticCurveTo(-21, 2, -17, -3);
        ctx.closePath();
      };
      slice();
      drop(ctx, 0.3);
      const g = ctx.createLinearGradient(0, -10, 0, 7);
      g.addColorStop(0, '#c04a5a');
      g.addColorStop(0.5, '#f2939a');
      g.addColorStop(1, '#b84452');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      slice();
      ctx.clip();
      // crispy skin and its cream fat layer along the curved back
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#f6e0b4';
      ctx.beginPath();
      ctx.moveTo(-20, -0.5);
      ctx.quadraticCurveTo(0, -11, 20, -1.5);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#7a3a10';
      ctx.beginPath();
      ctx.moveTo(-20, -3.5);
      ctx.quadraticCurveTo(0, -15, 20, -4.5);
      ctx.stroke();
      ctx.fillStyle = rgba('#5a2a08', 0.7);
      for (let i = 0; i < 4; i++) {
        ellipse(ctx, -14 + rand() * 28, -6 + rand() * 1.5, 1.3, 0.8);
        ctx.fill();
      }
      ctx.restore();
      slice();
      ctx.strokeStyle = shade('#d65a6a', -0.45);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      shine(ctx, -4, 0, 6, 1.2, 0.4);
      ctx.restore();
    }
  },
});

piece('marrowBone', 1.6, {
  count: 9,
  minDist: 48,
  draw(ctx, rand) {
    // cross-cut bone: a thick roasted ring holding a glossy, caramel marrow centre
    ctx.save();
    ctx.scale(1.12, 0.92);
    blob(ctx, 0, 0, 17, 0.22, rand, 9);
    ctx.restore();
    drop(ctx, 0.45, 2.5, 3.5);
    const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, 19);
    g.addColorStop(0, '#fff4dc');
    g.addColorStop(0.55, '#e8d0a0');
    g.addColorStop(1, '#a8784a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade('#a8784a', -0.45);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    // roasted edge
    ctx.strokeStyle = rgba('#8a5a2a', 0.5);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 15, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    // porous bone flecks
    ctx.fillStyle = rgba('#a08458', 0.6);
    for (let i = 0; i < 8; i++) {
      const a = rand() * Math.PI * 2;
      ellipse(ctx, Math.cos(a) * 13.5, Math.sin(a) * 13.5, 0.9, 0.9);
      ctx.fill();
    }
    blob(ctx, 0.5, 0.5, 9, 0.25, rand, 8);
    const m = ctx.createRadialGradient(-3, -3, 1, 0, 0, 10);
    m.addColorStop(0, '#f0b060');
    m.addColorStop(0.5, '#a8601c');
    m.addColorStop(1, '#5a2a08');
    ctx.fillStyle = m;
    ctx.fill();
    ctx.strokeStyle = '#5a2a08';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // sea salt flakes on the marrow
    ctx.fillStyle = rgba('#ffffff', 0.9);
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-4 + rand() * 7, -3 + rand() * 7, 1.6, 1.4);
    }
    shine(ctx, -3, -4, 4, 1.6, 0.8);
  },
});

piece('prosciuttoRose', 1.55, {
  count: 12,
  minDist: 40,
  draw(ctx, rand) {
    // ham folded into a rose: ruffled outer petals, then a tight spiral
    blob(ctx, 0, 0, 16, 0.3, rand, 12);
    drop(ctx, 0.3);
    const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, 17);
    g.addColorStop(0, '#f6b0b2');
    g.addColorStop(0.7, '#e47e88');
    g.addColorStop(1, '#b84a5a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade('#e47e88', -0.45);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // petal folds: a spiral with a fat streak riding just outside it
    const spiral = (off: number) => {
      ctx.beginPath();
      for (let t = 0; t <= Math.PI * 4.2; t += 0.15) {
        const r = 2 + t * 0.95 + off;
        const x = Math.cos(t) * r;
        const y = Math.sin(t) * r;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    };
    ctx.lineCap = 'round';
    spiral(0);
    ctx.strokeStyle = '#9a3446';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    spiral(1.6);
    ctx.strokeStyle = rgba('#fff2ee', 0.7);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ellipse(ctx, 0, 0, 2.5, 2.5);
    ctx.fillStyle = '#9a3446';
    ctx.fill();
    shine(ctx, -6, -6, 4, 1.6, 0.5);
  },
});

// ——— Veg and fruit ———

const HEIRLOOM: { skin: string; flesh: string; gel: string; stripe?: string }[] = [
  { skin: '#d8301c', flesh: '#ee5a3a', gel: '#f8a080' },
  { skin: '#f0a810', flesh: '#ffcc3a', gel: '#fff0a0' },
  { skin: '#6a9a2a', flesh: '#a8c84a', gel: '#e2f0a0', stripe: '#f0c040' },
  { skin: '#5a1e2e', flesh: '#8a3448', gel: '#c87a80' },
  { skin: '#e0601a', flesh: '#ff8a3a', gel: '#ffc890' },
];

piece('heirloom', 1.35, {
  count: 22,
  minDist: 34,
  draw(ctx, rand) {
    // a slice of heirloom tomato in one of five colours, so the pie looks like a market stall
    const t = HEIRLOOM[Math.floor(rand() * HEIRLOOM.length)];
    const r = 14 + rand() * 6;
    blob(ctx, 0, 0, r, 0.12, rand, 10);
    drop(ctx, 0.32);
    ctx.fillStyle = t.flesh;
    ctx.fill();
    ctx.strokeStyle = t.skin;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = shade(t.skin, -0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
    // seed pockets (heirlooms have lots, and irregular)
    const n = 5 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.3;
      const d = r * 0.5;
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, r * 0.27, r * 0.18, a);
      ctx.fillStyle = t.gel;
      ctx.fill();
      ctx.fillStyle = rgba('#fff6d0', 0.95);
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, 1, 1.4, a);
      ctx.fill();
    }
    ellipse(ctx, 0, 0, r * 0.2, r * 0.2);
    ctx.fillStyle = mix(t.flesh, '#ffffff', 0.25);
    ctx.fill();
    if (t.stripe) {
      // green zebra stripes
      ctx.save();
      blob(ctx, 0, 0, r, 0.12, rand, 10);
      ctx.clip();
      ctx.strokeStyle = rgba(t.stripe, 0.6);
      ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 6, -r);
        ctx.quadraticCurveTo(i * 6 + 4, 0, i * 6, r);
        ctx.stroke();
      }
      ctx.restore();
    }
    shine(ctx, -r * 0.35, -r * 0.45, r * 0.3, r * 0.12, 0.55);
  },
});

piece('sanMarzano', 1.4, {
  count: 15,
  minDist: 40,
  draw(ctx, rand) {
    // a whole peeled plum tomato, long and glossy, torn open along one side
    blob(ctx, 0, 0, 22, 0.35, rand, 11);
    ctx.fillStyle = rgba('#c0200e', 0.35);
    ctx.fill();
    ellipse(ctx, 0, 0, 20, 10);
    drop(ctx, 0.35);
    const g = ctx.createRadialGradient(-6, -4, 2, 0, 0, 20);
    g.addColorStop(0, '#ff6a4a');
    g.addColorStop(0.6, '#d8281a');
    g.addColorStop(1, '#8a1006');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade('#d8281a', -0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    // the tear: pale flesh and seeds showing through
    ctx.beginPath();
    ctx.moveTo(-12, 3);
    ctx.quadraticCurveTo(-2, 9, 13, 3);
    ctx.quadraticCurveTo(0, 2, -12, 3);
    ctx.fillStyle = '#ff9a78';
    ctx.fill();
    ctx.fillStyle = '#fff0b8';
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, -8 + i * 5.5, 4.5 + rand(), 1.1, 1.5, 0.3);
      ctx.fill();
    }
    // segment line down its length
    ctx.strokeStyle = rgba('#8a1006', 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.quadraticCurveTo(0, -5, 16, -2);
    ctx.stroke();
    shine(ctx, -6, -5, 7, 2, 0.7);
  },
});

piece('porcini', 1.5, {
  count: 13,
  minDist: 40,
  draw(ctx, rand) {
    // a thick porcini slice: fat chestnut cap, spongy yellow pores, bulbous pale stem
    const outline = shade('#8a4e20', -0.45);
    const slice = () => {
      ctx.beginPath();
      ctx.moveTo(-18, -2);
      ctx.bezierCurveTo(-18, -16, 18, -16, 18, -2);
      ctx.quadraticCurveTo(12, 0, 7, 1);
      ctx.bezierCurveTo(12, 8, 10, 17, 0, 17);
      ctx.bezierCurveTo(-10, 17, -12, 8, -7, 1);
      ctx.quadraticCurveTo(-12, 0, -18, -2);
      ctx.closePath();
    };
    slice();
    drop(ctx, 0.35);
    const g = ctx.createRadialGradient(-3, 4, 2, 0, 4, 18);
    g.addColorStop(0, '#fffaf0');
    g.addColorStop(1, '#ead8b4');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    slice();
    ctx.clip();
    // cap skin band
    ctx.beginPath();
    ctx.moveTo(-20, -1);
    ctx.bezierCurveTo(-20, -19, 20, -19, 20, -1);
    ctx.bezierCurveTo(16, -11, -16, -11, -20, -1);
    const cg = ctx.createLinearGradient(0, -14, 0, -4);
    cg.addColorStop(0, '#6a3a14');
    cg.addColorStop(1, '#a8682e');
    ctx.fillStyle = cg;
    ctx.fill();
    // pore layer under the cap
    ctx.fillStyle = rgba('#d8c060', 0.85);
    ctx.fillRect(-20, -2.5, 40, 3.5);
    ctx.restore();
    // stem grain
    ctx.strokeStyle = rgba('#b89a70', 0.6);
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 3, 3);
      ctx.quadraticCurveTo(i * 5, 10, i * 3, 15);
      ctx.stroke();
    }
    slice();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // a golden sear on one side
    ctx.fillStyle = rgba('#c07a2a', 0.4);
    ellipse(ctx, 5, 9, 3 + rand() * 2, 4, 0.3);
    ctx.fill();
    shine(ctx, -7, -9, 5, 1.6, 0.5);
  },
});

piece('asparagus', 1.5, {
  count: 12,
  minDist: 42,
  draw(ctx, rand) {
    // one spear: a long green stalk with a scaly, purple-tinged tip
    const len = 22 + rand() * 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#1a2a08', 0.3);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-len + 2, 3);
    ctx.lineTo(len - 6, 3);
    ctx.stroke();
    ctx.strokeStyle = shade('#6aa83a', -0.45);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(len - 8, 0);
    ctx.stroke();
    const g = ctx.createLinearGradient(0, -3, 0, 3);
    g.addColorStop(0, '#a8d86a');
    g.addColorStop(1, '#4e8a24');
    ctx.strokeStyle = g;
    ctx.lineWidth = 5.5;
    ctx.stroke();
    // cut end
    ellipse(ctx, -len, 0, 2.2, 3);
    ctx.fillStyle = '#d8eaa0';
    ctx.fill();
    // tip
    ctx.beginPath();
    ctx.moveTo(len - 12, -4.5);
    ctx.quadraticCurveTo(len + 2, -4, len + 4, 0);
    ctx.quadraticCurveTo(len + 2, 4, len - 12, 4.5);
    ctx.closePath();
    const tg = ctx.createLinearGradient(len - 12, 0, len + 4, 0);
    tg.addColorStop(0, '#5a9a2a');
    tg.addColorStop(1, '#5a4a3a');
    ctx.fillStyle = tg;
    ctx.fill();
    ctx.strokeStyle = shade('#5a7a2a', -0.45);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // overlapping bracts on the tip and a couple down the stalk
    ctx.strokeStyle = rgba('#2a3a10', 0.7);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const x = len - 9 + i * 4;
      ctx.beginPath();
      ctx.moveTo(x, -3.5 + i * 0.7);
      ctx.quadraticCurveTo(x + 3, 0, x, 3.5 - i * 0.7);
      ctx.stroke();
    }
    for (const x of [-len * 0.45, len * 0.05]) {
      ctx.fillStyle = '#4e7a24';
      ctx.beginPath();
      ctx.moveTo(x, -3);
      ctx.lineTo(x + 5, -1);
      ctx.lineTo(x, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = rgba('#ffffff', 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-len + 3, -1.8);
    ctx.lineTo(len - 12, -1.8);
    ctx.stroke();
  },
});

piece('orange', 1.45, {
  count: 11,
  minDist: 40,
  draw(ctx, rand) {
    // a glazed half-slice of orange: rind, pith and juicy segments
    const r = 16 + rand() * 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI);
    ctx.closePath();
    drop(ctx, 0.32);
    ctx.fillStyle = '#f07a10';
    ctx.fill();
    ctx.strokeStyle = shade('#f07a10', -0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#fff2d8';
    ctx.fill();
    const g = ctx.createRadialGradient(0, 2, 1, 0, 2, r);
    g.addColorStop(0, '#ffd27a');
    g.addColorStop(1, '#ff9a1a');
    for (let i = 0; i < 5; i++) {
      const a0 = (i / 5) * Math.PI + 0.06;
      const a1 = ((i + 1) / 5) * Math.PI - 0.06;
      ctx.beginPath();
      ctx.moveTo(Math.cos((a0 + a1) / 2) * 2, Math.sin((a0 + a1) / 2) * 2);
      ctx.arc(0, 0, r - 5, a0, a1);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    }
    // juice vesicles and the glaze gleam
    ctx.fillStyle = rgba('#fff0b0', 0.8);
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI;
      const d = 4 + rand() * (r - 10);
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, 1.3, 0.8, a);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r + 1, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    shine(ctx, -r * 0.4, r * 0.35, 4, 1.4, 0.7);
  },
});

piece('blackGarlic', 1.4, {
  count: 18,
  minDist: 26,
  draw(ctx, rand) {
    // a soft fermented clove: glossy black-brown, slightly squashed
    const s = 0.85 + rand() * 0.3;
    ctx.scale(s, s);
    const clove = () => {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(8, -5, 7, 3);
      ctx.quadraticCurveTo(5, 9, 0, 9);
      ctx.quadraticCurveTo(-6, 9, -7, 3);
      ctx.quadraticCurveTo(-7, -5, 0, -10);
      ctx.closePath();
    };
    clove();
    drop(ctx, 0.35);
    const g = ctx.createRadialGradient(-2, -3, 1, 0, 0, 11);
    g.addColorStop(0, '#6a4a30');
    g.addColorStop(0.5, '#2e1c10');
    g.addColorStop(1, '#120804');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#3a2214';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // a crease and a sticky caramel gleam
    ctx.strokeStyle = rgba('#8a5a30', 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1, -7);
    ctx.quadraticCurveTo(3, 0, 1, 7);
    ctx.stroke();
    shine(ctx, -2.5, -3, 2.2, 1.2, 0.75);
  },
});

// ——— Overlays ———

registerTopping('burrata', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // one big torn burrata dead centre, stracciatella spilling out to the lower right;
    // scaled up a touch so it still reads as the centrepiece on a 150 px portrait
    ctx.translate(C, C);
    ctx.scale(1.18, 1.18);
    ctx.translate(-C, -C);
    const bx = C - 8;
    const by = C - 10;
    // milky cream pool
    blob(ctx, C + 8, C + 8, 64, 0.25, rand, 14);
    ctx.fillStyle = rgba('#fffaf0', 0.3);
    ctx.fill();
    // stracciatella spill
    blob(ctx, C + 26, C + 26, 46, 0.35, rand, 12);
    ctx.fillStyle = rgba('#7a5a30', 0.25);
    ctx.save();
    ctx.translate(2, 3);
    ctx.fill();
    ctx.restore();
    const sg = ctx.createRadialGradient(C + 18, C + 18, 4, C + 26, C + 26, 48);
    sg.addColorStop(0, '#fffef8');
    sg.addColorStop(1, '#f4ead2');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = rgba('#c8b490', 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // creamy shreds
    ctx.strokeStyle = rgba('#e0d0b0', 0.9);
    ctx.lineWidth = 2;
    for (let i = 0; i < 22; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * 38;
      const x = C + 28 + Math.cos(a) * d;
      const y = C + 28 + Math.sin(a) * d;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 4 + rand() * 4, y - 4, x + 3 + rand() * 8, y + 2 + rand() * 4);
      ctx.stroke();
    }
    ctx.fillStyle = rgba('#ffffff', 0.75);
    for (let i = 0; i < 9; i++) {
      ellipse(ctx, C + 14 + rand() * 30, C + 14 + rand() * 30, 3 + rand() * 3, 1.5, -0.6);
      ctx.fill();
    }
    // the ball itself, with a deep contact shadow so it lifts off a pale base
    ellipse(ctx, bx + 5, by + 8, 52, 50);
    ctx.fillStyle = rgba('#4a2a0a', 0.4);
    ctx.fill();
    ellipse(ctx, bx, by, 48, 46);
    const g = ctx.createRadialGradient(bx - 16, by - 18, 4, bx, by, 50);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#f8f2e4');
    g.addColorStop(1, '#cdb88e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#8a7448';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // the knot where the pouch was tied
    ctx.strokeStyle = rgba('#c8b48c', 0.9);
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.75 + i * 0.25;
      ctx.beginPath();
      ctx.moveTo(bx - 6, by - 10);
      ctx.quadraticCurveTo(bx - 6 + Math.cos(a) * 12, by - 10 + Math.sin(a) * 12, bx - 6 + Math.cos(a) * 22, by - 10 + Math.sin(a) * 20);
      ctx.stroke();
    }
    // the tear, opening towards the spill
    ctx.beginPath();
    ctx.moveTo(bx + 8, by + 40);
    ctx.lineTo(bx + 14, by + 24);
    ctx.lineTo(bx + 22, by + 26);
    ctx.lineTo(bx + 28, by + 12);
    ctx.lineTo(bx + 36, by + 14);
    ctx.lineTo(bx + 42, by + 4);
    ctx.quadraticCurveTo(bx + 50, by + 30, bx + 30, by + 44);
    ctx.quadraticCurveTo(bx + 18, by + 48, bx + 8, by + 40);
    ctx.closePath();
    ctx.fillStyle = '#fffcf0';
    ctx.fill();
    ctx.strokeStyle = '#a8946a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = rgba('#d8c8a0', 0.9);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      const x = bx + 18 + rand() * 20;
      const y = by + 20 + rand() * 18;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 4, y + 2, x + 2, y + 6);
      ctx.stroke();
    }
    // glossy highlights, cracked pepper and a few flakes of salt
    shine(ctx, bx - 18, by - 20, 15, 6, 0.85);
    shine(ctx, bx - 26, by - 6, 4, 2, 0.6);
    ctx.fillStyle = '#2a2018';
    for (let i = 0; i < 16; i++) {
      ellipse(ctx, bx + (rand() - 0.4) * 70, by + (rand() - 0.4) * 70, 1.3, 1.1);
      ctx.fill();
    }
  },
});

registerTopping('hollandaise', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // buttery pools first, then the zigzag pour, then a dusting of paprika
    for (const [x, y] of spread(5, 70, rand, 110)) {
      blob(ctx, x, y, 12 + rand() * 8, 0.4, rand, 9);
      ctx.fillStyle = rgba('#f8d250', 0.8);
      ctx.fill();
      ctx.strokeStyle = rgba('#b88a18', 0.6);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      shine(ctx, x - 4, y - 4, 5, 1.6, 0.6);
    }
    for (const pts of zigzag(-0.5, 4, 9, 30, 134, rand)) sauceLine(ctx, pts, '#f6d24a', '#7a5408', rgba('#fffbe0', 0.9), 11);
    for (let i = 0; i < 40; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 130;
      ctx.fillStyle = rgba('#c8381a', 0.75);
      ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1.8, 1.8);
    }
  },
});

registerTopping('goldRim', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // torn sheets of gold leaf laid all the way round the cornicione
    ctx.save();
    ellipse(ctx, C, C, PIZZA_R - 1.5, PIZZA_R - 1.5);
    ctx.clip();
    // a continuous gilded band underneath, so the leaf reads as one sheet rather than coins
    const band = ctx.createLinearGradient(C - PIZZA_R, C - PIZZA_R, C + PIZZA_R, C + PIZZA_R);
    band.addColorStop(0, '#ffe680');
    band.addColorStop(0.5, '#e8b830');
    band.addColorStop(1, '#a87410');
    ctx.strokeStyle = band;
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R - 15, 0, Math.PI * 2);
    ctx.stroke();
    const n = 34;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.08;
      const d = PIZZA_R - 15 + (rand() - 0.5) * 8;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 12 + rand() * 6;
      // light comes from the top left, so leaf there is paler and brighter
      const lit = 0.5 - 0.5 * Math.cos(a + Math.PI * 0.75);
      const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      g.addColorStop(0, mix('#fff2a8', '#ffe070', 1 - lit));
      g.addColorStop(0.5, mix('#f8d040', '#e0a820', 1 - lit));
      g.addColorStop(1, mix('#d8a020', '#9a6a08', 1 - lit));
      blob(ctx, x, y, r, 0.5, rand, 8);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba('#8a5a04', 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
      // crinkles in the foil
      ctx.strokeStyle = rgba(rand() > 0.5 ? '#fff8d0' : '#a87810', 0.7);
      ctx.beginPath();
      ctx.moveTo(x - 5 + rand() * 4, y - 4 + rand() * 4);
      ctx.lineTo(x + rand() * 6, y + rand() * 5);
      ctx.stroke();
    }
    // bright rim line where the leaf catches the light
    ctx.strokeStyle = rgba('#fffbe0', 0.75);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R - 20, Math.PI * 0.95, Math.PI * 1.6);
    ctx.stroke();
    ctx.restore();
    // a few big flakes drifted onto the pie
    for (const [x, y] of spread(6, 60, rand, 115)) {
      blob(ctx, x, y, 6 + rand() * 3, 0.7, rand, 7);
      const g = ctx.createLinearGradient(x - 6, y - 6, x + 6, y + 6);
      g.addColorStop(0, '#fff2a8');
      g.addColorStop(1, '#d8a020');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba('#8a5a04', 0.6);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // glints
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const d = PIZZA_R - 16;
      sparkle(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 6 + rand() * 5);
    }
    sparkle(ctx, C - 118, C - 118, 13);
  },
});

piece('wagyu', 1.5, {
  count: 10,
  minDist: 44,
  draw(ctx, rand) {
    // a seared, rosy-centred wagyu slice with the fine white marbling it's famous for
    const slab = () => {
      ctx.beginPath();
      ctx.moveTo(-18, -9);
      ctx.quadraticCurveTo(0, -13, 18, -8);
      ctx.quadraticCurveTo(21, 0, 17, 9);
      ctx.quadraticCurveTo(0, 13, -17, 9);
      ctx.quadraticCurveTo(-21, 0, -18, -9);
      ctx.closePath();
    };
    slab();
    drop(ctx, 0.32);
    // seared crust round the edge, pink in the middle
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 21);
    g.addColorStop(0, '#f08a8a');
    g.addColorStop(0.55, '#d0505a');
    g.addColorStop(0.8, '#8a3a24');
    g.addColorStop(1, '#4a200e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    slab();
    ctx.clip();
    // marbling: fine cream veins
    ctx.strokeStyle = rgba('#fff0e0', 0.85);
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) {
      const y = -8 + rand() * 16;
      ctx.beginPath();
      ctx.moveTo(-16, y);
      ctx.bezierCurveTo(-6, y + (rand() - 0.5) * 8, 4, y + (rand() - 0.5) * 8, 16, y + (rand() - 0.5) * 6);
      ctx.stroke();
    }
    // grill marks
    ctx.strokeStyle = rgba('#2a1004', 0.55);
    ctx.lineWidth = 2.5;
    for (const x of [-9, 0, 9]) {
      ctx.beginPath();
      ctx.moveTo(x - 4, -12);
      ctx.lineTo(x + 4, 12);
      ctx.stroke();
    }
    ctx.restore();
    slab();
    ctx.strokeStyle = shade('#8a3a24', -0.45);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    shine(ctx, -6, -5, 7, 1.6, 0.45);
  },
});
