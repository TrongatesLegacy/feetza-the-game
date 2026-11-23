// The Haunted Cellar (Stage 12, waves 56–59), redrawn with the location kit (src/art/scene): the trattoria's wine
// cellar, down the stone stair from the kitchen, at night. An old brick barrel vault (its soffit curving over us, the
// courses running away to the end wall), the end wall of soft red brick under the ghost of a lime wash, salts blooming
// along the damp tide line and nitre weeping from the vault. On the left the stair comes down along the wall from the
// kitchen door at the top, the door open on the trattoria's warm light, which falls down the worn treads (the room's
// key light, from the top left); a rope rail on iron eyes, a candle in a niche in the stair's flank, casks of the house
// red racked on their sides under it (chalked heads, a wooden tap), a candle in a chamberstick on top. In the middle a
// round brick arch opens on the old cellar beyond, a low tunnel running back under the street with bottles laid in its
// niches, its iron gate standing half open, and at its far end, where nobody goes, a cold green light. On the right
// the bottle bins (brick, three by three, dusty bottles laid punt-out, a niche of corked necks, cobwebs across the
// mouths), a candle on the bins' ledge, an old iron lantern hanging dead from the vault, and an upright cask with a
// candle stuck in a straw fiasco, wax run down it. The table is the cellar's old oak tasting table: the cellar keys on
// their ring at one end, a dusty bottle and a silver tastevin at the other.
//
// Live, the heroes:
// - the ghosts: wraiths in hooded shrouds painted at 12 phases of a float cycle (the tail's wave running down it, the
//   sleeves and their tatters trailing, the hood nodding) plus 4 of a shriek (arms flung up, the eyes flaring, the body
//   whipping); they drift out of the tunnel through the gate (behind the arch until they're through), swell as they
//   come at us and rise along the vault, or cross the vault from wall to wall, or sink into the bottle bins. A stomp
//   makes them shriek and recoil away from it. More of them each wave.
// - the candles: flames painted tongue by tongue (10 phases) and played cross-faded, leaning in the draughts and
//   guttering when a ghost passes; a hard stomp snuffs the nearest (a painted curl of smoke) and a moment later it lights
//   itself again, cold and green. Wave by wave the flames turn ghost-green one by one.
// - the gate and the mist: the gate leaf painted at 10 angles on its hinge (real perspective), on a damped spring:
//   it creaks to and fro on its own, swings when the table's stomped, and slams now and then. Mist painted as rolling
//   billows (12 phases) pours out of the tunnel and lies along the foot of the wall, deeper every wave; a stomp throws
//   it out in a ring.
// Also: the lantern swings from its chain (and from the third wave a cold light burns in it), dust and grit sift off
// the vault and the stair on stomps, motes turn in the kitchen's light, will-o'-wisps drift in the tunnel.
// Across the stage the night wears on: the kitchen light is on upstairs and the candles burn warm (wave 1); the mist
// starts and the green at the end of the tunnel strengthens (wave 2); the kitchen light goes out upstairs and the
// cellar turns cold (wave 3, the Zombie Loafer); by wave 4 the place is lit by the ghosts' green, the candles burn
// green and the mist is knee-deep.
// (The old art is kept in scenes-act2b.ts for the before/after page.)

import Phaser from 'phaser';
import { CHALK } from '../../art/backdrops';
import {
  type Ctx,
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
import { board, bricks, planksPlane, plaster, tableFalloff, tableSeam, woodGrain } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, streaks } from '../../art/scene/paint';
import { bottle, candle as candleBody, hang } from '../../art/scene/props';
import { spec as specHi } from '../../art/style/kit';
import { makeCanvas, mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, flicker, lerp, registerKitScene, waveK, wander } from '../../game/sceneLive';
import { Loop, Parts, Rate, Spring, Swing, flameFrame, sheet, steamFrame } from '../../game/sceneAnim';

// ——— layout ———

const VPX = 960;
const VPY = 300;
/** A point of the front plane (scale 1) pushed back towards the vanishing point (s < 1 further away). */
const at = (x: number, y: number, s: number): [number, number] => [VPX + (x - VPX) * s, VPY + (y - VPY) * s];
const P2 = Math.PI * 2;

export const CX = {
  /** The end wall's edge under the vault: a flat segmental arch (centre, radii). */
  vault: { cy: 500, rx: 1400, ry: 480 },
  /** The arch onto the old cellar (wall plane): its jambs, springing and crown. */
  arch: { x0: 800, x1: 1120, spring: 470 },
  /** The stair's front plane (its open flank, scale 1; the wall behind it at scale STAIR_BACK): it comes down from
   * the hatch in the vault at the top left (x < hatch) to the floor. */
  stair: { top: 33, x0: -68, run: 36, n: 20, floor: 811, hatch: 250 },
  casks: { y: 760 },
  racks: { x0: 1192, x1: 1690, y0: 368, cols: 3, rows: 3 },
  barrel: { x: 1808, top: 548, rw: 92 },
  lantern: { x: 1540, y0: 40, len: 150 },
  /** Candle flames (base of the flame), the candle's height and how soon each turns cold (waveK). */
  candles: [
    { x: 176, y: 0, h: 46, cold: 0.8 },
    { x: 490, y: 0, h: 56, cold: 0.95 },
    { x: 1262, y: 0, h: 34, cold: 0.55 },
    { x: 1812, y: 0, h: 50, cold: 0.88 },
  ],
  front: 1040,
};
const STAIR_BACK = 0.9;
const ARCH_R = (CX.arch.x1 - CX.arch.x0) / 2;
const ARCH_CROWN = CX.arch.spring - ARCH_R;

const vaultY = (x: number): number => {
  const v = CX.vault;
  const k = (x - VPX) / v.rx;
  return v.cy - v.ry * Math.sqrt(Math.max(0, 1 - k * k));
};

// the cask stack (heads facing us)
const CASKS = [
  { x: 92, y: 676, r: 86 },
  { x: 268, y: 680, r: 82 },
  { x: 180, y: 532, r: 80 },
];
// candle bases
const C1 = { x: 176, base: CASKS[2].y - CASKS[2].r + 6 };
// (on the tread of the 16th step)
const C2 = { x: 490, base: 33 + ((811 - 33) / 20) * 16 - 5 };
const C3 = { x: 1262, base: CX.racks.y0 - 2 };
const C4 = { x: 1812, base: CX.barrel.top - 92 };
CX.candles[0].y = C1.base - CX.candles[0].h;
CX.candles[1].y = C2.base - CX.candles[1].h;
CX.candles[2].y = C3.base - CX.candles[2].h;
CX.candles[3].y = C4.base - CX.candles[3].h;

const BRICK = ['#7a4434', '#6e3c2e', '#844a38', '#663628', '#7c4a36', '#704030'];
const MORTAR = '#6a6052';
const LIMEWASH = '#c8c0aa';
const STONE = '#8a8272';
const IRON = '#2a2624';
const CANDLE = '#ffb45a';
const GHOST = '#7af0d0';
const KITCHEN = '#ffc27a';

// ——— the vault ———

/** The vault's soffit over us: courses of brick running away to the end wall, header joints in rings. */
function vault(ctx: Ctx, r: R): void {
  const v = CX.vault;
  const clip = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-10, -10);
    c.lineTo(W + 10, -10);
    for (let x = W + 10; x >= -10; x -= 20) c.lineTo(x, vaultY(x));
    c.closePath();
  };
  within(ctx, clip, () => {
    ctx.fillStyle = '#2a1812';
    ctx.fillRect(0, 0, W, 240);
    const pt = (u: number, s: number) => at(VPX + v.rx * Math.cos(u), v.cy - v.ry * Math.sin(u), s);
    const u0 = 0.8;
    const u1 = Math.PI - 0.8;
    const N = 96;
    for (let i = 0; i < N; i++) {
      const ua = u0 + ((u1 - u0) * i) / N;
      const ub = u0 + ((u1 - u0) * (i + 1)) / N;
      const off = i % 2 ? 0.5 : 0;
      for (let j = -1; j < 12; j++) {
        const sa = 1.1 ** (j + off);
        const sb = 1.1 ** (j + 1 + off);
        const q = [pt(ua, sa), pt(ub, sa), pt(ub, sb), pt(ua, sb)];
        const ys = q.map((p) => p[1]);
        if (Math.max(...ys) < -20 || Math.min(...ys) > 260) continue;
        const xs = q.map((p) => p[0]);
        if (Math.max(...xs) < -20 || Math.min(...xs) > W + 20) continue;
        // inset for the mortar
        const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4;
        const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
        const ins = q.map(([x, y]) => [x + (cx - x) * 0.09, y + (cy - y) * 0.16] as [number, number]);
        // nearer (bigger s) is further from every light: darker
        const dk = Math.min(1, (sa - 1) / 1.6);
        const c = shade(BRICK[Math.floor(r() * BRICK.length)], -0.12 - dk * 0.45 + (r() - 0.5) * 0.14);
        ctx.fillStyle = c;
        ctx.beginPath();
        ins.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
        // the edge towards the end wall (the candles' side) catches a little light
        ctx.strokeStyle = rgba('#ffc890', 0.12 * (1 - dk));
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ins[0][0], ins[0][1]);
        ctx.lineTo(ins[1][0], ins[1][1]);
        ctx.stroke();
      }
    }
    lay(ctx, drift('#5a3a2a', '#0a0604', 6, 17, 160, 24), { x: 0, y: 0, w: W, h: 240 }, 0.4);
    // nitre and lime leaching out of the joints, black mould in the crown
    lay(ctx, noiseMask(14, 23, { cover: 0.25, soft: 0.12, col: '#d8d4c4', w: 192, h: 24 }), { x: 0, y: 0, w: W, h: 240 }, 0.12);
    lay(ctx, noiseMask(10, 29, { cover: 0.35, soft: 0.2, col: '#060404', w: 192, h: 24 }), { x: 0, y: 0, w: W, h: 240 }, 0.4);
    // dark towards us
    vfill(ctx, 0, 0, W, 240, [[0, 'rgba(6,3,2,0.6)'], [1, 'rgba(6,3,2,0.05)']]);
  });
  // the end wall's edge: a crease of shadow under the vault, a thin lit arris on the wall's top course
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(8,4,2,0.55)';
  ctx.beginPath();
  for (let x = -10; x <= W + 10; x += 20) ctx.lineTo(x, vaultY(x) - 2);
  ctx.stroke();
  ctx.restore();
}

// ——— the end wall ———

function wallPath(c: Ctx): void {
  c.beginPath();
  c.moveTo(-10, TY);
  for (let x = -10; x <= W + 10; x += 20) c.lineTo(x, vaultY(x));
  c.lineTo(W + 10, TY);
  c.closePath();
}

function wall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: TY };
  within(ctx, wallPath, () => {
    bricks(ctx, r, box, BRICK, MORTAR, 62, 23);
    // the ghost of an old lime wash: worn through on the brick's faces, clinging in the joints and the hollows
    lay(ctx, noiseMask(12, 41, { cover: 0.55, soft: 0.22, col: LIMEWASH, w: 192, h: 76 }), box, 0.4);
    lay(ctx, noiseMask(30, 43, { cover: 0.4, soft: 0.1, col: LIMEWASH, w: 256, h: 100 }), box, 0.18);
    // what's left of the old render: islands of lime plaster, their broken edges standing proud of the brick
    for (const [cx, cy, rx, ry] of [[1500, 230, 330, 120], [560, 250, 170, 110], [1240, 140, 120, 60], [140, 690, 150, 50]] as const) renderPatch(ctx, r, cx, cy, rx, ry);
    // damp: the wall darker and cooler low down, a tide line of salts where the damp stops rising
    softly(ctx, box, (g) => {
      const dg = g.createLinearGradient(0, 520, 0, TY);
      dg.addColorStop(0, 'rgba(20,24,20,0)');
      dg.addColorStop(0.45, 'rgba(20,24,20,0.3)');
      dg.addColorStop(1, 'rgba(10,12,10,0.55)');
      g.fillStyle = dg;
      g.fillRect(0, 520, W, TY - 520);
    }, 0.125);
    ctx.strokeStyle = 'rgba(230,228,214,0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, 600 + Math.sin(x * 0.011) * 18 + Math.sin(x * 0.047) * 6 + Math.sin(x * 0.13) * 2);
    ctx.stroke();
    // efflorescence: a fur of salts under the tide line
    lay(ctx, noiseMask(40, 47, { cover: 0.3, soft: 0.08, col: '#e8e6dc', w: 256, h: 24 }), { x: 0, y: 600, w: W, h: 60 }, 0.18);
    // water seeping in under the vault: dark weeps with nitre crusted along them
    for (const x of [380, 690, 1180, 1460, 1770]) {
      streaks(ctx, r, x, vaultY(x) + 4, 60, 260 + r() * 160, '#0c1410', 0.35, 4);
      streaks(ctx, r, x + 14, vaultY(x) + 4, 30, 160, '#d8dccc', 0.08, 2);
    }
    // the night: dark gathering under the vault and in the corners
    // soot: a smudge up the wall over each candle
    for (const c of CX.candles)
      softly(ctx, { x: c.x - 80, y: c.y - 260, w: 160, h: 260 }, (g) => {
        const sg = g.createLinearGradient(0, c.y - 250, 0, c.y);
        sg.addColorStop(0, 'rgba(6,4,3,0)');
        sg.addColorStop(1, 'rgba(6,4,3,0.4)');
        g.fillStyle = sg;
        g.beginPath();
        g.ellipse(c.x, c.y - 120, 34, 130, 0, 0, P2);
        g.fill();
      }, 0.25);
    vfill(ctx, 0, 0, W, TY, [[0, 'rgba(8,4,3,0.9)'], [0.3, 'rgba(8,4,3,0.7)'], [0.75, 'rgba(8,4,3,0.6)'], [1, 'rgba(8,4,3,0.68)']]);
    const sg = ctx.createLinearGradient(0, 0, W, 0);
    sg.addColorStop(0, 'rgba(8,4,3,0.2)');
    sg.addColorStop(0.3, 'rgba(8,4,3,0)');
    sg.addColorStop(0.7, 'rgba(8,4,3,0)');
    sg.addColorStop(1, 'rgba(8,4,3,0.45)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, TY);
  });
  // stress cracks: up from the arch's shoulders, under the vault
  const cr = { col: '#140a06', lip: '#c8b8a0', w: 1.6, a: 0.45 };
  crack(ctx, r, CX.arch.x0 - 30, ARCH_CROWN + 40, -2.2, 90, cr);
  crack(ctx, r, CX.arch.x1 + 34, ARCH_CROWN + 30, -0.9, 110, cr);
  crack(ctx, r, 1080, vaultY(1080) + 4, 1.7, 70, cr);
  cobwebs(ctx, r);
}

/** An island of old lime render left on the brick: a ragged outline, the plaster's edge throwing a little shadow on
 * the brick (down-right) and catching the light along its lip, the render itself patchy and stained. */
function renderPatch(ctx: Ctx, r: R, cx: number, cy: number, rx: number, ry: number): void {
  const n = 40;
  const ph = r() * 10;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * P2;
    const k = 0.72 + 0.18 * Math.sin(a * 3 + ph) + 0.1 * Math.sin(a * 7 + ph * 2) + (r() - 0.5) * 0.12;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const p = polyPath(pts);
  castShadow(ctx, p, 4, 3, 0.55, '#080402');
  const box = { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
  within(ctx, p, () => {
    plaster(ctx, r, box, '#7a7262', { wash: 0.5, patina: 0.95, seed: Math.round(cx), warm: '#9a907c', cool: '#3a362c' });
    lay(ctx, noiseMask(9, Math.round(cy), { cover: 0.4, soft: 0.2, col: '#2a2418', w: 64, h: 32 }), box, 0.3);
  });
  // the broken edge: lit on its top-left, dark under its bottom-right
  ctx.save();
  ctx.translate(-1.2, -1.2);
  ctx.strokeStyle = 'rgba(255,236,210,0.14)';
  ctx.lineWidth = 1.6;
  p(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(20,10,6,0)';
  ctx.lineWidth = 1;
  p(ctx);
  ctx.stroke();
}

/** The candles' and the kitchen's light on the wall (added; stays in the base). */
function wallPools(ctx: Ctx): void {
  for (const c of CX.candles) {
    lightPool(ctx, c.x, c.y + 10, 380, 330, CANDLE, 0.2);
    lightPool(ctx, c.x, c.y + 10, 150, 130, '#ffc888', 0.2);
  }
  // the old cellar's cold light round the arch
  lightPool(ctx, 960, 560, 300, 260, GHOST, 0.05);
}

// ——— the old cellar through the arch ———

const archOpening = (c: Ctx) => {
  const a = CX.arch;
  c.beginPath();
  c.moveTo(a.x0, TY);
  c.lineTo(a.x0, a.spring);
  c.arc(VPX, a.spring, ARCH_R, Math.PI, 0);
  c.lineTo(a.x1, TY);
  c.closePath();
};
/** The cross-section of the tunnel (its arch and floor) at a depth (scale s). */
const sectionPath = (s: number, begin = true) => (c: Ctx) => {
  const a = CX.arch;
  const [x0, y0] = at(a.x0, TY, s);
  const [, ys] = at(a.x0, a.spring, s);
  if (begin) c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x0, ys);
  c.arc(VPX, ys, ARCH_R * s, Math.PI, 0);
  c.lineTo(VPX + (VPX - x0), y0);
  c.closePath();
};
const RINGS = [0.9, 0.76, 0.64, 0.54, 0.46, 0.39, 0.33, 0.28];
const FAR_S = 0.24;

function passage(ctx: Ctx, r: R): void {
  const a = CX.arch;
  within(ctx, archOpening, () => {
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(a.x0, ARCH_CROWN, a.x1 - a.x0, TY - ARCH_CROWN);
    // the tunnel from the mouth back: each bay its walls, vault and floor, darkest in the middle of its length,
    // lit warm at the mouth by the candles and cold towards the far end
    const sec = [1, ...RINGS, FAR_S];
    for (let i = sec.length - 2; i >= 0; i--) {
      const s0 = sec[i];
      const s1 = sec[i + 1];
      const mid = (s0 + s1) / 2;
      const warm = Math.max(0, (mid - 0.6) / 0.4);
      const cold = Math.max(0, (0.5 - mid) / 0.26);
      const base = mix(mix('#2a1a14', '#3a2418', warm), '#1e3a34', Math.min(1, cold));
      const lift = 0.15 * warm + 0.12 * cold;
      // the vault strip and walls: a band between the two sections
      ctx.beginPath();
      sectionPath(s0)(ctx);
      sectionPath(s1, false)(ctx);
      ctx.fillStyle = shade(base, -0.25 + lift);
      ctx.fill('evenodd');
      // brick courses along the walls (lines running back to the vanishing point) and header joints
      ctx.save();
      ctx.beginPath();
      sectionPath(s0)(ctx);
      sectionPath(s1, false)(ctx);
      ctx.clip('evenodd');
      ctx.strokeStyle = rgba('#080404', 0.5);
      ctx.lineWidth = 1;
      for (let y = a.spring - 4; y < TY; y += 22) {
        for (const x of [a.x0, a.x1]) {
          const [xa, ya] = at(x, y, s0);
          const [xb, yb] = at(x, y, s1);
          ctx.beginPath();
          ctx.moveTo(xa, ya);
          ctx.lineTo(xb, yb);
          ctx.stroke();
        }
      }
      for (let k = 1; k < 14; k++) {
        const u = Math.PI + (k / 14) * Math.PI;
        const [xa, ya] = at(VPX + Math.cos(u) * ARCH_R, a.spring + Math.sin(u) * ARCH_R, s0);
        const [xb, yb] = at(VPX + Math.cos(u) * ARCH_R, a.spring + Math.sin(u) * ARCH_R, s1);
        ctx.beginPath();
        ctx.moveTo(xa, ya);
        ctx.lineTo(xb, yb);
        ctx.stroke();
      }
      // loculi in the side walls: a dark arched niche in each bay, a few bottle punts catching the far light
      if (i > 0 && i < sec.length - 2) {
        for (const side of [-1, 1]) {
          const sx = side < 0 ? a.x0 : a.x1;
          const za = s0 - (s0 - s1) * 0.22;
          const zb = s0 - (s0 - s1) * 0.78;
          const top = a.spring + 40;
          const bot = TY - 110;
          const pa = at(sx, top, za);
          const pb = at(sx, top, zb);
          const pc = at(sx, bot, zb);
          const pd = at(sx, bot, za);
          ctx.fillStyle = rgba('#050303', 0.75);
          ctx.beginPath();
          ctx.moveTo(pd[0], pd[1]);
          ctx.lineTo(pa[0], pa[1] + 8 * za);
          ctx.quadraticCurveTo((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 - 14 * za, pb[0], pb[1] + 8 * zb);
          ctx.lineTo(pc[0], pc[1]);
          ctx.closePath();
          ctx.fill();
          for (let b = 0; b < 9; b++) {
            const u = 0.15 + r() * 0.7;
            const zz = za + (zb - za) * u;
            const yy = top + 24 + r() * (bot - top - 40);
            const [bx, by] = at(sx, yy, zz);
            ctx.fillStyle = rgba(mix('#3a5a48', '#8affd8', cold * 0.5), 0.25 + cold * 0.2);
            ctx.beginPath();
            ctx.ellipse(bx, by, 2.2 * zz, 4.5 * zz, 0, 0, P2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
      // the transverse rib at the near edge of the bay: a band of headers, its face lit from the far glow or the mouth
      if (i > 0) {
        ctx.save();
        ctx.beginPath();
        sectionPath(s0)(ctx);
        sectionPath(s0 * 0.985, false)(ctx);
        ctx.fillStyle = rgba(mix('#a07050', '#7ad8b8', Math.min(1, cold * 1.2)), 0.12 + warm * 0.12 + cold * 0.12);
        ctx.fill('evenodd');
        ctx.restore();
      }
      // the floor: flags, wet
      const [fl0x, fl0y] = at(a.x0, TY, s0);
      const [fl1x, fl1y] = at(a.x0, TY, s1);
      ctx.fillStyle = shade(base, -0.35 + lift * 0.8);
      ctx.beginPath();
      ctx.moveTo(fl0x, fl0y);
      ctx.lineTo(fl1x, fl1y);
      ctx.lineTo(VPX + (VPX - fl1x), fl1y);
      ctx.lineTo(VPX + (VPX - fl0x), fl0y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba('#050302', 0.55);
      ctx.lineWidth = 1.2 * s0;
      ctx.beginPath();
      ctx.moveTo(fl0x, fl0y);
      ctx.lineTo(VPX + (VPX - fl0x), fl0y);
      for (const X of [-0.55, -0.15, 0.25, 0.62]) {
        const [xa, ya] = at(VPX + X * ARCH_R * 1.6, TY, s0);
        const [xb, yb] = at(VPX + X * ARCH_R * 1.6, TY, s1);
        ctx.moveTo(xa, ya);
        ctx.lineTo(xb, yb);
      }
      ctx.stroke();
    }
    // the far end: the tunnel turns; the cold light comes round the corner
    sectionPath(FAR_S)(ctx);
    ctx.fillStyle = '#163a32';
    ctx.fill();
    const [, farFloor] = at(0, TY, FAR_S);
    const [, farSpring] = at(0, a.spring, FAR_S);
    within(ctx, sectionPath(FAR_S), () => {
      // the turn: the right-hand wall carrying on, lit; the corner's edge
      ctx.fillStyle = '#2a5a4e';
      ctx.fillRect(VPX + 6, farSpring - 50, 60, farFloor - farSpring + 50);
      ctx.fillStyle = rgba('#9affe0', 0.25);
      ctx.fillRect(VPX + 4, farSpring - 40, 3, farFloor - farSpring + 40);
    });
    glowAt(ctx, VPX + 20, (farSpring + farFloor) / 2, 120, GHOST, 0.32);
    glowAt(ctx, VPX + 20, (farSpring + farFloor) / 2, 40, '#d8fff0', 0.3);
    // the far light along the wet floor towards us
    softly(ctx, { x: a.x0, y: farFloor - 10, w: a.x1 - a.x0, h: TY - farFloor + 10 }, (g) => {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const lg = g.createLinearGradient(0, farFloor, 0, TY);
      lg.addColorStop(0, rgba(GHOST, 0.28));
      lg.addColorStop(1, rgba(GHOST, 0));
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(VPX - 8, farFloor);
      g.lineTo(VPX + 30, farFloor);
      g.lineTo(VPX + 70, TY);
      g.lineTo(VPX - 60, TY);
      g.closePath();
      g.fill();
      g.restore();
    }, 0.25);
    // mist lying in the tunnel
    softly(ctx, { x: a.x0, y: 500, w: a.x1 - a.x0, h: TY - 500 }, (g) => {
      const mg = g.createLinearGradient(0, 560, 0, TY);
      mg.addColorStop(0, rgba('#a8d8c8', 0));
      mg.addColorStop(0.6, rgba('#a8d8c8', 0.1));
      mg.addColorStop(1, rgba('#a8d8c8', 0.18));
      g.fillStyle = mg;
      g.fillRect(a.x0, 560, a.x1 - a.x0, TY - 560);
    }, 0.25);
    // the mouth's reveals: the thickness of the wall, lit warm on the left by the candles
    const rv = 0.93;
    const [lx1] = at(a.x0, 0, rv);
    ctx.fillStyle = '#3a2418';
    ctx.beginPath();
    ctx.moveTo(a.x0, TY);
    ctx.lineTo(a.x0, a.spring);
    ctx.lineTo(lx1, at(0, a.spring, rv)[1]);
    ctx.lineTo(lx1, at(0, TY, rv)[1]);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#20140e';
    ctx.beginPath();
    ctx.moveTo(a.x1, TY);
    ctx.lineTo(a.x1, a.spring);
    ctx.lineTo(VPX + (VPX - lx1), at(0, a.spring, rv)[1]);
    ctx.lineTo(VPX + (VPX - lx1), at(0, TY, rv)[1]);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    sectionPath(1)(ctx);
    sectionPath(rv, false)(ctx);
    ctx.fillStyle = rgba('#2a1810', 0.85);
    ctx.fill('evenodd');
    // dark in the mouth's top (the vault overhead) and low contrast over all of it
    vfill(ctx, a.x0, ARCH_CROWN, a.x1 - a.x0, TY - ARCH_CROWN, [[0, 'rgba(4,3,2,0.55)'], [0.4, 'rgba(4,3,2,0.15)'], [1, 'rgba(4,3,2,0.25)']]);
  });
}

// ——— the gate ———

const GATE_D = 700;
const GATE_W = ARCH_R * 2;
/** A point of the gate's leaf (d along it from the hinge, y) opened by theta (radians) into the tunnel. */
function gatePt(d: number, y: number, th: number): [number, number] {
  const x = CX.arch.x0 + d * Math.cos(th);
  const z = d * Math.sin(th);
  const s = GATE_D / (GATE_D + z);
  return at(x, y, s);
}
const gateTop = (d: number) => CX.arch.spring - Math.sqrt(Math.max(0, ARCH_R * ARCH_R - (d - ARCH_R) ** 2)) + 6;
const GATE_BOT = TY - 14;

/** The iron gate's leaf, opened by theta: flat-bar frame round the arch, round bars, a band of rings, the lock box;
 * black iron rusting, a cold rim off the light behind it. */
function gate(c: Ctx, th: number): void {
  const strokePts = (pts: [number, number][], w: number, col: string) => {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  };
  const scaleAt = (d: number) => GATE_D / (GATE_D + d * Math.sin(th));
  const iron = (pts: [number, number][], w: number, s: number) => {
    strokePts(pts, w * s + 2.4, '#0a0806');
    strokePts(pts, w * s, IRON);
    // a cold rim off the far light on the bar's right, rust on its left
    c.save();
    c.translate(w * s * 0.3, 0);
    strokePts(pts, Math.max(0.8, w * s * 0.25), rgba('#9af0d0', 0.22));
    c.translate(-w * s * 0.6, 0);
    strokePts(pts, Math.max(0.8, w * s * 0.3), rgba('#7a3a1a', 0.45));
    c.restore();
  };
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // bars
  for (let d = 30; d < GATE_W - 20; d += 30) {
    const s = scaleAt(d);
    iron([gatePt(d, gateTop(d) + 4, th), gatePt(d, GATE_BOT, th)], 5, s);
  }
  // rails, the band of rings between them
  const rail = (y: number, w: number) => {
    const pts: [number, number][] = [];
    for (let d = 0; d <= GATE_W; d += 20) pts.push(gatePt(d, y, th));
    iron(pts, w, scaleAt(GATE_W / 2));
  };
  rail(560, 7);
  rail(620, 7);
  rail(GATE_BOT - 4, 8);
  for (let d = 15; d < GATE_W; d += 30) {
    const ring: [number, number][] = [];
    for (let k = 0; k <= 16; k++) {
      const a = (k / 16) * P2;
      ring.push(gatePt(d + Math.cos(a) * 13, 590 + Math.sin(a) * 13, th));
    }
    iron(ring, 3, scaleAt(d));
  }
  // the arched top rail and the stiles
  const top: [number, number][] = [];
  for (let d = 0; d <= GATE_W; d += 8) top.push(gatePt(d, gateTop(d), th));
  iron(top, 8, scaleAt(GATE_W / 2));
  iron([gatePt(0, gateTop(0), th), gatePt(0, GATE_BOT, th)], 9, 1);
  iron([gatePt(GATE_W, gateTop(GATE_W), th), gatePt(GATE_W, GATE_BOT, th)], 9, scaleAt(GATE_W));
  // the lock box on the free stile, its keyhole
  const lb = [gatePt(GATE_W - 34, 566, th), gatePt(GATE_W, 566, th), gatePt(GATE_W, 616, th), gatePt(GATE_W - 34, 616, th)];
  c.fillStyle = '#1a1614';
  c.beginPath();
  lb.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
  c.strokeStyle = '#0a0806';
  c.lineWidth = 2;
  c.stroke();
  const [kx, ky] = gatePt(GATE_W - 17, 588, th);
  c.fillStyle = '#000';
  c.beginPath();
  c.ellipse(kx, ky, 2.4 * Math.max(0.3, Math.cos(th)), 4, 0, 0, P2);
  c.fill();
  // the hinge pins on the jamb
  for (const y of [500, 700]) {
    c.fillStyle = '#141010';
    c.fillRect(CX.arch.x0 - 6, y - 8, 12, 16);
  }
}
const GATE_TH = (52 * Math.PI) / 180;
const GATE_BOX = { x: CX.arch.x0 - 10, y: ARCH_CROWN - 4, w: 310, h: TY - ARCH_CROWN + 4 };

// ——— the arch's ring and jambs ———

function doorFrame(ctx: Ctx, r: R): void {
  const a = CX.arch;
  // brick piers either side of the opening, a stone impost at the springing, two rings of headers over it
  const ringPath = (r0: number, r1: number, a0: number, a1: number) => (c: Ctx) => {
    c.beginPath();
    c.arc(VPX, a.spring, r1, a0, a1);
    c.arc(VPX, a.spring, r0, a1, a0, true);
    c.closePath();
  };
  const outer = (c: Ctx) => {
    c.beginPath();
    c.moveTo(a.x0 - 46, TY);
    c.lineTo(a.x0 - 46, a.spring);
    c.arc(VPX, a.spring, ARCH_R + 46, Math.PI, 0);
    c.lineTo(a.x1 + 46, TY);
    c.lineTo(a.x1, TY);
    c.lineTo(a.x1, a.spring);
    c.arc(VPX, a.spring, ARCH_R, 0, Math.PI, true);
    c.lineTo(a.x0, TY);
    c.closePath();
  };
  aoHalo(ctx, outer, 20, 0.35, '#080402', 6);
  // headers: two rings
  for (const [r0, r1, n] of [[ARCH_R, ARCH_R + 23, 26], [ARCH_R + 23, ARCH_R + 46, 30]] as const) {
    for (let k = 0; k < n; k++) {
      const a0 = Math.PI + (k / n) * Math.PI + 0.004;
      const a1 = Math.PI + ((k + 1) / n) * Math.PI - 0.004;
      const p = ringPath(r0 + 1, r1 - 1, a0, a1);
      const col = shade(BRICK[Math.floor(r() * BRICK.length)], -0.12 + (r() - 0.5) * 0.12);
      within(ctx, p, () => {
        ctx.fillStyle = col;
        ctx.fillRect(a.x0 - 60, ARCH_CROWN - 60, a.x1 - a.x0 + 120, ARCH_R + 80);
        // lit from the top left (the stair's door) and the candles: the left of the ring brighter
        const lg = ctx.createLinearGradient(a.x0 - 50, 0, a.x1 + 50, 0);
        lg.addColorStop(0, 'rgba(255,200,140,0.12)');
        lg.addColorStop(1, 'rgba(10,4,2,0.3)');
        ctx.fillStyle = lg;
        ctx.fillRect(a.x0 - 60, ARCH_CROWN - 60, a.x1 - a.x0 + 120, ARCH_R + 80);
      });
    }
  }
  // the piers: brick courses
  for (const x0 of [a.x0 - 46, a.x1]) {
    within(ctx, rectPath(x0, a.spring + 16, 46, TY - a.spring - 16), () => {
      bricks(ctx, r, { x: x0, y: a.spring + 16, w: 46, h: TY - a.spring - 16 }, BRICK, MORTAR, 46, 23);
      vfill(ctx, x0, a.spring, 46, TY - a.spring, [[0, 'rgba(8,4,3,0.4)'], [1, 'rgba(8,4,3,0.55)']]);
      ctx.fillStyle = x0 < VPX ? 'rgba(255,190,130,0.06)' : 'rgba(8,4,3,0.25)';
      ctx.fillRect(x0, a.spring, 46, TY - a.spring);
    });
    // the impost stones
    const im = rectPath(x0 - 4, a.spring, 54, 18);
    solid(ctx, im, { x: x0 - 4, y: a.spring, w: 54, h: 18 }, 'stone', STONE, { depth: 0.2, line: 1.8, formSize: 6 });
    within(ctx, im, () => vfill(ctx, x0 - 4, a.spring, 54, 18, [[0, 'rgba(8,4,3,0.2)'], [1, 'rgba(8,4,3,0.45)']]));
  }
  // the ring's mortar lines and its outline
  ctx.strokeStyle = 'rgba(10,4,2,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(VPX, a.spring, ARCH_R + 23, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(10,4,2,0.7)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(VPX, a.spring, ARCH_R + 46, Math.PI, 0);
  ctx.stroke();
  // the intrados's arris, lit along its left shoulder
  ctx.strokeStyle = 'rgba(255,200,150,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(VPX, a.spring, ARCH_R + 1, Math.PI, Math.PI * 1.45);
  ctx.stroke();
  // wear: salts on the piers, the dark of hands on the left jamb, nitre weeping from the ring
  lay(ctx, noiseMask(12, 61, { cover: 0.4, soft: 0.15, col: '#e0dccc', w: 64, h: 64 }), { x: a.x0 - 46, y: 620, w: 46, h: 120 }, 0.07);
  lay(ctx, noiseMask(12, 63, { cover: 0.4, soft: 0.15, col: '#e0dccc', w: 64, h: 64 }), { x: a.x1, y: 600, w: 46, h: 140 }, 0.07);
  softly(ctx, { x: a.x0 - 40, y: 560, w: 60, h: 80 }, (g) => {
    g.fillStyle = 'rgba(10,6,4,0.3)';
    g.beginPath();
    g.ellipse(a.x0 - 14, 600, 18, 30, 0, 0, P2);
    g.fill();
  }, 0.25);
  streaks(ctx, r, VPX - 40, ARCH_CROWN - 44, 80, 46, '#d8dccc', 0.1, 3);
  // the threshold: a worn step of stone across the mouth (its top dished in the middle)
  const th = (c: Ctx) => {
    c.beginPath();
    c.moveTo(a.x0 - 52, TY + 2);
    c.lineTo(a.x0 - 52, TY - 16);
    c.quadraticCurveTo(VPX, TY - 10, a.x1 + 52, TY - 16);
    c.lineTo(a.x1 + 52, TY + 2);
    c.closePath();
  };
  solid(ctx, th, { x: a.x0 - 52, y: TY - 16, w: a.x1 - a.x0 + 104, h: 18 }, 'stone', '#6a6458', { depth: 0.15, line: 2, formSize: 6 });
  within(ctx, th, () => {
    ctx.fillStyle = rgba(GHOST, 0.08);
    ctx.fillRect(a.x0, TY - 16, a.x1 - a.x0, 6);
  });
  web(ctx, r, a.x1 - 2, a.spring + 20, 52, Math.PI * 0.5, Math.PI * 0.98, 0.2);
}
const FRAME_BOX = { x: CX.arch.x0 - 66, y: ARCH_CROWN - 66, w: CX.arch.x1 - CX.arch.x0 + 132, h: TY - ARCH_CROWN + 66 };

// ——— the stair ———

/** The stair's steps in the front plane: x of each riser and y of the tread it rises to, top to bottom. */
function steps(): { x: number; y: number }[] {
  const s = CX.stair;
  const rise = (s.floor - s.top) / s.n;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= s.n; i++) out.push({ x: s.x0 + i * s.run, y: s.top + i * rise });
  return out;
}
const back = (x: number, y: number) => at(x, y, STAIR_BACK);

/** The hatch in the vault the stair climbs through: the kitchen's light up there. */
function hatch(ctx: Ctx): void {
  const x1 = CX.stair.hatch;
  const p = polyPath([[-10, -10], [x1 + 30, -10], [x1, vaultY(x1) - 2], [-10, vaultY(0) - 2]]);
  within(ctx, p, () => {
    // the stairwell up there: its lime-washed wall in the kitchen's light, brightest at the top, a door frame's edge
    vfill(ctx, 0, 0, x1 + 40, vaultY(0), [[0, '#ffe2b0'], [0.45, '#e0a868'], [1, '#8a5a32']]);
    lay(ctx, drift('#fff0d0', '#b07840', 4, 131, 64, 32), { x: 0, y: 0, w: x1 + 40, h: vaultY(0) }, 0.35);
    ctx.fillStyle = 'rgba(60,30,10,0.55)';
    ctx.fillRect(x1 - 70, 0, 110, vaultY(0));
  });
  // the hatch's edge in the vault: the soffit's bricks cut off, a dark lip
  ctx.strokeStyle = 'rgba(10,4,2,0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x1 + 30, -10);
  ctx.lineTo(x1, vaultY(x1) - 2);
  ctx.stroke();
  // the opening's edge: a timber trimmer across the vault, in shadow on its face
  const tr = polyPath([[x1 + 30, -10], [x1 + 46, -10], [x1 + 16, vaultY(x1 + 16) + 2], [x1, vaultY(x1) + 2]]);
  solid(ctx, tr, { x: x1, y: -10, w: 46, h: vaultY(x1) + 12 }, 'wood', '#2a180c', { depth: 0.2, line: 1.6, formSize: 4 });
}

function stairs(ctx: Ctx, r: R): void {
  const s = CX.stair;
  const st = steps();
  hatch(ctx);
  const n = st.length - 1;
  // the flank: one masonry face from the sawtooth down to the floor
  const saw = (c: Ctx) => {
    c.moveTo(st[0].x - 40, st[0].y);
    for (let i = 0; i < n; i++) {
      c.lineTo(st[i].x, st[i].y);
      c.lineTo(st[i].x, st[i + 1].y);
    }
  };
  const flank = (c: Ctx) => {
    c.beginPath();
    saw(c);
    c.lineTo(st[n].x, s.floor);
    c.lineTo(st[0].x - 40, s.floor);
    c.closePath();
  };
  // its shadow on the end wall behind it (down-right: the light comes down the hatch), occlusion along the treads'
  // back edges where they're built into the wall
  castShadow(ctx, flank, 30, 26, 0.6, '#060302');
  for (let i = 0; i < n; i++) {
    const [bx0, by] = back(st[i].x, st[i + 1].y);
    const [bx1] = back(st[i + 1].x, st[i + 1].y);
    crevice(ctx, bx0, bx1 + 2, by, -16, 0.45, '#060302');
  }
  // risers: faces turned to the right, between the front plane and the wall; dark (the light comes from above-left)
  for (let i = 0; i < n; i++) {
    const t = st[i];
    const q = polyPath([[t.x, t.y], [t.x, st[i + 1].y], back(t.x, st[i + 1].y), back(t.x, t.y)]);
    solid(ctx, q, { x: t.x, y: t.y - 10, w: 60, h: 50 }, 'stone', '#4a4238', { depth: 0.2, line: 1, formSize: 4, texA: 0.12 });
    within(ctx, q, () => {
      ctx.fillStyle = 'rgba(6,3,2,0.55)';
      ctx.fillRect(t.x - 2, t.y - 10, 70, 60);
    });
  }
  // treads: stone slabs, their tops from the nosing back to the wall, worn hollow in the middle; lit near the top
  for (let i = 0; i < n; i++) {
    const t = st[i];
    const y = st[i + 1].y;
    const [bx0, by] = back(t.x, y);
    const [bx1] = back(st[i + 1].x, y);
    // (above the eye a tread's top can't be seen)
    if (y - by < 3) continue;
    const tp = polyPath([[t.x, y], [st[i + 1].x, y], [bx1, by], [bx0, by]]);
    const lit = Math.max(0, 1 - i / 10);
    solid(ctx, tp, { x: t.x, y: by, w: bx1 - t.x, h: y - by }, 'stone', mix('#5a5246', '#d8b080', lit * 0.45), { depth: 0.2, line: 1, formSize: 3, texA: 0.14 });
    within(ctx, tp, () => {
      ctx.fillStyle = 'rgba(10,6,4,0.22)';
      ctx.beginPath();
      ctx.ellipse((t.x + bx1) / 2 + 4, (y + by) / 2, (st[i + 1].x - t.x) * 0.36, (y - by) * 0.32, 0, 0, P2);
      ctx.fill();
    });
  }
  // the flank: lime render over rubble, worn back to brick at the bottom and along the stringer
  within(ctx, flank, () => {
    const fb = { x: 0, y: s.top, w: st[n].x + 10, h: s.floor - s.top };
    ctx.fillStyle = '#6a6252';
    ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
    lay(ctx, drift('#8a8270', '#2a2418', 6, 113, 96, 96), fb, 0.6);
    lay(ctx, noiseMask(8, 117, { cover: 0.35, soft: 0.18, col: '#1a1410', w: 64, h: 64 }), fb, 0.35);
    // where the render has come away: brick
    ctx.save();
    ctx.beginPath();
    for (const [cx, cy, rx, ry] of [[420, 760, 150, 60], [140, 560, 90, 60], [600, 790, 80, 40]] as const) {
      ctx.moveTo(cx + rx, cy);
      for (let k = 1; k <= 18; k++) {
        const aa = (k / 18) * P2;
        const kk = 0.75 + r() * 0.35;
        ctx.lineTo(cx + Math.cos(aa) * rx * kk, cy + Math.sin(aa) * ry * kk);
      }
      ctx.closePath();
    }
    ctx.clip();
    bricks(ctx, r, fb, BRICK, MORTAR, 52, 20);
    ctx.restore();
    // damp darkening it from the floor, the dark of the stair's underside towards the floor
    vfill(ctx, fb.x, fb.y, fb.w, fb.h, [[0, 'rgba(8,4,3,0.15)'], [0.55, 'rgba(8,4,3,0.5)'], [1, 'rgba(8,4,3,0.78)']]);
    const hg = ctx.createLinearGradient(0, 0, fb.w, 0);
    hg.addColorStop(0, 'rgba(8,4,3,0)');
    hg.addColorStop(1, 'rgba(8,4,3,0.3)');
    ctx.fillStyle = hg;
    ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
    // under each slab's nosing, its shadow on the flank
    for (let i = 0; i < n; i++) crevice(ctx, st[i].x - 4, st[i + 1].x + 4, st[i + 1].y + 7, 18, 0.5, '#060302');
    // the candle on the casks lights the flank behind it; the kitchen's light the top of it
    lightPool(ctx, C1.x + 40, C1.base - 40, 230, 180, CANDLE, 0.2);
    lightPool(ctx, 60, 200, 200, 160, KITCHEN, 0.2);
  });
  // the slabs' front edges: a band of stone along each tread, its top arris lit
  for (let i = 0; i < n; i++) {
    const y = st[i + 1].y;
    const x0 = st[i].x - 3;
    const x1 = st[i + 1].x + 2;
    const lit = Math.max(0, 1 - i / 10);
    const e = rectPath(x0, y, x1 - x0, 8);
    solid(ctx, e, { x: x0, y, w: x1 - x0, h: 8 }, 'stone', mix('#4a443a', '#a88a64', lit * 0.5), { depth: 0.2, line: 1.4, formSize: 2 });
    ctx.fillStyle = rgba('#ffd8a0', 0.12 + lit * 0.3);
    ctx.fillRect(x0 + 1, y, x1 - x0 - 2, 1.6);
    // chipped where boots catch it
    if (r() < 0.5) {
      const cx = x0 + 6 + r() * 20;
      ctx.fillStyle = 'rgba(10,6,4,0.6)';
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx + 8, y);
      ctx.lineTo(cx + 4, y + 5);
      ctx.fill();
    }
  }
  // ——— the rope rail on iron eyes along the wall over the steps
  const eyes: [number, number][] = [back(110, 150), back(290, 318), back(470, 488), back(640, 646)];
  for (const [ex, ey] of eyes) {
    castShadow(ctx, ellPath(ex, ey, 5, 6), 5, 4, 0.5, '#080402');
    ctx.strokeStyle = '#141010';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 5, 6, 0, 0, P2);
    ctx.stroke();
  }
  const [hx, hy] = back(-60, -40);
  for (let i = -1; i < eyes.length - 1; i++) {
    const [x0, y0] = i < 0 ? [hx, hy] : eyes[i];
    const [x1, y1] = eyes[i + 1];
    // the rope's shadow on the wall, then the rope (twisted, lit on its top)
    ctx.save();
    ctx.translate(7, 9);
    ctx.filter = 'blur(3px)';
    hang(ctx, x0, y0 + 4, x1, y1 + 4, 18, 'rgba(6,3,2,0.5)', 6);
    ctx.restore();
    hang(ctx, x0, y0 + 4, x1, y1 + 4, 18, '#2a1e10', 7);
    hang(ctx, x0, y0 + 3, x1, y1 + 3, 18, '#7a5a34', 4);
    ctx.save();
    ctx.setLineDash([3, 5]);
    hang(ctx, x0, y0 + 2, x1, y1 + 2, 18, 'rgba(255,220,160,0.35)', 2);
    ctx.restore();
  }
  // the rope's tail hanging off the last eye
  const [lx, ly] = eyes[eyes.length - 1];
  hang(ctx, lx, ly + 4, lx + 10, ly + 60, 4, '#2a1e10', 6);
  hang(ctx, lx, ly + 3, lx + 10, ly + 59, 4, '#7a5a34', 3.5);
  // ——— a candle left on a step: wax run over the slab's edge
  const c = CX.candles[1];
  groundShadow(ctx, c.x + 8, C2.base, 22, 4, 0.55, '#060302');
  candleBody(ctx, c.x, C2.base, c.h - 2, '#efe6cc', false);
  ctx.fillStyle = 'rgba(236,228,206,0.9)';
  ctx.beginPath();
  ctx.ellipse(c.x + 6, C2.base, 22, 4, 0, 0, P2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(c.x + 18, C2.base, 5, 18, 2.5);
  ctx.fill();
}
const STAIR_BOX = { x: 0, y: 0, w: 730, h: TY };

// ——— the casks ———

function casks(ctx: Ctx, r: R): void {
  // the cradle's timbers and the bilges behind the heads: each cask's body runs back into the dark
  for (const c of CASKS) {
    const body = ellPath(c.x + 10, c.y + 6, c.r * 1.06, c.r * 1.06);
    castShadow(ctx, body, 18, 22, 0.55, '#080402');
  }
  // order: the bottom two, then the top one resting in their groove
  for (const [i, c] of CASKS.entries()) {
    // the bilge: a ring of staves showing round the head (the cask's belly is wider than its head)
    const bilge = ellPath(c.x + 4, c.y + 2, c.r * 1.08, c.r * 1.06);
    solid(ctx, bilge, { x: c.x - c.r * 1.1, y: c.y - c.r * 1.1, w: c.r * 2.2, h: c.r * 2.2 }, 'wood', '#4a2a16', { depth: 0.15, line: 2.2, formSize: 14 });
    // an iron hoop round the bilge's edge
    ctx.strokeStyle = '#1a1210';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(c.x + 4, c.y + 2, c.r * 1.02, c.r, 0, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = rgba('#c87a3a', 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(c.x + 3, c.y + 1, c.r * 1.02, c.r, 0, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
    // the head: boards across it, the chime's ring, the croze shadow
    const head = ellPath(c.x, c.y, c.r * 0.9, c.r * 0.9);
    solid(ctx, head, { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 }, 'wood', '#6a4224', { depth: 0.15, line: 2.4, formSize: 18 });
    within(ctx, head, () => {
      woodGrain(ctx, r, { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 }, '#6a4224', true, 0.6);
      for (let k = -2; k <= 2; k++) {
        const x = c.x + k * c.r * 0.36;
        ctx.fillStyle = 'rgba(14,6,2,0.6)';
        ctx.fillRect(x - 1, c.y - c.r, 2, c.r * 2);
        ctx.fillStyle = 'rgba(255,200,140,0.1)';
        ctx.fillRect(x + 1, c.y - c.r, 1.5, c.r * 2);
      }
      // wine weeping from the seams under the tap, dried black-red
      if (i === 0) {
        streaks(ctx, r, c.x - 6, c.y + 18, 20, 60, '#3a0a10', 0.5, 3);
      }
      // the inner shadow of the chime: the head is set back inside the staves
      ctx.strokeStyle = 'rgba(8,4,2,0.55)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.ellipse(c.x - 3, c.y - 3, c.r * 0.9, c.r * 0.9, 0, Math.PI * 1.0, Math.PI * 1.9);
      ctx.stroke();
      // the candles' light from above and the dark below
      vfill(ctx, c.x - c.r, c.y - c.r, c.r * 2, c.r * 2, [[0, 'rgba(255,190,120,0.12)'], [0.5, 'rgba(10,4,2,0)'], [1, 'rgba(10,4,2,0.45)']]);
    });
    // chalk: the year and the vat
    ctx.save();
    ctx.strokeStyle = 'rgba(236,232,220,0.55)';
    ctx.lineWidth = 2.4;
    ctx.translate(c.x, c.y);
    ctx.rotate(-0.08 + i * 0.05);
    ctx.font = `26px ${CHALK}`;
    ctx.fillStyle = 'rgba(236,232,220,0.42)';
    ctx.textAlign = 'center';
    ctx.fillText(['1987', 'N.3', 'RISERVA'][i], 0, i === 2 ? -10 : -24);
    if (i === 2) {
      ctx.font = `20px ${CHALK}`;
      ctx.fillText('1979', 0, 18);
    }
    ctx.restore();
  }
  // the tap in the bottom-left cask, a drip of red hanging from it
  const c0 = CASKS[0];
  const tap = (c: Ctx) => {
    c.beginPath();
    c.roundRect(c0.x - 12, c0.y + 6, 24, 16, 4);
    c.moveTo(c0.x - 5, c0.y + 20);
    c.lineTo(c0.x + 5, c0.y + 20);
    c.lineTo(c0.x + 3, c0.y + 40);
    c.lineTo(c0.x - 3, c0.y + 40);
    c.closePath();
  };
  castShadow(ctx, tap, 6, 5, 0.5, '#080402');
  solid(ctx, tap, { x: c0.x - 12, y: c0.y + 6, w: 24, h: 34 }, 'wood', '#8a5a30', { depth: 0.12, line: 1.6, formSize: 4 });
  const drop = ellPath(c0.x, c0.y + 45, 3, 4.5);
  solid(ctx, drop, { x: c0.x - 3, y: c0.y + 40, w: 6, h: 10 }, 'slime', '#6a0a14', { depth: 0.1, line: 1, formSize: 2 });
  // the candle in its chamberstick on top of the top cask
  const top = CASKS[2];
  const plate = ellPath(C1.x, C1.base + 2, 26, 7);
  castShadow(ctx, plate, 6, 5, 0.5, '#080402');
  solid(ctx, plate, { x: C1.x - 26, y: C1.base - 5, w: 52, h: 14 }, 'chrome', '#a8884a', { depth: 0.12, line: 1.6, formSize: 4 });
  ctx.strokeStyle = '#2a1e10';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(C1.x + 30, C1.base - 2, 8, -1.2, 1.6);
  ctx.stroke();
  candleBody(ctx, C1.x, C1.base - 2, CX.candles[0].h - 4, '#efe4c8', false);
  // wax run over the cask's chime
  ctx.fillStyle = 'rgba(236,226,200,0.85)';
  ctx.beginPath();
  ctx.ellipse(C1.x - 22, top.y - top.r * 0.84, 8, 4, -0.3, 0, P2);
  ctx.fill();
}
const CASK_BOX = { x: 0, y: CASKS[2].y - CASKS[2].r - 70, w: 380, h: TY - (CASKS[2].y - CASKS[2].r - 70) };

// ——— the bottle bins ———

function racks(ctx: Ctx, r: R): void {
  const k = CX.racks;
  const cw = (k.x1 - k.x0) / k.cols;
  const rh = (TY - k.y0 - 20) / k.rows;
  const body = rectPath(k.x0, k.y0, k.x1 - k.x0, TY - k.y0);
  aoHalo(ctx, body, 26, 0.45, '#080402', 8);
  castShadow(ctx, body, 18, 20, 0.45, '#080402');
  within(ctx, body, () => {
    bricks(ctx, r, { x: k.x0, y: k.y0, w: k.x1 - k.x0, h: TY - k.y0 }, BRICK, MORTAR, 50, 20);
    lay(ctx, noiseMask(10, 81, { cover: 0.5, soft: 0.2, col: LIMEWASH, w: 96, h: 64 }), { x: k.x0, y: k.y0, w: k.x1 - k.x0, h: TY - k.y0 }, 0.3);
    vfill(ctx, k.x0, k.y0, k.x1 - k.x0, TY - k.y0, [[0, 'rgba(8,4,3,0.35)'], [1, 'rgba(8,4,3,0.6)']]);
  });
  // each bin: an arched mouth, the bottles laid in it
  for (let row = 0; row < k.rows; row++)
    for (let col = 0; col < k.cols; col++) {
      const x0 = k.x0 + col * cw + 14;
      const x1 = k.x0 + (col + 1) * cw - 14;
      const y0 = k.y0 + 30 + row * rh;
      const y1 = y0 + rh - 22;
      const mouth = (c: Ctx) => {
        c.beginPath();
        c.moveTo(x0, y1);
        c.lineTo(x0, y0 + 16);
        c.quadraticCurveTo((x0 + x1) / 2, y0 - 12, x1, y0 + 16);
        c.lineTo(x1, y1);
        c.closePath();
      };
      within(ctx, mouth, () => {
        ctx.fillStyle = '#0a0605';
        ctx.fillRect(x0, y0 - 14, x1 - x0, y1 - y0 + 14);
        const kind = row === 1 && col === 2 ? 'necks' : row === 2 && col === 0 ? 'few' : 'punts';
        const rad = 12.5;
        const lit = Math.max(0, 1 - Math.hypot((x0 + x1) / 2 - C3.x, y0 - C3.base) / 520);
        // laid in a pyramid: rows of bottles, each row nested in the one under it
        for (let br = 0, by = y1 - rad - 2; by > y0 + 4; br++, by -= rad * 1.72) {
          const off = br % 2 ? rad : 0;
          for (let bx = x0 + rad + 2 + off; bx < x1 - rad; bx += rad * 2.02) {
            if (kind === 'few' && (br > 0 || r() < 0.4)) continue;
            const g = r() < 0.7 ? '#142a18' : r() < 0.5 ? '#2a0c10' : '#1a1a12';
            if (kind === 'necks') {
              // corked necks pointing out, wax capsules, dust on their tops
              ctx.fillStyle = shade(g, 0.1);
              ctx.beginPath();
              ctx.ellipse(bx, by, rad * 0.55, rad * 0.55, 0, 0, P2);
              ctx.fill();
              ctx.fillStyle = ['#7a1a1a', '#6a5a1a', '#2a2a2a'][Math.floor(r() * 3)];
              ctx.beginPath();
              ctx.ellipse(bx, by, rad * 0.36, rad * 0.36, 0, 0, P2);
              ctx.fill();
              ctx.fillStyle = rgba('#ffd8a0', 0.25 + lit * 0.3);
              ctx.beginPath();
              ctx.ellipse(bx - 2, by - 2, 2, 1.4, -0.6, 0, P2);
              ctx.fill();
              continue;
            }
            // a bottle's base: the glass ring, the punt's hollow, a glint off the candle, a film of dust on its top
            ctx.fillStyle = shade(g, 0.15);
            ctx.beginPath();
            ctx.arc(bx, by, rad, 0, P2);
            ctx.fill();
            ctx.fillStyle = shade(g, -0.35);
            ctx.beginPath();
            ctx.arc(bx + 1, by + 1, rad * 0.62, 0, P2);
            ctx.fill();
            ctx.strokeStyle = rgba('#ffcc90', 0.08 + lit * 0.22);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(bx, by, rad - 1.5, Math.PI * 0.95, Math.PI * 1.55);
            ctx.stroke();
            ctx.fillStyle = rgba('#fff0d0', 0.18 + lit * 0.4);
            ctx.beginPath();
            ctx.ellipse(bx - rad * 0.35, by - rad * 0.4, 2.2, 1.3, -0.7, 0, P2);
            ctx.fill();
            ctx.fillStyle = 'rgba(190,180,160,0.22)';
            ctx.beginPath();
            ctx.arc(bx, by, rad, Math.PI * 1.1, Math.PI * 1.9);
            ctx.closePath();
            ctx.fill();
          }
        }
        // dark at the back and under the arch, the candle's light on the front row
        vfill(ctx, x0, y0 - 14, x1 - x0, y1 - y0 + 14, [[0, 'rgba(4,2,2,0.7)'], [0.4, 'rgba(4,2,2,0.38)'], [1, 'rgba(4,2,2,0.5)']]);
      });
      // the mouth's lit arris and its shadowed head
      ctx.strokeStyle = 'rgba(8,4,2,0.75)';
      ctx.lineWidth = 2;
      mouth(ctx);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,150,0.14)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x0 - 2, y1);
      ctx.lineTo(x0 - 2, y0 + 16);
      ctx.stroke();
      // cobwebs across some of the mouths
      if ((row + col) % 2 === 0) web(ctx, r, x1 - 4, y0 + 14, 46, Math.PI * 0.5, Math.PI, 0.35);
    }
  // the bins' top: a slab of stone, a candle stub on a saucer, an empty demijohn in its straw
  const slab = rectPath(k.x0 - 10, k.y0 - 16, k.x1 - k.x0 + 20, 18);
  castShadow(ctx, slab, 12, 12, 0.45, '#080402');
  solid(ctx, slab, { x: k.x0 - 10, y: k.y0 - 16, w: k.x1 - k.x0 + 20, h: 18 }, 'stone', STONE, { depth: 0.18, line: 2, formSize: 5 });
  within(ctx, slab, () => vfill(ctx, k.x0 - 10, k.y0 - 16, k.x1 - k.x0 + 20, 18, [[0, 'rgba(255,210,160,0.16)'], [1, 'rgba(8,4,3,0.45)']]));
  const sau = ellPath(C3.x, C3.base - 16, 30, 7);
  castShadow(ctx, sau, 6, 5, 0.5, '#080402');
  solid(ctx, sau, { x: C3.x - 30, y: C3.base - 23, w: 60, h: 14 }, 'enamel', '#d8d0bc', { depth: 0.15, line: 1.6, formSize: 4 });
  candleBody(ctx, C3.x, C3.base - 18, CX.candles[2].h - 16, '#e8dcc0', false);
  // wax pooled on the saucer and run over its rim
  ctx.fillStyle = 'rgba(232,222,196,0.9)';
  ctx.beginPath();
  ctx.ellipse(C3.x + 4, C3.base - 18, 18, 4, 0, 0, P2);
  ctx.fill();
  ctx.fillRect(C3.x + 18, C3.base - 18, 4, 12);
  groundShadow(ctx, 1600, k.y0 - 16, 60, 8, 0.55, '#080402');
  bottle(ctx, 1590, k.y0 - 16, 116, '#3a5a32', { kind: 'flask', straw: true, cork: '#8a7a5a', depth: 0.18, shadow: false });
  web(ctx, r, 1590, k.y0 - 120, 70, Math.PI * 0.15, Math.PI * 0.85, 0.3);
}
const RACK_BOX = { x: CX.racks.x0 - 4, y: CX.racks.y0 - 160, w: CX.racks.x1 - CX.racks.x0 + 30, h: TY - CX.racks.y0 + 160 };

// ——— the upright cask with the fiasco ———

function barrel(ctx: Ctx, r: R): void {
  const b = CX.barrel;
  const top = b.top;
  const bot = TY + 40;
  const hw = (y: number) => b.rw * (0.92 + 0.08 * Math.sin(((y - top) / (bot - top)) * Math.PI));
  const body = (c: Ctx) => {
    c.beginPath();
    c.moveTo(b.x - hw(top), top);
    for (let y = top; y <= bot; y += 10) c.lineTo(b.x - hw(y), y);
    c.lineTo(b.x + hw(bot), bot);
    for (let y = bot; y >= top; y -= 10) c.lineTo(b.x + hw(y), y);
    c.closePath();
  };
  aoHalo(ctx, body, 24, 0.45, '#080402', 8);
  castShadow(ctx, body, 20, 22, 0.5, '#080402');
  solid(ctx, body, { x: b.x - b.rw, y: top, w: b.rw * 2, h: bot - top }, 'wood', '#5a3420', { depth: 0.12, line: 2.4, formSize: 40 });
  within(ctx, body, () => {
    // staves: joints curving with the bulge, each stave its own tone
    for (let k = -5; k <= 5; k++) {
      const u = k / 6;
      ctx.strokeStyle = 'rgba(12,6,2,0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let y = top; y <= bot; y += 10) ctx.lineTo(b.x + hw(y) * Math.sin((u * Math.PI) / 2), y);
      ctx.stroke();
    }
    woodGrain(ctx, r, { x: b.x - b.rw, y: top, w: b.rw * 2, h: bot - top }, '#5a3420', true, 0.5);
    // the candle's light from above-left, wine-stained staves under the head
    vfill(ctx, b.x - b.rw, top, b.rw * 2, bot - top, [[0, 'rgba(255,190,120,0.14)'], [0.4, 'rgba(10,4,2,0)'], [1, 'rgba(10,4,2,0.55)']]);
    streaks(ctx, r, b.x - 40, top + 6, 70, 90, '#2a0608', 0.3, 4);
  });
  rim(ctx, body, 0.18, 3, '#9ad8c8');
  // hoops: rusted iron bands
  for (const y of [top + 20, top + 92, top + 168]) {
    const hp = (c: Ctx) => {
      c.beginPath();
      c.moveTo(b.x - hw(y) - 2, y);
      c.quadraticCurveTo(b.x, y + 12, b.x + hw(y) + 2, y);
      c.lineTo(b.x + hw(y + 10) + 2, y + 10);
      c.quadraticCurveTo(b.x, y + 22, b.x - hw(y + 10) - 2, y + 10);
      c.closePath();
    };
    solid(ctx, hp, { x: b.x - b.rw - 2, y, w: b.rw * 2 + 4, h: 22 }, 'iron', '#3a2a22', { depth: 0.12, line: 1.6, formSize: 4 });
    within(ctx, hp, () => lay(ctx, noiseMask(8, Math.round(y), { cover: 0.45, soft: 0.2, col: '#8a4a22', w: 48, h: 8 }), { x: b.x - b.rw, y, w: b.rw * 2, h: 22 }, 0.5));
  }
  // the head: an ellipse seen from a little above, wax pooled on it, the fiasco
  const head = ellPath(b.x, top, hw(top) - 2, 14);
  solid(ctx, head, { x: b.x - b.rw, y: top - 14, w: b.rw * 2, h: 28 }, 'wood', '#6a4226', { depth: 0.12, line: 2.2, formSize: 6 });
  within(ctx, head, () => {
    ctx.fillStyle = 'rgba(232,222,196,0.85)';
    ctx.beginPath();
    ctx.ellipse(C4.x + 4, top + 2, 40, 7, 0, 0, P2);
    ctx.fill();
    lightPool(ctx, C4.x, top, 90, 16, CANDLE, 0.35);
  });
  // wax run over the head's chime and down a stave
  waxRun(ctx, b.x + hw(top) - 26, top + 8, 34, 6);
  waxRun(ctx, b.x - 10, top + 12, 18, 5);
  groundShadow(ctx, C4.x + 10, top + 2, 40, 6, 0.6, '#080402');
  bottle(ctx, C4.x, top + 2, 96, '#2a4a28', { kind: 'flask', straw: true, cork: '#2a4a28', depth: 0.12, shadow: false });
  // the candle stuck in its neck, rivers of wax down the glass
  candleBody(ctx, C4.x, C4.base + 2, CX.candles[3].h - 2, '#efe6cc', false);
  for (const [dx, len, w] of [[-8, 14, 4], [-3, 26, 3.5], [5, 10, 4], [8, 20, 3.5]] as const) waxRun(ctx, C4.x + dx, C4.base - 2, len, w);
}

/** A run of candle wax down a surface: a tapering rivulet, a bead at its foot, lit on its left. */
export function waxRun(ctx: Ctx, x: number, y: number, len: number, w: number): void {
  const p = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.quadraticCurveTo(x - w * 0.3, y + len * 0.6, x - w * 0.35, y + len);
    c.arc(x, y + len, w * 0.42, Math.PI, 0, true);
    c.quadraticCurveTo(x + w * 0.3, y + len * 0.6, x + w / 2, y);
    c.closePath();
  };
  castShadow(ctx, p, 2, 2, 0.4, '#080402');
  ctx.fillStyle = '#e6dcc0';
  p(ctx);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,250,236,0.7)';
  ctx.fillRect(x - w * 0.35, y, Math.max(1, w * 0.25), len * 0.9);
  ctx.fillStyle = 'rgba(90,70,40,0.35)';
  ctx.fillRect(x + w * 0.15, y + 2, Math.max(1, w * 0.2), len * 0.8);
}
const BARREL_BOX = { x: CX.barrel.x - CX.barrel.rw - 40, y: C4.base - 110, w: CX.barrel.rw * 2 + 80, h: TY - C4.base + 110 };

// ——— the lantern hanging from the vault ———

function lantern(ctx: Ctx): void {
  const l = CX.lantern;
  hang(ctx, l.x, l.y0, l.x, l.y0 + l.len - 46, 0, '#3a3430', 3, true);
  const y = l.y0 + l.len;
  // the cage: a hooded cap, four glazed sides seen at an angle, a base
  const cap = polyPath([[l.x - 6, y - 50], [l.x + 6, y - 50], [l.x + 22, y - 34], [l.x - 22, y - 34]]);
  solid(ctx, cap, { x: l.x - 22, y: y - 50, w: 44, h: 16 }, 'iron', IRON, { depth: 0.2, line: 1.6, formSize: 4 });
  const glass = rectPath(l.x - 18, y - 34, 36, 44);
  within(ctx, glass, () => {
    ctx.fillStyle = 'rgba(40,40,36,0.85)';
    ctx.fillRect(l.x - 18, y - 34, 36, 44);
    // sooted glass, a dead stub inside
    lay(ctx, noiseMask(5, 91, { cover: 0.6, soft: 0.3, col: '#0a0806', w: 16, h: 16 }), { x: l.x - 18, y: y - 34, w: 36, h: 44 }, 0.7);
    ctx.fillStyle = '#8a8474';
    ctx.fillRect(l.x - 3, y - 6, 6, 12);
    ctx.fillStyle = 'rgba(200,220,210,0.14)';
    ctx.fillRect(l.x - 15, y - 32, 4, 40);
  });
  ctx.strokeStyle = '#0a0806';
  ctx.lineWidth = 3;
  ctx.strokeRect(l.x - 18, y - 34, 36, 44);
  ctx.beginPath();
  ctx.moveTo(l.x, y - 34);
  ctx.lineTo(l.x, y + 10);
  ctx.stroke();
  const base = polyPath([[l.x - 22, y + 10], [l.x + 22, y + 10], [l.x + 14, y + 20], [l.x - 14, y + 20]]);
  solid(ctx, base, { x: l.x - 22, y: y + 10, w: 44, h: 10 }, 'iron', IRON, { depth: 0.2, line: 1.6, formSize: 3 });
  // the ring on top
  ctx.strokeStyle = '#1a1614';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(l.x, y - 56, 6, 7, 0, 0, P2);
  ctx.stroke();
  // a cobweb strung from the cage to the chain
  ctx.strokeStyle = 'rgba(210,210,200,0.25)';
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(l.x + 22, y - 34);
    ctx.quadraticCurveTo(l.x + 12, y - 60 - k * 6, l.x + 2, y - 70 - k * 10);
    ctx.stroke();
  }
}
const LANTERN_BOX = { x: CX.lantern.x - 40, y: CX.lantern.y0 - 4, w: 80, h: CX.lantern.len + 40 };

// ——— cobwebs ———

/** A cobweb strung across a corner at (x, y) between two angles: radial threads, a spiral sagging between them, a
 * few torn strands hanging, dust clumped on it. */
export function web(ctx: Ctx, r: R, x: number, y: number, rad: number, a0: number, a1: number, a = 0.3): void {
  const n = 6;
  const spokes: number[] = [];
  for (let k = 0; k <= n; k++) spokes.push(a0 + ((a1 - a0) * k) / n + (k > 0 && k < n ? (r() - 0.5) * 0.12 : 0));
  ctx.save();
  ctx.strokeStyle = rgba('#e4e0d4', a);
  ctx.lineWidth = 0.9;
  for (const s of spokes) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(s) * rad, y + Math.sin(s) * rad);
    ctx.stroke();
  }
  ctx.lineWidth = 0.7;
  for (let ring = 0.18; ring < 1; ring += 0.12 + r() * 0.04) {
    ctx.beginPath();
    for (let k = 0; k < spokes.length; k++) {
      const p = [x + Math.cos(spokes[k]) * rad * ring, y + Math.sin(spokes[k]) * rad * ring];
      if (k === 0) ctx.moveTo(p[0], p[1]);
      else {
        const m = (spokes[k] + spokes[k - 1]) / 2;
        const sag = rad * ring * 0.82;
        ctx.quadraticCurveTo(x + Math.cos(m) * sag, y + Math.sin(m) * sag + 2, p[0], p[1]);
      }
    }
    ctx.stroke();
  }
  // a torn strand hanging, dust clumps
  ctx.beginPath();
  const s = spokes[Math.floor(n / 2)];
  ctx.moveTo(x + Math.cos(s) * rad * 0.7, y + Math.sin(s) * rad * 0.7);
  ctx.quadraticCurveTo(x + Math.cos(s) * rad * 0.8 + 6, y + Math.sin(s) * rad * 0.8 + 20, x + Math.cos(s) * rad * 0.75, y + Math.sin(s) * rad * 0.75 + 36);
  ctx.stroke();
  ctx.fillStyle = rgba('#d8d4c8', a * 0.8);
  for (let k = 0; k < 4; k++) {
    const sp = spokes[Math.floor(r() * spokes.length)];
    const d = rad * (0.3 + r() * 0.6);
    ctx.beginPath();
    ctx.arc(x + Math.cos(sp) * d, y + Math.sin(sp) * d, 1.2 + r() * 1.6, 0, P2);
    ctx.fill();
  }
  ctx.restore();
}

/** The corners under the vault (painted with the wall). */
function cobwebs(ctx: Ctx, r: R): void {
  web(ctx, r, -4, vaultY(0) - 4, 190, 0.05, Math.PI * 0.55, 0.26);
  web(ctx, r, W + 4, vaultY(W) - 4, 210, Math.PI * 0.45, Math.PI * 0.95, 0.22);
}

// ——— the candles ———

export const FLAME = { w: 26, h: 56 };
export const WARM: [string, string, string] = ['#d8400c', '#ffa030', '#fff4c8'];
export const COLD: [string, string, string] = ['#0a7a5a', '#4af0b8', '#e8fff4'];

function flamesStill(ctx: Ctx): void {
  for (const [i, c] of CX.candles.entries()) {
    ctx.save();
    ctx.translate(c.x - FLAME.w / 2, c.y + 4 - FLAME.h);
    flameFrame(ctx, FLAME.w, FLAME.h, (0.3 + i * 0.23) % 1, WARM, 3, i + 1);
    ctx.restore();
    lightPool(ctx, c.x, c.y - 16, 46, 54, '#ffcc80', 0.3);
  }
}

// ——— the table ———

function table(ctx: Ctx, r: R): void {
  const F = CX.front;
  planksPlane(ctx, r, F, '#5a3820', 0.27, 0.006, false);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, F - TY + 4);
  ctx.clip();
  lay(ctx, drift('#d8b48a', '#2a160a', 5, 101, 256, 48), { x: 0, y: TY, w: W, h: F - TY }, 0.16);
  // cellar dust lying on it, a cleaner swath down the middle where the bottles get set down
  lay(ctx, noiseMask(14, 103, { cover: 0.5, soft: 0.3, col: '#a89a88', w: 256, h: 48 }), { x: 0, y: TY, w: W, h: F - TY }, 0.12);
  // old wax drips and two wine rings near the ends
  for (const [x, y, s] of [[300, 820, 1], [340, 800, 0.7], [1640, 830, 0.9], [1590, 812, 0.6], [120, 1000, 1.2]] as const) {
    ctx.fillStyle = 'rgba(236,226,200,0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y, 9 * s, 3.6 * s, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,250,236,0.5)';
    ctx.beginPath();
    ctx.ellipse(x - 2, y - 1, 4 * s, 1.4 * s, 0, 0, P2);
    ctx.fill();
  }
  for (const [x, y, rx] of [[250, 900, 40], [1700, 880, 38]] as const) {
    ctx.strokeStyle = 'rgba(70,8,16,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.32, 0, 0.3, P2 - 0.2);
    ctx.stroke();
  }
  // the light: the candles' warm on the ends, the dark in the middle, nearer is darker
  lightPool(ctx, 300, 800, 460, 110, CANDLE, 0.24);
  lightPool(ctx, 1700, 800, 440, 110, CANDLE, 0.2);
  lightPool(ctx, 960, 790, 360, 40, GHOST, 0.06);
  vfill(ctx, 0, TY, W, F - TY, [[0, 'rgba(10,5,3,0.15)'], [1, 'rgba(10,5,3,0.45)']]);
  ctx.restore();
  tableFalloff(ctx, F, 0.5, '#0a0402');
  tableSeam(ctx, 0.6, '#0a0604', true);
  crevice(ctx, 0, W, TY, 30, 0.5, '#060302');
  tableProps(ctx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, F, W, 1080 - F);
  ctx.clip();
  board(ctx, r, 0, F, W, 1080 - F, '#4a2c16');
  vfill(ctx, 0, F, W, 1080 - F, [[0, 'rgba(10,4,2,0.55)'], [1, 'rgba(10,4,2,0.3)']]);
  ctx.restore();
  ctx.fillStyle = rgba('#ffd0a0', 0.28);
  ctx.fillRect(0, F - 3, W, 3);
  ctx.fillStyle = 'rgba(20,8,2,0.85)';
  ctx.fillRect(0, F, W, 2);
}

/** The cellar keys on their ring (left) and a dusty bottle laid down with a silver tastevin (right). */
function tableProps(ctx: Ctx): void {
  // ——— the keys: an iron ring, three big old keys fanned on the boards
  const kx = 112;
  const ky = 950;
  const RY = 0.42;
  groundShadow(ctx, kx + 30, ky + 16, 170, 22, 0.45, '#140804');
  // the ring: a thick iron hoop lying flat (its back half first, then the keys, then its front half over them)
  const hoop = (a0: number, a1: number) => {
    for (const [w, col] of [[13, '#0a0806'], [8, '#3a332e'], [3, 'rgba(255,214,170,0.35)']] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.ellipse(kx, ky - (w === 3 ? 2 : 0), 62, 62 * RY, 0, a0, a1);
      ctx.stroke();
    }
  };
  hoop(Math.PI, P2);
  const key = (ang: number, len: number, bit: number) => {
    ctx.save();
    ctx.translate(kx + Math.cos(ang) * 62, ky + Math.sin(ang) * 62 * RY);
    ctx.scale(1, RY);
    ctx.rotate(ang);
    const p = (c: Ctx) => {
      c.beginPath();
      // the bow (a trefoil ring), the collar, the shank, the bit with its wards
      c.ellipse(18, 0, 20, 18, 0, 0, P2);
      c.moveTo(36, -6);
      c.lineTo(44, -9);
      c.lineTo(48, -6);
      c.lineTo(36 + len, -5);
      c.lineTo(36 + len, -6 - bit);
      c.lineTo(36 + len - 10, -6 - bit);
      c.lineTo(36 + len - 10, -12);
      c.lineTo(36 + len - 18, -12);
      c.lineTo(36 + len - 18, -6 - bit);
      c.lineTo(36 + len - 26, -6 - bit);
      c.lineTo(36 + len - 26, 5);
      c.lineTo(48, 6);
      c.lineTo(44, 9);
      c.lineTo(36, 6);
      c.closePath();
    };
    castShadow(ctx, p, 7, 6, 0.55, '#140804');
    solid(ctx, p, { x: -4, y: -bit - 10, w: len + 44, h: bit + 30 }, 'iron', '#5a5048', { depth: 0.02, line: 2.6, formSize: 6 });
    // the bow's eye and the shank's lit top edge
    ctx.fillStyle = '#0e0a08';
    ctx.beginPath();
    ctx.ellipse(18, 0, 10, 9, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,170,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, -5);
    ctx.lineTo(30 + len, -4.5);
    ctx.stroke();
    ctx.restore();
  };
  key(1.0, 104, 22);
  key(2.0, 84, 16);
  key(2.4, 92, 20);
  hoop(0, Math.PI);
  // ——— the bottle laid down, its dust and a cobweb, the tastevin
  const bx = 1806;
  const by = 896;
  groundShadow(ctx, bx + 16, by + 30, 170, 18, 0.5, '#140804');
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-Math.PI / 2 + 0.1);
  ctx.translate(-bx, -by);
  bottle(ctx, bx, by + 96, 200, '#1a3a1c', { kind: 'wine', label: '#d8c8a0', cork: '#6a1a1a', depth: 0.02, shadow: false });
  ctx.restore();
  // dust on its top (the up-facing side) and a web from its neck to the boards
  softly(ctx, { x: bx - 130, y: by - 50, w: 260, h: 70 }, (g) => {
    g.fillStyle = 'rgba(200,190,170,0.4)';
    g.beginPath();
    g.ellipse(bx - 10, by - 20, 92, 9, 0.1, 0, P2);
    g.fill();
  }, 0.25);
  // the tastevin: a shallow silver cup, dimpled, a thumb-ring, a little red left in it
  const tx = 1786;
  const ty = 1006;
  const rx = 52;
  const ry = 52 * RY;
  groundShadow(ctx, tx + 12, ty + 14, rx * 1.15, ry * 0.7, 0.55, '#140804');
  const side = (c: Ctx) => {
    c.beginPath();
    c.ellipse(tx, ty, rx, ry, 0, 0, Math.PI);
    c.lineTo(tx - rx * 0.86, ty + 12);
    c.ellipse(tx, ty + 12, rx * 0.86, ry * 0.86, 0, Math.PI, 0, true);
    c.closePath();
  };
  solid(ctx, side, { x: tx - rx, y: ty, w: rx * 2, h: ry + 14 }, 'chrome', '#a8a8a6', { depth: 0.02, line: 2.2, formSize: 6 });
  const lip = ellPath(tx, ty, rx, ry);
  solid(ctx, lip, { x: tx - rx, y: ty - ry, w: rx * 2, h: ry * 2 }, 'chrome', '#d8d8d4', { depth: 0.02, line: 2.2, formSize: 4 });
  within(ctx, ellPath(tx, ty + 1, rx - 6, ry - 3), () => {
    const bg = ctx.createLinearGradient(tx - rx, ty - ry, tx + rx, ty + ry);
    bg.addColorStop(0, '#6a6a6c');
    bg.addColorStop(0.5, '#b8b8b8');
    bg.addColorStop(1, '#4a4a4e');
    ctx.fillStyle = bg;
    ctx.fillRect(tx - rx, ty - ry, rx * 2, ry * 2);
    // the dimples round the bowl, each catching the light on its far side
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * P2;
      const dx = tx + Math.cos(a) * (rx - 16);
      const dy = ty + 1 + Math.sin(a) * (ry - 6);
      ctx.fillStyle = 'rgba(30,30,34,0.35)';
      ctx.beginPath();
      ctx.ellipse(dx, dy, 5, 2.4, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,220,0.35)';
      ctx.beginPath();
      ctx.ellipse(dx + 1.5, dy + 1, 3, 1, 0, 0, P2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(80,8,20,0.9)';
    ctx.beginPath();
    ctx.ellipse(tx + 2, ty + 3, rx * 0.4, ry * 0.36, 0, 0, P2);
    ctx.fill();
    specHi(ctx, tx - 6, ty + 1, 8, 2, 0.7, 0);
  });
  // the thumb-ring and its plate
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(tx + rx + 12, ty + 2, 13, 7, 0, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = '#b8b8b4';
  ctx.lineWidth = 3;
  ctx.stroke();
}

// ——— light layers (added) ———

/** The kitchen's light down the hatch at the top of the stair: the opening's glow, a beam through the dust down the
 * steps, warm on the treads, the wall beside them and the vault round the hatch. */
function doorLight(ctx: Ctx, r: R): void {
  const h = CX.stair.hatch;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, h * 0.4, 30, 260, KITCHEN, 0.22, 0.7);
  ctx.restore();
  shaft(ctx, r, [0, 40, h - 20, 40], [260, 740, 760, 740], KITCHEN, 0.06, { streaks: 7, motes: 0 });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // light on the treads, fading down the stair
  const st = steps();
  for (let i = 0; i < 11; i++) {
    const t = st[i];
    const n = st[i + 1];
    const [bx0, by] = at(t.x, n.y, STAIR_BACK);
    const [bx1] = at(n.x, n.y, STAIR_BACK);
    ctx.fillStyle = rgba(KITCHEN, 0.26 * (1 - i / 11));
    ctx.beginPath();
    ctx.moveTo(t.x, n.y);
    ctx.lineTo(n.x, n.y);
    ctx.lineTo(bx1, by);
    ctx.lineTo(bx0, by);
    ctx.closePath();
    ctx.fill();
  }
  // the wall over the stair, the vault round the hatch, the casks' heads
  lightPool(ctx, 300, 240, 340, 260, KITCHEN, 0.12);
  lightPool(ctx, h + 60, 70, 240, 80, KITCHEN, 0.12);
  lightPool(ctx, 170, 520, 220, 160, KITCHEN, 0.07);
  ctx.restore();
}
const DOOR_LIGHT_BOX = { x: 0, y: 0, w: 800, h: TY };

/** The cold green light of the old cellar, risen: out of the arch, up the end wall and the vault, along the table's
 * back edge, glinting off the bottles. Added (live: grows over the waves). */
function ghostLight(ctx: Ctx): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the tunnel itself lit up from its far end, the light spilling out of the arch over the floor and the wall
  lightPool(ctx, 960, 560, 170, 260, '#6af0c8', 0.24);
  lightPool(ctx, 960, 400, 80, 60, '#c8fff0', 0.22);
  lightPool(ctx, 960, 580, 560, 440, GHOST, 0.24);
  lightPool(ctx, 960, 680, 220, 120, '#c8fff0', 0.16);
  lightPool(ctx, 960, 300, 1000, 320, GHOST, 0.08);
  lightPool(ctx, 960, 790, 1000, 80, GHOST, 0.24);
  lightPool(ctx, 1440, 560, 340, 240, GHOST, 0.1);
  lightPool(ctx, 400, 560, 360, 240, GHOST, 0.08);
  lightPool(ctx, 960, 40, 1000, 70, GHOST, 0.08);
  ctx.restore();
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.08, '#80b0a0', 0.05, { warm: '#ffb060', cool: '#2a5a6a', a: 0.3 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.16, '#060403', 70, 620);
  vignetteAll(ctx, 0.85, '#050302', 0.45);
  vfill(ctx, 0, 0, W, 200, [[0, 'rgba(4,2,1,0.5)'], [1, 'rgba(4,2,1,0)']]);
}

export const CELLAR: SceneSpec = {
  id: 'cellar',
  info: {
    name: 'Haunted Cellar',
    subtitle: 'Waves 56–59',
    ambient: [],
    glows: CX.candles.map((c) => ({ x: c.x, y: c.y - 14, r: 120, color: '#ffb050', flicker: 0.6 })),
    light: '#d8c8a8',
    tableTint: '#f0e8dc',
  },
  layers: [
    { id: 'vault', box: { x: 0, y: 0, w: W, h: 260 }, draw: vault },
    { id: 'wall', box: { x: 0, y: 0, w: W, h: TY }, draw: wall },
    { id: 'wallPools', box: { x: 0, y: 0, w: W, h: TY }, draw: wallPools },
    { id: 'passage', box: { x: CX.arch.x0, y: ARCH_CROWN, w: CX.arch.x1 - CX.arch.x0, h: TY - ARCH_CROWN }, draw: passage },
    { id: 'gateStill', box: GATE_BOX, stillOnly: true, draw: (c) => gate(c, GATE_TH) },
    { id: 'deep', box: { x: CX.arch.x0, y: ARCH_CROWN, w: CX.arch.x1 - CX.arch.x0, h: TY - ARCH_CROWN }, motion: 'slot', draw: () => {} },
    { id: 'doorFrame', box: FRAME_BOX, draw: doorFrame },
    { id: 'stairs', box: STAIR_BOX, draw: stairs },
    { id: 'casks', box: CASK_BOX, draw: casks },
    { id: 'racks', box: RACK_BOX, draw: racks },
    { id: 'barrel', box: BARREL_BOX, draw: barrel },
    { id: 'lantern', box: LANTERN_BOX, motion: 'sprite', draw: lantern },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'flamesStill', box: { x: 0, y: 300, w: W, h: 400 }, stillOnly: true, draw: flamesStill },
    { id: 'doorLightStill', box: DOOR_LIGHT_BOX, stillOnly: true, draw: doorLight },
    { id: 'doorLight', box: DOOR_LIGHT_BOX, liveOnly: true, res: 0.5, draw: doorLight },
    { id: 'ghostLight', liveOnly: true, res: 0.33, draw: ghostLight },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: frame painters ———

/** A ghost's frame: full size GW×GH, painted at GK and drawn up. */
export const GW = 190;
export const GH = 280;
export const GK = 0.72;
export const GHOST_N = 12;
export const SHRIEK_N = 4;

const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * One frame of a wraith (phase 0…1 loops; shriek 0…1): a hooded shroud of ectoplasm, the hood nodding, the body
 * narrowing into a tail that a wave runs down, sleeves hanging from the shoulders with their tatters trailing and
 * long fingers drooping out of the cuffs; dark in the hood but for two cold eyes and a moaning mouth. Shrieking, the
 * body stretches up, the arms are flung up and out, the eyes flare and the mouth gapes. Pale and glowing at the top,
 * thinning to nothing down the tail, lit on its left, shaded teal on its right, a bright rim round it.
 */
export function ghostFrame(c: Ctx, ph: number, shriek: number): void {
  const f = ph * P2;
  const cx = GW / 2;
  const headY = 40 - shriek * 12;
  const tailY = GH - 12;
  const len = tailY - headY;
  const sx = (t: number) => cx + Math.sin(P2 * 0.8 * t - f) * 28 * t ** 1.7 * (1 - shriek * 0.3) + Math.sin(f + 1.3) * 3 * (1 - t) + shriek * Math.sin(t * 9) * 6 * t;
  const sy = (t: number) => headY + t * len;
  const PROF: [number, number][] = [[0, 0], [0.02, 14], [0.06, 22], [0.11, 24], [0.16, 23], [0.21, 28], [0.29, 37], [0.38, 38], [0.5, 32], [0.62, 23], [0.74, 14], [0.86, 7], [0.95, 2.5], [1, 0]];
  const hw = (t: number) => {
    let i = 0;
    while (i < PROF.length - 2 && PROF[i + 1][0] < t) i++;
    const [t0, w0] = PROF[i];
    const [t1, w1] = PROF[i + 1];
    const u = (t - t0) / (t1 - t0);
    const w = w0 + (w1 - w0) * (u * u * (3 - 2 * u));
    const rip = t > 0.35 ? 1 + 0.09 * Math.sin(t * 34 - f * 2) * (t - 0.35) * 2 : 1;
    return w * rip * (t > 0.2 && t < 0.5 ? 1 + shriek * 0.12 : 1);
  };
  const body = (g: Ctx) => {
    g.beginPath();
    const N = 50;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      g.lineTo(sx(t) - hw(t), sy(t));
    }
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      g.lineTo(sx(t) + hw(t), sy(t));
    }
    g.closePath();
  };
  const fill = c.createLinearGradient(0, headY - 10, 0, tailY);
  fill.addColorStop(0, 'rgba(232,255,250,0.95)');
  fill.addColorStop(0.28, 'rgba(196,246,234,0.86)');
  fill.addColorStop(0.58, 'rgba(130,224,208,0.48)');
  fill.addColorStop(0.85, 'rgba(90,196,186,0.14)');
  fill.addColorStop(1, 'rgba(80,190,180,0)');
  // the soft halo it sheds round itself
  const halo = c.createRadialGradient(cx, headY + 70, 6, cx, headY + 70, 88);
  halo.addColorStop(0, 'rgba(150,255,226,0.16)');
  halo.addColorStop(1, 'rgba(150,255,226,0)');
  c.fillStyle = halo;
  c.fillRect(0, 0, GW, GH);
  // the tail's wisps trailing off its end
  c.lineCap = 'round';
  for (const [k, w] of [[0, 5]] as const) {
    c.strokeStyle = 'rgba(130,224,208,0.18)';
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(sx(0.86) + k, sy(0.86));
    c.quadraticCurveTo(sx(0.96) + Math.sin(f) * 6, sy(0.96), sx(1) + Math.sin(f * 1 + 2) * 14, tailY + 8);
    c.stroke();
  }
  body(c);
  c.fillStyle = fill;
  c.fill();
  c.save();
  body(c);
  c.clip();
  // form: shaded teal down its right, light on its left and the crown of the hood
  const sh = c.createLinearGradient(cx - 30, 0, cx + 56, 0);
  sh.addColorStop(0, 'rgba(20,70,80,0)');
  sh.addColorStop(1, 'rgba(20,70,80,0.42)');
  c.fillStyle = sh;
  c.fillRect(0, 0, GW, GH);
  const hl = c.createRadialGradient(cx - 14, headY + 14, 0, cx - 14, headY + 14, 60);
  hl.addColorStop(0, 'rgba(255,255,255,0.45)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hl;
  c.fillRect(0, 0, GW, GH);
  // folds of the shroud running down from the shoulders into the tail, following its wave
  for (const [k, light] of [[-24, true], [-12, false], [-2, true], [10, false], [22, false]] as const) {
    c.strokeStyle = light ? 'rgba(255,255,255,0.2)' : 'rgba(20,90,96,0.24)';
    c.lineWidth = light ? 2.4 : 3;
    c.beginPath();
    for (let t = 0.24; t <= 0.86; t += 0.04) {
      const x = sx(t) + k * (1 - (t - 0.24) * 1.1) * (hw(t) / 38);
      if (t === 0.24) c.moveTo(x, sy(t));
      else c.lineTo(x, sy(t));
    }
    c.stroke();
  }
  c.restore();
  // its rim: bright round the head and shoulders, fading down
  const rimG = c.createLinearGradient(0, headY, 0, headY + len * 0.7);
  rimG.addColorStop(0, 'rgba(240,255,252,0.85)');
  rimG.addColorStop(1, 'rgba(200,255,240,0)');
  c.strokeStyle = rimG;
  c.lineWidth = 3;
  c.filter = 'blur(1px)';
  body(c);
  c.stroke();
  c.filter = 'none';
  // the sleeves: from the shoulders, hanging (or flung up in a shriek), belling to ragged cuffs
  for (const side of [-1, 1]) {
    const t0 = 0.25;
    const sh0: [number, number] = [sx(t0) + side * (hw(t0) - 8), sy(t0)];
    const lag = Math.sin(f + side * 1.1 + 0.6);
    const hang = { ex: side * 18 + lag * 3, ey: 40, hx: side * 12 + lag * 7, hy: 36 };
    const up = { ex: side * 26, ey: -14, hx: side * 8, hy: -40 };
    const ex = sh0[0] + hang.ex + (up.ex - hang.ex) * shriek;
    const ey = sh0[1] + hang.ey + (up.ey - hang.ey) * shriek;
    const hx = ex + hang.hx + (up.hx - hang.hx) * shriek;
    const hy = ey + hang.hy + (up.hy - hang.hy) * shriek;
    // a tapered ribbon along shoulder → elbow → hand
    const pts: [number, number, number][] = [[sh0[0], sh0[1], 18], [ex, ey, 21], [hx, hy, 32]];
    const L: [number, number][] = [];
    const Rr: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, y, w] = pts[i];
      const [x0, y0] = pts[Math.max(0, i - 1)];
      const [x1, y1] = pts[Math.min(pts.length - 1, i + 1)];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const l = Math.hypot(dx, dy) || 1;
      L.push([x - (dy / l) * w * 0.5, y + (dx / l) * w * 0.5]);
      Rr.push([x + (dy / l) * w * 0.5, y - (dx / l) * w * 0.5]);
    }
    const dirx = hx - ex;
    const diry = hy - ey;
    const dl = Math.hypot(dirx, diry) || 1;
    const sleeve = (g: Ctx) => {
      g.beginPath();
      g.moveTo(L[0][0], L[0][1]);
      g.quadraticCurveTo(L[1][0], L[1][1], L[2][0], L[2][1]);
      // the cuff's tatters: three points trailing (gravity pulls them down, the float lifts them)
      for (let k = 0; k < 3; k++) {
        const u = (k + 0.5) / 3;
        const bx = L[2][0] + (Rr[2][0] - L[2][0]) * u;
        const by = L[2][1] + (Rr[2][1] - L[2][1]) * u;
        const tl = 12 + Math.sin(f * 2 + k * 2 + side) * 4;
        g.lineTo(bx + (dirx / dl) * tl * 0.6 + Math.sin(f + k) * 3, by + (diry / dl) * tl * 0.6 + tl * 0.6);
        const u2 = (k + 1) / 3;
        g.lineTo(L[2][0] + (Rr[2][0] - L[2][0]) * u2, L[2][1] + (Rr[2][1] - L[2][1]) * u2);
      }
      g.quadraticCurveTo(Rr[1][0], Rr[1][1], Rr[0][0], Rr[0][1]);
      g.closePath();
    };
    // long bony fingers drooping out of the cuff
    c.strokeStyle = 'rgba(214,255,240,0.42)';
    c.lineWidth = 2.2;
    for (let k = 0; k < 4; k++) {
      const fx0 = hx + side * (k - 1.5) * 3;
      const fy0 = hy + 2;
      const curl = Math.sin(f * 1.5 + k * 0.8 + side) * 3;
      const ux = (dirx / dl) * 18;
      const uy = (diry / dl) * 18;
      c.beginPath();
      c.moveTo(fx0, fy0);
      c.quadraticCurveTo(fx0 + ux * 0.6 + side * 2, fy0 + uy * 0.6 + 4, fx0 + ux + side * (k - 1.5) * 2 + curl, fy0 + uy + 6 - Math.abs(curl));
      c.stroke();
    }
    sleeve(c);
    c.fillStyle = fill;
    c.fill();
    c.save();
    sleeve(c);
    c.clip();
    c.fillStyle = side > 0 ? 'rgba(20,70,80,0.3)' : 'rgba(255,255,255,0.12)';
    c.fillRect(0, 0, GW, GH);
    // the fold down the sleeve
    c.strokeStyle = 'rgba(20,90,96,0.25)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(sh0[0], sh0[1] + 4);
    c.quadraticCurveTo(ex, ey, hx, hy);
    c.stroke();
    c.restore();
    c.strokeStyle = 'rgba(236,255,250,0.55)';
    c.lineWidth = 1.6;
    sleeve(c);
    c.stroke();
  }
  // the hood's opening: dark, deep, its edge lit; the eyes and the mouth in it
  const hx = sx(0.1) + 1 + Math.sin(f) * 1.5;
  const hy = headY + 26 + Math.sin(f) * 1.5;
  const op = c.createRadialGradient(hx, hy + 2, 2, hx, hy, 20);
  op.addColorStop(0, 'rgba(4,18,24,0.95)');
  op.addColorStop(0.7, 'rgba(10,40,48,0.8)');
  op.addColorStop(1, 'rgba(10,40,48,0)');
  c.fillStyle = op;
  c.beginPath();
  c.ellipse(hx, hy + 2, 17, 21, 0, 0, P2);
  c.fill();
  c.strokeStyle = 'rgba(240,255,252,0.6)';
  c.lineWidth = 2.4;
  c.beginPath();
  c.ellipse(hx, hy + 2, 17, 21, 0, Math.PI * 1.05, Math.PI * 1.95);
  c.stroke();
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) {
    const ex = hx + s * 6.5;
    const ey = hy - 3 - shriek * 1;
    const rad = 6 + shriek * 4;
    const eg = c.createRadialGradient(ex, ey, 0, ex, ey, rad);
    eg.addColorStop(0, 'rgba(240,255,250,1)');
    eg.addColorStop(0.35, 'rgba(120,255,210,0.8)');
    eg.addColorStop(1, 'rgba(60,220,180,0)');
    c.fillStyle = eg;
    c.beginPath();
    c.arc(ex, ey, rad, 0, P2);
    c.fill();
  }
  c.restore();
  // the mouth: a slow moan, a gape when it shrieks, a cold glow down its throat
  const mr = 2.6 + Math.sin(f) ** 2 * 1.6 + shriek * 4;
  const mh = 2 + Math.sin(f) ** 2 * 2.6 + shriek * 7;
  c.fillStyle = 'rgba(0,6,8,0.95)';
  c.beginPath();
  c.ellipse(hx, hy + 10 + shriek * 3, mr, mh, 0, 0, P2);
  c.fill();
  if (shriek > 0.2) {
    c.fillStyle = `rgba(140,255,220,${(0.35 * shriek).toFixed(3)})`;
    c.beginPath();
    c.ellipse(hx, hy + 12 + shriek * 3, mr * 0.45, mh * 0.4, 0, 0, P2);
    c.fill();
  }
}

/** One frame of mist rolling along the floor (phase 0…1 loops): soft billows drifting one way, swelling and
 * thinning as they go, lit on their tops by the room, shaded under. Painted small and drawn up. */
export const MW = 1000;
export const MH = 220;
export const MK = 0.34;
export function mistFrame(c: Ctx, ph: number, seed: number): void {
  const [cv, g] = makeCanvas(Math.ceil(MW * MK), Math.ceil(MH * MK));
  g.scale(MK, MK);
  const n = 20;
  for (let i = 0; i < n; i++) {
    const u = (i / n + ph + Math.sin(i * 7.1 + seed) * 0.02) % 1;
    const x = -120 + u * (MW + 240);
    const edge = smooth(0, 0.12, u) * (1 - smooth(0.88, 1, u));
    const y = MH * 0.64 + Math.sin(i * 2.7 + seed) * MH * 0.1 - (i % 3 === 0 ? MH * 0.1 : 0);
    const rad = MH * (0.24 + 0.1 * Math.sin(i * 1.7 + seed)) * (1 + 0.16 * Math.sin(ph * P2 * 2 + i * 1.3));
    const a = 0.46 * edge * (0.65 + 0.35 * Math.sin(ph * P2 + i));
    if (a < 0.01) continue;
    const bg = g.createRadialGradient(x, y, 0, x, y, rad);
    bg.addColorStop(0, `rgba(196,226,218,${a.toFixed(3)})`);
    bg.addColorStop(0.55, `rgba(176,212,204,${(a * 0.55).toFixed(3)})`);
    bg.addColorStop(1, 'rgba(176,212,204,0)');
    g.fillStyle = bg;
    g.beginPath();
    g.ellipse(x, y, rad * 2.3, rad * 0.8, 0, 0, P2);
    g.fill();
    const lg = g.createRadialGradient(x - rad * 0.3, y - rad * 0.45, 0, x - rad * 0.3, y - rad * 0.45, rad * 0.8);
    lg.addColorStop(0, `rgba(240,255,250,${(a * 0.6).toFixed(3)})`);
    lg.addColorStop(1, 'rgba(240,255,250,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.ellipse(x - rad * 0.3, y - rad * 0.45, rad * 1.1, rad * 0.7, 0, 0, P2);
    g.fill();
    const dg = g.createRadialGradient(x + rad * 0.3, y + rad * 0.4, 0, x + rad * 0.3, y + rad * 0.4, rad * 0.8);
    dg.addColorStop(0, `rgba(40,70,70,${(a * 0.35).toFixed(3)})`);
    dg.addColorStop(1, 'rgba(40,70,70,0)');
    g.fillStyle = dg;
    g.beginPath();
    g.ellipse(x + rad * 0.3, y + rad * 0.4, rad * 1.1, rad * 0.6, 0, 0, P2);
    g.fill();
  }
  // the bed of it, lying low and even
  const bed = g.createLinearGradient(0, MH * 0.5, 0, MH);
  bed.addColorStop(0, 'rgba(176,212,204,0)');
  bed.addColorStop(0.6, 'rgba(176,212,204,0.07)');
  bed.addColorStop(1, 'rgba(176,212,204,0)');
  g.fillStyle = bed;
  g.fillRect(0, MH * 0.5, MW, MH * 0.5);
  c.imageSmoothingEnabled = true;
  c.drawImage(cv, 0, 0, MW, MH);
}

/** A speck of grit or dust (particles): a soft lit fleck. */
export function speckFrame(c: Ctx, s: number, i: number): void {
  const r0 = s / 2;
  const g = c.createRadialGradient(r0 - 1, r0 - 1, 0, r0, r0, r0);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, i % 2 ? 'rgba(220,210,196,0.8)' : 'rgba(240,232,220,0.7)');
  g.addColorStop(1, 'rgba(220,210,196,0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(r0, r0, r0 * (0.7 + (i % 3) * 0.12), r0 * (0.55 + (i % 2) * 0.2), i, 0, P2);
  c.fill();
}

const GATE_N = 10;
const GATE_K = 0.6;
const GATE_MIN = 20;
const GATE_MAX = 80;
export const SMOKE = { w: 70, h: 190 };

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
  deepU: number;
  sink: boolean;
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

registerKitScene(CELLAR, (k, wave0) => {
  const fx = k.slot('fx');
  const deep = k.slot('deep');
  let target = waveK(wave0);
  let shown = target;
  const B = Phaser.BlendModes;

  // ——— light across the stage: the kitchen's light upstairs, the old cellar's green, the cold
  const doorL = k.sprite('doorLight').setBlendMode(B.ADD);
  const ghostL = k.sprite('ghostLight').setBlendMode(B.ADD);
  const cool = k.wash(0x7aa8a4, 0, B.MULTIPLY, fx);
  // the kitchen light off upstairs: the hatch and the stair under it go dark
  const darkKey = k.tex('cl_hatchDark', 128, 128, (c) => {
    const g = c.createRadialGradient(20, 0, 0, 20, 0, 128);
    g.addColorStop(0, '#202a34');
    g.addColorStop(0.5, '#6a7480');
    g.addColorStop(1, '#ffffff');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  const hatchDark = k.img(darkKey, 0, 0, { into: fx, origin: [0, 0], sx: 820 / 128, sy: 760 / 128, alpha: 0 }).setBlendMode(B.MULTIPLY);

  // ——— mist: rolling billows along the foot of the wall and in the tunnel
  const mistKey = sheet(k, 'cl_mist', MW * MK, MH * MK, 12, (c, ph) => {
    c.scale(MK, MK);
    mistFrame(c, ph, 3);
  });
  const mistSc = 1 / MK;
  const deepGhosts = k.sc.add.container(0, 0);
  const tunnelMist = new Loop(k, mistKey, 12, VPX, TY + 6, { into: deep, origin: [0.5, 1], sx: (420 / MW) * mistSc, sy: 0.7 * mistSc, fps: 0.4 });
  deep.add(deepGhosts);
  const wisps = new Parts(k, { frame: 'soft', add: true, into: deep, max: 24 });
  const wispRate = new Rate();
  // the gate: its leaf painted at GATE_N angles, shown by its spring's angle
  const gateKey = sheet(k, 'cl_gate', GATE_BOX.w * GATE_K, GATE_BOX.h * GATE_K, GATE_N, (c, _p, i) => {
    c.scale(GATE_K, GATE_K);
    c.translate(-GATE_BOX.x, -GATE_BOX.y);
    gate(c, ((GATE_MIN + ((GATE_MAX - GATE_MIN) * i) / (GATE_N - 1)) * Math.PI) / 180);
  });
  const gateA = k.img(gateKey, GATE_BOX.x, GATE_BOX.y, { into: deep, origin: [0, 0], scale: 1 / GATE_K });
  const gateB = k.img(gateKey, GATE_BOX.x, GATE_BOX.y, { into: deep, origin: [0, 0], scale: 1 / GATE_K });
  const REST = (GATE_TH * 180) / Math.PI;
  const gateSp = new Spring(REST, 7, 1.0);
  let gateRest = REST;
  let gateNext = 6 + crand() * 6;

  const wallMist = new Loop(k, mistKey, 12, VPX, TY + 40, { into: fx, origin: [0.5, 1], sx: (2200 / MW) * mistSc, sy: 1.1 * mistSc, fps: 0.32 });
  const wallMist2 = new Loop(k, mistKey, 12, VPX + 200, TY + 30, { into: fx, origin: [0.5, 1], sx: (2400 / MW) * mistSc, sy: 0.8 * mistSc, fps: 0.22, phase: 6 });
  wallMist2.each((im) => im.setFlipX(true));
  const puffs = new Parts(k, { frame: 'puff', into: fx, max: 40 });

  // ——— the lantern on its chain (from the third wave a cold light burns in it)
  const L = CX.lantern;
  const lanternSw = new Swing(k.pivot(k.sprite('lantern'), L.x, L.y0), { k: 4.5, c: 0.25, idle: 0.01, seed: 2, speed: 0.6 });
  const lanternGlow = k.glow(L.x, L.y0 + L.len - 12, 120, 0x7af0d0, 0, { into: fx });
  const lanternCore = k.glow(L.x, L.y0 + L.len - 12, 26, 0xd8fff0, 0, { into: fx });

  // ——— the candles: warm and cold flames cross-faded, their glows, smoke when snuffed
  const warmKey = sheet(k, 'cl_flame', FLAME.w, FLAME.h, 10, (c, ph) => flameFrame(c, FLAME.w, FLAME.h, ph, WARM, 3, 2));
  const coldKey = sheet(k, 'cl_flameCold', FLAME.w, FLAME.h, 10, (c, ph) => flameFrame(c, FLAME.w, FLAME.h, ph, COLD, 3, 5));
  const smokeKey = sheet(k, 'cl_smoke', SMOKE.w / 2, SMOKE.h / 2, 12, (c, ph) => {
    c.scale(0.5, 0.5);
    steamFrame(c, SMOKE.w, SMOKE.h, ph, { lit: '#d8d4cc', body: '#9a968e', shade: '#3a3836', a: 0.6, n: 10, seed: 3 });
  });
  const candles = CX.candles.map((c, i) => {
    const glow = k.glow(c.x, c.y - 14, 150, 0xffb050, 0.3, { into: fx });
    const core = k.glow(c.x, c.y - 16, 44, 0xffe0a0, 0.3, { into: fx });
    const smoke = new Loop(k, smokeKey, 12, c.x, c.y - 2, { into: fx, origin: [0.5, 1], fps: 9, scale: 2 });
    smoke.alpha = 0;
    smoke.each((im) => im.setVisible(false));
    const warm = new Loop(k, warmKey, 10, c.x, c.y + 4, { into: fx, origin: [0.5, 1], add: true, fps: 13, phase: i * 2.7 });
    const cold = new Loop(k, coldKey, 10, c.x, c.y + 4, { into: fx, origin: [0.5, 1], add: true, fps: 13, phase: i * 1.9 });
    return { c, i, glow, core, smoke, warm, cold, lean: new Spring(0, 16, 2.4), out: 0, outT: -1, relit: 0, pop: 1 };
  });

  // ——— the ghosts
  const ghostKey = sheet(k, 'cl_ghost', GW * GK, GH * GK, GHOST_N + SHRIEK_N, (c, _p, i) => {
    c.scale(GK, GK);
    if (i < GHOST_N) ghostFrame(c, i / GHOST_N, 0);
    else ghostFrame(c, 0.25, (i - GHOST_N + 1) / SHRIEK_N);
  });
  const ghosts: Ghost[] = [0, 1, 2].map((i) => {
    const mk = () => k.img(ghostKey, 0, 0, { into: fx, origin: [0.5, 0.24] }).setVisible(false);
    const glow = k.glow(0, 0, 140, 0x7af0d0, 0, { into: fx });
    return { a: mk(), b: mk(), s: mk(), glow, on: false, t: 0, dur: 1, pts: [], deepU: -1, sink: false, ph: crand() * GHOST_N, fps: 6 + crand() * 2, shriek: 0, ox: 0, oy: 0, vx: 0, vy: 0, seed: i * 2.1 + crand(), x: 0, y: 0, sc: 1, alpha: 0 };
  });
  const setParent = (g: Ghost, into: Phaser.GameObjects.Container) => {
    if (g.a.parentContainer === into) return;
    for (const im of [g.glow, g.a, g.b, g.s]) into.add(im);
  };
  const launch = (g: Ghost, u0 = 0) => {
    const side = crand() < 0.5 ? -1 : 1;
    const roll = crand();
    const kind = shown < 0.2 || roll < 0.45 ? 'emerge' : roll < 0.75 ? 'cross' : 'sink';
    if (kind === 'cross') {
      g.pts = [
        [VPX - side * 1180, 90 + crand() * 50, 0.8],
        [VPX - side * 420, 50 + crand() * 50, 0.92],
        [VPX + side * 420, 60 + crand() * 50, 0.92],
        [VPX + side * 1180, 100 + crand() * 50, 0.8],
      ];
      g.deepU = -1;
      g.sink = false;
      g.dur = 12 + crand() * 4;
    } else if (kind === 'sink') {
      g.pts = [[VPX + (crand() - 0.5) * 30, 600, 0.3], [VPX + 30, 510, 0.5], [1260, 380, 0.82], [1420 + crand() * 160, 520 + crand() * 80, 0.72]];
      g.deepU = 0.3;
      g.sink = true;
      g.dur = 12 + crand() * 3;
    } else {
      g.pts = [
        [VPX + (crand() - 0.5) * 40, 610, 0.3],
        [VPX + side * 24, 520, 0.5],
        [VPX + side * (260 + crand() * 140), 320 + crand() * 70, 0.88],
        [VPX + side * (920 + crand() * 200), 110 + crand() * 120, 1.06],
      ];
      g.deepU = 0.3;
      g.sink = false;
      g.dur = 13 + crand() * 4;
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
  let spawnIn = 2 + crand() * 3;
  // one already on its way when the room opens
  launch(ghosts[0], 0.42);

  // ——— dust off the vault and the stair, motes in the kitchen's light
  const speckKey = sheet(k, 'cl_speck', 12, 12, 4, (c, _p, i) => speckFrame(c, 12, i));
  const grit = new Parts(k, { frame: 'mote', sheet: { key: speckKey, n: 4, half: 6 }, into: fx, max: 200 });
  const motes = new Parts(k, { frame: 'mote', add: true, into: fx, max: 50 });
  const moteRate = new Rate();

  const applyWave = (w: number) => {
    doorL.setAlpha(1 - 0.92 * smooth(0.4, 0.8, w));
    hatchDark.setAlpha(0.85 * smooth(0.4, 0.8, w));
    ghostL.setAlpha(w * 0.95);
    cool.setAlpha(0.42 * smooth(0.2, 1, w));
    tunnelMist.alpha = 0.55 + 0.45 * w;
    wallMist.alpha = 0.18 + 0.62 * w;
    wallMist2.alpha = 0.1 + 0.5 * w;
    wallMist.each((im) => (im.y = TY + 40 - w * 40));
    wallMist2.each((im) => (im.y = TY + 30 - w * 30));
  };
  applyWave(shown);

  return {
    setWave(w) {
      target = waveK(w);
    },
    impact(x, _y, p) {
      // the gate swings on its hinge (away from the stomp's side), the lantern on its chain
      gateSp.v += (x < VPX ? 1 : -1) * (40 + p * 90) * (0.7 + crand() * 0.6);
      lanternSw.kick((x < L.x ? 1 : -1) * (0.3 + p * 0.6));
      // the candles gutter; a hard stomp snuffs the nearest, and it lights itself again a moment later
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
      // the mist thrown out in a ring along the wall
      const n = Math.round(4 + p * 8);
      for (let i = 0; i < n; i++) {
        const dir = i % 2 ? 1 : -1;
        puffs.spawn({ x: x + dir * (10 + crand() * 40), y: TY - 10 - crand() * 30, vx: dir * (80 + crand() * 160) * (0.5 + p), vy: -10 - crand() * 30, life: 2.4 + crand() * 1.6, r0: 30, r1: 90 + crand() * 50, a: 0.16 * (0.4 + shown), tint: 0xc8e8e0, drag: 1.1, fade: 0.2 });
      }
      // grit and dust off the vault and the stair
      const dust = Math.round(10 + p * 36);
      for (let i = 0; i < dust; i++) {
        const fromStair = crand() < 0.35;
        const sx = fromStair ? 60 + crand() * 520 : crand() * W;
        const sy = fromStair ? CX.stair.top + ((sx - CX.stair.x0) / CX.stair.run) * ((CX.stair.floor - CX.stair.top) / CX.stair.n) + 4 : vaultY(sx) + 2;
        grit.spawn({ x: sx, y: sy, vx: (crand() - 0.5) * 14, vy: 10 + crand() * 40, life: 2 + crand() * 2, r0: 0.9 + crand() * 1.6, a: 0.7, tint: 0xd8ccb8, grav: 140, drag: 0.6, floor: TY - 2 });
      }
    },
    update(dt, t) {
      shown += (target - shown) * Math.min(1, dt * 0.6);
      applyWave(shown);
      const cm = calm();
      // ——— mist
      tunnelMist.step(dt);
      wallMist.step(dt);
      wallMist2.step(dt);
      puffs.update(dt);
      wispRate.tick((0.4 + shown * 1.2) * cm, dt, () => {
        const s = 0.3 + crand() * 0.3;
        const [x, y] = at(VPX + (crand() - 0.5) * 200, 560 + crand() * 120, s);
        wisps.spawn({ x, y, vx: (crand() - 0.5) * 10, vy: -4 - crand() * 8, life: 4 + crand() * 3, r0: 3 + crand() * 3, r1: 2, a: 0.5 + shown * 0.3, tint: 0x9affe0, fade: 0.3 });
      });
      wisps.update(dt);
      // ——— the gate: creaks to and fro on its own, now and then a poltergeist shove, more of them as the night goes
      gateNext -= dt;
      if (gateNext <= 0) {
        gateNext = lerp(10, 4, shown) * (0.6 + crand() * 0.8);
        if (crand() < 0.3 + shown * 0.4) gateSp.v += (crand() < 0.5 ? -1 : 1) * (30 + crand() * 50) * cm;
        else gateRest = REST + (crand() - 0.5) * 16;
      }
      const ang = gateSp.step(gateRest + wander(t * 0.3, 4) * 2 * cm, dt);
      if (gateSp.x < GATE_MIN + 1) {
        gateSp.x = GATE_MIN + 1;
        gateSp.v = Math.abs(gateSp.v) * 0.4;
      } else if (gateSp.x > GATE_MAX - 1) {
        gateSp.x = GATE_MAX - 1;
        gateSp.v = -Math.abs(gateSp.v) * 0.4;
      }
      const gi = ((Phaser.Math.Clamp(ang, GATE_MIN, GATE_MAX) - GATE_MIN) / (GATE_MAX - GATE_MIN)) * (GATE_N - 1);
      const g0 = Math.min(GATE_N - 2, Math.floor(gi));
      gateA.setFrame(g0).setAlpha(1);
      gateB.setFrame(g0 + 1).setAlpha(gi - g0);
      // ——— the lantern
      lanternSw.update(dt, t);
      const la = lanternSw.angle;
      const lx = L.x - Math.sin(la) * (L.len - 12);
      const ly = L.y0 + Math.cos(la) * (L.len - 12);
      const lit = smooth(0.45, 0.75, shown);
      lanternGlow.setPosition(lx, ly).setAlpha(lit * (0.25 + flicker(t * 0.5, 7) * 0.06));
      lanternCore.setPosition(lx, ly).setAlpha(lit * 0.5 * flicker(t, 8));
      // ——— the ghosts
      spawnIn -= dt;
      const active = ghosts.filter((g) => g.on).length;
      if (spawnIn <= 0) {
        spawnIn = lerp(15, 5, shown) * (0.7 + crand() * 0.6);
        const free = ghosts.find((g) => !g.on);
        if (free && active < 1 + Math.round(shown * 2)) launch(free);
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
        // the recoil: a shove that drags out, the offset easing back
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
        const fadeIn = smooth(0, 0.12, u);
        const fadeOut = 1 - smooth(g.sink ? 0.7 : 0.86, 1, u);
        const depthA = 0.45 + 0.55 * smooth(0.3, 0.6, s);
        // (fainter where the feet hover: up the middle of the wall)
        const lane = 1 - 0.5 * Math.exp(-(((g.x - VPX) / 420) ** 2)) * (1 - smooth(380, 480, g.y));
        g.alpha = 0.85 * fadeIn * fadeOut * depthA * lane;
        setParent(g, u < g.deepU ? deepGhosts : fx);
        // frames: the float cycle cross-faded, the shriek over it
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
        // a ghost passing near makes the flame shrink and lean away from it
        let draught = 0;
        let push = 0;
        for (const g of ghosts) {
          if (!g.on) continue;
          const d = Math.hypot(g.x - c.c.x, g.y - c.c.y);
          const k2 = Math.max(0, 1 - d / 380) * g.alpha;
          draught = Math.max(draught, k2);
          push += Math.sign(c.c.x - g.x) * k2;
        }
        const lean = c.lean.step(wander(t * 0.7, c.i * 3) * 0.06 * cm + push * 0.25, dt);
        // snuffed: the flame dies, the smoke curls up, then it lights itself again (cold)
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
          c.smoke.show(Math.min(11.99, c.outT * 5));
        } else if (c.smoke.alpha > 0) {
          c.smoke.alpha = Math.max(0, c.smoke.alpha - dt * 0.5);
          c.smoke.step(dt);
          if (c.smoke.alpha <= 0) c.smoke.each((im) => im.setVisible(false));
        }
        c.pop = Math.min(1, c.pop + dt * 3);
        c.relit = Math.max(0, c.relit - dt * 0.3);
        const coldK = Math.max(smooth(c.c.cold - 0.12, c.c.cold + 0.08, shown), smooth(0, 1, c.relit));
        const fl = flicker(t, c.i * 2.3) * (1 - draught * 0.35);
        const lit = (1 - c.out) * c.pop;
        const sy = lit * (0.92 + 0.12 * fl) * (1 - draught * 0.25);
        c.warm.alpha = lit * (1 - coldK);
        c.cold.alpha = lit * coldK;
        for (const l of [c.warm, c.cold]) {
          l.step(dt, 1 + draught * 0.8);
          l.each((im) => im.setRotation(lean).setScale(0.9 + 0.1 * fl, sy));
        }
        const col = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xffb050), Phaser.Display.Color.ValueToColor(0x60f0c0), 100, coldK * 100);
        const tint = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
        c.glow.setTint(tint).setAlpha(0.3 * lit * fl);
        c.core.setTint(tint).setAlpha(0.32 * lit * fl);
      }
      // ——— dust and motes
      grit.update(dt);
      const kitchen = doorL.alpha;
      moteRate.tick(4 * cm * kitchen, dt, () => {
        const u = crand();
        const x = 40 + u * 520 + crand() * 120;
        const y = 80 + u * 560 + (crand() - 0.5) * 80;
        motes.spawn({ x, y, vx: (crand() - 0.5) * 6, vy: (crand() - 0.3) * 5, life: 5 + crand() * 3, r0: 1 + crand() * 1.4, a: 0.4 * kitchen, tint: 0xffd8a0, fade: 0.3 });
      });
      motes.update(dt);
    },
  };
});
