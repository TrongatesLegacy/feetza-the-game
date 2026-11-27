// Toppings for the pizza plan's Epic Pizzeria pizzas (src/content/pizzas/p6.ts), each from Act 9's myths and the boss
// it's named for: the Colossus's bronze plates and its forge, Medusa's statue stone and her hair snakes, Cerberus's three
// tempers, the Minotaur's maze, Hades' embers and shades, the Sirens' scales, the Harpies' feathers, the Golden Fleece
// and Charybdis's whirlpool.
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

// ════════════════════════════ the Colossus: Colossus Forge ════════════════════════════

piece('bronzePlates', 2, {
  count: 7,
  minDist: 40,
  draw(ctx, rand) {
    // pepperoni seared in the forge till it looks like the Colossus's armour: a hammered bronze disc, a raised rim,
    // four rivets, a cherry-hot glow where it's still cooling
    const r = 14 + rand() * 2;
    ellipse(ctx, 0, 0, r + 1.2, r + 1.2);
    drop(ctx, 0.4, 2, 3);
    ctx.fillStyle = '#3a1c0a';
    ctx.fill();
    ellipse(ctx, 0, 0, r, r);
    const g = ctx.createRadialGradient(-r * 0.4, -r * 0.45, 1, 0, 0, r);
    g.addColorStop(0, '#ffd890');
    g.addColorStop(0.35, '#d08a3a');
    g.addColorStop(0.75, '#8a4a1c');
    g.addColorStop(1, '#5a2a0e');
    ctx.fillStyle = g;
    ctx.fill();
    // hammer dents, each lit on its far side
    for (let i = 0; i < 7; i++) {
      const a = rand() * TAU;
      const d = rand() * r * 0.7;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const s = 2 + rand() * 2.2;
      ctx.fillStyle = rgba('#4a200a', 0.35);
      ellipse(ctx, x, y, s, s * 0.8, a);
      ctx.fill();
      ctx.fillStyle = rgba('#ffe0a0', 0.45);
      ellipse(ctx, x + s * 0.35, y + s * 0.35, s * 0.5, s * 0.3, a);
      ctx.fill();
    }
    // the raised rim of the plate
    ctx.strokeStyle = rgba('#ffcf80', 0.6);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, r - 2.4, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
    ctx.strokeStyle = rgba('#3a1a08', 0.55);
    ctx.beginPath();
    ctx.arc(0, 0, r - 2.4, -Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    // rivets
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      const x = Math.cos(a) * r * 0.66;
      const y = Math.sin(a) * r * 0.66;
      ctx.fillStyle = '#4a2208';
      ellipse(ctx, x + 0.5, y + 0.6, 2, 2);
      ctx.fill();
      ctx.fillStyle = '#e8b060';
      ellipse(ctx, x, y, 1.6, 1.6);
      ctx.fill();
      ctx.fillStyle = '#fff2c8';
      ellipse(ctx, x - 0.5, y - 0.5, 0.6, 0.6);
      ctx.fill();
    }
    // the glow of the forge still in one edge
    const hot = ctx.createRadialGradient(r * 0.5, r * 0.45, 0, r * 0.5, r * 0.45, r * 0.7);
    hot.addColorStop(0, rgba('#ff5a1a', 0.55));
    hot.addColorStop(1, rgba('#ff5a1a', 0));
    ctx.fillStyle = hot;
    ellipse(ctx, 0, 0, r, r);
    ctx.fill();
    shine(ctx, -r * 0.4, -r * 0.45, r * 0.32, r * 0.12, 0.7);
  },
});

registerTopping('forgeGlow', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx, PIZZA_R * 0.82);
    // the forge's heat: molten seams glowing through the sauce like cracks in a cooling casting, a white-hot heart,
    // and sparks thrown off where the hammer fell
    const heat = ctx.createRadialGradient(C, C, 0, C, C, PIZZA_R * 0.8);
    heat.addColorStop(0, rgba('#ffb040', 0.6));
    heat.addColorStop(0.5, rgba('#ff6a1a', 0.3));
    heat.addColorStop(1, rgba('#ff3a0a', 0));
    ctx.fillStyle = heat;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // seams: branching cracks from the middle out
    const seam = (x: number, y: number, a: number, len: number, depth: number) => {
      const pts: Pt[] = [[x, y]];
      let cx = x;
      let cy = y;
      for (let i = 0; i < 6; i++) {
        a += (rand() - 0.5) * 0.7;
        cx += Math.cos(a) * (len / 6);
        cy += Math.sin(a) * (len / 6);
        pts.push([cx, cy]);
      }
      for (const [w, col] of [[11 - depth * 3, rgba('#2a0804', 0.5)], [7 - depth * 2, rgba('#ff3a0a', 0.55)], [4.2 - depth, '#ff8a2a'], [1.8, '#fff2b0']] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(0.8, w);
        curve(ctx, pts);
        ctx.stroke();
      }
      if (depth < 1) {
        const k = 2 + Math.floor(rand() * 2);
        for (let i = 0; i < k; i++) {
          const p = pts[2 + Math.floor(rand() * 3)];
          seam(p[0], p[1], a + (rand() < 0.5 ? -1 : 1) * (0.7 + rand() * 0.5), len * 0.45, depth + 1);
        }
      }
    };
    for (let i = 0; i < 5; i++) seam(C + (rand() - 0.5) * 14, C + (rand() - 0.5) * 14, (i / 5) * TAU + rand() * 0.5, 100 + rand() * 40, 0);
    // the white-hot heart
    const core = ctx.createRadialGradient(C, C, 0, C, C, 26);
    core.addColorStop(0, rgba('#fffbe0', 0.9));
    core.addColorStop(0.5, rgba('#ffc860', 0.55));
    core.addColorStop(1, rgba('#ff7a2a', 0));
    ctx.fillStyle = core;
    ellipse(ctx, C, C, 26, 26);
    ctx.fill();
    // sparks: short bright streaks flung outwards
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 26; i++) {
      const a = rand() * TAU;
      const d = 30 + rand() * 120;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const l = 3 + rand() * 6;
      ctx.strokeStyle = rand() < 0.5 ? '#fff2b0' : '#ffb040';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
    ctx.restore();
  },
});

// ════════════════════════════ Medusa: Gorgon's Gaze ════════════════════════════

piece('stoneMozz', 1.9, {
  count: 6,
  minDist: 44,
  draw(ctx, rand) {
    // a slice of mozzarella turned to statue stone: pale grey marble, veined, a crack across it and a chipped edge
    const r = 14 + rand() * 2.5;
    blob(ctx, 0, 0, r, 0.18, rand, 9);
    drop(ctx, 0.35, 2, 3);
    ctx.fillStyle = '#5a5850';
    ctx.fill();
    blob(ctx, -0.5, -0.5, r - 1.2, 0.18, rand, 9);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
    g.addColorStop(0, '#f4f0e6');
    g.addColorStop(0.55, '#c8c4b8');
    g.addColorStop(1, '#8a877c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // marble veins
    ctx.strokeStyle = rgba('#7a786e', 0.55);
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      const y0 = (rand() - 0.5) * r * 1.4;
      ctx.beginPath();
      ctx.moveTo(-r, y0);
      ctx.bezierCurveTo(-r * 0.3, y0 + (rand() - 0.5) * 12, r * 0.3, y0 + (rand() - 0.5) * 12, r, y0 + (rand() - 0.5) * 8);
      ctx.stroke();
    }
    // speckle of the stone
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = rand() < 0.5 ? rgba('#5a584e', 0.45) : rgba('#ffffff', 0.5);
      ctx.fillRect((rand() - 0.5) * r * 1.8, (rand() - 0.5) * r * 1.8, 1.1, 1.1);
    }
    ctx.restore();
    // the crack Medusa's gaze left in it
    ctx.strokeStyle = '#3a3830';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    let x = -r * 0.7;
    let y = -r * 0.2 + (rand() - 0.5) * 6;
    ctx.moveTo(x, y);
    for (let i = 0; i < 4; i++) {
      x += r * 0.35;
      y += (rand() - 0.5) * 7;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.5);
    ctx.lineWidth = 0.8;
    ctx.translate(0.8, 1);
    ctx.stroke();
    shine(ctx, -r * 0.38, -r * 0.42, r * 0.28, r * 0.12, 0.6);
  },
});

piece('gorgonSnake', 1.6, {
  count: 4,
  minDist: 56,
  draw(ctx, rand) {
    // one of Medusa's hair snakes, done in courgette: a ribbon of green skin and pale flesh winding in an S, a little
    // head with two gold eyes and a flick of red pepper for a tongue
    const L = 24;
    const pts: Pt[] = [];
    const ph = rand() * TAU;
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      pts.push([-L + u * L * 2, Math.sin(u * TAU * 1.1 + ph) * 8]);
    }
    const w = (u: number) => (u > 0.92 ? 6.5 : 2 + u * 3.6);
    ribbon(ctx, pts, (u) => w(u) + 1.3);
    drop(ctx, 0.35, 2, 3);
    ctx.fillStyle = '#163a10';
    ctx.fill();
    ribbon(ctx, pts, w);
    const g = ctx.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, '#9ad860');
    g.addColorStop(0.5, '#5aa83a');
    g.addColorStop(1, '#2e6a1e');
    ctx.fillStyle = g;
    ctx.fill();
    // the courgette's pale flesh down its middle, and the scales along its back
    ctx.strokeStyle = rgba('#e8f4b0', 0.65);
    ctx.lineWidth = 1.6;
    curve(ctx, pts.slice(1, -2));
    ctx.stroke();
    ctx.fillStyle = rgba('#1e4a14', 0.55);
    for (let i = 2; i < pts.length - 3; i += 2) {
      ellipse(ctx, pts[i][0], pts[i][1] - w(i / 20) * 0.5, 1.4, 0.9);
      ctx.fill();
    }
    // the head and its eyes, the tongue flicking out
    const [hx, hy] = pts[pts.length - 1];
    ctx.strokeStyle = '#e8402f';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(hx + 5, hy);
    ctx.lineTo(hx + 10, hy);
    ctx.moveTo(hx + 10, hy);
    ctx.lineTo(hx + 12.5, hy - 2);
    ctx.moveTo(hx + 10, hy);
    ctx.lineTo(hx + 12.5, hy + 2);
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#ffd23a';
      ellipse(ctx, hx - 1, hy + s * 2.6, 1.6, 1.3);
      ctx.fill();
      ctx.fillStyle = '#1a1408';
      ellipse(ctx, hx - 0.7, hy + s * 2.6, 0.5, 1.1);
      ctx.fill();
    }
    shine(ctx, pts[6][0], pts[6][1] - 2, 4, 1, 0.45, 0);
  },
});

// ════════════════════════════ Cerberus: Three-Headed Hound ════════════════════════════

registerTopping('threeTempers', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the pie in Cerberus's three tempers, a third each: fire ('nduja and chilli oil, flames licking), ice (white
    // stracciatella, frost and shards) and poison (bubbling basil oil, green and toxic); a dark seam between them
    const R = PIZZA_R * 0.8;
    const thirds: [number, string][] = [
      [-Math.PI / 2, 'fire'],
      [-Math.PI / 2 + TAU / 3, 'ice'],
      [-Math.PI / 2 + (TAU * 2) / 3, 'poison'],
    ];
    for (const [a0, kind] of thirds) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(C, C);
      ctx.arc(C, C, R, a0, a0 + TAU / 3);
      ctx.closePath();
      ctx.clip();
      const mid = a0 + TAU / 6;
      const mx = C + Math.cos(mid) * R * 0.5;
      const my = C + Math.sin(mid) * R * 0.5;
      if (kind === 'fire') {
        const g = ctx.createRadialGradient(mx, my, 4, mx, my, R * 0.7);
        g.addColorStop(0, rgba('#ff8a2a', 0.85));
        g.addColorStop(1, rgba('#a81a0a', 0.75));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
        // little flames licking up, and chilli-oil pools
        for (let i = 0; i < 9; i++) {
          const a = a0 + 0.15 + rand() * (TAU / 3 - 0.3);
          const d = 30 + rand() * (R - 50);
          const x = C + Math.cos(a) * d;
          const y = C + Math.sin(a) * d;
          const h = 10 + rand() * 8;
          ctx.beginPath();
          ctx.moveTo(x - 5, y + 3);
          ctx.quadraticCurveTo(x - 6, y - h * 0.5, x, y - h);
          ctx.quadraticCurveTo(x + 6, y - h * 0.5, x + 5, y + 3);
          ctx.closePath();
          ctx.fillStyle = '#ffb030';
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x - 2.4, y + 2);
          ctx.quadraticCurveTo(x - 3, y - h * 0.3, x, y - h * 0.6);
          ctx.quadraticCurveTo(x + 3, y - h * 0.3, x + 2.4, y + 2);
          ctx.closePath();
          ctx.fillStyle = '#fff2a0';
          ctx.fill();
        }
        for (let i = 0; i < 6; i++) {
          const a = a0 + rand() * (TAU / 3);
          const d = 20 + rand() * (R - 30);
          ctx.fillStyle = rgba('#7a0a04', 0.55);
          blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 4 + rand() * 5, 0.4, rand, 7);
          ctx.fill();
        }
      } else if (kind === 'ice') {
        const g = ctx.createRadialGradient(mx - 10, my - 10, 4, mx, my, R * 0.7);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.6, '#e2f0fa');
        g.addColorStop(1, '#a8cce8');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
        // torn stracciatella, then frost feathers and shards
        for (let i = 0; i < 12; i++) {
          const a = a0 + rand() * (TAU / 3);
          const d = 20 + rand() * (R - 30);
          ctx.fillStyle = rgba('#c8dcec', 0.6);
          blob(ctx, C + Math.cos(a) * d + 1.5, C + Math.sin(a) * d + 2, 6 + rand() * 6, 0.45, rand, 8);
          ctx.fill();
          ctx.fillStyle = rgba('#ffffff', 0.85);
          blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 5 + rand() * 5, 0.45, rand, 8);
          ctx.fill();
        }
        ctx.strokeStyle = rgba('#7ab8e8', 0.7);
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 7; i++) {
          const a = a0 + 0.2 + rand() * (TAU / 3 - 0.4);
          const d = 40 + rand() * (R - 60);
          const x = C + Math.cos(a) * d;
          const y = C + Math.sin(a) * d;
          for (let k = 0; k < 3; k++) {
            const b = (k / 3) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(x - Math.cos(b) * 6, y - Math.sin(b) * 6);
            ctx.lineTo(x + Math.cos(b) * 6, y + Math.sin(b) * 6);
            ctx.stroke();
          }
        }
        for (let i = 0; i < 5; i++) {
          const a = a0 + rand() * (TAU / 3);
          const d = 30 + rand() * (R - 50);
          const x = C + Math.cos(a) * d;
          const y = C + Math.sin(a) * d;
          ctx.beginPath();
          ctx.moveTo(x, y - 7);
          ctx.lineTo(x + 3.5, y + 2);
          ctx.lineTo(x - 2.5, y + 5);
          ctx.closePath();
          ctx.fillStyle = rgba('#bfe8ff', 0.95);
          ctx.fill();
          ctx.strokeStyle = rgba('#4a8ac8', 0.6);
          ctx.stroke();
        }
      } else {
        const g = ctx.createRadialGradient(mx, my, 4, mx, my, R * 0.7);
        g.addColorStop(0, rgba('#9ae04a', 0.9));
        g.addColorStop(1, rgba('#2e6a14', 0.85));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
        // toxic bubbles of basil oil and a sheen of it
        for (let i = 0; i < 16; i++) {
          const a = a0 + rand() * (TAU / 3);
          const d = 20 + rand() * (R - 30);
          const x = C + Math.cos(a) * d;
          const y = C + Math.sin(a) * d;
          const r = 2.5 + rand() * 5;
          ellipse(ctx, x, y, r, r);
          const bg = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.5, x, y, r);
          bg.addColorStop(0, '#f0ffb0');
          bg.addColorStop(0.6, '#7ad03a');
          bg.addColorStop(1, '#2a5a10');
          ctx.fillStyle = bg;
          ctx.fill();
          ctx.strokeStyle = rgba('#163a08', 0.6);
          ctx.lineWidth = 0.8;
          ctx.stroke();
          shine(ctx, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.16, 0.8);
        }
      }
      ctx.restore();
    }
    // the dark seams between them, scorched in
    ctx.save();
    clipRound(ctx, R);
    for (const [a0] of thirds) {
      ctx.strokeStyle = rgba('#2a0e04', 0.5);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(C, C);
      ctx.lineTo(C + Math.cos(a0) * R, C + Math.sin(a0) * R);
      ctx.stroke();
    }
    ctx.restore();
  },
});

// ════════════════════════════ the Minotaur: Labyrinth Lasagne ════════════════════════════

registerTopping('mazeLasagne', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a square of lasagne baked as the Minotaur's maze: walls of pasta sheet with frilled, browned edges standing out
    // of a ragù floor, béchamel pooled in its dead ends, a path you could trace from the gate to the middle
    const R = PIZZA_R * 0.8;
    const x0 = C - R;
    const y0 = C - R;
    ctx.save();
    roundRect(ctx, x0, y0, R * 2, R * 2, 14);
    ctx.clip();
    // the ragù floor
    const floor = ctx.createRadialGradient(C - 40, C - 40, 10, C, C, R * 1.3);
    floor.addColorStop(0, '#b8402a');
    floor.addColorStop(1, '#6a1a0e');
    ctx.fillStyle = floor;
    ctx.fillRect(x0, y0, R * 2, R * 2);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rand() < 0.5 ? rgba('#4a0e06', 0.55) : rgba('#d86a4a', 0.4);
      blob(ctx, x0 + rand() * R * 2, y0 + rand() * R * 2, 1.5 + rand() * 2.5, 0.5, rand, 6);
      ctx.fill();
    }
    // the maze: a 7×7 grid carved by a seeded walk, so every pie's maze is its own
    const N = 7;
    const cell = (R * 2) / N;
    const seen = new Set<number>();
    const open = new Set<string>();
    const stack: [number, number][] = [[3, 3]];
    seen.add(3 * N + 3);
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const ns = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [cx + dx, cy + dy] as const).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N && !seen.has(y * N + x));
      if (!ns.length) {
        stack.pop();
        continue;
      }
      const [nx, ny] = ns[Math.floor(rand() * ns.length)];
      seen.add(ny * N + nx);
      open.add(`${Math.min(cx, nx)},${Math.min(cy, ny)},${nx !== cx ? 'h' : 'v'}`);
      stack.push([nx, ny]);
    }
    // the walls between cells that weren't opened, and the outer wall with a gate at the bottom
    const walls: [number, number, number, number][] = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (x < N - 1 && !open.has(`${x},${y},h`)) walls.push([x + 1, y, x + 1, y + 1]);
        if (y < N - 1 && !open.has(`${x},${y},v`)) walls.push([x, y + 1, x + 1, y + 1]);
      }
    for (let i = 0; i < N; i++) {
      walls.push([i, 0, i + 1, 0], [0, i, 0, i + 1], [N, i, N, i + 1]);
      if (i !== 3) walls.push([i, N, i + 1, N]);
    }
    // béchamel pooled in some cells
    for (let i = 0; i < 9; i++) {
      const cx = x0 + (Math.floor(rand() * N) + 0.5) * cell;
      const cy = y0 + (Math.floor(rand() * N) + 0.5) * cell;
      ctx.fillStyle = rgba('#f8ecd0', 0.85);
      blob(ctx, cx, cy, cell * 0.22 + rand() * 3, 0.4, rand, 8);
      ctx.fill();
      shine(ctx, cx - 2, cy - 2, 2.5, 1.2, 0.6);
    }
    const P = (gx: number, gy: number): Pt => [x0 + gx * cell, y0 + gy * cell];
    // each wall: its shadow, the pasta sheet, its browned frill and a lit top edge
    for (const pass of [0, 1, 2]) {
      for (const [ax, ay, bx, by] of walls) {
        const [x1, y1] = P(ax, ay);
        const [x2, y2] = P(bx, by);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        if (pass === 0) {
          ctx.strokeStyle = rgba('#2a0804', 0.45);
          ctx.lineWidth = 11;
          ctx.save();
          ctx.translate(2.5, 3.5);
          ctx.stroke();
          ctx.restore();
        } else if (pass === 1) {
          ctx.strokeStyle = '#c88a3a';
          ctx.lineWidth = 9;
          ctx.stroke();
          ctx.strokeStyle = '#f2d08a';
          ctx.lineWidth = 5.5;
          ctx.stroke();
        } else {
          // a frilled, crisped edge along the wall
          const len = Math.hypot(x2 - x1, y2 - y1);
          const k = Math.max(2, Math.round(len / 6));
          ctx.strokeStyle = rgba('#8a4a14', 0.7);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let i = 0; i <= k; i++) {
            const u = i / k;
            const ox = (y2 - y1) / len;
            const oy = -(x2 - x1) / len;
            const wob = i % 2 ? 2.2 : -1.2;
            const x = x1 + (x2 - x1) * u + ox * wob;
            const y = y1 + (y2 - y1) * u + oy * wob;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.strokeStyle = rgba('#fff4d0', 0.7);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x1 - 1, y1 - 1.5);
          ctx.lineTo(x2 - 1, y2 - 1.5);
          ctx.stroke();
        }
      }
    }
    // a little bull's horn of basil leaf at the heart of the maze
    const [hx, hy] = P(3.5, 3.5);
    ctx.fillStyle = '#2e7a2a';
    ellipse(ctx, hx - 4, hy, 6, 3, -0.6);
    ctx.fill();
    ellipse(ctx, hx + 4, hy, 6, 3, 0.6);
    ctx.fill();
    ctx.fillStyle = rgba('#a8e078', 0.6);
    ellipse(ctx, hx - 5, hy - 1, 3, 1, -0.6);
    ctx.fill();
    ctx.restore();
  },
});

// ════════════════════════════ Hades: Ember Shade ════════════════════════════

piece('emberCoals', 1.8, {
  count: 8,
  minDist: 36,
  draw(ctx, rand) {
    // a coal from the fires of the underworld: a charred black chunk (aubergine, blackened), split, glowing orange
    // and white-hot in its cracks, a tongue of Hades' blue flame on it
    const r = 9 + rand() * 3;
    blob(ctx, 0, 0, r + 1, 0.3, rand, 7);
    drop(ctx, 0.45, 2, 3);
    ctx.fillStyle = '#0a0606';
    ctx.fill();
    blob(ctx, -0.3, -0.3, r, 0.3, rand, 7);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r);
    g.addColorStop(0, '#5a4a4a');
    g.addColorStop(0.6, '#2a2020');
    g.addColorStop(1, '#120a0a');
    ctx.fillStyle = g;
    ctx.fill();
    // its glow from below, and the cracks
    const glow = ctx.createRadialGradient(r * 0.2, r * 0.3, 0, r * 0.2, r * 0.3, r);
    glow.addColorStop(0, rgba('#ff6a1a', 0.75));
    glow.addColorStop(1, rgba('#ff3a0a', 0));
    ctx.fillStyle = glow;
    ctx.fill();
    for (const [w, col] of [[3, '#ff5a1a'], [1.2, '#fff0a0']] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.1);
      ctx.lineTo(-r * 0.1, r * 0.15);
      ctx.lineTo(r * 0.2, -r * 0.35);
      ctx.moveTo(-r * 0.1, r * 0.15);
      ctx.lineTo(r * 0.1, r * 0.6);
      ctx.stroke();
    }
    if (rand() < 0.55) {
      // Hades' blue flame
      const h = 9 + rand() * 6;
      ctx.beginPath();
      ctx.moveTo(-4, -r * 0.3);
      ctx.quadraticCurveTo(-5, -r * 0.3 - h * 0.6, 1, -r * 0.3 - h);
      ctx.quadraticCurveTo(5, -r * 0.3 - h * 0.5, 4, -r * 0.3);
      ctx.closePath();
      ctx.fillStyle = rgba('#4fb8ff', 0.85);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-1.8, -r * 0.3);
      ctx.quadraticCurveTo(-2, -r * 0.3 - h * 0.4, 0.5, -r * 0.3 - h * 0.65);
      ctx.quadraticCurveTo(2.5, -r * 0.3 - h * 0.35, 1.8, -r * 0.3);
      ctx.closePath();
      ctx.fillStyle = '#dff4ff';
      ctx.fill();
    }
    shine(ctx, -r * 0.4, -r * 0.45, r * 0.25, r * 0.1, 0.35);
  },
});

registerTopping('shadeSmoke', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx, PIZZA_R * 0.82);
    // shades of the underworld drifting over the dark pie: wisps of blue-grey smoke curling across it, faint faces
    // of lost souls in two of them, and an ember glow seeping up from below
    const glow = ctx.createRadialGradient(C, C + 30, 10, C, C, PIZZA_R * 0.8);
    glow.addColorStop(0, rgba('#ff5a1a', 0.32));
    glow.addColorStop(1, rgba('#ff5a1a', 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + rand() * 0.6;
      const d = 40 + rand() * 70;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const pts: Pt[] = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        pts.push([x - 40 + u * 80, y + Math.sin(u * 5 + i) * 10 - u * 14]);
      }
      ribbon(ctx, pts, (u) => 2 + Math.sin(u * Math.PI) * 11);
      ctx.fillStyle = rgba('#9ab8e8', 0.42);
      ctx.fill();
      ribbon(ctx, pts, (u) => 1 + Math.sin(u * Math.PI) * 5);
      ctx.fillStyle = rgba('#e8f2ff', 0.55);
      ctx.fill();
      if (i < 2) {
        // a lost soul's face in the smoke
        const [fx, fy] = pts[4];
        ctx.fillStyle = rgba('#0a0a14', 0.6);
        ellipse(ctx, fx - 3.5, fy - 1, 1.6, 2.4);
        ctx.fill();
        ellipse(ctx, fx + 3.5, fy - 1, 1.6, 2.4);
        ctx.fill();
        ellipse(ctx, fx, fy + 4, 1.8, 2.4);
        ctx.fill();
      }
    }
    ctx.restore();
  },
});

// ════════════════════════════ the Sirens: Siren's Song ════════════════════════════

registerTopping('sirenScales', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx);
    // a siren's tail laid across the white pie in an S: pearly teal scales of thin cucumber, darker down its edges,
    // a shimmer along it, and its fin fanned out in dill fronds and sea-green, all inside the crust
    const P = (u: number): Pt => {
      // the tail's spine, from its waist at the lower left to the fin at the upper right
      const x = C - 104 + u * 150;
      const y = C + 78 - u * 128 + Math.sin(u * Math.PI * 1.6) * 30;
      return [x, y];
    };
    const W = (u: number) => 30 * (1 - u * 0.72) + 3;
    const N = 40;
    const spine: Pt[] = [];
    for (let i = 0; i <= N; i++) spine.push(P(i / N));
    const tail = (grow: number) => ribbon(ctx, spine, (u) => W(u) + grow);
    tail(3);
    ctx.fillStyle = rgba('#0a3a3a', 0.45);
    ctx.save();
    ctx.translate(3, 4);
    ctx.fill();
    ctx.restore();
    tail(2.2);
    ctx.fillStyle = '#0e4a4a';
    ctx.fill();
    tail(0);
    const g = ctx.createLinearGradient(C - 120, C + 80, C + 90, C - 80);
    g.addColorStop(0, '#2a9a94');
    g.addColorStop(0.5, '#3ab8b0');
    g.addColorStop(1, '#5ad0c8');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // rows of scales, scalloped, following the spine
    for (let i = 1; i < N; i += 2.4) {
      const u = i / N;
      const [x, y] = P(u);
      const [nx, ny] = P(Math.min(1, u + 0.01));
      const a = Math.atan2(ny - y, nx - x);
      const w = W(u);
      const k = Math.max(1, Math.round(w / 9));
      for (let j = -k; j <= k; j++) {
        const off = (j + ((Math.round(i / 2.4) % 2) ? 0.5 : 0)) * (w / k);
        const sx = x - Math.sin(a) * off;
        const sy = y + Math.cos(a) * off;
        const r = 8 * (1 - u * 0.5);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a - Math.PI / 2);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI);
        const edge = Math.abs(off) / (w + 0.01);
        const hue = (Math.round(i) + j) % 3;
        ctx.fillStyle = rgba(hue === 0 ? '#c8fff4' : hue === 1 ? '#a8e8f8' : '#e0d4ff', 0.55 - edge * 0.35);
        ctx.fill();
        ctx.strokeStyle = rgba('#0e5a58', 0.55);
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
      }
    }
    // the shimmer along its back
    ctx.strokeStyle = rgba('#ffffff', 0.45);
    ctx.lineWidth = 4;
    curve(ctx, spine.map(([x, y], i) => [x - 4, y - W(i / N) * 0.45] as Pt).slice(2, N - 4));
    ctx.stroke();
    ctx.restore();
    // the fin: two lobes fanned out at its end, ribbed with dill fronds
    const [fx, fy] = P(1);
    const [px, py] = P(0.96);
    const a = Math.atan2(fy - py, fx - px);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(a);
    ctx.scale(1.25, 1.25);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.quadraticCurveTo(6, side * 24, 26, side * 34);
      ctx.quadraticCurveTo(26, side * 16, 40, side * 6);
      ctx.quadraticCurveTo(18, side * 3, -2, 0);
      ctx.closePath();
      ctx.fillStyle = rgba('#3ab8b0', 0.85);
      ctx.fill();
      ctx.strokeStyle = '#0e4a4a';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.strokeStyle = '#3a8a3a';
      ctx.lineWidth = 1.1;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(8 + k * 4, side * (6 + k * 5), 20 + k * 5, side * (26 - k * 6));
        ctx.stroke();
      }
    }
    ctx.restore();
    // a belt of pearls where the tail starts
    {
      const [wx, wy] = P(0.015);
      const [nx, ny] = P(0.04);
      const a2 = Math.atan2(ny - wy, nx - wx);
      for (let j = -4; j <= 4; j++) {
        const off = (j / 4) * W(0) * 0.95;
        const x = wx - Math.sin(a2) * off;
        const y = wy + Math.cos(a2) * off;
        const g2 = ctx.createRadialGradient(x - 1.5, y - 1.5, 0.5, x, y, 5);
        g2.addColorStop(0, '#ffffff');
        g2.addColorStop(1, '#c8c0d8');
        ctx.fillStyle = g2;
        ellipse(ctx, x, y, 4.6, 4.6);
        ctx.fill();
        ctx.strokeStyle = rgba('#5a5070', 0.6);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
    // a few pearls of the sea spray round it
    for (let i = 0; i < 7; i++) {
      const [x, y] = P(rand());
      const ox = (rand() - 0.5) * 90;
      const oy = (rand() - 0.5) * 60;
      ctx.fillStyle = rgba('#ffffff', 0.7);
      ellipse(ctx, x + ox, y + oy, 1.6 + rand() * 1.4, 1.6 + rand() * 1.4);
      ctx.fill();
    }
    ctx.restore();
  },
});

// ════════════════════════════ the Harpies: Harpy Feather Pie ════════════════════════════

piece('harpyFeather', 2, {
  count: 6,
  minDist: 50,
  draw(ctx, rand) {
    // a harpy's feather in crisp aubergine skin and saffron: dusky violet vanes barred with gold, a pale quill, the
    // tip ragged where a talon caught it
    const L = 24 + rand() * 4;
    const curl = (rand() - 0.5) * 0.4;
    const spine: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      spine.push([-L + u * L * 2, Math.sin(u * Math.PI) * curl * 18]);
    }
    const w = (u: number) => Math.sin(Math.min(1, u * 1.15) * Math.PI) * 7.5 + 0.6;
    ribbon(ctx, spine, (u) => w(u) + 1.3);
    drop(ctx, 0.35, 2, 3);
    ctx.fillStyle = '#1e1428';
    ctx.fill();
    ribbon(ctx, spine, w);
    const g = ctx.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, '#8a74a8');
    g.addColorStop(0.5, '#5a4a6a');
    g.addColorStop(1, '#3a2a4a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // gold bars across the vane, and the barbs
    for (let i = 2; i < 11; i += 2) {
      const [x, y] = spine[i];
      ctx.fillStyle = rgba('#d9a441', 0.85);
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 9);
      ctx.lineTo(x + 2, y - 9);
      ctx.lineTo(x + 0.5, y + 9);
      ctx.lineTo(x - 3.5, y + 9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = rgba('#2a1a38', 0.5);
    ctx.lineWidth = 0.7;
    for (let i = 1; i < 12; i++) {
      const [x, y] = spine[i];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y - 8);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y + 8);
      ctx.stroke();
    }
    // the ragged notch near its tip
    ctx.fillStyle = '#1e1428';
    ctx.beginPath();
    ctx.moveTo(spine[9][0], spine[9][1] - 9);
    ctx.lineTo(spine[9][0] + 2, spine[9][1] - 3);
    ctx.lineTo(spine[9][0] + 4, spine[9][1] - 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // the quill
    ctx.strokeStyle = '#f2e6c8';
    ctx.lineWidth = 1.5;
    curve(ctx, [[-L - 4, spine[0][1]], ...spine.slice(0, 11)]);
    ctx.stroke();
    shine(ctx, -L * 0.3, -3, 5, 1.2, 0.4, 0);
  },
});

// ════════════════════════════ the Golden Fleece ════════════════════════════

registerTopping('fleeceCurls', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx);
    // the Golden Fleece laid over the white pie: a matted pelt of golden stracciatella, and over it tufts of wool, each
    // a clump of tight ringlets lit gold on top and amber in its shade, gleaming
    const R = PIZZA_R * 0.8;
    const pelt = ctx.createRadialGradient(C - 30, C - 30, 10, C, C, R);
    pelt.addColorStop(0, '#ffe08a');
    pelt.addColorStop(0.7, '#e8b440');
    pelt.addColorStop(1, '#b87a1a');
    ctx.fillStyle = pelt;
    blob(ctx, C, C, R * 0.94, 0.08, rand, 28);
    ctx.fill();
    // tufts: a jittered grid, so the wool covers it evenly; drawn top to bottom so the lower ones overlap
    const tufts: Pt[] = [];
    for (let gy = -R; gy <= R; gy += 19)
      for (let gx = -R; gx <= R; gx += 19) {
        const x = gx + (rand() - 0.5) * 10 + (Math.round(gy / 19) % 2 ? 9 : 0);
        const y = gy + (rand() - 0.5) * 10;
        if (Math.hypot(x, y) > R * 0.95) continue;
        tufts.push([C + x, C + y]);
      }
    tufts.sort((p, q) => p[1] - q[1]);
    for (const [x, y] of tufts) {
      const n = 4 + Math.floor(rand() * 2);
      const parts: [number, number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand() * 0.6;
        parts.push([x + Math.cos(a) * 5.5, y + Math.sin(a) * 4.5, 5 + rand() * 2.2]);
      }
      // the tuft's shade, then each ringlet
      ctx.fillStyle = rgba('#7a4408', 0.4);
      for (const [px, py, r] of parts) {
        ellipse(ctx, px + 1.6, py + 2.2, r, r * 0.85);
        ctx.fill();
      }
      for (const [px, py, r] of parts) {
        const g = ctx.createRadialGradient(px - r * 0.45, py - r * 0.5, 0.4, px, py, r);
        g.addColorStop(0, '#fff8d0');
        g.addColorStop(0.5, '#ffcc40');
        g.addColorStop(1, '#c07e14');
        ctx.fillStyle = g;
        ellipse(ctx, px, py, r, r * 0.85);
        ctx.fill();
        // its curl: a little hook of shade
        ctx.strokeStyle = rgba('#8a5210', 0.7);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        const b = rand() * TAU;
        ctx.arc(px + 0.5, py + 0.5, r * 0.5, b, b + 3.6);
        ctx.stroke();
      }
    }
    // a gleam crossing it
    const sh = ctx.createLinearGradient(C - R, C - R * 0.6, C + R * 0.4, C + R);
    sh.addColorStop(0.3, rgba('#ffffff', 0));
    sh.addColorStop(0.45, rgba('#fffbe0', 0.38));
    sh.addColorStop(0.6, rgba('#ffffff', 0));
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    for (let i = 0; i < 9; i++) {
      const a = rand() * TAU;
      const d = rand() * R * 0.8;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x + 0.9, y - 0.9);
      ctx.lineTo(x + 4, y);
      ctx.lineTo(x + 0.9, y + 0.9);
      ctx.lineTo(x, y + 4);
      ctx.lineTo(x - 0.9, y + 0.9);
      ctx.lineTo(x - 4, y);
      ctx.lineTo(x - 0.9, y - 0.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },
});

// ════════════════════════════ Charybdis: Charybdis Swirl ════════════════════════════

registerTopping('whirlSauce', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipRound(ctx);
    // the sauce dragged round into Charybdis's whirlpool: spiral arms of tomato and cream (seawater and its foam)
    // turning in to a dark squid-ink eye at the middle, a ring of her teeth round it in garlic slivers
    const R = PIZZA_R * 0.8;
    const sea = ctx.createRadialGradient(C, C, 4, C, C, R);
    sea.addColorStop(0, '#120a18');
    sea.addColorStop(0.25, '#3a1a2a');
    sea.addColorStop(0.6, '#a8301e');
    sea.addColorStop(1, '#c84a2a');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // spiral arms of cream, foaming at their edges
    for (let arm = 0; arm < 3; arm++) {
      const pts: Pt[] = [];
      for (let k = 0; k <= 40; k++) {
        const u = k / 40;
        const a = (arm / 3) * TAU + Math.pow(u, 0.8) * TAU * 1.1 + Math.sin(u * 9 + arm) * 0.06;
        const d = R * (1 - Math.pow(u, 0.75) * 0.86);
        pts.push([C + Math.cos(a) * d, C + Math.sin(a) * d]);
      }
      ribbon(ctx, pts, (u) => 14 * (1 - u * 0.85) * (0.75 + 0.25 * Math.sin(u * 13 + arm)) + 1);
      ctx.fillStyle = rgba('#5a1a10', 0.35);
      ctx.save();
      ctx.translate(2, 3);
      ctx.fill();
      ctx.restore();
      ribbon(ctx, pts, (u) => 12.5 * (1 - u * 0.85) * (0.75 + 0.25 * Math.sin(u * 13 + arm)) + 0.8);
      const g = ctx.createRadialGradient(C, C, 0, C, C, R);
      g.addColorStop(0, '#a8c8e0');
      g.addColorStop(0.5, '#f4f0e8');
      g.addColorStop(1, '#ffffff');
      ctx.fillStyle = g;
      ctx.fill();
      // foam flecks along it
      for (let k = 2; k < 36; k += 3) {
        const [x, y] = pts[k];
        ctx.fillStyle = rgba('#ffffff', 0.85);
        ellipse(ctx, x + (rand() - 0.5) * 8, y + (rand() - 0.5) * 8, 1.2 + rand() * 1.5, 1 + rand());
        ctx.fill();
      }
    }
    // the eye: dark water and the teeth round it
    const eye = ctx.createRadialGradient(C, C, 0, C, C, 30);
    eye.addColorStop(0, '#000000');
    eye.addColorStop(0.7, '#1a0a20');
    eye.addColorStop(1, rgba('#1a0a20', 0));
    ctx.fillStyle = eye;
    ellipse(ctx, C, C, 30, 30);
    ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const x = C + Math.cos(a) * 20;
      const y = C + Math.sin(a) * 20;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(0, 7);
      ctx.lineTo(3, 0);
      ctx.closePath();
      ctx.fillStyle = '#f4ecd8';
      ctx.fill();
      ctx.strokeStyle = rgba('#5a4a3a', 0.7);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
});
