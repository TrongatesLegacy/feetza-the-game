// Toppings for the pizza plan's first Legendaries (src/content/pizzas/p8.ts), Act 1's, drawn as the game's
// centrepieces:
// - Nonna's Masterpiece (Trattoria Nonna): dollops of her slow ragù, hand-torn fior di latte, curls of parmigiano,
//   her basil heart and the flour still on the crust from her hands.
// - Silver Service (the Head Waiter): smoked salmon roses, piped crème fraîche, caviar, edible silver leaf, dill and a
//   crust brushed with silver like his tray.
// - The First Bake (Opening Night): blistered San Marzano halves, fior di latte, olive oil, flakes of sea salt, a sprig
//   of the first wheat and a wood-fired cornicione, puffed and leopard-spotted.
//
// Piece toppings draw one piece centred at the origin, already placed and turned by the caller. Overlays (count 1)
// reset the transform and paint across the 400×400 top. Every topping is wrapped in save/restore by the caller.

import { PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
import { type Ctx, blob, ellipse, rgba } from '../../art/util';

const C = PIZZA_SIZE / 2;
const TAU = Math.PI * 2;
const INK = '#2a1810';

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.5, rot = -0.6): void {
  ctx.fillStyle = rgba('#ffffff', a);
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fill();
}

/** A soft contact shadow under the current path. */
function drop(ctx: Ctx, alpha = 0.3, dx = 1.6, dy = 2.4): void {
  ctx.save();
  ctx.translate(dx, dy);
  ctx.fillStyle = rgba('#2a0e04', alpha);
  ctx.fill();
  ctx.restore();
}

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

/** Clip to the crust's ring (from r0 out to the edge). */
function clipRing(ctx: Ctx, r0: number, r1 = PIZZA_R): void {
  ctx.beginPath();
  ctx.arc(C, C, r1, 0, TAU);
  ctx.arc(C, C, r0, 0, TAU, true);
  ctx.clip('evenodd');
}

/** A basil leaf from (0, 0) along +x, `len` long: its body, the midrib and veins, a sheen. */
function basilLeaf(ctx: Ctx, len: number, w: number, rand: () => number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.25, -w * 1.1, len * 0.75, -w * 0.9, len, 0);
  ctx.bezierCurveTo(len * 0.75, w * 0.95, len * 0.25, w * 1.05, 0, 0);
  ctx.closePath();
  drop(ctx, 0.32);
  const g = ctx.createLinearGradient(0, -w, 0, w);
  g.addColorStop(0, '#5cc048');
  g.addColorStop(0.5, '#2f8a2a');
  g.addColorStop(1, '#1f5e1c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = rgba('#0e3010', 0.85);
  ctx.stroke();
  // the midrib and veins, pressed in
  ctx.beginPath();
  ctx.moveTo(len * 0.04, 0);
  ctx.quadraticCurveTo(len * 0.5, -w * 0.1, len * 0.94, 0);
  ctx.strokeStyle = rgba('#a8e88a', 0.75);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  for (let i = 1; i < 5; i++) {
    const x = len * (0.15 + i * 0.17);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, -w * 0.03 * sd);
      ctx.quadraticCurveTo(x + len * 0.06, sd * w * 0.35, x + len * 0.12 + rand() * 2, sd * w * 0.62);
      ctx.strokeStyle = rgba('#a8e88a', 0.45);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }
  // the oil's sheen on the leaf
  ctx.save();
  ctx.clip();
  shine(ctx, len * 0.42, -w * 0.38, len * 0.26, w * 0.22, 0.45, -0.1);
  ctx.restore();
}

// ════════════════════════════ Nonna's Masterpiece ════════════════════════════

piece('nonnaRagu', 2.5, {
  count: 8,
  minDist: 31,
  draw(ctx, rand) {
    // a spoonful of Nonna's ragù, slow-cooked dark: a glossy heap of minced beef and pork in tomato, flecked with
    // carrot and celery, its oil pooling round it
    blob(ctx, 0, 0, 13.5, 0.42, rand, 11);
    // the oil seeping out round it
    ctx.save();
    ctx.scale(1.18, 1.18);
    ctx.fillStyle = rgba('#e8701e', 0.28);
    ctx.fill();
    ctx.restore();
    drop(ctx, 0.38, 1.2, 2.2);
    const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, 15);
    g.addColorStop(0, '#b8341a');
    g.addColorStop(0.55, '#8a2010');
    g.addColorStop(1, '#5a1206');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba('#2a0804', 0.8);
    ctx.stroke();
    ctx.save();
    ctx.clip();
    // the meat: crumbled, each bit lit on top
    for (let i = 0; i < 22; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * 11.5;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const r = 1.3 + rand() * 1.6;
      blob(ctx, x, y, r, 0.5, rand, 6);
      ctx.fillStyle = rand() < 0.5 ? '#6a2410' : '#4a1608';
      ctx.fill();
      ellipse(ctx, x - r * 0.3, y - r * 0.35, r * 0.45, r * 0.28, -0.5);
      ctx.fillStyle = rgba('#e08a5a', 0.55);
      ctx.fill();
    }
    // carrot and celery, finely diced
    for (let i = 0; i < 5; i++) {
      const x = (rand() - 0.5) * 18;
      const y = (rand() - 0.5) * 16;
      ctx.fillStyle = i % 2 ? '#ff8a2a' : '#8ac24a';
      ctx.fillRect(x, y, 1.6 + rand(), 1.6 + rand());
    }
    // the sauce's gloss pooled on top
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createRadialGradient(-5, -6, 0, -5, -6, 8);
    sg.addColorStop(0, 'rgba(255,190,150,0.45)');
    sg.addColorStop(1, 'rgba(255,190,150,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-14, -14, 18, 18);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    shine(ctx, -5, -6.5, 3.6, 1.4, 0.7);
    shine(ctx, 4, 3, 1.4, 0.7, 0.5);
  },
});

/** Hand-torn fior di latte: a torn, milky lump half melted into the sauce, its edges stringy, blistered gold in
 *  places from the oven, its melt pooling round it. */
function fiorDiLatte(ctx: Ctx, rand: () => number): void {
  // the melt pooling round it, faintly gold, soft at its edge
  const mg = ctx.createRadialGradient(0, 0, 8, 0, 0, 15);
  mg.addColorStop(0, rgba('#fff2c8', 0.6));
  mg.addColorStop(1, rgba('#fff2c8', 0));
  ctx.fillStyle = mg;
  ctx.fillRect(-15, -15, 30, 30);
  // the torn lump: jagged at one side where it was pulled apart
  const pts: [number, number][] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const torn = a > 2.4 && a < 4.2;
    const r = 11 * (torn ? 0.75 + rand() * 0.45 : 0.9 + rand() * 0.2);
    pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.86]);
  }
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % n];
    if (i === 0) ctx.moveTo((x + nx) / 2, (y + ny) / 2);
    else ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  });
  ctx.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
  ctx.closePath();
  drop(ctx, 0.22);
  const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 13);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#fbf4e2');
  g.addColorStop(1, '#e8d8b0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = rgba('#b89a60', 0.7);
  ctx.stroke();
  ctx.save();
  ctx.clip();
  // the oven's colour: toasted gold along its lower edge, where it sat nearest the fire
  const tg = ctx.createLinearGradient(-6, -6, 10, 10);
  tg.addColorStop(0.55, rgba('#e8b870', 0));
  tg.addColorStop(1, rgba('#c88a3a', 0.55));
  ctx.fillStyle = tg;
  ctx.fillRect(-14, -14, 28, 28);
  ctx.restore();
  // a couple of short strings where it tore, melted into the sauce
  for (let i = 0; i < 2; i++) {
    const a = 2.9 + i * 0.6 + rand() * 0.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 7.5);
    ctx.quadraticCurveTo(Math.cos(a) * 12, Math.sin(a) * 10 + 1, Math.cos(a) * (13 + rand() * 2), Math.sin(a) * (11 + rand() * 2));
    ctx.strokeStyle = rgba('#fff4dc', 0.55);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  // its milky body's soft shading, and the gloss of the fresh cheese
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * 0.95, y * 0.95) : ctx.moveTo(x * 0.95, y * 0.95)));
  ctx.closePath();
  ctx.clip();
  const sh = ctx.createLinearGradient(-8, -8, 9, 9);
  sh.addColorStop(0, 'rgba(255,255,255,0)');
  sh.addColorStop(1, 'rgba(160,130,80,0.28)');
  ctx.fillStyle = sh;
  ctx.fillRect(-14, -14, 28, 28);
  ctx.restore();
  shine(ctx, -3.5, -4.5, 4.4, 2, 0.8);
  shine(ctx, 3.5, 2, 1.6, 0.8, 0.45);
}

piece('fiorDiLatte', 2.5, { count: 8, minDist: 27, draw: fiorDiLatte });

piece('parmShavings', 1.7, {
  count: 8,
  minDist: 20,
  draw(ctx, rand) {
    // a curl of parmigiano shaved off the wheel: thin, pale straw, see-through at its edge, curling up at one end
    const L = 12 + rand() * 4;
    ctx.beginPath();
    ctx.moveTo(-L / 2, -2);
    ctx.bezierCurveTo(-L / 4, -4.2, L / 4, -3.6, L / 2, -1.2);
    ctx.quadraticCurveTo(L / 2 + 2.5, 1.5, L / 2 - 1, 3);
    ctx.bezierCurveTo(L / 4, 2.6, -L / 4, 3.4, -L / 2, 2.2);
    ctx.closePath();
    drop(ctx, 0.25, 1, 1.6);
    const g = ctx.createLinearGradient(0, -4, 0, 3);
    g.addColorStop(0, '#fff6d0');
    g.addColorStop(0.6, '#f0d890');
    g.addColorStop(1, '#d8b860');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = rgba('#9a7a30', 0.75);
    ctx.stroke();
    // its grain and the crystals in it
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = rgba('#ffffff', 0.7);
      ctx.fillRect(-L / 2 + 2 + rand() * (L - 4), -1.5 + rand() * 3, 0.9, 0.9);
    }
    ctx.beginPath();
    ctx.moveTo(-L / 2 + 1, -1.4);
    ctx.bezierCurveTo(-L / 4, -3.2, L / 4, -2.6, L / 2 - 0.5, -0.6);
    ctx.strokeStyle = rgba('#ffffff', 0.7);
    ctx.lineWidth = 0.7;
    ctx.stroke();
  },
});

registerTopping('nonnaSpoon', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // Nonna's wooden ladle laid across the pie, as she left it: olive wood worn smooth, its bowl still full of ragù,
    // a drip run off its lip onto the pie, a basil leaf tucked by it
    ctx.save();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.98, 0, TAU);
    ctx.clip();
    ctx.translate(C + 10, C - 22);
    ctx.rotate(-0.55);
    ctx.scale(1.35, 1.35);
    const L = 150;
    // its shadow on the pie
    ctx.save();
    ctx.translate(4, 7);
    ctx.fillStyle = rgba('#2a0e04', 0.35);
    ctx.beginPath();
    ctx.ellipse(-L * 0.52, 0, 30, 22, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(-L * 0.4, -6, L * 1.05, 12);
    ctx.restore();
    // the handle: tapering, its grain, worn dark at the grip
    ctx.beginPath();
    ctx.moveTo(-L * 0.36, -7);
    ctx.quadraticCurveTo(L * 0.2, -6.5, L * 0.66, -5);
    ctx.quadraticCurveTo(L * 0.72, 0, L * 0.66, 5);
    ctx.quadraticCurveTo(L * 0.2, 6.5, -L * 0.36, 7);
    ctx.closePath();
    const wood = ctx.createLinearGradient(0, -7, 0, 7);
    wood.addColorStop(0, '#e2ac6a');
    wood.addColorStop(0.45, '#b47a3e');
    wood.addColorStop(1, '#6a3c18');
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-L * 0.36, -4.5 + i * 2.2);
      for (let x = -L * 0.36; x < L * 0.7; x += 12) ctx.lineTo(x, -4.5 + i * 2.2 + Math.sin(x * 0.05 + i) * 0.7);
      ctx.strokeStyle = rgba(i % 2 ? '#7a4a20' : '#f0c890', 0.35);
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    const grip = ctx.createLinearGradient(L * 0.35, 0, L * 0.7, 0);
    grip.addColorStop(0, 'rgba(60,30,10,0)');
    grip.addColorStop(1, 'rgba(60,30,10,0.4)');
    ctx.fillStyle = grip;
    ctx.fillRect(L * 0.3, -8, L * 0.45, 16);
    ctx.fillStyle = rgba('#fff2d0', 0.5);
    ctx.fillRect(-L * 0.3, -4.6, L * 0.9, 1.4);
    ctx.restore();
    // the hanging hole
    ellipse(ctx, L * 0.6, 0, 2.6, 2, 0);
    ctx.fillStyle = '#3a1e0c';
    ctx.fill();
    // the bowl: deep, its rim catching the light, the ragù heaped in it
    const bx = -L * 0.52;
    ellipse(ctx, bx, 0, 29, 21, 0);
    const bowl = ctx.createRadialGradient(bx - 10, -8, 2, bx, 0, 32);
    bowl.addColorStop(0, '#e8b474');
    bowl.addColorStop(0.6, '#b47a3e');
    bowl.addColorStop(1, '#6a3c18');
    ctx.fillStyle = bowl;
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ellipse(ctx, bx + 2, 1, 22, 15, 0);
    const ragu = ctx.createRadialGradient(bx - 6, -5, 1, bx + 2, 1, 23);
    ragu.addColorStop(0, '#d8442a');
    ragu.addColorStop(0.5, '#a42414');
    ragu.addColorStop(1, '#5a1206');
    ctx.fillStyle = ragu;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba('#3a0a04', 0.8);
    ctx.stroke();
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 18; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * 18;
      const x = bx + 2 + Math.cos(a) * d;
      const y = 1 + Math.sin(a) * d * 0.68;
      blob(ctx, x, y, 1.4 + rand() * 1.4, 0.5, rand, 6);
      ctx.fillStyle = rand() < 0.5 ? '#6a2410' : '#4a1608';
      ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#ff8a2a' : '#8ac24a';
      ctx.fillRect(bx - 8 + rand() * 18, -6 + rand() * 12, 1.8, 1.8);
    }
    ctx.restore();
    shine(ctx, bx - 8, -6, 7, 2.6, 0.7, -0.2);
    // the rim's light
    ctx.beginPath();
    ctx.ellipse(bx, 0, 29, 21, 0, Math.PI * 1.1, Math.PI * 1.65);
    ctx.strokeStyle = rgba('#fff0d0', 0.75);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // a drip of ragù off its lip onto the pie
    ctx.beginPath();
    ctx.moveTo(bx + 18, 14);
    ctx.bezierCurveTo(bx + 22, 20, bx + 20, 26, bx + 24, 30);
    ctx.arc(bx + 22, 31, 4, 0.2, Math.PI + 0.4);
    ctx.bezierCurveTo(bx + 16, 24, bx + 14, 19, bx + 12, 15);
    ctx.closePath();
    ctx.fillStyle = '#a82414';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba('#3a0a04', 0.8);
    ctx.stroke();
    // a basil leaf tucked by its handle
    ctx.save();
    ctx.translate(L * 0.08, 10);
    ctx.rotate(0.7);
    basilLeaf(ctx, 34, 10, rand);
    ctx.restore();
    ctx.restore();
  },
});

registerTopping('flourDust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the flour still on the crust from Nonna's hands: powdery patches on the cornicione (most where she held it, the
    // top left), a few specks out on the pie
    ctx.save();
    clipRing(ctx, PIZZA_R * 0.8);
    for (let i = 0; i < 46; i++) {
      const a = -2.4 + (rand() - 0.5) * 3.4 + (i % 4 === 0 ? Math.PI : 0);
      const d = PIZZA_R * (0.84 + rand() * 0.14);
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 3 + rand() * 8;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba('#ffffff', 0.5 + rand() * 0.3));
      g.addColorStop(0.6, rgba('#fffaf0', 0.25));
      g.addColorStop(1, rgba('#fffaf0', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
    for (let i = 0; i < 26; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * PIZZA_R * 0.78;
      ctx.fillStyle = rgba('#ffffff', 0.45 + rand() * 0.4);
      ctx.beginPath();
      ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 0.6 + rand() * 1.1, 0, TAU);
      ctx.fill();
    }
  },
});

// ════════════════════════════ Silver Service ════════════════════════════

piece('salmonRose', 2.9, {
  count: 8,
  minDist: 30,
  draw(ctx, rand) {
    // smoked salmon rolled into a rose, as the Head Waiter plates it: petals of coral, marbled with fat, curling out
    // from a tight heart, the outer ones lying open on the cream
    const petal = (r: number, a: number, w: number, dark: number) => {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-w * r, 0);
      ctx.bezierCurveTo(-w * r, -r * 1.05, w * r, -r * 1.05, w * r, 0);
      ctx.quadraticCurveTo(0, r * 0.25, -w * r, 0);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -r, 0, 0);
      g.addColorStop(0, `rgb(${255 - dark},${150 - dark},${110 - dark})`);
      g.addColorStop(0.55, `rgb(${240 - dark},${112 - dark},${78 - dark})`);
      g.addColorStop(1, `rgb(${200 - dark},${80 - dark},${56 - dark})`);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = rgba('#7a2a18', 0.8);
      ctx.stroke();
      ctx.save();
      ctx.clip();
      // the fat's pale lines through the flesh
      ctx.strokeStyle = rgba('#ffe0d0', 0.6);
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-w * r, -r * (0.2 + i * 0.25));
        ctx.quadraticCurveTo(0, -r * (0.35 + i * 0.25), w * r, -r * (0.15 + i * 0.28));
        ctx.stroke();
      }
      ctx.restore();
      // the curled edge catching the light
      ctx.beginPath();
      ctx.moveTo(-w * r * 0.8, -r * 0.62);
      ctx.bezierCurveTo(-w * r * 0.4, -r * 0.82, w * r * 0.4, -r * 0.82, w * r * 0.8, -r * 0.62);
      ctx.strokeStyle = rgba('#fff0e0', 0.7);
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.restore();
    };
    ellipse(ctx, 0, 0, 11.5, 10.5);
    drop(ctx, 0.2, 1.2, 2);
    const spin = rand() * TAU;
    for (let i = 0; i < 6; i++) petal(12.5, spin + (i / 6) * TAU, 0.55, 28);
    for (let i = 0; i < 5; i++) petal(8.8, spin + 0.5 + (i / 5) * TAU, 0.5, 10);
    for (let i = 0; i < 3; i++) petal(5, spin + 1 + (i / 3) * TAU, 0.5, 0);
    // the heart, rolled tight
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, TAU);
    ctx.fillStyle = '#c85a3a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0.4, 4.6);
    ctx.strokeStyle = rgba('#7a2a18', 0.9);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    shine(ctx, -3, -4, 3, 1.2, 0.55);
  },
});

piece('cremeRosette', 2.3, {
  count: 9,
  minDist: 23,
  draw(ctx, rand) {
    // crème fraîche piped through a star tip: ridges twisting up to a peak, cool white with blue-grey in its folds
    const n = 8;
    const R = 9.5;
    ellipse(ctx, 0, 0, R + 1, R);
    drop(ctx, 0.28, 1.2, 2.2);
    ctx.fillStyle = '#e8ecf0';
    ctx.fill();
    const tw = rand() * TAU;
    for (let i = 0; i < n; i++) {
      const a = tw + (i / n) * TAU;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(R * 0.5, -R * 0.45, R * 1.05, -R * 0.25, R, R * 0.12);
      ctx.bezierCurveTo(R * 0.7, R * 0.35, R * 0.3, R * 0.25, 0, 0);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -R * 0.4, 0, R * 0.3);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.6, '#f4f2ec');
      g.addColorStop(1, '#b8c2cc');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = rgba('#8a96a4', 0.7);
      ctx.stroke();
      ctx.restore();
    }
    // the peak, curling over, and its light
    ctx.beginPath();
    ctx.moveTo(-2.5, 1);
    ctx.quadraticCurveTo(-1, -4, 2.5, -3);
    ctx.quadraticCurveTo(1, -0.5, 2.2, 1.6);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = rgba('#8a96a4', 0.6);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    shine(ctx, -3, -3.5, 2.6, 1.2, 0.85);
  },
});

piece('caviarPearls', 2.0, {
  count: 8,
  minDist: 21,
  draw(ctx, rand) {
    // a quenelle of caviar: glossy dark pearls heaped together, each with its point of light and a green-gold depth
    const pearls: [number, number][] = [];
    for (let i = 0; i < 17; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * 6.5;
      pearls.push([Math.cos(a) * d * 1.3, Math.sin(a) * d]);
    }
    pearls.sort((p, q) => p[1] - q[1]);
    ellipse(ctx, 0, 0.5, 10.5, 8);
    drop(ctx, 0.3, 1, 1.6);
    for (const [x, y] of pearls) {
      ctx.beginPath();
      ctx.arc(x, y, 2.1, 0, TAU);
      const g = ctx.createRadialGradient(x - 0.7, y - 0.8, 0.1, x, y, 2.2);
      g.addColorStop(0, '#5a6458');
      g.addColorStop(0.5, '#1c2420');
      g.addColorStop(1, '#0a0e0c');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 0.4;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 0.7, y - 0.8, 0.55, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }
  },
});

piece('silverLeaf', 2.0, {
  count: 10,
  minDist: 18,
  draw(ctx, rand) {
    // a flake of edible silver leaf, crinkled into facets that each catch the light differently
    const n = 7;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand() * 0.5;
      const r = 4.5 + rand() * 4;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    drop(ctx, 0.22, 0.8, 1.2);
    ctx.fillStyle = '#7e8a9a';
    ctx.fill();
    // the facets: a fan of triangles from an off-centre crease
    const cx = (rand() - 0.5) * 2;
    const cy = (rand() - 0.5) * 2;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % n];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.closePath();
      const lit = 0.5 + 0.5 * Math.cos(Math.atan2((y0 + y1) / 2, (x0 + x1) / 2) + 2.3);
      const v = Math.round(100 + lit * 155);
      ctx.fillStyle = `rgb(${v},${v + 4 > 255 ? 255 : v + 4},${Math.min(255, v + 12)})`;
      ctx.fill();
    }
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = rgba('#4a5462', 0.8);
    ctx.stroke();
    // a star of light on its brightest facet
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const sx = pts[5][0] * 0.4;
    const sy = pts[5][1] * 0.4;
    ctx.moveTo(sx, sy - 3);
    ctx.lineTo(sx + 0.7, sy - 0.7);
    ctx.lineTo(sx + 3, sy);
    ctx.lineTo(sx + 0.7, sy + 0.7);
    ctx.lineTo(sx, sy + 3);
    ctx.lineTo(sx - 0.7, sy + 0.7);
    ctx.lineTo(sx - 3, sy);
    ctx.lineTo(sx - 0.7, sy - 0.7);
    ctx.closePath();
    ctx.fill();
  },
});

registerTopping('cremeSpiral', {
  count: 1,
  draw(ctx) {
    overlay(ctx);
    // crème fraîche piped in a spiral from the middle out, the way the Head Waiter finishes a plate: a glossy white
    // ribbon, its shadow on the pie, a fine line of light along its crown
    // (first the cream base brightened and given its gloss, so the pie reads as crème fraîche, not a plain white)
    ctx.save();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.8, 0, TAU);
    ctx.clip();
    const base = ctx.createRadialGradient(C - 40, C - 50, 10, C, C, PIZZA_R * 0.85);
    base.addColorStop(0, 'rgba(255,253,246,0.85)');
    base.addColorStop(0.6, 'rgba(246,238,220,0.6)');
    base.addColorStop(1, 'rgba(206,186,150,0.7)');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.restore();
    const pts: [number, number][] = [];
    const turns = 2.6;
    for (let i = 0; i <= 140; i++) {
      const u = i / 140;
      const a = u * turns * TAU + 0.6;
      const r = 14 + u * PIZZA_R * 0.62;
      pts.push([C + Math.cos(a) * r, C + Math.sin(a) * r]);
    }
    const path = () => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    };
    ctx.save();
    ctx.translate(1.5, 2.5);
    path();
    ctx.strokeStyle = rgba('#3a2a1a', 0.22);
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
    path();
    ctx.strokeStyle = '#c8ccd0';
    ctx.lineWidth = 6.5;
    ctx.stroke();
    path();
    ctx.strokeStyle = '#fbfbf6';
    ctx.lineWidth = 4.6;
    ctx.stroke();
    ctx.save();
    ctx.translate(-0.8, -1);
    path();
    ctx.strokeStyle = rgba('#ffffff', 0.9);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  },
});

registerTopping('silverCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the cornicione brushed with silver dust, a polished silver line where it meets the cream, like the rim of his
    // tray, and its beading
    ctx.save();
    clipRing(ctx, PIZZA_R * 0.82);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.85 + rand() * 0.13);
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const lit = 0.4 + 0.6 * Math.max(0, Math.cos(a + 2.3));
      ctx.fillStyle = rgba('#dfe8f4', 0.18 + 0.4 * lit * rand());
      ctx.beginPath();
      ctx.arc(x, y, 0.6 + rand() * 1.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    // the silver line and its beads
    const r = PIZZA_R * 0.815;
    ctx.beginPath();
    ctx.arc(C, C, r, 0, TAU);
    ctx.strokeStyle = rgba(INK, 0.55);
    ctx.lineWidth = 3.4;
    ctx.stroke();
    const g = ctx.createLinearGradient(C - r, C - r, C + r, C + r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, '#b8c6d6');
    g.addColorStop(0.65, '#e8f0f8');
    g.addColorStop(1, '#7a8698');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU;
      ctx.beginPath();
      ctx.arc(C + Math.cos(a) * (r + 3.4), C + Math.sin(a) * (r + 3.4), 1.05, 0, TAU);
      ctx.fillStyle = Math.cos(a + 2.3) > 0.2 ? '#ffffff' : '#9aa6b6';
      ctx.fill();
    }
  },
});

// ════════════════════════════ The First Bake ════════════════════════════

piece('sanMarzano', 2.4, {
  count: 10,
  minDist: 28,
  draw(ctx, rand) {
    // half a San Marzano plum tomato, cut side up: long, its red flesh walls round two chambers of seeds in jelly,
    // its skin blistered black in spots by the wood fire, glossy with oil
    const L = 13;
    const Wd = 8.2;
    ellipse(ctx, 0, 0, L, Wd);
    drop(ctx, 0.35, 1.3, 2.2);
    const g = ctx.createRadialGradient(-3, -2, 1, 0, 0, L);
    g.addColorStop(0, '#ff5a3a');
    g.addColorStop(0.6, '#d8281a');
    g.addColorStop(1, '#8a1008');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba('#4a0804', 0.85);
    ctx.stroke();
    ctx.save();
    ctx.clip();
    // the chambers: jelly with seeds in it
    for (const sd of [-1, 1]) {
      ellipse(ctx, sd * 4.6, 0, 4.2, 5.2);
      const jg = ctx.createRadialGradient(sd * 4.6, -1, 0.5, sd * 4.6, 0, 5);
      jg.addColorStop(0, '#ffb070');
      jg.addColorStop(1, '#e8582a');
      ctx.fillStyle = jg;
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        ellipse(ctx, sd * 4.6 + (rand() - 0.5) * 4, (rand() - 0.5) * 6.5, 0.9, 0.6, rand() * 3);
        ctx.fillStyle = '#fff0a8';
        ctx.fill();
      }
    }
    // the flesh's centre wall, paler
    ctx.fillStyle = rgba('#ff8a6a', 0.6);
    ctx.fillRect(-1, -Wd, 2, Wd * 2);
    // the wood fire's blisters on the skin
    for (let i = 0; i < 3; i++) {
      const a = rand() * TAU;
      const x = Math.cos(a) * L * 0.85;
      const y = Math.sin(a) * Wd * 0.85;
      const r = 1.6 + rand() * 2.2;
      const bg = ctx.createRadialGradient(x, y, 0, x, y, r);
      bg.addColorStop(0, rgba('#1a0804', 0.85));
      bg.addColorStop(0.6, rgba('#4a1008', 0.4));
      bg.addColorStop(1, rgba('#4a1008', 0));
      ctx.fillStyle = bg;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
    shine(ctx, -5, -3.5, 4.2, 1.5, 0.7, -0.2);
    shine(ctx, 6, 3.5, 1.6, 0.7, 0.45);
  },
});

piece('seaSalt', 1, {
  count: 24,
  minDist: 16,
  draw(ctx, rand) {
    // a flake of sea salt: a little hollow pyramid, white and see-through, lit on its top faces
    const s = 2.2 + rand() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.fillStyle = rgba('#ffffff', 0.55);
    ctx.fill();
    ctx.lineWidth = 0.45;
    ctx.strokeStyle = rgba('#8a96a4', 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(0, 0);
    ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.fillStyle = rgba('#ffffff', 0.9);
    ctx.fill();
  },
});

registerTopping('oilPools', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the new oil poured over it as it came out: golden pools on the sauce, each with its bright edge of light
    for (let i = 0; i < 9; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * PIZZA_R * 0.66;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const rx = 7 + rand() * 9;
      const ry = rx * (0.5 + rand() * 0.3);
      const rot = rand() * Math.PI;
      ellipse(ctx, x, y, rx, ry, rot);
      const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 0.5, x, y, rx);
      g.addColorStop(0, 'rgba(255,236,150,0.75)');
      g.addColorStop(0.7, 'rgba(230,170,40,0.45)');
      g.addColorStop(1, 'rgba(200,130,20,0.2)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, Math.PI * 1.05, Math.PI * 1.55);
      ctx.strokeStyle = rgba('#fffbe0', 0.8);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  },
});

registerTopping('wheatSprig', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a sprig of the first wheat laid across the top right: a golden ear, its grains in pairs up the stalk, long awns
    // fanning off it, the stalk running out to the crust
    // (up by the crust, clear of where the face sits)
    const x0 = C + 62;
    const y0 = C - 84;
    const ang = 2.6;
    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(ang);
    ctx.scale(1.8, 1.8);
    // the stalk
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(-30, 4, -58, 2);
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#d8a84a';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = rgba('#fff0b0', 0.7);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // a leaf off the stalk
    ctx.beginPath();
    ctx.moveTo(-34, 3);
    ctx.quadraticCurveTo(-42, 14, -56, 15);
    ctx.quadraticCurveTo(-44, 8, -34, 3);
    ctx.fillStyle = '#c89a3a';
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // the awns first (under the grains)
    for (let i = 0; i < 9; i++) {
      const u = i * 5.4;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(u + 3, sd * 3);
        ctx.quadraticCurveTo(u + 14, sd * (8 + i * 0.4), u + 26 + rand() * 6, sd * (12 + i * 0.8 + rand() * 3));
        ctx.strokeStyle = rgba('#e8c070', 0.85);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
    // the grains, in pairs, plump and lit on top
    for (let i = 0; i < 9; i++) {
      const u = i * 5.4;
      const k = 1 - i * 0.04;
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.translate(u, sd * 2.6);
        ctx.rotate(sd * 0.5);
        ellipse(ctx, 0, 0, 4.4 * k, 2.6 * k);
        const g = ctx.createLinearGradient(0, -2.6, 0, 2.6);
        g.addColorStop(0, '#ffe08a');
        g.addColorStop(0.6, '#e0a848');
        g.addColorStop(1, '#a8702a');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = rgba(INK, 0.75);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-3 * k, 0);
        ctx.lineTo(3 * k, 0);
        ctx.strokeStyle = rgba('#8a5a1a', 0.6);
        ctx.lineWidth = 0.4;
        ctx.stroke();
        shine(ctx, -1, -1, 1.8 * k, 0.7 * k, 0.7, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  },
});

registerTopping('woodfireCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the first bake's cornicione: puffed and golden from the wood oven, leopard-spotted with char (dark blisters,
    // each with a soft halo), a sheen of gold along its top, a few flecks of ash
    ctx.save();
    clipRing(ctx, PIZZA_R * 0.8);
    // its golden puff: lighter along the ring's crown
    const g = ctx.createRadialGradient(C, C, PIZZA_R * 0.8, C, C, PIZZA_R);
    g.addColorStop(0, 'rgba(255,220,140,0)');
    g.addColorStop(0.45, 'rgba(255,224,150,0.38)');
    g.addColorStop(1, 'rgba(150,80,20,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // the leopard spots
    for (let i = 0; i < 34; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.84 + rand() * 0.13);
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 2.2 + rand() * 4.2;
      const sg = ctx.createRadialGradient(x, y, 0, x, y, r * 2.1);
      sg.addColorStop(0, rgba('#1a0a04', 0.92));
      sg.addColorStop(0.4, rgba('#3a1a08', 0.6));
      sg.addColorStop(0.75, rgba('#8a4a18', 0.2));
      sg.addColorStop(1, rgba('#8a4a18', 0));
      ctx.fillStyle = sg;
      ctx.fillRect(x - r * 2.1, y - r * 2.1, r * 4.2, r * 4.2);
      // its blister's lit lip
      ctx.beginPath();
      ctx.arc(x, y, r * 0.9, Math.PI * 1.05, Math.PI * 1.6);
      ctx.strokeStyle = rgba('#ffe8b0', 0.55);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    // ash flecks
    for (let i = 0; i < 18; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.83 + rand() * 0.15);
      ctx.fillStyle = rgba(i % 2 ? '#e8e0d0' : '#5a524a', 0.6);
      ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1.2, 1.2);
    }
    ctx.restore();
    // the gold sheen along its top left
    ctx.save();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.93, Math.PI * 0.95, Math.PI * 1.65);
    ctx.strokeStyle = rgba('#fff2c0', 0.55);
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.93, Math.PI * 1.1, Math.PI * 1.45);
    ctx.strokeStyle = rgba('#ffffff', 0.6);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  },
});
