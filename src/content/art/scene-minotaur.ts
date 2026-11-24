// The Heart of the Maze (the Minotaur's arena, the Labyrinth's mini-boss, Act 9), redrawn with the location kit
// (src/art/scene): the round court at the very centre of Daedalus's maze, where the beast lives, open to a hot
// afternoon sky. The same Cretan limestone, fresco and bronze as the Labyrinth (scene-labyrinth.ts), seen from the
// middle of the court: its ring wall curves all the way round us.
//
// The wall: limestone ashlar, a timber tie-beam through it, horns of consecration along its coping; its plaster painted
// with the fate of the tribute (on the left, the procession of the youths and maidens sent from Athens, carrying their
// gifts to the gate; on the right, the bull among them, one tossed over its horns, one under its hooves, one running),
// over a dark veined dado. The plaster has flaked away in patches; the beast's horns have scored it in pairs of deep
// gouges down to the stone, and where he rammed the wall it is shattered in starbursts of cracks. Opposite us, the
// gate the youths were sent through: two great bronze-bound timber doors, shut, splintered by his horns, the sun
// outside leaking through their seam; a bull's skull nailed over the lintel, red Minoan columns either side, and
// Ariadne's red thread coming in under the doors and across the court. Two bronze tripod braziers flank the gate. On
// the left, a great double axe (the labrys) on its stepped stand, its blades high against the sky, the bones of his
// victims heaped round its foot with their broken ox-hide shields and a boar's-tusk helmet. On the right, a stone
// trough, a bronze bull's head spouting water into it, straw trodden into the dirt. The floor is packed earth, a track
// worn round the wall where he paces, his cloven prints in it, the furrows of his charges, straw and dung.
//
// The light: a hot sun high on the left. The left of the ring is in its own shade; across the far wall and the right
// the shadow line climbs, so only the upper wall and the coping are in gold and everything behind the lanes (the lower
// wall, the dado, the floor) is in a cool, calm shade. The table is the court's threshold: one great worn slab of
// limestone, its bedding showing, worn into a hollow by hooves, chipped along its edges.
//
// An arena, not a location: no waves. It answers the fight (read from the game scene, as Fenrir's does):
// - the braziers: fire painted at 10 phases, lit smoke, embers with physics; a stomp ducks them and they flare; while
//   he paws they shiver, when he charges they stream away from him;
// - the wall answers every blow: flakes of painted plaster and grit come off it and bounce where they land, dust
//   slides down its face and puffs at its foot; when he rams a maze wall the ground shakes: a wave of dust runs round
//   the foot of the ring, the braziers jump, the labrys rocks on its stand, the spout's stream jumps and sprays;
// - the water: a stream painted at 8 phases pouring from the bull's head into the trough, splashing;
// - vultures circling high over the court.

import Phaser from 'phaser';
import { type Air, type Ctx, type R, TY, W, airMix, calmLanes, castShadow, crevice, glowAt, groundShadow, lightPool, polyPath, solid, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff, tableSeam, woodGrain } from '../../art/scene/materials';
import { chips, crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { cirrus, cloud, skyFill } from '../../art/scene/sky';
import { ZB, xAt, yAt, zFront } from '../../art/sceneKit';
import { hashStr, makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene } from '../../game/sceneLive';
import { fireFrame, smokeFrame } from './sceneBits';
import { BRONZE, COLUMN, FLK, FR, HORNS, LIME, SHADE, age, bull, bullHead, figure, flake, flakeFrame, hornsPaint, labrys, lily, masonMark, spirals, veined } from './scene-labyrinth';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ——— the court's own perspective ———
//
// We stand near the middle of the round court and look across it: its wall is a ring of radius RC round us (X across,
// Y up, z away), seen from eye height EH with the vanishing point at (960, VY). A point on the ring is (θ, Y): θ is
// its bearing (0 straight ahead), so every screen column is one bearing and the wall's courses bow towards the middle.

const F = 500;
const VY = 480;
const EH = 0.8;
export const MT = {
  front: 1040,
  /** The ring's radius and the wall's height (to the top of its coping). */
  rc: 3.3,
  wh: 1.95,
  /** The gate opposite: its half width and height. */
  gate: { hw: 0.55, h: 1.5 },
  /** The braziers (bearing, distance) and their bowls' height. */
  braziers: [[-0.48, 2.7], [0.48, 2.7]] as Pt[],
  bowlY: 1.05,
  /** The labrys's stand (bearing, distance), its socket's height, the axe head's centre. */
  labrys: { th: -1.0, r: 3.0, sock: 0.36, head: 1.48, top: 1.66 },
  /** The trough (bearings, front and back distances, rim height) and the bull's head spout over it. */
  trough: { th0: 0.93, th1: 1.1, r0: 2.82, r1: 3.18, h: 0.42 },
  spout: { th: 1.0, Y: 1.0 },
};
const RC = MT.rc;
const WH = MT.wh;
const COPE = 0.12;
/** A little past the screen's edges. */
const TH_E = Math.atan(1010 / F);
export const sx = (X: number, z: number) => 960 + (X * F) / z;
export const sy = (Y: number, z: number) => VY + ((EH - Y) * F) / z;
export const P = (X: number, Y: number, z: number): Pt => [sx(X, z), sy(Y, z)];
/** A point at bearing θ, height Y, distance r. */
export const RP = (th: number, Y: number, r = RC): Pt => P(r * Math.sin(th), Y, r * Math.cos(th));
/** The bearing of screen column x. */
export const thAt = (x: number) => Math.atan((x - 960) / F);
/** Screen px per unit at bearing θ and distance r, and at depth z. */
const ppu = (th: number, r = RC) => F / (r * Math.cos(th));
const pz = (z: number) => F / z;
/** A band of the ring (θ0…θ1, Y0…Y1) at distance r, its edges bowed as the courses are. */
const ringPath = (th0: number, th1: number, Y0: number, Y1: number, r = RC) => (c: Ctx) => {
  const n = Math.max(2, Math.ceil(Math.abs(th1 - th0) / 0.012));
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const [x, y] = RP(th0 + ((th1 - th0) * i) / n, Y1, r);
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const [x, y] = RP(th0 + ((th1 - th0) * i) / n, Y0, r);
    c.lineTo(x, y);
  }
  c.closePath();
};
/** A band of the floor (θ0…θ1 between distances r0…r1). */
const floorBand = (th0: number, th1: number, r0: number, r1: number) => (c: Ctx) => {
  const n = Math.max(2, Math.ceil(Math.abs(th1 - th0) / 0.012));
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const [x, y] = RP(th0 + ((th1 - th0) * i) / n, 0, r1);
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const [x, y] = RP(th0 + ((th1 - th0) * i) / n, 0, r0);
    c.lineTo(x, y);
  }
  c.closePath();
};
const boxOfPts = (pts: Pt[], pad = 4): Box => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad };
};

/** The height on the wall below which it is in shade, at bearing θ: the whole left of the ring is in its own shade;
 * from there the line of the shadow climbs down across the far wall and the right, so only the upper wall is lit. */
export const shadowY = (th: number) => (th < -0.3 ? WH + 0.6 : WH - 0.04 - (WH - 1.02) * clamp01((th + 0.3) / (TH_E + 0.3)) ** 0.9);

/**
 * Map a picture painted flat (an elevation: across it runs round the ring from θ0 to θ1, down it runs down the wall)
 * onto the ring between heights Y0…Y1, a column of screen pixels at a time; only the bearings c0…c1 are drawn.
 */
function mapToRing(ctx: Ctx, src: HTMLCanvasElement, th0: number, th1: number, Y0: number, Y1: number, c0 = th0, c1 = th1, r = RC): void {
  const sw = src.width;
  const sh = src.height;
  const xa = 960 + F * Math.tan(Math.max(-1.5, c0));
  const xb = 960 + F * Math.tan(Math.min(1.5, c1));
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (let x = Math.max(-1, Math.floor(xa)); x < Math.min(W + 1, Math.ceil(xb)); x++) {
    const ta = thAt(x);
    const tb = thAt(x + 1);
    const tm = thAt(x + 0.5);
    if (tm < c0 || tm > c1) continue;
    const sa = ((ta - th0) / (th1 - th0)) * sw;
    const sb = ((tb - th0) / (th1 - th0)) * sw;
    const top = RP(tm, Y1, r)[1];
    const h = (Y1 - Y0) * ppu(tm, r);
    ctx.drawImage(src, Math.max(0, sa), 0, Math.max(0.6, sb - sa), sh, x, top, 1.6, h);
  }
  ctx.restore();
}

/** Multiply a region into a colour (the cool shade), soft-edged: painted small and drawn up. */
function shadeWith(ctx: Ctx, box: Box, col: string, draw: (g: Ctx) => void, k = 0.5): void {
  softly(ctx, box, (g) => {
    g.fillStyle = col;
    draw(g);
  }, k, 'multiply');
}

/** Paint a prop in the cool shade: drawn on its own canvas, multiplied into the shade colour there (only where it
 * painted), then laid down, so the shade never darkens what's behind it. */
function inShade(ctx: Ctx, box: Box, draw: (g: Ctx) => void, col = SHADE): void {
  const x0 = Math.floor(box.x);
  const y0 = Math.floor(box.y);
  const w = Math.ceil(box.w) + 2;
  const h = Math.ceil(box.h) + 2;
  const [c, g] = makeCanvas(w, h);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.translate(-x0, -y0);
  draw(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const [c2, g2] = makeCanvas(w, h);
  g2.drawImage(c, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = col;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(c2, 0, 0);
  ctx.drawImage(c, x0, y0);
}

// ——— the air and the light ———

/** The air across the court: hot, dusty gold. */
const AIR: Air = { color: '#e0c69a', far: 0.4 };
/** The far air over the island: bleached, hot. */
const FAR: Air = { color: '#ead8b8', far: 0.85 };
const SHADE_FLOOR = '#6a6ca0';
const SUN = '#ffd89a';
const SUN_AT: Pt = [130, -90];

// ——— the sky ———

export const SKY_BOX = { x: 0, y: 0, w: W, h: 340 };

function sky(ctx: Ctx, r: R): void {
  const b = SKY_BOX;
  // a hot afternoon sky: a deep dusty blue overhead, bleached almost white at the wall tops
  skyFill(ctx, b, [[0, '#5584b0'], [0.26, '#86a8c0'], [0.52, '#c6c8b6'], [0.78, '#eed8a8'], [1, '#f6d8a0']], 0.03);
  // the sun's blaze, high on the left, off the top of the picture
  glowAt(ctx, SUN_AT[0], SUN_AT[1], 1000, '#fff0c8', 0.2, 0.7);
  glowAt(ctx, SUN_AT[0], SUN_AT[1], 380, '#fffaf0', 0.3);
  // a veil of high cirrus, thinned by the heat
  cirrus(ctx, r, { x: 420, y: 10, w: 1300, h: 130 }, '#fff6e4', 0.16, -0.08, 14);
  // Mount Ida far off, its twin summits, almost lost in the haze
  const ida: Pt[] = [[540, 342]];
  for (let x = 540; x <= 1580; x += 6) {
    const m = 118 * Math.exp(-(((x - 1000) / 230) ** 2)) + 34 * Math.exp(-(((x - 1100) / 70) ** 2)) + 22 * Math.exp(-(((x - 930) / 60) ** 2));
    ida.push([x, 318 - m + Math.sin(x * 0.045) * 4 + Math.sin(x * 0.13 + 1) * 2 + Math.abs(Math.sin(x * 0.021)) * 6]);
  }
  ida.push([1580, 342]);
  const ic = airMix('#8e94b4', 0.8, FAR);
  ctx.save();
  polyPath(ida)(ctx);
  ctx.fillStyle = ic;
  ctx.fill();
  ctx.clip();
  lay(ctx, drift('#f4dcb0', shade(ic, -0.2), 4, 12, 64, 24), { x: 520, y: 178, w: 1080, h: 162 }, 0.3);
  const lg = ctx.createLinearGradient(880, 180, 1160, 320);
  lg.addColorStop(0, rgba('#f6dcb0', 0.5));
  lg.addColorStop(1, rgba('#f6dcb0', 0));
  ctx.fillStyle = lg;
  ctx.fillRect(520, 178, 1080, 162);
  // its gullies: soft shadowed folds down its flanks
  softly(ctx, { x: 520, y: 178, w: 1080, h: 162 }, (g) => {
    for (let i = 0; i < 9; i++) {
      const gx = 870 + i * 44 + r() * 14;
      g.strokeStyle = rgba(shade(ic, -0.2), 0.12);
      g.lineWidth = 6 + r() * 8;
      g.beginPath();
      g.moveTo(gx, 212 + r() * 12);
      g.quadraticCurveTo(gx + (gx - 1000) * 0.15, 262, gx + (gx - 1000) * 0.35 + r() * 16, 320);
      g.stroke();
    }
  }, 0.25);
  vfill(ctx, 520, 240, 1080, 100, [[0, rgba(FAR.color, 0)], [1, rgba(FAR.color, 0.55)]]);
  ctx.restore();
  // the palace on its hill over the maze (as the Labyrinth sees it): pale terraces, a red loggia, flat roofs
  const ppx = 862;
  const ppy = 262;
  const pc = airMix('#c8b494', 0.85, FAR);
  const pl = airMix('#f6dcb0', 0.85, FAR);
  ctx.fillStyle = airMix('#b8a888', 0.88, FAR);
  ctx.beginPath();
  ctx.moveTo(760, 300);
  ctx.quadraticCurveTo(860, 248, 980, 300);
  ctx.closePath();
  ctx.fill();
  for (const [bx0, by0, bw, bh] of [[-46, -6, 92, 16], [-30, -16, 50, 12], [4, -22, 22, 8], [-16, -26, 14, 10]] as [number, number, number, number][]) {
    ctx.fillStyle = pc;
    ctx.fillRect(ppx + bx0, ppy + by0, bw, bh);
    ctx.fillStyle = pl;
    ctx.fillRect(ppx + bx0, ppy + by0, bw * 0.35, bh);
    ctx.fillRect(ppx + bx0, ppy + by0, bw, 1);
  }
  ctx.fillStyle = airMix('#8a2a1c', 0.82, FAR);
  for (let i = 0; i < 5; i++) ctx.fillRect(ppx - 26 + i * 6, ppy - 12, 1.6, 7);
  // heat-hazed cumulus building over the mountain, lit from the sun's side
  cloud(ctx, r, 1340, 176, 360, 92, { lit: '#fff6e0', body: '#e2d4c2', shadow: '#a8a4ba', sunX: SUN_AT[0], sunY: SUN_AT[1], rim: 0.5, a: 0.9, kind: 'cumulus', wisp: 0.55, depth: 0.7, air: FAR, res: 0.5 });
  cloud(ctx, r, 720, 150, 260, 46, { lit: '#fff6e0', body: '#e6dac8', shadow: '#b0aac0', sunX: SUN_AT[0], sunY: SUN_AT[1], rim: 0.5, a: 0.8, kind: 'stratus', wisp: 0.6, depth: 0.75, air: FAR, res: 0.5 });
  // the hot air shimmering over the wall tops
  vfill(ctx, 0, 220, W, 120, [[0, rgba('#f8e6c0', 0)], [0.7, rgba('#f8e6c0', 0.3)], [1, rgba('#f8e6c0', 0.2)]]);
}

// ——— masonry on the ring ———

/**
 * Coursed ashlar round the ring between bearings th0…th1 and heights Y0…Y1: each block its own stone (a tone, a
 * cushion lit at its top and dark at its foot), the bed joints recessed (a dark band under each course, a lit lip over
 * it), the head joints dark with a lit arris (vertical on screen: every column is one bearing).
 */
function ringMasonry(ctx: Ctx, r: R, th0: number, th1: number, Y0: number, Y1: number, tones: string[], toneA: number): void {
  const ch = 0.36;
  const joint = '#2a1e18';
  const lip = '#fff0d0';
  const a0 = th0 * RC;
  const a1 = th1 * RC;
  const band = (aa: number, b: number, ya: number, yb: number) => ringPath(aa / RC, b / RC, ya, yb);
  for (let Y = Y0; Y < Y1 - 0.02; ) {
    const h = Math.min(Y1 - Y, ch * (0.82 + r() * 0.36));
    let a = a0 - r() * 0.9;
    while (a < a1) {
      const b = Math.min(a1, a + 0.6 + r() * 0.7);
      const aa = Math.max(a0, a);
      if (b - aa > 0.01) {
        const tm = (aa + b) / 2 / RC;
        const [, qy0] = RP(tm, Y + h);
        const [qx, qy1] = RP(tm, Y);
        const path = band(aa, b, Y, Y + h);
        ctx.fillStyle = rgba(tones[Math.floor(r() * tones.length)], toneA * (0.4 + r() * 0.6));
        path(ctx);
        ctx.fill();
        const g = ctx.createLinearGradient(qx, qy0, qx, qy1);
        g.addColorStop(0, rgba(lip, 0.13));
        g.addColorStop(0.35, rgba(lip, 0));
        g.addColorStop(0.75, rgba(joint, 0));
        g.addColorStop(1, rgba(joint, 0.17));
        ctx.fillStyle = g;
        path(ctx);
        ctx.fill();
        if (b < a1) {
          const tb = b / RC;
          const s = ppu(tb);
          const jw = 0.011;
          ctx.fillStyle = rgba(joint, 0.78);
          band(b - jw, b + jw, Y + 0.005, Y + h - 0.005)(ctx);
          ctx.fill();
          const [ux, uy] = RP((b + jw * 1.6) / RC, Y + 0.01);
          const [, vy] = RP((b + jw * 1.6) / RC, Y + h - 0.01);
          ctx.fillStyle = rgba(lip, 0.22);
          ctx.fillRect(ux, vy, Math.max(0.6, s * 0.006), uy - vy);
        }
      }
      a = b;
    }
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

// ——— the fresco: the fate of the tribute ———
//
// Painted flat round the whole ring (x along the arc, R px per unit), then mapped on. Left of the gate the procession
// of the youths and maidens walks to it with their gifts; right of it, the bull among them; then a double axe and a
// bull's head. Its plaster flakes away in patches (the stone shows through).

const FY0 = 0.05;
const FY1 = 1.55;
const BEAM: Pt = [1.58, 1.67];
const FRK = 240;
const ARC = TH_E * 2 * RC;
/** The gate's bearing half width, and the stretch round it the fresco leaves out (the jambs and columns). */
const GTH = MT.gate.hw / RC;
const GFRAME = (MT.gate.hw + 0.26) / RC;
let fresCache: HTMLCanvasElement | null = null;

/** A Minoan jar held up as an offering: a tall belly, a narrow neck and lip, two handles, a band of paint. */
function jar(c: Ctx, x: number, y: number, s: number, col: string): void {
  c.save();
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x - s * 0.03, y - s * 0.2);
  c.lineTo(x + s * 0.03, y - s * 0.2);
  c.lineTo(x + s * 0.035, y - s * 0.15);
  c.quadraticCurveTo(x + s * 0.11, y - s * 0.1, x + s * 0.09, y + s * 0.0);
  c.quadraticCurveTo(x + s * 0.06, y + s * 0.07, x + s * 0.03, y + s * 0.08);
  c.lineTo(x - s * 0.03, y + s * 0.08);
  c.quadraticCurveTo(x - s * 0.06, y + s * 0.07, x - s * 0.09, y + s * 0.0);
  c.quadraticCurveTo(x - s * 0.11, y - s * 0.1, x - s * 0.035, y - s * 0.15);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.strokeStyle = FR.black;
  c.lineWidth = s * 0.018;
  c.stroke();
  for (const d of [-1, 1]) {
    c.beginPath();
    c.arc(x + d * s * 0.06, y - s * 0.12, s * 0.03, 0, P2);
    c.stroke();
  }
  c.fillStyle = FR.black;
  c.fillRect(x - s * 0.09, y - s * 0.05, s * 0.18, s * 0.02);
  c.fillStyle = FR.red;
  c.fillRect(x - s * 0.085, y - s * 0.02, s * 0.17, s * 0.015);
  c.restore();
}

function frescoRing(): HTMLCanvasElement {
  if (fresCache) return fresCache;
  const k = FRK;
  const w = Math.round(ARC * k);
  const h = Math.round((FY1 - FY0) * k);
  const [cv, c] = makeCanvas(w, h);
  const r = rng(hashStr('mt:fresco'));
  const yOf = (Y: number) => (FY1 - Y) * k;
  const xOf = (u: number) => u * k;
  const uGate = ARC / 2;
  c.fillStyle = FR.white;
  c.fillRect(0, 0, w, h);
  // the dado: slabs of painted dark stone (porphyry and black), between black uprights
  for (let u = -0.1; u < ARC; u += 0.44) {
    veined(c, r, xOf(u), xOf(u + 0.4), yOf(0.6), yOf(FY0), r() < 0.5 ? '#6a2e24' : '#4e2a26', ['#2a1210', '#b07a58', '#1a0c0a']);
    c.fillStyle = FR.black;
    c.fillRect(xOf(u + 0.4), yOf(0.6), 0.04 * k, (0.6 - FY0) * k);
  }
  for (const [y0, y1, col] of [[0.6, 0.63, FR.black], [0.63, 0.67, FR.ochre], [0.67, 0.7, FR.black]] as [number, number, string][]) {
    c.fillStyle = col;
    c.fillRect(0, yOf(y1), w, (y1 - y0) * k);
  }
  // the field: on the left a pale ground for the procession, on the right Egyptian blue for the bull
  const fy0 = 0.7;
  const fy1 = 1.4;
  c.fillStyle = '#dcc79c';
  c.fillRect(0, yOf(fy1), xOf(uGate), (fy1 - fy0) * k);
  lay(c, drift('#ead8b0', '#a88a5a', 4, 14, 120, 30), { x: 0, y: yOf(fy1), w: xOf(uGate), h: (fy1 - fy0) * k }, 0.35);
  c.fillStyle = '#e2cc98';
  c.fillRect(xOf(uGate), yOf(fy1), w - xOf(uGate), (fy1 - fy0) * k);
  lay(c, drift('#f0dcac', '#b8985e', 4, 18, 120, 30), { x: xOf(uGate), y: yOf(fy1), w: w - xOf(uGate), h: (fy1 - fy0) * k }, 0.35);
  // a wavy ground line under them, red on the left, ochre on the right
  for (const [u0, u1, col] of [[0, uGate, '#b8644a'], [uGate, ARC, '#7c98ac']] as [number, number, string][]) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(xOf(u0), yOf(fy0));
    for (let x = xOf(u0); x <= xOf(u1); x += 8) c.lineTo(x, yOf(fy0 + 0.07 + Math.sin(x * 0.025) * 0.02));
    c.lineTo(xOf(u1), yOf(fy0));
    c.closePath();
    c.fill();
  }
  // the procession: youths (red) and maidens (white) walking to the gate, gifts in their hands
  const s = 0.36 * k;
  const gifts = [FR.ochre, '#c8743a', FR.blue, '#e8dcc0'];
  for (let i = 0, u = 0.35; u < uGate - 0.95; u += 0.36, i++) {
    const youth = i % 2 === 0;
    const hx = xOf(u + (r() - 0.5) * 0.05);
    const hy = yOf(0.98);
    const step = 0.32 + r() * 0.08;
    const armUp = 2.15 + r() * 0.3;
    figure(c, hx, hy, s, youth ? '#b0552e' : '#f2e6d0', { body: 0.04, arms: [-0.35, armUp], legs: [step, -step * 0.9] });
    if (!youth) {
      // a maiden's flounced bell skirt, banded, to her ankles
      const bands = [FR.blue, FR.red, FR.ochre, FR.blue];
      const top = hy - s * 0.1;
      const bot = hy + s * 0.56;
      for (let j = bands.length - 1; j >= 0; j--) {
        const y0 = top + ((bot - top) * j) / bands.length;
        const y1 = top + ((bot - top) * (j + 1)) / bands.length;
        const w0 = s * (0.09 + (0.12 * j) / bands.length);
        const w1 = s * (0.09 + (0.12 * (j + 1)) / bands.length);
        c.fillStyle = bands[j];
        c.beginPath();
        c.moveTo(hx - w0, y0);
        c.lineTo(hx + w0, y0);
        c.quadraticCurveTo(hx + w1 * 1.1, (y0 + y1) / 2, hx + w1, y1);
        c.lineTo(hx - w1, y1);
        c.quadraticCurveTo(hx - w1 * 1.1, (y0 + y1) / 2, hx - w0, y0);
        c.closePath();
        c.fill();
        c.strokeStyle = FR.black;
        c.lineWidth = s * 0.015;
        c.stroke();
      }
    }
    // the gift in the raised hand
    const ax = hx + s * 0.12 + Math.sin(armUp) * s * 0.42;
    const ay = hy - s * 0.46 + Math.cos(armUp) * s * 0.42;
    jar(c, ax + s * 0.02, ay - s * 0.08, s, gifts[i % 4]);
  }
  // the bull among them, charging the gate (left), a youth tossed over its horns, one under its hooves, one running
  const bk = (1.05 * k) / 300;
  const bx = xOf(uGate + 1.78);
  const by = yOf(1.3);
  c.save();
  c.translate(bx + 300 * bk, by);
  c.scale(-1, 1);
  bull(c, 0, 0, bk);
  c.restore();
  figure(c, bx - 10 * bk, yOf(1.28), s * 0.92, '#b0552e', { body: -2.4, arms: [2.6, 2.0], legs: [-0.6, 0.4] });
  figure(c, bx + 160 * bk, yOf(0.86), s * 0.92, '#f2e6d0', { body: Math.PI / 2, arms: [0.6, 1.6], legs: [-0.2, 0.3] });
  figure(c, bx - 70 * bk, yOf(1.0), s * 0.92, '#b0552e', { body: -0.25, arms: [-2.6, -2.2], legs: [-0.6, 0.5] });
  // a dropped figure-of-eight shield behind it
  c.fillStyle = '#e8dcc0';
  for (const [dy, rr] of [[-0.06, 0.08], [0.08, 0.09]] as Pt[]) {
    c.beginPath();
    c.ellipse(bx + 320 * bk, yOf(0.86 + dy), rr * k * 0.7, rr * k, 0.5, 0, P2);
    c.fill();
  }
  // a double axe either side of a bull's head, a lily
  for (const [u, sz] of [[uGate + 3.05, 0.3], [uGate + 3.55, 0.3]] as Pt[]) labrys(c, xOf(u), yOf(1.06), sz * k);
  labrys(c, xOf(uGate + 1.0), yOf(1.06), 0.3 * k);
  c.save();
  c.translate(xOf(uGate + 3.3), yOf(1.04));
  c.scale(k / 360, k / 360);
  bullHead(c);
  c.restore();
  lily(c, xOf(uGate + 1.35), yOf(0.98), 0.36 * k);
  // the border over it: running spirals, blue on white, red at their hearts
  const b0 = 1.4;
  c.fillStyle = FR.white;
  c.fillRect(0, yOf(FY1), w, (FY1 - b0) * k);
  c.fillStyle = FR.black;
  c.fillRect(0, yOf(b0 + 0.02), w, 0.022 * k);
  c.fillRect(0, yOf(FY1 - 0.005), w, 0.022 * k);
  spirals(c, -0.1 * k, w, yOf((b0 + FY1) / 2), 0.26 * k, 0.05 * k, FR.blue, FR.red, 0.022 * k);
  age(c, w, h, 91);
  flake(c, w, h, 93, 0.06);
  fresCache = cv;
  return cv;
}

// ——— the beast's marks on the wall ———

/** A pair of gouges his horns scored along the wall at (θ, Y), `len` units long at angle `ang` (radians, up from the
 * course line): each a tapering groove, deepest where the horn dug in, the plaster torn off round it down to the
 * stone, its upper inside in shadow and its lower lip lit. */
function gouge(ctx: Ctx, r: R, th: number, Y: number, ang: number, len: number): void {
  const k = ppu(th);
  for (const d of [-0.09, 0.09]) {
    const n = 12;
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = th * RC + Math.cos(ang) * len * t - Math.sin(ang) * d;
      const yy = Y + Math.sin(ang) * len * t + Math.cos(ang) * d + Math.sin(t * Math.PI) * 0.05;
      pts.push(RP(u / RC, yy));
    }
    const wd = (t: number) => k * (0.016 * (1 - t) ** 0.6 + 0.003);
    const side = (sgn: number, grow: number, jag: number) => pts.map(([x, y], i) => {
      const [ax, ay] = pts[Math.max(0, i - 1)];
      const [bx, by] = pts[Math.min(n, i + 1)];
      const l = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / l;
      const ny = (bx - ax) / l;
      const w = wd(i / n) * grow * (1 + (r() - 0.5) * jag);
      return [x + nx * w * sgn, y + ny * w * sgn] as Pt;
    });
    const poly = (grow: number, jag: number) => polyPath([...side(1, grow, jag), ...side(-1, grow, jag).reverse()]);
    // the plaster torn away round it (raw stone, paler), the groove, its shadowed upper inside, its lit lower lip
    ctx.fillStyle = rgba('#d6c29c', 0.8);
    poly(4.2, 1.4)(ctx);
    ctx.fillStyle = rgba('#b49a74', 0.6);
    poly(2.2, 0.8)(ctx);
    ctx.fill();
    ctx.fillStyle = rgba('#2a1c16', 0.65);
    poly(1, 0.3)(ctx);
    ctx.fill();
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#fff2d8', 0.55);
    ctx.lineWidth = Math.max(1, k * 0.007);
    const lo = side(ang > 0 ? -1 : 1, 1.05, 0);
    ctx.beginPath();
    lo.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1) : ctx.moveTo(x, y + 1)));
    ctx.stroke();
    ctx.restore();
    // the dust of it run down the wall under the end that dug in
    const [ex, ey] = pts[0];
    streaks(ctx, r, ex, ey, 0.05 * k, (0.12 + r() * 0.2) * k, '#e8dcc4', 0.12, 2);
  }
}

/** Where he rammed the wall: the plaster shattered off in a ragged starburst at (θ, Y), the stone under it cracked. */
function rammed(ctx: Ctx, r: R, th: number, Y: number, s: number): void {
  const k = ppu(th);
  const [cx, cy] = RP(th, Y);
  const pts: Pt[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * P2;
    const rr = s * k * (0.45 + r() * 0.6) * (i % 2 ? 0.7 : 1);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9]);
  }
  const path = polyPath(pts);
  // the stone showing: freshly broken, paler, its edges in the plaster's shadow on the upper left, lit lower right
  ctx.fillStyle = '#cbb48e';
  path(ctx);
  ctx.fill();
  within(ctx, path, () => {
    lay(ctx, noiseMask(5, Math.round(th * 100), { cover: 0.4, soft: 0.2, col: '#8a7458', w: 30, h: 30 }), boxOfPts(pts, 0), 0.5);
    ctx.strokeStyle = rgba('#3a2a20', 0.5);
    ctx.lineWidth = k * 0.03;
    ctx.translate(-k * 0.012, -k * 0.012);
    path(ctx);
    ctx.stroke();
  });
  ctx.strokeStyle = rgba('#fff2d8', 0.5);
  ctx.lineWidth = Math.max(1, k * 0.008);
  ctx.save();
  ctx.translate(k * 0.008, k * 0.008);
  path(ctx);
  ctx.restore();
  ctx.stroke();
  // the cracks running out of it through the stone and plaster
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * P2 + r() * 0.6;
    crack(ctx, r, cx + Math.cos(a) * s * k * 0.4, cy + Math.sin(a) * s * k * 0.36, a, s * k * (0.8 + r() * 0.9), { col: '#2a1c14', lip: '#f4e8d0', w: Math.max(1, k * 0.01), a: 0.6, branch: 0.25 });
  }
  // the dust it shed, run down below it
  streaks(ctx, r, cx, cy + s * k * 0.4, s * k * 0.9, s * k * 1.4, '#e6dac4', 0.1, 4);
}

const GOUGES: [number, number, number, number][] = [[-0.9, 1.05, 0.35, 0.26], [-0.68, 0.9, -0.3, 0.3], [-0.2, 1.12, 0.25, 0.24], [0.27, 0.98, -0.35, 0.28], [0.58, 1.22, 0.3, 0.26], [0.72, 0.86, -0.2, 0.3], [0.97, 1.3, 0.35, 0.22]];
const RAMS: [number, number, number][] = [[-0.34, 1.0, 0.15], [0.31, 1.12, 0.13], [-0.76, 1.18, 0.12]];

// ——— the gate the youths were sent through ———

let doorCache: HTMLCanvasElement | null = null;

/** The two great doors, shut, as an elevation: oak planks, bronze bands and studs, ring handles; splintered and dented
 * where he has rammed them, hoof-scuffed at the foot. */
function doorsCanvas(): HTMLCanvasElement {
  if (doorCache) return doorCache;
  const k = 200;
  const { hw, h: gh } = MT.gate;
  const w = Math.round(hw * 2 * k);
  const h = Math.round(gh * k);
  const [cv, c] = makeCanvas(w, h);
  const r = rng(hashStr('mt:doors'));
  c.fillStyle = '#5e3e26';
  c.fillRect(0, 0, w, h);
  // the planks: each its own board, grain running up it, the joints dark
  const pw = w / 8;
  for (let i = 0; i < 8; i++) {
    const box = { x: i * pw, y: 0, w: pw, h };
    c.fillStyle = rgba(r() < 0.5 ? '#7a5434' : '#4a3020', 0.4 + r() * 0.3);
    c.fillRect(box.x, 0, pw, h);
    woodGrain(c, r, box, '#5e3e26', true, 0.7);
    c.fillStyle = rgba('#1a0e08', 0.7);
    c.fillRect(box.x + pw - 1.5, 0, 1.5, h);
    c.fillStyle = rgba('#c8a070', 0.18);
    c.fillRect(box.x, 0, 1, h);
  }
  grain(c, { x: 0, y: 0, w, h }, 'wood', 0.35, 1.2);
  // the bronze bands across both leaves, studded, and their shadows on the wood under them
  for (const Y of [0.22, 0.74, 1.24]) {
    const y = (gh - Y) * k;
    const bh = 0.07 * k;
    c.fillStyle = rgba('#1a0e08', 0.4);
    c.fillRect(0, y + bh * 0.5, w, bh * 0.45);
    const g = c.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
    g.addColorStop(0, BRONZE.lit);
    g.addColorStop(0.4, BRONZE.body);
    g.addColorStop(1, BRONZE.shade);
    c.fillStyle = g;
    c.fillRect(0, y - bh / 2, w, bh);
    lay(c, noiseMask(5, Math.round(Y * 100), { cover: 0.4, soft: 0.2, col: '#5aa08a', w: 60, h: 6 }), { x: 0, y: y - bh / 2, w, h: bh }, 0.5);
    for (let x = pw * 0.5; x < w; x += pw) {
      c.fillStyle = BRONZE.deep;
      c.beginPath();
      c.arc(x + 0.8, y + 0.8, bh * 0.22, 0, P2);
      c.fill();
      c.fillStyle = BRONZE.lit;
      c.beginPath();
      c.arc(x - 0.4, y - 0.4, bh * 0.16, 0, P2);
      c.fill();
    }
  }
  // the ring handles
  for (const d of [-1, 1]) {
    const x = w / 2 + d * pw * 0.9;
    const y = (gh - 0.95) * k;
    c.strokeStyle = BRONZE.deep;
    c.lineWidth = 0.035 * k;
    c.beginPath();
    c.arc(x, y + 0.1 * k, 0.1 * k, 0, P2);
    c.stroke();
    c.strokeStyle = BRONZE.body;
    c.lineWidth = 0.02 * k;
    c.stroke();
    c.fillStyle = BRONZE.shade;
    c.beginPath();
    c.arc(x, y, 0.04 * k, 0, P2);
    c.fill();
  }
  // where he rammed them: the planks torn open in long pale gashes along the grain, splinters lifted, the bronze bands
  // bent
  for (const [u, Y, s] of [[0.3, 0.98, 1], [0.7, 0.86, 0.85], [0.5, 0.48, 0.7]] as [number, number, number][]) {
    const x = u * w;
    const y = (gh - Y) * k;
    const len = 0.22 * k * s;
    for (let j = 0; j < 3; j++) {
      const gx = x + (j - 1) * 0.035 * k * s + (r() - 0.5) * 4;
      const l = len * (0.6 + r() * 0.5);
      const gw = 0.012 * k * s * (1.4 - Math.abs(j - 1) * 0.5);
      // the gash: raw wood, its lower end in shadow, a dark split down its middle
      c.fillStyle = rgba('#c89a68', 0.85);
      c.beginPath();
      c.moveTo(gx, y - l / 2);
      c.quadraticCurveTo(gx + gw * 1.6, y, gx + gw * 0.4, y + l / 2);
      c.quadraticCurveTo(gx - gw * 1.4, y, gx, y - l / 2);
      c.closePath();
      c.fill();
      c.strokeStyle = rgba('#2a1608', 0.7);
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(gx, y - l * 0.4);
      c.lineTo(gx + gw * 0.2, y + l * 0.4);
      c.stroke();
      // splinters lifted off its edges
      for (let i = 0; i < 3; i++) {
        const sy0 = y + (r() - 0.5) * l * 0.7;
        const d = r() < 0.5 ? -1 : 1;
        c.strokeStyle = rgba('#e0b888', 0.85);
        c.lineWidth = 1 + r();
        c.beginPath();
        c.moveTo(gx + d * gw * 0.6, sy0);
        c.lineTo(gx + d * (gw + 3 + r() * 5), sy0 - 4 - r() * 6);
        c.stroke();
      }
    }
  }
  // hoof scuffs and grime at the foot, the lintel's shadow at the top, both leaves darker towards the seam
  vfill(c, 0, h * 0.8, w, h * 0.2, [[0, 'rgba(30,18,10,0)'], [1, 'rgba(30,18,10,0.5)']]);
  vfill(c, 0, 0, w, h * 0.16, [[0, 'rgba(10,6,4,0.65)'], [1, 'rgba(10,6,4,0)']]);
  const sg = c.createLinearGradient(0, 0, w, 0);
  sg.addColorStop(0, 'rgba(10,6,4,0.3)');
  sg.addColorStop(0.42, 'rgba(10,6,4,0)');
  sg.addColorStop(0.58, 'rgba(10,6,4,0)');
  sg.addColorStop(1, 'rgba(10,6,4,0.35)');
  c.fillStyle = sg;
  c.fillRect(0, 0, w, h);
  // the seam between the leaves (its light is added later, over the shade)
  c.fillStyle = '#0c0604';
  c.fillRect(w / 2 - 1.5, 0, 3, h);
  doorCache = cv;
  return cv;
}

/** A Minoan column standing at bearing θ and distance r from Y0 to Y1: a red shaft tapering downwards, a black
 * cushion capital and an abacus. lit (0…1): how much of the key light reaches it. */
function redColumn(ctx: Ctx, th: number, r: number, Y0: number, Y1: number, r0: number, lit: number): void {
  const z = r * Math.cos(th);
  const X = r * Math.sin(th);
  const s = pz(z);
  const capH = 0.16;
  const top = Y1 - capH;
  const r1 = r0 * 1.32;
  const [bx, by] = P(X, Y0, z);
  const [, ty] = P(X, top, z);
  const shaft = polyPath([[bx - r0 * s, by], [bx - r1 * s, ty], [bx + r1 * s, ty], [bx + r0 * s, by]]);
  const g = ctx.createLinearGradient(bx - r1 * s, 0, bx + r1 * s, 0);
  g.addColorStop(0, mix(COLUMN.body, COLUMN.shade, 0.3 * (1 - lit)));
  g.addColorStop(0.24, mix(COLUMN.lit, COLUMN.body, 1 - lit));
  g.addColorStop(0.5, COLUMN.body);
  g.addColorStop(0.86, COLUMN.shade);
  g.addColorStop(1, mix(COLUMN.shade, '#8a90c0', 0.4));
  shaft(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, shaft, () => {
    const b = { x: bx - r1 * s, y: ty, w: r1 * s * 2, h: by - ty };
    lay(ctx, noiseMask(9, Math.round(th * 100), { cover: 0.16, soft: 0.06, col: '#b89880', w: 24, h: 140 }), b, 0.25);
    lay(ctx, drift('#e06a4a', '#4a1410', 5, Math.round(th * 31), 20, 80), b, 0.3);
    vfill(ctx, b.x, ty, b.w, b.h * 0.2, [[0, rgba(COLUMN.cap, 0.5)], [1, rgba(COLUMN.cap, 0)]]);
    // horn scrapes across its lower shaft
    for (let i = 0; i < 3; i++) {
      const y = by - b.h * (0.25 + i * 0.07);
      ctx.strokeStyle = rgba('#e8cfa8', 0.55);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(b.x, y);
      ctx.lineTo(b.x + b.w, y + s * 0.03);
      ctx.stroke();
    }
  });
  ctx.strokeStyle = '#2a1410';
  ctx.lineWidth = Math.max(1, s * 0.01);
  shaft(ctx);
  ctx.stroke();
  const [, cy1] = P(X, top + capH * 0.55, z);
  const [, cy2] = P(X, Y1, z);
  const cw = r1 * 1.55 * s;
  const cush = (c: Ctx) => {
    c.beginPath();
    c.moveTo(bx - r1 * s, ty);
    c.bezierCurveTo(bx - cw * 1.08, ty - (ty - cy1) * 0.2, bx - cw * 1.1, cy1 + (ty - cy1) * 0.1, bx - cw, cy1);
    c.lineTo(bx + cw, cy1);
    c.bezierCurveTo(bx + cw * 1.1, cy1 + (ty - cy1) * 0.1, bx + cw * 1.08, ty - (ty - cy1) * 0.2, bx + r1 * s, ty);
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
  ctx.stroke();
  ctx.fillStyle = '#2e2420';
  ctx.fillRect(bx - cw * 1.05, cy2, cw * 2.1, cy1 - cy2);
  ctx.strokeRect(bx - cw * 1.05, cy2, cw * 2.1, cy1 - cy2);
  ctx.fillStyle = LIME.dark;
  ctx.beginPath();
  ctx.ellipse(bx, by, r0 * s * 1.7, r0 * s * 0.45, 0, 0, P2);
  ctx.fill();
}

/** A bull's skull nailed over the gate at (x, y), s px per unit: the long pale face narrowing to the muzzle, dark
 * sockets, the horns sweeping out and up, a bronze spike through the brow. */
function bucranium(ctx: Ctx, x: number, y: number, s: number): void {
  // the horns behind it: thick at the root, curling up, dark-tipped
  for (const d of [-1, 1]) {
    const horn = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x + d * s * 0.06, y - s * 0.08);
      c.bezierCurveTo(x + d * s * 0.24, y - s * 0.07, x + d * s * 0.34, y - s * 0.1, x + d * s * 0.33, y - s * 0.26);
      c.quadraticCurveTo(x + d * s * 0.37, y - s * 0.1, x + d * s * 0.08, y + s * 0.0);
      c.closePath();
    };
    castShadow(ctx, horn, 4, 5, 0.45, '#1a1018');
    solid(ctx, horn, { x: x - s * 0.6, y: y - s * 0.4, w: s * 1.2, h: s * 0.5 }, 'stone', '#e6d6b0', { depth: 0.25, air: AIR, line: Math.max(1, s * 0.012), formSize: 4 });
    ctx.fillStyle = rgba('#7a6448', 0.6);
    ctx.beginPath();
    ctx.ellipse(x + d * s * 0.33, y - s * 0.23, s * 0.014, s * 0.03, d * -0.2, 0, P2);
    ctx.fill();
  }
  const skull = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - s * 0.1, y - s * 0.1);
    c.quadraticCurveTo(x, y - s * 0.14, x + s * 0.1, y - s * 0.1);
    c.quadraticCurveTo(x + s * 0.11, y + s * 0.06, x + s * 0.05, y + s * 0.2);
    c.quadraticCurveTo(x, y + s * 0.24, x - s * 0.05, y + s * 0.2);
    c.quadraticCurveTo(x - s * 0.11, y + s * 0.06, x - s * 0.1, y - s * 0.1);
    c.closePath();
  };
  castShadow(ctx, skull, 4, 5, 0.5, '#1a1018');
  solid(ctx, skull, { x: x - s * 0.12, y: y - s * 0.15, w: s * 0.24, h: s * 0.4 }, 'stone', '#ece0c4', { depth: 0.25, air: AIR, line: Math.max(1, s * 0.012), formSize: 5 });
  ctx.fillStyle = '#1a1210';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + d * s * 0.055, y - s * 0.0, s * 0.03, s * 0.035, 0, 0, P2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + d * s * 0.025, y + s * 0.19, s * 0.012, s * 0.02, 0, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = BRONZE.body;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.07, s * 0.018, 0, P2);
  ctx.fill();
}

function gate(ctx: Ctx, r: R): void {
  const { hw, h: gh } = MT.gate;
  const fw = 0.12 / RC;
  // the opening, its reveal dark (the wall's thickness, seen from below at the top)
  ringPath(-GTH, GTH, -0.02, gh)(ctx);
  ctx.fillStyle = '#1e1410';
  ctx.fill();
  // the doors, set back in the wall's thickness
  mapToRing(ctx, doorsCanvas(), -GTH, GTH, 0, gh, -GTH, GTH, RC + 0.12);
  // the stone frame: dressed jambs and a head, paler than the walling
  for (const [t0, t1] of [[-GTH - fw, -GTH], [GTH, GTH + fw]] as Pt[]) {
    const jp = ringPath(t0, t1, -0.02, gh + 0.02);
    jp(ctx);
    ctx.fillStyle = '#d6bc90';
    ctx.fill();
    within(ctx, jp, () => {
      surface(ctx, r, boxOfPts([RP(t0, gh, RC), RP(t1, 0, RC)], 2), '#d6bc90', { over: true, vary: 0.4, cells: 2, grain: 0.3, grainKind: 'speckle', seed: 51 });
      for (let Y = 0.36; Y < gh; Y += 0.36) {
        ctx.fillStyle = rgba('#2a1e18', 0.6);
        ringPath(t0, t1, Y - 0.008, Y + 0.008)(ctx);
        ctx.fill();
      }
    });
  }
  // the threshold step in front of the doors
  const ts = polyPath([RP(-GTH - fw, 0.07, RC - 0.2), RP(GTH + fw, 0.07, RC - 0.2), RP(GTH + fw, 0.07, RC + 0.12), RP(-GTH - fw, 0.07, RC + 0.12)]);
  ts(ctx);
  ctx.fillStyle = '#c4aa82';
  ctx.fill();
  within(ctx, ts, () => {
    // worn hollow by hooves, his scrapes on it
    lightPool(ctx, 960, RP(0, 0.07, RC - 0.05)[1], 60, 6, '#fff0d0', 0.2);
    for (let i = 0; i < 8; i++) {
      const x = 900 + r() * 120;
      const y = RP(0, 0.07, RC - 0.05)[1] + (r() - 0.5) * 6;
      ctx.strokeStyle = rgba('#3a2a20', 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8 + r() * 10, y + (r() - 0.5) * 2);
      ctx.stroke();
    }
  });
  ringPath(-GTH - fw, GTH + fw, 0, 0.07, RC - 0.2)(ctx);
  ctx.fillStyle = '#a08866';
  ctx.fill();
  chips(ctx, r, RP(-GTH, 0.07, RC - 0.2)[0], RP(GTH, 0.07, RC - 0.2)[0], RP(0, 0.07, RC - 0.2)[1], 7, '#c4aa82', 2.5);
  // the columns either side, the timber lintel over them (its soffit seen from below), the bull's skull over it
  for (const d of [-1, 1]) redColumn(ctx, d * (hw + 0.16) / RC, RC - 0.12, 0, gh, 0.075, d < 0 ? 0.3 : 0.5);
  const l0 = -(hw + 0.36) / RC;
  const l1 = (hw + 0.36) / RC;
  const soffit = polyPath([...Array.from({ length: 21 }, (_, i) => RP(l0 + ((l1 - l0) * i) / 20, gh, RC - 0.2)), ...Array.from({ length: 21 }, (_, i) => RP(l1 - ((l1 - l0) * i) / 20, gh, RC))]);
  soffit(ctx);
  ctx.fillStyle = '#2e2018';
  ctx.fill();
  const lp = ringPath(l0, l1, gh, gh + 0.1, RC - 0.2);
  lp(ctx);
  ctx.fillStyle = '#7a6046';
  ctx.fill();
  within(ctx, lp, () => {
    woodGrain(ctx, r, boxOfPts([RP(l0, gh + 0.1, RC - 0.2), RP(l1, gh, RC - 0.2)], 2), '#7a6046', false, 0.8);
    vfill(ctx, 900, RP(0, gh + 0.1, RC - 0.2)[1], 120, 4, [[0, 'rgba(255,230,190,0.3)'], [1, 'rgba(255,230,190,0)']]);
  });
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 1.4;
  lp(ctx);
  ctx.stroke();
  // the lintel's cast shadow down the wall under it, the doors' top in its shade
  shadeWith(ctx, boxOfPts([RP(l0, gh + 0.1, RC), RP(l1, gh - 0.3, RC)], 10), '#7a7090', (g) => {
    ringPath(l0 + 0.02, l1 + 0.04, gh - 0.14, gh)(g);
    g.fill();
  });
  const [bx, by] = RP(0, 1.74, RC - 0.05);
  bucranium(ctx, bx, by + 4, ppu(0, RC - 0.05) * 1.45);
}

// ——— the bull's-head spout over the trough ———

function spout(ctx: Ctx): void {
  const { th, Y } = MT.spout;
  const [x, y] = RP(th, Y, RC - 0.04);
  const s = ppu(th, RC - 0.04);
  // the stain the water has left down the wall under it, green with algae at the foot
  const [, fy] = RP(th, MT.trough.h, RC);
  const sg = ctx.createLinearGradient(0, y, 0, fy);
  sg.addColorStop(0, 'rgba(60,70,60,0.35)');
  sg.addColorStop(1, 'rgba(70,96,70,0.5)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.06, y);
  ctx.lineTo(x + s * 0.06, y);
  ctx.lineTo(x + s * 0.12, fy);
  ctx.lineTo(x - s * 0.12, fy);
  ctx.closePath();
  ctx.fill();
  // a stone boss in the wall the head is set in
  const boss = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, y - s * 0.02, s * 0.15, s * 0.17, 0, 0, P2);
  };
  castShadow(ctx, boss, 4, 6, 0.45, '#1a1018');
  solid(ctx, boss, boxOfPts([[x - s * 0.16, y - s * 0.2], [x + s * 0.16, y + s * 0.16]]), 'stone', '#c8b08a', { depth: 0.2, air: AIR, line: 1.2, formSize: 6 });
  // the head: a bronze bull, front on: broad brow, ears out, horns sweeping up, the muzzle coming at us, the water
  // from its mouth
  const bb = boxOfPts([[x - s * 0.3, y - s * 0.32], [x + s * 0.3, y + s * 0.14]]);
  for (const d of [-1, 1]) {
    const horn = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x + d * s * 0.05, y - s * 0.11);
      c.bezierCurveTo(x + d * s * 0.16, y - s * 0.14, x + d * s * 0.24, y - s * 0.17, x + d * s * 0.23, y - s * 0.3);
      c.quadraticCurveTo(x + d * s * 0.17, y - s * 0.15, x + d * s * 0.05, y - s * 0.07);
      c.closePath();
    };
    solid(ctx, horn, bb, 'chrome', d < 0 ? BRONZE.lit : BRONZE.body, { depth: 0.2, air: AIR, line: 1.2, formSize: 3, ink: '#2a1408' });
    const ear = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x + d * s * 0.06, y - s * 0.07);
      c.quadraticCurveTo(x + d * s * 0.15, y - s * 0.1, x + d * s * 0.17, y - s * 0.05);
      c.quadraticCurveTo(x + d * s * 0.12, y - s * 0.02, x + d * s * 0.06, y - s * 0.03);
      c.closePath();
    };
    solid(ctx, ear, bb, 'chrome', BRONZE.shade, { depth: 0.2, air: AIR, line: 1.1, formSize: 2, ink: '#2a1408' });
  }
  const head = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - s * 0.075, y - s * 0.12);
    c.quadraticCurveTo(x, y - s * 0.15, x + s * 0.075, y - s * 0.12);
    c.quadraticCurveTo(x + s * 0.085, y - s * 0.02, x + s * 0.055, y + s * 0.05);
    c.quadraticCurveTo(x + s * 0.06, y + s * 0.1, x, y + s * 0.11);
    c.quadraticCurveTo(x - s * 0.06, y + s * 0.1, x - s * 0.055, y + s * 0.05);
    c.quadraticCurveTo(x - s * 0.085, y - s * 0.02, x - s * 0.075, y - s * 0.12);
    c.closePath();
  };
  castShadow(ctx, head, 5, 5, 0.5, '#1a1018');
  solid(ctx, head, bb, 'chrome', BRONZE.body, { depth: 0.2, air: AIR, line: 1.4, formSize: 6, ink: '#2a1408' });
  within(ctx, head, () => {
    lay(ctx, noiseMask(4, 77, { cover: 0.4, soft: 0.2, col: '#5aa08a', w: 20, h: 20 }), bb, 0.5);
    // the brow lit from the left, the curls of the forelock, the muzzle's shine
    lightPool(ctx, x - s * 0.03, y - s * 0.08, s * 0.05, s * 0.03, '#ffd890', 0.35);
    lightPool(ctx, x - s * 0.015, y + s * 0.07, s * 0.03, s * 0.015, '#ffe0a0', 0.4);
  });
  ctx.fillStyle = '#1a0e08';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + d * s * 0.04, y - s * 0.04, s * 0.012, s * 0.008, d * 0.3, 0, P2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + d * s * 0.02, y + s * 0.07, s * 0.008, 0, P2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.095, s * 0.022, s * 0.01, 0, 0, P2);
  ctx.fill();
}

// ——— the wall ———

export const WALL_BOX = { x: 0, y: 0, w: W, h: TY + 2 };

function wall(ctx: Ctx, r: R): void {
  const box = WALL_BOX;
  const th0 = -TH_E;
  const th1 = TH_E;
  ctx.save();
  ringPath(th0, th1, -0.3, WH - COPE)(ctx);
  ctx.clip();
  // the stone, painted in the sun's light (the shade goes over it after)
  ctx.fillStyle = LIME.body;
  ctx.fillRect(0, 0, W, TY + 2);
  vfill(ctx, 0, 0, W, TY, [[0, rgba(LIME.lit, 0.7)], [0.5, rgba(LIME.body, 0)], [1, rgba(LIME.dark, 0.5)]]);
  surface(ctx, r, box, LIME.body, { over: true, vary: 0.45, cells: 6, mottle: 0.35, strokes: 0.35, strokeAng: Math.PI / 2, strokeLen: 110, strokeW: 5, grain: 0.25, grainKind: 'speckle', seed: 31 });
  ringMasonry(ctx, r, th0, th1, -0.3, WH - COPE, [LIME.lit, LIME.dark, '#c8ae86', '#e6cc9c', '#b8a07e', '#9a8a70'], 0.45);
  grain(ctx, box, 'speckle', 0.3, 1.4);
  lay(ctx, drift('#fff0d0', '#6a5440', 12, 35, 320, 200), box, 0.2);
  lay(ctx, noiseMask(46, 37, { cover: 0.16, soft: 0.04, col: '#4a3a2c', w: 520, h: 420 }), box, 0.3);
  for (const [th, Y] of [[-0.9, 1.75], [-0.4, 1.72], [0.62, 1.76], [0.95, 1.7]] as Pt[]) {
    const [mx, my] = RP(th, Y);
    masonMark(ctx, mx, my, 0.06 * ppu(th), 0.5);
  }
  // rain streaks down from the coping, lichen under it
  for (let i = 0; i < 70; i++) {
    const th = th0 + r() * (th1 - th0);
    const [x, y] = RP(th, WH - COPE);
    const k = ppu(th);
    streaks(ctx, r, x, y, 0.08 * k, (0.15 + r() * 0.5) * k, r() < 0.3 ? '#4a5a48' : '#4a3a30', 0.15, 2);
  }
  for (let i = 0; i < 160; i++) {
    const th = th0 + r() * (th1 - th0);
    const [lx, ly] = RP(th, WH - COPE - r() ** 1.6 * 0.3);
    const k = ppu(th);
    ctx.fillStyle = rgba(r() < 0.55 ? '#c8a050' : '#8a9a78', 0.25 + r() * 0.3);
    ctx.beginPath();
    ctx.ellipse(lx, ly, (0.01 + r() * 0.025) * k, (0.008 + r() * 0.015) * k, 0, 0, P2);
    ctx.fill();
  }
  // the rough stone behind the plaster, warm and darker, where it shows through the losses
  for (const [a, b] of [[th0, -GFRAME], [GFRAME, th1]] as Pt[]) {
    ringPath(a, b, FY0, FY1)(ctx);
    ctx.fillStyle = rgba('#7a6448', 0.55);
    ctx.fill();
  }
  // the fresco on its plaster, either side of the gate
  const fc = frescoRing();
  mapToRing(ctx, fc, th0, th1, FY0, FY1, th0, -GFRAME);
  mapToRing(ctx, fc, th0, th1, FY0, FY1, GFRAME, th1);
  // the timber tie-beam over it: grey weathered wood, split in places
  for (const [a, b] of [[th0, -GFRAME], [GFRAME, th1]] as Pt[]) {
    const bp = ringPath(a, b, BEAM[0], BEAM[1]);
    ctx.fillStyle = '#7a6448';
    bp(ctx);
    ctx.fill();
    within(ctx, bp, () => {
      for (let j = 0; j < 7; j++) {
        const Y = BEAM[0] + ((j + 0.5) / 7) * (BEAM[1] - BEAM[0]);
        ctx.fillStyle = rgba(j % 2 ? '#3a2a1c' : '#b8a080', 0.28);
        ringPath(a, b, Y - 0.004, Y + 0.004)(ctx);
        ctx.fill();
      }
      ctx.fillStyle = rgba('#d8c4a0', 0.35);
      ringPath(a, b, BEAM[1] - 0.015, BEAM[1])(ctx);
      ctx.fill();
      ctx.fillStyle = rgba('#20140c', 0.5);
      ringPath(a, b, BEAM[0], BEAM[0] + 0.02)(ctx);
      ctx.fill();
      for (let t = a + 0.12; t < b; t += 0.25 + r() * 0.2) {
        ctx.fillStyle = rgba('#1a100a', 0.7);
        ringPath(t, t + 0.004, BEAM[0] + 0.02, BEAM[1] - 0.02)(ctx);
        ctx.fill();
      }
    });
  }
  // stains under the beam, rising damp and grime at the foot
  for (let i = 0; i < 30; i++) {
    const th = th0 + r() * (th1 - th0);
    if (Math.abs(th) < GFRAME) continue;
    const [x, y] = RP(th, BEAM[0]);
    const k = ppu(th);
    streaks(ctx, r, x, y, 0.06 * k, (0.12 + r() * 0.3) * k, '#3a2a1e', 0.13, 2);
  }
  softly(ctx, box, (g) => {
    const [gx, gy0] = RP(0, 0.45);
    const [, gy1] = RP(0, 0);
    const gr = g.createLinearGradient(gx, gy0, gx, gy1 + 160);
    gr.addColorStop(0, 'rgba(40,40,36,0)');
    gr.addColorStop(1, 'rgba(40,40,36,0.55)');
    g.fillStyle = gr;
    ringPath(th0, th1, -0.3, 0.45)(g);
    g.fill();
  }, 0.25);
  // the plinth: a projecting foot course, its top lit, its face scuffed by hooves
  ringPath(th0, th1, -0.3, 0.12, RC - 0.04)(ctx);
  ctx.fillStyle = rgba('#8a765a', 0.9);
  ctx.fill();
  ringPath(th0, th1, 0.105, 0.125, RC - 0.04)(ctx);
  ctx.fillStyle = rgba('#f0dcb4', 0.45);
  ctx.fill();
  for (let i = 0; i < 40; i++) {
    const th = th0 + r() * (th1 - th0);
    const [x, y] = RP(th, 0.02 + r() * 0.08, RC - 0.04);
    ctx.fillStyle = rgba(r() < 0.5 ? '#3a2a20' : '#e0ccaa', 0.35);
    ctx.fillRect(x, y, 3 + r() * 8, 1.2);
  }
  // his marks: pairs of horn gouges, and where he rammed it
  for (const [th, Y, ang, len] of GOUGES) gouge(ctx, r, th, Y, ang, len);
  for (const [th, Y, s] of RAMS) rammed(ctx, r, th, Y, s);
  ctx.restore();

  // ——— the gate and the spout ———
  gate(ctx, r);
  spout(ctx);

  // ——— the light ———
  const sh = (g: Ctx) => {
    g.beginPath();
    const n = 120;
    for (let i = 0; i <= n; i++) {
      const th = th0 + ((th1 - th0) * i) / n;
      const [x, y] = RP(th, shadowY(th));
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.lineTo(W + 20, TY + 4);
    g.lineTo(-20, TY + 4);
    g.closePath();
  };
  shadeWith(ctx, { x: 0, y: 0, w: W, h: TY + 2 }, SHADE, (g) => {
    ringPath(th0, th1, -0.5, WH + 0.01)(g);
    g.clip();
    sh(g);
    g.fill();
    // the horns along the left of the ring throw thin spikes of shadow up from the line
    for (let th = -0.2; th < TH_E; th += 0.21) {
      const Y = shadowY(th);
      for (const dt of [-0.012, 0.012]) {
        polyPath([RP(th + dt - 0.006, Y - 0.02), RP(th + dt, Y + 0.1), RP(th + dt + 0.006, Y - 0.02)])(g);
        g.fill();
      }
    }
  }, 0.3);
  // the sun's warmth on what it reaches
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const th = th0 + ((th1 - th0) * i) / 120;
    const [x, y] = RP(th, shadowY(th));
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.lineTo(W + 20, -20);
  ctx.lineTo(-20, -20);
  ctx.closePath();
  ctx.clip();
  ringPath(th0, th1, 0, WH)(ctx);
  ctx.clip();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = rgba(SUN, 0.6);
  ctx.fillRect(0, 0, W, TY);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = rgba('#ffb868', 0.16);
  ctx.fillRect(0, 0, W, TY);
  ctx.restore();
  // the gold the lit wall bounces into the shade below it all round the ring, the floor's warm light up the dado
  softly(ctx, box, (g) => {
    ringPath(-0.25, th1, 0.55, 1.5)(g);
    g.fillStyle = 'rgba(255,190,120,0.07)';
    g.fill();
  }, 0.25, 'screen');
  softly(ctx, box, (g) => {
    ringPath(th0, -0.2, 0.9, WH - COPE)(g);
    const [, ga] = RP(-0.7, WH);
    const [, gb] = RP(-0.7, 0.8);
    const gr = g.createLinearGradient(0, ga, 0, gb);
    gr.addColorStop(0, 'rgba(255,176,104,0.12)');
    gr.addColorStop(1, 'rgba(255,176,104,0)');
    g.fillStyle = gr;
    g.fill();
  }, 0.25, 'screen');

  // ——— the coping and its horns ———
  const cp = ringPath(th0, th1, WH - COPE, WH);
  const cg = ctx.createLinearGradient(760, 0, 860, 0);
  cg.addColorStop(0, '#8e88a0');
  cg.addColorStop(1, '#f0d6a6');
  cp(ctx);
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.fillStyle = rgba('#2a1c24', 0.6);
  ringPath(th0, th1, WH - COPE - 0.03, WH - COPE + 0.012)(ctx);
  ctx.fill();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const [x, y] = RP(th0 + ((th1 - th0) * i) / 120, WH);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.strokeStyle = rgba('#fff0c8', 0.75);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();
  for (let th = -1.05; th <= 1.06; th += 0.21) {
    const pts = HORNS.map(([u, v]) => RP(th + ((u - 0.5) * 0.34) / RC, WH - 0.02 + v * 0.22));
    const k = ppu(th);
    const [bx0, by0] = RP(th, WH - 0.01);
    lightPool(ctx, bx0 + k * 0.02, by0, k * 0.2, k * 0.025, '#2a1c24', 0.45, 'source-over');
    hornsPaint(ctx, polyPath(pts), boxOfPts(pts), th > -0.3, Math.max(1, Math.min(3, k / 110)), 0.016 * k);
  }
  // the sun's bloom spilling over the left of the ring's top
  glowAt(ctx, 220, 40, 300, '#ffd89a', 0.1);

  // ——— the light the doors let through, the braziers' fire on the wall ———
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const [, s0] = RP(0, MT.gate.h - 0.03, RC + 0.12);
  const [, s1] = RP(0, 0, RC + 0.12);
  for (const [Y0, Y1, a] of [[0.04, 0.18, 0.75], [0.36, 0.62, 0.45], [0.86, 1.1, 0.35]] as [number, number, number][]) {
    const [, ya] = RP(0, Y1, RC + 0.12);
    const [, yb] = RP(0, Y0, RC + 0.12);
    const lg = ctx.createLinearGradient(0, ya, 0, yb);
    lg.addColorStop(0, 'rgba(255,214,150,0)');
    lg.addColorStop(0.5, `rgba(255,214,150,${a})`);
    lg.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(959.2, ya, 1.6, yb - ya);
  }
  ctx.restore();
  lightPool(ctx, 960, s1 - 2, 70, 5, '#ffcf8a', 0.3);
  void s0;
  for (const [th] of MT.braziers) {
    const [wx, wy] = RP(th, 1.15);
    lightPool(ctx, wx, wy, ppu(th) * 0.75, ppu(th) * 0.95, '#ff9a48', 0.2);
  }
  // the foot of the wall in the floor's occlusion
  softly(ctx, box, (g) => {
    g.fillStyle = 'rgba(20,14,26,0.55)';
    ringPath(th0, th1, -0.05, 0.12)(g);
    g.fill();
  }, 0.25);
}

// ——— the floor of the court ———

export const FLOOR_BOX = { x: 0, y: 586, w: W, h: TY - 586 + 2 };
/** Ariadne's thread: in under the doors, across the court towards us (X at depth z), ending frayed short of us. */
const THREAD_END = 1.62;
const threadX = (z: number) => {
  const t = clamp01((RC + 0.1 - z) / (RC + 0.1 - THREAD_END));
  return Math.sin(t * 7.4 + 0.3) * 0.22 * Math.min(1, t * 4) + t * 0.42;
};

const floorPath = () => (c: Ctx) => {
  c.beginPath();
  for (let i = 0; i <= 120; i++) {
    const [x, y] = RP(-TH_E + (2 * TH_E * i) / 120, 0);
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.lineTo(W + 20, TY + 4);
  c.lineTo(-20, TY + 4);
  c.closePath();
};

/** A cloven hoof print in the dirt at (θ, r), turned by ang. */
function hoof(ctx: Ctx, th: number, r: number, ang: number, a: number): void {
  const [x, y] = RP(th, 0, r);
  const k = ppu(th, r);
  for (const d of [-1, 1]) {
    const hx = x + Math.cos(ang) * d * k * 0.022;
    ctx.fillStyle = rgba('#3a2a1e', a);
    ctx.beginPath();
    ctx.ellipse(hx, y, k * 0.02, k * 0.012, ang, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#e8d4b0', a * 0.6);
    ctx.beginPath();
    ctx.ellipse(hx + k * 0.004, y + k * 0.008, k * 0.016, k * 0.004, ang, 0, Math.PI);
    ctx.fill();
  }
}

function floor(ctx: Ctx, r: R): void {
  const b = FLOOR_BOX;
  const fp = floorPath();
  ctx.save();
  fp(ctx);
  ctx.clip();
  vfill(ctx, 0, b.y, W, b.h, [[0, '#b49670'], [1, '#a68862']]);
  surface(ctx, r, b, '#ae9068', { over: true, vary: 0.4, cells: 7, mottle: 0.4, strokes: 0.25, strokeAng: 0, strokeLen: 160, strokeW: 3, grain: 0.35, grainKind: 'speckle', seed: 41 });
  // the track he has worn round the wall, pacing: trodden dark and churned, and his prints in it
  softly(ctx, b, (g) => {
    g.fillStyle = 'rgba(96,72,52,0.4)';
    floorBand(-TH_E, TH_E, 2.72, 3.12)(g);
    g.fill();
    g.fillStyle = 'rgba(70,52,38,0.25)';
    floorBand(-TH_E, TH_E, 2.86, 3.02)(g);
    g.fill();
  }, 0.25);
  lay(ctx, noiseMask(30, 43, { cover: 0.3, soft: 0.08, col: '#5a4432', w: 480, h: 60 }), b, 0.35);
  for (let i = 0; i < 90; i++) {
    const th = -TH_E + r() * 2 * TH_E;
    const rr = 2.72 + r() * 0.4;
    hoof(ctx, th, rr, (r() - 0.5) * 0.6, 0.35 + r() * 0.25);
  }
  for (let i = 0; i < 30; i++) {
    const th = (r() - 0.5) * 2;
    const rr = 1.6 + r() * 1.1;
    hoof(ctx, th, rr, (r() - 0.5) * 1.2, 0.25 + r() * 0.2);
  }
  // the tracks of his charges from the gate towards us: the dirt torn up by his hooves in a run of divots, each a pit
  // with its far lip lit and its clod thrown out behind it
  for (const [x0, x1, seed] of [[-0.22, -0.95, 1], [0.2, 0.8, 2], [0.04, -0.28, 3]] as [number, number, number][]) {
    const rr = rng(hashStr('mt:run' + seed));
    for (let t = 0.04; t < 1; t += 0.05 + rr() * 0.04) {
      const z = RC - 0.3 - t * (RC - 0.3 - 1.48);
      const side = rr() < 0.5 ? -1 : 1;
      const X = x0 + (x1 - x0) * t + side * 0.05 + Math.sin(t * 5) * 0.03;
      const [px, py] = P(X, 0, z);
      const k = pz(z);
      const l = (0.028 + rr() * 0.025) * k;
      const ang = Math.atan2((P(x1, 0, 1.48)[1] - P(x0, 0, RC - 0.3)[1]) * 0.2, P(x1, 0, 1.48)[0] - P(x0, 0, RC - 0.3)[0]) * 0.3;
      ctx.fillStyle = rgba('#3a2818', 0.34);
      ctx.beginPath();
      ctx.ellipse(px, py, l, l * 0.3, ang, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#e4cca0', 0.35);
      ctx.beginPath();
      ctx.ellipse(px + l * 0.1, py + l * 0.16, l * 0.8, l * 0.1, ang, 0, Math.PI);
      ctx.fill();
      const cs = (0.012 + rr() * 0.014) * k;
      const [qx, qy] = P(X + side * 0.06, 0, z + 0.05);
      ctx.fillStyle = rgba('#6a5038', 0.65);
      ctx.beginPath();
      ctx.ellipse(qx, qy, cs, cs * 0.6, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#d8c09a', 0.4);
      ctx.beginPath();
      ctx.ellipse(qx - cs * 0.2, qy - cs * 0.25, cs * 0.6, cs * 0.25, 0, 0, P2);
      ctx.fill();
    }
  }
  // straw trodden into the dirt: thick by the trough on the right, scattered elsewhere; dung
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const right = r() < 0.55;
    const th = right ? 0.62 + r() * 0.5 : -TH_E + r() * 2 * TH_E;
    const rr = right ? 2.4 + r() * 0.85 : 1.6 + r() * 1.6;
    const [x, y] = RP(th, 0, rr);
    if (y > TY) continue;
    const k = ppu(th, rr);
    const a = r() * Math.PI;
    const l = (0.05 + r() * 0.08) * k;
    ctx.strokeStyle = rgba(r() < 0.5 ? '#e8c870' : '#b89a50', 0.45 + r() * 0.35);
    ctx.lineWidth = Math.max(0.8, k * 0.006);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.3);
    ctx.stroke();
  }
  ctx.restore();
  for (const [th, rr] of [[0.55, 2.5], [-0.62, 2.35], [0.22, 2.9], [-0.3, 2.95], [0.85, 2.3]] as Pt[]) {
    const [x, y] = RP(th, 0, rr);
    const k = ppu(th, rr);
    groundShadow(ctx, x + k * 0.01, y + k * 0.004, k * 0.06, k * 0.014, 0.4, '#1a1014');
    for (let j = 0; j < 3; j++) {
      const p = (c: Ctx) => {
        c.beginPath();
        c.ellipse(x + (j - 1) * k * 0.025, y - k * 0.008 - j * k * 0.004, k * (0.035 - j * 0.006), k * 0.016, 0, Math.PI, 0);
        c.closePath();
      };
      solid(ctx, p, { x: x - k * 0.08, y: y - k * 0.05, w: k * 0.16, h: k * 0.06 }, 'soot', '#4a3a2a', { depth: 0.3, air: AIR, line: false, formSize: 2 });
    }
  }
  // flakes of fresco and grit drifted at the wall's foot
  softly(ctx, b, (g) => {
    g.fillStyle = 'rgba(214,196,160,0.5)';
    floorBand(-TH_E, TH_E, RC - 0.22, RC)(g);
    g.fill();
  }, 0.25);
  for (let i = 0; i < 150; i++) {
    const th = -TH_E + r() * 2 * TH_E;
    if (Math.abs(th) < GFRAME) continue;
    const rr = RC - r() ** 2 * 0.3;
    const [px, py] = RP(th, 0, rr);
    const k = ppu(th, rr);
    ctx.fillStyle = r() < 0.4 ? rgba([FR.red, FR.blue, FR.ochre, '#6a2e24'][Math.floor(r() * 4)], 0.7) : rgba(r() < 0.5 ? '#e8dcc0' : '#7a6a58', 0.6);
    ctx.beginPath();
    ctx.ellipse(px, py, (0.008 + r() * 0.016) * k, (0.004 + r() * 0.006) * k, 0, 0, P2);
    ctx.fill();
  }
  // the light: all the floor is in the walls' shade
  shadeWith(ctx, b, SHADE_FLOOR, (g) => {
    fp(g);
    g.fill();
  });
  // Ariadne's thread (in the shade, but still red): in under the doors, across the court, its end frayed where it was cut
  const pts: [number, number, number][] = [];
  for (let z = RC + 0.1; z >= THREAD_END; z -= 0.02) {
    const [x, y] = P(threadX(z), 0.006, z);
    pts.push([x, y, pz(z)]);
  }
  ctx.save();
  ctx.lineCap = 'round';
  for (const [col, wk, oy] of [['rgba(20,10,10,0.35)', 0.024, 1.5], ['#6a1a16', 0.016, 0], ['#a8301e', 0.009, -0.4]] as [string, number, number][]) {
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
  const [ex, ey, ek] = pts[pts.length - 1];
  ctx.strokeStyle = '#a8301e';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + (i - 1.5) * ek * 0.012, ey + ek * 0.012 + i);
    ctx.stroke();
  }
  ctx.restore();
  // the walls' foot in occlusion, the sky's cool on the open floor
  softly(ctx, b, (g) => {
    g.fillStyle = 'rgba(20,14,30,0.5)';
    floorBand(-TH_E, TH_E, RC - 0.14, RC + 0.02)(g);
    g.fill();
  }, 0.25);
  // the braziers' firelight on the floor round them, the sun leaking under the doors
  for (const [th, rr] of MT.braziers) {
    const [fx, fy] = RP(th, 0, rr);
    const k = ppu(th, rr);
    lightPool(ctx, fx, fy, k * 1.1, k * 0.28, '#ff9a48', 0.3);
  }
  const [dx, dy] = RP(0, 0, RC - 0.1);
  lightPool(ctx, dx, dy + 6, 60, 8, '#ffcf8a', 0.25);
  ctx.restore();
}

// ——— the bones of the tribute, by the labrys ———

export const HEAP_BOX = { x: 170, y: 470, w: 360, h: TY + 2 - 470 };

/** A bone lying on the floor at (X, z), `len` long, turned ang. */
function bone(ctx: Ctx, X: number, z: number, len: number, ang: number, Y = 0.02): void {
  const k = pz(z);
  const [x, y] = P(X, Y, z);
  const c = Math.cos(ang);
  const sn = Math.sin(ang) * 0.4;
  const L = len * k;
  const rr = 0.015 * k;
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
  solid(ctx, p, { x: x - L, y: y - rr * 2, w: L * 2, h: rr * 4 }, 'stone', '#c8bca2', { depth: 0.3, air: AIR, line: Math.max(1, k * 0.007), formSize: 2 });
}

/** A skull at (X, z), its jaw gone, turned to look this way or that (lean). */
function skull(ctx: Ctx, X: number, z: number, Y: number, lean: number): void {
  const k = pz(z);
  const [sx0, sy0] = P(X, Y + 0.06, z);
  const s = 0.07 * k;
  groundShadow(ctx, sx0 + s * 0.4, sy0 + s * 0.9, s * 1.3, s * 0.35, 0.5, '#1a1020');
  const cr = (c: Ctx) => {
    c.beginPath();
    c.ellipse(sx0, sy0 - s * 0.1, s, s * 0.88, lean * 0.2, Math.PI * 0.92, Math.PI * 2.08);
    c.quadraticCurveTo(sx0 + s * 0.8, sy0 + s * 0.7, sx0 + s * 0.45, sy0 + s * 0.8);
    c.lineTo(sx0 - s * 0.45, sy0 + s * 0.8);
    c.quadraticCurveTo(sx0 - s * 0.8, sy0 + s * 0.7, sx0 - s, sy0 - s * 0.1);
    c.closePath();
  };
  solid(ctx, cr, { x: sx0 - s, y: sy0 - s, w: s * 2, h: s * 2 }, 'stone', '#cdc0a6', { depth: 0.3, air: AIR, line: Math.max(1, k * 0.008), formSize: s * 0.5 });
  ctx.fillStyle = '#1a1210';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx0 + (d + lean * 0.3) * s * 0.38, sy0 + s * 0.12, s * 0.22, s * 0.26, 0, 0, P2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(sx0 + lean * s * 0.1, sy0 + s * 0.36);
  ctx.lineTo(sx0 - s * 0.12 + lean * s * 0.1, sy0 + s * 0.6);
  ctx.lineTo(sx0 + s * 0.12 + lean * s * 0.1, sy0 + s * 0.6);
  ctx.fill();
}

function heap(ctx0: Ctx): void {
  inShade(ctx0, HEAP_BOX, (ctx) => heapPaint(ctx), '#4a4c86');
}

function heapPaint(ctx: Ctx): void {
  const thc = -0.84;
  const zc = 2.75 * Math.cos(thc);
  const Xc = 2.75 * Math.sin(thc);
  // an ox-hide figure-of-eight shield, split, fallen on its back at the heap's foot and propped on a bone (seen low
  // across the floor, foreshortened)
  const at = (u: number, v: number): Pt => RP(-0.86 + (u * 0.17 + (v - 0.5) * 0.12) / 2.9, 0.02 + v * 0.16, 2.62 + v * 0.42);
  // its outline: two lobes, the upper a little narrower, pinched in at the waist
  const hw = (v: number) => {
    const lobe = v < 0.52 ? Math.sin((v / 0.52) * Math.PI) : 0.9 * Math.sin(((v - 0.52) / 0.48) * Math.PI);
    return 0.5 + 0.5 * Math.max(0, lobe) ** 0.7;
  };
  const outline: Pt[] = [];
  for (let i = 0; i <= 40; i++) outline.push(at(hw(i / 40), i / 40));
  for (let i = 40; i >= 0; i--) outline.push(at(-hw(i / 40), i / 40));
  const upper = outline;
  const lower: Pt[] = [];
  const shield = polyPath(outline);
  const sb = boxOfPts([...upper, ...lower], 6);
  castShadow(ctx, shield, 6, 8, 0.5, '#140c1c');
  solid(ctx, shield, sb, 'leather', '#b89068', { depth: 0.35, air: AIR, line: 1.6, formSize: 8 });
  // the rim of hide sewn round it, and its spine (the wooden rib down the middle)
  ctx.strokeStyle = rgba('#6a4a30', 0.7);
  ctx.lineWidth = 2;
  shield(ctx);
  ctx.stroke();
  within(ctx, shield, () => {
    const rr = rng(hashStr('mt:shield'));
    for (let i = 0; i < 8; i++) {
      const [px, py] = at((rr() - 0.5) * 1.6, 0.1 + rr() * 0.85);
      ctx.fillStyle = rgba(rr() < 0.5 ? '#efe4cc' : '#4a2a18', 0.85);
      ctx.beginPath();
      ctx.ellipse(px, py, 4 + rr() * 6, 5 + rr() * 7, rr(), 0, P2);
      ctx.fill();
    }
    const [s0x, s0y] = at(0, 0.98);
    const [s1x, s1y] = at(0, 0.03);
    ctx.strokeStyle = rgba('#6a4a2a', 0.8);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s0x, s0y);
    ctx.lineTo(s1x, s1y);
    ctx.stroke();
    ctx.strokeStyle = rgba('#e8cfa0', 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(s0x - 1.5, s0y);
    ctx.lineTo(s1x - 1.5, s1y);
    ctx.stroke();
    // the split his horn tore down it
    const [ax, ay] = at(0.1, 0.98);
    const [bx2, by2] = at(-0.2, 0.3);
    ctx.strokeStyle = '#1a0e0a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo((ax + bx2) / 2 + 4, (ay + by2) / 2);
    ctx.lineTo(bx2, by2);
    ctx.stroke();
  });
  // the heap: a low mound of earth and straw, the bones on it and spilled round it
  const [mx, my] = P(Xc, 0, zc);
  const k = pz(zc);
  groundShadow(ctx, mx + k * 0.05, my + k * 0.02, k * 0.42, k * 0.08, 0.6, '#140c18');
  const mound = (c: Ctx) => {
    c.beginPath();
    c.moveTo(mx - k * 0.4, my + k * 0.02);
    c.bezierCurveTo(mx - k * 0.3, my - k * 0.12, mx + k * 0.15, my - k * 0.16, mx + k * 0.42, my + k * 0.02);
    c.closePath();
  };
  solid(ctx, mound, { x: mx - k * 0.45, y: my - k * 0.2, w: k * 0.9, h: k * 0.25 }, 'stone', '#8a7258', { depth: 0.3, air: AIR, line: false, formSize: 6 });
  const rb = rng(hashStr('mt:bones'));
  for (let i = 0; i < 8; i++) {
    const t = rb();
    bone(ctx, Xc + (t - 0.5) * 0.7, zc + (rb() - 0.5) * 0.25, 0.12 + rb() * 0.16, (rb() - 0.5) * 2.6, 0.02 + Math.max(0, 0.1 - Math.abs(t - 0.45) * 0.25));
  }
  // dirt and straw drifted over them
  softly(ctx, HEAP_BOX, (g) => {
    for (let i = 0; i < 7; i++) {
      const [dx, dy] = P(Xc + (rb() - 0.5) * 0.7, 0, zc + (rb() - 0.5) * 0.2);
      g.fillStyle = 'rgba(150,122,90,0.8)';
      g.beginPath();
      g.ellipse(dx, dy - 2, k * (0.05 + rb() * 0.06), k * 0.018, 0, Math.PI, 0);
      g.fill();
    }
  }, 0.5);
  // ribs: a curl of thin arcs
  const [rx, ry] = P(Xc + 0.15, 0.06, zc - 0.05);
  ctx.strokeStyle = rgba('#e0d4bc', 0.9);
  ctx.lineWidth = Math.max(1, k * 0.009);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(rx + i * k * 0.028, ry, k * 0.07, k * 0.022, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  skull(ctx, Xc - 0.12, zc - 0.08, 0.08, 0.4);
  skull(ctx, Xc + 0.18, zc + 0.12, 0.05, -0.5);
  // a spear shaft snapped across the heap, its bronze head
  const [s0x, s0y] = P(Xc - 0.4, 0.05, zc - 0.3);
  const [s1x, s1y] = P(Xc + 0.3, 0.14, zc + 0.1);
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(s0x, s0y);
  ctx.lineTo(s1x, s1y);
  ctx.stroke();
  ctx.strokeStyle = '#8a6a44';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.fillStyle = BRONZE.body;
  ctx.beginPath();
  ctx.moveTo(s0x, s0y);
  ctx.lineTo(s0x - 16, s0y + 4);
  ctx.lineTo(s0x - 4, s0y - 4);
  ctx.closePath();
  ctx.fill();
}

// ——— the labrys: its stand (still), and the axe (moving) ———

const LBY = MT.labrys;
const LX = LBY.r * Math.sin(LBY.th);
const LZ = LBY.r * Math.cos(LBY.th);
export const STAND_BOX = (() => boxOfPts([RP(LBY.th - 0.32 / LBY.r, LBY.sock + 0.02, LBY.r + 0.3), RP(LBY.th + 0.32 / LBY.r, 0, LBY.r - 0.32), RP(LBY.th - 0.32 / LBY.r, 0, LBY.r - 0.32), RP(LBY.th + 0.4 / LBY.r, 0, LBY.r)], 14))();

/** A block standing on the floor at bearing θ and distance r, facing the middle of the court: ht across, hr deep (half
 * sizes), from Y0 to Y1. Seen from the middle its sides are edge-on: its front and top show. */
function block(ctx: Ctx, th: number, r: number, ht: number, hr: number, Y0: number, Y1: number, base: string): void {
  const dt = ht / r;
  const front = ringPath(th - dt, th + dt, Y0, Y1, r - hr);
  const top = polyPath([RP(th - dt, Y1, r - hr), RP(th + dt, Y1, r - hr), RP(th + dt, Y1, r + hr), RP(th - dt, Y1, r + hr)]);
  const bb = boxOfPts([RP(th - dt, Y1, r + hr), RP(th + dt, Y0, r - hr), RP(th - dt, Y0, r - hr)], 2);
  const rr = rng(hashStr('mt:blk' + ht));
  // the front: weathered limestone, its top arris lit, falling into occlusion at its foot, its left edge catching the
  // light and its right in shade (an opaque ground first: the material's paint is partly see-through)
  for (const [p, col] of [[front, base], [top, shade(base, 0.18)]] as [(c: Ctx) => void, string][]) {
    p(ctx);
    ctx.fillStyle = col;
    ctx.fill();
  }
  solid(ctx, front, bb, 'stone', base, { depth: 0.2, air: AIR, line: 1.3, formSize: 4 });
  within(ctx, front, () => {
    surface(ctx, rr, bb, base, { over: true, vary: 0.45, cells: 2, mottle: 0.4, grain: 0.3, grainKind: 'speckle', seed: Math.round(ht * 100) });
    const [, ya] = RP(th, Y1, r - hr);
    const [xa, yb] = RP(th - dt, Y0, r - hr);
    const [xb] = RP(th + dt, Y0, r - hr);
    vfill(ctx, bb.x, ya, bb.w, yb - ya, [[0, 'rgba(255,240,210,0.25)'], [0.15, 'rgba(255,240,210,0)'], [0.7, 'rgba(20,14,20,0)'], [1, 'rgba(20,14,20,0.4)']]);
    const hg = ctx.createLinearGradient(xa, 0, xb, 0);
    hg.addColorStop(0, 'rgba(255,240,210,0.18)');
    hg.addColorStop(0.2, 'rgba(255,240,210,0)');
    hg.addColorStop(0.8, 'rgba(20,14,30,0)');
    hg.addColorStop(1, 'rgba(20,14,30,0.3)');
    ctx.fillStyle = hg;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    for (let i = 0; i < 3; i++) streaks(ctx, rr, xa + rr() * (xb - xa), ya, 10, (yb - ya) * 0.8, '#4a3a2c', 0.15, 2);
  });
  solid(ctx, top, bb, 'stone', shade(base, 0.18), { depth: 0.2, air: AIR, line: 1.3, formSize: 4 });
  const [x0, yy] = RP(th - dt, Y1, r - hr);
  const [x1] = RP(th + dt, Y1, r - hr);
  chips(ctx, rr, x0, x1, yy, 5, base, 2.5);
  // the next step's foot in occlusion on this one's top
  crevice(ctx, x0, x1, yy - 1, -4, 0.3, '#1a1220');
}

function stand(ctx0: Ctx): void {
  inShade(ctx0, STAND_BOX, (ctx) => standPaint(ctx));
}

function standPaint(ctx: Ctx): void {
  const [fx, fy] = P(LX, 0, LZ);
  const k = pz(LZ);
  groundShadow(ctx, fx + k * 0.08, fy + k * 0.02, k * 0.5, k * 0.1, 0.7, '#140c18');
  block(ctx, LBY.th, LBY.r, 0.3, 0.3, 0, 0.12, '#9c8666');
  block(ctx, LBY.th, LBY.r, 0.22, 0.22, 0.12, 0.24, '#a89070');
  block(ctx, LBY.th, LBY.r, 0.14, 0.14, 0.24, LBY.sock, '#b09878');
  // a votive cup left on the second step
  const [cx, cy] = RP(LBY.th + 0.16 / LBY.r, 0.24, LBY.r - 0.25);
  ctx.fillStyle = '#7a3a24';
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 9);
  ctx.lineTo(cx + 5, cy - 9);
  ctx.lineTo(cx + 3, cy);
  ctx.lineTo(cx - 3, cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a1410';
  ctx.lineWidth = 1;
  ctx.stroke();
}

const [SOCK_X, SOCK_Y] = P(LX, LBY.sock, LZ);
const LABRYS_TOP = Math.floor(P(LX, LBY.top + 0.06, LZ)[1] - 6);
export const LABRYS_BOX = { x: Math.floor(SOCK_X - 130), y: LABRYS_TOP, w: 260, h: Math.ceil(SOCK_Y + 8 - LABRYS_TOP) };

/** The great double axe: a sheet-bronze head, its blades curved like crescents, chased with spirals, gilt along their
 * edges; on a shaft wrapped with bronze bands, votive ribbons tied under the head. Its blades stand above the wall in
 * the sun (lit from the left, a gold rim), the shaft goes down into the shade. */
function labrysBig(ctx: Ctx): void {
  const k = pz(LZ);
  const [hx, hy] = P(LX, LBY.head, LZ);
  const [, ty] = P(LX, LBY.top, LZ);
  const sw = 0.035 * k;
  // the shaft
  const shaft = polyPath([[SOCK_X - sw, SOCK_Y], [SOCK_X - sw * 0.8, ty], [SOCK_X + sw * 0.8, ty], [SOCK_X + sw, SOCK_Y]]);
  solid(ctx, shaft, { x: SOCK_X - sw * 2, y: ty, w: sw * 4, h: SOCK_Y - ty }, 'wood', '#6a4a2c', { depth: 0.15, line: 1.6, formSize: 4 });
  for (const Y of [0.55, 1.1, 1.62]) {
    const [, by] = P(LX, Y, LZ);
    const band = polyPath([[SOCK_X - sw * 1.15, by - k * 0.02], [SOCK_X + sw * 1.15, by - k * 0.02], [SOCK_X + sw * 1.15, by + k * 0.02], [SOCK_X - sw * 1.15, by + k * 0.02]]);
    solid(ctx, band, { x: SOCK_X - sw * 2, y: by - k * 0.03, w: sw * 4, h: k * 0.06 }, 'chrome', BRONZE.body, { depth: 0.15, line: 1.2, formSize: 2 });
  }
  // the votive ribbons, hanging from under the head
  for (const [dx, col, len] of [[-1, FR.red, 0.5], [0.6, FR.blue, 0.42], [1.4, '#e8dcc0', 0.36]] as [number, string, number][]) {
    const [, ry] = P(LX, LBY.head - 0.3, LZ);
    const x0 = SOCK_X + dx * sw * 0.7;
    ctx.strokeStyle = shade(col, -0.35);
    ctx.lineWidth = k * 0.026;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, ry);
    ctx.bezierCurveTo(x0 + dx * 6, ry + len * k * 0.3, x0 - dx * 4, ry + len * k * 0.6, x0 + dx * 8, ry + len * k);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = k * 0.018;
    ctx.stroke();
  }
  // the head: two pairs of crescent blades, back to back
  const bw = 0.3 * k;
  const bh = 0.2 * k;
  const blade = (d: number) => (c: Ctx) => {
    c.beginPath();
    c.moveTo(hx + d * sw * 0.8, hy - bh * 0.22);
    c.quadraticCurveTo(hx + d * bw * 0.45, hy - bh * 0.3, hx + d * bw * 0.86, hy - bh);
    c.quadraticCurveTo(hx + d * bw * 1.08, hy, hx + d * bw * 0.86, hy + bh);
    c.quadraticCurveTo(hx + d * bw * 0.45, hy + bh * 0.3, hx + d * sw * 0.8, hy + bh * 0.22);
    c.closePath();
  };
  for (const d of [-1, 1]) {
    const p = blade(d);
    const bb = { x: hx - bw * 1.1, y: hy - bh * 1.1, w: bw * 2.2, h: bh * 2.2 };
    solid(ctx, p, bb, 'chrome', d < 0 ? '#e0a64c' : '#b47a34', { depth: 0.1, line: 2.2, formSize: 14, ink: '#2a1408' });
    within(ctx, p, () => {
      lay(ctx, noiseMask(5, d < 0 ? 81 : 82, { cover: 0.3, soft: 0.2, col: '#5aa08a', w: 30, h: 20 }), bb, 0.35);
      spirals(ctx, hx + d * bw * 0.25 - bw * 0.25, hx + d * bw * 0.25 + bw * 0.25, hy, bw * 0.2, bw * 0.07, rgba(BRONZE.deep, 0.55), rgba(BRONZE.lit, 0.4), Math.max(1, k * 0.006));
      // the gilt edge
      ctx.strokeStyle = rgba('#ffe29a', d < 0 ? 0.9 : 0.5);
      ctx.lineWidth = k * 0.03;
      ctx.beginPath();
      ctx.moveTo(hx + d * bw * 0.86, hy - bh);
      ctx.quadraticCurveTo(hx + d * bw * 1.08, hy, hx + d * bw * 0.86, hy + bh);
      ctx.stroke();
    });
  }
  // the socket where the head meets the shaft, a bronze cap on top
  const sock = polyPath([[hx - sw * 1.3, hy - bh * 0.34], [hx + sw * 1.3, hy - bh * 0.34], [hx + sw * 1.3, hy + bh * 0.34], [hx - sw * 1.3, hy + bh * 0.34]]);
  solid(ctx, sock, { x: hx - sw * 2, y: hy - bh * 0.4, w: sw * 4, h: bh * 0.8 }, 'chrome', BRONZE.body, { depth: 0.1, line: 1.6, formSize: 3 });
  // the sun on the blades from the upper left (a gold rim on their left edges), and the shade over the lower shaft
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, hx - bw * 0.7, hy - bh * 0.5, bw * 0.5, '#ffd890', 0.25);
  ctx.restore();
  const [, wy] = P(LX, shadowY(LBY.th) - 0.6, LZ);
  shadeWith(ctx, LABRYS_BOX, SHADE, (g) => {
    g.save();
    shaft(g);
    g.clip();
    g.fillRect(0, wy, 400, 900);
    g.restore();
  });
  void ty;
}

// ——— the trough ———

const TR = MT.trough;
export const TROUGH_BOX = (() => {
  const b = boxOfPts([RP(TR.th0 - 0.02, TR.h + 0.02, TR.r0), RP(TR.th1 + 0.02, 0, TR.r0), RP(TR.th0, TR.h, TR.r1)], 14);
  return { x: b.x, y: b.y, w: Math.min(W - b.x, b.w), h: Math.min(TY + 2 - b.y, b.h) };
})();

const troughWater = () => {
  const { th0, th1, r0, r1, h } = TR;
  return polyPath([...Array.from({ length: 13 }, (_, i) => RP(th0 + 0.01 + ((th1 - th0 - 0.02) * i) / 12, h - 0.02, r0 + 0.07)), ...Array.from({ length: 13 }, (_, i) => RP(th1 - 0.01 - ((th1 - th0 - 0.02) * i) / 12, h - 0.02, r1 - 0.07))]);
};

function trough(ctx: Ctx, r: R): void {
  inShade(ctx, TROUGH_BOX, (g) => troughPaint(g, r), '#5e62a8');
  // the water's glitter (it reflects the sunlit wall)
  const { th0, th1, r0, h } = TR;
  ctx.save();
  troughWater()(ctx);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const th = th0 + r() * (th1 - th0);
    const [x, y] = RP(th, h - 0.02, r0 + 0.1 + r() * 0.15);
    ctx.fillStyle = rgba('#fff0c8', 0.3 + r() * 0.3);
    ctx.fillRect(x, y, 3 + r() * 6, 1.2);
  }
  ctx.restore();
}

function troughPaint(ctx: Ctx, r: R): void {
  const { th0, th1, r0, r1, h } = TR;
  const front = ringPath(th0, th1, 0, h, r0);
  // its shadow on the floor and the wet ground round it
  const [gx, gy] = RP((th0 + th1) / 2, 0, r0);
  const k = ppu((th0 + th1) / 2, r0);
  softly(ctx, TROUGH_BOX, (g) => {
    g.fillStyle = 'rgba(30,24,30,0.5)';
    floorBand(th0 - 0.01, th1 + 0.03, r0 - 0.16, r0 + 0.04)(g);
    g.fill();
  }, 0.25);
  groundShadow(ctx, gx + k * 0.04, gy + 3, k * 0.5, k * 0.05, 0.7, '#120a18');
  // the back lip and the water (brimming, the sky in it), then the front face and its lip
  const water = troughWater();
  const back = polyPath([...Array.from({ length: 13 }, (_, i) => RP(th0 + ((th1 - th0) * i) / 12, h, r1 - 0.07)), ...Array.from({ length: 13 }, (_, i) => RP(th1 - ((th1 - th0) * i) / 12, h, r1))]);
  back(ctx);
  ctx.fillStyle = '#c0a880';
  ctx.fill();
  water(ctx);
  const wb = boxOfPts([RP(th0, h, r1), RP(th1, h, r0)], 2);
  const wg = ctx.createLinearGradient(0, wb.y, 0, wb.y + wb.h);
  wg.addColorStop(0, '#f4dcaa');
  wg.addColorStop(1, '#8a9cac');
  ctx.fillStyle = wg;
  ctx.fill();
  front(ctx);
  ctx.fillStyle = '#b09a74';
  ctx.fill();
  const fb = boxOfPts([RP(th0, h, r0), RP(th1, 0, r0)], 2);
  within(ctx, front, () => {
    surface(ctx, r, fb, '#b09a74', { over: true, vary: 0.45, cells: 3, mottle: 0.4, grain: 0.35, grainKind: 'speckle', seed: 61 });
    // a sunk panel carved in its face with a running spiral in low relief: the panel's upper inside edge in shadow,
    // its lower lip lit
    const pth0 = th0 + 0.014;
    const pth1 = th1 - 0.014;
    const panel = ringPath(pth0, pth1, 0.09, h - 0.1, r0);
    panel(ctx);
    ctx.fillStyle = rgba('#8a7458', 0.4);
    ctx.fill();
    const [px0, py0] = RP(pth0, h - 0.1, r0);
    const [, py1] = RP(pth1, 0.09, r0);
    ctx.fillStyle = rgba('#2a1e18', 0.45);
    ringPath(pth0, pth1, h - 0.12, h - 0.1, r0)(ctx);
    ctx.fill();
    ctx.fillStyle = rgba('#fff0d0', 0.35);
    ringPath(pth0, pth1, 0.09, 0.105, r0)(ctx);
    ctx.fill();
    ctx.fillRect(px0, py0, 1.5, py1 - py0);
    within(ctx, panel, () => {
      // a double axe carved in the middle of it
      const [lx, ly] = RP((pth0 + pth1) / 2, (h - 0.01) / 2, r0);
      ctx.globalAlpha = 0.35;
      labrys(ctx, lx + 1, ly + 1, (py1 - py0) * 0.8, '#fff0d0');
      ctx.globalAlpha = 0.45;
      labrys(ctx, lx, ly, (py1 - py0) * 0.8, '#6a5440');
      ctx.globalAlpha = 1;
    });
    // the green line where the water spills over under the spout, the damp darkening to the foot
    const [sx0] = RP(MT.spout.th - 0.02, 0, r0);
    const [sx1] = RP(MT.spout.th + 0.02, 0, r0);
    vfill(ctx, sx0, fb.y, sx1 - sx0, fb.h, [[0, 'rgba(60,96,64,0.55)'], [1, 'rgba(40,60,50,0.3)']]);
    vfill(ctx, fb.x, fb.y + fb.h * 0.5, fb.w, fb.h * 0.5, [[0, 'rgba(40,34,30,0)'], [1, 'rgba(40,34,30,0.45)']]);
    // its ends: the left arris lit, the right in shade
    const hg = ctx.createLinearGradient(fb.x, 0, fb.x + fb.w, 0);
    hg.addColorStop(0, 'rgba(255,240,210,0.25)');
    hg.addColorStop(0.06, 'rgba(255,240,210,0)');
    hg.addColorStop(0.92, 'rgba(20,14,30,0)');
    hg.addColorStop(1, 'rgba(20,14,30,0.35)');
    ctx.fillStyle = hg;
    ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
    for (let i = 0; i < 40; i++) {
      const th = th0 + r() * (th1 - th0);
      const [x, y] = RP(th, r() * h, r0);
      ctx.strokeStyle = rgba(r() < 0.5 ? '#6a5640' : '#f0dcb8', 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 4, y + 3);
      ctx.stroke();
    }
  });
  ctx.strokeStyle = '#3a2a20';
  ctx.lineWidth = 1.4;
  front(ctx);
  ctx.stroke();
  // the rim: a rounded lip standing proud of the face, lit along its top
  const rim = ringPath(th0 - 0.004, th1 + 0.004, h - 0.05, h + 0.005, r0 - 0.02);
  rim(ctx);
  ctx.fillStyle = '#d8c09a';
  ctx.fill();
  within(ctx, rim, () => vfill(ctx, fb.x, RP(th0, h + 0.005, r0 - 0.02)[1], fb.w, 14, [[0, 'rgba(255,244,220,0.5)'], [1, 'rgba(60,40,30,0.3)']]));
  ctx.stroke();
  const lip = polyPath([...Array.from({ length: 13 }, (_, i) => RP(th0 + ((th1 - th0) * i) / 12, h, r0)), ...Array.from({ length: 13 }, (_, i) => RP(th1 - ((th1 - th0) * i) / 12, h, r0 + 0.07))]);
  lip(ctx);
  ctx.fillStyle = '#c4ae88';
  ctx.fill();
  chips(ctx, r, RP(th0, h, r0)[0], RP(th1, h, r0)[0], RP((th0 + th1) / 2, h, r0 - 0.02)[1] + 3, 6, '#d8c09a', 2.5);
  // water spilled down its face under the spout
  const [wx, wy] = RP(MT.spout.th, h, r0 - 0.02);
  streaks(ctx, r, wx, wy, 0.05 * k, h * k * 0.9, '#3a4a40', 0.25, 3);
}

/** The stream, painted in the still (the live layer's moving stream replaces it). */
export const STREAM = (() => {
  const { th, Y } = MT.spout;
  const [x, y0] = RP(th, Y - 0.095, RC - 0.05);
  const [, y1] = RP(th, TR.h - 0.02, (TR.r0 + TR.r1) / 2);
  return { x, y0, y1, w: 34 };
})();

/** One frame of the stream (phase 0…1 loops): a rope of water falling from the spout's mouth, narrowing as it
 * speeds, wavering; bright beads of light running down it, its edges glinting; a crown of splash where it lands. */
function streamFrame(c: Ctx, ph: number, w: number, h: number): void {
  const cx = w / 2;
  const n = 24;
  const xAtY = (t: number) => cx + Math.sin(t * 9 - ph * P2 * 2) * 1.2 * t + t * t * 2.5;
  const wAt = (t: number) => 4.2 - t * 1.8 + Math.sin(t * 13 - ph * P2 * 3) * 0.5;
  c.save();
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    c.lineTo(xAtY(t) - wAt(t) / 2, t * (h - 10));
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    c.lineTo(xAtY(t) + wAt(t) / 2, t * (h - 10));
  }
  c.closePath();
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(200,214,220,0.8)');
  g.addColorStop(1, 'rgba(170,190,205,0.55)');
  c.fillStyle = g;
  c.fill();
  // the lit edge on the left (the sun's side), dark core on the right
  c.lineWidth = 1;
  c.strokeStyle = 'rgba(255,248,224,0.7)';
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    c.lineTo(xAtY(t) - wAt(t) / 2 + 0.6, t * (h - 10));
  }
  c.stroke();
  // beads of light running down it
  for (let j = 0; j < 6; j++) {
    const t = (ph + j / 6) % 1;
    const y = t * (h - 12);
    c.fillStyle = `rgba(255,252,236,${(0.9 * Math.sin(t * Math.PI)).toFixed(3)})`;
    c.beginPath();
    c.ellipse(xAtY(t), y, 1.4, 3 + t * 4, 0, 0, P2);
    c.fill();
  }
  // the splash crown where it lands
  const by = h - 8;
  for (let j = 0; j < 7; j++) {
    const a = Math.PI + ((j + 0.5) / 7) * Math.PI;
    const l = 5 + Math.sin(ph * P2 * 2 + j * 1.7) * 3;
    c.strokeStyle = 'rgba(240,244,240,0.7)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(cx + 2.5, by);
    c.lineTo(cx + 2.5 + Math.cos(a) * l * 1.4, by + Math.sin(a) * l);
    c.stroke();
  }
  c.fillStyle = 'rgba(240,248,250,0.6)';
  c.beginPath();
  c.ellipse(cx + 2.5, by + 1, 7, 2.2, 0, 0, P2);
  c.fill();
  c.restore();
}

function streamStill(ctx: Ctx): void {
  const { x, y0, y1, w } = STREAM;
  ctx.save();
  ctx.translate(x - w / 2, y0);
  streamFrame(ctx, 0.3, w, y1 - y0 + 8);
  ctx.restore();
}

// ——— the braziers ———

/** A bronze tripod brazier at (X, z) on the floor: a shallow bowl with a beaded lip and a band of running spirals,
 * three legs with lion's-paw feet, a ring bracing them; in the shade, its rim lit by its own fire (lit 0…1). */
function brazier(ctx: Ctx, X: number, z: number, lit: number): void {
  const k = pz(z);
  const Y = MT.bowlY;
  const R0 = 0.27;
  const legTop = Y - 0.26;
  const footR = 0.3;
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
  const [bx, by] = P(X, Y, z);
  const rx = R0 * k;
  const [, byl] = P(X, Y - 0.24, z);
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
    lay(ctx, noiseMask(5, Math.round(z * 100 + X * 10), { cover: 0.35, soft: 0.2, col: '#5aa08a', w: 40, h: 16 }), bb, 0.45);
    spirals(ctx, bb.x, bb.x + bb.w, by + (byl - by) * 0.35, rx * 0.32, rx * 0.1, rgba(BRONZE.deep, 0.7), rgba(BRONZE.lit, 0.5), Math.max(0.8, k * 0.006));
    vfill(ctx, bb.x, by - 4, bb.w, (byl - by) * 0.4, [[0, rgba('#1a0c08', 0.4)], [1, rgba('#1a0c08', 0)]]);
  });
  shadeWith(ctx, boxOfPts([[bb.x, bb.y], [legBox.x, legBox.y + legBox.h], [legBox.x + legBox.w, by]], 4), SHADE, (g) => {
    for (const p of [bowl, stem, knop, ...legs.map(legPath)]) {
      p(g);
      g.fill();
    }
  });
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
  ctx.save();
  bowl(ctx);
  ctx.clip();
  vfill(ctx, bb.x, by - 2, bb.w, (byl - by) * 0.5, [[0, rgba('#ff9a40', 0.35 * lit)], [1, rgba('#ff9a40', 0)]]);
  ctx.restore();
}

const bzXZ = (i: number): Pt => {
  const [th, r] = MT.braziers[i];
  return [r * Math.sin(th), r * Math.cos(th)];
};
const brazierBox = (i: number) => {
  const [X, z] = bzXZ(i);
  return boxOfPts([P(X - 0.42, MT.bowlY + 0.1, z), P(X + 0.42, -0.08, z)], 6);
};

/** The flames painted in the still: the live layer's fires replace them. */
function fireStill(ctx: Ctx): void {
  for (let i = 0; i < 2; i++) {
    const [X, z] = bzXZ(i);
    const k = pz(z);
    const [x, y] = P(X, MT.bowlY, z);
    glowAt(ctx, x, y - k * 0.12, k * 0.45, '#ff9a40', 0.18);
    fireFrame(ctx, x, y + k * 0.01, k * 0.38, k * 0.36, 0.3 + i * 0.4, { tongues: 5, seed: 3 + i, cols: ['#ff4a12', '#ffa024', '#ffe8a0'] });
  }
}

// ——— the table: the court's threshold, one great slab of worn limestone ———

export const TABLE_BOX = { x: 0, y: TY, w: W, h: 1080 - TY };

function table(ctx: Ctx, r: R): void {
  const f = MT.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  const zf = zFront(f);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#7c6e5c'], [0.5, '#887a66'], [1, '#90826c']]);
  surface(ctx, r, box, '#857762', { over: true, vary: 0.35, cells: 5, mottle: 0.3, strokes: 0.2, strokeAng: 0, strokeLen: 280, strokeW: 4, grain: 0.06, grainKind: 'speckle', seed: 71 });
  lay(ctx, drift('#b8aa90', '#5a4e40', 5, 73, 160, 40), box, 0.3);
  // the stone's bedding: broad strata running along the slab, cream and grey-ochre, swelling and thinning, a little
  // cross-bedded; painted soft, then a few crisp stylolite seams (the jagged dark sutures limestone grows)
  softly(ctx, box, (g) => {
    for (let i = 0; i < 16; i++) {
      const z0 = ZB - r() * (ZB - zf);
      const y0 = yAt(z0);
      const sc = (y0 - HY0) / (TY - HY0);
      const th = (5 + r() * 16) * sc;
      const tilt = (r() - 0.5) * 0.025;
      const ph = r() * 10;
      g.fillStyle = rgba(r() < 0.5 ? (r() < 0.5 ? '#cfbe9a' : '#b8a88e') : r() < 0.5 ? '#5c4e3e' : '#6a5a52', 0.16 + r() * 0.14);
      g.beginPath();
      for (let x = -20; x <= W + 20; x += 40) g.lineTo(x, y0 + (x - 960) * tilt + Math.sin(x * 0.004 + ph) * 6 * sc);
      for (let x = W + 20; x >= -20; x -= 40) g.lineTo(x, y0 + (x - 960) * tilt + Math.sin(x * 0.004 + ph) * 6 * sc + th * (0.6 + 0.4 * Math.sin(x * 0.006 + ph * 2)));
      g.closePath();
      g.fill();
    }
  }, 0.5);
  ctx.save();
  ctx.lineJoin = 'round';
  for (let i = 0; i < 4; i++) {
    const z0 = ZB - (0.15 + r() * 0.75) * (ZB - zf);
    const y0 = yAt(z0);
    const sc = (y0 - HY0) / (TY - HY0);
    let x = r() * 300 - 100;
    const x1 = x + 500 + r() * 900;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    while (x < x1) {
      x += 3 + r() * 5;
      ctx.lineTo(x, y0 + (r() - 0.5) * 3.5 * sc + Math.sin(x * 0.01) * 3 * sc);
    }
    ctx.strokeStyle = rgba('#3a2e24', 0.22);
    ctx.lineWidth = 1.1 * sc;
    ctx.stroke();
  }
  ctx.restore();
  // pitting: the little hollows weather opens in limestone, each a dark pit with a lit lower rim
  for (let i = 0; i < 110; i++) {
    const x = r() * W;
    const y = TY + 8 + r() * (f - TY - 14);
    const sc = (y - HY0) / (TY - HY0);
    const s = (1.2 + r() * 3) * sc;
    ctx.fillStyle = rgba('#3a2e24', 0.22);
    ctx.beginPath();
    ctx.ellipse(x, y, s * 1.3, s * 0.6, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#f0e4cc', 0.16);
    ctx.beginPath();
    ctx.ellipse(x + s * 0.3, y + s * 0.5, s, s * 0.3, 0, 0, Math.PI);
    ctx.fill();
  }
  grain(ctx, box, 'speckle', 0.16, 1.3);
  // the slab's two joints with its neighbours (one great threshold stone in the middle)
  for (const X of [-2.3, 2.35]) {
    const sh = (g: Ctx) => {
      g.beginPath();
      g.moveTo(xAt(X, ZB), TY);
      g.lineTo(xAt(X, zf), f);
    };
    ctx.strokeStyle = rgba('#2a2018', 0.5);
    ctx.lineWidth = 2.4;
    sh(ctx);
    ctx.stroke();
    ctx.strokeStyle = rgba('#e8dcc4', 0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB) + 2, TY);
    ctx.lineTo(xAt(X, zf) + 2.5, f);
    ctx.stroke();
    // each side its own stone
    const side = X < 0 ? [-6, X] : [X, 6];
    ctx.fillStyle = rgba(X < 0 ? '#5a4c3c' : '#a89a80', 0.08);
    ctx.beginPath();
    ctx.moveTo(xAt(side[0], ZB), TY);
    ctx.lineTo(xAt(side[1], ZB), TY);
    ctx.lineTo(xAt(side[1], zf), f);
    ctx.lineTo(xAt(side[0], zf), f);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      const z = ZB - r() * (ZB - zf);
      chips(ctx, r, xAt(X, z) - 3, xAt(X, z) + 3, yAt(z), 1, '#857762', 2.5 * (yAt(z) - HY0) / (TY - HY0));
    }
  }
  // the hollow worn down the middle by hooves and feet: smoother and paler, a soft darker rim, his scratches in it
  softly(ctx, box, (g) => {
    g.save();
    g.translate(960, (TY + f) / 2 + 20);
    g.scale(1, 0.4);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 560);
    gr.addColorStop(0, 'rgba(232,218,190,0.22)');
    gr.addColorStop(0.5, 'rgba(232,218,190,0.1)');
    gr.addColorStop(1, 'rgba(232,218,190,0)');
    g.fillStyle = gr;
    g.fillRect(-700, -700, 1400, 1400);
    g.restore();
  }, 0.25);
  ctx.save();
  ctx.lineCap = 'round';
  for (let c = 0; c < 9; c++) {
    const cx = 960 + (r() - 0.5) * 1100;
    const cy = TY + 40 + r() * (f - TY - 90);
    const sc = (cy - HY0) / (TY - HY0);
    const ang = (r() - 0.5) * 0.6;
    for (let i = 0; i < 4; i++) {
      const ox = cx + (r() - 0.5) * 40 * sc;
      const oy = cy + (i - 1.5) * 4 * sc;
      const l = (18 + r() * 30) * sc;
      ctx.strokeStyle = rgba('#3a2e24', 0.18);
      ctx.lineWidth = 1.4 * sc;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(ang) * l, oy + Math.sin(ang) * l * 0.35);
      ctx.stroke();
      ctx.strokeStyle = rgba('#f0e4cc', 0.16);
      ctx.lineWidth = 0.9 * sc;
      ctx.beginPath();
      ctx.moveTo(ox, oy + 1.4 * sc);
      ctx.lineTo(ox + Math.cos(ang) * l, oy + 1.4 * sc + Math.sin(ang) * l * 0.35);
      ctx.stroke();
    }
  }
  ctx.restore();
  // fossil shells in the limestone: faint ribbed fans and coils
  for (let i = 0; i < 14; i++) {
    const x = r() * W;
    const y = TY + 20 + r() * (f - TY - 40);
    const sc = (y - HY0) / (TY - HY0);
    const s = (5 + r() * 7) * sc;
    ctx.strokeStyle = rgba(r() < 0.5 ? '#4a3e32' : '#d8ccb4', 0.14);
    ctx.lineWidth = 0.9 * sc;
    if (r() < 0.5) {
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        const a = -Math.PI * 0.85 + j * 0.42;
        ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s * 0.5);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.5, 0, Math.PI, P2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      for (let t = 0; t < 1; t += 0.05) {
        const a = t * Math.PI * 4;
        const rr = s * (0.15 + t * 0.85);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr * 0.5;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  // a few old cracks, from the joints and the front edge where weight bore on it
  for (let i = 0; i < 5; i++) crack(ctx, r, r() * W, TY + 30 + r() * (f - TY - 60), (r() - 0.5) * 0.8, 50 + r() * 90, { col: '#4a3a2c', lip: '#efe4cc', w: 1.1, a: 0.3, branch: 0.3 });
  // chips knocked out of its back edge
  nicks(ctx, r, 0, W, TY + 1, 30, 4, '#857762');
  // the light: warm from the back left, falling off to the front right
  const lg = ctx.createLinearGradient(0, TY, W * 0.75, f + 200);
  lg.addColorStop(0, 'rgba(255,226,176,0.1)');
  lg.addColorStop(0.5, 'rgba(255,226,176,0)');
  lg.addColorStop(1, 'rgba(20,16,40,0.2)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, TY, W, f - TY);
  ctx.restore();
  tableFalloff(ctx, f, 0.3, '#1a1220');
  tableSeam(ctx, 0.45, '#2a1c18', false);
  crevice(ctx, 0, W, TY, 18, 0.55, '#1a1220');
  // the front: the slab's thickness, rough-dressed with the pick, its arris chipped and rounded by wear
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#8a7c66'], [1, '#6a5e4e']]);
  for (let i = 0; i < 900; i++) {
    const x = r() * W;
    const y = f + 4 + r() * (1080 - f - 4);
    ctx.fillStyle = rgba(r() < 0.5 ? '#3a3026' : '#c8b898', 0.25);
    ctx.fillRect(x, y, 2 + r() * 2, 1.2);
  }
  // a band of running spirals cut shallow along it (the court's own ornament), worn soft
  spirals(ctx, -20, W, f + 21, 46, 11, rgba('#3a3026', 0.32), rgba('#3a3026', 0.25), 3);
  ctx.save();
  ctx.translate(1, 1.4);
  spirals(ctx, -20, W, f + 21, 46, 11, rgba('#e8dcc4', 0.16), rgba('#e8dcc4', 0), 1.4);
  ctx.restore();
  vfill(ctx, 0, f, W, 1080 - f, [[0, 'rgba(30,20,30,0)'], [1, 'rgba(30,20,30,0.35)']]);
  ctx.restore();
  ctx.fillStyle = '#a49680';
  ctx.fillRect(0, f - 5, W, 5);
  ctx.fillStyle = rgba('#f4ead4', 0.45);
  ctx.fillRect(0, f - 5, W, 1.4);
  nicks(ctx, r, 0, W, f - 4, 40, 6, '#a49680');
  ctx.fillStyle = rgba('#1a1218', 0.7);
  ctx.fillRect(0, f, W, 1.6);
}
/** Nicks knocked out of an edge at y between x0…x1: irregular little pits, dark inside, their far side lit. */
function nicks(ctx: Ctx, r: R, x0: number, x1: number, y: number, n: number, size: number, base: string): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const s = size * (0.4 + r() * 1.2);
    const pts: Pt[] = [];
    for (let j = 0; j < 6; j++) {
      const a = Math.PI + (j / 5) * Math.PI;
      pts.push([x + Math.cos(a) * s * (0.7 + r() * 0.6), y + 1 - Math.sin(a) * s * (0.3 + r() * 0.4)]);
    }
    ctx.fillStyle = rgba(shade(base, -0.45), 0.6);
    polyPath(pts)(ctx);
    ctx.fill();
    ctx.strokeStyle = rgba('#f4e8d0', 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[3][0], pts[3][1]);
    ctx.lineTo(pts[5][0], pts[5][1]);
    ctx.stroke();
  }
}
/** The table's horizon (the kit's HY), for scaling marks by their depth. */
const HY0 = yAt(1e9);

// ——— the grade and the shade ———
//
// The grade is a warm/cool split laid as one plain-alpha mix (source-atop): linear, so it gives a baked piece exactly
// the colour it has in the still, and it costs one fill instead of a pass over every pixel.

function grade(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, W * 0.8, 1080);
  g.addColorStop(0, rgba('#ffd49a', 0.1));
  g.addColorStop(0.45, rgba('#ffd49a', 0));
  g.addColorStop(0.62, rgba('#4a5cb0', 0));
  g.addColorStop(1, rgba('#4a5cb0', 0.12));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 1080);
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.12, '#1a1028', 70, 700);
  // the band behind the table's back edge, where the maze walls rise: calm and a little darker
  vfill(ctx, 0, 560, W, TY - 560, [[0, 'rgba(22,14,30,0)'], [1, 'rgba(22,14,30,0.2)']]);
  vignetteAll(ctx, 0.42, '#120a14');
}

// ——— frames for the live layer ———

/** A griffon vulture gliding (phase ph of a slow flex): broad fingered wings held in a shallow V, a short tail, the
 * pale ruff; seen from below, dark against the sky. */
const VUL = { w: 96, h: 40 };
function vultureFrame(c: Ctx, ph: number): void {
  const cx = VUL.w / 2;
  const cy = VUL.h / 2 + 2;
  const flex = Math.sin(ph * P2);
  c.fillStyle = '#3a2c28';
  for (const d of [-1, 1]) {
    const tipY = cy - 6 - flex * 7;
    c.beginPath();
    c.moveTo(cx - d * 4, cy - 2);
    c.quadraticCurveTo(cx + d * 20, cy - 8 - flex * 2, cx + d * 40, tipY);
    // the fingered primaries
    for (let j = 0; j < 5; j++) {
      const fx = cx + d * (44 - j * 2.2);
      const fy = tipY + 2 + j * 2.2;
      c.lineTo(fx + d * 3, fy);
      c.lineTo(fx - d * 1.5, fy + 1.5);
    }
    c.quadraticCurveTo(cx + d * 22, cy + 6 - flex, cx + d * 4, cy + 5);
    c.closePath();
    c.fill();
  }
  // the body, tail and head
  c.beginPath();
  c.ellipse(cx, cy + 1, 5, 8, 0, 0, P2);
  c.fill();
  c.beginPath();
  c.moveTo(cx - 4, cy + 7);
  c.lineTo(cx + 4, cy + 7);
  c.lineTo(cx + 3, cy + 13);
  c.lineTo(cx - 3, cy + 13);
  c.closePath();
  c.fill();
  c.fillStyle = '#d8c8b0';
  c.beginPath();
  c.ellipse(cx, cy - 7, 3.4, 2.2, 0, 0, P2);
  c.fill();
  c.fillStyle = '#8a7a70';
  c.beginPath();
  c.ellipse(cx, cy - 11, 1.6, 3, 0, 0, P2);
  c.fill();
  c.fillStyle = '#3a2c28';
  c.beginPath();
  c.moveTo(cx - 1, cy - 14);
  c.lineTo(cx + 1, cy - 14);
  c.lineTo(cx, cy - 16.5);
  c.closePath();
  c.fill();
  // the sun through the trailing edge
  c.strokeStyle = 'rgba(255,220,160,0.35)';
  c.lineWidth = 1;
  for (const d of [-1, 1]) {
    c.beginPath();
    c.moveTo(cx + d * 6, cy + 5);
    c.quadraticCurveTo(cx + d * 22, cy + 5 - flex, cx + d * 36, cy - 1 - flex * 3);
    c.stroke();
  }
}

// ——— the stack ———
//
// The braziers and the labrys are sprites (they jump and rock when he hits a wall); nothing still is painted after them
// but the table. The stream and the fire are painted only in the still: the live layer runs its own.

const brazierLayer = (id: string, i: number) => ({ id, box: brazierBox(i), motion: 'sprite' as const, draw: (c: Ctx) => brazier(c, ...bzXZ(i), 0.6) });

export const MINOTAUR: SceneSpec = {
  id: 'minotaur',
  info: {
    name: 'The Heart of the Maze',
    subtitle: 'Boss: THE MINOTAUR',
    ambient: [],
    // (the braziers and the sun are the live layer's)
    glows: [],
    light: '#ffd8a8',
    tableTint: '#fff0dc',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'wall', box: WALL_BOX, draw: wall },
    { id: 'floor', box: FLOOR_BOX, draw: floor },
    { id: 'trough', box: TROUGH_BOX, draw: trough },
    { id: 'heap', box: HEAP_BOX, draw: (c) => heap(c) },
    { id: 'stand', box: STAND_BOX, draw: (c) => stand(c) },
    brazierLayer('brazierL', 0),
    brazierLayer('brazierR', 1),
    { id: 'labrys', box: LABRYS_BOX, motion: 'sprite', draw: (c) => labrysBig(c) },
    { id: 'streamStill', box: { x: STREAM.x - 30, y: STREAM.y0 - 4, w: 60, h: STREAM.y1 - STREAM.y0 + 20 }, stillOnly: true, draw: (c) => streamStill(c) },
    { id: 'fireStill', box: { x: 560, y: 300, w: 800, h: 200 }, stillOnly: true, draw: (c) => fireStill(c) },
    { id: 'table', box: TABLE_BOX, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

interface Beast {
  alive: boolean;
  type?: { id: string };
  x: number;
  y: number;
  puppet?: boolean;
  brain: Record<string, number | boolean>;
}

registerKitScene(MINOTAUR, (k: KitLive) => {
  const ADD = Phaser.BlendModes.ADD;
  const top = k.slot('top');
  const sc = k.sc as unknown as { miniFoot?: Beast | null; bossFoot?: Beast | null };
  const beast = (): Beast | null => {
    const f = sc.miniFoot ?? sc.bossFoot;
    return f && f.alive && f.type?.id === 'minotaur' ? f : null;
  };

  // ——— the vultures, circling high over the court ———
  // (painted at twice the size and shown at half, so the fingered wingtips stay smooth)
  const vKey = sheet(k, 'mt_vulture', VUL.w * 2, VUL.h * 2, 8, (c, ph) => {
    c.scale(2, 2);
    vultureFrame(c, ph);
  });
  const vultures = [
    { cx: 1540, cy: 78, ax: 150, ay: 26, w: 0.16, ph: 0.4, s: 0.62 },
    { cx: 1500, cy: 60, ax: 110, ay: 18, w: 0.19, ph: 2.9, s: 0.48 },
    { cx: 640, cy: 52, ax: 120, ay: 20, w: -0.14, ph: 1.3, s: 0.42 },
  ].map((v) => ({ ...v, s: v.s / 2, l: new Loop(k, vKey, 8, v.cx, v.cy, { into: top, fps: 1.2, scale: v.s / 2 }) }));

  // ——— the braziers ———
  const FW = 150;
  const FH = 200;
  const RF = 0.7;
  const FN = 10;
  const fireKey = sheet(k, 'mt_fire', FW * RF, FH * RF, FN, (c, ph) => {
    c.scale(RF, RF);
    fireFrame(c, FW / 2, FH - 8, FW * 0.85, FH * 0.85, ph, { tongues: 6, seed: 3, cols: ['#ff4a12', '#ffa024', '#ffe8a0'] });
  });
  const SMW = 120;
  const SMH = 320;
  const RS = 0.4;
  const smokeKey = sheet(k, 'mt_smoke', SMW * RS, SMH * RS, 8, (c, ph) => {
    c.scale(RS, RS);
    smokeFrame(c, SMW, SMH, ph, { lit: '#ffc890', body: '#7a6a62', shade: '#3a3040', wind: 0.2, lobes: 16, a: 0.34, toLight: [-0.6, -0.8], seed: 2 });
  });
  const fires = [0, 1].map((i) => {
    const img = k.sprite(i ? 'brazierR' : 'brazierL');
    const [X, z] = bzXZ(i);
    const kk = pz(z);
    const [x, y] = P(X, MT.bowlY, z);
    const s = (kk * 0.4) / (FW * 0.85);
    const wallGlow = k.glow(RP(MT.braziers[i][0], 1.2)[0], RP(MT.braziers[i][0], 1.2)[1], kk * 0.9, 0xff8a3a, 0, { into: top, sy: 1.2 });
    const glow = k.glow(x, y - kk * 0.15, kk * 0.5, 0xff8a3a, 0, { into: top });
    const smoke = new Loop(k, smokeKey, 8, x, y - kk * 0.3, { into: top, origin: [0.5, 1], scale: kk / 223 / RS, fps: 1.6, phase: i * 2.1 });
    const fl = new Loop(k, fireKey, FN, x, y + kk * 0.01, { into: top, origin: [0.5, (FH - 8) / FH], scale: s / RF, fps: 12 + i, phase: i * 2.6 });
    const coal = k.glow(x, y - 2, kk * 0.3, 0xffb050, 0, { into: top, sy: 0.35 });
    return { img, x0: img.x, y0: img.y, x, y, kk, s, wallGlow, glow, smoke, fl, coal, seed: i * 1.7, jolt: new Spring(0, 260, 9) };
  });
  const embers = new Parts(k, { frame: 'ember', add: true, into: top, max: 90 });
  const emberRate = [new Rate(), new Rate()];
  const duck = new Spring(0, 34, 5);

  // ——— the labrys, rocking on its stand ———
  const lab = k.pivot(k.sprite('labrys'), SOCK_X, SOCK_Y);
  const labSwing = new Swing(lab, { k: 70, c: 2.2, idle: 0 });

  // ——— the stream from the bull's head ———
  const SW = STREAM.w;
  const SH = Math.ceil(STREAM.y1 - STREAM.y0 + 8);
  const streamKey = sheet(k, 'mt_stream', SW, SH, 8, (c, ph) => streamFrame(c, ph, SW, SH));
  const stream = new Loop(k, streamKey, 8, STREAM.x, STREAM.y0, { into: top, origin: [0.5, 0], fps: 14 });
  const drops = new Parts(k, { frame: 'drop', into: top, max: 50 });
  const dropRate = new Rate();
  const glints = new Parts(k, { frame: 'spark', add: true, into: top, max: 12 });
  let slosh = 0;

  // ——— the wall answering his blows ———
  const flakeKey = sheet(k, 'mt_flake', FLK * 2, FLK * 2, 8, (c, _p, i) => flakeFrame(c, i));
  const flakes = new Parts(k, { frame: 'flake', sheet: { key: flakeKey, n: 8, half: FLK }, into: top, max: 80 });
  const grit = new Parts(k, { frame: 'mote', into: top, max: 160 });
  const dust = new Parts(k, { frame: 'puff', into: top, max: 90 });
  const flash = k.wash(0xffd8a0, 0, ADD, top);
  const SHADE_T = 0x9a96b8;
  const LIT_T = 0xe8d8bc;
  /** The wall's foot (screen y) at bearing θ. */
  const footY = (th: number) => RP(th, 0)[1];
  /** Shake a stretch of the ring round bearing thc: painted flakes off the fresco, grit off the coping, dust down
   * its face and puffing at its foot. */
  const shed = (thc: number, n: number, p: number) => {
    const clampTh = (t: number) => Math.max(-TH_E + 0.03, Math.min(TH_E - 0.03, t));
    for (let i = 0; i < n; i++) {
      const th = clampTh(thc + (crand() - 0.5) * 0.5);
      if (Math.abs(th) < GFRAME) continue;
      const kk = ppu(th);
      const [x, y] = RP(th, 0.7 + crand() * 0.8);
      flakes.spawn({ x, y, vx: -Math.sign(th) * (6 + crand() * 30) * (kk / 200), vy: -crand() * 30, life: 3, r0: (0.03 + crand() * 0.035) * kk, a: 1, tint: 0xc8c4d8, grav: 3.4 * kk, floor: footY(th) + 4 + crand() * 14, bounce: 0.28, spin: (crand() - 0.5) * 12, fade: 0.02 });
    }
    for (let i = 0; i < n * 2; i++) {
      const th = clampTh(thc + (crand() - 0.5) * 0.8);
      const kk = ppu(th);
      const [x, y] = RP(th, WH - 0.02);
      if (y < 0) continue;
      grit.spawn({ x, y, vx: (crand() - 0.5) * 16, vy: crand() * 20, life: 2.5, r0: (0.008 + crand() * 0.01) * kk, a: 0.9, tint: th > -0.3 ? LIT_T : SHADE_T, grav: 3.4 * kk, drag: 0.3, floor: footY(th) + crand() * 10, bounce: 0.2, fade: 0.02 });
    }
    for (let i = 0; i < 2 + p * 4; i++) {
      const th = clampTh(thc + (crand() - 0.5) * 0.4);
      const kk = ppu(th);
      const [x, y] = RP(th, 0.9 + crand() * 0.8);
      dust.spawn({ x, y, vx: (crand() - 0.5) * 8, vy: 20 + crand() * 30, life: 1.8 + crand(), r0: kk * 0.04, r1: kk * (0.13 + crand() * 0.08), a: 0.3, tint: 0xc8b494, grav: 30, drag: 1.4, fade: 0.1 });
    }
    for (let i = 0; i < 1 + p * 3; i++) puffAt(clampTh(thc + (crand() - 0.5) * 0.5), 0.45);
  };
  /** A puff of dust at the wall's foot at bearing θ. */
  const puffAt = (th: number, a: number) => {
    const kk = ppu(th, RC - 0.1);
    const [x, y] = RP(th, 0.04, RC - 0.1);
    dust.spawn({ x, y, vx: (crand() - 0.5) * 40, vy: -10 - crand() * 24, life: 1.6 + crand(), r0: kk * 0.09, r1: kk * (0.3 + crand() * 0.16), a: a * 0.8, tint: crand() < 0.5 ? 0xb8a080 : 0x9c8a74, drag: 1.1, fade: 0.15 });
  };
  /** The ground shaking: a wave of dust running both ways round the foot of the ring from bearing th. */
  const waves: { th: number; dir: number; t: number; n: number }[] = [];
  let quake = 0;

  // ——— the fight ———
  let lastY = 0;
  let pawT = 0;
  let lean = 0;

  return {
    impact(x, _y, p) {
      const b = beast();
      // he rammed a maze wall (his crash happens up at the walls' tops): the ground shakes
      let wallHit = false;
      let hx = x;
      if (b && b.puppet && b.y < 720 && p > 0.6) {
        wallHit = true;
        hx = b.x;
      } else if (!b && p >= 0.95) wallHit = true;
      const th = thAt(hx);
      shed(th, Math.round(2 + p * 6), p);
      if (p > 0.4) shed(-th * 0.6 + (crand() - 0.5) * 0.4, Math.round(1 + p * 3), p * 0.5);
      duck.v -= 3 + p * 5;
      labSwing.kick((crand() < 0.5 ? -1 : 1) * (0.02 + 0.05 * p));
      slosh = Math.min(1.5, slosh + p * 0.6);
      if (wallHit) {
        quake = 1;
        flash.setAlpha(0.06);
        for (const f of fires) f.jolt.v -= 260 + crand() * 80;
        labSwing.kick((hx < SOCK_X + 200 ? 1 : -1) * 0.18 + (crand() - 0.5) * 0.06);
        slosh = 1.6;
        waves.push({ th, dir: -1, t: 0, n: 0 }, { th, dir: 1, t: 0, n: 0 });
        shed(th + (crand() - 0.5) * 0.3, 8, 1);
        shed(crand() * 2 - 1, 4, 0.7);
        for (let i = 0; i < 14; i++) {
          const ss = STREAM;
          drops.spawn({ x: ss.x + (crand() - 0.5) * 10, y: ss.y1 - 4, vx: (crand() - 0.5) * 140, vy: -80 - crand() * 140, life: 1.2, r0: 2 + crand() * 1.5, a: 0.8, tint: 0xd8e4ec, grav: 600, floor: ss.y1 + 40, fade: 0.05 });
        }
      }
    },
    update(dt, t) {
      const cm = calm();
      const b = beast();
      // the fight's state: pawing (his snort is up), charging (a puppet, moving fast)
      let pawing = false;
      let rushing = 0;
      let bx = 960;
      if (b) {
        bx = b.x;
        const vy = dt > 0 ? (b.y - lastY) / dt : 0;
        lastY = b.y;
        pawing = !b.puppet && Number(b.brain.snort ?? 0) > 0;
        if (b.puppet && Math.abs(vy) > 300) rushing = Math.min(1, Math.abs(vy) / 1500);
      }
      if (pawing) {
        pawT -= dt;
        if (pawT <= 0) {
          // each blow of his hoof: grit trickles off the coping over him, dust at the wall's foot, the fires shiver
          pawT = 0.24;
          const th = thAt(bx) + (crand() - 0.5) * 0.2;
          for (let i = 0; i < 2; i++) {
            const [x, y] = RP(th + (crand() - 0.5) * 0.1, WH - 0.02);
            const kk = ppu(th);
            grit.spawn({ x, y, vx: (crand() - 0.5) * 10, vy: 0, life: 2, r0: (0.007 + crand() * 0.006) * kk, a: 0.8, tint: th > -0.3 ? LIT_T : SHADE_T, grav: 3.4 * kk, drag: 0.3, floor: footY(th), bounce: 0.2, fade: 0.02 });
          }
          if (crand() < 0.5) puffAt(th, 0.22);
          duck.v -= 0.7;
        }
      }
      lean += ((rushing ? Math.max(-1, Math.min(1, (960 - bx) / 600)) * 0.35 * rushing : 0) - lean) * Math.min(1, dt * 6);

      // the fires: a stomp ducks them and they flare; they lean away while he charges; the ground's jolt lifts them
      const d = duck.step(0, dt);
      quake = Math.max(0, quake - dt * 1.6);
      let fl = 0;
      for (const [i, f] of fires.entries()) {
        const fk = flicker(t * 1.1, f.seed);
        fl += fk;
        const jy = f.jolt.step(0, dt);
        const jx = Math.sin(t * 53 + i * 2) * quake * quake * 3 * cm;
        f.img.setPosition(f.x0 + jx, f.y0 + jy * cm);
        f.fl.step(dt, (0.9 + Math.abs(lean) * 0.6) * cm);
        const h = 0.8 * (1 + d * 0.5) * (0.95 + 0.05 * fk) * (1 + (pawing ? Math.sin(t * 26) * 0.04 : 0));
        f.fl.each((im) => {
          im.setScale((f.s / RF) * 1.02, (f.s / RF) * Math.max(0.15, h));
          im.setPosition(f.x + jx, f.y + f.kk * 0.01 + jy * cm);
          im.setRotation(lean * (f.x < 960 ? 1 : 1));
        });
        f.glow.setAlpha((0.13 + 0.08 * fk) * (1 + Math.max(0, d) * 0.5));
        f.wallGlow.setAlpha((0.1 + 0.05 * fk) * (1 + Math.max(0, d) * 0.4));
        f.coal.setAlpha(0.6);
        f.coal.setPosition(f.x + jx, f.y - 2 + jy * cm);
        f.smoke.step(dt, cm);
        f.smoke.alpha = 0.42;
        f.smoke.each((im) => im.setPosition(f.x + jx, f.y - f.kk * 0.3 + jy * cm).setRotation(lean * 0.6));
        emberRate[i].tick((4 + Math.max(0, d) * 20 + Math.abs(lean) * 10) * cm, dt, () => {
          const kk = f.kk;
          embers.spawn({ x: f.x + (crand() - 0.5) * kk * 0.3, y: f.y - kk * 0.1, vx: ((crand() - 0.4) * 30 + lean * 160) * (kk / 200), vy: (-60 - crand() * 90) * (kk / 200), life: 1.2 + crand() * 1.5, r0: (2 + crand() * 2) * (kk / 200), r1: 0.6, a: 0.9, tint: crand() < 0.5 ? 0xffb040 : 0xff6a20, grav: -10, drag: 0.4, streak: 0.02, fade: 0.08 });
        });
      }
      void fl;
      flash.setAlpha(Math.max(0, flash.alpha - dt * 0.3));

      // the ground shaking: the dust wave running round the ring's foot
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.t += dt;
        while (w.n < 9 && w.t > w.n * 0.055) {
          const th = w.th + w.dir * w.n * 0.13;
          if (Math.abs(th) < TH_E) puffAt(th, 0.5 * (1 - w.n / 12));
          if (Math.abs(th) < TH_E && w.n % 2 === 0) shed(th, 1, 0.3);
          w.n++;
        }
        if (w.n >= 9) waves.splice(i, 1);
      }

      // the labrys
      labSwing.update(dt, t);

      // the stream: steady, jumping and spraying when the ground shakes
      slosh = Math.max(0, slosh - dt * 1.2);
      stream.step(dt, (1 + slosh * 0.5) * cm);
      stream.each((im) => im.setScale(1 + Math.sin(t * 31) * slosh * 0.15, 1).setPosition(STREAM.x + Math.sin(t * 23) * slosh * 2, STREAM.y0));
      dropRate.tick((3 + slosh * 14) * cm, dt, () => {
        drops.spawn({ x: STREAM.x + 2 + (crand() - 0.5) * 6, y: STREAM.y1 - 3, vx: (crand() - 0.5) * 60, vy: -40 - crand() * 70 * (1 + slosh), life: 0.8, r0: 1.4 + crand(), a: 0.7, tint: 0xdce8f0, grav: 500, floor: STREAM.y1 + 2, fade: 0.05 });
      });
      if (crand() < dt * 1.5) {
        const th = TR.th0 + 0.02 + crand() * (TR.th1 - TR.th0 - 0.04);
        const [gx, gy] = RP(th, TR.h - 0.02, TR.r0 + 0.12 + crand() * 0.1);
        glints.spawn({ x: gx, y: gy, life: 0.5, r0: 3, r1: 1, a: 0.6, tint: 0xfff0c8, fade: 0.3 });
      }

      // the vultures
      for (const v of vultures) {
        const tt = t * v.w * cm + v.ph;
        const x = v.cx + Math.cos(tt) * v.ax;
        const y = v.cy + Math.sin(tt) * v.ay;
        // banking: foreshortened as it turns across, tilted into the turn
        const bank = Math.sin(tt);
        v.l.step(dt, cm);
        v.l.each((im) => {
          im.setPosition(x, y);
          im.setScale(v.s * (0.75 + 0.25 * Math.abs(Math.cos(tt * 0.5 + 0.3))), v.s);
          im.setRotation(bank * 0.18 * Math.sign(v.w));
        });
      }

      embers.update(dt);
      flakes.update(dt);
      grit.update(dt);
      dust.update(dt);
      drops.update(dt);
      glints.update(dt);
    },
  };
});
