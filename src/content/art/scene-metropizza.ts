// Metropizza Rooftops (Act 7, the Comics act: Stage 13, waves 61–64), redrawn with the location kit (src/art/scene)
// as a pulp-comic cover: bold ink lines weighted on the shadow side, flat colour fields modelled with halftone dots at
// the printed screen angles, Ben-Day skies, speed lines (src/art/scene/print.ts). A table on a roof high over the
// city at golden hour, the key light raking in low from the left (warm on every left face, the right faces in a
// purple dot-screen shade, long flat shadows falling right).
//
// The far city in two rows of Art Deco cut-outs (setbacks, sunburst crowns, needles, domes, tanks), hazed into the
// horizon. In the middle distance the Metropizza Tower: a limestone deco skyscraper with three setbacks and a brass
// sunburst crown, a needle with its aviation light, and on its mast the turning pizza globe in its gold ring. Left,
// a brick tenement with a cedar water tank on its roof; across from us, on a neighbour's lower roof, the METROPIZZA
// billboard on its steel trestle (a comic slice on a starburst, block letters with neon tubes laid over them, a
// marquee of bulbs, three gooseneck lamps, a catwalk). Right, a green-terracotta deco office and a tall ochre
// building with a fire escape zigzagging down it. Our own roof: a brick parapet under a cream stone coping, a
// turbine vent on it, a chimney stack with clay pots, and the big searchlight on its pedestal, aimed at the sky.
// The table: the act's red and yellow checker cloth, a Metropizza box and the Daily Slice on it.
//
// Live, the heroes:
// - the pizza globe turning (16 painted frames: the slices' cuts, cheese, pepperoni and olives running round the
//   sphere, foreshortening to the limb, its terminator in dots), its ring catching the light; floodlit at night;
// - the billboard's neon: each letter's tubes painted lit (core, glass and halo) and switched on its own: the sign
//   chases on at dusk, buzzes, and the second Z is a dud that stutters and spits sparks (bouncing down the trestle);
//   the marquee bulbs chase; a stomp makes the whole sign stutter and the Z throw a shower of sparks;
// - the searchlight: from the third wave it throws the pizza signal onto the clouds (a painted beam with dust in it,
//   the slice silhouetted in a disc of light on the cloud base), its head on a damped spring that a stomp jolts, the
//   signal sliding and stretching with it; two far searchlights sweep the sky from the city.
// Also: the Metropizza blimp crossing behind the tower (its lettering lit at night), a turbine vent spinning in the
// wind (painted frames, kicked by stomps), steam off the chimney, comic clouds drifting; in the storm, painted comic
// bolts behind the skyline with the clouds lit from inside, rain sheets over the city and splashes on the coping.
// Across the stage: golden hour (1), dusk with the neon coming on (2), night with the windows lit and the signal up
// (3), a thunderstorm (4). The act's layer (src/game/acts/act7.ts) keeps the rain over the feet and the whole-screen
// flash and thunder, which this scene's bolts call for; the blimp and searchlights are this scene's now.
// (The old art is kept in scenes-act7.ts for the before/after page.)

import Phaser from 'phaser';
import {
  type Ctx,
  type PathFn,
  type R,
  TY,
  W,
  calmLanes,
  castShadow,
  crevice,
  ellPath,
  rrPath,
  glowAt,
  gradeAll,
  groundShadow,
  polyPath,
  rectPath,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { checkerCloth, tableFalloff, tableSeam } from '../../art/scene/materials';
import { benDay, bolt, boltPath, dots, flat, hatch, ink, linTone, radTone, speedLines } from '../../art/scene/print';
import { makeCanvas, mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, registerKitScene, waveK, wander } from '../../game/sceneLive';
import { Loop, Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { foldedFront, frontX } from './sceneBits';

// ——— layout ———

export const MP = {
  /** Our parapet: the coping's top, its front face, the brick face down to the table. */
  coping: 606,
  face: 626,
  front: 1040,
  /** The far skyline's base (hidden behind the coping) and where the live skies stop. */
  horizon: 614,
  skyEnd: 566,
  moon: { x: 300, y: 148, r: 44 },
  tower: { x: 1190 },
  globe: { x: 1190, y: 116, r: 44 },
  needle: { x: 1190, top: 30 },
  sign: { x0: 380, x1: 804, y0: 344, y1: 488, roof: 558 },
  tenement: { x1: 330, top: 334 },
  tank: { x: 172, base: 334 },
  office: { x0: 1490, x1: 1708, top: 432 },
  tall: { x0: 1712, x1: 1940, top: 262 },
  vent: { x: 268 },
  chimney: { x: 1428, top: 488 },
  lamp: { x: 1668, y: 478 },
  /** Where the signal sits on the cloud base when the lamp's at rest. */
  signal: { x: 860, y: 140 },
  table: { box: { x: 120, y: 800 }, paper: { x: 1760, y: 806 } },
};

/** Where the city's layers stop: just under the coping's ink line, so the parapet and the table stay in the live base. */
const CUT = MP.coping - 2;
export const INK = '#1c1024';
export const P2 = Math.PI * 2;
const SUN = '#ffcf8a';
export const SHADE = '#3a2458';
export const BLOCK = '"Impact", "Haettenschweiler", "Arial Black", sans-serif';
export const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ——— comic clouds ———

/** A comic cumulus: bumps along a flat base, lit on its upper left, its shade in dots, a thin coloured ink line. */
export function comicCloud(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, pal: { body: string; lit: string; shade: string; ink: string; dot: string }, a = 1): void {
  const bumps: [number, number, number][] = [];
  const n = Math.max(3, Math.round(w / (h * 0.7)));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const lift = Math.sin(Math.PI * u) ** 0.8;
    const rad = h * (0.32 + 0.38 * lift) * (0.8 + r() * 0.4);
    bumps.push([x - w / 2 + w * u + (r() - 0.5) * w * 0.05, y - rad * 0.55 - h * 0.35 * lift, rad]);
  }
  const body: PathFn = (c) => {
    c.beginPath();
    for (const [bx, by, br] of bumps) {
      c.moveTo(bx + br, by);
      c.arc(bx, by, br, 0, P2);
    }
    c.moveTo(x - w / 2, y);
    c.ellipse(x, y - h * 0.12, w / 2, h * 0.22, 0, 0, P2);
  };
  ctx.save();
  ctx.globalAlpha = a;
  // the ink: every bump stroked, then filled over (only the outer half of the line is left)
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 4;
  body(ctx);
  ctx.stroke();
  ctx.fillStyle = pal.shade;
  ctx.fill();
  within(ctx, body, () => {
    // the lit faces: the same bumps nudged towards the light
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    for (const [bx, by, br] of bumps) {
      ctx.moveTo(bx - br * 0.12 + br * 0.92, by - br * 0.16);
      ctx.arc(bx - br * 0.12, by - br * 0.16, br * 0.92, 0, P2);
    }
    ctx.fill();
    ctx.fillStyle = pal.lit;
    ctx.beginPath();
    for (const [bx, by, br] of bumps) {
      ctx.moveTo(bx - br * 0.3 + br * 0.62, by - br * 0.34);
      ctx.arc(bx - br * 0.3, by - br * 0.34, br * 0.62, 0, P2);
    }
    ctx.fill();
    // the shade's dot screen, deepening to the base and the right
    dots(ctx, { x: x - w / 2 - h, y: y - h * 1.6, w: w + h * 2, h: h * 1.8 }, linTone(x - w * 0.3, y - h * 0.9, x + w * 0.3, y + h * 0.1, 0, 0.75), pal.dot, { step: 7, angle: 1.31, a: 0.55 });
  });
  ctx.restore();
}

// ——— the skies ———

const SKY_BOX = { x: 0, y: 0, w: W, h: MP.skyEnd };
const GOLD_CLOUD = { body: '#ffe2c0', lit: '#fff6dc', shade: '#e890a0', ink: '#a8506e', dot: '#8a3a80' };

/** Golden hour: a cyan zenith printed in dots, warming through peach to a hot gold over the city; the sun's off to
 * the left, its rays fanning in from the corner. */
function sky(ctx: Ctx, r: R): void {
  vfill(ctx, 0, 0, W, MP.horizon, [[0, '#3a6aa8'], [0.3, '#78a8c8'], [0.55, '#f4cc98'], [0.8, '#ffb070'], [1, '#ff8a58']]);
  // the warm side: the sun low off the left of the frame
  const g = ctx.createRadialGradient(-200, 380, 50, -200, 380, 1300);
  g.addColorStop(0, 'rgba(255,220,140,0.9)');
  g.addColorStop(0.45, 'rgba(255,184,110,0.35)');
  g.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, MP.horizon);
  // printed: cyan dots thinning down the zenith, magenta-red dots gathering in the warm band low down
  benDay(ctx, { x: 0, y: 0, w: W, h: 330 }, '#1c4c94', 0.42, 10, 0.5, 0, 0.26);
  dots(ctx, { x: 0, y: 330, w: W, h: MP.horizon - 330 }, (x, yy) => smooth(360, 600, yy) * (0.2 + 0.2 * smooth(600, 1900, x)), '#e0505a', { step: 9, angle: 1.31, a: 0.45 });
  // the sun's rays from the corner
  speedLines(ctx, r, -160, 400, 200, 2300, 54, '#fff2c8', 0.16, -0.95, 0.42);
  for (const [cx, cy, cw, ch] of [[640, 250, 360, 70], [1580, 170, 420, 84], [140, 470, 300, 54], [980, 430, 240, 40]] as const) comicCloud(ctx, r, cx, cy, cw, ch, GOLD_CLOUD, 0.95);
}

/** Dusk: violet overhead, rose and orange low, the first stars; the clouds go pink. */
function duskSky(ctx: Ctx, r: R): void {
  vfill(ctx, 0, 0, W, MP.skyEnd, [[0, '#3c2c78'], [0.4, '#8a4c9a'], [0.72, '#f0768a'], [1, '#ffb070']]);
  benDay(ctx, { x: 0, y: 0, w: W, h: 380 }, '#20145a', 0.55, 13, 0.6, 0.04, 0.26);
  dots(ctx, { x: 0, y: 300, w: W, h: MP.skyEnd - 300 }, (_x, yy) => smooth(300, 566, yy) * 0.35, '#ffd060', { step: 11, angle: 0, a: 0.55 });
  starField(ctx, r, 0, 0, W, 260, 40, 0.7);
  for (const [cx, cy, cw, ch] of [[640, 250, 360, 70], [1580, 170, 420, 84], [140, 470, 300, 54], [980, 430, 240, 40]] as const)
    comicCloud(ctx, r, cx, cy, cw, ch, { body: '#f8a0b0', lit: '#ffd0a8', shade: '#8a4a90', ink: '#4a2060', dot: '#3a1a5a' }, 0.95);
}

/** Night: navy in fat Ben-Day dots, a printed moon high on the left with speed lines, stars, the city's glow low. */
function nightSky(ctx: Ctx, r: R): void {
  vfill(ctx, 0, 0, W, MP.skyEnd, [[0, '#0c1238'], [0.5, '#1c2a64'], [0.85, '#4a3a7a'], [1, '#8a4a7a']]);
  benDay(ctx, { x: 0, y: 0, w: W, h: MP.skyEnd }, '#040824', 0.6, 14, 0.5, 0.05, 0.79);
  dots(ctx, { x: 0, y: 380, w: W, h: MP.skyEnd - 380 }, (_x, yy) => smooth(380, 566, yy) * 0.4, '#ff9a8a', { step: 12, angle: 1.31, a: 0.45 });
  starField(ctx, r, 0, 0, W, 360, 110, 1);
  const m = MP.moon;
  glowAt(ctx, m.x, m.y, 260, '#c8d8ff', 0.25);
  speedLines(ctx, r, m.x, m.y, m.r * 1.6, 420, 44, '#e8f0ff', 0.07);
  flat(ctx, ellPath(m.x, m.y, m.r, m.r), '#fff6dc', 4, '#3a3a6a');
  within(ctx, ellPath(m.x, m.y, m.r, m.r), () => {
    for (const [dx, dy, cr] of [[-14, -10, 10], [12, 8, 7], [-4, 18, 6], [16, -16, 5], [-20, 12, 4]] as const) {
      ctx.fillStyle = '#e4d6b0';
      ctx.beginPath();
      ctx.arc(m.x + dx, m.y + dy, cr, 0, P2);
      ctx.fill();
    }
    dots(ctx, { x: m.x - m.r, y: m.y - m.r, w: m.r * 2, h: m.r * 2 }, linTone(m.x - m.r * 0.2, m.y - m.r * 0.2, m.x + m.r, m.y + m.r, 0, 0.8), '#7a7aa8', { step: 6, angle: 0.79, a: 0.7 });
  });
  for (const [cx, cy, cw, ch] of [[640, 250, 360, 70], [1580, 170, 420, 84], [140, 470, 300, 54], [980, 430, 240, 40]] as const)
    comicCloud(ctx, r, cx, cy, cw, ch, { body: '#4a4a8a', lit: '#6a6aa8', shade: '#2a2a5a', ink: '#141838', dot: '#0c1030' }, 0.9);
}

/** The storm: a low lid of bruised cloud in heavy dots and ink, rain sheets hanging under it, a cold green glow. */
function stormSky(ctx: Ctx, r: R): void {
  vfill(ctx, 0, 0, W, MP.skyEnd, [[0, '#141a2c'], [0.5, '#2a3448'], [1, '#4a5a64']]);
  benDay(ctx, { x: 0, y: 0, w: W, h: MP.skyEnd }, '#060a14', 0.6, 12, 0.6, 0.15, 0.79);
  const pal = { body: '#3a4458', lit: '#58647a', shade: '#1a2030', ink: '#080a12', dot: '#05070e' };
  for (let i = 0; i < 9; i++) comicCloud(ctx, r, -100 + i * 260 + r() * 80, 120 + r() * 120, 420 + r() * 200, 110 + r() * 40, pal);
  for (let i = 0; i < 7; i++) comicCloud(ctx, r, i * 320 + r() * 100, 320 + r() * 80, 360 + r() * 160, 70 + r() * 30, { ...pal, body: '#46525e', lit: '#5e6a78' });
  // rain sheets under the cloud: thin diagonal hatching, thicker in curtains
  for (let i = 0; i < 6; i++) {
    const x0 = r() * W;
    const cw = 160 + r() * 260;
    hatch(ctx, polyPath([[x0, 200], [x0 + cw, 200], [x0 + cw + 120, MP.skyEnd], [x0 + 120, MP.skyEnd]]), { x: x0, y: 200, w: cw + 120, h: MP.skyEnd - 200 }, 1.2, 9, 1.4, '#a8b8c8', 0.22, r);
  }
}

export function starField(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, n: number, a: number): void {
  for (let i = 0; i < n; i++) {
    const sx = x + r() * w;
    const sy = y + r() * h * r();
    const s = r();
    ctx.fillStyle = rgba('#fff8e0', a * (0.4 + s * 0.6));
    if (s > 0.9) {
      // a printed four-point star
      ctx.beginPath();
      ctx.moveTo(sx, sy - 6);
      ctx.lineTo(sx + 1.4, sy - 1.4);
      ctx.lineTo(sx + 6, sy);
      ctx.lineTo(sx + 1.4, sy + 1.4);
      ctx.lineTo(sx, sy + 6);
      ctx.lineTo(sx - 1.4, sy + 1.4);
      ctx.lineTo(sx - 6, sy);
      ctx.lineTo(sx - 1.4, sy - 1.4);
      ctx.fill();
    } else ctx.fillRect(sx, sy, 1.5 + s * 1.5, 1.5 + s * 1.5);
  }
}

/** Drifting clouds (a moving sprite: tinted by the live code wave by wave). */
const CLOUD_BOX = { x: 0, y: 40, w: W, h: 300 };
function clouds(ctx: Ctx, r: R): void {
  const pal = { body: '#ffffff', lit: '#ffffff', shade: '#c8c0d8', ink: '#8a7aa8', dot: '#7a6a9a' };
  comicCloud(ctx, r, 360, 150, 300, 56, pal, 0.85);
  comicCloud(ctx, r, 1060, 110, 380, 62, pal, 0.8);
  comicCloud(ctx, r, 1820, 260, 260, 48, pal, 0.85);
}

// ——— the far city ———

export interface Bldg {
  x: number;
  w: number;
  top: number;
  kind: 'flat' | 'step' | 'crown' | 'spire' | 'dome' | 'tank';
  col: string;
  row: number;
  seed: number;
}

export const ROWS: Bldg[][] = [0, 1].map((row) => {
  const r = rng(7301 + row * 17);
  const out: Bldg[] = [];
  let x = -40 - row * 30;
  while (x < W + 40) {
    const w = (row ? 70 : 60) + r() * (row ? 120 : 100);
    const mid = Math.abs(x + w / 2 - 980) < 420;
    const top = row ? (mid ? 452 + r() * 60 : 360 + r() * 140) : mid ? 500 + r() * 50 : 430 + r() * 110;
    const k = r();
    const kind: Bldg['kind'] = k < 0.18 ? 'step' : k < 0.28 ? 'crown' : k < 0.34 ? 'spire' : k < 0.42 ? 'dome' : k < 0.56 ? 'tank' : 'flat';
    const cols = row ? ['#b6a4d0', '#a898c8', '#bcaad0', '#9e92c2'] : ['#8c78b4', '#7e6ea8', '#9480b8', '#86709e'];
    out.push({ x, w, top: Math.min(top, row ? 540 : 556), kind, col: cols[Math.floor(r() * 4)], row, seed: Math.floor(r() * 1e6) });
    x += w * (0.78 + r() * 0.2);
  }
  return out;
});

export function bldgPath(b: Bldg): PathFn {
  return (c) => {
    const { x, w, top } = b;
    const base = MP.horizon + 4;
    c.beginPath();
    c.moveTo(x, base);
    if (b.kind === 'step') {
      c.lineTo(x, top + 56);
      c.lineTo(x + w * 0.14, top + 56);
      c.lineTo(x + w * 0.14, top + 24);
      c.lineTo(x + w * 0.3, top + 24);
      c.lineTo(x + w * 0.3, top);
      c.lineTo(x + w * 0.7, top);
      c.lineTo(x + w * 0.7, top + 24);
      c.lineTo(x + w * 0.86, top + 24);
      c.lineTo(x + w * 0.86, top + 56);
      c.lineTo(x + w, top + 56);
    } else if (b.kind === 'crown') {
      // a sunburst crown: stacked arches narrowing to a point
      c.lineTo(x, top + 70);
      c.lineTo(x + w * 0.16, top + 70);
      c.lineTo(x + w * 0.16, top + 40);
      c.quadraticCurveTo(x + w * 0.5, top + 10, x + w * 0.84, top + 40);
      c.lineTo(x + w * 0.84, top + 70);
      c.lineTo(x + w, top + 70);
      c.lineTo(x + w, base);
      c.lineTo(x, base);
      c.moveTo(x + w * 0.26, top + 40);
      c.quadraticCurveTo(x + w * 0.5, top - 30, x + w * 0.74, top + 40);
      c.lineTo(x + w * 0.52, top - 40);
      c.lineTo(x + w * 0.48, top - 40);
      c.closePath();
      return;
    } else if (b.kind === 'dome') {
      c.lineTo(x, top + 30);
      c.lineTo(x + w * 0.2, top + 30);
      c.bezierCurveTo(x + w * 0.22, top - w * 0.28, x + w * 0.78, top - w * 0.28, x + w * 0.8, top + 30);
      c.lineTo(x + w, top + 30);
    } else if (b.kind === 'spire') {
      c.lineTo(x, top + 40);
      c.lineTo(x + w * 0.22, top + 40);
      c.lineTo(x + w * 0.22, top + 10);
      c.lineTo(x + w * 0.4, top + 10);
      c.lineTo(x + w * 0.47, top - 30);
      c.lineTo(x + w * 0.5, top - 110);
      c.lineTo(x + w * 0.53, top - 30);
      c.lineTo(x + w * 0.6, top + 10);
      c.lineTo(x + w * 0.78, top + 10);
      c.lineTo(x + w * 0.78, top + 40);
      c.lineTo(x + w, top + 40);
    } else if (b.kind === 'tank') {
      c.lineTo(x, top);
      c.lineTo(x + w * 0.5, top);
      c.lineTo(x + w * 0.52, top - 12);
      c.lineTo(x + w * 0.55, top - 12);
      c.lineTo(x + w * 0.55, top - 34);
      c.lineTo(x + w * 0.66, top - 46);
      c.lineTo(x + w * 0.77, top - 34);
      c.lineTo(x + w * 0.77, top - 12);
      c.lineTo(x + w * 0.8, top - 12);
      c.lineTo(x + w * 0.82, top);
      c.lineTo(x + w, top);
    } else {
      c.lineTo(x, top);
      c.lineTo(x + w, top);
    }
    c.lineTo(x + w, base);
    c.closePath();
  };
}

/** A building's windows (the same every time: the night layer lights some of them). */
export function windowsOf(b: Bldg): [number, number, number, number, number][] {
  const r = rng(b.seed);
  const out: [number, number, number, number, number][] = [];
  const cw = b.row ? 5 : 7;
  const ch = b.row ? 7 : 10;
  const gx = b.row ? 5 : 7;
  const gy = b.row ? 7 : 9;
  const y0 = b.top + (b.kind === 'step' ? 64 : b.kind === 'crown' ? 80 : b.kind === 'spire' || b.kind === 'dome' ? 48 : 12);
  for (let y = y0; y < MP.coping; y += ch + gy) for (let x = b.x + 7; x < b.x + b.w - cw - 5; x += cw + gx) out.push([x, y, cw, ch, r()]);
  return out;
}

const FAR_BOX = { x: 0, y: 260, w: W, h: CUT - 260 };

function farCity(ctx: Ctx, r: R): void {
  for (const row of [1, 0]) {
    const air = row ? '#e8c0b8' : '#d8b0b8';
    for (const b of ROWS[row]) {
      const p = bldgPath(b);
      const col = mix(b.col, air, row ? 0.32 : 0.12);
      ctx.save();
      p(ctx);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.clip();
      // the low sun on the left face: a warm lit edge, and the facade's shade in dots to the right
      ctx.fillStyle = rgba(SUN, row ? 0.32 : 0.42);
      ctx.fillRect(b.x, b.top - 120, Math.max(4, b.w * 0.12), MP.horizon);
      dots(ctx, { x: b.x, y: b.top - 120, w: b.w, h: MP.horizon - b.top + 124 }, linTone(b.x + b.w * 0.35, 0, b.x + b.w, 0, 0, row ? 0.4 : 0.6), mix(SHADE, air, row ? 0.4 : 0.15), { step: row ? 5 : 6, angle: 0.79 });
      // windows: dark slots, the left ones flashing the sun back
      for (const [x, y, cw, ch, v] of windowsOf(b)) {
        if (v < 0.25) continue;
        const glint = (x - b.x) / b.w < 0.4 && v > 0.82;
        ctx.fillStyle = glint ? rgba('#fff0b0', 0.9) : rgba(mix(b.col, '#2a1e4a', 0.45), row ? 0.45 : 0.6);
        ctx.fillRect(x, y, cw, ch);
      }
      ctx.restore();
      ink(ctx, p, row ? 1.4 : 2, mix(INK, air, row ? 0.55 : 0.35), 0.5);
    }
    // the haze between the rows and over the bases (only on the buildings)
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    vfill(ctx, 0, 380, W, MP.horizon - 380, [[0, rgba(air, 0)], [1, rgba(air, row ? 0.55 : 0.38)]]);
    ctx.restore();
  }
  void r;
}

// ——— the Metropizza Tower ———

const TX = MP.tower.x;
export const TOWER = {
  shaft: [1110, 1270, 300] as const,
  set1: [1130, 1250, 236] as const,
  set2: [1148, 1232, 186] as const,
  crown: { y: 186, top: 132 },
};
export const LIME = '#efdcb4';
const TOWER_BOX = { x: 1060, y: 20, w: 240, h: CUT - 20 };

export function towerFace(ctx: Ctx, x0: number, x1: number, top: number, bottom: number, piers: number): void {
  const face = rectPath(x0, top, x1 - x0, bottom - top);
  // the left side face, receding to the city's vanishing point (lit full by the low sun)
  const sw = (x1 - x0) * 0.12;
  const side = polyPath([[x0, top], [x0 - sw, top + 5], [x0 - sw, bottom], [x0, bottom]]);
  flat(ctx, side, mix(LIME, '#fff2d0', 0.5), 0, INK);
  within(ctx, side, () => dots(ctx, { x: x0 - sw, y: top, w: sw, h: bottom - top }, linTone(0, top, 0, bottom, 0, 0.25), '#d8905a', { step: 5, angle: 0, a: 0.6 }));
  ink(ctx, side, 2.2, '#5a3a4a', 0);
  flat(ctx, face, LIME, 0, INK);
  within(ctx, face, () => {
    // piers and window columns: pale ribs, darker strips between them with spandrels
    const n = piers;
    const pw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const px = x0 + i * pw;
      ctx.fillStyle = '#9a8070';
      ctx.fillRect(px + pw * 0.3, top + 8, pw * 0.42, bottom - top);
      ctx.fillStyle = '#c0a88a';
      for (let y = top + 22; y < bottom; y += 16) ctx.fillRect(px + pw * 0.3, y, pw * 0.42, 3);
      // a few windows catching the sun
      ctx.fillStyle = rgba('#fff2b0', 0.8);
      if (i < n / 2) for (let y = top + 10 + ((i * 37) % 30); y < bottom; y += 52 + i * 3) ctx.fillRect(px + pw * 0.3, y, pw * 0.42, 9);
    }
    // the shade: dots down the right half, a flat cast shadow from the setback above on the right
    dots(ctx, { x: x0, y: top, w: x1 - x0, h: bottom - top }, linTone(x0 + (x1 - x0) * 0.4, 0, x1, 0, 0, 0.75), SHADE, { step: 6, angle: 0.79, a: 0.8 });
    ctx.fillStyle = rgba('#ffc890', 0.28);
    ctx.fillRect(x0, top, (x1 - x0) * 0.2, bottom - top);
    vfill(ctx, x0, top, x1 - x0, 12, [[0, rgba(SHADE, 0.55)], [1, rgba(SHADE, 0)]]);
  });
  ink(ctx, face, 2.4, '#4a2a40', 0.6);
}

function tower(ctx: Ctx, r: R): void {
  const [sx0, sx1, st] = TOWER.shaft;
  const [ax0, ax1, at] = TOWER.set1;
  const [bx0, bx1, bt] = TOWER.set2;
  towerFace(ctx, sx0, sx1, st, MP.horizon + 6, 8);
  towerFace(ctx, ax0, ax1, at, st, 6);
  towerFace(ctx, bx0, bx1, bt, at, 4);
  // the crown: three stacked sunburst arches in brass, triangular windows in their faces
  const cy = TOWER.crown.y;
  const tiers: [number, number][] = [[44, 0], [32, 18], [20, 34]];
  for (const [hw, lift] of tiers) {
    const base = cy - lift;
    const arch: PathFn = (c) => {
      c.beginPath();
      c.moveTo(TX - hw, base);
      c.lineTo(TX - hw, base - 12);
      c.quadraticCurveTo(TX, base - 12 - hw * 1.1, TX + hw, base - 12);
      c.lineTo(TX + hw, base);
      c.closePath();
    };
    const g = ctx.createLinearGradient(TX - hw, 0, TX + hw, 0);
    g.addColorStop(0, '#ffe8a0');
    g.addColorStop(0.45, '#e0a848');
    g.addColorStop(1, '#8a5a2a');
    flat(ctx, arch, g, 0, INK);
    within(ctx, arch, () => {
      // rays and triangle windows
      ctx.strokeStyle = rgba('#6a3a1a', 0.6);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = -3; k <= 3; k++) {
        ctx.moveTo(TX + k * hw * 0.28, base);
        ctx.lineTo(TX + k * hw * 0.12, base - hw * 0.8);
      }
      ctx.stroke();
      ctx.fillStyle = '#3a2440';
      for (let k = -2; k <= 2; k++) {
        const tx = TX + k * hw * 0.3;
        ctx.beginPath();
        ctx.moveTo(tx - 3, base - 4);
        ctx.lineTo(tx + 3, base - 4);
        ctx.lineTo(tx, base - 13);
        ctx.fill();
      }
      dots(ctx, { x: TX - hw, y: base - hw * 1.4, w: hw * 2, h: hw * 1.4 }, linTone(TX, 0, TX + hw, 0, 0, 0.7), '#4a2a10', { step: 5, angle: 0.79, a: 0.7 });
    });
    ink(ctx, arch, 2, '#4a2a20', 0.5);
  }
  // the mast up to the globe, and the needle above it
  const mastTop = MP.globe.y + MP.globe.r - 6;
  flat(ctx, rectPath(TX - 5, mastTop, 10, cy - 46 - mastTop), '#b08a50', 1.8, '#3a2420');
  ctx.fillStyle = rgba('#fff0c0', 0.8);
  ctx.fillRect(TX - 4, mastTop, 3, cy - 46 - mastTop);
  flat(ctx, polyPath([[TX - 3, MP.globe.y - MP.globe.r + 4], [TX, MP.needle.top], [TX + 3, MP.globe.y - MP.globe.r + 4]]), '#c8b088', 1.4, '#3a2420');
  flat(ctx, ellPath(TX, MP.needle.top + 2, 4, 4), '#d02020', 1.2, '#2a1010');
  void r;
}

/** The pizza globe: frame `ph` of its turn (0…1), at (cx, cy) with radius R; its ring's back half, the sphere, the
 * ring's front half. Lit from the top left, the terminator in dots. */
export function globe(c: Ctx, cx: number, cy: number, R0: number, ph: number): void {
  const tilt = -0.22;
  const ringRx = R0 * 1.5;
  const ringRy = R0 * 0.34;
  const ring = (front: boolean) => {
    c.save();
    c.translate(cx, cy);
    c.rotate(tilt);
    c.beginPath();
    c.ellipse(0, 0, ringRx, ringRy, 0, front ? 0 : Math.PI, front ? Math.PI : P2);
    c.strokeStyle = INK;
    c.lineWidth = 9;
    c.stroke();
    c.strokeStyle = front ? '#f0b83a' : '#a8742a';
    c.lineWidth = 5;
    c.stroke();
    if (front) {
      c.strokeStyle = 'rgba(255,248,210,0.9)';
      c.lineWidth = 1.6;
      c.beginPath();
      c.ellipse(0, -1.4, ringRx, ringRy, 0, 0.35, 1.4);
      c.stroke();
      // studs on the ring, travelling round it with the turn
      c.fillStyle = '#5a3410';
      for (let k = 0; k < 10; k++) {
        const a = ((k / 10 + ph * 0.5) % 1) * Math.PI;
        c.beginPath();
        c.arc(Math.cos(a) * ringRx, Math.sin(a) * ringRy, 1.6, 0, P2);
        c.fill();
      }
    }
    c.restore();
  };
  ring(false);
  const sphere = ellPath(cx, cy, R0, R0);
  c.save();
  c.fillStyle = '#f6c040';
  sphere(c);
  c.fill();
  c.clip();
  c.translate(cx, cy);
  c.rotate(tilt * 0.6);
  // the turn: longitude offset
  const lon0 = ph * P2;
  const proj = (lat: number, lon: number): [number, number, number] => [R0 * Math.cos(lat) * Math.sin(lon + lon0), -R0 * Math.sin(lat), Math.cos(lat) * Math.cos(lon + lon0)];
  // cheese mottling: soft orange patches
  const r = rng(4242);
  const toppings: [number, number, number, string][] = [];
  for (let i = 0; i < 22; i++) toppings.push([(r() - 0.5) * 2.6, r() * P2, 0.16 + r() * 0.12, i % 7 === 0 ? 'olive' : i % 3 === 0 ? 'melt' : 'pep']);
  for (const [lat, lon, s, kind] of toppings) {
    const [x, y, z] = proj(lat, lon);
    if (z <= 0.02) continue;
    c.globalAlpha = Math.min(1, z / 0.3);
    const rr = R0 * s;
    const fx = Math.max(0.12, z);
    if (kind === 'melt') {
      c.fillStyle = 'rgba(255,236,150,0.85)';
      c.beginPath();
      c.ellipse(x, y, rr * 1.4 * fx, rr * 1.1 * Math.cos(lat), 0, 0, P2);
      c.fill();
      continue;
    }
    c.fillStyle = kind === 'olive' ? '#2a2a2a' : '#c8322a';
    c.beginPath();
    c.ellipse(x, y, rr * fx, rr * Math.max(0.3, Math.cos(lat)), 0, 0, P2);
    c.fill();
    c.strokeStyle = kind === 'olive' ? '#5a5a5a' : '#7a1a14';
    c.lineWidth = 1.2;
    c.stroke();
    if (kind === 'olive') {
      c.fillStyle = '#f6c040';
      c.beginPath();
      c.ellipse(x, y, rr * 0.4 * fx, rr * 0.4 * Math.max(0.3, Math.cos(lat)), 0, 0, P2);
      c.fill();
    } else {
      c.fillStyle = 'rgba(255,160,140,0.6)';
      c.beginPath();
      c.ellipse(x - rr * 0.3 * fx, y - rr * 0.3, rr * 0.3 * fx, rr * 0.2, 0, 0, P2);
      c.fill();
    }
  }
  c.globalAlpha = 1;
  // the slices' cuts: meridians every 45°, only their near halves
  c.strokeStyle = 'rgba(122,60,20,0.85)';
  c.lineWidth = 2;
  for (let k = 0; k < 8; k++) {
    const lon = (k / 8) * P2;
    c.beginPath();
    let on = false;
    for (let i = 0; i <= 24; i++) {
      const lat = -Math.PI / 2 + (i / 24) * Math.PI;
      const [x, y, z] = proj(lat, lon);
      if (z < 0) {
        on = false;
        continue;
      }
      if (!on) c.moveTo(x, y);
      else c.lineTo(x, y);
      on = true;
    }
    c.stroke();
  }
  // the crust: a band round the equator
  c.strokeStyle = '#c8782a';
  c.lineWidth = 5;
  c.beginPath();
  c.ellipse(0, 0, R0, R0 * 0.1, 0, 0, Math.PI);
  c.stroke();
  c.restore();
  // light: a hot spot top left, the terminator in dots bottom right
  c.save();
  sphere(c);
  c.clip();
  const g = c.createRadialGradient(cx - R0 * 0.4, cy - R0 * 0.45, 2, cx - R0 * 0.4, cy - R0 * 0.45, R0 * 0.9);
  g.addColorStop(0, 'rgba(255,255,230,0.75)');
  g.addColorStop(1, 'rgba(255,255,230,0)');
  c.fillStyle = g;
  c.fillRect(cx - R0, cy - R0, R0 * 2, R0 * 2);
  dots(c, { x: cx - R0, y: cy - R0, w: R0 * 2, h: R0 * 2 }, radTone(cx - R0 * 0.55, cy - R0 * 0.6, R0 * 2.1, -0.35, 1.1), '#6a2a10', { step: 4.5, angle: 0.79, a: 0.75 });
  c.restore();
  c.strokeStyle = INK;
  c.lineWidth = 3.4;
  sphere(c);
  c.stroke();
  ring(true);
}

const GLOBE_F = { w: 160, h: 120 };
function globeStill(ctx: Ctx): void {
  globe(ctx, MP.globe.x, MP.globe.y, MP.globe.r, 0);
}

// ——— the mid distance: left, the tenement and its water tank ———

const BRICK = '#b2543c';
const MIDL_BOX = { x: 0, y: 140, w: 362, h: CUT - 140 };

function tenement(ctx: Ctx, r: R): void {
  const { x1, top } = MP.tenement;
  const bottom = MP.horizon + 6;
  // the right side face in shade (it turns away from the sun), receding to the vanishing point
  const side = polyPath([[x1, top], [x1 + 24, top + 4], [x1 + 24, bottom], [x1, bottom]]);
  flat(ctx, side, '#6a2e3a', 0, INK);
  within(ctx, side, () => dots(ctx, { x: x1, y: top, w: 24, h: bottom - top }, () => 0.7, '#2a1030', { step: 5, angle: 0.79 }));
  ink(ctx, side, 2.6, INK, 0);
  const face = rectPath(-10, top, x1 + 10, bottom - top);
  flat(ctx, face, BRICK, 0, INK);
  within(ctx, face, () => {
    // courses: a few inked brick clusters, faint mortar elsewhere
    ctx.fillStyle = rgba('#5a2018', 0.22);
    for (let y = top + 24; y < bottom; y += 9) ctx.fillRect(0, y, x1, 1.4);
    for (let i = 0; i < 16; i++) {
      const bx = r() * x1;
      const by = top + 30 + r() * (bottom - top - 40);
      ctx.strokeStyle = rgba('#4a1810', 0.55);
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) ctx.strokeRect(bx + (k % 2) * 9 + k * 4, by + k * 9, 18, 9);
    }
    // windows in four bays: stone lintels and sills, sashes, the sky in the glass; the left reveals lit
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 4; col++) {
        const wx = 22 + col * 78;
        const wy = top + 46 + row * 74;
        if (wy > bottom - 20) continue;
        ctx.fillStyle = '#e8d2b0';
        ctx.fillRect(wx - 6, wy - 10, 52, 9);
        ctx.fillRect(wx - 4, wy + 58, 48, 6);
        const glass = ctx.createLinearGradient(wx, wy, wx + 40, wy + 56);
        glass.addColorStop(0, '#9ad8f0');
        glass.addColorStop(0.5, '#4a6aa0');
        glass.addColorStop(1, '#2a2050');
        ctx.fillStyle = glass;
        ctx.fillRect(wx, wy, 40, 56);
        const v = r();
        if (v < 0.35) {
          // a blind pulled half down
          ctx.fillStyle = v < 0.15 ? '#f2e2b0' : '#e8a070';
          ctx.fillRect(wx, wy, 40, 18 + v * 60);
        }
        ctx.fillStyle = '#efe0c8';
        ctx.fillRect(wx, wy + 27, 40, 3);
        ctx.fillRect(wx + 19, wy, 2.5, 56);
        // the reveal's shade: the lintel's shadow and the right-hand jamb
        ctx.fillStyle = rgba('#1c0c20', 0.55);
        ctx.fillRect(wx, wy, 40, 5);
        ctx.fillRect(wx + 35, wy, 5, 56);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(wx, wy, 40, 56);
        // the glass flashing the low sun
        if (r() < 0.3) {
          ctx.fillStyle = rgba('#fff8d0', 0.85);
          ctx.beginPath();
          ctx.moveTo(wx + 4, wy + 50);
          ctx.lineTo(wx + 14, wy + 32);
          ctx.lineTo(wx + 20, wy + 32);
          ctx.lineTo(wx + 10, wy + 50);
          ctx.fill();
        }
      }
    // the sun across it, the shade deepening right and down in dots, the cornice's flat shadow under it
    ctx.fillStyle = rgba(SUN, 0.18);
    ctx.fillRect(0, top, x1 * 0.4, bottom - top);
    dots(ctx, { x: -10, y: top, w: x1 + 10, h: bottom - top }, (x, y) => 0.55 * smooth(110, x1, x) + 0.25 * smooth(top + 80, bottom, y) - 0.05, '#3a1430', { step: 7, angle: 0.79, a: 0.7 });
    ctx.fillStyle = rgba('#2a0c1e', 0.5);
    ctx.fillRect(-10, top, x1 + 10, 26);
  });
  ink(ctx, face, 4, INK, 0.9);
  // the cornice: a projecting band with dentils, lit on top
  const corn = polyPath([[-10, top - 14], [x1 + 8, top - 14], [x1 + 8, top + 4], [-10, top + 4]]);
  flat(ctx, corn, '#e6cfa6', 0, INK);
  within(ctx, corn, () => {
    ctx.fillStyle = '#fff2d4';
    ctx.fillRect(-10, top - 14, x1 + 20, 5);
    ctx.fillStyle = '#8a6a5a';
    for (let x = -4; x < x1 + 8; x += 12) ctx.fillRect(x, top - 4, 6, 8);
    dots(ctx, { x: -10, y: top - 14, w: x1 + 20, h: 18 }, linTone(0, 0, x1, 0, 0.1, 0.6), SHADE, { step: 5, angle: 0.79 });
  });
  ink(ctx, corn, 2.4, INK, 0.6);
  waterTank(ctx, r);
}

function waterTank(ctx: Ctx, r: R): void {
  const { x, base } = MP.tank;
  const top = base - 34;
  const legs = [-48, -16, 16, 48];
  // the steel stand: legs, cross braces, a beam platform; its shadow thrown right along the roof
  castShadow(ctx, polyPath([[x - 60, top - 120], [x + 60, top - 120], [x + 60, base], [x - 60, base]]), 10, 8, 0.25, '#2a0c20');
  ctx.strokeStyle = INK;
  for (const lx of legs) {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x + lx, base);
    ctx.lineTo(x + lx * 0.9, top);
    ctx.stroke();
    ctx.strokeStyle = '#7a6a70';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = INK;
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 48, base - 4);
  ctx.lineTo(x + 16, top + 4);
  ctx.moveTo(x + 48, base - 4);
  ctx.lineTo(x - 16, top + 4);
  ctx.stroke();
  flat(ctx, rectPath(x - 64, top - 8, 128, 10), '#5a4a52', 2.4, INK);
  // the barrel: cedar staves, steel hoops, a lit left side
  const bt = top - 112;
  const barrel: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 56, top - 8);
    c.lineTo(x - 58, bt);
    c.lineTo(x + 58, bt);
    c.lineTo(x + 56, top - 8);
    c.closePath();
  };
  const g = ctx.createLinearGradient(x - 58, 0, x + 58, 0);
  g.addColorStop(0, '#f0a868');
  g.addColorStop(0.3, '#c87844');
  g.addColorStop(1, '#6a3a2a');
  flat(ctx, barrel, g, 0, INK);
  within(ctx, barrel, () => {
    ctx.strokeStyle = rgba('#4a2010', 0.6);
    ctx.lineWidth = 1.4;
    for (let k = -5; k <= 5; k++) {
      const sx = x + Math.sin((k / 6) * Math.PI * 0.5) * 58;
      ctx.beginPath();
      ctx.moveTo(sx, bt);
      ctx.lineTo(sx, top - 8);
      ctx.stroke();
    }
    for (const hy of [bt + 16, bt + 48, bt + 80, top - 18]) {
      ctx.fillStyle = INK;
      ctx.fillRect(x - 60, hy, 120, 4);
      ctx.fillStyle = rgba('#d8c8c0', 0.7);
      ctx.fillRect(x - 52, hy, 34, 1.4);
    }
    dots(ctx, { x: x - 58, y: bt, w: 116, h: top - bt }, linTone(x - 10, 0, x + 58, 0, 0, 0.9), '#2a0c18', { step: 5, angle: 0.79 });
    // a water stain running down from a weeping stave
    ctx.fillStyle = rgba('#3a1a10', 0.3);
    ctx.fillRect(x + 20, bt + 30, 5, 70);
  });
  ink(ctx, barrel, 3, INK, 0.6);
  // the conical roof and its finial; a ladder up the side
  const roof = polyPath([[x - 64, bt + 2], [x, bt - 48], [x + 64, bt + 2]]);
  const rg = ctx.createLinearGradient(x - 64, 0, x + 64, 0);
  rg.addColorStop(0, '#e0a070');
  rg.addColorStop(0.5, '#9a5a3a');
  rg.addColorStop(1, '#4a2420');
  flat(ctx, roof, rg, 3, INK);
  within(ctx, roof, () => dots(ctx, { x: x - 64, y: bt - 48, w: 128, h: 52 }, linTone(x, 0, x + 64, 0, 0, 0.8), '#2a0c18', { step: 5, angle: 0.79 }));
  flat(ctx, ellPath(x, bt - 50, 5, 5), '#c8a070', 1.6, INK);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const lx of [x - 72, x - 62]) {
    ctx.moveTo(lx, base);
    ctx.lineTo(lx + 4, bt + 6);
  }
  for (let y = base - 10; y > bt + 10; y -= 12) {
    const u = (base - y) / (base - bt);
    ctx.moveTo(x - 72 + u * 4, y);
    ctx.lineTo(x - 62 + u * 4, y);
  }
  ctx.stroke();
  void r;
}

// ——— the billboard on the neighbour's roof ———

export const SIGN = MP.sign;
const SIGN_BOX = { x: SIGN.x0 - 60, y: SIGN.y0 - 60, w: SIGN.x1 - SIGN.x0 + 120, h: CUT - SIGN.y0 + 60 };
const LETTERS = 'METROPIZZA';
const NEON_RED = '#ff3a4a';
const NEON_GOLD = '#ffd23a';
/** Where the sign's lettering sits. */
export const TEXT = { x0: 520, x1: 792, base: 444, size: 74 };
const TAG = { y: 476, size: 23 };
const SLICE = { x: 452, y: 418, s: 1 };

export function letterXs(ctx: Ctx): number[] {
  ctx.save();
  ctx.font = `${TEXT.size}px ${BLOCK}`;
  const ws = [...LETTERS].map((ch) => ctx.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0);
  const k = (TEXT.x1 - TEXT.x0) / total;
  ctx.restore();
  const xs: number[] = [];
  let x = TEXT.x0;
  for (const w of ws) {
    xs.push(x + (w * k) / 2);
    x += w * k;
  }
  return xs;
}

function lettersPath(c: Ctx, i: number | null, xs: number[], dx = 0, dy = 0): void {
  c.font = `${TEXT.size}px ${BLOCK}`;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  for (let k = 0; k < LETTERS.length; k++) if (i === null || i === k) c.fillText(LETTERS[k], xs[k] + dx, TEXT.base + dy);
}

function slicePts(): [number, number][] {
  const { x, y, s } = SLICE;
  return [[x - 46 * s, y - 50 * s], [x + 46 * s, y - 50 * s], [x, y + 56 * s]];
}

function billboard(ctx: Ctx, r: R): void {
  const roofY = SIGN.roof;
  const bottom = MP.horizon + 6;
  // the neighbour's building: a low brick front under its roof's parapet, the roof's tar seen over it
  const front = rectPath(SIGN.x0 - 50, roofY, SIGN.x1 - SIGN.x0 + 100, bottom - roofY);
  flat(ctx, front, '#8a4a52', 0, INK);
  within(ctx, front, () => {
    ctx.fillStyle = rgba('#4a1a2a', 0.3);
    for (let y = roofY + 10; y < bottom; y += 8) ctx.fillRect(SIGN.x0 - 50, y, SIGN.x1 - SIGN.x0 + 100, 1.2);
    for (let x = SIGN.x0 - 30; x < SIGN.x1 + 40; x += 70) {
      ctx.fillStyle = '#2a2040';
      ctx.fillRect(x, roofY + 22, 34, 40);
      ctx.fillStyle = rgba('#fff0b0', 0.7);
      if (x < 560) ctx.fillRect(x + 3, roofY + 24, 8, 30);
    }
    dots(ctx, { x: SIGN.x0 - 50, y: roofY, w: SIGN.x1 - SIGN.x0 + 100, h: bottom - roofY }, linTone(SIGN.x0, 0, SIGN.x1 + 50, 0, 0.15, 0.6), '#2a0c24', { step: 6, angle: 0.79 });
    // the tenement's long shadow thrown across it by the low sun
    ctx.fillStyle = rgba('#2a0c2a', 0.42);
    ctx.beginPath();
    ctx.moveTo(SIGN.x0 - 60, roofY);
    ctx.lineTo(SIGN.x0 + 150, roofY);
    ctx.lineTo(SIGN.x0 + 96, bottom);
    ctx.lineTo(SIGN.x0 - 60, bottom);
    ctx.fill();
  });
  ink(ctx, front, 2.4, INK, 0.5);
  flat(ctx, rectPath(SIGN.x0 - 54, roofY - 8, SIGN.x1 - SIGN.x0 + 108, 10), '#d8c0a0', 2, INK);
  // the trestle: I-beam legs from the roof to the catwalk, X-braced, their shadows thrown right on the parapet
  const legs = [SIGN.x0 + 30, SIGN.x0 + 140, SIGN.x1 - 140, SIGN.x1 - 30];
  const cat = SIGN.y1 + 8;
  for (const lx of legs) castShadow(ctx, rectPath(lx - 5, cat, 10, roofY - 8 - cat), 8, 4, 0.3, '#2a0c20');
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < legs.length - 1; i++) {
    ctx.moveTo(legs[i], cat + 4);
    ctx.lineTo(legs[i + 1], roofY - 10);
    ctx.moveTo(legs[i + 1], cat + 4);
    ctx.lineTo(legs[i], roofY - 10);
  }
  ctx.stroke();
  for (const lx of legs) {
    flat(ctx, rectPath(lx - 5, cat, 10, roofY - 8 - cat), '#6a6070', 2, INK, 0.4);
    ctx.fillStyle = rgba('#e8d8c8', 0.6);
    ctx.fillRect(lx - 4, cat, 2, roofY - 8 - cat);
  }
  // the sign face's shadow on the trestle behind and the catwalk
  const face = rectPath(SIGN.x0, SIGN.y0, SIGN.x1 - SIGN.x0, SIGN.y1 - SIGN.y0);
  castShadow(ctx, face, 10, 6, 0.35, '#1a0818');
  signFace(ctx);
  // the board's deep shadow under its foot: a spot black over the trestle's top
  ctx.fillStyle = rgba(INK, 0.55);
  ctx.fillRect(SIGN.x0, cat + 4, SIGN.x1 - SIGN.x0, 14);
  // the catwalk and its railing in front of the board's foot
  flat(ctx, rectPath(SIGN.x0 - 20, cat - 4, SIGN.x1 - SIGN.x0 + 40, 8), '#5a5262', 2, INK);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = SIGN.x0 - 16; x <= SIGN.x1 + 16; x += 32) {
    ctx.moveTo(x, cat - 4);
    ctx.lineTo(x, cat - 28);
  }
  ctx.moveTo(SIGN.x0 - 18, cat - 28);
  ctx.lineTo(SIGN.x1 + 18, cat - 28);
  ctx.moveTo(SIGN.x0 - 18, cat - 16);
  ctx.lineTo(SIGN.x1 + 18, cat - 16);
  ctx.stroke();
  // the gooseneck lamps over the board
  for (const lx of LAMPS) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(lx, SIGN.y0 + 2);
    ctx.quadraticCurveTo(lx, SIGN.y0 - 36, lx + 26, SIGN.y0 - 34);
    ctx.stroke();
    ctx.strokeStyle = '#7a7080';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    flat(ctx, polyPath([[lx + 18, SIGN.y0 - 40], [lx + 38, SIGN.y0 - 38], [lx + 42, SIGN.y0 - 26], [lx + 14, SIGN.y0 - 28]]), '#4a4652', 2, INK);
  }
  void r;
}

/** The billboard's face: the cream board in its red frame, the slice on its starburst, the lettering with its neon
 * tubes (dark), the tagline and the marquee bulbs (dark), at the sign's place (SIGN). Downtown Ruins hangs it. */
export function signFace(ctx: Ctx): void {
  const face = rectPath(SIGN.x0, SIGN.y0, SIGN.x1 - SIGN.x0, SIGN.y1 - SIGN.y0);
  // the face: cream board in a red frame
  flat(ctx, face, '#f8e8c4', 0, INK);
  within(ctx, face, () => {
    ctx.fillStyle = '#d8322e';
    ctx.fillRect(SIGN.x0, SIGN.y0, SIGN.x1 - SIGN.x0, 12);
    ctx.fillRect(SIGN.x0, SIGN.y1 - 34, SIGN.x1 - SIGN.x0, 34);
    ctx.fillRect(SIGN.x0, SIGN.y0, 10, SIGN.y1 - SIGN.y0);
    ctx.fillRect(SIGN.x1 - 10, SIGN.y0, 10, SIGN.y1 - SIGN.y0);
    // the slice on a yellow starburst
    const burst: PathFn = (c) => {
      c.beginPath();
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * P2;
        const rr = k % 2 ? 50 : 66;
        c.lineTo(SLICE.x + Math.cos(a) * rr, SLICE.y - 6 + Math.sin(a) * rr * 0.92);
      }
      c.closePath();
    };
    flat(ctx, burst, '#ffd23a', 2, '#c84a1a', 0);
    const sl = polyPath(slicePts());
    flat(ctx, sl, '#ffc44a', 3, INK);
    within(ctx, sl, () => {
      ctx.fillStyle = '#e8782a';
      ctx.fillRect(SLICE.x - 50, SLICE.y - 58, 100, 14);
      for (const [px, py] of [[-16, -28], [14, -22], [-2, 0], [4, 26]] as const) {
        flat(ctx, ellPath(SLICE.x + px, SLICE.y + py, 9, 9), '#c8302a', 1.6, '#6a1410', 0);
      }
      dots(ctx, { x: SLICE.x - 50, y: SLICE.y - 60, w: 100, h: 120 }, linTone(SLICE.x - 10, 0, SLICE.x + 40, 0, 0, 0.6), '#a8501a', { step: 5, angle: 0.79 });
    });
    // a cheese drip off the tip
    flat(ctx, (c) => {
      c.beginPath();
      c.moveTo(SLICE.x - 6, SLICE.y + 44);
      c.quadraticCurveTo(SLICE.x - 4, SLICE.y + 66, SLICE.x + 1, SLICE.y + 68);
      c.quadraticCurveTo(SLICE.x + 6, SLICE.y + 62, SLICE.x + 5, SLICE.y + 42);
      c.closePath();
    }, '#ffd86a', 2, INK, 0);
    // the lettering: comic block letters, extruded down-right in deep red, inked
    const xs = letterXs(ctx);
    ctx.fillStyle = '#6a0c14';
    for (let k = 1; k <= 4; k++) lettersPath(ctx, null, xs, k, k);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.font = `${TEXT.size}px ${BLOCK}`;
    ctx.textAlign = 'center';
    for (let k = 0; k < LETTERS.length; k++) ctx.strokeText(LETTERS[k], xs[k], TEXT.base);
    const lg = ctx.createLinearGradient(0, TEXT.base - TEXT.size * 0.75, 0, TEXT.base);
    lg.addColorStop(0, '#ff5a4a');
    lg.addColorStop(1, '#c8202a');
    ctx.fillStyle = lg;
    lettersPath(ctx, null, xs);
    // the neon tubes laid over the letters (dark glass by day)
    neonTubes(ctx, xs, 'off');
    // the tagline reversed out of the red band
    ctx.font = `${TAG.size}px ${BLOCK}`;
    ctx.fillStyle = '#fff2d0';
    ctx.fillText('HOT SLICES  ·  SINCE 1938', (TEXT.x0 + TEXT.x1) / 2 - 30, TAG.y);
    // the low sun across the board, the shade in dots to the right
    ctx.fillStyle = rgba('#ffd8a0', 0.16);
    ctx.fillRect(SIGN.x0, SIGN.y0, 200, SIGN.y1 - SIGN.y0);
    dots(ctx, { x: SIGN.x0, y: SIGN.y0, w: SIGN.x1 - SIGN.x0, h: SIGN.y1 - SIGN.y0 }, linTone(SIGN.x0 + 180, 0, SIGN.x1, 0, 0, 0.3), SHADE, { step: 5, angle: 0.79, a: 0.45 });
  });
  ink(ctx, face, 4.4, INK, 0.9);
  // the marquee bulbs round the board (dark by day)
  for (const [bx, by] of bulbs()) {
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.arc(bx, by, 3.2, 0, P2);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

const LAMPS = [SIGN.x0 + 60, (SIGN.x0 + SIGN.x1) / 2 - 20, SIGN.x1 - 100];

function bulbs(): [number, number][] {
  const out: [number, number][] = [];
  for (let x = SIGN.x0 + 18; x <= SIGN.x1 - 18; x += 22) out.push([x, SIGN.y0 + 6]);
  return out;
}

/** The neon tubes over the letters: 'off' is dark glass, 'lit' paints the lit tube with its glow (for one letter or
 * all of them; the slice's outline is index 10, the tagline's rule 11). */
export function neonTubes(c: Ctx, xs: number[], mode: 'off' | 'lit', only: number | null = null): void {
  c.save();
  c.font = `${TEXT.size * 0.8}px ${BLOCK}`;
  c.textAlign = 'center';
  c.lineJoin = 'round';
  const tube = (draw: () => void, col: string) => {
    if (mode === 'off') {
      c.strokeStyle = rgba(INK, 0.55);
      c.lineWidth = 4.5;
      draw();
      c.strokeStyle = 'rgba(255,220,220,0.55)';
      c.lineWidth = 1.8;
      draw();
      return;
    }
    c.shadowColor = col;
    c.shadowBlur = 16;
    c.strokeStyle = rgba(col, 0.9);
    c.lineWidth = 7;
    draw();
    c.shadowBlur = 6;
    c.strokeStyle = mix(col, '#ffffff', 0.55);
    c.lineWidth = 3.2;
    draw();
    c.shadowBlur = 0;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.2;
    draw();
  };
  for (let k = 0; k < LETTERS.length; k++) {
    if (only !== null && only !== k) continue;
    tube(() => c.strokeText(LETTERS[k], xs[k], TEXT.base - 6), NEON_RED);
  }
  if (only === null || only === 10) {
    const pts = slicePts().map(([x, y]) => [SLICE.x + (x - SLICE.x) * 1.16, SLICE.y + (y - SLICE.y) * 1.16 - 2] as [number, number]);
    tube(() => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.stroke();
    }, NEON_GOLD);
  }
  if (only === null || only === 11) {
    tube(() => {
      c.beginPath();
      c.moveTo(TEXT.x0 - 6, TAG.y - 26);
      c.lineTo(TEXT.x1, TAG.y - 26);
      c.stroke();
    }, NEON_GOLD);
  }
  c.restore();
}

// ——— the mid distance: right, the deco office and the tall building with its fire escape ———

const MIDR_BOX = { x: 1460, y: 200, w: W - 1460, h: CUT - 200 };

function midRight(ctx: Ctx, r: R): void {
  const bottom = MP.horizon + 6;
  // the tall one: ochre brick, a deco cap, the fire escape down its face
  const T = MP.tall;
  const tSide = polyPath([[T.x0, T.top], [T.x0 - 12, T.top + 4], [T.x0 - 12, bottom], [T.x0, bottom]]);
  flat(ctx, tSide, '#ffd89a', 2, INK, 0);
  const tFace = rectPath(T.x0, T.top, T.x1 - T.x0, bottom - T.top);
  flat(ctx, tFace, '#c8964a', 0, INK);
  within(ctx, tFace, () => {
    ctx.fillStyle = rgba('#6a4020', 0.2);
    for (let y = T.top + 30; y < bottom; y += 8) ctx.fillRect(T.x0, y, T.x1 - T.x0, 1.2);
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 4; col++) {
        const wx = T.x0 + 26 + col * 52;
        const wy = T.top + 40 + row * 44;
        ctx.fillStyle = '#2a2a4a';
        ctx.fillRect(wx, wy, 26, 32);
        ctx.fillStyle = rgba('#8ac8e8', 0.6);
        ctx.fillRect(wx, wy, 26, 10);
        if (r() < 0.25) {
          ctx.fillStyle = rgba('#fff4c8', 0.9);
          ctx.fillRect(wx + 3, wy + 3, 6, 26);
        }
        ctx.strokeStyle = rgba(INK, 0.8);
        ctx.lineWidth = 1.4;
        ctx.strokeRect(wx, wy, 26, 32);
      }
    ctx.fillStyle = rgba(SUN, 0.2);
    ctx.fillRect(T.x0, T.top, 40, bottom - T.top);
    dots(ctx, { x: T.x0, y: T.top, w: T.x1 - T.x0, h: bottom - T.top }, (x, y) => 0.08 + 0.5 * smooth(T.x0 + 40, T.x1, x) + 0.2 * smooth(T.top, bottom, y), '#3a1420', { step: 7, angle: 0.79, a: 0.75 });
  });
  ink(ctx, tFace, 4, INK, 0.9);
  // its deco cap: a stepped parapet with chevrons
  const cap = polyPath([[T.x0 - 6, T.top + 6], [T.x0 - 6, T.top - 16], [T.x0 + 40, T.top - 16], [T.x0 + 40, T.top - 34], [T.x0 + 110, T.top - 34], [T.x0 + 110, T.top - 52], [T.x1 + 10, T.top - 52], [T.x1 + 10, T.top + 6]]);
  flat(ctx, cap, '#e8c888', 0, INK);
  within(ctx, cap, () => {
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let x = T.x0; x < T.x1 + 10; x += 18) {
      ctx.moveTo(x, T.top - 2);
      ctx.lineTo(x + 9, T.top - 10);
      ctx.lineTo(x + 18, T.top - 2);
    }
    ctx.stroke();
    dots(ctx, { x: T.x0 - 6, y: T.top - 52, w: T.x1 - T.x0 + 16, h: 60 }, linTone(T.x0 + 60, 0, T.x1, 0, 0, 0.6), '#4a2410', { step: 5, angle: 0.79 });
  });
  ink(ctx, cap, 2.6, INK, 0.6);
  // a radio mast on top
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(T.x0 + 150, T.top - 52);
  ctx.lineTo(T.x0 + 150, T.top - 150);
  ctx.moveTo(T.x0 + 138, T.top - 52);
  ctx.lineTo(T.x0 + 150, T.top - 120);
  ctx.lineTo(T.x0 + 162, T.top - 52);
  ctx.stroke();
  flat(ctx, ellPath(T.x0 + 150, T.top - 152, 3.5, 3.5), '#d02020', 1.2, INK);
  fireEscape(ctx, T.x0 + 18, T.x1 - 34, T.top + 70, bottom);

  // the deco office: green terracotta, ribbon windows, a zigzag parapet; its lit left side face
  const O = MP.office;
  const oSide = polyPath([[O.x0, O.top], [O.x0 - 14, O.top + 4], [O.x0 - 14, bottom], [O.x0, bottom]]);
  flat(ctx, oSide, '#d8f0c8', 2, INK, 0);
  within(ctx, oSide, () => dots(ctx, { x: O.x0 - 14, y: O.top, w: 14, h: bottom - O.top }, linTone(0, O.top, 0, bottom, 0, 0.3), '#7aa870', { step: 4, angle: 0 }));
  const oFace = rectPath(O.x0, O.top, O.x1 - O.x0, bottom - O.top);
  flat(ctx, oFace, '#7ab09a', 0, INK);
  within(ctx, oFace, () => {
    for (let y = O.top + 40; y < bottom; y += 34) {
      ctx.fillStyle = '#26364a';
      ctx.fillRect(O.x0 + 10, y, O.x1 - O.x0 - 20, 16);
      ctx.fillStyle = rgba('#a8e0f0', 0.55);
      ctx.fillRect(O.x0 + 10, y, O.x1 - O.x0 - 20, 5);
      ctx.fillStyle = '#e8f0d8';
      for (let x = O.x0 + 10; x < O.x1 - 10; x += 28) ctx.fillRect(x, y, 3, 16);
      ctx.fillStyle = rgba('#fff6c8', 0.85);
      if (r() < 0.6) ctx.fillRect(O.x0 + 14 + r() * 50, y + 2, 10, 12);
    }
    ctx.fillStyle = rgba(SUN, 0.22);
    ctx.fillRect(O.x0, O.top, 36, bottom - O.top);
    dots(ctx, { x: O.x0, y: O.top, w: O.x1 - O.x0, h: bottom - O.top }, (x, y) => 0.05 + 0.5 * smooth(O.x0 + 60, O.x1, x) + 0.2 * smooth(O.top, bottom, y), '#123028', { step: 6, angle: 0.79, a: 0.8 });
    // the tall building's shadow? no: the sun is on the left. The office's own cornice shadow
    vfill(ctx, O.x0, O.top, O.x1 - O.x0, 18, [[0, 'rgba(10,30,30,0.5)'], [1, 'rgba(10,30,30,0)']]);
  });
  ink(ctx, oFace, 4, INK, 0.9);
  const zig: PathFn = (c) => {
    c.beginPath();
    c.moveTo(O.x0 - 4, O.top + 4);
    const steps = [[0, 10], [0.18, 22], [0.36, 34], [0.64, 34], [0.82, 22], [1, 10]];
    for (let i = 0; i < steps.length; i++) {
      const [u, hgt] = steps[i];
      const x = O.x0 - 4 + u * (O.x1 - O.x0 + 8);
      const nx = i < steps.length - 1 ? O.x0 - 4 + steps[i + 1][0] * (O.x1 - O.x0 + 8) : x;
      c.lineTo(x, O.top - hgt);
      c.lineTo(nx, O.top - hgt);
    }
    c.lineTo(O.x1 + 4, O.top + 4);
    c.closePath();
  };
  flat(ctx, zig, '#e0d0a0', 2.4, INK);
  within(ctx, zig, () => dots(ctx, { x: O.x0, y: O.top - 24, w: O.x1 - O.x0, h: 30 }, linTone(O.x0 + 40, 0, O.x1, 0, 0, 0.6), '#4a3a10', { step: 5, angle: 0.79 }));
}

/** An iron fire escape: landings with lattice railings, zigzag stairs, a drop ladder. */
function fireEscape(ctx: Ctx, x0: number, x1: number, y0: number, y1: number): void {
  const gap = 88;
  ctx.save();
  for (let y = y0, k = 0; y < y1 - 30; y += gap, k++) {
    // the landing's shadow on the wall below it
    ctx.fillStyle = rgba('#2a0c10', 0.35);
    ctx.fillRect(x0 + 8, y + 6, x1 - x0, 14);
    // railing lattice
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 30);
    }
    ctx.moveTo(x0, y - 30);
    ctx.lineTo(x1, y - 30);
    ctx.moveTo(x0, y - 15);
    ctx.lineTo(x1, y - 15);
    ctx.stroke();
    // the landing slab
    flat(ctx, rectPath(x0 - 4, y - 2, x1 - x0 + 8, 6), '#3a3040', 2, INK, 0.3);
    // the stair down to the next landing
    if (y + gap < y1 - 30) {
      const sx0 = k % 2 ? x0 + 14 : x1 - 14;
      const sx1 = k % 2 ? x1 - 50 : x0 + 50;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx0, y + 2);
      ctx.lineTo(sx1, y + gap - 2);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let u = 0.1; u < 1; u += 0.12) {
        const x = sx0 + (sx1 - sx0) * u;
        const yy = y + 2 + (gap - 4) * u;
        ctx.moveTo(x - 5, yy);
        ctx.lineTo(x + 5, yy);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ——— our roof: the parapet ———

const PARAPET_BOX = { x: 0, y: CUT, w: W, h: TY + 6 - CUT };
const PARA = '#c46044';

function parapet(ctx: Ctx, r: R): void {
  const face = rectPath(0, MP.face, W, TY - MP.face + 2);
  flat(ctx, face, PARA, 0, INK);
  within(ctx, face, () => {
    // the bricks: faint courses everywhere, a few inked clusters off the lanes, lit warm along the top-left
    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, 'rgba(255,200,140,0.22)');
    lg.addColorStop(0.5, 'rgba(255,200,140,0.05)');
    lg.addColorStop(1, 'rgba(60,20,60,0.12)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, MP.face, W, TY - MP.face);
    ctx.fillStyle = rgba('#6a2418', 0.22);
    for (let y = MP.face + 20, row = 0; y < TY; y += 20, row++) {
      ctx.fillRect(0, y, W, 2);
      for (let x = (row % 2) * 36; x < W; x += 72) ctx.fillRect(x, y - 20, 2, 20);
    }
    const clusters: [number, number][] = [[90, 668], [330, 700], [1620, 676], [1820, 712], [560, 734], [1380, 730]];
    for (const [cx, cy] of clusters) {
      ctx.strokeStyle = rgba(INK, 0.6);
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 4; k++) {
        const row = Math.floor((cy - MP.face) / 20) + (k % 2);
        const bx = cx + (k - 1.5) * 38 + (row % 2) * 36 - 18;
        ctx.strokeRect(bx, MP.face + row * 20 + 1, 70, 18);
      }
    }
    // the shade: the coping's lip throws a flat shadow, dots deepen down to the table and to the right
    ctx.fillStyle = rgba('#3a0c24', 0.5);
    ctx.fillRect(0, MP.face, W, 10);
    dots(ctx, { x: 0, y: MP.face, w: W, h: TY - MP.face }, (x, y) => 0.26 * smooth(MP.face + 30, TY, y) + 0.2 * smooth(600, W, x) - 0.06, '#4a1030', { step: 8, angle: 0.79, a: 0.75 });
    // a crack where the parapet's settled
    ctx.strokeStyle = rgba(INK, 0.7);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(820, MP.face + 4);
    ctx.lineTo(828, MP.face + 26);
    ctx.lineTo(822, MP.face + 44);
    ctx.lineTo(832, MP.face + 66);
    ctx.stroke();
    // rain has run off the coping's joints for decades: dark tide streaks under them
    for (let x = 90; x < W; x += 140 + r() * 120) {
      const len = 26 + r() * 60;
      const g = ctx.createLinearGradient(0, MP.face, 0, MP.face + len);
      g.addColorStop(0, 'rgba(60,16,30,0.35)');
      g.addColorStop(1, 'rgba(60,16,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 7, MP.face);
      ctx.lineTo(x + 7, MP.face);
      ctx.lineTo(x + 3 + r() * 4, MP.face + len);
      ctx.lineTo(x - 3, MP.face + len * 0.8);
      ctx.fill();
    }
    // the deepest shade, down by the table at the far right, hatched in ink
    hatch(ctx, polyPath([[1380, TY], [W, TY - 90], [W, TY]]), { x: 1380, y: TY - 90, w: W - 1380, h: 90 }, -0.9, 7, 1.3, INK, 0.35, r);
    hatch(ctx, polyPath([[0, TY], [0, TY - 40], [380, TY]]), { x: 0, y: TY - 40, w: 380, h: 40 }, -0.9, 8, 1.2, INK, 0.25, r);
  });
  // chips knocked off the coping's lip, the brick showing pale under them
  for (const cx of [146, 702, 1093, 1590, 1806]) {
    flat(ctx, polyPath([[cx - 9, MP.face - 1], [cx + 8, MP.face - 1], [cx + 3, MP.face + 6], [cx - 4, MP.face + 5]]), '#e8a888', 1.4, INK, 0);
  }
  // the coping: cream stone slabs, their top lit gold, the front face cooler, joints
  const top = polyPath([[-10, MP.coping], [W + 10, MP.coping], [W + 10, MP.coping + 8], [-10, MP.coping + 8]]);
  const lip = rectPath(-10, MP.coping + 8, W + 20, MP.face - MP.coping - 6);
  flat(ctx, lip, '#e0c8a0', 0, INK);
  within(ctx, lip, () => {
    dots(ctx, { x: 0, y: MP.coping + 8, w: W, h: 14 }, linTone(0, 0, W, 0, 0.1, 0.45), '#7a4a4a', { step: 5, angle: 0.79 });
    ctx.fillStyle = rgba(INK, 0.6);
    for (let x = 60 + r() * 40; x < W; x += 110 + r() * 30) ctx.fillRect(x, MP.coping + 8, 2, 14);
  });
  flat(ctx, top, '#fff0cc', 0, INK);
  within(ctx, top, () => {
    ctx.fillStyle = rgba('#ffc86a', 0.5);
    ctx.fillRect(0, MP.coping, 900, 8);
  });
  ink(ctx, polyPath([[-10, MP.coping], [W + 10, MP.coping], [W + 10, MP.face + 2], [-10, MP.face + 2]]), 3.4, INK, 0.5);
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, MP.coping + 8);
  ctx.lineTo(W, MP.coping + 8);
  ctx.stroke();
  // the parapet meets the roof/table line in occlusion
  crevice(ctx, 0, W, TY - 2, 16, 0.4, '#2a0c20');
}

// ——— our roof: the turbine vent, the chimney, the searchlight ———

const VENT = { x: MP.vent.x, base: MP.coping, duct: 34, headY: MP.coping - 34 - 34, rx: 34, ry: 30 };
const VENT_BOX = { x: VENT.x - 50, y: VENT.headY - 44, w: 110, h: MP.coping + 4 - (VENT.headY - 44) };

function ventBase(ctx: Ctx): void {
  const { x, base, duct } = VENT;
  // the low sun lays its long shadow right along the coping
  ctx.fillStyle = rgba('#5a2a3a', 0.45);
  ctx.beginPath();
  ctx.moveTo(x - 10, base);
  ctx.lineTo(x + 16, base - 2);
  ctx.lineTo(x + 96, base + 3);
  ctx.lineTo(x + 92, base + 8);
  ctx.lineTo(x - 6, base + 8);
  ctx.fill();
  castShadow(ctx, rectPath(x - 16, base - duct, 32, duct), 6, 3, 0.35, '#2a0c20');
  const d = rectPath(x - 16, base - duct, 32, duct);
  const g = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
  g.addColorStop(0, '#eef0f4');
  g.addColorStop(0.4, '#a8aab8');
  g.addColorStop(1, '#4a4a5a');
  flat(ctx, d, g, 2.4, INK);
  ctx.fillStyle = rgba(INK, 0.6);
  ctx.fillRect(x - 16, base - 12, 32, 2);
  flat(ctx, ellPath(x, base, 22, 4), '#8a8a9a', 1.6, INK, 0);
}

/** The turbine's head at a phase of its spin: curved vanes round a ball, lit on the left, the far side in dots. */
function ventHead(c: Ctx, x: number, y: number, ph: number): void {
  const { rx, ry } = VENT;
  const head = ellPath(x, y, rx, ry);
  c.save();
  head(c);
  c.fillStyle = '#5a5a6a';
  c.fill();
  c.clip();
  const n = 14;
  for (let k = 0; k < n; k++) {
    const a = ((k + ph) / n) * P2;
    const sx = Math.sin(a);
    const cz = Math.cos(a);
    if (cz < -0.1) continue;
    // a vane: a curved strip from top to bottom of the ball, its face catching more light on the left
    const lx = x + sx * rx;
    const light = 0.5 + 0.5 * -Math.sin(a + 0.6);
    c.fillStyle = mix('#3a3a48', '#f2f4f8', Math.max(0, light) * Math.max(0, cz) ** 0.5);
    c.beginPath();
    c.moveTo(x + sx * rx * 0.1, y - ry);
    c.quadraticCurveTo(lx + 10 * cz, y, x + sx * rx * 0.1, y + ry);
    c.quadraticCurveTo(lx - 6 * cz + (sx * rx) / n, y, x + sx * rx * 0.1, y - ry);
    c.fill();
    c.strokeStyle = rgba(INK, 0.8);
    c.lineWidth = 1.2;
    c.stroke();
  }
  dots(c, { x: x - rx, y: y - ry, w: rx * 2, h: ry * 2 }, linTone(x - rx * 0.2, y - ry * 0.3, x + rx, y + ry, 0, 0.8), '#14141e', { step: 4, angle: 0.79, a: 0.7 });
  c.restore();
  c.strokeStyle = INK;
  c.lineWidth = 2.6;
  head(c);
  c.stroke();
  // the cap and its spindle
  flat(c, ellPath(x, y - ry + 2, 9, 4), '#c8cad4', 1.6, INK, 0);
}

function ventStill(ctx: Ctx): void {
  ventHead(ctx, VENT.x, VENT.headY, 0);
}

const CH = { x: MP.chimney.x, w: 92, top: MP.chimney.top };
const CHIMNEY_BOX = { x: CH.x - CH.w / 2 - 10, y: CH.top - 52, w: CH.w + 40, h: MP.coping + 6 - (CH.top - 52) };

function chimney(ctx: Ctx, r: R): void {
  const { x, w, top } = CH;
  const stack = rectPath(x - w / 2, top, w, MP.coping - top + 2);
  castShadow(ctx, stack, 8, 4, 0.35, '#2a0c20');
  flat(ctx, stack, '#a84a3a', 0, INK);
  within(ctx, stack, () => {
    ctx.fillStyle = rgba('#4a1810', 0.4);
    for (let y = top + 16, row = 0; y < MP.coping; y += 14, row++) {
      ctx.fillRect(x - w / 2, y, w, 1.6);
      for (let bx = x - w / 2 + (row % 2) * 16; bx < x + w / 2; bx += 32) ctx.fillRect(bx, y - 14, 1.6, 14);
    }
    ctx.fillStyle = rgba(SUN, 0.24);
    ctx.fillRect(x - w / 2, top, 18, MP.coping - top);
    dots(ctx, { x: x - w / 2, y: top, w, h: MP.coping - top }, linTone(x - 10, 0, x + w / 2, 0, 0.05, 0.75), '#2a0820', { step: 6, angle: 0.79 });
    // soot round the top
    vfill(ctx, x - w / 2, top, w, 30, [[0, 'rgba(20,10,16,0.6)'], [1, 'rgba(20,10,16,0)']]);
  });
  ink(ctx, stack, 4, INK, 0.9);
  // the cap and two clay pots
  flat(ctx, rectPath(x - w / 2 - 6, top - 10, w + 12, 12), '#d8c0a0', 2.4, INK);
  for (const px of [x - 22, x + 20]) {
    const pot: PathFn = (c) => {
      c.beginPath();
      c.moveTo(px - 13, top - 10);
      c.lineTo(px - 9, top - 40);
      c.lineTo(px - 12, top - 44);
      c.lineTo(px + 12, top - 44);
      c.lineTo(px + 9, top - 40);
      c.lineTo(px + 13, top - 10);
      c.closePath();
    };
    const g = ctx.createLinearGradient(px - 13, 0, px + 13, 0);
    g.addColorStop(0, '#f0a070');
    g.addColorStop(0.5, '#c06a3a');
    g.addColorStop(1, '#6a2a1a');
    flat(ctx, pot, g, 2.4, INK);
    flat(ctx, ellPath(px, top - 44, 12, 3.5), '#1a0c10', 1.4, INK, 0);
  }
  void r;
}

const LAMP = MP.lamp;
/** The drum's aim at rest: up and back over the city, at the signal's spot on the clouds. */
const LAMP_REST = Math.atan2(MP.signal.y - MP.lamp.y, MP.signal.x - MP.lamp.x);
const LAMP_BOX = { x: LAMP.x - 120, y: LAMP.y - 120, w: 240, h: 200 };
const PED_BOX = { x: LAMP.x - 90, y: LAMP.y - 50, w: 180, h: MP.coping + 6 - (LAMP.y - 50) };

function lampPedestal(ctx: Ctx): void {
  const { x, y } = LAMP;
  // the pedestal rising from behind the parapet, the yoke's fork
  const ped = polyPath([[x - 22, MP.coping + 2], [x - 14, y + 34], [x + 14, y + 34], [x + 22, MP.coping + 2]]);
  castShadow(ctx, ped, 8, 4, 0.35, '#2a0c20');
  const g = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
  g.addColorStop(0, '#9aa0b0');
  g.addColorStop(0.4, '#5a6070');
  g.addColorStop(1, '#23252e');
  flat(ctx, ped, g, 2.8, INK);
  flat(ctx, rectPath(x - 30, y + 30, 60, 10), '#4a4e5a', 2.4, INK);
  const fork: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 64, y + 30);
    c.lineTo(x - 62, y - 10);
    c.lineTo(x - 50, y - 10);
    c.lineTo(x - 50, y + 20);
    c.lineTo(x + 50, y + 20);
    c.lineTo(x + 50, y - 10);
    c.lineTo(x + 62, y - 10);
    c.lineTo(x + 64, y + 30);
    c.closePath();
  };
  flat(ctx, fork, '#5a6070', 2.6, INK);
  within(ctx, fork, () => dots(ctx, { x: x - 64, y: y - 10, w: 128, h: 40 }, linTone(x - 20, 0, x + 50, 0, 0, 0.8), '#0c0c14', { step: 4, angle: 0.79 }));
}

/** The searchlight's drum, aimed along `ang` (0 points right; negative is up), centred on its trunnion. */
function lampHead(c: Ctx, ang: number, lit: number): void {
  const { x, y } = LAMP;
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  // aimed back over the left, the drum is drawn mirrored so its lit side stays on top
  if (Math.abs(ang) > Math.PI / 2) c.scale(1, -1);
  const L = 104;
  const R = 44;
  // the drum: a steel barrel, lens to the front (+x), the vented back, hoops
  const drum = rectPath(-L * 0.55, -R, L, R * 2);
  const g = c.createLinearGradient(0, -R, 0, R);
  g.addColorStop(0, '#d8dce6');
  g.addColorStop(0.35, '#8a90a0');
  g.addColorStop(1, '#2a2c36');
  flat(c, drum, g, 0, INK);
  within(c, drum, () => {
    c.fillStyle = rgba(INK, 0.7);
    for (const hx of [-L * 0.4, -L * 0.1, L * 0.2]) c.fillRect(hx, -R, 4, R * 2);
    dots(c, { x: -L, y: -R, w: L * 2, h: R * 2 }, linTone(0, -R * 0.2, 0, R, 0, 0.8), '#0c0c14', { step: 4.5, angle: 0.79 });
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.fillRect(-L * 0.55, -R + 7, L, 3);
  });
  ink(c, drum, 3.2, INK, 0.4);
  // the back cap and its vents
  flat(c, ellPath(-L * 0.55, 0, 12, R), '#4a4e5a', 2.6, INK);
  // the lens rim and the glass: concentric Fresnel rings, lit or dark
  flat(c, ellPath(L * 0.45, 0, 15, R + 4), '#c8ccd6', 3, INK);
  const glass = ellPath(L * 0.45 + 2, 0, 11, R - 4);
  const lg = c.createLinearGradient(0, -R, 0, R);
  lg.addColorStop(0, mix('#6a7a9a', '#fffbe8', lit));
  lg.addColorStop(1, mix('#1a2030', '#ffe8a0', lit));
  flat(c, glass, lg, 1.6, INK, 0);
  c.strokeStyle = lit > 0.5 ? 'rgba(255,240,200,0.8)' : 'rgba(180,200,230,0.5)';
  c.lineWidth = 1.2;
  for (const k of [0.75, 0.5, 0.25]) {
    c.beginPath();
    c.ellipse(L * 0.45 + 2, 0, 11 * k, (R - 4) * k, 0, 0, P2);
    c.stroke();
  }
  // the trunnion boss
  flat(c, ellPath(0, 0, 9, 9), '#9aa0b0', 2.4, INK);
  c.restore();
}

// ——— the table ———

const CHECK_A = '#f2c63c';
const CHECK_B = '#d23a32';

function table(ctx: Ctx, r: R): void {
  // the act's checker cloth in perspective, printed: shade in dots towards the back and the front edge
  const zf = MP.front;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, zf - TY + 4);
  ctx.clip();
  checkerCloth(ctx, r, zf, CHECK_A, CHECK_B, { cell: 0.2, off: 0.1 });
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => 0.32 * (1 - smooth(TY, TY + 120, y)) + 0.22 * smooth(zf - 140, zf, y) + 0.1 * smooth(900, W, x), '#5a1020', { step: 9, angle: 0.79, a: 0.55 });
  // the parapet's flat shadow along the back of the cloth
  ctx.fillStyle = rgba('#3a0c20', 0.28);
  ctx.beginPath();
  ctx.moveTo(0, TY);
  ctx.lineTo(W, TY);
  ctx.lineTo(W, TY + 18);
  for (let x = W; x >= 0; x -= 60) ctx.lineTo(x, TY + 18 + Math.sin(x * 0.01) * 3);
  ctx.closePath();
  ctx.fill();
  // the low sun warming the left of the cloth
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(255,210,150,0.14)');
  g.addColorStop(0.6, 'rgba(255,210,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, TY, W, zf - TY);
  ctx.restore();
  tableFalloff(ctx, zf, 0.3, '#2a0818');
  tableSeam(ctx, 0.55, INK, false);
  const cell = 0.1;
  foldedFront(ctx, zf, (x, y) => {
    const X = frontX(x, zf);
    const a = (Math.floor(X / cell) + Math.floor((y - zf) / 14)) % 2 === 0;
    return a ? '#b82a24' : '#e0a830';
  }, 6);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, zf, W, 1080 - zf);
  ctx.clip();
  dots(ctx, { x: 0, y: zf, w: W, h: 1080 - zf }, (_x, y) => 0.25 + 0.5 * smooth(zf, 1080, y), '#2a0410', { step: 7, angle: 0.79, a: 0.7 });
  ctx.restore();
  void r;
}

function tableProps(ctx: Ctx, r: R): void {
  // a Metropizza box, closed, at the back left
  const { x, y } = MP.table.box;
  const lid = polyPath([[x - 96, y - 20], [x + 74, y - 26], [x + 104, y + 4], [x - 70, y + 12]]);
  const front = polyPath([[x - 70, y + 12], [x + 104, y + 4], [x + 104, y + 24], [x - 70, y + 34]]);
  const side = polyPath([[x - 96, y - 20], [x - 70, y + 12], [x - 70, y + 34], [x - 96, y + 2]]);
  groundShadow(ctx, x + 30, y + 34, 130, 14, 0.62, '#3a0818', 1.3);
  flat(ctx, side, '#e8d4b0', 2.6, INK, 0);
  flat(ctx, front, '#c8a880', 2.6, INK, 0);
  within(ctx, front, () => {
    dots(ctx, { x: x - 70, y: y + 4, w: 180, h: 32 }, () => 0.45, '#5a2a14', { step: 4, angle: 0.79 });
    ctx.fillStyle = '#d8322e';
    ctx.fillRect(x - 70, y + 14, 174, 4);
  });
  flat(ctx, lid, '#fff6e2', 2.6, INK, 0.5);
  within(ctx, lid, () => {
    // the logo: a red disc with a slice, METROPIZZA round it
    ctx.save();
    ctx.translate(x + 4, y - 6);
    ctx.scale(1, 0.32);
    flat(ctx, ellPath(0, 0, 44, 44), '#d8322e', 3, INK, 0);
    flat(ctx, polyPath([[-16, -18], [16, -18], [0, 22]]), '#ffd23a', 2.4, INK, 0);
    ctx.restore();
    dots(ctx, { x: x - 96, y: y - 26, w: 200, h: 40 }, linTone(x - 40, 0, x + 104, 0, 0, 0.35), '#8a5a3a', { step: 4, angle: 0.79 });
  });
  // the Daily Slice, folded, at the back right: COMIC headline
  const p = MP.table.paper;
  const sheetP = polyPath([[p.x - 100, p.y - 18], [p.x + 70, p.y - 30], [p.x + 110, p.y + 14], [p.x - 66, p.y + 28]]);
  groundShadow(ctx, p.x + 14, p.y + 24, 118, 12, 0.6, '#3a0818', 1.3);
  flat(ctx, sheetP, '#f4ecd8', 2.4, INK, 0.5);
  within(ctx, sheetP, () => {
    ctx.save();
    ctx.translate(p.x - 74, p.y - 4);
    ctx.transform(1, -0.07, 0.62, 0.5, 0, 0);
    ctx.fillStyle = '#1c1024';
    ctx.font = `26px ${BLOCK}`;
    ctx.fillText('DAILY SLICE', 0, -10);
    ctx.fillStyle = '#d8322e';
    ctx.font = `17px ${BLOCK}`;
    ctx.fillText('FEET OVER METROPIZZA!', 0, 16);
    ctx.fillStyle = rgba('#2a2030', 0.5);
    for (let k = 0; k < 4; k++) ctx.fillRect(0, 30 + k * 9, 120 + (k % 2) * 40, 3);
    ctx.fillStyle = '#5a5060';
    ctx.fillRect(150, 26, 54, 40);
    ctx.restore();
    dots(ctx, { x: p.x - 100, y: p.y - 30, w: 210, h: 60 }, linTone(p.x - 20, 0, p.x + 110, 0, 0, 0.4), '#6a5a4a', { step: 4, angle: 0.79 });
  });
  void r;
}

// ——— the night lights (live only, lifted over the dusk: lit windows, occluded by everything nearer) ———

const LIGHTS_BOX = { x: 0, y: 140, w: W, h: MP.coping - 140 };

function cityLights(ctx: Ctx): void {
  const r = rng(991);
  const lit = (x: number, y: number, w: number, h: number, col: string, a: number) => {
    ctx.fillStyle = rgba(col, a);
    ctx.fillRect(x, y, w, h);
  };
  // the far rows: each window lit or not (seeded), the back row dimmer
  for (const row of [1, 0]) {
    for (const b of ROWS[row]) for (const [x, y, w, h, v] of windowsOf(b)) if (v > 0.55) lit(x, y, w, h, v > 0.9 ? '#ffffff' : v > 0.75 ? '#ffe9a0' : '#ffc870', row ? 0.55 : 0.8);
    if (row === 1) {
      // the front row hides the back row's windows
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      for (const b of ROWS[0]) {
        bldgPath(b)(ctx);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  // the nearer things hide the far windows
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  ctx.fillRect(TOWER.shaft[0] - 22, TOWER.set2[2], TOWER.shaft[1] - TOWER.shaft[0] + 24, MP.horizon);
  ctx.fillRect(-10, MP.tenement.top - 20, MP.tenement.x1 + 40, MP.horizon);
  ctx.fillRect(SIGN.x0 - 60, SIGN.y0 - 50, SIGN.x1 - SIGN.x0 + 120, MP.horizon);
  ctx.fillRect(MP.office.x0 - 16, MP.office.top - 24, W, MP.horizon);
  ctx.fillRect(MP.tall.x0 - 14, MP.tall.top - 60, W, MP.horizon);
  ctx.restore();
  // the tower's windows: its window columns lit in runs
  const [sx0, sx1, st] = TOWER.shaft;
  for (const [x0, x1, top, bottom, n] of [[sx0, sx1, st, MP.coping, 8], [TOWER.set1[0], TOWER.set1[1], TOWER.set1[2], st, 6], [TOWER.set2[0], TOWER.set2[1], TOWER.set2[2], TOWER.set1[2], 4]] as const) {
    const pw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) for (let y = top + 12; y < bottom - 6; y += 16) if (r() < 0.45) lit(x0 + i * pw + pw * 0.3, y, pw * 0.42, 10, '#ffe4a0', 0.85);
  }
  // the tenement, the office, the tall building
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 4; col++) {
      const wx = 22 + col * 78;
      const wy = MP.tenement.top + 46 + row * 74;
      if (wy > MP.coping - 20 || r() < 0.45) continue;
      lit(wx, wy, 40, 56, r() < 0.3 ? '#ffd890' : '#ffb860', 0.9);
      // a figure at the window now and then
      if (r() < 0.3) lit(wx + 22, wy + 18, 12, 38, '#2a1430', 0.8);
      // the sash bars and the lintel's shadow over the light
      lit(wx, wy + 27, 40, 3, '#3a2030', 0.9);
      lit(wx + 19, wy, 2.5, 56, '#3a2030', 0.9);
      lit(wx, wy, 40, 5, '#2a1020', 0.6);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.strokeRect(wx, wy, 40, 56);
    }
  for (let y = MP.office.top + 40; y < MP.coping; y += 34) {
    if (r() > 0.7) continue;
    const x0 = MP.office.x0 + 10 + Math.floor(r() * 4) * 28;
    lit(x0, y, Math.min(MP.office.x1 - 10 - x0, 56 + Math.floor(r() * 3) * 28), 16, '#e8f4ff', 0.85);
  }
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 4; col++) {
      if (r() > 0.45) continue;
      const wx = MP.tall.x0 + 26 + col * 52;
      const wy = MP.tall.top + 40 + row * 44;
      lit(wx, wy, 26, 32, '#ffd080', 0.9);
      lit(wx + 12, wy, 2, 32, '#3a2030', 0.8);
      ctx.strokeStyle = rgba(INK, 0.8);
      ctx.lineWidth = 1.4;
      ctx.strokeRect(wx, wy, 26, 32);
    }
  fireEscape(ctx, MP.tall.x0 + 18, MP.tall.x1 - 34, MP.tall.top + 70, MP.coping + 2);
  // the neighbour's windows under the billboard
  for (let x = SIGN.x0 - 30; x < SIGN.x1 + 40; x += 70) {
    if (r() > 0.6) continue;
    lit(x, SIGN.roof + 22, 34, 40, '#ffc870', 0.85);
    lit(x + 16, SIGN.roof + 22, 2, 40, '#3a2030', 0.8);
  }
  // our roof's things stand in front of it all (the drum's whole swing, the pedestal, the chimney, the vent, the tank)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(LAMP.x, LAMP.y, 86, 0, P2);
  ctx.fill();
  ctx.fillRect(LAMP.x - 66, LAMP.y - 12, 132, MP.horizon);
  ctx.fillRect(CH.x - CH.w / 2 - 8, CH.top - 12, CH.w + 16, MP.horizon);
  ctx.fillRect(VENT.x - VENT.rx - 4, VENT.headY - VENT.ry - 4, VENT.rx * 2 + 8, MP.horizon);
  ctx.restore();
}

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0, '#ffe0c0', 0.04, { warm: '#ffc27a', cool: '#6a5ac8', a: 0.16 });
}

function shadeOver(ctx: Ctx): void {
  // the HUD's corner calm, the lanes calm, a light vignette (the print stays bright)
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(20,10,36,0.36)');
  g.addColorStop(1, 'rgba(20,10,36,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
  calmLanes(ctx, 0.1, '#2a1a40', 150, 600);
  vignetteAll(ctx, 0.4, '#140a24');
}

// ——— the stack ———

export const METRO: SceneSpec = {
  id: 'metropizza',
  info: {
    name: 'Metropizza Rooftops',
    subtitle: 'Waves 61–64',
    ambient: [],
    glows: [],
    light: '#ffd0a8',
    tableTint: '#fff0e0',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: MP.horizon }, draw: sky },
    { id: 'dusk', box: SKY_BOX, liveOnly: true, res: 0.4, draw: duskSky },
    { id: 'night', box: SKY_BOX, liveOnly: true, res: 0.45, draw: nightSky },
    { id: 'storm', box: SKY_BOX, liveOnly: true, res: 0.4, draw: stormSky },
    { id: 'clouds', box: CLOUD_BOX, motion: 'sprite', res: 0.5, draw: clouds },
    // the blimp, the far searchlights, the bolts and the rain sheets: behind the city
    { id: 'skyLive', box: SKY_BOX, motion: 'slot', draw: () => {} },
    { id: 'far', box: FAR_BOX, draw: farCity },
    { id: 'tower', box: TOWER_BOX, draw: tower },
    { id: 'globeStill', box: { x: MP.globe.x - GLOBE_F.w / 2, y: MP.globe.y - GLOBE_F.h / 2, w: GLOBE_F.w, h: GLOBE_F.h }, stillOnly: true, draw: globeStill },
    { id: 'midL', box: MIDL_BOX, draw: tenement },
    { id: 'billboard', box: SIGN_BOX, draw: billboard },
    { id: 'midR', box: MIDR_BOX, draw: midRight },
    { id: 'parapet', box: PARAPET_BOX, draw: parapet },
    { id: 'vent', box: VENT_BOX, draw: ventBase },
    { id: 'ventStill', box: VENT_BOX, stillOnly: true, draw: ventStill },
    { id: 'chimney', box: CHIMNEY_BOX, draw: chimney },
    { id: 'pedestal', box: PED_BOX, draw: lampPedestal },
    { id: 'lampHead', box: LAMP_BOX, motion: 'sprite', draw: (c) => lampHead(c, LAMP_REST, 0) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'tableProps', box: { x: 0, y: TY + 10, w: W, h: 120 }, draw: tableProps },
    { id: 'cityLights', box: LIGHTS_BOX, liveOnly: true, res: 0.5, draw: (c) => cityLights(c) },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: textures and frame painters ———

const NB = { x: SIGN.x0 - 24, y: SIGN.y0 - 14, w: SIGN.x1 - SIGN.x0 + 48, h: SIGN.y1 - SIGN.y0 + 28 };
const NEON_K = 0.5;
const GLOBE_K = 0.75;
const GLOBE_N = 16;
const VENT_F = { w: 84, h: 76 };
const VENT_N = 8;
const BOLT_F = { w: 280, h: 560 };
const BOLT_K = 0.5;
const BOLT_N = 4;
const STEAM_F = { w: 130, h: 240 };

/** One frame of the chimney's steam as comic puffs: each born small at the pot, swelling, drifting off with the wind
 * and thinning out as it climbs; inked, lit on the left, its shade in dots (phase 0…1 loops). */
function puffFrame(c: Ctx, w: number, h: number, ph: number): void {
  const n = 6;
  const pal = { body: '#f4eef4', lit: '#ffffff', shade: '#b8a8c8', ink: '#5a4a70', dot: '#5a4a7a' };
  for (let i = n - 1; i >= 0; i--) {
    const u = (i + ph) / n;
    const rad = 7 + u * 24;
    const cx = 26 + u * (w - 70) + Math.sin(u * 5 + 1) * 4;
    const cy = h - 10 - u * (h - 50);
    const a = smooth(0, 0.1, u) * (1 - smooth(0.55, 1, u));
    if (a <= 0.01) continue;
    comicCloud(c, rng(17), cx, cy + rad * 0.5, rad * 2.3, rad, pal, a);
  }
}

/** The searchlight's beam: a long cone, hot at the lens, with dust printed in it as dots (along +x from (0, h/2)). */
function beamTex(c: Ctx, w: number, h: number, spread: number): void {
  const cone = (k: number) => {
    c.beginPath();
    c.moveTo(0, h / 2 - 5 * k);
    c.lineTo(w, h / 2 - spread * k);
    c.lineTo(w, h / 2 + spread * k);
    c.lineTo(0, h / 2 + 5 * k);
    c.closePath();
  };
  for (const [k, a] of [[1, 0.22], [0.7, 0.26], [0.4, 0.34]] as const) {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, `rgba(255,250,224,${Math.min(1, a * 2.2)})`);
    g.addColorStop(0.25, `rgba(255,246,214,${a})`);
    g.addColorStop(1, `rgba(255,240,200,${a * 0.35})`);
    c.fillStyle = g;
    cone(k);
    c.fill();
  }
  c.save();
  cone(0.9);
  c.clip();
  dots(c, { x: 0, y: 0, w, h }, (x, y) => (0.35 - Math.abs(y - h / 2) / (spread * 2.4)) * (1 - x / w) * 1.2, '#ffffff', { step: 7, angle: 0.26, a: 0.35 });
  c.restore();
}

/** The pizza signal: a disc of light on the cloud base with the slice silhouetted in it. */
function signalTex(c: Ctx, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const g = c.createRadialGradient(cx, cy, 4, cx, cy, w / 2);
  g.addColorStop(0, 'rgba(255,250,220,0.95)');
  g.addColorStop(0.72, 'rgba(255,240,190,0.85)');
  g.addColorStop(0.86, 'rgba(255,248,220,1)');
  g.addColorStop(0.92, 'rgba(255,230,170,0.4)');
  g.addColorStop(1, 'rgba(255,230,170,0)');
  c.save();
  c.scale(1, h / w);
  c.fillStyle = g;
  c.beginPath();
  c.arc(cx, cx, w / 2, 0, P2);
  c.fill();
  c.restore();
  // the slice, cut out: crust band on top, the point down, pepperoni holes letting the light through
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = '#000';
  const sw = w * 0.26;
  const sh = h * 0.62;
  c.beginPath();
  c.moveTo(cx - sw, cy - sh * 0.48);
  c.quadraticCurveTo(cx, cy - sh * 0.62, cx + sw, cy - sh * 0.48);
  c.lineTo(cx + sw * 0.9, cy - sh * 0.3);
  c.lineTo(cx, cy + sh * 0.52);
  c.lineTo(cx - sw * 0.9, cy - sh * 0.3);
  c.closePath();
  c.fill();
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(255,240,200,0.75)';
  for (const [px, py, pr] of [[-0.3, -0.12, 0.13], [0.22, -0.02, 0.11], [-0.02, 0.2, 0.09]] as const) {
    c.beginPath();
    c.ellipse(cx + px * sw * 1.6, cy + py * sh, pr * sw * 1.6, pr * sh * 0.9, 0, 0, P2);
    c.fill();
  }
  c.fillStyle = 'rgba(255,240,200,0.55)';
  c.fillRect(cx - sw * 0.9, cy - sh * 0.36, sw * 1.8, sh * 0.05);
}

/** The Metropizza blimp, nose to the right: a silver envelope lit from the top left, its shade in dots, the name in
 * red, a gondola, fins and propellers. `lit` paints only its night lights (the name and the gondola's windows). */
function blimpTex(c: Ctx, lit: boolean): void {
  const cx = 160;
  const cy = 54;
  const env = ellPath(cx, cy, 140, 44);
  const name = () => {
    c.save();
    c.font = `30px ${BLOCK}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.translate(cx + 8, cy + 2);
    c.scale(1, 1.15);
    if (lit) {
      c.shadowColor = '#ff4a3a';
      c.shadowBlur = 10;
      c.fillStyle = '#ffb0a0';
    } else {
      c.strokeStyle = INK;
      c.lineWidth = 4;
      c.strokeText('METROPIZZA', 0, 0);
      c.fillStyle = '#d8322e';
    }
    c.fillText('METROPIZZA', 0, 0);
    c.restore();
  };
  if (lit) {
    name();
    c.fillStyle = '#fff2b0';
    for (let i = 0; i < 4; i++) c.fillRect(cx - 10 + i * 9, cy + 50, 5, 7);
    return;
  }
  // fins
  for (const d of [-1, 1]) flat(c, polyPath([[40, cy + d * 4], [10, cy + d * 42], [2, cy + d * 34], [26, cy]]), '#b8bcc8', 2.4, INK, 0);
  const g = c.createLinearGradient(0, cy - 44, 0, cy + 44);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, '#c8ccd8');
  g.addColorStop(1, '#6a6e80');
  flat(c, env, g, 0, INK);
  within(c, env, () => {
    c.strokeStyle = 'rgba(60,60,80,0.35)';
    c.lineWidth = 1.2;
    for (let i = 1; i <= 3; i++) {
      c.beginPath();
      c.ellipse(cx, cy, 140, i * 14, 0, 0, P2);
      c.stroke();
    }
    dots(c, { x: cx - 140, y: cy - 44, w: 280, h: 88 }, linTone(cx - 40, cy - 30, cx + 60, cy + 44, 0, 0.8), '#2a2a44', { step: 5, angle: 0.79, a: 0.6 });
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.beginPath();
    c.ellipse(cx - 30, cy - 26, 70, 8, -0.05, 0, P2);
    c.fill();
  });
  ink(c, env, 3, INK, 0.5);
  name();
  // the gondola and its windows, propellers as blurred discs
  flat(c, rrPath(cx - 26, cy + 42, 60, 22, 8), '#8a8ea0', 2.4, INK);
  c.fillStyle = '#2a2a44';
  for (let i = 0; i < 4; i++) c.fillRect(cx - 10 + i * 9, cy + 50, 5, 7);
  for (const px of [cx - 34, cx + 40]) {
    c.fillStyle = 'rgba(200,200,220,0.35)';
    c.beginPath();
    c.ellipse(px, cy + 52, 3, 14, 0, 0, P2);
    c.fill();
  }
}

/** One comic bolt per frame, from the top centre to the bottom: a yellow ribbon with a white core, inked. */
function boltFrame(c: Ctx, i: number): void {
  const r = rng(880 + i * 31);
  const { w, h } = BOLT_F;
  const x0 = w / 2 + (r() - 0.5) * 60;
  const x1 = w / 2 + (r() - 0.5) * 160;
  const strokes = boltPath(r, x0, 6, x1, h - 6, 10, 0.3);
  c.save();
  c.shadowColor = 'rgba(200,230,255,0.9)';
  c.shadowBlur = 26;
  bolt(c, strokes, 9, '#fff6a0', '#ffffff', '#2a3060');
  c.restore();
  bolt(c, strokes, 9, '#fff6a0', '#ffffff', INK);
}

// ——— live ———

registerKitScene(METRO, (k, wave0) => {
  const fx = k.slot('fx');
  const skyL = k.slot('skyLive');
  const B = Phaser.BlendModes;
  let target = waveK(wave0);
  let shown = target;
  const C = Phaser.Display.Color;
  const tint = (a: number, b: number, t: number) => {
    const c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.round(Phaser.Math.Clamp(t, 0, 1) * 100));
    return C.GetColor(c.r, c.g, c.b);
  };

  // ——— skies and the light: dusk, night and the storm over the golden hour
  const dusk = k.sprite('dusk');
  const night = k.sprite('night');
  const storm = k.sprite('storm');
  const cl = k.sprite('clouds');
  const duskW = k.wash(0xe090b8, 0, B.MULTIPLY, fx);
  const nightW = k.wash(0x5a66c0, 0, B.MULTIPLY, fx);
  const stormW = k.wash(0x56607a, 0, B.MULTIPLY, fx);
  const flash = k.wash(0xc8dcff, 0, B.ADD, fx);
  // the lit windows go over the dimming (the layer paints them already hidden behind everything nearer)
  const lights = k.sprite('cityLights');
  fx.add(lights);

  // ——— the far searchlights, the blimp, the bolts and the rain sheets (behind the city)
  const beamFarKey = k.tex('mp_beamFar', 512, 96, (c) => beamTex(c, 512, 96, 40));
  const farBeams = ([[640, 0.34, 0], [1010, 0.27, 2.4]] as const).map(([x, sp, ph]) => ({
    img: k.img(beamFarKey, x, MP.horizon - 40, { into: skyL, add: true, origin: [0, 0.5], sx: 1.25, sy: 1.1, alpha: 0 }),
    sp,
    ph,
  }));
  const blimpKey = k.tex('mp_blimp', 320, 120, (c) => blimpTex(c, false));
  const blimpLitKey = k.tex('mp_blimpLit', 320, 120, (c) => blimpTex(c, true));
  const blimp = k.img(blimpKey, -200, 96, { into: skyL, scale: 0.56 });
  const blimpLit = k.img(blimpLitKey, -200, 96, { into: skyL, scale: 0.56, add: true, alpha: 0 });
  let blimpX = 300 + crand() * 900;
  const boltKey = sheet(k, 'mp_bolt', BOLT_F.w * BOLT_K, BOLT_F.h * BOLT_K, BOLT_N, (c, _p, i) => {
    c.scale(BOLT_K, BOLT_K);
    boltFrame(c, i);
  });
  const boltImg = k.img(boltKey, 0, 0, { into: skyL, origin: [0.5, 0], scale: 1 / BOLT_K, alpha: 0 });
  const boltGlow = k.glow(0, 0, 420, 0xc8dcff, 0, { into: skyL, sy: 0.6 });
  let boltT = -1;
  let nextBolt = 2 + crand() * 3;
  const rainKey = k.tex('mp_rain', 128, 256, (c) => {
    const r = rng(77);
    c.strokeStyle = 'rgba(220,232,255,0.7)';
    c.lineWidth = 1.4;
    for (let i = 0; i < 40; i++) {
      const x = r() * 128;
      const y = r() * 256;
      const l = 18 + r() * 30;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - l * 0.25, y + l);
      c.stroke();
    }
  });
  const rainFar = k.sc.add.tileSprite(W / 2, MP.skyEnd / 2, W, MP.skyEnd, rainKey).setAlpha(0);
  skyL.add(rainFar);

  // ——— the tower: the pizza globe turning, its floodlights and the needle's light
  const G = MP.globe;
  const globeKey = sheet(k, 'mp_globe', GLOBE_F.w * GLOBE_K, GLOBE_F.h * GLOBE_K, GLOBE_N, (c, ph) => {
    c.scale(GLOBE_K, GLOBE_K);
    globe(c, GLOBE_F.w / 2, GLOBE_F.h / 2, G.r, ph);
  });
  const globeGlow = k.glow(G.x, G.y + 6, 120, 0xffc060, 0, { into: fx });
  const globeLoop = new Loop(k, globeKey, GLOBE_N, G.x, G.y, { into: fx, scale: 1 / GLOBE_K, fps: 4 });
  const flood = [-30, 30].map((dx) => k.glow(TX + dx, TOWER.crown.y + 4, 70, 0xffd890, 0, { into: fx, sy: 1.6 }));
  const needle = k.glow(TX, MP.needle.top + 2, 18, 0xff3030, 0, { into: fx });

  // ——— the billboard: each letter's neon, the marquee, the goosenecks, sparks off the dud Z
  const neonKey = sheet(k, 'mp_neon', NB.w * NEON_K, NB.h * NEON_K, 12, (c, _p, i) => {
    c.scale(NEON_K, NEON_K);
    c.translate(-NB.x, -NB.y);
    neonTubes(c, letterXs(c), 'lit', i);
  });
  const signGlow = k.glow((SIGN.x0 + SIGN.x1) / 2 + 40, TEXT.base - 26, 300, 0xff3a4a, 0, { into: fx, sy: 0.42 });
  const neon = Array.from({ length: 12 }, (_, i) => ({
    img: k.img(neonKey, NB.x, NB.y, { into: fx, origin: [0, 0], scale: 1 / NEON_K, add: true, alpha: 0 }).setFrame(i),
    lv: 0,
    dud: i === 8,
    out: 0,
  }));
  // the sign's red spilling across the wall and the coping below it
  const spill = k.glow((SIGN.x0 + SIGN.x1) / 2, MP.face + 40, 520, 0xff3a4a, 0, { into: fx, sy: 0.22 });
  const bulbGlows = bulbs().map(([x, y]) => k.glow(x, y, 9, 0xfff0b0, 0, { into: fx }));
  const gooseGlows = LAMPS.map((x) => k.glow(x + 30, SIGN.y0 + 24, 70, 0xfff0c8, 0, { into: fx, sy: 1.1 }));
  let signOn = shown > 0.18;
  let chaseT = signOn ? 99 : -1;
  let dudNext = 2 + crand() * 4;
  let dudT = -1;
  const sparks = new Parts(k, { frame: 'spark', add: true, into: fx, max: 80 });
  const lx = letterXs(makeCanvas(4, 4)[1]);
  const spray = (n: number, x: number, y: number) => {
    for (let i = 0; i < n; i++)
      sparks.spawn({ x: x + (crand() - 0.5) * 20, y, vx: (crand() - 0.5) * 260, vy: -80 - crand() * 200, life: 0.8 + crand() * 0.7, r0: 2.6, r1: 1.2, a: 1, tint: crand() < 0.5 ? 0xffe0a0 : 0xffffff, grav: 900, drag: 0.4, floor: SIGN.y1 + 6 + crand() * (SIGN.roof - SIGN.y1 - 10), bounce: 0.35, streak: 0.02, fade: 0.02 });
  };

  // ——— our searchlight: the drum on its spring, the beam, the pizza signal on the clouds
  const head = k.pivot(k.sprite('lampHead'), LAMP.x, LAMP.y);
  const aimSp = new Spring(0, 7, 1.4);
  const beamKey = k.tex('mp_beam', 512, 160, (c) => beamTex(c, 512, 160, 74));
  const beam = k.img(beamKey, LAMP.x, LAMP.y, { into: fx, add: true, origin: [0, 0.5], alpha: 0 });
  const sigKey = k.tex('mp_signal', 256, 160, (c) => signalTex(c, 256, 160));
  const signal = k.img(sigKey, MP.signal.x, MP.signal.y, { into: fx, add: true, alpha: 0 });
  const sigHalo = k.glow(MP.signal.x, MP.signal.y, 200, 0xfff0c0, 0, { into: fx, sy: 0.6 });
  const lens = k.glow(LAMP.x, LAMP.y, 60, 0xfff6d8, 0, { into: fx });

  // ——— the turbine vent and the chimney's steam
  const ventKey = sheet(k, 'mp_vent', VENT_F.w, VENT_F.h, VENT_N, (c, ph) => ventHead(c, VENT_F.w / 2, VENT_F.h / 2 + 2, ph));
  const vent = new Loop(k, ventKey, VENT_N, VENT.x, VENT.headY - 2, { into: fx, fps: 0 });
  let ventPh = 0;
  const ventSp = new Spring(0, 2, 0.9);
  const steamKey = sheet(k, 'mp_steam', STEAM_F.w / 2, STEAM_F.h / 2, 12, (c, ph) => {
    c.scale(0.5, 0.5);
    puffFrame(c, STEAM_F.w, STEAM_F.h, ph);
  });
  const steam = [CH.x - 22, CH.x + 20].map((x, i) => new Loop(k, steamKey, 12, x + 24, CH.top - 40, { into: fx, origin: [0.2, 1], scale: 2 * (0.8 + i * 0.12), fps: 3 + i * 0.6, phase: i * 5 }));

  // ——— rain splashes and grit
  const splash = new Parts(k, { frame: 'drop', into: fx, max: 90 });
  const splashRate = new Rate();
  const grit = new Parts(k, { frame: 'mote', into: fx, max: 80 });

  const applyWave = (w: number) => {
    const e = smooth(0, 0.36, w);
    const n = smooth(0.36, 0.7, w);
    const st = smooth(0.7, 1, w);
    dusk.setAlpha(e);
    night.setAlpha(n);
    storm.setAlpha(st);
    duskW.setAlpha(0.32 * e * (1 - n));
    nightW.setAlpha(0.56 * n * (1 - st));
    stormW.setAlpha(0.64 * st);
    lights.setAlpha(smooth(0.25, 0.6, w) * (1 - 0.2 * st));
    cl.setTint(st > 0 ? tint(0x8a90b0, 0x3a4258, st) : n > 0 ? tint(0xffb0c8, 0x8a90c0, n) : tint(0xffffff, 0xffb0c8, e)).setAlpha(1 - 0.5 * st);
    rainFar.setAlpha(0.5 * st);
    return { e, n, st };
  };
  let wv = applyWave(shown);

  return {
    setWave(w) {
      target = waveK(w);
    },
    impact(x, _y, p) {
      // the searchlight's drum jolts on its yoke; the vent's spun; the sign stutters and the Z spits sparks
      aimSp.v += (x < LAMP.x ? -1 : 1) * (0.4 + p * 0.9);
      ventSp.v += 4 + p * 8;
      for (const l of neon) l.out = Math.max(l.out, 0.08 + crand() * 0.12 * p);
      if (signOn) {
        neon[8].out = 1.2 + p;
        spray(Math.round(8 + p * 18), lx[8], TEXT.base - 30);
      }
      // grit shaken off the coping's lip, down the parapet
      const n = Math.round(6 + p * 18);
      for (let i = 0; i < n; i++) {
        const gx = Phaser.Math.Clamp(x + (crand() - 0.5) * 700, 10, W - 10);
        grit.spawn({ x: gx, y: MP.face - 2, vx: (crand() - 0.5) * 30, vy: 20 + crand() * 40, life: 1.2 + crand(), r0: 1.4 + crand() * 1.6, a: 0.85, tint: 0xd8c0a0, grav: 600, floor: TY - 4 });
      }
      // in the rain, a burst of splashes on the coping
      if (wv.st > 0.3) for (let i = 0; i < 10 * p; i++) splash.spawn({ x: x + (crand() - 0.5) * 600, y: MP.coping, vx: (crand() - 0.5) * 120, vy: -120 - crand() * 140, life: 0.5, r0: 2.4, a: 0.7 * wv.st, tint: 0xd8e4ff, grav: 900, streak: 0.015 });
    },
    update(dt, t) {
      shown += (target - shown) * Math.min(1, dt * 0.6);
      wv = applyWave(shown);
      const { n, st } = wv;
      const cm = calm();
      const nightK = smooth(0.3, 0.6, shown);
      cl.x = Math.sin(t * 0.02 + 1) * 80 * cm;
      // ——— the blimp: crossing slowly, gone in the storm
      blimpX += dt * 22 * cm;
      if (blimpX > W + 220) blimpX = -220;
      const by = 92 + Math.sin(t * 0.5) * 5;
      blimp.setPosition(blimpX, by).setRotation(Math.sin(t * 0.5 + 1) * 0.02).setAlpha(1 - st).setTint(tint(0xffffff, 0x8a90c8, Math.max(n, wv.e * 0.4)));
      blimpLit.setPosition(blimpX, by).setRotation(blimp.rotation).setAlpha(nightK * (1 - st) * (0.85 + Math.sin(t * 3) * 0.1));
      // ——— the far searchlights
      for (const b of farBeams) {
        b.img.rotation = -Math.PI / 2 + Math.sin(t * b.sp + b.ph) * 0.5 + (b.ph ? 0.35 : -0.35);
        b.img.setAlpha(smooth(0.2, 0.55, shown) * (0.36 - 0.18 * st));
      }
      // ——— bolts in the storm (the act's layer flashes the screen and plays the thunder when it hears one)
      if (st > 0.5) {
        nextBolt -= dt;
        if (nextBolt <= 0) {
          nextBolt = 4 + crand() * 6;
          const bx = 160 + crand() * 1600;
          boltImg.setFrame(Math.floor(crand() * BOLT_N)).setPosition(bx, 20).setFlipX(crand() < 0.5);
          boltGlow.setPosition(bx, 90);
          boltT = 0;
          k.sc.events.emit('metropizza:bolt', crand() < 0.4);
        }
      }
      if (boltT >= 0) {
        boltT += dt;
        const seq = [1, 0.25, 1, 0.7, 0.5, 0.3, 0];
        const i = Math.min(seq.length - 1, Math.floor(boltT / 0.06));
        const v = seq[i];
        boltImg.setAlpha(v);
        boltGlow.setAlpha(v * 0.8);
        flash.setAlpha(v * 0.18 * cm);
        if (i >= seq.length - 1) boltT = -1;
      }
      rainFar.tilePositionY -= dt * 900;
      rainFar.tilePositionX += dt * 220;
      splashRate.tick(40 * st * cm, dt, () =>
        splash.spawn({ x: crand() * W, y: MP.coping + crand() * 6, vx: (crand() - 0.5) * 60, vy: -60 - crand() * 80, life: 0.35, r0: 1.8, a: 0.6 * st, tint: 0xd8e4ff, grav: 900, streak: 0.012 }),
      );
      splash.update(dt);
      grit.update(dt);
      // ——— the globe turns; floodlit at night; the needle blinks
      globeLoop.step(dt, cm);
      globeLoop.each((im) => im.setTint(tint(0xffffff, 0xb8b8e0, Math.max(n * 0.5, st * 0.7))));
      globeGlow.setAlpha(nightK * 0.45 * (0.9 + Math.sin(t * 1.3) * 0.08));
      for (const f of flood) f.setAlpha(nightK * 0.35);
      needle.setAlpha(Math.max(nightK, st) * (Math.sin(t * 3.4) > 0.55 ? 1 : 0.08));
      // ——— the neon: on at dusk, chasing on letter by letter; the dud Z stutters; stomps make it all blink
      const want = shown > 0.18;
      if (want && !signOn) {
        signOn = true;
        chaseT = 0;
      } else if (!want && signOn) signOn = false;
      if (chaseT >= 0) chaseT += dt;
      dudNext -= dt;
      if (signOn && dudNext <= 0) {
        dudNext = 3 + crand() * 5;
        dudT = 0;
        if (crand() < 0.6) spray(4 + Math.floor(crand() * 6), lx[8], TEXT.base - 30);
      }
      if (dudT >= 0) {
        dudT += dt;
        if (dudT > 0.9) dudT = -1;
      }
      let sum = 0;
      for (const [i, l] of neon.entries()) {
        // the chase: each lights in turn with a stutter as it strikes
        const at = i < 10 ? 0.15 + i * 0.14 : 1.7 + (i - 10) * 0.2;
        const since = chaseT - at;
        let on = signOn && since > 0 ? (since < 0.25 ? (Math.floor(since / 0.05) % 2 ? 0.3 : 1) : 1) : 0;
        if (l.dud && dudT >= 0) on *= [1, 0.1, 0.8, 0, 0, 0.6, 0.1, 1][Math.floor(dudT / 0.11) % 8];
        l.out = Math.max(0, l.out - dt);
        if (l.out > 0) on *= l.dud ? 0.05 : 0.25;
        l.lv += (on - l.lv) * Math.min(1, dt * 30);
        const buzz = 0.9 + Math.sin(t * 47 + i * 1.7) * 0.05 + Math.sin(t * 13 + i) * 0.05;
        l.img.setAlpha(l.lv * buzz * (1 - st * 0.15));
        sum += l.lv;
      }
      const signK = sum / neon.length;
      signGlow.setAlpha(signK * (0.32 + n * 0.1));
      spill.setAlpha(signK * (0.12 + 0.12 * n));
      const bulbOn = signOn ? smooth(1.6, 2.2, chaseT) : 0;
      for (const [i, b] of bulbGlows.entries()) b.setAlpha(bulbOn * ((Math.floor(t * 7) - i) % 3 === 0 ? 0.95 : 0.35));
      for (const gg of gooseGlows) gg.setAlpha(nightK * 0.28);
      sparks.update(dt);
      // ——— our searchlight: on from the third wave, its aim drifting, jolted by stomps
      const sig = smooth(0.45, 0.65, shown);
      const aim = LAMP_REST + (Math.sin(t * 0.21) * 0.05 + Math.sin(t * 0.53 + 2) * 0.02) * cm + aimSp.step(0, dt);
      head.rotation = aim - LAMP_REST;
      const ca = Math.cos(aim);
      const sa = Math.sin(aim);
      const lensX = LAMP.x + ca * 64;
      const lensY = LAMP.y + sa * 64;
      const len = Math.max(120, (lensY - MP.signal.y) / Math.max(0.2, -sa));
      beam.setPosition(lensX, lensY).setRotation(aim).setScale(len / 512, 1).setAlpha(sig * (0.55 + 0.1 * st) * (0.95 + Math.sin(t * 9) * 0.03));
      const sx = lensX + ca * len;
      const sy = lensY + sa * len;
      // the disc stretches the lower the beam strikes the cloud base
      const stretch = Phaser.Math.Clamp(1 / Math.max(0.35, -sa), 1, 1.8);
      signal.setPosition(sx, sy).setScale(0.62 * stretch, 0.62).setAlpha(sig * (0.5 + 0.2 * st));
      sigHalo.setPosition(sx, sy).setAlpha(sig * 0.25);
      lens.setPosition(lensX, lensY).setAlpha(sig * 0.9);
      // ——— the vent: the wind turns it, faster in the storm; a stomp spins it up
      const spin = (0.9 + 2.6 * st + Math.max(0, ventSp.step(0, dt))) * cm;
      ventPh = (ventPh + dt * spin * 3) % VENT_N;
      vent.show(ventPh);
      vent.each((im) => im.setTint(tint(0xffffff, 0x8a90c0, Math.max(n * 0.6, st * 0.8))));
      // ——— steam off the chimney, leaning harder in the storm
      for (const s of steam) {
        s.step(dt, 1 + st);
        s.alpha = 0.95 - 0.2 * st;
        s.each((im) => im.setTint(tint(0xffffff, n > 0 ? 0x9a98c8 : 0xffc8b0, Math.max(n, wv.e * 0.6))).setRotation((st * 0.25 + wander(t * 0.3, 3) * 0.04) * cm));
      }
    },
  };
});
