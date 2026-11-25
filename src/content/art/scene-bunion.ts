// The Pit (BUNION's arena: the mini-boss of Batpeel's Goth-Ham nemesis stage, wave 63; src/game/nemesis.ts), redrawn
// with the location kit (src/art/scene) in the Comics act's light print, of a piece with Goth-Ham Rooftops
// (scene-gotham.ts): painted forms under a light dot screen and inked edges, cold storm blues, sodium amber.
//
// A bottle dungeon under Goth-Ham: an ancient stone well-prison whose walls rise straight from the floor and then lean
// in as a corbelled dome to a far round mouth of stormy night sky, barred with an iron grille. The masonry is old and
// crumbling (blocks fallen out, cracks, lime weeping from the joints, moss where the rain runs down from the mouth).
// Rain falls down the shaft into a shaft of moonlight that lands on the floor at the right, where he trains: a plank
// bench on two stone blocks, a barbell of iron pipe and two old flywheels on a pipe rack, two kettle weights, a taped
// leather punch bag hung from the walkway on a chain, and a tally of days scratched on the wall. Rusted iron walkways
// spiral up the wall (the turn across the back has fallen, its ends hanging), with ladders between, barred cell doors
// set into the stone at their level, and two long chains hanging from rings in the dome. On the left a hand-cranked
// winch on a timber frame hauls a rope up to a davit on the walkway; a caged work lamp under the walkway throws its
// amber on the wall. At the sides stands his Venom rig: two tall glass tanks of glowing green Venom with steel bands,
// pressure dials and valve wheels, their tubes snaking up the walls into the dark. Green glow against cold blue stone.
// Everything here is our own.
//
// Live (the heroes):
// - the Venom: painted at 12 phases boiling in its tanks (volumes churning, dark tendrils turning as they rise, bubbles
//   swelling, a frothing surface), its glow on the walls breathing, its tubes carrying pulses of green up the walls;
// - the rain: drops falling down the shaft from the grille, lit where they cross the moonlight, splashing in painted
//   crowns on the floor and the table's puddles; drips off the walkways, the pipes and the tank caps;
// - the chains: links on a hanging rope with physics (and the punch bag on its spring) that swing and clank.
// The fight drives it (the bunion brain in src/game/bosses/gotham.ts emits these): 'bunion-pump' (a vial fills: the
// tanks boil hard, the glow flares, the tubes pulse and the dials kick), 'bunion-surge' (all three full: the tanks
// roar, everything strobes green, the chains rattle), 'bunion-drain' (a vial drained: the glow gutters),
// 'bunion-spent' (the Venom spent or the vials lost: the glow sinks low) and 'bunion-break' (THE BREAK: the chains
// jump). Lightning over the mouth now and then blazes the sky behind the grille and flashes down the shaft. The
// caged lamp flickers; the dials' needles twitch with the pressure and kick at a pump. A stomp sends dust and grit
// off the walls, swings the chains and the bag, slops the Venom and splashes the puddles. On the
// stages page, with no fight to hear, the rig runs through a pump, surge and spend cycle on its own.
// (The old art is kept in scenes-gotham.ts and its old live layer in live/gotham.ts for the before/after page.)

import Phaser from 'phaser';
import {
  type Box,
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
  rrPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { shaft } from '../../art/scene/light';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { benDay, dots, ink, linTone } from '../../art/scene/print';
import { cloud } from '../../art/scene/sky';
import { floorPlane } from '../../art/scene/surfaces';
import { MATERIALS } from '../../art/style/materials';
import { mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, flicker, registerKitScene, wander } from '../../game/sceneLive';
import { Loop, Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { SPLASH, ringTex, splashFrame } from './scene-gotham';

// ——— layout ———

export const PT = {
  /** The mouth of the shaft: the far circle of sky. */
  sky: { x: 960, y: 150, rx: 300, ry: 86 },
  /** Where the straight wall ends and the dome begins (in shaft height, 0 floor … 1 mouth). */
  u1: 0.35,
  /** The Venom tanks (centre x): keep them at the sides. */
  tanks: [250, 1670],
  /** A tank's glass (half width, top, bottom), its cap's crown, its plinth's top and foot. */
  tank: { rx: 84, top: 404, bottom: 684, cap: 352, plinth: 700, foot: 748 },
  winch: { x: 700, y: 736 },
  gym: { x: 1222, y: 744 },
  front: 1040,
};

const INK = '#0a0e1a';
const P2 = Math.PI * 2;
const SODIUM = '#ffb45a';
const MOONLIT = '#c8d6f0';
const VENOM = '#7dff6a';
const VENOM_HOT = '#e0ffc0';
const VENOM_DEEP = '#0c3a14';
const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const STONE = { ...MATERIALS.stone, name: 'Damp limestone', shadowTint: '#060a18', tex: 'grain' as const, texA: 0.3, bevel: 0.16, rim: 0.2, specA: 0.1, specSize: 0.12 };
const IRON = { ...MATERIALS.iron, shadowTint: '#06080e' };
const RUST = '#6a3a24';

// ——— the shaft's geometry: a bottle dungeon, straight walls to the springing, then a dome to the mouth ———
//
// A course of the wall at shaft height u (0 the floor … 1 the mouth) is an ellipse round (960, cy): the back of it is
// its lowest point, its sides run up the screen's edges and the near half arches overhead. φ goes round it (0 at the
// back, ±π/2 the sides, π overhead); ρ < 1 is a point in from the wall (a walkway's edge).

export function ring(u: number): { cy: number; rx: number; ry: number } {
  if (u <= PT.u1) {
    const k = u / PT.u1;
    const rx = 1800 * (1 - 0.1 * k);
    const ry = 300 * (1 - 0.25 * k);
    return { cy: 720 - 330 * k - ry, rx, ry };
  }
  const t = Math.min(1, (u - PT.u1) / (1 - PT.u1));
  const s = Math.sin((t * Math.PI) / 2);
  const c = Math.cos((t * Math.PI) / 2);
  const rx = 300 + 1320 * c ** 1.1;
  const ry = 225 - 139 * t;
  return { cy: 390 - 154 * s - ry, rx, ry };
}

export function at(u: number, phi: number, rho = 1): [number, number] {
  const g = ring(u);
  return [960 + rho * g.rx * Math.sin(phi), g.cy + rho * g.ry * Math.cos(phi)];
}

/** The floor's edge against the wall at screen x. */
export const wallFoot = (x: number): number => {
  const g = ring(0);
  const d = (x - 960) / g.rx;
  return g.cy + g.ry * Math.sqrt(Math.max(0, 1 - d * d));
};

/** A path along a course from φ0 to φ1 at ρ (and back along another, to make a band). */
function arcPts(u: number | ((phi: number) => number), p0: number, p1: number, rho = 1, n = 24): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const p = p0 + ((p1 - p0) * i) / n;
    out.push(at(typeof u === 'number' ? u : u(p), p, rho));
  }
  return out;
}

const band = (a: [number, number][], b: [number, number][]): PathFn => polyPath([...a, ...b.slice().reverse()]);

const COURSES: number[] = (() => {
  const out: number[] = [];
  for (let i = 0; i <= 8; i++) out.push((i / 8) * PT.u1);
  for (let i = 1; i <= 24; i++) out.push(PT.u1 + (1 - PT.u1) * (1 - (1 - i / 24) ** 1.25));
  return out;
})();

/** Each course's joints (φ, round the whole ring): stones of uneven lengths, fewer round the narrowing dome. */
const JOINTS = (): number[][] => {
  const r = rng(6401);
  return COURSES.slice(0, -1).map((u0, k) => {
    const g = ring((u0 + COURSES[k + 1]) / 2);
    const n = Math.max(16, Math.round((78 * g.rx) / 1800));
    const ws = Array.from({ length: n }, () => 0.6 + r() * 0.8);
    const sum = ws.reduce((a, b) => a + b, 0);
    const out: number[] = [];
    let p = -Math.PI + r() * (P2 / n);
    for (const w of ws) {
      out.push(p);
      p += (w / sum) * P2;
    }
    out.push(out[0] + P2);
    return out;
  });
};

/** How lit the wall is at (u, φ): the mouth's sky light falling down the shaft, the overhead half in its own shade. */
function wallLight(u: number, phi: number): number {
  const back = Math.cos(phi);
  const sky = smooth(0.2, 1, u);
  let l = 0.14 + 0.62 * sky ** 1.4 * (0.6 + 0.4 * Math.max(0, back));
  if (back < 0) l *= 0.55 + 0.45 * smooth(0.9, 1, u);
  // the moon's patch on the far right of the shaft
  const mp = Math.exp(-(((phi - 0.42) / 0.32) ** 2) - (((u - 0.5) / 0.2) ** 2));
  return l + 0.22 * mp;
}

// ——— the wall ———

const WALL_DARK = '#121824';
const WALL_LIT = '#7c8aa2';

function walls(ctx: Ctx, r: R): void {
  vfill(ctx, 0, 0, W, TY, [[0, '#0c111c'], [0.5, '#161e2c'], [1, '#0e121a']]);
  surface(ctx, r, { x: 0, y: 0, w: W, h: TY }, '#1c2434', { vary: 0.55, warm: '#3a4458', cool: '#0a0e18', cells: 6, mottle: 0.45, strokes: 0.25, strokeAng: Math.PI / 2, grain: 0.16, seed: 631 });
  // the blocks, course by course: big old stones of uneven lengths, each its own colour, its face lit from the mouth
  // (paler along its top arris, darker into its foot), as much as the sky reaches it
  const holes: [number, number, number, number][] = [];
  const joints = JOINTS();
  for (let k = 0; k < COURSES.length - 1; k++) {
    const u0 = COURSES[k];
    const u1 = COURSES[k + 1];
    const js = joints[k];
    for (let j = 0; j < js.length - 1; j++) {
      const p0 = js[j];
      const p1 = js[j + 1];
      const pts = [...arcPts(u0, p0, p1, 1, 3), ...arcPts(u1, p1, p0, 1, 3)];
      const l0 = r();
      const v = r();
      let vis = false;
      for (const [x, y] of pts) if (x > -30 && x < W + 30 && y > -30 && y < TY + 10) vis = true;
      if (!vis) continue;
      const pm = (p0 + p1) / 2;
      const um = (u0 + u1) / 2;
      const l = wallLight(um, pm) * (0.7 + l0 * 0.55);
      const c0 = mix(WALL_DARK, WALL_LIT, Math.min(1, l));
      const c = v > 0.92 ? mix(c0, '#3e5030', 0.4) : v > 0.84 ? mix(c0, '#a0a4a0', 0.14) : v < 0.12 ? mix(c0, '#2a2a34', 0.3) : c0;
      // a block fallen out (more down low and at the sides, none in the middle of the back where the feet hover)
      const calmZone = Math.abs(Math.sin(pm)) < 0.3 && Math.cos(pm) > 0 && um < 0.75;
      if (v > 0.5 && v < 0.545 && !calmZone && um < 0.92) holes.push([um, pm, u1 - u0, p1 - p0]);
      const [tx, ty] = at(u1, pm);
      const [bx, by] = at(u0, pm);
      const gg = ctx.createLinearGradient(tx, ty, bx, by);
      gg.addColorStop(0, rgba(mix(c, WALL_LIT, 0.18), 0.8));
      gg.addColorStop(0.25, rgba(c, 0.72));
      gg.addColorStop(1, rgba(mix(c, '#05070c', 0.35), 0.8));
      ctx.fillStyle = gg;
      polyPath(pts)(ctx);
      ctx.fill();
    }
  }
  // the mortar: each course's joint dark and recessed, the top arris of the block below it catching the light
  ctx.save();
  ctx.lineCap = 'round';
  for (let k = 1; k < COURSES.length - 1; k++) {
    const u = COURSES[k];
    const g = ring(u);
    const s = g.rx / 1800;
    const line = (uu: number, col: string, w: number) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      const pts = arcPts(uu, -Math.PI, Math.PI, 1, 96);
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    };
    const sky = smooth(0.3, 1, u);
    line(u, `rgba(3,5,10,${(0.75 - 0.35 * smooth(0.4, 1, u)).toFixed(3)})`, 1 + 3.4 * s);
    line(u - 0.004 * s, rgba(MOONLIT, 0.05 + 0.14 * sky), 0.6 + 1.2 * s);
  }
  // the vertical joints
  for (let k = 0; k < COURSES.length - 1; k++) {
    const u0 = COURSES[k];
    const u1 = COURSES[k + 1];
    const g = ring((u0 + u1) / 2);
    ctx.strokeStyle = 'rgba(3,5,10,0.65)';
    ctx.lineWidth = 0.8 + 3 * (g.rx / 1800);
    ctx.beginPath();
    for (const p of joints[k]) {
      const a = at(u0, p);
      const b = at(u1, p);
      if ((a[0] < -20 && b[0] < -20) || (a[0] > W + 20 && b[0] > W + 20) || (a[1] > TY && b[1] > TY)) continue;
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    // the left arris of each block catches a little of the light
    ctx.strokeStyle = rgba(MOONLIT, 0.06 + 0.1 * smooth(0.3, 1, u0));
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const p of joints[k]) {
      const a = at(u0, p + 0.004);
      const b = at(u1, p + 0.004);
      if ((a[0] < -20 && b[0] < -20) || (a[0] > W + 20 && b[0] > W + 20) || (a[1] > TY && b[1] > TY)) continue;
      ctx.moveTo(a[0] + 1.5, a[1]);
      ctx.lineTo(b[0] + 1.5, b[1]);
    }
    ctx.stroke();
  }
  ctx.restore();
  // fallen blocks: dark recesses, their top in shadow, their sill lit, rubble's dust on the sill
  for (const [um, pm, du, dp] of holes) {
    const pts = [...arcPts(um - du * 0.42, pm - dp * 0.42, pm + dp * 0.42, 1, 3), ...arcPts(um + du * 0.42, pm + dp * 0.42, pm - dp * 0.42, 1, 3)];
    const p = polyPath(pts);
    ctx.fillStyle = '#05070c';
    p(ctx);
    ctx.fill();
    within(ctx, p, () => {
      const [x0, y0] = at(um + du * 0.42, pm);
      const [x1, y1] = at(um - du * 0.42, pm);
      const gg = ctx.createLinearGradient(x0, y0, x1, y1);
      gg.addColorStop(0, 'rgba(0,0,0,0.6)');
      gg.addColorStop(0.7, 'rgba(40,48,64,0.0)');
      gg.addColorStop(1, rgba(MOONLIT, 0.22 * smooth(0.2, 1, um) + 0.05));
      ctx.fillStyle = gg;
      ctx.fillRect(Math.min(x0, x1) - 200, Math.min(y0, y1) - 60, 400, Math.abs(y1 - y0) + 120);
    });
    ink(ctx, p, 1 + (ring(um).rx / 1800) * 1.6, INK, 0.3);
  }
  // water down the walls from the mouth: wet runs along the meridians, lime weeping white out of the joints, moss
  // where the runs are slow; and a dark tide where the floor's damp climbs the wall
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const p = (r() - 0.5) * P2;
    const ua = 0.98 - r() * 0.05;
    const ub = Math.max(0, ua - 0.3 - r() * 0.6);
    const pts: [number, number][] = [];
    for (let k = 0; k <= 30; k++) pts.push(at(ua + (ub - ua) * (k / 30), p + Math.sin(k * 0.6 + i) * 0.006));
    const w = 2 + r() * 4;
    ctx.strokeStyle = 'rgba(2,4,10,0.3)';
    ctx.lineWidth = w * 1.8;
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = rgba(MOONLIT, 0.08 + r() * 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x - w * 0.4, y) : ctx.moveTo(x - w * 0.4, y)));
    ctx.stroke();
  }
  // lime weeping out of the joints (white tears under a course)
  for (let i = 0; i < 70; i++) {
    const k = 1 + Math.floor(r() * (COURSES.length - 4));
    const p = (r() - 0.5) * P2;
    const [x, y] = at(COURSES[k], p);
    if (x < 0 || x > W || y > TY - 20 || y < 0) continue;
    if (Math.abs(x - 960) < 360 && y > 220) continue;
    const s = ring(COURSES[k]).rx / 1800;
    const len = (10 + r() * 30) * s;
    const gl = ctx.createLinearGradient(0, y, 0, y + len);
    gl.addColorStop(0, 'rgba(196,204,200,0.32)');
    gl.addColorStop(1, 'rgba(196,204,200,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y);
    ctx.quadraticCurveTo(x - 2 * s, y + len * 0.7, x, y + len);
    ctx.quadraticCurveTo(x + 2 * s, y + len * 0.7, x + 4 * s, y);
    ctx.fill();
  }
  ctx.restore();
  lay(ctx, noiseMask(12, 641, { cover: 0.3, soft: 0.2, col: '#26341e' }), { x: 0, y: 0, w: 560, h: TY }, 0.5);
  lay(ctx, noiseMask(12, 642, { cover: 0.3, soft: 0.2, col: '#26341e' }), { x: W - 560, y: 0, w: 560, h: TY }, 0.5);
  lay(ctx, noiseMask(10, 643, { cover: 0.42, soft: 0.3, col: '#05070c' }), { x: 0, y: 420, w: W, h: TY - 420 }, 0.45);
  // cracks where the dome springs (the stress gathers there) and under the fallen turn of the walkway
  for (const [p, len] of [[-0.9, 60], [-0.6, 80], [0.62, 70], [0.95, 50], [2.4, 40], [-2.3, 46]] as const) {
    const [x, y] = at(PT.u1 + 0.01, p);
    if (x < 0 || x > W) continue;
    ctx.strokeStyle = 'rgba(2,3,8,0.7)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x;
    let cy = y;
    for (let k = 0; k < 8; k++) {
      cx += (r() - 0.5) * 16;
      cy += len / 8;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  wallLightPass(ctx);
}

/** The light in the shaft: the sky's glow round the mouth, the moon's patch on the right, the dark gathering low. */
function wallLightPass(ctx: Ctx): void {
  const S = PT.sky;
  glowAt(ctx, S.x, S.y + 40, 620, '#8ca2c8', 0.16, 0.8);
  glowAt(ctx, S.x, S.y + 20, 360, '#b8c8e8', 0.14, 0.7);
  lightPool(ctx, 1240, 330, 300, 230, MOONLIT, 0.12);
  lightPool(ctx, S.x, S.y + S.ry + 26, 300, 46, SODIUM, 0.1);
  // the dark gathering down the shaft and at the sides, the floor's damp tide
  vfill(ctx, 0, 300, W, TY - 300, [[0, 'rgba(4,6,12,0)'], [0.6, 'rgba(4,6,12,0.3)'], [1, 'rgba(4,6,12,0.55)']]);
  const sg = ctx.createLinearGradient(0, 0, W, 0);
  sg.addColorStop(0, 'rgba(4,6,12,0.45)');
  sg.addColorStop(0.25, 'rgba(4,6,12,0)');
  sg.addColorStop(0.75, 'rgba(4,6,12,0)');
  sg.addColorStop(1, 'rgba(4,6,12,0.4)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, TY);
  // the overhead half of the dome, round the top of the screen, in its own deep shade
  vfill(ctx, 0, 0, W, 110, [[0, 'rgba(2,3,8,0.5)'], [1, 'rgba(2,3,8,0)']]);
  // the printed shade: a navy screen deepening down the shaft and into the corners
  dots(ctx, { x: 0, y: 0, w: W, h: TY }, (x, y) => {
    const dm = Math.hypot((x - 960) / 1.6, y - 190) / 900;
    return 0.1 + 0.45 * smooth(0.25, 1.1, dm);
  }, '#02040c', { step: 9, angle: 0.79, a: 0.32, floor: 0.08 });
}

// ——— the mouth: the sky through the grille ———

const SKY_BOX: Box = { x: PT.sky.x - PT.sky.rx - 4, y: PT.sky.y - PT.sky.ry - 4, w: PT.sky.rx * 2 + 8, h: PT.sky.ry * 2 + 8 };
const skyPath = ellPath(PT.sky.x, PT.sky.y, PT.sky.rx, PT.sky.ry);
const cloudPal = (k: number) => ({ lit: mix('#aab8d4', '#4a5670', k), body: mix('#3a4660', '#1c2234', k), shadow: mix('#141a2a', '#080a14', k) });

function skyDisc(ctx: Ctx, r: R): void {
  const S = PT.sky;
  within(ctx, skyPath, () => {
    vfill(ctx, SKY_BOX.x, SKY_BOX.y, SKY_BOX.w, SKY_BOX.h, [[0, '#0c1424'], [0.6, '#1a2840'], [1, '#22344c']]);
    // the moon is off to the left beyond the rim: its glow on that side, the storm's clouds lit from it
    glowAt(ctx, S.x - S.rx - 20, S.y - 30, 260, '#c8d6f0', 0.4);
    for (const [x, y, w, h, k] of [[850, 120, 300, 60, 0.3], [1080, 150, 340, 60, 0.5], [920, 200, 360, 50, 0.6], [760, 180, 220, 46, 0.45]] as const)
      cloud(ctx, r, x, y, w, h, { ...cloudPal(k), sunX: S.x - S.rx - 120, sunY: S.y - 80, rim: 0.7, kind: 'bank', wisp: 0.5, a: 0.95 });
    // the city's sodium glow from the streets round the mouth, warm on the cloud's underside
    const sg = ctx.createLinearGradient(0, S.y - S.ry, 0, S.y + S.ry);
    sg.addColorStop(0, 'rgba(255,170,90,0.16)');
    sg.addColorStop(0.4, 'rgba(255,170,90,0.06)');
    sg.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(SKY_BOX.x, SKY_BOX.y, SKY_BOX.w, SKY_BOX.h);
    benDay(ctx, SKY_BOX, '#02040c', 0.24, 7, 0.4, 0.1);
    // rain curtains under the cloud
    ctx.strokeStyle = 'rgba(170,186,220,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const x = SKY_BOX.x + r() * SKY_BOX.w;
      const y = SKY_BOX.y + 40 + r() * 100;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y + 26);
    }
    ctx.stroke();
  });
}

/** The mouth's collar and its iron grille: the stone lip (the far side lit by the sky, the near side overhead dark),
 * the grille's bars across the sky (their undersides in shade, rain beading on them), a pulley block hung from it. */
const GRILLE_BOX: Box = { x: PT.sky.x - PT.sky.rx - 30, y: PT.sky.y - PT.sky.ry - 30, w: PT.sky.rx * 2 + 60, h: PT.sky.ry * 2 + 64 };
function grille(ctx: Ctx): void {
  const S = PT.sky;
  // the lip: a thick band round the mouth
  const outer = ellPath(S.x, S.y + 6, S.rx + 22, S.ry + 18);
  ctx.save();
  outer(ctx);
  ctx.ellipse(S.x, S.y, S.rx, S.ry, 0, 0, P2, true);
  const lg = ctx.createLinearGradient(0, S.y - S.ry - 12, 0, S.y + S.ry + 24);
  lg.addColorStop(0, '#0c1018');
  lg.addColorStop(0.55, '#3a4458');
  lg.addColorStop(1, '#7a88a0');
  ctx.fillStyle = lg;
  ctx.fill('evenodd');
  ctx.restore();
  ink(ctx, skyPath, 3, INK, 0.2);
  // the bars: two long ones across, three short, riveted where they cross; seen from below, in silhouette with a
  // cold rim of sky on their tops
  const bars: [number, number, number, number, number][] = [];
  for (const dx of [-180, -60, 60, 180]) {
    const xt = dx * 1.1;
    const xb = dx * 0.86;
    const ht = S.ry * Math.sqrt(Math.max(0, 1 - (xt / S.rx) ** 2));
    const hb = S.ry * Math.sqrt(Math.max(0, 1 - (xb / S.rx) ** 2));
    bars.push([S.x + xt, S.y - ht - 10, S.x + xb, S.y + hb + 8, 9]);
  }
  for (const [dy, bw] of [[-34, 10], [30, 7]] as const) {
    const w = S.rx * Math.sqrt(1 - (dy / S.ry) ** 2);
    bars.push([S.x - w - 12, S.y + dy, S.x + w + 12, S.y + dy + 3, bw]);
  }
  ctx.save();
  ctx.lineCap = 'butt';
  for (const [x0, y0, x1, y1, w] of bars) {
    ctx.strokeStyle = '#06080e';
    ctx.lineWidth = w + 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = '#1e2430';
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = rgba(MOONLIT, 0.4);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const vert = Math.abs(x1 - x0) < Math.abs(y1 - y0);
    ctx.moveTo(x0 - (vert ? w * 0.3 : 0), y0 - (vert ? 0 : w * 0.3));
    ctx.lineTo(x1 - (vert ? w * 0.3 : 0), y1 - (vert ? 0 : w * 0.3));
    ctx.stroke();
  }
  ctx.restore();
  // rust run down from the grille's feet on the lip
  for (const dx0 of [-180, -60, 60, 180]) {
    const dx = dx0 * 0.86;
    const h = S.ry * Math.sqrt(1 - (dx / S.rx) ** 2);
    const g = ctx.createLinearGradient(0, S.y + h, 0, S.y + h + 26);
    g.addColorStop(0, rgba(RUST, 0.5));
    g.addColorStop(1, rgba(RUST, 0));
    ctx.fillStyle = g;
    ctx.fillRect(S.x + dx - 3, S.y + h + 4, 10, 26);
  }
}

// ——— the moon's shaft down the pit ———

const BEAM_TOP: [number, number, number, number] = [800, 196, 1050, 226];
const BEAM_BOT: [number, number, number, number] = [1110, 742, 1520, 742];
function moonShaft(ctx: Ctx, r: R): void {
  // the damp hanging low in the pit, cold; green round the tanks
  haze(ctx, 520, TY + 6, '#5a6a84', 0.16, 0.75);
  for (const x of PT.tanks) lightPool(ctx, x, 690, 300, 90, '#3a6a40', 0.1, 'source-over');
  shaft(ctx, r, BEAM_TOP, BEAM_BOT, MOONLIT, 0.09, { streaks: 7, motes: 0 });
  // its pool on the floor round the gym, and where it grazes the wall behind
  lightPool(ctx, 1260, 734, 300, 34, MOONLIT, 0.16);
  lightPool(ctx, 1360, 640, 200, 90, MOONLIT, 0.06);
}

// ——— iron: walkways, ladders, doors, pipes ———

interface Walk {
  /** Its course (u) at φ0 and φ1: it spirals up as it goes round. */
  u0: number;
  u1: number;
  p0: number;
  p1: number;
  /** Which end has fallen (its broken end hangs). */
  broken: 0 | 1 | -1;
  /** Below the eye (the lower turns): seen from above, its grating deck and railing; above it, from underneath. */
  above?: boolean;
}
export const WALKS: Walk[] = [
  { u0: 0.165, u1: 0.215, p0: -0.17, p1: -0.8, broken: -1, above: true },
  { u0: 0.255, u1: 0.305, p0: 0.2, p1: 0.8, broken: -1, above: true },
  { u0: 0.5, u1: 0.56, p0: -0.3, p1: -1.2, broken: -1 },
  { u0: 0.64, u1: 0.72, p0: 0.34, p1: 1.6, broken: -1 },
];
const DECK = 0.15;
const RAIL = 0.045;
const walkU = (w: Walk) => (p: number) => w.u0 + ((w.u1 - w.u0) * (p - w.p0)) / (w.p1 - w.p0);
const sizeAt = (u: number) => ring(u).rx / 1800;

function walkway(ctx: Ctx, w: Walk): void {
  const U = walkU(w);
  const s = sizeAt((w.u0 + w.u1) / 2);
  const n = 28;
  const wall = arcPts(U, w.p0, w.p1, 1, n);
  const edge = arcPts(U, w.p0, w.p1, 1 - DECK, n);
  const lip = arcPts((p) => U(p) - 0.012, w.p0, w.p1, 1 - DECK, n);
  const railTop = arcPts((p) => U(p) + RAIL, w.p0, w.p1, 1 - DECK, n);
  const railMid = arcPts((p) => U(p) + RAIL * 0.5, w.p0, w.p1, 1 - DECK, n);
  const deck = band(wall, edge);
  const fascia = band(edge, lip);
  const lightK = 0.4 + 0.6 * smooth(0.15, 0.8, (w.u0 + w.u1) / 2);
  // its shadow on the wall below it, cast down-right
  castShadow(ctx, band(wall, lip), 18 * s, 14 * s, 0.5, '#02040a');
  // the brackets: angle irons from the wall up under the deck
  const nb = 6;
  for (let i = 0; i <= nb; i++) {
    const p = w.p0 + ((w.p1 - w.p0) * i) / nb;
    if (w.broken === (i === nb ? 1 : i === 0 ? -1 : 2)) continue;
    const a = at(U(p) - 0.04, p);
    const b = at(U(p), p);
    const c = at(U(p), p, 1 - DECK * 0.9);
    const br = polyPath([a, b, c]);
    ctx.strokeStyle = '#141820';
    ctx.lineWidth = 5 * s + 1.5;
    ctx.lineJoin = 'round';
    br(ctx);
    ctx.stroke();
    ctx.strokeStyle = rgba(MOONLIT, 0.18 * lightK);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a[0] - 1, a[1]);
    ctx.lineTo(c[0] - 1, c[1]);
    ctx.stroke();
  }
  // the deck seen from below: a dark grating, the sky through its mesh in lines
  ctx.fillStyle = '#141820';
  deck(ctx);
  ctx.fill();
  within(ctx, deck, () => {
    ctx.strokeStyle = rgba('#5a6a84', 0.35 * lightK);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const p = w.p0 + ((w.p1 - w.p0) * i) / 60;
      const a = at(U(p), p);
      const b = at(U(p), p, 1 - DECK);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
  });
  ink(ctx, deck, 1 + 1.4 * s, INK, 0.2);
  // the fascia: a flat bar along the deck's edge, its top lit, rust bleeding down it
  solid(ctx, fascia, { x: 0, y: 0, w: W, h: TY }, IRON, mix('#3a4250', RUST, 0.25), { depth: 0.3 + 0.4 * (1 - s), line: 1 + 1.2 * s, formSize: 4 });
  ctx.strokeStyle = rgba(MOONLIT, 0.3 * lightK);
  ctx.lineWidth = 1;
  ctx.beginPath();
  edge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  // the railing: stanchions up from the edge, a top rail and a mid rail
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#10141c';
  ctx.lineWidth = 3.4 * s + 1.2;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const p = w.p0 + ((w.p1 - w.p0) * i) / 8;
    if ((w.broken === 1 && i === 8) || (w.broken === -1 && i === 0)) continue;
    const a = at(U(p), p, 1 - DECK);
    const b = at(U(p) + RAIL, p, 1 - DECK);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  for (const line of [railTop, railMid]) line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = rgba(MOONLIT, 0.28 * lightK);
  ctx.lineWidth = 1;
  ctx.beginPath();
  railTop.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 1) : ctx.moveTo(x, y - 1)));
  ctx.stroke();
}

/** A point on a walkway's front edge, out from the wall point (x, y) towards us: below it and in towards the middle
 * (a lower turn, seen from above). */
const DECK_H = 34;
const RAIL_H = 50;
const frontOf = ([x, y]: [number, number], s: number): [number, number] => [x + (960 - x) * 0.05, y + DECK_H * s];

/** A lower turn of the walkway, seen from a little above: an iron grating deck (the moon on its mesh), a flat-bar
 * fascia with rust bled down it, angle-iron struts to the wall below, a railing of stanchions with a top and a mid rail,
 * its shadow thrown on the wall. */
function walkwayTop(ctx: Ctx, w: Walk): void {
  const U = walkU(w);
  const s = sizeAt((w.u0 + w.u1) / 2);
  const n = 28;
  const wall = arcPts(U, w.p0, w.p1, 1, n);
  const edge = wall.map((q) => frontOf(q, s));
  const lipB = edge.map(([x, y]) => [x, y + 9 * s] as [number, number]);
  const deck = band(wall, edge);
  const fascia = band(edge, lipB);
  castShadow(ctx, band(wall, lipB), 26 * s, 18 * s, 0.55, '#02040a');
  // the struts: from under the fascia back down to the wall
  ctx.lineCap = 'round';
  for (let i = 0; i <= 6; i++) {
    const p = w.p0 + ((w.p1 - w.p0) * (i === 0 ? 0.04 : i)) / 6;
    const a = frontOf(at(U(p), p), s);
    const b = at(U(p) - 0.05, p);
    ctx.strokeStyle = 'rgba(2,3,8,0.35)';
    ctx.lineWidth = 6 * s + 2;
    ctx.beginPath();
    ctx.moveTo(a[0] + 8, a[1] + 16);
    ctx.lineTo(b[0] + 8, b[1] + 10);
    ctx.stroke();
    ctx.strokeStyle = '#161a22';
    ctx.lineWidth = 5 * s + 1.5;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] + 8 * s);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.strokeStyle = rgba(MOONLIT, 0.14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a[0] - 1.5, a[1] + 8 * s);
    ctx.lineTo(b[0] - 1.5, b[1]);
    ctx.stroke();
  }
  // the deck: dark grating, the light in its mesh
  ctx.fillStyle = '#1c222c';
  deck(ctx);
  ctx.fill();
  within(ctx, deck, () => {
    ctx.strokeStyle = rgba('#8a9ab8', 0.24);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const p = w.p0 + ((w.p1 - w.p0) * i) / 90;
      const a = at(U(p), p);
      const b = frontOf(a, s);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    for (const k of [0.33, 0.66]) {
      wall.forEach(([x, y], i) => {
        const [ex, ey] = edge[i];
        const px = x + (ex - x) * k;
        const py = y + (ey - y) * k;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
    }
    ctx.stroke();
    // wet: the sky's sheen on it, grime gathered against the wall
    const g = ctx.createLinearGradient(0, wall[0][1], 0, edge[0][1]);
    g.addColorStop(0, 'rgba(2,4,8,0.5)');
    g.addColorStop(1, rgba(MOONLIT, 0.08));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, TY);
  });
  ink(ctx, deck, 1.6, INK, 0.2);
  solid(ctx, fascia, { x: 0, y: 0, w: W, h: TY }, IRON, mix('#3e4654', RUST, 0.3), { depth: 0.2, line: 1.6, formSize: 4 });
  within(ctx, fascia, () => {
    ctx.fillStyle = rgba(RUST, 0.35);
    for (let i = 0; i < 14; i++) {
      const [x, y] = edge[Math.floor((i / 14) * n)];
      ctx.fillRect(x, y, 4, 9 * s);
    }
  });
  ctx.strokeStyle = rgba(MOONLIT, 0.45);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  edge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  // the railing along the front edge
  const top = edge.map(([x, y]) => [x, y - RAIL_H * s] as [number, number]);
  const mid = edge.map(([x, y]) => [x, y - RAIL_H * s * 0.5] as [number, number]);
  const posts: [number, number][] = [];
  for (let i = 0; i <= 10; i++) if (!(w.broken === -1 && i === 0)) posts.push(edge[Math.round((i / 10) * n)]);
  const railLine = (dx: number, dy: number) => {
    ctx.beginPath();
    for (const [x, y] of posts) {
      ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x + dx, y - RAIL_H * s + dy);
    }
    for (const line of [top, mid]) line.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
  };
  ctx.strokeStyle = 'rgba(2,3,8,0.3)';
  ctx.lineWidth = 3.4 * s + 1;
  railLine(10, 14);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4 * s + 1.6;
  railLine(0, 0);
  ctx.stroke();
  ctx.strokeStyle = '#3a414c';
  ctx.lineWidth = 2.2 * s;
  railLine(0, 0);
  ctx.stroke();
  ctx.strokeStyle = rgba(MOONLIT, 0.4);
  ctx.lineWidth = 1;
  ctx.beginPath();
  top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 1) : ctx.moveTo(x, y - 1)));
  ctx.stroke();
}

/** A lower turn's torn end: the deck's grating bent down, the rails snapped and hanging. */
function brokenEndTop(ctx: Ctx, w: Walk): void {
  const U = walkU(w);
  const p = w.p0;
  const s = sizeAt(U(p));
  const a = frontOf(at(U(p), p), s);
  const dir = Math.sign(w.p0 - w.p1);
  // the grating's torn edge, bent down
  const wl = at(U(p), p);
  const flap = polyPath([wl, a, [a[0] + dir * 10 * s, a[1] + 30 * s], [wl[0] + dir * 14 * s, wl[1] + 34 * s]]);
  ctx.fillStyle = '#161a22';
  flap(ctx);
  ctx.fill();
  ink(ctx, flap, 1.4, INK, 0);
  ctx.lineCap = 'round';
  for (const [col, lw] of [[INK, 4 * s + 2], ['#3a414c', 2.2 * s]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo(a[0] + dir * 24 * s, a[1] + 26 * s, a[0] + dir * 12 * s, a[1] + 80 * s);
    const t: [number, number] = [a[0], a[1] - RAIL_H * s];
    ctx.moveTo(t[0], t[1]);
    ctx.quadraticCurveTo(t[0] + dir * 40 * s, t[1] + 10 * s, t[0] + dir * 30 * s, t[1] + 110 * s);
    ctx.stroke();
  }
}

/** The fallen turn's ends: the deck torn off, a bent bar and the rail hanging down. */
function brokenEnd(ctx: Ctx, w: Walk, end: 0 | 1): void {
  const U = walkU(w);
  const p = end ? w.p1 : w.p0;
  const s = sizeAt(U(p));
  const a = at(U(p), p, 1 - DECK);
  const dir = end ? Math.sign(w.p1 - w.p0) : Math.sign(w.p0 - w.p1);
  ctx.strokeStyle = '#10141c';
  ctx.lineWidth = 3 * s + 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(a[0] + dir * 30 * s, a[1] + 30 * s, a[0] + dir * 14 * s, a[1] + 90 * s);
  const t = at(U(p) + RAIL, p, 1 - DECK);
  ctx.moveTo(t[0], t[1]);
  ctx.quadraticCurveTo(t[0] + dir * 40 * s, t[1] + 20 * s, t[0] + dir * 26 * s, t[1] + 120 * s);
  ctx.stroke();
}

/** A ladder up the wall from course ua to ub at φ: two rails and rungs, its shadow on the stone. */
function ladder(ctx: Ctx, p: number, ua: number, ub: number): void {
  const s = sizeAt((ua + ub) / 2);
  const dp = 0.022;
  const rails = [arcRail(p - dp, ua, ub), arcRail(p + dp, ua, ub)];
  ctx.lineCap = 'round';
  // shadow
  ctx.strokeStyle = 'rgba(2,3,8,0.35)';
  ctx.lineWidth = 4 * s + 1;
  ctx.beginPath();
  for (const rl of rails) rl.forEach(([x, y], i) => (i ? ctx.lineTo(x + 8 * s, y + 10 * s) : ctx.moveTo(x + 8 * s, y + 10 * s)));
  ctx.stroke();
  ctx.strokeStyle = '#141820';
  ctx.lineWidth = 4 * s + 1.4;
  ctx.beginPath();
  for (const rl of rails) rl.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let u = ua + 0.012; u < ub; u += 0.016) {
    const a = at(u, p - dp, 0.985);
    const b = at(u, p + dp, 0.985);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.strokeStyle = rgba(MOONLIT, 0.16);
  ctx.lineWidth = 1;
  ctx.beginPath();
  rails[0].forEach(([x, y], i) => (i ? ctx.lineTo(x - 1.5, y) : ctx.moveTo(x - 1.5, y)));
  ctx.stroke();
}
function arcRail(p: number, ua: number, ub: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= 16; i++) out.push(at(ua + ((ub - ua) * i) / 16, p, 0.985));
  return out;
}

/** A barred cell door set into the wall at (u, φ): an arched opening in a dressed surround, a black cell behind, an
 * iron door of bars with a lock box, rust run down the stone under it. */
function cellDoor(ctx: Ctx, r: R, p: number, u: number, hu: number, dp: number): void {
  const s = sizeAt(u);
  const L = arcRail(p - dp, u, u + hu);
  const Rr = arcRail(p + dp, u, u + hu).reverse();
  const top0 = at(u + hu, p - dp, 0.985);
  const top1 = at(u + hu, p + dp, 0.985);
  const crown = at(u + hu * 1.3, p, 0.985);
  const open: PathFn = (c) => {
    c.beginPath();
    L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.quadraticCurveTo(crown[0], crown[1] - (top0[1] - crown[1]) * 0.6, top1[0], top1[1]);
    Rr.forEach(([x, y]) => c.lineTo(x, y));
    c.closePath();
  };
  // the surround: a band of larger dressed stones, then the dark of the cell
  ctx.save();
  ctx.lineWidth = 14 * s + 4;
  ctx.strokeStyle = '#3a4456';
  open(ctx);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(MOONLIT, 0.12);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#030408';
  open(ctx);
  ctx.fill();
  within(ctx, open, () => {
    // a little of the cell's far wall lit through the bars, a bucket's rim, a pallet
    const [bx, by] = at(u + hu * 0.1, p);
    glowAt(ctx, bx, by, 40 * s + 10, '#3a4a64', 0.08);
    // the bars
    ctx.strokeStyle = '#1a1e28';
    ctx.lineWidth = 3.2 * s + 1;
    ctx.beginPath();
    for (let i = 1; i < 7; i++) {
      const q = p - dp + (2 * dp * i) / 7;
      const a = at(u, q, 0.985);
      const b = at(u + hu * 1.4, q, 0.985);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    for (const k of [0.3, 0.75]) {
      const a = at(u + hu * k, p - dp, 0.985);
      const b = at(u + hu * k, p + dp, 0.985);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(MOONLIT, 0.18);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 7; i++) {
      const q = p - dp + (2 * dp * i) / 7;
      const a = at(u, q, 0.985);
      const b = at(u + hu * 1.4, q, 0.985);
      ctx.moveTo(a[0] - 1.4, a[1]);
      ctx.lineTo(b[0] - 1.4, b[1]);
    }
    ctx.stroke();
    // the lock box
    const [lx, ly] = at(u + hu * 0.5, p + dp * 0.55, 0.985);
    const lb = rectPath(lx - 7 * s - 2, ly - 9 * s - 2, 14 * s + 4, 18 * s + 4);
    solid(ctx, lb, { x: lx - 12, y: ly - 14, w: 24, h: 28 }, IRON, '#4a3a30', { line: 1, formSize: 4 });
  });
  ink(ctx, open, 1.4 + 1.4 * s, INK, 0.4);
  // rust weeping from the sill
  const [sx, sy] = at(u, p);
  const g = ctx.createLinearGradient(0, sy, 0, sy + 50 * s);
  g.addColorStop(0, rgba(RUST, 0.45));
  g.addColorStop(1, rgba(RUST, 0));
  ctx.fillStyle = g;
  ctx.fillRect(sx - 30 * s, sy, 60 * s, 50 * s);
  void r;
}

/** A pipe along a screen path: dark iron, lit along its top, flanged at its joints, held by straps. */
function pipe(ctx: Ctx, pts: [number, number][], w: number, base: string, flanges: number[] = []): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = (dx = 0, dy = 0) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
  };
  ctx.strokeStyle = 'rgba(2,3,8,0.4)';
  ctx.lineWidth = w + 4;
  path(w * 0.5, w * 0.7);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 3;
  path();
  ctx.stroke();
  ctx.strokeStyle = base;
  ctx.lineWidth = w;
  path();
  ctx.stroke();
  ctx.strokeStyle = mix(base, '#000000', 0.45);
  ctx.lineWidth = w * 0.4;
  path(w * 0.18, w * 0.22);
  ctx.stroke();
  ctx.strokeStyle = rgba(MOONLIT, 0.35);
  ctx.lineWidth = Math.max(1, w * 0.16);
  path(-w * 0.22, -w * 0.26);
  ctx.stroke();
  for (const i of flanges) {
    const [x, y] = pts[i];
    const [x1, y1] = pts[Math.min(pts.length - 1, i + 1)];
    const a = Math.atan2(y1 - y, x1 - x) + Math.PI / 2;
    ctx.strokeStyle = INK;
    ctx.lineWidth = w * 0.6 + 2;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * w * 0.85, y - Math.sin(a) * w * 0.85);
    ctx.lineTo(x + Math.cos(a) * w * 0.85, y + Math.sin(a) * w * 0.85);
    ctx.stroke();
    ctx.strokeStyle = mix(base, '#c8a080', 0.2);
    ctx.lineWidth = w * 0.6;
    ctx.stroke();
  }
  ctx.restore();
}

// ——— the Venom rig: tanks and tubes ———

/** The tubes up the walls from each tank's cap (left; the right ones are mirrored): screen points. */
const TUBES_L: [number, number][][] = [
  [[222, 354], [200, 300], [178, 240], [140, 176], [90, 120], [30, 74], [-30, 36]],
  [[278, 354], [306, 296], [340, 236], [356, 170], [346, 104], [318, 40], [296, -20]],
];
export const TUBES: [number, number][][] = [...TUBES_L, ...TUBES_L.map((t) => t.map(([x, y]) => [1920 - x + (PT.tanks[1] - (1920 - PT.tanks[0])), y] as [number, number]))];

function tubePath(c: Ctx, pts: [number, number][]): void {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const l = pts[pts.length - 1];
  c.lineTo(l[0], l[1]);
}

/** A Venom tube: thick dark rubber, its liquid showing green through a glass sight band, clamped to the wall. */
function tube(ctx: Ctx, pts: [number, number][], w: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(2,3,8,0.45)';
  ctx.lineWidth = w + 6;
  ctx.translate(w * 0.6, w * 0.8);
  tubePath(ctx, pts);
  ctx.stroke();
  ctx.translate(-w * 0.6, -w * 0.8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 3;
  tubePath(ctx, pts);
  ctx.stroke();
  ctx.strokeStyle = '#1a2a1e';
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.strokeStyle = mix(VENOM, VENOM_DEEP, 0.7);
  ctx.lineWidth = w * 0.42;
  ctx.stroke();
  ctx.strokeStyle = rgba(VENOM, 0.35);
  ctx.lineWidth = w * 0.14;
  ctx.stroke();
  ctx.strokeStyle = rgba('#dfffd0', 0.35);
  ctx.lineWidth = Math.max(1, w * 0.1);
  ctx.translate(-w * 0.2, -w * 0.2);
  tubePath(ctx, pts);
  ctx.stroke();
  ctx.restore();
  // clamps fixing it to the wall
  for (let i = 1; i < pts.length - 1; i += 2) {
    const [x, y] = pts[i];
    const [x1, y1] = pts[i + 1];
    const a = Math.atan2(y1 - y, x1 - x) + Math.PI / 2;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * w, y - Math.sin(a) * w);
    ctx.lineTo(x + Math.cos(a) * w, y + Math.sin(a) * w);
    ctx.stroke();
    ctx.strokeStyle = '#6a707c';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

const T = PT.tank;
const TANK_BOX = (x: number): Box => ({ x: x - 210, y: T.cap - 60, w: 450, h: T.foot + 30 - (T.cap - 60) });
/** The glass and its fittings (above the plinth: it must end above the table, or the table bakes into an overlay). */
const TANK_FRONT_BOX = (x: number): Box => ({ x: x - 130, y: T.cap - 60, w: 260, h: T.bottom + 12 - (T.cap - 60) });
/** The liquid's frame: the glass's inside. */
export const LIQ = { w: T.rx * 2, h: T.bottom - T.top };
export const LIQ_BOX = (x: number): Box => ({ x: x - T.rx, y: T.top, w: LIQ.w, h: LIQ.h });

/** Behind the liquid: the plinth, the shadows, the base ring, the dark of the glass's back. */
function tankBack(ctx: Ctx, x: number): void {
  const dir = x < 960 ? 1 : -1;
  groundShadow(ctx, x + 18, T.foot - 2, 150, 16, 0.65, '#02040a', 1.4);
  castShadow(ctx, rectPath(x - T.rx - 20, T.cap, (T.rx + 20) * 2, T.foot - T.cap - 30), 26, 22, 0.4, '#02040a');
  // the plinth: a squat iron stand on four feet, a pump body bolted on its front
  const pl = polyPath([[x - 108, T.plinth], [x + 108, T.plinth], [x + 116, T.foot - 10], [x + 122, T.foot], [x - 122, T.foot], [x - 116, T.foot - 10]]);
  solid(ctx, pl, { x: x - 112, y: T.plinth, w: 224, h: T.foot - T.plinth }, IRON, '#3a414e', { line: 2.2, formSize: 10 });
  within(ctx, pl, () => {
    ctx.fillStyle = rgba(RUST, 0.35);
    ctx.fillRect(x - 110, T.foot - 16, 220, 16);
    dots(ctx, { x: x - 112, y: T.plinth, w: 224, h: T.foot - T.plinth }, linTone(x - 60, 0, x + 110, 0, 0.05, 0.7), '#02040a', { step: 4, angle: 0.79, a: 0.6 });
  });
  // a hand pump's crank on the plinth's outer side
  const hx = x - dir * 100;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx, T.plinth + 18);
  ctx.lineTo(hx - dir * 30, T.plinth - 8);
  ctx.stroke();
  ctx.strokeStyle = '#7a808c';
  ctx.lineWidth = 3;
  ctx.stroke();
  // the base ring and the back of the glass
  const ring0 = rrPath(x - T.rx - 14, T.bottom - 6, T.rx * 2 + 28, T.plinth - T.bottom + 8, 5);
  solid(ctx, ring0, { x: x - T.rx - 14, y: T.bottom - 6, w: T.rx * 2 + 28, h: 30 }, IRON, '#5a6270', { line: 2, formSize: 6 });
  ctx.fillStyle = mix(VENOM_DEEP, '#000000', 0.5);
  ctx.fillRect(x - T.rx, T.top, T.rx * 2, T.bottom - T.top);
}

/** One frame of the Venom boiling in its tank (phase 0…1 loops), in a LIQ frame: a glowing column, bright through its
 * middle and deep at its edges, volumes churning up it, bubbles swelling as they rise (each one rises one place per
 * loop, so the loop is seamless), dark sediment settled at the bottom, a frothing surface. */
export function venomFrame(c: Ctx, ph: number, seed = 1): void {
  const { w, h } = LIQ;
  const cx = w / 2;
  const surf = 24 + Math.sin(ph * P2) * 2.4;
  const r = rng(seed);
  // the headspace over the surface: dark, the glow's haze in it
  c.fillStyle = '#0a1a0e';
  c.fillRect(0, 0, w, h);
  const hg = c.createLinearGradient(0, 0, 0, surf + 6);
  hg.addColorStop(0, 'rgba(40,90,40,0.2)');
  hg.addColorStop(1, 'rgba(120,255,100,0.35)');
  c.fillStyle = hg;
  c.fillRect(0, 0, w, surf + 6);
  const top = (x: number) => surf + Math.sin(x * 0.1 + ph * P2) * 2.6 + Math.sin(x * 0.23 - ph * P2 * 2) * 1.6;
  const body: PathFn = (g) => {
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, top(x));
    g.lineTo(w, h);
    g.closePath();
  };
  c.save();
  body(c);
  c.clip();
  // the column: deep at the edges, hot in its middle (more light passes through more Venom there)
  const cg = c.createLinearGradient(0, 0, w, 0);
  cg.addColorStop(0, '#082e12');
  cg.addColorStop(0.3, '#1f7a26');
  cg.addColorStop(0.5, '#4cc23e');
  cg.addColorStop(0.7, '#1f7a26');
  cg.addColorStop(1, '#062610');
  c.fillStyle = cg;
  c.fillRect(0, 0, w, h);
  // the churn: soft volumes rising and turning, lighter on their upper left
  for (let k = 0; k < 7; k++) {
    const u = (k / 7 + ph) % 1;
    const y = h - 20 - u * (h - surf);
    const x = cx + Math.sin(u * 7 + k * 2.1) * w * 0.22;
    const rad = w * (0.2 + 0.12 * Math.sin(k * 1.7 + 0.5));
    const a = Math.sin(u * Math.PI) * 0.5;
    const g = c.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
    g.addColorStop(0, `rgba(220,255,180,${a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(120,255,100,0)');
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // dark tendrils of thicker Venom turning as they rise (each one rises a third of the way per loop, the next one
  // taking its place: seamless), a bright filament along each one's lit edge
  c.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const u0 = (k + ph) / 4;
    const y0 = h - u0 * (h - surf) * 1.1 + 30;
    const sw = (u: number) => Math.sin(u * 5 + k * 2.4 + ph * P2 * 0.25) * w * 0.22;
    c.strokeStyle = 'rgba(6,46,14,0.2)';
    c.lineWidth = 10;
    c.beginPath();
    for (let j = 0; j <= 10; j++) {
      const yy = y0 - j * 9;
      const xx = cx + sw(j * 0.12 + u0) + (k - 1.5) * w * 0.12;
      if (j) c.lineTo(xx, yy);
      else c.moveTo(xx, yy);
    }
    c.stroke();
    c.strokeStyle = 'rgba(210,255,180,0.16)';
    c.lineWidth = 1.4;
    c.beginPath();
    for (let j = 0; j <= 10; j++) {
      const yy = y0 - j * 9 - 3;
      const xx = cx + sw(j * 0.12 + u0) + (k - 1.5) * w * 0.12 - 2;
      if (j) c.lineTo(xx, yy);
      else c.moveTo(xx, yy);
    }
    c.stroke();
  }
  // light bands drifting up the column
  for (let k = 0; k < 3; k++) {
    const yb = h - ((k + ph) / 3) * (h - surf + 30) + 6;
    c.fillStyle = 'rgba(210,255,170,0.18)';
    c.beginPath();
    c.moveTo(0, yb);
    for (let x = 0; x <= w; x += 8) c.lineTo(x, yb + Math.sin(x * 0.08 + k * 2 + ph * P2) * 4);
    for (let x = w; x >= 0; x -= 8) c.lineTo(x, yb + 6 + Math.sin(x * 0.08 + k * 2 + 0.7 + ph * P2) * 3);
    c.closePath();
    c.fill();
  }
  // sediment settled at the bottom (keeps the tank's foot dark behind the play area)
  const sg = c.createLinearGradient(0, h - 90, 0, h);
  sg.addColorStop(0, 'rgba(6,30,10,0)');
  sg.addColorStop(1, 'rgba(6,24,8,0.85)');
  c.fillStyle = sg;
  c.fillRect(0, h - 90, w, 90);
  // the cylinder's shade in dots, more on the right (away from the key) and at the bottom
  dots(c, { x: 0, y: 0, w, h }, (x, y) => {
    const e = (x - cx) / (w / 2);
    return 0.75 * Math.abs(e) ** 2.4 * (e > 0 ? 1.2 : 0.8) + 0.3 * smooth(h * 0.65, h, y);
  }, VENOM_DEEP, { step: 4, angle: 0.26, a: 0.7 });
  // bubble streams: each bubble rises one place in its stream per loop
  const streams = [cx - w * 0.3, cx - w * 0.04, cx + w * 0.22, cx + w * 0.36];
  for (const [si, sx] of streams.entries()) {
    const n = 8 - si;
    const so = r();
    for (let b = 0; b < n; b++) {
      const u = (b + ph + so) / n;
      const by = h - 30 - u * (h - surf - 30);
      const br = 2.2 + u * (4.6 + (si % 2) * 2);
      const bx = sx + Math.sin(u * 9 + si * 2) * (2 + u * 5);
      if (by < surf + br) continue;
      c.strokeStyle = 'rgba(230,255,200,0.75)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(bx, by, br, 0, P2);
      c.stroke();
      c.fillStyle = 'rgba(170,255,140,0.25)';
      c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(bx - br * 0.35, by - br * 0.35, Math.max(0.7, br * 0.28), 0, P2);
      c.fill();
    }
  }
  c.restore();
  // the surface: a bright meniscus, froth churning along it
  c.save();
  c.strokeStyle = 'rgba(230,255,200,0.9)';
  c.lineWidth = 1.6;
  c.beginPath();
  for (let x = 0; x <= w; x += 4) (x ? c.lineTo(x, top(x)) : c.moveTo(x, top(x)));
  c.stroke();
  for (let k = 0; k < 10; k++) {
    const fx = ((k + 0.5) / 10) * w + Math.sin(ph * P2 + k) * 3;
    const fr = 2.4 + 2 * (0.5 + 0.5 * Math.sin(ph * P2 * 2 + k * 1.7));
    const fy = top(fx) - fr * 0.3;
    c.fillStyle = 'rgba(200,255,170,0.85)';
    c.beginPath();
    c.arc(fx, fy, fr, 0, P2);
    c.fill();
    c.strokeStyle = 'rgba(20,70,24,0.8)';
    c.lineWidth = 0.9;
    c.stroke();
  }
  c.restore();
}

function venomStill(ctx: Ctx, x: number, i: number): void {
  ctx.save();
  ctx.translate(x - T.rx, T.top);
  venomFrame(ctx, 0.25 + i * 0.4, 51 + i);
  ctx.restore();
}

/** Over the liquid: the glass (thick tinted edges, reflections, the shaft's window glint), three steel bands with
 * rivets, the pressure dial on the middle band, the cap with its flange, gland and tube unions, a valve wheel. */
export const DIAL = (x: number) => ({ x: x + (x < 960 ? 1 : -1) * 44, y: T.top + 112, r: 20 });
function tankFront(ctx: Ctx, x: number): void {
  const glass = rectPath(x - T.rx, T.top, T.rx * 2, T.bottom - T.top);
  within(ctx, glass, () => {
    const eg = ctx.createLinearGradient(x - T.rx, 0, x + T.rx, 0);
    eg.addColorStop(0, 'rgba(4,20,8,0.6)');
    eg.addColorStop(0.12, 'rgba(4,20,8,0)');
    eg.addColorStop(0.86, 'rgba(4,20,8,0)');
    eg.addColorStop(1, 'rgba(2,12,6,0.7)');
    ctx.fillStyle = eg;
    ctx.fillRect(x - T.rx, T.top, T.rx * 2, T.bottom - T.top);
    ctx.fillStyle = 'rgba(230,255,230,0.26)';
    ctx.fillRect(x - T.rx + 10, T.top, 12, T.bottom - T.top);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x - T.rx + 28, T.top, 3, T.bottom - T.top);
    ctx.fillStyle = rgba(MOONLIT, 0.2);
    ctx.fillRect(x + T.rx - 18, T.top + 16, 5, T.bottom - T.top - 32);
    // grime crept up the glass from the foot
    lay(ctx, noiseMask(6, 660 + x, { cover: 0.5, soft: 0.3, col: '#0a140c' }), { x: x - T.rx, y: T.bottom - 70, w: T.rx * 2, h: 70 }, 0.6);
  });
  ink(ctx, glass, 2.6, INK, 0.6);
  // the iron cage the glass stands in: four flat straps up it, riveted to the bands
  for (const f of [-0.98, -0.42, 0.42, 0.98]) {
    const sx = x + f * T.rx;
    const strap = rectPath(sx - 5, T.top, 10, T.bottom - T.top);
    castShadow(ctx, strap, 6, 5, 0.45, '#02040a');
    solid(ctx, strap, { x: sx - 5, y: T.top, w: 10, h: T.bottom - T.top }, IRON, mix('#4a525e', RUST, 0.2), { line: 1.6, formSize: 3 });
    ctx.fillStyle = rgba(MOONLIT, 0.28);
    ctx.fillRect(sx - 4, T.top, 1.4, T.bottom - T.top);
  }
  // the steel bands
  for (const by of [T.top + 4, T.top + 104, T.bottom - 40]) {
    const bandP = rrPath(x - T.rx - 6, by, T.rx * 2 + 12, 16, 3);
    solid(ctx, bandP, { x: x - T.rx - 6, y: by, w: T.rx * 2 + 12, h: 16 }, IRON, '#6a7280', { line: 1.8, formSize: 4 });
    ctx.fillStyle = rgba(MOONLIT, 0.35);
    ctx.fillRect(x - T.rx - 4, by + 1, T.rx * 2 + 8, 1.4);
    for (let k = 0; k < 6; k++) {
      const rx = x - T.rx + 4 + (k * (T.rx * 2 - 8)) / 5;
      ctx.fillStyle = '#0a0c12';
      ctx.beginPath();
      ctx.arc(rx + 0.6, by + 9, 2.4, 0, P2);
      ctx.fill();
      ctx.fillStyle = '#a8b0bc';
      ctx.beginPath();
      ctx.arc(rx, by + 8, 1.8, 0, P2);
      ctx.fill();
    }
  }
  // the pressure dial on the middle band's bracket
  const d = DIAL(x);
  castShadow(ctx, ellPath(d.x, d.y, d.r + 4, d.r + 4), 6, 6, 0.5, '#02040a');
  const bezel = ellPath(d.x, d.y, d.r + 4, d.r + 4);
  solid(ctx, bezel, { x: d.x - d.r - 4, y: d.y - d.r - 4, w: d.r * 2 + 8, h: d.r * 2 + 8 }, 'chrome', '#9aa2ae', { line: 2, formSize: 6 });
  ctx.fillStyle = '#e8e4d4';
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, P2);
  ctx.fill();
  // its scale: ticks round, the red zone at the top of the sweep
  ctx.strokeStyle = '#c8202a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r - 4, -0.2, 0.75);
  ctx.stroke();
  ctx.strokeStyle = '#2a2a30';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * 0.75 + (k / 8) * Math.PI * 1.5;
    ctx.moveTo(d.x + Math.cos(a) * (d.r - 2), d.y + Math.sin(a) * (d.r - 2));
    ctx.lineTo(d.x + Math.cos(a) * (d.r - 7), d.y + Math.sin(a) * (d.r - 7));
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(d.x - 6, d.y - 7, 9, 4, -0.5, 0, P2);
  ctx.fill();
  // the cap: a domed lid on a flange, the tube unions, a gland
  const fl = rrPath(x - T.rx - 14, T.top - 16, T.rx * 2 + 28, 20, 5);
  solid(ctx, fl, { x: x - T.rx - 14, y: T.top - 16, w: T.rx * 2 + 28, h: 20 }, IRON, '#606876', { line: 2.2, formSize: 5 });
  const dome: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - T.rx - 6, T.top - 15);
    c.bezierCurveTo(x - T.rx + 4, T.cap - 8, x + T.rx - 4, T.cap - 8, x + T.rx + 6, T.top - 15);
    c.closePath();
  };
  solid(ctx, dome, { x: x - T.rx - 6, y: T.cap - 10, w: T.rx * 2 + 12, h: T.top - T.cap }, IRON, '#4e5664', { line: 2.2, formSize: 12 });
  within(ctx, dome, () => dots(ctx, { x: x - T.rx - 6, y: T.cap - 10, w: T.rx * 2 + 12, h: T.top - T.cap }, linTone(x - 20, T.cap, x + T.rx, T.top, 0, 0.8), '#02040a', { step: 4, angle: 0.79, a: 0.5 }));
  for (const dx of [-24, 24]) {
    const un = rrPath(x + dx - 9, T.cap - 2, 18, 16, 3);
    solid(ctx, un, { x: x + dx - 9, y: T.cap - 2, w: 18, h: 16 }, 'chrome', '#8a929e', { line: 1.6, formSize: 4 });
  }
  // a valve wheel on the side of the cap
  const vx = x + (x < 960 ? -1 : 1) * (T.rx + 24);
  const vy = T.top - 26;
  pipe(ctx, [[x + (x < 960 ? -1 : 1) * (T.rx - 4), T.top - 8], [vx, T.top - 8], [vx, vy]], 7, '#4a505c');
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(vx, vy, 13, 13, 0, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = '#a02a22';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    ctx.moveTo(vx - Math.cos(a) * 12, vy - Math.sin(a) * 12);
    ctx.lineTo(vx + Math.cos(a) * 12, vy + Math.sin(a) * 12);
  }
  ctx.stroke();
}

/** The green light the Venom throws (k = how strong; the live layer flares and gutters its own copy): on the wall
 * behind each tank, up its tubes, on the floor round it and the undersides of the iron nearby. */
const VGLOW_BOX = (x: number): Box => ({ x: Math.max(0, x - 420), y: 0, w: Math.min(W, x + 420) - Math.max(0, x - 420), h: TY + 60 });
function venomLight(ctx: Ctx, x: number, k: number): void {
  lightPool(ctx, x, 540, 300, 280, VENOM, 0.13 * k);
  lightPool(ctx, x, 520, 150, 180, VENOM_HOT, 0.06 * k);
  lightPool(ctx, x, T.foot + 4, 260, 34, VENOM, 0.22 * k);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const t of TUBES.filter((q) => Math.abs(q[0][0] - x) < 200)) {
    ctx.strokeStyle = rgba(VENOM, 0.12 * k);
    ctx.lineWidth = 26;
    tubePath(ctx, t);
    ctx.stroke();
    ctx.strokeStyle = rgba(VENOM, 0.14 * k);
    ctx.lineWidth = 9;
    ctx.stroke();
  }
  ctx.restore();
}

/** The live glow is painted this much stronger than the still's, so the live layer can flare it (alpha 1) and
 * gutter it (low alpha); at alpha 1 / VGLOW_K it matches the still. */
const VGLOW_K = 1.7;

/** The mouth lit by lightning (live only): the cloud's underside blazing, the grille black against it. */
function skyLit(ctx: Ctx): void {
  within(ctx, skyPath, () => {
    vfill(ctx, SKY_BOX.x, SKY_BOX.y, SKY_BOX.w, SKY_BOX.h, [[0, '#e8eeff'], [0.6, '#a8b8e0'], [1, '#6a80b0']]);
    benDay(ctx, SKY_BOX, '#2a3a60', 0.3, 7, 0.1, 0.5);
  });
  grille(ctx);
}

// ——— the floor and its props ———

function pitFloor(ctx: Ctx, r: R): void {
  // the strip of floor between the wall's foot and the table: wet flags, rubble, a drain
  const foot: [number, number][] = [];
  for (let x = 0; x <= W; x += 40) foot.push([x, wallFoot(x)]);
  const floor = polyPath([...foot, [W, TY + 2], [0, TY + 2]]);
  within(ctx, floor, () => {
    vfill(ctx, 0, 620, W, TY - 620, [[0, '#121822'], [1, '#262e3c']]);
    surface(ctx, r, { x: 0, y: 620, w: W, h: TY - 620 }, '#1e2634', { over: true, vary: 0.5, warm: '#3a4256', cool: '#0a0e16', mottle: 0.4, grain: 0.2, seed: 671 });
    ctx.strokeStyle = 'rgba(3,5,10,0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let y = 700; y < TY; y += 22) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    for (let x = 30; x < W; x += 120) {
      ctx.moveTo(x, 680);
      ctx.lineTo(x + (x - 960) * 0.06, TY);
    }
    ctx.stroke();
    // wet: the sky's glow lying on it
    vfill(ctx, 0, 640, W, TY - 640, [[0, 'rgba(120,140,180,0.08)'], [1, 'rgba(120,140,180,0)']]);
  });
  // the wall's foot: occlusion where it meets the floor
  ctx.save();
  ctx.strokeStyle = 'rgba(2,3,8,0.6)';
  ctx.lineWidth = 8;
  ctx.filter = 'blur(4px)';
  ctx.beginPath();
  foot.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 2) : ctx.moveTo(x, y + 2)));
  ctx.stroke();
  ctx.restore();
  // the drain at the back: a low arched culvert under the wall with a grate, dark (calm behind the middle lane)
  const dx = 960;
  const dy = wallFoot(dx);
  const arch: PathFn = (c) => {
    c.beginPath();
    c.moveTo(dx - 70, dy + 2);
    c.lineTo(dx - 70, dy - 30);
    c.quadraticCurveTo(dx, dy - 84, dx + 70, dy - 30);
    c.lineTo(dx + 70, dy + 2);
    c.closePath();
  };
  ctx.save();
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#2e3646';
  arch(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#030408';
  arch(ctx);
  ctx.fill();
  within(ctx, arch, () => {
    ctx.strokeStyle = '#1a1e28';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = dx - 60; x <= dx + 60; x += 15) {
      ctx.moveTo(x, dy - 70);
      ctx.lineTo(x, dy + 4);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(MOONLIT, 0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = dx - 60; x <= dx + 60; x += 15) {
      ctx.moveTo(x - 1.5, dy - 70);
      ctx.lineTo(x - 1.5, dy + 4);
    }
    ctx.stroke();
  });
  ink(ctx, arch, 2, INK, 0.4);
  // puddles on the floor: dark glass holding the shaft's light
  for (const [px, py, rx, ry] of FLOOR_PUDDLES) {
    softly(ctx, { x: px - rx - 20, y: py - ry - 12, w: rx * 2 + 40, h: ry * 2 + 24 }, (g) => {
      g.fillStyle = 'rgba(6,10,18,0.45)';
      g.beginPath();
      g.ellipse(px, py, rx, ry, 0, 0, P2);
      g.fill();
      g.fillStyle = 'rgba(110,130,170,0.3)';
      g.beginPath();
      g.ellipse(px - rx * 0.15, py - ry * 0.2, rx * 0.6, ry * 0.5, 0, 0, P2);
      g.fill();
    }, 0.25);
  }
  // rubble fallen from the walls, gathered at their foot
  for (let i = 0; i < 40; i++) {
    const x = r() * W;
    if (Math.abs(x - 960) < 260) continue;
    const y = wallFoot(x) + 2 + r() * 18;
    const s = 3 + r() * 9;
    const st = polyPath([[x - s, y], [x - s * 0.6, y - s * 0.8], [x + s * 0.4, y - s], [x + s, y - s * 0.3], [x + s * 0.8, y + s * 0.2]]);
    groundShadow(ctx, x + s * 0.4, y + 1, s * 1.2, s * 0.3, 0.5, '#02040a');
    ctx.fillStyle = mix('#3a4456', '#6a7890', r() * 0.6);
    st(ctx);
    ctx.fill();
    ctx.strokeStyle = 'rgba(4,6,12,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
export const FLOOR_PUDDLES: [number, number, number, number][] = [
  [700, 736, 70, 8],
  [1150, 742, 90, 8],
  [1540, 738, 60, 7],
  [420, 744, 50, 6],
];

/** The winch: a stout timber trestle on the floor, an iron drum wound with rope, a crank and a ratchet wheel; its rope
 * runs up to the jib on the left walkway's broken end. */
export const DAVIT = (() => {
  const s = sizeAt(0.17);
  const e = frontOf(at(walkU(WALKS[0])(-0.2), -0.2), s);
  return { x: e[0], y: e[1], top: e[1] - RAIL_H * s * 1.9, tip: e[0] + 70 };
})();
function winch(ctx: Ctx): void {
  const { x, y } = PT.winch;
  const h = 96;
  const dy = y - h;
  groundShadow(ctx, x + 18, y, 110, 12, 0.65, '#02040a', 1.3);
  // the rope up to the jib's pulley
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 20, dy - 10);
  ctx.lineTo(DAVIT.tip + 9, DAVIT.top + 18);
  ctx.stroke();
  ctx.strokeStyle = '#9a7e50';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // the trestle: a pair of splayed legs either side, braced, on a sole timber
  for (const sx of [-58, 58]) {
    for (const lean of [-1, 1]) {
      const leg = polyPath([[x + sx + lean * 26 - 6, y - 8], [x + sx + lean * 26 + 6, y - 8], [x + sx + lean * 4 + 4, dy + 6], [x + sx + lean * 4 - 4, dy + 6]]);
      solid(ctx, leg, { x: x + sx - 34, y: dy, w: 68, h }, 'wood', '#55402c', { line: 1.8, formSize: 5 });
    }
    const brace = rectPath(x + sx - 20, y - 44, 40, 7);
    solid(ctx, brace, { x: x + sx - 20, y: y - 44, w: 40, h: 7 }, 'wood', '#4a3826', { line: 1.4, formSize: 3 });
  }
  const sole = rectPath(x - 96, y - 10, 192, 10);
  castShadow(ctx, sole, 6, 5, 0.5, '#02040a');
  solid(ctx, sole, { x: x - 96, y: y - 10, w: 192, h: 10 }, 'wood', '#3e2e20', { line: 1.8, formSize: 4 });
  ctx.fillStyle = rgba(MOONLIT, 0.25);
  ctx.fillRect(x - 94, y - 10, 188, 1.4);
  // the drum with its rope wound on, its iron cheeks
  const drum = rrPath(x - 46, dy - 18, 92, 36, 14);
  castShadow(ctx, drum, 8, 8, 0.5, '#02040a');
  solid(ctx, drum, { x: x - 46, y: dy - 18, w: 92, h: 36 }, 'canvas', '#7a6442', { line: 2, formSize: 12 });
  within(ctx, drum, () => {
    ctx.strokeStyle = 'rgba(40,28,14,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = -42; k <= 42; k += 5) {
      ctx.moveTo(x + k, dy - 18);
      ctx.lineTo(x + k + 3, dy + 18);
    }
    ctx.stroke();
  });
  for (const cx of [x - 50, x + 50]) {
    const cheek = ellPath(cx, dy, 8, 24);
    solid(ctx, cheek, { x: cx - 8, y: dy - 24, w: 16, h: 48 }, IRON, '#4a505c', { line: 1.8, formSize: 6 });
  }
  // the crank on the left, the ratchet wheel and pawl on the right
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x - 58, dy);
  ctx.lineTo(x - 84, dy + 30);
  ctx.lineTo(x - 102, dy + 24);
  ctx.stroke();
  ctx.strokeStyle = '#8a909c';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.fillStyle = '#5a4030';
  ctx.beginPath();
  ctx.arc(x - 102, dy + 24, 5, 0, P2);
  ctx.fill();
  const rw = ellPath(x + 62, dy, 6, 16);
  solid(ctx, rw, { x: x + 56, y: dy - 16, w: 12, h: 32 }, IRON, '#5a606c', { line: 1.6, formSize: 4 });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 70, dy + 26);
  ctx.lineTo(x + 66, dy + 12);
  ctx.stroke();
}

/** The jib on the walkway's torn end: an iron post up from the deck, an arm out over the floor, a pulley. */
function davit(ctx: Ctx): void {
  const { x, y, top, tip } = DAVIT;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const line = (dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(x + dx, top + dy);
    ctx.lineTo(tip + dx, top + dy);
    ctx.moveTo(x + dx, top + 34 + dy);
    ctx.lineTo(x + 40 + dx, top + dy);
  };
  ctx.strokeStyle = 'rgba(2,3,8,0.35)';
  ctx.lineWidth = 6;
  line(8, 10);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  line(0, 0);
  ctx.stroke();
  ctx.strokeStyle = '#3a414c';
  ctx.lineWidth = 3.6;
  line(0, 0);
  ctx.stroke();
  ctx.strokeStyle = rgba(MOONLIT, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 1.5, y);
  ctx.lineTo(x - 1.5, top - 1.5);
  ctx.lineTo(tip, top - 1.5);
  ctx.stroke();
  // the pulley block hung from the arm's tip
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tip, top);
  ctx.lineTo(tip, top + 8);
  ctx.stroke();
  const blk = rrPath(tip - 9, top + 6, 18, 24, 5);
  solid(ctx, blk, { x: tip - 9, y: top + 6, w: 18, h: 24 }, IRON, '#4a505c', { line: 1.8, formSize: 5 });
  ctx.fillStyle = '#9aa0aa';
  ctx.beginPath();
  ctx.arc(tip, top + 18, 3, 0, P2);
  ctx.fill();
}

/** The caged work lamps, hung under the walkways on short chains: a bulb in a wire cage under a tin shade. */
const LAMP_AT: [number, number][] = [[0, -0.26], [1, 0.25]];
export const LAMPS = LAMP_AT.map(([wi, p]) => {
  const w = WALKS[wi];
  const e = frontOf(at(walkU(w)(p), p), sizeAt(walkU(w)(p)));
  return { hx: e[0], hy: e[1] + 9, x: e[0], y: e[1] + 9 + 40 };
});
function lampLight(ctx: Ctx): void {
  for (const { x, y } of LAMPS) {
    lightPool(ctx, x + 10, y + 70, 190, 150, SODIUM, 0.15);
    lightPool(ctx, x, y + 10, 70, 60, '#ffd8a0', 0.22);
    lightPool(ctx, x + 30, wallFoot(x + 30) + 18, 190, 24, SODIUM, 0.16);
  }
}
function lamp(ctx: Ctx): void {
  for (const { x, y, hx, hy } of LAMPS) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(x, y - 14);
    ctx.stroke();
    const shadeP = polyPath([[x - 16, y - 2], [x - 6, y - 14], [x + 6, y - 14], [x + 16, y - 2]]);
    solid(ctx, shadeP, { x: x - 16, y: y - 14, w: 32, h: 12 }, 'enamel', '#3a4a3a', { line: 1.6, formSize: 4 });
    const g = ctx.createRadialGradient(x, y + 8, 0, x, y + 8, 12);
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(0.5, '#ffd890');
    g.addColorStop(1, 'rgba(255,170,80,0.3)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 8, 10, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,24,20,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const k of [-6, 0, 6]) {
      ctx.moveTo(x + k * 1.4, y - 2);
      ctx.quadraticCurveTo(x + k * 2, y + 10, x + k * 0.6, y + 20);
    }
    ctx.ellipse(x, y + 8, 10, 4, 0, 0, P2);
    ctx.stroke();
  }
}

/** His gym in the moonlight: a barbell (iron pipe, two old flywheels) on a rack of pipes set in stone, a heavy timber
 * bench under it on two stone blocks, two kettle weights, a tally of days scratched on the wall. */
function gym(ctx: Ctx, r: R): void {
  const { x, y } = PT.gym;
  // the tally on the wall behind, to the left of the rack
  ctx.strokeStyle = 'rgba(200,206,214,0.32)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k < 23; k++) {
    const g = Math.floor(k / 5);
    const tx = x - 250 + g * 40 + (k % 5) * 6;
    const ty = 566 + (g % 2) * 4;
    if (k % 5 === 4) {
      ctx.moveTo(tx - 28, ty + 6);
      ctx.lineTo(tx + 2, ty + 24);
    } else {
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 1, ty + 28);
    }
  }
  ctx.stroke();
  const barY = y - 118;
  // the rack: two pipes standing in stone blocks, J-hooks at the top
  for (const rx of [x - 92, x + 92]) {
    groundShadow(ctx, rx + 10, y, 34, 7, 0.6, '#02040a');
    const blk = rectPath(rx - 22, y - 26, 44, 26);
    solid(ctx, blk, { x: rx - 22, y: y - 26, w: 44, h: 26 }, STONE, '#4a5262', { line: 1.6, formSize: 6 });
    pipe(ctx, [[rx, y - 26], [rx, barY - 8]], 8, '#3e4450');
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rx, barY + 6);
    ctx.lineTo(rx + (rx < x ? -10 : 10), barY - 4);
    ctx.stroke();
  }
  // the bench under it: a heavy beam on two blocks
  for (const bx of [x - 56, x + 56]) {
    groundShadow(ctx, bx + 10, y + 4, 34, 7, 0.6, '#02040a');
    const b1 = rectPath(bx - 24, y - 30, 48, 34);
    solid(ctx, b1, { x: bx - 24, y: y - 30, w: 48, h: 34 }, STONE, '#465062', { line: 1.6, formSize: 6 });
  }
  const plank = rectPath(x - 104, y - 46, 208, 18);
  castShadow(ctx, plank, 9, 7, 0.55, '#02040a');
  solid(ctx, plank, { x: x - 104, y: y - 46, w: 208, h: 18 }, 'wood', '#5a4632', { line: 1.8, formSize: 5 });
  ctx.fillStyle = rgba(MOONLIT, 0.45);
  ctx.fillRect(x - 102, y - 46, 204, 1.8);
  // the bar and its plates (cast-iron flywheels off some old machine)
  pipe(ctx, [[x - 150, barY], [x + 150, barY]], 7, '#6a707c');
  for (const [i, px] of [x - 128, x + 128].entries()) {
    const cy = barY;
    const out = i ? 1 : -1;
    // a cast-iron plate seen nearly edge-on: its rim's thickness, then its face, rusted, and its hub
    const plate = (dx: number): PathFn => ellPath(px + dx, cy, 11, 40);
    castShadow(ctx, plate(0), 12, 8, 0.45, '#02040a');
    solid(ctx, plate(out * 6), { x: px - 18, y: cy - 40, w: 36, h: 80 }, IRON, mix('#2a2e36', RUST, 0.3), { line: 1.6, formSize: 6 });
    solid(ctx, plate(0), { x: px - 12, y: cy - 40, w: 24, h: 80 }, IRON, mix('#525a66', RUST, 0.3), { line: 1.8, formSize: 8 });
    ctx.fillStyle = rgba(MOONLIT, 0.35);
    ctx.fillRect(px - 5, cy - 34, 2, 30);
    ctx.fillStyle = '#1a1e26';
    ctx.beginPath();
    ctx.ellipse(px, cy, 4, 10, 0, 0, P2);
    ctx.fill();
  }
  // two iron kettle weights on the floor by the bench (a cannonball each, with a forged handle)
  for (const [dx, rad] of [[-176, 18], [-142, 14]] as const) {
    const cx = x + dx;
    const cy = y - rad + 2;
    groundShadow(ctx, cx + 6, y, rad * 1.4, 5, 0.65, '#02040a');
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy - rad * 0.9, rad * 0.62, rad * 0.62, 0, Math.PI * 1.02, Math.PI * 1.98);
    ctx.stroke();
    ctx.strokeStyle = '#4a505a';
    ctx.lineWidth = 3;
    ctx.stroke();
    const ball = polyPath(Array.from({ length: 20 }, (_, k) => {
      const a = (k / 20) * P2;
      return [cx + Math.cos(a) * rad, Math.min(cy + rad * 0.8, cy + Math.sin(a) * rad * 0.95)] as [number, number];
    }));
    solid(ctx, ball, { x: cx - rad, y: cy - rad, w: rad * 2, h: rad * 2 }, IRON, '#3e444e', { line: 1.8, formSize: rad });
    ctx.fillStyle = rgba(MOONLIT, 0.4);
    ctx.beginPath();
    ctx.ellipse(cx - rad * 0.35, cy - rad * 0.45, rad * 0.3, rad * 0.16, -0.6, 0, P2);
    ctx.fill();
  }
  void r;
}

/** The punch bag: a stuffed sack on a chain from the right walkway (live, it swings on a spring). */
export const BAG = (() => {
  const top = frontOf(at(walkU(WALKS[1])(0.34), 0.34), sizeAt(0.27));
  return { x: top[0], y: top[1], len: 70, w: 44, h: 112 };
})();
export function bagPaint(c: Ctx, x: number, y: number): void {
  const { len, w, h } = BAG;
  // the chain down from the deck to a ring, four short chains splaying to the bag's cap
  c.lineWidth = 2.4;
  for (let k = 0; k < len - 22; k += 8) {
    c.strokeStyle = INK;
    c.beginPath();
    c.ellipse(x, y + k + 4, k % 16 ? 1.4 : 2.8, 4.2, 0, 0, P2);
    c.stroke();
  }
  const ry = y + len - 20;
  const by = y + len;
  c.strokeStyle = INK;
  c.lineWidth = 2;
  c.beginPath();
  for (const dx of [-w * 0.42, -w * 0.14, w * 0.14, w * 0.42]) {
    c.moveTo(x, ry);
    c.lineTo(x + dx, by + 4);
  }
  c.stroke();
  c.strokeStyle = '#5a606c';
  c.lineWidth = 2.4;
  c.beginPath();
  c.arc(x, ry, 4, 0, P2);
  c.stroke();
  // the bag: a long leather cylinder, oxblood worn brown, a strap round it twice, tape where it split
  const bagP = rrPath(x - w / 2, by, w, h, 12);
  solid(c, bagP, { x: x - w / 2, y: by, w, h }, 'leather', '#5a2c22', { line: 2.2, formSize: 16 });
  within(c, bagP, () => {
    // the cap, a darker band
    c.fillStyle = 'rgba(10,4,4,0.45)';
    c.fillRect(x - w / 2, by, w, 10);
    for (const sy of [by + h * 0.32, by + h * 0.7]) {
      c.fillStyle = '#2a1a14';
      c.fillRect(x - w / 2, sy, w, 7);
      c.fillStyle = 'rgba(200,170,130,0.35)';
      c.fillRect(x - w / 2, sy, w, 1.2);
      c.fillStyle = '#8a8070';
      c.fillRect(x - 5, sy, 6, 7);
    }
    // grey tape over a split
    c.save();
    c.translate(x + 6, by + h * 0.52);
    c.rotate(-0.35);
    c.fillStyle = 'rgba(150,150,140,0.8)';
    c.fillRect(-10, -3, 20, 6);
    c.fillRect(-8, 2, 18, 5);
    c.restore();
    c.fillStyle = rgba(MOONLIT, 0.2);
    c.fillRect(x - w / 2 + 6, by + 8, 4, h - 20);
    dots(c, { x: x - w / 2, y: by, w, h }, linTone(x - 6, 0, x + w / 2, 0, 0, 0.85), '#0a0402', { step: 3.6, angle: 0.79, a: 0.55 });
  });
}
export const BAG_TEX = { w: 80, h: BAG.len + BAG.h + 16 };

/** The downpipe: down the wall from the springing to the floor, between the left and middle lanes. */
export const DOWNPIPE: [number, number][] = [0.34, 0.3, 0.24, 0.18, 0.12, 0.06, 0.02, 0].map((u) => at(u, -0.065, 0.99));

/** The downpipe's hopper head: a cast-iron box catching the water that runs down the dome, overflowing at its lip. */
function hopper(ctx: Ctx, x: number, y: number): void {
  const hp = polyPath([[x - 22, y - 30], [x + 22, y - 30], [x + 14, y - 4], [x + 7, y + 4], [x - 7, y + 4], [x - 14, y - 4]]);
  castShadow(ctx, hp, 8, 7, 0.5, '#02040a');
  solid(ctx, hp, { x: x - 22, y: y - 30, w: 44, h: 34 }, IRON, mix('#353b46', RUST, 0.25), { line: 1.8, formSize: 6 });
  ctx.fillStyle = rgba(MOONLIT, 0.4);
  ctx.fillRect(x - 21, y - 30, 42, 1.6);
  ctx.fillStyle = '#05070c';
  ctx.fillRect(x - 18, y - 28, 36, 4);
  // water streaking the wall from the lip down beside the pipe
  const g = ctx.createLinearGradient(0, y - 26, 0, y + 120);
  g.addColorStop(0, 'rgba(2,4,8,0.45)');
  g.addColorStop(1, 'rgba(2,4,8,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x + 12, y - 26, 10, 146);
  ctx.fillStyle = rgba(MOONLIT, 0.12);
  ctx.fillRect(x + 13, y - 26, 1.2, 120);
}

/** A chain's anchor in the dome: a forged plate leaded into the stone, an eye and a ring through it. */
function eyePlate(ctx: Ctx, x: number, y: number): void {
  const pl = polyPath([[x, y - 16], [x + 13, y - 2], [x, y + 8], [x - 13, y - 2]]);
  castShadow(ctx, pl, 6, 5, 0.5, '#02040a');
  solid(ctx, pl, { x: x - 13, y: y - 16, w: 26, h: 24 }, IRON, mix('#4a505a', RUST, 0.3), { line: 1.6, formSize: 5 });
  for (const [dx, dy] of [[0, -10], [-7, -2], [7, -2]] as const) {
    ctx.fillStyle = '#9aa0aa';
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 1.6, 0, P2);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 5, 6, 0, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = '#6a707c';
  ctx.lineWidth = 2;
  ctx.stroke();
  // rust run down the stone under it
  const g = ctx.createLinearGradient(0, y + 8, 0, y + 40);
  g.addColorStop(0, rgba(RUST, 0.4));
  g.addColorStop(1, rgba(RUST, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - 4, y + 8, 8, 32);
}

// ——— the chains hanging from the dome ———

export const CHAINS = [
  { u: 0.6, p: -0.32, len: 330, s: 8 },
  { u: 0.64, p: 0.26, len: 300, s: 8 },
];
export const chainTop = (c: (typeof CHAINS)[number]): [number, number] => at(c.u, c.p);
const chainHang = (c: (typeof CHAINS)[number]): [number, number] => {
  const [x, y] = chainTop(c);
  return [x, y + 9];
};

/** An iron link at (x, y) turned to ang, face-on (a ring) or edge-on (a bar). */
export function link(c: Ctx, x: number, y: number, ang: number, s: number, face: boolean, lit = 0.7): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  if (face) {
    c.strokeStyle = INK;
    c.lineWidth = s * 0.62;
    c.beginPath();
    c.ellipse(0, 0, s * 0.95, s * 0.55, 0, 0, P2);
    c.stroke();
    c.strokeStyle = '#4a505c';
    c.lineWidth = s * 0.34;
    c.stroke();
    c.strokeStyle = rgba('#b8c4dc', 0.55 * lit);
    c.lineWidth = s * 0.12;
    c.beginPath();
    c.ellipse(0, 0, s * 0.95, s * 0.55, 0, Math.PI * 1.08, Math.PI * 1.62);
    c.stroke();
  } else {
    c.fillStyle = INK;
    c.beginPath();
    c.roundRect(-s * 1.08, -s * 0.27, s * 2.16, s * 0.54, s * 0.27);
    c.fill();
    c.fillStyle = '#3e444e';
    c.beginPath();
    c.roundRect(-s * 0.98, -s * 0.17, s * 1.96, s * 0.34, s * 0.17);
    c.fill();
    c.fillStyle = rgba('#b8c4dc', 0.5 * lit);
    c.fillRect(-s * 0.75, -s * 0.15, s * 1.35, s * 0.07);
  }
  c.restore();
}

/** The shackle on a chain's end. */
export function shackle(c: Ctx, x: number, y: number, ang: number, s: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang - Math.PI / 2);
  c.strokeStyle = INK;
  c.lineWidth = s * 0.9;
  c.beginPath();
  c.ellipse(0, s * 1.6, s * 1.4, s * 1.8, 0, 0, P2);
  c.stroke();
  c.strokeStyle = '#555c68';
  c.lineWidth = s * 0.5;
  c.stroke();
  c.restore();
}

function chainsStill(ctx: Ctx): void {
  for (const ch of CHAINS) {
    const [x, y] = chainHang(ch);
    const n = Math.floor(ch.len / (ch.s * 1.5));
    for (let i = 0; i < n; i++) {
      const yy = y + ch.s * 0.6 + i * ch.s * 1.5;
      const xx = x + Math.sin(i * 0.12) * 2;
      ctx.save();
      ctx.globalAlpha = 0.25;
      link(ctx, xx + 8, yy + 10, Math.PI / 2, ch.s, i % 2 === 0, 0);
      ctx.restore();
      link(ctx, xx, yy, Math.PI / 2, ch.s, i % 2 === 0, 0.5);
    }
    shackle(ctx, x, y + ch.s * 0.6 + n * ch.s * 1.5, Math.PI / 2, ch.s);
  }
}

// ——— the table: a worn slab of prison stone ———

export const PUDDLES: [number, number, number, number][] = [
  [240, 800, 130, 13],
  [1690, 806, 130, 13],
  [320, 1000, 110, 14],
  [1620, 1010, 120, 15],
  [600, 788, 70, 8],
];

function table(ctx: Ctx, r: R): void {
  const zf = PT.front;
  floorPlane(ctx, r, zf, { size: 0.55, depthK: 0.75, a: ['#30363f', '#343a44', '#2e343d', '#363c46', '#2c323b'], grout: '#10131a', gap: 0.025, gloss: 0.25, wear: 0.3, tex: 'speckle', seed: 681 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, zf - TY + 4);
  ctx.clip();
  lay(ctx, noiseMask(10, 683, { cover: 0.45, soft: 0.3, col: '#06080e' }), { x: 0, y: TY, w: W, h: zf - TY }, 0.35);
  vfill(ctx, 0, TY, W, zf - TY, [[0, 'rgba(6,8,14,0.4)'], [0.3, 'rgba(6,8,14,0.05)'], [1, 'rgba(4,6,12,0.25)']]);
  // a green stain spread from the tanks' leaks at the sides, slime in the joints there
  lay(ctx, noiseMask(12, 684, { cover: 0.3, soft: 0.2, col: '#1e3a1c' }), { x: 0, y: TY, w: 320, h: zf - TY }, 0.45);
  lay(ctx, noiseMask(12, 685, { cover: 0.3, soft: 0.2, col: '#1e3a1c' }), { x: W - 320, y: TY, w: 320, h: zf - TY }, 0.45);
  for (const [px, py, rx, ry] of PUDDLES) {
    softly(ctx, { x: px - rx - 30, y: py - ry - 20, w: rx * 2 + 60, h: ry * 2 + 40 }, (g) => {
      g.fillStyle = 'rgba(6,10,18,0.4)';
      g.beginPath();
      g.ellipse(px, py, rx, ry, 0, 0, P2);
      g.fill();
      const sg = g.createLinearGradient(0, py - ry, 0, py + ry);
      sg.addColorStop(0, 'rgba(100,120,160,0.35)');
      sg.addColorStop(1, 'rgba(70,90,130,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.ellipse(px, py, rx * 0.8, ry * 0.8, 0, 0, P2);
      g.fill();
    }, 0.25);
    // the wet slab holds what stands over it: the tanks' green in the side ones (the glass upside down, broken by
    // ripples), the lamp's amber in the one under it
    const tank = PT.tanks.find((tx) => Math.abs(tx - px) < 120);
    const lampAbove = LAMPS.find((l) => Math.abs(l.x - px) < 90);
    if (tank !== undefined || lampAbove) {
      ctx.save();
      ellPath(px, py, rx * 0.92, ry * 0.92)(ctx);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      const col = tank !== undefined ? VENOM : SODIUM;
      const cx = tank ?? lampAbove!.x;
      const hw = tank !== undefined ? T.rx * 0.9 : 10;
      for (let k = 0; k < 7; k++) {
        const yy = py - ry + k * ((ry * 2) / 7);
        const wob = (r() - 0.5) * 8;
        ctx.fillStyle = rgba(col, (tank !== undefined ? 0.14 : 0.2) * (1 - k / 9));
        ctx.fillRect(cx - hw + wob, yy, hw * 2, ry * 0.18);
      }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(160,180,220,0.1)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(px, py, rx * 0.9, ry * 0.9, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  // cracks across the slab where it's settled, and an iron ring stapled into it at each front corner (the old
  // prisoners' shackle rings), out of the lanes
  ctx.strokeStyle = 'rgba(4,6,10,0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of [[220, 800, 300, 880], [1660, 790, 1580, 900], [600, 1010, 700, 960], [1300, 960, 1380, 1030]] as const) {
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 12, (y0 + y1) / 2 - 6, x1, y1);
  }
  ctx.stroke();
  for (const [rx0, ry0] of [[110, 960], [1810, 960]] as const) {
    groundShadow(ctx, rx0 + 6, ry0 + 8, 30, 8, 0.6, '#02040a');
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(rx0, ry0, 24, 9, 0, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = mix('#4a505a', RUST, 0.45);
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.strokeStyle = rgba(MOONLIT, 0.35);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(rx0, ry0, 24, 9, 0, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
    // its staple
    ctx.fillStyle = '#1a1e26';
    ctx.fillRect(rx0 - 5, ry0 - 14, 10, 8);
  }
  // the moon's pool reaching the back of the slab at the right, the Venom's green at the sides
  lightPool(ctx, 1320, TY + 20, 300, 30, MOONLIT, 0.05);
  lightPool(ctx, PT.tanks[0], TY + 26, 260, 40, VENOM, 0.05);
  lightPool(ctx, PT.tanks[1], TY + 26, 260, 40, VENOM, 0.05);
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => 0.25 * smooth(zf - 200, zf, y) + 0.15 * (1 - smooth(TY, TY + 60, y)) + (0.12 * Math.abs(x - 960)) / 960, '#02040c', { step: 8, angle: 0.79, a: 0.3, floor: 0.06 });
  ctx.restore();
  tableFalloff(ctx, zf, 0.45, '#02040a');
  tableSeam(ctx, 0.65, INK, false);
  ctx.fillStyle = 'rgba(140,156,190,0.22)';
  ctx.fillRect(0, TY - 1, W, 2);
  crevice(ctx, 0, W, TY + 1, 14, 0.45, '#02040a');
  // the slab's front: rough-dressed, dark, wet
  const lip = rectPath(0, zf, W, 1080 - zf);
  ctx.save();
  lip(ctx);
  ctx.clip();
  vfill(ctx, 0, zf, W, 1080 - zf, [[0, '#262c36'], [0.3, '#161a22'], [1, '#08090e']]);
  ctx.fillStyle = 'rgba(170,186,220,0.26)';
  ctx.fillRect(0, zf, W, 2);
  ctx.strokeStyle = 'rgba(2,3,8,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 120; x < W; x += 260) {
    ctx.moveTo(x, zf);
    ctx.lineTo(x + 6, 1080);
  }
  ctx.stroke();
  dots(ctx, { x: 0, y: zf, w: W, h: 1080 - zf }, (_x, y) => 0.25 + 0.5 * smooth(zf, 1080, y), '#000000', { step: 7, angle: 0.79, a: 0.5 });
  ctx.restore();
}

// ——— the still's live stand-ins: rain in the moonlight ———

function rainStill(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 170; i++) {
    const t = r();
    const ang = (r() - 0.5) * 2.2;
    const x0 = PT.sky.x + Math.sin(ang) * PT.sky.rx * 0.8;
    const y0 = PT.sky.y + Math.cos(ang) * PT.sky.ry * 0.5;
    const x = x0 + Math.sin(ang) * t * 380 + t * 60;
    const y = y0 + t * 560;
    const inBeam = x > 800 + (y - 196) * 0.57 && x < 1050 + (y - 226) * 0.92;
    ctx.strokeStyle = inBeam ? `rgba(230,238,255,${(0.2 + r() * 0.2).toFixed(2)})` : `rgba(150,168,204,${(0.07 + r() * 0.08).toFixed(2)})`;
    ctx.lineWidth = 1 + t;
    const len = 8 + t * 26;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(ang) * len * 0.5 + len * 0.1, y + len);
    ctx.stroke();
  }
  ctx.restore();
}

function needlesStill(ctx: Ctx): void {
  for (const x of PT.tanks) {
    const d = DIAL(x);
    needle(ctx, d.x, d.y, d.r, 0.45);
  }
}
/** A dial's needle at v (0 … 1 round the sweep; red from about 0.85). */
export function needle(c: Ctx, x: number, y: number, rad: number, v: number): void {
  const a = Math.PI * 0.75 + v * Math.PI * 1.5;
  c.strokeStyle = '#1a1a20';
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - Math.cos(a) * 4, y - Math.sin(a) * 4);
  c.lineTo(x + Math.cos(a) * (rad - 5), y + Math.sin(a) * (rad - 5));
  c.stroke();
  c.fillStyle = '#1a1a20';
  c.beginPath();
  c.arc(x, y, 2.6, 0, P2);
  c.fill();
}

// ——— finishing ———

function shadeOver(ctx: Ctx): void {
  // the HUD's corner calm, the lanes calm, the pit's vignette
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(2,4,10,0.4)');
  g.addColorStop(1, 'rgba(2,4,10,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
  calmLanes(ctx, 0.16, '#02040c', 200, 720);
  vfill(ctx, 0, 0, W, 100, [[0, 'rgba(2,3,8,0.4)'], [1, 'rgba(2,3,8,0)']]);
  vignetteAll(ctx, 0.66, '#010208', 0.48);
}

// ——— the stack ———

const WALK_BOX: Box = { x: 0, y: 0, w: W, h: 560 };
const FLOOR_BOX: Box = { x: 0, y: 560, w: W, h: TY + 4 - 560 };
const BAG_STILL_BOX: Box = { x: BAG.x - 60, y: BAG.y - 6, w: 140, h: BAG.len + BAG.h + 40 };

export const BUNION: SceneSpec = {
  id: 'bunion',
  info: {
    name: 'The Pit',
    subtitle: 'Mini-boss: BUNION',
    ambient: [],
    glows: [],
    light: '#bcd8d0',
    tableTint: '#e8f2ec',
  },
  layers: [
    { id: 'walls', box: { x: 0, y: 0, w: W, h: TY + 4 }, draw: walls },
    { id: 'sky', box: SKY_BOX, draw: skyDisc },
    { id: 'grille', box: GRILLE_BOX, draw: grille },
    {
      id: 'iron',
      box: WALK_BOX,
      draw: (c, r) => {
        cellDoor(c, r, -0.31, walkU(WALKS[0])(-0.31) + 0.004, 0.11, 0.075);
        cellDoor(c, r, 0.56, walkU(WALKS[1])(0.56) + 0.004, 0.1, 0.07);
        cellDoor(c, r, -0.62, walkU(WALKS[2])(-0.62) + 0.004, 0.07, 0.07);
        // a downpipe from the dome to the floor's gully, between the lanes, dripping at its joints
        pipe(c, DOWNPIPE, 12, '#353b46', [3, 7]);
        hopper(c, ...DOWNPIPE[0]);
        for (const ch of CHAINS) eyePlate(c, ...chainTop(ch));
        pipe(c, arcPts(0.1, 0.16, 0.66, 1, 16), 13, '#3e4450', [0, 8, 16]);
        for (const w of WALKS) {
          if (w.above) {
            walkwayTop(c, w);
            brokenEndTop(c, w);
          } else {
            walkway(c, w);
            brokenEnd(c, w, 0);
          }
        }
        ladder(c, -0.55, 0.0, walkU(WALKS[0])(-0.55));
        ladder(c, 0.66, walkU(WALKS[1])(0.66), walkU(WALKS[3])(0.66));
        davit(c);
        lamp(c);
      },
    },
    { id: 'tubes', box: { x: 0, y: 0, w: W, h: 340 }, draw: (c) => TUBES.forEach((t, i) => tube(c, t, i % 2 ? 9 : 13)) },
    { id: 'floor', box: FLOOR_BOX, draw: (c, r) => {
      pitFloor(c, r);
      winch(c);
      gym(c, r);
    } },
    { id: 'shaft', draw: (c, r) => {
      moonShaft(c, r);
      lampLight(c);
    } },
    { id: 'venomStill', stillOnly: true, draw: (c) => PT.tanks.forEach((x) => venomLight(c, x, 1)) },
    { id: 'tankBackL', box: TANK_BOX(PT.tanks[0]), draw: (c) => tankBack(c, PT.tanks[0]) },
    { id: 'tankBackR', box: TANK_BOX(PT.tanks[1]), draw: (c) => tankBack(c, PT.tanks[1]) },
    { id: 'liquidStill', stillOnly: true, draw: (c) => PT.tanks.forEach((x, i) => venomStill(c, x, i)) },
    { id: 'liquidL', box: LIQ_BOX(PT.tanks[0]), motion: 'slot', draw: () => {} },
    { id: 'liquidR', box: LIQ_BOX(PT.tanks[1]), motion: 'slot', draw: () => {} },
    { id: 'tankL', box: TANK_FRONT_BOX(PT.tanks[0]), draw: (c) => tankFront(c, PT.tanks[0]) },
    { id: 'tankR', box: TANK_FRONT_BOX(PT.tanks[1]), draw: (c) => tankFront(c, PT.tanks[1]) },
    { id: 'table', box: { x: 0, y: TY - 4, w: W, h: 1080 - TY + 4 }, draw: table },
    // (live only, laid on with ADD and flared or guttered by the fight: the Venom's light; the mouth lit by lightning)
    { id: 'venomL', box: VGLOW_BOX(PT.tanks[0]), liveOnly: true, res: 0.33, draw: (c) => venomLight(c, PT.tanks[0], VGLOW_K) },
    { id: 'venomR', box: VGLOW_BOX(PT.tanks[1]), liveOnly: true, res: 0.33, draw: (c) => venomLight(c, PT.tanks[1], VGLOW_K) },
    { id: 'skyLit', box: GRILLE_BOX, liveOnly: true, res: 0.5, draw: skyLit },
    { id: 'chainStill', stillOnly: true, draw: chainsStill },
    { id: 'bagStill', box: BAG_STILL_BOX, stillOnly: true, draw: (c) => bagPaint(c, BAG.x, BAG.y) },
    { id: 'needleStill', stillOnly: true, draw: needlesStill },
    { id: 'rainStill', stillOnly: true, draw: rainStill },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  shade: shadeOver,
};

// ——— live ———

type Pt = [number, number];

/** A hanging chain: a rope of points pinned at its top and free at its foot (Verlet, in screen px). */
class Chain {
  x: number[] = [];
  y: number[] = [];
  px: number[] = [];
  py: number[] = [];
  constructor(top: Pt, readonly len: number, readonly n: number) {
    for (let i = 0; i < n; i++) {
      const y = top[1] + (len * i) / (n - 1);
      this.x.push(top[0]);
      this.y.push(y);
      this.px.push(top[0]);
      this.py.push(y);
    }
  }
  get seg(): number {
    return this.len / (this.n - 1);
  }
  step(dt: number, top: Pt): void {
    const n = this.n;
    for (let i = 1; i < n; i++) {
      const vx = (this.x[i] - this.px[i]) * 0.992;
      const vy = (this.y[i] - this.py[i]) * 0.992;
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      this.x[i] += vx;
      this.y[i] += vy + 900 * dt * dt;
    }
    this.x[0] = top[0];
    this.y[0] = top[1];
    for (let it = 0; it < 10; it++) {
      for (let i = 0; i < n - 1; i++) {
        const dx = this.x[i + 1] - this.x[i];
        const dy = this.y[i + 1] - this.y[i];
        const d = Math.hypot(dx, dy) || 0.001;
        const diff = (d - this.seg) / d;
        const wa = i === 0 ? 0 : 0.5;
        const wb = i === 0 ? 1 : 0.5;
        this.x[i] += dx * diff * wa;
        this.y[i] += dy * diff * wa;
        this.x[i + 1] -= dx * diff * wb;
        this.y[i + 1] -= dy * diff * wb;
      }
    }
  }
  /** A push: adds a velocity (px/s at the free end, less up the chain) for steps of h seconds. */
  kick(vx: number, vy: number, h = 1 / 120): void {
    for (let i = 1; i < this.n; i++) {
      const w = i / (this.n - 1);
      this.px[i] -= vx * h * w;
      this.py[i] -= vy * h * w;
    }
  }
}

/** Where the links lie along a chain: every 1.5 s px, turned along it, face-on and edge-on in turn. */
function linkPlaces(ch: Chain, s: number, count: number): { x: number; y: number; ang: number; face: boolean }[] {
  const out: { x: number; y: number; ang: number; face: boolean }[] = [];
  let i = 1;
  let acc = 0;
  let segLen = Math.hypot(ch.x[1] - ch.x[0], ch.y[1] - ch.y[0]);
  for (let k = 0; k < count; k++) {
    const d = s * 0.6 + k * s * 1.5;
    while (i < ch.n - 1 && acc + segLen < d) {
      acc += segLen;
      i++;
      segLen = Math.hypot(ch.x[i] - ch.x[i - 1], ch.y[i] - ch.y[i - 1]);
    }
    const t = Math.min(1, (d - acc) / Math.max(0.001, segLen));
    const x0 = ch.x[i - 1];
    const y0 = ch.y[i - 1];
    out.push({ x: x0 + (ch.x[i] - x0) * t, y: y0 + (ch.y[i] - y0) * t, ang: Math.atan2(ch.y[i] - y0, ch.x[i] - x0), face: k % 2 === 0 });
  }
  return out;
}

/** A tube's path as a polyline with its running length (for the pulses that run up it). */
function sampleTube(t: Pt[]): { pts: Pt[]; len: number[] } {
  const pts: Pt[] = [];
  const q = (a: Pt, ctl: Pt, b: Pt, u: number): Pt => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * ctl[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * ctl[1] + u * u * b[1]];
  let cur: Pt = t[0];
  pts.push(cur);
  for (let i = 1; i < t.length - 1; i++) {
    const end: Pt = [(t[i][0] + t[i + 1][0]) / 2, (t[i][1] + t[i + 1][1]) / 2];
    for (let k = 1; k <= 8; k++) pts.push(q(cur, t[i], end, k / 8));
    cur = end;
  }
  pts.push(t[t.length - 1]);
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, len };
}
function alongTube(tb: { pts: Pt[]; len: number[] }, d: number): Pt {
  const { pts, len } = tb;
  let i = 1;
  while (i < pts.length - 1 && len[i] < d) i++;
  const t = Math.max(0, Math.min(1, (d - len[i - 1]) / Math.max(0.001, len[i] - len[i - 1])));
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
}

/** Where the moon's shaft spans across at screen y (its left and right edge). */
const beamSpan = (y: number): [number, number] => {
  const u = Math.max(0, Math.min(1, (y - BEAM_TOP[1]) / (BEAM_BOT[1] - BEAM_TOP[1])));
  return [BEAM_TOP[0] + (BEAM_BOT[0] - BEAM_TOP[0]) * u, BEAM_TOP[2] + (BEAM_BOT[2] - BEAM_TOP[2]) * u];
};

registerKitScene(BUNION, (k) => {
  const fx = k.slot('fx');
  const B = Phaser.BlendModes;

  // ——— the Venom: the boiling frame loops, the glow, the tubes' pulses, the dials ———
  const VR = 0.5;
  const venKey = sheet(k, 'bu_venom', LIQ.w * VR, LIQ.h * VR, 12, (c, ph) => {
    c.scale(VR, VR);
    venomFrame(c, ph, 51);
  });
  const liquids = PT.tanks.map((x, i) => {
    const l = new Loop(k, venKey, 12, x - T.rx, T.top, { into: k.slot(i ? 'liquidR' : 'liquidL'), origin: [0, 0], scale: 1 / VR, fps: 7, phase: i * 5 });
    if (i) l.each((im) => im.setFlipX(true));
    return l;
  });
  const glows = [k.sprite('venomL'), k.sprite('venomR')].map((s) => s.setBlendMode(B.ADD));
  const cores = PT.tanks.map((x) => k.glow(x, (T.top + T.bottom) / 2, 150, 0x9aff7a, 0, { into: fx, sy: 1.9 }));
  const bubbles = new Parts(k, { frame: 'bubble', into: fx, add: true, max: 120 });
  const bubRate = PT.tanks.map(() => new Rate());
  const tubes = TUBES.map(sampleTube);
  type Pulse = { tb: number; d: number; v: number; imgs: Phaser.GameObjects.Image[]; a: number };
  const pulses: Pulse[] = [];
  const pulseFree: Phaser.GameObjects.Image[][] = [];
  const pulse = (tb: number, a = 1) => {
    const imgs = pulseFree.pop() ?? [0, 1, 2].map((j) => k.glow(0, 0, 22 - j * 5, j ? 0x7dff6a : 0xd8ffb0, 0, { into: fx }));
    pulses.push({ tb, d: 0, v: 260 + crand() * 120, imgs, a });
  };
  const pulseRate = TUBES.map(() => new Rate());
  const needleKey = k.tex('bu_needle', 48, 48, (c) => needle(c, 24, 24, DIAL(0).r, 0.5));
  const needles = PT.tanks.map((x) => {
    const d = DIAL(x);
    return { img: k.img(needleKey, d.x, d.y, { into: fx }), sp: new Spring(0.45, 14, 0.9) };
  });
  const lampGlows = LAMPS.map((l) => k.glow(l.x, l.y + 8, 60, 0xffc070, 0.35, { into: fx }));

  // the fight's state: how many vials are full (0…1), a flare that dies away, a gutter that recovers, the surge
  let level = 1 / 3;
  let shownLevel = level;
  let flare = 0;
  let gutter = 0;
  let surgeT = 0;
  let boil = 0;

  // ——— the chains and the punch bag ———
  const LS = 2.5;
  const linkKey = sheet(k, 'bu_link', 26 * LS, 16 * LS, 2, (c, _p, i) => {
    c.scale(LS, LS);
    link(c, 13, 8, 0, 8, i === 0, 0.8);
  });
  const shKey = k.tex('bu_shackle', 40, 50, (c) => shackle(c, 20, 6, Math.PI / 2, 8));
  const chains = CHAINS.map((ch) => {
    const rope = new Chain(chainHang(ch), ch.len, 22);
    const count = Math.floor(ch.len / (ch.s * 1.5));
    const sh = Array.from({ length: count }, () => k.img(linkKey, 0, 0, { into: fx, tint: 0x000000, alpha: 0.22 }));
    const ls = Array.from({ length: count }, () => k.img(linkKey, 0, 0, { into: fx, tint: 0xc0c8d8 }));
    const end = k.img(shKey, 0, 0, { into: fx, origin: [0.5, 6 / 50] });
    return { ch, rope, count, ls, sh, end, scale: 1 / LS };
  });
  const chainAcc = { t: 0 };
  const bagKey = k.tex('bu_bag', BAG_TEX.w, BAG_TEX.h, (c) => bagPaint(c, BAG_TEX.w / 2, 6));
  const bag = k.img(bagKey, BAG.x, BAG.y, { into: fx, origin: [0.5, 6 / BAG_TEX.h] });
  const bagSp = new Spring(0, 5, 0.5);

  // ——— the rain down the shaft, drips, splashes and ripples ———
  const rainDim = new Parts(k, { frame: 'drop', into: fx, max: 140 });
  const rainLit = new Parts(k, { frame: 'drop', into: fx, add: true, max: 90 });
  const rainRate = new Rate();
  const drops = new Parts(k, { frame: 'drop', into: fx, max: 80 });
  const greenDrops = new Parts(k, { frame: 'drop', into: fx, add: true, max: 30 });
  const dripRate = new Rate();
  const splashKey = sheet(k, 'bu_splash', SPLASH.w, SPLASH.h, SPLASH.n, (c, _p, i) => splashFrame(c, i));
  type Spl = { img: Phaser.GameObjects.Image; t: number; dur: number };
  const spl: Spl[] = Array.from({ length: 40 }, () => ({ img: k.img(splashKey, 0, 0, { into: fx, origin: [0.5, (SPLASH.h - 5) / SPLASH.h] }).setVisible(false), t: -1, dur: 0.3 }));
  const persp = (y: number) => Phaser.Math.Clamp((y - 400) / (PT.front - 400), 0.35, 1);
  const splash = (x: number, y: number, sc = 1, tint = 0xffffff) => {
    const s = spl.find((q) => q.t < 0);
    if (!s) return;
    s.t = 0;
    s.dur = 0.24 + crand() * 0.1;
    s.img.setPosition(x, y).setScale(sc * persp(y) * (0.8 + crand() * 0.5)).setVisible(true).setFlipX(crand() < 0.5).setTint(tint);
  };
  const ringKey = k.tex('bu_ring', 64, 32, ringTex);
  type Ring = { img: Phaser.GameObjects.Image; t: number; s: number };
  const rings: Ring[] = Array.from({ length: 16 }, () => ({ img: k.img(ringKey, 0, 0, { into: fx, add: true, alpha: 0 }), t: -1, s: 1 }));
  const ripple = (x: number, y: number, s: number) => {
    const q = rings.find((g) => g.t < 0);
    if (!q) return;
    q.t = 0;
    q.s = s * persp(y);
    q.img.setPosition(x, y);
  };
  const ringRate = new Rate();
  /** Drip points: under the walkways' decks and the pipe's flanges (water), the tanks' tube unions (Venom). */
  const wetDrips: Pt[] = [];
  for (const w of WALKS.slice(0, 2))
    for (let i = 1; i < 6; i++) {
      const p = w.p0 + ((w.p1 - w.p0) * i) / 6;
      const pt = at(walkU(w)(p) - 0.012, p, 1 - DECK);
      if (pt[0] > 20 && pt[0] < W - 20) wetDrips.push(pt);
    }
  wetDrips.push(at(0.1, 0.16, 0.99), at(0.1, 0.41, 0.99), at(0.1, 0.66, 0.99), DOWNPIPE[3], DOWNPIPE[6]);
  const venomDrips: Pt[] = PT.tanks.map((x) => [x + (x < 960 ? 24 : -24), T.cap + 14]);

  // ——— grit and dust off the walls at a stomp ———
  const grit = new Parts(k, { frame: 'mote', into: fx, max: 120 });
  const dust = new Parts(k, { frame: 'puff', into: fx, max: 50 });
  const shed = (n: number, p: number) => {
    for (let i = 0; i < n; i++) {
      // from the mortar joints (mostly up the sides, out of the lanes), and off the walkways' grating
      const deck = crand() < 0.3 && wetDrips.length;
      const u = 0.06 + crand() * 0.55;
      const ph = (crand() < 0.5 ? -1 : 1) * (0.25 + crand() * 1.1);
      const [x, y] = deck ? wetDrips[Math.floor(crand() * wetDrips.length)] : at(u, ph);
      if (x < 10 || x > W - 10 || y > TY - 40) continue;
      const fl = wallFoot(x) + 4 + crand() * 14;
      for (let j = 0; j < 2; j++) grit.spawn({ x: x + (crand() - 0.5) * 16, y, vx: (crand() - 0.5) * 40, vy: 10 + crand() * 40, life: 2.4, r0: 1.4 + crand() * 2, a: 0.95, tint: crand() < 0.5 ? 0x9aa4b8 : 0x6a7286, grav: 900, floor: Math.min(TY - 2, fl), bounce: 0.25, fade: 0.02 });
      if (crand() < 0.5 + p * 0.4) dust.spawn({ x, y, vx: (crand() - 0.5) * 24, vy: 24 + crand() * 30, life: 2.2 + crand(), r0: 6, r1: 26 + crand() * 18, a: 0.3, tint: 0x8a94a8, grav: 30, drag: 1.4, fade: 0.08 });
    }
  };

  // ——— lightning in the mouth ———
  const skyLitImg = k.sprite('skyLit');
  const shaftFlash = k.glow(PT.sky.x, PT.sky.y + 260, 560, 0xb8c8ff, 0, { into: fx, sy: 0.9 });
  let nextBolt = 6 + crand() * 8;
  let boltT = -1;
  let boltP: number[] = [];

  function spawnBubble(x: number, burst = false): void {
    const y0 = T.bottom - 30 - crand() * 40;
    const vy = -(70 + crand() * 90) * (burst ? 1.8 : 1);
    const life = (y0 - (T.top + 28)) / -vy;
    bubbles.spawn({ x: x + (crand() - 0.5) * T.rx * 1.5, y: y0, vx: (crand() - 0.5) * 10, vy, life, r0: 1.6 + crand() * 1.8, r1: 3 + crand() * 3.5, a: 0.75, tint: 0xd0ffb8, fade: 0.08 });
  }

  // ——— the fight, heard (src/game/bosses/gotham.ts, the bunion brain) ———
  const kickNeedles = (v: number) => needles.forEach((n) => (n.sp.v += v * (0.7 + crand() * 0.6)));
  const kickChains = (p: number) => {
    for (const c of chains) c.rope.kick((crand() < 0.5 ? -1 : 1) * (90 + crand() * 60) * p, -30 * p);
    bagSp.v += (crand() < 0.5 ? -1 : 1) * 1.4 * p;
  };
  const onPump = (n?: number) => {
    level = Phaser.Math.Clamp((n ?? Math.round(level * 3) + 1) / 3, 0, 1);
    flare = 1;
    gutter = 0;
    boil = Math.max(boil, 1);
    tubes.forEach((_, i) => {
      pulse(i, 1);
      k.sc.time.delayedCall(140 + crand() * 120, () => pulse(i, 0.8));
    });
    kickNeedles(4);
    for (const x of PT.tanks) for (let j = 0; j < 14; j++) spawnBubble(x, true);
  };
  const onSurge = () => {
    level = 1;
    flare = 1;
    gutter = 0;
    surgeT = 2.4;
    boil = 1.6;
    kickNeedles(9);
    kickChains(0.8);
  };
  const onDrain = (n?: number) => {
    level = Phaser.Math.Clamp((n ?? Math.round(level * 3) - 1) / 3, 0, 1);
    gutter = 1;
    flare = 0;
    boil = 0;
    kickNeedles(-5);
  };
  const onSpent = () => {
    level = 0;
    gutter = 1;
    flare = 0;
    surgeT = 0;
    boil = 0;
    kickNeedles(-8);
  };
  const onBreak = () => {
    onSpent();
    kickChains(1);
    shed(16, 0.6);
  };
  const ev = k.sc.events;
  ev.on('bunion-pump', onPump);
  ev.on('bunion-surge', onSurge);
  ev.on('bunion-drain', onDrain);
  ev.on('bunion-spent', onSpent);
  ev.on('bunion-break', onBreak);
  const unlisten = () => {
    ev.off('bunion-pump', onPump);
    ev.off('bunion-surge', onSurge);
    ev.off('bunion-drain', onDrain);
    ev.off('bunion-spent', onSpent);
    ev.off('bunion-break', onBreak);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  /** In a fight (the game scene has its boss slots), or on the stages page, where the rig runs a cycle on its own. */
  const inFight = 'miniFoot' in (k.sc as object);
  const DEMO: (() => void)[] = [() => onPump(2), () => onPump(3), onSurge, onSpent, () => onPump(1), () => onDrain(0), () => onPump(1)];
  let demoI = 0;
  let demoT = 4;

  return {
    impact(x, _y, p) {
      shed(Math.round(4 + p * 18), p);
      for (const c of chains) c.rope.kick((x < 960 ? 1 : -1) * (30 + crand() * 50) * p, -(10 + crand() * 20) * p);
      bagSp.v += (x < BAG.x ? 1 : -1) * (0.3 + p * 0.8);
      // the puddles jump
      for (const [px, py, rx] of [...PUDDLES, ...FLOOR_PUDDLES]) {
        if (Math.abs(px - x) > 700) continue;
        ripple(px + (crand() - 0.5) * rx, py, 1.4 + p);
        for (let j = 0; j < 2 + p * 4; j++) {
          const sx = px + (crand() - 0.5) * rx * 1.4;
          splash(sx, py, 1.8);
          drops.spawn({ x: sx, y: py - 2, vx: (crand() - 0.5) * 160, vy: -140 - crand() * 220 * (0.5 + p), life: 1.6, r0: 2 * persp(py), a: 0.75, tint: 0xc8d4ff, grav: 1400, streak: 0.012, floor: py + crand() * 6, onFloor: (fx2, fy) => splash(fx2, fy, 0.8) });
        }
      }
      // the Venom slops and a burst of bubbles
      for (const tx of PT.tanks) for (let j = 0; j < 4 + p * 8; j++) spawnBubble(tx, true);
      kickNeedles(1.5 * p);
      if (!inFight && p >= 0.95) onPump();
    },
    update(dt, t) {
      const cm = calm();
      // ——— the fight's light
      flare = Math.max(0, flare - dt * 0.9);
      gutter = Math.max(0, gutter - dt * 0.35);
      surgeT = Math.max(0, surgeT - dt);
      boil = Math.max(surgeT > 0 ? 1.4 : 0, boil - dt * 0.5);
      shownLevel += (level - shownLevel) * Math.min(1, dt * 1.5);
      if (!inFight) {
        demoT -= dt;
        if (demoT < 0) {
          demoT = 4.5;
          DEMO[demoI++ % DEMO.length]();
        }
      }
      const strobe = surgeT > 0 ? 0.35 + 0.35 * Math.max(0, Math.sin(t * 26)) : 0;
      const gut = gutter > 0 ? (1 - 0.75 * gutter) * (0.8 + 0.2 * Math.sin(t * 31) * Math.sin(t * 13)) : 1;
      const breathe = 0.92 + 0.08 * Math.sin(t * 1.4) + 0.03 * wander(t, 2, 2);
      const I = Phaser.Math.Clamp((0.34 + 0.4 * shownLevel) * breathe * (1 + 0.8 * flare + strobe) * gut, 0, 1);
      glows.forEach((g, i) => g.setAlpha(Phaser.Math.Clamp(I * (1 + 0.04 * Math.sin(t * 3 + i * 2)), 0, 1)));
      cores.forEach((c) => c.setAlpha(0.05 + 0.25 * flare + strobe * 0.4));
      // ——— the boiling: faster with the level, hard after a pump, roaring in a surge, sluggish when guttered
      const sp = (0.6 + 0.6 * shownLevel + 2.2 * boil) * (1 - 0.6 * gutter) * cm;
      const lum = Math.round(150 + 105 * Math.min(1, I * 1.3));
      liquids.forEach((l) => {
        l.step(dt, sp);
        l.alpha = 0.75 + 0.25 * Phaser.Math.Clamp(I * 1.4, 0, 1);
        l.each((im) => im.setTint(Phaser.Display.Color.GetColor(lum, 255, lum)));
      });
      PT.tanks.forEach((x, i) => bubRate[i].tick((2 + 6 * shownLevel + 30 * boil) * (1 - 0.8 * gutter) * cm, dt, () => spawnBubble(x)));
      // ——— the tubes: pulses up them, more often the fuller he is
      TUBES.forEach((_, i) => pulseRate[i].tick((0.08 + 0.35 * shownLevel + 2.5 * (surgeT > 0 ? 1 : 0)) * (1 - gutter) * cm, dt, () => pulse(i, 0.6)));
      for (let i = pulses.length - 1; i >= 0; i--) {
        const q = pulses[i];
        const tb = tubes[q.tb];
        q.d += q.v * dt * (1 + boil * 0.5);
        const L = tb.len[tb.len.length - 1];
        if (q.d > L) {
          q.imgs.forEach((im) => im.setAlpha(0));
          pulseFree.push(q.imgs);
          pulses.splice(i, 1);
          continue;
        }
        const fade = Math.min(1, q.d / 40) * (1 - smooth(L * 0.6, L, q.d));
        q.imgs.forEach((im, j) => {
          const [x, y] = alongTube(tb, Math.max(0, q.d - j * 14));
          im.setPosition(x, y).setAlpha(fade * q.a * (j ? 0.5 : 0.85));
        });
      }
      // ——— the dials
      for (const n of needles) {
        const target = 0.3 + 0.5 * shownLevel + (surgeT > 0 ? 0.25 : 0) - 0.15 * gutter + Math.sin(t * 17) * 0.01 * (1 + boil * 3);
        const v = n.sp.step(target, dt);
        n.img.setRotation((Phaser.Math.Clamp(v, -0.05, 1.08) - 0.5) * Math.PI * 1.5);
      }
      lampGlows.forEach((g, i) => g.setAlpha(0.3 * flicker(t * 0.7, 4 + i * 3)));
      // ——— the chains: hanging, idly stirring in the shaft's draught, swinging when kicked
      chainAcc.t += Math.min(dt, 0.1);
      const H = 1 / 120;
      while (chainAcc.t >= H) {
        chainAcc.t -= H;
        for (const c of chains) c.rope.step(H, chainHang(c.ch));
      }
      for (const [ci, c] of chains.entries()) {
        c.rope.kick(Math.sin(t * 0.6 + ci * 2) * 5 * cm * dt, 0);
        const pl = linkPlaces(c.rope, c.ch.s, c.count);
        for (let j = 0; j < c.count; j++) {
          const p = pl[j];
          c.ls[j].setFrame(p.face ? 0 : 1).setPosition(p.x, p.y).setRotation(p.ang).setScale(c.scale);
          c.sh[j].setFrame(p.face ? 0 : 1).setPosition(p.x + 8, p.y + 10).setRotation(p.ang).setScale(c.scale);
        }
        const last = pl[c.count - 1];
        c.end.setPosition(last.x + Math.cos(last.ang) * c.ch.s * 0.9, last.y + Math.sin(last.ang) * c.ch.s * 0.9).setRotation(last.ang - Math.PI / 2);
      }
      bag.setRotation(bagSp.step(Math.sin(t * 0.5) * 0.015 * cm, dt));
      // ——— rain down the shaft: from the grille, falling and spreading, lit where it crosses the moon
      rainRate.tick(70 * cm, dt, () => {
        const a = (crand() - 0.5) * 2.6;
        const rr = Math.sqrt(crand());
        const x0 = PT.sky.x + Math.sin(a) * PT.sky.rx * rr;
        const y0 = PT.sky.y + Math.cos(a) * PT.sky.ry * rr * 0.6 + 10;
        const vx = Math.sin(a) * (40 + crand() * 90) + 30;
        const vy = 120 + crand() * 140;
        const floor = 690 + crand() * 60;
        // where it'll be halfway down: in the moon's shaft or not
        const tm = 0.45;
        const xm = x0 + vx * tm;
        const ym = y0 + vy * tm + 450 * tm * tm;
        const [b0, b1] = beamSpan(ym);
        const lit = xm > b0 && xm < b1;
        (lit ? rainLit : rainDim).spawn({ x: x0, y: y0, vx, vy, life: 1.8, r0: 1.1, r1: 2.2, a: lit ? 0.7 : 0.45, tint: lit ? 0xf0f4ff : 0x98a8c8, grav: 900, streak: 0.03, floor, onFloor: (sx, sy) => crand() < 0.6 && splash(sx, sy, 0.7) });
      });
      // big near drops into the table's puddles now and then
      ringRate.tick(1.6 * cm, dt, () => {
        const [px, py, rx, ry] = PUDDLES[Math.floor(crand() * PUDDLES.length)];
        const sx = px + (crand() - 0.5) * rx * 1.2;
        const sy = py + (crand() - 0.5) * ry;
        ripple(sx, sy, 0.6 + crand() * 0.6);
        splash(sx, sy, 1);
      });
      // drips: water off the walkways and the pipe, Venom off the tube unions
      dripRate.tick(3 * cm, dt, () => {
        if (crand() < 0.2) {
          const [x, y] = venomDrips[Math.floor(crand() * venomDrips.length)];
          greenDrops.spawn({ x, y, vx: 0, vy: 0, life: 2, r0: 2, a: 0.85, tint: 0x9aff7a, grav: 900, streak: 0.012, floor: T.foot - 4, onFloor: (sx, sy) => splash(sx, sy, 0.8, 0xa8ff90) });
          return;
        }
        const [x, y] = wetDrips[Math.floor(crand() * wetDrips.length)];
        drops.spawn({ x: x + (crand() - 0.5) * 6, y, vx: 0, vy: 0, life: 2.2, r0: 1.8, a: 0.75, tint: 0xc8d4ff, grav: 900, streak: 0.014, floor: Math.min(TY - 2, wallFoot(x) + 6 + crand() * 20), onFloor: (sx, sy) => splash(sx, sy, 0.8) });
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
        q.img.setScale(q.s * (0.2 + u * 0.9)).setAlpha(0.3 * (1 - u));
      }
      // ——— lightning over the mouth now and then: the sky blazes, the shaft flashes cold
      nextBolt -= dt;
      if (nextBolt < 0) {
        nextBolt = 9 + crand() * 10;
        boltT = 0;
        boltP = [0, 0.14 + crand() * 0.06];
        if (crand() < 0.5) boltP.push(0.32 + crand() * 0.1);
      }
      let fl = 0;
      if (boltT >= 0) {
        boltT += dt;
        for (const s0 of boltP) {
          const u = boltT - s0;
          if (u >= 0) fl = Math.max(fl, u < 0.06 ? 1 : Math.exp(-(u - 0.06) * 8));
        }
        if (boltT > 1.4) boltT = -1;
      }
      skyLitImg.setAlpha(fl * 0.9);
      shaftFlash.setAlpha(fl * 0.16);
      bubbles.update(dt);
      rainDim.update(dt);
      rainLit.update(dt);
      drops.update(dt);
      greenDrops.update(dt);
      grit.update(dt);
      dust.update(dt);
    },
    destroy() {
      unlisten();
    },
  };
});
