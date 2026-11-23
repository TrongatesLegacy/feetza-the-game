// The Big Top (King Honk's arena, the end of the beach stage), redrawn with the location kit (src/art/scene): the
// same beach, further along the sand, the same dusk the beach bar's evening ends in. The sun has just gone down
// behind the sea on the left; its afterglow burns low along the horizon under a navy sky with the first stars and the
// thin moon. King Honk's circus has pitched on the sand: on the left a Ferris wheel stands black against the
// afterglow, its rim and spokes strung with coloured bulbs (the beach bar's festoon colours); on the right the big top
// itself, red and cream canvas glowing from the lamps inside, its door tied back on the lit ring, a marquee sign over
// it and pennants flying from its king poles. Between them a balloon seller's cart with its bunch tied to the post,
// crates by the tent with a cream pie waiting, the King's huge shoe prints coming out of the door across the sand. The
// table is the top of the King's own podium: painted boards, worn.
//
// Live, the heroes:
// - the Ferris wheel: it turns; its bulbs chase (painted at four phases, cross-faded: round the rim, out along the
//   spokes); the cars hang from their pins on pendulums and swing as it turns; a stomp jolts the wheel on its
//   drive, sets the cars swinging and browns out the bulbs for a moment;
// - the balloons: a bunch on strings tied to the cart's post, each an inverted pendulum on a spring, bobbing in the
//   sea breeze; a stomp knocks them about and pops the one nearest (rubber shreds, its string dropping), or one slips
//   its knot and floats off into the dusk; the seller ties on a new one, inflating;
// - the pennants: painted flutter at eight phases on each king pole, snapping harder after a stomp.
// Also: the door's light breathing with the show inside, sand kicked up at the table's back edge by a stomp.

import Phaser from 'phaser';
import { SLAB, xAt, yAt, zAt } from '../../art/backdrops';
import {
  type Air,
  type Box,
  type Ctx,
  type PathFn,
  type R,
  TY,
  VX,
  W,
  airMix,
  calmLanes,
  castShadow,
  crevice,
  glowAt,
  gradeAll,
  groundShadow,
  lightPool,
  polyPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { aoHalo, groundCast, lightPatch } from '../../art/scene/light';
import { foamLace, grain, planksPlane, sand, tableFalloff, tableSeam, varnish, water } from '../../art/scene/materials';
import { drift, lay, noiseMask, softly } from '../../art/scene/paint';
import { drape } from '../../art/scene/props';
import { cloud, farLand, skyFill, stars } from '../../art/scene/sky';
import { ao } from '../../art/style/kit';
import { makeCanvas, mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Spring, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, wander } from '../../game/sceneLive';

// ——— layout ———

export const BT = {
  front: 1040,
  horizon: 500,
  shore: 566,
  /** Where the sun went down (the afterglow's heart, behind the wheel). */
  glow: { x: 250, y: 500 },
  moon: { x: 1800, y: 262, r: 15 },
  /** The Ferris wheel: hub, outer rim radius, the car pins' radius; its legs' feet and the boarding deck. */
  wheel: { x: 420, y: 372, R: 212, pin: 203, feet: 676, deck: { x0: 318, x1: 522, top: 644 } },
  /** The big top: centre, the wall's half-width, eave and foot (centre and edges of their ellipses), king poles. */
  tent: { x: 1530, hw: 348, eaveC: 452, eaveE: 436, baseC: 662, baseE: 640, poleL: 1440, poleR: 1620, peak: 238, mast: 188 },
  door: { x: 1530, top: 524, hwTop: 42, hwBase: 70 },
  sign: { x: 1530, y: 480, w: 196, h: 40 },
  /** The balloon cart: its body's centre, the ground under its wheels, the post the strings are tied to. */
  cart: { x: 772, y: 690, ground: 720, post: { x: 722, y: 628 } },
  crates: { x: 1092, ground: 684 },
};

const P2 = Math.PI * 2;
const DUSK: Air = { color: '#4a4478', far: 0.62 };
const GLOW = '#ffa070';
const WARM = '#ffbe6a';
/** The beach bar's festoon colours: the funfair's bulbs are the same strings. */
const BULB_COLS = ['#ff6a8a', '#ffd84a', '#5ae0ff', '#8aff7a', '#ff9a3a'];
const HZ = BT.horizon;

/** A band of haze (as the kit's haze()) whose ends feather out over `feather` px instead of stopping square. */
function hazeBand(ctx: Ctx, y0: number, y1: number, col: string, a: number, peak: number, x0: number, x1: number, feather: number, op: GlobalCompositeOperation = 'source-over'): void {
  const k = 0.25;
  const [c, g] = makeCanvas((x1 - x0) * k, (y1 - y0) * k + 2);
  g.scale(k, k);
  g.translate(-x0, -y0);
  const vg = g.createLinearGradient(0, y0, 0, y1);
  vg.addColorStop(0, rgba(col, 0));
  vg.addColorStop(peak, rgba(col, a));
  vg.addColorStop(1, rgba(col, 0));
  g.fillStyle = vg;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.globalCompositeOperation = 'destination-in';
  const hg = g.createLinearGradient(x0, 0, x1, 0);
  const f = Math.min(0.5, feather / (x1 - x0));
  hg.addColorStop(0, 'rgba(0,0,0,0)');
  hg.addColorStop(f, 'rgba(0,0,0,1)');
  hg.addColorStop(1 - f, 'rgba(0,0,0,1)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hg;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = op;
  ctx.drawImage(c, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

// ——— the sky ———

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: HZ + 6 };
  // navy overhead, through violet to the afterglow's rose and amber on the horizon
  skyFill(ctx, box, [[0, '#070a22'], [0.3, '#121a48'], [0.56, '#2c2c66'], [0.74, '#5a3c74'], [0.88, '#b05a6e'], [0.96, '#e88a6a'], [1, '#f6aa72']]);
  lay(ctx, drift('#3a3a7a', '#04061a', 3, 511, 160, 48), box, 0.2);
  // the afterglow: strongest where the sun went down (on the left), cooling to the right
  glowAt(ctx, BT.glow.x, HZ + 10, 1100, '#ff8a5a', 0.3, 0.42);
  glowAt(ctx, BT.glow.x, HZ, 420, '#ffd090', 0.32, 0.4);
  const cool = ctx.createLinearGradient(0, 0, W, 0);
  cool.addColorStop(0, 'rgba(30,30,90,0)');
  cool.addColorStop(0.55, 'rgba(30,30,90,0.05)');
  cool.addColorStop(1, 'rgba(20,24,80,0.38)');
  ctx.fillStyle = cool;
  ctx.fillRect(0, 0, W, HZ + 6);
  stars(ctx, r, { x: 0, y: 0, w: W, h: 330 }, 170, '#f4eeff');
  // the thin moon over the sea on the right, as on the beach at dusk
  const { x, y, r: mr } = BT.moon;
  glowAt(ctx, x, y, 70, '#c8c8ff', 0.18);
  ctx.save();
  const [mc, mg] = makeCanvas(mr * 2 + 8, mr * 2 + 8);
  mg.fillStyle = '#fff2d8';
  mg.beginPath();
  mg.arc(mr + 4, mr + 4, mr, 0, P2);
  mg.fill();
  mg.globalCompositeOperation = 'destination-out';
  mg.filter = 'blur(1px)';
  mg.beginPath();
  mg.arc(mr + 10, mr + 0.5, mr * 0.96, 0, P2);
  mg.fill();
  ctx.drawImage(mc, x - mr - 4, y - mr - 4);
  ctx.restore();
  // long bars of cloud lit from beneath by the sun that's gone
  const lit = { lit: '#ffb48a', body: '#5a3e6a', shadow: '#2a2448', sunX: BT.glow.x, sunY: HZ + 90 };
  cloud(ctx, r, 360, 300, 520, 22, { ...lit, kind: 'stratus', rim: 0.8, wisp: 0.75, a: 0.6, soft: 18 });
  cloud(ctx, r, 110, 410, 360, 18, { ...lit, kind: 'stratus', rim: 0.9, wisp: 0.7, a: 0.6, soft: 14, depth: 0.5, air: DUSK });
  cloud(ctx, r, 980, 380, 620, 22, { ...lit, kind: 'stratus', rim: 0.45, wisp: 0.55, a: 0.55, depth: 0.6, air: DUSK });
  cloud(ctx, r, 1720, 352, 420, 24, { ...lit, lit: '#c88aa0', kind: 'stratus', rim: 0.3, wisp: 0.5, a: 0.5, depth: 0.6, air: DUSK });
  hazeBand(ctx, HZ - 110, HZ + 2, '#ffb888', 0.42, 0.92, -300, 1500, 420, 'screen');
  hazeBand(ctx, HZ - 70, HZ + 2, '#c87a90', 0.28, 0.92, 700, W + 300, 420, 'screen');
}

// ——— the far shore: a headland running out to sea on the right, the rest of the funfair on it ———

function far(ctx: Ctx, r: R): void {
  const pts: [number, number][] = [[860, HZ + 2]];
  for (let x = 860; x <= W; x += 20) {
    const t = (x - 860) / (W - 860);
    pts.push([x, HZ - 3 - Math.min(1, t * 3) * 20 - Math.sin(x * 0.011) * 3 - t * 12]);
  }
  pts.push([W, HZ + 2]);
  farLand(ctx, pts, HZ, '#2a2448', 0.72, DUSK, '#ffa88a', 0.2);
  // the far funfair, small in the haze: a helter-skelter, stall roofs, a carousel canopy, their strings of lights
  const fc = airMix('#241c3c', 0.66, DUSK);
  ctx.fillStyle = fc;
  const hs = { x: 1004, base: HZ - 2, h: 94 };
  ctx.beginPath();
  ctx.moveTo(hs.x - 11, hs.base);
  ctx.lineTo(hs.x - 6, hs.base - hs.h);
  ctx.lineTo(hs.x + 6, hs.base - hs.h);
  ctx.lineTo(hs.x + 11, hs.base);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hs.x - 11, hs.base - hs.h);
  ctx.lineTo(hs.x, hs.base - hs.h - 18);
  ctx.lineTo(hs.x + 11, hs.base - hs.h);
  ctx.fill();
  // its slide spiralling round it
  ctx.strokeStyle = fc;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * Math.PI * 7;
    const y = hs.base - hs.h + 8 + t * (hs.h - 8);
    const rr = 7 + t * 7;
    const px = hs.x + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, y);
    else ctx.moveTo(px, y);
  }
  ctx.stroke();
  for (const [sx, sw, sh] of [[930, 46, 20], [1074, 54, 18], [1128, 40, 16]] as const) {
    ctx.fillStyle = fc;
    ctx.fillRect(sx - sw / 2, HZ - 21 - sh, sw, sh + 20);
    ctx.beginPath();
    ctx.moveTo(sx - sw / 2 - 4, HZ - 21 - sh);
    ctx.lineTo(sx, HZ - 21 - sh - 12);
    ctx.lineTo(sx + sw / 2 + 4, HZ - 21 - sh);
    ctx.fill();
  }
  // a carousel's canopy
  ctx.beginPath();
  ctx.ellipse(1176, HZ - 40, 30, 6, 0, 0, P2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1146, HZ - 40);
  ctx.lineTo(1176, HZ - 58);
  ctx.lineTo(1206, HZ - 40);
  ctx.fill();
  ctx.fillRect(1150, HZ - 40, 52, 38);
  // their lights: tiny warm points along the eaves, strung between the stalls, haloed in the haze
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const dot = (x: number, y: number, c: string, a: number) => {
    glowAt(ctx, x, y, 6, c, a * 0.5);
    ctx.fillStyle = rgba(mix(c, '#ffffff', 0.5), a);
    ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
  };
  for (let i = 0; i < 60; i++) {
    const t = i / 59;
    const x = 900 + t * 300;
    const y = HZ - 44 + Math.abs(Math.sin(t * Math.PI * 4)) * 6 + (x > 990 && x < 1018 ? -40 * (1 - Math.abs(x - 1004) / 14) : 0);
    dot(x, y, BULB_COLS[i % 5], 0.45 + r() * 0.3);
  }
  for (let i = 0; i < 8; i++) dot(1150 + i * 7.4, HZ - 39, '#ffd890', 0.7);
  glowAt(ctx, 1060, HZ - 30, 160, '#ffa060', 0.1, 0.4);
  ctx.restore();
  hazeBand(ctx, HZ - 40, HZ + 6, '#8a5a80', 0.28, 0.85, 860, W + 200, 260);
}

// ——— the sea ———

const shoreTop = (x: number) => BT.shore + Math.sin(x * 0.005 + 1.4) * 7 + Math.sin(x * 0.019) * 3;

function sea(ctx: Ctx, r: R): void {
  water(ctx, r, 0, W, HZ, BT.shore + 14, {
    far: '#d0807a', deep: '#3a3466', near: '#262850', sky: '#ffb48a', skyA: 0.45,
    ripple: '#ffc8a8', ripples: 220, swells: 8, crest: '#e89a90',
    glitterX: BT.glow.x + 40, glitter: '#ffc090', glitterA: 0.6, glitterW: 150, seed: 61,
  });
  // the water darkens and cools away from the afterglow
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(20,18,60,0)');
  g.addColorStop(0.5, 'rgba(20,18,60,0.18)');
  g.addColorStop(1, 'rgba(14,16,50,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, HZ, W, BT.shore - HZ + 14);
  hazeBand(ctx, HZ - 4, HZ + 22, '#ffb090', 0.4, 0.15, -200, 1100, 360);
  // the headland's reflection, dim
  const rg = ctx.createLinearGradient(860, 0, 1100, 0);
  rg.addColorStop(0, 'rgba(20,16,40,0)');
  rg.addColorStop(1, 'rgba(20,16,40,0.3)');
  ctx.fillStyle = rg;
  ctx.fillRect(860, HZ + 1, W - 860, 6);
}

// ——— the sand (and everything's shadow on it) ———

function sandPath(): PathFn {
  return (c) => {
    c.beginPath();
    c.moveTo(-10, shoreTop(-10));
    for (let x = 0; x <= W + 10; x += 20) c.lineTo(x, shoreTop(x));
    c.lineTo(W + 10, TY + 4);
    c.lineTo(-10, TY + 4);
    c.closePath();
  };
}

/** A clown shoe's print in the sand (foreshortened): a long sole with a huge round toe, the sand pressed down in
 * it, a ridge squeezed up round its edge; the dusk catching the ridge's far lip, the hollow's near wall in shade. */
function shoePrint(ctx: Ctx, x: number, y: number, s: number, ang: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.34);
  ctx.rotate(ang);
  const sole: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-50 * s, 0);
    c.bezierCurveTo(-50 * s, -14 * s, -20 * s, -15 * s, 4 * s, -15 * s);
    c.bezierCurveTo(30 * s, -26 * s, 62 * s, -24 * s, 62 * s, 0);
    c.bezierCurveTo(62 * s, 24 * s, 30 * s, 26 * s, 4 * s, 15 * s);
    c.bezierCurveTo(-20 * s, 15 * s, -50 * s, 14 * s, -50 * s, 0);
    c.closePath();
  };
  // the ridge round it
  ctx.strokeStyle = 'rgba(255,200,170,0.16)';
  ctx.lineWidth = 7 * s;
  sole(ctx);
  ctx.stroke();
  // the hollow
  sole(ctx);
  ctx.fillStyle = 'rgba(40,26,60,0.3)';
  ctx.fill();
  within(ctx, sole, () => {
    ctx.fillStyle = 'rgba(20,12,40,0.38)';
    ctx.beginPath();
    ctx.ellipse(6 * s, -20 * s, 70 * s, 14 * s, 0, 0, P2);
    ctx.fill();
    // the tread: bars across the sole
    ctx.fillStyle = 'rgba(255,210,180,0.1)';
    for (let i = -4; i <= 4; i++) ctx.fillRect(i * 10 * s - 1.5 * s, -18 * s, 3 * s, 36 * s);
  });
  ctx.restore();
}

function sandLayer(ctx: Ctx, r: R): void {
  const s = BT.shore;
  const path = sandPath();
  within(ctx, path, () => {
    const box = { x: 0, y: s - 20, w: W, h: TY - s + 30 };
    sand(ctx, r, box, '#c4a08e', { ripples: 230, light: '#ffc8a0', shadow: '#4a4088', sparkle: 0.5, seed: 73 });
    // dusk over it: the light is the sky's, dim and violet; warmer towards the afterglow
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#c890a4');
    g.addColorStop(0.45, '#8e7cae');
    g.addColorStop(1, '#6a64a0');
    ctx.fillStyle = g;
    ctx.fillRect(0, s - 20, W, TY - s + 30);
    ctx.restore();
    // wet sand at the water's edge mirroring the afterglow
    vfill(ctx, 0, s - 16, W, 40, [[0, 'rgba(60,40,70,0.5)'], [1, 'rgba(60,40,70,0)']]);
    lightPool(ctx, BT.glow.x + 60, s + 4, 380, 10, '#ffb890', 0.3, 'screen');
    // the sand nearer the table is in the dusk's shade
    vfill(ctx, 0, TY - 130, W, 134, [[0, 'rgba(16,10,34,0)'], [1, 'rgba(16,10,34,0.55)']]);
    // and falls off into the dusk towards both edges
    const eg = ctx.createLinearGradient(0, 0, W, 0);
    eg.addColorStop(0, 'rgba(14,8,30,0.4)');
    eg.addColorStop(0.18, 'rgba(14,8,30,0)');
    eg.addColorStop(0.86, 'rgba(14,8,30,0)');
    eg.addColorStop(1, 'rgba(14,8,30,0.45)');
    ctx.fillStyle = eg;
    ctx.fillRect(0, s - 20, W, TY - s + 30);
    // the King's shoe prints, out of the big top's door across the sand towards the table
    const prints: [number, number, number, number][] = [[1500, 676, 0.58, -0.2], [1430, 690, 0.66, 0.15], [1370, 704, 0.74, -0.25], [1290, 720, 0.84, 0.1], [1220, 738, 0.94, -0.3]];
    for (const [px, py, ps, pa] of prints) shoePrint(ctx, px, py, ps, Math.PI + pa);
    // the show's litter: confetti trodden in, popcorn, a torn ticket or two (round the tent, the cart and the
    // wheel, not in the middle)
    for (let i = 0; i < 80; i++) {
      const side = r() < 0.3;
      const sp = (r() + r() + r() - 1.5) / 1.5;
      const x = side ? 770 + sp * 160 : 1530 + sp * 300;
      const y = side ? 726 + (r() - 0.5) * 50 : 690 + r() ** 0.8 * 66;
      const sc = 0.6 + ((y - s) / (TY - s)) * 0.8;
      if (r() < 0.75) {
        ctx.fillStyle = rgba(BULB_COLS[Math.floor(r() * 5)], 0.22 + r() * 0.2);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(r() * 3);
        ctx.fillRect(-2.2 * sc, -1 * sc, 4.4 * sc, 2 * sc);
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(240,226,200,0.6)';
        ctx.beginPath();
        ctx.arc(x, y, 2 * sc, 0, P2);
        ctx.arc(x + 1.6 * sc, y - 0.8 * sc, 1.6 * sc, 0, P2);
        ctx.fill();
        ctx.fillStyle = 'rgba(20,12,40,0.35)';
        ctx.fillRect(x - 1.5 * sc, y + 1.4 * sc, 4 * sc, 1);
      }
    }
    for (const [x, y, a] of [[640, 742, 0.3], [1180, 706, -0.5], [1720, 740, 0.2]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.45);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(20,12,40,0.35)';
      ctx.fillRect(-9, -3, 20, 12);
      ctx.fillStyle = 'rgba(230,200,150,0.75)';
      ctx.fillRect(-10, -6, 20, 12);
      ctx.fillStyle = 'rgba(170,40,50,0.6)';
      ctx.fillRect(-10, -6, 5, 12);
      ctx.restore();
    }
    // the door's light thrown out across the sand, the flaps' shadows cutting it
    const d = BT.door;
    lightPatch(ctx, [[d.x - d.hwBase + 6, BT.tent.baseC - 2], [d.x + d.hwBase - 6, BT.tent.baseC - 2], [d.x + 250, TY + 6], [d.x - 230, TY + 6]], { col: '#ffb468', a: 0.5, soft: 10, fade: 0.55 });
    lightPool(ctx, d.x, BT.tent.baseC + 14, 150, 22, '#ffc27a', 0.3, 'screen');
    // the wheel's bulbs colour the sand under it
    lightPool(ctx, BT.wheel.x, BT.wheel.feet + 10, 300, 40, '#ff8ab0', 0.1, 'screen');
    lightPool(ctx, BT.wheel.x + 10, BT.wheel.deck.top - 4, 190, 40, '#ffc488', 0.16, 'screen');
    lightPool(ctx, BT.wheel.x + 60, BT.wheel.feet + 14, 200, 26, '#ffd870', 0.1, 'screen');
  });
  // shadows: the afterglow is low on the left, so the wheel and the tent throw long, faint shadows to the right; the
  // door's light throws the crates' and the cart's away from it
  within(ctx, path, () => {
    const { x: wx, y: wy, feet } = BT.wheel;
    groundCast(ctx, (c) => {
      c.beginPath();
      c.arc(wx, wy, BT.wheel.R, 0, P2);
      c.moveTo(wx - 130, feet);
      c.lineTo(wx, wy);
      c.lineTo(wx + 130, feet);
    }, feet, 1.3, 0.1, 0.12, 10, '#2a1c44');
    groundCast(ctx, legsPath(0), feet, 0.9, 0.08, 0.22, 4, '#2a1c44');
    groundShadow(ctx, wx, feet + 2, 160, 10, 0.5, '#1a1030');
    groundShadow(ctx, wx - 126, feet + 1, 22, 5, 0.6, '#140c28');
    groundShadow(ctx, wx + 130, feet + 1, 22, 5, 0.6, '#140c28');
    const t = BT.tent;
    ao(ctx, t.x + 120, t.baseC + 8, t.hw + 120, 26, 0.45, 0, '#1a1030');
    groundShadow(ctx, BT.cart.x + 10, BT.cart.ground, 88, 9, 0.5, '#1a1030');
    groundCast(ctx, cartPath(), BT.cart.ground, -0.5, 0.12, 0.2, 5, '#24183c');
    groundShadow(ctx, BT.crates.x + 10, BT.crates.ground, 96, 9, 0.5, '#1a1030');
    groundCast(ctx, cratesPath(), BT.crates.ground, -0.7, 0.14, 0.24, 5, '#24183c');
  });
  // the foam of the last wave, dim at dusk
  foamLace(ctx, r, (x) => shoreTop(x) + 2, -10, W + 10, 20, { a: 0.42, col: '#f0d8e0', shadow: '#3a3060', seed: 7 });
}

// ——— the Ferris wheel ———

const WH = BT.wheel;
const SPOKES = 16;
const RIM_BULBS = 48;
const SPOKE_R = [64, 96, 128, 160];
const CARS = 8;
/** The wheel's paint: white once, lilac-grey in the dusk. */
const STEEL = '#5c5878';
const STEEL_INK = '#221e3a';
/** The wheel's sprite: a square round the hub with margin (its painting is centred in it). */
const WHEEL_S = 2 * (WH.R + 22);
const WHEEL_BOX: Box = { x: WH.x - WHEEL_S / 2, y: WH.y - WHEEL_S / 2, w: WHEEL_S, h: WHEEL_S };

/** A painted tube along a path (stroked three times: ink, paint, the highlight along its middle). Lit the same all
 * along, so it reads the same however the wheel turns. */
function tube(ctx: Ctx, path: () => void, w: number, base = STEEL): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = STEEL_INK;
  ctx.lineWidth = w + 2.4;
  path();
  ctx.stroke();
  ctx.strokeStyle = base;
  ctx.lineWidth = w;
  path();
  ctx.stroke();
  ctx.strokeStyle = rgba(shade(base, 0.4), 0.4);
  ctx.lineWidth = Math.max(0.8, w * 0.3);
  path();
  ctx.stroke();
}

/** A small bulb, dimly on (the chase lights it brighter, live). */
function wheelBulb(ctx: Ctx, x: number, y: number, col: string, s = 3.4): void {
  ctx.fillStyle = '#18141e';
  ctx.beginPath();
  ctx.arc(x, y, s + 1.2, 0, P2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, mix(col, '#ffffff', 0.45));
  g.addColorStop(1, mix(col, '#3a2a40', 0.3));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, P2);
  ctx.fill();
}

const rimCol = (j: number) => BULB_COLS[j % BULB_COLS.length];

/** The wheel itself, round its hub at (cx, cy): the rim's two rings and their truss, the spokes with their tension
 * rods, the bracing ring, the car pins, the bulbs, the hub with its painted star. */
function wheel(ctx: Ctx, cx: number, cy: number): void {
  const R = WH.R;
  const Ri = R - 18;
  const ang = (i: number, n: number) => (i / n) * P2;
  // the spokes: a tube from the hub to the inner ring, a tension rod beside it to the outer ring
  for (let i = 0; i < SPOKES; i++) {
    const a = ang(i, SPOKES);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const a2 = a + 0.07;
    ctx.strokeStyle = rgba(STEEL_INK, 0.9);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a - 0.2) * 34, cy + Math.sin(a - 0.2) * 34);
    ctx.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R);
    ctx.stroke();
    tube(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(cx + c * 30, cy + s * 30);
      ctx.lineTo(cx + c * Ri, cy + s * Ri);
    }, 4.2);
  }
  // the bracing ring halfway out, and lattice between it and the rim
  tube(ctx, () => {
    ctx.beginPath();
    for (let i = 0; i <= SPOKES; i++) {
      const a = ang(i, SPOKES);
      const x = cx + Math.cos(a) * 112;
      const y = cy + Math.sin(a) * 112;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
  }, 2.6);
  for (let i = 0; i < SPOKES; i++) {
    const a0 = ang(i, SPOKES);
    const a1 = ang(i + 1, SPOKES);
    tube(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a0) * 112, cy + Math.sin(a0) * 112);
      ctx.lineTo(cx + Math.cos(a1) * Ri, cy + Math.sin(a1) * Ri);
    }, 1.6);
  }
  // the rim: two rings and the zigzag truss between them
  tube(ctx, () => {
    ctx.beginPath();
    for (let i = 0; i <= RIM_BULBS; i++) {
      const a = ang(i, RIM_BULBS);
      const rr = i % 2 ? R : Ri;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
  }, 1.8);
  for (const rr of [Ri, R]) {
    tube(ctx, () => {
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, P2);
    }, rr === R ? 5 : 4);
  }
  // the car pins: a boss on the truss at each car
  for (let i = 0; i < CARS; i++) {
    const a = ang(i, CARS) + P2 / SPOKES / 2;
    const x = cx + Math.cos(a) * WH.pin;
    const y = cy + Math.sin(a) * WH.pin;
    ctx.fillStyle = STEEL_INK;
    ctx.beginPath();
    ctx.arc(x, y, 6.5, 0, P2);
    ctx.fill();
    ctx.fillStyle = shade(STEEL, -0.1);
    ctx.beginPath();
    ctx.arc(x, y, 4.6, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.5);
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, P2);
    ctx.fill();
  }
  // the bulbs: round the rim in the festoon colours, warm white along the spokes
  for (let j = 0; j < RIM_BULBS; j++) {
    const a = ang(j, RIM_BULBS);
    wheelBulb(ctx, cx + Math.cos(a) * (R + 1), cy + Math.sin(a) * (R + 1), rimCol(j));
  }
  for (let i = 0; i < SPOKES; i++) {
    const a = ang(i, SPOKES);
    for (const rr of SPOKE_R) wheelBulb(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, '#ffe2a0', 2.8);
  }
  // the hub: a drum with a painted star on its face, bolts round it
  const hub: PathFn = (c) => {
    c.beginPath();
    c.arc(cx, cy, 34, 0, P2);
  };
  ctx.fillStyle = STEEL_INK;
  ctx.beginPath();
  ctx.arc(cx, cy, 37, 0, P2);
  ctx.fill();
  const hg = ctx.createRadialGradient(cx, cy, 6, cx, cy, 34);
  hg.addColorStop(0, '#5a3a5a');
  hg.addColorStop(0.75, '#3a2a48');
  hg.addColorStop(1, '#241c34');
  ctx.fillStyle = hg;
  hub(ctx);
  ctx.fill();
  within(ctx, hub, () => grain(ctx, { x: cx - 34, y: cy - 34, w: 68, h: 68 }, 'cast', 0.4));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? 9 : 22;
    if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  const sg = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
  sg.addColorStop(0, '#ffe08a');
  sg.addColorStop(1, '#d89a3a');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = '#3a1e14';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * P2;
    ctx.fillStyle = '#1a1424';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 29, Math.sin(a) * 29, 2.4, 0, P2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,210,240,0.5)';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 29 - 0.6, Math.sin(a) * 29 - 0.6, 1, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = '#c8c0d8';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, P2);
  ctx.fill();
  ctx.strokeStyle = '#1a1424';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

/** One frame of the bulbs' chase (phase i of 4), in a WHEEL_S square at scale k, the hub at its centre: every bulb's
 * faint glow, the lit ones' halo and hot core. Round the rim the lit bulbs step on one at a time; along the spokes
 * the lit ring steps outwards. */
function chaseFrame(c: Ctx, i: number, k: number): void {
  c.save();
  c.scale(k, k);
  c.globalCompositeOperation = 'lighter';
  const cx = WHEEL_S / 2;
  const cy = WHEEL_S / 2;
  const lamp = (x: number, y: number, col: string, on: boolean, s = 1) => {
    const rad = (on ? 13 : 6) * s;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba(mix(col, '#ffffff', 0.6), (on ? 0.55 : 0.16) * s));
    g.addColorStop(on ? 0.22 : 0.4, rgba(col, (on ? 0.4 : 0.08) * s));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  for (let j = 0; j < RIM_BULBS; j++) {
    const a = (j / RIM_BULBS) * P2;
    lamp(cx + Math.cos(a) * (WH.R + 1), cy + Math.sin(a) * (WH.R + 1), rimCol(j), j % 4 === i);
  }
  for (let s = 0; s < SPOKES; s++) {
    const a = (s / SPOKES) * P2;
    SPOKE_R.forEach((rr, q) => lamp(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, '#ffd890', q === i, 0.55 + q * 0.1));
  }
  c.restore();
}

/** The A-frame legs (off: the far frame, a little to the right): two tubes from the hub down to their feet, a
 * cross-brace, foot plates. */
function legsPath(off: number): PathFn {
  const { x, y, feet } = WH;
  return (c) => {
    c.beginPath();
    for (const s of [-1, 1]) {
      const fx = x + s * 130 + off;
      c.moveTo(x + off - 6, y);
      c.lineTo(x + off + 6, y);
      c.lineTo(fx + 8, feet);
      c.lineTo(fx - 8, feet);
      c.closePath();
    }
    c.rect(x + off - 104, 600, 208, 7);
    c.rect(x + off - 148, feet - 6, 36, 7);
    c.rect(x + off + 112, feet - 6, 36, 7);
  };
}

function legs(ctx: Ctx, off: number, far: boolean): void {
  const p = legsPath(off);
  const base = far ? '#2c2846' : '#45405e';
  solid(ctx, p, { x: WH.x - 160 + off, y: WH.y, w: 320, h: WH.feet - WH.y }, 'iron', base, { line: far ? 1.4 : 2, depth: far ? 0.35 : 0.2, air: DUSK });
  // the afterglow along their left edges
  within(ctx, p, () => {
    const g = ctx.createLinearGradient(WH.x - 160, 0, WH.x + 160, 0);
    g.addColorStop(0, rgba(GLOW, far ? 0.16 : 0.3));
    g.addColorStop(0.5, rgba(GLOW, 0.04));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(WH.x - 170 + off, WH.y, 340, WH.feet - WH.y);
    ctx.globalCompositeOperation = 'source-over';
    for (const s of [-1, 1]) {
      for (let k = 1; k < 9; k++) {
        const t = k / 9;
        ctx.fillStyle = 'rgba(8,6,16,0.5)';
        ctx.beginPath();
        ctx.arc(WH.x + off + s * 130 * t, WH.y + t * (WH.feet - WH.y), 1.3, 0, P2);
        ctx.fill();
      }
    }
  });
  // the frame's head, where the axle sits
  if (!far) {
    ctx.fillStyle = '#16121e';
    ctx.beginPath();
    ctx.arc(WH.x + off, WH.y, 13, 0, P2);
    ctx.fill();
    ctx.fillStyle = '#6a6488';
    ctx.beginPath();
    ctx.arc(WH.x + off - 1, WH.y - 1, 8, 0, P2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,180,0.6)';
    ctx.beginPath();
    ctx.arc(WH.x + off - 3, WH.y - 3, 2.4, 0, P2);
    ctx.fill();
  }
}

/** The boarding deck under the wheel: plank top in the bulbs' light, a boarded front, steps down on the right, a
 * rail; the far legs behind it. */
function wheelBack(ctx: Ctx, r: R): void {
  legs(ctx, 12, true);
  const { x0, x1, top } = WH.deck;
  const front = top + 8;
  const bottom = WH.feet + 2;
  castShadow(ctx, (c) => {
    c.beginPath();
    c.rect(x0, top, x1 - x0, bottom - top);
  }, 5, 6, 0.4, '#140c26');
  // the rail along the back of the deck
  ctx.strokeStyle = '#1e1828';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0 + 10, top - 22);
  ctx.lineTo(x1 - 10, top - 22);
  for (let x = x0 + 10; x <= x1 - 10; x += 32) {
    ctx.moveTo(x, top - 22);
    ctx.lineTo(x, top + 1);
  }
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffb8a0', 0.4);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + 10, top - 23.5);
  ctx.lineTo(x1 - 10, top - 23.5);
  ctx.stroke();
  // the top: planks across, the bulbs' pink and gold on them
  const topP = polyPath([[x0 + 8, top], [x1 - 8, top], [x1, front], [x0, front]]);
  solid(ctx, topP, { x: x0, y: top, w: x1 - x0, h: front - top }, 'wood', '#7a5a5a', { line: 1.4 });
  within(ctx, topP, () => lightPool(ctx, WH.x, top + 4, 120, 6, '#ffb0c0', 0.4, 'screen'));
  // the front: vertical boards, dark, each lit at its top
  const frontP: PathFn = (c) => {
    c.beginPath();
    c.rect(x0, front, x1 - x0, bottom - front);
  };
  solid(ctx, frontP, { x: x0, y: front, w: x1 - x0, h: bottom - front }, 'wood', '#4a3440', { line: 1.6 });
  within(ctx, frontP, () => {
    for (let x = x0 + 13; x < x1; x += 13 + r() * 2) {
      ctx.fillStyle = 'rgba(10,6,16,0.55)';
      ctx.fillRect(x, front, 1.6, bottom - front);
    }
    vfill(ctx, x0, front, x1 - x0, bottom - front, [[0, 'rgba(255,170,190,0.18)'], [0.3, 'rgba(0,0,0,0)'], [1, 'rgba(10,6,20,0.45)']]);
    ctx.font = `bold 13px ${SLAB}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(240,210,170,0.42)';
    ctx.fillText('RIDES 2¢', WH.x, front + 19);
  });
  // steps down on the right
  for (let k = 0; k < 3; k++) {
    const sx = x1 + k * 12;
    const sy = front + 4 + k * 8;
    const sp = polyPath([[sx, sy], [sx + 14, sy], [sx + 14, bottom + 6], [sx, bottom + 6]]);
    solid(ctx, sp, { x: sx, y: sy, w: 14, h: bottom + 6 - sy }, 'wood', '#5a4048', { line: 1.2 });
  }
  groundShadow(ctx, x1 + 24, bottom + 6, 30, 4, 0.5, '#140c26');
  crevice(ctx, x0 - 6, x1 + 40, bottom + 2, 7, 0.8, '#0a0616');
  for (const fx of [WH.x - 130, WH.x + 130, WH.x - 118, WH.x + 142]) ao(ctx, fx, WH.feet + 1, 26, 3.5, 0.85, 0, '#0a0616');
}

// ——— the cars ———

const CAR_W = 72;
const CAR_H = 82;
/** The pin's height in a car's frame (it hangs from (CAR_W / 2, CAR_PIN)). */
const CAR_PIN = 5;
const CAR_COLS = ['#e0485a', '#f0b83a', '#38aac8', '#f07e34'];

/** A car hanging from its pin at (x, y): the hanger, a scalloped striped canopy, two posts, the tub with its band and
 * gold rim, the dark inside under the canopy; lit from the left (the cars hang upright, so their light stays put). */
function car(ctx: Ctx, x: number, y: number, i: number): void {
  const col = CAR_COLS[i % CAR_COLS.length];
  ctx.strokeStyle = STEEL_INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 14);
  ctx.stroke();
  ctx.strokeStyle = '#7a7494';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x, y + 14);
  ctx.stroke();
  // the inside, seen between canopy and tub
  ctx.fillStyle = '#1a1226';
  ctx.fillRect(x - 24, y + 26, 48, 18);
  ctx.fillStyle = rgba('#ffcf90', 0.22);
  ctx.fillRect(x - 24, y + 26, 48, 3);
  for (const s of [-1, 1]) {
    ctx.fillStyle = STEEL_INK;
    ctx.fillRect(x + s * 22 - 2, y + 24, 4, 20);
    ctx.fillStyle = 'rgba(200,190,220,0.5)';
    ctx.fillRect(x + s * 22 - 1, y + 24, 1.2, 20);
  }
  // the canopy: a low dome with a scalloped valance, striped
  const can: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 30, y + 26);
    c.quadraticCurveTo(x - 26, y + 12, x, y + 11);
    c.quadraticCurveTo(x + 26, y + 12, x + 30, y + 26);
    for (let k = 5; k >= 0; k--) {
      const sx = x - 30 + k * 10;
      c.quadraticCurveTo(sx + 5, y + 33, sx, y + 26);
    }
    c.closePath();
  };
  solid(ctx, can, { x: x - 30, y: y + 10, w: 60, h: 24 }, 'canvas', col, { line: 1.6, formSize: 6 });
  within(ctx, can, () => {
    for (let k = -2; k <= 2; k += 2) {
      ctx.fillStyle = 'rgba(250,236,214,0.75)';
      ctx.beginPath();
      ctx.moveTo(x + k * 5 - 2, y + 11);
      ctx.lineTo(x + k * 12 - 5, y + 34);
      ctx.lineTo(x + k * 12 + 5, y + 34);
      ctx.lineTo(x + k * 5 + 2, y + 11);
      ctx.fill();
    }
    vfill(ctx, x - 30, y + 10, 60, 24, [[0, 'rgba(255,220,190,0.25)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(20,8,30,0.35)']]);
    lightPool(ctx, x, y + 12, 34, 10, '#ffc8a0', 0.3, 'screen');
  });
  ctx.fillStyle = '#fff0c8';
  ctx.beginPath();
  ctx.arc(x, y + 10, 2.4, 0, P2);
  ctx.fill();
  // the tub
  const tub: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 28, y + 42);
    c.lineTo(x + 28, y + 42);
    c.lineTo(x + 26, y + 62);
    c.quadraticCurveTo(x + 24, y + 72, x + 12, y + 73);
    c.lineTo(x - 12, y + 73);
    c.quadraticCurveTo(x - 24, y + 72, x - 26, y + 62);
    c.closePath();
  };
  solid(ctx, tub, { x: x - 28, y: y + 42, w: 56, h: 32 }, 'enamel', '#e8dcc4', { line: 1.8, formSize: 7 });
  within(ctx, tub, () => {
    ctx.fillStyle = col;
    ctx.fillRect(x - 30, y + 50, 60, 9);
    ctx.fillStyle = 'rgba(20,6,20,0.25)';
    ctx.fillRect(x - 30, y + 57, 60, 2);
    // the dusk is dim: the tub's right falls into shade, the afterglow warms its left
    const g = ctx.createLinearGradient(x - 28, 0, x + 28, 0);
    g.addColorStop(0, 'rgba(255,190,150,0.16)');
    g.addColorStop(0.45, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(20,14,50,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 30, y + 40, 60, 36);
    // the rim's bulbs just above it light its upper edge, pink and gold
    lightPool(ctx, x - 6, y + 42, 40, 10, '#ffb0c0', 0.28, 'screen');
  });
  ctx.fillStyle = '#d8a848';
  ctx.fillRect(x - 30, y + 40, 60, 4);
  ctx.fillStyle = 'rgba(255,240,190,0.7)';
  ctx.fillRect(x - 30, y + 40, 26, 1.4);
  ctx.strokeStyle = '#3a2210';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 30, y + 40, 60, 4);
}

/** Car j's pin with the wheel turned by a (radians). */
const carPin = (j: number, a: number): [number, number] => {
  const t = (j / CARS) * P2 + P2 / SPOKES / 2 + a;
  return [WH.x + Math.cos(t) * WH.pin, WH.y + Math.sin(t) * WH.pin];
};

/** The still's wheel lights and cars: the chase at one phase, every car hanging plumb. */
function wheelLitStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(WHEEL_S, WHEEL_S);
  chaseFrame(g, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(c, WHEEL_BOX.x, WHEEL_BOX.y);
  ctx.restore();
  for (let j = 0; j < CARS; j++) {
    const [px, py] = carPin(j, 0);
    car(ctx, px, py, j);
  }
}

// ——— the big top ———

const TT = BT.tent;
const RED = '#b0283a';
const CREAM = '#e4cfb0';
const ell = (c: number, e: number) => (x: number) => {
  const u = (x - TT.x) / TT.hw;
  return e + (c - e) * Math.sqrt(Math.max(0, 1 - u * u));
};
const eaveY = ell(TT.eaveC, TT.eaveE);
const baseY = ell(TT.baseC, TT.baseE);
/** A point round the wall at angle th (−π/2 the left edge … π/2 the right). */
const wallX = (th: number) => TT.x + Math.sin(th) * TT.hw;
/** Where the roof's canvas from a point on the eave runs up to: the nearer king pole's top, or the sagging ridge
 * between them. */
function ridgeAt(x: number): [number, number] {
  if (x <= TT.poleL) return [TT.poleL, TT.peak];
  if (x >= TT.poleR) return [TT.poleR, TT.peak];
  return [x, TT.peak + 22 * Math.sin((Math.PI * (x - TT.poleL)) / (TT.poleR - TT.poleL))];
}
/** The roof's droop: how far below the straight line from eave to ridge its canvas sags at the middle. */
const DROOP = 16;

function roofPath(): PathFn {
  return (c) => {
    const e0: [number, number] = [wallX(-Math.PI / 2) - 6, eaveY(TT.x - TT.hw) + 2];
    const e1: [number, number] = [wallX(Math.PI / 2) + 6, eaveY(TT.x + TT.hw) + 2];
    c.beginPath();
    c.moveTo(e0[0], e0[1]);
    c.quadraticCurveTo((e0[0] + TT.poleL) / 2, (e0[1] + TT.peak) / 2 + DROOP, TT.poleL, TT.peak);
    for (let x = TT.poleL; x <= TT.poleR; x += 10) c.lineTo(x, ridgeAt(x)[1]);
    c.quadraticCurveTo((e1[0] + TT.poleR) / 2, (e1[1] + TT.peak) / 2 + DROOP, e1[0], e1[1]);
    for (let i = 40; i >= 0; i--) {
      const x = wallX(-Math.PI / 2 + (i / 40) * Math.PI);
      c.lineTo(x, eaveY(x) + 2);
    }
    c.closePath();
  };
}

function wallPath(): PathFn {
  return (c) => {
    c.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = wallX(-Math.PI / 2 + (i / 40) * Math.PI);
      if (i) c.lineTo(x, eaveY(x));
      else c.moveTo(x, eaveY(x));
    }
    for (let i = 40; i >= 0; i--) {
      const x = wallX(-Math.PI / 2 + (i / 40) * Math.PI);
      c.lineTo(x, baseY(x));
    }
    c.closePath();
  };
}

const D = BT.door;
function doorPath(): PathFn {
  return polyPath([[D.x - D.hwBase, baseY(D.x - D.hwBase) + 1], [D.x - D.hwTop, D.top + 12], [D.x, D.top], [D.x + D.hwTop, D.top + 12], [D.x + D.hwBase, baseY(D.x + D.hwBase) + 1]]);
}

/** Lay the canvas's stripes round the wall (each stripe an equal angle of the drum, so they crowd at its edges). */
function wallStripes(ctx: Ctx): void {
  const N = 26;
  for (let k = 0; k < N; k++) {
    const t0 = -Math.PI / 2 + (k / N) * Math.PI;
    const t1 = -Math.PI / 2 + ((k + 1) / N) * Math.PI;
    const xa = wallX(t0);
    const xb = wallX(t1);
    ctx.fillStyle = k % 2 ? CREAM : RED;
    ctx.beginPath();
    ctx.moveTo(xa, eaveY(xa) - 4);
    ctx.lineTo(xb + 0.6, eaveY(xb) - 4);
    ctx.lineTo(xb + 0.6, baseY(xb) + 4);
    ctx.lineTo(xa, baseY(xa) + 4);
    ctx.fill();
  }
}

function roofStripes(ctx: Ctx): void {
  const N = 26;
  const edge = (th: number) => {
    const x = th <= -Math.PI / 2 ? wallX(th) - 6 : th >= Math.PI / 2 ? wallX(th) + 6 : wallX(th);
    return [x, eaveY(Math.min(TT.x + TT.hw, Math.max(TT.x - TT.hw, x))) + 2] as [number, number];
  };
  for (let k = 0; k < N; k++) {
    const t0 = -Math.PI / 2 + (k / N) * Math.PI;
    const t1 = -Math.PI / 2 + ((k + 1) / N) * Math.PI;
    const ea = edge(t0);
    const eb = edge(t1);
    const pa = ridgeAt(ea[0]);
    const pb = ridgeAt(eb[0]);
    ctx.fillStyle = k % 2 ? CREAM : RED;
    ctx.beginPath();
    ctx.moveTo(ea[0], ea[1]);
    ctx.quadraticCurveTo((ea[0] + pa[0]) / 2, (ea[1] + pa[1]) / 2 + DROOP, pa[0], pa[1] - 2);
    ctx.lineTo(pb[0] + 0.6, pb[1] - 2);
    ctx.quadraticCurveTo((eb[0] + pb[0]) / 2, (eb[1] + pb[1]) / 2 + DROOP, eb[0] + 0.6, eb[1]);
    ctx.closePath();
    ctx.fill();
  }
}

/** The seams down the roof (k of the 26 stripes' edges): the roped seams the bulb strings follow. */
function seamPts(k: number, n = 12): [number, number][] {
  const th = -Math.PI / 2 + (k / 26) * Math.PI;
  const ex = wallX(th);
  const ey = eaveY(ex) + 2;
  const [px, py] = ridgeAt(ex);
  const cx = (ex + px) / 2;
  const cy = (ey + py) / 2 + DROOP;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [(1 - t) * (1 - t) * px + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) * (1 - t) * py + 2 * (1 - t) * t * cy + t * t * ey];
  });
}

/** A lit festoon bulb on the tent (painted lit: it's in the base). */
function tentBulb(ctx: Ctx, x: number, y: number, col: string, a = 1): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, x, y, 13, col, 0.5 * a);
  ctx.restore();
  ctx.fillStyle = rgba(mix(col, '#ffffff', 0.55), a);
  ctx.beginPath();
  ctx.arc(x, y, 2.6, 0, P2);
  ctx.fill();
}

function tent(ctx: Ctx, r: R): void {
  const wall = wallPath();
  const roof = roofPath();
  const box: Box = { x: TT.x - TT.hw - 10, y: TT.peak - 10, w: TT.hw * 2 + 20, h: TT.baseC - TT.peak + 20 };
  aoHalo(ctx, wall, 16, 0.35, '#100a20');
  // the skirt's tight contact with the sand (the wall covers its upper half)
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.strokeStyle = 'rgba(8,4,18,0.75)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const x = wallX(-Math.PI / 2 + (i / 40) * Math.PI);
    if (i) ctx.lineTo(x, baseY(x) + 1);
    else ctx.moveTo(x, baseY(x) + 1);
  }
  ctx.stroke();
  ctx.restore();
  // light leaking out under the skirt
  lightPool(ctx, TT.x + 40, TT.baseC + 2, TT.hw * 0.9, 6, '#ffa860', 0.22, 'screen');
  // ——— the wall: striped canvas lit from inside by the show's lamps
  within(ctx, wall, () => {
    wallStripes(ctx);
    grain(ctx, { x: box.x, y: TT.eaveE - 10, w: box.w, h: TT.baseC - TT.eaveE + 20 }, 'canvas', 0.35, 1.2);
    // the dusk outside: the afterglow on the drum's left, the right turned away into the blue
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createLinearGradient(TT.x - TT.hw, 0, TT.x + TT.hw, 0);
    g.addColorStop(0, '#c49cb0');
    g.addColorStop(0.35, '#a08cb4');
    g.addColorStop(0.7, '#7a70a4');
    g.addColorStop(1, '#4a4680');
    ctx.fillStyle = g;
    ctx.fillRect(box.x, TT.eaveE - 10, box.w, TT.baseC - TT.eaveE + 20);
    ctx.globalCompositeOperation = 'source-over';
    // the lamps inside showing through: the canvas glows warm, most round the door, least at the drum's edges
    ctx.globalCompositeOperation = 'screen';
    const ig = ctx.createRadialGradient(TT.x, 590, 20, TT.x, 590, TT.hw * 1.05);
    ig.addColorStop(0, rgba('#ffa050', 0.55));
    ig.addColorStop(0.5, rgba('#ff8a40', 0.26));
    ig.addColorStop(1, rgba('#ff7a30', 0.04));
    ctx.fillStyle = ig;
    ctx.fillRect(box.x, TT.eaveE - 10, box.w, TT.baseC - TT.eaveE + 20);
    ctx.globalCompositeOperation = 'source-over';
    // the seams, and the canvas's slack between the poles round the wall: soft vertical folds
    for (let k = 1; k < 26; k++) {
      const x = wallX(-Math.PI / 2 + (k / 26) * Math.PI);
      ctx.fillStyle = 'rgba(30,8,20,0.32)';
      ctx.fillRect(x - 0.6, TT.eaveE - 10, 1.4, TT.baseC - TT.eaveE + 20);
    }
    // each panel billows a little between its seams: lit in its middle, shaded where the seam pulls it in
    for (let k = 0; k < 26; k++) {
      const xa = wallX(-Math.PI / 2 + (k / 26) * Math.PI);
      const xb = wallX(-Math.PI / 2 + ((k + 1) / 26) * Math.PI);
      if (xb - xa < 3) continue;
      const pg = ctx.createLinearGradient(xa, 0, xb, 0);
      pg.addColorStop(0, 'rgba(24,6,26,0.26)');
      pg.addColorStop(0.38, 'rgba(255,200,160,0.07)');
      pg.addColorStop(0.62, 'rgba(0,0,0,0)');
      pg.addColorStop(1, 'rgba(24,6,26,0.3)');
      ctx.fillStyle = pg;
      ctx.fillRect(xa, TT.eaveE - 10, xb - xa + 0.5, TT.baseC - TT.eaveE + 20);
    }
    for (let k = 0; k < 9; k++) {
      const th = -Math.PI / 2 + ((k + 0.5) / 9) * Math.PI;
      const x = wallX(th);
      const w = 10 + Math.cos(th) * 20;
      const fg = ctx.createLinearGradient(x - w, 0, x + w, 0);
      fg.addColorStop(0, 'rgba(20,6,24,0)');
      fg.addColorStop(0.5, 'rgba(20,6,24,0.16)');
      fg.addColorStop(1, 'rgba(20,6,24,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(x - w, TT.eaveE, w * 2, TT.baseC - TT.eaveE);
    }
    // the drum turning away at both sides; its foot in the sand's shade; the valance's shadow under the eave
    const eg = ctx.createLinearGradient(TT.x - TT.hw, 0, TT.x + TT.hw, 0);
    eg.addColorStop(0, 'rgba(16,10,30,0.4)');
    eg.addColorStop(0.12, 'rgba(16,10,30,0)');
    eg.addColorStop(0.88, 'rgba(16,10,30,0)');
    eg.addColorStop(1, 'rgba(10,8,28,0.55)');
    ctx.fillStyle = eg;
    ctx.fillRect(box.x, TT.eaveE - 10, box.w, TT.baseC - TT.eaveE + 20);
    for (let x = TT.x - TT.hw; x < TT.x + TT.hw; x += 8) {
      const y0 = eaveY(x);
      vfill(ctx, x, y0, 8.5, 44, [[0, 'rgba(14,6,24,0.5)'], [1, 'rgba(14,6,24,0)']]);
      const y1 = baseY(x);
      vfill(ctx, x, y1 - 26, 8.5, 28, [[0, 'rgba(14,6,24,0)'], [1, 'rgba(14,6,24,0.45)']]);
    }
  });
  // ——— the door: the ring inside, lit; the flaps tied back
  const door = doorPath();
  within(ctx, door, () => {
    const g = ctx.createLinearGradient(0, D.top, 0, TT.baseC);
    g.addColorStop(0, '#c0602e');
    g.addColorStop(0.3, '#ffb868');
    g.addColorStop(1, '#ffd890');
    ctx.fillStyle = g;
    ctx.fillRect(D.x - D.hwBase, D.top, D.hwBase * 2, TT.baseC - D.top + 2);
    // the far seats, tier on tier, the crowd's heads against the lamps
    for (let row = 0; row < 4; row++) {
      const y = D.top + 18 + row * 11;
      ctx.fillStyle = rgba('#4a1810', 0.85 - row * 0.1);
      ctx.fillRect(D.x - D.hwBase, y, D.hwBase * 2, 7);
      for (let x = D.x - D.hwBase + 3; x < D.x + D.hwBase; x += 5 + r() * 2) {
        ctx.fillStyle = rgba('#2a0c08', 0.8);
        ctx.beginPath();
        ctx.arc(x, y - 1, 2.2 + r() * 0.6, 0, P2);
        ctx.fill();
      }
      ctx.fillStyle = rgba('#ffd890', 0.35);
      ctx.fillRect(D.x - D.hwBase, y + 7, D.hwBase * 2, 1);
    }
    // the ring curb across the bottom, the sawdust in front of it lit hot
    ctx.fillStyle = '#9a1e24';
    ctx.beginPath();
    ctx.ellipse(D.x, 640, 150, 26, 0, Math.PI, P2);
    ctx.lineTo(D.x + 150, 654);
    ctx.lineTo(D.x - 150, 654);
    ctx.fill();
    ctx.strokeStyle = '#ffd270';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(D.x, 640, 150, 26, 0, Math.PI, P2);
    ctx.stroke();
    const sg = ctx.createRadialGradient(D.x, 660, 4, D.x, 660, 70);
    sg.addColorStop(0, '#fff4d0');
    sg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(D.x - 80, 620, 160, 50);
    // a spotlight's beam crossing the ring
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,240,200,0.22)';
    ctx.beginPath();
    ctx.moveTo(D.x - 70, D.top);
    ctx.lineTo(D.x - 40, D.top);
    ctx.lineTo(D.x + 30, 662);
    ctx.lineTo(D.x - 20, 662);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // the canvas's thickness round the opening
    ctx.strokeStyle = 'rgba(60,16,10,0.6)';
    ctx.lineWidth = 6;
    door(ctx);
    ctx.stroke();
  });
  // the flaps, gathered back to each side and tied: striped canvas in folds, the door's light through their edges
  for (const s of [-1, 1]) {
    const tieY = 598;
    const inX = D.x + s * D.hwTop;
    const fl: PathFn = (c) => {
      c.beginPath();
      c.moveTo(D.x + s * 6, D.top - 4);
      c.quadraticCurveTo(inX + s * 2, D.top + 30, D.x + s * (D.hwBase - 10), tieY - 6);
      c.lineTo(D.x + s * (D.hwBase - 4), tieY + 6);
      c.quadraticCurveTo(D.x + s * (D.hwBase - 6), tieY + 34, D.x + s * (D.hwBase - 2), baseY(D.x + s * D.hwBase) + 2);
      c.lineTo(D.x + s * (D.hwBase + 34), baseY(D.x + s * (D.hwBase + 34)) + 2);
      c.quadraticCurveTo(D.x + s * (D.hwBase + 22), tieY + 30, D.x + s * (D.hwBase + 16), tieY + 4);
      c.quadraticCurveTo(D.x + s * (D.hwBase + 26), D.top + 30, D.x + s * (D.hwTop + 30), D.top - 6);
      c.closePath();
    };
    castShadow(ctx, fl, 4, 6, 0.4, '#140818');
    const fb = { x: Math.min(D.x + s * 6, D.x + s * (D.hwBase + 36)), y: D.top - 8, w: D.hwBase + 34, h: TT.baseC - D.top + 12 };
    drape(ctx, fl, fb, RED, {
      fold: 7,
      depth: 0.7,
      phase: s > 0 ? 1.3 : 0.2,
      gather: [D.x + s * (D.hwBase + 4), tieY, 0.9],
      pattern: (c, fold) => {
        for (let x = fb.x - 10; x < fb.x + fb.w + 10; x += 14) {
          c.fillStyle = CREAM;
          c.beginPath();
          for (let y = fb.y; y <= fb.y + fb.h; y += 8) {
            const xx = x + fold(x, y) * 3;
            if (y === fb.y) c.moveTo(xx, y);
            else c.lineTo(xx, y);
          }
          for (let y = fb.y + fb.h; y >= fb.y; y -= 8) c.lineTo(x + 6 + fold(x + 6, y) * 3, y);
          c.fill();
        }
      },
      through: ['#ffb060', 0.3],
    });
    within(ctx, fl, () => {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = s < 0 ? '#a890b0' : '#8478a8';
      ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
      ctx.globalCompositeOperation = 'source-over';
      // the door's light on their inner edges
      const g = ctx.createLinearGradient(D.x + s * D.hwTop, 0, D.x + s * (D.hwBase + 30), 0);
      g.addColorStop(0, rgba('#ffc078', 0.8));
      g.addColorStop(0.5, rgba('#ffb868', 0.08));
      g.addColorStop(1, rgba('#ffb868', 0));
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g;
      ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
      ctx.globalCompositeOperation = 'source-over';
    });
    ctx.strokeStyle = '#2a0c14';
    ctx.lineWidth = 1.6;
    fl(ctx);
    ctx.stroke();
    // the tie: a gold cord round the gather
    const tx = D.x + s * (D.hwBase + 6);
    ctx.strokeStyle = '#3a2008';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(tx - 13, tieY - 2);
    ctx.quadraticCurveTo(tx, tieY + 5, tx + 13, tieY - 2);
    ctx.stroke();
    ctx.strokeStyle = '#e8b850';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.fillStyle = '#e8b850';
    ctx.beginPath();
    ctx.arc(tx + s * 12, tieY + 8, 3, 0, P2);
    ctx.fill();
  }
  // ——— the roof
  castShadow(ctx, roof, 6, 10, 0.3, '#0c0818');
  within(ctx, roof, () => {
    roofStripes(ctx);
    const rb = { x: box.x, y: TT.peak - 10, w: box.w, h: TT.eaveC - TT.peak + 20 };
    grain(ctx, rb, 'canvas', 0.3, 1.2);
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createLinearGradient(TT.x - TT.hw, 0, TT.x + TT.hw, 0);
    g.addColorStop(0, '#d0a0ac');
    g.addColorStop(0.4, '#9a86b0');
    g.addColorStop(1, '#4a4682');
    ctx.fillStyle = g;
    ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
    // higher up the canvas is further from the lamps, and the sky over it is dark
    vfill(ctx, rb.x, rb.y, rb.w, rb.h, [[0, '#8a80b0'], [0.5, '#d0c8e0'], [1, '#ffffff']]);
    ctx.globalCompositeOperation = 'screen';
    const ig = ctx.createRadialGradient(TT.x, TT.eaveC + 30, 20, TT.x, TT.eaveC + 30, TT.hw);
    ig.addColorStop(0, rgba('#ff9a48', 0.3));
    ig.addColorStop(1, rgba('#ff9a48', 0));
    ctx.fillStyle = ig;
    ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
    // the last of the afterglow on the roof's left flank
    const ag = ctx.createLinearGradient(TT.x - TT.hw, 0, TT.poleL + 40, 0);
    ag.addColorStop(0, rgba(GLOW, 0.22));
    ag.addColorStop(1, rgba(GLOW, 0));
    ctx.fillStyle = ag;
    ctx.fillRect(rb.x, rb.y, TT.poleL + 40 - rb.x, rb.h);
    ctx.globalCompositeOperation = 'source-over';
    // the seams: a soft valley each side of a roped seam
    for (let k = 1; k < 26; k++) {
      const pts = seamPts(k);
      ctx.strokeStyle = 'rgba(24,8,24,0.18)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(30,10,24,0.5)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  });
  ctx.strokeStyle = '#1e0c1c';
  ctx.lineWidth = 2.2;
  roof(ctx);
  ctx.stroke();
  // the ridge between the king poles catches what's left of the light
  ctx.strokeStyle = rgba('#ffc0b0', 0.35);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = TT.poleL; x <= TT.poleR; x += 10) {
    const y = ridgeAt(x)[1] + 1;
    if (x === TT.poleL) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // ——— the valance: scallops round the eave, alternately red and cream, gold piping and bobbles
  const NS = 30;
  for (let i = 0; i < NS; i++) {
    const t0 = -Math.PI / 2 + (i / NS) * Math.PI;
    const t1 = -Math.PI / 2 + ((i + 1) / NS) * Math.PI;
    const xa = wallX(t0);
    const xb = wallX(t1);
    const ya = eaveY(xa) + 1;
    const yb = eaveY(xb) + 1;
    const sc: PathFn = (c) => {
      c.beginPath();
      c.moveTo(xa, ya);
      c.lineTo(xb, yb);
      c.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 + 30, xa, ya);
      c.closePath();
    };
    const lit = 1 - (i / NS) * 0.9;
    ctx.fillStyle = mix(i % 2 ? '#c8b0a8' : '#8a2838', '#2a2050', 0.15 + (1 - lit) * 0.5);
    sc(ctx);
    ctx.fill();
    within(ctx, sc, () => vfill(ctx, Math.min(xa, xb), Math.min(ya, yb), Math.abs(xb - xa) + 1, 22, [[0, 'rgba(255,180,120,0.16)'], [0.5, 'rgba(10,4,20,0.2)'], [1, 'rgba(10,4,20,0.6)']]));
    ctx.strokeStyle = 'rgba(30,8,20,0.8)';
    ctx.lineWidth = 1.2;
    sc(ctx);
    ctx.stroke();
  }
  ctx.strokeStyle = '#c89a48';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const x = wallX(-Math.PI / 2 + (i / 40) * Math.PI);
    if (i) ctx.lineTo(x, eaveY(x) + 1);
    else ctx.moveTo(x, eaveY(x) + 1);
  }
  ctx.stroke();
  for (let i = 0; i <= NS; i++) {
    const x = wallX(-Math.PI / 2 + (i / NS) * Math.PI);
    ctx.fillStyle = '#e0b058';
    ctx.beginPath();
    ctx.arc(x, eaveY(x) + 5, 2.6, 0, P2);
    ctx.fill();
  }
  // ——— the king poles through the roof, barber-striped, gold balls on top
  for (const px of [TT.poleL, TT.poleR]) {
    const pp: PathFn = (c) => {
      c.beginPath();
      c.rect(px - 4.5, TT.mast, 9, TT.peak - TT.mast + 4);
    };
    solid(ctx, pp, { x: px - 5, y: TT.mast, w: 10, h: TT.peak - TT.mast }, 'wood', '#e8dccc', { line: 1.4 });
    within(ctx, pp, () => {
      ctx.fillStyle = RED;
      for (let y = TT.mast - 10; y < TT.peak + 4; y += 12) {
        ctx.beginPath();
        ctx.moveTo(px - 5, y);
        ctx.lineTo(px + 5, y - 6);
        ctx.lineTo(px + 5, y);
        ctx.lineTo(px - 5, y + 6);
        ctx.fill();
      }
      const g = ctx.createLinearGradient(px - 5, 0, px + 5, 0);
      g.addColorStop(0, 'rgba(255,200,170,0.3)');
      g.addColorStop(1, 'rgba(20,14,50,0.5)');
      ctx.fillStyle = g;
      ctx.fillRect(px - 5, TT.mast, 10, TT.peak - TT.mast + 4);
    });
    // the collar where it pierces the canvas
    ctx.fillStyle = '#2a1828';
    ctx.beginPath();
    ctx.ellipse(px, TT.peak, 11, 4, 0, 0, P2);
    ctx.fill();
    const ball: PathFn = (c) => {
      c.beginPath();
      c.arc(px, TT.mast - 5, 7, 0, P2);
    };
    solid(ctx, ball, { x: px - 7, y: TT.mast - 12, w: 14, h: 14 }, 'chrome', '#e0b050', { line: 1.2 });
  }
  // ——— festoons down the roof's seams from the pole tops, and between them over the ridge
  const strings = [3, 7, 11, 15, 19, 23];
  for (const k of strings) {
    const pts = seamPts(k, 30);
    ctx.strokeStyle = 'rgba(20,10,20,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 3) : ctx.moveTo(x, y + 3)));
    ctx.stroke();
    pts.forEach(([x, y], i) => {
      if (i % 3 === 1) {
        const col = BULB_COLS[(i / 3 + k) % 5 | 0];
        // each bulb's light spilt on the canvas round and below it
        lightPool(ctx, x + 2, y + 14, 30, 22, mix(col, '#ffd8b0', 0.4), 0.13);
        tentBulb(ctx, x, y + 5, col, 0.85);
      }
    });
    // where the run meets the eave, its last bulbs light the valance under it
    const [ex, ey] = pts[pts.length - 1];
    lightPool(ctx, ex, ey + 14, 46, 16, '#ffc890', 0.18);
  }
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const x = TT.poleL + t * (TT.poleR - TT.poleL);
    const y = TT.mast + 8 + Math.sin(t * Math.PI) * 26;
    if (i === 0) {
      ctx.strokeStyle = 'rgba(20,10,20,0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 1; j <= 28; j++) {
        const u = j / 28;
        ctx.lineTo(TT.poleL + u * (TT.poleR - TT.poleL), TT.mast + 8 + Math.sin(u * Math.PI) * 26);
      }
      ctx.stroke();
    }
    if (i > 0 && i < 14) tentBulb(ctx, x, y + 3, BULB_COLS[i % 5], 0.9);
  }
  // ——— guy ropes from the eave out to stakes in the sand
  for (const [ex, sx, sy] of [[TT.x - TT.hw + 14, TT.x - TT.hw - 70, 674], [TT.x - TT.hw + 60, TT.x - TT.hw - 18, 680], [TT.x + TT.hw - 14, TT.x + TT.hw + 34, 680]] as const) {
    const ey = eaveY(ex) + 4;
    ctx.strokeStyle = 'rgba(30,20,30,0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.quadraticCurveTo((ex + sx) / 2, (ey + sy) / 2 + 6, sx, sy - 8);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffc0a0', 0.25);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    groundShadow(ctx, sx + 2, sy, 7, 2.5, 0.6, '#140c26');
    const st = polyPath([[sx - 3, sy - 12], [sx + 3, sy - 12], [sx + 2, sy], [sx - 2, sy]]);
    solid(ctx, st, { x: sx - 3, y: sy - 12, w: 6, h: 12 }, 'wood', '#6a5040', { line: 1 });
  }
  // the door's light spilling out into the evening air in front of it
  glowAt(ctx, D.x, 600, 140, '#ffa050', 0.16, 0.9);
}

/** The marquee sign over the door: a red board with a gold border and cream letters, bulbs round its edge lighting
 * it and the canvas behind. */
function sign(ctx: Ctx): void {
  const { x, y, w, h } = BT.sign;
  const bp: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - w / 2, y + h);
    c.lineTo(x - w / 2, y + 10);
    c.quadraticCurveTo(x, y - 12, x + w / 2, y + 10);
    c.lineTo(x + w / 2, y + h);
    c.closePath();
  };
  castShadow(ctx, bp, 6, 8, 0.45, '#140818');
  solid(ctx, bp, { x: x - w / 2, y: y - 4, w, h: h + 4 }, 'wood', '#8a1c2c', { line: 2 });
  within(ctx, bp, () => {
    ctx.strokeStyle = '#d8a848';
    ctx.lineWidth = 6;
    bp(ctx);
    ctx.stroke();
    ctx.strokeStyle = '#3a1408';
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(x, y + h / 2);
    ctx.scale(0.93, 0.8);
    ctx.translate(-x, -y - h / 2);
    bp(ctx);
    ctx.restore();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = `bold 9px ${SLAB}`;
    ctx.fillStyle = '#f0d8a0';
    ctx.fillText("KING HONK'S", x, y + 13);
    ctx.font = `bold 21px ${SLAB}`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3a0c10';
    ctx.strokeText('BIG TOP', x, y + 34);
    const tg = ctx.createLinearGradient(0, y + 18, 0, y + 34);
    tg.addColorStop(0, '#fff4dc');
    tg.addColorStop(1, '#f0c890');
    ctx.fillStyle = tg;
    ctx.fillText('BIG TOP', x, y + 34);
    vfill(ctx, x - w / 2, y - 4, w, h + 4, [[0, 'rgba(255,220,160,0.18)'], [1, 'rgba(20,6,20,0.25)']]);
    // the door's glow coming up under its bottom edge
    lightPool(ctx, x, y + h + 2, w * 0.45, 12, '#ffb060', 0.4, 'screen');
  });
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const bx = x - w / 2 + 4 + t * (w - 8);
    const by = t < 0.5 ? y + 10 - (1 - (1 - t * 2) ** 2) * 11 : y + 10 - (1 - ((t - 0.5) * 2) ** 2) * 11;
    tentBulb(ctx, bx, by - 1, '#ffe0a0', 0.95);
  }
  for (const s of [-1, 1]) for (let j = 0; j < 3; j++) tentBulb(ctx, x + s * (w / 2 - 4), y + 16 + j * 9, '#ffe0a0', 0.95);
  // its bulbs light the canvas round it
  glowAt(ctx, x, y + h / 2, 150, '#ffc070', 0.14, 0.5);
}

// ——— the pennants on the king poles (painted: the still's; the live layer flutters its own) ———

const FLAG_W = 124;
const FLAG_H = 48;
const FLAG_HOIST: [number, number] = [3, 22];
const FLAGS = [
  { x: TT.poleL + 3, y: TT.mast + 14, col: '#d8303e', band: '#f0c040', seed: 0.3 },
  { x: TT.poleR + 3, y: TT.mast + 14, col: '#f0b030', band: '#d8303e', seed: 1.7 },
];

/** One frame of a pennant flying from its hoist (phase 0…1 loops): a long tapering flag, a wave travelling out
 * along it and growing towards the tip, each slice lit or shaded by its slope; a band along its middle. */
function flagFrame(c: Ctx, ph: number, col: string, band: string, seed: number): void {
  const [hx, hy] = FLAG_HOIST;
  const len = FLAG_W - 8;
  const hh = 12;
  const N = 40;
  const at = (u: number) => {
    const wv = Math.sin(P2 * ph - u * P2 * 1.15 + seed);
    const cy = hy + wv * 7 * u ** 1.1 + u * 4;
    const half = hh * (1 - u) ** 0.85 + 0.8;
    const slope = Math.cos(P2 * ph - u * P2 * 1.15 + seed) * u ** 0.6;
    return { x: hx + u * len * (1 - 0.04 * Math.abs(wv) * u), cy, half, slope };
  };
  const pts = Array.from({ length: N + 1 }, (_, i) => at(i / N));
  for (let i = 0; i < N; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const lit = a.slope;
    const base = lit > 0 ? mix(col, '#ffe8d0', lit * 0.3) : mix(col, '#240818', -lit * 0.45);
    const bandC = lit > 0 ? mix(band, '#fff4e0', lit * 0.3) : mix(band, '#240818', -lit * 0.45);
    c.fillStyle = base;
    c.beginPath();
    c.moveTo(a.x, a.cy - a.half);
    c.lineTo(b.x + 0.5, b.cy - b.half);
    c.lineTo(b.x + 0.5, b.cy + b.half);
    c.lineTo(a.x, a.cy + a.half);
    c.fill();
    c.fillStyle = bandC;
    c.beginPath();
    c.moveTo(a.x, a.cy - a.half * 0.3);
    c.lineTo(b.x + 0.5, b.cy - b.half * 0.3);
    c.lineTo(b.x + 0.5, b.cy + b.half * 0.3);
    c.lineTo(a.x, a.cy + a.half * 0.3);
    c.fill();
  }
  // dusk on it, and its edge
  c.strokeStyle = '#2a0c18';
  c.lineWidth = 1.2;
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.cy - p.half) : c.moveTo(p.x, p.cy - p.half)));
  for (let i = N; i >= 0; i--) c.lineTo(pts[i].x, pts[i].cy + pts[i].half);
  c.closePath();
  c.stroke();
  c.save();
  c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(0, 0, FLAG_W, 0);
  g.addColorStop(0, 'rgba(40,30,80,0.15)');
  g.addColorStop(1, 'rgba(40,30,80,0.4)');
  c.fillStyle = g;
  c.fillRect(0, 0, FLAG_W, FLAG_H);
  c.restore();
}

function flagsStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(FLAG_W, FLAG_H);
  FLAGS.forEach((f, i) => {
    g.clearRect(0, 0, FLAG_W, FLAG_H);
    flagFrame(g, 0.15 + i * 0.4, f.col, f.band, f.seed);
    ctx.drawImage(c, f.x - FLAG_HOIST[0], f.y - FLAG_HOIST[1]);
  });
}
const FLAGS_BOX: Box = { x: TT.poleL - 4, y: TT.mast - 14, w: TT.poleR - TT.poleL + FLAG_W + 12, h: FLAG_H + 18 };

// ——— by the tent: crates and a barrel, a cream pie waiting on top ———

const CR = BT.crates;
function cratesPath(): PathFn {
  return (c) => {
    c.beginPath();
    c.rect(CR.x - 56, CR.ground - 54, 76, 54);
    c.rect(CR.x - 44, CR.ground - 96, 56, 42);
    c.rect(CR.x + 26, CR.ground - 50, 40, 50);
  };
}

function crate(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, base: string): void {
  const p: PathFn = (c) => {
    c.beginPath();
    c.rect(x, y, w, h);
  };
  solid(ctx, p, { x, y, w, h }, 'wood', base, { line: 1.8, formSize: 8 });
  within(ctx, p, () => {
    // boards, a frame round the face, a diagonal brace
    for (let k = 1; k < 4; k++) {
      ctx.fillStyle = 'rgba(14,6,14,0.45)';
      ctx.fillRect(x, y + (h * k) / 4, w, 1.4);
    }
    ctx.strokeStyle = rgba(shade(base, -0.35), 0.9);
    ctx.lineWidth = 5;
    ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.beginPath();
    ctx.moveTo(x + 5, y + h - 5);
    ctx.lineTo(x + w - 5, y + 5);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffc8a0', 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 1.5);
    ctx.lineTo(x + w - 3, y + 1.5);
    ctx.stroke();
    // stencilled on the side, faded
    ctx.font = `bold ${Math.round(h * 0.2)}px ${SLAB}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(30,10,10,0.35)';
    ctx.fillText(r() < 0.5 ? 'PIES' : 'HONK', x + w / 2, y + h * 0.62);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(255,170,140,0.12)');
    g.addColorStop(1, 'rgba(20,14,50,0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  });
}

function crates(ctx: Ctx, r: R): void {
  const g = CR.ground;
  // tight contact where they sit in the sand
  ao(ctx, CR.x - 18, g, 44, 4.5, 0.85, 0, '#0a0616');
  ao(ctx, CR.x + 46, g - 1, 22, 4, 0.85, 0, '#0a0616');
  crate(ctx, r, CR.x - 56, g - 54, 76, 54, '#7a5a44');
  crevice(ctx, CR.x - 46, CR.x + 14, g - 54, -6, 0.5, '#100a20');
  crate(ctx, r, CR.x - 44, g - 96, 56, 42, '#86644a');
  // the barrel
  const bp: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CR.x + 28, g - 48);
    c.quadraticCurveTo(CR.x + 46, g - 54, CR.x + 64, g - 48);
    c.quadraticCurveTo(CR.x + 70, g - 24, CR.x + 64, g - 2);
    c.quadraticCurveTo(CR.x + 46, g + 3, CR.x + 28, g - 2);
    c.quadraticCurveTo(CR.x + 22, g - 24, CR.x + 28, g - 48);
    c.closePath();
  };
  solid(ctx, bp, { x: CR.x + 22, y: g - 54, w: 48, h: 57 }, 'wood', '#6a4a3a', { line: 1.8, formSize: 10 });
  within(ctx, bp, () => {
    for (const hy of [g - 40, g - 12]) {
      ctx.fillStyle = '#2a2430';
      ctx.fillRect(CR.x + 20, hy, 52, 5);
      ctx.fillStyle = 'rgba(255,190,160,0.3)';
      ctx.fillRect(CR.x + 20, hy, 18, 1.2);
    }
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = 'rgba(14,6,14,0.35)';
      ctx.fillRect(CR.x + 31 + k * 8, g - 50, 1.2, 50);
    }
    const sg = ctx.createLinearGradient(CR.x + 22, 0, CR.x + 70, 0);
    sg.addColorStop(0, 'rgba(255,170,140,0.15)');
    sg.addColorStop(1, 'rgba(20,14,50,0.45)');
    ctx.fillStyle = sg;
    ctx.fillRect(CR.x + 20, g - 56, 52, 60);
  });
  ctx.fillStyle = '#3a2830';
  ctx.beginPath();
  ctx.ellipse(CR.x + 46, g - 49, 18, 4, 0, 0, P2);
  ctx.fill();
  // a cream pie on the top crate: tin, crust, a dome of cream, a cherry
  const px = CR.x - 16;
  const py = g - 96;
  groundShadow(ctx, px + 3, py, 30, 4, 0.65, '#140c26');
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(1.25, 1.25);
  ctx.translate(-px, -py);
  ctx.fillStyle = '#8a8aa0';
  ctx.beginPath();
  ctx.moveTo(px - 20, py - 6);
  ctx.lineTo(px + 20, py - 6);
  ctx.lineTo(px + 17, py);
  ctx.lineTo(px - 17, py);
  ctx.fill();
  ctx.fillStyle = '#c88a48';
  ctx.beginPath();
  ctx.ellipse(px, py - 6, 20, 4, 0, 0, P2);
  ctx.fill();
  const cream: PathFn = (c) => {
    c.beginPath();
    c.moveTo(px - 18, py - 7);
    c.bezierCurveTo(px - 18, py - 22, px + 18, py - 22, px + 18, py - 7);
    c.closePath();
  };
  solid(ctx, cream, { x: px - 18, y: py - 22, w: 36, h: 16 }, 'plush', '#f6efe6', { line: 1.4, formSize: 6 });
  within(ctx, cream, () => {
    ctx.fillStyle = 'rgba(30,20,60,0.25)';
    ctx.beginPath();
    ctx.ellipse(px + 10, py - 8, 14, 8, 0, 0, P2);
    ctx.fill();
    // the tent's warmth on its right, the last of the sky on its crown
    lightPool(ctx, px + 14, py - 12, 14, 10, '#ffb070', 0.5, 'screen');
    lightPool(ctx, px - 6, py - 19, 12, 4, '#ffe8f0', 0.45, 'screen');
  });
  ctx.fillStyle = '#c81c34';
  ctx.beginPath();
  ctx.arc(px + 1, py - 21, 3.4, 0, P2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(px - 0.5, py - 23, 1.4, 1.4);
  ctx.restore();
}

// ——— the balloon cart ———

const CT = BT.cart;
function cartPath(): PathFn {
  return (c) => {
    c.beginPath();
    c.rect(CT.x - 58, CT.y - 34, 116, 34);
    c.rect(CT.x + 24, CT.y - 72, 18, 42);
    c.rect(CT.post.x - 3, CT.post.y, 6, CT.y - CT.post.y);
    c.arc(CT.x - 36, CT.ground - 18, 18, 0, P2);
    c.arc(CT.x + 36, CT.ground - 18, 18, 0, P2);
  };
}

function cartWheel(ctx: Ctx, x: number, y: number, rad: number): void {
  ctx.fillStyle = '#1c1420';
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, P2);
  ctx.fill();
  ctx.strokeStyle = '#c89a58';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, rad - 3, 0, P2);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * P2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * (rad - 3), y + Math.sin(a) * (rad - 3));
    ctx.stroke();
  }
  ctx.fillStyle = '#e0b060';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, P2);
  ctx.fill();
  ctx.strokeStyle = rgba('#ffc0a0', 0.4);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, rad - 0.5, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
}

function cart(ctx: Ctx): void {
  const { x, y, ground } = CT;
  // the helium tank standing in the back, strapped on
  const tank: PathFn = (c) => {
    c.beginPath();
    c.roundRect(x + 24, y - 72, 18, 42, [8, 8, 2, 2]);
  };
  solid(ctx, tank, { x: x + 24, y: y - 72, w: 18, h: 42 }, 'enamel', '#6a8a78', { line: 1.4, formSize: 6 });
  ctx.fillStyle = '#c8c0b0';
  ctx.fillRect(x + 29, y - 79, 8, 8);
  ctx.fillStyle = '#2a2430';
  ctx.fillRect(x + 27, y - 78, 12, 2.5);
  // the box: red boards, a cream panel, gold lining
  const box: PathFn = (c) => {
    c.beginPath();
    c.rect(x - 58, y - 34, 116, 34);
  };
  solid(ctx, box, { x: x - 58, y: y - 34, w: 116, h: 34 }, 'wood', '#a02a34', { line: 2, formSize: 10 });
  within(ctx, box, () => {
    ctx.fillStyle = '#e6d2b0';
    ctx.fillRect(x - 46, y - 27, 92, 20);
    ctx.strokeStyle = '#d8a848';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 46, y - 27, 92, 20);
    ctx.font = `bold 12px ${SLAB}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a1c2c';
    ctx.fillText('BALLOONS', x, y - 12);
    const g = ctx.createLinearGradient(x - 58, 0, x + 58, 0);
    g.addColorStop(0, 'rgba(255,170,140,0.1)');
    g.addColorStop(0.6, 'rgba(30,20,60,0.2)');
    g.addColorStop(1, 'rgba(255,170,90,0.2)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 58, y - 34, 116, 34);
    vfill(ctx, x - 58, y - 34, 116, 34, [[0, 'rgba(255,210,170,0.15)'], [1, 'rgba(10,6,20,0.4)']]);
  });
  // the handles out to the right
  ctx.strokeStyle = '#3a2418';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 58, y - 20);
  ctx.lineTo(x + 92, y - 32);
  ctx.stroke();
  ctx.strokeStyle = '#8a6848';
  ctx.lineWidth = 2;
  ctx.stroke();
  // the post the strings are tied to
  const pp: PathFn = (c) => {
    c.beginPath();
    c.rect(CT.post.x - 3, CT.post.y, 6, y - 30 - CT.post.y);
  };
  solid(ctx, pp, { x: CT.post.x - 3, y: CT.post.y, w: 6, h: y - 30 - CT.post.y }, 'wood', '#c8b090', { line: 1.2 });
  ctx.fillStyle = '#d8a848';
  ctx.beginPath();
  ctx.arc(CT.post.x, CT.post.y, 4, 0, P2);
  ctx.fill();
  // the wheels, standing in the sand
  for (const s of [-1, 1]) {
    groundShadow(ctx, x + s * 36 + 2, ground, 16, 3, 0.65, '#100a20');
    ao(ctx, x + s * 36, ground - 0.5, 10, 2.4, 0.9, 0, '#0a0616');
    cartWheel(ctx, x + s * 36, ground - 18, 18);
  }
  // the tent's warmth on the cart's right, from across the sand
  lightPool(ctx, x + 70, y - 40, 60, 50, '#ff9a50', 0.12, 'screen');
}

// ——— the balloons ———

const BAL_W = 52;
const BAL_H = 66;
/** The knot's place in a balloon's frame. */
const BAL_KNOT: [number, number] = [26, 56];
const BAL_COLS = ['#e8405a', '#f6c440', '#40b0e0', '#7ad860', '#f08a3a', '#ff7aa8'];
/** The bunch: string length, rest angle (from straight up), colour. */
const BUNCH = [
  { L: 168, a: -0.34, c: 2 },
  { L: 150, a: -0.15, c: 0 },
  { L: 176, a: 0.05, c: 1 },
  { L: 130, a: -0.42, c: 3 },
  { L: 142, a: 0.27, c: 5 },
  { L: 118, a: 0.05, c: 4 },
  { L: 160, a: 0.44, c: 0 },
];
const WIND_LEAN = 0.07;

/** A balloon in its BAL_W×BAL_H frame, knot at BAL_KNOT: glossy latex, the light through it (a brighter heart), a
 * window glint on the lit side, the warm rim from the tent on its right, the knot. */
function balloon(c: Ctx, col: string): void {
  const cx = 26;
  const cy = 28;
  const body: PathFn = (g) => {
    g.beginPath();
    g.moveTo(cx, cy - 25);
    g.bezierCurveTo(cx + 26, cy - 25, cx + 22, cy + 14, cx + 2, cy + 26);
    g.lineTo(cx - 2, cy + 26);
    g.bezierCurveTo(cx - 22, cy + 14, cx - 26, cy - 25, cx, cy - 25);
    g.closePath();
  };
  const g = c.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, 30);
  g.addColorStop(0, mix(col, '#ffffff', 0.35));
  g.addColorStop(0.45, col);
  g.addColorStop(1, mix(col, '#1a0c2a', 0.55));
  c.fillStyle = g;
  body(c);
  c.fill();
  within(c, body, () => {
    // the light through the latex
    const t = c.createRadialGradient(cx + 2, cy + 6, 0, cx + 2, cy + 6, 16);
    t.addColorStop(0, rgba(mix(col, '#fff0d0', 0.4), 0.45));
    t.addColorStop(1, rgba(col, 0));
    c.fillStyle = t;
    c.fillRect(0, 0, BAL_W, BAL_H);
    // the tent's warm light on its right flank
    const w = c.createLinearGradient(cx + 6, 0, cx + 22, 0);
    w.addColorStop(0, 'rgba(255,170,90,0)');
    w.addColorStop(1, 'rgba(255,170,90,0.45)');
    c.globalCompositeOperation = 'screen';
    c.fillStyle = w;
    c.fillRect(cx, 0, 26, BAL_H);
    c.globalCompositeOperation = 'source-over';
  });
  c.strokeStyle = mix(col, '#140818', 0.65);
  c.lineWidth = 1.4;
  body(c);
  c.stroke();
  // the window glint: a soft square of sky light, a hot point
  c.fillStyle = 'rgba(255,240,230,0.55)';
  c.beginPath();
  c.ellipse(cx - 9, cy - 12, 4, 6.5, -0.5, 0, P2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.beginPath();
  c.arc(cx - 10, cy - 14, 1.6, 0, P2);
  c.fill();
  // the knot
  c.fillStyle = mix(col, '#140818', 0.3);
  c.beginPath();
  c.moveTo(cx - 3.5, cy + 30);
  c.lineTo(cx, cy + 25);
  c.lineTo(cx + 3.5, cy + 30);
  c.closePath();
  c.fill();
}

/** The still's bunch: strings from the post, balloons at rest. */
function balloonsStill(ctx: Ctx): void {
  const { x: tx, y: ty } = CT.post;
  const [c, g] = makeCanvas(BAL_W, BAL_H);
  for (const b of BUNCH) {
    const a = b.a + WIND_LEAN;
    const kx = tx + Math.sin(a) * b.L;
    const ky = ty - Math.cos(a) * b.L;
    ctx.strokeStyle = 'rgba(230,220,214,0.55)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo((tx + kx) / 2 + 6, (ty + ky) / 2, kx, ky);
    ctx.stroke();
  }
  for (const b of BUNCH) {
    const a = b.a + WIND_LEAN;
    const kx = tx + Math.sin(a) * b.L;
    const ky = ty - Math.cos(a) * b.L;
    g.clearRect(0, 0, BAL_W, BAL_H);
    balloon(g, BAL_COLS[b.c]);
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(a * 0.5);
    ctx.drawImage(c, -BAL_KNOT[0], -BAL_KNOT[1]);
    ctx.restore();
  }
}
const BAL_BOX: Box = { x: CT.post.x - 200, y: CT.post.y - 260, w: 400, h: 270 };

// ——— the table: the King's podium, painted boards ———

function table(ctx: Ctx, r: R): void {
  const front = BT.front;
  const zf = zAt(front + 4);
  planksPlane(ctx, r, front, '#8e3a32', 0.2, 0.008, false);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, front - TY + 4);
  ctx.clip();
  // the paint worn through to the wood where feet and props have scuffed it
  lay(ctx, noiseMask(14, 917, { cover: 0.2, soft: 0.08, col: '#8a6648', w: 320, h: 80 }), { x: 0, y: TY, w: W, h: front - TY }, 0.28);
  lay(ctx, noiseMask(40, 921, { cover: 0.12, soft: 0.04, col: '#9a7454', w: 400, h: 60 }), { x: 0, y: TY, w: W, h: front - TY }, 0.22);
  // a gold pinstripe round the podium's top, faded, chipped
  ctx.strokeStyle = 'rgba(214,168,80,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(xAt(-2.6, zf + 0.16), yAt(zf + 0.16));
  ctx.lineTo(xAt(2.6, zf + 0.16), yAt(zf + 0.16));
  ctx.stroke();
  // the dusk over it
  ctx.globalCompositeOperation = 'multiply';
  const dg = ctx.createLinearGradient(0, 0, W, 0);
  dg.addColorStop(0, '#b090a8');
  dg.addColorStop(0.5, '#a08ca8');
  dg.addColorStop(1, '#c89c8c');
  ctx.fillStyle = dg;
  ctx.fillRect(0, TY, W, front - TY + 4);
  ctx.globalCompositeOperation = 'source-over';
  // the light falls off from the back edge (where the lamps are) towards us, warmer towards the door on the right
  vfill(ctx, 0, TY, W, front - TY, [[0, 'rgba(255,190,150,0.1)'], [0.5, 'rgba(255,190,150,0.03)'], [1, 'rgba(10,6,20,0.18)']]);
  const wg = ctx.createLinearGradient(700, 0, W, 0);
  wg.addColorStop(0, 'rgba(255,170,100,0)');
  wg.addColorStop(1, 'rgba(255,170,100,0.1)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = wg;
  ctx.fillRect(700, TY, W - 700, front - TY);
  ctx.globalCompositeOperation = 'source-over';
  // the grain under the paint: fine streaks along the boards
  for (let i = -9; i < 9; i++) {
    const X0 = i * 0.28;
    for (let q = 0; q < 24; q++) {
      const X = X0 + 0.015 + r() * 0.25;
      const zA = 1.7 + r() * 0.9;
      const zB = Math.max(zf, zA - 0.2 - r() * 0.6);
      ctx.strokeStyle = r() < 0.5 ? rgba('#e8b0a0', 0.04 + r() * 0.05) : rgba('#140610', 0.14 + r() * 0.14);
      ctx.lineWidth = 0.8 + r() * 1.2;
      ctx.beginPath();
      ctx.moveTo(xAt(X, zA), yAt(zA));
      ctx.lineTo(xAt(X + (r() - 0.5) * 0.004, zB), yAt(zB));
      ctx.stroke();
    }
  }
  varnish(ctx, { x: 0, y: TY, w: W, h: front - TY }, [{ x: BT.door.x, a: 0.2, w: 160, col: WARM }, { x: WH.x, a: 0.1, w: 200, col: '#ff9ab8' }, { x: BT.glow.x, a: 0.06, w: 260, col: GLOW }], { sheen: 0.02, seed: 919 });
  // the door's light across the boards on the right; the wheel's bulbs on the left; the afterglow along the back
  // (the door's fan of light, carried on from the sand across the boards)
  lightPatch(ctx, [[BT.door.x - 236, TY - 2], [BT.door.x + 256, TY - 2], [BT.door.x + 470, front], [BT.door.x - 420, front]], { col: '#ffae66', a: 0.3, soft: 26, fade: 0.85 });
  lightPool(ctx, BT.door.x - 30, TY + 60, 520, 120, '#ffa860', 0.3, 'screen');
  lightPool(ctx, BT.door.x - 10, TY + 16, 260, 26, '#ffc880', 0.3, 'screen');
  lightPool(ctx, WH.x, TY + 36, 340, 50, '#ff80a8', 0.12, 'screen');
  lightPool(ctx, WH.x + 70, TY + 30, 220, 30, '#ffd070', 0.08, 'screen');
  lightPool(ctx, 300, TY + 14, 700, 30, '#ffa080', 0.1, 'screen');
  // calm under the pizzas
  const g = ctx.createRadialGradient(VX, 900, 100, VX, 900, 860);
  g.addColorStop(0, 'rgba(10,6,20,0.24)');
  g.addColorStop(1, 'rgba(10,6,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, TY, W, front - TY);
  vfill(ctx, 0, TY, W, 70, [[0, 'rgba(8,4,18,0.5)'], [0.4, 'rgba(8,4,18,0.16)'], [1, 'rgba(8,4,18,0)']]);
  ctx.restore();
  tableFalloff(ctx, front, 0.62, '#06030e');
  tableSeam(ctx, 0.6, '#0a0614', false);
  // the podium's side: red and cream panels under a gold rope moulding, in shade
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, front, W, 1080 - front);
  ctx.clip();
  vfill(ctx, 0, front, W, 1080 - front, [[0, '#5a1c24'], [1, '#2a0c14']]);
  for (let i = -9; i <= 9; i++) {
    const x = xAt(i * 0.28, zf);
    ctx.fillStyle = i % 2 ? 'rgba(220,196,160,0.22)' : 'rgba(0,0,0,0)';
    ctx.beginPath();
    ctx.moveTo(x, front + 8);
    ctx.lineTo(x + 44, front + 8);
    ctx.lineTo(x + 70, 1080);
    ctx.lineTo(x + 26, 1080);
    ctx.fill();
  }
  grain(ctx, { x: 0, y: front, w: W, h: 1080 - front }, 'wood', 0.35, 1);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#6a5a8a';
  ctx.fillRect(0, front, W, 1080 - front);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#8a6a38';
  ctx.fillRect(0, front, W, 7);
  for (let x = -4; x < W; x += 9) {
    ctx.fillStyle = 'rgba(255,220,150,0.3)';
    ctx.fillRect(x, front + 1, 4, 2);
    ctx.fillStyle = 'rgba(20,8,10,0.45)';
    ctx.fillRect(x + 4, front + 4, 4, 3);
  }
  lightPool(ctx, BT.door.x - 40, front + 20, 300, 20, WARM, 0.12, 'screen');
  ctx.restore();
  ctx.fillStyle = rgba('#ffd0b0', 0.2);
  ctx.fillRect(0, front - 1, W, 2);
}

// ——— grade and shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#8a6ab0', 0.05, { warm: '#ffb07a', cool: '#3a48a8', a: 0.18 });
}

function shadeOver(ctx: Ctx): void {
  // calm under the HUD and the boss bar: the top of the sky into the dark
  vfill(ctx, 0, 0, W, 270, [[0, 'rgba(3,3,14,0.6)'], [0.6, 'rgba(3,3,14,0.22)'], [1, 'rgba(3,3,14,0)']]);
  calmLanes(ctx, 0.12, '#06040e', 120, 700);
  vignetteAll(ctx, 0.78, '#04020c');
}

// ——— the stack ———

const CARS_BOX: Box = { x: WHEEL_BOX.x - 40, y: WHEEL_BOX.y, w: WHEEL_S + 60, h: WHEEL_S + 50 };
const LEGS_BOX: Box = { x: WH.x - 170, y: WH.y - 20, w: 340, h: WH.feet - WH.y + 30 };
const TENT_BOX: Box = { x: TT.x - TT.hw - 100, y: TT.mast - 20, w: W - (TT.x - TT.hw - 100), h: TT.baseC - TT.mast + 40 };
const SAND_BOX: Box = { x: 0, y: BT.shore - 26, w: W, h: TY - BT.shore + 34 };

export const BIGTOP: SceneSpec = {
  id: 'clownking',
  info: {
    name: 'Big Top',
    subtitle: 'Boss: KING HONK',
    ambient: [],
    glows: [
      { x: BT.door.x, y: 600, r: 220, color: '#ffa850', flicker: 0.12 },
      { x: WH.x, y: WH.y, r: 260, color: '#ff8ab0', flicker: 0.05 },
    ],
    light: '#ffc89a',
    tableTint: '#ffe6d8',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: HZ + 6 }, draw: sky },
    { id: 'far', box: { x: 840, y: HZ - 100, w: W - 840, h: 110 }, draw: far },
    { id: 'sea', box: { x: 0, y: HZ, w: W, h: BT.shore - HZ + 20 }, draw: sea },
    { id: 'sand', box: SAND_BOX, draw: sandLayer },
    { id: 'wheelBack', box: { x: WH.x - 170, y: WH.y - 20, w: 360, h: WH.feet - WH.y + 40 }, draw: wheelBack },
    { id: 'wheel', box: WHEEL_BOX, motion: 'sprite', draw: (c) => wheel(c, WH.x, WH.y) },
    { id: 'wheelLit', box: CARS_BOX, stillOnly: true, draw: (c) => wheelLitStill(c) },
    { id: 'cars', box: CARS_BOX, motion: 'slot', draw: () => {} },
    { id: 'wheelFront', box: LEGS_BOX, draw: (c) => legs(c, 0, false) },
    { id: 'tent', box: TENT_BOX, draw: tent },
    { id: 'sign', box: { x: BT.sign.x - 160, y: BT.sign.y - 80, w: 320, h: 160 }, draw: (c) => sign(c) },
    { id: 'flagsStill', box: FLAGS_BOX, stillOnly: true, draw: (c) => flagsStill(c) },
    { id: 'flags', box: FLAGS_BOX, motion: 'slot', draw: () => {} },
    { id: 'crates', box: { x: CR.x - 80, y: CR.ground - 130, w: 170, h: 146 }, draw: crates },
    { id: 'cart', box: { x: CT.x - 80, y: CT.post.y - 10, w: 190, h: CT.ground - CT.post.y + 20 }, draw: (c) => cart(c) },
    { id: 'balloonsStill', box: BAL_BOX, stillOnly: true, draw: (c) => balloonsStill(c) },
    { id: 'balloons', box: BAL_BOX, motion: 'slot', draw: () => {} },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

type Img = Phaser.GameObjects.Image;

registerKitScene(BIGTOP, (k: KitLive) => {
  const clamp = Phaser.Math.Clamp;
  const fx = k.slot('fx');
  const carsSlot = k.slot('cars');
  const flagSlot = k.slot('flags');
  const balSlot = k.slot('balloons');

  // ——— hero: the Ferris wheel ———
  const wheelImg = k.pivot(k.sprite('wheel'), WH.x, WH.y);
  const CK = WHEEL_S / 2;
  const chaseKey = sheet(k, 'ck_chase', CK, CK, 4, (c, _ph, i) => chaseFrame(c, i, 0.5));
  const chase = new Loop(k, chaseKey, 4, WH.x, WH.y, { into: carsSlot, add: true, scale: 2, fps: 4.5 });
  const hubGlow = k.glow(WH.x, WH.y, 70, 0xffc890, 0.14, { into: carsSlot });
  const carKey = sheet(k, 'ck_car', CAR_W, CAR_H, 4, (c, _ph, i) => car(c, CAR_W / 2, CAR_PIN, i));
  const cars = Array.from({ length: CARS }, (_, j) => {
    const im = k.img(carKey, 0, 0, { into: carsSlot, origin: [0.5, CAR_PIN / CAR_H] }).setFrame(j % 4);
    return { im, s: new Spring(0, 7, 0.9), seed: j * 1.7 + crand() * 2 };
  });
  let turn = 0;
  const spin = 0.085;
  const jolt = new Spring(0, 30, 5);
  let brown = 0;
  let popCool = 0;

  // ——— hero: the pennants ———
  const FN = 8;
  const flags = FLAGS.map((f, i) => {
    const key = sheet(k, `ck_flag${i}`, FLAG_W, FLAG_H, FN, (c, ph) => flagFrame(c, ph, f.col, f.band, f.seed));
    return new Loop(k, key, FN, f.x, f.y, { into: flagSlot, origin: [FLAG_HOIST[0] / FLAG_W, FLAG_HOIST[1] / FLAG_H], fps: 8 + i * 1.3, phase: i * 3 });
  });
  let snap = 0;

  // ——— hero: the balloons ———
  const { x: tx, y: ty } = CT.post;
  const strings = k.sc.add.graphics();
  balSlot.add(strings);
  const balKeys = BAL_COLS.map((col, i) => k.tex(`ck_bal${i}`, BAL_W, BAL_H, (c) => balloon(c, col)));
  type Bal = { L: number; a0: number; c: number; im: Img; s: Spring; seed: number; state: 'on' | 'drop' | 'gone' | 'grow' | 'free'; t: number; x: number; y: number; vx: number; vy: number; drop: number };
  const bals: Bal[] = BUNCH.map((b, i) => ({
    L: b.L, a0: b.a, c: b.c,
    im: k.img(balKeys[b.c], 0, 0, { into: balSlot, origin: [BAL_KNOT[0] / BAL_W, BAL_KNOT[1] / BAL_H] }),
    s: new Spring(b.a + WIND_LEAN, 3.2 + i * 0.15, 0.7), seed: i * 2.3 + crand() * 2, state: 'on', t: 0, x: 0, y: 0, vx: 0, vy: 0, drop: 0,
  }));
  const knotOf = (b: Bal, L = b.L): [number, number] => [tx + Math.sin(b.s.x) * L, ty - Math.cos(b.s.x) * L];
  // rubber shreds (painted curls, tinted the balloon's colour) and the pop's flash ring
  const shredKey = sheet(k, 'ck_shred', 22, 22, 4, (c, _ph, i) => {
    let sd = 31 + i * 17;
    const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    c.save();
    c.translate(11, 11);
    c.rotate(rr() * P2);
    const g = c.createLinearGradient(-8, -6, 8, 6);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#8a8a8a');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-8, -2);
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * P2;
      c.lineTo(Math.cos(a) * (4 + rr() * 5), Math.sin(a) * (2 + rr() * 4));
    }
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(30,20,30,0.6)';
    c.lineWidth = 1;
    c.stroke();
    c.restore();
  });
  const shreds = new Parts(k, { frame: 'mote', sheet: { key: shredKey, n: 4, half: 11 }, into: fx, max: 60 });
  const ringKey = k.tex('ck_ring', 64, 64, (c) => {
    c.strokeStyle = 'rgba(255,250,240,0.9)';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(32, 32, 28, 0, P2);
    c.stroke();
  });
  const pops: { ring: Img; flash: Img; t: number }[] = [];
  const pop = (b: Bal) => {
    const [kx, ky] = knotOf(b);
    const cx = kx + Math.sin(b.s.x) * 30;
    const cy = ky - Math.cos(b.s.x) * 30;
    const col = Phaser.Display.Color.HexStringToColor(BAL_COLS[b.c]).color;
    for (let i = 0; i < 12; i++) {
      const a = crand() * P2;
      const sp = 160 + crand() * 260;
      shreds.spawn({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 1.1 + crand() * 0.5, r0: 5 + crand() * 4, a: 1, tint: col, grav: 900, drag: 2.2, spin: (crand() - 0.5) * 16, floor: CT.ground + crand() * 20, bounce: 0.2, fade: 0.02 });
    }
    pops.push({ ring: k.img(ringKey, cx, cy, { into: fx, scale: 0.3 }), flash: k.glow(cx, cy, 60, 0xfff4e0, 0.7, { into: fx }), t: 0 });
    b.state = 'drop';
    b.t = 0;
    b.drop = 0;
    b.im.setVisible(false);
  };
  const release = (b: Bal) => {
    const [kx, ky] = knotOf(b);
    b.state = 'free';
    b.t = 0;
    b.x = kx;
    b.y = ky;
    b.vx = 30 + crand() * 30;
    b.vy = -50;
  };

  // ——— the door's light breathing with the show inside, and dust off the sand ———
  const doorGlow = k.glow(BT.door.x, 600, 150, 0xffa850, 0.1, { into: fx });
  const doorPool = k.glow(BT.door.x, BT.tent.baseC + 40, 230, 0xffa050, 0.08, { into: fx, sy: 0.22 });
  const puffs = new Parts(k, { frame: 'puff', into: fx, max: 40 });
  const grains = new Parts(k, { frame: 'mote', into: fx, max: 80 });

  return {
    impact(x, _y, p) {
      // the wheel jolts on its drive, the cars swing, the bulbs brown out for a moment
      jolt.v += (x < WH.x ? 1 : -1) * 0.18 * p + 0.12 * p;
      for (const [j, c] of cars.entries()) {
        const th = (j / CARS) * P2 + P2 / SPOKES / 2 + turn;
        c.s.v += (-Math.sin(th) * 0.55 + (crand() - 0.5) * 0.4) * p;
      }
      if (p > 0.3) brown = Math.max(brown, 0.35 + p * 0.45);
      // the pennants snap
      snap = Math.max(snap, p);
      // the balloons knocked about; the nearest pops, or on a big one a balloon slips its knot
      for (const b of bals) if (b.state === 'on') b.s.v += (Math.sign(tx - x) || 1) * (0.5 + crand() * 0.6) * p * (0.6 + Math.min(1, 500 / (Math.abs(x - tx) + 200)));
      const live = bals.filter((b) => b.state === 'on');
      if (live.length > 2 && p > 0.45 && popCool <= 0 && Math.abs(x - tx) < 460) {
        popCool = 2.5;
        const near = live.reduce((m, b) => (Math.abs(knotOf(b)[0] - x) < Math.abs(knotOf(m)[0] - x) ? b : m), live[0]);
        if (crand() < 0.25 + p * 0.35) pop(near);
        else if (p > 0.75 && crand() < 0.4) release(live[Math.floor(crand() * live.length)]);
      }
      // sand kicked up along the table's back edge
      for (let i = 0; i < 3 + p * 5; i++) {
        const px = x + (crand() - 0.5) * 220;
        puffs.spawn({ x: px, y: TY - 6 - crand() * 10, vx: (px - x) * 0.6, vy: -14 - crand() * 16, life: 1.4 + crand() * 0.8, r0: 14, r1: 50 + crand() * 30, a: 0.14 + p * 0.06, tint: 0x9a7e98, drag: 1.6, fade: 0.1 });
      }
      for (let i = 0; i < 6 + p * 12; i++) {
        const px = x + (crand() - 0.5) * 240;
        grains.spawn({ x: px, y: TY - 4, vx: (px - x) * (0.8 + crand()), vy: -120 - crand() * 160 * p, life: 0.9, r0: 1.4 + crand(), a: 0.8, tint: 0xd8b8b0, grav: 700, floor: TY + 2 + crand() * 20, fade: 0.02 });
      }
    },
    update(dt, t) {
      const cm = calm();
      // ——— the wheel
      turn += spin * dt * cm;
      const off = jolt.step(0, dt);
      const ang = turn + off * 0.12;
      wheelImg.setRotation(ang);
      brown = Math.max(0, brown - dt * 1.6);
      const flick = brown > 0.05 ? (Math.sin(t * 60) > 0.2 ? 1 : 0.6) : 1;
      chase.alpha = clamp(1 - brown * flick, 0.15, 1);
      chase.step(dt, cm);
      chase.each((im) => im.setRotation(ang));
      hubGlow.setAlpha(0.14 * chase.alpha);
      const accel = jolt.v;
      for (const [j, c] of cars.entries()) {
        const th = (j / CARS) * P2 + P2 / SPOKES / 2 + ang;
        // the breeze on them, and the drive's jolt pushing each along the rim
        const breeze = wander(t * 0.4, c.seed) * 0.03 * cm;
        c.s.v += -Math.sin(th) * accel * 0.4 * dt;
        const sw = c.s.step(breeze, dt);
        const px = WH.x + Math.cos(th) * WH.pin;
        const py = WH.y + Math.sin(th) * WH.pin;
        c.im.setPosition(px, py).setRotation(clamp(sw, -0.42, 0.42));
      }
      // ——— the pennants
      snap = Math.max(0, snap - dt * 0.7);
      for (const f of flags) f.step(dt, (1 + snap * 1.4 + wander(t * 0.3, 1) * 0.15) * cm);
      // ——— the balloons
      popCool -= dt;
      strings.clear();
      for (const b of bals) {
        b.t += dt;
        if (b.state === 'on' || b.state === 'grow') {
          const wind = WIND_LEAN + wander(t * 0.35, b.seed) * 0.06 * cm;
          const a = b.s.step(b.a0 + wind, dt);
          const grow = b.state === 'grow' ? Phaser.Math.Easing.Back.Out(clamp(b.t / 1.3, 0, 1)) : 1;
          if (b.state === 'grow' && b.t > 1.3) b.state = 'on';
          const L = b.state === 'grow' ? 40 + (b.L - 40) * clamp(b.t / 0.9, 0, 1) : b.L + Math.sin(t * 1.3 + b.seed) * 2;
          const [kx, ky] = knotOf(b, L);
          b.im.setVisible(true).setPosition(kx, ky).setRotation(a * 0.5 + Math.sin(t * 0.9 + b.seed) * 0.04).setScale(grow);
          // the string bows a little against the way it's moving
          strings.lineStyle(1.1, 0xe6dcd6, 0.55);
          strings.beginPath();
          strings.moveTo(tx, ty);
          const bow = clamp(-b.s.v * 10, -14, 14) + 5;
          const mx = (tx + kx) / 2 + bow * Math.cos(a);
          const my = (ty + ky) / 2 + bow * Math.sin(a);
          for (let i = 1; i <= 8; i++) {
            const u = i / 8;
            strings.lineTo((1 - u) * (1 - u) * tx + 2 * (1 - u) * u * mx + u * u * kx, (1 - u) * (1 - u) * ty + 2 * (1 - u) * u * my + u * u * ky);
          }
          strings.strokePath();
        } else if (b.state === 'drop') {
          // the string falls back over the post
          b.drop = Math.min(1, b.drop + dt * 2.4);
          const [kx, ky] = knotOf(b, b.L * (1 - b.drop * 0.6));
          const ey = ky + b.drop * b.drop * (ty + 70 - ky);
          strings.lineStyle(1.1, 0xe6dcd6, 0.55 * (1 - b.drop * 0.6));
          strings.beginPath();
          strings.moveTo(tx, ty);
          strings.lineTo(kx + (tx + 14 - kx) * b.drop, ey);
          strings.strokePath();
          if (b.drop >= 1) {
            b.state = 'gone';
            b.t = 0;
          }
        } else if (b.state === 'free') {
          // slipped its knot: up into the dusk, drifting with the breeze, smaller as it goes, the string trailing
          b.vy = Math.max(-95, b.vy - 30 * dt);
          b.vx += (14 + wander(t, b.seed) * 20 - b.vx) * dt * 0.5;
          b.x += b.vx * dt * cm;
          b.y += b.vy * dt * cm;
          const sc = clamp(1 - (ty - b.y) / 900, 0.45, 1);
          const al = clamp((b.y + 40) / 240, 0, 1);
          b.im.setPosition(b.x, b.y).setScale(sc).setRotation(Math.sin(t * 1.7 + b.seed) * 0.15).setAlpha(al);
          strings.lineStyle(1, 0xe6dcd6, 0.5 * al);
          strings.beginPath();
          strings.moveTo(b.x, b.y);
          for (let i = 1; i <= 6; i++) strings.lineTo(b.x - b.vx * 0.12 * i * 0.3 + Math.sin(t * 5 + i) * 3 * sc, b.y + i * 9 * sc);
          strings.strokePath();
          if (al <= 0) {
            b.state = 'gone';
            b.t = 0;
            b.im.setVisible(false).setAlpha(1);
          }
        } else if (b.state === 'gone' && b.t > 4 + (b.seed % 3)) {
          // the seller ties on a new one
          b.state = 'grow';
          b.t = 0;
          b.s.x = b.a0 + WIND_LEAN;
          b.s.v = 0;
        }
      }
      shreds.update(dt);
      for (let i = pops.length - 1; i >= 0; i--) {
        const q = pops[i];
        q.t += dt;
        const u = q.t / 0.22;
        q.ring.setScale(0.3 + u * 1.4).setAlpha(Math.max(0, 0.8 * (1 - u)));
        q.flash.setAlpha(Math.max(0, 0.7 * (1 - q.t / 0.12)));
        if (u >= 1) {
          q.ring.destroy();
          q.flash.destroy();
          pops.splice(i, 1);
        }
      }
      // ——— the door
      const show = 0.85 + wander(t * 0.5, 4.1) * 0.15 + (flicker(t, 2) - 0.9) * 0.2;
      doorGlow.setAlpha(0.1 * show);
      doorPool.setAlpha(0.08 * show);
      puffs.update(dt);
      grains.update(dt);
    },
  };
});

void softly;
void castShadow;
