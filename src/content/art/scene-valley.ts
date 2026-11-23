// Lost Valley (T-Rex Toes' arena, the end of the Diner stage), redrawn with the location kit (src/art/scene): a
// primeval valley at night under an erupting volcano. The Diner's storm carries on here: a dark storm sky, its cloud
// banks lit from below by the eruption, far lightning over the ridges on the right. Left of centre the volcano: a
// stratovolcano of dark basalt furrowed by gullies, a parasitic shoulder on its right flank, lava flows glowing
// down it under a skin of crust, the crater's lip incandescent. Its ash column climbs out of the crater lit orange
// from beneath and spreads into a canopy drifting right over the sky. Jungle hills in silhouette step down in front
// of it (tree ferns and cycads against the glow), a lava river leaves the cone's foot and runs across the valley
// floor towards us; on the near bank tree ferns frame the scene, a cycad, and the arching ribs of something very
// big that died here long ago. The table is a slab of columnar basalt: hexagonal column tops worn smooth, ash in
// the joints, its front the columns' faces (the Diner's ribbed counter edge, in stone).
//
// Live, the heroes:
// - the eruption: the ash column painted as a billowing, rolling volume (a frame loop, two copies out of step), lit
//   from beneath by a lava fountain (painted jets and gobbets on their arcs) that surges now and then; lava bombs
//   thrown out on glowing trails that land on the flanks with a splash of sparks and a fading glow; volcanic
//   lightning crackling inside the column;
// - the river: molten rock flowing under drifting crust plates (scrolling painted tiles at three rates), smoke
//   wisps curling off it, embers rising;
// - the life: pterosaurs crossing the sky (a painted wing beat with flap-and-glide flight, banking as they climb
//   and sink), the tree-fern crowns nodding on springs.
// A stomp surges the fountain and throws bombs, shakes the fern crowns (leaflets fall), and a hard one sets off
// lightning in the column.

import Phaser from 'phaser';
import { ZB, xAt, yAt, zAt } from '../../art/backdrops';
import {
  type Air,
  type Ctx,
  type PathFn,
  type R,
  TY,
  W,
  airMix,
  calmLanes,
  castShadow,
  crevice,
  glowAt,
  gradeAll,
  groundShadow,
  haze,
  lightPool,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff, tableSeam } from '../../art/scene/materials';
import { drift, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { cloud, horizonGlow, skyFill } from '../../art/scene/sky';
import { mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Loop, Parts, Rate, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, wander } from '../../game/sceneLive';
import { Flow } from './liveBits';
import { boltFrame } from './scene-oldtown';
import { ridgePath, smokeFrame, wave1 } from './sceneBits';

// ——— layout ———

export const LV = {
  front: 1040,
  /** The crater's lip (centre) and its half width. */
  crater: { x: 620, y: 312, hw: 70 },
  /** Where the cone meets the valley floor. */
  coneFoot: 646,
  /** The lava river's course across the valley floor (centre line) and its width. */
  river: { x0: 790, y0: 650, x1: 1940, y1: 690, w: 28 },
  /** The near bank's back edge. */
  ledge: 704,
  /** Tree ferns: the trunk's foot and its top (where the crown springs). */
  ferns: [
    { id: 'fernL', foot: [168, 746], top: [190, 380], len: 290, n: 15, seed: 1 },
    { id: 'fernL2', foot: [372, 750], top: [352, 486], len: 190, n: 11, seed: 2 },
    { id: 'fernR', foot: [1812, 744], top: [1790, 410], len: 270, n: 15, seed: 3 },
  ] as const,
  cycad: { x: 1330, y: 742 },
  ribs: { x0: 1500, x1: 1712, y: 742 },
};

const CR = LV.crater;
const RV = LV.river;
const RIV_ANG = Math.atan2(RV.y1 - RV.y0, RV.x1 - RV.x0);
const RIV_LEN = Math.hypot(RV.x1 - RV.x0, RV.y1 - RV.y0);
/** The river's centre line at x. */
const riverY = (x: number) => RV.y0 + ((x - RV.x0) / (RV.x1 - RV.x0)) * (RV.y1 - RV.y0);

/** The storm's air over the far ridges: cool. */
const STORM: Air = { color: '#2a2440', far: 0.75 };

const P2 = Math.PI * 2;
const MOLTEN = { core: '#fff4c0', hot: '#ffc850', body: '#ff8a26', edge: '#c8380c', deep: '#5a1406' };

// ——— the volcano's shape ———

const SPREAD_L = 820;
const SPREAD_R = 700;

const coneTop = (x: number): number => {
  const d = x - CR.x;
  const ad = Math.abs(d);
  // the lip: a shallow notch; the shoulders round over into the flanks
  const e = 0.035;
  const t0 = Math.max(0, ad - CR.hw * 0.7) / (d < 0 ? SPREAD_L : SPREAD_R);
  const t = Math.min(1, Math.sqrt(t0 * t0 + e * e) - e);
  let y = CR.y + (LV.coneFoot - CR.y) * (1 - (1 - t) ** 2.6);
  // a parasitic shoulder on the right flank
  if (d > 0) y -= 30 * Math.exp(-(((t - 0.4) / 0.11) ** 2));
  return y + wave1(x * 2.2, 3) * 7 * t + wave1(x * 7, 9) * 1.4 * Math.min(1, t * 4);
};

/** The lava flows down the flanks (screen points, crater to toe) and how far down each is still molten (0…1). */
const meander = (pts: [number, number][], amp: number, seed: number): [number, number][] => {
  const out: [number, number][] = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const f = (i / n) * (pts.length - 1);
    const k = Math.min(pts.length - 2, Math.floor(f));
    const t = f - k;
    const x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t;
    const y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t;
    const dx = pts[k + 1][0] - pts[k][0];
    const dy = pts[k + 1][1] - pts[k][1];
    const l = Math.hypot(dx, dy) || 1;
    // it wanders more the further down it gets (the slope eases, the flow finds its way round things)
    const o = wave1(i * 41 + seed * 300, seed) * amp * (0.2 + (i / n) * 0.8);
    const px = x - (dy / l) * o;
    out.push([px, Math.max(y + (dx / l) * o, coneTop(px) + 10 + (i / n) * 14)]);
  }
  return out;
};
/** Flow courses drawn for a crater at (760, 262), moved onto the crater where it is now. */
const onCone = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [x - 760 + CR.x, CR.y + ((y - 262) * (LV.coneFoot - CR.y)) / (646 - 262)]);
const FLOWS: { pts: [number, number][]; w: number; hot: number }[] = [
  { pts: meander(onCone([[712, 270], [700, 318], [676, 376], [656, 432], [620, 492], [600, 548], [570, 604]]), 22, 1), w: 8, hot: 0.7 },
  { pts: meander(onCone([[800, 270], [816, 326], [846, 392], [858, 458], [880, 522], [894, 584], [910, 646]]), 18, 2), w: 11, hot: 1 },
  { pts: meander(onCone([[820, 270], [860, 312], [910, 368], [958, 424], [1000, 480], [1030, 520]]), 14, 3), w: 6, hot: 0.4 },
];

/** Sample a polyline at u (0…1 of its points, linear between them). */
function along(pts: [number, number][], u: number): [number, number] {
  const f = Math.max(0, Math.min(0.9999, u)) * (pts.length - 1);
  const i = Math.floor(f);
  const t = f - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
}

// ——— the sky ———

const SKY_H = 662;

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: SKY_H };
  // a storm night: near black overhead, bruised violet lower, burning to red and orange round the volcano
  skyFill(ctx, box, [[0, '#0b0915'], [0.22, '#141026'], [0.45, '#251730'], [0.66, '#43192c'], [0.84, '#7a2a28'], [1, '#b24a22']]);
  lay(ctx, drift('#4a2440', '#06060e', 3, 41, 160, 90), box, 0.35);
  // the eruption's light on the smoke-laden air: a broad bloom round the crater, stronger below it
  glowAt(ctx, CR.x, CR.y + 40, 820, '#ff5a1e', 0.26, 0.7);
  glowAt(ctx, CR.x + 60, CR.y - 60, 420, '#ff8a3a', 0.16, 0.9);
  horizonGlow(ctx, LV.coneFoot, 240, '#ff6a28', 0.28, 0, W);
  glowAt(ctx, CR.x + 100, LV.coneFoot - 40, 900, '#ff6a28', 0.12, 0.35);
  // storm banks over the right, their undersides catching the eruption, their tops lost in the dark
  for (const [x, y, w, h, a] of [[1560, 300, 900, 150, 0.95], [1200, 380, 760, 110, 0.8], [1760, 430, 520, 90, 0.85], [300, 420, 620, 90, 0.7], [80, 300, 460, 110, 0.8]] as const)
    cloud(ctx, r, x, y, w, h, { kind: 'bank', lit: '#d0603a', body: '#2a1a2c', shadow: '#0c0a16', sunX: CR.x, sunY: CR.y + 60, rim: 0.7, wisp: 0.6, a, depth: 0.5, air: STORM });
  // the ash canopy: the column's top spreading and drifting right, rolled and heavy, lit from beneath near the
  // crater and fading into the storm's dark downwind
  canopy(ctx, r);
}

/** The canopy's underside (screen y at x): lowest just downwind of the column, lifting and thinning away from it. */
const canopyBase = (x: number) => {
  const u = (x - (CR.x + 60)) / 1200;
  return 210 - Math.max(0, u) * 120 - Math.max(0, -u) * 600 + wave1(x * 3, 12) * 16;
};

/** The ash canopy: a heavy rolled mass spreading from the column's top and drifting right. Its underside is a row
 * of sagging lobes, each lit from below by the fire (hot near the column, dull red downwind); above them the body
 * darkens into the night. */
function canopy(ctx: Ctx, r: R): void {
  softly(ctx, { x: 560, y: 0, w: W - 560, h: 300 }, (g) => {
    // the body: dark, solid above the underside
    for (let x = 600; x < W + 60; x += 40) {
      const yb = canopyBase(x);
      const gr = g.createLinearGradient(0, 0, 0, yb);
      const thin = Math.max(0, (x - 1300) / 700) + Math.max(0, (820 - x) / 220);
      gr.addColorStop(0, rgba('#0e0a10', Math.max(0, 0.95 - thin * 0.6)));
      gr.addColorStop(0.7, rgba('#1a1418', Math.max(0, 0.95 - thin * 0.6)));
      gr.addColorStop(1, rgba('#1a1418', 0));
      g.fillStyle = gr;
      g.fillRect(x - 21, 0, 42, yb);
    }
    // billows over the body, then the lobes of the underside on top of everything
    const pts: [number, number, number, number][] = [];
    for (let i = 0; i < 70; i++) {
      const x = 620 + r() * 1320;
      const yb = canopyBase(x);
      const y = r() * (yb - 30);
      pts.push([x, y, 40 + r() * 50, 0.15]);
    }
    for (let x = 640; x < W + 40; x += 22 + r() * 26) {
      const yb = canopyBase(x);
      const heat = Math.max(0, 1 - Math.abs(x - (CR.x + 150)) / 650);
      pts.push([x, yb - 14 - r() * 40, 22 + r() * 34 + heat * 12, (0.12 + heat * 0.5) * (0.5 + r() * 0.6)]);
    }
    pts.sort((p, q) => p[1] - q[1]);
    for (const [x, y, R, heat] of pts) ashPuff(g, x, y, R, Math.max(0.35, 0.95 - Math.max(0, (x - 1300) / 1400)), heat, 0.55);
  }, 1);
  // the underside's glow over the crater
  glowAt(ctx, CR.x + 140, canopyBase(CR.x + 140) - 10, 380, '#ff6a2a', 0.22, 0.4);
}

// ——— the far ridges (right, in the storm) ———

function farRidges(ctx: Ctx, r: R): void {
  for (const [base, amp, seed, col, depth, x0] of [[520, 60, 4, '#2a2a3a', 0.85, 1120], [560, 70, 11, '#1e2030', 0.65, 1060]] as const) {
    const top = (x: number) => base - amp * (0.55 + wave1(x * 1.3, seed) * 0.7) + Math.max(0, x0 + 260 - x) * 0.25;
    const p = ridgePath(x0, W, SKY_H, top, 4);
    p(ctx);
    ctx.fillStyle = airMix(col, depth, STORM);
    ctx.fill();
    within(ctx, p, () => {
      // the jungle canopy on them: soft crowns, their tops just touched by the eruption's light
      lay(ctx, noiseMask(18, 70 + seed, { cover: 0.45, soft: 0.3, col: shade(col, -0.35), w: 360, h: 40 }), { x: x0, y: base - amp * 1.4, w: W - x0, h: 160 }, 0.6);
      for (let x = x0; x < W; x += 9 + r() * 8) {
        const y = top(x) + 2;
        ctx.fillStyle = rgba(airMix('#c86a4a', depth, STORM), 0.18 * (1 - (x - x0) / (W - x0)) + 0.04);
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 6 + r() * 6, 2, 0, 0, P2);
        ctx.fill();
      }
      vfill(ctx, x0, base - 20, W - x0, 100, [[0, rgba(STORM.color, 0)], [1, rgba(STORM.color, 0.6)]]);
    });
    // a few crowns standing proud of the line: tall ferns and conifers in silhouette
    for (let i = 0; i < 7; i++) {
      const x = x0 + 60 + r() * (W - x0 - 80);
      const y = top(x) + 4;
      treeSil(ctx, r, x, y, (20 + r() * 16) * (1 - depth * 0.3), airMix(col, depth, STORM));
    }
  }
}

/** A tree in silhouette on a far or middle skyline: a tree fern (a slender trunk, a crown of drooping fronds), a
 * cycad (squat, a stiff fan) or a monkey-puzzle conifer (a tall bare trunk, tiered clumps of branches at the top).
 * One flat colour, the fire's rim on the edge turned to it. */
function treeSil(ctx: Ctx, r: R, x: number, y: number, h: number, col: string, rimA = 0): void {
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  const kind = r();
  const lean = (r() - 0.5) * h * 0.15;
  const toCr = Math.sign(CR.x - x) || 1;
  const blade = (x0: number, y0: number, a: number, L: number, wd: number, droop: number) => {
    const ex = x0 + Math.cos(a) * L;
    const ey = y0 + Math.sin(a) * L + droop * L;
    const mx = x0 + Math.cos(a) * L * 0.55;
    const my = y0 + Math.sin(a) * L * 0.55 - L * 0.08;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx - Math.sin(a) * wd, my - wd, ex, ey);
    ctx.quadraticCurveTo(mx + Math.sin(a) * wd, my + wd * 0.6, x0, y0);
    ctx.fill();
  };
  if (kind < 0.34) {
    // tree fern
    const tx = x + lean;
    const ty = y - h;
    ctx.lineWidth = Math.max(1.2, h * 0.05);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - lean * 0.3, y - h * 0.5, tx, ty);
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + 0.25 + (i / 8) * (Math.PI - 0.5) + (r() - 0.5) * 0.25;
      blade(tx, ty, a, h * (0.45 + r() * 0.2), h * 0.05, 0.35 + Math.abs(Math.cos(a)) * 0.35);
    }
  } else if (kind < 0.67) {
    // monkey-puzzle: a bare trunk, clumps at the top
    const th = h * 1.3;
    ctx.lineWidth = Math.max(1, h * 0.035);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean * 0.5, y - th);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const yy = y - th + i * h * 0.12;
      const w = h * (0.16 + i * 0.07);
      ctx.beginPath();
      ctx.ellipse(x + lean * 0.5 * (1 - i * 0.15), yy, w, h * 0.06, 0, 0, P2);
      ctx.fill();
    }
  } else {
    // cycad: a short trunk, a stiff fan
    ctx.lineWidth = Math.max(1.5, h * 0.12);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - h * 0.35);
    ctx.stroke();
    for (let i = 0; i < 9; i++) blade(x, y - h * 0.35, -Math.PI + 0.3 + (i / 8) * (Math.PI - 0.6), h * 0.4, h * 0.035, 0.1);
  }
  if (rimA > 0) {
    // the fire catching the side turned to it
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(x + toCr * h * 0.6, 0, x - toCr * h * 0.1, 0);
    g.addColorStop(0, rgba('#ff8a4a', rimA));
    g.addColorStop(1, rgba('#ff8a4a', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - h, y - h * 1.6, h * 2, h * 1.6);
    ctx.restore();
  }
}

// ——— the volcano ———

const CONE_COL = '#150f13';
const CONE_X0 = -10;
const CONE_X1 = 1500;
const conePath = ridgePath(CONE_X0, CONE_X1, LV.coneFoot + 30, coneTop, 3);

function cone(ctx: Ctx, r: R): void {
  const box = { x: 0, y: CR.y - 6, w: CONE_X1, h: LV.coneFoot + 36 - CR.y };
  ctx.save();
  conePath(ctx);
  ctx.clip();
  // dark basalt and old ash, a little lighter where the air thickens towards its foot
  surface(ctx, r, box, CONE_COL, { vary: 0.55, cells: 5, mottle: 0.45, strokes: 0, grain: 0.16, grainKind: 'stone', seed: 83, warm: '#3a2226', cool: '#08060c' });
  // gullies: the rain and the old flows have cut it into ribs that fan out from the summit. Each gully is a dark
  // groove; the rib beside it, turned to the glow above, catches the light on its left
  {
    const g = ctx;
    for (let i = 0; i < 110; i++) {
      const side = i % 2 ? 1 : -1;
      const sx = CR.x + side * (CR.hw * (0.3 + r() * 1.2) + r() ** 2 * 380);
      const ang = side * (0.2 + r() * 1.15);
      const len = 60 + r() * 260;
      const ex = sx + Math.sin(ang) * len * 1.7;
      const ey = coneTop(ex) + 24 + r() * 50;
      const sy = coneTop(sx) + 6 + r() * 60;
      const mx = (sx + ex) / 2 + (r() - 0.5) * 40;
      const my = (coneTop(mx) + ey) / 2 + 16;
      const near = Math.max(0, 1 - Math.abs(sx - CR.x) / 300);
      g.lineCap = 'round';
      g.strokeStyle = rgba('#040206', 0.35 + r() * 0.3);
      g.lineWidth = 1.5 + r() * 4;
      g.beginPath();
      g.moveTo(sx, sy);
      g.quadraticCurveTo(mx, my, ex, ey);
      g.stroke();
      // the rib beside it lit by the glow above, warmer near the summit
      g.strokeStyle = rgba(mix('#5a3430', '#d8683a', near), 0.06 + r() * 0.1 + near * 0.08);
      g.lineWidth = 1 + r() * 1.6;
      g.beginPath();
      g.moveTo(sx - side * 4, sy);
      g.quadraticCurveTo(mx - side * 5, my, ex - side * 6, ey);
      g.stroke();
    }
  }
  // the form: the summit glowing from the crater, the upper flanks lit by the canopy's underside, the left flank
  // facing the fire's bloom, the right falling into the storm's dark
  const fg = ctx.createLinearGradient(CR.x - 700, 0, CR.x + 700, 0);
  fg.addColorStop(0, rgba('#ff8a4a', 0.03));
  fg.addColorStop(0.4, rgba('#ff8a4a', 0.07));
  fg.addColorStop(0.55, rgba('#08040c', 0.15));
  fg.addColorStop(1, rgba('#08040c', 0.55));
  ctx.fillStyle = fg;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const sg = ctx.createRadialGradient(CR.x, CR.y, 10, CR.x, CR.y, 240);
  sg.addColorStop(0, rgba('#ff7a30', 0.45));
  sg.addColorStop(0.3, rgba('#c8401c', 0.18));
  sg.addColorStop(1, rgba('#c8401c', 0));
  ctx.fillStyle = sg;
  ctx.fillRect(CR.x - 320, CR.y - 10, 640, 320);
  vfill(ctx, box.x, CR.y + 120, box.w, LV.coneFoot - CR.y - 80, [[0, 'rgba(6,4,8,0)'], [1, 'rgba(6,4,8,0.45)']]);
  // fresh tephra near the summit: coarse dark grains, glinting
  for (let i = 0; i < 260; i++) {
    const x = CR.x + (r() - 0.5) * 520;
    const y = coneTop(x) + 4 + r() ** 1.5 * 120;
    ctx.fillStyle = r() < 0.7 ? rgba('#0c080c', 0.5) : rgba('#ff9a5a', 0.25);
    ctx.fillRect(x, y, 1.5 + r() * 2, 1 + r());
  }
  // the shoulder's own little vent, steaming dully
  glowAt(ctx, 1052, coneTop(1052) + 10, 50, '#ff5a1a', 0.25, 0.5);
  // the flows' heat on the slopes round them
  ctx.globalCompositeOperation = 'lighter';
  for (const f of FLOWS) {
    for (let k = 0; k < 8; k++) {
      const [x, y] = along(f.pts, k / 8);
      const hot = Math.max(0, 1 - k / 8 / f.hot);
      glowAt(ctx, x, y, 40 + f.w * 3, '#ff4a12', 0.09 * hot + 0.015, 0.8);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  // haze thickening towards its foot (the valley's smoke), cooler to the right
  haze(ctx, 500, LV.coneFoot + 30, '#4a2026', 0.35, 0.95, 0, 900);
  haze(ctx, 500, LV.coneFoot + 30, '#262036', 0.35, 0.95, 900, CONE_X1);
  ctx.restore();
  // the flows themselves
  for (const f of FLOWS) lavaFlow(ctx, r, f.pts, f.w, f.hot);
  // the silhouette: the canopy's glow catching its edge, hottest near the summit
  ctx.save();
  ctx.lineJoin = 'round';
  for (const [w, a] of [[5, 0.12], [2, 0.35]] as const) {
    ctx.beginPath();
    for (let x = 300; x < 1300; x += 3) {
      const y = coneTop(x);
      if (x === 300) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const g = ctx.createLinearGradient(300, 0, 1300, 0);
    g.addColorStop(0, rgba('#ff7a3a', 0));
    g.addColorStop(0.3, rgba('#ff8a4a', a));
    g.addColorStop(0.46, rgba('#ffb060', a * 1.4));
    g.addColorStop(0.62, rgba('#ff8a4a', a));
    g.addColorStop(1, rgba('#ff7a3a', 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  ctx.restore();
}

/** A lava flow down the flank, as it looks at night: a ribbon of dark crust laid over the slope, its heat glowing
 * round it; molten threads braiding down it (bright and continuous near the vent, breaking into glowing cracks and
 * beads further down where the crust has closed), and the toe still incandescent where it pushes forward. */
function lavaFlow(ctx: Ctx, r: R, pts: [number, number][], w: number, hot: number): void {
  const N = 60;
  const P: [number, number][] = [];
  for (let i = 0; i <= N; i++) P.push(along(pts, i / N));
  const nrm = (i: number): [number, number] => {
    const a = P[Math.max(0, i - 1)];
    const b = P[Math.min(N, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const wid = (u: number) => w * (0.55 + u * 1.1) * (1 + wave1(u * 900 + w * 50, w) * 0.35);
  // the crust ribbon: a filled shape, its edges ragged where it has spread in lobes
  const edge = (s: number) => P.map((p, i): [number, number] => {
    const u = i / N;
    const [nx, ny] = nrm(i);
    const ww = (wid(u) / 2) * (1 + Math.max(0, Math.sin(u * 31 + s * 2 + w)) * 0.3);
    return [p[0] + nx * ww * s, p[1] + ny * ww * s];
  });
  const L = edge(-1);
  const Rr = edge(1).reverse();
  const ribbon: PathFn = (c) => {
    c.beginPath();
    c.moveTo(L[0][0], L[0][1]);
    for (const [x, y] of L) c.lineTo(x, y);
    for (const [x, y] of Rr) c.lineTo(x, y);
    c.closePath();
  };
  ctx.save();
  ribbon(ctx);
  ctx.fillStyle = '#1e0c0a';
  ctx.fill();
  within(ctx, ribbon, () => {
    // the crust's heat showing through: dull red where it's thin, near the vent and in the middle of the stream
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const h = Math.max(0, 1 - u / (hot * 1.3));
      ctx.strokeStyle = rgba('#7a1e0a', 0.25 + h * 0.5);
      ctx.lineWidth = wid(u) * 0.8;
      ctx.beginPath();
      ctx.moveTo(P[i][0], P[i][1]);
      ctx.lineTo(P[i + 1][0], P[i + 1][1]);
      ctx.stroke();
    }
    lay(ctx, noiseMask(10, 70 + w, { cover: 0.45, soft: 0.15, col: '#0c0404', w: 80, h: 120 }), boxOfPts(P, w * 2), 0.7);
  });
  // the molten threads: two or three braiding down the ribbon, continuous near the vent, broken lower down
  ctx.globalCompositeOperation = 'lighter';
  for (let th = 0; th < 3; th++) {
    const off = (th - 1) * 0.13;
    for (const [col, lw, a0] of [[MOLTEN.edge, 3.2, 0.55], [MOLTEN.body, 1.8, 0.85], [MOLTEN.hot, 0.9, 0.9]] as const) {
      ctx.strokeStyle = col;
      for (let i = 0; i < N; i++) {
        const u = i / N;
        const h = Math.max(0, 1 - u / hot);
        // broken: gaps that grow as it cools (a hash of position decides each stretch)
        const keep = Math.sin(i * 12.9898 + th * 78.233 + w) * 43758.5453;
        const frac = keep - Math.floor(keep);
        if (u > 0.15 && frac > 0.35 + h * 0.65) continue;
        const [nx, ny] = nrm(i);
        const [nx2, ny2] = nrm(i + 1);
        const o1 = (off + Math.sin(u * 14 + th * 2) * 0.18) * wid(u);
        const o2 = (off + Math.sin((u + 1 / N) * 14 + th * 2) * 0.18) * wid(u + 1 / N);
        ctx.globalAlpha = a0 * (0.35 + h * 0.65) * (th === 1 ? 1 : 0.7);
        ctx.lineWidth = lw * (0.6 + h * 0.6) * (w / 9);
        ctx.beginPath();
        ctx.moveTo(P[i][0] + nx * o1, P[i][1] + ny * o1);
        ctx.lineTo(P[i + 1][0] + nx2 * o2, P[i + 1][1] + ny2 * o2);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  // glowing beads and cracks scattered over the crust
  for (let i = 0; i < 40; i++) {
    const u = 0.1 + r() * 0.9;
    const [x, y] = along(pts, u);
    const o = (r() - 0.5) * wid(u) * 0.8;
    const ii = Math.round(u * N);
    const [nx, ny] = nrm(ii);
    ctx.fillStyle = rgba(r() < 0.6 ? MOLTEN.body : MOLTEN.hot, 0.5 + r() * 0.4);
    ctx.beginPath();
    ctx.ellipse(x + nx * o, y + ny * o, 1 + r() * 1.6, 0.8 + r(), r() * 3, 0, P2);
    ctx.fill();
  }
  // the toe: pushing forward, incandescent through its cracks
  const [ex, ey] = P[N];
  glowAt(ctx, ex, ey, w * 2.2, MOLTEN.body, 0.35 * hot + 0.1, 0.7);
  ctx.restore();
}

const boxOfPts = (pts: [number, number][], pad: number) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad };
};

/** The crater's near lip, over the fountain's foot and the column's: the summit's dark silhouette (the cone's own
 * layer starts just below it), its edge incandescent where the throat behind lights it, cinders standing up on it. */
function rim(ctx: Ctx, r: R): void {
  const x0 = CR.x - CR.hw - 40;
  const x1 = CR.x + CR.hw + 40;
  const top = (x: number) => coneTop(x) + 1.5 + Math.max(0, wave1(x * 13, 6)) * -2.2;
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x0, CR.y + 40);
    for (let x = x0; x <= x1; x += 2) c.lineTo(x, top(x));
    c.lineTo(x1, CR.y + 40);
    c.closePath();
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, CR.y - 14, x1 - x0, 15);
  ctx.clip();
  p(ctx);
  ctx.fillStyle = CONE_COL;
  ctx.fill();
  within(ctx, p, () => {
    const sg = ctx.createRadialGradient(CR.x, CR.y, 4, CR.x, CR.y, 130);
    sg.addColorStop(0, rgba('#ff7a30', 0.6));
    sg.addColorStop(0.4, rgba('#c8401c', 0.3));
    sg.addColorStop(1, rgba('#c8401c', 0));
    ctx.fillStyle = sg;
    ctx.fillRect(x0, CR.y - 14, x1 - x0, 20);
  });
  ctx.restore();
  // the lip's edge, white-hot over the throat, cooling to red along the shoulders
  ctx.save();
  ctx.lineCap = 'round';
  for (const [w, a] of [[5, 0.35], [2, 1]] as const) {
    ctx.beginPath();
    for (let x = CR.x - CR.hw - 16; x <= CR.x + CR.hw + 16; x += 2) {
      if (x === CR.x - CR.hw - 16) ctx.moveTo(x, top(x));
      else ctx.lineTo(x, top(x));
    }
    const eg = ctx.createLinearGradient(CR.x - CR.hw - 16, 0, CR.x + CR.hw + 16, 0);
    eg.addColorStop(0, rgba(MOLTEN.edge, 0));
    eg.addColorStop(0.25, rgba(MOLTEN.body, a * 0.8));
    eg.addColorStop(0.5, rgba(MOLTEN.hot, a));
    eg.addColorStop(0.75, rgba(MOLTEN.body, a * 0.8));
    eg.addColorStop(1, rgba(MOLTEN.edge, 0));
    ctx.strokeStyle = eg;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  // cinders standing on the lip, black against the glare
  ctx.fillStyle = CONE_COL;
  for (let i = 0; i < 16; i++) {
    const x = CR.x + (r() - 0.5) * CR.hw * 2.2;
    const y = top(x) + 1;
    const s = 1.5 + r() * 3;
    ctx.beginPath();
    ctx.moveTo(x - s * 1.3, y + 1);
    ctx.lineTo(x - s * 0.3, y - s);
    ctx.lineTo(x + s * 0.6, y - s * 0.6);
    ctx.lineTo(x + s * 1.3, y + 1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ——— the ash column and the fountain (frame painters, shared by the still and the live loops) ———

/** One puff of ash: a soft body, lit from beneath by the fire (heat 0…1), its top in the storm's shadow. */
function ashPuff(c: Ctx, px: number, py: number, pr: number, a: number, heat: number, shadowA = 0.5): void {
  const g = c.createRadialGradient(px, py, 0, px, py, pr);
  g.addColorStop(0, rgba('#241c22', 0.96 * a));
  g.addColorStop(0.78, rgba('#1e181e', 0.9 * a));
  g.addColorStop(1, rgba('#1e181e', 0));
  c.fillStyle = g;
  c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  const lx = px - pr * 0.08;
  const ly = py + pr * 0.42;
  const lg = c.createRadialGradient(lx, ly, 0, lx, ly, pr * 0.95);
  lg.addColorStop(0, rgba(mix('#7a3428', '#ff9a4a', heat), (0.14 + heat * 0.5) * a));
  lg.addColorStop(0.6, rgba(mix('#5a2422', '#d8582a', heat), (0.08 + heat * 0.25) * a));
  lg.addColorStop(1, rgba('#6a2a24', 0));
  c.fillStyle = lg;
  c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  const sx = px + pr * 0.22;
  const sy = py - pr * 0.42;
  const sg = c.createRadialGradient(sx, sy, 0, sx, sy, pr * 0.72);
  sg.addColorStop(0, rgba('#0c0a12', shadowA * a));
  sg.addColorStop(1, rgba('#0c0a12', 0));
  c.fillStyle = sg;
  c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
}

/** The ash column's frame: w×h, its vent at (vx, h). Painted at half size and shown doubled (smoke is soft). */
export const ASHF = { w: 260, h: 160, vx: 80, n: 12 };

/**
 * The ash column at phase ph: a continuous rising volume, lobes born in the vent climbing, swelling and leaning
 * downwind, each a cauliflower of puffs that roll as they climb (so it billows rather than slides). Lit from beneath
 * by the fountain: hot orange low, fading to the dull red of the canopy; the tops of the lobes in shadow.
 */
export function ashFrame(c: Ctx, ph: number): void {
  const { w, h, vx, n } = ASHF;
  const lob: { x: number; y: number; R: number; q: number; i: number }[] = [];
  const ctr = (q: number, i: number): [number, number] => [vx + q ** 1.5 * w * 0.3 + Math.sin(q * 6 + i * 2.3) * 4 * q, h - 6 - q * (h + 30)];
  for (let i = 0; i < n; i++) {
    const q = (ph + i / n) % 1;
    const [x, y] = ctr(q, i);
    // each lobe its own size and a little off the column's line, so the edge breaks into billows
    const R = (20 + q * 56) * (0.78 + 0.4 * Math.abs(Math.sin(i * 5.1)));
    lob.push({ x: x + Math.sin(i * 3.7) * R * 0.35, y, R, q, i });
  }
  // the body underneath: one soft tapering mass along the column, so no sky shows between the lobes
  c.save();
  c.lineCap = 'round';
  for (let k = 0; k < 24; k++) {
    const q = k / 23;
    const [x, y] = ctr(q, 0);
    const R = (18 + q * 52) * 0.7;
    const g = c.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, rgba('#2a1e24', 0.95));
    g.addColorStop(0.7, rgba('#2a1e24', 0.8));
    g.addColorStop(1, rgba('#2a1e24', 0));
    c.fillStyle = g;
    c.fillRect(x - R, y - R, R * 2, R * 2);
  }
  // the lobes, the oldest (highest) first, so the newer ones roll up over them
  lob.sort((a, b) => b.q - a.q);
  for (const L of lob) {
    const fade = Math.min(1, L.q * 7) * Math.min(1, (1 - L.q) * 4);
    const heat = Math.max(0.12, 1 - L.q * 0.95);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * P2 + L.q * 2.4 + L.i * 1.1;
      const d = L.R * (0.4 + 0.2 * Math.sin(k * 2.7 + L.i));
      ashPuff(c, L.x + Math.cos(a) * d * 1.15, L.y + Math.sin(a) * d * 0.8, L.R * (0.52 + 0.12 * Math.sin(k * 1.9 + L.i * 3)), fade, heat);
    }
  }
  // the vent's glare in the column's foot
  const vg = c.createRadialGradient(vx, h - 4, 0, vx, h - 4, 40);
  vg.addColorStop(0, rgba('#ffc070', 0.7));
  vg.addColorStop(1, rgba('#ff7a30', 0));
  c.fillStyle = vg;
  c.fillRect(vx - 40, h - 44, 80, 44);
  c.restore();
}

/** The fountain's frame: w×h, its vent at (w/2, h - 2). */
export const FNT = { w: 150, h: 120, n: 12 };

/**
 * The lava fountain at phase ph: jets thrown up out of the vent, each a ribbon of molten rock rising, slowing,
 * breaking into gobbets at its top and falling back; each jet on its own beat (heights from sines of the phase, so
 * frame n wraps to frame 0). A glow at the foot.
 */
export function fountainFrame(c: Ctx, ph: number): void {
  const { w, h } = FNT;
  const bx = w / 2;
  const by = h - 2;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const halo = c.createRadialGradient(bx, by - 20, 0, bx, by - 20, 70);
  halo.addColorStop(0, rgba('#ff8a30', 0.35));
  halo.addColorStop(1, rgba('#ff5a10', 0));
  c.fillStyle = halo;
  c.fillRect(0, 0, w, h);
  c.restore();
  c.lineCap = 'round';
  const jets = 6;
  for (let j = 0; j < jets; j++) {
    const s = j * 1.93;
    const lean = (j / (jets - 1) - 0.5) * 0.9 + Math.sin(P2 * ph + s) * 0.12;
    const H = h * (0.45 + 0.35 * (0.5 + 0.5 * Math.sin(P2 * ph * (j % 2 ? 1 : 2) + s)));
    const v0 = Math.sqrt(2 * 9.8 * H);
    const vx = lean * v0 * 0.5;
    const T = (2 * v0) / 9.8;
    const pos = (t: number): [number, number] => [bx + (j - jets / 2) * 3 + vx * t * 1.2, by - (v0 * t - 0.5 * 9.8 * t * t)];
    // the ribbon: the rising column of the jet, thick and hot at the vent
    const N = 14;
    for (const [k, col, wd] of [[1, MOLTEN.edge, 7], [0.75, MOLTEN.body, 4.5], [0.5, MOLTEN.hot, 2.2]] as const) {
      c.strokeStyle = col;
      for (let i = 0; i < N; i++) {
        const t0 = (i / N) * T * 0.48 * k;
        const t1 = ((i + 1) / N) * T * 0.48 * k;
        const [x0, y0] = pos(t0);
        const [x1, y1] = pos(t1);
        c.lineWidth = wd * (1 - (i / N) * 0.7);
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
        c.stroke();
      }
    }
    // gobbets: broken off the top and falling back, cooling as they go (each on the jet's beat)
    for (let g = 0; g < 4; g++) {
      const q = (ph * (j % 2 ? 1 : 2) + g / 4 + s * 0.13) % 1;
      const t = T * (0.42 + q * 0.58);
      const [x, y] = pos(t);
      if (y > by) continue;
      const rad = 2.6 * (1 - q * 0.5) + (g % 2) * 0.8;
      c.fillStyle = q < 0.6 ? MOLTEN.hot : mix(MOLTEN.body, MOLTEN.edge, (q - 0.6) * 2.5);
      c.beginPath();
      // a gobbet stretched along its flight, a tail trailing it
      const vy2 = -(v0 - 9.8 * t);
      const ang = Math.atan2(vy2, vx * 1.2);
      c.save();
      c.translate(x, y);
      c.rotate(-ang);
      c.ellipse(0, 0, rad * (1.3 + Math.min(1, Math.abs(vy2) / v0) * 0.8), rad, 0, 0, P2);
      c.fill();
      c.globalAlpha = 0.45;
      c.beginPath();
      c.moveTo(rad, -rad * 0.6);
      c.lineTo(rad * 4.5, 0);
      c.lineTo(rad, rad * 0.6);
      c.fill();
      c.restore();
      if (q > 0.5) {
        c.fillStyle = rgba('#2a0a06', (q - 0.5) * 1.2);
        c.beginPath();
        c.ellipse(x - rad * 0.3, y - rad * 0.3, rad * 0.6, rad * 0.5, 0, 0, P2);
        c.fill();
      }
    }
  }
  // the welling dome over the vent
  const dg = c.createRadialGradient(bx, by, 0, bx, by, 26);
  dg.addColorStop(0, MOLTEN.core);
  dg.addColorStop(0.5, rgba(MOLTEN.hot, 0.9));
  dg.addColorStop(1, rgba(MOLTEN.body, 0));
  c.fillStyle = dg;
  c.beginPath();
  c.ellipse(bx, by, 28, 10 + Math.sin(P2 * ph * 3) * 2, 0, Math.PI, P2);
  c.fill();
}

/** The column and the fountain as the still shows them. */
function eruptionStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(CR.x - ASHF.vx * 2, CR.y + 6 - ASHF.h * 2);
  ctx.scale(2, 2);
  ashFrame(ctx, 0.37);
  ctx.restore();
  ctx.save();
  ctx.translate(CR.x - ASHF.vx * 2 + 30, CR.y + 6 - ASHF.h * 1.8);
  ctx.scale(1.8, 1.8);
  ctx.globalAlpha = 0.55;
  ashFrame(ctx, 0.71);
  ctx.restore();
  ctx.save();
  ctx.translate(CR.x - FNT.w / 2, CR.y + 6 - FNT.h);
  fountainFrame(ctx, 0.2);
  ctx.restore();
}

// ——— the jungle hills in front of the cone ———

/** A treeline's top: the union of crowns (x, y, radius) along it, so the edge is a run of rounded lumps. */
function crownsTop(crowns: [number, number, number][], x: number, floor: number): number {
  let y = floor;
  for (const [cx, cy, R] of crowns) {
    const d = x - cx;
    if (Math.abs(d) < R) y = Math.min(y, cy - Math.sqrt(R * R - d * d) * 0.8);
  }
  return y;
}

function hills(ctx: Ctx, r: R): void {
  // the valley floor behind the near bank: dark ground under smoke, blending up into the haze at the cone's foot
  vfill(ctx, 0, 626, W, LV.ledge + 4 - 626, [[0, 'rgba(22,14,20,0)'], [0.3, '#1a1016'], [1, '#100a0e']]);
  lay(ctx, noiseMask(10, 51, { cover: 0.4, soft: 0.3, col: '#06040a', w: 300, h: 30 }), { x: 0, y: 650, w: W, h: LV.ledge - 650 + 4 }, 0.5);
  // the river's light on the floor either side of it
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let x = RV.x0 + 40; x < W + 60; x += 70) lightPool(ctx, x, riverY(x), 130, 24, '#ff5a14', 0.16);
  lightPool(ctx, RV.x0 + 10, RV.y0 - 4, 110, 34, '#ff7a24', 0.25);
  ctx.restore();
  // two banks of jungle, left and right of the river's mouth: lumpy canopies, near black, the fire on their crowns
  const banks: { x0: number; x1: number; y0: number; y1: number; seed: number; col: string; R: number }[] = [
    { x0: -40, x1: 680, y0: 560, y1: 610, seed: 5, col: '#0d1013', R: 34 },
    { x0: 990, x1: W + 40, y0: 612, y1: 596, seed: 8, col: '#0b0e11', R: 28 },
  ];
  for (const b of banks) {
    const crowns: [number, number, number][] = [];
    for (let x = b.x0; x < b.x1; x += b.R * (0.7 + r() * 0.6)) {
      const u = (x - b.x0) / (b.x1 - b.x0);
      // the bank rounds down to the floor at its ends
      const end = Math.min(1, Math.min(x - b.x0, b.x1 - x) / 220);
      const y = b.y0 + (b.y1 - b.y0) * u + wave1(x * 2, b.seed) * 14 + (1 - end) ** 1.5 * 110;
      crowns.push([x, y, b.R * (0.7 + r() * 0.6) * (0.6 + end * 0.4)]);
    }
    const top = (x: number) => crownsTop(crowns, x, LV.ledge + 4);
    const p = ridgePath(b.x0, b.x1, LV.ledge + 4, top, 3);
    p(ctx);
    ctx.fillStyle = b.col;
    ctx.fill();
    within(ctx, p, () => {
      // each crown lit on the side turned to the fire, a little warmer the nearer the volcano
      for (const [cx, cy, R] of crowns) {
        const toCr = Math.sign(CR.x - cx) || 1;
        const near = Math.max(0.15, 1 - Math.abs(cx - CR.x) / 1100);
        const lx = cx + toCr * R * 0.35;
        const ly = cy - R * 0.55;
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, R * 0.9);
        g.addColorStop(0, rgba('#6a3a22', 0.55 * near));
        g.addColorStop(0.5, rgba('#3a2418', 0.3 * near));
        g.addColorStop(1, rgba('#3a2418', 0));
        ctx.fillStyle = g;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        // the shadowed undersides between crowns
        const sg = ctx.createRadialGradient(cx - toCr * R * 0.3, cy + R * 0.5, 0, cx - toCr * R * 0.3, cy + R * 0.5, R);
        sg.addColorStop(0, 'rgba(2,3,5,0.6)');
        sg.addColorStop(1, 'rgba(2,3,5,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(cx - R * 1.4, cy - R, R * 2.8, R * 2.4);
      }
      // leaf texture over it
      lay(ctx, noiseMask(26, 60 + b.seed, { cover: 0.5, soft: 0.12, col: '#020306', w: 420, h: 50 }), { x: b.x0, y: Math.min(b.y0, b.y1) - b.R * 1.5, w: b.x1 - b.x0, h: LV.ledge - Math.min(b.y0, b.y1) + b.R * 1.5 + 4 }, 0.45);
      // the haze sitting in the valley, warm over the river
      vfill(ctx, b.x0, Math.max(b.y0, b.y1) - 10, b.x1 - b.x0, LV.ledge - Math.max(b.y0, b.y1) + 14, [[0, rgba('#3a1a22', 0)], [1, rgba('#3a1a22', 0.5)]]);
    });
    // their crests catching the eruption's light (a rim on the edge facing it)
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.4;
    for (let x = b.x0; x < b.x1; x += 3) {
      const y0 = top(x);
      const y1 = top(x + 3);
      if (y0 >= LV.ledge) continue;
      const slope = (y1 - y0) / 3;
      const toCr = Math.sign(CR.x - x);
      // lit where the edge faces the volcano (rising towards it), and along the tops
      const k = Math.max(0, Math.min(1, 0.4 - slope * toCr * 1.2)) * Math.max(0.1, 1 - Math.abs(x - CR.x) / 1000);
      if (k < 0.02) continue;
      ctx.strokeStyle = rgba('#ff8a4a', 0.55 * k);
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + 3, y1);
      ctx.stroke();
    }
    ctx.restore();
    // tree ferns and cycads standing up out of the canopy, black against the sky, rimmed by the fire
    for (let i = 0; i < 7; i++) {
      const x = b.x0 + 60 + r() * (b.x1 - b.x0 - 120);
      treeSil(ctx, r, x, top(x) + 10, 40 + r() * 46, b.col, 0);
    }
  }
}

// ——— the river ———

/** A raft of crust on the melt: an irregular slab (a jittered polygon), dark, its broken edge glowing where it
 * meets the melt, a dull sheen on top. */
export function crustPlate(c: Ctx, x: number, y: number, w: number, h: number, seed: number, glow = 0.55): void {
  const n = 7;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * P2 + Math.sin(seed * 3.1 + i) * 0.3;
    const k = 0.7 + 0.3 * Math.abs(Math.sin(seed * 7.7 + i * 2.3));
    const px = x + Math.cos(a) * w * 0.5 * k;
    const py = y + Math.sin(a) * h * 0.5 * k;
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.closePath();
  c.fillStyle = rgba(mix('#160806', '#3a160c', Math.abs(Math.sin(seed * 5.3))), 0.94);
  c.fill();
  c.strokeStyle = rgba('#ff9a3a', glow);
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = 'rgba(150,100,90,0.25)';
  c.fillRect(x - w * 0.25, y - h * 0.22, w * 0.3, 1);
}

/** The river's molten body (the still, and the tiles' colour). */
function riverPaint(ctx: Ctx, ph: number): void {
  ctx.save();
  ctx.translate(RV.x0, RV.y0);
  ctx.rotate(RIV_ANG);
  const h = RV.w;
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#8a1e06');
  g.addColorStop(0.3, MOLTEN.edge);
  g.addColorStop(0.5, MOLTEN.body);
  g.addColorStop(0.7, MOLTEN.edge);
  g.addColorStop(1, '#8a1e06');
  ctx.fillStyle = g;
  ctx.fillRect(-10, -h / 2, RIV_LEN + 20, h);
  // crust plates drifting on it
  let s = 7;
  const rr = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 130; i++) {
    const x = ((rr() * (RIV_LEN + 40) + ph * 60) % (RIV_LEN + 40)) - 20;
    const y = (rr() - 0.5) * h * 0.7;
    crustPlate(ctx, x, y, 12 + rr() * 30, 4 + rr() * 8, i);
  }
  ctx.restore();
}

/** The river's banks: crusted lips of cooled rock along both edges, covering the flowing strip's edges, the near
 * bank in shadow. */
function banks(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.translate(RV.x0, RV.y0);
  ctx.rotate(RIV_ANG);
  const h = RV.w;
  for (const side of [-1, 1]) {
    // the banks wander in and out, so the melt between them meanders; it wells out of a narrow mouth
    const edge = (x: number) => side * Math.max(1, h / 2 - 4 + wave1(x * 2.2 + side * 300, 2 + side) * 7 + wave1(x * 9, 4 + side) * 1.6 - Math.max(0, 1 - x / 90) * (h / 2 - 2));
    const p: PathFn = (c) => {
      c.beginPath();
      c.moveTo(-14, side * (h / 2 + 12));
      for (let x = -14; x <= RIV_LEN + 40; x += 6) c.lineTo(x, edge(x));
      c.lineTo(RIV_LEN + 40, side * (h / 2 + 12));
      c.closePath();
    };
    p(ctx);
    const bf = ctx.createLinearGradient(0, side * (h / 2 - 4), 0, side * (h / 2 + 12));
    const bc = side < 0 ? '#22100e' : '#140a0c';
    bf.addColorStop(0, bc);
    bf.addColorStop(0.5, rgba(bc, 0.9));
    bf.addColorStop(1, rgba(bc, 0));
    ctx.fillStyle = bf;
    ctx.fill();
    within(ctx, p, () => {
      for (let i = 0; i < 90; i++) {
        const x = -30 + r() * (RIV_LEN + 60);
        const y = edge(x) + side * (2 + r() * 8);
        ctx.fillStyle = rgba(r() < 0.5 ? '#3a1a14' : '#0a0406', 0.7);
        ctx.beginPath();
        ctx.ellipse(x, y, 3 + r() * 7, 1.4 + r() * 2.4, 0, 0, P2);
        ctx.fill();
      }
      // the lip nearest the melt red-hot, the heat dying out into the rock
      const hot = ctx.createLinearGradient(0, side * (h / 2 - 6), 0, side * (h / 2 + 10));
      hot.addColorStop(0, rgba('#ff6a1c', 0.75));
      hot.addColorStop(0.35, rgba('#a0280c', 0.4));
      hot.addColorStop(1, rgba('#a0280c', 0));
      ctx.fillStyle = hot;
      ctx.fillRect(-40, Math.min(side * (h / 2 - 6), side * (h / 2 + 10)), RIV_LEN + 80, 16);
    });
  }
  ctx.restore();
  // behind the lanes the crust has closed over it (a darker, quieter stretch), so the brightest melt shows between
  // the pizzas rather than behind the feet coming down
  for (const lx of [1000, 1550]) {
    const g = ctx.createRadialGradient(lx, riverY(lx), 0, lx, riverY(lx), 190);
    g.addColorStop(0, 'rgba(22,8,6,0.5)');
    g.addColorStop(0.6, 'rgba(22,8,6,0.35)');
    g.addColorStop(1, 'rgba(22,8,6,0)');
    ctx.save();
    ctx.translate(lx, riverY(lx));
    ctx.scale(1, 0.14);
    ctx.translate(-lx, -riverY(lx));
    ctx.fillStyle = g;
    ctx.fillRect(lx - 200, riverY(lx) - 200, 400, 400);
    ctx.restore();
  }
  // the mouth: the river wells out from under a tongue of crust at the flow's toe, glowing through its cracks
  ctx.save();
  ctx.translate(RV.x0 + 6, RV.y0 - 1);
  ctx.rotate(RIV_ANG - 0.15);
  crustPlate(ctx, 0, 0, 64, 22, 3, 0.8);
  crustPlate(ctx, 22, 3, 30, 12, 5, 0.6);
  ctx.restore();
  void r;
}

// ——— the near bank ———

/** A boulder: one stone silhouette, lit by the river behind it and the fire's glow, sat in its own shadow. */
function boulder(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, seed: number): void {
  const pts: [number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const k = 0.85 + Math.sin(i * 2.3 + seed) * 0.1 + (r() - 0.5) * 0.08;
    pts.push([x + Math.cos(a) * w * 0.5 * k, y + Math.sin(a) * h * k]);
  }
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - w * 0.52, y + 2);
    for (const [px, py] of pts) c.lineTo(px, py);
    c.lineTo(x + w * 0.52, y + 2);
    c.closePath();
  };
  groundShadow(ctx, x + w * 0.08, y + 1, w * 0.62, h * 0.12, 0.6, '#050206');
  p(ctx);
  ctx.fillStyle = '#1a1316';
  ctx.fill();
  within(ctx, p, () => {
    surface(ctx, r, { x: x - w / 2, y: y - h, w, h: h + 4 }, '#1a1316', { over: true, vary: 0.5, cells: 3, grain: 0.3, grainKind: 'stone', seed: 90 + seed, warm: '#4a3030', cool: '#0a0810' });
    // the river's light on its back (top) edge, the fire's on the side turned to the volcano
    const tg = ctx.createLinearGradient(0, y - h, 0, y - h * 0.4);
    tg.addColorStop(0, rgba('#ff7a30', 0.35));
    tg.addColorStop(0.25, rgba('#ff7a30', 0.06));
    tg.addColorStop(1, rgba('#ff7a30', 0));
    ctx.fillStyle = tg;
    ctx.fillRect(x - w / 2, y - h, w, h);
    const sg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    const left = x > CR.x;
    sg.addColorStop(0, rgba(left ? '#c8603a' : '#06040a', left ? 0.1 : 0.5));
    sg.addColorStop(1, rgba(left ? '#06040a' : '#c8603a', left ? 0.5 : 0.1));
    ctx.fillStyle = sg;
    ctx.fillRect(x - w / 2, y - h, w, h);
    // its roundness: the edges turning away into shade
    const rg = ctx.createRadialGradient(x - w * 0.1, y - h * 0.6, 0, x, y - h * 0.4, Math.max(w, h * 2) * 0.62);
    rg.addColorStop(0, 'rgba(6,4,10,0)');
    rg.addColorStop(0.6, 'rgba(6,4,10,0.15)');
    rg.addColorStop(1, 'rgba(6,4,10,0.65)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - w / 2, y - h, w, h + 2);
    // moss on its top
    lay(ctx, noiseMask(5, 40 + seed, { cover: 0.35, soft: 0.2, col: '#2a3a1a', w: 60, h: 30 }), { x: x - w / 2, y: y - h, w, h: h * 0.5 }, 0.45);
    vfill(ctx, x - w / 2, y - h * 0.3, w, h * 0.3 + 2, [[0, 'rgba(4,2,6,0)'], [1, 'rgba(4,2,6,0.6)']]);
  });
}

function ledge(ctx: Ctx, r: R): void {
  const y0 = LV.ledge;
  const box = { x: 0, y: y0, w: W, h: TY - y0 + 2 };
  // the near bank: dark volcanic soil and moss, its far edge lit by the river beyond
  surface(ctx, r, box, '#120d10', { vary: 0.5, cells: 6, mottle: 0.45, strokes: 0.3, strokeAng: 0, strokeLen: 120, strokeW: 6, grain: 0.25, grainKind: 'stone', seed: 61, warm: '#2e1e1c', cool: '#06040a' });
  lay(ctx, noiseMask(9, 62, { cover: 0.3, soft: 0.25, col: '#1a2212', w: 320, h: 24 }), box, 0.3);
  // the river's warmth on the bank's far half, the near half falling into the table's shadow
  vfill(ctx, 0, y0, W, TY - y0, [[0, 'rgba(90,30,16,0.18)'], [0.5, 'rgba(10,6,8,0.1)'], [1, 'rgba(6,4,6,0.45)']]);
  const lit = ctx.createLinearGradient(0, y0, 0, y0 + 14);
  lit.addColorStop(0, rgba('#ff6a24', 0.1));
  lit.addColorStop(1, rgba('#ff6a24', 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = lit;
  ctx.fillRect(RV.x0 - 60, y0, W - RV.x0 + 60, 22);
  ctx.restore();
  // its broken back edge: clods and stones against the glow
  for (let x = 0; x < W; x += 5 + r() * 9) {
    const h = 1 + r() * 4;
    ctx.fillStyle = rgba('#0a0608', 0.85);
    ctx.beginPath();
    ctx.ellipse(x, y0 + 1, 3 + r() * 6, h, 0, Math.PI, P2);
    ctx.fill();
  }
  // shade under the near edge (the table's)
  vfill(ctx, 0, TY - 22, W, 24, [[0, 'rgba(4,2,6,0)'], [1, 'rgba(4,2,6,0.55)']]);
  // the tree ferns' shadows round their feet, the cycad's and the ribs'
  for (const f of LV.ferns) groundShadow(ctx, f.foot[0] + 10, f.foot[1] + 2, f.len * 0.28, 7, 0.6, '#040206');
  groundShadow(ctx, LV.cycad.x + 6, LV.cycad.y + 2, 52, 7, 0.55, '#040206');
  // boulders along it
  for (const [x, y, w, h, s] of [[64, 756, 150, 54, 1], [262, 754, 84, 30, 2], [560, 750, 60, 20, 3], [1190, 752, 84, 26, 4], [1450, 756, 120, 40, 5], [1660, 756, 70, 22, 6], [1890, 758, 140, 56, 7]] as const)
    boulder(ctx, r, x, y, w, h, s);
}

// ——— the tree ferns ———

/** A tree fern's trunk: a stout fibrous column, clad in the stubs of old fronds, lit on the side turned to the fire. */
function trunk(ctx: Ctx, r: R, f: (typeof LV.ferns)[number]): void {
  const [fx, fy] = f.foot;
  const [tx, ty] = f.top;
  const toFire = Math.sign(CR.x - fx);
  const w0 = f.len * 0.16;
  const w1 = f.len * 0.11;
  const cx = (fx + tx) / 2 - toFire * f.len * 0.04;
  const cy = (fy + ty) / 2;
  const side = (s: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const x = (1 - u) ** 2 * fx + 2 * (1 - u) * u * cx + u * u * tx;
      const y = (1 - u) ** 2 * fy + 2 * (1 - u) * u * cy + u * u * ty;
      // the foot flares into a skirt of roots
      const wd = w0 + (w1 - w0) * u + Math.max(0, 0.12 - u) * w0 * 3;
      pts.push([x + (s * wd) / 2 + Math.sin(u * 17 + f.seed) * 1.5, y]);
    }
    return pts;
  };
  const L = side(-1);
  const Rt = side(1).reverse();
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(L[0][0], L[0][1]);
    for (const [x, y] of L) c.lineTo(x, y);
    for (const [x, y] of Rt) c.lineTo(x, y);
    c.closePath();
  };
  castShadow(ctx, p, 6, 10, 0.35, '#040206');
  p(ctx);
  ctx.fillStyle = '#21160f';
  ctx.fill();
  const bx = Math.min(fx, tx) - w0;
  const bw = Math.abs(fx - tx) + w0 * 2;
  within(ctx, p, () => {
    // the old frond bases: overlapping scales in a spiral, each lit on its upper edge, dark beneath
    for (let i = 0; i < (fy - ty) * 0.9; i++) {
      const u = r();
      const y = ty + u * (fy - ty);
      const x = (1 - u) ** 2 * tx + 2 * (1 - u) * u * cx + u * u * fx;
      const wd = w1 + (w0 - w1) * u;
      {
        const sx = x + (r() - 0.5) * wd * 1.1;
        const s = 3 + r() * 5 * (1 - u * 0.4);
        ctx.fillStyle = rgba('#120a06', 0.7);
        ctx.beginPath();
        ctx.ellipse(sx + 1, y + 2, s, s * 0.6, 0, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba(mix('#4a321e', '#6a4a2a', r()), 0.7);
        ctx.beginPath();
        ctx.ellipse(sx, y, s, s * 0.5, 0, Math.PI, P2);
        ctx.fill();
      }
    }
    // fibres hanging down the lower trunk
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const u = 0.35 + r() * 0.65;
      const y = ty + u * (fy - ty);
      const x = (1 - u) ** 2 * tx + 2 * (1 - u) * u * cx + u * u * fx + (r() - 0.5) * w0;
      ctx.strokeStyle = rgba(r() < 0.5 ? '#0a0604' : '#5a3a22', 0.5);
      ctx.lineWidth = 1 + r();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 6, y + 10, x + (r() - 0.5) * 4, y + 16 + r() * 18);
      ctx.stroke();
    }
    // the form: the side turned to the fire warm, the other side falling off into the dark; a cool rim from the storm
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    const warmL = toFire < 0;
    g.addColorStop(0, warmL ? rgba('#ff8a4a', 0.45) : rgba('#06040a', 0.65));
    g.addColorStop(0.45, rgba('#000000', warmL ? 0.05 : 0.2));
    g.addColorStop(1, warmL ? rgba('#06040a', 0.65) : rgba('#ff8a4a', 0.45));
    ctx.fillStyle = g;
    ctx.fillRect(bx, ty, bw, fy - ty);
    // darker under the crown, and at the foot
    vfill(ctx, bx, ty, bw, 60, [[0, 'rgba(4,2,4,0.7)'], [1, 'rgba(4,2,4,0)']]);
    vfill(ctx, bx, fy - 40, bw, 40, [[0, 'rgba(4,2,4,0)'], [1, 'rgba(4,2,4,0.6)']]);
  });
  ctx.strokeStyle = rgba('#050304', 0.85);
  ctx.lineWidth = 1.5;
  p(ctx);
  ctx.stroke();
}

/**
 * A tree fern's crown: fronds springing from the trunk's top, arching up and out and drooping at the tips. Each
 * frond is a rachis with pinnae either side (each a narrow pointed leaflet, longest a third of the way out, angled
 * forward), drawn back to front: the far fronds dark, the near ones lighter; leaflets turned to the fire warm.
 */
function crown(ctx: Ctx, r: R, f: (typeof LV.ferns)[number]): void {
  const [tx, ty] = f.top;
  const toFire = Math.sign(CR.x - tx);
  const fronds: { a: number; L: number; near: number; droop: number }[] = [];
  for (let i = 0; i < f.n; i++) {
    const a = -Math.PI + ((i + 0.5) / f.n) * Math.PI * 1.0 + (r() - 0.5) * 0.25;
    fronds.push({ a, L: f.len * (0.85 + r() * 0.3), near: r(), droop: 0.5 + r() * 0.5 });
  }
  // a few short fronds hanging down at the back, dead and brown
  for (let i = 0; i < 4; i++) fronds.push({ a: (r() - 0.5) * 2.6 + (r() < 0.5 ? 0.3 : Math.PI - 0.3), L: f.len * (0.4 + r() * 0.2), near: -1, droop: 1.6 });
  fronds.sort((p, q) => p.near - q.near);
  for (const fr of fronds) {
    const dead = fr.near < 0;
    const ca = Math.cos(fr.a);
    const sa = Math.sin(fr.a);
    const L = fr.L;
    // the rachis: out and up, then drooping (a quadratic from the crown to the tip)
    const ex = tx + ca * L * 0.95;
    const ey = ty + Math.abs(ca) * L * 0.06 * fr.droop + (sa + 0.3) * L * 0.36 + L * 0.06 * fr.droop;
    const cx = tx + ca * L * 0.52;
    const cy = ty + sa * L * 0.6 - L * 0.26;
    const q = (t: number): [number, number] => [(1 - t) ** 2 * tx + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) ** 2 * ty + 2 * (1 - t) * t * cy + t * t * ey];
    const depth = dead ? 0 : fr.near;
    const dark = dead ? '#160e08' : mix('#050a06', '#0a140a', depth);
    const mid = dead ? '#2a1c0e' : mix('#0e1a0c', '#172a12', depth);
    const lit = dead ? '#5a3a1c' : mix('#3e3a1a', '#8a6a2e', depth);
    const n2 = Math.round(L / 8);
    for (let k = 2; k < n2; k++) {
      const t = k / n2;
      const [px, py] = q(t);
      const [qx, qy] = q(Math.min(1, t + 0.01));
      const dx = qx - px;
      const dy = qy - py;
      const l = Math.hypot(dx, dy) || 1;
      const ux = dx / l;
      const uy = dy / l;
      const ll = L * 0.16 * Math.sin(Math.min(1, t * 1.5) * Math.PI * 0.5 + 0.25) * (1 - t * 0.75) * (dead ? 0.6 : 1);
      for (const s of [-1, 1]) {
        // a pinna: out and forward from the rachis, drooping under its own weight, itself cut into little pinnules
        // (the lace that makes it a fern and not a palm)
        const nx = -uy * s;
        const ny = ux * s;
        const lx = px + nx * ll + ux * ll * 0.45;
        const ly = py + ny * ll * 0.7 + ll * 0.32;
        // which side faces the fire, which faces up into the sky's dark
        const facing = nx * toFire * 0.7 - ny * 0.3;
        const tone = Math.max(0, Math.min(1, 0.3 + facing * 0.45 + (r() - 0.5) * 0.3));
        const col = tone < 0.55 ? mix(dark, mid, tone / 0.55) : mix(mid, lit, ((tone - 0.55) / 0.45) * (0.4 + depth * 0.6));
        const pw = Math.max(1.4, ll * 0.16);
        ctx.fillStyle = col;
        // the pinna's body, narrow, under its pinnules
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo((px + lx) / 2 - ny * pw * 0.4, (py + ly) / 2 + nx * pw * 0.4 - ll * 0.08, lx, ly);
        ctx.quadraticCurveTo((px + lx) / 2 + ny * pw * 0.4, (py + ly) / 2 - nx * pw * 0.4 - ll * 0.04, px, py);
        ctx.fill();
        // its lobed edge: a few notches either side, so it reads as a cut fern pinna, not a smooth palm blade
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1, pw * 0.7);
        ctx.lineCap = 'round';
        const m2 = Math.max(2, Math.round(ll / 9));
        for (let j = 1; j <= m2; j++) {
          const v = j / (m2 + 1);
          const bx = px + (lx - px) * v;
          const by = py + (ly - py) * v - Math.sin(v * Math.PI) * ll * 0.06;
          const pl = pw * 1.6 * (1 - v * 0.5);
          for (const z of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx - ny * z * pl + (lx - px) / ll * pl * 0.5, by + nx * z * pl + (ly - py) / ll * pl * 0.5);
            ctx.stroke();
          }
        }
      }
    }
    ctx.strokeStyle = dead ? '#2a1a0c' : mix('#1a2a10', '#3a4a1c', depth);
    ctx.lineWidth = Math.max(1.5, L * 0.012);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
  // the fire's rim on the fronds' upper edges facing it, and the dark heart of the crown
  const hg = ctx.createRadialGradient(tx, ty + 6, 0, tx, ty + 6, f.len * 0.22);
  hg.addColorStop(0, 'rgba(4,6,4,0.8)');
  hg.addColorStop(1, 'rgba(4,6,4,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(tx - f.len * 0.3, ty - f.len * 0.3, f.len * 0.6, f.len * 0.6);
  // croziers: new fronds still uncurling at the top, their coils lit by the fire
  for (const [dx, hh, rr] of [[0, 34, 6], [-12, 24, 4.5], [11, 20, 4]] as const) {
    const sx = tx + dx;
    ctx.strokeStyle = '#3a3a18';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(sx, ty);
    ctx.quadraticCurveTo(sx + toFire * 4, ty - hh * 0.8, sx + toFire * rr * 2, ty - hh);
    ctx.arc(sx + toFire * rr * 2, ty - hh + rr, rr, -Math.PI / 2, toFire > 0 ? Math.PI * 0.9 : 0.1, toFire < 0);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ff9a4a', 0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

const crownBox = (f: (typeof LV.ferns)[number]) => {
  const x0 = Math.max(0, f.top[0] - f.len * 1.25);
  const x1 = Math.min(W, f.top[0] + f.len * 1.25);
  return { x: Math.round(x0), y: Math.round(f.top[1] - f.len * 0.75), w: Math.round(x1 - x0), h: Math.round(Math.min(TY - (f.top[1] - f.len * 0.75), f.len * 1.55)) };
};
const trunkBox = (f: (typeof LV.ferns)[number]) => {
  const x0 = Math.min(f.foot[0], f.top[0]) - f.len * 0.3;
  return { x: Math.round(Math.max(0, x0)), y: f.top[1] - 10, w: Math.round(Math.abs(f.foot[0] - f.top[0]) + f.len * 0.6), h: TY - f.top[1] + 10 };
};

// ——— the cycad and the ribs ———

function cycad(ctx: Ctx, r: R): void {
  const { x, y } = LV.cycad;
  const h = 66;
  const trunkP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 20, y);
    c.quadraticCurveTo(x - 24, y - h * 0.5, x - 15, y - h);
    c.lineTo(x + 15, y - h);
    c.quadraticCurveTo(x + 24, y - h * 0.5, x + 20, y);
    c.closePath();
  };
  castShadow(ctx, trunkP, 5, 8, 0.4, '#040206');
  trunkP(ctx);
  ctx.fillStyle = '#1a120c';
  ctx.fill();
  within(ctx, trunkP, () => {
    // the diamond scales of old leaf bases, lit on their upper edges
    for (let yy = y - h; yy < y + 4; yy += 8)
      for (let xx = x - 26 + ((yy / 8) % 2) * 6; xx < x + 26; xx += 12) {
        ctx.fillStyle = rgba('#0a0604', 0.6);
        ctx.beginPath();
        ctx.moveTo(xx, yy + 4);
        ctx.lineTo(xx + 6, yy);
        ctx.lineTo(xx + 12, yy + 4);
        ctx.lineTo(xx + 6, yy + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgba('#7a5a34', 0.22);
        ctx.fillRect(xx + 3, yy + 1, 6, 1.2);
      }
    const g = ctx.createLinearGradient(x - 24, 0, x + 24, 0);
    g.addColorStop(0, rgba('#ff8a4a', 0.28));
    g.addColorStop(1, 'rgba(4,2,6,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 26, y - h, 52, h + 2);
  });
  // the crown: stiff, straight-ish fronds with comb-like leaflets, fanned out
  const ty = y - h + 2;
  const fr: number[] = [];
  for (let i = 0; i < 13; i++) fr.push(-Math.PI + 0.15 + (i / 12) * (Math.PI - 0.3) + (r() - 0.5) * 0.1);
  fr.sort((a, b) => Math.abs(Math.cos(b)) - Math.abs(Math.cos(a)));
  for (const a of fr) {
    const L = 80 + r() * 30;
    const ex = x + Math.cos(a) * L;
    const ey = ty + Math.sin(a) * L * 0.75 + L * 0.3;
    const mxp = x + Math.cos(a) * L * 0.5;
    const myp = ty + Math.sin(a) * L * 0.5 - 6;
    const lit = Math.cos(a) < 0 ? 0.7 : 0.25;
    for (let k = 2; k < 18; k++) {
      const t = k / 18;
      const px = (1 - t) ** 2 * x + 2 * (1 - t) * t * mxp + t * t * ex;
      const py = (1 - t) ** 2 * ty + 2 * (1 - t) * t * myp + t * t * ey;
      const ll = 16 * (1 - t * 0.6);
      for (const s of [-1, 1]) {
        ctx.strokeStyle = mix('#08100a', '#7a5a2a', lit * (s < 0 ? 0.8 : 0.35) * (0.6 + r() * 0.4));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(a + s * 0.9) * ll, py + Math.sin(a + s * 0.9) * ll * 0.6 + ll * 0.3);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = '#1a2410';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x, ty);
    ctx.quadraticCurveTo(mxp, myp, ex, ey);
    ctx.stroke();
  }
}
const CYCAD_BOX = { x: LV.cycad.x - 130, y: LV.cycad.y - 160, w: 260, h: TY - (LV.cycad.y - 160) };

/** A tapering ribbon along points (a bone, a root): w0 wide at the start to w1 at the end. */
function taper(pts: [number, number][], w0: number, w1: number): PathFn {
  const n = pts.length - 1;
  const side = (sgn: number) =>
    pts.map((p, i): [number, number] => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n, i + 1)];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      const w = (w0 + (w1 - w0) * (i / n)) / 2;
      return [p[0] - (dy / l) * w * sgn, p[1] + (dx / l) * w * sgn];
    });
  const L = side(1);
  const Rr = side(-1).reverse();
  return (c) => {
    c.beginPath();
    c.moveTo(L[0][0], L[0][1]);
    for (const [x, y] of L) c.lineTo(x, y);
    for (const [x, y] of Rr) c.lineTo(x, y);
    c.closePath();
  };
}

/** The ribs of something enormous, half sunk in the bank: the spine along the top, a row of great curved ribs
 * hanging from it down into the ground, going away from us; old bone stained dark, lit warm along its upper edges by
 * the river behind and the fire. */
function ribs(ctx: Ctx, r: R): void {
  const { x0, x1, y } = LV.ribs;
  const n = 6;
  const spine = (u: number): [number, number] => [x1 - 30 - u * (x1 - x0 - 40), y - 150 + u * 40 - Math.sin(u * Math.PI) * 14];
  const bone = (p: PathFn, depth: number, box: { x: number; y: number; w: number; h: number }) => {
    const base = mix('#7a6a50', '#4a3a30', depth * 0.8);
    p(ctx);
    ctx.fillStyle = base;
    ctx.fill();
    within(ctx, p, () => {
      lay(ctx, noiseMask(5, 20 + Math.round(depth * 10), { cover: 0.5, soft: 0.25, col: '#2a1e1c', w: 40, h: 80 }), box, 0.6);
      const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w * 0.6, box.y + box.h);
      g.addColorStop(0, rgba('#ffb070', 0.3));
      g.addColorStop(0.45, rgba('#000000', 0.15));
      g.addColorStop(1, rgba('#06040a', 0.6));
      ctx.fillStyle = g;
      ctx.fillRect(box.x, box.y, box.w, box.h);
      vfill(ctx, box.x, y - 46, box.w, 50, [[0, 'rgba(4,2,4,0)'], [1, 'rgba(4,2,4,0.8)']]);
    });
    ctx.strokeStyle = rgba('#0a0606', 0.85);
    ctx.lineWidth = 1.2;
    p(ctx);
    ctx.stroke();
  };
  // back to front: the far ribs smaller, in more of the valley's haze
  for (let i = n - 1; i >= 0; i--) {
    const u = i / (n - 1);
    const s = 1 - u * 0.4;
    const [sx, sy] = spine(u);
    const fx = sx + 34 * s + (i === 2 ? -10 : 0);
    const fy = y - u * 8;
    // a rib bows out towards us as it comes down from the spine to the ground
    const pts: [number, number][] = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      const bow = Math.sin(t * Math.PI) * 46 * s * (0.75 + 0.45 * Math.abs(Math.sin(i * 2.1 + 0.5)));
      pts.push([sx + (fx - sx) * t + bow, sy + (fy - sy) * t ** 0.85]);
    }
    const broken = i === 3;
    const P = broken ? pts.slice(0, 11) : pts;
    const p = taper(P, 14 * s, broken ? 9 * s : 8 * s);
    groundShadow(ctx, P[P.length - 1][0] + 6, fy + 1, 22 * s, 4, 0.7, '#040206');
    castShadow(ctx, p, 5 * s, 8, 0.4, '#040206');
    bone(p, u * 0.6, { x: sx - 10, y: sy - 10, w: 110 * s, h: fy - sy + 14 });
    if (broken) {
      // its lower half fallen against the ground
      const q: [number, number][] = [[fx + 20, fy - 2], [fx + 40, fy - 10], [fx + 62, fy - 14]];
      const pb = taper(q, 9 * s, 6 * s);
      bone(pb, u * 0.6, { x: fx, y: fy - 24, w: 80, h: 26 });
    }
    // the soil heaped round its foot
    if (!broken) {
      ctx.fillStyle = '#120c0e';
      ctx.beginPath();
      ctx.ellipse(P[P.length - 1][0], fy + 1, 14 * s, 5, 0, Math.PI, P2);
      ctx.fill();
    }
  }
  // the spine: vertebrae along the top, each a body and a spine-plate, lit along the top
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const [vx, vy] = spine(u);
    const s = 1 - u * 0.4;
    const vp: PathFn = (c) => {
      c.beginPath();
      c.ellipse(vx, vy, 11 * s, 8 * s, -0.2, 0, P2);
      c.moveTo(vx - 4 * s, vy - 6 * s);
      c.lineTo(vx - 2 * s, vy - 22 * s);
      c.lineTo(vx + 4 * s, vy - 20 * s);
      c.lineTo(vx + 5 * s, vy - 6 * s);
    };
    bone(vp, u * 0.6, { x: vx - 12 * s, y: vy - 24 * s, w: 24 * s, h: 34 * s });
  }
  void r;
}
const RIBS_BOX = { x: LV.ribs.x0 - 30, y: LV.ribs.y - 190, w: LV.ribs.x1 - LV.ribs.x0 + 120, h: TY - (LV.ribs.y - 190) };

// ——— the table: a slab of columnar basalt ———

function table(ctx: Ctx, r: R): void {
  const front = LV.front;
  const box = { x: 0, y: TY, w: W, h: front - TY + 4 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  surface(ctx, r, box, '#36303a', { vary: 0.4, cells: 4, mottle: 0.18, strokes: 0, grain: 0.1, grainKind: 'stone', seed: 87, warm: '#54403e', cool: '#1c1a28' });
  // the columns' tops: hexagons in perspective, each its own tone, worn smooth, the joints between them dark and
  // filled with ash
  const S = 0.115;
  const hx = S * Math.sqrt(3);
  const zf = zAt(front + 6);
  const rows = Math.ceil((ZB - zf) / (S * 1.5)) + 2;
  const hexes: [number, number][][] = [];
  for (let j = 0; j < rows; j++) {
    const z = ZB + S * 0.4 - j * S * 1.5;
    for (let i = -8; i <= 8; i++) {
      const X = i * hx + (j % 2 ? hx / 2 : 0) + 0.11;
      const pts: [number, number][] = [];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * P2 + Math.PI / 6;
        // a little irregular, as real columns are
        const jx = Math.sin(i * 3.1 + j * 1.7 + k) * 0.03;
        const jz = Math.cos(i * 2.3 + j * 2.9 + k) * 0.025;
        const PX = X + Math.cos(a) * S + jx;
        const PZ = Math.max(0.6, z + Math.sin(a) * S * 0.98 + jz);
        pts.push([xAt(PX, PZ), yAt(PZ)]);
      }
      hexes.push(pts);
    }
  }
  for (const pts of hexes) {
    const cy = pts.reduce((s, p) => s + p[1], 0) / 6;
    if (cy < TY - 40 || cy > front + 60) continue;
    const near = (cy - TY) / (front - TY);
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = r() < 0.5 ? rgba('#0c0a12', 0.04 + r() * 0.1) : rgba('#8a7870', 0.03 + r() * 0.06);
    ctx.fill();
    // the joint: a dark recessed line, a lit lip on the far edge of the next stone (the light is behind)
    ctx.strokeStyle = rgba('#0a080c', 0.5);
    ctx.lineWidth = 1 + near * 2;
    ctx.stroke();
    ctx.save();
    ctx.translate(0, 1 + near * 1.2);
    ctx.strokeStyle = rgba('#b89a88', 0.07);
    ctx.lineWidth = 0.8 + near;
    ctx.beginPath();
    ctx.moveTo(pts[3][0], pts[3][1]);
    ctx.lineTo(pts[4][0], pts[4][1]);
    ctx.lineTo(pts[5][0], pts[5][1]);
    ctx.stroke();
    ctx.restore();
  }
  // ash settled in the hollows and the joints, thicker at the ends; moss creeping in from the edges
  lay(ctx, noiseMask(5, 89, { cover: 0.3, soft: 0.6, col: '#6a6268' }), box, 0.08);
  for (const [x, w] of [[0, 380], [W - 380, 380]] as const) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    const l = x === 0;
    g.addColorStop(l ? 0 : 1, rgba('#2a3a1c', 0.5));
    g.addColorStop(l ? 1 : 0, rgba('#2a3a1c', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, TY, w, front - TY);
  }
  lay(ctx, noiseMask(9, 91, { cover: 0.25, soft: 0.5, col: '#141a0e', w: 320, h: 70 }), box, 0.18);
  // the eruption's light raking across from far behind: warm along the back, a broad sheen under the crater
  ctx.globalCompositeOperation = 'screen';
  vfill(ctx, 0, TY, W, 70, [[0, rgba('#ff6a2a', 0.22)], [1, 'rgba(255,106,42,0)']]);
  ctx.globalCompositeOperation = 'source-over';
  lightPool(ctx, CR.x, TY + 40, 700, 90, '#ff8a4a', 0.1, 'screen');
  lightPool(ctx, 1300, TY + 20, 700, 60, '#ff5a1a', 0.16, 'screen');
  lightPool(ctx, 1700, TY + 14, 400, 40, '#ff6a24', 0.12, 'screen');
  // the storm's cool light on the near stones
  vfill(ctx, 0, TY + 120, W, front - TY - 120, [[0, 'rgba(60,70,120,0)'], [1, 'rgba(60,70,120,0.08)']]);
  // the bank's shadow along the back
  vfill(ctx, 0, TY, W, 26, [[0, 'rgba(6,4,8,0.45)'], [1, 'rgba(6,4,8,0)']]);
  ctx.restore();
  tableFalloff(ctx, front, 0.42, '#06040a');
  tableSeam(ctx, 0.55, '#08060a', false);
  // the slab's front: the columns' faces, each a pair of planes (one catching the cool storm light, one in shade),
  // the joints between them deep
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, front, W, 1080 - front);
  ctx.clip();
  ctx.fillStyle = '#151216';
  ctx.fillRect(0, front, W, 1080 - front);
  let x = -20;
  let k = 0;
  while (x < W + 20) {
    const cw = 26 + r() * 46;
    const split = 0.4 + r() * 0.2;
    const base = mix('#1c181e', '#2a2228', r());
    ctx.fillStyle = shade(base, 0.05);
    ctx.fillRect(x, front, cw * split, 1080 - front);
    ctx.fillStyle = shade(base, -0.12);
    ctx.fillRect(x + cw * split, front, cw * (1 - split), 1080 - front);
    ctx.fillStyle = rgba('#a8b0d0', 0.04 + r() * 0.06);
    ctx.fillRect(x + 1, front, 1.5, 1080 - front);
    ctx.fillStyle = rgba('#040206', 0.75);
    ctx.fillRect(x + cw - 1.5, front, 2.5, 1080 - front);
    x += cw;
    k++;
  }
  grain(ctx, { x: 0, y: front, w: W, h: 1080 - front }, 'stone', 0.35, 1);
  lay(ctx, noiseMask(14, 95, { cover: 0.3, soft: 0.1, col: '#0a080a', w: 360, h: 18 }), { x: 0, y: front, w: W, h: 1080 - front }, 0.6);
  vfill(ctx, 0, front, W, 1080 - front, [[0, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.55)']]);
  ctx.restore();
  // the top's worn front arris, catching the light
  ctx.fillStyle = rgba('#d8c0b0', 0.3);
  ctx.fillRect(0, front - 2, W, 2);
  crevice(ctx, 0, W, front + 2, 10, 0.4);
}

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.03, '#ff7a40', 0.04, { warm: '#ffb070', cool: '#4a5ad0', a: 0.24 });
}

function shadeOver(ctx: Ctx): void {
  // the HUD's corner calm, the lanes calm, a vignette
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(6,4,8,0.45)');
  g.addColorStop(0.5, 'rgba(6,4,8,0.2)');
  g.addColorStop(1, 'rgba(6,4,8,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
  calmLanes(ctx, 0.1, '#06040a', 140, 640);
  vignetteAll(ctx, 0.62, '#040206');
}

// ——— the stack ———

const PLUME_BOX = { x: 380, y: 0, w: 820, h: CR.y };
const FAR_BOX = { x: 1510, y: 40, w: 400, h: 400 };
const RIVER_BOX = { x: RV.x0 - 40, y: RV.y0 - 24, w: W - RV.x0 + 40, h: LV.ledge - (RV.y0 - 24) };

export const VALLEY: SceneSpec = {
  id: 'trex',
  info: {
    name: 'Lost Valley',
    subtitle: 'Boss: T-REX TOES',
    ambient: [],
    glows: [],
    light: '#ffb070',
    tableTint: '#ffe8d0',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: SKY_H }, draw: sky },
    { id: 'farBolt', box: FAR_BOX, motion: 'slot', draw: () => {} },
    { id: 'farRidges', box: { x: 1050, y: 440, w: W - 1050, h: SKY_H - 440 }, draw: farRidges },
    // the column and the fountain climb behind the crater's front lip: a slot behind it
    { id: 'plume', box: PLUME_BOX, motion: 'slot', draw: () => {} },
    { id: 'eruption', box: PLUME_BOX, stillOnly: true, draw: (c) => eruptionStill(c) },
    { id: 'cone', box: { x: 0, y: CR.y, w: CONE_X1, h: LV.coneFoot + 36 - CR.y }, draw: cone },
    { id: 'rim', box: { x: CR.x - CR.hw - 40, y: CR.y - 16, w: CR.hw * 2 + 80, h: 20 }, draw: rim },
    { id: 'hills', box: { x: 0, y: 520, w: W, h: LV.ledge + 4 - 520 }, draw: hills },
    { id: 'river', box: RIVER_BOX, motion: 'slot', draw: () => {} },
    { id: 'riverStill', box: RIVER_BOX, stillOnly: true, draw: (c) => riverPaint(c, 0) },
    { id: 'banks', box: RIVER_BOX, draw: banks },
    { id: 'ledge', box: { x: 0, y: LV.ledge, w: W, h: TY - LV.ledge }, draw: ledge },
    { id: 'cycad', box: CYCAD_BOX, draw: cycad },
    { id: 'ribs', box: RIBS_BOX, draw: ribs },
    ...LV.ferns.map((f) => ({ id: f.id + 'Trunk', box: trunkBox(f), draw: (c: Ctx, r: R) => trunk(c, r, f) })),
    ...LV.ferns.map((f) => ({ id: f.id, box: crownBox(f), motion: 'sprite' as const, draw: (c: Ctx, r: R) => crown(c, r, f) })),
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'air', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** A pterosaur's frame: w×h, its body at (cx, cy), flying right; wings at phase ph of the beat (0: top of the
 * upstroke). Seen from below and in front: wings spread to the sides, the head turned in profile. */
export const PT = { w: 170, h: 96, cx: 85, cy: 46, n: 12 };

export function pteroFrame(c: Ctx, ph: number): void {
  const T = P2 * ph;
  const { cx } = PT;
  // the body rides up on the downstroke and sinks on the recovery
  const cy = PT.cy + Math.cos(T + 1.2) * 3;
  // the arm leads, the hand lags (the tip whips through after the wrist)
  const e1 = 0.62 * Math.cos(T);
  const e2 = 0.85 * Math.cos(T - 0.7);
  const body = '#1c1418';
  const under = '#6a2c1c';
  for (const s of [-1, 1]) {
    // the far (left, s = -1) wing a touch smaller and darker
    const k = s < 0 ? 0.88 : 1;
    const sx = cx + s * 4;
    const sy = cy - 2;
    const arm = 30 * k;
    const hand = 46 * k * (0.85 + 0.15 * Math.cos(e1));
    const wx = sx + s * Math.cos(e1) * arm;
    const wy = sy - Math.sin(e1) * arm;
    const tx2 = wx + s * Math.cos(e2) * hand;
    const ty2 = wy - Math.sin(e2) * hand;
    // the membrane: the leading edge along the arm and the long finger, the trailing edge sagging back to the hip
    const hipX = cx + s * 2;
    const hipY = cy + 12;
    const sag = 10 + 6 * Math.sin(T + 0.4);
    const mx = (tx2 + hipX) / 2 + s * -4;
    const my = (ty2 + hipY) / 2 + sag;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(wx, wy);
    c.lineTo(tx2, ty2);
    c.quadraticCurveTo(mx, my, hipX, hipY);
    c.closePath();
    const g = c.createLinearGradient(0, Math.min(wy, ty2) - 4, 0, hipY + sag);
    g.addColorStop(0, s < 0 ? '#120c10' : body);
    g.addColorStop(1, s < 0 ? '#3a1a14' : under);
    c.fillStyle = g;
    c.fill();
    // the membrane's fibres, fanning from the finger
    c.strokeStyle = rgba('#000000', 0.25);
    c.lineWidth = 0.7;
    for (let f = 1; f < 4; f++) {
      const u = f / 4;
      c.beginPath();
      c.moveTo(wx + (tx2 - wx) * u, wy + (ty2 - wy) * u);
      c.quadraticCurveTo(mx + (hipX - mx) * (1 - u) * 0.3, my, hipX + (mx - hipX) * u * 0.8, hipY + (my - hipY) * u * 0.6);
      c.stroke();
    }
    // the arm and finger: a thicker bone along the leading edge, lit by the fire below on its underside
    c.strokeStyle = body;
    c.lineWidth = 2.6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(wx, wy);
    c.lineTo(tx2, ty2);
    c.stroke();
    c.strokeStyle = rgba('#ff8a4a', s < 0 ? 0.25 : 0.45);
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(sx, sy + 1.4);
    c.lineTo(wx, wy + 1.4);
    c.lineTo(tx2, ty2 + 1);
    c.stroke();
    // the clawed fingers at the wrist
    c.strokeStyle = body;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(wx, wy);
    c.lineTo(wx + s * 4, wy - 4);
    c.stroke();
  }
  // the body: a small torso, the legs trailing
  c.fillStyle = body;
  c.beginPath();
  c.ellipse(cx, cy + 4, 6, 11, 0, 0, P2);
  c.fill();
  c.strokeStyle = body;
  c.lineWidth = 1.6;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(cx + s * 3, cy + 12);
    c.lineTo(cx + s * 5, cy + 24);
    c.lineTo(cx + s * 7, cy + 26);
    c.stroke();
  }
  // the head in profile: the long beak forward, the crest swept back
  const hx = cx + 3;
  const hy = cy - 10 + Math.cos(T) * 1.2;
  c.beginPath();
  c.moveTo(cx, cy - 4);
  c.quadraticCurveTo(cx + 1, hy + 3, hx, hy);
  c.lineTo(hx + 36, hy + 3.5);
  c.lineTo(hx + 3, hy + 4.5);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(hx + 2, hy - 1);
  c.lineTo(hx - 20, hy - 12);
  c.lineTo(hx - 2, hy + 3);
  c.closePath();
  c.fill();
  c.beginPath();
  c.ellipse(hx + 2, hy + 1, 4.5, 3.5, 0, 0, P2);
  c.fill();
  c.strokeStyle = rgba('#ff8a4a', 0.5);
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(hx + 4, hy + 4.2);
  c.lineTo(hx + 34, hy + 3.8);
  c.stroke();
  c.fillStyle = rgba('#ffb070', 0.8);
  c.fillRect(hx + 3, hy - 0.5, 1.4, 1.4);
}

/** A fern leaflet (shed when the crowns shake): a narrow pointed leaf in one of a few greens, lit along one edge. */
function leafletFrame(c: Ctx, i: number): void {
  const col = ['#22381a', '#2e4a1e', '#4a5a24', '#3a2a14'][i % 4];
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(3, 8);
  c.quadraticCurveTo(8, 4, 14, 7);
  c.quadraticCurveTo(8, 11, 3, 8);
  c.fill();
  c.strokeStyle = rgba('#c8a050', 0.35);
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(4, 7.6);
  c.quadraticCurveTo(8, 5, 13, 6.8);
  c.stroke();
}

registerKitScene(VALLEY, (k: KitLive) => {
  const air = k.slot('air');
  const plume = k.slot('plume');
  const far = k.slot('farBolt');
  const flashes = () => save.settings.flashes && !save.settings.reducedMotion;

  // ——— the eruption: the column (two copies out of step), the fountain in its foot, the glow
  const ashKey = sheet(k, 'lv_ash', ASHF.w, ASHF.h, ASHF.n, (c, ph) => ashFrame(c, ph));
  const colA = new Loop(k, ashKey, ASHF.n, CR.x, CR.y + 6, { into: plume, origin: [ASHF.vx / ASHF.w, 1], scale: 2, fps: 3.2, phase: 4.4 });
  const colB = new Loop(k, ashKey, ASHF.n, CR.x + 30, CR.y + 6, { into: plume, origin: [ASHF.vx / ASHF.w, 1], scale: 1.8, fps: 2.6, phase: 8.5 });
  colB.alpha = 0.55;
  const plumeLit = k.glow(CR.x + 30, CR.y - 70, 200, 0xff6a24, 0.28, { into: plume, sy: 1.1 });
  const fntKey = sheet(k, 'lv_fountain', FNT.w, FNT.h, FNT.n, (c, ph) => fountainFrame(c, ph));
  const fountain = new Loop(k, fntKey, FNT.n, CR.x, CR.y + 6, { into: plume, origin: [0.5, 1], fps: 9 });
  const ventGlow = k.glow(CR.x, CR.y, 130, 0xffa040, 0.55, { into: plume, sy: 0.55 });
  // volcanic lightning inside the column, its flash lighting the smoke
  const boltKey = sheet(k, 'lv_bolt', 120, 220, 4, (c, _p, i) => boltFrame(c, 120, 220, i));
  const pBolt = k.img(boltKey, CR.x + 60, 40, { into: plume, add: true, alpha: 0, origin: [0.5, 0] });
  const pFlash = k.glow(CR.x + 60, 120, 240, 0xc8c0ff, 0, { into: plume });
  // the far storm over the ridges: a bolt now and then, its clouds lit
  const fBolt = k.img(boltKey, 1700, 120, { into: far, add: true, alpha: 0, origin: [0.5, 0] });
  const fFlash = k.glow(1700, 260, 320, 0x9a9aff, 0, { into: far, sy: 0.8 });
  // the whole valley lit up for an instant
  const wash = k.wash(0x8088ff, 0, Phaser.BlendModes.ADD, air);
  type Strike = { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; t: number; on: boolean; s: number; wash: number };
  const strikes: Strike[] = [
    { img: pBolt, glow: pFlash, t: 0, on: false, s: 0, wash: 0.05 },
    { img: fBolt, glow: fFlash, t: 0, on: false, s: 0, wash: 0.03 },
  ];
  const strike = (st: Strike, s: number, x: number, y: number, rot: number, scale: number) => {
    st.img.setFrame(Math.floor(crand() * 4)).setPosition(x, y).setRotation(rot).setScale(scale);
    st.glow.setPosition(x, y + 90 * scale);
    st.t = 0;
    st.on = true;
    st.s = s;
  };
  let nextPlumeBolt = 6 + crand() * 8;
  let nextFarBolt = 3 + crand() * 6;

  // lava bombs: thrown out of the crater on glowing trails, landing on the flanks
  const bombs = new Parts(k, { frame: 'ember', add: true, into: air, max: 60 });
  const sparks = new Parts(k, { frame: 'spark', add: true, into: air, max: 120 });
  const landGlows = Array.from({ length: 8 }, () => k.glow(0, 0, 26, 0xff6a20, 0, { into: air, sy: 0.5 }));
  const glowLife = landGlows.map(() => 0);
  let glowNext = 0;
  const G = 520;
  const bomb = (power = 1) => {
    const side = crand() < 0.5 ? -1 : 1;
    const vx = side * (40 + crand() * 170) * (0.7 + power * 0.3);
    const vy = -(300 + crand() * 260) * (0.8 + power * 0.25);
    const x0 = CR.x + (crand() - 0.5) * 50;
    const y0 = CR.y - 4;
    // where it comes down on the cone
    let t = 0.2;
    let x = x0;
    let y = y0;
    while (t < 6) {
      x = x0 + vx * t;
      y = y0 + vy * t + 0.5 * G * t * t;
      if (vy + G * t > 0 && y >= coneTop(x) + 4) break;
      t += 0.02;
    }
    const floor = Math.min(560, coneTop(x) + 4);
    bombs.spawn({
      x: x0, y: y0, vx, vy, life: t + 0.3, r0: 5 + crand() * 3, r1: 3.5, a: 1, tint: crand() < 0.4 ? 0xffd070 : 0xff8a2a, grav: G, streak: 0.03, floor, fade: 0.02,
      onFloor: (lx, ly) => {
        // a splash of sparks and a glow that fades as the spatter cools
        for (let i = 0; i < 5; i++) sparks.spawn({ x: lx, y: ly - 2, vx: (crand() - 0.5) * 160, vy: -40 - crand() * 120, life: 0.5 + crand() * 0.4, r0: 1.8, r1: 0.8, a: 1, tint: 0xffb050, grav: 600, streak: 0.012, fade: 0.02 });
        const i = glowNext++ % landGlows.length;
        landGlows[i].setPosition(lx, ly);
        glowLife[i] = 1;
      },
    });
  };
  const bombRate = new Rate();
  let surge = 0;

  // ——— the river: the melt and two sets of crust plates scrolling at their own rates, in its rotated strip
  const tileW = 512;
  const TH = RV.w;
  const melt = k.tex('lv_melt', tileW, TH, (c) => {
    const g = c.createLinearGradient(0, 0, 0, TH);
    g.addColorStop(0, '#8a1e06');
    g.addColorStop(0.3, MOLTEN.edge);
    g.addColorStop(0.5, MOLTEN.body);
    g.addColorStop(0.7, MOLTEN.edge);
    g.addColorStop(1, '#8a1e06');
    c.fillStyle = g;
    c.fillRect(0, 0, tileW, TH);
    // brighter threads in the current
    for (let i = 0; i < 30; i++) {
      const x = (i * 97) % tileW;
      const y = 3 + ((i * 53) % (TH - 6));
      const w = 30 + ((i * 31) % 70);
      for (const dx of [0, -tileW]) {
        const gg = c.createLinearGradient(x + dx, 0, x + dx + w, 0);
        gg.addColorStop(0, 'rgba(255,248,210,0)');
        gg.addColorStop(0.5, 'rgba(255,248,210,0.55)');
        gg.addColorStop(1, 'rgba(255,248,210,0)');
        c.fillStyle = gg;
        c.fillRect(x + dx, y, w, 1.6);
      }
    }
  });
  const crustTex = (key: string, n: number, seed: number) =>
    k.tex(key, tileW, TH, (c) => {
      for (let i = 0; i < n; i++) {
        const x = (i * 131 + seed * 17) % tileW;
        const y = ((i * 7 + seed) % (TH - 6)) + 3;
        const w = 12 + ((i * 47 + seed) % 34);
        const h = 3 + ((i * 13) % 5);
        for (const dx of [0, -tileW, tileW]) {
          crustPlate(c, x + dx, y, w * 1.3, h * 1.6, i + seed);
        }
      }
    });
  const riverC = k.sc.add.container(RV.x0, RV.y0).setRotation(RIV_ANG);
  k.slot('river').add(riverC);
  const flow = new Flow(k, -10, -TH / 2, RIV_LEN + 20, TH, [
    { key: melt, v: 38 },
    { key: melt, v: 60, alpha: 0.45, add: true, wob: 1.5 },
    { key: crustTex('lv_crustA', 40, 3), v: 30 },
    { key: crustTex('lv_crustB', 26, 11), v: 24 },
  ], riverC);
  const [mA, mB, cA, cB] = flow.images;
  // hottest where it wells out at the cone's foot; the crust closing over it downstream
  mA.setAlpha(1, 0.85, 1, 0.85);
  mB.setAlpha(0.45, 0.05, 0.45, 0.05);
  cA.setAlpha(0.7, 1, 0.7, 1);
  cB.setAlpha(0.35, 1, 0.35, 1);
  const riverGlow = k.glow(1400, riverY(1400), 620, 0xff5a14, 0.1, { into: air, sy: 0.08 });
  // smoke curling off it, lit from below
  const wispKey = sheet(k, 'lv_wisp', 50, 110, 12, (c, ph) => smokeFrame(c, 50, 110, ph, { lit: '#ff8a4a', body: '#4a3236', shade: '#120c14', wind: 0.4, lobes: 7, a: 0.38, toLight: [0, 1], seed: 4 }));
  const wisps = [1040, 1330, 1620].map((x, i) => new Loop(k, wispKey, 12, x, riverY(x) - 2, { into: air, origin: [0.5, 1], scale: 1.4 + i * 0.15, fps: 5, phase: i * 4 }));
  const embers = new Parts(k, { frame: 'ember', add: true, into: air, max: 50 });
  const emberRate = new Rate();

  // ——— the tree ferns' crowns on their springs, leaflets shed when they're shaken
  const crowns = LV.ferns.map((f, i) => {
    const img = k.pivot(k.sprite(f.id), f.top[0], f.top[1]);
    return { f, sw: new Swing(img, { k: 5 + i, c: 0.9, idle: 0.012, seed: i * 2.1, speed: 0.55 }) };
  });
  const leafKey = sheet(k, 'lv_leaf', 16, 16, 4, (c, _p, i) => leafletFrame(c, i));
  const leaves = new Parts(k, { frame: 'mote', sheet: { key: leafKey, n: 4, half: 8 }, into: air, max: 60 });
  const shed = (f: (typeof LV.ferns)[number], n: number) => {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI + crand() * Math.PI;
      const d = f.len * (0.3 + crand() * 0.7);
      leaves.spawn({ x: f.top[0] + Math.cos(a) * d, y: f.top[1] + 20 + crand() * f.len * 0.4, vx: (crand() - 0.5) * 50, vy: 10 + crand() * 30, life: 2.2 + crand() * 1.5, r0: 7, a: 0.95, tint: 0xffffff, grav: 60, drag: 1.2, spin: (crand() - 0.5) * 6, floor: TY - 6, fade: 0.05 });
    }
  };

  // ——— ash drifting down
  const ash = new Parts(k, { frame: 'flake', into: air, max: 70 });
  const ashRate = new Rate();

  // ——— pterosaurs: crossing every so often, flapping in bouts and gliding between, banking as they climb or sink
  const ptKey = sheet(k, 'lv_ptero', PT.w, PT.h, PT.n, (c, ph) => pteroFrame(c, ph));
  type Flyer = { l: Loop; x: number; y: number; vx: number; vy: number; dir: number; s: number; wait: number; beat: number; flap: number; ph: number; on: boolean };
  const flyers: Flyer[] = [0.62, 0.4].map((s, i) => {
    const l = new Loop(k, ptKey, PT.n, -300, 0, { into: air, origin: [PT.cx / PT.w, PT.cy / PT.h], scale: s });
    if (i) l.each((im) => im.setTint(0xb8a8b8));
    return { l, x: -300, y: 0, vx: 0, vy: 0, dir: 1, s, wait: 2 + i * 9, beat: 0, flap: 1.2, ph: 0, on: false };
  });
  const launch = (f: Flyer) => {
    f.dir = crand() < 0.5 ? 1 : -1;
    f.x = f.dir > 0 ? -120 : W + 120;
    f.y = 120 + crand() * 140;
    f.vx = f.dir * (90 + crand() * 50) * (0.6 + f.s);
    f.vy = 0;
    f.on = true;
    f.flap = 1 + crand();
    f.l.each((im) => im.setFlipX(f.dir < 0).setVisible(true));
  };

  return {
    impact(x, _y, p) {
      for (const c of crowns) c.sw.kick((x < c.f.top[0] ? 1 : -1) * (0.04 + 0.1 * p));
      for (const c of crowns) if (p > 0.3) shed(c.f, Math.round(1 + p * 4));
      surge = Math.min(1.4, surge + 0.4 + p * 0.8);
      for (let i = 0; i < 2 + p * 6; i++) bomb(0.8 + p * 0.5);
      if (p > 0.6 && flashes() && crand() < 0.7) strike(strikes[0], 0.7 + p * 0.3, CR.x + 40 + crand() * 120, 10 + crand() * 60, (crand() - 0.5) * 0.8, 0.7 + crand() * 0.3);
      for (const f of flyers) if (f.on) f.flap = Math.max(f.flap, 1.2);
    },
    update(dt, t) {
      // ——— the eruption
      surge = Math.max(0, surge - dt * 0.6);
      const fl = flicker(t * 0.7, 3);
      const pulse = 0.85 + wander(t, 5, 0.3) * 0.15 + surge * 0.3;
      colA.step(dt, calm() * (1 + surge * 0.5));
      colB.step(dt, calm() * (1 + surge * 0.4));
      fountain.step(dt, 1 + surge * 0.6);
      fountain.each((im) => im.setScale(0.9 + pulse * 0.12 + surge * 0.25, 0.85 + pulse * 0.2 + surge * 0.45));
      ventGlow.setAlpha(0.45 + fl * 0.12 + surge * 0.25);
      plumeLit.setAlpha(0.2 + fl * 0.06 + surge * 0.15);
      bombRate.tick((1.1 + surge * 4) * calm(), dt, () => bomb(0.7));
      bombs.update(dt);
      sparks.update(dt);
      for (let i = 0; i < landGlows.length; i++) {
        glowLife[i] = Math.max(0, glowLife[i] - dt * 0.5);
        landGlows[i].setAlpha(glowLife[i] ** 1.5 * 0.7);
      }
      // ——— lightning: in the column now and then, far off over the ridges more often
      nextPlumeBolt -= dt;
      nextFarBolt -= dt;
      if (flashes()) {
        if (nextPlumeBolt < 0) {
          strike(strikes[0], 0.5 + crand() * 0.4, CR.x + 50 + crand() * 140, crand() * 70, (crand() - 0.5) * 1, 0.55 + crand() * 0.35);
          nextPlumeBolt = 7 + crand() * 12;
        }
        if (nextFarBolt < 0) {
          strike(strikes[1], 0.5 + crand() * 0.5, 1580 + crand() * 260, 60 + crand() * 60, (crand() - 0.5) * 0.3, 0.9 + crand() * 0.4);
          nextFarBolt = 5 + crand() * 9;
        }
      }
      let w = 0;
      for (const st of strikes) {
        if (!st.on) continue;
        st.t += dt;
        // a flash, a flicker off, a second flash, dying away
        const u = st.t;
        const a = u < 0.08 ? 1 : u < 0.14 ? 0.15 : u < 0.24 ? 0.85 : Math.max(0, 0.85 - (u - 0.24) * 3);
        st.img.setAlpha(a * st.s);
        st.glow.setAlpha(a * st.s * 0.5);
        w = Math.max(w, a * st.s * st.wash);
        if (u > 0.6) {
          st.on = false;
          st.img.setAlpha(0);
          st.glow.setAlpha(0);
        }
      }
      wash.setAlpha(w);
      // ——— the river
      flow.update(dt, t, 1 + surge * 0.15);
      riverGlow.setAlpha(0.08 + flicker(t * 0.4, 7) * 0.03);
      for (const l of wisps) l.step(dt, calm());
      emberRate.tick(5 * calm(), dt, () => {
        const x = RV.x0 + 40 + crand() * (W - RV.x0);
        embers.spawn({ x, y: riverY(x) - 4, vx: 8 + (crand() - 0.5) * 20, vy: -30 - crand() * 50, life: 2 + crand() * 2, r0: 1.4 + crand(), r1: 0.5, a: 0.9, tint: crand() < 0.5 ? 0xff8a3a : 0xffc060, drag: 0.4, grav: -10, fade: 0.1 });
      });
      embers.update(dt);
      // ——— the ferns and the ash
      for (const c of crowns) c.sw.update(dt, t);
      leaves.update(dt);
      ashRate.tick(3 * calm(), dt, () => {
        const x = crand() * W;
        ash.spawn({ x, y: -10, vx: 14 + crand() * 16, vy: 22 + crand() * 18, life: 14, r0: 1.4 + crand() * 1.4, a: 0.55, tint: crand() < 0.7 ? 0x5a5258 : 0x8a7a78, spin: (crand() - 0.5) * 3, floor: TY - 2, fade: 0.05 });
      });
      ash.update(dt);
      // ——— the pterosaurs
      for (const f of flyers) {
        if (!f.on) {
          f.wait -= dt;
          if (f.wait < 0) launch(f);
          continue;
        }
        // flap in bouts (climbing), glide between them (sinking slowly), the beat held level in the glide
        f.beat += dt;
        if (f.flap > 0) {
          f.flap -= dt;
          f.ph = (f.ph + dt * 2.6 * (1 + surge * 0.3)) % 1;
          f.vy += (-26 - f.vy) * dt * 1.5;
          if (f.flap <= 0) f.beat = 0;
        } else {
          // ease the wings to the glide pose and hold them there
          const glidePh = 0.22;
          f.ph += ((((glidePh - f.ph + 1.5) % 1) - 0.5) * Math.min(1, dt * 5));
          f.ph = (f.ph + 1) % 1;
          f.vy += (16 - f.vy) * dt * 0.8;
          if (f.beat > 2.2 + (f.s < 0.5 ? 1.5 : 0)) f.flap = 0.9 + crand() * 1.2;
        }
        f.x += f.vx * dt;
        f.y = Math.max(70, Math.min(320, f.y + f.vy * dt));
        f.l.show(f.ph * PT.n);
        f.l.each((im) => im.setPosition(f.x, f.y).setRotation(f.dir * f.vy * 0.004));
        if ((f.dir > 0 && f.x > W + 140) || (f.dir < 0 && f.x < -140)) {
          f.on = false;
          f.wait = 10 + crand() * 16;
          f.l.each((im) => im.setVisible(false));
        }
      }
    },
  };
});

