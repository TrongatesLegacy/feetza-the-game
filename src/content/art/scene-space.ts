// The Orbital Pizzeria (Stage 6, waves 26–29), redrawn with the location kit (src/art/scene): a pizza counter on a
// space station. Riveted hull plate lit by the ceiling's light strip, a great porthole on the Earth's day side, the
// PIZZA neon in its smoked case, copper and steel service pipes with a red valve, the flight console under the
// porthole (its scopes and lamps) and a brushed-steel counter with a teal light along its edge.
// Live: the neon stutters through painted frames; meteors streak past with burning trails and a satellite tumbles
// by, its panels flashing as they turn to the sun; a relief valve vents billowing steam; a cable loom swings on its
// clips and the console's scopes spike when a foot stomps. Across the stage the station orbits into the Earth's
// shadow: the sun sets on the limb, the night side comes round with its cities lit and an aurora, the cabin goes to
// its night lighting and, from the third wave, the meteor-warning lamp turns as the showers thicken (the Cosmic
// Croc is coming).

import Phaser from 'phaser';
import { ROUND, neonStroke, neonText } from '../../art/backdrops';
import {
  type Ctx,
  type R,
  TY,
  W,
  calmLanes,
  castShadow,
  crevice,
  glowAt,
  gradeAll,
  lightPool,
  rectPath,
  rim,
  rrPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { aoHalo, lampOnWall } from '../../art/scene/light';
import { tableFalloff } from '../../art/scene/materials';
import { drift, lay, softly } from '../../art/scene/paint';
import { glassPane } from '../../art/scene/props';
import { stars } from '../../art/scene/sky';
import { nebula, planet, starburst } from '../../art/scene/space';
import { metalPlane, plates, rivet, rrBack } from '../../art/scene/surfaces';
import { spec as specHi } from '../../art/style/kit';
import { mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { type KitLive, calm, lerp, registerKitScene, waveK } from '../../game/sceneLive';
import { Loop, Parts, Rate, Swing, sheet, steamFrame } from '../../game/sceneAnim';

// ——— layout (the old art's: the porthole, the sign and the console stay where they were) ———

export const SPX = {
  ceil: 64,
  win: { x0: 400, x1: 1520, y0: 140, y1: 560, r: 84, frame: 34 },
  sign: { x: 1730, y: 330, x0: 1590, x1: 1870, y0: 162, y1: 498 },
  console: { x0: 160, x1: 1760, top: 600, y0: 618, y1: 704 },
  scopes: [{ x0: 430, x1: 650 }, { x0: 1270, x1: 1490 }],
  leds: { x0: 700, x1: 1220, y: 648 },
  pipes: [{ x: 72, w: 30, col: '#b8683a' }, { x: 132, w: 20, col: '#8c96a6' }],
  valve: { x: 72, y: 420 },
  vent: { x: 132, y: 236 },
  beacon: { x: 1556, y: 120 },
  loom: { x: 300 },
  earth: { x: 1150, y: 2000, r: 1620 },
  moon: { x: 1388, y: 228, r: 24 },
  front: 1036,
};

const HULL = '#4e586a';
const WIN = SPX.win;
/** The porthole's opening (a rounded rect). */
const WIN_BOX = { x: WIN.x0, y: WIN.y0, w: WIN.x1 - WIN.x0, h: WIN.y1 - WIN.y0 };
const winPath = rrPath(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, WIN.r);
const FRAME_BOX = { x: WIN.x0 - WIN.frame - 6, y: WIN.y0 - WIN.frame - 6, w: WIN.x1 - WIN.x0 + WIN.frame * 2 + 12, h: WIN.y1 - WIN.y0 + WIN.frame * 2 + 12 };

// ——— outside ———

function outside(ctx: Ctx, r: R, night: boolean): void {
  within(ctx, winPath, () => {
    vfill(ctx, WIN.x0, WIN.y0, WIN_BOX.w, WIN_BOX.h, night ? [[0, '#01020a'], [0.7, '#040818'], [1, '#08102a']] : [[0, '#02030c'], [0.6, '#060a1e'], [1, '#0c1838']]);
    nebula(ctx, r, { x: WIN.x0, y: WIN.y0, w: WIN_BOX.w, h: WIN_BOX.h }, night ? ['#5a3aa8', '#2a6ab8'] : ['#7a3aa0', '#2a4aa8'], night ? 0.34 : 0.22, 17);
    stars(ctx, r, { x: WIN.x0, y: WIN.y0, w: WIN_BOX.w, h: WIN_BOX.h - 60 }, night ? 520 : 300, '#f4f0ff');
    for (const [sx, sy, s] of [[512, 218, 2.4], [1060, 176, 2], [1268, 330, 1.6], [690, 412, 1.8]] as const) starburst(ctx, sx, sy, s, '#cfe0ff', night ? 0.9 : 0.6);
    // the moon, small and sharp (no air to soften it)
    const m = SPX.moon;
    const mg = ctx.createRadialGradient(m.x - 8, m.y - 8, 2, m.x, m.y, m.r);
    mg.addColorStop(0, '#f2eee4');
    mg.addColorStop(0.7, '#cfc8bc');
    mg.addColorStop(1, '#8a8478');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    within(ctx, (c) => { c.beginPath(); c.arc(m.x, m.y, m.r, 0, Math.PI * 2); }, () => {
      lay(ctx, drift('#e8e4dc', '#6a6660', 3, 23, 32, 32), { x: m.x - m.r, y: m.y - m.r, w: m.r * 2, h: m.r * 2 }, 0.6);
      // its night side, turned from the sun
      const sg = ctx.createLinearGradient(m.x - m.r, m.y - m.r, m.x + m.r, m.y + m.r);
      sg.addColorStop(0.55, 'rgba(4,4,12,0)');
      sg.addColorStop(0.85, 'rgba(4,4,12,0.7)');
      ctx.fillStyle = sg;
      ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
    });
    // the Earth's limb filling the bottom of the view
    const e = SPX.earth;
    planet(ctx, r, e.x, e.y, e.r, {
      ocean: night ? '#0a1a3a' : '#1668c8', land: night ? '#1a2418' : '#3e8a36', land2: night ? '#2a2418' : '#c8a464', atmo: '#6ac8ff', cloud: night ? '#5a6a8a' : '#f6f8ff',
      sunAng: night ? 1.2 : -2.1, phase: night ? -0.2 : 0.75, lights: night ? 1 : 0, clouds: 0.6, view: WIN_BOX, scale: 0.42, flat: 0.38, seed: 31,
    });
    // the air over the limb glows: a wide soft band of blue (the day side's), thin over the night side
    softly(ctx, WIN_BOX, (g) => {
      g.strokeStyle = night ? 'rgba(60,120,255,0.18)' : 'rgba(110,190,255,0.42)';
      g.lineWidth = 46;
      g.beginPath();
      g.arc(e.x, e.y, e.r + 14, Math.PI * 1.2, Math.PI * 1.8);
      g.stroke();
    }, 0.25, 'screen');
    if (night) {
      // an aurora hanging over the dark limb: curtains of green and violet
      softly(ctx, WIN_BOX, (g) => {
        g.globalCompositeOperation = 'lighter';
        // (folded curtains: a ribbon over the limb, its rays brightening and fading along it)
        for (let x = 520; x < WIN.x1; x += 4) {
          const fold = Math.sin(x * 0.013) * 0.5 + Math.sin(x * 0.041 + 1.3) * 0.3 + Math.sin(x * 0.11) * 0.2;
          const base = limbY(x) - 10 - Math.sin(x * 0.006) * 14;
          const h = 46 + fold * 30;
          const a = 0.18 + Math.max(0, fold) * 0.3;
          const gr = g.createLinearGradient(0, base - h * 1.6, 0, base);
          gr.addColorStop(0, 'rgba(170,90,255,0)');
          gr.addColorStop(0.35, rgba('#b06aff', a * 0.35));
          gr.addColorStop(0.75, rgba('#6effb0', a));
          gr.addColorStop(1, rgba('#4affa0', 0));
          g.fillStyle = gr;
          g.fillRect(x, base - h * 1.6, 5, h * 1.6);
        }
      }, 0.25);
    } else {
      // the sun's glare in the top-left corner of the glass
      glowAt(ctx, WIN.x0 + 30, WIN.y0 + 10, 380, '#fff0d0', 0.22);
      glowAt(ctx, WIN.x0 + 20, WIN.y0, 120, '#ffffff', 0.35);
    }
  });
}

/** The y of the Earth's limb at x. */
const limbY = (x: number): number => SPX.earth.y - Math.sqrt(Math.max(0, SPX.earth.r ** 2 - (x - SPX.earth.x) ** 2));

/** The sun setting on the limb (live: it swells and dies as the station crosses the terminator). */
function sunset(ctx: Ctx): void {
  const x = 1440;
  const y = limbY(x) - 2;
  within(ctx, winPath, () => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // the atmosphere's band lit edge-on: white, gold, orange, a thin red line and blue above
    for (const [dy, col, a, w] of [[-14, '#3a8aff', 0.35, 900], [-6, '#ff7a2a', 0.5, 700], [-2, '#ffd27a', 0.7, 520], [0, '#ffffff', 0.8, 200]] as const) {
      ctx.save();
      ctx.translate(x, y + dy);
      ctx.rotate(Math.atan2(limbY(x + 10) - limbY(x - 10), 20));
      ctx.scale(1, 0.05);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-w, -w, w * 2, w * 2);
      ctx.restore();
    }
    ctx.restore();
    starburst(ctx, x, y - 4, 7, '#ffe0a0', 1);
  });
}
const SUNSET_BOX = { x: 900, y: 300, w: 620, h: 220 };

// ——— the cabin ———

function wall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: SPX.ceil, w: W, h: TY - SPX.ceil };
  plates(ctx, r, box, HULL, { seamsX: [240, 480, 720, 960, 1200, 1440, 1680], seamsY: [250, 590], rivetGap: 60, rivetInset: 10, wear: 0.6, seed: 21 });
  // years in service: grime gathered under the console and round the pipes, scuffs low down
  softly(ctx, box, (g) => {
    g.fillStyle = 'rgba(10,8,14,0.35)';
    g.beginPath();
    g.ellipse(110, 520, 140, 380, 0, 0, Math.PI * 2);
    g.fill();
  }, 0.125);
  // the light: the ceiling's strip throws scalloped pools down the plate, the cabin darkens towards the floor
  vfill(ctx, 0, SPX.ceil, W, TY - SPX.ceil, [[0, 'rgba(6,8,16,0.1)'], [0.5, 'rgba(6,8,16,0.25)'], [1, 'rgba(6,8,16,0.5)']]);
  for (const x of [120, 340, 1610, 1820]) lampOnWall(ctx, x, SPX.ceil + 6, 80, { col: '#ffdcb0', a: 0.7, reach: 460, spread: 170, gap: 20, above: 0, op: 'screen' });
  for (const x of [620, 960, 1300]) lampOnWall(ctx, x, SPX.ceil + 6, 80, { col: '#ffdcb0', a: 0.45, reach: 120, spread: 160, gap: 20, above: 0, op: 'screen' });
  // the Earth's blue light through the porthole washes the plate round it
  lightPool(ctx, 960, 560, 900, 300, '#3a8aff', 0.1, 'screen');
  // the neon's spill
  lightPool(ctx, SPX.sign.x, SPX.sign.y, 330, 300, '#36e0ff', 0.12, 'screen');
  lightPool(ctx, SPX.sign.x, SPX.sign.y + 80, 240, 220, '#ffb03a', 0.1, 'screen');
  // the lower wall: a kick plate under the console, darker, scuffed, with the air return's grilles
  vfill(ctx, 0, SPX.console.y1, W, TY - SPX.console.y1, [[0, 'rgba(4,6,12,0.7)'], [0.3, 'rgba(4,6,12,0.45)'], [1, 'rgba(4,6,12,0.3)']]);
  for (const gx of [520, 1300]) {
    const gw = 200;
    const gy = 722;
    ctx.fillStyle = 'rgba(2,3,8,0.75)';
    ctx.beginPath();
    ctx.roundRect(gx - gw / 2, gy, gw, 26, 5);
    ctx.fill();
    for (let x = gx - gw / 2 + 10; x < gx + gw / 2 - 6; x += 12) {
      ctx.fillStyle = rgba('#8a96b0', 0.35);
      ctx.fillRect(x, gy + 4, 6, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, gy + 5.5, 6, 16);
    }
    ctx.strokeStyle = rgba('#a8b4cc', 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(gx - gw / 2, gy, gw, 26, 5);
    ctx.stroke();
  }
  // the ceiling: a dark truss and the strip light along its edge
  vfill(ctx, 0, 0, W, SPX.ceil, [[0, '#0c1018'], [1, '#1c2230']]);
  for (let x = 30; x < W; x += 120) {
    ctx.fillStyle = 'rgba(2,4,10,0.6)';
    ctx.fillRect(x, 0, 6, SPX.ceil - 12);
    ctx.fillStyle = rgba('#a8b4d0', 0.12);
    ctx.fillRect(x - 1, 0, 1.5, SPX.ceil - 12);
  }
  crevice(ctx, 0, W, SPX.ceil, 50, 0.5, '#04060c');
  // the strip: a diffuser lit from inside
  vfill(ctx, 0, SPX.ceil - 12, W, 10, [[0, '#fff6e4'], [1, '#d8c8a8']]);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, SPX.ceil - 2, W, 2);
  for (let x = 0; x < W; x += 240) {
    ctx.fillStyle = 'rgba(30,24,20,0.5)';
    ctx.fillRect(x, SPX.ceil - 12, 3, 10);
  }
  lightPool(ctx, W / 2, SPX.ceil, 1100, 40, '#fff0d0', 0.25);
}

/** The porthole: a heavy steel ring, bolted, its reveal deep (lit on the bottom and right, in shadow top and left),
 * a rubber gasket, the glass with the cabin's light in it and a bloom of frost in its corners. */
function porthole(ctx: Ctx, r: R): void {
  const f = WIN.frame;
  const ox = WIN.x0 - f;
  const oy = WIN.y0 - f;
  const ow = WIN_BOX.w + f * 2;
  const oh = WIN_BOX.h + f * 2;
  const ring = (c: Ctx) => {
    c.beginPath();
    c.roundRect(ox, oy, ow, oh, WIN.r + f);
    rrBack(c, WIN.x0, WIN.y0, WIN_BOX.w, WIN_BOX.h, WIN.r);
  };
  // glass first (the ring overlaps its edge)
  glassPane(ctx, winPath, WIN_BOX, { sheen: 0.035, reflect: [WIN.x0 + 260, WIN.y0 + 20, 140, '#ffe8c8'], dirt: 0.05 });
  within(ctx, winPath, () => {
    // the strip light reflected along the glass's top, frost blooming into the corners
    vfill(ctx, WIN.x0, WIN.y0, WIN_BOX.w, 26, [[0, 'rgba(255,240,220,0.12)'], [1, 'rgba(255,240,220,0)']]);
    for (const [cx, cy] of [[WIN.x0, WIN.y1], [WIN.x1, WIN.y1], [WIN.x0, WIN.y0], [WIN.x1, WIN.y0]] as const) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      g.addColorStop(0, 'rgba(210,230,255,0.16)');
      g.addColorStop(0.5, 'rgba(210,230,255,0.04)');
      g.addColorStop(1, 'rgba(210,230,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 120, cy - 120, 240, 240);
    }
    // a few fine scratches catching the light
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const x = WIN.x0 + 80 + r() * (WIN_BOX.w - 160);
      const y = WIN.y0 + 40 + r() * (WIN_BOX.h - 80);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 30 + r() * 60, y - 8 - r() * 20);
      ctx.stroke();
    }
    // the reveal's shadow on the glass edge (top and left), its lit face (bottom and right)
    ctx.lineWidth = 16;
    ctx.strokeStyle = 'rgba(2,4,10,0.6)';
    ctx.beginPath();
    ctx.roundRect(WIN.x0 - 2, WIN.y0 - 2, WIN_BOX.w + 4, WIN_BOX.h + 4, WIN.r);
    ctx.stroke();
  });
  castShadow(ctx, ring, 14, 20, 0.45, '#04060c');
  solid(ctx, ring, { x: ox, y: oy, w: ow, h: oh }, 'chrome', '#8e98aa', { depth: 0.1, formSize: 30, line: 3 });
  // a bevel round the inner edge: lit on its bottom-right (it faces the light), dark top-left
  ctx.save();
  ctx.lineWidth = 6;
  const bg = ctx.createLinearGradient(WIN.x0, WIN.y0, WIN.x1, WIN.y1);
  bg.addColorStop(0, 'rgba(10,14,24,0.8)');
  bg.addColorStop(0.5, 'rgba(60,70,90,0.6)');
  bg.addColorStop(1, 'rgba(230,236,250,0.75)');
  ctx.strokeStyle = bg;
  ctx.beginPath();
  ctx.roundRect(WIN.x0 - 4, WIN.y0 - 4, WIN_BOX.w + 8, WIN_BOX.h + 8, WIN.r + 4);
  ctx.stroke();
  // the gasket
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0e1016';
  ctx.beginPath();
  ctx.roundRect(WIN.x0 - 1, WIN.y0 - 1, WIN_BOX.w + 2, WIN_BOX.h + 2, WIN.r);
  ctx.stroke();
  ctx.restore();
  // the strip light's reflection along the ring's top, the Earth's blue on its bottom
  within(ctx, ring, () => {
    vfill(ctx, ox, oy, ow, 18, [[0, 'rgba(255,244,224,0.45)'], [1, 'rgba(255,244,224,0)']]);
    vfill(ctx, ox, WIN.y1, ow, f, [[0, 'rgba(90,170,255,0.25)'], [1, 'rgba(90,170,255,0)']]);
    lay(ctx, drift('#ffffff', '#1a2030', 8, 41, 200, 80), { x: ox, y: oy, w: ow, h: oh }, 0.12);
  });
  rim(ctx, ring, 0.35, 4);
  // bolts round the ring
  const n = 15;
  for (let i = 0; i < n; i++) {
    const x = WIN.x0 + 40 + (i / (n - 1)) * (WIN_BOX.w - 80);
    rivet(ctx, x, WIN.y0 - f / 2, 5, '#a8b0c0');
    rivet(ctx, x, WIN.y1 + f / 2, 5, '#a8b0c0');
  }
  for (const x of [WIN.x0 - f / 2, WIN.x1 + f / 2]) for (let y = WIN.y0 + 70; y < WIN.y1 - 40; y += 80) rivet(ctx, x, y, 5, '#a8b0c0');
}

/** The service pipes down the left: copper and steel, clamped to the hull, the red relief valve. */
function pipes(ctx: Ctx, r: R): void {
  for (const p of SPX.pipes) {
    const path = rectPath(p.x - p.w / 2, SPX.ceil - 4, p.w, SPX.console.y1 - SPX.ceil + 4);
    castShadow(ctx, path, 14, 14, 0.5, '#04060c');
    solid(ctx, path, { x: p.x - p.w / 2, y: SPX.ceil, w: p.w, h: 640 }, 'chrome', p.col, { depth: 0.08, formSize: p.w * 0.6, line: 2.5 });
    within(ctx, path, () => {
      // tarnish on the copper, a lit stripe down its curve
      lay(ctx, drift(shade(p.col, 0.2), mix(p.col, '#2a5a4a', 0.4), 6, 51 + p.x, 16, 128), { x: p.x - p.w / 2, y: SPX.ceil, w: p.w, h: 640 }, 0.4);
      ctx.fillStyle = 'rgba(255,240,220,0.35)';
      ctx.fillRect(p.x - p.w * 0.25, SPX.ceil, 2.5, 640);
    });
    // clamps
    for (const y of [150, 330, 520, 680]) {
      const c = rrPath(p.x - p.w / 2 - 6, y - 8, p.w + 12, 16, 3);
      castShadow(ctx, c, 6, 5, 0.45, '#04060c');
      solid(ctx, c, { x: p.x - p.w / 2 - 6, y: y - 8, w: p.w + 12, h: 16 }, 'iron', '#3a4250', { depth: 0.06, line: 2, formSize: 6 });
      rivet(ctx, p.x, y, 3, '#9aa2b0');
    }
  }
  // the red valve wheel on the copper
  const v = SPX.valve;
  const wheel = (c: Ctx) => {
    c.beginPath();
    c.arc(v.x, v.y, 32, 0, Math.PI * 2);
    c.arc(v.x, v.y, 22, 0, Math.PI * 2, true);
  };
  castShadow(ctx, wheel, 12, 10, 0.5, '#04060c');
  solid(ctx, wheel, { x: v.x - 32, y: v.y - 32, w: 64, h: 64 }, 'enamel', '#b8262a', { depth: 0.05, line: 3, formSize: 14 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    ctx.strokeStyle = '#7a1418';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(v.x + Math.cos(a) * 6, v.y + Math.sin(a) * 6);
    ctx.lineTo(v.x + Math.cos(a) * 24, v.y + Math.sin(a) * 24);
    ctx.stroke();
  }
  rivet(ctx, v.x, v.y, 7, '#c8c0b8');
  specHi(ctx, v.x - 14, v.y - 18, 10, 4, 0.5, -0.8);
  // the relief valve on the steel line, a pressure gauge under it
  const vt = SPX.vent;
  const nozzle = rrPath(vt.x - 4, vt.y - 12, 26, 20, 4);
  castShadow(ctx, nozzle, 6, 6, 0.45, '#04060c');
  solid(ctx, nozzle, { x: vt.x - 4, y: vt.y - 12, w: 26, h: 20 }, 'chrome', '#b0a078', { depth: 0.05, line: 2, formSize: 6 });
  ctx.fillStyle = '#0a0c10';
  ctx.beginPath();
  ctx.ellipse(vt.x + 22, vt.y - 2, 3, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  const gx = SPX.pipes[1].x + 2;
  const gy = 470;
  const dial = (c: Ctx) => {
    c.beginPath();
    c.arc(gx, gy, 22, 0, Math.PI * 2);
  };
  castShadow(ctx, dial, 8, 8, 0.5, '#04060c');
  solid(ctx, dial, { x: gx - 22, y: gy - 22, w: 44, h: 44 }, 'chrome', '#b8c0cc', { depth: 0.05, line: 2.5, formSize: 8 });
  ctx.fillStyle = '#ece8dc';
  ctx.beginPath();
  ctx.arc(gx, gy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2a30';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 0.8 + (i / 8) * Math.PI * 1.4;
    ctx.beginPath();
    ctx.moveTo(gx + Math.cos(a) * 12, gy + Math.sin(a) * 12);
    ctx.lineTo(gx + Math.cos(a) * 15, gy + Math.sin(a) * 15);
    ctx.stroke();
  }
  ctx.strokeStyle = '#c0201a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + 10, gy - 6);
  ctx.stroke();
  glassStreakSmall(ctx, gx - 8, gy - 10);
  void r;
}

const glassStreakSmall = (ctx: Ctx, x: number, y: number) => {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x, y, 6, 2.5, -0.7, 0, Math.PI * 2);
  ctx.fill();
};

/** The PIZZA neon's case: smoked acrylic on standoffs, the tubes cold (the lit tubes are their own layer). */
function signCase(ctx: Ctx): void {
  const s = SPX.sign;
  const p = rrPath(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0, 22);
  castShadow(ctx, p, 22, 26, 0.55, '#02040a');
  solid(ctx, p, { x: s.x0, y: s.y0, w: s.x1 - s.x0, h: s.y1 - s.y0 }, 'plastic', '#141a26', { depth: 0.12, formSize: 30, line: 3 });
  within(ctx, p, () => {
    vfill(ctx, s.x0, s.y0, s.x1 - s.x0, 60, [[0, 'rgba(255,240,220,0.14)'], [1, 'rgba(255,240,220,0)']]);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y1);
    ctx.lineTo(s.x0 + 90, s.y0);
    ctx.lineTo(s.x0 + 150, s.y0);
    ctx.lineTo(s.x0 + 60, s.y1);
    ctx.fill();
  });
  for (const [x, y] of [[s.x0 + 18, s.y0 + 18], [s.x1 - 18, s.y0 + 18], [s.x0 + 18, s.y1 - 18], [s.x1 - 18, s.y1 - 18]]) rivet(ctx, x, y, 6, '#b8c0cc');
  neonTubes(ctx, [0, 0, 0, 0, 0], 0);
}

/** The neon tubes: letters lit by `on` (per letter), the slice by `slice`. */
function neonTubes(ctx: Ctx, on: number[], slice: number): void {
  const s = SPX.sign;
  neonText(ctx, 'PIZZA', s.x, s.y0 + 52, 66, ROUND, '#36e0ff', on);
  const top = s.y0 + 104;
  neonStroke(ctx, '#ffc23a', 7, () => {
    ctx.beginPath();
    ctx.moveTo(s.x - 94, top);
    ctx.quadraticCurveTo(s.x, top - 22, s.x + 94, top);
    ctx.lineTo(s.x, s.y1 - 28);
    ctx.closePath();
    ctx.stroke();
  }, slice);
  for (const [dx, dy, rr] of [[-30, 40, 15], [26, 42, 13], [0, 96, 14], [-6, 150, 9]] as const)
    neonStroke(ctx, '#ff4f8a', 5, () => {
      ctx.beginPath();
      ctx.arc(s.x + dx, top + dy, rr, 0, Math.PI * 2);
      ctx.stroke();
    }, slice);
}
const NEON_BOX = { x: SPX.sign.x0 - 40, y: SPX.sign.y0 - 30, w: SPX.sign.x1 - SPX.sign.x0 + 80, h: SPX.sign.y1 - SPX.sign.y0 + 60 };

/** The flight console under the porthole: a sloped desk of enamelled steel, its two scopes, the status lamps. */
function consoleDesk(ctx: Ctx, r: R): void {
  const c = SPX.console;
  const body = (g: Ctx) => {
    g.beginPath();
    g.moveTo(c.x0 + 10, c.top);
    g.lineTo(c.x1 - 10, c.top);
    g.lineTo(c.x1, c.y0);
    g.lineTo(c.x1, c.y1);
    g.lineTo(c.x0, c.y1);
    g.lineTo(c.x0, c.y0);
    g.closePath();
  };
  aoHalo(ctx, body, 26, 0.5, '#02040a', 8);
  castShadow(ctx, body, 18, 18, 0.5, '#02040a');
  solid(ctx, body, { x: c.x0, y: c.top, w: c.x1 - c.x0, h: c.y1 - c.top }, 'enamel', '#2e3646', { depth: 0.08, formSize: 24, line: 3 });
  // the sloped top lit by the porthole's blue, its lip catching the ceiling light
  within(ctx, body, () => {
    vfill(ctx, c.x0, c.top, c.x1 - c.x0, c.y0 - c.top, [[0, 'rgba(120,190,255,0.35)'], [1, 'rgba(120,190,255,0.05)']]);
    ctx.fillStyle = 'rgba(255,240,220,0.35)';
    ctx.fillRect(c.x0, c.y0 - 1, c.x1 - c.x0, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(c.x0, c.y0 + 1, c.x1 - c.x0, 3);
    lay(ctx, drift('#5a6a8a', '#0a0e18', 9, 61, 256, 24), { x: c.x0, y: c.top, w: c.x1 - c.x0, h: c.y1 - c.top }, 0.25);
    // panel joins on the front
    for (const x of [400, 680, 1240, 1520]) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x, c.y0 + 3, 2, c.y1 - c.y0);
      ctx.fillStyle = 'rgba(200,220,255,0.1)';
      ctx.fillRect(x + 2, c.y0 + 3, 1, c.y1 - c.y0);
    }
    lightPool(ctx, SPX.sign.x - 100, c.y0, 260, 60, '#36e0ff', 0.12, 'screen');
  });
  // the scopes: deep glass bezels, phosphor grids
  for (const s of SPX.scopes) {
    const p = rrPath(s.x0, 624, s.x1 - s.x0, 60, 8);
    solid(ctx, rrPath(s.x0 - 6, 618, s.x1 - s.x0 + 12, 72, 11), { x: s.x0 - 6, y: 618, w: s.x1 - s.x0 + 12, h: 72 }, 'iron', '#1a1e26', { depth: 0.08, line: 2.5, formSize: 10 });
    within(ctx, p, () => {
      vfill(ctx, s.x0, 624, s.x1 - s.x0, 60, [[0, '#04140e'], [1, '#062216']]);
      ctx.strokeStyle = 'rgba(80,255,170,0.12)';
      ctx.lineWidth = 1;
      for (let x = s.x0 + 22; x < s.x1; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, 624);
        ctx.lineTo(x, 684);
        ctx.stroke();
      }
      for (const y of [639, 654, 669]) {
        ctx.beginPath();
        ctx.moveTo(s.x0, y);
        ctx.lineTo(s.x1, y);
        ctx.stroke();
      }
      glowAt(ctx, (s.x0 + s.x1) / 2, 654, 120, '#3aff9a', 0.1, 0.5);
      // the glass's curve catches the cabin light
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.ellipse(s.x0 + 50, 632, 50, 6, -0.05, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // status lamps in rows: lenses (the live layer lights them)
  for (let i = 0; i < 24; i++) {
    const x = SPX.leds.x0 + i * 22;
    ctx.fillStyle = '#0a0c12';
    ctx.beginPath();
    ctx.arc(x, SPX.leds.y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    const col = LED_COLS[i % LED_COLS.length];
    const g = ctx.createRadialGradient(x - 1.5, SPX.leds.y - 1.5, 0, x, SPX.leds.y, 5);
    g.addColorStop(0, mix(col, '#ffffff', 0.4));
    g.addColorStop(1, shade(col, -0.45));
    ctx.fillStyle = g;
    ctx.globalAlpha = i % 3 === 1 ? 0.45 : 0.9;
    ctx.beginPath();
    ctx.arc(x, SPX.leds.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // push buttons at the ends
  for (const [x0, cols] of [[240, ['#ff4a4a', '#4aff8a', '#4ad8ff']], [1590, ['#ffb84a', '#4aff8a', '#ff4a4a']]] as const)
    cols.forEach((col, i) => {
      const x = x0 + i * 42;
      const b = (g: Ctx) => {
        g.beginPath();
        g.arc(x, 650, 11, 0, Math.PI * 2);
      };
      solid(ctx, rrPath(x - 16, 634, 32, 32, 6), { x: x - 16, y: 634, w: 32, h: 32 }, 'iron', '#242a36', { depth: 0.06, line: 2, formSize: 6 });
      solid(ctx, b, { x: x - 11, y: 639, w: 22, h: 22 }, 'plastic', col, { depth: 0.05, line: 2, formSize: 6 });
      glowAt(ctx, x, 650, 26, col, 0.25);
    });
  // switches with little labels (unreadable at this size, read as text)
  for (let i = 0; i < 6; i++) {
    const x = 760 + i * 70;
    ctx.fillStyle = 'rgba(200,210,230,0.35)';
    ctx.fillRect(x, 682, 34, 3);
    ctx.fillStyle = 'rgba(200,210,230,0.2)';
    ctx.fillRect(x + 4, 688, 22, 2);
  }
  void r;
}
const LED_COLS = ['#ff5a5a', '#ffd84a', '#4ae8ff', '#4aff8a', '#ff8ad8', '#ffd84a'];

/** The steel counter and its teal edge light. */
function table(ctx: Ctx, r: R): void {
  metalPlane(ctx, r, SPX.front, '#606a7c', {
    seamsX: [-1.3, 0, 1.3], seamsZ: [3.2],
    lights: [{ x: 960, col: '#5ab4ff', a: 0.22 }, { x: SPX.sign.x, col: '#36e0ff', a: 0.16 }, { x: SPX.sign.x - 20, col: '#ffb03a', a: 0.1 }, { x: 330, col: '#fff0d8', a: 0.1 }],
    seed: 9,
  });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, SPX.front - TY + 4);
  ctx.clip();
  // the polish mirrors the room: the porthole's blue, the console's dark mass, the neon, softly
  softly(ctx, { x: 0, y: TY, w: W, h: 200 }, (g) => {
    g.fillStyle = 'rgba(70,140,230,0.16)';
    g.fillRect(WIN.x0 + 40, TY + 30, WIN_BOX.w - 80, 120);
    g.fillStyle = 'rgba(0,2,8,0.35)';
    g.fillRect(SPX.console.x0, TY, SPX.console.x1 - SPX.console.x0, 34);
    g.fillStyle = 'rgba(54,224,255,0.12)';
    g.fillRect(SPX.sign.x0 + 30, TY + 50, SPX.sign.x1 - SPX.sign.x0 - 60, 120);
  }, 0.125, 'source-over');
  // fine swirled scratches from years of plates slid across it
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const cx = r() * W;
    const cy = TY + 40 + r() * (SPX.front - TY - 40);
    const rr = 30 + r() * 120;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr, rr * 0.3, 0, r() * 6, r() * 6 + 0.8 + r());
    ctx.stroke();
  }
  // the console's shadow along the back, the teal strip's glow lifting the near edge
  crevice(ctx, 0, W, TY, 40, 0.6, '#02040a');
  vfill(ctx, 0, SPX.front - 60, W, 64, [[0, 'rgba(60,220,230,0)'], [1, 'rgba(60,220,230,0.12)']]);
  ctx.restore();
  tableFalloff(ctx, SPX.front, 0.4, '#02040c');
  ctx.fillStyle = 'rgba(200,220,255,0.25)';
  ctx.fillRect(0, TY, W, 1.5);
  // the front edge: a rounded steel lip, a recessed teal light strip in it
  const lip = rectPath(0, SPX.front, W, 1080 - SPX.front);
  solid(ctx, lip, { x: 0, y: SPX.front, w: W, h: 44 }, 'chrome', '#5a6474', { depth: 0, line: false, formSize: 10 });
  vfill(ctx, 0, SPX.front + 12, W, 7, [[0, '#9afcff'], [1, '#2ac8d8']]);
  glowAt(ctx, 960, SPX.front + 15, 1100, '#3ae8f0', 0.18, 0.03);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(0, SPX.front, W, 1.5);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, SPX.front + 22, W, 3);
}

/** The status lamps and scope traces painted (the live layer animates its own). */
function consoleLights(ctx: Ctx): void {
  for (let i = 0; i < 24; i++) if (i % 3 !== 1) glowAt(ctx, SPX.leds.x0 + i * 22, SPX.leds.y, 14, LED_COLS[i % LED_COLS.length], 0.45);
  for (const s of SPX.scopes) {
    ctx.strokeStyle = 'rgba(120,255,190,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = s.x0 + 6; x <= s.x1 - 6; x += 3) {
      const y = 654 + Math.sin((x - s.x0) * 0.06) * 12 * Math.sin((x - s.x0) * 0.012);
      if (x === s.x0 + 6) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** The cable loom hanging in a loop from its ceiling clips, left of the porthole. */
function loom(ctx: Ctx): void {
  const x = SPX.loom.x;
  const y0 = SPX.ceil - 2;
  const draw = (col: string, w: number, dx: number, drop: number) => {
    ctx.strokeStyle = '#06080c';
    ctx.lineWidth = w + 3;
    ctx.beginPath();
    ctx.moveTo(x - 40 + dx, y0);
    ctx.bezierCurveTo(x - 40 + dx, y0 + drop, x + 40 + dx, y0 + drop, x + 40 + dx, y0);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = w * 0.3;
    ctx.beginPath();
    ctx.moveTo(x - 40 + dx - w * 0.2, y0);
    ctx.bezierCurveTo(x - 40 + dx - w * 0.2, y0 + drop - w * 0.3, x + 40 + dx, y0 + drop - w * 0.3, x + 40 + dx, y0);
    ctx.stroke();
  };
  draw('#c83a2a', 7, -6, 150);
  draw('#2a3a5a', 9, 0, 132);
  draw('#d8b02a', 5, 8, 170);
  // the clip binding them where they hang lowest
  solid(ctx, rrPath(x - 12, y0 + 92, 22, 14, 3), { x: x - 12, y: y0 + 92, w: 22, h: 14 }, 'iron', '#3a3e48', { depth: 0.05, line: 2 });
}
const LOOM_BOX = { x: SPX.loom.x - 70, y: SPX.ceil - 6, w: 140, h: 150 };

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.05, '#a8c0e8', 0.06, { warm: '#ffc890', cool: '#3a5ad0', a: 0.24 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.08, '#02040c', 120, 560);
  vignetteAll(ctx, 0.75, '#02040a');
  vfill(ctx, 0, 0, 520, 220, [[0, 'rgba(2,4,10,0.35)'], [1, 'rgba(2,4,10,0)']]);
}

const ORBIT_BOX = WIN_BOX;
const CONSOLE_FX = { x: SPX.console.x0, y: SPX.console.top, w: SPX.console.x1 - SPX.console.x0, h: SPX.console.y1 - SPX.console.top };

export const SPACE: SceneSpec = {
  id: 'space',
  info: {
    name: 'Orbital Pizzeria',
    subtitle: 'Waves 26–29',
    ambient: [],
    glows: [
      { x: SPX.sign.x, y: SPX.sign.y - 110, r: 160, color: '#36e0ff', flicker: 0.15 },
      { x: SPX.sign.x, y: SPX.sign.y + 40, r: 200, color: '#ffb03a', flicker: 0.1 },
      { x: 960, y: 600, r: 420, color: '#4ab0ff', flicker: 0 },
    ],
    light: '#b8d4ff',
    tableTint: '#e8f0ff',
  },
  layers: [
    { id: 'wall', draw: wall },
    { id: 'outside', box: WIN_BOX, draw: (c, r) => outside(c, r, false) },
    { id: 'outsideNight', box: WIN_BOX, liveOnly: true, res: 0.75, draw: (c, r) => outside(c, r, true) },
    { id: 'sunset', box: SUNSET_BOX, liveOnly: true, res: 0.5, draw: sunset },
    // meteors, the satellite and the stars' twinkle: behind the glass and the ring
    { id: 'orbit', box: ORBIT_BOX, motion: 'slot', draw: () => {} },
    { id: 'porthole', box: FRAME_BOX, draw: porthole },
    { id: 'loom', box: LOOM_BOX, motion: 'sprite', draw: loom },
    { id: 'pipes', box: { x: 0, y: SPX.ceil - 10, w: 230, h: SPX.console.y1 - SPX.ceil + 40 }, draw: pipes },
    { id: 'sign', box: { x: SPX.sign.x0 - 60, y: SPX.sign.y0 - 40, w: SPX.sign.x1 - SPX.sign.x0 + 100, h: SPX.sign.y1 - SPX.sign.y0 + 110 }, draw: signCase },
    { id: 'neon', box: NEON_BOX, stillOnly: true, draw: (c) => neonTubes(c, [1, 1, 1, 1, 1], 1) },
    { id: 'console', box: { x: SPX.console.x0 - 30, y: SPX.console.top - 30, w: SPX.console.x1 - SPX.console.x0 + 70, h: SPX.console.y1 - SPX.console.top + 60 }, draw: consoleDesk },
    { id: 'consoleLights', box: CONSOLE_FX, stillOnly: true, draw: consoleLights },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** The neon's frames: full, a dead Z, the slice browning out, everything dipping, the slice off, a hot buzz. */
const NEON_FRAMES: [number[], number][] = [
  [[1, 1, 1, 1, 1], 1],
  [[1, 1, 1, 0.15, 1], 1],
  [[1, 1, 1, 1, 1], 0.35],
  [[0.55, 0.6, 0.5, 0.55, 0.6], 0.5],
  [[1, 1, 1, 0.6, 1], 0],
  [[0.2, 0.25, 0.2, 0, 0.2], 0.2],
];

registerKitScene(SPACE, (k, wave0) => {
  const fx = k.slot('fx');
  const orbit = k.slot('orbit');
  const nb = NEON_BOX;
  // the neon: painted frames of its tubes at each state, stepped during a stutter
  const neonKey = sheet(k, 'sp_neon', nb.w, nb.h, NEON_FRAMES.length, (c, _p, i) => {
    c.translate(-nb.x, -nb.y);
    neonTubes(c, NEON_FRAMES[i][0], NEON_FRAMES[i][1]);
  });
  const neon = k.img(neonKey, nb.x, nb.y, { into: fx, origin: [0, 0] });
  const neonHalo = k.glow(SPX.sign.x, SPX.sign.y - 40, 300, 0x36e0ff, 0.12, { into: fx, sy: 1.1 });
  let stutter: number[] = [];
  let stT = 0;
  let nextStutter = 3 + crand() * 5;
  // status lamps: each its own rhythm
  const leds = Array.from({ length: 24 }, (_, i) => ({ img: k.glow(SPX.leds.x0 + i * 22, SPX.leds.y, 13, Phaser.Display.Color.HexStringToColor(LED_COLS[i % LED_COLS.length]).color, 0.4, { into: fx }), rate: 0.4 + crand() * 2.2, seed: crand() * 10, kind: i % 4 }));
  // the scopes: traces drawn live, spiking on a stomp
  const scope = k.sc.add.graphics();
  fx.add(scope);
  let spike = 0;
  // the cable loom swings on its clips
  const loomSw = new Swing(k.pivot(k.sprite('loom'), SPX.loom.x, SPX.ceil), { k: 7, c: 0.7, idle: 0.01, seed: 2 });
  // the relief valve: billowing steam painted in frames, venting in bursts
  const SW = 220;
  const SH = 300;
  const steamKey = sheet(k, 'sp_steam', SW, SH, 12, (c, p) => steamFrame(c, SW, SH, p, { body: '#dfe8f4', lit: '#ffffff', shade: '#6a7898', a: 0.55, lean: 0.8, seed: 3 }));
  const steam = new Loop(k, steamKey, 12, SPX.vent.x + 34, SPX.vent.y + 8, { into: fx, origin: [0.5, 1], fps: 9 });
  steam.each((im) => im.setRotation(1.15));
  let vent = 0;
  let nextVent = 4 + crand() * 4;
  // meteors and their burning trails (behind the glass)
  const trails = new Parts(k, { frame: 'ember', add: true, into: orbit, max: 220 });
  const heads = new Parts(k, { frame: 'spark', add: true, into: orbit, max: 30 });
  const meteors: { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number }[] = [];
  let nextMeteor = 2 + crand() * 4;
  const trailRate = new Rate();
  // the satellite: a tumbling box with its wings flashing as they turn to the sun (painted at each turn)
  const satKey = sheet(k, 'sp_sat', 150, 70, 16, (c, p) => satellite(c, p));
  const sat = new Loop(k, satKey, 16, -200, 260, { into: orbit, fps: 3 });
  const satGlint = k.glow(0, 0, 40, 0xffffff, 0, { into: orbit });
  let satX = -200;
  let nextSat = 6 + crand() * 10;
  // twinkle: a few stars scintillate through the glass
  const twinkles = Array.from({ length: 10 }, () => ({ img: k.img('star', WIN.x0 + 60 + crand() * (WIN_BOX.w - 120), WIN.y0 + 30 + crand() * 200, { into: orbit, add: true, scale: 0.12, alpha: 0 }), seed: crand() * 20 }));
  // the station's orbit: the sun sets on the limb, the night side comes round
  const night = k.sprite('outsideNight');
  const set = k.sprite('sunset').setBlendMode(Phaser.BlendModes.ADD);
  const nightWash = k.wash(0x3a4a8a, 0, Phaser.BlendModes.MULTIPLY);
  const cabin = k.glow(960, 360, 900, 0xffd8a8, 0, { into: fx, sy: 0.5 });
  // the meteor-warning lamp (from the third wave): an amber beacon turning over the porthole
  const beaconBody = k.img(beaconTex(k), SPX.beacon.x, SPX.beacon.y, { into: fx });
  const beam = k.img(beamTex(k), SPX.beacon.x, SPX.beacon.y, { into: fx, add: true, origin: [0, 0.5], alpha: 0 });
  const beaconGlow = k.glow(SPX.beacon.x, SPX.beacon.y, 90, 0xffa020, 0, { into: fx });
  const beaconWash = k.glow(1200, 300, 700, 0xff9a20, 0, { into: fx, sy: 0.6 });
  let kw = waveK(wave0);
  let shown = kw;
  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, kk) {
      spike = Math.max(spike, kk);
      loomSw.kick((x < SPX.loom.x ? 1 : -1) * 1.2 * kk);
      if (kk > 0.5) vent = Math.max(vent, 0.8);
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      const flashes = save.settings.flashes && !save.settings.reducedMotion;
      // ——— the neon
      nextStutter -= dt;
      if (nextStutter < 0 && !stutter.length) {
        const seqs = [[1, 0, 1, 0, 0], [3, 0, 3, 5, 0], [2, 0, 2, 4, 2, 0], [1, 1, 0]];
        stutter = flashes ? seqs[Math.floor(crand() * seqs.length)] : [3, 0];
        stT = 0;
        nextStutter = 4 + crand() * 7;
      }
      let fr = 0;
      if (stutter.length) {
        stT += dt;
        const step = Math.floor(stT / 0.07);
        if (step >= stutter.length) stutter = [];
        else fr = stutter[step];
      }
      neon.setFrame(fr);
      const hum = 0.92 + Math.sin(t * 47) * 0.03 + Math.sin(t * 1.3) * 0.05;
      neon.setAlpha(hum);
      neonHalo.setAlpha((fr === 0 ? 0.12 : fr === 5 ? 0.03 : 0.07) * hum * (1 + shown * 0.4));
      // ——— lamps
      for (const l of leds) {
        const v = l.kind === 0 ? (Math.sin(t * l.rate * 3 + l.seed) > 0.3 ? 1 : 0.15) : l.kind === 1 ? 0.5 + 0.5 * Math.sin(t * l.rate + l.seed) : l.kind === 2 ? 0.8 : (Math.floor(t * l.rate + l.seed) % 3 === 0 ? 1 : 0.2);
        l.img.setAlpha(0.18 + v * 0.42 + spike * 0.3);
      }
      // ——— scopes
      spike = Math.max(0, spike - dt * 1.2);
      scope.clear();
      SPX.scopes.forEach((s, si) => {
        scope.lineStyle(2, 0x7affbe, 0.85);
        scope.beginPath();
        for (let x = s.x0 + 6, first = true; x <= s.x1 - 6; x += 3, first = false) {
          const u = (x - s.x0) / (s.x1 - s.x0);
          const amp = 9 + spike * 22 * Math.exp(-((u - ((t * 0.8) % 1)) ** 2) * 40);
          const y = 654 + Math.sin(u * 14 + t * (si ? 5 : 3.4)) * amp * (si ? Math.sin(u * 3 + t) : 1) + (spike ? (crand() - 0.5) * spike * 6 : 0);
          if (first) scope.moveTo(x, y);
          else scope.lineTo(x, y);
        }
        scope.strokePath();
        // the sweep's bright head
        const hx = s.x0 + 6 + ((t * (si ? 0.5 : 0.7)) % 1) * (s.x1 - s.x0 - 12);
        scope.fillStyle(0xd8ffe8, 0.5);
        scope.fillCircle(hx, 654 + Math.sin(((hx - s.x0) / (s.x1 - s.x0)) * 14 + t * (si ? 5 : 3.4)) * 9 * (si ? Math.sin(((hx - s.x0) / (s.x1 - s.x0)) * 3 + t) : 1), 3);
      });
      // ——— loom
      loomSw.update(dt, t);
      // ——— steam
      nextVent -= dt;
      if (nextVent < 0) {
        vent = 1;
        nextVent = 6 + crand() * 7;
      }
      vent = Math.max(0, vent - dt * 0.35);
      steam.alpha = Math.min(1, vent * 1.6) * 0.9;
      steam.step(dt, 0.7 + vent * 0.6);
      steam.each((im) => im.setScale(0.7 + vent * 0.5, 0.7 + vent * 0.4));
      // ——— meteors: more as the shower thickens (from the third wave)
      nextMeteor -= dt * calm();
      if (nextMeteor < 0) {
        const fromL = crand() < 0.7;
        const sp = 380 + crand() * 420;
        const ang = (fromL ? 0.42 : Math.PI - 0.42) + (crand() - 0.5) * 0.3;
        meteors.push({ x: fromL ? WIN.x0 - 20 + crand() * 400 : WIN.x1 - crand() * 300, y: WIN.y0 - 10, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0.9 + crand() * 0.6, age: 0, size: 0.6 + crand() * 0.8 });
        nextMeteor = lerp(5, 1.2, shown) * (0.5 + crand());
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.age += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const burn = Math.sin(Math.min(1, m.age / m.life) * Math.PI);
        trailRate.tick(90 * m.size, dt, () =>
          trails.spawn({ x: m.x - m.vx * dt * crand(), y: m.y - m.vy * dt * crand(), vx: m.vx * 0.04, vy: m.vy * 0.04, life: 0.35 + crand() * 0.3, r0: 5 * m.size * burn, r1: 1, a: 0.7 * burn, tint: crand() < 0.5 ? 0xffb050 : 0x9ad8ff, drag: 2 }),
        );
        heads.spawn({ x: m.x, y: m.y, vx: m.vx, vy: m.vy, life: 0.05, r0: 10 * m.size * burn, a: burn, tint: 0xfff4e0, streak: 0.012 });
        if (m.age > m.life || m.y > limbY(m.x) - 4) meteors.splice(i, 1);
      }
      trails.update(dt);
      heads.update(dt);
      // ——— the satellite
      nextSat -= dt;
      if (nextSat < 0 && satX < -150) satX = WIN.x0 - 80;
      if (satX > -150) {
        satX += dt * 36 * calm();
        const sy = 250 + (satX - WIN.x0) * 0.08;
        sat.each((im) => im.setPosition(satX, sy).setScale(0.62));
        sat.step(dt);
        // a flash as a wing turns square to the sun
        const ph = (t * 3 / 16) % 1;
        const g = Math.max(0, Math.cos(ph * Math.PI * 4)) ** 12;
        satGlint.setPosition(satX + 18, sy - 6).setAlpha(g * 0.8 * (1 - shown * 0.8));
        if (satX > WIN.x1 + 80) {
          satX = -200;
          nextSat = 14 + crand() * 14;
        }
      } else {
        sat.each((im) => im.setAlpha(0));
        satGlint.setAlpha(0);
      }
      for (const s of twinkles) s.img.setAlpha(Math.max(0, Math.sin(t * 2.2 + s.seed)) ** 6 * 0.7).setScale(0.08 + Math.max(0, Math.sin(t * 2.2 + s.seed)) * 0.08);
      // ——— the orbit: night falls outside, the cabin goes to its night lighting
      const nk = Phaser.Math.Clamp(lerp(-0.3, 1.25, shown), 0, 1);
      night.setAlpha(nk);
      set.setAlpha(Math.max(0, 1 - Math.abs(shown - 0.45) / 0.3) * (0.85 + Math.sin(t * 0.7) * 0.1));
      nightWash.setAlpha(nk * 0.16);
      cabin.setAlpha(nk * 0.05);
      // ——— the meteor warning, from the third wave
      const warn = Phaser.Math.Clamp((shown - 0.55) / 0.3, 0, 1);
      beaconBody.setAlpha(1);
      const rot = t * 3.2;
      beam.setRotation(rot).setAlpha(warn * (0.3 + 0.2 * Math.max(0, Math.cos(rot))) * (flashes ? 1 : 0.4));
      const facing = Math.max(0, Math.cos(rot - 2.6)) ** 3;
      beaconGlow.setAlpha(warn * (0.35 + facing * 0.4));
      beaconWash.setAlpha(warn * facing * (flashes ? 0.08 : 0.03));
    },
  };
});

/** One turn of the satellite (phase 0…1): a gold-foil body, two solar wings foreshortened as it tumbles. */
export function satellite(c: Ctx, p: number): void {
  const cx = 75;
  const cy = 35;
  const ang = p * Math.PI * 2;
  const wing = Math.cos(ang);
  const tilt = Math.sin(ang) * 0.25;
  c.save();
  c.translate(cx, cy);
  c.rotate(tilt);
  // wings: their width follows the turn, their face lit when it looks at the sun
  for (const s of [-1, 1]) {
    const ww = 46;
    const hh = 22 * Math.max(0.12, Math.abs(wing));
    const x = s * 16 + (s > 0 ? 0 : -ww);
    const lit = wing > 0 ? 0.3 + wing * 0.7 : 0.15;
    c.fillStyle = mix('#1a2a6a', '#8ab8ff', lit * 0.6);
    c.fillRect(x, -hh / 2, ww, hh);
    c.strokeStyle = 'rgba(200,220,255,0.6)';
    c.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      c.beginPath();
      c.moveTo(x + (ww * k) / 4, -hh / 2);
      c.lineTo(x + (ww * k) / 4, hh / 2);
      c.stroke();
    }
    c.strokeStyle = '#0a0c14';
    c.lineWidth = 1.5;
    c.strokeRect(x, -hh / 2, ww, hh);
  }
  c.fillStyle = '#5a5a60';
  c.fillRect(-16, -1.5, 32, 3);
  // the body, in crinkled gold foil
  const g = c.createLinearGradient(-12, -12, 12, 12);
  g.addColorStop(0, '#fff0a0');
  g.addColorStop(0.4, '#d8a030');
  g.addColorStop(1, '#5a3a10');
  c.fillStyle = g;
  c.fillRect(-12, -12, 24, 24);
  c.strokeStyle = 'rgba(255,240,180,0.5)';
  c.beginPath();
  c.moveTo(-10, -4);
  c.lineTo(-2, 2);
  c.lineTo(6, -6);
  c.moveTo(-6, 8);
  c.lineTo(4, 4);
  c.stroke();
  c.strokeStyle = '#1a1208';
  c.lineWidth = 2;
  c.strokeRect(-12, -12, 24, 24);
  c.restore();
}

/** The warning beacon: an amber dome on a steel collar. */
function beaconTex(k: KitLive): string {
  return k.tex('sp_beacon', 48, 48, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.beginPath();
    c.ellipse(28, 30, 18, 14, 0, 0, Math.PI * 2);
    c.fill();
    solid(c, rrPath(10, 26, 28, 14, 3), { x: 10, y: 26, w: 28, h: 14 }, 'iron', '#3a404c', { depth: 0, line: 2 });
    const dome = (g: Ctx) => {
      g.beginPath();
      g.moveTo(12, 27);
      g.quadraticCurveTo(12, 8, 24, 8);
      g.quadraticCurveTo(36, 8, 36, 27);
      g.closePath();
    };
    solid(c, dome, { x: 12, y: 8, w: 24, h: 19 }, 'plastic', '#d88a1a', { depth: 0, line: 2 });
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath();
    c.ellipse(19, 14, 3, 5, 0.4, 0, Math.PI * 2);
    c.fill();
  });
}

/** The beacon's sweeping beam: a long soft fan. */
function beamTex(k: KitLive): string {
  return k.tex('sp_beam', 512, 128, (c) => {
    const g = c.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0, 'rgba(255,170,40,0.7)');
    g.addColorStop(1, 'rgba(255,170,40,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 60);
    c.lineTo(512, 0);
    c.lineTo(512, 128);
    c.lineTo(0, 68);
    c.closePath();
    c.fill();
  });
}
