// The Burning Bridge (Surtr the Fire Giant's arena, the end of the Bifröst stage, Act 8), redrawn with the location kit
// (src/art/scene): the same terrace as the Bifröst Bridge (scene-bifrost.ts), a little later. Ragnarök has come.
//
// The wolf has swallowed the sun: where it stood over the watchtower there is a black disc in a ragged red corona. The
// sky is a deck of smoke rolling over from the south, its underside lit from below. Far beneath the terrace the
// world-sea is burning: Muspelheim's fire has run out over it, Midgard's coasts stand black against it, the serpent's
// coils break its surface, and the cloud floor under the parapet is lit from beneath through every gap. The crystal
// causeway still leaps out from the bridge-head, but its light is guttering: the glass has gone dark and smoky, cracks
// glowing in it, and the fire is running along it from the citadel's end. On its crag the gods' citadel burns, its golden
// halls alight, smoke pouring off them. The guardian's tower and the great horn are the same rune-cut basalt and aurochs
// horn, now lit from below and from the fire; the banner on the rune stone hangs scorched, its hem burnt away, and the
// watch-fire roars in its basket. The table is the terrace's threshold, its flags dusted with ash, kept dark and calm so
// the giant's burning pizzas stand out on it.
//
// There are no waves here: the arena moves with the fight's phases (the boss's phase, read from the game scene; on the
// stages page the wave buttons stand in for them). Phase by phase the fire runs along the bridge towards us, the citadel
// burns harder, the smoke thickens and the fire under the clouds brightens; on the third phase the bridge's middle span
// breaks away and falls into the burning clouds, and when the sword comes out the span between it and the bridge-head
// goes too, leaving the middle of the sky dark behind the sword.
//
// Live, the heroes:
// - the bridge breaking up: the fire running along the deck (painted flames, 8 frames, igniting as the front passes),
//   cracks flaring, the spectral shimmer guttering out; each span shudders, hinges down off its break, then falls,
//   turning, into the burning cloud with its flames, shedding painted crystal shards that tumble and glint, and sinks
//   into the cloud floor with a burst of fire-light;
// - the fire below and beyond: the fire-sea's veins flowing under the cloud gaps (painted, 8 frames), the clouds
//   drifting over it lit from beneath, the fire along the world's rim and the smoke columns off it and off the burning
//   halls (painted billows), embers rising out of the drop, ash drifting down;
// - the guardian's horn swinging on its chains and the scorched banner and pennant streaming in the hot wind; a stomp
//   swings the horn, flares the cracks and the fires, shakes grit and ash off the tower and the stone and shards off
//   the broken ends.

import Phaser from 'phaser';
import { type Ctx, type R, TY, W, calmLanes, glowAt, gradeAll, vfill, vignetteAll } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { relight, type RelightLight } from '../../art/scene/light';
import { drift, lay, noiseMask, softly } from '../../art/scene/paint';
import { cloud, horizonGlow } from '../../art/scene/sky';
import { hashStr, makeCanvas, mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm } from '../../game/sceneLive';
import { registerKitScene } from '../../game/sceneLive';
import type { Pt } from './scene-rink';
import {
  ABUT_BOX, BEAM_BOX, BF, BNF, BRIDGE_BOX, CBY, CDX, CDY, CH, CIT_BOX, CK, CLOUDS, CW, DECK_BOX, HORN_BOX, PEN, PEN_Y, STONE_BOX, TOWER_BOX,
  abutment, bannerFrame, basket, beam, bz, causticFrame, citadelPaint, deckBot, deckStrip, deckTop, deckW, fasciaH, fasciaStrip, horn, mapStrip,
  parCut, parapet, pennantFrame, runeStone, table, tower, tR,
} from './scene-bifrost';


// ——— layout ———

export const SU = {
  ...BF,
  /** Where the bridge breaks: the near span (TA…TB) goes when the sword comes out, the far span (TB…TC) on the third
   * phase. */
  ta: 0.24,
  tb: 0.48,
  tc: 0.7,
  /** The eclipsed sun (where Bifröst's sun stood). */
  sun: BF.sun,
};
const HOR = BF.hor;
const PAR = BF.par;
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The light below everything: the fire-sea seen through the clouds. */
const BELOW = '#ff5a1e';

// ——— the sky ———

/**
 * A bank of smoke across the sky between y0 and y1: soft masses (a noise field stretched wide, so they lie along the
 * deck), dark in their body, their undersides (the edges turned down to the fire) lit; faded out at the bank's top and
 * bottom so banks melt into each other. Far banks (low) are smaller, hotter and lit more; near ones big and dark.
 */
function smokeBank(ctx: Ctx, y0: number, y1: number, cells: number, seed: number, cover: number, body: [string, string], lit: string, litA: number, d: number): void {
  const k = 0.5;
  const w = Math.ceil(W * k);
  const h = Math.ceil((y1 - y0) * k);
  const m = noiseMask(cells, seed, { cover, soft: 0.22, col: '#ffffff', w: 384, h: 72 });
  const [c, g] = makeCanvas(w, h);
  g.drawImage(m, 0, 0, w, h);
  g.globalCompositeOperation = 'source-in';
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, body[0]);
  bg.addColorStop(1, body[1]);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  // the lit undersides: the mass less itself lifted, blurred a little, laid inside it
  const [lc, lg] = makeCanvas(w, h);
  lg.drawImage(m, 0, 0, w, h);
  lg.globalCompositeOperation = 'source-in';
  lg.fillStyle = lit;
  lg.fillRect(0, 0, w, h);
  lg.globalCompositeOperation = 'destination-out';
  lg.drawImage(m, 0, -d * k, w, h);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = litA;
  g.filter = 'blur(1.5px)';
  g.drawImage(lc, 0, 0);
  g.filter = 'none';
  g.globalAlpha = 1;
  // (the glow of that light a little way up into the mass)
  g.globalAlpha = litA * 0.35;
  g.filter = 'blur(5px)';
  g.drawImage(lc, 0, -d * k * 0.5);
  g.filter = 'none';
  g.globalAlpha = 1;
  // melted at its top and bottom
  g.globalCompositeOperation = 'destination-in';
  const fg = g.createLinearGradient(0, 0, 0, h);
  fg.addColorStop(0, 'rgba(0,0,0,0)');
  fg.addColorStop(0.25, 'rgba(0,0,0,1)');
  fg.addColorStop(0.8, 'rgba(0,0,0,1)');
  fg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fg;
  g.fillRect(0, 0, w, h);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, 0, y0, W, y1 - y0);
  ctx.restore();
}

/** The smoke deck rolling over from the south, far (low over the horizon) to near (overhead). */
function smokeDeck(ctx: Ctx): void {
  smokeBank(ctx, 300, HOR + 6, 22, 501, 0.5, ['#6a2a18', '#8a3a1c'], '#ffc070', 0.85, 5);
  smokeBank(ctx, 220, 430, 16, 502, 0.5, ['#3e1812', '#5a2014'], '#ff9a48', 0.75, 7);
  smokeBank(ctx, 120, 370, 11, 503, 0.52, ['#221010', '#3a1610'], '#ff7a34', 0.6, 10);
  smokeBank(ctx, 20, 290, 8, 504, 0.56, ['#140809', '#22100e'], '#d85a26', 0.5, 13);
  smokeBank(ctx, -60, 190, 6, 505, 0.6, ['#0a0405', '#160a0a'], '#a84420', 0.4, 16);
}

/** The sun swallowed: a rift in the smoke, a black disc in a ragged pale-red corona, a bead of light still at its limb. */
function eclipse(ctx: Ctx, r: R): void {
  const { x, y, r: sr } = SU.sun;
  // the rift the corona shows through
  softly(ctx, { x: x - 240, y: 0, w: 480, h: y + 200 }, (g) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, 160);
    rg.addColorStop(0, 'rgba(40,14,12,1)');
    rg.addColorStop(0.5, 'rgba(40,14,12,0.7)');
    rg.addColorStop(1, 'rgba(40,14,12,0)');
    g.fillStyle = rg;
    g.save();
    g.translate(x, y);
    g.scale(1.4, 0.8);
    g.translate(-x, -y);
    g.fillRect(x - 170, y - 170, 340, 340);
    g.restore();
  }, 0.5);
  glowAt(ctx, x, y, 200, '#c84a2a', 0.2, 1);
  // the corona: soft streamers drawn out unevenly round it, longest along the sun's equator
  softly(ctx, { x: x - 170, y: y - 170, w: 340, h: 340 }, (g) => {
    g.globalCompositeOperation = 'lighter';
    g.filter = 'blur(2px)';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * P2 + r() * 0.35;
      const eq = 0.35 + 0.65 * Math.abs(Math.cos(a - 0.3)) ** 2;
      const len = sr * (0.8 + r() * 2.2) * eq;
      const w = 0.2 + r() * 0.2;
      const lg = g.createRadialGradient(x, y, sr, x, y, sr + len);
      lg.addColorStop(0, rgba('#ffd8b0', 0.34));
      lg.addColorStop(1, rgba('#ff9a6a', 0));
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(x + Math.cos(a - w) * sr, y + Math.sin(a - w) * sr);
      g.quadraticCurveTo(x + Math.cos(a) * (sr + len * 0.5), y + Math.sin(a) * (sr + len * 0.5), x + Math.cos(a + w * 0.3) * (sr + len), y + Math.sin(a + w * 0.3) * (sr + len));
      g.lineTo(x + Math.cos(a + w) * sr, y + Math.sin(a + w) * sr);
      g.closePath();
      g.fill();
    }
    g.filter = 'none';
  }, 0.5);
  const cg = ctx.createRadialGradient(x, y, sr * 0.95, x, y, sr * 1.7);
  cg.addColorStop(0, 'rgba(255,232,200,0.85)');
  cg.addColorStop(0.3, 'rgba(255,180,130,0.3)');
  cg.addColorStop(1, 'rgba(255,120,80,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(x, y, sr * 1.7, 0, P2);
  ctx.fill();
  // the disc: black, a hair of light round its rim
  ctx.fillStyle = '#060203';
  ctx.beginPath();
  ctx.arc(x, y, sr, 0, P2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,224,190,0.8)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // the bead: the last of the sun, at its lower right
  const bx = x + Math.cos(0.8) * sr;
  const by = y + Math.sin(0.8) * sr;
  glowAt(ctx, bx, by, 20, '#fff2d8', 0.7, 1);
  glowAt(ctx, bx, by, 5, '#ffffff', 1, 1);
  // a tatter of smoke drifting across its lower edge
  softly(ctx, { x: x - 220, y: y - 20, w: 440, h: 120 }, (g) => {
    g.lineCap = 'round';
    g.filter = 'blur(4px)';
    for (const [dy, w, a] of [[22, 18, 0.7], [34, 10, 0.5]] as const) {
      g.strokeStyle = rgba('#120707', a);
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x - 200, y + dy + 10);
      g.bezierCurveTo(x - 80, y + dy - 6, x + 40, y + dy + 10, x + 200, y + dy - 4);
      g.stroke();
    }
    g.filter = 'none';
  }, 0.5);
}

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: HOR + 4 };
  vfill(ctx, 0, 0, W, HOR + 4, [[0, '#0a0405'], [0.4, '#1a0909'], [0.68, '#3e120e'], [0.86, '#8a2c12'], [0.95, '#d85a1e'], [1, '#ffa040']]);
  lay(ctx, drift('#4a1610', '#080305', 4, 211, 160, 48), box, 0.3);
  smokeDeck(ctx);
  eclipse(ctx, r);
  // the dark over the middle (the boss's bar and the caption are read against it)
  softly(ctx, box, (g) => {
    const rg = g.createRadialGradient(960, 240, 0, 960, 240, 560);
    rg.addColorStop(0, 'rgba(10,4,6,0.5)');
    rg.addColorStop(0.6, 'rgba(10,4,6,0.28)');
    rg.addColorStop(1, 'rgba(10,4,6,0)');
    g.fillStyle = rg;
    g.save();
    g.translate(960, 240);
    g.scale(1.4, 0.55);
    g.translate(-960, -240);
    g.fillRect(360, -340, 1200, 1160);
    g.restore();
  }, 0.25);
  // the haze of the fire low over the horizon, hottest to either side of the middle
  vfill(ctx, 0, HOR - 110, W, 114, [[0, 'rgba(255,110,40,0)'], [0.7, 'rgba(255,120,48,0.22)'], [1, 'rgba(255,190,110,0.6)']]);
  glowAt(ctx, 420, HOR, 520, '#ff6a24', 0.26, 0.3);
  glowAt(ctx, 1500, HOR, 620, '#ff6a24', 0.26, 0.28);
  horizonGlow(ctx, HOR + 2, 22, '#ffc070', 0.32);
  // Midgard's coasts black against the fire, a hot rim on their tops
  const coast = (pts: Pt[]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = '#1a0706';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,110,0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < pts.length - 2; i++) (i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]));
    ctx.stroke();
  };
  coast([[470, HOR + 1], [520, HOR - 3], [600, HOR - 5], [700, HOR - 2], [760, HOR - 4], [840, HOR + 1], [840, HOR + 4], [470, HOR + 4]]);
  coast([[1540, HOR + 1], [1600, HOR - 6], [1690, HOR - 8], [1780, HOR - 4], [1920, HOR - 6], [1920, HOR + 4], [1540, HOR + 4]]);
}

/** A column of smoke off a fire (phase ph loops), w×h, its source at the bottom middle: black billows born small and
 * hot, swelling as they climb and lean off on the wind, lit from beneath by the fire, their tops lost in the dark. */
const SM = { w: 300, h: 360 };
/** Where a smoke column rises from, across its frame. */
const SM_SRC = 0.28;
function smokeColumn(c: Ctx, w: number, h: number, ph: number): void {
  const N = 18;
  for (let i = 0; i < N; i++) {
    const q = (ph + i / N) % 1;
    const rr = rng(hashStr('su:billow' + i));
    const y = h - 16 - q * (h - 70);
    const x = w * SM_SRC + q * q * w * 0.42 + Math.sin(q * 5 + i * 1.7) * w * 0.03 * (0.4 + q);
    const rad = w * (0.05 + 0.2 * q) * (0.85 + rr() * 0.3);
    const a = Math.min(1, q * 7) * (1 - q) ** 1.5 * 0.8;
    if (a < 0.01) continue;
    const body = c.createRadialGradient(x, y - rad * 0.15, 0, x, y, rad);
    body.addColorStop(0, `rgba(22,10,10,${a.toFixed(3)})`);
    body.addColorStop(0.65, `rgba(20,9,10,${(a * 0.75).toFixed(3)})`);
    body.addColorStop(1, 'rgba(18,8,10,0)');
    c.fillStyle = body;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    // the fire's light on its underside, strongest low down
    const ug = c.createRadialGradient(x, y + rad * 0.5, 0, x, y + rad * 0.5, rad * 0.8);
    const ua = a * (1 - q) ** 1.6;
    ug.addColorStop(0, `rgba(255,120,48,${ua.toFixed(3)})`);
    ug.addColorStop(1, 'rgba(255,100,40,0)');
    c.fillStyle = ug;
    c.fillRect(x - rad, y - rad * 0.3, rad * 2, rad * 1.6);
  }
}

// ——— the burning world-sea far below ———

/** The sea's crust, tileable (256 px): plates of cinder and ash drifting on the fire, the fire showing through the
 * cracks between them (transparent there), the plates' edges lit by it. */
let crustCache: HTMLCanvasElement[] | null = null;
function crustTex(): HTMLCanvasElement[] {
  if (crustCache) return crustCache;
  const N = 256;
  const [c, g] = makeCanvas(N, N);
  const img = g.createImageData(N, N);
  const d = img.data;
  // plates: the cells round scattered points (wrapping, so it tiles); the fire shows in the cracks between them,
  // wider in places, and each plate's rim glows where it meets the fire
  const rr = rng(hashStr('su:crust'));
  const P: [number, number, number][] = [];
  for (let i = 0; i < 34; i++) P.push([rr() * N, rr() * N, rr()]);
  const wave = (x: number, y: number) => 0.5 + 0.25 * Math.sin((x / N) * P2 * 3 + Math.sin((y / N) * P2 * 2) * 2) + 0.25 * Math.sin((y / N) * P2 * 4 + 1);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let f1 = 1e9;
      let f2 = 1e9;
      let tone = 0;
      for (const [px, py, pt] of P) {
        let dx = Math.abs(x - px);
        let dy = Math.abs(y - py);
        if (dx > N / 2) dx = N - dx;
        if (dy > N / 2) dy = N - dy;
        const dd = dx * dx + dy * dy;
        if (dd < f1) {
          f2 = f1;
          f1 = dd;
          tone = pt;
        } else if (dd < f2) f2 = dd;
      }
      const gap = Math.sqrt(f2) - Math.sqrt(f1);
      const wv = 1.2 + 3.2 * wave(x, y) ** 2;
      const vein = 1 - Math.min(1, Math.max(0, (gap - wv * 0.4) / wv));
      const rim = 1 - Math.min(1, gap / (wv * 3));
      const i = (y * N + x) * 4;
      // cinder: dark, each plate its own tone, ash-grey on the older ones
      d[i] = 22 + tone * 22 + rim * 110;
      d[i + 1] = 10 + tone * 12 + rim * 30;
      d[i + 2] = 9 + tone * 10 + rim * 8;
      d[i + 3] = Math.round(255 * (1 - vein ** 1.5) * 0.97);
    }
  }
  g.putImageData(img, 0, 0);
  // mips, softened, for the far rows (where the plates are too small to draw without shimmer)
  const mip = (src: HTMLCanvasElement, n: number) => {
    const [mc, mg] = makeCanvas(n, n);
    mg.imageSmoothingEnabled = true;
    mg.imageSmoothingQuality = 'high';
    mg.drawImage(src, 0, 0, n, n);
    return mc;
  };
  const m1 = mip(c, 64);
  crustCache = [c, m1, mip(m1, 16)];
  return crustCache;
}

/** Lay a tileable texture on the sea's plane in perspective between y0 and y1 (below the horizon): its width shrinks
 * with distance (near: screen px per texture px across, at y1) and its depth much faster (a grazing view: lift, the
 * eye's height over the plane in the same units, sets how flat it lies). */
function planeTex(ctx: Ctx, mips: HTMLCanvasElement[], y0: number, y1: number, near: number, lift: number, a: number): void {
  const pats = mips.map((m) => ctx.createPattern(m, 'repeat')!);
  const K = (y1 - HOR) / near;
  ctx.save();
  ctx.globalAlpha = a;
  for (let y = y0; y < y1; ) {
    const step = y - HOR < 50 ? 1 : 2;
    const dy = y + step / 2 - HOR + 0.5;
    // texture px per screen px across and down, and how far out along the plane this row is
    const du = K / dy;
    const dv = (K * lift) / (dy * dy);
    const v = (K * lift) / dy;
    const lvl = Math.max(du, dv * 0.35) < 2.5 ? 0 : Math.max(du, dv * 0.35) < 10 ? 1 : 2;
    const k = [1, 4, 16][lvl];
    const sx = k / du;
    const sy = k / dv;
    const pat = pats[lvl];
    pat.setTransform(new DOMMatrix([sx, 0, 0, sy, 960, y + step / 2 + (v / k) * sy]));
    ctx.fillStyle = pat;
    ctx.fillRect(0, y, W, step);
    y += step;
  }
  ctx.restore();
}

function drop(ctx: Ctx, r: R): void {
  const y1 = PAR + 14;
  // the fire under the crust: white-hot along the horizon, deep red under the terrace
  vfill(ctx, 0, HOR, W, y1 - HOR, [[0, '#ffc060'], [0.03, '#ff9a3c'], [0.12, '#f0601e'], [0.35, '#b8360f'], [0.7, '#7a1e0a'], [1, '#4a1008']]);
  // the crust drifting on it
  planeTex(ctx, crustTex(), HOR + 1, y1, 1.8, 520, 1);
  // the glare of the fire low along the horizon, through the crust
  vfill(ctx, 0, HOR, W, 22, [[0, 'rgba(255,190,110,0.5)'], [1, 'rgba(255,150,60,0)']]);
  // the serpent's coils breaking the fire, black against it
  const ser = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = 'rgba(255,236,180,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, w * 0.8, h * 0.32, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = '#1a0606';
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.bezierCurveTo(x - w * 0.4, y - h, x + w * 0.4, y - h, x + w / 2, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,100,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.36, y - h * 0.62);
    ctx.quadraticCurveTo(x - w * 0.1, y - h * 0.82, x + w * 0.1, y - h * 0.76);
    ctx.stroke();
  };
  ser(812, 508, 22, 8);
  ser(842, 509, 16, 6);
  ser(866, 510, 11, 4);
  cloudBanks(ctx, r);
  // smoke lying over the near sea, between us and it: deep and dark under the terrace, so the play area stays calm
  vfill(ctx, 0, HOR + 40, W, y1 - HOR - 40, [[0, 'rgba(30,10,10,0)'], [0.4, 'rgba(30,10,10,0.5)'], [1, 'rgba(20,8,10,0.85)']]);
  lay(ctx, noiseMask(8, 517, { cover: 0.5, soft: 0.4, col: '#1a0a0a', w: 320, h: 48 }), { x: 0, y: HOR + 60, w: W, h: y1 - HOR - 60 }, 0.5);
  cloudFloor(ctx, r);
}

/** The cloud sea over the burning world-sea, seen from above: rows of cloud tops crowding to the horizon, dark on top
 * (only the red sky lights them), their edges glowing where the fire below shows round them, the fire showing through
 * the gaps between them. */
function cloudBanks(ctx: Ctx, r: R): void {
  const N = 7;
  for (let j = 0; j < N; j++) {
    const u = j / (N - 1);
    const y = HOR + 12 + u ** 1.5 * 200;
    const h = 12 + 56 * u;
    const o = { lit: mix('#f0905a', '#b85a38', u), body: mix('#7a3a2c', '#4a2420', u), shadow: '#1e0a0a', sunX: 960, sunY: -300, rim: 0.5 - u * 0.2, wisp: 0.4, kind: 'cumulus' as const, a: 0.96, res: 0.35 };
    for (let x = -60 + r() * 120; x < W + 60; ) {
      const w = (130 + 480 * u) * (0.7 + r() * 0.6);
      if (r() < 0.85) cloud(ctx, r, x + w / 2, y + r() * h * 0.6, w, h * (0.8 + r() * 0.4), o);
      x += w * (0.75 + r() * 0.6);
    }
  }
}

/** The cloud floor just under the parapet, lit from beneath: dark tops, the fire glowing up through its gaps (kept
 * between the pizzas' places, and deep red rather than bright, so nothing hot sits right behind a pizza). */
function cloudFloor(ctx: Ctx, r: R): void {
  const base = PAR + 14;
  const gaps = [[140, 230], [680, 760], [1180, 1270], [1720, 1800]];
  for (const [a, b] of gaps) {
    const x = (a + b) / 2;
    glowAt(ctx, x, 664, (b - a) * 1.6, '#9a2810', 0.32, 0.3);
    glowAt(ctx, x, 668, (b - a) * 0.6, '#e8602a', 0.2, 0.3);
  }
  softly(ctx, { x: 0, y: 600, w: W, h: base - 600 }, (g) => {
    const vg = g.createLinearGradient(0, 640, 0, base);
    vg.addColorStop(0, 'rgba(30,12,14,0)');
    vg.addColorStop(0.4, 'rgba(30,12,14,0.9)');
    vg.addColorStop(1, 'rgba(20,8,12,1)');
    g.fillStyle = vg;
    g.beginPath();
    g.moveTo(-10, base);
    for (let x = -10; x <= W + 10; x += 20) {
      const gap = gaps.some(([a, b]) => x > a && x < b);
      g.lineTo(x, gap ? base - 6 : 652 + Math.sin(x / 70) * 8 + Math.sin(x / 23) * 4);
    }
    g.lineTo(W + 10, base);
    g.closePath();
    g.fill();
  }, 0.25);
  // the tops: dark, their edges lit red by the gaps and the fire beyond
  const o = { lit: '#7a2a1c', body: '#261012', shadow: '#100607', sunX: 960, sunY: 1400, rim: 0.6, wisp: 0.3, kind: 'cumulus' as const, a: 0.98 };
  for (let x = -60; x < W + 60; ) {
    const w = 150 + r() * 190;
    const cx = x + w / 2;
    if (!gaps.some(([a, b]) => cx > a - 40 && cx < b + 40)) cloud(ctx, r, cx, base - 4, w, 40 + r() * 30, o);
    x += w * (0.55 + r() * 0.25);
  }
}

// ——— the cloud sea drifting over the fire ———

const cloudCache = new Map<number, HTMLCanvasElement>();
/** A drifting cloud (Bifröst's kinds), lit from beneath by the fire: dark tops, glowing undersides and rims. */
function fireCloud(i: number): HTMLCanvasElement {
  const hit = cloudCache.get(i);
  if (hit) return hit;
  const k = CK[i];
  const [c, g] = makeCanvas(CW(i), CH(i));
  const rr = rng(hashStr('su:cloud' + i));
  cloud(g, rr, CW(i) / 2, CBY(i), k.w, k.h, { lit: '#a8401c', body: '#221011', shadow: '#2e0e0a', sunX: CW(i) / 2, sunY: 2000, rim: 0.5, wisp: 0.45, kind: k.kind, res: 0.5 });
  cloudCache.set(i, c);
  return c;
}

function cloudSea(ctx: Ctx): void {
  for (const c of CLOUDS) {
    const cv = fireCloud(c.kind);
    ctx.drawImage(cv, c.x - (cv.width / 2) * c.s, c.y - CBY(c.kind) * c.s, cv.width * c.s, cv.height * c.s);
  }
}

// ——— the citadel burning ———

/** The halls alight (in screen px, the citadel's shift applied): where their fires stand, how big, from which phase
 * (0…1) they burn. */
const HALL_FIRES: { x: number; y: number; s: number; from: number }[] = [
  // the great hall's roof
  { x: 1590, y: 214, s: 1.1, from: 0 },
  { x: 1632, y: 204, s: 1.3, from: 0 },
  { x: 1676, y: 196, s: 1, from: 0.3 },
  // the halls stepping down the crag
  { x: 1492, y: 362, s: 0.7, from: 0 },
  { x: 1520, y: 356, s: 0.6, from: 0.6 },
  { x: 1762, y: 300, s: 0.8, from: 0.3 },
  { x: 1796, y: 294, s: 0.6, from: 0.6 },
  { x: 1456, y: 404, s: 0.6, from: 0.6 },
  { x: 1786, y: 358, s: 0.55, from: 0.9 },
  { x: 1532, y: 304, s: 0.5, from: 0.9 },
];
/** The smoke off the citadel: where each column rises, its size, from which phase. */
const CIT_SMOKE: { x: number; y: number; s: number; from: number }[] = [
  { x: 1632, y: 210, s: 1.2, from: 0 },
  { x: 1500, y: 360, s: 0.75, from: 0 },
  { x: 1776, y: 300, s: 0.9, from: 0.3 },
];

const CIT_LIGHTS: RelightLight[] = [
  { x: 1630, y: 200, col: '#ff9a48', a: 0.6, reach: 170, rim: 0.7, rimW: 2 },
  { x: 1500, y: 370, col: '#ff8a3a', a: 0.45, reach: 120, rim: 0.4, rimW: 2 },
  { x: 1500, y: 760, col: BELOW, a: 0.3, reach: 420, rim: 0.5, rimW: 2 },
];

function citadel(ctx: Ctx, r: R): void {
  const B = CIT_BOX;
  relight(ctx, B, (c) => {
    c.save();
    c.translate(CDX, CDY);
    citadelPaint(c, r);
    c.restore();
    // its foot melts away into the smoke over the fire
    c.globalCompositeOperation = 'destination-out';
    const fg = c.createLinearGradient(0, HOR + 50, 0, B.y + B.h);
    fg.addColorStop(0, 'rgba(0,0,0,0)');
    fg.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = fg;
    c.fillRect(B.x, B.y, B.w, B.h);
  }, { dim: ['#2a1822', '#2a1418'], lights: CIT_LIGHTS });
  // the burning halls: their windows glowing hot, their roofs lit by the fire on them
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of HALL_FIRES) if (f.from <= 0) glowAt(ctx, f.x, f.y + 6 * f.s, 34 * f.s, '#ff7a2a', 0.35, 0.6);
  for (const [x, y, w] of [[1600, 268, 120], [1500, 380, 60], [1780, 322, 60]] as const) {
    ctx.fillStyle = rgba('#ff8a30', 0.5);
    for (let i = 0; i < 6; i++) ctx.fillRect(x - w / 2 + (i + 0.5) * (w / 6), y - 7 + i * -0.8, 2.6, 6);
    glowAt(ctx, x, y - 2, w * 0.7, '#ff6a20', 0.25, 0.5);
  }
  ctx.restore();
}

// ——— the bridge, cracking ———

/** The crystal gone dark: smoky glass like obsidian, the spectrum faint along its edges, the facets' arrises catching
 * the fire; the deck reflects the burning horizon more the further off it is (a grazing look), the side face is lit
 * from below. hot: how much it glows at the far end, where it's burning. */
function scorchStrip(src: HTMLCanvasElement, hot: number, face: boolean): HTMLCanvasElement {
  const [c, g] = makeCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let x = 0; x < c.width; x++) {
    const t = x / c.width;
    const heat = hot * clamp01((t - 0.6) / 0.4) ** 1.5;
    const graze = face ? 0 : 0.1 + 0.45 * t ** 1.6;
    for (let y = 0; y < c.height; y++) {
      const i = (y * c.width + x) * 4;
      const r = d[i];
      const gg = d[i + 1];
      const b = d[i + 2];
      const lum = (r * 0.3 + gg * 0.55 + b * 0.15) / 255;
      const sat = (Math.max(r, gg, b) - Math.min(r, gg, b)) / 255;
      // the arrises and sparks (the brightest of the crystal) catch the fire
      const e = clamp01((lum - 0.8) / 0.2);
      // the side face lit from beneath, more towards its keel
      const under = face ? (y / c.height) * 0.5 : 0;
      d[i] = 22 + r * (0.06 + 0.38 * sat) + e * 90 + (graze + under) * 200 + heat * 120;
      d[i + 1] = 14 + gg * (0.05 + 0.34 * sat) + e * 40 + (graze + under) * 74 + heat * 34;
      d[i + 2] = 24 + b * (0.08 + 0.4 * sat) + e * 20 + (graze + under) * 30;
    }
  }
  g.putImageData(img, 0, 0);
  // soot smudged along it, and blackened where the fire's been at it
  lay(g, noiseMask(10, 301, { cover: 0.45, soft: 0.45, col: '#080304', w: 256, h: 24 }), { x: 0, y: 0, w: c.width, h: c.height }, 0.5);
  return c;
}

/** A point on the deck (v 0 the far kerb … 1 the near kerb) or down its side face (v 1…2). */
function onBridge(t: number, v: number): Pt {
  const x = bz(t)[0];
  if (v <= 1) return [x, deckTop(t) + deckW(t) * v];
  return [x, deckBot(t) + fasciaH(t) * (v - 1)];
}

/** Where the bridge breaks at t: a jagged line across the deck and down its side face. */
function breakLine(tb: number, seed: number): Pt[] {
  const rr = rng(hashStr('su:break' + seed));
  const pts: Pt[] = [];
  const j = 0.012 * (1 - tb * 0.6);
  for (let i = 0; i <= 12; i++) {
    const v = -0.02 + (i / 12) * 2.04;
    pts.push(onBridge(tb + (rr() - 0.5) * j * 2 + (i % 2 ? j * 0.6 : -j * 0.3), Math.min(2, Math.max(0, v))));
  }
  return pts;
}
const BREAKS = { a: breakLine(SU.ta, 1), b: breakLine(SU.tb, 2), c: breakLine(SU.tc, 3) };

/** The outline of the bridge between two breaks (or its ends: null), for clipping. */
function piecePath(c: Ctx, from: Pt[] | null, to: Pt[] | null): void {
  const top = 380;
  const bot = 720;
  c.beginPath();
  if (from) {
    c.moveTo(from[0][0], top);
    for (const p of from) c.lineTo(p[0], p[1]);
    c.lineTo(from[from.length - 1][0], bot);
  } else {
    c.moveTo(380, top);
    c.lineTo(380, bot);
  }
  if (to) {
    c.lineTo(to[to.length - 1][0], bot);
    for (let i = to.length - 1; i >= 0; i--) c.lineTo(to[i][0], to[i][1]);
    c.lineTo(to[0][0], top);
  } else {
    c.lineTo(1460, bot);
    c.lineTo(1460, top);
  }
  c.closePath();
}

/** The glowing cracks running through the glass: the paths (t, v points) and how hot each is. */
interface Crack {
  pts: [number, number][];
  heat: number;
}
const CRACKS: Crack[] = (() => {
  const rr = rng(hashStr('su:cracks'));
  const out: Crack[] = [];
  // a crack runs along the glass, wandering across it, now and then forking
  const walk = (t: number, v: number, n: number, dir: number, heat: number, vMax = 1) => {
    const pts: [number, number][] = [[t, v]];
    let dv = (rr() - 0.5) * 0.25;
    for (let i = 0; i < n; i++) {
      t = Math.max(0.004, Math.min(0.985, t + dir * (0.006 + rr() * 0.012) * (1 - t * 0.75)));
      dv = dv * 0.6 + (rr() - 0.5) * 0.22;
      v = Math.max(0.02, Math.min(vMax, v + dv));
      pts.push([t, v]);
      if (rr() < 0.16 && n > 4) walk(t, v, Math.floor(n / 2), rr() < 0.5 ? dir : -dir, heat * 0.75, vMax);
    }
    out.push({ pts, heat });
  };
  // along the deck, everywhere (fewer far off, where they'd be too fine to see), hotter towards the burning far end
  for (let i = 0; i < 24; i++) {
    const t = rr() ** 1.25 * 0.95;
    walk(t, 0.1 + rr() * 0.8, 6 + Math.floor(rr() * 8), rr() < 0.5 ? 1 : -1, 0.3 + rr() * 0.3 + clamp01((t - 0.6) / 0.4) * 0.45);
  }
  // crazing round the breaks, down the side face too
  for (const tb of [SU.ta, SU.tb, SU.tc]) {
    for (let i = 0; i < 5; i++) walk(tb + (rr() - 0.5) * 0.02, rr() * 1.9, 3 + Math.floor(rr() * 4), rr() < 0.5 ? 1 : -1, 0.6 + rr() * 0.3, 1.95);
  }
  return out;
})();

/** The cracks (and the break lines) stroked in light: glow, body, white-hot core. keep: which parts of the bridge. */
function crackLight(g: Ctx, k = 1, keep?: (t: number) => boolean): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const stroke = (pts: Pt[], ts: number[], heat: number) => {
    for (const [w, col, a] of [[6, '#ff4a14', 0.2], [2.2, '#ff9a3a', 0.6], [0.8, '#fff0c0', 0.85]] as const) {
      for (let i = 1; i < pts.length; i++) {
        if (keep && !keep(ts[i])) continue;
        const s = deckW(ts[i]) / 131;
        g.strokeStyle = rgba(col, Math.min(1, a * heat * k));
        g.lineWidth = Math.max(0.5, w * s + 0.25);
        g.beginPath();
        g.moveTo(pts[i - 1][0], pts[i - 1][1]);
        g.lineTo(pts[i][0], pts[i][1]);
        g.stroke();
      }
    }
  };
  for (const c of CRACKS) stroke(c.pts.map(([t, v]) => onBridge(t, v)), c.pts.map(([t]) => t), c.heat);
  for (const [tb, line] of [[SU.ta, BREAKS.a], [SU.tb, BREAKS.b], [SU.tc, BREAKS.c]] as const) {
    if (keep && !keep(tb)) continue;
    stroke(line, line.map(() => tb), 1.05);
  }
}

let bridgeCache: HTMLCanvasElement | null = null;
/** The whole bridge, burnt and cracked, painted once (BRIDGE_BOX, 1:1); its pieces are cut from it. */
function burntBridge(): HTMLCanvasElement {
  if (bridgeCache) return bridgeCache;
  const B = BRIDGE_BOX;
  const [c, g] = makeCanvas(B.w, B.h);
  g.translate(-B.x, -B.y);
  mapStrip(g, scorchStrip(fasciaStrip(), 0.8, true), deckBot, fasciaH);
  // (the deck's glass is not quite opaque: the fire far below shows faintly through it)
  const [dc, dg] = makeCanvas(B.w, B.h);
  dg.translate(-B.x, -B.y);
  mapStrip(dg, scorchStrip(deckStrip(), 1, false), deckTop, deckW);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 0.88;
  g.drawImage(dc, 0, 0);
  g.restore();
  // a fine dark line under the keel and along the far kerb, a hot rim along the near kerb from the fire below
  g.lineCap = 'round';
  for (let i = 0; i < 120; i++) {
    const t = i / 120;
    const t1 = (i + 1) / 120;
    const fade = t < 0.97 ? 1 : clamp01((1 - t) / 0.03);
    g.strokeStyle = rgba('#0a0406', 0.85 * fade);
    g.lineWidth = 0.8 + (1 - t) * 2;
    g.beginPath();
    g.moveTo(bz(t)[0], deckBot(t) + fasciaH(t));
    g.lineTo(bz(t1)[0], deckBot(t1) + fasciaH(t1));
    g.stroke();
    g.strokeStyle = rgba('#ff7a3a', 0.4 * fade);
    g.lineWidth = 0.6 + (1 - t) * 1.2;
    g.beginPath();
    g.moveTo(bz(t)[0], deckBot(t) + fasciaH(t) - 1);
    g.lineTo(bz(t1)[0], deckBot(t1) + fasciaH(t1) - 1);
    g.stroke();
  }
  // the cracks, glowing (laid over the glass only)
  const [lc, lg] = makeCanvas(B.w, B.h);
  lg.translate(-B.x, -B.y);
  lg.globalCompositeOperation = 'lighter';
  crackLight(lg);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.drawImage(lc, 0, 0);
  // char round the far end, where it's burning
  g.globalCompositeOperation = 'source-atop';
  const cg = g.createLinearGradient(bz(0.68)[0] - B.x, 0, bz(1)[0] - B.x, 0);
  cg.addColorStop(0, 'rgba(10,4,4,0)');
  cg.addColorStop(0.3, 'rgba(10,4,4,0.35)');
  cg.addColorStop(1, 'rgba(10,4,4,0.2)');
  g.fillStyle = cg;
  g.fillRect(0, 0, B.w, B.h);
  bridgeCache = c;
  return c;
}

/** One piece of the bridge, between two breaks. */
function bridgePiece(ctx: Ctx, from: Pt[] | null, to: Pt[] | null): void {
  ctx.save();
  piecePath(ctx, from, to);
  ctx.clip();
  ctx.drawImage(burntBridge(), BRIDGE_BOX.x, BRIDGE_BOX.y);
  ctx.restore();
}

/** A span's box (it's baked on its own, to fall). */
function spanBox(t0: number, t1: number): { x: number; y: number; w: number; h: number } {
  let x0 = 1e9;
  let x1 = -1e9;
  let y0 = 1e9;
  let y1 = -1e9;
  for (let i = 0; i <= 20; i++) {
    const t = t0 - 0.02 + (i / 20) * (t1 - t0 + 0.04);
    const [x] = bz(t);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, deckTop(t));
    y1 = Math.max(y1, deckBot(t) + fasciaH(t));
  }
  return { x: Math.floor(x0 - 6), y: Math.floor(y0 - 8), w: Math.ceil(x1 - x0 + 12), h: Math.ceil(y1 - y0 + 16) };
}
const SPAN_NEAR = spanBox(SU.ta, SU.tb);
const SPAN_FAR = spanBox(SU.tb, SU.tc);

/** The cracks' light leaking out under the bridge onto the clouds (added), for the pieces given. */
function bridgeGlow(ctx: Ctx, op: GlobalCompositeOperation, keep: (t: number) => boolean): void {
  softly(ctx, { x: 360, y: 400, w: 1080, h: PAR - 400 }, (g) => {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 160; i++) {
      const t = i / 160;
      if (!keep(t)) continue;
      const [x] = bz(t);
      const [x1] = bz((i + 1) / 160);
      const y0 = deckBot(t) + fasciaH(t) - 2;
      const len = 20 + 70 * (1 - t) ** 1.2;
      const hot = 0.07 + 0.08 * clamp01((t - 0.6) / 0.3);
      const lg = g.createLinearGradient(0, y0, 0, y0 + len);
      lg.addColorStop(0, rgba('#ff6a24', hot));
      lg.addColorStop(1, 'rgba(255,90,30,0)');
      g.fillStyle = lg;
      g.fillRect(x, y0, x1 - x + 1, Math.min(len, PAR - y0));
    }
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      if (!keep(t)) continue;
      const [x, y] = bz(t);
      const rad = 16 + 50 * (1 - t);
      const rg = g.createRadialGradient(x, y, 0, x, y, rad);
      rg.addColorStop(0, rgba('#ff8a3a', 0.05 + 0.05 * clamp01((t - 0.6) / 0.3)));
      rg.addColorStop(1, 'rgba(255,138,58,0)');
      g.fillStyle = rg;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, 0.25, op);
}

// ——— the terrace: tower, beam, horn, abutment and rune stone, relit by the fire ———

/** The light on the near things: the fire-sea glowing up out of the drop, the burning bridge, the corona. */
const LEFT_LIGHT: RelightLight[] = [
  { x: 330, y: 1000, col: BELOW, a: 0.72, reach: 760, rim: 0.75, rimW: 3 },
  { x: 620, y: 520, col: '#ff8a3a', a: 0.6, reach: 480, rim: 0.8, rimW: 3 },
  { x: SU.sun.x, y: SU.sun.y, col: '#d88a7a', a: 0.22, reach: 520, rim: 0.3, rimW: 2 },
];
const LEFT_DIM: [string, string] = ['#5a3838', '#4a2a26'];
const STONE_LIGHT: RelightLight[] = [
  { x: BF.basket.x, y: BF.basket.y - 30, col: '#ffa448', a: 1, reach: 260, rim: 0.9, rimW: 3 },
  { x: BF.basket.x - 10, y: BF.stone.top - 40, col: '#ff9a40', a: 0.6, reach: 140 },
  { x: 1560, y: 320, col: '#ff7a30', a: 0.3, reach: 520, rim: 0.4, rimW: 2 },
  { x: 1800, y: 1000, col: BELOW, a: 0.45, reach: 600, rim: 0.5, rimW: 3 },
];

const relit = (box: { x: number; y: number; w: number; h: number }, draw: (c: Ctx, r: R) => void, lights: RelightLight[], dim = LEFT_DIM) => (c: Ctx, r: R) => {
  relight(c, box, (g) => draw(g, r), { dim, lights, cut: PAR - 2 });
};

/** Soot climbing the tower's face from the fire below, and scorch on its lookout. */
function towerSoot(ctx: Ctx, r: R): void {
  const T = BF.tower;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, T.gal, tR(PAR) + 4, PAR - T.gal);
  ctx.clip();
  softly(ctx, { x: 0, y: T.gal, w: 260, h: PAR - T.gal }, (g) => {
    for (let i = 0; i < 9; i++) {
      const x = 10 + r() * 190;
      const lg = g.createLinearGradient(0, PAR, 0, PAR - 160 - r() * 200);
      lg.addColorStop(0, 'rgba(8,4,6,0.5)');
      lg.addColorStop(1, 'rgba(8,4,6,0)');
      g.fillStyle = lg;
      g.beginPath();
      g.ellipse(x, PAR - 60, 18 + r() * 26, 260, 0, 0, P2);
      g.fill();
    }
  }, 0.25);
  ctx.restore();
}

// ——— the watch-fire, the banner, the pennant ———

/** The banner on the rune stone, scorched: its hem burnt away in a ragged edge, embers along it, holes. */
function bannerBurnt(c: Ctx, ph: number, gust: number): void {
  const w = BNF.w;
  const h = BNF.h;
  relight(c, { x: 0, y: 0, w, h }, (g) => {
    g.save();
    bannerFrame(g, ph, gust);
    g.restore();
    const rr = rng(hashStr('su:banner'));
    // the hem burnt away
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) g.lineTo(x, h * 0.72 + Math.sin(x * 0.21) * 8 + rr() * 12 - (x > w * 0.6 ? 18 : 0));
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    for (const [x, y, s] of [[w * 0.36, h * 0.52, 6], [w * 0.62, h * 0.34, 4]] as const) {
      g.beginPath();
      g.ellipse(x, y, s, s * 1.3, 0.3, 0, P2);
      g.fill();
    }
    // char along the burnt edges
    g.globalCompositeOperation = 'source-atop';
    const cg = g.createLinearGradient(0, h * 0.5, 0, h * 0.8);
    cg.addColorStop(0, 'rgba(10,4,4,0)');
    cg.addColorStop(1, 'rgba(10,4,4,0.85)');
    g.fillStyle = cg;
    g.fillRect(0, 0, w, h);
  }, { dim: ['#5a3c44', '#3e2428'], lights: [{ x: w * 1.6, y: -40, col: '#ffa448', a: 0.6, reach: 260, rim: 0.7, rimW: 2 }] });
  // embers still glowing along the burnt hem
  const rr = rng(hashStr('su:banner'));
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let x = 0; x <= w; x += 6) {
    const y = h * 0.72 + Math.sin(x * 0.21) * 8 + rr() * 12 - (x > w * 0.6 ? 18 : 0);
    if (x < 10 || x > w - 6) continue;
    const a = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(ph * P2 * 2 + x * 0.4));
    c.fillStyle = rgba('#ff8a3a', a);
    c.fillRect(x - 3, y - 1.5, 6, 2.4);
  }
  c.restore();
}

/** The pennant, scorched dark and its tail burnt short. */
function pennantBurnt(c: Ctx, ph: number): void {
  relight(c, { x: 0, y: 0, w: PEN.w, h: PEN.h }, (g) => {
    pennantFrame(g, ph);
    g.globalCompositeOperation = 'destination-out';
    const rr = rng(hashStr('su:pennant'));
    g.beginPath();
    g.moveTo(PEN.w, 0);
    for (let y = 0; y <= PEN.h; y += 6) g.lineTo(PEN.w * 0.72 + rr() * 26 + Math.sin(y * 0.3) * 8, y);
    g.lineTo(PEN.w, PEN.h);
    g.closePath();
    g.fill();
  }, { dim: ['#6a4448', '#4a2a2e'], lights: [{ x: PEN.w * 0.4, y: PEN.h * 3, col: '#ff8a40', a: 0.4, reach: 300, rim: 0.6, rimW: 2 }] });
}

// ——— the parapet and the table, in the fire's last light ———

function parapetBurnt(ctx: Ctx, r: R): void {
  relight(ctx, { x: 0, y: PAR, w: W, h: TY - PAR + 8 }, (c) => parapet(c, r), {
    dim: ['#5a3c44', '#2a1a22'],
    lights: [{ x: 960, y: 560, col: '#ff8a48', a: 0.22, reach: 1300, rim: 0.65, rimW: 2 }],
  });
  // ash settled along the coping
  ctx.fillStyle = 'rgba(120,108,110,0.22)';
  for (let x = 0; x < W; x += 3) if (r() < 0.5) ctx.fillRect(x, PAR + 1, 2 + r() * 4, 1 + r() * 1.4);
}

function tableBurnt(ctx: Ctx, r: R): void {
  const f = BF.front;
  relight(ctx, { x: 0, y: TY - 4, w: W, h: 1080 - TY + 4 }, (c) => table(c, r), {
    dim: ['#6a5660', '#564650'],
    lights: [{ x: 960, y: TY - 200, col: '#ff9a60', a: 0.16, reach: 900 }],
  });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY);
  ctx.clip();
  // ash drifted into the joints and over the flags, fine and grey
  lay(ctx, noiseMask(22, 331, { cover: 0.3, soft: 0.4, col: '#8a8084', w: 480, h: 64 }), { x: 0, y: TY, w: W, h: f - TY }, 0.12);
  // scorch at the two outer ends, where embers have landed (kept out of the pizzas' places)
  for (const [x, y, rx] of [[60, TY + 150, 200], [1860, TY + 120, 220]] as const) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, rx);
    rg.addColorStop(0, 'rgba(8,4,4,0.5)');
    rg.addColorStop(1, 'rgba(8,4,4,0)');
    ctx.fillStyle = rg;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.35);
    ctx.translate(-x, -y);
    ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  }
  for (let i = 0; i < 14; i++) {
    const left = i % 2 === 0;
    const x = left ? 10 + r() * 150 : W - 10 - r() * 150;
    const y = TY + 40 + r() * (f - TY - 80);
    ctx.fillStyle = rgba(r() < 0.5 ? '#ff7a2a' : '#c83a14', 0.5 + r() * 0.3);
    ctx.fillRect(x, y, 2 + r() * 2, 1.4 + r());
  }
  // the light of the fire over the parapet on the far flags, faint, and the near flags in shade
  vfill(ctx, 0, TY, W, 70, [[0, 'rgba(255,120,60,0.08)'], [1, 'rgba(255,120,60,0)']]);
  ctx.restore();
}

// ——— the grade and the shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#ffd8c0', 0.03, { warm: '#ffb070', cool: '#3a2a70', a: 0.2 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#0a0408', 70, 640);
  vignetteAll(ctx, 0.5, '#080204');
}

// ——— frames for the live layer ———

/** The fire-sea's veins at phase ph (loops), painted flat across the whole width: bright threads of flame flowing
 * and braiding over the burning sea, dimmer in the middle (behind the sword and the ring). w×h at res. */
const SEA = { w: 1920, h: 120, res: 0.3, n: 12 };
function seaFrame(c: Ctx, ph: number): void {
  const w = Math.ceil(SEA.w * SEA.res);
  const h = Math.ceil(SEA.h * SEA.res);
  // (painted on its own canvas: putImageData ignores the sheet's frame offset)
  const [fc, fg] = makeCanvas(w, h);
  const img = fg.createImageData(w, h);
  const d = img.data;
  const T = P2 * ph;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    // (the distance: tighter and brighter at the horizon, fading towards the cloud floor)
    const sy = 1 / (0.18 + v * 1.2);
    const fade = (1 - v) ** 1.4 * clamp01(v * 8 + 0.2);
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const X = u * 26;
      const Y = v * 9 * sy;
      const warp = Math.sin(X * 0.7 + Y * 0.5 + T) * 0.8 + Math.sin(X * 0.31 - Y * 0.9 - T) * 0.6;
      const s = Math.sin(X + warp * 1.6 + T) * Math.cos(Y * 1.3 - warp + T) + Math.sin(X * 2.1 - Y * 0.7 + T) * 0.35;
      const vein = (1 - Math.min(1, Math.abs(s))) ** 6;
      // (dimmer in the middle, behind the sword; none behind the citadel's crag)
      const mid = (0.45 + 0.55 * clamp01(Math.abs(u - 0.5) / 0.22)) * clamp01((0.6 - u) / 0.04);
      const k = vein * fade * mid;
      const i = (y * w + x) * 4;
      d[i] = 255;
      d[i + 1] = 120 + 110 * vein;
      d[i + 2] = 40 + 60 * vein ** 2;
      d[i + 3] = Math.round(255 * Math.min(1, k * 0.95));
    }
  }
  fg.putImageData(img, 0, 0);
  c.drawImage(fc, 0, 0);
}

/** A crystal shard off the broken bridge (frame i of n): smoky glass, a facet lit, a hot edge, a spectral glint. */
const SHARD_HALF = 16;
function shardFrame(c: Ctx, i: number): void {
  const rr = rng(hashStr('su:shard' + i));
  const s = SHARD_HALF;
  const n = 3 + Math.floor(rr() * 3);
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * P2 + rr() * 0.8;
    const rad = s * (0.45 + rr() * 0.5);
    pts.push([s + Math.cos(a) * rad, s + Math.sin(a) * rad * (0.5 + rr() * 0.5)]);
  }
  const path = () => {
    c.beginPath();
    pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  };
  path();
  const g = c.createLinearGradient(0, 0, s * 2, s * 2);
  g.addColorStop(0, '#6a5a78');
  g.addColorStop(0.5, '#2a1e30');
  g.addColorStop(1, '#140a12');
  c.fillStyle = g;
  c.fill();
  // a facet catching the fire
  c.save();
  path();
  c.clip();
  c.fillStyle = 'rgba(255,150,80,0.45)';
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  c.lineTo(pts[1][0], pts[1][1]);
  c.lineTo(s, s);
  c.closePath();
  c.fill();
  c.restore();
  // a hot broken edge and a spectral glint
  c.strokeStyle = '#ffb060';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(pts[n - 1][0], pts[n - 1][1]);
  c.lineTo(pts[0][0], pts[0][1]);
  c.stroke();
  c.strokeStyle = ['#a070ff', '#48d8ff', '#70f0a4', '#ffe676'][i % 4];
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(pts[1][0], pts[1][1]);
  c.lineTo(pts[2][0], pts[2][1]);
  c.stroke();
  c.strokeStyle = 'rgba(8,4,6,0.8)';
  c.lineWidth = 1;
  path();
  c.stroke();
}

/**
 * A blaze (phase ph loops): tongues of flame licking up off a glowing bed, each a soft-edged teardrop leaning and
 * stretching on its own beat, a hot core low in it, a lick of flame tearing off one tip and rising. Base centred at
 * (x, y), w across, h tall. Painted on its own canvas and laid on softened, so its edges are soft at any scale.
 */
function blaze(c: Ctx, x: number, y: number, w: number, h: number, ph: number, o: { tongues?: number; seed?: number } = {}): void {
  const n = o.tongues ?? 4;
  const sd = o.seed ?? 0;
  const pad = w * 0.4;
  const cw = Math.ceil(w + pad * 2);
  const ch = Math.ceil(h * 1.3);
  const [fc, g] = makeCanvas(cw, ch);
  const bx = cw / 2;
  const by = ch - 2;
  const T = ph * P2;
  // the bed it burns off, glowing
  g.save();
  g.translate(bx, by);
  g.scale(1, 0.35);
  const bg = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.62);
  bg.addColorStop(0, 'rgba(255,150,60,0.6)');
  bg.addColorStop(1, 'rgba(255,90,30,0)');
  g.fillStyle = bg;
  g.fillRect(-w, -w, w * 2, w * 2);
  g.restore();
  const tongue = (tx: number, tw: number, th: number, lean: number, cols: [string, string, string], a: number) => {
    g.beginPath();
    g.moveTo(tx - tw / 2, by);
    g.bezierCurveTo(tx - tw * 0.62, by - th * 0.36, tx - tw * 0.2 + lean * th * 0.4, by - th * 0.72, tx + lean * th, by - th);
    g.bezierCurveTo(tx + tw * 0.25 + lean * th * 0.4, by - th * 0.66, tx + tw * 0.62, by - th * 0.3, tx + tw / 2, by);
    g.quadraticCurveTo(tx, by + tw * 0.2, tx - tw / 2, by);
    const lg = g.createLinearGradient(0, by, 0, by - th);
    lg.addColorStop(0, rgba(cols[0], a));
    lg.addColorStop(0.45, rgba(cols[1], a * 0.95));
    lg.addColorStop(0.82, rgba(cols[2], a * 0.6));
    lg.addColorStop(1, rgba(cols[2], 0));
    g.fillStyle = lg;
    g.fill();
  };
  const ts: [number, number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const mid = 1 - Math.abs(u - 0.5) * 1.1;
    const k1 = Math.sin(T + i * 2.3 + sd);
    const k2 = Math.sin(2 * T + i * 1.7 + sd * 1.3);
    const th = h * (0.5 + 0.45 * mid) * (0.85 + 0.12 * k1 + 0.06 * k2);
    const tw = (w / n) * 1.8 * (0.9 + 0.1 * k2);
    const tx = bx + (u - 0.5) * w * 0.72 + Math.sin(T + i + sd) * w * 0.03;
    const lean = 0.08 * Math.sin(T + i * 1.3 + sd) + (u - 0.5) * 0.14;
    ts.push([tx, tw, th, lean]);
    tongue(tx, tw, th, lean, ['#d8400e', '#ff7a22', '#c8280a'], 0.9);
  }
  // the hot cores, low in each tongue
  for (const [tx, tw, th, lean] of ts) tongue(tx, tw * 0.5, th * 0.62, lean * 0.8, ['#fff4d0', '#ffcc58', '#ff9a30'], 0.92);
  // a lick of flame tearing off one tip and rising as it burns out
  const [lx, lw, lh, ll] = ts[Math.abs(Math.round(sd)) % n];
  const q = ph;
  const ly = by - lh * (0.78 + q * 0.5);
  const sz = lw * 0.28 * (1 - q * 0.6);
  g.fillStyle = rgba('#ffa838', 0.85 * (1 - q) * Math.min(1, q * 6 + 0.2));
  g.beginPath();
  const cx0 = lx + ll * lh;
  g.moveTo(cx0 - sz * 0.6, ly);
  g.bezierCurveTo(cx0 - sz * 0.6, ly - sz * 1.4, cx0 + sz * 0.1, ly - sz * 2.4, cx0 + sz * 0.25, ly - sz * 3.4);
  g.bezierCurveTo(cx0 + sz * 0.5, ly - sz * 2.2, cx0 + sz * 0.7, ly - sz * 1.2, cx0 + sz * 0.6, ly);
  g.quadraticCurveTo(cx0, ly + sz * 0.7, cx0 - sz * 0.6, ly);
  g.fill();
  c.save();
  c.filter = `blur(${Math.max(0.5, w * 0.012).toFixed(2)}px)`;
  c.drawImage(fc, x - bx, y - by);
  c.restore();
}

// ——— the stack ———

/** The sky's live slot: right of the tower, left of the citadel (so neither has to be baked over it). */
const SKY_LIVE = { x: 250, y: 0, w: CIT_BOX.x - 250, h: HOR };
/** The citadel's live slot: its fires and its smoke, up into the sky over it. */
const CIT_LIVE = { x: CIT_BOX.x, y: 0, w: W - CIT_BOX.x, h: CIT_BOX.y + CIT_BOX.h };
const CLOUD_BOX = { x: 0, y: HOR - 40, w: W, h: PAR - HOR + 40 };
const keepStub = (t: number) => t <= SU.ta || t >= SU.tc;

/** The bridge's flames: where each stands (t along it, v across the deck), its size, and which piece carries it. */
const BRIDGE_FIRES: { t: number; v: number; s: number }[] = (() => {
  const rr = rng(hashStr('su:bfires'));
  const out: { t: number; v: number; s: number }[] = [];
  for (let t = 0.035; t < 0.97; ) {
    out.push({ t: t + (rr() - 0.5) * 0.01, v: 0.25 + rr() * 0.5, s: 0.75 + rr() * 0.45 });
    t += 0.04 + 0.03 * t + rr() * 0.02;
  }
  return out;
})();
/** The fire front (t: everything beyond it burns) for the fight's progress p (0 the first phase … 1 the last). */
const frontAt = (p: number): number => (p < 0.34 ? lerp(0.74, 0.46, p / 0.34) : p < 0.67 ? lerp(0.46, 0.2, (p - 0.34) / 0.33) : lerp(0.2, 0, (p - 0.67) / 0.33));
const FIRE_FRAME = { w: 80, h: 120, n: 8 };
/** A hall's fire: a cluster of flames off its roof (frames w×h, shown at k × the fire's size). */
const HF = { w: 96, h: 110, k: 0.62 };
function hallFireFrame(c: Ctx, ph: number, v: number): void {
  const bx = HF.w / 2;
  const by = HF.h - 4;
  // the bed of burning roof under them
  const bg = c.createRadialGradient(bx, by - 4, 0, bx, by - 4, 40);
  bg.addColorStop(0, 'rgba(255,150,60,0.55)');
  bg.addColorStop(1, 'rgba(255,90,30,0)');
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = bg;
  c.fillRect(0, by - 40, HF.w, 44);
  c.restore();
  const parts: [number, number, number, number][] = v ? [[-24, 0.55, 0.42, 0.3], [20, 0.7, 0.5, 0.65], [-2, 0.95, 0.6, 0]] : [[22, 0.6, 0.45, 0.4], [-20, 0.75, 0.5, 0.75], [0, 1, 0.62, 0.1]];
  for (const [dx, hk, wk, po] of parts) blaze(c, bx + dx, by, HF.w * wk, HF.h * hk * 0.95, (ph + po) % 1, { tongues: 3, seed: Math.round(Math.abs(dx) + v * 7) });
}
/** The fire along the world's rim: two stretches between the tower and the citadel. */
const FIRE_LINE_X = [250, 708];
const FIRE_LINE_W = 460;
const RIM_H = 40;

/** The fire along the world's rim, far off (phase ph loops): flames in clusters along the horizon, here tall, there
 * low or broken off, each on its own beat. w×h, their feet along the bottom. */
function rimFire(c: Ctx, w: number, h: number, ph: number, seed: number): void {
  const rr = rng(hashStr('su:rim' + seed));
  const n = 40;
  const o1 = rr() * P2;
  const o2 = rr() * P2;
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.2 + rr() * 0.6) / n) * w;
    const u = x / w;
    const env = (0.5 + 0.5 * Math.sin(u * P2 * 2.3 + o1)) * (0.55 + 0.45 * Math.sin(u * P2 * 5.1 + o2));
    if (env < 0.12 && rr() < 0.7) continue;
    const fh = h * (0.18 + env * 0.8) * (0.6 + rr() * 0.4);
    blaze(c, x, h - 1, (w / n) * (1.6 + rr()), fh, (ph + rr()) % 1, { tongues: 2 + Math.floor(rr() * 2), seed: i + seed * 50 });
  }
}
/** A bridge flame's foot on the deck and its scale. */
const fireAt = (f: { t: number; v: number; s: number }): [number, number, number] => {
  const [x, y] = onBridge(f.t, f.v);
  return [x, y + deckW(f.t) * 0.06, Math.min(1, deckW(f.t) / 44) * f.s];
};

/** The still's flames along the bridge (the first phase), the watch-fire, the halls' fires and the smoke. */
function stillFires(ctx: Ctx, which: 'bridge' | 'citadel' | 'basket' | 'horizon'): void {
  const frame = (x: number, y: number, s: number, ph: number, seed: number, tongues = 4) => {
    const [c, g] = makeCanvas(FIRE_FRAME.w, FIRE_FRAME.h);
    blaze(g, FIRE_FRAME.w / 2, FIRE_FRAME.h - 4, FIRE_FRAME.w * 0.8, FIRE_FRAME.h * 0.9, ph, { tongues, seed });
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(c, x - (FIRE_FRAME.w / 2) * s, y - FIRE_FRAME.h * s, FIRE_FRAME.w * s, FIRE_FRAME.h * s);
    ctx.restore();
  };
  if (which === 'bridge') {
    const front = frontAt(0);
    BRIDGE_FIRES.forEach((f, i) => {
      if (f.t < front) return;
      const [x, y, s] = fireAt(f);
      frame(x, y, s, (i * 0.37) % 1, i % 5);
    });
  } else if (which === 'citadel') {
    // the smoke first, then the flames under it
    for (const sm of CIT_SMOKE) {
      if (sm.from > 0) continue;
      const [c, g] = makeCanvas(SM.w, SM.h);
      smokeColumn(g, SM.w, SM.h, 0.37);
      ctx.drawImage(c, sm.x - SM.w * SM_SRC * sm.s, sm.y - (SM.h - 4) * sm.s, SM.w * sm.s, SM.h * sm.s);
    }
    HALL_FIRES.forEach((f, i) => {
      if (f.from > 0) return;
      const [c, g] = makeCanvas(HF.w, HF.h);
      hallFireFrame(g, (i * 0.29) % 1, i);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(c, f.x - (HF.w / 2) * f.s * HF.k, f.y - HF.h * f.s * HF.k, HF.w * f.s * HF.k, HF.h * f.s * HF.k);
      ctx.restore();
    });
  } else if (which === 'basket') {
    const [c, g] = makeCanvas(90, 120);
    blaze(g, 45, 116, 72, 102, 0.4, { tongues: 5, seed: 5 });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(c, BF.basket.x - 45, BF.basket.y - 8 - 120);
    glowAt(ctx, BF.basket.x, BF.basket.y - 40, 150, '#ff8a3a', 0.3, 1);
    ctx.restore();
  } else {
    for (const [x, s, ph] of [[560, 1.1, 0.2], [940, 0.85, 0.6]] as const) {
      const [c, g] = makeCanvas(SM.w, SM.h);
      smokeColumn(g, SM.w, SM.h, ph);
      ctx.drawImage(c, x - SM.w * SM_SRC * s, HOR + 4 - SM.h * s, SM.w * s, SM.h * s);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // (as the live layer lays its two stretches)
    FIRE_LINE_X.forEach((x, i) => {
      const [c, g] = makeCanvas(FIRE_LINE_W, RIM_H);
      rimFire(g, FIRE_LINE_W, RIM_H, 0.3, i);
      ctx.drawImage(c, x, HOR + 3 - RIM_H);
    });
    ctx.restore();
  }
}

export const SURTR: SceneSpec = {
  id: 'surtr',
  info: {
    name: 'The Burning Bridge',
    subtitle: 'Boss: SURTR THE FIRE GIANT',
    ambient: [],
    // (the fire, the smoke and the embers are the live layer's)
    glows: [],
    light: '#ffa070',
    tableTint: '#ffe4d0',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: HOR + 4 }, draw: sky },
    { id: 'skyLive', box: SKY_LIVE, motion: 'slot', draw: () => {} },
    { id: 'horizonStill', box: SKY_LIVE, stillOnly: true, draw: (c) => stillFires(c, 'horizon') },
    { id: 'drop', box: { x: 0, y: HOR, w: W, h: PAR - HOR + 14 }, draw: drop },
    { id: 'citadel', box: CIT_BOX, draw: citadel },
    { id: 'citadelLive', box: CIT_LIVE, motion: 'slot', draw: () => {} },
    { id: 'citadelStill', box: CIT_LIVE, stillOnly: true, draw: (c) => stillFires(c, 'citadel') },
    { id: 'cloudSea', box: CLOUD_BOX, motion: 'slot', draw: () => {} },
    { id: 'cloudSeaStill', box: CLOUD_BOX, stillOnly: true, draw: (c) => {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const [sc, sg] = makeCanvas(Math.ceil(SEA.w * SEA.res), Math.ceil(SEA.h * SEA.res));
      seaFrame(sg, 0.3);
      c.globalAlpha = 0.55;
      c.drawImage(sc, 0, HOR + 4, SEA.w, SEA.h);
      c.restore();
      cloudSea(c);
    } },
    { id: 'bridgeGlow', box: { x: 360, y: 400, w: 1080, h: PAR - 400 }, liveOnly: true, res: 0.25, draw: (c) => bridgeGlow(c, 'source-over', keepStub) },
    { id: 'bridgeGlowStill', box: { x: 360, y: 400, w: 1080, h: PAR - 400 }, stillOnly: true, draw: (c) => bridgeGlow(c, 'lighter', () => true) },
    { id: 'bridge', box: BRIDGE_BOX, draw: (c) => {
      bridgePiece(c, null, BREAKS.a);
      bridgePiece(c, BREAKS.c, null);
    } },
    { id: 'spanFar', box: SPAN_FAR, motion: 'sprite', draw: (c) => bridgePiece(c, BREAKS.b, BREAKS.c) },
    { id: 'spanNear', box: SPAN_NEAR, motion: 'sprite', draw: (c) => bridgePiece(c, BREAKS.a, BREAKS.b) },
    { id: 'bridgeHot', box: BRIDGE_BOX, liveOnly: true, res: 0.5, draw: (c) => {
      c.globalCompositeOperation = 'lighter';
      crackLight(c, 0.9, keepStub);
    } },
    { id: 'bridgeLive', box: BRIDGE_BOX, motion: 'slot', draw: () => {} },
    { id: 'shimmerStill', box: BRIDGE_BOX, stillOnly: true, draw: (c) => {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.34;
      c.translate(DECK_BOX.x, DECK_BOX.y);
      c.save();
      c.beginPath();
      c.rect(0, 0, bz(0.4)[0] - DECK_BOX.x, DECK_BOX.h);
      c.clip();
      causticFrame(c, 0.2, 1);
      c.restore();
    } },
    { id: 'bridgeFireStill', box: BRIDGE_BOX, stillOnly: true, draw: (c) => stillFires(c, 'bridge') },
    { id: 'tower', box: TOWER_BOX, draw: parCut(relit(TOWER_BOX, (c, r) => {
      tower(c, r);
      towerSoot(c, r);
    }, LEFT_LIGHT)) },
    { id: 'beam', box: BEAM_BOX, draw: relit(BEAM_BOX, (c) => beam(c), LEFT_LIGHT) },
    { id: 'abutment', box: ABUT_BOX, draw: parCut(relit(ABUT_BOX, abutment, LEFT_LIGHT)) },
    { id: 'horn', box: HORN_BOX, motion: 'sprite', draw: relit(HORN_BOX, (c) => horn(c), LEFT_LIGHT) },
    { id: 'stone', box: STONE_BOX, draw: parCut(relit(STONE_BOX, (c, r) => {
      runeStone(c, r);
      basket(c);
    }, STONE_LIGHT, ['#5a3a40', '#3a2228'])) },
    { id: 'basketStill', box: { x: BF.basket.x - 160, y: BF.basket.y - 200, w: 320, h: 260 }, stillOnly: true, draw: (c) => stillFires(c, 'basket') },
    { id: 'pennantStill', box: { x: BF.tower.px - 4, y: PEN_Y - PEN.h / 2, w: PEN.w + 10, h: PEN.h }, stillOnly: true, draw: (c) => {
      c.translate(BF.tower.px - 4, PEN_Y - PEN.h / 2);
      pennantBurnt(c, 0.3);
    } },
    { id: 'bannerStill', box: { x: BF.banner.x - 10, y: BF.banner.y - 4, w: BNF.w, h: BNF.h }, stillOnly: true, draw: (c) => {
      c.translate(BF.banner.x - 10, BF.banner.y - 2);
      bannerBurnt(c, 0.3, 0.6);
    } },
    { id: 'parapet', box: { x: 0, y: PAR, w: W, h: TY - PAR + 8 }, draw: parapetBurnt },
    { id: 'table', box: { x: 0, y: TY - 4, w: W, h: 1080 - TY + 4 }, draw: tableBurnt },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

type Img = Phaser.GameObjects.Image;
type Cont = Phaser.GameObjects.Container;

/** A span of the bridge that breaks away and falls: its sprite and its flames in a container hinged at one end. */
class Span {
  readonly c: Cont;
  readonly fires: { loop: Loop; f: { t: number; v: number; s: number }; k: number; lx: number; ly: number; s: number }[] = [];
  state: 'up' | 'shake' | 'hinge' | 'fall' | 'gone' = 'up';
  private t = 0;
  private vx = 0;
  private vy = 0;
  private w = 0;
  private a = 1;
  constructor(readonly k: KitLive, readonly img: Img, readonly hx: number, readonly hy: number, readonly dir: number, into: Cont, readonly t0: number, readonly t1: number) {
    this.c = k.sc.add.container(hx, hy);
    into.add(this.c);
    k.root.remove(img);
    img.setPosition(img.x - hx, img.y - hy);
    this.c.add(img);
  }
  /** Break: shudder, hinge down off the break, fall. */
  go(): void {
    if (this.state !== 'up') return;
    this.state = 'shake';
    this.t = 0;
  }
  /** Back in place (the stages page cycling back to the first phase). */
  reset(): void {
    this.state = 'up';
    this.vy = 0;
    for (const f of this.fires) f.loop.each((im) => im.setRotation(0));
    this.c.setPosition(this.hx, this.hy).setRotation(0).setScale(1).setAlpha(1).setVisible(true);
    this.a = 1;
  }
  hide(): void {
    this.state = 'gone';
    this.c.setVisible(false);
  }
  /** How much its flames stream out as it drops. */
  get stretch(): number {
    return this.state === 'fall' ? 1 + Math.min(0.8, this.vy / 400) : 1;
  }
  /** Returns true on the frame it sinks into the cloud floor. */
  update(dt: number): boolean {
    this.t += dt;
    if (this.state === 'shake') {
      this.c.setRotation(Math.sin(this.t * 60) * 0.006 * Math.min(1, this.t * 2)).setPosition(this.hx + Math.sin(this.t * 47) * 1.2, this.hy);
      if (this.t > 0.9) {
        this.state = 'hinge';
        this.t = 0;
        this.w = 0;
      }
    } else if (this.state === 'hinge') {
      // hanging on at one end a moment, the other end dropping
      this.w += this.dir * 2.8 * dt;
      this.c.rotation += this.w * dt;
      if (this.t > 0.45) {
        this.state = 'fall';
        this.t = 0;
        this.vx = this.dir * -12;
        this.vy = 20;
      }
    } else if (this.state === 'fall') {
      this.vy += 260 * dt;
      this.c.x += this.vx * dt;
      this.c.y += this.vy * dt;
      this.c.rotation += this.w * dt;
      // going away and down: a little smaller, darker, then into the cloud
      this.c.setScale(Math.max(0.6, this.c.scaleX - dt * 0.12));
      const sink = clamp01((this.c.y - this.hy - 20) / 60);
      this.a = 1 - sink;
      this.c.setAlpha(this.a);
      if (this.a <= 0) {
        this.state = 'gone';
        this.c.setVisible(false);
        return true;
      }
    }
    // its flames stay upright as it tips, and stream taller as it drops
    if (this.state === 'hinge' || this.state === 'fall') {
      for (const f of this.fires) f.loop.each((im) => im.setRotation(-this.c.rotation));
    }
    return false;
  }
}

registerKitScene(SURTR, (k: KitLive, wave0: number) => {
  const top = k.slot('top');
  const skyS = k.slot('skyLive');
  const citS = k.slot('citadelLive');
  const cloudS = k.slot('cloudSea');
  const brS = k.slot('bridgeLive');
  const glowS = k.sprite('bridgeGlow').setBlendMode(Phaser.BlendModes.ADD);
  const hotS = k.sprite('bridgeHot').setBlendMode(Phaser.BlendModes.ADD);
  const hornS = new Swing(k.pivot(k.sprite('horn'), BF.hinge.x, BF.hinge.y), { k: 5, c: 0.55, idle: 0.006, seed: 1, speed: 0.7 });

  // ——— the sky: fire along the world's rim, smoke columns off it, the glow under the deck ———
  const SMW = SM.w;
  const SMH = SM.h;
  const RS = 0.38;
  const SN = 8;
  const smokeKey = sheet(k, 'su_smoke', SMW * RS, SMH * RS, SN, (c, ph) => {
    c.scale(RS, RS);
    smokeColumn(c, SMW, SMH, ph);
  });
  const skyGlows = [[420, HOR - 10, 420], [760, HOR - 20, 300], [1080, HOR - 10, 260]].map(([x, y, r]) => k.glow(x, y, r, 0xff5a20, 0, { into: skyS, sy: 0.35 }));
  // (each its own height and spread, so they don't all lean alike)
  const horizonSmoke = [[560, 1.1, 0, 0.8], [940, 0.85, 0, 1.25], [380, 0.95, 0.34, 1.1], [760, 1.05, 0.67, 0.75]].map(([x, s, from, sx], i) => ({ from, loop: new Loop(k, smokeKey, SN, x, HOR + 4, { into: skyS, origin: [SM_SRC, 1], sx: (s * sx) / RS, sy: s / RS, fps: 0.75 + i * 0.12, phase: i * 2.3 }) }));
  const RF = 0.6;
  const fireLines = FIRE_LINE_X.map((x, i) => {
    const key = sheet(k, 'su_rimfire' + i, FIRE_LINE_W * RF, RIM_H * RF, 6, (c, ph) => {
      c.scale(RF, RF);
      rimFire(c, FIRE_LINE_W, RIM_H, ph, i);
    });
    return new Loop(k, key, 6, x, HOR + 3, { into: skyS, origin: [0, 1], scale: 1 / RF, add: true, fps: 6, phase: i * 2.7 });
  });

  // ——— the citadel: its halls' fires, its smoke ———
  const FW = FIRE_FRAME.w;
  const FH = FIRE_FRAME.h;
  const fireKey = sheet(k, 'su_fire', FW, FH, FIRE_FRAME.n, (c, ph) => blaze(c, FW / 2, FH - 4, FW * 0.8, FH * 0.9, ph, { tongues: 4, seed: 2 }));
  const citSmoke = CIT_SMOKE.map((s, i) => ({ s, loop: new Loop(k, smokeKey, SN, s.x, s.y + 4, { into: citS, origin: [SM_SRC, 1], scale: s.s / RS, fps: 1.1, phase: i * 3.1 }) }));
  const hfKey = [0, 1].map((v) => sheet(k, 'su_hallfire' + v, HF.w, HF.h, 8, (c, ph) => hallFireFrame(c, ph, v)));
  const hallFires = HALL_FIRES.map((f, i) => ({ f, k: 0, loop: new Loop(k, hfKey[i % 2], 8, f.x, f.y, { into: citS, origin: [0.5, 1], scale: f.s * HF.k, add: true, fps: 9, phase: i * 2.1 }), glow: k.glow(f.x, f.y - 10, 50 * f.s, 0xff7a2a, 0, { into: citS }) }));

  // ——— the fire-sea under the cloud gaps, and the cloud sea drifting over it ———
  const sw = Math.ceil(SEA.w * SEA.res);
  const shh = Math.ceil(SEA.h * SEA.res);
  const seaKey = sheet(k, 'su_sea', sw, shh, SEA.n, (c, ph) => seaFrame(c, ph));
  const sea = new Loop(k, seaKey, SEA.n, 0, HOR + 4, { into: cloudS, origin: [0, 0], scale: 1 / SEA.res, add: true, fps: 1.6 });
  const floorGlows = [[185, 664, 150], [720, 664, 130], [1225, 664, 140], [1760, 664, 130]].map(([x, y, r]) => k.glow(x, y, r, 0xff4a18, 0, { into: cloudS, sy: 0.3 }));
  const clouds = CLOUDS.map((c) => {
    const cv = fireCloud(c.kind);
    const key = k.tex('su_cloud' + c.kind, Math.ceil(cv.width * 0.4), Math.ceil(cv.height * 0.4), (g) => g.drawImage(cv, 0, 0, cv.width * 0.4, cv.height * 0.4));
    const im = k.img(key, c.x, c.y, { into: cloudS, scale: c.s / 0.4, origin: [0.5, CBY(c.kind) / cv.height] });
    im.setData('v', c.v);
    return im;
  });
  const splash = new Parts(k, { frame: 'puff', into: cloudS, max: 40 });
  const flashes: { img: Img; t: number }[] = [];

  // ——— the bridge: its guttering shimmer, its spans, its flames ———
  const RC = 0.28;
  const CN = 8;
  // (only the near part still shimmers: the sheet holds just that)
  const cKey = sheet(k, 'su_caustic', (bz(0.42)[0] - DECK_BOX.x) * RC, DECK_BOX.h * RC, CN, (c, ph) => causticFrame(c, ph, RC));
  const shimmer = new Loop(k, cKey, CN, DECK_BOX.x, DECK_BOX.y, { into: brS, origin: [0, 0], scale: 1 / RC, add: true, fps: 1.6 });
  shimmer.each((im) => im.setTint(0xffb890));
  const spanFar = new Span(k, k.sprite('spanFar'), bz(SU.tc)[0], deckTop(SU.tc) + deckW(SU.tc) / 2, -1, brS, SU.tb, SU.tc);
  const spanNear = new Span(k, k.sprite('spanNear'), bz(SU.ta)[0], deckTop(SU.ta) + deckW(SU.ta) / 2, 1, brS, SU.ta, SU.tb);
  // (the span sprites sit in the slot now: the flames go over them)
  const flames = BRIDGE_FIRES.map((f, i) => {
    const [x, y, s] = fireAt(f);
    const span = f.t > SU.ta && f.t < SU.tb ? spanNear : f.t > SU.tb && f.t < SU.tc ? spanFar : null;
    const into = span ? span.c : brS;
    const ox = span ? span.c.x : 0;
    const oy = span ? span.c.y : 0;
    const loop = new Loop(k, fireKey, FIRE_FRAME.n, x - ox, y - oy, { into, origin: [0.5, 1], scale: s, fps: 10, phase: i * 2.7 });
    const fl = { f, k: 0, s, loop, lx: x - ox, ly: y - oy, span };
    span?.fires.push(fl);
    return fl;
  });
  const sparks = new Parts(k, { frame: 'spark', add: true, into: brS, max: 60 });
  const RSH = 1;
  const shardKey = sheet(k, 'su_shard', SHARD_HALF * 2 * RSH, SHARD_HALF * 2 * RSH, 8, (c, _p, i) => shardFrame(c, i));
  const shards = new Parts(k, { frame: 'spark', sheet: { key: shardKey, n: 8, half: SHARD_HALF }, into: brS, max: 70 });
  const shardBurst = (pts: Pt[], n: number, vy0 = 0) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = pts[Math.floor(crand() * pts.length)];
      shards.spawn({ x: x + (crand() - 0.5) * 6, y, vx: (crand() - 0.5) * 70, vy: vy0 - crand() * 60, life: 1.1 + crand() * 0.7, r0: 3 + crand() * 5, r1: 2, a: 1, tint: 0xffffff, grav: 300, spin: (crand() - 0.5) * 12, fade: 0.02 });
    }
  };

  // ——— the terrace: pennant, banner, watch-fire ———
  const RP = 0.6;
  const penKey = sheet(k, 'su_pennant', PEN.w * RP, PEN.h * RP, PEN.n, (c, ph) => {
    c.scale(RP, RP);
    pennantBurnt(c, ph);
  });
  const pennant = new Loop(k, penKey, PEN.n, BF.tower.px - 4, PEN_Y, { into: top, origin: [0, 0.5], scale: 1 / RP, fps: 7 });
  const RN = 0.8;
  const banKey = sheet(k, 'su_banner', BNF.w * RN, BNF.h * RN, BNF.n, (c, ph) => {
    c.scale(RN, RN);
    bannerBurnt(c, ph, 1);
  });
  const banner = new Loop(k, banKey, BNF.n, BF.banner.x - 10, BF.banner.y - 2, { into: top, origin: [0, 0], scale: 1 / RN, fps: 3.4 });
  const BW2 = 90;
  const BH2 = 120;
  const RW = 0.9;
  const wfKey = sheet(k, 'su_watchfire', BW2 * RW, BH2 * RW, 8, (c, ph) => {
    c.scale(RW, RW);
    blaze(c, BW2 / 2, BH2 - 4, BW2 * 0.8, BH2 * 0.85, ph, { tongues: 5, seed: 5 });
  });
  const watch = new Loop(k, wfKey, 8, BF.basket.x, BF.basket.y - 8, { into: top, origin: [0.5, 1], scale: 1 / RW, add: true, fps: 11 });
  const watchGlow = k.glow(BF.basket.x, BF.basket.y - 30, 190, 0xff8a3a, 0.3, { into: top });

  // ——— embers, ash, grit, the flash ———
  const embers = new Parts(k, { frame: 'ember', add: true, into: top, max: 150 });
  const emberRate = new Rate();
  const watchEmbers = new Rate();
  const ash = new Parts(k, { frame: 'mote', into: top, max: 60 });
  const ashRate = new Rate();
  const grit = new Parts(k, { frame: 'mote', into: top, max: 80 });
  const dust = new Parts(k, { frame: 'puff', into: top, max: 30 });
  const flash = k.wash(0xff8a40, 0, Phaser.BlendModes.ADD, top);
  const sift = (x0: number, x1: number, y: number, floor: number, n: number) => {
    for (let i = 0; i < n; i++) grit.spawn({ x: x0 + crand() * (x1 - x0), y, vx: 4 + crand() * 14, vy: 10 + crand() * 30, life: 2, r0: 2.2 + crand() * 2.4, a: 0.9, tint: 0x8a7a78, grav: 420, drag: 0.4, floor, fade: 0.05 });
  };

  // ——— the fight's progress ———
  const sc = k.sc as unknown as { bossFoot?: { alive: boolean; phase: number } | null; director?: { phaseCount?(f: unknown): number } };
  // (in a run the arena is wave 5 and starts at the first phase; on the stages page waves 1–4 stand in for the phases)
  const fromWave = (w: number) => (w >= 5 ? 0 : (Math.max(1, w) - 1) / 3);
  // once the boss has been seen, the arena keeps the fight's progress (through his death and after)
  let seen = false;
  let target = fromWave(wave0);
  const boss = () => {
    const b = sc.bossFoot;
    if (!b || !b.alive) return null;
    let n = 4;
    try {
      n = sc.director?.phaseCount?.(b) ?? 4;
    } catch {
      n = 4;
    }
    return n > 1 ? clamp01((b.phase - 1) / (n - 1)) : 0;
  };
  {
    const b = boss();
    if (b !== null) {
      target = b;
      seen = true;
    }
  }
  let shown = target;
  let last = target;
  if (target >= 0.6) spanFar.hide();
  if (target >= 0.95) spanNear.hide();
  for (const f of flames) if (f.f.t >= frontAt(shown)) f.k = 1;
  for (const h of hallFires) if (h.f.from <= shown + 0.01) h.k = 1;
  let flare = 0;
  let kick = 0;
  let kickV = 0;
  let wind = 0.6;
  let nearT = -1;

  const sinkBurst = (x: number) => {
    const g = k.glow(x, 660, 240, 0xff6a24, 0.9, { into: cloudS, sy: 0.35 });
    flashes.push({ img: g, t: 0 });
    for (let i = 0; i < 14; i++) splash.spawn({ x: x + (crand() - 0.5) * 160, y: 650 + crand() * 20, vx: (crand() - 0.5) * 60, vy: -20 - crand() * 50, life: 1.6 + crand(), r0: 16, r1: 60 + crand() * 40, a: 0.5, tint: 0x3a1a1a, drag: 1.2, fade: 0.15 });
    for (let i = 0; i < 26; i++) embers.spawn({ x: x + (crand() - 0.5) * 140, y: 650, vx: (crand() - 0.5) * 160, vy: -160 - crand() * 220, life: 1.6 + crand(), r0: 3 + crand() * 3, r1: 1, a: 1, tint: crand() < 0.5 ? 0xffc050 : 0xff6a20, grav: 60, drag: 0.6, streak: 0.03, fade: 0.05 });
  };

  /** A new phase: the fire leaps, a flash, the horn rocks. */
  const surge = (p: number) => {
    flash.setAlpha(0.16 + p * 0.08);
    flare = Math.max(flare, 1);
    hornS.kick(0.4);
    for (let i = 0; i < 30; i++) embers.spawn({ x: crand() * W, y: PAR - 10 - crand() * 140, vx: 40 + (crand() - 0.5) * 80, vy: -140 - crand() * 200, life: 2 + crand(), r0: 3 + crand() * 2.5, r1: 1, a: 1, tint: crand() < 0.5 ? 0xffb040 : 0xff5a1a, grav: -10, drag: 0.3, streak: 0.025, fade: 0.05 });
  };

  return {
    setWave: (w) => {
      if (!seen && boss() === null) target = fromWave(w);
    },
    impact(x, _y, p) {
      flare = Math.min(1.6, flare + 0.4 + p * 0.6);
      kickV -= 3 + p * 4;
      hornS.kick((x < 960 ? 1 : -1) * (0.35 + p * 0.25));
      wind = Math.min(2, wind + 0.3 * p);
      // sparks off the bridge's flames
      for (let i = 0; i < 6 + p * 8; i++) {
        const lit = flames.filter((f) => f.k > 0.5 && f.f.t < 0.6 && (!(f.f.t > SU.ta && f.f.t < SU.tc)));
        const f = lit.length ? lit[Math.floor(crand() * lit.length)] : null;
        if (!f) break;
        const [fx, fy] = fireAt(f.f);
        sparks.spawn({ x: fx, y: fy - 20 * f.s, vx: (crand() - 0.5) * 120, vy: -80 - crand() * 140, life: 0.7 + crand() * 0.5, r0: 4 + crand() * 4, r1: 1, a: 1, tint: crand() < 0.5 ? 0xffd070 : 0xff7a2a, grav: 240, fade: 0.05 });
      }
      // shards off the broken ends
      if (spanFar.state === 'gone') shardBurst(spanNear.state === 'gone' ? BREAKS.a : BREAKS.b, Math.round(1 + p * 4), 0);
      if (spanFar.state === 'gone') shardBurst(BREAKS.c, Math.round(1 + p * 3), 0);
      sift(14, 220, BF.tower.gal + 16, PAR - 4, Math.round(3 + p * 6));
      if (p > 0.3) {
        sift(BF.abut.x0, BF.abut.x1, BF.abut.top + 4, PAR - 2, Math.round(2 + p * 4));
        sift(BF.stone.x0 + 10, BF.stone.x1 - 10, BF.stone.top + 6, PAR - 2, Math.round(2 + p * 4));
      }
      // ash and soot shaken off the coping, embers kicked up off it, bouncing back down
      const cx = Math.max(40, Math.min(W - 40, x));
      for (let i = 0; i < 2 + p * 3; i++) dust.spawn({ x: cx + (crand() - 0.5) * 70, y: PAR + 4, vx: (crand() - 0.3) * 70, vy: -20 - crand() * 40, life: 1.3 + crand(), r0: 12, r1: 40 + crand() * 26, a: 0.35, tint: 0x6a5a5c, drag: 1.2, fade: 0.12 });
      for (let i = 0; i < 3 + p * 5; i++) embers.spawn({ x: cx + (crand() - 0.5) * 120, y: PAR, vx: (crand() - 0.5) * 120, vy: -100 - crand() * 140, life: 1.2 + crand() * 0.6, r0: 2.5 + crand() * 2, r1: 1, a: 1, tint: 0xff8a30, grav: 380, floor: PAR + 2, bounce: 0.35, streak: 0.02, fade: 0.05 });
    },
    update(dt, t) {
      const cm = calm();
      const b = boss();
      if (b !== null) {
        target = b;
        seen = true;
      }
      if (target > last + 0.05) surge(target);
      last = target;
      shown += (target - shown) * Math.min(1, dt * 0.45);
      const p = shown;
      const front = frontAt(p);
      // the spans: the far one goes on the third phase, the near one when the sword comes out (a beat after the far
      // one if both go at once)
      if (target >= 0.6 && spanFar.state === 'up') {
        spanFar.go();
        shardBurst(BREAKS.b, 10, -40);
        shardBurst(BREAKS.c, 8, -40);
        flare = 1.4;
      }
      if (target >= 0.95 && spanNear.state === 'up' && nearT < 0) nearT = spanFar.state === 'up' || spanFar.state === 'shake' || spanFar.state === 'hinge' ? 2.2 : 0.4;
      if (nearT >= 0) {
        nearT -= dt;
        if (nearT < 0) {
          spanNear.go();
          shardBurst(BREAKS.a, 12, -40);
          flare = 1.4;
        }
      }
      if (target < 0.95 && spanNear.state !== 'up') {
        spanNear.reset();
        nearT = -1;
      }
      if (target < 0.6 && spanFar.state !== 'up') spanFar.reset();
      for (const sp of [spanFar, spanNear]) {
        const st = sp.state;
        if (sp.update(dt)) sinkBurst(sp.c.x);
        // shards trail off it as it falls
        if ((st === 'hinge' || st === 'fall') && crand() < dt * 14) {
          const [x, y] = onBridge(lerp(sp.t0, sp.t1, crand()), 1 + crand());
          shards.spawn({ x: x + (sp.c.x - sp.hx), y: y + (sp.c.y - sp.hy), vx: (crand() - 0.5) * 40, vy: sp.state === 'fall' ? 60 : 10, life: 0.9, r0: 2 + crand() * 4, r1: 1.5, a: 1, tint: 0xffffff, grav: 300, spin: (crand() - 0.5) * 10, fade: 0.02 });
        }
      }

      // the stomp's kick: the flames duck, then flare back (a spring)
      kickV += (-kick * 60 - kickV * 7) * dt;
      kick += kickV * dt;
      flare = Math.max(0, flare - dt * 0.8);

      // the bridge's flames: igniting as the front runs past them
      for (const f of flames) {
        const want = f.f.t >= front ? 1 : 0;
        if (want > f.k) f.k = Math.min(1, f.k + dt * 1.4);
        else if (want < f.k) f.k = Math.max(0, f.k - dt * 0.8);
        const lit = f.k > 0.01;
        f.loop.a.setVisible(lit);
        f.loop.b.setVisible(lit);
        if (!lit) continue;
        f.loop.step(dt, (0.9 + wind * 0.2) * cm);
        // (a new flame flares up big, then settles)
        const born = f.k < 1 ? 1 + Math.sin(f.k * Math.PI) * 0.5 : 1;
        const sy = f.s * f.k * born * (1 + kick * 0.04) * (1 + flare * 0.08) * (f.span?.stretch ?? 1);
        f.loop.each((im) => im.setScale(f.s * Math.min(1, f.k * 1.5), sy));
        f.loop.alpha = Math.min(1, f.k * 1.4) * 0.85;
      }
      // the shimmer guttering out; the cracks hotter phase by phase
      shimmer.step(dt, cm);
      shimmer.alpha = clamp01(1 - p / 0.55) * 0.8 * (0.7 + 0.3 * Math.sin(t * 5.3) * Math.sin(t * 2.1));
      hotS.setAlpha(clamp01(0.25 + p * 0.55 + flare * 0.35 + 0.08 * Math.sin(t * 3.1)));
      glowS.setAlpha(clamp01(0.8 + p * 0.3 + flare * 0.2));

      // the sky and the fire below, building
      for (const [i, g] of skyGlows.entries()) g.setAlpha((0.18 + p * 0.3) * (0.85 + 0.15 * Math.sin(t * (1.3 + i * 0.4) + i)));
      for (const hs of horizonSmoke) {
        hs.loop.step(dt, cm);
        hs.loop.alpha = clamp01((p - hs.from) / 0.15 + 1) * 0.85;
      }
      for (const fl of fireLines) {
        fl.step(dt, cm);
        fl.alpha = (0.7 + p * 0.3) * (0.85 + 0.15 * Math.sin(t * 3.1 + fl.a.x));
      }
      sea.step(dt, cm);
      sea.alpha = 0.45 + p * 0.35;
      for (const [i, g] of floorGlows.entries()) g.setAlpha((0.12 + p * 0.15) * (0.8 + 0.2 * Math.sin(t * (0.9 + i * 0.3) + i * 2)));
      // the clouds drifting over the fire, their undersides breathing with it
      const fk = 0.85 + 0.1 * Math.sin(t * 1.7) + p * 0.1;
      const ctint = Phaser.Display.Color.GetColor(255, Math.round(Math.min(255, 200 * fk)), Math.round(Math.min(255, 180 * fk)));
      for (const c of clouds) {
        c.x += Number(c.getData('v')) * (0.6 + wind * 0.5) * dt * cm;
        const hw = (c.width * c.scaleX) / 2;
        if (c.x - hw > W + 20) c.x = -hw - 20;
        c.setTint(ctint);
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        const fl = flashes[i];
        fl.t += dt;
        fl.img.setAlpha(Math.max(0, 0.9 - fl.t * 0.6));
        if (fl.t > 1.6) {
          fl.img.destroy();
          flashes.splice(i, 1);
        }
      }

      // the citadel: more of it alight phase by phase
      for (const [i, h] of hallFires.entries()) {
        const want = h.f.from <= p + 0.01 ? 1 : 0;
        h.k += (want - h.k) * Math.min(1, dt * 0.8);
        h.loop.step(dt, cm);
        h.loop.alpha = h.k;
        h.loop.each((im) => im.setScale(h.f.s * 0.7 * (0.6 + 0.4 * h.k) * (1 + p * 0.25)));
        h.glow.setAlpha(h.k * (0.35 + 0.1 * Math.sin(t * 8 + i)));
      }
      for (const cs of citSmoke) {
        cs.loop.step(dt, cm);
        cs.loop.alpha = clamp01((p - cs.s.from) / 0.15 + 1) * 0.9;
      }

      // the wind: hot, gusting, rising with the fire
      const base = 0.6 + p * 0.6 + 0.3 * Math.max(0, Math.sin(t * 0.37) * Math.sin(t * 0.91 + 1));
      wind += (base - wind) * Math.min(1, dt * 0.7);
      pennant.step(dt, (0.5 + wind * 0.8) * cm);
      banner.step(dt, (0.5 + wind * 0.6) * cm);
      hornS.update(dt, t);

      // the watch-fire, roaring
      watch.step(dt, (0.9 + wind * 0.3) * cm);
      watch.each((im) => im.setScale((1 / RW) * (1 + kick * 0.03), (1 / RW) * (1 + kick * 0.05 + flare * 0.06)));
      watchGlow.setAlpha(0.3 + 0.08 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23) + flare * 0.1);
      watchEmbers.tick(6 * cm, dt, () => {
        embers.spawn({ x: BF.basket.x + (crand() - 0.5) * 40, y: BF.basket.y - 30, vx: 30 + wind * 50 + (crand() - 0.5) * 40, vy: -60 - crand() * 80, life: 1.4 + crand(), r0: 3 + crand() * 2, r1: 1, a: 0.9, tint: crand() < 0.5 ? 0xffb040 : 0xff6a20, grav: -20, drag: 0.5, streak: 0.02, fade: 0.1 });
      });
      // embers rising out of the drop; ash drifting down onto the terrace
      emberRate.tick((14 + p * 30) * cm, dt, () => {
        embers.spawn({ x: crand() * (W + 200) - 200, y: PAR - 4 - crand() * 160, vx: 40 + wind * 60 + (crand() - 0.5) * 40, vy: -70 - crand() * 130, life: 2.5 + crand() * 2, r0: 2 + crand() * 2.5, r1: 0.8, a: 0.85, tint: crand() < 0.5 ? 0xffa030 : 0xff5a1a, grav: -10, drag: 0.3, streak: 0.025, fade: 0.1 });
      });
      ashRate.tick((5 + p * 6) * cm, dt, () => {
        ash.spawn({ x: crand() * W, y: -10, vx: 20 + wind * 20, vy: 26 + crand() * 22, life: 14, r0: 1.6 + crand() * 1.6, a: 0.55, tint: crand() < 0.6 ? 0x5a4c4e : 0x2a2224, drag: 0, floor: PAR - 2, fade: 0.05, spin: (crand() - 0.5) * 3 });
      });
      flash.setAlpha(Math.max(0, flash.alpha - dt * 0.25));

      sparks.update(dt);
      shards.update(dt);
      splash.update(dt);
      embers.update(dt);
      ash.update(dt);
      grit.update(dt);
      dust.update(dt);
    },
  };
});
