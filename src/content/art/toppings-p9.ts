// Toppings for the pizza plan's Act 2 Legendaries (src/content/pizzas/p9.ts), drawn as the game's centrepieces:
// - Big Top Pie (King Honk): the pie as his big top seen from above (roasted red pepper and mozzarella stripes
//   running out from a gold star, bunting round its edge), his red clown noses (glossy cherry tomatoes), buttered
//   popcorn, confetti sprinkles and a crust ringed with marquee lights.
// - Sandcastle Citadel (Sandcastle Sam): golden toasted-crumb sand rippled by the tide, a moat of clams in a sea-green
//   broth, a ring of crenellated halloumi walls with four round towers and a keep in the middle, each flying Sam's red
//   pennant, samphire like beach grass, and a sandy crust.
// - Tidal Tiki (the Beach): a curling wave of surf breaking across a teriyaki glaze with its foam lacing the pie,
//   grilled pineapple wedges, two tiki masks carved from roast ham, shrimp, hibiscus flowers and a crust of toasted
//   coconut.
//
// Piece toppings draw one piece centred at the origin, already placed and turned by the caller. Overlays (count 1)
// reset the transform and paint across the 400×400 top. Every topping is wrapped in save/restore by the caller.

import { PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
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

/** Clip to a disc of the pie (r: the sauce's edge by default). */
function clipDisc(ctx: Ctx, r = PIZZA_R * 0.8): void {
  ctx.beginPath();
  ctx.arc(C, C, r, 0, TAU);
  ctx.clip();
}

/** Clip to the crust's ring (from r0 out to the edge). */
function clipRing(ctx: Ctx, r0: number, r1 = PIZZA_R): void {
  ctx.beginPath();
  ctx.arc(C, C, r1, 0, TAU);
  ctx.arc(C, C, r0, 0, TAU, true);
  ctx.clip('evenodd');
}

/** A little pennant on a stick at (x, y) (the stick's foot), flying to the right: Sam's red, with a lighter fold. */
function pennant(ctx: Ctx, x: number, y: number, h: number, col = '#e2322a', flip = 1): void {
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = Math.max(1.4, h * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.quadraticCurveTo(x + flip * h * 0.35, y - h * 0.98, x + flip * h * 0.7, y - h * 0.82);
  ctx.quadraticCurveTo(x + flip * h * 0.35, y - h * 0.72, x, y - h * 0.62);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.95);
  ctx.quadraticCurveTo(x + flip * h * 0.3, y - h * 0.92, x + flip * h * 0.5, y - h * 0.84);
  ctx.strokeStyle = rgba('#ffffff', 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  // the stick's knob
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(x, y - h - 1, Math.max(1.2, h * 0.07), 0, TAU);
  ctx.fill();
}

// ════════════════════════════ Big Top Pie ════════════════════════════

registerTopping('bigTopCanopy', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // King Honk's big top from above: twelve stripes running out from the king pole, roasted red pepper and torn
    // mozzarella in turn, each stripe bellied a little between its seams; bunting scalloped round the canopy's edge
    const R = PIZZA_R * 0.79;
    const n = 12;
    ctx.save();
    clipDisc(ctx);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU - Math.PI / 2;
      const a1 = ((i + 1) / n) * TAU - Math.PI / 2;
      const am = (a0 + a1) / 2;
      ctx.beginPath();
      ctx.moveTo(C, C);
      ctx.lineTo(C + Math.cos(a0) * R, C + Math.sin(a0) * R);
      ctx.arc(C, C, R, a0, a1);
      ctx.closePath();
      const red = i % 2 === 0;
      const lit = 0.5 + 0.5 * Math.cos(am + 2.3);
      const g = ctx.createLinearGradient(C, C, C + Math.cos(am) * R, C + Math.sin(am) * R);
      if (red) {
        g.addColorStop(0, shade('#e8382a', 0.1 * lit));
        g.addColorStop(0.55, shade('#d22a1e', -0.05 + 0.15 * lit));
        g.addColorStop(1, shade('#a81c14', 0.1 * lit));
      } else {
        g.addColorStop(0, '#fffaf0');
        g.addColorStop(0.6, shade('#f6eedc', -0.04 + 0.06 * lit));
        g.addColorStop(1, '#e4d6b8');
      }
      ctx.fillStyle = g;
      ctx.fill();
      // the stripe's belly: a soft shadow down one seam and a sheen down its middle
      ctx.save();
      ctx.clip();
      const sx = C + Math.cos(a0 + 0.04) * R * 0.5;
      const sy = C + Math.sin(a0 + 0.04) * R * 0.5;
      ctx.strokeStyle = rgba(red ? '#5a0a06' : '#8a7454', red ? 0.35 : 0.25);
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(C, C);
      ctx.quadraticCurveTo(sx, sy, C + Math.cos(a0) * R, C + Math.sin(a0) * R);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', red ? 0.28 : 0.45);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(C + Math.cos(am) * 20, C + Math.sin(am) * 20);
      ctx.lineTo(C + Math.cos(am + 0.02) * R * 0.92, C + Math.sin(am + 0.02) * R * 0.92);
      ctx.stroke();
      // texture: the pepper's char and its blistered skin, the mozzarella's torn pull
      for (let k = 0; k < 26; k++) {
        const u = 0.15 + rand() * 0.85;
        const aa = a0 + rand() * (a1 - a0);
        const x = C + Math.cos(aa) * R * u;
        const y = C + Math.sin(aa) * R * u;
        if (red) {
          ctx.fillStyle = rand() < 0.3 ? rgba('#2a0804', 0.5) : rgba('#ff8a6a', 0.35);
          blob(ctx, x, y, 1 + rand() * 2.4, 0.6, rand, 6);
          ctx.fill();
        } else {
          ctx.strokeStyle = rgba('#c8b490', 0.4);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(aa) * (3 + rand() * 5), y + Math.sin(aa) * (3 + rand() * 5));
          ctx.stroke();
        }
      }
      ctx.restore();
      // the seam
      ctx.strokeStyle = rgba('#5a1a10', 0.45);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(C, C);
      ctx.lineTo(C + Math.cos(a0) * R, C + Math.sin(a0) * R);
      ctx.stroke();
    }
    ctx.restore();
    // the bunting: scallops in yellow and blue round the canopy's edge, each with a dark edge and a lit lip
    const bR = R * 0.97;
    const m = 24;
    for (let i = 0; i < m; i++) {
      const a0 = (i / m) * TAU;
      const a1 = ((i + 1) / m) * TAU;
      const am = (a0 + a1) / 2;
      ctx.beginPath();
      ctx.moveTo(C + Math.cos(a0) * bR, C + Math.sin(a0) * bR);
      ctx.quadraticCurveTo(C + Math.cos(am) * (bR - 15), C + Math.sin(am) * (bR - 15), C + Math.cos(a1) * bR, C + Math.sin(a1) * bR);
      ctx.arc(C, C, bR, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#ffc72a' : '#2a7ae0';
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.6);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', 0.35);
      ctx.beginPath();
      ctx.arc(C + Math.cos(am) * (bR - 7), C + Math.sin(am) * (bR - 7), 1.3, 0, TAU);
      ctx.fill();
    }
    // the king pole's star: a yellow pepper star, glossy, with a red bobble
    ctx.save();
    ctx.translate(C, C);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2;
      const r = i % 2 ? 9 : 22;
      if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    drop(ctx, 0.4);
    const sg = ctx.createRadialGradient(-6, -8, 2, 0, 0, 22);
    sg.addColorStop(0, '#fff6b0');
    sg.addColorStop(0.5, '#ffd23f');
    sg.addColorStop(1, '#d89a10');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, TAU);
    ctx.fillStyle = '#e2322a';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.stroke();
    shine(ctx, -1.5, -1.8, 1.8, 1, 0.8);
    shine(ctx, -6, -9, 4, 1.8, 0.55, -0.9);
    ctx.restore();
  },
});

piece('clownNose', 2.3, {
  count: 6,
  minDist: 40,
  draw(ctx) {
    // King Honk's nose: a glossy cherry tomato, perfectly round and very red, a hard white shine and its reflection
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    drop(ctx, 0.45, 1.6, 2.6);
    const g = ctx.createRadialGradient(-3, -3.5, 0.5, 0, 0, 9.5);
    g.addColorStop(0, '#ff8a70');
    g.addColorStop(0.35, '#f2321e');
    g.addColorStop(0.8, '#b8140c');
    g.addColorStop(1, '#7a0a06');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // the stalk's star
    ctx.strokeStyle = '#3a7a22';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.lineTo(2 + Math.cos(a) * 2.6, -1 + Math.sin(a) * 2.6);
      ctx.stroke();
    }
    shine(ctx, -3.6, -4, 3, 1.8, 0.85, -0.7);
    shine(ctx, 4.5, 4.5, 1.8, 0.8, 0.3, -0.7);
  },
});

piece('popcorn', 1.9, {
  count: 10,
  minDist: 26,
  draw(ctx, rand) {
    // buttered popcorn: a cluster of puffed lobes, cream-white with butter-gold shadows, a split golden hull
    const lobes = 4 + Math.floor(rand() * 2);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * TAU + rand() * 0.6;
      pts.push([Math.cos(a) * 3.6, Math.sin(a) * 3.2, 3.6 + rand() * 1.6]);
    }
    ctx.beginPath();
    for (const [x, y, r] of pts) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    drop(ctx, 0.3, 1, 1.8);
    for (const [x, y, r] of pts) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.3, x, y, r);
      g.addColorStop(0, '#fffef6');
      g.addColorStop(0.6, '#fff2c8');
      g.addColorStop(1, '#e8bc5a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = rgba('#7a5418', 0.7);
      ctx.stroke();
    }
    // the hull
    ellipse(ctx, 0.5, 1, 2.4, 1.6, rand());
    ctx.fillStyle = '#d88a1a';
    ctx.fill();
    ctx.strokeStyle = rgba('#5a3008', 0.8);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // the butter's gloss
    shine(ctx, -2.4, -2.6, 1.6, 0.8, 0.6);
  },
});

registerTopping('confettiSprinkles', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the circus's confetti: sugar strips and dots in its colours scattered over the big top
    ctx.save();
    clipDisc(ctx, PIZZA_R * 0.76);
    const cols = ['#ffd23f', '#2a7ae0', '#3fc060', '#ff6ab0', '#ffffff', '#ff8a2a'];
    for (let i = 0; i < 110; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * PIZZA_R * 0.75;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * TAU);
      ctx.fillStyle = cols[i % cols.length];
      if (i % 3) {
        ctx.fillRect(-2.6, -0.9, 5.2, 1.8);
        ctx.strokeStyle = rgba(INK, 0.35);
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-2.6, -0.9, 5.2, 1.8);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 1.3, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  },
});

registerTopping('marqueeCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the crust brushed with butter till it shines, ringed with marquee lights: little warm bulbs in gold sockets, every
    // third one lit brighter, as round the circus's sign
    ctx.save();
    clipRing(ctx, PIZZA_R * 0.8);
    const g = ctx.createRadialGradient(C, C, PIZZA_R * 0.8, C, C, PIZZA_R);
    g.addColorStop(0, 'rgba(255,214,120,0)');
    g.addColorStop(0.5, 'rgba(255,214,120,0.3)');
    g.addColorStop(1, 'rgba(140,70,20,0.2)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    for (let i = 0; i < 22; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.84 + rand() * 0.12);
      ctx.fillStyle = rgba('#7a3a10', 0.35);
      blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 2 + rand() * 2.5, 0.6, rand, 6);
      ctx.fill();
    }
    ctx.restore();
    const r = PIZZA_R * 0.9;
    const n = 30;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const x = C + Math.cos(a) * r;
      const y = C + Math.sin(a) * r;
      const hot = i % 3 === 0;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, hot ? 9 : 6.5);
      halo.addColorStop(0, rgba('#fff6c0', hot ? 0.85 : 0.55));
      halo.addColorStop(1, rgba('#ffc040', 0));
      ctx.fillStyle = halo;
      ctx.fillRect(x - 9, y - 9, 18, 18);
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, TAU);
      ctx.fillStyle = '#b88418';
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, TAU);
      ctx.fillStyle = hot ? '#ffffff' : '#fff2a0';
      ctx.fill();
    }
  },
});

// ════════════════════════════ Sandcastle Citadel ════════════════════════════

/** Where the citadel's walls stand (their middle) and its moat, as a share of PIZZA_R. */
const WALL_R = 0.6;
const MOAT_R0 = 0.27;
const MOAT_R1 = 0.4;

registerTopping('citadelSand', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // golden sand of toasted breadcrumb and parmesan over the cream, rippled by the tide; inside the walls a moat of
    // sea-green broth (white wine, parsley and the sea) round the keep's mound
    ctx.save();
    clipDisc(ctx);
    const sand = ctx.createRadialGradient(C - 50, C - 50, 20, C, C, PIZZA_R);
    sand.addColorStop(0, '#d8a45c');
    sand.addColorStop(1, '#a8702e');
    ctx.fillStyle = sand;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // ripples left by the tide: curved bands of shadow and light
    for (let i = 0; i < 16; i++) {
      const y0 = 30 + i * 22 + rand() * 6;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (let x = 0; x <= PIZZA_SIZE; x += 20) ctx.lineTo(x, y0 + Math.sin(x * 0.03 + i * 0.7) * 6);
      ctx.strokeStyle = rgba('#9a6a2a', 0.22);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.translate(0, -2.5);
      ctx.strokeStyle = rgba('#fff2c8', 0.3);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.translate(0, 2.5);
    }
    // crumbs and parmesan grains
    for (let i = 0; i < 900; i++) {
      const v = rand();
      ctx.fillStyle = v < 0.35 ? rgba('#fff4d0', 0.7) : v < 0.7 ? rgba('#a8702a', 0.45) : rgba('#e0a850', 0.6);
      ctx.fillRect(rand() * PIZZA_SIZE, rand() * PIZZA_SIZE, 1 + rand() * 1.6, 1 + rand() * 1.4);
    }
    // the moat
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * MOAT_R1, 0, TAU);
    ctx.arc(C, C, PIZZA_R * MOAT_R0, 0, TAU, true);
    const sea = ctx.createRadialGradient(C, C, PIZZA_R * MOAT_R0, C, C, PIZZA_R * MOAT_R1);
    sea.addColorStop(0, '#3a9a8a');
    sea.addColorStop(0.5, '#5ac0a8');
    sea.addColorStop(1, '#2a7a6a');
    ctx.fillStyle = sea;
    ctx.fill('evenodd');
    ctx.save();
    ctx.clip('evenodd');
    // parsley flecks, ripples and the light on the water
    for (let i = 0; i < 70; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (MOAT_R0 + rand() * (MOAT_R1 - MOAT_R0));
      ctx.fillStyle = rand() < 0.5 ? rgba('#1a5a1a', 0.7) : rgba('#e8fff6', 0.5);
      ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1.6, 1.2);
    }
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(C, C, PIZZA_R * (MOAT_R0 + 0.03 + i * 0.03), Math.PI * (1.05 + i * 0.1), Math.PI * (1.45 + i * 0.1));
      ctx.strokeStyle = rgba('#e8fff6', 0.4);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
    // its banks: wet sand darker at the edge
    for (const r of [MOAT_R0, MOAT_R1]) {
      ctx.beginPath();
      ctx.arc(C, C, PIZZA_R * r, 0, TAU);
      ctx.strokeStyle = rgba('#7a5020', 0.6);
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    ctx.restore();
  },
});

registerTopping('citadelWalls', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the citadel from above: a ring of crenellated walls of toasted halloumi blocks, four round towers on it, and the
    // keep on its mound in the middle of the moat, each flying Sam's pennant. One light from the top left.
    const sandL = '#fff2cc';
    const sandM = '#f2cc84';
    const sandD = '#c08a44';
    const wr = PIZZA_R * WALL_R;
    const thick = 24;
    // the wall's shadow on the sand
    ctx.beginPath();
    ctx.arc(C + 3, C + 5, wr + thick / 2, 0, TAU);
    ctx.arc(C + 3, C + 5, wr - thick / 2, 0, TAU, true);
    ctx.fillStyle = rgba('#3a1c06', 0.28);
    ctx.fill('evenodd');
    // the wall walk
    ctx.beginPath();
    ctx.arc(C, C, wr + thick / 2, 0, TAU);
    ctx.arc(C, C, wr - thick / 2, 0, TAU, true);
    const walk = ctx.createRadialGradient(C - 40, C - 40, wr * 0.6, C, C, wr * 1.3);
    walk.addColorStop(0, sandL);
    walk.addColorStop(1, sandM);
    ctx.fillStyle = walk;
    ctx.fill('evenodd');
    // (raised: its inner face in shadow at the bottom right, lit at the top left)
    ctx.save();
    ctx.clip('evenodd');
    ctx.beginPath();
    ctx.arc(C - 3, C - 4, wr - thick / 2 + 4, 0, TAU);
    ctx.strokeStyle = rgba('#6a3c10', 0.35);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(C, C, wr + thick / 2, 0, TAU);
    ctx.arc(C, C, wr - thick / 2, 0, TAU, true);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // the blocks: grilled halloumi, each a little charred along its grill lines
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU;
      const a1 = ((i + 1) / n) * TAU;
      ctx.beginPath();
      ctx.moveTo(C + Math.cos(a0) * (wr - thick / 2), C + Math.sin(a0) * (wr - thick / 2));
      ctx.lineTo(C + Math.cos(a0) * (wr + thick / 2), C + Math.sin(a0) * (wr + thick / 2));
      ctx.strokeStyle = rgba('#7a4a18', 0.55);
      ctx.lineWidth = 0.9;
      ctx.stroke();
      if (i % 2 === 0) {
        // a merlon on the outer edge: a raised block, lit on its top-left face
        const am = (a0 + a1) / 2;
        const lit = 0.5 + 0.5 * Math.cos(am + 2.3);
        ctx.beginPath();
        ctx.arc(C, C, wr + thick / 2, a0 + 0.01, a1 - 0.01);
        ctx.arc(C, C, wr + thick / 2 - 9, a1 - 0.01, a0 + 0.01, true);
        ctx.closePath();
        ctx.fillStyle = shade(sandM, -0.12 + 0.28 * lit);
        ctx.fill();
        ctx.strokeStyle = rgba('#5a3410', 0.8);
        ctx.lineWidth = 1;
        ctx.stroke();
        // its grill mark
        ctx.beginPath();
        ctx.moveTo(C + Math.cos(am - 0.03) * (wr + thick / 2 - 1), C + Math.sin(am - 0.03) * (wr + thick / 2 - 1));
        ctx.lineTo(C + Math.cos(am + 0.03) * (wr + thick / 2 - 5), C + Math.sin(am + 0.03) * (wr + thick / 2 - 5));
        ctx.strokeStyle = rgba('#5a2e0c', 0.6);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    // a gate over the moat at the front, with its causeway
    const ga = Math.PI / 2;
    const gx = C + Math.cos(ga) * wr;
    const gy = C + Math.sin(ga) * wr;
    ctx.fillStyle = '#5a3412';
    ctx.beginPath();
    ctx.ellipse(gx, gy, 12, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba('#e4b468', 0.9);
    ctx.fillRect(C - 6, C + PIZZA_R * MOAT_R0, 12, PIZZA_R * (WALL_R - MOAT_R0) - thick / 2);
    ctx.strokeStyle = rgba('#5a3410', 0.7);
    ctx.lineWidth = 1;
    ctx.strokeRect(C - 6, C + PIZZA_R * MOAT_R0, 12, PIZZA_R * (WALL_R - MOAT_R0) - thick / 2);
    // the four round towers, each a drum of halloumi with a ring of merlons and a pennant
    const tower = (x: number, y: number, r: number, flag: boolean) => {
      ctx.beginPath();
      ctx.arc(x + 3, y + 5, r, 0, TAU);
      ctx.fillStyle = rgba('#3a1c06', 0.32);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
      g.addColorStop(0, sandL);
      g.addColorStop(0.7, sandM);
      g.addColorStop(1, sandD);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = INK;
      ctx.stroke();
      // the merlons round its top
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        const lit = 0.5 + 0.5 * Math.cos(a + 2.3);
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78, r * 0.2, 0, TAU);
        ctx.fillStyle = shade(sandM, -0.1 + 0.3 * lit);
        ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = rgba('#5a3410', 0.8);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, r * 0.36, 0, TAU);
      ctx.fillStyle = shade(sandM, -0.12);
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = rgba('#7a4a18', 0.6);
      ctx.stroke();
      // crumbs on it
      for (let k = 0; k < 14; k++) {
        ctx.fillStyle = rand() < 0.5 ? rgba('#fff0c8', 0.7) : rgba('#7a4a18', 0.5);
        ctx.fillRect(x + (rand() - 0.5) * r * 1.4, y + (rand() - 0.5) * r * 1.4, 1.2, 1.2);
      }
      if (flag) pennant(ctx, x, y - 1, r * 1.5, '#e2322a');
    };
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      tower(C + Math.cos(a) * wr, C + Math.sin(a) * wr, 23, true);
    }
    // the keep on its mound: a bigger drum, its own merlons, and the tallest pennant in Sam's colours
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * MOAT_R0, 0, TAU);
    ctx.fillStyle = rgba('#e8bc70', 0.6);
    ctx.fill();
    tower(C, C, 32, false);
    pennant(ctx, C + 2, C - 4, 58, '#e2322a');
    pennant(ctx, C - 12, C + 6, 40, '#2a7ae0', -1);
  },
});

piece('vongole', 1.9, {
  count: 7,
  minDist: 34,
  draw(ctx, rand) {
    // a clam opened in the broth: its two ribbed shells, cream and grey-violet, the sweet meat in the hinge
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.rotate(s * 0.55);
      ctx.translate(s * 3.2, 0);
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-8, 4, -9, -6, 0, -8.5);
      ctx.bezierCurveTo(9, -6, 8, 4, 0, 6);
      ctx.closePath();
      drop(ctx, 0.3, 1, 1.8);
      const g = ctx.createLinearGradient(0, -8, 0, 6);
      g.addColorStop(0, '#f4ecdc');
      g.addColorStop(0.6, '#c8b8b0');
      g.addColorStop(1, '#7a6a80');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = INK;
      ctx.stroke();
      // its ribs and growth rings
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(k * 3, -6.5);
        ctx.strokeStyle = rgba('#6a5a70', 0.4);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 5, 7.5, Math.PI * 1.2, Math.PI * 1.8);
      ctx.strokeStyle = rgba('#5a4a60', 0.5);
      ctx.stroke();
      shine(ctx, -2, -4, 2.2, 1, 0.55);
      ctx.restore();
    }
    // the meat
    ellipse(ctx, 0, 3, 3.6, 2.4, rand() * 0.4);
    ctx.fillStyle = '#f2c088';
    ctx.fill();
    ctx.strokeStyle = rgba('#8a5020', 0.8);
    ctx.lineWidth = 0.7;
    ctx.stroke();
  },
});

piece('samphire', 1.7, {
  count: 8,
  minDist: 22,
  draw(ctx, rand) {
    // samphire, the sea's asparagus: jointed green stems branching like beach grass, glossy with butter
    const stem = (x0: number, y0: number, a: number, len: number, depth: number) => {
      const x1 = x0 + Math.cos(a) * len;
      const y1 = y0 + Math.sin(a) * len;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = '#1e5a1a';
      ctx.lineWidth = 3.4 - depth;
      ctx.stroke();
      ctx.strokeStyle = '#6cbc3a';
      ctx.lineWidth = 2.2 - depth * 0.6;
      ctx.stroke();
      // its joints
      for (let k = 1; k < 3; k++) {
        const u = k / 3;
        ctx.fillStyle = '#2e7a22';
        ctx.beginPath();
        ctx.arc(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 1.2, 0, TAU);
        ctx.fill();
      }
      if (depth < 2) {
        stem(x1, y1, a - 0.5 - rand() * 0.3, len * 0.65, depth + 1);
        stem(x1, y1, a + 0.4 + rand() * 0.3, len * 0.6, depth + 1);
      }
    };
    stem(0, 6, -Math.PI / 2 + (rand() - 0.5) * 0.6, 7, 0);
    shine(ctx, -1, -2, 1.4, 0.6, 0.5);
  },
});

registerTopping('sandCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the crust rolled in golden crumb like sand, with a few shells pressed into it
    ctx.save();
    clipRing(ctx, PIZZA_R * 0.8);
    for (let i = 0; i < 520; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.8 + rand() * 0.2);
      const v = rand();
      ctx.fillStyle = v < 0.4 ? rgba('#ffeec0', 0.75) : v < 0.75 ? rgba('#c88a3a', 0.6) : rgba('#8a5a20', 0.5);
      ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1 + rand() * 1.4, 1 + rand());
    }
    ctx.restore();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + rand() * 0.4;
      const x = C + Math.cos(a) * PIZZA_R * 0.9;
      const y = C + Math.sin(a) * PIZZA_R * 0.9;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 3.5);
      ctx.bezierCurveTo(-5, 2, -5, -4, 0, -5);
      ctx.bezierCurveTo(5, -4, 5, 2, 0, 3.5);
      ctx.fillStyle = i % 2 ? '#fff0e8' : '#ffc8b8';
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.7);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.lineTo(k * 2.4, -3.8);
        ctx.strokeStyle = rgba('#a87868', 0.6);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();
    }
  },
});

// ════════════════════════════ Tidal Tiki ════════════════════════════

registerTopping('tikiSurf', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a wave breaking across the pie from its back left: a sea-blue band of spirulina coconut cream curling over at
    // its crest, its foam lacing the teriyaki glaze in front of it
    ctx.save();
    clipDisc(ctx);
    // the glaze first: mango and teriyaki, amber and glossy over the bbq base, with its lacquer's light
    const lac = ctx.createRadialGradient(C - 60, C + 10, 10, C, C + 40, PIZZA_R);
    lac.addColorStop(0, rgba('#ffb040', 0.75));
    lac.addColorStop(0.6, rgba('#e07a20', 0.6));
    lac.addColorStop(1, rgba('#8a3a0c', 0.5));
    ctx.fillStyle = lac;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rgba(i % 3 ? '#ffe0a0' : '#7a2a08', i % 3 ? 0.3 : 0.25);
      blob(ctx, 40 + rand() * 320, 180 + rand() * 200, 3 + rand() * 9, 0.6, rand, 7);
      ctx.fill();
    }
    // the wave's body: from the back edge across to its crest line
    const crest = (x: number) => 120 + Math.sin((x - 30) * 0.012) * 40 + (x - 200) * 0.18;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(PIZZA_SIZE, 0);
    for (let x = PIZZA_SIZE; x >= 0; x -= 8) ctx.lineTo(x, crest(x));
    ctx.closePath();
    const sea = ctx.createLinearGradient(0, 0, 0, 200);
    sea.addColorStop(0, '#0e5a8a');
    sea.addColorStop(0.5, '#1a9ab8');
    sea.addColorStop(1, '#5ad8d8');
    ctx.fillStyle = sea;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // the swell's lines and its light
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      for (let x = 0; x <= PIZZA_SIZE; x += 10) {
        const y = crest(x) - 14 - i * 13 + Math.sin(x * 0.05 + i) * 3;
        if (x) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = rgba(i % 2 ? '#bff6ff' : '#0a3a6a', i % 2 ? 0.35 : 0.25);
      ctx.lineWidth = i % 2 ? 1.6 : 2.4;
      ctx.stroke();
    }
    ctx.restore();
    // the curl: a darker tube under the crest and the lip of white water rolling over
    ctx.beginPath();
    for (let x = 0; x <= PIZZA_SIZE; x += 8) {
      const y = crest(x) - 4;
      if (x) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = rgba('#063a5a', 0.55);
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.beginPath();
    for (let x = 0; x <= PIZZA_SIZE; x += 8) {
      const y = crest(x) + 2;
      if (x) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = '#f4ffff';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = rgba('#8ad8e8', 0.8);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // its foam: curls and bubbles breaking off the lip, then lace across the glaze in front
    for (let x = 6; x < PIZZA_SIZE; x += 16 + rand() * 10) {
      const y = crest(x) + 3;
      ctx.beginPath();
      ctx.arc(x, y + 2, 5 + rand() * 4, Math.PI * 0.1, Math.PI * 1.2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    for (let i = 0; i < 90; i++) {
      const x = rand() * PIZZA_SIZE;
      const y = crest(x) + 6 + Math.pow(rand(), 1.6) * 90;
      const r = 0.8 + rand() * 2.4 * (1 - (y - crest(x)) / 110);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.6, r), 0, TAU);
      ctx.fillStyle = rgba('#ffffff', 0.55 + rand() * 0.4);
      ctx.fill();
    }
    // the lace: thin rings of foam on the glaze
    for (let i = 0; i < 14; i++) {
      const x = 40 + rand() * 320;
      const y = crest(x) + 22 + rand() * 60;
      ctx.beginPath();
      ellipse(ctx, x, y, 8 + rand() * 12, 3 + rand() * 4, rand() * 0.4);
      ctx.strokeStyle = rgba('#ffffff', 0.45);
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.restore();
  },
});

piece('grilledPineapple', 2.1, {
  count: 8,
  minDist: 32,
  draw(ctx, rand) {
    // a chunk of grilled pineapple cut from its ring: golden flesh between the pale core edge and the rind's edge, its
    // fibres running out, a charred grill bar across it, glossy with juice
    const R = 12;
    const r = 4.5;
    const h = 0.62;
    const ring = () => {
      ctx.beginPath();
      ctx.arc(0, 6, R, -Math.PI / 2 - h, -Math.PI / 2 + h);
      ctx.arc(0, 6, r, -Math.PI / 2 + h, -Math.PI / 2 - h, true);
      ctx.closePath();
    };
    ring();
    drop(ctx, 0.35);
    const g = ctx.createRadialGradient(0, 6, r, 0, 6, R);
    g.addColorStop(0, '#fff6c0');
    g.addColorStop(0.45, '#ffd84a');
    g.addColorStop(1, '#f0a818');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ring();
    ctx.clip();
    for (let k = -5; k <= 5; k++) {
      const a = -Math.PI / 2 + (k / 5) * h;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r, 6 + Math.sin(a) * r);
      ctx.lineTo(Math.cos(a) * R, 6 + Math.sin(a) * R);
      ctx.strokeStyle = rgba('#d88a10', 0.4);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    ctx.save();
    ctx.rotate(-0.3 + rand() * 0.2);
    ctx.fillStyle = rgba('#c86a10', 0.5);
    ctx.fillRect(-14, -3.4, 28, 3.6);
    ctx.fillStyle = rgba('#4a2008', 0.72);
    ctx.fillRect(-14, -2.6, 28, 1.6);
    ctx.restore();
    // the rind's edge: a band of yellow-brown
    ctx.beginPath();
    ctx.arc(0, 6, R - 0.8, -Math.PI / 2 - h, -Math.PI / 2 + h);
    ctx.strokeStyle = '#c88a20';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ring();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    shine(ctx, -2.5, -3, 2.6, 1, 0.55, -0.2);
  },
});

piece('tikiMask', 3.1, {
  count: 3,
  minDist: 70,
  draw(ctx) {
    // (a face: always upright, never on its side)
    const m = ctx.getTransform();
    const k = Math.hypot(m.a, m.b);
    ctx.setTransform(k, 0, 0, k, m.e, m.f);
    // a tiki mask carved in a thick slice of roast ham: a tall oval face, a heavy brow, round staring eyes, a broad
    // nose and a wide grimace full of teeth, its carving lines charred, glazed and glossy
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.bezierCurveTo(9, -14, 11, -6, 11, 2);
    ctx.bezierCurveTo(11, 10, 6, 15, 0, 15);
    ctx.bezierCurveTo(-6, 15, -11, 10, -11, 2);
    ctx.bezierCurveTo(-11, -6, -9, -14, 0, -14);
    ctx.closePath();
    drop(ctx, 0.45, 1.8, 2.6);
    const g = ctx.createLinearGradient(-11, -14, 11, 15);
    g.addColorStop(0, '#f2a088');
    g.addColorStop(0.5, '#d8705a');
    g.addColorStop(1, '#a84a36');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // the fat's rim
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba('#fff0e0', 0.65);
    ctx.stroke();
    ctx.restore();
    const carve = (draw: () => void, w = 1.6) => {
      ctx.beginPath();
      draw();
      ctx.strokeStyle = '#4a1a0a';
      ctx.lineWidth = w;
      ctx.stroke();
    };
    // the brow
    carve(() => {
      ctx.moveTo(-8, -7);
      ctx.quadraticCurveTo(-4, -11, 0, -7.5);
      ctx.quadraticCurveTo(4, -11, 8, -7);
    }, 2);
    // the eyes: round, with a carved ring and a dark pupil
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 4.4, -4, 2.8, 0, TAU);
      ctx.fillStyle = '#fff2dc';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#4a1a0a';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 4.4, -4, 1.2, 0, TAU);
      ctx.fillStyle = '#2a0a04';
      ctx.fill();
    }
    // the nose
    carve(() => {
      ctx.moveTo(-2.5, -3);
      ctx.lineTo(-3.8, 3);
      ctx.quadraticCurveTo(0, 5, 3.8, 3);
      ctx.lineTo(2.5, -3);
    }, 1.3);
    // the grimace and its teeth
    ctx.beginPath();
    ctx.moveTo(-8, 7);
    ctx.quadraticCurveTo(0, 13, 8, 7);
    ctx.quadraticCurveTo(0, 9, -8, 7);
    ctx.closePath();
    ctx.fillStyle = '#3a0c04';
    ctx.fill();
    for (let k = -3; k <= 3; k++) {
      ctx.fillStyle = '#fff4e0';
      ctx.fillRect(k * 2 - 0.7, 7.6 + Math.abs(k) * -0.2, 1.4, 2);
    }
    carve(() => {
      ctx.moveTo(-8.5, 7);
      ctx.quadraticCurveTo(0, 14, 8.5, 7);
    }, 1.2);
    // the glaze's gloss
    shine(ctx, -5, -10, 3.6, 1.4, 0.45, -0.4);
    shine(ctx, 6, 4, 1.4, 3, 0.25, 0.2);
  },
});

piece('hibiscus', 2.1, {
  count: 4,
  minDist: 50,
  draw(ctx, rand) {
    // an edible hibiscus flower: five ruffled pink-red petals with a dark heart and its long yellow stamen
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + rand() * 0.2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(4, -2, 11, -6, 12, 0);
      ctx.bezierCurveTo(11, 6, 4, 2, 0, 0);
      ctx.closePath();
      if (i === 0) drop(ctx, 0.3);
      const g = ctx.createLinearGradient(0, 0, 12, 0);
      g.addColorStop(0, '#8a0a2a');
      g.addColorStop(0.35, '#e8306a');
      g.addColorStop(1, '#ff8ab0');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = rgba(INK, 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(10, 0);
      ctx.strokeStyle = rgba('#ffd0e0', 0.5);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, TAU);
    ctx.fillStyle = '#5a0418';
    ctx.fill();
    // the stamen
    const sa = rand() * TAU;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sa) * 9, Math.sin(sa) * 9);
    ctx.strokeStyle = '#ffe0a0';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = '#ffc83a';
      ctx.beginPath();
      ctx.arc(Math.cos(sa) * (6 + k * 0.8) + (rand() - 0.5) * 2, Math.sin(sa) * (6 + k * 0.8) + (rand() - 0.5) * 2, 0.9, 0, TAU);
      ctx.fill();
    }
  },
});

registerTopping('coconutCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the crust brushed with teriyaki and rolled in toasted coconut: curls of it white to golden brown, and a lacquer
    ctx.save();
    clipRing(ctx, PIZZA_R * 0.8);
    const g = ctx.createRadialGradient(C, C, PIZZA_R * 0.8, C, C, PIZZA_R);
    g.addColorStop(0, 'rgba(120,50,10,0)');
    g.addColorStop(0.5, 'rgba(150,70,20,0.25)');
    g.addColorStop(1, 'rgba(90,30,6,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    for (let i = 0; i < 160; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.82 + rand() * 0.16);
      ctx.save();
      ctx.translate(C + Math.cos(a) * d, C + Math.sin(a) * d);
      ctx.rotate(rand() * TAU);
      const v = rand();
      ctx.fillStyle = v < 0.45 ? '#fffaf0' : v < 0.8 ? '#f2d4a0' : '#c88a40';
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6 + rand() * 1.6, 0.9, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.93, Math.PI * 1.0, Math.PI * 1.55);
    ctx.strokeStyle = rgba('#fff4d8', 0.5);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  },
});
