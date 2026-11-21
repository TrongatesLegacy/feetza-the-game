// Toppings for the phase 3 Rare Find pizzas in src/content/pizzas/p3.ts (Arcobaleno, Moon Cheese,
// Dragon Fruit Flambé, Pizza Fantasma, Mystery Meat, Tikka Time Machine, Meteorite Margherita,
// Volcano Calzone, Pizza Piñata, Haunted Hawaiian).
//
// Rare Finds must look more magical than any regular pizza, so most of these are overlays (count 1)
// that reset the transform and paint across the whole 400×400 pizza top: rainbow and piñata crusts,
// the lunar surface, flambé flames, ghostly washes, the "?" and the clock face, the meteorite and the
// calzone lava. The rest are pieces drawn centred at the origin, already placed and rotated by the
// caller. Every topping is wrapped in save/restore, so changing composite modes and clips is safe.

import { PIZZA_R, PIZZA_SIZE } from '../../art/pizzaArt';
import { registerTopping } from '../../art/registry';
import { type Ctx, blob, ellipse, rgba, shade } from '../../art/util';

const C = PIZZA_SIZE / 2;
// the calzone's fold line (matches pizzaArt.ts)
const CALZONE_CY = C - PIZZA_R * 0.36;
const TAU = Math.PI * 2;

type Pt = [number, number];

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
function piece(id: string, scale: number, d: { count?: number; minDist?: number; upright?: boolean; draw(ctx: Ctx, rand: () => number): void }): void {
  registerTopping(id, {
    count: d.count,
    minDist: d.minDist === undefined ? undefined : d.minDist * (1 + (scale - 1) * 0.7),
    draw(ctx, rand) {
      if (d.upright) {
        // ghosts and the like must not lie on their sides: keep the caller's position, drop its spin
        const m = ctx.getTransform();
        const k = Math.hypot(m.a, m.b);
        ctx.setTransform(k, 0, 0, k, m.e, m.f);
        ctx.rotate((rand() - 0.5) * 0.5);
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
function spread(n: number, minDist: number, rand: () => number, r: number, inside: (x: number, y: number) => boolean = () => true): Pt[] {
  const pts: Pt[] = [];
  for (let tries = 0; pts.length < n && tries < n * 80; tries++) {
    const a = rand() * TAU;
    const d = Math.sqrt(rand()) * r;
    const x = C + Math.cos(a) * d;
    const y = C + Math.sin(a) * d;
    if (!inside(x, y)) continue;
    if (pts.every(([px, py]) => (px - x) ** 2 + (py - y) ** 2 > minDist * minDist)) pts.push([x, y]);
  }
  return pts;
}

/** A smooth path through points. */
function trace(ctx: Ctx, pts: Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
}

/** A sauce line traced through points, with a dark under-stroke, an outline, a body and a highlight. */
function sauceLine(ctx: Ctx, pts: Pt[], body: string | CanvasGradient, under: string, hi: string, w: number): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.translate(2, 3);
  trace(ctx, pts);
  ctx.strokeStyle = rgba('#1a0a04', 0.4);
  ctx.lineWidth = w + 4;
  ctx.stroke();
  ctx.restore();
  trace(ctx, pts);
  ctx.strokeStyle = under;
  ctx.lineWidth = w + 3.5;
  ctx.stroke();
  trace(ctx, pts);
  ctx.strokeStyle = body;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.save();
  ctx.translate(-w * 0.18, -w * 0.18);
  trace(ctx, pts);
  ctx.strokeStyle = hi;
  ctx.lineWidth = Math.max(1, w * 0.28);
  ctx.stroke();
  ctx.restore();
}

/** Annulus path, for clipping crust rings (use with 'evenodd'). */
function ringPath(ctx: Ctx, r0: number, r1: number): void {
  ctx.beginPath();
  ctx.arc(C, C, r1, 0, TAU);
  ctx.moveTo(C + r0, C);
  ctx.arc(C, C, r0, 0, TAU, true);
}

/** Clip to the whole pizza top. */
function clipPizza(ctx: Ctx, r = PIZZA_R - 1): void {
  ellipse(ctx, C, C, r, r);
  ctx.clip();
}

/** A drifting wisp of spectral mist: soft wide strokes narrowing to a bright core. */
function wisp(ctx: Ctx, pts: Pt[], col: string, glow: string, w: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = glow;
  ctx.shadowBlur = 14;
  for (const [lw, a] of [[w * 2.4, 0.07], [w * 1.5, 0.14], [w * 0.8, 0.3], [w * 0.3, 0.65]]) {
    trace(ctx, pts);
    ctx.strokeStyle = rgba(col, a);
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
}

/** Points of a curling wisp from (x, y) heading `ang`, `len` long. */
function wispPts(x: number, y: number, ang: number, len: number, rand: () => number): Pt[] {
  const pts: Pt[] = [];
  const amp = 8 + rand() * 10;
  const ph = rand() * TAU;
  for (let t = 0; t <= 1.001; t += 0.1) {
    const u = t * len;
    const v = Math.sin(t * 5 + ph) * amp * (0.4 + t);
    pts.push([x + Math.cos(ang) * u - Math.sin(ang) * v, y + Math.sin(ang) * u + Math.cos(ang) * v]);
  }
  return pts;
}

/** Re-shade a painted crust ring so it still reads as baked dough: dark inner lip, puffy lit rim, char. */
function crustShading(ctx: Ctx, rand: () => number, r0: number): void {
  const R = PIZZA_R;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(C, C, r0, C, C, R);
  g.addColorStop(0, '#9a8476');
  g.addColorStop(0.3, '#f0e6dc');
  g.addColorStop(0.65, '#ffffff');
  g.addColorStop(1, '#8a766a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
  ctx.restore();
  // puffy rim highlight
  ctx.strokeStyle = rgba('#ffffff', 0.42);
  ctx.lineWidth = 7;
  ellipse(ctx, C, C, R - 12, R - 12);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(C, C, R - 13, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  // char blisters
  for (let i = 0; i < 34; i++) {
    const a = rand() * TAU;
    const d = R - 6 - rand() * (R - r0 - 10);
    ctx.fillStyle = rgba('#3a1a08', 0.15 + rand() * 0.3);
    blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 2 + rand() * 4, 0.6, rand, 7);
    ctx.fill();
  }
}

/** A four-point twinkle. */
function twinkle(ctx: Ctx, x: number, y: number, r: number, col: string, a = 1): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TAU - Math.PI / 2;
    const rr = i % 2 ? r * 0.28 : r;
    ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(col, a);
  ctx.fill();
}

// ——— Arcobaleno ———

const RAINBOW = ['#ff3434', '#ff8a1a', '#ffd81a', '#44c83a', '#2a9cff', '#5a52ff', '#b048f0'];

registerTopping('rainbowCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    const r0 = 151;
    ctx.save();
    ringPath(ctx, r0, PIZZA_R - 1);
    ctx.clip('evenodd');
    // seven bold wedges round the rim, blended at the seams
    const g = ctx.createConicGradient(-Math.PI / 2, C, C);
    const n = RAINBOW.length;
    for (let i = 0; i < n; i++) {
      g.addColorStop(i / n + 0.02, RAINBOW[i]);
      g.addColorStop((i + 1) / n - 0.02, RAINBOW[i]);
    }
    g.addColorStop(0, RAINBOW[0]);
    g.addColorStop(1, RAINBOW[0]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    crustShading(ctx, rand, r0);
    // glitter
    for (let i = 0; i < 16; i++) {
      const a = rand() * TAU;
      const d = 160 + rand() * 20;
      twinkle(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 3 + rand() * 3, '#ffffff', 0.85);
    }
    ctx.restore();
    ctx.strokeStyle = rgba('#3a1a08', 0.55);
    ctx.lineWidth = 3;
    ellipse(ctx, C, C, PIZZA_R, PIZZA_R);
    ctx.stroke();
    ctx.strokeStyle = rgba('#2a0e04', 0.3);
    ctx.lineWidth = 2;
    ellipse(ctx, C, C, r0, r0);
    ctx.stroke();
  },
});

/** A short curved strip of pepper or onion lying along the arc (local frame: x along the arc). */
function vegStrip(ctx: Ctx, col: string, len: number, w: number, layer = false): void {
  const pts: Pt[] = [[-len / 2, 1.5], [0, -1.5], [len / 2, 1.5]];
  sauceLine(ctx, pts, col, shade(col, -0.45), rgba('#ffffff', 0.6), w);
  if (layer) {
    // red-onion layers: a pale inner line
    trace(ctx, pts);
    ctx.strokeStyle = rgba('#f4d8ff', 0.8);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

registerTopping('rainbowArc', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // concentric bands of veg arching over the white base, ends tucked into mozzarella clouds
    const cx = C;
    const cy = C + 62;
    const bands: { r: number; kind: 'strip' | 'corn' | 'berry' | 'onion'; col: string }[] = [
      { r: 128, kind: 'strip', col: '#e8241a' },
      { r: 110, kind: 'strip', col: '#ff8a14' },
      { r: 92, kind: 'corn', col: '#ffd21a' },
      { r: 74, kind: 'strip', col: '#3aa82a' },
      { r: 56, kind: 'berry', col: '#3a4ad0' },
      { r: 39, kind: 'onion', col: '#9a2ab8' },
    ];
    for (const b of bands) {
      // a faint sauce of the band's colour so the stripe stays continuous
      ctx.strokeStyle = rgba(b.col, 0.35);
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, b.r, Math.PI, TAU);
      ctx.stroke();
      const step = b.kind === 'corn' ? 9 : b.kind === 'berry' ? 12.5 : 17;
      const da = step / b.r;
      for (let a = Math.PI + da * 0.5; a < TAU; a += da) {
        const x = cx + Math.cos(a) * b.r;
        const y = cy + Math.sin(a) * b.r;
        if ((x - C) ** 2 + (y - C) ** 2 > 140 ** 2) continue;
        at(ctx, x, y, a + Math.PI / 2 + (rand() - 0.5) * 0.15, () => {
          if (b.kind === 'strip') vegStrip(ctx, b.col, 16, 8);
          else if (b.kind === 'onion') vegStrip(ctx, b.col, 15, 7, true);
          else if (b.kind === 'corn') {
            for (const off of [-3.2, 3.2]) {
              ellipse(ctx, off * 0.4, off, 4.4, 3.6);
              const g = ctx.createRadialGradient(off * 0.4 - 1, off - 1, 0.5, off * 0.4, off, 4.5);
              g.addColorStop(0, '#fff2a0');
              g.addColorStop(1, '#f0b010');
              ctx.fillStyle = g;
              ctx.fill();
              ctx.strokeStyle = shade('#ffd21a', -0.45);
              ctx.lineWidth = 1.1;
              ctx.stroke();
            }
          } else {
            ellipse(ctx, 0, 0, 6.2, 6.2);
            drop(ctx, 0.3, 1, 2);
            const g = ctx.createRadialGradient(-2, -2, 0.5, 0, 0, 6.5);
            g.addColorStop(0, '#7a90ff');
            g.addColorStop(0.6, '#3a4ad0');
            g.addColorStop(1, '#1c2280');
            ctx.fillStyle = g;
            ctx.fill();
            ctx.strokeStyle = shade('#3a4ad0', -0.45);
            ctx.lineWidth = 1.2;
            ctx.stroke();
            // blueberry crown and bloom
            ctx.strokeStyle = '#141848';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-1.5, 1.5);
            ctx.lineTo(1.5, -1.5);
            ctx.moveTo(-1.5, -1.5);
            ctx.lineTo(1.5, 1.5);
            ctx.stroke();
            shine(ctx, -2.2, -2.6, 2, 1, 0.6);
          }
        });
      }
    }
    // mozzarella clouds at the rainbow's feet
    for (const side of [-1, 1]) {
      const bx = cx + side * 84;
      const by = cy + 6;
      const puffs: [number, number, number][] = [[-26, 4, 15], [-8, -6, 20], [14, -2, 18], [30, 6, 13], [2, 10, 16]];
      for (const [dx, dy, r] of puffs) {
        ellipse(ctx, bx + dx * side, by + dy, r, r * 0.85);
        drop(ctx, 0.28, 2, 4);
      }
      for (const [dx, dy, r] of puffs) {
        const x = bx + dx * side;
        const y = by + dy;
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.7, '#fbf3e0');
        g.addColorStop(1, '#e8d8b8');
        ellipse(ctx, x, y, r, r * 0.85);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = rgba(shade('#f0e0c0', -0.45), 0.7);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      for (const [dx, dy, r] of puffs) shine(ctx, bx + dx * side - r * 0.3, by + dy - r * 0.4, r * 0.35, r * 0.15, 0.7);
    }
  },
});

// ——— Moon Cheese ———

registerTopping('moonCraters', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    const r = 149;
    ctx.save();
    ellipse(ctx, C, C, r, r);
    ctx.clip();
    // dark lunar seas
    for (let i = 0; i < 7; i++) {
      const a = rand() * TAU;
      const d = rand() * 90;
      blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 26 + rand() * 26, 0.5, rand, 9);
      ctx.fillStyle = rgba('#6e7c96', 0.38);
      ctx.fill();
    }
    // cheesy sheen: the moon is made of cheese after all
    for (let i = 0; i < 10; i++) {
      const a = rand() * TAU;
      const d = rand() * 120;
      blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 10 + rand() * 14, 0.5, rand, 8);
      ctx.fillStyle = rgba('#f4ecc8', 0.28);
      ctx.fill();
    }
    const sizes = [30, 24, 20, 15, 14, 12, 11, 9, 8, 8, 7, 6, 6, 5, 5, 4, 4, 4];
    const pts = spread(sizes.length, 22, rand, 125);
    pts.forEach(([x, y], i) => {
      const cr = sizes[i] ?? 4;
      if (cr >= 20) {
        // bright ejecta rays from the big craters
        for (let k = 0; k < 9; k++) {
          const a = rand() * TAU;
          const l = cr * (1.6 + rand() * 1.4);
          ctx.strokeStyle = rgba('#f4f8ff', 0.22);
          ctx.lineWidth = 2 + rand() * 2;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * cr, y + Math.sin(a) * cr);
          ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
          ctx.stroke();
        }
      }
      // raised rim catching the light
      ellipse(ctx, x + cr * 0.06, y + cr * 0.08, cr * 1.24, cr * 1.2);
      ctx.fillStyle = rgba('#ffffff', 0.9);
      ctx.fill();
      // the bowl: shadowed on the upper left, lit on the lower right
      ellipse(ctx, x, y, cr, cr * 0.95);
      const g = ctx.createRadialGradient(x + cr * 0.35, y + cr * 0.35, cr * 0.1, x, y, cr * 1.05);
      g.addColorStop(0, '#cfd6e2');
      g.addColorStop(0.55, '#8e98ac');
      g.addColorStop(1, '#4e586e');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(shade('#c9d0d8', -0.45), 0.75);
      ctx.lineWidth = cr > 10 ? 1.8 : 1.2;
      ctx.stroke();
      // inner wall shadow
      ctx.strokeStyle = rgba('#4a5468', 0.45);
      ctx.lineWidth = Math.max(1.5, cr * 0.2);
      ctx.beginPath();
      ctx.arc(x, y, cr * 0.8, Math.PI * 0.95, Math.PI * 1.75);
      ctx.stroke();
    });
    // soft moonlight from within
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(C - 40, C - 45, 10, C, C, r);
    g.addColorStop(0, rgba('#eaf4ff', 0.45));
    g.addColorStop(0.6, rgba('#cfe4ff', 0.1));
    g.addColorStop(1, rgba('#cfe4ff', 0.35));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.restore();
    // a cool halo round the sauce line
    ctx.save();
    ctx.shadowColor = '#cfe4ff';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = rgba('#e8f2ff', 0.7);
    ctx.lineWidth = 3;
    ellipse(ctx, C, C, r, r);
    ctx.stroke();
    ctx.restore();
  },
});

piece('starDust', 1.1, {
  count: 22,
  minDist: 24,
  draw(ctx, rand) {
    const col = rand() < 0.65 ? '#ffd84a' : '#a8d8ff';
    const r = 6 + rand() * 3;
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.9);
    halo.addColorStop(0, rgba(col === '#ffd84a' ? '#fff0a0' : '#e0f2ff', 0.75));
    halo.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = halo;
    ellipse(ctx, 0, 0, r * 1.9, r * 1.9);
    ctx.fill();
    // five-point star, chunky enough to read
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, shade(col, 0.3));
    g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade(col, -0.45);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (rand() < 0.4) twinkle(ctx, r * 1.3, -r * 1.2, 3.5, '#ffffff', 0.9);
  },
});

// ——— Dragon Fruit Flambé ———

piece('dragonFruit', 1.25, {
  count: 9,
  minDist: 44,
  draw(ctx, rand) {
    const r = 16;
    const half = rand() < 0.4;
    // mostly snowy flesh: the white and black seeds are what say "dragon fruit" on a pink base
    const red = rand() > 0.82;
    const a0 = half ? Math.PI : 0;
    const a1 = TAU;
    // magenta scales with green tips poking out past the skin
    const nScales = half ? 5 : 9;
    for (let i = 0; i < nScales; i++) {
      const a = a0 + ((i + 0.5) / nScales) * (a1 - a0);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.28) * (r - 1), Math.sin(a - 0.28) * (r - 1));
      ctx.quadraticCurveTo(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3), Math.cos(a + 0.18) * (r + 8), Math.sin(a + 0.18) * (r + 8));
      ctx.lineTo(Math.cos(a + 0.28) * (r - 1), Math.sin(a + 0.28) * (r - 1));
      ctx.closePath();
      ctx.fillStyle = '#e8287e';
      ctx.fill();
      ctx.strokeStyle = shade('#e8287e', -0.45);
      ctx.lineWidth = 1;
      ctx.stroke();
      ellipse(ctx, Math.cos(a + 0.16) * (r + 6.5), Math.sin(a + 0.16) * (r + 6.5), 2.4, 1.4, a + 0.16);
      ctx.fillStyle = '#8ad43a';
      ctx.fill();
    }
    const slice = (rr: number) => {
      ctx.beginPath();
      if (half) {
        ctx.arc(0, 0, rr, Math.PI, TAU);
        ctx.closePath();
      } else ctx.arc(0, 0, rr, 0, TAU);
    };
    slice(r);
    drop(ctx, 0.4);
    ctx.fillStyle = '#d0186a';
    ctx.fill();
    ctx.strokeStyle = shade('#d0186a', -0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    // the flesh: snowy white or deep magenta, speckled with black seeds
    slice(r - 3.2);
    const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, r);
    if (red) {
      g.addColorStop(0, '#ff5aa8');
      g.addColorStop(1, '#a80c50');
    } else {
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#f0dce6');
    }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = red ? '#2a0610' : '#141014';
    for (let i = 0; i < 26; i++) {
      const a = half ? Math.PI + rand() * Math.PI : rand() * TAU;
      const d = Math.sqrt(rand()) * (r - 5.5);
      ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d - (half ? 1 : 0), 1.1, 0.75, a);
      ctx.fill();
    }
    shine(ctx, -5, -7, 4.5, 1.6, 0.55);
  },
});

/** A flame tongue standing at (x, y): round base, leaning tip. */
function flamePath(ctx: Ctx, x: number, y: number, w: number, h: number, lean: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w, y - h * 0.45, x + lean - w * 0.25, y - h * 0.62, x + lean, y - h);
  ctx.bezierCurveTo(x + lean * 0.4 + w * 0.35, y - h * 0.58, x + w, y - h * 0.38, x + w, y);
  ctx.arc(x, y, w, 0, Math.PI);
  ctx.closePath();
}

registerTopping('flambeFlames', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipPizza(ctx);
    const pts = spread(8, 74, rand, 122);
    for (const [x, y0] of pts) {
      const y = y0 + 26;
      const h = 54 + rand() * 26;
      const w = 14 + rand() * 6;
      const lean = (rand() - 0.5) * 18;
      // heat glow on the pizza under the flame
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(x, y - h * 0.3, 2, x, y - h * 0.3, h * 0.9);
      glow.addColorStop(0, rgba('#ff9a3a', 0.5));
      glow.addColorStop(1, rgba('#ff6a1a', 0));
      ctx.fillStyle = glow;
      ctx.fillRect(x - h, y - h * 1.3, h * 2, h * 2);
      ctx.restore();
      // a side flick, then the main tongue, then the hot core
      for (const [fx, fw, fh, fl] of [[x - w * 0.9, w * 0.55, h * 0.6, lean - 6], [x + w * 0.85, w * 0.5, h * 0.5, lean + 6]] as [number, number, number, number][]) {
        flamePath(ctx, fx, y + 2, fw, fh, fl);
        const g = ctx.createLinearGradient(0, y + fw, 0, y - fh);
        g.addColorStop(0, rgba('#2a6aff', 0.7));
        g.addColorStop(0.35, rgba('#ff6a1a', 0.65));
        g.addColorStop(1, rgba('#ffb03a', 0.05));
        ctx.fillStyle = g;
        ctx.fill();
      }
      flamePath(ctx, x, y, w, h, lean);
      const g = ctx.createLinearGradient(0, y + w, 0, y - h);
      g.addColorStop(0, rgba('#1e5aff', 0.85));
      g.addColorStop(0.28, rgba('#3a8aff', 0.6));
      g.addColorStop(0.45, rgba('#ff5a12', 0.75));
      g.addColorStop(1, rgba('#ffb03a', 0.08));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba('#c8300a', 0.35);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      flamePath(ctx, x + lean * 0.12, y, w * 0.5, h * 0.62, lean * 0.6);
      const g2 = ctx.createLinearGradient(0, y + w * 0.5, 0, y - h * 0.62);
      g2.addColorStop(0, rgba('#a8d0ff', 0.9));
      g2.addColorStop(0.4, rgba('#fff0a0', 0.85));
      g2.addColorStop(1, rgba('#ffd04a', 0.1));
      ctx.fillStyle = g2;
      ctx.fill();
    }
    // sparks
    for (let i = 0; i < 18; i++) {
      const a = rand() * TAU;
      const d = rand() * 135;
      ellipse(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 1.6 + rand() * 1.4, 1.6 + rand() * 1.4);
      ctx.fillStyle = rgba(rand() < 0.5 ? '#ffe07a' : '#ff8a2a', 0.9);
      ctx.fill();
    }
    ctx.restore();
  },
});

// ——— Pizza Fantasma ———

piece('ghostMozz', 1.25, {
  count: 8,
  minDist: 50,
  upright: true,
  draw(ctx, rand) {
    const w = 12;
    const top = -4;
    const bot = 14;
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-w, bot);
      ctx.lineTo(-w, top);
      ctx.arc(0, top, w, Math.PI, 0);
      ctx.lineTo(w, bot);
      // three scallops along the hem
      const s = (w * 2) / 3;
      for (let i = 0; i < 3; i++) {
        const x0 = w - i * s;
        ctx.quadraticCurveTo(x0 - s / 2, bot + 9, x0 - s, bot);
      }
      ctx.closePath();
    };
    // a cold blue glow so the ghosts lift off the white cheese
    ctx.save();
    ctx.shadowColor = '#6ab8ff';
    ctx.shadowBlur = 10;
    body();
    ctx.fillStyle = rgba('#bfe2ff', 0.9);
    ctx.fill();
    ctx.restore();
    body();
    drop(ctx, 0.25, 2, 4);
    const g = ctx.createLinearGradient(-w, top - w, w, bot + 6);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#f2f6fb');
    g.addColorStop(1, '#c8d8ea');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade('#a8c0dc', -0.45);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // stretchy mozzarella texture
    ctx.strokeStyle = rgba('#c8d8ea', 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, 9);
    ctx.quadraticCurveTo(-4, 13, -7, 16);
    ctx.moveTo(5, 8);
    ctx.quadraticCurveTo(7, 12, 4, 15);
    ctx.stroke();
    // eyes and an "oooh" mouth
    ctx.fillStyle = '#1e2430';
    ellipse(ctx, -4.6, -4, 2.5, 3.5);
    ctx.fill();
    ellipse(ctx, 4.6, -4, 2.5, 3.5);
    ctx.fill();
    ellipse(ctx, 0, 4, 1.8, 2.4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ellipse(ctx, -5.2, -5.4, 0.9, 0.9);
    ctx.fill();
    ellipse(ctx, 4, -5.4, 0.9, 0.9);
    ctx.fill();
    if (rand() < 0.5) {
      ctx.fillStyle = rgba('#ff9ab8', 0.45);
      ellipse(ctx, -8, 1, 2.2, 1.3);
      ctx.fill();
      ellipse(ctx, 8, 1, 2.2, 1.3);
      ctx.fill();
    }
    shine(ctx, -5, -12, 4, 1.6, 0.8);
  },
});

registerTopping('ghostly', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipPizza(ctx);
    // drain the colour, then flood it with cold spectral blue
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = rgba('#808080', 0.5);
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = rgba('#5aa8e8', 0.3);
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(C, C, 20, C, C, PIZZA_R);
    g.addColorStop(0, rgba('#2a4a6a', 0.25));
    g.addColorStop(1, rgba('#5a9ad0', 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.globalCompositeOperation = 'source-over';
    // drifting wisps
    for (let i = 0; i < 6; i++) {
      const a = rand() * TAU;
      const d = 30 + rand() * 90;
      wisp(ctx, wispPts(C + Math.cos(a) * d, C + Math.sin(a) * d, rand() * TAU, 60 + rand() * 50, rand), '#e8f6ff', '#9ad8ff', 6);
    }
    // cold motes
    for (let i = 0; i < 14; i++) {
      const a = rand() * TAU;
      const d = rand() * 170;
      twinkle(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 2.5 + rand() * 3, '#ffffff', 0.8);
    }
    ctx.restore();
    // a pale halo round the rim
    ctx.save();
    ctx.shadowColor = '#a8e0ff';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = rgba('#dff2ff', 0.6);
    ctx.lineWidth = 3;
    ellipse(ctx, C, C, PIZZA_R - 3, PIZZA_R - 3);
    ctx.stroke();
    ctx.restore();
  },
});

// ——— Mystery Meat ———

piece('mysteryMeat', 1.2, {
  count: 11,
  minDist: 38,
  draw(ctx, rand) {
    const cols = ['#7a6252', '#6a4478', '#5e5a54', '#7a4a5e'];
    const col = cols[Math.floor(rand() * cols.length)];
    const r = 11 + rand() * 4;
    // odd lumpy silhouettes, never twice the same
    blob(ctx, 0, 0, r, 0.75, rand, 5 + Math.floor(rand() * 3));
    drop(ctx, 0.4);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 1, 0, 0, r * 1.2);
    g.addColorStop(0, shade(col, 0.35));
    g.addColorStop(0.7, col);
    g.addColorStop(1, shade(col, -0.3));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade(col, -0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    // suspicious purple veins and gristle
    ctx.save();
    ctx.clip();
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      ctx.strokeStyle = rgba(i ? '#d0b0c0' : '#b070e0', 0.7);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const y = (rand() - 0.5) * r;
      ctx.moveTo(-r, y);
      ctx.quadraticCurveTo(0, y + (rand() - 0.5) * r * 1.4, r, y + (rand() - 0.5) * r);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = rgba('#2a1424', 0.6);
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, (rand() - 0.5) * r, (rand() - 0.5) * r, 1.3, 1);
      ctx.fill();
    }
    shine(ctx, -r * 0.35, -r * 0.4, r * 0.35, r * 0.14, 0.45);
  },
});

registerTopping('questionMark', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    // a violet aura so the "?" glows like a riddle
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const aura = ctx.createRadialGradient(C, C, 10, C, C, 125);
    aura.addColorStop(0, rgba('#b48aff', 0.55));
    aura.addColorStop(1, rgba('#b48aff', 0));
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.restore();
    const hy = C - 42;
    const hr = 40;
    const hook = () => {
      ctx.beginPath();
      ctx.arc(C, hy, hr, Math.PI * 1.08, Math.PI * 2.18);
      ctx.quadraticCurveTo(C + 4, hy + hr * 0.92, C, hy + hr + 16);
      ctx.lineTo(C, C + 30);
    };
    const dotY = C + 66;
    const cheese = ctx.createLinearGradient(C - 50, C - 90, C + 50, C + 80);
    cheese.addColorStop(0, '#fff2a8');
    cheese.addColorStop(0.5, '#ffd84a');
    cheese.addColorStop(1, '#f0a822');
    const outline = shade('#f5c040', -0.45);
    // shadow, outline, cheese body
    ctx.save();
    ctx.translate(4, 6);
    hook();
    ctx.strokeStyle = rgba('#1a0a04', 0.45);
    ctx.lineWidth = 36;
    ctx.stroke();
    ellipse(ctx, C, dotY, 18, 18);
    ctx.fillStyle = rgba('#1a0a04', 0.45);
    ctx.fill();
    ctx.restore();
    hook();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 34;
    ctx.stroke();
    ellipse(ctx, C, dotY, 17, 17);
    ctx.fillStyle = outline;
    ctx.fill();
    hook();
    ctx.strokeStyle = cheese;
    ctx.lineWidth = 26;
    ctx.stroke();
    ellipse(ctx, C, dotY, 13, 13);
    ctx.fillStyle = cheese;
    ctx.fill();
    // melted drips running off the hook
    for (const [dx, dy, l] of [[-38, hy + 14, 16], [34, hy + 22, 12], [12, C + 20, 10]] as [number, number, number][]) {
      const x = C + dx;
      ctx.beginPath();
      ctx.moveTo(x - 5, dy);
      ctx.lineTo(x - 3.5, dy + l);
      ctx.arc(x, dy + l, 3.5, Math.PI, 0, true);
      ctx.lineTo(x + 5, dy);
      ctx.closePath();
      ctx.fillStyle = '#ffd040';
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // browned bubbles and a glossy highlight
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.15 + rand() * 0.95);
      ellipse(ctx, C + Math.cos(a) * hr, hy + Math.sin(a) * hr, 1.5 + rand() * 2.2, 1.3 + rand() * 1.5);
      ctx.fillStyle = rgba('#c06a1c', 0.5);
      ctx.fill();
    }
    ctx.strokeStyle = rgba('#ffffff', 0.75);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(C, hy, hr - 5, Math.PI * 1.2, Math.PI * 1.6);
    ctx.stroke();
    shine(ctx, C - 4, dotY - 5, 5, 2.4, 0.75);
  },
});

// ——— Tikka Time Machine ———

registerTopping('clockFace', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    const cream = '#fff2d8';
    const creamUnder = shade('#e8d8b8', -0.45);
    const ringR = 132;
    // a faint time-warp glow under the face
    ctx.save();
    clipPizza(ctx, 150);
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(C, C, 40, C, C, ringR + 10);
    g.addColorStop(0, rgba('#7ad8ff', 0));
    g.addColorStop(0.8, rgba('#7ad8ff', 0.12));
    g.addColorStop(1, rgba('#7ad8ff', 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.restore();
    // cream-sauce rim, piped in a ring
    const ring: Pt[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * TAU;
      ring.push([C + Math.cos(a) * ringR, C + Math.sin(a) * ringR]);
    }
    ctx.save();
    ctx.shadowColor = '#7ad8ff';
    ctx.shadowBlur = 10;
    sauceLine(ctx, ring, cream, creamUnder, rgba('#ffffff', 0.9), 7);
    ctx.restore();
    // hour marks: roman numerals on the quarters, piped dots between
    const numerals: Record<number, string> = { 0: 'XII', 3: 'III', 6: 'VI', 9: 'IX' };
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * TAU - Math.PI / 2;
      const nm = numerals[h];
      if (nm) {
        const x = C + Math.cos(a) * (ringR - 26);
        const y = C + Math.sin(a) * (ringR - 26);
        ctx.font = 'bold 30px Georgia, "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.fillStyle = rgba('#1a0a04', 0.45);
        ctx.fillText(nm, x + 2, y + 3);
        ctx.strokeStyle = creamUnder;
        ctx.lineWidth = 6;
        ctx.strokeText(nm, x, y);
        ctx.fillStyle = cream;
        ctx.fillText(nm, x, y);
      } else {
        const x0 = C + Math.cos(a) * (ringR - 14);
        const y0 = C + Math.sin(a) * (ringR - 14);
        const x1 = C + Math.cos(a) * (ringR - 24);
        const y1 = C + Math.sin(a) * (ringR - 24);
        sauceLine(ctx, [[x0, y0], [x1, y1]], cream, creamUnder, rgba('#ffffff', 0.85), 6);
      }
    }
    // the hands: red pepper strips at ten past ten
    const hand = (ang: number, len: number, w: number) => {
      const ex = C + Math.cos(ang) * len;
      const ey = C + Math.sin(ang) * len;
      const tail: Pt = [C - Math.cos(ang) * 14, C - Math.sin(ang) * 14];
      const pg = ctx.createLinearGradient(tail[0], tail[1], ex, ey);
      pg.addColorStop(0, '#b8180e');
      pg.addColorStop(0.5, '#ec3a22');
      pg.addColorStop(1, '#c8200e');
      sauceLine(ctx, [tail, [ex, ey]], pg, shade('#d8281a', -0.45), rgba('#ffb8a0', 0.9), w);
      // arrow tip
      at(ctx, ex, ey, ang, () => {
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-2, -w * 0.95);
        ctx.lineTo(-2, w * 0.95);
        ctx.closePath();
        ctx.fillStyle = '#e02e1a';
        ctx.fill();
        ctx.strokeStyle = shade('#d8281a', -0.45);
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };
    hand(-Math.PI / 2 - (Math.PI / 6) * 2, 62, 11);
    hand(-Math.PI / 2 + (Math.PI / 6) * 2, 92, 8);
    // black olive at the hub
    ellipse(ctx, C, C, 11, 11);
    drop(ctx, 0.4);
    const og = ctx.createRadialGradient(C - 3, C - 3, 1, C, C, 11);
    og.addColorStop(0, '#5a5050');
    og.addColorStop(1, '#141010');
    ctx.fillStyle = og;
    ctx.fill();
    ellipse(ctx, C, C, 4, 4);
    ctx.fillStyle = '#7a2a1a';
    ctx.fill();
    shine(ctx, C - 4, C - 5, 3, 1.3, 0.6);
    void rand;
  },
});

// ——— Meteorite Margherita ———

registerTopping('meteorRock', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    const rr = 54;
    ctx.save();
    ellipse(ctx, C, C, 150, 150);
    ctx.clip();
    // scorched mozzarella round the impact
    ctx.globalCompositeOperation = 'multiply';
    const sc = ctx.createRadialGradient(C, C, rr * 0.8, C, C, 125);
    sc.addColorStop(0, '#5a3418');
    sc.addColorStop(0.5, '#a8784a');
    sc.addColorStop(1, '#ffffff');
    ctx.fillStyle = sc;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 30; i++) {
      const a = rand() * TAU;
      const d = rr + 2 + rand() * 46;
      blob(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 4 + rand() * 9, 0.6, rand, 7);
      ctx.fillStyle = rgba('#2a1206', 0.25 + rand() * 0.35);
      ctx.fill();
    }
    // heat glow
    ctx.globalCompositeOperation = 'screen';
    const hg = ctx.createRadialGradient(C, C, rr * 0.7, C, C, 120);
    hg.addColorStop(0, rgba('#ff8a2a', 0.85));
    hg.addColorStop(0.45, rgba('#ff5a12', 0.35));
    hg.addColorStop(1, rgba('#ff5a12', 0));
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.restore();
    // the rock
    // a lumpy outline kept as a Path2D for the glow, the fill, the clip and the outline
    const rock = new Path2D();
    {
      const pts: Pt[] = [];
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * TAU;
        const r = rr * (0.89 + rand() * 0.22);
        pts.push([C + Math.cos(a) * r, C + Math.sin(a) * r]);
      }
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        const mx = (p[0] + q[0]) / 2;
        const my = (p[1] + q[1]) / 2;
        if (i === 0) rock.moveTo(mx, my);
        else rock.quadraticCurveTo(p[0], p[1], mx, my);
      });
      const p0 = pts[0];
      const p1 = pts[1];
      rock.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
      rock.closePath();
    }
    ctx.save();
    ctx.shadowColor = '#ff6a1a';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#ff7a2a';
    ctx.fill(rock);
    ctx.restore();
    const rg = ctx.createRadialGradient(C - 18, C - 20, 4, C, C, rr * 1.1);
    rg.addColorStop(0, '#7a6a6e');
    rg.addColorStop(0.5, '#3e3438');
    rg.addColorStop(1, '#1a1418');
    ctx.fillStyle = rg;
    ctx.fill(rock);
    ctx.save();
    ctx.clip(rock);
    // pock-marked surface
    for (let i = 0; i < 7; i++) {
      const a = rand() * TAU;
      const d = rand() * rr * 0.75;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const cr = 4 + rand() * 7;
      ellipse(ctx, x, y, cr, cr * 0.9);
      ctx.fillStyle = rgba('#120c10', 0.55);
      ctx.fill();
      ctx.strokeStyle = rgba('#a89a9e', 0.45);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, cr, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
    // molten cracks, branching out from the core
    const cracks: Pt[][] = [];
    for (let i = 0; i < 6; i++) {
      let a = (i / 6) * TAU + rand() * 0.6;
      let x = C + Math.cos(a) * 6;
      let y = C + Math.sin(a) * 6;
      const line: Pt[] = [[x, y]];
      for (let k = 0; k < 5; k++) {
        a += (rand() - 0.5) * 0.9;
        const s = 9 + rand() * 6;
        x += Math.cos(a) * s;
        y += Math.sin(a) * s;
        line.push([x, y]);
        if (k === 2 && rand() < 0.6) {
          const b = a + (rand() < 0.5 ? -0.9 : 0.9);
          cracks.push([[x, y], [x + Math.cos(b) * 12, y + Math.sin(b) * 12], [x + Math.cos(b) * 22, y + Math.sin(b) * 22]]);
        }
      }
      cracks.push(line);
    }
    const strokeCracks = (col: string, w: number, blur: number) => {
      ctx.save();
      ctx.shadowColor = '#ff6a1a';
      ctx.shadowBlur = blur;
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.lineJoin = 'miter';
      for (const l of cracks) {
        ctx.beginPath();
        l.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.stroke();
      }
      ctx.restore();
    };
    strokeCracks(rgba('#ff4a0a', 0.8), 6.5, 10);
    strokeCracks('#ffa02a', 3.2, 4);
    strokeCracks('#fff2a0', 1.2, 0);
    // molten core
    const core = ctx.createRadialGradient(C + 2, C + 2, 1, C + 2, C + 2, 14);
    core.addColorStop(0, rgba('#fff6c0', 1));
    core.addColorStop(0.5, rgba('#ffa02a', 0.9));
    core.addColorStop(1, rgba('#ff5a0a', 0));
    ctx.fillStyle = core;
    ellipse(ctx, C + 2, C + 2, 14, 14);
    ctx.fill();
    // underlit lower-right edge
    ctx.strokeStyle = rgba('#ff8a2a', 0.7);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(C, C, rr, -0.2, Math.PI * 0.8);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#140c0e';
    ctx.lineWidth = 3;
    ctx.stroke(rock);
    shine(ctx, C - 22, C - 26, 12, 4, 0.35);
    // flying embers
    for (let i = 0; i < 16; i++) {
      const a = rand() * TAU;
      const d = rr + 8 + rand() * 60;
      ellipse(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 1.5 + rand() * 1.8, 1.5 + rand() * 1.5);
      ctx.fillStyle = rgba(rand() < 0.5 ? '#ffe07a' : '#ff7a2a', 0.95);
      ctx.fill();
    }
  },
});

// ——— Volcano Calzone ———

function calzonePath(ctx: Ctx): void {
  const R = PIZZA_R;
  ctx.beginPath();
  ctx.moveTo(C + R, CALZONE_CY);
  ctx.arc(C, CALZONE_CY, R, 0, Math.PI);
  ctx.quadraticCurveTo(C, CALZONE_CY - R * 0.22, C + R, CALZONE_CY);
  ctx.closePath();
}

registerTopping('lavaVents', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    const vents: [number, number, number, number][] = [
      [C - 70, CALZONE_CY + 70, -0.3, 1],
      [C, CALZONE_CY + 80, 0, 1.35],
      [C + 70, CALZONE_CY + 70, 0.3, 1],
    ];
    ctx.save();
    calzonePath(ctx);
    ctx.clip();
    // scorched dough round the vents
    for (const [vx, vy] of vents) {
      for (let i = 0; i < 10; i++) {
        const a = rand() * TAU;
        const d = 14 + rand() * 30;
        blob(ctx, vx + Math.cos(a) * d, vy + Math.sin(a) * d * 0.7, 4 + rand() * 8, 0.6, rand, 7);
        ctx.fillStyle = rgba('#1a0804', 0.25 + rand() * 0.3);
        ctx.fill();
      }
    }
    // glowing cracks splitting the crust between vents
    const cracks: Pt[][] = [];
    for (const [vx, vy] of vents) {
      for (let k = 0; k < 3; k++) {
        let a = Math.PI * (0.15 + rand() * 0.7) + (k === 0 ? Math.PI : 0) * (rand() < 0.5 ? 1 : 0);
        let x = vx;
        let y = vy;
        const l: Pt[] = [[x, y]];
        for (let s = 0; s < 4; s++) {
          a += (rand() - 0.5) * 0.8;
          x += Math.cos(a) * (10 + rand() * 7);
          y += Math.sin(a) * (10 + rand() * 7);
          l.push([x, y]);
        }
        cracks.push(l);
      }
    }
    for (const [col, w, blur] of [[rgba('#ff4a0a', 0.75), 5, 10], ['#ffa02a', 2.4, 3], ['#fff0a0', 0.9, 0]] as [string, number, number][]) {
      ctx.save();
      ctx.shadowColor = '#ff5a12';
      ctx.shadowBlur = blur;
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.lineJoin = 'miter';
      for (const l of cracks) {
        ctx.beginPath();
        l.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.stroke();
      }
      ctx.restore();
    }
    // heat glow round every vent
    for (const [vx, vy, , s] of vents) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(vx, vy, 4, vx, vy, 60 * s);
      g.addColorStop(0, rgba('#ff8a2a', 0.8));
      g.addColorStop(1, rgba('#ff4a0a', 0));
      ctx.fillStyle = g;
      ctx.fillRect(vx - 65 * s, vy - 65 * s, 130 * s, 130 * s);
      ctx.restore();
    }
    // lava spilling from the vents down the dome to the crimp, spreading as it goes like real lava
    for (const [vx, vy, , s] of vents) {
      const base = Math.atan2(vy - CALZONE_CY, vx - C);
      const n = s > 1 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const dir = base + ((k + 0.5) / n - 0.5) * 0.9 + (rand() - 0.5) * 0.15;
        // run until just past the crimped edge
        let len = 20;
        while (len < 160 && Math.hypot(vx + Math.cos(dir) * len - C, vy + Math.sin(dir) * len - CALZONE_CY) < PIZZA_R - 16) len += 4;
        len *= 0.8 + rand() * 0.25;
        const w0 = 5 * s;
        const w1 = 13 + rand() * 5;
        const ph = rand() * TAU;
        const left: Pt[] = [];
        const right: Pt[] = [];
        const mid: Pt[] = [];
        for (let t = 0; t <= 1.001; t += 0.1) {
          const wob = Math.sin(t * 4 + ph) * 5 * t;
          const x = vx + Math.cos(dir) * len * t - Math.sin(dir) * wob;
          const y = vy + Math.sin(dir) * len * t + Math.cos(dir) * wob;
          const w = (w0 + (w1 - w0) * Math.sqrt(t)) * (1 + Math.sin(t * 10 + ph) * 0.1);
          mid.push([x, y]);
          left.push([x - Math.sin(dir) * w, y + Math.cos(dir) * w]);
          right.push([x + Math.sin(dir) * w, y - Math.cos(dir) * w]);
        }
        const [ex, ey] = mid[mid.length - 1];
        const flow = () => {
          ctx.beginPath();
          left.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
          // a lobed front where the lava is still creeping
          const lobes = 3;
          for (let i = 0; i < lobes; i++) {
            const a0 = dir + Math.PI / 2 - (i / lobes) * Math.PI;
            const a1 = dir + Math.PI / 2 - ((i + 1) / lobes) * Math.PI;
            const am = (a0 + a1) / 2;
            const bulge = w1 * (0.55 + (i === 1 ? 0.35 : 0.1));
            ctx.quadraticCurveTo(ex + Math.cos(am) * bulge * 1.5, ey + Math.sin(am) * bulge * 1.5, ex + Math.cos(a1) * w1 * 0.95, ey + Math.sin(a1) * w1 * 0.95);
          }
          for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
          ctx.closePath();
        };
        flow();
        ctx.save();
        ctx.shadowColor = '#ff4a0a';
        ctx.shadowBlur = 14;
        const lg = ctx.createLinearGradient(vx, vy, ex, ey);
        lg.addColorStop(0, '#ffe680');
        lg.addColorStop(0.4, '#ff9a1a');
        lg.addColorStop(1, '#e0380a');
        ctx.fillStyle = lg;
        ctx.fill();
        ctx.restore();
        flow();
        ctx.strokeStyle = '#7a1404';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        // cooling dark crust plates on the lower flow, a molten seam up the middle
        for (let i = 0; i < 5; i++) {
          const j = 4 + Math.floor(rand() * 6);
          const [mx, my] = mid[j];
          const o = (rand() - 0.5) * w1 * 0.9;
          blob(ctx, mx - Math.sin(dir) * o, my + Math.cos(dir) * o, 2.2 + rand() * 2.5, 0.6, rand, 6);
          ctx.fillStyle = rgba('#4a0e04', 0.65);
          ctx.fill();
        }
        trace(ctx, mid.slice(0, 8));
        ctx.strokeStyle = rgba('#fff4b0', 0.85);
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    }
    for (const [vx, vy, rot, s] of vents) {
      // the molten vent mouth
      at(ctx, vx, vy, rot, () => {
        ellipse(ctx, 0, 0, 22, 8.5);
        ctx.fillStyle = '#5a1406';
        ctx.fill();
        ellipse(ctx, 0, 0.6, 20, 7);
        const mg = ctx.createRadialGradient(0, 0, 1, 0, 0, 20);
        mg.addColorStop(0, '#fff6c0');
        mg.addColorStop(0.45, '#ffb02a');
        mg.addColorStop(1, '#ff6a12');
        ctx.fillStyle = mg;
        ctx.fill();
        // bubbling surface
        for (let i = 0; i < 4; i++) {
          ellipse(ctx, (rand() - 0.5) * 26, (rand() - 0.5) * 6, 2, 1.4);
          ctx.fillStyle = rgba('#fff8d0', 0.9);
          ctx.fill();
        }
      }, s);
      // soft smoke puffs rising from each vent
      for (let i = 0; i < 3; i++) {
        const px = vx + (rand() - 0.5) * 16 + i * 4 * Math.sign(rot || 1);
        const py = vy - 12 - i * 15 * s;
        const pr = (11 + i * 5) * s;
        const sg = ctx.createRadialGradient(px, py, 1, px, py, pr);
        sg.addColorStop(0, rgba('#5a5252', 0.42 - i * 0.08));
        sg.addColorStop(0.6, rgba('#8a8282', 0.22 - i * 0.04));
        sg.addColorStop(1, rgba('#8a8282', 0));
        ctx.fillStyle = sg;
        ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      }
    }
    // embers spitting out
    for (let i = 0; i < 16; i++) {
      const [vx, vy] = vents[Math.floor(rand() * 3)];
      ellipse(ctx, vx + (rand() - 0.5) * 60, vy - rand() * 50, 1.6 + rand() * 1.5, 1.6 + rand() * 1.5);
      ctx.fillStyle = rgba(rand() < 0.5 ? '#ffe07a' : '#ff6a1a', 0.95);
      ctx.fill();
    }
    ctx.restore();
  },
});

// ——— Pizza Piñata ———

registerTopping('pinataCrust', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    const r0 = 150;
    const R = PIZZA_R;
    const bands = ['#4ed05a', '#36a6ff', '#ffd23f', '#ff4f9e'];
    const bw = (R - r0) / bands.length;
    ctx.save();
    ringPath(ctx, r0, R);
    ctx.clip('evenodd');
    ctx.fillStyle = '#ff4f9e';
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    // rows of paper fringe, inner rows first so each outer row overlaps the one inside it
    bands.forEach((col, b) => {
      const ra = r0 + b * bw - 3;
      const rb = r0 + (b + 1) * bw + 2;
      const n = Math.round((TAU * rb) / 4.6);
      const off = rand() * TAU;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * TAU + (rand() - 0.5) * 0.01;
        const hw = (2.6 / rb) * (1 + rand() * 0.3);
        const tip = rb + rand() * 2.5;
        ctx.beginPath();
        ctx.moveTo(C + Math.cos(a - hw) * ra, C + Math.sin(a - hw) * ra);
        ctx.lineTo(C + Math.cos(a - hw * 0.8) * tip, C + Math.sin(a - hw * 0.8) * tip);
        ctx.lineTo(C + Math.cos(a + hw * 0.8) * tip, C + Math.sin(a + hw * 0.8) * tip);
        ctx.lineTo(C + Math.cos(a + hw) * ra, C + Math.sin(a + hw) * ra);
        ctx.closePath();
        ctx.fillStyle = shade(col, (rand() - 0.5) * 0.22);
        ctx.fill();
        ctx.strokeStyle = rgba(shade(col, -0.45), 0.55);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      // a shadow line under the next row out
      ctx.strokeStyle = rgba('#2a0e1a', 0.3);
      ctx.lineWidth = 2;
      ellipse(ctx, C, C, rb - 1, rb - 1);
      ctx.stroke();
    });
    // papery sheen on the top-left
    ctx.strokeStyle = rgba('#ffffff', 0.4);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(C, C, R - 14, Math.PI * 1.0, Math.PI * 1.6);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = rgba('#5a0e2a', 0.6);
    ctx.lineWidth = 3;
    ellipse(ctx, C, C, R, R);
    ctx.stroke();
    ctx.strokeStyle = rgba('#5a0e2a', 0.35);
    ctx.lineWidth = 2;
    ellipse(ctx, C, C, r0, r0);
    ctx.stroke();
  },
});

piece('candy', 1.15, {
  count: 14,
  minDist: 30,
  draw(ctx, rand) {
    const cols = ['#ff3a7a', '#ffb81a', '#3ab0ff', '#7ad83a', '#b05aff', '#ff6a2a'];
    const col = cols[Math.floor(rand() * cols.length)];
    if (rand() < 0.6) {
      // a wrapped sweet: round middle, twisted wrapper ends
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 6, 0);
        ctx.lineTo(s * 15, -6.5);
        ctx.quadraticCurveTo(s * 13, 0, s * 15, 6.5);
        ctx.closePath();
        drop(ctx, 0.3, 1.5, 2.5);
        ctx.fillStyle = shade(col, 0.3);
        ctx.fill();
        ctx.strokeStyle = shade(col, -0.45);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.strokeStyle = rgba('#ffffff', 0.6);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(s * 8, -1);
        ctx.lineTo(s * 13.5, -4);
        ctx.moveTo(s * 8, 1.5);
        ctx.lineTo(s * 13.5, 3.5);
        ctx.stroke();
      }
      ellipse(ctx, 0, 0, 8, 7);
      drop(ctx, 0.35, 1.5, 2.5);
      const g = ctx.createRadialGradient(-2.5, -2.5, 0.5, 0, 0, 8);
      g.addColorStop(0, shade(col, 0.45));
      g.addColorStop(1, col);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = shade(col, -0.45);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // candy stripe
      ctx.strokeStyle = rgba('#ffffff', 0.85);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, -0.4, Math.PI * 0.9);
      ctx.stroke();
      shine(ctx, -3, -3.5, 2.4, 1.1, 0.8);
    } else {
      // a glossy jelly bean
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.bezierCurveTo(-9, -7.5, 9, -7.5, 9, 0);
      ctx.bezierCurveTo(9, 6, 3, 5, 0, 3);
      ctx.bezierCurveTo(-3, 5, -9, 6, -9, 0);
      ctx.closePath();
      drop(ctx, 0.35, 1.5, 2.5);
      const g = ctx.createRadialGradient(-3, -3, 0.5, 0, 0, 10);
      g.addColorStop(0, shade(col, 0.45));
      g.addColorStop(0.7, col);
      g.addColorStop(1, shade(col, -0.2));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = shade(col, -0.45);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (rand() < 0.5) {
        ctx.fillStyle = rgba(shade(col, -0.4), 0.7);
        for (let i = 0; i < 5; i++) {
          ellipse(ctx, (rand() - 0.5) * 12, (rand() - 0.6) * 5, 0.8, 0.8);
          ctx.fill();
        }
      }
      shine(ctx, -3, -3.5, 3.5, 1.2, 0.85);
    }
  },
});

// ——— Haunted Hawaiian ———

piece('pineappleRing', 1.15, {
  count: 6,
  minDist: 70,
  draw(ctx, rand) {
    const R = 22;
    const r = 7;
    // faint ghost-light around the ring
    const halo = ctx.createRadialGradient(0, 0, r, 0, 0, R + 12);
    halo.addColorStop(0, rgba('#e8ffb0', 0.5));
    halo.addColorStop(1, rgba('#9aff7a', 0));
    ctx.fillStyle = halo;
    ellipse(ctx, 0, 0, R + 12, R + 12);
    ctx.fill();
    const ring = () => {
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.moveTo(r, 0);
      ctx.arc(0, 0, r, 0, TAU, true);
    };
    ring();
    ctx.save();
    ctx.translate(2, 3);
    ctx.fillStyle = rgba('#1a2a0a', 0.3);
    ctx.fill('evenodd');
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.88;
    ring();
    const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, R);
    g.addColorStop(0, '#fbffd0');
    g.addColorStop(0.6, '#eaf2a0');
    g.addColorStop(1, '#cfe078');
    ctx.fillStyle = g;
    ctx.fill('evenodd');
    // radial fibres
    ctx.strokeStyle = rgba('#b0c450', 0.55);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + rand() * 0.1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2));
      ctx.lineTo(Math.cos(a) * (R - 3), Math.sin(a) * (R - 3));
      ctx.stroke();
    }
    ctx.restore();
    // trimmed rind edge and core edge
    ctx.strokeStyle = '#c0d050';
    ctx.lineWidth = 2.5;
    ellipse(ctx, 0, 0, R - 1.5, R - 1.5);
    ctx.stroke();
    ctx.strokeStyle = shade('#d8e888', -0.45);
    ctx.lineWidth = 1.4;
    ellipse(ctx, 0, 0, R, R);
    ctx.stroke();
    ellipse(ctx, 0, 0, r, r);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, R - 5, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();
  },
});

registerTopping('hauntedGlow', {
  count: 1,
  draw(ctx, rand) {
    overlay(ctx);
    ctx.save();
    clipPizza(ctx);
    // a sickly green cast over everything
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = rgba('#7ad05a', 0.12);
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.globalCompositeOperation = 'multiply';
    const vg = ctx.createRadialGradient(C, C, 60, C, C, PIZZA_R);
    vg.addColorStop(0, '#ffffff');
    vg.addColorStop(1, '#6a8a5a');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 5; i++) {
      const a = rand() * TAU;
      const d = rand() * 100;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const r = 40 + rand() * 40;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, rgba('#5aff7a', 0.3));
      g.addColorStop(1, rgba('#5aff7a', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 5; i++) {
      const a = rand() * TAU;
      const d = 30 + rand() * 95;
      wisp(ctx, wispPts(C + Math.cos(a) * d, C + Math.sin(a) * d, rand() * TAU, 55 + rand() * 50, rand), '#d8ffd0', '#6aff7a', 6);
    }
    // two little mist ghosts peeping out of the glow
    for (const [x, y] of spread(2, 120, rand, 110)) {
      ctx.save();
      ctx.shadowColor = '#6aff7a';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 12, Math.PI, 0);
      ctx.lineTo(x + 12, y + 12);
      ctx.quadraticCurveTo(x + 6, y + 6, x, y + 14);
      ctx.quadraticCurveTo(x - 6, y + 6, x - 12, y + 12);
      ctx.closePath();
      ctx.fillStyle = rgba('#d8ffd0', 0.55);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = rgba('#0e2a10', 0.85);
      ellipse(ctx, x - 4.5, y - 2, 2.4, 3.4);
      ctx.fill();
      ellipse(ctx, x + 4.5, y - 2, 2.4, 3.4);
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.shadowColor = '#8aff9a';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = rgba('#c8ffc0', 0.5);
    ctx.lineWidth = 3;
    ellipse(ctx, C, C, PIZZA_R - 3, PIZZA_R - 3);
    ctx.stroke();
    ctx.restore();
  },
});
