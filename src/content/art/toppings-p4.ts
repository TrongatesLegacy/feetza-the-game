// Toppings for the pizza plan's new Commons and Rares (src/content/pizzas/p4.ts), each from the place it's named for:
// the Pier's fried calamari, the Diner's crinkle fries and vinyl-record pepperoni, the Lodge's fondue and bread cubes,
// the Rooftop's honeycomb, Space's star-cut calzone, the Rink's pretzel bites and mustard, the Slopes' raclette, the
// Cellar's chanterelles, Old Town's caramelised onions and the Gargoyle's granite speckle.
//
// Piece toppings draw one piece centred at the origin, already placed and turned by the caller. Overlays (count 1)
// reset the transform and paint across the 400×400 top; registered toppings draw after the built-in ones, in the
// pizza's order. Every topping is wrapped in save/restore by the caller, so clips and composite modes are safe.

import { CALZONE_CY, CALZONE_VENTS, PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
import { type Ctx, blob, ellipse, rgba, shade } from '../../art/util';

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

/** A sauce line through points: a dark under-stroke, the body and a highlight. */
function sauceLine(ctx: Ctx, pts: Pt[], body: string, under: string, hi: string, w: number): void {
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  };
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

/** Batter crumbs over the current clip: a bumpy fried coat. */
function batter(ctx: Ctx, rand: () => number, x0: number, y0: number, w: number, h: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    ctx.fillStyle = rand() < 0.5 ? rgba('#fff0b8', 0.55) : rgba('#9a5a1a', 0.4);
    blob(ctx, x, y, 0.9 + rand() * 1.6, 0.5, rand, 6);
    ctx.fill();
  }
}

// ════════════════════════════ the Pier: Seaside Fritto ════════════════════════════

piece('friedCalamari', 2.05, {
  count: 11,
  minDist: 38,
  draw(ctx, rand) {
    if (rand() < 0.34) {
      // now and then a crispy tentacle cluster instead of a ring
      const legs = 5;
      const lens = Array.from({ length: legs }, () => 13 + rand() * 4);
      const body = () => {
        ctx.beginPath();
        for (let i = 0; i < legs; i++) {
          const a = -Math.PI / 2 + (i - (legs - 1) / 2) * 0.42;
          const L = lens[i];
          ctx.moveTo(0, 2);
          ctx.quadraticCurveTo(Math.cos(a) * L * 0.5 + 3, Math.sin(a) * L * 0.5, Math.cos(a) * L, Math.sin(a) * L + 4);
        }
      };
      ctx.lineCap = 'round';
      body();
      ctx.strokeStyle = rgba('#3a1a04', 0.35);
      ctx.lineWidth = 7;
      ctx.save();
      ctx.translate(1.5, 2.5);
      ctx.stroke();
      ctx.restore();
      body();
      ctx.strokeStyle = '#8a4e12';
      ctx.lineWidth = 6.4;
      ctx.stroke();
      body();
      ctx.strokeStyle = '#d99a3a';
      ctx.lineWidth = 4.6;
      ctx.stroke();
      body();
      ctx.strokeStyle = rgba('#ffe29a', 0.75);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ellipse(ctx, 0, 4, 7, 5);
      ctx.fillStyle = '#c8862c';
      ctx.fill();
      ctx.strokeStyle = '#7a4210';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      shine(ctx, -2, 2.5, 3, 1.2, 0.5);
      return;
    }
    // a battered calamari ring: thick golden coat, a pale squid ring showing inside
    const rx = 13 + rand() * 2;
    const ry = rx * (0.82 + rand() * 0.1);
    const ring = (o: number, i: number) => {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + o, ry + o, 0, 0, TAU);
      ctx.ellipse(0, 0, Math.max(1, rx - i), Math.max(1, ry - i), 0, 0, TAU, true);
    };
    ring(0, 7.5);
    drop(ctx, 0.35);
    const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, rx + 3);
    g.addColorStop(0, '#ffd27a');
    g.addColorStop(0.6, '#e0a040');
    g.addColorStop(1, '#a8661c');
    ctx.fillStyle = g;
    ctx.fill('evenodd');
    // the crumb: knobbly bits round the outside
    ctx.save();
    ring(1.5, 9);
    ctx.clip('evenodd');
    batter(ctx, rand, -rx - 2, -ry - 2, rx * 2 + 4, ry * 2 + 4, 46);
    ctx.restore();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + rand() * 0.3;
      ctx.fillStyle = i % 3 ? '#e3a646' : '#c98a30';
      blob(ctx, Math.cos(a) * (rx + 0.5), Math.sin(a) * (ry + 0.5), 1.8 + rand() * 1.2, 0.5, rand, 6);
      ctx.fill();
    }
    // the squid inside the hole: a thin pale ring
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 7.5, ry - 7.5, 0, 0, TAU);
    ctx.strokeStyle = '#f4ead8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ring(0, 7.5);
    ctx.strokeStyle = shade('#a8661c', -0.35);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // fried gloss
    ctx.strokeStyle = rgba('#fff6d0', 0.6);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 2.5, ry - 2.5, 0, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();
  },
});

// ════════════════════════════ the Diner: Blue Plate Special ════════════════════════════

piece('crinkleFry', 1.65, {
  count: 12,
  minDist: 34,
  draw(ctx, rand) {
    // a crinkle-cut fry: a ridged golden stick, browned at the tips
    const L = 15 + rand() * 4;
    const W = 4.2;
    const teeth = 7;
    const edge = () => {
      ctx.beginPath();
      ctx.moveTo(-L, -W);
      for (let i = 1; i <= teeth * 2; i++) ctx.lineTo(-L + (i / (teeth * 2)) * L * 2, -W + (i % 2 ? -1.6 : 0));
      ctx.quadraticCurveTo(L + 2, 0, L, W);
      for (let i = teeth * 2 - 1; i >= 0; i--) ctx.lineTo(-L + (i / (teeth * 2)) * L * 2, W + (i % 2 ? 1.6 : 0));
      ctx.quadraticCurveTo(-L - 2, 0, -L, -W);
      ctx.closePath();
    };
    edge();
    drop(ctx, 0.32);
    const g = ctx.createLinearGradient(0, -W - 2, 0, W + 2);
    g.addColorStop(0, '#ffe088');
    g.addColorStop(0.5, '#f0b848');
    g.addColorStop(1, '#c4802a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    edge();
    ctx.clip();
    // the ridges run across it
    ctx.strokeStyle = rgba('#b8761e', 0.5);
    ctx.lineWidth = 1.2;
    for (let i = 1; i < teeth * 2; i += 2) {
      const x = -L + (i / (teeth * 2)) * L * 2;
      ctx.beginPath();
      ctx.moveTo(x, -W - 2);
      ctx.lineTo(x, W + 2);
      ctx.stroke();
    }
    // browned tips
    for (const s of [-1, 1]) {
      const tg = ctx.createRadialGradient(s * L, 0, 0, s * L, 0, 7);
      tg.addColorStop(0, rgba('#8a4a12', 0.7));
      tg.addColorStop(1, rgba('#8a4a12', 0));
      ctx.fillStyle = tg;
      ctx.fillRect(s * L - 8, -W - 2, 16, W * 2 + 4);
    }
    // salt
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = rgba('#ffffff', 0.85);
      ctx.fillRect(-L + rand() * L * 2, -W + rand() * W * 2, 1.4, 1.4);
    }
    ctx.restore();
    edge();
    ctx.strokeStyle = '#94581a';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    shine(ctx, -L * 0.3, -1.8, L * 0.45, 1, 0.45, 0);
  },
});

// ════════════════════════════ the Diner's jukebox: Disco Diner Pie ════════════════════════════

piece('vinylPepperoni', 1.35, {
  count: 16,
  minDist: 42,
  draw(ctx, rand) {
    // pepperoni pressed like a 45: a dark cured disc with grooves, a bright label and a glint
    const r = 15 + rand() * 1.5;
    ellipse(ctx, 0, 0, r, r);
    drop(ctx, 0.4);
    const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, r);
    g.addColorStop(0, '#5a1a1a');
    g.addColorStop(0.7, '#3a0e10');
    g.addColorStop(1, '#22070a');
    ctx.fillStyle = g;
    ctx.fill();
    // grooves
    ctx.lineWidth = 0.7;
    for (let k = r - 2; k > r * 0.42; k -= 1.6) {
      ctx.strokeStyle = rgba(k % 3 < 1.5 ? '#000000' : '#8a3a3a', 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, k, 0, TAU);
      ctx.stroke();
    }
    // a fat speck or two (it's still pepperoni)
    for (let i = 0; i < 4; i++) {
      const a = rand() * TAU;
      const d = r * (0.5 + rand() * 0.4);
      ctx.fillStyle = rgba('#e89a8a', 0.45);
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, 1.4, 1);
      ctx.fill();
    }
    // the label, in one of the jukebox's colours
    const labels = ['#ff4a7a', '#ffd23f', '#38d8ff', '#7dff7a'];
    const lc = labels[Math.floor(rand() * labels.length)];
    ellipse(ctx, 0, 0, r * 0.38, r * 0.38);
    const lg = ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, r * 0.38);
    lg.addColorStop(0, shade(lc, 0.35));
    lg.addColorStop(1, shade(lc, -0.15));
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.strokeStyle = shade(lc, -0.5);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = rgba('#ffffff', 0.7);
    ctx.fillRect(-r * 0.22, -r * 0.1, r * 0.44, 1);
    ellipse(ctx, 0, 0, 1.3, 1.3);
    ctx.fillStyle = '#1a0606';
    ctx.fill();
    // the rim and a wedge of light across the grooves
    ellipse(ctx, 0, 0, r, r);
    ctx.strokeStyle = '#140405';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.save();
    ellipse(ctx, 0, 0, r - 1, r - 1);
    ctx.clip();
    ctx.globalCompositeOperation = 'screen';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, -2.5, -1.9);
    ctx.closePath();
    ctx.fillStyle = rgba('#ffd8d0', 0.35);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, 0.65, 1.2);
    ctx.closePath();
    ctx.fillStyle = rgba('#ffd8d0', 0.18);
    ctx.fill();
    ctx.restore();
  },
});

// ════════════════════════════ the Lodge: Lodge Fondue Pie ════════════════════════════

registerTopping('fondueSwirl', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a pool of melted gruyère and emmental, swirled and glossy, with strings pulled up off it
    const pool = (r: number) => {
      ctx.beginPath();
      const n = 22;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const k = r * (0.86 + Math.sin(a * 3 + 0.7) * 0.07 + Math.sin(a * 5 + 2.1) * 0.04);
        const x = C + Math.cos(a) * k;
        const y = C + Math.sin(a) * k;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    const R = PIZZA_R * 0.8;
    pool(R + 4);
    ctx.fillStyle = rgba('#8a5a14', 0.28);
    ctx.fill();
    pool(R);
    const g = ctx.createRadialGradient(C - 40, C - 50, 10, C, C, R);
    g.addColorStop(0, '#fff2b8');
    g.addColorStop(0.55, '#f6d070');
    g.addColorStop(1, '#e0a840');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    pool(R);
    ctx.clip();
    // the swirl the fork left
    ctx.strokeStyle = rgba('#d89a30', 0.45);
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let t = 0; t < 5.2 * Math.PI; t += 0.12) {
      const k = 10 + t * 8.5;
      const x = C + Math.cos(t) * k;
      const y = C + Math.sin(t) * k * 0.92;
      if (t) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba('#fffbe0', 0.55);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let t = 0.3; t < 5.2 * Math.PI; t += 0.12) {
      const k = 7 + t * 8.5;
      const x = C - 2 + Math.cos(t) * k;
      const y = C - 3 + Math.sin(t) * k * 0.92;
      if (t > 0.3) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    // browned blisters at the edge, where the pan caught it
    for (let i = 0; i < 26; i++) {
      const a = rand() * TAU;
      const d = R * (0.72 + rand() * 0.26);
      ctx.fillStyle = rgba('#a8601a', 0.18 + rand() * 0.25);
      blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 3 + rand() * 6, 0.5, rand, 7);
      ctx.fill();
    }
    // a little white wine and kirsch sheen
    ctx.globalCompositeOperation = 'screen';
    const sg = ctx.createRadialGradient(C - 50, C - 60, 4, C - 50, C - 60, 90);
    sg.addColorStop(0, rgba('#ffffff', 0.5));
    sg.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.restore();
    pool(R);
    ctx.strokeStyle = rgba('#b8781e', 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
    // cheese strings, pulled up and draped back over the edge
    for (let i = 0; i < 7; i++) {
      const a = rand() * TAU;
      const x0 = C + Math.cos(a) * R * 0.55;
      const y0 = C + Math.sin(a) * R * 0.55;
      const x1 = C + Math.cos(a + 0.25) * R * 1.02;
      const y1 = C + Math.sin(a + 0.25) * R * 1.02;
      sauceLine(ctx, [[x0, y0], [(x0 + x1) / 2 + (rand() - 0.5) * 20, (y0 + y1) / 2 - 8], [x1, y1]], '#f8d878', '#9a6416', '#fffbe0', 3.2);
    }
  },
});

piece('breadCube', 1.75, {
  count: 9,
  minDist: 40,
  draw(ctx, rand) {
    // a cube of country bread, dipped: a crusty top face, two cut faces and cheese dripping down one side
    const s = 8 + rand() * 1.5;
    const top: Pt[] = [[-s, -s * 0.35], [0, -s * 0.85], [s, -s * 0.35], [0, s * 0.15]];
    const left: Pt[] = [[-s, -s * 0.35], [0, s * 0.15], [0, s * 1.1], [-s, s * 0.6]];
    const right: Pt[] = [[s, -s * 0.35], [0, s * 0.15], [0, s * 1.1], [s, s * 0.6]];
    const poly = (p: Pt[]) => {
      ctx.beginPath();
      p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    };
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.35);
    ctx.lineTo(0, -s * 0.85);
    ctx.lineTo(s, -s * 0.35);
    ctx.lineTo(s, s * 0.6);
    ctx.lineTo(0, s * 1.1);
    ctx.lineTo(-s, s * 0.6);
    ctx.closePath();
    drop(ctx, 0.35);
    poly(top);
    ctx.fillStyle = '#b8742c';
    ctx.fill();
    ctx.save();
    poly(top);
    ctx.clip();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = rgba(rand() < 0.5 ? '#7a4214' : '#e0a050', 0.6);
      blob(ctx, (rand() - 0.5) * s * 1.6, -s * 0.35 + (rand() - 0.5) * s * 0.6, 1 + rand() * 1.5, 0.5, rand, 6);
      ctx.fill();
    }
    ctx.restore();
    poly(left);
    ctx.fillStyle = '#f2e0b8';
    ctx.fill();
    poly(right);
    ctx.fillStyle = '#e2c898';
    ctx.fill();
    // the crumb's holes
    for (let i = 0; i < 7; i++) {
      const sx = rand() < 0.5 ? -1 : 1;
      ctx.fillStyle = rgba('#b89a68', 0.6);
      ellipse(ctx, sx * (0.25 + rand() * 0.6) * s, s * (0.25 + rand() * 0.6), 0.8 + rand(), 0.6 + rand() * 0.6);
      ctx.fill();
    }
    // cheese down the left face
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.3);
    ctx.lineTo(-s * 0.15, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.9, -s * 0.45, s * 0.95);
    ctx.quadraticCurveTo(-s * 0.6, s * 0.4, -s * 0.8, s * 0.6);
    ctx.quadraticCurveTo(-s, s * 0.5, -s, -s * 0.3);
    ctx.fillStyle = '#f6cc5a';
    ctx.fill();
    shine(ctx, -s * 0.55, s * 0.25, 1.4, 3, 0.6, 0.2);
    ctx.strokeStyle = '#6a3a10';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.35);
    ctx.lineTo(0, -s * 0.85);
    ctx.lineTo(s, -s * 0.35);
    ctx.lineTo(s, s * 0.6);
    ctx.lineTo(0, s * 1.1);
    ctx.lineTo(-s, s * 0.6);
    ctx.closePath();
    ctx.moveTo(-s, -s * 0.35);
    ctx.lineTo(0, s * 0.15);
    ctx.lineTo(s, -s * 0.35);
    ctx.moveTo(0, s * 0.15);
    ctx.lineTo(0, s * 1.1);
    ctx.stroke();
  },
});

// ════════════════════════════ the Rooftop: Rooftop Rosemary ════════════════════════════

piece('honeycomb', 1.8, {
  count: 7,
  minDist: 50,
  draw(ctx, rand) {
    // a chunk of comb from the rooftop hives: waxy hex cells, some capped, honey welling in the open ones
    const h = 4.6;
    const w = h * Math.sqrt(3);
    const cells: Pt[] = [];
    for (let row = -2; row <= 2; row++)
      for (let col = -2; col <= 2; col++) {
        const x = col * w + (row % 2 ? w / 2 : 0);
        const y = row * h * 1.5;
        if (x * x + y * y * 1.25 < 15 * 15 && rand() < 0.92) cells.push([x, y]);
      }
    const hex = (x: number, y: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i / 6) * TAU;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
    };
    // its shadow and the wax body
    ctx.beginPath();
    for (const [x, y] of cells) {
      ctx.moveTo(x + h * 1.15, y);
      ctx.arc(x, y, h * 1.15, 0, TAU);
    }
    drop(ctx, 0.35);
    ctx.fillStyle = '#d8962a';
    ctx.fill();
    for (const [x, y] of cells) {
      const capped = rand() < 0.35;
      hex(x, y, h);
      ctx.fillStyle = capped ? '#f6d68a' : '#b8640c';
      ctx.fill();
      ctx.strokeStyle = '#f2c460';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (capped) {
        shine(ctx, x - 1, y - 1.2, 1.8, 0.9, 0.55);
      } else {
        // honey sitting in the cell, catching the light
        const g = ctx.createRadialGradient(x - 1, y - 1, 0.3, x, y, h * 0.9);
        g.addColorStop(0, '#ffe07a');
        g.addColorStop(1, '#c46a08');
        hex(x, y, h * 0.72);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.75);
        ellipse(ctx, x - 1.2, y - 1.3, 1, 0.6, -0.5);
        ctx.fill();
      }
    }
    // a run of honey off one side
    ctx.beginPath();
    ctx.moveTo(10, 4);
    ctx.quadraticCurveTo(16, 8, 15, 15);
    ctx.quadraticCurveTo(13, 18, 11, 14);
    ctx.quadraticCurveTo(10, 9, 6, 8);
    ctx.closePath();
    ctx.fillStyle = rgba('#e89410', 0.9);
    ctx.fill();
    shine(ctx, 13.5, 10, 0.9, 2.4, 0.6, 0.2);
  },
});

// ════════════════════════════ Space: Stargazer Calzone ════════════════════════════

/** A five-point star path. */
function star(ctx: Ctx, x: number, y: number, r: number, rot: number, inner = 0.45): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i / 10) * TAU;
    const k = i % 2 ? r * inner : r;
    const px = x + Math.cos(a) * k;
    const py = y + Math.sin(a) * k;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

registerTopping('starCalzone', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the calzone's shape (as pizzaArt draws it)
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
    // a dusk-blue egg wash of butterfly-pea glaze over the top, darkest at the fold
    const g = ctx.createLinearGradient(0, CALZONE_CY - 20, 0, CALZONE_CY + R);
    g.addColorStop(0, rgba('#22285a', 0.42));
    g.addColorStop(0.5, rgba('#3a3a80', 0.2));
    g.addColorStop(1, rgba('#3a3a7a', 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // its stars: a dusting of sea salt and gold, and a constellation scored in the dough
    for (let i = 0; i < 90; i++) {
      const a = rand() * Math.PI;
      const d = Math.sqrt(rand()) * R * 0.92;
      const x = C + Math.cos(a) * d;
      const y = CALZONE_CY + Math.sin(a) * d;
      ctx.fillStyle = rand() < 0.3 ? rgba('#ffe08a', 0.9) : rgba('#ffffff', 0.55 + rand() * 0.4);
      const s = rand() < 0.15 ? 2.2 : 1.1;
      ctx.fillRect(x, y, s, s);
    }
    const con: Pt[] = [[C - 120, CALZONE_CY + 40], [C - 92, CALZONE_CY + 92], [C - 40, CALZONE_CY + 128], [C + 30, CALZONE_CY + 136], [C + 86, CALZONE_CY + 118], [C + 124, CALZONE_CY + 62]];
    ctx.strokeStyle = rgba('#3a1a08', 0.5);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    con.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffe6a8', 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    con.forEach(([x, y], i) => (i ? ctx.lineTo(x - 0.8, y - 0.8) : ctx.moveTo(x - 0.8, y - 0.8)));
    ctx.stroke();
    for (const [x, y] of con) {
      star(ctx, x, y, 8, rand(), 0.42);
      ctx.fillStyle = '#fff2b0';
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const sg = ctx.createRadialGradient(x, y, 0, x, y, 12);
      sg.addColorStop(0, rgba('#ffe08a', 0.7));
      sg.addColorStop(1, rgba('#ffe08a', 0));
      ctx.fillStyle = sg;
      ctx.fillRect(x - 12, y - 12, 24, 24);
      ctx.restore();
    }
    // the vents are cut as stars, the cheese glowing through them
    for (const [vx, vy, rot] of CALZONE_VENTS) {
      const r = vx === C ? 30 : 24;
      star(ctx, vx, vy, r + 3, rot, 0.48);
      ctx.fillStyle = shade('#c8945a', -0.35);
      ctx.fill();
      star(ctx, vx, vy, r, rot, 0.48);
      const vg = ctx.createRadialGradient(vx, vy, 1, vx, vy, r);
      vg.addColorStop(0, '#fff6c0');
      vg.addColorStop(0.5, '#ffd25a');
      vg.addColorStop(1, '#d86a1a');
      ctx.fillStyle = vg;
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const hg = ctx.createRadialGradient(vx, vy, 2, vx, vy, r * 2.6);
      hg.addColorStop(0, rgba('#ffd86a', 0.55));
      hg.addColorStop(1, rgba('#ffd86a', 0));
      ctx.fillStyle = hg;
      ctx.fillRect(vx - r * 3, vy - r * 3, r * 6, r * 6);
      ctx.restore();
      ctx.fillStyle = rgba('#ffffff', 0.7);
      ellipse(ctx, vx - r * 0.2, vy - r * 0.25, r * 0.22, r * 0.1, -0.4);
      ctx.fill();
    }
    ctx.restore();
  },
});

// ════════════════════════════ the Rink: Rinkside Pretzel Pie ════════════════════════════

piece('pretzelKnot', 1.45, {
  count: 8,
  minDist: 46,
  draw(ctx, rand) {
    // a little pretzel: the knot, lye-browned and glossy, flaked with coarse salt
    const knot = () => {
      ctx.beginPath();
      ctx.moveTo(-3, 11);
      ctx.bezierCurveTo(-18, 6, -19, -12, -7, -12);
      ctx.bezierCurveTo(1, -12, 4, -2, 3, 5);
      ctx.moveTo(3, 11);
      ctx.bezierCurveTo(18, 6, 19, -12, 7, -12);
      ctx.bezierCurveTo(-1, -12, -4, -2, -3, 5);
      ctx.moveTo(-9, 11);
      ctx.lineTo(9, 11);
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    knot();
    ctx.strokeStyle = rgba('#2a0e04', 0.35);
    ctx.lineWidth = 7.5;
    ctx.save();
    ctx.translate(1.5, 2.5);
    ctx.stroke();
    ctx.restore();
    knot();
    ctx.strokeStyle = '#5a2a0a';
    ctx.lineWidth = 7.2;
    ctx.stroke();
    knot();
    ctx.strokeStyle = '#9a521a';
    ctx.lineWidth = 5.6;
    ctx.stroke();
    knot();
    ctx.strokeStyle = '#c47a34';
    ctx.lineWidth = 3;
    ctx.stroke();
    knot();
    ctx.strokeStyle = rgba('#ffe0b0', 0.55);
    ctx.lineWidth = 1.1;
    ctx.save();
    ctx.translate(-0.8, -1);
    ctx.stroke();
    ctx.restore();
    // salt flakes
    for (let i = 0; i < 9; i++) {
      const pts: Pt[] = [[-12, -4], [-8, -11], [-2, -6], [12, -4], [8, -11], [2, -6], [-6, 10], [6, 10], [0, 2]];
      const [x, y] = pts[i];
      ctx.save();
      ctx.translate(x + (rand() - 0.5) * 3, y + (rand() - 0.5) * 2);
      ctx.rotate(rand() * TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1.1, -0.8, 2.2, 1.6);
      ctx.fillStyle = rgba('#c8d8e8', 0.8);
      ctx.fillRect(-1.1, 0.3, 2.2, 0.5);
      ctx.restore();
    }
  },
});

registerTopping('mustardZigzag', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // ballpark mustard, squeezed across in a zigzag
    const pts: Pt[] = [];
    const rows = 7;
    for (let i = 0; i < rows; i++) {
      const y = C - PIZZA_R * 0.62 + (i / (rows - 1)) * PIZZA_R * 1.24;
      const half = Math.sqrt(Math.max(0, (PIZZA_R * 0.72) ** 2 - (y - C) ** 2));
      pts.push([i % 2 ? C + half : C - half, y + (rand() - 0.5) * 6]);
    }
    sauceLine(ctx, pts, '#e8b412', '#7a5206', '#fff3a0', 11);
    // a fat dollop where the bottle started and stopped
    for (const [x, y] of [pts[0], pts[pts.length - 1]]) {
      ellipse(ctx, x, y, 8, 6.5);
      ctx.fillStyle = '#e8b412';
      ctx.fill();
      ctx.strokeStyle = rgba('#7a5206', 0.6);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      shine(ctx, x - 2, y - 2.5, 3, 1.4, 0.7);
    }
  },
});

// ════════════════════════════ the Slopes: Raclette Run ════════════════════════════

registerTopping('raclette', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // sheets of raclette scraped off the wheel, draped in folds over the potatoes, blistered brown at the edges
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * TAU + rand() * 0.9;
      const d = PIZZA_R * (0.22 + rand() * 0.26);
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const rot = a + (rand() - 0.5) * 2.2;
      const L = 62 + rand() * 18;
      const W = 30 + rand() * 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      const drips = Array.from({ length: 9 }, (_, i) => W * 0.5 + (i % 3 === 1 ? 10 + rand() * 8 : 2));
      const sheet = () => {
        ctx.beginPath();
        ctx.moveTo(-L, -W * 0.5);
        for (let i = 0; i <= 8; i++) ctx.lineTo(-L + (i / 8) * L * 2, -W * 0.5 - Math.sin((i / 8) * Math.PI) * 6 + (i % 2 ? 2 : -1));
        // the drips down the leading edge
        for (let i = 8; i >= 0; i--) {
          const px = -L + (i / 8) * L * 2;
          ctx.quadraticCurveTo(px + L / 8, W * 0.5, px, drips[i]);
        }
        ctx.closePath();
      };
      sheet();
      drop(ctx, 0.3, 2, 4);
      const g = ctx.createLinearGradient(0, -W * 0.6, 0, W * 0.7);
      g.addColorStop(0, '#ffe6a0');
      g.addColorStop(0.5, '#f8cc62');
      g.addColorStop(1, '#e0a23a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      sheet();
      ctx.clip();
      // the folds
      for (let i = 1; i < 4; i++) {
        const fx = -L + (i / 4) * L * 2 + (rand() - 0.5) * 8;
        const fg = ctx.createLinearGradient(fx - 6, 0, fx + 6, 0);
        fg.addColorStop(0, rgba('#c8862a', 0));
        fg.addColorStop(0.5, rgba('#c8862a', 0.4));
        fg.addColorStop(1, rgba('#fff4c0', 0.3));
        ctx.fillStyle = fg;
        ctx.fillRect(fx - 6, -W, 12, W * 2);
      }
      // the rind's brown blisters along the scraped edge
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = rgba('#9a5212', 0.25 + rand() * 0.35);
        blob(ctx, -L + rand() * L * 2, -W * 0.45 + rand() * 6, 2 + rand() * 4, 0.5, rand, 7);
        ctx.fill();
      }
      ctx.restore();
      sheet();
      ctx.strokeStyle = rgba('#a8681a', 0.7);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      shine(ctx, -L * 0.3, -W * 0.1, L * 0.35, 3, 0.4, 0);
      ctx.restore();
    }
    // cracked black pepper over it all
    for (let i = 0; i < 70; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * PIZZA_R * 0.82;
      ctx.fillStyle = rgba('#2a1a10', 0.75);
      ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1.6, 1.6);
    }
  },
});

// ════════════════════════════ the Cellar: Cellar Mushroom Medley ════════════════════════════

piece('chanterelle', 1.45, {
  count: 11,
  minDist: 36,
  draw(ctx, rand) {
    // a golden chanterelle: a wavy funnel cap with false gills running down into its stem
    const w = 13 + rand() * 3;
    const cap = () => {
      ctx.beginPath();
      ctx.moveTo(-w, -6);
      for (let i = 0; i <= 6; i++) {
        const x = -w + (i / 6) * w * 2;
        ctx.lineTo(x, -8 - Math.sin((i / 6) * Math.PI) * 4 + (i % 2 ? -2.2 : 1));
      }
      ctx.quadraticCurveTo(w + 2, -2, w * 0.5, 2);
      ctx.quadraticCurveTo(3.5, 5, 3, 14);
      ctx.quadraticCurveTo(0, 16.5, -3, 14);
      ctx.quadraticCurveTo(-3.5, 5, -w * 0.5, 2);
      ctx.quadraticCurveTo(-w - 2, -2, -w, -6);
      ctx.closePath();
    };
    cap();
    drop(ctx, 0.35);
    const g = ctx.createLinearGradient(0, -12, 0, 15);
    g.addColorStop(0, '#ffc23a');
    g.addColorStop(0.45, '#f0a020');
    g.addColorStop(1, '#ffd88a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    cap();
    ctx.clip();
    // the ridges fanning down the funnel
    ctx.strokeStyle = rgba('#b8680a', 0.55);
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * w * 0.22, -6);
      ctx.quadraticCurveTo(i * 2, 2, i * 0.5, 13);
      ctx.stroke();
    }
    // the cap's rolled lip, darker
    ctx.fillStyle = rgba('#c87410', 0.5);
    ctx.fillRect(-w - 2, -13, w * 2 + 4, 5);
    ctx.restore();
    cap();
    ctx.strokeStyle = '#8a4a08';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // butter-sautéed gloss
    shine(ctx, -w * 0.35, -8, w * 0.3, 1.4, 0.55, -0.1);
    if (rand() < 0.5) {
      ctx.fillStyle = rgba('#3a6a1a', 0.85);
      ctx.fillRect(w * 0.2, -1, 2, 1.4);
    }
  },
});

// ════════════════════════════ Old Town: Old Town Tarte ════════════════════════════

piece('caramelOnion', 1.6, {
  count: 11,
  minDist: 40,
  draw(ctx, rand) {
    // a spoonful of onion cooked low and slow: a soft, sticky, jammy heap of amber crescents, glossy with butter
    const R = 13 + rand() * 3;
    blob(ctx, 0, 0, R, 0.22, rand, 11);
    drop(ctx, 0.38);
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, 1, 0, 0, R * 1.1);
    g.addColorStop(0, '#f6b860');
    g.addColorStop(0.55, '#d07a26');
    g.addColorStop(1, '#8a4410');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#6a3008';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // the crescents of onion lying in it, each translucent amber with a pale edge
    ctx.lineCap = 'round';
    const arcs = Array.from({ length: 7 }, () => ({ x: (rand() - 0.5) * R * 1.1, y: (rand() - 0.5) * R * 1.0, r: 4 + rand() * 4, a: rand() * Math.PI * 2, span: 1.6 + rand() * 1.4 }));
    for (const c of arcs) {
      ctx.strokeStyle = '#9a4a10';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, c.a, c.a + c.span);
      ctx.stroke();
      ctx.strokeStyle = rand() < 0.5 ? '#ffc870' : '#f0a448';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, c.a, c.a + c.span);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffe0a0', 0.75);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(c.x - 0.5, c.y - 0.6, c.r, c.a + 0.2, c.a + c.span * 0.6);
      ctx.stroke();
    }
    // a thyme leaf now and then, and the buttery gloss
    if (rand() < 0.5) {
      ctx.fillStyle = '#4a6a20';
      ellipse(ctx, R * 0.3, -R * 0.2, 2.2, 1.1, rand() * 3);
      ctx.fill();
    }
    shine(ctx, -R * 0.35, -R * 0.4, R * 0.32, R * 0.14, 0.6);
  },
});

// ════════════════════════════ the Gargoyle: Granite Crust ════════════════════════════

registerTopping('graniteFleck', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the crust is speckled like the cathedral's stone: black and white sesame, charcoal salt and cracked pepper
    // (clipped to the pie's round, the crust's ring as thick as the rest)
    ctx.save();
    ellipse(ctx, C, C, PIZZA_R, PIZZA_R);
    ctx.clip();
    for (let i = 0; i < 260; i++) {
      const a = rand() * TAU;
      // most of them on the crust's ring, the rest over the top
      const d = rand() < 0.6 ? PIZZA_R * (0.83 + rand() * 0.16) : Math.sqrt(rand()) * PIZZA_R * 0.8;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const k = rand();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * Math.PI);
      if (k < 0.35) {
        // black sesame
        ellipse(ctx, 0, 0, 2.1, 1.1);
        ctx.fillStyle = '#1a1614';
        ctx.fill();
        ellipse(ctx, -0.4, -0.3, 0.8, 0.3);
        ctx.fillStyle = rgba('#8a8a8a', 0.6);
        ctx.fill();
      } else if (k < 0.6) {
        // white sesame
        ellipse(ctx, 0, 0, 2, 1.1);
        ctx.fillStyle = '#f4ead0';
        ctx.fill();
        ctx.strokeStyle = rgba('#8a7a5a', 0.6);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else if (k < 0.8) {
        // charcoal salt
        ctx.fillStyle = rand() < 0.5 ? '#4a4846' : '#6a6662';
        ctx.fillRect(-1.2, -1, 2.4, 2);
      } else {
        // cracked pepper
        ctx.fillStyle = '#2a1e16';
        blob(ctx, 0, 0, 1.2, 0.5, rand, 5);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  },
});
