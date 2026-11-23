// Downtown Ruins (Doomstomp's arena, Act 7's boss: wave 65), redrawn with the location kit (src/art/scene) in the act's
// pulp-comic print (src/art/scene/print.ts), like Metropizza Rooftops (scene-metropizza.ts): the same city, the same
// night, a few blocks down, after Doomstomp came through. Bold ink weighted on the shadow side, flat colour modelled in
// halftone dots, Ben-Day skies. The key light is the fire: the burning district off the left and the blaze in the
// tenement's torn corner throw a hot orange on every left face; the right faces drop into a violet dot-screen shade;
// a blood moon rims the far edges cool.
//
// Down in the street. A red night sky under banks of smoke lit from below, the blood moon between them. The far city
// (Metropizza's skyline, its own shapes) bitten into, its rooftops burning, and the Metropizza Tower snapped off above
// its shaft, girders sticking out of the break. Left, the brick tenement with its corner torn away (the floors open
// like a doll's house, burning inside). Next to it the Metropizza pizzeria, its windows blown in and its awning in
// rags, and its billboard torn off the trestle on the roof: it hangs by one corner, its right end ripped away, a
// broken neon tube dangling from the tear. Right, the ochre building with Doomstomp's bootprint kicked into its face,
// the fire escape wrenched off and hanging. The street: the pizza globe from the top of the tower crashed into the
// asphalt with its ring snapped, a cab flattened under a bootprint, a lamp post bent double, a hydrant knocked off its
// main. The table is a slab of the sidewalk, cracked, with the Daily Slice blown onto it.
//
// Live, the heroes:
// - the fires: comic flames painted at 12 phases (inked tongues in red, orange, yellow and a hot core, licks breaking
//   off the tips and rising), in the torn corner, the bootprint and the shop; their light breathing on the walls;
//   embers rising on the heat with drift; a stomp makes them flare and throw a burst of embers;
// - the hydrant: a geyser out of the broken main painted at 12 phases (bulges running up the column, the crown
//   churning, sheets breaking into drops that fall in arcs), drops falling with gravity and splashing in the puddle
//   it has made; a stomp makes it surge;
// - the billboard: hung by its corner on a damped spring that a stomp swings, its surviving neon letters buzzing (the
//   P stutters), the torn tube spitting sparks that bounce down the shop front.
// Also: smoke columns off the far city (painted frames, leaning on the wind), comic bolts behind the skyline (the
// act's layer, src/game/acts/act7.ts, flashes the screen and thunders when one strikes), the lamp's broken bulb
// flickering, grit and chunks off the torn edges when he stomps. An arena: one wave, no progression.
// (The old art is kept in scenes-act7.ts for the before/after page.)

import Phaser from 'phaser';
import { type Box, type Ctx, type PathFn, type R, TY, W, calmLanes, castShadow, ellPath, glowAt, gradeAll, groundShadow, polyPath, rectPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { benDay, bolt, boltPath, dots, dotsIn, flat, ink, linTone, radTone, speedLines } from '../../art/scene/print';
import { mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, registerKitScene, wander } from '../../game/sceneLive';
import { Loop, Parts, Rate, Spring, Swing, sheet } from '../../game/sceneAnim';
import { BLOCK, type Bldg, INK, P2, ROWS, SIGN, bldgPath, comicCloud, letterXs, neonTubes, signFace, smooth, starField, windowsOf } from './scene-metropizza';

// ——— layout ———

export const DR = {
  /** The far sidewalk's back (the buildings' feet), the kerb, the road up to the table. */
  walk: 648,
  kerb: 666,
  road: 674,
  front: 1040,
  /** The far city's base (hidden behind the street) and where the sky stops. */
  horizon: 652,
  moon: { x: 1352, y: 132, r: 54 },
  tower: { x: 1130, x0: 1056, x1: 1204, brk: 292 },
  tenement: { x1: 336, side: 360, cornice: 64 },
  shop: { x0: 360, x1: 896, roof: 500 },
  right: { x0: 1584, side: 1562 },
  print: { x: 1762, y: 322 },
  hydrant: { x: 1262, y: 654 },
  globe: { x: 1494, y: 712, r: 66 },
  taxi: { x: 690, y: 726 },
  lamp: { x: 1008, y: 652 },
  table: { box: { x: 150, y: 808 }, paper: { x: 1730, y: 812 } },
};

const SHADE = '#2c1640';
const FIRE = '#ff8a2a';

// ——— the sky ———

const SKY_BOX = { x: 0, y: 0, w: W, h: DR.horizon };
const SMOKE_PAL = { body: '#5a2a3a', lit: '#8a3e40', shade: '#2a1224', ink: '#12060e', dot: '#14060e' };

/** The underside of a smoke bank lit by the fires below: a hot rim along its base. */
function emberCloud(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, a = 1): void {
  comicCloud(ctx, r, x, y, w, h, SMOKE_PAL, a);
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, y - h * 0.3, 0, y + h * 0.1);
  g.addColorStop(0, 'rgba(255,120,60,0)');
  g.addColorStop(1, 'rgba(255,120,60,0.55)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.12, w / 2 - 6, h * 0.2, 0, 0, P2);
  ctx.fill();
  ctx.restore();
}

function sky(ctx: Ctx, r: R): void {
  // a red night: violet-black overhead, through wine to a hot orange over the burning city
  vfill(ctx, 0, 0, W, DR.horizon, [[0, '#160a22'], [0.32, '#3c1232'], [0.62, '#8a2430'], [0.86, '#d84a2a'], [1, '#ff8a3a']]);
  // the burning district off the left: the sky glows hotter there
  const g = ctx.createRadialGradient(-160, 560, 40, -160, 560, 1100);
  g.addColorStop(0, 'rgba(255,170,80,0.75)');
  g.addColorStop(0.5, 'rgba(255,110,60,0.25)');
  g.addColorStop(1, 'rgba(255,110,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, DR.horizon);
  // printed: fat navy Ben-Day dots thinning down from the zenith, magenta dots gathering in the glow
  benDay(ctx, { x: 0, y: 0, w: W, h: 380 }, '#06030e', 0.6, 13, 0.55, 0.04, 0.79);
  dots(ctx, { x: 0, y: 300, w: W, h: DR.horizon - 300 }, (x, yy) => smooth(300, 640, yy) * (0.28 + 0.14 * smooth(400, 1900, x)), '#ffcf5a', { step: 11, angle: 0, a: 0.4 });
  starField(ctx, r, 0, 0, W, 200, 40, 0.5);
  // the blood moon, veiled in smoke, with its printed speed lines
  const m = DR.moon;
  glowAt(ctx, m.x, m.y, 240, '#ff9a6a', 0.22);
  speedLines(ctx, r, m.x, m.y, m.r * 1.5, 400, 46, '#ffd0a0', 0.06);
  flat(ctx, ellPath(m.x, m.y, m.r, m.r), '#ffb87a', 4, '#4a1420');
  within(ctx, ellPath(m.x, m.y, m.r, m.r), () => {
    for (const [dx, dy, cr] of [[-16, -12, 11], [14, 8, 8], [-4, 20, 7], [18, -18, 5], [-22, 12, 5]] as const) {
      ctx.fillStyle = '#e8925a';
      ctx.beginPath();
      ctx.arc(m.x + dx, m.y + dy, cr, 0, P2);
      ctx.fill();
    }
    dots(ctx, { x: m.x - m.r, y: m.y - m.r, w: m.r * 2, h: m.r * 2 }, linTone(m.x - m.r * 0.2, m.y - m.r * 0.2, m.x + m.r, m.y + m.r, 0, 0.85), '#8a2a3a', { step: 6, angle: 0.79, a: 0.75 });
  });
  // smoke banks: dark, inked, lit orange underneath; one drawn across the moon
  for (const [cx, cy, cw, ch] of [[560, 150, 520, 90], [1640, 230, 460, 80], [1000, 330, 420, 60], [260, 360, 360, 66], [1340, 196, 300, 46]] as const) emberCloud(ctx, r, cx, cy, cw, ch, 0.95);
  for (const [cx, cy, cw, ch] of [[820, 470, 520, 70], [1500, 470, 560, 76], [180, 500, 420, 70]] as const) emberCloud(ctx, r, cx, cy, cw, ch, 0.8);
}

// ——— the far city (Metropizza's skyline, bitten into and burning) ———

const FAR_BOX = { x: 0, y: 300, w: W, h: DR.horizon + 8 - 300 };
const FAR_DY = DR.horizon - 614;

/** A building's bite: a jagged notch out of one top corner (seeded per building). */
function bitePath(b: Bldg, r: R): [number, number][] {
  const left = r() < 0.5;
  const d = 20 + r() * 50;
  const xA = left ? b.x - 4 : b.x + b.w * (0.35 + r() * 0.3);
  const xB = left ? b.x + b.w * (0.35 + r() * 0.3) : b.x + b.w + 4;
  const pts: [number, number][] = [[xA, b.top - 160]];
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const deep = left ? 1 - u : u;
    pts.push([xA + (xB - xA) * u, b.top + d * deep * (0.6 + r() * 0.6) - 4]);
  }
  pts.push([xB, b.top - 160]);
  return pts;
}

function farCity(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.translate(0, FAR_DY);
  for (const row of [1, 0]) {
    const air = row ? '#c84a3a' : '#8a2a36';
    for (const b of ROWS[row]) {
      const br = rng(b.seed + 5);
      const bitten = br() < 0.5;
      const bite = bitten ? bitePath(b, br) : null;
      const shape: PathFn = (c) => bldgPath(b)(c);
      ctx.save();
      if (bite) {
        // the bite is cut out of the shape with an even-odd clip
        ctx.beginPath();
        ctx.rect(-100, -100, W + 200, 1000);
        bite.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.clip('evenodd');
      }
      const col = mix(row ? '#7a3a52' : '#4a2034', row ? '#e07a6a' : air, row ? 0.34 : 0.14);
      shape(ctx);
      ctx.fillStyle = col;
      ctx.fill();
      within(ctx, shape, () => {
        // the fire's light on the left faces, the shade in dots to the right
        ctx.fillStyle = rgba(FIRE, row ? 0.2 : 0.28);
        ctx.fillRect(b.x, b.top - 160, Math.max(4, b.w * 0.12), 800);
        dots(ctx, { x: b.x, y: b.top - 160, w: b.w, h: 800 }, linTone(b.x + b.w * 0.3, 0, b.x + b.w, 0, 0.1, row ? 0.5 : 0.7), '#14061a', { step: row ? 5 : 6, angle: 0.79 });
        // windows: most dark, a few burning
        for (const [x, y, cw, ch, v] of windowsOf(b)) {
          if (v < 0.4) continue;
          ctx.fillStyle = v > 0.93 ? rgba('#ffb04a', 0.9) : rgba('#14061a', row ? 0.35 : 0.5);
          ctx.fillRect(x, y, cw, ch);
        }
        // the glow of the fires below creeping up the facades
        vfill(ctx, b.x, DR.horizon - 120 - FAR_DY, b.w, 120, [[0, 'rgba(255,120,60,0)'], [1, rgba('#ff7a3a', row ? 0.45 : 0.3)]]);
      });
      ink(ctx, shape, row ? 1.4 : 2, mix(INK, air, row ? 0.45 : 0.2), 0.5);
      ctx.restore();
      if (bite) {
        // the broken edge: inked, a girder or two poking out of it
        ctx.strokeStyle = mix(INK, air, row ? 0.45 : 0.2);
        ctx.lineWidth = row ? 1.4 : 2;
        ctx.beginPath();
        bite.slice(1, -1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        const [gx, gy] = bite[2 + Math.floor(br() * 3)];
        ctx.lineWidth = row ? 1.2 : 1.8;
        ctx.beginPath();
        ctx.moveTo(gx, gy + 4);
        ctx.lineTo(gx + (br() - 0.5) * 20, gy - 10 - br() * 14);
        ctx.stroke();
      }
    }
    // smoke haze between the rows and over the bases
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    vfill(ctx, 0, 420 - FAR_DY, W, 200, [[0, rgba(air, 0)], [1, rgba(air, row ? 0.5 : 0.3)]]);
    ctx.restore();
  }
  ctx.restore();
  // fires on the far rooftops: hot glows with a printed flame in each (the live layer adds smoke columns over them)
  for (const [fx, fy, s] of FAR_FIRES) {
    // the burning building's broken top under the fire: a ruined silhouette, lit by its own flames
    const k = s * 1.7;
    const ruin = polyPath([[fx - 70 * k, DR.horizon + 4], [fx - 70 * k, fy + 30], [fx - 52 * k, fy + 18], [fx - 40 * k, fy + 24], [fx - 22 * k, fy + 2], [fx - 6 * k, fy + 8], [fx + 14 * k, fy - 4], [fx + 30 * k, fy + 10], [fx + 46 * k, fy + 4], [fx + 70 * k, fy + 34], [fx + 70 * k, DR.horizon + 4]]);
    flat(ctx, ruin, '#7a3a48', 1.6, mix(INK, '#c84a3a', 0.3), 0.4);
    within(ctx, ruin, () => {
      vfill(ctx, fx - 70 * k, fy - 10, 140 * k, 50, [[0, 'rgba(255,140,60,0.7)'], [1, 'rgba(255,140,60,0)']]);
      dots(ctx, { x: fx - 70 * k, y: fy - 10, w: 140 * k, h: DR.horizon - fy + 14 }, linTone(fx, 0, fx + 70 * k, 0, 0.1, 0.6), '#12040c', { step: 5, angle: 0.79 });
    });
    glowAt(ctx, fx, fy, 70 * s, '#ff8a3a', 0.5);
    farFlame(ctx, fx, fy + 2, s);
  }
  void r;
}

/** Fires on the far rooftops: where the smoke columns rise from. */
const FAR_FIRES: [number, number, number][] = [
  [962, 552, 0.66],
  [1424, 538, 0.6],
];

function farFlame(ctx: Ctx, x: number, y: number, s: number): void {
  const tongue = (w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 0.8, y - h * 0.6, x - w * 0.3, y - h * 0.7);
    ctx.lineTo(x - w * 0.1, y - h);
    ctx.quadraticCurveTo(x + w * 0.2, y - h * 0.6, x + w * 0.4, y - h * 0.82);
    ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.5, x + w, y);
    ctx.closePath();
    ctx.fill();
  };
  ctx.save();
  ctx.strokeStyle = '#2a0a10';
  ctx.lineWidth = 2;
  tongue(26 * s, 40 * s, '#e0321a');
  ctx.stroke();
  tongue(16 * s, 28 * s, '#ff9a2a');
  tongue(8 * s, 16 * s, '#ffe68a');
  ctx.restore();
}

// ——— the Metropizza Tower, snapped ———

const TOWER_BOX = { x: 1020, y: 230, w: 220, h: DR.horizon + 8 - 230 };

function tower(ctx: Ctx, r: R): void {
  const { x0, x1, brk } = DR.tower;
  const bottom = DR.horizon + 6;
  // the jagged break across the shaft's top
  const top: [number, number][] = [[x0, brk + 34], [x0 + 18, brk + 12], [x0 + 34, brk + 26], [x0 + 52, brk - 6], [x0 + 70, brk + 8], [x0 + 88, brk - 18], [x0 + 104, brk + 4], [x0 + 122, brk + 20], [x0 + 136, brk + 6], [x1, brk + 30]];
  const shape = polyPath([...top, [x1, bottom], [x0, bottom]]);
  // the left side face, catching the fire
  const sw = 16;
  const side = polyPath([[x0, brk + 34], [x0 - sw, brk + 40], [x0 - sw, bottom], [x0, bottom]]);
  flat(ctx, side, '#e8a070', 0, INK);
  within(ctx, side, () => dots(ctx, { x: x0 - sw, y: brk, w: sw, h: bottom - brk }, linTone(0, brk, 0, bottom, 0.1, 0.45), '#8a3a2a', { step: 5, angle: 0 }));
  ink(ctx, side, 2.2, INK, 0);
  flat(ctx, shape, '#d8bc94', 0, INK);
  within(ctx, shape, () => {
    // piers and window strips; most windows dark, a few burning
    const n = 8;
    const pw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const px = x0 + i * pw;
      ctx.fillStyle = '#4a3040';
      ctx.fillRect(px + pw * 0.3, brk - 20, pw * 0.42, bottom - brk + 20);
      ctx.fillStyle = '#7a5a5a';
      for (let y = brk + 10; y < bottom; y += 16) ctx.fillRect(px + pw * 0.3, y, pw * 0.42, 3);
      for (let y = brk + 30 + ((i * 37) % 40); y < bottom - 20; y += 64 + i * 5) {
        if (r() < 0.4) {
          ctx.fillStyle = '#ffb04a';
          ctx.fillRect(px + pw * 0.3, y, pw * 0.42, 10);
        }
      }
    }
    ctx.fillStyle = rgba(FIRE, 0.3);
    ctx.fillRect(x0, brk, 26, bottom - brk);
    dots(ctx, { x: x0, y: brk - 30, w: x1 - x0, h: bottom - brk + 30 }, linTone(x0 + (x1 - x0) * 0.35, 0, x1, 0, 0.05, 0.8), SHADE, { step: 6, angle: 0.79, a: 0.85 });
    // soot up the shaft from the break and its burning floors
    vfill(ctx, x0, brk - 30, x1 - x0, 140, [[0, 'rgba(20,6,14,0.85)'], [1, 'rgba(20,6,14,0)']]);
    // the glow of the street fires climbing the base
    vfill(ctx, x0, bottom - 160, x1 - x0, 160, [[0, 'rgba(255,110,50,0)'], [1, 'rgba(255,110,50,0.4)']]);
  });
  ink(ctx, shape, 2.6, INK, 0.6);
  // the girders sticking out of the break, bent; a hot glow inside the top floor
  glowAt(ctx, DR.tower.x - 6, brk + 18, 60, '#ff7a2a', 0.55, 0.6);
  ctx.lineCap = 'round';
  for (const [gx, gy, ex, ey] of [[x0 + 20, brk + 16, x0 + 6, brk - 34], [x0 + 60, brk + 4, x0 + 72, brk - 52], [x0 + 96, brk - 6, x0 + 120, brk - 40], [x0 + 130, brk + 10, x1 + 14, brk - 14]] as const) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo((gx + ex) / 2 + 6, (gy + ey) / 2, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#7a5a5a';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,170,110,0.8)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

// ——— the tenement, its corner torn away ———

const TEN_BOX = { x: 0, y: 0, w: DR.tenement.side + 12, h: DR.walk + 10 };
const BRICK = '#a84a38';
/** The back walls' ragged top (the building's silhouette where its corner was torn off), down to the side wall. */
const SIL: [number, number][] = [[118, 58], [148, 70], [172, 62], [204, 92], [236, 84], [262, 118], [298, 120], [322, 150], [348, 154], [362, 188]];
/** The facade's torn edge: lower than the back walls, so the rooms show between them. */
const TEAR: [number, number][] = [[104, 64], [118, 104], [110, 128], [148, 150], [142, 176], [184, 208], [178, 236], [226, 262], [220, 290], [266, 314], [260, 344], [304, 360], [300, 380], [336, 398]];
/** The floors exposed by the tear: their slabs' tops. */
const FLOORS = [140, 220, 300, 380];

/** The torn-open part: the rooms between the back walls' top and the facade's torn edge. */
function interiorShape(c: Ctx): void {
  c.beginPath();
  SIL.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.lineTo(362, 410);
  for (let i = TEAR.length - 1; i >= 0; i--) c.lineTo(TEAR[i][0], TEAR[i][1]);
  c.closePath();
}

function tenement(ctx: Ctx, r: R): void {
  const { x1, side, cornice } = DR.tenement;
  const bottom = DR.walk + 2;
  // the side face, in deep shade (it turns away from the fire)
  const sideP = polyPath([[x1, 398], [side, 404], [side, bottom], [x1, bottom]]);
  flat(ctx, sideP, '#4a1e32', 0, INK);
  within(ctx, sideP, () => dots(ctx, { x: x1, y: 390, w: side - x1, h: bottom - 390 }, () => 0.7, '#16061a', { step: 5, angle: 0.79 }));
  ink(ctx, sideP, 2.6, INK, 0);
  const face: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-10, cornice);
    for (const [x, y] of TEAR) c.lineTo(Math.min(x, x1), y);
    c.lineTo(x1, bottom);
    c.lineTo(-10, bottom);
    c.closePath();
  };
  flat(ctx, face, BRICK, 0, INK);
  within(ctx, face, () => {
    // courses and inked brick clusters
    ctx.fillStyle = rgba('#4a1810', 0.24);
    for (let y = cornice + 20; y < bottom; y += 9) ctx.fillRect(0, y, x1, 1.4);
    for (let i = 0; i < 18; i++) {
      const bx = r() * x1;
      const by = cornice + 40 + r() * (bottom - cornice - 60);
      ctx.strokeStyle = rgba('#3a1008', 0.55);
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) ctx.strokeRect(bx + (k % 2) * 9 + k * 4, by + k * 9, 18, 9);
    }
    // windows in four bays: blown out, dark rooms behind; some burning
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 4; col++) {
        const wx = 20 + col * 78;
        const wy = cornice + 40 + row * 74;
        if (wy > bottom - 80) continue;
        ctx.fillStyle = '#e0c4a0';
        ctx.fillRect(wx - 6, wy - 10, 52, 9);
        ctx.fillRect(wx - 4, wy + 58, 48, 6);
        const burning = (row === 2 && col === 1) || (row === 4 && col === 0) || (row === 1 && col === 0);
        const g = ctx.createLinearGradient(wx, wy, wx, wy + 56);
        if (burning) {
          g.addColorStop(0, '#ffe08a');
          g.addColorStop(0.6, '#ff7a2a');
          g.addColorStop(1, '#c8301a');
        } else {
          g.addColorStop(0, '#1a0a1a');
          g.addColorStop(1, '#3a1626');
        }
        ctx.fillStyle = g;
        ctx.fillRect(wx, wy, 40, 56);
        // the broken glass: jagged teeth left in the frame
        ctx.fillStyle = rgba('#9ab8d0', burning ? 0.3 : 0.55);
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + 14, wy);
        ctx.lineTo(wx + 4, wy + 18);
        ctx.lineTo(wx, wy + 30);
        ctx.closePath();
        ctx.moveTo(wx + 40, wy + 56);
        ctx.lineTo(wx + 24, wy + 56);
        ctx.lineTo(wx + 34, wy + 40);
        ctx.lineTo(wx + 40, wy + 26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgba('#1c0c20', 0.55);
        ctx.fillRect(wx, wy, 40, 5);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(wx, wy, 40, 56);
        if (burning) {
          // soot licking up the brick from the window head
          const sg = ctx.createLinearGradient(0, wy - 50, 0, wy);
          sg.addColorStop(0, 'rgba(20,6,10,0)');
          sg.addColorStop(1, 'rgba(20,6,10,0.7)');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.moveTo(wx - 2, wy - 10);
          ctx.quadraticCurveTo(wx + 10, wy - 46, wx + 20, wy - 60);
          ctx.quadraticCurveTo(wx + 34, wy - 40, wx + 44, wy - 10);
          ctx.fill();
        }
      }
    // the fire's light from the left, the shade deepening right and down in dots
    ctx.fillStyle = rgba(FIRE, 0.2);
    ctx.fillRect(0, cornice, x1 * 0.35, bottom - cornice);
    dots(ctx, { x: -10, y: cornice, w: x1 + 10, h: bottom - cornice }, (x, y) => 0.5 * smooth(90, x1, x) + 0.25 * smooth(cornice + 120, bottom, y) - 0.04, '#2a0c26', { step: 7, angle: 0.79, a: 0.75 });
    // cracks running from the tear
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 1.8;
    for (const [sx, sy, len, ang] of [[178, 118, 160, 2.0], [254, 206, 200, 1.9], [322, 268, 120, 2.3], [140, 84, 110, 1.75]] as const) {
      let x = sx;
      let y = sy;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += Math.cos(ang + (r() - 0.5) * 0.9) * (len / 6);
        y += Math.sin(ang + (r() - 0.5) * 0.9) * (len / 6);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // the cornice's flat shadow
    ctx.fillStyle = rgba('#1a0614', 0.5);
    ctx.fillRect(-10, cornice, 140, 24);
  });
  ink(ctx, face, 4, INK, 0.9);
  // the torn-open rooms, storey by storey: wallpaper on the back walls in the fire's light, a doorway, a picture
  // knocked askew; the floor slabs' broken ends with their joists; the fire in the middle rooms
  within(ctx, interiorShape, () => {
    const papers = ['#7a4a5a', '#8a5a3a', '#5a4a6a', '#7a3a3a', '#6a5040'];
    for (let k = 0; k < FLOORS.length + 1; k++) {
      const y0 = k ? FLOORS[k - 1] + 10 : 40;
      const y1 = k < FLOORS.length ? FLOORS[k] : 420;
      ctx.fillStyle = papers[k];
      ctx.fillRect(90, y0, 280, y1 - y0);
      ctx.fillStyle = rgba(k % 2 ? '#f0c890' : '#e8a0a0', 0.22);
      if (k % 2) for (let x = 96; x < 370; x += 16) ctx.fillRect(x, y0, 5, y1 - y0);
      else for (let x = 98; x < 370; x += 18) for (let y = y0 + 8; y < y1; y += 18) ctx.fillRect(x + ((y / 18) % 2) * 9, y, 4, 4);
      // the ceiling's shadow at the top of each room, the skirting at the bottom
      vfill(ctx, 90, y0, 280, 16, [[0, 'rgba(20,6,16,0.6)'], [1, 'rgba(20,6,16,0)']]);
      ctx.fillStyle = rgba('#2a0c18', 0.7);
      ctx.fillRect(90, y1 - 6, 280, 6);
    }
    // doorways and a picture knocked askew
    for (const [dx, k] of [[300, 1], [196, 2], [330, 3]] as const) flat(ctx, rectPath(dx, FLOORS[k] - 58, 24, 58), '#1a0610', 1.6, INK, 0);
    ctx.save();
    ctx.translate(236, FLOORS[1] - 44);
    ctx.rotate(0.26);
    flat(ctx, rectPath(-13, -10, 26, 20), '#d8a860', 2, INK, 0);
    flat(ctx, rectPath(-8, -5, 16, 10), '#5a7a9a', 0, INK, 0);
    ctx.restore();
    // the fire's light filling the rooms, strongest round the blaze
    const g = ctx.createRadialGradient(272, 280, 10, 272, 280, 200);
    g.addColorStop(0, 'rgba(255,220,120,0.8)');
    g.addColorStop(0.5, 'rgba(255,130,50,0.4)');
    g.addColorStop(1, 'rgba(255,100,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(90, 40, 280, 380);
    dots(ctx, { x: 90, y: 40, w: 280, h: 380 }, radTone(272, 280, 220, 0.05, 0.8), '#1a0612', { step: 6, angle: 0.79 });
    // soot rolling along under each ceiling from the fire
    for (const fy of FLOORS.slice(0, 3)) vfill(ctx, 90, fy + 10, 280, 30, [[0, 'rgba(16,4,10,0.75)'], [1, 'rgba(16,4,10,0)']]);
    // the floor slabs: concrete, lit along their tops, the joists' ends below
    for (const fy of FLOORS) {
      flat(ctx, rectPath(86, fy, 290, 10), '#9a8a80', 1.8, INK, 0.4);
      ctx.fillStyle = rgba('#ffd0a0', 0.6);
      ctx.fillRect(86, fy, 290, 2);
      ctx.fillStyle = INK;
      for (let x = 96; x < 370; x += 24) ctx.fillRect(x, fy + 10, 7, 6);
    }
  });
  ink(ctx, interiorShape, 3, INK, 0.4);
  // the floors' broken ends jutting out over the torn facade, rebar sticking out of them
  for (const [k, ex] of [[0, 124], [1, 168], [2, 214], [3, 262]] as const) {
    const fy = FLOORS[k];
    flat(ctx, polyPath([[ex, fy], [ex + 34, fy], [ex + 30, fy + 10], [ex - 10, fy + 14]]), '#9a8a80', 1.8, INK, 0.4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(ex - 4, fy + 6);
    ctx.lineTo(ex - 22, fy + 14);
    ctx.moveTo(ex + 2, fy + 10);
    ctx.lineTo(ex - 10, fy + 30);
    ctx.stroke();
  }
  // the cornice: what's left of it, its broken end
  const corn = polyPath([[-10, DR.tenement.cornice - 14], [122, DR.tenement.cornice - 14], [128, DR.tenement.cornice - 4], [116, DR.tenement.cornice + 6], [-10, DR.tenement.cornice + 6]]);
  flat(ctx, corn, '#d8b890', 0, INK);
  within(ctx, corn, () => {
    ctx.fillStyle = '#ffd8a0';
    ctx.fillRect(-10, DR.tenement.cornice - 14, 140, 5);
    ctx.fillStyle = '#6a4a4a';
    for (let x = -4; x < 118; x += 12) ctx.fillRect(x, DR.tenement.cornice - 4, 6, 8);
  });
  ink(ctx, corn, 2.4, INK, 0.6);
  // the brick lips along the tear: ragged courses, lit on top
  ctx.fillStyle = '#d8784a';
  for (let i = 0; i < TEAR.length - 1; i++) {
    const [ax, ay] = TEAR[i];
    const [bx, by] = TEAR[i + 1];
    for (let u = 0; u < 1; u += 0.34) ctx.fillRect(ax + (bx - ax) * u - 4, ay + (by - ay) * u - 2, 9, 4);
  }
  // the fire's glow round the torn corner, on the brick outside it
  glowAt(ctx, 290, 280, 220, '#ff8a3a', 0.35, 0.9);
}

// ——— the Metropizza pizzeria and its trestle ———

const SHOP_BOX = { x: DR.shop.x0 - 4, y: DR.shop.roof - 180, w: DR.shop.x1 - DR.shop.x0 + 24, h: DR.walk + 6 - (DR.shop.roof - 180) };
const POST = { x: 420, top: 330 };

function shop(ctx: Ctx, r: R): void {
  const { x0, x1, roof } = DR.shop;
  const bottom = DR.walk + 2;
  const face = rectPath(x0, roof, x1 - x0, bottom - roof);
  // the right side face, a sliver in shade
  flat(ctx, polyPath([[x1, roof + 4], [x1 + 18, roof + 10], [x1 + 18, bottom], [x1, bottom]]), '#3a1a2a', 2.4, INK, 0);
  flat(ctx, face, '#8a3a40', 0, INK);
  within(ctx, face, () => {
    ctx.fillStyle = rgba('#3a1020', 0.3);
    for (let y = roof + 10; y < bottom; y += 8) ctx.fillRect(x0, y, x1 - x0, 1.2);
    // the upper floor's windows: dark, one lit by fire
    for (let x = x0 + 30, i = 0; x < x1 - 40; x += 70, i++) {
      ctx.fillStyle = i === 2 ? '#ff9a3a' : '#1c0a1a';
      ctx.fillRect(x, roof + 18, 34, 34);
      ctx.fillStyle = rgba('#e8c8a0', 0.8);
      ctx.fillRect(x - 3, roof + 52, 40, 4);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x, roof + 18, 34, 34);
    }
    // the shopfront: the fascia, METROPIZZA in its letters, the plate glass blown in (a dark shop behind)
    flat(ctx, rectPath(x0 + 10, roof + 66, x1 - x0 - 20, 22), '#d8322e', 2, INK, 0);
    ctx.save();
    ctx.font = `20px ${BLOCK}`;
    ctx.fillStyle = '#fff0c8';
    ctx.textAlign = 'center';
    ctx.fillText('METROPIZZA  ·  PIZZERIA', (x0 + x1) / 2 + 20, roof + 84);
    ctx.restore();
    const glassY = roof + 92;
    flat(ctx, rectPath(x0 + 14, glassY, x1 - x0 - 28, bottom - glassY - 4), '#1a0a16', 0, INK);
    // the dark shop: a counter and an oven's glow at the back
    ctx.fillStyle = '#2e1420';
    ctx.fillRect(x0 + 40, bottom - 40, 300, 36);
    const ov = ctx.createRadialGradient(x1 - 130, bottom - 30, 4, x1 - 130, bottom - 30, 60);
    ov.addColorStop(0, 'rgba(255,170,80,0.8)');
    ov.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = ov;
    ctx.fillRect(x1 - 200, glassY, 140, bottom - glassY);
    // glass teeth left in the frames, and the mullions
    ctx.fillStyle = rgba('#a8c8e0', 0.55);
    for (let x = x0 + 14; x < x1 - 30; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, glassY);
      ctx.lineTo(x + 40, glassY);
      ctx.lineTo(x + 8, glassY + 22);
      ctx.lineTo(x, glassY + 40);
      ctx.closePath();
      ctx.moveTo(x + 124, bottom - 6);
      ctx.lineTo(x + 84, bottom - 6);
      ctx.lineTo(x + 120, bottom - 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillRect(x + 124, glassY, 4, bottom - glassY);
      ctx.fillStyle = rgba('#a8c8e0', 0.55);
    }
    // the hanging sign's shadow and the shade to the right, in dots
    dots(ctx, { x: x0, y: roof, w: x1 - x0, h: bottom - roof }, (x, y) => (y > roof + 64 && y < roof + 90 ? 0.25 : 1) * (0.12 + 0.45 * smooth(x0 + 100, x1, x) + 0.15 * smooth(roof, bottom, y)), '#1a0618', { step: 6, angle: 0.79, a: 0.8 });
    ctx.fillStyle = rgba(FIRE, 0.18);
    ctx.fillRect(x0, roof, 120, bottom - roof);
    // the tenement's corner fire lighting the left end
    const tg = ctx.createRadialGradient(x0, roof - 80, 10, x0, roof - 80, 260);
    tg.addColorStop(0, 'rgba(255,150,70,0.4)');
    tg.addColorStop(1, 'rgba(255,150,70,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(x0, roof, 260, bottom - roof);
  });
  ink(ctx, face, 3.4, INK, 0.8);
  // the awning in rags: a striped canvas torn into hanging tongues
  const aw = roof + 88;
  for (let i = 0, x = x0 + 16; x < x1 - 20; i++) {
    const wd = 14 + r() * 22;
    const len = r() < 0.18 ? 4 : 10 + r() * 34;
    const lean = (r() - 0.3) * 8;
    const rag = polyPath([[x, aw], [x + wd, aw], [x + wd - 2 + lean, aw + len * (0.4 + r() * 0.3)], [x + wd * 0.6 + lean, aw + len], [x + wd * 0.3 + lean, aw + len * (0.5 + r() * 0.3)], [x + 1, aw + len * 0.4]]);
    flat(ctx, rag, i % 2 ? '#d8c8b0' : '#a82a2a', 1.6, INK, 0);
    within(ctx, rag, () => dots(ctx, { x, y: aw, w: wd + 10, h: len + 4 }, linTone(0, aw, 0, aw + len, 0.2, 0.7), '#1a0612', { step: 4, angle: 0.79 }));
    x += wd;
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0 + 12, aw);
  ctx.lineTo(x1 - 12, aw);
  ctx.stroke();
  // the parapet's coping, broken at the right
  flat(ctx, polyPath([[x0 - 4, roof - 8], [x1 - 70, roof - 8], [x1 - 60, roof - 2], [x1 - 40, roof - 6], [x1 + 4, roof + 4], [x0 - 4, roof + 4]]), '#c8a888', 2, INK);
  // the trestle: the left post standing (the sign hangs from it), the right ones bent over, the catwalk fallen
  castShadow(ctx, rectPath(POST.x - 5, POST.top, 10, roof - 8 - POST.top), 8, 4, 0.35, '#1a0818');
  flat(ctx, rectPath(POST.x - 6, POST.top, 12, roof - 8 - POST.top), '#5a5060', 2.2, INK, 0.4);
  ctx.fillStyle = rgba('#ffb070', 0.6);
  ctx.fillRect(POST.x - 5, POST.top, 3, roof - 8 - POST.top);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(POST.x, roof - 12);
  ctx.lineTo(POST.x + 96, roof - 70);
  ctx.moveTo(POST.x + 96, roof - 12);
  ctx.lineTo(POST.x, roof - 80);
  ctx.stroke();
  // the second post, buckled at its knee
  const bent: PathFn = (c) => {
    c.beginPath();
    c.moveTo(POST.x + 92, roof - 8);
    c.lineTo(POST.x + 102, roof - 8);
    c.lineTo(POST.x + 104, roof - 60);
    c.lineTo(POST.x + 176, roof - 96);
    c.lineTo(POST.x + 172, roof - 106);
    c.lineTo(POST.x + 94, roof - 66);
    c.closePath();
  };
  flat(ctx, bent, '#5a5060', 2, INK, 0.4);
  // the far posts snapped: stumps, and one lying across the roof
  for (const sx of [SIGN.x1 - 140 + 40, SIGN.x1 - 30 + 40]) flat(ctx, polyPath([[sx - 5, roof - 8], [sx + 5, roof - 8], [sx + 5, roof - 30], [sx + 1, roof - 24], [sx - 5, roof - 34]]), '#5a5060', 1.8, INK, 0.3);
  flat(ctx, polyPath([[640, roof - 14], [800, roof - 30], [802, roof - 22], [642, roof - 6]]), '#4a4252', 1.8, INK, 0.3);
  // a chain dangling from the bent post's head, snapped
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    ctx.ellipse(POST.x + 172, roof - 96 + 6 + k * 7, 2.6, 4, k % 2 ? 0 : 0.4, 0, P2);
    ctx.stroke();
  }
}

// ——— the billboard, hanging by its corner ———

/** Its rest angle, and the hook: the sign's top-left (in Metropizza's sign coordinates) on the post's head. */
const REST = 0.3;
/** It hangs a little smaller than it stood on the rooftop (it's further off, down the street). */
const SIGN_K = 0.84;
const HOOK = { x: SIGN.x0 + 10, y: SIGN.y0 + 6 };
/** Where the sign's right end was ripped away (in sign coordinates). */
const RIP: [number, number][] = (() => {
  // a jagged tear from the bottom edge up to the top-right corner: teeth of splintered board, seeded
  const r = rng(4417);
  const a = [SIGN.x1 - 104, SIGN.y1 + 4];
  const b = [SIGN.x1 - 14, SIGN.y0 - 4];
  const out: [number, number][] = [];
  const n = 13;
  for (let i = 0; i <= n; i++) {
    const u = (i + (i && i < n ? (r() - 0.5) * 0.6 : 0)) / n;
    const off = i === 0 || i === n ? 0 : (r() < 0.6 ? (i % 2 ? 1 : -1) : (i % 2 ? -1 : 1)) * (2 + r() * 12) + Math.sin(u * 5 + 1) * 12;
    out.push([a[0] + (b[0] - a[0]) * u + off * 0.9, a[1] + (b[1] - a[1]) * u + off * 0.45]);
  }
  return out;
})();
const SIGN_BOX = { x: 330, y: 280, w: 500, h: 310 };

/** Into the sign's hanging frame: Metropizza's sign coordinates, hung from the post's head at the angle `ang`. */
function hang(c: Ctx, ang: number): void {
  c.translate(POST.x, POST.top);
  c.rotate(ang);
  c.scale(SIGN_K, SIGN_K);
  c.translate(-HOOK.x, -HOOK.y);
}

function signBody(c: Ctx): PathFn {
  void c;
  return (g) => {
    g.beginPath();
    g.moveTo(SIGN.x0 - 4, SIGN.y0 - 4);
    for (let i = RIP.length - 1; i >= 0; i--) g.lineTo(RIP[i][0], RIP[i][1]);
    g.lineTo(SIGN.x0 - 4, SIGN.y1 + 4);
    g.closePath();
  };
}

/** The torn neon tube's end (in sign coordinates): where the sparks come from. */
const TUBE_END = { x: SIGN.x1 - 120, y: SIGN.y1 + 52 };

function hangingSign(ctx: Ctx, r: R): void {
  ctx.save();
  // its shadow thrown down-right on the shop front behind it
  ctx.save();
  ctx.translate(14, 18);
  hang(ctx, REST);
  ctx.fillStyle = 'rgba(16,4,14,0.4)';
  signBody(ctx)(ctx);
  ctx.fill();
  ctx.restore();
  hang(ctx, REST);
  const body = signBody(ctx);
  within(ctx, body, () => {
    signFace(ctx);
    // scorched round the rip: soot in dots, the board charred
    const sg = ctx.createRadialGradient(SIGN.x1 - 50, SIGN.y1 - 30, 6, SIGN.x1 - 50, SIGN.y1 - 30, 80);
    sg.addColorStop(0, 'rgba(26,8,10,0.85)');
    sg.addColorStop(1, 'rgba(26,8,10,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(SIGN.x0, SIGN.y0, SIGN.x1 - SIGN.x0, SIGN.y1 - SIGN.y0);
    dots(ctx, { x: SIGN.x1 - 240, y: SIGN.y0, w: 240, h: SIGN.y1 - SIGN.y0 }, radTone(SIGN.x1 - 50, SIGN.y1 - 30, 100, 0.9, 0), '#1a0808', { step: 5, angle: 0.79 });
    // the fire's light on its left end; the rest in a deeper shade than on the rooftop
    dots(ctx, { x: SIGN.x0, y: SIGN.y0, w: SIGN.x1 - SIGN.x0, h: SIGN.y1 - SIGN.y0 }, linTone(SIGN.x0 + 160, 0, SIGN.x1, 0, 0.04, 0.4), SHADE, { step: 5, angle: 0.79, a: 0.5 });
    ctx.fillStyle = rgba('#ffa050', 0.2);
    ctx.fillRect(SIGN.x0, SIGN.y0, 120, SIGN.y1 - SIGN.y0);
    // dents and a crease where it hit the trestle
    ctx.strokeStyle = rgba(INK, 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SIGN.x0 + 180, SIGN.y0);
    ctx.lineTo(SIGN.x0 + 196, SIGN.y0 + 60);
    ctx.lineTo(SIGN.x0 + 188, SIGN.y1);
    ctx.stroke();
    ctx.strokeStyle = rgba('#fff0d0', 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(SIGN.x0 + 183, SIGN.y0);
    ctx.lineTo(SIGN.x0 + 199, SIGN.y0 + 60);
    ctx.lineTo(SIGN.x0 + 191, SIGN.y1);
    ctx.stroke();
  });
  ink(ctx, body, 4.4, INK, 0.9);
  // the rip's raw edge: splintered plywood and the frame's torn steel
  ctx.strokeStyle = '#e8c890';
  ctx.lineWidth = 2;
  ctx.beginPath();
  RIP.forEach(([x, y], i) => (i ? ctx.lineTo(x - 3, y) : ctx.moveTo(x - 3, y)));
  ctx.stroke();
  // the torn neon tube dangling from the rip, bent, its glass broken off at the end
  ctx.lineCap = 'round';
  const tube = (c: Ctx) => {
    c.beginPath();
    c.moveTo(SIGN.x1 - 92, SIGN.y1 - 30);
    c.bezierCurveTo(SIGN.x1 - 70, SIGN.y1 - 6, SIGN.x1 - 120, SIGN.y1 + 14, TUBE_END.x, TUBE_END.y);
  };
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  tube(ctx);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,210,210,0.75)';
  ctx.lineWidth = 2.2;
  tube(ctx);
  ctx.stroke();
  // the wires out of its end
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(TUBE_END.x, TUBE_END.y);
  ctx.lineTo(TUBE_END.x + 6, TUBE_END.y + 10);
  ctx.moveTo(TUBE_END.x, TUBE_END.y);
  ctx.lineTo(TUBE_END.x - 5, TUBE_END.y + 12);
  ctx.stroke();
  // the shackle on the hook
  flat(ctx, ellPath(HOOK.x, HOOK.y - 6, 7, 9), 'rgba(0,0,0,0)', 3, INK, 0);
  ctx.restore();
  void r;
}

// ——— the ochre building, kicked in ———

const RIGHT_BOX = { x: DR.right.side - 10, y: 0, w: W - DR.right.side + 10, h: DR.walk + 10 };
const OCHRE = '#c8823a';

/** Doomstomp's bootprint, kicked into the facade (a boot sole: the toe's round, the waist, the heel). */
/** Where the kick broke right through the wall (the fire's in there). */
const HOLE: [number, number][] = [[1712, 228], [1736, 206], [1752, 218], [1778, 200], [1792, 222], [1818, 216], [1814, 246], [1826, 268], [1800, 296], [1772, 288], [1748, 302], [1726, 280], [1704, 266]];

function printPath(dx = 0, dy = 0, k = 1): PathFn {
  const { x, y } = DR.print;
  const P = (px: number, py: number): [number, number] => {
    // tipped a little, as a kick lands
    const a = -0.16;
    return [x + dx + (px * Math.cos(a) - py * Math.sin(a)) * k, y + dy + (px * Math.sin(a) + py * Math.cos(a)) * k];
  };
  const curve = (c: Ctx, pts: [number, number][]) => {
    // a smooth closed curve through the midpoints
    const q = pts.map(([px, py]) => P(px, py));
    const m = (i: number) => [(q[i][0] + q[(i + 1) % q.length][0]) / 2, (q[i][1] + q[(i + 1) % q.length][1]) / 2];
    const m0 = m(q.length - 1);
    c.moveTo(m0[0], m0[1]);
    for (let i = 0; i < q.length; i++) {
      const mi = m(i);
      c.quadraticCurveTo(q[i][0], q[i][1], mi[0], mi[1]);
    }
    c.closePath();
  };
  return (c) => {
    c.beginPath();
    // the sole: a broad rounded toe, narrowing to the waist
    curve(c, [[0, -168], [62, -160], [96, -110], [100, -50], [84, 4], [62, 40], [-50, 44], [-74, 6], [-92, -50], [-90, -112], [-60, -160]]);
  };
}

function rightBuilding(ctx: Ctx, r: R): void {
  const { x0, side } = DR.right;
  const bottom = DR.walk + 2;
  // the left side face lit full by the fire
  const sideP = polyPath([[side, -10], [x0, -10], [x0, bottom], [side, bottom]]);
  flat(ctx, sideP, '#f0a868', 0, INK);
  within(ctx, sideP, () => dots(ctx, { x: side, y: 0, w: x0 - side, h: bottom }, linTone(0, 0, 0, bottom, 0.05, 0.4), '#a04a2a', { step: 4, angle: 0 }));
  ink(ctx, sideP, 2.4, INK, 0);
  const face = rectPath(x0, -10, W - x0 + 10, bottom + 10);
  flat(ctx, face, OCHRE, 0, INK);
  within(ctx, face, () => {
    // windows in bays; the print's neighbours blown out
    for (let row = 0; row < 14; row++)
      for (let col = 0; col < 6; col++) {
        const wx = x0 + 28 + col * 52;
        const wy = 14 + row * 46;
        if (wy > bottom - 60) continue;
        const d = Math.hypot(wx + 13 - DR.print.x, wy + 16 - DR.print.y);
        if (d < 150) continue;
        const v = r();
        ctx.fillStyle = v < 0.12 ? '#ff9a3a' : '#2a1420';
        ctx.fillRect(wx, wy, 26, 32);
        ctx.fillStyle = rgba('#5a2a1a', 0.8);
        ctx.fillRect(wx - 3, wy + 32, 32, 4);
        ctx.strokeStyle = rgba(INK, 0.8);
        ctx.lineWidth = 1.4;
        ctx.strokeRect(wx, wy, 26, 32);
        if (v >= 0.12 && v < 0.5) {
          ctx.fillStyle = rgba('#a8c0d8', 0.45);
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + 12, wy);
          ctx.lineTo(wx, wy + 16);
          ctx.fill();
        }
      }
    // the fire on the left edge, the shade deepening right in dots, the base glowing from the street
    ctx.fillStyle = rgba(FIRE, 0.22);
    ctx.fillRect(x0, 0, 40, bottom);
    dots(ctx, { x: x0, y: -10, w: W - x0 + 10, h: bottom + 10 }, (x, y) => 0.12 + 0.45 * smooth(x0 + 40, W, x) + 0.12 * smooth(0, bottom, y), '#2a0c1e', { step: 7, angle: 0.79, a: 0.75 });
    // string courses
    ctx.fillStyle = rgba('#5a2a10', 0.5);
    for (let y = 56; y < bottom; y += 138) ctx.fillRect(x0, y, W - x0, 5);
    // the bootprint: the wall pushed in the shape of his sole. The dished, crushed facade round it; inside, the
    // recess's upper-left walls in shadow, its floor (the tread's chevrons pressed in), its lower-right walls lit
    const pp = printPath();
    const { x: px, y: py } = DR.print;
    within(ctx, printPath(0, 0, 1.16), () => {
      ctx.fillStyle = '#9a5a30';
      ctx.fillRect(px - 160, py - 240, 320, 440);
      dots(ctx, { x: px - 160, y: py - 240, w: 320, h: 440 }, radTone(px, py - 20, 220, 0.75, 0.1), '#2a0c14', { step: 5, angle: 0.79 });
    });
    ink(ctx, printPath(0, 0, 1.16), 2, INK, 0);
    within(ctx, pp, () => {
      ctx.fillStyle = '#3a140e';
      ctx.fillRect(px - 140, py - 220, 280, 420);
      within(ctx, printPath(14, 16), () => {
        ctx.fillStyle = '#7a3e1e';
        ctx.fillRect(px - 140, py - 220, 300, 440);
        // the tread pressed into the wall: chevron lugs
        ctx.fillStyle = rgba('#2a0c0c', 0.7);
        for (let yy = py - 150; yy < py + 170; yy += 24) {
          ctx.beginPath();
          ctx.moveTo(px - 70, yy + 12);
          ctx.lineTo(px + 14, yy - 4);
          ctx.lineTo(px + 90, yy + 10);
          ctx.lineTo(px + 90, yy + 18);
          ctx.lineTo(px + 14, yy + 4);
          ctx.lineTo(px - 70, yy + 20);
          ctx.fill();
        }
        dots(ctx, { x: px - 140, y: py - 220, w: 300, h: 440 }, linTone(px - 60, py - 120, px + 80, py + 120, 0.7, 0.15), '#1a0608', { step: 5, angle: 0.79 });
      });
      // the lit inner walls on the lower right
      ctx.save();
      ctx.lineWidth = 8;
      ctx.strokeStyle = rgba('#ffb060', 0.7);
      ctx.translate(-5, -6);
      pp(ctx);
      ctx.stroke();
      ctx.restore();
      // broken through in the forefoot: a jagged hole into the burning floor behind
      const hole = polyPath(HOLE);
      flat(ctx, hole, '#2a0a10', 0, INK);
      within(ctx, hole, () => {
        vfill(ctx, px - 70, py - 120, 140, 110, [[0, '#4a1414'], [0.6, '#c8501e'], [1, '#ffd070']]);
        flat(ctx, rectPath(px - 80, py - 26, 160, 10), '#6a5a5a', 1.6, INK, 0.3);
      });
      ink(ctx, hole, 3, INK, 0.6);
    });
    // cracks radiating from the print, comic-style
    ctx.strokeStyle = INK;
    for (let i = 0; i < 11; i++) {
      const ang = (i / 11) * P2 + r() * 0.3;
      let x = DR.print.x + Math.cos(ang) * 100;
      let y = DR.print.y + Math.sin(ang) * 140;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const len = 70 + r() * 110;
      for (let k = 0; k < 5; k++) {
        x += Math.cos(ang + (r() - 0.5) * 0.8) * (len / 5);
        y += Math.sin(ang + (r() - 0.5) * 0.8) * (len / 5);
        ctx.lineTo(x, y);
        ctx.lineWidth = 2.6 - k * 0.4;
      }
      ctx.stroke();
    }
  });
  ink(ctx, face, 4, INK, 0.9);
  ink(ctx, printPath(), 4, INK, 0.8);
  // the fire escape: the top flights still bolted on, the lower ones wrenched off and hanging by a corner
  fireEscapeTorn(ctx, x0 + 20, x0 + 110, 92);
}

function fireEscapeTorn(ctx: Ctx, x0: number, x1: number, y0: number): void {
  const gap = 92;
  const landing = (y: number) => {
    ctx.fillStyle = rgba('#2a0c10', 0.35);
    ctx.fillRect(x0 + 8, y + 6, x1 - x0, 14);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 30);
    }
    ctx.moveTo(x0, y - 30);
    ctx.lineTo(x1, y - 30);
    ctx.moveTo(x0, y - 15);
    ctx.lineTo(x1, y - 15);
    ctx.stroke();
    flat(ctx, rectPath(x0 - 4, y - 2, x1 - x0 + 8, 6), '#3a3040', 2, INK, 0.3);
  };
  for (let k = 0; k < 3; k++) {
    const y = y0 + k * gap;
    landing(y);
    if (k < 2) {
      const sx0 = k % 2 ? x0 + 14 : x1 - 14;
      const sx1 = k % 2 ? x1 - 50 : x0 + 50;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx0, y + 2);
      ctx.lineTo(sx1, y + gap - 2);
      ctx.stroke();
    }
  }
  // the wrenched flight: a landing and its stair swung down from one corner, hanging askew
  const hy = y0 + 2 * gap + 4;
  ctx.save();
  ctx.translate(x0, hy);
  ctx.rotate(1.1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let x = 0; x <= x1 - x0; x += 8) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, -28);
  }
  ctx.moveTo(0, -28);
  ctx.lineTo(x1 - x0, -28);
  ctx.stroke();
  flat(ctx, rectPath(-4, -2, x1 - x0 + 8, 6), '#3a3040', 2, INK, 0.3);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x1 - x0 - 10, 4);
  ctx.lineTo(20, 120);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let u = 0.1; u < 1; u += 0.12) {
    const x = x1 - x0 - 10 + (20 - (x1 - x0 - 10)) * u;
    const y = 4 + 116 * u;
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
  }
  ctx.stroke();
  ctx.restore();
  // bolts torn out of the wall where it hung: pale holes
  for (const [bx, by] of [[x1 - 4, hy + 4], [x1 - 30, hy + 2]] as const) flat(ctx, ellPath(bx, by, 4, 3), '#e8b080', 1.2, INK, 0);
}

// ——— the street ———

const STREET_BOX = { x: 0, y: DR.walk - 4, w: W, h: TY + 4 - (DR.walk - 4) };

function street(ctx: Ctx, r: R): void {
  const { walk, kerb, road } = DR;
  // the far sidewalk: pale concrete slabs, lit warm from the left
  flat(ctx, rectPath(-10, walk, W + 20, kerb - walk), '#9a7a78', 0, INK);
  within(ctx, rectPath(-10, walk, W + 20, kerb - walk), () => {
    ctx.fillStyle = rgba(INK, 0.4);
    for (let x = 40; x < W; x += 120) ctx.fillRect(x, walk, 2, kerb - walk);
    dots(ctx, { x: 0, y: walk, w: W, h: kerb - walk }, linTone(0, 0, W, 0, 0.15, 0.5), '#2a0c1e', { step: 5, angle: 0.79 });
    // the buildings' feet in occlusion
    vfill(ctx, 0, walk, W, 8, [[0, 'rgba(16,4,12,0.6)'], [1, 'rgba(16,4,12,0)']]);
  });
  // the kerb's face
  flat(ctx, rectPath(-10, kerb, W + 20, road - kerb), '#5a4048', 0, INK);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, kerb);
  ctx.lineTo(W, kerb);
  ctx.moveTo(0, road);
  ctx.lineTo(W, road);
  ctx.stroke();
  // the road: asphalt in violet shade, printed, warmed by the fires, the centre line in broken dashes
  const roadP = rectPath(-10, road, W + 20, TY + 4 - road);
  flat(ctx, roadP, '#3a2a3a', 0, INK);
  within(ctx, roadP, () => {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(255,120,60,0.3)');
    g.addColorStop(0.5, 'rgba(255,120,60,0.08)');
    g.addColorStop(1, 'rgba(255,120,60,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(0, road, W, TY - road);
    dots(ctx, { x: 0, y: road, w: W, h: TY - road }, (x, y) => 0.25 + 0.25 * smooth(road, TY, y) + 0.15 * smooth(800, W, x), '#12060e', { step: 6, angle: 0.79, a: 0.8 });
    ctx.fillStyle = rgba('#e8c860', 0.6);
    for (let x = 30; x < W; x += 150) {
      if (Math.abs(x - DR.taxi.x) < 200 || Math.abs(x - DR.globe.x) < 110) continue;
      ctx.fillRect(x, 712, 70, 4);
    }
    // cracks in the asphalt fanning from the craters
    ctx.strokeStyle = rgba('#0a0206', 0.85);
    ctx.lineWidth = 1.8;
    for (const [cx, cy] of [[DR.taxi.x, DR.taxi.y], [DR.globe.x, DR.globe.y + 10]] as const) {
      for (let i = 0; i < 7; i++) {
        let x = cx;
        let y = cy;
        const ang = (i / 7) * P2 + r() * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          x += Math.cos(ang + (r() - 0.5) * 0.9) * 46;
          y += Math.sin(ang + (r() - 0.5) * 0.9) * 10;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  });
  // the hydrant's puddle across the kerb and the road: dark water mirroring the fire and the sky
  puddle(ctx);
}

const PUDDLE: [number, number, number, number] = [DR.hydrant.x + 10, 704, 190, 26];

function puddle(ctx: Ctx): void {
  const [x, y, rx, ry] = PUDDLE;
  const pp: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, P2);
    c.moveTo(x - rx * 0.3 + 90, y - ry - 22);
    c.ellipse(x - rx * 0.3, y - ry - 22, 90, 12, 0, 0, P2);
  };
  flat(ctx, pp, '#2a1a3a', 0, INK);
  within(ctx, pp, () => {
    // the fire's orange and the sky's red mirrored in streaks
    // the sky's red low in the water, the far fires and the geyser's column broken into wobbling smears
    vfill(ctx, x - rx, y - ry - 40, rx * 2, ry * 2 + 40, [[0, 'rgba(255,110,60,0.5)'], [1, 'rgba(120,30,60,0.1)']]);
    const smear = (sx: number, wd: number, col: string, a: number) => {
      ctx.fillStyle = rgba(col, a);
      ctx.beginPath();
      for (let yy = y - ry - 36; yy <= y + ry; yy += 4) ctx.lineTo(sx + Math.sin(yy * 0.9) * wd * 0.5, yy);
      for (let yy = y + ry; yy >= y - ry - 36; yy -= 4) ctx.lineTo(sx + wd + Math.sin(yy * 0.9 + 1) * wd * 0.5, yy);
      ctx.fill();
    };
    smear(DR.hydrant.x - 8, 14, '#cfeaff', 0.7);
    smear(DR.hydrant.x + 110, 10, '#ff9a4a', 0.6);
    smear(DR.hydrant.x - 120, 8, '#ffb060', 0.45);
    benDay(ctx, { x: x - rx, y: y - ry - 40, w: rx * 2, h: ry * 2 + 40 }, '#120818', 0.6, 6, 0.55, 0.15, 0);
    // ripples
    ctx.strokeStyle = rgba('#ffe0b0', 0.4);
    ctx.lineWidth = 1.2;
    for (const [qx, qy, qr, a0] of [[-70, -4, 22, 0.3], [40, 6, 30, 3.6], [-10, -30, 16, 1.2], [110, -10, 18, 4.4], [-140, 8, 14, 2.2]] as const) {
      ctx.beginPath();
      ctx.ellipse(x + qx, y + qy, qr, qr * 0.22, 0, a0, a0 + 2.2);
      ctx.stroke();
    }
  });
  ink(ctx, pp, 2, INK, 0);
}

// ——— the street's wreckage ———


function rubble(ctx: Ctx, r: R, x0: number, x1: number, base: number, h: number, col: string): void {
  // a heap of brick and slab chunks, the big ones at the bottom, lit on their upper-left facets
  for (let i = 0; i < 26; i++) {
    const u = r();
    const x = x0 + u * (x1 - x0);
    const hump = Math.sin(Math.PI * u);
    const y = base - r() * h * hump;
    const s = 8 + r() * 18 * (1 - (base - y) / (h + 1)) + 4;
    const pts: [number, number][] = [];
    const n = 5;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * P2 + r() * 0.5;
      pts.push([x + Math.cos(a) * s * (0.7 + r() * 0.4), y + Math.sin(a) * s * 0.7 * (0.7 + r() * 0.4)]);
    }
    const p = polyPath(pts);
    const c = r() < 0.4 ? '#a84a38' : col;
    flat(ctx, p, c, 1.8, INK, 0.5);
    within(ctx, p, () => {
      ctx.fillStyle = rgba('#ffb070', 0.45);
      ctx.fillRect(x - s, y - s, s * 0.9, s * 0.8);
      dots(ctx, { x: x - s, y: y - s, w: s * 2, h: s * 2 }, linTone(x - s * 0.2, y - s * 0.2, x + s, y + s, 0, 0.8), '#1a0612', { step: 4, angle: 0.79 });
    });
  }
}

// (each its own layer with a tight box: only the lamp stands in front of the live sky, so only it is overlaid)
const RUBBLE_L = { x: 0, y: 594, w: 430, h: TY - 594 };
const RUBBLE_M = { x: 840, y: 630, w: 140, h: 60 };
const RUBBLE_R = { x: 1552, y: 594, w: W - 1552, h: TY - 594 };
const LAMP_BOX = { x: DR.lamp.x - 24, y: 452, w: 170, h: DR.walk + 14 - 452 };
const HYD_BOX = { x: DR.hydrant.x - 50, y: DR.hydrant.y - 20, w: 140, h: 80 };
const TAXI_BOX = { x: DR.taxi.x - 200, y: DR.taxi.y - 50, w: 400, h: 90 };
const GLOBE_BOX = { x: DR.globe.x - 140, y: DR.globe.y - 110, w: 280, h: TY - (DR.globe.y - 110) };

function rubbleL(ctx: Ctx, r: R): void {
  groundShadow(ctx, 200, DR.walk + 16, 220, 14, 0.5, '#10040c');
  rubble(ctx, r, -20, 400, DR.kerb + 6, 70, '#8a7a72');
}

function rubbleR(ctx: Ctx, r: R): void {
  groundShadow(ctx, 1760, DR.walk + 16, 200, 14, 0.5, '#10040c');
  rubble(ctx, r, 1580, 1940, DR.kerb + 6, 80, '#a88a6a');
}

function lampPost(ctx: Ctx): void {
  const { x, y } = DR.lamp;
  castShadow(ctx, polyPath([[x - 6, y], [x + 6, y], [x + 8, 520], [x + 80, 470], [x + 120, 500], [x + 112, 510], [x + 76, 486], [x + 18, 528], [x + 6, y]]), 10, 6, 0.3, '#10040c');
  flat(ctx, polyPath([[x - 14, y + 4], [x + 14, y + 4], [x + 10, y - 22], [x - 10, y - 22]]), '#3a3442', 2.2, INK);
  const pole: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 5, y - 20);
    c.lineTo(x - 4, 540);
    c.quadraticCurveTo(x + 4, 470, x + 70, 462);
    c.quadraticCurveTo(x + 110, 466, x + 122, 494);
    c.lineTo(x + 114, 498);
    c.quadraticCurveTo(x + 104, 476, x + 70, 472);
    c.quadraticCurveTo(x + 14, 478, x + 5, 540);
    c.lineTo(x + 5, y - 20);
    c.closePath();
  };
  flat(ctx, pole, '#4a4656', 2.4, INK, 0.5);
  ctx.strokeStyle = rgba('#ffb070', 0.7);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 22);
  ctx.lineTo(x - 2, 540);
  ctx.stroke();
  // the head hanging off the end: the glass smashed, the bulb's stub
  ctx.save();
  ctx.translate(x + 120, 500);
  ctx.rotate(0.5);
  flat(ctx, polyPath([[-16, 0], [16, 0], [10, 14], [-10, 14]]), '#3a3442', 2.2, INK);
  flat(ctx, polyPath([[-10, 14], [10, 14], [6, 22], [-2, 26], [-8, 20]]), '#e8e0c8', 1.6, INK, 0);
  ctx.restore();
}

/** Where the lamp's broken bulb is (the live layer flickers it). */
const BULB = { x: DR.lamp.x + 112, y: 520 };

function hydrantBase(ctx: Ctx): void {
  const { x, y } = DR.hydrant;
  // the main's broken flange where the hydrant stood
  groundShadow(ctx, x + 10, y + 4, 34, 6, 0.6, '#10040c');
  flat(ctx, ellPath(x, y, 16, 5), '#3a3442', 2, INK);
  flat(ctx, polyPath([[x - 12, y], [x + 12, y], [x + 10, y - 10], [x - 10, y - 10]]), '#5a5060', 2, INK);
  flat(ctx, ellPath(x, y - 10, 12, 4), '#1a1020', 1.8, INK, 0);
  // the hydrant lying on its side in the road, dented
  ctx.save();
  ctx.translate(x + 74, y + 30);
  ctx.rotate(1.35);
  groundShadow(ctx, 6, 26, 30, 8, 0.5, '#10040c');
  const body: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-14, 26);
    c.lineTo(-12, -10);
    c.quadraticCurveTo(0, -26, 12, -10);
    c.lineTo(14, 26);
    c.closePath();
  };
  flat(ctx, body, '#d8322e', 2.4, INK, 0.5);
  within(ctx, body, () => {
    ctx.fillStyle = rgba('#ffb08a', 0.8);
    ctx.fillRect(-12, -14, 5, 40);
    dots(ctx, { x: -14, y: -26, w: 28, h: 52 }, linTone(-4, 0, 14, 0, 0, 0.8), '#4a0a10', { step: 4, angle: 0.79 });
  });
  flat(ctx, rectPath(-20, 2, 40, 9), '#b8282a', 2, INK);
  flat(ctx, rectPath(-17, 24, 34, 7), '#a8282a', 2, INK);
  ctx.restore();
}

function taxi(ctx: Ctx, r: R): void {
  const { x, y } = DR.taxi;
  // the bootprint dished into the asphalt round it
  const dish: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y + 6, 190, 30, -0.03, 0, P2);
  };
  flat(ctx, dish, '#221624', 0, INK);
  within(ctx, dish, () => {
    dots(ctx, { x: x - 190, y: y - 26, w: 380, h: 64 }, linTone(0, y - 24, 0, y + 30, 0.9, 0.2), '#08020a', { step: 5, angle: 0.79 });
    // its lit far lip
    ctx.strokeStyle = rgba('#ffa060', 0.6);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 186, 28, -0.03, Math.PI * 0.05, Math.PI * 0.95);
    ctx.stroke();
  });
  ink(ctx, dish, 2.4, INK, 0);
  // the cab, squashed flat: its roof sign squashed on top, the wheels splayed out
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.04);
  for (const [wx, wa] of [[-112, -0.4], [112, 0.4]] as const) {
    ctx.save();
    ctx.translate(wx * 1.12, 16);
    ctx.rotate(wa);
    flat(ctx, ellPath(0, 0, 24, 12), '#18141e', 2.4, INK);
    flat(ctx, ellPath(0, 0, 10, 5), '#8a8a96', 1.4, INK, 0);
    ctx.restore();
  }
  const cab: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-150, 10);
    c.quadraticCurveTo(-156, -10, -130, -16);
    c.lineTo(-60, -22);
    c.lineTo(-30, -30);
    c.lineTo(50, -30);
    c.lineTo(80, -20);
    c.lineTo(140, -16);
    c.quadraticCurveTo(160, -6, 150, 12);
    c.closePath();
  };
  flat(ctx, cab, '#f0c030', 0, INK);
  within(ctx, cab, () => {
    ctx.fillStyle = '#ffe070';
    ctx.fillRect(-160, -34, 320, 10);
    // the checker band, crumpled
    ctx.fillStyle = INK;
    for (let k = -140, i = 0; k < 140; k += 16, i++) ctx.fillRect(k, -8 + (i % 2) * 4, 8, 5);
    // the windows crushed to slits
    ctx.fillStyle = '#3a4a70';
    ctx.fillRect(-56, -27, 40, 9);
    ctx.fillRect(0, -28, 48, 9);
    ctx.strokeStyle = rgba('#e8f0ff', 0.9);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(10, -28);
    ctx.lineTo(22, -22);
    ctx.lineTo(16, -19);
    ctx.moveTo(22, -22);
    ctx.lineTo(36, -26);
    ctx.stroke();
    dots(ctx, { x: -160, y: -34, w: 320, h: 50 }, linTone(-40, 0, 160, 0, 0.05, 0.7), '#5a2a10', { step: 4, angle: 0.79 });
    // crumple lines
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const k of [-90, -20, 60, 110]) {
      ctx.moveTo(k, -24);
      ctx.lineTo(k + 8, -8);
      ctx.lineTo(k - 2, 8);
    }
    ctx.stroke();
  });
  ink(ctx, cab, 3, INK, 0.8);
  // the roof sign flattened on top
  flat(ctx, polyPath([[-26, -30], [28, -31], [24, -38], [-22, -37]]), '#f8f0d8', 2, INK);
  ctx.restore();
  void r;
}

function fallenGlobe(ctx: Ctx, r: R): void {
  const { x, y, r: R0 } = DR.globe;
  // its crater: a dished hole in the road, the asphalt heaved up round the rim
  const crater: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y + 22, R0 * 1.9, 26, 0, 0, P2);
  };
  flat(ctx, crater, '#1a0e1a', 0, INK);
  ink(ctx, crater, 2.4, INK, 0);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.05 + (i / 6) * 0.9);
    const cx = x + Math.cos(a) * R0 * 1.9;
    const cy = y + 22 + Math.sin(a) * 26 - 4;
    flat(ctx, polyPath([[cx - 14, cy + 6], [cx - 4, cy - 10], [cx + 12, cy - 6], [cx + 16, cy + 6]]), '#4a3442', 1.6, INK, 0.5);
  }
  // the ring's back half, snapped, sticking up out of the road behind
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.ellipse(x - 6, y - 4, R0 * 1.5, R0 * 0.36, -0.5, Math.PI * 1.08, Math.PI * 1.72);
  ctx.stroke();
  ctx.strokeStyle = '#c8902a';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
  // the globe itself: the pizza sphere, half sunk, cracked, tipped over (painted by Metropizza's globe at an angle)
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - R0 * 2, y - R0 * 2, R0 * 4, R0 * 2 + 18);
  ctx.clip();
  castShadow(ctx, ellPath(x, y, R0, R0), 12, 8, 0.4, '#10040c');
  ctx.translate(x, y);
  ctx.rotate(0.6);
  sphere(ctx, R0);
  ctx.restore();
  // a crack across it, the sphere split, the crust showing
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 20, y - R0 + 6);
  ctx.lineTo(x - 8, y - 30);
  ctx.lineTo(x - 22, y - 8);
  ctx.lineTo(x - 6, y + 12);
  ctx.stroke();
  // the needle snapped off its top, and a piece of the brass crown, lying by the crater
  ctx.save();
  ctx.translate(x - R0 * 1.2, y + 16);
  ctx.rotate(-0.25);
  flat(ctx, polyPath([[-34, -3], [10, -4], [12, 4], [-34, 3]]), '#c8b088', 1.6, INK, 0.3);
  flat(ctx, ellPath(-36, 0, 4, 4), '#d02020', 1.2, INK, 0);
  flat(ctx, polyPath([[14, 6], [28, -12], [46, -12], [56, 6]]), '#d8a048', 2, INK, 0.5);
  ctx.restore();
  // the ring's front half: a stub bent up out of the road in front
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(x + R0 * 0.7, y + 26);
  ctx.quadraticCurveTo(x + R0 * 1.2, y + 8, x + R0 * 1.5, y - 26);
  ctx.stroke();
  ctx.strokeStyle = '#e0a840';
  ctx.lineWidth = 6;
  ctx.stroke();
  // dust round its foot
  groundShadow(ctx, x + 10, y + 24, R0 * 1.4, 10, 0.5, '#10040c');
  void r;
}

/** The pizza globe's sphere at the origin: cheese, its slices' cuts, pepperoni and olives, lit top-left, dots in the
 * shade (a simpler cousin of Metropizza's turning globe, which this is: here it's lying still). */
function sphere(ctx: Ctx, R0: number): void {
  const s = ellPath(0, 0, R0, R0);
  const g = ctx.createRadialGradient(-R0 * 0.35, -R0 * 0.4, 4, 0, 0, R0);
  g.addColorStop(0, '#ffe8a0');
  g.addColorStop(0.6, '#f0b040');
  g.addColorStop(1, '#a8601a');
  flat(ctx, s, g, 0, INK);
  within(ctx, s, () => {
    ctx.strokeStyle = rgba('#8a4010', 0.8);
    ctx.lineWidth = 2.4;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, R0 * Math.abs(Math.cos((k / 4) * Math.PI)), R0, 0, 0, P2);
      ctx.stroke();
    }
    for (const [px, py, pr] of [[-24, -30, 11], [18, -12, 12], [-10, 16, 10], [30, 26, 8], [-38, 4, 7]] as const) {
      flat(ctx, ellPath(px, py, pr, pr * 0.9), '#c8302a', 1.6, '#5a1010', 0);
      ctx.fillStyle = rgba('#ff9a8a', 0.6);
      ctx.fillRect(px - pr * 0.5, py - pr * 0.5, pr * 0.4, pr * 0.3);
    }
    for (const [ox, oy] of [[6, -40], [-30, 36], [40, -2]] as const) {
      flat(ctx, ellPath(ox, oy, 5, 4), '#1a1420', 1, INK, 0);
    }
    dots(ctx, { x: -R0, y: -R0, w: R0 * 2, h: R0 * 2 }, linTone(-R0 * 0.1, -R0 * 0.1, R0 * 0.8, R0 * 0.8, 0, 0.85), '#4a1a0a', { step: 5, angle: 0.79 });
  });
  ink(ctx, s, 3.4, INK, 0.7);
}

// ——— the fires and the geyser, painted for the still (the live layer plays them as frame loops) ———

/** The fires: where each burns (base x, y), its size, and its frame seed. */
const FIRES: { x: number; y: number; s: number; seed: number }[] = [
  { x: 290, y: FLOORS[2] + 2, s: 0.95, seed: 3 },
  { x: 256, y: FLOORS[1] + 2, s: 0.6, seed: 7 },
  { x: 336, y: FLOORS[3] + 2, s: 0.5, seed: 11 },
  { x: 1766, y: 290, s: 0.62, seed: 5 },
  { x: DR.shop.x1 - 132, y: DR.walk - 2, s: 0.42, seed: 17 },
];

function stillFires(ctx: Ctx): void {
  for (const f of FIRES) {
    ctx.save();
    ctx.translate(f.x - (FIRE_F.w / 2) * f.s, f.y - FIRE_F.h * f.s);
    ctx.scale(f.s, f.s);
    fireFrame(ctx, FIRE_F.w, FIRE_F.h, 0.3, f.seed);
    ctx.restore();
  }
}

function stillGeyser(ctx: Ctx): void {
  ctx.save();
  ctx.translate(DR.hydrant.x - GEY_F.w / 2, DR.hydrant.y - 10 - GEY_F.h);
  geyserFrame(ctx, GEY_F.w, GEY_F.h, 0.2);
  ctx.restore();
}

function stillSmoke(ctx: Ctx): void {
  for (const [i, [fx, fy, s]] of FAR_FIRES.entries()) {
    ctx.save();
    ctx.translate(fx - SMOKE_F.w * 0.2 * s, fy - SMOKE_F.h * s);
    ctx.scale(s, s);
    smokeFrame(ctx, SMOKE_F.w, SMOKE_F.h, 0.25 + i * 0.3);
    ctx.restore();
  }
}

// ——— the table: a slab of the sidewalk ———

function table(ctx: Ctx, r: R): void {
  const zf = DR.front;
  const VX0 = 960;
  const HY0 = 300;
  const at = (x: number, y: number) => VX0 + (x - VX0) * ((y - HY0) / (zf - HY0));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, zf - TY + 2);
  ctx.clip();
  vfill(ctx, 0, TY, W, zf - TY, [[0, '#7a6470'], [0.4, '#a08a88'], [1, '#b8a29a']]);
  // the fire's warmth from the left, the violet shade to the right
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(255,140,70,0.28)');
  g.addColorStop(0.55, 'rgba(255,140,70,0.04)');
  g.addColorStop(1, 'rgba(60,30,90,0.2)');
  ctx.fillStyle = g;
  ctx.fillRect(0, TY, W, zf - TY);
  // printed: the shade's dots towards the back and the far right
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => 0.4 * (1 - smooth(TY, TY + 130, y)) + 0.18 * smooth(zf - 120, zf, y) + 0.14 * smooth(1000, W, x) + 0.06, '#2a1030', { step: 8, angle: 0.79, a: 0.6 });
  // the slab's joints in perspective: lines running to the vanishing point, one across
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const fx of [-280, 560, 1360, 2200]) {
    ctx.moveTo(at(fx, TY), TY);
    ctx.lineTo(fx, zf);
  }
  ctx.moveTo(0, 880);
  ctx.lineTo(W, 880);
  ctx.stroke();
  ctx.strokeStyle = rgba('#e8d0c0', 0.35);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 882);
  ctx.lineTo(W, 882);
  ctx.stroke();
  // the stomp's crack: one long crack across the slab between the lanes, branching, a lit lip on its far side
  const crk: [number, number][] = [[690, TY], [702, 790], [688, 826], [712, 868], [700, 912], [728, 960], [716, 1004], [740, zf]];
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  crk.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffd8b0', 0.45);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  crk.forEach(([x, y], i) => (i ? ctx.lineTo(x - 3, y) : ctx.moveTo(x - 3, y)));
  ctx.stroke();
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(712, 868);
  ctx.lineTo(752, 884);
  ctx.lineTo(778, 878);
  ctx.moveTo(700, 912);
  ctx.lineTo(664, 930);
  ctx.moveTo(1240, TY);
  ctx.lineTo(1248, 800);
  ctx.lineTo(1236, 828);
  ctx.stroke();
  // stains: old gum spots and a scorch
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const y = TY + 20 + r() * (zf - TY - 30);
    ctx.fillStyle = rgba('#3a2030', 0.25);
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + r() * 4, 2 + r() * 2, 0, 0, P2);
    ctx.fill();
  }
  // grit and pebbles blown along the back edge and in the corners
  for (let i = 0; i < 70; i++) {
    const side = r() < 0.5;
    const x = side ? r() * 380 : W - r() * 380;
    const y = TY + 4 + r() ** 2 * 120;
    const s = 1.5 + r() * 4;
    flat(ctx, ellPath(x, y, s, s * 0.6), r() < 0.5 ? '#8a7a72' : '#a84a38', s > 3.5 ? 1.2 : 0, INK, 0);
  }
  ctx.restore();
  // the street's flat shadow along the back of the slab
  ctx.fillStyle = rgba('#14060e', 0.35);
  ctx.fillRect(0, TY, W, 14);
  tableFalloff(ctx, zf, 0.3, '#14060e');
  tableSeam(ctx, 0.55, INK, false);
  // the kerb's front face: granite, printed dark
  const kf = rectPath(0, zf, W, 1080 - zf);
  flat(ctx, kf, '#5a4a52', 0, INK);
  within(ctx, kf, () => {
    dots(ctx, { x: 0, y: zf, w: W, h: 1080 - zf }, (_x, y) => 0.35 + 0.5 * smooth(zf, 1080, y), '#12040c', { step: 6, angle: 0.79, a: 0.8 });
    ctx.fillStyle = rgba('#ffb080', 0.35);
    ctx.fillRect(0, zf, W, 3);
    ctx.fillStyle = rgba(INK, 0.6);
    for (let x = 200; x < W; x += 420) ctx.fillRect(x, zf, 3, 1080 - zf);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, zf);
  ctx.lineTo(W, zf);
  ctx.stroke();
}

function tableProps(ctx: Ctx, r: R): void {
  // a Metropizza box at the back left, crushed and singed
  const { x, y } = DR.table.box;
  const lid = polyPath([[x - 96, y - 12], [x + 74, y - 18], [x + 104, y + 4], [x - 70, y + 12]]);
  const front = polyPath([[x - 70, y + 12], [x + 104, y + 4], [x + 102, y + 14], [x - 70, y + 22]]);
  groundShadow(ctx, x + 30, y + 22, 130, 12, 0.62, '#14060e', 1.3);
  flat(ctx, front, '#b89870', 2.4, INK, 0);
  flat(ctx, lid, '#f4e8d0', 2.6, INK, 0.5);
  within(ctx, lid, () => {
    ctx.save();
    ctx.translate(x + 4, y - 4);
    ctx.scale(1, 0.28);
    flat(ctx, ellPath(0, 0, 44, 44), '#d8322e', 3, INK, 0);
    flat(ctx, polyPath([[-16, -18], [16, -18], [0, 22]]), '#ffd23a', 2.4, INK, 0);
    ctx.restore();
    // the bootprint's crease and a scorch on the corner
    ctx.strokeStyle = rgba(INK, 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 40, y - 14);
    ctx.lineTo(x - 10, y + 2);
    ctx.lineTo(x + 30, y + 8);
    ctx.stroke();
    const sg = ctx.createRadialGradient(x + 90, y, 2, x + 90, y, 50);
    sg.addColorStop(0, 'rgba(30,10,10,0.8)');
    sg.addColorStop(1, 'rgba(30,10,10,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x + 30, y - 30, 100, 60);
    dots(ctx, { x: x - 96, y: y - 20, w: 200, h: 36 }, linTone(x - 40, 0, x + 104, 0, 0, 0.4), '#6a4a3a', { step: 4, angle: 0.79 });
  });
  // the Daily Slice, blown onto the slab at the back right: DOOMSTOMP!
  const p = DR.table.paper;
  const sheetP = polyPath([[p.x - 104, p.y - 16], [p.x + 70, p.y - 30], [p.x + 112, p.y + 12], [p.x - 66, p.y + 30]]);
  groundShadow(ctx, p.x + 14, p.y + 26, 120, 12, 0.6, '#14060e', 1.3);
  flat(ctx, sheetP, '#f2e8d2', 2.4, INK, 0.5);
  within(ctx, sheetP, () => {
    ctx.save();
    ctx.translate(p.x - 76, p.y - 2);
    ctx.transform(1, -0.08, 0.62, 0.5, 0, 0);
    ctx.fillStyle = INK;
    ctx.font = `22px ${BLOCK}`;
    ctx.fillText('DAILY SLICE', 0, -12);
    ctx.fillStyle = '#d8322e';
    ctx.font = `30px ${BLOCK}`;
    ctx.fillText('DOOMSTOMP!', 0, 22);
    ctx.fillStyle = rgba('#2a2030', 0.5);
    for (let k = 0; k < 3; k++) ctx.fillRect(0, 34 + k * 9, 120 + (k % 2) * 40, 3);
    ctx.fillStyle = '#5a5060';
    ctx.fillRect(150, 28, 50, 34);
    ctx.restore();
    dots(ctx, { x: p.x - 104, y: p.y - 30, w: 216, h: 62 }, linTone(p.x - 20, 0, p.x + 112, 0, 0, 0.4), '#6a5a4a', { step: 4, angle: 0.79 });
  });
  // its corner lifting in the hot wind
  flat(ctx, polyPath([[p.x + 70, p.y - 30], [p.x + 112, p.y + 12], [p.x + 92, p.y - 8]]), '#d8ccb4', 1.8, INK, 0);
  // a chunk of brick that landed on the slab, front left of the box
  const ch = polyPath([[x + 150, y + 30], [x + 176, y + 20], [x + 196, y + 30], [x + 190, y + 44], [x + 156, y + 46]]);
  groundShadow(ctx, x + 176, y + 46, 30, 5, 0.6, '#14060e');
  flat(ctx, ch, '#a84a38', 2, INK, 0.5);
  within(ctx, ch, () => dots(ctx, { x: x + 150, y: y + 20, w: 50, h: 30 }, linTone(x + 170, 0, x + 196, 0, 0, 0.8), '#2a0810', { step: 4, angle: 0.79 }));
  void r;
}

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0, '#ffc0a0', 0.04, { warm: '#ff9a5a', cool: '#5a48b8', a: 0.16 });
}

function shadeOver(ctx: Ctx): void {
  // the HUD's corner calm, the lanes calm, a vignette (heavier than the rooftop's: night and smoke)
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(14,4,18,0.4)');
  g.addColorStop(1, 'rgba(14,4,18,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
  // the tops of the near buildings under the HUD's corners, calmed
  for (const [x0, x1] of [[0, 380], [1560, W]] as const) {
    const cg = ctx.createLinearGradient(0, 0, 0, 340);
    cg.addColorStop(0, 'rgba(14,4,18,0.42)');
    cg.addColorStop(1, 'rgba(14,4,18,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(x0, 0, x1 - x0, 340);
  }
  calmLanes(ctx, 0.14, '#1a0820', 150, 640);
  vignetteAll(ctx, 0.5, '#100412');
}

// ——— the stack ———

/** The live sky's things (smoke columns, bolts) stay between the shop and the ochre building, above the street. */
const SKYLIVE_BOX = { x: 918, y: 0, w: DR.right.side - 12 - 918, h: 590 };
const GEY_BOX: Box = { x: DR.hydrant.x - 110, y: DR.hydrant.y - 340, w: 220, h: 340 };

export const DOOM: SceneSpec = {
  id: 'doomstomp',
  info: {
    name: 'Downtown Ruins',
    subtitle: 'Boss: DOOMSTOMP',
    ambient: [],
    glows: [],
    light: '#ffa080',
    tableTint: '#ffe4d8',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'far', box: FAR_BOX, draw: farCity },
    { id: 'tower', box: TOWER_BOX, draw: tower },
    // smoke columns off the far fires, bolts behind the skyline (between the near buildings)
    { id: 'smokeStill', box: SKYLIVE_BOX, stillOnly: true, draw: stillSmoke },
    { id: 'skyLive', box: SKYLIVE_BOX, motion: 'slot', draw: () => {} },
    { id: 'tenement', box: TEN_BOX, draw: tenement },
    { id: 'shop', box: SHOP_BOX, draw: shop },
    { id: 'sign', box: SIGN_BOX, motion: 'sprite', draw: hangingSign },
    { id: 'right', box: RIGHT_BOX, draw: rightBuilding },
    { id: 'street', box: STREET_BOX, draw: street },
    { id: 'rubbleL', box: RUBBLE_L, draw: rubbleL },
    { id: 'rubbleM', box: RUBBLE_M, draw: (c, r) => rubble(c, r, 860, 960, DR.kerb + 2, 18, '#8a7a72') },
    { id: 'rubbleR', box: RUBBLE_R, draw: rubbleR },
    { id: 'lamp', box: LAMP_BOX, draw: lampPost },
    { id: 'hydrant', box: HYD_BOX, draw: hydrantBase },
    { id: 'taxi', box: TAXI_BOX, draw: taxi },
    { id: 'globe', box: GLOBE_BOX, draw: fallenGlobe },
    { id: 'geyserStill', box: GEY_BOX, stillOnly: true, draw: stillGeyser },
    { id: 'firesStill', box: { x: 0, y: 0, w: W, h: DR.walk + 4 }, stillOnly: true, draw: (c) => stillFires(c) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'tableProps', box: { x: 0, y: TY + 10, w: W, h: 120 }, draw: tableProps },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— frame painters ———

const FIRE_F = { w: 160, h: 240 };
const FIRE_K = 0.6;
const FIRE_N = 12;
const GEY_F = { w: 220, h: 290 };
const GEY_K = 0.6;
const GEY_N = 12;
const SMOKE_F = { w: 260, h: 520 };
const SMOKE_K = 0.5;
const SMOKE_N = 12;
const BOLT_F = { w: 240, h: 460 };
const BOLT_K = 0.5;
const BOLT_N = 4;

const FLAME_INK = '#2a0a0c';
const FLAME_COLS = ['#e0321a', '#ff8a1a', '#ffd23a', '#fff4c8'];

/**
 * One frame of a comic fire (phase 0…1 loops) in a w×h frame, its base at the bottom centre: inked tongues in four
 * flat colours (red, orange, yellow, a hot core), each tongue rising and falling and its tip swaying on its own beat,
 * and licks breaking off the tips and rising, shrinking, until they go out.
 */
export function fireFrame(c: Ctx, w: number, h: number, ph: number, seed: number): void {
  const r = rng(seed * 97 + 13);
  const base = h - 6;
  const cx = w / 2;
  const bw = w * 0.3;
  const n = 5;
  const tongues = Array.from({ length: n }, (_, i) => {
    const u = (i + 0.5) / n;
    const mid = Math.sin(Math.PI * u);
    return {
      x: cx + (u - 0.5) * bw * 1.7 + (r() - 0.5) * 8,
      w: bw * (0.34 + 0.18 * mid),
      h: (h * 0.6) * (0.45 + 0.55 * mid) * (0.85 + r() * 0.3),
      o: r(),
      m: 1 + (i % 2),
    };
  });
  const shape = (k: number, lift: number): PathFn => (g) => {
    g.beginPath();
    for (const t of tongues) {
      const wob = Math.sin(P2 * (ph * t.m + t.o));
      const hh = t.h * (0.8 + 0.2 * wob) * k;
      const sway = Math.sin(P2 * (ph * t.m + t.o + 0.25)) * 9 * k;
      const ww = t.w * (0.55 + 0.45 * k);
      const b = base - lift;
      g.moveTo(t.x - ww, b);
      g.bezierCurveTo(t.x - ww, b - hh * 0.55, t.x + sway * 0.4 - ww * 0.25, b - hh * 0.8, t.x + sway, b - hh);
      g.bezierCurveTo(t.x + sway * 0.4 + ww * 0.25, b - hh * 0.8, t.x + ww, b - hh * 0.55, t.x + ww, b);
      g.closePath();
    }
    g.moveTo(cx + bw * (0.3 + 0.7 * k), base - lift - 6);
    g.ellipse(cx, base - lift - 6, bw * (0.3 + 0.7 * k), 12 * k + 2, 0, 0, P2);
  };
  // the licks: blobs breaking off the tallest tongues and rising as they shrink
  const licks: [number, number, number][] = [];
  for (let k = 0; k < 3; k++) {
    const t = tongues[1 + k];
    const u = (ph + k / 3 + t.o) % 1;
    const sway = Math.sin(P2 * (ph * t.m + t.o + 0.25)) * 9;
    licks.push([t.x + sway + u * 10 * (k - 1), base - t.h * 0.9 - u * h * 0.32, (1 - u) * t.w * 0.42]);
  }
  const lickPath: PathFn = (g) => {
    g.beginPath();
    for (const [x, y, s] of licks) {
      if (s < 1.5) continue;
      g.moveTo(x - s, y);
      g.quadraticCurveTo(x - s, y - s * 1.6, x, y - s * 2.4);
      g.quadraticCurveTo(x + s, y - s * 1.6, x + s, y);
      g.arc(x, y, s, 0, Math.PI);
      g.closePath();
    }
  };
  c.save();
  c.lineJoin = 'round';
  // the ink: stroke everything heavy, fill over (only the outer half of the line is left)
  c.strokeStyle = FLAME_INK;
  c.lineWidth = 5;
  const outer = shape(1, 0);
  outer(c);
  c.stroke();
  lickPath(c);
  c.stroke();
  c.fillStyle = FLAME_COLS[0];
  outer(c);
  c.fill();
  lickPath(c);
  c.fill();
  // the dark red's dot screen low in the outer flame
  dotsIn(c, outer, { x: 0, y: 0, w, h }, linTone(0, base - h * 0.3, 0, base, 0, 0.55), '#8a1008', { step: 4, angle: 0.79, a: 0.7 });
  c.fillStyle = FLAME_COLS[1];
  shape(0.74, 3)(c);
  c.fill();
  c.beginPath();
  for (const [x, y, s] of licks) if (s > 3) {
    c.moveTo(x + s * 0.5, y);
    c.arc(x, y, s * 0.5, 0, P2);
  }
  c.fill();
  c.fillStyle = FLAME_COLS[2];
  shape(0.48, 6)(c);
  c.fill();
  c.fillStyle = FLAME_COLS[3];
  shape(0.24, 9)(c);
  c.fill();
  c.restore();
}

const WATER = { body: '#72b8e4', lit: '#e8f6ff', shade: '#3474b4', ink: '#0e2450', dot: '#0e3270' };

/**
 * One frame of the hydrant's geyser (phase 0…1 loops), out of the main at the bottom centre: a jet wobbling up with
 * bulges running up it, flaring at the top where it bursts into froth and spray; streams arcing off the burst on both
 * sides and falling back, broken into dashes that run down them, and drops off their ends. Inked water, a white
 * highlight down its lit side and the fire's orange on its very edge, its shade in dots.
 */
export function geyserFrame(c: Ctx, w: number, h: number, ph: number): void {
  const cx = w / 2;
  const base = h - 4;
  const top = 74 + Math.sin(P2 * ph) * 5;
  const col = (y: number) => {
    const u = (base - y) / (base - top);
    // a jet that flares as it bursts at the top
    let half = 10 + u * 8 + 22 * smooth(0.72, 1, u) ** 1.6;
    for (let k = 0; k < 3; k++) {
      const by = base - ((k / 3 + ph) % 1) * (base - top);
      half += 2.5 * Math.exp(-(((y - by) / 14) ** 2)) * (1 - smooth(0.6, 0.9, u));
    }
    return half;
  };
  const xoff = (y: number) => Math.sin(P2 * (ph + (base - y) / 140)) * 3;
  const colPath: PathFn = (g) => {
    g.beginPath();
    for (let y = base; y >= top; y -= 5) g.lineTo(cx + xoff(y) - col(y), y);
    for (let y = top; y <= base; y += 5) g.lineTo(cx + xoff(y) + col(y), y);
    g.closePath();
  };
  const kx = cx + xoff(top);
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // the streams arcing off the burst and falling back, behind the jet: dashes running down them
  for (const side of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const x0 = kx + side * (18 + k * 7);
      const x1 = kx + side * (58 + k * 15);
      const stream = (g: Ctx) => {
        g.beginPath();
        g.moveTo(x0, top + 2);
        g.quadraticCurveTo(kx + side * (46 + k * 14), top - 26 + k * 6, x1, base - 60 + k * 18);
      };
      const dash = 16 + k * 4;
      const gap = 9;
      c.setLineDash([dash, gap]);
      c.lineDashOffset = -ph * (dash + gap) * 3;
      c.strokeStyle = WATER.ink;
      c.lineWidth = 6.5 - k * 1.2;
      stream(c);
      c.stroke();
      c.strokeStyle = k ? mix(WATER.body, WATER.shade, 0.25) : WATER.body;
      c.lineWidth = 3.6 - k * 0.8;
      stream(c);
      c.stroke();
    }
  c.setLineDash([]);
  // the jet
  flat(c, colPath, WATER.body, 3, WATER.ink, 0.4);
  within(c, colPath, () => {
    c.fillStyle = rgba(WATER.lit, 0.55);
    c.beginPath();
    for (let y = base; y >= top; y -= 5) c.lineTo(cx + xoff(y) - col(y) * 0.75, y);
    for (let y = top; y <= base; y += 5) c.lineTo(cx + xoff(y) - col(y) * 0.25, y);
    c.fill();
    c.fillStyle = rgba('#ffa060', 0.8);
    c.beginPath();
    for (let y = base; y >= top; y -= 5) c.lineTo(cx + xoff(y) - col(y), y);
    for (let y = top; y <= base; y += 5) c.lineTo(cx + xoff(y) - col(y) + 3, y);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 2.2;
    c.beginPath();
    for (let k = 0; k < 4; k++) {
      const y0 = base - ((k / 4 + ph) % 1) * (base - top) * 0.8;
      c.moveTo(cx + xoff(y0) - col(y0) * 0.4, y0);
      c.lineTo(cx + xoff(y0 - 22) - col(y0 - 22) * 0.4, y0 - 22);
    }
    c.stroke();
    dots(c, { x: cx - 50, y: top - 10, w: 100, h: base - top + 10 }, (x, y) => smooth(0, 1, (x - cx - xoff(y)) / col(y) + 0.1) * 0.85, WATER.dot, { step: 4, angle: 0.26 });
  });
  // the burst at its top: froth bubbling over the rim (white-blue lobes, inked), spray flung up off it
  const lobes: [number, number, number][] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const beat = Math.sin(P2 * (ph + i * 0.29));
    lobes.push([kx - 34 + u * 68, top + 4 - Math.sin(Math.PI * u) * 14 + beat * 3, 9 + Math.sin(Math.PI * u) * 6 + beat * 2]);
  }
  const froth: PathFn = (g) => {
    g.beginPath();
    for (const [x, y, rr] of lobes) {
      g.moveTo(x + rr, y);
      g.arc(x, y, rr, 0, P2);
    }
  };
  c.strokeStyle = WATER.ink;
  c.lineWidth = 3.4;
  froth(c);
  c.stroke();
  c.fillStyle = mix(WATER.body, WATER.lit, 0.55);
  froth(c);
  c.fill();
  within(c, froth, () => {
    c.fillStyle = WATER.lit;
    c.beginPath();
    for (const [x, y, rr] of lobes) {
      c.moveTo(x - rr * 0.25 + rr * 0.55, y - rr * 0.3);
      c.arc(x - rr * 0.25, y - rr * 0.3, rr * 0.55, 0, P2);
    }
    c.fill();
    dots(c, { x: kx - 50, y: top - 30, w: 100, h: 50 }, linTone(kx - 10, top - 10, kx + 40, top + 14, 0, 0.7), WATER.dot, { step: 4, angle: 0.26 });
  });
  for (let k = 0; k < 9; k++) {
    const u = (ph + k / 9) % 1;
    const a = -Math.PI / 2 + (k / 8 - 0.5) * 2.4;
    const d = 18 + u * 40;
    const sx = kx + Math.cos(a) * d * 1.3;
    const sy = top - 8 + Math.sin(a) * d + u * u * 36;
    const sr = 3.6 * (1 - u * 0.6);
    flat(c, ellPath(sx, sy, sr, sr), WATER.body, 1.2, WATER.ink, 0);
  }
  // drops off the streams' ends
  for (const side of [-1, 1])
    for (let k = 0; k < 6; k++) {
      const u = (ph * 2 + k / 6 + (side > 0 ? 0.08 : 0)) % 1;
      const x = kx + side * (60 + (k % 3) * 15) + side * u * 8;
      const y = base - 60 + (k % 3) * 18 + u * 50;
      if (y > base - 2) continue;
      flat(c, (g) => {
        g.beginPath();
        g.moveTo(x, y - 6);
        g.quadraticCurveTo(x + 3, y - 1, x, y + 3);
        g.quadraticCurveTo(x - 3, y - 1, x, y - 6);
        g.closePath();
      }, WATER.body, 1.2, WATER.ink, 0);
    }
  // the foam at the main where it bursts out
  for (let k = 0; k < 8; k++) {
    const a = Math.PI + (k / 7) * Math.PI;
    const u = (ph * 2 + k * 0.37) % 1;
    const sx = cx + Math.cos(a) * (14 + u * 22);
    const sy = base - 2 + Math.sin(a) * (4 + u * 10) - Math.sin(Math.PI * u) * 10;
    flat(c, ellPath(sx, sy, 3 * (1 - u * 0.5), 3 * (1 - u * 0.5)), WATER.body, 1.2, WATER.ink, 0);
  }
  c.restore();
}

const SMOKE_PUFF = { body: '#3a2030', lit: '#6a3a44', shade: '#1c0c18', ink: '#0c040a', dot: '#0a0208' };

/** One frame of a smoke column off a fire (phase 0…1 loops): comic puffs born at the bottom left, swelling, leaning
 * off on the wind and thinning as they climb; underlit orange near the fire. */
function smokeFrame(c: Ctx, w: number, h: number, ph: number): void {
  const n = 10;
  for (let i = n - 1; i >= 0; i--) {
    const u = (i + ph) / n;
    const rad = 14 + u * 44;
    const x = w * 0.2 + u * u * (w * 0.5) + Math.sin(u * 6 + 1) * 6;
    const y = h - 18 - u * (h - 120);
    const a = smooth(0, 0.08, u) * (1 - smooth(0.6, 1, u));
    if (a <= 0.01) continue;
    const warm = 1 - smooth(0, 0.35, u);
    comicCloud(c, rng(23 + i), x, y + rad * 0.5, rad * 2.2, rad, { ...SMOKE_PUFF, lit: mix(SMOKE_PUFF.lit, '#e0603a', warm * 0.8), body: mix(SMOKE_PUFF.body, '#8a3a30', warm * 0.6) }, a);
  }
}

function boltFrame(c: Ctx, i: number): void {
  const r = rng(660 + i * 29);
  const { w, h } = BOLT_F;
  const strokes = boltPath(r, w / 2 + (r() - 0.5) * 50, 6, w / 2 + (r() - 0.5) * 130, h - 6, 9, 0.3);
  c.save();
  c.shadowColor = 'rgba(255,220,200,0.9)';
  c.shadowBlur = 24;
  bolt(c, strokes, 8, '#fff2a0', '#ffffff', '#3a1030');
  c.restore();
  bolt(c, strokes, 8, '#fff2a0', '#ffffff', INK);
}

// ——— live ———

registerKitScene(DOOM, (k) => {
  const fx = k.slot('fx');
  const skyL = k.slot('skyLive');
  const cm0 = () => calm();

  // ——— smoke columns off the far fires, and bolts behind the skyline
  const smokeKey = sheet(k, 'ds_smoke', SMOKE_F.w * SMOKE_K, SMOKE_F.h * SMOKE_K, SMOKE_N, (c, ph) => {
    c.scale(SMOKE_K, SMOKE_K);
    smokeFrame(c, SMOKE_F.w, SMOKE_F.h, ph);
  });
  const smokes = FAR_FIRES.map(([fx0, fy, s], i) => new Loop(k, smokeKey, SMOKE_N, fx0 - SMOKE_F.w * 0.2 * s, fy, { into: skyL, origin: [0, 1], scale: s / SMOKE_K, fps: 1.6 + i * 0.3, phase: i * 4 }));
  const farGlows = FAR_FIRES.map(([fx0, fy, s]) => k.glow(fx0, fy - 10, 80 * s, 0xff7a2a, 0.3, { into: skyL, sy: 0.7 }));
  const boltKey = sheet(k, 'ds_bolt', BOLT_F.w * BOLT_K, BOLT_F.h * BOLT_K, BOLT_N, (c, _p, i) => {
    c.scale(BOLT_K, BOLT_K);
    boltFrame(c, i);
  });
  const boltImg = k.img(boltKey, 0, 0, { into: skyL, origin: [0.5, 0], scale: 1 / BOLT_K, alpha: 0 });
  const boltGlow = k.glow(0, 0, 380, 0xffd8c8, 0, { into: skyL, sy: 0.6 });
  const flash = k.wash(0xffd0c0, 0, Phaser.BlendModes.ADD, fx);
  let boltT = -1;
  let nextBolt = 3 + crand() * 4;

  // ——— the billboard on its spring; its neon; the torn tube's sparks
  const signImg = k.pivot(k.sprite('sign'), POST.x, POST.top);
  const swing = new Swing(signImg, { k: 5, c: 0.7, idle: 0.012, seed: 2, speed: 0.6 });
  const NB = SIGN_BOX;
  const NK = 0.5;
  const neonTex = (key: string, letters: number[]) =>
    k.tex(key, Math.ceil(NB.w * NK), Math.ceil(NB.h * NK), (c) => {
      c.scale(NK, NK);
      c.translate(-NB.x, -NB.y);
      hang(c, REST);
      c.save();
      signBody(c)(c);
      c.clip();
      const xs = letterXs(c);
      for (const i of letters) neonTubes(c, xs, 'lit', i);
      c.restore();
    });
  const steadyKey = neonTex('ds_neonA', [0, 1, 3, 4, 10]);
  const stutterKey = neonTex('ds_neonB', [2, 5]);
  const neonA = k.img(steadyKey, NB.x, NB.y, { into: fx, add: true, origin: [0, 0], scale: 1 / NK });
  const neonB = k.img(stutterKey, NB.x, NB.y, { into: fx, add: true, origin: [0, 0], scale: 1 / NK });
  for (const im of [neonA, neonB]) k.pivot(im, POST.x, POST.top);
  const signGlow = k.glow(560, 410, 220, 0xff3a4a, 0.2, { into: fx, sy: 0.5 });
  let stutT = -1;
  let stutNext = 1.5 + crand() * 3;
  let outT = 0;
  const sparks = new Parts(k, { frame: 'spark', add: true, into: fx, max: 90 });
  const tubeEnd = () => {
    const a = REST + swing.angle;
    const dx = TUBE_END.x - HOOK.x;
    const dy = TUBE_END.y - HOOK.y;
    return [POST.x + dx * Math.cos(a) - dy * Math.sin(a), POST.top + dx * Math.sin(a) + dy * Math.cos(a)] as const;
  };
  const spray = (n: number) => {
    const [sx, sy] = tubeEnd();
    for (let i = 0; i < n; i++)
      sparks.spawn({ x: sx, y: sy, vx: (crand() - 0.4) * 240, vy: -40 - crand() * 220, life: 0.7 + crand() * 0.8, r0: 2.6, r1: 1.1, a: 1, tint: crand() < 0.5 ? 0xffe0a0 : 0xffffff, grav: 900, drag: 0.4, floor: DR.walk - 2 + crand() * 10, bounce: 0.4, streak: 0.02, fade: 0.02 });
  };
  const sparkFlash = k.glow(0, 0, 50, 0xfff0c0, 0, { into: fx });

  // ——— the fires: painted loops, their light on the walls, embers
  const fireKey = sheet(k, 'ds_fire', FIRE_F.w * FIRE_K, FIRE_F.h * FIRE_K, FIRE_N, (c, ph, i) => {
    c.scale(FIRE_K, FIRE_K);
    fireFrame(c, FIRE_F.w, FIRE_F.h, ph, 3 + (i % 1));
  });
  const fires = FIRES.map((f, i) => ({
    f,
    loop: new Loop(k, fireKey, FIRE_N, f.x, f.y + 4 * f.s, { into: fx, origin: [0.5, 1], scale: f.s / FIRE_K, fps: 11 + i * 0.7, phase: i * 3.3 }),
    glow: k.glow(f.x, f.y - 60 * f.s, 160 * f.s, 0xff7a2a, 0.3, { into: fx, sy: 0.9 }),
    flare: 0,
    seed: i * 1.7,
  }));
  for (const [i, fi] of fires.entries()) if (i % 2) fi.loop.each((im) => im.setFlipX(true));
  const embers = new Parts(k, { frame: 'ember', add: true, into: fx, max: 140 });
  const emberRate = new Rate();
  const ember = (f: (typeof FIRES)[number], burst = 1) =>
    embers.spawn({ x: f.x + (crand() - 0.5) * 60 * f.s, y: f.y - 70 * f.s, vx: (crand() - 0.3) * 40 * burst, vy: -60 - crand() * 90 * burst, life: 1.6 + crand() * 1.6, r0: 2.4 + crand() * 1.6, r1: 0.6, a: 1, tint: crand() < 0.5 ? 0xffb040 : 0xff7020, grav: -20, drag: 0.3, streak: 0.01, fade: 0.05 });

  // ——— the hydrant's geyser, its drops and splashes
  const geyKey = sheet(k, 'ds_geyser', GEY_F.w * GEY_K, GEY_F.h * GEY_K, GEY_N, (c, ph) => {
    c.scale(GEY_K, GEY_K);
    geyserFrame(c, GEY_F.w, GEY_F.h, ph);
  });
  const gey = new Loop(k, geyKey, GEY_N, DR.hydrant.x, DR.hydrant.y - 6, { into: fx, origin: [0.5, 1], scale: 1 / GEY_K, fps: 14 });
  const surge = new Spring(0, 6, 1.2);
  const drops = new Parts(k, { frame: 'drop', into: fx, max: 120 });
  const dropRate = new Rate();
  const splashAt = (x: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) drops.spawn({ x, y, vx: (crand() - 0.5) * 120, vy: -60 - crand() * 90, life: 0.4, r0: 1.8, a: 0.8, tint: 0xcfe8ff, grav: 900, streak: 0.012 });
  };
  const drop = (power = 1) =>
    drops.spawn({ x: DR.hydrant.x + (crand() - 0.5) * 30, y: DR.hydrant.y - 300 * (0.85 + 0.15 * power), vx: (crand() - 0.5) * 220 * power, vy: -40 - crand() * 80, life: 2, r0: 2.4 + crand() * 1.4, a: 0.9, tint: 0xd8f0ff, grav: 900, streak: 0.012, floor: PUDDLE[1] - 10 + crand() * 20, onFloor: (x, y) => splashAt(x, y, 2) });

  // ——— the lamp's broken bulb, grit and chunks off the torn edges
  const bulbGlow = k.glow(BULB.x, BULB.y, 46, 0xfff0c0, 0, { into: fx });
  const grit = new Parts(k, { frame: 'mote', into: fx, max: 120 });
  const chunks = new Parts(k, { frame: 'puff', into: fx, max: 30 });
  const dust = new Parts(k, { frame: 'puff', into: fx, max: 40 });
  const shake = (x: number, p: number) => {
    // grit off the tenement's tear and the bootprint's rim, nearer the stomp more
    const n = Math.round(4 + p * 16);
    for (let i = 0; i < n; i++) {
      const [tx, ty] = TEAR[Math.floor(crand() * TEAR.length)];
      grit.spawn({ x: tx + (crand() - 0.5) * 10, y: ty, vx: 10 + crand() * 30, vy: crand() * 30, life: 1.6, r0: 1.4 + crand() * 1.8, a: 0.9, tint: 0xd8a080, grav: 700, floor: DR.walk - 4 + crand() * 14 });
      const a = crand() * P2;
      grit.spawn({ x: DR.print.x + Math.cos(a) * 90, y: DR.print.y + Math.sin(a) * 140, vx: (crand() - 0.5) * 40, vy: crand() * 20, life: 1.6, r0: 1.4 + crand() * 1.6, a: 0.9, tint: 0xe0a870, grav: 700, floor: DR.walk - 4 + crand() * 14 });
    }
    if (p > 0.6) {
      // a brick chunk tumbles off the tear and bounces on the sidewalk
      const [tx, ty] = TEAR[4 + Math.floor(crand() * 6)];
      chunks.spawn({ x: tx, y: ty, vx: 20 + crand() * 50, vy: -20, life: 2.2, r0: 5 + crand() * 3, a: 1, tint: 0x8a3a2a, grav: 900, floor: DR.walk + 4, bounce: 0.35, spin: 6, fade: 0.01 });
    }
    void x;
  };

  return {
    impact(x, _y, p) {
      swing.kick((x < 600 ? 1 : -1) * (0.35 + p * 0.9));
      if (crand() < 0.5 + p * 0.5) spray(Math.round(8 + p * 20));
      outT = 0.15 + p * 0.25;
      surge.v += 3 + p * 6;
      for (const fi of fires) {
        fi.flare = Math.min(1.5, fi.flare + 0.5 + p * 0.8);
        for (let i = 0; i < Math.round(3 + p * 8 * fi.f.s); i++) ember(fi.f, 1.8);
      }
      for (let i = 0; i < 6 * p; i++) drop(1.4);
      shake(x, p);
      for (let i = 0; i < Math.round(3 + p * 5); i++) {
        const dx = [200, 900, 1740][i % 3] + (crand() - 0.5) * 300;
        dust.spawn({ x: dx, y: DR.kerb - crand() * 20, vx: (crand() - 0.5) * 50, vy: -20 - crand() * 30, life: 1.4 + crand(), r0: 10, r1: 30 + crand() * 16, a: 0.35, tint: 0x8a6a6a, drag: 0.8, fade: 0.1 });
      }
    },
    update(dt, t) {
      const cm = cm0();
      // ——— smoke and the far fires
      for (const s of smokes) s.step(dt, cm);
      for (const [i, g] of farGlows.entries()) g.setAlpha(0.26 + 0.08 * Math.sin(t * 3 + i * 2) * cm);
      // ——— bolts (the act's layer flashes the screen and thunders when it hears one)
      nextBolt -= dt;
      if (nextBolt <= 0) {
        nextBolt = 6 + crand() * 7;
        const bx = 990 + crand() * 520;
        boltImg.setFrame(Math.floor(crand() * BOLT_N)).setPosition(bx, 10).setFlipX(crand() < 0.5);
        boltGlow.setPosition(bx, 90);
        boltT = 0;
        k.sc.events.emit('doomstomp:bolt', crand() < 0.35);
      }
      if (boltT >= 0) {
        boltT += dt;
        const seq = [1, 0.25, 1, 0.7, 0.5, 0.3, 0];
        const i = Math.min(seq.length - 1, Math.floor(boltT / 0.06));
        const v = seq[i];
        boltImg.setAlpha(v);
        boltGlow.setAlpha(v * 0.7);
        flash.setAlpha(v * 0.12 * cm);
        if (i >= seq.length - 1) boltT = -1;
      }
      // ——— the sign swings; its neon buzzes, the P stutters; the tube spits sparks now and then
      swing.update(dt, t);
      neonA.rotation = neonB.rotation = signImg.rotation;
      stutNext -= dt;
      if (stutNext <= 0) {
        stutNext = 2 + crand() * 4;
        stutT = 0;
        if (crand() < 0.7) spray(4 + Math.floor(crand() * 8));
      }
      let stut = 1;
      if (stutT >= 0) {
        stutT += dt;
        stut = [1, 0.1, 0.8, 0, 0, 0.6, 0.1, 1, 0, 0.9][Math.floor(stutT / 0.09) % 10];
        if (stutT > 0.9) stutT = -1;
      }
      outT = Math.max(0, outT - dt);
      const out = outT > 0 ? 0.15 : 1;
      const buzz = 0.88 + Math.sin(t * 47) * 0.05 + Math.sin(t * 13) * 0.05;
      neonA.setAlpha(0.9 * buzz * out);
      neonB.setAlpha(0.85 * buzz * out * stut * 0.8);
      signGlow.setAlpha((0.16 + 0.06 * stut) * buzz * out);
      const [ex, ey] = tubeEnd();
      sparkFlash.setPosition(ex, ey).setAlpha(sparks.count > 0 ? 0.25 + crand() * 0.3 : 0);
      sparks.update(dt);
      // ——— the fires
      for (const fi of fires) {
        fi.flare = Math.max(0, fi.flare - dt * 1.2);
        fi.loop.step(dt, cm * (1 + fi.flare * 0.6));
        const fl = 1 + fi.flare * 0.25;
        fi.loop.each((im) => im.setScale((fi.f.s / FIRE_K) * (1 + fi.flare * 0.08), (fi.f.s / FIRE_K) * fl));
        const fk = 0.85 + Math.sin(t * 9.1 + fi.seed) * 0.08 + Math.sin(t * 15.7 + fi.seed * 2) * 0.06;
        fi.glow.setAlpha((0.24 + 0.16 * fi.flare) * fk);
        emberRate.tick(2.2 * fi.f.s * cm, dt / fires.length, () => ember(fi.f));
      }
      embers.update(dt);
      // ——— the geyser: churning, surging on stomps, throwing drops into its puddle
      const sv = surge.step(0, dt);
      gey.step(dt, cm * (1 + Math.max(0, sv) * 0.3));
      gey.each((im) => im.setScale((1 / GEY_K) * (1 + 0.04 * wander(t, 4) * cm), (1 / GEY_K) * (1 + Math.max(-0.1, sv * 0.12) + 0.03 * wander(t * 1.3, 9) * cm)));
      dropRate.tick(18 * cm, dt, () => drop());
      drops.update(dt);
      // ——— the lamp's bulb flickers on its last wire
      const on = Math.sin(t * 23) > 0.2 && Math.sin(t * 3.1) > -0.3 ? 1 : 0;
      bulbGlow.setAlpha(on * (0.4 + crand() * 0.15));
      grit.update(dt);
      chunks.update(dt);
      dust.update(dt);
    },
  };
});
