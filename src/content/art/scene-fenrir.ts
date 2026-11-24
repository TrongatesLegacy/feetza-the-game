// Lyngvi Isle (Fenrir's Paw's arena, the mini-boss of the Jotunheim stage, Act 8), redrawn with the location kit
// (src/art/scene): the lonely island in the black lake Amsvartnir where the gods bound the great wolf. The same hard,
// moonlit night as the ice fields (scene-jotunheim.ts): the aurora over the lake, the giants' range far off.
//
// A bleak heath island under a pale moon (high on the left, a frost halo round it, its light laid down the black
// water in a long glitter path). On the right, the binding stone: a great granite boulder driven deep into the earth,
// turf heaped round its foot, a giant iron staple hammered into its face and cut with runes (their inlay keeps a cold
// light), a broken length of fetter hanging from it; four claw gouges raked down the stone where the wolf fought it,
// a wolf-sized hollow worn into the heath before it, torn turf flung from its rim, a burst fetter lying in it. On the
// left, a whaleback of bedrock scored right across by the same claws, an older broken chain draped over it, a dead
// birch leaning from its back. Mist lies on the water and creeps over the heath; across the lake the mountains of
// Jotunheim stand under snow. The table is a slab of the island's dark granite, frost at its corners, a frieze of
// binding runes cut along its front.
//
// There are no waves here: the arena follows the fight. The aurora reddens as the fight goes on (the boss's phase,
// read from the game scene; on the stages page waves 1–3 stand in for the phases); when the wolf breaks loose the
// stone's runes flare and go dark, the fetter on the staple leaps and the lake shivers; when he's bound again they
// flare back. (Wave 4 on the stages page shows him loose.)
//
// Live, the heroes:
// - the aurora: painted curtains (frames) folding and rippling over the lake, rays running through them;
// - the black lake: mist banks (painted, lit on top by the moon) rolling across the water at two depths and creeping
//   over the heath, the moon's glitter path twinkling (painted frames), clouds drifting past the moon and dimming it;
//   a stomp sends rings of ripples out across the water;
// - the binding stone: the fetter on its staple swings on a spring at every stomp, grit and rime fall off the stone,
//   its runes breathe and flare; frost dust falls off the dead birch and the scored rock.

import Phaser from 'phaser';
import { type Air, type Ctx, type PathFn, type R, TY, W, calmLanes, castShadow, crevice, glowAt, gradeAll, groundShadow, lightPool, polyPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff, tableSeam, water } from '../../art/scene/materials';
import { chips, crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { cloud, horizonGlow, skyFill, stars } from '../../art/scene/sky';
import { hashStr, makeCanvas, mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, lerp, registerKitScene } from '../../game/sceneLive';
import { wave1 } from './sceneBits';
import type { Pt } from './scene-rink';
import { type Summit, type View, NIGHT, massif, topOf } from './scene-slopes';
import { RUNE, auroraColumn, carvedRune } from './scene-jotunheim';

// ——— layout ———

export const FE = {
  front: 1040,
  /** The far shore of the lake under the range: the water's horizon. */
  hor: 520,
  moon: { x: 372, y: 116, r: 30 },
  /** The aurora's frames cover the sky down to here. */
  auroraH: 330,
  /** The binding stone: its middle, where it goes into the turf, its crown, its half width. */
  stone: { cx: 1694, base: 712, top: 346, hw: 218 },
  /** The staple in its face: where its two legs go in, and the bottom of its bow (the ring hangs from it). */
  staple: { a: [1604, 556] as Pt, b: [1680, 556] as Pt, bow: [1642, 563] as Pt },
  /** The iron ring through the staple, the fetter hanging from it. */
  ring: { x: 1642, y: 590, rx: 29, ry: 27, t: 9 },
  /** The wolf's hollow worn in the heath before the stone. */
  hollow: { x: 1292, y: 728, rx: 160, ry: 24 },
  /** The dead birch on the back of the scored rock: its root. */
  tree: { x: 94, y: 606 },
};

const P2 = Math.PI * 2;
const HOR = FE.hor;
const INK = '#05070f';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const AIR: Air = { color: '#1c3054', far: 0.8 };
const GRANITE = { lit: '#7c88ac', body: '#434c6a', shade: '#22283e', deep: '#0e1120' };
/** Old iron, black and rusted through (dark and warm, so no backdrop chain is ever taken for one of the fight's bright
 * fallen links). */
const IRON = { hi: '#a8907c', top: '#6a5a52', lit: '#4e4240', body: '#2c2424', dark: '#100c0e', rust: '#6e3a20', rustDk: '#2e160e', raw: '#7a6a62' };
const HEATH = { peat: '#14141c', heather: '#2c2232', heatherLit: '#6a5a7c', grass: '#2a3030', frost: '#b8c6e4' };

/** The island's far edge against the lake (screen y at x): the shoreline the water stops at. */
const SHORE: Pt[] = [[-20, 634], [170, 640], [380, 652], [600, 663], [860, 669], [1100, 664], [1300, 651], [1470, 636], [1700, 626], [1940, 632]];
function shoreY(x: number): number {
  let i = 0;
  while (i < SHORE.length - 2 && x > SHORE[i + 1][0]) i++;
  const [x0, y0] = SHORE[i];
  const [x1, y1] = SHORE[i + 1];
  const u = clamp01((x - x0) / (x1 - x0));
  const s = u * u * (3 - 2 * u);
  return y0 + (y1 - y0) * s + wave1(x, 4) * 3 + wave1(x * 3.1, 9) * 1.2;
}
/** How big things are on the heath at screen y (1 at the table's back edge). */
const kAt = (y: number) => Math.max(0.25, (y - 560) / (TY - 560));

/** The top of an outline at x (the highest point of any of its edges crossing x), or null. */
function topAt(pts: Pt[], x: number): number | null {
  let best: number | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if ((x < Math.min(ax, bx)) || (x > Math.max(ax, bx)) || ax === bx) continue;
    const y = ay + ((x - ax) / (bx - ax)) * (by - ay);
    if (best === null || y < best) best = y;
  }
  return best;
}

// ——— the sky ———

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: HOR };
  skyFill(ctx, box, [[0, '#02040e'], [0.3, '#050c24'], [0.64, '#0c1a3e'], [0.88, '#162a50'], [1, '#1e3a5e']], 0.04);
  lay(ctx, drift('#12284e', '#02040e', 3, 181, 160, 48), box, 0.22);
  // the milky way, a faint dust band climbing to the right, away from the moon
  softly(ctx, box, (g) => {
    g.save();
    g.translate(1320, 150);
    g.rotate(-0.38);
    const lg = g.createLinearGradient(0, -90, 0, 90);
    lg.addColorStop(0, 'rgba(150,170,220,0)');
    lg.addColorStop(0.5, 'rgba(150,170,220,0.12)');
    lg.addColorStop(1, 'rgba(150,170,220,0)');
    g.fillStyle = lg;
    g.fillRect(-900, -90, 1800, 180);
    g.restore();
  }, 0.25);
  stars(ctx, r, { x: 0, y: 0, w: W, h: 460 }, 380, '#eef2ff');
  for (let i = 0; i < 200; i++) {
    const u = r();
    const x = 1320 + (u - 0.5) * 1800 * Math.cos(-0.38) + (r() - 0.5) * 100;
    const y = 150 + (u - 0.5) * 1800 * Math.sin(-0.38) + (r() - 0.5) * 100;
    if (y < 0 || y > 440 || Math.hypot(x - FE.moon.x, y - FE.moon.y) < 220) continue;
    ctx.fillStyle = rgba('#e4ecff', 0.16 + r() * 0.28);
    ctx.fillRect(x, y, 1, 1);
  }
  // the aurora's green light over the sky, strongest low over the range on the right
  glowAt(ctx, 1180, 330, 900, '#2affa0', 0.05, 0.4);
  glowAt(ctx, 1580, 260, 600, '#30e0c0', 0.04, 0.4);
  horizonGlow(ctx, HOR - 60, 150, '#3a5a86', 0.45);
  vfill(ctx, 0, HOR - 14, W, 14, [[0, rgba('#5a78a8', 0)], [1, rgba('#6a86b4', 0.6)]]);
  // the moon: a wide cold bloom in the frosty air, a 22° halo ringing it, the disc with its seas
  const { x: mx, y: my, r: mr } = FE.moon;
  glowAt(ctx, mx, my, 560, '#5670c4', 0.2);
  glowAt(ctx, mx, my, 170, '#dfe8ff', 0.34);
  // (a soft ring of light, its inner edge sharper and a touch warm, fading out bluish, the sky a little darker
  // just inside it, as real ice halos are)
  softly(ctx, { x: mx - 220, y: Math.max(0, my - 220), w: 440, h: 440 }, (g) => {
    const hg = g.createRadialGradient(mx, my, 0, mx, my, 200);
    hg.addColorStop(0, 'rgba(208,220,255,0)');
    hg.addColorStop(0.62, 'rgba(4,8,24,0.08)');
    hg.addColorStop(0.72, 'rgba(4,8,24,0.04)');
    hg.addColorStop(0.75, 'rgba(255,226,200,0.07)');
    hg.addColorStop(0.79, 'rgba(214,226,255,0.06)');
    hg.addColorStop(0.9, 'rgba(180,200,255,0.025)');
    hg.addColorStop(1, 'rgba(180,200,255,0)');
    g.fillStyle = hg;
    g.fillRect(mx - 220, my - 220, 440, 440);
  }, 0.5);
  const mg = ctx.createRadialGradient(mx - mr * 0.35, my - mr * 0.35, 0, mx, my, mr);
  mg.addColorStop(0, '#fffef8');
  mg.addColorStop(0.7, '#eceee6');
  mg.addColorStop(1, '#c6cabf');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba('#9a9c8c', 0.3);
  for (const [dx, dy, rr] of [[-9, -6, 7], [7, 5, 5.5], [-3, 12, 4], [11, -8, 3.4], [-13, 6, 3], [2, -12, 2.6]] as const) {
    ctx.beginPath();
    ctx.arc(mx + dx, my + dy, rr, 0, P2);
    ctx.fill();
  }
}

/** Thin bars of cloud lit by the moon (the still: the live layer drifts its own past the moon). */
const CLOUD_O = { lit: '#b6c4e6', body: '#4a5880', shadow: '#1a2240', sunX: FE.moon.x, sunY: FE.moon.y - 60, rim: 0.5, wisp: 0.7, kind: 'stratus' as const, res: 0.5 };
function cloudsStill(ctx: Ctx, r: R): void {
  cloud(ctx, r, 560, 168, 420, 30, { ...CLOUD_O, a: 0.7 });
  cloud(ctx, r, 1540, 96, 520, 28, { ...CLOUD_O, a: 0.55 });
}

// ——— the aurora ———

interface Band {
  x0: number;
  x1: number;
  y: number;
  amp: number;
  wl: number;
  len: number;
  a: number;
  s: number;
}
const BANDS: Band[] = [
  { x0: 600, x1: 1600, y: 250, amp: 40, wl: 240, len: 180, a: 0.8, s: 1.1 },
  { x0: 1080, x1: 1900, y: 186, amp: 30, wl: 190, len: 130, a: 0.62, s: 3.2 },
  { x0: 700, x1: 1340, y: 132, amp: 18, wl: 150, len: 76, a: 0.3, s: 5.4 },
];
/** The middle of the sky (where the feet hover and the chain runs) is kept quieter. */
const calmMid = (x: number) => 1 - 0.62 * Math.exp(-(((x - 960) / 380) ** 2));

/** The blood aurora of the Ragnarök howl (made once): the same curtain, crimson, its foot burning red-orange. */
let auroraRedCol: HTMLCanvasElement | null = null;
function auroraColumnRed(): HTMLCanvasElement {
  if (auroraRedCol) return auroraRedCol;
  const [c, g] = makeCanvas(4, 128);
  const lg = g.createLinearGradient(0, 0, 0, 128);
  lg.addColorStop(0, 'rgba(140,10,30,0)');
  lg.addColorStop(0.14, 'rgba(180,14,34,0.26)');
  lg.addColorStop(0.42, 'rgba(225,24,30,0.38)');
  lg.addColorStop(0.7, 'rgba(255,40,24,0.42)');

  lg.addColorStop(0.86, 'rgba(255,96,36,0.75)');
  lg.addColorStop(0.92, 'rgba(255,190,110,1)');
  lg.addColorStop(0.955, 'rgba(255,110,36,0.6)');
  lg.addColorStop(0.98, 'rgba(255,70,24,0.35)');
  lg.addColorStop(1, 'rgba(255,60,20,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, 4, 128);
  auroraRedCol = c;
  return c;
}

/** The aurora at phase ph (0…1 loops): folded curtains whose folds travel along them, rays running through. */
function aurora(c: Ctx, ph: number, red = false): void {
  const T = P2 * ph;
  const col = red ? auroraColumnRed() : auroraColumn();
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const b of BANDS) {
    for (let x = b.x0; x < b.x1; x += 3) {
      const u = (x - b.x0) / (b.x1 - b.x0);
      const env = Math.sin(u * Math.PI) ** 0.8 * calmMid(x);
      const y = b.y + Math.sin(x / b.wl + b.s + Math.sin(T) * 0.6) * b.amp + Math.sin(x / (b.wl * 0.37) - T + b.s * 2) * b.amp * 0.24;
      const ray = 0.35 + 0.65 * Math.max(0, Math.sin(x / 7 + T * 3 + b.s) * 0.6 + Math.sin(x / 19 - T * 2 + b.s) * 0.5);
      const L = b.len * (0.6 + 0.4 * Math.sin(x / 61 + T + b.s * 3)) * (0.8 + ray * 0.3);
      const fold = 1 + 0.7 * Math.max(0, Math.cos(x / b.wl + b.s + Math.sin(T) * 0.6)) ** 6;
      c.globalAlpha = clamp01(b.a * env * ray * fold * 0.6);
      c.drawImage(col, x - 1.5, y - L, 6, L + 10);
      c.globalAlpha *= 0.35;
      c.drawImage(col, x - 6, y - L * 1.25, 15, L * 1.25 + 14);
    }
  }
  c.restore();
}

// ——— the far range: the mountains of Jotunheim across the lake ———

const FAR_VIEW: View = { ...NIGHT, air: AIR, lit: '#c6d6f2', shade: '#2c4270', rock: '#121a32', far: '#2a3e68' };
const NEAR_VIEW: View = { ...NIGHT, air: AIR, lit: '#dae4fa', shade: '#2a3a68', rock: '#0e1428', far: '#2a3e68' };
// (the far wall of peaks overlapping, so no flat floor shows between them; the near range uneven, one great massif
// standing over the rest)
const FARTHEST: Summit[] = [
  [40, 96, 300, 260, 1.3],
  [330, 124, 320, 340, 1.35],
  [700, 104, 360, 300, 1.3],
  [960, 150, 340, 380, 1.25],
  [1320, 118, 360, 330, 1.35],
  [1640, 100, 300, 320, 1.3],
  [1900, 138, 320, 260, 1.3],
];
const NEARS: Summit[] = [
  [210, 66, 190, 150, 1.2],
  [1220, 88, 230, 200, 1.2],

  [720, 150, 320, 290, 1.15],
  [1560, 84, 210, 170, 1.2],
  [1800, 56, 160, 210, 1.1],
];
const farthestTop = topOf(FARTHEST, HOR - 14, 14, 31);
const nearTop = topOf(NEARS, HOR, 8, 37);

function farRange(ctx: Ctx, r: R): void {
  massif(ctx, r, farthestTop, HOR - 14, FARTHEST, { ...FAR_VIEW, lit: mix(FAR_VIEW.lit, '#5a74a8', 0.5), shade: mix(FAR_VIEW.shade, '#3a5080', 0.45) }, 0.86, 0.6);
  vfill(ctx, 0, HOR - 90, W, 80, [[0, rgba('#4a6496', 0)], [1, rgba('#5a76a8', 0.5)]]);
  massif(ctx, r, nearTop, HOR, NEARS, NEAR_VIEW, 0.68, 0.55);
  // the near range's ridges catching the moon where they face it
  ctx.strokeStyle = rgba('#e8f0ff', 0.45);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let x = 0; x < W; x += 3) {
    if (nearTop(x + 4) < nearTop(x - 4) && nearTop(x) < HOR - 24) ctx.lineTo(x, nearTop(x) + 1);
    else ctx.moveTo(x, nearTop(x) + 1);
  }
  ctx.stroke();
  // the cold air lying on the water at the range's foot
  vfill(ctx, 0, HOR - 44, W, 46, [[0, rgba('#5a7aa8', 0)], [1, rgba('#6a86b4', 0.5)]]);
}

// ——— the black lake ———

const LAKE_Y1 = 700;

function lake(ctx: Ctx, r: R): void {
  water(ctx, r, 0, W, HOR, LAKE_Y1, {
    far: '#1c3052', deep: '#09101f', near: '#03060c', sky: '#5a76aa', skyA: 0.42,
    ripple: '#8ea4d4', ripples: 240, swells: 6, crest: '#6a84bc', glitterX: FE.moon.x + 8, glitter: '#e6eeff', glitterA: 0.08, glitterW: 110, seed: 61,
  });
  // the range mirrored in the still water, dark and soft, broken by the ripples into bands
  softly(ctx, { x: 0, y: HOR, w: W, h: 140 }, (g) => {
    g.fillStyle = 'rgba(8,14,32,0.32)';
    g.beginPath();
    g.moveTo(0, HOR);
    for (let x = 0; x <= W; x += 6) g.lineTo(x, HOR + (HOR - nearTop(x)) * 0.55);
    g.lineTo(W, HOR);
    g.closePath();
    g.fill();
    // the snow on the summits faintly in it
    for (const [cx, h] of NEARS) {
      const y = HOR + h * 0.62;
      const rg = g.createRadialGradient(cx - 20, y, 0, cx - 20, y, 60);
      rg.addColorStop(0, 'rgba(120,150,200,0.16)');
      rg.addColorStop(1, 'rgba(120,150,200,0)');
      g.fillStyle = rg;
      g.fillRect(cx - 90, y - 60, 140, 120);
    }
  }, 0.25);
  for (let y = HOR + 4; y < HOR + 120; y += 4 + (y - HOR) * 0.08) {
    ctx.fillStyle = rgba('#2a4070', 0.18);
    for (let x = r() * 60; x < W; x += 40 + r() * 120) ctx.fillRect(x, y, 20 + r() * 80, 1);
  }
  // the aurora's green faint in the water under it
  glowAt(ctx, 1240, HOR + 40, 520, '#30e0a0', 0.05, 0.18);
  // the moon's light lying on the water under it, soft, longest along the line to us
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, FE.moon.x + 8, HOR + 24, 70, '#c8d8ff', 0.16, 0.9);
  glowAt(ctx, FE.moon.x + 8, HOR + 70, 120, '#b8ccff', 0.1, 0.75);
  ctx.restore();
  // a thread of light along the far waterline
  ctx.fillStyle = rgba('#a8bce4', 0.3);
  ctx.fillRect(0, HOR, W, 1.2);
}

/** The glitter path (ph 0…1 loops): flecks of moonlight on the swell under the moon, each winking as its facet
 * turns, sliding a little, longer and brighter towards us. In GLIT_BOX. */
const GLIT_BOX = { x: FE.moon.x - 190, y: HOR, w: 420, h: 150 };
function glitterFrame(c: Ctx, ph: number, thick = 1): void {
  const rr = rng(hashStr('fe:glitter'));
  c.save();
  for (let i = 0; i < 260; i++) {
    const t = rr() ** 0.85;
    const y = HOR + 2 + t * (GLIT_BOX.h - 6);
    const spread = 130 * (0.08 + t);
    const x0 = FE.moon.x + 8 + (rr() + rr() + rr() - 1.5) * spread;
    const len = (5 + rr() * 18) * (0.4 + t);
    const off = rr();
    const w = 0.5 + 0.5 * Math.sin(P2 * (ph * (1 + Math.floor(rr() * 2)) + off));
    const a = (0.25 + rr() * 0.75) * w ** 3 * (1 - t * 0.35);
    if (a < 0.02) continue;
    const x = x0 + Math.sin(P2 * ph + i) * 3 * (0.4 + t);
    c.fillStyle = rgba(rr() < 0.3 ? '#fff6e4' : '#e6eeff', a);
    c.fillRect(x - len / 2, y, len, Math.max(thick, 2.2 * (0.4 + t)));
  }
  c.restore();
}

// ——— mist ———

const MW = 1024;
const MH = 128;
/** A seamless band of mist (MW×MH, painted at half size) at phase ph (0…1 loops): soft banks lying along the water,
 * their puffs born, swelling, drifting on and thinning away, lit on top by the moon, blue in their bellies, the band
 * thinning out top and bottom. */
function mistTile(c: Ctx, seed: number, ph = 0.3, a = 1): void {
  const rr = rng(hashStr('fe:mist' + seed));
  for (let i = 0; i < 52; i++) {
    const x0 = rr() * MW;
    const y = MH * (0.45 + rr() * 0.3);
    const rad0 = 30 + rr() * 50;
    const off = rr();
    // each puff is born small, swells as it drifts along with the bank and thins away (phase ph: the loop is seamless,
    // as every puff has faded out when its life wraps round)
    const age = (ph + off) % 1;
    const life = Math.sin(age * Math.PI) ** 1.2;
    const x = x0 + age * 70;
    const rad = rad0 * (0.65 + age * 0.6);
    // (gathered into banks, with thin gaps between them)
    const bank = 0.25 + 0.75 * Math.max(0, Math.sin((x0 / MW) * P2 * 3 + seed * 1.7)) ** 1.3;
    const al = (0.2 + rr() * 0.22) * a * bank * life;
    if (al < 0.01) continue;
    for (const dx of [-MW, 0, MW]) {
      const cx = x + dx;
      if (cx + rad * 2.4 < 0 || cx - rad * 2.4 > MW) continue;
      // lit on top by the moon, blue in its belly; rising a little as it swells
      const cy = y - age * 6;
      const g = c.createRadialGradient(cx - rad * 0.2, cy - rad * 0.4, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(206,218,244,${al.toFixed(3)})`);
      g.addColorStop(0.5, `rgba(140,158,200,${(al * 0.6).toFixed(3)})`);
      g.addColorStop(1, 'rgba(90,110,160,0)');
      c.fillStyle = g;
      c.save();
      c.translate(cx, cy);
      c.scale(2.4, 0.62);
      c.translate(-cx, -cy);
      c.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      c.restore();
    }
  }
  // thin out top and bottom
  c.save();
  c.globalCompositeOperation = 'destination-in';
  const lg = c.createLinearGradient(0, 0, 0, MH);
  lg.addColorStop(0, 'rgba(0,0,0,0)');
  lg.addColorStop(0.35, 'rgba(0,0,0,1)');
  lg.addColorStop(0.8, 'rgba(0,0,0,0.85)');
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = lg;
  c.fillRect(0, 0, MW, MH);
  c.restore();
}

/** The mist in the still: a band on the far water, one along the island's shore. */
function lakeMistStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(MW / 2, MH / 2);
  g.scale(0.5, 0.5);
  mistTile(g, 0);
  const [c2, g2] = makeCanvas(MW / 2, MH / 2);
  g2.scale(0.5, 0.5);
  mistTile(g2, 1);
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let x = -300; x < W; x += MW / 2) ctx.drawImage(c2, x, HOR - 24, MW / 2, MH / 2);
  ctx.globalAlpha = 0.55;
  for (let x = -140; x < W; x += MW) ctx.drawImage(c, x, 556, MW, MH);
  ctx.restore();
}
function groundMistStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(MW / 2, MH / 2);
  g.scale(0.5, 0.5);
  mistTile(g, 2);
  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let x = -500; x < W; x += MW) ctx.drawImage(c, x, GROUND_MIST_Y, MW, MH);
  ctx.restore();
}
const GROUND_MIST_Y = 640;

// ——— iron: links of a giant's chain ———

/** Light direction (towards the moon) in a frame rotated by ang. */
function lightIn(ang: number): [number, number] {
  const lx = -0.6;
  const ly = -0.8;
  const c = Math.cos(-ang);
  const s = Math.sin(-ang);
  return [lx * c - ly * s, lx * s + ly * c];
}

/** One link of a giant's iron chain at (x, y), its long axis along ang, L long and wd wide outside, the bar t thick.
 * face: seen flat (an oval ring round its slot); else edge-on (a bar with rounded ends, darker: it's turned from the
 * light). gap: burst open at its far end (radians of ring missing), the fracture raw iron. Lit by the moon up on the
 * left: the bar's moonward side and the far inside of the ring catch it, the inside bevel in occlusion. */
function link(ctx: Ctx, r: R, x: number, y: number, ang: number, L: number, wd: number, face: boolean, o: { gap?: number; rust?: number; t?: number } = {}): void {
  const t = o.t ?? wd * 0.24;
  const [lx, ly] = lightIn(ang);
  const R0 = L / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const body = ctx.createLinearGradient(lx * R0, ly * R0, -lx * R0, -ly * R0);
  body.addColorStop(0, IRON.top);
  body.addColorStop(0.25, IRON.lit);
  body.addColorStop(0.6, IRON.body);
  body.addColorStop(1, IRON.dark);
  const phi = Math.atan2(ly, lx);
  const rust = o.rust ?? 0.5;
  if (face) {
    const ox = L / 2;
    const oy = wd / 2;
    const ix = ox - t;
    const iy = oy - t;
    const gap = o.gap ?? 0;
    const a0 = gap / 2;
    const a1 = P2 - gap / 2;
    const shape = () => {
      ctx.beginPath();
      if (gap) {
        ctx.ellipse(0, 0, ox, oy, 0, a0, a1);
        ctx.ellipse(0, 0, ix, iy, 0, a1, a0, true);
        ctx.closePath();
      } else {
        ctx.ellipse(0, 0, ox, oy, 0, 0, P2);
        ctx.moveTo(ix, 0);
        ctx.ellipse(0, 0, ix, iy, 0, 0, P2, true);
      }
    };
    shape();
    ctx.fillStyle = body;
    ctx.fill('evenodd');
    ctx.save();
    shape();
    ctx.clip('evenodd');
    ctx.strokeStyle = rgba('#05060c', 0.55);
    ctx.lineWidth = t * 0.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, ix, iy, 0, 0, P2);
    ctx.stroke();
    // rust in the pits, worst underneath
    for (let k = 0; k < 6; k++) {
      const th = phi + Math.PI + (r() - 0.5) * 3.4;
      ctx.fillStyle = rgba(r() < 0.5 ? IRON.rust : IRON.rustDk, rust * (0.4 + r() * 0.4));
      ctx.beginPath();
      ctx.ellipse(Math.cos(th) * (ox - t / 2), Math.sin(th) * (oy - t / 2), t * (0.4 + r() * 0.4), t * (0.3 + r() * 0.3), th, 0, P2);
      ctx.fill();
    }
    // the moon on the round of the bar facing it (dull: old iron), faintly on the far inside of the ring
    ctx.strokeStyle = rgba(IRON.hi, 0.35);
    ctx.lineWidth = t * 0.26;
    ctx.beginPath();
    ctx.ellipse(0, 0, ox - t * 0.3, oy - t * 0.3, 0, phi - 0.7, phi + 0.7);
    ctx.stroke();
    ctx.strokeStyle = rgba(IRON.hi, 0.12);
    ctx.lineWidth = t * 0.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, ix + t * 0.15, iy + t * 0.15, 0, phi + Math.PI - 0.5, phi + Math.PI + 0.5);
    ctx.stroke();
    ctx.restore();
    shape();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    if (gap) {
      // the burst ends: raw iron where it tore
      for (const s of [a0, a1]) {
        const ex = Math.cos(s) * (ox - t / 2);
        const ey = Math.sin(s) * (oy - t / 2);
        ctx.fillStyle = IRON.raw;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(ex, ey, t * 0.32, t * 0.5, s, 0, P2);
        ctx.fill();
        ctx.stroke();
      }
    }
  } else {
    const h = t * 1.2;
    const hl = L / 2;
    const bar = () => {
      ctx.beginPath();
      ctx.moveTo(-hl + h / 2, -h / 2);
      ctx.lineTo(hl - h / 2, -h / 2);
      ctx.arc(hl - h / 2, 0, h / 2, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(-hl + h / 2, h / 2);
      ctx.arc(-hl + h / 2, 0, h / 2, Math.PI / 2, Math.PI * 1.5);
      ctx.closePath();
    };
    const sg = Math.sign(ly) || -1;
    const eb = ctx.createLinearGradient(0, sg * h * 0.5, 0, -sg * h * 0.5);
    eb.addColorStop(0, IRON.lit);
    eb.addColorStop(0.4, IRON.body);
    eb.addColorStop(1, IRON.dark);
    bar();
    ctx.fillStyle = eb;
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = rgba(r() < 0.5 ? IRON.rust : IRON.rustDk, rust * 0.55);
      ctx.beginPath();
      ctx.ellipse((r() - 0.5) * L * 0.7, -sg * h * 0.15, h * 0.4, h * 0.25, 0, 0, P2);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(IRON.hi, 0.25);
    ctx.lineWidth = h * 0.16;
    ctx.beginPath();
    ctx.moveTo(-hl + h * 0.6, sg * h * 0.22);
    ctx.lineTo(hl - h * 0.6, sg * h * 0.22);
    ctx.stroke();
    bar();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

/** Points every `step` px along a polyline, with the direction there. */
function along(pts: Pt[], step: number, off = step / 2): { x: number; y: number; a: number }[] {
  const out: { x: number; y: number; a: number }[] = [];
  let s = off;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const l = Math.hypot(bx - ax, by - ay);
    while (s <= acc + l) {
      const u = (s - acc) / l;
      out.push({ x: ax + (bx - ax) * u, y: ay + (by - ay) * u, a: Math.atan2(by - ay, bx - ax) });
      s += step;
    }
    acc += l;
  }
  return out;
}

/** A length of chain lying along pts (L long links, wd wide): each link's soft shadow on what it lies on, edge-on
 * links under the flat ones they thread through (each link's centre one inside length on from the last), so they
 * alternate flat ring and dark bar. broken: the last link sprung, bent open, and a torn piece of it lying a little
 * way off. */
function chain(ctx: Ctx, r: R, pts: Pt[], L: number, wd: number, o: { broken?: boolean; shadow?: number; rust?: number } = {}): void {
  const t = wd * 0.24;
  const at = along(pts, L - t * 2.2);
  const last = at[at.length - 1];
  const piece = o.broken && last ? { x: last.x + Math.cos(last.a) * L * 0.95 + 4, y: last.y + Math.sin(last.a) * L * 0.95 + 3, a: last.a + 1.1 } : null;
  if (o.shadow) {
    for (const p of piece ? [...at, piece] : at) {
      for (const [k, a, d] of [[1.25, o.shadow * 0.35, 6], [0.85, o.shadow * 0.6, 3]] as const) {
        ctx.fillStyle = rgba('#03040a', a);
        ctx.beginPath();
        ctx.ellipse(p.x + d, p.y + d * 0.9, (L / 2) * k, (wd / 2) * k * 0.8, p.a, 0, P2);
        ctx.fill();
      }
    }
  }
  for (const pass of [0, 1]) {
    at.forEach((p, i) => {
      const face = i % 2 === 1 || (!!o.broken && i === at.length - 1);
      if ((pass === 0) === face) return;
      const sprung = o.broken && i === at.length - 1;
      // (lying links settle a little askew; the sprung one is bent open and twisted)
      link(ctx, r, p.x, p.y, p.a + (sprung ? 0.35 : (r() - 0.5) * 0.12), L, wd * (sprung ? 1.15 : 1), face, { gap: sprung ? 1.7 : 0, rust: o.rust, t });
    });
  }
  if (piece) link(ctx, r, piece.x, piece.y, piece.a, L * 0.9, wd, true, { gap: 4.3, rust: o.rust, t });
}

// ——— the dead birch ———

/** A branch from (x, y) heading ang, len long, w thick at its root: forking, tapering, twisting a little; its
 * moonward edge (the moon is up and to its right) rimmed. */
function branch(ctx: Ctx, r: R, x: number, y: number, ang: number, len: number, w: number, depth: number, rims: [number, number, number, number, number][]): void {
  const n = 5;
  let px = x;
  let py = y;
  let a = ang;
  const segs: [number, number, number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    a += (r() - 0.5) * 0.5;
    // (the wind off the lake has bent it over to the right)
    a += (0.25 - Math.cos(a)) * 0.04;
    const nx = px + Math.cos(a) * (len / n);
    const ny = py + Math.sin(a) * (len / n);
    const ww = w * (1 - (i / n) * 0.7);
    segs.push([px, py, nx, ny, ww]);
    if (depth < 4 && i > 0 && r() < 0.55) branch(ctx, r, nx, ny, a + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.5), len * (0.35 + r() * 0.3), ww * 0.6, depth + 1, rims);
    px = nx;
    py = ny;
  }
  ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1, ww] of segs) {
    ctx.strokeStyle = '#0a0c16';
    ctx.lineWidth = ww;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    rims.push([x0, y0, x1, y1, ww]);
  }
  // fine twigs at the tips
  if (depth >= 2) {
    for (let k = 0; k < 3; k++) {
      const ta = a + (r() - 0.5) * 1.6;
      const tl = 6 + r() * 14;
      ctx.strokeStyle = '#0c0e1a';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(ta) * tl, py + Math.sin(ta) * tl);
      ctx.stroke();
    }
  }
}

/** A limb as one tapering silhouette along pts (w0 thick at its root, w1 at its tip): grey birch bark under the moon,
 * lit along the side facing it (up and to the right of the tree), black marks across it. */
function limb(ctx: Ctx, r: R, pts: Pt[], w0: number, w1: number): void {
  const n = pts.length - 1;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const lit: Pt[] = [];
  pts.forEach(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(n, i + 1)];
    const l = Math.hypot(bx - ax, by - ay) || 1;
    let nx = -(by - ay) / l;
    let ny = (bx - ax) / l;
    // (the normal on the moon's side)
    if (nx * 0.63 - ny * 0.77 < 0) {
      nx = -nx;
      ny = -ny;
    }
    const w = lerp(w0, w1, i / n) / 2;
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
    lit.push([x + nx * w * 0.55, y + ny * w * 0.55]);
  });
  const path = polyPath([...left, ...right.slice().reverse()]);
  path(ctx);
  ctx.fillStyle = '#272a38';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // the pale bark turned to the moon
  ctx.strokeStyle = rgba('#8e96b0', 0.75);
  ctx.lineWidth = Math.max(1, w0 * 0.32);
  ctx.beginPath();
  lit.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = rgba('#d0d8f0', 0.5);
  ctx.lineWidth = Math.max(0.8, w0 * 0.1);
  ctx.beginPath();
  left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  // black lenticels and peeling across it
  if (w0 > 6) {
    for (let i = 0; i < n * 3; i++) {
      const u = r();
      const k = Math.min(n - 1, Math.floor(u * n));
      const f = u * n - k;
      const [x0, y0] = pts[k];
      const [x1, y1] = pts[k + 1];
      const cx = lerp(x0, x1, f);
      const cy = lerp(y0, y1, f);
      const w = lerp(w0, w1, u) * (0.3 + r() * 0.4);
      ctx.strokeStyle = rgba('#05060c', 0.75);
      ctx.lineWidth = 1.2 + r();
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy + (r() - 0.5) * 2);
      ctx.lineTo(cx + w / 2, cy + (r() - 0.5) * 2);
      ctx.stroke();
    }
  }
  path(ctx);
  ctx.strokeStyle = '#05060c';
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function tree(ctx: Ctx, r: R): void {
  const rims: [number, number, number, number, number][] = [];
  // fine twigs off the limbs' ends first (behind them)
  for (const [x, y, a, l] of [[246, 400, -0.2, 50], [96, 336, -1.7, 40], [34, 496, -2.8, 36], [206, 370, -1.3, 40], [186, 422, -0.6, 30], [62, 504, -2.4, 26]] as const) {
    branch(ctx, r, x, y, a, l, 2.4, 2, rims);
  }
  for (const [x0, y0, x1, y1, ww] of rims) {
    ctx.strokeStyle = rgba('#a8b4d8', 0.35);
    ctx.lineWidth = Math.max(0.6, ww * 0.35);
    ctx.beginPath();
    ctx.moveTo(x0 + 0.6, y0 - 0.8);
    ctx.lineTo(x1 + 0.6, y1 - 0.8);
    ctx.stroke();
  }
  // a birch long dead on the back of the rock, bent over by the wind off the lake, its crown snapped off
  limb(ctx, r, [[102, 532], [80, 514], [56, 502], [34, 496]], 11, 3);
  limb(ctx, r, [[118, 432], [110, 400], [102, 368], [96, 336]], 11, 3);
  limb(ctx, r, [[112, 478], [142, 452], [180, 426], [214, 408], [246, 400]], 14, 3.2);
  limb(ctx, r, [[180, 428], [196, 398], [206, 370]], 5.5, 2);
  limb(ctx, r, [[94, 612], [97, 562], [103, 514], [111, 468], [117, 426], [121, 392]], 32, 17);

  // the snapped top: a jagged break, its splinters lit
  const [tx, ty] = [121, 392];
  ctx.fillStyle = '#272a38';
  ctx.strokeStyle = '#05060c';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(tx - 7, ty + 2);
  ctx.lineTo(tx - 5, ty - 16);
  ctx.lineTo(tx - 1, ty - 4);
  ctx.lineTo(tx + 2, ty - 22);
  ctx.lineTo(tx + 4, ty - 6);
  ctx.lineTo(tx + 7, ty + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = rgba('#d0d8f0', 0.55);
  ctx.beginPath();
  ctx.moveTo(tx + 2, ty - 20);
  ctx.lineTo(tx + 5, ty - 4);
  ctx.stroke();
  // rime on the upper sides of the limbs
  for (const pts of [[[112, 478], [142, 452], [180, 426], [214, 408], [246, 400]], [[102, 532], [80, 514], [56, 502], [34, 496]]] as Pt[][]) {
    ctx.strokeStyle = rgba('#e8f0ff', 0.4);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 4) : ctx.moveTo(x, y - 4)));
    ctx.stroke();
  }
  // its roots gripping the rock
  for (const dx of [-16, -7, 9, 18]) {
    ctx.strokeStyle = '#0c0e18';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(94 + dx * 0.3, 600);
    ctx.quadraticCurveTo(94 + dx, 604, 94 + dx * 2.2, 612 + Math.abs(dx) * 0.2);
    ctx.stroke();
    ctx.strokeStyle = rgba('#8e96b0', 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/** Where the birch's limbs are, roughly (rime and frost dust fall from them). */
export const TREE_SPOTS: Pt[] = [[246, 400], [96, 340], [36, 496], [206, 372], [180, 426], [120, 400], [70, 508]];

// ——— the scored rock ———

const SLAB_PTS: Pt[] = smooth([[-14, 746], [-16, 646], [6, 610], [52, 590], [118, 580], [190, 584], [252, 598], [304, 620], [344, 650], [368, 688], [378, 746]], 6);
/** Where the whaleback's moonlit top rolls over into its shaded front (the terminator, soft), x → y. */
const slabArris = (x: number) => 624 + Math.max(0, (x - 30) / 340) ** 1.5 * 62 + wave1(x, 21) * 3;

/** A claw gouge raked along pts, w wide at its deepest: a trench tapering at both ends, its upper wall in shadow, its
 * far wall the paler raw stone the claw laid bare, catching the light, a lit lip along its lower edge. */
function gouge(ctx: Ctx, r: R, pts: Pt[], w: number, raw = '#8a96bc', lip = 0.45): void {
  const n = pts.length - 1;
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(n, i + 1)];
    const l = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / l;
    const ny = (bx - ax) / l;
    const t = i / n;
    const ww = (w / 2) * Math.max(0.08, Math.sin(Math.min(1, t * 1.1 + 0.02) * Math.PI) ** 0.55);
    left.push([x + nx * ww, y + ny * ww]);
    right.push([x - nx * ww, y - ny * ww]);
  });
  const trench = polyPath([...left, ...right.reverse()]);
  ctx.save();
  trench(ctx);
  ctx.fillStyle = rgba('#05060e', 0.92);
  ctx.fill();
  within(ctx, trench, () => {
    // the far wall, raw and pale, down and to the right of the trench's floor
    ctx.translate(w * 0.28, w * 0.34);
    trench(ctx);
    const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[n][0], pts[n][1]);
    g.addColorStop(0, rgba(raw, 0.85));
    g.addColorStop(1, rgba(raw, 0.55));
    ctx.fillStyle = g;
    ctx.fill();
    // scored by the claw's edge along its length
    ctx.strokeStyle = rgba('#05060e', 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + w * 0.1, y + w * 0.1) : ctx.moveTo(x + w * 0.1, y + w * 0.1)));
    ctx.stroke();
  });
  // a lit lip where the stone breaks over into the trench on its lower side
  ctx.strokeStyle = rgba('#c8d4f2', lip);
  ctx.lineWidth = Math.max(1, w * 0.1);
  ctx.beginPath();
  right.forEach(([x, y], i) => (i ? ctx.lineTo(x + 1, y + 1) : ctx.moveTo(x + 1, y + 1)));
  ctx.stroke();
  ctx.restore();
  // grit and flakes of fresh stone torn out round where it bit in
  const [sx, sy] = pts[0];
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = rgba(raw, 0.5);
    ctx.fillRect(sx + (r() - 0.3) * w * 2.5, sy + (r() - 0.5) * w * 1.6, 1.5 + r() * 2, 1.5 + r() * 1.5);
  }
}

/** A gouge's path: from (x0, y0) to (x1, y1), bowed. */
function rake(x0: number, y0: number, x1: number, y1: number, bow: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    pts.push([lerp(x0, x1, u) + Math.sin(u * Math.PI) * bow, lerp(y0, y1, u) + Math.sin(u * Math.PI) * bow * 0.3]);
  }
  return pts;
}

/** Snow fill for a cushion or a drift from y0 (its top) to y1 (its foot): old snow under the moon, grey-white where
 * the light reaches it, cooling to slate down its flanks. */
function snowFill(ctx: Ctx, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#b4bac8');
  g.addColorStop(0.35, '#848ca2');
  g.addColorStop(1, '#3e4458');
  return g;
}

/** Snow lying along a top edge (pts left to right): a cushion th thick, lumpy, thinning at its ends, its lip
 * scalloped where it hangs over, a soft blue shadow under it. */
function snowOn(ctx: Ctx, r: R, pts: Pt[], th: number): void {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const n = pts.length - 1;
  pts.forEach(([x, y], i) => {
    const t = i / n;
    const h = th * Math.sin(t * Math.PI) ** 0.45 * (0.75 + r() * 0.5);
    top.push([x, y - h * 0.6]);
    bot.push([x, y + h * 0.4 + (r() < 0.3 ? r() * h * 0.7 : 0)]);
  });
  const path = polyPath([...top, ...bot.slice().reverse()]);
  castShadow(ctx, path, 4, 5, 0.35, '#080e2a');
  path(ctx);
  const ys = top.map((p) => p[1]);
  ctx.fillStyle = snowFill(ctx, Math.min(...ys), Math.max(...bot.map((p) => p[1])));
  ctx.fill();
  ctx.strokeStyle = rgba('#1a2448', 0.8);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1.2) : ctx.moveTo(x, y + 1.2)));
  ctx.stroke();
}

/** A drift or a patch of old snow lying on the heath at (x, y) (its foot), w wide and h high: a soft heaped lump,
 * its crest lit from the upper left, slate in its lee, tufts poking through it. */
function snowPatch(ctx: Ctx, r: R, x: number, y: number, w: number, h: number): void {
  const pts: Pt[] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    // (a drift: a gentle windward slope up from the left to a rounded crest, a steeper lee)
    const s = u < 0.62 ? Math.sin((u / 0.62) * Math.PI / 2) : Math.cos(((u - 0.62) / 0.38) * Math.PI / 2);
    const bump = s ** 0.8 * (0.88 + 0.12 * Math.sin(u * 11 + x));
    pts.push([x - w / 2 + u * w, y - h * bump]);
  }
  pts.push([x + w / 2 + 4, y + 2], [x - w / 2 - 4, y + 2]);
  const path = polyPath(pts);
  groundShadow(ctx, x + w * 0.15, y + 1, w * 0.55, h * 0.25, 0.4, '#04060e', 1.2);
  path(ctx);
  ctx.fillStyle = snowFill(ctx, y - h, y + 2);
  ctx.fill();
  within(ctx, path, () => {
    // its lee (down and right, away from the moon) in shade; a soft light on the crest's moonward side
    const lg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    lg.addColorStop(0, 'rgba(40,44,60,0)');
    lg.addColorStop(1, 'rgba(24,28,44,0.45)');
    ctx.fillStyle = lg;
    ctx.fillRect(x - w / 2 - 6, y - h - 4, w + 12, h + 8);
    const hg = ctx.createRadialGradient(x - w * 0.12, y - h, 0, x - w * 0.12, y - h, w * 0.4);
    hg.addColorStop(0, 'rgba(206,210,222,0.35)');
    hg.addColorStop(1, 'rgba(206,210,222,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(x - w / 2, y - h - 4, w, h + 8);
  });
  // (no hard outline: just a darker edge along its foot where it meets the heath)
  ctx.strokeStyle = rgba('#0a0c18', 0.45);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 4, y + 1);
  ctx.lineTo(x + w / 2 + 4, y + 1);
  ctx.stroke();
  for (let i = 0; i < Math.round(w / 18); i++) tuft(ctx, r, x - w / 2 + r() * w, y - r() * h * 0.5, 0.7 * kAt(y));
}
function slab(ctx: Ctx, r: R): void {
  const path = polyPath(SLAB_PTS);
  const box = { x: -16, y: 576, w: 400, h: 174 };
  castShadow(ctx, path, 16, 14, 0.5, '#03040a');
  path(ctx);
  ctx.fillStyle = GRANITE.shade;
  ctx.fill();
  within(ctx, path, () => {
    // a whaleback of bedrock the ice ground round: lit on its crown by the moon, rolling off through a soft
    // terminator into its shaded front
    const rg = ctx.createRadialGradient(130, 586, 10, 150, 610, 330);
    rg.addColorStop(0, '#68749a');
    rg.addColorStop(0.28, '#454e70');
    rg.addColorStop(0.58, '#242a42');
    rg.addColorStop(1, '#0e1124');
    ctx.fillStyle = rg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    softly(ctx, box, (g) => {
      g.fillStyle = 'rgba(8,10,22,0.45)';
      g.beginPath();
      g.moveTo(-16, slabArris(-16) + 10);
      for (let x = -16; x <= 390; x += 10) g.lineTo(x, slabArris(x) + 10);
      g.lineTo(390, 760);
      g.lineTo(-16, 760);
      g.closePath();
      g.fill();
    }, 0.2);
    surface(ctx, r, box, '#3e4664', { over: true, vary: 0.3, cells: 4, mottle: 0.35, strokes: 0.4, strokeAng: 0.15, strokeLen: 80, strokeW: 4, grain: 0.25, grainKind: 'speckle', seed: 211 });
    grain(ctx, box, 'speckle', 0.22, 1.5);
    // granite: black mica and pale feldspar crystals through it
    for (let i = 0; i < 130; i++) {
      const lit = r() < 0.45;
      ctx.fillStyle = rgba(lit ? '#a8b2d0' : '#06070e', lit ? 0.14 + r() * 0.14 : 0.3 + r() * 0.2);
      ctx.fillRect(box.x + r() * box.w, box.y + r() * box.h, 1.5 + r() * 2.5, 1.2 + r() * 1.8);
    }
    // glacial striations on the crown, faint, running the way the ice went
    for (let i = 0; i < 14; i++) {
      const x0 = r() * 280;
      const y0 = 592 + r() * 24;
      ctx.strokeStyle = rgba(r() < 0.5 ? '#9aa6cc' : '#141a2e', 0.16);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + 40 + r() * 60, y0 + 6 + r() * 6);
      ctx.stroke();
    }
    // old snow lying on the crown, thinning down to the terminator
    softly(ctx, box, (g) => {
      const sg = g.createLinearGradient(0, 580, 0, 640);
      sg.addColorStop(0, 'rgba(184,190,206,0.6)');
      sg.addColorStop(1, 'rgba(184,190,206,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.moveTo(-16, 600);
      SLAB_PTS.filter(([x, y]) => y < 640 && x < 330).forEach(([x, y]) => g.lineTo(x, y));
      for (let x = 320; x >= -16; x -= 10) g.lineTo(x, slabArris(x) - 4 - Math.abs(wave1(x * 2, 5)) * 12);
      g.closePath();
      g.fill();
    }, 0.5);
    // lichen, sparse, on the shaded front
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#8a9878' : '#a89a70', 0.3);
      ctx.fillRect(box.x + r() * box.w, 670 + r() * 70, 1.5 + r() * 2, 1.5 + r() * 2);
    }
    // the claws: three deep scores raked across the crown and over its shoulder, snow lodged in their floors
    for (let i = 0; i < 3; i++) gouge(ctx, r, rake(30 - i * 7, 604 + i * 22, 216 - i * 7, 656 + i * 22, -10), 15 - i, '#9aa0b4', 0.4);
    for (let i = 0; i < 3; i++) crack(ctx, r, 60 + r() * 260, 668 + r() * 56, Math.PI / 2 + (r() - 0.5), 26 + r() * 30, { col: INK, lip: '#8a96bc', w: 1.3, a: 0.5 });
    vfill(ctx, box.x, 700, box.w, 50, [[0, 'rgba(4,6,16,0)'], [1, 'rgba(4,6,16,0.45)']]);
  });
  path(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // the moon along its crown
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.strokeStyle = rgba('#d0dcff', 0.35);
  ctx.lineWidth = 3;
  ctx.beginPath();
  SLAB_PTS.filter(([x, y]) => y < 630 && x < 300).forEach(([x, y], i) => (i ? ctx.lineTo(x + 1.5, y + 1.5) : ctx.moveTo(x + 1.5, y + 1.5)));
  ctx.stroke();
  ctx.restore();
  // sat in the heath: dark where it goes in
  crevice(ctx, -12, 380, 742, -16, 0.5, '#02030a');
}

// ——— the heath ———

const islandPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(-4, TY + 6);
  for (let x = -4; x <= W + 8; x += 6) c.lineTo(x, shoreY(x));
  c.lineTo(W + 4, TY + 6);
  c.closePath();
};

/** A tuft of frosted grass at (x, y), k its scale. */
function tuft(ctx: Ctx, r: R, x: number, y: number, k: number, a = 1): void {
  const n = 4 + Math.floor(r() * 5);
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const h = (8 + r() * 12) * k;
    const lean = (r() - 0.35) * 7 * k;
    const bx = x + (r() - 0.5) * 6 * k;
    ctx.strokeStyle = rgba(mix('#1a1c24', '#3a4040', r()), a);
    ctx.lineWidth = Math.max(0.8, 1.6 * k);
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.quadraticCurveTo(bx + lean * 0.3, y - h * 0.6, bx + lean, y - h);
    ctx.stroke();
    // the frost on its tip, lit
    ctx.strokeStyle = rgba(HEATH.frost, (0.35 + r() * 0.4) * a);
    ctx.lineWidth = Math.max(0.6, 1.1 * k);
    ctx.beginPath();
    ctx.moveTo(bx + lean * 0.7, y - h * 0.72);
    ctx.lineTo(bx + lean, y - h);
    ctx.stroke();
  }
}

/** A clump of heather: a low dome of dark wiry sprays, their tips lit a dull plum-grey, rime speckled on them. */
function heather(ctx: Ctx, r: R, x: number, y: number, k: number, a = 1): void {
  const w = (12 + r() * 16) * k;
  const h = (6 + r() * 6) * k;
  ctx.fillStyle = rgba('#07060c', 0.55 * a);
  ctx.beginPath();
  ctx.ellipse(x + w * 0.22, y + 1, w * 0.6, h * 0.28, 0, 0, P2);
  ctx.fill();
  ctx.lineCap = 'round';
  // wiry stems fanning up, then the sprays on them
  for (let i = 0; i < 7; i++) {
    const u = r() * 2 - 1;
    ctx.strokeStyle = rgba('#120e16', a);
    ctx.lineWidth = Math.max(0.8, 1.2 * k);
    ctx.beginPath();
    ctx.moveTo(x + u * w * 0.2, y);
    ctx.lineTo(x + u * w * 0.5, y - (1 - u * u) * h * 0.9);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const u = r() * 2 - 1;
    const px = x + u * w * 0.5;
    const py = y - (1 - u * u) * h * (0.55 + r() * 0.5);
    const rr = (1.6 + r() * 2.2) * k;
    const top = py < y - h * 0.5;
    ctx.fillStyle = rgba(top ? (r() < 0.5 ? '#4a3e54' : '#3a3044') : '#1c1622', a);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 1.3, rr, 0, 0, P2);
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = rgba(HEATH.frost, 0.45 * a);
    ctx.fillRect(x + (r() - 0.5) * w * 0.7, y - h * (0.6 + r() * 0.4), 1.3 * k, 1.1 * k);
  }
}

/** A stone half sunk in the heath at (x, y) (its foot), s wide. */
function pebble(ctx: Ctx, r: R, x: number, y: number, s: number): void {
  const h = s * (0.4 + r() * 0.25);
  const p = polyPath([[x - s / 2, y], [x - s * 0.42, y - h * 0.7], [x - s * 0.12, y - h], [x + s * 0.3, y - h * 0.86], [x + s / 2, y - h * 0.2], [x + s * 0.46, y]]);
  groundShadow(ctx, x + s * 0.3, y, s * 0.6, s * 0.12, 0.45, '#02030a', 1.2);
  p(ctx);
  const g = ctx.createLinearGradient(x - s / 2, y - h, x + s / 2, y);
  g.addColorStop(0, '#6a7498');
  g.addColorStop(0.5, '#363e5a');
  g.addColorStop(1, '#161a2a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = rgba('#dce6ff', 0.4);
  ctx.fillRect(x - s * 0.3, y - h * 0.96, s * 0.4, 1.4);
}

function heath(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 600, w: W, h: TY + 6 - 600 };
  islandPath(ctx);
  ctx.fillStyle = HEATH.peat;
  ctx.fill();
  within(ctx, islandPath, () => {
    vfill(ctx, 0, 600, W, TY + 6 - 600, [[0, '#282a38'], [0.3, '#1c1c28'], [1, '#101018']]);
    surface(ctx, r, box, '#1c1c28', { over: true, vary: 0.4, warm: '#342a3c', cool: '#121a2c', cells: 6, mottle: 0.5, strokes: 0.6, strokeAng: 0, strokeLen: 70, strokeW: 4, grain: 0.2, seed: 241 });
    // the heather's dull plum and the bleached grass in broad drifts, frost silvering the far ground in the moon
    lay(ctx, noiseMask(9, 243, { cover: 0.45, soft: 0.5, col: '#30263a', w: 240, h: 30 }), box, 0.45);
    lay(ctx, noiseMask(12, 247, { cover: 0.35, soft: 0.5, col: '#444c5a', w: 240, h: 30 }), box, 0.28);
    vfill(ctx, 0, 620, W, 60, [[0, rgba('#a8b8e0', 0.16)], [1, rgba('#a8b8e0', 0)]]);
    // hummocks: low mounds of heath, lit on their tops and moonward sides, a soft shadow down to the right
    const hr = rng(hashStr('fe:hummocks'));
    for (let i = 0; i < 22; i++) {
      const x = hr() * W;
      const y0 = shoreY(x) + 8;
      const y = y0 + hr() ** 0.9 * (TY - 6 - y0);
      const k = kAt(y);
      const w = (40 + hr() * 70) * k;
      const h = (5 + hr() * 6) * k;
      const mid = Math.exp(-(((x - 960) / 380) ** 2));
      softly(ctx, { x: x - w * 1.4, y: y - h * 2, w: w * 3, h: h * 4 }, (g) => {
        const sg = g.createRadialGradient(x + w * 0.3, y + h * 0.3, 0, x + w * 0.3, y + h * 0.3, w);
        sg.addColorStop(0, 'rgba(4,4,10,0.4)');
        sg.addColorStop(1, 'rgba(4,4,10,0)');
        g.fillStyle = sg;
        g.save();
        g.translate(x + w * 0.3, y + h * 0.3);
        g.scale(1, (h * 1.6) / w);
        g.translate(-(x + w * 0.3), -(y + h * 0.3));
        g.fillRect(x - w, y - w, w * 2.6, w * 2.6);
        g.restore();
        const lg = g.createRadialGradient(x - w * 0.25, y - h * 0.6, 0, x - w * 0.25, y - h * 0.6, w * 0.8);
        lg.addColorStop(0, `rgba(150,160,196,${(0.2 * (1 - mid * 0.5)).toFixed(3)})`);
        lg.addColorStop(1, 'rgba(150,160,196,0)');
        g.fillStyle = lg;
        g.save();
        g.translate(x - w * 0.25, y - h * 0.6);
        g.scale(1, h / w);
        g.translate(-(x - w * 0.25), -(y - h * 0.6));
        g.fillRect(x - w * 1.2, y - w, w * 2, w * 2);
        g.restore();
      }, 0.5);
    }
    // lingering snow in the lee of hummocks
    softly(ctx, box, (g) => {
      for (let i = 0; i < 14; i++) {
        const x = r() * W;
        const y = shoreY(x) + 10 + r() * (TY - shoreY(x) - 20);
        const k = kAt(y);
        g.fillStyle = `rgba(190,204,236,${(0.1 + r() * 0.12).toFixed(3)})`;
        g.beginPath();
        g.ellipse(x, y, (30 + r() * 50) * k, (3 + r() * 4) * k, 0, 0, P2);
        g.fill();
      }
    }, 0.25);
    // the shore: the moon on the grass along its edge, stones at the water
    ctx.strokeStyle = rgba('#b8c8ec', 0.26);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 6) ctx.lineTo(x, shoreY(x) + 1);
    ctx.stroke();
    for (let x = 420 + r() * 60; x < 1460; x += 140 + r() * 220) pebble(ctx, r, x, shoreY(x) + 6, 6 + r() * 7);
    // tufts and heather, smaller towards the shore, in clumps, few and quiet behind the middle lanes
    const spots: [number, number, number][] = [];
    for (let c = 0; c < 70; c++) {
      const cx = r() * W;
      const y0 = shoreY(cx) + 3;
      const cy = y0 + r() ** 0.8 * (TY + 4 - y0);
      const mid = Math.exp(-(((cx - 960) / 420) ** 2));
      const n = Math.round((6 + r() * 12) * (1 - mid * 0.6));
      const kind = r();
      for (let i = 0; i < n; i++) {
        const x = cx + (r() - 0.5) * 120 * kAt(cy);
        const y = Math.max(shoreY(x) + 3, cy + (r() - 0.5) * 24 * kAt(cy));
        spots.push([x, y, kind < 0.45 ? r() * 0.7 : 0.3 + r() * 0.7]);
      }
    }
    for (let i = 0; i < 260; i++) {
      const x = r() * W;
      const y0 = shoreY(x) + 3;
      const mid = Math.exp(-(((x - 960) / 420) ** 2));
      if (r() < mid * 0.6) continue;
      spots.push([x, y0 + r() ** 0.8 * (TY + 4 - y0), 0.4 + r() * 0.6]);
    }
    spots.sort((a, b) => a[1] - b[1]);
    for (const [x, y, kind] of spots) {
      const k = kAt(y);
      const mid = Math.exp(-(((x - 960) / 420) ** 2));
      const a = 1 - mid * 0.4;
      if (kind < 0.4) heather(ctx, r, x, y, k, a);
      else tuft(ctx, r, x, y, k, a);
    }
    for (let i = 0; i < 9; i++) {
      const x = r() < 0.5 ? 400 + r() * 280 : 1180 + r() * 160;
      const y = shoreY(x) + 20 + r() * (TY - shoreY(x) - 30);
      pebble(ctx, r, x, y, (10 + r() * 16) * kAt(y));
    }
    // old snow lying in the hollows of the heath, away from the middle
    for (const [x, y, w, h] of [[530, 706, 110, 10], [700, 742, 70, 8], [430, 752, 90, 10], [1150, 700, 80, 8], [1240, 752, 70, 8], [1580, 650, 60, 6]] as const) snowPatch(ctx, r, x, y, w * kAt(y), h * kAt(y));

  });
}

// ——— the wolf's hollow ———

function hollow(ctx: Ctx, r: R): void {
  const { x, y, rx, ry } = FE.hollow;
  const bowl: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, P2);
  };
  bowl(ctx);
  ctx.fillStyle = '#07070b';
  ctx.fill();
  within(ctx, bowl, () => {
    // the far wall: a crescent of bare earth turned up to the moon and to us under the far rim, lit, frosted; the
    // turf overhanging the rim throws a dark line along its top
    const wall: PathFn = (c) => {
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, Math.PI, P2);
      c.ellipse(x + 6, y + ry * 0.42, rx * 0.9, ry * 0.72, 0, P2, Math.PI, true);
      c.closePath();
    };
    wall(ctx);
    const wg = ctx.createLinearGradient(0, y - ry, 0, y + ry * 0.2);
    wg.addColorStop(0, '#2a2834');
    wg.addColorStop(0.25, '#4e4c60');
    wg.addColorStop(1, '#22202c');
    ctx.fillStyle = wg;
    ctx.fill();
    within(ctx, wall, () => {
      surface(ctx, r, { x: x - rx, y: y - ry, w: rx * 2, h: ry * 1.4 }, '#3a3848', { over: true, vary: 0.3, cells: 5, mottle: 0.5, strokes: 0, grain: 0.3, grainKind: 'speckle', seed: 251 });
      lay(ctx, noiseMask(18, 253, { cover: 0.4, soft: 0.25, col: '#aab0c2', w: 140, h: 24 }), { x: x - rx, y: y - ry, w: rx * 2, h: ry }, 0.3);
      // its left end in the shade of the lip
      const lg = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
      lg.addColorStop(0, 'rgba(2,2,8,0.7)');
      lg.addColorStop(0.3, 'rgba(2,2,8,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
      // claw scrapes where he turned and turned
      for (let i = 0; i < 4; i++) gouge(ctx, r, rake(x - 50 + i * 16, y - ry + 6, x + 46 + i * 18, y - ry + 13, -3), 4.5, '#6a6478', 0.3);
    });
    ctx.strokeStyle = rgba('#020206', 0.8);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 1.5, rx, ry, 0, Math.PI * 1.04, Math.PI * 1.96);
    ctx.stroke();
    // the floor: in the dark, a little frost and grey fur caught in it
    for (let i = 0; i < 20; i++) {
      const fx = x + (r() - 0.5) * rx * 1.3;
      const fy = y + r() * ry * 0.4;
      ctx.strokeStyle = rgba(r() < 0.5 ? '#6a6678' : '#4a4656', 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + 3, fy - 3, fx + 6 + r() * 4, fy - 1);
      ctx.stroke();
    }
  });
  // the far rim: the turf's broken edge lit by the moon, a few clods of turned earth thrown up on it
  ctx.strokeStyle = rgba('#8e90a8', 0.5);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(x, y - 1, rx, ry, 0, Math.PI * 1.06, Math.PI * 1.94);
  ctx.stroke();
  const clod = (cx: number, cy: number, s: number) => {
    groundShadow(ctx, cx + s * 0.4, cy + s * 0.3, s, s * 0.3, 0.45, '#02030a');
    ctx.fillStyle = '#1c181e';
    ctx.beginPath();
    ctx.ellipse(cx, cy, s, s * 0.55, (r() - 0.5) * 0.6, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#625c6e', 0.6);
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.2, cy - s * 0.25, s * 0.55, s * 0.18, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#b8bccc', 0.45);
    ctx.fillRect(cx - s * 0.4, cy - s * 0.42, 1.4, 1.2);
  };
  for (let i = 0; i < 12; i++) {
    const th = Math.PI * (1.08 + r() * 0.84);
    clod(x + Math.cos(th) * rx * (1.03 + r() * 0.08), y + Math.sin(th) * ry * (1.1 + r() * 0.3) - 2, 3 + r() * 4);
  }
  for (let i = 0; i < 7; i++) {
    const cx = x + (r() - 0.5) * rx * 2.2;
    clod(cx, y - ry - 10 - r() * 24, 5 + r() * 5);
  }
  // the near lip: a ridge of torn turf standing between us and the floor, its top lit, grass in front of it
  const lip: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y + 2, rx * 1.02, ry * 0.95, 0, Math.PI * 0.02, Math.PI * 0.98);
    c.ellipse(x, y + 10, rx * 1.05, ry * 0.9, 0, Math.PI * 0.98, Math.PI * 0.02, true);
    c.closePath();
  };
  lip(ctx);
  ctx.fillStyle = '#18161e';
  ctx.fill();
  ctx.strokeStyle = rgba('#7a7c94', 0.55);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y + 2, rx * 1.02, ry * 0.95, 0, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  for (let i = 0; i < 22; i++) {
    const th = Math.PI * (0.06 + r() * 0.88);
    tuft(ctx, r, x + Math.cos(th) * rx * 1.04, y + Math.sin(th) * ry * 0.95 + 10 + r() * 3, 0.85);
  }
}

/** The fetters he broke before Gleipnir: Lœðing draped over the scored rock, Drómi burst and lying in his hollow. */
const LODING: Pt[] = [[176, 596], [222, 604], [256, 622], [282, 648], [300, 676], [318, 704], [338, 730], [366, 746], [404, 752], [440, 754]];
const DROMI: Pt[] = [[1460, 730], [1414, 735], [1368, 741], [1320, 745], [1272, 747], [1228, 745]];

function fetters(ctx: Ctx, r: R): void {
  chain(ctx, r, LODING, 32, 15, { broken: true, shadow: 0.6, rust: 0.8 });
  // (its burst end tucked into the heath)
  for (let i = 0; i < 6; i++) tuft(ctx, r, 420 + r() * 50, 756 + r() * 4, 1);
  chain(ctx, r, DROMI, 34, 16, { broken: true, shadow: 0.55, rust: 0.7 });
  for (let i = 0; i < 4; i++) tuft(ctx, r, 1196 + r() * 40, 752 + r() * 4, 0.9);
}

// ——— the binding stone ———

/** A smooth closed-ish curve through control points (Catmull-Rom), per points per span. */
function smooth(pts: Pt[], per: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** The binding stone's outline: a boulder the ice ground round, broad in the shoulder, its crown leaning left, its
 * foot driven down into the turf. */
const STONE_CTRL: Pt[] = [[1438, 736], [1444, 678], [1460, 612], [1488, 542], [1528, 478], [1578, 422], [1634, 380], [1696, 354], [1758, 350], [1814, 368], [1858, 402], [1890, 450], [1908, 512], [1916, 590], [1920, 662], [1924, 736]];
const STONE_PTS: Pt[] = (() => {
  const rr = rng(hashStr('fe:stone'));
  return smooth(STONE_CTRL, 7).map(([x, y], i, a) => (i === 0 || i === a.length - 1 ? [x, y] : [x + (rr() - 0.5) * 3, y + (rr() - 0.5) * 3]) as Pt);
})();
const stonePath = polyPath(STONE_PTS);
/** The arris between the rounded front and the broken right face (where a slab split off it long ago), top to bottom. */
const STONE_ARRIS: Pt[] = [[1826, 376], [1846, 432], [1858, 500], [1866, 580], [1872, 660], [1876, 736]];

/** The runestone band round the ring: a serpent's body carved in an arc over it, the runes inside. */
const BAND = { cx: FE.ring.x, cy: FE.ring.y - 4, r0: 92, r1: 120, a0: Math.PI * 1.04, a1: Math.PI * 1.96 };
/** Where the runes run (x, y, size, glyph, angle), for the live glow too. */
export const STONE_RUNES: [number, number, number, number, number][] = (() => {
  const out: [number, number, number, number, number][] = [];
  const n = 9;
  const rm = (BAND.r0 + BAND.r1) / 2;
  for (let i = 0; i < n; i++) {
    const th = BAND.a0 + ((i + 0.5) / n) * (BAND.a1 - BAND.a0);
    out.push([BAND.cx + Math.cos(th) * rm, BAND.cy + Math.sin(th) * rm, 20, i * 3 + 2, th + Math.PI / 2]);
  }
  return out;
})();

/** The four claw gouges down the stone's face (where he fought it): raked from up on the right down to the left,
 * through the end of the runes' band. */
const STONE_GOUGES: Pt[][] = [[1724, 404, 1676, 600, 26], [1756, 396, 1716, 640, 30], [1788, 404, 1758, 650, 28], [1816, 424, 1798, 620, 22]].map(([x0, y0, x1, y1, b]) => rake(x0, y0, x1, y1, b));

/** A line cut into the stone along pts: a V-groove, its upper wall in shadow, a lit lip below it. */
function cut(ctx: Ctx, draw: (c: Ctx) => void, w: number, a = 1): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.translate(w * 0.45, w * 0.5);
  draw(ctx);
  ctx.strokeStyle = rgba('#c4d0ee', 0.38 * a);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.translate(-w * 0.45, -w * 0.5);
  draw(ctx);
  ctx.strokeStyle = rgba(INK, 0.85 * a);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

/** The serpent carved round the ring as a runestone's band: its head at the left end (a snout, a jaw, an eye), its
 * body scaled along both edges, the runes inside it, its tail tapering off past the right end in a curl. */
function runeBand(ctx: Ctx): void {
  const { cx, cy, r0, r1, a0, a1 } = BAND;
  const rm = (r0 + r1) / 2;
  const at = (a: number, rad: number): Pt => [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  // the band's face, a touch smoother than the rough stone round it
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r1, a0, a1);
  ctx.arc(cx, cy, r0, a1, a0, true);
  ctx.closePath();
  ctx.fillStyle = rgba('#8a96bc', 0.08);
  ctx.fill();
  ctx.restore();
  for (const rad of [r0, r1]) cut(ctx, (c) => {
    c.beginPath();
    c.arc(cx, cy, rad, a0, a1);
  }, 2.6);
  // scales: a row of little arcs cut along each edge, between the runes
  for (let a = a0 + 0.05; a < a1 - 0.02; a += 0.045) {
    for (const [rad, s] of [[r0 + 4.5, 1], [r1 - 4.5, -1]] as const) {
      const [x, y] = at(a, rad);
      cut(ctx, (c) => {
        c.beginPath();
        c.arc(x, y, 3.2, a + (s > 0 ? Math.PI * 0.1 : Math.PI * 1.1), a + (s > 0 ? Math.PI * 0.9 : Math.PI * 1.9));
      }, 1, 0.55);
    }
  }
  // the head: the band's left end swelling into a snout, the jaw line, an eye
  const [hx, hy] = at(a0, rm);
  cut(ctx, (c) => {
    c.beginPath();
    c.moveTo(...at(a0, r1));
    c.bezierCurveTo(hx - 22, hy - 6, hx - 30, hy + 14, hx - 10, hy + 26);
    c.quadraticCurveTo(hx - 2, hy + 20, ...at(a0, r0));
  }, 2.6);
  cut(ctx, (c) => {
    c.beginPath();
    c.moveTo(hx - 24, hy + 12);
    c.quadraticCurveTo(hx - 10, hy + 8, hx + 2, hy + 12);
  }, 1.6);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx - 8, hy + 1, 3, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba(RUNE, 0.5);
  ctx.beginPath();
  ctx.arc(hx - 8, hy + 1, 1.2, 0, P2);
  ctx.fill();
  // the tail: the band narrowing past its right end, curling down and in
  const tail: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    tail.push(at(a1 + u * 0.42, rm - u * 26 + Math.sin(u * Math.PI) * 4));
  }
  const tw = (u: number) => ((r1 - r0) / 2) * (1 - u) ** 0.8;
  for (const s of [1, -1]) cut(ctx, (c) => {
    c.beginPath();
    tail.forEach(([x, y], i) => {
      const u = i / 12;
      const a = a1 + u * 0.42;
      const px = x + Math.cos(a) * tw(u) * s;
      const py = y + Math.sin(a) * tw(u) * s;
      if (i) c.lineTo(px, py);
      else c.moveTo(px, py);
    });
  }, 2.2);
  for (const [x, y, s, k, a] of STONE_RUNES) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    carvedRune(ctx, k, -s * 0.3, -s * 0.5, s, 0.5);
    ctx.restore();
  }
}

function stone(ctx: Ctx, r: R): void {
  const { cx, base, top, hw } = FE.stone;
  const box = { x: cx - hw - 10, y: top - 10, w: hw * 2 + 20, h: base - top + 34 };
  // its shadow laid down and right over the heath
  castShadow(ctx, stonePath, 30, 26, 0.6, '#02030a');
  stonePath(ctx);
  ctx.fillStyle = GRANITE.shade;
  ctx.fill();
  within(ctx, stonePath, () => {
    // its round form under the moon: lit on the upper left, rolling off through a soft terminator into deep shade
    const rg = ctx.createRadialGradient(1580, 430, 10, 1640, 470, 400);
    rg.addColorStop(0, '#7c88ae');
    rg.addColorStop(0.28, '#525c80');
    rg.addColorStop(0.55, '#2e3450');
    rg.addColorStop(0.8, '#181c30');
    rg.addColorStop(1, '#0c0e1c');
    ctx.fillStyle = rg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    surface(ctx, r, box, '#3a4262', { over: true, vary: 0.4, cells: 4, mottle: 0.45, strokes: 0.6, strokeAng: Math.PI / 2 + 0.3, strokeLen: 70, strokeW: 5, grain: 0.25, grainKind: 'speckle', seed: 261 });
    grain(ctx, box, 'speckle', 0.22, 1.5);
    // granite: black mica and pale feldspar crystals through it
    for (let i = 0; i < 240; i++) {
      const px = box.x + r() * box.w;
      const py = box.y + r() * box.h;
      const lit = r() < 0.45;
      ctx.fillStyle = rgba(lit ? '#a8b2d0' : '#06070e', lit ? 0.16 + r() * 0.16 : 0.3 + r() * 0.25);
      ctx.fillRect(px, py, 1.5 + r() * 3, 1.2 + r() * 2);
    }
    // the broken face on the right, turned from the moon: flatter, dark, cooler
    const side = polyPath([...STONE_ARRIS, [cx + hw + 30, base + 30], [cx + hw + 30, top - 10]]);
    side(ctx);
    const sg = ctx.createLinearGradient(1800, 0, cx + hw, 0);
    sg.addColorStop(0, 'rgba(10,12,26,0.55)');
    sg.addColorStop(1, 'rgba(4,5,14,0.75)');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = rgba('#aab8e2', 0.4);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    STONE_ARRIS.forEach(([x, y], i) => (i ? ctx.lineTo(x - 1, y) : ctx.moveTo(x - 1, y)));
    ctx.stroke();
    // the frosted heath's cold light bounced up into its underside on the right
    const bg = ctx.createRadialGradient(1760, base + 30, 0, 1760, base + 30, 230);
    bg.addColorStop(0, 'rgba(110,130,190,0.2)');
    bg.addColorStop(1, 'rgba(110,130,190,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(box.x, base - 240, box.w, 280);
    // frost on the crown and the shoulders; lichen crusts low down and in the lee, fine
    lay(ctx, noiseMask(16, 263, { cover: 0.38, soft: 0.35, col: '#e8f2ff', w: 120, h: 70 }), { x: box.x, y: top - 4, w: box.w, h: 110 }, 0.2);
    lay(ctx, noiseMask(40, 267, { cover: 0.2, soft: 0.06, col: '#aab49a', w: 200, h: 120 }), { x: box.x, y: base - 190, w: box.w, h: 190 }, 0.16);
    lay(ctx, noiseMask(48, 269, { cover: 0.14, soft: 0.06, col: '#c4b48c', w: 200, h: 120 }), { x: box.x, y: base - 230, w: box.w, h: 230 }, 0.13);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#a4b48a' : '#c4aa6e', 0.28);
      ctx.fillRect(box.x + r() * box.w, base - r() * 220, 1.5 + r() * 2, 1.5 + r() * 2);
    }
    // cracks where the frost has worked in, from the crown and the shoulder
    crack(ctx, r, 1612, 372, Math.PI / 2 + 0.35, 80, { col: INK, lip: '#a8b4d8', w: 2, a: 0.7, branch: 0.25 });
    crack(ctx, r, 1820, 410, Math.PI / 2 + 0.5, 60, { col: INK, lip: '#a8b4d8', w: 1.6, a: 0.55, branch: 0.2 });
    crack(ctx, r, 1516, 610, -0.2, 50, { col: INK, lip: '#a8b4d8', w: 1.4, a: 0.5, branch: 0.2 });
    // the runestone band round the ring
    runeBand(ctx);
    // the claws: four deep gouges torn down its face, raw pale granite in them
    // (kept dark, so they never read as more claws behind his paw)
    for (const g of STONE_GOUGES) gouge(ctx, r, g, 17, '#5e6888', 0.28);
    // rust bled down the face from the staple's holes and under the ring
    for (const [x, y] of [FE.staple.a, FE.staple.b]) streaks(ctx, r, x - 6, y + 8, 14, 50 + r() * 30, IRON.rust, 0.35, 3);
    streaks(ctx, r, FE.ring.x - 16, FE.ring.y + FE.ring.ry, 32, 90, IRON.rust, 0.3, 5);
    streaks(ctx, r, FE.ring.x - 10, FE.ring.y + FE.ring.ry, 20, 70, IRON.rustDk, 0.3, 4);
    // worn smooth where the ring has swung against it for an age
    ctx.strokeStyle = rgba('#9aa6cc', 0.14);
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(FE.ring.x, FE.staple.bow[1], FE.ring.ry * 2 + 6, Math.PI * 0.3, Math.PI * 0.7);
    ctx.stroke();
    // darker and colder low down, the turf's dark at its foot
    vfill(ctx, box.x, base - 120, box.w, 150, [[0, 'rgba(4,6,18,0)'], [0.75, 'rgba(4,6,18,0.35)'], [1, 'rgba(4,6,18,0.6)']]);
  });
  stonePath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  // the moon along its upper-left edge
  ctx.save();
  stonePath(ctx);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba('#d4e0ff', 0.5);
  ctx.lineWidth = 5;
  ctx.beginPath();
  const rimPts = STONE_PTS.filter(([x, y]) => x < 1760 && y < 640);
  rimPts.forEach(([x, y], i) => (i ? ctx.lineTo(x + 2.5, y + 2) : ctx.moveTo(x + 2.5, y + 2)));
  ctx.stroke();
  ctx.restore();
  staple(ctx, r);
  // snow lying on its crown
  snowOn(ctx, r, STONE_PTS.filter(([x, y]) => y < 396 && x > 1590 && x < 1850), 15);
  // the turf heaped round its foot where it was driven in, cracked, tufts on it
  const mound = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx - hw - 56, base + 30);
    c.quadraticCurveTo(cx - hw - 24, base - 16, cx - hw + 30, base - 8);
    for (let x = cx - hw + 30; x <= cx + hw - 10; x += 20) c.lineTo(x, base - 6 + wave1(x, 7) * 4);
    c.quadraticCurveTo(cx + hw + 20, base - 14, W + 10, base - 8);
    c.lineTo(W + 10, base + 30);
    c.closePath();
  };
  crevice(ctx, cx - hw, cx + hw, base - 4, -30, 0.55, '#02030a');
  mound(ctx);
  ctx.fillStyle = '#1a1a26';
  ctx.fill();
  within(ctx, mound, () => {
    vfill(ctx, cx - hw - 60, base - 20, hw * 2 + 140, 60, [[0, '#2c2c3c'], [1, '#14141e']]);
    surface(ctx, r, { x: cx - hw - 60, y: base - 20, w: hw * 2 + 140, h: 60 }, '#22222e', { over: true, vary: 0.3, cells: 6, grain: 0.25, seed: 271 });
  });
  for (let x = cx - hw - 40; x < W; x += 8 + r() * 10) (r() < 0.4 ? heather : tuft)(ctx, r, x, base - 4 + r() * 16, 0.95);
  // its foot sat down in the turf: a contact shadow along it and grass grown up in front of it
  softly(ctx, { x: cx - hw - 60, y: base - 30, w: hw * 2 + 120, h: 70 }, (g) => {
    g.fillStyle = 'rgba(2,3,10,0.55)';
    g.beginPath();
    g.ellipse(cx + 10, base + 6, hw + 24, 14, 0, 0, P2);
    g.fill();
  }, 0.5);
  for (let i = 0; i < 22; i++) (r() < 0.45 ? heather : tuft)(ctx, r, cx - hw - 20 + r() * 90, base + 4 + r() * 22, 1);
  // a drift banked against its foot on the windward side

  snowPatch(ctx, r, 1474, 744, 130, 20);
  snowPatch(ctx, r, 1906, 746, 100, 16);
}

/** The staple: a bar of iron thick as a man's arm, its two legs hammered deep into the stone, its bridge standing out
 * from the face (the ring hangs from it); runes cut along it. It casts a shadow down onto the face. */
function staple(ctx: Ctx, r: R): void {
  const { a, b, bow } = FE.staple;
  const bar: PathFn = (c) => {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.quadraticCurveTo(bow[0], bow[1] + (bow[1] - a[1]), b[0], b[1]);
  };
  // the sockets: the stone round each leg crushed and chipped pale, iron wedges driven in beside it
  for (const [x, y] of [a, b]) {
    ctx.fillStyle = rgba('#8a96bc', 0.45);
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 1, 15, 14, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 11, 0, 0, P2);
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.fillStyle = IRON.body;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y + s * 10);
      ctx.lineTo(x + 4, y + s * 10);
      ctx.lineTo(x + 2, y + s * 16);
      ctx.lineTo(x - 2, y + s * 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.save();
  ctx.lineCap = 'butt';
  // its shadow on the face below it
  ctx.translate(6, 11);
  bar(ctx);
  ctx.strokeStyle = 'rgba(2,3,10,0.5)';
  ctx.lineWidth = 17;
  ctx.stroke();
  ctx.translate(-6, -11);
  bar(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 20;
  ctx.stroke();
  // round bar: lit along its top, dark beneath
  const g = ctx.createLinearGradient(0, a[1] - 9, 0, bow[1] + 9);
  g.addColorStop(0, IRON.top);
  g.addColorStop(0.3, IRON.lit);
  g.addColorStop(0.7, IRON.body);
  g.addColorStop(1, IRON.dark);
  bar(ctx);
  ctx.strokeStyle = g;
  ctx.lineWidth = 16;
  ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const t = r();
    const x = lerp(a[0], b[0], t);
    const y = lerp(a[1], bow[1], Math.sin(t * Math.PI)) + 3 + r() * 4;
    ctx.fillStyle = rgba(r() < 0.5 ? IRON.rust : IRON.rustDk, 0.5);
    ctx.beginPath();
    ctx.arc(x, y, 1.3 + r() * 2, 0, P2);
    ctx.fill();
  }
  ctx.translate(0, -4);
  bar(ctx);
  ctx.strokeStyle = rgba(IRON.hi, 0.5);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  // its legs going into the stone: the bar's ends darkening into the sockets
  for (const [x, y] of [a, b]) {
    const sg = ctx.createRadialGradient(x, y, 0, x, y, 12);
    sg.addColorStop(0, 'rgba(2,3,8,0.85)');
    sg.addColorStop(1, 'rgba(2,3,8,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x - 12, y - 12, 24, 24);
  }
  // a rune cut on each side of the ring
  carvedRune(ctx, 7, a[0] + 10, a[1] - 5, 11, 0.6);
  carvedRune(ctx, 11, b[0] - 18, b[1] - 5, 11, 0.6);
}

/** The fetter hanging from the staple: a broken length of four links, the last burst. (Its own layer: it swings.) */
const FETTER_PTS: Pt[] = [[FE.ring.x, FE.ring.y + FE.ring.ry - 4], [FE.ring.x - 1, FE.ring.y + FE.ring.ry + 40], [FE.ring.x - 3, FE.ring.y + FE.ring.ry + 80]];
const FETTER_BOX = { x: FE.ring.x - 50, y: FE.staple.bow[1] - 14, w: 112, h: 180 };
/** The ring through the staple, and the broken fetter hanging from it (its own layer: it swings). */
function fetter(ctx: Ctx, r: R): void {
  const { x, y, rx, ry, t } = FE.ring;
  // their shadow on the stone close behind them
  ctx.save();
  ctx.translate(9, 10);
  ctx.strokeStyle = 'rgba(2,3,10,0.4)';
  ctx.lineWidth = t + 2;
  ctx.beginPath();
  ctx.ellipse(x, y, rx - t / 2, ry - t / 2, 0, 0, P2);
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineWidth = 18;
  ctx.beginPath();
  FETTER_PTS.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.stroke();
  ctx.restore();
  link(ctx, r, x, y, Math.PI / 2, ry * 2, rx * 2, true, { t, rust: 0.6 });
  chain(ctx, r, FETTER_PTS, 30, 15, { broken: true, rust: 0.65 });
}

// ——— the table: a slab of the island's granite ———

/** x at the table's front for x at its back edge (the table's perspective, to the vanishing point). */
const toFront = (x: number, f: number) => 960 + (x - 960) * ((f - 300) / (TY - 300));

function table(ctx: Ctx, r: R): void {
  const f = FE.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#1c2236'], [0.45, '#252c44'], [1, '#2e3650']]);
  surface(ctx, r, box, '#262d46', { over: true, vary: 0.3, cells: 7, mottle: 0.22, strokes: 0.3, strokeAng: 0, strokeLen: 300, strokeW: 4, grain: 0.16, grainKind: 'speckle', seed: 281 });
  grain(ctx, box, 'speckle', 0.32, 1.1);
  // granite: mica and feldspar through it, smaller towards the back
  for (let i = 0; i < 900; i++) {
    const y = TY + r() ** 0.8 * (f - TY);
    const k = 0.5 + ((y - TY) / (f - TY)) * 0.8;
    const lit = r() < 0.45;
    ctx.fillStyle = rgba(lit ? '#8e98ba' : '#070912', lit ? 0.12 + r() * 0.12 : 0.22 + r() * 0.2);
    ctx.fillRect(r() * W, y, (1 + r() * 2.2) * k, (0.8 + r() * 1.2) * k);
  }
  // the moon's soft sheen on the left
  lightPool(ctx, 420, TY + 100, 760, 120, '#c8d6ff', 0.06);
  // a joint running in from the back on each side, short, ending in a crack; old hairline cracks
  for (const [x, y1] of [[330, 870], [1610, 836]] as const) {
    const u = (y1 - TY) / (f - TY);
    const x1 = lerp(x, toFront(x, f), u);
    for (const [dx, col, a, w] of [[0, '#06080f', 0.5, 2.2], [1.6, '#8a96bc', 0.2, 1.1]] as const) {
      ctx.strokeStyle = rgba(col, a);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x + dx, TY);
      ctx.lineTo(x1 + dx, y1);
      ctx.stroke();
    }
    crack(ctx, r, x1, y1, Math.atan2(y1 - TY, x1 - x) + 0.3, 50, { col: '#05070f', lip: '#8a96bc', w: 1.4, a: 0.5, branch: 0.3 });
  }
  for (let i = 0; i < 4; i++) crack(ctx, r, r() * W, TY + 4 + r() * 40, Math.PI / 2 + (r() - 0.5) * 1.2, 30 + r() * 50, { col: '#05070f', lip: '#8a96bc', w: 1.2, a: 0.45 });
  // claw scores at its far corners, out of the pizzas' way
  for (const [x0, dir] of [[60, 1], [1760, 1]] as const) {
    for (let i = 0; i < 4; i++) gouge(ctx, r, rake(x0 + i * 26, 800 + i * 4, x0 + i * 26 + 70 * dir, 930 + i * 6, 6), 7, '#6e7aa0', 0.35);
  }
  // hoarfrost: on the back edge, feathering in from the corners
  vfill(ctx, 0, TY, W, 22, [[0, rgba('#dce6f8', 0.28)], [1, rgba('#dce6f8', 0)]]);
  for (const [cx, sx] of [[0, 1], [W, -1]] as const) {
    const bx = sx > 0 ? 0 : W - 480;
    const [fc, fg] = makeCanvas(480, f - TY);
    lay(fg, noiseMask(16, 291 + sx, { kind: 'web', cover: 0.5, soft: 0.08, col: '#eef6ff', w: 240, h: 70 }), { x: 0, y: 0, w: 480, h: f - TY }, 1);
    fg.globalCompositeOperation = 'destination-in';
    const mg = fg.createRadialGradient(cx - bx, f - TY, 0, cx - bx, f - TY, 360);
    mg.addColorStop(0, 'rgba(0,0,0,0.2)');
    mg.addColorStop(0.5, 'rgba(0,0,0,0.05)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    fg.fillStyle = mg;
    fg.fillRect(0, 0, 480, f - TY);
    ctx.drawImage(fc, bx, TY);
  }
  ctx.restore();
  tableFalloff(ctx, f, 0.32, '#05081a');
  tableSeam(ctx, 0.5, '#0a0e24', false);
  // the heath's edge along its back: turf overhanging, a dark crevice where they meet
  crevice(ctx, 0, W, TY, 10, 0.45, '#02030a');
  for (let x = 4; x < W; x += 11 + r() * 18) {
    const mid = Math.exp(-(((x - 960) / 420) ** 2));
    if (r() < mid * 0.6) continue;
    (r() < 0.35 ? heather : tuft)(ctx, r, x, TY + 1 + r() * 3, 1.05, 1 - mid * 0.3);
  }
  // the front: a frieze of binding runes cut along it, their inlay faintly lit
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#2a3250'], [0.4, '#1c223a'], [1, '#0e1226']]);
  surface(ctx, r, { x: 0, y: f, w: W, h: 40 }, '#222842', { over: true, vary: 0.3, cells: 8, grain: 0.35, grainKind: 'stone', seed: 297 });
  for (let x = 24, i = 0; x < W - 10; x += 32, i++) carvedRune(ctx, i * 5 + (i % 4), x, f + 9, 24, 0.45);
  ctx.restore();
  ctx.fillStyle = rgba('#dce8ff', 0.5);
  ctx.fillRect(0, f - 2, W, 2.5);
  ctx.fillStyle = rgba('#060814', 0.85);
  ctx.fillRect(0, f, W, 1.6);
  // its front edge knocked about: chips out of the arris, each a dark bite with a lit far side
  chips(ctx, r, 0, W, f, 34, '#0a0d1c', 6);
}

// ——— the grade and the shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#ccdaff', 0.05, { warm: '#ffe4c0', cool: '#2c46a8', a: 0.2 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#040a1e', 60, 700);
  vignetteAll(ctx, 0.6, '#010208');
}

/** The runes' cold light (added live): round the band over the ring. */
function runeGlow(ctx: Ctx): void {
  for (const [x, y, s] of STONE_RUNES) glowAt(ctx, x, y, s * 1.6, RUNE, 0.36);
  glowAt(ctx, BAND.cx, BAND.cy - (BAND.r0 + BAND.r1) / 2, 150, RUNE, 0.08, 0.6);
}

// ——— the stack ———

const SKY_BOX = { x: 0, y: 0, w: W, h: HOR };
// (the curtains hang only over the middle and right of the sky: the birch on the left stays out of the slot's box)
const AURORA_BOX = { x: 560, y: 0, w: W - 560, h: FE.auroraH };
const TREE_BOX = { x: 0, y: 250, w: 320, h: 380 };
// (starting just under the aurora's box, so the stone isn't baked over it)
const STONE_BOX = { x: FE.stone.cx - FE.stone.hw - 70, y: FE.auroraH + 2, w: W - (FE.stone.cx - FE.stone.hw - 70), h: FE.stone.base + 62 - FE.auroraH };
const RUNE_BOX = { x: 1480, y: 330, w: 300, h: 330 };

export const FENRIR: SceneSpec = {
  id: 'fenrir',
  info: {
    name: 'Lyngvi Isle',
    subtitle: "Mini-boss: FENRIR'S PAW",
    ambient: [],
    // (the aurora, the mist, the glitter and the runes' light are the live layer's)
    glows: [],
    light: '#b4c4f0',
    tableTint: '#e2e8fa',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'cloudsStill', box: { x: 0, y: 0, w: W, h: 300 }, stillOnly: true, draw: cloudsStill },
    { id: 'auroraStill', box: AURORA_BOX, stillOnly: true, draw: (c) => aurora(c, 0.15) },
    { id: 'aurora', box: AURORA_BOX, motion: 'slot', draw: () => {} },
    { id: 'far', box: { x: 0, y: 330, w: W, h: HOR - 330 }, draw: (c, r) => {
      c.beginPath();
      c.rect(0, 0, W, HOR);
      c.clip();
      farRange(c, r);
    } },
    { id: 'lake', box: { x: 0, y: HOR, w: W, h: LAKE_Y1 - HOR }, draw: lake },
    { id: 'glitterStill', box: GLIT_BOX, stillOnly: true, draw: (c) => {
      c.globalCompositeOperation = 'lighter';
      glitterFrame(c, 0.3);
    } },
    { id: 'lakeMistStill', box: { x: 0, y: HOR - 30, w: W, h: 200 }, stillOnly: true, draw: (c) => lakeMistStill(c) },
    { id: 'heath', box: { x: 0, y: 596, w: W, h: TY + 10 - 596 }, draw: heath },
    { id: 'slab', box: { x: 0, y: 580, w: 420, h: 180 }, draw: slab },
    { id: 'tree', box: TREE_BOX, draw: tree },
    { id: 'hollow', box: { x: 1140, y: 650, w: 420, h: 116 }, draw: hollow },
    { id: 'fetters', box: { x: 0, y: 590, w: W, h: 175 }, draw: fetters },
    { id: 'stone', box: STONE_BOX, draw: stone },
    { id: 'fetter', box: FETTER_BOX, motion: 'sprite', draw: fetter },
    { id: 'groundMistStill', box: { x: 0, y: GROUND_MIST_Y, w: W, h: MH }, stillOnly: true, draw: (c) => groundMistStill(c) },
    { id: 'table', box: { x: 0, y: TY - 20, w: W, h: 1080 - TY + 20 }, draw: table },
    // (the runes' cold light goes over everything it touches: last, so nothing has to be baked over it)
    { id: 'runeGlow', box: RUNE_BOX, liveOnly: true, res: 0.25, draw: (c) => runeGlow(c) },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: frame painters ———

/** A ring of ripple on the still black water (RIP_W×RIP_H): its far side a crest catching the sky, its near side a
 * dark trough, a fainter ring inside it. */
const RIP_W = 160;
const RIP_H = 36;
function rippleTex(c: Ctx): void {
  const cx = RIP_W / 2;
  const cy = RIP_H / 2;
  c.lineCap = 'round';
  for (const [k, a] of [[1, 1], [0.62, 0.45]] as const) {
    const rx = (RIP_W / 2 - 4) * k;
    const ry = (RIP_H / 2 - 4) * k;
    c.strokeStyle = `rgba(196,212,244,${(0.75 * a).toFixed(3)})`;
    c.lineWidth = 1.8;
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.04, Math.PI * 1.96);
    c.stroke();
    c.strokeStyle = `rgba(150,170,214,${(0.35 * a).toFixed(3)})`;
    c.lineWidth = 1.2;
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.1, Math.PI * 0.9);
    c.stroke();
    c.strokeStyle = `rgba(2,4,12,${(0.6 * a).toFixed(3)})`;
    c.lineWidth = 2.2;
    c.beginPath();
    c.ellipse(cx, cy + 2, rx, ry, 0, Math.PI * 0.08, Math.PI * 0.92);
    c.stroke();
  }
}

/** A chip of granite knocked off the stone (frame i of a few), half px square: lit on its top left. */
function chipFrame(c: Ctx, half: number, i: number): void {
  const rr = rng(hashStr('fe:chip' + i));
  const n = 5 + Math.floor(rr() * 3);
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * P2 + rr() * 0.6;
    const d = half * (0.45 + rr() * 0.4);
    pts.push([half + Math.cos(a) * d, half + Math.sin(a) * d * 0.8]);
  }
  const g = c.createLinearGradient(0, 0, half * 2, half * 2);
  g.addColorStop(0, '#a4b0d4');
  g.addColorStop(0.5, '#4c5676');
  g.addColorStop(1, '#161a2c');
  c.fillStyle = g;
  polyPath(pts)(c);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 0.8;
  c.stroke();
}

/** Where the foreground stands up over the lake at x (the shore, or the stone, the scored rock or the birch's trunk
 * in front of it): the lake's live layers are cut to above it. */
function fgTop(x: number): number {
  let y = shoreY(x);
  const s = topAt(STONE_PTS, x);
  if (s !== null) y = Math.min(y, s);
  const sl = topAt(SLAB_PTS, x);
  if (sl !== null) y = Math.min(y, sl);
  if (Math.abs(x - FE.tree.x - 8) < 16) y = Math.min(y, HOR - 40);
  return y;
}

/** The stone's crown, where grit and rime are shaken off it. */
const CROWN_SPOTS: Pt[] = STONE_PTS.filter(([x, y], i) => i % 3 === 0 && y < 470 && x > 1500);


// ——— live ———

interface Wolf {
  alive: boolean;
  phase: number;
  puppet: boolean;
  type?: { id?: string };
}

registerKitScene(FENRIR, (k: KitLive, wave0: number) => {
  const top = k.slot('top');
  const auroraSlot = k.slot('aurora');
  const runeS = k.sprite('runeGlow').setBlendMode(Phaser.BlendModes.ADD);

  // ——— hero: the aurora ———
  // (two sets of curtains, the cold green and the blood-red of the Ragnarök howl, cross-faded with the fight; painted
  // over the aurora's box only, softened a touch so the scaling never stair-steps)
  const RA = 0.35;
  const AN = 8;
  const AB = AURORA_BOX;
  const aKey = (red: boolean) => sheet(k, red ? 'fe_auroraR' : 'fe_aurora', AB.w * RA, AB.h * RA, AN, (c, ph) => {
    const [tc, tg] = makeCanvas(Math.ceil(AB.w * RA), Math.ceil(AB.h * RA));
    tg.scale(RA, RA);
    tg.translate(-AB.x, -AB.y);
    aurora(tg, ph, red);
    c.filter = 'blur(0.7px)';
    c.drawImage(tc, 0, 0);
    c.filter = 'none';
  });
  const aur = new Loop(k, aKey(false), AN, AB.x, AB.y, { into: auroraSlot, origin: [0, 0], scale: 1 / RA, add: true, fps: 1 });
  const aurRed = new Loop(k, aKey(true), AN, AB.x, AB.y, { into: auroraSlot, origin: [0, 0], scale: 1 / RA, add: true, fps: 1, phase: 3 });
  const aurGlow = k.glow(1240, 300, 760, 0x30ffa0, 0.06, { into: auroraSlot, sy: 0.4 });

  // clouds drifting past the moon (they dim its light on the water as they cross it)
  const CW = 560;
  const CH = 130;
  const cloudKeys = [0, 1].map((i) => k.tex('fe_cloud' + i, CW / 2, CH / 2, (c) => {
    c.scale(0.5, 0.5);
    cloud(c, rng(hashStr('fe:cloud' + i)), CW / 2, CH - 34, CW * 0.7, 26 + i * 6, { ...CLOUD_O, sunX: CW / 2 - 300, sunY: -220 });
  }));
  const clouds = [[0.05, 150, 1], [0.45, 96, 0.8], [0.8, 196, 1.15]].map(([u, y, s], i) => ({
    im: k.img(cloudKeys[i % 2], u * (W + CW) - CW / 2, y, { into: auroraSlot, alpha: 0.75, sx: 2 * s, sy: 1.6 * s }),
    v: 4 + crand() * 4,
  }));

  // ——— hero: the black lake ———
  // (everything on the water is cut to the lake: the stone, the scored rock, the birch and the shore stand in front)
  const lakeC = k.sc.add.container(0, 0);
  top.add(lakeC);
  const lakeMask = k.sc.make.graphics({}, false);
  lakeMask.fillStyle(0xffffff, 1);
  const lp = [new Phaser.Geom.Point(0, HOR - 40), new Phaser.Geom.Point(W, HOR - 40)];
  for (let x = W; x >= 0; x -= 4) lp.push(new Phaser.Geom.Point(x, fgTop(x) - 1));
  lakeMask.fillPoints(lp, true);
  lakeC.setMask(lakeMask.createGeometryMask());
  // (the mask is drawn in the stage's own coordinates: it follows the stage wherever it's shown, scaled into a card on
  // the stages page or shaken with the camera in play)
  const fitMask = () => {
    const m = k.root.getWorldTransformMatrix();
    lakeMask.setPosition(m.tx, m.ty).setScale(m.scaleX, m.scaleY);
  };
  fitMask();
  // the moon's glitter path twinkling
  const RG = 0.5;
  const GN = 8;
  const gKey = sheet(k, 'fe_glitter', GLIT_BOX.w * RG, GLIT_BOX.h * RG, GN, (c, ph) => {
    c.scale(RG, RG);
    c.translate(-GLIT_BOX.x, -GLIT_BOX.y);
    glitterFrame(c, ph, 2);
  });
  const glit = new Loop(k, gKey, GN, GLIT_BOX.x, GLIT_BOX.y, { into: lakeC, origin: [0, 0], scale: 1 / RG, add: true, fps: 2.6 });
  // mist banks rolling over the water at two depths (each band twice over at two speeds, so the banks pass through
  // each other, swell and thin and never visibly repeat), and creeping over the heath
  const MN = 8;
  const mistKey = (seed: number) => sheet(k, 'fe_mist' + seed, MW / 2, MH / 2, MN, (c, ph) => {
    // (painted at half size and softened, so the stretched banks show no banding)
    const [tc, tg] = makeCanvas(MW / 2, MH / 2);
    tg.scale(0.5, 0.5);
    mistTile(tg, seed, ph);
    c.filter = 'blur(1.2px)';
    c.drawImage(tc, 0, 0);
    c.filter = 'none';

  });
  // (a band: a pair of tile sprites cross-fading the sheet's frames, scrolled along; and a second pair, flipped and
  // stretched wider, drifting the other way slower)
  const band = (key: string, y: number, h: number, ts: number, into: Phaser.GameObjects.Container) => {
    const mk = (sx: number, flip: boolean) => {
      const t = k.sc.add.tileSprite(0, y, W, h, key, 0).setOrigin(0, 0).setTileScale(sx, ts).setFlipX(flip);
      into.add(t);
      return t;
    };
    return { pairs: [[mk(ts, false), mk(ts, false)], [mk(ts * 1.4, true), mk(ts * 1.4, true)]], ts, ph: [crand() * MN, crand() * MN] };
  };
  const stepBand = (m: ReturnType<typeof band>, v: number, al: [number, number], dt: number, wind: number) => {
    m.pairs.forEach(([a, b], j) => {
      m.ph[j] = (m.ph[j] + dt * (j ? 0.6 : 0.85) * calm()) % MN;
      const i = Math.floor(m.ph[j]);
      const f = m.ph[j] - i;
      const dx = ((j ? 0.45 : -1) * v * wind * dt) / (m.ts * (j ? 1.4 : 1));
      a.tilePositionX += dx;
      b.tilePositionX = a.tilePositionX;
      a.setFrame(i).setAlpha(al[j]);
      b.setFrame((i + 1) % MN).setAlpha(al[j] * f);
    });
  };
  const farMist = band(mistKey(1), HOR - 24, MH / 2, 1, lakeC);
  const nearMist = band(mistKey(0), 556, MH, 2, lakeC);
  const groundMist = band(mistKey(2), GROUND_MIST_Y, MH, 2, top);
  // ripples spreading over the water
  const ripKey = k.tex('fe_ripple', RIP_W, RIP_H, rippleTex);
  const ripPool = Array.from({ length: 24 }, () => ({ im: k.img(ripKey, 0, 0, { into: lakeC, alpha: 0 }), t: 1, life: 1, s: 1 }));
  const ripple = (x: number, y: number, big: number, delay = 0) => {
    const r = ripPool.find((q) => q.t >= q.life);
    if (!r) return;
    const persp = 0.25 + clamp01((y - HOR) / (LAKE_Y1 - HOR)) * 1.1;
    r.t = -delay;
    r.life = 2.6;
    r.s = persp * big;
    r.im.setPosition(x, y).setAlpha(0);
  };
  const shoreRing = (x: number, big: number) => {
    const sx = Math.max(420, Math.min(1460, x));
    const y = Math.min(shoreY(sx) - 6, LAKE_Y1 - 10);
    for (let i = 0; i < 3; i++) ripple(sx + (crand() - 0.5) * 30, y - crand() * 10, big * (1 - i * 0.18), i * 0.32);
  };

  // ——— hero: the binding stone ———
  const fetterS = new Swing(k.pivot(k.sprite('fetter'), FE.staple.bow[0], FE.staple.bow[1]), { k: 5, c: 0.45, idle: 0.014, seed: 3, speed: 0.7 });
  const chipKey = sheet(k, 'fe_chip', 24, 24, 4, (c, _p, i) => chipFrame(c, 12, i));
  const chips = new Parts(k, { frame: 'mote', sheet: { key: chipKey, n: 4, half: 12 }, into: top, max: 40 });
  const motes = new Parts(k, { frame: 'mote', into: top, max: 160 });
  const powder = new Parts(k, { frame: 'puff', into: top, max: 40 });
  const sparks = new Parts(k, { frame: 'spark', add: true, into: top, max: 60 });
  const glints = new Parts(k, { frame: 'spark', add: true, into: top, max: 24 });
  const glintRate = new Rate();
  const puff = (x: number, y: number, n: number, big = 1) => {
    for (let i = 0; i < n; i++) powder.spawn({ x: x + (crand() - 0.5) * 30 * big, y: y - crand() * 6, vx: (crand() - 0.4) * 60 * big, vy: -10 - crand() * 30 * big, life: 1.2 + crand(), r0: 6 * big, r1: (24 + crand() * 20) * big, a: 0.28, tint: 0xc8d2ea, drag: 1.3, fade: 0.15 });
  };
  const grit = (n: number) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = CROWN_SPOTS[Math.floor(crand() * CROWN_SPOTS.length)];
      const floor = FE.stone.base + 4 + crand() * 14;
      if (crand() < 0.35) chips.spawn({ x, y: y + 4, vx: (crand() - 0.3) * 50, vy: -20 - crand() * 40, life: 2.4, r0: 3 + crand() * 4, a: 1, tint: 0xffffff, grav: 900, floor, bounce: 0.25, spin: (crand() - 0.5) * 8, fade: 0.02 });
      else motes.spawn({ x, y: y + 3, vx: (crand() - 0.3) * 30, vy: -10 - crand() * 20, life: 2.2, r0: 1.6 + crand() * 1.8, a: 0.85, tint: crand() < 0.5 ? 0xe4eeff : 0x8a92b0, grav: 520, drag: 0.4, floor, fade: 0.05 });
    }
  };
  const rime = (n: number) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = TREE_SPOTS[Math.floor(crand() * TREE_SPOTS.length)];
      motes.spawn({ x: x + (crand() - 0.5) * 40, y: y + (crand() - 0.5) * 30, vx: 6 + crand() * 14, vy: 10 + crand() * 20, life: 2.6, r0: 1.4 + crand() * 1.6, a: 0.8, tint: 0xeef4ff, grav: 90, drag: 0.8, floor: 600, fade: 0.1 });
    }
  };
  const runeSparks = (n: number) => {
    for (let i = 0; i < n; i++) {
      const [x, y, s] = STONE_RUNES[Math.floor(crand() * STONE_RUNES.length)];
      sparks.spawn({ x: x + s * 0.3 + (crand() - 0.5) * s, y: y + s * 0.5, vx: (crand() - 0.5) * 30, vy: -30 - crand() * 50, life: 1 + crand() * 0.8, r0: 4, r1: 1, a: 0.9, tint: crand() < 0.6 ? 0x9ff0ff : 0xe0fbff, grav: -10, drag: 0.6, fade: 0.1 });
    }
  };
  const flash = k.wash(0x6a80d0, 0, Phaser.BlendModes.ADD, top);

  // ——— the fight ———
  // (in a run the arena follows the wolf: its phase reddens the aurora, its breaking loose and being bound again are
  // the big moments; on the stages page waves 1–3 stand in for the phases and wave 4 shows him loose)
  const sc = k.sc as unknown as { miniFoot?: Wolf | null; bossFoot?: Wolf | null; director?: { phaseCount?(f: unknown): number } };
  const wolf = (): Wolf | null => {
    const f = sc.miniFoot ?? sc.bossFoot;
    return f && f.alive && f.type?.id === 'fenrir' ? f : null;
  };
  const progressOf = (f: Wolf) => {
    let n = 3;
    try {
      n = sc.director?.phaseCount?.(f) ?? 3;
    } catch {
      n = 3;
    }
    return n > 1 ? clamp01((f.phase - 1) / (n - 1)) : 0;
  };
  let wave = wave0;
  const fromWave = (w: number) => (w >= 5 ? 0 : clamp01((Math.max(1, w) - 1) / 2));
  let shown = fromWave(wave);
  let loose = false;
  let looseK = 0;
  let flare = 0;
  let gust = 0;
  let flashA = 0;

  /** He breaks loose: the fetter leaps on its staple, the runes blaze and gutter out, the lake shivers. */
  const snap = () => {
    flare = 2.2;
    gust = 2.5;
    flashA = 0.14;
    fetterS.kick(crand() < 0.5 ? 1.1 : -1.1);
    grit(16);
    rime(12);
    runeSparks(18);
    for (let i = 0; i < 4; i++) shoreRing(500 + i * 300 + crand() * 120, 1.4);
    puff(FE.stone.cx - 60, FE.stone.base, 5, 1.2);
  };
  /** He's bound again: the runes flare back up, cold and bright. */
  const bind = () => {
    flare = 2;
    flashA = 0.1;
    fetterS.kick(crand() < 0.5 ? 0.6 : -0.6);
    runeSparks(26);
  };

  return {
    setWave: (w) => (wave = w),
    destroy: () => {
      lakeC.clearMask(true);
      lakeMask.destroy();
    },
    impact(x, _y, p) {
      flare = Math.min(1.6, flare + 0.4 + p);
      gust = Math.min(2, gust + 0.6 * p);
      fetterS.kick((x < FE.staple.bow[0] ? 1 : -1) * (0.2 + 0.6 * p) + (crand() - 0.5) * 0.15);
      grit(Math.round(3 + p * 9));
      if (p > 0.3) rime(Math.round(4 + p * 8));
      shoreRing(x, 0.8 + p * 0.7);
      if (p > 0.5) shoreRing(x + (x < 960 ? 380 : -380), 0.8);
      puff(Math.max(40, Math.min(W - 40, x)), TY - 4, 2 + p * 4, 0.8);
    },
    update(dt, t) {
      const cm = calm();
      fitMask();


      // the fight's progress and the wolf's state
      const f = wolf();
      const target = f ? progressOf(f) : fromWave(wave);
      const nowLoose = f ? f.puppet : wave === 4;
      if (nowLoose !== loose) {
        loose = nowLoose;
        if (loose) snap();
        else bind();
      }
      shown += (target - shown) * Math.min(1, dt * 0.6);
      looseK += ((loose ? 1 : 0) - looseK) * Math.min(1, dt * 1.5);
      flare = Math.max(0, flare - dt * 0.8);
      gust = Math.max(0, gust - dt * 0.5);
      flashA = Math.max(0, flashA - dt * 0.4);
      flash.setAlpha(flashA);

      // the aurora: slow folding and breathing; reddening as the fight goes on (the Ragnarök howl), redder still
      // while he's loose
      const br = 0.85 + 0.15 * Math.sin(t * 0.21) * Math.sin(t * 0.13 + 1);
      const red = clamp01(shown * 0.55 + looseK);
      aur.step(dt, cm * (1 + looseK * 0.8));
      aurRed.step(dt, cm * (1 + looseK * 0.8));
      aur.alpha = br * 0.9 * (1 - red) ** 2;
      aurRed.alpha = clamp01(br * (0.9 + looseK * 0.35) * Math.sqrt(red));
      aurGlow.setAlpha(0.06 * br);
      aurGlow.setTint(Phaser.Display.Color.GetColor(Math.round(48 + red * 200), Math.round(255 - red * 170), Math.round(160 - red * 40)));

      // clouds past the moon; the moonlight on the water dims while one's over it
      let cover = 0;
      for (const c of clouds) {
        c.im.x += c.v * (1 + gust * 0.5) * dt * cm;
        if (c.im.x > W + CW) c.im.x = -CW;
        const hw = (CW / 2) * c.im.scaleX * 0.4;
        const over = clamp01(1 - Math.abs(c.im.x - FE.moon.x) / hw) * clamp01(1 - Math.abs(c.im.y + 14 - FE.moon.y) / 60);
        cover = Math.max(cover, over);
      }
      glit.step(dt, cm);
      glit.alpha = 0.9 * (1 - cover * 0.7);

      // the mist: rolling slowly along the water, faster in the wolf's wind
      const wind = (1 + gust * 2.5) * cm;
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.17);
      stepBand(farMist, 5, [0.42, 0.22], dt, wind);
      stepBand(nearMist, 11, [0.34 + 0.12 * breathe, 0.24 + 0.12 * (1 - breathe)], dt, wind);
      stepBand(groundMist, 8, [0.12 + 0.05 * breathe, 0.08], dt, wind);



      // ripples spreading and fading
      for (const r of ripPool) {
        if (r.t >= r.life) continue;
        r.t += dt;
        if (r.t < 0) continue;
        const u = Math.min(1, r.t / r.life);
        const s = r.s * (0.25 + Math.sqrt(u) * 1.6);
        r.im.setScale(s, s * 0.9).setAlpha(0.8 * (1 - u) * Math.min(1, u * 8));
      }

      // the stone: the fetter on its spring, the runes breathing, flaring, guttering while he's loose
      fetterS.update(dt, t);
      // (bound: breathing, flaring at every stomp; loose: a guttering sputter, never more than about 40%, dying away)
      const bound = clamp01(0.55 + 0.2 * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 2) + flare * 0.5);
      const sputter = Math.min(0.4, (0.05 + flare * 0.2) * (0.2 + 0.8 * Math.max(0, Math.sin(t * 17) * Math.sin(t * 6.3 + 1))));
      runeS.setAlpha(lerp(bound, sputter, looseK));
      if (loose && crand() < dt * 1.2) fetterS.kick((crand() - 0.5) * 0.25);


      // moonlight glinting off the rimed rock and the iron now and then
      glintRate.tick(0.8 * (1 - cover) * cm, dt, () => {
        const pick = crand();
        const [gx, gy] = pick < 0.4 ? [FE.staple.bow[0] - 14 + crand() * 30, FE.staple.bow[1] - 20 + crand() * 30] : pick < 0.7 ? [40 + crand() * 300, 600 + crand() * 30] : [1540 + crand() * 220, 380 + crand() * 80];
        glints.spawn({ x: gx, y: gy, life: 0.3 + crand() * 0.3, r0: 6 + crand() * 4, r1: 1, a: 0.6, tint: 0xd8ecff, fade: 0.4 });
      });

      chips.update(dt);
      motes.update(dt);
      powder.update(dt);
      sparks.update(dt);
      glints.update(dt);
    },
  };
});
