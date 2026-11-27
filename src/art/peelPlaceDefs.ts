// What each place peel's window shows (src/art/peelPlace.ts): the corner of its location's backdrop, the hero motion
// played over it (frame loops painted by the scene's own painters, exported from its scene file), the place's own
// touches each frame, and what happens when a smack lands. Coordinates are the scene's (1920 × 1080 screen px);
// what flies off the peel is sized and sped in peel units (the peel is 220 × 360).

import type { LocationId } from './backdrops';
import { type Ctx, rgba } from './util';
import { flameFrame, steamFrame } from '../game/sceneAnim';
import { FIRE as TR_FIRE, fireFrame as trFire } from '../content/art/scene-trattoria';
import { BULBS as RT_BULBS, RT } from '../content/art/scene-rooftop';
import { BH, CUSP, CUSPS, FLAG, GLIT, SURF, flagFrame, glitterFrame, grade as beachGrade, surfFrame } from '../content/art/scene-beach';
import { ARCH_FOOT, JK, PIL, REC, archFrame, domeGlass, pilasterFrame, recordFrame, tonearm } from '../content/art/scene-diner';
import { FIRE_H as LG_FH, FIRE_W as LG_FW, LG, hearthFrame } from '../content/art/scene-lodge';
import { satellite } from '../content/art/scene-space';
import { GAS, KN, SAUCE_BOX, sauceSurface, spoon } from '../content/art/scene-kitchen';
import { BOLT, WASH, boltFrame, gFrame, garmentFrame, lineY } from '../content/art/scene-oldtown';
import { CX, FLAME, GH, GHOST_N, GW, SHRIEK_N, WARM, ghostFrame } from '../content/art/scene-cellar';
import { GLOBE_F, MP, globe } from '../content/art/scene-metropizza';
import { DL, LIQ, SPEC, SPEC_AT, SPEC_N, VB, cloneFoot, liquidFrame } from '../content/art/scene-doomlab';
import { JH, aurora } from '../content/art/scene-jotunheim';
import { bz } from '../content/art/scene-bifrost';
import { LB, P as LB_P, ppu } from '../content/art/scene-labyrinth';
import { P as TA_P, SOUL, TA, pz } from '../content/art/scene-tartarus';
import { VC, VR, vortexPaint } from '../content/art/scene-oven';
import { FIRE as FP_FIRE, mouthPath as fpMouth } from '../content/art/scene-firstpizzeria';
import { GH as GOTHAM, signalTex } from '../content/art/scene-gotham';
import { HG, surfFrame as hgSurf } from '../content/art/scene-hotgates';
import { fireFrame as lbFire, smokeFrame as rtSmoke } from '../content/art/sceneBits';
import { GULL_CALL, GULL_FH, GULL_FW, GULL_IDLE, PR, gullStandFrame } from '../content/art/scene-pier';
import { BALL_F, RK, ballChain, ballFrame } from '../content/art/scene-rink';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What a place's touches see: its clock, the time since the last smack, the smack's envelope, a cosmetic random,
 *  reduced motion, and somewhere to keep its own state. */
export interface PlaceState {
  t: number;
  sm: number;
  hit(len?: number): number;
  r: () => number;
  calm: number;
  mem: Record<string, number>;
  /** The still (a thumbnail): nothing moving. */
  still: boolean;
}

export type PlaceSpr = 'ember' | 'spark' | 'sparkB' | 'sparkG' | 'sparkV' | 'flake' | 'drop' | 'feather' | 'smoke' | 'steam' | 'sauce' | 'dust' | 'glint' | 'mote' | 'confetti';

/** Throw something off the peel: from scene point (sx, sy), moving (vx, vy) peel units/s, sized s0 → s1 peel units,
 *  living `life` s; gravity in peel units/s² (down the screen). */
export type PlaceEmit = (spr: PlaceSpr, sx: number, sy: number, vx: number, vy: number, s0: number, s1: number, life: number, o?: { grav?: number; drag?: number; a?: number; fin?: number; spin?: number }) => void;

/** Where a loop is drawn this frame: shifted, turned and scaled about a pivot (scene px; the box's centre by
 *  default), faded, flipped. */
export interface LoopAt {
  dx?: number;
  dy?: number;
  rot?: number;
  sc?: number;
  px?: number;
  py?: number;
  a?: number;
  flip?: boolean;
}

export interface LoopDef {
  /** Where its frames go (scene px); paint draws one frame in the box's own coordinates. */
  box: Box;
  n: number;
  fps: number;
  /** Added light (fire, glow) rather than painted over. */
  add?: boolean;
  /** On a smack: how much brighter it flares, and how much faster it runs (negative: backwards). */
  flare?: number;
  rush?: number;
  alpha?: number | ((s: PlaceState) => number);
  /** Which frame to show (fractional) instead of running through them. */
  show?(s: PlaceState): number;
  /** Runs of frames that loop on their own (a gull's idle, its call): the cross-fade wraps within each. */
  segs?: [number, number][];
  /** Where it's drawn this frame (null: hidden). */
  at?(s: PlaceState): LoopAt | null;
  paint(c: Ctx, ph: number, i: number): void;
}

export interface PlaceDef {
  /** The scene's box the window shows: this wide about this centre (its height follows the window's shape). */
  crop: { cx: number; cy: number; w: number };
  /** The bezel's colour (its metal, wood or stone). */
  bezel: string;
  /** Layers left out of the window's base (drawn live instead). */
  skip?: string[];
  /** Layers painted on their own and laid over the loops (in front of the motion), or under them (frontUnder):
   *  these, or every layer after `frontFrom`. */
  front?: string[];
  frontFrom?: string;
  frontUnder?: boolean;
  loops?: LoopDef[];
  /** Touch-ups on the painted base (canvas px per scene px k, the crop). */
  base?(c: Ctx, k: number, crop: Box): void;
  /** Each frame, in scene px: under the loops (and the front, when it's over them), and over everything. */
  under?(g: Ctx, s: PlaceState): void;
  fx?(g: Ctx, s: PlaceState): void;
  /** A smack lands. */
  smack?(s: PlaceState, emit: PlaceEmit): void;
  /** The still's moment (its clock). */
  stillT?: number;
  /** A flash of light over the whole window as a smack lands (its colour, its strength; a soft one by default). */
  flash?: [string, number];
}

const P2 = Math.PI * 2;

/** A soft round glow (added light), in scene px. */
function glow(g: Ctx, x: number, y: number, r: number, col: string, a: number, sy = 1): void {
  if (a <= 0.005) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.translate(x, y);
  g.scale(1, sy);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, rgba(col, Math.min(1, a)));
  gr.addColorStop(0.45, rgba(col, Math.min(1, a) * 0.45));
  gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr;
  g.fillRect(-r, -r, r * 2, r * 2);
  g.restore();
}

/** Rain driving through the window (kept inside it: the window clips it), streaks slanting in the wind. */
function rain(g: Ctx, s: PlaceState, x0: number, y0: number, w: number, h: number, n: number, a: number): void {
  g.save();
  g.strokeStyle = `rgba(206,220,255,${a.toFixed(3)})`;
  g.lineWidth = 1.8;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const u = (s.t * (1.5 + (i % 3) * 0.3) + i * 0.173) % 1;
    const x = x0 + ((i * 97) % w) - u * 60;
    const y = y0 + u * h;
    g.moveTo(x, y);
    g.lineTo(x - 7, y + 26);
  }
  g.stroke();
  g.restore();
}

/** Soft lit specks thrown out from (x, y) inside the window after a smack and falling back (snow, spray, sauce,
 *  sparks): t seconds since the smack, kept inside the window by its clip. */
function burst(g: Ctx, t: number, x: number, y: number, o: { n: number; sp: number; grav: number; life: number; r: number; col: string; add?: boolean; up?: number; seed?: number }): void {
  if (t < 0 || t > o.life) return;
  const k = t / o.life;
  for (let i = 0; i < o.n; i++) {
    const a = -Math.PI / 2 + (((i * 0.618 + (o.seed ?? 0)) % 1) - 0.5) * (o.up ?? 2.4);
    const sp = o.sp * (0.55 + ((i * 0.377) % 1) * 0.6);
    const px = x + Math.cos(a) * sp * t;
    const py = y + Math.sin(a) * sp * t + 0.5 * o.grav * t * t;
    const al = (1 - k) * (1 - k);
    const r = o.r * (0.7 + ((i * 0.53) % 1) * 0.6);
    if (o.add) glow(g, px, py, r * 2, o.col, al);
    else {
      const gr = g.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r);
      gr.addColorStop(0, rgba('#ffffff', al));
      gr.addColorStop(0.45, rgba(o.col, al * 0.9));
      gr.addColorStop(1, rgba(o.col, 0));
      g.fillStyle = gr;
      g.fillRect(px - r, py - r, r * 2, r * 2);
    }
  }
}

/** A white foam burst (soft lit puffs) rising off the water at (x, y) after a smack. */
function foam(g: Ctx, t: number, x: number, y: number, w: number): void {
  if (t < 0 || t > 1.1) return;
  const k = t / 1.1;
  for (let i = 0; i < 7; i++) {
    const px = x + (i / 6 - 0.5) * w * (1 + k * 0.4);
    const py = y - (20 + (i % 3) * 14) * Math.sin(Math.PI * Math.min(1, k * 1.6)) - k * 20;
    const r = 18 + k * 30 + (i % 2) * 8;
    const gr = g.createRadialGradient(px - r * 0.25, py - r * 0.3, 0, px, py, r);
    gr.addColorStop(0, rgba('#ffffff', 0.85 * (1 - k)));
    gr.addColorStop(0.55, rgba('#e8f6ff', 0.45 * (1 - k)));
    gr.addColorStop(1, rgba('#bfe0f0', 0));
    g.fillStyle = gr;
    g.fillRect(px - r, py - r, r * 2, r * 2);
  }
}

/** A fork of lightning from the scene's own painter, its frame faded out at its edges (no hard box round it). */
const bolts = new Map<number, HTMLCanvasElement>();
function boltCanvas(i: number): HTMLCanvasElement {
  let c = bolts.get(i);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = BOLT.w;
  c.height = BOLT.h;
  const x = c.getContext('2d')!;
  boltFrame(x, BOLT.w, BOLT.h, i);
  x.globalCompositeOperation = 'destination-in';
  const gx = x.createLinearGradient(0, 0, BOLT.w, 0);
  gx.addColorStop(0, 'rgba(0,0,0,0)');
  gx.addColorStop(0.2, 'rgba(0,0,0,1)');
  gx.addColorStop(0.8, 'rgba(0,0,0,1)');
  gx.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gx;
  x.fillRect(0, 0, BOLT.w, BOLT.h);
  const gy = x.createLinearGradient(0, 0, 0, BOLT.h);
  gy.addColorStop(0, 'rgba(0,0,0,0)');
  gy.addColorStop(0.08, 'rgba(0,0,0,1)');
  gy.addColorStop(0.85, 'rgba(0,0,0,1)');
  gy.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gy;
  x.fillRect(0, 0, BOLT.w, BOLT.h);
  bolts.set(i, c);
  return c;
}

/** A strike: a bright first stroke, a dip, a return stroke, the glow dying in the cloud (0 when it's over). */
const strike = (t: number): number => (t < 0.08 ? 1 : t < 0.16 ? 0.3 : t < 0.26 ? 0.85 : Math.max(0, 1 - (t - 0.26) / 0.6) * 0.5);

function drawBolt(g: Ctx, s: PlaceState, x: number, y: number): void {
  const a = strike(s.sm);
  if (a <= 0.01) return;
  glow(g, x, y + 140, 320, '#c8d4ff', 0.6 * a, 0.7);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a;
  g.drawImage(boltCanvas((s.mem.bolt ?? 0) % BOLT.n), x - BOLT.w / 2, y);
  g.restore();
}

/** A fire's smack: embers kicked up and out from (x, y) across w, and a puff of smoke. */
function embers(s: PlaceState, emit: PlaceEmit, x: number, y: number, w: number, n = 9, smoke = true): void {
  const k = Math.round(n * (0.5 + 0.5 * s.calm));
  for (let i = 0; i < k; i++) {
    const a = -Math.PI / 2 + (s.r() - 0.5) * 2.2;
    const sp = 200 + s.r() * 180;
    emit('ember', x + (s.r() - 0.5) * w, y + s.r() * 20, Math.cos(a) * sp, Math.sin(a) * sp - 60, 13 + s.r() * 6, 6, 0.45 + s.r() * 0.25, { grav: 300, drag: 1.4, fin: 0.02 });
  }
  if (smoke) emit('smoke', x, y - 60, (s.r() - 0.5) * 30, -90, 34, 80, 0.8, { drag: 2, a: 0.5 });
}

// ════════════════════════════ Act 1 · Opening Night ════════════════════════════

/** Trattoria Nonna: the wood oven's mouth, its fire rolling across the vault, smoke curling up the dome. A smack
 *  makes the fire flare and kicks embers out of the mouth. */
const trattoria: PlaceDef = {
  crop: { cx: 282, cy: 486, w: 360 },
  bezel: '#c08a4a',
  skip: ['ovenFire'],
  loops: [
    { box: { x: TR_FIRE.x, y: TR_FIRE.y, w: TR_FIRE.w, h: TR_FIRE.h }, n: 12, fps: 11, add: true, flare: 1.1, rush: 1.4, paint: (c, ph) => trFire(c, ph) },
    {
      box: { x: 186, y: 134, w: 200, h: 320 },
      n: 10,
      fps: 5,
      alpha: 0.85,
      paint: (c, ph) => steamFrame(c, 200, 320, ph, { a: 0.3, lit: '#d8b8a0', body: '#6a5448', shade: '#2a1a14', lean: 0.25, seed: 3, n: 7 }),
    },
  ],
  fx(g, s) {
    // the coals' glow breathing on the ledge, and the smack's flare lighting the arch
    const br = 0.8 + 0.12 * Math.sin(s.t * 2.1) + 0.08 * Math.sin(s.t * 5.3);
    glow(g, 262, 586, 120, '#ff7a24', 0.16 * br, 0.5);
    glow(g, 280, 540, 190, '#ffc060', 0.85 * s.hit(0.7));
  },
  flash: ['#ffd8a0', 0.45],
  smack: (s, emit) => embers(s, emit, 280, 470, 110),
};

const RT_SMOKE: Box = { x: RT.chimney.x + 4 - 150 * 0.55, y: RT.chimney.y - 40 - 340 * 1.1, w: 165, h: 374 };

/** Rooftop Slice: the chimney stack over the herb boxes, its smoke billowing up and leaning off on the evening breeze,
 *  the festoon bulbs glowing over the skyline. A smack puffs a burst of smoke out of the pots and jolts the bulbs. */
const rooftop: PlaceDef = {
  crop: { cx: 1585, cy: 400, w: 330 },
  bezel: '#a8784a',
  loops: [
    {
      box: RT_SMOKE,
      n: 12,
      fps: 7,
      rush: 2.2,
      alpha: (s) => 0.95 + 0.4 * s.hit(1.2),
      paint: (c, ph) => {
        c.scale(1.1, 1.1);
        rtSmoke(c, 150, 340, ph, { lit: '#fff0d8', body: '#c8bcc0', shade: '#6a6080', wind: 0.55, lobes: 10, a: 0.55 });
      },
    },
  ],
  fx(g, s) {
    // the festoon bulbs, each its own shimmer; a smack jolts them
    const h = s.hit(0.6);
    for (let i = 0; i < RT_BULBS.length; i++) {
      const [x, y] = RT_BULBS[i];
      if (x < 1360 || x > 1820) continue;
      const sh = 0.85 + 0.1 * Math.sin(s.t * 2.1 + i * 1.37) + 0.05 * Math.sin(s.t * 7.3 + i * 4.1) + 0.6 * h;
      const dy = 6 * h * Math.sin(s.sm * 14 + i);
      glow(g, x, y + 13 + dy, 26, '#ffc070', 0.4 * sh);
      glow(g, x, y + 13 + dy, 7, '#fff4d8', 0.75 * sh);
    }
  },
  smack(s, emit) {
    emit('smoke', RT.chimney.x, RT.chimney.y - 50, 20, -90, 34, 90, 1, { drag: 1.6, a: 0.6 });
    emit('smoke', RT.chimney.x + 20, RT.chimney.y - 60, 50, -70, 28, 70, 0.9, { drag: 1.6, a: 0.5 });
    for (let i = 0; i < 4; i++) emit('ember', RT.chimney.x + (s.r() - 0.5) * 30, RT.chimney.y - 50, (s.r() - 0.5) * 120, -200 - s.r() * 120, 12, 6, 0.5, { grav: 200, drag: 1 });
  },
};

// ════════════════════════════ Act 2 · Summer Rush ════════════════════════════

const SURF_BOX: Box = { x: 380, y: SURF.y0, w: 440, h: SURF.h };

/** Shack Attack Beach Bar: the surf rolling up the sand under the low sun, the glitter on the sea, the sandcastle's
 *  flag fluttering. A smack sends a surge up the beach in a burst of spray. */
const beach: PlaceDef = {
  crop: { cx: 600, cy: 520, w: 360 },
  bezel: '#b8945a',
  skip: ['surfStill', 'glitterStill', 'flagStill'],
  loops: [
    {
      box: { x: BH.sun.x - GLIT.w / 2, y: BH.horizon + 1, w: GLIT.w, h: GLIT.h },
      n: 10,
      fps: 5,
      add: true,
      alpha: 0.9,
      paint: (c, ph) => glitterFrame(c, ph),
    },
    {
      box: SURF_BOX,
      n: 14,
      fps: 1.6,
      rush: 2.6,
      paint: (c, ph) => {
        c.save();
        c.translate(-SURF_BOX.x, -SURF_BOX.y);
        for (const cu of CUSPS) {
          const dx = cu.dx;
          if (960 + dx + SURF.w / 2 < SURF_BOX.x || 960 + dx - SURF.w / 2 > SURF_BOX.x + SURF_BOX.w) continue;
          c.save();
          c.translate(960 + dx, 0);
          c.scale(cu.flip ? -1 : 1, 1);
          c.translate(-960, 0);
          surfFrame(c, (ph + 0.5 + cu.lag) % 1);
          c.restore();
        }
        beachGrade(c);
        c.restore();
        void CUSP;
      },
    },
    { box: { x: FLAG.x - 2, y: FLAG.y - 2, w: FLAG.w, h: FLAG.h }, n: 8, fps: 8, rush: 1.5, paint: (c, ph) => flagFrame(c, ph) },
  ],
  fx(g, s) {
    // the surge's foam bursting white along the shore, spray thrown up
    if (s.still) return;
    const h = s.hit(1.1);
    if (h > 0.01) glow(g, 600, BH.shore + 10, 200, '#f4fcff', 0.5 * h, 0.22);
    foam(g, s.sm, 600, BH.shore + 6, 220);
    burst(g, s.sm, 600, BH.shore, { n: 14, sp: 260, grav: 700, life: 0.8, r: 7, col: '#bfe6fa' });
  },
  smack(s, emit) {
    for (let i = 0; i < 4; i++) emit('drop', 520 + s.r() * 160, BH.shore - 20, (s.r() - 0.5) * 200, -220 - s.r() * 120, 9 + s.r() * 3, 7, 0.4, { grav: 700, fin: 0.01 });
  },
};

const ARCH_BOX: Box = { x: JK.x0 - 12, y: JK.top - 12, w: JK.w + 24, h: ARCH_FOOT - JK.top + 22 };
const PIL_BOX: Box = { x: PIL.xs[0] - 2, y: PIL.y0 - 2, w: PIL.xs[1] - PIL.xs[0] + PIL.w + 4, h: PIL.y1 - PIL.y0 + 4 };
const REC_BOX: Box = { x: REC.x - REC.rx - 6, y: REC.y - REC.ry - 4, w: REC.rx * 2 + 12, h: REC.ry * 2 + 12 };

/** Neon Diner '86: the jukebox, its bubbling arch tubes cycling colour, the record spinning under the dome. A smack
 *  makes the needle skip (the record jerks back) and the tubes surge. */
const diner: PlaceDef = {
  crop: { cx: 1790, cy: 446, w: 260 },
  bezel: '#c7ccd4',
  skip: ['jukeLit'],
  loops: [
    {
      box: ARCH_BOX,
      n: 12,
      fps: 6,
      flare: 0.7,
      rush: 2,
      paint: (c, ph) => {
        c.translate(-ARCH_BOX.x, -ARCH_BOX.y);
        archFrame(c, ph);
      },
    },
    {
      box: PIL_BOX,
      n: 12,
      fps: 8,
      flare: 0.5,
      paint: (c, ph) => {
        c.translate(-PIL_BOX.x, -PIL_BOX.y);
        pilasterFrame(c, ph);
      },
    },
    {
      box: REC_BOX,
      n: 12,
      fps: 14,
      rush: -3,
      paint: (c, ph) => {
        c.translate(-REC_BOX.x, -REC_BOX.y);
        recordFrame(c, ph);
      },
    },
  ],
  fx(g, s) {
    tonearm(g);
    // its colour wheel turning behind the arch
    const hue = (s.t * 0.15) % 1;
    const col = ['#ff7ad9', '#ffb02a', '#2ac8ff', '#7dff9a'][Math.floor(hue * 4)];
    glow(g, JK.x, JK.cy - 20, 150, col, 0.12 + 0.25 * s.hit(0.5));
    glow(g, JK.x, JK.cy, 170, '#ff7ad9', 0.14);
    domeGlass(g);
    // the surge throws sparkles round the arch
    if (!s.still && s.sm < 0.7)
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.05 + (i / 6) * 0.9);
        const tw = Math.sin(Math.PI * Math.min(1, (s.sm - i * 0.04) / 0.5));
        if (tw > 0) glow(g, JK.x + Math.cos(a) * (JK.R0 - 10), JK.cy + Math.sin(a) * (JK.R0 - 10), 16, '#ffffff', 0.9 * tw);
      }
  },
  flash: ['#ffd0f0', 0.35],
};

// ════════════════════════════ Act 3 · Out of This World ════════════════════════════

/** Alpine Lodge: the hearth's fire licking up behind the andirons, the room's warm glow. A smack makes it flare and
 *  sends sparks up the chimney. */
const lodge: PlaceDef = {
  crop: { cx: 250, cy: 572, w: 420 },
  bezel: '#6a564a',
  skip: ['fire'],
  front: ['andirons'],
  loops: [
    { box: { x: LG.fire.x - LG_FW / 2, y: LG.fire.y - 4 - LG_FH, w: LG_FW, h: LG_FH }, n: 8, fps: 10, add: true, flare: 1, rush: 1.4, paint: (c, ph) => hearthFrame(c, LG_FW, LG_FH, ph) },
  ],
  under(g, s) {
    const br = 0.85 + 0.1 * Math.sin(s.t * 2.3) + 0.05 * Math.sin(s.t * 6.1);
    glow(g, LG.fire.x, LG.fire.y - 70, 170, '#ff6a20', 0.3 * br, 0.9);
  },
  fx(g, s) {
    const br = 0.85 + 0.1 * Math.sin(s.t * 2.3 + 1) + 0.05 * Math.sin(s.t * 7.1);
    glow(g, LG.fire.x, LG.fire.y - 60, 200, '#ff7a2a', 0.16 * br + 0.5 * s.hit(0.7));
  },
  flash: ['#ffcc90', 0.4],
  smack: (s, emit) => embers(s, emit, LG.fire.x, LG.fire.y - 130, 140, 10),
};

const STARS = [[1080, 160], [1130, 230], [1190, 140], [1290, 180], [1340, 290], [1060, 300], [1410, 150], [1240, 250], [1160, 330]] as const;

/** Orbital Slice station: through the porthole, the moon and the planet's limb, stars scintillating, now and then a
 *  satellite tumbling past and a meteor burning in. A smack brings a shower of meteors. */
const space: PlaceDef = {
  crop: { cx: 1320, cy: 300, w: 380 },
  bezel: '#8a94a6',
  front: ['porthole'],
  loops: [
    {
      box: { x: 1240 - 75, y: 250 - 35, w: 150, h: 70 },
      n: 16,
      fps: 3,
      at: (s) => {
        const u = (s.t % 14) / 10;
        if (u > 1 && !s.still) return null;
        const x = s.still ? 1120 : 960 + u * 560;
        return { dx: x - 1240, dy: -40 + u * 30, sc: 0.8, rot: 0.15 };
      },
      paint: (c, ph) => satellite(c, ph),
    },
  ],
  under(g, s) {
    // stars scintillating
    STARS.forEach(([x, y], i) => {
      const tw = 0.5 + 0.5 * Math.sin(s.t * (1.3 + (i % 4) * 0.7) + i * 2.1);
      glow(g, x, y, 11, '#ffffff', 0.3 + 0.6 * tw * tw);
    });
    // meteors: one now and then, a shower after a smack
    const streak = (t0: number, x0: number, y0: number, len: number) => {
      const u = (s.t - t0) / 0.7;
      if (u < 0 || u > 1) return;
      const x = x0 + u * 300;
      const y = y0 + u * 170;
      const tail = g.createLinearGradient(x - len, y - len * 0.57, x, y);
      tail.addColorStop(0, 'rgba(255,190,120,0)');
      tail.addColorStop(1, `rgba(255,236,200,${(0.9 * Math.sin(Math.PI * u)).toFixed(3)})`);
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = tail;
      g.lineWidth = 3.4;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - len, y - len * 0.57);
      g.lineTo(x, y);
      g.stroke();
      g.restore();
      glow(g, x, y, 14, '#fff0d0', 0.8 * Math.sin(Math.PI * u));
    };
    if (s.still) return;
    const cyc = Math.floor(s.t / 2.6);
    streak(cyc * 2.6 + 0.5, 1040 + ((cyc * 137) % 220), 110 + ((cyc * 71) % 90), 90);
    if (s.sm < 2) for (let i = 0; i < 6; i++) streak(s.t - s.sm + i * 0.15, 1000 + i * 60, 100 + ((i * 53) % 110), 130);
  },
  flash: ['#d8e8ff', 0.5],
};

// ════════════════════════════ Act 4 · Home Cooking ════════════════════════════

const P_ = KN.pot;
const STEAM_BOX: Box = { x: P_.x - 130, y: P_.y - P_.h + 14 - 320, w: 260, h: 320 };
const GAS_BOX: Box = { x: P_.x - (P_.w + 10) / 2, y: KN.stove.top - 30, w: P_.w + 10, h: 30 };

/** Nonna's Kitchen: the big pot of sauce rolling and bubbling on its blue gas ring, steam billowing up into the hood.
 *  A smack boils it up: the sauce churns, steam bursts and it spits. */
const kitchen: PlaceDef = {
  crop: { cx: 236, cy: 410, w: 380 },
  bezel: '#b8683a',
  skip: ['fxStill'],
  loops: [
    {
      box: GAS_BOX,
      n: 10,
      fps: 14,
      add: true,
      alpha: 0.85,
      flare: 0.8,
      paint: (c, ph) => {
        const bw = GAS_BOX.w;
        const n = Math.round(bw / 22);
        for (let i = 0; i < n; i++) {
          c.save();
          c.translate((i + 0.5) * (bw / n) - 9, 6);
          flameFrame(c, 18, 24, (ph + i * 0.37) % 1, GAS, 1, i);
          c.restore();
        }
      },
    },
    {
      box: SAUCE_BOX,
      n: 16,
      fps: 8,
      rush: 2.5,
      paint: (c, ph) => {
        c.translate(-SAUCE_BOX.x, -SAUCE_BOX.y);
        sauceSurface(c, ph);
      },
    },
    {
      box: STEAM_BOX,
      n: 12,
      fps: 8,
      rush: 2,
      alpha: (s) => 0.9 + 0.4 * s.hit(1),
      paint: (c, ph) => steamFrame(c, 260, 320, ph, { a: 0.42, lit: '#fff8ee', body: '#efe8e2', shade: '#a89aa0', seed: 2, n: 8 }),
    },
  ],
  under(g) {
    glow(g, P_.x, KN.stove.top - 8, 140, '#4a8aff', 0.22, 0.3);
  },
  fx(g, s) {
    spoon(g);
    // the sauce spits: blobs thrown up off the surface and falling back into the pot
    if (!s.still) burst(g, s.sm, P_.x, P_.y - P_.h - 4, { n: 12, sp: 300, grav: 1100, life: 0.6, r: 8, col: '#c8301a', up: 1.6 });
  },
  smack(s, emit) {
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 1.4;
      const sp = 160 + s.r() * 140;
      emit('sauce', P_.x + (s.r() - 0.5) * 120, P_.y - P_.h, Math.cos(a) * sp, Math.sin(a) * sp - 40, 11 + s.r() * 4, 9, 0.4, { grav: 800, fin: 0.01 });
    }
    emit('steam', P_.x, P_.y - P_.h - 40, 0, -80, 40, 100, 0.9, { drag: 2, a: 0.6 });
  },
};

const TOWN_LAYERS = ['farTown', 'tower', 'dome', 'midTown', 'nearTown', 'line'];

/** Old Town Terrace: the campanile against the dusk, the washing on its line flapping in the breeze over the roofs.
 *  A smack: lightning forks behind the tower, the sky flashes and a gust takes the washing. */
const oldtown: PlaceDef = {
  crop: { cx: 724, cy: 330, w: 440 },
  bezel: '#8a7a5a',
  skip: ['laundryStill'],
  front: TOWN_LAYERS,
  frontUnder: true,
  loops: WASH.filter((w) => w.x > 470 && w.x < 980).map((w, i) => {
    const f = gFrame(w);
    return {
      box: { x: w.x - f.cx, y: lineY(w.x) - f.top, w: f.gw, h: f.gh },
      n: 10,
      fps: 7,
      rush: 2.4,
      paint: (c: Ctx, ph: number) => garmentFrame(c, w, (ph + i * 0.23) % 1, 0.9, f.gw, f.gh),
    };
  }),
  under(g, s) {
    // stars coming out over the roofs, and the strike behind the tower
    for (let i = 0; i < 9; i++) {
      const tw = 0.5 + 0.5 * Math.sin(s.t * (1.1 + (i % 3) * 0.6) + i * 2.3);
      glow(g, 520 + ((i * 131) % 420), 130 + ((i * 59) % 150), 8, '#fff8e8', 0.2 + 0.45 * tw * tw);
    }
    if (!s.still) drawBolt(g, s, 600, 60);
  },
  fx(g, s) {
    if (s.still || s.sm > 2.2) return;
    rain(g, s, 470, 100, 520, 470, 40, 0.4 * Math.min(1, (2.2 - s.sm) / 0.8));
  },
  flash: ['#c8d4ff', 0.45],
  smack(s) {
    s.mem.bolt = Math.floor(s.r() * BOLT.n);
  },
};

// ════════════════════════════ Act 5 · Sea and Skates ════════════════════════════

/** The Pier: the gull on its post over the rail, the sea and the sky behind; it breathes and tilts its head, and
 *  now and then throws its head back to call. A smack makes it squawk, and spray comes over the rail. */
const pier: PlaceDef = {
  crop: { cx: 1296, cy: 530, w: 270 },
  bezel: '#4a7a6a',
  skip: ['gull'],
  loops: [
    {
      box: { x: PR.gull.x - 0.42 * GULL_FW, y: PR.gull.y + 4 - GULL_FH, w: GULL_FW, h: GULL_FH },
      n: GULL_IDLE + GULL_CALL,
      fps: 1.6,
      segs: [
        [0, GULL_IDLE],
        [GULL_IDLE, GULL_IDLE + GULL_CALL],
      ],
      show: (s) => {
        // a call every so often, and one when it's smacked
        const sinceCall = Math.min(s.sm, (s.t + 3) % 11);
        if (sinceCall < 1.6) return GULL_IDLE + Math.min(GULL_CALL - 1.01, (sinceCall / 1.6) * GULL_CALL);
        return (s.t * 1.6) % GULL_IDLE;
      },
      paint: (c, _ph, i) => gullStandFrame(c, i),
    },
  ],
  under(g, s) {
    // the sea: glints winking on it, a swell's light running in
    for (let i = 0; i < 12; i++) {
      const u = (s.t * (0.5 + (i % 3) * 0.2) + i * 0.29) % 1;
      const x = 1170 + ((i * 89) % 260);
      const y = PR.hz + 12 + ((i * 37) % 150);
      glow(g, x, y, 9, '#ffffff', 0.7 * Math.sin(Math.PI * u) ** 4);
    }
    const sw = (s.t * 0.12) % 1;
    glow(g, 1300, PR.hz + 20 + sw * 220, 260, '#e0f6ff', 0.1 * Math.sin(Math.PI * sw), 0.1);
  },
  fx(g, s) {
    if (s.still) return;
    foam(g, s.sm, 1290, PR.deck - 40, 240);
    burst(g, s.sm, 1290, PR.deck - 50, { n: 14, sp: 280, grav: 700, life: 0.8, r: 7, col: '#bfe6fa' });
  },
  smack(_s, emit) {
    emit('feather', PR.gull.x, PR.gull.y - 60, 40, -70, 16, 14, 1.1, { grav: 50, drag: 1.6, spin: 3 });
  },
};

const BALL = RK.ball;
const HINGE_Y = RK.chord + 18;
const SPECKS = Array.from({ length: 26 }, (_, i) => ({ a: (i / 26) * P2 + (i % 3) * 0.4, d: 0.35 + ((i * 37) % 11) / 16, col: ['#ffffff', '#ffd0f0', '#c8d8ff', '#fff0c0'][i % 4] }));

/** Roller Rink: the mirror ball turning on its chain under the truss, throwing flecks of light round the walls. A
 *  smack swings it and the flecks flare. */
const rink: PlaceDef = {
  crop: { cx: 960, cy: 222, w: 240 },
  bezel: '#c9b8d8',
  skip: ['ball'],
  loops: [
    {
      box: { x: BALL.x - BALL_F / 2, y: BALL.y - BALL_F / 2, w: BALL_F, h: BALL_F },
      n: 6,
      fps: 2.2,
      rush: 2,
      at: (s) => ({ rot: swingOf(s), px: BALL.x, py: HINGE_Y }),
      paint: (c, ph) => ballFrame(c, ph),
    },
  ],
  under(g, s) {
    g.save();
    g.translate(BALL.x, HINGE_Y);
    g.rotate(swingOf(s));
    g.translate(-BALL.x, -HINGE_Y);
    ballChain(g, BALL.x, HINGE_Y, BALL.y - BALL.r - 4);
    g.restore();
  },
  fx(g, s) {
    // the flecks it throws: wheeling round the walls, brighter after a smack
    const turn = s.t * 0.35;
    const h = s.hit(1);
    for (const sp of SPECKS) {
      const a = sp.a + turn;
      const x = BALL.x + Math.cos(a) * 520 * sp.d;
      const y = BALL.y + 40 + Math.sin(a) * 200 * sp.d;
      const front = Math.cos(a * 2 + 1) * 0.5 + 0.5;
      glow(g, x, y, 14 + 6 * h, sp.col, (0.4 + 0.5 * front) * (1 + 1 * h), 0.7);
    }
    // its glints
    const sw = swingOf(s);
    const bx = BALL.x + Math.sin(-sw) * (BALL.y - HINGE_Y);
    for (let i = 0; i < 3; i++) {
      const u = (s.t * 0.7 + i / 3) % 1;
      const tw = Math.sin(Math.PI * u);
      glow(g, bx - 20 + i * 18, BALL.y - 18 + i * 16, 14, '#ffffff', 0.7 * tw * tw);
    }
    glow(g, bx, BALL.y, 120, '#c8b8ff', 0.1 + 0.2 * h);
  },
  smack(s, emit) {
    for (let i = 0; i < 6; i++) {
      const a = s.r() * P2;
      emit('glint', BALL.x + Math.cos(a) * 40, BALL.y + Math.sin(a) * 40, Math.cos(a) * (80 + s.r() * 60), Math.sin(a) * (80 + s.r() * 60), 12 + s.r() * 6, 4, 0.4, { drag: 1.6 });
    }
  },
};

function swingOf(s: PlaceState): number {
  const idle = 0.03 * Math.sin(s.t * 0.9) * s.calm;
  if (s.still) return 0;
  return idle + 0.16 * s.calm * Math.exp(-s.sm * 1.6) * Math.sin(s.sm * 6.5);
}

// ════════════════════════════ Act 6 · Cold and Dark ════════════════════════════

/** A plume of spindrift streaming off a summit at (x, y), downwind to the right (scene px): soft lit puffs. */
function spindrift(g: Ctx, s: PlaceState, x: number, y: number, len: number, a: number): void {
  for (let i = 0; i < 16; i++) {
    const u = (s.t * 0.22 + i / 16) % 1;
    const px = x + u * len + Math.sin(u * 7 + i) * 8;
    const py = y + u * len * 0.16 + Math.sin(u * 5 + i * 1.3) * 6 - Math.sin(Math.PI * u) * 10;
    const r = 6 + u * 34;
    const al = a * Math.sin(Math.PI * Math.min(1, u * 1.3)) * (1 - u * 0.5);
    g.save();
    const gr = g.createRadialGradient(px - r * 0.2, py - r * 0.25, 0, px, py, r);
    gr.addColorStop(0, `rgba(255,255,255,${(al * 0.8).toFixed(3)})`);
    gr.addColorStop(0.55, `rgba(236,244,255,${(al * 0.4).toFixed(3)})`);
    gr.addColorStop(1, 'rgba(200,216,240,0)');
    g.fillStyle = gr;
    g.fillRect(px - r, py - r, r * 2, r * 2);
    g.restore();
  }
}

/** Alpine Slopes: the Summit's horn against the blue, spindrift streaming off its top on the wind. A smack shakes
 *  loose a burst of powder off the ridge. */
const slopes: PlaceDef = {
  crop: { cx: 1052, cy: 292, w: 420 },
  bezel: '#8a6a4a',
  fx(g, s) {
    if (s.still) return spindrift(g, { ...s, t: 1.3 }, 1050, 148, 280, 0.5);
    spindrift(g, s, 1050, 148, 280, 0.5 + 0.6 * s.hit(1.4));
    const h = s.hit(1.6);
    if (h > 0.01) {
      // a slough of powder sliding down the face from the ridge
      const u = 1 - h;
      for (let i = 0; i < 6; i++) glow(g, 1010 + i * 16 + u * 60, 190 + u * 170 + i * 10, 34 + u * 40, '#ffffff', 0.4 * h);
    }
    burst(g, s.sm, 1050, 170, { n: 16, sp: 200, grav: 160, life: 1.3, r: 6, col: '#e8f2ff', up: 3 });
  },
  flash: ['#ffffff', 0.35],
};

const CANDLE3 = CX.candles[2];
const GHOST_AT = { x: 1040, y: 420 };

/** The Haunted Cellar: the arch onto the old cellar behind its iron gate, a candle burning on the wine rack; now and
 *  then a ghost drifts up in the dark of the arch. A smack brings one shrieking out, and the candle gutters. */
const cellar: PlaceDef = {
  crop: { cx: 1150, cy: 410, w: 400 },
  bezel: '#6a5a4a',
  skip: ['flamesStill'],
  loops: [
    {
      box: { x: CANDLE3.x - FLAME.w / 2, y: CANDLE3.y + 4 - FLAME.h, w: FLAME.w, h: FLAME.h },
      n: 10,
      fps: 13,
      add: true,
      alpha: (s) => 1 - 0.7 * s.hit(0.6),
      paint: (c, ph) => flameFrame(c, FLAME.w, FLAME.h, ph, WARM, 3, 2),
    },
    {
      box: { x: GHOST_AT.x - GW / 2, y: GHOST_AT.y - GH * 0.24, w: GW, h: GH },
      n: GHOST_N + SHRIEK_N,
      fps: 7,
      segs: [
        [0, GHOST_N],
        [GHOST_N, GHOST_N + SHRIEK_N],
      ],
      show: (s) => (s.sm < 0.7 ? GHOST_N + Math.min(SHRIEK_N - 1.01, (s.sm / 0.7) * SHRIEK_N) : (s.t * 7) % GHOST_N),
      at: (s) => {
        // a drift up the arch every so often, and out at you when it's smacked
        const idle = (s.t + 6) % 17;
        const k = s.sm < 2.4 ? s.sm / 2.4 : idle < 4 ? idle / 4 : -1;
        if (k < 0 || s.still) return null;
        const a = Math.sin(Math.PI * k);
        const out = s.sm < 2.4;
        return { px: GHOST_AT.x, py: GHOST_AT.y, dy: out ? -20 - 40 * k : 60 - 90 * k, sc: out ? 0.62 + 0.28 * Math.sin(Math.PI * Math.min(1, k * 1.6)) : 0.5, a: a * (out ? 0.95 : 0.7) };
      },
      paint: (c, _ph, i) => (i < GHOST_N ? ghostFrame(c, i / GHOST_N, 0) : ghostFrame(c, 0.25, (i - GHOST_N + 1) / SHRIEK_N)),
    },
  ],
  under(g, s) {
    const idle = (s.t + 6) % 17;
    const on = s.still ? 0 : s.sm < 2.4 ? Math.sin((Math.PI * s.sm) / 2.4) : idle < 4 ? Math.sin((Math.PI * idle) / 4) * 0.6 : 0;
    glow(g, GHOST_AT.x, GHOST_AT.y + 30, 160, '#7af0d0', 0.28 * on);
  },
  fx(g, s) {
    const fl = 0.9 + 0.08 * Math.sin(s.t * 9.1) + 0.05 * Math.sin(s.t * 15.7);
    glow(g, CANDLE3.x, CANDLE3.y - 14, 120, '#ffb050', 0.28 * fl * (1 - 0.6 * s.hit(0.6)));
  },
  flash: ['#a0ffe8', 0.3],
  smack(s, emit) {
    for (let i = 0; i < 4; i++) emit('mote', GHOST_AT.x + (s.r() - 0.5) * 80, GHOST_AT.y + (s.r() - 0.5) * 60, (s.r() - 0.5) * 80, -50 - s.r() * 50, 12, 5, 0.5, { drag: 1.2, a: 0.7 });
    emit('smoke', CANDLE3.x, CANDLE3.y - 30, 0, -40, 20, 60, 0.9, { drag: 2, a: 0.4 });
  },
};

// ════════════════════════════ Act 7 · Comics ════════════════════════════

/** Metropizza Rooftops: the Daily Slice tower's crown and its pizza globe turning in the evening sky, the needle's
 *  light blinking. A smack spins the globe and flashes the floodlights. */
const metropizza: PlaceDef = {
  crop: { cx: 1190, cy: 200, w: 360 },
  bezel: '#c9a23a',
  loops: [
    {
      box: { x: MP.globe.x - GLOBE_F.w / 2, y: MP.globe.y - GLOBE_F.h / 2, w: GLOBE_F.w, h: GLOBE_F.h },
      n: 16,
      fps: 4,
      rush: 5,
      paint: (c, ph) => globe(c, GLOBE_F.w / 2, GLOBE_F.h / 2, MP.globe.r, ph),
    },
  ],
  fx(g, s) {
    const blink = s.still ? 1 : Math.sin(s.t * 3.2) > 0.4 ? 1 : 0.2;
    glow(g, MP.needle.x, MP.needle.top + 2, 22, '#ff3030', 0.8 * blink);
    const h = s.hit(0.8);
    glow(g, MP.globe.x, MP.globe.y + 6, 120, '#ffc060', 0.18 + 0.6 * h);
  },
  flash: ['#fff0b0', 0.55],
  smack(s, emit) {
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 2.6;
      emit('confetti', MP.globe.x + Math.cos(a) * 40, MP.globe.y + Math.sin(a) * 30, Math.cos(a) * (140 + s.r() * 100), Math.sin(a) * (140 + s.r() * 100) - 40, 18 + s.r() * 5, 16, 0.6, { grav: 400, drag: 1, spin: (s.r() - 0.5) * 14 });
    }
  },
};

const VAT0 = DL.vats[0];
const SPEC0 = SPEC_AT(0);

/** Doom's Lab: the green vat, its liquid churning round the clone foot hanging in it on its cable, bubbles
 *  streaming up. A smack sets it boiling and throws green sparks off the coil. */
const doomlab: PlaceDef = {
  crop: { cx: 300, cy: 410, w: 420 },
  bezel: '#5a626c',
  skip: ['vatStillL'],
  front: ['vatGlassL', 'lip'],
  loops: [
    {
      box: { x: VB(0) - DL.vat.rx, y: DL.vat.top, w: LIQ.w, h: LIQ.h },
      n: 12,
      fps: 12,
      rush: 2,
      paint: (c, ph) => liquidFrame(c, ph, VAT0.col, VAT0.deep, 40),
    },
    {
      box: { x: SPEC0.x - SPEC.w / 2, y: SPEC0.y, w: SPEC.w, h: SPEC.h },
      n: SPEC_N,
      fps: 1.1,
      at: (s) => ({ rot: 0.05 * Math.sin(s.t * 0.9) + 0.12 * s.calm * Math.exp(-s.sm * 2) * Math.sin(s.sm * 9), px: SPEC0.x, py: SPEC0.y }),
      paint: (c, ph) => cloneFoot(c, VAT0.col, VAT0.deep, ph),
    },
  ],
  fx(g, s) {
    // bubbles streaming up the glass
    const n = 10 + Math.round(14 * s.hit(1.2));
    for (let i = 0; i < n; i++) {
      const u = (s.t * (0.3 + (i % 5) * 0.06) + i * 0.137) % 1;
      const x = VB(0) - 60 + ((i * 47) % 120) + Math.sin(u * 9 + i) * 5;
      const y = DL.vat.bottom - 20 - u * (DL.vat.bottom - DL.vat.top - 30);
      const r = 2.5 + (i % 3) * 1.5;
      g.save();
      g.strokeStyle = `rgba(220,255,230,${(0.6 * Math.sin(Math.PI * u)).toFixed(3)})`;
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(x, y, r, 0, P2);
      g.stroke();
      g.restore();
    }
    glow(g, VB(0), 420, 220, VAT0.col, 0.1 + 0.3 * s.hit(0.8), 1.3);
    if (!s.still) {
      // the coil arcs: green sparks off its toroid
      const c = DL.coils[0];
      burst(g, s.sm, c.x, c.y, { n: 12, sp: 240, grav: 500, life: 0.5, r: 6, col: '#3dff7a', add: true, up: 3 });
      glow(g, c.x, c.y, 90, '#7dffb0', 0.6 * s.hit(0.35));
    }
  },
  flash: ['#b0ffd0', 0.5],
};

// ════════════════════════════ Act 8 · Norse ════════════════════════════

const JH_X0 = 460;

/** Jotunheim: the giant's sword frozen in the ice under the northern lights, the aurora's curtains rippling across
 *  the stars. A smack: the aurora flares and the wind throws snow off the ice. */
const jotunheim: PlaceDef = {
  crop: { cx: 700, cy: 330, w: 460 },
  bezel: '#7a96b0',
  skip: ['auroraStill'],
  frontFrom: 'aurora',
  frontUnder: true,
  loops: [
    {
      box: { x: JH_X0, y: 0, w: 480, h: JH.auroraH },
      n: 9,
      fps: 1.1,
      add: true,
      flare: 1.2,
      rush: 2,
      paint: (c, ph) => {
        c.translate(-JH_X0, 0);
        aurora(c, ph);
      },
    },
  ],
  fx(g, s) {
    // snow blowing low over the ice
    for (let i = 0; i < 18; i++) {
      const u = (s.t * (0.18 + (i % 4) * 0.04) + i * 0.21) % 1;
      const x = 470 + u * 480;
      const y = 520 + ((i * 37) % 90) + Math.sin(u * 6 + i) * 10;
      glow(g, x, y, 4 + (i % 3) * 2, '#ffffff', (0.4 + 0.4 * s.hit(1)) * Math.sin(Math.PI * u));
    }
    if (!s.still) burst(g, s.sm, 700, 560, { n: 18, sp: 220, grav: 120, life: 1.2, r: 6, col: '#eef6ff', up: 2.6 });
  },
  flash: ['#a0ffd8', 0.45],
};

/** Bifrost: the rainbow bridge springing out from the guardian's abutment over the world-sea, light running out
 *  along it in pulses, glints winking on its deck. A smack sends a bright pulse racing along it. */
const bifrost: PlaceDef = {
  crop: { cx: 640, cy: 590, w: 330 },
  bezel: '#c7a24a',
  under(g) {
    // the bridge's colours lifted: its bands laid along the deck again, a little stronger
    const cols = ['#ff4a5a', '#ffa030', '#ffe040', '#40e070', '#40a0ff', '#8a50ff'];
    g.save();
    g.lineCap = 'round';
    cols.forEach((col, i) => {
      g.beginPath();
      for (let k = 0; k <= 40; k++) {
        const [x, y] = bz(k / 40);
        if (k) g.lineTo(x, y + 10 + i * 6);
        else g.moveTo(x, y + 10 + i * 6);
      }
      g.strokeStyle = rgba(col, 0.32);
      g.lineWidth = 6;
      g.stroke();
    });
    g.restore();
  },
  fx(g, s) {
    const pulse = (t: number, a: number, r: number) => {
      if (t < 0 || t > 1) return;
      const [x, y] = bz(t);
      glow(g, x, y - 6, r, '#ffffff', a * Math.sin(Math.PI * t) + 0.2 * a);
      glow(g, x, y - 6, r * 2.2, '#c0e8ff', a * 0.35);
    };
    if (!s.still) for (let i = 0; i < 3; i++) pulse(((s.t * 0.12 + i / 3) % 1) * 0.6, 0.5, 18);
    else pulse(0.18, 0.5, 18);
    const h = s.hit(1.4);
    if (h > 0.01) pulse((1 - h) * 0.7, 1.2 * Math.sqrt(h), 32);
    for (let i = 0; i < 6; i++) {
      const u = (s.t * 0.7 + i * 0.37) % 1;
      const [x, y] = bz(0.05 + ((i * 0.083) % 0.5));
      glow(g, x + ((i * 13) % 20) - 10, y - 4, 6, '#ffffff', 0.7 * Math.sin(Math.PI * u) ** 3);
    }
  },
  flash: ['#ffd890', 0.28],
  smack(s, emit) {
    for (let i = 0; i < 6; i++) {
      const [x, y] = bz(0.05 + s.r() * 0.35);
      emit('glint', x, y, (s.r() - 0.3) * 100, -50 - s.r() * 70, 12 + s.r() * 6, 4, 0.4, { drag: 1.5 });
    }
  },
};

// ════════════════════════════ Act 9 · Greek Myths ════════════════════════════

const LB_FW = 150;
const LB_FH = 200;

/** A brazier's fire loop for the labyrinth and Tartarus: painted where the scene's own loop goes (its tripod at X, z
 *  in the scene's projection), the scene's fire painter at the brazier's size. */
function brazierLoop(at: [number, number], size: number, cols: [string, string, string], tongues: number, fps: number): LoopDef {
  const [x, y] = at;
  const s = size / (LB_FW * 0.85);
  const w = LB_FW * s;
  const h = LB_FH * s;
  return {
    box: { x: x - w / 2, y: y - h * ((LB_FH - 8) / LB_FH), w, h },
    n: 10,
    fps,
    add: true,
    flare: 1,
    rush: 1.4,
    paint: (c, ph) => {
      c.scale(s, s);
      lbFire(c, LB_FW / 2, LB_FH - 8, LB_FW * 0.85, LB_FH * 0.85, ph, { tongues, seed: 3, cols });
    },
  };
}

const LB_NEAR = (() => {
  const [X, z] = LB.braziers[0];
  return { at: LB_P(X, LB.bowlY, z), kk: ppu(z) };
})();

/** The Labyrinth: the near brazier burning in the corridor of the maze, the far ones down it towards the door,
 *  torchlight on the painted walls. A smack makes the fire roar up and throws embers. */
const labyrinth: PlaceDef = {
  crop: { cx: 640, cy: 430, w: 420 },
  bezel: '#c9873a',
  skip: ['fireStill'],
  loops: [
    brazierLoop(LB_NEAR.at, LB_NEAR.kk * 0.5, ['#ff4a12', '#ffa024', '#ffe8a0'], 6, 12),
    ...LB.braziers.slice(2, 3).map(([X, z]) => brazierLoop(LB_P(X, LB.bowlY, z), ppu(z) * 0.5, ['#ff4a12', '#ffa024', '#ffe8a0'], 6, 13)),
  ],
  fx(g, s) {
    const [x, y] = LB_NEAR.at;
    const fl = 0.85 + 0.1 * Math.sin(s.t * 8.3) + 0.05 * Math.sin(s.t * 13.1);
    glow(g, x, y - LB_NEAR.kk * 0.15, LB_NEAR.kk * 0.5, '#ff8a3a', 0.25 * fl + 0.45 * s.hit(0.8));
  },
  smack: (s, emit) => embers(s, emit, LB_NEAR.at[0], LB_NEAR.at[1] - 90, 80, 10),
};

const TA_R = (() => {
  const [X, z] = TA.braziers[1];
  return { at: TA_P(X, TA.bowlY, z), kk: pz(z) };
})();

/** Tartarus: a soul-fire burning blue on its tripod by the Styx, the ferryman's lantern on the dark water, the lava
 *  falling in the cavern behind. A smack makes the blue fire roar and souls of light rise off it. */
const tartarus: PlaceDef = {
  crop: { cx: 1236, cy: 470, w: 420 },
  bezel: '#5a6a8a',
  skip: ['soulFire'],
  loops: [brazierLoop(TA_R.at, TA_R.kk * 0.21, [SOUL.deep, SOUL.body, SOUL.core], 5, 11)],
  fx(g, s) {
    const [x, y] = TA_R.at;
    const fl = 0.85 + 0.1 * Math.sin(s.t * 7.3) + 0.05 * Math.sin(s.t * 12.1);
    glow(g, x, y - TA_R.kk * 0.14, TA_R.kk * 0.55, '#4fb8ff', 0.22 * fl + 0.5 * s.hit(0.8));
  },
  smack(s, emit) {
    const [x, y] = TA_R.at;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 1.8;
      const sp = 200 + s.r() * 200;
      emit('sparkB', x + (s.r() - 0.5) * 50, y - 20, Math.cos(a) * sp * 0.7, Math.sin(a) * sp * 0.7, 13 + s.r() * 5, 6, 0.45 + s.r() * 0.2, { grav: -60, drag: 1.2, fin: 0.02 });
    }
  },
};

// ════════════════════════════ Act 10 · Finale ════════════════════════════

/** The Oven: the cosmic vortex turning in the broken arch of the first oven's mouth, filaments riding into its eye.
 *  A smack makes it pulse and flings violet sparks. */
const oven: PlaceDef = {
  crop: { cx: VC.x, cy: VC.y, w: 620 },
  bezel: '#ffd23f',
  skip: ['vortexStill'],
  loops: [
    {
      box: { x: VC.x - VR, y: VC.y - VR, w: VR * 2, h: VR * 2 },
      n: 12,
      fps: 3,
      add: true,
      flare: 0.9,
      rush: 4,
      paint: (c, ph) => vortexPaint(c, VR, VR, VR, ph),
    },
  ],
  fx(g, s) {
    glow(g, VC.x, VC.y, 70, '#ffffff', 0.3 + 0.1 * Math.sin(s.t * 2.2) + 0.35 * s.hit(0.6));
    glow(g, VC.x, VC.y + 20, 380, '#b06bff', 0.12 + 0.3 * s.hit(0.9));
    // the eye throws a ring of light out through the arms
    const h = s.hit(0.6);
    if (h > 0.01) {
      const r = 60 + (1 - h) * 300;
      g.save();
      g.globalCompositeOperation = 'lighter';
      const rg = g.createRadialGradient(VC.x, VC.y, r * 0.6, VC.x, VC.y, r);
      rg.addColorStop(0, 'rgba(220,180,255,0)');
      rg.addColorStop(0.7, `rgba(240,220,255,${(0.5 * h).toFixed(3)})`);
      rg.addColorStop(1, 'rgba(220,180,255,0)');
      g.fillStyle = rg;
      g.fillRect(VC.x - r, VC.y - r, r * 2, r * 2);
      g.restore();
    }
  },
  flash: ['#e0c0ff', 0.3],
  smack(s, emit) {
    for (let i = 0; i < 6; i++) {
      const a = s.r() * P2;
      const sp = 140 + s.r() * 140;
      emit('sparkV', VC.x + Math.cos(a) * 220, VC.y + Math.sin(a) * 220, Math.cos(a) * sp, Math.sin(a) * sp, 13 + s.r() * 5, 6, 0.4, { drag: 1.2, fin: 0.01 });
    }
  },
};

const FP_W = FP_FIRE.w + 24;
const FP_H = FP_FIRE.h + 12;
const FP_X0 = FP_FIRE.x - FP_W / 2;
const FP_Y0 = FP_FIRE.y + 2 - FP_H;

/** The First Pizzeria: the first oven, a dome of clay under the stars at the edge of the world, its fire breathing
 *  in the mouth. A smack makes it flare and kicks embers out. */
const firstpizzeria: PlaceDef = {
  crop: { cx: FP_FIRE.x - 30, cy: 520, w: 520 },
  bezel: '#8a6a4a',
  skip: ['fireStill'],
  loops: [
    {
      box: { x: FP_X0, y: FP_Y0, w: FP_W, h: FP_H },
      n: 12,
      fps: 10,
      add: true,
      flare: 1,
      rush: 1.4,
      paint: (c, ph) => {
        c.save();
        c.translate(-FP_X0, -FP_Y0);
        fpMouth(-3)(c);
        c.clip();
        c.translate(FP_X0, FP_Y0);
        lbFire(c, FP_W / 2, FP_H - 2, FP_FIRE.w, FP_FIRE.h, ph, { tongues: 5, seed: 1.3 });
        c.restore();
      },
    },
  ],
  fx(g, s) {
    const fl = 0.85 + 0.1 * Math.sin(s.t * 6.3) + 0.05 * Math.sin(s.t * 11.1);
    glow(g, FP_FIRE.x, FP_FIRE.y - 18, 90, '#ff7a2a', 0.35 * fl, 0.4);
    glow(g, FP_FIRE.x, FP_FIRE.y - 50, 160, '#ffb050', 0.5 * s.hit(0.7));
    // the oven's warm light on its dome and the ground, and the stars over it
    glow(g, FP_FIRE.x, FP_FIRE.y - 80, 260, '#ff9a4a', 0.12 * fl);
    for (let i = 0; i < 8; i++) {
      const tw = 0.5 + 0.5 * Math.sin(s.t * (1.2 + (i % 3) * 0.5) + i * 1.9);
      glow(g, 1430 + ((i * 113) % 470), 290 + ((i * 47) % 90), 8, '#fff8e0', 0.2 + 0.5 * tw * tw);
    }
  },
  flash: ['#ffcc90', 0.4],
  smack: (s, emit) => embers(s, emit, FP_FIRE.x, FP_FIRE.y - 100, 90, 10),
};

// ════════════════════════════ Nemesis stages ════════════════════════════

let sigCanvas: HTMLCanvasElement | null = null;

/** Goth-Ham Rooftops: the great clock tower and the slice signal thrown on the storm clouds, rain driving through
 *  the night. A smack: lightning forks behind the spires and the sky flashes. */
const gotham: PlaceDef = {
  crop: { cx: 880, cy: 280, w: 500 },
  bezel: '#c9cfd8',
  fx(g, s) {
    // the signal breathing in the cloud (the searchlight's beam wavering)
    const sg = GOTHAM.signal;
    const br = 0.8 + 0.12 * Math.sin(s.t * 1.7) + 0.08 * Math.sin(s.t * 5.1);
    sigCanvas ??= (() => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 150;
      signalTex(c.getContext('2d')!, 256, 150);
      return c;
    })();
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 * br;
    g.drawImage(sigCanvas, sg.x - 100, sg.y - 58, 200, 117);
    g.restore();
    glow(g, sg.x, sg.y, 130, '#fff0c0', 0.14 * br);
    // rain driving through, heavier after a strike
    rain(g, s, 620, 20, 520, 540, 46, 0.3 + 0.2 * s.hit(1.5));
  },
  under(g, s) {
    if (!s.still) drawBolt(g, s, 1060, 20);
  },
  frontFrom: 'sky',
  frontUnder: true,
  flash: ['#c8d4ff', 0.45],
  smack(s) {
    s.mem.bolt = Math.floor(s.r() * BOLT.n);
  },
};

/** The Hot Gates: the sea at the foot of the pass, its surf breaking white on the rocks under the low sun, the hot
 *  springs steaming. A smack sends a big wave crashing in. */
const hotgates: PlaceDef = {
  crop: { cx: 470, cy: 560, w: 430 },
  bezel: '#ffe0a0',
  skip: ['surfStill'],
  loops: [{ box: HG.surf, n: 12, fps: 2.2, rush: 2.6, paint: (c, ph) => hgSurf(c, ph) }],
  fx(g, s) {
    // embers drifting up over the pass from the camp fires
    for (let i = 0; i < 12; i++) {
      const u = (s.t * (0.12 + (i % 4) * 0.03) + i * 0.137) % 1;
      const x = 330 + ((i * 83) % 360) + Math.sin(u * 7 + i) * 14;
      const y = 720 - u * 420;
      glow(g, x, y, 6, '#ffa040', 0.75 * Math.sin(Math.PI * u));
    }
    if (s.still) return;
    // the shields flash as the smack rings off them, the surf surges
    const h = s.hit(0.6);
    for (const [x, r] of HG.shields) if (x < 700) glow(g, x, HG.wall.base - r - 4, r * 2.2, '#ffe8b0', 0.7 * h);
    foam(g, s.sm, 330, 690, 160);
  },
  flash: ['#ffe0a0', 0.4],
  smack(s, emit) {
    for (let i = 0; i < 5; i++) emit('spark', 430 + s.r() * 220, HG.wall.base - 40, (s.r() - 0.5) * 220, -160 - s.r() * 140, 14, 8, 0.4, { grav: 600, fin: 0.01 });
  },
};


export const PLACE_DEFS: Partial<Record<LocationId, PlaceDef>> = {
  trattoria,
  rooftop,
  beach,
  diner,
  lodge,
  space,
  kitchen,
  oldtown,
  pier,
  rink,
  slopes,
  cellar,
  metropizza,
  doomlab,
  jotunheim,
  bifrost,
  labyrinth,
  tartarus,
  oven,
  firstpizzeria,
  gotham,
  hotgates,
};
