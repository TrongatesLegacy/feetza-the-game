// The Labyrinth (Stage 17, Act 9's first location, waves 81–84), redrawn with the location kit (src/art/scene): the
// great maze of Crete, built by Daedalus for King Minos, with the Minotaur at its heart. Marble, laurel and bronze above
// ground (Act 9's direction, scenes-act9.ts); here it's Cretan limestone, fresco and bronze.
//
// We stand at the mouth of one of the maze's long passages and look down it to a dark doorway. Its walls tower three
// times a man's height: weathered limestone ashlar laid in courses, a timber tie-beam run through them in the Minoan
// way, the lower walls once plastered and painted: on the left, in the shade, a bull-leaping fresco (a pied bull in a
// flying gallop, a youth vaulting its back, a girl at its horns) over a dado painted to look like veined stone; on the
// right, in the sun, a frieze of running spirals over double axes (the labrys, the maze's own sign) and sacred lilies.
// The plaster has flaked off in patches, its broken edges lit, the stone showing under it; rain has streaked the stone,
// lichen grows on the courses under the coping. Horns of consecration stand along the wall tops. Two red Minoan columns,
// tapering downwards, black-capitalled, stand at the mouth of the passage. The passage turns off left and right on the
// way down; the left turning is open to the low sun, which pours through it and lays a slab of gold across the floor.
// At the end, the façade of the beast's lair: a doorway between two more red columns, stairs going down into the dark,
// a half-rosette frieze and horns over it, a bronze brazier either side. A red thread unwinds from a ball of yarn at our
// feet along the floor and into that doorway; the bones of earlier victims lie along the walls, a dappled ox-hide
// shield leans against one. Over the far wall the maze climbs a hill in tiers towards the palace, and beyond it Mount
// Ida. The table is a slab of the palace's gypsum: veined, glittering, worn smooth, its joints filled with red stucco,
// a band of running spirals painted on its front.
//
// The stage's four waves:
// 1. golden afternoon: a low sun from the left, the left wall in cool shade, the right wall's upper half in gold with
//    the shadow of the left wall's horns along its edge; dust drifts in the slab of light;
// 2. dusk: the sky goes rose and violet, the shadow climbs the right wall until only its coping glows; the braziers lit;
// 3. night: stars and a crescent moon over the maze, the walls in blue, the braziers' firelight on them;
// 4. the beast wakes: the lair's doorway glows red from below, its hot breath rolls out along the floor as mist, and
//    every so often his bellow shakes the maze (grit and flakes of fresco come down, the fires duck and flare).
//
// Live, the heroes:
// - the braziers: fire painted at 10 phases (tongues licking up off a bed of coals), lit smoke rising off them, embers
//   with physics, their light breathing on the walls and the floor; a stomp ducks them and they flare;
// - the light and the air: dust motes drifting in the slab of sun, its light fading out at dusk; swifts wheeling in the
//   afternoon sky; stars twinkling and a shooting star now and then at night; the lair's breath rolling out (painted
//   frames) and its glow throbbing;
// - stomps and bellows: flakes of painted plaster (painted fragments) and grit come off the walls and tumble to the
//   floor, bouncing where they land at their own depth, dust puffs at the walls' feet.

import Phaser from 'phaser';
import { type Air, type Ctx, type R, TY, W, airMix, calmLanes, castShadow, crevice, creviceV, glowAt, gradeAll, groundShadow, lightPool, polyPath, solid, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff, tableSeam } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { shaft } from '../../art/scene/light';
import { cloud, skyFill, stars } from '../../art/scene/sky';
import { ZB, xAt, yAt, zFront } from '../../art/sceneKit';
import { hashStr, makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { fxAtlas } from '../../game/liveKit';
import { Loop, Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, waveK } from '../../game/sceneLive';
import { fireFrame, smokeFrame } from './sceneBits';

type Pt = [number, number];
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => t * t * (3 - 2 * t);

// ——— the maze's own perspective ———
//
// The passage is laid out in its own units (X across, Y up, z away from us), seen from eye height EH with the vanishing
// point at (960, VY): a little below the middle, so the walls tower.

const F = 380;
const VY = 500;
const EH = 1;
export const LB = {
  front: 1040,
  /** The passage's half width, the walls' height, the nearest depth painted. */
  xw: 1.9,
  wh: 2.9,
  near: 0.7,
  /** The lair's façade: its depth and height. */
  farZ: 4.2,
  farH: 3.3,
  /** The turnings (z from…to): the left one open to the sun, the right one in the walls' shade. */
  gapL: [3.05, 3.6] as Pt,
  gapR: [2.0, 2.5] as Pt,
  /** The sun: per unit across the passage its light drops `drop` and goes `away` from us (it grazes the far façade). */
  drop: 0.3,
  away: 0.08,
  /** The braziers: (X, z) of their feet and their bowls' height. */
  braziers: [[-1.45, 1.7], [1.45, 1.7], [-1.02, 3.95], [1.02, 3.95]] as Pt[],
  bowlY: 1.05,
  /** The red columns at the passage's mouth (±X, z). */
  gate: { X: 1.82, z: 0.82 },
  /** The doorway: half width, height. */
  door: { hw: 0.48, h: 2.0 },
};
const XW = LB.xw;
const WH = LB.wh;
const FZ = LB.farZ;
export const sx = (X: number, z: number) => 960 + (X * F) / z;
export const sy = (Y: number, z: number) => VY + ((EH - Y) * F) / z;
export const P = (X: number, Y: number, z: number): Pt => [sx(X, z), sy(Y, z)];
/** A point on a side wall (s −1 left, +1 right). */
const WP = (s: number, Y: number, z: number): Pt => P(s * XW, Y, z);
/** The depth of a side wall at screen x. */
const zAtX = (x: number) => (XW * F) / Math.max(1, Math.abs(x - 960));
/** Screen px per unit at depth z. */
export const ppu = (z: number) => F / z;
/** The height on the right wall (or anywhere) below which the left wall's shadow falls, at X. */
export const shadowY = (X: number) => WH - LB.drop * (X + XW);
/** Where the slab of sun through the left turning crosses the floor and the right wall, at X: z from…to. */
export const patchZ = (X: number): Pt => [LB.gapL[0] + LB.away * (X + XW), LB.gapL[1] + LB.away * (X + XW)];

const quadPath = (a: Pt, b: Pt, c: Pt, d: Pt) => polyPath([a, b, c, d]);
/** A side wall's rectangle (z0…z1, Y0…Y1) as a screen path. */
const wallRect = (s: number, z0: number, z1: number, Y0: number, Y1: number) => quadPath(WP(s, Y0, z0), WP(s, Y1, z0), WP(s, Y1, z1), WP(s, Y0, z1));
/** The far façade's rectangle (X0…X1, Y0…Y1) at depth z. */
const faceRect = (X0: number, X1: number, Y0: number, Y1: number, z = FZ) => quadPath(P(X0, Y0, z), P(X0, Y1, z), P(X1, Y1, z), P(X1, Y0, z));

/**
 * Map a picture painted flat (an elevation: across it runs along the wall, down it runs down the wall) onto a side
 * wall between depths z0…z1 and heights Y0…Y1, a column of screen pixels at a time (perspective-correct along the
 * wall). For the right wall the picture's left edge is the far end (so it reads the way it's seen). u0…u1 takes a part
 * of the picture across (to skip an opening).
 */
function mapToWall(ctx: Ctx, src: HTMLCanvasElement, s: number, z0: number, z1: number, Y0: number, Y1: number, u0 = 0, u1 = 1, zc0 = z0, zc1 = z1): void {
  const sw = src.width;
  const sh = src.height;
  const xa = sx(s * XW, zc0);
  const xb = sx(s * XW, zc1);
  const x0 = Math.max(-1, Math.floor(Math.min(xa, xb)));
  const x1 = Math.min(W + 1, Math.ceil(Math.max(xa, xb)));
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (let x = x0; x < x1; x++) {
    const za = zAtX(x);
    const zb = zAtX(x + 1);
    const zm = zAtX(x + 0.5);
    if (zm < zc0 || zm > zc1) continue;
    const fa = (za - z0) / (z1 - z0);
    const fb = (zb - z0) / (z1 - z0);
    const ua = s > 0 ? 1 - fa : fa;
    const ub = s > 0 ? 1 - fb : fb;
    const sa = (u0 + (u1 - u0) * Math.min(ua, ub)) * sw;
    const sb = (u0 + (u1 - u0) * Math.max(ua, ub)) * sw;
    const top = sy(Y1, zm);
    const h = ((Y1 - Y0) * F) / zm;
    ctx.drawImage(src, Math.max(0, sa), 0, Math.max(0.6, sb - sa), sh, x, top, 1.6, h);
  }
  ctx.restore();
}

/** The horns of consecration in their own unit square (0…1 across, 0 at the foot … 1 at the tips). */
export const HORNS: Pt[] = [[0, 0], [1, 0], [1, 0.16], [0.95, 0.3], [0.955, 0.55], [0.99, 0.8], [1.05, 1], [0.93, 0.97], [0.85, 0.72], [0.79, 0.47], [0.71, 0.32], [0.6, 0.255], [0.5, 0.24], [0.4, 0.255], [0.29, 0.32], [0.21, 0.47], [0.15, 0.72], [0.07, 0.97], [-0.05, 1], [0.01, 0.8], [0.045, 0.55], [0.05, 0.3], [0, 0.16]];
/** Horns on a side wall's top at depth zc, facing down the passage (their width across the wall's thickness). */
const hornsOnWall = (s: number, zc: number, len: number, h: number, Y0 = WH): Pt[] => HORNS.map(([u, v]) => P(s * (XW + 0.02 + (u - 0.5) * len), Y0 - 0.02 + v * h, zc));
/** Horns on the façade's top, centred at X, `w` wide and `h` high. */
const hornsOnFace = (Xc: number, w: number, h: number, Y0 = LB.farH, z = FZ): Pt[] => HORNS.map(([u, v]) => P(Xc + (u - 0.5) * w, Y0 + v * h, z));
/** Where the horns stand along the wall tops (depths). */
const HORNS_L = [1.62, 2.12, 2.72, 3.85];
const HORNS_R = [1.5, 1.86, 2.78, 3.25, 3.75];
const HORN_LEN = 0.3;
const HORN_H = 0.24;
const FACE_HORNS = [-1.25, 0, 1.25];

// ——— the air and the light ———

/** The air down the passage: a warm golden haze. */
const AIR: Air = { color: '#e2c79a', far: 0.42 };
/** The far air over the island: pale blue-gold. */
const FAR: Air = { color: '#d8d2c0', far: 0.8 };
/** Limestone in the sun, and the multiply that puts it in the cool shade (lit only by the sky). */
export const LIME = { lit: '#f2d49c', body: '#d8b884', dark: '#a48862', deep: '#5a4634' };
export const SHADE = '#5a5ea6';
const SHADE_FLOOR = '#646aa0';
const SUN = '#ffd89a';
/** The frescoes' paint: Minoan red, ochre, Egyptian blue, black, lime white, green. */
export const FR = { red: '#b2432c', ochre: '#d6a243', blue: '#3e7aa8', black: '#2b2320', white: '#efe4cc', green: '#6e8a4c', pink: '#d88a6a' };
export const BRONZE = { lit: '#f0c070', body: '#b47a34', shade: '#6a4220', deep: '#2e1a0c' };
export const COLUMN = { lit: '#d4543a', body: '#a5301f', shade: '#5e1a14', cap: '#2a1f1c' };

// ——— the sky over the maze ———

interface SkyPal {
  stops: [number, string][];
  sun?: { x: number; y: number; col: string; a: number };
  clouds: { lit: string; body: string; shadow: string; rim: number; a: number };
  ida: { col: string; lit: string; litA: number; air: Air };
  maze: { lit: string; body: string; shade: string; air: Air };
  palace: { lit: string; col: string; lamps?: number };
  stars?: boolean;
  moon?: boolean;
}

export const SKY_BOX = { x: 380, y: 0, w: 1160, h: 440 };

const DAY: SkyPal = {
  stops: [[0, '#6e98c2'], [0.3, '#9db8cc'], [0.55, '#d8cfae'], [0.75, '#f3d69c'], [1, '#f4c886']],
  sun: { x: 430, y: 40, col: '#ffe2a8', a: 0.75 },
  clouds: { lit: '#fff2d2', body: '#dccbc0', shadow: '#9c9cba', rim: 0.6, a: 0.95 },
  ida: { col: '#8e94b4', lit: '#f2d0a0', litA: 0.5, air: FAR },
  maze: { lit: '#f0d6a4', body: '#c4ae8a', shade: '#8c86a0', air: FAR },
  palace: { lit: '#f4dcb0', col: '#c8b494' },
};
const DUSK: SkyPal = {
  stops: [[0, '#3c3a72'], [0.3, '#7a5684'], [0.55, '#d77a72'], [0.78, '#f2a06a'], [1, '#f6b878']],
  sun: { x: 400, y: 150, col: '#ff9a5a', a: 0.7 },
  clouds: { lit: '#ffb48a', body: '#a8708a', shadow: '#5a4670', rim: 0.75, a: 0.95 },
  ida: { col: '#5a4a78', lit: '#ff9a70', litA: 0.55, air: { color: '#c88a8a', far: 0.7 } },
  maze: { lit: '#f8a878', body: '#9a6a74', shade: '#5a4466', air: { color: '#c88a8a', far: 0.7 } },
  palace: { lit: '#ffb884', col: '#9a7078', lamps: 0.5 },
};
const NIGHT: SkyPal = {
  stops: [[0, '#070a1e'], [0.4, '#101a3a'], [0.75, '#1e2c52'], [1, '#2c3a60']],
  clouds: { lit: '#5a6a90', body: '#1e2644', shadow: '#0c1024', rim: 0.45, a: 0.75 },
  ida: { col: '#141a32', lit: '#4a5a88', litA: 0.4, air: { color: '#2a3660', far: 0.6 } },
  maze: { lit: '#4a5680', body: '#222a48', shade: '#10142a', air: { color: '#2a3660', far: 0.6 } },
  palace: { lit: '#5a6488', col: '#1e2440', lamps: 1 },
  stars: true,
  moon: true,
};

const CLOUDS: [number, number, number, number][] = [[1180, 118, 380, 96], [760, 84, 320, 72], [1330, 222, 230, 52], [690, 218, 150, 30]];

/** The sky over the maze, the far hills and the maze climbing towards the palace (in a palette). */
function skyPaint(ctx: Ctx, r: R, p: SkyPal): void {
  const b = SKY_BOX;
  skyFill(ctx, b, p.stops, 0.05);
  if (p.stars) {
    stars(ctx, r, { x: b.x, y: 0, w: b.w, h: 300 }, 260, '#f4f0ff');
    // the Milky Way: a soft lane of light with dark rifts, slanting across
    softly(ctx, b, (g) => {
      g.save();
      g.translate(960, 120);
      g.rotate(-0.5);
      const lg = g.createLinearGradient(0, -70, 0, 70);
      lg.addColorStop(0, 'rgba(170,180,230,0)');
      lg.addColorStop(0.5, 'rgba(170,180,230,0.22)');
      lg.addColorStop(1, 'rgba(170,180,230,0)');
      g.fillStyle = lg;
      g.fillRect(-700, -70, 1400, 140);
      g.restore();
    }, 0.25, 'screen');
    lay(ctx, noiseMask(7, 41, { cover: 0.4, soft: 0.25, col: '#04060e', w: 120, h: 48 }), { x: b.x, y: 0, w: b.w, h: 300 }, 0.5);
    stars(ctx, rng(hashStr('lb:stars2')), { x: b.x, y: 0, w: b.w, h: 260 }, 90, '#fff8e8');
  }
  if (p.moon) {
    // a waxing crescent, high over the right wall, earthshine on its dark part
    const mx = 1240;
    const my = 92;
    glowAt(ctx, mx, my, 150, '#9ab0e8', 0.22);
    glowAt(ctx, mx, my, 50, '#e8eeff', 0.3);
    ctx.save();
    ctx.fillStyle = rgba('#8a96c0', 0.35);
    ctx.beginPath();
    ctx.arc(mx, my, 17, 0, P2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, 17, 0, P2);
    ctx.clip();
    ctx.fillStyle = '#f6f2e0';
    ctx.fillRect(mx - 18, my - 18, 36, 36);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(mx + 7, my - 4, 15.5, 0, P2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  if (p.sun) glowAt(ctx, p.sun.x, p.sun.y, 620, p.sun.col, p.sun.a * 0.55, 0.8);
  if (p.sun) glowAt(ctx, p.sun.x, p.sun.y, 220, mix(p.sun.col, '#ffffff', 0.5), p.sun.a * 0.6);
  // clouds lit from the sun's side
  const sunX = p.sun?.x ?? 1240;
  const sunY = p.sun?.y ?? 92;
  for (const [x, y, w, h] of CLOUDS) {
    cloud(ctx, r, x, y, w, h, { lit: p.clouds.lit, body: p.clouds.body, shadow: p.clouds.shadow, sunX, sunY, rim: p.clouds.rim, a: p.clouds.a, kind: w > 300 ? 'cumulus' : 'stratus', wisp: 0.5, depth: 0.6, air: FAR, res: 0.5 });
  }
  // Mount Ida, far off, its twin summits
  const ida: Pt[] = [[560, 330], [640, 296], [720, 280], [800, 254], [860, 236], [920, 214], [962, 196], [990, 188], [1012, 200], [1036, 194], [1068, 178], [1096, 190], [1140, 212], [1200, 236], [1280, 256], [1380, 274], [1480, 296], [1560, 330]];
  const ic = airMix(p.ida.col, 0.72, p.ida.air);
  ctx.save();
  polyPath(ida)(ctx);
  ctx.fillStyle = ic;
  ctx.fill();
  ctx.clip();
  // its sunward flanks lit, the gullies in shade, snow in the summit's hollows (in the day)
  lay(ctx, drift(p.ida.lit, shade(ic, -0.25), 4, 12, 64, 24), { x: 560, y: 178, w: 1000, h: 152 }, 0.35);
  const lg = ctx.createLinearGradient(900, 180, 1150, 300);
  lg.addColorStop(0, rgba(p.ida.lit, p.ida.litA));
  lg.addColorStop(1, rgba(p.ida.lit, 0));
  ctx.fillStyle = lg;
  ctx.fillRect(560, 178, 1000, 152);
  for (let i = 0; i < 9; i++) {
    const gx = 900 + i * 34 + r() * 10;
    ctx.strokeStyle = rgba(shade(ic, -0.3), 0.16);
    ctx.lineWidth = 1.5 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(gx, 200 + r() * 10);
    ctx.quadraticCurveTo(gx + 14, 240, gx + 30 + r() * 20, 300);
    ctx.stroke();
  }
  vfill(ctx, 560, 240, 1000, 90, [[0, rgba(p.ida.air.color, 0)], [1, rgba(p.ida.air.color, 0.4)]]);
  ctx.restore();
  // the hill the maze climbs towards the palace, and the maze on it: row on row of thin wall tops following the slope,
  // each a lit coping over a sliver of shaded face, broken by turnings, finer and hazier as they climb away
  const hillTop = (x: number) => 300 - Math.max(0, Math.cos(((x - 960) / 420) * (Math.PI / 2))) ** 1.4 * 78;
  ctx.fillStyle = airMix(p.maze.body, 0.9, p.maze.air);
  ctx.beginPath();
  ctx.moveTo(520, 320);
  for (let x = 520; x <= 1400; x += 10) ctx.lineTo(x, hillTop(x));
  ctx.lineTo(1400, 320);
  ctx.closePath();
  ctx.fill();
  for (let row = 0; row < 11; row++) {
    const f = row / 10;
    const d = 0.84 + f * 0.12;
    const lit = airMix(p.maze.lit, d, p.maze.air);
    const face = airMix(p.maze.shade, d - 0.12, p.maze.air);
    const th = 3.2 - f * 1.8;
    for (let x = 520 + r() * 30; x < 1400; ) {
      const len = 14 + r() * 70 * (1 - f * 0.5);
      const y = hillTop(x + len / 2) + 6 + (1 - f) * (300 - hillTop(x + len / 2)) * 0.9 - 2;
      if (y > hillTop(x + len / 2) + 2 && y < 316) {
        ctx.fillStyle = face;
        ctx.fillRect(x, y, len, th);
        ctx.fillStyle = lit;
        ctx.fillRect(x, y - 0.8, len, 1.1);
        // a return running back up the slope now and then
        if (r() < 0.3) {
          ctx.fillStyle = face;
          ctx.fillRect(x + (r() < 0.5 ? 0 : len - 1.5), y - 6 * (1 - f * 0.5), 1.5, 6 * (1 - f * 0.5));
        }
      }
      x += len + 5 + r() * 16;
    }
  }
  haze(ctx, 220, 330, p.maze.air.color, 0.14);
  // the palace on its hill: stepped terraces of pale stone, a loggia of red columns, flat roofs with horns on them
  // (a few lamps lit at dusk and night)
  const px = 960;
  const py = 226;
  const pc = airMix(p.palace.col, 0.82, p.maze.air);
  const pl = airMix(p.palace.lit, 0.82, p.maze.air);
  for (const [bx0, by0, bw, bh] of [[-46, -6, 92, 16], [-30, -16, 50, 12], [4, -22, 22, 8], [-16, -26, 14, 10]] as [number, number, number, number][]) {
    ctx.fillStyle = pc;
    ctx.fillRect(px + bx0, py + by0, bw, bh);
    ctx.fillStyle = pl;
    ctx.fillRect(px + bx0, py + by0, bw * 0.35, bh);
    ctx.fillRect(px + bx0, py + by0, bw, 1);
  }
  ctx.fillStyle = airMix('#8a2a1c', 0.8, p.maze.air);
  for (let i = 0; i < 5; i++) ctx.fillRect(px - 26 + i * 6, py - 12, 1.6, 7);
  ctx.fillStyle = airMix('#3a2a2a', 0.8, p.maze.air);
  ctx.fillRect(px + 10, py - 2, 14, 5);
  if (p.palace.lamps) {
    for (const [lx, ly] of [[px - 36, py], [px - 8, py - 12], [px + 18, py - 1], [px + 34, py + 2]] as Pt[]) {
      glowAt(ctx, lx, ly, 7, '#ffb060', 0.7 * p.palace.lamps);
      ctx.fillStyle = rgba('#ffd890', p.palace.lamps);
      ctx.fillRect(lx - 1, ly - 1, 2, 2);
    }
  }
  haze(ctx, 190, 300, p.maze.air.color, 0.12);
}

/** A band of haze (as the kit's, but local). */
function haze(ctx: Ctx, y0: number, y1: number, col: string, a: number, x0 = 0, x1 = W): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(0.6, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

// ——— masonry ———

interface MasonryOpts {
  /** Course height and block lengths (units). */
  ch?: number;
  minL?: number;
  maxL?: number;
  /** The tones the blocks wander through, and how strongly. */
  tones: string[];
  toneA?: number;
  joint?: string;
  lip?: string;
}

/**
 * Coursed ashlar on a plane: courses of blocks in the plane's own units (a along it, Y up), each block its own stone
 * (a tone, a cushion lit at its top and dark at its foot), the bed joints recessed (a dark band under each course, a lit
 * lip over it), the head joints dark. map takes (a, Y) to the screen; sc(a) is px per unit there.
 */
function masonry(ctx: Ctx, r: R, map: (a: number, Y: number) => Pt, a0: number, a1: number, Y0: number, Y1: number, sc: (a: number) => number, o: MasonryOpts): void {
  const ch = o.ch ?? 0.41;
  const minL = o.minL ?? 0.55;
  const maxL = o.maxL ?? 1.15;
  const joint = o.joint ?? '#2a1e18';
  const lip = o.lip ?? '#fff0d0';
  const ta = o.toneA ?? 0.16;
  const band = (aa: number, b: number, ya: number, yb: number) => quadPath(map(aa, ya), map(b, ya), map(b, yb), map(aa, yb));
  for (let Y = Y0; Y < Y1 - 0.02; ) {
    const h = Math.min(Y1 - Y, ch * (0.82 + r() * 0.36));
    let a = a0 - r() * maxL * 0.8;
    while (a < a1) {
      const b = Math.min(a1, a + minL + r() * (maxL - minL));
      const aa = Math.max(a0, a);
      if (b - aa > 0.01) {
        const [qx0, qy0] = map((aa + b) / 2, Y + h);
        const [, qy1] = map((aa + b) / 2, Y);
        const path = band(aa, b, Y, Y + h);
        ctx.fillStyle = rgba(o.tones[Math.floor(r() * o.tones.length)], ta * (0.4 + r() * 0.6));
        path(ctx);
        ctx.fill();
        // the face's cushion: catching the light at its top, falling into shade at its foot
        const g = ctx.createLinearGradient(qx0, qy0, qx0, qy1);
        g.addColorStop(0, rgba(lip, 0.13));
        g.addColorStop(0.35, rgba(lip, 0));
        g.addColorStop(0.75, rgba(joint, 0));
        g.addColorStop(1, rgba(joint, 0.16));
        ctx.fillStyle = g;
        path(ctx);
        ctx.fill();
        // the head joint at its end
        if (b < a1) {
          const s = sc(b);
          const jw = 0.011;
          ctx.fillStyle = rgba(joint, 0.78);
          band(b - jw, b + jw, Y + 0.005, Y + h - 0.005)(ctx);
          ctx.fill();
          ctx.strokeStyle = rgba(lip, 0.22);
          ctx.lineWidth = Math.max(0.6, s * 0.006);
          const [ux, uy] = map(b + jw * 1.6, Y + 0.01);
          const [vx, vy] = map(b + jw * 1.6, Y + h - 0.01);
          ctx.beginPath();
          ctx.moveTo(ux, uy);
          ctx.lineTo(vx, vy);
          ctx.stroke();
        }
      }
      a = b;
    }
    // the bed joint over this course: a dark band, the lit arris of the course above it
    if (Y + h < Y1 - 0.02) {
      ctx.fillStyle = rgba(joint, 0.72);
      band(a0, a1, Y + h - 0.012, Y + h + 0.01)(ctx);
      ctx.fill();
      ctx.fillStyle = rgba(lip, 0.2);
      band(a0, a1, Y + h + 0.01, Y + h + 0.022)(ctx);
      ctx.fill();
    }
    Y += h;
  }
}

/** A mason's mark cut in a block: a little double axe, its cuts dark with a lit lip. */
export function masonMark(ctx: Ctx, x: number, y: number, s: number, a = 0.5): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [dx, dy, col, al] of [[0.8, 0.8, '#fff0d0', a * 0.5], [0, 0, '#2a1e18', a]] as const) {
    ctx.strokeStyle = rgba(col, al);
    ctx.lineWidth = Math.max(0.8, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(x + dx, y - s + dy);
    ctx.lineTo(x + dx, y + s + dy);
    ctx.moveTo(x - s * 0.7 + dx, y - s * 0.55 + dy);
    ctx.lineTo(x + s * 0.7 + dx, y + s * 0.15 + dy);
    ctx.lineTo(x + s * 0.7 + dx, y - s * 0.55 + dy);
    ctx.lineTo(x - s * 0.7 + dx, y + s * 0.15 + dy);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/** Multiply a region into a colour (the cool shade), soft-edged: painted small and drawn up. */
function shadeWith(ctx: Ctx, box: { x: number; y: number; w: number; h: number }, col: string, draw: (g: Ctx) => void, k = 0.5): void {
  softly(ctx, box, (g) => {
    g.fillStyle = col;
    draw(g);
  }, k, 'multiply');
}

const inkCol = (depth: number) => mix('#2a1410', AIR.color, depth * 0.45);
const boxOfPts = (pts: Pt[], pad = 4) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad };
};

// ——— the lair's façade, at the end of the passage ———

const FACE_BOX = { x: 770, y: 236, w: 380, h: 362 };

function facade(ctx: Ctx, r: R): void {
  const s = ppu(FZ);
  const map = (X: number, Y: number) => P(X, Y, FZ);
  const H = LB.farH;
  const full = faceRect(-XW, XW, 0, H);
  const [x0, y0] = P(-XW, H, FZ);
  const [x1, y1] = P(XW, 0, FZ);
  const box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  ctx.save();
  full(ctx);
  ctx.clip();
  vfill(ctx, box.x, box.y, box.w, box.h, [[0, LIME.lit], [1, LIME.body]]);
  surface(ctx, r, box, LIME.body, { over: true, vary: 0.4, cells: 4, mottle: 0.3, strokes: 0.3, strokeAng: Math.PI / 2, strokeLen: 40, strokeW: 2, grain: 0.22, grainKind: 'speckle', seed: 31 });
  masonry(ctx, r, map, -XW, XW, 0, 2.72, () => s, { tones: [LIME.lit, LIME.dark, '#c9b08a', '#e2c79c'], toneA: 0.22, minL: 0.5, maxL: 1.0 });
  // the half-rosette frieze: triglyphs and half rosettes in red, blue and white
  const fy0 = 2.72;
  const fy1 = 2.98;
  ctx.fillStyle = FR.white;
  faceRect(-XW, XW, fy0, fy1)(ctx);
  ctx.fill();
  for (let X = -XW + 0.02; X < XW; X += 0.4) {
    ctx.fillStyle = FR.blue;
    for (let k = 0; k < 3; k++) {
      faceRect(X + k * 0.045, X + k * 0.045 + 0.025, fy0 + 0.02, fy1 - 0.02)(ctx);
      ctx.fill();
    }
    for (const [cx, dir] of [[X + 0.165, 1], [X + 0.37, -1]] as const) {
      const [rx, ry] = P(cx, (fy0 + fy1) / 2, FZ);
      ctx.fillStyle = FR.red;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 0.075 * s, 0.1 * s, 0, dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : Math.PI * 1.5);
      ctx.fill();
      ctx.fillStyle = FR.ochre;
      ctx.beginPath();
      ctx.arc(rx, ry, 0.025 * s, 0, P2);
      ctx.fill();
    }
  }
  ctx.fillStyle = rgba(FR.black, 0.7);
  faceRect(-XW, XW, fy0 - 0.012, fy0 + 0.006)(ctx);
  ctx.fill();
  faceRect(-XW, XW, fy1 - 0.006, fy1 + 0.012)(ctx);
  ctx.fill();
  // flakes off the frieze
  lay(ctx, noiseMask(9, 77, { cover: 0.22, soft: 0.04, col: LIME.body, w: 90, h: 8 }), { x: box.x, y: P(0, fy1, FZ)[1], w: box.w, h: (fy1 - fy0) * s }, 0.85);
  // the cornice: a slab projecting over the frieze, its underside in shadow
  const [, cy] = P(0, H, FZ);
  vfill(ctx, box.x, cy, box.w, (H - fy1) * s, [[0, LIME.lit], [0.65, LIME.body], [1, LIME.deep]]);
  // weather: rain streaks off the cornice
  for (let i = 0; i < 14; i++) {
    const X = -XW + r() * 2 * XW;
    const [sx0, sy0] = P(X, fy0 - 0.02, FZ);
    streaks(ctx, r, sx0, sy0, 10, 40 + r() * 80, '#5a4a40', 0.14, 2);
  }
  ctx.restore();
  // the doorway: stairs going down into the dark, a stone frame and the lintel
  const { hw, h: dh } = LB.door;
  const door = faceRect(-hw, hw, 0, dh);
  const [dx0, dy0] = P(-hw, dh, FZ);
  const [dx1, dy1] = P(hw, 0, FZ);
  ctx.save();
  door(ctx);
  ctx.clip();
  vfill(ctx, dx0, dy0, dx1 - dx0, dy1 - dy0, [[0, '#040202'], [0.6, '#0a0605'], [1, '#1a0e0a']]);
  // the steps, sinking into the dark
  for (let k = 0; k < 7; k++) {
    const z = FZ + 0.12 + k * 0.17;
    const Y = -0.12 - k * 0.15;
    const [ax, ay] = P(-hw, Y, z);
    const [bx] = P(hw, Y, z);
    const a = 0.5 * (1 - k / 7);
    ctx.fillStyle = rgba('#8a6a50', a);
    ctx.fillRect(ax, ay, bx - ax, 1.8);
    ctx.fillStyle = rgba('#000000', a * 0.6);
    ctx.fillRect(ax, ay + 1.6, bx - ax, 2);
  }
  // the doorway's thickness seen past its left edge
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(dx0, dy0, (dx1 - dx0) * 0.12, dy1 - dy0);
  ctx.restore();
  // the frame: two jamb stones and a threshold step
  for (const [a0, a1] of [[-hw - 0.1, -hw], [hw, hw + 0.1]] as Pt[]) {
    solid(ctx, faceRect(a0, a1, 0, dh), boxOfPts([P(a0, dh, FZ), P(a1, 0, FZ)]), 'stone', LIME.lit, { depth: 0.5, air: AIR, line: 1.2, formSize: 3 });
  }
  const st = quadPath(P(-0.82, 0.09, FZ - 0.2), P(0.82, 0.09, FZ - 0.2), P(0.82, 0.09, FZ), P(-0.82, 0.09, FZ));
  solid(ctx, st, boxOfPts([P(-0.82, 0.09, FZ - 0.2), P(0.82, 0, FZ)]), 'stone', LIME.lit, { depth: 0.5, air: AIR, line: 1.1, formSize: 3 });
  const riser = quadPath(P(-0.82, 0.09, FZ - 0.2), P(0.82, 0.09, FZ - 0.2), P(0.82, 0, FZ - 0.2), P(-0.82, 0, FZ - 0.2));
  ctx.fillStyle = LIME.dark;
  riser(ctx);
  ctx.fill();
  // the lintel: a timber beam across the columns
  const lin = faceRect(-0.98, 0.98, dh, dh + 0.17, FZ - 0.1);
  solid(ctx, lin, boxOfPts([P(-0.98, dh + 0.17, FZ - 0.1), P(0.98, dh, FZ - 0.1)]), 'wood', '#6a4a30', { depth: 0.5, air: AIR, line: 1.4, formSize: 3 });
  // the red columns, tapering downwards, black cushion capitals
  for (const X of [-0.74, 0.74]) {
    const [cx, cy0] = P(X, 0, FZ - 0.1);
    castShadow(ctx, rectPathAt(cx - 9, cy0 - dh * s, 18, dh * s), 8, 6, 0.3);
    redColumn(ctx, X, FZ - 0.1, 0, dh, 0.085, 0.5);
  }
  // horns of consecration along the cornice
  for (const Xc of FACE_HORNS) {
    const pts = hornsOnFace(Xc, 0.62, 0.42);
    solid(ctx, polyPath(pts), boxOfPts(pts), 'stone', '#f2dfba', { depth: 0.5, air: AIR, line: 1.3, formSize: 3 });
  }
  // the sun across it: lit above the left wall's shadow, which slants down to the right; the rest in the cool shade
  shadeWith(ctx, FACE_BOX, SHADE, (g) => {
    polyPath([P(-XW - 0.2, -0.4, FZ), P(-XW - 0.2, shadowY(-XW), FZ), P(XW + 0.2, shadowY(XW), FZ), P(XW + 0.2, -0.4, FZ)])(g);
    g.fill();
  });
  // the warm of the sun on the lit part
  ctx.save();
  polyPath([P(-XW, shadowY(-XW), FZ), P(-XW, H + 0.6, FZ), P(XW, H + 0.6, FZ), P(XW, shadowY(XW), FZ)])(ctx);
  ctx.clip();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = rgba(SUN, 0.55);
  ctx.fillRect(FACE_BOX.x, FACE_BOX.y, FACE_BOX.w, FACE_BOX.h);
  ctx.restore();
  // its foot in the floor's occlusion
  crevice(ctx, x0, x1, y1, -10, 0.45, '#2a2030');
}

const rectPathAt = (x: number, y: number, w: number, h: number) => (c: Ctx) => {
  c.beginPath();
  c.rect(x, y, w, h);
};

/** A Minoan column standing at (X, z) from Y0 to Y1: a red shaft tapering downwards, a black cushion capital and an
 * abacus, a stone base disc. r0 is its radius at the foot. lit (0…1) is how much of the key light reaches it. */
function redColumn(ctx: Ctx, X: number, z: number, Y0: number, Y1: number, r0: number, depth: number, lit = 1): (c: Ctx) => void {
  const s = ppu(z);
  const capH = 0.2;
  const top = Y1 - capH;
  const r1 = r0 * 1.32;
  const [bx, by] = P(X, Y0, z);
  const [, ty] = P(X, top, z);
  const shaft = (c: Ctx) => {
    c.beginPath();
    c.moveTo(bx - r0 * s, by);
    c.lineTo(bx - r1 * s, ty);
    c.lineTo(bx + r1 * s, ty);
    c.lineTo(bx + r0 * s, by);
    c.closePath();
  };
  // the shaft: lit from the left, a highlight down it, falling into shade and a cool rim on the right
  const g = ctx.createLinearGradient(bx - r1 * s, 0, bx + r1 * s, 0);
  g.addColorStop(0, mix(COLUMN.body, COLUMN.shade, 0.3 * (1 - lit)));
  g.addColorStop(0.24, mix(COLUMN.lit, COLUMN.body, 1 - lit));
  g.addColorStop(0.5, COLUMN.body);
  g.addColorStop(0.86, COLUMN.shade);
  g.addColorStop(0.97, shade(COLUMN.shade, -0.25));
  g.addColorStop(1, mix(COLUMN.shade, '#8a90c0', 0.4));
  shaft(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, shaft, () => {
    // the paint worn and flaking, the plaster under it; the capital's shadow at the top
    lay(ctx, noiseMask(9, Math.round(X * 100 + z * 10), { cover: 0.14, soft: 0.06, col: '#b89880', w: 24, h: 140 }), { x: bx - r1 * s, y: ty, w: r1 * s * 2, h: by - ty }, 0.22);
    lay(ctx, drift('#e06a4a', '#4a1410', 5, Math.round(X * 31 + z * 7), 20, 80), { x: bx - r1 * s, y: ty, w: r1 * s * 2, h: by - ty }, 0.3);
    vfill(ctx, bx - r1 * s, ty, r1 * s * 2, (by - ty) * 0.22, [[0, rgba(COLUMN.cap, 0.5)], [1, rgba(COLUMN.cap, 0)]]);
    vfill(ctx, bx - r1 * s, by - (by - ty) * 0.2, r1 * s * 2, (by - ty) * 0.2, [[0, rgba('#2a1010', 0)], [1, rgba('#2a1010', 0.35)]]);
  });
  ctx.strokeStyle = inkCol(depth);
  ctx.lineWidth = Math.max(1, s * 0.012);
  shaft(ctx);
  ctx.stroke();
  // the capital: a black cushion (a torus) and a square abacus over it
  const [, cy0] = P(X, top, z);
  const [, cy1] = P(X, top + capH * 0.55, z);
  const [, cy2] = P(X, Y1, z);
  const cw = r1 * 1.55 * s;
  const cush = (c: Ctx) => {
    c.beginPath();
    c.moveTo(bx - r1 * s, cy0);
    c.bezierCurveTo(bx - cw * 1.08, cy0 - (cy0 - cy1) * 0.2, bx - cw * 1.1, cy1 + (cy0 - cy1) * 0.1, bx - cw, cy1);
    c.lineTo(bx + cw, cy1);
    c.bezierCurveTo(bx + cw * 1.1, cy1 + (cy0 - cy1) * 0.1, bx + cw * 1.08, cy0 - (cy0 - cy1) * 0.2, bx + r1 * s, cy0);
    c.closePath();
  };
  const cg = ctx.createLinearGradient(bx - cw, 0, bx + cw, 0);
  cg.addColorStop(0, '#3a2c28');
  cg.addColorStop(0.25, mix('#3a2c28', '#6a5a52', lit));
  cg.addColorStop(0.6, COLUMN.cap);
  cg.addColorStop(1, '#120c0c');
  cush(ctx);
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = inkCol(depth);
  ctx.stroke();
  ctx.fillStyle = '#2e2420';
  ctx.fillRect(bx - cw * 1.05, cy2, cw * 2.1, cy1 - cy2);
  ctx.fillStyle = rgba('#a89a90', 0.45 * lit + 0.1);
  ctx.fillRect(bx - cw * 1.05, cy2, cw * 2.1, Math.max(1, (cy1 - cy2) * 0.22));
  ctx.strokeRect(bx - cw * 1.05, cy2, cw * 2.1, cy1 - cy2);
  // a stone base disc
  ctx.fillStyle = LIME.dark;
  ctx.beginPath();
  ctx.ellipse(bx, by, r0 * s * 1.6, r0 * s * 0.4, 0, 0, P2);
  ctx.fill();
  // its silhouette (for the shade over it)
  return (c: Ctx) => {
    c.moveTo(bx - r0 * s, by);
    c.lineTo(bx - r1 * s, ty);
    c.lineTo(bx - cw, cy1);
    c.lineTo(bx + cw, cy1);
    c.lineTo(bx + r1 * s, ty);
    c.lineTo(bx + r0 * s, by);
    c.closePath();
    c.rect(bx - cw * 1.05, cy2, cw * 2.1, cy1 - cy2);
  };
}

// ——— the frescoes ———
//
// Painted flat (elevations: x along the wall, y down it, R px per unit), then mapped onto the walls. The plaster has
// flaked away in patches: the holes show the stone, their upper-left edges cast a sliver of shadow into them and their
// lower-right broken edges catch the light.

/** The plastered band of each wall (Y), the dado, the stripes, the field and the top border. */
const FY0 = 0.15;
const FY1 = 2.2;
const BEAM = [2.24, 2.37] as Pt;
const PANEL_L = { a0: 1.05, a1: 2.95, R: 330 };
const PANEL_R = { a0: 1.0, a1: 4.1, R: 280 };

const fresCache = new Map<string, HTMLCanvasElement>();

/** Bold wavy veins of an imitation stone (the Minoan dado), over a slab x0…x1 from y0 to y1. */
export function veined(c: Ctx, r: R, x0: number, x1: number, y0: number, y1: number, base: string, veins: string[]): void {
  c.fillStyle = base;
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.save();
  c.beginPath();
  c.rect(x0, y0, x1 - x0, y1 - y0);
  c.clip();
  const h = y1 - y0;
  for (let i = 0; i < 9; i++) {
    const col = veins[i % veins.length];
    const y = y0 + (i / 9 + r() * 0.08) * h;
    c.strokeStyle = rgba(col, 0.75);
    c.lineWidth = 2 + r() * h * 0.06;
    c.beginPath();
    c.moveTo(x0 - 10, y);
    const n = 4;
    for (let k = 1; k <= n; k++) {
      const xx = x0 + ((x1 - x0) * k) / n;
      c.quadraticCurveTo(xx - (x1 - x0) / n / 2, y + (r() - 0.5) * h * 0.5, xx + 6, y + (r() - 0.5) * h * 0.18);
    }
    c.stroke();
  }
  c.restore();
}

/** A row of running spirals (linked S-curves) along y, each `step` apart, radius rad. */
export function spirals(c: Ctx, x0: number, x1: number, y: number, step: number, rad: number, col: string, dot: string, w: number): void {
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = col;
  c.lineWidth = w;
  for (let x = x0 + step / 2, i = 0; x < x1 + step; x += step, i++) {
    const dir = i % 2 ? -1 : 1;
    c.beginPath();
    for (let t = 0; t <= 1; t += 0.04) {
      const th = t * Math.PI * 3.2;
      const rr = rad * (0.18 + t * 0.82);
      const px = x + Math.cos(th) * rr;
      const py = y + Math.sin(th) * rr * dir;
      if (t === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    // the link sweeping on to the next spiral
    c.quadraticCurveTo(x + step * 0.5, y + rad * 1.2 * dir * (i % 2 ? 1 : -1), x + step - rad, y - rad * 0.3 * dir);
    c.stroke();
    c.fillStyle = dot;
    c.beginPath();
    c.arc(x, y, rad * 0.22, 0, P2);
    c.fill();
  }
  c.restore();
}

/** The double axe (the labrys): a shaft and two pairs of curved blades, gilt, outlined in black. */
export function labrys(c: Ctx, x: number, y: number, s: number, gold = '#e4b24c'): void {
  c.save();
  c.lineJoin = 'round';
  // the shaft
  c.fillStyle = '#5a3a20';
  c.fillRect(x - s * 0.04, y - s * 0.62, s * 0.08, s * 1.3);
  const blade = (dir: number, top: number) => {
    c.beginPath();
    c.moveTo(x, y + top * s * 0.06);
    c.quadraticCurveTo(x + dir * s * 0.2, y + top * s * 0.1, x + dir * s * 0.42, y + top * s * 0.44);
    c.quadraticCurveTo(x + dir * s * 0.5, y + top * s * 0.2, x + dir * s * 0.42, y - top * s * 0.02 + top * s * 0.0);
    c.quadraticCurveTo(x + dir * s * 0.22, y + top * s * 0.04, x, y);
    c.closePath();
  };
  for (const dir of [-1, 1]) {
    for (const top of [-1, 1]) {
      blade(dir, top);
      c.fillStyle = gold;
      c.fill();
      c.strokeStyle = FR.black;
      c.lineWidth = s * 0.03;
      c.stroke();
    }
  }
  // the blades' inner shading and a hatched edge
  c.fillStyle = rgba('#8a5a1a', 0.4);
  c.fillRect(x - s * 0.08, y - s * 0.06, s * 0.16, s * 0.12);
  c.fillStyle = FR.black;
  c.beginPath();
  c.arc(x, y - s * 0.66, s * 0.06, 0, P2);
  c.fill();
  c.restore();
}

/** A sacred lily: three stems out of a calyx, the flowers curling over, red stamens. */
export function lily(c: Ctx, x: number, y: number, s: number): void {
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = FR.white;
  c.lineWidth = s * 0.035;
  for (const [dx, h] of [[-0.22, 0.55], [0, 0.72], [0.22, 0.55]] as Pt[]) {
    c.beginPath();
    c.moveTo(x, y + s * 0.4);
    c.quadraticCurveTo(x + dx * s * 0.3, y, x + dx * s, y + s * 0.4 - h * s);
    c.stroke();
    const fx = x + dx * s;
    const fy = y + s * 0.4 - h * s;
    c.fillStyle = FR.white;
    for (const d of [-1, 1]) {
      c.beginPath();
      c.moveTo(fx, fy);
      c.quadraticCurveTo(fx + d * s * 0.16, fy - s * 0.1, fx + d * s * 0.2, fy + s * 0.04);
      c.quadraticCurveTo(fx + d * s * 0.1, fy - s * 0.02, fx, fy + s * 0.03);
      c.fill();
    }
    c.strokeStyle = FR.ochre;
    c.lineWidth = s * 0.02;
    for (const d of [-1, 0, 1]) {
      c.beginPath();
      c.moveTo(fx, fy);
      c.lineTo(fx + d * s * 0.05, fy - s * 0.12);
      c.stroke();
    }
    c.strokeStyle = FR.white;
    c.lineWidth = s * 0.035;
  }
  c.restore();
}

/** A Minoan figure in a fresco: wasp-waisted, long black locks, a kilt; skin red (a youth) or white (a girl). A pose
 * gives the angles (radians) of the body, the arms and the legs. */
export function figure(c: Ctx, x: number, y: number, s: number, skin: string, pose: { body: number; arms: [number, number]; legs: [number, number] }): void {
  c.save();
  c.translate(x, y);
  c.rotate(pose.body);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const limb = (x0: number, y0: number, ang: number, len: number, w: number) => {
    c.strokeStyle = FR.black;
    c.lineWidth = w + s * 0.025;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x0 + Math.sin(ang) * len, y0 + Math.cos(ang) * len);
    c.stroke();
    c.strokeStyle = skin;
    c.lineWidth = w;
    c.stroke();
  };
  // legs from the hip (0, 0), arms from the shoulder (0, -0.5 s)
  limb(-s * 0.03, 0, pose.legs[0], s * 0.62, s * 0.085);
  limb(s * 0.03, 0, pose.legs[1], s * 0.62, s * 0.085);
  // the torso: broad shoulders, a pinched waist
  c.beginPath();
  c.moveTo(-s * 0.15, -s * 0.5);
  c.quadraticCurveTo(-s * 0.04, -s * 0.22, -s * 0.06, -s * 0.06);
  c.lineTo(s * 0.06, -s * 0.06);
  c.quadraticCurveTo(s * 0.04, -s * 0.22, s * 0.15, -s * 0.5);
  c.closePath();
  c.fillStyle = skin;
  c.fill();
  c.strokeStyle = FR.black;
  c.lineWidth = s * 0.02;
  c.stroke();
  // the kilt and belt
  c.fillStyle = FR.blue;
  c.beginPath();
  c.moveTo(-s * 0.09, -s * 0.08);
  c.lineTo(s * 0.09, -s * 0.08);
  c.lineTo(s * 0.13, s * 0.08);
  c.lineTo(-s * 0.11, s * 0.06);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = FR.ochre;
  c.fillRect(-s * 0.08, -s * 0.1, s * 0.16, s * 0.04);
  limb(-s * 0.12, -s * 0.46, pose.arms[0], s * 0.42, s * 0.06);
  limb(s * 0.12, -s * 0.46, pose.arms[1], s * 0.42, s * 0.06);
  // the head: a profile, an almond eye, the long locks flying
  c.fillStyle = skin;
  c.beginPath();
  c.ellipse(0, -s * 0.64, s * 0.085, s * 0.1, 0, 0, P2);
  c.fill();
  c.strokeStyle = FR.black;
  c.lineWidth = s * 0.02;
  c.stroke();
  c.fillStyle = FR.black;
  c.beginPath();
  c.ellipse(s * 0.035, -s * 0.65, s * 0.02, s * 0.01, 0, 0, P2);
  c.fill();
  c.strokeStyle = FR.black;
  c.lineWidth = s * 0.03;
  for (let k = 0; k < 4; k++) {
    c.beginPath();
    c.moveTo(-s * 0.04, -s * 0.72);
    c.bezierCurveTo(-s * 0.16, -s * (0.7 - k * 0.05), -s * 0.12, -s * (0.5 - k * 0.04), -s * (0.22 + k * 0.03), -s * (0.42 - k * 0.06));
    c.stroke();
  }
  c.restore();
}

/** A pied bull in the flying gallop, facing right: its box is 300×170 at scale 1, the forehooves at the right. */
export function bull(c: Ctx, x: number, y: number, k: number): void {
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const body = (g: Ctx) => {
    g.beginPath();
    g.moveTo(62, 46);
    g.bezierCurveTo(110, 36, 160, 22, 198, 30);
    g.bezierCurveTo(232, 36, 248, 50, 262, 62);
    g.bezierCurveTo(274, 70, 286, 86, 294, 100);
    g.bezierCurveTo(292, 108, 282, 110, 272, 106);
    g.bezierCurveTo(262, 104, 252, 100, 244, 100);
    g.bezierCurveTo(262, 108, 284, 112, 306, 116);
    g.lineTo(304, 124);
    g.bezierCurveTo(280, 124, 256, 120, 232, 114);
    g.bezierCurveTo(250, 122, 272, 130, 296, 136);
    g.lineTo(292, 143);
    g.bezierCurveTo(262, 138, 236, 128, 212, 118);
    g.bezierCurveTo(180, 120, 140, 122, 104, 116);
    g.bezierCurveTo(78, 122, 40, 132, 8, 132);
    g.lineTo(6, 124);
    g.bezierCurveTo(36, 120, 60, 112, 74, 104);
    g.bezierCurveTo(56, 112, 30, 118, 2, 116);
    g.lineTo(2, 108);
    g.bezierCurveTo(30, 106, 50, 100, 60, 92);
    g.bezierCurveTo(52, 80, 52, 62, 62, 46);
    g.closePath();
  };
  body(c);
  c.fillStyle = '#7a2c18';
  c.fill();
  c.save();
  body(c);
  c.clip();
  // pied: white patches, ragged-edged; a darker hide along the back
  c.fillStyle = FR.white;
  for (const [px, py, rx, ry] of [[120, 70, 30, 22], [176, 92, 24, 16], [230, 68, 14, 18], [86, 96, 16, 12]] as [number, number, number, number][]) {
    c.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * P2;
      const w = 1 + Math.sin(a * 3 + px) * 0.18 + Math.sin(a * 5 + py) * 0.1;
      const qx = px + Math.cos(a) * rx * w;
      const qy = py + Math.sin(a) * ry * w;
      if (i) c.lineTo(qx, qy);
      else c.moveTo(qx, qy);
    }
    c.fill();
  }
  vfill(c, 0, 20, 320, 30, [[0, 'rgba(40,14,8,0.55)'], [1, 'rgba(40,14,8,0)']]);
  c.restore();
  body(c);
  c.strokeStyle = FR.black;
  c.lineWidth = 4;
  c.stroke();
  // hooves, the eye, the nostril, the tail flying back, the horns sweeping forward
  c.fillStyle = FR.black;
  for (const [hx, hy] of [[304, 120], [294, 140], [4, 128], [3, 112]] as Pt[]) {
    c.beginPath();
    c.ellipse(hx, hy, 5, 4, 0, 0, P2);
    c.fill();
  }
  c.beginPath();
  c.ellipse(266, 76, 4, 3, 0.3, 0, P2);
  c.fill();
  c.fillStyle = FR.white;
  c.beginPath();
  c.arc(267, 75, 1.2, 0, P2);
  c.fill();
  c.strokeStyle = FR.black;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(62, 48);
  c.bezierCurveTo(40, 30, 30, 14, 14, 10);
  c.stroke();
  c.fillStyle = FR.black;
  c.beginPath();
  c.ellipse(12, 10, 7, 4, -0.5, 0, P2);
  c.fill();
  for (const [ox, oy, tx, ty] of [[256, 56, 300, 18], [266, 60, 314, 34]] as [number, number, number, number][]) {
    c.strokeStyle = FR.black;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(ox, oy);
    c.quadraticCurveTo(ox + 4, ty + 10, tx, ty);
    c.stroke();
    c.strokeStyle = '#efe0b8';
    c.lineWidth = 4;
    c.stroke();
  }
  c.restore();
}

/** Cut the flaking into a painted panel: holes where the plaster has gone (more of them low down where damp rose and
 * at the ragged ends), each hole's upper-left edge throwing a sliver of shadow into it, its lower-right edge lit. */
export function flake(c: Ctx, w: number, h: number, seed: number, cover: number): void {
  const [mc, mg] = makeCanvas(w, h);
  mg.drawImage(noiseMask(9, seed, { cover, soft: 0.035, col: '#000000', w: Math.round(w / 2.5), h: Math.round(h / 2.5), oct: 5 }), 0, 0, w, h);
  // the damp line: losses climbing up from the foot
  const [dc, dg] = makeCanvas(w, h);
  dg.drawImage(noiseMask(14, seed + 3, { cover: 0.55, soft: 0.04, col: '#000000', w: Math.round(w / 2.5), h: Math.round(h / 2.5), oct: 5 }), 0, 0, w, h);
  dg.globalCompositeOperation = 'destination-in';
  const dgr = dg.createLinearGradient(0, h * 0.72, 0, h);
  dgr.addColorStop(0, 'rgba(0,0,0,0)');
  dgr.addColorStop(0.5, 'rgba(0,0,0,0.6)');
  dgr.addColorStop(1, 'rgba(0,0,0,1)');
  dg.fillStyle = dgr;
  dg.fillRect(0, 0, w, h);
  mg.drawImage(dc, 0, 0);
  // the ragged top edge of the surviving plaster
  mg.fillStyle = '#000';
  mg.beginPath();
  mg.moveTo(0, 0);
  for (let x = 0; x <= w; x += 6) mg.lineTo(x, 3 + Math.abs(Math.sin(x * 0.05 + seed) * 6 + Math.sin(x * 0.13) * 4));
  mg.lineTo(w, 0);
  mg.closePath();
  mg.fill();
  // and its broken-off ends
  const rag = (y: number) => 12 + Math.abs(Math.sin(y * 0.035 + seed) * 34 + Math.sin(y * 0.11 + seed * 2) * 14 + Math.sin(y * 0.4) * 4);
  for (const side of [0, 1]) {
    mg.beginPath();
    mg.moveTo(side ? w : 0, 0);
    for (let y = 0; y <= h + 8; y += 6) mg.lineTo(side ? w - rag(y + 77) : rag(y), y);
    mg.lineTo(side ? w : 0, h);
    mg.closePath();
    mg.fill();
  }
  // threshold the soft mask into crisp holes
  const id = mg.getImageData(0, 0, w, h);
  for (let i = 3; i < id.data.length; i += 4) id.data[i] = id.data[i] > 110 ? 255 : 0;
  mg.putImageData(id, 0, 0);
  // the lit broken edge: the plaster just below-right of a hole
  const d = Math.max(1.5, w / 400);
  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.globalAlpha = 0.55;
  const [lc, lg] = makeCanvas(w, h);
  lg.drawImage(mc, d * 1.3, d * 1.3);
  lg.globalCompositeOperation = 'source-in';
  lg.fillStyle = '#fff6e0';
  lg.fillRect(0, 0, w, h);
  c.drawImage(lc, 0, 0);
  c.restore();
  // the holes
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.drawImage(mc, 0, 0);
  c.restore();
  // the shadow the plaster's edge throws into the hole, on the stone (behind the plaster: destination-over)
  const [sc2, sg] = makeCanvas(w, h);
  sg.drawImage(c.canvas, d * 1.6, d * 1.6);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = 'rgba(40,26,18,0.32)';
  sg.fillRect(0, 0, w, h);
  c.save();
  c.globalCompositeOperation = 'destination-over';
  c.drawImage(sc2, 0, 0);
  c.restore();
}

/** Age a painted panel: faded patches, grime, a web of fine crazing. */
export function age(c: Ctx, w: number, h: number, seed: number): void {
  lay(c, drift('#f4ead4', '#6a5040', 5, seed, 120, 90), { x: 0, y: 0, w, h }, 0.32);
  lay(c, noiseMask(6, seed + 1, { cover: 0.35, soft: 0.3, col: '#f2e8d2', w: 80, h: 60 }), { x: 0, y: 0, w, h }, 0.35);
  lay(c, noiseMask(22, seed + 2, { cover: 0.5, soft: 0.05, col: '#3a2a20', kind: 'web', w: 300, h: 240 }), { x: 0, y: 0, w, h }, 0.22);
  grain(c, { x: 0, y: 0, w, h }, 'canvas', 0.22, 1.2);
}

/** The left wall's fresco (in the shade): the bull-leapers over a veined dado. */
function frescoLeft(): HTMLCanvasElement {
  const key = 'L';
  const hit = fresCache.get(key);
  if (hit) return hit;
  const { a0, a1, R: k } = PANEL_L;
  const w = Math.round((a1 - a0) * k);
  const h = Math.round((FY1 - FY0) * k);
  const [cv, c] = makeCanvas(w, h);
  const r = rng(hashStr('lb:frescoL'));
  const yOf = (Y: number) => (FY1 - Y) * k;
  const xOf = (a: number) => (a - a0) * k;
  c.fillStyle = FR.white;
  c.fillRect(0, 0, w, h);
  // the dado: slabs of painted veined stone between black-and-white uprights
  for (let a = a0 - 0.1; a < a1; a += 0.42) {
    veined(c, r, xOf(a), xOf(a + 0.38), yOf(0.82), yOf(FY0), r() < 0.5 ? '#c4834e' : '#b86a44', ['#7a2a1a', '#f0d8b0', '#4a1e14']);
    c.fillStyle = FR.black;
    c.fillRect(xOf(a + 0.38), yOf(0.82), 0.04 * k, (0.82 - FY0) * k);
  }
  // the stripes over it
  for (const [y0, y1, col] of [[0.82, 0.86, FR.black], [0.86, 0.9, FR.white], [0.9, 0.95, FR.red]] as [number, number, string][]) {
    c.fillStyle = col;
    c.fillRect(0, yOf(y1), w, (y1 - y0) * k);
  }
  // the field: Egyptian blue, a wavy ground line, the bull and its leapers
  const fy0 = 0.95;
  const fy1 = 1.92;
  c.fillStyle = '#7c98ac';
  c.fillRect(0, yOf(fy1), w, (fy1 - fy0) * k);
  lay(c, drift('#90aabc', '#5a7a90', 4, 18, 80, 40), { x: 0, y: yOf(fy1), w, h: (fy1 - fy0) * k }, 0.35);
  c.fillStyle = '#d6b37a';
  c.beginPath();
  c.moveTo(0, yOf(fy0));
  for (let x = 0; x <= w; x += 8) c.lineTo(x, yOf(fy0 + 0.12 + Math.sin(x * 0.03) * 0.03));
  c.lineTo(w, yOf(fy0));
  c.closePath();
  c.fill();
  // the scene, at its own scale: the bull's box 300×170 → 0.92 units long
  const bk = (1.0 * k) / 300;
  const bx = xOf(1.22);
  const by = yOf(1.58);
  bull(c, bx, by, bk);
  // the youth vaulting its back (head down, legs up), the girl at its horns, a catcher behind it
  figure(c, bx + 150 * bk, yOf(1.82), 0.34 * k, '#b0552e', { body: Math.PI * 0.88, arms: [Math.PI * 0.95, Math.PI * 1.05], legs: [-0.25, 0.1] });
  figure(c, bx + 345 * bk, yOf(1.3), 0.34 * k, '#f2e6d0', { body: -0.2, arms: [-Math.PI * 0.72, -Math.PI * 0.66], legs: [0.3, -0.2] });
  figure(c, bx - 45 * bk, yOf(1.3), 0.34 * k, '#f2e6d0', { body: 0.15, arms: [Math.PI * 0.72, Math.PI * 0.8], legs: [0.3, -0.3] });
  // a second, smaller scene further down the wall: a bull's head between two double axes
  for (const [a, sz] of [[2.4, 0.3], [2.78, 0.3]] as Pt[]) labrys(c, xOf(a), yOf(1.42), sz * k);
  c.save();
  c.translate(xOf(2.59), yOf(1.42));
  c.scale(k / 330, k / 330);
  bullHead(c);
  c.restore();
  // the top border: a band of painted "stone" squares, each spotted, between black lines
  const by0 = 1.92;
  const by1 = 2.2;
  const cols = [FR.blue, FR.ochre, FR.red, '#e8dcc0'];
  for (let a = a0, i = 0; a < a1; a += 0.2, i++) {
    c.fillStyle = cols[i % 4];
    c.fillRect(xOf(a), yOf(by1 - 0.03), 0.2 * k + 1, (by1 - by0 - 0.06) * k);
    c.fillStyle = rgba(i % 4 === 3 ? FR.red : FR.white, 0.7);
    for (let d = 0; d < 5; d++) {
      c.beginPath();
      c.arc(xOf(a + 0.03 + r() * 0.14), yOf(by0 + 0.06 + r() * 0.16), 0.012 * k, 0, P2);
      c.fill();
    }
  }
  c.fillStyle = FR.black;
  c.fillRect(0, yOf(by0 + 0.03), w, 0.025 * k);
  c.fillRect(0, yOf(by1 - 0.005), w, 0.025 * k);
  age(c, w, h, 61);
  flake(c, w, h, 63, 0.13);
  fresCache.set(key, cv);
  return cv;
}

/** A bull's head (a rhyton's), front on, at the origin, about 120 px high: horns, the curly forelock, a rosette. */
export function bullHead(c: Ctx): void {
  c.save();
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(-30, -36);
  c.quadraticCurveTo(-38, 10, -16, 46);
  c.quadraticCurveTo(0, 58, 16, 46);
  c.quadraticCurveTo(38, 10, 30, -36);
  c.quadraticCurveTo(0, -48, -30, -36);
  c.closePath();
  c.fillStyle = FR.black;
  c.fill();
  c.strokeStyle = FR.black;
  c.lineWidth = 3;
  c.stroke();
  // the ears, the horns
  for (const d of [-1, 1]) {
    c.fillStyle = FR.black;
    c.beginPath();
    c.ellipse(d * 40, -26, 14, 6, d * 0.4, 0, P2);
    c.fill();
    c.strokeStyle = FR.ochre;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(d * 24, -38);
    c.quadraticCurveTo(d * 64, -50, d * 56, -96);
    c.stroke();
  }
  // a white muzzle, gilt eyes, a rosette on the brow
  c.fillStyle = FR.white;
  c.beginPath();
  c.ellipse(0, 40, 15, 10, 0, 0, P2);
  c.fill();
  c.fillStyle = FR.ochre;
  for (const d of [-1, 1]) {
    c.beginPath();
    c.ellipse(d * 17, -6, 6, 4, 0, 0, P2);
    c.fill();
  }
  c.fillStyle = FR.red;
  c.beginPath();
  c.arc(0, -22, 7, 0, P2);
  c.fill();
  c.restore();
}

/** The right wall's fresco (in the sun): running spirals over double axes and lilies on red, over a veined dado. The
 * left of it is the far end. */
function frescoRight(): HTMLCanvasElement {
  const key = 'R';
  const hit = fresCache.get(key);
  if (hit) return hit;
  const { a0, a1, R: k } = PANEL_R;
  const w = Math.round((a1 - a0) * k);
  const h = Math.round((FY1 - FY0) * k);
  const [cv, c] = makeCanvas(w, h);
  const r = rng(hashStr('lb:frescoR'));
  const yOf = (Y: number) => (FY1 - Y) * k;
  /** x of a depth z (the far end on the left). */
  const xOf = (z: number) => (a1 - z) * k;
  c.fillStyle = FR.white;
  c.fillRect(0, 0, w, h);
  for (let z = a1 + 0.05; z > a0 - 0.4; z -= 0.46) {
    veined(c, r, xOf(z), xOf(z - 0.42), yOf(0.82), yOf(FY0), r() < 0.5 ? '#d2a256' : '#c8904c', ['#8a4a1e', '#f6e2b8', '#5a8aa8']);
    c.fillStyle = FR.black;
    c.fillRect(xOf(z - 0.42), yOf(0.82), 0.04 * k, (0.82 - FY0) * k);
  }
  for (const [y0, y1, col] of [[0.82, 0.86, FR.black], [0.86, 0.9, FR.ochre], [0.9, 0.95, FR.black]] as [number, number, string][]) {
    c.fillStyle = col;
    c.fillRect(0, yOf(y1), w, (y1 - y0) * k);
  }
  // the field: red ground, double axes and lilies alternating
  const fy0 = 0.95;
  const fy1 = 1.84;
  c.fillStyle = '#a8442c';
  c.fillRect(0, yOf(fy1), w, (fy1 - fy0) * k);
  lay(c, drift('#c8603e', '#6a2416', 4, 28, 100, 30), { x: 0, y: yOf(fy1), w, h: (fy1 - fy0) * k }, 0.5);
  for (let z = a0 + 0.24, i = 0; z < a1; z += 0.32, i++) {
    if (i % 2 === 0) labrys(c, xOf(z), yOf(1.4), 0.5 * k);
    else lily(c, xOf(z), yOf(1.36), 0.42 * k);
  }
  // the top border: running spirals, blue on white, red at their hearts
  const by0 = 1.84;
  const by1 = 2.2;
  c.fillStyle = FR.black;
  c.fillRect(0, yOf(by0 + 0.025), w, 0.025 * k);
  c.fillRect(0, yOf(by1 - 0.005), w, 0.025 * k);
  spirals(c, -0.1 * k, w, yOf((by0 + by1) / 2), 0.3 * k, 0.11 * k, FR.blue, FR.red, 0.03 * k);
  age(c, w, h, 71);
  flake(c, w, h, 73, 0.07);
  fresCache.set(key, cv);
  return cv;
}

// ——— the walls ———

export const WALL_L_BOX = { x: 0, y: 0, w: 800, h: TY + 2 };
export const WALL_R_BOX = { x: 1120, y: 0, w: 800, h: TY + 2 };
const COPE = 0.12;

/** The wall's segments either side of its turning (z from…to). */
const segsOf = (s: number): Pt[] => {
  const g = s < 0 ? LB.gapL : LB.gapR;
  return [[LB.near, g[0]], [g[1], FZ]];
};
const segPath = (s: number, Y0 = -0.6, Y1 = WH) => (c: Ctx) => {
  c.beginPath();
  for (const [z0, z1] of segsOf(s)) {
    const pts = [WP(s, Y0, z0), WP(s, Y1, z0), WP(s, Y1, z1), WP(s, Y0, z1)];
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  }
};

/** The view through a turning: the side passage's far wall (it runs off sideways), its floor, the sky over it. */
function gapView(ctx: Ctx, r: R, s: number): void {
  const [g0, g1] = s < 0 ? LB.gapL : LB.gapR;
  const [xa, ytop] = WP(s, WH, g1);
  const [xb] = WP(s, WH, g0);
  const x0 = Math.min(xa, xb) - 1;
  const x1 = Math.max(xa, xb) + 1;
  const [, yfl] = WP(s, 0, g1);
  ctx.save();
  wallRect(s, g0, g1, -0.6, WH)(ctx);
  ctx.clip();
  // the passage's far wall, face on (its top is level: the passage runs off sideways)
  const box = { x: x0, y: ytop, w: x1 - x0, h: yfl - ytop + 2 };
  const sunny = s < 0;
  // (it faces us, and the sun goes away from us: it's in its own shade, lit by what the sun lights in front of it)
  vfill(ctx, x0, ytop, x1 - x0, yfl - ytop, sunny ? [[0, '#5e5670'], [0.55, '#7a6a70'], [0.85, '#b08a70'], [1, '#e0b07a']] : [[0, '#6e6270'], [0.5, '#544a58'], [1, '#3a3442']]);
  surface(ctx, r, box, sunny ? '#9a8878' : '#7a6c66', { over: true, vary: 0.4, cells: 2, grain: 0.3, grainKind: 'speckle', seed: s < 0 ? 91 : 92 });
  const sc = ppu(g1);
  for (let Y = 0.41; Y < WH; Y += 0.41) {
    const [, yy] = P(0, Y, g1);
    ctx.fillStyle = 'rgba(40,28,30,0.45)';
    ctx.fillRect(x0, yy - 1, x1 - x0, Math.max(1, sc * 0.02));
    ctx.fillStyle = 'rgba(255,230,200,0.14)';
    ctx.fillRect(x0, yy + 1, x1 - x0, 1);
  }
  if (sunny) {
    // the sunlit passage beyond: its floor blazing, its air full of gold light, the light thrown back up its wall
    const [, yf0] = P(0, 0, zAtX(xb));
    ctx.fillStyle = '#ffdca0';
    ctx.fillRect(x0, yfl - 1, x1 - x0, yf0 - yfl + 40);
    vfill(ctx, x0, yfl - (yfl - ytop) * 0.35, x1 - x0, (yfl - ytop) * 0.35, [[0, 'rgba(255,200,130,0)'], [1, 'rgba(255,214,150,0.5)']]);
  } else {
    // the top of it in the sun, above our left wall's shadow
    vfill(ctx, x0, ytop, x1 - x0, (yfl - ytop) * 0.3, [[0, 'rgba(255,190,120,0.25)'], [1, 'rgba(255,190,120,0)']]);
    ctx.fillStyle = '#3e3844';
    ctx.fillRect(x0, yfl - 1, x1 - x0, 60);
  }
  // the coping along its top
  ctx.fillStyle = sunny ? '#f6dcaa' : '#e0c49a';
  ctx.fillRect(x0, ytop, x1 - x0, Math.max(2, sc * COPE));
  // the near wall's end standing in front of it: its occlusion on the far wall beside it
  const xn = s < 0 ? xb : xb;
  creviceV(ctx, xn, ytop, yfl + 40, s < 0 ? 14 : -14, 0.55, '#1a1220');
  ctx.restore();
}

/** One side wall: coursed limestone with a timber tie-beam run through it, the fresco on its plaster, weathering,
 * the light, the coping and its horns, the red gate column at its mouth. */
function wall(ctx: Ctx, r: R, s: number): void {
  const box = s < 0 ? WALL_L_BOX : WALL_R_BOX;
  const map = (z: number, Y: number) => WP(s, Y, z);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  gapView(ctx, r, s);
  ctx.save();
  segPath(s)(ctx);
  ctx.clip();
  // the stone, painted in the sun's light (the shade goes over it after)
  vfill(ctx, box.x, 0, box.w, TY, [[0, LIME.lit], [0.55, LIME.body], [1, mix(LIME.body, LIME.dark, 0.5)]]);
  surface(ctx, r, box, LIME.body, { over: true, vary: 0.45, cells: 5, mottle: 0.35, strokes: 0.4, strokeAng: Math.PI / 2, strokeLen: 120, strokeW: 5, grain: 0.25, grainKind: 'speckle', seed: s < 0 ? 11 : 12 });
  for (const [z0, z1] of segsOf(s)) {
    masonry(ctx, r, map, z0, z1, -0.3, WH - COPE, ppu, { tones: [LIME.lit, LIME.dark, '#c8ae86', '#e6cc9c', '#b8a07e', '#9a8a70'], toneA: 0.45 });
  }
  grain(ctx, box, 'speckle', 0.3, 1.4);
  // the stone's weathering: broad warm and cool drifts, pitting, darker where rain has run
  lay(ctx, drift('#fff0d0', '#6a5440', 12, s < 0 ? 5 : 6, 320, 200), box, 0.2);
  lay(ctx, noiseMask(46, s < 0 ? 7 : 8, { cover: 0.16, soft: 0.04, col: '#4a3a2c', w: 520, h: 420 }), box, 0.3);
  lay(ctx, noiseMask(30, s < 0 ? 9 : 10, { cover: 0.1, soft: 0.04, col: '#fff2dc', w: 400, h: 320 }), box, 0.18);
  // a mason's double axe cut on a few blocks
  for (const [z, Y] of (s < 0 ? [[1.3, 2.62], [2.3, 2.66], [3.9, 2.55]] : [[1.2, 2.6], [1.7, 2.66], [3.0, 2.58]]) as Pt[]) {
    const [mx, my] = map(z, Y);
    masonMark(ctx, mx, my, 0.06 * ppu(z), 0.55);
  }
  // the weather: rain streaks down from the coping, lichen and grime along it, the beam's stain under it
  for (let i = 0; i < 46; i++) {
    const z = LB.near + 0.2 + r() ** 0.7 * (FZ - LB.near - 0.2);
    const [x, y] = map(z, WH - COPE);
    const k = ppu(z);
    streaks(ctx, r, x, y, 0.08 * k, (0.3 + r() * 0.9) * k, r() < 0.3 ? '#4a5a48' : '#4a3a30', 0.16, 2);
  }
  // lichen on the courses under the coping (where water sits): orange and grey-green crusts, laid in perspective
  for (const [z0, z1] of segsOf(s)) {
    for (let i = 0; i < 60; i++) {
      const z = z0 + r() * (z1 - z0);
      const Y = WH - COPE - r() ** 1.6 * 0.7;
      const [lx, ly] = map(z, Y);
      const k = ppu(z);
      ctx.fillStyle = rgba(r() < 0.55 ? '#c8a050' : '#8a9a78', 0.25 + r() * 0.3);
      ctx.beginPath();
      ctx.ellipse(lx, ly, (0.01 + r() * 0.02) * k * (z / 2), (0.012 + r() * 0.025) * k, 0, 0, P2);
      ctx.fill();
    }
  }
  // the timber tie-beam: grey weathered wood, its grain running down the wall, split in places
  for (const [z0, z1] of segsOf(s)) {
    const bp = wallRect(s, z0, z1, BEAM[0], BEAM[1]);
    ctx.fillStyle = '#7a6448';
    bp(ctx);
    ctx.fill();
    within(ctx, bp, () => {
      for (let k = 0; k < 7; k++) {
        const Y = BEAM[0] + ((k + 0.5) / 7) * (BEAM[1] - BEAM[0]);
        ctx.fillStyle = rgba(k % 2 ? '#3a2a1c' : '#b8a080', 0.28);
        band(map, z0, z1, Y - 0.004, Y + 0.004)(ctx);
        ctx.fill();
      }
      ctx.fillStyle = rgba('#d8c4a0', 0.35);
      band(map, z0, z1, BEAM[1] - 0.02, BEAM[1])(ctx);
      ctx.fill();
      ctx.fillStyle = rgba('#20140c', 0.5);
      band(map, z0, z1, BEAM[0], BEAM[0] + 0.025)(ctx);
      ctx.fill();
      for (let z = z0 + 0.4; z < z1; z += 0.9 + r() * 0.6) {
        ctx.fillStyle = rgba('#1a100a', 0.7);
        band(map, z, z + 0.012, BEAM[0] + 0.02, BEAM[1] - 0.02)(ctx);
        ctx.fill();
      }
    });
  }
  // the fresco band on its plaster
  if (s < 0) {
    const fc = frescoLeft();
    const { a0, a1 } = PANEL_L;
    mapToWall(ctx, fc, s, a0, a1, FY0, FY1);
    // the bit of it that survives past the turning
    mapToWall(ctx, fc, s, LB.gapL[1], FZ - 0.02, FY0, FY1, 0.1, 0.4);
  } else {
    const fc = frescoRight();
    const { a0, a1 } = PANEL_R;
    mapToWall(ctx, fc, s, a0, a1, FY0, FY1, 0, 1, a0, LB.gapR[0]);
    mapToWall(ctx, fc, s, a0, a1, FY0, FY1, 0, 1, LB.gapR[1], a1);
  }
  // stains under the beam, rising damp and grime at the foot
  for (let i = 0; i < 22; i++) {
    const z = LB.near + 0.25 + r() * (FZ - LB.near - 0.3);
    const [x, y] = map(z, BEAM[0]);
    const k = ppu(z);
    streaks(ctx, r, x, y, 0.06 * k, (0.15 + r() * 0.35) * k, '#3a2a1e', 0.14, 2);
  }
  softly(ctx, box, (g) => {
    for (const [z0, z1] of segsOf(s)) {
      const p = [map(z0, -0.6), map(z0, 0.5), map(z1, 0.5), map(z1, -0.6)];
      const [gx, gy0] = map((z0 + z1) / 2, 0.5);
      const [, gy1] = map((z0 + z1) / 2, 0);
      const gr = g.createLinearGradient(gx, gy0, gx, gy1);
      gr.addColorStop(0, 'rgba(60,64,48,0)');
      gr.addColorStop(1, 'rgba(60,64,48,0.5)');
      g.fillStyle = gr;
      polyPath(p)(g);
      g.fill();
    }
  }, 0.25);
  ctx.restore();

  // ——— the light ———
  ctx.save();
  segPath(s, -0.6, WH)(ctx);
  ctx.clip();
  if (s < 0) {
    // all in the shade, lit by the sky; the sunlit right wall bounces gold back onto it, most strongly up high
    shadeWith(ctx, box, SHADE, (g) => {
      segPath(s, -0.6, WH + 0.2)(g);
      g.fill();
    });
    softly(ctx, box, (g) => {
      for (const [z0, z1] of segsOf(s)) {
        polyPath([map(z0, 0.9), map(z0, 2.2), map(z1, 2.2), map(z1, 0.9)])(g);
        g.fillStyle = 'rgba(255,176,104,0.06)';
        g.fill();
      }
      // and the floor's slab of sun near the turning
      const [px, py] = map(LB.gapL[0] - 0.05, 0.3);
      const gr = g.createRadialGradient(px, py, 0, px, py, 120);
      gr.addColorStop(0, 'rgba(255,190,120,0.3)');
      gr.addColorStop(1, 'rgba(255,190,120,0)');
      g.fillStyle = gr;
      g.fillRect(px - 120, py - 120, 240, 240);
    }, 0.25, 'screen');
  } else {
    const sh = shadowY(XW);
    const pz = patchZ(XW);
    const off = 2 * XW * LB.away;
    shadeWith(ctx, box, SHADE, (g) => {
      // below the line of the left wall's shadow (and its horns' shadows above it), but not the slab of sun from
      // the turning, plus the gate column's shadow
      polyPath([map(LB.near, -0.6), map(LB.near, sh), map(FZ, sh), map(FZ, -0.6)])(g);
      g.fill();
      // (the horns stand edge-on to the sun: their shadows are thin spikes up from the line)
      for (const zh of HORNS_L) {
        for (const dz of [-0.035, 0.035]) {
          const z = zh + off + dz;
          polyPath([map(z - 0.012, sh - 0.02), map(z, sh + HORN_H * 0.9), map(z + 0.012, sh - 0.02)])(g);
          g.fill();
        }
      }
      const gz = LB.gate.z + 0.006;
      polyPath([map(gz - 0.12, -0.6), map(gz - 0.12, 2.15), map(gz + 0.12, 2.15), map(gz + 0.12, -0.6)])(g);
      g.fill();
      g.globalCompositeOperation = 'destination-out';
      polyPath([map(pz[0], -0.6), map(pz[0], sh + 0.01), map(pz[1], sh + 0.01), map(pz[1], -0.6)])(g);
      g.fill();
    });
    // the sun's warmth on what it reaches
    ctx.save();
    polyPath([map(LB.near, sh), map(LB.near, WH + 0.5), map(FZ, WH + 0.5), map(FZ, sh)])(ctx);
    ctx.clip();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = rgba(SUN, 0.6);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = rgba('#ff9a40', 0.22);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = rgba('#ffb868', 0.28);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.restore();
    // the beam's thin shadow on the lit wall under it
    ctx.fillStyle = rgba('#3a2a30', 0.3);
    for (const [z0, z1] of segsOf(s)) {
      band(map, z0, z1, BEAM[0] - 0.035, BEAM[0])(ctx);
      ctx.fill();
    }
  }
  ctx.restore();

  // ——— the coping and its horns ———
  const sunX = 430;
  const sunY = 40;
  for (const [z0, z1] of segsOf(s)) {
    const cp = wallRect(s, z0, z1, WH - COPE, WH);
    ctx.fillStyle = s < 0 ? '#8a849a' : '#f2d8a8';
    cp(ctx);
    ctx.fill();
    // its underside, seen from below, in its own shadow
    ctx.fillStyle = rgba(s < 0 ? '#1e1828' : '#5a3a2a', 0.7);
    band(map, z0, z1, WH - COPE - 0.035, WH - COPE + 0.015)(ctx);
    ctx.fill();
  }
  const hz = s < 0 ? HORNS_L : HORNS_R;
  for (const zh of hz) {
    const pts = hornsOnWall(s, zh, HORN_LEN, HORN_H);
    const path = polyPath(pts);
    const bb = boxOfPts(pts);
    hornsPaint(ctx, path, bb, s > 0, lineW(zh), 0.016 * ppu(zh));
  }
  // the coping's top edge against the sky: the backlit left one rimmed in gold
  ctx.save();
  ctx.lineCap = 'round';
  for (const [z0, z1] of segsOf(s)) {
    const [ax, ay] = map(z0, WH);
    const [bx, by] = map(z1, WH);
    ctx.strokeStyle = s < 0 ? rgba('#ffe0a0', 0.8) : rgba('#fff0cc', 0.6);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.restore();
  if (s < 0) {
    // the sun's bloom spilling over the left wall's top, in the air in front of it
    glowAt(ctx, sunX, sunY + 20, 260, '#ffd89a', 0.22);
  }
  // ——— the gate column at the passage's mouth ———
  gateColumn(ctx, s);
  ctx.restore();
}

/** Horns of consecration: stone, lit by the sun (the right wall's) or against it (the left's: in their own shade, their
 * sky-facing edges rimmed in gold). */
export function hornsPaint(ctx: Ctx, path: (c: Ctx) => void, bb: { x: number; y: number; w: number; h: number }, lit: boolean, lw: number, rimW: number): void {
  const g = ctx.createLinearGradient(bb.x, bb.y, bb.x + bb.w, bb.y + bb.h);
  if (lit) {
    g.addColorStop(0, '#f4e2c0');
    g.addColorStop(0.45, '#dcc29a');
    g.addColorStop(1, '#a08466');
  } else {
    g.addColorStop(0, '#9a8a98');
    g.addColorStop(0.5, '#6e6078');
    g.addColorStop(1, '#4a3e56');
  }
  path(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path(ctx);
  ctx.clip();
  grain(ctx, bb, 'stone', 0.3, 0.8);
  if (!lit) {
    ctx.translate(rimW * 0.6, rimW * 0.6);
    ctx.strokeStyle = rgba('#ffd890', 0.55);
    ctx.lineWidth = rimW * 0.9;
    path(ctx);
    ctx.stroke();
  } else {
    ctx.translate(-rimW, -rimW);
    ctx.strokeStyle = rgba('#7a4a2a', 0.5);
    ctx.lineWidth = rimW * 1.6;
    path(ctx);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = lit ? '#5a3a24' : '#2a2030';
  ctx.lineWidth = Math.max(1, lw * 0.7);
  path(ctx);
  ctx.stroke();
}

/** A band on a side wall (z0…z1, Y0…Y1). */
const band = (map: (z: number, Y: number) => Pt, z0: number, z1: number, Y0: number, Y1: number) => quadPath(map(z0, Y0), map(z1, Y0), map(z1, Y1), map(z0, Y1));
const lineW = (z: number) => 3.2 * Math.min(1, 1.2 / z);

/** A warm glow along the edge of a shape that faces a light behind it. */
function edgeGlow(ctx: Ctx, path: (c: Ctx) => void, lx: number, ly: number, col: string, a: number, w: number): void {
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(col, a);
  ctx.lineWidth = w * 2;
  ctx.shadowColor = rgba(col, a);
  ctx.shadowBlur = w * 1.5;
  // offset the outline away from the light so only the light-facing edge shows inside the clip
  ctx.translate(-w * 0.6, -w * 0.6);
  void lx;
  void ly;
  path(ctx);
  ctx.stroke();
  ctx.restore();
}

/** A red column at the passage's mouth, topped by an impost and a little pair of horns. */
function gateColumn(ctx: Ctx, s: number): void {
  const X = s * LB.gate.X;
  const z = LB.gate.z;
  const k = ppu(z);
  const top = 1.95;
  // its contact with the wall behind it (occlusion), and on the right its sun shadow is already on the wall
  const [cx] = P(X, 0, z);
  const [, ty] = P(X, top + 0.2, z);
  ctx.save();
  const og = ctx.createLinearGradient(cx - 0.3 * k * s, 0, cx + 0.35 * k * s, 0);
  og.addColorStop(0, 'rgba(20,14,20,0)');
  og.addColorStop(0.5, 'rgba(20,14,20,0.35)');
  og.addColorStop(1, 'rgba(20,14,20,0)');
  ctx.fillStyle = og;
  ctx.fillRect(Math.min(cx - 0.3 * k * s, cx + 0.35 * k * s), ty, 0.65 * k, TY - ty);
  ctx.restore();
  const lit = s < 0 ? 0.15 : 0.9;
  const sil = redColumn(ctx, X, z, -0.4, top, 0.1, 0.02, lit);
  // the impost block and its horns
  const iw = 0.17;
  const imp = quadPath(P(X - iw, top, z), P(X + iw, top, z), P(X + iw, top + 0.07, z), P(X - iw, top + 0.07, z));
  solid(ctx, imp, boxOfPts([P(X - iw, top + 0.07, z), P(X + iw, top, z)]), 'stone', s < 0 ? '#a09aa8' : '#f0d4a4', { depth: 0.02, line: 2.4, formSize: 6 });
  const hp = HORNS.map(([u, v]) => P(X + (u - 0.5) * 0.3, top + 0.07 + v * 0.2, z));
  solid(ctx, polyPath(hp), boxOfPts(hp), 'stone', s < 0 ? '#aaa2b0' : '#f6dcae', { depth: 0.02, line: 2.6, formSize: 8 });
  // the shade over it: the left one all in shade (its sky-facing edge lit), the right one below the shadow line
  const shaft = (c: Ctx) => {
    c.beginPath();
    sil(c);
  };
  const bb = boxOfPts([P(X - 0.22, top + 0.32, z), P(X + 0.22, -0.4, z)], 8);
  if (s < 0) {
    shadeWith(ctx, bb, SHADE, (g) => {
      shaft(g);
      g.fill();
    });
    edgeGlow(ctx, polyPath(hp), 430, 40, '#ffd890', 0.7, 3);
  } else {
    const ys = shadowY(LB.gate.X);
    shadeWith(ctx, bb, SHADE, (g) => {
      shaft(g);
      g.clip();
      polyPath([P(X - 0.3, -0.4, z), P(X - 0.3, ys, z), P(X + 0.3, ys, z), P(X + 0.3, -0.4, z)])(g);
      g.fill();
    });
  }
}

// ——— the floor of the passage ———

export const FLOOR_BOX = { x: 0, y: 560, w: W, h: TY - 560 + 2 };
const ZN = 1.3;
const floorPath = () => polyPath([P(-XW, 0, ZN), P(-XW, 0, FZ), P(XW, 0, FZ), P(XW, 0, ZN)]);
const floorPatch = () => {
  const a = patchZ(-XW);
  const b = patchZ(XW);
  return polyPath([P(-XW, 0, a[0]), P(-XW, 0, a[1]), P(XW, 0, b[1]), P(XW, 0, b[0])]);
};
/** The thread's line across the floor (X at depth z), from the ball at our feet to the doorway. */
const BALL = { X: 0.55, z: 1.78, r: 0.075 };
const threadX = (z: number) => {
  const t = clamp01((z - BALL.z) / (FZ - 0.05 - BALL.z));
  return BALL.X + (0.04 - BALL.X) * t + Math.sin(t * 8.5 + 0.4) * 0.3 * (1 - t * 0.75) * Math.min(1, t * 6);
};

function floor(ctx: Ctx, r: R): void {
  const fp = floorPath();
  const b = FLOOR_BOX;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();
  fp(ctx);
  ctx.clip();
  vfill(ctx, 0, b.y, W, b.h, [[0, '#c8b28a'], [1, '#b49a74']]);
  surface(ctx, r, b, '#bea47c', { over: true, vary: 0.4, cells: 6, mottle: 0.35, strokes: 0.2, strokeAng: 0, strokeLen: 200, strokeW: 3, grain: 0.32, grainKind: 'speckle', seed: 21 });
  // the paving: big irregular limestone flags in rows, worn hollow and smooth down the middle where feet have gone
  const sc = (z: number) => ppu(z);
  let z1 = FZ;
  while (z1 > ZN) {
    const z0 = Math.max(ZN - 0.4, z1 - (0.3 + r() * 0.2));
    let X0 = -XW - r() * 0.4;
    while (X0 < XW) {
      const X1 = X0 + 0.45 + r() * 0.45;
      const j = () => (r() - 0.5) * 0.04;
      const pts: Pt[] = [P(X0 + 0.02 + j(), 0, z0 + 0.012), P(X1 - 0.02 + j(), 0, z0 + 0.012 + j() * 0.5), P(X1 - 0.02 + j(), 0, z1 - 0.012), P(X0 + 0.02 + j(), 0, z1 - 0.012)];
      const mid = Math.abs((X0 + X1) / 2) < 0.7;
      ctx.fillStyle = rgba(mid ? (r() < 0.5 ? '#ead8b4' : '#d8c29c') : r() < 0.5 ? '#d6c09a' : r() < 0.5 ? '#a88e6c' : '#8a7a68', mid ? 0.4 : 0.25 + r() * 0.25);
      polyPath(pts)(ctx);
      ctx.fill();
      // its far arris lit by the sky, its near edge sunk a little (the joint's shadow)
      const k = sc((z0 + z1) / 2);
      ctx.strokeStyle = rgba('#3a2a20', 0.32);
      ctx.lineWidth = Math.max(0.7, k * 0.009);
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      ctx.lineTo(...pts[1]);
      ctx.lineTo(...pts[2]);
      ctx.lineTo(...pts[3]);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff2d8', 0.25);
      ctx.lineWidth = Math.max(0.6, k * 0.006);
      ctx.beginPath();
      ctx.moveTo(pts[3][0], pts[3][1] + 1.2);
      ctx.lineTo(pts[2][0], pts[2][1] + 1.2);
      ctx.stroke();
      if (r() < 0.25) crack(ctx, r, (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[3][1]) / 2, (r() - 0.5) * 0.8, k * 0.25, { col: '#3a2a20', lip: '#f0e0c0', w: Math.max(0.8, k * 0.006), a: 0.45, branch: 0.2 });
      X0 = X1;
    }
    z1 = z0;
  }
  // grit and dust drifted along the walls' feet, flakes of fallen fresco in it
  softly(ctx, b, (g) => {
    for (const s of [-1, 1]) {
      g.fillStyle = 'rgba(226,206,168,0.55)';
      polyPath([P(s * XW, 0, ZN), P(s * (XW - 0.32), 0, ZN), P(s * (XW - 0.12), 0, FZ), P(s * XW, 0, FZ)])(g);
      g.fill();
    }
  }, 0.25);
  for (let i = 0; i < 90; i++) {
    const s = r() < 0.5 ? -1 : 1;
    const z = ZN + r() * (FZ - ZN);
    const X = s * (XW - r() ** 2 * 0.35);
    const [px, py] = P(X, 0, z);
    const k = ppu(z);
    ctx.fillStyle = r() < 0.4 ? rgba([FR.red, FR.blue, FR.ochre][Math.floor(r() * 3)], 0.7) : rgba(r() < 0.5 ? '#e8dcc0' : '#7a6a58', 0.6);
    ctx.beginPath();
    ctx.ellipse(px, py, (0.008 + r() * 0.015) * k, (0.004 + r() * 0.006) * k, 0, 0, P2);
    ctx.fill();
  }
  // the bones of those who came before, along the left wall, and in the slab of sun on the right
  bones(ctx, r, -1.55, 2.8, 1);
  bones(ctx, r, 1.5, 3.55, -1);
  // Ariadne's thread: a red woollen yarn from the ball at our feet, along the floor, into the doorway
  thread(ctx);
  yarnBall(ctx);
  // the light: the floor's in the walls' shade, but for the slab of sun from the turning
  shadeWith(ctx, b, SHADE_FLOOR, (g) => {
    floorPath()(g);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    floorPatch()(g);
    g.fill();
  });
  ctx.save();
  floorPatch()(ctx);
  ctx.clip();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = rgba(SUN, 0.65);
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = rgba('#ffc070', 0.42);
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.restore();
  // the sky's cool on the far floor, the walls' feet in occlusion, the façade's foot
  for (const s of [-1, 1]) {
    softly(ctx, b, (g) => {
      g.fillStyle = 'rgba(20,14,30,0.45)';
      polyPath([P(s * XW, 0, ZN), P(s * (XW - 0.14), 0, ZN), P(s * (XW - 0.06), 0, FZ), P(s * XW, 0, FZ)])(g);
      g.fill();
    }, 0.25);
  }
  const [fx0, fy] = P(-XW, 0, FZ);
  const [fx1] = P(XW, 0, FZ);
  crevice(ctx, fx0, fx1, fy, 8, 0.45, '#1e1628');
  ctx.restore();
}

/** A skull and a scatter of bones lying at (X, z) on the floor (lean −1/1: which way the scatter runs). */
function bones(ctx: Ctx, r: R, X: number, z: number, lean: number): void {
  const k = ppu(z);
  const bone = (bx: number, bzz: number, len: number, ang: number) => {
    const [x, y] = P(bx, 0.02, bzz);
    const c = Math.cos(ang);
    const sn = Math.sin(ang) * 0.4;
    const L = len * k;
    const rr = 0.022 * k;
    groundShadow(ctx, x + rr, y + rr * 0.6, L * 0.55, rr * 1.2, 0.35, '#1a1020');
    const p = (g: Ctx) => {
      g.beginPath();
      g.moveTo(x - (c * L) / 2, y - (sn * L) / 2 - rr * 0.6);
      g.lineTo(x + (c * L) / 2, y + (sn * L) / 2 - rr * 0.6);
      g.arc(x + (c * L) / 2, y + (sn * L) / 2, rr, -Math.PI / 2, Math.PI / 2);
      g.lineTo(x - (c * L) / 2, y - (sn * L) / 2 + rr * 0.6);
      g.arc(x - (c * L) / 2, y - (sn * L) / 2, rr, Math.PI / 2, Math.PI * 1.5);
      g.closePath();
    };
    solid(ctx, p, { x: x - L, y: y - rr * 2, w: L * 2, h: rr * 4 }, 'stone', '#e6dcc4', { depth: 0.3, air: AIR, line: Math.max(1, k * 0.008), formSize: 2 });
  };
  for (let i = 0; i < 5; i++) bone(X + lean * (0.05 + r() * 0.35), z - 0.25 + r() * 0.5, 0.14 + r() * 0.16, (r() - 0.5) * 2.4);
  // ribs: a curl of thin arcs
  const [rx, ry] = P(X + lean * 0.22, 0.02, z + 0.12);
  ctx.strokeStyle = rgba('#e0d4bc', 0.9);
  ctx.lineWidth = Math.max(1, k * 0.01);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(rx + i * k * 0.03 * lean, ry, k * 0.08, k * 0.025, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  // the skull, its jaw fallen away
  const [sx0, sy0] = P(X, 0.06, z);
  const s = 0.075 * k;
  groundShadow(ctx, sx0 + s * 0.4, sy0 + s * 0.9, s * 1.3, s * 0.35, 0.5, '#1a1020');
  const cr = (c: Ctx) => {
    c.beginPath();
    c.ellipse(sx0, sy0 - s * 0.1, s, s * 0.88, 0, Math.PI * 0.92, Math.PI * 2.08);
    c.quadraticCurveTo(sx0 + s * 0.8, sy0 + s * 0.7, sx0 + s * 0.45, sy0 + s * 0.8);
    c.lineTo(sx0 - s * 0.45, sy0 + s * 0.8);
    c.quadraticCurveTo(sx0 - s * 0.8, sy0 + s * 0.7, sx0 - s, sy0 - s * 0.1);
    c.closePath();
  };
  solid(ctx, cr, { x: sx0 - s, y: sy0 - s, w: s * 2, h: s * 2 }, 'stone', '#ece2ca', { depth: 0.3, air: AIR, line: Math.max(1, k * 0.009), formSize: s * 0.5 });
  ctx.fillStyle = '#1a1210';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx0 + d * s * 0.38, sy0 + s * 0.12, s * 0.24, s * 0.27, 0, 0, P2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(sx0, sy0 + s * 0.36);
  ctx.lineTo(sx0 - s * 0.12, sy0 + s * 0.6);
  ctx.lineTo(sx0 + s * 0.12, sy0 + s * 0.6);
  ctx.fill();
}

function thread(ctx: Ctx): void {
  const pts: [number, number, number][] = [];
  for (let z = BALL.z; z <= FZ - 0.02; z += 0.02) {
    const [x, y] = P(threadX(z), 0.006, z);
    pts.push([x, y, ppu(z)]);
  }
  // then up over the threshold step and in
  const [ex, ey] = P(0.04, 0.09, FZ - 0.1);
  const [dx, dy] = P(0.06, 0.09, FZ + 0.1);
  pts.push([ex, ey, ppu(FZ)], [dx, dy, ppu(FZ)]);
  ctx.save();
  ctx.lineCap = 'round';
  for (const [col, wk, oy] of [['rgba(20,10,10,0.35)', 0.024, 1.5], ['#8a1a14', 0.016, 0], ['#d63a26', 0.009, -0.4]] as [string, number, number][]) {
    ctx.strokeStyle = col;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay, ka] = pts[i - 1];
      const [bx, by] = pts[i];
      ctx.lineWidth = Math.max(0.7, ka * wk);
      ctx.beginPath();
      ctx.moveTo(ax + oy, ay + oy * 0.5);
      ctx.lineTo(bx + oy, by + oy * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function yarnBall(ctx: Ctx): void {
  const [x, y] = P(BALL.X, BALL.r, BALL.z);
  const rr = BALL.r * ppu(BALL.z);
  groundShadow(ctx, x + rr * 0.4, y + rr * 0.92, rr * 1.5, rr * 0.4, 0.8, '#1a0c10');
  const ball = (c: Ctx) => {
    c.beginPath();
    c.arc(x, y, rr, 0, P2);
  };
  solid(ctx, ball, { x: x - rr, y: y - rr, w: rr * 2, h: rr * 2 }, 'knit', '#c8301e', { depth: 0.1, line: 2, formSize: rr * 0.5 });
  within(ctx, ball, () => {
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = rgba(i % 2 ? '#ff7a5a' : '#5a0c0a', 0.5);
      ctx.beginPath();
      ctx.ellipse(x, y, rr * (0.5 + (i % 5) * 0.12), rr * 1.1, (i / 10) * Math.PI, 0, P2);
      ctx.stroke();
    }
  });
}

// ——— props against the walls ———

export const PROPS_BOX = { x: 580, y: 500, w: 200, h: 220 };

/** A figure-of-eight shield of dappled ox-hide leaning against the left wall. */
function shield(ctx: Ctx): void {
  const X = -XW + 0.2;
  const zc = 2.35;
  const H = 1.0;
  // turned half towards us (u across it, v up), leaning back: its top against the wall, its foot out on the floor
  const at = (u: number, v: number): Pt => P(X + u * 0.24 + (1 - v) * 0.08 - v * 0.06, v * H, zc - u * 0.1);
  const lobe = (v0: number, v1: number, w: number): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * P2;
      out.push(at(Math.cos(a) * w, (v0 + v1) / 2 + (Math.sin(a) * (v1 - v0)) / 2));
    }
    return out;
  };
  const upper = lobe(0.47, 1, 0.92);
  const lower = lobe(0.02, 0.56, 1.02);
  const path = (c: Ctx) => {
    polyPath(upper)(c);
    const p2 = lower;
    c.moveTo(...p2[0]);
    for (const p of p2) c.lineTo(...p);
    c.closePath();
  };
  const bb = boxOfPts([...upper, ...lower], 6);
  castShadow(ctx, path, 8, 10, 0.55, '#140c1c');
  groundShadow(ctx, at(0.2, 0)[0], at(0, 0)[1], 30, 6, 0.6, '#120a18');
  solid(ctx, path, bb, 'leather', '#d8ccb4', { depth: 0.35, air: AIR, line: 1.8, formSize: 10 });
  within(ctx, path, () => {
    // the hide's dapples
    const rr = rng(hashStr('lb:shield'));
    for (let i = 0; i < 9; i++) {
      const [px, py] = at((rr() - 0.5) * 1.6, 0.1 + rr() * 0.85);
      ctx.fillStyle = rgba(rr() < 0.6 ? '#5a3220' : '#2a1a14', 0.8);
      ctx.beginPath();
      ctx.ellipse(px, py, 3 + rr() * 5, 5 + rr() * 8, 0, 0, P2);
      ctx.fill();
    }
    // the waist where the lobes meet, pinched in by its frame
    const [wx0, wy] = at(-1, 0.54);
    const [wx1] = at(1, 0.54);
    ctx.fillStyle = 'rgba(30,18,14,0.4)';
    ctx.fillRect(wx0, wy - 3, wx1 - wx0, 6);
  });
  // a rim of hide and a boss strap
  ctx.strokeStyle = '#6a4a30';
  ctx.lineWidth = 2;
  path(ctx);
  ctx.stroke();
  // the cool shade over it
  shadeWith(ctx, bb, SHADE, (g) => {
    path(g);
    g.fill();
  });
  crevice(ctx, bb.x, bb.x + bb.w, at(0, 0)[1], 4, 0.4, '#140c1c');
}

// ——— the braziers ———

/** A bronze tripod brazier at (X, z) on the floor: a shallow bowl with a beaded lip and a band of running spirals,
 * three legs with lion's-paw feet, a ring bracing them; in the shade, its rim lit by its own fire (lit 0…1). */
function brazier(ctx: Ctx, X: number, z: number, lit: number): void {
  const k = ppu(z);
  const Y = LB.bowlY;
  const R0 = 0.27;
  const legTop = Y - 0.26;
  const footR = 0.3;
  // the floor's occlusion under it
  const [fx, fy] = P(X, 0, z);
  groundShadow(ctx, fx + k * 0.05, fy + k * 0.02, k * 0.4, k * 0.075, 0.75, '#0e0812');
  const legs = [Math.PI * 0.5, Math.PI * 1.2, Math.PI * 1.8];
  const legPath = (a: number) => {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const [tx, ty] = P(X + ca * 0.07, legTop, z + sa * 0.07);
    const [kx, ky] = P(X + ca * 0.13, 0.5, z + sa * 0.13);
    const [bx, by] = P(X + ca * footR, 0.07, z + sa * footR);
    const w = 0.03 * k;
    return (c: Ctx) => {
      c.beginPath();
      c.moveTo(tx - w * 0.8, ty);
      c.bezierCurveTo(kx - w * 1.1, ky, kx - w * 0.9 + (bx - kx) * 0.3, by - (by - ky) * 0.25, bx - w * 0.7, by);
      c.lineTo(bx + w * 0.7, by);
      c.bezierCurveTo(kx + w * 0.9 + (bx - kx) * 0.3, by - (by - ky) * 0.25, kx + w * 1.1, ky, tx + w * 0.8, ty);
      c.closePath();
    };
  };
  const paw = (a: number) => {
    const [px, py] = P(X + Math.cos(a) * footR, 0.03, z + Math.sin(a) * footR);
    groundShadow(ctx, px + 2, py + 2, k * 0.05, k * 0.016, 0.5, '#120a18');
    const p = (c: Ctx) => {
      c.beginPath();
      c.ellipse(px, py, k * 0.04, k * 0.03, 0, Math.PI, 0);
      c.lineTo(px + k * 0.045, py + k * 0.02);
      c.lineTo(px - k * 0.045, py + k * 0.02);
      c.closePath();
    };
    solid(ctx, p, { x: px - k * 0.05, y: py - k * 0.04, w: k * 0.1, h: k * 0.07 }, 'chrome', BRONZE.shade, { depth: 0.2, air: AIR, line: Math.max(1, k * 0.007), formSize: 3 });
  };
  const legBox = boxOfPts([P(X - footR, legTop, z), P(X + footR, 0, z)], k * 0.06);
  // the back leg, the ring, the front legs
  const order = [...legs].sort((a, b) => Math.sin(b) - Math.sin(a));
  const ring = (front: boolean) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = front ? Math.PI + (i / 24) * Math.PI : (i / 24) * Math.PI;
      pts.push(P(X + Math.cos(a) * 0.15, 0.36, z + Math.sin(a) * 0.15));
    }
    ctx.strokeStyle = BRONZE.deep;
    ctx.lineWidth = Math.max(1.2, k * 0.022);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = front ? BRONZE.body : BRONZE.shade;
    ctx.lineWidth = Math.max(0.8, k * 0.012);
    ctx.stroke();
  };
  for (const [i, a] of order.entries()) {
    if (i === 1) ring(false);
    solid(ctx, legPath(a), legBox, 'chrome', Math.sin(a) > 0 ? BRONZE.shade : BRONZE.body, { depth: 0.2, air: AIR, line: Math.max(1, k * 0.008), formSize: 4 });
    paw(a);
  }
  ring(true);
  // the bowl: seen from a little below, so its underside shows and the near lip hides the coals
  const [bx, by] = P(X, Y, z);
  const rx = R0 * k;
  const [, byl] = P(X, Y - 0.24, z);
  // the stem from the bowl's foot down to where the legs meet: a knop and a collar
  const [, sy0] = P(X, Y - 0.2, z);
  const [, sy1] = P(X, legTop - 0.02, z);
  const stem = (c: Ctx) => {
    c.beginPath();
    c.moveTo(bx - k * 0.035, sy0);
    c.lineTo(bx + k * 0.035, sy0);
    c.lineTo(bx + k * 0.05, sy1);
    c.lineTo(bx - k * 0.05, sy1);
    c.closePath();
  };
  solid(ctx, stem, { x: bx - k * 0.06, y: sy0, w: k * 0.12, h: sy1 - sy0 + 2 }, 'chrome', BRONZE.body, { depth: 0.2, air: AIR, line: Math.max(1, k * 0.007), formSize: 3 });
  const knop = (c: Ctx) => {
    c.beginPath();
    c.ellipse(bx, sy1, k * 0.07, k * 0.025, 0, 0, P2);
  };
  solid(ctx, knop, { x: bx - k * 0.08, y: sy1 - k * 0.03, w: k * 0.16, h: k * 0.06 }, 'chrome', BRONZE.body, { depth: 0.2, air: AIR, line: Math.max(1, k * 0.007), formSize: 3 });
  const bowl = (c: Ctx) => {
    c.beginPath();
    c.moveTo(bx - rx, by);
    c.bezierCurveTo(bx - rx * 0.96, by + (byl - by) * 0.7, bx - rx * 0.5, byl, bx, byl);
    c.bezierCurveTo(bx + rx * 0.5, byl, bx + rx * 0.96, by + (byl - by) * 0.7, bx + rx, by);
    c.lineTo(bx + rx * 1.05, by - k * 0.012);
    c.lineTo(bx - rx * 1.05, by - k * 0.012);
    c.closePath();
  };
  const bb = { x: bx - rx * 1.1, y: by - k * 0.03, w: rx * 2.2, h: byl - by + k * 0.04 };
  solid(ctx, bowl, bb, 'chrome', BRONZE.body, { depth: 0.2, air: AIR, line: Math.max(1.2, k * 0.009), formSize: 8 });
  within(ctx, bowl, () => {
    // verdigris in the hollows, a band of spirals, the fire's soot
    lay(ctx, noiseMask(5, Math.round(z * 100), { cover: 0.35, soft: 0.2, col: '#5aa08a', w: 40, h: 16 }), bb, 0.45);
    spirals(ctx, bb.x, bb.x + bb.w, by + (byl - by) * 0.35, rx * 0.32, rx * 0.1, rgba(BRONZE.deep, 0.7), rgba(BRONZE.lit, 0.5), Math.max(0.8, k * 0.006));
    vfill(ctx, bb.x, by - 4, bb.w, (byl - by) * 0.4, [[0, rgba('#1a0c08', 0.4)], [1, rgba('#1a0c08', 0)]]);
  });
  // the shade over the whole brazier, then its own fire on the rim
  // (each piece filled on its own: the paths begin afresh)
  shadeWith(ctx, boxOfPts([[bb.x, bb.y], [legBox.x, legBox.y + legBox.h], [legBox.x + legBox.w, by]], 4), SHADE, (g) => {
    for (const p of [bowl, stem, knop, ...legs.map(legPath)]) {
      p(g);
      g.fill();
    }
  });
  // the beaded lip, lit by the fire above it
  ctx.strokeStyle = mix(BRONZE.shade, BRONZE.lit, 0.3 + lit * 0.6);
  ctx.lineWidth = Math.max(1.5, k * 0.016);
  ctx.beginPath();
  ctx.moveTo(bx - rx * 1.05, by - k * 0.006);
  ctx.lineTo(bx + rx * 1.05, by - k * 0.006);
  ctx.stroke();
  ctx.fillStyle = rgba('#ffb060', 0.5 * lit);
  for (let i = 0; i <= 12; i++) {
    ctx.beginPath();
    ctx.arc(bx - rx + (i / 12) * rx * 2, by - k * 0.006, Math.max(0.8, k * 0.007), 0, P2);
    ctx.fill();
  }
  // the warm of the coals on the bowl's upper rim
  ctx.save();
  bowl(ctx);
  ctx.clip();
  vfill(ctx, bb.x, by - 2, bb.w, (byl - by) * 0.5, [[0, rgba('#ff9a40', 0.35 * lit)], [1, rgba('#ff9a40', 0)]]);
  ctx.restore();
}

export const BZ_NEAR = LB.braziers.slice(0, 2);
export const BZ_FAR = LB.braziers.slice(2);
const brazierBox = (X: number, z: number) => boxOfPts([P(X - 0.42, LB.bowlY + 0.1, z), P(X + 0.42, -0.08, z)], 6);

/** The flames painted in the still (low in the afternoon light): the live layer's fires replace them. */
function fireStill(ctx: Ctx): void {
  for (const [X, z] of LB.braziers) {
    const k = ppu(z);
    const [x, y] = P(X, LB.bowlY, z);
    glowAt(ctx, x, y - k * 0.12, k * 0.5, '#ff9a40', 0.22);
    fireFrame(ctx, x, y + k * 0.01, k * 0.44, k * 0.42, 0.3, { tongues: 5, seed: Math.round(z * 10 + X) });
  }
}

// ——— the light and the air ———

export const BEAM_BOX = { x: 640, y: 230, w: 640, h: 440 };

/** The slab of low sun through the left turning, lit dust hanging in it, across to the right wall; and the gold in the
 * high air the sun crosses over the passage. */
function beamAir(ctx: Ctx, r: R): void {
  const [g0, g1] = LB.gapL;
  const gm = (g0 + g1) / 2;
  const pm = patchZ(XW);
  const pmm = (pm[0] + pm[1]) / 2;
  const [ax, ay] = P(-XW, WH * 0.92, gm);
  const [bx, by] = P(-XW, 0.02, gm);
  const [cx, cy] = P(XW, 0.02, pmm);
  const [dx, dy] = P(XW, shadowY(XW), pmm);
  // the slab of lit dusty air: brightest where it comes through, thinning as it crosses, a few streaks along it
  softly(ctx, BEAM_BOX, (g) => {
    const lg = g.createLinearGradient(ax, 0, cx, 0);
    lg.addColorStop(0, 'rgba(255,214,150,0.3)');
    lg.addColorStop(0.5, 'rgba(255,214,150,0.14)');
    lg.addColorStop(1, 'rgba(255,214,150,0.05)');
    g.fillStyle = lg;
    polyPath([[ax, ay], [bx, by], [cx, cy], [dx, dy]])(g);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    const vg = g.createLinearGradient(0, ay, 0, by);
    vg.addColorStop(0, 'rgba(0,0,0,0.85)');
    vg.addColorStop(0.5, 'rgba(0,0,0,0.2)');
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = vg;
    g.fillRect(BEAM_BOX.x, BEAM_BOX.y, BEAM_BOX.w, BEAM_BOX.h);
  }, 0.25, 'screen');
  void shaft;
  void r;
  // the air down the passage: a golden haze thickening into the distance
  softly(ctx, BEAM_BOX, (g) => {
    const gr = g.createRadialGradient(960, 470, 30, 960, 470, 330);
    gr.addColorStop(0, rgba(AIR.color, 0.2));
    gr.addColorStop(0.5, rgba(AIR.color, 0.08));
    gr.addColorStop(1, rgba(AIR.color, 0));
    g.fillStyle = gr;
    g.fillRect(BEAM_BOX.x, BEAM_BOX.y, BEAM_BOX.w, BEAM_BOX.h);
  }, 0.25, 'screen');
  // the high air, lit over the passage: a soft golden haze over the walls' upper half, thickening into the distance
  softly(ctx, BEAM_BOX, (g) => {
    const gr = g.createRadialGradient(960, 330, 20, 960, 330, 340);
    gr.addColorStop(0, 'rgba(255,214,150,0.22)');
    gr.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = gr;
    g.fillRect(BEAM_BOX.x, BEAM_BOX.y, BEAM_BOX.w, BEAM_BOX.h);
  }, 0.25, 'screen');
}


// ——— the live-only layers ———

/** Everything in front of the sky, as one silhouette (for cutting the dusk and night skies to it). */
function frontCut(g: Ctx): void {
  for (const s of [-1, 1]) {
    segPath(s, -0.6, WH)(g);
    g.fill();
    for (const zh of s < 0 ? HORNS_L : HORNS_R) {
      polyPath(hornsOnWall(s, zh, HORN_LEN, HORN_H))(g);
      g.fill();
    }
    // the side passages' far walls through the turnings
    const [g0, g1] = s < 0 ? LB.gapL : LB.gapR;
    g.save();
    wallRect(s, g0, g1, -0.6, WH)(g);
    g.clip();
    const [, yt] = WP(s, WH, g1);
    g.fillRect(0, yt, W, TY);
    g.restore();
    // the gate columns' horns
    const X = s * LB.gate.X;
    polyPath(HORNS.map(([u, v]) => P(X + (u - 0.5) * 0.3, 2.02 + v * 0.2, LB.gate.z)))(g);
    g.fill();
  }
  faceRect(-XW, XW, -0.5, LB.farH)(g);
  g.fill();
  for (const Xc of FACE_HORNS) {
    polyPath(hornsOnFace(Xc, 0.62, 0.42))(g);
    g.fill();
  }
}

function skyCut(pal: SkyPal) {
  return (ctx: Ctx, r: R) => {
    skyPaint(ctx, r, pal);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    frontCut(ctx);
    ctx.restore();
  };
}

export const DUSK_BOX = { x: 380, y: 0, w: W - 380, h: TY };

/** What the sun stops reaching as it sets (multiplied in by the live layer, white elsewhere): the right wall up to
 * just under its coping, the slabs of sun on the floor and the wall, the far façade, the turning's sunny passage, the
 * light in the air, the backlit rims of the left wall's top. */
function duskShade(ctx: Ctx): void {
  const b = DUSK_BOX;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  softly(ctx, b, (g) => {
    g.fillStyle = SHADE;
    const map = (z: number, Y: number) => WP(1, Y, z);
    polyPath([map(LB.near, shadowY(XW) - 0.1), map(LB.near, WH - 0.16), map(FZ, WH - 0.16), map(FZ, shadowY(XW) - 0.1)])(g);
    g.fill();
    const pz = patchZ(XW);
    polyPath([map(pz[0] - 0.05, -0.6), map(pz[0] - 0.05, shadowY(XW)), map(pz[1] + 0.05, shadowY(XW)), map(pz[1] + 0.05, -0.6)])(g);
    g.fill();
    floorPatch()(g);
    g.fill();
    faceRect(-XW, XW, 0, LB.farH - 0.25)(g);
    g.fill();
    wallRect(-1, LB.gapL[0], LB.gapL[1], -0.6, WH)(g);
    g.fill();
    // the gate column's lit top on the right
    const X = LB.gate.X;
    polyPath([P(X - 0.25, 1.7, LB.gate.z), P(X - 0.25, 2.3, LB.gate.z), P(X + 0.25, 2.3, LB.gate.z), P(X + 0.25, 1.7, LB.gate.z)])(g);
    g.fill();
    // the golden haze down the passage goes grey
    const hg = g.createRadialGradient(960, 470, 30, 960, 470, 330);
    hg.addColorStop(0, 'rgba(120,120,160,0.6)');
    hg.addColorStop(1, 'rgba(120,120,160,0)');
    g.fillStyle = hg;
    g.fillRect(BEAM_BOX.x, BEAM_BOX.y, BEAM_BOX.w, BEAM_BOX.h);
    // the light in the air goes out
    g.fillStyle = '#9a96b8';
    const [g0, g1] = LB.gapL;
    const pm = patchZ(XW);
    polyPath([P(-XW, WH, (g0 + g1) / 2), P(-XW, 0, (g0 + g1) / 2), P(XW, 0, (pm[0] + pm[1]) / 2), P(XW, shadowY(XW), (pm[0] + pm[1]) / 2)])(g);
    g.fill();
  }, 0.25);
  // the left wall's gold rims (the sun has gone)
  ctx.save();
  ctx.lineWidth = 8;
  ctx.strokeStyle = SHADE;
  for (const [z0, z1] of segsOf(-1)) {
    const [ax, ay] = WP(-1, WH, Math.max(z0, 1.3));
    const [bx, by] = WP(-1, WH, z1);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  for (const zh of HORNS_L) {
    ctx.fillStyle = SHADE;
    polyPath(hornsOnWall(-1, zh, HORN_LEN, HORN_H))(ctx);
    ctx.fill();
  }
  ctx.restore();
}

/** The braziers' firelight (added by the live layer): pools on the floor round them, the walls beside them, the
 * façade behind the far pair, their columns. */
function fireLight(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'lighter';
  for (const [X, z] of LB.braziers) {
    const k = ppu(z);
    const near = z < 3;
    const [fx, fy] = P(X, 0, z);
    lightPool(ctx, fx, fy, k * 1.3, k * 0.32, '#ff9a48', 0.42);
    const [bx, by] = P(X, LB.bowlY + 0.25, z);
    glowAt(ctx, bx, by, k * 0.6, '#ffb060', 0.28);
    if (near) {
      // the wall beside it
      const s = Math.sign(X);
      ctx.save();
      segPath(s, -0.6, WH)(ctx);
      ctx.clip();
      const [wx, wy] = WP(s, 1.25, z);
      const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, k * 1.3);
      g.addColorStop(0, 'rgba(255,150,70,0.55)');
      g.addColorStop(0.5, 'rgba(255,130,60,0.2)');
      g.addColorStop(1, 'rgba(255,120,50,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.scale(0.6, 1);
      ctx.translate(-wx, -wy);
      ctx.fillRect(wx - k * 2.2, wy - k * 1.4, k * 4.4, k * 2.8);
      ctx.restore();
      ctx.restore();
    }
  }
  // the far pair light the façade and the doorway's columns
  ctx.save();
  faceRect(-XW, XW, 0, LB.farH)(ctx);
  ctx.clip();
  for (const [X] of BZ_FAR) {
    const [wx, wy] = P(X, 1.3, FZ);
    glowAt(ctx, wx, wy, 90, '#ff9a48', 0.5, 1.2);
  }
  ctx.restore();
}

export const DOOR_BOX = { x: 700, y: 380, w: 520, h: 340 };

/** The beast's lair waking: a red glow up the stairs from below, out through the doorway, over the step and the floor. */
function doorGlow(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'lighter';
  const { hw, h } = LB.door;
  ctx.save();
  faceRect(-hw, hw, 0, h)(ctx);
  ctx.clip();
  const [dx0, dy0] = P(-hw, h, FZ);
  const [dx1, dy1] = P(hw, 0, FZ);
  // the stairwell beyond lit from below: its back wall glowing up from the stairs (they drop out of sight below the
  // threshold), its courses showing, its sides darker
  const g = ctx.createLinearGradient(0, dy1, 0, dy0);
  g.addColorStop(0, 'rgba(255,150,70,1)');
  g.addColorStop(0.18, 'rgba(255,80,36,0.75)');
  g.addColorStop(0.55, 'rgba(170,34,24,0.35)');
  g.addColorStop(1, 'rgba(80,12,12,0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
  for (let Y = 0.2; Y < h; Y += 0.32) {
    const [, yy] = P(0, Y, FZ + 0.6);
    ctx.fillStyle = `rgba(255,120,60,${(0.25 * (1 - Y / h)).toFixed(3)})`;
    ctx.fillRect(dx0, yy, dx1 - dx0, 1.5);
  }
  ctx.globalCompositeOperation = 'destination-out';
  const sg = ctx.createLinearGradient(dx0, 0, dx1, 0);
  sg.addColorStop(0, 'rgba(0,0,0,0.75)');
  sg.addColorStop(0.25, 'rgba(0,0,0,0)');
  sg.addColorStop(0.8, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = sg;
  ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.restore();
  // the jambs' and the columns' inner faces catching it
  for (const X of [-hw - 0.02, hw + 0.02]) {
    const [jx, jy] = P(X, 0.5, FZ);
    lightPool(ctx, jx, jy, 10, 60, '#ff6a3a', 0.4);
  }
  const [cx, cy] = P(0, 0.05, FZ);
  lightPool(ctx, cx, cy + 8, 120, 30, '#ff5a2a', 0.55);
  lightPool(ctx, cx, cy + 40, 200, 60, '#ff4a2a', 0.25);
  glowAt(ctx, cx, cy - 50, 90, '#ff6a3a', 0.25, 1.4);
}

// ——— the table: a slab of the palace's gypsum ———

export const TABLE_BOX = { x: 0, y: TY, w: W, h: 1080 - TY };

function table(ctx: Ctx, r: R): void {
  const f = LB.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#7e7262'], [0.5, '#8e8270'], [1, '#968a76']]);
  surface(ctx, r, box, '#8c806c', { over: true, vary: 0.25, cells: 5, mottle: 0.2, strokes: 0.2, strokeAng: 0, strokeLen: 260, strokeW: 4, grain: 0.12, grainKind: 'speckle', seed: 81 });
  // gypsum: cloudy, banded, glittering; soft grey-brown veins drifting across it
  lay(ctx, drift('#c8bca4', '#5a5040', 5, 83, 160, 40), box, 0.4);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const y = TY + 20 + r() * (f - TY - 40);
    ctx.strokeStyle = rgba(r() < 0.6 ? '#5a4e40' : '#d8ccb4', 0.06 + r() * 0.08);
    ctx.lineWidth = 2 + r() * 7 * ((y - TY) / (f - TY) + 0.3);
    ctx.beginPath();
    let x = -20;
    ctx.moveTo(x, y);
    while (x < W + 20) {
      const nx = x + 80 + r() * 160;
      ctx.quadraticCurveTo((x + nx) / 2, y + (r() - 0.5) * 40, nx, y + (r() - 0.5) * 16);
      x = nx;
    }
    ctx.stroke();
  }
  ctx.restore();
  grain(ctx, box, 'speckle', 0.3, 1.3);
  // the flags, laid in courses in perspective, the joints filled with red stucco
  const zf = zFront(f);
  const rows: number[] = [];
  for (let z = ZB; z > zf; z -= 0.42 * (z / ZB) + 0.06) rows.push(z);
  rows.push(zf);
  for (let j = 0; j < rows.length - 1; j++) {
    const z0 = rows[j];
    const z1 = rows[j + 1];
    const off = j % 2 ? 0.62 : 0;
    for (let X = -3.6 + off; X < 3.6; X += 1.24) {
      const q: Pt[] = [[xAt(X, z0), yAt(z0)], [xAt(X + 1.24, z0), yAt(z0)], [xAt(X + 1.24, z1), yAt(z1)], [xAt(X, z1), yAt(z1)]];
      const qb = boxOfPts(q, 0);
      ctx.save();
      polyPath(q)(ctx);
      ctx.clip();
      // each slab its own piece of gypsum: its own cloudy tone, soft veins swimming through it, crystal glints
      ctx.fillStyle = rgba(r() < 0.5 ? '#d8ccb4' : '#5a5040', 0.08 + r() * 0.14);
      ctx.fillRect(qb.x, qb.y, qb.w, qb.h);
      lay(ctx, drift('#d4c8ae', '#5e5444', 3, 300 + Math.floor(r() * 17), 48, 16), qb, 0.35);
      softly(ctx, qb, (g) => {
        g.lineCap = 'round';
        for (let v = 0; v < 3; v++) {
          const vy = qb.y + qb.h * (0.15 + r() * 0.7);
          g.strokeStyle = rgba(r() < 0.6 ? '#4a4036' : '#e8dcc4', 0.22);
          g.lineWidth = 4 + r() * 10 * (qb.h / 80);
          g.beginPath();
          g.moveTo(qb.x - 10, vy);
          g.bezierCurveTo(qb.x + qb.w * 0.3, vy + (r() - 0.5) * qb.h * 0.8, qb.x + qb.w * 0.6, vy + (r() - 0.5) * qb.h * 0.8, qb.x + qb.w + 10, vy + (r() - 0.5) * qb.h * 0.4);
          g.stroke();
        }
      }, 0.5);
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = rgba('#fff8ea', 0.25 + r() * 0.45);
        ctx.fillRect(qb.x + r() * qb.w, qb.y + r() * qb.h, 1.2, 1.2);
      }
      // grime gathered along its joints, the middle worn smooth
      const jg = ctx.createLinearGradient(0, qb.y, 0, qb.y + qb.h);
      jg.addColorStop(0, 'rgba(40,30,24,0.18)');
      jg.addColorStop(0.2, 'rgba(40,30,24,0)');
      jg.addColorStop(0.85, 'rgba(40,30,24,0)');
      jg.addColorStop(1, 'rgba(40,30,24,0.2)');
      ctx.fillStyle = jg;
      ctx.fillRect(qb.x, qb.y, qb.w, qb.h);
      ctx.restore();
      ctx.strokeStyle = rgba('#a8442e', 0.5);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(xAt(X, z0), yAt(z0));
      ctx.lineTo(xAt(X, z1), yAt(z1));
      ctx.stroke();
      ctx.strokeStyle = rgba('#f8f2e6', 0.18);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xAt(X, z0) + 2, yAt(z0));
      ctx.lineTo(xAt(X, z1) + 2.5, yAt(z1));
      ctx.stroke();
    }
    const y = yAt(z1);
    ctx.fillStyle = rgba('#a8442e', 0.48);
    ctx.fillRect(0, y - 1.4, W, 2.8);
    ctx.fillStyle = rgba('#3a2a20', 0.18);
    ctx.fillRect(0, y + 1.2, W, 1);
    ctx.fillStyle = rgba('#fbf6ea', 0.2);
    ctx.fillRect(0, y + 2.2, W, 1.2);
  }
  // wear: the arrises chipped along the joints, a few old cracks, a polished hollow down the middle
  for (let i = 0; i < 60; i++) {
    const j = Math.floor(r() * (rows.length - 1));
    const z = rows[j + 1];
    const x = xAt(-3 + r() * 6, z);
    const y = yAt(z);
    const sc = (1210 / z) / 460;
    const w = (5 + r() * 14) * sc;
    ctx.fillStyle = rgba('#8a7e6e', 0.35);
    ctx.beginPath();
    ctx.ellipse(x, y + 2 * sc, w, 2 * sc, 0, 0, P2);
    ctx.fill();
  }
  for (let i = 0; i < 7; i++) crack(ctx, r, r() * W, TY + 30 + r() * (f - TY - 60), (r() - 0.5) * 0.8, 40 + r() * 80, { col: '#5a4a3a', lip: '#f4eee0', w: 1.1, a: 0.35, branch: 0.3 });
  lightPool(ctx, 820, TY + 140, 760, 120, '#ffe8c8', 0.07);
  // the sunlit right wall glimmering in the polish, far right
  lightPool(ctx, 1540, TY + 40, 260, 40, '#ffc880', 0.08);
  // the light across it: warm from the back left, falling off to the front right
  const lg = ctx.createLinearGradient(0, TY, W * 0.75, f + 200);
  lg.addColorStop(0, 'rgba(255,226,176,0.1)');
  lg.addColorStop(0.5, 'rgba(255,226,176,0)');
  lg.addColorStop(1, 'rgba(20,16,40,0.2)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, TY, W, f - TY);
  ctx.restore();
  tableFalloff(ctx, f, 0.3, '#1a1220');
  tableSeam(ctx, 0.45, '#2a1c18', false);
  crevice(ctx, 0, W, TY, 16, 0.5, '#1a1220');
  // the front: plaster painted with running spirals, faded and flaked
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#d8ccb0'], [1, '#a89a80']]);
  ctx.fillStyle = rgba(FR.red, 0.6);
  ctx.fillRect(0, f + 2, W, 5);
  ctx.fillRect(0, 1080 - 8, W, 5);
  ctx.globalAlpha = 0.55;
  spirals(ctx, -20, W, f + 22, 44, 12, FR.blue, FR.red, 3.4);
  ctx.globalAlpha = 1;
  lay(ctx, noiseMask(12, 87, { cover: 0.25, soft: 0.05, col: '#b8a888', w: 240, h: 6 }), { x: 0, y: f, w: W, h: 1080 - f }, 0.8);
  vfill(ctx, 0, f, W, 1080 - f, [[0, 'rgba(30,20,30,0)'], [1, 'rgba(30,20,30,0.35)']]);
  ctx.restore();
  ctx.fillStyle = '#d8ccb0';
  ctx.fillRect(0, f - 5, W, 5);
  ctx.fillStyle = rgba('#fff4dc', 0.6);
  ctx.fillRect(0, f - 5, W, 1.4);
  ctx.fillStyle = rgba('#1a1218', 0.7);
  ctx.fillRect(0, f, W, 1.6);
}

// ——— the grade and the shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#fff0d8', 0.05, { warm: '#ffd49a', cool: '#5a6cc0', a: 0.2 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.12, '#1a1028', 70, 640);
  vignetteAll(ctx, 0.4, '#100a18');
}

// ——— frames for the live layer ———

/** The beast's breath rolling out of the doorway along the floor (phase ph loops), painted in its own box (screen
 * px): lobes born at the door that come towards us, spreading and swelling, lying low on the floor. */
export const MIST_BOX = { x: 600, y: 520, w: 720, h: 240 };
function mistFrame(c: Ctx, ph: number, seed: number): void {
  const N = 16;
  c.save();
  c.translate(-MIST_BOX.x, -MIST_BOX.y);
  for (let i = 0; i < N; i++) {
    const rr = rng(hashStr('lb:mist' + seed + ':' + i));
    const q = (ph + i / N) % 1;
    const z = FZ - 0.1 - q * (FZ - 1.75);
    const X = (rr() - 0.5) * 1.8 * Math.min(1, q * 1.6) + Math.sin(q * 5 + i) * 0.12;
    const [x, y] = P(X, 0.06 + q * 0.08, z);
    const k = ppu(z);
    const rad = (0.22 + 0.34 * q) * k * (0.8 + rr() * 0.4);
    const a = Math.min(1, q * 5) * (1 - q) ** 1.1 * 0.62;
    if (a < 0.01) continue;
    c.save();
    c.translate(x, y);
    c.scale(1, 0.34);
    const g = c.createRadialGradient(0, -rad * 0.15, 0, 0, 0, rad);
    g.addColorStop(0, `rgba(250,236,236,${a.toFixed(3)})`);
    g.addColorStop(0.55, `rgba(234,218,226,${(a * 0.6).toFixed(3)})`);
    g.addColorStop(1, 'rgba(200,180,190,0)');
    c.fillStyle = g;
    c.fillRect(-rad, -rad, rad * 2, rad * 2);
    // lit from behind by the doorway's glow: a warmer upper edge
    const ug = c.createRadialGradient(0, -rad * 0.5, 0, 0, -rad * 0.5, rad * 0.7);
    ug.addColorStop(0, `rgba(255,170,150,${(a * 0.5 * (1 - q)).toFixed(3)})`);
    ug.addColorStop(1, 'rgba(255,170,150,0)');
    c.fillStyle = ug;
    c.fillRect(-rad, -rad, rad * 2, rad * 1.4);
    c.restore();
  }
  c.restore();
}

/** A fragment of painted plaster (frame i): an irregular flake, its painted face (red, blue, ochre or white, with a
 * stripe or the edge of a spiral), the white lime of its broken edge below, lit from the top left. */
export const FLK = 14;
export function flakeFrame(c: Ctx, i: number): void {
  const rr = rng(hashStr('lb:flk' + i));
  const n = 6 + Math.floor(rr() * 3);
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * P2 + rr() * 0.4;
    const rad = FLK * (0.45 + rr() * 0.45);
    pts.push([FLK + Math.cos(a) * rad, FLK + Math.sin(a) * rad * 0.8]);
  }
  // the broken edge (thickness) under it
  c.fillStyle = '#d8ccb4';
  polyPath(pts.map(([x, y]) => [x + 1, y + 2.4] as Pt))(c);
  c.fill();
  const face = [FR.red, FR.blue, FR.ochre, FR.white, '#c4834e', FR.black][Math.floor(rr() * 6)];
  polyPath(pts)(c);
  c.fillStyle = face;
  c.fill();
  c.save();
  polyPath(pts)(c);
  c.clip();
  if (rr() < 0.6) {
    c.fillStyle = [FR.white, FR.black, FR.red, FR.blue][Math.floor(rr() * 4)];
    c.fillRect(0, FLK + (rr() - 0.5) * FLK, FLK * 2, 2 + rr() * 3);
  }
  const g = c.createLinearGradient(0, 0, FLK * 2, FLK * 2);
  g.addColorStop(0, 'rgba(255,250,235,0.35)');
  g.addColorStop(1, 'rgba(30,20,20,0.3)');
  c.fillStyle = g;
  c.fillRect(0, 0, FLK * 2, FLK * 2);
  c.restore();
  c.strokeStyle = 'rgba(40,24,18,0.8)';
  c.lineWidth = 1;
  polyPath(pts)(c);
  c.stroke();
}

/** A swift, wings at phase ph of a beat: dark sickle wings and a short body, seen from below. */
const SWF = { w: 44, h: 26 };
function swiftFrame(c: Ctx, ph: number): void {
  const cx = SWF.w / 2;
  const cy = SWF.h / 2;
  const flap = Math.sin(ph * P2);
  c.fillStyle = '#2a2430';
  for (const d of [-1, 1]) {
    c.beginPath();
    c.moveTo(cx, cy);
    c.quadraticCurveTo(cx + d * 10, cy - 4 - flap * 6, cx + d * 20, cy + 2 - flap * 9);
    c.quadraticCurveTo(cx + d * 10, cy + 1 - flap * 3, cx + d * 2, cy + 3);
    c.closePath();
    c.fill();
  }
  c.beginPath();
  c.ellipse(cx, cy + 1, 3.2, 6, 0, 0, P2);
  c.fill();
  // the forked tail
  c.beginPath();
  c.moveTo(cx - 2, cy + 6);
  c.lineTo(cx - 3.5, cy + 11);
  c.lineTo(cx, cy + 7.5);
  c.lineTo(cx + 3.5, cy + 11);
  c.lineTo(cx + 2, cy + 6);
  c.fill();
}

// ——— the stack ———
//
// The skies for dusk and night are live-only sprites over the day sky, after everything that stands in front of the
// sky, cut to the gap between the walls (so nothing after them overlaps their box). The dusk's shade is a live-only
// sprite the live code multiplies in; nothing still is painted after it but the table. The firelight and the doorway's
// glow are live-only layers at the very end; the live code moves them over its night washes (with the beast's breath
// just under them), so the fire isn't dimmed by the night.

const brazierLayer = (id: string, b: Pt, lit: number) => ({ id, box: brazierBox(b[0], b[1]), draw: (c: Ctx) => brazier(c, b[0], b[1], lit) });

export const LABYRINTH: SceneSpec = {
  id: 'labyrinth',
  info: {
    name: 'The Labyrinth',
    subtitle: 'Waves 81–84',
    ambient: [],
    // (the braziers, the sun and the lair's glow are the live layer's)
    glows: [],
    light: '#ffdcb0',
    tableTint: '#fff4e4',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: (c, r) => skyPaint(c, r, DAY) },
    { id: 'facade', box: FACE_BOX, draw: facade },
    { id: 'floor', box: FLOOR_BOX, draw: floor },
    { id: 'wallL', box: WALL_L_BOX, draw: (c, r) => wall(c, r, -1) },
    { id: 'wallR', box: WALL_R_BOX, draw: (c, r) => wall(c, r, 1) },
    { id: 'shield', box: PROPS_BOX, draw: (c) => shield(c) },
    brazierLayer('brazierFarL', BZ_FAR[0], 0.5),
    brazierLayer('brazierFarR', BZ_FAR[1], 0.5),
    { id: 'beam', box: BEAM_BOX, draw: beamAir },
    brazierLayer('brazierNL', BZ_NEAR[0], 0.6),
    brazierLayer('brazierNR', BZ_NEAR[1], 0.6),
    { id: 'duskSky', box: SKY_BOX, liveOnly: true, res: 0.5, draw: skyCut(DUSK) },
    { id: 'nightSky', box: SKY_BOX, liveOnly: true, res: 0.5, draw: skyCut(NIGHT) },
    { id: 'duskShade', box: DUSK_BOX, liveOnly: true, res: 0.5, draw: (c) => duskShade(c) },
    { id: 'fireStill', box: { x: 520, y: 330, w: 880, h: 200 }, stillOnly: true, draw: (c) => fireStill(c) },
    { id: 'table', box: TABLE_BOX, draw: table },
    { id: 'fireLight', box: { x: 0, y: 0, w: W, h: TY }, liveOnly: true, res: 0.33, draw: (c) => fireLight(c) },
    { id: 'doorGlow', box: DOOR_BOX, liveOnly: true, res: 0.5, draw: (c) => doorGlow(c) },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

registerKitScene(LABYRINTH, (k: KitLive, wave0: number) => {
  const ADD = Phaser.BlendModes.ADD;
  const MUL = Phaser.BlendModes.MULTIPLY;
  const top = k.slot('top');
  const duskSky = k.sprite('duskSky');
  const nightSky = k.sprite('nightSky');
  const duskSh = k.sprite('duskShade').setBlendMode(MUL);
  const fireL = k.sprite('fireLight').setBlendMode(ADD);
  const doorG = k.sprite('doorGlow').setBlendMode(ADD);
  // the light's colour over everything, then the fire and the lair's glow over that (the night doesn't dim them)
  const warm = k.wash(0xff9e78, 0, MUL, top);
  const night = k.wash(0x2c3874, 0, MUL, top);
  top.add(fireL);
  top.add(doorG);
  const atlas = fxAtlas(k.sc);

  // ——— the sky: swifts by day, stars and the moon by night, a shooting star now and then ———
  const swKey = sheet(k, 'lb_swift', SWF.w, SWF.h, 6, (c, ph) => swiftFrame(c, ph));
  const swifts = [0, 1, 2, 3].map((i) => {
    const l = new Loop(k, swKey, 6, 960, 120, { into: top, fps: 14 + i * 2, scale: 0.7 + (i % 2) * 0.25 });
    return { l, cx: 900 + i * 50, cy: 110 + (i % 3) * 30, ax: 150 + i * 30, ay: 34 + i * 8, w: 0.33 + i * 0.07, ph: i * 1.9, px: 0 };
  });
  const sr = rng(hashStr('lb:twinkle'));
  const twinkles = Array.from({ length: 16 }, () => {
    const y = 20 + sr() * 220;
    const half = 500 - y - 50;
    const x = 960 + (sr() - 0.5) * 2 * half;
    const im = k.sc.add.image(x, y, atlas, 'spark').setBlendMode(ADD).setAlpha(0).setScale(0.18 + sr() * 0.22).setTint(0xeef0ff);
    top.add(im);
    return { im, seed: sr() * 10, sp: 1.5 + sr() * 3 };
  });
  const moonKey = k.tex('lb_moon', 48, 48, (c) => {
    c.beginPath();
    c.arc(24, 24, 17, 0, P2);
    c.fillStyle = '#f8f4e4';
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(31, 20, 15.5, 0, P2);
    c.fill();
  });
  const moon = k.img(moonKey, 1240, 92, { into: top, alpha: 0 });
  const moonGlow = k.glow(1240, 92, 90, 0xcfd8ff, 0, { into: top });
  const meteors = new Parts(k, { frame: 'spark', add: true, into: top, max: 6 });
  let meteorT = 6;

  // ——— the braziers ———
  const FW = 150;
  const FH = 200;
  const RF = 0.7;
  const FN = 10;
  const fireKey = sheet(k, 'lb_fire', FW * RF, FH * RF, FN, (c, ph) => {
    c.scale(RF, RF);
    fireFrame(c, FW / 2, FH - 8, FW * 0.85, FH * 0.85, ph, { tongues: 6, seed: 3, cols: ['#ff4a12', '#ffa024', '#ffe8a0'] });
  });
  const SMW = 120;
  const SMH = 320;
  const RS = 0.4;
  const smokeKey = sheet(k, 'lb_smoke', SMW * RS, SMH * RS, 8, (c, ph) => {
    c.scale(RS, RS);
    smokeFrame(c, SMW, SMH, ph, { lit: '#ffb27a', body: '#6a5a58', shade: '#2a2230', wind: 0.25, lobes: 9, a: 0.55, toLight: [0, 1], seed: 2 });
  });
  const fires = LB.braziers.map(([X, z], i) => {
    const kk = ppu(z);
    const [x, y] = P(X, LB.bowlY, z);
    const s = (kk * 0.5) / (FW * 0.85);
    const glow = k.glow(x, y - kk * 0.15, kk * 0.5, 0xff8a3a, 0, { into: top });
    const smoke = new Loop(k, smokeKey, 8, x, y - kk * 0.3, { into: top, origin: [0.5, 1], scale: (kk / 223) / RS, fps: 1.6, phase: i * 2.1 });
    const fl = new Loop(k, fireKey, FN, x, y + kk * 0.01, { into: top, origin: [0.5, (FH - 8) / FH], scale: s / RF, fps: 12 + i, phase: i * 2.6 });
    const coal = k.glow(x, y - 2, kk * 0.3, 0xffb050, 0, { into: top, sy: 0.35 });
    return { x, y, kk, s, glow, smoke, fl, coal, seed: i * 1.7 };
  });
  const embers = new Parts(k, { frame: 'ember', add: true, into: top, max: 120 });
  const emberRate = LB.braziers.map(() => new Rate());
  const duck = new Spring(0, 34, 5);

  // ——— the light and the air: dust in the slab of sun ———
  const motes = new Parts(k, { frame: 'mote', add: true, into: top, max: 110 });
  const moteRate = new Rate();
  const inBeam = (): Pt => {
    const X = -XW + crand() * 2 * XW;
    const Y = crand() * shadowY(X) * 0.95;
    const [a, b] = patchZ(X);
    return P(X, Y, a + crand() * (b - a));
  };
  for (let i = 0; i < 50; i++) {
    const [x, y] = inBeam();
    motes.spawn({ x, y, vx: (crand() - 0.5) * 8, vy: (crand() - 0.6) * 6, life: 3 + crand() * 4, r0: 1.2 + crand() * 1.6, a: 0.7, tint: 0xffe2a8, drag: 0.1, fade: 0.3 });
  }

  // ——— the beast's breath, the lair's glow ———
  const RM = 0.36;
  const mistKeys = [0, 1].map((sd) => sheet(k, 'lb_mist' + sd, MIST_BOX.w * RM, MIST_BOX.h * RM, 8, (c, ph) => {
    c.scale(RM, RM);
    mistFrame(c, ph, sd);
  }));
  // (over the night's washes, under the firelight: the breath is pale in the dark, lit by the fires)
  const mists = mistKeys.map((key, i) => new Loop(k, key, 8, MIST_BOX.x, MIST_BOX.y, { into: top, origin: [0, 0], scale: 1 / RM, fps: 0.9 + i * 0.25, phase: i * 3.3 }));
  const breath = new Parts(k, { frame: 'puff', into: top, max: 40 });
  for (const m of mists) m.each((im) => top.moveTo(im, top.getIndex(fireL)));

  // ——— stomps and bellows: flakes of fresco, grit and dust off the walls ———
  const flakeKey = sheet(k, 'lb_flake', FLK * 2, FLK * 2, 8, (c, _p, i) => flakeFrame(c, i));
  const flakes = new Parts(k, { frame: 'flake', sheet: { key: flakeKey, n: 8, half: FLK }, into: top, max: 70 });
  const grit = new Parts(k, { frame: 'mote', into: top, max: 120 });
  const dust = new Parts(k, { frame: 'puff', into: top, max: 70 });
  const flash = k.wash(0xff3a1a, 0, ADD, top);
  // the lair's red light spilling down the passage, and something's eyes in the dark of the doorway
  const [dcx, dcy] = P(0, 0.05, FZ);
  const spill = k.glow(dcx, dcy + 30, 380, 0xff3a1a, 0, { into: top, sy: 0.45 });
  const spillHi = k.glow(dcx, dcy - 60, 200, 0xff5a2a, 0, { into: top, sy: 1.3 });
  const [ex, ey] = P(0, 1.35, FZ + 0.9);
  const eyes = [-1, 1].map((d) => k.sc.add.image(ex + d * 6, ey, atlas, 'spark').setBlendMode(ADD).setAlpha(0).setScale(0.12, 0.07).setTint(0xffb040));
  top.add(eyes);
  let blinkT = 3;
  let eyeA = 0;
  let lightTint = 0xffffff;
  /** Shake a stretch of wall: painted flakes off the fresco band, grit off the coping, dust at its foot. */
  const shed = (s: number, zc: number, n: number, p: number) => {
    for (let i = 0; i < n; i++) {
      const z = Math.max(1.5, Math.min(FZ - 0.1, zc + (crand() - 0.5) * 0.7));
      const kk = ppu(z);
      const [x, y] = WP(s, 0.6 + crand() * 1.6, z);
      const [, fy] = WP(s, 0, z);
      flakes.spawn({ x, y, vx: -s * (8 + crand() * 40) * (kk / 200), vy: -crand() * 30, life: 3, r0: (0.035 + crand() * 0.035) * kk, a: 1, tint: lightTint, grav: 3.6 * kk, floor: fy + 2 + crand() * 4, bounce: 0.28, spin: (crand() - 0.5) * 12, fade: 0.02 });
    }
    for (let i = 0; i < n * 2; i++) {
      const z = Math.max(1.45, Math.min(FZ - 0.1, zc + (crand() - 0.5) * 1.2));
      const kk = ppu(z);
      const [x, y] = WP(s, WH - 0.02, z);
      const [, fy] = WP(s, 0, z);
      if (y < 0) continue;
      grit.spawn({ x: x - s * 2, y, vx: -s * crand() * 20, vy: crand() * 20, life: 2.5, r0: (0.008 + crand() * 0.01) * kk, a: 0.9, tint: lightTint === 0xffffff ? 0xd8c4a0 : 0x8088a8, grav: 3.6 * kk, drag: 0.3, floor: fy, bounce: 0.2, fade: 0.02 });
    }
    // dust sliding down the wall's face from where the plaster let go
    for (let i = 0; i < 2 + p * 4; i++) {
      const z = Math.max(1.5, Math.min(FZ - 0.1, zc + (crand() - 0.5) * 0.6));
      const kk = ppu(z);
      const [x, y] = WP(s, 0.9 + crand() * 1.2, z);
      dust.spawn({ x: x - s * kk * 0.03, y, vx: -s * crand() * 6, vy: 20 + crand() * 30, life: 1.8 + crand(), r0: kk * 0.04, r1: kk * (0.14 + crand() * 0.08), a: 0.4, tint: lightTint === 0xffffff ? 0xe8dcc4 : 0x9a96b8, grav: 30, drag: 1.4, fade: 0.1 });
    }
    for (let i = 0; i < 1 + p * 3; i++) {
      const z = Math.max(1.5, Math.min(FZ - 0.1, zc + (crand() - 0.5) * 0.8));
      const kk = ppu(z);
      const [x, y] = WP(s, 0.05, z);
      dust.spawn({ x: x - s * kk * 0.08, y, vx: -s * (10 + crand() * 30), vy: -10 - crand() * 20, life: 1.6 + crand(), r0: kk * 0.08, r1: kk * (0.25 + crand() * 0.15), a: 0.5, tint: lightTint === 0xffffff ? 0xe6d6b8 : 0x8a8aa8, drag: 1.1, fade: 0.15 });
    }
  };

  let kw = waveK(wave0);
  let shown = kw;
  let bellowT = 7;
  let bellow = -1;
  let gust = 0;

  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, p) {
      const s = x < 960 ? -1 : 1;
      const z = Math.max(1.55, Math.min(3.6, zAtX(x)));
      shed(s, z, Math.round(2 + p * 7), p);
      if (p > 0.4) shed(-s, 2.4, Math.round(1 + p * 3), p * 0.5);
      duck.v -= 3 + p * 5;
      gust = Math.min(1.5, gust + p);
      // dust shaken into the slab of sun
      if (p > 0.25) {
        for (let i = 0; i < 10 + p * 20; i++) {
          const [mx, my] = inBeam();
          motes.spawn({ x: mx, y: my, vx: (crand() - 0.5) * 40, vy: (crand() - 0.5) * 30, life: 2 + crand() * 3, r0: 1.4 + crand() * 2, a: 0.8, tint: 0xffe2a8, drag: 0.6, fade: 0.1 });
        }
      }
    },
    update(dt, t) {
      const cm = calm();
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      // 0 golden afternoon … 1/3 dusk … 2/3 night … 1 the beast awake
      const duskK = ease(clamp01(shown / 0.333));
      const nightK = ease(clamp01((shown - 0.333) / 0.333));
      const beastK = ease(clamp01((shown - 0.667) / 0.333));
      duskSky.setAlpha(duskK);
      nightSky.setAlpha(nightK);
      duskSh.setAlpha(duskK);
      warm.setAlpha(duskK * (1 - nightK) * 0.42);
      night.setAlpha(nightK * 0.58);
      const lr = Math.round(255 - nightK * 120);
      const lg = Math.round(255 - nightK * 110 - duskK * (1 - nightK) * 40);
      const lb = Math.round(255 - nightK * 40 - duskK * (1 - nightK) * 70);
      lightTint = Phaser.Display.Color.GetColor(lr, lg, lb);

      // the fires: low in the afternoon, lit up at dusk, full at night; a stomp ducks them and they flare
      const d = duck.step(0, dt);
      const level = 0.42 + duskK * 0.28 + nightK * 0.3;
      let fl = 0;
      for (const [i, f] of fires.entries()) {
        const fk = flicker(t * 1.1, f.seed);
        fl += fk;
        f.fl.step(dt, (0.9 + gust * 0.4) * cm);
        const h = level * (1 + d * 0.5) * (0.95 + 0.05 * fk);
        f.fl.each((im) => im.setScale(f.s / RF * (0.9 + level * 0.15), (f.s / RF) * Math.max(0.15, h)));
        f.glow.setAlpha((0.1 + 0.22 * level) * fk * (1 + Math.max(0, d) * 0.5));
        f.coal.setAlpha(0.35 + 0.3 * level);
        f.smoke.step(dt, cm);
        f.smoke.alpha = 0.25 + 0.3 * level;
        f.smoke.each((im) => im.setTint(lightTint));
        emberRate[i].tick((1 + 4 * level + Math.max(0, d) * 20) * cm, dt, () => {
          const kk = f.kk;
          embers.spawn({ x: f.x + (crand() - 0.5) * kk * 0.3, y: f.y - kk * 0.1, vx: (crand() - 0.4) * 30 * (kk / 200), vy: (-60 - crand() * 90) * (kk / 200), life: 1.2 + crand() * 1.5, r0: (2 + crand() * 2) * (kk / 200), r1: 0.6, a: 0.9, tint: crand() < 0.5 ? 0xffb040 : 0xff6a20, grav: -10, drag: 0.4, streak: 0.02, fade: 0.08 });
        });
      }
      fl /= fires.length;
      fireL.setAlpha(clamp01((0.12 * duskK + 0.85 * nightK) * (0.88 + 0.12 * fl) * (1 + Math.max(0, d) * 0.3)));
      gust = Math.max(0, gust - dt * 0.8);

      // the sky's life
      for (const sw of swifts) {
        const tt = t * sw.w * cm + sw.ph;
        const x = sw.cx + Math.sin(tt) * sw.ax;
        const y = sw.cy + Math.sin(tt * 2 + 0.7) * sw.ay;
        const dir = Math.cos(tt) >= 0 ? 1 : -1;
        sw.l.step(dt, cm);
        sw.l.alpha = 0.85 * (1 - nightK) * (1 - duskK * 0.3);
        sw.l.each((im) => {
          im.setPosition(x, y);
          im.setRotation(Math.sin(tt * 2) * 0.25 * dir);
        });
      }
      for (const tw of twinkles) tw.im.setAlpha(nightK * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * tw.sp + tw.seed)) ** 3));
      moon.setAlpha(nightK * 0.9);
      moonGlow.setAlpha(nightK * 0.3);
      if (nightK > 0.5) {
        meteorT -= dt;
        if (meteorT <= 0) {
          meteorT = 9 + crand() * 10;
          const y = 40 + crand() * 80;
          const x = 820 + crand() * 280;
          const dir = crand() < 0.5 ? -1 : 1;
          meteors.spawn({ x, y, vx: dir * (380 + crand() * 160), vy: 120 + crand() * 60, life: 0.55, r0: 4, r1: 1, a: 0.9 * nightK, tint: 0xeef2ff, streak: 0.07, fade: 0.2 });
        }
      }

      // dust in the slab of sun, fading out as the sun goes
      moteRate.tick(10 * (1 - duskK) * cm, dt, () => {
        const [x, y] = inBeam();
        motes.spawn({ x, y, vx: (crand() - 0.5) * 8, vy: (crand() - 0.6) * 6, life: 4 + crand() * 4, r0: 1.2 + crand() * 1.6, a: 0.7 * (1 - duskK), tint: 0xffe2a8, drag: 0.1, fade: 0.3 });
      });

      // the beast: its breath rolling out, its doorway throbbing, its bellow shaking the maze
      let env = 0;
      if (beastK > 0.6) {
        bellowT -= dt;
        if (bellowT <= 0 && bellow < 0) {
          bellow = 0;
          bellowT = 8 + crand() * 5;
        }
      }
      if (bellow >= 0) {
        bellow += dt;
        env = Math.sin(Math.min(1, bellow / 2.2) * Math.PI);
        if (bellow > 0.25 && bellow - dt <= 0.25) {
          // the shake: flakes and grit off both walls, the fires ducking
          shed(-1, 1.8 + crand() * 1.6, 4, 0.8);
          shed(1, 1.8 + crand() * 1.6, 4, 0.8);
          duck.v -= 6;
          gust = 1.2;
        }
        if (bellow < 1.2) {
          for (let i = 0; i < 2; i++) {
            const [bx, by] = P((crand() - 0.5) * 0.6, 0.1, FZ - 0.15);
            breath.spawn({ x: bx, y: by, vx: (crand() - 0.5) * 160, vy: 14 + crand() * 30, life: 2.2 + crand(), r0: 14, r1: 70 + crand() * 50, a: 0.3 * beastK, tint: 0xc89aa0, drag: 0.7, fade: 0.15 });
          }
        }
        if (bellow > 2.2) bellow = -1;
      }
      const throb = 0.8 + 0.2 * Math.sin(t * 1.7) * Math.sin(t * 0.63 + 1);
      doorG.setAlpha(clamp01(nightK * 0.12 + beastK * 0.7 * throb + env * 0.35 * beastK));
      flash.setAlpha(env * 0.1 * beastK);
      spill.setAlpha(beastK * (0.28 * throb + env * 0.25));
      spillHi.setAlpha(beastK * (0.2 * throb + env * 0.2));
      // the eyes: there, gone (a blink, or he turns away), brighter as he bellows
      blinkT -= dt;
      if (blinkT <= 0) blinkT = 2.5 + crand() * 4;
      const open = blinkT > 0.18 && Math.sin(t * 0.21) > -0.55 ? 1 : 0;
      eyeA += ((open ? 0.75 + env * 0.25 : 0) - eyeA) * Math.min(1, dt * 12);
      for (const e of eyes) e.setAlpha(beastK * eyeA);
      for (const m of mists) {
        m.step(dt, (1 + env * 1.5) * cm);
        m.alpha = clamp01(0.15 * nightK + 0.7 * beastK + env * 0.25);
        m.each((im) => im.setTint(Phaser.Display.Color.GetColor(Math.round(150 + beastK * 70), Math.round(140 + beastK * 10), Math.round(178 - beastK * 30))));
      }

      embers.update(dt);
      motes.update(dt);
      meteors.update(dt);
      breath.update(dt);
      flakes.update(dt);
      grit.update(dt);
      dust.update(dt);
    },
  };
});
