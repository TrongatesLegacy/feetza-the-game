// Act 3's Legendaries' show-piece living peels (docs/pizza-plan.md, section 14), plugged into the pizza peels' living
// pie (LEGEND_PEEL in src/art/peelPizza.ts):
// - Cosmic Crouton Supreme: a violet nebula glow, stars twinkling, the crouton moon tumbling round the pie on its
//   orbit (behind it at the back, in front at the front); its smack tears a crouton portal open beside the board,
//   stars streaking into it, and it snaps shut.
// - Roar Roast: the Lodge's firelight flickering, a ring of glowing coals round the pie, heat shimmer; its smack makes
//   the hearth roar up behind the board, embers flying.
// - Black Olive Hole: a void round the pie and the accretion disc turning behind it, its photon ring on the rim, stars
//   falling in; its smack opens the event horizon at the olive, the disc flaring round it, then it closes.
// Cosmetic only (crand); calmer with reduced motion.

import { LEGEND_PEEL } from '../../art/peelPizza';
import { CROUTON_FRAMES, drawAccretionDisc, drawCoal, drawCroutonFrame, drawEventHorizon, drawHearthFlame, drawHeatShimmer, drawPortal } from '../../art/perkPropsLegend3';
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

/** Draw a sprite centred on (x, y), `w` wide, turned `rot`, at `a`. */
function sprite(ctx: Ctx, img: HTMLCanvasElement, x: number, y: number, w: number, rot = 0, a = 1, ox = 0.5, oy = 0.5, sy = 1): void {
  const h = (w * img.height) / img.width;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, sy);
  ctx.drawImage(img, -w * ox, -h * oy, w, h);
  ctx.restore();
}

// ════════════════════════════ Cosmic Crouton Supreme ════════════════════════════

/** The crouton moon's place on its orbit round the pie (peel units), and whether it's behind it. */
function moon(l: { t: number; sm: number; mini: { cx: number; cy: number; pr: number } }): { x: number; y: number; back: boolean; fr: number } {
  const m = l.mini;
  const hit = Math.max(0, 1 - l.sm / 0.6);
  const a = l.t * (calm() ? 0.3 : 0.8) + hit * 2;
  return { x: m.cx + Math.cos(a) * m.pr * 1.22, y: m.cy + Math.sin(a) * m.pr * 0.5, back: Math.sin(a) < 0, fr: calm() ? 0 : Math.floor(l.t * 9) % CROUTON_FRAMES };
}

LEGEND_PEEL.cosmiccrouton = {
  back(ctx, l) {
    const m = l.mini;
    const hit = Math.max(0, 1 - l.sm / 0.6);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.55, '138,124,255', 0.24 + 0.3 * hit);
    glow(ctx, m.cx + Math.sin(l.t * 0.3) * m.pr * 0.2, m.cy, m.pr * 1.25, '43,61,143', 0.3);
    // stars twinkling round it
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + 0.4;
      const tw = calm() ? 0.5 : Math.max(0, Math.sin(l.t * (1.3 + (i % 3) * 0.5) + i * 1.7));
      glow(ctx, m.cx + Math.cos(a) * m.pr * 1.3, m.cy + Math.sin(a) * m.pr * 1.25, m.pr * (0.05 + 0.06 * tw), i % 3 ? '255,255,255' : '125,249,255', 0.4 + 0.6 * tw);
    }
    ctx.globalCompositeOperation = 'source-over';
    // its orbit, faint
    ctx.strokeStyle = `rgba(125,249,255,${0.18 + 0.3 * hit})`;
    ctx.lineWidth = Math.max(1, m.pr * 0.02);
    ctx.beginPath();
    ctx.ellipse(m.cx, m.cy, m.pr * 1.22, m.pr * 0.5, 0, 0, TAU);
    ctx.stroke();
    const mo = moon(l);
    if (mo.back) sprite(ctx, art(`cr${mo.fr}`, () => drawCroutonFrame(mo.fr)), mo.x, mo.y, m.pr * 0.42);
  },
  front(ctx, l) {
    const m = l.mini;
    const mo = moon(l);
    if (!mo.back) sprite(ctx, art(`cr${mo.fr}`, () => drawCroutonFrame(mo.fr)), mo.x, mo.y, m.pr * 0.46);
    // the portal after a smack: it opens beside the board, turns, and snaps shut
    const u = l.sm / 0.75;
    if (u >= 1) return;
    const open = u < 0.25 ? u / 0.25 : u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
    const px = m.cx + m.pr * 0.95;
    const py = m.cy - m.pr * 0.85;
    sprite(ctx, art('portal', drawPortal), px, py, m.pr * 1.1 * open, -u * 6, 0.95);
  },
  tick(l, dt) {
    // stardust shed by the moon
    if (!calm() && crand() < dt * 6) {
      const mo = moon(l);
      l.emit('sparkV', mo.x, mo.y, (crand() - 0.5) * 20, (crand() - 0.5) * 20, 5, 2, 0.5, { grav: 0, drag: 1 });
    }
  },
  smack(l) {
    const m = l.mini;
    const px = m.cx + m.pr * 0.95;
    const py = m.cy - m.pr * 0.85;
    const n = calm() ? 5 : 14;
    for (let i = 0; i < n; i++) {
      const a = crand() * TAU;
      const d = m.pr * (0.9 + crand() * 0.6);
      // stars streaking into it
      l.emit(i % 2 ? 'sparkB' : 'sparkV', px + Math.cos(a) * d, py + Math.sin(a) * d, -Math.cos(a) * d * 2.2, -Math.sin(a) * d * 2.2, 6, 1, 0.42, { grav: 0, drag: 0 });
    }
  },
};

// ════════════════════════════ Roar Roast ════════════════════════════

LEGEND_PEEL.roarroast = {
  back(ctx, l) {
    const m = l.mini;
    const hit = Math.max(0, 1 - l.sm / 0.7);
    const fl = calm() ? 0 : 0.5 * Math.sin(l.t * 2.3) + 0.3 * Math.sin(l.t * 6.1 + 1) + 0.2 * Math.sin(l.t * 13.3);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.55, '255,106,26', 0.28 + 0.06 * fl + 0.3 * hit);
    ctx.globalCompositeOperation = 'source-over';
    // the hearth roaring up behind the board after a smack
    if (hit > 0) {
      const u = l.sm / 0.7;
      const rise = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
      const fr = Math.floor(l.t * 14) % 3;
      sprite(ctx, art(`flame${fr}`, () => drawHearthFlame(fr / 3)), m.cx, m.cy + m.pr * 0.2, m.pr * 1.5, 0, 0.95 * rise, 0.5, 1, rise);
    }
    // heat shimmer off its back
    const sh = art('shimmer', drawHeatShimmer);
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      const ph = (l.t * 0.5 + i * 0.5) % 1;
      sprite(ctx, sh, m.cx + side * m.pr * 0.55, m.cy - m.pr * (0.55 + ph * 0.5), m.pr * 0.3, 0, calm() ? 0.3 : 0.5 * Math.sin(ph * Math.PI), 0.5, 1);
    }
    // the coals round it, each breathing
    const coal = art('coal', drawCoal);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.2;
      const br = calm() ? 0.5 : (Math.sin(l.t * 1.7 + i * 1.3) + 1) / 2;
      const x = m.cx + Math.cos(a) * m.pr * 1.12;
      const y = m.cy + Math.sin(a) * m.pr * 1.08;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y, m.pr * (0.12 + 0.05 * br + 0.06 * hit), '255,120,40', 0.3 + 0.4 * br);
      ctx.globalCompositeOperation = 'source-over';
      sprite(ctx, coal, x, y, m.pr * 0.2, i * 1.1);
    }
  },
  tick(l, dt) {
    const m = l.mini;
    if (crand() < dt * (calm() ? 1.2 : 4)) {
      const a = crand() * TAU;
      l.emit('ember', m.cx + Math.cos(a) * m.pr * 1.05, m.cy + Math.sin(a) * m.pr, (crand() - 0.5) * 20, -50 - crand() * 40, 7, 2, 1 + crand() * 0.5, { grav: -40, drag: 0.8 });
    }
  },
  smack(l) {
    const m = l.mini;
    const n = calm() ? 6 : 18;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * 2.4;
      const v = 120 + crand() * 180;
      l.emit('ember', m.cx + (crand() - 0.5) * m.pr, m.cy - m.pr * 0.3, Math.cos(a) * v, Math.sin(a) * v, 9, 2, 0.7 + crand() * 0.4, { grav: -60, drag: 1 });
    }
  },
};

// ════════════════════════════ Black Olive Hole ════════════════════════════

LEGEND_PEEL.blackolivehole = {
  back(ctx, l) {
    const m = l.mini;
    const hit = Math.max(0, 1 - l.sm / 0.8);
    // the void round it, the light bent away
    const v = ctx.createRadialGradient(m.cx, m.cy, m.pr * 0.9, m.cx, m.cy, m.pr * 1.4);
    v.addColorStop(0, 'rgba(4,2,10,0.55)');
    v.addColorStop(1, 'rgba(4,2,10,0)');
    ctx.fillStyle = v;
    ctx.fillRect(m.cx - m.pr * 1.4, m.cy - m.pr * 1.4, m.pr * 2.8, m.pr * 2.8);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.4, '255,166,74', 0.22 + 0.35 * hit);
    // the accretion disc turning behind the pie
    sprite(ctx, art('disc', drawAccretionDisc), m.cx, m.cy, m.pr * 2.6 * (1 + 0.1 * hit), -l.t * (calm() ? 0.1 : 0.45 + 2 * hit), 0.75);
    ctx.globalCompositeOperation = 'source-over';
  },
  front(ctx, l) {
    const m = l.mini;
    // the photon ring on its rim: a thin bright line hugging the crust
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,232,192,0.45)';
    ctx.lineWidth = Math.max(1, m.pr * 0.025);
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, m.pr * 1.01, 0, TAU);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    // the event horizon opening at the olive after a smack, the disc flaring round it, then closing
    const u = l.sm / 0.8;
    if (u >= 1) return;
    const open = u < 0.25 ? u / 0.25 : u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
    ctx.globalCompositeOperation = 'lighter';
    sprite(ctx, art('disc', drawAccretionDisc), m.cx, m.cy, m.pr * 1.6 * open, l.t * 3, 0.9, 0.5, 0.5, 0.4);
    ctx.globalCompositeOperation = 'source-over';
    sprite(ctx, art('horizon', drawEventHorizon), m.cx, m.cy, m.pr * 1.2 * open, 0, 1);
  },
  tick(l, dt) {
    const m = l.mini;
    // stars falling in
    if (crand() < dt * (calm() ? 1.5 : 5)) {
      const a = crand() * TAU;
      const d = m.pr * (1.5 + crand() * 0.4);
      l.emit('sparkG', m.cx + Math.cos(a) * d, m.cy + Math.sin(a) * d, -Math.cos(a) * d * 1.2, -Math.sin(a) * d * 1.2, 4, 1, 0.45, { grav: 0, drag: 0 });
    }
  },
  smack(l) {
    const m = l.mini;
    const n = calm() ? 6 : 18;
    for (let i = 0; i < n; i++) {
      const a = crand() * TAU;
      const d = m.pr * (1.2 + crand() * 0.8);
      l.emit(i % 2 ? 'sparkG' : 'mote', m.cx + Math.cos(a) * d, m.cy + Math.sin(a) * d, -Math.cos(a) * d * 2.4, -Math.sin(a) * d * 2.4, 6, 1, 0.38, { grav: 0, drag: 0 });
    }
  },
};
