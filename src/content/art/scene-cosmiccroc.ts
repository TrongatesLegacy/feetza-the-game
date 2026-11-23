// Moon Crater (the Cosmic Croc's arena, the end of the space stage), redrawn with the location kit (src/art/scene):
// out on the floor of a great crater on the Moon, the station's Earth hanging overhead. No air: a black sky thick
// with stars that never twinkle and the Milky Way, the Earth half in night with its cities lit, the sun low off to
// the left throwing every shadow long and black to the right. Rounded old hills beyond the crater's far wall, the
// wall itself slumped into lobes, a talus apron; a grey regolith floor with swales, pebbles, craters lit hard and
// boulders; a lander on four pads in its own bootprints, a Feetza flag planted by it, and the three-toed tracks of
// something with a tail dragging across the dust to the table: a slab of mare basalt with the claw marks on it.
// Live: meteors fall on the hills beyond the far wall, flash, and throw up ejecta curtains (painted frames) that
// hang and fall back in the low gravity, rocks arcing over the wall; the lander's dish sweeps through painted turns
// on a springy mast, its beacon strobes; the flag hangs dead still (no wind) until a stomp sets it swinging on and
// on with nothing to damp it; every stomp throws regolith off the slab in clean ballistic arcs (no air: no cloud),
// lit chips bouncing where they land and a ring of dust running out across the stone.

import Phaser from 'phaser';
import {
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
  gradeAll,
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
import { groundCast } from '../../art/scene/light';
import { tableFalloff } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly } from '../../art/scene/paint';
import { stars } from '../../art/scene/sky';
import { crater, nebula, planet, starburst } from '../../art/scene/space';
import { spec as specHi } from '../../art/style/kit';
import { MATERIALS } from '../../art/style/materials';
import { makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Loop, Parts, Spring, sheet } from '../../game/sceneAnim';
import { calm, registerKitScene } from '../../game/sceneLive';

// ——— layout ———

export const MCX = {
  /** Where the crater's far wall meets its floor. */
  floor: 552,
  /** Between the middle and right lanes, clear of the feet. */
  earth: { x: 1204, y: 168, r: 84 },
  lander: { x: 214, base: 706 },
  flag: { x: 706, base: 714 },
  crater: { x: 1610, y: 708, rx: 236, ry: 36 },
  front: 1040,
};

/** Regolith: powdery grey, no gloss, a cold rim. */
const DUST = { ...MATERIALS.stone, name: 'Regolith', shadowTint: '#05060c', tex: 'grain' as const, texA: 0.35, rim: 0.2, ramp: 0.9 };
const GREY = '#8e8a84';
/** The floor's far colour, where it meets the wall's talus. */
const FLOOR_FAR = '#9c978f';
const INK = '#05060c';
/** The meteors' strike zone (behind the far wall): clear of the lander and the flag. */
const STRIKE = { x0: 900, x1: 1860 };
const FARFX_BOX = { x: 860, y: 240, w: W - 860, h: 286 };
const RIM_SPLIT = 860;

const DISH = { x: MCX.lander.x + 66, y: MCX.lander.base - 364 };

// ——— the sky ———

function sky(ctx: Ctx, r: R): void {
  const h = MCX.floor;
  vfill(ctx, 0, 0, W, h, [[0, '#010104'], [0.7, '#03040a'], [1, '#05060e']]);
  milkyWay(ctx, r);
  stars(ctx, r, { x: 0, y: 0, w: W, h: h - 60 }, 900, '#f0f2ff');
  stars(ctx, r, { x: 0, y: 0, w: W, h: h - 80 }, 160, '#ffe6c8');
  for (let i = 0; i < 16; i++) {
    const x = r() * W;
    const y = 20 + r() * (h - 180);
    if (Math.hypot(x - MCX.earth.x, y - MCX.earth.y) < MCX.earth.r + 40) continue;
    starburst(ctx, x, y, 1.2 + r() * 1.4, r() < 0.3 ? '#ffe0c0' : '#cfe0ff', 0.75);
  }
  // the sun is down off the left: no air to scatter it, only the faint zodiacal glow leaning up from the horizon
  softly(ctx, { x: 0, y: 0, w: 900, h }, (g) => {
    g.save();
    g.translate(-60, h - 20);
    g.rotate(-0.62);
    const zg = g.createRadialGradient(0, 0, 0, 0, 0, 640);
    zg.addColorStop(0, 'rgba(255,236,200,0.16)');
    zg.addColorStop(0.5, 'rgba(255,226,190,0.05)');
    zg.addColorStop(1, 'rgba(255,226,190,0)');
    g.scale(1, 0.32);
    g.fillStyle = zg;
    g.fillRect(-640, -640, 1280, 1280);
    g.restore();
  }, 0.25, 'screen');
  // the Earth, half in night (its cities lit), its thin blue air glowing at the lit limb
  const e = MCX.earth;
  glowAt(ctx, e.x, e.y, e.r * 1.7, '#3a7aff', 0.07);
  // (painted on its own canvas: the planet cuts its night-side halo out with destination-out, which would punch
  // through the sky)
  const S = Math.ceil(e.r * 2.6);
  const [pc, pg] = makeCanvas(S, S);
  pg.translate(S / 2 - e.x, S / 2 - e.y);
  planet(pg, r, e.x, e.y, e.r, { ocean: '#1668c8', land: '#3e8a36', land2: '#c8a464', atmo: '#6ac8ff', cloud: '#f6f8ff', sunAng: 3.3, phase: 0.12, lights: 1, clouds: 0.6, seed: 31, scale: 0.85 });
  // the terminator curves across the globe: a soft elliptical shadow bulging into the day side
  pg.save();
  pg.beginPath();
  pg.arc(e.x, e.y, e.r, 0, Math.PI * 2);
  pg.clip();
  pg.translate(e.x + e.r * 0.55, e.y);
  pg.scale(0.75, 1.25);
  const tg = pg.createRadialGradient(0, 0, e.r * 0.45, 0, 0, e.r * 0.9);
  tg.addColorStop(0, 'rgba(2,4,12,0.55)');
  tg.addColorStop(1, 'rgba(2,4,12,0)');
  pg.fillStyle = tg;
  pg.fillRect(-e.r * 2, -e.r * 2, e.r * 4, e.r * 4);
  pg.restore();
  ctx.drawImage(pc, e.x - S / 2, e.y - S / 2);
  // a thin glow of air all the way round, faint on the night side
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = 'rgba(90,170,255,0.22)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r + 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The Milky Way: a soft band of starlight leaning up from the left horizon, a dark rift of dust along it. */
function milkyWay(ctx: Ctx, r: R): void {
  const BW = 2600;
  const BH = 380;
  const [bc, b] = makeCanvas(BW, BH);
  const rr = rng(907);
  // the glow along the band's spine, brightest towards the galaxy's core (low on the left)
  const along = b.createLinearGradient(0, 0, BW, 0);
  along.addColorStop(0, 'rgba(255,232,206,0.3)');
  along.addColorStop(0.3, 'rgba(220,214,236,0.18)');
  along.addColorStop(1, 'rgba(160,176,230,0.06)');
  b.fillStyle = along;
  b.fillRect(0, 0, BW, BH);
  nebula(b, r, { x: 0, y: 0, w: BW, h: BH }, ['#8a7ab8', '#c8a088', '#5a7ac0'], 0.3, 23);
  // star clouds: soft bright knots along the spine
  for (let i = 0; i < 22; i++) {
    const x = rr() * BW;
    const y = BH / 2 + (rr() - 0.5) * BH * 0.4;
    const rad = 30 + rr() * 90;
    const g = b.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba(rr() < 0.5 ? '#fff0dc' : '#e0e4ff', 0.28 * (1 - x / BW * 0.6)));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    b.fillStyle = g;
    b.beginPath();
    b.ellipse(x, y, rad * 1.6, rad * 0.6, 0, 0, Math.PI * 2);
    b.fill();
  }
  // dense stars, packed towards the spine
  for (let i = 0; i < 9000; i++) {
    const g = (rr() + rr() + rr() - 1.5) / 1.5;
    const x = rr() ** 1.3 * BW;
    const y = BH / 2 + g * BH * 0.5;
    const s = 0.9 + rr() ** 4 * 1.6;
    b.fillStyle = rgba(rr() < 0.3 ? '#ffe8d0' : '#eef0ff', (0.3 + rr() * 0.6) * (1 - Math.abs(g) * 0.6));
    b.fillRect(Math.round(x), Math.round(y), s, s);
  }
  // the great rift: dark dust lanes winding along the spine
  b.save();
  b.globalCompositeOperation = 'destination-out';
  lay(b, noiseMask(9, 61, { cover: 0.3, soft: 0.16, col: '#000000', w: 260, h: 30 }), { x: 0, y: BH * 0.4, w: BW, h: BH * 0.22 }, 0.75);
  lay(b, noiseMask(22, 62, { cover: 0.2, soft: 0.08, col: '#000000', w: 320, h: 48 }), { x: 0, y: BH * 0.25, w: BW, h: BH * 0.5 }, 0.35);
  // feathered top and bottom
  b.globalCompositeOperation = 'destination-in';
  const fg = b.createLinearGradient(0, 0, 0, BH);
  fg.addColorStop(0, 'rgba(0,0,0,0)');
  fg.addColorStop(0.5, 'rgba(0,0,0,1)');
  fg.addColorStop(1, 'rgba(0,0,0,0)');
  b.fillStyle = fg;
  b.fillRect(0, 0, BW, BH);
  // and fading out along its length
  const fl = b.createLinearGradient(0, 0, BW, 0);
  fl.addColorStop(0, 'rgba(0,0,0,0.9)');
  fl.addColorStop(0.55, 'rgba(0,0,0,0.6)');
  fl.addColorStop(1, 'rgba(0,0,0,0.15)');
  b.fillStyle = fl;
  b.fillRect(0, 0, BW, BH);
  b.restore();
  ctx.save();
  ctx.translate(820, 300);
  ctx.rotate(-0.36);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.8;
  ctx.drawImage(bc, -BW / 2, -BH / 2);
  ctx.restore();
}

// ——— hills ———

interface Hill {
  cx: number;
  w: number;
  h: number;
  /** Where the light turns: −0.3 (lit mostly) … 0.3 (shaded mostly). */
  turn: number;
}

/** One rounded lunar hill (no weather to sharpen it): its face lit on the sun's side and falling into black past a
 * soft terminator, gullies down the lit face, pocks of small craters, its crest catching the sun. */
function hill(ctx: Ctx, rr: R, H: Hill, yb: number, lit: string, dark: string, line: number): void {
  const { cx, w, h } = H;
  const seed = rr() * 10;
  const top = (x: number): number => {
    const u = (x - cx) / w;
    if (Math.abs(u) >= 1) return yb + 2;
    const b = (1 - u * u) ** 1.5;
    const n = Math.sin(x * 0.031 + seed) * 0.05 + Math.sin(x * 0.083 + seed * 2) * 0.025 + Math.sin(x * 0.19 + seed * 3) * 0.01;
    return yb - h * b * (1 + n);
  };
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx - w, yb + 14);
    for (let x = cx - w; x <= cx + w; x += 4) c.lineTo(x, top(x));
    c.lineTo(cx + w, yb + 14);
    c.closePath();
  };
  const t = 0.5 + H.turn;
  ctx.save();
  path(ctx);
  ctx.clip();
  // the shaded dome, then its sunlit side: a lit ellipse centred towards the sun, so the terminator curves round
  // the form (bulging to the right) and turns softly, not a straight cut
  ctx.fillStyle = dark;
  ctx.fillRect(cx - w, yb - h * 1.2, w * 2, h * 1.2 + 64);
  {
    const LR = w * (0.8 + H.turn * 1.4);
    ctx.save();
    ctx.translate(cx - w * 0.42, yb + h * 0.35);
    ctx.scale(1, (h * 1.55) / LR);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, LR);
    g.addColorStop(0, lit);
    g.addColorStop(0.62, lit);
    g.addColorStop(0.84, mix(lit, dark, 0.45));
    g.addColorStop(0.93, rgba(mix(lit, dark, 0.8), 0.6));
    g.addColorStop(1, rgba(dark, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-LR, -LR, LR * 2, LR * 2);
    ctx.restore();
  }
  // the face turns from the sun towards its foot, and the hill in front shades it
  vfill(ctx, cx - w, yb - h, w * 2, h + 60, [[0, 'rgba(4,5,12,0)'], [0.7, 'rgba(4,5,12,0.05)'], [1, 'rgba(4,5,12,0.3)']]);
  lay(ctx, drift(shade(lit, 0.1), shade(dark, -0.1), 6, Math.floor(seed * 9), 96, 32), { x: cx - w, y: yb - h, w: w * 2, h: h + 20 }, 0.1);
  // a few gullies down the lit flank, running downhill (down and away from the crest), fading as they go
  const ng = Math.max(1, Math.round(w / 140));
  softly(ctx, { x: cx - w, y: yb - h - 10, w: w * 2, h: h + 30 }, (g) => {
    g.lineCap = 'round';
    for (let i = 0; i < ng; i++) {
      const x0 = cx - w * (0.12 + rr() * 0.45);
      const y0 = top(x0) + 5;
      const x1 = x0 - (cx - x0) * 0.5 - 10 - rr() * 20;
      const y1 = Math.min(yb, y0 + (yb - y0) * (0.55 + rr() * 0.3));
      for (const [dx, col, a, lw] of [[0, '#05060c', 0.26, 5 + rr() * 3], [-3.5, '#fff2dc', 0.16, 2]] as const) {
        const gg = g.createLinearGradient(0, y0, 0, y1);
        gg.addColorStop(0, rgba(col, a));
        gg.addColorStop(1, rgba(col, 0));
        g.strokeStyle = gg;
        g.lineWidth = lw;
        g.beginPath();
        g.moveTo(x0 + dx, y0);
        g.quadraticCurveTo((x0 + x1) / 2 + dx + 6, (y0 + y1) / 2, x1 + dx, y1);
        g.stroke();
      }
    }
  }, 0.5);
  // pocks: little craters, each a shadowed left half and a lit right lip
  for (let i = 0; i < w / 14; i++) {
    const x = cx - w * 0.9 + rr() * w * 1.8;
    const y = top(x) + 6 + rr() * (yb - top(x) - 4);
    const s = 1.5 + rr() * 4;
    ctx.fillStyle = 'rgba(5,6,12,0.28)';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.15, y, s, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,244,226,0.16)';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.35, y + s * 0.1, s * 0.6, s * 0.25, 0, -0.6, Math.PI * 0.6);
    ctx.fill();
  }
  ctx.restore();
  // the crest catches the sun on the lit side; one fine ink line round it all
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba('#fff4e2', 0.4);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let x = cx - w * 0.96; x <= cx + w * (t - 0.5) * 2; x += 4) (x === cx - w * 0.96 ? ctx.moveTo(x, top(x) + 1) : ctx.lineTo(x, top(x) + 1));
  ctx.stroke();
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.lineWidth = line;
  ctx.beginPath();
  for (let x = cx - w; x <= cx + w; x += 4) (x === cx - w ? ctx.moveTo(x, top(x)) : ctx.lineTo(x, top(x)));
  ctx.stroke();
  ctx.restore();
}

/** The old mountains beyond the crater: rounded massifs overlapping, the farthest a touch flatter. */
function farHills(ctx: Ctx): void {
  const rr = rng(311);
  // (spaced so each one's terminator shows: the next massif covers only its foot, not its shaded side)
  const back: Hill[] = [
    { cx: 40, w: 300, h: 132, turn: 0.06 }, { cx: 590, w: 280, h: 104, turn: 0.02 }, { cx: 1130, w: 330, h: 146, turn: 0.08 },
    { cx: 1660, w: 290, h: 118, turn: 0.04 }, { cx: 2060, w: 260, h: 120, turn: 0.1 },
  ];
  const front: Hill[] = [
    { cx: 330, w: 220, h: 78, turn: 0.04 }, { cx: 860, w: 200, h: 62, turn: 0.06 }, { cx: 1400, w: 230, h: 86, turn: 0.04 }, { cx: 1900, w: 190, h: 70, turn: 0.08 },
  ];
  for (const hl of back) hill(ctx, rr, hl, 530, '#b2ada4', '#0c0c12', 1.2);
  for (const hl of front) hill(ctx, rr, hl, 540, '#c2bcb2', '#0a0a10', 1.4);
}

/** The crater's own far wall, nearer: slumped lobes along a long low ridge, then the talus apron down to the floor.
 * (Painted whole, clipped to its box, so the two halves of the live layer meet without a seam.) */
function farWall(ctx: Ctx, box: { x: number; y: number; w: number; h: number }): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const rr = rng(512);
  const lobes: Hill[] = [];
  for (let x = -120; x < W + 200; ) {
    const sp = 190 + rr() * 150;
    lobes.push({ cx: x, w: sp * 0.62, h: 24 + rr() * 26, turn: 0.04 + rr() * 0.14 });
    x += sp;
  }
  for (const l of lobes) hill(ctx, rr, l, MCX.floor - 4, '#ccc6bc', '#121218', 1.6);
  // each lobe throws its shadow to the right along the foot of the wall (the sun is low on the left)
  for (const l of lobes) {
    const x0 = l.cx + l.w * 0.4;
    ctx.fillStyle = rgba(INK, 0.5);
    ctx.beginPath();
    ctx.moveTo(x0 - l.w * 0.3, MCX.floor);
    ctx.quadraticCurveTo(x0 - l.w * 0.1, MCX.floor - l.h * 0.3, x0 + l.w * 0.2, MCX.floor - 5);
    ctx.quadraticCurveTo(x0 + l.w * 0.8, MCX.floor - 4, x0 + l.w * 1.3, MCX.floor);
    ctx.closePath();
    ctx.fill();
  }
  // the talus apron: lighter scree fanning out of the lobes and down onto the floor
  softly(ctx, { x: 0, y: MCX.floor - 40, w: W, h: 44 }, (g) => {
    vfill(g, 0, MCX.floor - 30, W, 30, [[0, rgba(FLOOR_FAR, 0)], [1, rgba(FLOOR_FAR, 0.55)]]);
    for (let i = 0; i < 40; i++) {
      const x = rr() * W;
      g.fillStyle = rgba(rr() < 0.5 ? '#c8c2b8' : '#5a5860', 0.2);
      g.beginPath();
      g.ellipse(x, MCX.floor - 10, 40 + rr() * 60, 8 + rr() * 6, 0, 0, Math.PI * 2);
      g.fill();
    }
  }, 0.5);
  ctx.restore();
}

// ——— the floor ———

/** Depth on the floor: 0 at the far wall … 1 at the table. */
const kAt = (y: number): number => Math.max(0, Math.min(1, (y - MCX.floor) / (TY - MCX.floor)));

/** The lander's silhouette (for its long shadow): legs, stages, mast. */
function landerSil(c: Ctx): void {
  const { x, base } = MCX.lander;
  c.beginPath();
  c.rect(x - 112, base - 212, 224, 84);
  c.moveTo(x - 82, base - 212);
  c.lineTo(x - 94, base - 264);
  c.lineTo(x - 66, base - 302);
  c.lineTo(x - 8, base - 320);
  c.lineTo(x + 52, base - 314);
  c.lineTo(x + 88, base - 272);
  c.lineTo(x + 82, base - 212);
  c.closePath();
  for (const s of [-1, 1]) {
    c.moveTo(x + s * 100, base - 168);
    c.lineTo(x + s * 112, base - 160);
    c.lineTo(x + s * 186, base - 10);
    c.lineTo(x + s * 170, base - 10);
    c.closePath();
  }
  c.rect(x + 40, base - 360, 6, 50);
  c.ellipse(DISH.x, DISH.y, 30, 30, 0, 0, Math.PI * 2);
}

function flagSil(c: Ctx): void {
  const { x, base } = MCX.flag;
  c.beginPath();
  c.rect(x - 2, base - 212, 4, 212);
  c.rect(x, base - 208, 128, 84);
}

/** The floor: regolith from the far wall to the table, lit from the low sun on the left. */
function plain(ctx: Ctx, r: R): void {
  const y0 = MCX.floor;
  const box = { x: 0, y: y0, w: W, h: TY - y0 + 4 };
  // grazing light makes the far floor bright and flat, the near floor darker and rougher
  vfill(ctx, 0, y0, W, box.h, [[0, FLOOR_FAR], [0.35, '#8e8982'], [1, '#76726e']]);
  // low-frequency tone following the perspective: three depth slices, each drift field squashed less as it nears
  // (patches foreshortened, not streaks)
  // (one field per scale, laid over the whole floor: no seams)
  lay(ctx, drift('#b4aea4', '#5c5a64', 5, 51, 192, 40), box, 0.26);
  lay(ctx, drift('#aca69e', '#64626a', 12, 55, 256, 56), box, 0.16);
  // the sun's side is brighter, the far side cooler
  const sg = ctx.createLinearGradient(0, 0, W, 0);
  sg.addColorStop(0, 'rgba(255,240,214,0.1)');
  sg.addColorStop(0.5, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(14,18,36,0.14)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, y0, W, box.h);
  const avoid = (x: number, y: number) => (Math.abs(x - MCX.lander.x) < 230 && y > 640) || (Math.abs(x - MCX.flag.x) < 50 && y > 690) || inBig(x, y, 1.35);
  // regolith: pebbles, each lit on its left with a long little black shadow to its right
  for (let i = 0; i < 1500; i++) {
    const y = y0 + 4 + r() ** 0.75 * (TY - y0 - 4);
    const k = kAt(y);
    const x = r() * W;
    const s = (0.5 + r() ** 3 * 2.6) * (0.3 + k * 1.1);
    if (s < 0.4 || inBig(x, y, 1.05)) continue;
    ctx.fillStyle = 'rgba(5,6,12,0.7)';
    ctx.beginPath();
    ctx.ellipse(x + s * 2, y + s * 0.15, s * 2.2, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = r() < 0.5 ? 'rgba(214,208,198,0.85)' : 'rgba(150,146,140,0.85)';
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.3, s, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // craters at a few sizes, far and small to near and larger, foreshortened by the low view
  for (let i = 0; i < 90; i++) {
    const y = y0 + 8 + r() ** 1.15 * (TY - y0 - 22);
    const k = kAt(y);
    const big = r();
    const rx = (big < 0.6 ? 3 + r() * 6 : big < 0.9 ? 9 + r() * 14 : 22 + r() * 22) * (0.35 + k * 1.3);
    const x = r() * W;
    if (avoid(x, y)) continue;
    crater(ctx, r, x, y, rx, rx * (0.14 + k * 0.14), GREY, { ejecta: 0.3 + r() * 0.3 });
  }
  bigCrater(ctx, r);
  // the long shadows of the lander and the flag laid out to the right across the dust: airless, near black, sharp
  groundCast(ctx, landerSil, MCX.lander.base, 1.55, 0.11, 0.86, 1, INK);
  groundCast(ctx, flagSil, MCX.flag.base, 1.55, 0.05, 0.9, 0.4, INK);
  groundCast(ctx, flagSil, MCX.flag.base - 3, 1.55, 0.05, 0.9, 0.4, INK);
  // boulders: lumps of breccia, each lit on its left, black on its right, a long sharp shadow thrown to the right
  for (let i = 0; i < 30; i++) {
    const y = y0 + 8 + r() ** 1.2 * (TY - y0 - 18);
    const k = kAt(y);
    const x = r() * W;
    if (avoid(x, y)) continue;
    const s = (3 + r() * 12) * (0.35 + k * 1.2);
    const pts: [number, number][] = [];
    const n = 7;
    for (let j = 0; j <= n; j++) {
      const a = Math.PI + (j / n) * Math.PI;
      const rad = s * (0.75 + r() * 0.4);
      pts.push([x + Math.cos(a) * rad * 1.2, y + Math.sin(a) * rad * 0.95]);
    }
    const b = polyPath(pts);
    groundCast(ctx, b, y, 2.0, 0.45, 0.92, 0.5 + k * 0.4, INK);
    solid(ctx, b, { x: x - s * 1.3, y: y - s * 1.2, w: s * 2.6, h: s * 1.2 }, DUST, shade(GREY, (r() - 0.5) * 0.18), { depth: 0.5 - k * 0.4, line: Math.max(0.8, k * 2) });
    within(ctx, b, () => {
      const lg = ctx.createLinearGradient(x - s, 0, x + s, 0);
      lg.addColorStop(0, 'rgba(255,246,228,0.35)');
      lg.addColorStop(0.5, 'rgba(0,0,0,0)');
      lg.addColorStop(0.62, 'rgba(5,6,12,0.6)');
      lg.addColorStop(1, 'rgba(5,6,12,0.85)');
      ctx.fillStyle = lg;
      ctx.fillRect(x - s * 1.3, y - s * 1.3, s * 2.6, s * 1.4);
    });
    ctx.fillStyle = 'rgba(5,6,12,0.6)';
    ctx.fillRect(x - s * 1.1, y - 1, s * 2.2, 1.5);
  }
  // the croc's tracks: pairs of three-toed prints shrinking into the distance, out of the far wall towards the
  // table; each print a pit whose left wall is in shadow and whose right wall catches the sun
  const track = (t: number): [number, number] => {
    const x = 1310 - t * 300 + Math.sin(t * 3) * 30;
    return [x, y0 + 14 + t ** 1.25 * (TY - y0 - 14)];
  };
  const print = (px: number, py: number, rx: number, ry: number, a: number) => {
    ctx.fillStyle = 'rgba(40,40,48,0.35)';
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(5,6,12,0.7)';
    ctx.beginPath();
    ctx.ellipse(px - rx * 0.3, py, rx * 0.65, ry * 0.85, a, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(236,230,218,0.5)';
    ctx.beginPath();
    ctx.ellipse(px + rx * 0.45, py + ry * 0.05, rx * 0.45, ry * 0.8, a, -1.3, 1.3);
    ctx.fill();
  };
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8;
    const [tx, ty] = track(t);
    const s = 0.8 + t * 2.1;
    for (const side of [-1, 1]) {
      const x = tx + side * (10 + t * 22);
      const y = ty + (side > 0 ? 3 * s : 0);
      print(x, y, 6 * s, 2.4 * s, 0);
      for (const [dx, dy, a] of [[-7, 4, -0.5], [0, 5.5, 0], [7, 4, 0.5]] as const) print(x + dx * s, y + dy * s * 0.5, 2 * s, 1.3 * s, a);
    }
  }
  // bootprints round the lander and out to the flag
  for (let i = 0; i < 46; i++) {
    const t = r();
    const x = MCX.lander.x - 150 + t * (MCX.flag.x - MCX.lander.x + 190) + (r() - 0.5) * 60;
    const y = 676 + r() * 64;
    const k = kAt(y);
    const s = 0.5 + k * 0.7;
    ctx.fillStyle = 'rgba(5,6,12,0.32)';
    ctx.beginPath();
    ctx.ellipse(x, y, 7 * s, 2.6 * s, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(5,6,12,0.25)';
    ctx.lineWidth = 0.8;
    for (let j = -2; j <= 2; j++) {
      ctx.beginPath();
      ctx.moveTo(x + j * 2.6 * s, y - 2 * s);
      ctx.lineTo(x + j * 2.6 * s, y + 2 * s);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(232,226,214,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 2 * s, y + 0.8 * s, 6 * s, 1.6 * s, 0, -0.4, Math.PI * 0.9);
    ctx.fill();
  }
  // dust darkened where the table's slab sits on it
  crevice(ctx, 0, W, TY - 14, 18, 0.35, INK);
}

/** Inside the big crater's ellipse (scaled by k)? */
const inBig = (x: number, y: number, k = 1): boolean => {
  const c = MCX.crater;
  return ((x - c.x) / (c.rx * k)) ** 2 + ((y - c.y) / (c.ry * k)) ** 2 < 1;
};

/** The big crater on the right: a fresh bowl in a raised rampart. The rampart's outer slope lit on the left and dark
 * on the right (throwing its shadow out across the floor); inside, the far-left wall's shadow a black crescent over
 * the floor, the near-right inner wall full in the sun; a few blocks on the floor, dark where the shadow lies. */
function bigCrater(ctx: Ctx, r: R): void {
  const c = MCX.crater;
  // bright rays of ejecta thrown across the floor
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2;
    const len = c.rx * (1.4 + r() * 1.3);
    const ex = c.x + Math.cos(a) * len;
    const ey = c.y + Math.sin(a) * len * (c.ry / c.rx);
    const rg = ctx.createLinearGradient(c.x, c.y, ex, ey);
    rg.addColorStop(0.4, 'rgba(210,204,194,0.12)');
    rg.addColorStop(1, 'rgba(210,204,194,0)');
    ctx.strokeStyle = rg;
    ctx.lineWidth = 6 + r() * 12;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
  ctx.restore();
  // the rampart's shadow thrown right across the floor
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.fillStyle = rgba(INK, 0.45);
  ctx.beginPath();
  ctx.ellipse(c.rx * 0.22, c.ry * 0.1, c.rx * 1.2, c.ry * 1.15, 0, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  // the rampart: a broad raised ring, its outer slope lit facing the sun (left) and dark facing away (right)
  const ring = (rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  };
  {
    // (painted on its own canvas: the light across it, then cut to a ring that feathers out into the floor)
    const RW = Math.ceil(c.rx * 2.8);
    const RH = Math.ceil(c.ry * 3.2);
    const [rc, rgx] = makeCanvas(RW, RH);
    const lg = rgx.createLinearGradient(0, 0, RW, 0);
    lg.addColorStop(0.05, '#d8d2c8');
    lg.addColorStop(0.42, '#aaa49c');
    lg.addColorStop(0.62, '#5a5860');
    lg.addColorStop(0.95, '#2a2a32');
    rgx.fillStyle = lg;
    rgx.fillRect(0, 0, RW, RH);
    rgx.globalCompositeOperation = 'destination-in';
    rgx.translate(RW / 2, RH / 2);
    rgx.scale(1, (c.ry * 1.15) / c.rx);
    const mg = rgx.createRadialGradient(0, 0, c.rx * 0.9, 0, 0, c.rx * 1.3);
    mg.addColorStop(0, 'rgba(0,0,0,1)');
    mg.addColorStop(0.35, 'rgba(0,0,0,0.9)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    rgx.fillStyle = mg;
    rgx.fillRect(-RW, -RW, RW * 2, RW * 2);
    ctx.drawImage(rc, -RW / 2, -RH / 2);
  }
  void ring;
  // its crest: a lit line along the near (lower) lip, where the inner slope turns to face the sun
  ctx.strokeStyle = 'rgba(240,234,222,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, c.rx * 1.02, c.ry * 1.08, 0, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  // the bowl: its floor mid grey, the near-right inner wall lit
  ctx.beginPath();
  ctx.ellipse(0, 0, c.rx, c.ry, 0, 0, Math.PI * 2);
  ctx.save();
  ctx.clip();
  const bg = ctx.createLinearGradient(-c.rx, 0, c.rx, 0);
  bg.addColorStop(0, '#5a5860');
  bg.addColorStop(0.55, '#8a857e');
  bg.addColorStop(1, '#d8d2c8');
  ctx.fillStyle = bg;
  ctx.fillRect(-c.rx, -c.ry, c.rx * 2, c.ry * 2);
  // the inner wall's lit band on the right, under the lip
  const wg = ctx.createRadialGradient(c.rx * 0.6, c.ry * 0.2, 0, c.rx * 0.6, c.ry * 0.2, c.rx * 0.6);
  wg.addColorStop(0, 'rgba(250,244,232,0.5)');
  wg.addColorStop(1, 'rgba(250,244,232,0)');
  ctx.fillStyle = wg;
  ctx.fillRect(-c.rx, -c.ry, c.rx * 2, c.ry * 2);
  // the far inner wall, facing us: a band under the far lip, lit where it turns to the sun (right)
  const fw = ctx.createLinearGradient(-c.rx, 0, c.rx, 0);
  fw.addColorStop(0, 'rgba(40,40,48,0.6)');
  fw.addColorStop(0.5, 'rgba(150,146,140,0.5)');
  fw.addColorStop(1, 'rgba(236,230,220,0.7)');
  ctx.fillStyle = fw;
  ctx.beginPath();
  ctx.ellipse(0, 0, c.rx, c.ry, 0, Math.PI, Math.PI * 2);
  ctx.ellipse(0, c.ry * 0.35, c.rx * 0.92, c.ry * 0.85, 0, Math.PI * 2, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  // blocks on the floor first, so the shadow covers those that lie in it
  for (let i = 0; i < 9; i++) {
    const bx = (r() - 0.4) * c.rx * 1.3;
    const by = (r() - 0.3) * c.ry * 0.9;
    const s = 2 + r() * 4;
    ctx.fillStyle = rgba(INK, 0.7);
    ctx.fillRect(bx, by - s * 0.2, s * 2.4, s * 0.45);
    ctx.fillStyle = '#c8c2b8';
    ctx.beginPath();
    ctx.ellipse(bx, by - s * 0.3, s, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // the far-left wall's shadow: a black crescent across the floor (everything in it dark)
  ctx.fillStyle = '#07080e';
  ctx.beginPath();
  ctx.ellipse(0, 0, c.rx, c.ry, 0, 0, Math.PI * 2);
  ctx.ellipse(c.rx * 0.2, c.ry * 0.26, c.rx * 0.94, c.ry * 0.88, 0, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  // its edge isn't razor sharp (the sun is a disc): a thin penumbra
  ctx.strokeStyle = 'rgba(7,8,14,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(c.rx * 0.2, c.ry * 0.26, c.rx * 0.94, c.ry * 0.88, 0, Math.PI * 0.55, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, c.rx, c.ry, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ——— the lander ———

/** A strut: an ink outline, a metal body, lit along its sun side. */
function tube(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, col: string): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 3;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
  // the lit edge (towards the upper left) and the shaded one
  const l = Math.hypot(x1 - x0, y1 - y0) || 1;
  let nx = -(y1 - y0) / l;
  let ny = (x1 - x0) / l;
  if (nx * -1 + ny * -0.6 < 0) {
    nx = -nx;
    ny = -ny;
  }
  ctx.strokeStyle = 'rgba(255,250,236,0.7)';
  ctx.lineWidth = Math.max(1, w * 0.28);
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w * 0.25, y0 + ny * w * 0.25);
  ctx.lineTo(x1 + nx * w * 0.25, y1 + ny * w * 0.25);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(5,6,12,0.45)';
  ctx.beginPath();
  ctx.moveTo(x0 - nx * w * 0.28, y0 - ny * w * 0.28);
  ctx.lineTo(x1 - nx * w * 0.28, y1 - ny * w * 0.28);
  ctx.stroke();
  ctx.restore();
}

/** Crinkled gold foil in a box: a net of creases (a dark fold beside a bright ridge) and big crumpled facets. */
function foil(ctx: Ctx, r: R, box: { x: number; y: number; w: number; h: number }, base: string, seed: number): void {
  lay(ctx, drift(shade(base, 0.35), shade(base, -0.4), 4, seed, 48, 24), box, 0.35);
  for (let i = 0; i < (box.w * box.h) / 140; i++) {
    const x = box.x + r() * box.w;
    const y = box.y + r() * box.h;
    const s = 8 + r() * 18;
    const a = -0.6 + (r() - 0.5) * 1.2;
    ctx.fillStyle = r() < 0.45 ? rgba('#fff6c0', 0.16 + r() * 0.26) : rgba('#2a1400', 0.16 + r() * 0.22);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
    ctx.lineTo(x + Math.cos(a + 1.9) * s * 0.7, y + Math.sin(a + 1.9) * s * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  lay(ctx, noiseMask(9, seed + 1, { cover: 0.4, soft: 0.05, kind: 'web', col: '#3a1e00', w: 120, h: 60 }), box, 0.45);
  lay(ctx, noiseMask(9, seed + 1, { cover: 0.4, soft: 0.05, kind: 'web', col: '#fffae0', w: 120, h: 60 }), { ...box, x: box.x - 1.5, y: box.y - 1.2 }, 0.4);
  // hot specular sparkles where creases face the sun
  for (let i = 0; i < (box.w * box.h) / 900; i++) {
    const x = box.x + r() * box.w * 0.7;
    const y = box.y + r() * box.h;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 5);
    g.addColorStop(0, 'rgba(255,255,236,0.8)');
    g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 5, y - 5, 10, 10);
  }
}

/** The lander: a gold-foil descent stage on four splayed legs, its pads sunk in the dust, the faceted ascent stage on
 * top with its windows, hatch, thruster quads and the mast for the dish. Lit hard from the left. */
function lander(ctx: Ctx, r: R): void {
  const { x, base } = MCX.lander;
  // the back legs first (behind the stage), shorter, their pads further off
  for (const s of [-1, 1]) {
    tube(ctx, x + s * 58, base - 150, x + s * 118, base - 32, 7, s < 0 ? '#b8bcc4' : '#7a7e88');
    tube(ctx, x + s * 118, base - 32, x + s * 40, base - 132, 3, '#8a8e98');
    const py = base - 22;
    ctx.fillStyle = 'rgba(5,6,12,0.6)';
    ctx.beginPath();
    ctx.ellipse(x + s * 120 + 8, py + 2, 24, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    solid(ctx, ellPath(x + s * 120, py - 2, 17, 5.5), { x: x + s * 120 - 17, y: py - 8, w: 34, h: 12 }, 'chrome', '#b4b8c0', { depth: 0.15, line: 1.6 });
  }
  // the engine bell under the stage
  // the engine: a gimbal mount under the stage, then the bell: a cone flaring from its throat, lit on its left,
  // its mouth an ellipse with the dark inside showing
  const mount = polyPath([[x - 18, base - 134], [x + 18, base - 134], [x + 12, base - 122], [x - 12, base - 122]]);
  solid(ctx, mount, { x: x - 18, y: base - 134, w: 36, h: 12 }, 'iron', '#5a5a64', { depth: 0.1, line: 2 });
  const bell = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 11, base - 123);
    c.quadraticCurveTo(x - 16, base - 104, x - 38, base - 90);
    c.ellipse(x, base - 90, 38, 7, 0, Math.PI, 0, true);
    c.quadraticCurveTo(x + 16, base - 104, x + 11, base - 123);
    c.closePath();
  };
  solid(ctx, bell, { x: x - 40, y: base - 124, w: 80, h: 42 }, 'chrome', '#6a6a74', { depth: 0.1, line: 2.5 });
  within(ctx, bell, () => {
    const bg = ctx.createLinearGradient(x - 38, 0, x + 38, 0);
    bg.addColorStop(0, 'rgba(255,244,226,0.55)');
    bg.addColorStop(0.3, 'rgba(255,244,226,0.1)');
    bg.addColorStop(0.55, 'rgba(0,0,0,0.25)');
    bg.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = bg;
    ctx.fillRect(x - 40, base - 124, 80, 42);
    // heat-tinted bands round the skirt
    ctx.strokeStyle = 'rgba(140,80,50,0.35)';
    ctx.lineWidth = 2;
    for (const yy of [base - 104, base - 97]) {
      ctx.beginPath();
      ctx.ellipse(x, yy, 18 + (yy - base + 110) * 1.6, 3, 0, 0, Math.PI);
      ctx.stroke();
    }
  });
  // the mouth: the far rim seen inside, dark
  ctx.fillStyle = '#0a0a10';
  ctx.beginPath();
  ctx.ellipse(x, base - 90, 34, 5, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,226,220,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, base - 90, 37, 6.5, 0, Math.PI * 0.55, Math.PI);
  ctx.stroke();
  // the descent stage: an octagon seen front on (a broad front face, two faces turning away)
  const top = base - 212;
  const bot = base - 130;
  const faces: [PathFn, number, string][] = [
    [polyPath([[x - 112, top + 6], [x - 70, top], [x - 70, bot], [x - 112, bot - 6]]), 0.22, '#e8b048'],
    [polyPath([[x - 70, top], [x + 70, top], [x + 70, bot], [x - 70, bot]]), 0, '#d29a38'],
    [polyPath([[x + 70, top], [x + 112, top + 6], [x + 112, bot - 6], [x + 70, bot]]), -0.42, '#a87420'],
  ];
  const stage = polyPath([[x - 112, top + 6], [x - 70, top], [x + 70, top], [x + 112, top + 6], [x + 112, bot - 6], [x + 70, bot], [x - 70, bot], [x - 112, bot - 6]]);
  castShadow(ctx, stage, 8, 10, 0.4, INK);
  faces.forEach(([p, k, col], i) => {
    solid(ctx, p, { x: x - 112, y: top, w: 224, h: bot - top }, 'chrome', col, { depth: 0.1, line: false, formSize: 30 });
    within(ctx, p, () => {
      foil(ctx, r, { x: x - 112, y: top, w: 224, h: bot - top }, col, 63 + i * 5);
      if (k) {
        ctx.fillStyle = k > 0 ? rgba('#fff8e0', k) : rgba('#120800', -k);
        ctx.fillRect(x - 112, top, 224, bot - top);
      }
      // the stage falls off from the sun across its width
      const fg = ctx.createLinearGradient(x - 112, 0, x + 112, 0);
      fg.addColorStop(0, 'rgba(255,250,230,0.12)');
      fg.addColorStop(0.5, 'rgba(0,0,0,0)');
      fg.addColorStop(1, 'rgba(14,6,0,0.4)');
      ctx.fillStyle = fg;
      ctx.fillRect(x - 112, top, 224, bot - top);
      // panel seams where the foil blankets are taped
      ctx.strokeStyle = 'rgba(60,30,0,0.55)';
      ctx.lineWidth = 1.4;
      for (const sx2 of [x - 92, x - 24, x + 26, x + 92]) {
        ctx.beginPath();
        ctx.moveTo(sx2, top + 3);
        ctx.lineTo(sx2 + 1.5, bot - 18);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,246,200,0.35)';
      ctx.lineWidth = 1;
      for (const sx2 of [x - 93.5, x - 25.5, x + 24.5, x + 90.5]) {
        ctx.beginPath();
        ctx.moveTo(sx2, top + 3);
        ctx.lineTo(sx2 + 1.5, bot - 18);
        ctx.stroke();
      }
      // the black foil skirt round its foot
      vfill(ctx, x - 112, bot - 18, 224, 18, [[0, '#1a1814'], [1, '#0a0a0c']]);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x - 112, bot - 18, 224, 1.5);
    });
  });
  // the panels' edges: the lit corner, the turned one
  for (const [ex, a] of [[x - 70, 0.7], [x + 70, 0.35]] as const) {
    ctx.strokeStyle = rgba(a > 0.5 ? '#fff6d8' : '#2a1800', a);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex, top + 2);
    ctx.lineTo(ex, bot - 2);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  stage(ctx);
  ctx.stroke();
  // the deck's silver rim catches the sun
  ctx.fillStyle = 'rgba(240,240,236,0.85)';
  ctx.fillRect(x - 110, top + 1, 220, 3);
  // stencilled on the front panel
  ctx.save();
  ctx.font = '700 15px "Lilita One", Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(30,14,4,0.75)';
  ctx.fillText('FEETZA·1', x, bot - 30);
  ctx.restore();
  // the front legs: primary strut out from the stage's corners, two braces, and the pad sunk in the dust
  for (const s of [-1, 1]) {
    const lit = s < 0;
    const jx = x + s * 182;
    const jy = base - 14;
    tube(ctx, x + s * 104, base - 164, jx, jy, 9, lit ? '#d4d8de' : '#7e828c');
    tube(ctx, jx - s * 4, jy - 6, x + s * 70, bot - 2, 3.5, lit ? '#b8bcc4' : '#6a6e78');
    tube(ctx, jx - s * 6, jy - 10, x + s * 112, bot - 10, 3.5, lit ? '#c4c8d0' : '#727680');
    // the shock absorber's sleeve near the pad
    tube(ctx, x + s * 160, base - 56, jx - s * 4, jy - 8, 13, lit ? '#e0e2e6' : '#8a8e96');
    // the pad: a shallow dish half sunk, dust pushed up round it, its contact shadow
    ctx.fillStyle = 'rgba(5,6,12,0.7)';
    ctx.beginPath();
    ctx.ellipse(jx + 10, jy + 6, 34, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const pad = (c: Ctx) => {
      c.beginPath();
      c.moveTo(jx - 26, jy - 2);
      c.quadraticCurveTo(jx, jy - 12, jx + 26, jy - 2);
      c.quadraticCurveTo(jx + 22, jy + 6, jx, jy + 6);
      c.quadraticCurveTo(jx - 22, jy + 6, jx - 26, jy - 2);
      c.closePath();
    };
    solid(ctx, pad, { x: jx - 26, y: jy - 12, w: 52, h: 18 }, 'chrome', lit ? '#c8ccd2' : '#9a9ea6', { depth: 0.1, line: 2 });
    ctx.fillStyle = 'rgba(190,184,174,0.85)';
    ctx.beginPath();
    ctx.ellipse(jx, jy + 5, 30, 4, 0, 0, Math.PI);
    ctx.fill();
    // regolith kicked up round it on landing: clods lit on their left, black shadows to their right
    for (let i = 0; i < 9; i++) {
      const cx2 = jx + (r() - 0.5) * 80;
      const cy2 = jy + 3 + r() * 8;
      const cs = 1 + r() * 2.2;
      ctx.fillStyle = 'rgba(5,6,12,0.75)';
      ctx.fillRect(cx2 + cs * 0.5, cy2 - cs * 0.2, cs * 3.4, cs * 0.6);
      ctx.fillStyle = '#cfc9bf';
      ctx.beginPath();
      ctx.ellipse(cx2, cy2 - cs * 0.4, cs, cs * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(232,226,214,0.6)';
    ctx.beginPath();
    ctx.ellipse(jx - 8, jy + 4, 16, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // the contact probe, bent back under the pad
    ctx.strokeStyle = '#2a2a30';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(jx + s * 10, jy + 2);
    ctx.lineTo(jx + s * 34, jy + 8);
    ctx.stroke();
  }
  // the ascent stage: faceted, pale, its sun face blazing, the far faces in shade
  const cab = polyPath([[x - 82, top], [x - 94, top - 52], [x - 66, top - 90], [x - 8, top - 108], [x + 52, top - 102], [x + 88, top - 60], [x + 82, top]]);
  castShadow(ctx, cab, 10, 12, 0.5, INK);
  solid(ctx, cab, { x: x - 94, y: top - 108, w: 182, h: 108 }, 'enamel', '#c4c8ce', { depth: 0.1, formSize: 30, line: false });
  within(ctx, cab, () => {
    lay(ctx, drift('#ffffff', '#5a5e68', 6, 71, 48, 32), { x: x - 94, y: top - 108, w: 182, h: 108 }, 0.25);
    // the left facets lit, the right ones turned away
    ctx.fillStyle = 'rgba(255,250,236,0.35)';
    ctx.beginPath();
    ctx.moveTo(x - 94, top - 52);
    ctx.lineTo(x - 66, top - 90);
    ctx.lineTo(x - 40, top - 70);
    ctx.lineTo(x - 50, top);
    ctx.lineTo(x - 82, top);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(10,12,24,0.5)';
    ctx.beginPath();
    ctx.moveTo(x + 30, top - 104);
    ctx.lineTo(x + 52, top - 102);
    ctx.lineTo(x + 88, top - 60);
    ctx.lineTo(x + 82, top);
    ctx.lineTo(x + 36, top);
    ctx.lineTo(x + 40, top - 60);
    ctx.closePath();
    ctx.fill();
    // the dark thermal panels round the windows
    ctx.fillStyle = 'rgba(26,26,32,0.85)';
    ctx.beginPath();
    ctx.moveTo(x - 66, top - 84);
    ctx.lineTo(x - 8, top - 102);
    ctx.lineTo(x + 30, top - 96);
    ctx.lineTo(x + 26, top - 62);
    ctx.lineTo(x - 62, top - 58);
    ctx.closePath();
    ctx.fill();
    // panel seams
    ctx.strokeStyle = 'rgba(20,22,30,0.4)';
    ctx.lineWidth = 1.2;
    for (const [a, b, c2, d] of [[x - 40, top - 56, x - 40, top], [x + 36, top - 60, x + 36, top], [x - 82, top - 30, x + 84, top - 30]] as const) {
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(c2, d);
      ctx.stroke();
    }
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  cab(ctx);
  ctx.stroke();
  rim(ctx, cab, 0.3, 3);
  // the windows: two triangles, black glass with the sky in it and a hard glint
  for (const pts of [[[x - 58, top - 80], [x - 22, top - 94], [x - 26, top - 64], [x - 58, top - 64]], [[x - 4, top - 96], [x + 22, top - 90], [x + 20, top - 66], [x - 2, top - 66]]] as [number, number][][]) {
    const wp = polyPath(pts);
    ctx.fillStyle = '#05070e';
    wp(ctx);
    ctx.fill();
    within(ctx, wp, () => {
      const wg = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
      wg.addColorStop(0, 'rgba(90,120,200,0.35)');
      wg.addColorStop(0.5, 'rgba(10,14,30,0)');
      wg.addColorStop(1, 'rgba(160,150,140,0.25)');
      ctx.fillStyle = wg;
      ctx.fillRect(x - 60, top - 100, 90, 40);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pts[0][0] + 6, pts[0][1] + 14);
      ctx.lineTo(pts[0][0] + 16, pts[0][1] - 2);
      ctx.stroke();
    });
    ctx.strokeStyle = '#a8acb4';
    ctx.lineWidth = 2;
    wp(ctx);
    ctx.stroke();
  }
  // the hatch under them
  const hatch = rrPath(x - 36, top - 54, 34, 44, 4);
  solid(ctx, hatch, { x: x - 36, y: top - 54, w: 34, h: 44 }, 'enamel', '#a8acb4', { depth: 0.1, line: 2 });
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(x - 10, top - 34, 5, 10);
  // a pizza-slice decal by the hatch
  ctx.fillStyle = '#f4c060';
  ctx.beginPath();
  ctx.moveTo(x + 8, top - 48);
  ctx.lineTo(x + 30, top - 48);
  ctx.lineTo(x + 19, top - 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c8402a';
  ctx.fillRect(x + 8, top - 50, 22, 4);
  for (const [dx, dy] of [[15, -42], [23, -42], [19, -33]]) {
    ctx.beginPath();
    ctx.arc(x + dx, top + dy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // thruster quads on the corners: a box with nozzles up, down and out
  for (const s of [-1, 1]) {
    const qx = x + s * 96;
    const qy = top - 40;
    const q = rrPath(qx - 9, qy - 9, 18, 18, 3);
    solid(ctx, q, { x: qx - 9, y: qy - 9, w: 18, h: 18 }, 'iron', s < 0 ? '#8a8e98' : '#4a4e58', { depth: 0.1, line: 1.8 });
    for (const [dx, dy, a] of [[0, -14, -Math.PI / 2], [0, 14, Math.PI / 2], [s * 14, 0, s < 0 ? Math.PI : 0]] as const) {
      ctx.save();
      ctx.translate(qx + dx, qy + dy);
      ctx.rotate(a);
      ctx.fillStyle = '#2a2a32';
      ctx.beginPath();
      ctx.moveTo(-6, -2.5);
      ctx.lineTo(4, -4.5);
      ctx.lineTo(4, 4.5);
      ctx.lineTo(-6, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  // the docking tunnel on top
  const tun = rrPath(x - 22, top - 126, 36, 22, 3);
  solid(ctx, tun, { x: x - 22, y: top - 126, w: 36, h: 22 }, 'chrome', '#b4b8c0', { depth: 0.1, line: 2.2 });
  // the whip antennas and the dish's mast
  ctx.lineCap = 'round';
  for (const [ax, ay, bx, by] of [[x - 70, top - 86, x - 102, top - 140], [x - 52, top - 96, x - 64, top - 150]] as const) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.strokeStyle = '#d8dce2';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  tube(ctx, x + 42, top - 100, DISH.x - 2, DISH.y + 18, 5, '#c8ccd4');
  specHi(ctx, x - 74, top - 70, 18, 5, 0.6, -0.6);
}

/** The dish at a turn (phase 0…1 about its mast): a shallow paraboloid foreshortened as it turns, its bowl lit when
 * it looks our way (the inner wall away from the sun brightest), its ribbed back when it looks away, the feed on its
 * tripod in front of or behind it, the yoke on the mast. Centre (cx, cy). */
function dish(c: Ctx, phase: number, cx: number, cy: number): void {
  const a = phase * Math.PI * 2;
  const R = 30;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const rx = Math.max(2.5, R * Math.abs(ca));
  const tilt = -0.25;
  // the yoke
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(cx, cy + 20);
  c.lineTo(cx, cy + 4);
  c.stroke();
  c.strokeStyle = '#b8bcc4';
  c.lineWidth = 2;
  c.stroke();
  // (the feed sits on the dish's axis, close enough that its struts always reach it, even edge on)
  const feed: [number, number] = [cx + sa * 13, cy - 3 + tilt * 6];
  const drawFeed = () => {
    c.strokeStyle = 'rgba(60,62,72,1)';
    c.lineWidth = 1.7;
    for (const [dx, dy] of [[0, -R * 0.9], [-Math.max(rx, 4) * 0.85, R * 0.45], [Math.max(rx, 4) * 0.85, R * 0.45]] as const) {
      c.beginPath();
      c.moveTo(cx + dx, cy + dy * 0.95);
      c.lineTo(feed[0], feed[1]);
      c.stroke();
    }
    c.fillStyle = '#d8dce2';
    c.strokeStyle = INK;
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(feed[0], feed[1], 3, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  };
  const facing = ca > 0;
  if (!facing) drawFeed();
  // the bowl's depth: the back shell bulges away from the face
  const back = (k: number) => [cx - sa * 9 * k, cy] as const;
  const [bx, by] = back(1);
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(bx, by, rx * 0.86 + 1.5, R * 0.86 + 1.5, 0, 0, Math.PI * 2);
  c.fill();
  const shell = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  shell.addColorStop(0, '#f2f2ee');
  shell.addColorStop(0.5, '#a8acb4');
  shell.addColorStop(1, '#4a4e58');
  c.fillStyle = shell;
  c.beginPath();
  c.ellipse(bx, by, rx * 0.86, R * 0.86, 0, 0, Math.PI * 2);
  c.fill();
  // the rim
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(cx, cy, rx + 1.6, R + 1.6, 0, 0, Math.PI * 2);
  c.fill();
  if (facing) {
    // the bowl: its left inner wall in shade, the right one taking the sun
    const g = c.createLinearGradient(cx - rx, 0, cx + rx, 0);
    g.addColorStop(0, '#50545e');
    g.addColorStop(0.45, '#8e929a');
    g.addColorStop(1, '#d4d4d0');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2);
    c.fill();
    // concentric panel rings
    c.strokeStyle = 'rgba(30,32,40,0.3)';
    c.lineWidth = 0.8;
    for (const k of [0.4, 0.7]) {
      c.beginPath();
      c.ellipse(cx + sa * 2 * k, cy, rx * k, R * k, 0, 0, Math.PI * 2);
      c.stroke();
    }
  } else {
    // the ribbed back, lit on its left
    const g = c.createLinearGradient(cx - rx, 0, cx + rx, 0);
    g.addColorStop(0, '#f0f0ec');
    g.addColorStop(0.55, '#a0a4ac');
    g.addColorStop(1, '#40444e');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(30,32,40,0.45)';
    c.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(ang) * rx, cy + Math.sin(ang) * R);
      c.stroke();
    }
  }
  if (facing) drawFeed();
}

/** The Feetza flag on its pole and crossbar (no wind: the bar holds it out), a little crumpled from the trip. */
function flag(ctx: Ctx): void {
  const { x, base } = MCX.flag;
  const top = base - 212;
  // the pole driven into the dust: a little ring of pushed-up regolith and its contact shadow
  ctx.fillStyle = 'rgba(5,6,12,0.7)';
  ctx.beginPath();
  ctx.ellipse(x + 7, base + 1, 13, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  tube(ctx, x, base, x, top - 4, 4.5, '#d8dce4');
  ctx.fillStyle = 'rgba(200,194,184,0.85)';
  ctx.beginPath();
  ctx.ellipse(x, base + 1, 8, 2.5, 0, 0, Math.PI);
  ctx.fill();
  // the banner hangs from the horizontal rod (no wind to hold it out): a few broad crumples from the trip,
  // its hem rippled where they run out
  const W2 = 128;
  const H2 = 86;
  const fx0 = x + 2;
  const fy0 = top + 4;
  const fold = (u: number) => Math.sin(u * Math.PI * 2.6 + 0.6) * 0.5 + Math.sin(u * Math.PI * 5.3 + 1.7) * 0.25;
  const f = (c: Ctx) => {
    c.beginPath();
    c.moveTo(fx0, fy0);
    c.lineTo(fx0 + W2, fy0);
    c.lineTo(fx0 + W2 + 2, fy0 + H2 * 0.5);
    c.lineTo(fx0 + W2, fy0 + H2);
    for (let u = 1; u >= 0; u -= 0.05) c.lineTo(fx0 + u * W2, fy0 + H2 + fold(u) * 4);
    c.closePath();
  };
  castShadow(ctx, f, 4, 6, 0.3, INK);
  solid(ctx, f, { x: fx0, y: fy0, w: W2, h: H2 + 6 }, 'canvas', '#c42c26', { depth: 0.08, line: false, formSize: 20 });
  within(ctx, f, () => {
    // the emblem: a slice of pizza with a big footprint stomped in it
    const ex = fx0 + 64;
    const ey = fy0 + 44;
    ctx.fillStyle = '#e8a040';
    ctx.beginPath();
    ctx.moveTo(ex - 30, ey - 28);
    ctx.lineTo(ex + 30, ey - 28);
    ctx.lineTo(ex, ey + 32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8d070';
    ctx.beginPath();
    ctx.moveTo(ex - 25, ey - 22);
    ctx.lineTo(ex + 25, ey - 22);
    ctx.lineTo(ex, ey + 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c8402a';
    for (const [dx, dy] of [[-12, -12], [12, -14], [2, 4]]) {
      ctx.beginPath();
      ctx.arc(ex + dx, ey + dy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(90,40,10,0.55)';
    ctx.beginPath();
    ctx.ellipse(ex + 2, ey - 6, 7, 11, 0.2, 0, Math.PI * 2);
    ctx.fill();
    for (const [dx, dy, s] of [[-6, -20, 2.6], [0, -22, 2.2], [5, -21, 2], [9, -18, 1.8], [12, -14, 1.6]]) {
      ctx.beginPath();
      ctx.arc(ex + dx, ey + dy, s, 0, Math.PI * 2);
      ctx.fill();
    }
    // the folds' light over everything, emblem too: each crumple's sun side lit, its far side in shade
    for (let u = 0; u < 1; u += 1 / W2) {
      const d = fold(u + 0.5 / W2) - fold(u - 0.5 / W2);
      const k = Math.max(-1, Math.min(1, -d * 18));
      ctx.fillStyle = k > 0 ? rgba('#fff0e0', k * 0.3) : rgba('#200000', -k * 0.4);
      ctx.fillRect(fx0 + u * W2, fy0, 1.2, H2 + 6);
    }
    // a soft diagonal crease from the rod's far end
    const cg = ctx.createLinearGradient(fx0 + W2, fy0, fx0 + W2 * 0.55, fy0 + H2 * 0.6);
    cg.addColorStop(0, 'rgba(30,0,0,0.3)');
    cg.addColorStop(1, 'rgba(30,0,0,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(fx0, fy0, W2, H2);
    // the sun on its left, falling off to the right
    const lg = ctx.createLinearGradient(fx0, 0, fx0 + W2, 0);
    lg.addColorStop(0, 'rgba(255,240,220,0.18)');
    lg.addColorStop(0.5, 'rgba(0,0,0,0)');
    lg.addColorStop(1, 'rgba(20,0,0,0.3)');
    ctx.fillStyle = lg;
    ctx.fillRect(fx0, fy0, W2 + 4, H2 + 6);
    // the sleeve along the top, round the rod
    vfill(ctx, fx0, fy0, W2 + 4, 7, [[0, 'rgba(255,230,220,0.3)'], [1, 'rgba(40,0,0,0.35)']]);
  });
  ctx.strokeStyle = '#3a0a08';
  ctx.lineWidth = 2.2;
  f(ctx);
  ctx.stroke();
  // the horizontal support rod along the top, sleeved by the banner, its end cap catching the sun
  tube(ctx, x, top + 2, x + 134, top + 2, 3.5, '#d0d4dc');
  ctx.fillStyle = '#eef0f4';
  ctx.beginPath();
  ctx.arc(x + 134, top + 2, 2.6, 0, Math.PI * 2);
  ctx.fill();
}
const FLAG_BOX = { x: MCX.flag.x - 24, y: MCX.flag.base - 226, w: 176, h: 236 };

// ——— the table: a slab of mare basalt ———

function table(ctx: Ctx, r: R): void {
  const F = MCX.front;
  const box = { x: 0, y: TY, w: W, h: F - TY };
  // dark basalt: slightly lighter far off (grazing light), its tone varying in patches foreshortened by the view
  vfill(ctx, 0, TY, W, F - TY, [[0, '#4a4a54'], [1, '#3a3a44']]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  lay(ctx, drift('#5a5a64', '#2e2e38', 4, 171, 192, 40), box, 0.38);
  // fine grain: pits and glints, smaller with distance
  for (let i = 0; i < 6000; i++) {
    const y = TY + r() * (F - TY);
    const k = (y - TY) / (F - TY);
    const x = r() * W;
    const s = 0.6 + k * 1.1 * r();
    ctx.fillStyle = r() < 0.6 ? 'rgba(10,10,16,0.35)' : 'rgba(170,166,160,0.18)';
    ctx.fillRect(x, y, s * 1.4, s * 0.7);
  }
  // the low sun rakes it from the left; the Earth's faint blue on the far side
  const sg = ctx.createLinearGradient(0, 0, W, 0);
  sg.addColorStop(0, 'rgba(255,240,214,0.12)');
  sg.addColorStop(0.55, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(40,80,170,0.1)');
  ctx.fillStyle = sg;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  // regolith dusted over it: drifted thick against the back edge and the ends, thin where the pizzas sit
  // (the back edge: drifted regolith with a ragged edge, heaped thicker in places, so the slab sits in the ground)
  for (let i = 0; i < 150; i++) {
    const x = r() * W;
    const y = TY + r() ** 2.2 * 34;
    const rx = 20 + r() * 80;
    const ry = 2 + r() * 6;
    const dg = ctx.createRadialGradient(x, y, 0, x, y, rx);
    dg.addColorStop(0, 'rgba(160,154,144,0.45)');
    dg.addColorStop(1, 'rgba(160,154,144,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = dg;
    ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  }
  for (let i = 0; i < 260; i++) {
    const x = r() * W;
    const y = TY + 2 + r() ** 2 * 40;
    const s = 0.8 + r() * 1.8;
    ctx.fillStyle = 'rgba(5,6,12,0.6)';
    ctx.fillRect(x + s * 0.6, y, s * 2.4, s * 0.5);
    ctx.fillStyle = 'rgba(206,200,190,0.8)';
    ctx.fillRect(x, y - s * 0.5, s * 1.3, s * 0.9);
  }
  lay(ctx, noiseMask(7, 71, { cover: 0.25, soft: 0.3, col: '#8a867e', w: 192, h: 40 }), box, 0.14);
  for (const [x0, x1] of [[0, 220], [W - 220, W]] as const) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(x0 === 0 ? 0 : 1, 'rgba(170,164,154,0.3)');
    g.addColorStop(x0 === 0 ? 1 : 0, 'rgba(170,164,154,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, TY, x1 - x0, F - TY);
  }
  // vesicles: gas bubbles frozen in the lava, each a pit with its left wall in shade and its right wall lit
  for (let i = 0; i < 260; i++) {
    const y = TY + 8 + r() * (F - TY - 12);
    const k = (y - TY) / (F - TY);
    const x = r() * W;
    const s = (0.8 + r() ** 2 * 3.2) * (0.5 + k * 0.9);
    ctx.fillStyle = 'rgba(8,8,14,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,214,204,0.3)';
    ctx.lineWidth = Math.max(0.6, s * 0.3);
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.45, 0, -0.9, 1.3);
    ctx.stroke();
  }
  // olivine: tiny green-gold crystals in the basalt, catching the sun
  for (let i = 0; i < 160; i++) {
    const y = TY + 6 + r() * (F - TY - 8);
    const k = (y - TY) / (F - TY);
    const x = r() * W;
    const s = (0.6 + r() * 1.2) * (0.5 + k * 0.8);
    ctx.fillStyle = rgba(r() < 0.5 ? '#a8b860' : '#d8d090', 0.4 + r() * 0.3);
    ctx.fillRect(x, y, s * 1.6, s * 0.8);
  }
  // hairline cracks through the slab
  for (const [cx, cy, a, len] of [[300, 790, 0.5, 160], [1150, 1010, -0.3, 140], [1760, 820, 2.4, 120], [620, 1020, -0.9, 90]] as const) crack(ctx, r, cx, cy, a, len, {});
  // the croc's claw marks raked across the right end: three gouges, their sunward walls lit
  for (let i = 0; i < 3; i++) {
    const x0 = 1716 + i * 26;
    const y0 = 940 + i * 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(6,6,12,0.6)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + 40, y0 + 34, x0 + 96, y0 + 62);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(226,220,210,0.4)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0 + 3, y0 + 2);
    ctx.quadraticCurveTo(x0 + 43, y0 + 36, x0 + 98, y0 + 64);
    ctx.stroke();
  }
  ctx.restore();
  tableFalloff(ctx, F, 0.45, '#02020a');
  // the front: a rough-cut face of the slab, chiselled facets lit from the left
  const lip = rectPath(0, F, W, 1080 - F);
  solid(ctx, lip, { x: 0, y: F, w: W, h: 40 }, DUST, '#3e3e48', { depth: 0, line: false, formSize: 8 });
  within(ctx, lip, () => {
    for (let x = 0; x < W; x += 70 + r() * 120) {
      const w = 60 + r() * 110;
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, 'rgba(255,244,226,0.1)');
      g.addColorStop(0.7, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(4,4,10,0.22)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, F);
      ctx.lineTo(x + w, F);
      ctx.lineTo(x + w - 6 + r() * 12, 1080);
      ctx.lineTo(x - 6 + r() * 12, 1080);
      ctx.closePath();
      ctx.fill();
    }
  });
  // the bevel along the top of the front edge: lit by the sun on the left, falling off to the right
  const bv = ctx.createLinearGradient(0, 0, W, 0);
  bv.addColorStop(0, 'rgba(240,234,222,0.6)');
  bv.addColorStop(0.5, 'rgba(200,196,188,0.32)');
  bv.addColorStop(1, 'rgba(120,124,140,0.2)');
  ctx.fillStyle = bv;
  ctx.fillRect(0, F - 3, W, 6);
  ctx.fillStyle = 'rgba(4,4,10,0.45)';
  ctx.fillRect(0, F + 3, W, 3);
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.06, '#b8c0d8', 0.05, { warm: '#ffc890', cool: '#3a5ad0', a: 0.22 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.1, '#020208', 100, 560);
  vignetteAll(ctx, 0.72, '#010104');
  vfill(ctx, 0, 0, 520, 220, [[0, 'rgba(1,1,4,0.35)'], [1, 'rgba(1,1,4,0)']]);
}

const SKY_BOX = { x: 0, y: 0, w: W, h: MCX.floor };
const WALL_L = { x: 0, y: 440, w: RIM_SPLIT, h: MCX.floor - 440 };
const WALL_R = { x: RIM_SPLIT, y: 440, w: W - RIM_SPLIT, h: MCX.floor - 440 };
const LANDER_BOX = { x: MCX.lander.x - 150, y: DISH.y - 40, w: 330, h: MCX.lander.base - DISH.y + 60 };

export const COSMICCROC: SceneSpec = {
  id: 'cosmiccroc',
  info: {
    name: 'Moon Crater',
    subtitle: 'Boss: COSMIC CROC',
    ambient: [],
    glows: [{ x: MCX.earth.x, y: MCX.earth.y, r: 170, color: '#4ab0ff', flicker: 0 }],
    light: '#e0e4ff',
    tableTint: '#eceef8',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'farHills', box: { x: 0, y: 380, w: W, h: MCX.floor - 380 }, draw: farHills },
    // the meteors' strikes, flashes and ejecta: behind the crater's far wall
    { id: 'farFx', box: FARFX_BOX, motion: 'slot', draw: () => {} },
    { id: 'wallL', box: WALL_L, draw: (c) => farWall(c, WALL_L) },
    { id: 'wallR', box: WALL_R, draw: (c) => farWall(c, WALL_R) },
    { id: 'plain', box: { x: 0, y: MCX.floor, w: W, h: TY - MCX.floor + 4 }, draw: plain },
    { id: 'lander', box: LANDER_BOX, draw: lander },
    { id: 'dishStill', box: { x: DISH.x - 50, y: DISH.y - 40, w: 100, h: 80 }, stillOnly: true, draw: (c) => dish(c, 0.08, DISH.x, DISH.y) },
    { id: 'flag', box: FLAG_BOX, motion: 'sprite', draw: flag },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: frame painters ———

/**
 * One frame of an impact flash (phase 0…1, played once): a white-hot bloom flattened along the ground, rays, and a
 * crown of molten droplets thrown out and cooling from white through orange to dull red as they fall. Ground at
 * (w/2, h·0.72). For an ADD blend.
 */
function flashFrame(c: Ctx, w: number, h: number, p: number): void {
  const cx = w / 2;
  const cy = h * 0.72;
  const I = (1 - p) ** 1.6;
  c.globalCompositeOperation = 'lighter';
  for (const [rad, sy, col, a] of [[30 + p * 90, 0.45, '#ff8a3a', 0.6], [18 + p * 46, 0.6, '#ffd890', 0.85], [8 + p * 14, 0.8, '#ffffff', 1]] as const) {
    c.save();
    c.translate(cx, cy);
    c.scale(1, sy);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rad);
    g.addColorStop(0, rgba(col, a * I));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.fillRect(-rad, -rad, rad * 2, rad * 2);
    c.restore();
  }
  // rays
  if (p < 0.5) {
    const k = 1 - p / 0.5;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.42;
      const L = (40 + (i % 2) * 30) * (0.6 + p * 1.6);
      const g = c.createLinearGradient(cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
      g.addColorStop(0, rgba('#fff4d8', 0.8 * k));
      g.addColorStop(1, rgba('#ffb060', 0));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(cx + Math.cos(a + 1.57) * 3, cy + Math.sin(a + 1.57) * 3);
      c.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L);
      c.lineTo(cx - Math.cos(a + 1.57) * 3, cy - Math.sin(a + 1.57) * 3);
      c.closePath();
      c.fill();
    }
  }
  // molten droplets on ballistic arcs
  const rr = rng(77);
  for (let i = 0; i < 34; i++) {
    const a = -Math.PI / 2 + (rr() - 0.5) * 2.4;
    const v = 0.4 + rr() * 0.6;
    const x = cx + Math.cos(a) * v * p * w * 0.46;
    const y = cy + Math.sin(a) * v * p * h * 0.9 + p * p * h * 0.55;
    if (y > cy + 2) continue;
    const col = p < 0.25 ? '#fff0c8' : p < 0.55 ? '#ffa040' : '#c8401a';
    const s = (1.2 + rr() * 1.6) * (1 - p * 0.5);
    const g = c.createRadialGradient(x, y, 0, x, y, s * 3);
    g.addColorStop(0, rgba(col, 0.95 * (1 - p * 0.7)));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
  }
  c.globalCompositeOperation = 'source-over';
}

/**
 * One frame of an ejecta curtain (phase 0…1, played once) in low gravity, with no air: every grain thrown out at the
 * same steep angle (~45°) at its own speed, so at any moment they all lie on one crisp-edged inverted cone. The slow
 * grains land first, so the curtain lifts off the ground and thins as it rises; the fastest grains along its rim
 * arc out furthest and fall back last; each grain lands as a fleck that settles out, and then the frame is clear.
 * No veil, no billowing. Grains lit on their sun side (left); the cone's right flank and far half in its own shade.
 * Origin (w/2, h - 8).
 */
function ejectaFrame(c: Ctx, w: number, h: number, p: number): void {
  const ox = w / 2;
  const oy = h - 8;
  const rr = rng(4242);
  const A = 0.8;
  const g = 2 * Math.sin(A);
  const peak = Math.sin(A) ** 2 / (2 * g);
  const sx = (w / 2 - 10) / (Math.cos(A) * 1.02);
  const sy = Math.min((h - 18) / peak, sx * 2.6);
  const N = 900;
  const grains = Array.from({ length: N }, () => {
    const az = rr() * Math.PI * 2;
    const a = A + (rr() - 0.5) * 0.05;
    const v = 0.12 + 0.88 * rr() ** 0.75;
    return { az, a, v, size: 0.7 + (1 - v) * 1.4 * (0.6 + rr() * 0.8) + (v > 0.9 ? 0.5 : 0), tone: rr() };
  }).sort((q1, q2) => Math.sin(q2.az) - Math.sin(q1.az));
  for (const gr of grains) {
    const { az, a, v, size } = gr;
    const tLand = (2 * Math.sin(a) * v) / g;
    const t = Math.min(p, tLand);
    const R = Math.cos(a) * v * t;
    const X = R * Math.cos(az);
    const Z = R * Math.sin(az);
    const Y = Math.sin(a) * v * t - 0.5 * g * t * t;
    const x = ox + X * sx;
    // (the ground is seen at a low angle: the far side sits a little higher)
    const lift = -Z * sy * 0.05;
    const y = oy - Y * sy + lift;
    if (p >= tLand) {
      // landed: a fleck that settles out
      const k = 1 - (p - tLand) / 0.18;
      if (k <= 0) continue;
      c.fillStyle = rgba('#b8b2a8', 0.5 * k);
      c.fillRect(x - size, oy + lift, size * 2, Math.max(0.8, size * 0.5));
      continue;
    }
    const far = Math.sin(az) > 0;
    const lit = (X < 0 ? 1 : 0.6) * (far ? 0.7 : 1);
    c.fillStyle = rgba('#14141c', 0.75);
    c.fillRect(x - size * 0.3, y - size * 0.3, size * 1.5, size * 1.5);
    c.fillStyle = rgba(mix('#5a5860', '#f4eee2', lit * (0.6 + gr.tone * 0.4)), 1);
    c.fillRect(x - size * 0.75, y - size * 0.75, size * 1.4, size * 1.4);
  }
  // the scuff where it struck: soft, fading
  const sk = Math.max(0, 1 - p * 1.2);
  if (sk > 0) {
    c.save();
    c.translate(ox, oy);
    c.scale(1, 0.3);
    const sg = c.createRadialGradient(0, 0, 0, 0, 0, 22);
    sg.addColorStop(0, rgba('#1a1a22', 0.45 * sk));
    sg.addColorStop(1, rgba('#1a1a22', 0));
    c.fillStyle = sg;
    c.fillRect(-22, -22, 44, 44);
    c.restore();
  }
}

/** One rock chip (index i): an angular lump lit on its upper left, dark on its lower right, one ink line. */
function rockFrame(c: Ctx, s: number, i: number): void {
  const rr = rng(900 + i * 17);
  const cx = s / 2;
  const cy = s / 2;
  const n = 5 + Math.floor(rr() * 3);
  const pts: [number, number][] = [];
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + rr() * 0.4;
    const rad = s * (0.28 + rr() * 0.16);
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.85]);
  }
  const p = polyPath(pts);
  const g = c.createLinearGradient(cx - s * 0.35, cy - s * 0.35, cx + s * 0.35, cy + s * 0.35);
  g.addColorStop(0, '#f2ece0');
  g.addColorStop(0.45, '#9a968e');
  g.addColorStop(1, '#2a2a32');
  c.fillStyle = g;
  p(c);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 1.2;
  c.stroke();
}

// ——— live ———

interface Strike {
  x: number;
  y: number;
  sc: number;
  t: number;
  head: { x: number; y: number; vx: number; vy: number; left: number } | null;
}

registerKitScene(COSMICCROC, (k) => {
  const fx = k.slot('fx');
  const far = k.slot('farFx');
  // ——— the dish: painted turns, cross-faded, on a springy mast (nothing damps it but the mast itself)
  const DN = 32;
  const dishKey = sheet(k, 'mc_dish', 100, 80, DN, (c, ph) => dish(c, ph, 50, 40));
  const dishLoop = new Loop(k, dishKey, DN, DISH.x, DISH.y, { into: fx });
  const mast = new Spring(0, 14, 0.35);
  let dishPh = 0.08 * DN;
  let dishTarget = dishPh;
  let dishWait = 2;
  const dishGlint = k.glow(DISH.x - 8, DISH.y - 4, 12, 0xfff4e0, 0, { into: fx });
  // the beacon on the ascent stage's thruster quad
  const beacon = k.glow(MCX.lander.x - 96, MCX.lander.base - 212 - 58, 30, 0xff3a2a, 0, { into: fx });
  const beaconCore = k.glow(MCX.lander.x - 96, MCX.lander.base - 212 - 58, 7, 0xffd0c0, 0, { into: fx });
  // ——— the flag: dead still until a stomp, then swinging on and on (no air to damp it)
  const flagImg = k.pivot(k.sprite('flag'), MCX.flag.x, MCX.flag.base);
  const flagSpring = new Spring(0, 5, 0.12);
  const flagGlint = k.glow(MCX.flag.x + 130, MCX.flag.base - 208, 18, 0xffffff, 0, { into: fx });
  // ——— meteors on the hills beyond the wall
  const FW = 220;
  const FH = 140;
  const flashKey = sheet(k, 'mc_flash', FW, FH, 8, (c, p) => flashFrame(c, FW, FH, p));
  const EW = 300;
  const EH = 150;
  const ejKey = sheet(k, 'mc_ejecta', EW, EH, 12, (c, p) => ejectaFrame(c, EW, EH, p));
  const rockKey = sheet(k, 'mc_rocks', 24, 24, 6, (c, _p, i) => rockFrame(c, 24, i));
  const mkStrikeFx = (into: Phaser.GameObjects.Container) => ({
    flash: new Loop(k, flashKey, 8, 0, 0, { into, add: true, origin: [0.5, 0.72] }),
    ej: new Loop(k, ejKey, 12, 0, 0, { into, origin: [0.5, (EH - 8) / EH] }),
    heat: k.glow(0, 0, 40, 0xff7a2a, 0, { into, sy: 0.5 }),
    busy: false,
  });
  const strikeFx = [mkStrikeFx(far), mkStrikeFx(far)];
  for (const s of strikeFx) {
    s.flash.alpha = 0;
    s.ej.alpha = 0;
    s.flash.show(0);
    s.ej.show(0);
  }
  const trail = new Parts(k, { frame: 'ember', add: true, into: far, max: 120 });
  const heads = new Parts(k, { frame: 'spark', add: true, into: far, max: 12 });
  const farRocks = new Parts(k, { frame: 'mote', sheet: { key: rockKey, n: 6, half: 12 }, into: far, max: 60 });
  const strikes: (Strike & { fx: (typeof strikeFx)[number] })[] = [];
  let nextStrike = 2 + crand() * 3;
  const startStrike = () => {
    const s = strikeFx.find((q) => !q.busy);
    if (!s) return;
    s.busy = true;
    const x = STRIKE.x0 + crand() * (STRIKE.x1 - STRIKE.x0);
    const y = 470 + crand() * 40;
    const sc = 0.75 + crand() * 0.5;
    // it comes in from the upper right, steep and fast
    const T = 0.55 + crand() * 0.2;
    const sx = x + 280 + crand() * 220;
    const sy = -30;
    strikes.push({ x, y, sc, t: -T, fx: s, head: { x: sx, y: sy, vx: (x - sx) / T, vy: (y - sy) / T, left: T } });
  };
  // ——— the stomp: regolith thrown off the slab
  // jets: grains thrown out on clean parabolas (low gravity, no air), each drawing a fine trail of dust behind it
  // that hangs where it was left and fades: the arcs read as arcs
  const jets: { x: number; y: number; vx: number; vy: number; floor: number; tint: number; size: number }[] = [];
  const trailDust = new Parts(k, { frame: 'mote', into: fx, max: 600 });
  const heads2 = new Parts(k, { frame: 'mote', into: fx, max: 60 });
  const chips = new Parts(k, { frame: 'mote', sheet: { key: rockKey, n: 6, half: 12 }, into: fx, max: 90 });
  const dust = new Parts(k, { frame: 'mote', into: fx, max: 160 });
  const ringKey = k.tex('mc_ring', 256, 64, (c) => {
    const g = c.createRadialGradient(128, 32, 0, 128, 32, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
    g.addColorStop(0.85, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.save();
    c.scale(1, 0.25);
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    c.restore();
  });
  const rings = Array.from({ length: 2 }, () => ({ img: k.img(ringKey, 0, 0, { into: fx, alpha: 0, tint: 0xb8b2a8 }), t: 99, s: 1 }));
  let ringI = 0;

  return {
    impact(x, y, p) {
      if (p <= 0.02) return;
      const gy = Math.max(TY + 20, Math.min(MCX.front - 10, y));
      // jets of regolith fanning out in arcs
      for (let i = 0; i < 10 + p * 14; i++) {
        const side = crand() < 0.5 ? -1 : 1;
        const a = -Math.PI / 2 + side * (0.35 + crand() * 0.6);
        const sp = (150 + crand() * 230) * (0.55 + p * 0.6);
        jets.push({ x: x + side * crand() * 30, y: gy - 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, floor: gy + (crand() - 0.4) * 26, tint: crand() < 0.6 ? 0xddd7cb : 0x9a968e, size: 1.6 + crand() * 1.6 });
      }
      // chips in slow arcs, bouncing once where they land
      for (let i = 0; i < 6 + p * 16; i++) {
        const a = -Math.PI / 2 + (crand() - 0.5) * 1.9;
        const sp = (160 + crand() * 260) * (0.5 + p * 0.7);
        const fy = gy + (crand() - 0.3) * 40;
        chips.spawn({ x: x + (crand() - 0.5) * 90, y: gy - 4, vx: Math.cos(a) * sp * 0.8, vy: Math.sin(a) * sp, life: 3.2 + crand(), r0: 4 + crand() * 6 * (0.6 + p), a: 1, tint: 0xffffff, grav: 170, floor: fy, bounce: 0.3, spin: (crand() - 0.5) * 8, fade: 0.02 });
      }
      for (let i = 0; i < 14 + p * 30; i++) {
        const a = -Math.PI / 2 + (crand() - 0.5) * 2.2;
        const sp = (60 + crand() * 200) * (0.5 + p * 0.6);
        dust.spawn({ x: x + (crand() - 0.5) * 120, y: gy - 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, life: 2.2 + crand() * 1.2, r0: 2 + crand() * 3, a: 0.9, tint: crand() < 0.5 ? 0xd8d2c6 : 0x8a8680, grav: 140, floor: gy + (crand() - 0.3) * 30 });
      }
      const rg = rings[ringI++ % rings.length];
      rg.t = 0;
      rg.s = 0.6 + p * 0.9;
      rg.img.setPosition(x, gy + 6);
      // the flag and the mast take the shock through the ground
      flagSpring.v += (x < MCX.flag.x ? 1 : -1) * (0.05 + p * 0.12) * calm();
      mast.v += (x < DISH.x ? 1 : -1) * (20 + p * 60) * calm();
    },
    update(dt, t) {
      const flashes = save.settings.flashes && !save.settings.reducedMotion;
      // ——— dish: sweeps to a new heading, holds, sweeps again
      dishWait -= dt;
      if (dishWait < 0) {
        dishTarget = dishPh + (crand() < 0.5 ? -1 : 1) * (4 + crand() * 12);
        dishWait = 4 + crand() * 5;
      }
      dishPh += Phaser.Math.Clamp(dishTarget - dishPh, -dt * 5, dt * 5) * calm();
      const ph = ((dishPh % DN) + DN) % DN;
      const wob = mast.step(0, dt);
      dishLoop.show(ph);
      dishLoop.each((im) => im.setPosition(DISH.x + wob * 0.08, DISH.y - Math.abs(wob) * 0.01).setRotation(wob * 0.004));
      // a flash when its bowl turns to the sun (facing left and towards us)
      const ang = (ph / DN) * Math.PI * 2;
      const face = Math.cos(ang) * 0.6 - Math.sin(ang) * 0.8;
      dishGlint.setAlpha(Math.max(0, face) ** 16 * 0.35);
      // ——— beacon: a double strobe
      const bt = t % 1.6;
      const on = bt < 0.06 || (bt > 0.2 && bt < 0.26) ? 1 : 0;
      beacon.setAlpha(on * (flashes ? 0.7 : 0.35));
      beaconCore.setAlpha(on * 0.9);
      // ——— flag
      const fa = flagSpring.step(0, dt);
      flagImg.setRotation(fa);
      flagGlint.setPosition(MCX.flag.x + Math.cos(fa) * 130 + Math.sin(-fa) * 4, MCX.flag.base - 208 + Math.sin(fa) * 130).setAlpha(Math.max(0, Math.sin(t * 0.5)) ** 40 * 0.7);
      // ——— meteors
      nextStrike -= dt * calm();
      if (nextStrike < 0) {
        startStrike();
        nextStrike = 4 + crand() * 5;
      }
      for (let i = strikes.length - 1; i >= 0; i--) {
        const s = strikes[i];
        s.t += dt;
        const h = s.head;
        if (h) {
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          h.left -= dt;
          heads.spawn({ x: h.x, y: h.y, vx: h.vx, vy: h.vy, life: 0.05, r0: 8 * s.sc, a: 1, tint: 0xfff4e0, streak: 0.014 });
          for (let j = 0; j < 3; j++) trail.spawn({ x: h.x - h.vx * dt * crand(), y: h.y - h.vy * dt * crand(), vx: h.vx * 0.03, vy: h.vy * 0.03, life: 0.25 + crand() * 0.2, r0: 4 * s.sc, r1: 0.5, a: 0.7, tint: crand() < 0.6 ? 0xffb060 : 0xfff0d0, drag: 2 });
          if (h.left <= 0) {
            s.head = null;
            s.t = 0;
            // the strike: flash, curtain, rocks flung over the wall
            s.fx.flash.each((im) => im.setPosition(s.x, s.y).setScale(s.sc * 1.2));
            s.fx.ej.each((im) => im.setPosition(s.x, s.y + 6).setScale(s.sc));
            s.fx.heat.setPosition(s.x, s.y + 2);
            for (let j = 0; j < 8; j++) {
              const a = -Math.PI / 2 + (crand() - 0.5) * 1.8;
              const sp = (70 + crand() * 90) * s.sc;
              farRocks.spawn({ x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 3.6, r0: (1.4 + crand() * 2) * s.sc, a: 1, tint: 0xffffff, grav: 36 * s.sc, floor: s.y + 20 + crand() * 20, spin: (crand() - 0.5) * 3, fade: 0.02 });
            }
          }
          continue;
        }
        const ft = s.t / 0.55;
        s.fx.flash.alpha = ft < 1 ? (flashes ? 1 : 0.4) : 0;
        s.fx.flash.show(Math.min(7.0, ft * 8));
        const et = s.t / 4.2;
        s.fx.ej.alpha = et < 1 ? 1 : 0;
        s.fx.ej.show(Math.min(10.99, et * 11));
        s.fx.heat.setAlpha(Math.max(0, 1 - s.t / 2.5) ** 2 * 0.7);
        if (s.t > 4.3) {
          s.fx.busy = false;
          s.fx.flash.alpha = 0;
          s.fx.ej.alpha = 0;
          s.fx.flash.show(0);
          s.fx.ej.show(0);
          strikes.splice(i, 1);
        }
      }
      trail.update(dt);
      heads.update(dt);
      farRocks.update(dt);
      // ——— stomps
      // jets: move on their parabolas, lay a trail, settle as a puff where they land
      for (let i = jets.length - 1; i >= 0; i--) {
        const j = jets[i];
        j.vy += 150 * dt;
        j.x += j.vx * dt;
        j.y += j.vy * dt;
        heads2.spawn({ x: j.x, y: j.y, vx: j.vx, vy: j.vy, life: 0.05, r0: j.size * 1.6, a: 1, tint: j.tint, streak: 0.02 });
        trailDust.spawn({ x: j.x, y: j.y, vx: j.vx * 0.04, vy: j.vy * 0.04, life: 0.8 + crand() * 0.4, r0: j.size * 1.5, r1: j.size * 0.6, a: 0.75, tint: j.tint, fade: 0.02 });
        if (j.y > j.floor && j.vy > 0) {
          for (let q = 0; q < 3; q++) trailDust.spawn({ x: j.x, y: j.floor, vx: (crand() - 0.5) * 40, vy: -crand() * 12, life: 0.7, r0: 2.5, r1: 5, a: 0.5, tint: 0xb8b2a8, fade: 0.05 });
          jets.splice(i, 1);
        }
      }
      trailDust.update(dt);
      heads2.update(dt);
      for (const rg of rings) {
        if (rg.t > 1.6) continue;
        rg.t += dt;
        const u = Math.min(1, rg.t / 1.6);
        rg.img.setScale(rg.s * (0.4 + u * 1.8), rg.s * (0.4 + u * 1.8)).setAlpha((1 - u) ** 1.5 * 0.8);
      }
      chips.update(dt);
      dust.update(dt);
    },
  };
});
