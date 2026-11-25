// Goth-Ham Rooftops (Batpeel's nemesis stage, in place of Stage 12: waves 61–64 with Batpeel or the Dark Kneader
// equipped; src/game/nemesis.ts), redrawn with the location kit (src/art/scene) in the Comics act's print: painted
// forms under a light dot screen and inked edges, like Metropizza (scene-metropizza.ts), but at night in a storm.
//
// We stand on the wet stone coping of a gothic tower's parapet, high over Goth-Ham. A grotesque of our own crouches on
// a pedestal at each back corner of the ledge (an eared imp with bat wings and a lolling stone tongue that the rain runs
// off). Across the canyon the neighbours' roofs: left, a limestone block with a cedar water tower and an ALL-NIGHT PIZZA
// sign on a trestle; right, a slate mansard with dormers and two chimney stacks, and on its flat roof the searchlight
// that throws the pizza-slice signal on the clouds. A small spout gargoyle at each of their corners pours into the
// canyon. Beyond, the canyon of Art Deco-gothic towers in two hazed rows sinking into fog that glows sodium from the
// street far below; the great clock tower and the cathedral with its twin spires and rose window; an elevated railway
// crossing the canyon on a through-truss between two towers. The moon high on the left behind the storm.
// Every emblem and sign is our own.
//
// Live (the heroes):
// - the rain: three depths of painted streak sheets slanting in the wind, gust veils sweeping through them, painted
//   splash crowns on the ledge, ripples in its puddles, the spout gargoyles pouring (painted stream loops), drips off
//   the grotesques' tongues;
// - the searchlight: its beam through the rain (lit drops falling through it) and the slice on the cloud base, its drum
//   on a damped spring; it swings wider as the storm builds;
// - lightning: painted forks behind the skyline, the clouds lit from inside and the whole skyline flashed cold.
// Also: steam off the chimneys and the roof vent, windows flicking on and off, a train crossing the bridge, the neon's
// dud Z stuttering, pigeons on the pedestals. A stomp splashes the puddles, shakes water off the grotesques, jolts the
// searchlight, slides a loose slate off the mansard and scatters the pigeons.
// Waves: a drizzle under a half-hidden moon (1), rain as the cloud thickens (2), a downpour (3), the full storm with
// lightning every few seconds and the beam swinging through the rain (4). The act's layer (src/game/acts/act7.ts)
// flashes the screen and thunders when this scene's bolts strike. (The old art is kept in scenes-gotham.ts and its old
// live layer in live/gotham.ts for the before/after page.)

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
  glowAt,
  groundShadow,
  haze,
  lightPool,
  polyPath,
  rectPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { benDay, dots, ink, linTone } from '../../art/scene/print';
import { cloud } from '../../art/scene/sky';
import { floorPlane } from '../../art/scene/surfaces';
import { crease, innerEdge } from '../../art/style/kit';
import { MATERIALS } from '../../art/style/materials';
import { makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { calm, registerKitScene, waveK, wander } from '../../game/sceneLive';
import { Loop, Parts, Rate, Spring, sheet, steamFrame } from '../../game/sceneAnim';
import { BOLT, PIGEON, boltFrame, pigeonFrame } from './scene-oldtown';

// ——— layout ———

export const GH = {
  /** Where the live sky stops: the storm, the drifting cloud and the bolts are all above it. */
  skyH: 310,
  moon: { x: 290, y: 238, r: 44 },
  /** Where the signal sits on the cloud base when the searchlight's at rest. */
  signal: { x: 1010, y: 124 },
  lamp: { x: 1752, y: 372 },
  midL: { x1: 540, roof: 470 },
  midR: { x0: 1400, roof: 430, ridge: 384, mansard: 1640 },
  tank: { x: 150, base: 470, deck: 440, top: 346 },
  sign: { x0: 312, x1: 528, y0: 372, y1: 438 },
  chimneys: [1470, 1580],
  vent: { x: 216 },
  clock: { x: 760, face: 214, r: 40 },
  cathedral: { x0: 1170, x1: 1400 },
  bridge: { x0: 650, x1: 1110, deck: 540 },
  /** The near grotesques: pedestal centre, facing. */
  gargs: [
    { x: 154, dir: 1 },
    { x: 1770, dir: -1 },
  ],
  ped: { w: 150, top: 700, base: 778 },
  /** The spout gargoyles' mouths on the neighbours' corners. */
  spouts: [
    { x: 606, y: 488, dir: 1 },
    { x: 1334, y: 448, dir: -1 },
  ],
  front: 1040,
};

const INK = '#0a0e1a';
const P2 = Math.PI * 2;
const SODIUM = '#ffb45a';
const NEON = '#ff3048';
const MOONLIT = '#c8d6f0';
const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
/** How busy a spot behind the play area may be: low over the three lanes, lower still near the table. */
const calmAt = (x: number, y: number): number => {
  const lane = Math.min(...[460, 1000, 1540].map((c) => Math.abs(x - c)));
  const inLane = 1 - smooth(150, 230, lane);
  return 1 - inLane * (0.35 + 0.55 * smooth(430, 700, y));
};
const STONE = { ...MATERIALS.stone, name: 'Wet limestone', shadowTint: '#060a18', tex: 'grain' as const, texA: 0.3, bevel: 0.16, rim: 0.2, specA: 0.12, specSize: 0.12 };

// ——— the sky ———

const SKY_BOX = { x: 0, y: 0, w: W, h: GH.skyH };

/** The storm's moonlit cloud: lit silver where it faces the moon, slate underneath. */
const cloudPal = (k: number) => ({ lit: mix('#aab8d4', '#4a5670', k), body: mix('#3a4660', '#1c2234', k), shadow: mix('#141a2a', '#080a14', k) });

function sky(ctx: Ctx, r: R): void {
  const { moon: m } = GH;
  vfill(ctx, 0, 0, W, 720, [[0, '#060a18'], [0.28, '#0e1830'], [0.55, '#1a2a42'], [0.8, '#23384a'], [1, '#2a3e4a']]);
  // the city's sodium glow low over the canyon, the moon's cold glow up on the left
  const g = ctx.createRadialGradient(960, 760, 40, 960, 760, 900);
  g.addColorStop(0, 'rgba(255,170,90,0.18)');
  g.addColorStop(0.5, 'rgba(200,140,100,0.06)');
  g.addColorStop(1, 'rgba(200,140,100,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 300, W, 420);
  glowAt(ctx, m.x, m.y, 420, '#9ab0dc', 0.22);
  glowAt(ctx, m.x, m.y, 150, '#dfe8ff', 0.3);
  // a few stars in the rifts
  for (let i = 0; i < 40; i++) {
    const sx = r() * W;
    const sy = r() * 130;
    ctx.fillStyle = rgba('#e8eeff', 0.2 + r() * 0.4);
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }
  // the storm deck: banks rolling in from the right, the near one across the moon's lower half, lit from it
  const banks: [number, number, number, number, number][] = [
    [1500, 150, 900, 150, 0.55],
    [1120, 230, 760, 120, 0.4],
    [1780, 280, 640, 110, 0.6],
    [760, 290, 700, 100, 0.35],
    [160, 310, 520, 90, 0.45],
  ];
  for (const [x, y, w, h, k] of banks) cloud(ctx, r, x, y, w, h, { ...cloudPal(k), sunX: m.x, sunY: m.y, rim: 0.6, kind: 'bank', wisp: 0.55, a: 0.95 });
  // the moon: a pale disc, its maria, its shaded limb in dots
  const disc = ellPath(m.x, m.y, m.r, m.r);
  const dg = ctx.createRadialGradient(m.x - m.r * 0.35, m.y - m.r * 0.35, 4, m.x, m.y, m.r);
  dg.addColorStop(0, '#fbfcff');
  dg.addColorStop(0.7, '#dfe6f6');
  dg.addColorStop(1, '#b4c0da');
  ctx.fillStyle = dg;
  disc(ctx);
  ctx.fill();
  within(ctx, disc, () => {
    for (const [dx, dy, cr] of [[-16, -8, 14], [14, 10, 10], [-2, 22, 8], [20, -18, 7], [-26, 16, 6]] as const) {
      ctx.fillStyle = 'rgba(150,164,196,0.35)';
      ctx.beginPath();
      ctx.ellipse(m.x + dx, m.y + dy, cr, cr * 0.85, 0.4, 0, P2);
      ctx.fill();
    }
    dots(ctx, { x: m.x - m.r, y: m.y - m.r, w: m.r * 2, h: m.r * 2 }, linTone(m.x - m.r * 0.1, m.y - m.r * 0.1, m.x + m.r, m.y + m.r, 0, 0.7), '#5a6890', { step: 5, angle: 0.79, a: 0.55 });
  });
  ink(ctx, disc, 2, '#3a4668', 0.3);
  // a torn band of cloud across the moon's lower half, silvered along its top
  cloud(ctx, r, m.x + 30, m.y + 46, 380, 40, { ...cloudPal(0.2), sunX: m.x, sunY: m.y - 80, rim: 0.9, kind: 'stratus', wisp: 0.6, a: 0.92 });
  // the printed sky: a navy Ben-Day screen thinning down to the city's glow
  benDay(ctx, { x: 0, y: 0, w: W, h: 420 }, '#02040c', 0.26, 11, 0.42, 0);
  // far rain curtains hanging from the deck over the city
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x0 = r() * W;
    const cw = 120 + r() * 220;
    const y0 = 200 + r() * 80;
    ctx.strokeStyle = 'rgba(150,170,200,0.06)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k < cw / 6; k++) {
      const x = x0 + k * 6 + r() * 4;
      ctx.moveTo(x, y0 + r() * 30);
      ctx.lineTo(x + 50, 600);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** The full storm (live only, faded in from the second wave): a low bruised lid, the moon gone behind it, rain
 * curtains under it; it fades out at its foot into the sky under it. */
function stormSky(ctx: Ctx, r: R): void {
  vfill(ctx, 0, 0, W, GH.skyH, [[0, '#04060e'], [0.6, '#0c1424'], [1, '#162232']]);
  for (let i = 0; i < 9; i++) cloud(ctx, r, -120 + i * 260 + r() * 60, 90 + r() * 70, 520 + r() * 200, 120 + r() * 40, { ...cloudPal(0.7 + r() * 0.25), sunX: GH.moon.x, sunY: -200, rim: 0.2, kind: 'bank', wisp: 0.4 });
  for (let i = 0; i < 8; i++) cloud(ctx, r, i * 280 + r() * 60, 220 + r() * 60, 420 + r() * 160, 80 + r() * 30, { ...cloudPal(0.6 + r() * 0.3), sunX: 960, sunY: 900, rim: 0.3, kind: 'bank', wisp: 0.5 });
  benDay(ctx, { x: 0, y: 0, w: W, h: GH.skyH }, '#010208', 0.3, 11, 0.45, 0.1);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x0 = r() * W;
    const cw = 140 + r() * 260;
    ctx.strokeStyle = 'rgba(160,176,206,0.1)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k = 0; k < cw / 5; k++) {
      const x = x0 + k * 5 + r() * 4;
      ctx.moveTo(x, 150 + r() * 40);
      ctx.lineTo(x + 40, GH.skyH);
    }
    ctx.stroke();
  }
  // its foot fades into the sky below (the towers stand in front of the seam)
  ctx.globalCompositeOperation = 'destination-out';
  vfill(ctx, 0, GH.skyH - 70, W, 70, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
  ctx.restore();
}

/** Scud: ragged low cloud the live code drifts across the moon (white, tinted live). */
const SCUD_BOX = { x: 0, y: 30, w: W, h: 230 };
function scud(ctx: Ctx, r: R): void {
  const pal = { lit: '#ffffff', body: '#b8c2d8', shadow: '#5a6680' };
  for (const [x, y, w, h] of [[880, 120, 300, 34], [560, 250, 240, 34], [1260, 200, 420, 50], [1760, 140, 340, 40]] as const)
    cloud(ctx, r, x, y, w, h, { ...pal, sunX: GH.moon.x, sunY: GH.moon.y - 60, rim: 0.7, kind: 'stratus', wisp: 0.7, a: 0.85 });
}

// ——— the far city: two rows of towers sinking into the canyon's fog ———

type Kind = 'flat' | 'step' | 'spire' | 'crown' | 'gable';
export interface Tower {
  x: number;
  w: number;
  top: number;
  kind: Kind;
  row: 2 | 3;
  seed: number;
}

const ROW3: Tower[] = (() => {
  const r = rng(9113);
  const out: Tower[] = [];
  let x = -30;
  while (x < W + 30) {
    const w = 50 + r() * 80;
    const mid = Math.abs(x + w / 2 - 1000) < 380;
    const kinds: Kind[] = ['flat', 'step', 'spire', 'crown', 'gable', 'flat', 'step'];
    const kind = kinds[Math.floor(r() * kinds.length)];
    // spires reach 90 px above their top: keep every tip under the live sky
    const lift = kind === 'spire' ? 92 : kind === 'crown' ? 44 : 0;
    const top = Math.max(GH.skyH + 14 + lift, mid ? 400 + r() * 50 : 340 + r() * 90);
    out.push({ x, w, top, kind, row: 3, seed: Math.floor(r() * 1e6) });
    x += w * (0.7 + r() * 0.25);
  }
  return out;
})();

/** The nearer row, placed by hand round the landmarks (the clock tower and the cathedral stand in it). */
const ROW2: Tower[] = (
  [
    [-20, 150, 430, 'step'],
    [116, 104, 438, 'spire'],
    [226, 128, 420, 'crown'],
    [350, 116, 440, 'gable'],
    [462, 140, 452, 'flat'],
    [590, 64, 470, 'flat'],
    [830, 120, 462, 'step'],
    [946, 110, 486, 'flat'],
    [1046, 110, 466, 'crown'],
    [1110, 62, 474, 'flat'],
    [1410, 140, 420, 'spire'],
    [1546, 150, 400, 'step'],
    [1690, 128, 436, 'crown'],
    [1812, 130, 412, 'flat'],
  ] as const
).map(([x, w, top, kind], i) => ({ x, w, top, kind, row: 2 as const, seed: 5000 + i * 37 }));

function towerPath(t: Tower, base: number): PathFn {
  return (c) => {
    const { x, w, top } = t;
    c.beginPath();
    c.moveTo(x, base);
    if (t.kind === 'step') {
      c.lineTo(x, top + 50);
      c.lineTo(x + w * 0.12, top + 50);
      c.lineTo(x + w * 0.12, top + 22);
      c.lineTo(x + w * 0.28, top + 22);
      c.lineTo(x + w * 0.28, top);
      c.lineTo(x + w * 0.72, top);
      c.lineTo(x + w * 0.72, top + 22);
      c.lineTo(x + w * 0.88, top + 22);
      c.lineTo(x + w * 0.88, top + 50);
      c.lineTo(x + w, top + 50);
    } else if (t.kind === 'spire') {
      // a gothic crown: corner pinnacles, a lantern, a needle spire
      c.lineTo(x, top + 8);
      c.lineTo(x + w * 0.06, top - 14);
      c.lineTo(x + w * 0.12, top + 8);
      c.lineTo(x + w * 0.3, top + 8);
      c.lineTo(x + w * 0.3, top - 16);
      c.lineTo(x + w * 0.46, top - 40);
      c.lineTo(x + w * 0.5, top - 92);
      c.lineTo(x + w * 0.54, top - 40);
      c.lineTo(x + w * 0.7, top - 16);
      c.lineTo(x + w * 0.7, top + 8);
      c.lineTo(x + w * 0.88, top + 8);
      c.lineTo(x + w * 0.94, top - 14);
      c.lineTo(x + w, top + 8);
    } else if (t.kind === 'crown') {
      // an Art Deco crown: stepped arches narrowing to a mast
      c.lineTo(x, top + 30);
      c.lineTo(x + w * 0.14, top + 30);
      c.quadraticCurveTo(x + w * 0.2, top, x + w * 0.3, top - 4);
      c.quadraticCurveTo(x + w * 0.4, top - 30, x + w * 0.48, top - 32);
      c.lineTo(x + w * 0.49, top - 44);
      c.lineTo(x + w * 0.51, top - 44);
      c.lineTo(x + w * 0.52, top - 32);
      c.quadraticCurveTo(x + w * 0.6, top - 30, x + w * 0.7, top - 4);
      c.quadraticCurveTo(x + w * 0.8, top, x + w * 0.86, top + 30);
      c.lineTo(x + w, top + 30);
    } else if (t.kind === 'gable') {
      c.lineTo(x, top + 26);
      c.lineTo(x + w * 0.5, top - 18);
      c.lineTo(x + w, top + 26);
    } else {
      c.lineTo(x, top);
      c.lineTo(x + w * 0.1, top);
      c.lineTo(x + w * 0.1, top - 6);
      c.lineTo(x + w * 0.9, top - 6);
      c.lineTo(x + w * 0.9, top);
      c.lineTo(x + w, top);
    }
    c.lineTo(x + w, base);
    c.closePath();
  };
}

/** A tower's windows: [x, y, w, h, value] (the same every time; the value decides lit, dark or flicking). */
function towerWindows(t: Tower, base: number): [number, number, number, number, number][] {
  const r = rng(t.seed);
  const out: [number, number, number, number, number][] = [];
  const cw = t.row === 3 ? 3 : 5;
  const ch = t.row === 3 ? 5 : 8;
  const gx = t.row === 3 ? 5 : 7;
  const gy = t.row === 3 ? 7 : 10;
  const y0 = t.top + (t.kind === 'step' ? 60 : t.kind === 'crown' ? 40 : 16);
  for (let y = y0; y < base - 10; y += ch + gy) for (let x = t.x + 6; x < t.x + t.w - cw - 4; x += cw + gx) out.push([x, y, cw, ch, r()]);
  return out;
}

const AIR3 = '#2e4258';
const AIR2 = '#243446';

function paintTower(ctx: Ctx, t: Tower, base: number, lit = true): void {
  const p = towerPath(t, base);
  const far = t.row === 3;
  const col = far ? '#26384c' : '#1a2636';
  ctx.save();
  p(ctx);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.clip();
  // the moon on its left face, the right in shade; vertical piers
  ctx.fillStyle = rgba(MOONLIT, far ? 0.08 : 0.12);
  ctx.fillRect(t.x, t.top - 100, Math.max(3, t.w * 0.14), base);
  const sg = ctx.createLinearGradient(t.x + t.w * 0.5, 0, t.x + t.w, 0);
  sg.addColorStop(0, 'rgba(4,6,14,0)');
  sg.addColorStop(1, `rgba(4,6,14,${far ? 0.2 : 0.35})`);
  ctx.fillStyle = sg;
  ctx.fillRect(t.x, t.top - 100, t.w, base);
  if (!far) {
    ctx.fillStyle = 'rgba(70,90,120,0.16)';
    for (let x = t.x + 4; x < t.x + t.w; x += 14) ctx.fillRect(x, t.top + 4, 2, base - t.top);
  }
  if (lit) {
    for (const [x, y, w, h, v] of towerWindows(t, base)) {
      const k = calmAt(x, y) * (1 - smooth(520, 700, y));
      if (v < 0.72 - 0.25 * k) {
        ctx.fillStyle = rgba('#0a1020', far ? 0.3 : 0.45);
        ctx.fillRect(x, y, w, h);
        continue;
      }
      const warm = v > 0.86 ? '#ffd890' : v > 0.8 ? SODIUM : '#bcd8f0';
      ctx.fillStyle = rgba(warm, (far ? 0.4 : 0.7) * (0.35 + 0.65 * k));
      ctx.fillRect(x, y, w, h);
    }
  }
  ctx.restore();
  ink(ctx, p, far ? 1.2 : 1.8, far ? '#141e2c' : INK, far ? 0 : 0.4);
}

/** The great clock tower: a gothic shaft, a belfry stage with a lit clock face on each side we see, a crown of
 * pinnacles, an octagonal lantern and a tall needle spire. */
const CLK = { x0: 708, x1: 812, stage: 252, crown: 176, needle: 70 };
const clockPath: PathFn = (c) => {
  const { x0, x1, stage, crown, needle } = CLK;
  const cx = GH.clock.x;
  c.beginPath();
  c.moveTo(x0, 760);
  c.lineTo(x0, stage);
  c.lineTo(x0 - 10, stage - 6);
  c.lineTo(x0 - 10, crown + 4);
  c.lineTo(x0 - 6, crown - 22);
  c.lineTo(x0 - 2, crown + 4);
  c.lineTo(x0 + 16, crown + 4);
  c.lineTo(cx - 26, crown - 18);
  c.lineTo(cx - 26, crown - 40);
  c.lineTo(cx - 8, needle + 52);
  c.lineTo(cx, needle);
  c.lineTo(cx + 8, needle + 52);
  c.lineTo(cx + 26, crown - 40);
  c.lineTo(cx + 26, crown - 18);
  c.lineTo(x1 - 16, crown + 4);
  c.lineTo(x1 + 2, crown + 4);
  c.lineTo(x1 + 6, crown - 22);
  c.lineTo(x1 + 10, crown + 4);
  c.lineTo(x1 + 10, stage - 6);
  c.lineTo(x1, stage);
  c.lineTo(x1, 760);
  c.closePath();
};

function clockTower(ctx: Ctx): void {
  const { x0, x1, stage, crown } = CLK;
  const cx = GH.clock.x;
  const fy = GH.clock.face;
  const fr = GH.clock.r;
  ctx.save();
  clockPath(ctx);
  ctx.fillStyle = '#1e2a3c';
  ctx.fill();
  ctx.clip();
  // stone courses, moonlit left, the right in shade; lancet windows up the shaft
  ctx.fillStyle = rgba(MOONLIT, 0.14);
  ctx.fillRect(x0 - 12, 40, 18, 760);
  ctx.fillStyle = 'rgba(4,6,14,0.35)';
  ctx.fillRect(cx + 18, 40, x1 + 12 - cx - 18, 760);
  ctx.fillStyle = 'rgba(80,100,130,0.18)';
  for (let y = stage + 8; y < 760; y += 16) ctx.fillRect(x0, y, x1 - x0, 1.4);
  for (let y = stage + 40; y < 640; y += 70)
    for (const lx of [x0 + 22, cx - 6, x1 - 34]) {
      const lv = (y * 7 + lx) % 5;
      ctx.fillStyle = lv < 1 && y < 520 ? rgba(SODIUM, 0.7) : 'rgba(6,10,20,0.7)';
      ctx.beginPath();
      ctx.moveTo(lx, y + 34);
      ctx.lineTo(lx, y + 8);
      ctx.quadraticCurveTo(lx + 6, y - 2, lx + 12, y + 8);
      ctx.lineTo(lx + 12, y + 34);
      ctx.fill();
    }
  // the belfry stage's band and the crown's louvres
  ctx.fillStyle = 'rgba(120,140,170,0.25)';
  ctx.fillRect(x0 - 10, stage - 8, x1 - x0 + 20, 4);
  ctx.fillRect(x0 - 10, crown + 2, x1 - x0 + 20, 3);
  ctx.fillStyle = 'rgba(6,10,20,0.6)';
  for (let k = 0; k < 4; k++) ctx.fillRect(cx - 20 + k * 11, crown - 34, 5, 22);
  ctx.restore();
  ink(ctx, clockPath, 2, INK, 0.4);
  // the face: lit cream glass, its ring, numerals as ticks, the hands at ten to midnight
  lightPool(ctx, cx, fy, fr * 3, fr * 3, '#ffd89a', 0.16, 'source-over');
  const face = ellPath(cx, fy, fr, fr);
  const fg = ctx.createRadialGradient(cx - fr * 0.3, fy - fr * 0.3, 2, cx, fy, fr);
  fg.addColorStop(0, '#fff6dc');
  fg.addColorStop(0.75, '#f4d898');
  fg.addColorStop(1, '#c89a58');
  ctx.fillStyle = fg;
  face(ctx);
  ctx.fill();
  ctx.strokeStyle = '#2a2a3a';
  ctx.lineWidth = 2;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * P2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * fr * 0.8, fy + Math.sin(a) * fr * 0.8);
    ctx.lineTo(cx + Math.cos(a) * fr * 0.93, fy + Math.sin(a) * fr * 0.93);
    ctx.stroke();
  }
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, fy);
  ctx.lineTo(cx - fr * 0.18, fy - fr * 0.66);
  ctx.moveTo(cx, fy);
  ctx.lineTo(cx - fr * 0.42, fy - fr * 0.22);
  ctx.stroke();
  ink(ctx, face, 4, INK, 0.3);
  ctx.strokeStyle = 'rgba(180,190,210,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, fy, fr + 4, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
}

/** The cathedral: twin towers with spires, the nave's gable between them with a rose window lit from inside. */
const CATH = { lt: [1170, 1226] as const, rt: [1344, 1400] as const, towerTop: 260, spire: 150, gable: 338, rose: { x: 1285, y: 404, r: 30 } };
const cathPath: PathFn = (c) => {
  const { lt, rt, towerTop, spire, gable } = CATH;
  c.beginPath();
  c.moveTo(lt[0], 760);
  for (const [a, b, last] of [[lt[0], lt[1], false], [rt[0], rt[1], true]] as const) {
    const mid = (a + b) / 2;
    c.lineTo(a, towerTop);
    c.lineTo(a + 4, towerTop - 20);
    c.lineTo(a + 8, towerTop);
    c.lineTo(mid - 14, towerTop);
    c.lineTo(mid - 4, spire + 30);
    c.lineTo(mid, spire);
    c.lineTo(mid + 4, spire + 30);
    c.lineTo(mid + 14, towerTop);
    c.lineTo(b - 8, towerTop);
    c.lineTo(b - 4, towerTop - 20);
    c.lineTo(b, towerTop);
    if (!last) {
      c.lineTo(b, gable + 50);
      c.lineTo((lt[1] + rt[0]) / 2, gable);
      c.lineTo(rt[0], gable + 50);
    }
  }
  c.lineTo(rt[1], 760);
  c.closePath();
};

function cathedral(ctx: Ctx): void {
  const { lt, rt, towerTop, rose } = CATH;
  ctx.save();
  cathPath(ctx);
  ctx.fillStyle = '#1c2838';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = rgba(MOONLIT, 0.12);
  ctx.fillRect(lt[0], 100, 12, 700);
  ctx.fillRect(rt[0], 100, 10, 700);
  ctx.fillStyle = 'rgba(4,6,14,0.3)';
  ctx.fillRect(lt[1] - 16, 100, 16, 700);
  ctx.fillRect(rt[1] - 18, 100, 18, 700);
  // buttress lines and tall lancets in the towers, belfry louvres
  ctx.fillStyle = 'rgba(80,100,130,0.2)';
  for (const [a, b] of [lt, rt]) {
    ctx.fillRect(a + 18, towerTop, 2, 500);
    ctx.fillRect(b - 20, towerTop, 2, 500);
    for (let y = towerTop + 22; y < 600; y += 84) {
      ctx.fillStyle = 'rgba(6,10,20,0.75)';
      ctx.beginPath();
      ctx.moveTo(a + 22, y + 52);
      ctx.lineTo(a + 22, y + 12);
      ctx.quadraticCurveTo((a + b) / 2, y - 6, b - 22, y + 12);
      ctx.lineTo(b - 22, y + 52);
      ctx.fill();
      ctx.fillStyle = 'rgba(80,100,130,0.2)';
    }
  }
  ctx.restore();
  ink(ctx, cathPath, 1.8, INK, 0.4);
  // the rose window: stained glass glowing amber and wine from the vigil inside, its tracery
  glowAt(ctx, rose.x, rose.y, rose.r * 2.6, '#ff9a5a', 0.1);
  const rp = ellPath(rose.x, rose.y, rose.r, rose.r);
  const rg = ctx.createRadialGradient(rose.x, rose.y, 2, rose.x, rose.y, rose.r);
  rg.addColorStop(0, '#d8b480');
  rg.addColorStop(0.5, '#a8562e');
  rg.addColorStop(1, '#4a1830');
  ctx.fillStyle = rg;
  rp(ctx);
  ctx.fill();
  ctx.strokeStyle = 'rgba(14,16,28,0.9)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * P2;
    ctx.beginPath();
    ctx.moveTo(rose.x + Math.cos(a) * 6, rose.y + Math.sin(a) * 6);
    ctx.lineTo(rose.x + Math.cos(a) * rose.r, rose.y + Math.sin(a) * rose.r);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(rose.x, rose.y, rose.r * 0.55, 0, P2);
  ctx.stroke();
  ink(ctx, rp, 3, INK, 0.2);
}

const FAR_BOX = { x: 0, y: GH.skyH, w: W, h: TY - GH.skyH };

function farCity(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, GH.skyH, W, TY - GH.skyH);
  ctx.clip();
  for (const t of ROW3) paintTower(ctx, t, 760);
  // the air between the rows: cold mist, the sodium glow under it
  haze(ctx, 380, 620, AIR3, 0.42, 0.75);
  haze(ctx, 520, 680, '#6a5a52', 0.16, 0.8);
  for (const t of ROW2) paintTower(ctx, t, 760);
  clockTower(ctx);
  cathedral(ctx);
  bridgePiers(ctx);
  // the canyon: the towers' feet lost in fog lit sodium from the street far below
  haze(ctx, 500, 760, AIR2, 0.5, 0.85);
  softly(ctx, { x: 0, y: 560, w: W, h: 200 }, (g) => {
    const sg = g.createLinearGradient(0, 560, 0, 760);
    sg.addColorStop(0, 'rgba(255,170,90,0)');
    sg.addColorStop(0.7, 'rgba(255,160,80,0.12)');
    sg.addColorStop(1, 'rgba(255,150,70,0.18)');
    g.fillStyle = sg;
    g.fillRect(0, 560, W, 200);
    // the light of the streets in the gaps between the towers, brighter in pools
    for (const [x, w] of [[660, 120], [1130, 90], [400, 80], [1500, 100]] as const) {
      const pg = g.createRadialGradient(x, 760, 0, x, 760, w * 1.6);
      pg.addColorStop(0, 'rgba(255,170,90,0.2)');
      pg.addColorStop(1, 'rgba(255,170,90,0)');
      g.fillStyle = pg;
      g.fillRect(x - w * 2, 560, w * 4, 200);
    }
  }, 0.25);
  // the play area's back: darker, calmer
  vfill(ctx, 0, 620, W, 140, [[0, 'rgba(6,10,20,0)'], [1, 'rgba(6,10,20,0.4)']]);
  ctx.restore();
  void r;
}

/** The landmarks' tops over the live sky (each a small overlay of its own). */
const CLOCK_TOP_BOX = { x: CLK.x0 - 16, y: CLK.needle - 6, w: CLK.x1 - CLK.x0 + 32, h: GH.skyH - CLK.needle + 6 };
const CATH_TOP_BOX = { x: CATH.lt[0] - 4, y: CATH.spire - 4, w: CATH.rt[1] - CATH.lt[0] + 8, h: GH.skyH - CATH.spire + 4 };
function clipAbove(ctx: Ctx, b: { x: number; y: number; w: number; h: number }, paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, GH.skyH - b.y);
  ctx.clip();
  paint();
  ctx.restore();
}

// ——— the elevated railway across the canyon (a through-truss between two towers; the train runs inside it) ———

const BR = GH.bridge;
const DECK = BR.deck;
const TRUSS_TOP = DECK - 30;
const BRIDGE_BOX = { x: BR.x0 - 4, y: TRUSS_TOP - 6, w: BR.x1 - BR.x0 + 8, h: DECK + 22 - TRUSS_TOP };
/** Where the train shows (between the towers' portals). */
export const TRAIN_SLOT = { x: BR.x0, y: TRUSS_TOP - 2, w: BR.x1 - BR.x0, h: DECK - TRUSS_TOP + 4 };

function bridgePiers(ctx: Ctx): void {
  // two iron trestle piers down into the fog, the portals in the towers' faces
  for (const px of [800, 960]) {
    ctx.strokeStyle = '#141c2a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(px - 18, 700);
    ctx.lineTo(px - 6, DECK + 14);
    ctx.moveTo(px + 18, 700);
    ctx.lineTo(px + 6, DECK + 14);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let y = DECK + 30; y < 700; y += 34) {
      ctx.moveTo(px - 16 + ((y - DECK) / 200) * 4, y);
      ctx.lineTo(px + 16 - ((y - DECK) / 200) * 4, y + 34);
      ctx.moveTo(px + 16, y);
      ctx.lineTo(px - 16, y + 34);
    }
    ctx.stroke();
  }
  for (const [x0, x1] of [[BR.x0 - 30, BR.x0], [BR.x1, BR.x1 + 30]] as const) {
    const arch: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x0 + 6, DECK);
      c.lineTo(x0 + 6, TRUSS_TOP + 10);
      c.quadraticCurveTo((x0 + x1) / 2, TRUSS_TOP - 6, x1 - 6, TRUSS_TOP + 10);
      c.lineTo(x1 - 6, DECK);
      c.closePath();
    };
    ctx.fillStyle = '#0a0e18';
    arch(ctx);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,170,0.35)';
    ctx.lineWidth = 2;
    arch(ctx);
    ctx.stroke();
    ctx.fillStyle = rgba(SODIUM, 0.18);
    ctx.fillRect(x0 + 9, DECK - 10, x1 - x0 - 18, 8);
  }
  // stone piers under the deck's ends, down into the fog
  for (const px of [BR.x0 + 14, BR.x1 - 14]) {
    const pier = rectPath(px - 10, DECK + 8, 20, 700 - DECK);
    ctx.fillStyle = '#18202e';
    pier(ctx);
    ctx.fill();
    ctx.fillStyle = rgba(MOONLIT, 0.14);
    ctx.fillRect(px - 10, DECK + 8, 3, 700 - DECK);
    ink(ctx, pier, 1.4, INK, 0.3);
  }
}

function bridge(ctx: Ctx): void {
  const { x0, x1 } = BR;
  // the deck girder: a dark plate with a moonlit top edge and rivet lines; under it the shadow of the ties
  const deck = rectPath(x0, DECK, x1 - x0, 10);
  ctx.fillStyle = '#121a28';
  deck(ctx);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,180,210,0.35)';
  ctx.fillRect(x0, DECK, x1 - x0, 1.6);
  ctx.fillStyle = 'rgba(160,180,210,0.12)';
  for (let x = x0 + 6; x < x1; x += 8) ctx.fillRect(x, DECK + 5, 1.4, 1.4);
  ink(ctx, deck, 1.4, INK, 0.3);
  // the through-truss: top chord, verticals and diagonals in front of the train, lit on their upper edges
  ctx.lineCap = 'round';
  const panel = 30;
  ctx.strokeStyle = '#0e1420';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, TRUSS_TOP);
  ctx.lineTo(x1, TRUSS_TOP);
  for (let x = x0; x <= x1 + 1; x += panel) {
    ctx.moveTo(x, TRUSS_TOP);
    ctx.lineTo(x, DECK);
  }
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = x0, i = 0; x < x1; x += panel, i++) {
    if (i % 2) {
      ctx.moveTo(x, TRUSS_TOP);
      ctx.lineTo(x + panel, DECK);
    } else {
      ctx.moveTo(x, DECK);
      ctx.lineTo(x + panel, TRUSS_TOP);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(170,190,220,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, TRUSS_TOP - 1);
  ctx.lineTo(x1, TRUSS_TOP - 1);
  ctx.stroke();
  // signal lamps at each portal
  for (const x of [x0 + 6, x1 - 6]) {
    lightPool(ctx, x, TRUSS_TOP - 6, 10, 10, '#ff6a5a', 0.4, 'source-over');
    ctx.fillStyle = '#ffb0a0';
    ctx.fillRect(x - 1.5, TRUSS_TOP - 7.5, 3, 3);
  }
}

// ——— the neighbours across the canyon ———

/** A pointed (lancet) window: its path. */
const lancet = (x: number, y: number, w: number, h: number): PathFn => (c) => {
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + w * 0.5);
  c.quadraticCurveTo(x, y, x + w / 2, y - w * 0.15);
  c.quadraticCurveTo(x + w, y, x + w, y + w * 0.5);
  c.lineTo(x + w, y + h);
  c.closePath();
};

/** The neighbours' windows: [x, y, w, h, lit 0…1 (0 dark)]; the flicking ones are painted dark and lit live. */
export const ML_WIN: [number, number, number, number, number][] = [];
export const MR_WIN: [number, number, number, number, number][] = [];
export const FLICK: [number, number, number, number][] = [];
(() => {
  const r = rng(3301);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 6; col++) {
      const x = 22 + col * 86;
      const y = 506 + row * 66;
      const k = calmAt(x + 14, y) * (1 - smooth(600, 720, y));
      const v = r();
      const lit = v < 0.45 * k ? 0.5 + r() * 0.5 : 0;
      if (!lit && row === 0 && col >= 4 && FLICK.length < 2) FLICK.push([x, y, 28, 46]);
      ML_WIN.push([x, y, 28, 46, lit]);
    }
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 7; col++) {
      const x = 1426 + col * 72;
      const y = 462 + row * 60;
      const k = calmAt(x + 12, y) * (1 - smooth(600, 720, y));
      const v = r();
      const lit = v < 0.42 * k ? 0.5 + r() * 0.5 : 0;
      if (!lit && row <= 1 && col >= 1 && x + 24 < 1630 && FLICK.length < 5) FLICK.push([x, y, 24, 40]);
      MR_WIN.push([x, y, 24, 40, lit]);
    }
})();
/** The mansard's dormers (lit live now and then). */
export const DORMERS = [1508, 1612];

function windowAt(ctx: Ctx, x: number, y: number, w: number, h: number, lit: number, dorm = false): void {
  const p = dorm ? rectPath(x, y, w, h) : lancet(x, y, w, h);
  if (lit > 0) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, rgba('#ffd890', 0.55 + 0.4 * lit));
    g.addColorStop(1, rgba(SODIUM, 0.45 + 0.4 * lit));
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#2c3a52');
    g.addColorStop(0.5, '#141c2c');
    g.addColorStop(1, '#0a0e18');
    ctx.fillStyle = g;
  }
  p(ctx);
  ctx.fill();
  // glazing bars, the reveal's shadow under the head and down the right jamb
  ctx.fillStyle = lit > 0 ? 'rgba(60,30,20,0.6)' : 'rgba(4,6,12,0.6)';
  ctx.fillRect(x + w / 2 - 1, y + 4, 2, h - 4);
  ctx.fillRect(x, y + h * 0.55, w, 2);
  within(ctx, p, () => {
    ctx.fillStyle = 'rgba(4,6,12,0.45)';
    ctx.fillRect(x + w - 4, y - 4, 4, h + 4);
    ctx.fillRect(x, y - 4, w, 5);
    if (!lit) {
      // the sky's sheen on the wet glass
      ctx.fillStyle = 'rgba(150,170,210,0.18)';
      ctx.beginPath();
      ctx.moveTo(x + 2, y + h * 0.9);
      ctx.lineTo(x + w * 0.4, y + h * 0.3);
      ctx.lineTo(x + w * 0.55, y + h * 0.3);
      ctx.lineTo(x + w * 0.15, y + h * 0.9);
      ctx.fill();
    }
  });
  // the stone sill
  ctx.fillStyle = 'rgba(150,164,190,0.35)';
  ctx.fillRect(x - 3, y + h, w + 6, 3);
  ctx.fillStyle = 'rgba(4,6,12,0.5)';
  ctx.fillRect(x - 3, y + h + 3, w + 6, 3);
}

/** A small carved spout gargoyle on a corner of a neighbour's cornice, facing dir, its open jaws at (x, y) (the gutter
 * runs out of them): a long scaled neck out of the stonework, a horned head, a folded wing on its back. */
function spoutGargoyle(ctx: Ctx, x: number, y: number, dir: number): void {
  const X = (v: number) => x + (v - 10) * dir;
  const Y = (v: number) => y + v + 2;
  const P = (pts: [number, number][]): PathFn => polyPath(pts.map(([u, v]) => [X(u), Y(v)] as [number, number]));
  const body: PathFn = (c) => {
    c.beginPath();
    c.moveTo(X(-72), Y(-30));
    c.bezierCurveTo(X(-50), Y(-34), X(-30), Y(-30), X(-18), Y(-24));
    c.bezierCurveTo(X(-10), Y(-36), X(0), Y(-38), X(8), Y(-30));
    c.lineTo(X(14), Y(-28));
    c.lineTo(X(21), Y(-20));
    c.lineTo(X(19), Y(-13));
    c.lineTo(X(9), Y(-10));
    c.lineTo(X(15), Y(-3));
    c.lineTo(X(5), Y(2));
    c.bezierCurveTo(X(-8), Y(6), X(-30), Y(8), X(-50), Y(10));
    c.lineTo(X(-72), Y(10));
    c.closePath();
  };
  const wing = P([[-52, -28], [-62, -56], [-54, -48], [-48, -62], [-42, -46], [-34, -52], [-30, -28]]);
  const horn: PathFn = (c) => {
    c.beginPath();
    c.moveTo(X(-4), Y(-34));
    c.bezierCurveTo(X(-8), Y(-46), X(-16), Y(-52), X(-26), Y(-54));
    c.bezierCurveTo(X(-18), Y(-46), X(-14), Y(-40), X(-12), Y(-32));
    c.closePath();
  };
  const ear = P([[3, -34], [1, -47], [9, -33]]);
  const box = { x: x - 90, y: y - 70, w: 180, h: 90 };
  castShadow(ctx, body, 6, 6, 0.45, '#02040a');
  solid(ctx, wing, box, STONE, '#262e3e', { depth: 0.35, line: 1.4, formSize: 6 });
  solid(ctx, horn, box, STONE, '#2e3646', { depth: 0.35, line: 1.2, formSize: 4 });
  solid(ctx, body, box, STONE, '#3a4456', { depth: 0.35, line: 1.8, formSize: 10 });
  solid(ctx, ear, box, STONE, '#323a4c', { depth: 0.35, line: 1.2, formSize: 3 });
  within(ctx, body, () => {
    // scales down the neck, the brow over a deep eye, the moon along its back
    ctx.strokeStyle = 'rgba(4,6,12,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let u = -64; u < -16; u += 7) {
      ctx.moveTo(X(u), Y(-22));
      ctx.quadraticCurveTo(X(u + 4), Y(-16), X(u), Y(-10));
    }
    ctx.stroke();
    ctx.fillStyle = '#020308';
    ctx.beginPath();
    ctx.ellipse(X(4), Y(-25), 2.2, 1.8, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,214,240,0.35)';
    ctx.beginPath();
    ctx.moveTo(X(-70), Y(-29));
    ctx.bezierCurveTo(X(-50), Y(-33), X(-30), Y(-29), X(-18), Y(-23));
    ctx.lineTo(X(-18), Y(-21));
    ctx.bezierCurveTo(X(-30), Y(-27), X(-50), Y(-31), X(-70), Y(-27));
    ctx.fill();
    vfill(ctx, box.x, Y(-6), box.w, 18, [[0, 'rgba(2,4,10,0)'], [1, 'rgba(2,4,10,0.5)']]);
  });
  // the open jaws the gutter runs out of
  ctx.fillStyle = '#04060c';
  P([[9, -10], [19, -13], [15, -3]])(ctx);
  ctx.fill();
}

/** The canyon's fog rising over a neighbour's lower floors: cold above, lit sodium from the street below. */
function canyonFog(ctx: Ctx, x0: number, x1: number): void {
  vfill(ctx, x0, 600, x1 - x0, 160, [[0, 'rgba(26,36,50,0)'], [0.55, 'rgba(26,36,50,0.55)'], [1, 'rgba(40,36,40,0.85)']]);
  vfill(ctx, x0, 680, x1 - x0, 80, [[0, 'rgba(255,160,80,0)'], [1, 'rgba(255,150,70,0.16)']]);
}

const MIDL_BOX = { x: 0, y: GH.skyH, w: 640, h: TY - GH.skyH };

function midLeft(ctx: Ctx, r: R): void {
  const { x1, roof } = GH.midL;
  // the return wall on the right, turned away from the moon, receding to the vanishing point
  const side = polyPath([[x1, roof], [x1 + 20, roof + 4], [x1 + 20, 760], [x1, 760]]);
  ctx.fillStyle = '#121824';
  side(ctx);
  ctx.fill();
  within(ctx, side, () => dots(ctx, { x: x1, y: roof, w: 22, h: 300 }, () => 0.5, '#02040a', { step: 5, angle: 0.79, a: 0.6 }));
  const face = rectPath(-10, roof, x1 + 10, 760 - roof);
  ctx.save();
  face(ctx);
  ctx.clip();
  surface(ctx, r, { x: -10, y: roof, w: x1 + 10, h: 760 - roof }, '#2a3242', { vary: 0.5, warm: '#3e4658', cool: '#141a28', mottle: 0.4, strokes: 0.3, strokeAng: Math.PI / 2, grain: 0.14, seed: 71 });
  // ashlar courses, piers between the bays with their moonlit left arrises
  ctx.fillStyle = 'rgba(8,10,18,0.3)';
  for (let y = roof + 16; y < 760; y += 22) ctx.fillRect(-10, y, x1 + 10, 1.4);
  for (let x = 6; x < x1; x += 86) {
    ctx.fillStyle = 'rgba(8,10,18,0.35)';
    ctx.fillRect(x - 6, roof, 12, 760 - roof);
    ctx.fillStyle = rgba(MOONLIT, 0.1);
    ctx.fillRect(x - 6, roof, 2, 760 - roof);
  }
  for (const [x, y, w, h, lit] of ML_WIN) windowAt(ctx, x, y, w, h, lit);
  // rain runs down the face from the cornice: tide marks, and the lit windows' warmth spilling on the wet stone
  for (let x = 30; x < x1; x += 60 + r() * 50) streaks(ctx, r, x, roof + 12, 18, 90 + r() * 120, '#06080e', 0.25, 3);
  for (const [x, y, w, h, lit] of ML_WIN) if (lit) lightPool(ctx, x + w / 2, y + h + 8, w * 1.3, 14, SODIUM, 0.1 * lit, 'source-over');
  // the moon on the left, the canyon's sodium glow low down, the shade towards the corner
  vfill(ctx, -10, roof, x1 + 10, 760 - roof, [[0, 'rgba(4,6,12,0)'], [0.6, 'rgba(4,6,12,0.15)'], [1, 'rgba(30,20,14,0.35)']]);
  const lg = ctx.createLinearGradient(0, 0, x1, 0);
  lg.addColorStop(0, rgba(MOONLIT, 0.06));
  lg.addColorStop(1, 'rgba(4,6,12,0.25)');
  ctx.fillStyle = lg;
  ctx.fillRect(-10, roof, x1 + 10, 760 - roof);
  dots(ctx, { x: -10, y: roof, w: x1 + 10, h: 760 - roof }, (x, y) => 0.12 + 0.25 * smooth(200, x1, x) + 0.2 * smooth(600, 760, y), '#02040c', { step: 8, angle: 0.79, a: 0.45 });
  ctx.restore();
  ink(ctx, face, 2.2, INK, 0.5);
  canyonFog(ctx, -10, x1 + 22);
  // quoins up the corner
  for (let y = roof + 6, i = 0; y < 740; y += 26, i++) {
    const qw = i % 2 ? 22 : 34;
    const q = rectPath(x1 - qw, y, qw, 24);
    ctx.fillStyle = i % 2 ? '#323a4c' : '#384052';
    q(ctx);
    ctx.fill();
    ctx.fillStyle = rgba(MOONLIT, 0.16);
    ctx.fillRect(x1 - qw, y, qw, 1.4);
  }
  // the cornice: a deep moulding with a zigzag deco band, its top wet and moonlit
  const corn = rectPath(-10, roof - 12, x1 + 26, 16);
  solid(ctx, corn, { x: -10, y: roof - 12, w: x1 + 26, h: 16 }, STONE, '#465064', { depth: 0.35, line: 1.8, formSize: 4 });
  within(ctx, corn, () => {
    ctx.strokeStyle = 'rgba(6,8,16,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = -10; x < x1 + 20; x += 10) {
      ctx.moveTo(x, roof);
      ctx.lineTo(x + 5, roof - 6);
      ctx.lineTo(x + 10, roof);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,214,240,0.35)';
    ctx.fillRect(-10, roof - 12, x1 + 26, 1.6);
  });
  crevice(ctx, -10, x1 + 16, roof + 4, 12, 0.5, '#02040a');
  // the roof seen from above over its parapet: wet tar, the sky in its puddles
  const deck = polyPath([[-10, roof - 12], [x1 + 16, roof - 12], [x1 + 6, roof - 26], [-10, roof - 26]]);
  ctx.fillStyle = '#161c28';
  deck(ctx);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,140,180,0.2)';
  for (const [px, pw] of [[60, 70], [330, 50], [470, 40]] as const) {
    ctx.beginPath();
    ctx.ellipse(px, roof - 18, pw, 3, 0, 0, P2);
    ctx.fill();
  }
  waterTower(ctx, r);
  signFrame(ctx);
  roofVent(ctx, VENT.x, VENT.y);
  spoutGargoyle(ctx, GH.spouts[0].x, GH.spouts[0].y, 1);
}

export const VENT = { x: GH.vent.x + 54, y: GH.midL.roof - 20 };

/** The cedar water tower on its steel stand. */
function waterTower(ctx: Ctx, r: R): void {
  const { x, base, deck, top } = GH.tank;
  const legBase = base - 18;
  const legs = [-46, -16, 16, 46];
  castShadow(ctx, polyPath([[x - 56, top], [x + 56, top], [x + 56, legBase], [x - 56, legBase]]), 10, 8, 0.35, '#02040a');
  ctx.lineCap = 'round';
  for (const lx of legs) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + lx * 1.05, legBase);
    ctx.lineTo(x + lx * 0.9, deck);
    ctx.stroke();
    ctx.strokeStyle = '#3a4252';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 48, legBase - 2);
  ctx.lineTo(x + 16, deck + 2);
  ctx.moveTo(x + 48, legBase - 2);
  ctx.lineTo(x - 16, deck + 2);
  ctx.stroke();
  flatPlate(ctx, rectPath(x - 60, deck - 6, 120, 8), '#2a3040');
  // the barrel: staves, hoops, the moon on its left side, dark and wet on the right, water weeping from a stave
  const barrel: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 52, deck - 6);
    c.lineTo(x - 54, top);
    c.lineTo(x + 54, top);
    c.lineTo(x + 52, deck - 6);
    c.closePath();
  };
  const g = ctx.createLinearGradient(x - 54, 0, x + 54, 0);
  g.addColorStop(0, '#7a6a64');
  g.addColorStop(0.3, '#5a4440');
  g.addColorStop(1, '#22181c');
  ctx.fillStyle = g;
  barrel(ctx);
  ctx.fill();
  within(ctx, barrel, () => {
    ctx.strokeStyle = 'rgba(14,8,10,0.5)';
    ctx.lineWidth = 1.2;
    for (let k = -5; k <= 5; k++) {
      const sx = x + Math.sin((k / 6) * Math.PI * 0.5) * 54;
      ctx.beginPath();
      ctx.moveTo(sx, top);
      ctx.lineTo(sx, deck);
      ctx.stroke();
    }
    for (const hy of [top + 12, top + 34, top + 56, deck - 14]) {
      ctx.fillStyle = INK;
      ctx.fillRect(x - 56, hy, 112, 3);
      ctx.fillStyle = 'rgba(200,214,240,0.4)';
      ctx.fillRect(x - 48, hy, 30, 1.2);
    }
    dots(ctx, { x: x - 54, y: top, w: 108, h: deck - top }, linTone(x - 10, 0, x + 54, 0, 0.05, 0.8), '#06040a', { step: 5, angle: 0.79, a: 0.6 });
    ctx.fillStyle = 'rgba(10,6,8,0.4)';
    ctx.fillRect(x + 18, top + 20, 5, deck - top - 20);
  });
  ink(ctx, barrel, 2.2, INK, 0.5);
  const roof = polyPath([[x - 60, top + 2], [x, GH.skyH + 6], [x + 60, top + 2]]);
  const rg = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
  rg.addColorStop(0, '#6a6070');
  rg.addColorStop(0.5, '#3a3442');
  rg.addColorStop(1, '#14121a');
  ctx.fillStyle = rg;
  roof(ctx);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,214,240,0.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 58, top);
  ctx.lineTo(x - 2, GH.skyH + 8);
  ctx.stroke();
  ink(ctx, roof, 2, INK, 0.4);
  // a ladder up the side
  ctx.strokeStyle = 'rgba(6,8,14,0.9)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const lx of [x - 66, x - 58]) {
    ctx.moveTo(lx, legBase);
    ctx.lineTo(lx + 4, top + 6);
  }
  for (let y = legBase - 8; y > top + 8; y -= 10) {
    const u = (legBase - y) / (legBase - top);
    ctx.moveTo(x - 66 + u * 4, y);
    ctx.lineTo(x - 58 + u * 4, y);
  }
  ctx.stroke();
  void r;
}

function flatPlate(ctx: Ctx, p: PathFn, col: string): void {
  ctx.fillStyle = col;
  p(ctx);
  ctx.fill();
  ink(ctx, p, 1.6, INK, 0.3);
}

/** A mushroom-capped cast-iron vent on a roof (the steam comes out under its cap, live). */
function roofVent(ctx: Ctx, x: number, y: number): void {
  const pipe = rectPath(x - 7, y - 30, 14, 30);
  castShadow(ctx, pipe, 6, 4, 0.4, '#02040a');
  const g = ctx.createLinearGradient(x - 7, 0, x + 7, 0);
  g.addColorStop(0, '#6a7486');
  g.addColorStop(1, '#1a1e28');
  ctx.fillStyle = g;
  pipe(ctx);
  ctx.fill();
  ink(ctx, pipe, 1.4, INK, 0.3);
  const cap = ellPath(x, y - 32, 16, 6);
  ctx.fillStyle = '#3a4252';
  cap(ctx);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,214,240,0.4)';
  ctx.fillRect(x - 12, y - 37, 14, 1.4);
  ink(ctx, cap, 1.4, INK, 0.3);
}

// ——— the ALL-NIGHT PIZZA sign on its trestle ———

const SG = GH.sign;
const SIGN_TEXT = 'PIZZA';
const SIGN_FONT = '"Impact", "Haettenschweiler", "Arial Black", sans-serif';
const letterXs = (): number[] => {
  const x0 = SG.x0 + 74;
  const step = (SG.x1 - 16 - x0) / SIGN_TEXT.length;
  return [...SIGN_TEXT].map((_, i) => x0 + step * (i + 0.5));
};
const SLICE_PTS: [number, number][] = [[SG.x0 + 16, SG.y0 + 12], [SG.x0 + 60, SG.y0 + 12], [SG.x0 + 38, SG.y1 - 14]];
/** The dud letter (the second Z). */
const DUD = 3;

function signFrame(ctx: Ctx): void {
  const { x0, x1, y0, y1 } = SG;
  const roof = GH.midL.roof - 20;
  // the trestle's legs and braces down to the roof
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (const lx of [x0 + 24, (x0 + x1) / 2, x1 - 24]) {
    ctx.moveTo(lx, y1);
    ctx.lineTo(lx, roof);
  }
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0 + 24, y1 + 2);
  ctx.lineTo((x0 + x1) / 2, roof);
  ctx.lineTo(x1 - 24, y1 + 2);
  ctx.stroke();
  // the box: black enamel, a steel rim catching the moon
  const box = rectPath(x0, y0, x1 - x0, y1 - y0);
  castShadow(ctx, box, 8, 8, 0.45, '#02040a');
  ctx.fillStyle = '#0c0e16';
  box(ctx);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,214,240,0.35)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4);
  ink(ctx, box, 2.2, INK, 0.4);
  // the unlit tubes: glass over their brackets; the painted tag
  neonTubes(ctx, 'off');
}

/** The sign's neon: the slice's outline and the letters, unlit glass or lit (halo, glass, core); `only` picks one
 * letter, `skip` leaves one out. */
function neonTubes(c: Ctx, mode: 'off' | 'lit', only: number | null = null, skip: number | null = null): void {
  const xs = letterXs();
  const draw = (lw: number, col: string, blur = 0, glowCol = '') => {
    c.save();
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.lineWidth = lw;
    c.strokeStyle = col;
    if (blur) {
      c.shadowBlur = blur;
      c.shadowColor = glowCol;
    }
    c.font = `40px ${SIGN_FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let i = 0; i < SIGN_TEXT.length; i++) {
      if ((only !== null && only !== i) || skip === i) continue;
      c.strokeText(SIGN_TEXT[i], xs[i], (SG.y0 + SG.y1) / 2 + 2);
    }
    if (only === null) {
      // the slice: its crust's curve and its point, two pepperoni rings
      c.beginPath();
      c.moveTo(SLICE_PTS[0][0], SLICE_PTS[0][1]);
      c.quadraticCurveTo((SLICE_PTS[0][0] + SLICE_PTS[1][0]) / 2, SLICE_PTS[0][1] - 8, SLICE_PTS[1][0], SLICE_PTS[1][1]);
      c.lineTo(SLICE_PTS[2][0], SLICE_PTS[2][1]);
      c.closePath();
      c.moveTo(SG.x0 + 36 + 5, SG.y0 + 22);
      c.arc(SG.x0 + 36, SG.y0 + 22, 5, 0, P2);
      c.moveTo(SG.x0 + 44 + 3.5, SG.y0 + 34);
      c.arc(SG.x0 + 44, SG.y0 + 34, 3.5, 0, P2);
      c.stroke();
    }
    c.restore();
  };
  if (mode === 'off') {
    draw(4, 'rgba(120,60,70,0.55)');
    draw(1.2, 'rgba(230,200,210,0.35)');
    return;
  }
  draw(9, rgba(NEON, 0.5), 16, NEON);
  draw(4.5, '#ff6a7a');
  draw(1.8, '#fff0f2');
}

const SIGN_LIT_BOX = { x: SG.x0 - 4, y: SG.y0 - 24, w: SG.x1 - SG.x0 + 28, h: SG.y1 - SG.y0 + 48 };

// ——— right: the slate mansard, its chimneys, the searchlight's roof ———

const MIDR_BOX = { x: 1300, y: GH.skyH + 10, w: W - 1300, h: TY - GH.skyH - 10 };

function midRight(ctx: Ctx, r: R): void {
  const { x0, roof, ridge, mansard } = GH.midR;
  // the facade: smoke-dark brick under a stone string course
  const face = rectPath(x0, roof, W - x0 + 10, 760 - roof);
  ctx.save();
  face(ctx);
  ctx.clip();
  surface(ctx, r, { x: x0, y: roof, w: W - x0, h: 760 - roof }, '#2e2830', { vary: 0.5, warm: '#463a40', cool: '#14141e', mottle: 0.45, strokes: 0.25, grain: 0.16, seed: 73 });
  ctx.fillStyle = 'rgba(6,6,12,0.32)';
  for (let y = roof + 8, row = 0; y < 760; y += 9, row++) {
    ctx.fillRect(x0, y, W - x0, 1.2);
    if (row % 3 === 0) for (let x = x0 + (row % 2) * 12; x < W; x += 24) ctx.fillRect(x, y - 9, 1.2, 9);
  }
  for (const [x, y, w, h, lit] of MR_WIN) windowAt(ctx, x, y, w, h, lit);
  for (let x = x0 + 20; x < W; x += 50 + r() * 60) streaks(ctx, r, x, roof + 6, 14, 80 + r() * 140, '#04040a', 0.28, 3);
  for (const [x, y, w, h, lit] of MR_WIN) if (lit) lightPool(ctx, x + w / 2, y + h + 8, w * 1.3, 12, SODIUM, 0.1 * lit, 'source-over');
  const lg = ctx.createLinearGradient(x0, 0, W, 0);
  lg.addColorStop(0, rgba(MOONLIT, 0.08));
  lg.addColorStop(1, 'rgba(4,6,12,0.3)');
  ctx.fillStyle = lg;
  ctx.fillRect(x0, roof, W - x0, 760 - roof);
  vfill(ctx, x0, roof, W - x0, 760 - roof, [[0, 'rgba(4,6,12,0)'], [0.6, 'rgba(4,6,12,0.15)'], [1, 'rgba(30,20,14,0.35)']]);
  dots(ctx, { x: x0, y: roof, w: W - x0, h: 760 - roof }, (x, y) => 0.12 + 0.2 * smooth(1500, W, x) + 0.2 * smooth(600, 760, y), '#02040c', { step: 8, angle: 0.79, a: 0.45 });
  ctx.restore();
  ink(ctx, face, 2.2, INK, 0.5);
  canyonFog(ctx, x0 - 4, W);
  // the string course, and the flat roof's deck over the right part seen from above
  const course = rectPath(x0 - 6, roof - 4, W - x0 + 12, 10);
  solid(ctx, course, { x: x0 - 6, y: roof - 4, w: W - x0 + 12, h: 10 }, STONE, '#4a5262', { depth: 0.35, line: 1.6, formSize: 3 });
  ctx.fillStyle = 'rgba(200,214,240,0.35)';
  ctx.fillRect(x0 - 6, roof - 4, W - x0 + 12, 1.4);
  crevice(ctx, x0, W, roof + 6, 10, 0.5, '#02040a');
  const deck = polyPath([[mansard, roof - 4], [W + 10, roof - 4], [W + 10, roof - 22], [mansard + 8, roof - 22]]);
  ctx.fillStyle = '#141a26';
  deck(ctx);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,140,180,0.18)';
  ctx.beginPath();
  ctx.ellipse(1840, roof - 12, 50, 3, 0, 0, P2);
  ctx.fill();
  // the mansard: steep slate in courses, the moon down its slope, wet
  const slope = polyPath([[x0 - 6, roof - 4], [mansard + 4, roof - 4], [mansard - 4, ridge], [x0 + 8, ridge]]);
  ctx.save();
  slope(ctx);
  ctx.clip();
  vfill(ctx, x0 - 6, ridge, mansard - x0 + 12, roof - ridge, [[0, '#3a4252'], [1, '#1c2230']]);
  for (let y = ridge + 5, row = 0; y < roof; y += 6, row++) {
    ctx.fillStyle = 'rgba(4,6,12,0.55)';
    ctx.fillRect(x0 - 6, y, mansard - x0 + 12, 1.2);
    for (let x = x0 + (row % 2) * 6; x < mansard; x += 12) ctx.fillRect(x, y - 5, 1, 5);
    ctx.fillStyle = 'rgba(180,200,230,0.07)';
    ctx.fillRect(x0 - 6, y + 1.2, mansard - x0 + 12, 1);
  }
  ctx.fillStyle = 'rgba(200,214,240,0.08)';
  ctx.fillRect(x0, ridge, 80, roof - ridge);
  // the loose slate's gap (live, the slate itself)
  ctx.fillStyle = 'rgba(2,4,8,0.7)';
  ctx.fillRect(TILE.x - TILE.w / 2, TILE.y - TILE.h / 2, TILE.w, TILE.h);
  ctx.restore();
  ink(ctx, slope, 1.8, INK, 0.4);
  ctx.fillStyle = 'rgba(200,214,240,0.4)';
  ctx.fillRect(x0 + 8, ridge, mansard - x0 - 12, 1.4);
  // dormers in the slope (dark: they light up now and then)
  for (const dx of DORMERS) {
    const d = polyPath([[dx - 16, roof - 8], [dx + 16, roof - 8], [dx + 16, ridge + 16], [dx, ridge + 4], [dx - 16, ridge + 16]]);
    castShadow(ctx, d, 5, 4, 0.4, '#02040a');
    ctx.fillStyle = '#343c4c';
    d(ctx);
    ctx.fill();
    ink(ctx, d, 1.4, INK, 0.3);
    windowAt(ctx, dx - 9, ridge + 18, 18, 22, 0, true);
  }
  for (const cx of GH.chimneys) chimney(ctx, cx, ridge);
  searchlightRoof(ctx);
  spoutGargoyle(ctx, GH.spouts[1].x, GH.spouts[1].y, -1);
}

export const CHIMNEY_TOP = 336;

function chimney(ctx: Ctx, x: number, ridge: number): void {
  const top = CHIMNEY_TOP;
  const stack = rectPath(x - 18, top, 36, ridge - top + 4);
  castShadow(ctx, stack, 7, 5, 0.4, '#02040a');
  ctx.fillStyle = '#3a2a2c';
  stack(ctx);
  ctx.fill();
  within(ctx, stack, () => {
    ctx.fillStyle = 'rgba(6,4,8,0.4)';
    for (let y = top + 6, row = 0; y < ridge; y += 7, row++) {
      ctx.fillRect(x - 18, y, 36, 1.1);
      for (let bx = x - 18 + (row % 2) * 6; bx < x + 18; bx += 12) ctx.fillRect(bx, y - 7, 1.1, 7);
    }
    ctx.fillStyle = rgba(MOONLIT, 0.14);
    ctx.fillRect(x - 18, top, 6, ridge - top);
    ctx.fillStyle = 'rgba(4,4,8,0.4)';
    ctx.fillRect(x + 6, top, 12, ridge - top);
    vfill(ctx, x - 18, top, 36, 14, [[0, 'rgba(4,4,6,0.7)'], [1, 'rgba(4,4,6,0)']]);
  });
  ink(ctx, stack, 1.8, INK, 0.4);
  flatPlate(ctx, rectPath(x - 22, top - 6, 44, 7), '#4a4a56');
  for (const px of [x - 8, x + 8]) {
    const pot = polyPath([[px - 6, top - 6], [px - 4, top - 20], [px + 4, top - 20], [px + 6, top - 6]]);
    ctx.fillStyle = '#5a3a30';
    pot(ctx);
    ctx.fill();
    ink(ctx, pot, 1.2, INK, 0.2);
  }
}

// the searchlight: its pedestal on the flat roof, the drum a sprite on its trunnion
const LAMP = GH.lamp;
const LAMP_REST = Math.atan2(GH.signal.y - LAMP.y, GH.signal.x - LAMP.x);
const LAMP_BOX = { x: LAMP.x - 70, y: LAMP.y - 50, w: 140, h: 100 };

function searchlightRoof(ctx: Ctx): void {
  const { x, y } = LAMP;
  const roof = GH.midR.roof - 12;
  const ped = polyPath([[x - 18, roof], [x - 12, y + 26], [x + 12, y + 26], [x + 18, roof]]);
  castShadow(ctx, ped, 8, 4, 0.4, '#02040a');
  const g = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
  g.addColorStop(0, '#6a7486');
  g.addColorStop(0.4, '#3a4252');
  g.addColorStop(1, '#12141c');
  ctx.fillStyle = g;
  ped(ctx);
  ctx.fill();
  ink(ctx, ped, 2, INK, 0.4);
  const fork = polyPath([[x - 44, y + 26], [x - 42, y - 6], [x - 34, y - 6], [x - 34, y + 16], [x + 34, y + 16], [x + 34, y - 6], [x + 42, y - 6], [x + 44, y + 26]]);
  ctx.fillStyle = '#3a4252';
  fork(ctx);
  ctx.fill();
  ink(ctx, fork, 1.8, INK, 0.4);
}

/** The searchlight's drum aimed along `ang` (0 points right), round its trunnion; `lit` its lens. */
function lampHead(c: Ctx, ang: number, lit: number): void {
  const { x, y } = LAMP;
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  if (Math.abs(ang) > Math.PI / 2) c.scale(1, -1);
  const L = 72;
  const R0 = 30;
  const drum = rectPath(-L * 0.55, -R0, L, R0 * 2);
  const g = c.createLinearGradient(0, -R0, 0, R0);
  g.addColorStop(0, '#a8b4c8');
  g.addColorStop(0.35, '#566070');
  g.addColorStop(1, '#14161e');
  c.fillStyle = g;
  drum(c);
  c.fill();
  within(c, drum, () => {
    c.fillStyle = 'rgba(4,6,10,0.7)';
    for (const hx of [-L * 0.4, -L * 0.1, L * 0.2]) c.fillRect(hx, -R0, 3, R0 * 2);
    c.fillStyle = 'rgba(220,230,250,0.5)';
    c.fillRect(-L * 0.55, -R0 + 5, L, 2);
  });
  ink(c, drum, 2.2, INK, 0.3);
  c.fillStyle = '#2a3040';
  c.beginPath();
  c.ellipse(-L * 0.55, 0, 8, R0, 0, 0, P2);
  c.fill();
  c.fillStyle = '#8a94a8';
  c.beginPath();
  c.ellipse(L * 0.45, 0, 10, R0 + 3, 0, 0, P2);
  c.fill();
  const lg = c.createLinearGradient(0, -R0, 0, R0);
  lg.addColorStop(0, mix('#4a5670', '#fffbe8', lit));
  lg.addColorStop(1, mix('#141a28', '#ffe8a0', lit));
  c.fillStyle = lg;
  c.beginPath();
  c.ellipse(L * 0.45 + 2, 0, 7, R0 - 3, 0, 0, P2);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 1.6;
  c.stroke();
  c.fillStyle = '#6a7486';
  c.beginPath();
  c.arc(0, 0, 6, 0, P2);
  c.fill();
  c.stroke();
  c.restore();
}

// ——— the ledge (the table) ———

/** Puddles on the coping: [x, y, rx, ry]. */
export const PUDDLES: [number, number, number, number][] = [
  [330, 792, 120, 12],
  [760, 784, 90, 9],
  [1240, 788, 110, 10],
  [1640, 800, 130, 13],
  [120, 900, 110, 16],
  [1830, 930, 90, 16],
  [700, 1010, 130, 14],
  [1260, 1016, 150, 15],
];

function table(ctx: Ctx, r: R): void {
  const zf = GH.front;
  floorPlane(ctx, r, zf, { size: 0.62, depthK: 0.72, a: ['#3a404e', '#3e4454', '#363c4a', '#424858', '#3b4150'], grout: '#141822', gap: 0.022, gloss: 0.4, wear: 0.2, tex: 'stone', seed: 61 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, zf - TY + 4);
  ctx.clip();
  // the rain on it: darker where it lies, a cold sheen of the sky towards the back
  lay(ctx, noiseMask(10, 63, { cover: 0.5, soft: 0.3, col: '#0a0e18' }), { x: 0, y: TY, w: W, h: zf - TY }, 0.35);
  vfill(ctx, 0, TY, W, zf - TY, [[0, 'rgba(120,140,180,0.14)'], [0.35, 'rgba(120,140,180,0.04)'], [1, 'rgba(4,6,12,0.2)']]);
  // lichen and black crust in the joints at the sides, out of the lanes
  lay(ctx, noiseMask(14, 64, { cover: 0.22, soft: 0.12, col: '#2a3428' }), { x: 0, y: TY, w: 280, h: zf - TY }, 0.4);
  lay(ctx, noiseMask(14, 65, { cover: 0.22, soft: 0.12, col: '#2a3428' }), { x: W - 280, y: TY, w: 280, h: zf - TY }, 0.4);
  // the puddles: dark glass holding the sky; the neon's red and the sodium's amber caught in the far ones
  for (const [px, py, rx, ry] of PUDDLES) {
    softly(ctx, { x: px - rx - 30, y: py - ry - 20, w: rx * 2 + 60, h: ry * 2 + 40 }, (g) => {
      g.fillStyle = 'rgba(8,12,22,0.32)';
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.ellipse(px + (k - 1.5) * rx * 0.35, py + (k % 2 ? 1 : -1) * ry * 0.2, rx * (0.45 + (k % 3) * 0.12), ry * (0.7 + (k % 2) * 0.2), 0, 0, P2);
        g.fill();
      }
      const sg = g.createLinearGradient(0, py - ry, 0, py + ry);
      sg.addColorStop(0, 'rgba(110,130,170,0.4)');
      sg.addColorStop(0.5, 'rgba(70,90,130,0.15)');
      sg.addColorStop(1, 'rgba(70,90,130,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.ellipse(px, py, rx * 0.8, ry * 0.8, 0, 0, P2);
      g.fill();
    }, 0.25);
    const glint = px < 700 && py < 820 ? NEON : px > 1500 && py < 820 ? SODIUM : '';
    if (glint) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = rgba(glint, 0.08 + r() * 0.08);
        ctx.fillRect(px - rx * 0.4 + r() * rx * 0.5, py - ry * 0.6 + k * (ry * 0.24), rx * (0.15 + r() * 0.3), 1.6);
      }
      ctx.restore();
    }
    // the wet rim catching the sky
    ctx.strokeStyle = 'rgba(160,180,220,0.12)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(px, py, rx * 0.9, ry * 0.9, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  // the neon's red lying faintly across the wet stone at the back left, the searchlight's white at the right
  lightPool(ctx, 380, TY + 30, 360, 40, NEON, 0.06);
  lightPool(ctx, 1650, TY + 26, 300, 34, '#dfe6ff', 0.05);
  // the printed shade
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => 0.25 * smooth(zf - 200, zf, y) + 0.1 * (1 - smooth(TY, TY + 50, y)) + (0.12 * Math.abs(x - 960)) / 960, '#02040c', { step: 8, angle: 0.79, a: 0.3, floor: 0.06 });
  ctx.restore();
  tableFalloff(ctx, zf, 0.4, '#02040a');
  tableSeam(ctx, 0.6, INK, false);
  // the ledge's back arris: chamfered, moonlit, the drop beyond it
  vfill(ctx, 0, TY - 14, W, 14, [[0, 'rgba(2,4,10,0)'], [1, 'rgba(2,4,10,0.6)']]);
  ctx.fillStyle = 'rgba(170,186,220,0.34)';
  ctx.fillRect(0, TY - 1, W, 2);
  crevice(ctx, 0, W, TY + 1, 12, 0.4, '#02040a');
  // the coping's front face: a moulded drip course, dark and wet
  const lip = rectPath(0, zf, W, 1080 - zf);
  ctx.save();
  lip(ctx);
  ctx.clip();
  vfill(ctx, 0, zf, W, 1080 - zf, [[0, '#2c3240'], [0.25, '#1a1e28'], [1, '#0a0c12']]);
  ctx.fillStyle = 'rgba(190,206,236,0.3)';
  ctx.fillRect(0, zf, W, 2);
  ctx.fillStyle = 'rgba(2,4,8,0.6)';
  ctx.fillRect(0, zf + 14, W, 3);
  dots(ctx, { x: 0, y: zf, w: W, h: 1080 - zf }, (_x, y) => 0.25 + 0.5 * smooth(zf, 1080, y), '#000000', { step: 7, angle: 0.79, a: 0.5 });
  ctx.restore();
}

// ——— the grotesques on the ledge's back corners ———

type Seg = (number | string)[];
const shapeOf = (x0: number, y0: number, dir: number, segs: Seg[]): PathFn => (c) => {
  const X = (v: number) => x0 + v * dir;
  const Y = (v: number) => y0 + v;
  c.beginPath();
  for (const s of segs) {
    const n = s.slice(1) as number[];
    if (s[0] === 'M') c.moveTo(X(n[0]), Y(n[1]));
    else if (s[0] === 'L') c.lineTo(X(n[0]), Y(n[1]));
    else if (s[0] === 'Q') c.quadraticCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]));
    else if (s[0] === 'C') c.bezierCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]), X(n[4]), Y(n[5]));
    else c.closePath();
  }
};
const off = (segs: Seg[], dx: number, dy: number): Seg[] => segs.map((s) => [s[0], ...(s.slice(1) as number[]).map((v, i) => v + (i % 2 ? dy : dx))]);

/** Our grotesque, in its own frame (facing +x, y up from the pedestal's top): an imp crouched on its haunches, tall
 * pointed ears, bat wings raised behind its hunched back, a heavy brow over a wide snout, and a long stone tongue
 * lolling from its grin that the rain runs off. */
const WING: Seg[] = [
  ['M', 6, -148],
  ['C', -8, -190, -40, -236, -96, -262],
  ['L', -88, -240],
  ['Q', -112, -236, -128, -214],
  ['Q', -116, -206, -122, -188],
  ['Q', -134, -176, -134, -154],
  ['Q', -118, -158, -110, -138],
  ['Q', -114, -122, -100, -106],
  ['L', -60, -98],
  ['Z'],
];
const LEG: Seg[] = [
  ['M', 52, -120],
  ['C', 72, -114, 80, -86, 78, -58],
  ['C', 76, -34, 80, -16, 94, -6],
  ['L', 96, 0],
  ['L', 56, 0],
  ['C', 58, -16, 54, -34, 48, -50],
  ['C', 40, -70, 38, -96, 44, -116],
  ['Z'],
];
const GS = {
  farWing: off(WING, 24, -12),
  wing: WING,
  farLeg: off(LEG, -16, -2),
  farEar: [['M', 104, -206], ['C', 104, -224, 108, -242, 104, -258], ['C', 116, -240, 120, -224, 116, -204], ['Z']] as Seg[],
  body: [
    ['M', 40, 0],
    ['L', -56, 0],
    ['Q', -74, -6, -70, -40],
    ['C', -84, -70, -78, -110, -56, -136],
    ['C', -44, -160, -30, -186, -6, -198],
    ['C', 14, -208, 40, -206, 56, -196],
    ['C', 66, -206, 80, -214, 96, -210],
    ['C', 112, -206, 122, -194, 122, -180],
    ['L', 134, -172],
    ['Q', 138, -164, 128, -160],
    ['L', 114, -158],
    ['L', 120, -150],
    ['Q', 116, -140, 104, -142],
    ['C', 92, -142, 82, -140, 76, -132],
    ['C', 66, -118, 62, -100, 64, -80],
    ['C', 66, -56, 58, -30, 46, -14],
    ['C', 42, -8, 40, -4, 40, 0],
    ['Z'],
  ] as Seg[],
  ear: [['M', 88, -208], ['C', 82, -224, 76, -240, 66, -256], ['C', 84, -246, 98, -230, 102, -210], ['Z']] as Seg[],
  tongue: [['M', 118, -156], ['C', 132, -152, 146, -144, 150, -130], ['C', 152, -122, 148, -116, 142, -118], ['C', 140, -130, 132, -142, 116, -150], ['Z']] as Seg[],
  leg: LEG,
  tail: [['M', -60, -10], ['C', -40, 8, 10, 10, 40, 4], ['C', 54, 2, 62, -6, 54, -14], ['C', 50, -6, 36, -4, 24, -4], ['C', -6, -2, -36, -6, -54, -26], ['Z']] as Seg[],
};
/** Where a grotesque's tongue drips, and the edges its wings shed water from (its own frame). */
const TONGUE_TIP: [number, number] = [146, -118];
const WING_EDGE: [number, number][] = [[-96, -262], [-128, -214], [-134, -154], [-100, -106], [-56, -136], [-30, -186], [30, -204], [96, -210]];

function gShapes(x: number, dir: number) {
  const y = GH.ped.top;
  const S = (segs: Seg[]) => shapeOf(x, y, dir, segs);
  return { farWing: S(GS.farWing), wing: S(GS.wing), farLeg: S(GS.farLeg), farEar: S(GS.farEar), body: S(GS.body), ear: S(GS.ear), tongue: S(GS.tongue), leg: S(GS.leg), tail: S(GS.tail) };
}
const GBOX = (x: number, dir: number) => ({ x: dir > 0 ? x - 140 : x - 160, y: GH.ped.top - 280, w: 300, h: 290 });

function pedestal(ctx: Ctx, r: R, x: number): void {
  const { w, top, base } = GH.ped;
  const cap = 12;
  const block = rectPath(x - w / 2 + 8, top + cap, w - 16, base - top - cap);
  const capP = rectPath(x - w / 2, top, w, cap);
  // its reflection in the wet ledge, its shadow, its contact
  softly(ctx, { x: x - w / 2, y: base, w, h: 40 }, (g) => {
    const rg = g.createLinearGradient(0, base, 0, base + 36);
    rg.addColorStop(0, 'rgba(30,36,50,0.55)');
    rg.addColorStop(1, 'rgba(30,36,50,0)');
    g.fillStyle = rg;
    g.fillRect(x - w / 2 + 8, base, w - 16, 36);
  }, 0.5);
  groundShadow(ctx, x + 10, base, w * 0.6, 8, 0.6, '#02040a');
  castShadow(ctx, block, 10, 10, 0.5, '#02040a');
  solid(ctx, block, { x: x - w / 2, y: top + cap, w, h: base - top - cap }, STONE, '#3e4556', { depth: 0.05, line: 2.4, formSize: 12 });
  within(ctx, block, () => {
    ctx.strokeStyle = 'rgba(4,6,12,0.5)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x - w / 2 + 22, top + cap + 8, w - 44, base - top - cap - 18);
    ctx.strokeStyle = 'rgba(200,214,240,0.12)';
    ctx.strokeRect(x - w / 2 + 23.5, top + cap + 9.5, w - 44, base - top - cap - 18);
    streaks(ctx, r, x, top + cap, w - 30, base - top, '#04060a', 0.35, 6);
    dots(ctx, { x: x - w / 2, y: top, w, h: base - top }, linTone(x, 0, x + w / 2, 0, 0, 0.6), '#02040a', { step: 5, angle: 0.79, a: 0.35, floor: 0.08 });
  });
  solid(ctx, capP, { x: x - w / 2, y: top, w, h: cap }, STONE, '#565e70', { depth: 0.05, line: 2.2, formSize: 6 });
  ctx.fillStyle = 'rgba(210,222,246,0.3)';
  ctx.fillRect(x - w / 2 + 2, top, w - 4, 1.6);
  crevice(ctx, x - w / 2 + 8, x + w / 2 - 8, base, 6, 0.6, '#02040a');
}

function grotesque(ctx: Ctx, r: R, x: number, dir: number): void {
  pedestal(ctx, r, x);
  const s = gShapes(x, dir);
  const y = GH.ped.top;
  const X = (v: number) => x + v * dir;
  const box = GBOX(x, dir);
  const stone = '#4c5466';
  const dark = '#04060c';
  const cr = (w: number, a: number, la: number, f: (c: Ctx) => void) => crease(ctx, f, w, dark, a, la);
  for (const p of [s.farWing, s.wing, s.body]) castShadow(ctx, p, 14, 16, 0.45, '#02040a');
  groundShadow(ctx, X(-6), y - 1, 90, 5, 0.6, '#02040a');
  solid(ctx, s.farWing, box, STONE, shade(stone, -0.34), { depth: 0.05, line: 2.2, formSize: 20 });
  solid(ctx, s.farLeg, box, STONE, shade(stone, -0.3), { depth: 0.05, line: 2.2, formSize: 14 });
  solid(ctx, s.wing, box, STONE, shade(stone, -0.08), { depth: 0.05, line: 2.6, formSize: 24 });
  within(ctx, s.wing, () => {
    // the finger bones fanning from the wrist, the membrane sunk between them
    for (const [tx, ty] of [[-128, -214], [-134, -154], [-100, -106]] as const) {
      cr(3.2, 0.55, 0.35, (c) => {
        c.moveTo(X(-90), y - 252);
        c.quadraticCurveTo(X((tx - 90) / 2 - 6), y + (ty - 252) / 2 + 4, X(tx), y + ty);
      });
    }
    cr(4, 0.5, 0.4, (c) => {
      c.moveTo(X(6), y - 150);
      c.bezierCurveTo(X(-8), y - 190, X(-40), y - 236, X(-94), y - 260);
    });
    vfill(ctx, box.x, y - 200, box.w, 110, [[0, 'rgba(4,6,12,0)'], [1, 'rgba(4,6,12,0.45)']]);
  });
  innerEdge(ctx, s.wing, 'rgba(170,190,236,0.28)', 4, 4 * -dir, 2);
  solid(ctx, s.tail, box, STONE, shade(stone, -0.05), { depth: 0.05, line: 2, formSize: 8 });
  solid(ctx, s.farEar, box, STONE, shade(stone, -0.3), { depth: 0.05, line: 1.8, formSize: 6 });
  solid(ctx, s.body, box, STONE, stone, { depth: 0.05, line: 3, formSize: 40 });
  within(ctx, s.body, () => {
    // carved masses turned to the moon: haunch, ribcage, shoulder, skull, snout
    for (const [mx, my, mr] of [[-44, -60, 50], [-16, -140, 44], [30, -172, 30], [96, -194, 22], [120, -172, 12]] as const) {
      const cx = X(mx);
      const cy = y + my;
      const g = ctx.createRadialGradient(cx - mr * 0.3 * dir, cy - mr * 0.36, 0, cx, cy, mr * 1.25);
      g.addColorStop(0, 'rgba(200,214,244,0.16)');
      g.addColorStop(0.5, 'rgba(200,214,244,0.04)');
      g.addColorStop(1, 'rgba(4,6,12,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - mr * 1.3, cy - mr * 1.3, mr * 2.6, mr * 2.6);
    }
    cr(4, 0.5, 0.3, (c) => {
      c.moveTo(X(-6), y - 6);
      c.bezierCurveTo(X(-48), y - 18, X(-70), y - 84, X(-48), y - 126);
    });
    for (let k = 0; k < 4; k++)
      cr(2.2, 0.42, 0.22, (c) => {
        c.moveTo(X(26 - k * 6), y - 112 - k * 13);
        c.quadraticCurveTo(X(12 - k * 6), y - 106 - k * 13, X(-2 - k * 6), y - 110 - k * 14);
      });
    for (const [kx, ky] of [[-66, -126], [-52, -150], [-34, -174], [-12, -192], [12, -202]] as const)
      cr(2.4, 0.5, 0.3, (c) => {
        c.moveTo(X(kx - 5), y + ky + 4);
        c.quadraticCurveTo(X(kx + 1), y + ky - 4, X(kx + 7), y + ky + 4);
      });
    // the brow, the deep eye socket, the snout's nostril, the grin's corner
    cr(5, 0.7, 0.45, (c) => {
      c.moveTo(X(88), y - 200);
      c.quadraticCurveTo(X(104), y - 204, X(118), y - 190);
    });
    ctx.fillStyle = '#020308';
    ctx.beginPath();
    ctx.ellipse(X(104), y - 192, 6, 4.6, dir * 0.25, 0, P2);
    ctx.fill();
    ctx.fillStyle = 'rgba(210,220,245,0.35)';
    ctx.beginPath();
    ctx.arc(X(102), y - 193.5, 1.4, 0, P2);
    ctx.fill();
    ctx.fillStyle = '#020308';
    ctx.beginPath();
    ctx.ellipse(X(129), y - 172, 2.6, 2, 0, 0, P2);
    ctx.fill();
    cr(2.6, 0.5, 0.3, (c) => {
      c.moveTo(X(86), y - 184);
      c.quadraticCurveTo(X(96), y - 164, X(112), y - 160);
    });
    cr(3, 0.45, 0.3, (c) => {
      c.moveTo(X(70), y - 130);
      c.quadraticCurveTo(X(60), y - 106, X(64), y - 84);
    });
    // washed pale where the rain sheets over its tops, crusted black in the lee, streaks down every edge
    const wash = ctx.createLinearGradient(0, y - 190, 0, y);
    wash.addColorStop(0, 'rgba(220,230,250,0.1)');
    wash.addColorStop(1, 'rgba(220,230,250,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    lay(ctx, noiseMask(5, 41 + x, { cover: 0.42, soft: 0.25, col: '#020308', w: 64, h: 64 }), box, 0.26);
    for (const [sx, sy] of [[-60, -130], [-36, -170], [-6, -196], [26, -200], [96, -160]] as const) streaks(ctx, r, X(sx), y + sy, 8, 80 + Math.abs(sx), '#02040a', 0.3, 2);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rgba(r() < 0.75 ? '#7a8a6a' : '#a08060', 0.18 + r() * 0.2);
      ctx.beginPath();
      ctx.ellipse(X(-64 + r() * 120), y - 20 - r() * 150, 1.4 + r() * 3.2, 1 + r() * 2.2, r() * 3, 0, P2);
      ctx.fill();
    }
    dots(ctx, box, (px, py) => {
      const u = ((px - x) * dir) / 140;
      return 0.45 * smooth(0.2, 1, (py - (y - 180)) / 180) * smooth(-0.2, 0.8, u);
    }, '#02040a', { step: 5, angle: 0.79, a: 0.3, floor: 0.08 });
  });
  innerEdge(ctx, s.body, 'rgba(2,4,10,0.5)', 8, 0, -7);
  // the ear, the tongue lolling out of the grin (the rain runs off its tip), the teeth
  solid(ctx, s.ear, box, STONE, shade(stone, -0.12), { depth: 0.05, line: 2, formSize: 8 });
  within(ctx, s.ear, () =>
    cr(2, 0.5, 0.3, (c) => {
      c.moveTo(X(92), y - 216);
      c.quadraticCurveTo(X(84), y - 234, X(72), y - 248);
    }),
  );
  ctx.fillStyle = '#05060c';
  ctx.beginPath();
  ctx.moveTo(X(134), y - 170);
  ctx.lineTo(X(112), y - 160);
  ctx.lineTo(X(120), y - 152);
  ctx.closePath();
  ctx.fill();
  for (const [fx, fy] of [[126, -168], [118, -164]] as const) {
    ctx.fillStyle = '#8a92a4';
    ctx.beginPath();
    ctx.moveTo(X(fx - 2.4), y + fy);
    ctx.lineTo(X(fx + 2.4), y + fy);
    ctx.lineTo(X(fx), y + fy + 6);
    ctx.fill();
  }
  solid(ctx, s.tongue, box, STONE, shade(stone, 0.04), { depth: 0.05, line: 1.8, formSize: 5 });
  within(ctx, s.tongue, () => {
    ctx.strokeStyle = 'rgba(4,6,12,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(X(122), y - 152);
    ctx.quadraticCurveTo(X(140), y - 140, X(145), y - 124);
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,230,255,0.4)';
    ctx.fillRect(Math.min(X(126), X(144)), y - 150, 14, 1.2);
  });
  // the near foreleg, its shadow on the body, its claws over the pedestal's edge
  within(ctx, s.body, () => castShadow(ctx, s.leg, 8, 8, 0.5, '#02040a'));
  solid(ctx, s.leg, box, STONE, shade(stone, 0.06), { depth: 0.05, line: 2.8, formSize: 20 });
  within(ctx, s.leg, () => {
    cr(2.6, 0.42, 0.3, (c) => {
      c.moveTo(X(54), y - 116);
      c.quadraticCurveTo(X(72), y - 90, X(68), y - 60);
    });
    streaks(ctx, r, X(62), y - 116, 18, 110, '#02040a', 0.28, 3);
  });
  for (let k = 0; k < 4; k++) {
    const cx = X(58 + k * 10);
    const claw: PathFn = (c) => {
      c.beginPath();
      c.moveTo(cx - 4 * dir, y - 1);
      c.quadraticCurveTo(cx + 5 * dir, y - 2, cx + 4 * dir, y + 9);
      c.quadraticCurveTo(cx + 2 * dir, y + 12, cx, y + 7);
      c.quadraticCurveTo(cx - 1 * dir, y + 2, cx - 4 * dir, y - 1);
      c.closePath();
    };
    solid(ctx, claw, { x: cx - 6, y: y - 4, w: 12, h: 17 }, STONE, shade(stone, -0.12), { depth: 0.05, line: 1.4, formSize: 4 });
  }
  // the moon's cold edge on its back and head; the searchlight's white on the right one's side facing it
  innerEdge(ctx, s.body, 'rgba(170,190,236,0.32)', 5, 5 * -dir, 2);
  innerEdge(ctx, s.ear, 'rgba(170,190,236,0.3)', 3, 3 * -dir, 1);
  if (dir < 0) {
    innerEdge(ctx, s.body, 'rgba(230,236,255,0.25)', 8, -4, 5, 'lighter');
    innerEdge(ctx, s.wing, 'rgba(230,236,255,0.2)', 6, -3, 4, 'lighter');
  }
  // wet: a sheen along the tops
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(160,180,220,0.18)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(X(-56), y - 136);
  ctx.bezierCurveTo(X(-44), y - 160, X(-30), y - 186, X(-6), y - 198);
  ctx.moveTo(X(-6), y - 158);
  ctx.bezierCurveTo(X(-30), y - 200, X(-56), y - 236, X(-92), y - 256);
  ctx.stroke();
  ctx.restore();
}

/** Each grotesque's layer: the statue, its pedestal, its shadow and reflection on the ledge (clear of the sign's and
 * the searchlight's moving pieces above). */
const grotBox = (x: number, dir: number) => ({ x: dir > 0 ? x - 144 : x - 158, y: GH.ped.top - 276, w: 296, h: GH.ped.base + 44 - (GH.ped.top - 276) });

/** The loose slate on the mansard (painted in the still; live, a sprite a stomp sends sliding off). */
export const TILE = { x: 1546, y: 414, w: 16, h: 8 };
function tilePaint(c: Ctx, x: number, y: number): void {
  const p = polyPath([[x - TILE.w / 2, y - TILE.h / 2], [x + TILE.w / 2, y - TILE.h / 2 + 1], [x + TILE.w / 2 - 1, y + TILE.h / 2], [x - TILE.w / 2 + 1, y + TILE.h / 2]]);
  c.fillStyle = '#4a5468';
  p(c);
  c.fill();
  c.fillStyle = 'rgba(210,222,246,0.4)';
  c.fillRect(x - TILE.w / 2, y - TILE.h / 2, TILE.w, 1.2);
  ink(c, p, 1.2, INK, 0.3);
}

// ——— the skyline caught by lightning (live only, added): every far edge rimmed cold white ———

const LIT_BOX = { x: 0, y: CLK.needle - 8, w: W, h: 700 - CLK.needle + 8 };
function skylineLit(ctx: Ctx): void {
  ctx.save();
  ctx.lineJoin = 'round';
  const rimOf = (p: PathFn, w: number, a: number) => {
    ctx.save();
    p(ctx);
    ctx.clip();
    ctx.strokeStyle = `rgba(214,226,255,${a})`;
    ctx.lineWidth = w * 2;
    p(ctx);
    ctx.stroke();
    ctx.fillStyle = `rgba(150,170,230,${a * 0.14})`;
    ctx.fill();
    ctx.restore();
  };
  for (const t of ROW3) rimOf(towerPath(t, 760), 2, 0.5);
  for (const t of ROW2) rimOf(towerPath(t, 760), 2.6, 0.75);
  rimOf(clockPath, 3, 0.85);
  rimOf(cathPath, 3, 0.85);
  // the flash comes from above and behind: the tops and crowns caught, the walls fading into the dark below them
  ctx.globalCompositeOperation = 'destination-in';
  vfill(ctx, 0, LIT_BOX.y, W, LIT_BOX.h, [[0, 'rgba(0,0,0,1)'], [(440 - LIT_BOX.y) / LIT_BOX.h, 'rgba(0,0,0,1)'], [(580 - LIT_BOX.y) / LIT_BOX.h, 'rgba(0,0,0,0.15)'], [1, 'rgba(0,0,0,0)']]);
  ctx.globalCompositeOperation = 'source-over';
  // the fog below them catches it too
  vfill(ctx, 0, 470, W, 220, [[0, 'rgba(170,190,240,0)'], [0.5, 'rgba(170,190,240,0.1)'], [1, 'rgba(170,190,240,0)']]);
  // the nearer things stand dark in front: the neighbours, the water tower, the sign, the bridge
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  ctx.fillRect(-10, GH.midL.roof - 28, GH.midL.x1 + 40, 800);
  ctx.fillRect(GH.tank.x - 70, GH.skyH, 140, 200);
  ctx.fillRect(SG.x0 - 6, SG.y0 - 6, SG.x1 - SG.x0 + 12, 100);
  ctx.fillRect(GH.midR.x0 - 10, GH.midR.ridge - 2, W, 800);
  for (const cx of GH.chimneys) ctx.fillRect(cx - 24, 310, 48, 100);
  ctx.fillRect(LAMP.x - 90, LAMP.y - 60, 180, 120);
  ctx.fillRect(BR.x0, DECK - 1, BR.x1 - BR.x0, 12);
  ctx.fillRect(BR.x0, TRUSS_TOP - 2, BR.x1 - BR.x0, 4);
  ctx.restore();
}

// ——— finishing ———

function shadeOver(ctx: Ctx): void {
  // the HUD's corner calm, the lanes calm, the storm's vignette
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(2,4,10,0.4)');
  g.addColorStop(1, 'rgba(2,4,10,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
  calmLanes(ctx, 0.14, '#02040c', 140, 640);
  vfill(ctx, 0, 0, W, 120, [[0, 'rgba(2,3,8,0.4)'], [1, 'rgba(2,3,8,0)']]);
  vignetteAll(ctx, 0.62, '#010208', 0.5);
}

// ——— the stack ———

export const GOTHAM: SceneSpec = {
  id: 'gotham',
  info: {
    name: 'Goth-Ham Rooftops',
    subtitle: 'Waves 61–64 · with Batpeel',
    ambient: [],
    glows: [],
    light: '#b8c8f0',
    tableTint: '#e8ecff',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: TY }, draw: sky },
    { id: 'storm', box: SKY_BOX, liveOnly: true, res: 0.4, draw: stormSky },
    { id: 'scud', box: SCUD_BOX, motion: 'sprite', res: 0.5, draw: scud },
    // the bolts and the clouds lit from inside: behind the skyline
    { id: 'skyLive', box: SKY_BOX, motion: 'slot', draw: () => {} },
    { id: 'far', box: FAR_BOX, draw: farCity },
    { id: 'clockTop', box: CLOCK_TOP_BOX, draw: (c) => clipAbove(c, CLOCK_TOP_BOX, () => clockTower(c)) },
    { id: 'cathTop', box: CATH_TOP_BOX, draw: (c) => clipAbove(c, CATH_TOP_BOX, () => cathedral(c)) },
    { id: 'train', box: TRAIN_SLOT, motion: 'slot', draw: () => {} },
    { id: 'bridge', box: BRIDGE_BOX, draw: bridge },
    { id: 'midL', box: MIDL_BOX, draw: midLeft },
    { id: 'midR', box: MIDR_BOX, draw: midRight },
    { id: 'tileStill', box: { x: TILE.x - 12, y: TILE.y - 10, w: 24, h: 20 }, stillOnly: true, draw: (c) => tilePaint(c, TILE.x, TILE.y) },
    { id: 'neonStill', box: SIGN_LIT_BOX, stillOnly: true, draw: (c) => neonTubes(c, 'lit', null, DUD) },
    { id: 'neonLit', box: SIGN_LIT_BOX, liveOnly: true, draw: (c) => neonTubes(c, 'lit', null, DUD) },
    { id: 'neonDud', box: SIGN_LIT_BOX, liveOnly: true, draw: (c) => neonTubes(c, 'lit', DUD) },
    { id: 'lampHead', box: LAMP_BOX, motion: 'sprite', draw: (c) => lampHead(c, LAMP_REST, 0.6) },
    { id: 'table', box: { x: 0, y: TY - 4, w: W, h: 1080 - TY + 4 }, draw: table },
    { id: 'grotL', box: grotBox(GH.gargs[0].x, GH.gargs[0].dir), draw: (c, r) => grotesque(c, r, GH.gargs[0].x, GH.gargs[0].dir) },
    { id: 'grotR', box: grotBox(GH.gargs[1].x, GH.gargs[1].dir), draw: (c, r) => grotesque(c, r, GH.gargs[1].x, GH.gargs[1].dir) },
    { id: 'skylineLit', box: LIT_BOX, liveOnly: true, res: 0.5, draw: skylineLit },
    { id: 'beamStill', stillOnly: true, draw: beamStill },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  shade: shadeOver,
};


// ——— live: textures and frame painters ———

/** A tile of falling rain (seamless both ways): n streaks slanting `slant` px across per px down, of lengths len0 +
 * lenV, in three brightnesses (a few catch the light). */
function rainTile(c: Ctx, w: number, h: number, n: number, len0: number, lenV: number, slant: number, lw: number, a: number, seed: number): void {
  const r = rng(seed);
  c.lineCap = 'round';
  for (const [share, col, k] of [[0.6, '150,168,204', 0.55], [0.3, '190,204,236', 0.8], [0.1, '230,238,255', 1]] as const) {
    c.strokeStyle = `rgba(${col},${a * k})`;
    c.lineWidth = lw * (0.7 + k * 0.4);
    c.beginPath();
    for (let i = 0; i < n * share; i++) {
      const x = r() * w;
      const y = r() * h;
      const len = len0 + r() * lenV;
      for (const dx of [-w, 0, w])
        for (const dy of [-h, 0, h]) {
          c.moveTo(x + dx, y + dy);
          c.lineTo(x + dx + len * slant, y + dy + len);
        }
    }
    c.stroke();
  }
}

/** Gust veils: soft slanting bands of denser rain, seamless, to sweep over the streaks. */
function veilTile(c: Ctx, w: number, h: number, slant: number): void {
  const r = rng(808);
  for (let i = 0; i < 5; i++) {
    const x = r() * w;
    const bw = 30 + r() * 70;
    for (const dx of [-w, 0, w]) {
      c.save();
      c.translate(x + dx, 0);
      c.transform(1, 0, slant, 1, 0, 0);
      const g = c.createLinearGradient(-bw, 0, bw, 0);
      g.addColorStop(0, 'rgba(170,186,220,0)');
      g.addColorStop(0.5, `rgba(170,186,220,${0.1 + r() * 0.08})`);
      g.addColorStop(1, 'rgba(170,186,220,0)');
      c.fillStyle = g;
      c.fillRect(-bw - h, 0, bw * 2 + h, h);
      c.restore();
    }
  }
}

const SPLASH = { w: 40, h: 26, n: 8 };
/** A raindrop's crown on wet stone (frame i, played once): a cup rising and breaking into droplets, a ring spreading.
 * The surface at (w/2, h - 5). */
function splashFrame(c: Ctx, i: number): void {
  const u = (i + 0.5) / SPLASH.n;
  const cx = SPLASH.w / 2;
  const sy = SPLASH.h - 5;
  c.strokeStyle = `rgba(190,204,250,${(0.55 * (1 - u)).toFixed(3)})`;
  c.lineWidth = 1.2;
  c.beginPath();
  c.ellipse(cx, sy, 3 + u * 15, 1 + u * 3.2, 0, 0, P2);
  c.stroke();
  if (u < 0.45) {
    const hh = Math.sin((u / 0.45) * Math.PI) * 8;
    c.fillStyle = 'rgba(200,214,255,0.55)';
    c.beginPath();
    c.moveTo(cx - 5 - u * 6, sy);
    c.lineTo(cx - 3 - u * 8, sy - hh);
    c.lineTo(cx + 3 + u * 8, sy - hh);
    c.lineTo(cx + 5 + u * 6, sy);
    c.closePath();
    c.fill();
  }
  for (let k = 0; k < 6; k++) {
    const a = Math.PI * (0.12 + (k / 5) * 0.76);
    const v = 10 + (k % 3) * 3;
    const t = u * 1.2;
    const x = cx - Math.cos(a) * v * t * 1.3;
    const y = sy - Math.sin(a) * v * t * 1.6 + t * t * 14;
    if (y > sy) continue;
    c.fillStyle = `rgba(214,226,255,${(0.8 * (1 - u)).toFixed(3)})`;
    c.beginPath();
    c.arc(x, y, 1.3 - u * 0.5, 0, P2);
    c.fill();
  }
}

/** A ripple ring on a puddle (the live code scales and fades it). */
function ringTex(c: Ctx): void {
  c.strokeStyle = 'rgba(200,214,250,0.8)';
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(32, 16, 28, 12, 0, 0, P2);
  c.stroke();
  c.strokeStyle = 'rgba(200,214,250,0.3)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.ellipse(32, 16, 20, 8, 0, 0, P2);
  c.stroke();
}

const STREAM = { w: 90, h: 280, n: 12, k: 0.5 };
/** One frame of a spout gargoyle's stream (phase 0…1 loops), from its mouth at the top left (6, 4), thrown out to the
 * right and falling: a glassy rope with lit beads running down it that breaks up into drops and thins to spray as it
 * falls into the fog. */
function streamFrame(c: Ctx, ph: number): void {
  c.save();
  c.scale(STREAM.k, STREAM.k);
  const path = (t: number): [number, number] => [6 + 46 * (1 - (1 - t) ** 2) + t * 6, 4 + t * t * (STREAM.h - 20)];
  // the rope: drawn as a ribbon of segments, thinning and fading with the fall
  for (let i = 0; i < 40; i++) {
    const t0 = i / 40;
    const t1 = (i + 1) / 40;
    if (t0 > 0.85) break;
    const [x0, y0] = path(t0);
    const [x1, y1] = path(t1);
    const a = 0.55 * (1 - t0 / 0.85);
    c.strokeStyle = `rgba(170,190,226,${a.toFixed(3)})`;
    c.lineWidth = 5 * (1 - t0 * 0.8);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
    c.strokeStyle = `rgba(236,242,255,${(a * 0.8).toFixed(3)})`;
    c.lineWidth = 1.4 * (1 - t0 * 0.8);
    c.beginPath();
    c.moveTo(x0 - 1, y0);
    c.lineTo(x1 - 1, y1);
    c.stroke();
  }
  // beads of light running down the rope, then drops breaking away below it
  let s = 41;
  const rr = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let j = 0; j < 22; j++) {
    const t = (rr() + ph) % 1;
    const [x, y] = path(t);
    const spread = t > 0.45 ? (t - 0.45) * 40 : 0;
    const dx = (rr() - 0.5) * spread;
    const a = t < 0.45 ? 0.8 : 0.7 * (1 - (t - 0.45) / 0.55);
    const len = 4 + t * 16;
    c.strokeStyle = `rgba(226,236,255,${a.toFixed(3)})`;
    c.lineWidth = t < 0.45 ? 2.4 : 1.6;
    c.beginPath();
    c.moveTo(x + dx, y - len);
    c.lineTo(x + dx, y);
    c.stroke();
  }
  c.restore();
}

const STEAM_F = { w: 120, h: 240 };

/** The searchlight's beam: a long cone, hot at the lens, dust and rain in it (along +x from (0, h/2)). */
function beamTex(c: Ctx, w: number, h: number, spread: number): void {
  const cone = (k: number) => {
    c.beginPath();
    c.moveTo(0, h / 2 - 5 * k);
    c.lineTo(w, h / 2 - spread * k);
    c.lineTo(w, h / 2 + spread * k);
    c.lineTo(0, h / 2 + 5 * k);
    c.closePath();
  };
  for (const [k, a] of [[1, 0.16], [0.7, 0.2], [0.38, 0.3]] as const) {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, `rgba(255,250,228,${Math.min(1, a * 2.4)})`);
    g.addColorStop(0.2, `rgba(246,246,230,${a})`);
    g.addColorStop(1, `rgba(230,236,240,${a * 0.3})`);
    c.fillStyle = g;
    cone(k);
    c.fill();
  }
  c.save();
  cone(0.95);
  c.clip();
  // the rain caught in it: fine slanting streaks, brightest near the lens
  const r = rng(515);
  c.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = 0.5 * (1 - x / w) * (0.4 + r() * 0.6);
    c.strokeStyle = `rgba(255,255,250,${a.toFixed(3)})`;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 3, y + 10);
    c.stroke();
  }
  c.restore();
}

/** The signal: a disc of light thrown on the cloud base, broken by the cloud, with the slice silhouetted in it. */
function signalTex(c: Ctx, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  c.save();
  c.scale(1, h / w);
  const g = c.createRadialGradient(cx, cx, 4, cx, cx, w / 2);
  g.addColorStop(0, 'rgba(255,250,226,0.9)');
  g.addColorStop(0.7, 'rgba(246,240,214,0.8)');
  g.addColorStop(0.84, 'rgba(255,252,236,0.95)');
  g.addColorStop(0.92, 'rgba(230,226,210,0.35)');
  g.addColorStop(1, 'rgba(230,226,210,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(cx, cx, w / 2, 0, P2);
  c.fill();
  c.restore();
  // the cloud's texture breaking it up
  c.globalCompositeOperation = 'destination-out';
  c.drawImage(noiseMask(6, 99, { cover: 0.4, soft: 0.5, col: '#000000', w: 64, h: 40 }), 0, 0, w, h);
  // the slice: a crust's curve across the top, its point down, three pepperoni holes letting the light through
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = '#000';
  const sw = w * 0.24;
  const sh = h * 0.6;
  c.beginPath();
  c.moveTo(cx - sw, cy - sh * 0.46);
  c.quadraticCurveTo(cx, cy - sh * 0.66, cx + sw, cy - sh * 0.46);
  c.lineTo(cx + sw * 0.86, cy - sh * 0.26);
  c.lineTo(cx, cy + sh * 0.54);
  c.lineTo(cx - sw * 0.86, cy - sh * 0.26);
  c.closePath();
  c.fill();
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(250,244,220,0.7)';
  for (const [px, py, pr] of [[-0.32, -0.1, 0.13], [0.26, -0.04, 0.11], [-0.02, 0.2, 0.09]] as const) {
    c.beginPath();
    c.ellipse(cx + px * sw * 1.6, cy + py * sh, pr * sw * 1.6, pr * sh * 0.9, 0, 0, P2);
    c.fill();
  }
  c.fillStyle = 'rgba(250,244,220,0.5)';
  c.fillRect(cx - sw * 0.86, cy - sh * 0.34, sw * 1.72, sh * 0.05);
}

const TRAIN = { w: 300, h: 26, cars: 3 };
/** The elevated train: three cars, dark steel, a moonlit roof line, lit windows (`lit` paints only the windows'
 * light and the headlamp, for an additive copy). Running to the right. */
function trainTex(c: Ctx, lit: boolean): void {
  const cw = TRAIN.w / TRAIN.cars;
  for (let i = 0; i < TRAIN.cars; i++) {
    const x = i * cw + 2;
    const body = rectPath(x, 4, cw - 6, TRAIN.h - 8);
    if (!lit) {
      const g = c.createLinearGradient(0, 4, 0, TRAIN.h - 4);
      g.addColorStop(0, '#3a4456');
      g.addColorStop(0.3, '#1e2430');
      g.addColorStop(1, '#0a0c12');
      c.fillStyle = g;
      body(c);
      c.fill();
      c.fillStyle = 'rgba(200,214,240,0.5)';
      c.fillRect(x, 4, cw - 6, 1.2);
      ink(c, body, 1.2, INK, 0.2);
      c.fillStyle = '#05060a';
      for (const wx of [x + 10, x + cw - 22]) c.fillRect(wx, TRAIN.h - 5, 10, 4);
    }
    for (let k = 0; k < 6; k++) {
      const wx = x + 8 + k * ((cw - 20) / 6);
      c.fillStyle = lit ? (k % 4 === 2 ? 'rgba(255,200,120,0.4)' : 'rgba(255,214,140,0.95)') : '#5a4430';
      c.fillRect(wx, 9, 7, 6);
    }
  }
  if (lit) {
    const g = c.createRadialGradient(TRAIN.w - 4, 14, 0, TRAIN.w - 4, 14, 8);
    g.addColorStop(0, 'rgba(255,250,220,1)');
    g.addColorStop(1, 'rgba(255,250,220,0)');
    c.fillStyle = g;
    c.fillRect(TRAIN.w - 12, 6, 12, 16);
  }
}

/** The searchlight's beam and its signal for the still (live, they're sprites that swing). */
function beamStill(ctx: Ctx): void {
  const aim = LAMP_REST;
  const ca = Math.cos(aim);
  const sa = Math.sin(aim);
  const lx = LAMP.x + ca * 40;
  const ly = LAMP.y + sa * 40;
  const len = (ly - GH.signal.y) / -sa;
  const [bc, bg] = makeCanvas(512, 160);
  beamTex(bg, 512, 160, 70);
  const [sc, sg] = makeCanvas(256, 150);
  signalTex(sg, 256, 150);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(aim);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(bc, 0, -80, len, 160);
  ctx.restore();
  const stretch = Math.min(1.9, Math.max(1, 1 / Math.max(0.35, -sa)));
  ctx.globalAlpha = 0.55;
  ctx.drawImage(sc, GH.signal.x - 128 * 0.62 * stretch, GH.signal.y - 75 * 0.62, 256 * 0.62 * stretch, 150 * 0.62);
  ctx.restore();
  lightPool(ctx, GH.signal.x, GH.signal.y, 220, 110, '#f0f0e0', 0.18);
  lightPool(ctx, lx, ly, 50, 50, '#fff6d8', 0.6);
}

// ——— live ———

registerKitScene(GOTHAM, (k, wave0) => {
  const fx = k.slot('fx');
  const skyL = k.slot('skyLive');
  const trainL = k.slot('train');
  const B = Phaser.BlendModes;
  const flashes = () => save.settings.flashes && !save.settings.reducedMotion;
  let target = waveK(wave0);
  let shown = target;
  const C = Phaser.Display.Color;
  const tint = (a: number, b: number, t: number) => {
    const c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.round(Phaser.Math.Clamp(t, 0, 1) * 100));
    return C.GetColor(c.r, c.g, c.b);
  };

  // ——— the sky: the storm lid over the moon, the scud drifting across it
  const storm = k.sprite('storm');
  const scudImg = k.sprite('scud');
  const moonGlow = k.glow(GH.moon.x, GH.moon.y, 160, 0xc8d8ff, 0, { into: skyL });
  const stormW = k.wash(0x7a88b0, 0, B.MULTIPLY, fx);

  // ——— the lightning: a fork behind the skyline, the cloud lit from inside, the skyline caught cold white
  const BK = 0.6;
  const boltKey = sheet(k, 'gh_bolt', BOLT.w * BK, BOLT.h * BK, BOLT.n, (c, _p, i) => {
    c.scale(BK, BK);
    boltFrame(c, BOLT.w, BOLT.h, i);
  });
  const boltImg = k.img(boltKey, 0, -24, { into: skyL, origin: [0.5, 0], scale: 0.88 / BK, alpha: 0, add: true });
  const cloudLit = k.glow(0, 120, 300, 0xc8d4ff, 0, { into: skyL, sy: 0.55 });
  const skyLitImg = k.sprite('skylineLit').setBlendMode(B.ADD);
  const flash = k.glow(960, 120, 1100, 0xb8c8ff, 0, { into: fx, sy: 0.42 });
  let strikeT = -1;
  let strikeP: number[] = [];
  let nextStrike = 3 + crand() * 4;

  // ——— the train on the bridge
  const trainKey = k.tex('gh_train', TRAIN.w, TRAIN.h, (c) => trainTex(c, false));
  const trainLitKey = k.tex('gh_trainLit', TRAIN.w, TRAIN.h, (c) => trainTex(c, true));
  const train = k.img(trainKey, 0, DECK - TRAIN.h + 4, { into: trainL, origin: [0, 0], scale: 0.62 });
  const trainLit = k.img(trainLitKey, 0, DECK - TRAIN.h + 4, { into: trainL, origin: [0, 0], scale: 0.62, add: true });
  const TW = TRAIN.w * 0.62;
  let trainX = -9999;
  let nextTrain = 6 + crand() * 10;

  // ——— steam off the chimneys and the roof vent (behind the rain)
  const steamKey = sheet(k, 'gh_steam', STEAM_F.w / 2, STEAM_F.h / 2, 12, (c, ph) => {
    c.scale(0.5, 0.5);
    steamFrame(c, STEAM_F.w, STEAM_F.h, ph, { lit: '#c4d0e6', body: '#8a96ac', shade: '#2a3244', a: 0.75, n: 7, lean: 0.6, seed: 5 });
  });
  const steams = [
    ...GH.chimneys.map((x, i) => new Loop(k, steamKey, 12, x + (i ? 8 : -8), CHIMNEY_TOP - 18, { into: fx, origin: [0.5, 1], scale: 2 * (0.75 + i * 0.1), fps: 3 + i * 0.5, phase: i * 6 })),
    new Loop(k, steamKey, 12, VENT.x, VENT.y - 34, { into: fx, origin: [0.5, 1], scale: 1.2, fps: 3.6, phase: 3 }),
  ];

  // ——— the neighbours' windows flicking on and off, the dormers lit now and then
  const winKey = k.tex('gh_win', 24, 40, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 40);
    g.addColorStop(0, 'rgba(255,224,160,1)');
    g.addColorStop(1, 'rgba(255,170,80,0.95)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 40);
    c.lineTo(0, 12);
    c.quadraticCurveTo(0, 0, 12, -3);
    c.quadraticCurveTo(24, 0, 24, 12);
    c.lineTo(24, 40);
    c.fill();
    c.fillStyle = 'rgba(60,30,20,0.7)';
    c.fillRect(11, 4, 2, 36);
    c.fillRect(0, 22, 24, 2);
  });
  const dormKey = k.tex('gh_dorm', 18, 22, (c) => {
    c.fillStyle = 'rgba(255,214,140,0.95)';
    c.fillRect(0, 0, 18, 22);
    c.fillStyle = 'rgba(60,30,20,0.7)';
    c.fillRect(8, 0, 2, 22);
    c.fillRect(0, 10, 18, 2);
  });
  const wins = [
    ...FLICK.map(([x, y, w, h]) => ({ img: k.img(winKey, x, y, { into: fx, origin: [0, 0], sx: w / 24, sy: h / 40, alpha: 0 }), on: crand() < 0.5, lv: 0, t: 2 + crand() * 10 })),
    ...DORMERS.map((dx) => ({ img: k.img(dormKey, dx - 9, GH.midR.ridge + 18, { into: fx, origin: [0, 0], alpha: 0 }), on: false, lv: 0, t: 4 + crand() * 8 })),
  ];

  // ——— the neon: the sign buzzing, its dud Z stuttering; its red on the wet stone
  const neon = k.sprite('neonLit').setBlendMode(B.ADD);
  const dud = k.sprite('neonDud').setBlendMode(B.ADD);
  fx.add(neon);
  fx.add(dud);
  const neonGlow = k.glow((SG.x0 + SG.x1) / 2, (SG.y0 + SG.y1) / 2, 200, 0xff3048, 0.3, { into: fx, sy: 0.45 });
  const neonSpill = k.glow(380, TY + 30, 360, 0xff3048, 0.1, { into: fx, sy: 0.12 });
  let dudT = -1;
  let dudNext = 1.5 + crand() * 3;

  // ——— the searchlight: the drum on its spring, the beam through the rain, the slice on the cloud base
  const head = k.pivot(k.sprite('lampHead'), LAMP.x, LAMP.y);
  const aimSp = new Spring(0, 6, 1.2);
  const beamKey = k.tex('gh_beam', 512, 160, (c) => beamTex(c, 512, 160, 70));
  const beam = k.img(beamKey, LAMP.x, LAMP.y, { into: fx, add: true, origin: [0, 0.5], alpha: 0 });
  const sigKey = k.tex('gh_signal', 256, 150, (c) => signalTex(c, 256, 150));
  const signal = k.img(sigKey, GH.signal.x, GH.signal.y, { into: skyL, add: true, alpha: 0 });
  const sigHalo = k.glow(GH.signal.x, GH.signal.y, 220, 0xf0f0e0, 0, { into: skyL, sy: 0.5 });
  const lens = k.glow(LAMP.x, LAMP.y, 50, 0xfff6d8, 0, { into: fx });
  const beamDrops = new Parts(k, { frame: 'drop', into: fx, add: true, max: 70 });
  const beamRate = new Rate();

  // ——— the rain: three depths of streak sheets, gust veils, splashes on the ledge, ripples in the puddles
  const rainTex = (key: string, n: number, len0: number, lenV: number, slant: number, lw: number, a: number, seed: number) => k.tex(key, 256, 512, (c) => rainTile(c, 256, 512, n, len0, lenV, slant, lw, a, seed));
  const R1 = { key: rainTex('gh_rainFar', 150, 12, 14, 0.16, 1, 0.5, 11), slant: 0.16, speed: 700 };
  const R2 = { key: rainTex('gh_rainMid', 70, 26, 30, 0.2, 1.4, 0.55, 12), slant: 0.2, speed: 1300 };
  const R3 = { key: rainTex('gh_rainNear', 26, 50, 60, 0.24, 2, 0.6, 13), slant: 0.24, speed: 2200 };
  const veilKey = k.tex('gh_veil', 512, 512, (c) => veilTile(c, 512, 512, 0.22));
  const tsp = (key: string, h: number, scale = 1) => {
    const t = k.sc.add.tileSprite(W / 2, h / 2, W, h, key).setAlpha(0);
    t.setTileScale(scale, scale);
    fx.add(t);
    return t;
  };
  const rains = [
    { ...R1, img: tsp(R1.key, TY + 10) },
    { ...R2, img: tsp(R2.key, TY + 30) },
    { ...R2, img: tsp(R2.key, 1080, 1.3), speed: 1600 },
    { ...R3, img: tsp(R3.key, 1080) },
  ];
  const veil = tsp(veilKey, 1080, 1.4);
  const splashKey = sheet(k, 'gh_splash', SPLASH.w, SPLASH.h, SPLASH.n, (c, _p, i) => splashFrame(c, i));
  type Spl = { img: Phaser.GameObjects.Image; t: number; dur: number };
  const spl: Spl[] = Array.from({ length: 60 }, () => ({ img: k.img(splashKey, 0, 0, { into: fx, origin: [0.5, (SPLASH.h - 5) / SPLASH.h] }).setVisible(false), t: -1, dur: 0.3 }));
  const persp = (y: number) => Phaser.Math.Clamp((y - 300) / (GH.front - 300), 0.3, 1);
  const splash = (x: number, y: number, sc = 1) => {
    const s = spl.find((q) => q.t < 0);
    if (!s) return;
    s.t = 0;
    s.dur = 0.24 + crand() * 0.1;
    s.img.setPosition(x, y).setScale(sc * persp(y) * (0.8 + crand() * 0.5)).setVisible(true).setFlipX(crand() < 0.5);
  };
  const splashRate = new Rate();
  const ringKey = k.tex('gh_ring', 64, 32, ringTex);
  type Ring = { img: Phaser.GameObjects.Image; t: number; s: number };
  const rings: Ring[] = Array.from({ length: 24 }, () => ({ img: k.img(ringKey, 0, 0, { into: fx, add: true, alpha: 0 }), t: -1, s: 1 }));
  const ripple = (x: number, y: number, s: number) => {
    const q = rings.find((g) => g.t < 0);
    if (!q) return;
    q.t = 0;
    q.s = s * persp(y);
    q.img.setPosition(x, y);
  };
  const ringRate = new Rate();
  const drops = new Parts(k, { frame: 'drop', into: fx, max: 160 });
  const dripRate = new Rate();
  const ledgeY = (x: number) => (x < 300 || x > 1620 ? GH.ped.base + 6 + crand() * 30 : TY + 10 + crand() * 60);
  /** A drop off the ledge's surface: it splashes where it lands. */
  const dropTo = (x: number, y: number, vx: number, vy: number, floor: number, a = 0.75) =>
    drops.spawn({ x, y, vx, vy, life: 2.2, r0: 2.2 * persp(floor), a, tint: 0xc8d4ff, grav: 1400, streak: 0.012, floor, onFloor: (sx, sy) => splash(sx, sy, 0.9) });

  // ——— the spout gargoyles pouring into the canyon
  const streamKey = sheet(k, 'gh_stream', STREAM.w * STREAM.k, STREAM.h * STREAM.k, STREAM.n, (c, ph) => streamFrame(c, ph));
  const streams = GH.spouts.map((sp, i) => {
    const l = new Loop(k, streamKey, STREAM.n, sp.x + sp.dir * 2, sp.y - 6, { into: fx, origin: [6 / STREAM.w, 4 / STREAM.h], scale: 1 / STREAM.k, fps: 14, phase: i * 5 });
    if (sp.dir < 0) l.each((im) => im.setFlipX(true).setOrigin(1 - 6 / STREAM.w, 4 / STREAM.h));
    return l;
  });

  // ——— the grotesques: drips off their tongues; stomps shake water off their wings
  const tipOf = (g: { x: number; dir: number }) => [g.x + TONGUE_TIP[0] * g.dir, GH.ped.top + TONGUE_TIP[1]] as const;

  // ——— the loose slate on the mansard
  const tileKey = k.tex('gh_tile', 24, 16, (c) => tilePaint(c, 12, 8));
  const tile = k.img(tileKey, TILE.x, TILE.y, { into: fx });
  const tileS = { state: 'sit' as 'sit' | 'slide' | 'fall' | 'gone', x: TILE.x, y: TILE.y, vx: 0, vy: 0, rot: 0, t: 0 };

  // ——— pigeons sheltering on the ledge by the pedestals
  const pigeonKey = sheet(k, 'gh_pigeon', PIGEON.w, PIGEON.h, PIGEON.n, (c, _ph, i) => pigeonFrame(c, i, { body: '#7a8098', wing: '#8e94aa', dark: '#2a2c3a' }));
  type Pg = { img: Phaser.GameObjects.Image; sc: number; x: number; y: number; hx: number; hy: number; state: 'sit' | 'fly' | 'away' | 'land'; vx: number; vy: number; t: number; flap: number; peck: number; dir: number; wait: number };
  const homes: [number, number, number][] = [[284, 792, -1], [322, 788, 1], [1644, 794, 1]];
  const pigeons: Pg[] = homes.map(([x, y, dir]) => {
    const sc = 0.74;
    const img = k.img(pigeonKey, x, y, { into: fx, origin: [PIGEON.fx / PIGEON.w, PIGEON.fy / PIGEON.h], scale: sc, tint: 0xb4bcd8 }).setFlipX(dir < 0);
    return { img, sc, x, y, hx: x, hy: y, state: 'sit', vx: 0, vy: 0, t: crand() * 5, flap: 0, peck: 1 + crand() * 3, dir, wait: 0 };
  });
  const feathers = new Parts(k, { frame: 'flake', into: fx, max: 20 });
  function scare(p: Pg, power: number): void {
    if (p.state !== 'sit') return;
    p.state = 'fly';
    p.dir = p.x < 960 ? -1 : 1;
    p.vx = p.dir * (90 + crand() * 60 + power * 50);
    p.vy = -170 - crand() * 70;
    p.img.setFlipX(p.dir < 0);
    p.t = 0;
    p.flap = crand() * 8;
    for (let n = 0; n < 2; n++) feathers.spawn({ x: p.x + (crand() - 0.5) * 14, y: p.y - 14, vx: (crand() - 0.5) * 60, vy: -30 - crand() * 30, life: 2.2, r0: 3, a: 0.6, tint: 0x9aa0b8, grav: 40, drag: 1.6, spin: (crand() - 0.5) * 8 });
  }

  let wind = 0;
  let gust = 0;
  let gustT = 3;
  const applyWave = (w: number) => {
    const st = smooth(0.15, 0.95, w);
    storm.setAlpha(st);
    stormW.setAlpha(0.3 * smooth(0.2, 1, w));
    moonGlow.setAlpha(0.22 * (1 - st));
    scudImg.setTint(tint(0xc8d0e4, 0x4a5268, st)).setAlpha(0.95 - 0.3 * st);
    return st;
  };
  let st = applyWave(shown);

  return {
    setWave(w) {
      target = waveK(w);
    },
    impact(x, _y, p) {
      // the searchlight's drum jolts on its yoke
      aimSp.v += (x < LAMP.x ? 1 : -1) * (0.25 + p * 0.6);
      // the puddles jump: crowns and drops thrown up round the stomp
      for (let i = 0; i < 8 + p * 22; i++) {
        const sx = Phaser.Math.Clamp(x + (crand() - 0.5) * 560, 20, W - 20);
        const sy = TY + 14 + crand() * (GH.front - TY - 30);
        splash(sx, sy, 2.2);
        for (let j = 0; j < 2; j++) dropTo(sx, sy - 2, (crand() - 0.5) * 200, -180 - crand() * 260 * (0.5 + p), sy + crand() * 10, 0.8);
      }
      for (const [px, py, rx] of PUDDLES) if (Math.abs(px - x) < 600) ripple(px + (crand() - 0.5) * rx, py, 1.6 + p);
      // the grotesques shed the water off their wings and backs, more the nearer the stomp
      for (const g of GH.gargs) {
        const near = 1 - Phaser.Math.Clamp(Math.abs(g.x - x) / 1400, 0, 0.8);
        for (let i = 0; i < (6 + p * 16) * near; i++) {
          const [ex, ey] = WING_EDGE[Math.floor(crand() * WING_EDGE.length)];
          const sx = g.x + ex * g.dir + (crand() - 0.5) * 16;
          dropTo(sx, GH.ped.top + ey, (crand() - 0.5) * 60, -40 - crand() * 80, GH.ped.base + 4 + crand() * 30);
        }
      }
      // the loose slate slides off the mansard
      if (tileS.state === 'sit' && p > 0.25) {
        tileS.state = 'slide';
        tileS.t = 0;
        tileS.vy = 30;
      }
      for (const pg of pigeons) if (p > 0.2 || Math.abs(pg.x - x) < 500) scare(pg, p);
    },
    update(dt, t) {
      shown += (target - shown) * Math.min(1, dt * 0.6);
      st = applyWave(shown);
      const cm = calm();
      // ——— wind: gusts drive the rain harder, more often in the storm
      gustT -= dt;
      if (gustT < 0) {
        gustT = 6 - 3 * st + crand() * 6;
        gust = 1;
      }
      gust = Math.max(0, gust - dt * 0.35);
      const g2 = Math.sin(Math.min(1, gust) * Math.PI);
      wind = 0.3 + 0.7 * st + g2 * 0.5;
      scudImg.x = (Math.sin(t * 0.021 + 1) * 120 + Math.sin(t * 0.05) * 40 * st) * cm;
      // ——— the rain
      const amt = [0.2 + 0.65 * shown, 0.05 + 0.75 * shown, smooth(0.2, 1, shown) * 0.28, smooth(0.35, 1, shown) * 0.4];
      rains.forEach((rl, i) => {
        const v = rl.speed * (1 + g2 * 0.3) * dt * cm;
        rl.img.tilePositionY -= v / rl.img.tileScaleY;
        rl.img.tilePositionX -= (v * rl.slant * (0.8 + wind * 0.3)) / rl.img.tileScaleX;
        rl.img.setAlpha(amt[i] * (0.85 + g2 * 0.15));
      });
      veil.tilePositionY -= (1500 * dt * cm) / 1.4;
      veil.tilePositionX -= (1500 * 0.22 * dt * cm) / 1.4 + dt * 60 * wind;
      veil.setAlpha(smooth(0.3, 1, shown) * (0.35 + g2 * 0.5));
      // splashes on the ledge and the pedestals' caps, ripples in the puddles
      splashRate.tick((8 + 60 * shown) * (1 + g2 * 0.5) * cm, dt, () => {
        const x = crand() * W;
        splash(x, ledgeY(x));
      });
      ringRate.tick((2 + 10 * shown) * cm, dt, () => {
        const [px, py, rx, ry] = PUDDLES[Math.floor(crand() * PUDDLES.length)];
        ripple(px + (crand() - 0.5) * rx * 1.4, py + (crand() - 0.5) * ry, 0.6 + crand() * 0.6);
      });
      for (const s of spl) {
        if (s.t < 0) continue;
        s.t += dt;
        const u = s.t / s.dur;
        if (u >= 1) {
          s.t = -1;
          s.img.setVisible(false);
        } else s.img.setFrame(Math.min(SPLASH.n - 1, Math.floor(u * SPLASH.n)));
      }
      for (const q of rings) {
        if (q.t < 0) continue;
        q.t += dt;
        const u = q.t / 0.9;
        if (u >= 1) {
          q.t = -1;
          q.img.setAlpha(0);
          continue;
        }
        q.img.setScale(q.s * (0.2 + u * 0.9), q.s * (0.2 + u * 0.9)).setAlpha(0.35 * (1 - u));
      }
      // drips off the grotesques' tongues, gathering and falling to the ledge
      dripRate.tick((1 + 3 * shown) * cm, dt, () => {
        const g = GH.gargs[crand() < 0.5 ? 0 : 1];
        const [tx, ty] = tipOf(g);
        dropTo(tx, ty, g.dir * 6, 20, GH.ped.base + 10 + crand() * 16);
      });
      drops.update(dt);
      // the spouts pour harder as it rains harder
      for (const s of streams) {
        s.alpha = 0.45 + 0.55 * shown;
        s.step(dt, (0.8 + shown * 0.6) * cm);
      }
      // ——— steam, leaning with the wind
      for (const s of steams) {
        s.step(dt, cm);
        s.alpha = 0.8 - 0.25 * st;
        s.each((im) => im.setRotation((0.15 + wind * 0.25 + wander(t * 0.3, 3) * 0.05) * cm));
      }
      // ——— lightning: from the third wave, every few seconds at the storm's height
      if (shown > 0.55) {
        nextStrike -= dt;
        if (nextStrike < 0) {
          nextStrike = (shown > 0.9 ? 3 : 7) + crand() * (shown > 0.9 ? 4 : 7);
          strikeT = 0;
          strikeP = [0, 0.12 + crand() * 0.06];
          if (crand() < 0.5) strikeP.push(0.3 + crand() * 0.1);
          const bx = 180 + crand() * 1560;
          boltImg.setFrame(Math.floor(crand() * BOLT.n)).setPosition(bx, -24).setFlipX(crand() < 0.5);
          cloudLit.setPosition(bx, 120);
          k.sc.events.emit('gotham:bolt', crand() < 0.4);
        }
      }
      let fl = 0;
      if (strikeT >= 0) {
        strikeT += dt;
        for (const s0 of strikeP) {
          const u = strikeT - s0;
          if (u >= 0) fl = Math.max(fl, u < 0.07 ? 1 : Math.exp(-(u - 0.07) * 7));
        }
        if (strikeT > 1.6) strikeT = -1;
      }
      const fk = flashes() ? 1 : 0.25;
      boltImg.setAlpha(fl * fk);
      cloudLit.setAlpha(fl * 0.7 * fk);
      skyLitImg.setAlpha(Math.min(1, fl * 0.85) * fk);
      flash.setAlpha(fl * 0.22 * fk);
      // ——— the train: across the bridge now and then, cropped to the span between the portals
      nextTrain -= dt;
      if (nextTrain < 0 && trainX < -1000) {
        trainX = BR.x0 - TW;
        nextTrain = 22 + crand() * 18;
      }
      if (trainX > -1000) {
        trainX += dt * 140 * cm;
        if (trainX > BR.x1 + 10) trainX = -9999;
        const cx0 = Math.max(0, (BR.x0 - trainX) / 0.62);
        const cx1 = Math.min(TRAIN.w, (BR.x1 - trainX) / 0.62);
        for (const im of [train, trainLit]) {
          im.setVisible(cx1 > cx0).setX(trainX).setY(DECK - TRAIN.h * 0.62 + Math.sin(t * 30) * 0.3);
          im.setCrop(cx0, 0, Math.max(0, cx1 - cx0), TRAIN.h);
        }
        trainLit.setAlpha(0.85 + Math.sin(t * 9) * 0.1);
      } else {
        train.setVisible(false);
        trainLit.setVisible(false);
      }
      // ——— windows flicking: someone's up, someone goes to bed
      for (const w of wins) {
        w.t -= dt;
        if (w.t < 0) {
          w.on = !w.on;
          w.t = w.on ? 6 + crand() * 14 : 4 + crand() * 12;
        }
        w.lv += ((w.on ? 1 : 0) - w.lv) * Math.min(1, dt * (w.on ? 3 : 8));
        w.img.setAlpha(w.lv * 0.85 * (1 - 0.25 * st));
      }
      // ——— the neon buzzes; the dud Z stutters out and back
      dudNext -= dt;
      if (dudNext < 0) {
        dudNext = 2 + crand() * 5;
        dudT = 0;
      }
      let dz = 1;
      if (dudT >= 0) {
        dudT += dt;
        dz = [0, 0.8, 0.1, 0, 1, 0, 0.6, 0, 0, 0.9][Math.floor(dudT / 0.09) % 10];
        if (dudT > 1.4) {
          dudT = -1;
          dz = crand() < 0.5 ? 0 : 1;
        }
      }
      const buzz = 0.9 + Math.sin(t * 47) * 0.04 + Math.sin(t * 13) * 0.05;
      neon.setAlpha(buzz);
      dud.setAlpha(dz * buzz * 0.9);
      neonGlow.setAlpha(0.26 * buzz);
      neonSpill.setAlpha(0.08 * buzz * (0.8 + shown * 0.4));
      // ——— the searchlight: on every wave, swinging wider through the rain as the storm builds
      const amp = (0.03 + 0.1 * smooth(0.3, 1, shown)) * cm;
      const aim = LAMP_REST + (0.5 + 0.5 * Math.sin(t * 0.23)) * amp * 1.6 + Math.sin(t * 0.61 + 2) * amp * 0.15 + aimSp.step(0, dt);
      head.rotation = aim - LAMP_REST;
      const ca = Math.cos(aim);
      const sa = Math.sin(aim);
      const lensX = LAMP.x + ca * 40;
      const lensY = LAMP.y + sa * 40;
      const len = Math.max(200, (lensY - GH.signal.y) / Math.max(0.15, -sa));
      beam.setPosition(lensX, lensY).setRotation(aim).setScale(len / 512, 1).setAlpha((0.5 + 0.12 * st) * (0.95 + Math.sin(t * 9) * 0.03));
      const sx = lensX + ca * len;
      const sy = lensY + sa * len;
      const stretch = Phaser.Math.Clamp(1 / Math.max(0.35, -sa), 1, 1.9);
      signal.setPosition(sx, sy).setScale(0.62 * stretch, 0.62).setAlpha(0.55 - 0.15 * st);
      sigHalo.setPosition(sx, sy).setAlpha(0.22 + 0.1 * st);
      lens.setPosition(lensX, lensY).setAlpha(0.85);
      // the rain lit as it falls through the beam
      beamRate.tick((6 + 50 * shown) * cm, dt, () => {
        const u = 0.05 + crand() * 0.6;
        const across = (crand() - 0.5) * 70 * u * 2;
        beamDrops.spawn({ x: lensX + ca * len * u - sa * across, y: lensY + sa * len * u + ca * across, vx: 120 * wind, vy: 900, life: 0.12 + crand() * 0.1, r0: 1.6, a: 0.9, tint: 0xfffbe8, streak: 0.02 });
      });
      beamDrops.update(dt);
      // ——— the slate: slides down the slope, tips off the eave and falls into the canyon; back unseen later
      if (tileS.state === 'slide') {
        tileS.vy += 300 * dt;
        tileS.y += tileS.vy * dt;
        tileS.rot += dt * 0.6;
        if (tileS.y > GH.midR.roof - 6) {
          tileS.state = 'fall';
          tileS.vx = -30 - crand() * 30;
          tileS.vy = 60;
        }
      } else if (tileS.state === 'fall') {
        tileS.vy += 1200 * dt;
        tileS.x += tileS.vx * dt;
        tileS.y += tileS.vy * dt;
        tileS.rot += dt * 9;
        if (tileS.y > 680) {
          tileS.state = 'gone';
          tileS.t = 18 + crand() * 10;
        }
      } else if (tileS.state === 'gone') {
        tileS.t -= dt;
        if (tileS.t < 0) {
          tileS.state = 'sit';
          tileS.x = TILE.x;
          tileS.y = TILE.y;
          tileS.rot = 0;
        }
      }
      tile.setPosition(tileS.x, tileS.y).setRotation(tileS.rot).setAlpha(tileS.state === 'gone' ? 0 : tileS.state === 'fall' ? 1 - smooth(560, 680, tileS.y) : 1);
      // ——— pigeons
      for (const p of pigeons) {
        p.t += dt;
        if (p.state === 'sit') {
          p.peck -= dt;
          let f = Math.floor(p.t * 3) % 4;
          if (p.peck < 0) {
            f = 4 + Math.min(2, Math.floor(-p.peck * 8));
            if (p.peck < -0.4) p.peck = 1.5 + crand() * 3;
          }
          p.img.setFrame(f).setPosition(p.x, p.y).setAlpha(1);
          if (fl > 0.9 && crand() < dt * 2) scare(p, 0.3);
        } else if (p.state === 'fly') {
          p.flap += dt * 16;
          p.img.setFrame(PIGEON.flap0 + (Math.floor(p.flap) % 8));
          p.vy += 50 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const u = Math.min(1, p.t / 1.6);
          p.img.setPosition(p.x, p.y).setScale(p.sc * (1 - u * 0.5)).setAlpha(1 - u * u);
          if (u >= 1) {
            p.state = 'away';
            p.t = 0;
            p.wait = 8 + crand() * 10;
            p.img.setAlpha(0);
          }
        } else if (p.state === 'away') {
          if (p.t > p.wait) {
            p.state = 'land';
            p.t = 0;
          }
        } else {
          const u = Math.min(1, p.t / 1.4);
          const e = 1 - (1 - u) * (1 - u);
          const fx0 = p.hx - p.dir * 180 * (1 - e);
          const fy0 = p.hy - 140 * (1 - e);
          p.img.setPosition(fx0, fy0).setScale(p.sc * (0.5 + 0.5 * e)).setAlpha(Math.min(1, u * 3)).setFrame(u < 0.7 ? PIGEON.glide : PIGEON.flap0 + (Math.floor(p.t * 18) % 8)).setFlipX(p.dir > 0);
          if (u >= 1) {
            p.state = 'sit';
            p.x = p.hx;
            p.y = p.hy;
            p.img.setScale(p.sc);
          }
        }
      }
      feathers.update(dt);
    },
  };
});
