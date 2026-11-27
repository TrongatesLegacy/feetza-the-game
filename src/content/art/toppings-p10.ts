// Toppings for the pizza plan's Act 3 Legendaries (src/content/pizzas/p10.ts), drawn as the game's centrepieces:
// - Cosmic Crouton Supreme (the Cosmic Croc): a squid-ink sauce swirled into a nebula of the Croc's blues and cyans
//   with violet and magenta clouds and a field of stars; pepperoni slices as little planets (banded, cratered, one
//   ringed); toasted crouton cubes lit violet by the nebula; parmesan streaming across it like the Croc's rocket
//   trail; a crust banded in the Croc's blue foam with his clog's vent holes.
// - Roar Roast (the Alpine Lodge's hearth): a glossy roast gravy, slices of rosy roast beef with a peppercorn crust,
//   crisp roast potatoes, lingonberries, rosemary, and a crust charred by the fire with embers still glowing in it.
// - Black Olive Hole (Space): the pie as an accretion disc, sauce and mozzarella wound into a spiral that runs white
//   hot at the middle; olive rings stretched into arcs as they're drawn in; star dust; one huge glossy black olive at
//   the centre with its photon ring; a dark-baked crust glittering with sugar stars.
//
// Piece toppings draw one piece centred at the origin, already placed and turned by the caller. Overlays (count 1)
// reset the transform and paint across the 400×400 top. Every topping is wrapped in save/restore by the caller.

import { PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
import { CROUTON_FRAMES, drawCroutonFrame } from '../../art/perkPropsLegend3';
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

/** A soft round glow (additive by the caller's composite). */
function cloud(ctx: Ctx, x: number, y: number, r: number, col: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.5, rgba(col, a * 0.45));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A four-point twinkle. */
function twinkle(ctx: Ctx, x: number, y: number, r: number, a = 1): void {
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// ════════════════════════════ Cosmic Crouton Supreme ════════════════════════════

registerTopping('nebulaSauce', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the squid ink swirled into a nebula: deep blue-black, clouds of the Croc's blue and cyan, violet and a magenta
    // heart, dark dust lanes through them, and a field of stars
    const R = PIZZA_R * 0.8;
    ctx.save();
    clipDisc(ctx, R);
    const bg = ctx.createRadialGradient(C - 20, C - 24, 10, C, C, R);
    bg.addColorStop(0, '#1a1640');
    bg.addColorStop(0.6, '#0e0a26');
    bg.addColorStop(1, '#06040f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.globalCompositeOperation = 'lighter';
    // the great cloud: an S of colour across the pie
    const arm = (t: number): [number, number] => [C + Math.cos(t * 2.6 + 0.6) * R * 0.55 * (0.4 + t * 0.6), C + Math.sin(t * 2.6 + 0.6) * R * 0.45 * (0.4 + t * 0.6) - 6];
    for (let i = 0; i < 46; i++) {
      const t = rand();
      const [x, y] = arm(t);
      const col = t < 0.25 ? '#ff5ad0' : t < 0.55 ? '#9a6aff' : t < 0.8 ? '#3a6aff' : '#7df9ff';
      cloud(ctx, x + (rand() - 0.5) * 50, y + (rand() - 0.5) * 40, 26 + rand() * 40, col, 0.08 + rand() * 0.1);
    }
    for (let i = 0; i < 26; i++) {
      const t = rand();
      const [x, y] = arm(t);
      cloud(ctx, C * 2 - x + (rand() - 0.5) * 60, C * 2 - y + (rand() - 0.5) * 50, 20 + rand() * 34, rand() < 0.5 ? '#2b3d8f' : '#5a3ab0', 0.1 + rand() * 0.08);
    }
    // the bright heart
    cloud(ctx, C - 18, C - 10, 42, '#ffd0f0', 0.18);
    ctx.globalCompositeOperation = 'source-over';
    // dust lanes: soft dark veils along the cloud's arm (layered thin, so they read as dust, not a stroke)
    for (let i = 0; i < 2; i++) {
      const t0 = 0.2 + i * 0.4;
      for (let w = 0; w < 4; w++) {
        ctx.strokeStyle = rgba('#03020a', 0.07);
        ctx.lineWidth = 6 + w * 5;
        ctx.beginPath();
        for (let k = 0; k <= 14; k++) {
          const [x, y] = arm(Math.min(1, t0 + k * 0.018));
          if (k) ctx.lineTo(x + 4, y + 6);
          else ctx.moveTo(x + 4, y + 6);
        }
        ctx.stroke();
      }
    }
    // the stars: a dust of tiny ones, some brighter, a few twinkling
    for (let i = 0; i < 160; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * R;
      const b = rand();
      ctx.fillStyle = rgba(b < 0.15 ? '#bff6ff' : b < 0.25 ? '#ffe2f6' : '#ffffff', 0.35 + rand() * 0.6);
      ctx.beginPath();
      ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, b < 0.9 ? 0.6 + rand() * 0.6 : 1.3, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 9; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * R * 0.92;
      twinkle(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 3 + rand() * 3, 0.9);
    }
    // the sauce's gloss: a soft sheen across its top left
    const sh = ctx.createLinearGradient(C - R, C - R, C, C);
    sh.addColorStop(0, 'rgba(255,255,255,0.16)');
    sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.restore();
  },
});

piece('planetPepperoni', 1.9, {
  count: 5,
  minDist: 46,
  draw(ctx, rand) {
    // pepperoni as a little planet: a cupped slice banded like a gas giant (its reds and oranges), the night side in
    // shadow, a crater or two of rendered fat, and on one in three a ring of parmesan round it
    const r = 10.5;
    const ringed = rand() < 0.38;
    const tilt = (rand() - 0.5) * 0.8;
    if (ringed) {
      // the back half of the ring
      ctx.save();
      ctx.rotate(tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.75, r * 0.5, 0, Math.PI, TAU);
      ctx.strokeStyle = rgba('#f6e6b0', 0.85);
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    drop(ctx, 0.5, 1.6, 2.6);
    const g = ctx.createRadialGradient(-3.5, -4, 1, 0, 0, r);
    g.addColorStop(0, '#ff7a52');
    g.addColorStop(0.55, '#d0341e');
    g.addColorStop(1, '#7a140a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // its bands
    ctx.rotate(tilt);
    for (let b = -3; b <= 3; b++) {
      ctx.fillStyle = b % 2 ? rgba('#ffb070', 0.28) : rgba('#5a0a04', 0.22);
      ctx.fillRect(-r, b * 3 - 1.2, r * 2, 2.4 + rand() * 1.2);
    }
    ctx.rotate(-tilt);
    // fat craters
    for (let i = 0; i < 3; i++) {
      const x = (rand() - 0.5) * r * 1.2;
      const y = (rand() - 0.5) * r * 1.2;
      ctx.fillStyle = rgba('#ffd0a0', 0.5);
      ellipse(ctx, x, y, 1.6 + rand() * 1.2, 1.2 + rand());
      ctx.fill();
      ctx.strokeStyle = rgba('#5a0a04', 0.4);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    // the night side
    const ns = ctx.createLinearGradient(-r, -r, r, r);
    ns.addColorStop(0.45, 'rgba(10,4,20,0)');
    ns.addColorStop(1, 'rgba(10,4,30,0.6)');
    ctx.fillStyle = ns;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    // the cupped rim's grease catching the light
    ctx.beginPath();
    ctx.arc(0, 0, r - 1.6, Math.PI * 1.05, Math.PI * 1.6);
    ctx.strokeStyle = rgba('#ffd8b8', 0.7);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    shine(ctx, -3.6, -4.2, 2.6, 1.3, 0.55);
    if (ringed) {
      // the front half of the ring
      ctx.save();
      ctx.rotate(tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.75, r * 0.5, 0, 0, Math.PI);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.8;
      ctx.stroke();
      ctx.strokeStyle = '#f6e6b0';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.6);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
  },
});

/** The crouton's frames (the same toasted cube as the crouton moon), drawn once. */
const croutons: HTMLCanvasElement[] = [];
function croutonArt(i: number): HTMLCanvasElement {
  return (croutons[i] ??= drawCroutonFrame(i));
}

piece('croutonCube', 1, {
  count: 6,
  minDist: 50,
  draw(ctx, rand) {
    // a toasted crouton cube, turned any which way, the nebula's violet light catching its shadowed side
    const img = croutonArt(Math.floor(rand() * CROUTON_FRAMES));
    const s = 50 + rand() * 8;
    ctx.globalCompositeOperation = 'lighter';
    cloud(ctx, 4, 2, s * 0.7, rand() < 0.5 ? '#9a8cff' : '#4ad8ff', 0.28);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(img, -s / 2, -s / 2 - 2, s, s);
  },
});

registerTopping('cosmicParmesan', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // grated parmesan streaming across the pie in a long arc, like the Cosmic Croc's rocket trail: thick and bright at
    // its head, thinning and scattering into its tail; a few flakes sprinkled elsewhere
    const R = PIZZA_R * 0.76;
    ctx.save();
    clipDisc(ctx, PIZZA_R * 0.79);
    const a0 = Math.PI * 0.95;
    const a1 = Math.PI * 1.95;
    for (let i = 0; i < 260; i++) {
      const u = Math.pow(rand(), 0.7);
      const a = a0 + (a1 - a0) * u;
      const rr = R * (0.72 - 0.08 * Math.sin(u * Math.PI)) + (rand() - 0.5) * (4 + 26 * (1 - u));
      const x = C + Math.cos(a) * rr;
      const y = C + Math.sin(a) * rr * 0.92 + 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + (rand() - 0.5) * 0.8);
      const len = 1.6 + rand() * 3 * (0.4 + u);
      ctx.fillStyle = rand() < 0.3 ? '#fff6d8' : rand() < 0.6 ? '#f6e2a8' : '#e2c47a';
      ctx.globalAlpha = 0.55 + 0.45 * u;
      ctx.fillRect(-len / 2, -0.7, len, 1.4);
      ctx.restore();
    }
    // its head: a glow of cheese and a twinkle
    ctx.globalCompositeOperation = 'lighter';
    const hx = C + Math.cos(a1) * R * 0.72;
    const hy = C + Math.sin(a1) * R * 0.72 * 0.92 + 8;
    cloud(ctx, hx, hy, 16, '#fff0c0', 0.45);
    ctx.globalCompositeOperation = 'source-over';
    twinkle(ctx, hx, hy, 6, 0.95);
    for (let i = 0; i < 40; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * R;
      ctx.fillStyle = rgba('#f6e2a8', 0.8);
      ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1.4 + rand() * 1.6, 1);
    }
    ctx.restore();
  },
});

registerTopping('crocCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the crust banded in the Cosmic Croc's blue foam: a glossy band round its middle with his clog's round vent holes
    // showing the baked dough through, a cyan strap line along its inner edge
    const r0 = PIZZA_R * 0.84;
    const r1 = PIZZA_R * 0.95;
    ctx.save();
    clipRing(ctx, r0, r1);
    const g = ctx.createRadialGradient(C - 30, C - 40, r0 * 0.9, C, C, r1);
    g.addColorStop(0, '#4a64d8');
    g.addColorStop(0.6, '#2b3d8f');
    g.addColorStop(1, '#16205a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // the foam's soft grain
    for (let i = 0; i < 120; i++) {
      const a = rand() * TAU;
      const d = r0 + rand() * (r1 - r0);
      ctx.fillStyle = rgba(rand() < 0.5 ? '#6a84ff' : '#101848', 0.25);
      ctx.beginPath();
      ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 0.8 + rand(), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // the vent holes: baked dough showing through, each with a shadowed lip
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.07;
      const d = (r0 + r1) / 2;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, TAU);
      ctx.fillStyle = '#c88a40';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#0c1030';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3.4, Math.PI * 1.1, Math.PI * 1.7);
      ctx.strokeStyle = rgba('#000000', 0.45);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // its edges and the cyan strap line, and the foam's gloss across the top left
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba(INK, 0.75);
    ctx.beginPath();
    ctx.arc(C, C, r0, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(C, C, r1, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba('#7df9ff', 0.85);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(C, C, r0 + 2, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.5);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(C, C, (r0 + r1) / 2 + 4, Math.PI * 1.05, Math.PI * 1.45);
    ctx.stroke();
  },
});

// ════════════════════════════ Roar Roast ════════════════════════════

registerTopping('roastGravy', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a rich roast gravy over the base: deep mahogany and glossy, pooled darker at its edges, lighter where it runs
    // thin over the dough, beads of fat on it, and the hearth's light lying along it in a long warm sheen
    const R = PIZZA_R * 0.8;
    ctx.save();
    clipDisc(ctx, R);
    const g = ctx.createRadialGradient(C - 30, C - 34, 8, C, C, R);
    g.addColorStop(0, '#8a3e16');
    g.addColorStop(0.5, '#5e2408');
    g.addColorStop(0.85, '#3e1404');
    g.addColorStop(1, '#2a0c02');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // where it pooled and where it's thin: soft blots
    for (let i = 0; i < 26; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * R * 0.9;
      const thin = rand() < 0.5;
      cloud(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 14 + rand() * 22, thin ? '#a8582a' : '#200800', thin ? 0.22 : 0.28);
    }
    // fat beads, each a lens of light
    for (let i = 0; i < 34; i++) {
      const a = rand() * TAU;
      const d = Math.sqrt(rand()) * R * 0.95;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const rr = 0.9 + rand() * 2.4;
      ctx.fillStyle = rgba('#d8883a', 0.5);
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba('#2a0c02', 0.5);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.fillStyle = rgba('#fff4d8', 0.85);
      ctx.beginPath();
      ctx.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.35, 0, TAU);
      ctx.fill();
    }
    // the sheen: the hearth's light lying softly across its top left
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) cloud(ctx, C - R * 0.55 + i * 16, C - R * 0.5 + i * 6, 26, '#ff9a50', 0.1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },
});

piece('roastBeef', 2.4, {
  count: 6,
  minDist: 56,
  draw(ctx, rand) {
    // a slice of roast beef laid in a fold: a rosy pink heart running out through grey-brown to its dark, peppered
    // crust, a seam of fat along one side, the grain of the meat, juices glistening; the fold throws a shadow
    const w = 17 + rand() * 3;
    const hh = 9.5 + rand() * 2;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-w, -hh * 0.2);
      ctx.bezierCurveTo(-w * 0.9, -hh * 1.15, w * 0.2, -hh * 1.3, w * 0.95, -hh * 0.55);
      ctx.bezierCurveTo(w * 1.12, hh * 0.1, w * 0.8, hh * 1.05, w * 0.1, hh * 1.05);
      ctx.bezierCurveTo(-w * 0.55, hh * 1.05, -w * 1.08, hh * 0.65, -w, -hh * 0.2);
      ctx.closePath();
    };
    path();
    drop(ctx, 0.5, 2.2, 3.2);
    // the crust ring first, then the meat inside it
    const crust = ctx.createLinearGradient(-w, -hh, w, hh);
    crust.addColorStop(0, '#5a2a12');
    crust.addColorStop(1, '#2e1206');
    ctx.fillStyle = crust;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.save();
    ctx.scale(0.92, 0.88);
    path();
    const g = ctx.createRadialGradient(-w * 0.1, -hh * 0.1, 1, 0, 0, w * 0.95);
    g.addColorStop(0, '#f49a98');
    g.addColorStop(0.4, '#e2767a');
    g.addColorStop(0.7, '#b8645a');
    g.addColorStop(1, '#8a4a36');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // the grain
    ctx.strokeStyle = rgba('#8a2e30', 0.28);
    ctx.lineWidth = 0.7;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-w, i * 1.9);
      ctx.bezierCurveTo(-w * 0.3, i * 1.9 + 2.5, w * 0.3, i * 1.9 - 1.5, w, i * 1.9 + 1);
      ctx.stroke();
    }
    // the seam of fat
    ctx.strokeStyle = rgba('#fff2e0', 0.85);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.85, hh * 0.45);
    ctx.bezierCurveTo(-w * 0.3, hh * 0.85, w * 0.35, hh * 0.75, w * 0.8, hh * 0.15);
    ctx.stroke();
    // marbling: fine threads of fat through the pink
    ctx.strokeStyle = rgba('#ffe8e0', 0.45);
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 6; i++) {
      const x0 = (rand() - 0.5) * w * 1.2;
      const y0 = (rand() - 0.5) * hh * 1.1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + 3 + rand() * 3, y0 + (rand() - 0.5) * 4, x0 + 6 + rand() * 5, y0 + (rand() - 0.5) * 3);
      ctx.stroke();
    }
    // a seared edge: the crust darkest at the very rim
    ctx.strokeStyle = rgba('#1a0804', 0.5);
    ctx.lineWidth = 1.6;
    path();
    ctx.stroke();
    // cracked pepper in the crust
    for (let i = 0; i < 34; i++) {
      const a = rand() * TAU;
      const rr = 0.88 + rand() * 0.12;
      ctx.fillStyle = rand() < 0.7 ? '#0c0604' : '#6a4a2a';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * w * rr, Math.sin(a) * hh * rr * 1.05, 0.5 + rand() * 0.7, 0, TAU);
      ctx.fill();
    }
    // the fold: a crease of shadow and the lit lip beyond it
    const fold = ctx.createLinearGradient(-w * 0.2, -hh, w * 0.4, hh);
    fold.addColorStop(0.35, 'rgba(50,10,6,0)');
    fold.addColorStop(0.5, 'rgba(50,10,6,0.38)');
    fold.addColorStop(0.58, 'rgba(255,220,220,0.18)');
    fold.addColorStop(0.75, 'rgba(50,10,6,0)');
    ctx.fillStyle = fold;
    ctx.fillRect(-w - 2, -hh - 4, w * 2 + 4, hh * 2 + 8);
    ctx.restore();
    path();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = rgba(INK, 0.85);
    ctx.stroke();
    // juices glistening
    shine(ctx, -w * 0.4, -hh * 0.45, w * 0.3, 1.5, 0.55, -0.25);
    shine(ctx, w * 0.28, -hh * 0.2, 1.8, 1, 0.75);
  },
});

piece('roastPotato', 2.8, {
  count: 5,
  minDist: 52,
  draw(ctx, rand) {
    // a crisp roast potato: a chunk cut with flat faces and roughed-up edges, glassy golden-brown where it crisped,
    // a pale fluffy face where it was cut, flakes of salt
    const n = 6 + Math.floor(rand() * 2);
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (rand() - 0.5) * 0.4;
      const r = 8 + rand() * 3;
      pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.85]);
    }
    const outline = () => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const [nx, ny] = pts[(i + 1) % n];
        if (i === 0) ctx.moveTo((x + nx) / 2, (y + ny) / 2);
        else ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
      });
      const [x0, y0] = pts[0];
      const [x1, y1] = pts[1];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      ctx.closePath();
    };
    outline();
    drop(ctx, 0.5, 1.8, 2.8);
    const g = ctx.createRadialGradient(-3, -3.5, 0.5, 0, 0, 11);
    g.addColorStop(0, '#ffe6a0');
    g.addColorStop(0.45, '#e8a84a');
    g.addColorStop(0.85, '#b06a1e');
    g.addColorStop(1, '#7a420c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // the cut face: a flat, paler facet across its top
    const ia = Math.floor(rand() * n);
    const [ax, ay] = pts[ia];
    const [bx, by] = pts[(ia + 2) % n];
    ctx.beginPath();
    ctx.moveTo(ax * 0.7, ay * 0.7);
    ctx.lineTo(bx * 0.7, by * 0.7);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = rgba('#fff2c8', 0.55);
    ctx.fill();
    // crisp, blistered edge
    for (let i = 0; i < 22; i++) {
      const a = rand() * TAU;
      const d = 6 + rand() * 5;
      ctx.fillStyle = rand() < 0.5 ? rgba('#7a3a08', 0.45) : rgba('#fff0b0', 0.45);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.85, 0.7 + rand() * 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    outline();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((rand() - 0.5) * 12, (rand() - 0.5) * 10, 1.3, 1.3);
    }
    shine(ctx, -3.4, -4, 3, 1.3, 0.6);
  },
});

piece('lingonberry', 1.4, {
  count: 9,
  minDist: 26,
  draw(ctx, rand) {
    // a small cluster of lingonberries: glossy crimson, each with a pinprick of light and a dark blossom end
    const n = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand();
      const x = Math.cos(a) * 3.4;
      const y = Math.sin(a) * 3;
      ctx.beginPath();
      ctx.arc(x, y, 2.8, 0, TAU);
      drop(ctx, 0.4, 0.8, 1.2);
      const g = ctx.createRadialGradient(x - 1, y - 1, 0.2, x, y, 2.8);
      g.addColorStop(0, '#ff6a6a');
      g.addColorStop(0.5, '#c8141e');
      g.addColorStop(1, '#6a040a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 1.2, y - 1.4, 0.9, 0.9);
      ctx.fillStyle = '#3a0206';
      ctx.fillRect(x + 0.8, y + 0.6, 0.8, 0.8);
    }
  },
});

registerTopping('hearthCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the crust charred at the hearth: leopard spots of char, blisters, a dusting of ash, and embers still glowing in a
    // few of its cracks
    ctx.save();
    clipRing(ctx, PIZZA_R * 0.8);
    const g = ctx.createRadialGradient(C, C, PIZZA_R * 0.8, C, C, PIZZA_R);
    g.addColorStop(0, 'rgba(90,40,10,0)');
    g.addColorStop(0.6, 'rgba(110,50,14,0.3)');
    g.addColorStop(1, 'rgba(40,16,4,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    for (let i = 0; i < 46; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.84 + rand() * 0.13);
      ctx.fillStyle = rgba('#1a0a04', 0.45 + rand() * 0.35);
      blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 1.8 + rand() * 3.2, 0.5, rand, 6);
      ctx.fill();
    }
    for (let i = 0; i < 70; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.82 + rand() * 0.16);
      ctx.fillStyle = rgba('#e8e0d8', 0.25);
      ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, 1.2, 1.2);
    }
    // the embers in the cracks
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + rand() * 0.5;
      const d = PIZZA_R * (0.88 + rand() * 0.06);
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      ctx.globalCompositeOperation = 'lighter';
      cloud(ctx, x, y, 9, '#ff7a2a', 0.5);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffb040';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a + 1.57) * 4, y - Math.sin(a + 1.57) * 4);
      ctx.lineTo(x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5);
      ctx.lineTo(x + Math.cos(a + 1.57) * 4, y + Math.sin(a + 1.57) * 4);
      ctx.stroke();
      ctx.strokeStyle = '#fff0b0';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.93, Math.PI * 1.0, Math.PI * 1.5);
    ctx.strokeStyle = rgba('#ffd8a0', 0.4);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  },
});

// ════════════════════════════ Black Olive Hole ════════════════════════════

/** The disc's spiral: where an arm at `t` (0 out … 1 in) of arm `k` of `n` sits. */
/** The hole sits a little behind the pie's middle, clear of its face (which sits a little in front). */
const HOLE_DY = -26;

function spiral(t: number, k: number, n: number, R: number): [number, number] {
  const r = R * (1 - t * 0.82);
  const a = (k / n) * TAU + t * 5.2;
  // (the arms wind in to the hole: their centre slides back to it as they tighten)
  return [C + Math.cos(a) * r, C + HOLE_DY * t + Math.sin(a) * r];
}

registerTopping('accretionSwirl', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // the pie as an accretion disc: the squid-ink sauce dark at its edge, tomato and mozzarella wound into spiral arms
    // that run red, then orange, then white-hot as they near the middle, dust lanes between them, the inner edge
    // glowing round the black olive
    const R = PIZZA_R * 0.8;
    ctx.save();
    clipDisc(ctx, R);
    const bg = ctx.createRadialGradient(C, C, 20, C, C, R);
    bg.addColorStop(0, '#3a1408');
    bg.addColorStop(0.35, '#22080c');
    bg.addColorStop(1, '#08040c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    const n = 5;
    for (let k = 0; k < n; k++) {
      // each arm in passes: a wide dark-red sauce band, then cheese bright on its inner edge
      for (let pass = 0; pass < 3; pass++) {
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const t = i / 60;
          const [x, y] = spiral(t, k, n, R * (1 - pass * 0.02));
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        if (pass === 0) {
          ctx.strokeStyle = rgba('#8a1a10', 0.85);
          ctx.lineWidth = 15;
        } else if (pass === 1) {
          ctx.strokeStyle = rgba('#d8401e', 0.7);
          ctx.lineWidth = 8;
        } else {
          ctx.strokeStyle = rgba('#ffd8a0', 0.55);
          ctx.lineWidth = 2.6;
        }
        ctx.stroke();
      }
    }
    // the heat towards the middle: orange, then white-hot round the olive
    ctx.globalCompositeOperation = 'lighter';
    const hot = ctx.createRadialGradient(C, C + HOLE_DY, PIZZA_R * 0.15, C, C + HOLE_DY * 0.5, R * 0.7);
    hot.addColorStop(0, 'rgba(255,250,230,0.85)');
    hot.addColorStop(0.18, 'rgba(255,200,120,0.6)');
    hot.addColorStop(0.5, 'rgba(255,110,40,0.25)');
    hot.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = hot;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // melted mozzarella threads winding in
    for (let i = 0; i < 70; i++) {
      const t = rand();
      const k = Math.floor(rand() * n) + rand() * 0.6;
      const [x0, y0] = spiral(t, k, n, R);
      const [x1, y1] = spiral(Math.min(1, t + 0.04 + rand() * 0.05), k, n, R);
      ctx.strokeStyle = rgba(t > 0.6 ? '#fff6e0' : '#ffd0a0', 0.25 + 0.4 * t);
      ctx.lineWidth = 1 + rand() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // dust lanes
    for (let k = 0; k < n; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const [x, y] = spiral(t * 0.85, k + 0.5, n, R);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = rgba('#05020a', 0.55);
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    // the far stars at its edge, a few caught and stretched
    for (let i = 0; i < 50; i++) {
      const a = rand() * TAU;
      const d = R * (0.75 + rand() * 0.25);
      ctx.fillStyle = rgba('#ffffff', 0.4 + rand() * 0.5);
      ctx.beginPath();
      ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 0.5 + rand() * 0.7, 0, TAU);
      ctx.fill();
    }
    // the sauce's gloss
    const sh = ctx.createLinearGradient(C - R, C - R, C, C);
    sh.addColorStop(0, 'rgba(255,255,255,0.14)');
    sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.restore();
  },
});

registerTopping('stretchedOlive', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // black olive rings being drawn in: round at the disc's edge, stretched into thinner and longer arcs along the
    // spiral as they near the middle (spaghettified)
    const R = PIZZA_R * 0.8;
    const n = 5;
    for (let i = 0; i < 9; i++) {
      const t = 0.08 + (i / 9) * 0.62 + rand() * 0.04;
      const k = (i * 2 + rand() * 0.4) % n;
      const [x, y] = spiral(t, k + 0.25, n, R);
      const [x2, y2] = spiral(Math.min(1, t + 0.01), k + 0.25, n, R);
      const ang = Math.atan2(y2 - y, x2 - x);
      const stretch = 1 + t * 3.2;
      const rr = 7.2 * (1 - t * 0.45);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.scale(stretch, 1 / Math.sqrt(stretch));
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, TAU);
      ctx.arc(0, 0, rr * 0.45, 0, TAU, true);
      ctx.save();
      ctx.translate(0.6, 1.2);
      ctx.fillStyle = rgba('#000000', 0.45);
      ctx.fill('evenodd');
      ctx.restore();
      const g = ctx.createRadialGradient(-rr * 0.3, -rr * 0.3, 0.5, 0, 0, rr);
      g.addColorStop(0, '#4a3a52');
      g.addColorStop(0.5, '#1a1220');
      g.addColorStop(1, '#06040a');
      ctx.fillStyle = g;
      ctx.fill('evenodd');
      ctx.lineWidth = 1.6 / Math.sqrt(stretch);
      ctx.strokeStyle = rgba('#ffd8a0', 0.6 + t * 0.35);
      ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', 0.45);
      ellipse(ctx, -rr * 0.3, -rr * 0.55, rr * 0.35, rr * 0.14, 0);
      ctx.fill();
      ctx.restore();
    }
  },
});

registerTopping('blackOliveCore', {
  count: 1,
  draw(ctx) {
    overlay(ctx);
    ctx.translate(0, HOLE_DY);
    // one huge black olive at the centre, the hole itself: blacker than anything else on the pie, its photon ring a
    // thin line of white-gold light hugging it, the far side of the disc bent up over its top (lensed)
    const r = PIZZA_R * 0.17;
    ctx.globalCompositeOperation = 'lighter';
    cloud(ctx, C, C, r * 2.6, '#ffc080', 0.45);
    ctx.globalCompositeOperation = 'source-over';
    // the lensed far side: a thin bright arc over the top of the hole
    ctx.beginPath();
    ctx.ellipse(C, C - r * 0.1, r * 1.45, r * 1.3, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.strokeStyle = rgba('#ffe8c0', 0.7);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.8);
    ctx.lineWidth = 1;
    ctx.stroke();
    // the olive
    ctx.beginPath();
    ctx.ellipse(C, C, r * 1.08, r, 0, 0, TAU);
    drop(ctx, 0.6, 2, 3);
    const g = ctx.createRadialGradient(C - r * 0.35, C - r * 0.4, 1, C, C, r * 1.1);
    g.addColorStop(0, '#2a2232');
    g.addColorStop(0.4, '#08060c');
    g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fill();
    // the photon ring
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#fff0d0';
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.ellipse(C, C, r * 1.08 + 1.8, r + 1.8, 0, 0, TAU);
    ctx.stroke();
    // its gloss, faint (it eats the light)
    shine(ctx, C - r * 0.45, C - r * 0.5, r * 0.32, r * 0.14, 0.35, -0.6);
  },
});

registerTopping('voidCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a dark-baked crust rolled in black sesame, glittering with sugar crystals like stars, a faint violet glow at its
    // inner edge where the disc's light spills over
    ctx.save();
    clipRing(ctx, PIZZA_R * 0.8);
    const g = ctx.createRadialGradient(C, C, PIZZA_R * 0.8, C, C, PIZZA_R);
    g.addColorStop(0, 'rgba(120,80,255,0.25)');
    g.addColorStop(0.3, 'rgba(60,30,40,0.35)');
    g.addColorStop(1, 'rgba(20,10,10,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    for (let i = 0; i < 130; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.82 + rand() * 0.16);
      ctx.save();
      ctx.translate(C + Math.cos(a) * d, C + Math.sin(a) * d);
      ctx.rotate(rand() * TAU);
      ctx.fillStyle = rand() < 0.8 ? '#0c0808' : '#4a3a30';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.8, 0.9, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 16; i++) {
      const a = rand() * TAU;
      const d = PIZZA_R * (0.84 + rand() * 0.12);
      twinkle(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 1.8 + rand() * 2, 0.85);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(C, C, PIZZA_R * 0.93, Math.PI * 1.0, Math.PI * 1.5);
    ctx.strokeStyle = rgba('#d8c8ff', 0.35);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  },
});
