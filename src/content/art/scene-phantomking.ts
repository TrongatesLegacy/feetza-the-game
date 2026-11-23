// The Crypt (the Ghost of Feet Past's arena, wave 60), redrawn with the location kit (src/art/scene): deeper than the
// Haunted Cellar (scene-cellar.ts), at the far end of its tunnel, where the cold green light came from. A Romanesque
// crypt under the trattoria, older than the cellar: an arcade of three round arches on squat stone columns with
// cushion capitals, each bay vaulted back to the crypt's end wall of rough, damp ashlar, nitre weeping down it.
//
// In the middle bay the Phantom King's tomb stands on a dais of three steps under an apse: a carved sarcophagus
// (an arcade of little niches down its front, a roundel with his crowned foot) with his effigy on the lid, lying in
// state, crowned, hands folded, his great stone feet toes-up at the end; the lid has been pushed askew from inside and
// the cold green light of the dead pours out of the gap. A tattered royal pall hangs in the apse behind it, his sigil
// in tarnished gold. Iron prickets stand at the dais's corners and votive stubs at its foot. In the left bay the
// cellar's brick tunnel arrives down two steps, the cellar's candles a warm glint at its far end; moonlight falls
// down-right through a grating in that bay's vault (the room's key light). In the right bay the loculi: burial niches
// in the wall, each slab carved with the name of a boss beaten long ago (the echoes he calls up in the fight), some
// broken open from inside. The table is a ledger stone, its inscription worn: HIC IACET REX PEDVM.
//
// Live, the heroes:
// - the ghosts: the cellar's wraiths (scene-cellar.ts, 12 painted phases of a float and 4 of a shriek) rising out of
//   the gap under the lid (behind the sarcophagus's front, then over it), out of the broken loculi, or crossing the
//   vaults; a stomp makes them shriek and recoil;
// - the ectoplasm: painted frames of glowing ectoplasm brimming over the sarcophagus's rim and pouring down its front
//   and the dais steps into the mist on the floor (the cellar's rolling mist frames); a stomp jolts the lid (it lifts
//   and drops back with a puff of dust and a surge of the pour) and throws the mist out;
// - the candles: the cellar's painted flames on the prickets and the votives, leaning in the draughts and when a
//   ghost passes; a hard stomp snuffs the nearest (painted smoke), which then lights itself again, ghost-green.
// Also: the pall rippling in the draught off the tomb (painted frames), motes turning in the moonlight, the tomb's
// light breathing, grit off the vaults on stomps.

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
  gradeAll,
  groundShadow,
  lightPool,
  polyPath,
  rectPath,
  rim,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { aoHalo, shaft } from '../../art/scene/light';
import { bricks } from '../../art/scene/materials';
import { crack, lay, noiseMask, streaks, surface } from '../../art/scene/paint';
import { candle as candleBody, drape } from '../../art/scene/props';
import { ashlar } from '../../art/scene/surfaces';
import { spec as specHi } from '../../art/style/kit';
import { makeCanvas, mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, flicker, registerKitScene, wander } from '../../game/sceneLive';
import { Loop, Parts, Rate, Spring, flameFrame, sheet, steamFrame } from '../../game/sceneAnim';
import { COLD, FLAME, GH, GHOST_N, GK, GW, MH, MK, MW, SHRIEK_N, SMOKE, WARM, ghostFrame, mistFrame, speckFrame, waxRun, web } from './scene-cellar';

// ——— layout ———

const VPX = 960;
const VPY = 300;
/** A point of the front plane (scale 1) pushed back towards the vanishing point (s < 1 further away). */
const at = (x: number, y: number, s: number): [number, number] => [VPX + (x - VPX) * s, VPY + (y - VPY) * s];
const P2 = Math.PI * 2;

export const PK = {
  front: 1040,
  /** The arcade's columns (centres) and its three bays (centres, the feet's lanes). */
  cols: [180, 700, 1220, 1740],
  bays: [440, 960, 1480],
  /** The arches' springing (the abacus's top), the intrados and extrados radii. */
  spring: 300,
  ri: 224,
  ro: 296,
  shaftW: 104,
  /** The crypt's end wall (its depth) and where its floor meets it. */
  back: 0.78,
  /** The sarcophagus: its front face and the dais's steps (x0, x1, top). */
  sarc: { x0: 800, x1: 1120, top: 614, bot: 712 },
  /** How far the lid has been shoved to the right (px) and its tilt. */
  lidShift: 46,
  apse: { x: 960, r: 112, spring: 476 },
  tunnel: { x: 540, r: 104, spring: 520 },
  grate: { x: 488, y: 118 },
  loculi: { x0: 1294, y0: 322, cw: 120, rh: 104, cols: 3, rows: 3 },
};
const BACK_FLOOR = VPY + (TY - VPY) * PK.back;
const SPRING = PK.spring;
const S = PK.sarc;
/** The box's rim and the lid's top, pushed back (the sarcophagus's depth). */
const SARC_D = 0.93;
const LID_T = 26;
/** How far the lid is tipped up at its left end (radians, about its right end). */
const LID_TIP = 0.06;
const LID_TOP_F = S.top - LID_T;
const LID_TOP_B = at(0, LID_TOP_F, SARC_D)[1];
const GAP_X1 = S.x0 + PK.lidShift + 2;
const STEPS = [
  { x0: 738, x1: 1182, y0: 744, y1: TY },
  { x0: 758, x1: 1162, y0: 728, y1: 744 },
  { x0: 778, x1: 1142, y0: S.bot, y1: 728 },
];

/** Candle flames: where the flame stands (base), the candle's height, its size, how soon it turns cold. */
const CANDLES = [
  { x: 772, base: 532, h: 50, k: 1, cold: false },
  { x: 1150, base: 532, h: 44, k: 1, cold: false },
  { x: 712, base: 760, h: 34, k: 0.78, cold: false },
  { x: 738, base: 762, h: 20, k: 0.66, cold: true },
  { x: 1194, base: 762, h: 26, k: 0.7, cold: false },
  { x: 1220, base: 760, h: 38, k: 0.8, cold: false },
  { x: 604, base: 650, h: 22, k: 0.56, cold: false },
];
const flameY = (c: (typeof CANDLES)[number]) => c.base - c.h;

const STONE = ['#5e5a54', '#66615a', '#58544f', '#6c675f', '#615c55', '#57534d'];
const MORTAR = '#34302c';
const BRICK = ['#7a4434', '#6e3c2e', '#844a38', '#663628', '#7c4a36', '#704030'];
const GHOST = '#7af0d0';
const CANDLE = '#ffb45a';
const MOON = '#9ab8e8';
const PURPLE = '#3a1c48';
const GOLD = '#b8943c';

const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ——— paths ———

/** The end wall: everything under the bays' lunettes (back plane), down to its floor. */
const backWallPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(-10, BACK_FLOOR);
  c.lineTo(-10, SPRING);
  for (const cx of [-80, ...PK.bays, 2000]) {
    const [bx] = at(cx, SPRING, PK.back);
    c.arc(bx, SPRING, PK.ri * PK.back, Math.PI, 0);
  }
  c.lineTo(W + 10, SPRING);
  c.lineTo(W + 10, BACK_FLOOR);
  c.closePath();
};

// ——— the far parts: vaults, end wall, floor ———

/** The vault over each bay, seen through its arch: a barrel of stone courses running back from the arch to the end
 * wall's lunette, dark overhead, catching a little light from below. */
function vaults(ctx: Ctx, r: R): void {
  ctx.fillStyle = '#16120f';
  ctx.fillRect(0, 0, W, TY);
  for (const cx of [-80, ...PK.bays, 2000]) {
    const N = 7;
    for (let i = 0; i < N; i++) {
      const s0 = 1 - ((1 - PK.back) * i) / N;
      const s1 = 1 - ((1 - PK.back) * (i + 1)) / N;
      const [x0] = at(cx, SPRING, s0);
      const [x1] = at(cx, SPRING, s1);
      ctx.beginPath();
      ctx.arc(x0, SPRING, PK.ri * s0, Math.PI, 0);
      ctx.arc(x1, SPRING, PK.ri * s1, 0, Math.PI, true);
      ctx.closePath();
      const near = i / N;
      ctx.fillStyle = shade(STONE[Math.floor(r() * STONE.length)], -0.55 + near * 0.12 + (r() - 0.5) * 0.06);
      ctx.fill();
      // the voussoirs' joints running round each course
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(6,4,3,0.55)';
      ctx.lineWidth = 1.2;
      const n = 16 + (i % 2);
      for (let k = 1; k < n; k++) {
        const a = Math.PI + ((k + (i % 2) * 0.5) / n) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(x0 + Math.cos(a) * PK.ri * s0, SPRING + Math.sin(a) * PK.ri * s0);
        ctx.lineTo(x1 + Math.cos(a) * PK.ri * s1, SPRING + Math.sin(a) * PK.ri * s1);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(6,4,3,0.6)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x1, SPRING, PK.ri * s1, Math.PI, 0);
      ctx.stroke();
    }
  }
  // nitre and damp in the vaults, dark gathering in their crowns
  lay(ctx, noiseMask(12, 211, { cover: 0.3, soft: 0.15, col: '#d8dccc', w: 192, h: 40 }), { x: 0, y: 0, w: W, h: SPRING }, 0.06);
  vfill(ctx, 0, 0, W, SPRING, [[0, 'rgba(4,3,2,0.75)'], [0.6, 'rgba(4,3,2,0.35)'], [1, 'rgba(4,3,2,0.1)']]);
  // the grating in the left bay's vault: an opening to the night, its iron bars
  const g = PK.grate;
  const gp = polyPath([[g.x - 40, g.y - 12], [g.x + 40, g.y - 12], [g.x + 34, g.y + 12], [g.x - 34, g.y + 12]]);
  within(ctx, gp, () => {
    vfill(ctx, g.x - 40, g.y - 12, 80, 24, [[0, '#2a3a5a'], [1, '#6a86b8']]);
    ctx.strokeStyle = '#0a0a0c';
    ctx.lineWidth = 4;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(g.x + k * 11, g.y - 14);
      ctx.lineTo(g.x + k * 10, g.y + 14);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(g.x - 40, g.y);
    ctx.lineTo(g.x + 40, g.y);
    ctx.stroke();
  });
  ctx.strokeStyle = 'rgba(6,4,3,0.8)';
  ctx.lineWidth = 3;
  gp(ctx);
  ctx.stroke();
  ctx.strokeStyle = rgba(MOON, 0.3);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(g.x - 34, g.y + 13);
  ctx.lineTo(g.x + 34, g.y + 13);
  ctx.stroke();
}
const VAULT_BOX = { x: 0, y: 0, w: W, h: TY };

function backWall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 60, w: W, h: BACK_FLOOR - 60 };
  within(ctx, backWallPath, () => {
    ashlar(ctx, r, box, STONE.map((c) => shade(c, -0.08)), MORTAR, { rowH: 40, minW: 54, maxW: 124, weather: 0.85, seed: 41 });
    surface(ctx, r, box, '#5a5650', { over: true, vary: 0.45, cells: 5, mottle: 0.3, strokes: 0.1, grain: 0, warm: '#8a8070', cool: '#2a3440', seed: 43 });
    // damp: the wall darker and greener low down, a tide line of salts, nitre weeping from the lunettes
    vfill(ctx, 0, 440, W, BACK_FLOOR - 440, [[0, 'rgba(14,20,16,0)'], [0.5, 'rgba(14,20,16,0.28)'], [1, 'rgba(8,12,10,0.5)']]);
    ctx.strokeStyle = 'rgba(226,228,214,0.16)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, 540 + Math.sin(x * 0.013) * 14 + Math.sin(x * 0.051) * 5);
    ctx.stroke();
    lay(ctx, noiseMask(40, 47, { cover: 0.3, soft: 0.08, col: '#e8e6dc', w: 256, h: 24 }), { x: 0, y: 540, w: W, h: 50 }, 0.14);
    for (const x of [300, 520, 700, 1230, 1400, 1640]) {
      streaks(ctx, r, x, 150 + r() * 30, 50, 220 + r() * 200, '#0a120e', 0.35, 4);
      streaks(ctx, r, x + 10, 160, 26, 140, '#d8dccc', 0.07, 2);
    }
    // the dark: the wall in the shadow of the arcade, darker away from the lights
    vfill(ctx, 0, 60, W, BACK_FLOOR - 60, [[0, 'rgba(6,4,3,0.9)'], [0.35, 'rgba(6,4,3,0.74)'], [1, 'rgba(6,4,3,0.66)']]);
  });
  // the responds: flat pilasters on the end wall behind each column, the transverse arches' feet
  for (const cx of PK.cols) {
    const [x0] = at(cx - PK.shaftW * 0.55, 0, PK.back);
    const [x1] = at(cx + PK.shaftW * 0.55, 0, PK.back);
    const p = rectPath(x0, SPRING - 4, x1 - x0, BACK_FLOOR - SPRING + 4);
    aoHalo(ctx, p, 16, 0.4, '#060403', 4);
    solid(ctx, p, { x: x0, y: SPRING, w: x1 - x0, h: BACK_FLOOR - SPRING }, 'stone', '#4e4a44', { depth: 0.5, line: 1.4, formSize: 10, texA: 0.1 });
    within(ctx, p, () => {
      ashlar(ctx, r, { x: x0, y: SPRING - 4, w: x1 - x0, h: BACK_FLOOR - SPRING + 4 }, STONE.map((c) => shade(c, -0.15)), MORTAR, { rowH: 34, minW: 90, maxW: 90, weather: 0.6, seed: cx });
      vfill(ctx, x0, SPRING, x1 - x0, BACK_FLOOR - SPRING, [[0, 'rgba(6,4,3,0.78)'], [1, 'rgba(6,4,3,0.7)']]);
    });
    const cap = rectPath(x0 - 8, SPRING - 6, x1 - x0 + 16, 12);
    solid(ctx, cap, { x: x0 - 8, y: SPRING - 6, w: x1 - x0 + 16, h: 12 }, 'stone', '#5a564e', { depth: 0.5, line: 1.2, formSize: 3 });
    within(ctx, cap, () => vfill(ctx, x0 - 8, SPRING - 6, x1 - x0 + 16, 12, [[0, 'rgba(6,4,3,0.3)'], [1, 'rgba(6,4,3,0.6)']]));
  }
  crack(ctx, r, 860, 300, -1.9, 80, { col: '#0a0604', lip: '#a8a090', w: 1.4, a: 0.4 });
  crack(ctx, r, 1600, 250, -1.2, 90, { col: '#0a0604', lip: '#a8a090', w: 1.4, a: 0.4 });
}

/** The crypt's floor between the end wall and the table: flags in perspective, worn, damp, gritty. */
function floor(ctx: Ctx, r: R): void {
  const y0 = BACK_FLOOR;
  const box = { x: 0, y: y0, w: W, h: TY - y0 + 2 };
  surface(ctx, r, box, '#4a4640', { vary: 0.4, cells: 6, mottle: 0.4, strokes: 0, grain: 0.25, grainKind: 'speckle', warm: '#7a705e', cool: '#28303a', seed: 51 });
  ctx.strokeStyle = 'rgba(8,6,4,0.6)';
  ctx.lineWidth = 1.4;
  for (const s of [0.8, 0.84, 0.89, 0.945]) {
    const y = VPY + (TY - VPY) * s;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = -600; x <= W + 600; x += 150) {
    const [bx, by] = at(x + (r() - 0.5) * 30, TY, PK.back);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(x, TY);
    ctx.stroke();
  }
  // grit along the wall's foot, the dark under it, the near flags lighter
  crevice(ctx, 0, W, y0, 18, 0.55, '#060403');
  vfill(ctx, 0, y0, W, TY - y0, [[0, 'rgba(6,4,3,0.82)'], [1, 'rgba(6,4,3,0.66)']]);
  lay(ctx, noiseMask(30, 53, { cover: 0.25, soft: 0.1, col: '#141210', w: 256, h: 20 }), box, 0.35);
}

// ——— the apse and the pall ———

const apsePath: PathFn = (c) => {
  const a = PK.apse;
  c.beginPath();
  c.moveTo(a.x - a.r, BACK_FLOOR);
  c.lineTo(a.x - a.r, a.spring);
  c.arc(a.x, a.spring, a.r, Math.PI, 0);
  c.lineTo(a.x + a.r, BACK_FLOOR);
  c.closePath();
};

function apse(ctx: Ctx, r: R): void {
  const a = PK.apse;
  aoHalo(ctx, apsePath, 22, 0.5, '#040302', 0);
  within(ctx, apsePath, () => {
    // the half-dome and the curved wall: courses curving round, darkest at the sides
    const box = { x: a.x - a.r, y: a.spring - a.r, w: a.r * 2, h: BACK_FLOOR - a.spring + a.r };
    ashlar(ctx, r, box, STONE.map((c) => shade(c, -0.2)), MORTAR, { rowH: 30, minW: 40, maxW: 80, weather: 0.8, seed: 61 });
    const hg = ctx.createLinearGradient(a.x - a.r, 0, a.x + a.r, 0);
    hg.addColorStop(0, 'rgba(4,3,2,0.7)');
    hg.addColorStop(0.35, 'rgba(4,3,2,0.25)');
    hg.addColorStop(0.65, 'rgba(4,3,2,0.25)');
    hg.addColorStop(1, 'rgba(4,3,2,0.8)');
    ctx.fillStyle = hg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    vfill(ctx, box.x, box.y, box.w, box.h, [[0, 'rgba(4,3,2,0.9)'], [0.4, 'rgba(4,3,2,0.55)'], [1, 'rgba(4,3,2,0.6)']]);
    // the rod's two iron hooks
    for (const x of [a.x - 62, a.x + 62]) {
      ctx.fillStyle = '#0e0c0a';
      ctx.fillRect(x - 3, PALL.y - 8, 6, 12);
    }
  });
  // the apse's arch: a plain roll moulding, lit along its left shoulder
  ctx.strokeStyle = 'rgba(8,6,4,0.85)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(a.x, a.spring, a.r + 5, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = '#34312c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(a.x, a.spring, a.r + 5, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200,220,230,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(a.x, a.spring, a.r + 4, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#2a2724';
    ctx.fillRect(a.x + s * (a.r + 5) - 7, a.spring, 14, BACK_FLOOR - a.spring);
    ctx.fillStyle = s < 0 ? 'rgba(200,220,230,0.08)' : 'rgba(4,3,2,0.4)';
    ctx.fillRect(a.x + s * (a.r + 5) - 7, a.spring, 14, BACK_FLOOR - a.spring);
  }
}

/** The pall: the king's banner hung in the apse, a tattered purple cloth with his sigil (a crown over a foot) in
 * tarnished gold, rippling in the draught off the tomb (phase 0…1 loops; amp for a stomp's gust). Painted in its own
 * frame (PALL.w × PALL.h, rod at the top). */
const PALL = { x: PK.apse.x, y: 402, w: 150, h: 230 };
const PALL_K = 0.6;
const PALL_N = 10;
function pallFrame(c: Ctx, ph: number): void {
  const { w, h } = PALL;
  const f = ph * P2;
  const cx = w / 2;
  const top = 10;
  const bw = 112;
  // the cloth's outline: hanging straight from the rod, its hem torn into tatters that trail and swing
  const edge = (t: number) => Math.sin(t * 4 - f) * 3 * t;
  const cloth = (g: Ctx) => {
    g.beginPath();
    g.moveTo(cx - bw / 2, top);
    g.lineTo(cx + bw / 2, top);
    for (let t = 0; t <= 1; t += 0.1) g.lineTo(cx + bw / 2 + edge(t) - t * 4, top + t * (h - 70));
    // tatters: ragged points of different lengths, each swinging on its own
    const tat = [[0.92, 52], [0.78, 22], [0.64, 40], [0.5, 16], [0.36, 58], [0.22, 26], [0.08, 44]] as const;
    for (const [u, len] of tat) {
      const x = cx - bw / 2 + u * bw;
      const sw = Math.sin(f + u * 5) * 6 * (len / 40);
      g.lineTo(x + 7, top + h - 70 + Math.sin(u * 9) * 4);
      g.lineTo(x + sw, top + h - 70 + len);
      g.lineTo(x - 7, top + h - 72 + Math.cos(u * 7) * 4);
    }
    for (let t = 1; t >= 0; t -= 0.1) g.lineTo(cx - bw / 2 + edge(t) + t * 4, top + t * (h - 70));
    g.closePath();
  };
  // its shadow on the apse wall
  c.save();
  c.translate(6, 8);
  c.filter = 'blur(5px)';
  cloth(c);
  c.fillStyle = 'rgba(2,2,4,0.55)';
  c.fill();
  c.restore();
  drape(c, cloth, { x: cx - bw / 2 - 10, y: top, w: bw + 20, h }, PURPLE, {
    fold: 26,
    depth: 0.8,
    phase: f,
    pattern: (g, fold) => {
      // a gold border down the edges and along the hem, the sigil bending with the folds
      g.fillStyle = rgba(GOLD, 0.45);
      g.fillRect(cx - bw / 2, top, 8, h);
      g.fillRect(cx + bw / 2 - 8, top, 8, h);
      g.fillRect(cx - bw / 2, top + h - 84, bw, 7);
      const sx = (x: number, y: number) => x + fold(x, y) * 2.4;
      // the crown: a band and five points with pearls
      const cy0 = 40;
      g.fillStyle = rgba(GOLD, 0.58);
      g.beginPath();
      const cp: [number, number][] = [[-24, 0], [-26, -20], [-15, -9], [-8, -24], [0, -11], [8, -24], [15, -9], [26, -20], [24, 0]];
      cp.forEach(([x, y], k) => (k ? g.lineTo(sx(cx + x, cy0 + y), cy0 + y) : g.moveTo(sx(cx + x, cy0 + y), cy0 + y)));
      g.closePath();
      g.fill();
      for (const [x, y] of [[-26, -22], [-8, -26], [8, -26], [26, -22]] as const) {
        g.beginPath();
        g.arc(sx(cx + x, cy0 + y), cy0 + y, 2.6, 0, P2);
        g.fill();
      }
      g.fillStyle = rgba(PURPLE, 0.7);
      g.fillRect(sx(cx - 22, cy0 - 5), cy0 - 5, 44, 2);
      // the foot: a footprint (heel, the arch cut in on the inside, the ball) and its five toes
      const fy0 = 84;
      const fk = 0.82;
      const fp: [number, number][] = [[0, 44], [-8, 40], [-11, 30], [-9, 18], [-7, 8], [-12, -2], [-14, -12], [-10, -20], [0, -23], [10, -20], [14, -10], [13, 4], [10, 20], [9, 32], [6, 41]];
      g.fillStyle = rgba(GOLD, 0.58);
      const P = fp.map(([x, y]) => [sx(cx + x * fk, fy0 + y * fk), fy0 + y * fk] as [number, number]);
      g.beginPath();
      g.moveTo(P[0][0], P[0][1]);
      for (let k = 0; k < P.length; k++) {
        const p0 = P[(k - 1 + P.length) % P.length];
        const p1 = P[k];
        const p2 = P[(k + 1) % P.length];
        const p3 = P[(k + 2) % P.length];
        g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
      }
      g.closePath();
      g.fill();
      for (const [dx, dy, rr] of [[-9, -33, 6.4], [1, -36, 5], [9, -34, 4.3], [15, -29, 3.7], [19, -22, 3.1]] as const) {
        const x = cx + dx * fk;
        const y = fy0 + dy * fk;
        g.beginPath();
        g.ellipse(sx(x, y), y, rr * fk, rr * fk * 1.2, 0, 0, P2);
        g.fill();
      }
    },
  });
  // moth holes and rot: dark holes through it, the hem frayed darker
  c.save();
  cloth(c);
  c.clip();
  c.fillStyle = 'rgba(30,26,24,0.75)';
  for (const [x, y, rr] of [[cx - 34, 150, 5], [cx + 30, 64, 4], [cx + 16, 172, 6], [cx - 20, 40, 3]] as const) {
    c.beginPath();
    c.ellipse(x + Math.sin(f + y) * 1.5, y, rr, rr * 1.3, 0, 0, P2);
    c.fill();
  }
  const hem = c.createLinearGradient(0, top + h - 110, 0, top + h);
  hem.addColorStop(0, 'rgba(8,4,10,0)');
  hem.addColorStop(1, 'rgba(8,4,10,0.6)');
  c.fillStyle = hem;
  c.fillRect(0, 0, w, h);
  // the fringe is the same cloth: purple, frayed darker towards its ends, loose threads
  const fr = c.createLinearGradient(0, top + h - 78, 0, top + h);
  fr.addColorStop(0, rgba('#4a2258', 0.7));
  fr.addColorStop(1, rgba('#1e0c26', 0.85));
  c.fillStyle = fr;
  c.fillRect(0, top + h - 78, w, 80);
  c.strokeStyle = rgba('#6a3a7a', 0.6);
  c.lineWidth = 1;
  for (let k = 0; k < 9; k++) {
    const x = cx - bw / 2 + 8 + k * 12;
    c.beginPath();
    c.moveTo(x, top + h - 72);
    c.quadraticCurveTo(x + Math.sin(f + k) * 3, top + h - 50, x + Math.sin(f * 1.3 + k * 2) * 5, top + h - 28 - (k % 3) * 8);
    c.stroke();
  }
  // the tomb's green light from below, the candles' warm on its left
  const gl = c.createLinearGradient(0, h, 0, h * 0.3);
  gl.addColorStop(0, rgba(GHOST, 0.08));
  gl.addColorStop(1, rgba(GHOST, 0));
  c.fillStyle = gl;
  c.fillRect(0, 0, w, h);
  c.restore();
  // the rod and its rings
  c.lineCap = 'round';
  c.strokeStyle = '#0a0806';
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(cx - 70, top - 2);
  c.lineTo(cx + 70, top - 2);
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 3.5;
  c.stroke();
  c.strokeStyle = 'rgba(255,220,170,0.3)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(cx - 68, top - 3.5);
  c.lineTo(cx + 68, top - 3.5);
  c.stroke();
  for (let k = 0; k < 6; k++) {
    const x = cx - bw / 2 + 6 + (k * (bw - 12)) / 5;
    c.strokeStyle = '#1a1612';
    c.lineWidth = 2.2;
    c.beginPath();
    c.ellipse(x, top, 4, 5, 0, 0, P2);
    c.stroke();
  }
}
const PALL_BOX = { x: PALL.x - PALL.w / 2, y: PALL.y - 10, w: PALL.w, h: PALL.h };
function pallStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(PALL_BOX.x, PALL_BOX.y);
  pallFrame(ctx, 0.15);
  ctx.restore();
}

// ——— the tunnel from the cellar ———

const tunnelPath: PathFn = (c) => {
  const t = PK.tunnel;
  c.beginPath();
  c.moveTo(t.x - t.r, BACK_FLOOR - 26);
  c.lineTo(t.x - t.r, t.spring);
  c.arc(t.x, t.spring, t.r, Math.PI, 0);
  c.lineTo(t.x + t.r, BACK_FLOOR - 26);
  c.closePath();
};

/** The cellar's tunnel arriving in the left bay: a brick barrel running back into the dark, the cellar's candles a
 * warm glint round its far turn, its floor two steps above the crypt's. */
function tunnel(ctx: Ctx, r: R): void {
  const t = PK.tunnel;
  const sill = BACK_FLOOR - 26;
  // a vanishing point for the tunnel (it runs straight back, slightly to the left)
  const tv = (x: number, y: number, s: number): [number, number] => [t.x - 30 + (x - (t.x - 30)) * s, 430 + (y - 430) * s];
  within(ctx, tunnelPath, () => {
    ctx.fillStyle = '#0c0806';
    ctx.fillRect(t.x - t.r, t.spring - t.r, t.r * 2, sill - t.spring + t.r);
    const RING = [1, 0.9, 0.81, 0.73, 0.66, 0.6, 0.545, 0.495, 0.45, 0.41, 0.375, 0.345, 0.32];
    for (let i = RING.length - 2; i >= 0; i--) {
      const s0 = RING[i];
      const s1 = RING[i + 1];
      const warm = Math.min(1, Math.max(0, (0.72 - (s0 + s1) / 2) / 0.38)) ** 1.6;
      const sec = (s: number, begin: boolean) => (c: Ctx) => {
        const [x0, y0] = tv(t.x - t.r, sill, s);
        const [, ys] = tv(0, t.spring, s);
        const [cx] = tv(t.x, 0, s);
        if (begin) c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x0, ys);
        c.arc(cx, ys, t.r * s, Math.PI, 0);
        c.lineTo(cx + t.r * s, y0);
        c.closePath();
      };
      ctx.beginPath();
      sec(s0, true)(ctx);
      sec(s1, false)(ctx);
      ctx.fillStyle = shade(mix('#2a1a14', '#9a5a2a', warm), -0.42 + warm * 0.3);
      ctx.fill('evenodd');
      // brick courses running back along it
      ctx.save();
      ctx.beginPath();
      sec(s0, true)(ctx);
      sec(s1, false)(ctx);
      ctx.clip('evenodd');
      ctx.strokeStyle = 'rgba(8,4,2,0.5)';
      ctx.lineWidth = 1;
      for (let k = 0; k <= 12; k++) {
        const a = Math.PI + (k / 12) * Math.PI;
        const pa = tv(t.x + Math.cos(a) * t.r, t.spring + Math.sin(a) * t.r, s0);
        const pb = tv(t.x + Math.cos(a) * t.r, t.spring + Math.sin(a) * t.r, s1);
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.stroke();
      }
      for (let y = t.spring + 14; y < sill; y += 16) {
        for (const x of [t.x - t.r, t.x + t.r]) {
          const pa = tv(x, y, s0);
          const pb = tv(x, y, s1);
          ctx.beginPath();
          ctx.moveTo(pa[0], pa[1]);
          ctx.lineTo(pb[0], pb[1]);
          ctx.stroke();
        }
      }
      ctx.restore();
      // the ring of headers at the near end of this stretch, lit a little from the far light
      {
        const [hx0] = tv(t.x - t.r, 0, s0);
        const [, hys] = tv(0, t.spring, s0);
        const [hcx] = tv(t.x, 0, s0);
        const [, hfy] = tv(0, sill, s0);
        ctx.strokeStyle = 'rgba(8,4,2,0.55)';
        ctx.lineWidth = 1.4 * s0;
        ctx.beginPath();
        ctx.moveTo(hx0, hfy);
        ctx.lineTo(hx0, hys);
        ctx.arc(hcx, hys, t.r * s0, Math.PI, 0);
        ctx.lineTo(hcx + t.r * s0, hfy);
        ctx.stroke();
        ctx.strokeStyle = rgba('#ffb060', 0.06 + warm * 0.18);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(hcx, hys + 1.5, t.r * s0 - 1.5, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
      }
      // the floor of this stretch
      const [fx0, fy0] = tv(t.x - t.r, sill, s0);
      const [fx1, fy1] = tv(t.x - t.r, sill, s1);
      const [cx0] = tv(t.x, 0, s0);
      const [cx1] = tv(t.x, 0, s1);
      ctx.fillStyle = shade(mix('#1e140e', '#7a4a22', warm), -0.4 + warm * 0.25);
      ctx.beginPath();
      ctx.moveTo(fx0, fy0);
      ctx.lineTo(fx1, fy1);
      ctx.lineTo(cx1 + (cx1 - fx1), fy1);
      ctx.lineTo(cx0 + (cx0 - fx0), fy0);
      ctx.closePath();
      ctx.fill();
    }
    // the far end: the tunnel turns; the cellar's candlelight round the corner
    const [fx, fy] = tv(t.x - t.r, sill, 0.32);
    const [, fs] = tv(0, t.spring, 0.32);
    const [fcx] = tv(t.x, 0, 0.32);
    ctx.fillStyle = '#4a2a16';
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fs);
    ctx.arc(fcx, fs, t.r * 0.32, Math.PI, 0);
    ctx.lineTo(fcx + t.r * 0.32, fy);
    ctx.closePath();
    ctx.fill();
    // the tunnel turns right at its end: the far wall lit by the cellar's candles round the corner, the corner's
    // edge dark against it, the light falling along the wet floor
    const lw = ctx.createLinearGradient(fcx - t.r * 0.32, 0, fcx + t.r * 0.32, 0);
    lw.addColorStop(0, '#5a3418');
    lw.addColorStop(0.6, '#b07038');
    lw.addColorStop(1, '#e0a060');
    ctx.fillStyle = lw;
    ctx.fillRect(fcx - t.r * 0.32, fs - t.r * 0.32, t.r * 0.64, fy - fs + t.r * 0.32);
    ctx.fillStyle = '#2a160c';
    ctx.fillRect(fcx + t.r * 0.12, fs - 6, 5, fy - fs + 6);
    glowAt(ctx, fcx + t.r * 0.3, (fs + fy) / 2, 70, CANDLE, 0.35);
    // brick courses on the lit far wall
    ctx.strokeStyle = 'rgba(60,24,8,0.5)';
    ctx.lineWidth = 0.8;
    for (let y = fs - 30; y < fy; y += 6) {
      ctx.beginPath();
      ctx.moveTo(fcx - t.r * 0.32, y);
      ctx.lineTo(fcx + t.r * 0.32, y);
      ctx.stroke();
    }
    // the wet floor's reflection of it, smeared towards us
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rf = ctx.createLinearGradient(0, fy, 0, sill);
    rf.addColorStop(0, rgba(CANDLE, 0.35));
    rf.addColorStop(1, rgba(CANDLE, 0));
    ctx.fillStyle = rf;
    ctx.beginPath();
    ctx.moveTo(fcx - 6, fy);
    ctx.lineTo(fcx + 18, fy);
    ctx.lineTo(fcx + 40, sill);
    ctx.lineTo(fcx - 34, sill);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // the warm along its wet floor
    lightPool(ctx, fcx, sill - 10, 60, 14, CANDLE, 0.18);
    vfill(ctx, t.x - t.r, t.spring - t.r, t.r * 2, sill - t.spring + t.r, [[0, 'rgba(4,2,2,0.6)'], [0.5, 'rgba(4,2,2,0.1)'], [1, 'rgba(4,2,2,0.3)']]);
  });
  // the brick ring of the tunnel's mouth (the cellar's brick against the crypt's stone)
  for (let k = 0; k < 22; k++) {
    const a0 = Math.PI + (k / 22) * Math.PI + 0.006;
    const a1 = Math.PI + ((k + 1) / 22) * Math.PI - 0.006;
    ctx.beginPath();
    ctx.arc(t.x, t.spring, t.r + 20, a0, a1);
    ctx.arc(t.x, t.spring, t.r + 1, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = shade(BRICK[Math.floor(r() * BRICK.length)], -0.45 + (r() - 0.5) * 0.1);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(6,3,2,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(t.x, t.spring, t.r + 20, Math.PI, 0);
  ctx.stroke();
  for (const x0 of [t.x - t.r - 20, t.x + t.r + 1]) {
    within(ctx, rectPath(x0, t.spring, 19, sill - t.spring), () => {
      bricks(ctx, r, { x: x0, y: t.spring, w: 19, h: sill - t.spring }, BRICK.map((c) => shade(c, -0.4)), '#3a342c', 38, 16);
    });
  }
  // the two steps down from the tunnel's floor to the crypt's
  for (const [k, y0, y1, ww] of [[0, sill, sill + 13, 0], [1, sill + 13, BACK_FLOOR, 12]] as const) {
    const sp = rectPath(t.x - t.r - 24 - ww, y0, (t.r + 24 + ww) * 2, y1 - y0);
    solid(ctx, sp, { x: t.x - t.r - 24 - ww, y: y0, w: (t.r + 24 + ww) * 2, h: y1 - y0 }, 'stone', '#3e3a34', { depth: 0.5, line: 1.2, formSize: 3 });
    within(ctx, sp, () => vfill(ctx, t.x - t.r - 30 - ww, y0, (t.r + 30 + ww) * 2, y1 - y0, [[0, rgba('#c8d8f0', 0.12 - k * 0.04)], [0.3, 'rgba(6,4,3,0.2)'], [1, 'rgba(6,4,3,0.5)']]));
  }
  web(ctx, r, t.x + t.r - 2, t.spring - 30, 34, Math.PI * 0.5, Math.PI * 0.85, 0.26);
}

// ——— the loculi ———

const NAMES = ['BIGFOOT', 'IRON HEEL', '', 'NONNA', 'KING HONK', 'T · REX', '', 'COSMIC CROC', ''];
/** Which slabs are broken open from inside (an echo got out). */
const BROKEN = [false, true, false, false, false, false, true, false, false];

function loculi(ctx: Ctx, r: R): void {
  const L = PK.loculi;
  // a point of the opening pushed back into the wall (k of the recess's depth)
  const inset = (x: number, y: number, k: number): [number, number] => [x + (VPX - x) * 0.07 * k, y + (VPY - y) * 0.07 * k];
  const quad = (pts: [number, number][], fill: string | CanvasGradient) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  for (let row = 0; row < L.rows; row++)
    for (let col = 0; col < L.cols; col++) {
      const i = row * L.cols + col;
      const x0 = L.x0 + col * L.cw + 10;
      const y0 = L.y0 + row * L.rh + 8;
      const w = L.cw - 20;
      const h = L.rh - 30;
      const x1 = x0 + w;
      const y1 = y0 + h;
      const hole = rectPath(x0, y0, w, h);
      // the stone round the opening darkened where it's been handled and damp
      aoHalo(ctx, hole, 10, 0.4, '#040302', 0);
      within(ctx, hole, () => {
        // the recess: its back face in deep shadow, its right-hand side and its floor turned to the light
        const b = [inset(x0, y0, 1), inset(x1, y0, 1), inset(x1, y1, 1), inset(x0, y1, 1)];
        ctx.fillStyle = '#060504';
        ctx.fillRect(x0, y0, w, h);
        quad(b, '#14110e');
        const jg = ctx.createLinearGradient(x1, 0, b[1][0], 0);
        jg.addColorStop(0, '#4a453e');
        jg.addColorStop(1, '#1e1b17');
        quad([[x1, y0], b[1], b[2], [x1, y1]], jg);
        const fg = ctx.createLinearGradient(0, y1, 0, b[3][1]);
        fg.addColorStop(0, '#3e3a34');
        fg.addColorStop(1, '#1a1714');
        quad([[x0, y1], [x1, y1], b[2], b[3]], fg);
        // the lintel's shadow falling into it from the top left
        vfill(ctx, x0, y0, w, h, [[0, 'rgba(2,2,2,0.85)'], [0.35, 'rgba(2,2,2,0.3)'], [1, 'rgba(2,2,2,0)']]);
        const lg = ctx.createLinearGradient(x0, 0, x0 + w * 0.3, 0);
        lg.addColorStop(0, 'rgba(2,2,2,0.6)');
        lg.addColorStop(1, 'rgba(2,2,2,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x0, y0, w, h);
        if (BROKEN[i]) {
          // broken open from inside: the void lit faintly green, a shrouded shape lying in it, rubble on its floor
          lightPool(ctx, (b[0][0] + b[1][0]) / 2, b[2][1] - 12, w * 0.5, h * 0.4, GHOST, 0.16);
          ctx.fillStyle = 'rgba(150,170,160,0.16)';
          ctx.beginPath();
          ctx.ellipse((b[0][0] + b[1][0]) / 2 + 4, b[2][1] - 7, w * 0.32, 6, -0.03, 0, P2);
          ctx.fill();
          // what's left of the slab: a jagged piece still set in the bottom left, cracked through
          const sl = inset(x0, y0, 0.45);
          const piece = polyPath([[x0 + 2, y1], [x0 + 2, sl[1] + h * 0.42], [x0 + w * 0.18, sl[1] + h * 0.5], [x0 + w * 0.3, sl[1] + h * 0.66], [x0 + w * 0.26, sl[1] + h * 0.8], [x0 + w * 0.46, y1 - 6], [x0 + w * 0.52, y1]]);
          solid(ctx, piece, { x: x0, y: y0, w: w * 0.6, h }, 'stone', '#5e5a52', { depth: 0.4, line: 1.4, formSize: 6, texA: 0.15 });
          within(ctx, piece, () => vfill(ctx, x0, y0, w, h, [[0, 'rgba(6,4,3,0.4)'], [1, 'rgba(6,4,3,0.15)']]));
          // its broken edge: the fresh stone paler, lit on its top
          ctx.strokeStyle = 'rgba(200,196,184,0.4)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x0 + 2, sl[1] + h * 0.42);
          ctx.lineTo(x0 + w * 0.18, sl[1] + h * 0.5);
          ctx.lineTo(x0 + w * 0.3, sl[1] + h * 0.66);
          ctx.stroke();
          crack(ctx, r, x0 + w * 0.12, y1 - 4, -1.2, 18, { col: '#0a0806', lip: '#a8a090', w: 1, a: 0.6 });
          // chips of it lying in the niche
          for (let k = 0; k < 5; k++) {
            const rx = x0 + w * 0.35 + r() * w * 0.5;
            const ry = y1 - 2 - r() * 4;
            const rr = 1.8 + r() * 3;
            const ch = polyPath([[rx - rr, ry + 1], [rx - rr * 0.4, ry - rr], [rx + rr * 0.8, ry - rr * 0.6], [rx + rr, ry + 1]]);
            solid(ctx, ch, { x: rx - rr, y: ry - rr, w: rr * 2, h: rr + 1 }, 'stone', '#5a564e', { depth: 0.45, line: 0.8, formSize: 2, texA: 0.1 });
          }
        }
      });
      if (!BROKEN[i]) {
        // the slab sealing it, set back in the recess: its jamb and sill still show in front of it
        const a0 = inset(x0, y0, 0.45);
        const a1 = inset(x1, y1, 0.45);
        const slab = rectPath(a0[0], a0[1], a1[0] - a0[0], a1[1] - a0[1]);
        const sb = { x: a0[0], y: a0[1], w: a1[0] - a0[0], h: a1[1] - a0[1] };
        solid(ctx, slab, sb, 'stone', NAMES[i] ? '#686459' : '#58544d', { depth: 0.5, line: 1.2, formSize: 6, texA: 0.12 });
        within(ctx, slab, () => {
          lay(ctx, noiseMask(6, 300 + i, { cover: 0.45, soft: 0.25, col: '#1a1814', w: 32, h: 24 }), sb, 0.3);
          // the lintel's shadow across its top, the light on it from the bottom right of the opening
          vfill(ctx, sb.x, sb.y, sb.w, sb.h, [[0, 'rgba(4,3,2,0.7)'], [0.3, 'rgba(4,3,2,0.25)'], [1, 'rgba(4,3,2,0.2)']]);
          const sg = ctx.createLinearGradient(sb.x, 0, sb.x + sb.w * 0.25, 0);
          sg.addColorStop(0, 'rgba(4,3,2,0.45)');
          sg.addColorStop(1, 'rgba(4,3,2,0)');
          ctx.fillStyle = sg;
          ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
        });
        if (NAMES[i]) {
          carve(ctx, NAMES[i], sb.x + sb.w / 2, sb.y + sb.h * 0.5, 12.5, 0.75);
          carve(ctx, '✝', sb.x + sb.w / 2, sb.y + sb.h * 0.2 + 2, 9, 0.5);
        } else {
          crack(ctx, r, sb.x + 8, sb.y + 6, 0.8, 36, { col: '#0a0806', lip: '#a8a090', w: 1.2, a: 0.5 });
        }
      }
      // the lintel over it: one long stone, standing a little proud, its shadow on the wall and the opening
      const lt = rectPath(x0 - 8, y0 - 13, w + 16, 13);
      castShadow(ctx, lt, 5, 5, 0.6, '#040302');
      solid(ctx, lt, { x: x0 - 8, y: y0 - 13, w: w + 16, h: 13 }, 'stone', '#5c5850', { depth: 0.45, line: 1.3, formSize: 4, texA: 0.12 });
      within(ctx, lt, () => vfill(ctx, x0 - 8, y0 - 13, w + 16, 13, [[0, 'rgba(200,214,232,0.12)'], [0.3, 'rgba(6,4,3,0.2)'], [1, 'rgba(6,4,3,0.55)']]));
      // the sill under it, worn, lit on its top
      const sl = rectPath(x0 - 5, y1, w + 10, 7);
      castShadow(ctx, sl, 4, 4, 0.55, '#040302');
      solid(ctx, sl, { x: x0 - 5, y: y1, w: w + 10, h: 7 }, 'stone', '#58544c', { depth: 0.45, line: 1.2, formSize: 2, texA: 0.12 });
      ctx.fillStyle = 'rgba(200,210,220,0.16)';
      ctx.fillRect(x0 - 4, y1, w + 8, 1.4);
      if (BROKEN[i] && row === L.rows - 1) {
        // rubble spilled over the sill and down the wall: lit chips of the slab, a big piece leaning below
        for (let k = 0; k < 7; k++) {
          const rx = x0 + 6 + r() * (w - 12);
          const ry = y1 - 1 - r() * 3;
          const rr = 2 + r() * 3.5;
          const ch = polyPath([[rx - rr, ry + 1], [rx - rr * 0.5, ry - rr], [rx + rr * 0.7, ry - rr * 0.7], [rx + rr, ry + 1]]);
          solid(ctx, ch, { x: rx - rr, y: ry - rr, w: rr * 2, h: rr + 1 }, 'stone', '#6a665c', { depth: 0.45, line: 1, formSize: 2, texA: 0.1 });
        }
        const fx = x0 + w * 0.55;
        const fy = BACK_FLOOR - 30;
        const fallen = polyPath([[fx, fy + 30], [fx + 6, fy], [fx + 34, fy + 4], [fx + 40, fy + 14], [fx + 30, fy + 30]]);
        castShadow(ctx, fallen, 5, 5, 0.6, '#040302');
        groundShadow(ctx, fx + 26, fy + 30, 30, 4, 0.6, '#040302');
        solid(ctx, fallen, { x: fx, y: fy, w: 40, h: 30 }, 'stone', '#4a463f', { depth: 0.45, line: 1.3, formSize: 6, texA: 0.12 });
        within(ctx, fallen, () => vfill(ctx, fx, fy, 40, 30, [[0, 'rgba(200,210,220,0.12)'], [1, 'rgba(6,4,3,0.45)']]));
      }
    }
  web(ctx, r, L.x0 + L.cw * 3 - 6, L.y0 - 4, 58, Math.PI * 0.52, Math.PI * 0.95, 0.2);
}

/** Letters cut into stone: the cut's shadow on its upper-left, its lit lower-right lip. */
/** A torn web: a few threads strung between two points, sagging, one broken and hanging, dust clotted on them. */
function strands(ctx: Ctx, r: R, x0: number, y0: number, x1: number, y1: number, n: number): void {
  ctx.save();
  ctx.lineWidth = 0.8;
  for (let k = 0; k < n; k++) {
    const a = 0.12 + r() * 0.14;
    ctx.strokeStyle = rgba('#e4e0d4', a);
    const sx = x0 + (r() - 0.5) * 14;
    const sy = y0 + (r() - 0.5) * 14;
    const ex = x1 + (r() - 0.5) * 20;
    const ey = y1 + (r() - 0.5) * 20;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    if (k === n - 1) {
      // broken: hanging from its start, curling at the end
      ctx.quadraticCurveTo(sx + 10, sy + 30, sx + 4, sy + 56 + r() * 20);
    } else {
      ctx.quadraticCurveTo((sx + ex) / 2, (sy + ey) / 2 + 14 + r() * 16, ex, ey);
    }
    ctx.stroke();
    ctx.fillStyle = rgba('#d8d4c8', a * 1.6);
    ctx.beginPath();
    ctx.arc(sx + (ex - sx) * 0.4, sy + (ey - sy) * 0.4 + 10, 1 + r() * 1.4, 0, P2);
    ctx.fill();
  }
  ctx.restore();
}

function carve(ctx: Ctx, text: string, x: number, y: number, size: number, a: number): void {
  ctx.save();
  ctx.font = `600 ${size}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba('#e8e0cc', a * 0.35);
  ctx.fillText(text, x + 0.8, y + 0.9);
  ctx.fillStyle = rgba('#0a0806', a * 1.4);
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ——— the arcade (front plane) ———

function arcade(ctx: Ctx, r: R): void {
  // the columns' shadows thrown down-right across the floor and up the end wall
  for (const cx of PK.cols) {
    const p = rectPath(cx - PK.shaftW / 2, SPRING + 70, PK.shaftW, TY - SPRING - 70);
    castShadow(ctx, p, 60, 40, 0.5, '#040302');
  }
  // the front wall over the arches: big blocks, sooted and dark
  const spandrel: PathFn = (c) => {
    c.beginPath();
    c.rect(-10, -10, W + 20, SPRING + 10);
    for (const cx of [-80, ...PK.bays, 2000]) {
      c.moveTo(cx + PK.ro, SPRING);
      c.arc(cx, SPRING, PK.ro, 0, Math.PI, true);
      c.closePath();
    }
  };
  ctx.save();
  spandrel(ctx);
  ctx.clip('evenodd');
  ashlar(ctx, r, { x: 0, y: 0, w: W, h: SPRING }, STONE, MORTAR, { rowH: 50, minW: 80, maxW: 170, weather: 0.8, seed: 71 });
  surface(ctx, r, { x: 0, y: 0, w: W, h: SPRING }, '#5e5a54', { over: true, vary: 0.4, cells: 5, mottle: 0.3, strokes: 0, grain: 0, warm: '#8a8070', cool: '#2a3440', seed: 73 });
  vfill(ctx, 0, 0, W, SPRING, [[0, 'rgba(5,4,3,0.92)'], [0.6, 'rgba(5,4,3,0.75)'], [1, 'rgba(5,4,3,0.55)']]);
  for (const x of [700, 1220]) streaks(ctx, r, x, 170, 30, 120, '#d8dccc', 0.06, 2);
  ctx.restore();
  // the arch rings: voussoirs, each its own stone, joints radial; the soffit lit from below by the candles and
  // the tomb, the face catching the moon from the left
  for (const cx of [-80, ...PK.bays, 2000]) {
    const n = 23;
    for (let k = 0; k < n; k++) {
      const a0 = Math.PI + (k / n) * Math.PI + 0.004;
      const a1 = Math.PI + ((k + 1) / n) * Math.PI - 0.004;
      const p: PathFn = (c) => {
        c.beginPath();
        c.arc(cx, SPRING, PK.ro, a0, a1);
        c.arc(cx, SPRING, PK.ri, a1, a0, true);
        c.closePath();
      };
      const am = (a0 + a1) / 2;
      const col = shade(STONE[Math.floor(r() * STONE.length)], -0.28 + (r() - 0.5) * 0.1);
      within(ctx, p, () => {
        ctx.fillStyle = col;
        ctx.fillRect(cx - PK.ro, SPRING - PK.ro, PK.ro * 2, PK.ro);
        // up on the crown it's darker; the left haunch faces the moonlight
        const k2 = -Math.sin(am);
        ctx.fillStyle = `rgba(5,4,3,${(0.25 + k2 * 0.45).toFixed(3)})`;
        ctx.fillRect(cx - PK.ro, SPRING - PK.ro, PK.ro * 2, PK.ro);
        if (Math.cos(am) < 0) {
          ctx.fillStyle = rgba(MOON, 0.06 * -Math.cos(am));
          ctx.fillRect(cx - PK.ro, SPRING - PK.ro, PK.ro * 2, PK.ro);
        }
      });
      ctx.strokeStyle = 'rgba(5,3,2,0.7)';
      ctx.lineWidth = 1.6;
      p(ctx);
      ctx.stroke();
    }
    // the intrados's arris: lit from below (the tomb green in the middle bay, the candles warm)
    const lit = cx === 960 ? GHOST : cx === 440 ? MOON : CANDLE;
    ctx.strokeStyle = rgba(lit, cx === 960 ? 0.22 : 0.1);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, SPRING, PK.ri + 1, Math.PI, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(5,3,2,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, SPRING, PK.ro, Math.PI, 0);
    ctx.stroke();
  }
  // cobwebs in the arches' corners
  web(ctx, r, 700 - 46, SPRING - 4, 120, Math.PI * 1.08, Math.PI * 1.38, 0.17);
  strands(ctx, r, 1220 + 70, SPRING - 120, 1220 + 150, SPRING - 210, 5);
  web(ctx, r, 180 + 36, SPRING - 8, 64, Math.PI * 1.62, Math.PI * 1.92, 0.24);
  for (const cx of PK.cols) column(ctx, r, cx);
}

/** A squat Romanesque column: an attic base, a stout shaft of drums, a cushion capital under its abacus. */
function column(ctx: Ctx, r: R, cx: number): void {
  const hw = PK.shaftW / 2;
  const capB = SPRING + 74;
  const baseT = TY - 46;
  // which side faces the tomb's candles (warm) and green
  const toDais = cx === 700 ? 1 : cx === 1220 ? -1 : 0;
  // the shaft: drums, a cylinder's light (lit a third in from the left, dark on its right, a cool rim)
  const sp = rectPath(cx - hw, capB, PK.shaftW, baseT - capB);
  solid(ctx, sp, { x: cx - hw, y: capB, w: PK.shaftW, h: baseT - capB }, 'stone', '#5e5a53', { depth: 0.08, line: 2.4, formSize: 30, texA: 0.1 });
  within(ctx, sp, () => {
    surface(ctx, r, { x: cx - hw, y: capB, w: PK.shaftW, h: baseT - capB }, '#6a655d', { over: true, vary: 0.5, cells: 3, mottle: 0.4, strokes: 0.6, strokeAng: Math.PI / 2, strokeLen: 40, grain: 0.3, grainKind: 'speckle', seed: cx });
    const cyl = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
    cyl.addColorStop(0, 'rgba(6,4,3,0.55)');
    cyl.addColorStop(0.28, 'rgba(6,4,3,0.15)');
    cyl.addColorStop(0.55, 'rgba(6,4,3,0.4)');
    cyl.addColorStop(1, 'rgba(6,4,3,0.85)');
    ctx.fillStyle = cyl;
    ctx.fillRect(cx - hw, capB, PK.shaftW, baseT - capB);
    // drum joints, curving round the shaft (we look up at the high ones, down at the low ones)
    for (let y = capB + 62 + r() * 20; y < baseT - 20; y += 80 + r() * 30) {
      const bow = (y - VPY) * 0.03;
      ctx.strokeStyle = 'rgba(6,4,3,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - hw, y);
      ctx.quadraticCurveTo(cx, y + bow, cx + hw, y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(220,214,200,0.1)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - hw, y + 2);
      ctx.quadraticCurveTo(cx, y + bow + 2, cx + hw, y + 2);
      ctx.stroke();
    }
    // damp rising up it from the floor, salts at its tide line, grime where hands have steadied themselves
    vfill(ctx, cx - hw, 500, PK.shaftW, baseT - 500, [[0, 'rgba(10,16,12,0)'], [1, 'rgba(10,16,12,0.45)']]);
    lay(ctx, noiseMask(10, cx + 3, { cover: 0.35, soft: 0.1, col: '#e0e0d4', w: 32, h: 32 }), { x: cx - hw, y: 560, w: PK.shaftW, h: 40 }, 0.05);
    // the candles' warm and the tomb's green on the side facing the dais
    if (toDais) {
      const g = ctx.createLinearGradient(cx - toDais * hw, 0, cx + toDais * hw, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, rgba(CANDLE, 0.28));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(cx - hw, 400, PK.shaftW, baseT - 400);
      const gg = ctx.createLinearGradient(0, 360, 0, 640);
      gg.addColorStop(0, rgba(GHOST, 0));
      gg.addColorStop(0.5, rgba(GHOST, 0.06));
      gg.addColorStop(1, rgba(GHOST, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(cx - hw, 360, PK.shaftW, 280);
      ctx.restore();
    }
  });
  rim(ctx, sp, 0.2, 3, toDais < 0 ? '#ffc890' : '#9ab8e8');
  // the neck ring
  const nk = rrPath2(cx - hw - 4, capB - 4, PK.shaftW + 8, 10, 4);
  solid(ctx, nk, { x: cx - hw - 4, y: capB - 4, w: PK.shaftW + 8, h: 10 }, 'stone', '#625d55', { depth: 0.08, line: 2, formSize: 4, texA: 0.12 });
  within(ctx, nk, () => vfill(ctx, cx - hw - 4, capB - 4, PK.shaftW + 8, 10, [[0, 'rgba(6,4,3,0.1)'], [1, 'rgba(6,4,3,0.5)']]));
  // the cushion capital: a block rounded off below into the shaft, a lunette shield on its face
  const cw = 74;
  const top = SPRING + 18;
  const cap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(cx - cw, top);
    c.lineTo(cx + cw, top);
    c.lineTo(cx + cw, top + 14);
    c.bezierCurveTo(cx + cw, top + 44, cx + hw + 4, capB - 14, cx + hw + 2, capB - 3);
    c.lineTo(cx - hw - 2, capB - 3);
    c.bezierCurveTo(cx - hw - 4, capB - 14, cx - cw, top + 44, cx - cw, top + 14);
    c.closePath();
  };
  castShadow(ctx, cap, 8, 8, 0.5, '#040302');
  solid(ctx, cap, { x: cx - cw, y: top, w: cw * 2, h: capB - top }, 'stone', '#635e56', { depth: 0.08, line: 2.4, formSize: 22, texA: 0.1 });
  within(ctx, cap, () => {
    surface(ctx, r, { x: cx - cw, y: top, w: cw * 2, h: capB - top }, '#6e695f', { over: true, vary: 0.4, cells: 2, mottle: 0.4, strokes: 0, grain: 0.3, grainKind: 'speckle', seed: cx + 9 });
    // the shield: a half-disc face, its rim standing proud
    ctx.strokeStyle = 'rgba(6,4,3,0.55)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, top + 6, cw - 12, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,214,200,0.14)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, top + 8, cw - 14, 0.25, Math.PI * 0.6);
    ctx.stroke();
    // the light: from below (candles, green) on the cushion's underside in the middle bay, dark above
    vfill(ctx, cx - cw, top, cw * 2, capB - top, [[0, 'rgba(6,4,3,0.55)'], [0.5, 'rgba(6,4,3,0.3)'], [1, 'rgba(6,4,3,0.5)']]);
    const cyl = ctx.createLinearGradient(cx - cw, 0, cx + cw, 0);
    cyl.addColorStop(0, 'rgba(6,4,3,0.1)');
    cyl.addColorStop(1, 'rgba(6,4,3,0.5)');
    ctx.fillStyle = cyl;
    ctx.fillRect(cx - cw, top, cw * 2, capB - top);
  });
  // the abacus: a square slab, its chamfered lower edge
  const ab = polyPath([[cx - cw - 8, SPRING], [cx + cw + 8, SPRING], [cx + cw + 8, SPRING + 10], [cx + cw, SPRING + 18], [cx - cw, SPRING + 18], [cx - cw - 8, SPRING + 10]]);
  castShadow(ctx, ab, 8, 8, 0.5, '#040302');
  solid(ctx, ab, { x: cx - cw - 8, y: SPRING, w: (cw + 8) * 2, h: 18 }, 'stone', '#6a655c', { depth: 0.08, line: 2.2, formSize: 4, texA: 0.12 });
  within(ctx, ab, () => {
    vfill(ctx, cx - cw - 8, SPRING, (cw + 8) * 2, 18, [[0, 'rgba(6,4,3,0.4)'], [0.55, 'rgba(6,4,3,0.3)'], [0.6, 'rgba(6,4,3,0.55)'], [1, 'rgba(6,4,3,0.6)']]);
    ctx.fillStyle = 'rgba(200,214,232,0.1)';
    ctx.fillRect(cx - cw - 8, SPRING, 40, 10);
  });
  // the base: a lower torus wider than the upper, a scotia between, a square plinth on the floor
  groundShadow(ctx, cx + 22, TY - 2, 96, 10, 0.6, '#040302');
  const plinth = rectPath(cx - 66, TY - 18, 132, 22);
  castShadow(ctx, plinth, 10, 10, 0.6, '#040302');
  solid(ctx, plinth, { x: cx - 66, y: TY - 18, w: 132, h: 22 }, 'stone', '#5e5950', { depth: 0.08, line: 2.2, formSize: 4, texA: 0.12 });
  const torus = (y: number, rx: number, ry: number) => ellPath(cx, y, rx, ry);
  for (const [y, rx, ry] of [[TY - 26, 64, 10], [TY - 40, 56, 7]] as const) {
    solid(ctx, torus(y, rx, ry), { x: cx - rx, y: y - ry, w: rx * 2, h: ry * 2 }, 'stone', '#68635a', { depth: 0.08, line: 2, formSize: 8, texA: 0.12 });
    within(ctx, torus(y, rx, ry), () => {
      const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
      g.addColorStop(0, 'rgba(6,4,3,0.4)');
      g.addColorStop(0.3, 'rgba(6,4,3,0)');
      g.addColorStop(1, 'rgba(6,4,3,0.7)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - rx, y - ry, rx * 2, ry * 2);
    });
  }
  within(ctx, plinth, () => vfill(ctx, cx - 66, TY - 18, 132, 22, [[0, 'rgba(6,4,3,0.2)'], [1, 'rgba(6,4,3,0.6)']]));
  // chipped where things have knocked it, grime round the foot
  lay(ctx, noiseMask(8, cx + 7, { cover: 0.4, soft: 0.2, col: '#0a0806', w: 32, h: 16 }), { x: cx - 66, y: TY - 50, w: 132, h: 50 }, 0.35);
}
const rrPath2 = (x: number, y: number, w: number, h: number, rr: number): PathFn => (c) => {
  c.beginPath();
  c.roundRect(x, y, w, h, rr);
};

// ——— the tomb ———

const RIM = { fl: [S.x0 + 8, S.top] as [number, number], fr: [S.x1 - 8, S.top] as [number, number], bl: at(S.x0 + 8, S.top, SARC_D), br: at(S.x1 - 8, S.top, SARC_D) };

/** The inside of the box seen through the gap under the shoved lid: dark, lit from within by the cold green. */
function sarcInner(ctx: Ctx): void {
  const xR = S.x1 + PK.lidShift;
  // the void: the inside of the box, deep and dark, the green welling up from its bottom
  const open = polyPath([RIM.fl, [xR, S.top], [xR, RIM.bl[1]], RIM.bl]);
  within(ctx, open, () => {
    ctx.fillStyle = '#040b0a';
    ctx.fillRect(S.x0, RIM.bl[1] - 4, xR - S.x0, S.top - RIM.bl[1] + 8);
    // the inside face of the back wall, going down into the dark (lit from below by the green)
    vfill(ctx, S.x0, RIM.bl[1], xR - S.x0, S.top - RIM.bl[1], [[0, '#3a4a44'], [0.35, '#16261f'], [1, '#081410']]);
    // the inside face of the left end wall, turned to us
    ctx.fillStyle = '#22322c';
    ctx.beginPath();
    ctx.moveTo(RIM.bl[0], RIM.bl[1]);
    ctx.lineTo(RIM.bl[0] + 10, RIM.bl[1]);
    ctx.lineTo(S.x0 + 18, S.top);
    ctx.lineTo(S.x0 + 8, S.top);
    ctx.closePath();
    ctx.fill();
    // the back wall's top arris, catching the moon
    ctx.fillStyle = 'rgba(200,214,232,0.35)';
    ctx.fillRect(RIM.bl[0], RIM.bl[1], xR - RIM.bl[0], 1.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    lightPool(ctx, S.x0 + 30, S.top + 2, 50, 14, GHOST, 0.5);
    lightPool(ctx, S.x0 + 30, S.top, 18, 6, '#e0fff4', 0.35);
    lightPool(ctx, S.x0 + 120, S.top - 4, 170, 9, GHOST, 0.55);
    lightPool(ctx, S.x0 + 70, S.top - 3, 70, 5, '#d0fff0', 0.4);
    ctx.restore();
  });
}
const INNER_BOX = { x: S.x0, y: RIM.bl[1] - 6, w: S.x1 - S.x0 + PK.lidShift + 4, h: S.top - RIM.bl[1] + 10 };

/** The dais's steps, the sarcophagus (without its lid), the effigy's lid is a sprite of its own. */
function dais(ctx: Ctx, r: R): void {
  // the steps, bottom up: risers in shade, treads lit (the candles on them, the green from above)
  for (const [i, s] of STEPS.entries()) {
    const p = rectPath(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0);
    castShadow(ctx, p, 10, 10, 0.5, '#040302');
    solid(ctx, p, { x: s.x0, y: s.y0, w: s.x1 - s.x0, h: s.y1 - s.y0 }, 'stone', '#5a564e', { depth: 0.1, line: 2, formSize: 4, texA: 0.12 });
    within(ctx, p, () => {
      surface(ctx, r, { x: s.x0, y: s.y0, w: s.x1 - s.x0, h: s.y1 - s.y0 }, '#5a564e', { over: true, vary: 0.4, cells: 4, mottle: 0.4, strokes: 0, grain: 0.3, grainKind: 'speckle', seed: 80 + i });
      vfill(ctx, s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0, [[0, 'rgba(255,220,170,0.1)'], [0.2, 'rgba(6,4,3,0.25)'], [1, 'rgba(6,4,3,0.55)']]);
      // worn hollow in the middle of each tread where the mourners knelt
      ctx.fillStyle = 'rgba(6,4,3,0.18)';
      ctx.beginPath();
      ctx.ellipse(960, s.y0 + 2, 120, 3, 0, 0, P2);
      ctx.fill();
      // joints between the slabs
      ctx.strokeStyle = 'rgba(6,4,3,0.55)';
      ctx.lineWidth = 1.4;
      for (let x = s.x0 + 70 + i * 30; x < s.x1 - 20; x += 120) {
        ctx.beginPath();
        ctx.moveTo(x, s.y0);
        ctx.lineTo(x, s.y1);
        ctx.stroke();
      }
    });
    ctx.fillStyle = rgba('#d8e8f0', 0.18);
    ctx.fillRect(s.x0 + 2, s.y0, s.x1 - s.x0 - 4, 1.6);
  }
  // ——— the sarcophagus: a carved box on the top step
  const body = rectPath(S.x0, S.top, S.x1 - S.x0, S.bot - S.top);
  castShadow(ctx, body, 16, 16, 0.55, '#040302');
  solid(ctx, body, { x: S.x0, y: S.top, w: S.x1 - S.x0, h: S.bot - S.top }, 'stone', '#6e685e', { depth: 0.1, line: 2.6, formSize: 20, texA: 0.12 });
  within(ctx, body, () => {
    surface(ctx, r, { x: S.x0, y: S.top, w: S.x1 - S.x0, h: S.bot - S.top }, '#6e685e', { over: true, vary: 0.45, cells: 4, mottle: 0.4, strokes: 0.3, grain: 0.3, grainKind: 'speckle', seed: 91 });
    // a plinth course and a cornice band
    ctx.fillStyle = 'rgba(6,4,3,0.35)';
    ctx.fillRect(S.x0, S.bot - 12, S.x1 - S.x0, 12);
    ctx.fillStyle = 'rgba(220,214,200,0.12)';
    ctx.fillRect(S.x0, S.bot - 12, S.x1 - S.x0, 1.6);
    ctx.fillStyle = 'rgba(6,4,3,0.3)';
    ctx.fillRect(S.x0, S.top, S.x1 - S.x0, 10);
    ctx.fillStyle = 'rgba(220,214,200,0.12)';
    ctx.fillRect(S.x0, S.top + 10, S.x1 - S.x0, 1.4);
    // the arcade of little niches along the front, the roundel in the middle
    const n = 6;
    const aw = 34;
    const gap = ((S.x1 - S.x0) - 120 - n * aw) / (n + 1);
    for (let k = 0; k < n; k++) {
      const x = S.x0 + gap + k * (aw + gap) + (k >= n / 2 ? 120 : 0);
      const y0 = S.top + 22;
      const y1 = S.bot - 20;
      const niche: PathFn = (c) => {
        c.beginPath();
        c.moveTo(x, y1);
        c.lineTo(x, y0 + aw / 2);
        c.arc(x + aw / 2, y0 + aw / 2, aw / 2, Math.PI, 0);
        c.lineTo(x + aw, y1);
        c.closePath();
      };
      within(ctx, niche, () => {
        ctx.fillStyle = 'rgba(6,4,3,0.42)';
        ctx.fillRect(x - 2, y0, aw + 4, y1 - y0);
        // the recess's top-left in shadow, its bottom-right lit edge
        ctx.fillStyle = 'rgba(6,4,3,0.4)';
        ctx.fillRect(x, y0, 4, y1 - y0);
        ctx.fillRect(x, y0, aw, 5);
      });
      ctx.strokeStyle = 'rgba(220,214,200,0.16)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + aw, y0 + aw / 2);
      ctx.lineTo(x + aw, y1);
      ctx.stroke();
      // the colonnettes between
      ctx.fillStyle = 'rgba(220,214,200,0.08)';
      ctx.fillRect(x - gap / 2 - 2, y0 + 6, 4, y1 - y0 - 6);
    }
    // the roundel: his sigil, a crowned foot in a wreath, cut in relief
    const rx = 960;
    const ry = (S.top + S.bot) / 2 + 2;
    ctx.fillStyle = 'rgba(6,4,3,0.35)';
    ctx.beginPath();
    ctx.arc(rx, ry, 36, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,214,200,0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(rx, ry, 38, 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(6,4,3,0.6)';
    ctx.beginPath();
    ctx.arc(rx, ry, 38, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    const relief = (p: PathFn) => {
      ctx.save();
      ctx.translate(-1.5, -1.5);
      ctx.fillStyle = 'rgba(230,224,210,0.3)';
      p(ctx);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(1.5, 1.5);
      ctx.fillStyle = 'rgba(6,4,3,0.5)';
      p(ctx);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#686258';
      p(ctx);
      ctx.fill();
    };
    relief((c) => {
      c.beginPath();
      c.ellipse(rx, ry + 10, 11, 17, 0, 0, P2);
      for (const [dx, dy, rr] of [[-9, -10, 4], [-3, -13, 3.4], [3, -13, 3], [8, -11, 2.7], [12, -8, 2.3]] as const) {
        c.moveTo(rx + dx + rr, ry + dy);
        c.arc(rx + dx, ry + dy, rr, 0, P2);
      }
    });
    relief(polyPath([[rx - 16, ry - 18], [rx - 17, ry - 32], [rx - 8, ry - 24], [rx, ry - 36], [rx + 8, ry - 24], [rx + 17, ry - 32], [rx + 16, ry - 18]]));
    // the light: the candles warm on the ends, the tomb's green spilling down the left end, dark under the lid
    vfill(ctx, S.x0, S.top, S.x1 - S.x0, S.bot - S.top, [[0, 'rgba(6,4,3,0.5)'], [0.25, 'rgba(6,4,3,0.15)'], [1, 'rgba(6,4,3,0.35)']]);
    lightPool(ctx, S.x0 + 10, S.top + 40, 90, 70, CANDLE, 0.2);
    lightPool(ctx, S.x1 - 10, S.top + 40, 90, 70, CANDLE, 0.18);
    lightPool(ctx, S.x0 + 30, S.top + 10, 70, 50, GHOST, 0.18);
    // ectoplasm stains run down from the gap, nitre
    streaks(ctx, r, S.x0 + 24, S.top + 2, 40, 80, '#2a5a4a', 0.35, 4);
  });
  // the box's rim at the gap: the front wall's thickness, its lit top
  ctx.fillStyle = '#7a746a';
  ctx.fillRect(S.x0, S.top - 2, S.x1 - S.x0, 4);
  ctx.fillStyle = rgba('#c8fff0', 0.5);
  ctx.fillRect(S.x0 + 2, S.top - 2, GAP_X1 - S.x0 - 2, 1.4);
  ctx.fillStyle = rgba('#c8fff0', 0.18);
  ctx.fillRect(GAP_X1, S.top - 2, S.x1 - GAP_X1 - 40, 1.2);
  const lw = polyPath([[S.x0, S.top], [S.x0, S.top - 2], RIM.bl, [RIM.bl[0] + 6, RIM.bl[1]], [S.x0 + 8, S.top]]);
  solid(ctx, lw, { x: S.x0, y: RIM.bl[1], w: 20, h: S.top - RIM.bl[1] }, 'stone', '#7a746a', { depth: 0.1, line: 1.6, formSize: 2 });
  // wax and dust on the steps
  for (const [x, y] of [[870, 726], [1060, 742], [910, 758]] as const) {
    ctx.fillStyle = 'rgba(232,222,196,0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 2.4, 0, 0, P2);
    ctx.fill();
  }
}
const DAIS_BOX = { x: 700, y: S.top - 14, w: 520, h: TY - S.top + 14 };

/** The lid: a thick slab shoved to the right and twisted, the king's effigy lying on it in state: a pillow under his
 * crowned head, his hands folded on his breast, his great stone feet toes-up at the end. Painted in place. */
function lid(ctx: Ctx, r: R): void {
  const dx = PK.lidShift;
  const x0 = S.x0 - 4 + dx;
  const x1 = S.x1 + 4 + dx;
  const fb = S.top;
  const ft = LID_TOP_F;
  const [bx0, bt] = at(x0, ft, SARC_D);
  const [bx1] = at(x1, ft, SARC_D);
  ctx.save();
  // twisted: its left end lifted a little where it was pushed from inside
  ctx.translate(x1, fb);
  ctx.rotate(-LID_TIP);
  ctx.translate(-x1, -fb);
  const face = rectPath(x0, ft, x1 - x0, fb - ft);
  const top = polyPath([[x0, ft], [x1, ft], [bx1 + 4, bt], [bx0 + 4, bt]]);
  castShadow(ctx, face, 8, 8, 0.6, '#040302');
  solid(ctx, top, { x: x0, y: bt, w: x1 - x0, h: ft - bt }, 'stone', '#827b70', { depth: 0.1, line: 2, formSize: 6, texA: 0.12 });
  within(ctx, top, () => {
    lay(ctx, noiseMask(14, 97, { cover: 0.4, soft: 0.2, col: '#2a2620', w: 96, h: 16 }), { x: x0, y: bt, w: x1 - x0, h: ft - bt }, 0.3);
    vfill(ctx, x0, bt, x1 - x0, ft - bt, [[0, 'rgba(6,4,3,0.4)'], [1, 'rgba(255,230,200,0.06)']]);
  });
  solid(ctx, face, { x: x0, y: ft, w: x1 - x0, h: fb - ft }, 'stone', '#6e685e', { depth: 0.1, line: 2.4, formSize: 6, texA: 0.12 });
  within(ctx, face, () => {
    surface(ctx, r, { x: x0, y: ft, w: x1 - x0, h: fb - ft }, '#6e685e', { over: true, vary: 0.4, cells: 4, mottle: 0.4, strokes: 0, grain: 0.3, grainKind: 'speckle', seed: 99 });
    vfill(ctx, x0, ft, x1 - x0, fb - ft, [[0, 'rgba(220,214,200,0.1)'], [0.2, 'rgba(6,4,3,0.15)'], [1, 'rgba(6,4,3,0.5)']]);
    carve(ctx, 'R E X   P E D V M', (x0 + x1) / 2, (ft + fb) / 2 + 1, 12, 0.55);
    // chipped at the corner it was shoved by
    ctx.fillStyle = 'rgba(6,4,3,0.6)';
    ctx.beginPath();
    ctx.moveTo(x0, ft + 4);
    ctx.lineTo(x0 + 12, ft);
    ctx.lineTo(x0, ft);
    ctx.fill();
  });
  // the green light from the gap on the lid's underside edge and its left end
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  lightPool(ctx, x0 + 6, fb - 2, 40, 8, GHOST, 0.5);
  ctx.restore();
  // ——— the effigy: a stone king lying in state along the lid (we see him from the side): his head on a tasselled
  // pillow, crowned, his face turned up, his beard on his breast, his hands pressed together in prayer, his robe
  // falling in folds to his great stone feet, toes up at the end
  effigy(ctx, x0, (ft + bt) / 2 + 2);
  ctx.restore();
}

function effigy(ctx: Ctx, x0: number, ly: number): void {
  const MARBLE = '#9a9286';
  // (carved bigger than life: drawn up from its pillow end)
  ctx.save();
  ctx.translate(x0 + 20, ly);
  ctx.scale(1.12, 1.32);
  ctx.translate(-(x0 + 20), -ly);
  const STEP = (p: PathFn, box: { x: number; y: number; w: number; h: number }, base = MARBLE, line = 1.6) => {
    castShadow(ctx, p, 5, 5, 0.45, '#040302');
    solid(ctx, p, box, 'stone', base, { depth: 0.1, line, formSize: Math.min(box.w, box.h) * 0.5, texA: 0.12 });
    within(ctx, p, () => {
      // the stone's own grain and pitting
      lay(ctx, noiseMask(5, Math.round(box.x + box.w), { cover: 0.4, soft: 0.25, col: '#2a2620', w: 24, h: 16 }), box, 0.22);
      // the moon's light from the top left catching every upper-left edge, the far side in shade
      ctx.save();
      ctx.translate(1.8, 1.4);
      ctx.strokeStyle = 'rgba(214,228,246,0.42)';
      ctx.lineWidth = 2.2;
      p(ctx);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(-2, -1.2);
      ctx.strokeStyle = 'rgba(6,4,3,0.25)';
      ctx.lineWidth = 2.2;
      p(ctx);
      ctx.stroke();
      ctx.restore();
    });
  };
  const X = (d: number) => x0 + d;
  const Y = (d: number) => ly - d;
  // the pillow, its tassel
  const pil = rrPath2(X(20), Y(22), 46, 22, 7);
  STEP(pil, { x: X(20), y: Y(22), w: 46, h: 22 }, '#8a8276');
  within(ctx, pil, () => vfill(ctx, X(20), Y(22), 46, 22, [[0, 'rgba(255,240,220,0.08)'], [1, 'rgba(6,4,3,0.4)']]));
  // the body under its robe: shoulders, breast, the legs falling away to the ankles
  const body: PathFn = (c) => {
    c.beginPath();
    c.moveTo(X(60), Y(0));
    c.lineTo(X(60), Y(18));
    c.quadraticCurveTo(X(70), Y(34), X(92), Y(36));
    c.quadraticCurveTo(X(130), Y(42), X(160), Y(34));
    c.quadraticCurveTo(X(200), Y(28), X(232), Y(24));
    c.lineTo(X(250), Y(20));
    c.lineTo(X(252), Y(0));
    c.closePath();
  };
  STEP(body, { x: X(60), y: Y(42), w: 194, h: 42 }, '#7c756a');
  within(ctx, body, () => {
    vfill(ctx, X(60), Y(44), 194, 44, [[0, 'rgba(255,240,220,0.1)'], [0.5, 'rgba(6,4,3,0.1)'], [1, 'rgba(6,4,3,0.5)']]);
    // the robe's folds running down the legs, the girdle
    ctx.strokeStyle = 'rgba(6,4,3,0.4)';
    ctx.lineWidth = 1.6;
    for (const [fx, top, bend] of [[164, 32, 14], [190, 28, 6], [205, 26, 18], [231, 23, 8]] as const) {
      ctx.beginPath();
      ctx.moveTo(X(fx), Y(top));
      ctx.bezierCurveTo(X(fx + bend), Y(top * 0.7), X(fx - 4), Y(top * 0.35), X(fx + bend * 0.6), Y(0));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,240,220,0.14)';
    for (const [fx, top, bend] of [[170, 31, 12], [212, 25, 14]] as const) {
      ctx.beginPath();
      ctx.moveTo(X(fx), Y(top));
      ctx.bezierCurveTo(X(fx + bend), Y(top * 0.7), X(fx - 2), Y(top * 0.35), X(fx + bend * 0.6), Y(0));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(6,4,3,0.5)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(X(150), Y(38));
    ctx.lineTo(X(152), Y(0));
    ctx.stroke();
  });
  // the far foot, then the near one: toes up, the sole to the end of the lid, the toes in a row along the top
  for (const [dx, dy, base] of [[-12, 6, '#7e776c'], [0, 0, MARBLE]] as const) {
    const fx = (d: number) => X(248 + dx + d);
    const fy = (d: number) => Y(dy + d);
    const foot: PathFn = (c) => {
      c.beginPath();
      c.moveTo(fx(-6), fy(0));
      c.lineTo(fx(-4), fy(22));
      // the instep rising to the toes
      c.quadraticCurveTo(fx(2), fy(40), fx(10), fy(56));
      // the toes: a row of bumps over the top, the big toe last and highest
      c.quadraticCurveTo(fx(12), fy(62), fx(16), fy(61));
      c.quadraticCurveTo(fx(18), fy(66), fx(22), fy(65));
      c.quadraticCurveTo(fx(25), fy(70), fx(29), fy(68));
      c.quadraticCurveTo(fx(33), fy(74), fx(38), fy(70));
      // the sole down the far side, the ball, the heel
      c.quadraticCurveTo(fx(42), fy(64), fx(40), fy(52));
      c.quadraticCurveTo(fx(38), fy(36), fx(36), fy(26));
      c.quadraticCurveTo(fx(40), fy(10), fx(32), fy(0));
      c.closePath();
    };
    STEP(foot, { x: fx(-6), y: fy(74), w: 50, h: 74 }, base, 2.2);
    within(ctx, foot, () => {
      // the toes' clefts, the nails, the sole's shade, the candles' warm on the toes
      ctx.strokeStyle = 'rgba(6,4,3,0.45)';
      ctx.lineWidth = 1.4;
      for (const [a, b] of [[16, 61], [22, 65], [29, 68]] as const) {
        ctx.beginPath();
        ctx.moveTo(fx(a), fy(b));
        ctx.lineTo(fx(a - 3), fy(b - 7));
        ctx.stroke();
      }
      const sg = ctx.createLinearGradient(fx(20), 0, fx(42), 0);
      sg.addColorStop(0, 'rgba(6,4,3,0)');
      sg.addColorStop(1, 'rgba(6,4,3,0.4)');
      ctx.fillStyle = sg;
      ctx.fillRect(fx(-6), fy(74), 50, 74);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      lightPool(ctx, fx(30), fy(60), 30, 26, CANDLE, 0.22);
      ctx.restore();
    });
  }
  // the head on the pillow, face up: a round skull, the nose standing up off the face, the beard flowing onto the
  // breast in a wedge of curls
  const beard: PathFn = (c) => {
    c.beginPath();
    c.moveTo(X(70), Y(38));
    c.quadraticCurveTo(X(86), Y(44), X(100), Y(37));
    c.quadraticCurveTo(X(104), Y(33), X(100), Y(29));
    c.quadraticCurveTo(X(86), Y(24), X(72), Y(22));
    c.closePath();
  };
  const skull = ellPath(X(63), Y(31), 16, 15);
  STEP(skull, { x: X(47), y: Y(46), w: 32, h: 30 }, '#b4ac9c');
  // the hollow under the jaw, the ear
  ctx.fillStyle = 'rgba(6,4,3,0.35)';
  ctx.beginPath();
  ctx.ellipse(X(60), Y(27), 4, 5, 0, 0, P2);
  ctx.fill();
  STEP(beard, { x: X(70), y: Y(44), w: 34, h: 22 }, '#a29a8a', 1.4);
  within(ctx, beard, () => {
    ctx.strokeStyle = 'rgba(6,4,3,0.4)';
    ctx.lineWidth = 1.1;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(X(76 + k * 5), Y(40 - k * 1.5));
      ctx.quadraticCurveTo(X(80 + k * 5), Y(34 - k), X(78 + k * 6), Y(27 - k * 0.5));
      ctx.stroke();
    }
  });
  const nose = polyPath([[X(67), Y(44)], [X(71), Y(53)], [X(75), Y(44.5)]]);
  STEP(nose, { x: X(67), y: Y(50), w: 8, h: 8 }, '#b4ac9c', 1.2);
  // the brow's shadow over the closed eye, the lips
  ctx.strokeStyle = 'rgba(6,4,3,0.5)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(X(62), Y(40));
  ctx.quadraticCurveTo(X(64), Y(42.5), X(67), Y(41));
  ctx.stroke();
  // the crown on his head, its points towards the head of the tomb
  ctx.save();
  ctx.translate(X(54), Y(36));
  ctx.rotate(-0.95);
  const crown = polyPath([[-12, 4], [12, 4], [13, -6], [10, -20], [6.5, -9], [0, -24], [-6.5, -9], [-10, -20], [-13, -6]]);
  STEP(crown, { x: -14, y: -24, w: 28, h: 28 }, '#c4a458', 1.8);
  within(ctx, crown, () => {
    ctx.fillStyle = 'rgba(6,4,3,0.3)';
    ctx.fillRect(-14, -2, 28, 6);
  });
  ctx.restore();
  // the hands pressed together on his breast, pointing up
  const hands: PathFn = (c) => {
    c.beginPath();
    // two palms pressed together, the fingertips rounded together at the top
    c.moveTo(X(111), Y(40));
    c.quadraticCurveTo(X(109), Y(52), X(112), Y(59));
    c.quadraticCurveTo(X(118), Y(66), X(124), Y(59));
    c.quadraticCurveTo(X(127), Y(52), X(125), Y(40));
    c.closePath();
  };
  // the forearms in their sleeves, rising to the hands
  const arm: PathFn = (c) => {
    c.beginPath();
    c.moveTo(X(98), Y(34));
    c.quadraticCurveTo(X(104), Y(46), X(113), Y(44));
    c.lineTo(X(126), Y(42));
    c.quadraticCurveTo(X(134), Y(40), X(140), Y(34));
    c.closePath();
  };
  STEP(arm, { x: X(98), y: Y(48), w: 44, h: 16 }, '#8e8679', 1.4);
  STEP(hands, { x: X(110), y: Y(66), w: 18, h: 30 }, '#b4ac9c', 1.6);
  ctx.strokeStyle = 'rgba(6,4,3,0.5)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(X(118), Y(65));
  ctx.lineTo(X(119), Y(42));
  ctx.stroke();
  // the tomb's green on his crown and face (out of the gap below his head), the candles warm along his robe
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  lightPool(ctx, X(50), Y(34), 50, 34, GHOST, 0.22);
  ctx.restore();
  ctx.restore();
}
const LID_BOX = { x: S.x0 + PK.lidShift - 30, y: LID_TOP_B - 140, w: S.x1 - S.x0 + 60, h: S.top - LID_TOP_B + 156 };

/** The iron prickets at the dais's corners and the votive stubs at its foot (candles unlit: their flames are live). */
function candles(ctx: Ctx, r: R): void {
  // the prickets: a tripod on the bottom step, a twisted stem, a drip pan, the candle on its spike
  for (const c of CANDLES.slice(0, 2)) {
    const footY = STEPS[0].y0 + 2;
    const panY = c.base + 4;
    groundShadow(ctx, c.x + 10, footY, 40, 5, 0.6, '#040302');
    const stem: PathFn = (g) => {
      g.beginPath();
      // the tripod's three legs (two in profile, one coming at us)
      g.moveTo(c.x - 34, footY + 1);
      g.quadraticCurveTo(c.x - 16, footY - 6, c.x - 5, footY - 30);
      g.lineTo(c.x - 4, panY + 8);
      g.lineTo(c.x + 4, panY + 8);
      g.lineTo(c.x + 5, footY - 30);
      g.quadraticCurveTo(c.x + 16, footY - 6, c.x + 34, footY + 1);
      g.lineTo(c.x + 28, footY + 3);
      g.quadraticCurveTo(c.x + 12, footY - 8, c.x + 2, footY - 22);
      g.lineTo(c.x + 2, footY + 4);
      g.lineTo(c.x - 2, footY + 4);
      g.lineTo(c.x - 2, footY - 22);
      g.quadraticCurveTo(c.x - 12, footY - 8, c.x - 28, footY + 3);
      g.closePath();
    };
    castShadow(ctx, stem, 12, 10, 0.5, '#040302');
    solid(ctx, stem, { x: c.x - 34, y: panY, w: 68, h: footY - panY + 4 }, 'iron', '#3a3632', { depth: 0.1, line: 1.8, formSize: 3 });
    // the knops on the stem, twists of the forging
    for (const y of [panY + 40, panY + 90, footY - 40]) {
      const kn = ellPath(c.x, y, 7, 5);
      solid(ctx, kn, { x: c.x - 7, y: y - 5, w: 14, h: 10 }, 'iron', '#4a4440', { depth: 0.1, line: 1.4, formSize: 3 });
    }
    ctx.strokeStyle = rgba(CANDLE, 0.35);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(c.x - 2.5, panY + 12);
    ctx.lineTo(c.x - 3, footY - 34);
    ctx.stroke();
    // the drip pan, wax over its edge
    const pan = ellPath(c.x, panY, 24, 6);
    solid(ctx, pan, { x: c.x - 24, y: panY - 6, w: 48, h: 12 }, 'iron', '#3e3a36', { depth: 0.1, line: 1.8, formSize: 4 });
    ctx.fillStyle = 'rgba(236,226,200,0.85)';
    ctx.beginPath();
    ctx.ellipse(c.x + 2, panY - 2, 16, 3.5, 0, 0, P2);
    ctx.fill();
    candleBody(ctx, c.x, c.base, c.h, '#efe6cc', false);
    for (const [dx, len] of [[-14, 16], [12, 26], [18, 10]] as const) waxRun(ctx, c.x + dx, panY + 2, len, 4);
  }
  // the votives: stubs in their own wax, at the dais's foot and on the bottom step
  for (const c of CANDLES.slice(2)) {
    const w = c.h * 0.34 * 1.2;
    groundShadow(ctx, c.x + 6, c.base, w * 1.4, 3.5, 0.55, '#040302');
    ctx.fillStyle = 'rgba(236,226,200,0.85)';
    ctx.beginPath();
    ctx.ellipse(c.x + 3, c.base, w * 1.3, 3.4, 0, 0, P2);
    ctx.fill();
    candleBody(ctx, c.x, c.base, c.h, c.x === 604 ? '#d8cfb6' : '#efe6cc', false);
  }
  void r;
}
const CANDLE_BOX = { x: 560, y: CANDLES[0].base - 64, w: 700, h: TY - CANDLES[0].base + 64 };

// ——— the table: a ledger stone ———

function table(ctx: Ctx, r: R): void {
  const F = PK.front;
  const box = { x: 0, y: TY, w: W, h: F - TY + 4 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, F - TY + 4);
  ctx.clip();
  surface(ctx, r, box, '#383634', { vary: 0.4, cells: 6, mottle: 0.3, strokes: 0.2, strokeAng: 0, strokeLen: 140, grain: 0.18, grainKind: 'speckle', warm: '#7a7262', cool: '#283038', seed: 121 });
  // the slab's veins (a dark marble), dust lying on it, wax drips, a crack across one corner
  ctx.strokeStyle = 'rgba(200,200,190,0.07)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    let x = r() * W;
    let y = TY + r() * (F - TY);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 8; j++) {
      x += 40 + r() * 60;
      y += (r() - 0.5) * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  lay(ctx, noiseMask(14, 123, { cover: 0.45, soft: 0.3, col: '#a8a49a', w: 256, h: 48 }), box, 0.1);
  // the incised border: a cut line round the slab, in perspective
  const zB = (y: number) => 1210 / (y - VPY);
  const xA = (X: number, y: number) => VPX + (1210 * X) / zB(y);
  ctx.strokeStyle = 'rgba(6,4,3,0.5)';
  ctx.lineWidth = 2.4;
  const yb = TY + 22;
  const yf = F - 26;
  for (const X of [-1.7, 1.7]) {
    ctx.beginPath();
    ctx.moveTo(xA(X, yb) * 1, yb);
    ctx.lineTo(xA(X, yf), yf);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(xA(-1.7, yb), yb);
  ctx.lineTo(xA(1.7, yb), yb);
  ctx.moveTo(xA(-1.7, yf), yf);
  ctx.lineTo(xA(1.7, yf), yf);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,214,200,0.1)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(xA(-1.7, yb) + 2, yb + 2);
  ctx.lineTo(xA(1.7, yb) - 2, yb + 2);
  ctx.stroke();
  carve(ctx, 'H I C  ·  I A C E T  ·  R E X  ·  P E D V M', 960, TY + 12, 13, 0.4);
  crack(ctx, r, 1770, TY + 6, 1.9, 120, { col: '#0a0806', lip: '#a8a090', w: 1.6, a: 0.45 });
  for (const [x, y, s] of [[200, 800, 1], [232, 788, 0.7], [1740, 812, 0.9], [1712, 796, 0.6]] as const) {
    ctx.fillStyle = 'rgba(236,226,200,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y, 9 * s, 3.4 * s, 0, 0, P2);
    ctx.fill();
  }
  // the light: the candles warm and the tomb green on its far middle, the moon on its left, nearer is darker
  lightPool(ctx, 960, 790, 560, 80, GHOST, 0.12);
  lightPool(ctx, 960, 784, 420, 50, CANDLE, 0.16);
  lightPool(ctx, 1206, 790, 160, 30, GHOST, 0.12);
  lightPool(ctx, 724, 790, 160, 30, CANDLE, 0.14);
  lightPool(ctx, 520, 800, 360, 70, MOON, 0.06);
  // the slab is polished where it was laid: the candles and the tomb's light reflected in it, smeared along its grain
  for (const [x, col, a2] of [[772, CANDLE, 0.16], [1150, CANDLE, 0.14], [S.x0 + 26, GHOST, 0.16], [712, CANDLE, 0.1], [1220, GHOST, 0.1]] as const) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createLinearGradient(0, TY, 0, TY + 70);
    rg.addColorStop(0, rgba(col, a2));
    rg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(x, TY + 10, 9, 60, 0, 0, P2);
    ctx.fill();
    ctx.restore();
  }
  vfill(ctx, 0, TY, W, F - TY, [[0, 'rgba(6,4,3,0.1)'], [0.5, 'rgba(6,4,3,0.3)'], [1, 'rgba(6,4,3,0.6)']]);
  ctx.restore();
  // the slab's back edge: a little proud of the floor, its arris lit
  crevice(ctx, 0, W, TY, 28, 0.55, '#040302');
  ctx.fillStyle = rgba('#c8d8e8', 0.14);
  ctx.fillRect(0, TY, W, 1.6);
  tableProps(ctx);
  // the front edge: the slab's thickness, the inscription cut in it
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, F, W, 1080 - F);
  ctx.clip();
  surface(ctx, r, { x: 0, y: F, w: W, h: 1080 - F }, '#3e3c3a', { vary: 0.4, cells: 5, mottle: 0.4, strokes: 0, grain: 0.3, grainKind: 'speckle', seed: 127 });
  vfill(ctx, 0, F, W, 1080 - F, [[0, 'rgba(6,4,3,0.35)'], [1, 'rgba(6,4,3,0.55)']]);
  ctx.restore();
  ctx.fillStyle = rgba('#d8e0e8', 0.22);
  ctx.fillRect(0, F - 3, W, 3);
  ctx.fillStyle = 'rgba(6,4,3,0.85)';
  ctx.fillRect(0, F, W, 2);
}

/** An hourglass (the sand nearly run through) on the left; on the right the king's own crown, tarnished, fallen on
 * its side by a scatter of old coins. */
function tableProps(ctx: Ctx): void {
  // ——— the hourglass
  const hx = 126;
  const hb = 1000;
  const hh = 150;
  groundShadow(ctx, hx + 26, hb, 90, 14, 0.55, '#0a0604');
  const glass: PathFn = (c) => {
    c.beginPath();
    c.moveTo(hx - 34, hb - 14);
    c.bezierCurveTo(hx - 36, hb - 60, hx - 4, hb - 66, hx - 4, hh * -0.5 + hb - 6);
    c.bezierCurveTo(hx - 4, hb - 86, hx - 36, hb - 90, hx - 34, hb - hh + 14);
    c.lineTo(hx + 34, hb - hh + 14);
    c.bezierCurveTo(hx + 36, hb - 90, hx + 4, hb - 86, hx + 4, hh * -0.5 + hb - 6);
    c.bezierCurveTo(hx + 4, hb - 66, hx + 36, hb - 60, hx + 34, hb - 14);
    c.closePath();
  };
  within(ctx, glass, () => {
    ctx.fillStyle = 'rgba(30,40,44,0.55)';
    ctx.fillRect(hx - 40, hb - hh, 80, hh);
    // the sand: a heap below, a thin cone left above, the stream between
    ctx.fillStyle = '#b08a52';
    ctx.beginPath();
    ctx.moveTo(hx - 34, hb - 14);
    ctx.quadraticCurveTo(hx, hb - 58, hx + 34, hb - 14);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 14, hb - 92);
    ctx.lineTo(hx + 14, hb - 92);
    ctx.lineTo(hx, hb - 80);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(hx - 0.8, hb - 82, 1.6, 44);
    const sg = ctx.createLinearGradient(hx - 34, 0, hx + 34, 0);
    sg.addColorStop(0, 'rgba(255,240,210,0.25)');
    sg.addColorStop(0.5, 'rgba(6,4,3,0)');
    sg.addColorStop(1, 'rgba(6,4,3,0.45)');
    ctx.fillStyle = sg;
    ctx.fillRect(hx - 40, hb - hh, 80, hh);
  });
  ctx.strokeStyle = 'rgba(200,220,226,0.5)';
  ctx.lineWidth = 1.6;
  glass(ctx);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(hx - 26, hb - 120);
  ctx.quadraticCurveTo(hx - 28, hb - 100, hx - 14, hb - 88);
  ctx.stroke();
  // the frame: two wooden discs and three turned posts
  for (const y of [hb - hh, hb - 14]) {
    const d = rrPath2(hx - 46, y, 92, 14, 4);
    solid(ctx, d, { x: hx - 46, y, w: 92, h: 14 }, 'wood', '#4a2a16', { depth: 0.02, line: 2, formSize: 4 });
  }
  for (const px of [hx - 40, hx + 40]) {
    const p = rrPath2(px - 4, hb - hh + 12, 8, hh - 26, 3);
    solid(ctx, p, { x: px - 4, y: hb - hh + 12, w: 8, h: hh - 26 }, 'wood', '#5a3420', { depth: 0.02, line: 1.6, formSize: 3 });
  }
  // ——— the crown, set down on the slab, a little tilted: a band of tarnished gold, five points with pearls on
  // them, dull stones; the rotted velvet of its cap showing between the points
  const cx = 1726;
  const cb = 1004;
  groundShadow(ctx, cx + 18, cb - 4, 84, 15, 0.6, '#0a0604');
  for (const [x, y] of [[1630, 1012], [1648, 998], [1812, 1014], [1800, 994], [1832, 1004]] as const) {
    const coin = ellPath(x, y, 11, 4.5);
    castShadow(ctx, coin, 3, 3, 0.5, '#0a0604');
    solid(ctx, coin, { x: x - 11, y: y - 5, w: 22, h: 10 }, 'chrome', '#9a7a3a', { depth: 0.02, line: 1.4, formSize: 3 });
    ctx.strokeStyle = 'rgba(60,40,10,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 2.6, 0, 0, P2);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(cx, cb);
  ctx.rotate(-0.07);
  const RX = 60;
  const RY = 13;
  const BH = 34;
  // the far half of the band (its inside, dark) and the velvet cap
  const back: PathFn = (c) => {
    c.beginPath();
    c.ellipse(0, -BH, RX, RY, 0, Math.PI, P2);
    c.lineTo(RX, -10);
    c.ellipse(0, -10, RX, RY, 0, 0, Math.PI, true);
    c.closePath();
  };
  solid(ctx, back, { x: -RX, y: -BH - RY, w: RX * 2, h: BH + RY }, 'chrome', '#5a4420', { depth: 0.02, line: 2, formSize: 10 });
  const cap: PathFn = (c) => {
    c.beginPath();
    c.ellipse(0, -BH, RX - 6, RY - 3, 0, 0, Math.PI, true);
    c.quadraticCurveTo(-RX + 10, -BH - 46, 0, -BH - 52);
    c.quadraticCurveTo(RX - 10, -BH - 46, RX - 6, -BH);
    c.closePath();
  };
  solid(ctx, cap, { x: -RX, y: -BH - 52, w: RX * 2, h: 52 }, 'plush', '#4a1830', { depth: 0.02, line: 1.8, formSize: 14 });
  within(ctx, cap, () => lay(ctx, noiseMask(6, 137, { cover: 0.5, soft: 0.3, col: '#120408', w: 32, h: 16 }), { x: -RX, y: -BH - 52, w: RX * 2, h: 52 }, 0.55));
  // the front: the band and its points
  const front: PathFn = (c) => {
    c.beginPath();
    c.ellipse(0, -10, RX, RY, 0, Math.PI, 0, true);
    c.lineTo(RX, -BH);
    const pts: [number, number, number][] = [[60, -BH, 0], [48, -BH - 36, 1], [32, -BH - 4, 0], [16, -BH - 44, 1], [0, -BH - 2, 0], [-16, -BH - 44, 1], [-32, -BH - 4, 0], [-48, -BH - 36, 1], [-60, -BH, 0]];
    for (const [x, y] of pts) c.lineTo(x, y + (Math.abs(x) < 50 ? RY * 0.9 * Math.sqrt(1 - (x / RX) ** 2) : 0));
    c.closePath();
  };
  castShadow(ctx, front, 8, 8, 0.55, '#0a0604');
  solid(ctx, front, { x: -RX, y: -BH - 50, w: RX * 2, h: BH + 50 }, 'chrome', '#b08a3c', { depth: 0.02, line: 2.4, formSize: 22 });
  within(ctx, front, () => {
    lay(ctx, noiseMask(8, 131, { cover: 0.45, soft: 0.25, col: '#2a2410', w: 48, h: 32 }), { x: -RX, y: -BH - 50, w: RX * 2, h: BH + 50 }, 0.5);
    lay(ctx, noiseMask(10, 133, { cover: 0.25, soft: 0.2, col: '#4a7a60', w: 48, h: 32 }), { x: -RX, y: -BH - 50, w: RX * 2, h: BH + 50 }, 0.3);
    // the band's rims, engraved
    for (const y of [-12, -BH + 8]) {
      ctx.strokeStyle = 'rgba(40,24,6,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, y, RX, RY, 0, 0.12, Math.PI - 0.12);
      ctx.stroke();
    }
    // its stones, set round the band
    for (const [x, col] of [[-38, '#5a1418'], [-12, '#18304a'], [14, '#1a4a2a'], [40, '#5a1418']] as const) {
      const y = -22 + RY * 0.9 * Math.sqrt(1 - (x / RX) ** 2);
      ctx.fillStyle = '#2a1a08';
      ctx.beginPath();
      ctx.ellipse(x, y, 7.5, 6, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x, y, 5.6, 4.4, 0, 0, P2);
      ctx.fill();
      specHi(ctx, x - 1.6, y - 1.6, 2.2, 1.3, 0.7, 0);
    }
    // the light: the candles' warm on its upper left, dark low and right
    const lg = ctx.createLinearGradient(-RX, -BH - 40, RX, 10);
    lg.addColorStop(0, 'rgba(255,214,150,0.18)');
    lg.addColorStop(0.5, 'rgba(6,4,3,0)');
    lg.addColorStop(1, 'rgba(6,4,3,0.5)');
    ctx.fillStyle = lg;
    ctx.fillRect(-RX, -BH - 50, RX * 2, BH + 60);
  });
  // pearls on the points
  for (const [x, y] of [[48, -BH - 36], [16, -BH - 44], [-16, -BH - 44], [-48, -BH - 36]] as const) {
    const yy = y + (Math.abs(x) < 50 ? RY * 0.9 * Math.sqrt(1 - (x / RX) ** 2) : 0) - 4;
    const pe = ellPath(x, yy, 5, 5);
    solid(ctx, pe, { x: x - 5, y: yy - 5, w: 10, h: 10 }, 'enamel', '#d8d0c0', { depth: 0.02, line: 1.4, formSize: 3 });
  }
  ctx.restore();
}

// ——— light layers (added) ———

/** Light that adds, in the base: moonlight down through the grating, the candles' pools on the columns and walls,
 * the tomb's green up the apse and the arches. */
function pools(ctx: Ctx, r: R): void {
  const g = PK.grate;
  shaft(ctx, r, [g.x - 30, g.y + 10, g.x + 30, g.y + 10], [g.x + 70, BACK_FLOOR + 10, g.x + 250, BACK_FLOOR + 30], MOON, 0.1, { streaks: 6, motes: 0 });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the moon's patch on the floor and the tunnel's steps
  lightPool(ctx, g.x + 160, BACK_FLOOR + 24, 140, 22, MOON, 0.26);
  // candles
  for (const c of CANDLES) {
    const big = c.k;
    lightPool(ctx, c.x, flameY(c) + 10, 320 * big, 280 * big, c.cold ? GHOST : CANDLE, 0.15);
    lightPool(ctx, c.x, flameY(c) + 10, 110 * big, 100 * big, c.cold ? '#b0ffe0' : '#ffc888', 0.14);
  }
  // the tomb: up the apse and the pall, round the middle arch, on the floor
  lightPool(ctx, 870, 560, 260, 300, GHOST, 0.13);
  lightPool(ctx, 960, 470, 200, 140, GHOST, 0.08);
  lightPool(ctx, 960, 690, 460, 90, GHOST, 0.1);
  // the warm round the dais on the floor, the columns' bases
  lightPool(ctx, 960, 730, 520, 60, CANDLE, 0.1);
  // the loculi that are open glow a little
  const L = PK.loculi;
  for (const [i, b] of BROKEN.entries()) {
    if (!b) continue;
    const x = L.x0 + (i % L.cols) * L.cw + L.cw / 2;
    const y = L.y0 + Math.floor(i / L.cols) * L.rh + L.rh / 2 - 6;
    lightPool(ctx, x, y, 90, 70, GHOST, 0.07);
  }
  ctx.restore();
}

/** The tomb's breath (live only, added): the green swelling out of the gap, up through the middle bay. */
function tombLight(ctx: Ctx): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  lightPool(ctx, S.x0 + 30, S.top - 10, 120, 60, GHOST, 0.4);
  lightPool(ctx, S.x0 + 30, S.top - 4, 40, 14, '#d8fff0', 0.4);
  lightPool(ctx, 880, 470, 200, 260, GHOST, 0.12);
  lightPool(ctx, 960, 300, 260, 220, GHOST, 0.06);
  lightPool(ctx, 960, 740, 380, 60, GHOST, 0.14);
  ctx.restore();
}
const TOMB_LIGHT_BOX = { x: 560, y: 60, w: 800, h: TY + 60 - 60 };

function flamesStill(ctx: Ctx): void {
  for (const [i, c] of CANDLES.entries()) {
    const w = FLAME.w * c.k;
    const h = FLAME.h * c.k;
    ctx.save();
    ctx.translate(c.x - w / 2, flameY(c) + 4 * c.k - h);
    flameFrame(ctx, w, h, (0.3 + i * 0.23) % 1, c.cold ? COLD : WARM, 3, i + 1);
    ctx.restore();
    lightPool(ctx, c.x, flameY(c) - 16 * c.k, 46 * c.k, 54 * c.k, c.cold ? '#80ffd8' : '#ffcc80', 0.3 * c.k * c.k);
  }
  // the ectoplasm brimming at the gap
  ctx.save();
  ctx.translate(POUR_BOX.x, POUR_BOX.y);
  pourFrame(ctx, 0.2);
  ctx.restore();
}

/** The mist lying on the floor (the live layer rolls it): the cellar's billows, painted in place. */
const MISTS = [
  { x: 960, y: TY + 34, w: 2300, h: 220, a: 0.4, flip: false, ph: 0.2 },
  { x: 1100, y: TY + 24, w: 2400, h: 165, a: 0.28, flip: true, ph: 0.6 },
  { x: 860, y: TY + 10, w: 520, h: 132, a: 0.6, flip: false, ph: 0.35 },
];
function mistStill(ctx: Ctx): void {
  for (const m of MISTS) {
    ctx.save();
    ctx.globalAlpha = m.a;
    ctx.translate(m.x, m.y - m.h);
    ctx.scale(((m.flip ? -1 : 1) * m.w) / MW, m.h / MH);
    ctx.translate(-MW / 2, 0);
    mistFrame(ctx, m.ph, 3);
    ctx.restore();
  }
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.1, '#80a8b0', 0.06, { warm: '#ffb060', cool: '#2a4a6a', a: 0.32 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.16, '#050403', 70, 620);
  vignetteAll(ctx, 0.9, '#040302', 0.4);
  vfill(ctx, 0, 0, W, 220, [[0, 'rgba(3,2,1,0.55)'], [1, 'rgba(3,2,1,0)']]);
}

// ——— the ectoplasm pour (frames) ———

/** One frame of the ectoplasm (phase 0…1 loops). It wells up out of the gap and sags over the box's rim in a fat
 * lip, then clings to the stone as a glowing sheet down the box's front corner and over the dais's steps: thick
 * gobs swell in it and slide down (the sheet bulging as they pass), it pools on each tread and gathers on each step's
 * edge into a drop that swells, necks, lets go, falls the riser and splashes on the tread below (a crown of droplets
 * and a ring). Glowing from within: a pale core, green body, a bright rim where it's thin. */
const POUR_BOX = { x: S.x0 - 74, y: S.top - 30, w: 176, h: TY - S.top + 44 };
const POUR_K = 0.6;
const POUR_N = 16;
function pourFrame(c: Ctx, ph: number): void {
  const { w, h } = POUR_BOX;
  const [cv, g] = makeCanvas(Math.ceil(w * POUR_K), Math.ceil(h * POUR_K));
  g.scale(POUR_K, POUR_K);
  g.translate(-POUR_BOX.x, -POUR_BOX.y);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const BODY = (a: number) => `rgba(96,236,196,${a.toFixed(3)})`;
  const CORE = (a: number) => `rgba(226,255,246,${a.toFixed(3)})`;
  // the run it clings to: over the rim, down the corner, along each tread to its edge and down each riser
  const T = [STEPS[2], STEPS[1], STEPS[0]];
  const path: [number, number][] = [
    [S.x0 + 26, S.top - 3],
    [S.x0 + 18, S.top + 6],
    [S.x0 + 15, S.top + 44],
    [S.x0 + 12, S.bot - 4],
    [T[0].x0 + 8, T[0].y0 + 2],
    [T[0].x0 + 1, T[1].y0 - 2],
    [T[1].x0 + 8, T[1].y0 + 2],
    [T[1].x0 + 1, T[2].y0 - 2],
    [T[2].x0 + 6, T[2].y0 + 2],
    [T[2].x0 - 2, TY],
  ];
  const lens: number[] = [0];
  for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const L = lens[lens.length - 1];
  const pt = (u: number): [number, number] => {
    const d = Math.max(0, Math.min(1, u)) * L;
    let i = 1;
    while (i < lens.length - 1 && lens[i] < d) i++;
    const t = (d - lens[i - 1]) / (lens[i] - lens[i - 1]);
    return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t];
  };
  // gobs travelling down the run: where one is, the sheet bulges
  const gobs = [0, 0.27, 0.55, 0.78].map((o, i) => ({ u: (o + ph) % 1, s: 1 + 0.3 * Math.sin(i * 2.3) }));
  const width = (u: number) => {
    let wd = 6 - u * 2.5;
    for (const gb of gobs) wd += 3.5 * gb.s * Math.exp(-((((u - gb.u) * L) / 12) ** 2)) * (1 - smooth(0.85, 1, gb.u));
    return wd;
  };
  // the sheet: a ribbon clinging to the stone, wide down the faces and thin where it runs flat along a tread
  const N = 90;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const [x, y] = pt(u);
    const [x2, y2] = pt(u + 0.01);
    const tl = Math.hypot(x2 - x, y2 - y) || 1;
    const tx = (x2 - x) / tl;
    const ty = (y2 - y) / tl;
    const wd = width(u) * (0.45 + 0.55 * Math.abs(ty));
    left.push([x - ty * wd, y + tx * wd]);
    right.push([x + ty * wd, y - tx * wd]);
  }
  const ribbon = (k: number) => {
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const [lx, ly] = left[i];
      const [rx, ry] = right[i];
      const [cx, cy] = [(lx + rx) / 2, (ly + ry) / 2];
      const p: [number, number] = [cx + (lx - cx) * k, cy + (ly - cy) * k];
      if (i) g.lineTo(p[0], p[1]);
      else g.moveTo(p[0], p[1]);
    }
    for (let i = N; i >= 0; i--) {
      const [lx, ly] = left[i];
      const [rx, ry] = right[i];
      const [cx, cy] = [(lx + rx) / 2, (ly + ry) / 2];
      g.lineTo(cx + (rx - cx) * k, cy + (ry - cy) * k);
    }
    g.closePath();
  };
  g.filter = 'blur(3px)';
  g.fillStyle = BODY(0.16);
  ribbon(2);
  g.fill();
  g.filter = 'blur(0.6px)';
  g.fillStyle = BODY(0.5);
  ribbon(1);
  g.fill();
  g.fillStyle = CORE(0.42);
  ribbon(0.35);
  g.fill();
  // its thin edge catching the light, brightest down its left
  g.strokeStyle = CORE(0.5);
  g.lineWidth = 1;
  g.beginPath();
  left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.filter = 'none';
  // the lip: a fat roll of it sagging over the rim, swelling and slumping
  const sw = 1 + 0.25 * Math.sin(ph * P2);
  const lip = (a: number, k: number, col: (a: number) => string) => {
    g.fillStyle = col(a);
    g.beginPath();
    g.ellipse(S.x0 + 24, S.top + 2 + sw * 2, 16 * k * sw, 5 * k * sw, 0.1, 0, P2);
    g.fill();
  };
  lip(0.14, 1.6, BODY);
  lip(0.5, 1, BODY);
  lip(0.35, 0.5, CORE);
  // the pools on the treads, rippling, a bright meniscus round each
  for (const [i, [x, y]] of [[T[0].x0 + 8, T[0].y0 + 2], [T[1].x0 + 8, T[1].y0 + 2], [T[2].x0 + 6, T[2].y0 + 2], [T[2].x0 - 8, TY - 1]].entries()) {
    const rx = 15 + i * 4 + 2 * Math.sin(ph * P2 * 2 + i);
    g.fillStyle = BODY(0.45);
    g.beginPath();
    g.ellipse(x - 2, y, rx, 3.2, 0, 0, P2);
    g.fill();
    g.strokeStyle = CORE(0.6);
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(x - 2, y - 0.5, rx, 3, 0, Math.PI, P2);
    g.stroke();
  }
  // drops off each step's edge: swell, neck, let go, fall the riser, splash; each step on its own beat
  const edges: [number, number, number][] = [
    [T[0].x0 + 1, T[0].y0 + 1, T[1].y0],
    [T[1].x0 + 1, T[1].y0 + 1, T[2].y0],
    [T[2].x0 + 1, T[2].y0 + 1, TY],
  ];
  for (const [i, [ex, ey, land]] of edges.entries()) {
    const t = (ph * (i === 3 ? 1 : 2) + i * 0.31) % 1;
    const fallH = land - ey;
    if (t < 0.55) {
      // hanging and swelling, the neck stretching
      const k = t / 0.55;
      const rad = 2.4 + k * 3.4;
      const hang = 1 + k * k * 6;
      g.fillStyle = BODY(0.75);
      g.beginPath();
      g.moveTo(ex - 2, ey);
      g.quadraticCurveTo(ex - rad * 0.4, ey + hang * 0.6, ex - rad, ey + hang);
      g.arc(ex, ey + hang, rad, Math.PI, 0, true);
      g.quadraticCurveTo(ex + rad * 0.4, ey + hang * 0.6, ex + 2, ey);
      g.closePath();
      g.fill();
      g.fillStyle = CORE(0.7);
      g.beginPath();
      g.arc(ex - rad * 0.3, ey + hang - rad * 0.3, rad * 0.4, 0, P2);
      g.fill();
    } else if (t < 0.78) {
      // falling: a teardrop stretched by its speed, a thread of it snapping back to the edge
      const k = (t - 0.55) / 0.23;
      const y = ey + 7 + (fallH - 7) * k * k;
      const st = 2 + k * 5;
      g.fillStyle = BODY(0.8);
      g.beginPath();
      g.ellipse(ex, y, 4, 4 + st * 0.6, 0, 0, P2);
      g.fill();
      g.fillStyle = CORE(0.75);
      g.beginPath();
      g.arc(ex - 0.8, y - 0.8, 1.3, 0, P2);
      g.fill();
      if (k < 0.4) {
        g.strokeStyle = BODY(0.5 * (1 - k / 0.4));
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(ex, ey);
        g.lineTo(ex, y - 3);
        g.stroke();
      }
    } else {
      // the splash: a ring spreading on the tread, a crown of droplets thrown up and falling back
      const k = (t - 0.78) / 0.22;
      g.strokeStyle = CORE(0.7 * (1 - k));
      g.lineWidth = 1.4;
      g.beginPath();
      g.ellipse(ex, land, 3 + k * 12, 1 + k * 2.6, 0, 0, P2);
      g.stroke();
      for (let d = 0; d < 5; d++) {
        const a = Math.PI + (d / 4) * Math.PI;
        const r0 = 3 + k * 12;
        const dx = Math.cos(a) * r0;
        const dy = -Math.sin(k * Math.PI) * (5 + (d % 2) * 3) + 0;
        g.fillStyle = CORE(0.8 * (1 - k));
        g.beginPath();
        g.arc(ex + dx, land + dy, 1.4 * (1 - k * 0.5), 0, P2);
        g.fill();
      }
    }
  }
  // rivulets off the lip: a bead of it swelling as it slides down the box's face, a wet trail behind it, falling
  // off the plinth onto the tread and splashing
  for (const [k, rx, off] of [[0, S.x0 + 34, 0.1], [1, S.x0 + 48, 0.6]] as const) {
    const t = (ph + off) % 1;
    const y0 = S.top + 6;
    const y1 = S.bot - 2;
    if (t < 0.8) {
      const q = t / 0.8;
      const y = y0 + (y1 - y0) * q * q;
      const rad = 2.4 + q * 2.6 + k * 0.6;
      const tg = g.createLinearGradient(0, y0, 0, y);
      tg.addColorStop(0, BODY(0.45));
      tg.addColorStop(1, BODY(0.2));
      g.strokeStyle = tg;
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(rx - 2, y0);
      g.quadraticCurveTo(rx + 2, (y0 + y) / 2, rx, y);
      g.stroke();
      g.fillStyle = BODY(0.8);
      g.beginPath();
      g.ellipse(rx, y, rad * 0.85, rad * 1.15, 0, 0, P2);
      g.fill();
      g.fillStyle = CORE(0.8);
      g.beginPath();
      g.arc(rx - rad * 0.3, y - rad * 0.35, rad * 0.4, 0, P2);
      g.fill();
    } else {
      const q = (t - 0.8) / 0.2;
      g.strokeStyle = CORE(0.75 * (1 - q));
      g.lineWidth = 1.4;
      g.beginPath();
      g.ellipse(rx, S.bot + 2, 3 + q * 14, 1 + q * 3, 0, 0, P2);
      g.stroke();
      for (let d = 0; d < 6; d++) {
        const a = Math.PI + (d / 5) * Math.PI;
        g.fillStyle = CORE(0.85 * (1 - q));
        g.beginPath();
        g.arc(rx + Math.cos(a) * (3 + q * 14), S.bot + 2 - Math.sin(q * Math.PI) * (6 + (d % 2) * 4), 1.6 * (1 - q * 0.5), 0, P2);
        g.fill();
      }
    }
  }
  // the wet sheen it leaves on the box's face beside the run
  g.strokeStyle = BODY(0.16);
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(S.x0 + 14, S.top + 6);
  g.quadraticCurveTo(S.x0 + 16, S.top + 50, S.x0 + 12, S.top + 34 + 40 * ((ph * 1.3) % 1));
  g.stroke();
  c.imageSmoothingEnabled = true;
  c.drawImage(cv, 0, 0, w, h);
}

// ——— the scene ———

const APSE_SLOT = { x: 760, y: 200, w: 400, h: S.top - 200 + 2 };

export const PHANTOM: SceneSpec = {
  id: 'phantomking',
  info: {
    name: 'The Crypt',
    subtitle: 'Boss: GHOST OF FEET PAST',
    ambient: [],
    glows: CANDLES.map((c) => ({ x: c.x, y: flameY(c) - 14, r: 120 * c.k, color: c.cold ? '#60f0c0' : '#ffb050', flicker: 0.6 })),
    light: '#b8c8c0',
    tableTint: '#e4ece8',
  },
  layers: [
    { id: 'vaults', box: VAULT_BOX, draw: vaults },
    { id: 'backWall', box: { x: 0, y: 60, w: W, h: BACK_FLOOR - 60 }, draw: backWall },
    { id: 'floor', box: { x: 0, y: BACK_FLOOR - 20, w: W, h: TY - BACK_FLOOR + 22 }, draw: floor },
    { id: 'apse', box: { x: PK.apse.x - PK.apse.r - 40, y: PK.apse.spring - PK.apse.r - 40, w: PK.apse.r * 2 + 80, h: BACK_FLOOR - PK.apse.spring + PK.apse.r + 40 }, draw: apse },
    { id: 'tunnel', box: { x: PK.tunnel.x - PK.tunnel.r - 50, y: PK.tunnel.spring - PK.tunnel.r - 30, w: PK.tunnel.r * 2 + 100, h: BACK_FLOOR - PK.tunnel.spring + PK.tunnel.r + 34 }, draw: tunnel },
    { id: 'loculi', box: { x: PK.loculi.x0 - 30, y: PK.loculi.y0 - 30, w: PK.loculi.cw * 3 + 60, h: PK.loculi.rh * 3 + 40 }, draw: loculi },
    { id: 'arcade', draw: arcade },
    { id: 'pools', draw: pools },
    { id: 'pallStill', box: PALL_BOX, stillOnly: true, draw: pallStill },
    { id: 'sarcInner', box: INNER_BOX, draw: sarcInner },
    { id: 'apseLive', box: APSE_SLOT, motion: 'slot', draw: () => {} },
    { id: 'dais', box: DAIS_BOX, draw: dais },
    { id: 'lid', box: LID_BOX, motion: 'sprite', draw: lid },
    { id: 'candles', box: CANDLE_BOX, draw: candles },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'flamesStill', box: { x: 560, y: 380, w: 700, h: 400 }, stillOnly: true, draw: flamesStill },
    { id: 'mistStill', box: { x: 0, y: TY - 230, w: W, h: 270 }, stillOnly: true, draw: mistStill },
    { id: 'tombLight', box: TOMB_LIGHT_BOX, liveOnly: true, res: 0.33, draw: tombLight },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

/** A loop's current frame position (to play a second copy in step). */
const pourPh = (l: Loop): number => (l as unknown as { ph: number }).ph;

// ——— live ———

type Img = Phaser.GameObjects.Image;

interface Ghost {
  a: Img;
  b: Img;
  s: Img;
  glow: Img;
  on: boolean;
  t: number;
  dur: number;
  pts: [number, number, number][];
  /** Until this point of its path it's behind the sarcophagus's front (rising out of the box). */
  deepU: number;
  ph: number;
  fps: number;
  shriek: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  seed: number;
  x: number;
  y: number;
  sc: number;
  alpha: number;
}

registerKitScene(PHANTOM, (k) => {
  const fx = k.slot('fx');
  const apseLive = k.slot('apseLive');
  const B = Phaser.BlendModes;

  // ——— the tomb's light, breathing
  const tombL = k.sprite('tombLight').setBlendMode(B.ADD);

  // ——— the pall in the apse: its ripple frames, played slow; a stomp's gust plays them faster
  const pallKey = sheet(k, 'pk_pall', PALL.w * PALL_K, PALL.h * PALL_K, PALL_N, (c, ph) => {
    c.scale(PALL_K, PALL_K);
    pallFrame(c, ph);
  });
  const pall = new Loop(k, pallKey, PALL_N, PALL_BOX.x, PALL_BOX.y, { into: apseLive, origin: [0, 0], scale: 1 / PALL_K, fps: 1.6 });
  let pallGust = 0;

  // ——— the ghosts (the cellar's frames): those rising out of the box are behind its front until they're clear
  const ghostKey = sheet(k, 'cl_ghost', GW * GK, GH * GK, GHOST_N + SHRIEK_N, (c, _p, i) => {
    c.scale(GK, GK);
    if (i < GHOST_N) ghostFrame(c, i / GHOST_N, 0);
    else ghostFrame(c, 0.25, (i - GHOST_N + 1) / SHRIEK_N);
  });
  const deepGhosts = k.sc.add.container(0, 0);
  apseLive.add(deepGhosts);
  const ghosts: Ghost[] = [0, 1, 2].map((i) => {
    const mk = () => k.img(ghostKey, 0, 0, { into: fx, origin: [0.5, 0.24] }).setVisible(false);
    const glow = k.glow(0, 0, 140, 0x7af0d0, 0, { into: fx });
    return { a: mk(), b: mk(), s: mk(), glow, on: false, t: 0, dur: 1, pts: [], deepU: -1, ph: crand() * GHOST_N, fps: 6 + crand() * 2, shriek: 0, ox: 0, oy: 0, vx: 0, vy: 0, seed: i * 2.1 + crand(), x: 0, y: 0, sc: 1, alpha: 0 };
  });
  const setParent = (g: Ghost, into: Phaser.GameObjects.Container) => {
    if (g.a.parentContainer === into) return;
    for (const im of [g.glow, g.a, g.b, g.s]) into.add(im);
  };
  const L = PK.loculi;
  const launch = (g: Ghost, u0 = 0) => {
    const side = crand() < 0.5 ? -1 : 1;
    const roll = crand();
    if (roll < 0.5) {
      // out of the tomb: up out of the gap, swelling as it rises, then away over one of the arches
      const gx = S.x0 + 26;
      g.pts = [
        [gx, S.top + 60, 0.5],
        [gx - 10, 380, 0.75],
        [gx + side * (160 + crand() * 120), 140 + crand() * 60, 0.95],
        [960 + side * (760 + crand() * 200), 40 + crand() * 80, 1.05],
      ];
      g.deepU = 0.22;
      g.dur = 11 + crand() * 4;
    } else if (roll < 0.8) {
      // out of a broken locus: drifting across the vaults to the far side
      const i = crand() < 0.5 ? 1 : 6;
      const lx = L.x0 + (i % L.cols) * L.cw + L.cw / 2;
      const ly = L.y0 + Math.floor(i / L.cols) * L.rh + L.rh / 2;
      g.pts = [
        [lx, ly, 0.42],
        [lx - 120, ly - 160, 0.66],
        [700 - crand() * 200, 90 + crand() * 60, 0.86],
        [-160, 140 + crand() * 100, 0.95],
      ];
      g.deepU = -1;
      g.dur = 13 + crand() * 4;
    } else {
      g.pts = [
        [960 - side * 1180, 100 + crand() * 50, 0.8],
        [960 - side * 420, 50 + crand() * 50, 0.92],
        [960 + side * 420, 60 + crand() * 50, 0.92],
        [960 + side * 1180, 110 + crand() * 50, 0.8],
      ];
      g.deepU = -1;
      g.dur = 12 + crand() * 4;
    }
    g.on = true;
    g.t = u0 * g.dur;
    g.shriek = 0;
    g.ox = g.oy = g.vx = g.vy = 0;
    for (const im of [g.a, g.b, g.s]) im.setVisible(true).setFlipX(crand() < 0.5);
    g.glow.setVisible(true);
  };
  const bez = (p: [number, number, number][], u: number, j: number) => {
    const v = 1 - u;
    return v * v * v * p[0][j] + 3 * v * v * u * p[1][j] + 3 * v * u * u * p[2][j] + u * u * u * p[3][j];
  };
  let spawnIn = 3 + crand() * 3;
  launch(ghosts[0], 0.38);

  // ——— the lid: on a stiff spring, it lifts and drops back on a stomp
  const LID_HINGE = { x: S.x1 + PK.lidShift + 4, y: S.top };
  const lidImg = k.pivot(k.sprite('lid'), LID_HINGE.x, LID_HINGE.y);
  const lidY = new Spring(0, 260, 9);
  const lidR = new Spring(0, 200, 8);
  let lidBumpT = 99;

  // ——— the ectoplasm pour, and its surge after a jolt
  const pourKey = sheet(k, 'pk_pour', POUR_BOX.w * POUR_K, POUR_BOX.h * POUR_K, POUR_N, (c, ph) => {
    c.scale(POUR_K, POUR_K);
    pourFrame(c, ph);
  });
  const pour = new Loop(k, pourKey, POUR_N, POUR_BOX.x, POUR_BOX.y, { into: fx, origin: [0, 0], scale: 1 / POUR_K, fps: 4 });
  const pourGlow = new Loop(k, pourKey, POUR_N, POUR_BOX.x, POUR_BOX.y, { into: fx, origin: [0, 0], scale: 1 / POUR_K, add: true, fps: 4, phase: 0 });
  const gapGlow = k.glow(S.x0 + 26, S.top - 8, 90, 0x7af0d0, 0.3, { into: fx, sy: 0.6 });
  let surge = 0;

  // ——— mist on the floor (the cellar's frames), along the foot of the arcade and over the dais's foot
  const mistKey = sheet(k, 'cl_mist', MW * MK, MH * MK, 12, (c, ph) => {
    c.scale(MK, MK);
    mistFrame(c, ph, 3);
  });
  const mistSc = 1 / MK;
  const mistA = new Loop(k, mistKey, 12, 960, TY + 34, { into: fx, origin: [0.5, 1], sx: (2300 / MW) * mistSc, sy: 1.0 * mistSc, fps: 0.3 });
  const mistB = new Loop(k, mistKey, 12, 1100, TY + 24, { into: fx, origin: [0.5, 1], sx: (2400 / MW) * mistSc, sy: 0.75 * mistSc, fps: 0.2, phase: 6 });
  mistB.each((im) => im.setFlipX(true));
  const mistDais = new Loop(k, mistKey, 12, 860, TY + 10, { into: fx, origin: [0.5, 1], sx: (520 / MW) * mistSc, sy: 0.6 * mistSc, fps: 0.5, phase: 3, tint: 0xb8ffe8 });
  mistA.alpha = 0.4;
  mistB.alpha = 0.28;
  mistDais.alpha = 0.6;
  const puffs = new Parts(k, { frame: 'puff', into: fx, max: 40 });

  // ——— the candles
  const warmKey = sheet(k, 'cl_flame', FLAME.w, FLAME.h, 10, (c, ph) => flameFrame(c, FLAME.w, FLAME.h, ph, WARM, 3, 2));
  const coldKey = sheet(k, 'cl_flameCold', FLAME.w, FLAME.h, 10, (c, ph) => flameFrame(c, FLAME.w, FLAME.h, ph, COLD, 3, 5));
  const smokeKey = sheet(k, 'cl_smoke', SMOKE.w / 2, SMOKE.h / 2, 12, (c, ph) => {
    c.scale(0.5, 0.5);
    steamFrame(c, SMOKE.w, SMOKE.h, ph, { lit: '#d8d4cc', body: '#9a968e', shade: '#3a3836', a: 0.6, n: 10, seed: 3 });
  });
  const candles = CANDLES.map((c, i) => {
    const fy = flameY(c);
    const glow = k.glow(c.x, fy - 14 * c.k, 150 * c.k * c.k, 0xffb050, 0.3, { into: fx });
    const core = k.glow(c.x, fy - 16 * c.k, 44 * c.k, 0xffe0a0, 0.3, { into: fx });
    const smoke = new Loop(k, smokeKey, 12, c.x, fy - 2, { into: fx, origin: [0.5, 1], fps: 9, scale: 2 * c.k });
    smoke.alpha = 0;
    smoke.each((im) => im.setVisible(false));
    const warm = new Loop(k, warmKey, 10, c.x, fy + 4 * c.k, { into: fx, origin: [0.5, 1], add: true, fps: 13, phase: i * 2.7 });
    const cold = new Loop(k, coldKey, 10, c.x, fy + 4 * c.k, { into: fx, origin: [0.5, 1], add: true, fps: 13, phase: i * 1.9 });
    return { c, i, glow, core, smoke, warm, cold, lean: new Spring(0, 16, 2.4), out: 0, outT: -1, relit: c.cold ? 99 : 0, pop: 1 };
  });

  // ——— motes in the moonlight, wisps off the tomb, grit off the vaults
  const speckKey = sheet(k, 'cl_speck', 12, 12, 4, (c, _p, i) => speckFrame(c, 12, i));
  const grit = new Parts(k, { frame: 'mote', sheet: { key: speckKey, n: 4, half: 6 }, into: fx, max: 200 });
  const motes = new Parts(k, { frame: 'mote', add: true, into: fx, max: 50 });
  const moteRate = new Rate();
  const wisps = new Parts(k, { frame: 'soft', add: true, into: fx, max: 30 });
  const wispRate = new Rate();

  return {
    impact(x, _y, p) {
      // the lid lifts at its left end and drops back, dust off its edge, a surge of ectoplasm out of the gap
      lidY.v -= (60 + p * 160) * (0.8 + crand() * 0.4);
      lidR.v -= (0.15 + p * 0.35) * (0.8 + crand() * 0.4);
      lidBumpT = 0;
      surge = Math.min(1.4, surge + 0.5 + p * 0.8);
      pallGust = Math.min(1, pallGust + 0.4 + p * 0.6);
      // the candles gutter; a hard stomp snuffs the nearest, and it lights itself again a moment later, green
      for (const c of candles) c.lean.v += (c.c.x < x ? -1 : 1) * (2 + p * 4) * (0.6 + crand() * 0.6);
      if (p > 0.6) {
        const near = [...candles].sort((a, b) => Math.abs(a.c.x - x) - Math.abs(b.c.x - x))[0];
        if (near.outT < 0) {
          near.outT = 0;
          near.smoke.each((im) => im.setVisible(true));
        }
      }
      // the ghosts shriek and recoil away from it
      for (const g of ghosts) {
        if (!g.on) continue;
        g.shriek = 1;
        const d = g.x - x || 1;
        g.vx += Math.sign(d) * (180 + p * 260) * g.sc;
        g.vy -= (90 + p * 140) * g.sc;
      }
      // the mist thrown out along the floor
      const n = Math.round(4 + p * 8);
      for (let i = 0; i < n; i++) {
        const dir = i % 2 ? 1 : -1;
        puffs.spawn({ x: x + dir * (10 + crand() * 40), y: TY - 10 - crand() * 30, vx: dir * (80 + crand() * 160) * (0.5 + p), vy: -10 - crand() * 30, life: 2.4 + crand() * 1.6, r0: 30, r1: 90 + crand() * 50, a: 0.18, tint: 0xc8e8e0, drag: 1.1, fade: 0.2 });
      }
      // grit off the vaults and the arch rings
      const dust = Math.round(10 + p * 36);
      for (let i = 0; i < dust; i++) {
        const sx = crand() * W;
        const bay = PK.bays.reduce((a, b) => (Math.abs(b - sx) < Math.abs(a - sx) ? b : a));
        const dx = sx - bay;
        const sy = Math.abs(dx) < PK.ri ? SPRING - Math.sqrt(PK.ri * PK.ri - dx * dx) + 4 : SPRING - 4 - crand() * 40;
        grit.spawn({ x: sx, y: sy, vx: (crand() - 0.5) * 14, vy: 10 + crand() * 40, life: 2 + crand() * 2, r0: 0.9 + crand() * 1.6, a: 0.7, tint: 0xc8c4b8, grav: 140, drag: 0.6, floor: TY - 2 });
      }
    },
    update(dt, t) {
      dt = Math.max(0, dt);
      const cm = calm();
      // ——— the tomb's light breathes, and swells with a surge
      surge = Math.max(0, surge - dt * 0.6);
      const breath = 0.7 + 0.18 * Math.sin(t * 0.9) + 0.08 * Math.sin(t * 2.3 + 1);
      tombL.setAlpha(Math.min(1, breath * 0.9 + surge * 0.3));
      gapGlow.setAlpha(0.28 + 0.1 * Math.sin(t * 1.7) + surge * 0.25);
      // ——— the lid: a thud back down, a puff of dust and ectoplasm when it lands
      lidBumpT += dt;
      const ly = lidY.step(0, dt);
      const lr = lidR.step(0, dt);
      if (ly > 0) {
        if (lidY.v > 40) {
          for (let i = 0; i < 6; i++) puffs.spawn({ x: S.x0 + PK.lidShift + crand() * 200, y: S.top - 2, vx: (crand() - 0.5) * 60, vy: -10 - crand() * 20, life: 1.4 + crand(), r0: 8, r1: 30, a: 0.22, tint: 0xd8d0c0, drag: 1.5, fade: 0.1 });
        }
        lidY.x = 0;
        lidY.v = -lidY.v * 0.25;
      }
      if (lr > 0) {
        lidR.x = 0;
        lidR.v = -lidR.v * 0.25;
      }
      lidImg.setPosition(LID_HINGE.x, LID_HINGE.y + Math.min(0, ly) * 0.25).setRotation(Math.min(0, lr) * 0.12);
      // ——— the pour
      pour.alpha = Math.min(1, 0.85 + surge * 0.2);
      pour.step(dt, 1 + surge * 1.5);
      // (its glow, added over it: the same frame)
      pourGlow.alpha = Math.min(0.6, 0.3 + surge * 0.3);
      pourGlow.show(pourPh(pour));
      // ——— the pall
      pallGust = Math.max(0, pallGust - dt * 0.4);
      pall.step(dt, (0.6 + pallGust * 3) * cm);
      // ——— mist
      mistA.step(dt);
      mistB.step(dt);
      mistDais.step(dt, 1 + surge);
      puffs.update(dt);
      // ——— wisps rising from the gap
      wispRate.tick((1 + surge * 6) * cm, dt, () => {
        wisps.spawn({ x: S.x0 + 14 + crand() * 30, y: S.top - 4, vx: (crand() - 0.5) * 10, vy: -14 - crand() * 18, life: 2.5 + crand() * 2, r0: 3 + crand() * 3, r1: 1.5, a: 0.55, tint: 0x9affe0, fade: 0.3 });
      });
      wisps.update(dt);
      // ——— the ghosts
      spawnIn -= dt;
      const active = ghosts.filter((g) => g.on).length;
      if (spawnIn <= 0) {
        spawnIn = (6 + crand() * 5) * (0.7 + crand() * 0.6);
        const free = ghosts.find((g) => !g.on);
        if (free && active < 3) launch(free);
      }
      for (const g of ghosts) {
        if (!g.on) continue;
        g.t += dt * (1 + g.shriek * 0.6);
        const u = g.t / g.dur;
        if (u >= 1) {
          g.on = false;
          for (const im of [g.a, g.b, g.s, g.glow]) im.setVisible(false);
          continue;
        }
        g.ox += g.vx * dt;
        g.oy += g.vy * dt;
        g.vx *= Math.exp(-dt * 2.2);
        g.vy *= Math.exp(-dt * 2.2);
        g.ox *= Math.exp(-dt * 0.25);
        g.oy *= Math.exp(-dt * 0.4);
        const s = bez(g.pts, u, 2);
        const px = g.x;
        g.x = bez(g.pts, u, 0) + Math.sin(t * 0.9 + g.seed) * 14 * s + g.ox;
        g.y = bez(g.pts, u, 1) + Math.sin(t * 1.7 + g.seed * 2) * 9 * s + g.oy;
        g.sc = s;
        const vx = (g.x - px) / Math.max(dt, 1e-3);
        const fadeIn = smooth(0, g.deepU > 0 ? 0.06 : 0.12, u);
        const fadeOut = 1 - smooth(0.86, 1, u);
        // (fainter where the feet hover)
        const near = Math.max(...PK.bays.map((b) => Math.exp(-(((g.x - b) / 200) ** 2))));
        const lane = 1 - 0.45 * near * (1 - smooth(380, 480, g.y));
        g.alpha = 0.85 * fadeIn * fadeOut * lane;
        setParent(g, u < g.deepU ? deepGhosts : fx);
        g.ph = (g.ph + dt * g.fps * (1 + g.shriek)) % GHOST_N;
        g.shriek = Math.max(0, g.shriek - dt * 1.1);
        const sk = Math.sin(Math.min(1, g.shriek) * Math.PI * 0.5);
        const i0 = Math.floor(g.ph);
        const fr = g.ph - i0;
        const scl = s / GK;
        const rot = Phaser.Math.Clamp(vx * 0.0009, -0.3, 0.3) * cm;
        for (const im of [g.a, g.b, g.s]) im.setPosition(g.x, g.y).setScale(scl * (1 - sk * 0.06), scl * (1 + sk * 0.1)).setRotation(rot);
        g.a.setFrame(i0).setAlpha(g.alpha * (1 - sk));
        g.b.setFrame((i0 + 1) % GHOST_N).setAlpha(g.alpha * fr * (1 - sk));
        g.s.setFrame(GHOST_N + Math.min(SHRIEK_N - 1, Math.floor(sk * SHRIEK_N))).setAlpha(g.alpha * sk);
        g.glow.setPosition(g.x, g.y + 50 * s).setScale((280 * s) / 256, (360 * s) / 256).setAlpha(g.alpha * (0.22 + sk * 0.2));
      }
      // ——— the candles
      for (const c of candles) {
        let draught = 0;
        let push = 0;
        for (const g of ghosts) {
          if (!g.on) continue;
          const d = Math.hypot(g.x - c.c.x, g.y - flameY(c.c));
          const k2 = Math.max(0, 1 - d / 380) * g.alpha;
          draught = Math.max(draught, k2);
          push += Math.sign(c.c.x - g.x) * k2;
        }
        const lean = c.lean.step(wander(t * 0.7, c.i * 3) * 0.06 * cm + push * 0.25, dt);
        if (c.outT >= 0) {
          c.outT += dt;
          if (c.outT < 0.15) c.out = Math.min(1, c.outT / 0.15);
          else if (c.outT > 1.9) {
            c.out = 0;
            c.outT = -1;
            c.relit = 1;
            c.pop = 0.2;
          }
          c.smoke.alpha = Math.max(0, 1 - Math.max(0, c.outT - 0.1) / 2.6) * 0.9;
          c.smoke.show(Phaser.Math.Clamp(c.outT * 5, 0, 11.99));
        } else if (c.smoke.alpha > 0) {
          c.smoke.alpha = Math.max(0, c.smoke.alpha - dt * 0.5);
          c.smoke.step(dt);
          if (c.smoke.alpha <= 0) c.smoke.each((im) => im.setVisible(false));
        }
        c.pop = Math.min(1, c.pop + dt * 3);
        // a relit flame burns green for a while, then warms again (the votives that are cold stay cold)
        c.relit = c.c.cold ? 99 : Math.max(0, c.relit - dt * 0.08);
        const coldK = smooth(0, 0.6, c.relit);
        const fl = flicker(t, c.i * 2.3) * (1 - draught * 0.35);
        const lit = (1 - c.out) * c.pop;
        const sy = lit * (0.92 + 0.12 * fl) * (1 - draught * 0.25);
        c.warm.alpha = lit * (1 - coldK);
        c.cold.alpha = lit * coldK;
        for (const l of [c.warm, c.cold]) {
          l.step(dt, 1 + draught * 0.8);
          l.each((im) => im.setRotation(lean).setScale((0.9 + 0.1 * fl) * c.c.k, sy * c.c.k));
        }
        const col = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xffb050), Phaser.Display.Color.ValueToColor(0x60f0c0), 100, coldK * 100);
        const tint = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
        c.glow.setTint(tint).setAlpha(0.26 * c.c.k * c.c.k * lit * fl);
        c.core.setTint(tint).setAlpha(0.28 * c.c.k * c.c.k * lit * fl);
      }
      // ——— dust and motes
      grit.update(dt);
      const gr = PK.grate;
      moteRate.tick(5 * cm, dt, () => {
        const u = crand();
        const v = crand() * 0.7;
        const x = gr.x + (crand() - 0.5) * 50 + (100 + (u - 0.5) * 160) * v;
        const y = gr.y + 20 + (BACK_FLOOR - gr.y) * v;
        motes.spawn({ x, y, vx: (crand() - 0.5) * 6, vy: (crand() - 0.3) * 5, life: 5 + crand() * 3, r0: 1 + crand() * 1.4, a: 0.45, tint: 0xc8d8ff, fade: 0.3 });
      });
      motes.update(dt);
      void lidBumpT;
    },
  };
});
