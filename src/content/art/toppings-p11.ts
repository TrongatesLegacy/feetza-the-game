// Toppings for the pizza plan's Act 4 Legendaries (src/content/pizzas/p11.ts), drawn as the game's centrepieces:
// - Pigeon King's Catch (Old Town, the Pigeon King): the sauce laid with cobbles of roast aubergine and potato in the
//   piazza's fan pattern, mozzarella melting in the joints; a trail of toasted breadcrumbs (ALL CRUMBS ARE MINE!);
//   feathers of crisp cavolo nero, slate-grey and ruffled; the King's crown in yellow pepper, set with olive jewels and
//   a cherry-tomato ruby, at the back of the pie; a crust lit warm by Old Town's gas lamps.
// - Second Rise (the Kitchen, the Dough Boy): the dough itself proved and showing, pale and blistered with airy holes;
//   clouds of ricotta; glossy garlic knots; flour dusted over it all; basil; a proud, puffed crust with a second rise
//   bulging up one side and cracks of pale dough.
// - Cathedral Crust (Old Town, the Gargoyle): a rose window laid in roast peppers and red onion, ruby, gold, emerald
//   and violet, leaded with black olive; king oyster mushrooms roasted stone-grey and scored like dressed stone;
//   gargoyle wings of grilled artichoke leaves; pecorino grated like stone dust; a grey-stone crust carved with a
//   gothic arcade.
//
// Piece toppings draw one piece centred at the origin, already placed and turned by the caller. Overlays (count 1)
// reset the transform and paint across the 400×400 top. Every topping is wrapped in save/restore by the caller.

import { PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
import { GLASS } from '../../art/perkPropsLegend4';
import { type Ctx, blob, ellipse, rgba, shade } from '../../art/util';

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
  ctx.fillStyle = rgba('#120604', alpha);
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

function clipDisc(ctx: Ctx, r = PIZZA_R * 0.8): void {
  ctx.beginPath();
  ctx.arc(C, C, r, 0, TAU);
  ctx.clip();
}

function clipRing(ctx: Ctx, r0: number, r1 = PIZZA_R): void {
  ctx.beginPath();
  ctx.arc(C, C, r1, 0, TAU);
  ctx.arc(C, C, r0, 0, TAU, true);
  ctx.clip('evenodd');
}

/** A soft round glow. */
function cloud(ctx: Ctx, x: number, y: number, r: number, col: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.5, rgba(col, a * 0.45));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A rounded quad through four corners (a cobble, a pane), corners eased in by `k`. */
function softQuad(ctx: Ctx, p: [number, number][], k = 0.28): void {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = p[i];
    const b = p[(i + 1) % 4];
    const s0: [number, number] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const s1: [number, number] = [a[0] + (b[0] - a[0]) * (1 - k), a[1] + (b[1] - a[1]) * (1 - k)];
    if (i === 0) ctx.moveTo(s0[0], s0[1]);
    else ctx.quadraticCurveTo(a[0], a[1], s0[0], s0[1]);
    ctx.lineTo(s1[0], s1[1]);
  }
  const a = p[0];
  const b = p[1];
  ctx.quadraticCurveTo(a[0], a[1], a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k);
  ctx.closePath();
}

// ════════════════════════════ Pigeon King's Catch ════════════════════════════

registerTopping('piazzaCobbles', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the piazza's cobbles, laid in the sauce in Old Town's fan pattern (arcs of setts swinging out from the front):
    // rounds of roast aubergine laid skin up (glossy violet-black, like the piazza's basalt setts) and here and there a
    // roast potato (golden, its edges crisp), each a little domed and glossy with oil, the tomato showing in the joints
    // and mozzarella melting into them
    const R = PIZZA_R * 0.8;
    ctx.save();
    clipDisc(ctx, R);
    // the sauce in the joints, deep and glossy
    const gs = ctx.createRadialGradient(C - 30, C - 30, 10, C, C, R);
    gs.addColorStop(0, '#c63a20');
    gs.addColorStop(1, '#8a1c0c');
    ctx.fillStyle = gs;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // fans: arcs of setts round centres in a staggered grid, each fan's courses widening out
    const fanX = 112;
    const fanY = 58;
    const cs: [number, number][] = [];
    for (let row = -3; row <= 3; row++) for (let col = -2; col <= 2; col++) cs.push([C + col * fanX + (row % 2 ? fanX / 2 : 0), C + row * fanY + 52]);
    const setts: { q: [number, number][]; mx: number; my: number }[] = [];
    for (const [fx, fy] of cs) {
      for (let ring = 1; ring <= 3; ring++) {
        const r0 = 4 + (ring - 1) * 21;
        const r1 = r0 + 19;
        const n = 1 + ring * 2;
        for (let i = 0; i < n; i++) {
          const a0 = Math.PI + (i / n) * Math.PI + 0.05;
          const a1 = Math.PI + ((i + 1) / n) * Math.PI - 0.05;
          const q: [number, number][] = [
            [fx + Math.cos(a0) * r0, fy + Math.sin(a0) * r0],
            [fx + Math.cos(a1) * r0, fy + Math.sin(a1) * r0],
            [fx + Math.cos(a1) * r1, fy + Math.sin(a1) * r1],
            [fx + Math.cos(a0) * r1, fy + Math.sin(a0) * r1],
          ];
          const mx = (q[0][0] + q[2][0]) / 2;
          const my = (q[0][1] + q[2][1]) / 2;
          if (Math.hypot(mx - C, my - C) > R + 10) continue;
          setts.push({ q, mx, my });
        }
      }
    }
    // (fans overlap: the later fan's setts sit over the earlier's, as a real piazza's courses meet)
    for (const s of setts) {
      const aub = rand() < 0.72;
      softQuad(ctx, s.q, 0.3);
      drop(ctx, 0.35, 1, 1.6);
      const g = ctx.createRadialGradient(s.mx - 5, s.my - 5, 0.5, s.mx, s.my, 16);
      if (aub) {
        g.addColorStop(0, '#a898b8');
        g.addColorStop(0.45, '#5a4668');
        g.addColorStop(1, '#22162a');
      } else {
        g.addColorStop(0, '#ffe8a8');
        g.addColorStop(0.55, '#e8a848');
        g.addColorStop(1, '#a8621c');
      }
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = INK;
      ctx.stroke();
      if (aub) {
        // the skin's wrinkles where it roasted
        ctx.save();
        ctx.clip();
        for (let k = 0; k < 3; k++) {
          ctx.strokeStyle = rgba('#d8c8e8', 0.25);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(s.mx - 8 + rand() * 4, s.my - 6 + k * 5);
          ctx.quadraticCurveTo(s.mx, s.my - 8 + k * 5 + rand() * 3, s.mx + 8, s.my - 5 + k * 5);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // the potato's crisped edge
        ctx.save();
        ctx.clip();
        for (let k = 0; k < 10; k++) {
          ctx.fillStyle = rgba(rand() < 0.5 ? '#7a3a08' : '#fff0b0', 0.4);
          ctx.beginPath();
          ctx.arc(s.mx + (rand() - 0.5) * 20, s.my + (rand() - 0.5) * 14, 0.9 + rand() * 1.4, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      shine(ctx, s.mx - 4, s.my - 4, 5, 1.8, 0.45, -0.5);
    }
    // mozzarella melting into the joints here and there
    for (let i = 0; i < 9; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * R * 0.92;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      blob(ctx, x, y, 8 + rand() * 8, 0.6, rand, 9);
      const gm = ctx.createRadialGradient(x - 2, y - 2, 0.5, x, y, 12);
      gm.addColorStop(0, '#fffdf4');
      gm.addColorStop(1, '#f0dca8');
      ctx.fillStyle = gm;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba('#a87a3a', 0.6);
      ctx.stroke();
    }
    // the lamplight lying warm across the cobbles from the top right
    ctx.globalCompositeOperation = 'lighter';
    cloud(ctx, C + R * 0.45, C - R * 0.45, R * 0.7, '#ffb050', 0.14);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },
});

piece('crumbTrail', 1.6, {
  count: 16,
  minDist: 16,
  draw(ctx, rand) {
    // a little cluster of toasted breadcrumbs: craggy golden nuggets, darker where they caught
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const x = (rand() - 0.5) * 8;
      const y = (rand() - 0.5) * 6;
      const r = 1.8 + rand() * 2;
      blob(ctx, x, y, r, 0.8, rand, 6);
      drop(ctx, 0.35, 0.8, 1.2);
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.2, x, y, r * 1.2);
      g.addColorStop(0, '#fff0b8');
      g.addColorStop(0.5, '#e2a446');
      g.addColorStop(1, '#9a5a16');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  },
});

piece('royalFeather', 3, {
  count: 3,
  minDist: 80,
  draw(ctx, rand) {
    // a feather of crisp cavolo nero: the leaf slate green-grey like the King's plumage, ruffled at its edge, its pale
    // rib running down it, glossy with the oil it fried in, its tip charred dark
    const L = 15;
    const curl = (rand() - 0.5) * 0.3;
    const edge = (side: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const w = Math.sin(Math.PI * Math.pow(t, 0.8)) * 4.6 * (1 - t * 0.25);
        const ruff = Math.sin(t * 26 + side) * 0.7;
        pts.push([-L + t * 2 * L, side * (w + ruff) + Math.sin(t * Math.PI) * curl * 8]);
      }
      return pts;
    };
    const top = edge(-1);
    const bot = edge(1);
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (const [x, y] of top) ctx.lineTo(x, y);
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
    drop(ctx, 0.35, 1.2, 1.8);
    const g = ctx.createLinearGradient(-L, -4, L, 4);
    g.addColorStop(0, '#9aa8b0');
    g.addColorStop(0.4, '#5a6a68');
    g.addColorStop(0.85, '#3a4642');
    g.addColorStop(1, '#1a1e1a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#141814';
    ctx.stroke();
    // its ruffles: little puckers along the blade
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 9; i++) {
      const x = -L + 4 + i * 3.2;
      ctx.strokeStyle = rgba('#c8d4d8', 0.35);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, -4);
      ctx.quadraticCurveTo(x + 1.5, 0, x, 4);
      ctx.stroke();
    }
    ctx.restore();
    // the rib
    ctx.strokeStyle = '#d8e2d4';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-L - 2, curl);
    ctx.quadraticCurveTo(0, curl * 8 + 0.5, L - 2, curl * 2);
    ctx.stroke();
    shine(ctx, -L * 0.3, -1.6, 4, 0.8, 0.5, 0);
  },
});

/** The King's crown sits at the back of the pie, clear of its face (which sits a little in front of the middle). */
const CROWN_DY = -PIZZA_R * 0.48;

registerTopping('kingsCrown', {
  count: 1,
  draw(ctx) {
    overlay(ctx);
    ctx.translate(C, C + CROWN_DY);
    // the Pigeon King's crown in roast yellow pepper: a band and five points, glossy and charred at the tips, set with
    // black olive jewels round the band and a cherry tomato ruby at its front
    ctx.scale(1.25, 1.25);
    const w = 46;
    ctx.beginPath();
    ctx.moveTo(-w, 10);
    ctx.lineTo(-w - 4, -16);
    for (let i = 0; i < 5; i++) {
      const x0 = -w + (i * 2 * w) / 5;
      const x1 = -w + ((i + 1) * 2 * w) / 5;
      const mx = (x0 + x1) / 2;
      ctx.lineTo(mx - 4, -4);
      ctx.quadraticCurveTo(mx, -34 - (i === 2 ? 6 : 0), mx + 4, -4);
    }
    ctx.lineTo(w + 4, -16);
    ctx.lineTo(w, 10);
    ctx.quadraticCurveTo(0, 18, -w, 10);
    ctx.closePath();
    drop(ctx, 0.45, 2, 3);
    const g = ctx.createLinearGradient(0, -36, 0, 16);
    g.addColorStop(0, '#fff2a0');
    g.addColorStop(0.35, '#ffd23f');
    g.addColorStop(0.8, '#e2a018');
    g.addColorStop(1, '#a86a08');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // charred blisters on the pepper
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = rgba('#5a2a04', 0.35);
      ellipse(ctx, -w + ((i * 37) % (2 * w)), -6 + ((i * 13) % 18), 2.5, 1.2, 0.4);
      ctx.fill();
    }
    // the band
    ctx.strokeStyle = rgba('#a86a08', 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w - 1, 0);
    ctx.quadraticCurveTo(0, 8, w + 1, 0);
    ctx.stroke();
    ctx.restore();
    // olive jewels round the band
    for (const x of [-30, -15, 15, 30]) {
      ctx.beginPath();
      ctx.ellipse(x, 4 + Math.abs(x) * -0.04, 4.2, 3.6, 0, 0, TAU);
      ctx.fillStyle = '#1a1418';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, 4, 1.6, 1.3, 0, 0, TAU);
      ctx.fillStyle = '#5a3a2a';
      ctx.fill();
      shine(ctx, x - 1.5, 2.6, 1.4, 0.7, 0.7);
    }
    // the cherry tomato ruby
    ctx.beginPath();
    ctx.arc(0, 4, 7.5, 0, TAU);
    const gr = ctx.createRadialGradient(-2.5, 1.5, 0.5, 0, 4, 8);
    gr.addColorStop(0, '#ff8a7a');
    gr.addColorStop(0.5, '#e2321e');
    gr.addColorStop(1, '#8a1408');
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    shine(ctx, -2.6, 1.2, 2.6, 1.3, 0.8);
    // the gloss on the points
    for (const x of [-27.6, 0, 27.6]) shine(ctx, x - 1.5, -14, 1.6, 4, 0.45, 0.1);
  },
});

registerTopping('lamplitCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the crust brushed with garlic butter and lit warm by Old Town's gas lamps from the top right, crumbs pressed into
    // it, cooler in the shadow away from the lamp
    ctx.save();
    clipRing(ctx, PIZZA_R * 0.8);
    const g = ctx.createRadialGradient(C, C, PIZZA_R * 0.8, C, C, PIZZA_R);
    g.addColorStop(0, 'rgba(110,60,20,0)');
    g.addColorStop(0.7, 'rgba(120,64,20,0.22)');
    g.addColorStop(1, 'rgba(60,26,6,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // lamplight and shadow
    ctx.globalCompositeOperation = 'lighter';
    cloud(ctx, C + PIZZA_R * 0.65, C - PIZZA_R * 0.65, PIZZA_R * 0.75, '#ffb850', 0.3);
    ctx.globalCompositeOperation = 'source-over';
    cloud(ctx, C - PIZZA_R * 0.7, C + PIZZA_R * 0.6, PIZZA_R * 0.7, '#1a2a5a', 0.22);
    // crumbs pressed in
    for (let i = 0; i < 60; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.83 + rand() * 0.14);
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      ctx.fillStyle = rand() < 0.6 ? rgba('#ffe2a0', 0.7) : rgba('#7a4010', 0.55);
      blob(ctx, x, y, 1 + rand() * 1.6, 0.6, rand, 5);
      ctx.fill();
    }
    // the butter's gloss, catching the lamp
    ctx.restore();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.93, -Math.PI * 0.45, Math.PI * 0.05);
    ctx.strokeStyle = rgba('#fff0c8', 0.55);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.93, Math.PI * 1.0, Math.PI * 1.4);
    ctx.strokeStyle = rgba('#ffd8a0', 0.25);
    ctx.lineWidth = 2;
    ctx.stroke();
  },
});

// ════════════════════════════ Second Rise ════════════════════════════

registerTopping('provedDough', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // no sauce to hide it: the proved dough itself, pale and soft, blistered as it baked (domes of golden blister, a
    // few leopard spots), airy holes where its bubbles broke, a cream glaze of olive oil over it all
    const R = PIZZA_R * 0.8;
    ctx.save();
    clipDisc(ctx, R);
    const g = ctx.createRadialGradient(C - 30, C - 34, 8, C, C, R);
    g.addColorStop(0, '#fcecc8');
    g.addColorStop(0.6, '#eed09a');
    g.addColorStop(1, '#d4a462');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // the blisters: soft golden domes, some browned on top
    for (let i = 0; i < 40; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * R * 0.96;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 4 + rand() * 9;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.85, rand() * TAU, 0, TAU);
      const gb = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0.5, x, y, r);
      const brown = rand() < 0.45;
      gb.addColorStop(0, brown ? '#c07a30' : '#fffaf0');
      gb.addColorStop(0.7, brown ? '#dca060' : '#f6e2b8');
      gb.addColorStop(1, 'rgba(220,180,120,0)');
      ctx.fillStyle = gb;
      ctx.fill();
      if (brown && rand() < 0.7) {
        ctx.fillStyle = rgba('#3a1804', 0.7);
        ctx.beginPath();
        ctx.arc(x + (rand() - 0.5) * r * 0.5, y + (rand() - 0.5) * r * 0.5, 1 + rand() * 1.6, 0, TAU);
        ctx.fill();
      }
    }
    // airy holes where bubbles broke
    for (let i = 0; i < 22; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * R * 0.95;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 1.2 + rand() * 2.6;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.7, rand() * TAU, 0, TAU);
      ctx.fillStyle = rgba('#a8763a', 0.55);
      ctx.fill();
      ctx.strokeStyle = rgba('#fffaf0', 0.7);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.3, r, r * 0.7, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    // the glaze
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) cloud(ctx, C - R * 0.5 + i * 18, C - R * 0.45 + i * 8, 30, '#fff6d8', 0.1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },
});

piece('ricottaClouds', 2.7, {
  count: 6,
  minDist: 52,
  draw(ctx, rand) {
    // a dollop of fresh ricotta: soft white curds heaped into peaks, cool shadows between them, a crack of black pepper
    const n = 5 + Math.floor(rand() * 3);
    const lumps: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand() * 0.5;
      const d = 3 + rand() * 3;
      lumps.push([Math.cos(a) * d, Math.sin(a) * d * 0.8, 3.2 + rand() * 2]);
    }
    lumps.push([0, -0.5, 4.5]);
    // its shadow first
    ctx.beginPath();
    ctx.ellipse(1.5, 2.5, 9.5, 7.5, 0, 0, TAU);
    ctx.fillStyle = rgba('#5a3a1a', 0.25);
    ctx.fill();
    for (const [x, y, r] of lumps) {
      ctx.beginPath();
      ctx.arc(x + 0.8, y + 1.2, r, 0, TAU);
      ctx.fillStyle = rgba('#7a5a3a', 0.3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, 0.3, x, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.6, '#f8f4ea');
      g.addColorStop(1, '#d8d0c0');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = rgba('#9a8a70', 0.7);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#2a2420';
      ctx.fillRect((rand() - 0.5) * 9, (rand() - 0.5) * 7, 0.9, 0.9);
    }
  },
});

piece('confitTomato', 3, {
  count: 7,
  minDist: 40,
  draw(ctx, rand) {
    // half a cherry tomato slow-roasted in the oil: wrinkled and glossy, darker at its edge, its seeds in jelly
    const r = 5.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.9, rand() * 3, 0, TAU);
    drop(ctx, 0.4, 1.2, 1.8);
    const g = ctx.createRadialGradient(-1.6, -1.6, 0.4, 0, 0, r * 1.1);
    g.addColorStop(0, '#ff9a7a');
    g.addColorStop(0.5, '#e0321a');
    g.addColorStop(1, '#8a1406');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // the cut face: its walls and seeds
    ctx.strokeStyle = rgba('#ffb09a', 0.7);
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.7);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.ellipse((rand() - 0.5) * r, (rand() - 0.5) * r * 0.8, 0.8, 0.5, rand() * 3, 0, TAU);
      ctx.fill();
    }
    shine(ctx, -1.8, -2, 1.8, 0.9, 0.75);
  },
});

piece('doughKnots', 3.1, {
  count: 5,
  minDist: 60,
  draw(ctx, rand) {
    // a garlic knot: a rope of dough tied in a knot and baked golden, glossy with garlic butter, its tucked end
    // showing, flecks of parsley and garlic on it
    const lobe = (x: number, y: number, rx: number, ry: number, rot: number) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
      drop(ctx, 0.35, 1, 1.6);
      const g = ctx.createRadialGradient(x - rx * 0.4, y - ry * 0.5, 0.4, x, y, Math.max(rx, ry) * 1.1);
      g.addColorStop(0, '#ffe8a8');
      g.addColorStop(0.5, '#e8aa52');
      g.addColorStop(1, '#a8621e');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = INK;
      ctx.stroke();
    };
    // the two loops of the knot, then the band crossing over them, and the tucked end
    lobe(-4, -1, 6.2, 4.6, -0.4);
    lobe(4, 1, 6.2, 4.6, -0.4);
    lobe(0, 0, 3.6, 6.6, 0.5);
    lobe(5.5, -4.2, 2.6, 2.2, 0.3);
    // the seam where the dough folds
    ctx.strokeStyle = rgba('#7a3e10', 0.6);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2, -5);
    ctx.quadraticCurveTo(0, 0, 2, 5);
    ctx.stroke();
    // the butter's gloss
    shine(ctx, -6, -3, 2.6, 1.1, 0.7, -0.4);
    shine(ctx, 2.5, -1.5, 2.2, 0.9, 0.6, -0.4);
    // parsley and garlic
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = rand() < 0.65 ? '#3f8a2a' : '#fff6d8';
      ctx.beginPath();
      ctx.arc((rand() - 0.5) * 13, (rand() - 0.5) * 9, 0.6 + rand() * 0.6, 0, TAU);
      ctx.fill();
    }
  },
});

registerTopping('flourDust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a dusting of flour, sifted over it: thicker in a drift across the pie, fine everywhere else
    ctx.save();
    clipDisc(ctx, PIZZA_R * 0.98);
    for (let i = 0; i < 520; i++) {
      // (a drift across from the top left, thinning out)
      const drift = rand() < 0.5;
      const t = rand();
      const x = drift ? C - PIZZA_R * 0.7 + t * PIZZA_R * 1.4 + (rand() - 0.5) * 60 : C + (rand() - 0.5) * PIZZA_R * 2;
      const y = drift ? C - PIZZA_R * 0.4 + t * PIZZA_R * 0.5 + (rand() - 0.5) * 60 : C + (rand() - 0.5) * PIZZA_R * 2;
      ctx.fillStyle = rgba('#ffffff', 0.25 + rand() * 0.5);
      ctx.beginPath();
      ctx.arc(x, y, 0.5 + rand() * 1.1, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    cloud(ctx, C - PIZZA_R * 0.25, C - PIZZA_R * 0.2, PIZZA_R * 0.4, '#ffffff', 0.08);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },
});

registerTopping('risenCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a proud, puffed cornicione: golden and floured, cracked where it rose, pale dough showing in the cracks, and its
    // second rise bulging up along one side (the back left), a bigger, paler swell with a stretch mark across it
    ctx.save();
    clipRing(ctx, PIZZA_R * 0.79);
    const g = ctx.createRadialGradient(C, C, PIZZA_R * 0.8, C, C, PIZZA_R);
    g.addColorStop(0, 'rgba(255,240,200,0.35)');
    g.addColorStop(0.5, 'rgba(230,170,90,0.1)');
    g.addColorStop(1, 'rgba(120,64,20,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // the second rise: a pale swell over a third of the rim
    const a0 = Math.PI * 0.95;
    const a1 = Math.PI * 1.55;
    for (let i = 0; i < 18; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / 18;
      const k = Math.sin(((i + 0.5) / 18) * Math.PI);
      cloud(ctx, C + Math.cos(a) * PIZZA_R * 0.9, C + Math.sin(a) * PIZZA_R * 0.9, 14 + 10 * k, '#fff4d8', 0.35 * k);
    }
    // its stretch mark
    ctx.strokeStyle = rgba('#fffaf0', 0.8);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.9, a0 + 0.2, a1 - 0.2);
    ctx.stroke();
    // the cracks, pale dough in them
    for (let i = 0; i < 12; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.86 + rand() * 0.08);
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const tx = Math.cos(a + Math.PI / 2) * 6;
      const ty = Math.sin(a + Math.PI / 2) * 6;
      ctx.strokeStyle = rgba('#7a4414', 0.6);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - tx, y - ty);
      ctx.quadraticCurveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2, x + tx, y + ty);
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff2d0', 0.9);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    // flour on the rim
    for (let i = 0; i < 90; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.82 + rand() * 0.16);
      ctx.fillStyle = rgba('#ffffff', 0.35 + rand() * 0.4);
      ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1.2, 1.2);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.93, Math.PI * 1.0, Math.PI * 1.5);
    ctx.strokeStyle = rgba('#fff6e0', 0.45);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  },
});

// ════════════════════════════ Cathedral Crust ════════════════════════════

/** The window's glass, as food: ruby (roast red pepper), gold (yellow pepper), emerald (green pepper), violet (red
 *  onion). */
const PANES = [GLASS[0], GLASS[2], GLASS[3], GLASS[4]];

registerTopping('roseWindow', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a rose window laid across the pie: twelve lancets of roast pepper round it (ruby and gold, alternating), six
    // trefoils inside them (emerald pepper and violet onion), a ring of olive between, all of it leaded with slivers
    // of black olive, glossy and lit as if the sun were coming through
    const R = PIZZA_R * 0.8;
    ctx.save();
    clipDisc(ctx, R);
    // the field between the panes: black olive tapenade, the window's leading, glossy
    const gs = ctx.createRadialGradient(C - 30, C - 30, 10, C, C, R);
    gs.addColorStop(0, '#3a2e30');
    gs.addColorStop(1, '#161014');
    ctx.fillStyle = gs;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    const pane = (path: () => void, col: string, lx: number, ly: number, rr: number) => {
      path();
      drop(ctx, 0.35, 1.2, 2);
      const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, rr);
      g.addColorStop(0, shade(col, 0.5));
      g.addColorStop(0.5, col);
      g.addColorStop(1, shade(col, -0.35));
      ctx.fillStyle = g;
      ctx.fill();
      // the roast's char, a little, on the pepper
      ctx.save();
      ctx.clip();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = rgba('#2a0a04', 0.2);
        ellipse(ctx, lx + (rand() - 0.5) * rr, ly + (rand() - 0.5) * rr * 0.6, 2.4, 1, rand() * 3);
        ctx.fill();
      }
      ctx.restore();
      // the olive leading
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#141016';
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba('#7a6a70', 0.6);
      ctx.stroke();
    };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU - Math.PI / 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const at = (u: number, v: number): [number, number] => [C + ca * u - sa * v, C + sa * u + ca * v];
      pane(
        () => {
          const p0 = at(R * 0.44, -R * 0.1);
          const p1 = at(R * 0.84, -R * 0.2);
          const tip = at(R * 1.04, 0);
          const p2 = at(R * 0.84, R * 0.2);
          const p3 = at(R * 0.44, R * 0.1);
          const m = at(R * 0.38, 0);
          ctx.beginPath();
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p1[0], p1[1]);
          ctx.quadraticCurveTo(tip[0], tip[1], p2[0], p2[1]);
          ctx.lineTo(p3[0], p3[1]);
          ctx.quadraticCurveTo(m[0], m[1], p0[0], p0[1]);
          ctx.closePath();
        },
        PANES[i % 2],
        at(R * 0.62, -R * 0.03)[0],
        at(R * 0.62, -R * 0.03)[1],
        R * 0.3,
      );
      // a lead bar across the lancet
      const l0 = at(R * 0.66, -R * 0.16);
      const l1 = at(R * 0.66, R * 0.16);
      ctx.strokeStyle = '#141016';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(l0[0], l0[1]);
      ctx.lineTo(l1[0], l1[1]);
      ctx.stroke();
    }
    // the ring of olive between the lancets and the trefoils
    ctx.beginPath();
    ctx.arc(C, C, R * 0.4, 0, TAU);
    ctx.strokeStyle = '#141016';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = rgba('#5a4a50', 0.7);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU - Math.PI / 2 + Math.PI / 6;
      const x = C + Math.cos(a) * R * 0.24;
      const y = C + Math.sin(a) * R * 0.24;
      pane(
        () => {
          ctx.beginPath();
          // a trefoil: three lobes
          for (let k = 0; k < 3; k++) {
            const b = a + (k / 3) * TAU;
            ctx.moveTo(x + Math.cos(b) * 7.5 + 9.5, y + Math.sin(b) * 7.5);
            ctx.arc(x + Math.cos(b) * 7.5, y + Math.sin(b) * 7.5, 9.5, 0, TAU);
          }
        },
        PANES[2 + (i % 2)],
        x - 4,
        y - 4,
        20,
      );
    }
    // the oculus at the heart: burrata, cream-white, glowing
    ctx.beginPath();
    ctx.arc(C, C, R * 0.11, 0, TAU);
    const go = ctx.createRadialGradient(C - 5, C - 5, 1, C, C, R * 0.12);
    go.addColorStop(0, '#ffffff');
    go.addColorStop(1, '#e8dcc0');
    ctx.fillStyle = go;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#141016';
    ctx.stroke();
    // the light coming through: brightest at the top left
    ctx.globalCompositeOperation = 'lighter';
    cloud(ctx, C - R * 0.4, C - R * 0.45, R * 0.8, '#fff0d0', 0.16);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },
});

piece('stoneMushroom', 2.4, {
  count: 6,
  minDist: 50,
  draw(ctx, rand) {
    // a slice of king oyster mushroom roasted stone-grey, its edges browned, scored across like dressed stone, a
    // speck of thyme
    const w = 9;
    const h = 6.5;
    ctx.beginPath();
    ctx.moveTo(-w, -h * 0.6);
    ctx.quadraticCurveTo(-w, -h, -w * 0.6, -h);
    ctx.lineTo(w * 0.6, -h);
    ctx.quadraticCurveTo(w, -h, w, -h * 0.6);
    ctx.lineTo(w * 0.9, h * 0.7);
    ctx.quadraticCurveTo(w * 0.9, h, w * 0.5, h);
    ctx.lineTo(-w * 0.5, h);
    ctx.quadraticCurveTo(-w * 0.9, h, -w * 0.9, h * 0.7);
    ctx.closePath();
    drop(ctx, 0.4, 1.4, 2.2);
    const g = ctx.createLinearGradient(-w, -h, w, h);
    g.addColorStop(0, '#ece4d2');
    g.addColorStop(0.45, '#c4b8a2');
    g.addColorStop(1, '#8a7c66');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    // the score marks, like a mason's tooling
    ctx.strokeStyle = rgba('#5a4a38', 0.5);
    ctx.lineWidth = 0.8;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 3 - 3, -h);
      ctx.lineTo(i * 3 + 3, h);
      ctx.stroke();
    }
    // its browned rim
    ctx.strokeStyle = rgba('#8a5a2a', 0.55);
    ctx.lineWidth = 2.4;
    ctx.strokeRect(-w, -h, w * 2, h * 2);
    ctx.restore();
    shine(ctx, -w * 0.4, -h * 0.5, 3.4, 1, 0.45, 0);
    if (rand() < 0.6) {
      ctx.fillStyle = '#4a7a2a';
      ctx.beginPath();
      ctx.ellipse((rand() - 0.5) * 8, (rand() - 0.5) * 6, 1.6, 0.7, rand() * 3, 0, TAU);
      ctx.fill();
    }
  },
});

piece('gargoyleWing', 2.2, {
  count: 2,
  minDist: 120,
  draw(ctx, rand) {
    // a gargoyle's wing of grilled artichoke leaves: pointed grey-green leaves fanned out like the stone wing's ribs,
    // their tips charred dark, the heart at the root glossy with oil
    const n = 5;
    for (let i = n - 1; i >= 0; i--) {
      const a = -Math.PI * 0.95 + (i / (n - 1)) * Math.PI * 0.6;
      const L = 15 - Math.abs(i - 1.5) * 1.6;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(L * 0.5, -4.6, L, 0);
      ctx.quadraticCurveTo(L * 0.5, 4.6, 0, 0);
      ctx.closePath();
      drop(ctx, 0.3, 1, 1.4);
      const g = ctx.createLinearGradient(0, 0, L, 0);
      g.addColorStop(0, '#d8d8a8');
      g.addColorStop(0.5, '#8a9a6a');
      g.addColorStop(0.85, '#5a6a46');
      g.addColorStop(1, '#2a2a1a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = INK;
      ctx.stroke();
      // its vein
      ctx.strokeStyle = rgba('#f0f0d0', 0.5);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.lineTo(L - 2, 0);
      ctx.stroke();
      ctx.restore();
    }
    // the heart at the root
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.4, 3.6, 0, 0, TAU);
    const gh = ctx.createRadialGradient(-1.2, -1.2, 0.3, 0, 0, 4.6);
    gh.addColorStop(0, '#fff2c0');
    gh.addColorStop(1, '#a8a060');
    ctx.fillStyle = gh;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = INK;
    ctx.stroke();
    shine(ctx, -1.4, -1.4, 1.6, 0.8, 0.7);
    void rand;
  },
});

registerTopping('stoneDust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // pecorino grated over it like stone dust: fine grey-white flecks, a few bigger crumbs
    ctx.save();
    clipDisc(ctx, PIZZA_R * 0.82);
    for (let i = 0; i < 300; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * PIZZA_R * 0.82;
      const big = rand() < 0.08;
      ctx.fillStyle = rgba(rand() < 0.5 ? '#f4eee0' : '#d8d0c0', 0.5 + rand() * 0.4);
      ctx.beginPath();
      ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, big ? 1.6 + rand() : 0.5 + rand() * 0.8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },
});

registerTopping('cathedralRim', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a crust baked grey as cathedral stone (charcoal and rye in the dough), carved round with a gothic arcade: pointed
    // arches between little columns, their shadows deep, the stone pale where the light catches it, lichen in a crack
    const r0 = PIZZA_R * 0.8;
    ctx.save();
    clipRing(ctx, r0);
    const g = ctx.createRadialGradient(C, C, r0, C, C, PIZZA_R);
    g.addColorStop(0, 'rgba(150,140,124,0.55)');
    g.addColorStop(0.5, 'rgba(176,166,148,0.6)');
    g.addColorStop(1, 'rgba(96,88,76,0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // the arcade: pointed arches round the rim
    const N = 28;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU;
      const a1 = ((i + 1) / N) * TAU;
      const am = (a0 + a1) / 2;
      const rIn = PIZZA_R * 0.84;
      const rTop = PIZZA_R * 0.95;
      const p = (a: number, r: number): [number, number] => [C + Math.cos(a) * r, C + Math.sin(a) * r];
      const b0 = p(a0 + 0.02, rIn);
      const b1 = p(a1 - 0.02, rIn);
      const s0 = p(a0 + 0.03, PIZZA_R * 0.9);
      const s1 = p(a1 - 0.03, PIZZA_R * 0.9);
      const top = p(am, rTop);
      ctx.beginPath();
      ctx.moveTo(b0[0], b0[1]);
      ctx.lineTo(s0[0], s0[1]);
      ctx.quadraticCurveTo(p(a0 + 0.04, rTop)[0], p(a0 + 0.04, rTop)[1], top[0], top[1]);
      ctx.quadraticCurveTo(p(a1 - 0.04, rTop)[0], p(a1 - 0.04, rTop)[1], s1[0], s1[1]);
      ctx.lineTo(b1[0], b1[1]);
      ctx.closePath();
      // (the arch's recess: darker away from the light at the top left)
      const lit = 0.5 + 0.5 * -Math.cos(am + 0.8);
      ctx.fillStyle = rgba('#2a2420', 0.28 + 0.2 * (1 - lit));
      ctx.fill();
      ctx.strokeStyle = rgba('#efe6d2', 0.35 + 0.35 * lit);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // the column between arches
      const c0 = p(a0, rIn);
      const c1 = p(a0, PIZZA_R * 0.96);
      ctx.strokeStyle = rgba('#e8e0cc', 0.5 + 0.3 * lit);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c0[0], c0[1]);
      ctx.lineTo(c1[0], c1[1]);
      ctx.stroke();
    }
    // weathering and lichen
    for (let i = 0; i < 70; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.82 + rand() * 0.16);
      ctx.fillStyle = rand() < 0.15 ? rgba('#9ab06a', 0.6) : rgba(rand() < 0.5 ? '#3a3228' : '#f4ecd8', 0.25);
      ctx.beginPath();
      ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 0.8 + rand() * 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.93, Math.PI * 1.0, Math.PI * 1.5);
    ctx.strokeStyle = rgba('#f4ecd8', 0.45);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  },
});
