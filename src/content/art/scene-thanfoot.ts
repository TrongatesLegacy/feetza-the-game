// Titan's Throne (Thanfoot's arena, Act 7's finale: wave 70), redrawn with the location kit (src/art/scene) in the act's
// pulp-comic print (src/art/scene/print.ts), like Metropizza Rooftops, the Doom Lab and Downtown Ruins
// (scene-metropizza.ts, scene-doomlab.ts, scene-doomstomp.ts): bold ink weighted on the shadow side, flat colour
// fields modelled in halftone dots at the printed screen angles, Ben-Day skies, Kirby krackle. The key light is a
// white star off the top left (its rays fan in from the corner: every left face lit, the right faces dropping into a
// violet dot screen); the halved world's molten core throws a hot orange rim from the right.
//
// The throne world at the edge of everything. Deep space printed in navy dots, a comic nebula of magenta and teal
// billows over the left, and out of its heart a river of cosmic energy, crawling with Kirby krackle, flowing across the
// sky into the crown of the throne. Up on the right, the looming planet: a world cut exactly in half
// (perfectly balanced), the near hemisphere's oceans and continents in dots, its flat cut face showing crust, mantle
// and a white-hot core, the other half gone to drifting rubble and a halftone dust. In the middle, on a dais of three
// steps on the throne-rock, the throne itself: a titan's seat of dark meteoric stone trimmed in old gold, its arms
// carved with sunbursts and crowned by stone orbs in gold collars, its back a crown of six faceted blades over a carved
// ring of six empty sockets (the stones were taken from here: only the faintest trace of each one's colour is left, so
// the fight's stones are the only coloured ones on screen), a teal cloak thrown over the seat and down the steps. Two
// tall tripod braziers burn star-fire either side. Left, an obelisk carved with the six stones' glyphs; right, a broken
// fluted pillar and its fallen drums. The platform's far edge drops away into space, floating rocks beyond it. The
// table is the dais's slab of polished star-marble (mica flecks, gold veins, a star chart engraved and filled with
// gold), with an open reliquary casket with six empty settings, and a Metropizza box half turned to dust.
//
// Live, the heroes:
// - the halved world: its cut face churning (12 painted frames: convection cells swirling through the mantle, light
//   cracking along the core's boundary, the core boiling), its core breathing light, rubble drifting off the cut and
//   tumbling away (painted lit chips), molten drops flung off the face; a stomp makes it spit a shower of them;
// - the star-fire braziers: comic flames painted at 12 phases in violet, magenta, cyan and a white core, Kirby
//   krackle rising through them, licks breaking off the tips; their light on the throne and the floor breathing,
//   sparks rising; a stomp flares them and throws a burst of sparks;
// - the energy river: krackle crackling along it (4 painted frames per node, reshuffling), motes of light flowing down
//   it into the crown, the nebula breathing; comic shooting stars streaking the clear sky.
// Also: the twinkling printed stars, dust lifting off the
// throne's steps when he stomps, and the box's dust drifting away off the table. An arena: one wave, no progression.
// The act's layer (src/game/acts/act7.ts) leaves the light and the sky to this scene when animated; with animated
// stages off it keeps its nebula pulse and falling stars, placed on this art (TF).
// (The old art is kept in scenes-act7.ts for the before/after page.)

import { type Box, type Ctx, type PathFn, type R, TY, W, calmLanes, castShadow, crevice, ellPath, glowAt, gradeAll, groundShadow, lightPool, polyPath, rectPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { nebula } from '../../art/scene/space';
import { benDay, dots, dotsIn, flat, hatch, ink, linTone, speedLines } from '../../art/scene/print';
import { makeCanvas, mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, registerKitScene, wander } from '../../game/sceneLive';
import { Loop, Parts, Rate, sheet } from '../../game/sceneAnim';
import { BLOCK, INK, P2, comicCloud, smooth, starField } from './scene-metropizza';

// ——— layout (the act's still-mode nebula and falling stars use it too) ———

export const TF = {
  /** The throne-rock's far edge (space below it is hidden), the table's front edge. */
  horizon: 604,
  front: 1040,
  /** The halved world: centre, radius, and the cut face's width as a share of the radius. */
  world: { x: 1560, y: 236, r: 190, fx: 0.42 },
  /** The nebula's heart (the act's still-mode glow sits on it). */
  nebula: { x: 470, y: 300 },
  /** Where falling stars run in the clear sky (the act's still mode, and this scene's own comets). */
  starLane: { x0: 300, x1: 640, y0: 30, y1: 90, dx: 300, dy: 170 },
  throne: { x: 960 },
  braziers: [
    { x: 560, foot: 714, bowl: 516 },
    { x: 1360, foot: 714, bowl: 516 },
  ],
  obelisk: { x: 214, foot: 702 },
  pillar: { x: 1722, foot: 700, top: 440 },
  table: { casket: { x: 150, y: 812 }, box: { x: 1790, y: 812 } },
};

const STONE = '#34335f';
const STONE_LIT = '#7472b0';
const STONE_DK = '#17163a';
const SHADE = '#0e0a28';
const GOLD = '#b8862e';
const GOLD_LIT = '#f4d27a';
const GOLD_DK = '#5a3a10';
const CORE = '#ff7a32';
const STONES = ['#b04dff', '#3a8dff', '#ff3a4a', '#ff9a1c', '#3ddc6a', '#ffd23f'];

const VX = 960;
const HY = 300;
/** An x on a line at depth y0, carried back to depth y along the lines to the vanishing point. */
const at = (x: number, y0: number, y: number) => VX + (x - VX) * ((y - HY) / (y0 - HY));

// ——— print helpers for carved stone ———

/** The band along a shape's edges that face away from (dx, dy): inside the shape, outside it shifted by (dx, dy). */
function edgeBand(ctx: Ctx, path: PathFn, dx: number, dy: number, col: string): void {
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.translate(dx, dy);
  path(ctx);
  ctx.translate(-dx, -dy);
  ctx.rect(-4000, -4000, 12000, 12000);
  ctx.clip('evenodd');
  ctx.fillStyle = col;
  ctx.fillRect(-4000, -4000, 12000, 12000);
  ctx.restore();
}

interface BlockOpts {
  base?: string;
  lit?: string;
  dark?: string;
  /** The shade's dot tone across the box: from t0 at the lit side to t1 at the far side. */
  t0?: number;
  t1?: number;
  /** Lit edge width (top and left), shade edge width (bottom and right). */
  bevel?: number;
  /** The halved world's warm rim on the right edges (0 none). */
  rimA?: number;
  inkW?: number;
  step?: number;
}

/** A carved block in the print: a flat stone colour, a lit bevel on its top-left edges and a dark one on its
 * bottom-right, the shade in dots deepening to the right and down, the core's warm rim on its right edge, inked. */
function block(ctx: Ctx, path: PathFn, box: Box, o: BlockOpts = {}): void {
  const bv = o.bevel ?? 5;
  flat(ctx, path, o.base ?? STONE, 0, INK);
  edgeBand(ctx, path, bv, bv, o.lit ?? STONE_LIT);
  edgeBand(ctx, path, -bv * 0.8, -bv * 0.8, o.dark ?? STONE_DK);
  within(ctx, path, () => {
    dots(ctx, box, linTone(box.x + box.w * 0.15, box.y + box.h * 0.1, box.x + box.w, box.y + box.h, o.t0 ?? 0.05, o.t1 ?? 0.7), SHADE, { step: o.step ?? 6, angle: 0.79, a: 0.8 });
  });
  if (o.rimA) edgeBand(ctx, path, -3, 1, rgba(CORE, o.rimA));
  ink(ctx, path, o.inkW ?? 3, INK, 0.6);
}

/** Old gold trim: flat gold, a bright lit edge, the shade in brown dots, inked thin. */
function gold(ctx: Ctx, path: PathFn, box: Box, inkW = 2): void {
  flat(ctx, path, GOLD, 0, INK);
  edgeBand(ctx, path, 2.5, 2.5, GOLD_LIT);
  within(ctx, path, () => dots(ctx, box, linTone(box.x + box.w * 0.3, box.y, box.x + box.w, box.y + box.h, 0, 0.75), GOLD_DK, { step: 4, angle: 0.79, a: 0.8 }));
  ink(ctx, path, inkW, INK, 0.5);
}

/** A comic billow of nebula, rotated along the energy's flow. */
function billow(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, rot: number, pal: { body: string; lit: string; shade: string; ink: string; dot: string }, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  comicCloud(ctx, r, 0, 0, w, h, pal, a);
  ctx.restore();
}

/** A printed four-point star (a sparkle), its arms tapering. */
function sparkle(ctx: Ctx, x: number, y: number, s: number, col: string, a = 1): void {
  ctx.fillStyle = rgba(col, a);
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.12, x + s, y);
  ctx.quadraticCurveTo(x + s * 0.12, y + s * 0.12, x, y + s);
  ctx.quadraticCurveTo(x - s * 0.12, y + s * 0.12, x - s, y);
  ctx.quadraticCurveTo(x - s * 0.12, y - s * 0.12, x, y - s);
  ctx.fill();
}

// ——— the energy river: out of the nebula's heart, across the sky, into the throne's crown ———

const RIVER_PTS: [number, number, number][] = [
  [-40, 540, 30],
  [110, 470, 44],
  [250, 420, 62],
  [420, 352, 70],
  [560, 268, 54],
  [690, 222, 38],
  [810, 190, 24],
  [895, 152, 13],
  [952, 128, 6],
];

/** The river sampled along a smooth curve: [x, y, half-width, tangent angle]. */
export const RIVER: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const P = RIVER_PTS;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 10; k++) {
      const t = k / 10;
      const t2 = t * t;
      const t3 = t2 * t;
      const cr = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * t, 0]);
    }
  }
  const last = P[P.length - 1];
  out.push([last[0], last[1], last[2], 0]);
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 1)];
    const b = out[Math.min(out.length - 1, i + 1)];
    out[i][3] = Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
  return out;
})();

/** The river's ribbon, scaled across its width (1 = its edge), with a wobble along it. */
function ribbon(k: number, wob = 0): PathFn {
  return (c) => {
    c.beginPath();
    const L: [number, number][] = [];
    const Rt: [number, number][] = [];
    RIVER.forEach(([x, y, hw, a], i) => {
      const w = hw * k * (1 + 0.16 * Math.sin(i * 0.7 + wob) + 0.08 * Math.sin(i * 1.9 + wob * 2));
      L.push([x - Math.sin(a) * w, y + Math.cos(a) * w]);
      Rt.push([x + Math.sin(a) * w, y - Math.cos(a) * w]);
    });
    L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = Rt.length - 1; i >= 0; i--) c.lineTo(Rt[i][0], Rt[i][1]);
    c.closePath();
  };
}

/** Krackle along the river: clusters of black blobs in the energy, each rimmed white where the light wraps it. */
function krackleBlobs(ctx: Ctx, r: R, x: number, y: number, s: number, n: number): void {
  for (let m = 0; m < n; m++) {
    const bx = x + (r() - 0.5) * 14 * s;
    const by = y + (r() - 0.5) * 14 * s;
    const br = (2 + r() * 4.5) * s;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bx, by, br + 1.8, 0, P2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(bx, by, br, br * (0.7 + r() * 0.5), r() * 3, 0, P2);
    ctx.fill();
  }
}

/** Where the krackle clusters sit along the river: [x, y, scale] (painted in the still; the live layer crackles each). */
const KR_SPOTS: [number, number, number][] = (() => {
  const r = rng(4242);
  const out: [number, number, number][] = [];
  for (let i = 4; i < RIVER.length - 14; i += 4) {
    const [x, y, hw, a] = RIVER[i];
    if (r() > 0.75) continue;
    // a cluster of two or three groups round each node, big where the river is wide
    for (let g = 0; g < 2 + (hw > 45 ? 1 : 0); g++) {
      const off = (r() - 0.5) * hw * 1.1;
      const along = (r() - 0.5) * 30;
      const px = x - Math.sin(a) * off + Math.cos(a) * along;
      // small where the left lane's feet come down (x 360…540), full size either side of it
      const lane = px > 360 && px < 540 ? 0.45 : 1;
      out.push([px, y + Math.cos(a) * off + Math.sin(a) * along, (0.6 + hw / 58) * lane]);
    }
  }
  return out;
})();

/** One krackle cluster (variant i) centred at (x, y): three to five black blobs rimmed white. */
function krackle(c: Ctx, x: number, y: number, s: number, i: number): void {
  const r = rng(91 + i * 17);
  krackleBlobs(c, r, x, y, s, 3 + (i % 3));
}

function krackleStill(ctx: Ctx): void {
  KR_SPOTS.forEach(([x, y, s], i) => krackle(ctx, x, y, s, i % KR_N));
}

function river(ctx: Ctx, r: R): void {
  // the energy's glow in the air round it
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.5;
  ribbon(2.6)(ctx);
  ctx.fillStyle = rgba('#3a7ab8', 0.35);
  ctx.fill();
  ctx.globalAlpha = 1;
  ribbon(1.6, 1)(ctx);
  ctx.fillStyle = rgba('#5ab8e0', 0.3);
  ctx.fill();
  ctx.restore();
  // the ribbon: inked cyan body, a pale core
  const fade = (col: string, a0: number, a1: number) => {
    const g = ctx.createLinearGradient(420, 0, 940, 0);
    g.addColorStop(0, rgba(col, a0));
    g.addColorStop(1, rgba(col, a1));
    return g;
  };
  flat(ctx, ribbon(1, 0.4), '#3e9ccc', 3, '#0c1440', 0.4);
  within(ctx, ribbon(1, 0.4), () => {
    dots(ctx, { x: -40, y: 100, w: 1020, h: 460 }, (x, y) => 0.18 + 0.22 * Math.sin(x * 0.021 + y * 0.013) ** 2, '#1c4a9a', { step: 6, angle: 0.26, a: 0.6 });
  });
  flat(ctx, ribbon(0.5, 2), fade('#8ad8f4', 1, 0.25), 0, INK);
  flat(ctx, ribbon(0.16, 3), fade('#e8fbff', 1, 0.1), 0, INK);
  // dimmed where it runs in behind the boss bar
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ribbon(1.05, 0.4)(ctx);
  ctx.clip();
  vfill(ctx, 500, 100, 460, 160, [[0, 'rgba(10,14,50,0.45)'], [1, 'rgba(10,14,50,0)']]);
  ctx.restore();
  // spray: energy beads splitting off its edges
  for (let i = 3; i < RIVER.length - 3; i++) {
    if (r() > 0.4) continue;
    const [x, y, hw, a] = RIVER[i];
    const side = r() < 0.5 ? -1 : 1;
    const d = hw * (1.25 + r() * 0.9) * side;
    const bx = x - Math.sin(a) * d;
    const by = y + Math.cos(a) * d;
    const s = 2 + r() * 4;
    flat(ctx, ellPath(bx, by, s, s), '#a8ecff', 1.4, '#0c1440', 0);
    if (s > 4) krackleBlobs(ctx, r, bx, by, 0.3, 1);
  }
}

// ——— the sky ———

const SKY_BOX = { x: 0, y: 0, w: W, h: TF.horizon + 6 };
const NEB_MAG = { body: '#a8348e', lit: '#e070c0', shade: '#4a145e', ink: '#1e0830', dot: '#16062a' };
const NEB_TEAL = { body: '#24789a', lit: '#5ac8dc', shade: '#14345e', ink: '#081634', dot: '#06102a' };
const NEB_VIO = { body: '#5a3aa8', lit: '#8a6ad8', shade: '#241858', ink: '#0e0a2a', dot: '#0a0622' };

function sky(ctx: Ctx, r: R): void {
  const hz = TF.horizon + 6;
  // deep space: blue-black overhead, through indigo, to a violet-rose glow low over the rock
  vfill(ctx, 0, 0, W, hz, [[0, '#03051a'], [0.3, '#0a0e36'], [0.62, '#1a1850'], [0.86, '#342264'], [1, '#4c2c6c']]);
  // the halved world's heat on the right, the key star's cold light in the top left
  const wg = ctx.createRadialGradient(TF.world.x, TF.world.y, 60, TF.world.x, TF.world.y, 900);
  wg.addColorStop(0, 'rgba(255,120,60,0.26)');
  wg.addColorStop(0.5, 'rgba(200,70,90,0.08)');
  wg.addColorStop(1, 'rgba(200,70,90,0)');
  ctx.fillStyle = wg;
  ctx.fillRect(0, 0, W, hz);
  const kg = ctx.createRadialGradient(-100, -80, 20, -100, -80, 900);
  kg.addColorStop(0, 'rgba(170,200,255,0.3)');
  kg.addColorStop(1, 'rgba(170,200,255,0)');
  ctx.fillStyle = kg;
  ctx.fillRect(0, 0, W, hz);
  // printed: fat navy Ben-Day dots thinning down from the zenith; rose dots gathering low
  benDay(ctx, { x: 0, y: 0, w: W, h: 380 }, '#010212', 0.62, 13, 0.55, 0.04, 0.79);
  dots(ctx, { x: 0, y: 360, w: W, h: hz - 360 }, (x, y) => smooth(360, hz, y) * (0.22 + 0.12 * smooth(900, 0, Math.abs(x - 960))), '#e05aa8', { step: 11, angle: 1.31, a: 0.34 });
  // the key star's rays fanning in from the corner
  speedLines(ctx, r, -140, -90, 220, 1500, 46, '#dce8ff', 0.07, 0.1, 1.4);
  // the nebula: soft light first, then the printed billows over it along the flow
  softNebula(ctx, r);
  dots(ctx, { x: 0, y: 80, w: 1100, h: 520 }, (x, y) => 0.4 * (1 - smooth(0, 520, Math.hypot(x - TF.nebula.x, (y - TF.nebula.y) * 1.6))), '#ff8ad8', { step: 9, angle: 1.31, a: 0.3 });
  const bl: [number, number, number, number, number, typeof NEB_MAG, number][] = [
    [110, 300, 360, 62, -0.5, NEB_TEAL, 0.85],
    [400, 214, 380, 62, -0.4, NEB_TEAL, 0.82],
    [720, 150, 300, 48, -0.35, NEB_VIO, 0.7],
  ];
  for (const [x, y, w, h, rot, pal, a] of bl) billow(ctx, r, x, y, w, h, rot, pal, a);
  // under the river, the nebula's magenta glow printed in a coarse screen, thinning out at its edges
  dots(ctx, { x: 0, y: 260, w: 900, h: 340 }, (x, y) => {
    const u = (y - (430 - x * 0.36)) / 90;
    const n = 0.5 + 0.5 * Math.sin(x * 0.02 + y * 0.03) * Math.sin(x * 0.011 - y * 0.017);
    return Math.max(0, 1 - u * u) * (0.22 + 0.3 * n) * (1 - smooth(500, 900, x));
  }, '#d04aa8', { step: 8, angle: 1.31, a: 0.55 });
  // stars: a dense field, a few bright printed ones and starbursts
  starField(ctx, r, 0, 0, W, hz, 260, 0.85);
  for (const [x, y, s] of TWINKLES) {
    glowAt(ctx, x, y, s * 3, '#bcd8ff', 0.35);
    sparkle(ctx, x, y, s, '#ffffff', 0.95);
  }
  river(ctx, r);
}

/** The nebula's soft light (screened over the sky), painted on its own canvas and feathered out at its edges. */
function softNebula(ctx: Ctx, r: R): void {
  const k = 0.5;
  const box = { x: -80, y: -40, w: 1340, h: TF.horizon + 50 };
  const [c, g] = makeCanvas(box.w * k, box.h * k);
  g.scale(k, k);
  g.translate(-box.x, -box.y);
  nebula(g, r, box, ['#b8308e', '#2898b8', '#5a38c0'], 0.5, 9);
  g.globalCompositeOperation = 'destination-in';
  g.translate(TF.nebula.x, TF.nebula.y);
  g.rotate(-0.42);
  g.scale(1.5, 0.62);
  const m = g.createRadialGradient(0, 0, 0, 0, 0, 520);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(0.55, 'rgba(0,0,0,0.75)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(-2000, -2000, 4000, 4000);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(c, box.x, box.y, box.w, box.h);
  ctx.restore();
}

/** The printed stars the live layer twinkles. */
const TWINKLES: [number, number, number][] = [
  [690, 74, 9],
  [1120, 96, 7],
  [1300, 470, 8],
  [92, 120, 10],
  [1880, 470, 7],
  [560, 560, 6],
  [1840, 140, 6],
];

// ——— the halved world ———

const W0 = TF.world;
const ERX = W0.r * W0.fx;
const WORLD_BOX = { x: W0.x - W0.r - 140, y: W0.y - W0.r - 140, w: W0.r * 2 + 520, h: W0.r * 2 + 260 };
const halfDisc: PathFn = (c) => {
  c.beginPath();
  c.arc(W0.x, W0.y, W0.r, Math.PI / 2, Math.PI * 1.5);
  c.closePath();
};
const worldSil: PathFn = (c) => {
  c.beginPath();
  c.arc(W0.x, W0.y, W0.r, Math.PI / 2, Math.PI * 1.5);
  c.ellipse(W0.x, W0.y, ERX, W0.r, 0, -Math.PI / 2, Math.PI / 2);
  c.closePath();
};

function world(ctx: Ctx, r: R): void {
  const { x, y, r: R0 } = W0;
  // the core's heat glowing in the dust round the cut
  glowAt(ctx, x + ERX * 0.6, y, R0 * 1.7, '#ff6a3a', 0.2);
  // the missing half's dust: a halftone ghost of the hemisphere, thinning and blowing off to the right
  dots(ctx, { x: x, y: y - R0 - 60, w: R0 * 2.1, h: R0 * 2 + 120 }, (px, py) => {
    const d = Math.hypot((px - x) / 1.15, py - y) / R0;
    const lump = 0.5 + 0.5 * Math.sin(px * 0.045 + py * 0.03) * Math.sin(py * 0.05 - px * 0.02);
    return Math.max(0, (1 - smooth(0.5, 1.25, d)) * (0.2 + 0.32 * lump) * (1 - smooth(0, R0 * 1.8, px - x) * 0.6));
  }, '#ff9a72', { step: 6, angle: 0.26, a: 0.6 });
  // the near hemisphere: ocean, continents, cloud, an ice cap; lit from the top left, the shade in dots
  flat(ctx, halfDisc, '#23708c', 0, INK);
  within(ctx, halfDisc, () => {
    const land: [number, number, number, number, number][] = [
      [-120, -90, 70, 46, 0.4],
      [-60, -20, 54, 82, -0.3],
      [-150, 60, 40, 30, 0.2],
      [-40, 110, 60, 38, 0.6],
      [-170, -10, 22, 40, 0],
    ];
    for (const [dx, dy, rx, ry, rot] of land) {
      const pts: [number, number][] = [];
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * P2;
        const rr = 0.75 + r() * 0.45;
        pts.push([x + dx + Math.cos(a + rot) * rx * rr, y + dy + Math.sin(a + rot) * ry * rr]);
      }
      const lp = polyPath(pts);
      flat(ctx, lp, '#c89a58', 1.8, '#2a1a14', 0);
      within(ctx, lp, () => {
        ctx.fillStyle = '#7a9a48';
        for (let k = 0; k < 6; k++) {
          ctx.beginPath();
          ctx.ellipse(x + dx + (r() - 0.5) * rx, y + dy + (r() - 0.5) * ry, rx * 0.3, ry * 0.2, r() * 3, 0, P2);
          ctx.fill();
        }
      });
    }
    // the ice cap and swirling cloud bands
    flat(ctx, ellPath(x - 70, y - R0 + 18, 96, 34, 0.2), '#e8f4ff', 1.6, '#2a3a5a', 0);
    ctx.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const cy = y - R0 * 0.7 + k * R0 * 0.24 + (r() - 0.5) * 12;
      const cx = x - R0 * 0.6 + (r() - 0.5) * 60;
      const len = 60 + r() * 90;
      ctx.strokeStyle = 'rgba(240,248,255,0.85)';
      ctx.lineWidth = 5 + r() * 6;
      ctx.beginPath();
      ctx.moveTo(cx - len / 2, cy);
      ctx.bezierCurveTo(cx - len / 4, cy - 14, cx + len / 4, cy + 12, cx + len / 2, cy - 4);
      ctx.stroke();
      if (r() < 0.5) {
        ctx.beginPath();
        ctx.arc(cx + len / 2 + 6, cy - 10, 8, Math.PI * 0.8, Math.PI * 2.4);
        ctx.stroke();
      }
    }
    // shade: the dots deepen away from the key, to the cut and the bottom
    dots(ctx, { x: x - R0, y: y - R0, w: R0 + 4, h: R0 * 2 }, linTone(x - R0 * 0.7, y - R0 * 0.7, x + R0 * 0.1, y + R0 * 0.9, 0, 0.85), '#06102e', { step: 6, angle: 0.79, a: 0.8 });
    hatch(ctx, halfDisc, { x: x - R0, y: y + R0 * 0.3, w: R0, h: R0 * 0.7 }, 0.79, 7, 1.2, '#06102e', 0.4, r);
    // the limb's lit crescent on the key side
    ctx.strokeStyle = 'rgba(200,236,255,0.75)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x + 4, y + 4, R0 - 2, Math.PI * 1.02, Math.PI * 1.42);
    ctx.stroke();
  });
  // the face's warm light on the surface's edge along the cut
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, R0, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.clip();
  const eg = ctx.createLinearGradient(x - 50, 0, x, 0);
  eg.addColorStop(0, 'rgba(255,120,60,0)');
  eg.addColorStop(1, 'rgba(255,120,60,0.4)');
  ctx.fillStyle = eg;
  ctx.fillRect(x - 50, y - R0, 50, R0 * 2);
  ctx.restore();
  ink(ctx, worldSil, 4.5, INK, 0.5);
}

/** The cut face (phase 0…1 loops) in a frame of w×h, the face's centre at the frame's centre: the crust's ring of
 * strata, the mantle churning in convection cells, light cracking along the outer core's edge, the inner core boiling
 * white. Flat comic colours, inked, a dot screen in the crust's shade. */
function faceFrame(c: Ctx, w: number, h: number, ph: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const rx = ERX;
  const ry = W0.r;
  const el = (k: number): PathFn => (g) => {
    g.beginPath();
    g.ellipse(cx, cy, rx * k, ry * k, 0, 0, P2);
  };
  const pt = (k: number, a: number): [number, number] => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  const r = rng(321);
  // the crust: grey-brown rock, its strata ticked round the ring
  flat(c, el(1), '#5e4038', 0, INK);
  within(c, el(1), () => {
    c.strokeStyle = 'rgba(30,12,10,0.6)';
    c.lineWidth = 1.2;
    c.beginPath();
    for (let k = 0; k < 42; k++) {
      const a = (k / 42) * P2;
      const [x0, y0] = pt(0.92, a);
      const [x1, y1] = pt(1, a + (r() - 0.5) * 0.04);
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
    }
    c.stroke();
    c.strokeStyle = 'rgba(200,150,120,0.5)';
    c.beginPath();
    c.ellipse(cx, cy, rx * 0.965, ry * 0.965, 0, 0, P2);
    c.stroke();
    dots(c, { x: 0, y: 0, w, h }, linTone(cx - rx, cy - ry, cx + rx, cy + ry, 0.1, 0.7), '#1a0806', { step: 4, angle: 0.79, a: 0.7 });
  });
  // the mantle: red to orange, swirling
  flat(c, el(0.9), '#c22e1a', 2, '#3a0806', 0);
  within(c, el(0.9), () => {
    c.fillStyle = '#ee5a1c';
    c.beginPath();
    c.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, P2);
    c.fill();
    // convection cells: streaks of hot and cooler rock turning round the core, each its own speed
    c.lineCap = 'round';
    for (let k = 0; k < 14; k++) {
      const dir = k % 2 ? 1 : -1;
      const kk = 0.5 + (k % 5) * 0.09;
      const a0 = (k / 14) * P2 + ph * P2 * dir * (k % 3 === 0 ? 2 : 1) + r() * 0.3;
      const len = 0.5 + r() * 0.6;
      const hot = k % 3 !== 1;
      c.strokeStyle = hot ? 'rgba(255,170,70,0.85)' : 'rgba(120,16,10,0.7)';
      c.lineWidth = hot ? 3.2 : 4.5;
      c.beginPath();
      for (let s = 0; s <= 10; s++) {
        const a = a0 + (s / 10) * len;
        const kr = kk + 0.07 * Math.sin(a * 3 + ph * P2 * 2 + k);
        const [px, py] = pt(kr, a);
        if (s) c.lineTo(px, py);
        else c.moveTo(px, py);
      }
      c.stroke();
    }
    // the hot rock's dots, densest round the cool streaks
    dots(c, { x: 0, y: 0, w, h }, (x, y) => 0.25 + 0.2 * Math.sin(x * 0.2 + y * 0.05 + ph * P2), '#8a1406', { step: 4, angle: 0.26, a: 0.45 });
  });
  // the outer core, its edge cracking with light
  flat(c, el(0.5), '#ffa02a', 2, '#5a1a06', 0);
  c.save();
  c.strokeStyle = '#fff2b0';
  c.lineWidth = 2.4;
  c.beginPath();
  for (let k = 0; k <= 48; k++) {
    const a = (k / 48) * P2;
    const kr = 0.5 + (k % 2 ? 0.035 : -0.02) * (0.6 + 0.4 * Math.sin(a * 5 + ph * P2 * 3));
    const [px, py] = pt(kr, a);
    if (k) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.stroke();
  c.restore();
  // the inner core: white-hot, boiling (bubbles swelling round its edge and bursting)
  flat(c, el(0.27), '#fff3b8', 1.6, '#8a4a0a', 0);
  within(c, el(0.27), () => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(cx - rx * 0.03, cy - ry * 0.04, rx * 0.15, ry * 0.15, 0, 0, P2);
    c.fill();
  });
  for (let k = 0; k < 7; k++) {
    const u = (ph * 2 + k / 7) % 1;
    const a = k * 0.9 + 0.3;
    const [px, py] = pt(0.27 + u * 0.08, a);
    const s = 5 * Math.sin(Math.PI * u);
    if (s < 0.8) continue;
    flat(c, ellPath(px, py, s * 0.7, s), '#fff6c8', 1.2, '#8a4a0a', 0);
  }
  // the face's rim: the crust's broken lip, lit on its left edge (the key), inked
  c.strokeStyle = 'rgba(255,210,170,0.7)';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(cx + 1, cy + 1, rx - 2, ry - 2, 0, Math.PI * 0.6, Math.PI * 1.45);
  c.stroke();
  ink(c, el(1), 3.5, INK, 0.4);
}

function faceStill(ctx: Ctx): void {
  const w = Math.ceil(ERX * 2 + 16);
  const h = Math.ceil(W0.r * 2 + 16);
  ctx.save();
  ctx.translate(W0.x - w / 2, W0.y - h / 2);
  faceFrame(ctx, w, h, 0.15);
  ctx.restore();
}

/** One lit chip of rubble (frame i of a sheet, `half` px each way): a jagged rock, lit on its upper left, its shade in
 * dots, the cut's heat on its left edge on some, inked. */
function chip(c: Ctx, cx: number, cy: number, s: number, i: number): void {
  const r = rng(700 + i * 31);
  const pts: [number, number][] = [];
  const n = 6 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * P2 + r() * 0.4;
    const rr = s * (0.6 + r() * 0.4);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (0.75 + r() * 0.3)]);
  }
  const p = polyPath(pts);
  const hot = i % 3 === 0;
  flat(c, p, hot ? '#7a3a2a' : '#5a4a5a', 0, INK);
  edgeBand(c, p, s * 0.18, s * 0.18, hot ? '#ffb06a' : '#a89ab8');
  within(c, p, () => dots(c, { x: cx - s, y: cy - s, w: s * 2, h: s * 2 }, linTone(cx - s * 0.2, cy - s * 0.2, cx + s, cy + s, 0, 0.9), '#0c0618', { step: Math.max(2.5, s * 0.22), angle: 0.79 }));
  if (hot) edgeBand(c, p, s * 0.25, 0, 'rgba(255,90,40,0.7)');
  ink(c, p, Math.max(1.2, s * 0.09), INK, 0.4);
}

/** The rubble drifting off the cut, for the still (the live layer drifts its own). */
function debrisStill(ctx: Ctx, r: R): void {
  const { x, y, r: R0 } = W0;
  for (let i = 0; i < 26; i++) {
    const u = r();
    const a = (r() - 0.5) * 2.4;
    const d = ERX * 1.25 + u * R0 * 1.4;
    const px = x + Math.cos(a) * d * 1.05;
    const py = y + Math.sin(a) * d * 0.95;
    if (px > W - 20 || py < 20 || py > W0.y + W0.r + 60) continue;
    const s = 3 + (1 - u) ** 2 * 15 + r() * 3;
    chip(ctx, px, py, s, i);
  }
}

// ——— the far void: floating rocks beyond the platform's edge ———

function islet(ctx: Ctx, r: R, x: number, y: number, w: number, d: number): void {
  // a floating rock: a flat lit top, a jagged underside tapering to a point, a few pebbles hanging under it
  const top: [number, number][] = [[x - w / 2, y], [x - w * 0.3, y - 4], [x + w * 0.1, y - 2], [x + w * 0.38, y - 6], [x + w / 2, y]];
  const under: [number, number][] = [[x + w * 0.42, y + w * 0.18], [x + w * 0.2, y + w * 0.3], [x + w * 0.08, y + w * 0.5], [x - w * 0.06, y + w * 0.36], [x - w * 0.24, y + w * 0.26], [x - w * 0.44, y + w * 0.12]];
  const p = polyPath([...top, ...under]);
  const air = mix(STONE, '#4a3070', d);
  flat(ctx, p, air, 0, INK);
  within(ctx, p, () => {
    ctx.fillStyle = mix('#8a86c8', '#6a4a90', d);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    top.forEach(([px, py]) => ctx.lineTo(px, py));
    ctx.lineTo(x + w / 2, y + 7);
    ctx.lineTo(x - w / 2, y + 7);
    ctx.fill();
    dots(ctx, { x: x - w / 2, y: y, w, h: w * 0.5 }, linTone(x - w * 0.3, y, x + w * 0.4, y + w * 0.4, 0.2, 0.85), '#0a0620', { step: 4, angle: 0.79, a: 0.8 });
    ctx.fillStyle = x > 1300 ? rgba(CORE, 0.35) : rgba('#9ab8ff', 0.12);
    ctx.fillRect(x + w * 0.3, y, w * 0.2, w * 0.5);
  });
  ink(ctx, p, 2, mix(INK, '#4a3070', d * 0.5), 0.4);
  for (let k = 0; k < 3; k++) {
    const px = x + (r() - 0.5) * w * 0.6;
    const py = y + w * (0.45 + r() * 0.25);
    const s = 1.5 + r() * 3;
    flat(ctx, ellPath(px, py, s, s * 0.8), air, 1, INK, 0);
  }
}

function farRocks(ctx: Ctx, r: R): void {
  islet(ctx, r, 404, 556, 150, 0.35);
  islet(ctx, r, 1484, 540, 104, 0.4);
  islet(ctx, r, 1880, 560, 70, 0.5);
  islet(ctx, r, 690, 586, 46, 0.6);
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const y = 470 + r() * 120;
    if (Math.abs(x - 960) < 260) continue;
    const s = 1.5 + r() * 3.5;
    flat(ctx, ellPath(x, y, s, s * 0.7), '#3a2e62', s > 3 ? 1 : 0, INK, 0);
  }
}

// ——— the throne-rock's top: great flags receding to the far edge ———

const FLOOR_BOX = { x: 0, y: TF.horizon - 10, w: W, h: TY + 4 - (TF.horizon - 10) };
/** The far edge: a slightly broken lip, two pieces bitten out of it. */
const EDGE: [number, number][] = (() => {
  const r = rng(55);
  const pts: [number, number][] = [];
  for (let x = -10; x <= W + 40; x += 24) {
    let y = TF.horizon + (r() - 0.5) * 3;
    if (x > 300 && x < 390) y += 9 * Math.sin(((x - 300) / 90) * Math.PI);
    if (x > 1560 && x < 1700) y += 12 * Math.sin(((x - 1560) / 140) * Math.PI);
    pts.push([x, y]);
  }
  return pts;
})();

function floor(ctx: Ctx, r: R): void {
  const y0 = TF.horizon;
  const y1 = TY;
  const fp = polyPath([...EDGE, [W + 40, y1 + 2], [-10, y1 + 2]]);
  flat(ctx, fp, '#2e3660', 0, INK);
  within(ctx, fp, () => {
    vfill(ctx, 0, y0 - 10, W, y1 - y0 + 12, [[0, '#1e2448'], [0.45, '#2c3666'], [1, '#3a467c']]);
    // the key light from the left, the core's warmth from the right
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(170,190,255,0.14)');
    g.addColorStop(0.5, 'rgba(170,190,255,0)');
    g.addColorStop(1, 'rgba(255,130,70,0.1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0 - 10, W, y1 - y0 + 12);
    // the flags: rows across, joints running to the vanishing point; each flag its own shade
    const rows = [y0, 614, 628, 648, 674, 708, y1 + 2];
    const xs: number[] = [];
    for (let x = -1200; x <= W + 1200; x += 210) xs.push(x);
    for (let j = 0; j < rows.length - 1; j++) {
      const ya = rows[j];
      const yb = rows[j + 1];
      const off = j % 2 ? 105 : 0;
      for (const fx of xs) {
        const xa0 = at(fx + off, y1, ya);
        const xa1 = at(fx + off + 210, y1, ya);
        const xb0 = at(fx + off, y1, yb);
        const xb1 = at(fx + off + 210, y1, yb);
        if (Math.max(xa1, xb1) < -20 || Math.min(xa0, xb0) > W + 20) continue;
        const v = r();
        ctx.fillStyle = v < 0.5 ? rgba('#0c0a24', 0.06 + v * 0.16) : rgba('#9a98d8', (v - 0.5) * 0.12);
        ctx.beginPath();
        ctx.moveTo(xa0, ya);
        ctx.lineTo(xa1, ya);
        ctx.lineTo(xb1, yb);
        ctx.lineTo(xb0, yb);
        ctx.closePath();
        ctx.fill();
        // the joint: inked, its near lip catching the light
        ctx.strokeStyle = rgba(INK, 0.6);
        ctx.lineWidth = 1 + (yb - y0) / 90;
        ctx.beginPath();
        ctx.moveTo(xa0, ya);
        ctx.lineTo(xb0, yb);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba(INK, 0.6);
      ctx.lineWidth = 1 + (ya - y0) / 60;
      ctx.beginPath();
      ctx.moveTo(0, ya);
      ctx.lineTo(W, ya);
      ctx.stroke();
      ctx.strokeStyle = rgba('#a8a6e0', 0.28);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ya + 1.5);
      ctx.lineTo(W, ya + 1.5);
      ctx.stroke();
    }
    // the gold inlay: a runner from the dais's foot to the table, its lines to the vanishing point
    for (const fx of [800, 1120]) {
      ctx.strokeStyle = rgba(GOLD, 0.75);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(at(fx, y1, 708), 708);
      ctx.lineTo(fx, y1);
      ctx.stroke();
      ctx.strokeStyle = rgba(GOLD_LIT, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(at(fx, y1, 708) - 1.5, 708);
      ctx.lineTo(fx - 1.5, y1);
      ctx.stroke();
    }
    // cracks where the stone has taken a titan's weight, chips off the flags
    ctx.strokeStyle = rgba(INK, 0.75);
    ctx.lineWidth = 1.6;
    for (const [sx, sy, pts] of [
      [380, 676, [[24, 8], [40, 4], [66, 16], [80, 30]]],
      [1500, 650, [[-18, 10], [-30, 8], [-48, 22]]],
      [240, 630, [[20, 4], [34, 12]]],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      for (const [dx, dy] of pts) ctx.lineTo(sx + dx, sy + dy);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * W;
      const y = y0 + 8 + r() ** 0.7 * (y1 - y0 - 10);
      const s = 1 + r() * 2.5 * ((y - y0) / (y1 - y0) + 0.3);
      ctx.fillStyle = rgba(r() < 0.5 ? '#0c0a24' : '#8a88c8', 0.5);
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.5, 0, 0, P2);
      ctx.fill();
    }
    // the six stones' glyphs set into the near flags: hexagons foreshortened on the floor, gold-rimmed,
    // each with its stone's colour faint in the hollow
    [300, 430, 690, 1230, 1490, 1620].forEach((gx, i) => {
      const gy = 740;
      const s = 17;
      const hex: [number, number][] = [];
      for (let k = 0; k < 6; k++) hex.push([gx + Math.cos((k / 6) * P2) * s * 1.3, gy + Math.sin((k / 6) * P2) * s * 0.36]);
      const hp = polyPath(hex);
      flat(ctx, hp, '#14122e', 0, INK);
      within(ctx, hp, () => {
        const g = ctx.createRadialGradient(gx, gy + 2, 0, gx, gy + 2, s);
        g.addColorStop(0, rgba(STONES[i], 0.12));
        g.addColorStop(1, rgba(STONES[i], 0));
        ctx.fillStyle = g;
        ctx.fillRect(gx - s * 1.4, gy - s, s * 2.8, s * 2);
      });
      ctx.save();
      ctx.strokeStyle = rgba(GOLD, 0.85);
      ctx.lineWidth = 2;
      hp(ctx);
      ctx.stroke();
      ctx.strokeStyle = rgba(GOLD_LIT, 0.6);
      ctx.lineWidth = 0.8;
      ctx.translate(0, -1);
      hp(ctx);
      ctx.stroke();
      ctx.restore();
    });
    // printed: the shade's dots towards the far edge and the right
    dots(ctx, { x: 0, y: y0 - 10, w: W, h: y1 - y0 + 12 }, (x, y) => 0.42 * (1 - smooth(y0, y0 + 80, y)) + 0.16 * smooth(1200, W, x) + 0.06, SHADE, { step: 7, angle: 0.79, a: 0.7 });
  });
  // the far lip: lit by the key, inked against space
  ctx.strokeStyle = rgba('#9a98e0', 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  EDGE.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 2.5) : ctx.moveTo(x, y + 2.5)));
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  EDGE.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

// ——— the throne ———

const TX = TF.throne.x;
/** The dais's three steps: front faces [x0, x1, top, bottom]; each one's top runs back to `back`. */
const STEPS: { x0: number; x1: number; top: number; bot: number; back: number }[] = [
  { x0: 590, x1: 1330, top: 680, bot: 710, back: 664 },
  { x0: 652, x1: 1268, top: 642, bot: 668, back: 628 },
  { x0: 714, x1: 1206, top: 606, bot: 632, back: 594 },
];
const SEAT = { x0: 794, x1: 1126, top: 530, bot: 600, back: 514 };
const ARMS = [
  { x0: 722, x1: 806, top: 436, bot: 602, back: 420 },
  { x0: 1114, x1: 1198, top: 436, bot: 602, back: 420 },
];
const BACK = { x0: 808, x1: 1112, top: 214, bot: 516 };
const HALO = { x: TX, y: 352, r: 92 };
const THRONE_BOX = { x: 540, y: 40, w: 840, h: 690 };

/** The perspective top of a block whose front face runs x0…x1 at y `top`, back to `back`. */
function topOf(x0: number, x1: number, top: number, back: number): PathFn {
  return polyPath([[x0, top], [x1, top], [at(x1, top, back), back], [at(x0, top, back), back]]);
}

function throneAura(ctx: Ctx, r: R): void {
  // drama behind the seat: pale speed lines radiating from the crown, a violet halo of light
  glowAt(ctx, TX, 280, 420, '#7a5ad8', 0.22, 0.9);
  speedLines(ctx, r, TX, 250, 200, 980, 70, '#e8dcff', 0.07, Math.PI * 1.02, Math.PI * 1.98);
}

function crown(ctx: Ctx): void {
  // six blades fanning up from the back's top, the middle two tallest, each a carved stone leaf edged in gold
  const base = BACK.top + 10;
  const blades: [number, number, number, number][] = [
    [-118, -0.62, 100, 30],
    [-72, -0.34, 126, 34],
    [-24, -0.1, 144, 36],
    [24, 0.1, 144, 36],
    [72, 0.34, 126, 34],
    [118, 0.62, 100, 30],
  ];
  for (const [dx, ang, len, w] of blades) {
    const bx = TX + dx;
    const ca = Math.sin(ang);
    const sa = -Math.cos(ang);
    const nx = -sa;
    const ny = ca;
    const tip: [number, number] = [bx + ca * len, base + sa * len];
    const bl: [number, number] = [bx - nx * w * 0.5, base - ny * w * 0.5];
    const br: [number, number] = [bx + nx * w * 0.5, base + ny * w * 0.5];
    const ml: [number, number] = [bx - nx * w * 0.62 + ca * len * 0.55, base - ny * w * 0.62 + sa * len * 0.55];
    const mr: [number, number] = [bx + nx * w * 0.62 + ca * len * 0.55, base + ny * w * 0.62 + sa * len * 0.55];
    const rib0: [number, number] = [bx, base];
    const whole = polyPath([bl, ml, tip, mr, br]);
    const bb = { x: bx - 60, y: tip[1] - 10, w: 120, h: base - tip[1] + 20 };
    castShadow(ctx, whole, 6, 6, 0.45, '#06041a');
    // two facets meeting at a ridge: the left one turned to the key, the right one in shade with the core's rim
    const left = polyPath([bl, ml, tip, rib0]);
    const right = polyPath([rib0, tip, mr, br]);
    flat(ctx, left, '#4c4a8c', 0, INK);
    edgeBand(ctx, left, 3, 3, '#8a88c8');
    within(ctx, left, () => dots(ctx, bb, linTone(bb.x, tip[1], bb.x, base, 0, 0.45), SHADE, { step: 4, angle: 0.79, a: 0.7 }));
    flat(ctx, right, '#201e46', 0, INK);
    within(ctx, right, () => {
      dots(ctx, bb, linTone(bb.x, tip[1], bb.x, base, 0.45, 0.9), SHADE, { step: 4, angle: 0.79, a: 0.8 });
      hatch(ctx, right, bb, 1.1, 5, 0.9, '#06041a', 0.5);
    });
    if (dx > 0) edgeBand(ctx, right, -3, 1, rgba(CORE, 0.55));
    ink(ctx, whole, 2.6, INK, 0.6);
    // the gold ridge from its root to near the tip
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(bx + ca * 6, base + sa * 6);
    ctx.lineTo(bx + ca * len * 0.9, base + sa * len * 0.9);
    ctx.stroke();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = GOLD_LIT;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(bx + ca * 6 - 1, base + sa * 6);
    ctx.lineTo(bx + ca * len * 0.9 - 1, base + sa * len * 0.9);
    ctx.stroke();
  }
}

function throne(ctx: Ctx, r: R): void {
  throneAura(ctx, r);
  // the dais's shadow thrown down-right across the flags
  castShadow(ctx, polyPath([[590, 710], [1330, 710], [1240, 600], [700, 600]]), 30, 30, 0.5, '#06041a');
  crown(ctx);
  // the back: a tall carved slab with a stepped top, a sunk panel, the socket ring
  const back = polyPath([[BACK.x0, BACK.bot], [BACK.x0, 300], [BACK.x0 + 26, 252], [BACK.x0 + 58, BACK.top], [BACK.x1 - 58, BACK.top], [BACK.x1 - 26, 252], [BACK.x1, 300], [BACK.x1, BACK.bot]]);
  block(ctx, back, { x: BACK.x0, y: BACK.top, w: BACK.x1 - BACK.x0, h: BACK.bot - BACK.top }, { bevel: 7, t0: 0.05, t1: 0.75, rimA: 0.45, inkW: 3.4 });
  // a gold edging set in just inside its outline, and the band the blades rise from
  ctx.save();
  ctx.lineJoin = 'round';
  const edgePts: [number, number][] = [[BACK.x0 + 12, BACK.bot - 2], [BACK.x0 + 12, 302], [BACK.x0 + 36, 258], [BACK.x0 + 64, BACK.top + 12], [BACK.x1 - 64, BACK.top + 12], [BACK.x1 - 36, 258], [BACK.x1 - 12, 302], [BACK.x1 - 12, BACK.bot - 2]];
  for (const [w, col] of [[6, INK], [3.5, GOLD], [1.1, GOLD_LIT]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    edgePts.forEach(([x, y], i) => (i ? ctx.lineTo(x - (w === 1.1 ? 1 : 0), y) : ctx.moveTo(x - (w === 1.1 ? 1 : 0), y)));
    ctx.stroke();
  }
  ctx.restore();
  gold(ctx, rectPath(BACK.x0 + 52, BACK.top - 6, BACK.x1 - BACK.x0 - 104, 14), { x: BACK.x0 + 52, y: BACK.top - 6, w: BACK.x1 - BACK.x0 - 104, h: 14 }, 2);
  const panel = polyPath([[BACK.x0 + 30, BACK.bot - 6], [BACK.x0 + 30, 312], [BACK.x0 + 52, 274], [BACK.x0 + 74, 250], [BACK.x1 - 74, 250], [BACK.x1 - 52, 274], [BACK.x1 - 30, 312], [BACK.x1 - 30, BACK.bot - 6]]);
  // the sunk panel: in shade, its top-left edge in shadow, its bottom-right lip catching the light
  flat(ctx, panel, '#262450', 0, INK);
  edgeBand(ctx, panel, 6, 6, '#120f30');
  edgeBand(ctx, panel, -4, -4, '#5a58a0');
  within(ctx, panel, () => {
    dots(ctx, { x: BACK.x0, y: 240, w: BACK.x1 - BACK.x0, h: 280 }, linTone(BACK.x0 + 40, 260, BACK.x1, BACK.bot, 0.2, 0.75), SHADE, { step: 6, angle: 0.79, a: 0.8 });
    // carved channels running from each socket down to the seat (the stones' power fed the throne)
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * P2) / 6;
      const sx = HALO.x + Math.cos(a) * HALO.r;
      const sy = HALO.y + Math.sin(a) * HALO.r;
      ctx.strokeStyle = rgba(INK, 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx * 0.6 + TX * 0.4, BACK.bot - 40, TX + (sx - TX) * 0.3, BACK.bot);
      ctx.stroke();
      ctx.strokeStyle = rgba('#6a68b0', 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + 2, sy + 1);
      ctx.quadraticCurveTo(sx * 0.6 + TX * 0.4 + 2, BACK.bot - 39, TX + (sx - TX) * 0.3 + 2, BACK.bot);
      ctx.stroke();
    }
  });
  within(ctx, panel, () => {
    // rays carved out from the ring to the panel's edges: each a groove (dark on its upper-left side, lit below)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * P2 + 0.2;
      const x0 = HALO.x + Math.cos(a) * (HALO.r + 22);
      const y0 = HALO.y + Math.sin(a) * (HALO.r + 22);
      const x1 = HALO.x + Math.cos(a) * 260;
      const y1 = HALO.y + Math.sin(a) * 260;
      ctx.strokeStyle = rgba('#06041a', 0.6);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.strokeStyle = rgba('#6a68b0', 0.45);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x0 + 1.5, y0 + 1.5);
      ctx.lineTo(x1 + 1.5, y1 + 1.5);
      ctx.stroke();
    }
    // a frieze of carved chevrons across the panel's top
    for (let x = BACK.x0 + 60; x < BACK.x1 - 60; x += 22) {
      const cv = polyPath([[x, 262], [x + 11, 272], [x + 22, 262], [x + 22, 268], [x + 11, 278], [x, 268]]);
      flat(ctx, cv, '#4a4888', 0, INK);
      edgeBand(ctx, cv, -1.5, -1.5, '#0c0a24');
    }
  });
  ink(ctx, panel, 2, INK, 0);
  // the socket ring: a gold band, six empty settings, a dark boss in the middle
  const ring: PathFn = (c) => {
    c.beginPath();
    c.arc(HALO.x, HALO.y, HALO.r + 12, 0, P2);
    c.arc(HALO.x, HALO.y, HALO.r - 12, 0, P2, true);
  };
  castShadow(ctx, ring, 6, 6, 0.5, '#06041a');
  block(ctx, ring, { x: HALO.x - HALO.r - 14, y: HALO.y - HALO.r - 14, w: HALO.r * 2 + 28, h: HALO.r * 2 + 28 }, { base: '#3a3868', bevel: 3.5, t0: 0.05, t1: 0.75, inkW: 2.4, step: 4 });
  for (const rr of [HALO.r + 8, HALO.r - 8]) {
    ctx.strokeStyle = rgba(GOLD, 0.8);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(HALO.x, HALO.y, rr, 0, P2);
    ctx.stroke();
  }
  // the ring's carved ticks between the settings
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let k = 0; k < 36; k++) {
    if (k % 6 === 0) continue;
    const a = -Math.PI / 2 + (k / 36) * P2;
    ctx.moveTo(HALO.x + Math.cos(a) * (HALO.r - 6), HALO.y + Math.sin(a) * (HALO.r - 6));
    ctx.lineTo(HALO.x + Math.cos(a) * (HALO.r + 6), HALO.y + Math.sin(a) * (HALO.r + 6));
  }
  ctx.stroke();
  const boss = ellPath(HALO.x, HALO.y, 34, 34);
  block(ctx, boss, { x: HALO.x - 34, y: HALO.y - 34, w: 68, h: 68 }, { base: '#2a2852', bevel: 4, t0: 0.2, t1: 0.8, inkW: 2.4, step: 4 });
  gold(ctx, (c) => {
    c.beginPath();
    c.arc(HALO.x, HALO.y, 14, 0, P2);
  }, { x: HALO.x - 14, y: HALO.y - 14, w: 28, h: 28 }, 1.6);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * P2) / 6;
    const sx = HALO.x + Math.cos(a) * HALO.r;
    const sy = HALO.y + Math.sin(a) * HALO.r;
    // the setting's bezel, its claws, the empty hollow with its stone's colour still glowing at the bottom
    gold(ctx, ellPath(sx, sy, 21, 21), { x: sx - 21, y: sy - 21, w: 42, h: 42 }, 2);
    for (let k = 0; k < 4; k++) {
      const ca = (k / 4) * P2 + Math.PI / 4;
      flat(ctx, polyPath([[sx + Math.cos(ca) * 14, sy + Math.sin(ca) * 14], [sx + Math.cos(ca + 0.25) * 25, sy + Math.sin(ca + 0.25) * 25], [sx + Math.cos(ca - 0.25) * 25, sy + Math.sin(ca - 0.25) * 25]]), GOLD_LIT, 1.4, INK, 0);
    }
    const hollow = ellPath(sx, sy, 14, 14);
    flat(ctx, hollow, '#0a0820', 0, INK);
    within(ctx, hollow, () => {
      const g = ctx.createRadialGradient(sx + 3, sy + 5, 0, sx + 3, sy + 5, 14);
      g.addColorStop(0, rgba(STONES[i], 0.16));
      g.addColorStop(1, rgba(STONES[i], 0));
      ctx.fillStyle = g;
      ctx.fillRect(sx - 14, sy - 14, 28, 28);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(sx - 3, sy - 4, 10, 8, 0, 0, P2);
      ctx.fill();
    });
    ink(ctx, hollow, 2, INK, 0);
  }
  // the steps, far to near
  for (const s of [...STEPS].reverse()) {
    const tp = topOf(s.x0, s.x1, s.top, s.back);
    flat(ctx, tp, '#5a589a', 0, INK);
    within(ctx, tp, () => {
      dots(ctx, { x: s.x0 - 20, y: s.back, w: s.x1 - s.x0 + 40, h: s.top - s.back }, (x) => 0.12 + 0.4 * smooth(TX, s.x1 + 20, x), SHADE, { step: 4, angle: 0.79, a: 0.8 });
      crevice(ctx, s.x0, s.x1, s.back, 6, 0.6, '#06041a');
    });
    ink(ctx, tp, 2.2, INK, 0);
    const fr = rectPath(s.x0, s.top, s.x1 - s.x0, s.bot - s.top);
    block(ctx, fr, { x: s.x0, y: s.top, w: s.x1 - s.x0, h: s.bot - s.top }, { bevel: 3, t0: 0.15, t1: 0.65, rimA: 0.3, inkW: 2.6, step: 5 });
    // a gold nosing along the step's edge
    gold(ctx, rectPath(s.x0, s.top - 1, s.x1 - s.x0, 5), { x: s.x0, y: s.top - 1, w: s.x1 - s.x0, h: 5 }, 1.4);
  }
  // the seat and the arms throw their shadow down the steps to the lower right
  castShadow(ctx, polyPath([[ARMS[0].x0, ARMS[0].top], [ARMS[1].x1, ARMS[1].top], [ARMS[1].x1, SEAT.bot], [ARMS[0].x0, SEAT.bot]]), 24, 16, 0.75, '#06041a');
  // the seat: its top, its front
  const st = topOf(SEAT.x0, SEAT.x1, SEAT.top, SEAT.back);
  flat(ctx, st, '#625fa4', 0, INK);
  within(ctx, st, () => dots(ctx, { x: SEAT.x0, y: SEAT.back, w: SEAT.x1 - SEAT.x0, h: SEAT.top - SEAT.back }, (x) => 0.1 + 0.4 * smooth(TX, SEAT.x1, x), SHADE, { step: 4, angle: 0.79 }));
  ink(ctx, st, 2.4, INK, 0);
  crevice(ctx, SEAT.x0, SEAT.x1, SEAT.back, 8, 0.6, '#06041a');
  const sf = rectPath(SEAT.x0, SEAT.top, SEAT.x1 - SEAT.x0, SEAT.bot - SEAT.top);
  block(ctx, sf, { x: SEAT.x0, y: SEAT.top, w: SEAT.x1 - SEAT.x0, h: SEAT.bot - SEAT.top }, { bevel: 5, t0: 0.1, t1: 0.7, rimA: 0.4 });
  gold(ctx, rectPath(SEAT.x0, SEAT.top + 6, SEAT.x1 - SEAT.x0, 9), { x: SEAT.x0, y: SEAT.top + 6, w: SEAT.x1 - SEAT.x0, h: 9 }, 1.8);
  // the arms: heavy blocks, their tops, their gilded scroll ends
  for (const [i, a] of ARMS.entries()) {
    const right = i === 1;
    castShadow(ctx, rectPath(a.x0, a.top, a.x1 - a.x0, a.bot - a.top), 10, 12, 0.45, '#06041a');
    const tp = topOf(a.x0, a.x1, a.top, a.back);
    flat(ctx, tp, '#6c6aa8', 0, INK);
    within(ctx, tp, () => dots(ctx, { x: a.x0 - 10, y: a.back, w: a.x1 - a.x0 + 20, h: a.top - a.back }, linTone(a.x0, 0, a.x1 + 10, 0, 0, 0.5), SHADE, { step: 4, angle: 0.79 }));
    ink(ctx, tp, 2.4, INK, 0);
    const front = rectPath(a.x0, a.top, a.x1 - a.x0, a.bot - a.top);
    block(ctx, front, { x: a.x0, y: a.top, w: a.x1 - a.x0, h: a.bot - a.top }, { bevel: 5, t0: right ? 0.15 : 0.05, t1: right ? 0.8 : 0.6, rimA: right ? 0.55 : 0.2 });
    // a carved panel and two gold bands down the front
    const fp = rectPath(a.x0 + 14, a.top + 44, a.x1 - a.x0 - 28, a.bot - a.top - 70);
    flat(ctx, fp, '#2a2854', 0, INK);
    edgeBand(ctx, fp, 4, 4, '#120f30');
    edgeBand(ctx, fp, -3, -3, '#5a58a0');
    within(ctx, fp, () => {
      const cx = (a.x0 + a.x1) / 2;
      const cy = (a.top + 44 + a.bot - 26) / 2;
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * P2;
        const ray = polyPath([[cx + Math.cos(ang - 0.12) * 12, cy + Math.sin(ang - 0.12) * 12], [cx + Math.cos(ang) * 40, cy + Math.sin(ang) * 40], [cx + Math.cos(ang + 0.12) * 12, cy + Math.sin(ang + 0.12) * 12]]);
        flat(ctx, ray, Math.cos(ang + 0.8) > 0 ? '#151232' : '#4e4c90', 0, INK);
      }
      const disc = ellPath(cx, cy, 12, 12);
      flat(ctx, disc, '#4a4888', 0, INK);
      edgeBand(ctx, disc, 2.5, 2.5, '#8a88c8');
      edgeBand(ctx, disc, -2, -2, '#0c0a24');
      ink(ctx, disc, 1.4, INK, 0);
    });
    ink(ctx, fp, 1.8, INK, 0);
    for (const by of [a.top + 22, a.bot - 18]) gold(ctx, rectPath(a.x0 + 2, by, a.x1 - a.x0 - 4, 10), { x: a.x0, y: by, w: a.x1 - a.x0, h: 10 }, 1.8);
    // the finial: an orb of the throne's dark stone in a gold collar, lit from the top left, ringed by its band
    const sx = (a.x0 + a.x1) / 2;
    const sy = a.top - 22;
    gold(ctx, polyPath([[sx - 30, a.top + 2], [sx + 30, a.top + 2], [sx + 22, a.top - 10], [sx - 22, a.top - 10]]), { x: sx - 30, y: a.top - 12, w: 60, h: 14 }, 2);
    const orb = ellPath(sx, sy, 24, 24);
    castShadow(ctx, orb, 6, 6, 0.4, '#06041a');
    const og = ctx.createRadialGradient(sx - 9, sy - 10, 2, sx, sy, 26);
    og.addColorStop(0, '#a8a6e0');
    og.addColorStop(0.35, '#5a589c');
    og.addColorStop(1, '#22204a');
    flat(ctx, orb, og, 0, INK);
    within(ctx, orb, () => {
      dots(ctx, { x: sx - 24, y: sy - 24, w: 48, h: 48 }, linTone(sx - 6, sy - 6, sx + 22, sy + 22, 0, 0.9), SHADE, { step: 4, angle: 0.79 });
      if (right) edgeBand(ctx, orb, -3, 0, rgba(CORE, 0.55));
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 24, 7, 0, 0, P2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(sx - 10, sy - 11, 4, 2.6, -0.6, 0, P2);
      ctx.fill();
    });
    ink(ctx, orb, 2.6, INK, 0.6);
  }
  // the arms' occlusion against the seat and the back
  for (const a of ARMS) creviceV(ctx, a.x0 > TX ? a.x0 : a.x1, a.top, a.bot, a.x0 > TX ? -14 : 14, 0.5);
  cloak(ctx, r);
}

function creviceV(ctx: Ctx, x: number, y0: number, y1: number, w: number, a: number): void {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, rgba('#06041a', a));
  g.addColorStop(1, rgba('#06041a', 0));
  ctx.fillStyle = g;
  ctx.fillRect(Math.min(x, x + w), y0, Math.abs(w), y1 - y0);
}

/** The teal cloak thrown over the seat and down the steps: folds, a gold border, its fringe on the bottom step. */
function cloak(ctx: Ctx, r: R): void {
  // its edges at each level: [y, half-width at the left, at the right] following the steps' noses
  const L: [number, number][] = [[880, SEAT.back + 4], [872, SEAT.top + 2], [868, SEAT.bot], [858, STEPS[2].top + 2], [852, STEPS[2].bot], [842, STEPS[1].top + 2], [836, STEPS[1].bot], [826, STEPS[0].top + 2], [818, STEPS[0].bot - 4]];
  const R2: [number, number][] = L.map(([x, y]) => [2 * TX - x + (y > 600 ? 10 : 4), y]);
  const hem: [number, number][] = [];
  const xL = L[L.length - 1][0];
  const xR = R2[R2.length - 1][0];
  for (let k = 0; k <= 10; k++) {
    const u = k / 10;
    hem.push([xR + (xL - xR) * u, STEPS[0].bot - 4 + Math.sin(u * Math.PI * 5) * 4]);
  }
  const p = polyPath([...L, ...hem, ...[...R2].reverse()]);
  castShadow(ctx, p, 6, 8, 0.45, '#06041a');
  flat(ctx, p, '#1c5c76', 0, INK);
  within(ctx, p, () => {
    // the steps' noses push the cloth out into lit ridges; between them it falls into the treads in shade
    for (const s of [SEAT, ...STEPS]) vfill(ctx, 800, s.bot - 10, 360, 10, [[0, 'rgba(4,18,30,0)'], [1, 'rgba(4,18,30,0.28)']]);
    // vertical folds hanging from the seat, lit on their left, inked in their deepest
    // the folds: broad tubes hanging from the seat's edge and spreading as they fall, each lit on its left flank and
    // shaded on its right, inked in the deepest valleys
    for (let k = 0; k < 4; k++) {
      const fx = 884 + k * 52 + (r() - 0.5) * 8;
      const spread = (k - 1.5) * 9;
      const fw = 18 + r() * 6;
      const tube = (dx: number) => {
        ctx.beginPath();
        ctx.moveTo(fx + dx, SEAT.top + 8);
        ctx.bezierCurveTo(fx + dx - 2, 590, fx + dx + spread * 0.5, 650, fx + dx + spread, STEPS[0].bot - 6);
      };
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(110,200,222,0.22)';
      ctx.lineWidth = fw;
      tube(-fw * 0.3);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(170,236,246,0.42)';
      ctx.lineWidth = 2;
      tube(-fw * 0.55);
      ctx.stroke();
      ctx.strokeStyle = rgba('#04121e', 0.32);
      ctx.lineWidth = fw * 0.6;
      tube(fw * 0.55);
      ctx.stroke();
      ctx.strokeStyle = rgba('#020a12', 0.8);
      ctx.lineWidth = 1.6;
      tube(fw * 0.95);
      ctx.stroke();
    }
    dots(ctx, { x: 800, y: SEAT.back, w: 360, h: STEPS[0].bot - SEAT.back }, (x) => 0.1 + 0.55 * smooth(TX - 40, 1090, x), '#04121e', { step: 5, angle: 0.79, a: 0.75 });
  });
  // the gold border down both edges and along the hem
  ctx.save();
  ctx.lineJoin = 'round';
  for (const side of [L, R2]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 9;
    ctx.beginPath();
    side.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = GOLD_LIT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
  ink(ctx, p, 2.6, INK, 0.5);
  // the fringe: gold tassels hanging off the hem onto the bottom step's front
  for (let k = 0; k < 15; k++) {
    const u = (k + 0.5) / 15;
    const fx = xL + (xR - xL) * u;
    const fy = STEPS[0].bot - 4 + Math.sin((1 - u) * Math.PI * 5) * 4;
    flat(ctx, polyPath([[fx - 3, fy], [fx + 3, fy], [fx + 2, fy + 10], [fx - 2, fy + 10]]), GOLD, 1.2, INK, 0);
  }
}

// ——— the braziers ———

const BOWL = { rx: 72, ry: 15, depth: 36 };

/** The bowl's front: the rim's near half and the body under it (also drawn over the live flames' base). */
function bowlFront(ctx: Ctx, x: number, y: number): void {
  const body: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y, BOWL.rx, BOWL.ry, 0, 0, Math.PI);
    c.bezierCurveTo(x - BOWL.rx + 4, y + BOWL.depth * 0.7, x - 30, y + BOWL.depth, x, y + BOWL.depth);
    c.bezierCurveTo(x + 30, y + BOWL.depth, x + BOWL.rx - 4, y + BOWL.depth * 0.7, x + BOWL.rx, y);
    c.closePath();
  };
  const bb = { x: x - BOWL.rx, y: y, w: BOWL.rx * 2, h: BOWL.depth + 2 };
  flat(ctx, body, '#2c2a52', 0, INK);
  edgeBand(ctx, body, 5, 3, '#6a68ac');
  within(ctx, body, () => {
    dots(ctx, bb, linTone(x - BOWL.rx * 0.4, 0, x + BOWL.rx, 0, 0.05, 0.85), SHADE, { step: 4, angle: 0.79, a: 0.85 });
    // the star-fire's light under the rim, a band of gold studs
    vfill(ctx, x - BOWL.rx, y, BOWL.rx * 2, 10, [[0, 'rgba(230,120,255,0.55)'], [1, 'rgba(230,120,255,0)']]);
    for (let k = -4; k <= 4; k++) {
      const sx = x + k * 15;
      const sy = y + 14 + (1 - Math.cos((k / 4) * 1.2)) * -3;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(sx + 0.8, sy + 0.8, 3.4, 0, P2);
      ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.8, 0, P2);
      ctx.fill();
      ctx.fillStyle = GOLD_LIT;
      ctx.beginPath();
      ctx.arc(sx - 0.8, sy - 0.8, 1, 0, P2);
      ctx.fill();
    }
  });
  ink(ctx, body, 2.6, INK, 0.5);
  // the rim's near half in gold
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(x, y, BOWL.rx, BOWL.ry, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = GOLD_LIT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 1, BOWL.rx - 1, BOWL.ry - 1, 0, Math.PI * 0.55, Math.PI * 0.98);
  ctx.stroke();
  ctx.restore();
}

function brazier(ctx: Ctx, b: (typeof TF.braziers)[number]): void {
  const { x, foot, bowl: y } = b;
  // contact: the tripod's footprint on the flags, its shadow falling right
  groundShadow(ctx, x + 10, foot, 80, 10, 0.6, '#06041a', 1.4);
  // the legs: the back leg, then the two front legs splaying out from under the bowl
  const leg = (x0: number, y0: number, x1: number, y1: number, w: number, back = false) => {
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const l = Math.hypot(nx, ny);
    const p = polyPath([[x0 - (nx / l) * w, y0 - (ny / l) * w], [x0 + (nx / l) * w, y0 + (ny / l) * w], [x1 + (nx / l) * w * 0.7, y1 + (ny / l) * w * 0.7], [x1 - (nx / l) * w * 0.7, y1 - (ny / l) * w * 0.7]]);
    block(ctx, p, { x: Math.min(x0, x1) - w, y: y0, w: Math.abs(x1 - x0) + w * 2, h: y1 - y0 }, { base: back ? '#22204a' : '#34325e', bevel: 2.5, t0: back ? 0.4 : 0.1, t1: back ? 0.9 : 0.75, inkW: 2.2, step: 4 });
    // a clawed gold foot
    gold(ctx, ellPath(x1, y1 - 3, w * 1.6, w * 0.9), { x: x1 - w * 1.6, y: y1 - 3 - w, w: w * 3.2, h: w * 2 }, 1.6);
  };
  // a tripod: the back leg runs back and down behind the stand (darker, thinner, its foot further up the flags), the
  // two front legs splay out towards us; all three meet in a gold collar under the bowl and are bound by a gold ring
  // a little over half way down (its far half behind the front legs, its near half over them)
  const ringY = y + 40 + (foot - y - 40) * 0.58;
  const ringRx = 20 + 38 * 0.58;
  const ringRy = 7;
  const ring = (from: number, to: number) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.ellipse(x, ringY, ringRx, ringRy, 0, from, to);
    ctx.stroke();
    ctx.strokeStyle = from === 0 ? GOLD : '#7a5a1e';
    ctx.lineWidth = 4.5;
    ctx.stroke();
    if (from === 0) {
      ctx.strokeStyle = GOLD_LIT;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(x, ringY - 1, ringRx, ringRy, 0, Math.PI * 0.55, Math.PI * 0.95);
      ctx.stroke();
    }
    ctx.restore();
  };
  leg(x + 4, y + 36, x + 12, foot - 30, 5, true);
  ring(Math.PI, P2);
  leg(x - 16, y + 36, x - 58, foot, 8);
  leg(x + 16, y + 36, x + 58, foot, 8);
  ring(0, Math.PI);
  // the collar: a short gold drum the legs come out of, the bowl's foot sitting in it
  const cTop = y + BOWL.depth - 6;
  const cBot = y + 46;
  const collar: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, cTop, 21, 5, 0, Math.PI, P2);
    c.lineTo(x + 19, cBot);
    c.ellipse(x, cBot, 19, 6, 0, 0, Math.PI);
    c.closePath();
  };
  gold(ctx, collar, { x: x - 21, y: cTop - 5, w: 42, h: cBot - cTop + 12 }, 2);
  ctx.save();
  ctx.strokeStyle = rgba(GOLD_DK, 0.9);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(x, (cTop + cBot) / 2 + 1, 20, 5.5, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();
  // the bowl's back: its inner wall and the star-coals glowing in it
  const inner = ellPath(x, y, BOWL.rx - 3, BOWL.ry - 2);
  flat(ctx, inner, '#3a1a5a', 0, INK);
  within(ctx, inner, () => {
    const g = ctx.createRadialGradient(x, y + 4, 2, x, y + 4, BOWL.rx);
    g.addColorStop(0, 'rgba(255,240,255,0.95)');
    g.addColorStop(0.35, 'rgba(240,120,255,0.8)');
    g.addColorStop(1, 'rgba(90,40,180,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(x - BOWL.rx, y - BOWL.ry, BOWL.rx * 2, BOWL.ry * 2);
  });
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(x, y, BOWL.rx, BOWL.ry, 0, Math.PI, P2);
  ctx.stroke();
  ctx.strokeStyle = '#8a6a2a';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  bowlFront(ctx, x, y);
  // the star-fire's light on the flags round its feet and up the throne's side
  lightPool(ctx, x, foot - 6, 170, 30, '#c060ff', 0.22);
  lightPool(ctx, x + (x < TX ? 150 : -150), 520, 120, 150, '#d070ff', 0.1);
}

function braziers(ctx: Ctx): void {
  for (const b of TF.braziers) brazier(ctx, b);
}

// ——— left: the obelisk of the six stones ———

const OB = TF.obelisk;
const OB_BOX = { x: OB.x - 140, y: 160, w: 320, h: OB.foot + 30 - 100 };

function obelisk(ctx: Ctx, r: R): void {
  const x = OB.x;
  const f = OB.foot;
  // the plinth: two steps (left of the centre, so their right sides show)
  for (const [w, top, h] of [[200, f - 30, 30], [164, f - 56, 26]] as const) {
    const x0 = x - w / 2;
    const x1 = x + w / 2;
    const side = polyPath([[x1, top], [x1 + 12, top - 9], [x1 + 12, top + h - 8], [x1, top + h]]);
    block(ctx, side, { x: x1 - 2, y: top - 12, w: 20, h: h + 12 }, { base: '#1e1c42', bevel: 1.5, t0: 0.5, t1: 0.9, rimA: 0.4, inkW: 2, step: 4 });
    const tp = polyPath([[x0, top], [x1, top], [x1 + 12, top - 9], [x0 + 12, top - 9]]);
    flat(ctx, tp, '#625fa0', 2, INK, 0);
    block(ctx, rectPath(x0, top, w, h), { x: x0, y: top, w, h }, { bevel: 3, t0: 0.05, t1: 0.6, inkW: 2.4, step: 5 });
  }
  castShadow(ctx, rectPath(x - 100, f - 30, 200, 30), 18, 20, 0.5, '#06041a');
  // the shaft: tapering, its right side showing in shade, a pyramidion on top
  const b0 = f - 56;
  const shaft = polyPath([[x - 58, b0], [x - 34, 268], [x + 34, 268], [x + 58, b0]]);
  const sideP = polyPath([[x + 58, b0], [x + 34, 268], [x + 46, 264], [x + 72, b0 - 6]]);
  block(ctx, sideP, { x: x + 34, y: 264, w: 40, h: b0 - 210 }, { base: '#1c1a40', bevel: 2, t0: 0.5, t1: 0.95, rimA: 0.55, inkW: 2.4, step: 5 });
  block(ctx, shaft, { x: x - 58, y: 268, w: 116, h: b0 - 268 }, { bevel: 5, t0: 0.05, t1: 0.65, inkW: 3 });
  const pyr = polyPath([[x - 34, 268], [x + 2, 196], [x + 34, 268]]);
  const pyrSide = polyPath([[x + 34, 268], [x + 2, 196], [x + 46, 264]]);
  block(ctx, pyrSide, { x: x, y: 196, w: 46, h: 74 }, { base: '#1c1a40', bevel: 1.5, t0: 0.5, t1: 0.9, rimA: 0.5, inkW: 2, step: 4 });
  gold(ctx, pyr, { x: x - 34, y: 196, w: 68, h: 74 }, 2.6);
  // the six stones' glyphs carved down its face, each an empty hexagonal setting, a gold channel joining them
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, 290);
  ctx.lineTo(x, 604);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const gy = 304 + i * 56;
    const s = 15 - i * 0.6;
    const hex: [number, number][] = [];
    for (let k = 0; k < 6; k++) hex.push([x + Math.cos((k / 6) * P2) * s * 1.2, gy + Math.sin((k / 6) * P2) * s]);
    const hp = polyPath(hex);
    flat(ctx, hp, '#0c0a22', 0, INK);
    edgeBand(ctx, hp, 3, 3, '#05040e');
    edgeBand(ctx, hp, -2, -2, '#7a78b8');
    within(ctx, hp, () => {
      const g = ctx.createRadialGradient(x + 2, gy + 3, 0, x + 2, gy + 3, s);
      g.addColorStop(0, rgba(STONES[i], 0.16));
      g.addColorStop(1, rgba(STONES[i], 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - s * 1.3, gy - s, s * 2.6, s * 2);
    });
    ink(ctx, hp, 1.8, INK, 0);
  }
  // a crack running down from a chipped corner, weather streaks
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - 38, 300);
  ctx.lineTo(x - 30, 330);
  ctx.lineTo(x - 40, 362);
  ctx.lineTo(x - 28, 400);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const sx = x - 40 + r() * 80;
    ctx.fillStyle = rgba('#0c0a24', 0.25);
    ctx.fillRect(sx, 280 + r() * 40, 2, 60 + r() * 100);
  }
}

// ——— right: the broken pillar and its fallen drums ———

const PIL = TF.pillar;
const PIL_BOX = { x: 1400, y: PIL.top - 40, w: W - 1400, h: TY - (PIL.top - 40) };

/** A fluted pillar's stretch: the flutes as lit and shaded stripes (right of the centre, so its left side shows). */
function fluted(ctx: Ctx, x0: number, x1: number, y0: number, y1: number): void {
  const n = 7;
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const lit = Math.cos((u - 0.3) * Math.PI);
    ctx.fillStyle = lit > 0.5 ? rgba('#8a88c8', 0.35 * (lit - 0.5) * 2) : rgba('#06041a', 0.4 * (0.5 - lit));
    ctx.fillRect(x0 + i * w + 2, y0, w - 4, y1 - y0);
    ctx.fillStyle = rgba('#06041a', 0.5);
    ctx.fillRect(x0 + i * w, y0, 1.6, y1 - y0);
  }
}

function ruins(ctx: Ctx, r: R): void {
  const { x, foot, top } = PIL;
  const x0 = x - 56;
  const x1 = x + 56;
  // plinth
  const pl = rectPath(x - 74, foot - 26, 148, 26);
  castShadow(ctx, pl, 16, 18, 0.5, '#06041a');
  const plSide = polyPath([[x - 74, foot - 26], [x - 86, foot - 35], [x - 86, foot - 8], [x - 74, foot]]);
  block(ctx, plSide, { x: x - 90, y: foot - 38, w: 20, h: 40 }, { base: '#5a58a0', bevel: 1.5, t0: 0, t1: 0.3, inkW: 2, step: 4 });
  flat(ctx, polyPath([[x - 74, foot - 26], [x + 74, foot - 26], [x + 62, foot - 35], [x - 86, foot - 35]]), '#625fa0', 2, INK, 0);
  block(ctx, pl, { x: x - 74, y: foot - 26, w: 148, h: 26 }, { bevel: 3, t0: 0.1, t1: 0.7, inkW: 2.4, step: 5 });
  // the shaft, snapped off in a jagged break
  const brk: [number, number][] = [[x0, top + 40], [x0 + 16, top + 18], [x0 + 30, top + 30], [x0 + 46, top], [x0 + 62, top + 16], [x0 + 78, top - 6], [x0 + 94, top + 22], [x1, top + 34]];
  const shaftP = polyPath([...brk, [x1, foot - 26], [x0, foot - 26]]);
  const sideP = polyPath([[x0, top + 40], [x0 - 12, top + 48], [x0 - 12, foot - 30], [x0, foot - 26]]);
  block(ctx, sideP, { x: x0 - 12, y: top + 40, w: 14, h: foot - top }, { base: '#5e5ca4', bevel: 1.5, t0: 0, t1: 0.35, inkW: 2.2, step: 4 });
  flat(ctx, shaftP, STONE, 0, INK);
  within(ctx, shaftP, () => {
    fluted(ctx, x0, x1, top - 10, foot - 26);
    dots(ctx, { x: x0, y: top - 10, w: x1 - x0, h: foot - top }, linTone(x0 + 20, 0, x1, 0, 0.05, 0.7), SHADE, { step: 6, angle: 0.79, a: 0.8 });
    edgeBand(ctx, shaftP, -3, 0, rgba(CORE, 0.5));
    // the break's top face: rough, catching the light
    ctx.fillStyle = '#7a78b8';
    ctx.beginPath();
    brk.forEach(([bx, by], i) => (i ? ctx.lineTo(bx, by + 2) : ctx.moveTo(bx, by + 2)));
    for (let i = brk.length - 1; i >= 0; i--) ctx.lineTo(brk[i][0], brk[i][1] + 12);
    ctx.fill();
    dots(ctx, { x: x0, y: top - 10, w: x1 - x0, h: 60 }, linTone(x0, 0, x1, 0, 0.1, 0.6), SHADE, { step: 4, angle: 0.79 });
  });
  ink(ctx, shaftP, 3, INK, 0.6);
  for (const by of [foot - 120, top + 110]) gold(ctx, rectPath(x0 - 2, by, x1 - x0 + 4, 12), { x: x0 - 2, y: by, w: x1 - x0 + 4, h: 12 }, 2);
  // cracks off the break
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x0 + 46, top + 8);
  ctx.lineTo(x0 + 40, top + 46);
  ctx.lineTo(x0 + 52, top + 80);
  ctx.moveTo(x0 + 78, top + 4);
  ctx.lineTo(x0 + 88, top + 50);
  ctx.stroke();
  // the fallen drums: lying on their sides, end faces turned to us, fluted along their length
  const drum = (dx0: number, dx1: number, cy: number, rad: number) => {
    groundShadow(ctx, (dx0 + dx1) / 2 + 20, cy + rad, (dx1 - dx0) / 2 + 30, 10, 0.6, '#06041a', 1.3);
    const body = polyPath([[dx0, cy - rad], [dx1, cy - rad + 4], [dx1, cy + rad - 2], [dx0, cy + rad]]);
    flat(ctx, body, STONE, 0, INK);
    within(ctx, body, () => {
      for (let k = 0; k < 6; k++) {
        const u = (k + 0.5) / 6;
        const yy = cy - rad + u * rad * 2;
        const lit = Math.cos((u - 0.25) * Math.PI);
        ctx.fillStyle = lit > 0.5 ? rgba('#8a88c8', 0.4 * (lit - 0.5) * 2) : rgba('#06041a', 0.45 * (0.5 - lit));
        ctx.fillRect(dx0, yy - rad / 6 + 1.5, dx1 - dx0, rad / 3 - 3);
        ctx.fillStyle = rgba('#06041a', 0.5);
        ctx.fillRect(dx0, yy - rad / 6, dx1 - dx0, 1.4);
      }
      dots(ctx, { x: dx0, y: cy - rad, w: dx1 - dx0, h: rad * 2 }, linTone(0, cy - rad * 0.5, 0, cy + rad, 0.05, 0.75), SHADE, { step: 5, angle: 0.79 });
    });
    ink(ctx, body, 2.6, INK, 0.5);
    const end = ellPath(dx0, cy, rad * 0.34, rad);
    block(ctx, end, { x: dx0 - rad * 0.34, y: cy - rad, w: rad * 0.68, h: rad * 2 }, { base: '#5e5ca0', lit: '#9896d0', bevel: 3, t0: 0, t1: 0.5, inkW: 2.4, step: 4 });
    ctx.strokeStyle = rgba(INK, 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(dx0, cy, rad * 0.2, rad * 0.6, 0, 0, P2);
    ctx.stroke();
  };
  drum(1556, 1640, 662, 30);
  drum(1440, 1600, 690, 42);
  // rubble round them
  for (let i = 0; i < 16; i++) {
    const rx = 1420 + r() * 420;
    const ry = 700 + r() * 40;
    const s = 3 + r() * 7;
    const p = polyPath([[rx - s, ry], [rx - s * 0.4, ry - s * 0.8], [rx + s * 0.6, ry - s * 0.6], [rx + s, ry]]);
    groundShadow(ctx, rx + 2, ry, s * 1.2, s * 0.3, 0.5, '#06041a');
    block(ctx, p, { x: rx - s, y: ry - s, w: s * 2, h: s }, { bevel: 1.5, t0: 0, t1: 0.8, inkW: 1.4, step: 3 });
  }
}

// ——— still versions of what the live layer plays ———

function flamesStill(ctx: Ctx): void {
  for (const [i, b] of TF.braziers.entries()) {
    ctx.save();
    ctx.translate(b.x - FIRE_F.w / 2, b.bowl + 14 - FIRE_F.h);
    starFireFrame(ctx, FIRE_F.w, FIRE_F.h, 0.2 + i * 0.4, i);
    ctx.restore();
    bowlFront(ctx, b.x, b.bowl);
  }
}

// ——— the table: the dais's slab of polished star-marble ———

function table(ctx: Ctx, r: R): void {
  const zf = TF.front;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, zf - TY + 2);
  ctx.clip();
  // star-marble: a midnight blue, clouded in printed dots, engraved with a star chart, veined gold, flecked with mica
  vfill(ctx, 0, TY, W, zf - TY, [[0, '#262c5e'], [0.4, '#343e78'], [1, '#41508e']]);
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => {
    const n = Math.sin(x * 0.006 + y * 0.011) * Math.sin(x * 0.013 - y * 0.02 + 1.3) + 0.4 * Math.sin(x * 0.031 + y * 0.05);
    return Math.max(0, n) * 0.5;
  }, '#8a9ae0', { step: 6, angle: 0.26, a: 0.22 });
  starChart(ctx, r);
  // gold veins wandering through the marble
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    let x = r() * W;
    let y = TY + 10 + r() * (zf - TY - 20);
    ctx.strokeStyle = rgba('#e0b25a', 0.22 + r() * 0.2);
    ctx.lineWidth = 0.8 + r() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += 30 + r() * 60;
      y += (r() - 0.5) * 22;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // the marble's mica: star-flecks, more and bigger towards us
  for (let i = 0; i < 520; i++) {
    const y = TY + r() ** 0.7 * (zf - TY);
    const x = r() * W;
    const k = (y - TY) / (zf - TY);
    ctx.fillStyle = rgba(r() < 0.8 ? '#e8e4ff' : '#ffd88a', 0.25 + r() * 0.45);
    const s = 0.6 + k * 1.6 * r();
    ctx.fillRect(x, y, s, s);
  }
  // the inlay: a gold band just inside the back edge, two lines running to the vanishing point between the plates
  ctx.fillStyle = rgba(GOLD, 0.75);
  ctx.fillRect(0, TY + 16, W, 4);
  ctx.fillStyle = rgba(GOLD_LIT, 0.5);
  ctx.fillRect(0, TY + 16, W, 1.2);
  for (const fx of [700, 1220]) {
    ctx.strokeStyle = rgba(GOLD, 0.6);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(at(fx + (fx - VX) * 0.6, zf, TY + 20), TY + 20);
    ctx.lineTo(fx + (fx - VX) * 0.6, zf);
    ctx.stroke();
  }
  // the braziers' light reflected in the polish: soft streaks of violet down the slab under them
  for (const b of TF.braziers) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createLinearGradient(0, TY, 0, TY + 170);
    rg.addColorStop(0, 'rgba(200,110,255,0.22)');
    rg.addColorStop(1, 'rgba(200,110,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(b.x - 40, TY);
    ctx.lineTo(b.x + 40, TY);
    ctx.lineTo(b.x + (b.x - VX) * 0.25 + 70, TY + 170);
    ctx.lineTo(b.x + (b.x - VX) * 0.25 - 70, TY + 170);
    ctx.fill();
    ctx.restore();
  }
  // printed: the shade's dots at the back and to the right, a sheen of light dots on the near left
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => 0.42 * (1 - smooth(TY, TY + 140, y)) + 0.16 * smooth(zf - 130, zf, y) + 0.14 * smooth(1100, W, x) + 0.05, '#0a0c30', { step: 8, angle: 0.79, a: 0.6 });
  dots(ctx, { x: 0, y: TY + 60, w: 900, h: zf - TY - 60 }, (x, y) => 0.18 * (1 - smooth(0, 900, x)) * smooth(TY + 60, TY + 200, y), '#c8c4ff', { step: 8, angle: 0.26, a: 0.35 });
  ctx.restore();
  // the step down from the flags: the floor's shadow along the slab's back
  ctx.fillStyle = rgba('#06041a', 0.4);
  ctx.fillRect(0, TY, W, 12);
  tableFalloff(ctx, zf, 0.3, '#06041a');
  tableSeam(ctx, 0.55, INK, false);
  // the front face: dark stone with a gold band
  const ff = rectPath(0, zf, W, 1080 - zf);
  flat(ctx, ff, '#2a2650', 0, INK);
  within(ctx, ff, () => {
    dots(ctx, { x: 0, y: zf, w: W, h: 1080 - zf }, (_x, y) => 0.35 + 0.5 * smooth(zf, 1080, y), '#06041a', { step: 6, angle: 0.79, a: 0.85 });
    ctx.fillStyle = rgba('#b0a8ff', 0.4);
    ctx.fillRect(0, zf, W, 2.5);
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, zf + 12, W, 6);
    ctx.fillStyle = GOLD_LIT;
    ctx.fillRect(0, zf + 12, W, 1.5);
    ctx.fillStyle = rgba(INK, 0.6);
    for (let x = 160; x < W; x += 400) ctx.fillRect(x, zf, 3, 1080 - zf);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, zf);
  ctx.lineTo(W, zf);
  ctx.stroke();
}

/** The dais's engraving: constellations cut into the marble and filled with gold, foreshortened on the slab, kept
 * between the plates and fine so the pizzas sit on calm stone. */
function starChart(ctx: Ctx, r: R): void {
  const zf = TF.front;
  // a point on the slab: u across (0…1 of the screen at the front), v back to front (0…1)
  const P = (u: number, v: number): [number, number] => {
    const y = TY + 24 + v * (zf - TY - 40);
    return [at(u * W, zf, y), y];
  };
  const groups: [number, number][][] = [
    [[0.04, 0.2], [0.09, 0.42], [0.15, 0.36], [0.19, 0.62], [0.13, 0.82]],
    [[0.33, 0.1], [0.37, 0.24], [0.42, 0.18], [0.46, 0.06]],
    [[0.62, 0.88], [0.58, 0.72], [0.64, 0.6], [0.7, 0.74]],
    [[0.82, 0.2], [0.87, 0.34], [0.93, 0.28], [0.97, 0.5], [0.9, 0.66]],
    [[0.3, 0.92], [0.36, 0.78], [0.41, 0.86]],
  ];
  ctx.save();
  ctx.lineCap = 'round';
  for (const g of groups) {
    const pts = g.map(([u, v]) => P(u, v));
    // the cut: a dark groove, its gold fill, a glint on its near lip
    for (const [lw, col] of [[3, 'rgba(6,8,30,0.6)'], [1.6, rgba(GOLD, 0.7)], [0.6, rgba(GOLD_LIT, 0.6)]] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    for (const [x, y] of pts) {
      const s = 3 + r() * 3;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.5);
      flat(ctx, ellPath(0, 0, s + 1.5, s + 1.5), '#0a0c30', 0, INK);
      sparkle(ctx, 0, 0, s * 1.6, GOLD_LIT, 0.95);
      ctx.restore();
    }
  }
  // a fine compass ring of the chart round the table's edge: ticks along the back band
  ctx.strokeStyle = rgba(GOLD, 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 12; x < W; x += 24) {
    ctx.moveTo(x, TY + 22);
    ctx.lineTo(x, TY + (x % 120 < 24 ? 32 : 27));
  }
  ctx.stroke();
  ctx.restore();
}

/** The box's crumbling edge (its dust drifts off it live). */
const BOX_EDGE: [number, number][] = (() => {
  const { x, y } = TF.table.box;
  const r = rng(808);
  const pts: [number, number][] = [];
  for (let k = 0; k <= 8; k++) {
    const u = k / 8;
    pts.push([x + 6 + u * 28 + (r() - 0.5) * 16, y - 20 + u * 44]);
  }
  return pts;
})();

function tableProps(ctx: Ctx, r: R): void {
  // the reliquary casket at the back left: lid thrown open, six empty settings in the velvet
  const { x, y } = TF.table.casket;
  const bx0 = x - 82;
  const bx1 = x + 82;
  const top = y - 6;
  const back = y - 24;
  groundShadow(ctx, x + 26, y + 32, 130, 12, 0.6, '#06041a', 1.3);
  // the lid, standing open behind
  const lid = polyPath([[at(bx0, top, back), back], [at(bx1, top, back), back], [at(bx1, top, back) - 6, back - 50], [at(bx0, top, back) + 6, back - 50]]);
  flat(ctx, lid, '#4a1a46', 0, INK);
  within(ctx, lid, () => {
    dots(ctx, { x: bx0, y: back - 52, w: bx1 - bx0, h: 54 }, linTone(bx0, back - 50, bx1, back, 0.1, 0.7), '#14041a', { step: 4, angle: 0.79 });
  });
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  lid(ctx);
  ctx.stroke();
  ctx.restore();
  ink(ctx, lid, 2.2, INK, 0.4);
  // the lid's thickness, its right edge turned to us like the box's end
  {
    const lx = at(bx1, top, back);
    const edge = polyPath([[lx, back], [lx + 5, back - 2], [lx - 1, back - 53], [lx - 6, back - 50]]);
    gold(ctx, edge, { x: lx - 6, y: back - 53, w: 11, h: 53 }, 1.4);
    const topEdge = polyPath([[at(bx0, top, back) + 6, back - 50], [lx - 6, back - 50], [lx - 1, back - 53], [at(bx0, top, back) + 11, back - 53]]);
    gold(ctx, topEdge, { x: bx0, y: back - 53, w: lx - bx0, h: 3 }, 1.2);
  }
  // the box: its top (the velvet tray), its front
  const tp = topOf(bx0, bx1, top, back);
  flat(ctx, tp, '#5a1e52', 0, INK);
  within(ctx, tp, () => {
    for (let i = 0; i < 6; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const yy = back + 6.5 + row * 6.5;
      const xx = at(bx0 + 32 + col * 50, top, yy);
      const hollow = ellPath(xx, yy, 11, 3.2);
      flat(ctx, hollow, '#14041a', 0, INK);
      within(ctx, hollow, () => {
        const gg = ctx.createRadialGradient(xx, yy + 1, 0, xx, yy + 1, 12);
        gg.addColorStop(0, rgba(STONES[i], 0.14));
        gg.addColorStop(1, rgba(STONES[i], 0));
        ctx.fillStyle = gg;
        ctx.fillRect(xx - 13, yy - 4, 26, 8);
      });
    }
  });
  ink(ctx, tp, 2, INK, 0);
  // the walls' thickness round the tray: a rim along the front and down the right, the far walls' inner faces
  const rim = 5;
  const bk0 = at(bx0, top, back);
  const bk1 = at(bx1, top, back);
  const innerFar = polyPath([[bk0 + rim, back], [bk1 - rim, back], [bk1 - rim, back + 3], [bk0 + rim, back + 3]]);
  flat(ctx, innerFar, '#2a1438', 0, INK);
  const innerRight = polyPath([[bk1 - rim, back], [bk1 - rim, back + 3], [bx1 - rim, top - 1], [bx1 - rim, top - 3]]);
  flat(ctx, innerRight, '#22102e', 0, INK);
  const rimFront = polyPath([[bx0, top], [bx1, top], [bx1 - rim, top - 2.5], [bx0 + rim, top - 2.5]]);
  gold(ctx, rimFront, { x: bx0, y: top - 2.5, w: bx1 - bx0, h: 2.5 }, 1.2);
  const rimRight = polyPath([[bx1, top], [bk1, back], [bk1 - rim, back + 0.5], [bx1 - rim, top - 2.5]]);
  gold(ctx, rimRight, { x: bx1 - rim, y: back, w: bk1 - bx1 + rim, h: top - back }, 1.2);
  const rimLeft = polyPath([[bx0, top], [bk0, back], [bk0 + rim, back + 0.5], [bx0 + rim, top - 2.5]]);
  gold(ctx, rimLeft, { x: bx0, y: back, w: bk0 - bx0 + rim, h: top - back }, 1.2);
  // the right end: the casket sits left of the vanishing point, so its right side turns to us, foreshortened
  const sk = (back - HY) / (top - HY);
  const side = polyPath([[bx1, top], [bk1, back], [bk1, back + 34 * sk], [bx1, top + 34]]);
  block(ctx, side, { x: bx1, y: back, w: bk1 - bx1, h: top + 34 - back }, { base: '#2a1e4a', lit: '#5a4a88', bevel: 2, t0: 0.4, t1: 0.9, inkW: 2.4, step: 4 });
  gold(ctx, polyPath([[bx1, top + 2], [bk1, back + 2 * sk], [bk1, back + 8 * sk], [bx1, top + 8]]), { x: bx1, y: back, w: bk1 - bx1, h: top + 8 - back }, 1.2);
  gold(ctx, polyPath([[bk1 - 3, back], [bk1 + 1, back], [bk1 + 1, back + 34 * sk], [bk1 - 3, back + 34 * sk]]), { x: bk1 - 3, y: back, w: 4, h: 34 * sk }, 1.2);
  const front = rectPath(bx0, top, bx1 - bx0, 34);
  block(ctx, front, { x: bx0, y: top, w: bx1 - bx0, h: 34 }, { base: '#3a2a5e', lit: '#7a6aa8', bevel: 3, t0: 0.05, t1: 0.7, inkW: 2.4, step: 4 });
  gold(ctx, rectPath(bx0, top + 2, bx1 - bx0, 6), { x: bx0, y: top + 2, w: bx1 - bx0, h: 6 }, 1.4);
  for (const cx of [bx0 + 4, bx1 - 4]) gold(ctx, rectPath(cx - 7, top, 14, 34), { x: cx - 7, y: top, w: 14, h: 34 }, 1.6);
  gold(ctx, rrPath(x - 12, top + 12, 24, 16, 4), { x: x - 12, y: top + 12, w: 24, h: 16 }, 1.6);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, top + 19, 2.6, 0, P2);
  ctx.fill();
  ctx.fillRect(x - 1, top + 19, 2, 6);

  // a Metropizza box at the back right, half of it gone to dust (perfectly balanced)
  const p = TF.table.box;
  const lidP = polyPath([[p.x - 110, p.y - 14], [p.x + 6, p.y - 22], ...BOX_EDGE.slice(1, -1), [p.x + 34, p.y + 24], [p.x - 84, p.y + 14]]);
  const frontP = polyPath([[p.x - 84, p.y + 14], [p.x + 34, p.y + 24], [p.x + 33, p.y + 36], [p.x - 84, p.y + 26]]);
  groundShadow(ctx, p.x - 20, p.y + 30, 110, 11, 0.6, '#06041a', 1.3);
  flat(ctx, frontP, '#b89870', 2.2, INK, 0);
  flat(ctx, lidP, '#f4e8d0', 0, INK);
  within(ctx, lidP, () => {
    ctx.save();
    ctx.translate(p.x - 40, p.y);
    ctx.scale(1, 0.3);
    flat(ctx, ellPath(0, 0, 40, 40), '#d8322e', 3, INK, 0);
    flat(ctx, polyPath([[-15, -17], [15, -17], [0, 21]]), '#ffd23a', 2.4, INK, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(p.x - 98, p.y + 4);
    ctx.transform(1, -0.07, 0.6, 0.42, 0, 0);
    ctx.fillStyle = '#d8322e';
    ctx.font = `20px ${BLOCK}`;
    ctx.fillText('METRO', 0, 0);
    ctx.restore();
    dots(ctx, { x: p.x - 110, y: p.y - 24, w: 150, h: 50 }, linTone(p.x - 60, 0, p.x + 30, 0, 0, 0.5), '#6a5a4a', { step: 4, angle: 0.79 });
    // the dust eating in from the broken edge
    dots(ctx, { x: p.x - 40, y: p.y - 26, w: 80, h: 56 }, (xx) => smooth(p.x - 30, p.x + 30, xx) * 0.8, '#8a7a66', { step: 3.5, angle: 0.26 });
  });
  ink(ctx, lidP, 2.4, INK, 0.5);
  // the flakes it's falling into, drifting right, finer and fainter as they go
  for (let i = 0; i < 46; i++) {
    const u = r();
    const fx = p.x + 30 + u * 150 + (r() - 0.5) * 20;
    const fy = p.y - 16 + r() * 44 - u * 30;
    const s = 1 + (1 - u) * 4 * r();
    ctx.fillStyle = rgba(r() < 0.6 ? '#e8dcc0' : '#b89870', 0.9 - u * 0.6);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(r() * 3);
    ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
    ctx.restore();
  }
}

function rrPath(x: number, y: number, w: number, h: number, rad: number): PathFn {
  return (c) => {
    c.beginPath();
    c.roundRect(x, y, w, h, rad);
  };
}

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0, '#d8d0ff', 0.03, { warm: '#ffd8a0', cool: '#4a3ab8', a: 0.14 });
}

function shadeOver(ctx: Ctx): void {
  // the HUD's corners calm, the boss bar's band calm, the lanes calm, a vignette
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(4,2,18,0.42)');
  g.addColorStop(1, 'rgba(4,2,18,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
  const cg = ctx.createLinearGradient(0, 0, 0, 250);
  cg.addColorStop(0, 'rgba(4,2,18,0.34)');
  cg.addColorStop(1, 'rgba(4,2,18,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, 250);
  const rg = ctx.createRadialGradient(1830, 60, 20, 1830, 60, 300);
  rg.addColorStop(0, 'rgba(4,2,18,0.4)');
  rg.addColorStop(1, 'rgba(4,2,18,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(1500, 0, 420, 360);
  calmLanes(ctx, 0.14, '#08041c', 140, 640);
  vignetteAll(ctx, 0.55, '#04021a');
}

// ——— the stack ———

const FACE_BOX: Box = { x: W0.x - ERX - 10, y: W0.y - W0.r - 10, w: ERX * 2 + 20, h: W0.r * 2 + 20 };

export const THRONE: SceneSpec = {
  id: 'thanfoot',
  info: {
    name: "Titan's Throne",
    subtitle: 'Boss: THANFOOT',
    ambient: [],
    glows: [],
    light: '#e0c8ff',
    tableTint: '#f0e8ff',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'krackleStill', box: { x: 0, y: 80, w: 1000, h: 480 }, stillOnly: true, draw: krackleStill },
    { id: 'world', box: WORLD_BOX, draw: world },
    { id: 'faceStill', box: FACE_BOX, stillOnly: true, draw: (c) => faceStill(c) },
    { id: 'debrisStill', box: WORLD_BOX, stillOnly: true, draw: debrisStill },
    { id: 'farRocks', box: { x: 0, y: 460, w: W, h: TF.horizon + 10 - 460 }, draw: farRocks },
    { id: 'floor', box: FLOOR_BOX, draw: floor },
    { id: 'obelisk', box: OB_BOX, draw: obelisk },
    { id: 'ruins', box: PIL_BOX, draw: ruins },
    { id: 'throne', box: THRONE_BOX, draw: throne },
    { id: 'braziers', box: { x: 440, y: 480, w: 1040, h: 250 }, draw: braziers },
    { id: 'flamesStill', box: { x: 440, y: 240, w: 1040, h: 330 }, stillOnly: true, draw: flamesStill },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'tableProps', box: { x: 0, y: TY - 60, w: W, h: 160 }, draw: tableProps },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— frame painters ———

const FIRE_F = { w: 160, h: 270 };
const FIRE_K = 0.8;
const FIRE_N = 12;
const FACE_K = 0.8;
const FACE_N = 12;
const CHIP_HALF = 20;
const CHIP_N = 8;
const KR = 72;
const KR_N = 4;

const FIRE_INK = '#140a30';
const FIRE_COLS = ['#6a2ad8', '#d43ee0', '#ff9cf4', '#fff6ff'];

/**
 * One frame of star-fire (phase 0…1 loops) in a w×h frame, its base at the bottom centre: inked tongues in four flat
 * colours (violet, magenta, cyan, a white core), each tongue rising and falling and its tip swaying on its own beat,
 * licks breaking off the tips and rising as they shrink, and Kirby krackle (black blobs rimmed white) carried up
 * through the flame.
 */
function starFireFrame(c: Ctx, w: number, h: number, ph: number, seed: number): void {
  const r = rng(seed * 97 + 41);
  const base = h - 6;
  const cx = w / 2;
  const bw = w * 0.3;
  const n = 5;
  const tongues = Array.from({ length: n }, (_, i) => {
    const u = (i + 0.5) / n;
    const mid = Math.sin(Math.PI * u);
    return { x: cx + (u - 0.5) * bw * 1.7 + (r() - 0.5) * 8, w: bw * (0.34 + 0.18 * mid), h: h * 0.62 * (0.42 + 0.58 * mid) * (0.85 + r() * 0.3), o: r(), m: 1 + (i % 2) };
  });
  const shape = (k: number, lift: number): PathFn => (g) => {
    g.beginPath();
    for (const t of tongues) {
      const wob = Math.sin(P2 * (ph * t.m + t.o));
      const hh = t.h * (0.86 + 0.14 * wob) * k;
      const sway = Math.sin(P2 * (ph * t.m + t.o + 0.25)) * 10 * k;
      const ww = t.w * (0.55 + 0.45 * k);
      const b = base - lift;
      g.moveTo(t.x - ww, b);
      g.bezierCurveTo(t.x - ww, b - hh * 0.55, t.x + sway * 0.4 - ww * 0.25, b - hh * 0.8, t.x + sway, b - hh);
      g.bezierCurveTo(t.x + sway * 0.4 + ww * 0.25, b - hh * 0.8, t.x + ww, b - hh * 0.55, t.x + ww, b);
      g.closePath();
    }
    g.moveTo(cx + bw * (0.3 + 0.7 * k), base - lift - 6);
    g.ellipse(cx, base - lift - 6, bw * (0.3 + 0.7 * k), 12 * k + 2, 0, 0, P2);
  };
  const licks: [number, number, number][] = [];
  for (let k = 0; k < 3; k++) {
    const t = tongues[1 + k];
    const u = (ph + k / 3 + t.o) % 1;
    const sway = Math.sin(P2 * (ph * t.m + t.o + 0.25)) * 10;
    licks.push([t.x + sway + u * 10 * (k - 1), base - t.h * 0.9 - u * h * 0.3, (1 - u) * t.w * 0.42]);
  }
  const lickPath: PathFn = (g) => {
    g.beginPath();
    for (const [x, y, s] of licks) {
      if (s < 1.5) continue;
      // a tongue of flame torn off the tip: pointed above, a ragged split below
      g.moveTo(x, y - s * 3.2);
      g.quadraticCurveTo(x + s * 0.9, y - s * 1.2, x + s * 0.7, y + s * 0.4);
      g.lineTo(x + s * 0.15, y - s * 0.3);
      g.lineTo(x - s * 0.3, y + s * 0.6);
      g.quadraticCurveTo(x - s * 1.0, y - s * 1.0, x, y - s * 3.2);
      g.closePath();
    }
  };
  c.save();
  c.lineJoin = 'round';
  // a soft halo first (it's light), then the inked flame
  const hg = c.createRadialGradient(cx, base - h * 0.3, 0, cx, base - h * 0.3, h * 0.5);
  hg.addColorStop(0, 'rgba(220,110,255,0.3)');
  hg.addColorStop(1, 'rgba(220,110,255,0)');
  c.fillStyle = hg;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = FIRE_INK;
  c.lineWidth = 5;
  const outer = shape(1, 0);
  outer(c);
  c.stroke();
  lickPath(c);
  c.stroke();
  c.fillStyle = FIRE_COLS[0];
  outer(c);
  c.fill();
  lickPath(c);
  c.fill();
  dotsIn(c, outer, { x: 0, y: 0, w, h }, linTone(0, base - h * 0.3, 0, base, 0, 0.55), '#2a0a6a', { step: 4, angle: 0.79, a: 0.7 });
  c.fillStyle = FIRE_COLS[1];
  shape(0.74, 3)(c);
  c.fill();
  c.beginPath();
  for (const [x, y, s] of licks)
    if (s > 3) {
      c.moveTo(x, y - s * 2.2);
      c.quadraticCurveTo(x + s * 0.45, y - s * 0.9, x + s * 0.2, y);
      c.quadraticCurveTo(x - s * 0.45, y - s * 0.7, x, y - s * 2.2);
    }
  c.fill();
  c.fillStyle = FIRE_COLS[2];
  shape(0.5, 6)(c);
  c.fill();
  c.fillStyle = FIRE_COLS[3];
  shape(0.26, 9)(c);
  c.fill();
  // the krackle riding up through the flame: blobs born low, rising and shrinking, rimmed white
  c.save();
  outer(c);
  c.clip();
  const kr = rng(seed * 13 + 5);
  for (let k = 0; k < 5; k++) {
    // each blob rides up its own path once per loop, swelling in and shrinking away (no pops at the seam)
    const u = (ph + k / 5) % 1;
    const x0 = cx + (kr() - 0.5) * bw * 1.2;
    const x = x0 + Math.sin(P2 * u + k) * 6;
    const y = base - 20 - u * h * 0.34;
    const s = (2.5 + kr() * 3) * Math.sin(Math.PI * u);
    if (s < 0.8) continue;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(x, y, s + 1.6, 0, P2);
    c.fill();
    c.fillStyle = INK;
    c.beginPath();
    c.ellipse(x, y, s, s * 0.8, kr() * 3, 0, P2);
    c.fill();
  }
  c.restore();
  c.restore();
}

/** A comic shooting star: a white four-point head, a tapering cyan streak with speed lines, along +x (head right). */
function cometTex(c: Ctx, w: number, h: number): void {
  const hy = h / 2;
  const hx = w - 14;
  // the tail: a tapered flat ribbon (pale cyan, a white core), inked, its far end broken into printed dots
  // (the dots run on under the ribbon, swelling towards it, so the tail is one piece)
  dots(c, { x: 0, y: hy - 7, w: w * 0.62, h: 14 }, (x, y) => Math.min(1, (x / (w * 0.5)) ** 1.3) * 0.85 * (1 - Math.abs(y - hy) / 7), '#8ad8f4', { step: 4, angle: 0 });
  const tail = polyPath([[w * 0.2, hy], [hx - 4, hy - 6], [hx, hy], [hx - 4, hy + 6]]);
  flat(c, tail, '#8ad8f4', 2, '#0c1440', 0);
  flat(c, polyPath([[w * 0.45, hy], [hx - 4, hy - 2.6], [hx, hy], [hx - 4, hy + 2.6]]), '#ffffff', 0, INK);
  // speed lines riding with it
  c.strokeStyle = '#c8f0ff';
  c.lineWidth = 1.4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(w * 0.42, hy - 10);
  c.lineTo(hx - 26, hy - 8);
  c.moveTo(w * 0.56, hy + 10);
  c.lineTo(hx - 22, hy + 8);
  c.stroke();
  // the head: an inked four-point star
  c.save();
  c.strokeStyle = '#0c1440';
  c.lineWidth = 2.4;
  c.translate(hx, hy);
  c.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * P2;
    const rr = k % 2 ? 3 : 11;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath();
  c.stroke();
  c.restore();
  sparkle(c, hx, hy, 11, '#ffffff', 1);
}

// ——— live ———

registerKitScene(THRONE, (k) => {
  const fx = k.slot('fx');
  const cm0 = () => calm();

  // ——— the sky: the nebula breathing, the river's krackle and its flow, twinkles, shooting stars
  const neb = k.glow(TF.nebula.x, TF.nebula.y, 360, 0xc050d0, 0.06, { into: fx, sy: 0.7 });
  // each krackle cluster on the river reshuffles on its own beat (4 painted variants), a cyan glow breathing under it
  const krKey = sheet(k, 'tf_krackle', KR, KR, KR_N, (c, _p, i) => krackle(c, KR / 2, KR / 2, 1.6, i));
  const nodes = KR_SPOTS.map(([x, y, s], i) => ({
    glow: k.glow(x, y, 26 + s * 20, 0x9ae8ff, 0.1, { into: fx }),
    img: k.img(krKey, x, y, { into: fx, scale: s / 1.6 }).setFrame(i % KR_N),
    t: crand() * 0.3,
    f: i % KR_N,
    flash: 0,
  }));
  const flowKey = k.tex('tf_flow', 24, 24, (c) => {
    const g = c.createRadialGradient(12, 12, 0, 12, 12, 12);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(190,244,255,0.7)');
    g.addColorStop(1, 'rgba(120,220,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 24, 24);
  });
  const flows = Array.from({ length: 22 }, () => ({ img: k.img(flowKey, 0, 0, { into: fx, add: true, scale: 0.6 }), s: crand(), v: 0.05 + crand() * 0.04, off: (crand() - 0.5) * 1.4 }));
  const twKey = k.tex('tf_twinkle', 48, 48, (c) => sparkle(c, 24, 24, 22, '#ffffff', 1));
  const twinkles = TWINKLES.map(([x, y, s], i) => ({ img: k.img(twKey, x, y, { into: fx, add: true, scale: (s * 1.3) / 22, alpha: 0 }), seed: i * 2.3 }));
  const cometKey = k.tex('tf_comet', 240, 28, (c) => cometTex(c, 240, 28));
  const comets = Array.from({ length: 2 }, () => ({ img: k.img(cometKey, 0, 0, { into: fx, origin: [1, 0.5], alpha: 0 }), t: -1, x: 0, y: 0, vx: 0, vy: 0, life: 1 }));
  let nextComet = 2 + crand() * 3;
  const fireComet = () => {
    const c = comets.find((m) => m.t < 0);
    if (!c) return;
    const L = TF.starLane;
    // two clear lanes: the upper left over the nebula, and the gap between the crown and the world
    const left = crand() < 0.65;
    c.x = left ? L.x0 + crand() * (L.x1 - L.x0) : 1120 + crand() * 120;
    c.y = left ? L.y0 + crand() * (L.y1 - L.y0) : 30 + crand() * 50;
    const sp = 520 + crand() * 260;
    const ang = left ? Math.atan2(L.dy, L.dx) + (crand() - 0.5) * 0.2 : 1.25 + (crand() - 0.5) * 0.15;
    c.vx = Math.cos(ang) * sp;
    c.vy = Math.sin(ang) * sp;
    c.life = (left ? Math.hypot(L.dx, L.dy) : 220) / sp;
    c.t = 0;
    c.img.setRotation(ang).setScale(0.7 + crand() * 0.4, 1);
  };

  // ——— the halved world: the cut face churning, its core breathing, rubble drifting off, molten drops
  const faceW = Math.ceil(ERX * 2 + 16);
  const faceH = Math.ceil(W0.r * 2 + 16);
  const faceKey = sheet(k, 'tf_face', faceW * FACE_K, faceH * FACE_K, FACE_N, (c, ph) => {
    c.scale(FACE_K, FACE_K);
    faceFrame(c, faceW, faceH, ph);
  });
  const face = new Loop(k, faceKey, FACE_N, W0.x, W0.y, { into: fx, scale: 1 / FACE_K, fps: 2.2 });
  const coreGlow = k.glow(W0.x, W0.y, 120, 0xffb050, 0.2, { into: fx, sy: 1.6 });
  const heat = k.glow(W0.x + ERX * 0.5, W0.y, 260, 0xff6a3a, 0.08, { into: fx, sy: 1.2 });
  const chipKey = sheet(k, 'tf_chips', CHIP_HALF * 2, CHIP_HALF * 2, CHIP_N, (c, _p, i) => chip(c, CHIP_HALF, CHIP_HALF, CHIP_HALF - 3, i));
  const rubble = new Parts(k, { frame: 'puff', sheet: { key: chipKey, n: CHIP_N, half: CHIP_HALF }, into: fx, max: 40 });
  const rubbleRate = new Rate();
  const cutPoint = (): [number, number] => {
    const a = (crand() - 0.5) * Math.PI * 0.95;
    return [W0.x + Math.cos(a) * ERX * 0.98, W0.y + Math.sin(a) * W0.r * 0.98];
  };
  const shed = (burst = 1) => {
    const [x, y] = cutPoint();
    const s = (2.5 + crand() ** 2 * 11) * (burst > 1 ? 1.2 : 1);
    rubble.spawn({ x, y, vx: (6 + crand() * 16) * burst, vy: (y - W0.y) * 0.04 * burst + (crand() - 0.5) * 6, life: 16 + crand() * 12, r0: s, a: 1, tint: 0xffffff, spin: (crand() - 0.5) * 0.6, fade: 0.04 });
  };
  for (let i = 0; i < 26; i++) {
    shed();
    rubble.update(0.9);
  }
  const drops = new Parts(k, { frame: 'ember', add: true, into: fx, max: 70 });
  const fling = (n: number, power = 1) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = cutPoint();
      drops.spawn({ x, y, vx: (30 + crand() * 70) * power, vy: (crand() - 0.6) * 60 * power, life: 1.6 + crand() * 1.8, r0: 2.6 + crand() * 2, r1: 0.8, a: 1, tint: crand() < 0.5 ? 0xffb040 : 0xff6a20, grav: 14, drag: 0.25, streak: 0.012, fade: 0.04 });
    }
  };
  let nextDrop = 1 + crand() * 2;

  // ——— the star-fire braziers: painted loops, the bowl's front over their base, light, sparks
  const fireKey = sheet(k, 'tf_fire', FIRE_F.w * FIRE_K, FIRE_F.h * FIRE_K, FIRE_N, (c, ph) => {
    c.scale(FIRE_K, FIRE_K);
    starFireFrame(c, FIRE_F.w, FIRE_F.h, ph, 1);
  });
  const BF = { w: BOWL.rx * 2 + 16, h: BOWL.depth + BOWL.ry + 12 };
  const lipKey = k.tex('tf_bowl', BF.w, BF.h, (c) => {
    c.translate(BF.w / 2, BOWL.ry + 4);
    bowlFront(c, 0, 0);
  });
  const fires = TF.braziers.map((b, i) => {
    const loop = new Loop(k, fireKey, FIRE_N, b.x, b.bowl + 14, { into: fx, origin: [0.5, 1], scale: 1 / FIRE_K, fps: 12 + i * 0.8, phase: i * 5 });
    if (i) loop.each((im) => im.setFlipX(true));
    k.img(lipKey, b.x, b.bowl - BOWL.ry - 4, { into: fx, origin: [0.5, 0] });
    return {
      b,
      loop,
      glow: k.glow(b.x, b.bowl - 70, 170, 0xd060ff, 0.24, { into: fx, sy: 1.1 }),
      wall: k.glow(b.x + (b.x < TX ? 170 : -170), 500, 150, 0xb050ff, 0.1, { into: fx, sy: 1.3 }),
      pool: k.glow(b.x, b.foot - 4, 170, 0xc060ff, 0.12, { into: fx, sy: 0.2 }),
      flare: 0,
      seed: i * 1.9,
    };
  });
  const sparks = new Parts(k, { frame: 'spark', add: true, into: fx, max: 140 });
  const sparkRate = new Rate();
  const SPARK_T = [0xffffff, 0x9ae8ff, 0xf08aff, 0xc8a0ff];
  const spark = (b: (typeof TF.braziers)[number], burst = 1) =>
    sparks.spawn({ x: b.x + (crand() - 0.5) * 60, y: b.bowl - 60 - crand() * 60, vx: (crand() - 0.5) * 50 * burst, vy: -50 - crand() * 100 * burst, life: 1.2 + crand() * 1.4, r0: 2.2 + crand() * 1.4, r1: 0.5, a: 1, tint: SPARK_T[Math.floor(crand() * SPARK_T.length)], grav: -30, drag: 0.4, streak: 0.012, fade: 0.05 });

  // ——— dust off the throne's steps on stomps; the box's dust drifting away
  const dust = new Parts(k, { frame: 'puff', into: fx, max: 40 });
  const flakes = new Parts(k, { frame: 'flake', into: fx, max: 50 });
  const flakeRate = new Rate();
  const flake = () => {
    const [ex, ey] = BOX_EDGE[Math.floor(crand() * BOX_EDGE.length)];
    flakes.spawn({ x: ex + crand() * 8, y: ey, vx: 14 + crand() * 22, vy: -6 - crand() * 14, life: 3 + crand() * 3, r0: 2 + crand() * 2, r1: 0.6, a: 0.9, tint: crand() < 0.6 ? 0xe8dcc0 : 0xb89870, drag: 0.1, spin: (crand() - 0.5) * 3, fade: 0.1 });
  };

  return {
    impact(x, _y, p) {
      for (const f of fires) {
        f.flare = Math.min(1.5, f.flare + 0.5 + p * 0.8);
        for (let i = 0; i < Math.round(4 + p * 10); i++) spark(f.b, 1.8);
      }
      fling(Math.round(4 + p * 12), 1.4);
      for (let i = 0; i < Math.round(1 + p * 3); i++) shed(2.2);
      for (const nd of nodes) nd.flash = 1;
      for (let i = 0; i < Math.round(3 + p * 5); i++) {
        const s = STEPS[Math.floor(crand() * 3)];
        dust.spawn({ x: s.x0 + crand() * (s.x1 - s.x0), y: s.top - 2, vx: (crand() - 0.5) * 40, vy: -14 - crand() * 22, life: 1.4 + crand(), r0: 8, r1: 24 + crand() * 14, a: 0.28, tint: 0x8a86c0, drag: 0.8, fade: 0.1 });
      }
      for (let i = 0; i < 3 + p * 4; i++) flake();
      void x;
    },
    update(dt, t) {
      const cm = cm0();
      // ——— sky
      neb.setAlpha(0.06 + 0.035 * Math.sin(t * 0.7) * cm);
      for (const [i, nd] of nodes.entries()) {
        nd.t -= dt;
        if (nd.t <= 0) {
          nd.t = 0.11 + crand() * 0.12;
          nd.f = (nd.f + 1 + Math.floor(crand() * 2)) % KR_N;
          nd.img.setFrame(nd.f).setFlipX(crand() < 0.5);
        }
        nd.flash = Math.max(0, nd.flash - dt * 2);
        nd.glow.setAlpha((0.1 + 0.06 * Math.sin(t * 3 + i * 1.7) * cm + nd.flash * 0.25));
        nd.img.setAlpha(0.85 + nd.flash * 0.15);
      }
      const last = RIVER.length - 1;
      for (const f of flows) {
        f.s += f.v * dt * cm;
        if (f.s >= 1) {
          f.s -= 1;
          f.off = (crand() - 0.5) * 1.4;
        }
        const pos = 0.08 + f.s * 0.92;
        const i = Math.min(last - 1, Math.floor(pos * last));
        const u = pos * last - i;
        const [x0, y0, hw0, a0] = RIVER[i];
        const [x1, y1, hw1] = RIVER[i + 1];
        const hw = hw0 + (hw1 - hw0) * u;
        const off = f.off * hw * 0.5;
        f.img.setPosition(x0 + (x1 - x0) * u - Math.sin(a0) * off, y0 + (y1 - y0) * u + Math.cos(a0) * off);
        f.img.setAlpha(Math.sin(Math.PI * f.s) * 0.85).setScale(0.35 + hw / 70);
      }
      for (const tw of twinkles) {
        const v = Math.max(0, wander(t * 0.8, tw.seed));
        tw.img.setAlpha(v * 0.9 * cm).setRotation(Math.sin(t * 0.3 + tw.seed) * 0.2);
      }
      nextComet -= dt;
      if (nextComet <= 0) {
        nextComet = (3.5 + crand() * 5) / Math.max(0.4, cm);
        fireComet();
      }
      for (const c of comets) {
        if (c.t < 0) continue;
        c.t += dt;
        const u = c.t / c.life;
        if (u >= 1) {
          c.t = -1;
          c.img.setAlpha(0);
          continue;
        }
        c.img.setPosition(c.x + c.vx * c.t, c.y + c.vy * c.t).setAlpha(Math.min(1, u * 6) * (1 - u) ** 0.6);
      }
      // ——— the halved world
      face.step(dt, cm);
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.3) * 0.6 + 0.2 * wander(t, 3);
      coreGlow.setAlpha((0.16 + 0.1 * pulse) * (0.7 + 0.3 * cm));
      heat.setAlpha(0.06 + 0.04 * pulse);
      rubbleRate.tick(1.1 * cm, dt, () => shed());
      rubble.update(dt);
      nextDrop -= dt;
      if (nextDrop <= 0) {
        nextDrop = 1.2 + crand() * 2.5;
        fling(1 + Math.floor(crand() * 3) * (cm > 0.5 ? 1 : 0));
      }
      drops.update(dt);
      // ——— the braziers
      for (const f of fires) {
        f.flare = Math.max(0, f.flare - dt * 1.2);
        f.loop.step(dt, cm * (1 + f.flare * 0.6));
        const fl = 1 + f.flare * 0.25;
        f.loop.each((im) => im.setScale((1 / FIRE_K) * (1 + f.flare * 0.08), (1 / FIRE_K) * fl));
        const fk = 0.85 + Math.sin(t * 9.1 + f.seed) * 0.08 + Math.sin(t * 15.7 + f.seed * 2) * 0.06;
        f.glow.setAlpha((0.2 + 0.16 * f.flare) * fk);
        f.wall.setAlpha((0.08 + 0.08 * f.flare) * fk);
        f.pool.setAlpha((0.1 + 0.1 * f.flare) * fk);
        sparkRate.tick(2.4 * cm, dt / fires.length, () => spark(f.b));
      }
      sparks.update(dt);
      // ——— the dust
      dust.update(dt);
      flakeRate.tick(1.6 * cm, dt, flake);
      flakes.update(dt);
    },
  };
});
