// Bifröst Bridge (Stage 16, Act 8, waves 76–79), redrawn with the location kit (src/art/scene): the second step on
// the road to Ragnarök, after the Jotunheim ice fields (scene-jotunheim.ts). High noon at the edge of the gods' realm.
//
// We stand on the terrace of the guardian's gatehouse, high over a vast drop. Far below, a sea of cumulus drifts over
// the world-sea (Midgard's coasts on its rim, and far out the coils of the world serpent breaking its surface). From a
// rune-cut stone abutment at the foot of the guardian's watchtower the bridge leaps out over the drop: not stone but
// light, a road of prism slabs whose colours run its length, lit from within, throwing a curtain of spectral light down
// into the clouds below it; it climbs over the horizon and lands far off at the gate of the gods' citadel, golden halls
// roofed with shields on a crag rising out of the clouds. The watchtower is the same rune-cut stone as the giants' gate
// in Jotunheim, a timber lookout and a shingled gable on top, a pennant streaming off its finial; the guardian's great
// horn hangs on chains from a beam over the abutment. On the terrace's far corner a rune stone carries an iron fire
// basket and a hanging banner. The table is the terrace's threshold: dressed stone flags, a rune frieze on its front.
//
// The stage's four waves run from shimmering sunlight to storm, lightning and fire: a high golden veil comes over the
// sun (wave 2); a storm rolls in, dark cloud, rain and lightning, the watch-fire lit (wave 3); and at wave 4 the fire at
// the world's end comes over the horizon, the sea burning along its rim, smoke climbing, embers rising out of the drop,
// the bridge's far end catching fire.
//
// Live, the heroes:
// - the bridge's living light: caustics painted at 12 phases flowing out along its slabs (a frame loop mapped onto the
//   bridge's curve), glints winking on it, specks of spectral light falling off its underside; a stomp sends a pulse of
//   light running out along it from the abutment to the far gate;
// - the weather: the cloud sea drifting far below (each cloud with its shadow on the sea), the golden veil, the storm
//   deck, painted lightning bolts flashing on the clouds, rain, then smoke columns (painted frames) on the burning
//   horizon, embers rising, the watch-fire burning (painted frames) and the flames on the bridge;
// - the wind: the pennant streaming off the tower (painted frames), the banner on the rune stone (painted frames), the
//   great horn swinging on its chains when a stomp shakes the terrace (grit sifts off the gallery and the coping).

import Phaser from 'phaser';
import { type Air, type Ctx, type R, TY, W, airMix, calmLanes, castShadow, crevice, glowAt, gradeAll, lightPool, polyPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff, tableSeam, water } from '../../art/scene/materials';
import { hang } from '../../art/scene/props';
import { crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { cloud, horizonGlow, rays, skyFill, sun } from '../../art/scene/sky';
import { ashlar } from '../../art/scene/surfaces';
import { xAt, yAt, zFront } from '../../art/sceneKit';
import { hashStr, makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, lerp, registerKitScene, waveK } from '../../game/sceneLive';
import { clothFrame, fireFrame } from './sceneBits';
import type { Pt } from './scene-rink';
import { carvedRune } from './scene-jotunheim';

// ——— layout ———

export const BF = {
  front: 1040,
  /** The world-sea's horizon (eye level). */
  hor: 452,
  /** The terrace parapet's top: everything behind it is cut here. */
  par: 700,
  sun: { x: 330, y: 96, r: 30 },
  /** The watchtower: its shaft (left and right at the gallery and at the parapet), the gallery, the gable's peak. */
  tower: { xl: 30, xr: 198, gal: 252, eaves: 178, peak: 86, px: 112 },
  /** The beam the horn hangs from, and the horn's hinge (between its chains). */
  beam: { x0: 196, x1: 356, y: 372 },
  hinge: { x: 292, y: 384 },
  /** The abutment the bridge springs from: its top-left, its end. */
  abut: { x0: 190, x1: 446, top: 598 },
  /** The rune stone on the terrace's far corner and its fire basket. */
  stone: { x0: 1728, x1: 1872, top: 446 },
  basket: { x: 1800, y: 414 },
  banner: { x: 1640, y: 478, w: 76, h: 176 },
  /** The gods' citadel: the landing at the bridge's far end (the citadel is painted in its own frame, shifted
   * CDX, CDY from where its points are written). */
  gate: { x: 1302 + 70, y: 430 + 24 },
  /** The bridge-head: the stone block on the abutment's end the bridge springs out of. */
  head: { x0: 356, x1: 448, top: 494 },
};
const CDX = 70;
const CDY = 24;

const P2 = Math.PI * 2;
const INK = '#14102a';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const HOR = BF.hor;
const PAR = BF.par;
/** The air between us and the far things: the bright haze of a high clear noon. */
const AIR: Air = { color: '#c6d8ee', far: 0.86 };
/** The rune-cut stone (Jotunheim's granite) in daylight. */
const DAY = { lit: '#c4c0cc', body: '#8e8aa0', shade: '#55526c', deep: '#2c2a44' };
const GOLD = { lit: '#ffe9a0', body: '#d8a840', shade: '#8a5a1a', deep: '#4a2a0c' };
/** The bridge's spectrum across its deck, from the far edge (top) to the near edge. */
const SPEC = ['#a070ff', '#5c8cff', '#48d8ff', '#70f0a4', '#ffe676', '#ffa458', '#ff6676'];

const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const SPEC_RGB = SPEC.map(hexRgb);
/** The spectrum at v (0 the far edge … 1 the near edge). */
function specAt(v: number): [number, number, number] {
  const f = clamp01(v) * (SPEC_RGB.length - 1);
  const i = Math.min(SPEC_RGB.length - 2, Math.floor(f));
  const u = f - i;
  const a = SPEC_RGB[i];
  const b = SPEC_RGB[i + 1];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}
const specHex = (v: number): string => '#' + specAt(v).map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');

// ——— the bridge's curve ———
//
// The bridge springs from the abutment (t = 0) and lands at the citadel's gate (t = 1). Its deck is a ribbon seen from
// a little above: deckW(t) high on screen, narrowing with distance; under it the slab's edge, fasciaH(t).

const BP: Pt[] = [[440, 542], [680, 436], [1000, 384], [BF.gate.x, BF.gate.y]];
export function bz(t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * BP[0][0] + b * BP[1][0] + c * BP[2][0] + d * BP[3][0], a * BP[0][1] + b * BP[1][1] + c * BP[2][1] + d * BP[3][1]];
}
/** The curve's direction at t (radians). */
export function bzAng(t: number): number {
  const [x0, y0] = bz(Math.max(0, t - 0.004));
  const [x1, y1] = bz(Math.min(1, t + 0.004));
  return Math.atan2(y1 - y0, x1 - x0);
}
export const deckW = (t: number) => 6 + 72 * (1 - t) ** 1.25;
const fasciaH = (t: number) => 3 + 24 * (1 - t) ** 1.3;
export const deckTop = (t: number) => bz(t)[1] - deckW(t) / 2;
const deckBot = (t: number) => bz(t)[1] + deckW(t) / 2;
/** How far along the bridge t is in its own length (perspective: the far half is much longer than it looks). */
const G = (t: number) => 1 / (1 - 0.8 * t) - 1;
/** The bridge's fade as it lands (it ends in the gate's light). */
const bridgeA = (t: number) => (t < 0.97 ? 1 : clamp01((1 - t) / 0.03)) * (1 - t * 0.12);

/** Map a strip painted flat (its width running t0…t1 along the bridge, its height across) onto the curve. */
function mapStrip(ctx: Ctx, strip: HTMLCanvasElement, top: (t: number) => number, h: (t: number) => number, alpha: (t: number) => number = bridgeA, N = 700): void {
  const sw = strip.width;
  const sh = strip.height;
  // (the slices overlap a little so no gaps show; drawn opaque on their own canvas, then faded along the bridge once,
  // so the overlaps don't stripe it)
  const B = { x: 380, y: 300, w: 1060, h: 400 };
  const m = ctx.getTransform();
  const k = Math.min(1, Math.hypot(m.a, m.b));
  const [c, g] = makeCanvas(B.w * k, B.h * k);
  g.imageSmoothingEnabled = true;
  g.scale(k, k);
  g.translate(-B.x, -B.y);
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const t1 = (i + 1) / N;
    const x0 = bz(t)[0];
    const x1 = bz(t1)[0];
    g.drawImage(strip, (i / N) * sw, 0, sw / N, sh, x0, top(t), x1 - x0 + 0.8, h(t));
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const fg = g.createLinearGradient((bz(0)[0] - B.x) * k, 0, (bz(1)[0] - B.x) * k, 0);
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    fg.addColorStop(clamp01((bz(t)[0] - bz(0)[0]) / (bz(1)[0] - bz(0)[0])), `rgba(0,0,0,${alpha(t).toFixed(3)})`);
  }
  g.fillStyle = fg;
  g.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, B.x, B.y, B.w, B.h);
  ctx.restore();
}

// ——— the sky ———

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: HOR + 4 };
  skyFill(ctx, box, [[0, '#0e3486'], [0.3, '#2462b8'], [0.62, '#5f9ad8'], [0.86, '#a8cbea'], [0.97, '#dfe8ec'], [1, '#f0e8da']], 0.04);
  lay(ctx, drift('#5a90d8', '#103080', 3, 41, 160, 48), box, 0.16);
  // the sun's side of the sky paler, warmer
  glowAt(ctx, BF.sun.x, BF.sun.y, 900, '#fff2d0', 0.16, 0.8);
  // high cirrus, combed out on the jet stream
  softly(ctx, box, (g) => {
    // high cirrus, combed out on the jet stream into mares' tails: soft, curling up at their ends
    g.lineCap = 'round';
    g.filter = 'blur(3px)';
    for (let i = 0; i < 12; i++) {
      const x = 560 + r() * 1360;
      const y = 40 + r() * 230;
      const len = 180 + r() * 300;
      for (const [w, a] of [[30, 0.07], [14, 0.08], [4, 0.1]] as const) {
        g.strokeStyle = rgba('#f4f8ff', a * (0.6 + r() * 0.6));
        g.lineWidth = w * (0.7 + r() * 0.6);
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + len * 0.4, y - len * 0.05, x + len * 0.8, y - len * 0.04, x + len, y - len * 0.16);
        g.stroke();
      }
    }
    g.filter = 'none';
  }, 0.25);
  // the citadel's own light: a pale gold radiance in the air round the crag
  glowAt(ctx, 1500, 300, 420, '#fff0c0', 0.14, 0.7);
  // far cumulus towers standing on the horizon, hazed blue by the distance
  const o = { lit: '#fffaf0', body: '#d8e2f2', shadow: '#9aaed0', sunX: BF.sun.x, sunY: BF.sun.y, rim: 0.35, wisp: 0.4, air: AIR, kind: 'cumulus' as const };
  for (const [x, w, h, d] of [[90, 260, 80, 0.85], [560, 340, 110, 0.82], [930, 220, 60, 0.88], [1100, 300, 96, 0.84], [1880, 280, 90, 0.82], [1760, 200, 60, 0.88], [720, 180, 50, 0.9]] as const) {
    cloud(ctx, r, x, HOR + 2, w, h, { ...o, depth: d, a: 0.9 });
  }
  horizonGlow(ctx, HOR + 2, 90, '#fff6e4', 0.55);
  // the sun, high on the left: its bloom, rays fanning through the high air (kept in the sky), the disc
  rays(ctx, r, BF.sun.x, BF.sun.y, 16, 330, '#fff4d4', 0.12, P2, 0.6);
  sun(ctx, BF.sun.x, BF.sun.y, BF.sun.r, { glow: '#ffe8b0', a: 0.8, bloom: 11 });
}

/** The golden veil (wave 2): cirrostratus drawn over the sun, a halo ringing it, the light gone warm and milky. */
function hazeSky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: HOR };
  vfill(ctx, 0, 0, W, HOR, [[0, 'rgba(236,214,170,0.12)'], [0.5, 'rgba(244,222,182,0.22)'], [1, 'rgba(252,226,180,0.42)']]);
  lay(ctx, noiseMask(8, 61, { cover: 0.5, soft: 0.7, col: '#fff0d4', w: 320, h: 96 }), { x: 0, y: 60, w: W, h: 260 }, 0.3);
  // a high golden veil: long soft sheets of cirrostratus, gold where the sun is behind them
  softly(ctx, box, (g) => {
    g.filter = 'blur(4px)';
    g.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const y = 80 + r() * 220;
      const x = r() * W;
      const len = 300 + r() * 500;
      const near = Math.exp(-(((x + len / 2 - BF.sun.x) / 700) ** 2));
      g.strokeStyle = rgba(mix('#fff2dc', '#ffd890', near), 0.12 + r() * 0.12 + near * 0.1);
      g.lineWidth = 16 + r() * 30;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + len / 2, y - 14 - r() * 20, x + len, y - 6 + r() * 12);
      g.stroke();
    }
    g.filter = 'none';
  }, 0.25);
  // the 22° halo round the sun: red inside, fading to white out
  for (const [rad, col, a] of [[148, '#ffa080', 0.24], [155, '#fff0c0', 0.22], [163, '#c8e0ff', 0.14]] as const) {
    ctx.strokeStyle = rgba(col, a);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(BF.sun.x, BF.sun.y, rad, 0, P2);
    ctx.stroke();
  }
  // a sun dog on the halo's right
  glowAt(ctx, BF.sun.x + 158, BF.sun.y + 4, 26, '#fff0d0', 0.5, 1.4);
  glowAt(ctx, BF.sun.x, BF.sun.y, 280, '#ffe8b0', 0.45);
  glowAt(ctx, BF.sun.x, BF.sun.y, 520, '#ffd890', 0.18);
}

/** The storm deck (waves 3–4): heavy dark cloud rolling over, ragged bases, rain curtains hanging to the sea. */
function stormSky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: HOR };
  vfill(ctx, 0, 0, W, HOR, [[0, '#121626'], [0.45, '#22283c'], [0.8, '#3a3e54'], [1, '#56586a']]);
  lay(ctx, drift('#3e4460', '#0c1020', 4, 63, 160, 48), box, 0.55);
  const o = { lit: '#8a90a8', body: '#2e3448', shadow: '#0e1220', sunX: 600, sunY: -400, rim: 0.2, wisp: 0.6, a: 0.95, kind: 'bank' as const };
  for (let i = 0; i < 12; i++) {
    const y = 20 + (i / 12) * 380 + r() * 30;
    cloud(ctx, r, r() * W, y, 560 + r() * 620, 50 + r() * 50, { ...o, depth: 0.1 + (y / HOR) * 0.2 });
  }
  // rain curtains hanging from the deck's base to the sea
  softly(ctx, box, (g) => {
    for (const [x, w] of [[180, 160], [760, 240], [1180, 120], [1640, 220]] as const) {
      const lg = g.createLinearGradient(0, 240, 0, HOR);
      lg.addColorStop(0, 'rgba(70,78,100,0)');
      lg.addColorStop(0.4, 'rgba(70,78,100,0.4)');
      lg.addColorStop(1, 'rgba(90,96,116,0.25)');
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(x, 240);
      g.lineTo(x + w, 240);
      g.lineTo(x + w + 60, HOR);
      g.lineTo(x + 50, HOR);
      g.closePath();
      g.fill();
    }
  }, 0.25);
}

/** The fire at the world's end (wave 4, added): the horizon burning, the storm deck lit red-orange from beneath. */
function fireSky(ctx: Ctx): void {
  glowAt(ctx, 1100, HOR, 1300, '#ff4a1a', 0.32, 0.26);
  glowAt(ctx, 1500, HOR - 6, 600, '#ff7a2a', 0.36, 0.3);
  glowAt(ctx, 520, HOR - 4, 500, '#ff5a20', 0.26, 0.28);
  vfill(ctx, 0, HOR - 120, W, 120, [[0, 'rgba(255,90,30,0)'], [0.8, 'rgba(255,110,40,0.22)'], [1, 'rgba(255,170,80,0.45)']]);
  // the cloud deck's base lit from below
  softly(ctx, { x: 0, y: 0, w: W, h: HOR }, (g) => {
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * W + 80;
      const rg = g.createRadialGradient(x, 300, 0, x, 300, 240);
      rg.addColorStop(0, 'rgba(255,110,40,0.32)');
      rg.addColorStop(1, 'rgba(255,90,40,0)');
      g.fillStyle = rg;
      g.save();
      g.translate(x, 300);
      g.scale(1.8, 0.5);
      g.translate(-x, -300);
      g.fillRect(x - 240, 60, 480, 480);
      g.restore();
    }
  }, 0.25);
}

// ——— the world-sea far below ———

function sea(ctx: Ctx, r: R): void {
  water(ctx, r, 0, W, HOR, PAR, { far: '#9cbcdc', deep: '#2a5c9e', near: '#173c78', sky: '#e8f0f8', skyA: 0.6, swells: 16, crest: '#cfe2ff', ripples: 300, ripple: '#e4f0ff', glitterX: 390, glitter: '#fff4d8', glitterA: 0.45, glitterW: 220, seed: 83 });
  // the sea seen from so high: long slicks and wind lanes, the colour of deep water between them
  lay(ctx, noiseMask(12, 85, { cover: 0.35, soft: 0.5, col: '#4a80c0', w: 320, h: 40 }), { x: 0, y: HOR + 30, w: W, h: PAR - HOR - 30 }, 0.25);
  // Midgard's coasts on the rim of the world: long low headlands, blue with distance
  const coast = (pts: Pt[], d: number) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = airMix('#5a7a68', d, AIR);
    ctx.fill();
    ctx.fillStyle = rgba('#fff4dc', 0.3);
    ctx.beginPath();
    for (let i = 0; i < pts.length - 2; i++) {
      const [x, y] = pts[i];
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.lineTo(pts[pts.length - 3][0], pts[pts.length - 3][1] + 1.5);
    ctx.lineTo(pts[0][0], pts[0][1] + 1.5);
    ctx.fill();
  };
  coast([[470, HOR + 1], [520, HOR - 3], [600, HOR - 5], [700, HOR - 2], [760, HOR - 4], [840, HOR + 1], [840, HOR + 3], [470, HOR + 3]], 0.9);
  coast([[1540, HOR + 1], [1600, HOR - 6], [1690, HOR - 8], [1780, HOR - 4], [1920, HOR - 6], [1920, HOR + 3], [1540, HOR + 3]], 0.88);
  // far out on the sea, the world serpent's coils breaking the surface, the water parting white round them
  const ser = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = rgba('#ffffff', 0.3);
    ctx.beginPath();
    ctx.ellipse(x, y + 1, w * 0.7, h * 0.28, 0, 0, P2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.bezierCurveTo(x - w * 0.4, y - h, x + w * 0.4, y - h, x + w / 2, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y - h, 0, y);
    g.addColorStop(0, airMix('#5a7a70', 0.6, AIR));
    g.addColorStop(1, airMix('#1c3038', 0.6, AIR));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba('#f0f6ff', 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.36, y - h * 0.62);
    ctx.quadraticCurveTo(x - w * 0.1, y - h * 0.82, x + w * 0.1, y - h * 0.76);
    ctx.stroke();
  };
  ser(812, 508, 22, 8);
  ser(842, 509, 16, 6);
  ser(866, 510, 11, 4);
  for (const [x0, x1, y] of [[790, 900, 512], [800, 880, 516]] as const) {
    ctx.strokeStyle = rgba('#f4f8ff', 0.28);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + 2, x1, y);
    ctx.stroke();
  }
  // the bright haze lying on the sea at the horizon
  vfill(ctx, 0, HOR, W, 40, [[0, rgba('#f4eee2', 0.7)], [1, rgba('#f4eee2', 0)]]);
  // and the depth of air between us and the near sea, so far below: it lies blue and hazy, its ripples lost
  vfill(ctx, 0, HOR + 90, W, PAR - HOR - 90, [[0, rgba('#8aaad4', 0)], [0.5, rgba('#8aaad4', 0.35)], [1, rgba('#a4bce0', 0.6)]]);
  cloudDeck(ctx, r);
}

/** The cloud deck far below the terrace's edge: a floor of cumulus tops just under the parapet, the sea showing only
 * through gaps in it, lit on top from the left, blue in its hollows. */
function cloudDeck(ctx: Ctx, r: R): void {
  const base = PAR + 14;
  // the deck's body under the tops (its gaps: where the sea shows through)
  const gaps = [[560, 640], [1020, 1110], [1380, 1440]];
  softly(ctx, { x: 0, y: 600, w: W, h: base - 600 }, (g) => {
    const vg = g.createLinearGradient(0, 640, 0, base);
    vg.addColorStop(0, 'rgba(206,218,238,0)');
    vg.addColorStop(0.4, 'rgba(206,218,238,0.85)');
    vg.addColorStop(1, 'rgba(188,202,230,1)');
    g.fillStyle = vg;
    g.beginPath();
    g.moveTo(-10, base);
    for (let x = -10; x <= W + 10; x += 20) {
      const gap = gaps.some(([a, b]) => x > a && x < b);
      g.lineTo(x, gap ? base - 6 : 650 + Math.sin(x / 70) * 8 + Math.sin(x / 23) * 4);
    }
    g.lineTo(W + 10, base);
    g.closePath();
    g.fill();
  }, 0.25);
  const o = { lit: '#fffaf0', body: '#c8d2e8', shadow: '#6c7eb2', sunX: BF.sun.x - 600, sunY: -600, rim: 0.4, wisp: 0.3, kind: 'cumulus' as const, a: 0.98 };
  for (let x = -60; x < W + 60; ) {
    const w = 150 + r() * 190;
    const cx = x + w / 2;
    if (!gaps.some(([a, b]) => cx > a - 40 && cx < b + 40)) cloud(ctx, r, cx, base - 4, w, 40 + r() * 30, o);
    x += w * (0.55 + r() * 0.25);
  }
}

/** The sea burning along the world's rim (wave 4, added): a line of fire on the horizon, its light on the water. */
function seaFire(ctx: Ctx, r: R): void {
  vfill(ctx, 0, HOR, W, 14, [[0, 'rgba(255,190,90,0.85)'], [1, 'rgba(255,90,30,0)']]);
  glowAt(ctx, 1200, HOR + 4, 900, '#ff5a20', 0.3, 0.12);
  // the fire's light in long streaks down the swells
  for (let i = 0; i < 160; i++) {
    const t = r() ** 1.6;
    const y = HOR + 4 + t * 130;
    const x = r() * W;
    const len = (10 + r() * 40) * (0.4 + t);
    ctx.fillStyle = rgba(r() < 0.5 ? '#ff8a3a' : '#ffc070', (0.5 - t * 0.35) * (0.4 + r() * 0.6));
    ctx.fillRect(x - len / 2, y, len, 1 + t * 2);
  }
}

/** The sea under the storm (waves 3–4): slate grey, the light gone out of it, darkest under the deck. */
function seaStorm(ctx: Ctx): void {
  vfill(ctx, 0, HOR, W, PAR - HOR, [[0, 'rgba(70,78,98,0.75)'], [0.3, 'rgba(30,38,60,0.6)'], [1, 'rgba(16,22,40,0.55)']]);
  softly(ctx, { x: 0, y: HOR, w: W, h: PAR - HOR }, (g) => {
    for (let i = 0; i < 9; i++) {
      const x = ((i + 0.5) / 9) * W;
      const rg = g.createRadialGradient(x, HOR + 120, 0, x, HOR + 120, 220);
      rg.addColorStop(0, 'rgba(8,12,26,0.3)');
      rg.addColorStop(1, 'rgba(8,12,26,0)');
      g.fillStyle = rg;
      g.fillRect(x - 220, HOR, 440, PAR - HOR);
    }
  }, 0.25);
}

// ——— the cloud sea ———

interface CloudDef {
  kind: number;
  x: number;
  y: number;
  s: number;
  /** Drift speed (px/s). */
  v: number;
}
const CK = [
  { w: 420, h: 100, kind: 'cumulus' as const },
  { w: 520, h: 80, kind: 'bank' as const },
  { w: 340, h: 110, kind: 'cumulus' as const },
  { w: 600, h: 70, kind: 'stratus' as const },
];
/** A cloud's canvas: the cloud (its base at (CW/2, by)) and its shadow on the sea below it. */
const CW = (i: number) => Math.ceil(CK[i].w * 1.7);
const CH = (i: number) => Math.ceil(CK[i].h * 2.6);
const CBY = (i: number) => Math.ceil(CK[i].h * 1.75);
const cloudCache = new Map<number, HTMLCanvasElement>();
function cloudCanvas(i: number): HTMLCanvasElement {
  const hit = cloudCache.get(i);
  if (hit) return hit;
  const k = CK[i];
  const [c, g] = makeCanvas(CW(i), CH(i));
  const by = CBY(i);
  // the shadow it throws on the sea, down and to the right
  softly(g, { x: 0, y: 0, w: CW(i), h: CH(i) }, (q) => {
    const sx = CW(i) / 2 + k.w * 0.12;
    const sy = by + k.h * 0.5;
    const rg = q.createRadialGradient(sx, sy, 0, sx, sy, k.w * 0.45);
    rg.addColorStop(0, 'rgba(8,24,70,0.32)');
    rg.addColorStop(0.7, 'rgba(8,24,70,0.14)');
    rg.addColorStop(1, 'rgba(8,24,70,0)');
    q.fillStyle = rg;
    q.save();
    q.translate(sx, sy);
    q.scale(1, 0.24);
    q.translate(-sx, -sy);
    q.fillRect(sx - k.w, sy - k.w, k.w * 2, k.w * 2);
    q.restore();
  }, 0.25);
  const rr = rng(hashStr('bf:cloud' + i));
  cloud(g, rr, CW(i) / 2, by, k.w, k.h, { lit: '#fffaf0', body: '#c4d0e6', shadow: '#5a6ea8', sunX: BF.sun.x - 900, sunY: -800, rim: 0.45, wisp: 0.35, kind: k.kind, res: 0.5 });
  cloudCache.set(i, c);
  return c;
}
/** The cloud sea's clouds: far (small, many, slow), middle, near (big). Every cloud stays above the parapet. */
export const CLOUDS: CloudDef[] = (() => {
  const rr = rng(hashStr('bf:clouds'));
  const out: CloudDef[] = [];
  const row = (n: number, y0: number, y1: number, s0: number, s1: number, v: number) => {
    for (let i = 0; i < n; i++) {
      const kind = Math.floor(rr() * CK.length);
      const s = s0 + rr() * (s1 - s0);
      let y = y0 + rr() * (y1 - y0);
      // (the canvas bottom stays above the parapet)
      y = Math.min(y, PAR - 60 - (CH(kind) - CBY(kind)) * s);
      out.push({ kind, x: ((i + rr() * 0.6) / n) * (W + 400) - 200, y, s, v: v * (0.8 + rr() * 0.4) });
    }
  };
  row(10, HOR + 16, HOR + 30, 0.26, 0.38, 4);
  row(7, HOR + 60, HOR + 100, 0.42, 0.58, 8);
  return out;
})();

function cloudSea(ctx: Ctx): void {
  for (const c of CLOUDS) {
    const cv = cloudCanvas(c.kind);
    ctx.drawImage(cv, c.x - (cv.width / 2) * c.s, c.y - CBY(c.kind) * c.s, cv.width * c.s, cv.height * c.s);
  }
}

// ——— the gods' citadel ———

const CAIR: Air = { color: '#c8d8ec', far: 0.9 };
const CD = 0.62;

/** A hall seen a little from the left: its gable end towards us, a roof of golden shields, gold-lit windows. */
function hall(ctx: Ctx, r: R, x: number, base: number, w: number, wallH: number, roofH: number, side: number, d = CD): void {
  const a = (c: string) => airMix(c, d, CAIR);
  const gx0 = x - w / 2;
  const gx1 = x + w / 2;
  const eave = base - wallH;
  // the long side running back to the right, in the light's shade
  ctx.fillStyle = a('#9a8c98');
  ctx.beginPath();
  ctx.moveTo(gx1, base);
  ctx.lineTo(gx1 + side, base - side * 0.35);
  ctx.lineTo(gx1 + side, eave - side * 0.35);
  ctx.lineTo(gx1, eave);
  ctx.closePath();
  ctx.fill();
  // the roof's long plane: rows of shields, gold catching the sun
  ctx.beginPath();
  ctx.moveTo(x, eave - roofH);
  ctx.lineTo(x + side, eave - roofH - side * 0.35);
  ctx.lineTo(gx1 + side + 3, eave - side * 0.35 + 2);
  ctx.lineTo(gx1 + 3, eave + 2);
  ctx.closePath();
  const ga = (c: string) => airMix(c, d * 0.55, CAIR);
  const rg = ctx.createLinearGradient(x, eave - roofH, gx1, eave);
  rg.addColorStop(0, ga('#ffe08a'));
  rg.addColorStop(1, ga('#b07418'));
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let k = 0; k < 7; k++) {
    const u = k / 7;
    for (let j = 0; j < 9; j++) {
      const v = j / 9;
      const px = lerp(x, gx1, u) + v * side;
      const py = lerp(eave - roofH, eave, u) - v * side * 0.35;
      ctx.fillStyle = ga(j % 2 ? '#f8d060' : '#c88c28');
      ctx.beginPath();
      ctx.arc(px, py + 1, Math.max(1.2, w * 0.035), 0, Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
  // the gable end: pale stone, lit
  const gp = polyPath([[gx0, base], [gx0, eave], [x, eave - roofH], [gx1, eave], [gx1, base]]);
  gp(ctx);
  const fg = ctx.createLinearGradient(gx0, 0, gx1, 0);
  fg.addColorStop(0, a('#f4ece0'));
  fg.addColorStop(1, a('#cabcb4'));
  ctx.fillStyle = fg;
  ctx.fill();
  // timber gable boards and the crossed finials (dragon heads) at its peak
  ctx.strokeStyle = a('#6a4a2a');
  ctx.lineWidth = Math.max(1, w * 0.04);
  ctx.beginPath();
  ctx.moveTo(gx0 - 2, eave + 1);
  ctx.lineTo(x, eave - roofH);
  ctx.lineTo(gx1 + 2, eave + 1);
  ctx.stroke();
  ctx.strokeStyle = a('#f4c860');
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.06, eave - roofH + w * 0.06);
  ctx.quadraticCurveTo(x + w * 0.08, eave - roofH - w * 0.12, x + w * 0.16, eave - roofH - w * 0.06);
  ctx.moveTo(x + w * 0.06, eave - roofH + w * 0.06);
  ctx.quadraticCurveTo(x - w * 0.08, eave - roofH - w * 0.12, x - w * 0.16, eave - roofH - w * 0.06);
  ctx.stroke();
  // the door and the windows, gold-lit
  const dw = w * 0.18;
  ctx.fillStyle = a('#5a3a1a');
  ctx.beginPath();
  ctx.moveTo(x - dw / 2, base);
  ctx.lineTo(x - dw / 2, base - wallH * 0.55);
  ctx.arc(x, base - wallH * 0.55, dw / 2, Math.PI, 0);
  ctx.lineTo(x + dw / 2, base);
  ctx.fill();
  ctx.fillStyle = airMix('#ffd060', d * 0.4, CAIR);
  for (const u of [0.22, 0.78]) {
    ctx.fillRect(gx0 + w * u - 1.5, base - wallH * 0.7, 3, wallH * 0.3);
  }
  for (let k = 0; k < 3; k++) ctx.fillRect(gx1 + side * (0.25 + k * 0.25) - 1, base - wallH * 0.62 - side * (0.25 + k * 0.25) * 0.35, 2.4, wallH * 0.28);
  // shading under the eaves
  ctx.fillStyle = rgba('#3a2a40', 0.25 * (1 - d * 0.5));
  ctx.fillRect(gx0, eave, w, 3);
  ctx.strokeStyle = rgba(airMix(INK, d, CAIR), 0.6);
  ctx.lineWidth = 1;
  gp(ctx);
  ctx.stroke();
  void r;
}

/** A slim round tower with a gilded cone. */
function spire(ctx: Ctx, x: number, base: number, h: number, w: number, d = CD): void {
  const a = (c: string) => airMix(c, d, CAIR);
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, a('#f4ece0'));
  g.addColorStop(0.6, a('#d4c8c4'));
  g.addColorStop(1, a('#9a8c9c'));
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, base - h, w, h);
  ctx.fillStyle = a('#ffd870');
  ctx.fillRect(x - 1, base - h * 0.75, 2, h * 0.14);
  const cg = ctx.createLinearGradient(x - w, 0, x + w, 0);
  cg.addColorStop(0, a('#fff0b0'));
  cg.addColorStop(0.5, a('#e0a840'));
  cg.addColorStop(1, a('#8a5a20'));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.7, base - h);
  ctx.lineTo(x, base - h - w * 2.4);
  ctx.lineTo(x + w * 0.7, base - h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = a('#ffe9a0');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, base - h - w * 2.4);
  ctx.lineTo(x, base - h - w * 3.2);
  ctx.stroke();
}

/** The crag the citadel stands on, rising out of the cloud sea: its outline (top edge, left to right). */
const CRAG: Pt[] = [[1100, 520], [1130, 490], [1160, 474], [1200, 458], [1250, 448], [1290, 440], [1352, 436], [1368, 412], [1384, 396], [1404, 386], [1418, 360], [1432, 328], [1446, 300], [1462, 268], [1490, 256], [1530, 254], [1610, 252], [1640, 252], [1662, 276], [1690, 300], [1716, 312], [1740, 340], [1762, 382], [1782, 422], [1800, 460], [1820, 500]];
const CIT_BOX = { x: 1096 + CDX, y: 150 + CDY, w: 734, h: 380 };

function citadel(out: Ctx, r: R): void {
  // (painted on its own canvas, so its foot can melt away into the haze over the sea)
  const B = CIT_BOX;
  const [cc, ctx] = makeCanvas(B.w, B.h);
  ctx.translate(-B.x + CDX, -B.y + CDY);
  citadelPaint(ctx, r);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  const fg = ctx.createLinearGradient(0, HOR + 34 - B.y, 0, B.h);
  fg.addColorStop(0, 'rgba(0,0,0,0)');
  fg.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, 0, B.w, B.h);
  out.drawImage(cc, B.x, B.y);
}

function citadelPaint(ctx: Ctx, r: R): void {
  // a far peak behind the citadel, very hazy
  ctx.fillStyle = airMix('#8a96b8', 0.86, CAIR);
  ctx.beginPath();
  ctx.moveTo(1420, 400);
  ctx.lineTo(1500, 220);
  ctx.lineTo(1546, 178);
  ctx.lineTo(1570, 160);
  ctx.lineTo(1600, 182);
  ctx.lineTo(1660, 230);
  ctx.lineTo(1720, 330);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba('#fffaf0', 0.35);
  ctx.beginPath();
  ctx.moveTo(1500, 220);
  ctx.lineTo(1546, 178);
  ctx.lineTo(1570, 160);
  ctx.lineTo(1556, 200);
  ctx.lineTo(1520, 236);
  ctx.closePath();
  ctx.fill();
  // the crag: big planes of rock, the ones turned to the sun warm and lit, the flanks turned away cool, strata and
  // gullies cut across them
  const cragP = polyPath([...CRAG, [1820, 530], [1100, 530]]);
  cragP(ctx);
  ctx.fillStyle = airMix('#9a8a8c', CD, CAIR);
  ctx.fill();
  within(ctx, cragP, () => {
    const box = { x: 1100, y: 240, w: 720, h: 290 };
    const facet = (pts: Pt[], lit: string, dark: string, ang: [number, number, number, number]) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      const g = ctx.createLinearGradient(...ang);
      g.addColorStop(0, airMix(lit, CD, CAIR));
      g.addColorStop(1, airMix(dark, CD, CAIR));
      ctx.fillStyle = g;
      ctx.fill();
    };
    // the shoulder the bridge lands on, the lower middle, the summit's sunlit side, its front, the shaded flank
    facet([[1100, 530], [1100, 520], [1160, 474], [1290, 440], [1352, 436], [1384, 396], [1418, 360], [1440, 456], [1400, 530]], '#ecd8c2', '#b49ea0', [1180, 440, 1400, 520]);
    facet([[1440, 456], [1480, 420], [1500, 330], [1560, 400], [1650, 530], [1400, 530]], '#a89098', '#646a88', [1440, 380, 1600, 520]);
    facet([[1418, 360], [1446, 300], [1462, 268], [1490, 256], [1500, 330], [1480, 420], [1440, 456]], '#f4dcc4', '#c8aca4', [1440, 270, 1500, 450]);
    facet([[1490, 256], [1640, 252], [1600, 330], [1560, 400], [1500, 330]], '#d4bcb0', '#9a8c9c', [1500, 256, 1580, 400]);
    facet([[1640, 252], [1690, 300], [1740, 340], [1800, 460], [1820, 530], [1650, 530], [1560, 400], [1600, 330]], '#6a6a8c', '#3e4670', [1620, 280, 1760, 500]);
    lay(ctx, drift(airMix('#f0dcc4', CD, CAIR), airMix('#606a90', CD, CAIR), 6, 101, 96, 48), box, 0.2);
    // strata: thin lit lips over shadowed undercuts, running across the planes and dipping with them
    for (let i = 0; i < 16; i++) {
      const y = 280 + i * 15 + r() * 8;
      const x0 = 1180 + r() * 200;
      const x1 = x0 + 160 + r() * 360;
      ctx.strokeStyle = rgba(airMix('#4a4a70', CD, CAIR), 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y + 2);
      ctx.quadraticCurveTo((x0 + x1) / 2, y + 6 + r() * 6, x1, y + 10 + r() * 8);
      ctx.stroke();
      ctx.strokeStyle = rgba(airMix('#fff0dc', CD, CAIR), 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.quadraticCurveTo((x0 + x1) / 2, y + 4 + r() * 6, x1, y + 8 + r() * 8);
      ctx.stroke();
    }
    // gullies cut down it, each lit on its left lip, its right wall in shade
    for (let i = 0; i < 10; i++) {
      const x = 1240 + r() * 540;
      const y0 = 290 + r() * 100;
      const len = 60 + r() * 120;
      const wd = 6 + r() * 10;
      ctx.fillStyle = rgba(airMix('#3a4070', CD, CAIR), 0.45);
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + len * 0.12, y0 + len);
      ctx.lineTo(x + wd + len * 0.12, y0 + len);
      ctx.lineTo(x + wd * 0.5, y0 - 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(airMix('#fff0dc', CD, CAIR), 0.4);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 1, y0);
      ctx.lineTo(x - 1 + len * 0.12, y0 + len);
      ctx.stroke();
    }
    // grassy ledges catching the sun
    for (const [x0, x1, y] of [[1236, 1352, 440], [1380, 1440, 392], [1490, 1640, 254], [1690, 1740, 304], [1420, 1470, 362]] as const) {
      ctx.fillStyle = airMix('#a8c070', CD + 0.04, CAIR);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y - 1);
      ctx.lineTo(x1 - 6, y + 6);
      ctx.lineTo(x0 + 8, y + 8);
      ctx.closePath();
      ctx.fill();
    }
    // the haze thickening down to the cloud sea
    vfill(ctx, 1100, 380, 720, 150, [[0, rgba('#e6eef8', 0)], [1, rgba('#e6eef8', 0.75)]]);
  });
  ctx.strokeStyle = rgba(airMix(INK, CD, CAIR), 0.55);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  CRAG.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  // waterfalls off the terraces, falling into the clouds
  for (const [x, y0, y1] of [[1398, 384, 500], [1712, 314, 500], [1660, 262, 330]] as const) {
    const fg = ctx.createLinearGradient(0, y0, 0, y1);
    fg.addColorStop(0, rgba('#ffffff', 0.85));
    fg.addColorStop(1, rgba('#ffffff', 0.1));
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(x - 2, y0);
    ctx.lineTo(x + 2, y0);
    ctx.lineTo(x + 6, y1);
    ctx.lineTo(x - 5, y1);
    ctx.closePath();
    ctx.fill();
  }
  // walls along the terraces, crenellated
  const wall = (x0: number, y0: number, x1: number, y1: number, h: number) => {
    ctx.fillStyle = airMix('#e4d8cc', CD, CAIR);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y1 - h);
    ctx.lineTo(x0, y0 - h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = airMix('#8a7c8c', CD, CAIR);
    ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1) - 1, Math.abs(x1 - x0), 1.2);
    for (let x = x0; x < x1; x += 7) {
      const y = lerp(y0, y1, (x - x0) / (x1 - x0));
      ctx.fillStyle = airMix('#f0e6da', CD, CAIR);
      ctx.fillRect(x, y - h - 3, 3.5, 3);
    }
  };
  wall(1276, 444, 1352, 438, 10);
  wall(1372, 402, 1430, 356, 9);
  wall(1500, 258, 1640, 256, 8);
  wall(1690, 302, 1740, 352, 8);
  // the halls, far to near
  spire(ctx, 1580, 236, 60, 9, 0.66);
  hall(ctx, r, 1546, 252, 116, 26, 44, 60, 0.64);
  spire(ctx, 1488, 258, 46, 8);
  spire(ctx, 1630, 254, 40, 7);
  hall(ctx, r, 1700, 306, 56, 16, 24, 30);
  hall(ctx, r, 1412, 380, 48, 15, 22, 26);
  hall(ctx, r, 1460, 350, 40, 12, 18, 22);
  spire(ctx, 1742, 354, 34, 7);
  // the gate the bridge lands at: two towers flanking it, its arch full of the bridge's light
  // (in the citadel's own frame: BF.gate less the shift)
  const gx = BF.gate.x - CDX;
  const gy = BF.gate.y - CDY;
  // its footing: a buttress of the crag's rock under it, running down into the cloud
  const foot = polyPath([[gx - 40, gy + 6], [gx + 46, gy + 4], [gx + 58, gy + 60], [gx - 54, gy + 60]]);
  foot(ctx);
  const fgr = ctx.createLinearGradient(gx - 50, 0, gx + 58, 0);
  fgr.addColorStop(0, airMix('#e4d0bc', CD, CAIR));
  fgr.addColorStop(1, airMix('#7a7890', CD, CAIR));
  ctx.fillStyle = fgr;
  ctx.fill();
  // the gatehouse wall, its arch, two flanking towers
  const gw = polyPath([[gx - 30, gy + 8], [gx - 30, gy - 22], [gx + 34, gy - 22], [gx + 34, gy + 8]]);
  gw(ctx);
  ctx.fillStyle = airMix('#ece2d4', CD - 0.06, CAIR);
  ctx.fill();
  ctx.fillStyle = airMix('#5a4060', CD - 0.06, CAIR);
  ctx.beginPath();
  ctx.moveTo(gx - 9, gy + 8);
  ctx.lineTo(gx - 9, gy - 6);
  ctx.arc(gx + 2, gy - 6, 11, Math.PI, 0);
  ctx.lineTo(gx + 13, gy + 8);
  ctx.closePath();
  ctx.fill();
  // the bridge's light inside the arch, warm
  const ag = ctx.createRadialGradient(gx + 2, gy, 0, gx + 2, gy, 14);
  ag.addColorStop(0, airMix('#ffe8b0', 0.3, CAIR));
  ag.addColorStop(1, rgba('#ffd890', 0));
  ctx.fillStyle = ag;
  ctx.fillRect(gx - 12, gy - 18, 28, 26);
  ctx.fillStyle = airMix('#d8a840', CD - 0.2, CAIR);
  ctx.fillRect(gx - 30, gy - 24, 64, 3);
  spire(ctx, gx - 34, gy + 12, 46, 12, CD - 0.08);
  spire(ctx, gx + 38, gy + 10, 44, 12, CD - 0.08);
  // the citadel's gold catching the sun: small hard glints on the roofs and finials
  for (const [x, y] of [[1530, 212], [1560, 216], [1580, 164], [1488, 194], [1630, 210], [1700, 286], [1412, 361], [1284, 377], [1330, 380], [1742, 306]] as const) {
    ctx.fillStyle = rgba('#fffcf0', 0.85);
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, P2);
    ctx.fill();
  }
}

// ——— the bridge ———

const DSW = 1024;
const DSH = 48;

/** The deck painted flat: the spectrum across it, the slabs' seams in perspective, light threads running its length,
 * the sun's sheen on its near part. Width runs t 0…1, height the far edge (0) to the near edge. */
let deckCache: HTMLCanvasElement | null = null;
function deckStrip(): HTMLCanvasElement {
  if (deckCache) return deckCache;
  const r = rng(hashStr('bf:deck'));
  const [c, g] = makeCanvas(DSW, DSH);
  const lg = g.createLinearGradient(0, 0, 0, DSH);
  SPEC.forEach((col, i) => lg.addColorStop(i / (SPEC.length - 1), col));
  g.fillStyle = lg;
  g.fillRect(0, 0, DSW, DSH);
  // the glass's body: deeper, richer colour at its edges (the slab's thickness), a pale core of light
  const eg = g.createLinearGradient(0, 0, 0, DSH);
  eg.addColorStop(0, 'rgba(40,20,110,0.5)');
  eg.addColorStop(0.2, 'rgba(40,20,90,0)');
  eg.addColorStop(0.8, 'rgba(90,10,40,0)');
  eg.addColorStop(1, 'rgba(110,10,40,0.45)');
  g.fillStyle = eg;
  g.fillRect(0, 0, DSW, DSH);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const cg = g.createLinearGradient(0, 0, 0, DSH);
  cg.addColorStop(0.22, 'rgba(255,255,255,0)');
  cg.addColorStop(0.4, 'rgba(255,252,240,0.3)');
  cg.addColorStop(0.47, 'rgba(255,255,250,0.55)');
  cg.addColorStop(0.54, 'rgba(255,252,240,0.3)');
  cg.addColorStop(0.72, 'rgba(255,255,255,0)');
  g.fillStyle = cg;
  g.fillRect(0, 0, DSW, DSH);
  // long soft streaks of brighter light running its length (no seams: it is one body of light)
  for (let i = 0; i < 6; i++) {
    const y = 6 + r() * (DSH - 12);
    const lg2 = g.createLinearGradient(0, y - 3, 0, y + 3);
    lg2.addColorStop(0, 'rgba(255,255,255,0)');
    lg2.addColorStop(0.5, rgba('#ffffff', 0.08 + r() * 0.08));
    lg2.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg2;
    g.fillRect(0, y - 3, DSW, 6);
  }
  // the sun's sheen on the near slabs (the deck turned to it there)
  const sg = g.createRadialGradient(150, DSH * 0.3, 0, 150, DSH * 0.3, 160);
  sg.addColorStop(0, 'rgba(255,250,236,0.2)');
  sg.addColorStop(1, 'rgba(255,250,236,0)');
  g.fillStyle = sg;
  g.save();
  g.translate(150, DSH * 0.3);
  g.scale(1, 0.18);
  g.translate(-150, -DSH * 0.3);
  g.fillRect(-20, -200, 360, 400);
  g.restore();
  g.restore();
  // tiny crystals catching the light
  for (let i = 0; i < 40; i++) {
    const x = r() ** 1.4 * DSW;
    const y = r() * DSH;
    const s = 2 + r() * 3 * (1 - x / DSW);
    g.fillStyle = rgba('#ffffff', 0.6);
    g.fillRect(x - s, y - 0.4, s * 2, 0.8);
    g.fillRect(x - 0.4, y - s, 0.8, s * 2);
  }
  // further off the deck pales into the air
  const ag = g.createLinearGradient(0, 0, DSW, 0);
  ag.addColorStop(0, 'rgba(230,238,250,0)');
  ag.addColorStop(0.5, 'rgba(230,238,250,0.08)');
  ag.addColorStop(1, 'rgba(230,238,250,0.4)');
  g.fillStyle = ag;
  g.fillRect(0, 0, DSW, DSH);
  deckCache = c;
  return c;
}

/** The slab's edge under the deck: a lit arris, then the spectrum refracted back the other way, darker and deeper,
 * facets cut down it, a dark keel. */
let fasciaCache: HTMLCanvasElement | null = null;
function fasciaStrip(): HTMLCanvasElement {
  if (fasciaCache) return fasciaCache;
  const FH = 24;
  const r = rng(hashStr('bf:fascia'));
  const [c, g] = makeCanvas(DSW, FH);
  const lg = g.createLinearGradient(0, 0, 0, FH);
  lg.addColorStop(0, '#fffaf0');
  lg.addColorStop(0.1, '#fff0d0');
  for (let i = 0; i < SPEC.length; i++) lg.addColorStop(0.16 + (i / (SPEC.length - 1)) * 0.66, mix(SPEC[SPEC.length - 1 - i], '#24165a', 0.5));
  lg.addColorStop(0.9, '#1e1450');
  lg.addColorStop(1, '#120c34');
  g.fillStyle = lg;
  g.fillRect(0, 0, DSW, FH);
  // the glass's depth: light caught inside it in soft vertical veils
  for (let i = 0; i < 40; i++) {
    const x = r() * DSW;
    const w = 6 + r() * 30;
    const vg = g.createLinearGradient(x, 0, x + w, 0);
    vg.addColorStop(0, 'rgba(255,255,255,0)');
    vg.addColorStop(0.5, rgba('#ffffff', 0.05 + r() * 0.07));
    vg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = vg;
    g.fillRect(x, FH * 0.15, w, FH * 0.7);
  }
  const ag = g.createLinearGradient(0, 0, DSW, 0);
  ag.addColorStop(0, 'rgba(220,230,248,0)');
  ag.addColorStop(1, 'rgba(220,230,248,0.45)');
  g.fillStyle = ag;
  g.fillRect(0, 0, DSW, FH);
  fasciaCache = c;
  return c;
}

/** The bridge: its deck of light, the slab's edge under it, a bright arris along its far edge. */
function bridge(ctx: Ctx): void {
  mapStrip(ctx, fasciaStrip(), deckBot, fasciaH);
  mapStrip(ctx, deckStrip(), deckTop, deckW);
  // the arrises: the far edge bright, the keel dark
  ctx.lineCap = 'round';
  const edge = (y: (t: number) => number, col: string, w: (t: number) => number, a: (t: number) => number) => {
    for (let i = 0; i < 120; i++) {
      const t = i / 120;
      const t1 = (i + 1) / 120;
      ctx.strokeStyle = rgba(col, a(t));
      ctx.lineWidth = w(t);
      ctx.beginPath();
      ctx.moveTo(bz(t)[0], y(t));
      ctx.lineTo(bz(t1)[0], y(t1));
      ctx.stroke();
    }
  };
  edge((t) => deckBot(t) + fasciaH(t), '#1e1446', (t) => 0.8 + (1 - t) * 1.6, (t) => 0.7 * bridgeA(t));
  edge(deckTop, '#fffef4', (t) => 0.8 + (1 - t) * 2, (t) => 0.85 * bridgeA(t));
}

// ——— the bridge's light (added): its bloom in the air and the curtain of colour it throws down into the drop ———

function bridgeLight(ctx: Ctx, op: GlobalCompositeOperation = 'source-over'): void {
  const box = LIGHT_BOX;
  softly(ctx, box, (g) => {
    g.globalCompositeOperation = 'lighter';
    // the curtain: light falling through the prism, dispersed into colours that run along the bridge
    for (let i = 0; i < 260; i++) {
      const t = i / 260;
      const [x] = bz(t);
      const [x1] = bz((i + 1) / 260);
      const y0 = deckBot(t) + fasciaH(t) - 2;
      const len = 50 + 190 * (1 - t) ** 1.2;
      const col = specHex((t * 3.4 + 0.1) % 1);
      const a = 0.075 * bridgeA(t) * (0.75 + 0.25 * Math.sin(t * 90));
      const lg = g.createLinearGradient(0, y0, 0, y0 + len);
      lg.addColorStop(0, rgba(col, a));
      lg.addColorStop(0.35, rgba(col, a * 0.45));
      lg.addColorStop(1, rgba(col, 0));
      g.fillStyle = lg;
      g.fillRect(x, y0, x1 - x + 1, Math.min(len, PAR - y0));
    }
    // its colours pooled on the cloud tops and the sea far beneath it
    for (let i = 0; i <= 30; i++) {
      const t = 0.04 + (i / 30) * 0.8;
      const [x] = bz(t);
      const y = Math.min(PAR - 30, deckBot(t) + 70 + 150 * (1 - t));
      const rad = 30 + 70 * (1 - t);
      const col = specHex((t * 3.4 + 0.1) % 1);
      g.save();
      g.translate(x + 16, y);
      g.scale(1.6, 0.4);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, rad);
      rg.addColorStop(0, rgba(col, 0.07 * bridgeA(t)));
      rg.addColorStop(1, rgba(col, 0));
      g.fillStyle = rg;
      g.fillRect(-rad, -rad, rad * 2, rad * 2);
      g.restore();
    }
    // the glow along its edges
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const [x] = bz(t);
      for (const [y, a] of [[deckTop(t), 0.06], [deckBot(t) + fasciaH(t), 0.035]] as const) {
        const rad = 8 + 26 * (1 - t);
        const rg = g.createRadialGradient(x, y, 0, x, y, rad);
        rg.addColorStop(0, rgba('#fff6e4', a * bridgeA(t)));
        rg.addColorStop(1, 'rgba(255,246,228,0)');
        g.fillStyle = rg;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    // the bloom round the deck
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const [x, y] = bz(t);
      const rad = 30 + 70 * (1 - t);
      const rg = g.createRadialGradient(x, y, 0, x, y, rad);
      rg.addColorStop(0, rgba('#fff4dc', 0.035 * bridgeA(t)));
      rg.addColorStop(1, 'rgba(255,244,220,0)');
      g.fillStyle = rg;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // where it springs from the abutment, and where it lands in the gate
    for (const [x, y, rad, a] of [[BF.head.x1 + 6, 570, 70, 0.32], [BF.gate.x, BF.gate.y - 4, 22, 0.25]] as const) {
      const rg = g.createRadialGradient(x, y, 0, x, y, rad);
      rg.addColorStop(0, rgba('#fff8e8', a));
      rg.addColorStop(1, 'rgba(255,248,232,0)');
      g.fillStyle = rg;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, 0.25, op);
}

// ——— the caustics flowing along the deck (frames) ———

const CSW = 768;
const CSH = 40;
/** The deck's caustic light at phase ph (0…1 loops) painted flat (as deckStrip): a net of bright threads from waves
 * crossing in the glass, running outward along it, with slow pulses of light travelling out on them. */
function causticStrip(ph: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(CSW, CSH);
  const img = g.createImageData(CSW, CSH);
  const d = img.data;
  const T = P2 * ph;
  for (let x = 0; x < CSW; x++) {
    const t = x / CSW;
    const u = G(t) * 60;
    // (the net is too fine to see beyond the crest: it thins out there)
    const fade = clamp01((0.9 - t) / 0.3) * clamp01(t / 0.03);
    const env = 0.5 + 0.5 * Math.sin(u / 7 - T);
    for (let y = 0; y < CSH; y++) {
      const v = y / CSH;
      const w = v * 9;
      const s = (Math.sin(u + w * 1.3 - T * 2) + Math.sin(u * 0.62 - w * 1.9 + T * 3) + Math.sin(u * 1.37 + w * 0.7 - T)) / 3;
      const k = (1 - Math.abs(s)) ** 12 * fade * (0.25 + 0.75 * env * env);
      const [cr, cg, cb] = specAt(v);
      const i = (y * CSW + x) * 4;
      d[i] = cr * 0.45 + 255 * 0.55;
      d[i + 1] = cg * 0.45 + 250 * 0.55;
      d[i + 2] = cb * 0.45 + 240 * 0.55;
      d[i + 3] = Math.round(255 * Math.min(1, k));
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** The deck's box (for the caustic frames). */
const DECK_BOX = { x: 400, y: 360, w: 920, h: 280 };
function causticFrame(c: Ctx, ph: number, res: number): void {
  c.save();
  c.scale(res, res);
  c.translate(-DECK_BOX.x, -DECK_BOX.y);
  mapStrip(c, causticStrip(ph), deckTop, deckW, bridgeA, 400);
  c.restore();
}

// ——— the watchtower ———

const T = BF.tower;
/** The shaft's left and right edges at y (a slight batter). */
const tL = (y: number) => T.xl - (y - T.gal) * 0.018;
const tR = (y: number) => T.xr + (y - T.gal) * 0.014;
const SIDE = 34;

function tower(ctx: Ctx, r: R): void {
  // the shaft: rune-cut stone, its front face to the sun, a narrow side face turned away
  const shaft = polyPath([[tL(T.gal), T.gal], [tR(T.gal), T.gal], [tR(PAR), PAR + 2], [tL(PAR), PAR + 2]]);
  castShadow(ctx, shaft, 16, 24, 0.25, '#1a2850');
  within(ctx, shaft, () => {
    const box = { x: 0, y: T.gal, w: 240, h: PAR - T.gal + 4 };
    ashlar(ctx, r, box, ['#b4b0bc', '#a6a2b2', '#bcb6c0', '#9a96aa', '#aaa4b0'], '#5c586e', { rowH: 34, minW: 46, maxW: 96, weather: 0.6, moss: '#8a9a6a', mossA: 0.3, seed: 7 });
    // the light: warm from the upper left, falling off down and to the right
    const lg = ctx.createLinearGradient(0, T.gal, 240, PAR);
    lg.addColorStop(0, 'rgba(255,236,200,0.18)');
    lg.addColorStop(0.5, 'rgba(60,50,90,0.05)');
    lg.addColorStop(1, 'rgba(30,24,60,0.35)');
    ctx.fillStyle = lg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    // the side face, in shade, the sky's blue in it
    ctx.fillStyle = 'rgba(34,36,74,0.62)';
    ctx.beginPath();
    ctx.moveTo(tR(T.gal) - SIDE, T.gal);
    ctx.lineTo(tR(T.gal) + 2, T.gal);
    ctx.lineTo(tR(PAR) + 2, PAR + 2);
    ctx.lineTo(tR(PAR) - SIDE - 4, PAR + 2);
    ctx.closePath();
    ctx.fill();
    vfill(ctx, tR(PAR) - SIDE - 6, T.gal, SIDE + 10, PAR - T.gal, [[0, 'rgba(120,150,220,0.12)'], [1, 'rgba(120,150,220,0)']]);
    ctx.strokeStyle = rgba('#f0ece4', 0.6);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(tR(T.gal) - SIDE, T.gal);
    ctx.lineTo(tR(PAR) - SIDE - 4, PAR);
    ctx.stroke();
    // the carved bands: a raised moulding wrapped round both faces, runes cut along it
    for (const by of [330, 540]) {
      const x0 = tL(by) - 2;
      const xa = tR(by) - SIDE - (by - T.gal) * 0.008;
      ctx.fillStyle = 'rgba(14,12,30,0.4)';
      ctx.fillRect(x0, by + 30, tR(by) - x0 + 4, 6);
      ctx.fillStyle = '#a29eb2';
      ctx.fillRect(x0, by, xa - x0, 30);
      ctx.fillStyle = '#4a4864';
      ctx.fillRect(xa, by, tR(by) + 4 - xa, 30);
      ctx.fillStyle = rgba('#fff4e0', 0.45);
      ctx.fillRect(x0, by, xa - x0, 2.5);
      ctx.fillStyle = 'rgba(14,12,30,0.35)';
      ctx.fillRect(x0, by + 27, tR(by) + 4 - x0, 3);
      for (let x = x0 + 8, i = 0; x < xa - 14; x += 19, i++) carvedRune(ctx, Math.floor(r() * 10), x, by + 5, 20, 0.35);
      // a band of gilt bronze under it
      ctx.fillStyle = GOLD.body;
      ctx.fillRect(x0, by + 30, xa - x0, 5);
      ctx.fillStyle = GOLD.shade;
      ctx.fillRect(xa, by + 30, tR(by) + 4 - xa, 5);
      ctx.fillStyle = rgba(GOLD.lit, 0.9);
      ctx.fillRect(x0, by + 30, xa - x0, 1.5);
    }
    // a recessed panel of runes between the bands, their inlay faintly alight
    const px = 66;
    ctx.fillStyle = 'rgba(30,26,54,0.3)';
    ctx.fillRect(px, 382, 44, 140);
    ctx.fillStyle = 'rgba(14,12,30,0.55)';
    ctx.fillRect(px, 382, 44, 3);
    ctx.fillRect(px, 382, 3, 140);
    ctx.fillStyle = rgba('#fff2dc', 0.4);
    ctx.fillRect(px, 520, 44, 2);
    ctx.fillRect(px + 42, 382, 2, 140);
    for (let i = 0; i < 4; i++) carvedRune(ctx, [4, 6, 9, 2][i], px + 13, 390 + i * 32, 26, 0.45);
    // arrow slits
    for (const [x, y] of [[150, 400], [128, 610]] as const) {
      ctx.fillStyle = '#16142a';
      ctx.fillRect(x, y, 8, 42);
      ctx.fillStyle = rgba('#fff2dc', 0.4);
      ctx.fillRect(x + 8, y, 2, 42);
      ctx.fillRect(x, y + 42, 10, 2);
    }
    // weather: streaks run down from the bands and the gallery, grime at the foot
    for (const by of [T.gal + 2, 366, 576]) for (let k = 0; k < 3; k++) streaks(ctx, r, 40 + r() * 120, by, 40, 30 + r() * 60, '#1a1428', 0.2, 3);
    for (let i = 0; i < 4; i++) crack(ctx, r, 50 + r() * 110, 420 + r() * 220, Math.PI / 2 + (r() - 0.5), 30 + r() * 60, { col: '#120e20', lip: '#e8e2ea', w: 1.4, a: 0.6, branch: 0.3 });
    vfill(ctx, 0, PAR - 90, 240, 92, [[0, 'rgba(20,16,40,0)'], [0.7, 'rgba(20,16,40,0.25)'], [1, 'rgba(12,10,28,0.6)']]);
  });
  shaft(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  // the cool rim down its far edge
  ctx.strokeStyle = rgba('#d4e2ff', 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tR(T.gal) - 1.5, T.gal + 4);
  ctx.lineTo(tR(PAR) - 1.5, PAR);
  ctx.stroke();
  lookout(ctx, r);
}

/** The lookout: a gallery slab on corbels, timber posts and a carved rail, and over it the shingled gable. */
function lookout(ctx: Ctx, r: R): void {
  const g0 = T.gal;
  const x0 = 4;
  const x1 = 226;
  // corbels under the slab, each casting its shadow down the wall
  for (let i = 0; i < 5; i++) {
    const cx = 34 + i * 36;
    // its shadow on the wall under it (only on the wall)
    ctx.save();
    ctx.beginPath();
    ctx.rect(tL(g0), g0, tR(g0) - tL(g0), 60);
    ctx.clip();
    ctx.fillStyle = 'rgba(20,18,46,0.3)';
    ctx.beginPath();
    ctx.moveTo(cx - 4, g0 + 14);
    ctx.lineTo(cx + 18, g0 + 14);
    ctx.lineTo(cx + 22, g0 + 46);
    ctx.lineTo(cx + 2, g0 + 50);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // a corbel of three stepped courses, each lit on its top and left, shadowed under
    for (let k = 0; k < 3; k++) {
      const w = 22 - k * 6;
      const y = g0 + 14 + k * 9;
      ctx.fillStyle = k === 0 ? '#aaa6b6' : k === 1 ? '#9894a8' : '#868298';
      ctx.fillRect(cx - w / 2, y, w, 9);
      ctx.fillStyle = rgba('#fff2dc', 0.4);
      ctx.fillRect(cx - w / 2, y, w, 1.6);
      ctx.fillStyle = 'rgba(20,16,40,0.45)';
      ctx.fillRect(cx - w / 2, y + 7.5, w, 1.5);
      ctx.fillRect(cx + w / 2 - 2, y, 2, 9);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(cx - w / 2, y, w, 9);
    }
  }
  // the gallery's floor slab
  const slab = polyPath([[x0, g0 - 2], [x1, g0 - 2], [x1, g0 + 14], [x0, g0 + 14]]);
  slab(ctx);
  ctx.fillStyle = '#9e9aac';
  ctx.fill();
  within(ctx, slab, () => {
    surface(ctx, r, { x: x0, y: g0 - 2, w: x1 - x0, h: 16 }, '#9e9aac', { over: true, vary: 0.3, cells: 3, grain: 0.3, grainKind: 'stone', seed: 21 });
    ctx.fillStyle = rgba('#fff4e0', 0.5);
    ctx.fillRect(x0, g0 - 2, x1 - x0, 3);
    for (let x = x0 + 8, i = 0; x < x1 - 10; x += 14, i++) carvedRune(ctx, i * 5, x, g0 + 2, 10, 0.25, 0.7);
    vfill(ctx, x1 - 30, g0 - 2, 30, 16, [[0, 'rgba(20,18,50,0.4)'], [1, 'rgba(20,18,50,0.4)']]);
  });
  slab(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // the dark inside of the lookout, the beacon's iron basket a shape against it
  const inner = polyPath([[x0 + 6, T.eaves + 4], [x1 - 6, T.eaves + 4], [x1 - 6, g0 - 2], [x0 + 6, g0 - 2]]);
  inner(ctx);
  ctx.fillStyle = '#1e1a2a';
  ctx.fill();
  within(ctx, inner, () => {
    vfill(ctx, x0, T.eaves, x1 - x0, g0 - T.eaves, [[0, 'rgba(10,8,20,0.7)'], [1, 'rgba(90,60,50,0.3)']]);
    // daylight through the far openings
    for (const x of [44, 94, 144]) {
      ctx.fillStyle = rgba('#a8c4e8', 0.35);
      ctx.fillRect(x, T.eaves + 14, 28, 22);
    }
    ctx.fillStyle = '#121018';
    ctx.beginPath();
    ctx.moveTo(96, g0 - 2);
    ctx.lineTo(104, 214);
    ctx.lineTo(120, 214);
    ctx.lineTo(128, g0 - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(112, 212, 22, 8, 0, 0, P2);
    ctx.fill();
  });
  // the carved rail: a beam on short balusters, interlace cut along it
  ctx.fillStyle = '#5a3e2a';
  for (let x = x0 + 10; x < x1 - 6; x += 12) ctx.fillRect(x, g0 - 26, 5, 24);
  const rail = polyPath([[x0, g0 - 36], [x1, g0 - 36], [x1, g0 - 24], [x0, g0 - 24]]);
  rail(ctx);
  const rg = ctx.createLinearGradient(0, g0 - 36, 0, g0 - 24);
  rg.addColorStop(0, '#b08a5c');
  rg.addColorStop(1, '#5a3e24');
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.strokeStyle = rgba('#2a180c', 0.6);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = x0; x < x1; x += 10) {
    ctx.moveTo(x, g0 - 33);
    ctx.bezierCurveTo(x + 3, g0 - 25, x + 7, g0 - 25, x + 10, g0 - 33);
    ctx.moveTo(x, g0 - 27);
    ctx.bezierCurveTo(x + 3, g0 - 35, x + 7, g0 - 35, x + 10, g0 - 27);
  }
  ctx.stroke();
  rail(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // the posts: adzed timbers, lit on their left
  for (const x of [x0 + 2, 60, 112, 164, x1 - 14]) {
    const pp = polyPath([[x, T.eaves], [x + 12, T.eaves], [x + 12, g0 - 2], [x, g0 - 2]]);
    pp(ctx);
    const pg = ctx.createLinearGradient(x, 0, x + 12, 0);
    pg.addColorStop(0, '#c09a68');
    pg.addColorStop(0.5, '#7a5634');
    pg.addColorStop(1, '#3a2614');
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // a carved knot band
    ctx.strokeStyle = rgba('#2a180a', 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = T.eaves + 4; y < T.eaves + 30; y += 8) {
      ctx.moveTo(x + 1, y);
      ctx.lineTo(x + 11, y + 6);
    }
    ctx.stroke();
  }
  roof(ctx, r);
}

function roof(ctx: Ctx, r: R): void {
  const SUNY = T.peak + 54;
  const e = T.eaves;
  const ex0 = -16;
  const ex1 = 238;
  const back = 40;
  // the right roof plane running back from the gable, shingled, in the sun's shade
  const plane = polyPath([[T.px, T.peak], [T.px + back, T.peak - 10], [ex1 + back, e - 12], [ex1, e]]);
  plane(ctx);
  ctx.fillStyle = '#3e2c26';
  ctx.fill();
  within(ctx, plane, () => {
    for (let k = 0; k < 14; k++) {
      const u = k / 14;
      const ax = lerp(T.px, ex1, u);
      const ay = lerp(T.peak, e, u);
      ctx.strokeStyle = rgba('#1a100c', 0.6);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + back, ay - 10);
      ctx.stroke();
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = rgba(j % 2 ? '#5a4436' : '#4a3628', 0.8);
        ctx.beginPath();
        ctx.arc(ax + (j + 0.5) * (back / 4), ay - (j + 0.5) * 2.5 + 3, 5, 0, Math.PI);
        ctx.fill();
      }
    }
    vfill(ctx, T.px, T.peak - 10, ex1 + back - T.px, e - T.peak + 10, [[0, 'rgba(150,170,220,0.1)'], [1, 'rgba(10,8,30,0.2)']]);
  });
  plane(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // the gable end: vertical boards, weathered silver-brown, lit
  const gable = polyPath([[ex0 + 10, e], [T.px, T.peak], [ex1 - 10, e]]);
  gable(ctx);
  ctx.fillStyle = '#9a7a58';
  ctx.fill();
  within(ctx, gable, () => {
    surface(ctx, r, { x: ex0, y: T.peak, w: ex1 - ex0, h: e - T.peak }, '#9a7a58', { over: true, vary: 0.4, cells: 3, strokes: 1, strokeAng: Math.PI / 2, strokeLen: 60, strokeW: 3, grain: 0.3, grainKind: 'wood', seed: 23 });
    for (let x = ex0 + 10; x < ex1; x += 13) {
      ctx.fillStyle = 'rgba(30,18,10,0.45)';
      ctx.fillRect(x, T.peak, 1.6, e - T.peak);
      ctx.fillStyle = rgba('#fff0d4', 0.18);
      ctx.fillRect(x + 1.6, T.peak, 1.2, e - T.peak);
    }
    const lg = ctx.createLinearGradient(ex0, 0, ex1, 0);
    lg.addColorStop(0, 'rgba(255,236,196,0.2)');
    lg.addColorStop(1, 'rgba(30,20,50,0.3)');
    ctx.fillStyle = lg;
    ctx.fillRect(ex0, T.peak, ex1 - ex0, e - T.peak);
    // a sun disc carved in the gable, gilded
    ctx.fillStyle = GOLD.body;
    ctx.beginPath();
    ctx.arc(T.px, SUNY, 15, 0, P2);
    ctx.fill();
    ctx.strokeStyle = GOLD.shade;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = rgba(GOLD.lit, 0.9);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(T.px - 1, SUNY - 1, 10, Math.PI * 0.9, Math.PI * 1.7);
    ctx.stroke();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * P2;
      ctx.strokeStyle = GOLD.shade;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(T.px + Math.cos(a) * 5, SUNY + Math.sin(a) * 5);
      ctx.lineTo(T.px + Math.cos(a) * 13, SUNY + Math.sin(a) * 13);
      ctx.stroke();
    }
    vfill(ctx, ex0, e - 14, ex1 - ex0, 14, [[0, 'rgba(10,6,20,0)'], [1, 'rgba(10,6,20,0.35)']]);
  });
  gable(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // the bargeboards, crossing at the peak and carved into dragon heads, gilded
  const board = (sx: number, dir: number) => {
    const bx0 = sx;
    const by0 = e + 6;
    const px = T.px + dir * 20;
    const py = T.peak - 14;
    const ang = Math.atan2(py - by0, px - bx0);
    const nx = -Math.sin(ang) * 7;
    const ny = Math.cos(ang) * 7;
    const p = polyPath([[bx0, by0], [px, py], [px + nx, py + ny], [bx0 + nx, by0 + ny]]);
    p(ctx);
    ctx.fillStyle = dir < 0 ? '#7a5434' : '#5a3a20';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // the head, curling out
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + dir * 14, py - 14, px + dir * 22, py - 6);
    ctx.quadraticCurveTo(px + dir * 26, py, px + dir * 18, py + 2);
    ctx.quadraticCurveTo(px + dir * 10, py + 2, px + nx, py + ny);
    ctx.closePath();
    const hg = ctx.createLinearGradient(px - 20, py - 20, px + 20, py + 10);
    hg.addColorStop(0, GOLD.lit);
    hg.addColorStop(1, GOLD.shade);
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(px + dir * 15, py - 6, 1.6, 0, P2);
    ctx.fill();
  };
  board(ex0 + 4, 1);
  board(ex1 - 4, -1);
  // the finial pole the pennant flies from
  ctx.fillStyle = '#3a2618';
  ctx.fillRect(T.px - 2.5, PEN_Y - 26, 5, T.peak - PEN_Y + 22);
  ctx.fillStyle = rgba('#e8c890', 0.7);
  ctx.fillRect(T.px - 2.5, PEN_Y - 26, 1.5, T.peak - PEN_Y + 22);
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  ctx.arc(T.px, PEN_Y - 28, 4, 0, P2);
  ctx.fill();
  void r;
}

// ——— the horn and its beam ———

/** The beam the horn hangs from: a timber arm out of the tower, a strut under it, iron straps. */
function beam(ctx: Ctx): void {
  const { x0, x1, y } = BF.beam;
  // its shadow on the tower
  ctx.fillStyle = 'rgba(20,18,50,0.3)';
  ctx.fillRect(x0 - 6, y + 14, 14, 30);
  // the strut
  const strut = polyPath([[x0, y + 74], [x0 + 6, y + 82], [x0 + 92, y + 16], [x0 + 80, y + 12]]);
  strut(ctx);
  ctx.fillStyle = '#6a4a2c';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  const bp = polyPath([[x0 - 6, y - 8], [x1, y - 6], [x1 + 8, y], [x1, y + 10], [x0 - 6, y + 12]]);
  bp(ctx);
  const g = ctx.createLinearGradient(0, y - 8, 0, y + 12);
  g.addColorStop(0, '#c89c68');
  g.addColorStop(0.4, '#8a6238');
  g.addColorStop(1, '#4a3018');
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, bp, () => {
    ctx.strokeStyle = rgba('#2a180a', 0.35);
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x0, y - 4 + k * 4);
      ctx.lineTo(x1, y - 3 + k * 4 + Math.sin(k) * 1.5);
      ctx.stroke();
    }
  });
  bp(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // iron straps and the rings the chains hang from
  for (const x of [x0 + 8, 250, 334]) {
    ctx.fillStyle = '#2a2a34';
    ctx.fillRect(x - 3, y - 8, 6, 20);
    ctx.fillStyle = rgba('#d8dce8', 0.5);
    ctx.fillRect(x - 3, y - 8, 1.5, 20);
  }
  for (const x of [250, 334]) {
    ctx.strokeStyle = '#2a2a34';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x, y + 15, 4, 0, P2);
    ctx.stroke();
  }
}

/** The horn's curve: mouthpiece (t 0) to bell (t 1), and its radius. */
const HC: Pt[] = [[214, 458], [282, 500], [372, 436]];
function hornAt(t: number): [number, number, number] {
  const u = 1 - t;
  return [u * u * HC[0][0] + 2 * u * t * HC[1][0] + t * t * HC[2][0], u * u * HC[0][1] + 2 * u * t * HC[1][1] + t * t * HC[2][1], 4.5 + 22 * t ** 1.9];
}

/** The great horn, hung on two chains: aurochs horn, ivory going to brown at the tip, bound with gilt bands cut with
 * runes, a gold bell rim, lit from the upper left. */
function horn(ctx: Ctx): void {
  // the chains, from the beam's rings to the bands
  const [ax, ay, ar] = hornAt(0.3);
  const [bx, by, br] = hornAt(0.8);
  hang(ctx, 250, BF.beam.y + 18, ax, ay - ar + 1, 2, '#6a6a78', 2.6, true);
  hang(ctx, 334, BF.beam.y + 18, bx, by - br + 2, 2, '#6a6a78', 2.6, true);
  // the outline: the tube's silhouette as a union of discs, inked
  const N = 90;
  ctx.fillStyle = INK;
  for (let i = 0; i <= N; i++) {
    const [x, y, rr] = hornAt(i / N);
    ctx.beginPath();
    ctx.arc(x, y, rr + 2.2, 0, P2);
    ctx.fill();
  }
  // the body: each cross-section painted lit on its upper left, shaded below, ivory to tip-brown
  for (let i = 0; i <= N * 2; i++) {
    const t = i / (N * 2);
    const [x, y, rr] = hornAt(t);
    const [x1, y1] = hornAt(Math.min(1, t + 0.01));
    const ang = Math.atan2(y1 - y, x1 - x);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const base = mix('#6a4a2c', '#eadcbc', ease(clamp01(t * 1.6)));
    const g = ctx.createLinearGradient(x - nx * rr, y - ny * rr, x + nx * rr, y + ny * rr);
    g.addColorStop(0, shade(base, 0.25));
    g.addColorStop(0.3, base);
    g.addColorStop(0.75, shade(base, -0.3));
    g.addColorStop(1, mix(shade(base, -0.5), '#3a3a6a', 0.3));
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x - nx * rr, y - ny * rr);
    ctx.lineTo(x + nx * rr, y + ny * rr);
    ctx.stroke();
    // growth rings in the horn
    if (i % 9 === 0 && t > 0.05 && t < 0.95) {
      ctx.strokeStyle = rgba('#5a4028', 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - nx * rr * 0.95, y - ny * rr * 0.95);
      ctx.quadraticCurveTo(x + Math.cos(ang) * 2, y + Math.sin(ang) * 2, x + nx * rr * 0.95, y + ny * rr * 0.95);
      ctx.stroke();
    }
  }
  // the sun's sheen along its top
  ctx.strokeStyle = rgba('#fffaf0', 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 4; i <= N - 6; i++) {
    const t = i / N;
    const [x, y, rr] = hornAt(t);
    const [x1, y1] = hornAt(t + 0.01);
    const ang = Math.atan2(y1 - y, x1 - x);
    const px = x + Math.sin(ang) * rr * 0.55;
    const py = y - Math.cos(ang) * rr * 0.55;
    if (i === 4) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // the gilt bands, cut with runes
  for (const t of [0.12, 0.3, 0.55, 0.8]) {
    const [x, y, rr] = hornAt(t);
    const [x1, y1] = hornAt(t + 0.01);
    const ang = Math.atan2(y1 - y, x1 - x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const bw = 5 + rr * 0.35;
    const g = ctx.createLinearGradient(0, -rr, 0, rr);
    g.addColorStop(0, GOLD.lit);
    g.addColorStop(0.35, GOLD.body);
    g.addColorStop(1, GOLD.deep);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw / 2 + 1, rr + 1.5, 0, 0, P2);
    ctx.fill();
    ctx.fillRect(-bw / 2, -rr - 1.5, bw, rr * 2 + 3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-bw / 2, -rr - 1.5, bw, rr * 2 + 3);
    ctx.strokeStyle = rgba(GOLD.deep, 0.8);
    ctx.lineWidth = 1;
    for (let k = -rr + 3; k < rr - 2; k += 5) {
      ctx.beginPath();
      ctx.moveTo(-bw / 4, k);
      ctx.lineTo(bw / 4, k + 2.5);
      ctx.stroke();
    }
    ctx.restore();
  }
  // the bell: a gold rim, the dark throat
  const [x, y, rr] = hornAt(1);
  const [x0, y0] = hornAt(0.98);
  const ang = Math.atan2(y - y0, x - x0);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(0, 0, rr * 0.42 + 2.5, rr + 4, 0, 0, P2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -rr, 0, rr);
  g.addColorStop(0, GOLD.lit);
  g.addColorStop(0.5, GOLD.body);
  g.addColorStop(1, GOLD.shade);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, rr * 0.42, rr + 2, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.ellipse(1.5, 1, rr * 0.28, rr * 0.8, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba('#8a5a2a', 0.6);
  ctx.beginPath();
  ctx.ellipse(1, -rr * 0.3, rr * 0.18, rr * 0.36, 0, 0, P2);
  ctx.fill();
  ctx.restore();
  // the mouthpiece's gold cap
  const [mx, my, mr] = hornAt(0);
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  ctx.arc(mx - 1, my - 1, mr + 2.5, 0, P2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = rgba(GOLD.lit, 0.9);
  ctx.beginPath();
  ctx.arc(mx - 2, my - 2.5, 2, 0, P2);
  ctx.fill();
}

// ——— the abutment ———

function abutment(ctx: Ctx, r: R): void {
  const { x0, x1, top } = BF.abut;
  const endW = 18;
  // the top: a dressed walkway sloping a little up to where the light begins
  const topP = polyPath([[x0, top + 2], [x1 - 6, top - 8], [x1 + endW - 6, top - 4], [x0 + 20, top + 10]]);
  const front = polyPath([[x0, top + 2], [x0 + 20, top + 10], [x1 + endW - 6, top - 4], [x1 + endW - 6, PAR + 2], [x0, PAR + 2]]);
  castShadow(ctx, front, 14, 20, 0.25, '#14204a');
  front(ctx);
  ctx.fillStyle = DAY.body;
  ctx.fill();
  within(ctx, front, () => {
    ashlar(ctx, r, { x: x0, y: top - 10, w: x1 + endW - x0, h: PAR - top + 14 }, ['#aaa6b6', '#9e9aae', '#b2acba', '#9692a8'], '#58546c', { rowH: 30, minW: 50, maxW: 110, weather: 0.6, moss: '#8a9a6a', mossA: 0.35, seed: 31 });
    const lg = ctx.createLinearGradient(x0, top, x1, PAR);
    lg.addColorStop(0, 'rgba(255,236,200,0.14)');
    lg.addColorStop(1, 'rgba(30,24,64,0.3)');
    ctx.fillStyle = lg;
    ctx.fillRect(x0, top - 10, x1 + endW - x0, PAR - top + 14);
    // its end face, turned from the sun: the bridge's colours bounced up into it
    ctx.fillStyle = 'rgba(36,34,80,0.55)';
    ctx.fillRect(x1 - 8, top - 10, endW + 4, PAR - top + 14);
    const bg = ctx.createLinearGradient(0, top, 0, top + 90);
    bg.addColorStop(0, 'rgba(255,210,150,0.3)');
    bg.addColorStop(0.5, 'rgba(160,120,255,0.12)');
    bg.addColorStop(1, 'rgba(160,120,255,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(x1 - 8, top - 10, endW + 4, 100);
    // a rune frieze along its face
    ctx.fillStyle = 'rgba(20,16,40,0.3)';
    ctx.fillRect(x0, top + 30, x1 - 8 - x0, 32);
    ctx.fillStyle = rgba('#fff2dc', 0.35);
    ctx.fillRect(x0, top + 61, x1 - 8 - x0, 2);
    for (let x = x0 + 14, i = 0; x < x1 - 24; x += 22, i++) carvedRune(ctx, i * 7 + 2, x, top + 34, 24, 0.4);
    for (let k = 0; k < 6; k++) streaks(ctx, r, x0 + r() * (x1 - x0 - 40), top + 64, 30, 30 + r() * 40, '#1a1428', 0.2, 3);
    vfill(ctx, x0, PAR - 60, x1 + endW - x0, 62, [[0, 'rgba(20,16,40,0)'], [0.6, 'rgba(20,16,40,0.25)'], [1, 'rgba(12,10,28,0.6)']]);
  });
  front(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // the walkway's top, lit, a gilt sill where the bridge's light begins
  topP(ctx);
  const tg = ctx.createLinearGradient(x0, 0, x1, 0);
  tg.addColorStop(0, '#d4d0d8');
  tg.addColorStop(1, '#f4ecdc');
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  const sill = polyPath([[x1 - 14, top - 7], [x1 + endW - 6, top - 4], [x1 + endW - 6, top + 4], [x1 - 14, top + 2]]);
  sill(ctx);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ctx.fillStyle = rgba(GOLD.lit, 0.9);
  ctx.fillRect(x1 - 14, top - 7, endW + 8, 2);
  sill(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  bridgeHead(ctx, r);
}

/** The bridge-head: a block of the rune-cut stone on the abutment's end, the bridge springing out of a lit, gilt-lined
 * notch in its end face. */
function bridgeHead(ctx: Ctx, r: R): void {
  const { x0, x1, top } = BF.head;
  const base = BF.abut.top - 4;
  const endW = 16;
  const front = polyPath([[x0, top + 8], [x1, top], [x1, base], [x0, base + 4]]);
  const end = polyPath([[x1, top], [x1 + endW, top + 4], [x1 + endW, base + 2], [x1, base]]);
  const topP = polyPath([[x0, top + 8], [x0 + 12, top + 2], [x1 + endW - 2, top + 3], [x1, top]]);
  castShadow(ctx, front, 10, 14, 0.3, '#14204a');
  front(ctx);
  ctx.fillStyle = '#a6a2b4';
  ctx.fill();
  within(ctx, front, () => {
    const box = { x: x0, y: top, w: x1 - x0, h: base - top + 6 };
    ashlar(ctx, r, box, ['#b4b0bc', '#a8a4b4', '#bab4c2'], '#5c586e', { rowH: 30, minW: 40, maxW: 70, weather: 0.5, seed: 41 });
    const lg = ctx.createLinearGradient(x0, top, x1, base);
    lg.addColorStop(0, 'rgba(255,236,200,0.16)');
    lg.addColorStop(1, 'rgba(30,24,64,0.28)');
    ctx.fillStyle = lg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    // one big rune cut in its face, its inlay alight
    carvedRune(ctx, 4, x0 + 24, top + 22, 34, 0.7);
    vfill(ctx, x0, base - 20, x1 - x0, 24, [[0, 'rgba(14,10,30,0)'], [1, 'rgba(14,10,30,0.4)']]);
  });
  front(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // the end face: in shade, washed with the bridge's colours; the notch the light pours out of
  end(ctx);
  const eg = ctx.createLinearGradient(0, top, 0, base);
  eg.addColorStop(0, '#5a5478');
  eg.addColorStop(1, '#3a3458');
  ctx.fillStyle = eg;
  ctx.fill();
  within(ctx, end, () => {
    const d0 = deckTop(0) - 3;
    const d1 = deckBot(0) + fasciaH(0) * 0.6;
    for (let i = 0; i < SPEC.length; i++) {
      ctx.fillStyle = rgba(SPEC[i], 0.35);
      ctx.fillRect(x1, lerp(d0, d1, i / SPEC.length), endW + 2, (d1 - d0) / SPEC.length + 1);
    }
    ctx.fillStyle = rgba('#fff8e8', 0.55);
    ctx.fillRect(x1, d0 + (d1 - d0) * 0.35, endW + 2, (d1 - d0) * 0.2);
    // gilt lining the notch
    ctx.fillStyle = GOLD.lit;
    ctx.fillRect(x1, d0 - 4, endW + 2, 3);
    ctx.fillStyle = GOLD.shade;
    ctx.fillRect(x1, d1 + 1, endW + 2, 3);
  });
  end(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  topP(ctx);
  ctx.fillStyle = '#e8e2e4';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // a gilt cap band along its top
  ctx.fillStyle = GOLD.body;
  ctx.fillRect(x0, top + 9, x1 - x0, 4);
  ctx.fillStyle = rgba(GOLD.lit, 0.9);
  ctx.fillRect(x0, top + 9, x1 - x0, 1.3);
  // the bridge's light washing up its front edge and the walkway beside it
  ctx.fillStyle = 'rgba(255,236,200,0.3)';
  ctx.fillRect(x1 - 5, top + 2, 5, base - top - 4);
}

// ——— the rune stone and its fire basket ———

const STONE_PTS: Pt[] = [[BF.stone.x0, PAR + 2], [BF.stone.x0 + 4, 560], [BF.stone.x0 - 2, 500], [BF.stone.x0 + 6, 462], [BF.stone.x0 + 22, BF.stone.top + 4], [1790, BF.stone.top - 4], [1846, BF.stone.top], [BF.stone.x1 - 4, 470], [BF.stone.x1 + 4, 540], [BF.stone.x1, PAR + 2]];

function runeStone(ctx: Ctx, r: R): void {
  const path = polyPath(STONE_PTS);
  const { x0, x1, top } = BF.stone;
  const side = 30;
  const xa = x1 - side;
  castShadow(ctx, path, 16, 22, 0.28, '#14204a');
  path(ctx);
  ctx.fillStyle = DAY.body;
  ctx.fill();
  within(ctx, path, () => {
    const box = { x: x0 - 10, y: top - 10, w: x1 - x0 + 20, h: PAR - top + 14 };
    const fg = ctx.createLinearGradient(x0, top, xa, PAR);
    fg.addColorStop(0, '#c2bec8');
    fg.addColorStop(0.5, '#948fa4');
    fg.addColorStop(1, '#646078');
    ctx.fillStyle = fg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    surface(ctx, r, box, '#948fa4', { over: true, vary: 0.45, cells: 4, mottle: 0.45, strokes: 0.6, strokeAng: Math.PI / 2 + 0.2, strokeLen: 80, strokeW: 4, grain: 0.22, grainKind: 'speckle', seed: 51 });
    // the chisel's scallops
    for (let y = top + 10; y < PAR; y += 20 + r() * 14) {
      for (let x = x0 + r() * 20 - 14; x < xa; x += 26 + r() * 24) {
        const w = 22 + r() * 24;
        ctx.strokeStyle = rgba('#1a1630', 0.14);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + w / 2, y - w * 0.6, w * 0.7, Math.PI * 0.3, Math.PI * 0.7);
        ctx.stroke();
        ctx.strokeStyle = rgba('#fff4e4', 0.14);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + w / 2, y - w * 0.6 + 2, w * 0.7, Math.PI * 0.3, Math.PI * 0.7);
        ctx.stroke();
      }
    }
    // lichen low and in the lee
    for (let i = 0; i < 26; i++) {
      // a crust of lichen: a rosette, its lobes paler at the rim, darker in the middle
      const lx = x0 + r() * (x1 - x0 - 30);
      const ly = top + 140 + r() ** 0.7 * (PAR - top - 150);
      const lr = 2 + r() * 4;
      const col = r() < 0.6 ? '#a8b088' : '#c0aa78';
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * P2 + r();
        ctx.fillStyle = rgba(col, 0.3);
        ctx.beginPath();
        ctx.arc(lx + Math.cos(a) * lr * 0.6, ly + Math.sin(a) * lr * 0.45, lr * 0.45, 0, P2);
        ctx.fill();
      }
      ctx.fillStyle = rgba(shade(col, -0.3), 0.3);
      ctx.beginPath();
      ctx.arc(lx, ly, lr * 0.35, 0, P2);
      ctx.fill();
    }
    // the runes, in a recessed panel down its face
    const px = x0 + 26;
    const pw = 52;
    ctx.fillStyle = 'rgba(30,26,54,0.3)';
    ctx.fillRect(px, top + 50, pw, 200);
    ctx.fillStyle = 'rgba(14,12,30,0.55)';
    ctx.fillRect(px, top + 50, pw, 3);
    ctx.fillRect(px, top + 50, 3, 200);
    ctx.fillStyle = rgba('#fff2dc', 0.4);
    ctx.fillRect(px, top + 248, pw, 2);
    ctx.fillRect(px + pw - 2, top + 50, 2, 200);
    for (let i = 0; i < 6; i++) carvedRune(ctx, [1, 5, 3, 8, 0, 6][i], px + 15, top + 58 + i * 31, 28, 0.45);
    for (let i = 0; i < 3; i++) crack(ctx, r, x0 + 20 + r() * 80, top + 40 + r() * 180, Math.PI / 2 + (r() - 0.5), 30 + r() * 60, { col: '#120e20', lip: '#efe8ee', w: 1.4, a: 0.6, branch: 0.3 });
    // the side face, in shade
    const sg = ctx.createLinearGradient(xa, 0, x1 + 6, 0);
    sg.addColorStop(0, '#3e3c5a');
    sg.addColorStop(1, '#24223e');
    ctx.fillStyle = sg;
    ctx.fillRect(xa, top - 10, x1 + 10 - xa, PAR - top + 14);
    lay(ctx, noiseMask(6, 57, { cover: 0.3, soft: 0.3, col: '#5a5878', w: 32, h: 160 }), { x: xa, y: top, w: side + 10, h: PAR - top }, 0.3);
    ctx.strokeStyle = rgba('#f4eee6', 0.55);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(xa, top);
    ctx.lineTo(xa, PAR);
    ctx.stroke();
    // the iron strap round it, carrying the banner's arm
    ctx.fillStyle = '#2c2c38';
    ctx.fillRect(x0 - 6, BF.banner.y - 12, x1 - x0 + 12, 12);
    ctx.fillStyle = rgba('#d8dce8', 0.45);
    ctx.fillRect(x0 - 6, BF.banner.y - 12, xa - x0, 2);
    for (let x = x0 + 8; x < x1; x += 24) {
      ctx.fillStyle = '#16161e';
      ctx.beginPath();
      ctx.arc(x, BF.banner.y - 6, 2.2, 0, P2);
      ctx.fill();
    }
    vfill(ctx, box.x, PAR - 80, box.w, 82, [[0, 'rgba(20,16,40,0)'], [0.6, 'rgba(20,16,40,0.25)'], [1, 'rgba(12,10,28,0.6)']]);
  });
  path(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // the banner's arm, out to the left
  const ay = BF.banner.y - 8;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x0, ay);
  ctx.lineTo(BF.banner.x - 6, ay);
  ctx.stroke();
  ctx.strokeStyle = '#3a3a48';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.strokeStyle = rgba('#e0e4f0', 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, ay - 1.2);
  ctx.lineTo(BF.banner.x - 6, ay - 1.2);
  ctx.stroke();
  ctx.fillStyle = '#3a3a48';
  ctx.beginPath();
  ctx.arc(BF.banner.x - 6, ay, 4, 0, P2);
  ctx.fill();
  basket(ctx);
}

/** The iron fire basket on the stone's top: three legs, a bowl of bars with last night's charcoal in it. */
function basket(ctx: Ctx): void {
  const { x, y } = BF.basket;
  const top = BF.stone.top;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  for (const dx of [-30, 0, 28]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * 0.7, y + 14);
    ctx.lineTo(x + dx, top + 2);
    ctx.stroke();
  }
  ctx.strokeStyle = '#3a3a46';
  ctx.lineWidth = 3;
  for (const dx of [-30, 0, 28]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * 0.7, y + 14);
    ctx.lineTo(x + dx, top + 2);
    ctx.stroke();
  }
  // contact shadows on the stone's top
  ctx.fillStyle = 'rgba(20,16,40,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 6, top + 4, 40, 4, 0, 0, P2);
  ctx.fill();
  // the bowl
  const bowl = polyPath([[x - 40, y - 12], [x + 40, y - 12], [x + 30, y + 10], [x + 16, y + 18], [x - 16, y + 18], [x - 30, y + 10]]);
  bowl(ctx);
  ctx.fillStyle = '#1e1a20';
  ctx.fill();
  // charcoal heaped in it
  ctx.fillStyle = '#2a2428';
  ctx.beginPath();
  ctx.ellipse(x, y - 12, 38, 7, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = rgba('#8a8088', 0.5);
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(x - 28 + i * 7, y - 14 - Math.sin(i) * 3, 2.2, 0, P2);
    ctx.fill();
  }
  // the bars
  within(ctx, bowl, () => {
    ctx.fillStyle = '#3a3a48';
    for (let k = -36; k <= 36; k += 9) ctx.fillRect(x + k - 1.8, y - 12, 3.6, 32);
    ctx.fillStyle = rgba('#d8dce8', 0.35);
    for (let k = -36; k <= 36; k += 9) ctx.fillRect(x + k - 1.8, y - 12, 1.2, 32);
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(x - 40, y - 2, 80, 4);
  });
  bowl(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.fillStyle = '#4a4a58';
  ctx.fillRect(x - 42, y - 15, 84, 5);
  ctx.fillStyle = rgba('#e0e4f0', 0.5);
  ctx.fillRect(x - 42, y - 15, 84, 1.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(x - 42, y - 15, 84, 5);
}

// ——— the banner and the pennant (frames) ———

/** The banner's cloth, flat: deep blue, a gilt border, the guardian's horn and a rune in gold. */
function bannerCloth(c: Ctx, w: number, h: number): void {
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#2a3e8a');
  g.addColorStop(1, '#1a2a66');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = GOLD.body;
  c.lineWidth = 4;
  c.strokeRect(5, 4, w - 10, h - 4);
  c.strokeStyle = '#b02a2a';
  c.lineWidth = 2;
  c.strokeRect(10, 9, w - 20, h - 14);
  // the horn
  c.strokeStyle = '#f4d890';
  c.lineCap = 'round';
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(w * 0.24, h * 0.24);
  c.quadraticCurveTo(w * 0.46, h * 0.42, w * 0.78, h * 0.22);
  c.stroke();
  c.fillStyle = '#f4d890';
  c.beginPath();
  c.ellipse(w * 0.78, h * 0.21, 4, 9, -0.5, 0, P2);
  c.fill();
  // a rune under it (algiz, the guardian's)
  c.strokeStyle = '#f4d890';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(w / 2, h * 0.42);
  c.lineTo(w / 2, h * 0.72);
  c.moveTo(w / 2, h * 0.52);
  c.lineTo(w * 0.3, h * 0.42);
  c.moveTo(w / 2, h * 0.52);
  c.lineTo(w * 0.7, h * 0.42);
  c.stroke();
}
const BNF = { w: BF.banner.w + 20, h: BF.banner.h + 10, n: 8 };
function bannerFrame(c: Ctx, ph: number, gust = 1): void {
  c.translate(10, 2);
  clothFrame(c, 0, 0, BF.banner.w, BF.banner.h, ph, bannerCloth, { amp: 5 * gust, waves: 1.2, tail: 'swallow', light: '#fff0d8', dark: '#0a0818' });
  // the rod across its top
  c.fillStyle = '#3a3a48';
  c.fillRect(-6, -2, BF.banner.w + 12, 5);
  c.fillStyle = rgba('#e0e4f0', 0.5);
  c.fillRect(-6, -2, BF.banner.w + 12, 1.4);
}

/** The pennant on the tower's finial: a long red tongue with a gilt border, streaming out on the wind. */
const PEN = { w: 280, h: 96, root: 40, n: 12 };
/** The pennant's root on the finial pole (kept clear of the top-left corner's HUD). */
const PEN_Y = BF.tower.peak - 12;
function pennantFrame(out: Ctx, ph: number): void {
  const { w, h, root } = PEN;
  // (painted on its own canvas: the cut back to the cloth below would wipe whatever it's drawn over)
  const [pc, c] = makeCanvas(w, h);
  const L = w - 16;
  const [flat, fc] = makeCanvas(L, root);
  const fg = fc.createLinearGradient(0, 0, 0, root);
  fg.addColorStop(0, '#d03a30');
  fg.addColorStop(1, '#8a1a1e');
  fc.fillStyle = fg;
  fc.fillRect(0, 0, L, root);
  fc.fillStyle = GOLD.body;
  fc.fillRect(0, 0, L, 3);
  fc.fillRect(0, root - 3, L, 3);
  fc.fillStyle = '#f4d890';
  for (let x = 18; x < L - 40; x += 46) {
    fc.beginPath();
    fc.moveTo(x, root / 2);
    fc.lineTo(x + 8, root / 2 - 8);
    fc.lineTo(x + 16, root / 2);
    fc.lineTo(x + 8, root / 2 + 8);
    fc.closePath();
    fc.fill();
  }
  // its shape: a long tongue, cut to a swallowtail at the end
  fc.globalCompositeOperation = 'destination-in';
  fc.beginPath();
  fc.moveTo(0, 0);
  fc.lineTo(L, root * 0.36);
  fc.lineTo(L - 26, root * 0.5);
  fc.lineTo(L, root * 0.64);
  fc.lineTo(0, root);
  fc.closePath();
  fc.fill();
  fc.globalCompositeOperation = 'source-over';
  // drawn in vertical strips, each lifted by a wave travelling out along it (bigger towards the free end) and shaded
  // by its slope
  const y0 = h / 2 - root / 2;
  const off = (u: number) => Math.sin(P2 * (ph * 2 - u * 1.6)) * u ** 1.2 * 18 + Math.sin(P2 * (ph - u * 0.8) + 1) * u * 6 + u * 10;
  // (the folds' light and shade laid on the flat cloth first, column by column, so it bends with it)
  fc.globalCompositeOperation = 'source-atop';
  for (let x = 0; x < L; x += 2) {
    const u = x / L;
    const sl = (off(u + 0.01) - off(u)) / 0.01 / 60;
    fc.fillStyle = sl > 0 ? rgba('#1a0608', Math.min(0.45, sl * 0.5)) : rgba('#fff0d8', Math.min(0.3, -sl * 0.35));
    fc.fillRect(x, 0, 2, root);
  }
  fc.globalCompositeOperation = 'source-over';
  for (let x = 0; x < L; x += 2) {
    const u = x / L;
    const dy = off(u);
    const sl = (off(u + 0.01) - dy) / 0.01 / 60;
    const hh = root * (1 - Math.abs(sl) * 0.08);
    c.drawImage(flat, x, 0, 2, root, 6 + x, y0 + dy + (root - hh) / 2, 2.4, hh);
  }
  // its lashing on the pole
  c.fillStyle = '#3a2618';
  c.fillRect(0, y0 - 4, 7, root + 8);
  out.drawImage(pc, 0, 0);
}

// ——— the parapet ———

function parapet(ctx: Ctx, r: R): void {
  const y0 = PAR;
  const ct = 12;
  // the coping's top, in the sun
  const cg = ctx.createLinearGradient(0, y0, 0, y0 + ct);
  cg.addColorStop(0, '#e4dee0');
  cg.addColorStop(1, '#a8a2b0');
  ctx.fillStyle = cg;
  ctx.fillRect(0, y0, W, ct);
  // its front: dressed stone, coping joints, a carved band
  const box = { x: 0, y: y0 + ct, w: W, h: TY - y0 - ct + 6 };
  vfill(ctx, 0, box.y, W, box.h, [[0, '#7c7890'], [1, '#56526a']]);
  surface(ctx, r, box, '#706c84', { over: true, vary: 0.35, cells: 8, mottle: 0.2, strokes: 0.3, strokeAng: 0, strokeLen: 200, strokeW: 4, grain: 0.25, grainKind: 'speckle', seed: 61 });
  ctx.fillStyle = 'rgba(14,12,30,0.4)';
  ctx.fillRect(0, y0 + ct, W, 4);
  for (let x = 40 + r() * 60; x < W; x += 150 + r() * 90) {
    ctx.fillStyle = 'rgba(14,12,30,0.5)';
    ctx.fillRect(x, y0, 2, TY - y0);
    ctx.fillStyle = rgba('#f4eee8', 0.3);
    ctx.fillRect(x + 2, y0, 1.4, TY - y0);
    chipsAt(ctx, r, x, y0);
  }
  // a band of runes along it, faint
  for (let x = 20; x < W - 20; x += 40) carvedRune(ctx, Math.floor(r() * 10), x, y0 + ct + 10, 22, 0.25, 0.55);
  // lichen along the coping's foot, streaks below
  lay(ctx, noiseMask(30, 63, { cover: 0.2, soft: 0.05, col: '#b8c294', w: 480, h: 16 }), { x: 0, y: y0 + ct, w: W, h: 18 }, 0.3);
  for (let i = 0; i < 24; i++) streaks(ctx, r, r() * W, y0 + ct + 2, 40, 14 + r() * 24, '#1a1428', 0.18, 3);
  ctx.fillStyle = rgba('#fffaf0', 0.55);
  ctx.fillRect(0, y0, W, 1.6);
  ctx.fillStyle = rgba(INK, 0.6);
  ctx.fillRect(0, y0 + ct - 1, W, 1.4);
  // where the tower, the abutment and the rune stone stand behind it: their occlusion along the coping's back edge,
  // their shadows thrown down and right across it
  for (const [x0, x1] of [[0, tR(PAR) + 2], [BF.abut.x0, BF.abut.x1 + 18], [BF.stone.x0, BF.stone.x1 + 4]] as const) {
    ctx.fillStyle = 'rgba(10,8,26,0.55)';
    ctx.fillRect(x0, y0, x1 - x0, 2.5);
    const sg = ctx.createLinearGradient(x1, 0, x1 + 34, 0);
    sg.addColorStop(0, 'rgba(14,12,34,0.35)');
    sg.addColorStop(1, 'rgba(14,12,34,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x1, y0, 34, ct);
  }
}
function chipsAt(ctx: Ctx, r: R, x: number, y: number): void {
  if (r() < 0.5) return;
  const s = 3 + r() * 5;
  ctx.fillStyle = rgba('#4a4660', 0.7);
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s * 1.2);
  ctx.closePath();
  ctx.fill();
}

// ——— the table: the terrace's threshold, dressed stone flags ———

function table(ctx: Ctx, r: R): void {
  const f = BF.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#34323f'], [0.45, '#403c4c'], [1, '#484454']]);
  surface(ctx, r, box, '#3e3a4a', { over: true, vary: 0.25, cells: 5, mottle: 0.1, strokes: 0.25, strokeAng: 0, strokeLen: 300, strokeW: 4, grain: 0.14, grainKind: 'speckle', seed: 71 });
  grain(ctx, box, 'speckle', 0.16, 1.2);
  // the flags, each its own stone, laid in courses in perspective
  const zf = zFront(f);
  const ZB = 1210 / (TY - 300);
  const rows: number[] = [];
  for (let z = ZB; z > zf; z -= 0.34 * (z / ZB) + 0.05) rows.push(z);
  rows.push(zf);
  for (let j = 0; j < rows.length - 1; j++) {
    const z0 = rows[j];
    const z1 = rows[j + 1];
    const off = j % 2 ? 0.55 : 0;
    for (let X = -3.2 + off; X < 3.2; X += 1.1) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#787488' : '#3e3a50', 0.08 + r() * 0.1);
      ctx.beginPath();
      ctx.moveTo(xAt(X, z0), yAt(z0));
      ctx.lineTo(xAt(X + 1.1, z0), yAt(z0));
      ctx.lineTo(xAt(X + 1.1, z1), yAt(z1));
      ctx.lineTo(xAt(X, z1), yAt(z1));
      ctx.closePath();
      ctx.fill();
      // the joint along its left edge
      ctx.strokeStyle = rgba('#12101e', 0.4);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xAt(X, z0), yAt(z0));
      ctx.lineTo(xAt(X, z1), yAt(z1));
      ctx.stroke();
    }
    const y = yAt(z1);
    ctx.fillStyle = rgba('#12101e', 0.45);
    ctx.fillRect(0, y - 1, W, 2);
    ctx.fillStyle = rgba('#e4dee8', 0.16);
    ctx.fillRect(0, y + 1, W, 1.2);
  }
  // worn smooth along the middle where feet have crossed it, the sun's sheen on the polish from the left
  lightPool(ctx, 420, TY + 110, 820, 140, '#fff0d8', 0.07);
  // worn: the flags' arrises chipped and rounded along the joints, pale where they're knocked
  for (let i = 0; i < 70; i++) {
    const j = Math.floor(r() * (rows.length - 1));
    const z = rows[j + 1];
    const X = -3 + r() * 6;
    const x = xAt(X, z);
    const y = yAt(z);
    const sc = (1210 / z) / 460;
    const w = (6 + r() * 16) * sc;
    ctx.fillStyle = rgba('#8a8698', 0.35);
    ctx.beginPath();
    ctx.ellipse(x, y + 1.5 * sc, w, 2 * sc, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#0e0c1a', 0.3);
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y - 1 * sc, w * 0.7, 1.2 * sc, 0, 0, P2);
    ctx.fill();
  }
  // the sun's light across it from the back left, falling off towards the front right
  const lg = ctx.createLinearGradient(0, TY, W * 0.7, f + 200);
  lg.addColorStop(0, 'rgba(255,236,206,0.1)');
  lg.addColorStop(0.5, 'rgba(255,236,206,0)');
  lg.addColorStop(1, 'rgba(8,6,24,0.22)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, TY, W, f - TY);
  ctx.restore();
  tableFalloff(ctx, f, 0.32, '#0e0c22');
  tableSeam(ctx, 0.45, '#16142c', false);
  crevice(ctx, 0, W, TY, 16, 0.55, '#0c0a1c');
  // the front: a frieze of runes over a gilt bronze edge
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#4a4660'], [0.4, '#363248'], [1, '#1c1a2e']]);
  surface(ctx, r, { x: 0, y: f, w: W, h: 40 }, '#3a3650', { over: true, vary: 0.3, cells: 8, grain: 0.35, grainKind: 'stone', seed: 77 });
  for (let x = 24, i = 0; x < W - 10; x += 32, i++) carvedRune(ctx, i * 7 + (i % 3), x, f + 9, 24, 0.4);
  ctx.restore();
  ctx.fillStyle = GOLD.body;
  ctx.fillRect(0, f - 3, W, 4);
  ctx.fillStyle = rgba(GOLD.lit, 0.85);
  ctx.fillRect(0, f - 3, W, 1.2);
  ctx.fillStyle = rgba('#0a0814', 0.85);
  ctx.fillRect(0, f + 1, W, 1.6);
}

// ——— the grade and the shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.03, '#fff0dc', 0.04, { warm: '#ffe2b0', cool: '#4a68c0', a: 0.18 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.1, '#0a1440', 70, 640);
  vignetteAll(ctx, 0.42, '#060c24');
}

// ——— frames for the live layer ———

/** A column of smoke off the burning world's rim (phase ph loops), in a w×h frame, its source at the bottom middle:
 * soft billows born small, swelling as they climb and lean off on the wind, lit red-orange from beneath by the fire,
 * their tops in the storm's grey. */
function smokeBillows(c: Ctx, w: number, h: number, ph: number): void {
  const N = 18;
  for (let i = 0; i < N; i++) {
    const q = (ph + i / N) % 1;
    const rr = rng(hashStr('bf:billow' + i));
    const y = h - 16 - q * (h - 70);
    const x = w / 2 + q * q * w * 0.22 + Math.sin(q * 5 + i * 1.7) * w * 0.035 * (0.4 + q);
    const rad = w * (0.07 + 0.26 * q) * (0.85 + rr() * 0.3);
    const a = Math.min(1, q * 7) * (1 - q) ** 1.3 * 0.6;
    if (a < 0.01) continue;
    const body = c.createRadialGradient(x, y - rad * 0.15, 0, x, y, rad);
    body.addColorStop(0, `rgba(58,44,52,${a.toFixed(3)})`);
    body.addColorStop(0.6, `rgba(48,36,46,${(a * 0.7).toFixed(3)})`);
    body.addColorStop(1, 'rgba(40,30,40,0)');
    c.fillStyle = body;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    // the fire's light on its underside, strongest low down
    const ug = c.createRadialGradient(x, y + rad * 0.45, 0, x, y + rad * 0.45, rad * 0.75);
    const ua = a * 0.8 * (1 - q) ** 1.5;
    ug.addColorStop(0, `rgba(255,120,50,${ua.toFixed(3)})`);
    ug.addColorStop(1, 'rgba(255,120,50,0)');
    c.fillStyle = ug;
    c.fillRect(x - rad, y - rad * 0.3, rad * 2, rad * 1.6);
  }
}

/** A stretch of the fire along the world's rim (phase ph loops): a row of flame tongues licking up off the horizon,
 * each on its own beat. w×h, its base along the bottom. */
function fireLine(c: Ctx, w: number, h: number, ph: number, seed: number): void {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const rr = rng(hashStr('bf:fline' + seed + ':' + i));
    const x = ((i + 0.5 + (rr() - 0.5) * 0.4) / n) * w;
    const fh = h * (0.45 + rr() * 0.5);
    fireFrame(c, x, h - 1, (w / n) * 1.5, fh, (ph + rr()) % 1, { tongues: 3, seed: i + seed * 7, cols: ['#ff3a10', '#ff8a20', '#ffe08a'] });
  }
}

const BOLT = { w: 220, h: 420, n: 4 };
/** A lightning bolt (frame i): a jagged main channel from the cloud base to the sea, forks off it, a violet glow. */
function boltFrame(c: Ctx, i: number): void {
  const rr = rng(hashStr('bf:bolt' + i));
  const pts: Pt[] = [[BOLT.w / 2 + (rr() - 0.5) * 30, 0]];
  const n = 18;
  for (let k = 1; k <= n; k++) {
    const [px] = pts[k - 1];
    pts.push([px + (rr() - 0.5) * 34 + (k > n * 0.5 ? (rr() - 0.5) * 10 : 0), (k / n) * BOLT.h]);
  }
  const forks: Pt[][] = [];
  for (let f = 0; f < 3; f++) {
    const at = 3 + Math.floor(rr() * 9);
    const dir = rr() < 0.5 ? -1 : 1;
    const fp: Pt[] = [pts[at]];
    for (let k = 1; k < 6 + rr() * 5; k++) {
      const [px, py] = fp[k - 1];
      fp.push([px + dir * (8 + rr() * 16), py + 10 + rr() * 18]);
    }
    forks.push(fp);
  }
  const stroke = (p: Pt[], w: number, col: string) => {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    p.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  };
  c.globalCompositeOperation = 'lighter';
  c.lineJoin = 'miter';
  for (const [w, col] of [[18, 'rgba(150,120,255,0.12)'], [8, 'rgba(190,170,255,0.3)'], [3.2, 'rgba(230,224,255,0.85)'], [1.4, 'rgba(255,255,255,1)']] as const) {
    stroke(pts, w, col);
    for (const fp of forks) stroke(fp, w * 0.55, col);
  }
}

/** A rain tile: thin streaks slanting with the wind. */
function rainTile(c: Ctx, s: number): void {
  const rr = rng(hashStr('bf:rain'));
  c.lineCap = 'round';
  for (let i = 0; i < 140; i++) {
    const x = rr() * s;
    const y = rr() * s;
    const len = 14 + rr() * 26;
    for (const ox of [0, -s, s]) {
      for (const oy of [0, -s, s]) {
        c.strokeStyle = `rgba(210,220,240,${(0.2 + rr() * 0.35).toFixed(3)})`;
        c.lineWidth = 1 + rr() * 0.6;
        c.beginPath();
        c.moveTo(x + ox, y + oy);
        c.lineTo(x + ox + len * 0.22, y + oy + len);
        c.stroke();
      }
    }
  }
}

// ——— the stack ———
//
// The live sky (the veil, the storm, the fire's light, the storm scud and the lightning) ends at the horizon; the sea
// below it stays in the base. The cloud sea is a slot between the citadel and the bridge (the clouds pass in front of
// the crag's foot and under the bridge). Everything standing behind the parapet is cut at its top, so the parapet and
// the table stay in the base.

const SKY_BOX = { x: 0, y: 0, w: W, h: HOR };
const BRIDGE_BOX = { x: 396, y: 360, w: 940, h: 304 };
const LIGHT_BOX = { x: 360, y: 330, w: 1080, h: PAR - 330 };
const TOWER_BOX = { x: 0, y: 0, w: 252, h: PAR };
const BEAM_BOX = { x: 186, y: BF.beam.y - 14, w: 186, h: 100 };
const HORN_BOX = { x: 196, y: BF.beam.y + 6, w: 214, h: 128 };
const ABUT_BOX = { x: 170, y: BF.head.top - 30, w: 320, h: PAR - BF.head.top + 30 };
const STONE_BOX = { x: BF.banner.x - 20, y: BF.basket.y - 30, w: W - BF.banner.x + 20, h: PAR - BF.basket.y + 30 };
const parCut = (draw: (c: Ctx, r: R) => void) => (c: Ctx, r: R) => {
  c.beginPath();
  c.rect(0, -40, W, PAR + 40);
  c.clip();
  draw(c, r);
};

export const BIFROST: SceneSpec = {
  id: 'bifrost',
  info: {
    name: 'Bifröst Bridge',
    subtitle: 'Waves 76–79',
    ambient: [],
    // (the bridge's light, the weather and the fire are the live layer's)
    glows: [],
    light: '#fff2dc',
    tableTint: '#fff8f0',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: HOR + 4 }, draw: sky },
    { id: 'hazeSky', box: SKY_BOX, liveOnly: true, res: 0.25, draw: hazeSky },
    { id: 'stormSky', box: SKY_BOX, liveOnly: true, res: 0.25, draw: stormSky },
    { id: 'fireSky', box: SKY_BOX, liveOnly: true, res: 0.25, draw: (c) => fireSky(c) },
    { id: 'skyLive', box: SKY_BOX, motion: 'slot', draw: () => {} },
    { id: 'sea', box: { x: 0, y: HOR, w: W, h: PAR - HOR }, draw: sea },
    { id: 'seaStorm', box: { x: 0, y: HOR, w: W, h: PAR - HOR }, liveOnly: true, res: 0.25, draw: (c) => seaStorm(c) },
    { id: 'seaFire', box: { x: 0, y: HOR, w: W, h: 150 }, liveOnly: true, res: 0.25, draw: seaFire },
    { id: 'citadel', box: CIT_BOX, draw: citadel },
    // (the citadel under the storm: the same painting, gone dark and cold, faded in over it)
    { id: 'citadelStorm', box: CIT_BOX, liveOnly: true, res: 0.35, draw: (c) => {
      citadel(c, rng(hashStr('scene:bifrost:citadel')));
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(52,58,84,0.72)';
      c.fillRect(CIT_BOX.x, CIT_BOX.y, CIT_BOX.w, CIT_BOX.h);
    } },
    { id: 'cloudSea', box: { x: 0, y: HOR - 40, w: W, h: PAR - HOR + 40 }, motion: 'slot', draw: () => {} },
    { id: 'cloudSeaStill', box: { x: 0, y: HOR - 40, w: W, h: PAR - HOR + 40 }, stillOnly: true, draw: (c) => cloudSea(c) },
    { id: 'bridge', box: BRIDGE_BOX, draw: (c) => bridge(c) },
    { id: 'bridgeDark', box: BRIDGE_BOX, liveOnly: true, res: 0.35, draw: (c) => {
      bridge(c);
      c.globalCompositeOperation = 'source-atop';
      const g = c.createLinearGradient(BRIDGE_BOX.x, 0, BRIDGE_BOX.x + BRIDGE_BOX.w, 0);
      g.addColorStop(0, 'rgba(30,22,40,0.8)');
      g.addColorStop(0.6, 'rgba(40,24,30,0.6)');
      g.addColorStop(1, 'rgba(60,24,16,0.4)');
      c.fillStyle = g;
      c.fillRect(BRIDGE_BOX.x, BRIDGE_BOX.y, BRIDGE_BOX.w, BRIDGE_BOX.h);
    } },
    { id: 'bridgeLive', box: BRIDGE_BOX, motion: 'slot', draw: () => {} },
    { id: 'shimmerStill', box: BRIDGE_BOX, stillOnly: true, draw: (c) => {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.6;
      c.translate(DECK_BOX.x, DECK_BOX.y);
      causticFrame(c, 0.2, 1);
    } },
    { id: 'bridgeLight', box: LIGHT_BOX, liveOnly: true, res: 0.25, draw: (c) => bridgeLight(c) },
    { id: 'bridgeLightStill', box: LIGHT_BOX, stillOnly: true, draw: (c) => bridgeLight(c, 'lighter') },
    { id: 'tower', box: TOWER_BOX, draw: parCut(tower) },
    { id: 'beam', box: BEAM_BOX, draw: (c) => beam(c) },
    { id: 'abutment', box: ABUT_BOX, draw: parCut(abutment) },
    { id: 'horn', box: HORN_BOX, motion: 'sprite', draw: (c) => horn(c) },
    { id: 'stone', box: STONE_BOX, draw: parCut(runeStone) },
    { id: 'pennantStill', box: { x: T.px - 4, y: PEN_Y - PEN.h / 2, w: PEN.w + 10, h: PEN.h }, stillOnly: true, draw: (c) => {
      c.translate(T.px - 4, PEN_Y - PEN.h / 2);
      pennantFrame(c, 0.3);
    } },
    { id: 'bannerStill', box: { x: BF.banner.x - 10, y: BF.banner.y - 4, w: BNF.w, h: BNF.h }, stillOnly: true, draw: (c) => {
      c.translate(BF.banner.x - 10, BF.banner.y - 2);
      bannerFrame(c, 0.3, 0.6);
    } },
    { id: 'parapet', box: { x: 0, y: PAR, w: W, h: TY - PAR + 6 }, draw: parapet },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

registerKitScene(BIFROST, (k: KitLive, wave0: number) => {
  const top = k.slot('top');
  const skyS = k.slot('skyLive');
  const cloudS = k.slot('cloudSea');
  const brS = k.slot('bridgeLive');
  const hazeS = k.sprite('hazeSky');
  const stormS = k.sprite('stormSky');
  const fireS = k.sprite('fireSky').setBlendMode(Phaser.BlendModes.ADD);
  const seaFireS = k.sprite('seaFire').setBlendMode(Phaser.BlendModes.ADD);
  const seaStormS = k.sprite('seaStorm');
  const citStormS = k.sprite('citadelStorm');
  const bridgeDarkS = k.sprite('bridgeDark');
  const lightS = k.sprite('bridgeLight').setBlendMode(Phaser.BlendModes.ADD);
  lightS.setAlpha(1);
  const hornS = new Swing(k.pivot(k.sprite('horn'), BF.hinge.x, BF.hinge.y), { k: 5, c: 0.55, idle: 0.008, seed: 1, speed: 0.7 });

  // ——— the weather: the storm's scud, lightning, smoke on the burning horizon ———
  const scudKeys = [0, 1].map((i) => k.tex('bf_scud' + i, 300, 80, (c) => {
    c.scale(0.5, 0.5);
    cloud(c, rng(hashStr('bf:scud' + i)), 300, 130, 460, 50, { lit: '#9aa0b8', body: '#3a4058', shadow: '#121628', sunX: 300, sunY: -400, rim: 0.25, wisp: 0.75, kind: 'stratus', res: 0.5 });
  }));
  const scud = Array.from({ length: 7 }, (_, i) => {
    const im = k.img(scudKeys[i % 2], (i / 7) * (W + 600) - 300, 60 + (i % 4) * 90 + crand() * 30, { into: skyS, alpha: 0, scale: 2 + crand() * 0.8 });
    im.setData('v', 20 + crand() * 24);
    return im;
  });
  const RB = 0.4;
  const boltKey = sheet(k, 'bf_bolt', BOLT.w * RB, BOLT.h * RB, BOLT.n, (c, _p, i) => {
    c.scale(RB, RB);
    boltFrame(c, i);
  });
  const bolt = k.sc.add.image(0, 0, boltKey, 0).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  skyS.add(bolt);
  const boltGlow = k.glow(0, 0, 260, 0xc8c0ff, 0, { into: skyS, sy: 0.6 });
  const SMW = 220;
  const SMH = 360;
  const RS = 0.38;
  const SN = 8;
  const smokeKey = sheet(k, 'bf_smoke', SMW * RS, SMH * RS, SN, (c, ph) => {
    c.scale(RS, RS);
    smokeBillows(c, SMW, SMH, ph);
  });
  const smokes = [[560, 1.2], [980, 0.9], [1150, 1.35], [1880, 1.1]].map(([x, s], i) => new Loop(k, smokeKey, SN, x, HOR + 4, { into: skyS, origin: [0.5, 1], scale: s / RS, fps: 0.9, phase: i * 2.3 }));
  // the fire along the world's rim
  const FLW = 640;
  const FLH = 56;
  const RF = 0.5;
  const flKey = sheet(k, 'bf_fireline', FLW * RF, FLH * RF, 8, (c, ph) => {
    c.scale(RF, RF);
    fireLine(c, FLW, FLH, ph, 1);
  });
  const fireLines = [0, 1, 2].map((i) => new Loop(k, flKey, 8, i * FLW - 20 * i, HOR + 3, { into: skyS, origin: [0, 1], scale: 1 / RF, add: true, fps: 7, phase: i * 2.7 }));

  // ——— the cloud sea, drifting far below ———
  const glints = new Parts(k, { frame: 'spark', add: true, into: cloudS, max: 40 });
  const glintRate = new Rate();
  const clouds = CLOUDS.map((c, i) => {
    const cv = cloudCanvas(c.kind);
    const key = k.tex('bf_cloud' + c.kind, Math.ceil(cv.width / 2), Math.ceil(cv.height / 2), (g) => g.drawImage(cv, 0, 0, cv.width / 2, cv.height / 2));
    const im = k.img(key, c.x, c.y, { into: cloudS, scale: c.s * 2, origin: [0.5, CBY(c.kind) / cv.height] });
    im.setData('v', c.v);
    im.setData('i', i);
    return im;
  });

  // ——— the bridge's living light ———
  const RC = 0.28;
  const CN = 8;
  const cKey = sheet(k, 'bf_caustic', DECK_BOX.w * RC, DECK_BOX.h * RC, CN, (c, ph) => causticFrame(c, ph, RC));
  const shimmer = new Loop(k, cKey, CN, DECK_BOX.x, DECK_BOX.y, { into: brS, origin: [0, 0], scale: 1 / RC, add: true, fps: 2.4 });
  // the bridge's far end catching fire (wave 4)
  const FW = 80;
  const FH = 120;
  const fireKey = sheet(k, 'bf_fire', FW, FH, 8, (c, ph) => fireFrame(c, FW / 2, FH - 4, FW * 0.8, FH * 0.9, ph, { tongues: 4, seed: 2 }));
  const bridgeFires = [0.64, 0.69, 0.74, 0.79, 0.84, 0.88, 0.92, 0.96].map((t, i) => {
    const [x] = bz(t);
    const s = deckW(t) / 26;
    return new Loop(k, fireKey, 8, x, deckTop(t) + deckW(t) * 0.6, { into: brS, origin: [0.5, 1], scale: s, fps: 10, phase: i * 2.7 });
  });
  const pulses: { t: number; a: number; img: Phaser.GameObjects.Image; core: Phaser.GameObjects.Image }[] = [];
  const pulse = (a: number) => {
    const img = k.glow(0, 0, 60, 0xffd890, 0, { into: brS });
    const core = k.glow(0, 0, 24, 0xfffff0, 0, { into: brS });
    pulses.push({ t: 0, a, img, core });
  };
  const sparks = new Parts(k, { frame: 'spark', add: true, into: brS, max: 50 });
  const sparkRate = new Rate();
  const specks = new Parts(k, { frame: 'mote', add: true, into: brS, max: 90 });
  const speckRate = new Rate();
  const onDeck = (t: number, v: number): Pt => [bz(t)[0], deckTop(t) + deckW(t) * v];
  const SPEC_N = SPEC.map((c) => parseInt(c.slice(1), 16));

  // ——— the wind: the pennant, the banner ———
  const RP = 0.6;
  const penKey = sheet(k, 'bf_pennant', PEN.w * RP, PEN.h * RP, PEN.n, (c, ph) => {
    c.scale(RP, RP);
    pennantFrame(c, ph);
  });
  const pennant = new Loop(k, penKey, PEN.n, T.px - 4, PEN_Y, { into: top, origin: [0, 0.5], scale: 1 / RP, fps: 6 });
  const RN = 1;
  const banKey = sheet(k, 'bf_banner', BNF.w * RN, BNF.h * RN, BNF.n, (c, ph) => {
    c.scale(RN, RN);
    bannerFrame(c, ph, 1);
  });
  const banner = new Loop(k, banKey, BNF.n, BF.banner.x - 10, BF.banner.y - 2, { into: top, origin: [0, 0], scale: 1 / RN, fps: 3 });

  // ——— the watch-fire on the rune stone ———
  const BW2 = 90;
  const BH2 = 120;
  const RW = 1;
  const wfKey = sheet(k, 'bf_watchfire', BW2 * RW, BH2 * RW, 12, (c, ph) => {
    c.scale(RW, RW);
    fireFrame(c, BW2 / 2, BH2 - 4, BW2 * 0.8, BH2 * 0.85, ph, { tongues: 5, seed: 5 });
  });
  const watch = new Loop(k, wfKey, 12, BF.basket.x, BF.basket.y - 8, { into: top, origin: [0.5, 1], scale: 1 / RW, fps: 11 });
  const watchGlow = k.glow(BF.basket.x, BF.basket.y - 30, 200, 0xff9a40, 0, { into: top });
  const embers = new Parts(k, { frame: 'ember', add: true, into: top, max: 140 });
  const emberRate = new Rate();
  const fireEmbers = new Rate();

  // ——— rain, the washes, the flash ———
  const RT = 256;
  const rain = k.sc.add.tileSprite(0, 0, W, TY + 4, k.tex('bf_rain', RT, RT, (c) => rainTile(c, RT))).setOrigin(0, 0).setAlpha(0);
  const rain2 = k.sc.add.tileSprite(0, 0, W, TY + 4, 'bf_rain').setOrigin(0, 0).setAlpha(0).setTileScale(1.8, 1.8);
  top.add([rain, rain2]);
  const warm = k.wash(0xffdcaa, 0, Phaser.BlendModes.MULTIPLY, top);
  const dim = k.wash(0x6a7090, 0, Phaser.BlendModes.MULTIPLY, top);
  const ember = k.glow(960, PAR + 60, 1200, 0xff5a20, 0, { into: top, sy: 0.35 });
  const flash = k.wash(0xd8d4ff, 0, Phaser.BlendModes.ADD, top);
  const beacons = [[1546 + CDX, 222 + CDY], [1700 + CDX, 290 + CDY], [1412 + CDX, 366 + CDY], [BF.gate.x - 34, BF.gate.y - 40], [BF.gate.x + 38, BF.gate.y - 40]].map(([x, y]) => k.glow(x, y, 26, 0xff8a30, 0, { into: top }));

  // stomps: grit off the gallery and the coping, a pulse along the bridge
  const grit = new Parts(k, { frame: 'mote', into: top, max: 80 });
  const dust = new Parts(k, { frame: 'puff', into: top, max: 30 });
  const sift = (x0: number, x1: number, y: number, floor: number, n: number) => {
    for (let i = 0; i < n; i++) grit.spawn({ x: x0 + crand() * (x1 - x0), y, vx: 4 + crand() * 14, vy: 10 + crand() * 30, life: 2, r0: 2.4 + crand() * 2.6, a: 0.95, tint: 0xd0cad6, grav: 420, drag: 0.4, floor, fade: 0.05 });
  };

  let kw = waveK(wave0);
  let shown = kw;
  let wind = 0.3;
  let flare = 0;
  let boltT = 2;
  let boltLife = -1;
  let boltX = 0;
  let boltPeak = 0;
  let pulseT = 3;

  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, p) {
      flare = Math.min(1.4, flare + 0.4 + p * 0.6);
      pulse(0.9 + p * 0.6);
      hornS.kick((x < 960 ? 1 : -1) * (0.35 + p * 0.25));
      wind = Math.min(1.8, wind + 0.3 * p);
      // spectral sparks thrown off where it springs from the stone
      for (let i = 0; i < 6 + p * 10; i++) {
        const t = crand() * 0.15;
        const [sx, sy] = onDeck(t, crand());
        sparks.spawn({ x: sx, y: sy, vx: (crand() - 0.3) * 120, vy: -40 - crand() * 120, life: 0.6 + crand() * 0.5, r0: 6 + crand() * 6, r1: 1, a: 0.9, tint: SPEC_N[Math.floor(crand() * SPEC_N.length)], grav: 260, fade: 0.1 });
      }
      sift(14, 220, T.gal + 16, PAR - 4, Math.round(3 + p * 6));
      if (p > 0.3) {
        sift(BF.abut.x0, BF.abut.x1, BF.abut.top + 4, PAR - 2, Math.round(2 + p * 4));
        sift(BF.stone.x0 + 10, BF.stone.x1 - 10, BF.stone.top + 6, PAR - 2, Math.round(2 + p * 4));
      }
      // dust shaken off the coping and out of the tower's and the stone's feet
      for (const [dx, dy] of [[Math.max(40, Math.min(W - 40, x)), PAR + 4], [tR(PAR) + 10, PAR - 2], [BF.stone.x0 - 10, PAR - 2]] as const) {
        for (let i = 0; i < 2 + p * 3; i++) dust.spawn({ x: dx + (crand() - 0.5) * 70, y: dy, vx: (crand() - 0.3) * 70, vy: -20 - crand() * 40, life: 1.3 + crand(), r0: 12, r1: 40 + crand() * 26, a: 0.42, tint: 0xe0dae2, drag: 1.2, fade: 0.12 });
      }
    },
    update(dt, t) {
      const cm = calm();
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      // 0 shimmering noon … 0.33 the golden veil … 0.66 the storm … 1 storm and fire
      const veilK = ease(clamp01(shown / 0.33)) * (1 - ease(clamp01((shown - 0.45) / 0.3)) * 0.7);
      const stormK = ease(clamp01((shown - 0.4) / 0.3));
      const fireK = ease(clamp01((shown - 0.72) / 0.28));
      const clearK = 1 - Math.max(veilK * 0.4, stormK);
      hazeS.setAlpha(veilK);
      seaStormS.setAlpha(stormK);
      citStormS.setAlpha(stormK * (1 - fireK * 0.25));
      bridgeDarkS.setAlpha(stormK * 0.3 + fireK * 0.45);
      stormS.setAlpha(stormK);
      fireS.setAlpha(fireK * (0.8 + 0.2 * Math.sin(t * 1.3) * Math.sin(t * 0.47)));
      seaFireS.setAlpha(fireK * (0.85 + 0.15 * Math.sin(t * 2.1)));
      warm.setAlpha(veilK * 0.07 * (1 - stormK));
      dim.setAlpha(stormK * 0.38 - fireK * 0.06);
      ember.setAlpha(fireK * 0.12 * (0.85 + 0.15 * Math.sin(t * 1.7)));

      // the wind: a breeze, freshening wave by wave, gusting in the storm
      const base = 0.3 + shown * 0.9 + 0.25 * Math.max(0, Math.sin(t * 0.31) * Math.sin(t * 0.83 + 1));
      wind += (base - wind) * Math.min(1, dt * 0.7);
      pennant.step(dt, (0.5 + wind * 0.8) * cm);
      banner.step(dt, (0.5 + wind * 0.7) * cm);
      hornS.update(dt, t);
      if (stormK > 0.3 && crand() < dt * 0.25 * stormK) hornS.kick((crand() - 0.5) * 0.3 * stormK);

      // the storm scud racing over, the smoke climbing off the burning horizon
      for (const s of scud) {
        s.x += Number(s.getData('v')) * (0.5 + wind) * dt * cm;
        if (s.x > W + 400) s.x = -400;
        s.setAlpha(stormK * 0.7);
        s.setTint(Phaser.Display.Color.GetColor(Math.round(230 - fireK * 30), Math.round(230 - fireK * 120), Math.round(240 - fireK * 140)));
      }
      for (const sm of smokes) {
        sm.step(dt, cm);
        sm.alpha = fireK * 0.9;
      }
      for (const fl of fireLines) {
        fl.step(dt, cm);
        fl.alpha = fireK * (0.85 + 0.15 * Math.sin(t * 3.1 + fl.a.x));
      }
      // the cloud sea: drifting, gold in the veil, dark under the storm, lit red by the fire
      const cr = Math.round(255 - stormK * 125 + fireK * 25);
      const cgc = Math.round(255 - veilK * 20 - stormK * 120 - fireK * 20);
      const cb = Math.round(255 - veilK * 55 - stormK * 100 - fireK * 30);
      const ctint = Phaser.Display.Color.GetColor(Math.min(255, cr), Math.max(0, cgc), Math.max(0, cb));
      for (const c of clouds) {
        c.x += Number(c.getData('v')) * (0.6 + wind * 0.6) * dt * cm;
        const hw = (c.width * c.scaleX) / 2;
        if (c.x - hw > W + 20) c.x = -hw - 20;
        c.setTint(ctint);
      }
      glintRate.tick(3 * clearK * cm, dt, () => {
        const y = HOR + 10 + crand() ** 1.3 * (PAR - HOR - 20);
        const spread = 30 + (y - HOR) * 1.2;
        glints.spawn({ x: 390 + (crand() + crand() - 1) * spread, y, life: 0.25 + crand() * 0.3, r0: 4 + (y - HOR) * 0.03, r1: 1, a: 0.8, tint: 0xfff4d8, fade: 0.4 });
      });

      // lightning: in the storm, striking the sea far off; the sky and the bridge flash
      if (stormK > 0.5) {
        boltT -= dt;
        if (boltT <= 0 && boltLife < 0) {
          boltT = (fireK > 0.5 ? 4.5 : 3) + crand() * 4;
          boltLife = 0;
          const spots = [140, 520, 760, 1000, 1880];
          boltX = spots[Math.floor(crand() * spots.length)] + (crand() - 0.5) * 80;
          boltPeak = 0.6 + crand() * 0.4;
          const sc = 0.8 + crand() * 0.35;
          bolt.setFrame(Math.floor(crand() * BOLT.n)).setPosition(boltX, HOR - BOLT.h * sc).setScale((sc / RB) * (crand() < 0.5 ? -1 : 1), sc / RB);
          bolt.setTint(fireK > 0.5 ? 0xffd0a8 : 0xffffff);
          boltGlow.setPosition(boltX, HOR - BOLT.h * sc + 40);
        }
      }
      if (boltLife >= 0) {
        boltLife += dt;
        // a stutter: strike, a gap, the return stroke, fading
        const q = boltLife;
        const a = q < 0.06 ? 1 : q < 0.12 ? 0.25 : q < 0.2 ? 0.95 : Math.max(0, 0.95 - (q - 0.2) * 3);
        bolt.setAlpha(a * boltPeak);
        boltGlow.setAlpha(a * boltPeak * 0.5);
        flash.setAlpha(a * boltPeak * 0.12);
        flare = Math.max(flare, a * 0.5);
        if (q > 0.6) {
          boltLife = -1;
          bolt.setAlpha(0);
          boltGlow.setAlpha(0);
          flash.setAlpha(0);
        }
      }

      // the bridge: its caustics flowing, bright in the sun, dimmer and restless in the storm, red in the fire
      flare = Math.max(0, flare - dt * 0.9);
      shimmer.step(dt, (0.8 + stormK * 0.5) * cm);
      const flick = 1 - stormK * 0.3 * (0.5 + 0.5 * Math.sin(t * 7.3) * Math.sin(t * 3.1));
      shimmer.alpha = clamp01((0.85 - stormK * 0.35 - fireK * 0.2) * flick + flare * 0.6);
      const fr = Math.round(255);
      const fg = Math.round(255 - fireK * 90);
      const fb = Math.round(255 - fireK * 160);
      shimmer.each((im) => im.setTint(Phaser.Display.Color.GetColor(fr, fg, fb)));
      lightS.setAlpha(clamp01((1 - stormK * 0.45) * (0.9 + 0.1 * Math.sin(t * 0.9)) + flare * 0.3));
      for (const f of bridgeFires) {
        f.step(dt, cm);
        f.alpha = fireK;
      }
      // now and then a pulse of light runs out along it on its own, in fair weather
      pulseT -= dt;
      if (pulseT <= 0) {
        pulseT = 4 + crand() * 4;
        if (stormK < 0.6) pulse(0.45 * (1 - stormK));
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pu = pulses[i];
        // (it covers the near part quickly and slows as it goes off into the distance)
        pu.t += dt * (0.55 - pu.t * 0.3);
        if (pu.t >= 1) {
          pu.img.destroy();
          pu.core.destroy();
          pulses.splice(i, 1);
          continue;
        }
        const [px, py] = bz(pu.t);
        const w = deckW(pu.t);
        const ang = bzAng(pu.t);
        const a = pu.a * Math.min(1, pu.t * 12) * (1 - pu.t) * bridgeA(pu.t);
        pu.img.setPosition(px, py).setRotation(ang).setScale((w * 4.4) / 256, (w * 2.2) / 256).setAlpha(Math.min(1, a * 1.3));
        pu.core.setPosition(px, py).setRotation(ang).setScale((w * 1.8) / 256, (w * 0.9) / 256).setAlpha(Math.min(1, a * 1.3));
      }
      // glints winking on the slabs, and specks of coloured light drifting down off its underside
      sparkRate.tick((5 * clearK + 1) * cm, dt, () => {
        const tt = crand() ** 1.5 * 0.85;
        const [sx, sy] = onDeck(tt, crand());
        sparks.spawn({ x: sx, y: sy, life: 0.3 + crand() * 0.3, r0: (4 + crand() * 6) * (1 - tt * 0.7), r1: 1, a: 0.9, tint: 0xffffff, fade: 0.4 });
      });
      speckRate.tick(10 * (1 - stormK * 0.5) * cm, dt, () => {
        const tt = crand() ** 1.3 * 0.9;
        const [sx] = bz(tt);
        const sy = deckBot(tt) + fasciaH(tt);
        specks.spawn({ x: sx + (crand() - 0.5) * 10, y: sy, vx: (crand() - 0.5) * 6 + wind * 6, vy: 6 + crand() * 14, life: 2.5 + crand() * 2, r0: (2 + crand() * 2) * (1 - tt * 0.6), r1: 0.6, a: 0.75, tint: SPEC_N[Math.floor(crand() * SPEC_N.length)], drag: 0.2, fade: 0.2 });
      });

      // the watch-fire: lit as the storm comes, roaring in the fire; embers off it, and up out of the drop
      const wf = clamp01((stormK - 0.2) / 0.5);
      watch.step(dt, (0.8 + wind * 0.3) * cm);
      watch.alpha = wf;
      watchGlow.setAlpha(wf * (0.3 + 0.08 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23)));
      fireEmbers.tick(6 * wf * cm, dt, () => {
        embers.spawn({ x: BF.basket.x + (crand() - 0.5) * 40, y: BF.basket.y - 30, vx: 30 + wind * 60 + (crand() - 0.5) * 40, vy: -60 - crand() * 80, life: 1.4 + crand(), r0: 3 + crand() * 2, r1: 1, a: 0.9, tint: crand() < 0.5 ? 0xffb040 : 0xff6a20, grav: -20, drag: 0.5, streak: 0.02, fade: 0.1 });
      });
      emberRate.tick(40 * fireK * cm, dt, () => {
        embers.spawn({ x: crand() * W - 100, y: PAR - 4 - crand() * 200, vx: 60 + wind * 90 + (crand() - 0.5) * 40, vy: -80 - crand() * 140, life: 2.5 + crand() * 2, r0: 2.5 + crand() * 2.5, r1: 0.8, a: 0.85, tint: crand() < 0.5 ? 0xffa030 : 0xff5a1a, grav: -10, drag: 0.3, streak: 0.025, fade: 0.1 });
      });
      for (const b of beacons) b.setAlpha(fireK * (0.6 + 0.2 * Math.sin(t * 7 + b.x)));

      // rain in the storm, slanting with the wind (thinning as the fire comes)
      const rainK = stormK * (1 - fireK * 0.6);
      rain.setAlpha(rainK * 0.32);
      rain2.setAlpha(rainK * 0.22);
      rain.tilePositionY -= 900 * dt * cm;
      rain.tilePositionX -= 200 * (0.5 + wind) * dt * cm;
      rain2.tilePositionY -= (1300 * dt * cm) / 1.8;
      rain2.tilePositionX -= (300 * (0.5 + wind) * dt * cm) / 1.8;

      glints.update(dt);
      sparks.update(dt);
      specks.update(dt);
      embers.update(dt);
      grit.update(dt);
      dust.update(dt);
    },
  };
});
