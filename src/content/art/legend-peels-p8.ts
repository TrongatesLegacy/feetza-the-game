// The first Legendaries' show-piece living peels (docs/pizza-plan.md, section 1: "plus its aura on the peel and a
// show-piece smack in its style"), plugged into the pizza peels' living pie (LEGEND_PEEL in src/art/peelPizza.ts):
// - Nonna's Masterpiece: the oven's warm glow behind the pie, flour drifting off it; its smack swings Nonna's ladle
//   across the board, ragù and flour flying.
// - Silver Service: a cool silver light and the Head Waiter's tray circling the pie (behind it at the back, in front at
//   the front); its smack sends the tray spinning round, flashing.
// - The First Bake: a golden glow with slow rays, steam rising off it, a shimmer round its crust; its smack breathes
//   out the oven's heat: a gold flash, steam and embers.
// Cosmetic only (crand); calmer with reduced motion.

import { LEGEND_PEEL, type PizzaLive } from '../../art/peelPizza';
import { drawLadle, drawSilverTray } from '../../art/perkPropsLegend';
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

let ladleImg: HTMLCanvasElement | null = null;
let trayImg: HTMLCanvasElement | null = null;
const ladle = () => (ladleImg ??= drawLadle());
const tray = () => (trayImg ??= drawSilverTray());

// ════════════════════════════ Nonna's Masterpiece ════════════════════════════

LEGEND_PEEL.nonnasmasterpiece = {
  back(ctx, l) {
    const m = l.mini;
    const fl = calm() ? 0 : 0.5 * Math.sin(l.t * 2.1) + 0.3 * Math.sin(l.t * 5.3 + 1);
    const hit = Math.max(0, 1 - l.sm / 0.6);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.55, '255,140,58', 0.32 + 0.05 * fl + 0.3 * hit);
    glow(ctx, m.cx, m.cy - m.pr * 0.45, m.pr * 1.1, '255,90,26', 0.16 + 0.05 * fl);
    ctx.globalCompositeOperation = 'source-over';
  },
  tick(l, dt) {
    const m = l.mini;
    // flour drifting down off it
    if (crand() < dt * (calm() ? 1.2 : 3.2)) {
      const a = crand() * TAU;
      l.emit('mist', m.cx + Math.cos(a) * m.pr * (0.9 + crand() * 0.3), m.cy - m.pr * (0.4 + crand() * 0.6), (crand() - 0.5) * 8, 14, 5, 9, 1.6 + crand(), { grav: 10, drag: 1, a: 0.6, rot: 0, spin: 0 });
    }
  },
  front(ctx, l) {
    // the ladle's swing across the board after a smack
    const u = l.sm / 0.42;
    if (u >= 1) return;
    const m = l.mini;
    const img = ladle();
    const len = m.pr * 2.3;
    const k = len / img.height;
    const a = -2.2 + Math.min(1, u * 1.6) * 2.9 - (u > 0.62 ? (u - 0.62) * 1.2 : 0);
    ctx.save();
    ctx.globalAlpha = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
    ctx.translate(m.cx + m.pr * 0.95, m.cy + m.pr * 0.95);
    ctx.rotate(a);
    ctx.drawImage(img, (-img.width / 2) * k, -img.height * 0.97 * k, img.width * k, img.height * k);
    ctx.restore();
  },
  smack(l) {
    const m = l.mini;
    const n = calm() ? 4 : 9;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * 2.6;
      const v = 110 + crand() * 140;
      l.emit('sauce', m.cx + Math.cos(a) * m.pr * 0.4, m.cy + Math.sin(a) * m.pr * 0.4, Math.cos(a) * v, Math.sin(a) * v - 80, 7, 5, 0.6 + crand() * 0.3, { grav: 650 });
    }
    for (let i = 0; i < n; i++) {
      const a = crand() * TAU;
      l.emit('mist', m.cx + Math.cos(a) * m.pr * 0.7, m.cy + Math.sin(a) * m.pr * 0.7, Math.cos(a) * 60, Math.sin(a) * 40 - 30, 8, 22, 0.8 + crand() * 0.3, { grav: -10, drag: 2, a: 0.7, rot: 0, spin: 0 });
    }
  },
};

// ════════════════════════════ Silver Service ════════════════════════════

/** The tray's place round the pie now (its angle runs on; a smack spins it round fast). */
function trayAngle(l: PizzaLive): number {
  const boost = Math.max(0, 1 - l.sm / 0.8);
  return l.t * (calm() ? 0.25 : 0.8) + boost * boost * 7;
}

function drawTray(ctx: Ctx, l: PizzaLive, front: boolean): void {
  const m = l.mini;
  const a = trayAngle(l);
  const s = Math.sin(a);
  if (front !== s > 0) return;
  const img = tray();
  const x = m.cx + Math.cos(a) * m.pr * 1.08;
  const y = m.cy + s * m.pr * 0.62 + m.pr * 0.08;
  const w = m.pr * 0.62 * (0.92 + 0.08 * s);
  const h = (w * img.height) / img.width;
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  // it catches the light coming round the top left
  const facing = Math.pow(Math.max(0, Math.cos(a + 2.3)), 8) + Math.max(0, 1 - l.sm / 0.4);
  if (facing > 0.05) {
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x - w * 0.22, y - h * 0.2, w * 0.35, '255,255,255', Math.min(0.9, facing * 0.8));
  }
  ctx.restore();
}

LEGEND_PEEL.silverservice = {
  back(ctx, l) {
    const m = l.mini;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.45, '207,224,244', 0.24 + 0.04 * Math.sin(l.t * 1.4) + 0.3 * Math.max(0, 1 - l.sm / 0.5));
    ctx.globalCompositeOperation = 'source-over';
    drawTray(ctx, l, false);
  },
  front(ctx, l) {
    drawTray(ctx, l, true);
  },
  tick(l, dt) {
    const m = l.mini;
    if (!calm() && crand() < dt * 1.6) {
      const a = crand() * TAU;
      l.emit('glint', m.cx + Math.cos(a) * m.pr * 1.05, m.cy + Math.sin(a) * m.pr * 0.62, 0, -6, 9, 3, 0.5, { drag: 1, spin: 0 });
    }
  },
  smack(l) {
    const m = l.mini;
    for (let i = 0; i < (calm() ? 3 : 8); i++) {
      const a = crand() * TAU;
      const v = 60 + crand() * 90;
      l.emit('glint', m.cx + Math.cos(a) * m.pr, m.cy + Math.sin(a) * m.pr * 0.6, Math.cos(a) * v, Math.sin(a) * v - 30, 13, 4, 0.5 + crand() * 0.2, { drag: 1.5, spin: 0 });
    }
  },
};

// ════════════════════════════ The First Bake ════════════════════════════

LEGEND_PEEL.firstbake = {
  back(ctx, l) {
    const m = l.mini;
    const hit = Math.max(0, 1 - l.sm / 0.6);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, m.cx, m.cy, m.pr * 1.6, '255,194,58', 0.3 + 0.05 * Math.sin(l.t * 1.2) + 0.35 * hit);
    // slow rays turning behind it
    if (!calm()) {
      ctx.save();
      ctx.translate(m.cx, m.cy);
      ctx.rotate(l.t * 0.15);
      for (let i = 0; i < 8; i++) {
        ctx.rotate(TAU / 8);
        const g = ctx.createLinearGradient(0, 0, m.pr * 1.7, 0);
        g.addColorStop(0, 'rgba(255,230,150,0.2)');
        g.addColorStop(1, 'rgba(255,230,150,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(m.pr * 1.7, -m.pr * 0.12);
        ctx.lineTo(m.pr * 1.7, m.pr * 0.12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  front(ctx, l) {
    // the golden shimmer running round the crust
    const m = l.mini;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = l.t * (calm() ? 0.3 : 1) + (i / 3) * TAU;
      glow(ctx, m.cx + Math.cos(a) * m.pr * 0.95, m.cy + Math.sin(a) * m.pr * 0.95, m.pr * 0.16, '255,242,192', 0.7);
    }
    ctx.restore();
  },
  tick(l, dt) {
    const m = l.mini;
    // steam rising off it in plumes
    if (crand() < dt * (calm() ? 1.2 : 3)) l.emit('wisp', m.cx + (crand() - 0.5) * m.pr * 1.2, m.cy - m.pr * (0.3 + crand() * 0.4), (crand() - 0.5) * 6, -16, 18, 38, 1.8 + crand() * 0.6, { grav: -30, drag: 0.8, a: 0.35, fin: 0.3, rot: 0, spin: 0 });
  },
  smack(l) {
    const m = l.mini;
    const n = calm() ? 3 : 7;
    for (let i = 0; i < n; i++) l.emit('wisp', m.cx + (crand() - 0.5) * m.pr, m.cy - m.pr * 0.4, (crand() - 0.5) * 40, -90, 16, 34, 0.7, { grav: -40, drag: 2, a: 0.6, fin: 0.1, rot: 0, spin: 0 });
    for (let i = 0; i < n; i++) {
      const a = crand() * TAU;
      l.emit('ember', m.cx + Math.cos(a) * m.pr * 0.9, m.cy + Math.sin(a) * m.pr * 0.9, Math.cos(a) * 70, -80 - crand() * 60, 10, 3, 0.7 + crand() * 0.3, { grav: -60, drag: 1.2 });
    }
  },
};
