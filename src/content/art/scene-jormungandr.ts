// The Edge of the World (Jörmungandr's arena, the mini-boss of the Bifröst stage, Act 8), redrawn with the location kit
// (src/art/scene): the last rock at the rim of Midgard, where the world-sea runs out and pours over the edge into the
// void. The same storm that rolled over Bifröst (scene-bifrost.ts), the same rune-cut stone as Jotunheim
// (scene-jotunheim.ts).
//
// A strange storm sky: a heavy deck, mammatus hanging from its base lit from beneath by the cold violet glow of
// the void, a rift high on the left where a wan, greenish sun shows through and lets shafts of light down onto the sea.
// Under the deck, beyond the world's rim, the void itself, lit from far below by a cold violet light, the spray of the
// endless fall billowing up out of it. The world-sea runs out to the rim across the whole view; on the right the edge
// comes round towards us, the sea streaming to a glassy lip and tumbling over it, spray thrown up into the dark. Along
// the rim, far off and hazed in the mist, the world serpent's coils break the surface (it lies in the ocean ringing the
// world): blue-black scaled arches against the abyss's light, barnacles on their crowns. On the left,
// a tall rune-cut sea stack, a carved ring of the serpent biting its tail on its face, and at its foot a longship
// wrecked on a skerry (its back broken, the dragon prow rearing, the torn sail and the shields still on the rail). On
// the right, the last stack of Midgard stands on the brink with the old fishing line wrapped round it: a hawser that
// runs down to a ledge where the great iron hook still lies through the ox-head bait of the old tale. The table is a
// slab of that last rock: wet, dark slate, salt crusted, a tide pool or two, the serpent ring carved along its front.
//
// The strip behind the table (where the fight's coils lie and the head rises from the gaps) is dark, calm sea; every
// backdrop coil is far out on the rim, small and hazed, never near the fight's own.
//
// There are no waves here: the storm follows the fight (the serpent's phase, read from the game scene; on the stages
// page waves 1–4 stand in for it): the sky darkens, the lightning comes oftener, the swell runs higher, the spray
// thickens.
//
// Live, the heroes:
// - the world's edge: the sea streaming to the lip (foam flecks speeding up as they go) and shooting off it in spray
//   that arcs out and falls away past the edge; banks of spray billowing up off the far rim and plumes off the near
//   edge (painted frames);
// - the sea surging: crests of swell (strips, scaled for their distance) running out to the rim; every big swell
//   bursts white up the stacks (a painted burst of torn sheets and streaking drops, then drops with physics), and a
//   stomp heaves the sea and bursts it up the rocks nearest;
// - the far coils turning: each loop rolling through the sea (painted frames: its scales and spines running along it,
//   water sheeting off it, white water churning where it breaks the surface), lightning (painted bolts) stabbing down
//   past the rim into the void, flashing the deck and the stacks' edges; at every stomp grit and spray fall off the
//   stacks and the old line on the brink twitches.

import Phaser from 'phaser';
import { type Air, type Ctx, type PathFn, type R, TY, W, airMix, calmLanes, crevice, creviceV, glowAt, gradeAll, lightPool, polyPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { foamLace, grain, tableFalloff, tableSeam, water } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { cloud, skyFill, stars } from '../../art/scene/sky';
import { hashStr, makeCanvas, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, lerp, registerKitScene } from '../../game/sceneLive';
import { wave1 } from './sceneBits';
import type { Pt } from './scene-rink';
import { carvedRune } from './scene-jotunheim';

// ——— layout ———

export const JG = {
  front: 1040,
  /** The far rim of the world (where the sea pours over), straight across as far as edge0. */
  rim: 520,
  /** Where the edge starts to come round towards us on the right. */
  edge0: 1140,
  /** The deck's base (eye level): the void shows between it and the rim. */
  deck: 404,
  /** The rift in the storm and the wan sun in it. */
  sun: { x: 352, y: 122, r: 21 },
  rift: { x: 380, y: 140, rx: 300, ry: 110 },
  /** The tall stack on the left: its middle, its foot in the sea, its crown, its half width. */
  lstack: { cx: 152, base: 656, top: 146 },
  /** The last stack, on the brink. */
  rstack: { cx: 1784, base: 654, top: 306 },
  /** Where the hawser is wrapped round the last stack, and the ledge at its foot (the hook and the ox head on it). */
  wrap: { y: 486 },
  ledge: { x0: 1548, x1: 1712, y: 622 },
  skull: { x: 1622, y: 606 },
  /** The wrecked longship's prow (the dragon's head). */
  prow: { x: 588, y: 452 },
};

const P2 = Math.PI * 2;
const RIM = JG.rim;
const INK = '#04050c';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** The spray-laden air between us and the rim, lit by the void's violet glow. */
const AIR: Air = { color: '#4a4c84', far: 0.82 };
/** The rune-cut stone in the storm (Jotunheim's granite, wet and dark). */
const ROCK = { lit: '#8a94b6', body: '#3a425e', shade: '#1a1e32', deep: '#090b16' };
const WOOD = { lit: '#5e4c40', body: '#342820', shade: '#1c1412', deep: '#0c0808' };
const IRON = { hi: '#a8907c', lit: '#4e4240', body: '#2c2424', dark: '#100c0e', rust: '#6e3a20', rustDk: '#2e160e' };
/** The wan sun's light (greenish white: a strange sun). */
const SUNL = '#e4f0d8';

/** The sea's edge on screen at x: the rim (straight), then the near edge coming round to us. */
export function edgeY(x: number): number {
  if (x <= JG.edge0) return RIM + wave1(x, 3) * 0.6;
  const u = (x - JG.edge0) / (W - JG.edge0);
  return RIM + u ** 1.7 * 176 + wave1(x, 5) * 1.2;
}
/** How big things are on the sea at screen y (1 at the table's back edge). */
const kAt = (y: number) => Math.max(0.08, (y - 470) / (TY - 470));

/** The top of an outline at x (the highest point of any of its edges crossing x), or null. */
function topAt(pts: Pt[], x: number): number | null {
  let best: number | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if (x < Math.min(ax, bx) || x > Math.max(ax, bx) || ax === bx) continue;
    const y = ay + ((x - ax) / (bx - ax)) * (by - ay);
    if (best === null || y < best) best = y;
  }
  return best;
}

// ——— the void beyond the rim ———

const VOID_TOP = 300;
const VOID_BOT = Math.ceil(edgeY(W)) + 6;

/** The void under the world, seen past the rim: lit from far below by a cold violet light welling up out of the abyss
 * (brightest at the rim, where the sea pours into it), darkening upwards into a starry black under the deck. */
function voidBelow(ctx: Ctx, r: R): void {
  vfill(ctx, 0, VOID_TOP, W, VOID_BOT - VOID_TOP, [[0, '#06071a'], [0.22, '#12122e'], [0.32, '#201e4a'], [0.55, '#5450a0'], [1, '#4c4898']]);
  // (stars only up where it's dark)
  stars(ctx, r, { x: 0, y: JG.deck - 10, w: W, h: 70 }, 120, '#e4eaff');
  softly(ctx, { x: 0, y: VOID_TOP, w: W, h: VOID_BOT - VOID_TOP }, (g) => {
    for (const [x, y, rx, ry, col, a] of [[760, 500, 760, 70, '#9a94ff', 0.3], [1560, 610, 520, 130, '#8c86f0', 0.35], [1180, 470, 340, 50, '#7ac0e0', 0.12], [220, 500, 360, 60, '#8a7ce8', 0.22]] as const) {
      const rg = g.createRadialGradient(x, y, 0, x, y, rx);
      rg.addColorStop(0, rgba(col, a));
      rg.addColorStop(1, rgba(col, 0));
      g.fillStyle = rg;
      g.save();
      g.translate(x, y);
      g.scale(1, ry / rx);
      g.translate(-x, -y);
      g.fillRect(x - rx, y - rx, rx * 2, rx * 2);
      g.restore();
    }
  }, 0.2);
  lay(ctx, noiseMask(10, 503, { cover: 0.4, soft: 0.6, col: '#8a80e0', w: 320, h: 64 }), { x: 0, y: 420, w: W, h: VOID_BOT - 420 }, 0.1);
  // the light welling up along the rim, brightest where the water goes over
  // (column by column down to the edge: straight along the far rim, then down the near edge as it comes round)
  for (let x = 0; x < W; x += 4) {
    const y = edgeY(x) + 2;
    const y0 = RIM - 72;
    const lg = ctx.createLinearGradient(0, y0, 0, y);
    const k = 70 / (y - y0);
    lg.addColorStop(0, rgba('#b4b0ff', 0));
    lg.addColorStop(Math.max(0, 1 - k * 0.3), rgba('#c4c0ff', 0.3));
    lg.addColorStop(1, rgba('#eeeaff', 0.78));
    ctx.fillStyle = lg;
    ctx.fillRect(x, y0, 4.5, y - y0);
  }
}

// ——— the storm deck ———

const deckBase = (x: number) => JG.deck + wave1(x, 11) * 16 + wave1(x * 2.3, 17) * 7;

function sky(ctx: Ctx, r: R): void {
  voidBelow(ctx, r);
  const { rift, sun } = JG;
  const deckBox = { x: 0, y: 0, w: W, h: JG.deck + 30 };
  const deckPath = (c: Ctx) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(W, 0);
    for (let x = W; x >= 0; x -= 12) c.lineTo(x, deckBase(x));
    c.closePath();
  };
  // the deck's own murk and the rift's pale sky (the clouds are laid over, then torn open at the rift)
  ctx.save();
  deckPath(ctx);
  ctx.clip();
  skyFill(ctx, deckBox, [[0, '#04050b'], [0.4, '#090b18'], [0.75, '#10122a'], [1, '#1e1c44']], 0.04);
  lay(ctx, drift('#1a1c38', '#04050b', 4, 511, 160, 48), deckBox, 0.4);
  // the rift's sky: a cold, greenish pallor round the sun, deepening to slate at its edges
  softly(ctx, { x: rift.x - rift.rx - 60, y: 0, w: rift.rx * 2 + 120, h: rift.y + rift.ry + 60 }, (g) => {
    const rg = g.createRadialGradient(sun.x, sun.y, 0, rift.x, rift.y, rift.rx);
    rg.addColorStop(0, '#d0e0c0');
    rg.addColorStop(0.18, '#98ae9c');
    rg.addColorStop(0.5, '#4c5e6c');
    rg.addColorStop(1, '#262c48');
    g.fillStyle = rg;
    g.save();
    g.translate(rift.x, rift.y);
    g.scale(1, rift.ry / rift.rx);
    g.translate(-rift.x, -rift.y);
    g.fillRect(rift.x - rift.rx, rift.y - rift.rx, rift.rx * 2, rift.rx * 2);
    g.restore();
  }, 0.25);
  // the wan sun: a greenish disc in a soft bloom (no ring: just the bloom fading out)
  glowAt(ctx, sun.x, sun.y, 220, '#b4d4a4', 0.22);
  glowAt(ctx, sun.x, sun.y, 64, '#e0f0c8', 0.5);
  const sg = ctx.createRadialGradient(sun.x - sun.r * 0.3, sun.y - sun.r * 0.3, 0, sun.x, sun.y, sun.r);
  sg.addColorStop(0, '#f4fae4');
  sg.addColorStop(0.75, '#dcecc4');
  sg.addColorStop(1, '#c4d8ac');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.r, 0, P2);
  ctx.fill();
  // the deck: great dark banks, their faces towards the rift lit, on their own canvas, torn open at the rift
  const [cc, cg] = makeCanvas(W, JG.deck + 40);
  const o = { lit: '#56607e', body: '#0f1122', shadow: '#0a0c18', sunX: sun.x, sunY: sun.y, rim: 0.5, wisp: 0.35, kind: 'bank' as const, res: 0.5, soft: 3 };
  for (let row = 0; row < 4; row++) {
    const y = 64 + row * 62 + r() * 20;
    for (let x = -200 + r() * 160; x < W + 300; x += 360 + r() * 240) cloud(cg, r, x, y, 560 + r() * 380, 80 + r() * 50, { ...o, a: 0.97 });
  }
  // the lower deck rolling under them, its underside lit violet by the abyss
  const lo = { lit: '#7470bc', body: '#17172e', shadow: '#0c0c1e', sunX: 960, sunY: 1000, rim: 0.6, wisp: 0.3, kind: 'bank' as const, res: 0.5, soft: 3 };
  for (let x = -100 + r() * 100; x < W + 200; x += 280 + r() * 200) cloud(cg, r, x, JG.deck - 34 + r() * 20, 420 + r() * 260, 60 + r() * 30, { ...lo, a: 0.94 });
  // tear the rift open: a ragged hole with a firm edge
  const riftPts: Pt[] = [];
  const rr0 = rng(hashStr('jg:rift'));
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * P2;
    const k = 0.74 + 0.1 * Math.sin(a * 3 + 1) + 0.07 * Math.sin(a * 7) + 0.04 * Math.sin(a * 13 + 2) + (rr0() - 0.5) * 0.16;
    riftPts.push([rift.x + Math.cos(a) * rift.rx * k, rift.y + Math.sin(a) * rift.ry * k * (a > Math.PI ? 1.1 : 0.95)]);
  }
  const riftPath = smoothPath(riftPts);
  cg.save();
  cg.globalCompositeOperation = 'destination-out';
  cg.filter = 'blur(9px)';
  riftPath(cg);
  cg.fillStyle = '#000';
  cg.fill();
  cg.filter = 'none';
  cg.restore();
  // its torn edges catch the sun: a lit band round the hole on the clouds' own pixels
  cg.save();
  cg.globalCompositeOperation = 'source-atop';
  cg.filter = 'blur(7px)';
  cg.setLineDash([60, 40, 90, 30, 40, 70]);
  cg.strokeStyle = rgba('#c8d8bc', 0.5);
  cg.lineWidth = 22;
  riftPath(cg);
  cg.stroke();
  cg.filter = 'none';
  cg.setLineDash([]);
  const re = cg.createRadialGradient(sun.x, sun.y, rift.rx * 0.5, sun.x, sun.y, rift.rx * 1.6);
  re.addColorStop(0, rgba('#b4c4ac', 0.3));
  re.addColorStop(1, rgba('#b4c4ac', 0));
  cg.fillStyle = re;
  cg.fillRect(0, 0, rift.x + rift.rx * 1.8, rift.y + rift.ry * 2.4);
  cg.restore();
  ctx.drawImage(cc, 0, 0);
  // mammatus: lobes hanging from the deck's base in clusters, their bellies lit from beneath by the abyss, their
  // tops lost in the cloud (quieter over the middle)
  const rr = rng(hashStr('jg:mamma'));
  for (let c = 0; c < 16; c++) {
    const cx = (c + 0.2 + rr() * 0.6) * (W / 16);
    const mid = 0.35 + 0.65 * Math.min(1, Math.abs(cx - 960) / 640);
    const n = 3 + Math.floor(rr() * 4);
    for (let i = 0; i < n; i++) {
      const x = cx + (rr() - 0.5) * 120;
      const rad = 10 + rr() * 16;
      const y = deckBase(x) - 26 - rr() * 40 + rad * 0.4;
      const a = (0.28 + rr() * 0.3) * mid;
      const lg = ctx.createLinearGradient(0, y - rad, 0, y + rad);
      lg.addColorStop(0, rgba('#17172e', 0));
      lg.addColorStop(0.45, rgba('#24244a', a));
      lg.addColorStop(0.8, rgba('#5a56a0', a));
      lg.addColorStop(1, rgba('#8682cc', a * 0.9));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(x, y, rad * (1.1 + rr() * 0.4), rad, 0, 0, P2);
      ctx.fill();
    }
  }
  ctx.restore();
  // the deck's ragged lower edge, rimmed with the abyss's light
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba('#8a86e0', 0.16);
  ctx.lineWidth = 5;
  ctx.filter = 'blur(3px)';
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) (x ? ctx.lineTo(x, deckBase(x) - 1) : ctx.moveTo(x, deckBase(x) - 1));
  ctx.stroke();
  ctx.filter = 'none';
  ctx.restore();
  // shafts of the wan sun let down through the rift onto the sea on the left
  softly(ctx, { x: 0, y: 160, w: 1100, h: VOID_BOT - 160 }, (g) => {
    for (const [x0, x1, bx0, bx1, a] of [[250, 300, 300, 430, 0.07], [330, 372, 480, 600, 0.05], [410, 450, 690, 800, 0.035], [196, 226, 186, 266, 0.05]] as const) {
      const lg = g.createLinearGradient(0, 200, 0, VOID_BOT);
      lg.addColorStop(0, rgba(SUNL, 0));
      lg.addColorStop(0.25, rgba(SUNL, a));
      lg.addColorStop(1, rgba(SUNL, a * 0.6));
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(x0, 200);
      g.lineTo(x1, 200);
      g.lineTo(bx1, VOID_BOT);
      g.lineTo(bx0, VOID_BOT);
      g.closePath();
      g.fill();
    }
  }, 0.25, 'screen');
}

/** The deck's base lit by lightning (added live, flashed): soft blooms along its underside, away from the stacks. */
/** A stack's edges lit by the lightning behind it (added live, flashed): a hard white-violet rim along every edge that
 * faces up or away towards the void, soft inside it. */
function rimFlash(ctx: Ctx, pts: Pt[]): void {
  ctx.save();
  polyPath(pts)(ctx);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const xs = pts.map((p) => p[0]);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  for (const [w, a] of [[14, 0.25], [5, 0.6], [2, 0.9]] as const) {
    ctx.strokeStyle = rgba('#e4e0ff', a);
    ctx.lineWidth = w;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      // (the crown, and the far side: right of the middle, or any edge whose outward normal points up)
      if (!(ax > mid || by < ay - 1 || Math.min(ay, by) < Math.min(...pts.map((p) => p[1])) + 40)) continue;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function deckLit(ctx: Ctx): void {
  softly(ctx, { x: 0, y: 0, w: W, h: JG.deck + 40 }, (g) => {
    const rr = rng(hashStr('jg:decklit'));
    for (let i = 0; i < 26; i++) {
      const x = 300 + rr() * 1320;
      const y = 200 + rr() * 230;
      const rad = 90 + rr() * 160;
      const rg = g.createRadialGradient(x, y + rad * 0.3, 0, x, y, rad);
      rg.addColorStop(0, `rgba(200,196,255,${(0.16 + rr() * 0.16).toFixed(3)})`);
      rg.addColorStop(1, 'rgba(200,196,255,0)');
      g.fillStyle = rg;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // (fading out at the deck's base, so the flash never shows its box)
    g.globalCompositeOperation = 'destination-in';
    const fg = g.createLinearGradient(0, JG.deck - 90, 0, JG.deck + 20);
    fg.addColorStop(0, 'rgba(0,0,0,1)');
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fg;
    g.fillRect(0, 0, W, JG.deck + 40);
    g.globalCompositeOperation = 'source-over';
  }, 0.25);
}

/** Fade a frame's paint out towards its edges (w×h; m px of falloff on the sides, mt on the top, mb on the bottom), so
 * nothing in it is ever cut off square by the frame. */
function edgeFade(c: Ctx, w: number, h: number, m: number, mt: number, mb = 0): void {
  c.save();
  c.globalCompositeOperation = 'destination-in';
  const hg = c.createLinearGradient(0, 0, w, 0);
  hg.addColorStop(0, 'rgba(0,0,0,0)');
  hg.addColorStop(m / w, 'rgba(0,0,0,1)');
  hg.addColorStop(1 - m / w, 'rgba(0,0,0,1)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hg;
  c.fillRect(0, 0, w, h);
  const vg = c.createLinearGradient(0, 0, 0, h);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(mt / h, 'rgba(0,0,0,1)');
  vg.addColorStop(1 - Math.max(0.001, mb / h), 'rgba(0,0,0,1)');
  vg.addColorStop(1, mb ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
  c.fillStyle = vg;
  c.fillRect(0, 0, w, h);
  c.restore();
}

// ——— the wall of mist rising out of the void ———

const MW = 1400;
const MH = 150;
/** The spray of the endless fall billowing up off the far rim (MW×MH: the rim along its bottom, from the left of the
 * screen to just past where the edge comes round, where it dissolves into the plumes) at phase ph (0…1 loops): banks
 * of spray born at the rim, swelling, rolling up and over and thinning away, lit from beneath by the abyss, the void
 * showing between them. */
function mistTile(c: Ctx, seed: number, ph = 0.3, a = 1): void {
  const rr = rng(hashStr('jg:mist' + seed));
  const NB = 20;
  for (let k = 0; k < NB; k++) {
    const xc = ((k + 0.15 + rr() * 0.7) / NB) * MW;
    const big = 0.6 + rr() * 0.6;
    const drift = (rr() - 0.4) * 90;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const off = (i + rr() * 0.7) / n;
      const age = (ph + off) % 1;
      const life = Math.sin(age * Math.PI) ** 1.1;
      const y = MH - 8 - age * (MH * 0.42) * big;
      const x = xc + age * drift + (rr() - 0.5) * 30;
      const rad = (16 + rr() * 16) * big * (0.55 + age * 1.0);
      const al = (0.16 + rr() * 0.14) * a * life;
      if (al < 0.01) continue;
      // a billow: its belly lit from below, its crown fading into the dark
      const g = c.createRadialGradient(x, y + rad * 0.5, 0, x, y, rad);
      g.addColorStop(0, `rgba(222,218,255,${al.toFixed(3)})`);
      g.addColorStop(0.55, `rgba(146,142,218,${(al * 0.55).toFixed(3)})`);
      g.addColorStop(1, 'rgba(80,78,160,0)');
      c.fillStyle = g;
      c.save();
      c.translate(x, y);
      c.scale(2.4, 0.85);
      c.translate(-x, -y);
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      c.restore();
    }
  }
  // fading out up into the void, in at the rim (no hard foot: the sea's lip covers it), and away at the right end
  edgeFade(c, MW, MH, 0, MH * 0.55, 6);
  c.save();
  c.globalCompositeOperation = 'destination-in';
  const hg = c.createLinearGradient(0, 0, MW, 0);
  hg.addColorStop(0, 'rgba(0,0,0,1)');
  hg.addColorStop(1 - 320 / MW, 'rgba(0,0,0,1)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hg;
  c.fillRect(0, 0, MW, MH);
  c.restore();
}

/** A plume of spray off the near edge (phase ph loops), PW×PH, its source along the bottom: lobes swelling as they
 * climb and lean back on the updraught from the abyss. */
const PW = 220;
const PH = 300;
function plumeFrame(c: Ctx, ph: number, seed: number): void {
  const n = 12;
  const lobes: [number, number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const q = (ph + i / n) % 1;
    const rr = rng(hashStr('jg:plume' + seed + ':' + i));
    const y = PH - 20 - q * (PH - 60);
    const x = PW / 2 + (rr() - 0.5) * PW * 0.3 - q * q * PW * 0.12 + Math.sin(q * 5 + i * 1.7) * PW * 0.04;
    const rad = PW * (0.09 + 0.2 * q) * (0.8 + rr() * 0.4);
    const a = Math.min(1, q * 6) * (1 - q) ** 1.4 * 0.5;
    if (a >= 0.01) lobes.push([x, y, rad, a]);
  }
  // (the higher, older billows first: the young ones well up in front of them)
  lobes.sort((p, q) => p[1] - q[1]);
  for (const [x, y, rad, a] of lobes) {
    // the billow's body, its edge defined
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(138,134,210,${(a * 0.8).toFixed(3)})`);
    g.addColorStop(0.72, `rgba(118,114,196,${(a * 0.65).toFixed(3)})`);
    g.addColorStop(1, 'rgba(90,86,170,0)');
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    // its belly lit from beneath by the abyss
    const lx = x - rad * 0.1;
    const ly = y + rad * 0.45;
    const lg = c.createRadialGradient(lx, ly, 0, lx, ly, rad * 0.75);
    lg.addColorStop(0, `rgba(232,230,255,${(a * 0.85).toFixed(3)})`);
    lg.addColorStop(1, 'rgba(232,230,255,0)');
    c.fillStyle = lg;
    c.fillRect(x - rad, y - rad * 0.3, rad * 2, rad * 1.4);
    // its crown turned from the light, in shade
    const sx = x + rad * 0.25;
    const sy = y - rad * 0.45;
    const sg = c.createRadialGradient(sx, sy, 0, sx, sy, rad * 0.6);
    sg.addColorStop(0, `rgba(36,34,80,${(a * 0.55).toFixed(3)})`);
    sg.addColorStop(1, 'rgba(36,34,80,0)');
    c.fillStyle = sg;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 1.2);
  }
  edgeFade(c, PW, PH, 40, 90);
}
/** Where the plumes rise off the near edge (x, their scale). */
const PLUMES: [number, number][] = [[1230, 0.55], [1390, 0.75], [1560, 0.95], [1890, 1.2]];

function mistStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(MW / 2, MH / 2);
  g.scale(0.5, 0.5);
  mistTile(g, 0, 0.3);
  const [c2, g2] = makeCanvas(MW / 2, MH / 2);
  g2.scale(0.5, 0.5);
  mistTile(g2, 0, 0.8);
  // (as the live layer's two banks: a low one along the rim, a taller one behind it)
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.drawImage(c2, 0, RIM - MH * 1.15 + 6, MW, MH * 1.15);
  ctx.globalAlpha = 0.7;
  ctx.drawImage(c, 0, RIM - MH + 6, MW, MH);
  ctx.restore();
  for (const [x, s] of PLUMES) {
    const [pc, pg] = makeCanvas(PW / 2, PH / 2);
    pg.scale(0.5, 0.5);
    plumeFrame(pg, 0.35, 0);
    ctx.drawImage(pc, x - (PW * s) / 2, edgeY(x) - PH * s + 10, PW * s, PH * s);
  }
}

// ——— the world-sea ———

const SEA_BOT = TY + 4;
const seaPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(0, RIM);
  for (let x = 0; x <= W; x += 8) c.lineTo(x, edgeY(x));
  c.lineTo(W, SEA_BOT);
  c.lineTo(0, SEA_BOT);
  c.closePath();
};

function sea(ctx: Ctx, r: R): void {
  ctx.save();
  seaPath(ctx);
  ctx.clip();
  water(ctx, r, 0, W, RIM, SEA_BOT, {
    far: '#34366a', deep: '#181c34', near: '#05070e', sky: '#8a88d0', skyA: 0.3,
    ripple: '#9a9ad0', ripples: 260, swells: 16, crest: '#8c90c4', glitterX: 470, glitter: SUNL, glitterA: 0.1, glitterW: 170, seed: 523,
  });
  // the sea running out to the rim: long slicks combed towards the edge, the deep colour between them
  lay(ctx, noiseMask(12, 527, { cover: 0.35, soft: 0.5, col: '#3a3c70', w: 320, h: 40 }), { x: 0, y: RIM + 20, w: W, h: SEA_BOT - RIM - 20 }, 0.22);
  // the sun's shafts lying on the water on the left, and the void's glow reflected off the far water
  lightPool(ctx, 520, 600, 300, 50, SUNL, 0.05);
  lightPool(ctx, 300, 640, 180, 30, SUNL, 0.04);
  vfill(ctx, 0, RIM, W, 30, [[0, rgba('#b8b4ff', 0.16)], [1, rgba('#b8b4ff', 0)]]);
  // whitecaps on the swell, crowding towards the rim, fewer close in (a calm dark strip behind the table)
  for (let i = 0; i < 260; i++) {
    const t = r() ** 1.3;
    const y = RIM + 6 + t * (680 - RIM);
    const x = r() * W;
    if (y < edgeY(x) + 4) continue;
    const s = kAt(y);
    const len = (8 + r() * 22) * s;
    ctx.fillStyle = rgba('#c4c4ec', (0.1 + r() * 0.16) * (1 - t * 0.6));
    ctx.beginPath();
    ctx.ellipse(x, y, len, Math.max(0.6, 1.6 * s), 0, 0, P2);
    ctx.fill();
  }
  // the mid-sea: broad swells rolling out to the rim, light on their backs and dark in their troughs; the rim's glow
  // reflected down the water in long broken streaks; the stacks' and the wreck's dark reflections stretched on it
  lay(ctx, noiseMask(5, 531, { cover: 0.45, soft: 0.75, col: '#5a5c9c', w: 320, h: 20 }), { x: 0, y: RIM + 16, w: W, h: 130 }, 0.3);
  lay(ctx, noiseMask(6, 533, { cover: 0.4, soft: 0.7, col: '#05060f', w: 320, h: 20 }), { x: 0, y: RIM + 24, w: W, h: 130 }, 0.3);
  for (let i = 0; i < 140; i++) {
    const t = r() ** 1.4;
    const y = RIM + 4 + t * 110;
    const x = r() * JG.edge0;
    const len = (20 + r() * 80) * (0.4 + t);
    ctx.fillStyle = rgba('#c8c4ff', (0.14 - t * 0.1) * (0.4 + r() * 0.6));
    ctx.fillRect(x - len / 2, y, len, 1 + t * 1.5);
  }
  for (const [x0, x1] of [[50, 260], [1716, 1846]] as const) {
    for (let i = 0; i < 12; i++) {
      const y = 664 + i * 6;
      const w = (x1 - x0) * (0.8 - i * 0.04) * (0.6 + r() * 0.4);
      ctx.fillStyle = rgba('#05060e', 0.22 - i * 0.015);
      ctx.fillRect(x0 + (x1 - x0 - w) / 2 + (r() - 0.5) * 20, y, w, 3);
    }
  }
  // the near water: darker, the swell long and low
  vfill(ctx, 0, 640, W, SEA_BOT - 640, [[0, rgba('#03040a', 0)], [0.6, rgba('#03040a', 0.45)], [1, rgba('#03040a', 0.7)]]);
  ctx.restore();
  // on the right the sea streams to the lip and rolls over it
  lipRoll(ctx);
}

/** The sea running to the edge all along it and tipping over (in the base: the live layer runs the flow and the spray
 * over it): the water darkening and smoothing as it speeds up (a dark band right at the brink, so the edge reads against
 * the abyss's light), a glassy roll bending over (the light lying in it, combed along the flow), a lit line of white
 * water where it breaks, the water shooting off the lip in lit strands that arc out and fall away, a fringe of spray. */
function lipRoll(c: Ctx): void {
  const rr = rng(hashStr('jg:roll'));
  const depth = (x: number) => 3 + 36 * kAt(edgeY(x)) ** 1.2;
  const ang = (x: number) => Math.atan2(edgeY(x + 20) - edgeY(x - 20), 40);
  c.save();
  // the water darkening as it runs to the brink
  for (let x = 0; x <= W; x += 4) {
    const ey = edgeY(x);
    const k = kAt(ey + 10);
    const d = depth(x);
    const h = 12 + 80 * k;
    const lg = c.createLinearGradient(0, ey + d + h, 0, ey + 1);
    lg.addColorStop(0, rgba('#04050d', 0));
    lg.addColorStop(0.55, rgba('#04050d', 0.55));
    lg.addColorStop(1, rgba('#04050d', 0.8));
    c.fillStyle = lg;
    c.fillRect(x, ey + 1, 4.5, d + h);
  }
  // long glassy undulations lying parallel to the near edge, broken into lengths
  for (let j = 0; j < 7; j++) {
    const off = 10 + j * j * 3;
    for (const [dy, col, al] of [[1.5, '#04050c', 0.35], [0, '#8a8ccc', 0.2]] as const) {
      c.strokeStyle = rgba(col, al * (1 - j / 8));
      c.beginPath();
      let on = false;
      for (let x = JG.edge0 - 40; x <= W; x += 6) {
        const k = kAt(edgeY(x));
        const y = edgeY(x) + depth(x) + off * k + dy * k + wave1(x, 50 + j) * 2 * k;
        const vis = Math.sin(x * 0.011 + j * 2.1) + Math.sin(x * 0.037 + j) > -0.2;
        c.lineWidth = 0.8 + k * 1.4;
        if (vis && !on) c.moveTo(x, y);
        else if (vis) c.lineTo(x, y);
        on = vis;
      }
      c.stroke();
    }
  }
  // the roll: smooth water bending over, the abyss's light lying in it
  for (let x = 0; x <= W; x += 3) {
    const ey = edgeY(x);
    const d = depth(x);
    const lg = c.createLinearGradient(0, ey + d, 0, ey);
    lg.addColorStop(0, rgba('#3a3c6e', 0));
    lg.addColorStop(0.45, rgba('#7c7cc4', 0.4));
    lg.addColorStop(0.85, rgba('#c8c6ff', 0.62));
    lg.addColorStop(1, rgba('#f0ecff', 0.8));
    c.fillStyle = lg;
    c.fillRect(x, ey, 3.5, d);
  }
  // combed into streaks along the flow
  c.lineCap = 'round';
  for (let i = 0; i < 420; i++) {
    const x = rr() * W;
    const ey = edgeY(x);
    const d = depth(x);
    const a = ang(x);
    const t = rr();
    const len = d * (0.3 + rr() * 0.5);
    const px = x - Math.sin(a) * d * t;
    const py = ey + d * t;
    c.strokeStyle = rgba(rr() < 0.5 ? '#f0eeff' : '#2a2c56', 0.1 + rr() * 0.2);
    c.lineWidth = 0.6 + rr() * 1.2 * kAt(ey);
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(px + Math.sin(a) * len, py - Math.cos(a) * len);
    c.stroke();
  }
  // the break along the lip: a lit line of white water, thicker near us
  for (const [w, col] of [[5, rgba('#c8c6ff', 0.3)], [2, rgba('#f6f4ff', 0.85)]] as const) {
    c.strokeStyle = col;
    for (let x = 0; x < W; x += 12) {
      c.lineWidth = w * (0.35 + kAt(edgeY(x)));
      c.beginPath();
      c.moveTo(x, edgeY(x) + 0.5);
      c.lineTo(x + 12.5, edgeY(x + 12) + 0.5);
      c.stroke();
    }
  }
  // the water shooting off the lip: lit strands arcing out over the edge and falling away into the abyss
  for (let i = 0; i < 520; i++) {
    const x = rr() * W;
    const ey = edgeY(x);
    const s = kAt(ey) * 1.6 + 0.2;
    const a = ang(x);
    // (out: away from us, across the edge; on screen up and along the edge's normal)
    const ox = Math.sin(a);
    const oy = -Math.cos(a);
    const L = (6 + rr() * 16) * s;
    const ex = x + ox * L * 0.7 + (rr() - 0.5) * 4 * s;
    const eyy = ey + oy * L * 0.7 + L * 0.35;
    c.strokeStyle = rgba(rr() < 0.6 ? '#eae8ff' : '#a8a6e8', 0.25 + rr() * 0.4);
    c.lineWidth = (0.5 + rr() * 0.8) * s;
    c.beginPath();
    c.moveTo(x, ey);
    c.quadraticCurveTo(x + ox * L * 0.55, ey + oy * L * 0.9, ex, Math.min(eyy, ey - 1));
    c.stroke();
  }
  // a fringe of spray standing over it, and a veil of fine spray lit from below
  for (let i = 0; i < 420; i++) {
    const x = rr() * W;
    const ey = edgeY(x);
    const s = kAt(ey) + 0.3;
    const h = rr() ** 2 * 28 * s;
    c.fillStyle = rgba('#e8e6ff', (0.2 + rr() * 0.4) * (1 - h / (28 * s)));
    c.beginPath();
    c.arc(x + rr() * 6 * s, ey - h, (0.5 + rr()) * s, 0, P2);
    c.fill();
  }
  c.restore();
}

/** The box the still's flow and spray paint in. */
const LIP_BOX = { x: 990, y: RIM - 60, w: W - 990, h: 730 - RIM + 60 };

/** The flow streaming out to the near lip (streaks running, stretching as the water speeds up) and the spray tossed
 * up off it into the dark, at phase ph (the still: the live layer runs them as particles). */
function lipFlow(c: Ctx, ph: number): void {
  const a = 1;
  const rr = rng(hashStr('jg:lip'));
  c.save();
  c.lineCap = 'round';
  // flow lines: each a streak of foam or slick, drifting towards the edge along the flow (down-right, then out)
  for (let i = 0; i < 70; i++) {
    const x0 = 1000 + rr() * 900;
    const ey = edgeY(x0);
    const d0 = rr();
    const d = (d0 + ph * (0.6 + rr() * 0.5)) % 1;
    // distance in front of the lip (screen px), the streak shortening and tilting as the water speeds up
    const gap = (1 - d) ** 1.4 * 130 * kAt(ey + 30);
    const y = ey + 4 + gap;
    if (y > 740) continue;
    const s = kAt(y);
    const len = (4 + rr() * 10) * s * (0.6 + d * 1.2);
    const ang = Math.atan2(edgeY(x0 + 20) - edgeY(x0 - 20), 40);
    const al = (0.1 + rr() * 0.16) * Math.min(1, d * 4) * Math.min(1, (1 - d) * 6) * a;
    c.strokeStyle = rgba(rr() < 0.3 ? '#d8d6ff' : '#8a8cc4', al);
    c.lineWidth = Math.max(0.8, (1 + rr() * 1.4) * s);
    c.beginPath();
    c.moveTo(x0 - (Math.cos(ang) * len) / 2, y - (Math.sin(ang) * len) / 2);
    c.lineTo(x0 + (Math.cos(ang) * len) / 2, y + (Math.sin(ang) * len) / 2);
    c.stroke();
  }
  // spray tossed off the lip: drops flung up and out into the dark, falling away past the edge
  for (let i = 0; i < 160; i++) {
    const x = JG.edge0 - 30 + rr() * (W - JG.edge0 + 30);
    const ey = edgeY(x);
    const s = kAt(ey) * 1.4 + 0.25;
    const off = rr();
    const q = (ph * (1 + Math.floor(rr() * 2)) + off) % 1;
    const vy = 30 + rr() * 60;
    const yy = ey - (vy * q - 60 * q * q) * s;
    if (yy > ey) continue;
    const xx = x + q * (8 + rr() * 16) * s;
    const al = (0.25 + rr() * 0.4) * (1 - q) * a;
    c.fillStyle = rgba(rr() < 0.5 ? '#ecebff' : '#b4b2ee', al);
    c.beginPath();
    c.ellipse(xx, yy, (1 + rr() * 1.6) * s, (1 + rr() * 2.4) * s, 0, 0, P2);
    c.fill();
  }
  // a veil of fine spray hanging over the lip
  for (let x = JG.edge0; x < W; x += 30) {
    const y = edgeY(x);
    const s = kAt(y) + 0.3;
    const rg = c.createRadialGradient(x, y - 6 * s, 0, x, y - 6 * s, 40 * s);
    const al = (0.1 + 0.06 * Math.sin(x * 0.05 + ph * P2)) * a;
    rg.addColorStop(0, rgba('#d0ceff', al));
    rg.addColorStop(1, rgba('#d0ceff', 0));
    c.fillStyle = rg;
    c.fillRect(x - 40 * s, y - 46 * s, 80 * s, 80 * s);
  }
  c.restore();
}

// ——— the serpent's coils far out on the rim ———

/** A coil's frame (CW×CH; its arch centred at CW/2, the waterline at CY). */
const CW = 260;
const CH = 120;
const CY = 100;
/** The coils along the rim: x, waterline y, scale, flipped, phase offset. (Kept clear of the columns over the fight's
 * gaps, where the head rises: x 330, 760, 1160, 1590.) */
const COILS: [number, number, number, boolean, number][] = [
  [520, RIM + 4, 0.5, false, 0.1],
  [950, RIM + 5, 0.66, true, 0.45],
  [1378, Math.round(edgeY(1378)) + 3, 0.7, false, 0.7],
];
/** A loop of the world serpent arching up out of the sea at phase ph (0…1 loops), far off: a vast body seen against the
 * abyss's light, so a blue-black silhouette with a violet rim along its back, the sea showing under the arch; its
 * scales running along it as it rolls through, a row of small dark spines, barnacles on its crown, water sheeting off
 * it and churning white where it breaks the surface; hazed by the spray in the air. */
function coilFrame(c: Ctx, ph: number, d = 0.45): void {
  const T = P2 * ph;
  const cx = CW / 2;
  const half = 96;
  const hh = 56 + Math.sin(T) * 3;
  const at = (u: number): Pt => {
    const v = 1 - u;
    return [
      v * v * v * (cx - half) + 3 * v * v * u * (cx - half * 0.92) + 3 * v * u * u * (cx + half * 0.92) + u * u * u * (cx + half),
      v * v * v * CY + 3 * v * v * u * (CY - hh * 1.33) + 3 * v * u * u * (CY - hh * 1.33) + u * u * u * CY,
    ];
  };
  const N = 48;
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  const nrm: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const [x0, y0] = at(Math.max(0, u - 0.01));
    const [x1, y1] = at(Math.min(1, u + 0.01));
    const l = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = (y1 - y0) / l;
    const ny = -(x1 - x0) / l;
    const [x, y] = at(u);
    const w = 34 * (0.82 + 0.18 * Math.sin(u * Math.PI));
    outer.push([x + nx * w * 0.5, y + ny * w * 0.5]);
    inner.push([x - nx * w * 0.5, y - ny * w * 0.5]);
    nrm.push([nx, ny]);
  }
  const body = polyPath([...outer, ...inner.slice().reverse()]);
  const col = (h: string) => airMix(h, d, AIR);
  // its dark reflection on the sea under the arch
  const rg0 = c.createLinearGradient(0, CY, 0, CY + 16);
  rg0.addColorStop(0, 'rgba(6,8,20,0.45)');
  rg0.addColorStop(1, 'rgba(6,8,20,0)');
  c.fillStyle = rg0;
  c.fillRect(cx - half - 10, CY, half * 2 + 20, 16);
  c.save();
  body(c);
  const bg = c.createLinearGradient(cx - half, CY - hh, cx + half * 0.6, CY);
  bg.addColorStop(0, col('#2a3046'));
  bg.addColorStop(0.5, col('#161a2c'));
  bg.addColorStop(1, col('#0a0c18'));
  c.fillStyle = bg;
  c.fill();
  c.clip();
  // scales in rows across the body, running along it as it rolls through
  const step = 1 / 40;
  for (let u = (ph * step) % step; u < 1; u += step) {
    const k = Math.round(u * N);
    const [x, y] = at(u);
    const [nx, ny] = nrm[k];
    const ang = Math.atan2(ny, nx);
    for (let j = -1; j <= 1; j++) {
      c.strokeStyle = rgba(col('#4a5270'), 0.4 - Math.abs(j) * 0.1);
      c.lineWidth = 1;
      c.beginPath();
      c.arc(x + nx * j * 6.5, y + ny * j * 6.5, 3.6, ang - 1.1, ang + 1.1);
      c.stroke();
    }
  }
  // the water it carries up with it, darkening its lower flanks
  vfill(c, 0, CY - 20, CW, 21, [[0, 'rgba(4,6,14,0)'], [1, 'rgba(4,6,14,0.55)']]);
  c.restore();
  // the abyss's violet light along its back (it's against the light)
  c.lineCap = 'round';
  for (const [w, a] of [[4, 0.22], [1.8, 0.7]] as const) {
    c.strokeStyle = rgba('#d0ccff', a);
    c.lineWidth = w;
    c.beginPath();
    for (let i = 2; i <= N - 2; i++) {
      const [x, y] = outer[i];
      const [nx, ny] = nrm[i];
      if (i === 2) c.moveTo(x - nx * 1.2, y - ny * 1.2);
      else c.lineTo(x - nx * 1.2, y - ny * 1.2);
    }
    c.stroke();
  }
  // barnacles on its crown
  const rb = rng(hashStr('jg:barn'));
  for (let i = 0; i < 30; i++) {
    const u = 0.3 + rb() * 0.4;
    const k = Math.round(u * N);
    const [x, y] = outer[k];
    const [nx, ny] = nrm[k];
    const dd = 3 + rb() * 6;
    c.fillStyle = rgba(col('#8a8c9c'), 0.35 + rb() * 0.25);
    c.beginPath();
    c.arc(x - nx * dd, y - ny * dd, 0.7 + rb() * 1.1, 0, P2);
    c.fill();
  }
  // small dark spines along the crown, running along with it
  const fs = 1 / 12;
  for (let u = (ph * fs) % fs + fs * 0.5; u < 1; u += fs) {
    if (u < 0.18 || u > 0.82) continue;
    const k = Math.round(u * N);
    const [x, y] = outer[k];
    const [nx, ny] = nrm[k];
    const h = 4 + 2 * Math.sin(u * Math.PI);
    c.fillStyle = col('#0c0e1a');
    c.beginPath();
    c.moveTo(x - ny * 2.5, y + nx * 2.5);
    c.lineTo(x + nx * h, y + ny * h);
    c.lineTo(x + ny * 2.5, y - nx * 2.5);
    c.closePath();
    c.fill();
  }
  body(c);
  c.strokeStyle = rgba(INK, 0.4);
  c.lineWidth = 1;
  c.stroke();
  // water sheeting off it in thin streams down its sides
  const rs = rng(hashStr('jg:sheet'));
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1;
    const u0 = 0.5 + side * (0.12 + rs() * 0.28);
    const q = (ph * 2 + rs()) % 1;
    const [x, y] = at(u0);
    const len = 10 + q * 26;
    c.strokeStyle = rgba('#d8d6ff', 0.32 * (1 - q));
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x + side * 3, y + 4);
    c.quadraticCurveTo(x + side * (5 + q * 5), y + len * 0.5, x + side * (6 + q * 8), Math.min(CY, y + len));
    c.stroke();
  }
  // white water churning soft where it breaks the surface
  for (const ex of [cx - half, cx + half]) {
    for (let k = 0; k < 6; k++) {
      const q = (ph + k / 6) % 1;
      const x = ex + (k - 2.5) * 5 + Math.sin(q * P2 + k) * 4;
      const rad = 8 + q * 12;
      const fg = c.createRadialGradient(x, CY - 2 - q * 3, 0, x, CY - 2 - q * 3, rad);
      fg.addColorStop(0, rgba('#e8e6ff', 0.36 * (1 - q)));
      fg.addColorStop(1, rgba('#e8e6ff', 0));
      c.fillStyle = fg;
      c.save();
      c.translate(x, CY - 2);
      c.scale(1, 0.5);
      c.translate(-x, -(CY - 2));
      c.fillRect(x - rad, CY - 2 - rad, rad * 2, rad * 2);
      c.restore();
    }
  }
  // its wake: the sea pushed up in a long low swell along it
  c.strokeStyle = rgba('#b8b6ee', 0.22);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(cx - half - 24, CY + 3);
  c.quadraticCurveTo(cx, CY + 7 + Math.sin(T) * 1.5, cx + half + 24, CY + 3);
  c.stroke();
  edgeFade(c, CW, CH, 8, 4);
}

function coilsStill(ctx: Ctx): void {
  for (const [x, y, s, flip, ph] of COILS) {
    const [c, g] = makeCanvas(CW, CH);
    coilFrame(g, ph);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -s : s, s);
    ctx.drawImage(c, -CW / 2, -CY);
    ctx.restore();
  }
}

// ——— carving and rope ———

/** A line cut into stone (its path made by draw at an offset): the wall under its top-left edge in shadow, its far lip
 * catching the light, a dark groove. */
function cut(ctx: Ctx, draw: (c: Ctx, dx: number, dy: number) => void, w: number, a = 1): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  draw(ctx, w * 0.42, w * 0.5);
  ctx.strokeStyle = rgba('#b8c4e4', 0.3 * a);
  ctx.lineWidth = w;
  ctx.stroke();
  draw(ctx, 0, 0);
  ctx.strokeStyle = rgba('#04050c', 0.8 * a);
  ctx.lineWidth = w;
  ctx.stroke();
  draw(ctx, w * 0.18, w * 0.2);
  ctx.strokeStyle = rgba('#232a48', 0.9 * a);
  ctx.lineWidth = w * 0.4;
  ctx.stroke();
  ctx.restore();
}

/** A closed outline through pts, smoothed (quadratics through the midpoints). */
function smoothPath(pts: Pt[]): PathFn {
  return (c) => {
    c.beginPath();
    const n = pts.length;
    const mid = (i: number): Pt => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    const m0 = mid(n - 1);
    c.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const m = mid(i);
      c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
    }
    c.closePath();
  };
}

/** The serpent biting its own tail, cut in a ring (centre x, y; radius rad; band w wide): its body scaled across,
 * tapering to the tail, its head reaching back to close its jaws on it. */
function serpentRing(ctx: Ctx, x: number, y: number, rad: number, w: number, a = 1): void {
  const g0 = -0.45;
  const g1 = P2 - 1.0;
  const hw = (t: number) => (w / 2) * Math.min(1, (g1 - t) / 0.9 + 0.15);
  for (const side of [-1, 1]) {
    cut(ctx, (c, dx, dy) => {
      c.beginPath();
      for (let t = g0; t <= g1; t += 0.05) {
        const rr = rad + side * hw(t);
        const px = x + dx + Math.cos(t) * rr;
        const py = y + dy + Math.sin(t) * rr;
        if (t === g0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
    }, 2, a);
  }
  // scales across the band
  for (let t = g0 + 0.25; t < g1 - 0.25; t += 0.26) {
    cut(ctx, (c, dx, dy) => {
      const h = hw(t) - 0.8;
      c.beginPath();
      c.moveTo(x + dx + Math.cos(t) * (rad - h), y + dy + Math.sin(t) * (rad - h));
      c.quadraticCurveTo(x + dx + Math.cos(t + 0.1) * rad, y + dy + Math.sin(t + 0.1) * rad, x + dx + Math.cos(t) * (rad + h), y + dy + Math.sin(t) * (rad + h));
    }, 1.2, a * 0.7);
  }
  // the head: a wedge laid along the ring, reaching back (anticlockwise) over the gap to the tail's tip, jaws parted
  const ht = g0 - 0.02;
  const hx = x + Math.cos(ht) * rad;
  const hy = y + Math.sin(ht) * rad;
  const tx = -Math.sin(ht);
  const ty = Math.cos(ht);
  const nx = Math.cos(ht);
  const ny = Math.sin(ht);
  const L = w * 2.6;
  const head = (c: Ctx, dx: number, dy: number) => {
    c.beginPath();
    c.moveTo(hx + dx + nx * w * 0.6, hy + dy + ny * w * 0.6);
    c.quadraticCurveTo(hx + dx - tx * L * 0.5 + nx * w * 0.9, hy + dy - ty * L * 0.5 + ny * w * 0.9, hx + dx - tx * L + nx * w * 0.15, hy + dy - ty * L + ny * w * 0.15);
    c.lineTo(hx + dx - tx * L * 0.7, hy + dy - ty * L * 0.7);
    c.lineTo(hx + dx - tx * L - nx * w * 0.2, hy + dy - ty * L - ny * w * 0.2);
    c.quadraticCurveTo(hx + dx - tx * L * 0.5 - nx * w * 0.8, hy + dy - ty * L * 0.5 - ny * w * 0.8, hx + dx - nx * w * 0.6, hy + dy - ny * w * 0.6);
  };
  cut(ctx, head, 1.8, a);
  ctx.fillStyle = rgba('#04050c', 0.7 * a);
  ctx.beginPath();
  ctx.arc(hx - tx * L * 0.45 + nx * w * 0.25, hy - ty * L * 0.45 + ny * w * 0.25, 1.4, 0, P2);
  ctx.fill();
}

/** A band of runes cut round a stack between two cut lines (its middle sagging by sag as it goes round). */
function runeBand(ctx: Ctx, x0: number, x1: number, y: number, s: number, sag: number, seed: number, glow: number): void {
  const mx = (x0 + x1) / 2;
  const hw = (x1 - x0) / 2;
  const yAt = (x: number) => y + sag * (1 - ((x - mx) / hw) ** 2);
  for (const dy of [-s * 0.32, s * 1.25]) {
    cut(ctx, (c, dx, ddy) => {
      c.beginPath();
      for (let x = x0; x <= x1; x += 6) {
        if (x === x0) c.moveTo(x + dx, yAt(x) + dy + ddy);
        else c.lineTo(x + dx, yAt(x) + dy + ddy);
      }
    }, 2, 0.85);
  }
  for (let x = x0 + 8, i = 0; x < x1 - 8; x += s * 0.92, i++) {
    // (narrower towards the sides, where the band turns away round the stack)
    const k = 1 - ((x - mx) / hw) ** 4 * 0.5;
    carvedRune(ctx, seed + i * 3 + (i % 4), x, yAt(x), s * k, glow, 0.9);
  }
}

/** A hawser along pts, w thick: its strands laid in a twist, lit along its top, a dark outline. */
function rope(ctx: Ctx, pts: Pt[], w: number): void {
  const line = (c: Ctx) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  line(ctx);
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = w + 2.4;
  ctx.stroke();
  line(ctx);
  ctx.strokeStyle = '#4c4030';
  ctx.lineWidth = w;
  ctx.stroke();
  const step = w * 0.8;
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const l = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / l;
    const uy = (by - ay) / l;
    let s = carry;
    for (; s < l; s += step) {
      const x = ax + ux * s;
      const y = ay + uy * s;
      ctx.strokeStyle = rgba('#140e08', 0.75);
      ctx.lineWidth = Math.max(0.8, w * 0.2);
      ctx.beginPath();
      ctx.moveTo(x - uy * w * 0.45 - ux * w * 0.22, y + ux * w * 0.45 - uy * w * 0.22);
      ctx.lineTo(x + uy * w * 0.45 + ux * w * 0.22, y - ux * w * 0.45 + uy * w * 0.22);
      ctx.stroke();
    }
    carry = s - l;
  }
  ctx.translate(-w * 0.12, -w * 0.22);
  line(ctx);
  ctx.strokeStyle = rgba('#a89070', 0.5);
  ctx.lineWidth = w * 0.28;
  ctx.stroke();
  ctx.restore();
}

/** A sagging line from (x0, y0) to (x1, y1), n segments. */
function sagLine(x0: number, y0: number, x1: number, y1: number, sag: number, n = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    out.push([lerp(x0, x1, u), lerp(y0, y1, u) + Math.sin(u * Math.PI) * sag]);
  }
  return out;
}

// ——— the sea stacks ———

/** White water swirling round a rock's foot (x0…x1 at the waterline y; k its size with distance). */
function footFoam(ctx: Ctx, r: R, x0: number, x1: number, y: number, k: number): void {
  // the wash swirling round the foot: a lace of foam, torn into a net, thinning away from the rock
  const top = (x: number) => y + 12 * k + wave1(x, 41) * 6 * k + Math.sin(x * 0.05) * 2 * k;
  foamLace(ctx, r, top, x0 - 30, x1 + 30, 14 * k, { a: 0.32, col: '#d8d6f8', shadow: '#05060f', seed: Math.round(x0) });
  // streaks of foam drawn out on the swell round it
  ctx.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const x = x0 - 30 + r() * (x1 - x0 + 60);
    const yy = y + 4 + r() * 16 * k;
    const l = (8 + r() * 26) * k;
    ctx.strokeStyle = rgba('#b4b2e4', 0.12 + r() * 0.18);
    ctx.lineWidth = (0.8 + r()) * k;
    ctx.beginPath();
    ctx.moveTo(x - l, yy);
    ctx.quadraticCurveTo(x, yy - 1.5 * k, x + l, yy + r() * 2);
    ctx.stroke();
  }
}

/** A rune-cut sea stack (outline pts, crown top, foot base in the sea): bedded granite stepping up in ledges, lit on
 * its upper left by the rift, the void's violet light round its far edge, salt streaked down from the ledges, black
 * weed and barnacles at the waterline, its reflection broken on the swell. Returns its outline. */
function seaStack(ctx: Ctx, r: R, pts: Pt[], top: number, base: number, seed: number): PathFn {
  const path = polyPath(pts);
  const xs = pts.map((p) => p[0]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const cx = (x0 + x1) / 2;
  const hw = (x1 - x0) / 2;
  const box = { x: x0 - 4, y: top - 4, w: x1 - x0 + 8, h: base - top + 8 };
  // its dark reflection on the water, broken by the swell (on the sea only: never over the abyss past the edge)
  ctx.save();
  seaPath(ctx);
  ctx.clip();
  softly(ctx, { x: x0 - 40, y: base - 20, w: x1 - x0 + 120, h: 76 }, (g) => {
    g.fillStyle = 'rgba(2,3,10,0.5)';
    g.beginPath();
    g.ellipse(cx + 22, base + 8, hw + 36, 16, 0, 0, P2);
    g.fill();
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(2,3,10,0.28)';
      g.fillRect(x0 + r() * hw, base + 12 + i * 8, hw * (0.6 + r() * 0.8), 3);
    }
  }, 0.5);
  ctx.restore();
  within(ctx, path, () => {
    const lg = ctx.createLinearGradient(x0, 0, x1, 0);
    lg.addColorStop(0, ROCK.lit);
    lg.addColorStop(0.42, ROCK.body);
    lg.addColorStop(0.76, ROCK.shade);
    lg.addColorStop(1, ROCK.deep);
    ctx.fillStyle = lg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    surface(ctx, r, box, ROCK.body, { over: true, vary: 0.35, cells: 3, mottle: 0.35, strokes: 1, strokeAng: Math.PI / 2, strokeLen: 50, strokeW: 5, grain: 0.25, grainKind: 'speckle', seed });
    grain(ctx, box, 'speckle', 0.2, 1.4);
    // the round of the column: a light band down its lit side, the core shadow past its middle, the far edge
    // lifted by the void's glow
    const form = ctx.createLinearGradient(x0, 0, x1, 0);
    form.addColorStop(0, 'rgba(200,210,230,0)');
    form.addColorStop(0.2, 'rgba(200,210,230,0.26)');
    form.addColorStop(0.4, 'rgba(200,210,230,0)');
    form.addColorStop(0.62, 'rgba(3,4,10,0)');
    form.addColorStop(0.8, 'rgba(3,4,10,0.5)');
    form.addColorStop(0.93, 'rgba(3,4,10,0.25)');
    form.addColorStop(1, 'rgba(120,116,220,0.32)');
    ctx.fillStyle = form;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    // feldspar and mica through it
    for (let i = 0; i < (box.w * box.h) / 300; i++) {
      const lit = r() < 0.4;
      ctx.fillStyle = rgba(lit ? '#a8b2d0' : '#06070e', lit ? 0.12 + r() * 0.12 : 0.25 + r() * 0.2);
      ctx.fillRect(box.x + r() * box.w, box.y + r() * box.h, 1.2 + r() * 2.4, 1 + r() * 1.6);
    }
    // its crown catches the rift's light; its foot dark and wet
    vfill(ctx, box.x, top, box.w, base - top, [[0, rgba('#c0ccd8', 0.2)], [0.25, rgba('#c0ccd8', 0)], [0.72, rgba(ROCK.deep, 0.18)], [1, rgba(ROCK.deep, 0.6)]]);
    // the bedding: strata dipping gently across it, each parting a dark undercut under a lit lip, broken off short
    // where joints cut them; the joints running down between
    const dip = (seed % 2 ? 1 : -1) * 0.07;
    for (let y = top + 30 + r() * 14; y < base - 70; y += 30 + r() * 34) {
      const bend = (x: number) => y + (x - cx) * dip + Math.sign(y - JG.deck) * (1 - ((x - cx) / hw) ** 2) * 4 + wave1(x, y) * 2.5;
      const a0 = x0 + r() * hw * 0.5;
      const a1 = x1 - r() * hw * 0.6;
      ctx.strokeStyle = rgba(ROCK.deep, 0.42 + r() * 0.2);
      ctx.lineWidth = 2 + r() * 4;
      ctx.beginPath();
      for (let x = a0; x <= a1; x += 6) (x === a0 ? ctx.moveTo(x, bend(x) + 3) : ctx.lineTo(x, bend(x) + 3));
      ctx.stroke();
      ctx.strokeStyle = rgba('#a8b4d4', 0.24);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = a0; x <= Math.min(a1, cx + hw * 0.3); x += 6) (x === a0 ? ctx.moveTo(x, bend(x)) : ctx.lineTo(x, bend(x)));
      ctx.stroke();
      // salt and the birds' lime streaked down from the ledge here and there
      for (let k = 0; k < 3; k++) {
        if (r() < 0.45) continue;
        const sx = a0 + r() * (a1 - a0);
        const sl = 10 + r() * 40;
        const sg = ctx.createLinearGradient(0, bend(sx) + 4, 0, bend(sx) + 4 + sl);
        sg.addColorStop(0, rgba('#d0d4e4', 0.24));
        sg.addColorStop(1, rgba('#d0d4e4', 0));
        ctx.fillStyle = sg;
        ctx.fillRect(sx, bend(sx) + 4, 1.4 + r() * 2.4, sl);
      }
    }
    for (let i = 0; i < 4; i++) {
      const jx = x0 + hw * (0.3 + r() * 1.4);
      const jy = top + 20 + r() * (base - top - 160);
      creviceV(ctx, jx, jy, jy + 60 + r() * 90, 4, 0.35, '#03040a');
      crack(ctx, r, jx, jy, Math.PI / 2 + (r() - 0.5) * 0.2, 60 + r() * 90, { col: INK, lip: '#9aa6cc', w: 1.6, a: 0.55, branch: 0.25 });
    }
    // black and wet where the spray reaches, a band of barnacles, then the weed hanging in a dark mat at the waterline
    const wl = base - 40;
    vfill(ctx, box.x, wl - 90, box.w, 90, [[0, rgba('#04050c', 0)], [1, rgba('#04050c', 0.45)]]);
    for (let i = 0; i < (x1 - x0) * 0.7; i++) {
      const x = x0 + r() * (x1 - x0);
      const y = wl - 30 + r() ** 0.6 * 30;
      const s = 0.6 + r() * 1.1;
      ctx.fillStyle = rgba('#8a8c98', 0.2 + r() * 0.2);
      ctx.beginPath();
      ctx.ellipse(x, y, s * 1.3, s, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#04050c', 0.45);
      ctx.fillRect(x - 0.4, y - 0.2, 0.9, 0.6);
    }
    const mat = (x: number) => wl + Math.abs(Math.sin(x * 0.11)) * 5 + wave1(x, 23) * 4;
    ctx.fillStyle = '#12140c';
    ctx.beginPath();
    ctx.moveTo(x0 - 4, base + 6);
    for (let x = x0 - 4; x <= x1 + 4; x += 3) ctx.lineTo(x, mat(x));
    ctx.lineTo(x1 + 4, base + 6);
    ctx.closePath();
    ctx.fill();
    // its fronds: lit a little where they hang over, olive-dark, wet
    for (let x = x0; x < x1; x += 5 + r() * 6) {
      const y = mat(x) + 2;
      ctx.strokeStyle = rgba('#2c2c1a', 0.4 + r() * 0.25);
      ctx.lineWidth = 1 + r();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 1.5, y + 6, x + (r() - 0.5) * 3, y + 9 + r() * 10);
      ctx.stroke();
    }
    // wet sheen on the black rock near the foot, catching the void's glow
    for (let i = 0; i < 26; i++) {
      const x = x0 + r() * (x1 - x0);
      const y = wl - 60 + r() * 50;
      ctx.fillStyle = rgba('#b0aef0', 0.08 + r() * 0.1);
      ctx.fillRect(x, y, 1 + r() * 2, 3 + r() * 8);
    }
  });
  // the void's light round its far edge from behind, the rift's on its upper-left shoulder
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba('#b4b0ff', 0.6);
  ctx.lineWidth = 6;
  ctx.beginPath();
  pts.filter(([x]) => x > cx + hw * 0.3).forEach(([x, y], i) => (i ? ctx.lineTo(x - 1.5, y) : ctx.moveTo(x - 1.5, y)));
  ctx.stroke();
  ctx.strokeStyle = rgba('#d4e0cc', 0.32);
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.filter(([x, y]) => x < cx + hw * 0.4 && y < top + (base - top) * 0.55).forEach(([x, y], i) => (i ? ctx.lineTo(x + 1.5, y + 1.5) : ctx.moveTo(x + 1.5, y + 1.5)));
  ctx.stroke();
  ctx.restore();
  // (one outline, open at its foot: the sea takes it there)
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  return path;
}

const LSTACK: Pt[] = [[34, 664], [44, 630], [38, 604], [52, 590], [46, 560], [60, 520], [54, 488], [68, 470], [62, 430], [74, 396], [70, 360], [84, 330], [78, 300], [90, 262], [86, 228], [98, 196], [94, 176], [110, 160], [124, 166], [138, 150], [156, 156], [170, 144], [186, 152], [198, 170], [210, 166], [216, 196], [210, 236], [226, 262], [220, 300], [234, 330], [228, 372], [244, 404], [238, 444], [254, 470], [248, 512], [262, 540], [256, 584], [270, 606], [264, 632], [276, 664]];

function leftStack(ctx: Ctx, r: R): void {
  const { top, base } = JG.lstack;
  seaStack(ctx, r, LSTACK, top, base, 551);
  // the serpent ring cut in its face, and a band of runes round it below
  serpentRing(ctx, 150, 286, 30, 9, 0.9);
  runeBand(ctx, 66, 236, 404, 17, 4, 3, 0.22);
  footFoam(ctx, r, 40, 270, base - 2, 1);
}

const RSTACK: Pt[] = [[1716, 660], [1718, 632], [1710, 606], [1700, 580], [1694, 548], [1698, 512], [1692, 478], [1698, 446], [1694, 414], [1704, 384], [1712, 352], [1718, 336], [1730, 330], [1736, 314], [1750, 316], [1758, 302], [1772, 310], [1784, 306], [1796, 330], [1808, 334], [1822, 356], [1838, 362], [1852, 386], [1866, 410], [1872, 440], [1866, 462], [1876, 476], [1870, 506], [1878, 520], [1870, 540], [1862, 574], [1866, 590], [1856, 604], [1848, 632], [1846, 660]];
const WRAPS = [0, 1, 2].map((i) => (x: number) => JG.wrap.y + i * 9 + (1 - ((x - 1784) / 90) ** 2) * 5);

function rightStack(ctx: Ctx, r: R): void {
  const { top, base } = JG.rstack;
  seaStack(ctx, r, RSTACK, top, base, 557);
  runeBand(ctx, 1706, 1860, 418, 15, 4, 17, 0.22);
  // a column of runes down its face, under the band
  for (let i = 0; i < 3; i++) carvedRune(ctx, 21 + i * 5, 1774, 530 + i * 22, 15, 0.18, 0.85);
  // the old line wrapped round it three times: worn into the stone (a pale scar above and below the turns)
  ctx.strokeStyle = rgba('#8a96bc', 0.18);
  ctx.lineWidth = 3;
  for (const dy of [-8, 26]) {
    ctx.beginPath();
    for (let x = 1696; x <= 1872; x += 6) (x === 1696 ? ctx.moveTo(x, WRAPS[0](x) + dy) : ctx.lineTo(x, WRAPS[0](x) + dy));
    ctx.stroke();
  }
  // their shadow on the stone under them
  ctx.strokeStyle = rgba('#02030a', 0.45);
  ctx.lineWidth = 9;
  for (const f of WRAPS) {
    ctx.beginPath();
    for (let x = 1696; x <= 1874; x += 6) (x === 1696 ? ctx.moveTo(x + 3, f(x) + 5) : ctx.lineTo(x + 3, f(x) + 5));
    ctx.stroke();
  }
  for (const f of WRAPS) {
    const pts: Pt[] = [];
    for (let x = 1696; x <= 1874; x += 6) pts.push([x, f(x)]);
    rope(ctx, pts, 7);
  }
  // the knot on its left side, where the line leaves the turns
  ctx.fillStyle = '#4c4030';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(1700, JG.wrap.y + 10, 9, 13, 0.3, 0, P2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = rgba('#a89070', 0.5);
  ctx.beginPath();
  ctx.arc(1698, JG.wrap.y + 6, 5, Math.PI, Math.PI * 1.7);
  ctx.stroke();
  footFoam(ctx, r, 1712, 1850, base - 2, 0.95);
}

// ——— the ledge on the brink: the hook and the ox-head bait ———

const LEDGE: Pt[] = [[1528, 660], [1532, 642], [1546, 632], [1560, 628], [1572, 620], [1594, 614], [1612, 616], [1626, 610], [1648, 612], [1664, 618], [1684, 616], [1700, 622], [1712, 632], [1718, 646], [1722, 660]];
const HOOK_EYE: Pt = [1662, 522];

/** The shelf of rock at the last stack's foot, worn by the water running past it to the brink: a rounded top face lit
 * by the abyss behind, potholes ground into it, a dark wet front face streaming, weed at the waterline. */
function ledge(ctx: Ctx, r: R): void {
  const path = smoothPath(LEDGE);
  const topY = (x: number) => topAt(LEDGE, x) ?? 640;
  softly(ctx, { x: 1500, y: 630, w: 260, h: 60 }, (g) => {
    g.fillStyle = 'rgba(2,3,10,0.5)';
    g.beginPath();
    g.ellipse(1630, 662, 110, 10, 0, 0, P2);
    g.fill();
  }, 0.5);
  within(ctx, path, () => {
    vfill(ctx, 1524, 606, 202, 58, [[0, '#56608a'], [0.22, '#353c5e'], [0.5, '#1c2036'], [1, '#090b16']]);
    surface(ctx, r, { x: 1524, y: 606, w: 202, h: 58 }, '#2c3250', { over: true, vary: 0.4, cells: 3, grain: 0.3, grainKind: 'speckle', seed: 561 });
    // the rounded brow between its top and its front: lit along it, the front in shade under it
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#b4b2ec', 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 1534; x <= 1716; x += 4) (x === 1534 ? ctx.moveTo(x, topY(x) + 2) : ctx.lineTo(x, topY(x) + 2));
    ctx.stroke();
    ctx.strokeStyle = rgba('#05060e', 0.5);
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 1534; x <= 1716; x += 4) (x === 1534 ? ctx.moveTo(x, topY(x) + 12) : ctx.lineTo(x, topY(x) + 12));
    ctx.stroke();
    // potholes the water has ground into it, each a dark bowl lit on its far rim
    for (const [x, rx] of [[1566, 9], [1604, 6], [1690, 7]] as const) {
      const y = topY(x) + 5;
      ctx.fillStyle = rgba('#05060e', 0.75);
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.35, 0, 0, P2);
      ctx.fill();
      ctx.strokeStyle = rgba('#a8a6ec', 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.35, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    // water streaming down its front
    for (let i = 0; i < 18; i++) {
      const x = 1534 + r() * 180;
      const y0 = topY(x) + 12;
      const lg = ctx.createLinearGradient(0, y0, 0, y0 + 26);
      lg.addColorStop(0, rgba('#c0beff', 0.22));
      lg.addColorStop(1, rgba('#c0beff', 0));
      ctx.fillStyle = lg;
      ctx.fillRect(x, y0, 1.2, 26);
    }
    ctx.fillStyle = '#12140c';
    ctx.beginPath();
    ctx.moveTo(1524, 664);
    for (let x = 1524; x <= 1724; x += 4) ctx.lineTo(x, 646 + wave1(x, 29) * 3 + Math.abs(Math.sin(x * 0.13)) * 3);
    ctx.lineTo(1724, 664);
    ctx.closePath();
    ctx.fill();
  });
  // (outlined along its top and sides; the water takes its foot)
  ctx.beginPath();
  for (let x = 1528; x <= 1722; x += 3) {
    const y = Math.min(topY(x), 660);
    if (x === 1528) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  footFoam(ctx, r, 1530, 1720, 652, 0.9);
  // slack line coiled on the ledge behind the skull
  for (let i = 0; i < 3; i++) {
    const pts: Pt[] = [];
    for (let a = 0; a <= P2 + 0.3; a += 0.25) pts.push([1574 + Math.cos(a) * (24 - i * 3), 620 + Math.sin(a) * (6 - i * 0.6) - i * 4]);
    rope(ctx, pts, 5.5);
  }
  // the great hook: its bend and barbed point behind the skull, the shank out through its eye
  hookBend(ctx, r);
  oxSkull(ctx, r);
  hookShank(ctx);
}

/** The great hook's bend, sweeping under the skull's jaw, and its barbed point coming up beside the muzzle. */
function hookBend(ctx: Ctx, r: R): void {
  const bend = (c: Ctx) => {
    c.beginPath();
    c.moveTo(1636, 592);
    c.bezierCurveTo(1650, 640, 1612, 662, 1590, 640);
    c.quadraticCurveTo(1578, 626, 1584, 598);
  };
  // its shadow on the ledge
  ctx.save();
  ctx.translate(5, 6);
  bend(ctx);
  ctx.strokeStyle = 'rgba(2,3,10,0.4)';
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.restore();
  ironBar(ctx, bend, 11, r);
  // the point and the barb, a hand's length, rust-pitted
  ctx.fillStyle = IRON.body;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(1578, 602);
  ctx.lineTo(1585, 574);
  ctx.lineTo(1590, 602);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1590, 600);
  ctx.lineTo(1600, 588);
  ctx.lineTo(1592, 612);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = rgba(IRON.hi, 0.45);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(1581, 598);
  ctx.lineTo(1585, 578);
  ctx.stroke();
}

/** The hook's shank, out through the skull's eye socket and up to the eye the line is tied to (in front of the
 * skull). */
function hookShank(ctx: Ctx): void {
  const [ex, ey] = HOOK_EYE;
  const shank = (c: Ctx) => {
    c.beginPath();
    c.moveTo(1633, 590);
    c.quadraticCurveTo(1650, 560, ex - 1, ey + 10);
  };
  ironBar(ctx, shank, 11);
  // the eye at its top
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(ex, ey, 9, 8, 0.5, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = IRON.lit;
  ctx.lineWidth = 5.4;
  ctx.stroke();
  ctx.strokeStyle = rgba(IRON.hi, 0.5);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(ex, ey, 9, 8, 0.5, Math.PI, Math.PI * 1.7);
  ctx.stroke();
}

/** A bar of old iron along a path (w thick): black, rusted, lit along its top. */
function ironBar(ctx: Ctx, path: (c: Ctx) => void, w: number, r?: R): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 2.4;
  ctx.stroke();
  path(ctx);
  ctx.strokeStyle = IRON.body;
  ctx.lineWidth = w;
  ctx.stroke();
  path(ctx);
  ctx.strokeStyle = rgba(IRON.rust, 0.5);
  ctx.lineWidth = w * 0.5;
  ctx.setLineDash([3, 5, 2, 7]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(-w * 0.15, -w * 0.25);
  path(ctx);
  ctx.strokeStyle = rgba(IRON.hi, 0.42);
  ctx.lineWidth = w * 0.24;
  ctx.stroke();
  ctx.restore();
  void r;
}

/** The ox-head bait of the old tale: a great ox skull bleached by the salt, lying tipped on the ledge, its horns swept
 * out and up (dark horn, paler at the tips), the hook through its eye. */
function oxSkull(ctx: Ctx, r: R): void {
  const { x, y } = JG.skull;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.32);
  // its shadow on the ledge, down and right
  ctx.save();
  ctx.rotate(0.32);
  softly(ctx, { x: -80, y: -10, w: 170, h: 50 }, (g) => {
    g.fillStyle = 'rgba(2,3,10,0.55)';
    g.beginPath();
    g.ellipse(10, 18, 56, 9, 0, 0, P2);
    g.fill();
  }, 0.5);
  ctx.restore();
  // horns: out from the poll, sweeping round and up, thick at the root
  for (const s of [-1, 1]) {
    const cl: Pt[] = [[s * 24, -30], [s * 44, -36], [s * 60, -32], [s * 70, -44], [s * 68, -62]];
    const left: Pt[] = [];
    const right: Pt[] = [];
    cl.forEach(([px, py], i) => {
      const [ax, ay] = cl[Math.max(0, i - 1)];
      const [bx, by] = cl[Math.min(cl.length - 1, i + 1)];
      const l = Math.hypot(bx - ax, by - ay) || 1;
      const w = lerp(7, 1.2, i / (cl.length - 1));
      left.push([px - ((by - ay) / l) * w, py + ((bx - ax) / l) * w]);
      right.push([px + ((by - ay) / l) * w, py - ((bx - ax) / l) * w]);
    });
    const hp = polyPath([...left, ...right.slice().reverse()]);
    within(ctx, hp, () => {
      const hg = ctx.createLinearGradient(s * 24, 0, s * 70, 0);
      hg.addColorStop(0, '#1c1612');
      hg.addColorStop(0.6, '#3a3026');
      hg.addColorStop(1, '#8a7c62');
      ctx.fillStyle = hg;
      ctx.fillRect(-80, -70, 160, 50);
      // growth rings
      ctx.strokeStyle = rgba('#05040a', 0.5);
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const [px, py] = cl[i];
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, P2);
        ctx.stroke();
      }
      ctx.fillStyle = rgba('#c8c0a8', 0.25);
      ctx.fillRect(s > 0 ? 40 : -70, -60, 30, 6);
    });
    hp(ctx);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // the skull: broad poll, wide-set orbits, the face narrowing to the muzzle
  const S: Pt[] = [[-26, -30], [-13, -36], [0, -31], [13, -36], [26, -30], [32, -17], [27, -5], [20, 7], [15, 23], [13, 38], [8, 48], [0, 51], [-8, 48], [-13, 38], [-15, 23], [-20, 7], [-27, -5], [-32, -17]];
  const sp = smoothPath(S);
  within(ctx, sp, () => {
    const bg = ctx.createLinearGradient(-30, -36, 30, 50);
    bg.addColorStop(0, '#9a9280');
    bg.addColorStop(0.45, '#6a6456');
    bg.addColorStop(1, '#2a2622');
    ctx.fillStyle = bg;
    ctx.fillRect(-34, -40, 68, 94);
    surface(ctx, r, { x: -34, y: -40, w: 68, h: 94 }, '#8a8270', { over: true, vary: 0.3, cells: 3, grain: 0.3, grainKind: 'stone', seed: 571 });
    // salt-weathered pits, a green-black stain where the sea washes it
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = rgba('#2a2620', 0.25 + r() * 0.25);
      ctx.beginPath();
      ctx.arc(-26 + r() * 52, -30 + r() * 76, 0.6 + r() * 1.4, 0, P2);
      ctx.fill();
    }
    vfill(ctx, -34, 20, 68, 34, [[0, 'rgba(20,30,24,0)'], [1, 'rgba(20,30,24,0.5)']]);
    // the frontal ridge and the brow
    ctx.strokeStyle = rgba('#e0d8c0', 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, -26);
    ctx.quadraticCurveTo(-4, 4, -2, 30);
    ctx.stroke();
    // a crack down the face
    crack(ctx, r, 6, -26, Math.PI / 2 + 0.2, 40, { col: '#1a1612', lip: '#d8d0b8', w: 1.1, a: 0.6, branch: 0.3 });
  });
  // the orbits: deep, dark, their lower rims lit
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#0a0908';
    ctx.beginPath();
    ctx.ellipse(s * 16, -13, 8.5, 7.5, s * 0.3, 0, P2);
    ctx.fill();
    ctx.strokeStyle = rgba('#d8d0b8', 0.35);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(s * 16, -13, 8.5, 7.5, s * 0.3, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  // the nasal openings, long and narrow
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#0c0a08';
    ctx.beginPath();
    ctx.ellipse(s * 5, 30, 3, 11, s * -0.12, 0, P2);
    ctx.fill();
  }
  sp(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // the void's light round its far edge
  ctx.save();
  sp(ctx);
  ctx.clip();
  ctx.strokeStyle = rgba('#b4b0f0', 0.35);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, -18);
  ctx.quadraticCurveTo(22, 10, 12, 46);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** The line from the turns round the stack down to the hook's eye (its own layer: it twitches). */
const ROPE_BOX = { x: 1652, y: 480, w: 68, h: 84 };
function ropeHang(ctx: Ctx): void {
  const [ex, ey] = HOOK_EYE;
  // its shadow on the stone and the ledge
  ctx.save();
  ctx.translate(4, 6);
  ctx.strokeStyle = 'rgba(2,3,10,0.35)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  sagLine(1700, JG.wrap.y + 16, ex + 4, ey - 3, 10).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
  rope(ctx, sagLine(1700, JG.wrap.y + 16, ex + 4, ey - 3, 10), 6);
}

// ——— the wreck on the skerry ———

const SKERRY: Pt[] = [[196, 666], [204, 638], [226, 614], [254, 598], [294, 586], [332, 590], [372, 600], [420, 606], [470, 602], [520, 605], [566, 614], [600, 632], [626, 666]];
/** The hull lying on the skerry, from its broken stern (u 0) to the stem (u 1): x, the sheer (gunwale) and the keel. */
const hx = (u: number) => 262 + u * 334;
const hTop = (u: number) => 578 - u * 32 - u ** 3 * 38;
const hBot = (u: number) => 640 - u * 8 - u ** 4 * 64;
/** The far gunwale (seen over the near one: we look down into the hull). */
const hFar = (u: number) => hTop(u) - 12 * (1 - u) ** 0.8;

function skerry(ctx: Ctx, r: R): void {
  const path = polyPath(SKERRY);
  within(ctx, path, () => {
    vfill(ctx, 190, 580, 440, 90, [[0, '#4a5272'], [0.3, '#2a3048'], [1, '#0a0c16']]);
    surface(ctx, r, { x: 190, y: 580, w: 440, h: 90 }, '#2a3048', { over: true, vary: 0.4, cells: 4, strokes: 0.8, strokeAng: 0.2, strokeLen: 60, strokeW: 5, grain: 0.3, grainKind: 'stone', seed: 581 });
    for (let i = 0; i < 4; i++) crack(ctx, r, 230 + r() * 360, 600 + r() * 20, Math.PI / 2 + (r() - 0.5) * 0.6, 20 + r() * 30, { col: INK, lip: '#8a96bc', w: 1.3, a: 0.5 });
    ctx.fillStyle = '#16180f';
    ctx.beginPath();
    ctx.moveTo(190, 672);
    for (let x = 190; x <= 630; x += 5) ctx.lineTo(x, 640 + wave1(x, 31) * 5 + r() * 3);
    ctx.lineTo(630, 672);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = rgba('#a4a6b0', 0.25 + r() * 0.3);
      ctx.beginPath();
      ctx.arc(200 + r() * 420, 628 + r() * 22, 0.7 + r() * 1.5, 0, P2);
      ctx.fill();
    }
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  path(ctx);
  ctx.stroke();
}

function wreck(ctx: Ctx, r: R): void {
  softly(ctx, { x: 180, y: 620, w: 480, h: 80 }, (g) => {
    g.fillStyle = 'rgba(2,3,10,0.5)';
    g.beginPath();
    g.ellipse(430, 670, 230, 16, 0, 0, P2);
    g.fill();
  }, 0.5);
  // her reflection broken on the swell in front of the skerry
  ctx.save();
  seaPath(ctx);
  ctx.clip();
  for (let i = 0; i < 9; i++) {
    const y = 664 + i * 6;
    ctx.fillStyle = rgba(i % 2 ? '#0a0608' : '#140e10', 0.4 - i * 0.035);
    ctx.fillRect(250 + r() * 30 + i * 6, y, 330 - i * 22 - r() * 40, 2.5);
  }
  ctx.fillStyle = rgba('#a8a4f0', 0.08);
  ctx.fillRect(560, 668, 60, 2);
  ctx.restore();
  skerry(ctx, r);
  // the hull: the inside seen over the near gunwale (far planking in shade, thwarts, ribs), the near side's strakes
  const U0 = 0.03;
  const inside = (c: Ctx) => {
    c.beginPath();
    for (let u = U0; u <= 1; u += 0.02) c.lineTo(hx(u), hFar(u));
    for (let u = 1; u >= U0; u -= 0.02) c.lineTo(hx(u), hTop(u) + 2);
    c.closePath();
  };
  inside(ctx);
  ctx.fillStyle = '#100a0a';
  ctx.fill();
  within(ctx, inside, () => {
    // the far side's planking, in shade, a little of the rift's light on it
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = rgba('#3a2c26', 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let u = U0; u <= 1; u += 0.02) ctx.lineTo(hx(u), hFar(u) + k * 3);
      ctx.stroke();
    }
    // ribs and thwarts
    for (let u = 0.08; u < 0.95; u += 0.085) {
      ctx.strokeStyle = '#2c201c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hx(u), hFar(u));
      ctx.lineTo(hx(u) + 2, hTop(u) + 2);
      ctx.stroke();
      ctx.strokeStyle = rgba('#7a6250', 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx(u) - 1, hFar(u) + 1);
      ctx.lineTo(hx(u) + 1, hTop(u));
      ctx.stroke();
    }
    // sea water lying in her, the void's light on it
    ctx.fillStyle = rgba('#5a5a9a', 0.3);
    ctx.fillRect(hx(0.1), hTop(0.3) - 2, hx(0.6) - hx(0.1), 3);
  });
  // the near side: clinker strakes, each overlapping the one below
  const side = (c: Ctx) => {
    c.beginPath();
    for (let u = U0; u <= 1; u += 0.02) c.lineTo(hx(u), hTop(u));
    for (let u = 1; u >= U0; u -= 0.02) c.lineTo(hx(u), hBot(u));
    // the broken end: ragged planks
    const rr = rng(hashStr('jg:break'));
    for (let k = 0; k <= 8; k++) c.lineTo(hx(U0) - 6 + rr() * 14 - (k % 2) * 6, lerp(hBot(U0), hTop(U0), k / 8));
    c.closePath();
  };
  within(ctx, side, () => {
    const vg = ctx.createLinearGradient(0, 520, 0, 640);
    vg.addColorStop(0, WOOD.lit);
    vg.addColorStop(0.35, WOOD.body);
    vg.addColorStop(1, WOOD.deep);
    ctx.fillStyle = vg;
    ctx.fillRect(220, 480, 400, 170);
    surface(ctx, r, { x: 220, y: 480, w: 400, h: 170 }, WOOD.body, { over: true, vary: 0.35, cells: 4, strokes: 1.6, strokeAng: -0.12, strokeLen: 120, strokeW: 2, grain: 0.3, grainKind: 'wood', seed: 587 });
    const N = 7;
    for (let k = 1; k < N; k++) {
      const f = k / N;
      const yAt = (u: number) => lerp(hTop(u), hBot(u), f);
      // the plank above's lower edge: its shadow on the one below, its own lit lip
      ctx.strokeStyle = rgba('#0a0606', 0.6);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let u = U0; u <= 1; u += 0.02) ctx.lineTo(hx(u), yAt(u) + 1.5);
      ctx.stroke();
      ctx.strokeStyle = rgba('#a88a70', 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let u = U0; u <= 1; u += 0.02) ctx.lineTo(hx(u), yAt(u) - 0.5);
      ctx.stroke();
      // rivets
      for (let u = U0 + 0.02; u < 0.98; u += 0.045) {
        ctx.fillStyle = rgba('#120a08', 0.7);
        ctx.fillRect(hx(u), yAt(u) - 2.5, 1.6, 1.6);
      }
    }
    // the weed and the wet where she lies in the wash
    vfill(ctx, 220, 600, 400, 50, [[0, rgba('#0a0c10', 0)], [1, rgba('#0a0c10', 0.6)]]);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#2a3020' : '#a4a6b0', 0.4);
      ctx.beginPath();
      ctx.arc(hx(r()), 610 + r() * 30, 0.8 + r() * 1.6, 0, P2);
      ctx.fill();
    }
    // the rift's light on her from the upper left: the end towards it and her upper strakes lit, her bow end down
    // in shade
    const lg = ctx.createLinearGradient(220, 480, 640, 640);
    lg.addColorStop(0, rgba(SUNL, 0.12));
    lg.addColorStop(0.45, rgba(SUNL, 0));
    lg.addColorStop(1, rgba('#04050c', 0.35));
    ctx.fillStyle = lg;
    ctx.fillRect(220, 480, 420, 170);
    ctx.fillStyle = rgba(SUNL, 0.08);
    ctx.fillRect(220, 480, 420, 26);
  });
  side(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // the gunwale: a heavy rail, lit on top
  ctx.strokeStyle = '#2a1e1a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let u = U0 + 0.02; u <= 1; u += 0.02) ctx.lineTo(hx(u), hTop(u));
  ctx.stroke();
  ctx.strokeStyle = rgba('#b49a80', 0.4);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let u = U0 + 0.02; u <= 1; u += 0.02) ctx.lineTo(hx(u), hTop(u) - 2);
  ctx.stroke();
  // ribs standing up out of the broken end
  for (const [u, h, lean] of [[0.035, 34, -0.3], [0.1, 26, -0.15], [0.16, 16, -0.1]] as const) {
    const x = hx(u);
    const y = hTop(u);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.quadraticCurveTo(x + lean * h * 0.3, y - h * 0.5, x + lean * h, y - h);
    ctx.stroke();
    ctx.strokeStyle = WOOD.body;
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.strokeStyle = rgba('#a88a70', 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 1.2, y + 2);
    ctx.quadraticCurveTo(x + lean * h * 0.3 - 1.2, y - h * 0.5, x + lean * h - 1, y - h);
    ctx.stroke();
  }
  breach(ctx, r);
  mastAndSail(ctx, r);
  // shields still on the rail (one gone, its pegs left), faded
  const cols = ['#4a2422', '#6a5c38', '#2c3640', '#7a7262', '#3a2422'];
  [0.3, 0.42, 0.54, 0.66, 0.77].forEach((u, i) => {
    const x = hx(u);
    const y = hTop(u) + 5;
    const rad = 15 * (1 - u * 0.25);
    if (i === 2) {
      for (const dx of [-6, 6]) {
        ctx.fillStyle = '#1a1210';
        ctx.fillRect(x + dx - 1.5, y - 2, 3, 6);
      }
      return;
    }
    shield(ctx, r, x, y, rad, cols[i], i === 4 ? 0.25 : 0);
  });
  // oars snapped off in their ports, one lying on the rocks
  for (const [u, len, ang] of [[0.5, 46, 2.3], [0.62, 30, 2.0]] as const) {
    const x = hx(u);
    const y = lerp(hTop(u), hBot(u), 0.25);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
    ctx.strokeStyle = '#5a4636';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#0a0606';
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, P2);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(500, 620);
  ctx.lineTo(604, 646);
  ctx.stroke();
  ctx.strokeStyle = '#5a4636';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.fillStyle = '#5a4636';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(612, 648, 12, 4.5, 0.24, 0, P2);
  ctx.fill();
  ctx.stroke();
  stemAndDragon(ctx, r);
  // where she lies on the rock: occlusion along the keel
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.strokeStyle = 'rgba(2,3,10,0.5)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let u = U0; u <= 0.85; u += 0.03) ctx.lineTo(hx(u) + 3, hBot(u) + 3);
  ctx.stroke();
  ctx.restore();
  // the rocks she struck, standing up in front of her keel
  for (const [x, y, rx, ry] of [[292, 654, 30, 16], [446, 656, 34, 13], [578, 658, 26, 11]] as const) boulder(ctx, r, x, y, rx, ry);
  footFoam(ctx, r, 200, 620, 658, 0.95);
}

/** A wet black boulder in the wash (its foot centred at x, y): lit on its crown, weed at the waterline. */
function boulder(ctx: Ctx, r: R, x: number, y: number, rx: number, ry: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 12; i++) {
    const a = Math.PI + (i / 11) * Math.PI;
    const k = 0.85 + r() * 0.3;
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * 2 * k]);
  }
  pts.push([x + rx, y + 4], [x - rx, y + 4]);
  const p = smoothPath(pts);
  within(ctx, p, () => {
    const g = ctx.createLinearGradient(x - rx, y - ry * 2, x + rx * 0.6, y);
    g.addColorStop(0, '#363c58');
    g.addColorStop(0.45, '#22283e');
    g.addColorStop(1, '#080a14');
    ctx.fillStyle = g;
    ctx.fillRect(x - rx - 4, y - ry * 2 - 4, rx * 2 + 8, ry * 2 + 10);
    ctx.fillStyle = rgba('#b8b6f0', 0.16);
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.3, y - ry * 1.6, rx * 0.4, ry * 0.25, -0.2, 0, P2);
    ctx.fill();
    ctx.fillStyle = '#16180f';
    ctx.fillRect(x - rx - 4, y - ry * 0.5, rx * 2 + 8, ry);
  });
  p(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

/** A breach stove in her side: planks burst inward, their ends splintered, the dark of her hold and a rib in it. */
function breach(ctx: Ctx, r: R): void {
  const pts: Pt[] = [];
  const cx = hx(0.5);
  const cy = lerp(hTop(0.5), hBot(0.5), 0.55);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * P2;
    const k = i % 2 ? 0.55 + r() * 0.2 : 0.9 + r() * 0.25;
    pts.push([cx + Math.cos(a) * 30 * k, cy + Math.sin(a) * 13 * k]);
  }
  const p = polyPath(pts);
  p(ctx);
  ctx.fillStyle = '#070405';
  ctx.fill();
  within(ctx, p, () => {
    ctx.strokeStyle = '#2a1e1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 16);
    ctx.quadraticCurveTo(cx + 2, cy, cx + 8, cy + 16);
    ctx.stroke();
    ctx.fillStyle = rgba('#5a5a9a', 0.25);
    ctx.fillRect(cx - 30, cy + 6, 60, 2);
  });
  // the splintered plank ends round it, lit where they bend in
  ctx.lineCap = 'round';
  for (const [x, y] of pts) {
    if (r() < 0.4) continue;
    ctx.strokeStyle = '#6a5444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (cx - x) * 0.25, y + (cy - y) * 0.25);
    ctx.stroke();
  }
  p(ctx);
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

/** A round shield on the rail: boards across it, a painted face faded by the sea, an iron boss, a leather rim. */
function shield(ctx: Ctx, r: R, x: number, y: number, rad: number, col: string, tilt: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const g = ctx.createRadialGradient(-rad * 0.4, -rad * 0.4, 0, 0, 0, rad);
  g.addColorStop(0, shade(col, 0.25));
  g.addColorStop(0.7, col);
  g.addColorStop(1, shade(col, -0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, rad * 0.8, rad, 0, 0, P2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = rgba('#0a0606', 0.35);
  ctx.lineWidth = 1;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(k * rad * 0.32, -rad);
    ctx.lineTo(k * rad * 0.32, rad);
    ctx.stroke();
  }
  // faded and salt-bloomed
  ctx.fillStyle = rgba('#c8c8d0', 0.12 + r() * 0.1);
  ctx.fillRect(-rad, rad * 0.1, rad * 2, rad);
  ctx.restore();
  ctx.strokeStyle = '#1a1210';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, rad * 0.8, rad, 0, 0, P2);
  ctx.stroke();
  ctx.fillStyle = IRON.lit;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, rad * 0.24, rad * 0.3, 0, 0, P2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = rgba(IRON.hi, 0.5);
  ctx.beginPath();
  ctx.arc(-rad * 0.07, -rad * 0.1, rad * 0.08, 0, P2);
  ctx.fill();
  ctx.restore();
}

/** The mast snapped and leaning back, the yard fallen across the hull, the torn sail hanging from it over her side. */
function mastAndSail(ctx: Ctx, r: R): void {
  const mx = hx(0.36);
  const my = hTop(0.36) + 6;
  const tx = 318;
  const ty = 450;
  const mast = (c: Ctx) => {
    c.beginPath();
    c.moveTo(mx, my);
    c.lineTo(tx, ty);
  };
  ctx.save();
  ctx.lineCap = 'butt';
  mast(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.stroke();
  mast(ctx);
  ctx.strokeStyle = WOOD.body;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.translate(-2, -1);
  mast(ctx);
  ctx.strokeStyle = rgba('#a88a70', 0.35);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // the splintered top
  ctx.fillStyle = WOOD.body;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(tx - 5, ty + 2);
  ctx.lineTo(tx - 6, ty - 12);
  ctx.lineTo(tx - 1, ty - 4);
  ctx.lineTo(tx + 1, ty - 16);
  ctx.lineTo(tx + 4, ty - 3);
  ctx.lineTo(tx + 6, ty - 9);
  ctx.lineTo(tx + 6, ty + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // the yard, fallen across her
  const ya: Pt = [290, 496];
  const yb: Pt = [414, 552];
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(ya[0], ya[1]);
  ctx.lineTo(yb[0], yb[1]);
  ctx.stroke();
  ctx.strokeStyle = '#4a382e';
  ctx.lineWidth = 5.4;
  ctx.stroke();
  // the sail: hanging from the yard over her side, torn into tatters, its stripes faded (blood red and bone)
  const top = (u: number): Pt => [lerp(ya[0] + 8, yb[0] - 8, u), lerp(ya[1] + 3, yb[1] - 1, u)];
  const bot = (u: number) => 600 + Math.sin(u * 9.4 + 1) * 6 + (u > 0.55 && u < 0.72 ? -22 : 0) + (u > 0.15 && u < 0.24 ? -16 : 0);
  const sail = (c: Ctx) => {
    c.beginPath();
    for (let u = 0; u <= 1; u += 0.05) c.lineTo(...top(u));
    for (let u = 1; u >= 0; u -= 0.025) c.lineTo(top(u)[0] + 4 + Math.sin(u * 30) * 3, bot(u) + (r() - 0.5) * 6);
    c.closePath();
  };
  ctx.save();
  sail(ctx);
  ctx.fillStyle = '#3a1a1a';
  ctx.fill();
  ctx.clip();
  for (let k = 0; k < 10; k++) {
    if (k % 2) continue;
    const u0 = k / 10;
    const u1 = (k + 1) / 10;
    ctx.fillStyle = '#7a6e5a';
    ctx.beginPath();
    ctx.moveTo(...top(u0));
    ctx.lineTo(...top(u1));
    ctx.lineTo(top(u1)[0] + 6, 640);
    ctx.lineTo(top(u0)[0] + 6, 640);
    ctx.closePath();
    ctx.fill();
  }
  // folds hanging from the yard: light and shade in long vertical bands
  for (let k = 0; k < 9; k++) {
    const u = (k + 0.5) / 9;
    const [x, y] = top(u);
    const fg = ctx.createLinearGradient(x - 7, 0, x + 7, 0);
    fg.addColorStop(0, 'rgba(8,4,6,0)');
    fg.addColorStop(0.5, 'rgba(8,4,6,0.45)');
    fg.addColorStop(1, 'rgba(8,4,6,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(x - 7, y, 14, 120);
    ctx.fillStyle = rgba('#d8c8b0', 0.1);
    ctx.fillRect(x + 6, y, 3, 110);
  }
  vfill(ctx, 290, 500, 140, 120, [[0, 'rgba(4,3,8,0)'], [1, 'rgba(4,3,8,0.55)']]);
  ctx.restore();
  sail(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // a stay still running from the mast to the stem, slack
  ctx.strokeStyle = rgba('#1a1410', 0.9);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(tx + 4, ty + 8);
  ctx.quadraticCurveTo(470, 520, hx(0.97), hTop(0.97) - 30);
  ctx.stroke();
}

/** The stem post rising into the dragon's head: a carved neck curling up, open jaws, a crest curling back. */
function stemAndDragon(ctx: Ctx, r: R): void {
  const neck: Pt[] = [[hx(0.96), hBot(0.96) - 6], [608, 538], [622, 500], [624, 470], [614, 452]];
  const left: Pt[] = [];
  const right: Pt[] = [];
  neck.forEach(([x, y], i) => {
    const [ax, ay] = neck[Math.max(0, i - 1)];
    const [bx, by] = neck[Math.min(neck.length - 1, i + 1)];
    const l = Math.hypot(bx - ax, by - ay) || 1;
    const w = lerp(13, 8, i / (neck.length - 1));
    left.push([x - ((by - ay) / l) * w, y + ((bx - ax) / l) * w]);
    right.push([x + ((by - ay) / l) * w, y - ((bx - ax) / l) * w]);
  });
  // the head: long snout to the right, jaws open, a crest curling back off the skull
  const HEAD: Pt[] = [[606, 452], [610, 438], [622, 430], [638, 432], [656, 438], [662, 444], [646, 444], [632, 446], [646, 452], [660, 462], [652, 466], [634, 460], [620, 462]];
  const neckPath = polyPath([...left, ...right.slice().reverse()]);
  const headPath = smoothPath(HEAD);
  const paintWood = (p: PathFn, box: { x: number; y: number; w: number; h: number }) => {
    within(ctx, p, () => {
      const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
      g.addColorStop(0, WOOD.lit);
      g.addColorStop(0.45, WOOD.body);
      g.addColorStop(1, WOOD.deep);
      ctx.fillStyle = g;
      ctx.fillRect(box.x, box.y, box.w, box.h);
      surface(ctx, r, box, WOOD.body, { over: true, vary: 0.3, cells: 2, strokes: 2, strokeAng: -1.2, strokeLen: 30, strokeW: 1.5, grain: 0.3, grainKind: 'wood', seed: 593 });
    });
  };
  paintWood(neckPath, { x: 580, y: 440, w: 60, h: 130 });
  // carved scales down the neck
  ctx.save();
  neckPath(ctx);
  ctx.clip();
  for (let i = 1; i < neck.length - 1; i++) {
    const [x, y] = neck[i];
    for (let k = -1; k <= 1; k++) {
      ctx.strokeStyle = rgba('#0a0606', 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + k * 5, y + 6, 5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = rgba('#a8a4f4', 0.4);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  right.forEach(([x, y], i) => (i ? ctx.lineTo(x - 1, y) : ctx.moveTo(x - 1, y)));
  ctx.stroke();
  ctx.restore();
  neckPath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // the crest curling back off its head
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(612, 438);
  ctx.bezierCurveTo(598, 428, 588, 440, 596, 450);
  ctx.stroke();
  ctx.strokeStyle = WOOD.body;
  ctx.lineWidth = 3.6;
  ctx.stroke();
  paintWood(headPath, { x: 600, y: 426, w: 66, h: 44 });
  // the open jaws: dark inside, teeth
  ctx.fillStyle = '#0a0606';
  ctx.beginPath();
  ctx.moveTo(632, 446);
  ctx.lineTo(660, 444);
  ctx.lineTo(658, 460);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba('#b8a888', 0.6);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(638 + i * 5, 445);
    ctx.lineTo(640 + i * 5, 450);
    ctx.lineTo(642 + i * 5, 445);
    ctx.fill();
  }
  headPath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // its eye, and the void's light along its brow and snout
  ctx.fillStyle = '#0a0606';
  ctx.beginPath();
  ctx.ellipse(624, 440, 3.2, 2.4, 0.2, 0, P2);
  ctx.fill();
  ctx.strokeStyle = rgba('#a8a4f4', 0.5);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(612, 434);
  ctx.quadraticCurveTo(632, 428, 656, 437);
  ctx.stroke();
}

// ——— the table: a slab of the last rock ———

/** A tide pool on the slab (centre x, y; half sizes rx, ry): dark water with the sky's light lying across its far side,
 * weed in it, its wet rim dark, a ring of salt round it. */
function pool(ctx: Ctx, r: R, x: number, y: number, rx: number, ry: number, seed: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * P2;
    const k = 1 + wave1(i * 37 + seed, seed) * 0.14 + (r() - 0.5) * 0.08;
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
  }
  const p = smoothPath(pts);
  // the wet stone round it, darker
  softly(ctx, { x: x - rx * 1.6, y: y - ry * 2.4, w: rx * 3.2, h: ry * 4.8 }, (g) => {
    g.fillStyle = 'rgba(4,5,12,0.4)';
    g.beginPath();
    g.ellipse(x, y, rx * 1.3, ry * 1.6, 0, 0, P2);
    g.fill();
  }, 0.5);
  // salt dried in a ring round it
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.translate(x, y);
  ctx.scale(1.12, 1.3);
  ctx.translate(-x, -y);
  p(ctx);
  ctx.restore();
  ctx.strokeStyle = rgba('#d4d8e4', 0.16);
  ctx.lineWidth = 3;
  ctx.stroke();
  within(ctx, p, () => {
    vfill(ctx, x - rx * 1.2, y - ry * 1.2, rx * 2.4, ry * 2.4, [[0, '#6a68b0'], [0.4, '#2a2c58'], [1, '#080a16']]);
    // the sky's light lying across it (the rim's glow reflected), broken by a ripple
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgba('#b8b6f4', 0.3 - i * 0.08);
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.1 + i * 6, y - ry * 0.45 + i * 3, rx * (0.7 - i * 0.15), ry * 0.12, 0, 0, P2);
      ctx.fill();
    }
    // weed on the bottom, and pebbles
    for (let i = 0; i < 7; i++) {
      const bx = x + (r() - 0.5) * rx * 1.4;
      const by = y + r() * ry * 0.6;
      ctx.strokeStyle = rgba('#2a3a20', 0.6);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + 6, by - ry * 0.3, bx + 2, by - ry * 0.5);
      ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = rgba('#3a3e56', 0.7);
      ctx.beginPath();
      ctx.ellipse(x + (r() - 0.5) * rx * 1.4, y + (r() - 0.2) * ry * 0.8, 2 + r() * 3, 1 + r() * 1.6, 0, 0, P2);
      ctx.fill();
    }
  });
  // its rim: the near edge dark (the water's lip in shade), the far edge's meniscus catching the light
  ctx.save();
  p(ctx);
  ctx.clip();
  ctx.strokeStyle = rgba('#02030a', 0.6);
  ctx.lineWidth = 4;
  p(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba('#c8c6f4', 0.3);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.98, ry * 0.98, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
}

function table(ctx: Ctx, r: R): void {
  const f = JG.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#23283a'], [0.45, '#2c3244'], [1, '#353b4e']]);
  surface(ctx, r, box, '#2c3244', { over: true, vary: 0.45, cells: 5, mottle: 0.5, strokes: 0.3, strokeAng: 0.02, strokeLen: 360, strokeW: 5, grain: 0.2, grainKind: 'speckle', seed: 601 });
  grain(ctx, box, 'speckle', 0.22, 1);
  // wet and dry: the spray keeps the back of the slab and its hollows dark and wet; the crowns have dried paler,
  // salt bloomed on them
  lay(ctx, noiseMask(7, 603, { cover: 0.42, soft: 0.5, col: '#0a0b16', w: 320, h: 60 }), box, 0.35);
  lay(ctx, noiseMask(9, 605, { cover: 0.3, soft: 0.45, col: '#5a5e70', w: 320, h: 60 }), box, 0.12);
  vfill(ctx, 0, TY, W, 70, [[0, rgba('#05060e', 0.4)], [1, rgba('#05060e', 0)]]);
  // the spray's salt dried in a crust along the back edge, in a web
  lay(ctx, noiseMask(40, 609, { kind: 'web', cover: 0.45, soft: 0.1, col: '#e4e8f0', w: 520, h: 40 }), { x: 0, y: TY + 2, w: W, h: 34 }, 0.08);
  // slate: its cleavage steps running across the slab, each a faint dark line with a lit edge (clearer in front)
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const t = (i + r()) / 18;
    const y = TY + 6 + t ** 1.25 * (f - TY - 10);
    const k = 0.35 + t;
    const x0 = -100 + r() * W * 0.7;
    const x1 = x0 + 300 + r() * 1200;
    const yy = (x: number) => y + wave1(x * 0.6, i * 7) * 3 * k;
    for (const [dy, col, a, w] of [[0, '#04050c', 0.3, 1.3], [1.5, '#8a92b8', 0.09, 1]] as const) {
      ctx.strokeStyle = rgba(col, a * k);
      ctx.lineWidth = w * k;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 20) (x === x0 ? ctx.moveTo(x, yy(x) + dy * k) : ctx.lineTo(x, yy(x) + dy * k));
      ctx.stroke();
    }
  }
  // the slab wet: the rim's glow lying on its far half, the wan sun's sheen on the left
  lightPool(ctx, 960, TY + 40, 1050, 60, '#a8a6e8', 0.05);
  lightPool(ctx, 380, TY + 100, 360, 60, SUNL, 0.035);
  // wet sheen towards the front and at the corners, where the spray runs off (clear of the pizzas): the sky's light
  // lying in soft broken streaks along the slab
  for (const [x, y, rx, ry, a] of [[150, 1020, 220, 22, 0.1], [1780, 1016, 220, 20, 0.09], [90, 880, 120, 30, 0.07], [1840, 900, 110, 30, 0.07], [700, 1030, 140, 8, 0.05], [1220, 1030, 140, 8, 0.05]] as const) {
    lightPool(ctx, x, y, rx, ry, '#c4c2f4', a);
  }
  lay(ctx, noiseMask(14, 611, { cover: 0.3, soft: 0.3, col: '#c4c6e8', w: 320, h: 40 }), { x: 0, y: f - 70, w: W, h: 70 }, 0.07);
  // salt crust: dried white in a web, thickest at the corners and along the front
  for (const [cx, sx] of [[0, 1], [W, -1]] as const) {
    const bx = sx > 0 ? 0 : W - 520;
    const [fc, fg] = makeCanvas(520, f - TY);
    lay(fg, noiseMask(30, 607 + sx, { kind: 'web', cover: 0.5, soft: 0.1, col: '#e4e8f0', w: 260, h: 70 }), { x: 0, y: 0, w: 520, h: f - TY }, 1);
    fg.globalCompositeOperation = 'destination-in';
    const mg = fg.createRadialGradient(cx - bx, f - TY, 0, cx - bx, f - TY, 300);
    mg.addColorStop(0, 'rgba(0,0,0,0.12)');
    mg.addColorStop(0.5, 'rgba(0,0,0,0.06)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    fg.fillStyle = mg;
    fg.fillRect(0, 0, 520, f - TY);
    ctx.drawImage(fc, bx, TY);
  }
  for (let i = 0; i < 260; i++) {
    const x = r() * W;
    const edge = Math.min(x, W - x) / 600;
    if (r() < edge) continue;
    ctx.fillStyle = rgba('#e8ecf4', 0.1 + r() * 0.2);
    ctx.fillRect(x, TY + r() * (f - TY), 1 + r() * 1.5, 1 + r());
  }
  // a joint running in from the back on each side, ending in a crack
  for (const [x, y1] of [[300, 860], [1640, 846]] as const) {
    const x1 = 960 + (x - 960) * ((y1 - 300) / (TY - 300));
    for (const [dx, col, a, w] of [[0, '#04050c', 0.5, 2.2], [1.6, '#8a92b8', 0.18, 1.1]] as const) {
      ctx.strokeStyle = rgba(col, a);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x + dx, TY);
      ctx.lineTo(x1 + dx, y1);
      ctx.stroke();
    }
    crack(ctx, r, x1, y1, Math.atan2(y1 - TY, x1 - x) + 0.3, 46, { col: '#04050c', lip: '#8a92b8', w: 1.3, a: 0.45, branch: 0.3 });
  }
  // tide pools at the corners, out of the pizzas' way
  pool(ctx, r, 170, 1000, 118, 20, 3);
  pool(ctx, r, 1780, 808, 92, 12, 7);
  // limpets and barnacles crusting the front corners
  for (const [x0, x1] of [[0, 120], [1800, W]] as const) {
    for (let i = 0; i < 40; i++) {
      const x = x0 + r() * (x1 - x0);
      const y = f - 4 - r() * 40;
      const s = 1.5 + r() * 3;
      ctx.fillStyle = rgba('#8a8c96', 0.5);
      ctx.beginPath();
      ctx.ellipse(x, y, s * 1.2, s * 0.7, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#04050c', 0.5);
      ctx.beginPath();
      ctx.ellipse(x + 0.5, y + 0.3, s * 0.4, s * 0.25, 0, 0, P2);
      ctx.fill();
    }
  }
  ctx.restore();
  tableFalloff(ctx, f, 0.34, '#03040c');
  tableSeam(ctx, 0.5, '#0a0c1c', false);
  // the back edge, where the slab drops to the sea: a crevice and a thin wet lip
  crevice(ctx, 0, W, TY, 12, 0.5, '#02030a');
  // its back arris: a thin lit lip with the slab's thickness under it, wet; spray flecked along it where the sea
  // slaps the rock (kept faint: the fight's coils lie along here)
  ctx.fillStyle = rgba('#050610', 0.8);
  ctx.fillRect(0, TY - 5, W, 5);
  ctx.fillStyle = rgba('#a8a8dc', 0.32);
  ctx.fillRect(0, TY - 0.5, W, 1.6);
  for (let i = 0; i < 160; i++) {
    const x = r() * W;
    ctx.fillStyle = rgba('#dcdaff', 0.08 + r() * 0.18);
    ctx.beginPath();
    ctx.ellipse(x, TY - 4 - r() * 20, 1 + r() * 5, 0.8 + r() * 0.8, 0, 0, P2);
    ctx.fill();
  }
  // the front: the serpent carved round the slab, its head at the middle biting its tail
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#2e3448'], [0.4, '#1e2236'], [1, '#0e1020']]);
  surface(ctx, r, { x: 0, y: f, w: W, h: 40 }, '#252a3e', { over: true, vary: 0.3, cells: 8, grain: 0.35, grainKind: 'speckle', seed: 613 });
  serpentFrieze(ctx, f + 20);
  ctx.restore();
  ctx.fillStyle = rgba('#d8d8f4', 0.42);
  ctx.fillRect(0, f - 2, W, 2.5);
  ctx.fillStyle = rgba('#04050c', 0.85);
  ctx.fillRect(0, f, W, 1.6);
  for (let i = 0; i < 40; i++) {
    const x = r() * W;
    ctx.fillStyle = rgba('#04050c', 0.5);
    ctx.beginPath();
    ctx.ellipse(x, f + 1, 2 + r() * 5, 1 + r() * 2, 0, 0, P2);
    ctx.fill();
  }
}

/** The serpent carved along the slab's front (its middle at y): a scaled ribbon undulating the length of it, the head
 * at the middle closing its jaws on its own tail. */
function serpentFrieze(ctx: Ctx, y: number): void {
  const yAt = (x: number) => y + Math.sin(x / 60) * 4;
  const w = 12;
  const body = (x0: number, x1: number) => {
    for (const s of [-1, 1]) {
      cut(ctx, (c, dx, dy) => {
        c.beginPath();
        for (let x = x0; x <= x1; x += 6) {
          const taper = x1 < 960 ? 1 : Math.min(1, (x - 960) / 40 + 0.2);
          const yy = yAt(x) + s * (w / 2) * taper;
          if (x === x0) c.moveTo(x + dx, yy + dy);
          else c.lineTo(x + dx, yy + dy);
        }
      }, 2.2, 0.95);
    }
    for (let x = x0 + 8; x < x1 - 4; x += 14) {
      cut(ctx, (c, dx, dy) => {
        c.beginPath();
        c.moveTo(x + dx, yAt(x) - w / 2 + 1.5 + dy);
        c.quadraticCurveTo(x + 5 + dx, yAt(x) + dy, x + dx, yAt(x) + w / 2 - 1.5 + dy);
      }, 1.3, 0.7);
    }
  };
  body(0, 920);
  body(966, W);
  // the head, facing right, jaws round the tail's tip
  const hy = yAt(932);
  cut(ctx, (c, dx, dy) => {
    c.beginPath();
    c.moveTo(916 + dx, hy - w / 2 + dy);
    c.quadraticCurveTo(940 + dx, hy - w * 0.9 + dy, 962 + dx, hy - 4 + dy);
    c.lineTo(948 + dx, hy + dy);
    c.lineTo(962 + dx, hy + 5 + dy);
    c.quadraticCurveTo(940 + dx, hy + w * 0.9 + dy, 916 + dx, hy + w / 2 + dy);
  }, 2.2, 1);
  ctx.fillStyle = rgba('#04050c', 0.6);
  ctx.beginPath();
  ctx.arc(934, hy - 3, 1.6, 0, P2);
  ctx.fill();
}

// ——— the grade and the shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.05, '#c8ccff', 0.04, { warm: '#ffe8cc', cool: '#3438a0', a: 0.2 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.16, '#04051a', 60, 720);
  vignetteAll(ctx, 0.62, '#010208');
}

// ——— the stack ———

const SKY_BOX = { x: 0, y: 0, w: W, h: VOID_BOT };
const MIST_BOX = { x: 0, y: 290, w: W, h: VOID_BOT - 290 };
const SEA_BOX = { x: 0, y: RIM - 4, w: W, h: SEA_BOT - RIM + 4 };
const COIL_BOX = { x: 400, y: RIM - 96, w: 1100, h: 130 };
const DECK_BOX = { x: 0, y: 0, w: W, h: JG.deck + 40 };

export const JORMUNGANDR: SceneSpec = {
  id: 'jormungandr',
  info: {
    name: 'Edge of the World',
    subtitle: 'Mini-boss: JÖRMUNGANDR',
    ambient: [],
    // (the mist, the spray, the coils and the lightning are the live layer's)
    glows: [],
    light: '#b0b4e8',
    tableTint: '#e2e4f8',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'mistStill', box: MIST_BOX, stillOnly: true, draw: (c) => mistStill(c) },
    { id: 'sea', box: SEA_BOX, draw: sea },
    { id: 'coilsStill', box: COIL_BOX, stillOnly: true, draw: (c) => coilsStill(c) },
    { id: 'lipStill', box: LIP_BOX, stillOnly: true, draw: (c) => lipFlow(c, 0.3) },
    { id: 'lstack', box: { x: 0, y: 130, w: 330, h: 600 }, draw: leftStack },
    { id: 'wreck', box: { x: 180, y: 410, w: 500, h: 300 }, draw: wreck },
    { id: 'rstack', box: { x: 1600, y: 300, w: 320, h: 420 }, draw: rightStack },
    { id: 'ledge', box: { x: 1500, y: 500, w: 260, h: 200 }, draw: ledge },
    { id: 'rope', box: ROPE_BOX, motion: 'sprite', draw: (c) => ropeHang(c) },
    { id: 'table', box: { x: 0, y: TY - 20, w: W, h: 1080 - TY + 20 }, draw: table },
    // (the lightning's light on the deck goes over everything it touches: last, so nothing is baked over it)
    { id: 'deckLit', box: DECK_BOX, liveOnly: true, res: 0.25, draw: (c) => deckLit(c) },
    { id: 'lRim', box: { x: 20, y: 130, w: 280, h: 550 }, liveOnly: true, res: 0.5, draw: (c) => rimFlash(c, LSTACK) },
    { id: 'rRim', box: { x: 1640, y: 290, w: 260, h: 390 }, liveOnly: true, res: 0.5, draw: (c) => rimFlash(c, RSTACK) },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: frame painters ———

const BOLT = { w: 240, h: 360, n: 4, res: 0.5 };
/** A lightning bolt (frame i): a jagged channel from the deck's base stabbing down past the rim into the void, forks
 * off it, a violet glow round it. */
function boltFrame(c: Ctx, i: number): void {
  const rr = rng(hashStr('jg:bolt' + i));
  const pts: Pt[] = [[BOLT.w / 2 + (rr() - 0.5) * 30, 0]];
  const n = 16;
  for (let k = 1; k <= n; k++) {
    const [px] = pts[k - 1];
    pts.push([Math.max(50, Math.min(BOLT.w - 50, px + (rr() - 0.5) * 36)), (k / n) * BOLT.h]);
  }
  const forks: Pt[][] = [];
  for (let f = 0; f < 3; f++) {
    const at = 2 + Math.floor(rr() * 9);
    const dir = rr() < 0.5 ? -1 : 1;
    const fp: Pt[] = [pts[at]];
    for (let k = 1; k < 5 + rr() * 5; k++) {
      const [px, py] = fp[k - 1];
      fp.push([Math.max(28, Math.min(BOLT.w - 28, px + dir * (6 + rr() * 12))), py + 10 + rr() * 16]);
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
  for (const [w, col] of [[20, 'rgba(140,120,255,0.12)'], [9, 'rgba(180,168,255,0.3)'], [3.4, 'rgba(226,222,255,0.85)'], [1.5, 'rgba(255,255,255,1)']] as const) {
    stroke(pts, w, col);
    for (const fp of forks) stroke(fp, w * 0.55, col);
  }
  c.globalCompositeOperation = 'source-over';
  edgeFade(c, BOLT.w, BOLT.h, 22, 0, 60);
}

const SPRAY = { w: 200, h: 240, n: 8, res: 0.6 };
/** The sea bursting white up a rock's face at phase u (0 the swell striking … 1 fallen back): torn sheets of water
 * fanning up off the rock and splitting at their tips, drops flung off them streaking as they fly and fall, a mist of
 * fine spray behind; collapsing back into foam spreading at the foot. Lit on its upper left, violet in its shade. Its
 * foot at the bottom middle. */
function sprayFrame(c: Ctx, u: number): void {
  const rr = rng(hashStr('jg:spray'));
  const cx = SPRAY.w / 2;
  const by = SPRAY.h - 10;
  const rise = Math.sin(Math.min(1, u / 0.4) * (Math.PI / 2));
  const fall = u > 0.4 ? (u - 0.4) / 0.6 : 0;
  const H = SPRAY.h * 0.78 * rise * (1 - fall * 0.55);
  const body = 1 - fall * 0.9;
  // fine spray hanging behind it (a few soft veils, thinning as it falls)
  for (let i = 0; i < 6; i++) {
    const x = cx + (rr() - 0.5) * 70;
    const y = by - H * (0.35 + rr() * 0.5);
    const rad = 26 + rr() * 26 + fall * 20;
    const a = (0.1 + rr() * 0.08) * (0.4 + rise * 0.6) * (1 - fall * 0.6);
    if (H < 4) break;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(208,206,250,${a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(160,158,220,0)');
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // torn sheets of water fanning up off the rock, bending over and splitting as they fall back
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI / 2 + (i - 3) * 0.2 + (rr() - 0.5) * 0.15;
    const len = H * (0.55 + rr() * 0.45);
    if (len < 6) continue;
    const bend = (i - 3) * 6 * (0.4 + fall * 2);
    const w0 = 10 + rr() * 10;
    const x0 = cx + (i - 3) * 6;
    const tip: Pt = [x0 + Math.cos(ang) * len + bend, by + Math.sin(ang) * len + fall * fall * 40];
    const mid: Pt = [x0 + Math.cos(ang) * len * 0.5 + bend * 0.3, by + Math.sin(ang) * len * 0.55];
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const pts: Pt[] = [];
    const N = 10;
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      const qx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mid[0] + t * t * tip[0];
      const qy = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * mid[1] + t * t * tip[1];
      const w = w0 * (1 - t * 0.8) * (1 + (rr() - 0.5) * 0.5);
      pts.push([qx + nx * w * 0.5, qy + ny * w * 0.5]);
      pts.unshift([qx - nx * w * 0.5 + (rr() - 0.5) * 2, qy - ny * w * 0.5]);
    }
    const g = c.createLinearGradient(x0, by, tip[0], tip[1]);
    const a = (0.5 + rr() * 0.25) * body;
    g.addColorStop(0, `rgba(160,158,220,${(a * 0.5).toFixed(3)})`);
    g.addColorStop(0.6, `rgba(220,218,255,${(a * 0.8).toFixed(3)})`);
    g.addColorStop(1, `rgba(246,244,255,${(a * 0.4).toFixed(3)})`);
    c.fillStyle = g;
    polyPath(pts)(c);
    c.fill();
    // the light along its upper-left edge
    c.strokeStyle = `rgba(250,248,255,${(a * 0.6).toFixed(3)})`;
    c.lineWidth = 1;
    c.beginPath();
    pts.slice(N + 1).forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
  // drops flung off the sheets' tips, streaking along their flight and falling
  c.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const u0 = 0.1 + rr() * 0.32;
    const q = u - u0;
    const vx = (rr() - 0.5) * 300;
    const vy = 170 + rr() * 230;
    const x0 = cx + (rr() - 0.5) * 30;
    const y0 = by - SPRAY.h * 0.55 * (0.6 + rr() * 0.4);
    const rad = 0.9 + rr() * 1.8;
    if (q < 0) continue;
    const x = x0 + vx * q;
    const y = y0 - vy * q + 560 * q * q;
    const px = x0 + vx * (q - 0.035);
    const py = y0 - vy * (q - 0.035) + 560 * (q - 0.035) ** 2;
    if (y > by + 4) continue;
    const a = 0.85 * (1 - q * 0.9);
    c.strokeStyle = `rgba(236,234,255,${a.toFixed(3)})`;
    c.lineWidth = rad;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(x, y);
    c.stroke();
  }
  // the foam spreading at its foot
  const fw = SPRAY.w * (0.3 + u * 0.5);
  const fa = Math.sin(Math.min(1, u * 1.6) * Math.PI) * 0.4 + (1 - u) * 0.3;
  const fg = c.createRadialGradient(cx, by, 0, cx, by, fw / 2);
  fg.addColorStop(0, `rgba(220,218,252,${fa.toFixed(3)})`);
  fg.addColorStop(1, 'rgba(220,218,252,0)');
  c.fillStyle = fg;
  c.save();
  c.translate(cx, by);
  c.scale(1, 0.18);
  c.translate(-cx, -by);
  c.fillRect(cx - fw / 2, by - fw / 2, fw, fw);
  c.restore();
  edgeFade(c, SPRAY.w, SPRAY.h, 26, 30);
}

/** One crest of swell (SWW×SWH, seamless left to right): a lit crest over its dark trough, broken into lengths, flecked
 * with foam. */
const SWW = 1024;
const SWH = 28;
function swellTex(c: Ctx, seed: number): void {
  const rr = rng(hashStr('jg:swell' + seed));
  const ph = rr() * 10;
  const yAt = (x: number) => SWH / 2 + Math.sin((x / SWW) * P2 * 3 + ph) * 3 + Math.sin((x / SWW) * P2 * 7 + ph * 2) * 1.5;
  const vis = (x: number) => Math.sin((x / SWW) * P2 * 5 + ph) + Math.sin((x / SWW) * P2 * 11 + seed) * 0.6;
  c.lineCap = 'round';
  for (let x = 0; x < SWW; x += 4) {
    const v = vis(x);
    if (v < -0.4) continue;
    const a = clamp01((v + 0.4) / 1.2);
    c.fillStyle = `rgba(2,3,10,${(0.5 * a).toFixed(3)})`;
    c.fillRect(x, yAt(x) + 1, 4.5, 5);
    c.fillStyle = `rgba(160,162,220,${(0.55 * a).toFixed(3)})`;
    c.fillRect(x, yAt(x) - 1.5, 4.5, 2);
    if (v > 0.9 && rr() < 0.25) {
      c.fillStyle = `rgba(220,218,250,${(0.5 * a).toFixed(3)})`;
      c.fillRect(x, yAt(x) - 2.5, 3 + rr() * 6, 1.6);
    }
  }
}

/** A chip of rock knocked off a stack (frame i of a few), half px square: lit on its top left. */
function chipFrame(c: Ctx, half: number, i: number): void {
  const rr = rng(hashStr('jg:chip' + i));
  const n = 5 + Math.floor(rr() * 3);
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * P2 + rr() * 0.6;
    const d = half * (0.45 + rr() * 0.4);
    pts.push([half + Math.cos(a) * d, half + Math.sin(a) * d * 0.8]);
  }
  const g = c.createLinearGradient(0, 0, half * 2, half * 2);
  g.addColorStop(0, '#a4aed0');
  g.addColorStop(0.5, '#4a5272');
  g.addColorStop(1, '#14182a');
  c.fillStyle = g;
  polyPath(pts)(c);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 0.8;
  c.stroke();
}

// ——— live: where things stand ———

/** The wreck's silhouette (its hull, the mast, the yard and the prow) for cutting what lies behind it. */
const WRECK_SIL: Pt[] = [[196, 666], [204, 638], [228, 600], [262, 574], [290, 494], [312, 438], [328, 446], [372, 556], [420, 548], [470, 538], [520, 528], [566, 518], [598, 506], [604, 470], [602, 446], [612, 428], [640, 430], [664, 442], [660, 470], [632, 520], [626, 666]];
/** The skull, its horns and the hook standing up off the ledge. */
const SKULL_SIL: Pt[] = [[1546, 640], [1552, 572], [1584, 556], [1600, 560], [1640, 540], [1656, 510], [1704, 500], [1708, 640]];
const FG: Pt[][] = [LSTACK, WRECK_SIL, RSTACK, LEDGE, SKULL_SIL];
/** Where the foreground stands up over the sea and the void at x (or the table's back edge). */
function fgTop(x: number): number {
  let y = TY;
  for (const pts of FG) {
    const t = topAt(pts, x);
    if (t !== null) y = Math.min(y, t);
  }
  return y;
}

/** Where a burst of spray goes up (x, the waterline, its size). */
const SPRAY_AT: [number, number, number][] = [[92, 656, 0.9], [216, 658, 0.75], [606, 650, 0.5], [1548, 648, 0.55], [1724, 656, 0.72], [1858, 660, 0.68]];

// ——— live ———

interface Serpent {
  alive: boolean;
  phase: number;
  type?: { id?: string };
}

registerKitScene(JORMUNGANDR, (k: KitLive, wave0: number) => {
  const top = k.slot('top');
  const deckS = k.sprite('deckLit').setBlendMode(Phaser.BlendModes.ADD);
  // the lightning's flash along the stacks' edges against the sky
  const rimS = ['lRim', 'rRim'].map((id) => k.sprite(id).setBlendMode(Phaser.BlendModes.ADD));
  // the storm darkening the sky as it builds (under the mist and the lightning: they stay bright)
  const darkKey = k.tex('jg_stormdark', 4, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(36,36,64,1)');
    g.addColorStop(0.55, 'rgba(64,64,104,0.75)');
    g.addColorStop(1, 'rgba(90,90,130,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 256);
  });
  const stormDark = k.img(darkKey, 0, 0, { into: top, origin: [0, 0], sx: W / 4, sy: TY / 256, alpha: 0 }).setBlendMode(Phaser.BlendModes.MULTIPLY);

  // ——— the masks: what lies behind the stacks, the wreck and the table ———
  // (drawn in the stage's own coordinates and moved with it: it follows the stage wherever it's shown, scaled into a
  // card on the stages page or shaken with the camera in play)
  const masks: Phaser.GameObjects.Graphics[] = [];
  const masked = (lower: (x: number) => number, upper: ((x: number) => number) | null) => {
    const c = k.sc.add.container(0, 0);
    top.add(c);
    const g = k.sc.make.graphics({}, false);
    g.fillStyle(0xffffff, 1);
    const p: Phaser.Geom.Point[] = [];
    if (upper) for (let x = 0; x <= W; x += 4) p.push(new Phaser.Geom.Point(x, upper(x)));
    else p.push(new Phaser.Geom.Point(0, 0), new Phaser.Geom.Point(W, 0));
    for (let x = W; x >= 0; x -= 4) p.push(new Phaser.Geom.Point(x, upper ? Math.max(upper(x), lower(x)) : lower(x)));
    g.fillPoints(p, true);
    c.setMask(g.createGeometryMask());
    masks.push(g);
    return c;
  };
  // beyond the rim (the void, the mist, the lightning); on the sea; anything standing up out of it (the coils)
  const beyond = masked((x) => Math.min(edgeY(x), fgTop(x)), null);
  const onSea = masked((x) => fgTop(x), (x) => edgeY(x));
  const world = masked((x) => fgTop(x), null);
  const near = k.sc.add.container(0, 0);
  top.add(near);
  const fitMasks = () => {
    const m = k.root.getWorldTransformMatrix();
    for (const g of masks) g.setPosition(m.tx, m.ty).setScale(m.scaleX, m.scaleY);
  };
  fitMasks();

  // ——— hero: the world's edge ———
  // the wall of spray rising out of the void along the rim: a band of painted frames cross-faded and scrolled, twice
  // over at two speeds and sizes, so the banks pass through each other and never visibly repeat
  const MN = 8;
  const mistKey = sheet(k, 'jg_mist', MW / 2, MH / 2, MN, (c, ph) => {
    const [tc, tg] = makeCanvas(MW / 2, MH / 2);
    tg.scale(0.5, 0.5);
    mistTile(tg, 0, ph);
    c.filter = 'blur(1px)';
    c.drawImage(tc, 0, 0);
    c.filter = 'none';
  });
  // (two banks off the same frames out of step: a low one along the rim, a taller one behind it, swaying a little)
  const mistFar = new Loop(k, mistKey, MN, 0, RIM + 6, { into: beyond, origin: [0, 1], sx: 2, sy: 2 * 1.15, fps: 0.6, phase: 4 });
  const mistNear = new Loop(k, mistKey, MN, 0, RIM + 6, { into: beyond, origin: [0, 1], scale: 2, fps: 0.8 });
  const stepBand = (m: Loop, al: number, dt: number, speed: number, t: number, seed: number) => {
    m.alpha = al;
    m.step(dt, speed);
    m.each((im) => im.setX(Math.sin(t * 0.07 + seed) * 14 - 14));
  };
  // plumes off the near edge
  const plumeKey = sheet(k, 'jg_plume', PW / 2, PH / 2, MN, (c, ph) => {
    c.scale(0.5, 0.5);
    plumeFrame(c, ph, 0);
  });
  const plumes = PLUMES.map(([x, s]) => new Loop(k, plumeKey, MN, x, edgeY(x) + 10, { into: beyond, origin: [0.5, 1], scale: 2 * s, fps: 1.1 }));
  // the flow streaming out to the lip (streaks speeding up as they go), spray tossed off it into the dark (falling away
  // past the edge), a veil of fine spray rising off it
  const flow = new Parts(k, { frame: 'mote', into: onSea, max: 140 });
  const lipSpray = new Parts(k, { frame: 'drop', into: beyond, max: 220 });
  const veil = new Parts(k, { frame: 'puff', into: beyond, max: 40 });
  const flowRate = new Rate();
  const sprayRate = new Rate();
  const veilRate = new Rate();
  const lipX = () => (crand() < 0.45 ? crand() * JG.edge0 : JG.edge0 - 30 + crand() ** 0.7 * (W - JG.edge0 + 30));
  const flowOne = () => {
    const x0 = 1020 + crand() * 900;
    const ey = edgeY(x0);
    const kk = kAt(ey + 20);
    const gap = (30 + crand() * 120) * kk;
    const ang = Math.atan2(edgeY(x0 + 20) - edgeY(x0 - 20), 40);
    const nx = Math.sin(ang);
    const ny = -Math.cos(ang);
    const v0 = (14 + crand() * 14) * kk;
    const acc = 46 * kk;
    const life = (-v0 + Math.sqrt(v0 * v0 + 2 * acc * gap)) / acc;
    flow.spawn({ x: x0 - nx * gap, y: ey - ny * gap, vx: nx * v0, vy: ny * v0, grav: -acc * 0.9, life, r0: (1.2 + crand() * 1.4) * kk, a: 0.35 + crand() * 0.3, tint: crand() < 0.4 ? 0xdcdaff : 0x9a9cd4, fade: 0.25 });
  };
  const sprayOne = (big = 1) => {
    const x = lipX();
    const ey = edgeY(x);
    const kk = kAt(ey) * 1.2 + 0.25;
    lipSpray.spawn({ x, y: ey - 1, vx: (Math.sin(Math.atan2(edgeY(x + 20) - edgeY(x - 20), 40)) * (30 + crand() * 40) + (crand() - 0.5) * 16) * kk, vy: -(40 + crand() * 90) * kk * big, grav: 240 * kk, life: 1.4, r0: (1.5 + crand() * 1.8) * kk, a: 0.65 + crand() * 0.3, tint: crand() < 0.5 ? 0xecebff : 0xb4b2ee, streak: 0.05, fade: 0.05 });
  };

  // ——— hero: the sea surging ———
  // crests of swell (each a strip, scaled for its distance) running out across the sea to the rim
  const swellKeys = [0, 1, 2].map((i) => k.tex('jg_swell' + i, SWW, SWH, (c) => swellTex(c, i)));
  const NS = 11;
  const swells = Array.from({ length: NS }, (_, i) => ({
    t: i / NS,
    im: (() => {
      const s = k.sc.add.tileSprite(0, 0, W, SWH, swellKeys[i % 3]).setOrigin(0, 0.5);
      s.tilePositionX = crand() * SWW;
      onSea.add(s);
      return s;
    })(),
    v: (crand() - 0.5) * 6,
  }));
  let heave = 0;
  let heaveV = 0;
  // bursts of white water up the stacks, the skerry and the ledge (a painted burst played through, drops flying)
  const sprayKey = sheet(k, 'jg_spray', SPRAY.w * SPRAY.res, SPRAY.h * SPRAY.res, SPRAY.n, (c, ph) => {
    c.scale(SPRAY.res, SPRAY.res);
    sprayFrame(c, ph * (SPRAY.n / (SPRAY.n - 1)));
  });
  const bursts = SPRAY_AT.map(([x, y, s], i) => {
    const l = new Loop(k, sprayKey, SPRAY.n, x, y + 8, { into: near, origin: [0.5, 1], scale: s / SPRAY.res, fps: 0 });
    l.a.setFlipX(i % 2 === 1);
    l.b.setFlipX(i % 2 === 1);
    l.alpha = 0;
    l.show(0);
    return { l, t: 9, dur: 1.5, s, x, y };
  });
  const drops = new Parts(k, { frame: 'drop', into: near, max: 120 });
  const burst = (i: number, big = 1) => {
    const b = bursts[i];
    if (b.t < b.dur * 0.6) return;
    b.t = 0;
    b.dur = 1.3 + crand() * 0.5;
    for (let n = 0; n < Math.round(8 * big); n++) {
      drops.spawn({ x: b.x + (crand() - 0.5) * 40 * b.s, y: b.y - 60 * b.s * crand(), vx: (crand() - 0.5) * 140 * b.s, vy: -(120 + crand() * 200) * b.s * big, grav: 620, life: 1.4, r0: (1.4 + crand() * 1.8) * b.s, a: 0.8, tint: 0xe8e6ff, floor: b.y + 2, streak: 0.02, fade: 0.04 });
    }
  };
  /** A big swell arriving: it bursts on the stacks one after another as it comes in. */
  const surge = (big = 1) => {
    const order = crand() < 0.5 ? [0, 1, 2] : [3, 4, 5];
    order.forEach((i, j) => k.sc.time.delayedCall(j * (160 + crand() * 200), () => burst(i, big)));
    if (crand() < 0.6) {
      const other = order[0] === 0 ? [3, 4, 5] : [0, 1, 2];
      k.sc.time.delayedCall(500 + crand() * 600, () => burst(other[Math.floor(crand() * 3)], big * 0.8));
    }
  };

  // ——— hero: the far coils turning ———
  const coilKey = sheet(k, 'jg_coil', CW, CH, MN, (c, ph) => coilFrame(c, ph));
  const coils = COILS.map(([x, y, s, flip, ph]) => {
    const l = new Loop(k, coilKey, MN, x, y, { into: world, origin: [0.5, CY / CH], scale: s, fps: 0.9, phase: ph * MN });
    l.each((im) => im.setFlipX(flip));
    return { l, x, y, s, seed: crand() * 10 };
  });

  // ——— the lightning ———
  const boltKey = sheet(k, 'jg_bolt', BOLT.w * BOLT.res, BOLT.h * BOLT.res, BOLT.n, (c, _ph, i) => {
    c.scale(BOLT.res, BOLT.res);
    boltFrame(c, i);
  });
  const bolt = k.img(boltKey, 0, 0, { into: beyond, add: true, alpha: 0, origin: [0.5, 0], scale: 1 / BOLT.res });
  const boltGlow = k.glow(0, RIM, 160, 0xb0a8ff, 0, { into: beyond, sy: 0.4 });
  const flash = k.wash(0x8a86ec, 0, Phaser.BlendModes.ADD, near);
  let flashA = 0;
  let boltT = 2 + crand() * 3;
  let flicker = 0;
  const strike = () => {
    const zones: [number, number][] = [[700, 1080], [1230, 1520], [420, 560]];
    const [z0, z1] = zones[Math.floor(crand() * (crand() < 0.7 ? 2 : 3))];
    const x = z0 + crand() * (z1 - z0);
    bolt.setFrame(Math.floor(crand() * BOLT.n)).setPosition(x, JG.deck - 16).setScale((0.8 + crand() * 0.4) / BOLT.res).setFlipX(crand() < 0.5);
    boltGlow.setPosition(x, Math.min(edgeY(x), RIM) - 6);
    flashA = 1;
    flicker = crand() < 0.6 ? 0.18 + crand() * 0.1 : 0;
  };

  // ——— the stacks: grit and spray shaken off them, the old line on the brink ———
  const ropeS = new Swing(k.pivot(k.sprite('rope'), 1700, JG.wrap.y + 16), { k: 7, c: 0.5, idle: 0.01, seed: 2 });
  const chipKey = sheet(k, 'jg_chip', 24, 24, 4, (c, _p, i) => chipFrame(c, 12, i));
  const chips = new Parts(k, { frame: 'mote', sheet: { key: chipKey, n: 4, half: 12 }, into: near, max: 40 });
  const motes = new Parts(k, { frame: 'mote', into: near, max: 120 });
  const LEDGES: [Pt[], number][] = [[LSTACK, JG.lstack.base], [RSTACK, JG.rstack.base]];
  const shed = (n: number) => {
    for (let i = 0; i < n; i++) {
      const [pts, base] = LEDGES[crand() < 0.55 ? 0 : 1];
      const [x, y] = pts[Math.floor(crand() * pts.length)];
      if (y > base - 70) continue;
      const floor = base - 4 + crand() * 8;
      if (crand() < 0.3) chips.spawn({ x, y: y + 6, vx: (crand() - 0.5) * 50, vy: -10 - crand() * 30, life: 2.4, r0: 2.5 + crand() * 3, a: 1, tint: 0xffffff, grav: 900, floor, spin: (crand() - 0.5) * 8, fade: 0.02 });
      else if (crand() < 0.5) motes.spawn({ x, y: y + 4, vx: (crand() - 0.5) * 30, vy: -crand() * 20, life: 2.2, r0: 1.4 + crand() * 1.6, a: 0.8, tint: 0x8a92b0, grav: 520, drag: 0.4, floor, fade: 0.05 });
      else drops.spawn({ x, y: y + 4, vx: (crand() - 0.5) * 20, vy: 0, life: 1.6, r0: 1.4 + crand() * 1.4, a: 0.7, tint: 0xd8d6ff, grav: 700, floor, streak: 0.02, fade: 0.04 });
    }
  };

  // ——— the fight ———
  // (in a run the storm follows the serpent's phase; on the stages page waves 1–4 stand in for it)
  const sc = k.sc as unknown as { miniFoot?: Serpent | null; bossFoot?: Serpent | null; director?: { phaseCount?(f: unknown): number } };
  const serpent = (): Serpent | null => {
    const f = sc.miniFoot ?? sc.bossFoot;
    return f && f.alive && f.type?.id === 'jormungandr' ? f : null;
  };
  const progressOf = (f: Serpent) => {
    let n = 2;
    try {
      n = sc.director?.phaseCount?.(f) ?? 2;
    } catch {
      n = 2;
    }
    return n > 1 ? clamp01((f.phase - 1) / (n - 1)) : 0;
  };
  let wave = wave0;
  const fromWave = (w: number) => (w >= 5 ? 0.35 : clamp01((Math.max(1, w) - 1) / 3));
  let storm = fromWave(wave);
  let surgeT = 1.5 + crand() * 2;

  return {
    setWave: (w) => (wave = w),
    destroy: () => {
      for (const c of [beyond, onSea, world]) c.clearMask(true);
      for (const g of masks) g.destroy();
    },
    impact(x, _y, p) {
      // the sea heaves, the swell bursts up the stacks, they shed grit and spray, the line twitches
      heaveV -= 1.2 + p * 2.2;
      ropeS.kick((x < 1700 ? 1 : -1) * (0.3 + 0.8 * p) + (crand() - 0.5) * 0.2);
      shed(Math.round(4 + p * 12));
      const nearest = SPRAY_AT.map((s, i) => [Math.abs(s[0] - x), i]).sort((a, b) => a[0] - b[0]);
      burst(nearest[0][1], 0.8 + p * 0.5);
      if (p > 0.35) burst(nearest[1][1], 0.7 + p * 0.4);
      if (p > 0.6) surge(1 + p * 0.3);
      for (let i = 0; i < 6 + p * 20; i++) sprayOne(1.4 + p);
    },
    update(dt, t) {
      const cm = calm();
      fitMasks();
      const f = serpent();
      const target = f ? progressOf(f) : fromWave(wave);
      storm += (target - storm) * Math.min(1, dt * 0.5);
      const speed = cm * (1 + storm * 0.8);

      // the edge: the mist rising, plumes, the flow and the spray off the lip
      stepBand(mistFar, 0.28 + storm * 0.18, dt, speed, t, 1);
      stepBand(mistNear, 0.38 + storm * 0.2 + 0.08 * Math.sin(t * 0.21), dt, speed, t, 2);
      for (const pl of plumes) pl.step(dt, speed);
      flowRate.tick(46 * cm, dt, flowOne);
      sprayRate.tick((80 + storm * 50) * cm, dt, () => sprayOne(1 + storm * 0.4));
      veilRate.tick(5 * cm, dt, () => {
        const x = lipX();
        const kk = kAt(edgeY(x)) + 0.3;
        veil.spawn({ x, y: edgeY(x) - 4, vx: 4 * kk, vy: -(10 + crand() * 14) * kk, life: 2.6, r0: 10 * kk, r1: (34 + crand() * 30) * kk, a: 0.12, tint: 0xc8c6ff, drag: 0.3, fade: 0.3 });
      });
      flow.update(dt);
      lipSpray.update(dt);
      veil.update(dt);

      // the swell: crests running out to the rim, heaving at a stomp
      heaveV += (-heave * 14 - heaveV * 3.2) * dt;
      heave += heaveV * dt;
      const sp = (0.028 + storm * 0.02) * cm;
      for (const s of swells) {
        s.t = (s.t + dt * sp) % 1;
        const u = s.t;
        const y = RIM + 4 + (1 - u) ** 2.1 * (TY - RIM + 6);
        const kk = kAt(y);
        const near0 = clamp01((y - 650) / 90);
        const a = Math.min(1, u * 10) * clamp01((1 - u) * 8) * (0.35 + storm * 0.65) * (1 - near0 * 0.85) * (1 + Math.max(0, -heave) * 0.6);
        s.im.setPosition(0, y + heave * 5 * kk).setTileScale(kk * 1.4, kk * (1 + storm * 0.4 + Math.abs(heave) * 0.3)).setAlpha(Math.max(0, a));
        s.im.height = SWH * kk * 1.6;
        s.im.tilePositionX += s.v * dt;
      }
      // big swells bursting on the rocks
      surgeT -= dt * cm;
      if (surgeT <= 0) {
        surgeT = lerp(6.5, 3.2, storm) * (0.7 + crand() * 0.6);
        surge(0.8 + storm * 0.4);
      }
      for (const b of bursts) {
        if (b.t >= b.dur) {
          b.l.alpha = 0;
          b.l.show(0);
          continue;
        }
        b.t += dt;
        const u = Math.min(1, b.t / b.dur);
        b.l.alpha = Math.min(1, u * 8) * (1 - Math.max(0, u - 0.8) / 0.2) * 0.9;
        b.l.show(u * (SPRAY.n - 1.001));
      }

      // the coils rolling through the sea, rising and settling
      for (const c of coils) {
        c.l.step(dt, cm);
        const rise = 0.82 + 0.18 * Math.sin(t * 0.17 + c.seed);
        c.l.each((im) => im.setScale(c.s * (im.flipX ? 1 : 1), c.s * rise).setPosition(c.x + Math.sin(t * 0.05 + c.seed) * 6, c.y));
      }

      // lightning
      boltT -= dt;
      if (boltT <= 0) {
        boltT = lerp(11, 2.2, storm) * (0.6 + crand() * 0.8);
        strike();
      }
      if (flicker > 0) {
        flicker -= dt;
        if (flicker <= 0) flashA = Math.max(flashA, 0.75);
      }
      flashA = Math.max(0, flashA - dt * 2.6);
      const fl = flashA * cm;
      bolt.setAlpha(Math.min(1, fl * 1.4));
      boltGlow.setAlpha(fl * 0.5);
      deckS.setAlpha(fl * 0.85);
      flash.setAlpha(fl * 0.1);
      for (const s of rimS) s.setAlpha(fl);
      stormDark.setAlpha(storm * 0.42);

      ropeS.update(dt, t);
      drops.update(dt);
      chips.update(dt);
      motes.update(dt);
    },
  };
});
