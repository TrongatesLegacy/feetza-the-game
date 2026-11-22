// Tartarus (Act 9, waves 86–89), redrawn with the location kit (src/art/scene): the pit under the underworld. A
// cavern of columnar basalt opening on an abyss that burns red to the horizon, spires of rock fading into its smoke,
// lava falling from the far walls; the black river Styx glowing cold green across it, the ruined gate of Hades on
// the far bank, Charon's jetty, broken columns bound in bronze chains, blue soul-fire in bronze braziers, asphodel in
// the ash, and an obsidian slab with a bronze key-pattern rim for a table. Live: lava falls and fissures flow and
// pulse, embers rise and ash falls, the Styx shimmers with drifting souls, Charon poles across behind the columns,
// the soul-fires flicker; wave by wave the pit flares redder until the cavern is lit by eruptions.
// (The old art is kept in scenes-act9.ts for the before/after page.)

import Phaser from 'phaser';
import { OL } from '../../art/backdrops';
import {
  type Air,
  type Ctx,
  type R,
  TY,
  VX,
  W,
  airMix,
  bounce,
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
  rim,
  rrPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { broken, grain, planeQuad, tableFalloff, water } from '../../art/scene/materials';
import { flameShape, hang } from '../../art/scene/props';
import { ao, spec as specHi } from '../../art/style/kit';
import { MATERIALS } from '../../art/style/materials';
import { mix, rgba, shade } from '../../art/util';
import { xAt, zAt, ZB } from '../../art/backdrops';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { type KitLive, calm, flicker, lerp, registerKitScene, waveK, wander } from '../../game/sceneLive';

// ——— layout (the river, jetty, braziers and columns keep their old places: events and bosses use the stage) ———

export const TA = {
  horizon: 476,
  river: { y0: 520, y1: 604 },
  pit: { x: 960, y: 470 },
  boat: { y: 552 },
  jetty: 588,
  braziers: [
    { x: 250, y: 712, s: 1 },
    { x: 1670, y: 712, s: 1 },
  ],
  pillars: [
    { x: 470, top: 236, w: 78, base: 712 },
    { x: 1450, top: 266, w: 74, base: 712 },
  ],
  falls: [
    { x: 574, top: 176, bot: 470, w: 20 },
    { x: 1338, top: 214, bot: 470, w: 17 },
  ],
  front: 1040,
};

/** The abyss's air: smoke lit red from below. */
const PIT: Air = { color: '#c8402a', far: 0.75 };
/** The cavern's air near us: cold and dark. */
const CAVE: Air = { color: '#2a1e3a', far: 0.6 };
const BASALT = '#2e2a36';
const BRONZE = '#b8843a';
/** Basalt: dark, matte, a stony grain; its shadows go violet. */
const ROCK = { ...MATERIALS.stone, name: 'Basalt', shadowTint: '#0c0818', tex: 'cast' as const, texA: 0.35, rim: 0.5 };

// ——— the abyss ———

function abyss(ctx: Ctx, r: R): void {
  const h = TA.horizon;
  vfill(ctx, 0, 0, W, TY, [[0, '#06040c'], [0.3, '#140a1a'], [0.55, '#34101e'], [0.7, '#6a2218'], [0.78, '#34101a'], [1, '#100810']]);
  // the pit's glow on the smoke, low behind the far bank (kept below full: the live layer saves its peak for flares)
  glowAt(ctx, TA.pit.x, h, 760, '#ff4a1a', 0.3, 0.38);
  glowAt(ctx, TA.pit.x, h + 10, 280, '#ff9a40', 0.24, 0.36);
  // banks of smoke lit from below
  for (let i = 0; i < 16; i++) {
    const x = r() * W;
    const y = h - 120 - r() * 220;
    ctx.fillStyle = rgba(mix('#5a1a24', '#ff6a3a', ((y - (h - 340)) / 340) * 0.4), 0.16);
    ctx.beginPath();
    ctx.ellipse(x, y, 220 + r() * 260, 26 + r() * 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // three ranks of spires, each further one hazier, paler and redder; each a lit face towards the light and the
  // pit (left) and a shaded face, with a lit ridge
  for (const [depth, base, n, hmax] of [[0.95, 470, 16, 150], [0.82, 482, 12, 200], [0.68, 496, 8, 240]] as const) {
    const lit = airMix('#4a1c1c', depth, PIT);
    const dark = airMix('#140a12', depth, PIT);
    for (let i = 0; i < n; i++) {
      const x = 400 + r() * 1120;
      const hh = 60 + r() * hmax;
      const w = 30 + r() * 50;
      const px = x - w * 0.12 + (r() - 0.5) * 10;
      const py = base - hh;
      const left: [number, number][] = [[x - w, base], [x - w * 0.5, base - hh * 0.45], [x - w * 0.3, base - hh * 0.7], [px, py]];
      const right: [number, number][] = [[px, py], [x + w * 0.2, base - hh * 0.72], [x + w * 0.55, base - hh * 0.32], [x + w, base]];
      // the shaded (right) mass, then the lit plane down its left
      ctx.fillStyle = dark;
      polyPath([...left, ...right.slice(1)])(ctx);
      ctx.fill();
      ctx.fillStyle = lit;
      polyPath([...left, [px + w * 0.05, base - hh * 0.5], [x - w * 0.1, base]])(ctx);
      ctx.fill();
      ctx.strokeStyle = rgba('#ff8a5a', 0.25 * (1.1 - depth));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      left.forEach(([lx, ly], k) => (k ? ctx.lineTo(lx, ly) : ctx.moveTo(lx, ly)));
      ctx.stroke();
    }
    haze(ctx, base - 90, base + 10, '#ff5a2a', 0.16 * depth, 0.8);
  }
}

/** A lava fall: molten rock pouring from a glowing crack in a rock lip, a ribbon down the far wall, a pool and spray
 * where it lands. */
function lavaFall(ctx: Ctx, r: R, f: (typeof TA.falls)[number]): void {
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(f.x - f.w * 0.4, f.top + 6);
    c.bezierCurveTo(f.x - f.w * 0.6, f.top + 80, f.x - f.w, f.bot - 120, f.x - f.w * 1.1, f.bot);
    c.lineTo(f.x + f.w * 1.1, f.bot);
    c.bezierCurveTo(f.x + f.w, f.bot - 120, f.x + f.w * 0.6, f.top + 80, f.x + f.w * 0.4, f.top + 6);
    c.closePath();
  };
  glowAt(ctx, f.x, (f.top + f.bot) / 2, 140, '#ff5a1a', 0.3, 1.6);
  const g = ctx.createLinearGradient(f.x - f.w, 0, f.x + f.w, 0);
  g.addColorStop(0, '#a8220a');
  g.addColorStop(0.4, '#ff9a2a');
  g.addColorStop(0.55, '#ffd070');
  g.addColorStop(1, '#c0300a');
  path(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, path, () => {
    // streaks of crust riding down the flow
    ctx.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const dx = (k / 6 - 0.5) * f.w * 1.6;
      ctx.strokeStyle = k % 2 ? 'rgba(120,20,6,0.4)' : 'rgba(255,230,160,0.3)';
      ctx.lineWidth = k % 2 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(f.x + dx * 0.3, f.top + 10);
      ctx.bezierCurveTo(f.x + dx * 0.6, f.top + 90, f.x + dx * 0.9, f.bot - 100, f.x + dx, f.bot);
      ctx.stroke();
    }
  });
  // where it pours from: a cave mouth in the cliff, dark inside, its lower lip glowing with the lava
  ctx.fillStyle = '#0c0608';
  ctx.beginPath();
  ctx.ellipse(f.x, f.top, f.w * 1.6, f.w * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,150,50,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(f.x, f.top, f.w * 1.6, f.w * 0.9, 0, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  glowAt(ctx, f.x, f.top + 6, 46, '#ff9a40', 0.45, 0.6);
  // the pool it falls into, and spray
  ctx.fillStyle = '#ff8a2a';
  ctx.beginPath();
  ctx.ellipse(f.x, f.bot + 2, f.w * 2.4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd070';
  ctx.beginPath();
  ctx.ellipse(f.x, f.bot + 1, f.w * 1.2, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = rgba('#ffc060', 0.6 + r() * 0.4);
    ctx.beginPath();
    ctx.arc(f.x + (r() - 0.5) * f.w * 4, f.bot - 4 - r() * 22, 1.2 + r() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  glowAt(ctx, f.x, f.bot, 90, '#ff9a40', 0.42, 0.4);
  haze(ctx, f.bot - 40, f.bot + 20, '#ff8a3a', 0.25, 0.7, f.x - 120, f.x + 120);
}

// ——— the cavern ———

/** A rough outline: each edge broken into short jagged steps (rock never runs straight). */
function rough(pts: [number, number][], r: R, step = 34, amp = 12): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / step));
    const nx = -(y1 - y0) / (len || 1);
    const ny = (x1 - x0) / (len || 1);
    // edges along the frame (off screen) stay straight
    const off = (x: number, y: number) => x < 0 || x > W || y < 0;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const j = k === 0 || off(x0, y0) && off(x1, y1) ? 0 : (r() - 0.5) * 2 * amp;
      out.push([x + nx * j, y + ny * j]);
    }
  }
  return out;
}

/** A mass of basalt: a broken silhouette lit by the one light; inside, faceted planes (each lit by how it faces the
 * key light), cracks between them and a hint of columnar jointing low down; a cold rim on the far edge and the
 * pit's red on the face that looks at it. */
function basalt(ctx: Ctx, r: R, pts0: [number, number][], depth: number, o: { pitSide?: number; col?: string } = {}): void {
  const pts = rough(pts0, r, 30, 10 * (1 - depth * 0.5));
  const path = polyPath(pts);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  const base = o.col ?? BASALT;
  solid(ctx, path, box, ROCK, base, { depth, air: CAVE, formSize: 46 });
  const lit = airMix(shade(base, 0.22), depth, CAVE);
  const dark = airMix(mix(shade(base, -0.45), '#0c0818', 0.35), depth, CAVE);
  within(ctx, path, () => {
    // facets: irregular plates, each facing its own way
    const n = Math.round((box.w * box.h) / 9000);
    for (let i = 0; i < n; i++) {
      const cx = box.x + r() * box.w;
      const cy = box.y + r() * box.h;
      const rad = 26 + r() * 50;
      const ang = r() * Math.PI * 2;
      const face = Math.cos(ang) * -0.6 + Math.sin(ang) * -0.8; // towards the key light: lit
      const poly: [number, number][] = [];
      const k = 5 + Math.floor(r() * 3);
      for (let j = 0; j < k; j++) {
        const a = (j / k) * Math.PI * 2 + r() * 0.4;
        const rr = rad * (0.6 + r() * 0.5);
        // (tall plates: basalt breaks along its columns)
        poly.push([cx + Math.cos(a) * rr * 0.55, cy + Math.sin(a) * rr * 1.3]);
      }
      polyPath(poly)(ctx);
      ctx.fillStyle = rgba(face > 0 ? lit : dark, Math.abs(face) * 0.32);
      ctx.fill();
      // the plate's upper-left edge catches the light, its lower-right drops into a crack
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba('#000000', 0.22);
      ctx.beginPath();
      poly.slice(0, Math.ceil(k / 2) + 1).forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
      ctx.strokeStyle = rgba('#b8b0e8', 0.1);
      ctx.beginPath();
      poly.slice(Math.ceil(k / 2)).concat([poly[0]]).forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
    }
    // columnar jointing low down: a few irregular vertical cracks
    for (let x = box.x + r() * 60; x < box.x + box.w; x += 40 + r() * 70) {
      const y0 = box.y + box.h * (0.45 + r() * 0.3);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + (r() - 0.5) * 10, box.y + box.h);
      ctx.stroke();
      ctx.strokeStyle = rgba('#9aa0d8', 0.08);
      ctx.beginPath();
      ctx.moveTo(x - 2, y0);
      ctx.lineTo(x - 2 + (r() - 0.5) * 10, box.y + box.h);
      ctx.stroke();
    }
    grain(ctx, box, 'cast', 0.3 * (1 - depth * 0.5), 1.2);
    broken(ctx, box, 0.35, 8, Math.round(box.x));
    // the abyss's red on the face that looks at it
    if (o.pitSide) {
      const gx = o.pitSide > 0 ? box.x + box.w : box.x;
      const g = ctx.createLinearGradient(gx, 0, gx - o.pitSide * 300, 0);
      g.addColorStop(0, rgba('#ff5a2a', 0.36 * (1 - depth * 0.3)));
      g.addColorStop(1, rgba('#ff5a2a', 0));
      ctx.fillStyle = g;
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }
    // its foot sinks into the dark at the water
    vfill(ctx, box.x, box.y + box.h - 90, box.w, 90, [[0, 'rgba(6,3,10,0)'], [1, 'rgba(6,3,10,0.7)']]);
  });
  rim(ctx, path, 0.35 * (1 - depth * 0.6), 4);
}

function cavern(ctx: Ctx, r: R): void {
  // far walls closing in on the abyss (their feet run down behind the far bank)
  basalt(ctx, r, [[-20, -10], [560, -10], [600, 70], [640, 200], [660, 300], [700, 380], [730, 470], [770, 560], [-20, 560]], 0.55, { pitSide: 1 });
  basalt(ctx, r, [[W + 20, -10], [1360, -10], [1310, 90], [1275, 220], [1240, 330], [1215, 420], [1160, 500], [1130, 560], [W + 20, 560]], 0.55, { pitSide: -1 });
  for (const f of TA.falls) lavaFall(ctx, r, f);
  // nearer shelves
  basalt(ctx, r, [[-20, 250], [130, 214], [260, 260], [350, 360], [400, 470], [430, 560], [-20, 600]], 0.32, { pitSide: 1, col: '#2a2632' });
  basalt(ctx, r, [[W + 20, 236], [1780, 210], [1660, 280], [1580, 390], [1530, 480], [1500, 560], [W + 20, 600]], 0.32, { pitSide: -1, col: '#2a2632' });
  // stalactites, short (the boss bar lives up here), lit on their left
  for (let i = 0; i < 22; i++) {
    const x = 470 + r() * 980;
    const len = 26 + r() * 74;
    const w = 14 + r() * 26;
    const p = polyPath([[x - w / 2, -4], [x + (r() - 0.5) * 6, len], [x + w / 2, -4]]);
    solid(ctx, p, { x: x - w / 2, y: 0, w, h: len }, ROCK, '#241e2c', { depth: 0.6, air: CAVE, formSize: w * 0.3 });
    ctx.fillStyle = rgba('#ff6a3a', 0.12);
    ctx.beginPath();
    ctx.arc(x, len - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  vfill(ctx, 0, 0, W, 120, [[0, 'rgba(4,2,8,0.8)'], [1, 'rgba(4,2,8,0)']]);
}

function temple(ctx: Ctx, r: R): void {
  // the ruined gate of Hades on the far bank: a pediment on columns, its doorway burning
  const depth = 0.72;
  const tx = 790;
  const col = airMix('#2a1820', depth, PIT);
  const ink = airMix('#120810', depth, PIT);
  ctx.fillStyle = col;
  ctx.strokeStyle = ink;
  ctx.lineWidth = lineAt(depth);
  // steps
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.rect(tx - 160 + k * 10, 500 - k * 8, 320 - k * 20, 9);
    ctx.fill();
    ctx.stroke();
  }
  // the door's fire behind the columns
  glowAt(ctx, tx, 462, 110, '#ff6a2a', 0.38, 0.9);
  vfill(ctx, tx - 50, 428, 100, 60, [[0, '#a8320e'], [1, '#ff7a2a']]);
  ctx.fillStyle = col;
  for (let k = 0; k < 6; k++) {
    const cx = tx - 125 + k * 48;
    const top = k === 4 ? 452 : 420;
    ctx.beginPath();
    ctx.rect(cx, top, 18, 478 - top);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = rgba('#ff7a3a', 0.25);
    ctx.fillRect(cx + 12, top, 6, 478 - top);
    ctx.fillStyle = col;
  }
  // entablature and a broken pediment
  ctx.beginPath();
  ctx.rect(tx - 140, 406, 270, 14);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx - 146, 406);
  ctx.lineTo(tx - 10, 362);
  ctx.lineTo(tx + 40, 372);
  ctx.lineTo(tx + 60, 392);
  ctx.lineTo(tx + 90, 384);
  ctx.lineTo(tx + 136, 406);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // the far bank under it
  ctx.beginPath();
  ctx.moveTo(-20, 528);
  for (let x = -20; x <= W + 20; x += 40) ctx.lineTo(x, 500 + Math.sin(x * 0.011) * 10 + r() * 8);
  ctx.lineTo(W + 20, 540);
  ctx.lineTo(-20, 540);
  ctx.closePath();
  ctx.fillStyle = airMix('#160c14', 0.6, PIT);
  ctx.fill();
  ctx.strokeStyle = rgba('#ff6a3a', 0.4);
  ctx.lineWidth = 2;
  ctx.stroke();
}

function styx(ctx: Ctx, r: R): void {
  const { y0, y1 } = TA.river;
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-20, y0 + 6);
    c.bezierCurveTo(600, y0 - 14, 1300, y0 + 20, W + 20, y0);
    c.lineTo(W + 20, y1 + 16);
    c.bezierCurveTo(1300, y1 + 30, 600, y1 - 6, -20, y1 + 22);
    c.closePath();
  };
  within(ctx, path, () => {
    water(ctx, r, 0, W, y0 - 20, y1 + 30, { far: '#164a52', near: '#06161e', ripple: '#9affe8', ripples: 260, glitterX: TA.pit.x, glitter: '#ffb070', glitterA: 0.35 });
    // the temple's fire and the pit, reflected and broken by the current
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rgba('#ff7a3a', 0.12 + r() * 0.12);
      ctx.fillRect(790 + (r() - 0.5) * 120, y0 + 6 + r() * 40, 10 + r() * 30, 2);
    }
    // faces of lost souls under the surface
    for (let i = 0; i < 9; i++) {
      const x = 80 + r() * 1760;
      if (Math.abs(x - VX) < 140) continue;
      const y = y0 + 26 + r() * 42;
      ctx.fillStyle = 'rgba(170,255,230,0.12)';
      ctx.beginPath();
      ctx.ellipse(x, y, 13, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,30,30,0.45)';
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + d * 4.5, y - 3, 2.5, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(x, y + 7, 2.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    haze(ctx, y0 - 20, y0 + 40, '#8affe0', 0.12, 0.6);
  });
  glowAt(ctx, VX, (y0 + y1) / 2, 900, '#3affd0', 0.08, 0.12);
}

// ——— the near bank ———

function bank(ctx: Ctx, r: R): void {
  const { y1 } = TA.river;
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-20, y1 + 22);
    c.bezierCurveTo(600, y1 - 6, 1300, y1 + 30, W + 20, y1 + 16);
    c.lineTo(W + 20, TY + 2);
    c.lineTo(-20, TY + 2);
    c.closePath();
  };
  solid(ctx, path, { x: 0, y: y1, w: W, h: TY - y1 }, ROCK, '#2a2430', { depth: 0.25, air: CAVE, line: false, formSize: 30 });
  within(ctx, path, () => {
    broken(ctx, { x: 0, y: y1, w: W, h: TY - y1 }, 0.5, 10, 61);
    grain(ctx, { x: 0, y: y1, w: W, h: TY - y1 }, 'cast', 0.35, 1.3);
    // ash drifts, lit grey on top
    for (let i = 0; i < 50; i++) {
      const x = r() * W;
      const y = y1 + 20 + r() * (TY - y1 - 20);
      ctx.fillStyle = rgba('#6a6070', 0.25);
      ctx.beginPath();
      ctx.ellipse(x, y, 30 + r() * 60, 4 + r() * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // the shore's wet lip
    ctx.strokeStyle = rgba('#8affe0', 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, y1 + 24);
    ctx.bezierCurveTo(600, y1 - 4, 1300, y1 + 32, W + 20, y1 + 18);
    ctx.stroke();
    crevice(ctx, 0, W, y1 + 20, 40, 0.4, '#05030a');
    // fissures with lava glowing in them (the live layer makes them pulse)
    for (const f of FISSURES) fissure(ctx, f, 1);
    // the table's back edge throws the bank behind it into shade
    crevice(ctx, 0, W, TY, -50, 0.5, '#000000');
  });
  // the soul-fires' blue light on the ground round the braziers
  for (const b of TA.braziers) lightPool(ctx, b.x, b.y, 200, 40, '#4fb8ff', 0.25);
  // a worn flagstone path from the jetty down to the table
  ctx.save();
  const pp = polyPath([[VX - 110, 602], [VX + 110, 602], [VX + 300, TY + 2], [VX - 300, TY + 2]]);
  pp(ctx);
  ctx.clip();
  ctx.fillStyle = '#1a1620';
  ctx.fillRect(VX - 320, 600, 640, TY - 598);
  for (let y = 604, k = 0; y < TY; k++) {
    const hgt = 22 + k * 8;
    for (let x = VX - 330 + (k % 2) * 40; x < VX + 330; x += 80) {
      const p = rrPath(x + 3, y + 3, 74, hgt - 5, 6);
      solid(ctx, p, { x, y, w: 80, h: hgt }, ROCK, shade('#4a4252', (r() - 0.5) * 0.2), { depth: 0.22, air: CAVE, line: 1.6, formSize: 6 });
    }
    y += hgt;
  }
  ctx.restore();
}

/** Charon's jetty: a deck on posts and a mooring rope. */
function jetty(ctx: Ctx): void {
  const deck = rectPath(VX - 112, TA.jetty, 224, 16);
  castShadow(ctx, deck, 10, 8, 0.5, '#000000');
  solid(ctx, deck, { x: VX - 112, y: TA.jetty, w: 224, h: 16 }, 'wood', '#4a3626', { depth: 0.28, air: CAVE, formSize: 5 });
  for (const dx of [-100, -32, 36, 100]) {
    const post = rectPath(VX + dx - 7, TA.jetty - 18, 14, 44);
    solid(ctx, post, { x: VX + dx - 7, y: TA.jetty - 18, w: 14, h: 44 }, 'wood', '#3a2a1e', { depth: 0.28, air: CAVE, formSize: 4 });
  }
  // a mooring rope
  hang(ctx, VX - 100, TA.jetty - 10, VX - 32, TA.jetty - 10, 10, '#8a6a4a', 2.5);
}

type Fissure = [number, number][];
const FISSURES: Fissure[] = [
  [[120, 690], [190, 700], [240, 688], [330, 706], [380, 740], [420, 760]],
  [[1490, 760], [1540, 726], [1610, 736], [1700, 716], [1790, 728], [1880, 708]],
  [[560, 650], [610, 668], [650, 662], [700, 690]],
  [[1250, 690], [1300, 668], [1360, 674], [1400, 650]],
];

function fissure(ctx: Ctx, pts: Fissure, a: number): void {
  for (const [w, col, al] of [[14, '#ff3a0a', 0.25], [6, '#ff8a2a', 0.8], [2, '#fff0a0', 0.9]] as const) {
    ctx.strokeStyle = rgba(col, al * a);
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
}

/** A Greek column, broken off, of dark stone; the chains of bronze that bind it. */
function column(ctx: Ctx, r: R, p: (typeof TA.pillars)[number]): void {
  {
    const x0 = p.x - p.w / 2;
    const top = p.top;
    // the broken top: a jagged edge
    const shaft = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x0 + 4, p.base - 30);
      c.lineTo(x0 + 6, top + 16);
      c.lineTo(x0 + p.w * 0.3, top - 6);
      c.lineTo(x0 + p.w * 0.45, top + 12);
      c.lineTo(x0 + p.w * 0.7, top - 14);
      c.lineTo(x0 + p.w - 6, top + 8);
      c.lineTo(x0 + p.w - 4, p.base - 30);
      c.closePath();
    };
    castShadow(ctx, shaft, 30, 26, 0.5, '#000000');
    solid(ctx, shaft, { x: x0, y: top, w: p.w, h: p.base - top }, ROCK, '#5a5468', { depth: 0.2, air: CAVE, formSize: p.w * 0.35 });
    within(ctx, shaft, () => {
      // flutes
      for (let k = 1; k < 6; k++) {
        const fx = x0 + (p.w * k) / 6;
        ctx.fillStyle = 'rgba(10,6,20,0.28)';
        ctx.fillRect(fx - 2, top, 4, p.base - top);
        ctx.fillStyle = rgba('#d8d0ff', 0.1);
        ctx.fillRect(fx + 2, top, 2, p.base - top);
      }
      // cracks
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let cy = top + 20 + r() * 40;
      let cx = x0 + p.w * 0.5;
      ctx.moveTo(cx, cy);
      for (let k = 0; k < 6; k++) ctx.lineTo((cx += (r() - 0.5) * 20), (cy += 20 + r() * 20));
      ctx.stroke();
      // the pit's light on the inner side, the soul-fire's blue on the outer
      const inner = p.x < VX ? 1 : -1;
      const gx = inner > 0 ? x0 + p.w : x0;
      const g = ctx.createLinearGradient(gx, 0, gx - inner * p.w * 0.6, 0);
      g.addColorStop(0, rgba('#ff6a3a', 0.25));
      g.addColorStop(1, rgba('#ff6a3a', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x0, top, p.w, p.base - top);
    });
    // base and plinth
    const plinth = rrPath(x0 - 14, p.base - 32, p.w + 28, 34, 3);
    solid(ctx, plinth, { x: x0 - 14, y: p.base - 32, w: p.w + 28, h: 34 }, ROCK, '#4a4458', { depth: 0.2, air: CAVE, formSize: 8 });
    ao(ctx, p.x, p.base + 2, p.w, 10, 0.6, 0, '#000000');
    // chains: wrapped round it and run out to an anchor in the rock
    const wrap = (y: number, dy: number) => hang(ctx, x0 - 4, y, x0 + p.w + 4, y + dy, 12, BRONZE, 5, true);
    wrap(top + 120, 36);
    wrap(top + 240, 26);
    const out = p.x < VX ? 1 : -1;
    hang(ctx, p.x + (out * p.w) / 2, top + 156, p.x + out * (p.w + 80), p.base - 8, 30, '#a8742e', 5, true);
    const anchor = ellPath(p.x + out * (p.w + 80), p.base - 6, 10, 6);
    solid(ctx, anchor, { x: p.x + out * (p.w + 80) - 10, y: p.base - 12, w: 20, h: 12 }, 'iron', '#4a4040', { depth: 0.2, line: 2 });
  }
}

/** A bronze tripod brazier (the soul-fire is painted in the still, live otherwise). */
function brazier(ctx: Ctx, x: number, y: number, s: number): void {
  for (const [dx, lean] of [[-30, -0.25], [0, 0], [30, 0.25]] as const) {
    const leg = polyPath([[x + dx * s * 0.4 - 4, y - 60 * s], [x + dx * s * 0.4 + 4, y - 60 * s], [x + dx * s + lean * 10 + 4, y], [x + dx * s + lean * 10 - 4, y]]);
    solid(ctx, leg, { x: x - 40, y: y - 60 * s, w: 80, h: 60 * s }, 'chrome', shade(BRONZE, -0.15), { depth: 0.18, air: CAVE, line: 2.4, formSize: 4 });
  }
  groundShadow(ctx, x + 10, y + 2, 50 * s, 8, 0.55, '#000000');
  const bowl = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 62 * s, y - 92 * s);
    c.quadraticCurveTo(x - 56 * s, y - 52 * s, x, y - 52 * s);
    c.quadraticCurveTo(x + 56 * s, y - 52 * s, x + 62 * s, y - 92 * s);
    c.closePath();
  };
  solid(ctx, bowl, { x: x - 62 * s, y: y - 92 * s, w: 124 * s, h: 40 * s }, 'chrome', BRONZE, { depth: 0.18, air: CAVE, formSize: 12 });
  within(ctx, bowl, () => {
    // a band of key pattern
    ctx.strokeStyle = rgba('#3a2208', 0.6);
    ctx.lineWidth = 2;
    for (let k = -5; k <= 5; k++) {
      const kx = x + k * 11 * s;
      ctx.strokeRect(kx - 4, y - 80 * s, 8, 8);
    }
  });
  bounce(ctx, bowl, x, y - 92 * s, [x, y - 140 * s], '#7ad0ff', 0.5, 6);
  // the bowl's lip, full of pale coals
  ctx.beginPath();
  ctx.ellipse(x, y - 92 * s, 62 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#9ad8ff';
  ctx.fill();
  ctx.strokeStyle = shade(BRONZE, -0.5);
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function soulFireStill(ctx: Ctx): void {
  for (const b of TA.braziers) {
    glowAt(ctx, b.x, b.y - 140, 200, '#4fb8ff', 0.35);
    flameShape(ctx, b.x, b.y - 96, 90, 150, ['#1a6aff', '#4fb8ff', '#a8e4ff']);
  }
}

function asphodelField(ctx: Ctx, r: R): void {
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    if (Math.abs(x - VX) < 300) continue;
    const y = 700 + r() * 54;
    const h = 40 + r() * 46;
    ctx.strokeStyle = '#3a5a44';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 16, y - h / 2, x + (r() - 0.5) * 10, y - h);
    ctx.stroke();
    for (let k = 0; k < 5; k++) {
      const fx = x + (r() - 0.5) * 16;
      const fy = y - h + k * 9;
      const p = ellPath(fx, fy, 5, 3.5, r() * 3);
      solid(ctx, p, { x: fx - 5, y: fy - 5, w: 10, h: 10 }, 'plastic', '#ece8d8', { depth: 0.15, line: 1, formSize: 2, spec: false });
      ctx.fillStyle = '#e8b84a';
      ctx.fillRect(fx - 1, fy - 1, 2, 2);
    }
  }
  // skulls and bones in the ash at the foot of the path
  skull(ctx, 652, 742, 0.95);
  bone(ctx, 712, 750, 60, 0.3);
  bone(ctx, 1258, 746, 52, -0.5);
  skull(ctx, 1318, 738, 0.75);
}

function skull(ctx: Ctx, x: number, y: number, s: number): void {
  const cr = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, y - 6 * s, 20 * s, 18 * s, 0, Math.PI * 0.95, Math.PI * 2.05);
    c.lineTo(x + 12 * s, y + 10 * s);
    c.lineTo(x - 12 * s, y + 10 * s);
    c.closePath();
  };
  groundShadow(ctx, x + 6, y + 10 * s, 24 * s, 5, 0.6, '#000000');
  solid(ctx, cr, { x: x - 20 * s, y: y - 24 * s, w: 40 * s, h: 34 * s }, 'stone', '#e0d4b8', { depth: 0.12, air: CAVE, line: 2.2, formSize: 6 * s });
  ctx.fillStyle = '#120a10';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + d * 8 * s, y - 4 * s, 5.5 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x, y + 1 * s);
  ctx.lineTo(x - 3 * s, y + 6 * s);
  ctx.lineTo(x + 3 * s, y + 6 * s);
  ctx.fill();
}

function bone(ctx: Ctx, x: number, y: number, len: number, ang: number): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const p = (g: Ctx) => {
    g.beginPath();
    g.moveTo(x - c * len * 0.5 - s * 4, y - s * len * 0.5 + c * 4);
    g.lineTo(x + c * len * 0.5 - s * 4, y + s * len * 0.5 + c * 4);
    g.arc(x + c * len * 0.5, y + s * len * 0.5, 7, ang + Math.PI / 2, ang - Math.PI / 2, true);
    g.lineTo(x - c * len * 0.5 + s * 4, y - s * len * 0.5 - c * 4);
    g.arc(x - c * len * 0.5, y - s * len * 0.5, 7, ang - Math.PI / 2, ang + Math.PI / 2, true);
    g.closePath();
  };
  solid(ctx, p, { x: x - len / 2, y: y - 10, w: len, h: 20 }, 'stone', '#ddd0b2', { depth: 0.12, air: CAVE, line: 2, formSize: 4 });
}

// ——— the table: an obsidian slab with a bronze rim ———

function table(ctx: Ctx, r: R): void {
  const f = TA.front;
  const zf = zAt(f + 4);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY + 4, [[0, '#0c0a12'], [0.5, '#1c1824'], [1, '#2a2432']]);
  broken(ctx, { x: 0, y: TY, w: W, h: f - TY }, 0.35, 12, 91);
  // slab joints running to the vanishing point, lit on their left lip
  for (const X of [-1.6, -0.55, 0.55, 1.6]) {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB), TY);
    ctx.lineTo(xAt(X, zf), f + 4);
    ctx.stroke();
    ctx.strokeStyle = rgba('#a8a0d8', 0.14);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xAt(X + 0.012, ZB), TY);
    ctx.lineTo(xAt(X + 0.012, zf), f + 4);
    ctx.stroke();
  }
  // the glassy surface: the pit and the soul-fires reflected as soft streaks
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, col, a] of [[TA.pit.x, '#ff5a2a', 0.07], [TA.braziers[0].x, '#4fb8ff', 0.12], [TA.braziers[1].x, '#4fb8ff', 0.12]] as const) {
    const g = ctx.createLinearGradient(0, TY, 0, f);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    planeQuad(ctx, (x - VX) / (FOCAL / ZB) - 0.35, (x - VX) / (FOCAL / ZB) + 0.35, ZB, zf);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // fine white veins in the glass
  for (let i = 0; i < 9; i++) {
    let x = r() * W;
    let y = TY + r() * (f - TY);
    ctx.strokeStyle = rgba('#c8c0f0', 0.1 + r() * 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) ctx.lineTo((x += 20 + r() * 50), (y += (r() - 0.5) * 20));
    ctx.stroke();
  }
  grain(ctx, { x: 0, y: TY, w: W, h: f - TY }, 'stone', 0.18, 1.4);
  ctx.restore();
  tableFalloff(ctx, f, 0.45, '#04020a');
  crevice(ctx, 0, W, TY, 30, 0.6, '#000000');
  ctx.fillStyle = 'rgba(160,150,220,0.2)';
  ctx.fillRect(0, TY, W, 2);
  // the bronze rim with its key pattern
  const rimPath = rectPath(0, f, W, 1080 - f);
  solid(ctx, rimPath, { x: 0, y: f, w: W, h: 40 }, 'chrome', '#7a5428', { depth: 0, line: false, formSize: 8 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  ctx.strokeStyle = '#e8b860';
  ctx.lineWidth = 3;
  const cy = f + 22;
  for (let x = -10; x < W; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, cy + 10);
    ctx.lineTo(x, cy - 10);
    ctx.lineTo(x + 20, cy - 10);
    ctx.lineTo(x + 20, cy + 4);
    ctx.lineTo(x + 8, cy + 4);
    ctx.lineTo(x + 8, cy - 3);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,230,170,0.5)';
  ctx.fillRect(0, f, W, 2);
  ctx.fillStyle = 'rgba(30,14,4,0.8)';
  ctx.fillRect(0, f + 2, W, 2);
  ctx.restore();
  specHi(ctx, 600, f + 10, 300, 6, 0.3, 0);
}
const FOCAL = 1210;

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.06, '#b8a8d8', 0.06);
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.12, '#0a0410', 40, 480);
  vignetteAll(ctx, 0.8, '#040208');
  vfill(ctx, 0, 0, W, 150, [[0, 'rgba(2,1,6,0.4)'], [1, 'rgba(2,1,6,0)']]);
}

const RIVER_BOX = { x: 0, y: TA.river.y0 - 40, w: W, h: TA.river.y1 - TA.river.y0 + 76 };
const FIRE_SLOT = { x: 0, y: 470, w: W, h: 260 };
/** Where the ferry (and the souls round it) go: its hull, the ferryman and his pole. */
const FERRY_BOX = { x: 0, y: 410, w: W, h: 182 };

export const TARTARUS: SceneSpec = {
  id: 'tartarus',
  info: {
    name: 'Tartarus',
    subtitle: 'Waves 86–89',
    ambient: ['embers', 'wisps'],
    glows: [{ x: TA.pit.x, y: TA.pit.y, r: 300, color: '#ff5a2a', flicker: 0.35 }],
    light: '#c8a8e8',
    tableTint: '#ece4f4',
  },
  layers: [
    { id: 'abyss', box: { x: 0, y: 0, w: W, h: TY + 4 }, draw: abyss },
    { id: 'cavern', box: { x: 0, y: 0, w: W, h: 620 }, draw: cavern },
    // the pit's glow, its eruptions and the lava falls' flow: behind the far bank, the river and the columns
    { id: 'farFire', box: { x: 200, y: 160, w: 1520, h: 430 }, motion: 'slot', draw: () => {} },
    { id: 'temple', box: { x: 0, y: 350, w: W, h: 200 }, draw: temple },
    { id: 'styx', box: RIVER_BOX, draw: styx },
    // Charon's ferry and the souls: behind the jetty and the chained columns
    { id: 'styxLife', box: FERRY_BOX, motion: 'slot', draw: () => {} },
    { id: 'bank', box: { x: 0, y: FERRY_BOX.y + FERRY_BOX.h, w: W, h: TY - FERRY_BOX.y - FERRY_BOX.h }, draw: bank },
    { id: 'jetty', box: { x: VX - 150, y: TA.jetty - 40, w: 300, h: 76 }, draw: jetty },
    { id: 'columnL', box: { x: TA.pillars[0].x - 80, y: 200, w: 220, h: 530 }, draw: (c, r) => column(c, r, TA.pillars[0]) },
    { id: 'columnR', box: { x: TA.pillars[1].x - 150, y: 230, w: 230, h: 500 }, draw: (c, r) => column(c, r, TA.pillars[1]) },
    ...TA.braziers.map((b, i) => ({ id: `brazier${i}`, box: { x: b.x - 80, y: b.y - 112, w: 170, h: 124 }, draw: (c: Ctx) => brazier(c, b.x, b.y, b.s) })),
    { id: 'fire', box: FIRE_SLOT, stillOnly: true, draw: (c) => soulFireStill(c) },
    // the soul-fires (the asphodel stands in front of them)
    { id: 'fireLive', box: FIRE_SLOT, motion: 'slot', draw: () => {} },
    { id: 'asphodel', box: { x: 0, y: 600, w: W, h: TY - 600 }, draw: asphodelField },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

registerKitScene(TARTARUS, (k, wave0) => {
  const far = k.slot('farFire');
  const life = k.slot('styxLife');
  const fire = k.slot('fireLive');
  // the pit's glow, rising wave by wave, and the red wash over the whole cavern
  const pit = k.glow(TA.pit.x, TA.horizon, 640, 0xff3a1a, 0.3, { into: far, sy: 0.24 });
  const pitCore = k.glow(TA.pit.x, TA.horizon + 6, 280, 0xffa040, 0.3, { into: far, sy: 0.4 });
  const red = k.wash(0xff3a1a, 0, Phaser.BlendModes.ADD);
  // the lava falls: bright gobbets sliding down each ribbon, a pulsing splash
  const blob = k.tex('ta_blob', 32, 48, (c) => {
    const g = c.createRadialGradient(16, 24, 1, 16, 24, 16);
    g.addColorStop(0, 'rgba(255,250,200,1)');
    g.addColorStop(0.5, 'rgba(255,170,60,0.7)');
    g.addColorStop(1, 'rgba(255,80,20,0)');
    c.fillStyle = g;
    c.scale(1, 1.5);
    c.fillRect(0, 0, 32, 32);
  });
  const drops = TA.falls.flatMap((f, fi) => Array.from({ length: 6 }, (_, i) => ({ f, img: k.img(blob, f.x, f.top, { into: far, add: true, scale: 0.6 + (fi ? 0 : 0.2) }), u: i / 6 + crand() * 0.1 })));
  const splashes = TA.falls.map((f) => k.glow(f.x, f.bot, 80, 0xffa040, 0.4, { into: far, sy: 0.5 }));
  // the fissures on the bank (drawn over the base) pulse as the lava breathes
  const crack = k.tex('ta_crack', 256, 64, (c) => {
    const g = c.createRadialGradient(128, 32, 2, 128, 32, 120);
    g.addColorStop(0, 'rgba(255,200,90,0.9)');
    g.addColorStop(1, 'rgba(255,80,20,0)');
    c.fillStyle = g;
    c.scale(1, 0.25);
    c.fillRect(0, 0, 256, 256);
  });
  const cracks = [[260, 708], [1690, 726], [630, 668], [1330, 668]].map(([x, y], i) => ({ img: k.img(crack, x, y, { add: true, alpha: 0, scale: i < 2 ? 1.2 : 0.7 }), seed: i * 2.3 }));
  // the Styx: soul wisps drifting, the current's glints, Charon's ferry
  const wisp = k.tex('ta_wisp', 128, 64, (c) => {
    const g = c.createRadialGradient(64, 32, 2, 64, 32, 60);
    g.addColorStop(0, 'rgba(200,255,240,0.8)');
    g.addColorStop(1, 'rgba(200,255,240,0)');
    c.fillStyle = g;
    c.scale(1, 0.5);
    c.fillRect(0, 0, 128, 128);
  });
  const wisps = Array.from({ length: 9 }, () => ({ img: k.img(wisp, crand() * W, TA.river.y0 + 10 + crand() * 70, { into: life, add: true, alpha: 0.2, sx: 1.4 + crand() * 2, sy: 0.6 + crand() * 0.5, tint: 0x8affe0 }), v: -10 - crand() * 16, seed: crand() * 9 }));
  const glints = Array.from({ length: 16 }, () => ({ img: k.img('soft', crand() * W, TA.river.y0 + 8 + crand() * 80, { into: life, add: true, alpha: 0, sx: 1.6, sy: 0.12, tint: 0x9affe8 }), seed: crand() * 20 }));
  const ferry = k.img(ferryTex(k), -260, TA.boat.y, { into: life, origin: [0.5, 0.8], scale: 0.66 });
  const lantern = k.glow(0, 0, 36, 0x2affa0, 0.4, { into: life });
  let bx = 200 + crand() * 900;
  // the braziers' soul-fire
  const ft = k.tex('ta_soulflame', 128, 192, (c) => flameShape(c, 64, 186, 96, 176, ['#1a6aff', '#4fb8ff', '#a8e4ff']));
  const flames = TA.braziers.flatMap((b, bi) => [0, 1, 2].map((j) => ({ img: k.img(ft, b.x + (j - 1) * 22, b.y - 94, { into: fire, add: true, origin: [0.5, 0.96], scale: j === 1 ? 0.75 : 0.5 }), base: j === 1 ? 0.75 : 0.5, seed: bi * 5 + j * 1.7 })));
  const halos = TA.braziers.map((b) => k.glow(b.x, b.y - 140, 220, 0x4fb8ff, 0.3, { into: fire }));
  // embers up out of the abyss, ash down
  // (the embers rising out of the abyss are the stage's ambient particles: BackdropView)
  k.emitter('soft', {
    x: { min: 0, max: W }, y: -10, lifespan: 12000, frequency: 260,
    speedY: { min: 30, max: 70 }, speedX: { min: -20, max: 20 }, scale: { min: 0.03, max: 0.07 },
    alpha: { values: [0, 0.6, 0.5, 0] }, tint: 0x8a8090,
  }, 10000);
  // eruptions in the far spires, from the third wave on
  const flash = k.glow(TA.pit.x, TA.horizon - 60, 700, 0xff7a2a, 0, { into: far, sy: 0.32 });
  let erupt = 0;
  let nextErupt = 6 + crand() * 6;
  let kw = waveK(wave0);
  let shown = kw;
  return {
    setWave: (w) => (kw = waveK(w)),
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      const breath = 0.85 + Math.sin(t * 1.3) * 0.1 + Math.sin(t * 3.7) * 0.05;
      pit.setAlpha(lerp(0.16, 0.42, shown) * breath);
      pitCore.setAlpha(lerp(0.12, 0.32, shown) * breath);
      red.setAlpha(lerp(0, 0.08, shown) * breath);
      for (const d of drops) {
        d.u = (d.u + dt * 0.22) % 1;
        const f = d.f;
        d.img.setPosition(f.x + Math.sin(d.u * 3 + f.x) * f.w * 0.3 * d.u, f.top + d.u * (f.bot - f.top)).setAlpha(Math.sin(d.u * Math.PI) * 0.8);
      }
      splashes.forEach((s, i) => s.setAlpha(0.3 + flicker(t, i * 3) * 0.2));
      for (const c of cracks) c.img.setAlpha((0.2 + shown * 0.25) * (0.6 + 0.4 * Math.sin(t * 1.1 + c.seed)));
      for (const w of wisps) {
        w.img.x += w.v * dt * calm();
        if (w.img.x < -150) w.img.x = W + 150;
        w.img.y += Math.sin(t * 0.7 + w.seed) * 0.05;
        w.img.setAlpha(0.12 + Math.sin(t * 0.5 + w.seed) * 0.06);
      }
      for (const g of glints) {
        const a = Math.max(0, Math.sin(t * 1.4 + g.seed));
        g.img.setAlpha(a * 0.35);
        g.img.x += dt * 8;
        if (a < 0.02 && Math.sin(t * 1.4 + g.seed - 0.1) > 0) g.img.x = crand() * W;
      }
      // Charon: poling slowly across, bobbing; passes behind the columns and the jetty (they draw over this slot)
      bx += dt * 24 * calm();
      if (bx > W + 260) bx = -260;
      ferry.setPosition(bx, TA.boat.y + Math.sin(t * 1.4) * 3).setRotation(Math.sin(t * 1.1) * 0.025);
      lantern.setPosition(bx + 0.66 * 102, TA.boat.y - 0.66 * 70).setAlpha(0.25 + flicker(t, 4) * 0.12);
      for (const f of flames) {
        const n = flicker(t, f.seed);
        f.img.setScale(f.base * (0.88 + n * 0.12), f.base * (0.8 + n * 0.3)).setRotation(wander(t, f.seed, 1.2) * 0.08);
      }
      halos.forEach((h, i) => h.setAlpha(0.26 + flicker(t, i * 7) * 0.08));
      // eruptions: a deep flash behind the spires, then it dies away
      if (shown > 0.4) {
        nextErupt -= dt;
        if (nextErupt < 0) {
          erupt = 1;
          nextErupt = lerp(14, 6, shown) + crand() * 5;
        }
      }
      erupt = Math.max(0, erupt - dt * 0.7);
      // (a soft swell rather than a flash when Settings turn flashes off or motion down)
      flash.setAlpha(erupt * erupt * (save.settings.flashes && !save.settings.reducedMotion ? 0.5 : 0.18));
    },
  };
});

/** Charon's ferry: a long black boat, the hooded ferryman leaning on his pole, a green lantern at the prow. */
function ferryTex(k: KitLive): string {
  return k.tex('ta_ferry', 320, 230, (c) => {
    const ink = OL;
    // pole
    c.strokeStyle = ink;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(112, 20);
    c.lineTo(200, 212);
    c.stroke();
    c.strokeStyle = '#6a4a2a';
    c.lineWidth = 3.5;
    c.stroke();
    // the ferryman: a hooded robe, one silhouette
    const robe = (g: Ctx) => {
      g.beginPath();
      g.moveTo(126, 172);
      g.bezierCurveTo(128, 130, 132, 96, 140, 78);
      g.quadraticCurveTo(156, 46, 172, 78);
      g.bezierCurveTo(182, 104, 186, 140, 188, 172);
      g.closePath();
    };
    solid(c, robe, { x: 126, y: 50, w: 62, h: 122 }, 'canvas', '#2e2640', { depth: 0, line: 4, formSize: 14 });
    c.fillStyle = '#05040a';
    c.beginPath();
    c.ellipse(156, 82, 8, 10, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#7affd8';
    c.fillRect(151, 80, 3, 2);
    c.fillRect(158, 80, 3, 2);
    // the hull
    const hull = (g: Ctx) => {
      g.beginPath();
      g.moveTo(14, 146);
      g.quadraticCurveTo(160, 206, 306, 132);
      g.lineTo(272, 176);
      g.quadraticCurveTo(160, 210, 40, 182);
      g.closePath();
    };
    solid(c, hull, { x: 14, y: 132, w: 292, h: 76 }, 'wood', '#2a2030', { depth: 0, line: 4.5, formSize: 12 });
    c.fillStyle = 'rgba(120,255,220,0.35)';
    c.fillRect(60, 172, 180, 3);
    rim(c, hull, 0.5, 3, '#8affe0');
    // the lantern on its hook
    c.strokeStyle = ink;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(286, 140);
    c.lineTo(286, 96);
    c.lineTo(262, 96);
    c.stroke();
    const g = c.createRadialGradient(262, 114, 2, 262, 114, 30);
    g.addColorStop(0, 'rgba(90,255,190,0.6)');
    g.addColorStop(1, 'rgba(90,255,190,0)');
    c.fillStyle = g;
    c.fillRect(230, 82, 64, 64);
    c.beginPath();
    c.roundRect(255, 104, 14, 20, 3);
    c.fillStyle = '#5af0b0';
    c.fill();
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#d8fff0';
    c.fillRect(259, 108, 3, 10);
  });
}

