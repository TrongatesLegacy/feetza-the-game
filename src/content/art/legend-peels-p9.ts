// Act 2's Legendaries' show-piece living peels (docs/pizza-plan.md, section 13), plugged into the pizza peels' living
// pie (LEGEND_PEEL in src/art/peelPizza.ts):
// - Big Top Pie: a warm spotlight sweeping behind the pie, marquee bulbs chasing round it, confetti; its smack fires
//   King Honk's cannon from beside the board, the cream pie flying across, confetti bursting.
// - Sandcastle Citadel: a sandy glow, sand swirling round the pie, Sam's pennant fluttering on a sand tower behind it;
//   its smack throws up the citadel's wall across the board in a spray of sand.
// - Tidal Tiki: the sea under the pie and the surf lapping round it in foam; its smack sends a wave breaking over the
//   board, spray and foam flying.
// Cosmetic only (crand); calmer with reduced motion.

import { LEGEND_PEEL } from '../../art/peelPizza';
import { drawCannonBarrel, drawCannonPie, drawCitadelWall, drawFoam, drawPennant, drawTideWave } from '../../art/perkPropsLegend2';
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
function sprite(ctx: Ctx, img: HTMLCanvasElement, x: number, y: number, w: number, rot = 0, a = 1, ox = 0.5, oy = 0.5, flipY = 1): void {
  const h = (w * img.height) / img.width;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, flipY);
  ctx.drawImage(img, -w * ox, -h * oy, w, h);
  ctx.restore();
}

// ════════════════════════════ Big Top Pie ════════════════════════════

LEGEND_PEEL.bigtoppie = {
  back(ctx, l) {
    const m = l.mini;
    const hit = Math.max(0, 1 - l.sm / 0.6);
    const sw = calm() ? 0 : Math.sin(l.t * 0.7);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.5, '255,90,104', 0.2 + 0.3 * hit);
    // the spotlight sweeping behind it, and its beam
    glow(ctx, m.cx + sw * m.pr * 0.6, m.cy, m.pr * 1.05, '255,242,200', 0.34 + 0.2 * hit);
    const g = ctx.createLinearGradient(0, m.cy - m.pr * 2, 0, m.cy);
    g.addColorStop(0, 'rgba(255,242,200,0)');
    g.addColorStop(1, 'rgba(255,242,200,0.18)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(m.cx + sw * m.pr * 0.6 - m.pr * 0.55, m.cy);
    ctx.lineTo(m.cx + sw * m.pr * 0.2 - m.pr * 0.2, m.cy - m.pr * 2);
    ctx.lineTo(m.cx + sw * m.pr * 0.2 + m.pr * 0.2, m.cy - m.pr * 2);
    ctx.lineTo(m.cx + sw * m.pr * 0.6 + m.pr * 0.55, m.cy);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // the marquee bulbs chasing round it
    const n = 16;
    const step = calm() ? 0 : Math.floor(l.t * 6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const x = m.cx + Math.cos(a) * m.pr * 1.12;
      const y = m.cy + Math.sin(a) * m.pr * 1.12;
      const on = hit > 0.3 || (i + step) % 3 === 0;
      ctx.globalCompositeOperation = 'lighter';
      if (on) glow(ctx, x, y, m.pr * 0.12, '255,224,138', 0.8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = on ? '#fff6c0' : '#c8a040';
      ctx.beginPath();
      ctx.arc(x, y, m.pr * 0.03, 0, TAU);
      ctx.fill();
    }
  },
  front(ctx, l) {
    // the cannon's shot after a smack: it fires from the board's lower right, the pie flying across the top
    const u = l.sm / 0.6;
    if (u >= 1) return;
    const m = l.mini;
    const bx = m.cx + m.pr * 1.05;
    const by = m.cy + m.pr * 0.85;
    const kick = u < 0.15 ? Math.sin((u / 0.15) * Math.PI) * 0.08 : 0;
    sprite(ctx, art('barrel', drawCannonBarrel), bx, by, m.pr * 1.4, -2.4 + kick, u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25, 0.16, 0.5);
    if (u > 0.05) {
      const v = Math.min(1, (u - 0.05) / 0.5);
      const px = bx - m.pr * 2.2 * v;
      const py = by - m.pr * 1.6 * v - Math.sin(v * Math.PI) * m.pr * 0.5;
      if (v < 1) sprite(ctx, art('pie', drawCannonPie), px, py, m.pr * 0.55, -v * 6, 1);
    }
  },
  tick(l, dt) {
    const m = l.mini;
    // confetti fluttering down round it
    if (crand() < dt * (calm() ? 1.2 : 3)) {
      const a = crand() * TAU;
      l.emit('confetti', m.cx + Math.cos(a) * m.pr * (0.9 + crand() * 0.3), m.cy - m.pr * (0.6 + crand() * 0.6), (crand() - 0.5) * 14, 22, 7, 7, 1.8 + crand(), { grav: 30, drag: 1, spin: (crand() - 0.5) * 10 });
    }
  },
  smack(l) {
    const m = l.mini;
    const n = calm() ? 6 : 16;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * 2.8;
      const v = 120 + crand() * 160;
      l.emit('confetti', m.cx + m.pr * 0.9, m.cy + m.pr * 0.6, Math.cos(a) * v - 60, Math.sin(a) * v - 60, 8, 8, 0.8 + crand() * 0.4, { grav: 420, drag: 0.8, spin: (crand() - 0.5) * 16 });
    }
    for (let i = 0; i < (calm() ? 2 : 5); i++) l.emit('mist', m.cx + m.pr * 0.9, m.cy + m.pr * 0.6, (crand() - 0.7) * 60, -30, 12, 30, 0.7, { grav: -20, drag: 2, a: 0.6, rot: 0, spin: 0 });
  },
};

// ════════════════════════════ Sandcastle Citadel ════════════════════════════

LEGEND_PEEL.sandcastlecitadel = {
  back(ctx, l) {
    const m = l.mini;
    const hit = Math.max(0, 1 - l.sm / 0.6);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.5, '242,192,112', 0.26 + 0.04 * Math.sin(l.t * 1.3) + 0.3 * hit);
    ctx.globalCompositeOperation = 'source-over';
    // Sam's pennant on a sand tower behind the pie, fluttering
    const tx = m.cx + m.pr * 0.78;
    const ty = m.cy - m.pr * 0.62;
    ctx.fillStyle = '#e4b468';
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = Math.max(1.2, m.pr * 0.03);
    ctx.beginPath();
    ctx.moveTo(tx - m.pr * 0.14, ty + m.pr * 0.3);
    ctx.lineTo(tx - m.pr * 0.12, ty - m.pr * 0.08);
    for (let i = 0; i < 3; i++) {
      const x = tx - m.pr * 0.12 + i * m.pr * 0.09;
      ctx.lineTo(x, ty - m.pr * 0.14);
      ctx.lineTo(x + m.pr * 0.05, ty - m.pr * 0.14);
      ctx.lineTo(x + m.pr * 0.05, ty - m.pr * 0.08);
      ctx.lineTo(x + m.pr * 0.09, ty - m.pr * 0.08);
    }
    ctx.lineTo(tx + m.pr * 0.14, ty + m.pr * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx, ty - m.pr * 0.14);
    ctx.lineTo(tx, ty - m.pr * 0.5);
    ctx.stroke();
    const flut = calm() ? 1 : 0.85 + 0.15 * Math.sin(l.t * 7);
    sprite(ctx, art('pennant', drawPennant), tx, ty - m.pr * 0.42, m.pr * 0.32 * flut, calm() ? 0 : 0.05 * Math.sin(l.t * 5), 1, 0.04, 0.5);
  },
  front(ctx, l) {
    // the citadel's wall thrown up across the front of the board after a smack, then sinking back into the sand
    const u = l.sm / 0.7;
    if (u >= 1) return;
    const m = l.mini;
    const rise = u < 0.2 ? u / 0.2 : u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
    const img = art('wall', drawCitadelWall);
    const w = m.pr * 2.1;
    const h = (w * img.height) / img.width;
    ctx.save();
    ctx.beginPath();
    ctx.rect(m.cx - w, m.cy + m.pr * 1.15 - h * 1.2, w * 2, h * 1.2);
    ctx.clip();
    ctx.drawImage(img, m.cx - w / 2, m.cy + m.pr * 1.15 - h * rise, w, h);
    ctx.restore();
  },
  tick(l, dt) {
    const m = l.mini;
    // sand swirling round it
    if (crand() < dt * (calm() ? 1.5 : 5)) {
      const a = crand() * TAU;
      l.emit('speck', m.cx + Math.cos(a) * m.pr * 1.05, m.cy + Math.sin(a) * m.pr * 0.95, -Math.sin(a) * 40, Math.cos(a) * 30 - 10, 4, 3, 0.9 + crand() * 0.5, { grav: 20, drag: 0.6 });
    }
  },
  smack(l) {
    const m = l.mini;
    const n = calm() ? 6 : 16;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * 2.6;
      const v = 90 + crand() * 160;
      l.emit('crumb', m.cx + (crand() - 0.5) * m.pr * 1.6, m.cy + m.pr * 0.8, Math.cos(a) * v, Math.sin(a) * v - 60, 6 + crand() * 4, 5, 0.6 + crand() * 0.3, { grav: 620, drag: 0.5, spin: (crand() - 0.5) * 12 });
    }
  },
};

// ════════════════════════════ Tidal Tiki ════════════════════════════

LEGEND_PEEL.tidaltiki = {
  back(ctx, l) {
    const m = l.mini;
    const hit = Math.max(0, 1 - l.sm / 0.6);
    const beat = calm() ? 0.5 : (Math.sin(l.t * 2.4) + 1) / 2;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.5, '74,216,224', 0.26 + 0.08 * beat + 0.3 * hit);
    ctx.globalCompositeOperation = 'source-over';
    // the surf lapping round it: a ring of water and its foam, breathing in and out
    const foam = art('foam', drawFoam);
    const r = m.pr * (1.04 + 0.07 * beat);
    ctx.save();
    ctx.strokeStyle = `rgba(138,240,240,${0.25 + 0.3 * (1 - beat)})`;
    ctx.lineWidth = m.pr * 0.07;
    ctx.beginPath();
    ctx.ellipse(m.cx, m.cy, r, r * 0.96, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + l.t * (calm() ? 0.02 : 0.1);
      sprite(ctx, foam, m.cx + Math.cos(a) * r, m.cy + Math.sin(a) * r * 0.96, m.pr * (0.16 + 0.06 * Math.sin(i * 2.3)), 0, 0.4 + 0.5 * (1 - beat));
    }
  },
  front(ctx, l) {
    // a wave breaking over the board after a smack, from the left
    const u = l.sm / 0.7;
    if (u >= 1) return;
    const m = l.mini;
    const img = art('tide', drawTideWave);
    const w = m.pr * 2.6;
    const x = m.cx - m.pr * 2.4 + u * m.pr * 3.6;
    sprite(ctx, img, x, m.cy + m.pr * 1.1, w, 0, u < 0.7 ? 0.85 : 0.85 * (1 - (u - 0.7) / 0.3), 0.5, 1);
  },
  tick(l, dt) {
    const m = l.mini;
    if (!calm() && crand() < dt * 1.4) {
      const a = crand() * TAU;
      l.emit('mist', m.cx + Math.cos(a) * m.pr * 1.08, m.cy + Math.sin(a) * m.pr, 0, -10, 6, 12, 0.8, { grav: -5, drag: 1, a: 0.6, rot: 0, spin: 0 });
    }
  },
  smack(l) {
    const m = l.mini;
    const n = calm() ? 5 : 14;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * 2.6;
      const v = 100 + crand() * 170;
      l.emit('mist', m.cx + (crand() - 0.5) * m.pr, m.cy - m.pr * 0.2, Math.cos(a) * v, Math.sin(a) * v - 40, 7, 16, 0.6 + crand() * 0.3, { grav: 380, drag: 0.8, a: 0.85, rot: 0, spin: 0 });
    }
  },
};
