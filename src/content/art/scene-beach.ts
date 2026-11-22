// Shack Attack Beach Bar (Act 2, waves 11–14), redrawn with the location kit (src/art/scene): a bright day on a
// tropical beach, seen from under a thatched bar. Turquoise shallows deepening to blue, a hazy island, a sailboat on
// the horizon, cumulus clouds, palms framing the view, a striped umbrella and a sandcastle on the sand, the bar's
// bamboo posts, its sign, string lights, a tiki torch and a surfboard; the bar top is sun-bleached planks.
// Live: the surf washes up the sand and back, glints dance on the water, clouds drift, palm crowns and the sign sway
// in the breeze, gulls wheel past, the boat sails; across the stage's waves the day turns gold and then to sunset,
// when the string lights and the torch come on.

import Phaser from 'phaser';
import { BLOCK, SLAB } from '../../art/backdrops';
import {
  type Air,
  type Ctx,
  type R,
  TY,
  W,
  airMix,
  calmLanes,
  castShadow,
  crevice,
  ellPath,
  glowAt,
  gradeAll,
  groundShadow,
  haze,
  lightPool,
  lineAt,
  polyPath,
  rectPath,
  rrPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { board, broken, grain, planksPlane, sand, tableFalloff, tableSeam, water } from '../../art/scene/materials';
import { bottle, flameShape } from '../../art/scene/props';
import { ao, spec as specHi } from '../../art/style/kit';
import { mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, flicker, registerKitScene, sway, waveK } from '../../game/sceneLive';

export const BH = {
  horizon: 452,
  shore: 604,
  thatch: 132,
  front: 1040,
  sign: { x: 960, y: 150 },
  palmL: { bx: 70, by: 770, tx: 300, ty: 236 },
  palmR: { bx: 1790, by: 770, tx: 1600, ty: 262 },
  umbrella: { x: 1260, y: 668 },
  castle: { x: 600, y: 676 },
  torch: { x: 1530, y: 760 },
  boat: { x: 1180, y: 446 },
  island: { x: 420, y: 452 },
};

const SEA_AIR: Air = { color: '#cfe8f4', far: 0.7 };
const SKY_TOP = '#3d8ee2';
const SKY_LOW = '#c4eaf8';

// ——— sky ———

function sky(ctx: Ctx, r: R, sunset: boolean): void {
  const h = BH.horizon;
  if (sunset) {
    vfill(ctx, 0, 0, W, h + 4, [[0, '#2a2a6a'], [0.35, '#8a4a8a'], [0.65, '#ff8a6a'], [0.88, '#ffc27a'], [1, '#ffe0a0']]);
    glowAt(ctx, 760, h - 10, 420, '#ffb050', 0.6, 0.5);
    const sun = ellPath(760, h - 34, 62, 62);
    sun(ctx);
    ctx.fillStyle = '#fff0b8';
    ctx.fill();
    glowAt(ctx, 760, h - 34, 130, '#fff0c0', 0.6);
    // long cloud bars lit pink from below
    for (let i = 0; i < 9; i++) {
      const x = r() * W;
      const y = 150 + r() * 220;
      ctx.fillStyle = rgba(i % 2 ? '#ff9a8a' : '#c86a8a', 0.5);
      ctx.beginPath();
      ctx.ellipse(x, y, 140 + r() * 200, 8 + r() * 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  vfill(ctx, 0, 0, W, h + 4, [[0, SKY_TOP], [0.55, '#7cc0ee'], [0.9, SKY_LOW], [1, '#e8f6fa']]);
  // the sun is high and to the left (the one light): its glare in the upper left
  glowAt(ctx, 150, 40, 520, '#fffbe0', 0.45);
  broken(ctx, { x: 0, y: 0, w: W, h }, 0.15, 6, 5);
  haze(ctx, h - 80, h + 4, '#f4fbff', 0.6, 0.95);
}

/** A cumulus cloud: lumps lit from the top left (their lit side the white of the sky's light, their shade a soft
 * blue-lavender), the base flat. */
function cumulus(ctx: Ctx, r: R, x: number, y: number, w: number, depth: number): void {
  const lumps: [number, number, number][] = [];
  const n = 7 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const rr = w * (0.1 + Math.sin(t * Math.PI) * 0.16) * (0.8 + r() * 0.4);
    lumps.push([x - w / 2 + t * w, y - rr * 0.55 - Math.sin(t * Math.PI) * w * 0.1, rr]);
  }
  // a second row of smaller lumps on top
  for (let i = 0; i < 3; i++) {
    const t = 0.25 + r() * 0.5;
    const rr = w * (0.09 + r() * 0.07);
    lumps.push([x - w / 2 + t * w, y - w * 0.24 - rr * 0.4, rr]);
  }
  const union = (c: Ctx, dx = 0, dy = 0, k = 1) => {
    c.beginPath();
    for (const [lx, ly, lr] of lumps) {
      c.moveTo(lx + dx + lr * k, ly + dy);
      c.arc(lx + dx, ly + dy, lr * k, 0, Math.PI * 2);
    }
  };
  const base = airMix('#ffffff', depth, SEA_AIR);
  const shadow = airMix('#9cc0e8', depth, SEA_AIR);
  ctx.save();
  // the base is flat: the lumps are cut off along it
  ctx.beginPath();
  ctx.rect(x - w, y - w, w * 2, w - w * 0.02);
  ctx.clip();
  union(ctx);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y - w * 0.4, 0, y);
  g.addColorStop(0, mix(base, shadow, 0.2));
  g.addColorStop(1, shadow);
  ctx.fillStyle = g;
  ctx.fillRect(x - w, y - w, w * 2, w * 1.2);
  // the lit faces: the same lumps nudged towards the light, softly
  ctx.filter = `blur(${Math.max(2, w * 0.02).toFixed(1)}px)`;
  ctx.fillStyle = rgba(base, 0.95);
  union(ctx, -w * 0.025, -w * 0.04, 0.9);
  ctx.fill('nonzero');
  ctx.filter = 'none';
  // the underside in its own shade
  vfill(ctx, x - w, y - w * 0.12, w * 2, w * 0.1, [[0, rgba(shadow, 0)], [1, rgba(shade(shadow, -0.06), 0.9)]]);
  ctx.restore();
}

function cloudsFar(ctx: Ctx, r: R): void {
  cumulus(ctx, r, 1380, 380, 260, 0.85);
  cumulus(ctx, r, 620, 398, 200, 0.9);
  cumulus(ctx, r, 1760, 400, 180, 0.9);
}

function cloudsNear(ctx: Ctx, r: R): void {
  cumulus(ctx, r, 860, 300, 380, 0.55);
  cumulus(ctx, r, 1560, 250, 300, 0.6);
}

// ——— the sea ———

function sea(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const s = BH.shore;
  water(ctx, r, 0, W, h, s + 10, { far: '#1f6fb8', near: '#38c8c8', ripple: '#ffffff', ripples: 340, glitterX: 380, glitter: '#fffbe0', glitterA: 0.7 });
  // the shallows over the sand: turquoise to clear, sand showing through
  vfill(ctx, 0, s - 70, W, 80, [[0, 'rgba(90,220,210,0)'], [0.6, 'rgba(120,230,214,0.55)'], [1, 'rgba(210,236,200,0.85)']]);
  // a reef's darker patches
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = rgba('#1a6a8a', 0.18);
    ctx.beginPath();
    ctx.ellipse(r() * W, h + 30 + r() * 60, 80 + r() * 140, 6 + r() * 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  haze(ctx, h, h + 30, '#e8f6fa', 0.45, 0.01);
}

function island(ctx: Ctx): void {
  const h = BH.horizon;
  // the island: a hazy hump with palms, far left
  const ix = BH.island.x;
  const col = airMix('#3a7a5a', 0.85, SEA_AIR);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(ix - 220, h + 1);
  ctx.bezierCurveTo(ix - 140, h - 30, ix - 40, h - 46, ix + 40, h - 40);
  ctx.bezierCurveTo(ix + 120, h - 34, ix + 180, h - 12, ix + 240, h + 1);
  ctx.closePath();
  ctx.fill();
  for (const [px, ph, lean] of [[ix - 40, 70, -0.25], [ix + 10, 86, 0.1], [ix + 60, 60, 0.3]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, h - 40);
    ctx.quadraticCurveTo(px + lean * 30, h - 40 - ph * 0.6, px + lean * 50, h - 40 - ph);
    ctx.stroke();
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.55;
      ctx.beginPath();
      ctx.moveTo(px + lean * 50, h - 40 - ph);
      ctx.quadraticCurveTo(px + lean * 50 + Math.cos(a) * 18, h - 40 - ph + Math.sin(a) * 10 - 6, px + lean * 50 + Math.cos(a) * 30, h - 40 - ph + Math.sin(a) * 14 + 8);
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
}

function shore(ctx: Ctx, r: R): void {
  const s = BH.shore;
  // the beach: dry sand up to the bar, wet sand by the water
  const top = (x: number) => s + Math.sin(x * 0.006 + 1) * 8 + Math.sin(x * 0.017) * 4;
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-10, top(-10));
    for (let x = 0; x <= W + 10; x += 20) c.lineTo(x, top(x));
    c.lineTo(W + 10, TY + 2);
    c.lineTo(-10, TY + 2);
    c.closePath();
  };
  within(ctx, path, () => {
    sand(ctx, r, { x: 0, y: s - 20, w: W, h: TY - s + 30 }, '#f0d6a2', { ripples: 90 });
    // wet sand: darker, glossy, reflecting the sky
    vfill(ctx, 0, s - 20, W, 50, [[0, 'rgba(150,120,80,0.55)'], [0.6, 'rgba(150,120,80,0.25)'], [1, 'rgba(150,120,80,0)']]);
    vfill(ctx, 0, s - 10, W, 18, [[0, 'rgba(200,236,255,0.3)'], [1, 'rgba(200,236,255,0)']]);
    // the light falling across the beach (bright, from the left), the bar's shade nearer us
    lightPool(ctx, 500, 650, 900, 120, '#fff6d8', 0.18);
    vfill(ctx, 0, TY - 80, W, 80, [[0, 'rgba(90,60,30,0)'], [1, 'rgba(90,60,30,0.32)']]);
    // shells and a starfish
    for (let i = 0; i < 14; i++) {
      const x = r() * W;
      const y = s + 30 + r() * (TY - s - 60);
      ctx.fillStyle = rgba(['#fff6ea', '#f8d0c0', '#e8c0a0'][i % 3], 0.9);
      ctx.beginPath();
      ctx.ellipse(x, y, 4 + r() * 3, 2.5 + r() * 2, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // the foam where the last wave reached (live: it washes in and out)
  foamLine(ctx, top, 1);
}

function foamLine(ctx: Ctx, top: (x: number) => number, a: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [dy, w, al] of [[2, 10, 0.35], [0, 4, 0.9]] as const) {
    ctx.strokeStyle = rgba('#ffffff', al * a);
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 12) {
      const y = top(x) + dy + Math.sin(x * 0.07) * 2;
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A striped beach umbrella stuck in the sand, with its cast shadow and a towel. */
function umbrella(ctx: Ctx, r: R): void {
  const { x, y } = BH.umbrella;
  const s = 1;
  // shade on the sand under it, thrown right (the sun is on the left)
  // its shade on the sand, thrown down and to the right of the canopy (the sun is high on the left)
  groundShadow(ctx, x + 70, y + 8, 150 * s, 22, 0.42, '#7a4a20', 1.2);
  // a towel
  const towel = polyPath([[x - 150, y + 6], [x - 30, y + 2], [x - 20, y + 30], [x - 160, y + 34]]);
  groundShadow(ctx, x - 82, y + 34, 76, 6, 0.3, '#7a4a20');
  solid(ctx, towel, { x: x - 160, y, w: 140, h: 34 }, 'canvas', '#3a9ad8', { depth: 0.4, line: 1.6, formSize: 4 });
  within(ctx, towel, () => {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let k = 0; k < 5; k++) ctx.fillRect(x - 160 + k * 30, y, 10, 40);
  });
  // the pole
  const pole = polyPath([[x - 3, y], [x + 3, y], [x + 16, y - 150], [x + 10, y - 150]]);
  solid(ctx, pole, { x: x - 3, y: y - 150, w: 20, h: 150 }, 'wood', '#e8e0d0', { depth: 0.4, line: 1.8, formSize: 3 });
  // the canopy: panels alternating red and white, lit on the left
  const cx = x + 13;
  const cy = y - 150;
  const rw = 130;
  const panels = 8;
  for (let i = 0; i < panels; i++) {
    const a0 = Math.PI + (i / panels) * Math.PI;
    const a1 = Math.PI + ((i + 1) / panels) * Math.PI;
    const p = (c: Ctx) => {
      c.beginPath();
      c.moveTo(cx, cy - 46);
      c.lineTo(cx + Math.cos(a0) * rw, cy + Math.sin(a0) * 10 + 10);
      c.quadraticCurveTo(cx + Math.cos((a0 + a1) / 2) * rw * 0.96, cy + 18, cx + Math.cos(a1) * rw, cy + Math.sin(a1) * 10 + 10);
      c.closePath();
    };
    const lit = 1 - i / panels;
    solid(ctx, p, { x: cx - rw, y: cy - 46, w: rw * 2, h: 64 }, 'canvas', shade(i % 2 ? '#f4f0e8' : '#e8402a', (lit - 0.5) * 0.2), { depth: 0.4, line: 1.8, formSize: 8 });
  }
  void r;
}

/** A sandcastle with a little flag (the mini-boss's home turf). */
function sandcastle(ctx: Ctx, r: R): void {
  const { x, y } = BH.castle;
  groundShadow(ctx, x + 30, y + 2, 90, 12, 0.3, '#8a5a30', 1.2);
  const parts: [number, number, number, number][] = [[-70, -40, 140, 40], [-60, -82, 34, 44], [26, -82, 34, 44], [-18, -112, 36, 74]];
  for (const [dx, dy, w, h] of parts) {
    const p = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x + dx, y + dy + h);
      c.lineTo(x + dx + 2, y + dy);
      for (let k = 0; k < 4; k++) {
        const bx = x + dx + 2 + (k * (w - 4)) / 4;
        c.lineTo(bx, y + dy - 8);
        c.lineTo(bx + (w - 4) / 8, y + dy - 8);
        c.lineTo(bx + (w - 4) / 8, y + dy);
        c.lineTo(bx + (w - 4) / 4, y + dy);
      }
      c.lineTo(x + dx + w, y + dy + h);
      c.closePath();
    };
    solid(ctx, p, { x: x + dx, y: y + dy - 8, w, h: h + 8 }, 'stone', '#e8c88a', { depth: 0.38, line: 1.8, formSize: 8 });
    within(ctx, p, () => grain(ctx, { x: x + dx, y: y + dy - 8, w, h: h + 8 }, 'speckle', 0.5, 1));
  }
  ctx.fillStyle = '#3a2410';
  ctx.beginPath();
  ctx.ellipse(x, y - 14, 10, 14, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 120);
  ctx.lineTo(x, y - 160);
  ctx.stroke();
  ctx.fillStyle = '#ff4a6a';
  ctx.beginPath();
  ctx.moveTo(x, y - 160);
  ctx.lineTo(x + 26, y - 152);
  ctx.lineTo(x, y - 144);
  ctx.fill();
  // a bucket and spade
  const bucket = polyPath([[x + 96, y - 26], [x + 128, y - 26], [x + 124, y + 2], [x + 100, y + 2]]);
  solid(ctx, bucket, { x: x + 96, y: y - 26, w: 32, h: 28 }, 'plastic', '#ffd23f', { depth: 0.38, line: 1.8, formSize: 6 });
  void r;
}

// ——— palms ———

interface Palm {
  bx: number;
  by: number;
  tx: number;
  ty: number;
}

function trunk(ctx: Ctx, r: R, p: Palm): void {
  const mx = (p.bx + p.tx) / 2 + (p.tx > p.bx ? -60 : 60);
  const my = (p.by + p.ty) / 2 + 40;
  const at = (t: number): [number, number] => [(1 - t) * (1 - t) * p.bx + 2 * (1 - t) * t * mx + t * t * p.tx, (1 - t) * (1 - t) * p.by + 2 * (1 - t) * t * my + t * t * p.ty];
  const wAt = (t: number) => 30 - t * 14;
  // the trunk: a tapering curve, lit on the left, ringed
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const [x, y] = at(t);
    const [x2, y2] = at(Math.min(1, t + 0.01));
    const nx = -(y2 - y);
    const ny = x2 - x;
    const l = Math.hypot(nx, ny) || 1;
    left.push([x + (nx / l) * wAt(t), y + (ny / l) * wAt(t)]);
    right.push([x - (nx / l) * wAt(t), y - (ny / l) * wAt(t)]);
  }
  const path = polyPath([...left, ...right.reverse()]);
  castShadow(ctx, path, 30, 26, 0.18, '#6a4a2a');
  solid(ctx, path, { x: Math.min(p.bx, p.tx) - 40, y: p.ty, w: Math.abs(p.tx - p.bx) + 80, h: p.by - p.ty }, 'wood', '#a07850', { depth: 0.2, formSize: 18 });
  within(ctx, path, () => {
    for (let i = 1; i < 30; i++) {
      const t = i / 30;
      const [x, y] = at(t);
      const w = wAt(t) + 4;
      ctx.strokeStyle = 'rgba(60,34,14,0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, y, w, 5, 0.1, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff0d0', 0.25);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y - 3, w, 5, 0.1, Math.PI * 0.9, Math.PI * 1.4);
      ctx.stroke();
    }
    grain(ctx, { x: Math.min(p.bx, p.tx) - 40, y: p.ty, w: Math.abs(p.tx - p.bx) + 80, h: p.by - p.ty }, 'wood', 0.3, 1.3);
  });
  void r;
}

/** A palm crown: fronds arching out of the top of the trunk and drooping, each a rib hung with narrow leaflets (the
 * upper ones lit, the lower ones in the crown's own shade). */
function crown(ctx: Ctx, r: R, p: Palm, flip: number): void {
  const { tx, ty } = p;
  const fronds = [-2.95, -2.5, -2.05, -1.6, -1.2, -0.75, -0.3, 0.15, 2.75, 3.25].map((a) => a + (r() - 0.5) * 0.15);
  // back fronds first (the ones reaching away and up), the drooping front ones last
  fronds.sort((a, b) => Math.sin(a) - Math.sin(b));
  for (const a0 of fronds) {
    const a = flip > 0 ? a0 : Math.PI - a0;
    const len = 200 + r() * 60;
    const up = -Math.sin(a);
    const ex = tx + Math.cos(a) * len;
    const ey = ty - up * len * 0.35 + len * 0.42;
    const cx = tx + Math.cos(a) * len * 0.55;
    const cy = ty - up * len * 0.55 - 30;
    const back = up > 0.6;
    const leaf = back ? '#3e7c30' : '#5aa43a';
    const q = (t: number): [number, number] => [(1 - t) * (1 - t) * tx + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * cy + t * t * ey];
    // leaflets: narrow blades hanging off the rib, longest a third of the way out
    const n = 22;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1);
        const [x, y] = q(t);
        const [x2, y2] = q(Math.min(1, t + 0.03));
        const dx = x2 - x;
        const dy = y2 - y;
        const l = Math.hypot(dx, dy) || 1;
        // out from the rib, then hanging under gravity
        const nx = (-dy / l) * side;
        const ny = (dx / l) * side;
        const bl = (18 + Math.sin(Math.min(1, t * 1.6) * Math.PI) * 46) * (1 - t * 0.35);
        const hx = x + nx * bl * 0.6 + (dx / l) * bl * 0.45;
        const hy = y + Math.abs(ny) * bl * 0.3 + bl * 0.75;
        const lower = ny > 0;
        const col = shade(leaf, (lower ? -0.12 : 0.08) + (r() - 0.5) * 0.08);
        const blade = (c: Ctx) => {
          c.beginPath();
          c.moveTo(x - (dx / l) * 3, y - (dy / l) * 3);
          c.quadraticCurveTo(x + nx * bl * 0.5, y + ny * bl * 0.2, hx, hy);
          c.quadraticCurveTo(x + nx * bl * 0.4 + (dx / l) * 8, y + ny * bl * 0.25 + 6, x + (dx / l) * 4, y + (dy / l) * 4);
          c.closePath();
        };
        blade(ctx);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = rgba('#1a3a10', 0.7);
        ctx.lineWidth = 1.1;
        ctx.stroke();
        if (!lower && r() < 0.6) {
          ctx.strokeStyle = rgba('#e8ffc0', 0.35);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + nx * bl * 0.45, y + ny * bl * 0.2, hx, hy);
          ctx.stroke();
        }
      }
    }
    // the rib, lit on top
    ctx.strokeStyle = '#2a4a14';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#a8c86a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // coconuts in the crown's shade
  for (const [dx, dy] of [[-12, 14], [10, 16], [0, 26]] as const) {
    const c = ellPath(tx + dx, ty + dy, 13, 12);
    solid(ctx, c, { x: tx + dx - 13, y: ty + dy - 12, w: 26, h: 24 }, 'wood', '#6a4a24', { depth: 0.18, line: 2, formSize: 5 });
  }
}

// ——— the bar ———

function thatch(ctx: Ctx, r: R): void {
  const h = BH.thatch;
  // the underside of the roof: dark, warm
  vfill(ctx, 0, 0, W, h, [[0, '#3a2412'], [1, '#5a3a1c']]);
  // a ridge beam
  board(ctx, r, 0, h - 40, W, 22, '#6a4422');
  crevice(ctx, 0, W, h - 18, 14, 0.5);
  // the fringe: bundles of dry grass hanging in layers, lit on the left, the light glowing through their tips
  for (let layer = 0; layer < 3; layer++) {
    const y0 = h - 70 + layer * 22;
    for (let x = -20; x < W + 20; x += 7) {
      const len = 40 + r() * 50 + layer * 6;
      const col = shade(['#c8a05a', '#b88a48', '#d8b46a'][Math.floor(r() * 3)], -0.15 + layer * 0.08);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2 + r() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 8, y0 + len * 0.5, x + (r() - 0.4) * 12, y0 + len);
      ctx.stroke();
    }
  }
  // the fringe's ragged edge: a dark line of shadow, a few bright tips
  for (let x = 0; x < W; x += 3) {
    if (r() < 0.2) {
      ctx.fillStyle = rgba('#fff0b0', 0.5);
      ctx.fillRect(x, h + 4 + r() * 30, 2, 6);
    }
  }
  grain(ctx, { x: 0, y: 0, w: W, h: h + 60 }, 'grain', 0.25, 1.2);
}

/** Calm behind the HUD: the score and wave label sit over the top-left of the thatch. */
function hudCalm(ctx: Ctx): void {
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(30,16,6,0.55)');
  g.addColorStop(0.5, 'rgba(30,16,6,0.3)');
  g.addColorStop(1, 'rgba(30,16,6,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
}

function bamboo(ctx: Ctx, r: R, x: number, y0: number, y1: number, w: number): void {
  const p = rectPath(x, y0, w, y1 - y0);
  castShadow(ctx, p, 20, 18, 0.25, '#4a2a10');
  solid(ctx, p, { x, y: y0, w, h: y1 - y0 }, 'wood', '#c8a060', { depth: 0.08, formSize: w * 0.35 });
  within(ctx, p, () => {
    for (let y = y0 + 60 + r() * 40; y < y1; y += 110 + r() * 40) {
      ctx.fillStyle = 'rgba(70,40,10,0.55)';
      ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = rgba('#fff0c0', 0.35);
      ctx.fillRect(x, y + 5, w, 2);
    }
    // long fibres
    for (let fx = x + 4; fx < x + w; fx += 5 + r() * 4) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#6a4a1a' : '#fff0c8', 0.12);
      ctx.fillRect(fx, y0, 1.2, y1 - y0);
    }
  });
}

function postR(ctx: Ctx, r: R): void {
  bamboo(ctx, r, W - 64, 0, TY, 74);
  // a surfboard leaning on the right post
  const sb = (c: Ctx) => {
    c.save();
    c.translate(1770, 744);
    c.rotate(-0.12);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-58, -40, -60, -400, 0, -500);
    c.bezierCurveTo(60, -400, 58, -40, 0, 0);
    c.closePath();
    c.restore();
  };
  castShadow(ctx, sb, 26, 20, 0.25, '#4a2a10');
  solid(ctx, sb, { x: 1700, y: 240, w: 140, h: 510 }, 'plastic', '#2ab8a8', { depth: 0.1, formSize: 30 });
  within(ctx, sb, () => {
    ctx.save();
    ctx.translate(1770, 744);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#ff7a3a';
    ctx.fillRect(-80, -330, 160, 34);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-80, -292, 160, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(-2, -500, 4, 500);
    ctx.restore();
  });
  specHi(ctx, 1742, 420, 60, 12, 0.5, -1.4);
}

function torch(ctx: Ctx, r: R): void {
  const { x, y } = BH.torch;
  const pole = rectPath(x - 9, y - 330, 18, 330);
  groundShadow(ctx, x + 24, y, 40, 6, 0.4, '#7a4a20', 1.4);
  castShadow(ctx, pole, 20, 14, 0.25, '#4a2a10');
  solid(ctx, pole, { x: x - 9, y: y - 330, w: 18, h: 330 }, 'wood', '#8a6034', { depth: 0.12, formSize: 6 });
  const cup = polyPath([[x - 24, y - 360], [x + 24, y - 360], [x + 14, y - 322], [x - 14, y - 322]]);
  solid(ctx, cup, { x: x - 24, y: y - 360, w: 48, h: 38 }, 'wood', '#6a4422', { depth: 0.12, formSize: 6 });
  within(ctx, cup, () => {
    ctx.strokeStyle = 'rgba(40,20,6,0.6)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x - 24, y - 352 + k * 9);
      ctx.lineTo(x + 24, y - 356 + k * 9);
      ctx.stroke();
    }
  });
  void r;
}

/** String lights along the thatch's edge (unlit by day; the live layer lights them towards sunset). */
const BULBS: [number, number, string][] = (() => {
  const out: [number, number, string][] = [];
  const cols = ['#ff6a8a', '#ffd84a', '#5ae0ff', '#8aff7a', '#ff9a3a'];
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    const x = 90 + t * (W - 180);
    const seg = (t * 4) % 1;
    out.push([x, BH.thatch + 22 + Math.sin(seg * Math.PI) * 26, cols[i % cols.length]]);
  }
  return out;
})();

function lights(ctx: Ctx, lit: boolean): void {
  ctx.strokeStyle = '#2a1a0c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  BULBS.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 8) : ctx.moveTo(x, y - 8)));
  ctx.stroke();
  for (const [x, y, c] of BULBS) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x - 3, y - 10, 6, 5);
    const b = ellPath(x, y, 5, 7);
    b(ctx);
    ctx.fillStyle = lit ? c : mix(c, '#e8e0d0', 0.55);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,10,0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x - 2.5, y - 4, 1.6, 3);
    if (lit) glowAt(ctx, x, y, 22, c, 0.6);
  }
}

function sign(ctx: Ctx, r: R): void {
  const { x, y } = BH.sign;
  const w = 560;
  const h = 96;
  // ropes up into the thatch
  for (const dx of [-200, 200]) {
    ctx.strokeStyle = '#6a4a24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + dx, y - 70);
    ctx.lineTo(x + dx, y - h / 2 + 4);
    ctx.stroke();
  }
  const p = rrPath(x - w / 2, y - h / 2, w, h, 12);
  castShadow(ctx, p, 18, 16, 0.3, '#3a2010');
  solid(ctx, p, { x: x - w / 2, y: y - h / 2, w, h }, 'wood', '#9a6a3a', { depth: 0.1, formSize: 16 });
  within(ctx, p, () => {
    for (let k = 1; k < 3; k++) {
      ctx.fillStyle = 'rgba(40,20,6,0.45)';
      ctx.fillRect(x - w / 2, y - h / 2 + (k * h) / 3, w, 2);
    }
    board(ctx, r, x - w / 2, y - h / 2, w, h, '#9a6a3a');
    ctx.globalAlpha = 1;
  });
  ctx.lineWidth = lineAt(0.1);
  ctx.strokeStyle = '#3a1e0c';
  p(ctx);
  ctx.stroke();
  // carved, painted letters
  ctx.font = `64px ${SLAB}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3a1e0c';
  ctx.fillText('SHACK ATTACK', x + 3, y + 5);
  ctx.fillStyle = '#ffe9b0';
  ctx.fillText('SHACK ATTACK', x, y + 2);
  void BLOCK;
}

function table(ctx: Ctx, r: R): void {
  planksPlane(ctx, r, BH.front, '#c89a62', 0.3, 0.01);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, BH.front - TY + 4);
  ctx.clip();
  // sun through the thatch: dappled light on the bar top
  for (let i = 0; i < 30; i++) {
    lightPool(ctx, r() * W, TY + 20 + r() * (BH.front - TY - 40), 40 + r() * 80, 10 + r() * 16, '#fff2c8', 0.05 + r() * 0.05);
  }
  ctx.restore();
  tableFalloff(ctx, BH.front, 0.3, '#3a2008');
  tableSeam(ctx, 0.4, '#3a2010', false);
  // the bar's front: bamboo slats
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BH.front, W, 1080 - BH.front);
  ctx.clip();
  for (let x = -6; x < W; x += 34) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, '#d8b070');
    g.addColorStop(0.4, '#b88a4a');
    g.addColorStop(1, '#6a4a22');
    ctx.fillStyle = g;
    ctx.fillRect(x, BH.front, 32, 60);
  }
  vfill(ctx, 0, BH.front, W, 40, [[0, 'rgba(30,14,4,0.5)'], [1, 'rgba(30,14,4,0.2)']]);
  ctx.restore();
  ctx.fillStyle = rgba('#fff0c8', 0.4);
  ctx.fillRect(0, BH.front - 3, W, 3);
  ctx.fillStyle = 'rgba(40,20,6,0.7)';
  ctx.fillRect(0, BH.front, W, 2);
}

function drink(ctx: Ctx): void {
  // a coconut drink with a paper umbrella at the back left
  const cx = 150;
  const cy = 806;
  groundShadow(ctx, cx + 10, cy + 2, 46, 8, 0.4);
  const nut = ellPath(cx, cy - 26, 36, 30);
  solid(ctx, nut, { x: cx - 36, y: cy - 56, w: 72, h: 60 }, 'wood', '#6a4422', { depth: 0.05, formSize: 12 });
  within(ctx, nut, () => grain(ctx, { x: cx - 40, y: cy - 60, w: 80, h: 70 }, 'fleece', 0.5, 1));
  ctx.beginPath();
  ctx.ellipse(cx, cy - 50, 26, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fff6e8';
  ctx.fill();
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#ff5a8a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + 6, cy - 50);
  ctx.lineTo(cx + 30, cy - 104);
  ctx.stroke();
  const um = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx + 8, cy - 98);
    c.quadraticCurveTo(cx + 30, cy - 132, cx + 56, cy - 112);
    c.closePath();
  };
  solid(ctx, um, { x: cx + 8, y: cy - 132, w: 50, h: 34 }, 'canvas', '#5ad0ff', { depth: 0.05, line: 1.6, formSize: 4 });
}

function limes(ctx: Ctx): void {
  // a bottle and limes at the back right
  bottle(ctx, 1800, 808, 84, '#5a8a3a', { kind: 'wine', label: '#ffe0a0', cork: '#e8e0c0', depth: 0.05 });
  for (const [lx, ly] of [[1740, 806], [1764, 812], [1858, 810]] as const) {
    const lime = ellPath(lx, ly - 10, 14, 11);
    solid(ctx, lime, { x: lx - 14, y: ly - 21, w: 28, h: 22 }, 'plastic', '#8acc3a', { depth: 0.05, line: 1.6, formSize: 4 });
  }
  ao(ctx, 1790, 812, 110, 9, 0.35);
}


function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.02, '#ffd8a0', 0.05);
}

function shadeOver(ctx: Ctx): void {
  hudCalm(ctx);
  calmLanes(ctx, 0.08, '#2a3a5a', 140, 600);
  vignetteAll(ctx, 0.35, '#2a1a10');
}

const CLOUD_FAR = { x: 300, y: 230, w: 1640, h: 210 };
const CLOUD_NEAR = { x: 600, y: 140, w: 1180, h: 200 };
const PALM_L = { x: 0, y: 30, w: 600, h: 520 };
const PALM_R = { x: 1300, y: 60, w: 620, h: 520 };
const SIGN_BOX = { x: BH.sign.x - 300, y: BH.sign.y - 80, w: 620, h: 160 };
const SHORE_BOX = { x: 0, y: BH.shore - 30, w: W, h: 60 };

export const BEACH: SceneSpec = {
  id: 'beach',
  info: {
    name: 'Shack Attack Beach Bar',
    subtitle: 'Waves 11–14',
    ambient: ['sparkle'],
    glows: [{ x: 150, y: 60, r: 380, color: '#fff2c0', flicker: 0.03 }],
    light: '#ffe2b0',
    tableTint: '#fff4e0',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: BH.horizon + 4 }, draw: (c, r) => sky(c, r, false) },
    { id: 'sunset', box: { x: 0, y: 0, w: W, h: BH.horizon }, liveOnly: true, res: 0.5, draw: (c, r) => sky(c, r, true) },
    { id: 'cloudsFar', box: CLOUD_FAR, motion: 'sprite', res: 0.75, draw: cloudsFar },
    { id: 'cloudsNear', box: CLOUD_NEAR, motion: 'sprite', res: 0.75, draw: cloudsNear },
    { id: 'island', box: { x: BH.island.x - 240, y: BH.horizon - 150, w: 500, h: 150 }, draw: island },
    { id: 'sea', box: { x: 0, y: BH.horizon, w: W, h: BH.shore - BH.horizon + 14 }, draw: sea },
    // gulls and the sailboat (behind the palms and the bar's posts), and the sun's glitter on the water
    { id: 'skyLife', box: { x: 0, y: 230, w: W, h: BH.horizon - 230 + 4 }, motion: 'slot', draw: () => {} },
    { id: 'glitter', box: { x: 280, y: BH.horizon + 4, w: 210, h: 120 }, motion: 'slot', draw: () => {} },
    { id: 'shore', box: { x: 0, y: BH.shore - 24, w: W, h: TY - BH.shore + 28 }, draw: shore },
    { id: 'surf', box: SHORE_BOX, motion: 'slot', draw: () => {} },
    { id: 'castle', box: { x: BH.castle.x - 110, y: BH.castle.y - 170, w: 260, h: 190 }, draw: sandcastle },
    { id: 'umbrella', box: { x: BH.umbrella.x - 180, y: BH.umbrella.y - 210, w: 420, h: 250 }, draw: umbrella },
    { id: 'trunkL', box: { x: 0, y: 190, w: 400, h: TY - 190 }, draw: (c, r) => trunk(c, r, BH.palmL) },
    { id: 'trunkR', box: { x: 1480, y: 210, w: 440, h: TY - 210 }, draw: (c, r) => trunk(c, r, BH.palmR) },
    { id: 'torch', box: { x: BH.torch.x - 40, y: BH.torch.y - 380, w: 110, h: 380 }, draw: torch },
    { id: 'palmL', box: PALM_L, motion: 'sprite', draw: (c, r) => crown(c, r, BH.palmL, 1) },
    { id: 'palmR', box: PALM_R, motion: 'sprite', draw: (c, r) => crown(c, r, BH.palmR, -1) },
    { id: 'postL', box: { x: 0, y: 0, w: 130, h: TY }, draw: (c, r) => bamboo(c, r, -10, 0, TY, 74) },
    { id: 'postR', box: { x: 1660, y: 0, w: W - 1660, h: TY }, draw: postR },
    { id: 'thatch', box: { x: 0, y: 0, w: W, h: BH.thatch + 64 }, draw: thatch },
    { id: 'lights', box: { x: 60, y: BH.thatch, w: W - 120, h: 70 }, draw: (c) => lights(c, false) },
    { id: 'lightsOn', box: { x: 60, y: BH.thatch, w: W - 120, h: 70 }, liveOnly: true, draw: (c) => lights(c, true) },
    { id: 'sign', box: SIGN_BOX, motion: 'sprite', draw: sign },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'drink', box: { x: 60, y: TY - 120, w: 200, h: 180 }, draw: drink },
    { id: 'limes', box: { x: 1680, y: TY - 120, w: 240, h: 180 }, draw: limes },
    // the torch's flame: over everything
    { id: 'torchFire', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

registerKitScene(BEACH, (k, wave0) => {
  const sunset = k.sprite('sunset');
  const lightsOn = k.sprite('lightsOn');
  const far = k.sprite('cloudsFar');
  const near = k.sprite('cloudsNear');
  const palmL = k.pivot(k.sprite('palmL'), BH.palmL.tx, BH.palmL.ty);
  const palmR = k.pivot(k.sprite('palmR'), BH.palmR.tx, BH.palmR.ty);
  const sign = k.pivot(k.sprite('sign'), BH.sign.x, BH.sign.y - 70);
  const sea = k.slot('glitter');
  const sky = k.slot('skyLife');
  const surf = k.slot('surf');
  // glints on the water under the sun (they slide and wink)
  const glintX = (t: number) => Phaser.Math.Clamp(380 + (crand() - 0.5) * (80 + t * 300), 290, 480);
  const glints = Array.from({ length: 22 }, () => {
    const t = crand() * 0.8;
    return { img: k.img('star', 0, 0, { into: sea, add: true, alpha: 0, scale: 0.1, tint: 0xfffbe0 }), t, x: glintX(t), seed: crand() * 20 };
  });
  // the sailboat on the horizon
  const boat = k.img(k.tex('bh_boat', 60, 64, (c) => {
    c.fillStyle = '#f8f4ec';
    c.beginPath();
    c.moveTo(30, 4);
    c.lineTo(30, 46);
    c.lineTo(6, 46);
    c.closePath();
    c.fill();
    c.fillStyle = '#ff7a5a';
    c.beginPath();
    c.moveTo(33, 12);
    c.lineTo(33, 46);
    c.lineTo(52, 46);
    c.closePath();
    c.fill();
    c.fillStyle = '#2a3a5a';
    c.beginPath();
    c.moveTo(4, 50);
    c.lineTo(56, 50);
    c.lineTo(48, 60);
    c.lineTo(12, 60);
    c.closePath();
    c.fill();
  }), BH.boat.x, BH.horizon + 2, { into: sky, origin: [0.5, 0.95], scale: 0.55, alpha: 0.8 });
  // gulls wheeling past now and then
  const gullTex = k.tex('bh_gull', 48, 20, (c) => {
    c.strokeStyle = '#3a3a48';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(2, 12);
    c.quadraticCurveTo(12, 0, 24, 10);
    c.quadraticCurveTo(36, 0, 46, 12);
    c.stroke();
  });
  const gulls = Array.from({ length: 3 }, (_, i) => ({ img: k.img(gullTex, -100, 0, { into: sky, alpha: 0.9, scale: 0.7 - i * 0.12 }), seed: i * 1.7 }));
  let gullT = -2;
  let gullDir = 1;
  // the surf: a sheet of foam washing up the sand and sliding back, a darker wet line left behind
  const foam = k.tex('bh_foam', 512, 40, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 40);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 40);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 160; i++) {
      c.fillStyle = `rgba(0,0,0,${0.3 + crand() * 0.5})`;
      c.beginPath();
      c.arc(crand() * 512, 10 + crand() * 26, 2 + crand() * 5, 0, Math.PI * 2);
      c.fill();
    }
  });
  const sheets = [0, 1].map((i) => ({ img: k.img(foam, W / 2, BH.shore, { into: surf, sx: W / 512 + 0.1, sy: 0.8, alpha: 0 }), phase: i * 0.5 }));
  // the torch: out by day, lit at sunset
  const fire = k.slot('torchFire');
  const ft = k.tex('bh_flame', 64, 128, (c) => flameShape(c, 32, 122, 46, 116, ['#ff5a10', '#ffb030', '#fff4b0']));
  const flame = k.img(ft, BH.torch.x, BH.torch.y - 358, { into: fire, add: true, origin: [0.5, 0.96], scale: 0.7, alpha: 0 });
  const halo = k.glow(BH.torch.x, BH.torch.y - 390, 120, 0xff9a3a, 0, { into: fire });
  // the evening light over everything
  const warm = k.wash(0xffb070, 0, Phaser.BlendModes.MULTIPLY);
  const lightsGlow = k.wash(0xff9a5a, 0, Phaser.BlendModes.ADD);
  let kw = waveK(wave0);
  let shown = kw;
  return {
    setWave: (w) => (kw = waveK(w)),
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      const eve = Phaser.Math.Clamp((shown - 0.3) / 0.7, 0, 1);
      sunset.setAlpha(eve * eve);
      warm.setAlpha(Math.sqrt(shown) * 0.35);
      const on = Phaser.Math.Clamp((shown - 0.45) / 0.3, 0, 1);
      lightsOn.setAlpha(on * (0.85 + Math.sin(t * 3) * 0.05));
      lightsGlow.setAlpha(on * 0.04);
      const tl = Phaser.Math.Clamp((shown - 0.65) / 0.2, 0, 1);
      const n = flicker(t, 2);
      flame.setAlpha(tl).setScale(0.6 + n * 0.08, 0.55 + n * 0.18);
      halo.setAlpha(tl * (0.4 + n * 0.15));
      // clouds drift on the wind (the near ones faster), palms and the sign sway in it
      far.x = CLOUD_FAR.x + Math.sin(t * 0.02) * 60 * calm();
      near.x = CLOUD_NEAR.x + Math.sin(t * 0.03 + 1) * 110 * calm();
      sway(palmL, t, 0.3, 0.025, 0.7);
      sway(palmR, t, 2.1, 0.025, 0.7);
      sway(sign, t, 4.2, 0.012, 0.9);
      // the surf: each sheet runs up the sand, thins and slides back
      for (const s of sheets) {
        const u = ((t * 0.12 + s.phase) % 1 + 1) % 1;
        const run = u < 0.45 ? Phaser.Math.Easing.Sine.Out(u / 0.45) : 1 - Phaser.Math.Easing.Sine.InOut((u - 0.45) / 0.55);
        s.img.y = BH.shore - 26 + run * 30;
        s.img.setAlpha(u < 0.45 ? 0.2 + run * 0.7 : (1 - (u - 0.45) / 0.55) * 0.8);
      }
      // glints
      for (const g of glints) {
        const a = Math.max(0, Math.sin(t * 2.2 + g.seed)) ** 3;
        if (a < 0.01) g.x = glintX(g.t);
        g.img.setPosition(g.x, BH.horizon + 6 + g.t * (BH.shore - BH.horizon - 20)).setAlpha(a * (1 - eve * 0.5)).setScale(0.05 + g.t * 0.12);
      }
      boat.x = BH.boat.x + Math.sin(t * 0.015) * 300;
      boat.y = BH.horizon + 2 + Math.sin(t * 0.9) * 0.8;
      // gulls: a loose flock crossing every so often
      gullT += dt;
      if (gullT > 16) {
        gullT = -crand() * 8;
        gullDir = crand() < 0.5 ? 1 : -1;
      }
      for (const g of gulls) {
        const u = gullT / 14;
        const x = gullDir > 0 ? -120 + u * (W + 240) : W + 120 - u * (W + 240);
        g.img.setPosition(x - gullDir * g.seed * 60, 260 + g.seed * 26 + Math.sin(t * 0.8 + g.seed) * 20);
        g.img.scaleY = (0.7 - g.seed * 0.07) * (0.6 + Math.abs(Math.sin(t * 6 + g.seed)) * 0.6);
        g.img.setVisible(gullT > 0 && gullT < 14);
      }
    },
  };
});

