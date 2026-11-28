// Act 4's Legendaries' show-piece living peels (docs/pizza-plan.md, section 15), plugged into the pizza peels' living
// pie (LEGEND_PEEL in src/art/peelPizza.ts):
// - Pigeon King's Catch: Old Town's gas-lamp glow on a night-blue board, the King's pigeon circling the pie (behind it
//   at the back, in front at the front), wings beating, a feather drifting; its smack sends the pigeon swooping down
//   across the board, talons out, feathers bursting.
// - Second Rise: a warm proving glow, bubbles swelling and popping in the dough round the pie, flour hanging; its
//   smack puffs the dough up round the board in a ring that swells, then settles, flour bursting.
// - Cathedral Crust: the rose window glowing behind the pie, shafts of its coloured light, stone dust drifting; its
//   smack rings out: the window flares, stone chips and shards of glass burst off the board.
// Cosmetic only (crand); calmer with reduced motion.

import { LEGEND_PEEL } from '../../art/peelPizza';
import { drawDoughBubble, drawLightShaft, drawPigeonFrame, drawRoseWindow, PIGEON_FRAMES } from '../../art/perkPropsLegend4';
import { type Ctx } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';

const TAU = Math.PI * 2;
const calm = () => !!save.settings.reducedMotion;

function glow(ctx: Ctx, x: number, y: number, r: number, rgb: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.55, `rgba(${rgb},${a * 0.45})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

const cache: Record<string, HTMLCanvasElement> = {};
const art = (k: string, d: () => HTMLCanvasElement) => (cache[k] ??= d());

/** Draw a sprite centred on (x, y), `w` wide, turned `rot`, at `a` (flipped across if `fx`). */
function sprite(ctx: Ctx, img: HTMLCanvasElement, x: number, y: number, w: number, rot = 0, a = 1, ox = 0.5, oy = 0.5, sy = 1, fx = false): void {
  const h = (w * img.height) / img.width;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(fx ? -1 : 1, sy);
  ctx.drawImage(img, -w * ox, -h * oy, w, h);
  ctx.restore();
}

// ════════════════════════════ Pigeon King's Catch ════════════════════════════

/** The pigeon's place on its loop round the pie (peel units): behind it at the back. After a smack it swoops down
 *  across the board, talons out. */
function bird(l: { t: number; sm: number; mini: { cx: number; cy: number; pr: number } }): { x: number; y: number; back: boolean; fr: number; right: boolean; rot: number } {
  const m = l.mini;
  const sw = l.sm < 0.7 ? l.sm / 0.7 : -1;
  if (sw >= 0) {
    // the swoop: in from the top right, down over the front of the pie, away to the left
    const x = m.cx + m.pr * (1.6 - sw * 3.2);
    const y = m.cy - m.pr * 1.1 + Math.sin(sw * Math.PI) * m.pr * 1.3;
    return { x, y, back: false, fr: sw > 0.35 && sw < 0.6 ? 4 : Math.floor(l.t * 18) % 4, right: false, rot: (sw - 0.5) * -0.6 };
  }
  const a = l.t * (calm() ? 0.25 : 0.7);
  const x = m.cx + Math.cos(a) * m.pr * 1.25;
  const y = m.cy - m.pr * 0.25 + Math.sin(a) * m.pr * 0.5;
  // (it flies anticlockwise: facing right when it's crossing the back)
  return { x, y, back: Math.sin(a) < 0, fr: calm() ? 2 : Math.floor(l.t * 8) % 4, right: -Math.sin(a) > 0, rot: 0 };
}

LEGEND_PEEL.pigeoncatch = {
  back(ctx, l) {
    const m = l.mini;
    const hit = Math.max(0, 1 - l.sm / 0.7);
    const fl = calm() ? 0 : 0.6 * Math.sin(l.t * 1.3) + 0.4 * Math.sin(l.t * 3.7 + 1);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.6, '58,74,138', 0.3);
    glow(ctx, m.cx + m.pr * 0.3, m.cy - m.pr * 0.3, m.pr * 1.35, '255,184,90', 0.3 + 0.05 * fl + 0.25 * hit);
    ctx.globalCompositeOperation = 'source-over';
    const b = bird(l);
    if (b.back) sprite(ctx, art(`pg${b.fr}`, () => drawPigeonFrame(b.fr % PIGEON_FRAMES)), b.x, b.y, m.pr * 0.62, b.rot, 0.9, 0.5, 0.5, 1, !b.right);
  },
  front(ctx, l) {
    const m = l.mini;
    const b = bird(l);
    if (!b.back) sprite(ctx, art(`pg${b.fr}`, () => drawPigeonFrame(b.fr % PIGEON_FRAMES)), b.x, b.y, m.pr * (l.sm < 0.7 ? 0.8 : 0.66), b.rot, 1, 0.5, 0.5, 1, !b.right);
  },
  tick(l, dt) {
    // a feather off it now and then
    if (!calm() && crand() < dt * 0.8) {
      const b = bird(l);
      l.emit('flake', b.x, b.y + 6, (crand() - 0.5) * 20, 20 + crand() * 20, 6, 5, 1.6, { grav: 20, drag: 1, spin: (crand() - 0.5) * 3 });
    }
  },
  smack(l) {
    const m = l.mini;
    const n = calm() ? 5 : 14;
    for (let i = 0; i < n; i++) {
      const a = crand() * TAU;
      const v = 60 + crand() * 160;
      l.emit(i % 3 ? 'flake' : 'mote', m.cx + (crand() - 0.5) * m.pr, m.cy - m.pr * 0.2, Math.cos(a) * v, Math.sin(a) * v - 40, 7, 5, 0.9 + crand() * 0.5, { grav: 80, drag: 1.2, spin: (crand() - 0.5) * 6 });
    }
  },
};

// ════════════════════════════ Second Rise ════════════════════════════

LEGEND_PEEL.secondrise = {
  back(ctx, l) {
    const m = l.mini;
    const hit = Math.max(0, 1 - l.sm / 0.8);
    const br = calm() ? 0 : Math.sin(l.t * 0.9);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.5 * (1 + 0.03 * br), '255,208,138', 0.3 + 0.05 * br + 0.3 * hit);
    ctx.globalCompositeOperation = 'source-over';
    // the dough's ring round the pie: swelling with the smack, then settling
    const sw = l.sm < 0.8 ? Math.sin((l.sm / 0.8) * Math.PI) : 0;
    ctx.strokeStyle = `rgba(244,220,170,${0.5 + 0.3 * sw})`;
    ctx.lineWidth = m.pr * (0.1 + 0.08 * sw);
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, m.pr * (1.08 + 0.12 * sw + 0.01 * br), 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `rgba(122,76,34,${0.35 + 0.2 * sw})`;
    ctx.lineWidth = Math.max(1, m.pr * 0.02);
    ctx.stroke();
    // bubbles swelling in it, each popping in turn
    const bub = art('bubble', drawDoughBubble);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + 0.3;
      const u = calm() ? 0.6 : (l.t * 0.45 + i * 0.37 + sw * 0.5) % 1;
      const s = Math.pow(u, 1.6);
      sprite(ctx, bub, m.cx + Math.cos(a) * m.pr * (1.08 + 0.12 * sw), m.cy + Math.sin(a) * m.pr * (1.08 + 0.12 * sw), m.pr * (0.05 + 0.13 * s), 0, Math.min(1, u * 6));
    }
  },
  tick(l, dt) {
    const m = l.mini;
    // flour hanging in the air
    if (crand() < dt * (calm() ? 1 : 3)) {
      const a = crand() * TAU;
      l.emit('mist', m.cx + Math.cos(a) * m.pr * 1.1, m.cy + Math.sin(a) * m.pr, (crand() - 0.5) * 10, -12, 8, 14, 1.6, { grav: -6, drag: 0.6, a: 0.4 });
    }
  },
  smack(l) {
    const m = l.mini;
    const n = calm() ? 6 : 18;
    for (let i = 0; i < n; i++) {
      const a = crand() * TAU;
      const v = 80 + crand() * 140;
      l.emit(i % 2 ? 'mist' : 'speck', m.cx + Math.cos(a) * m.pr * 1.1, m.cy + Math.sin(a) * m.pr * 1.05, Math.cos(a) * v, Math.sin(a) * v - 40, 8, 16, 0.8 + crand() * 0.4, { grav: 30, drag: 1.4, a: 0.7 });
    }
  },
};

// ════════════════════════════ Cathedral Crust ════════════════════════════

LEGEND_PEEL.cathedralcrust = {
  back(ctx, l) {
    const m = l.mini;
    const hit = Math.max(0, 1 - l.sm / 0.8);
    const br = calm() ? 0 : Math.sin(l.t * 0.7);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.55, '180,138,255', 0.24 + 0.05 * br + 0.3 * hit);
    // the rose window behind the pie, turning slowly, flaring with the smack
    sprite(ctx, art('rose', () => drawRoseWindow(220)), m.cx, m.cy, m.pr * (2.5 + 0.2 * hit), l.t * (calm() ? 0.02 : 0.08), 0.42 + 0.4 * hit);
    // shafts of its light slanting down
    const sh = art('shaft', drawLightShaft);
    for (let i = 0; i < 2; i++) {
      const ph = Math.max(0, Math.sin(l.t * 0.8 + i * 2));
      sprite(ctx, sh, m.cx + (i - 0.5) * m.pr * 0.9, m.cy + m.pr * 0.2, m.pr * 0.7, 0.32, 0.35 + 0.2 * ph + 0.3 * hit, 0.5, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  tick(l, dt) {
    const m = l.mini;
    // stone dust drifting down through the light
    if (crand() < dt * (calm() ? 1 : 3)) {
      l.emit('speck', m.cx + (crand() - 0.6) * m.pr * 1.6, m.cy - m.pr * (0.9 + crand() * 0.4), 6 + crand() * 6, 14 + crand() * 10, 3, 2, 2.2, { grav: 4, drag: 0.4, a: 0.6 });
    }
  },
  smack(l) {
    const m = l.mini;
    const n = calm() ? 6 : 16;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * 2.8;
      const v = 120 + crand() * 200;
      l.emit(i % 3 ? 'flake' : 'sparkV', m.cx + Math.cos(a) * m.pr * 0.9, m.cy + Math.sin(a) * m.pr * 0.9, Math.cos(a) * v, Math.sin(a) * v, 7, 4, 0.7 + crand() * 0.4, { grav: 400, drag: 0.6, spin: (crand() - 0.5) * 10 });
    }
  },
};
