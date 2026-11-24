// Thrym's Hall (Thrym the Frost King's arena, the end of the Jotunheim stage, Act 8), redrawn with the location kit
// (src/art/scene): the frost king's great hall, carved into the glacier above the ice fields (scene-jotunheim.ts),
// the same land of the frost giants and the same moonlit night.
//
// A giants' longhouse hewn out of the ice: we stand at the foot of its nave and look up it to the king's high seat.
// Two rows of carved timber posts (whole trees, their lower parts grown into sleeves of glacier ice, their bands of
// gripping beasts cut in and lit by a cold inlay) carry tie beams hung with icicles and the rafters of a roof whose
// panels are the glacier's own blue-black underside; a rift has opened in it on the left, and the moon shines down
// through it in a long beam to the foot of the dais, the snow sifting down in its light. The side walls are the
// glacier's face, its strata running away down the hall, scalloped where the giants' picks bit; two windows of clear
// ice on each side hold the aurora. On a three-step dais of the Jotunheim basalt the high seat of rune-cut stone with a
// back of ice grown into spires, flanked by its carved high-seat pillars. Before the near posts, a hearth on each side:
// a hexagonal basalt pillar from the giants' causeway with a granite bowl of cold blue fire. On the near posts, the
// king's gold-horned oxen (the ones Thrym boasts of) as skulls, and a round shield under each. The floor is laid with
// the causeway's hex-cut basalt, rime in the joints. The table is the king's board: black oak, frost on its edges, a
// band of interlace carved along its front.
//
// Live, the heroes:
// - the cold fires: painted at 12 phases, pale tongues licking up from a bed of glowing ice, their light breathing on
//   the posts and the walls; their vapour, colder than the air, spills over the bowls' rims and sinks down the
//   pedestals; frost sparks rise and fall back. A stomp ducks the fires and they flare back;
// - the snow through the vault: flakes sifting down through the moonbeam, lit while they're in it, painted veils of
//   snow drifting down the beam; a stomp shakes clumps of snow through the rift and icicles off the tie beams (they fall
//   and shatter on the floor);
// - the aurora beyond the ice windows, painted folding at 10 phases, refracted by the thick ice;
// - the shields swing on their pegs at a stomp.

import Phaser from 'phaser';
import { type Air, type Ctx, type PathFn, type R, TY, W, airMix, calmLanes, castShadow, crevice, glowAt, gradeAll, lightPool, polyPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';

import { crack, drift, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { stars } from '../../art/scene/sky';
import { hashStr, makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Swing, sheet } from '../../game/sceneAnim';
import { fxAtlas } from '../../game/liveKit';
import { type KitLive, calm, lerp, registerKitScene } from '../../game/sceneLive';
import type { Pt } from './scene-rink';
import { icicle } from './scene-yeti';
import { RUNE, auroraColumn, carvedRune } from './scene-jotunheim';

// ——— the hall's own perspective ———
//
// The hall is laid out in its own units (X across, Y up, z away from us) and seen from a giant's eye height EH, its
// vanishing point a little lower than the table's (so the vault shows).

const F = 360;
const VY = 430;
const EH = 1.4;
const sx = (X: number, z: number) => 960 + (X * F) / z;
const sy = (Y: number, z: number) => VY + ((EH - Y) * F) / z;
const P = (X: number, Y: number, z: number): Pt => [sx(X, z), sy(Y, z)];

export const TH = {
  front: 1040,
  /** The glacier walls (±X), the eaves and the ridge (Y), the far wall (z). */
  wallX: 3,
  eaves: 3.4,
  ridge: 5.4,
  farZ: 3.6,
  /** The nave's posts (±X) at their depths, and the tie beams they carry (top Y). */
  postX: 1.4,
  posts: [0.62, 1.6, 2.5],
  tieY: 3.25,
  /** The ice windows in the side walls (z from…to, sill and spring Y). */
  windows: [[1.85, 2.25], [2.65, 3.05]] as [number, number][],
  sill: 0.9,
  spring: 2.55,
  head: 2.95,
  /** The rift in the left roof (X from…to, z from…to). */
  rift: { X0: -2.95, X1: -1.95, z0: 1.55, z1: 2.2 },
  /** The hearths: a basalt pillar each side (±X, z), its bowl's rim at Y. */
  hearth: { X: 2.3, z: 1.35, Y: 0.8, r: 0.2 },
  /** The dais's three steps (z of each step's front, top Y, half width X) and the high seat. */
  steps: [[3.0, 0.15, 1.7], [3.15, 0.3, 1.4], [3.3, 0.45, 1.1]] as [number, number, number][],
  seat: { z: 3.45, hw: 0.82, seatY: 1.15, backY: 2.55 },
  /** The high-seat pillars either side of the seat (±X). */
  seatPostX: 1.2,
};

const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const INK = '#060a1c';
const AIR: Air = { color: '#0e1c3c', far: 0.7 };
/** Depth through the hall's air (0 near … 1 at the far wall). */
const dep = (z: number) => clamp01((z - 0.6) / (TH.farZ - 0.6));
const ICE = { lit: '#6a9ad0', body: '#1e3a6a', shade: '#0e1e44', deep: '#060e26', rime: '#d8e8fa' };
const WOOD = { lit: '#7a6a62', body: '#4a3c38', shade: '#271e22', deep: '#120c10' };
const BASALT = { lit: '#5a6280', body: '#30364e', shade: '#181c2e', deep: '#0a0c18' };
const FIRE = '#62d8ff';

/** The hearths' fire (screen): the bowl's middle and its rim. */
const HEARTHS: { x: number; rim: number; r: number; dir: -1 | 1 }[] = [-1, 1].map((d) => ({
  x: sx(d * TH.hearth.X, TH.hearth.z),
  rim: sy(TH.hearth.Y, TH.hearth.z),
  r: (TH.hearth.r * F) / TH.hearth.z,
  dir: d as -1 | 1,
}));

/** The roof's height at X (the eaves at the walls, the ridge in the middle). */
const roofY = (X: number) => TH.eaves + ((TH.wallX - Math.abs(X)) / TH.wallX) * (TH.ridge - TH.eaves);

// ——— the glacier: walls and vault ———

const leftWall: PathFn = (c) => {
  const w = TH.wallX;
  polyPath([P(-w, -2, 0.9), P(-w, 0, TH.farZ), P(-w, TH.eaves, TH.farZ), P(-w, TH.eaves, 0.9)])(c);
};
const rightWall: PathFn = (c) => {
  const w = TH.wallX;
  polyPath([P(w, -2, 0.9), P(w, 0, TH.farZ), P(w, TH.eaves, TH.farZ), P(w, TH.eaves, 0.9)])(c);
};
const farWall: PathFn = (c) => {
  const w = TH.wallX;
  const z = TH.farZ;
  polyPath([P(-w, 0, z), P(-w, TH.eaves, z), P(0, TH.ridge, z), P(w, TH.eaves, z), P(w, 0, z)])(c);
};
const roofL: PathFn = (c) => polyPath([P(-TH.wallX, TH.eaves, 0.7), P(-TH.wallX, TH.eaves, TH.farZ), P(0, TH.ridge, TH.farZ), P(0, TH.ridge, 0.7)])(c);
const roofR: PathFn = (c) => polyPath([P(TH.wallX, TH.eaves, 0.7), P(TH.wallX, TH.eaves, TH.farZ), P(0, TH.ridge, TH.farZ), P(0, TH.ridge, 0.7)])(c);
const floorPath: PathFn = (c) => polyPath([P(-TH.wallX, 0, 0.9), P(-TH.wallX, 0, TH.farZ), P(TH.wallX, 0, TH.farZ), P(TH.wallX, 0, 0.9)])(c);

/** A point on a side wall (side −1 left, 1 right) at height Y and depth z. */
const onWall = (side: number, Y: number, z: number): Pt => P(side * TH.wallX, Y, z);

/** Strata in a glacier face: bands of old snow, bubbly and clear ice and grit lying one over another, waving a
 * little. f(Y, u) gives the band's screen polyline for a height Y along u 0…1. */
function strata(ctx: Ctx, r: R, line: (Y: number, u: number) => Pt, Y0: number, Y1: number, k: number): void {
  let Y = Y0;
  while (Y < Y1) {
    const th = 0.05 + r() * 0.22;
    const kind = r();
    const ph = r() * P2;
    const amp = 0.02 + r() * 0.05;
    const pts: Pt[] = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push(line(Y + Math.sin(u * 7 + ph) * amp + Math.sin(u * 19 + ph * 2) * amp * 0.3, u));
    }
    const lo: Pt[] = [];
    for (let i = n; i >= 0; i--) {
      const u = i / n;
      const taper = 0.25 + 0.75 * Math.sin(u * Math.PI * (1 + (kind * 7) % 2) + ph) ** 2;
      lo.push(line(Y + th * taper + Math.sin(u * 7 + ph) * amp + Math.sin(u * 23 + ph) * amp * 0.4, u));
    }
    ctx.beginPath();
    [...pts, ...lo].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    // bubbly old ice (paler), clear blue ice (deeper), or a thin band of grit (dark)
    if (kind < 0.35) ctx.fillStyle = rgba('#3a6cb0', 0.14 * k);
    else if (kind < 0.75) ctx.fillStyle = rgba('#02081c', 0.16 * k);
    else ctx.fillStyle = rgba('#5a88c0', 0.1 * k);
    ctx.fill();
    if (kind > 0.88) {
      ctx.strokeStyle = rgba('#05060c', 0.4 * k);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    Y += th + r() * 0.12;
  }
}

/** Scallops: the shallow dishes the giants' picks (and the cold air) left in the ice, each in shadow on its upper
 * left inside and catching the light on its lower right lip. */
function scallops(ctx: Ctx, n: number, at: () => [number, number, number] | null, squash: number): void {
  for (let i = 0; i < n; i++) {
    const p = at();
    if (!p) continue;
    const [x, y, s] = p;
    const rx = s * squash;
    const ry = s * 0.7;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(-0.25, -0.3, 0, 0, 0, 1);
    g.addColorStop(0, 'rgba(2,6,20,0.32)');
    g.addColorStop(0.6, 'rgba(2,6,20,0.18)');
    g.addColorStop(1, 'rgba(2,6,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,196,240,0.07)';
    ctx.lineWidth = 1.6 / Math.max(rx, ry);
    ctx.beginPath();
    ctx.arc(0, 0, 0.92, 0.2 + (s % 0.3), 1.4 + (s % 0.5));
    ctx.stroke();
    ctx.restore();
  }
}

/** The glacier's deep cracks: a dark line with a pale lip and a faint blue glow deep inside. */
function iceCrack(ctx: Ctx, r: R, x: number, y: number, ang: number, len: number): void {
  crack(ctx, r, x, y, ang, len, { col: '#020614', lip: '#7aa8e0', w: 1.6, a: 0.5, branch: 0.25 });
}

function sideWall(ctx: Ctx, r: R, side: -1 | 1): void {
  const path = side < 0 ? leftWall : rightWall;
  const x0 = side < 0 ? 0 : sx(TH.wallX, TH.farZ);
  const x1 = side < 0 ? sx(-TH.wallX, TH.farZ) : W;
  const box = { x: x0, y: -300, w: x1 - x0, h: TY + 300 };
  within(ctx, path, () => {
    // deep ice, darker up into the vault and away down the hall, the near end a little more luminous
    vfill(ctx, box.x, 0, box.w, TY, [[0, ICE.deep], [0.45, '#0c1a3e'], [0.8, '#142a56'], [1, '#18325e']]);
    const hz = ctx.createLinearGradient(side < 0 ? 0 : W, 0, side < 0 ? x1 : x0, 0);
    hz.addColorStop(0, 'rgba(40,80,140,0.2)');
    hz.addColorStop(1, 'rgba(4,10,30,0.4)');
    ctx.fillStyle = hz;
    ctx.fillRect(box.x, 0, box.w, TY);
    surface(ctx, r, { x: box.x, y: 0, w: box.w, h: TY }, '#14284e', { over: true, vary: 0.35, cells: 5, mottle: 0.3, strokes: 0.25, strokeAng: side < 0 ? 0.55 : -0.55, strokeLen: 200, strokeW: 10, grain: 0.1, seed: 11 + side });
    lay(ctx, noiseMask(8, 23 + side, { cover: 0.4, soft: 0.3, col: '#3a6aa8', w: 160, h: 120 }), { x: box.x, y: 0, w: box.w, h: TY }, 0.12);
    // light held deep in the ice: blue glows far inside the face, where it's clearest
    softly(ctx, { x: box.x, y: 0, w: box.w, h: TY }, (g) => {
      for (let i = 0; i < 7; i++) {
        const z = 1.1 + r() * 2.3;
        const [gx, gy] = onWall(side, 0.3 + r() * 2.6, z);
        const rad = ((0.5 + r() * 0.7) * F) / z;
        const rg = g.createRadialGradient(gx, gy, 0, gx, gy, rad);
        rg.addColorStop(0, rgba('#3a86d8', 0.2));
        rg.addColorStop(0.5, rgba('#1e5aa8', 0.08));
        rg.addColorStop(1, rgba('#1e5aa8', 0));
        g.fillStyle = rg;
        g.save();
        g.translate(gx, gy);
        g.scale(0.6, 1);
        g.translate(-gx, -gy);
        g.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
        g.restore();
      }
    }, 0.25);
    // strata running away down the hall
    strata(ctx, r, (Y, u) => onWall(side, Y, lerp(0.9, TH.farZ, u ** 1.6)), -0.2, TH.eaves, 1);
    // pick scallops, smaller with distance
    scallops(ctx, 90, () => {
      const z = lerp(1.0, TH.farZ, r() ** 0.9);
      const Y = r() * TH.eaves;
      const [x, y] = onWall(side, Y, z);
      if (y < -10 || y > TY) return null;
      return [x, y, (0.16 * F) / z];
    }, 0.55);
    // fracture planes deep in the ice catching the light: pale sheets seen edge-on, soft
    softly(ctx, { x: box.x, y: 0, w: box.w, h: TY }, (g) => {
      for (let i = 0; i < 6; i++) {
        const z = 1.1 + r() * 2.2;
        const [ax, ay] = onWall(side, 0.2 + r() * 2.4, z);
        const len = ((0.6 + r() * 0.9) * F) / z;
        const ang = -Math.PI / 2 + (r() - 0.5) * 1.2;
        g.strokeStyle = rgba('#8ac4f4', 0.1);
        g.lineWidth = ((0.04 + r() * 0.05) * F) / z;
        g.beginPath();
        g.moveTo(ax, ay);
        g.quadraticCurveTo(ax + Math.cos(ang + 0.3) * len * 0.5, ay + Math.sin(ang + 0.3) * len * 0.5, ax + Math.cos(ang) * len, ay + Math.sin(ang) * len);
        g.stroke();
      }
    }, 0.5);
    // bubbles trapped in the bubbly bands, in drifts
    for (let i = 0; i < 26; i++) {
      const z = 1.05 + r() * 2.4;
      const [bx, by] = onWall(side, r() * TH.eaves, z);
      const k2 = F / z;
      for (let j = 0; j < 7; j++) {
        const px = bx + (r() - 0.5) * 0.3 * k2;
        const py = by + (r() - 0.5) * 0.12 * k2;
        const rad = Math.max(0.7, (0.006 + r() * 0.01) * k2);
        ctx.fillStyle = rgba('#d8ecff', 0.18 + r() * 0.2);
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, P2);
        ctx.fill();
      }
    }
    // a few deep cracks running up the face
    for (let i = 0; i < 4; i++) {
      const z = 1.1 + r() * 2.2;
      const [x, y] = onWall(side, r() * 1.2, z);
      iceCrack(ctx, r, x, y, -Math.PI / 2 + (r() - 0.5) * 0.6, (1.2 * F) / z);
    }
    // rime and snow banked along its foot, thick where the drift collects
    const foot: Pt[] = [];
    const top: Pt[] = [];
    for (let i = 0; i <= 30; i++) {
      const z = lerp(0.95, TH.farZ, i / 30);
      foot.push(onWall(side, -0.05, z));
      top.push(onWall(side, 0.1 + 0.07 * Math.sin(i * 0.45) ** 2 + 0.03 * Math.sin(i * 1.7), z));
    }
    ctx.beginPath();
    [...top, ...foot.reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    const sg = ctx.createLinearGradient(0, 520, 0, TY);
    sg.addColorStop(0, '#5a78a8');
    sg.addColorStop(1, '#8aa4cc');
    ctx.fillStyle = sg;
    ctx.fill();
  });
}

function farGable(ctx: Ctx, r: R): void {
  const z = TH.farZ;
  const [x0, yb] = P(-TH.wallX, 0, z);
  const [x1] = P(TH.wallX, 0, z);
  const [, yr] = P(0, TH.ridge, z);
  const box = { x: x0, y: yr, w: x1 - x0, h: yb - yr };
  within(ctx, farWall, () => {
    vfill(ctx, box.x, box.y, box.w, box.h, [[0, '#050c22'], [0.5, '#0c1a3a'], [1, '#14284c']]);
    surface(ctx, r, box, '#102044', { over: true, vary: 0.3, cells: 4, mottle: 0.3, strokes: 0.2, strokeAng: 0, strokeLen: 160, strokeW: 8, grain: 0.1, seed: 19 });
    strata(ctx, r, (Y, u) => P(lerp(-TH.wallX, TH.wallX, u), Y, z), -0.1, TH.ridge, 0.8);
    scallops(ctx, 40, () => {
      const X = (r() - 0.5) * 2 * TH.wallX;
      const Y = r() * TH.ridge;
      return [...P(X, Y, z), (0.16 * F) / z] as [number, number, number];
    }, 1);
    // the hall's far end lies in the dark: the air's murk over it
    ctx.fillStyle = rgba(AIR.color, 0.35);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    // except behind the high seat, where the moonlight striking the dais glows back through the glacier: the seat
    // stands dark against it
    glowAt(ctx, 960, 400, 260, '#3a7ad0', 0.3, 0.9);
    glowAt(ctx, 960, 430, 120, '#8ac4f4', 0.18, 0.8);
  });
}

/** The vault: the glacier's underside between the rafters, and the rift. */
function vault(ctx: Ctx, r: R): void {
  for (const [path, side] of [[roofL, -1], [roofR, 1]] as const) {
    within(ctx, path, () => {
      const box = { x: side < 0 ? 0 : 960, y: 0, w: 960, h: 260 };
      vfill(ctx, box.x, -40, box.w, 300, [[0, '#02050f'], [0.6, '#06102a'], [1, '#0c1c3e']]);
      surface(ctx, r, box, '#081430', { over: true, vary: 0.35, cells: 4, mottle: 0.35, strokes: 0.3, strokeAng: side * 0.5, strokeLen: 160, strokeW: 8, grain: 0.1, seed: 31 + side });
      // the glacier lit from within: moonlight diffusing through the ice round the rift (left), deep blue glows elsewhere
      if (side < 0) glowAt(ctx, RIFT_C[0] + 30, RIFT_C[1] + 20, 300, '#3a7ad0', 0.32, 0.7);
      glowAt(ctx, side < 0 ? 700 : 1240, 120, 220, '#1e4a96', 0.22, 0.6);
      lay(ctx, noiseMask(7, 57 + side, { cover: 0.45, soft: 0.3, col: '#4a86d0', w: 120, h: 50 }), box, 0.14);
      // the glacier's strata seen from below: bands running away along the hall
      for (let i = 0; i < 9; i++) {
        const X = side * (0.2 + r() * 2.7);
        const Y = roofY(X);
        const pts: Pt[] = [];
        for (let j = 0; j <= 20; j++) pts.push(P(X + Math.sin(j * 0.7 + i) * 0.05, Y, lerp(0.7, TH.farZ, j / 20)));
        ctx.strokeStyle = rgba(r() < 0.5 ? '#2a5490' : '#010410', 0.25);
        ctx.lineWidth = 3 + r() * 6;
        ctx.beginPath();
        pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    });
  }
}

const RIFT: Pt[] = (() => {
  const { X0, X1, z0, z1 } = TH.rift;
  const rr = rng(hashStr('th:rift'));
  const out: Pt[] = [];
  // round the rift's edge: a ragged ellipse in the roof plane
  const n = 34;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * P2;
    const k = 0.72 + rr() * 0.42 + (i % 3 === 0 ? 0.12 : 0);
    const X = lerp(X0, X1, 0.5 + 0.5 * Math.cos(a) * k);
    const z = lerp(z0, z1, 0.5 + 0.5 * Math.sin(a) * k);
    out.push(P(X, roofY(X), z));
  }
  return out;
})();
const riftPath: PathFn = (c) => polyPath(RIFT)(c);
const RIFT_C: Pt = [RIFT.reduce((s, p) => s + p[0], 0) / RIFT.length, RIFT.reduce((s, p) => s + p[1], 0) / RIFT.length];

/** The rift's far opening (the glacier's top surface, above its underside): straight up the screen, a little smaller. */
const RIFT_TOP: Pt[] = RIFT.map(([x, y]) => [RIFT_C[0] + (x - RIFT_C[0]) * 0.84 - 8, RIFT_C[1] + (y - RIFT_C[1]) * 0.84 - 58]);

/** The night through the rift: the moonlit sky through the glacier's thickness, the crevasse's walls of ice lit by
 * the moon where they face it, snow overhanging its lip, icicles. */
function rift(ctx: Ctx, r: R): void {
  const box = { x: 200, y: -80, w: 520, h: 230 };
  // the crevasse's walls: everything inside the lower opening is ice, lit where it faces the moon (down and right)
  within(ctx, riftPath, () => {
    const g = ctx.createLinearGradient(RIFT_C[0] - 120, RIFT_C[1] - 80, RIFT_C[0] + 90, RIFT_C[1] + 70);
    g.addColorStop(0, '#0e2450');
    g.addColorStop(0.45, '#2a5a9a');
    g.addColorStop(0.8, '#4a80c0');
    g.addColorStop(1, '#7aa8dc');
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    surface(ctx, r, box, '#3a6aa8', { over: true, vary: 0.3, cells: 3, mottle: 0.3, strokes: 1.2, strokeAng: -Math.PI / 2, strokeLen: 60, strokeW: 3, grain: 0.12, seed: 131 });
    // its strata, running round the walls
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      ctx.strokeStyle = rgba(i % 2 ? '#0a1a40' : '#cfe6ff', 0.25);
      ctx.lineWidth = 2;
      ctx.beginPath();
      RIFT.forEach(([x, y], j) => {
        const [tx, ty] = RIFT_TOP[j];
        if (j) ctx.lineTo(lerp(x, tx, t), lerp(y, ty, t));
        else ctx.moveTo(lerp(x, tx, t), lerp(y, ty, t));
      });
      ctx.closePath();
      ctx.stroke();
    }
    // the sky through the top opening: deep moonlit blue, a few stars, the moon's glare just out of sight
    ctx.save();
    polyPath(RIFT_TOP)(ctx);
    ctx.clip();
    vfill(ctx, box.x, box.y, box.w, box.h, [[0, '#2a4a86'], [1, '#4a70b0']]);
    stars(ctx, r, box, 30, '#eef2ff');
    glowAt(ctx, RIFT_C[0] - 90, RIFT_C[1] - 90, 150, '#eef4ff', 0.75);
    ctx.restore();
    // the top opening's lip: snow overhanging it, lit, a shadow under it
    ctx.strokeStyle = rgba('#0a1838', 0.6);
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(2, 4);
    polyPath(RIFT_TOP)(ctx);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = rgba('#e8f2ff', 0.8);
    ctx.lineWidth = 4;
    polyPath(RIFT_TOP)(ctx);
    ctx.stroke();
  });
  // the lower lip (the glacier's underside, round the opening): rime, an ink line, icicles
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba('#9cc0ea', 0.6);
  ctx.lineWidth = 4;
  riftPath(ctx);
  ctx.stroke();
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 2;
  riftPath(ctx);
  ctx.stroke();
  const rr = rng(hashStr('th:riftIcicles'));
  for (const [x, y] of RIFT) {
    if (y < RIFT_C[1] || rr() < 0.3) continue;
    icicle(ctx, x, y - 1, 10 + rr() * 26, 3 + rr() * 4, 0.9);
  }
}

/** The roof's timber frame: rafters (across, each at one depth), purlins and the ridge (running away along the hall). */
function rafters(ctx: Ctx, r: R): void {
  const beamQuad = (a: Pt, b: Pt, c: Pt, d: Pt, base: string, depth: number) => {
    const p = polyPath([a, b, c, d]);
    p(ctx);
    ctx.fillStyle = airMix(base, depth, AIR);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.7);
    ctx.lineWidth = Math.max(1, 2 - depth * 1.2);
    ctx.stroke();
  };
  // purlins and the ridge: from the far gable to beyond the top of the picture
  for (const X of [-TH.postX, 0, TH.postX]) {
    const Y = roofY(X) - 0.02;
    const w = 0.1;
    const z0 = 0.8;
    const z1 = TH.farZ;
    // the underside (seen from below) and the inner side face towards the nave
    beamQuad(P(X - w, Y, z0), P(X - w, Y, z1), P(X + w, Y, z1), P(X + w, Y, z0), WOOD.shade, 0.5);
    const side = X === 0 ? 0 : Math.sign(X);
    if (side) beamQuad(P(X - side * w, Y, z0), P(X - side * w, Y, z1), P(X - side * w, Y - 0.16, z1), P(X - side * w, Y - 0.16, z0), side < 0 ? WOOD.body : WOOD.shade, 0.4);
  }
  // rafters at each depth: from the eaves up to the ridge
  for (let z = 0.95; z < TH.farZ - 0.1; z += 0.5) {
    const t = 0.08;
    const d = dep(z);
    for (const side of [-1, 1]) {
      const a = P(side * TH.wallX, TH.eaves, z);
      const b = P(0, TH.ridge, z);
      const c = P(0, TH.ridge, z + t);
      const e = P(side * TH.wallX, TH.eaves, z + t);
      beamQuad(a, b, c, e, WOOD.shade, d);
      // the face towards us
      const a2 = P(side * TH.wallX, TH.eaves - 0.14, z);
      const b2 = P(0, TH.ridge - 0.14, z);
      beamQuad(a, b, b2, a2, side < 0 ? WOOD.body : mix(WOOD.body, WOOD.shade, 0.5), d);
      // frost along their lower edges
      ctx.strokeStyle = rgba(ICE.rime, 0.3 * (1 - d));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(...a2);
      ctx.lineTo(...b2);
      ctx.stroke();
    }
  }
  void r;
}

// ——— the floor: the giants' causeway, hex-cut ———

function floor(ctx: Ctx, r: R): void {
  const [, yFar] = P(0, 0, TH.farZ);
  const box = { x: 0, y: yFar - 4, w: W, h: TY + 8 - yFar };
  within(ctx, floorPath, () => {
    vfill(ctx, 0, box.y, W, box.h, [[0, '#121a30'], [1, '#1e2640']]);
    surface(ctx, r, box, '#1a2238', { over: true, vary: 0.3, cells: 5, mottle: 0.3, strokes: 0.2, strokeAng: 0, strokeLen: 200, strokeW: 6, grain: 0.12, seed: 41 });
    // the hex slabs
    const s = 0.34;
    const dx = s * 1.5;
    const dz = s * Math.sqrt(3);
    for (let i = -8; i <= 8; i++) {
      for (let j = 0; j < 12; j++) {
        const X = i * dx;
        const z = 1.3 + j * dz + (i & 1 ? dz / 2 : 0);
        if (z > TH.farZ + 0.2 || Math.abs(X) > TH.wallX + 0.4) continue;
        const pts: Pt[] = [];
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * P2;
          pts.push(P(X + Math.cos(a) * s * 0.96, 0, z + Math.sin(a) * s * 0.96));
        }
        const d = dep(z);
        const tone = (r() - 0.5) * 0.18;
        polyPath(pts)(ctx);
        ctx.fillStyle = airMix(shade(BASALT.body, tone), d, AIR);
        ctx.fill();
        // its top worn smooth: a faint sheen towards the far (lit) edge, the joint full of rime
        ctx.strokeStyle = rgba('#a8c0e4', 0.22 * (1 - d * 0.6));
        ctx.lineWidth = 1.6 * (1 - d * 0.5);
        ctx.stroke();
        ctx.strokeStyle = rgba('#04060e', 0.5);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(...pts[3]);
        ctx.lineTo(...pts[4]);
        ctx.lineTo(...pts[5]);
        ctx.stroke();
      }
    }
    lay(ctx, noiseMask(10, 47, { cover: 0.35, soft: 0.25, col: '#9ab4dc', w: 200, h: 40 }), box, 0.1);
    // drifted snow along the walls' feet
    crevice(ctx, 0, W, box.y, 30, 0.45, '#02040c');
  });
}

// ——— the dais and the high seat ———

function dais(ctx: Ctx, r: R): void {
  const fz = TH.farZ;
  let prevY = 0;
  for (const [z, Y, hw] of TH.steps) {
    const d = dep(z);
    // the riser (its front face) and the tread
    const riser = polyPath([P(-hw, prevY, z), P(-hw, Y, z), P(hw, Y, z), P(hw, prevY, z)]);
    const tread = polyPath([P(-hw, Y, z), P(-hw, Y, fz), P(hw, Y, fz), P(hw, Y, z)]);
    const ends = [polyPath([P(-hw, prevY, z), P(-hw, prevY, fz), P(-hw, Y, fz), P(-hw, Y, z)]), polyPath([P(hw, prevY, z), P(hw, prevY, fz), P(hw, Y, fz), P(hw, Y, z)])];
    ends[0](ctx);
    ctx.fillStyle = airMix(BASALT.lit, d, AIR);
    ctx.fill();
    ends[1](ctx);
    ctx.fillStyle = airMix(BASALT.deep, d, AIR);
    ctx.fill();
    riser(ctx);
    ctx.fillStyle = airMix(BASALT.shade, d, AIR);
    ctx.fill();
    within(ctx, riser, () => {
      const [rx0, ry0] = P(-hw, Y, z);
      const [rx1, ry1] = P(hw, prevY, z);
      surface(ctx, r, { x: rx0, y: ry0, w: rx1 - rx0, h: ry1 - ry0 }, airMix(BASALT.shade, d, AIR), { over: true, vary: 0.3, cells: 3, grain: 0.2, grainKind: 'stone', seed: 51 });
      // a rune frieze on the top riser
      if (Y > 0.4) for (let x = rx0 + 10, i = 0; x < rx1 - 14; x += 18, i++) carvedRune(ctx, i * 5 + 2, x, ry0 + 3, Math.max(8, ry1 - ry0 - 6), 0.45, 0.8);
    });
    tread(ctx);
    ctx.fillStyle = airMix(BASALT.body, d, AIR);
    ctx.fill();
    // the tread's front edge catching the moon; snow in its back corner
    ctx.strokeStyle = rgba('#b8cae8', 0.8);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(...P(-hw, Y, z));
    ctx.lineTo(...P(hw, Y, z));
    ctx.stroke();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 1.2;
    riser(ctx);
    ctx.stroke();
    prevY = Y;
  }
}

/** The high seat's crystals: X, half width, height (top Y), lean. */
const SPIRES: [number, number, number, number][] = [
  [-0.66, 0.08, 2.7, -0.05],
  [-0.5, 0.11, 2.95, -0.03],
  [-0.3, 0.1, 2.84, 0.02],
  [-0.14, 0.13, 3.18, -0.01],
  [0.06, 0.15, 3.3, 0.01],
  [0.26, 0.11, 3.0, 0.03],
  [0.44, 0.12, 3.08, 0.02],
  [0.62, 0.08, 2.76, 0.05],
];

/** The high seat: a block of rune-cut basalt with arms, a white bear's pelt thrown over it, and its back a slab of
 * glacier ice grown up into a crown of crystals. */
function seat(ctx: Ctx, r: R): void {
  const { z, seatY, backY } = TH.seat;
  const d = dep(z) * 0.25;
  const k = F / z;
  const base = 0.45;
  const hw = 0.72;
  const Q = (X: number, Y: number, dz = 0) => P(X, Y, z + dz);
  // the back: a slab of ice, and its crystals
  const back = polyPath([Q(-hw * 0.95, seatY), Q(-hw * 0.95, backY), Q(hw * 0.95, backY), Q(hw * 0.95, seatY)]);
  const crystal = (X: number, w: number, top: number, lean: number): PathFn => polyPath([Q(X - w, backY - 0.3), Q(X - w * 0.9, top - w * 2.2), Q(X + lean, top), Q(X + w * 0.9, top - w * 2.2), Q(X + w, backY - 0.3)]);
  const all: PathFn = (c) => {
    back(c);
    for (const [X, w, t, l] of SPIRES) crystal(X, w, t, l)(c);
  };
  castShadow(ctx, all, 14, 16, 0.5, '#010208');
  const iceBody = (path: PathFn, X: number, w: number, top: number) => {
    const [x0, y0] = Q(X - w, top);
    const [x1, y1] = Q(X + w, backY - 0.3);
    path(ctx);
    ctx.fillStyle = airMix('#1e4a8a', d, AIR);
    ctx.fill();
    within(ctx, path, () => {
      // lit facet on the left (the moon from the rift), dark facet on the right, a bright edge between them
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, airMix('#a8d4f8', d, AIR));
      g.addColorStop(0.48, airMix('#5a96d8', d, AIR));
      g.addColorStop(0.52, airMix('#163a78', d, AIR));
      g.addColorStop(1, airMix('#0a1e4a', d, AIR));
      ctx.fillStyle = g;
      ctx.fillRect(x0 - 2, y0 - 4, x1 - x0 + 4, y1 - y0 + 8);
      vfill(ctx, x0 - 2, y0, x1 - x0 + 4, y1 - y0, [[0, 'rgba(230,246,255,0.35)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(2,8,30,0.35)']]);
    });
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 1.4;
    path(ctx);
    ctx.stroke();
  };
  // the crystals behind the slab first (the tall middle ones stand furthest back)
  for (const [X, w, t, l] of [...SPIRES].sort((a, b) => b[2] - a[2])) iceBody(crystal(X, w, t, l), X, w, t);
  // the slab: clear ice, the dais's dark through it, glowing from inside where the moonbeam strikes its foot
  back(ctx);
  ctx.fillStyle = airMix('#14346a', d, AIR);
  ctx.fill();
  const [bx0, by0] = Q(-hw, backY);
  const [bx1, by1] = Q(hw, seatY);
  const bbox = { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 };
  within(ctx, back, () => {
    surface(ctx, r, bbox, airMix('#1a3e78', d, AIR), { over: true, vary: 0.35, cells: 3, mottle: 0.3, strokes: 2.5, strokeAng: Math.PI / 2, strokeLen: 50, strokeW: 3, grain: 0.1, seed: 61 });
    const g = ctx.createRadialGradient(bx0 + bbox.w * 0.3, by1, 0, bx0 + bbox.w * 0.3, by1, bbox.h * 1.1);
    g.addColorStop(0, rgba('#8ad0ff', 0.6));
    g.addColorStop(0.5, rgba('#3a7ac8', 0.18));
    g.addColorStop(1, rgba('#3a7ac8', 0));
    ctx.fillStyle = g;
    ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);
    // runes cut into the ice, holding the cold light
    const n = 5;
    for (let i = 0; i < n; i++) carvedRune(ctx, [1, 6, 11, 4, 9][i], bx0 + bbox.w * (0.12 + i * 0.16), by0 + bbox.h * 0.16, bbox.h * 0.2, 0.8, 0.9);
    // its edges catching the light, frost along the top
    ctx.fillStyle = rgba('#d8ecff', 0.45);
    ctx.fillRect(bx0, by0, bbox.w, 2);
    ctx.fillStyle = rgba('#d8ecff', 0.25);
    ctx.fillRect(bx0, by0, 2.5, bbox.h);
  });
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 1.6;
  back(ctx);
  ctx.stroke();
  // the seat block and its arms: basalt, rune frieze along the front
  const block = polyPath([Q(-hw, base), Q(-hw, seatY), Q(hw, seatY), Q(hw, base)]);
  const arm = (s: number) => polyPath([Q(s * hw * 0.82, base), Q(s * hw * 0.82, seatY + 0.42), Q(s * hw * 1.16, seatY + 0.5), Q(s * hw * 1.16, base)]);
  for (const p of [block, arm(-1), arm(1)]) castShadow(ctx, p, 6, 8, 0.4, '#010208');
  block(ctx);
  ctx.fillStyle = airMix(BASALT.body, d, AIR);
  ctx.fill();
  const [kx0, ky0] = Q(-hw, seatY);
  const [kx1, ky1] = Q(hw, base);
  within(ctx, block, () => {
    surface(ctx, r, { x: kx0, y: ky0, w: kx1 - kx0, h: ky1 - ky0 }, airMix(BASALT.body, d, AIR), { over: true, vary: 0.3, cells: 3, grain: 0.3, grainKind: 'stone', seed: 63 });
    for (let x = kx0 + 8, i = 0; x < kx1 - 10; x += 14, i++) carvedRune(ctx, i * 3 + 1, x, ky1 - 22, 14, 0.5, 0.8);
  });
  for (const s of [-1, 1]) {
    const p = arm(s);
    p(ctx);
    ctx.fillStyle = airMix(s < 0 ? BASALT.lit : BASALT.shade, d, AIR);
    ctx.fill();
    within(ctx, p, () => {
      const [ax0, ay0] = Q(s * hw * 0.82, seatY + 0.5);
      surface(ctx, r, { x: Math.min(ax0, ax0 + s * 0.34 * k) - 2, y: ay0, w: 0.4 * k, h: 1.2 * k }, airMix(s < 0 ? BASALT.lit : BASALT.shade, d, AIR), { over: true, vary: 0.3, cells: 2, grain: 0.3, grainKind: 'stone', seed: 65 + s });
    });
    ctx.strokeStyle = rgba(INK, 0.85);
    ctx.lineWidth = 1.4;
    p(ctx);
    ctx.stroke();
    // a ball of ice on the arm's end, lit top left
    const [ox, oy] = Q(s * hw * 0.99, seatY + 0.58);
    const or = 0.13 * k;
    const og = ctx.createRadialGradient(ox - or * 0.4, oy - or * 0.4, 0, ox, oy, or);
    og.addColorStop(0, '#e8f6ff');
    og.addColorStop(0.45, '#6aa8e0');
    og.addColorStop(1, '#14346a');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(ox, oy, or, 0, P2);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 1.6;
  block(ctx);
  ctx.stroke();
  // the white bear's pelt thrown over the seat and down its front: thick fur, lit on top, its paws hanging
  const pelt: PathFn = (c) => {
    const [ax, ay] = Q(-hw * 0.78, seatY + 0.04);
    const [bx, by] = Q(hw * 0.6, seatY + 0.02);
    const fy = by + 0.3 * k;
    c.beginPath();
    c.moveTo(ax, ay);
    c.quadraticCurveTo((ax + bx) / 2, ay - 0.08 * k, bx, by);
    c.lineTo(bx + 0.04 * k, fy - 0.1 * k);
    // the hem in soft tufts, a paw hanging lower on the left
    const nT = 7;
    let px0 = bx + 0.04 * k;
    for (let i = 1; i <= nT; i++) {
      const px1 = lerp(bx + 0.04 * k, ax - 0.02 * k, i / nT);
      const drop = i === 5 ? 0.14 * k : (i % 2 ? 0.02 : 0.04) * k;
      c.quadraticCurveTo((px0 + px1) / 2, fy + drop + 0.05 * k, px1, fy + (i === 5 ? 0.06 * k : 0));
      px0 = px1;
    }
    c.closePath();
  };
  pelt(ctx);
  ctx.fillStyle = airMix('#c8ccd8', d, AIR);
  ctx.fill();
  within(ctx, pelt, () => {
    const [px0, py0] = Q(-hw, seatY + 0.2);
    vfill(ctx, px0, py0, hw * 2 * k, 0.8 * k, [[0, airMix('#f2f4fa', d, AIR)], [0.4, airMix('#b8bccc', d, AIR)], [1, airMix('#5a6078', d, AIR)]]);
    const rr = rng(hashStr('th:pelt'));
    for (let i = 0; i < 90; i++) {
      const fx = px0 + rr() * hw * 2 * k;
      const fy = py0 + rr() * 0.8 * k;
      ctx.strokeStyle = rgba(rr() < 0.5 ? '#ffffff' : '#4a4e60', 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + (rr() - 0.5) * 3, fy + 4 + rr() * 6);
      ctx.stroke();
    }
  });
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 1.4;
  pelt(ctx);
  ctx.stroke();
}

// ——— the posts ———

/** A post's screen half-width and x. */
const postAt = (X: number, z: number) => ({ x: sx(X, z), hw: (0.15 * F) / z });

/** One timber post: a whole trunk, adzed round, carved bands of gripping beasts, iron bands, its lower part grown
 * into a sleeve of glacier ice. From y0 (top of the picture or its beam) to its foot on the floor. */
function post(ctx: Ctx, r: R, X: number, z: number, y0: number, hwK = 1, iced = true): void {
  const { x } = postAt(X, z);
  const hw = postAt(X, z).hw * hwK;
  const foot = sy(0, z);
  const d = dep(z);
  const k = F / z;
  const path = polyPath([[x - hw * 1.02, y0], [x + hw * 1.02, y0], [x + hw * 1.05, foot], [x - hw * 1.05, foot]]);
  const box = { x: x - hw * 1.1, y: y0, w: hw * 2.2, h: foot - y0 };
  path(ctx);
  ctx.fillStyle = airMix(WOOD.body, d, AIR);
  ctx.fill();
  within(ctx, path, () => {
    // the trunk's grain, vertical, adze-faceted
    surface(ctx, r, box, airMix(WOOD.body, d, AIR), { over: true, vary: 0.3, cells: 3, mottle: 0.3, strokes: 1.4, strokeAng: Math.PI / 2, strokeLen: 160, strokeW: Math.max(2, hw * 0.12), grain: 0.25, grainKind: 'wood', seed: 71 + Math.round(z * 10) });
    // round: lit from the left (the moon, and the hearth), the cool rim on the right
    const cg = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
    cg.addColorStop(0, 'rgba(10,8,14,0.4)');
    cg.addColorStop(0.18, 'rgba(170,180,210,0.16)');
    cg.addColorStop(0.42, 'rgba(0,0,0,0)');
    cg.addColorStop(0.8, 'rgba(4,4,14,0.45)');
    cg.addColorStop(0.94, 'rgba(4,4,14,0.6)');
    cg.addColorStop(1, 'rgba(90,130,200,0.25)');
    ctx.fillStyle = cg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    // the adze's facets running down it: each a flat with a lit edge on its left, a dark one on its right, crowding
    // together round the sides
    const nf = 9;
    for (let i = 1; i < nf; i++) {
      const a = -Math.PI / 2 + (i / nf) * Math.PI + (r() - 0.5) * 0.08;
      const fx = x + Math.sin(a) * hw;
      const lit = Math.max(0, -Math.sin(a + 0.4));
      ctx.strokeStyle = rgba('#cfc8d4', (0.05 + lit * 0.1) * (1 - d));
      ctx.lineWidth = Math.max(1, hw * 0.025);
      ctx.beginPath();
      ctx.moveTo(fx, y0);
      ctx.lineTo(fx + (r() - 0.5) * hw * 0.04, foot);
      ctx.stroke();
      ctx.strokeStyle = rgba('#06040a', 0.18 * (1 - d * 0.5));
      ctx.beginPath();
      ctx.moveTo(fx + Math.max(1, hw * 0.03), y0);
      ctx.lineTo(fx + Math.max(1, hw * 0.03) + (r() - 0.5) * hw * 0.04, foot);
      ctx.stroke();
    }
    // hoarfrost on its moonlit (left) side: a feathered crust, thick in patches
    const [fc, fg] = makeCanvas(Math.max(4, Math.ceil(hw * 0.5)), Math.ceil(Math.min(TY, foot) - y0) + 2);
    lay(fg, noiseMask(5, 141 + Math.round(z * 10), { kind: 'web', cover: 0.55, soft: 0.1, col: '#eef6ff', w: 40, h: 160 }), { x: 0, y: 0, w: fc.width, h: fc.height }, 1);
    fg.globalCompositeOperation = 'destination-in';
    const fgr = fg.createLinearGradient(0, 0, fc.width, 0);
    fgr.addColorStop(0, 'rgba(0,0,0,0.32)');
    fgr.addColorStop(1, 'rgba(0,0,0,0)');
    fg.fillStyle = fgr;
    fg.fillRect(0, 0, fc.width, fc.height);
    ctx.globalAlpha = 1 - d * 0.6;
    ctx.drawImage(fc, x - hw * 1.02, y0);
    ctx.globalAlpha = 1;
    // checks (long drying cracks) down the trunk
    for (let i = 0; i < 3; i++) {
      const cx = x - hw * 0.5 + r() * hw;
      ctx.strokeStyle = rgba('#080406', 0.55);
      ctx.lineWidth = Math.max(1, hw * 0.03);
      ctx.beginPath();
      let yy = y0 + r() * (foot - y0) * 0.5;
      ctx.moveTo(cx, yy);
      for (let j = 0; j < 6; j++) {
        yy += (foot - y0) * 0.06;
        ctx.lineTo(cx + (r() - 0.5) * hw * 0.06, yy);
      }
      ctx.stroke();
    }
    // the carved bands: gripping beasts in a ribbon of interlace, cut in, the cuts holding a thread of cold inlay
    const bandAt = (Yb: number, hb: number) => {
      const yb = sy(Yb, z);
      const h = hb * k;
      if (yb + h < y0 || yb > foot) return;
      interlace(ctx, x, hw, yb, h, d, Math.round(X * 7 + z * 13));
    };
    bandAt(2.45, 0.42);
    bandAt(1.55, 0.3);
    // iron bands with rivets
    for (const Yi of [2.95, 2.0]) {
      const yi = sy(Yi, z);
      const h = 0.05 * k;
      if (yi + h < y0 || yi > foot) continue;
      ctx.fillStyle = airMix('#1a1c26', d, AIR);
      ctx.fillRect(x - hw * 1.05, yi, hw * 2.1, h);
      ctx.fillStyle = rgba('#8a96b8', 0.35 * (1 - d));
      ctx.fillRect(x - hw * 1.05, yi, hw * 2.1, Math.max(1, h * 0.18));
      for (let i = -3; i <= 3; i++) {
        const u = i / 3.6;
        const rx = x + Math.sin(u * Math.PI / 2) * hw;
        ctx.fillStyle = rgba('#9aa4c4', 0.5 * (1 - d) * (1 - Math.abs(u)));
        ctx.beginPath();
        ctx.arc(rx, yi + h / 2, Math.max(0.8, h * 0.18), 0, P2);
        ctx.fill();
      }
    }
  });
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = Math.max(1.2, 3 - d * 2);
  path(ctx);
  ctx.stroke();
  // the ice sleeve: grown up the post from the floor, clear and blue, the timber dark through it, a rimed lip with
  // icicles hanging from it
  if (iced) sleeve(ctx, x, hw, z, foot, d);
}

/** A ribbon of interlace (the Urnes beasts' bodies, looping over and under) wrapped round a post. */
function interlace(ctx: Ctx, x: number, hw: number, y: number, h: number, d: number, seed: number): void {
  const rr = rng(hashStr('th:interlace' + seed));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - hw * 1.1, y, hw * 2.2, h);
  ctx.clip();
  // the band's ground cut back (darker), its edges raised
  ctx.fillStyle = rgba('#0a0608', 0.35);
  ctx.fillRect(x - hw * 1.1, y, hw * 2.2, h);
  ctx.fillStyle = rgba('#a0a0b8', 0.12 * (1 - d));
  ctx.fillRect(x - hw * 1.1, y, hw * 2.2, Math.max(1, h * 0.06));
  // two ribbons twisting round each other, round the trunk (x = x + sin(angle) · hw), over and under in turn
  const wrap = (a: number) => x + Math.sin(a) * hw;
  const lw = Math.max(1.4, Math.min(11, h * 0.11));
  const ph = rr() * P2;
  const N = 90;
  const strand = (sgn: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI / 2 - 0.1 + (i / N) * (Math.PI + 0.2);
      pts.push([wrap(a), y + h * (0.5 + sgn * 0.3 * Math.sin(a * 5 + ph))]);
    }
    return pts;
  };
  const A = strand(1);
  const B = strand(-1);
  const run = (pts: Pt[], i0: number, i1: number) => {
    const draw = (dx: number, dy: number, col: string, w: number) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let i = Math.max(0, i0); i <= Math.min(N, i1); i++) {
        const [px, py] = pts[i];
        if (i === Math.max(0, i0)) ctx.moveTo(px + dx, py + dy);
        else ctx.lineTo(px + dx, py + dy);
      }
      ctx.stroke();
    };
    // the cut's shadow, the ribbon's raised face, its lit upper edge, a thread of cold inlay down its middle
    draw(lw * 0.3, lw * 0.4, rgba('#050304', 0.5), lw * 1.45);
    draw(0, 0, airMix('#4a3e3a', d, AIR), lw);
    draw(-lw * 0.18, -lw * 0.22, rgba('#c0b8c0', 0.32 * (1 - d)), lw * 0.3);
    draw(0, 0, rgba(RUNE, 0.2 * (1 - d * 0.5)), lw * 0.16);
  };
  run(B, 0, N);
  run(A, 0, N);
  // where B passes over A, lay B's piece back on top
  let over = rr() < 0.5;
  for (let i = 1; i <= N; i++) {
    const s0 = A[i - 1][1] - B[i - 1][1];
    const s1 = A[i][1] - B[i][1];
    if (s0 * s1 > 0) continue;
    if (over) run(B, i - 4, i + 4);
    over = !over;
  }
  // the band's edges: a raised fillet top and bottom
  for (const yy of [y + lw * 0.5, y + h - lw * 0.5]) {
    ctx.strokeStyle = rgba('#050304', 0.6);
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.moveTo(x - hw * 1.1, yy + lw * 0.3);
    ctx.lineTo(x + hw * 1.1, yy + lw * 0.3);
    ctx.stroke();
    ctx.strokeStyle = airMix('#5e4e48', d, AIR);
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(x - hw * 1.1, yy);
    ctx.lineTo(x + hw * 1.1, yy);
    ctx.stroke();
  }
  // shading round the trunk over the carving
  const cg = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
  cg.addColorStop(0, 'rgba(6,4,10,0.35)');
  cg.addColorStop(0.3, 'rgba(0,0,0,0)');
  cg.addColorStop(0.75, 'rgba(4,4,14,0.35)');
  cg.addColorStop(1, 'rgba(4,4,14,0.55)');
  ctx.fillStyle = cg;
  ctx.fillRect(x - hw * 1.1, y, hw * 2.2, h);
  ctx.restore();
}

/** The ice on a post: meltwater that ran down the trunk and froze, in fluted strands, each starting at its own height
 * in a rounded tip, swelling into drip ledges, fusing low down into a sheath that flares out over the slabs; clear and
 * blue, the timber dark through it, lit down the left, rimed on the ledges. */
function sleeve(ctx: Ctx, x: number, hw: number, z: number, foot: number, d: number): void {
  const k = F / z;
  const rr = rng(hashStr('th:sleeve' + Math.round(x)));
  // contact: its foot sits in the slabs' rime, its shadow down and right
  softly(ctx, { x: x - hw * 3, y: foot - 24, w: hw * 7, h: 48 }, (g) => {
    g.fillStyle = rgba('#010208', 0.5);
    g.beginPath();
    g.ellipse(x + hw * 0.7, foot + 2, hw * 2.2, 0.04 * k + 3, 0, 0, P2);
    g.fill();
  }, 0.5);
  const strands: { u: number; top: number; w: number; ph: number }[] = [];
  const n = 4;
  for (let i = 0; i < n; i++) strands.push({ u: -1 + (i + 0.5 + (rr() - 0.5) * 0.5) * (2 / n), top: sy(0.4 + rr() * 0.75, z), w: hw * (0.3 + rr() * 0.12), ph: rr() * P2 });
  // the sheath low down where the strands have fused, flaring at the foot
  const fuse = sy(0.32 + rr() * 0.1, z);
  const flare = hw * 1.5;
  const sheath: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - flare, foot + 1);
    c.quadraticCurveTo(x - hw * 1.08, foot - 0.08 * k, x - hw * 1.06, fuse + 0.04 * k);
    c.quadraticCurveTo(x, fuse - 0.05 * k, x + hw * 1.06, fuse + 0.06 * k);
    c.quadraticCurveTo(x + hw * 1.08, foot - 0.08 * k, x + flare, foot + 1);
    c.closePath();
  };
  const strandPath = (s: (typeof strands)[number]): PathFn => (c) => {
    const cx = x + s.u * hw * 0.92;
    const steps = 14;
    const L: Pt[] = [];
    const Rr: Pt[] = [];
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const yy = lerp(s.top, foot - 0.1 * k, t);
      // tapering to a rounded tip, swelling at the drip ledges
      const ledge = 1 + 0.35 * Math.max(0, Math.sin(t * 9 + s.ph)) ** 6;
      const ww = s.w * (0.35 + 0.65 * Math.sqrt(t)) * ledge;
      const wob = Math.sin(t * 5 + s.ph) * s.w * 0.12;
      L.push([cx - ww + wob, yy]);
      Rr.push([cx + ww + wob, yy]);
    }
    c.beginPath();
    c.moveTo(L[0][0], L[0][1]);
    c.quadraticCurveTo(cx, s.top - s.w * 0.6, Rr[0][0], Rr[0][1]);
    for (const p of Rr) c.lineTo(...p);
    for (let j = L.length - 1; j >= 0; j--) c.lineTo(...L[j]);
    c.closePath();
  };
  const body = () => {
    const yTop = Math.min(...strands.map((s) => s.top)) - 10;
    const g = ctx.createLinearGradient(x - flare, 0, x + flare, 0);
    g.addColorStop(0, rgba('#b8dcfa', 0.4 * (1 - d * 0.5)));
    g.addColorStop(0.25, rgba('#5a96d8', 0.18));
    g.addColorStop(0.55, rgba('#0e2654', 0.08));
    g.addColorStop(0.85, rgba('#04102e', 0.25));
    g.addColorStop(1, rgba('#6a9ad8', 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(x - flare, yTop, flare * 2, foot - yTop + 2);
    vfill(ctx, x - flare, yTop, flare * 2, foot - yTop + 2, [[0, 'rgba(40,90,160,0)'], [1, rgba('#2a62a8', 0.3)]]);
  };
  // each strand a rounded rod of ice: lit along its left, its own shadow on the right
  for (const s of strands) {
    const p = strandPath(s);
    castShadow(ctx, p, 3, 3, 0.3, '#02040c');
    p(ctx);
    ctx.fillStyle = rgba(airMix('#2a5a98', d, AIR), 0.16);
    ctx.fill();
    within(ctx, p, () => {
      body();
      const cx = x + s.u * hw * 0.92;
      const sg = ctx.createLinearGradient(cx - s.w, 0, cx + s.w, 0);
      sg.addColorStop(0, rgba('#e8f4ff', 0.45 * (1 - d * 0.5)));
      sg.addColorStop(0.35, rgba('#e8f4ff', 0));
      sg.addColorStop(0.75, rgba('#020818', 0.25));
      sg.addColorStop(1, rgba('#020818', 0.35));
      ctx.fillStyle = sg;
      ctx.fillRect(cx - s.w * 1.5, s.top - 10, s.w * 3, foot - s.top + 10);
    });
  }
  sheath(ctx);
  ctx.fillStyle = rgba(airMix('#2a5a98', d, AIR), 0.4);
  ctx.fill();
  within(ctx, sheath, () => {
    body();
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = rgba('#e8f4ff', 0.3 * (1 - d));
      ctx.beginPath();
      ctx.arc(x - hw + rr() * hw * 2, lerp(fuse, foot, rr()), 0.6 + rr() * 0.01 * k, 0, P2);
      ctx.fill();
    }
  });
  // rime on the sheath's top and the strands' tips, an ink edge round it all
  ctx.strokeStyle = rgba(ICE.rime, 0.55 * (1 - d * 0.5));
  ctx.lineWidth = Math.max(1.2, 0.016 * k);
  for (const s of strands) {
    const cx = x + s.u * hw * 0.92;
    ctx.beginPath();
    ctx.arc(cx, s.top + s.w * 0.2, s.w * 0.3, Math.PI * 1.1, Math.PI * 1.7);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(INK, 0.45);
  ctx.lineWidth = Math.max(0.8, 1.4 - d);
  for (const p of [sheath, ...strands.map(strandPath)]) {
    p(ctx);
    ctx.stroke();
  }
}

/** A tie beam across the nave at depth z (front face and underside), icicles hanging from it. */
function tieBeam(ctx: Ctx, r: R, z: number): void {
  const d = dep(z);
  const k = F / z;
  const Y = TH.tieY;
  const h = 0.24;
  const X0 = -TH.wallX;
  const X1 = TH.wallX;
  const face = polyPath([P(X0, Y, z), P(X1, Y, z), P(X1, Y - h, z), P(X0, Y - h, z)]);
  const under = polyPath([P(X0, Y - h, z), P(X1, Y - h, z), P(X1, Y - h, z + 0.16), P(X0, Y - h, z + 0.16)]);
  under(ctx);
  ctx.fillStyle = airMix(WOOD.deep, d, AIR);
  ctx.fill();
  face(ctx);
  ctx.fillStyle = airMix(WOOD.body, d, AIR);
  ctx.fill();
  const [fx0, fy0] = P(X0, Y, z);
  const [fx1, fy1] = P(X1, Y - h, z);
  within(ctx, face, () => {
    surface(ctx, r, { x: fx0, y: fy0, w: fx1 - fx0, h: fy1 - fy0 }, airMix(WOOD.body, d, AIR), { over: true, vary: 0.3, cells: 6, mottle: 0.3, strokes: 2, strokeAng: 0, strokeLen: 200, strokeW: 2, grain: 0.25, grainKind: 'wood', seed: 81 + Math.round(z * 10) });
    // a frieze of runes along it, between two cut lines
    const fh = fy1 - fy0;
    ctx.strokeStyle = rgba('#050304', 0.6);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(fx0 - 2, fy0 + fh * 0.18, fx1 - fx0 + 4, fh * 0.64);
    for (let x = sx(-TH.postX, z) + 30, i = 0; x < sx(TH.postX, z) - 30; x += fh * 0.75, i++) carvedRune(ctx, i * 3 + 1, x, fy0 + fh * 0.24, fh * 0.52, 0.5, 0.9);
    // the moon on its top edge, the underside's shadow
    vfill(ctx, fx0, fy0, fx1 - fx0, fh, [[0, 'rgba(170,190,230,0.2)'], [0.2, 'rgba(0,0,0,0)'], [0.75, 'rgba(0,0,0,0)'], [1, 'rgba(2,2,10,0.45)']]);
  });
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = Math.max(1.2, 2.6 - d * 1.6);
  face(ctx);
  ctx.stroke();
  // frost on its top, snow lying where the rift's snow has fallen on it
  ctx.fillStyle = rgba(ICE.rime, 0.55 * (1 - d * 0.5));
  ctx.fillRect(fx0, fy0 - 2, fx1 - fx0, 2.5);
  // icicles, longer towards the ends (calm over the middle, where the boss's bar sits)
  const rr = rng(hashStr('th:tieIcicles' + z));
  for (let x = fx0 + 6; x < fx1 - 6; x += 5 + rr() * 9) {
    const mid = Math.exp(-(((x - 960) / 330) ** 2));
    if (rr() < 0.3 + mid * 0.5) continue;
    const len = (0.04 + rr() * 0.22 * (1 - mid * 0.7)) * k;
    icicle(ctx, x, fy1 - 1, len, Math.max(2, (0.02 + rr() * 0.02) * k), 0.9 - d * 0.4);
  }
  void r;
}

/** The knee braces from a post up to its tie beam. */
function braces(ctx: Ctx, X: number, z: number): void {
  const d = dep(z);
  const Y = TH.tieY - 0.24;
  for (const s of [-1, 1]) {
    const a = P(X + s * 0.1, Y - 0.75, z);
    const b = P(X + s * 0.75, Y, z);
    const w = (0.07 * F) / z;
    const path = polyPath([[a[0], a[1] - w], [b[0] - s * w * 1.4, b[1]], [b[0], b[1]], [a[0], a[1] + w * 0.6]]);
    path(ctx);
    ctx.fillStyle = airMix(s < 0 ? WOOD.lit : WOOD.shade, d, AIR);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = Math.max(1, 2 - d);
    ctx.stroke();
  }
}

// ——— the ice windows ———

/** A window's opening in a side wall: its quad (and pointed head) in screen space. */
function windowPts(side: number, z0: number, z1: number, inset = 0): Pt[] {
  const pts: Pt[] = [];
  const zi0 = z0 + inset;
  const zi1 = z1 - inset;
  pts.push(onWall(side, TH.sill + inset, zi0));
  pts.push(onWall(side, TH.spring, zi0));
  const n = 8;
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const z = lerp(zi0, zi1, u);
    const Y = TH.spring + (TH.head - inset - TH.spring) * Math.sin(u * Math.PI) ** 0.7;
    pts.push(onWall(side, Y, z));
  }
  pts.push(onWall(side, TH.spring, zi1));
  pts.push(onWall(side, TH.sill + inset, zi1));
  return pts;
}

function windows(ctx: Ctx, r: R, side: -1 | 1): void {
  for (const [z0, z1] of TH.windows) {
    const d = dep((z0 + z1) / 2);
    const outer = polyPath(windowPts(side, z0, z1));
    const glass = polyPath(windowPts(side, z0, z1, 0.06));
    // the reveal (the wall's thickness), lit on its far side by the glass
    outer(ctx);
    ctx.fillStyle = airMix('#1a3462', d, AIR);
    ctx.fill();
    // the glass: a slab of clear glacier ice, the night beyond it dark blue, refracted and bubbled
    glass(ctx);
    ctx.fillStyle = airMix('#0c2250', d * 0.6, AIR);
    ctx.fill();
    within(ctx, glass, () => {
      const [gx0, gy0] = onWall(side, TH.head, z0);
      const [gx1, gy1] = onWall(side, TH.sill, z1);
      const box = { x: Math.min(gx0, gx1) - 4, y: Math.min(gy0, gy1) - 30, w: Math.abs(gx1 - gx0) + 8, h: Math.abs(gy1 - gy0) + 60 };
      vfill(ctx, box.x, box.y, box.w, box.h, [[0, '#0a1a44'], [0.6, '#14306a'], [1, '#2a4a80']]);
      // the far range dark against the sky low in the glass, bent by the ice
      ctx.fillStyle = rgba('#060e26', 0.7);
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + box.h);
      for (let i = 0; i <= 12; i++) ctx.lineTo(box.x + (i / 12) * box.w, box.y + box.h * (0.78 - 0.08 * Math.abs(Math.sin(i * 1.7 + side))));
      ctx.lineTo(box.x + box.w, box.y + box.h);
      ctx.fill();
      // the ice's own body: streaks, bubbles, a frosted rim creeping in from the edges
      lay(ctx, noiseMask(6, 97 + side, { cover: 0.45, soft: 0.35, col: '#9cc4f0', w: 60, h: 120 }), box, 0.16);
      for (let i = 0; i < 16; i++) {
        ctx.strokeStyle = rgba('#cfe4ff', 0.12 + r() * 0.12);
        ctx.lineWidth = 1;
        const x = box.x + r() * box.w;
        ctx.beginPath();
        ctx.moveTo(x, box.y + r() * box.h);
        ctx.lineTo(x + (r() - 0.5) * 8, box.y + r() * box.h);
        ctx.stroke();
      }
    });
    // frost thick round the glass's edge
    ctx.save();
    glass(ctx);
    ctx.clip();
    ctx.strokeStyle = rgba(ICE.rime, 0.3);
    ctx.lineWidth = 10;
    glass(ctx);
    ctx.stroke();
    ctx.restore();
    // a timber mullion and transom, frosted
    const m0 = onWall(side, TH.sill, (z0 + z1) / 2);
    const m1 = onWall(side, TH.head, (z0 + z1) / 2);
    const t0 = onWall(side, (TH.sill + TH.spring) / 2 + 0.3, z0);
    const t1 = onWall(side, (TH.sill + TH.spring) / 2 + 0.3, z1);
    for (const [a, b] of [[m0, m1], [t0, t1]] as const) {
      ctx.strokeStyle = airMix(WOOD.shade, d, AIR);
      ctx.lineWidth = Math.max(2, 7 - d * 4);
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
      ctx.strokeStyle = rgba(ICE.rime, 0.4);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(a[0] - side * 2, a[1]);
      ctx.lineTo(b[0] - side * 2, b[1]);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = Math.max(1.2, 2.4 - d);
    outer(ctx);
    ctx.stroke();
    // the sill: snow on it
    const s0 = onWall(side, TH.sill, z0);
    const s1 = onWall(side, TH.sill, z1);
    ctx.strokeStyle = rgba('#b8cce8', 0.7);
    ctx.lineWidth = Math.max(2, 6 - d * 3);
    ctx.beginPath();
    ctx.moveTo(...s0);
    ctx.lineTo(...s1);
    ctx.stroke();
  }
}

/** The aurora beyond a window (ph 0…1): curtains folding, seen through a slab of ice (soft, its light diffused through
 * the whole pane), added through the glass and cut to the panes. Drawn in screen space. */
function windowAurora(ctx: Ctx, side: -1 | 1, ph: number, a = 1): void {
  const col = auroraColumn();
  const T = ph * P2;
  const K = 1 / 3;
  for (const [wi, [z0, z1]] of TH.windows.entries()) {
    const pts = windowPts(side, z0, z1, 0.06);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const bx = Math.floor(Math.min(...xs)) - 6;
    const by = Math.floor(Math.min(...ys)) - 6;
    const bw = Math.ceil(Math.max(...xs)) + 6 - bx;
    const bh = Math.ceil(Math.max(...ys)) + 6 - by;
    const [c, g] = makeCanvas(Math.ceil(bw * K), Math.ceil(bh * K));
    g.scale(K, K);
    g.translate(-bx, -by);
    g.globalCompositeOperation = 'lighter';
    // the aurora's light diffused through the whole slab
    const dg = g.createLinearGradient(0, by, 0, by + bh);
    dg.addColorStop(0, rgba('#6a5aff', 0.1 * a));
    dg.addColorStop(0.6, rgba('#2affb0', 0.14 * a));
    dg.addColorStop(1, rgba('#2affb0', 0.04 * a));
    g.fillStyle = dg;
    g.fillRect(bx, by, bw, bh);
    // the curtains: their lower edge waving across the glass, rays running through them (softened by the slab, as the
    // whole is painted small and drawn up)
    for (let x = bx - 6; x < bx + bw + 6; x += 3) {
      const u = (x - bx) / bw;
      const base = by + bh * (0.5 + 0.12 * Math.sin(u * 4 + T + side + wi) + 0.05 * Math.sin(u * 11 - T * 2));
      const ray = 0.4 + 0.6 * Math.max(0, Math.sin(x / 6 + T * 3 + wi) * 0.6 + Math.sin(x / 15 - T * 2) * 0.5);
      const L = bh * (0.42 + 0.16 * Math.sin(u * 6 + T + wi));
      g.globalAlpha = clamp01(0.5 * ray * a);
      g.drawImage(col, x - 2, base - L, 6, L + 10);
    }
    ctx.save();
    polyPath(pts)(ctx);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(c, bx, by, bw, bh);
    ctx.restore();
  }
}

// ——— the hearths ———

/** A hearth: a hexagonal basalt column from the giants' causeway (the faces turned to us, each lit by how it faces
 * the moon), a cross-joint where it split, a band of runes, a capstone, a granite bowl of cold fire on top. */
function hearth(ctx: Ctx, r: R, i: number): void {
  const h = HEARTHS[i];
  const z = TH.hearth.z;
  const k = F / z;
  const d = dep(z);
  const X = h.dir * TH.hearth.X;
  const rad = TH.hearth.r;
  const topY = TH.hearth.Y - 0.14;
  const capY = TH.hearth.Y - 0.06;
  const corner = (a: number, Y: number, rk = 1): Pt => P(X + Math.cos(a) * rad * rk, Y, z + Math.sin(a) * rad * rk);
  const angs = Array.from({ length: 7 }, (_, j) => Math.PI / 6 + (j / 6) * P2);
  // the faces we see: their corners run left to right on the screen
  const seen = (j: number, rk = 1) => corner(angs[j], topY, rk)[0] < corner(angs[j + 1], topY, rk)[0] - 0.5;
  const L: [number, number] = [-0.74, -0.67];
  const toneOf = (j: number) => {
    const m = (angs[j] + angs[j + 1]) / 2;
    const lit = Math.max(0, Math.cos(m) * L[0] + Math.sin(m) * L[1]);
    return mix(BASALT.deep, BASALT.lit, 0.15 + lit * 0.85);
  };
  const face = (j: number, y0: number, y1: number, rk = 1) => polyPath([corner(angs[j], y0, rk), corner(angs[j], y1, rk), corner(angs[j + 1], y1, rk), corner(angs[j + 1], y0, rk)]);
  const vis = [0, 1, 2, 3, 4, 5].filter((j) => seen(j));
  const outline: PathFn = (c) => {
    c.beginPath();
    for (const j of vis) for (const p of [corner(angs[j], -1.2), corner(angs[j], topY), corner(angs[j + 1], topY), corner(angs[j + 1], -1.2)]) c.lineTo(...p);
    c.closePath();
  };
  castShadow(ctx, outline, 18, 22, 0.45, '#02040c');
  for (const j of vis) {
    const f = face(j, -1.2, topY);
    const tone = airMix(toneOf(j), d, AIR);
    f(ctx);
    ctx.fillStyle = tone;
    ctx.fill();
    within(ctx, f, () => {
      const [fx0, fy0] = corner(angs[j], topY);
      const [fx1] = corner(angs[j + 1], topY);
      const fb = { x: Math.min(fx0, fx1) - 2, y: fy0 - 10, w: Math.abs(fx1 - fx0) + 4, h: TY + 40 - fy0 };
      surface(ctx, r, fb, tone, { over: true, vary: 0.25, cells: 3, mottle: 0.4, strokes: 0.6, strokeAng: Math.PI / 2, strokeLen: 60, strokeW: 3, grain: 0.35, grainKind: 'stone', seed: 91 + j });
      // the column's cross-joint: a dark crack with a lit lip under it, a chip out of the arris
      const [ja, jay] = corner(angs[j], topY - 0.62);
      const [jb, jby] = corner(angs[j + 1], topY - 0.6);
      ctx.strokeStyle = rgba('#020308', 0.75);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ja, jay);
      ctx.quadraticCurveTo((ja + jb) / 2, (jay + jby) / 2 + 3, jb, jby);
      ctx.stroke();
      ctx.strokeStyle = rgba('#a8b4d4', 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ja, jay + 2.5);
      ctx.quadraticCurveTo((ja + jb) / 2, (jay + jby) / 2 + 5.5, jb, jby + 2.5);
      ctx.stroke();
      // a band of runes under the capstone, the cut holding the fire's cold light
      const [bx0, by0] = corner(angs[j], topY - 0.06);
      const [bx1, by1] = corner(angs[j + 1], topY - 0.06);
      const n = Math.max(1, Math.round(Math.abs(bx1 - bx0) / (0.13 * k)));
      for (let q = 0; q < n; q++) {
        const u = (q + 0.25) / n;
        carvedRune(ctx, i * 7 + j * 3 + q, lerp(bx0, bx1, u), lerp(by0, by1, u), 0.15 * k, 0.75);
      }
      // the fire's light falling on it from above, frost in its lower reaches
      vfill(ctx, fb.x, fy0, fb.w, 0.6 * k, [[0, rgba(FIRE, 0.22)], [1, rgba(FIRE, 0)]]);
    });
  }
  // the arrises between the faces we see: lit where the lighter face meets the darker
  for (const j of vis.slice(1)) {
    const [ax, ay] = corner(angs[j], topY);
    const [bx, by] = corner(angs[j], -1.2);
    ctx.strokeStyle = rgba('#b8c4e4', 0.35);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(ax - 1, ay);
    ctx.lineTo(bx - 1, by);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 2.2;
  outline(ctx);
  ctx.stroke();
  // the capstone: a slab a little wider, its top seen from just above, rimed
  const capVis = [0, 1, 2, 3, 4, 5].filter((j) => seen(j, 1.12));
  for (const j of capVis) {
    const f = face(j, topY, capY, 1.12);
    f(ctx);
    ctx.fillStyle = airMix(toneOf(j), d, AIR);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 1.4;
    f(ctx);
    ctx.stroke();
  }
  const capTop = polyPath(angs.slice(0, 6).map((a) => corner(a, capY, 1.12)));
  capTop(ctx);
  ctx.fillStyle = airMix('#8a94b4', d, AIR);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // the bowl on it
  bowl(ctx, r, h.x, h.rim, h.r, d);
}

/** The granite bowl on a hearth: its outside, the rim seen from a little above, the bed of glowing ice in it. */
function bowl(ctx: Ctx, r: R, x: number, rim: number, rad: number, d: number): void {
  const ry = rad * 0.22;
  const bw = rad * 1.35;
  const depth = rad * 0.62;
  const outside = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - bw, rim);
    c.bezierCurveTo(x - bw, rim + depth * 0.9, x - bw * 0.55, rim + depth, x, rim + depth);
    c.bezierCurveTo(x + bw * 0.55, rim + depth, x + bw, rim + depth * 0.9, x + bw, rim);
    c.ellipse(x, rim, bw, ry, 0, 0, Math.PI);
    c.closePath();
  };
  outside(ctx);
  const g = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
  g.addColorStop(0, airMix('#6a7290', d, AIR));
  g.addColorStop(0.35, airMix('#40465e', d, AIR));
  g.addColorStop(1, airMix('#141826', d, AIR));
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, outside, () => {
    // speckled granite; the fire's light on the rim's underside
    const rr = rng(hashStr('th:bowl' + Math.round(x)));
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = rgba(rr() < 0.5 ? '#c8ccd8' : '#05060c', 0.25);
      ctx.fillRect(x - bw + rr() * bw * 2, rim + rr() * depth, 1.4, 1.4);
    }
    // a carved chevron band
    ctx.strokeStyle = rgba('#05060c', 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let q = 0; q <= 16; q++) {
      const u = q / 16;
      const px = x - bw * 0.95 + u * bw * 1.9;
      ctx.lineTo(px, rim + depth * (q % 2 ? 0.35 : 0.5));
    }
    ctx.stroke();
  });
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 2;
  outside(ctx);
  ctx.stroke();
  // a band of beaten gold round the bowl under its lip (the king's riches; the one warm thing by the fire)
  ctx.save();
  outside(ctx);
  ctx.clip();
  const gy = rim + depth * 0.16;
  const gg = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
  gg.addColorStop(0, '#fff0b0');
  gg.addColorStop(0.3, '#d8a440');
  gg.addColorStop(0.75, '#7a4a12');
  gg.addColorStop(1, '#3a2208');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.ellipse(x, gy, bw, ry * 1.1, 0, 0, Math.PI);
  ctx.ellipse(x, gy + depth * 0.14, bw * 0.98, ry * 1.1, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // the rim's top and the bed inside: blue-white chunks of glowing ice
  ctx.beginPath();
  ctx.ellipse(x, rim, bw, ry, 0, 0, P2);
  ctx.fillStyle = airMix('#7a849e', d, AIR);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, rim + 1, bw * 0.86, ry * 0.7, 0, 0, P2);
  const bg = ctx.createRadialGradient(x, rim + 1, 0, x, rim + 1, bw * 0.86);
  bg.addColorStop(0, '#f0fcff');
  bg.addColorStop(0.4, '#8ae4ff');
  bg.addColorStop(1, '#1a4a8a');
  ctx.fillStyle = bg;
  ctx.save();
  ctx.translate(x, rim + 1);
  ctx.scale(1, (ry * 0.7) / (bw * 0.86));
  ctx.translate(-x, -(rim + 1));
  ctx.fill();
  ctx.restore();
  void r;
}

/** The cold fire at phase ph (0…1 loops), w×h, its bed along the bottom middle: tongues of pale blue light licking up,
 * thin and sharp, a white core, deep blue at the skin, a loose tongue torn off the top. Painted on its own canvas and
 * added. */
export const FIRE_W = 150;
export const FIRE_H = 210;
function coldFire(out: Ctx, w: number, h: number, ph: number, seed = 1): void {
  const [oc, c] = makeCanvas(w, h);
  const n = 7;
  const by = h - 8;
  const cx = w / 2;
  const span = w * 0.56;
  const p = ph * P2;
  const tongues: [number, number, number, number][] = [];
  for (let j = 0; j < n; j++) {
    const u = j / (n - 1);
    const mid = 1 - Math.abs(u - 0.5) * 1.3;
    const x = cx + (u - 0.5) * span + Math.sin(p * 2 + j * 2.1 + seed) * w * 0.02;
    const th = h * 0.94 * mid * (0.62 + Math.sin(p * 2 + j * 1.7 + seed) * 0.2 + Math.sin(p * 3 + j * 2.9) * 0.12);
    const tw = (span / n) * 2.3 * (0.9 + Math.sin(p + j) * 0.1);
    const lean = Math.sin(p + j * 1.3 + seed) * 0.14 + 0.05;
    tongues.push([x, th, tw, lean]);
  }
  const shape = (g: Ctx, k: number, grow: number) => {
    for (const [x, th, tw, lean] of tongues) {
      const ww = tw * k;
      const hh = th * (0.45 + k * 0.55) * grow;
      g.beginPath();
      g.moveTo(x - ww / 2, by);
      g.bezierCurveTo(x - ww * 0.7, by - hh * 0.4, x - ww * 0.12 + lean * hh * 0.4, by - hh * 0.78, x + lean * hh, by - hh);
      g.bezierCurveTo(x + ww * 0.16 + lean * hh * 0.4, by - hh * 0.72, x + ww * 0.7, by - hh * 0.38, x + ww / 2, by);
      g.quadraticCurveTo(x, by + ww * 0.2, x - ww / 2, by);
      g.fill();
    }
  };
  const layers: [number, string, number, number][] = [
    [1.12, '#1a3cc8', 0.6, 0.22],
    [0.92, '#2a78f0', 0.7, 0.3],
    [0.72, '#52c4ff', 0.75, 0.4],
    [0.5, '#9ae8ff', 0.42, 0.55],
    [0.24, '#f2feff', 0.32, 0.8],
  ];
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const [k, col, a, res] of layers) {
    const [lc, lg] = makeCanvas(Math.ceil(w * res), Math.ceil(h * res));
    lg.scale(res, res);
    lg.fillStyle = rgba(col, a);
    shape(lg, k, k < 0.4 ? 0.7 : 1);
    c.imageSmoothingEnabled = true;
    c.drawImage(lc, 0, 0, w, h);
  }
  // loose tongues breaking off and burning out as they rise
  for (const off of [0, 0.5]) {
    const q = (ph + off) % 1;
    if (q > 0.5) continue;
    const kk = q / 0.5;
    const [tx, th, tw] = tongues[off ? 2 : 4];
    const ty = by - th - kk * h * 0.18;
    const lw = tw * 0.28 * (1 - kk * 0.7);
    c.fillStyle = rgba('#6ad0ff', 0.8 * (1 - kk));
    c.beginPath();
    c.ellipse(tx + kk * 5, ty, lw / 2, lw * 1.3, 0, 0, P2);
    c.fill();
    c.fillStyle = rgba('#e8fcff', 0.7 * (1 - kk));
    c.beginPath();
    c.ellipse(tx + kk * 5, ty + lw * 0.2, lw / 4, lw * 0.6, 0, 0, P2);
    c.fill();
  }
  c.restore();
  c.save();
  c.globalCompositeOperation = 'destination-in';
  const fg = c.createLinearGradient(0, h - 46, 0, h);
  fg.addColorStop(0, 'rgba(0,0,0,1)');
  fg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = fg;
  c.fillRect(0, 0, w, h);
  c.restore();
  out.save();
  out.globalCompositeOperation = 'lighter';
  out.drawImage(oc, 0, 0);
  out.restore();
}

/** The fires' light on the hall: on the walls and posts round each hearth. */
function fireLight(ctx: Ctx, i: number, a = 1): void {
  const h = HEARTHS[i];
  glowAt(ctx, h.x, h.rim - 60, 360, '#3ab8ff', 0.2 * a, 0.9);
  glowAt(ctx, h.x, h.rim - 70, 150, '#9ae8ff', 0.22 * a);
}

// ——— the moonbeam ———

/** The beam from the rift to the floor: its top along the rift's lower edge, its foot on the slabs before the dais. */
const BEAM_TOP: [number, number, number, number] = [RIFT_C[0] - 90, RIFT_C[1] - 10, RIFT_C[0] + 80, RIFT_C[1] + 30];
const BEAM_FOOT: [number, number, number, number] = [830, 566, 1090, 604];

function moonbeam(ctx: Ctx, r: R): void {
  const [x0, y0, x1, y1] = BEAM_TOP;
  const [x3, y3, x2, y2] = BEAM_FOOT;
  softly(ctx, { x: 360, y: 0, w: 800, h: 720 }, (g) => {
    g.save();
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
    g.closePath();
    const lg = g.createLinearGradient(x0, y0, (x2 + x3) / 2, (y2 + y3) / 2);
    lg.addColorStop(0, 'rgba(200,220,255,0.22)');
    lg.addColorStop(0.6, 'rgba(170,200,250,0.1)');
    lg.addColorStop(1, 'rgba(160,190,240,0.06)');
    g.fillStyle = lg;
    g.fill();
    g.restore();
  }, 0.25, 'lighter');
  // its pool on the slabs
  lightPool(ctx, (x2 + x3) / 2, (y2 + y3) / 2 - 4, 170, 26, '#b8ccf4', 0.24);
  // the moon on the high seat: its left side, the ice back glowing where it strikes
  lightPool(ctx, 930, 420, 90, 150, '#a8c4f4', 0.14);
  void r;
}

// ——— the near posts' trophies ———

/** A gold-horned ox skull, the king's pride (the gold-horned cattle he boasts of), spiked to a post: the broad poll,
 * the orbits standing out at its sides, the long face narrowing to the muzzle; the horns sheathed in gold. Centre x,
 * poll y, scale s. */
function oxSkull(ctx: Ctx, x: number, y: number, s: number, snapped = false): void {
  const pts: [number, number][] = [
    [-22, 2], [-27, 14], [-31, 24], [-28, 36], [-20, 46], [-16, 70], [-12, 96], [-14, 108], [-6, 114], [6, 114], [14, 108], [12, 96], [16, 70], [20, 46], [28, 36], [31, 24], [27, 14], [22, 2], [8, -2], [0, 2], [-8, -2],
  ];
  const skull: PathFn = (c) => {
    c.beginPath();
    pts.forEach(([px, py], i) => {
      const [nx, ny] = pts[(i + 1) % pts.length];
      const mx = x + ((px + nx) / 2) * s;
      const my = y + ((py + ny) / 2) * s;
      if (i === 0) c.moveTo(mx, my);
      else c.quadraticCurveTo(x + px * s, y + py * s, mx, my);
    });
    c.closePath();
  };
  // the horns: thick at the poll, sweeping out and up, gilded; ringed near the base
  for (const sd of [-1, 1]) {
    const stump = snapped && sd > 0;
    const horn: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x + sd * 14 * s, y - 2 * s);
      if (stump) {
        // snapped off half way, the break jagged, the bone core showing
        c.quadraticCurveTo(x + sd * 40 * s, y - 12 * s, x + sd * 54 * s, y - 16 * s);
        c.lineTo(x + sd * 58 * s, y - 9 * s);
        c.lineTo(x + sd * 53 * s, y - 5 * s);
        c.lineTo(x + sd * 57 * s, y + 1 * s);
        c.quadraticCurveTo(x + sd * 40 * s, y + 8 * s, x + sd * 24 * s, y + 12 * s);
        c.closePath();
        return;
      }
      c.bezierCurveTo(x + sd * 46 * s, y - 14 * s, x + sd * 70 * s, y - 10 * s, x + sd * 84 * s, y - 48 * s);
      c.bezierCurveTo(x + sd * 76 * s, y - 20 * s, x + sd * 52 * s, y + 6 * s, x + sd * 24 * s, y + 12 * s);
      c.closePath();
    };
    castShadow(ctx, horn, 9, 9, 0.5, '#04020a');
    horn(ctx);
    const hg = ctx.createLinearGradient(x, y - 44 * s, x, y + 12 * s);
    hg.addColorStop(0, '#fff2b8');
    hg.addColorStop(0.3, '#e8b84c');
    hg.addColorStop(0.7, '#a06a18');
    hg.addColorStop(1, '#4a2a08');
    ctx.fillStyle = hg;
    ctx.fill();
    within(ctx, horn, () => {
      // the gold's sheen along the top of the curve, and rings near the base where the sheath was beaten on
      ctx.strokeStyle = rgba('#fffbe0', 0.85);
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(x + sd * 22 * s, y - 2 * s);
      ctx.bezierCurveTo(x + sd * 46 * s, y - 10 * s, x + sd * 66 * s, y - 8 * s, x + sd * 80 * s, y - 40 * s);
      ctx.stroke();
      for (let q = 0; q < 3; q++) {
        const bx = x + sd * (24 + q * 6) * s;
        ctx.strokeStyle = rgba('#3a2004', 0.6);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(bx, y - 6 * s);
        ctx.lineTo(bx + sd * 3 * s, y + 10 * s);
        ctx.stroke();
      }
    });
    ctx.strokeStyle = rgba('#1a0c02', 0.9);
    ctx.lineWidth = 1.8;
    horn(ctx);
    ctx.stroke();
    // rime on the tip (or the pale bone core at the break)
    ctx.fillStyle = stump ? '#d8ccb0' : rgba('#eef6ff', 0.75);
    ctx.beginPath();
    if (stump) ctx.ellipse(x + sd * 55 * s, y - 7 * s, 2.4 * s, 6 * s, 0.2, 0, P2);
    else ctx.ellipse(x + sd * 82 * s, y - 45 * s, 2.6 * s, 4 * s, sd * 0.4, 0, P2);
    ctx.fill();
  }
  castShadow(ctx, skull, 10, 10, 0.55, '#04020a');
  skull(ctx);
  const sg = ctx.createLinearGradient(x - 30 * s, y, x + 30 * s, y + 80 * s);
  sg.addColorStop(0, '#efe8d6');
  sg.addColorStop(0.45, '#c2b8a0');
  sg.addColorStop(1, '#5e5646');
  ctx.fillStyle = sg;
  ctx.fill();
  within(ctx, skull, () => {
    // the frontal bone's ridge down the middle (lit on its left), the nasal bones narrowing to the muzzle
    ctx.fillStyle = rgba('#3a3428', 0.22);
    ctx.beginPath();
    ctx.moveTo(x + 2 * s, y + 4 * s);
    ctx.quadraticCurveTo(x + 10 * s, y + 50 * s, x + 6 * s, y + 104 * s);
    ctx.lineTo(x + 14 * s, y + 104 * s);
    ctx.quadraticCurveTo(x + 20 * s, y + 46 * s, x + 26 * s, y + 20 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba('#fffaf0', 0.4);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y + 8 * s);
    ctx.quadraticCurveTo(x - 4 * s, y + 56 * s, x - 3 * s, y + 98 * s);
    ctx.stroke();
    // the orbits at the sides, deep, their upper rims lit
    for (const sd of [-1, 1]) {
      const og = ctx.createRadialGradient(x + sd * 24 * s, y + 26 * s, 0, x + sd * 22 * s, y + 27 * s, 9 * s);
      og.addColorStop(0, 'rgba(14,8,6,0.95)');
      og.addColorStop(0.6, 'rgba(40,30,22,0.7)');
      og.addColorStop(1, 'rgba(60,50,40,0)');
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.ellipse(x + sd * 22 * s, y + 27 * s, 7 * s, 8.5 * s, sd * 0.25, 0, P2);
      ctx.fill();
      ctx.strokeStyle = rgba('#fffaf0', 0.45);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x + sd * 22 * s, y + 27 * s, 8 * s, 9.5 * s, sd * 0.25, Math.PI * 1.1, Math.PI * 1.8);
      ctx.stroke();
    }
    // the nasal opening low on the muzzle, sutures, a crack, frost on the poll
    ctx.fillStyle = 'rgba(20,12,8,0.75)';
    ctx.beginPath();
    ctx.ellipse(x - 2.4 * s, y + 102 * s, 2 * s, 8 * s, 0.1, 0, P2);
    ctx.ellipse(x + 2.4 * s, y + 102 * s, 2 * s, 8 * s, -0.1, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,60,46,0.6)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x - 16 * s, y + 44 * s);
    ctx.quadraticCurveTo(x, y + 50 * s, x + 16 * s, y + 44 * s);
    ctx.moveTo(x + 4 * s, y + 60 * s);
    ctx.lineTo(x + 7 * s, y + 74 * s);
    ctx.lineTo(x + 4 * s, y + 84 * s);
    ctx.stroke();
    vfill(ctx, x - 30 * s, y - 4 * s, 60 * s, 12 * s, [[0, 'rgba(236,244,255,0.7)'], [1, 'rgba(236,244,255,0)']]);
  });
  ctx.strokeStyle = rgba('#120a06', 0.9);
  ctx.lineWidth = 2;
  skull(ctx);
  ctx.stroke();
  // the iron spike through the poll
  const bg = ctx.createRadialGradient(x - 1.5 * s, y + 9 * s, 0, x, y + 10 * s, 4.5 * s);
  bg.addColorStop(0, '#c8d0e4');
  bg.addColorStop(0.4, '#4a5068');
  bg.addColorStop(1, '#101218');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x, y + 10 * s, 4.5 * s, 0, P2);
  ctx.fill();
}

/** A round shield hung on a peg (centre x, y, radius rd): painted lime-wash quarters, an iron boss, a rim of rawhide
 * bound with iron clips; frost in its lower curve. Drawn with its peg at (x, y − rd − 8). */
function shield(ctx: Ctx, x: number, y: number, rd: number, pal: [string, string]): void {
  const disc = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, y, rd, rd, 0, 0, P2);
  };
  castShadow(ctx, disc, 14, 14, 0.55, '#02020a');
  // the strap up to the peg
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - rd * 0.3, y - rd * 0.92);
  ctx.lineTo(x, y - rd - 10);
  ctx.lineTo(x + rd * 0.3, y - rd * 0.92);
  ctx.stroke();
  disc(ctx);
  ctx.fillStyle = pal[0];
  ctx.fill();
  within(ctx, disc, () => {
    // painted boards: alternating quarters, swirling (the classic whirl), or a cross of bands with a ring; the paint
    // worn off the planks' edges
    if (x > 960) {
      ctx.fillStyle = pal[1];
      ctx.fillRect(x - rd * 0.13, y - rd, rd * 0.26, rd * 2);
      ctx.fillRect(x - rd, y - rd * 0.13, rd * 2, rd * 0.26);
      ctx.strokeStyle = pal[1];
      ctx.lineWidth = rd * 0.12;
      ctx.beginPath();
      ctx.arc(x, y, rd * 0.62, 0, P2);
      ctx.stroke();
    }
    for (let q = 0; q < 4; q++) {
      if (q % 2 || x > 960) continue;
      ctx.fillStyle = pal[1];
      ctx.beginPath();
      ctx.moveTo(x, y);
      const a0 = (q / 4) * P2 + 0.3;
      const a1 = ((q + 1) / 4) * P2 + 0.3;
      ctx.quadraticCurveTo(x + Math.cos(a0 + 0.5) * rd * 0.7, y + Math.sin(a0 + 0.5) * rd * 0.7, x + Math.cos(a0) * rd * 1.1, y + Math.sin(a0) * rd * 1.1);
      ctx.arc(x, y, rd * 1.1, a0, a1);
      ctx.quadraticCurveTo(x + Math.cos(a1 + 0.5) * rd * 0.7, y + Math.sin(a1 + 0.5) * rd * 0.7, x, y);
      ctx.fill();
    }
    const rr = rng(hashStr('th:shield' + Math.round(x)));
    for (let i = -4; i <= 4; i++) {
      const px = x + (i / 4.5) * rd;
      ctx.strokeStyle = rgba('#140a06', 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, y - rd);
      ctx.lineTo(px, y + rd);
      ctx.stroke();
      ctx.strokeStyle = rgba('#d8c8a8', 0.12);
      ctx.beginPath();
      ctx.moveTo(px + 1.2, y - rd);
      ctx.lineTo(px + 1.2, y + rd);
      ctx.stroke();
    }
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = rgba('#5a4430', 0.35);
      ctx.fillRect(x + (rr() - 0.5) * rd * 2, y + (rr() - 0.5) * rd * 2, 2 + rr() * 6, 1.5);
    }
    // lit from the upper left, shaded lower right; frost gathered in the bottom
    const g = ctx.createLinearGradient(x - rd, y - rd, x + rd, y + rd);
    g.addColorStop(0, 'rgba(230,236,255,0.16)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(2,2,12,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rd, y - rd, rd * 2, rd * 2);
    const fg = ctx.createRadialGradient(x, y + rd * 1.1, 0, x, y + rd * 1.1, rd * 0.8);
    fg.addColorStop(0, 'rgba(230,242,255,0.55)');
    fg.addColorStop(1, 'rgba(230,242,255,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(x - rd, y, rd * 2, rd);
  });
  // the rim: rawhide, iron clips
  ctx.strokeStyle = '#3a2a1c';
  ctx.lineWidth = rd * 0.09;
  disc(ctx);
  ctx.stroke();
  ctx.strokeStyle = rgba('#c8b898', 0.25);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, rd * 0.96, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  for (let q = 0; q < 8; q++) {
    const a = (q / 8) * P2 + 0.2;
    ctx.fillStyle = '#20222c';
    ctx.save();
    ctx.translate(x + Math.cos(a) * rd, y + Math.sin(a) * rd);
    ctx.rotate(a);
    ctx.fillRect(-rd * 0.05, -rd * 0.06, rd * 0.1, rd * 0.12);
    ctx.restore();
  }
  // the boss: an iron dome, lit top left
  const bg = ctx.createRadialGradient(x - rd * 0.08, y - rd * 0.08, 0, x, y, rd * 0.24);
  bg.addColorStop(0, '#c8d0e4');
  bg.addColorStop(0.35, '#5a6078');
  bg.addColorStop(1, '#14161e');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x, y, rd * 0.22, 0, P2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 2.4;
  disc(ctx);
  ctx.stroke();
}

// ——— the table: the king's board, black oak ———

/** The table top in the hall's units: its height and the depths of its back and front edges. */
const TABLE_Y = 0.9;
const tz = (y: number) => ((EH - TABLE_Y) * F) / (y - VY);

function table(ctx: Ctx, r: R): void {
  const f = TH.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 2);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#1a120e'], [0.5, '#261a14'], [1, '#2e2018']]);
  surface(ctx, r, box, '#261a14', { over: true, vary: 0.25, cells: 6, mottle: 0.25, strokes: 1.2, strokeAng: 0, strokeLen: 380, strokeW: 3, grain: 0.22, grainKind: 'wood', seed: 101 });
  // planks along the board, their seams closer together towards the back (the hall's perspective)
  const zb = tz(TY);
  const zf = tz(f);
  const nPl = 7;
  for (let i = 1; i < nPl; i++) {
    const z = lerp(zb, zf, i / nPl);
    const y = VY + ((EH - TABLE_Y) * F) / z;
    ctx.fillStyle = rgba('#050304', 0.65);
    ctx.fillRect(0, y - 1, W, 2.2);
    ctx.fillStyle = rgba('#a89ca8', 0.12);
    ctx.fillRect(0, y + 1.2, W, 1.2);
    // butt joints here and there, running to the hall's vanishing point, iron nails at them
    const rr = rng(hashStr('th:plank' + i));
    const zPrev = lerp(zb, zf, (i - 1) / nPl);
    const yPrev = VY + ((EH - TABLE_Y) * F) / zPrev;
    for (let j = 0; j < 2; j++) {
      const X = (rr() - 0.5) * 3.6;
      const xa = 960 + (X * F) / zPrev;
      const xb = 960 + (X * F) / z;
      ctx.strokeStyle = rgba('#050304', 0.55);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xa, yPrev);
      ctx.lineTo(xb, y);
      ctx.stroke();
      for (const t of [0.25, 0.75]) {
        ctx.fillStyle = rgba('#0a0a10', 0.8);
        ctx.beginPath();
        ctx.arc(lerp(xa, xb, t) - 5, lerp(yPrev, y, t), 2.2, 0, P2);
        ctx.arc(lerp(xa, xb, t) + 5, lerp(yPrev, y, t), 2.2, 0, P2);
        ctx.fill();
      }
    }
  }
  // the grain's long figure, and the polish catching the moonbeam's pool from the left
  lay(ctx, drift('#3e2c22', '#120a08', 8, 107, 220, 40), box, 0.3);
  lightPool(ctx, 760, TY + 60, 620, 70, '#b8c8f0', 0.06);
  // frost: thick along the back edge, creeping in from the corners in fern-like blooms
  vfill(ctx, 0, TY, W, 24, [[0, rgba('#dce8fa', 0.35)], [1, rgba('#dce8fa', 0)]]);
  for (const [cx, sd] of [[0, 1], [W, -1]] as const) {
    // a soft bloom of rime in the corner, then fronds of hoarfrost feathering in from it, thinning as they reach out
    const bg = ctx.createRadialGradient(cx, f, 0, cx, f, 200);
    bg.addColorStop(0, 'rgba(226,238,255,0.34)');
    bg.addColorStop(0.5, 'rgba(226,238,255,0.1)');
    bg.addColorStop(1, 'rgba(226,238,255,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(sd > 0 ? 0 : W - 220, f - 220, 220, 220);
    const fr = rng(hashStr('th:frost' + sd));
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const dist = fr() ** 1.5 * 260;
      const ang = -fr() * Math.PI * 0.5;
      let px = cx + sd * Math.cos(ang) * dist;
      let py = f + Math.sin(ang) * dist * 0.9;
      if (py < TY + 4) continue;
      const a = 0.26 * (1 - dist / 280);
      let dir = ang + (fr() - 0.5) * 0.8;
      const len = 10 + fr() * 26;
      ctx.strokeStyle = rgba('#e8f2ff', a);
      ctx.lineWidth = 1;
      for (let sgm = 0; sgm < 3; sgm++) {
        const nx = px + sd * Math.cos(dir) * len / 3;
        const ny = py + Math.sin(dir) * len / 3;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        // barbs off each segment, the frost's feathering
        for (const b of [-1, 1]) {
          ctx.moveTo((px + nx) / 2, (py + ny) / 2);
          ctx.lineTo((px + nx) / 2 + sd * Math.cos(dir + b * 0.9) * len * 0.18, (py + ny) / 2 + Math.sin(dir + b * 0.9) * len * 0.18);
        }
        ctx.stroke();
        px = nx;
        py = ny;
        dir += (fr() - 0.5) * 0.5;
      }
    }
  }
  ctx.restore();
  // the board's front: a thick edge carved with a band of interlace
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#2a2024'], [0.4, '#1a1216'], [1, '#0c080a']]);
  surface(ctx, r, { x: 0, y: f, w: W, h: 40 }, '#1e161a', { over: true, vary: 0.3, cells: 8, grain: 0.3, grainKind: 'wood', seed: 117 });
  const rr = rng(hashStr('th:frontKnot'));
  for (const [ph, col, w] of [[0, 'rgba(4,2,3,0.75)', 6], [0, 'rgba(90,74,70,0.8)', 3.4], [0, 'rgba(170,160,170,0.3)', 1.1]] as const) {
    for (let s = 0; s < 2; s++) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let x = -10; x <= W + 10; x += 6) {
        const y = f + 20 + Math.sin(x / 34 + s * Math.PI + ph) * 9;
        if (x === -10) ctx.moveTo(x + (w === 6 ? 1 : 0), y + (w === 6 ? 1.5 : 0));
        else ctx.lineTo(x + (w === 6 ? 1 : 0), y + (w === 6 ? 1.5 : 0));
      }
      ctx.stroke();
    }
  }
  void rr;
  ctx.restore();
  ctx.fillStyle = rgba('#cfdcf4', 0.4);
  ctx.fillRect(0, f - 2, W, 2.2);
  ctx.fillStyle = rgba('#040204', 0.85);
  ctx.fillRect(0, f, W, 1.6);
  // the board's back edge against the hall: a dark seam, the floor's rime beyond
  ctx.fillStyle = rgba('#040204', 0.7);
  ctx.fillRect(0, TY - 1, W, 2);
  // the board's far arris, eased and catching the light, frost on it
  vfill(ctx, 0, TY + 1, W, 7, [[0, rgba('#d8e4f8', 0.4)], [0.4, rgba('#a8b4d0', 0.16)], [1, rgba('#a8b4d0', 0)]]);
}

// ——— the grade and the shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#c8d8ff', 0.05, { warm: '#ffe0b0', cool: '#2a4ab0', a: 0.2 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#040a1e', 60, 700);
  vignetteAll(ctx, 0.6, '#010208');
}

// ——— the stack ———

const NEAR = TH.posts[0];
const MID = TH.posts[1];
const FARP = TH.posts[2];
const nearHW = postAt(TH.postX, NEAR).hw * 1.15;
const NEAR_X = [sx(-TH.postX, NEAR), sx(TH.postX, NEAR)];
const SKULL_Y = 226;
const SHIELD_Y = 470;
const SHIELD_R = 70;
const SHIELD_PAL: [string, string][] = [['#8a2a22', '#d8c8a0'], ['#1e3a6a', '#d8c8a0']];

function nearPosts(ctx: Ctx, r: R): void {
  for (const s of [-1, 1]) post(ctx, r, s * TH.postX, NEAR, -10, 1.15, false);
  NEAR_X.forEach((x, i) => {
    // the peg the shield hangs from, the skull spiked above it
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(x - 4, SHIELD_Y - SHIELD_R - 16, 8, 10);
    // the key light from the upper left: the left post's lit face, the right post turned further from it
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - nearHW, 0, nearHW * 2, TY);
    ctx.clip();
    if (i) {
      ctx.fillStyle = 'rgba(2,4,14,0.22)';
      ctx.fillRect(x - nearHW, 0, nearHW * 2, TY);
    }
    const kg = ctx.createLinearGradient(x - nearHW, 0, x, 0);
    kg.addColorStop(0, rgba('#c8d4f4', i ? 0.08 : 0.16));
    kg.addColorStop(1, rgba('#c8d4f4', 0));
    ctx.fillStyle = kg;
    ctx.fillRect(x - nearHW, 0, nearHW, TY);
    ctx.restore();
    // (the two skulls differ: the right one hangs askew, one horn snapped)
    ctx.save();
    if (i) {
      ctx.translate(x, SKULL_Y + 50);
      ctx.rotate(0.07);
      ctx.translate(-x, -(SKULL_Y + 50));
    }
    oxSkull(ctx, x + (i ? -4 : 4), SKULL_Y, 1.1, i === 1);
    ctx.restore();
    // the hearth's cold light on the post's inner side (the one turned to it)
    const s = i ? -1 : 1;
    const ex = x + s * nearHW;
    const h = HEARTHS[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - nearHW, 0, nearHW * 2, TY);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(ex, 0, ex - s * nearHW * 0.7, 0);
    g.addColorStop(0, rgba('#3ab0ff', 0.5));
    g.addColorStop(1, rgba('#3ab0ff', 0));
    ctx.fillStyle = g;
    const vg = ctx.createRadialGradient(ex, h.rim - 60, 0, ex, h.rim - 60, 340);
    vg.addColorStop(0, 'rgba(0,0,0,1)');
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    const [mc, mg] = makeCanvas(Math.ceil(nearHW * 2), TY);
    mg.fillStyle = g;
    mg.translate(-(x - nearHW), 0);
    mg.fillRect(x - nearHW, 0, nearHW * 2, TY);
    mg.globalCompositeOperation = 'destination-in';
    mg.fillStyle = vg;
    mg.fillRect(x - nearHW, 0, nearHW * 2, TY);
    ctx.drawImage(mc, x - nearHW, 0);
    ctx.restore();
  });
}

/** The hearths' light laid on the hall round them: the glacier wall behind each, the slabs, the windows' reveals. */
function hearthLight(ctx: Ctx): void {
  for (const h of HEARTHS) {
    lightPool(ctx, h.x + h.dir * 20, h.rim - 80, 240, 300, '#1e78e0', 0.16);
    lightPool(ctx, h.x, h.rim - 40, 120, 140, '#5ac8ff', 0.12);
    // on the floor before it, by the post's foot
    lightPool(ctx, h.x - h.dir * 140, TY - 20, 220, 40, '#3aa0f0', 0.14);
  }
}

function shieldLayer(ctx: Ctx, i: number): void {
  shield(ctx, NEAR_X[i], SHIELD_Y, SHIELD_R, SHIELD_PAL[i]);
}

function midPosts(ctx: Ctx, r: R): void {
  for (const s of [-1, 1]) post(ctx, r, s * TH.postX, MID, -10);
}
function farPosts(ctx: Ctx, r: R): void {
  for (const s of [-1, 1]) {
    post(ctx, r, s * TH.postX, FARP, sy(roofY(TH.postX), FARP));
    braces(ctx, s * TH.postX, FARP);
  }
}
/** The high-seat pillars either side of the seat, on the dais. */
function seatPosts(ctx: Ctx, r: R): void {
  const z = TH.seat.z - 0.05;
  for (const s of [-1, 1]) {
    const x = sx(s * TH.seatPostX, z);
    const hw = (0.1 * F) / z;
    const y0 = sy(TH.seat.backY + 0.25, z);
    const foot = sy(0.45, z);
    const path = polyPath([[x - hw, y0], [x + hw, y0], [x + hw, foot], [x - hw, foot]]);
    path(ctx);
    ctx.fillStyle = airMix(WOOD.body, dep(z), AIR);
    ctx.fill();
    within(ctx, path, () => {
      surface(ctx, r, { x: x - hw, y: y0, w: hw * 2, h: foot - y0 }, airMix(WOOD.body, dep(z), AIR), { over: true, vary: 0.3, cells: 2, strokes: 2, strokeAng: Math.PI / 2, strokeLen: 60, strokeW: 2, grain: 0.25, grainKind: 'wood', seed: 121 });
      interlace(ctx, x, hw, y0 + 30, 40, dep(z), 7 + s);
      interlace(ctx, x, hw, foot - 70, 34, dep(z), 9 + s);
      const cg = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
      cg.addColorStop(0, 'rgba(160,180,220,0.18)');
      cg.addColorStop(0.5, 'rgba(0,0,0,0)');
      cg.addColorStop(1, 'rgba(2,2,10,0.5)');
      ctx.fillStyle = cg;
      ctx.fillRect(x - hw, y0, hw * 2, foot - y0);
    });
    // a carved head on top: a giant's face, its beard running into the post
    const hx = x;
    const hy = y0 - hw * 0.8;
    const head = (c: Ctx) => {
      c.beginPath();
      c.ellipse(hx, hy, hw * 1.05, hw * 1.25, 0, 0, P2);
    };
    head(ctx);
    ctx.fillStyle = airMix(WOOD.body, dep(z), AIR);
    ctx.fill();
    within(ctx, head, () => {
      ctx.fillStyle = 'rgba(4,2,6,0.7)';
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(hx + e * hw * 0.38, hy - hw * 0.15, hw * 0.16, hw * 0.1, 0, 0, P2);
        ctx.fill();
      }
      ctx.fillRect(hx - hw * 0.35, hy + hw * 0.45, hw * 0.7, hw * 0.08);
      ctx.fillStyle = rgba(RUNE, 0.4);
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hx + e * hw * 0.38, hy - hw * 0.15, hw * 0.05, 0, P2);
        ctx.fill();
      }
      const cg = ctx.createLinearGradient(hx - hw, 0, hx + hw, 0);
      cg.addColorStop(0, 'rgba(160,180,220,0.2)');
      cg.addColorStop(0.5, 'rgba(0,0,0,0)');
      cg.addColorStop(1, 'rgba(2,2,10,0.5)');
      ctx.fillStyle = cg;
      ctx.fillRect(hx - hw * 1.2, hy - hw * 1.4, hw * 2.4, hw * 2.8);
    });
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 1.4;
    head(ctx);
    ctx.stroke();
    path(ctx);
    ctx.stroke();
  }
}

/** The hall's dark: the air thickening towards the far end and up into the vault. */
function murk(ctx: Ctx): void {
  softly(ctx, { x: 0, y: 0, w: W, h: TY }, (g) => {
    const rg = g.createRadialGradient(960, 380, 0, 960, 380, 520);
    rg.addColorStop(0, rgba(AIR.color, 0.22));
    rg.addColorStop(1, rgba(AIR.color, 0));
    g.fillStyle = rg;
    g.fillRect(0, 0, W, TY);
    // cold vapour lying low over the floor
    const lg = g.createLinearGradient(0, 560, 0, TY);
    lg.addColorStop(0, 'rgba(120,150,200,0)');
    lg.addColorStop(0.6, 'rgba(120,150,200,0.1)');
    lg.addColorStop(1, 'rgba(120,150,200,0.04)');
    g.fillStyle = lg;
    g.fillRect(0, 560, W, TY - 560);
  }, 0.125);
}

const WALL_BOX = { x: 0, y: 0, w: W, h: TY };
const WIN_BOX = (side: -1 | 1) => {
  const pts = TH.windows.flatMap(([z0, z1]) => windowPts(side, z0, z1));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs)) - 2;
  const y0 = Math.floor(Math.min(...ys)) - 2;
  return { x: x0, y: y0, w: Math.ceil(Math.max(...xs)) + 2 - x0, h: Math.ceil(Math.max(...ys)) + 2 - y0 };
};
const HEARTH_BOX = (i: number): { x: number; y: number; w: number; h: number } => {
  const h = HEARTHS[i];
  return { x: Math.round(h.x - h.r * 2.6), y: Math.round(h.rim - 30), w: Math.round(h.r * 5.4), h: TY - Math.round(h.rim - 30) };
};
const SHIELD_BOX = (i: number) => ({ x: Math.round(NEAR_X[i] - SHIELD_R - 30), y: SHIELD_Y - SHIELD_R - 30, w: SHIELD_R * 2 + 60, h: SHIELD_R * 2 + 60 });

export const THRYM: SceneSpec = {
  id: 'thrym',
  info: {
    name: "Thrym's Hall",
    subtitle: 'Boss: THRYM THE FROST KING',
    ambient: [],
    // (the fires, the snow, the aurora and the runes' light are the live layer's)
    glows: [],
    light: '#b8ccf4',
    tableTint: '#e4ecfa',
  },
  layers: [
    { id: 'walls', box: WALL_BOX, draw: (c, r) => {
      vault(c, r);
      sideWall(c, r, -1);
      sideWall(c, r, 1);
      farGable(c, r);
      floor(c, r);
    } },
    { id: 'hearthLight', box: { x: 0, y: 150, w: W, h: TY - 150 }, draw: (c) => hearthLight(c) },
    { id: 'rift', box: { x: 200, y: 0, w: 520, h: 200 }, draw: rift },
    { id: 'rafters', box: { x: 0, y: 0, w: W, h: 320 }, draw: rafters },
    { id: 'windowsL', box: WIN_BOX(-1), draw: (c, r) => windows(c, r, -1) },
    { id: 'windowsR', box: WIN_BOX(1), draw: (c, r) => windows(c, r, 1) },
    { id: 'auroraStill', box: WIN_BOX(-1), stillOnly: true, draw: (c) => windowAurora(c, -1, 0.2, 0.8) },
    { id: 'auroraStillR', box: WIN_BOX(1), stillOnly: true, draw: (c) => windowAurora(c, 1, 0.65, 0.8) },
    { id: 'dais', box: { x: 730, y: 380, w: 460, h: 260 }, draw: dais },
    { id: 'seatPosts', box: { x: 780, y: 200, w: 360, h: 360 }, draw: seatPosts },
    { id: 'seat', box: { x: 790, y: 150, w: 340, h: 420 }, draw: seat },
    { id: 'tieFar', box: { x: 0, y: 180, w: W, h: 120 }, draw: (c, r) => tieBeam(c, r, FARP) },
    { id: 'farPosts', box: { x: 640, y: 0, w: 640, h: 700 }, draw: farPosts },
    { id: 'murk', box: WALL_BOX, draw: (c) => murk(c) },
    { id: 'moonbeam', box: { x: 360, y: 0, w: 800, h: 760 }, draw: moonbeam },
    { id: 'midPosts', box: { x: 540, y: 0, w: 840, h: TY }, draw: midPosts },
    { id: 'hearthL', box: HEARTH_BOX(0), draw: (c, r) => hearth(c, r, 0) },
    { id: 'hearthR', box: HEARTH_BOX(1), draw: (c, r) => hearth(c, r, 1) },
    { id: 'nearPosts', box: { x: 0, y: 0, w: W, h: TY }, draw: nearPosts },
    { id: 'shieldL', box: SHIELD_BOX(0), motion: 'sprite', draw: (c) => shieldLayer(c, 0) },
    { id: 'shieldR', box: SHIELD_BOX(1), motion: 'sprite', draw: (c) => shieldLayer(c, 1) },
    { id: 'table', box: { x: 0, y: TY - 4, w: W, h: 1080 - TY + 4 }, draw: table },
    { id: 'fireStill', box: { x: 0, y: 300, w: W, h: 300 }, stillOnly: true, draw: (c) => {
      for (let i = 0; i < 2; i++) {
        const h = HEARTHS[i];
        fireLight(c, i, 1);
        c.save();
        c.translate(h.x - FIRE_W / 2, h.rim + 4 - FIRE_H);
        coldFire(c, FIRE_W, FIRE_H, 0.3 + i * 0.4, i + 1);
        c.restore();
      }
    } },
    { id: 'fireGlow', box: { x: 0, y: 100, w: W, h: TY - 100 }, liveOnly: true, res: 0.33, draw: (c) => {
      fireLight(c, 0, 1);
      fireLight(c, 1, 1);
    } },
    { id: 'runeGlow', box: { x: 200, y: 100, w: 1520, h: 620 }, liveOnly: true, res: 0.25, draw: (c) => runeGlow(c) },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};


// ——— live: frame painters ———

/** The cold vapour off a hearth (ph 0…1 loops), VW×VH, the bowl's rim across the top middle: colder than the air,
 * it spills over the rim in soft lobes, sinks down the column's flanks, spreading and thinning as it goes, lit on top
 * by the fire, its underside blue. Painted at half size. */
const VW = 300;
const VH = 330;
const V_SRC: Pt = [VW / 2, 26];
function vapourFrame(out: Ctx, ph: number, seed: number): void {
  const K = 0.5;
  const [c, g] = makeCanvas(Math.ceil(VW * K), Math.ceil(VH * K));
  g.scale(K, K);
  const N = 16;
  for (let i = 0; i < N; i++) {
    const rr = rng(hashStr('th:vap' + seed + ':' + i));
    const side = i % 2 ? 1 : -1;
    const age = (i / N + ph) % 1;
    // over the lip and down: out sideways first, then falling and spreading
    const out0 = 50 + rr() * 30;
    const x = V_SRC[0] + side * (out0 * Math.min(1, age * 3) + age * 40 + Math.sin(age * 5 + i) * 10);
    const y = V_SRC[1] + age ** 1.3 * (VH - 80) + (rr() - 0.5) * 10;
    const rad = 12 + age * (50 + rr() * 30);
    const a = 0.32 * Math.sin(Math.min(1, age * 1.6) * Math.PI) ** 0.8 * (1 - age * 0.5);
    if (a < 0.01) continue;
    const rg = g.createRadialGradient(x - rad * 0.2, y - rad * 0.35, 0, x, y, rad);
    rg.addColorStop(0, `rgba(214,238,255,${a.toFixed(3)})`);
    rg.addColorStop(0.55, `rgba(150,190,240,${(a * 0.55).toFixed(3)})`);
    rg.addColorStop(1, 'rgba(90,130,210,0)');
    g.fillStyle = rg;
    g.save();
    g.translate(x, y);
    g.scale(1.3, 0.85);
    g.translate(-x, -y);
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    g.restore();
    // a wisp curling off its edge
    g.strokeStyle = `rgba(220,240,255,${(a * 0.35).toFixed(3)})`;
    g.lineWidth = 2 + age * 3;
    g.beginPath();
    g.moveTo(x + side * rad * 0.5, y);
    g.quadraticCurveTo(x + side * rad * 1.1, y + rad * 0.4, x + side * rad * 0.7 + Math.sin(age * 6 + i) * 8, y + rad);
    g.stroke();
  }
  out.imageSmoothingEnabled = true;
  out.drawImage(c, 0, 0, VW, VH);
}

/** The beam's polygon, and the mask it's seen through: everything in it but the mid post that stands before it. */
const BEAM_PTS: Pt[] = [[BEAM_TOP[0], BEAM_TOP[1]], [BEAM_TOP[2], BEAM_TOP[3]], [BEAM_FOOT[2], BEAM_FOOT[3]], [BEAM_FOOT[0], BEAM_FOOT[1]]];
/** Keep the part of a polygon on one side of the vertical x = at (keep < 0: left of it, > 0: right of it). */
function clipX(pts: Pt[], at: number, keep: number): Pt[] {
  const inside = (p: Pt) => (keep < 0 ? p[0] <= at : p[0] >= at);
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) {
      const t = (at - a[0]) / (b[0] - a[0]);
      out.push([at, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
/** How much of the moonbeam a point is in (0…1, soft at its edges, fading down its length). */
function inBeam(x: number, y: number): number {
  const t = clamp01((y - BEAM_TOP[1]) / (BEAM_FOOT[1] - BEAM_TOP[1]));
  const l = lerp(BEAM_TOP[0], BEAM_FOOT[0], t);
  const rgt = lerp(BEAM_TOP[2], BEAM_FOOT[2], t);
  const w = rgt - l;
  const u = (x - l) / w;
  if (u < -0.1 || u > 1.1) return 0;
  return clamp01(Math.min(u + 0.1, 1.1 - u) * 5) * (1 - t * 0.45);
}

/** The beam's veils (ph 0…1 loops), in a BVW×BVH frame over the beam's box: soft curtains of fine snow drifting down
 * through the light, lit where they're in it. Painted at a quarter size. */
const BEAM_BOX = { x: 360, y: 0, w: 800, h: 720 };
function veilFrame(c: Ctx, ph: number): void {
  const K = 0.25;
  const [cv, g] = makeCanvas(Math.ceil(BEAM_BOX.w * K), Math.ceil(BEAM_BOX.h * K));
  g.scale(K, K);
  g.translate(-BEAM_BOX.x, -BEAM_BOX.y);
  const rr = rng(hashStr('th:veils'));
  for (let i = 0; i < 26; i++) {
    const x0 = BEAM_BOX.x + rr() * BEAM_BOX.w;
    const span = BEAM_BOX.h + 300;
    const y = BEAM_BOX.y - 150 + ((rr() * span + ph * span) % span);
    const x = x0 + Math.sin(ph * P2 + i) * 18;
    const lit = inBeam(x, y);
    if (lit < 0.05) continue;
    const rw = 18 + rr() * 26;
    const rh = 70 + rr() * 90;
    const a = 0.16 * lit;
    const rg = g.createRadialGradient(x, y, 0, x, y, rh);
    rg.addColorStop(0, `rgba(226,238,255,${a.toFixed(3)})`);
    rg.addColorStop(1, 'rgba(226,238,255,0)');
    g.fillStyle = rg;
    g.save();
    g.translate(x, y);
    g.scale(rw / rh, 1);
    g.rotate(-0.05);
    g.translate(-x, -y);
    g.fillRect(x - rh, y - rh, rh * 2, rh * 2);
    g.restore();
  }
  c.imageSmoothingEnabled = true;
  c.drawImage(cv, 0, 0, BEAM_BOX.w * K, BEAM_BOX.h * K);
}

/** An icicle shard (frame i of a few), half px square. */
function shardFrame(c: Ctx, half: number, i: number): void {
  const rr = rng(hashStr('th:shard' + i));
  const len = half * (0.9 + rr() * 0.5);
  c.shadowColor = 'rgba(6,14,36,0.85)';
  c.shadowBlur = 2;
  c.shadowOffsetX = 1;
  c.shadowOffsetY = 1;
  icicle(c, half, half - len / 2, len, 4 + rr() * 4);
}

/** A clump of snow knocked through the rift (frame i of a few): a lump lit on its top left, blue below. */
function clumpFrame(c: Ctx, half: number, i: number): void {
  const rr = rng(hashStr('th:clump' + i));
  // a loose lump of powder: a soft core, crumbs breaking off its edge, lit on its top left
  for (let q = 0; q < 14; q++) {
    const a = rr() * P2;
    const dd = rr() * half * 0.55;
    const px = half + Math.cos(a) * dd;
    const py = half + Math.sin(a) * dd * 0.85;
    const rad = half * (0.22 + rr() * 0.25) * (1 - dd / half * 0.5);
    const g = c.createRadialGradient(px - rad * 0.35, py - rad * 0.4, 0, px, py, rad);
    g.addColorStop(0, 'rgba(246,250,255,0.95)');
    g.addColorStop(0.55, 'rgba(184,200,232,0.8)');
    g.addColorStop(1, 'rgba(110,130,190,0)');
    c.fillStyle = g;
    c.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
}

/** The runes' cold light (added live): the hearths' bands, the tie beam's frieze, the seat's back, the dais. */
function runeGlow(ctx: Ctx): void {
  for (const h of HEARTHS) glowAt(ctx, h.x, h.rim + 0.14 * (F / TH.hearth.z), 90, RUNE, 0.35, 0.4);
  const [, ty] = P(0, TH.tieY - 0.12, FARP);
  glowAt(ctx, 960, ty, 300, RUNE, 0.14, 0.12);
  const [, by] = P(0, TH.seat.backY - 0.3, TH.seat.z);
  glowAt(ctx, 960, by, 70, RUNE, 0.3, 0.5);
  const [, dy] = P(0, 0.38, TH.steps[2][0]);
  glowAt(ctx, 960, dy, 120, RUNE, 0.2, 0.2);
}

// ——— live ———

const FARP_TIE = P(0, TH.tieY - 0.24, FARP)[1];
/** Where icicles hang (screen): along the far tie beam, away from its middle, and round the rift's lower lip. */
const ICICLE_SPOTS: Pt[] = [
  ...Array.from({ length: 10 }, (_, i): Pt => {
    const u = i / 9;
    const x = lerp(sx(-TH.wallX, FARP) + 20, sx(TH.wallX, FARP) - 20, u);
    return [Math.abs(x - 960) < 200 ? x + Math.sign(x - 960 || 1) * 220 : x, FARP_TIE + 2];
  }),
  ...RIFT.filter(([, y]) => y > RIFT_C[1]).map(([x, y]): Pt => [x, y]),
];

registerKitScene(THRYM, (k: KitLive) => {
  const top = k.slot('top');
  const glowS = k.sprite('fireGlow').setBlendMode(Phaser.BlendModes.ADD);
  const runeS = k.sprite('runeGlow').setBlendMode(Phaser.BlendModes.ADD);

  // ——— hero: the cold fires ———
  const FN = 12;
  const fireKey = sheet(k, 'th_fire', FIRE_W, FIRE_H, FN, (c, ph) => coldFire(c, FIRE_W, FIRE_H, ph, 1));
  const VN = 10;
  const vapKey = sheet(k, 'th_vapour', VW / 2, VH / 2, VN, (c, ph) => {
    c.scale(0.5, 0.5);
    vapourFrame(c, ph, 0);
  });
  const fires = HEARTHS.map((h, i) => {
    const vapour = new Loop(k, vapKey, VN, h.x, h.rim - 6, { into: top, origin: [V_SRC[0] / VW, V_SRC[1] / VH], sx: 2 * (h.r / 70) * -h.dir, sy: 2 * (h.r / 70), fps: 4, phase: i * 3 });
    const fire = new Loop(k, fireKey, FN, h.x, h.rim + 4, { into: top, add: true, origin: [0.5, 1], fps: 11, phase: i * 5.3 });
    // the bed's own glow, and the light the fire throws round it
    const bed = k.glow(h.x, h.rim, h.r * 1.6, 0x8ae4ff, 0.3, { into: top, sy: 0.35 });
    const halo = k.glow(h.x, h.rim - 80, 190, 0x3ab8ff, 0.12, { into: top });
    return { h, fire, vapour, bed, halo, duck: 0, dv: 0, seed: i * 7.1 };
  });
  const sparks = new Parts(k, { frame: 'spark', add: true, into: top, max: 90 });
  const sparkRate = new Rate();

  // ——— hero: the aurora beyond the ice windows ———
  const AN = 10;
  const auroraLoops = ([-1, 1] as const).map((side) => {
    const b = WIN_BOX(side);
    const key = sheet(k, 'th_aurora' + side, b.w / 2, b.h / 2, AN, (c, ph) => {
      c.scale(0.5, 0.5);
      c.translate(-b.x, -b.y);
      windowAurora(c, side, ph);
    });
    return new Loop(k, key, AN, b.x, b.y, { into: top, add: true, origin: [0, 0], scale: 2, fps: 0.8, phase: side < 0 ? 0 : 5 });
  });

  // ——— hero: the snow through the vault ———
  // veils of fine snow drifting down the moonbeam (cut to the beam, the mid post standing in front of it)
  const BN = 10;
  const veilKey = sheet(k, 'th_veil', BEAM_BOX.w / 4, BEAM_BOX.h / 4, BN, (c, ph) => veilFrame(c, ph));
  const veil = new Loop(k, veilKey, BN, BEAM_BOX.x, BEAM_BOX.y, { into: top, add: true, origin: [0, 0], scale: 4, fps: 2.2 });
  const midL = sx(-TH.postX, MID) - postAt(TH.postX, MID).hw - 2;
  const midR = sx(-TH.postX, MID) + postAt(TH.postX, MID).hw + 2;
  const beamMask = k.sc.make.graphics({}, false);
  beamMask.fillStyle(0xffffff, 1);
  for (const part of [clipX(BEAM_PTS, midL, -1), clipX(BEAM_PTS, midR, 1)]) if (part.length > 2) beamMask.fillPoints(part.map(([x, y]) => new Phaser.Geom.Point(x, y)), true);
  const mask = beamMask.createGeometryMask();
  veil.each((im) => im.setMask(mask));
  // flakes: sifting down from the rift, swaying, lit while they're in the beam, dim in the dark hall
  const fx = fxAtlas(k.sc);
  const flakes = Array.from({ length: 70 }, () => {
    const im = k.img(fx, 0, 0, { into: top, alpha: 0, tint: 0xeaf2ff });
    im.setFrame('mote');
    return { im, x: 0, y: 0, vy: 0, ph: 0, s: 1, floor: 700, life: 0 };
  });
  const respawn = (f: (typeof flakes)[number], anywhere: boolean) => {
    const [cx, cy] = RIFT_C;
    const along = anywhere ? crand() : 0;
    f.y = cy - 10 + crand() * 30 + along * 540;
    f.x = cx - 110 + crand() * 200 + (f.y - cy) * 0.68;
    f.vy = 30 + crand() * 40;
    f.ph = crand() * P2;
    f.s = 0.25 + crand() * 0.45;
    f.floor = 560 + crand() * 50;
    f.life = 0;
  };
  for (const f of flakes) respawn(f, true);
  // snow on the floor at the beam's foot glints
  const glints = new Parts(k, { frame: 'spark', add: true, into: top, max: 20 });
  const glintRate = new Rate();

  // stomps: clumps of snow through the rift, icicles off the tie beam and the rift's lip, powder where they land
  const powder = new Parts(k, { frame: 'puff', into: top, max: 50 });
  const motes = new Parts(k, { frame: 'mote', into: top, max: 140 });
  const shardKey = sheet(k, 'th_shard', 32, 32, 4, (c, _p, i) => shardFrame(c, 16, i));
  const shards = new Parts(k, { frame: 'mote', sheet: { key: shardKey, n: 4, half: 16 }, into: top, max: 30 });
  const clumpKey = sheet(k, 'th_clump', 24, 24, 4, (c, _p, i) => clumpFrame(c, 12, i));
  const clumps = new Parts(k, { frame: 'mote', sheet: { key: clumpKey, n: 4, half: 12 }, into: top, max: 16 });
  const puff = (x: number, y: number, n: number, big = 1) => {
    for (let i = 0; i < n; i++) powder.spawn({ x: x + (crand() - 0.5) * 30 * big, y: y - crand() * 8, vx: (crand() - 0.5) * 70 * big, vy: -14 - crand() * 40 * big, life: 1.2 + crand(), r0: 8 * big, r1: (30 + crand() * 24) * big, a: 0.3, tint: 0xd8e4fa, drag: 1.3, fade: 0.15 });
  };
  const burst = (x: number, y: number) => {
    puff(x, y, 1, 0.4);
    for (let i = 0; i < 8; i++) motes.spawn({ x, y, vx: (crand() - 0.5) * 140, vy: -60 - crand() * 120, life: 0.6, r0: 3.5, r1: 1.2, a: 0.9, tint: 0xe4f2ff, grav: 700, fade: 0.05 });
    glints.spawn({ x, y: y - 4, life: 0.25, r0: 9, r1: 2, a: 0.8, tint: 0xd8f0ff, fade: 0.2 });
  };

  // the shields on their pegs
  const shields = [0, 1].map((i) => {
    const im = k.pivot(k.sprite(i ? 'shieldR' : 'shieldL'), NEAR_X[i], SHIELD_Y - SHIELD_R - 10);
    return new Swing(im, { k: 7, c: 0.6, idle: 0.004, seed: i * 2 });
  });

  let flare = 0;
  return {
    destroy: () => {
      veil.each((im) => im.clearMask());
      beamMask.destroy();
    },
    impact(x, _y, p) {
      flare = Math.min(1.5, flare + 0.5 + p);
      // the fires duck under the blow, then flare back
      for (const f of fires) f.dv -= (2.5 + 3 * p) * (Math.abs(f.h.x - x) < 700 ? 1 : 0.6);
      for (const f of fires) {
        const n = Math.round(4 + p * 10);
        for (let i = 0; i < n; i++) sparks.spawn({ x: f.h.x + (crand() - 0.5) * f.h.r, y: f.h.rim - 6, vx: (crand() - 0.5) * 160, vy: -120 - crand() * 200, life: 0.9 + crand() * 0.6, r0: 4.5, r1: 1, a: 1, tint: 0xc8f4ff, grav: 260, streak: 0.012, floor: TY - 6, bounce: 0.3, fade: 0.05 });
      }
      for (const s of shields) s.kick((crand() - 0.5) * 2 * p + (x < 960 ? 0.8 : -0.8) * p);
      // icicles shaken loose
      const n = Math.round(1 + p * 3);
      for (let i = 0; i < n; i++) {
        const [ix, iy] = ICICLE_SPOTS[Math.floor(crand() * ICICLE_SPOTS.length)];
        const floor = iy < 120 ? 690 + crand() * 20 : sy(0, FARP) + crand() * 16;
        shards.spawn({ x: ix, y: iy + 10, vx: (crand() - 0.5) * 16, vy: 10, life: 2.4, r0: 14 + crand() * 6, a: 1, tint: 0xffffff, grav: 900, floor, onFloor: (fx2, fy) => burst(fx2, fy), spin: (crand() - 0.5) * 2, fade: 0.02 });
      }
      // snow through the rift: a clump or two and a sift of powder, landing in the beam's foot
      if (p > 0.25) {
        const [cx, cy] = RIFT_C;
        // a curtain of powder shaken off the rift's lip, falling and spreading through the moonlight
        for (let i = 0; i < 4 + p * 6; i++) powder.spawn({ x: cx - 100 + crand() * 200, y: cy + 10 + crand() * 20, vx: 10 + crand() * 30, vy: 30 + crand() * 40, life: 2.2 + crand(), r0: 10, r1: 40 + crand() * 30, a: 0.4, tint: 0xe4eeff, grav: 60, drag: 0.8, fade: 0.1 });
        for (let i = 0; i < 1 + Math.round(p * 2); i++) {
          const vx = 20 + crand() * 40;
          const x0 = cx - 60 + crand() * 120;
          // each clump trails crumbs of powder (falling a little slower, so they string out behind it)
          for (let q = 0; q < 6; q++) motes.spawn({ x: x0 + (crand() - 0.5) * 8, y: cy + 10 - q * 5, vx, vy: 20, life: 2.4, r0: 2.5 + crand() * 2, a: 0.9, tint: 0xf0f6ff, grav: 780 - q * 70, drag: 0.3, floor: 690, fade: 0.05 });
          clumps.spawn({ x: x0, y: cy + 10, vx, vy: 20, life: 3, r0: 8 + crand() * 6, a: 1, tint: 0xffffff, grav: 820, floor: 660 + crand() * 30, onFloor: (fx2, fy) => puff(fx2, fy, 3, 0.8), spin: (crand() - 0.5) * 3, fade: 0.02 });
        }
        for (let i = 0; i < 12 * p; i++) motes.spawn({ x: cx - 100 + crand() * 200, y: cy + crand() * 20, vx: 10 + crand() * 30, vy: 20 + crand() * 40, life: 2.6, r0: 2 + crand() * 2, a: 0.85, tint: 0xeef4ff, grav: 200, drag: 0.7, floor: 700, fade: 0.05 });
      }
      // grit and rime off the rafters
      for (let i = 0; i < 10 * p; i++) motes.spawn({ x: 300 + crand() * 1320, y: crand() * 60, vx: (crand() - 0.5) * 20, vy: 10 + crand() * 20, life: 2.2, r0: 1.6 + crand() * 1.4, a: 0.6, tint: 0xc8d4ec, grav: 240, drag: 0.6, fade: 0.05 });
    },
    update(dt, t) {
      const cm = calm();
      flare = Math.max(0, flare - dt * 0.9);

      // the fires: a spring ducks each one under a stomp and lets it overshoot back; a slow breath and a flicker
      let light = 0;
      for (const f of fires) {
        f.dv += (-f.duck * 30 - f.dv * 7) * dt;
        f.duck += f.dv * dt;
        const fl = 0.92 + 0.08 * Math.sin(t * 7.3 + f.seed) * Math.sin(t * 3.1 + f.seed * 2);
        const sY = Math.max(0.35, (1 + f.duck * 0.22) * fl);
        const sX = 1 - f.duck * 0.08;
        f.fire.each((im) => im.setScale(sX, sY));
        f.fire.step(dt, cm * (1 + Math.abs(f.dv) * 0.1));
        f.fire.alpha = 0.72;
        f.vapour.step(dt, cm);
        f.vapour.alpha = 0.85;
        f.bed.setAlpha(0.2 * sY);
        f.halo.setAlpha(0.12 * sY);
        light += sY / 2;
      }
      glowS.setAlpha(clamp01(0.8 * light));
      sparkRate.tick(9 * cm, dt, () => {
        const f = fires[crand() < 0.5 ? 0 : 1];
        sparks.spawn({ x: f.h.x + (crand() - 0.5) * f.h.r, y: f.h.rim - 20 - crand() * 30, vx: (crand() - 0.5) * 24, vy: -50 - crand() * 70, life: 1.3 + crand(), r0: 3.5, r1: 0.8, a: 0.9, tint: crand() < 0.5 ? 0xbff0ff : 0x8ad0ff, grav: 30, drag: 0.4, fade: 0.1 });
      });

      // the aurora in the windows
      for (const a of auroraLoops) a.step(dt, cm);

      // the snow: veils down the beam, flakes sifting
      veil.step(dt, cm);
      veil.alpha = Math.min(1, 0.8 + flare * 0.25);
      for (const f of flakes) {
        f.life += dt;
        f.y += f.vy * f.s * 1.6 * dt * cm;
        // (the cold air pouring in through the rift carries them down along the beam)
        f.x += (Math.sin(t * 1.3 + f.ph) * 14 + f.vy * f.s * 1.6 * 0.66) * dt * cm;
        if (f.y > f.floor) {
          if (crand() < 0.05) glints.spawn({ x: f.x, y: f.y, life: 0.4, r0: 5, r1: 1, a: 0.7, tint: 0xd8ecff, fade: 0.3 });
          respawn(f, false);
        }
        const lit = inBeam(f.x, f.y);
        const fade = Math.min(1, f.life * 2) * clamp01((f.floor - f.y) / 40);
        f.im.setPosition(f.x, f.y).setScale(f.s * (0.3 + lit * 0.25)).setRotation(t * 0.6 + f.ph);
        f.im.setAlpha((0.12 + 0.8 * lit) * fade);
      }
      glintRate.tick(1.2 * cm, dt, () => glints.spawn({ x: lerp(BEAM_FOOT[0], BEAM_FOOT[2], crand()), y: lerp(BEAM_FOOT[1], BEAM_FOOT[3], crand()) - 6, life: 0.35, r0: 6, r1: 1, a: 0.6, tint: 0xd8ecff, fade: 0.4 }));

      // the runes breathing with cold light, flaring when the hall shakes
      runeS.setAlpha(clamp01((0.55 + 0.2 * Math.sin(t * 0.8) * Math.sin(t * 0.31 + 2)) + flare * 0.4));
      for (const s of shields) s.update(dt, t);

      sparks.update(dt);
      glints.update(dt);
      powder.update(dt);
      motes.update(dt);
      shards.update(dt);
      clumps.update(dt);
    },
  };
});
