// The Skate Bowl (the Queen of the Rink's arena, wave 50), redrawn with the location kit (src/art/scene): the Roller
// Rink's back hall after the last skate, staged for the showdown. The same building as scene-rink.ts (the black roof
// and steel truss with its high-bays, moving heads, blacklight tubes and the mirror ball; the painted purple cinder
// block and its sunset-stripe livery), but here the floor drops away into the Queen's own bowl: a wooden bowl of
// maple staves, D-shaped, its straight side the steel coping at our feet (the table is the near deck), its far wall
// curving up from a flat bottom (her gold-and-pink crown painted on it) to a steel coping that sweeps round the room,
// the livery's stripes painted along under it. On the far deck: a roller-hockey goal with its sticks and a bucket of
// pucks under the SKATE BOWL marquee (purple, a gold crown on top, a bulb border), the DJ booth on the right (the same
// DJ, the letterboard reading QUEEN'S SKATE), the Queen's purple pennants hanging from the truss. The house lights
// are down: the moving heads' beams cross the bowl through the fog lying in it, the blacklight is on, the ball throws
// its specks. On the near deck: her whistle on its lanyard and a couple of pucks at the left, a rental skate at the
// right.
//
// Live, the heroes:
// - the bowl rider: the rink's speed skater carving the bowl (painted frames of her pumping through the transitions:
//   compressing low into each wall, extending up it, a stall at the lip with her arms flung out before she pivots
//   and drops back in), leaning with the wall, her contact shadow on the maple and a rim of the spots' pink; the kid
//   in his helmet sits on the coping at the left with his skates dangling, kicking his heels and pumping his fist
//   (painted frames); a stomp makes her wobble and him jump;
// - the bowl's air: the fog pooled in the bottom, rolling and sloshing after her as she passes; the beams sweeping
//   through it and their spots crossing the bowl, a strobe hit and a puff of fog on a stomp;
// - the room: the mirror ball turning (painted frames) and swinging on its chain, its specks sweeping the wall and
//   the bowl; the pennants swinging; the marquee's bulbs chasing; the DJ nodding (startled when the record skips);
//   the pucks hopping and the skate rolling on the deck when it's hit.

import Phaser from 'phaser';
import { ROUND } from '../../art/backdrops';
import { ZB, zAt } from '../../art/backdrops';
import {
  type Ctx,
  type R,
  H,
  HY,
  TY,
  VX,
  W,
  calmLanes,
  castShadow,
  crevice,
  glowAt,
  gradeAll,
  groundShadow,
  lightPool,
  polyPath,
  rectPath,
  rim,
  rrPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, planeQuad, tableFalloff, tableSeam } from '../../art/scene/materials';
import { drift, grime, lay, noiseMask, surface } from '../../art/scene/paint';
import { drape, hang } from '../../art/scene/props';
import { makeCanvas, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Parts, Spring, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, registerKitScene, wander } from '../../game/sceneLive';
import {
  type Build,
  type Look,
  type Pose,
  type Pt,
  BALL_F,
  BUILDS,
  DJ,
  INK,
  LOOKS,
  MAPLE,
  MURAL,
  P2,
  RK,
  SK,
  UV,
  along,
  ballChain,
  ballFrame,
  blocks,
  booth,
  bulbAt,
  carpet,
  djFrame,
  fogFrame,
  fy,
  fz,
  highBay,
  ik,
  joints,
  meters,
  muralStripes,
  roofDeck,
  skateProp,
  skaterFrame,
  specksTile,
  truss,
  uvFixture,
} from './scene-rink';

// ——— layout ———

export const SB = {
  /** The wall's foot, where the far deck starts (the rink's, so its booth and wall fit as they are). */
  wallFoot: RK.wallFoot,
  /** The bowl's rim (the coping) seen as an ellipse: its far point at y = cy − ry; it sweeps round to the screen's
   * edges and on under the near deck. */
  rimE: { cx: 960, cy: 830, rx: 1120, ry: 352 },
  /** The bowl's flat bottom's outline (inside the transitions). */
  floorE: { cx: 960, cy: 880, rx: 800, ry: 236 },
  /** The near deck's front edge (the table's). */
  front: 1040,
  marquee: { x: 290, y: 176, w: 430, h: 96 },
  goal: { x: 262, y: 506 },
  pennants: [640, 1280] as const,
  /** The rider's wheels on the bottom of the bowl at its middle, and how far she carves each way. */
  bottomY: 718,
  reach: 660,
  /** The kid on the coping. */
  kid: { x: 560 },
};

const RE = SB.rimE;
const FE = SB.floorE;
const ellY = (e: typeof RE, x: number) => e.cy - e.ry * Math.sqrt(Math.max(0, 1 - ((x - e.cx) / e.rx) ** 2));
/** The coping's y at screen x. */
export const rimY = (x: number) => ellY(RE, x);
/** The top of the bowl's flat bottom at x (below the table's edge at the sides). */
const floorY = (x: number) => ellY(FE, x);
/** The ellipse t of the way down the far wall (0 the coping, 1 the bottom's outline). */
const wallE = (t: number) => ({ cx: 960, cy: RE.cy + (FE.cy - RE.cy) * t, rx: RE.rx + (FE.rx - RE.rx) * t, ry: RE.ry + (FE.ry - RE.ry) * t });
/** The upper half of an ellipse from x0 to x1 as points. */
function arcPts(e: typeof RE, x0: number, x1: number, step = 12): Pt[] {
  const pts: Pt[] = [];
  const a = Math.max(x0, e.cx - e.rx);
  const b = Math.min(x1, e.cx + e.rx);
  for (let x = a; x < b; x += step) pts.push([x, ellY(e, x)]);
  pts.push([b, ellY(e, b)]);
  return pts;
}
function trace(c: Ctx, pts: Pt[], move = true): void {
  pts.forEach(([x, y], i) => (i === 0 && move ? c.moveTo(x, y) : c.lineTo(x, y)));
}
/** The bowl's inside (under the coping, above the near deck's edge). */
const bowlPath = (c: Ctx) => {
  c.beginPath();
  trace(c, arcPts(RE, -10, W + 10));
  c.lineTo(W + 10, TY);
  c.lineTo(-10, TY);
  c.closePath();
};
/** The bottom (inside its outline, above the near deck's edge). */
const bottomPath = (c: Ctx) => {
  c.beginPath();
  trace(c, arcPts(FE, -10, W + 10, 10));
  c.lineTo(FE.cx + FE.rx, TY + 2);
  c.lineTo(FE.cx - FE.rx, TY + 2);
  c.closePath();
};
/** Perspective scale of a figure standing at screen y (1 on the rink's near lane). */
const depthK = (y: number) => (y - HY) / (RK.nearY - HY);

// ——— maple in perspective ———

/** Maple strip in rows across, narrower with distance, each board its own colour, joints staggered. */
function mapleRows(ctx: Ctx, r: R, y0: number, y1: number, rows: number, tone = 0): void {
  const z0 = fz(y0);
  const z1 = fz(y1);
  for (let i = 0; i < rows; i++) {
    const za = z0 + ((z1 - z0) * i) / rows;
    const zb = z0 + ((z1 - z0) * (i + 1)) / rows;
    const ya = fy(za);
    const yb = fy(zb);
    const k = ya - HY;
    let X = -1200 / k - r() * 0.5;
    while (X < 1200 / k) {
      const len = 0.25 + r() * 0.55;
      const xa = VX + X * k;
      const xb = VX + (X + len) * k;
      ctx.fillStyle = shade(MAPLE[Math.floor(r() * MAPLE.length)], tone + (r() - 0.5) * 0.08);
      ctx.fillRect(xa, ya, xb - xa + 0.6, yb - ya + 0.6);
      ctx.fillStyle = 'rgba(40,16,4,0.3)';
      ctx.fillRect(xb - 0.5, ya, 1, yb - ya);
      X += len;
    }
    ctx.fillStyle = 'rgba(46,18,6,0.28)';
    ctx.fillRect(0, yb - 0.4, W, Math.max(0.6, (yb - ya) * 0.12));
  }
}

// ——— the wall ———

/** The crown painted on the block over the bowl, in the livery's colours (its own stripes running through it). */
function crownPath(c: Ctx, x: number, y: number, s: number): void {
  c.beginPath();
  c.moveTo(x - 1.1 * s, y + 0.5 * s);
  c.lineTo(x - 1.25 * s, y - 0.55 * s);
  c.lineTo(x - 0.62 * s, y - 0.05 * s);
  c.lineTo(x - 0.32 * s, y - 0.8 * s);
  c.lineTo(x, y - 0.12 * s);
  c.lineTo(x + 0.32 * s, y - 0.8 * s);
  c.lineTo(x + 0.62 * s, y - 0.05 * s);
  c.lineTo(x + 1.25 * s, y - 0.55 * s);
  c.lineTo(x + 1.1 * s, y + 0.5 * s);
  c.closePath();
}

function wall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: RK.roof - 2, w: W, h: SB.wallFoot - RK.roof + 6 };
  blocks(ctx, r, box);
  surface(ctx, r, box, '#3a2a5e', { over: true, vary: 0.45, cells: 5, mottle: 0.3, strokes: 0.12, strokeAng: Math.PI / 2, grain: 0.08, warm: '#5e4486', cool: '#161232', seed: 141 });
  // the livery: the sunset stripes sweeping along the wall, as in the rink, the joints showing through
  ctx.save();
  ctx.globalAlpha = 0.55;
  muralStripes(ctx, false);
  ctx.restore();
  // her crown painted big over the bowl: gold, a pink band, the stripes' colours in its points
  ctx.save();
  ctx.globalAlpha = 0.3;
  crownPath(ctx, 960, 272, 118);
  ctx.fillStyle = '#c89a2a';
  ctx.fill();
  ctx.clip();
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = MURAL[i];
    ctx.globalAlpha = 0.35;
    ctx.fillRect(800, 180 + i * 18, 320, 9);
  }
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#b02a74';
  ctx.fillRect(800, 302, 320, 22);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#f0d070';
  ctx.lineWidth = 3;
  crownPath(ctx, 960, 272, 118);
  ctx.stroke();
  ctx.restore();
  lay(ctx, noiseMask(14, 147, { cover: 0.3, soft: 0.2, col: '#2a1e44' }), { x: 0, y: 150, w: W, h: 260 }, 0.4);
  joints(ctx, box, 0.8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // the light: the room's down, so the block's lit only by what's in it (the marquee, the booth, the tubes above)
  const key = ctx.createLinearGradient(0, 0, W, SB.wallFoot);
  key.addColorStop(0, 'rgba(255,214,170,0.06)');
  key.addColorStop(0.5, 'rgba(8,6,20,0.12)');
  key.addColorStop(1, 'rgba(8,6,20,0.28)');
  ctx.fillStyle = key;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  vfill(ctx, 0, RK.roof - 2, W, SB.wallFoot - RK.roof + 6, [[0, 'rgba(6,4,14,0.55)'], [0.25, 'rgba(6,4,14,0.2)'], [0.7, 'rgba(6,4,14,0.2)'], [1, 'rgba(6,4,14,0.55)']]);
  // the blacklight tubes' violet down the top of the wall
  for (const x of RK.tubes) lightPool(ctx, x, RK.roof + 10, 260, 90, '#7a4ad8', 0.12);
  grime(ctx, box, { bottom: 50, top: 20, left: 40, right: 40, a: 0.4, patchy: 0.6, seed: 143, col: '#0c0818' });
  ctx.restore();
  crevice(ctx, 0, W, RK.roof - 2, 26, 0.55, '#05030a');
}

/** The blacklight on: the tubes lit, the livery and the crown fluorescing. */
function uvOn(ctx: Ctx): void {
  for (const x of RK.tubes) uvFixture(ctx, x, 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, RK.roof, W, SB.wallFoot - RK.roof);
  ctx.clip();
  ctx.globalAlpha = 0.7;
  muralStripes(ctx, true);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(UV[2], 0.05);
  ctx.lineWidth = 12;
  crownPath(ctx, 960, 272, 118);
  ctx.stroke();
  ctx.strokeStyle = rgba(UV[2], 0.14);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

// ——— the marquee: SKATE BOWL, a crown on top ———

const MQ = SB.marquee;
function marqueeBulbs(): Pt[] {
  const pts: Pt[] = [];
  const x0 = MQ.x - MQ.w / 2 + 9;
  const x1 = MQ.x + MQ.w / 2 - 9;
  const y0 = MQ.y - MQ.h / 2 + 9;
  const y1 = MQ.y + MQ.h / 2 - 9;
  const nx = Math.round((x1 - x0) / 23);
  const ny = Math.round((y1 - y0) / 23);
  for (let i = 0; i < nx; i++) pts.push([x0 + ((x1 - x0) * i) / nx, y0]);
  for (let i = 0; i < ny; i++) pts.push([x1, y0 + ((y1 - y0) * i) / ny]);
  for (let i = 0; i < nx; i++) pts.push([x1 - ((x1 - x0) * i) / nx, y1]);
  for (let i = 0; i < ny; i++) pts.push([x0, y1 - ((y1 - y0) * i) / ny]);
  return pts;
}
const BULBS = marqueeBulbs();
/** The crown's jewels (they light with the bulbs). */
const JEWELS: Pt[] = [[MQ.x - 44, MQ.y - MQ.h / 2 - 52], [MQ.x, MQ.y - MQ.h / 2 - 64], [MQ.x + 44, MQ.y - MQ.h / 2 - 52]];

function marquee(ctx: Ctx): void {
  const x0 = MQ.x - MQ.w / 2;
  const y0 = MQ.y - MQ.h / 2;
  const board = rrPath(x0, y0, MQ.w, MQ.h, 10);
  for (const bx of [x0 + 60, x0 + MQ.w - 60]) {
    solid(ctx, rectPath(bx - 5, y0 - 30, 10, 34), { x: bx - 5, y: y0 - 30, w: 10, h: 34 }, 'iron', '#3a3644', { depth: 0.15, line: 1.5, formSize: 3 });
  }
  // the crown cut-out on top: gold leaf on plywood, three jewels
  const cy = y0 - 4;
  const crown = polyPath([[MQ.x - 70, cy], [MQ.x - 78, cy - 46], [MQ.x - 44, cy - 22], [MQ.x - 22, cy - 56], [MQ.x, cy - 28], [MQ.x + 22, cy - 56], [MQ.x + 44, cy - 22], [MQ.x + 78, cy - 46], [MQ.x + 70, cy]]);
  castShadow(ctx, crown, 12, 14, 0.5, '#06040e');
  castShadow(ctx, board, 14, 16, 0.55, '#06040e');
  solid(ctx, crown, { x: MQ.x - 78, y: cy - 60, w: 156, h: 60 }, 'chrome', '#d8a838', { depth: 0.15, formSize: 14 });
  within(ctx, crown, () => {
    vfill(ctx, MQ.x - 80, cy - 60, 160, 60, [[0, 'rgba(255,240,180,0.3)'], [1, 'rgba(90,40,0,0.3)']]);
  });
  for (const [jx, jy] of JEWELS) bulbAt(ctx, jx, jy + 6, 0);
  solid(ctx, board, { x: x0, y: y0, w: MQ.w, h: MQ.h }, 'enamel', '#4a1a78', { depth: 0.15, formSize: 22 });
  const inner = rrPath(x0 + 18, y0 + 18, MQ.w - 36, MQ.h - 36, 5);
  solid(ctx, inner, { x: x0 + 18, y: y0 + 18, w: MQ.w - 36, h: MQ.h - 36 }, 'enamel', '#2e0e52', { depth: 0.15, line: 1.6, formSize: 8 });
  within(ctx, inner, () => {
    vfill(ctx, x0, y0 + 18, MQ.w, MQ.h - 36, [[0, 'rgba(255,170,230,0.12)'], [1, 'rgba(10,0,20,0.2)']]);
  });
  ctx.save();
  ctx.font = `bold 44px ${ROUND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tx = MQ.x;
  const ty = MQ.y + 2;
  ctx.fillStyle = 'rgba(10,0,20,0.55)';
  ctx.fillText('SKATE BOWL', tx + 3, ty + 4);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a0630';
  ctx.lineWidth = 5;
  ctx.strokeText('SKATE BOWL', tx, ty);
  const lg = ctx.createLinearGradient(0, ty - 22, 0, ty + 22);
  lg.addColorStop(0, '#fff6c8');
  lg.addColorStop(0.55, '#f0c860');
  lg.addColorStop(1, '#b07a28');
  ctx.fillStyle = lg;
  ctx.fillText('SKATE BOWL', tx, ty);
  ctx.restore();
  for (const [x, y] of BULBS) bulbAt(ctx, x, y, 0);
  rim(ctx, board, 0.3, 3);
}

function marqueeLit(ctx: Ctx): void {
  for (const [x, y] of [...BULBS, ...JEWELS.map(([x, y]) => [x, y + 6] as Pt)]) bulbAt(ctx, x, y, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of BULBS) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
    g.addColorStop(0, 'rgba(255,220,150,0.45)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 16, y - 16, 32, 32);
  }
  ctx.restore();
  lightPool(ctx, MQ.x, MQ.y + MQ.h / 2 + 30, 260, 50, '#ffc880', 0.1);
}

// ——— the far deck ———

function farDeck(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, SB.wallFoot);
  ctx.lineTo(W + 10, SB.wallFoot);
  trace(ctx, arcPts(RE, -10, W + 10).reverse(), false);
  ctx.closePath();
  ctx.clip();
  mapleRows(ctx, r, SB.wallFoot, rimY(0) + 4, 26, -0.06);
  grain(ctx, { x: 0, y: SB.wallFoot, w: W, h: 220 }, 'wood', 0.25, 1.3);
  lay(ctx, drift('#e8b070', '#5a2a18', 7, 181, 256, 40), { x: 0, y: SB.wallFoot, w: W, h: 220 }, 0.25);
  // the room's dark on it, the deck darkest along the wall's foot, the spots' spill catching the edge by the coping
  vfill(ctx, 0, SB.wallFoot, W, 220, [[0, 'rgba(14,6,24,0.75)'], [0.4, 'rgba(14,6,24,0.5)'], [1, 'rgba(14,6,24,0.35)']]);
  // wheel marks where skaters push off into the bowl
  for (let i = 0; i < 40; i++) {
    const x = r() * W;
    const y = SB.wallFoot + 10 + r() * (rimY(x) - SB.wallFoot - 10);
    ctx.strokeStyle = 'rgba(20,8,12,0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + r() * 50, 3 + r() * 4, 0, Math.PI * (1.1 + r() * 0.2), Math.PI * (1.6 + r() * 0.3));
    ctx.stroke();
  }
  ctx.restore();
  // the rubber cove base along the wall's foot, and the dark where wall and deck meet
  vfill(ctx, 0, SB.wallFoot - 9, W, 10, [[0, '#2a2030'], [0.3, '#16101c'], [1, '#0a060e']]);
  ctx.fillStyle = 'rgba(120,100,150,0.25)';
  ctx.fillRect(0, SB.wallFoot - 9, W, 1.2);
  crevice(ctx, 0, W, SB.wallFoot + 1, 14, 0.6, '#06040c');
}

// ——— the bowl ———

function bowl(ctx: Ctx, r: R): void {
  within(ctx, bowlPath, () => {
    // the staves: rows of maple running round the bowl, bunched near the lip where the wall stands up
    const N = 20;
    const tAt = (i: number) => (i / N) ** 0.85;
    for (let i = 0; i < N; i++) {
      const ea = wallE(tAt(i));
      const eb = wallE(tAt(i + 1));
      let x = -40 - r() * 80;
      while (x < W + 40) {
        const len = 90 + r() * 160;
        const pa = arcPts(ea, x, x + len, 14);
        const pb = arcPts(eb, x, x + len, 14).reverse();
        if (pa.length > 1 && pb.length > 1) {
          ctx.fillStyle = shade(MAPLE[Math.floor(r() * MAPLE.length)], -0.06 + (r() - 0.5) * 0.1);
          ctx.beginPath();
          trace(ctx, pa);
          trace(ctx, pb, false);
          ctx.closePath();
          ctx.fill();
          // the butt joint
          const [jx, jy] = pa[pa.length - 1];
          ctx.strokeStyle = 'rgba(40,16,4,0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(jx, jy);
          ctx.lineTo(pb[0][0], pb[0][1]);
          ctx.stroke();
        }
        x += len;
      }
      // the seam under each row (a dark line, its lower lip lit), and the row of screws along it
      const pts = arcPts(eb, -10, W + 10, 12);
      ctx.strokeStyle = 'rgba(36,14,6,0.45)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      trace(ctx, pts);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,170,0.12)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      trace(ctx, pts.map(([x, y]) => [x, y + 1.4] as Pt));
      ctx.stroke();
      if (i % 3 === 1) {
        for (let k = 0; k < pts.length; k += 5) {
          ctx.fillStyle = 'rgba(30,20,20,0.45)';
          ctx.fillRect(pts[k][0], pts[k][1] - 3, 1.6, 1.6);
        }
      }
    }
    const box = { x: 0, y: rimY(VX) - 4, w: W, h: TY - rimY(VX) + 6 };
    grain(ctx, box, 'wood', 0.25, 1.2);
    lay(ctx, drift('#e8b070', '#5a2a18', 7, 183, 256, 60), box, 0.22);
    // the light round the bowl: the wall stands up in shadow under the lip; the left wall, facing away from the key,
    // in shade; the right wall, turned to it, catching it
    // the wall's form: it stands up under the lip (facing us, the light from above only grazing it, the coping's
    // shadow along its top) and lies back into the bottom (turned up into the lights): darker the higher it stands
    for (let i = 0; i < N; i++) {
      const t0 = tAt(i);
      const t1 = tAt(i + 1);
      const tm = (t0 + t1) / 2;
      ctx.fillStyle = `rgba(16,6,26,${(0.75 * (1 - tm) ** 1.4).toFixed(3)})`;
      ctx.beginPath();
      trace(ctx, arcPts(wallE(t0), -10, W + 10, 12));
      trace(ctx, arcPts(wallE(t1), -10, W + 10, 12).reverse(), false);
      ctx.closePath();
      ctx.fill();
    }
    // the varnish's sheen along the curve, where the wall turns from standing to lying: the lights' long highlight
    for (const [t, a] of [[0.55, 0.1], [0.62, 0.07], [0.48, 0.05]] as [number, number][]) {
      ctx.strokeStyle = `rgba(255,214,230,${a})`;
      ctx.lineWidth = 7;
      ctx.beginPath();
      trace(ctx, arcPts(wallE(t), 260, 1660, 12));
      ctx.stroke();
    }
    const side = ctx.createLinearGradient(0, 0, W, 0);
    side.addColorStop(0, 'rgba(10,4,20,0.62)');
    side.addColorStop(0.3, 'rgba(10,4,20,0.3)');
    side.addColorStop(0.6, 'rgba(10,4,20,0.08)');
    side.addColorStop(1, 'rgba(10,4,20,0.12)');
    ctx.fillStyle = side;
    ctx.fillRect(0, box.y, W, box.h);
    // the right wall, turned to the key light, catches it
    ctx.globalCompositeOperation = 'lighter';
    lightPool(ctx, 1560, 640, 420, 110, '#ffd8a8', 0.1);
    ctx.globalCompositeOperation = 'source-over';
    // wheels: dark arcs worn along the transitions, thickest where everyone carves
    for (let i = 0; i < 90; i++) {
      const t = 0.25 + r() * 0.6;
      const e = wallE(t);
      const x0 = r() * W;
      const pts = arcPts(e, x0, x0 + 60 + r() * 220, 10);
      ctx.strokeStyle = `rgba(30,10,8,${0.06 + r() * 0.1})`;
      ctx.lineWidth = 0.8 + r() * 1.4;
      ctx.beginPath();
      trace(ctx, pts.map(([x, y]) => [x, y + (r() - 0.5) * 3] as Pt));
      ctx.stroke();
    }
  });
  // the livery painted along under the coping: the rink's five stripes following the lip round the bowl
  within(ctx, bowlPath, () => {
    for (let i = 0; i < 5; i++) {
      const e = wallE(0.05 + i * 0.024);
      ctx.strokeStyle = rgba(MURAL[i], 0.3);
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      trace(ctx, arcPts(e, -10, W + 10));
      ctx.stroke();
    }
    // chipped and worn off where wheels hit it at the lip
    lay(ctx, noiseMask(18, 187, { cover: 0.35, soft: 0.1, col: '#8a5a30' }), { x: 0, y: 470, w: W, h: 200 }, 0.45);
  });
}

function bottom(ctx: Ctx, r: R): void {
  within(ctx, bottomPath, () => {
    mapleRows(ctx, r, floorY(VX) - 2, TY + 2, 22, -0.04);
    const box = { x: 0, y: floorY(VX) - 2, w: W, h: TY - floorY(VX) + 4 };
    grain(ctx, box, 'wood', 0.25, 1.3);
    lay(ctx, drift('#e8b070', '#5a2a18', 7, 191, 256, 40), box, 0.25);
    // her crown painted on the bottom, in perspective: pink, a gold edge, worn through by wheels
    ctx.save();
    ctx.translate(VX, 714);
    ctx.scale(1, 0.26);
    ctx.globalAlpha = 0.5;
    crownPath(ctx, 0, 0, 130);
    ctx.fillStyle = '#c02a7a';
    ctx.fill();
    ctx.strokeStyle = '#e0b040';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#f0d070';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 300, 230, 0, 0, P2);
    ctx.stroke();
    ctx.restore();
    lay(ctx, noiseMask(16, 193, { cover: 0.4, soft: 0.15, col: '#a06a3a' }), { x: 600, y: 670, w: 720, h: 90 }, 0.5);
    // the bottom lies under the walls' rim of shade and is lit by the spots from above
    crevice(ctx, 0, W, floorY(VX) - 1, 14, 0.25, '#120614');
    vfill(ctx, 0, box.y, W, box.h, [[0, 'rgba(20,8,24,0.1)'], [1, 'rgba(20,8,24,0.35)']]);
    // the gloss: the room's lights in the varnish
    ctx.globalCompositeOperation = 'screen';
    for (const [x, col, a] of [[590, '#ff6ad0', 0.12], [1330, '#5ae8ff', 0.1], [960, '#d8c8ff', 0.04]] as [number, string, number][]) {
      const g = ctx.createLinearGradient(0, box.y, 0, TY);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 20, box.y);
      ctx.lineTo(x + 20, box.y);
      ctx.lineTo(x + 50, TY);
      ctx.lineTo(x - 50, TY);
      ctx.fill();
    }
  });
  // where the transition meets the bottom: a soft fold of shade
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, TY);
  ctx.clip();
  ctx.strokeStyle = 'rgba(16,6,20,0.32)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  trace(ctx, arcPts(FE, -10, W + 10, 10));
  ctx.stroke();
  ctx.restore();
  void r;
}

/** The far coping: a steel pipe round the lip, thicker as it sweeps towards us, lit along its top. */
function coping(ctx: Ctx): void {
  const pts = arcPts(RE, -10, W + 10, 8);
  const wAt = (y: number) => 6 + depthK(y) * 4;
  // a band along the lip between offsets a and b (in pipe widths, + down), filled
  const band = (a: number, b: number, fill: string | CanvasGradient) => {
    ctx.beginPath();
    trace(ctx, pts.map(([x, y]) => [x, y + wAt(y) * a] as Pt));
    trace(ctx, pts.map(([x, y]) => [x, y + wAt(y) * b] as Pt).reverse(), false);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  // its shadow on the wall under it, the ink round it, the steel, its lit top and the dark of its underside
  band(0.4, 2.6, 'rgba(8,4,12,0.5)');
  band(-1.3, -0.62, 'rgba(70,40,30,0.55)');
  band(-1.3, -1.1, 'rgba(255,220,180,0.25)');
  band(-0.62, 0.62, INK);
  band(-0.5, 0.5, '#4e5260');
  band(-0.5, -0.12, '#7a7e8e');
  band(0.2, 0.5, '#2a2c36');
  // the top's highlight (the spots and the tubes), worn bright where everyone grinds it at the left
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, W, 0);
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * W;
    g.addColorStop(i / 10, rgba('#eeeaff', 0.45 + 0.4 * Math.exp(-(((x - 520) / 300) ** 2)) + 0.2 * Math.exp(-(((x - 1330) / 260) ** 2))));
  }
  band(-0.36, -0.2, g);
  ctx.restore();
}

// ——— the props on the far deck ———

/** A roller-hockey goal on the deck by the wall: a red pipe frame, its net sagging back, sticks against the wall, a
 * bucket of pucks. */
function goal(ctx: Ctx, r: R): void {
  const { x, y } = SB.goal;
  const gw = 92;
  const gh = 56;
  const back = 22;
  // the bucket and the sticks first (behind it, against the wall)
  for (const [sx, lean, col] of [[x - 88, 0.22, '#d8c8a0'], [x - 74, 0.12, '#3a2a20'], [x + 82, -0.18, '#c8b088']] as [number, number, string][]) {
    const top: Pt = [sx + lean * 120, y - 128];
    const toe: Pt = [sx, y - 14];
    groundShadow(ctx, sx + 8, y - 12, 14, 3, 0.55, '#05020a');
    groundShadow(ctx, top[0] + 3, top[1] + 4, 4, 6, 0.5, '#05020a');
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(...top);
    ctx.lineTo(...toe);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.6;
    ctx.stroke();
    // the blade, taped black
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(...toe);
    ctx.lineTo(toe[0] + (lean > 0 ? 18 : -18), toe[1] + 4);
    ctx.stroke();
    ctx.strokeStyle = '#1a1a20';
    ctx.lineWidth = 4.5;
    ctx.stroke();
  }
  // its shadow on the deck and the wall
  groundShadow(ctx, x + 10, y + 2, gw * 0.62, 9, 0.6, '#05020a');
  // the net: white mesh sagging from the crossbar back to the base frame
  const net = polyPath([[x - gw / 2, y - gh], [x + gw / 2, y - gh], [x + gw / 2 - 6, y - back], [x - gw / 2 + 6, y - back]]);
  within(ctx, polyPath([[x - gw / 2, y - gh], [x + gw / 2, y - gh], [x + gw / 2, y], [x - gw / 2, y]]), () => {
    ctx.fillStyle = 'rgba(8,4,14,0.6)';
    ctx.fillRect(x - gw / 2, y - gh, gw, gh);
    ctx.strokeStyle = 'rgba(220,220,235,0.4)';
    ctx.lineWidth = 0.9;
    for (let i = -12; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 5, y - gh);
      ctx.quadraticCurveTo(x + i * 4.6, y - gh * 0.4, x + i * 4.2, y);
      ctx.stroke();
    }
    for (let j = 0; j < 12; j++) {
      const yy = y - gh + j * 5;
      ctx.beginPath();
      ctx.moveTo(x - gw / 2, yy);
      ctx.quadraticCurveTo(x, yy + 3, x + gw / 2, yy);
      ctx.stroke();
    }
  });
  void net;
  // the frame: posts and crossbar, red enamel pipe, the base running back
  const pipe = (pts: Pt[], w: number) => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = w + 2.4;
    ctx.beginPath();
    trace(ctx, pts);
    ctx.stroke();
    ctx.strokeStyle = '#b8202a';
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,190,0.6)';
    ctx.lineWidth = w * 0.3;
    ctx.beginPath();
    trace(ctx, pts.map(([px, py]) => [px - w * 0.2, py - w * 0.2] as Pt));
    ctx.stroke();
  };
  pipe([[x - gw / 2 + 8, y - 2], [x - gw / 2 + 14, y - back], [x + gw / 2 - 14, y - back], [x + gw / 2 - 8, y - 2]], 3);
  pipe([[x - gw / 2, y], [x - gw / 2, y - gh], [x + gw / 2, y - gh], [x + gw / 2, y]], 4.4);
  // a puck bucket at its side, pucks spilled round it
  const bx = x + gw / 2 + 30;
  groundShadow(ctx, bx + 6, y + 1, 20, 5, 0.6, '#05020a');
  const bucket = polyPath([[bx - 15, y - 30], [bx + 15, y - 30], [bx + 12, y], [bx - 12, y]]);
  solid(ctx, bucket, { x: bx - 15, y: y - 30, w: 30, h: 30 }, 'plastic', '#d8d0c0', { depth: 0.3, line: 1.4, formSize: 6 });
  ctx.fillStyle = '#1a1418';
  ctx.beginPath();
  ctx.ellipse(bx, y - 30, 15, 4, 0, 0, P2);
  ctx.fill();
  for (let i = 0; i < 4; i++) puck(ctx, bx - 8 + i * 5, y - 31 - (i % 2) * 2, 0.45, 0.3);
  for (const [dx, dy] of [[-30, 6], [26, 8], [-62, 10]] as Pt[]) {
    groundShadow(ctx, x + dx + 2, y + dy + 1, 6, 2, 0.5, '#05020a');
    puck(ctx, x + dx, y + dy, 0.5, 0.32);
  }
  void r;
}

/** A hockey puck: black rubber, its milled edge, a top face catching the light (scale s, tilt the face's squash). */
function puck(c: Ctx, x: number, y: number, s: number, tilt = 0.32): void {
  const rx = 17 * s;
  const ry = rx * tilt;
  const hh = 6 * s;
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(x, y + hh, rx + 1.2, ry + 1.2, 0, 0, Math.PI);
  c.lineTo(x - rx - 1.2, y);
  c.ellipse(x, y, rx + 1.2, ry + 1.2, 0, Math.PI, P2);
  c.lineTo(x + rx + 1.2, y + hh);
  c.fill();
  const g = c.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, '#3a3440');
  g.addColorStop(0.35, '#24202a');
  g.addColorStop(1, '#0c0a10');
  c.fillStyle = g;
  c.fillRect(x - rx, y, rx * 2, hh);
  c.beginPath();
  c.ellipse(x, y + hh, rx, ry, 0, 0, Math.PI);
  c.fill();
  // the knurled edge
  c.fillStyle = 'rgba(120,110,140,0.25)';
  for (let i = -rx + 2; i < rx - 1; i += 2.4 * s + 0.6) c.fillRect(x + i, y + hh * 0.3, 0.8, hh * 0.4);
  const tg = c.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
  tg.addColorStop(0, '#7a7488');
  tg.addColorStop(0.5, '#2a2630');
  tg.addColorStop(1, '#16121a');
  c.fillStyle = tg;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, P2);
  c.fill();
  // the rink's crown printed on it in gold
  c.fillStyle = 'rgba(230,180,60,0.7)';
  c.save();
  c.translate(x, y);
  c.scale(1, tilt);
  crownPath(c, 0, 0, rx * 0.45);
  c.fill();
  c.restore();
  c.strokeStyle = 'rgba(230,220,255,0.6)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.ellipse(x, y, rx - 1, ry - 0.6, 0, Math.PI * 1.0, Math.PI * 1.65);
  c.stroke();
}

// ——— the pennants hung from the truss ———

const PEN = { w: 86, h: 150, top: RK.chord + 10 };
/** One of her pennants (in its own box, hung from its top centre): purple velvet, a gold crown appliquéd on it,
 * a V-cut tail with a gold fringe, on a rod from two cords. */
function pennant(c: Ctx, x: number): void {
  const y0 = PEN.top + 26;
  const w = PEN.w;
  const h = PEN.h;
  hang(c, x - w / 2 + 6, y0, x, PEN.top, 2, '#c8a860', 1.4);
  hang(c, x + w / 2 - 6, y0, x, PEN.top, 2, '#c8a860', 1.4);
  const cloth = polyPath([[x - w / 2, y0], [x + w / 2, y0], [x + w / 2, y0 + h - 30], [x, y0 + h], [x - w / 2, y0 + h - 30]]);
  drape(c, cloth, { x: x - w / 2, y: y0, w, h }, '#5a1e8a', { fold: 18, depth: 0.45, phase: x * 0.01 });
  within(c, cloth, () => {
    // the gold band and the crown
    c.fillStyle = 'rgba(220,170,60,0.85)';
    c.fillRect(x - w / 2, y0 + 10, w, 5);
    crownPath(c, x, y0 + 64, 28);
    const g = c.createLinearGradient(x - 30, y0 + 40, x + 30, y0 + 80);
    g.addColorStop(0, '#fff0a8');
    g.addColorStop(0.5, '#d8a838');
    g.addColorStop(1, '#8a5a18');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 1.4;
    c.stroke();
    // the light: lit on its left, its right edge in shade
    const l = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    l.addColorStop(0, 'rgba(255,220,255,0.12)');
    l.addColorStop(0.5, 'rgba(0,0,0,0)');
    l.addColorStop(1, 'rgba(10,0,20,0.35)');
    c.fillStyle = l;
    c.fillRect(x - w / 2, y0, w, h);
  });
  // the gold fringe along the V
  c.strokeStyle = '#e0b040';
  c.lineWidth = 1.2;
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const px = x - w / 2 + w * t;
    const py = y0 + h - 30 + (1 - Math.abs(t - 0.5) * 2) * 30;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(px + 0.5, py + 7);
    c.stroke();
  }
  c.strokeStyle = INK;
  c.lineWidth = 1.6;
  cloth(c);
  c.stroke();
  // the rod
  solid(c, rrPath(x - w / 2 - 6, y0 - 3, w + 12, 6, 3), { x: x - w / 2 - 6, y: y0 - 3, w: w + 12, h: 6 }, 'chrome', '#c8a040', { depth: 0.2, line: 1.2, formSize: 2 });
}
const penBox = (x: number) => ({ x: x - PEN.w / 2 - 14, y: PEN.top - 4, w: PEN.w + 28, h: PEN.h + 46 });

// ——— the near deck (the table) ———

function deck(ctx: Ctx, r: R): void {
  const front = SB.front;
  const box = { x: 0, y: TY, w: W, h: front - TY + 4 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  mapleRows(ctx, r, TY, front + 4, 30, -0.1);
  grain(ctx, box, 'wood', 0.28, 1.4);
  lay(ctx, drift('#e0a868', '#4a2214', 7, 197, 256, 48), box, 0.3);
  // the deck's a darker, older varnish than the rink's floor, and the room's dark is on it
  vfill(ctx, 0, TY, W, front - TY, [[0, 'rgba(22,8,30,0.66)'], [0.5, 'rgba(22,8,30,0.55)'], [1, 'rgba(22,8,30,0.62)']]);
  // the spots' spill and the ball's light on it, and the lights mirrored in the varnish running towards us
  const zf = zAt(front + 4);
  for (const [x, col, a] of [[590, '#ff6ad0', 0.08], [1330, '#5ae8ff', 0.07], [MQ.x, '#ffc070', 0.07], [960, '#d8c8ff', 0.05]] as [number, string, number][]) {
    ctx.save();
    ctx.beginPath();
    planeQuad(ctx, (x - 960) / 460 - 0.2, (x - 960) / 460 + 0.2, ZB, zf);
    const g = ctx.createLinearGradient(0, TY, 0, front);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  // skid marks and wheel arcs where skaters pull up at the lip
  for (let i = 0; i < 14; i++) {
    const x = 80 + r() * 1760;
    const y = TY + 16 + r() * (front - TY - 60);
    ctx.strokeStyle = `rgba(20,6,10,${0.08 + r() * 0.1})`;
    ctx.lineWidth = 2 + r() * 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 60 + r() * 90, 8 + r() * 10, (r() - 0.5) * 0.2, Math.PI * (1.05 + r() * 0.3), Math.PI * (1.6 + r() * 0.3));
    ctx.stroke();
  }
  grain(ctx, box, 'speckle', 0.12, 1);
  ctx.restore();
  tableFalloff(ctx, front, 0.45, '#08040e');
  tableSeam(ctx, 0.55, '#0a0610', false);
  // the near coping: a steel pipe along the deck's back edge over the bowl, worn bright on top
  crevice(ctx, 0, W, TY + 8, 16, 0.5, '#06020a');
  vfill(ctx, 0, TY - 9, W, 15, [[0, INK], [0.08, '#c8ccd8'], [0.3, '#8a8e9c'], [0.6, '#3a3c48'], [0.9, '#1a1a24'], [1, INK]]);
  for (const [x, col, a] of [[590, '#ffb0e8', 0.5], [1330, '#b0f4ff', 0.45], [960, '#ffffff', 0.35], [MQ.x, '#ffe0b0', 0.3]] as [number, string, number][]) {
    const g = ctx.createLinearGradient(x - 220, 0, x + 220, 0);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 220, TY - 7, 440, 2.5);
  }
  // the brackets bolting it down
  for (let x = 140; x < W; x += 330) {
    ctx.fillStyle = '#2a2a34';
    ctx.fillRect(x - 6, TY + 4, 12, 6);
    ctx.fillStyle = 'rgba(200,200,220,0.4)';
    ctx.fillRect(x - 6, TY + 4, 12, 1);
  }
  // the chrome nosing on the deck's front, the cosmic carpet down its face (the rink's)
  vfill(ctx, 0, front - 2, W, 14, [[0, '#ffffff'], [0.2, '#c8ccd8'], [0.5, '#5a5e6a'], [0.75, '#2a2c34'], [1, '#8a8e9a']]);
  ctx.fillStyle = INK;
  ctx.fillRect(0, front + 12, W, 1.5);
  carpet(ctx, { x: 0, y: front + 13, w: W, h: H - front - 13 }, 60, 199, 0);
  carpet(ctx, { x: 0, y: front + 13, w: W, h: H - front - 13 }, 60, 199, 0.3);
  vfill(ctx, 0, front + 13, W, H - front - 13, [[0, 'rgba(6,2,10,0.55)'], [1, 'rgba(6,2,10,0.2)']]);
}

// ——— the props on the near deck ———

/** Her whistle on its lanyard, coiled on the deck, and two pucks. */
const WH = { x: 150, y: 872 };
function deckProps(ctx: Ctx): void {
  const { x, y } = WH;
  // the lanyard: a pink cord in loose loops, its shadow under it
  const loop: Pt[] = [];
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * P2 * 1.6 + 0.4;
    const rr = 46 - i * 0.25;
    loop.push([x - 30 + Math.cos(a) * rr * 1.25 + i * 0.9, y + 8 + Math.sin(a) * rr * 0.3]);
  }
  ctx.save();
  ctx.translate(4, 4);
  ctx.strokeStyle = 'rgba(6,2,10,0.45)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  trace(ctx, loop);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  trace(ctx, loop);
  ctx.stroke();
  ctx.strokeStyle = '#e8408a';
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,200,230,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  trace(ctx, loop.map(([px, py]) => [px - 0.6, py - 1] as Pt));
  ctx.stroke();
  // the whistle: chrome, its barrel and mouthpiece, the ring on the cord
  const wx = x + 30;
  const wy = y + 2;
  groundShadow(ctx, wx + 8, wy + 8, 26, 6, 0.6, '#05020a');
  const body = (g: Ctx) => {
    g.beginPath();
    g.ellipse(wx + 6, wy, 16, 11, 0, 0, P2);
    g.rect(wx - 26, wy - 9, 26, 10);
  };
  solid(ctx, body, { x: wx - 26, y: wy - 11, w: 48, h: 22 }, 'chrome', '#c8ccd8', { depth: 0.05, formSize: 8 });
  ctx.fillStyle = INK;
  ctx.fillRect(wx - 8, wy - 9, 7, 3);
  ctx.strokeStyle = '#a8acb8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(wx + 22, wy - 6, 4, 0, P2);
  ctx.stroke();
  glowAt(ctx, wx, wy - 6, 18, '#ffffff', 0.3);
  // two pucks, one face up, one leaning on the cord
  groundShadow(ctx, x + 78, y - 26, 24, 6, 0.6, '#05020a');
  puck(ctx, x + 70, y - 36, 1.1, 0.3);
  groundShadow(ctx, x - 92, y + 30, 22, 5, 0.55, '#05020a');
  puck(ctx, x - 96, y + 22, 1.05, 0.34);
}

/** The skate on the deck (the rink's rental skate). */
const SKT = { x: 1758, y: 852 };
const SKATE_BOX = { x: SKT.x - 82, y: SKT.y - 104, w: 176, h: 122 };

// ——— the beams, the fog (painted for the still: the live code moves its own) ———

const HEADS = RK.heads;
const BEAM_TO: Pt[] = [[700, 700], [1180, 690]];
const BEAM_COL = ['#ff5ad8', '#4ae8ff'];
function beamsStill(ctx: Ctx): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  HEADS.forEach((hx, i) => {
    const hy = RK.chord + 36;
    const [tx, ty] = BEAM_TO[i];
    const g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, rgba(BEAM_COL[i], 0.4));
    g.addColorStop(0.5, rgba(BEAM_COL[i], 0.16));
    g.addColorStop(1, rgba(BEAM_COL[i], 0.05));
    ctx.fillStyle = g;
    const ang = Math.atan2(ty - hy, tx - hx);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    ctx.beginPath();
    ctx.moveTo(hx + nx * 4, hy + ny * 4);
    ctx.lineTo(hx - nx * 4, hy - ny * 4);
    ctx.lineTo(tx - nx * 52, ty - ny * 52);
    ctx.lineTo(tx + nx * 52, ty + ny * 52);
    ctx.closePath();
    ctx.fill();
    glowAt(ctx, hx, hy, 24, '#ffffff', 0.7);
  });
  ctx.restore();
}
function spotsStill(ctx: Ctx): void {
  BEAM_TO.forEach(([x, y], i) => lightPool(ctx, x, y, 140, 30, BEAM_COL[i], 0.22));
}
function fogStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(480, 48);
  fogFrame(g, 480, 48, 0.3, 207);
  fadeSides(g, 480, 48);
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.drawImage(c, 960 - 900, TY - 168, 1800, 168);
  ctx.restore();
}
/** Thin a fog frame out towards its left and right ends (it lies in the bowl, not across the room). */
function fadeSides(g: Ctx, w: number, h: number): void {
  g.save();
  g.globalCompositeOperation = 'destination-in';
  const m = g.createLinearGradient(0, 0, w, 0);
  m.addColorStop(0, 'rgba(0,0,0,0)');
  m.addColorStop(0.22, 'rgba(0,0,0,0.85)');
  m.addColorStop(0.5, 'rgba(0,0,0,1)');
  m.addColorStop(0.78, 'rgba(0,0,0,0.85)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(0, 0, w, h);
  g.restore();
}

// ——— the ball (the rink's) ———

const BALL = RK.ball;
function ballStill(ctx: Ctx): void {
  ballChain(ctx, BALL.x, RK.chord + 18, BALL.y - BALL.r - 4);
  const [cv, g] = makeCanvas(BALL_F, BALL_F);
  ballFrame(g, 0);
  ctx.drawImage(cv, BALL.x - BALL_F / 2, BALL.y - BALL_F / 2);
  for (const [dx, dy, s] of [[-18, -20, 16], [14, 12, 10], [-6, 26, 8]] as [number, number, number][]) {
    glowAt(ctx, BALL.x + dx, BALL.y + dy, s * 1.6, '#ffffff', 0.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(BALL.x + dx - 0.8, BALL.y + dy - s * 0.5, 1.6, s);
    ctx.fillRect(BALL.x + dx - s * 0.5, BALL.y + dy - 0.8, s, 1.6);
  }
  glowAt(ctx, BALL.x, BALL.y, 140, '#c8b8ff', 0.12);
}

// ——— the figures: the bowl rider and the kid on the coping ———
//
// Both on the rink's rig (scene-rink.ts: tapered limbs lit across their form, its skates, heads and clothes), in
// poses of their own: the rider carving (both skates on the wall, one ahead of the other, compressing into the
// transition and extending up the wall; at the lip a stall with her front skate lifted and her arms flung out); the
// kid sitting on the coping, his skates hanging into the bowl, kicking his heels and pumping his fist.

const RIDER: [Build, Look] = [BUILDS.speed, LOOKS.speed];
const KID: [Build, Look] = [BUILDS.kid, LOOKS.kid];
/** The rider's frames: CN of the carve (compression 0 tall … 1 deep), then CS of the stall at the lip. */
const CN = 8;
const CS = 2;

/** The carve at compression q (0…1), or the stall (stall 1, 2). w2 swings the hair and clothes. */
function carvePose(q: number, b: Build, stall = 0): Pose {
  const w2 = q * Math.PI + stall * 1.3;
  const hipH = b.hip * (1 - 0.36 * q) + (stall ? 6 : 0);
  const hip: Pt = [-3 * q - (stall ? 4 : 0), -hipH];
  const lean = stall ? 0.1 : 0.22 + 0.58 * q;
  const sh = along(hip, Math.PI - lean, b.torso);
  const headC = along(sh, Math.PI - lean * 0.5 + (stall ? 0.15 : 0), b.head + 5);
  // the skates staggered: the front one ahead and turned up a touch into the wall, the back one under the hips
  const legAt = (fx: number, lift: number, tilt: number) => {
    const ankle: Pt = [fx, -16.5 - lift];
    return { ankle, knee: ik(hip, ankle, b.thigh, b.shin), tilt };
  };
  const near = stall === 0 ? legAt(14 + 6 * q, 0, -0.04) : legAt(18, 10 + stall * 4, -0.45 - stall * 0.1);
  const far = stall === 0 ? legAt(-12 - 4 * q, 0, 0.04) : legAt(-10, 0, 0.12);
  const arm = (a: number, bend: number) => {
    const el = along(sh, a, 20 * b.s);
    return { el, hand: along(el, a + bend, 18 * b.s) };
  };
  // arms out for balance: the leading arm reaching ahead and low, the trailing one back; flung up at the stall
  const nearArm = stall ? arm(2.3 + stall * 0.15, 0.25) : arm(1.35 - 0.5 * q, 0.45 + 0.35 * q);
  const farArm = stall ? arm(-2.15 - stall * 0.15, -0.3) : arm(-0.62 + 0.2 * q, -0.4 + 0.1 * q);
  return { hip, sh, headC, lean, near, far, nearArm, farArm, w2 };
}

/** How far up his frame the kid's hips sit (paint px over the frame's base line), so his legs hang inside it. */
const SIT_UP = 52;
/** The kid sitting on the coping (phase ph of his cheering loop): hips on the pipe at the frame's line, thighs
 * forward over the lip, shins and skates hanging and kicking, one hand on the pipe, a fist pumping. */
function sitPose(ph: number, b: Build): Pose {
  const w2 = ph * P2;
  const s = Math.sin(w2);
  const pump = 0.5 + 0.5 * Math.sin(w2 * 2);
  const hip: Pt = [0, -SIT_UP];
  const lean = -0.12 + 0.06 * Math.sin(w2 * 2);
  const sh = along(hip, Math.PI - lean, b.torso);
  const headC = along(sh, Math.PI - lean * 0.4 - 0.1 * Math.max(0, s), b.head + 5);
  const knee = (k: number): Pt => [hip[0] + b.thigh * 0.95, hip[1] + 6 + k];
  const leg = (sw: number, k: number) => {
    const kn = knee(k);
    const a = 0.25 + sw;
    const ankle: Pt = [kn[0] + Math.sin(a) * b.shin, kn[1] + Math.cos(a) * b.shin];
    return { ankle, knee: kn, tilt: 0.25 + sw * 0.6 };
  };
  const arm = (a: number, bend: number) => {
    const el = along(sh, a, 20 * b.s);
    return { el, hand: along(el, a + bend, 18 * b.s) };
  };
  return {
    hip,
    sh,
    headC,
    lean,
    // heels kicking in turn against the wall
    near: leg(0.35 * s, 0),
    far: leg(-0.35 * s, -1),
    // the far hand on the coping behind him, the near fist pumping over his head (twice a loop)
    farArm: arm(-0.6, 0.25),
    nearArm: arm(2.25 + 0.6 * pump, 0.75 - 0.45 * pump),
    w2,
  };
}

/** One rider frame (i < CN: the carve; then the stall), on the frame's wheels line, facing right. */
function riderFrame(c: Ctx, i: number): void {
  const [b, o] = RIDER;
  const P = i < CN ? carvePose(i / (CN - 1), b) : carvePose(0.1, b, i - CN + 1);
  skaterFrame(c, 0, b, o, 'speed', P);
}
function kidFrame(c: Ctx, ph: number): void {
  const [b, o] = KID;
  skaterFrame(c, ph, b, o, 'out', sitPose(ph, b));
}

/** The rider's path: s from −1 (the left wall's lip) through the bottom to 1 (the right's). */
function riderAt(s: number): { x: number; y: number; rot: number; k: number } {
  const x = VX + s * SB.reach;
  const a = Math.abs(s);
  const y = SB.bottomY + (rimY(x) + 34 - SB.bottomY) * a ** 2.1;
  // she leans with the wall, her head towards the bowl's middle
  const rot = -Math.sign(s) * 0.85 * a ** 2;
  return { x, y, rot, k: depthK(y) * 1.3 };
}
/** Her compression along the path (deep where the bottom turns into the wall, extended up it). */
const compressAt = (a: number) => Math.min(1, 0.3 + 0.7 * Math.exp(-(((a - 0.55) / 0.24) ** 2)));

/** A figure frame painted into the scene for the still, darkened to the room. */
function figure(ctx: Ctx, draw: (c: Ctx) => void, x: number, y: number, k: number, rot: number, flip: boolean): void {
  const [cv, g] = makeCanvas(SK.fw, SK.fh);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  draw(g);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(30,14,50,0.16)';
  g.fillRect(0, 0, SK.fw, SK.fh);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(flip ? -k : k, k);
  ctx.drawImage(cv, -SK.ox, -SK.base);
  ctx.restore();
}

/** The figures for the still: the rider coming down the right wall, the kid on the coping. */
const STILL_S = 0.6;
/** The kid drawn a touch over his depth (he sits on the near sweep of the lip). */
const KID_K = 1.25;
function figuresStill(ctx: Ctx): void {
  const p = riderAt(STILL_S);
  groundShadow(ctx, p.x + 8, p.y + 2, 30 * p.k, 6 * p.k, 0.55, '#120610');
  figure(ctx, (c) => riderFrame(c, Math.round(compressAt(Math.abs(STILL_S)) * (CN - 1))), p.x, p.y, p.k, p.rot, STILL_S > 0);
  kidStill(ctx);
}
function kidStill(ctx: Ctx): void {
  const x = SB.kid.x;
  const y = rimY(x);
  const k = depthK(y) * KID_K;
  groundShadow(ctx, x + 10 * k, y + 2, 20 * k, 4 * k, 0.6, '#06020a');
  groundShadow(ctx, x + 22 * k, y + 30 * k, 8 * k, 14 * k, 0.4, '#06020a');
  figure(ctx, (c) => kidFrame(c, 0.2), x, y + SIT_UP * k, k, 0, false);
}

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.03, '#c8a8ff', 0.06, { warm: '#ffc27a', cool: '#5a5ad0', a: 0.22 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#0c0818', 90, 650);
  vignetteAll(ctx, 0.6, '#05030a');
}

// ——— the stack ———

const MQ_BOX = { x: MQ.x - MQ.w / 2 - 24, y: MQ.y - MQ.h / 2 - 78, w: MQ.w + 60, h: MQ.h + 120 };
const BOOTH_BOX = { x: 1440 - 90, y: RK.board.y - RK.board.h / 2 - 8, w: 350 + 200, h: SB.wallFoot - RK.board.y + RK.board.h / 2 + 16 };
const BALL_BOX = { x: BALL.x - 80, y: RK.chord + 8, w: 160, h: BALL.y + BALL.r + 70 - RK.chord - 8 };
const GOAL_BOX = { x: SB.goal.x - 140, y: SB.goal.y - 140, w: 300, h: 162 };
/** Where the live figures, their shadows, the spots and the fog go (over the bowl, under the near deck). */
const BOWL_SLOT = { x: 0, y: 440, w: W, h: TY - 14 - 440 };

export const BOWL: SceneSpec = {
  id: 'rinkqueen',
  info: {
    name: 'Skate Bowl',
    subtitle: 'Boss: QUEEN OF THE RINK',
    ambient: [],
    glows: [
      { x: BALL.x, y: BALL.y, r: 200, color: '#c8a8ff', flicker: 0.2 },
      { x: MQ.x, y: MQ.y, r: 260, color: '#ffc070', flicker: 0.2 },
      { x: 960, y: 690, r: 300, color: '#ff5ad8', flicker: 0.2 },
    ],
    light: '#e0b8ff',
    tableTint: '#f0e6ff',
  },
  layers: [
    { id: 'roof', box: { x: 0, y: 0, w: W, h: RK.roof + 4 }, draw: (c) => roofDeck(c) },
    { id: 'wall', box: { x: 0, y: RK.roof - 4, w: W, h: SB.wallFoot - RK.roof + 12 }, draw: wall },
    { id: 'truss', box: { x: 0, y: 0, w: W, h: RK.lampY + 12 }, draw: truss },
    { id: 'uvOn', box: { x: 0, y: RK.chord - 20, w: W, h: SB.wallFoot - RK.chord + 20 }, draw: (c) => uvOn(c) },
    { id: 'marquee', box: MQ_BOX, draw: (c) => marquee(c) },
    { id: 'marqueeLit', box: MQ_BOX, stillOnly: true, draw: (c) => marqueeLit(c) },
    { id: 'booth', box: BOOTH_BOX, draw: (c, r) => booth(c, r, ["QUEEN'S SKATE", '#a01a7a']) },
    { id: 'dj', box: DJ.box, stillOnly: true, draw: (c) => (djFrame(c, 0.1), meters(c, 0.6)) },
    { id: 'farDeck', box: { x: 0, y: SB.wallFoot - 12, w: W, h: rimY(0) - SB.wallFoot + 24 }, draw: farDeck },
    { id: 'goal', box: GOAL_BOX, draw: goal },
    { id: 'bowl', box: { x: 0, y: rimY(VX) - 6, w: W, h: TY - rimY(VX) + 6 }, draw: bowl },
    { id: 'bottom', box: { x: 0, y: floorY(VX) - 8, w: W, h: TY - floorY(VX) + 10 }, draw: bottom },
    { id: 'coping', box: { x: 0, y: rimY(VX) - 12, w: W, h: rimY(0) - rimY(VX) + 30 }, draw: (c) => coping(c) },
    { id: 'spotsStill', box: { x: 400, y: 600, w: 1120, h: 160 }, stillOnly: true, draw: (c) => spotsStill(c) },
    { id: 'lampsDim', box: { x: 0, y: RK.chord, w: W, h: 80 }, draw: (c) => RK.lamps.forEach((x) => highBay(c, x, 0)) },
    // the rider, the kid, their shadows, the spots crossing the bowl and the fog in it
    { id: 'bowlLive', box: BOWL_SLOT, motion: 'slot', draw: () => {} },
    { id: 'figuresStill', box: BOWL_SLOT, stillOnly: true, draw: (c) => figuresStill(c) },
    { id: 'fogStill', box: { x: 0, y: TY - 180, w: W, h: 182 }, stillOnly: true, draw: (c) => fogStill(c) },
    { id: 'deck', box: { x: 0, y: TY - 12, w: W, h: H - TY + 12 }, draw: deck },
    { id: 'deckProps', box: { x: WH.x - 150, y: WH.y - 60, w: 330, h: 120 }, draw: (c) => deckProps(c) },
    { id: 'skate', box: SKATE_BOX, motion: 'sprite', draw: (c) => skateProp(c, SKT) },
    ...SB.pennants.map((x, i) => ({ id: `pennant${i}`, box: penBox(x), motion: 'sprite' as const, draw: (c: Ctx) => pennant(c, x) })),
    { id: 'ball', box: BALL_BOX, stillOnly: true, draw: (c) => ballStill(c) },
    { id: 'beamsStill', stillOnly: true, box: { x: 400, y: RK.chord, w: 1120, h: 700 - RK.chord + 60 }, draw: (c) => beamsStill(c) },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

registerKitScene(BOWL, (k: KitLive) => {
  const fx = k.slot('fx');
  const bowlC = k.slot('bowlLive');
  const sc = k.sc;
  const C = Phaser.Display.Color;
  const strobeOk = () => save.settings.flashes && !save.settings.reducedMotion;

  // ——— the marquee's bulbs and the crown's jewels, chasing
  const bulbKey = k.tex('rq_bulb', 14, 14, (c) => bulbAt(c, 7, 7, 1));
  const bulbs = [...BULBS, ...JEWELS.map(([x, y]) => [x, y + 6] as Pt)].map(([x, y]) => ({
    b: k.img(bulbKey, x, y, { into: fx }),
    g: k.glow(x, y, 15, 0xffd890, 0.45, { into: fx }),
  }));
  k.glow(MQ.x, MQ.y + 40, 280, 0xffc070, 0.1, { into: fx, sy: 0.6 });
  let chaseT = 0;
  let chase = 0;
  let flashAll = 0;

  // ——— the DJ and the console's meters
  const DJF = 8;
  const djKey = sheet(k, 'rq_dj', DJ.box.w, DJ.box.h, DJF + 2, (c, _ph, i) => {
    c.translate(-DJ.box.x, -DJ.box.y);
    djFrame(c, i / DJF, i >= DJF ? i - DJF + 1 : 0);
  });
  const djA = k.img(djKey, DJ.box.x, DJ.box.y, { into: fx, origin: [0, 0] });
  const djB = k.img(djKey, DJ.box.x, DJ.box.y, { into: fx, origin: [0, 0] });
  let djPh = 0;
  let skip = 0;
  const djT = C.GetColor(200, 180, 225);
  djA.setTint(djT);
  djB.setTint(djT);
  k.glow(1440 + 60, RK.booth.win - 16, 60, 0xffb870, 0.18, { into: fx });
  const meterKey = k.tex('rq_meter', 4, 3, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 4, 3);
  });
  const meterLeds = Array.from({ length: 6 }, (_, i) => k.img(meterKey, RK.booth.x1 - 80 + i * 5, RK.booth.win - 6, { into: fx, origin: [0, 0], add: true, tint: i > 4 ? 0xff4a5a : i > 3 ? 0xffd040 : 0x5aff7a }));
  k.glow(RK.board.x, RK.board.y, 150, 0xff9ad0, 0.16, { into: fx, sy: 0.4 });

  // ——— the pennants, swinging from the truss
  const pens = SB.pennants.map((x, i) => new Swing(k.pivot(k.sprite(`pennant${i}`), x, PEN.top), { k: 5, c: 0.5, idle: 0.012, seed: i * 2.7 }));

  // ——— the mirror ball: turning, glints, swinging on its chain, its specks sweeping the wall and the bowl
  const BF = 6;
  const ballKey = sheet(k, 'rq_ball', BALL_F, BALL_F, BF, (c, ph) => ballFrame(c, ph));
  const hingeY = RK.chord + 18;
  const ballC = sc.add.container(BALL.x, hingeY);
  fx.add(ballC);
  const chainLen = BALL.y - BALL.r - 4 - hingeY;
  const chainKey = k.tex('rq_chain', 16, Math.ceil(chainLen + 8), (c) => ballChain(c, 8, 0, chainLen));
  ballC.add(sc.add.image(0, 0, chainKey).setOrigin(0.5, 0));
  const pin = sc.add.image(0, BALL.y - hingeY, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xd8c8ff).setScale(300 / 256).setAlpha(0.3);
  ballC.add(pin);
  const ballA = sc.add.image(0, BALL.y - hingeY, ballKey, 0);
  const ballB = sc.add.image(0, BALL.y - hingeY, ballKey, 1);
  ballC.add(ballA);
  ballC.add(ballB);
  let ballPh = 0;
  const glints = Array.from({ length: 4 }, () => ({ img: sc.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(0.1).setAlpha(0), t: -1 }));
  for (const g of glints) ballC.add(g.img);
  const swing = new Swing(ballC as unknown as Phaser.GameObjects.Image, { k: 4, c: 0.35, idle: 0.004, seed: 2 });
  const specksWall = sc.add.tileSprite(0, RK.roof, W, SB.wallFoot - RK.roof, k.tex('rq_specks', 640, 220, (c) => specksTile(c, 640, 220, 201, 0.8))).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
  const specksBowl = sc.add.tileSprite(0, rimY(VX), W, TY - rimY(VX), k.tex('rq_specksB', 640, 160, (c) => specksTile(c, 640, 160, 203, 0.4))).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4);
  fx.add(specksWall);
  bowlC.add(specksBowl);
  // (the bowl's specks only on the bowl: masked to its inside)
  const maskG = sc.make.graphics({}, false);
  maskG.fillStyle(0xffffff);
  maskG.beginPath();
  const rimPts = arcPts(RE, -10, W + 10, 16);
  maskG.moveTo(rimPts[0][0], rimPts[0][1]);
  for (const [x, y] of rimPts) maskG.lineTo(x, y);
  maskG.lineTo(W + 10, TY);
  maskG.lineTo(-10, TY);
  maskG.closePath();
  maskG.fillPath();
  specksBowl.setMask(maskG.createGeometryMask());

  // ——— the spots crossing the bowl (under the figures), the beams through the air (over everything)
  const beamKey = k.tex('rq_beam', 64, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.12, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    g.addColorStop(0.85, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(29, 0);
    c.lineTo(35, 0);
    c.lineTo(64, 256);
    c.lineTo(0, 256);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-in';
    const m = c.createLinearGradient(0, 0, 64, 0);
    m.addColorStop(0, 'rgba(0,0,0,0)');
    m.addColorStop(0.3, 'rgba(0,0,0,0.55)');
    m.addColorStop(0.5, 'rgba(0,0,0,1)');
    m.addColorStop(0.7, 'rgba(0,0,0,0.55)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = m;
    c.fillRect(0, 0, 64, 256);
  });
  const BEAM_COLS = [0xff5ad8, 0x4ae8ff, 0xffd040, 0xa07aff];
  const beams = HEADS.map((x, i) => ({
    x,
    y: RK.chord + 36,
    img: k.img(beamKey, x, RK.chord + 36, { into: fx, add: true, origin: [0.5, 0], alpha: 0 }),
    spot: k.glow(x, 700, 130, BEAM_COLS[i], 0, { into: bowlC, sy: 0.24 }),
    seed: i * 7.3,
    col: i,
    lens: k.glow(x, RK.chord + 36, 26, 0xffffff, 0, { into: fx }),
  }));

  // ——— the figures
  const RF = { w: SK.fw * SK.k, h: SK.fh * SK.k };
  const riderKey = sheet(k, 'rq_rider', RF.w, RF.h, CN + CS, (c, _ph, i) => {
    c.scale(SK.k, SK.k);
    riderFrame(c, i);
  });
  const KN = 8;
  const kidKey = sheet(k, 'rq_kid', RF.w, RF.h, KN, (c, ph) => {
    c.scale(SK.k, SK.k);
    kidFrame(c, ph);
  });
  const shadowKey = k.tex('rq_shadow', 64, 16, (c) => {
    c.save();
    c.translate(32, 8);
    c.scale(1, 0.25);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 32);
    g.addColorStop(0, 'rgba(14,4,16,0.8)');
    g.addColorStop(1, 'rgba(14,4,16,0)');
    c.fillStyle = g;
    c.fillRect(-32, -32, 64, 64);
    c.restore();
  });
  const ORIGIN: [number, number] = [SK.ox / SK.fw, SK.base / SK.fh];
  const FIG_T = C.GetColor(226, 212, 236);
  // the kid on the coping
  const kidX = SB.kid.x;
  const rimK = rimY(kidX);
  const kidK = (depthK(rimK) * KID_K) / SK.k;
  const kidY = rimK + SIT_UP * kidK * SK.k;
  const kidSh = k.img(shadowKey, kidX + 10, rimK + 2, { into: bowlC, sx: 0.6, sy: 0.6, alpha: 0.6 });
  // (his legs' shadow down the wall under him)
  k.img(shadowKey, kidX + 22, rimK + 30, { into: bowlC, sx: 0.45, sy: 1.6, alpha: 0.45 });
  const kidA = k.img(kidKey, kidX, kidY, { into: bowlC, origin: ORIGIN, scale: kidK, tint: FIG_T });
  const kidB = k.img(kidKey, kidX, kidY, { into: bowlC, origin: ORIGIN, scale: kidK, tint: FIG_T });
  let kidPh = 0;
  const kidHop = new Spring(0, 160, 10);
  // the rider: her shadow, her, a rim of the pink spot on her
  const rSh = k.img(shadowKey, 0, 0, { into: bowlC });
  const rA = k.img(riderKey, 0, 0, { into: bowlC, origin: ORIGIN, tint: FIG_T });
  const rB = k.img(riderKey, 0, 0, { into: bowlC, origin: ORIGIN, tint: FIG_T });
  const rRim = k.img(riderKey, 0, 0, { into: bowlC, origin: ORIGIN, add: true, tint: 0xff6ad8, alpha: 0.2 });
  let ph = Math.PI * 1.3;
  const wob = new Spring(0, 50, 5);
  const bob = new Spring(0, 90, 9);

  // ——— the fog pooled in the bowl (two banks, sloshing after her)
  const FOGN = 8;
  const FW = 480;
  const FH = 48;
  const fogKey = sheet(k, 'rq_fog', FW, FH, FOGN, (c, p) => {
    fogFrame(c, FW, FH, p, 207);
    fadeSides(c, FW, FH);
  });
  const fogs = [
    { a: k.img(fogKey, VX, TY - 6, { into: bowlC, origin: [0.5, 1], sx: 3.8, sy: 3.4 }), b: k.img(fogKey, VX, TY - 6, { into: bowlC, origin: [0.5, 1], sx: 3.8, sy: 3.4 }), ph: 0, fps: 0.9, x: 0, v: 0 },
    { a: k.img(fogKey, VX, TY + 4, { into: bowlC, origin: [0.5, 1], sx: 3.2, sy: 2.6 }), b: k.img(fogKey, VX, TY + 4, { into: bowlC, origin: [0.5, 1], sx: 3.2, sy: 2.6 }), ph: 4, fps: 0.7, x: 0, v: 0 },
  ];
  fogs[1].a.setFlipX(true);
  fogs[1].b.setFlipX(true);

  // ——— on the deck: the skate that rolls, the pucks that hop
  const skateImg = k.pivot(k.sprite('skate'), SKT.x, SKT.y);
  const skX = skateImg.x;
  const skS = new Spring(0, 30, 3.2);
  const skR = new Spring(0, 60, 5);
  const puckKey = sheet(k, 'rq_puck', 48, 48, 4, (c, _ph, i) => puck(c, 24, 20, 1, [0.3, 0.6, 0.85, 0.2][i]));
  const pucks = new Parts(k, { frame: 'soft', sheet: { key: puckKey, n: 4, half: 24 }, into: fx, max: 8 });

  // ——— a stomp's answer from the lighting desk
  const strobe = k.wash(0xe8e0ff, 0, Phaser.BlendModes.ADD, fx);
  let flash = 0;
  let puff = 0;

  const cross = (a: Phaser.GameObjects.Image, b: Phaser.GameObjects.Image, p: number, n: number, loop: boolean) => {
    const i = Math.floor(p);
    const f = p - i;
    a.setFrame(((i % n) + n) % n);
    const j = loop ? (i + 1) % n : Math.min(n - 1, i + 1);
    b.setFrame(j).setAlpha(f);
  };

  return {
    impact(x, _y, p) {
      swing.kick((x < BALL.x ? 1 : -1) * (0.8 + crand() * 0.4) * p);
      for (const s of pens) s.kick((x < 960 ? 1 : -1) * (0.6 + crand() * 0.5) * p);
      wob.v += (crand() < 0.5 ? -1 : 1) * (2 + crand() * 2) * p;
      bob.v -= 50 * p;
      kidHop.v -= 120 * p * (0.6 + crand() * 0.4);
      skS.v += (x < SKT.x ? 1 : -1) * 160 * p;
      skR.v += (x < SKT.x ? 1 : -1) * 1.2 * p;
      if (p > 0.35) {
        const n = 1 + Math.round(p * 2);
        for (let i = 0; i < n; i++)
          pucks.spawn({ x: WH.x + (crand() < 0.5 ? -96 : 70) + (crand() - 0.5) * 10, y: WH.y + 4, vx: (crand() - 0.5) * 90, vy: -120 - crand() * 160 * p, life: 1.4, r0: 24, a: 1, tint: 0xffffff, grav: 1300, floor: WH.y + 18 + crand() * 10, bounce: 0.3, spin: (crand() - 0.5) * 10, fade: 0.01 });
      }
      if (p > 0.6) flashAll = 0.25;
      flash = Math.max(flash, 0.3 * p);
      if (p > 0.3) skip = 0.6;
      puff = Math.max(puff, p);
    },
    update(dt, t) {
      const cm = calm();
      flash = Math.max(0, flash - dt);
      puff = Math.max(0, puff - dt * 0.7);
      strobe.setAlpha(strobeOk() ? flash * 0.12 : 0);

      // ——— the marquee: chasing, a flash of every bulb on a big stomp
      chaseT += dt * 6 * cm;
      if (chaseT > 1) {
        chaseT -= 1;
        chase++;
      }
      flashAll = Math.max(0, flashAll - dt);
      bulbs.forEach((bl, i) => {
        const on = flashAll > 0 && strobeOk() ? (Math.sin(t * 50) > 0 ? 1 : 0.2) : i >= BULBS.length ? 0.75 + 0.25 * Math.sin(t * 3 + i) : (i + chase) % 3 === 0 ? 1 : 0.2;
        bl.b.setAlpha(on);
        bl.g.setAlpha(on * 0.6);
      });

      // ——— the DJ
      skip = Math.max(0, skip - dt);
      if (skip > 0) {
        djA.setFrame(DJF + (skip > 0.35 ? 0 : 1));
        djB.setAlpha(0);
      } else {
        djPh = (djPh + dt * 8.5) % DJF;
        cross(djA, djB, djPh, DJF, true);
      }
      const beat = Math.max(0, Math.sin(t * P2 * 2.1));
      meterLeds.forEach((m, i) => m.setAlpha(i / 6 < 0.35 + beat * 0.55 + wander(t, i, 3) * 0.1 ? 0.95 : 0.1));

      // ——— the pennants and the ball
      for (const s of pens) s.update(dt, t);
      swing.update(dt, t);
      ballPh = (ballPh + dt * 3.4 * cm) % BF;
      cross(ballA, ballB, ballPh, BF, true);
      for (const g of glints) {
        if (g.t < 0) {
          if (crand() < dt * 4) {
            g.t = 0;
            const a = crand() * P2;
            const rr = BALL.r * Math.sqrt(crand()) * 0.85;
            g.img.setPosition(Math.cos(a) * rr - 8, BALL.y - hingeY + Math.sin(a) * rr - 8);
          }
          continue;
        }
        g.t += dt;
        const u = g.t / 0.35;
        if (u >= 1) {
          g.t = -1;
          g.img.setAlpha(0);
          continue;
        }
        const a = Math.sin(u * Math.PI);
        g.img.setAlpha(a * 0.7).setScale(0.12 + a * 0.08);
      }
      const sway = swing.angle;
      const scroll = dt * 50 * cm;
      specksWall.tilePositionX -= scroll;
      specksWall.tilePositionY = sway * 400;
      specksBowl.tilePositionX += scroll * 0.7;
      specksBowl.tilePositionY = -sway * 200;

      // ——— the beams sweeping through the fog, their spots crossing the bowl
      for (const b of beams) {
        const aim = wander(t * 0.32, b.seed, 1) * 0.5 + (b.x < VX ? -0.12 : 0.12);
        b.img.setRotation(aim);
        const ey = 690;
        const len = (ey - b.y) / Math.cos(aim);
        b.img.setScale(1.7, len / 256);
        const col = BEAM_COLS[(b.col + Math.floor(t / 7)) % BEAM_COLS.length];
        b.img.setTint(col).setAlpha(0.55 + flash * 0.4);
        b.lens.setPosition(b.x - Math.sin(aim) * 6, b.y + Math.cos(aim) * 6).setTint(col).setAlpha(0.9);
        const ex = b.x - Math.sin(aim) * len;
        // (on the wall the spot rides up it with the bowl's curve)
        const sy = Math.min(ey, Math.max(rimY(ex) + 30, ey - Math.abs(ex - VX) * 0.18));
        b.spot.setPosition(ex, sy).setTint(col).setAlpha(0.45);
      }

      // ——— the rider: back and forth across the bowl, up each wall to the lip
      ph += dt * 1.9 * (0.6 + 0.4 * cm);
      const s = Math.sin(ph);
      const dir = Math.cos(ph) >= 0 ? 1 : -1;
      const a = Math.abs(s);
      const P = riderAt(s);
      const w = wob.step(0, dt);
      const hop = Math.min(0, bob.step(0, dt));
      // at the lip she stalls, arms flung out, and pivots round to drop back in: as she slows to a stop her facing
      // turns over (squashing through side-on, the frame flipping at the top of the swing)
      const stallK = Phaser.Math.Clamp((a - 0.9) / 0.1, 0, 1);
      const face = dir;
      const sx = Phaser.Math.Clamp(Math.abs(Math.cos(ph)) / 0.32, 0.2, 1);
      const k0 = P.k / SK.k;
      const rot = P.rot + w * 0.18;
      const shadowK = P.k;
      if (stallK > 0.5) {
        rA.setFrame(CN + (stallK > 0.85 ? 1 : 0));
        rB.setAlpha(0);
        rRim.setFrame(CN + (stallK > 0.85 ? 1 : 0));
      } else {
        const q = compressAt(a) * (CN - 1);
        cross(rA, rB, q, CN, false);
        rRim.setFrame(Math.round(q));
      }
      for (const im of [rA, rB, rRim]) im.setPosition(P.x, P.y + hop).setScale(k0 * face * sx, k0).setRotation(rot);
      rRim.setPosition(P.x - 1.6 * dir, P.y + hop - 1.2);
      rSh.setPosition(P.x + 6 * shadowK, P.y + 2).setScale(shadowK * 1.5, shadowK * 1.3 * (1 - a * 0.4)).setAlpha(0.95 + hop / 40).setRotation(P.rot * 0.5);
      // the pink spot's rim on her, stronger when she's in it
      rRim.setAlpha(0.14 + 0.16 * Math.max(0, 1 - Math.abs(P.x - beams[0].spot.x) / 300));

      // ——— the kid on the coping
      kidPh = (kidPh + dt * 6 * cm) % KN;
      cross(kidA, kidB, kidPh, KN, true);
      const kh = Math.min(0, kidHop.step(0, dt));
      kidA.y = kidY + kh;
      kidB.y = kidY + kh;
      kidSh.setAlpha(0.6 + kh / 60);

      // ——— the fog: it rolls in place, and sloshes after her as she passes
      fogs.forEach((f, i) => {
        f.ph = (f.ph + dt * f.fps * cm) % FOGN;
        const target = (P.x - VX) * (i ? 0.05 : 0.08);
        f.v += ((target - f.x) * 1.2 - f.v * 0.9) * dt;
        f.x += f.v * dt;
        const al = 0.62 + puff * 0.3 - i * 0.14;
        f.a.setAlpha(al);
        cross(f.a, f.b, f.ph, FOGN, true);
        f.b.setAlpha(f.b.alpha * al);
        f.a.x = VX + f.x + wander(t * 0.2, i * 3, 1) * 20;
        f.b.x = f.a.x;
      });

      // ——— on the deck
      skateImg.x = skX + skS.step(0, dt);
      skateImg.rotation = skR.step(0, dt) * 0.03;
      pucks.update(dt);
    },
  };
});
