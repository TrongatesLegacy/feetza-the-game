// The Summit (the Yeti Ski Boot's arena, wave 55), redrawn with the location kit (src/art/scene): the col under the
// Summit's horn, high above the Ski Slopes on the same mountain (scene-slopes.ts), off-piste where the yeti lives.
// Night, after the night skiing: a hard frost, the moon low on the left, the aurora up over the range.
//
// The horn itself fills the middle, close now: moonlit snow faces on the left, blue shade faces on the right, rock
// bands and gullies, its hooked summit trailing a plume of spindrift; the back range far below, its valleys full of
// moonlit cloud. The col's snowfield in front, carved into sastrugi by the wind, a crevasse across it, the yeti's
// great footprints coming out of its lair: an ice cave in a serac wall on the left (blue glacier ice lit through where
// it's thin, a fringe of icicles over the mouth, a heap of packed snowballs at the door, his ammunition); on the right a
// granite buttress under a cornice, spindrift pouring off its lip, icicles under it; a climbers' pole planted on the
// col with a torn expedition flag and a string of prayer flags run up to the rock; a giant snowball come to rest at
// the end of the furrow it ploughed down from the buttress; the SUMMIT sign from the slopes below, frosted, half
// buried, a hand-painted YETI warning nailed under it. The table is a slab of glacier ice.
//
// Live, the heroes:
// - the aurora: painted curtains (frames) folding and rippling along their length, rays running through them;
// - the spindrift: the summit plume streaming off the horn and the cornice's pour (painted frames), snow streaming
//   along the col in the gusts, snow falling in two depths; a stomp breaks a sluff off the cornice (a heavier pour, a
//   cloud of powder at the foot, clumps bouncing down) and shakes icicles off the cave's mouth and the cornice, which
//   fall and shatter;
// - the flags: the prayer flags and the expedition flag cracking in the wind (painted frames), whipped harder by a
//   stomp.

import { type Air, type Ctx, type PathFn, type R, TY, W, calmLanes, glowAt, gradeAll, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { drift, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { cloud, horizonGlow, skyFill, stars } from '../../art/scene/sky';
import { ZB, xAt, yAt, zFront } from '../../art/sceneKit';
import { hashStr, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, registerKitScene } from '../../game/sceneLive';
import { ridgePath, wave1 } from './sceneBits';
import type { Pt } from './scene-rink';
import { type Summit, NIGHT, massif, snowTile, topOf } from './scene-slopes';

// ——— layout ———

export const YE = {
  front: 1040,
  moon: { x: 300, y: 128, r: 28 },
  /** The aurora's box (its slot): the curtains stay above the horn's shoulders. */
  auroraH: 250,
  /** The horn's foot (behind the col's skyline) and the far range's. */
  hornFoot: 604,
  farFoot: 600,
  /** The ice cave in the serac wall: its centre, floor and half-width, and the arch's height. */
  cave: { x: 250, floor: 708, hw: 112, h: 200 },
  /** The serac wall's foot on the col. */
  seracFoot: 722,
  /** The cornice's lip over the buttress. */
  lip: { x: 1528, y: 344 },
  buttressFoot: 712,
  /** The climbers' pole and the flag line run from its top to a piton in the buttress. */
  pole: { x: 1338, base: 664, top: 430 },
  piton: { x: 1652, y: 424 },
  ball: { x: 1212, y: 688, r: 58 },
  pile: { x: 548, y: 744 },
  sign: { x: 1786, y: 768 },
};

const P2 = Math.PI * 2;
const INK = '#0a1228';
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** How big things are on the col at screen y (1 at the table's back edge). */
const kAt = (y: number) => Math.max(0.12, (y - 560) / (TY - 560));
/** The col's skyline. */
const colTop = (x: number): number => 584 + wave1(x, 4) * 5 + Math.sin(x / 300) * 4 - Math.max(0, Math.sin(x / 170 + 1)) ** 2 * 7;
const SNOW = { lit: '#eef4ff', body: '#b4c6e8', shade: '#6a82bc', deep: '#3a5090' };
const ICE = { lit: '#d4ecff', body: '#6a9ad4', deep: '#16306a', glow: '#7fd8ff' };

// ——— the sky ———

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: YE.hornFoot };
  skyFill(ctx, box, [[0, '#02040e'], [0.35, '#060e26'], [0.72, '#13224c'], [1, '#22346a']], 0.04);
  lay(ctx, drift('#18285a', '#02040e', 3, 41, 160, 48), box, 0.2);
  // the milky way, a faint dusty band climbing from the right
  softly(ctx, box, (g) => {
    g.save();
    g.translate(1500, 220);
    g.rotate(-0.95);
    const lg = g.createLinearGradient(0, -110, 0, 110);
    lg.addColorStop(0, 'rgba(150,160,220,0)');
    lg.addColorStop(0.5, 'rgba(150,160,220,0.16)');
    lg.addColorStop(1, 'rgba(150,160,220,0)');
    g.fillStyle = lg;
    g.fillRect(-700, -110, 1400, 220);
    g.restore();
  }, 0.25);
  stars(ctx, r, { x: 0, y: 0, w: W, h: 470 }, 380, '#eef2ff');
  // dense dust of faint stars along the band
  for (let i = 0; i < 260; i++) {
    const u = r();
    const x = 1500 + (u - 0.5) * 1100 * Math.cos(-0.95) + (r() - 0.5) * 120;
    const y = 220 + (u - 0.5) * 1100 * Math.sin(-0.95) + (r() - 0.5) * 120;
    if (y < 0 || y > 470) continue;
    ctx.fillStyle = rgba('#e4e8ff', 0.2 + r() * 0.35);
    ctx.fillRect(x, y, 1, 1);
  }
  // the aurora's light over the whole sky, greenest low over the range
  glowAt(ctx, 520, 330, 900, '#2aff9a', 0.06, 0.45);
  glowAt(ctx, 1500, 300, 700, '#30e0b0', 0.04, 0.45);
  horizonGlow(ctx, YE.farFoot - 50, 140, '#3a4c8a', 0.5);
  // the moon low on the left (the key stays on that side), its halo in the frost
  const { x: mx, y: my, r: mr } = YE.moon;
  glowAt(ctx, mx, my, 560, '#6a80d0', 0.24);
  glowAt(ctx, mx, my, 170, '#dfe6ff', 0.38);
  const mg = ctx.createRadialGradient(mx - mr * 0.35, my - mr * 0.35, 0, mx, my, mr);
  mg.addColorStop(0, '#fffef6');
  mg.addColorStop(0.7, '#f0eee0');
  mg.addColorStop(1, '#c8c6b8');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba('#9a9884', 0.32);
  for (const [dx, dy, rr] of [[-8, -6, 6], [6, 5, 5], [-3, 11, 3.5], [10, -8, 3], [-12, 6, 2.5]] as const) {
    ctx.beginPath();
    ctx.arc(mx + dx, my + dy, rr, 0, P2);
    ctx.fill();
  }
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
  { x0: -80, x1: 1180, y: 176, amp: 34, wl: 230, len: 175, a: 0.8, s: 0 },
  { x0: 200, x1: 900, y: 196, amp: 22, wl: 160, len: 90, a: 0.4, s: 4 },
  { x0: 980, x1: 2000, y: 128, amp: 30, wl: 190, len: 115, a: 0.55, s: 2 },
];

/** A column of curtain light (made once): a hot green lower edge, green rays rising, violet at the top. */
let auroraCol: HTMLCanvasElement | null = null;
function auroraColumn(): HTMLCanvasElement {
  if (auroraCol) return auroraCol;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const g = c.getContext('2d')!;
  const lg = g.createLinearGradient(0, 0, 0, 128);
  lg.addColorStop(0, 'rgba(150,70,255,0)');
  lg.addColorStop(0.12, 'rgba(210,70,210,0.2)');
  lg.addColorStop(0.4, 'rgba(130,80,255,0.3)');
  lg.addColorStop(0.7, 'rgba(50,240,170,0.3)');
  lg.addColorStop(0.88, 'rgba(120,255,190,0.75)');
  lg.addColorStop(0.93, 'rgba(210,255,230,1)');
  lg.addColorStop(0.97, 'rgba(90,255,170,0.5)');
  lg.addColorStop(1, 'rgba(50,255,160,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, 4, 128);
  auroraCol = c;
  return c;
}

/** The middle of the sky (where the feet hover) is kept quieter. */
const calmMid = (x: number) => 1 - 0.55 * Math.exp(-(((x - 980) / 360) ** 2));

/** The aurora at phase ph (0…1 loops): folded curtains whose folds travel along them, rays running through. */
function aurora(c: Ctx, ph: number, gain = 1): void {
  const T = P2 * ph;
  const col = auroraColumn();
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const b of BANDS) {
    for (let x = b.x0; x < b.x1; x += 3) {
      const u = (x - b.x0) / (b.x1 - b.x0);
      const env = Math.sin(u * Math.PI) ** 0.7 * calmMid(x);
      const y = b.y + Math.sin(x / b.wl + b.s + Math.sin(T) * 0.5) * b.amp + Math.sin(x / (b.wl * 0.37) - T + b.s * 2) * b.amp * 0.22;
      const ray = 0.35 + 0.65 * Math.max(0, Math.sin(x / 7 + T * 3 + b.s) * 0.6 + Math.sin(x / 19 - T * 2 + b.s) * 0.5);
      const L = b.len * (0.6 + 0.4 * Math.sin(x / 61 + T + b.s * 3)) * (0.8 + ray * 0.3);
      // a fold turning edge-on reads brighter
      const fold = 1 + 0.7 * Math.max(0, Math.cos(x / b.wl + b.s + Math.sin(T) * 0.5)) ** 6;
      c.globalAlpha = clamp01(gain * b.a * env * ray * fold * 0.6);
      c.drawImage(col, x - 1.5, y - L, 6, L + 10);
      // the curtain's diffuse sheet, wide and soft
      c.globalAlpha *= 0.35;
      c.drawImage(col, x - 6, y - L * 1.25, 15, L * 1.25 + 14);
    }
  }
  c.restore();
}

function auroraStill(ctx: Ctx): void {
  aurora(ctx, 0.15);
}

// ——— the far range and the horn ———

const FARS: Summit[] = [
  [130, 112, 230, 180, 1.3],
  [470, 74, 150, 170, 1.2],
  [1660, 104, 220, 220, 1.3],
  [1880, 84, 130, 160, 1.2],
];
const farTop = topOf(FARS, YE.farFoot, 16, 7);

function farScene(ctx: Ctx, r: R): void {
  const skyAir: Air = { color: '#24366c', far: 0.9 };
  massif(ctx, r, farTop, YE.farFoot, FARS, { ...NIGHT, air: skyAir, lit: mix(NIGHT.lit, NIGHT.far, 0.3), shade: NIGHT.far }, 0.78, 0.6);
  // the valleys far below full of cloud, lit by the moon
  vfill(ctx, 0, 548, W, 60, [[0, 'rgba(150,170,220,0)'], [0.5, 'rgba(150,170,220,0.55)'], [1, 'rgba(120,140,200,0.8)']]);
  const o = { lit: '#c8d4f4', body: '#7a8cc0', shadow: '#3a4a80', sunX: YE.moon.x, sunY: YE.moon.y, rim: 0.3, wisp: 0.5, a: 0.3, depth: 0.4 };
  for (let i = 0; i < 7; i++) cloud(ctx, r, r() * W, 580 + r() * 20, 340 + r() * 300, 26 + r() * 16, { ...o, kind: 'bank' });
}

// (in order along the range: the lit faces run back from each summit to the saddle before it)
const HORN: Summit[] = [
  [770, 160, 160, 150, 0.9],
  [1084, 500, 430, 230, 1.35],
  [1402, 254, 120, 190, 1.15],
];
const hornTop0 = topOf(HORN, YE.hornFoot, 8, 21);
/** The horn's summit hooked over to the right, as it's seen from the slopes. */
export const hornTop = (x: number): number => hornTop0(x) - Math.exp(-(((x - 1108) / 22) ** 2)) * 36 - Math.exp(-(((x - 1152) / 26) ** 2)) * 16;
/** The horn's summit point. */
export const PEAK: Pt = (() => {
  let px = 1084;
  for (let x = 1040; x < 1180; x++) if (hornTop(x) < hornTop(px)) px = x;
  return [px, hornTop(px)];
})();

const HORN_V = { ...NIGHT, air: { color: '#1c2a58', far: 0.72 }, lit: '#dce6fa', shade: '#3e5288', rock: '#222a48' };

function horn(ctx: Ctx, clip: { x: number; y: number; w: number; h: number }): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(clip.x, clip.y, clip.w, clip.h);
  ctx.clip();
  const rr = rng(hashStr('yeti:horn'));
  massif(ctx, rr, hornTop, YE.hornFoot, HORN, HORN_V, 0.26, 0.5);
  // the aurora's green on the snow faces turned up to it, faint
  within(ctx, ridgePath(0, W, YE.hornFoot + 8, hornTop, 3), () => {
    // the wind-slab texture over the high faces too (the massif lays it over its lower part)
    lay(ctx, noiseMask(16, 51, { cover: 0.4, soft: 0.4, col: '#3e5288', w: 320, h: 60 }), { x: 0, y: 60, w: W, h: 250 }, 0.16);
    // spine flutes: the steep snow carved into runnels down the fall line from the ridge, each a lit crest beside a
    // blue groove, finer and fainter towards the foot
    const fr = rng(hashStr('yeti:flutes'));
    for (let x = 640; x < 1590; x += 7 + fr() * 10) {
      const ty = hornTop(x);
      const h = YE.hornFoot - ty;
      if (h < 60) continue;
      const sl = (hornTop(x + 6) - hornTop(x - 6)) / 12;
      const y0 = ty + 10 + fr() * h * 0.1;
      const len = h * (0.12 + fr() * 0.25);
      const bend = sl * len * 0.25 + (fr() - 0.5) * 10;
      for (const [dx, col, a] of [[0, '#0c1840', 0.16], [-1.8, '#f2f6ff', 0.14]] as const) {
        ctx.strokeStyle = rgba(col, a);
        ctx.lineWidth = 1.2 + fr() * 1.6;
        ctx.beginPath();
        ctx.moveTo(x + dx, y0);
        ctx.bezierCurveTo(x + dx - bend * 0.4, y0 + len * 0.35, x + dx + bend * 0.8, y0 + len * 0.7, x + dx + bend, y0 + len);
        ctx.stroke();
      }
    }
    // the moon on the faces turned to it, the far side of the arete in deep blue
    const [px, py] = PEAK;
    const mg = ctx.createRadialGradient(px - 160, py + 120, 20, px - 160, py + 160, 420);
    mg.addColorStop(0, 'rgba(240,246,255,0.34)');
    mg.addColorStop(1, 'rgba(240,246,255,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, W, YE.hornFoot + 8);
    ctx.fillStyle = 'rgba(10,18,60,0.42)';
    ctx.beginPath();
    ctx.moveTo(px + 2, py);
    ctx.bezierCurveTo(px + 40, py + 160, px + 90, py + 330, px + 150, YE.hornFoot + 8);
    ctx.lineTo(W, YE.hornFoot + 8);
    ctx.lineTo(W, py - 40);
    ctx.closePath();
    ctx.fill();
    // cold mist lying in the col at the horn's foot, the lower faces fading into it
    vfill(ctx, 0, 420, W, YE.hornFoot - 412, [[0, 'rgba(120,140,200,0)'], [0.6, 'rgba(120,140,200,0.4)'], [1, 'rgba(150,168,220,0.75)']]);
    ctx.globalCompositeOperation = 'soft-light';
    vfill(ctx, 0, 80, W, 300, [[0, 'rgba(80,255,170,0.18)'], [1, 'rgba(80,255,170,0)']]);
  });
  ctx.restore();
}

// ——— spindrift: the summit plume and the cornice's pour (frames) ———

const PLW = 460;
const PLH = 160;
const PL_SRC: Pt = [16, 64];

/** One frame of the summit's plume (ph 0…1 loops), PLW×PLH, its root at PL_SRC: puffs of spindrift torn off the
 * summit, swelling and thinning as they stream away on the wind, lit on top by the moon, their bellies blue. */
function plumeFrame(c: Ctx, ph: number, gain = 1): void {
  const N = 34;
  for (let i = 0; i < N; i++) {
    const rr = rng(hashStr('yeti:plume' + i));
    const age = (i / N + ph + rr() * 0.02) % 1;
    const x = PL_SRC[0] + age ** 0.85 * (PLW - 80) + (rr() - 0.5) * 20 * age;
    const y = PL_SRC[1] + age * 34 + Math.sin(age * 7 + i * 1.3) * 12 * age + (rr() - 0.5) * 22 * age;
    const rad = 9 + age * (40 + rr() * 20);
    const a = gain * 0.62 * (1 - age) ** 1.1 * Math.min(1, age * 4);
    if (a < 0.01) continue;
    const g = c.createRadialGradient(x - rad * 0.3, y - rad * 0.35, 0, x, y, rad);
    g.addColorStop(0, `rgba(240,246,255,${a.toFixed(3)})`);
    g.addColorStop(0.55, `rgba(176,196,236,${(a * 0.55).toFixed(3)})`);
    g.addColorStop(1, 'rgba(120,140,200,0)');
    c.fillStyle = g;
    c.save();
    c.translate(x, y);
    c.scale(1.7, 0.7);
    c.translate(-x, -y);
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    c.restore();
  }
  // fine streaks of snow in the stream
  for (let i = 0; i < 40; i++) {
    const rr = rng(hashStr('yeti:streak' + i));
    const age = (i / 40 + ph * 2) % 1;
    if (age < 0.15) continue;
    const x = PL_SRC[0] + age * (PLW - 60);
    const y = PL_SRC[1] + age * 26 + (rr() - 0.5) * 50 * (0.3 + age);
    const l = 10 + rr() * 26;
    c.strokeStyle = `rgba(236,242,255,${(gain * 0.4 * (1 - age)).toFixed(3)})`;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + l, y + l * 0.06);
    c.stroke();
  }
}

const POW = 200;
const POH = 380;
const PO_SRC: Pt = [44, 6];

/** One frame of snow pouring off the cornice's lip (ph 0…1 loops), POW×POH, the lip at PO_SRC: a veil of fine
 * snow falling and blowing out to the right, thickening into soft swags, grains glinting. */
function pourFrame(c: Ctx, ph: number): void {
  // the veil: soft swags falling
  for (let i = 0; i < 26; i++) {
    const rr = rng(hashStr('yeti:veil' + i));
    const age = (i / 26 + ph) % 1;
    const fall = age ** 1.35;
    const x = PO_SRC[0] + fall * 90 + (rr() - 0.5) * 30 + Math.sin(age * 5 + i) * 10;
    const y = PO_SRC[1] + fall * (POH - 50);
    const rad = 10 + age * 40;
    const a = 0.34 * (1 - age) * Math.min(1, age * 6);
    const g = c.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
    g.addColorStop(0, `rgba(236,242,255,${a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(160,180,230,0)');
    c.fillStyle = g;
    c.save();
    c.translate(x, y);
    c.scale(0.8, 1.4);
    c.translate(-x, -y);
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    c.restore();
  }
  // the grains: a few soft specks of powder in the veil, lit on top
  for (let i = 0; i < 60; i++) {
    const rr = rng(hashStr('yeti:grain' + i));
    const age = (i / 60 + ph + rr() * 0.1) % 1;
    const fall = age ** 1.3;
    const x = PO_SRC[0] + (rr() - 0.4) * 30 + fall * (70 + rr() * 60);
    const y = PO_SRC[1] + fall * (POH - 30) * (0.85 + rr() * 0.15);
    const a = 0.6 * (1 - age ** 2) * Math.min(1, age * 12);
    const rad = 1.2 + rr() * 1.8;
    const g = c.createRadialGradient(x, y, 0, x, y, rad * 1.8);
    g.addColorStop(0, `rgba(246,250,255,${a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(220,232,255,0)');
    c.fillStyle = g;
    c.fillRect(x - rad * 2, y - rad * 2, rad * 4, rad * 4);
  }
}

// ——— the col ———

function footprint(ctx: Ctx, x: number, y: number, k: number, ang: number, left: boolean): void {
  // a big bare yeti print seen low across the snow: the sole sunk in (a long oval, broad at the ball), four round
  // toe pits in a fan ahead of it, the snow pushed up round them; the inner wall turned to the moon lit, the near one
  // in shadow
  const rx = 24 * k;
  const ry = 8 * k;
  const pits: [number, number, number, number][] = [[0, 0, rx, ry]];
  for (let t = 0; t < 4; t++) {
    const fan = (t - 1.5) * (left ? 1 : -1);
    pits.push([rx + 9 * k - Math.abs(fan) * 3 * k, fan * ry * 0.62, (5.2 - Math.abs(fan) * 0.6) * k, 3 * k]);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  for (const [px, py, ax, ay] of pits) {
    ctx.fillStyle = rgba(SNOW.lit, 0.4);
    ctx.beginPath();
    ctx.ellipse(px + 1.2 * k, py + 1.8 * k, ax * 1.2, ay * 1.35, 0, 0, Math.PI);
    ctx.fill();
  }
  for (const [px, py, ax, ay] of pits) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(px, py, ax, ay, 0, 0, P2);
    ctx.fillStyle = rgba('#3e5294', 0.6);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = rgba('#d4e0f8', 0.4);
    ctx.beginPath();
    ctx.ellipse(px + ax * 0.2, py + ay * 0.75, ax * 0.9, ay * 0.8, 0, 0, P2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** The yeti's trail: out of the cave, across the col, off towards the table. */
function trail(t: number): [number, number, number] {
  const p0: Pt = [YE.cave.x + 40, YE.cave.floor + 4];
  const p1: Pt = [760, 676];
  const p2: Pt = [1000, 760];
  const u = 1 - t;
  const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
  const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
  const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return [x, y, Math.atan2(dy * 2.2, dx)];
}

function col(ctx: Ctx, r: R): void {
  const path: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-4, TY + 8);
    for (let x = -4; x <= W + 4; x += 4) c.lineTo(x, colTop(x));
    c.lineTo(W + 4, TY + 8);
    c.closePath();
  };
  path(ctx);
  ctx.fillStyle = SNOW.body;
  ctx.fill();
  within(ctx, path, () => {
    vfill(ctx, 0, 576, W, TY - 568, [[0, '#a4b8e2'], [0.12, '#7e94c8'], [0.55, '#92a8d6'], [1, '#aabce4']]);
    surface(ctx, r, { x: 0, y: 576, w: W, h: TY - 568 }, '#94aad8', { over: true, vary: 0.3, cells: 6, mottle: 0.25, strokes: 0.5, strokeAng: 0.02, strokeLen: 260, strokeW: 2, grain: 0.1, seed: 31 });
    // the moon's light from the left, the far right in the buttress's shadow
    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, 'rgba(232,238,255,0.16)');
    lg.addColorStop(0.5, 'rgba(232,238,255,0.02)');
    lg.addColorStop(0.8, 'rgba(20,30,70,0.12)');
    lg.addColorStop(1, 'rgba(20,30,70,0.3)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 570, W, TY - 560);
    // the serac's long moon shadow across the col
    softly(ctx, { x: 360, y: 560, w: 800, h: 220 }, (g) => {
      g.fillStyle = 'rgba(30,44,100,0.2)';
      g.beginPath();
      g.moveTo(470, 600);
      g.lineTo(560, 722);
      g.lineTo(1040, 760);
      g.lineTo(780, 640);
      g.lineTo(600, 600);
      g.closePath();
      g.fill();
    }, 0.06);
    // big wind drifts rolling across the col: a lit crest on the windward side, the lee falling into blue shade
    for (let i = 0; i < 9; i++) {
      const y = 604 + (i / 9) ** 1.3 * 130 + r() * 10;
      const k = kAt(y);
      const x0 = -100 + r() * W;
      const len = (300 + r() * 500) * (0.5 + k);
      const h = (8 + r() * 10) * k;
      const crest = (u: number) => y - Math.sin(u * Math.PI) * h;
      ctx.fillStyle = rgba('#3a4e92', 0.22);
      ctx.beginPath();
      for (let u = 0; u <= 1.001; u += 0.05) ctx.lineTo(x0 + u * len, crest(u));
      for (let u = 1; u >= -0.001; u -= 0.05) ctx.lineTo(x0 + u * len + 10 * k, y + Math.sin(u * Math.PI) * h * 0.6);
      ctx.closePath();
      ctx.fill();
      const lg2 = ctx.createLinearGradient(0, y - h, 0, y);
      lg2.addColorStop(0, rgba(SNOW.lit, 0.4));
      lg2.addColorStop(1, rgba(SNOW.lit, 0));
      ctx.fillStyle = lg2;
      ctx.beginPath();
      for (let u = 0; u <= 1.001; u += 0.05) ctx.lineTo(x0 + u * len, crest(u));
      for (let u = 1; u >= -0.001; u -= 0.05) ctx.lineTo(x0 + u * len, y - Math.sin(u * Math.PI) * h * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    // the far col darker under the horn, out of the moon's reach
    vfill(ctx, 0, 580, W, 50, [[0, 'rgba(30,44,100,0.35)'], [1, 'rgba(30,44,100,0)']]);
    // wind ripples: long faint lines across the slope, closer together far off
    for (let i = 0; i < 70; i++) {
      const y = 592 + (i / 70) ** 1.5 * (TY - 590);
      const k = kAt(y);
      const x0 = r() * W - 200;
      const len = 200 + r() * 500;
      ctx.strokeStyle = rgba(i % 2 ? SNOW.lit : SNOW.shade, 0.12 + r() * 0.1);
      ctx.lineWidth = 0.8 + k;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.bezierCurveTo(x0 + len * 0.3, y - 3 * k, x0 + len * 0.7, y + 3 * k, x0 + len, y + r() * 4);
      ctx.stroke();
    }
    // sastrugi: wind-carved ridges, their windward (left) faces lit, a shadow tucked under on the lee
    for (let i = 0; i < 110; i++) {
      const y = 596 + r() ** 0.9 * (TY - 600);
      const k = kAt(y);
      const x = r() * (W + 100) - 50;
      if (x > YE.cave.x - 160 && x < 560 && y < YE.seracFoot) continue;
      const len = (26 + r() * 70) * k;
      const h = (3 + r() * 4) * k;
      ctx.fillStyle = rgba('#3e5496', 0.28);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len * 0.6, y + h * 0.2, x + len, y + h * 0.9);
      ctx.quadraticCurveTo(x + len * 0.5, y + h * 1.3, x + len * 0.05, y + h * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(SNOW.lit, 0.42);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len * 0.4, y - h, x + len, y + h * 0.9);
      ctx.quadraticCurveTo(x + len * 0.55, y + h * 0.1, x, y);
      ctx.closePath();
      ctx.fill();
    }
    // the crevasse: a dark blue rift across the col, its far wall glowing blue, a snow bridge over it
    const cy = (x: number) => 630 + (x - 600) * 0.03 + Math.sin(x / 40) * 1.5;
    const cw = (x: number) => Math.max(0, Math.sin(((x - 600) / 300) * Math.PI)) ** 0.7 * 6;
    ctx.beginPath();
    for (let x = 600; x <= 900; x += 4) ctx.lineTo(x, cy(x));
    for (let x = 900; x >= 600; x -= 4) ctx.lineTo(x, cy(x) + cw(x));
    ctx.closePath();
    const cg = ctx.createLinearGradient(0, 628, 0, 652);
    cg.addColorStop(0, '#8ab4e8');
    cg.addColorStop(0.5, '#3a64a8');
    cg.addColorStop(1, '#1a3270');
    ctx.fillStyle = cg;
    ctx.fill();
    // the far lip, catching the moon, and the near lip's shadow edge
    ctx.strokeStyle = rgba(SNOW.lit, 0.85);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = 604; x <= 896; x += 4) ctx.lineTo(x, cy(x) - 0.6);
    ctx.stroke();
    ctx.strokeStyle = rgba('#2a3c78', 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 604; x <= 896; x += 4) ctx.lineTo(x, cy(x) + cw(x) + 0.6);
    ctx.stroke();
    // the furrow the giant snowball ploughed down from the buttress
    const { x: bx, y: by, r: br } = YE.ball;
    const fp = (t: number): Pt => [lerp(1560, bx + 10, t) - Math.sin(t * Math.PI) * 30, lerp(632, by + br * 0.7, t ** 1.2)];
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const [x, y] = fp(i / 30);
        const w = (10 + (i / 30) * 26) * (pass ? 0.55 : 1);
        if (i) ctx.lineTo(x, y - w * 0.18);
        else ctx.moveTo(x, y - w * 0.18);
      }
      for (let i = 30; i >= 0; i--) {
        const [x, y] = fp(i / 30);
        const w = (10 + (i / 30) * 26) * (pass ? 0.55 : 1);
        ctx.lineTo(x, y + w * 0.22);
      }
      ctx.closePath();
      ctx.fillStyle = pass ? rgba('#c4d2f0', 0.4) : rgba('#4a5ea0', 0.45);
      ctx.fill();
    }
    // lumps thrown out along its edges
    for (let i = 0; i < 26; i++) {
      const t = r();
      const [x, y] = fp(t);
      const k = kAt(y);
      const s = (2 + r() * 4) * k;
      const side = r() < 0.5 ? -1 : 1;
      ctx.fillStyle = rgba(SNOW.lit, 0.8);
      ctx.beginPath();
      ctx.ellipse(x + side * (8 + t * 20) * 0.2, y + side * (6 + t * 14) * 0.5, s, s * 0.6, 0, 0, P2);
      ctx.fill();
    }
    // the yeti's footprints, out of the cave and away across the col
    for (let i = 0; i < 10; i++) {
      const t = 0.05 + (i / 9) * 0.9;
      const [x, y, a] = trail(t);
      const k = kAt(y) * 1.1;
      const side = i % 2 ? 1 : -1;
      footprint(ctx, x - Math.sin(a) * side * 13 * k, y + Math.cos(a) * side * 5 * k, k, a * 0.4, side > 0);
    }
  });
  // the col's skyline catching the moon
  ctx.strokeStyle = rgba(SNOW.lit, 0.55);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 4) ctx.lineTo(x, colTop(x) + 1);
  ctx.stroke();
}

// ——— the serac wall and the cave ———

/** The serac wall's towers: slabs of glacier split by vertical fractures, each broken off at its own height and
 * angle (x0, x1, the top's height at its left and right). */
const TOWERS: [number, number, number, number][] = [
  [-10, 70, 318, 302],
  [70, 196, 282, 300],
  [196, 262, 306, 316],
  [262, 378, 288, 322],
  [378, 452, 338, 352],
  [452, 512, 384, 404],
];
const SERAC: Pt[] = (() => {
  const pts: Pt[] = [[-10, YE.seracFoot + 4]];
  for (const [i, [x0, x1, tl, tr]] of TOWERS.entries()) {
    const w = x1 - x0;
    // a broken top: a step where a block calved off, a jagged edge
    pts.push([x0 + 2, tl + 6], [x0 + 6, tl], [x0 + w * 0.38, lerp(tl, tr, 0.38) - 3 - (i % 2) * 5], [x0 + w * 0.46, lerp(tl, tr, 0.46) + 7], [x0 + w * 0.7, lerp(tl, tr, 0.7) + 4], [x1 - 4, tr]);
  }
  pts.push([510, 440], [516, 500], [528, 600], [542, 690], [566, YE.seracFoot + 4]);
  return pts;
})();
const seracPath: PathFn = (c) => {
  c.beginPath();
  SERAC.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
};
const caveArch = (c: Ctx, grow = 0) => {
  const { x, floor, hw, h } = YE.cave;
  c.beginPath();
  c.moveTo(x - hw - grow, floor + 2);
  c.bezierCurveTo(x - hw - grow * 0.5, floor - h * 0.8, x - hw * 0.45, floor - h - grow, x + 6, floor - h - grow);
  c.bezierCurveTo(x + hw * 0.55, floor - h - grow, x + hw + grow * 0.5, floor - h * 0.7, x + hw + grow, floor + 2);
  c.closePath();
};
/** The arch's top edge at x (where the icicles hang). */
function archY(x: number): number {
  const { x: cx, floor, hw, h } = YE.cave;
  const u = (x - cx) / hw;
  return floor - h * Math.sqrt(Math.max(0, 1 - u * u)) ** 0.8;
}

/** An icicle hanging from (x, y): glassy, lit down its left side, a bead of light at the tip. */
export function icicle(c: Ctx, x: number, y: number, len: number, w: number, a = 1): void {
  c.save();
  c.globalAlpha = a;
  c.beginPath();
  c.moveTo(x - w / 2, y);
  c.quadraticCurveTo(x - w * 0.3, y + len * 0.5, x + w * 0.05, y + len);
  c.quadraticCurveTo(x + w * 0.35, y + len * 0.45, x + w / 2, y);
  c.closePath();
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#f6fcff');
  g.addColorStop(0.35, '#b8dcf8');
  g.addColorStop(1, '#3a68aa');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = rgba('#14284e', 0.8);
  c.lineWidth = Math.max(0.8, w * 0.12);
  c.stroke();
  c.strokeStyle = rgba('#ffffff', 0.85);
  c.lineWidth = Math.max(0.6, w * 0.12);
  c.beginPath();
  c.moveTo(x - w * 0.22, y + 2);
  c.quadraticCurveTo(x - w * 0.15, y + len * 0.5, x, y + len * 0.86);
  c.stroke();
  c.restore();
}

function serac(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 262, w: 580, h: YE.seracFoot - 258 };
  // its foot sunk in the col: occlusion where the ice meets the snow
  softly(ctx, { x: 0, y: 690, w: 620, h: 60 }, (g) => {
    g.fillStyle = 'rgba(16,26,64,0.45)';
    g.beginPath();
    g.ellipse(280, YE.seracFoot + 2, 330, 14, 0, 0, P2);
    g.fill();
  }, 0.25);
  seracPath(ctx);
  ctx.fillStyle = ICE.body;
  ctx.fill();
  within(ctx, seracPath, () => {
    vfill(ctx, 0, 262, 580, YE.seracFoot - 258, [[0, '#a8d0f4'], [0.3, '#6a9ad4'], [0.75, '#3a64a8'], [1, '#1c3672']]);
    surface(ctx, r, box, '#5a8ccc', { over: true, vary: 0.4, cells: 5, mottle: 0.3, strokes: 0.8, strokeAng: Math.PI / 2, strokeLen: 120, strokeW: 3, grain: 0.15, seed: 71 });
    // the towers: each slab's face lit from the top left, darker down and to the right, the fracture between it and
    // the next a dark cleft with the next slab's edge catching the light; big conchoidal scallops in the faces
    for (const [x0, x1, tl, tr] of TOWERS) {
      const top = Math.min(tl, tr);
      const w = x1 - x0;
      const lg = ctx.createLinearGradient(x0, 0, x1, 0);
      lg.addColorStop(0, 'rgba(226,242,255,0.22)');
      lg.addColorStop(0.5, 'rgba(226,242,255,0)');
      lg.addColorStop(0.8, 'rgba(10,28,80,0.14)');
      lg.addColorStop(0.9, 'rgba(10,28,80,0.5)');
      lg.addColorStop(1, 'rgba(6,18,60,0.62)');
      ctx.fillStyle = lg;
      ctx.fillRect(x0, top - 20, w, YE.seracFoot - top + 24);
      for (let i = 0; i < 2; i++) {
        const sx = x0 + w * (0.2 + r() * 0.6);
        const sy = top + 60 + r() * 300;
        const rw = w * (0.25 + r() * 0.2);
        const rh = 40 + r() * 70;
        const sg = ctx.createLinearGradient(sx - rw, sy - rh, sx + rw, sy + rh);
        sg.addColorStop(0, 'rgba(8,24,70,0.22)');
        sg.addColorStop(0.5, 'rgba(8,24,70,0)');
        sg.addColorStop(1, 'rgba(230,244,255,0.2)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.ellipse(sx, sy, rw, rh, 0, 0, P2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(236,248,255,0.16)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(sx, sy, rw, rh, 0, Math.PI * 0.75, Math.PI * 1.25);
        ctx.stroke();
      }
      if (x0 > 0) {
        // the fracture: a dark cleft, the lit edge of the slab beside it, wandering a little
        const path: Pt[] = [];
        for (let y = top - 10; y < YE.seracFoot + 4; y += 24) path.push([x0 + Math.sin(y / 37 + x0) * 4, y]);
        for (const [dx, col, lw] of [[2, '#081a48', 6], [-2.5, '#061436', 2.5], [4.5, '#dcf0ff', 1.6]] as const) {
          ctx.strokeStyle = rgba(col, col === '#dcf0ff' ? 0.55 : 0.6);
          ctx.lineWidth = lw;
          ctx.beginPath();
          path.forEach(([x, y], j) => (j ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y)));
          ctx.stroke();
        }
      }
      // a few horizontal fractures across the slab, each a dark line with a lit lip over it
      for (let i = 0; i < 1; i++) {
        const y = top + 90 + r() * 280;
        const ang = (r() - 0.5) * 0.15;
        ctx.strokeStyle = 'rgba(6,20,60,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + 4, y);
        ctx.lineTo(x1 - 4, y + w * ang);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(230,246,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0 + 4, y - 2);
        ctx.lineTo(x1 - 4, y - 2 + w * ang);
        ctx.stroke();
      }
    }
    // melt runnels down the face, each a lit edge beside a dark groove
    for (let i = 0; i < 26; i++) {
      const x = r() * 540;
      const y0 = 290 + r() * 120;
      const y1 = y0 + 120 + r() * 300;
      ctx.lineWidth = 2 + r() * 3;
      for (const [dx, col, a] of [[0, '#0e2458', 0.25], [-2.5, '#e8f6ff', 0.25]] as const) {
        ctx.strokeStyle = rgba(col, a);
        ctx.beginPath();
        ctx.moveTo(x + dx, y0);
        ctx.bezierCurveTo(x + dx + 6, lerp(y0, y1, 0.3), x + dx - 6, lerp(y0, y1, 0.7), x + dx + 2, y1);
        ctx.stroke();
      }
    }
    // strata: the glacier's annual layers, faint bands dipping to the right
    for (let i = 0; i < 9; i++) {
      const y = 330 + i * 44 + r() * 14;
      ctx.strokeStyle = rgba(i % 2 ? '#0c1e4c' : '#cfe6fa', 0.12);
      ctx.lineWidth = 3 + r() * 5;
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.bezierCurveTo(160, y + 10, 340, y + 4, 560, y + 30);
      ctx.stroke();
    }
    // the moon through the thin ice round the cave's mouth: a cold glow inside the ice
    caveArch(ctx, 30);
    ctx.save();
    ctx.clip();
    glowAt(ctx, YE.cave.x - 30, YE.cave.floor - YE.cave.h * 0.6, 200, ICE.glow, 0.2);
    ctx.restore();
    // darker towards the foot, in the col's shade
    vfill(ctx, 0, 560, 580, YE.seracFoot - 556, [[0, 'rgba(8,20,56,0)'], [1, 'rgba(8,20,56,0.4)']]);
    // the moon's light down the left of the face
    vfill(ctx, 0, 262, 580, 200, [[0, 'rgba(240,246,255,0.18)'], [1, 'rgba(240,246,255,0)']]);
  });
  // the cave: dark and deep, lit blue where the moon comes through the ice above it
  caveArch(ctx);
  const cg = ctx.createRadialGradient(YE.cave.x + 10, YE.cave.floor - 60, 10, YE.cave.x, YE.cave.floor - 80, YE.cave.h);
  cg.addColorStop(0, '#02040c');
  cg.addColorStop(0.55, '#06102c');
  cg.addColorStop(1, '#183a78');
  ctx.fillStyle = cg;
  ctx.fill();
  within(ctx, (c) => caveArch(c), () => {
    // the inside of the arch: its ice glowing round the rim, darker inwards
    ctx.strokeStyle = rgba('#4a9ae8', 0.45);
    ctx.lineWidth = 16;
    caveArch(ctx);
    ctx.stroke();
    ctx.strokeStyle = rgba('#a8e0ff', 0.35);
    ctx.lineWidth = 5;
    caveArch(ctx);
    ctx.stroke();
    // a deep blue light far back, where the glacier lets the moon in
    glowAt(ctx, YE.cave.x + 40, YE.cave.floor - 70, 70, '#2a6ad0', 0.35);
    // the cave floor: trampled snow running in, dim
    const { x, floor, hw } = YE.cave;
    ctx.fillStyle = 'rgba(70,90,150,0.6)';
    ctx.beginPath();
    ctx.moveTo(x - hw, floor + 2);
    ctx.quadraticCurveTo(x, floor - 30, x + hw, floor + 2);
    ctx.closePath();
    ctx.fill();
    // a gnawed ski and a pole in the gloom: the last skier who came this high
    ctx.save();
    ctx.translate(x + 50, floor - 18);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#5a2a30';
    ctx.fillRect(-48, -3, 82, 6);
    ctx.fillStyle = 'rgba(200,120,110,0.35)';
    ctx.fillRect(-48, -3, 82, 2);
    ctx.restore();
    ctx.strokeStyle = '#3a4258';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 60, floor - 4);
    ctx.lineTo(x - 30, floor - 68);
    ctx.stroke();
  });
  // the snow on top of each tower: a wind-packed shelf, lit on top, built out over the lee (right) edge into a little
  // overhanging lip, icicles under it
  const ir = rng(hashStr('yeti:icicles'));
  const lips: Pt[] = [];
  for (const [i, [x0, x1, tl, tr]] of TOWERS.entries()) {
    const w = x1 - x0;
    const th = 7 + (i % 3) * 3;
    const yAt2 = (u: number) => lerp(tl, tr, u) + (u > 0.38 && u < 0.7 ? 6 : 0);
    const cap: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x0 + 2, tl + 4);
      c.quadraticCurveTo(x0 + w * 0.15, tl - th, x0 + w * 0.4, yAt2(0.36) - th * 0.9);
      c.quadraticCurveTo(x0 + w * 0.6, yAt2(0.55) - th * 0.7, x1 - 2, tr - th * 0.6);
      // the lee lip curling over the edge
      c.quadraticCurveTo(x1 + 8, tr - th * 0.2, x1 + 5, tr + th * 0.8);
      c.quadraticCurveTo(x1 - 4, tr + th * 0.9, x1 - 8, tr + 3);
      c.quadraticCurveTo(x0 + w * 0.5, yAt2(0.5) + 3, x0 + 2, tl + 4);
      c.closePath();
    };
    ctx.save();
    ctx.translate(4, 7);
    cap(ctx);
    ctx.fillStyle = 'rgba(10,26,70,0.35)';
    ctx.fill();
    ctx.restore();
    cap(ctx);
    const sg = ctx.createLinearGradient(x0, tl - th, x1, tr + th);
    sg.addColorStop(0, SNOW.lit);
    sg.addColorStop(0.6, '#cad8f2');
    sg.addColorStop(1, SNOW.shade);
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // the shelf's lit crest
    ctx.strokeStyle = rgba('#ffffff', 0.8);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x0 + 4, tl + 1);
    ctx.quadraticCurveTo(x0 + w * 0.15, tl - th + 2, x0 + w * 0.4, yAt2(0.36) - th * 0.9 + 1);
    ctx.stroke();
    lips.push([x1 + 1, tr + th * 0.8]);
    for (let x = x0 + 8; x < x1 - 8; x += 9 + ir() * 12) lips.push([x, lerp(tl, tr, (x - x0) / w) + 5]);
  }
  // the ice's outline
  seracPath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  caveArch(ctx);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // the icicles: a fringe over the cave's mouth and along the cap's lip
  for (let x = YE.cave.x - YE.cave.hw + 14; x < YE.cave.x + YE.cave.hw - 10; x += 7 + ir() * 8) {
    const y = archY(x) - 2;
    const mid = 1 - Math.abs(x - YE.cave.x) / YE.cave.hw;
    icicle(ctx, x, y, 12 + ir() * 30 + mid * 44 * ir(), 5 + ir() * 6);
  }
  for (const [x, y] of lips) if (ir() < 0.6) icicle(ctx, x, y, 8 + ir() * 26, 4 + ir() * 5);
}

/** Where icicles hang (for the ones a stomp shakes loose): along the cave's mouth. */
export const ICICLE_SPOTS: Pt[] = Array.from({ length: 12 }, (_, i) => {
  const x = YE.cave.x - YE.cave.hw + 24 + (i / 11) * (YE.cave.hw * 2 - 48);
  return [x, archY(x) + 10] as Pt;
});

// ——— the buttress and its cornice ———

const BUTTRESS: Pt[] = [
  [W + 10, YE.buttressFoot + 6], [W + 10, 280], [1862, 296], [1806, 290], [1746, 318], [1690, 326], [1630, 348], [1590, 372], [1566, 420],
  [1552, 480], [1534, 560], [1516, 640], [1500, YE.buttressFoot], [1480, YE.buttressFoot + 6],
];
const buttressPath: PathFn = (c) => {
  c.beginPath();
  BUTTRESS.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
};

function buttress(ctx: Ctx, r: R): void {
  const box = { x: 1460, y: 270, w: W - 1460, h: YE.buttressFoot - 260 };
  softly(ctx, { x: 1400, y: 680, w: 520, h: 60 }, (g) => {
    g.fillStyle = 'rgba(14,20,50,0.5)';
    g.beginPath();
    g.ellipse(1700, YE.buttressFoot + 2, 260, 12, 0, 0, P2);
    g.fill();
  }, 0.25);
  buttressPath(ctx);
  ctx.fillStyle = '#2e3650';
  ctx.fill();
  within(ctx, buttressPath, () => {
    vfill(ctx, box.x, box.y, box.w, box.h, [[0, '#4a5470'], [0.5, '#2c3450'], [1, '#161c32']]);
    surface(ctx, r, box, '#363e5a', { over: true, vary: 0.4, cells: 5, mottle: 0.35, strokes: 0.6, strokeAng: 1.2, strokeLen: 90, strokeW: 3, grain: 0.3, grainKind: 'stone', seed: 83 });
    // granite in courses dipping gently to the right: each block lit on its top and its moon-facing left end, its
    // underside in shadow; vertical joints between blocks; snow lodged on the ledges along the courses
    const dip = 0.08;
    let y0 = 330;
    let row = 0;
    while (y0 < YE.buttressFoot) {
      const h = 26 + r() * 60;
      let x = 1480 - r() * 60;
      while (x < W + 20) {
        const w = 50 + r() * 170;
        const sk = (r() - 0.5) * 30;
        const solidJoint = r() < 0.6;
        const yy = y0 + (x - 1500) * dip + (row % 2 ? 4 : 0);
        const inset = (r() - 0.3) * 10;
        const blk: Pt[] = [[x + inset, yy + (r() - 0.5) * 6], [x + w, yy + w * dip - 4 + r() * 8], [x + w + sk, yy + w * dip + h], [x + inset + 3, yy + h]];
        ctx.beginPath();
        blk.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath();
        const bg = ctx.createLinearGradient(x, yy, x + w * 0.6, yy + h);
        bg.addColorStop(0, rgba('#8a98bc', 0.42));
        bg.addColorStop(0.35, rgba('#4a5474', 0.15));
        bg.addColorStop(1, rgba('#06080f', 0.4));
        ctx.fillStyle = bg;
        ctx.fill();
        // the joint on its right and the shadow under it
        ctx.strokeStyle = rgba('#04060c', 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (solidJoint) {
          ctx.moveTo(blk[1][0], blk[1][1]);
          ctx.quadraticCurveTo(blk[1][0] + sk * 0.2 + 6, (blk[1][1] + blk[2][1]) / 2, blk[2][0], blk[2][1]);
        } else ctx.moveTo(blk[2][0], blk[2][1]);
        ctx.lineTo(blk[3][0], blk[3][1]);
        ctx.stroke();
        // the lit top-left edge
        ctx.strokeStyle = rgba('#d4e0ff', 0.55);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(blk[3][0], blk[3][1] - 2);
        ctx.lineTo(blk[0][0], blk[0][1] + 1);
        ctx.lineTo(blk[1][0], blk[1][1] + 1);
        ctx.stroke();
        // snow on the ledge along its top, now and then
        if (r() < 0.45) {
          const [ax, ay] = blk[0];
          const [bx, by] = blk[1];
          const t = 3 + r() * 4;
          const u0 = r() * 0.3;
          const u1 = 0.6 + r() * 0.4;
          const sx0 = lerp(ax, bx, u0);
          const sy0 = lerp(ay, by, u0);
          const sx1 = lerp(ax, bx, u1);
          const sy1 = lerp(ay, by, u1);
          ctx.fillStyle = rgba('#04060c', 0.4);
          ctx.beginPath();
          ctx.moveTo(sx0, sy0 + 1);
          ctx.quadraticCurveTo((sx0 + sx1) / 2, (sy0 + sy1) / 2 + t * 2, sx1, sy1 + 1);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = SNOW.body;
          ctx.beginPath();
          ctx.moveTo(sx0 - 2, sy0 + 1);
          ctx.quadraticCurveTo((sx0 + sx1) / 2, (sy0 + sy1) / 2 - t, sx1 + 2, sy1 + 1);
          ctx.quadraticCurveTo((sx0 + sx1) / 2, (sy0 + sy1) / 2 + t * 0.9, sx0 - 2, sy0 + 1);
          ctx.fill();
          ctx.strokeStyle = rgba(SNOW.lit, 0.95);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(sx0 - 1, sy0);
          ctx.quadraticCurveTo((sx0 + sx1) / 2, (sy0 + sy1) / 2 - t, sx1 + 1, sy1);
          ctx.stroke();
        }
        x += w;
      }
      y0 += h;
      row++;
    }
    // the moon on the buttress's left flank, fading into the rock's shade to the right
    const mlg = ctx.createLinearGradient(1500, 0, 1760, 0);
    mlg.addColorStop(0, 'rgba(200,214,255,0.22)');
    mlg.addColorStop(1, 'rgba(200,214,255,0)');
    ctx.fillStyle = mlg;
    ctx.fillRect(1480, 280, 300, YE.buttressFoot - 270);
    // a gully of snow down from under the cornice (where the sluffs come down)
    const gg = ctx.createLinearGradient(1560, 0, 1620, 0);
    gg.addColorStop(0, rgba('#9cb0d8', 0.75));
    gg.addColorStop(0.6, rgba('#6a7eb4', 0.7));
    gg.addColorStop(1, rgba('#3a4a80', 0.6));
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(1562, 380);
    ctx.quadraticCurveTo(1574, 520, 1548, YE.buttressFoot + 4);
    ctx.lineTo(1626, YE.buttressFoot + 4);
    ctx.quadraticCurveTo(1606, 520, 1584, 380);
    ctx.closePath();
    ctx.fill();
    // a cone of fallen snow at its foot
    ctx.fillStyle = SNOW.body;
    ctx.beginPath();
    ctx.moveTo(1520, YE.buttressFoot + 6);
    ctx.quadraticCurveTo(1584, 630, 1660, YE.buttressFoot + 6);
    ctx.fill();
    ctx.fillStyle = rgba(SNOW.lit, 0.6);
    ctx.beginPath();
    ctx.moveTo(1524, YE.buttressFoot + 4);
    ctx.quadraticCurveTo(1570, 640, 1590, 650);
    ctx.quadraticCurveTo(1570, 670, 1540, YE.buttressFoot + 4);
    ctx.fill();
    // the night's chill in the lower rock
    vfill(ctx, box.x, 560, box.w, YE.buttressFoot - 554, [[0, 'rgba(6,8,24,0)'], [1, 'rgba(6,8,24,0.45)']]);
  });
  buttressPath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // the moon catching the buttress's left edge
  ctx.save();
  buttressPath(ctx);
  ctx.clip();
  ctx.strokeStyle = rgba('#c8d6ff', 0.5);
  ctx.lineWidth = 5;
  ctx.beginPath();
  BUTTRESS.slice(4, 13).forEach(([x, y], i) => (i ? ctx.lineTo(x + 2, y) : ctx.moveTo(x + 2, y)));
  ctx.stroke();
  ctx.restore();
  // the cornice: the wind's snow built out over the edge into a curling lip
  const { x: lx, y: ly } = YE.lip;
  const cornice: PathFn = (c) => {
    c.beginPath();
    c.moveTo(lx + 40, ly + 30);
    c.bezierCurveTo(lx + 6, ly + 26, lx - 16, ly + 8, lx - 4, ly - 4);
    c.bezierCurveTo(lx + 30, ly - 22, lx + 120, ly - 46, 1760, 292);
    c.bezierCurveTo(1820, 280, 1880, 274, W + 10, 272);
    c.lineTo(W + 10, 310);
    c.bezierCurveTo(1850, 310, 1720, 330, 1640, 360);
    c.bezierCurveTo(1600, 374, 1570, 378, lx + 40, ly + 30);
    c.closePath();
  };
  ctx.save();
  ctx.translate(6, 10);
  cornice(ctx);
  ctx.fillStyle = 'rgba(8,12,34,0.45)';
  ctx.fill();
  ctx.restore();
  cornice(ctx);
  const cgr = ctx.createLinearGradient(0, 250, 0, 380);
  cgr.addColorStop(0, SNOW.lit);
  cgr.addColorStop(0.5, '#c8d6f2');
  cgr.addColorStop(1, '#5a72b0');
  ctx.fillStyle = cgr;
  ctx.fill();
  within(ctx, cornice, () => {
    // the underside of the curl in deep blue shade, a sharp lit rim along its top
    ctx.fillStyle = rgba('#3a508e', 0.6);
    ctx.beginPath();
    ctx.ellipse(lx + 60, ly + 30, 90, 18, -0.2, 0, P2);
    ctx.fill();
    // wind ripples on its back
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = rgba('#7a90c8', 0.35);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(lx + 40 + i * 40, ly - 10 - i * 6);
      ctx.quadraticCurveTo(lx + 70 + i * 40, ly - 2 - i * 6, lx + 110 + i * 40, ly - 8 - i * 7);
      ctx.stroke();
    }
  });
  cornice(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.8);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(lx - 2, ly - 6);
  ctx.bezierCurveTo(lx + 30, ly - 24, lx + 120, ly - 48, 1760, 290);
  ctx.stroke();
  const ir = rng(hashStr('yeti:cornice-icicles'));
  for (let x = lx + 4; x < 1660; x += 8 + ir() * 10) {
    const u = (x - lx) / 130;
    const y = lerp(ly + 26, 362, clamp01(u)) + (x > lx + 130 ? (x - lx - 130) * 0.1 : 0);
    icicle(ctx, x, y, 10 + ir() * 34 * (1 - u * 0.4), 4 + ir() * 5);
  }
}

// ——— the climbers' pole, the flags ———

const FL_BOX = { x: 1300, y: 384, w: 384, h: 120 };
const FLAG_COLS = ['#2c5ab4', '#e8ecf2', '#c0302e', '#2a8a52', '#e0b030'];

/** The flag line at u (0 the pole … 1 the piton). */
function lineAt(u: number, ph: number): Pt {
  const A: Pt = [YE.pole.x + 2, YE.pole.top + 10];
  const B: Pt = [YE.piton.x, YE.piton.y];
  const sag = 34 + Math.sin(P2 * ph) * 3;
  return [lerp(A[0], B[0], u), lerp(A[1], B[1], u) + sag * 4 * u * (1 - u)];
}

/** The pole: a climbers' aluminium pole guyed into a cairn on the col. */
function pole(ctx: Ctx, r: R): void {
  const { x, base, top } = YE.pole;
  // the cairn: stones heaped round its foot, snow on their tops
  const stones: [number, number, number][] = [[-22, -6, 13], [4, -4, 15], [24, -6, 11], [-10, -20, 11], [12, -20, 12], [0, -32, 9]];
  ctx.fillStyle = 'rgba(14,20,50,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + 12, base + 2, 52, 8, 0, 0, P2);
  ctx.fill();
  for (const [dx, dy, s] of stones) {
    const sx = x + dx;
    const sy = base + dy;
    const g = ctx.createLinearGradient(sx - s, sy - s, sx + s, sy + s);
    g.addColorStop(0, '#7a849e');
    g.addColorStop(0.5, '#454c66');
    g.addColorStop(1, '#1c2036');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(sx, sy, s, s * 0.72, r() - 0.5, 0, P2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = rgba(SNOW.lit, 0.9);
    ctx.beginPath();
    ctx.ellipse(sx - 2, sy - s * 0.55, s * 0.6, s * 0.22, 0, 0, P2);
    ctx.fill();
  }
  // its moon shadow down the col
  ctx.strokeStyle = 'rgba(30,44,100,0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 4, base);
  ctx.lineTo(x + 150, base + 26);
  ctx.stroke();
  // guy line
  ctx.strokeStyle = rgba('#202838', 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, top + 40);
  ctx.lineTo(x - 60, base - 2);
  ctx.stroke();
  // the pole: lit down its left
  const pg = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
  pg.addColorStop(0, '#e4ecf8');
  pg.addColorStop(0.4, '#9aa6bc');
  pg.addColorStop(1, '#3a4258');
  ctx.fillStyle = INK;
  ctx.fillRect(x - 4.5, top - 2, 9, base - 30 - top + 4);
  ctx.fillStyle = pg;
  ctx.fillRect(x - 3, top, 6, base - 30 - top);
  // rime feathers grown on its windward side
  for (let y = top + 6; y < base - 40; y += 6 + r() * 6) {
    ctx.strokeStyle = rgba('#f0f6ff', 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x - 7 - r() * 5, y - 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#c8d0e0';
  ctx.beginPath();
  ctx.arc(x, top - 2, 4, 0, P2);
  ctx.fill();
  // the piton in the rock, its ring
  ctx.strokeStyle = '#8a92a8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(YE.piton.x + 2, YE.piton.y, 3.5, 0, P2);
  ctx.stroke();
}

/** The flags at phase ph (0…1 loops), in screen space: the prayer flags on their line, the expedition flag on the
 * pole, cracking in the wind from the left. gust 0…1 drives them harder. */
function flags(c: Ctx, ph: number, gust = 0.3): void {
  const T = P2 * ph;
  // the line
  c.strokeStyle = '#1a1e2c';
  c.lineWidth = 1.4;
  c.beginPath();
  for (let i = 0; i <= 20; i++) {
    const [x, y] = lineAt(i / 20, ph);
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.stroke();
  // the prayer flags: each hung from the line by its top edge, blown out to the right, rippling
  const N = 9;
  for (let i = 0; i < N; i++) {
    const u = (i + 0.7) / (N + 0.4);
    const [x0, y0] = lineAt(u - 0.03, ph);
    const [x1, y1] = lineAt(u + 0.03, ph);
    const w = x1 - x0;
    const h = 28;
    const base = mix(FLAG_COLS[i % 5], '#2a3460', 0.3);
    for (let j = 0; j < h; j += 2) {
      const v = j / h;
      const wave = Math.sin(T * 2 + i * 1.3 - v * 4);
      const dx = v ** 1.2 * (6 + gust * 10 + wave * (3 + gust * 4));
      const sl = Math.cos(T * 2 + i * 1.3 - v * 4);
      const yy = lerp(y0, y1, 0.5) + j - v * gust * 6;
      const sq = 1 - Math.abs(sl) * 0.12;
      c.fillStyle = sl > 0 ? shade(base, sl * 0.25) : mix(base, '#0a1028', -sl * 0.35);
      c.fillRect(x0 + dx + (w * (1 - sq)) / 2, yy, w * sq, 2.4);
      // the printed wind-horse in the middle
      if (v > 0.3 && v < 0.7) {
        c.fillStyle = rgba('#141828', 0.3);
        c.fillRect(x0 + dx + w * 0.3, yy, w * 0.4 * sq, 2.2);
      }
    }
    // frayed bottom edge
    c.strokeStyle = rgba('#0a1028', 0.5);
    c.lineWidth = 0.8;
    c.strokeRect(x0 + 0.5, Math.min(y0, y1) + 0.5, w - 1, 1);
  }
  // the expedition flag on the pole: hoisted at the pole, flying out to the right, torn at the fly
  const { x: px, top } = YE.pole;
  const L = 70;
  const h = 34;
  for (let k = 0; k < L; k += 2) {
    const v = k / L;
    const ph2 = T * 2 - v * 5;
    const off = Math.sin(ph2) * (3 + v * (6 + gust * 6)) * v;
    const sl = Math.cos(ph2);
    const tear = v > 0.6 ? (0.55 + 0.45 * Math.sin(k * 0.32) * Math.sin(k * 0.13 + 1)) * (v - 0.6) * 60 : 0;
    const top0 = top + 6 + off + v * (4 - gust * 3) + tear * 0.4;
    const len = h - v * 6 - tear;
    c.fillStyle = sl > 0 ? shade('#b42628', sl * 0.25) : mix('#b42628', '#200614', -sl * 0.45);
    c.fillRect(px + 3 + k, top0, 2.4, Math.max(2, len));
    // frayed threads trailing off the torn fly
    if (v > 0.8 && k % 6 === 0) {
      c.strokeStyle = rgba('#8a1c20', 0.8);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(px + 4 + k, top0 + len);
      c.lineTo(px + 10 + k + gust * 4, top0 + len + 4 + Math.sin(T * 3 + k) * 3);
      c.stroke();
    }
  }
  c.strokeStyle = rgba(INK, 0.6);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(px + 3, top + 6);
  c.lineTo(px + 3, top + 6 + h);
  c.stroke();
}

// ——— the props on the col ———

/** A packed snowball: lit on its top left, blue underneath, lumps and a few rolled-in grits. */
function snowball(ctx: Ctx, r: R, x: number, y: number, rad: number): void {
  const g = ctx.createRadialGradient(x - rad * 0.4, y - rad * 0.45, rad * 0.1, x, y, rad);
  g.addColorStop(0, '#fbfdff');
  g.addColorStop(0.55, '#c6d4f0');
  g.addColorStop(1, '#5a70aa');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, P2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, P2);
  ctx.clip();
  for (let i = 0; i < rad * 0.6; i++) {
    const a = r() * P2;
    const d = r() * rad * 0.9;
    const s = rad * (0.08 + r() * 0.12);
    const lx = x + Math.cos(a) * d;
    const ly = y + Math.sin(a) * d;
    ctx.fillStyle = rgba('#3a5090', 0.22);
    ctx.beginPath();
    ctx.arc(lx + s * 0.3, ly + s * 0.4, s, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.4);
    ctx.beginPath();
    ctx.arc(lx - s * 0.2, ly - s * 0.25, s * 0.7, 0, P2);
    ctx.fill();
  }
  // bounce from the snow below
  ctx.fillStyle = rgba('#a8bce8', 0.25);
  ctx.beginPath();
  ctx.ellipse(x, y + rad, rad, rad * 0.4, 0, 0, P2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.4, rad * 0.07);
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, P2);
  ctx.stroke();
}

function bigBall(ctx: Ctx, r: R): void {
  const { x, y, r: br } = YE.ball;
  // its shadow down to the right on the snow
  softly(ctx, { x: x - br * 1.4, y: y + br * 0.3, w: br * 4.6, h: br * 1.3 }, (g) => {
    g.fillStyle = 'rgba(16,26,70,0.6)';
    g.beginPath();
    g.ellipse(x + br * 0.7, y + br * 0.9, br * 1.6, br * 0.24, 0.04, 0, P2);
    g.fill();
  }, 0.3);
  // a rolled ball of packed snow: a lumpy outline where it picked up clods as it came down, opaque, lit from the top
  // left, its lower right in blue shade with the snow's light bounced into its belly
  const pts: Pt[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * P2;
    const lump = 1 + (r() - 0.5) * 0.07 + Math.max(0, Math.sin(a * 5 + 1)) * 0.03;
    pts.push([x + Math.cos(a) * br * lump, y + Math.sin(a) * br * lump * 0.97]);
  }
  const path: PathFn = (c) => {
    c.beginPath();
    pts.forEach(([px, py], i) => {
      const [nx, ny] = pts[(i + 1) % pts.length];
      if (!i) c.moveTo((px + nx) / 2, (py + ny) / 2);
      else c.quadraticCurveTo(px, py, (px + nx) / 2, (py + ny) / 2);
    });
    const [px, py] = pts[0];
    const [nx, ny] = pts[1];
    c.quadraticCurveTo(px, py, (px + nx) / 2, (py + ny) / 2);
    c.closePath();
  };
  path(ctx);
  const g = ctx.createRadialGradient(x - br * 0.45, y - br * 0.5, br * 0.1, x - br * 0.1, y - br * 0.1, br * 1.15);
  g.addColorStop(0, '#fbfdff');
  g.addColorStop(0.45, '#d6e0f4');
  g.addColorStop(0.8, '#8a9cd0');
  g.addColorStop(1, '#4a5c98');
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, path, () => {
    // clods stuck to it, each lit on top, with a little shadow under it
    for (let i = 0; i < 14; i++) {
      const a = r() * P2;
      const d = br * Math.sqrt(r()) * 0.9;
      const cx = x + Math.cos(a) * d;
      const cy = y + Math.sin(a) * d;
      const s = br * (0.05 + r() * 0.07);
      const lit = 1 - ((cx - x) / br + (cy - y) / br + 1.4) / 2.8;
      ctx.fillStyle = rgba('#24346a', 0.3);
      ctx.beginPath();
      ctx.ellipse(cx + s * 0.4, cy + s * 0.5, s, s * 0.8, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(mix('#7a8cc4', '#ffffff', clamp01(lit)), 0.95);
      ctx.beginPath();
      ctx.ellipse(cx, cy, s, s * 0.8, 0, 0, P2);
      ctx.fill();
    }
    // a few stones it rolled up on the way down
    for (let i = 0; i < 3; i++) {
      const a = 0.3 + r() * 2.2;
      const d = br * (0.4 + r() * 0.4);
      ctx.fillStyle = '#2c3248';
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 3 + r() * 2.5, 2.2 + r() * 1.6, r(), 0, P2);
      ctx.fill();
    }
    // the snow's light bounced into its belly
    ctx.fillStyle = rgba('#a8bce8', 0.3);
    ctx.beginPath();
    ctx.ellipse(x, y + br * 1.05, br * 0.9, br * 0.35, 0, 0, P2);
    ctx.fill();
  });
  path(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // sunk into the snow: a rim of it heaped at its foot, lit on the far side
  ctx.fillStyle = SNOW.body;
  ctx.beginPath();
  ctx.ellipse(x + 4, y + br * 0.94, br * 1.02, br * 0.14, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba(SNOW.lit, 0.85);
  ctx.beginPath();
  ctx.ellipse(x - br * 0.3, y + br * 0.89, br * 0.6, br * 0.07, 0, 0, P2);
  ctx.fill();
}

/** The yeti's ammunition: snowballs packed and stacked at the cave's door. */
function pile(ctx: Ctx, r: R): void {
  const { x, y } = YE.pile;
  const rad = 15;
  softly(ctx, { x: x - 90, y: y - 20, w: 220, h: 40 }, (g) => {
    g.fillStyle = 'rgba(14,24,64,0.55)';
    g.beginPath();
    g.ellipse(x + 14, y + 2, 84, 9, 0, 0, P2);
    g.fill();
  }, 0.3);
  const rows = [4, 3, 2, 1];
  rows.forEach((n, row) => {
    for (let i = 0; i < n; i++) {
      const bx = x + (i - (n - 1) / 2) * rad * 1.9 + (r() - 0.5) * 3;
      const by = y - rad - row * rad * 1.62 + (r() - 0.5) * 2;
      snowball(ctx, r, bx, by, rad * (0.92 + r() * 0.16));
    }
  });
  // one rolled off to the side
  snowball(ctx, r, x + 92, y - 11, 12);
}

/** The near snow at the table's back edge: a wind-scoured lip. */
function bank(ctx: Ctx, r: R): void {
  const top = (x: number) => TY - 10 - Math.max(0, Math.sin(x / 140 + 1.3)) * 8 - wave1(x, 9) * 3;
  const path: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-4, TY + 4);
    for (let x = -4; x <= W + 4; x += 6) c.lineTo(x, top(x));
    c.lineTo(W + 4, TY + 4);
    c.closePath();
  };
  path(ctx);
  const g = ctx.createLinearGradient(0, TY - 30, 0, TY + 4);
  g.addColorStop(0, SNOW.lit);
  g.addColorStop(0.5, '#c0d0ee');
  g.addColorStop(1, '#7a90c4');
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, path, () => {
    for (let i = 0; i < 40; i++) {
      const x = r() * W;
      ctx.fillStyle = rgba('#5a70b0', 0.25);
      ctx.beginPath();
      ctx.ellipse(x, TY - 2, 20 + r() * 40, 2 + r() * 2, 0, 0, P2);
      ctx.fill();
    }
  });
  ctx.strokeStyle = rgba('#ffffff', 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, top(x) + 1);
  ctx.stroke();
}

/** The SUMMIT sign from the slopes below, frosted and half buried, a hand-painted warning nailed under it. */
function sign(ctx: Ctx, r: R): void {
  const { x, y } = YE.sign;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.06);
  // the post, its shadow on the drift
  ctx.fillStyle = 'rgba(14,22,60,0.4)';
  ctx.beginPath();
  ctx.ellipse(30, -4, 60, 7, 0.1, 0, P2);
  ctx.fill();
  const pg = ctx.createLinearGradient(-7, 0, 7, 0);
  pg.addColorStop(0, '#8a7a6a');
  pg.addColorStop(0.5, '#5a4a40');
  pg.addColorStop(1, '#2a2028');
  ctx.fillStyle = INK;
  ctx.fillRect(-8, -200, 16, 200);
  ctx.fillStyle = pg;
  ctx.fillRect(-6.5, -198, 13, 198);
  const board = (bx: number, by: number, w: number, h: number, col: string, text: string, tcol: string, arrow: boolean, rot: number) => {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(rot);
    ctx.beginPath();
    if (arrow) {
      ctx.moveTo(-w / 2 - 22, 0);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
    } else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    bg.addColorStop(0, shade(col, 0.18));
    bg.addColorStop(1, shade(col, -0.25));
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.fillStyle = tcol;
    ctx.font = `bold ${Math.round(h * 0.56)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, arrow ? -6 : 0, 1);
    // rime on its windward (left) edge, snow on its top
    for (let yy = -h / 2 + 2; yy < h / 2; yy += 3) {
      ctx.strokeStyle = rgba('#f0f6ff', 0.85);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(arrow ? -w / 2 - 22 * (1 - Math.abs(yy) / (h / 2)) : -w / 2, yy);
      ctx.lineTo((arrow ? -w / 2 - 22 * (1 - Math.abs(yy) / (h / 2)) : -w / 2) - 3 - r() * 5, yy - 1);
      ctx.stroke();
    }
    ctx.fillStyle = SNOW.lit;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -h / 2);
    ctx.quadraticCurveTo(0, -h / 2 - 9, w / 2 + 2, -h / 2 - 1);
    ctx.quadraticCurveTo(0, -h / 2 + 3, -w / 2 + 2, -h / 2);
    ctx.fill();
    ctx.restore();
  };
  board(-12, -176, 120, 30, '#3a3a3e', 'SUMMIT', '#f0f0ec', true, -0.03);
  board(4, -120, 104, 44, '#d8d0b8', 'YETI!', '#b02020', false, 0.08);
  // a nail and a claw-scratch across the warning
  ctx.strokeStyle = rgba('#2a1a1a', 0.6);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-30 + i * 8, -140);
    ctx.lineTo(10 + i * 8, -102);
    ctx.stroke();
  }
  // the drift it's buried in
  ctx.fillStyle = SNOW.body;
  ctx.beginPath();
  ctx.moveTo(-90, 6);
  ctx.quadraticCurveTo(-20, -46, 40, -30);
  ctx.quadraticCurveTo(100, -20, 140, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(SNOW.lit, 0.9);
  ctx.beginPath();
  ctx.moveTo(-88, 4);
  ctx.quadraticCurveTo(-24, -48, 30, -34);
  ctx.quadraticCurveTo(-10, -28, -88, 4);
  ctx.fill();
  ctx.restore();
}

// ——— the table: a slab of glacier ice ———

function table(ctx: Ctx, r: R): void {
  const f = YE.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#3a5a94'], [0.4, '#5a84bc'], [1, '#7aa2d0']]);
  surface(ctx, r, box, '#6a92c4', { over: true, vary: 0.45, cells: 7, mottle: 0.35, strokes: 0.4, strokeAng: 0, strokeLen: 320, strokeW: 3, grain: 0.12, seed: 61 });
  // the ice's depth: darker blue clouds deep inside it, paler where it's full of tiny bubbles
  lay(ctx, drift('#b0d4f4', '#1a3468', 6, 63, 256, 64), box, 0.22);
  lay(ctx, noiseMask(12, 65, { cover: 0.35, soft: 0.6, col: '#e8f4ff', w: 320, h: 64 }), box, 0.14);
  // cracks running into it in perspective: a white fracture plane, a dark line beside it
  for (let i = 0; i < 12; i++) {
    let X = (r() - 0.5) * 4.4;
    let z = ZB - r() * 0.2;
    const pts: Pt[] = [[xAt(X, z), yAt(z)]];
    const zf = zFront(f);
    for (let k = 0; k < 8 && z > zf; k++) {
      X += (r() - 0.5) * 0.28;
      z -= 0.06 + r() * 0.12;
      pts.push([xAt(X, z), yAt(z)]);
    }
    for (const [dy, col, a, w] of [[1.2, '#0c1c44', 0.3, 1.6], [0, '#f0f8ff', 0.32, 1.2]] as const) {
      ctx.strokeStyle = rgba(col, a);
      ctx.lineWidth = w;
      ctx.beginPath();
      pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy)));
      ctx.stroke();
    }
  }
  // trapped bubbles: strings of little beads, lit rims, a dark core
  for (let i = 0; i < 70; i++) {
    const X = (r() - 0.5) * 4.6;
    const z = ZB - r() * (ZB - zFront(f));
    const x = xAt(X, z);
    const y = yAt(z);
    const k = (y - TY) / (f - TY) * 0.8 + 0.3;
    const n = 1 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) {
      const s = (1.2 + r() * 2.6) * k;
      const bx = x + j * 5 * k;
      const by = y - j * 2 * k;
      ctx.strokeStyle = rgba('#e8f6ff', 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(bx, by, s, s * 0.7, 0, 0, P2);
      ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', 0.5);
      ctx.fillRect(bx - s * 0.4, by - s * 0.4, 1, 1);
    }
  }
  // frost and snow dust along the back edge, thinning towards us
  vfill(ctx, 0, TY, W, 22, [[0, rgba('#f2f6fc', 0.55)], [1, rgba('#e4ecf8', 0)]]);
  softly(ctx, { x: 0, y: TY, w: W, h: 50 }, (g) => {
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rgba('#f4f8ff', 0.2 + r() * 0.2);
      g.beginPath();
      g.ellipse(r() * W, TY + 4 + r() ** 2 * 20, 30 + r() * 80, 3 + r() * 3, 0, 0, P2);
      g.fill();
    }
  }, 0.25);
  // the moon's sheen on the polished ice, on the left; the aurora's green faint in it
  const sh = ctx.createRadialGradient(560, 860, 0, 560, 860, 520);
  sh.addColorStop(0, 'rgba(220,232,255,0.14)');
  sh.addColorStop(1, 'rgba(220,232,255,0)');
  ctx.fillStyle = sh;
  ctx.save();
  ctx.translate(560, 860);
  ctx.scale(1, 0.3);
  ctx.translate(-560, -860);
  ctx.fillRect(0, 300, 1200, 1100);
  ctx.restore();
  vfill(ctx, 0, TY + 10, W, 70, [[0, 'rgba(60,255,170,0)'], [0.5, 'rgba(60,255,170,0.05)'], [1, 'rgba(60,255,170,0)']]);
  // cool on the right, out of the moon
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(230,240,255,0.06)');
  lg.addColorStop(0.6, 'rgba(10,20,60,0)');
  lg.addColorStop(1, 'rgba(10,20,60,0.18)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, TY, W, f - TY);
  ctx.restore();
  tableFalloff(ctx, f, 0.32, '#081030');
  tableSeam(ctx, 0.4, '#16244c', false);
  // the slab's front: thick clear ice, bubbles, icicles hanging off its edge
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#8ab8e4'], [0.3, '#4a7ab8'], [1, '#18305e']]);
  lay(ctx, noiseMask(10, 69, { cover: 0.4, soft: 0.5, col: '#cfe8ff', w: 320, h: 16 }), { x: 0, y: f, w: W, h: 40 }, 0.3);
  ctx.restore();
  ctx.fillStyle = rgba('#f4faff', 0.7);
  ctx.fillRect(0, f - 2, W, 2.5);
  ctx.fillStyle = rgba('#081430', 0.8);
  ctx.fillRect(0, f, W, 1.6);
  const ir = rng(hashStr('yeti:table-icicles'));
  for (let x = 12; x < W; x += 30 + ir() * 40) icicle(ctx, x, f + 1, 8 + ir() * 26, 4 + ir() * 5, 0.9);
}

// ——— the grade and shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#d4e2ff', 0.05, { warm: '#ffe4bc', cool: '#3a5ab8', a: 0.2 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.1, '#060c22', 80, 600);
  vignetteAll(ctx, 0.55, '#02040e');
}

// ——— the stack ———

const AURORA_BOX = { x: 0, y: 0, w: W, h: YE.auroraH };
const HORN_TOP_BOX = { x: 820, y: 70, w: 560, h: YE.auroraH - 70 };
const HORN_BOX = { x: 0, y: YE.auroraH, w: W, h: YE.hornFoot + 8 - YE.auroraH };
const PLUME_BOX = { x: PEAK[0] - 10, y: PEAK[1] - 70, w: PLW + 20, h: PLH + 20 };

export const SUMMIT: SceneSpec = {
  id: 'yeti',
  info: {
    name: 'Summit',
    subtitle: 'Boss: THE YETI SKI BOOT',
    ambient: [],
    // (the aurora, the spindrift and the flags are the live layer's)
    glows: [],
    light: '#c0d4f8',
    tableTint: '#e6eefc',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: YE.hornFoot }, draw: sky },
    { id: 'auroraStill', box: AURORA_BOX, stillOnly: true, draw: (c) => auroraStill(c) },
    { id: 'aurora', box: AURORA_BOX, motion: 'slot', draw: () => {} },
    { id: 'far', box: { x: 0, y: 420, w: W, h: YE.farFoot + 30 - 420 }, draw: farScene },
    { id: 'hornTop', box: HORN_TOP_BOX, draw: (c) => horn(c, HORN_TOP_BOX) },
    { id: 'horn', box: HORN_BOX, draw: (c) => horn(c, HORN_BOX) },
    { id: 'plumeStill', box: PLUME_BOX, stillOnly: true, draw: (c) => {
      c.translate(PEAK[0] - PL_SRC[0] + 6, PEAK[1] - PL_SRC[1] + 2);
      plumeFrame(c, 0.3);
    } },
    { id: 'col', box: { x: 0, y: 570, w: W, h: TY + 10 - 570 }, draw: col },
    { id: 'serac', box: { x: 0, y: 252, w: 640, h: YE.seracFoot + 30 - 250 }, draw: serac },
    { id: 'buttress', box: { x: 1390, y: 262, w: W - 1390, h: YE.buttressFoot + 30 - 262 }, draw: buttress },
    { id: 'pole', box: { x: 1270, y: YE.pole.top - 10, w: 230, h: YE.pole.base + 16 - YE.pole.top }, draw: pole },
    { id: 'flagsStill', box: FL_BOX, stillOnly: true, draw: (c) => flags(c, 0.2) },
    { id: 'flags', box: FL_BOX, motion: 'slot', draw: () => {} },
    { id: 'pourStill', box: { x: YE.lip.x - PO_SRC[0], y: YE.lip.y, w: POW, h: POH }, stillOnly: true, draw: (c) => {
      c.translate(YE.lip.x - PO_SRC[0], YE.lip.y);
      c.globalAlpha = 0.32;
      pourFrame(c, 0.4);
    } },
    { id: 'ball', box: { x: YE.ball.x - 90, y: YE.ball.y - 72, w: 300, h: 150 }, draw: bigBall },
    { id: 'pile', box: { x: YE.pile.x - 100, y: YE.pile.y - 80, w: 240, h: 100 }, draw: pile },
    { id: 'bank', box: { x: 0, y: TY - 40, w: W, h: 46 }, draw: bank },
    { id: 'sign', box: { x: YE.sign.x - 110, y: YE.sign.y - 240, w: W - YE.sign.x + 110, h: 260 }, draw: sign },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** An icicle shard (frame i of a few), half px square: a broken spike, lit down one side. */
function shardFrame(c: Ctx, half: number, i: number): void {
  const rr = rng(hashStr('yeti:shard' + i));
  const len = half * (0.9 + rr() * 0.5);
  icicle(c, half, half - len / 2, len, 4 + rr() * 4);
}

registerKitScene(SUMMIT, (k: KitLive) => {
  const top = k.slot('top');
  const auroraSlot = k.slot('aurora');
  const flagSlot = k.slot('flags');

  // ——— hero: the aurora ———
  const RA = 0.25;
  const AN = 12;
  const aKey = sheet(k, 'ye_aurora', W * RA, YE.auroraH * RA, AN, (c, ph) => {
    c.scale(RA, RA);
    aurora(c, ph);
  });
  const aur = new Loop(k, aKey, AN, 0, 0, { into: auroraSlot, origin: [0, 0], scale: 1 / RA, add: true, fps: 1.1 });
  const aurGlow = k.glow(520, 260, 700, 0x30ffa0, 0.06, { into: auroraSlot, sy: 0.4 });

  // ——— hero: the spindrift ———
  const RP = 0.5;
  const PN = 10;
  const plKey = sheet(k, 'ye_plume', PLW * RP, PLH * RP, PN, (c, ph) => {
    c.scale(RP, RP);
    plumeFrame(c, ph);
  });
  const plume = new Loop(k, plKey, PN, PEAK[0] + 6, PEAK[1] + 2, { into: top, origin: [PL_SRC[0] / PLW, PL_SRC[1] / PLH], scale: 1 / RP, fps: 1.6 });
  const poKey = sheet(k, 'ye_pour', POW * RP, POH * RP, PN, (c, ph) => {
    c.scale(RP, RP);
    pourFrame(c, ph);
  });
  const pour = new Loop(k, poKey, PN, YE.lip.x, YE.lip.y, { into: top, origin: [PO_SRC[0] / POW, PO_SRC[1] / POH], scale: 1 / RP, fps: 4 });
  let sluff = 0;

  // snow: falling in two depths on the wind, streaming along the col in the gusts
  const T = 256;
  const snowFar = k.sc.add.tileSprite(0, 0, W, 1080, k.tex('ye_snow0', T, T, (c) => snowTile(c, T, 0))).setOrigin(0, 0).setAlpha(0.3);
  const snowNear = k.sc.add.tileSprite(0, 0, W, 1080, k.tex('ye_snow1', T, T, (c) => snowTile(c, T, 1))).setOrigin(0, 0).setAlpha(0.16);
  // spindrift streaming along the open col in the gusts: streaks of snow skimming the crust, smaller far off
  const drift = new Parts(k, { frame: 'soft', into: top, max: 90 });
  const driftRate = new Rate();
  const skim = () => {
    const x = 520 + crand() * 900;
    const y = 594 + crand() ** 0.7 * 164;
    const kk = kAt(y);
    const vx = (160 + gust * 320) * kk;
    drift.spawn({ x, y, vx, vy: -4 * kk, life: Math.max(0.3, Math.min(1.4, (1490 - x) / vx)), r0: 3 * kk, r1: 6 * kk, a: 0.3, tint: 0xe8f0ff, streak: 0.05, fade: 0.35 });
  };
  top.add([snowFar, snowNear]);
  let gust = 0.3;

  // stomps: powder, clumps and icicle shards
  const powder = new Parts(k, { frame: 'puff', into: top, max: 60 });
  const motes = new Parts(k, { frame: 'mote', into: top, max: 160 });
  const shardKey = sheet(k, 'ye_shard', 32, 32, 4, (c, _p, i) => shardFrame(c, 16, i));
  const shards = new Parts(k, { frame: 'mote', sheet: { key: shardKey, n: 4, half: 16 }, into: top, max: 30 });
  const glints = new Parts(k, { frame: 'spark', add: true, into: top, max: 30 });
  const glintRate = new Rate();
  const puff = (x: number, y: number, n: number, big = 1) => {
    for (let i = 0; i < n; i++) powder.spawn({ x: x + (crand() - 0.5) * 40 * big, y: y - crand() * 10, vx: (crand() - 0.3) * 80 * big, vy: -20 - crand() * 50 * big, life: 1.4 + crand(), r0: 12 * big, r1: (40 + crand() * 30) * big, a: 0.35, tint: 0xdce6fa, drag: 1.2, fade: 0.15 });
  };
  const burst = (x: number, y: number) => {
    for (let i = 0; i < 7; i++) motes.spawn({ x, y, vx: (crand() - 0.5) * 140, vy: -60 - crand() * 120, life: 0.6, r0: 3, r1: 1.5, a: 0.9, tint: 0xe4f2ff, grav: 700, fade: 0.05 });
    glints.spawn({ x, y: y - 4, life: 0.25, r0: 10, r1: 2, a: 0.8, tint: 0xd8f0ff, fade: 0.2 });
  };
  const dropIcicle = (sx: number, sy: number, floor: number) => {
    shards.spawn({ x: sx, y: sy, vx: (crand() - 0.5) * 20, vy: 10, life: 2, r0: 9 + crand() * 5, a: 1, tint: 0xffffff, grav: 1400, floor, onFloor: (x, y) => burst(x, y), spin: (crand() - 0.5) * 2 });
  };

  // ——— hero: the flags ———
  const FN = 10;
  const flKey = sheet(k, 'ye_flags', FL_BOX.w, FL_BOX.h, FN, (c, ph) => {
    c.translate(-FL_BOX.x, -FL_BOX.y);
    flags(c, ph, 0.3);
  });
  const flagLoop = new Loop(k, flKey, FN, FL_BOX.x, FL_BOX.y, { into: flagSlot, origin: [0, 0], fps: 7 });
  let whip = 0;

  return {
    impact(x, _y, p) {
      whip = Math.max(whip, 0.5 + p);
      gust = Math.min(1.6, gust + 0.6 * p);
      // a sluff breaks off the cornice: a heavy pour, powder boiling up at the foot, clumps bouncing down
      if (p > 0.3) {
        sluff = Math.max(sluff, 0.6 + p * 0.6);
        k.sc.time.delayedCall(450, () => puff(1580, YE.buttressFoot - 10, 5 + p * 5, 1.2));
        for (let i = 0; i < 4 * p; i++) motes.spawn({ x: YE.lip.x + crand() * 50, y: YE.lip.y + 20, vx: 10 + crand() * 40, vy: 30, life: 2, r0: 5 + crand() * 3, a: 0.95, tint: 0xeef4ff, grav: 900, floor: YE.buttressFoot - crand() * 10, bounce: 0.3 });
      }
      // icicles shaken loose: off the cave's mouth if the stomp is on the left, the cornice if on the right
      const n = Math.round(1 + p * 3);
      for (let i = 0; i < n; i++) {
        if (x < 960 || crand() < 0.3) {
          const [sx, sy] = ICICLE_SPOTS[Math.floor(crand() * ICICLE_SPOTS.length)];
          dropIcicle(sx, sy, YE.cave.floor - 2);
        } else dropIcicle(YE.lip.x + 10 + crand() * 110, YE.lip.y + 28, YE.buttressFoot - 6);
      }
      // powder kicked up off the near snow where it landed
      puff(Math.max(40, Math.min(W - 40, x)), TY - 6, 3 + p * 4, 0.8);
    },
    update(dt, t) {
      const cm = calm();
      // the aurora: slow folding, its brightness breathing
      aur.step(dt, cm);
      const br = 0.85 + 0.15 * Math.sin(t * 0.21) * Math.sin(t * 0.13 + 1);
      aur.alpha = br;
      aurGlow.setAlpha(0.05 * br);

      // the wind: gusting, a stomp sets everything going
      const base = 0.35 + 0.25 * Math.max(0, Math.sin(t * 0.23) * Math.sin(t * 0.61 + 2));
      gust += (base - gust) * Math.min(1, dt * 0.8);
      plume.step(dt, (0.8 + gust) * cm);
      plume.alpha = 0.75 + gust * 0.25;
      sluff = Math.max(0, sluff - dt * 0.5);
      pour.step(dt, (1 + sluff * 1.5) * cm);
      pour.alpha = Math.min(1, 0.22 + gust * 0.2 + sluff * 0.8);
      pour.each((im) => im.setScale((1 / RP) * (1 + sluff * 0.5)));
      snowFar.tilePositionY -= 40 * dt * cm;
      snowFar.tilePositionX -= (40 + gust * 90) * dt * cm;
      snowNear.tilePositionY -= 90 * dt * cm;
      snowNear.tilePositionX -= (90 + gust * 220) * dt * cm;
      driftRate.tick((6 + gust * 30) * cm, dt, skim);
      drift.update(dt);

      // the flags
      whip = Math.max(0, whip - dt * 0.6);
      flagLoop.step(dt, (0.8 + gust * 0.8 + whip * 1.6) * cm);

      // moonlight glinting off the ice and the crust
      glintRate.tick(1.6 * cm, dt, () => {
        const pick = crand();
        const [gx, gy] = pick < 0.4 ? [40 + crand() * 480, 300 + crand() * 400] : pick < 0.8 ? [crand() * W, 600 + crand() * 150] : [crand() * W, TY + 10 + crand() * 60];
        glints.spawn({ x: gx, y: gy, life: 0.3 + crand() * 0.3, r0: 6 + crand() * 5, r1: 1, a: 0.7, tint: 0xd8ecff, fade: 0.4 });
      });
      powder.update(dt);
      motes.update(dt);
      shards.update(dt);
      glints.update(dt);
    },
  };
});
