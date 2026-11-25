// The Oven Between Worlds (Stage 19, the first stage of Act 10, the finale; waves 91–94), redrawn with the location
// kit (src/art/scene). (The old art is kept in scenes-act10.ts for the before/after page.)
//
// The last pizzeria kitchen, torn loose from every world and drifting in the void between them. A great domed
// wood-fired oven stands at the centre on a raft of chequered floor: a facade of brick voussoirs round a mouth so big
// a giant could step through it (FIN.portal), and in the mouth, where the fire should be, a vortex of violet-white
// light winding in on itself, the memories of every place on the journey pouring out of its eye. The dome behind
// the facade has burst open to the stars: its crown is gone, the break stepped down through the courses of brick
// under its clay render, a slab of the shell lifting away on the right, and the arch's crown voussoirs and the flue
// have come loose and hang above the gap. The floor breaks off at both sides in steps of tiles, the slab's broken
// edge showing under them; logs from the wood store and the flour sacks still sit on what is left of it. Out in the
// void the kitchen's things float weightless (a peel, a sack of flour trailing its flour, a tin of tomatoes, a
// rolling pin), little islands of the other worlds hang far off (a lighthouse, a snowy peak, a temple), and nebulae
// in the finale's colours (violet, magenta, cyan, the orange that lights everything from the top left) fill the
// dark. The table is the kitchen's marble worktop, dark and polished, the portal mirrored at its back edge.
//
// Memory lane (src/game/finale.ts) lays an earlier stage over this one on every wave and flickers back to it for a
// fraction of a second: so the picture is built to read in that flash (the portal the brightest thing, the dark
// void round it, the oven's silhouette and the table calm), and the live layer is cheap.
//
// Live, the heroes:
// - the portal: a painted loop of the vortex (spiral arms of light winding into the eye, filaments riding the flow
//   at their own speeds), turning; memories (panes of colour from other worlds) pour out of its eye and dissolve as
//   they leave the mouth; it pulses at every stomp;
// - embers from the dead fire spiralling in from all round the kitchen, sped up and drawn out as they fall into
//   the eye, warming to its violet-white;
// - the debris: the floating things drift and turn and jolt at a stomp; bricks calve off the broken crown and tiles
//   off the floor's edges and drift away into space, turning.
// And the stars twinkle. The stage's four waves: the portal brightens and grows unstable (surges, flares round the
// rim), the cracks in the dome start to glow and widen, the shell's loose slab and the flue drift further off, and
// more of the kitchen comes apart (more bricks and tiles calving, more embers drawn in).

import Phaser from 'phaser';
import { type Ctx, type PathFn, type R, H, HY, LIGHT, TY, VX, W, bounce, boxOf, calmLanes, castShadow, crevice, glowAt, gradeAll, groundShadow, lightPool, polyPath, rim, solid, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { bricks, tableFalloff } from '../../art/scene/materials';
import { drift, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { skyFill, stars } from '../../art/scene/sky';
import { nebula, starburst } from '../../art/scene/space';
import { FOC } from '../../art/sceneKit';
import { makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Loop, Spring, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, lerp, registerKitScene, waveK, wander } from '../../game/sceneLive';
import { FIN } from './scenes-act10';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const hash = (i: number, j: number) => {
  const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// ——— layout ———

/** The oven's mouth: the portal (finale.ts places things by it). */
const P = FIN.portal;
/** The mouth's floor: the top of the hearth sill. */
const HEARTH = 716;
/** The voussoirs: two rowlock rings round the mouth, the outer edge of the facade. */
const RING = 96;
const AX = P.rx + RING;
const AY = P.ry + RING;
/** The dome behind the facade (a hemisphere seen from the front). */
const DOME = { x: VX, y: 726, rx: 640, ry: 740 };
const domeHalf = (y: number) => DOME.rx * Math.sqrt(Math.max(0, 1 - ((DOME.y - y) / DOME.ry) ** 2));
/** A point on the arch at angle th (0 right … π left) on an ellipse of radii a, b about the mouth's centre. */
const archPt = (th: number, a: number, b: number): Pt => [P.x + a * Math.cos(th), P.y - b * Math.sin(th)];
/** The crown is gone: the angles the inner and outer rings are broken between. */
const GAP_IN: Pt = [1.12, 2.02];
const GAP_OUT: Pt = [1.05, 2.09];
/** The vortex's disc (inside the mouth). */
const VC = { x: P.x, y: 432 };
const VR = 292;

/** A broken edge from a to b: jagged, stepping square where it runs along the courses of brick. */
function jagLine(a: Pt, b: Pt, n: number, amp: number, seed: number): Pt[] {
  const rr = rng(seed);
  const pts: Pt[] = [a];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  const nx = -dy / L;
  const ny = dx / L;
  for (let i = 1; i < n; i++) {
    const t = i / n + (rr() - 0.5) * (0.5 / n);
    const off = (rr() - 0.5) * 2 * amp;
    const x = a[0] + dx * t + nx * off;
    const y = a[1] + dy * t + ny * off;
    if (rr() < 0.5) pts.push([x, pts[pts.length - 1][1]]);
    pts.push([x, y]);
  }
  pts.push(b);
  return pts;
}

const BREAK_L = jagLine([VX - domeHalf(392), 392], archPt(GAP_OUT[1], AX, AY), 12, 18, 41);
const BREAK_R = jagLine(archPt(GAP_OUT[0], AX, AY), [VX + domeHalf(340), 340], 11, 18, 43);


/** The slab of shell on the right shoulder, cracked all round and coming loose under the break: a sprite, it sits in
 * place on the first wave and lifts away over the stage, leaving the stars showing through the hole. */
const CHUNK_SEG: [number, number] = (() => {
  const i0 = BREAK_R.findIndex(([x]) => x > 1250);
  let i1 = i0;
  while (i1 + 1 < BREAK_R.length && BREAK_R[i1 + 1][0] < 1420) i1++;
  return [i0, i1];
})();
/** The fracture under the slab (the dome's edge once it has gone): stepping along the courses, inside the shell. */
const FRACTURE: Pt[] = (() => {
  const [i0, i1] = CHUNK_SEG;
  const a = BREAK_R[i0];
  const b = BREAK_R[i1];
  const rr = rng(97);
  const pts: Pt[] = [a];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const depth = Math.sin(t * Math.PI) * (78 + (rr() - 0.5) * 24);
    // into the shell: down and towards the dome's middle
    const x = a[0] + (b[0] - a[0]) * t - depth * 0.55;
    const y = a[1] + (b[1] - a[1]) * t + depth * 0.84;
    const prev = pts[pts.length - 1];
    if (rr() < 0.6) pts.push([x, prev[1]]);
    pts.push([x, y]);
  }
  pts.push(b);
  return pts;
})();
const CHUNK_PTS: Pt[] = [...BREAK_R.slice(CHUNK_SEG[0], CHUNK_SEG[1] + 1), ...FRACTURE.slice().reverse()];
/** The right-hand break as the dome has it without the slab. */
const BREAK_R2: Pt[] = [...BREAK_R.slice(0, CHUNK_SEG[0]), ...FRACTURE, ...BREAK_R.slice(CHUNK_SEG[1] + 1)];
const CHUNK_C: Pt = (() => {
  const xs = CHUNK_PTS.map((p) => p[0]);
  const ys = CHUNK_PTS.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
})();

/** The dome's silhouette: its flanks, the broken top, the gap over the mouth. */
const DOME_PTS: Pt[] = (() => {
  const pts: Pt[] = [];
  for (let y = HEARTH; y > 392; y -= 12) pts.push([VX - domeHalf(y), y]);
  pts.push(...BREAK_L);
  pts.push(archPt(GAP_IN[1], P.rx, P.ry));
  for (let th = GAP_IN[1]; th > GAP_IN[0]; th -= 0.06) pts.push(archPt(th, P.rx - 2, P.ry - 2));
  pts.push(archPt(GAP_IN[0], P.rx, P.ry));
  pts.push(...BREAK_R2);
  for (let y = 352; y <= HEARTH; y += 12) pts.push([VX + domeHalf(y), y]);
  pts.push([VX + domeHalf(HEARTH), HEARTH]);
  return pts;
})();

/** The mouth: a round arch on straight jambs, down to the hearth. */
const mouthPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(P.x - P.rx, HEARTH);
  c.lineTo(P.x - P.rx, P.y);
  c.ellipse(P.x, P.y, P.rx, P.ry, 0, Math.PI, P2);
  c.lineTo(P.x + P.rx, HEARTH);
  c.closePath();
};

// the cracks in the dome (shared by the dome, which paints them dark, and the glow that leaks through them): they run
// along the mortar, stepping course by course (a bed joint along, a head joint down), tapering as they go
type Poly = Pt[];
const COURSE = 19;
function crackLines(): Poly[] {
  const rr = rng(313);
  const out: Poly[] = [];
  const snap = (y: number) => HEARTH - Math.round((HEARTH - y) / COURSE) * COURSE;
  const walk = (x: number, y: number, dir: number, steps: number) => {
    y = snap(y);
    const pts: Poly = [[x, y]];
    for (let s = 0; s < steps; s++) {
      // along a bed joint, then down a head joint to the next course
      x += dir * (12 + rr() * 34);
      pts.push([x, y]);
      y += COURSE;
      if (y > HEARTH - 30 || Math.abs(x - VX) > domeHalf(y) - 8) break;
      pts.push([x + (rr() - 0.5) * 2, y]);
    }
    out.push(pts);
  };
  for (const i of [3, 8, 13, 18]) {
    const [x, y] = BREAK_L[Math.min(i, BREAK_L.length - 1)];
    walk(x + 6, y + 10, rr() < 0.7 ? -1 : 1, 5 + Math.floor(rr() * 5));
  }
  for (const i of [2, 7, 12]) {
    const [x, y] = BREAK_R2[Math.min(i, BREAK_R2.length - 1)];
    walk(x - 6, y + 10, rr() < 0.7 ? 1 : -1, 5 + Math.floor(rr() * 5));
  }
  walk(P.x - AX - 8, P.y + 30, -1, 6);
  walk(P.x + AX + 8, P.y - 20, 1, 6);
  walk(P.x - AX - 8, 600, -1, 4);
  return out;
}
const CRACKS = crackLines();

// ——— the floor: a raft of chequered tiles, broken off at the sides ———

/** The floor's camera height (the table's focal length; the floor lies below and behind the table). */
const HF = 1.45;
const fx = (X: number, z: number) => VX + (FOC * X) / z;
const fy = (z: number) => HY + (FOC * HF) / z;
const TS = 0.25;
const Z0 = 3.6;
const XL = (z: number) => -2.9 - 0.42 * (z - 3.8) + 0.1 * Math.sin(z * 4.1);
const XR = (z: number) => 2.95 + 0.42 * (z - 3.8) + 0.1 * Math.sin(z * 3.3 + 1);
const ZF = 7.4;
/** One broken side of the raft (plane X, z, front to back): ragged, bitten into here and there where a plate of tiles
 * has already calved away. */
function edgeLine(side: number, seed: number): Pt[] {
  const rr = rng(seed);
  const pts: Pt[] = [];
  let bite = 0;
  let deep = 0;
  for (let z = 3.7; z <= ZF; z += 0.06) {
    if (bite <= 0 && rr() < 0.08) {
      bite = 3 + Math.floor(rr() * 5);
      deep = 0.22 + rr() * 0.3;
    }
    const base = side < 0 ? XL(z) : XR(z);
    const cut = bite > 0 ? deep * Math.sin((bite / 8) * Math.PI + 0.4) : rr() * 0.07;
    bite--;
    pts.push([base - side * cut, z]);
  }
  return pts;
}
const EDGE_L = edgeLine(-1, 211);
const EDGE_R = edgeLine(1, 223);
const toScreen = ([X, z]: Pt): Pt => [fx(X, z), fy(z)];
/** The raft on screen: its left edge front to back, the far edge, its right edge back to front. */
const ISLAND: Pt[] = [...EDGE_L.map(toScreen), ...EDGE_R.slice().reverse().map(toScreen)];
/** Where plates break off the raft's sides (screen points, for the live layer's calving). */
const EDGE_TILES: { x: number; y: number; s: number; side: number }[] = (() => {
  const out: { x: number; y: number; s: number; side: number }[] = [];
  for (const [edge, side] of [[EDGE_L, -1], [EDGE_R, 1]] as const) {
    for (let i = 0; i < edge.length; i += 3) {
      const [x, y] = toScreen(edge[i]);
      if (y > TY - 6 || (x > 300 && x < 1620)) continue;
      out.push({ x, y, s: (FOC * TS) / edge[i][1] / 40, side });
    }
  }
  return out;
})();

// ——— palette ———

const PAL = ['#9a4a30', '#a85a38', '#8a3e2a', '#b0653e', '#7e3c2a'];
const MORTAR = '#3a2a2c';
const RENDER = '#7a4c38';
const INK = '#1a0c14';
const VIOLET = '#b06bff';
const MAGENTA = '#ff4fd8';
const CYAN = '#36e0ff';
const ORANGE = '#ff9a3a';

// ——— the void ———

const HUD_L: Box = { x: 0, y: 0, w: 420, h: 180 };

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: TY };
  skyFill(ctx, box, [[0, '#030109'], [0.4, '#090418'], [0.78, '#110722'], [1, '#0a0514']], 0.04);
  softNebula(ctx, r, { x: -260, y: 60, w: 1100, h: 720 }, [VIOLET, MAGENTA], 0.5, 11);
  softNebula(ctx, r, { x: 1080, y: -60, w: 1100, h: 720 }, [CYAN, VIOLET], 0.44, 23);
  softNebula(ctx, r, { x: -200, y: 380, w: 860, h: 520 }, [ORANGE, MAGENTA], 0.36, 31);
  softNebula(ctx, r, { x: 1260, y: 360, w: 860, h: 520 }, [MAGENTA, ORANGE], 0.28, 37);
  // the warm key: a far orange glow high to the left, beyond the oven
  glowAt(ctx, 520, 250, 520, ORANGE, 0.1, 0.75);
  glowAt(ctx, 600, 210, 220, '#ffc890', 0.06);
  stars(ctx, r, box, 1300, '#f4ecff');
  stars(ctx, r, box, 260, '#cfe8ff');
  for (const [x, y, s, c] of [[612, 318, 2.2, '#ffe8d0'], [1702, 372, 2.6, '#d8f4ff'], [214, 612, 1.8, '#ffd8f0'], [1452, 46, 1.6, '#eaf2ff'], [86, 240, 1.4, '#eaf2ff'], [1868, 560, 1.8, '#ffe0c8']] as const) starburst(ctx, x, y, s, c, 0.8);
  // calm under the HUD corners
  for (const [x, y, rad, a] of [[120, 40, 460, 0.6], [1850, 30, 300, 0.5]] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba('#020008', a));
    g.addColorStop(1, rgba('#020008', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // the void falls darker round the dome, so its silhouette holds against the nebulae
  softly(ctx, { x: 0, y: 0, w: W, h: TY }, (c) => {
    c.save();
    c.translate(DOME.x, DOME.y - 60);
    c.scale(1, 1.12);
    const g = c.createRadialGradient(0, 0, DOME.rx * 0.9, 0, 0, DOME.rx * 1.45);
    g.addColorStop(0, rgba('#030108', 0.7));
    g.addColorStop(1, rgba('#030108', 0));
    c.fillStyle = g;
    c.fillRect(-W, -H, W * 2, H * 2);
    c.restore();
  });
  // the portal's light spilling up through the broken crown into the void
  glowAt(ctx, VX, 150, 420, VIOLET, 0.16, 0.7);
  glowAt(ctx, VX, 120, 180, '#e8c8ff', 0.14, 0.8);
}

/** A nebula that fades out at the edges of its box (an ellipse of it): painted small, drawn up. */
function softNebula(ctx: Ctx, r: R, box: Box, cols: string[], a: number, seed: number): void {
  const k = 0.5;
  const [c, g] = makeCanvas(Math.ceil(box.w * k), Math.ceil(box.h * k));
  g.scale(k, k);
  g.translate(-box.x, -box.y);
  nebula(g, r, box, cols, a, seed);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.translate(c.width / 2, c.height / 2);
  g.scale(1, c.height / c.width);
  const m = g.createRadialGradient(0, 0, 0, 0, 0, c.width / 2);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(0.55, 'rgba(0,0,0,0.75)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(-c.width, -c.width, c.width * 2, c.width * 2);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, box.x, box.y, box.w, box.h);
  ctx.restore();
}

/** Little islands of the other worlds, far off in the void. */
function worlds(ctx: Ctx, r: R): void {
  const air = '#2a1848';
  const isle = (x: number, y: number, s: number, top: (c: Ctx) => void) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // the rock it stands on: a lump torn out of its world, its broken underside trailing off to a point
    const pts: Pt[] = [[-56, 0], [-48, 10], [-30, 26], [-22, 44], [-6, 62], [4, 52], [14, 70], [26, 40], [40, 22], [54, 8], [58, 0]];
    const rock = polyPath(pts);
    ctx.fillStyle = mix('#4a3a4a', air, 0.45);
    rock(ctx);
    ctx.fill();
    ctx.save();
    rock(ctx);
    ctx.clip();
    const g = ctx.createLinearGradient(-50, 0, 50, 60);
    g.addColorStop(0, rgba('#ffb880', 0.25));
    g.addColorStop(1, rgba('#08040c', 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(-60, 0, 120, 72);
    ctx.restore();
    // its ground, lit from the top left
    ctx.fillStyle = mix('#7a6a5a', air, 0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, 58, 7, 0, 0, P2);
    ctx.fill();
    top(ctx);
    ctx.restore();
    glowAt(ctx, x, y - 10 * s, 90 * s, VIOLET, 0.05);
    void r;
  };
  // a lighthouse on a rock (the pier)
  isle(1820, 440, 0.62, (c) => {
    c.fillStyle = mix('#e8e0d8', air, 0.35);
    c.beginPath();
    c.moveTo(-10, -2);
    c.lineTo(-6, -70);
    c.lineTo(6, -70);
    c.lineTo(10, -2);
    c.closePath();
    c.fill();
    c.fillStyle = mix('#c8403a', air, 0.4);
    for (const y of [-22, -48]) c.fillRect(-9 + (y + 2) * -0.05, y, 18 + (y + 2) * 0.1, 10);
    c.fillStyle = mix('#3a3040', air, 0.3);
    c.fillRect(-8, -82, 16, 12);
    c.fillStyle = '#fff2c8';
    c.fillRect(-5, -80, 10, 8);
    glowAt(c, 0, -76, 40, '#ffe8a8', 0.35);
    c.fillStyle = mix('#5a5a4a', air, 0.4);
    c.beginPath();
    c.moveTo(-58, 0);
    c.lineTo(-30, -14);
    c.lineTo(-12, -2);
    c.closePath();
    c.fill();
  });
  // a snowy peak (the slopes)
  isle(118, 300, 0.7, (c) => {
    c.fillStyle = mix('#5a6a8a', air, 0.35);
    c.beginPath();
    c.moveTo(-54, 0);
    c.lineTo(-8, -86);
    c.lineTo(10, -64);
    c.lineTo(22, -76);
    c.lineTo(56, 0);
    c.closePath();
    c.fill();
    c.fillStyle = mix('#f4f8ff', air, 0.25);
    c.beginPath();
    c.moveTo(-26, -42);
    c.lineTo(-8, -86);
    c.lineTo(10, -64);
    c.lineTo(22, -76);
    c.lineTo(36, -44);
    c.lineTo(22, -52);
    c.lineTo(10, -40);
    c.lineTo(-4, -54);
    c.closePath();
    c.fill();
    // the shaded side
    c.fillStyle = rgba('#141028', 0.35);
    c.beginPath();
    c.moveTo(-8, -86);
    c.lineTo(22, -2);
    c.lineTo(56, 0);
    c.lineTo(22, -76);
    c.lineTo(10, -64);
    c.closePath();
    c.fill();
  });
  // a temple front (the Greek acts)
  isle(640, 66, 0.55, (c) => {
    c.fillStyle = mix('#e8dcc8', air, 0.4);
    c.beginPath();
    c.moveTo(-44, -54);
    c.lineTo(0, -74);
    c.lineTo(44, -54);
    c.closePath();
    c.fill();
    c.fillRect(-44, -54, 88, 6);
    for (const x of [-38, -18, 2, 22]) c.fillRect(x, -48, 9, 46);
    c.fillRect(-48, -4, 96, 5);
    c.fillStyle = rgba('#141028', 0.3);
    for (const x of [-38, -18, 2, 22]) c.fillRect(x + 5, -48, 4, 46);
  });
}

// ——— the floor ———

function floor(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 520, W, TY - 520 + 2);
  ctx.clip();
  // the slab's broken section under each ragged edge, where the break turns towards us
  for (const [edge, side] of [[EDGE_L, -1], [EDGE_R, 1]] as const) {
    for (let i = 0; i + 1 < edge.length; i++) {
      const a = edge[i];
      const b = edge[i + 1];
      // the face's outward normal, and whether it faces the eye
      const dX = b[0] - a[0];
      const dz = b[1] - a[1];
      const nX = side < 0 ? -dz : dz;
      const nz = side < 0 ? dX : -dX;
      if (nX * -a[0] + nz * -a[1] <= 0) continue;
      const [ax, ay] = toScreen(a);
      const [bx, by] = toScreen(b);
      const da = ((FOC * 0.13) / a[1]) * (0.8 + hash(i, side) * 0.5);
      const db = ((FOC * 0.13) / b[1]) * (0.8 + hash(i + 1, side) * 0.5);
      const face: Pt[] = [[ax, ay], [bx, by], [bx, by + db], [ax, ay + da]];
      const fp = polyPath(face);
      within(ctx, fp, () => {
        const top = Math.min(ay, by);
        const h = Math.max(da, db) + Math.abs(ay - by);
        vfill(ctx, Math.min(ax, bx) - 2, top, Math.abs(bx - ax) + 4, h, [[0, '#a89880'], [0.12, '#a89880'], [0.15, '#6a5a50'], [0.32, '#5a4a44'], [0.36, '#3a2a2a'], [1, '#100810']]);
        ctx.fillStyle = rgba(LIGHT.key, 0.12 * (side < 0 ? 1 : 0.4));
        ctx.fillRect(Math.min(ax, bx), top, Math.abs(bx - ax) + 1, h);
      });
      ctx.strokeStyle = rgba('#0a0408', 0.7);
      ctx.lineWidth = 1;
      fp(ctx);
      ctx.stroke();
    }
  }
  // the tiles, cut to the raft's ragged outline
  const island = polyPath(ISLAND);
  ctx.save();
  island(ctx);
  ctx.clip();
  ctx.fillStyle = '#120a14';
  ctx.fillRect(0, 520, W, TY - 520 + 2);
  const rows = Math.ceil((ZF - Z0) / TS);
  for (let j = rows; j >= 0; j--) {
    const za = Z0 + j * TS;
    const zb = za + TS;
    for (let i = -26; i < 26; i++) {
      const X0 = i * TS;
      const X1 = X0 + TS;
      if (X1 < XL(zb) - 0.4 || X0 > XR(zb) + 0.4) continue;
      const g = 0.011;
      const q: Pt[] = [[fx(X0 + g, zb - g), fy(zb - g)], [fx(X1 - g, zb - g), fy(zb - g)], [fx(X1 - g, za + g), fy(za + g)], [fx(X0 + g, za + g), fy(za + g)]];
      const dark = (i + j) % 2 !== 0;
      const sx = (q[0][0] + q[2][0]) / 2;
      const sy = (q[0][1] + q[2][1]) / 2;
      let col = dark ? mix('#201828', '#2c2034', hash(i, j + 2)) : mix('#a89a84', '#b8ac96', hash(i, j + 2));
      // the key from the top left warms the left; the portal's spill lifts the middle; the right falls to cool
      col = mix(col, dark ? '#4a3040' : '#f0c898', clamp01(1 - sx / 1300) * 0.25);
      const dp = Math.hypot((sx - VX) / 700, (sy - HEARTH) / 120);
      col = mix(col, dark ? '#5a3a8a' : '#e8d0ff', clamp01(1 - dp) * 0.55);
      col = mix(col, '#0a0614', clamp01((sx - 1100) / 900) * 0.35 + clamp01((zb - 5) / 3) * 0.4);
      ctx.fillStyle = col;
      polyPath(q)(ctx);
      ctx.fill();
      ctx.strokeStyle = rgba(LIGHT.key, dark ? 0.06 : 0.14);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(q[3][0], q[3][1] - 0.5);
      ctx.lineTo(q[2][0], q[2][1] - 0.5);
      ctx.stroke();
    }
  }
  // cracks running in from the broken edges, a plate half loose (its crack lit along its lip)
  for (const [edge, side] of [[EDGE_L, -1], [EDGE_R, 1]] as const) {
    for (let k = 0; k < 7; k++) {
      const [X, z] = edge[Math.floor(r() * edge.length)];
      const pts: Pt[] = [toScreen([X, z])];
      let px = X;
      let pz = z;
      for (let s = 0; s < 5; s++) {
        px -= side * (0.05 + r() * 0.12);
        pz += (r() - 0.5) * 0.18;
        pts.push(toScreen([px, pz]));
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba('#e8d8c0', 0.25);
      ctx.lineWidth = 1;
      strokePts(ctx, pts, 0.6, 1);
      ctx.strokeStyle = rgba('#08040a', 0.8);
      ctx.lineWidth = 1.6;
      strokePts(ctx, pts);
    }
  }
  // the portal's light laid across the floor in front of the mouth, its glow in the polish, the key on the left
  lightPool(ctx, VX, HEARTH + 26, 600, 56, '#c8a0ff', 0.34);
  lightPool(ctx, VX, HEARTH + 20, 280, 28, '#ffffff', 0.2);
  lightPool(ctx, 200, 700, 300, 60, '#ffb070', 0.06);
  ctx.restore();
  // the raft's broken lip, against the void
  ctx.strokeStyle = rgba('#0a0408', 0.85);
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  strokePts(ctx, EDGE_L.map(toScreen));
  strokePts(ctx, EDGE_R.map(toScreen));
  ctx.restore();
}

// ——— the dome ———

/** The dome's brick, laid in rings: one course after another up the hemisphere, each brick foreshortened as the
 * dome turns away towards its edge and lit by its own facing (the key from the top left, the cool falling off to the
 * lower right). Paints over whatever clip is set. */
function domeCourses(ctx: Ctx, seed: number, y0 = 30, y1 = HEARTH): void {
  const rr = rng(seed);
  const bh = COURSE;
  ctx.fillStyle = MORTAR;
  ctx.fillRect(VX - DOME.rx, y0, DOME.rx * 2, y1 - y0);
  const L = [-0.55, 0.62, 0.56];
  for (let y = HEARTH, row = 0; y > y0; y -= bh, row++) {
    const yc = y - bh / 2;
    const hw = domeHalf(yc);
    const sinLat = clamp01((DOME.y - yc) / DOME.ry);
    const cosLat = Math.sqrt(1 - sinLat * sinLat);
    const n = Math.max(5, Math.round((Math.PI * DOME.rx * cosLat) / 46));
    const off = (row % 2) * 0.5;
    for (let i = -1; i <= n; i++) {
      const p0 = Math.max(-Math.PI / 2, -Math.PI / 2 + ((i + off) * Math.PI) / n);
      const p1 = Math.min(Math.PI / 2, -Math.PI / 2 + ((i + off + 1) * Math.PI) / n);
      const roll = rr();
      const pick = rr();
      const chip = rr();
      const cx = rr();
      const cy = rr();
      if (p1 <= p0 || hw < 8 || y - bh > y1) continue;
      const x0 = VX + hw * Math.sin(p0);
      const x1 = VX + hw * Math.sin(p1);
      const g = Math.min(1.6, (x1 - x0) * 0.12);
      if (x1 - x0 < 1.2) continue;
      const pm = (p0 + p1) / 2;
      const nx = Math.sin(pm) * cosLat;
      const nz = Math.cos(pm) * cosLat;
      const lam = clamp01(nx * L[0] + sinLat * L[1] + nz * L[2]);
      let c = PAL[Math.floor(pick * PAL.length)];
      if (roll < 0.08) c = mix(c, '#3a1a14', 0.45);
      else if (roll > 0.93) c = mix(c, '#e8a878', 0.25);
      ctx.fillStyle = mix(mix(shade(c, -0.58), '#1a1030', 0.22), shade(c, 0.12), 0.24 + lam * 0.76);
      ctx.fillRect(x0 + g / 2, y - bh + 1.6, x1 - x0 - g, bh - 2.6);
      // the lit top arris; a chip here and there
      ctx.fillStyle = rgba(LIGHT.key, 0.06 + lam * 0.16);
      ctx.fillRect(x0 + g / 2, y - bh + 1.6, x1 - x0 - g, 1.4);
      if (chip < 0.25) {
        ctx.fillStyle = rgba('#1a0808', 0.35);
        ctx.fillRect(x0 + (x1 - x0) * cx, y - bh + 4 + cy * (bh - 8), 2 + chip * 10, 2);
      }
    }
  }
}

/** Light over the shell (shared by the dome and the slab that comes off it): broken colour, the hemisphere turning
 * away to the cool dark at its lower right, soot climbing from behind the facade. */
function domeShade(ctx: Ctx, box: Box): void {
  lay(ctx, drift('#ffd0a0', '#140818', 5, 77, 160, 90), { x: VX - DOME.rx, y: 0, w: DOME.rx * 2, h: HEARTH }, 0.16);
  const eg = ctx.createRadialGradient(DOME.x - 200, DOME.y - 300, DOME.rx * 0.3, DOME.x, DOME.y, DOME.rx * 1.04);
  eg.addColorStop(0, rgba('#ffd8b0', 0.08));
  eg.addColorStop(0.5, rgba('#08040e', 0));
  eg.addColorStop(1, rgba('#08040e', 0.6));
  ctx.fillStyle = eg;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  softly(ctx, box, (c) => {
    for (const [x, y, rad, a] of [[VX - 330, 230, 240, 0.5], [VX + 330, 220, 230, 0.5], [VX - 240, 400, 180, 0.3], [VX + 260, 380, 180, 0.3]] as const) {
      const sg = c.createRadialGradient(x, y, 0, x, y, rad);
      sg.addColorStop(0, rgba('#0a0608', a));
      sg.addColorStop(1, rgba('#0a0608', 0));
      c.fillStyle = sg;
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });
}

/** A broken edge of the shell: its section (the bricks' ends, lit on top by the key), the inside of the dome glowing
 * violet under it. */
function breakEdge(ctx: Ctx, edge: Pt[]): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a1414';
  ctx.lineWidth = 9;
  strokePts(ctx, edge, 0, 2);
  ctx.strokeStyle = '#8a4a34';
  ctx.lineWidth = 5;
  strokePts(ctx, edge, 0, 1);
  ctx.strokeStyle = rgba('#f0b088', 0.75);
  ctx.lineWidth = 1.8;
  strokePts(ctx, edge, -0.5, -1.5);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba('#c890ff', 0.22);
  ctx.lineWidth = 5;
  strokePts(ctx, edge, 0, 6);
  ctx.restore();
}

/** Rubble at the dome's foot: bricks and lumps of render that have dropped off it, heaped, the dust of mortar. */
function rubble(ctx: Ctx, r: R, x0: number, x1: number, base: number): void {
  groundShadow(ctx, (x0 + x1) / 2 + 12, base, (x1 - x0) / 2 + 20, 10, 0.55, '#06030a');
  ctx.save();
  ctx.translate((x0 + x1) / 2, base + 2);
  ctx.scale(1, 0.25);
  const dg = ctx.createRadialGradient(0, 0, 0, 0, 0, (x1 - x0) / 2 + 10);
  dg.addColorStop(0, rgba('#8a7a6a', 0.6));
  dg.addColorStop(1, rgba('#8a7a6a', 0));
  ctx.fillStyle = dg;
  ctx.fillRect(-(x1 - x0), -(x1 - x0), (x1 - x0) * 2, (x1 - x0) * 2);
  ctx.restore();
  const n = Math.round((x1 - x0) / 7);
  const bits: [number, number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = r();
    const x = x0 + t * (x1 - x0);
    // heaped highest against the wall's middle
    const h = Math.sin(t * Math.PI) * 26 * r();
    bits.push([x, base - 4 - h, 0.4 + r() * 0.45, Math.floor(r() * 12)]);
  }
  bits.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s, i] of bits) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((hash(i, x) - 0.5) * 1.2);
    if (i % 4 === 3) {
      // a lump of render
      ctx.fillStyle = mix(RENDER, '#1a0c14', 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 14 * s, 7 * s, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(LIGHT.key, 0.2);
      ctx.fillRect(-10 * s, -6 * s, 14 * s, 2);
    } else brickBit(ctx, 0, 0, 34 * s, 20 * s, i);
    ctx.restore();
  }
}

function dome(ctx: Ctx, r: R): void {
  const path = polyPath(DOME_PTS);
  const box = boxOf(DOME_PTS, 6);
  // it stands on the floor: occlusion along its foot, its shadow thrown down and to the right
  groundShadow(ctx, VX + 40, HEARTH + 4, 700, 22, 0.6, '#06030a');
  castShadow(ctx, path, 16, 22, 0.35, '#05020a');
  within(ctx, path, () => {
    domeCourses(ctx, 5);
    domeShade(ctx, box);
    // grime and soot at its foot, where ash and flour and spilt fat have gathered for ever
    const fg = ctx.createLinearGradient(0, HEARTH - 120, 0, HEARTH);
    fg.addColorStop(0, rgba('#0a0608', 0));
    fg.addColorStop(1, rgba('#0a0608', 0.55));
    ctx.fillStyle = fg;
    ctx.fillRect(box.x, HEARTH - 120, box.w, 120);
    lay(ctx, noiseMask(9, 61, { cover: 0.35, soft: 0.2, col: '#0a0608', w: 192, h: 40 }), { x: box.x, y: HEARTH - 110, w: box.w, h: 110 }, 0.5);
    // hairline cracks where the shell is giving way, along the mortar
    for (const pl of CRACKS) strokeCrack(ctx, pl, 2.4, '#0a0204', 0.85);
    // the portal's violet on the flanks nearest the mouth; the cool of the void on the far rims
    bounce(ctx, path, VX, P.y, [VX - 400, P.y], '#b890ff', 0.2, 26);
    rim(ctx, path, 0.5, 5, CYAN);
  });
  for (const edge of [BREAK_L, BREAK_R2]) breakEdge(ctx, edge);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  path(ctx);
  ctx.stroke();
  rubble(ctx, r, VX - domeHalf(HEARTH) - 20, VX - P.rx - RING - 6, HEARTH + 6);
  rubble(ctx, r, VX + P.rx + RING + 6, VX + domeHalf(HEARTH) - 40, HEARTH + 6);
}

function strokePts(ctx: Ctx, pts: Pt[], dx = 0, dy = 0): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
  ctx.stroke();
}

function strokeCrack(ctx: Ctx, pl: Pt[], w: number, col: string, a: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const n = pl.length - 1;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const [ax, ay] = pl[i];
    const [bx, by] = pl[i + 1];
    ctx.strokeStyle = rgba('#e0a880', a * 0.4 * (1 - t * 0.6));
    ctx.lineWidth = Math.max(0.6, w * (1 - t * 0.75) * 0.7);
    ctx.beginPath();
    ctx.moveTo(ax + 1, ay + 1.2);
    ctx.lineTo(bx + 1, by + 1.2);
    ctx.stroke();
    ctx.strokeStyle = rgba(col, a * (1 - t * 0.5));
    ctx.lineWidth = Math.max(0.6, w * (1 - t * 0.75));
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.restore();
}

// ——— the facade: the arch of voussoirs on its piers, the hearth sill ———

function voussoir(th0: number, th1: number, a0: number, b0: number, a1: number, b1: number): Pt[] {
  const pts: Pt[] = [];
  const n = 3;
  for (let i = 0; i <= n; i++) pts.push(archPt(th0 + ((th1 - th0) * i) / n, a0, b0));
  for (let i = n; i >= 0; i--) pts.push(archPt(th0 + ((th1 - th0) * i) / n, a1, b1));
  return pts;
}

/** One brick's face: cushioned, lit across from the top left, its arrises catching the key. */
function brickFace(ctx: Ctx, path: PathFn, box: Box, c: string): void {
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w * 0.6, box.y + box.h * 1.2);
  g.addColorStop(0, shade(c, 0.14));
  g.addColorStop(0.55, c);
  g.addColorStop(1, mix(shade(c, -0.25), '#2a0e18', 0.2));
  ctx.fillStyle = g;
  path(ctx);
  ctx.fill();
}

function facade(ctx: Ctx, r: R): void {
  const outer = (c: Ctx) => {
    c.beginPath();
    c.moveTo(P.x - AX, HEARTH);
    c.lineTo(P.x - AX, P.y);
    c.ellipse(P.x, P.y, AX, AY, 0, Math.PI, P2);
    c.lineTo(P.x + AX, HEARTH);
    c.closePath();
  };
  // the facade stands proud of the dome: its shadow on the shell
  castShadow(ctx, outer, 14, 18, 0.45, '#05020a');
  // the piers: brick courses, the inner arrises lit by the portal
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? P.x - AX : P.x + P.rx;
    const pb = { x: x0, y: P.y - 2, w: RING, h: HEARTH - P.y + 2 };
    within(ctx, (c) => c.rect(pb.x, pb.y, pb.w, pb.h), () => {
      bricks(ctx, r, pb, PAL, MORTAR, 48, 20);
      // the pier's face: lit from the top left, the inner edge washed with the portal's light
      const lg = ctx.createLinearGradient(pb.x, 0, pb.x + pb.w, 0);
      const inner = side < 0 ? 1 : 0;
      lg.addColorStop(inner, rgba('#2a0e30', 0));
      lg.addColorStop(1 - inner, rgba('#0a040c', 0.4));
      ctx.fillStyle = lg;
      ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ig = ctx.createLinearGradient(side < 0 ? pb.x + pb.w : pb.x, 0, side < 0 ? pb.x + pb.w - 100 : pb.x + 100, 0);
      ig.addColorStop(0, rgba('#d8b0ff', 0.6));
      ig.addColorStop(1, rgba('#d8b0ff', 0));
      ctx.fillStyle = ig;
      ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
      ctx.restore();
      // soot licking out of the mouth up the inner arris
      const sg = ctx.createLinearGradient(0, P.y, 0, HEARTH);
      sg.addColorStop(0, rgba('#0a0408', 0.35));
      sg.addColorStop(1, rgba('#0a0408', 0));
      ctx.fillStyle = sg;
      ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
    });
  }
  // the voussoirs: two rings, mortar behind them, the crown broken away
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(P.x, P.y, AX, AY, 0, Math.PI, P2);
  ctx.ellipse(P.x, P.y, P.rx, P.ry, 0, P2, Math.PI, true);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = MORTAR;
  for (const [a0, a1] of [[Math.PI, P2 - GAP_IN[1] - 0.01], [P2 - GAP_IN[0] + 0.01, P2]] as const) {
    ctx.beginPath();
    ctx.moveTo(P.x, P.y);
    ctx.ellipse(P.x, P.y, AX + 2, AY + 2, 0, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // (the gap in the mortar: the crown is gone, mortar and all)
  for (const [k, n] of [[0, 34], [1, 38]] as const) {
    const a0 = P.rx + k * 48;
    const b0 = P.ry + k * 48;
    const gap = k ? GAP_OUT : GAP_IN;
    for (let i = 0; i < n; i++) {
      const t0 = Math.PI - (Math.PI * i) / n;
      const t1 = Math.PI - (Math.PI * (i + 1)) / n;
      const mid = (t0 + t1) / 2;
      if (mid > gap[0] && mid < gap[1]) continue;
      // the last voussoirs at each end of the gap have started to pull out of the ring
      const endL = mid > gap[1] && mid < gap[1] + Math.PI / n;
      const endR = mid < gap[0] && mid > gap[0] - Math.PI / n;
      const pull = endL || endR ? 6 + r() * 8 : 0;
      const g = 0.006;
      let pts = voussoir(t0 - g, t1 + g, a0 + 2, b0 + 2, a0 + 46, b0 + 46);
      if (pull) {
        const ox = Math.cos(mid) * pull;
        const oy = -Math.sin(mid) * pull;
        const rot = (endL ? 1 : -1) * 0.05;
        const [cx, cy] = archPt(mid, a0 + 24, b0 + 24);
        pts = pts.map(([x, y]): Pt => {
          const dx = x - cx;
          const dy = y - cy;
          return [cx + ox + dx * Math.cos(rot) - dy * Math.sin(rot), cy + oy + dx * Math.sin(rot) + dy * Math.cos(rot)];
        });
      }
      const vp = polyPath(pts);
      const bx = boxOf(pts, 0);
      // heat: the inner ring fired dark and sooty at the haunches, the outer paler
      let c = PAL[Math.floor(r() * PAL.length)];
      c = mix(c, '#2a1414', (k ? 0.08 : 0.28) * (0.6 + 0.4 * Math.sin(mid)) + r() * 0.1);
      if (pull) castShadow(ctx, vp, 4, 4, 0.5, '#05020a');
      brickFace(ctx, vp, bx, c);
      // the arris facing the light
      ctx.strokeStyle = rgba(LIGHT.key, 0.16);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[3][0], pts[3][1]);
      ctx.stroke();
      // spalls
      if (r() < 0.35) {
        const [sx, sy] = archPt(mid + (r() - 0.5) * 0.02, a0 + 10 + r() * 26, b0 + 10 + r() * 26);
        ctx.fillStyle = rgba(shade(c, -0.4), 0.5);
        ctx.beginPath();
        ctx.ellipse(sx, sy, 3 + r() * 3, 2 + r() * 2, r() * 3, 0, P2);
        ctx.fill();
      }
      ctx.strokeStyle = rgba('#140608', 0.8);
      ctx.lineWidth = 1.2;
      vp(ctx);
      ctx.stroke();
    }
  }
  // light and soot over the arch: the key warms its upper left, the right falls into shade; soot climbs the crown
  within(ctx, (c) => {
    c.beginPath();
    c.ellipse(P.x, P.y, AX + 2, AY + 2, 0, Math.PI, P2);
    c.ellipse(P.x, P.y, P.rx, P.ry, 0, P2, Math.PI, true);
    c.closePath();
  }, () => {
    const g = ctx.createLinearGradient(P.x - AX, P.y - AY, P.x + AX, P.y);
    g.addColorStop(0, rgba('#ffd0a0', 0.14));
    g.addColorStop(0.5, rgba('#000000', 0));
    g.addColorStop(1, rgba('#08040c', 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(P.x - AX, P.y - AY, AX * 2, AY + 10);
    softly(ctx, { x: P.x - AX, y: P.y - AY - 10, w: AX * 2, h: AY + 20 }, (c) => {
      for (const [x, y, rad, a] of [[P.x - 190, 130, 150, 0.55], [P.x + 190, 130, 150, 0.55], [P.x - 300, 260, 110, 0.3], [P.x + 300, 250, 110, 0.3]] as const) {
        const sg = c.createRadialGradient(x, y, 0, x, y, rad);
        sg.addColorStop(0, rgba('#08040a', a));
        sg.addColorStop(1, rgba('#08040a', 0));
        c.fillStyle = sg;
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    });
    // the portal's light on the intrados: the inner ring lit violet-white, fading out through the second
    softly(ctx, { x: P.x - AX, y: P.y - AY - 10, w: AX * 2, h: AY + 20 }, (c) => {
      c.globalCompositeOperation = 'source-over';
      for (const [w, a] of [[60, 0.14], [26, 0.26], [10, 0.3]] as const) {
        c.strokeStyle = rgba('#d8b8ff', a);
        c.lineWidth = w;
        for (const [a0, a1] of [[Math.PI, P2 - GAP_IN[1]], [P2 - GAP_IN[0], P2]] as const) {
          c.beginPath();
          c.ellipse(P.x, P.y, P.rx + 2, P.ry + 2, 0, a0, a1);
          c.stroke();
        }
      }
    }, 0.25, 'lighter');
  });
  // the piers' and the arch's outline (the crown's broken ends square)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(P.x - AX, HEARTH);
  ctx.lineTo(P.x - AX, P.y);
  ctx.ellipse(P.x, P.y, AX, AY, 0, Math.PI, P2 - GAP_OUT[1] + Math.PI * 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(P.x, P.y, AX, AY, 0, P2 - GAP_OUT[0], P2);
  ctx.lineTo(P.x + AX, HEARTH);
  ctx.stroke();
}

function mouth(ctx: Ctx): void {
  // the oven's dark throat behind the light: deep violet, the vortex lays its light over it
  within(ctx, mouthPath, () => {
    const g = ctx.createRadialGradient(VC.x, VC.y, 20, VC.x, VC.y, 470);
    g.addColorStop(0, '#6a38b8');
    g.addColorStop(0.45, '#38187a');
    g.addColorStop(0.8, '#221050');
    g.addColorStop(1, '#180a38');
    ctx.fillStyle = g;
    ctx.fillRect(P.x - P.rx, P.y - P.ry, P.rx * 2, HEARTH - P.y + P.ry);
    // the inner edge of the brick throat, in its own shade
    ctx.strokeStyle = rgba('#0a0418', 0.45);
    ctx.lineWidth = 12;
    mouthPath(ctx);
    ctx.stroke();
  });
}

/** The hearth sill: a slab of stone along the mouth's foot, its top washed with the portal's light. */
function sill(ctx: Ctx, r: R): void {
  const x0 = P.x - P.rx - 52;
  const x1 = P.x + P.rx + 52;
  const top: Pt[] = [[x0 + 8, HEARTH - 8], [x1 - 8, HEARTH - 8], [x1, HEARTH + 2], [x0, HEARTH + 2]];
  const front: PathFn = (c) => {
    c.beginPath();
    c.rect(x0, HEARTH + 2, x1 - x0, 26);
  };
  groundShadow(ctx, VX + 30, HEARTH + 30, (x1 - x0) / 2 + 20, 10, 0.6, '#06030a');
  solid(ctx, front, { x: x0, y: HEARTH + 2, w: x1 - x0, h: 26 }, 'stone', '#8a7a78', { depth: 0.1, line: 2.4, formSize: 10 });
  within(ctx, front, () => {
    vfill(ctx, x0, HEARTH + 2, x1 - x0, 26, [[0, rgba('#000000', 0)], [1, rgba('#0a0410', 0.45)]]);
    // chips and burns along its arris (peels and logs dragged over it for ever)
    for (let i = 0; i < 18; i++) {
      const x = x0 + r() * (x1 - x0);
      ctx.fillStyle = rgba('#1a0c10', 0.4);
      ctx.beginPath();
      ctx.ellipse(x, HEARTH + 4, 3 + r() * 5, 2 + r() * 2, 0, 0, P2);
      ctx.fill();
    }
    // the portal's light catching its front arris, strongest under the mouth
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createLinearGradient(x0, 0, x1, 0);
    sg.addColorStop(0, rgba('#c8a0ff', 0.05));
    sg.addColorStop(0.5, rgba('#d8b8ff', 0.4));
    sg.addColorStop(1, rgba('#c8a0ff', 0.05));
    ctx.fillStyle = sg;
    ctx.fillRect(x0, HEARTH + 2, x1 - x0, 5);
    ctx.restore();
    // the slab's joints
    for (const x of [x0 + 180, VX - 40, VX + 210, x1 - 150]) {
      ctx.fillStyle = rgba('#120810', 0.6);
      ctx.fillRect(x, HEARTH + 2, 2, 26);
    }
  });
  const tp = polyPath(top);
  ctx.fillStyle = '#a89a98';
  tp(ctx);
  ctx.fill();
  within(ctx, tp, () => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#8a7a88');
    g.addColorStop(0.5, '#f0e4ff');
    g.addColorStop(1, '#6a5a78');
    ctx.fillStyle = g;
    ctx.fillRect(x0, HEARTH - 10, x1 - x0, 14);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  tp(ctx);
  ctx.stroke();
}

// ——— the wood store and the flour on what's left of the floor ———

function logEnd(ctx: Ctx, r: R, x: number, y: number, rad: number): void {
  const p: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y, rad, rad * 0.92, 0, 0, P2);
  };
  // bark rim, then the sawn end: growth rings, a check splitting it, lit from the top left
  ctx.fillStyle = '#3a2418';
  p(ctx);
  ctx.fill();
  const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 1, x, y, rad * 0.86);
  g.addColorStop(0, '#e8c898');
  g.addColorStop(0.7, '#c09060');
  g.addColorStop(1, '#8a5a38');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rad * 0.84, rad * 0.78, 0, 0, P2);
  ctx.fill();
  ctx.strokeStyle = rgba('#7a4a28', 0.45);
  ctx.lineWidth = 1;
  for (let k = 0.2; k < 0.8; k += 0.16 + r() * 0.06) {
    ctx.beginPath();
    ctx.ellipse(x + (r() - 0.5), y, rad * k, rad * k * 0.92, 0, 0, P2);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba('#3a2014', 0.6);
  ctx.lineWidth = 1.4;
  const a = r() * P2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * rad * 0.8, y + Math.sin(a) * rad * 0.75);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  p(ctx);
  ctx.stroke();
}

function floorProps(ctx: Ctx, r: R): void {
  // the wood store against the oven's left flank: a stack of logs, end on
  const base = 750;
  groundShadow(ctx, 300, base, 140, 12, 0.6, '#06030a');
  ao(ctx, 300, base - 2, 150, 14, 0.5);
  const rows: [number, number, number][] = [[212, 6, 21], [232, 5, 21], [252, 4, 19]];
  rows.forEach(([x0, n, rad], j) => {
    for (let i = 0; i < n; i++) {
      if (j === 2 && i === 2) continue;
      const k = 0.78 + r() * 0.36;
      logEnd(ctx, r, x0 + i * rad * 2.05 + (r() - 0.5) * 9, base - rad - j * rad * 1.7 + (r() - 0.5) * 5 + (1 - k) * rad, rad * k);
    }
  });

  // one log has drifted up off the top of the stack
  ctx.save();
  ctx.translate(318, base - 162);
  ctx.rotate(-0.4);
  const lp: PathFn = (c) => {
    c.beginPath();
    c.roundRect(-46, -14, 92, 28, 12);
  };
  solid(ctx, lp, { x: -46, y: -14, w: 92, h: 28 }, 'wood', '#5a3a24', { depth: 0.1, line: 2.2, formSize: 8 });
  ctx.restore();
  logEnd(ctx, r, 318 - Math.cos(-0.4) * 44, base - 162 - Math.sin(-0.4) * 44, 14);
  lightPool(ctx, 270, base - 60, 120, 60, '#ffb070', 0.06);

  // two flour sacks slumped against the right flank, one split and spilling
  const sx = 1620;
  groundShadow(ctx, sx + 60, base, 120, 11, 0.6, '#06030a');
  for (const [x, w, h, lean] of [[sx + 8, 74, 92, -0.08], [sx + 82, 70, 76, 0.1]] as const) sack(ctx, r, x, base, w, h, lean);
  // spilled flour in a drift on the tiles
  ctx.save();
  ctx.translate(sx + 30, base - 2);
  ctx.scale(1, 0.22);
  const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
  fg.addColorStop(0, rgba('#f4ece0', 0.85));
  fg.addColorStop(0.6, rgba('#e8dcd0', 0.5));
  fg.addColorStop(1, rgba('#e8dcd0', 0));
  ctx.fillStyle = fg;
  ctx.fillRect(-70, -70, 140, 140);
  ctx.restore();
}

function ao(ctx: Ctx, x: number, y: number, rx: number, ry: number, a: number): void {
  groundShadow(ctx, x, y, rx, ry, a, '#06030a', 0);
}

/** A flour sack, slumped: canvas, folds, a printed mark, tied at the neck. Base at (x, base). */
function sack(ctx: Ctx, r: R, x: number, base: number, w: number, h: number, lean: number): void {
  ctx.save();
  ctx.translate(x + w / 2, base);
  ctx.rotate(lean);
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-w / 2, 0);
    c.bezierCurveTo(-w * 0.62, -h * 0.4, -w * 0.48, -h * 0.85, -w * 0.18, -h);
    c.lineTo(w * 0.16, -h * 1.02);
    c.bezierCurveTo(w * 0.5, -h * 0.85, w * 0.62, -h * 0.4, w / 2, 0);
    c.quadraticCurveTo(0, h * 0.06, -w / 2, 0);
    c.closePath();
  };
  solid(ctx, p, { x: -w / 2, y: -h, w, h }, 'canvas', '#d8ccb4', { depth: 0.1, line: 2.4, formSize: 14 });
  within(ctx, p, () => {
    // the print, faded: FARINA 00 in blue
    ctx.fillStyle = rgba('#3a5a9a', 0.55);
    ctx.font = `bold ${Math.round(w * 0.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('FARINA', 0, -h * 0.45);
    ctx.fillText('00', 0, -h * 0.25);
    // folds where it slumps
    ctx.strokeStyle = rgba('#5a4a3a', 0.3);
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-w * 0.4 + i * w * 0.3, -4);
      ctx.quadraticCurveTo(-w * 0.3 + i * w * 0.28, -h * 0.2, -w * 0.25 + i * w * 0.24 + (r() - 0.5) * 6, -h * 0.32);
      ctx.stroke();
    }
    ctx.fillStyle = rgba('#ffffff', 0.18);
    ctx.fillRect(-w / 2, -h, w, h * 0.06);
  });
  // the tied neck
  ctx.fillStyle = '#b8a888';
  ctx.beginPath();
  ctx.ellipse(0, -h * 1.02, w * 0.14, 6, 0, 0, P2);
  ctx.fill();
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-w * 0.14, -h * 0.96);
  ctx.lineTo(w * 0.14, -h * 0.96);
  ctx.stroke();
  ctx.restore();
}

// ——— the portal's vortex (painted at phase 0…1 of its loop; for the still and the live frame sheet) ———

/**
 * The vortex on a disc of radius R at (cx, cy), added: a body of violet light white-hot at the eye, four arms winding
 * in (a quarter turn per loop, so the loop closes), and filaments riding the flow, the inner ones faster.
 */
function vortexPaint(c: Ctx, cx: number, cy: number, R: number, phase: number): void {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const body = c.createRadialGradient(cx, cy, 0, cx, cy, R);
  body.addColorStop(0, rgba('#fff8ff', 0.85));
  body.addColorStop(0.08, rgba('#f0d8ff', 0.7));
  body.addColorStop(0.24, rgba(VIOLET, 0.5));
  body.addColorStop(0.52, rgba('#7a3ac0', 0.34));
  body.addColorStop(0.82, rgba('#4a1c90', 0.2));
  body.addColorStop(1, rgba('#4a1c90', 0));
  c.fillStyle = body;
  c.fillRect(cx - R, cy - R, R * 2, R * 2);
  const ARMS = 3;
  const turn = (phase * P2) / ARMS;
  const colAt = (t: number) => (t < 0.35 ? mix('#fff4ff', '#d8b0ff', t / 0.35) : t < 0.7 ? mix('#d8b0ff', VIOLET, (t - 0.35) / 0.35) : mix(VIOLET, MAGENTA, (t - 0.7) / 0.3));
  for (let k = 0; k < ARMS; k++) {
    for (let i = 4; i <= 56; i++) {
      const t = i / 56;
      const rad = R * (0.05 + 0.88 * t);
      const ang = (k * P2) / ARMS + turn + t * 3.1 + Math.sin(t * 9 + k * 1.3) * 0.04;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      const s = R * (0.05 + t * 0.16);
      const a = 0.26 * (1 - t * 0.45) * Math.min(1, (1 - t) * 5) * Math.min(1, (t - 0.06) * 5);
      const g = c.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, rgba(colAt(t), a));
      g.addColorStop(1, rgba(colAt(t), 0));
      c.fillStyle = g;
      c.fillRect(x - s, y - s, s * 2, s * 2);
    }
  }
  // filaments: thin bright threads riding the flow, each ring at its own speed (whole quarter turns per loop)
  c.lineCap = 'round';
  const fr = rng(808);
  for (let i = 0; i < 10; i++) {
    const r0 = R * (0.2 + 0.075 * i);
    const m = i < 3 ? 2 : 1;
    const base = fr() * P2;
    const len = 0.9 + fr() * 0.9;
    const col = mix('#f0d8ff', i % 3 === 0 ? CYAN : MAGENTA, i / 16);
    for (let s = 0; s < ARMS; s++) {
      const a0 = base + (s * P2) / ARMS + (phase * m * P2) / ARMS;
      c.strokeStyle = rgba(col, 0.32 * (1 - i / 14));
      c.lineWidth = R * (0.005 + 0.008 * (1 - i / 10));
      c.beginPath();
      for (let q = 0; q <= 14; q++) {
        const u = q / 14;
        const ang = a0 + u * len;
        const rad = r0 * (1 - u * 0.4);
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;
        if (q) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
    }
  }
  // the eye
  const eye = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.2);
  eye.addColorStop(0, rgba('#ffffff', 0.8));
  eye.addColorStop(0.45, rgba('#f4e4ff', 0.42));
  eye.addColorStop(1, rgba('#f4e4ff', 0));
  c.fillStyle = eye;
  c.fillRect(cx - R * 0.2, cy - R * 0.2, R * 0.4, R * 0.4);
  c.restore();
}

function vortexStill(ctx: Ctx): void {
  within(ctx, mouthPath, () => vortexPaint(ctx, VC.x, VC.y, VR, 0));
  // its light spilling past the mouth over the bricks and the sill
  glowAt(ctx, VC.x, VC.y + 20, 470, VIOLET, 0.2, 0.95);
}

// ——— the debris: bricks calved off the crown, tiles off the floor ———

/** A brick tumbling in space (index i): its face, its lit top, its shaded end; mortar still stuck to it. */
function brickBit(c: Ctx, cx: number, cy: number, w: number, h: number, i: number): void {
  const rr = rng(400 + i * 13);
  const col = PAL[i % PAL.length];
  const d = h * 0.45;
  const face: Pt[] = [[cx - w / 2, cy - h / 2 + d * 0.5], [cx + w / 2 - d, cy - h / 2 + d * 0.5], [cx + w / 2 - d, cy + h / 2], [cx - w / 2, cy + h / 2]];
  const topF: Pt[] = [[cx - w / 2, cy - h / 2 + d * 0.5], [cx - w / 2 + d, cy - h / 2 - d * 0.5], [cx + w / 2, cy - h / 2 - d * 0.5], [cx + w / 2 - d, cy - h / 2 + d * 0.5]];
  const end: Pt[] = [[cx + w / 2 - d, cy - h / 2 + d * 0.5], [cx + w / 2, cy - h / 2 - d * 0.5], [cx + w / 2, cy + h / 2 - d], [cx + w / 2 - d, cy + h / 2]];
  for (const [pts, k] of [[face, 0], [topF, 0.22], [end, -0.32]] as const) {
    c.fillStyle = shade(col, k + (rr() - 0.5) * 0.08);
    polyPath(pts)(c);
    c.fill();
  }
  // mortar crumbs on its faces
  c.fillStyle = rgba('#9a8a80', 0.6);
  for (let n = 0; n < 3; n++) c.fillRect(cx - w / 2 + rr() * (w - d), cy - h / 2 + d * 0.5 + rr() * (h - d), 2 + rr() * 3, 1.5 + rr() * 2);
  // the portal's violet on its lower edge
  c.strokeStyle = rgba('#c8a0ff', 0.45);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(face[3][0], face[3][1] - 0.5);
  c.lineTo(face[2][0], face[2][1] - 0.5);
  c.stroke();
  c.strokeStyle = INK;
  c.lineWidth = 1.3;
  c.lineJoin = 'round';
  polyPath([face[0], topF[1], topF[2], end[2], face[2], face[3]])(c);
  c.stroke();
}

/** A plate broken off the floor (index i), tumbling: a few chequered tiles still bedded together, one corner
 * cracked away, their section (tile, mortar bed, rubble) along the near edge, the key on its top. */
function tileBit(c: Ctx, cx: number, cy: number, s: number, i: number): void {
  const rr = rng(700 + i * 7);
  // a plate seen a little from above: a skewed quad of 2×2 (or 2×1) tiles
  const n = i % 3 === 0 ? 1 : 2;
  const w = s;
  const d = s * 0.4;
  const skew = d * (0.4 + rr() * 0.3);
  const th = s * 0.12;
  const A: Pt = [cx - w / 2 + skew, cy - d / 2];
  const B: Pt = [cx + w / 2 + skew * 0.6, cy - d / 2 + rr() * 3];
  const Cc: Pt = [cx + w / 2 - skew * 0.4, cy + d / 2];
  const Dd: Pt = [cx - w / 2 - skew * 0.2, cy + d / 2 - rr() * 3];
  const bi = (u: number, v: number): Pt => {
    const top: Pt = [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u];
    const bot: Pt = [Dd[0] + (Cc[0] - Dd[0]) * u, Dd[1] + (Cc[1] - Dd[1]) * u];
    return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
  };
  // the broken corner
  const cut = 0.3 + rr() * 0.25;
  const outline: Pt[] = [A, B, bi(1, 1 - cut), bi(1 - cut * 0.8, 1), Dd];
  // the section along the near edges
  const sec: Pt[] = [Dd, bi(1 - cut * 0.8, 1), bi(1, 1 - cut), [bi(1, 1 - cut)[0], bi(1, 1 - cut)[1] + th], [bi(1 - cut * 0.8, 1)[0], bi(1 - cut * 0.8, 1)[1] + th * 1.3], [Dd[0], Dd[1] + th * (0.7 + rr() * 0.5)]];
  const sp = polyPath(sec);
  within(c, sp, () => {
    const g = c.createLinearGradient(0, Dd[1], 0, Dd[1] + th * 1.4);
    g.addColorStop(0, '#b8a890');
    g.addColorStop(0.25, '#7a6a5e');
    g.addColorStop(0.5, '#5a4640');
    g.addColorStop(1, '#2a1a1e');
    c.fillStyle = g;
    c.fillRect(cx - s, cy - s, s * 2, s * 2);
  });
  const op = polyPath(outline);
  within(c, op, () => {
    for (let u = 0; u < 2; u++) {
      for (let v = 0; v < n; v++) {
        const q = [bi(u / 2, v / n), bi((u + 1) / 2, v / n), bi((u + 1) / 2, (v + 1) / n), bi(u / 2, (v + 1) / n)];
        const dark = (u + v + i) % 2 === 1;
        c.fillStyle = dark ? mix('#2a2034', '#3a2c46', rr()) : mix('#c8bca4', '#d8ccb4', rr());
        polyPath(q)(c);
        c.fill();
        c.strokeStyle = rgba('#120a14', 0.8);
        c.lineWidth = 1;
        c.stroke();
      }
    }
    // the key on its far half, the portal's violet on the near
    const lg = c.createLinearGradient(A[0], A[1], Cc[0], Cc[1]);
    lg.addColorStop(0, rgba('#ffe0b0', 0.22));
    lg.addColorStop(1, rgba('#7a50c0', 0.18));
    c.fillStyle = lg;
    c.fillRect(cx - s, cy - s, s * 2, s * 2);
  });
  c.strokeStyle = INK;
  c.lineWidth = 1.2;
  c.lineJoin = 'round';
  polyPath([A, B, sec[2], sec[3], sec[4], sec[5], Dd])(c);
  c.stroke();
}

/** Where the bricks hang over the crown at the start (the still paints them; the live layer sets them drifting). */
const FLUE_AT: Pt = [990, 84];
const CROWN: { x: number; y: number; w: number; h: number; a: number; i: number }[] = (() => {
  const rr = rng(1201);
  const out: { x: number; y: number; w: number; h: number; a: number; i: number }[] = [];
  for (let i = 0; i < 13; i++) {
    const th = GAP_OUT[0] + 0.05 + rr() * (GAP_OUT[1] - GAP_OUT[0] - 0.1);
    const lift = rr() ** 1.3 * 110;
    const [x, y] = archPt(th, P.rx + 30 + lift * 0.6, P.ry + 30 + lift * 0.6 - 60 * rr());
    if (y < 34 || (Math.abs(x - FLUE_AT[0]) < 52 && Math.abs(y - FLUE_AT[1]) < 64)) continue;
    const s = 0.75 + rr() * 0.5;
    out.push({ x, y, w: 34 * s, h: 22 * s, a: (rr() - 0.5) * 2.4, i });
  }
  return out;
})();
const TILES0 = EDGE_TILES.filter((_, i) => i % 3 === 1).slice(0, 6).map((t, i) => ({ x: t.x + t.side * (30 + i * 14), y: t.y - 40 - i * 22, s: t.s * 34, a: (hash(i, 3) - 0.5) * 2, i }));

function debrisStill(ctx: Ctx): void {
  for (const b of CROWN) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a);
    brickBit(ctx, 0, 0, b.w, b.h, b.i);
    ctx.restore();
  }
  for (const t of TILES0) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.a);
    tileBit(ctx, 0, 0, t.s, t.i);
    ctx.restore();
  }
}

/** Embers drawn into the vortex (the still's frozen moment of the live layer's). */
function embersStill(ctx: Ctx): void {
  const rr = rng(1717);
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9;
    const rad = 30 + u * 230;
    const th = i * 2.39 + u * 1.4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.85 * Math.min(1, (300 - rad) / 110);
    ctx.translate(VC.x + Math.cos(th) * rad, VC.y + Math.sin(th) * rad * 0.95);
    ctx.rotate(rr() * P2);
    const k = 0.34 + Math.min(1, rad / 240) * 1.3;
    ctx.scale(k, k);
    ctx.translate(-24, -24);
    shardFrame(ctx, 48, i);
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const rad = 60 + rr() * 560;
    const th = rr() * P2;
    const x = VC.x + Math.cos(th) * rad;
    const y = VC.y + Math.sin(th) * rad * 0.95;
    if (y > TY - 10) continue;
    const col = rad < 220 ? '#f0d0ff' : rr() < 0.7 ? ORANGE : MAGENTA;
    const s = rad < 220 ? 2.5 : 3.5;
    // drawn out along the flow (clockwise, falling in)
    const tang = th + Math.PI / 2 + 0.35;
    const L = 6 + 900 / (rad + 60);
    const g = ctx.createLinearGradient(x, y, x - Math.cos(tang) * L * 2, y - Math.sin(tang) * L * 2);
    g.addColorStop(0, rgba('#fff4e0', 0.9));
    g.addColorStop(0.3, rgba(col, 0.7));
    g.addColorStop(1, rgba(col, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(tang) * L * 2, y - Math.sin(tang) * L * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ——— the glow leaking through the cracks (live only: it comes up from the third wave) ———

const CRACK_BOX: Box = { x: 300, y: 30, w: 1320, h: 700 };

/** The facade's outline (the piers and the arch's outer ring): it stands in front of the dome. */
const facadeOuter: PathFn = (c) => {
  c.moveTo(P.x - AX, HEARTH);
  c.lineTo(P.x - AX, P.y);
  c.ellipse(P.x, P.y, AX, AY, 0, Math.PI, P2);
  c.lineTo(P.x + AX, HEARTH);
  c.closePath();
};

function crackGlow(ctx: Ctx): void {
  // only on the shell: not over the facade in front of it
  ctx.save();
  polyPath(DOME_PTS)(ctx);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  facadeOuter(ctx);
  ctx.clip('evenodd');
  crackGlowIn(ctx);
  ctx.restore();
}

function crackGlowIn(ctx: Ctx): void {
  softly(ctx, CRACK_BOX, (c) => {
    c.lineCap = 'round';
    c.lineJoin = 'round';
    // the light leaking out lights the bricks either side: a wide soft halo, then a tighter glow
    for (const pl of CRACKS) {
      c.strokeStyle = rgba(VIOLET, 0.22);
      c.lineWidth = 30;
      strokePts(c, pl);
      c.strokeStyle = rgba('#d890ff', 0.5);
      c.lineWidth = 9;
      strokePts(c, pl);
    }
    for (const edge of [BREAK_L, BREAK_R2]) {
      c.strokeStyle = rgba(VIOLET, 0.2);
      c.lineWidth = 26;
      strokePts(c, edge, 0, 10);
    }
  }, 0.25);
  // the hot core, tapering along each crack
  for (const pl of CRACKS) strokeCrack(ctx, pl, 2.2, '#fff0ff', 0.9);
}

// ——— the slab of shell lifting away ———

function chunk(ctx: Ctx): void {
  const pts = CHUNK_PTS;
  const p = polyPath(pts);
  const b = boxOf(pts, 2);
  // the slab's thickness showing along its fracture (the underside, lit violet from the portal below it)
  const under = FRACTURE;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3a1a14';
  ctx.lineWidth = 12;
  strokePts(ctx, under, 0, 4);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba('#c890ff', 0.35);
  ctx.lineWidth = 4;
  strokePts(ctx, under, 0, 8);
  ctx.restore();
  within(ctx, p, () => {
    // the dome's own courses and light, so it sits in its hole on the first wave
    domeCourses(ctx, 5, b.y - 20, b.y + b.h + 20);
    domeShade(ctx, b);
  });
  breakEdge(ctx, BREAK_R.slice(CHUNK_SEG[0], CHUNK_SEG[1] + 1));
  rim(ctx, p, 0.5, 4, CYAN);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  p(ctx);
  ctx.stroke();
}
const CHUNK_BOX = boxOf(CHUNK_PTS, 20);

// ——— the floating things ———

interface Floater {
  id: string;
  x: number;
  y: number;
  rot: number;
  /** Half extents of the painted thing (unrotated), for its box. */
  hw: number;
  hh: number;
  draw(ctx: Ctx, r: R): void;
  /** How much it bobs (px) and turns (rad) on its own. */
  bob: number;
  turn: number;
  /** Drifts away over the stage's waves (px at wave 4). */
  away: Pt;
}

function rotBox(f: Floater, pad = 14): Box {
  const c = Math.abs(Math.cos(f.rot));
  const s = Math.abs(Math.sin(f.rot));
  const w = f.hw * c + f.hh * s + pad;
  const h = f.hw * s + f.hh * c + pad;
  return { x: Math.floor(f.x - w), y: Math.floor(f.y - h), w: Math.ceil(w * 2), h: Math.ceil(h * 2) };
}

/** Light a floating thing: the portal's violet on the side that faces it, the cool rim, one ink line. */
function litEdge(ctx: Ctx, f: Floater, p: PathFn, a = 0.55): void {
  bounce(ctx, p, f.x - 300, f.y - 400, [f.x, f.y], '#ffc890', 0.4, 5);
  bounce(ctx, p, VC.x, VC.y, [f.x, f.y], '#c8a0ff', a, 7);
  rim(ctx, p, 0.3, 3, '#9ab8ff');
}

function inFrame(f: Floater, ctx: Ctx, fn: () => void): void {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rot);
  fn();
  ctx.restore();
}

const PEEL: Floater = {
  id: 'fPeel', x: 312, y: 318, rot: -0.55, hw: 150, hh: 58, bob: 10, turn: 0.1, away: [-20, -16],
  draw(ctx, r) {
    inFrame(this, ctx, () => {
      const p: PathFn = (c) => {
        c.beginPath();
        c.moveTo(-150, -40);
        c.quadraticCurveTo(-152, -56, -130, -56);
        c.lineTo(-56, -52);
        c.quadraticCurveTo(-30, -50, -18, -16);
        c.lineTo(-4, -11);
        c.lineTo(140, -9);
        c.quadraticCurveTo(152, 0, 140, 9);
        c.lineTo(-4, 11);
        c.lineTo(-18, 16);
        c.quadraticCurveTo(-30, 50, -56, 52);
        c.lineTo(-130, 56);
        c.quadraticCurveTo(-152, 56, -150, 40);
        c.closePath();
      };
      solid(ctx, p, { x: -152, y: -56, w: 300, h: 112 }, 'wood', '#b88850', { depth: 0.05, line: 3.2, formSize: 12 });
      within(ctx, p, () => {
        // the blade: years of scorch at its leading edge, flour in the grain
        const g = ctx.createLinearGradient(-152, 0, -60, 0);
        g.addColorStop(0, rgba('#2a1008', 0.55));
        g.addColorStop(1, rgba('#2a1008', 0));
        ctx.fillStyle = g;
        ctx.fillRect(-152, -60, 100, 120);
        ctx.strokeStyle = rgba('#6a4020', 0.35);
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 9; i++) {
          const y = -46 + i * 11.5 + (r() - 0.5) * 3;
          ctx.beginPath();
          ctx.moveTo(-148, y);
          ctx.bezierCurveTo(-110, y + (r() - 0.5) * 6, -70, y + (r() - 0.5) * 6, -24, y * 0.4);
          ctx.stroke();
        }
        lay(ctx, noiseMask(5, 81, { cover: 0.3, soft: 0.25, col: '#f4ece0', w: 64, h: 32 }), { x: -140, y: -50, w: 100, h: 100 }, 0.4);
        // a hole through the handle's end to hang it by
        ctx.fillStyle = '#05020a';
        ctx.beginPath();
        ctx.arc(128, 0, 3.5, 0, P2);
        ctx.fill();
      });
      litEdge(ctx, this, p);
    });
  },
};

const SACK: Floater = {
  id: 'fSack', x: 1702, y: 300, rot: 0.32, hw: 112, hh: 108, bob: 12, turn: 0.12, away: [24, -20],
  draw(ctx, r) {
    inFrame(this, ctx, () => {
      // the flour trailing out of a split in its corner, weightless: a ribbon curling away, thinning to dust
      softly(ctx, { x: -120, y: -110, w: 240, h: 220 }, (c) => {
        // puffs let go one after another, swelling and thinning as they drift off
        for (let i = 0; i < 9; i++) {
          const t = i / 8;
          const x = -34 - t * 76 + Math.sin(t * 5) * 8;
          const y = 50 + Math.sin(t * 3.2) * 16 - t * 30;
          const rad = 7 + t * 16;
          const g = c.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
          g.addColorStop(0, rgba('#fbf6f0', 0.7 * (1 - t * 0.7)));
          g.addColorStop(1, rgba('#e8e0dc', 0));
          c.fillStyle = g;
          c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      }, 0.5);
      ctx.fillStyle = rgba('#f8f2ea', 0.75);
      for (let i = 0; i < 26; i++) {
        const t = r();
        const x = -30 - t * 70 + (r() - 0.5) * 18;
        const y = 50 - t * 50 + (r() - 0.5) * 30;
        ctx.beginPath();
        ctx.arc(x, y, 0.8 + r() * 1.4, 0, P2);
        ctx.fill();
      }
      const p: PathFn = (c) => {
        c.beginPath();
        c.moveTo(-44, -46);
        c.quadraticCurveTo(-10, -58, 10, -64);
        c.lineTo(24, -54);
        c.quadraticCurveTo(52, -40, 54, 6);
        c.quadraticCurveTo(56, 48, 28, 58);
        c.quadraticCurveTo(-6, 66, -30, 54);
        c.lineTo(-38, 40);
        c.quadraticCurveTo(-58, 0, -44, -46);
        c.closePath();
      };
      solid(ctx, p, { x: -58, y: -64, w: 114, h: 130 }, 'canvas', '#dcd0b8', { depth: 0.05, line: 3, formSize: 16 });
      within(ctx, p, () => {
        ctx.fillStyle = rgba('#3a5a9a', 0.55);
        ctx.font = 'bold 17px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FARINA', 4, 2);
        ctx.fillText('00', 4, 20);
        ctx.strokeStyle = rgba('#5a4a3a', 0.3);
        ctx.lineWidth = 2;
        for (const [x0, y0, x1, y1] of [[-30, -30, 0, -40], [20, 30, 44, 40], [-20, 40, 10, 50]] as const) {
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 8, x1, y1);
          ctx.stroke();
        }
      });
      // the split, and the tie at its neck
      ctx.fillStyle = '#f8f2ea';
      ctx.beginPath();
      ctx.ellipse(-34, 47, 9, 5, 0.6, 0, P2);
      ctx.fill();
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-2, -58);
      ctx.lineTo(18, -62);
      ctx.stroke();
      litEdge(ctx, this, p);
    });
  },
};

const TIN: Floater = {
  id: 'fTin', x: 156, y: 512, rot: 0.42, hw: 42, hh: 54, bob: 9, turn: 0.2, away: [-24, -10],
  draw(ctx) {
    inFrame(this, ctx, () => {
      const p: PathFn = (c) => {
        c.beginPath();
        c.moveTo(-36, -42);
        c.ellipse(0, -42, 36, 9, 0, Math.PI, 0, false);
        c.lineTo(36, 42);
        c.ellipse(0, 42, 36, 9, 0, 0, Math.PI, false);
        c.closePath();
      };
      solid(ctx, p, { x: -36, y: -51, w: 72, h: 102 }, 'chrome', '#b8bcc8', { depth: 0.05, line: 2.8, formSize: 12 });
      within(ctx, p, () => {
        // the label: red, a tomato, POMODORI
        ctx.fillStyle = '#b8282c';
        ctx.fillRect(-40, -28, 80, 58);
        const g = ctx.createLinearGradient(-36, 0, 36, 0);
        g.addColorStop(0, rgba('#ffffff', 0.22));
        g.addColorStop(0.35, rgba('#ffffff', 0));
        g.addColorStop(1, rgba('#1a0410', 0.5));
        ctx.fillStyle = g;
        ctx.fillRect(-40, -28, 80, 58);
        ctx.fillStyle = '#e83a2a';
        ctx.beginPath();
        ctx.arc(-6, -4, 12, 0, P2);
        ctx.fill();
        ctx.fillStyle = '#3a8a2a';
        ctx.fillRect(-9, -18, 6, 5);
        ctx.fillStyle = '#f8e8c0';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('POMODORI', -2, 22);
        // the ribs of the can
        ctx.strokeStyle = rgba('#3a3a4a', 0.4);
        ctx.lineWidth = 1.2;
        for (const y of [-36, 36]) {
          ctx.beginPath();
          ctx.ellipse(0, y, 36, 9, 0, 0, Math.PI);
          ctx.stroke();
        }
      });
      // the lid, open a crack
      ctx.fillStyle = '#d8dce6';
      ctx.beginPath();
      ctx.ellipse(0, -42, 34, 8, 0, 0, P2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      litEdge(ctx, this, p);
    });
  },
};

const PIN: Floater = {
  id: 'fPin', x: 1508, y: 150, rot: 0.3, hw: 118, hh: 18, bob: 8, turn: 0.16, away: [20, -26],
  draw(ctx) {
    inFrame(this, ctx, () => {
      const p: PathFn = (c) => {
        c.beginPath();
        c.roundRect(-74, -16, 148, 32, 15);
      };
      for (const sx of [-1, 1]) {
        const hp: PathFn = (c) => {
          c.beginPath();
          c.roundRect(sx < 0 ? -116 : 74, -8, 42, 16, 7);
        };
        solid(ctx, hp, { x: sx < 0 ? -116 : 74, y: -8, w: 42, h: 16 }, 'wood', '#8a5a30', { depth: 0.05, line: 2.4, formSize: 6 });
      }
      solid(ctx, p, { x: -74, y: -16, w: 148, h: 32 }, 'wood', '#d8b080', { depth: 0.05, line: 3, formSize: 10 });
      within(ctx, p, () => lay(ctx, noiseMask(5, 83, { cover: 0.3, soft: 0.3, col: '#f4ece0', w: 64, h: 16 }), { x: -74, y: -16, w: 148, h: 32 }, 0.45));
      litEdge(ctx, this, p);
    });
  },
};

/** The flue: the oven's chimney, broken off at the crown and floating away over the gap. */
const FLUE: Floater = {
  id: 'fFlue', x: FLUE_AT[0], y: FLUE_AT[1], rot: 0.24, hw: 54, hh: 76, bob: 6, turn: 0.06, away: [30, -34],
  draw(ctx, r) {
    inFrame(this, ctx, () => {
      ctx.scale(1.35, 1.35);
      // the stack: brick, broken off ragged at its foot
      const stack: Pt[] = [[-26, -30], [26, -30], [26, 38], [18, 44], [8, 40], [-2, 48], [-12, 42], [-26, 46]];
      const sp = polyPath(stack);
      within(ctx, sp, () => {
        bricks(ctx, r, { x: -30, y: -34, w: 60, h: 84 }, PAL, MORTAR, 22, 10);
        const g = ctx.createLinearGradient(-26, 0, 26, 0);
        g.addColorStop(0, rgba('#ffd0a0', 0.12));
        g.addColorStop(1, rgba('#08040e', 0.5));
        ctx.fillStyle = g;
        ctx.fillRect(-30, -34, 60, 84);
        ctx.fillStyle = rgba('#05020a', 0.5);
        ctx.fillRect(-30, -34, 60, 14);
      });
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      sp(ctx);
      ctx.stroke();
      // the copper cap, gone green at its edges
      const cap: PathFn = (c) => {
        c.beginPath();
        c.moveTo(-38, -30);
        c.lineTo(0, -56);
        c.lineTo(38, -30);
        c.closePath();
      };
      solid(ctx, cap, { x: -38, y: -56, w: 76, h: 26 }, 'chrome', '#c87a4a', { depth: 0.05, line: 2.6, formSize: 8 });
      within(ctx, cap, () => {
        ctx.fillStyle = rgba('#4aa890', 0.35);
        ctx.fillRect(-38, -36, 76, 6);
      });
      litEdge(ctx, this, sp, 0.6);
    });
  },
};

const FLOATERS: Floater[] = [PEEL, SACK, TIN, PIN, FLUE];

// ——— the table: the kitchen's marble worktop ———

function table(ctx: Ctx, r: R): void {
  const F = FIN.front + 4;
  const box = { x: 0, y: TY, w: W, h: F - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  surface(ctx, r, box, '#2a2234', { vary: 0.45, warm: '#5a4a68', cool: '#141020', cells: 6, strokes: 0.2, strokeAng: 0, strokeLen: 300, strokeW: 12, grain: 0.1, seed: 13 });
  // veins in the marble, foreshortened: running across, soft
  for (let i = 0; i < 11; i++) {
    let x = r() * W;
    let y = TY + 8 + r() * (F - TY - 16);
    const k = (y - TY) / (F - TY);
    const pts: Pt[] = [[x, y]];
    let d = (r() - 0.5) * 0.3;
    for (let s = 0; s < 18; s++) {
      d += (r() - 0.5) * 0.25;
      x += Math.cos(d) * (18 + r() * 20);
      y += Math.sin(d) * (4 + r() * 4) * (0.4 + k);
      pts.push([x, y]);
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#a898c8', 0.04);
    ctx.lineWidth = 5 + k * 6;
    strokePts(ctx, pts);
    ctx.strokeStyle = rgba('#c8b8e8', 0.055);
    ctx.lineWidth = 0.8 + k;
    strokePts(ctx, pts);
  }
  // the portal mirrored in the polish at the back, the light falling off towards us
  softly(ctx, { x: 400, y: TY, w: 1120, h: 260 }, (c) => {
    c.save();
    c.translate(VX, TY);
    c.scale(1, 0.32);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 520);
    g.addColorStop(0, rgba('#e8d0ff', 0.5));
    g.addColorStop(0.35, rgba(VIOLET, 0.26));
    g.addColorStop(1, rgba(VIOLET, 0));
    c.fillStyle = g;
    c.fillRect(-560, -560, 1120, 1120);
    c.restore();
    // the mouth mirrored in the polish: a long soft column down the middle of the worktop
    c.save();
    c.translate(VX, TY);
    c.scale(0.62, 1);
    const m = c.createRadialGradient(0, 0, 0, 0, 0, 300);
    m.addColorStop(0, rgba('#d8b8ff', 0.3));
    m.addColorStop(0.5, rgba(VIOLET, 0.12));
    m.addColorStop(1, rgba(VIOLET, 0));
    c.fillStyle = m;
    c.fillRect(-320, 0, 640, 300);
    c.restore();
  }, 0.25, 'lighter');
  // a glint along the worktop's back arris, under the mouth
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createLinearGradient(VX - 420, 0, VX + 420, 0);
  gl.addColorStop(0, rgba('#e8d0ff', 0));
  gl.addColorStop(0.5, rgba('#f4e8ff', 0.5));
  gl.addColorStop(1, rgba('#e8d0ff', 0));
  ctx.fillStyle = gl;
  ctx.fillRect(VX - 420, TY + 1, 840, 2);
  ctx.restore();
  // the key's warmth on the left, the cool on the right
  const sg = ctx.createLinearGradient(0, 0, W, 0);
  sg.addColorStop(0, rgba('#ffb070', 0.06));
  sg.addColorStop(0.5, rgba('#000000', 0));
  sg.addColorStop(1, rgba('#3a4ab0', 0.06));
  ctx.fillStyle = sg;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  // flour worked into it where the dough is stretched, thin under the pizzas
  lay(ctx, noiseMask(9, 91, { cover: 0.3, soft: 0.3, col: '#e8e0e8', w: 192, h: 40 }), box, 0.08);
  for (let i = 0; i < 260; i++) {
    const y = TY + r() * (F - TY);
    const k = (y - TY) / (F - TY);
    ctx.fillStyle = rgba('#f4eef4', 0.15 + r() * 0.2);
    ctx.fillRect(r() * W, y, 1 + k * 1.6, 0.8 + k);
  }
  ctx.restore();
  tableFalloff(ctx, F, 0.42, '#05030a');
  // the back edge: the worktop's arris against the floor beyond
  crevice(ctx, 0, W, TY, 14, 0.35, '#05030a');
  ctx.fillStyle = rgba('#e8d8ff', 0.16);
  ctx.fillRect(0, TY, W, 1.5);
  // the front: a brass rim, then the marble's face
  vfill(ctx, 0, F, W, 9, [[0, '#ffe2a8'], [0.35, '#c8943a'], [1, '#4a2e12']]);
  vfill(ctx, 0, F + 9, W, 1080 - F - 9, [[0, '#2a2030'], [1, '#100a14']]);
  const fg = ctx.createLinearGradient(0, 0, W, 0);
  fg.addColorStop(0, rgba('#ffd8a0', 0.16));
  fg.addColorStop(0.5, rgba('#ffd8a0', 0.02));
  fg.addColorStop(1, rgba('#000000', 0.2));
  ctx.fillStyle = fg;
  ctx.fillRect(0, F, W, 1080 - F);
}

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#c8a8ff', 0.06, { warm: '#ffb070', cool: '#4a50d0', a: 0.2 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.1, '#05020c', 120, 700);
  vignetteAll(ctx, 0.72, '#020008', 0.55);
}

export const OVEN: SceneSpec = {
  id: 'oven',
  info: {
    name: 'The Oven Between Worlds',
    subtitle: 'Waves 91–94',
    ambient: [],
    // (the portal, the embers and the stars are the live layer's)
    glows: [],
    light: '#e0c8ff',
    tableTint: '#f0e8ff',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: TY }, draw: sky },
    { id: 'worlds', box: { x: 40, y: 0, w: W - 40, h: 520 }, draw: worlds },
    { id: 'floor', box: { x: 0, y: 520, w: W, h: TY - 520 + 2 }, draw: floor },
    { id: 'dome', box: { x: 300, y: 40, w: 1330, h: 730 - 40 }, draw: dome },
    { id: 'facade', box: { x: P.x - AX - 40, y: P.y - AY - 30, w: AX * 2 + 80, h: HEARTH - P.y + AY + 60 }, draw: facade },
    { id: 'mouth', box: { x: P.x - P.rx, y: P.y - P.ry, w: P.rx * 2, h: HEARTH - P.y + P.ry }, draw: (c) => mouth(c) },
    { id: 'sill', box: { x: P.x - P.rx - 80, y: HEARTH - 12, w: P.rx * 2 + 160, h: 60 }, draw: sill },
    { id: 'floorProps', box: { x: 100, y: 560, w: 1820, h: TY - 560 + 2 }, draw: floorProps },
    { id: 'vortexStill', box: { x: VC.x - 480, y: VC.y - 480, w: 960, h: 960 }, stillOnly: true, draw: vortexStill },
    { id: 'embersStill', stillOnly: true, draw: embersStill },
    { id: 'debrisStill', stillOnly: true, draw: debrisStill },
    { id: 'crackGlow', box: CRACK_BOX, liveOnly: true, res: 0.5, draw: crackGlow },
    { id: 'chunk', box: CHUNK_BOX, motion: 'sprite', draw: (c) => chunk(c) },
    ...FLOATERS.map((f) => ({ id: f.id, box: rotBox(f), motion: 'sprite' as const, draw: (c: Ctx, r: R) => f.draw(c, r) })),
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** One memory pouring out of the eye (index i): a torn fragment of a picture of an earlier place (its sky, its
 * horizon, the thing that stood there), glowing, its torn edge brightest. For an ADD blend. */
function shardFrame(c: Ctx, s: number, i: number): void {
  const rr = rng(1300 + i * 11);
  const cx = s / 2;
  const cy = s / 2;
  const w = s * 0.62;
  const h = s * 0.46;
  // a torn quad: four corners, one edge ragged
  const pts: Pt[] = [];
  const tl: Pt = [cx - w / 2 + rr() * 3, cy - h / 2 + rr() * 3];
  const tr: Pt = [cx + w / 2 - rr() * 3, cy - h / 2 + rr() * 2];
  const br: Pt = [cx + w / 2 - rr() * 2, cy + h / 2 - rr() * 3];
  const bl: Pt = [cx - w / 2 + rr() * 2, cy + h / 2];
  pts.push(tl, tr, br);
  for (let k = 1; k < 6; k++) pts.push([br[0] + (bl[0] - br[0]) * (k / 6), br[1] + (bl[1] - br[1]) * (k / 6) + (rr() - 0.5) * 4]);
  pts.push(bl);
  const p = polyPath(pts);
  // the places: [sky top, sky low, ground, the thing that stood there]
  const places: [string, string, string, number][] = [
    ['#ff9a5a', '#ffe0a0', '#3a8ac8', 0], // a beach at sunset: a palm
    ['#8ac8ff', '#e8f4ff', '#f4f8ff', 1], // the slopes: a snowy peak
    ['#2a1a4a', '#6a4a8a', '#3a2a2a', 2], // a town at night: lit windows
    ['#ffd27a', '#fff0c8', '#a8c860', 3], // a garden: columns
    ['#1a2a5a', '#3a5a9a', '#2a3a4a', 4], // the pier: a lighthouse
    ['#ff7a3a', '#ffc860', '#5a2a1a', 5], // the underworld's fires: a temple front
    ['#5ac8ff', '#c8f0ff', '#e0f4ff', 6], // the rink: a skater's swirl
    ['#ff5a8a', '#ffb0c8', '#8a3a6a', 0], // a sunset sea: a palm
  ];
  const [sky0, sky1, ground, kind] = places[i % places.length];
  within(c, p, () => {
    const g = c.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    g.addColorStop(0, rgba(sky0, 0.85));
    g.addColorStop(0.62, rgba(sky1, 0.85));
    g.addColorStop(0.64, rgba(ground, 0.85));
    g.addColorStop(1, rgba(shade(ground, -0.3), 0.85));
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
    const hy = cy - h / 2 + h * 0.63;
    c.fillStyle = rgba('#1a0c20', 0.75);
    c.beginPath();
    if (kind === 0) {
      c.fillRect(cx + 3, hy - h * 0.45, 2, h * 0.45);
      for (let k = 0; k < 5; k++) c.ellipse(cx + 4 + Math.cos(k * 1.2 - 2.4) * 5, hy - h * 0.47 + Math.sin(k * 1.2 - 2.4) * 2, 5, 1.6, k * 1.2 - 2.4, 0, P2);
    } else if (kind === 1) {
      c.fillStyle = rgba('#5a6a9a', 0.85);
      c.moveTo(cx - w * 0.3, hy);
      c.lineTo(cx, hy - h * 0.5);
      c.lineTo(cx + w * 0.3, hy);
    } else if (kind === 2) {
      c.fillRect(cx - w * 0.3, hy - h * 0.3, w * 0.25, h * 0.3);
      c.fillRect(cx + w * 0.02, hy - h * 0.42, w * 0.22, h * 0.42);
    } else if (kind === 3) for (const x of [-0.25, 0, 0.25]) c.rect(cx + x * w - 1.5, hy - h * 0.4, 3, h * 0.4);
    else if (kind === 4) c.rect(cx - 2, hy - h * 0.5, 4, h * 0.5);
    else if (kind === 5) {
      c.moveTo(cx - w * 0.28, hy - h * 0.3);
      c.lineTo(cx, hy - h * 0.46);
      c.lineTo(cx + w * 0.28, hy - h * 0.3);
      for (const x of [-0.22, -0.07, 0.08, 0.22]) c.rect(cx + x * w - 1.2, hy - h * 0.3, 2.4, h * 0.3);
    } else c.ellipse(cx, hy + 2, w * 0.25, 2.4, 0, 0, P2);
    c.fill();
    if (kind === 2) {
      c.fillStyle = rgba('#ffe08a', 0.9);
      for (let k = 0; k < 5; k++) c.fillRect(cx - w * 0.27 + k * 6, hy - h * 0.22 + (k % 2) * 4, 2, 2);
    }
    if (kind === 4) {
      c.fillStyle = rgba('#fff4c8', 1);
      c.fillRect(cx - 2, hy - h * 0.55, 4, 3);
    }
  });
  // the torn edge burning white, the others glowing softly
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = rgba('#e8d0ff', 0.5);
  c.lineWidth = 3;
  p(c);
  c.stroke();
  c.strokeStyle = rgba('#ffffff', 0.9);
  c.lineWidth = 1.2;
  c.beginPath();
  pts.slice(2).forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  c.restore();
}

interface Ember {
  img: Phaser.GameObjects.Image;
  r: number;
  th: number;
  age: number;
  col: number;
  s: number;
  live: boolean;
}

interface Bit {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  spin: number;
  age: number;
  life: number;
  live: boolean;
}

const hexOf = (c: string) => parseInt(c.slice(1), 16);
const lerpCol = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

registerKitScene(OVEN, (k: KitLive, wave0: number) => {
  const ADD = Phaser.BlendModes.ADD;
  const top = k.slot('fx');
  const layer = () => {
    const c = k.sc.add.container(0, 0);
    top.add(c);
    return c;
  };
  const starC = layer();
  const portalC = layer();
  const debrisC = layer();
  const shardC = layer();
  const emberC = layer();
  const flashC = layer();
  let kw = waveK(wave0);
  let shown = kw;

  // ——— the stars twinkling (in the void only: never over the oven or the floating things)
  const twKey = k.tex('ov_twinkle', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.15, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fillRect(0, 15.4, 32, 1.2);
    c.fillRect(15.4, 0, 1.2, 32);
  });
  const boxes = FLOATERS.map((f) => rotBox(f, 0)).concat([CHUNK_BOX, HUD_L, { x: 1700, y: 0, w: 220, h: 130 }]);
  const tw: { img: Phaser.GameObjects.Image; ph: number; sp: number; base: number }[] = [];
  const tr = rng(5150);
  for (let n = 0; n < 400 && tw.length < 34; n++) {
    const x = tr() * W;
    const y = tr() * 560;
    const sz = 0.22 + tr() * 0.3;
    const col = [0xffffff, 0xe8d8ff, 0xcfe8ff, 0xffe0c8][Math.floor(tr() * 4)];
    const overDome = Math.abs(x - VX) < domeHalf(y) + 24 && !(y < 150 && Math.abs(x - VX) < 150);
    if (overDome || boxes.some((b) => x > b.x - 10 && x < b.x + b.w + 10 && y > b.y - 10 && y < b.y + b.h + 10)) continue;
    tw.push({ img: k.img(twKey, x, y, { into: starC, add: true, scale: sz, tint: col, alpha: 0 }), ph: tr() * 10, sp: 0.5 + tr() * 1.8, base: 0.35 + tr() * 0.45 });
  }

  // ——— the portal: the painted vortex turning, its eye and its spill of light
  const VS = 224;
  const VN = 12;
  const vKey = sheet(k, 'ov_vortex', VS, VS, VN, (c, ph) => vortexPaint(c, VS / 2, VS / 2, VS / 2, ph));
  const vs = (VR * 2) / VS;
  const halo = k.glow(VC.x, VC.y + 20, 470, 0xb06bff, 0.16, { into: portalC, sy: 0.95 });
  const vort = new Loop(k, vKey, VN, VC.x, VC.y, { into: portalC, add: true, scale: vs, fps: 3, phase: 0 });
  const eye = k.glow(VC.x, VC.y, 70, 0xffffff, 0.3, { into: portalC });
  const flare = k.glow(VC.x, VC.y, 300, 0xe0c0ff, 0, { into: flashC });
  const ringKey = k.tex('ov_ring', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.12)');
    g.addColorStop(0.9, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  const ring = { img: k.img(ringKey, VC.x, VC.y, { into: flashC, add: true, alpha: 0, tint: 0xd8b8ff }), t: 9 };
  const pulse = new Spring(0, 26, 5);
  let vrot = 0;
  let surge = 0;
  let nextSurge = 3 + crand() * 3;
  let jitter = 0;
  // flares round the rim when it's unstable
  const rimFl = Array.from({ length: 3 }, () => ({ img: k.glow(0, 0, 80, 0xd8a8ff, 0, { into: flashC }), t: 9, a: 0 }));
  let nextRim = 2;

  // ——— the memories pouring out of the eye
  const SS = 48;
  const shardKey = sheet(k, 'ov_shard', SS, SS, 8, (c, _p, i) => shardFrame(c, SS, i));
  const shards: { img: Phaser.GameObjects.Image; r: number; th: number; age: number; life: number; spin: number; live: boolean }[] = [];
  let shardAcc = 0;
  const spawnShard = () => {
    let s = shards.find((q) => !q.live);
    if (!s) {
      if (shards.length > 24) return;
      s = { img: k.img(shardKey, 0, 0, { into: shardC, add: true, alpha: 0 }), r: 0, th: 0, age: 0, life: 1, spin: 0, live: false };
      shards.push(s);
    }
    s.img.setFrame(Math.floor(crand() * 8));
    s.r = 8 + crand() * 14;
    s.th = crand() * P2;
    s.age = 0;
    s.life = 2.6 + crand() * 1.6;
    s.spin = (crand() - 0.5) * 2;
    s.img.setRotation(crand() * P2);
    s.live = true;
  };

  // ——— embers from the dead fire, spiralling in
  const emberFrameKey = k.tex('ov_ember', 32, 16, (c) => {
    const g = c.createLinearGradient(0, 8, 32, 8);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(16, 8, 16, 3.5, 0, 0, P2);
    c.fill();
    const h = c.createRadialGradient(28, 8, 0, 28, 8, 4);
    h.addColorStop(0, 'rgba(255,255,255,1)');
    h.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = h;
    c.fillRect(22, 2, 10, 12);
  });
  const embers: Ember[] = [];
  const EMBER_COLS = [hexOf(ORANGE), 0xffc46a, hexOf(ORANGE), hexOf(MAGENTA), 0xffe0a0];
  const EYE_COL = 0xf0dcff;
  const spawnEmber = (pre = false) => {
    let e = embers.find((q) => !q.live);
    if (!e) {
      if (embers.length > 90) return;
      e = { img: k.img(emberFrameKey, 0, 0, { into: emberC, add: true, alpha: 0 }), r: 0, th: 0, age: 0, col: 0, s: 1, live: false };
      embers.push(e);
    }
    e.r = pre ? 80 + crand() * 600 : 460 + crand() * 300;
    e.th = crand() * P2;
    // (from above the table only)
    if (VC.y + Math.sin(e.th) * e.r > TY - 20) e.th = -e.th;
    e.age = pre ? 2 : 0;
    e.col = EMBER_COLS[Math.floor(crand() * EMBER_COLS.length)];
    e.s = 0.55 + crand() * 0.5;
    e.live = true;
  };
  for (let i = 0; i < 30; i++) spawnEmber(true);

  // ——— the floating things: drifting, turning, jolted by a stomp
  const fl = FLOATERS.map((f, i) => ({
    f,
    img: k.pivot(k.sprite(f.id), f.x, f.y),
    px: new Spring(0, 1.4, 1.0),
    py: new Spring(0, 1.4, 1.0),
    pa: new Spring(0, 1.2, 0.8),
    seed: i * 2.3 + 0.7,
  }));
  const chunkImg = k.pivot(k.sprite('chunk'), CHUNK_C[0], CHUNK_C[1]);
  const chunkS = { px: new Spring(0, 1.4, 1), py: new Spring(0, 1.4, 1), pa: new Spring(0, 1.2, 0.8) };
  // the light in the gap under it, growing as it lifts away
  const gapGlow = k.glow(FRACTURE[Math.floor(FRACTURE.length / 2)][0], FRACTURE[Math.floor(FRACTURE.length / 2)][1] - 20, 120, 0xc890ff, 0, { into: starC, sy: 0.6 });

  // ——— the cracks glowing
  const cracks = k.sprite('crackGlow').setBlendMode(ADD);
  // the portal's light filling the kitchen as it grows (under the live bits, over the painted scene)
  const lightUp = k.wash(0x6a30b0, 0, ADD, starC);

  // ——— bricks calving off the crown, tiles off the floor, drifting away into space, turning
  const BW = 48;
  const brickKey = sheet(k, 'ov_brick', BW, BW, 6, (c, _p, i) => brickBit(c, BW / 2, BW / 2, 34, 22, i));
  const tileKey = sheet(k, 'ov_tile', BW, BW, 6, (c, _p, i) => tileBit(c, BW / 2, BW / 2, 40, i));
  const bricksL: Bit[] = [];
  const tilesL: Bit[] = [];
  const mkBit = (key: string, list: Bit[]): Bit => {
    let b = list.find((q) => !q.live);
    if (!b) {
      b = { img: k.img(key, 0, 0, { into: debrisC }), x: 0, y: 0, vx: 0, vy: 0, a: 0, spin: 0, age: 0, life: 30, live: false };
      list.push(b);
    }
    b.live = true;
    b.age = 0;
    return b;
  };
  // the bricks hanging over the crown at the start: where the still paints them
  for (const c of CROWN) {
    const b = mkBit(brickKey, bricksL);
    b.img.setFrame(c.i % 6).setScale(c.w / 34);
    b.x = c.x;
    b.y = c.y;
    const dx = c.x - VX;
    const dy = c.y - 240;
    const l = Math.hypot(dx, dy) || 1;
    const sp = 3 + hash(c.i, 1) * 6;
    b.vx = (dx / l) * sp;
    b.vy = (dy / l) * sp - 2;
    b.a = c.a;
    b.spin = (hash(c.i, 2) - 0.5) * 0.4;
    b.age = 3;
    b.life = 40 + hash(c.i, 3) * 30;
  }
  for (const t of TILES0) {
    const b = mkBit(tileKey, tilesL);
    b.img.setFrame(t.i % 6).setScale(t.s / 40);
    b.x = t.x;
    b.y = t.y;
    b.vx = (t.x < VX ? -1 : 1) * (2 + hash(t.i, 4) * 4);
    b.vy = -3 - hash(t.i, 5) * 5;
    b.a = t.a;
    b.spin = (hash(t.i, 6) - 0.5) * 0.5;
    b.age = 3;
    b.life = 40;
  }
  const calveBrick = (kick = 0) => {
    const b = mkBit(brickKey, bricksL);
    if (bricksL.filter((q) => q.live).length > 34) {
      b.live = false;
      return;
    }
    b.img.setFrame(Math.floor(crand() * 6)).setScale(0.6 + crand() * 0.5);
    // from a broken end of the arch or the dome's broken edge
    const roll = crand();
    let x: number;
    let y: number;
    if (roll < 0.5) {
      const th = roll < 0.25 ? GAP_OUT[0] - 0.02 + crand() * 0.06 : GAP_OUT[1] - 0.04 + crand() * 0.06;
      [x, y] = archPt(th, AX - 20, AY - 20);
    } else {
      const e = roll < 0.75 ? BREAK_L : BREAK_R;
      [x, y] = e[Math.floor(crand() * e.length)];
    }
    b.x = x;
    b.y = y;
    const dx = x - VX;
    const dy = y - 300;
    const l = Math.hypot(dx, dy) || 1;
    const sp = 4 + crand() * 8 + kick;
    b.vx = (dx / l) * sp;
    b.vy = (dy / l) * sp - 3 - kick * 0.4;
    b.a = crand() * P2;
    b.spin = (crand() - 0.5) * (0.5 + kick * 0.05);
    b.life = 26 + crand() * 20;
  };
  const calveTile = (kick = 0) => {
    if (!EDGE_TILES.length) return;
    const b = mkBit(tileKey, tilesL);
    if (tilesL.filter((q) => q.live).length > 18) {
      b.live = false;
      return;
    }
    const t = EDGE_TILES[Math.floor(crand() * EDGE_TILES.length)];
    b.img.setFrame(Math.floor(crand() * 6)).setScale(t.s * 1.2);
    b.x = t.x;
    b.y = t.y;
    b.vx = t.side * (3 + crand() * 6 + kick * 0.5);
    b.vy = -4 - crand() * 7 - kick;
    b.a = crand() * 0.6 - 0.3;
    b.spin = (crand() - 0.5) * 0.5;
    b.life = 24 + crand() * 16;
  };
  let brickT = 2;
  let tileT = 4;

  const setRates = () => ({
    embers: lerp(30, 90, shown),
    shards: lerp(1.2, 4, shown),
    brickEvery: lerp(6, 0.8, shown),
    tileEvery: lerp(10, 1.6, shown),
  });

  return {
    setWave(w) {
      kw = waveK(w);
    },
    impact(x, y, p) {
      if (p <= 0.02) return;
      pulse.v += 2.2 + p * 3;
      ring.t = 0;
      for (const f of fl) {
        const dx = f.f.x - x;
        const dy = f.f.y - y;
        const d = Math.hypot(dx, dy) || 1;
        const push = (p * 46) / (1 + d / 700);
        f.px.v += (dx / d) * push;
        f.py.v += (dy / d) * push - p * 8;
        f.pa.v += (crand() - 0.5) * p * 0.9;
      }
      chunkS.py.v -= p * 14;
      chunkS.pa.v += (crand() - 0.5) * p * 0.4;
      for (let i = 0; i < 1 + p * 3; i++) calveBrick(10 + p * 18);
      if (p > 0.3) calveTile(6 + p * 10);
      for (const b of [...bricksL, ...tilesL]) {
        if (!b.live) continue;
        const dx = b.x - x;
        const dy = b.y - y;
        const d = Math.hypot(dx, dy) || 1;
        const push = (p * 30) / (1 + d / 500);
        b.vx += (dx / d) * push;
        b.vy += (dy / d) * push;
        b.spin += (crand() - 0.5) * p * 1.5;
      }
    },
    update(dt, t) {
      const cm = calm();
      const flashes = save.settings.flashes && !save.settings.reducedMotion;
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      const R = setRates();
      // ——— the stars
      for (const s of tw) {
        const g = Math.sin(t * 0.31 * s.sp + s.ph * 3);
        const glint = g > 0.97 ? (g - 0.97) / 0.03 : 0;
        s.img.setAlpha(s.base * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) + glint * 0.8);
      }
      // ——— the portal
      const pu = pulse.step(0, dt);
      nextSurge -= dt;
      if (shown > 0.35 && nextSurge < 0) {
        surge = 1;
        jitter = 0.25;
        nextSurge = lerp(7, 2.2, shown) + crand() * 3;
      }
      surge = Math.max(0, surge - dt * 1.6);
      jitter = Math.max(0, jitter - dt);
      const unstable = clamp01((shown - 0.3) / 0.7);
      const bright = lerp(0.82, 1, shown) * (1 - unstable * 0.12 * (0.5 + 0.5 * Math.sin(t * 7.3) * Math.sin(t * 3.1))) + surge * 0.25;
      vrot += dt * (0.08 + 0.12 * shown + surge * 0.3) * cm;
      vort.alpha = Math.min(1, bright);
      vort.step(dt * cm, 1 + shown * 0.7 + surge);
      const sc = vs * (1 + shown * 0.08 + pu * 0.05 + surge * 0.03 + Math.sin(t * 1.3) * 0.01 * cm);
      lightUp.setAlpha(shown * 0.1 + surge * 0.05 + pu * 0.03);
      const jx = jitter > 0 && flashes ? (crand() - 0.5) * 10 * unstable : 0;
      vort.each((im) => im.setRotation(vrot).setScale(sc).setPosition(VC.x + jx, VC.y));
      eye.setAlpha(clamp01((0.2 + shown * 0.25 + pu * 0.3 + surge * 0.3) * (0.9 + 0.1 * Math.sin(t * 5))));
      eye.setScale(((60 + shown * 80 + pu * 30) * 2) / 256);
      halo.setAlpha(0.18 + shown * 0.22 + pu * 0.08 + surge * 0.1);
      flare.setAlpha(flashes ? clamp01(pu * 0.25 + surge * 0.22) : clamp01(pu * 0.1));
      if (ring.t < 1.2) {
        ring.t += dt;
        const u = ring.t / 1.2;
        ring.img.setScale(((VR * 2) / 128) * (0.4 + u * 1.2)).setAlpha((1 - u) ** 2 * (flashes ? 0.55 : 0.25));
      }
      // flares round the rim from the third wave
      nextRim -= dt;
      if (unstable > 0 && nextRim < 0) {
        const f = rimFl.find((q) => q.t > 0.6);
        if (f) {
          const th = Math.PI + crand() * Math.PI;
          const [x, y] = archPt(th, P.rx - 10, P.ry - 10);
          f.img.setPosition(x, y);
          f.t = 0;
          f.a = (0.35 + crand() * 0.4) * unstable;
        }
        nextRim = lerp(3, 0.5, unstable) + crand();
      }
      for (const f of rimFl) {
        if (f.t > 0.6) continue;
        f.t += dt;
        const u = f.t / 0.6;
        f.img.setAlpha(f.a * Math.sin(Math.min(1, u) * Math.PI) * (flashes ? 1 : 0.4));
      }
      // ——— memories pouring out
      shardAcc += dt * R.shards * cm;
      while (shardAcc > 1) {
        shardAcc -= 1;
        spawnShard();
      }
      for (const s of shards) {
        if (!s.live) continue;
        s.age += dt;
        const u = s.age / s.life;
        if (u >= 1) {
          s.live = false;
          s.img.setAlpha(0);
          continue;
        }
        s.r += dt * (40 + s.r * 0.9) * cm;
        s.th += dt * (1.6 / (1 + s.r / 80)) * cm;
        const x = VC.x + Math.cos(s.th) * s.r;
        const y = VC.y + Math.sin(s.th) * s.r * 0.95;
        const fade = clamp01(1 - (s.r - 200) / 110);
        s.img.setPosition(x, y).setScale(0.34 + clamp01(s.r / 240) * 1.3).setRotation(s.img.rotation + s.spin * dt);
        s.img.setAlpha(clamp01(s.age / 0.4) * fade * 0.85);
        if (fade <= 0) {
          s.live = false;
          s.img.setAlpha(0);
        }
      }
      // ——— embers
      const live = embers.filter((e) => e.live).length;
      if (live < R.embers && crand() < dt * 12) spawnEmber();
      for (const e of embers) {
        if (!e.live) continue;
        e.age += dt;
        const sp = (1 + shown * 0.5 + surge) * cm;
        const x0 = VC.x + Math.cos(e.th) * e.r;
        const y0 = VC.y + Math.sin(e.th) * e.r * 0.95;
        e.th += dt * (70 / Math.max(36, e.r)) * sp;
        e.r -= dt * (18 + 9000 / (e.r + 50)) * sp;
        if (e.r < 22) {
          e.live = false;
          e.img.setAlpha(0);
          continue;
        }
        const x = VC.x + Math.cos(e.th) * e.r;
        const y = VC.y + Math.sin(e.th) * e.r * 0.95;
        const v = Math.hypot(x - x0, y - y0) / Math.max(dt, 1e-3);
        const near = clamp01(1 - (e.r - 40) / 220);
        e.img.setPosition(x, y).setRotation(Math.atan2(y - y0, x - x0));
        e.img.setScale(e.s * (0.5 + Math.min(1.8, v / 160)) * (1 - near * 0.4), e.s * (1 - near * 0.5));
        e.img.setTint(lerpCol(e.col, EYE_COL, near));
        e.img.setAlpha(clamp01(e.age / 0.8) * (0.85 - near * 0.3) * clamp01(e.r / 60));
      }
      // ——— the floating things
      for (const f of fl) {
        const ox = f.px.step(0, dt);
        const oy = f.py.step(0, dt);
        const oa = f.pa.step(0, dt);
        const away = shown;
        const bx = wander(t * 0.18, f.seed) * f.f.bob * 0.6 * cm;
        const by = wander(t * 0.22, f.seed + 4) * f.f.bob * cm;
        f.img.setPosition(f.f.x + bx + ox + f.f.away[0] * away, f.f.y + by + oy + f.f.away[1] * away);
        f.img.setRotation(wander(t * 0.15, f.seed + 9) * f.f.turn * cm + oa + away * f.f.turn * 0.8);
      }
      {
        const ox = chunkS.px.step(0, dt);
        const oy = chunkS.py.step(0, dt);
        const oa = chunkS.pa.step(0, dt);
        // loosening on the second wave, gone off into the void by the third, the stars through its hole
        const lift = clamp01((shown - 0.3) / 0.55) ** 1.2;
        const loose = clamp01(shown / 0.33) * (1 - lift);
        chunkImg.setPosition(CHUNK_C[0] + lift * 120 + ox + (wander(t * 0.2, 3) * 3 * lift + wander(t * 3, 3) * loose * 1.5) * cm, CHUNK_C[1] - lift * 130 + oy + wander(t * 0.25, 5) * 4 * lift * cm);
        chunkImg.setRotation(lift * 0.45 + oa + (wander(t * 0.17, 8) * 0.03 * lift + wander(t * 2.6, 2) * 0.006 * loose) * cm);
        gapGlow.setAlpha((0.1 + Math.max(loose, lift) * 0.45) * (0.85 + 0.15 * flicker(t * 0.5, 2)));
      }
      // ——— the cracks
      cracks.setAlpha(clamp01((shown - 0.12) / 0.6) * 0.85 * (0.8 + 0.2 * flicker(t * 0.6, 1)) + surge * 0.2 * unstable);
      // ——— debris
      brickT -= dt * cm;
      if (brickT < 0) {
        calveBrick();
        brickT = R.brickEvery * (0.6 + crand() * 0.8);
      }
      tileT -= dt * cm;
      if (tileT < 0) {
        calveTile();
        tileT = R.tileEvery * (0.6 + crand() * 0.8);
      }
      for (const b of [...bricksL, ...tilesL]) {
        if (!b.live) continue;
        b.age += dt;
        // a little drag on anything a stomp flung, down to the slow drift of the void
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 14) {
          const k2 = Math.max(0, 1 - dt * 0.8);
          b.vx *= k2;
          b.vy *= k2;
        }
        b.x += b.vx * dt * cm;
        b.y += b.vy * dt * cm;
        b.a += b.spin * dt * cm;
        const out = b.y < -60 || b.x < -60 || b.x > W + 60 || b.age > b.life;
        const a = clamp01(b.age / 1.2) * clamp01((b.life - b.age) / 3);
        b.img.setPosition(b.x, b.y).setRotation(b.a).setAlpha(a);
        if (out) {
          b.live = false;
          b.img.setAlpha(0);
        }
      }
    },
  };
});
