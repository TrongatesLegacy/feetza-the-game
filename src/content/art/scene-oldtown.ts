// Old Town Rooftops (Stage 8, waves 36–39), redrawn with the location kit (src/art/scene): a roof terrace over the
// old town at nightfall. The last of the day burning low behind the campanile and the duomo, the moon up between the
// lanes, roofs of curved terracotta coppi falling away in rows through the evening haze with their shutters lit,
// a washing line strung across the left, a stucco parapet with geraniums and two iron lanterns, and the terrace's
// cotto tiles for a table.
// Live: the washing flaps through painted frames in the wind; smoke curls from the chimneys; the lanterns' flames
// lick and gutter; pigeons strut and peck along the parapet and burst into the air when a foot stomps, coming back
// later; windows light up and go dark; the clock keeps time. Across the stage the weather turns: the afterglow
// dies, the wind gets up, mist creeps over the roofs, and by the last wave a storm is rolling in from the right,
// lightning walking through its clouds (the Gargoyle's bell tower waits in it).

import Phaser from 'phaser';
import {
  type Air,
  type Ctx,
  type R,
  TY,
  W,
  airMix,
  calmLanes,
  castShadow,
  crevice,
  creviceV,
  ellPath,
  jitter,
  glowAt,
  gradeAll,
  groundShadow,
  haze,
  lightPool,
  lineAt,
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
import { brickPatch, plaster, tableFalloff, tableSeam } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, streaks } from '../../art/scene/paint';
import { flameShape, hang } from '../../art/scene/props';
import { cloud, farLand, horizonGlow, skyFill, stars } from '../../art/scene/sky';
import { floorPlane } from '../../art/scene/surfaces';
import { spec as specHi } from '../../art/style/kit';
import { MATERIALS } from '../../art/style/materials';
import { makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { calm, flicker, lerp, registerKitScene, waveK } from '../../game/sceneLive';
import { Loop, Parts, Rate, Spring, flameFrame, sheet, steamFrame } from '../../game/sceneAnim';

// ——— layout ———

export const OTX = {
  horizon: 470,
  sky: 440,
  moon: { x: 1240, y: 112, r: 44 },
  tower: { x: 760, top: 104, w: 92, base: 480, clockY: 286 },
  dome: { x: 1080, y: 404, r: 128 },
  parapet: { top: 664, coping: 22 },
  lamps: [150, 1770],
  lampY: 548,
  pots: [340, 1590],
  line: { x0: 250, x1: 900, y: 430, sag: 40 },
  chimneys: [[312, 494], [1294, 506], [1690, 468]] as [number, number][],
  front: 1040,
};

/** The evening air: violet haze thickening to the horizon. */
const DUSK: Air = { color: '#6a5a96', far: 0.7 };
const STUCCO = '#d89a6a';
/** Stucco and render: chalky, a fine grain, no veins. */
const STUC = { ...MATERIALS.stone, name: 'Stucco', shadowTint: '#3a1a30', tex: 'grain' as const, texA: 0.25, rim: 0.3 };

// ——— the sky ———

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: OTX.horizon + 40 };
  skyFill(ctx, box, [[0, '#0c1230'], [0.35, '#1e2656'], [0.62, '#46407a'], [0.82, '#a86a7a'], [0.94, '#f0a070'], [1, '#ffc080']], 0.05);
  // the afterglow: the sun gone down behind the campanile, the air thick and warm along the roofs
  horizonGlow(ctx, OTX.horizon, 160, '#ffb070', 0.45);
  glowAt(ctx, 640, OTX.horizon - 10, 520, '#ff9a5a', 0.22, 0.4);
  stars(ctx, r, { x: 0, y: 0, w: W, h: 200 }, 70, '#f0f0ff');
  // high cirrus catching the last pink light, thin bars low down
  for (let i = 0; i < 4; i++) cloud(ctx, r, 200 + i * 480 + r() * 120, 360 + r() * 40, 360 + r() * 200, 22, { kind: 'stratus', lit: '#ffb890', body: '#8a6a90', shadow: '#4a3a6a', sunX: 640, sunY: OTX.horizon + 80, rim: 0.4, wisp: 0.5, a: 0.55, depth: 0.6, air: DUSK });
  // the moon, its halo in the haze
  const m = OTX.moon;
  glowAt(ctx, m.x, m.y, 200, '#c8d4ff', 0.1);
  const mg = ctx.createRadialGradient(m.x - 14, m.y - 14, 4, m.x, m.y, m.r);
  mg.addColorStop(0, '#fdfaf0');
  mg.addColorStop(0.75, '#e4e0d0');
  mg.addColorStop(1, '#b8b4a8');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  ctx.fill();
  within(ctx, ellPath(m.x, m.y, m.r, m.r), () => {
    // the maria: soft grey seas, the highlands paler between them, a few bright young craters with rays
    softly(ctx, { x: m.x - m.r, y: m.y - m.r, w: m.r * 2, h: m.r * 2 }, (q) => {
      for (const [dx, dy, rx, ry, a] of [[-16, -14, 20, 15, 0.5], [8, -20, 14, 11, 0.42], [14, 4, 18, 14, 0.46], [-6, 12, 12, 9, 0.36], [-26, 8, 9, 13, 0.3]]) {
        q.fillStyle = rgba('#8a8884', a * 0.6);
        q.beginPath();
        q.ellipse(m.x + dx, m.y + dy, rx, ry, 0.4, 0, Math.PI * 2);
        q.fill();
      }
    }, 0.35);
    lay(ctx, noiseMask(5, 77, { cover: 0.3, soft: 0.25, col: '#8a887e', w: 64, h: 64 }), { x: m.x - m.r, y: m.y - m.r, w: m.r * 2, h: m.r * 2 }, 0.3);
    for (const [dx, dy, rr] of [[-20, 26, 4], [24, -26, 3], [30, 20, 2.5]]) {
      ctx.fillStyle = 'rgba(255,255,250,0.55)';
      ctx.beginPath();
      ctx.arc(m.x + dx, m.y + dy, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(90,88,80,0.35)';
      ctx.beginPath();
      ctx.arc(m.x + dx + rr * 0.3, m.y + dy + rr * 0.3, rr * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // the limb darkening, and the evening air reddening its lower edge
    const lg = ctx.createRadialGradient(m.x - 6, m.y - 6, m.r * 0.5, m.x, m.y, m.r);
    lg.addColorStop(0, 'rgba(60,56,70,0)');
    lg.addColorStop(1, 'rgba(60,56,70,0.3)');
    ctx.fillStyle = lg;
    ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
    vfill(ctx, m.x - m.r, m.y, m.r * 2, m.r, [[0, 'rgba(255,190,150,0)'], [1, 'rgba(255,190,150,0.14)']]);
  });
}

/** The storm rolling in (live: it fades in over the last waves): a heavy bank, its billows lit by the moon on top,
 * its belly dark, rain hanging under it in veils. */
function storm(ctx: Ctx, r: R): void {
  const b = SKY_BOX;
  const [c, g] = makeCanvas(b.w, b.h);
  g.translate(-b.x, -b.y);
  vfill(g, b.x, 0, b.w, b.h, [[0, 'rgba(8,10,22,0.85)'], [0.7, 'rgba(20,22,40,0.6)'], [1, 'rgba(30,30,50,0)']]);
  STORM_PUFFS.forEach(([x, y, cw, ch], i) => {
    cloud(g, r, x, y, cw, ch, { kind: 'bank', lit: '#8a94c0', body: '#2a2e48', shadow: '#0c0e1c', sunX: OTX.moon.x, sunY: -200, rim: 0.3, wisp: 0.35, a: 0.9 - i * 0.06, res: 0.4 });
  });
  // veils of rain under the cloud
  softly(g, { x: b.x, y: 100, w: b.w, h: b.h - 100 }, (q) => {
    q.strokeStyle = 'rgba(140,150,190,0.14)';
    q.lineWidth = 24;
    for (let x = b.x + 120; x < W + 200; x += 70 + r() * 60) {
      q.beginPath();
      q.moveTo(x, 200 + r() * 60);
      q.lineTo(x - 80, b.h + 20);
      q.stroke();
    }
  }, 0.2);
  // the front's leading edge, feathered into the clear sky
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const fe = g.createLinearGradient(0, 0, 200, 0);
  fe.addColorStop(0, 'rgba(0,0,0,0)');
  fe.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fe;
  g.fillRect(0, 0, b.w, b.h);
  ctx.drawImage(c, b.x, b.y);
}
/** The storm comes in from the right (its box stays clear of the campanile and the duomo, so they stay in the base;
 * scud driven ahead of it crosses the sky above them). */
const SKY_BOX = { x: 1220, y: 0, w: W - 1220, h: 410 };

// ——— the town ———

/** A run of coppi roofing over a roof's polygon: rows of curved tiles, each lit on its left flank, the rows'
 * overlaps in shadow, moss and odd broken tiles; the eaves' shadow on the wall under it. */
function roofTiles(ctx: Ctx, r: R, path: (c: Ctx) => void, box: { x: number; y: number; w: number; h: number }, col: string, depth: number, rowH = 12, tileW = 14): void {
  within(ctx, path, () => {
    ctx.fillStyle = airMix(shade(col, -0.35), depth, DUSK);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    for (let y = box.y; y < box.y + box.h + rowH; y += rowH) {
      const off = ((y / rowH) % 2) * tileW * 0.5;
      for (let x = box.x - tileW + off; x < box.x + box.w + tileW; x += tileW) {
        const c = airMix(shade(col, (r() - 0.5) * 0.18), depth, DUSK);
        const g = ctx.createLinearGradient(x, 0, x + tileW, 0);
        g.addColorStop(0, shade(c, 0.18));
        g.addColorStop(0.45, c);
        g.addColorStop(1, shade(c, -0.35));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + rowH + 2);
        ctx.quadraticCurveTo(x + 1, y - 2, x + tileW / 2, y - 3);
        ctx.quadraticCurveTo(x + tileW - 1, y - 2, x + tileW - 1, y + rowH + 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(20,10,20,0.35)';
      ctx.fillRect(box.x, y + rowH - 2, box.w, 2);
    }
    lay(ctx, noiseMask(8, Math.round(box.x), { cover: 0.2, soft: 0.2, col: airMix('#4a5a3a', depth, DUSK) }), box, 0.35);
  });
}

interface House {
  x: number;
  w: number;
  base: number;
  h: number;
  roof: number;
  wall: string;
  depth: number;
  hip?: boolean;
  lit: number[];
}

/** A house in the old town: a stuccoed block, shuttered windows (some lit), its roof of coppi. */
function house(ctx: Ctx, r: R, hs: House): void {
  const { x, w, base, h, roof, depth } = hs;
  const top = base - h;
  const wallCol = airMix(hs.wall, depth, DUSK);
  const body = rectPath(x, top, w, h);
  solid(ctx, body, { x, y: top, w, h }, STUC, wallCol, { depth, air: DUSK, formSize: 20, line: lineAt(depth) * 0.7 });
  within(ctx, body, () => {
    lay(ctx, drift(shade(wallCol, 0.12), shade(wallCol, -0.2), 4, Math.round(x), 48, 48), { x, y: top, w, h }, 0.4);
    // the eaves' shadow, the evening glow on the west (left) faces
    vfill(ctx, x, top, w, 24, [[0, 'rgba(10,6,20,0.45)'], [1, 'rgba(10,6,20,0)']]);
    vfill(ctx, x, top, 30, h, [[0, rgba('#ff9a6a', 0.12 * (1 - depth))], [1, rgba('#ff9a6a', 0)]]);
    streaks(ctx, r, x + w * 0.3, top + 20, w * 0.5, h * 0.4, '#2a1a20', 0.12 * (1 - depth), 3);
  });
  // windows: shutters, some open on lamplight
  const rows = Math.max(1, Math.floor((h - 30) / 46));
  const cols = Math.max(1, Math.floor(w / 46));
  let k = 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++, k++) {
      const wx = x + (i + 0.5) * (w / cols);
      const wy = top + 34 + j * 46;
      const ww = 14 * (1 - depth * 0.3);
      const wh = 22 * (1 - depth * 0.3);
      const lit = hs.lit.includes(k);
      ctx.fillStyle = lit ? '#ffcf7a' : airMix('#1a1424', depth, DUSK);
      ctx.fillRect(wx - ww / 2, wy, ww, wh);
      if (lit) {
        glowAt(ctx, wx, wy + wh / 2, 26, '#ffb050', 0.35 * (1 - depth * 0.4));
        ctx.fillStyle = 'rgba(120,60,20,0.5)';
        ctx.fillRect(wx - 0.75, wy, 1.5, wh);
      }
      // shutters open beside it
      ctx.fillStyle = airMix('#3a6a4a', depth, DUSK);
      ctx.fillRect(wx - ww / 2 - ww * 0.55, wy, ww * 0.5, wh);
      ctx.fillRect(wx + ww / 2 + ww * 0.05, wy, ww * 0.5, wh);
      ctx.fillStyle = 'rgba(10,6,16,0.35)';
      ctx.fillRect(wx - ww / 2, wy + wh, ww, 2);
    }
  // the roof
  const rh = roof;
  const rp = hs.hip
    ? polyPath([[x - 8, top + 2], [x + w * 0.25, top - rh], [x + w * 0.75, top - rh], [x + w + 8, top + 2]])
    : polyPath([[x - 8, top + 2], [x + w / 2, top - rh], [x + w + 8, top + 2]]);
  roofTiles(ctx, r, rp, { x: x - 10, y: top - rh - 2, w: w + 20, h: rh + 6 }, '#c0583a', depth, 10 - depth * 3, 13 - depth * 3);
  ctx.strokeStyle = airMix('#2a1418', depth, DUSK);
  ctx.lineWidth = lineAt(depth) * 0.7;
  rp(ctx);
  ctx.stroke();
  // the ridge catches the afterglow
  ctx.strokeStyle = rgba('#ffb080', 0.4 * (1 - depth * 0.6));
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (hs.hip) {
    ctx.moveTo(x - 8, top + 2);
    ctx.lineTo(x + w * 0.25, top - rh);
    ctx.lineTo(x + w * 0.75, top - rh);
  } else {
    ctx.moveTo(x - 8, top + 2);
    ctx.lineTo(x + w / 2, top - rh);
  }
  ctx.stroke();
}

/** How much of the afterglow (behind the campanile) a far edge at x catches. */
const glowK = (x: number): number => Math.max(0, 1 - Math.abs(x - 640) / 900);

function farTown(ctx: Ctx, r: R): void {
  // the hills beyond the town: two soft ranges, their ridges catching the afterglow
  const ridge = (base: number, amp: number, seed: number): [number, number][] => {
    const pts: [number, number][] = [[0, OTX.horizon + 40]];
    for (let x = 0; x <= W; x += 24) pts.push([x, base - amp * (0.5 + 0.5 * Math.sin(x * 0.004 + seed) * Math.cos(x * 0.0017 + seed * 2))]);
    pts.push([W, OTX.horizon + 40]);
    return pts;
  };
  farLand(ctx, ridge(452, 30, 1.3), OTX.horizon + 40, '#4a3a6a', 0.82, DUSK, '#ffb890', 0.35);
  farLand(ctx, ridge(470, 22, 4.1), OTX.horizon + 40, '#3e3058', 0.76, DUSK, '#ffb890', 0.3);
  // two ranks of far roofs: little stuccoed blocks under gables and hips, a bell tower here and there, cypresses
  for (const rk of [{ base: 492, depth: 0.8, h: [12, 28], w: [36, 70] }, { base: 506, depth: 0.72, h: [16, 34], w: [46, 90] }]) {
    let x = -30 + r() * 20;
    while (x < W + 20) {
      const w = rk.w[0] + r() * (rk.w[1] - rk.w[0]);
      const h = rk.h[0] + r() * (rk.h[1] - rk.h[0]);
      const top = rk.base - h;
      const gk = glowK(x + w / 2);
      const wall = airMix(['#c8a088', '#b89080', '#d0a890', '#b8987a'][Math.floor(r() * 4)], rk.depth, DUSK);
      if (r() < 0.07) {
        // a cypress, dark and tall
        const ch = 40 + r() * 26;
        ctx.fillStyle = airMix('#1e2a22', rk.depth, DUSK);
        ctx.beginPath();
        ctx.moveTo(x + 6, rk.base);
        ctx.quadraticCurveTo(x - 4, rk.base - ch * 0.5, x + 6, rk.base - ch);
        ctx.quadraticCurveTo(x + 16, rk.base - ch * 0.5, x + 6, rk.base);
        ctx.fill();
      }
      ctx.fillStyle = wall;
      ctx.fillRect(x, top, w, h + 20);
      // the walls face us, away from the glow: shaded, the left edge catching a little of it
      ctx.fillStyle = rgba('#2a1a3a', 0.25);
      ctx.fillRect(x + w * 0.6, top, w * 0.4, h + 20);
      ctx.fillStyle = rgba('#ffb890', 0.18 * gk);
      ctx.fillRect(x, top, 3, h + 20);
      const rh = 6 + r() * 10;
      const roof = airMix('#a85a44', rk.depth, DUSK);
      ctx.fillStyle = roof;
      ctx.beginPath();
      if (r() < 0.5) {
        ctx.moveTo(x - 3, top + 1);
        ctx.lineTo(x + w / 2, top - rh);
        ctx.lineTo(x + w + 3, top + 1);
      } else {
        ctx.moveTo(x - 3, top + 1);
        ctx.lineTo(x + w * 0.22, top - rh * 0.7);
        ctx.lineTo(x + w * 0.78, top - rh * 0.7);
        ctx.lineTo(x + w + 3, top + 1);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#1a0c20', 0.3);
      ctx.fillRect(x, top + 1, w, 2);
      // the ridge lit by the afterglow
      ctx.strokeStyle = rgba('#ffc090', 0.15 + 0.4 * gk);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // windows: most shuttered, a few lit
      for (let wy = top + 5; wy < rk.base - 4; wy += 9)
        for (let wx = x + 5; wx < x + w - 6; wx += 10 + r() * 4)
          if (r() < 0.28) {
            const lit = r() < 0.4;
            ctx.fillStyle = lit ? rgba('#ffc878', 0.55 + r() * 0.35) : rgba('#2a1e34', 0.5);
            ctx.fillRect(wx, wy, 2.5, 3.5);
          }
      if (r() < 0.08) {
        // a little campanile
        const bx = x + w * 0.5;
        const bh = 34 + r() * 26;
        ctx.fillStyle = shade(wall, -0.05);
        ctx.fillRect(bx - 5, rk.base - bh - h * 0.2, 10, bh);
        ctx.fillStyle = rgba('#1a1024', 0.8);
        ctx.fillRect(bx - 2.5, rk.base - bh - h * 0.2 + 6, 5, 7);
        ctx.fillStyle = roof;
        ctx.beginPath();
        ctx.moveTo(bx - 7, rk.base - bh - h * 0.2);
        ctx.lineTo(bx, rk.base - bh - h * 0.2 - 14);
        ctx.lineTo(bx + 7, rk.base - bh - h * 0.2);
        ctx.fill();
      }
      x += w * (0.78 + r() * 0.2);
    }
    haze(ctx, rk.base - 30, rk.base + 6, '#b088a8', 0.3, 0.75);
  }
}

/** The campanile: brick shaft, belfry arches, the clock face lit, a pyramid spire. */
function tower(ctx: Ctx, r: R): void {
  const t = OTX.tower;
  const depth = 0.75;
  const col = airMix('#8a5a4a', depth, DUSK);
  const shaft = rectPath(t.x - t.w / 2, t.top + 80, t.w, t.base - t.top - 80);
  solid(ctx, shaft, { x: t.x - t.w / 2, y: t.top + 80, w: t.w, h: t.base - t.top - 80 }, STUC, col, { depth, air: DUSK, line: lineAt(depth) * 0.7, formSize: 20 });
  within(ctx, shaft, () => {
    // courses of brick, faint at this distance, and the evening light down its left side
    ctx.strokeStyle = rgba('#2a1a20', 0.18);
    ctx.lineWidth = 1;
    for (let y = t.top + 84; y < t.base; y += 7) {
      ctx.beginPath();
      ctx.moveTo(t.x - t.w / 2, y);
      ctx.lineTo(t.x + t.w / 2, y);
      ctx.stroke();
    }
    vfill(ctx, t.x - t.w / 2, t.top, 24, t.base - t.top, [[0, rgba('#ffa070', 0.3)], [1, rgba('#ffa070', 0.08)]]);
    // the face turned from the light: cooler and darker
    const sg = ctx.createLinearGradient(t.x, 0, t.x + t.w / 2, 0);
    sg.addColorStop(0, 'rgba(26,16,48,0)');
    sg.addColorStop(1, 'rgba(26,16,48,0.38)');
    ctx.fillStyle = sg;
    ctx.fillRect(t.x, t.top, t.w / 2, t.base - t.top);
  });
  // belfry: two arches, dark inside, a bell's silhouette
  for (const dx of [-20, 20]) {
    ctx.fillStyle = '#120c18';
    ctx.beginPath();
    ctx.moveTo(t.x + dx - 12, t.top + 150);
    ctx.lineTo(t.x + dx - 12, t.top + 116);
    ctx.arc(t.x + dx, t.top + 116, 12, Math.PI, 0);
    ctx.lineTo(t.x + dx + 12, t.top + 150);
    ctx.fill();
  }
  // the clock (its hands are live)
  const cy = t.clockY;
  glowAt(ctx, t.x, cy, 60, '#ffe0a0', 0.25);
  ctx.fillStyle = '#f4e8c8';
  ctx.beginPath();
  ctx.arc(t.x, cy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = airMix('#3a2a20', 0.4, DUSK);
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(t.x + Math.cos(a) * 20 - 1, cy + Math.sin(a) * 20 - 1, 2.5, 2.5);
  }
  // cornice and spire
  const corn = rectPath(t.x - t.w / 2 - 8, t.top + 72, t.w + 16, 12);
  solid(ctx, corn, { x: t.x - t.w / 2 - 8, y: t.top + 72, w: t.w + 16, h: 12 }, STUC, col, { depth, air: DUSK, line: lineAt(depth) * 0.7 });
  const spire = polyPath([[t.x - t.w / 2 - 2, t.top + 74], [t.x, t.top], [t.x + t.w / 2 + 2, t.top + 74]]);
  solid(ctx, spire, { x: t.x - t.w / 2, y: t.top, w: t.w, h: 74 }, STUC, airMix('#6a3a34', depth, DUSK), { depth, air: DUSK, line: lineAt(depth) * 0.7 });
  within(ctx, spire, () => {
    ctx.fillStyle = rgba('#ffa080', 0.22);
    ctx.beginPath();
    ctx.moveTo(t.x - t.w / 2, t.top + 74);
    ctx.lineTo(t.x, t.top);
    ctx.lineTo(t.x - 6, t.top + 74);
    ctx.fill();
  });
  ctx.strokeStyle = '#2a2020';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(t.x, t.top);
  ctx.lineTo(t.x, t.top - 22);
  ctx.moveTo(t.x - 7, t.top - 14);
  ctx.lineTo(t.x + 7, t.top - 14);
  ctx.stroke();
  void r;
}
const TOWER_BOX = { x: OTX.tower.x - 70, y: OTX.tower.top - 30, w: 140, h: OTX.tower.base - OTX.tower.top + 40 };

/** The duomo: a ribbed dome on its drum, a lantern on top, lit warm on its left by the afterglow. */
function dome(ctx: Ctx, r: R): void {
  const d = OTX.dome;
  const depth = 0.85;
  const drum = rectPath(d.x - d.r * 0.82, d.y - 10, d.r * 1.64, 70);
  solid(ctx, drum, { x: d.x - d.r, y: d.y - 10, w: d.r * 2, h: 70 }, STUC, airMix('#b8907a', depth, DUSK), { depth, air: DUSK, line: lineAt(depth) * 0.6 });
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = airMix('#2a1a28', depth, DUSK);
    ctx.beginPath();
    ctx.roundRect(d.x - d.r * 0.7 + i * d.r * 0.23, d.y + 6, 10, 26, 5);
    ctx.fill();
  }
  const shell = (c: Ctx) => {
    c.beginPath();
    c.moveTo(d.x - d.r * 0.86, d.y - 8);
    c.bezierCurveTo(d.x - d.r * 0.86, d.y - d.r * 0.9, d.x - d.r * 0.3, d.y - d.r * 1.12, d.x, d.y - d.r * 1.14);
    c.bezierCurveTo(d.x + d.r * 0.3, d.y - d.r * 1.12, d.x + d.r * 0.86, d.y - d.r * 0.9, d.x + d.r * 0.86, d.y - 8);
    c.closePath();
  };
  solid(ctx, shell, { x: d.x - d.r, y: d.y - d.r * 1.2, w: d.r * 2, h: d.r * 1.2 }, STUC, airMix('#a85a40', depth, DUSK), { depth, air: DUSK, line: lineAt(depth) * 0.6, formSize: 40 });
  within(ctx, shell, () => {
    // the ribs, curving with the dome
    for (let i = -3; i <= 3; i++) {
      const u = i / 3.6;
      ctx.strokeStyle = airMix('#e8c0a0', depth, DUSK);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(d.x + u * d.r * 0.86, d.y - 8);
      ctx.quadraticCurveTo(d.x + u * d.r * 0.8, d.y - d.r * 0.9, d.x, d.y - d.r * 1.14);
      ctx.stroke();
    }
    const g = ctx.createLinearGradient(d.x - d.r, 0, d.x + d.r, 0);
    g.addColorStop(0, rgba('#ffa070', 0.3));
    g.addColorStop(0.5, rgba('#ffa070', 0));
    g.addColorStop(1, rgba('#1a1030', 0.35));
    ctx.fillStyle = g;
    ctx.fillRect(d.x - d.r, d.y - d.r * 1.2, d.r * 2, d.r * 1.2);
  });
  const lan = rrPath(d.x - 12, d.y - d.r * 1.14 - 36, 24, 38, 4);
  solid(ctx, lan, { x: d.x - 12, y: d.y - d.r * 1.14 - 36, w: 24, h: 38 }, STUC, airMix('#d8c0a0', depth, DUSK), { depth, air: DUSK, line: 1.5 });
  ctx.fillStyle = airMix('#3a2a2a', depth, DUSK);
  ctx.beginPath();
  ctx.moveTo(d.x - 14, d.y - d.r * 1.14 - 34);
  ctx.lineTo(d.x, d.y - d.r * 1.14 - 60);
  ctx.lineTo(d.x + 14, d.y - d.r * 1.14 - 34);
  ctx.fill();
  void r;
}
const DOME_BOX = { x: OTX.dome.x - OTX.dome.r - 10, y: OTX.dome.y - OTX.dome.r * 1.14 - 70, w: OTX.dome.r * 2 + 20, h: OTX.dome.r * 1.14 + 140 };

const MID: House[] = [
  { x: -20, w: 200, base: 560, h: 90, roof: 44, wall: '#c89a7a', depth: 0.7, lit: [1, 3] },
  { x: 190, w: 170, base: 560, h: 110, roof: 38, wall: '#d8b08a', depth: 0.7, hip: true, lit: [0, 4] },
  { x: 370, w: 230, base: 560, h: 80, roof: 46, wall: '#b88a7a', depth: 0.7, lit: [2] },
  { x: 610, w: 180, base: 560, h: 70, roof: 30, wall: '#d0a080', depth: 0.7, hip: true, lit: [1] },
  { x: 800, w: 200, base: 560, h: 64, roof: 34, wall: '#c4987c', depth: 0.7, lit: [0, 3] },
  { x: 1010, w: 200, base: 560, h: 58, roof: 30, wall: '#d4a888', depth: 0.7, hip: true, lit: [2] },
  { x: 1220, w: 210, base: 560, h: 96, roof: 42, wall: '#c8a084', depth: 0.7, lit: [0, 5] },
  { x: 1440, w: 190, base: 560, h: 76, roof: 40, wall: '#b8907a', depth: 0.7, hip: true, lit: [2] },
  { x: 1640, w: 300, base: 560, h: 104, roof: 48, wall: '#d4aa86', depth: 0.7, lit: [1, 4, 6] },
];
const NEAR: House[] = [
  { x: -30, w: 330, base: 676, h: 130, roof: 52, wall: '#d89a6a', depth: 0.3, lit: [1, 5] },
  { x: 1230, w: 260, base: 676, h: 120, roof: 46, wall: '#e0ac7a', depth: 0.3, hip: true, lit: [0, 3] },
  { x: 1580, w: 360, base: 676, h: 150, roof: 58, wall: '#cf946a', depth: 0.3, lit: [2, 4] },
];

function midTown(ctx: Ctx, r: R): void {
  for (const h of MID) house(ctx, r, h);
  haze(ctx, 470, 580, '#8a6a9a', 0.22, 0.7);
}

function nearTown(ctx: Ctx, r: R): void {
  // the street's far side down below: a row of tall facades in the dusk, each its own colour, cornices, shutters,
  // iron balconies, a few windows lit; the street a dark cleft at their feet
  vfill(ctx, 0, 540, W, 160, [[0, airMix('#4a3650', 0.55, DUSK)], [1, '#1e1222']]);
  let fx0 = -10;
  while (fx0 < W) {
    const fw = 120 + r() * 110;
    const ftop = 548 + r() * 16;
    const depth = 0.5;
    const col = airMix(['#c89070', '#d0a878', '#b87a68', '#c8a080', '#a88a7a'][Math.floor(r() * 5)], depth, DUSK);
    const fbox = { x: fx0, y: ftop, w: fw, h: 700 - ftop };
    ctx.save();
    ctx.beginPath();
    ctx.rect(fbox.x, fbox.y, fbox.w, fbox.h);
    ctx.clip();
    ctx.fillStyle = col;
    ctx.fillRect(fbox.x, fbox.y, fbox.w, fbox.h);
    lay(ctx, drift(shade(col, 0.1), shade(col, -0.25), 4, Math.round(fx0) + 7, 48, 48), fbox, 0.5);
    // lower down, the street's gloom climbs the walls
    vfill(ctx, fx0, ftop, fw, 700 - ftop, [[0, 'rgba(20,10,30,0)'], [0.55, 'rgba(20,10,30,0.25)'], [1, 'rgba(16,8,24,0.75)']]);
    // the cornice under the eaves: a lit lip, its shadow below
    ctx.fillStyle = shade(col, 0.15);
    ctx.fillRect(fx0, ftop, fw, 4);
    ctx.fillStyle = 'rgba(16,8,24,0.45)';
    ctx.fillRect(fx0, ftop + 4, fw, 6);
    const cols = Math.max(2, Math.floor(fw / 44));
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < cols; i++) {
        const wx = fx0 + (i + 0.5) * (fw / cols);
        const wy = ftop + 20 + j * 40;
        const lit = r() < 0.22;
        // the recess: a dark reveal, its head in shadow
        ctx.fillStyle = lit ? '#ffc070' : '#1e1426';
        ctx.fillRect(wx - 6, wy, 12, 20);
        if (lit) {
          glowAt(ctx, wx, wy + 10, 22, '#ffb050', 0.3);
          ctx.fillStyle = 'rgba(150,70,30,0.6)';
          ctx.fillRect(wx - 0.6, wy, 1.2, 20);
          ctx.fillRect(wx - 6, wy + 9, 12, 1.2);
        }
        ctx.fillStyle = 'rgba(10,4,16,0.4)';
        ctx.fillRect(wx - 6, wy, 12, 3);
        // shutters (louvred slats), open or closed
        const sh = airMix(['#3a6a4a', '#4a5a6a', '#6a4a3a'][Math.floor(r() * 3)], depth, DUSK);
        const closed = !lit && r() < 0.5;
        const sx = closed ? [wx - 6] : [wx - 13, wx + 6.5];
        for (const s of sx) {
          ctx.fillStyle = sh;
          ctx.fillRect(s, wy, closed ? 12 : 6.5, 20);
          ctx.fillStyle = 'rgba(10,4,16,0.3)';
          for (let k = 2; k < 20; k += 3) ctx.fillRect(s, wy + k, closed ? 12 : 6.5, 1);
        }
        // the sill catches the last light
        ctx.fillStyle = shade(col, 0.2);
        ctx.fillRect(wx - 8, wy + 20, 16, 2);
        if (j === 1 && r() < 0.25) {
          // a little iron balcony
          ctx.strokeStyle = 'rgba(16,10,20,0.8)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(wx - 12, wy + 12, 24, 10);
          for (let k = -9; k <= 9; k += 4.5) {
            ctx.beginPath();
            ctx.moveTo(wx + k, wy + 12);
            ctx.lineTo(wx + k, wy + 22);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(16,8,24,0.35)';
          ctx.fillRect(wx - 12, wy + 23, 24, 4);
        }
      }
    ctx.restore();
    // where two houses meet, a shadowed seam
    creviceV(ctx, fx0, ftop, 700, 8, 0.35, '#100818');
    fx0 += fw;
  }
  // the roofs just below the terrace: tiled slopes falling away, their eaves hidden behind the parapet
  for (const [x0, x1, top, hip] of [[250, 620, 586, 1], [600, 960, 600, 0], [940, 1260, 592, 1]] as const) {
    const rp = hip ? polyPath([[x0, 680], [x0 + 70, top], [x1 - 70, top], [x1, 680]]) : polyPath([[x0, 680], [(x0 + x1) / 2, top - 10], [x1, 680]]);
    roofTiles(ctx, r, rp, { x: x0, y: top - 12, w: x1 - x0, h: 694 - top }, '#b8563a', 0.4, 11, 15);
    within(ctx, rp, () => vfill(ctx, x0, top, x1 - x0, 680 - top, [[0, 'rgba(255,170,120,0.12)'], [1, 'rgba(20,8,24,0.35)']]));
    ctx.strokeStyle = airMix('#2a1418', 0.4, DUSK);
    ctx.lineWidth = 2;
    rp(ctx);
    ctx.stroke();
  }
  for (const h of NEAR) house(ctx, r, h);
  // chimneys on them
  for (const [x, y] of OTX.chimneys) {
    const c = rectPath(x - 14, y - 50, 28, 54);
    castShadow(ctx, c, 10, 10, 0.4, '#140a18');
    solid(ctx, c, { x: x - 14, y: y - 50, w: 28, h: 54 }, STUC, airMix('#b07058', 0.3, DUSK), { depth: 0.3, air: DUSK, line: 2 });
    const cap = rectPath(x - 18, y - 56, 36, 8);
    solid(ctx, cap, { x: x - 18, y: y - 56, w: 36, h: 8 }, STUC, airMix('#8a5a4a', 0.3, DUSK), { depth: 0.3, air: DUSK, line: 1.8 });
    ctx.fillStyle = 'rgba(30,14,20,0.6)';
    ctx.fillRect(x - 10, y - 57, 20, 3);
  }
  haze(ctx, 560, 690, '#6a5a8a', 0.18, 0.7);
}

/** The terrace's parapet: stucco, a coping of roof tiles, its foot in the shadow of the terrace. */
function parapet(ctx: Ctx, r: R): void {
  const p = OTX.parapet;
  const box = { x: 0, y: p.top, w: W, h: TY - p.top };
  plaster(ctx, r, box, STUCCO, { wash: 0.7, patina: 0.7, grime: { bottom: 46, top: 12, a: 0.45 }, seed: 91 });
  const BR = ['#8a3a26', '#9a4430', '#7a3222', '#a04c34'];
  // the render worn back to the brick: where elbows lean between the pots, and round the drain's spout
  brickPatch(ctx, r, 470, p.top + 46, 74, 24, BR, '#b89078', STUCCO, 26, 11);
  within(ctx, rectPath(box.x, box.y, box.w, box.h), () => {
    // the evening sky's cool light on the wall's face (it faces away from the afterglow), warmer at its foot
    vfill(ctx, 0, p.top, W, TY - p.top, [[0, 'rgba(70,60,140,0.22)'], [1, 'rgba(70,60,140,0.05)']]);
    // the lanterns' pools on the stucco
    for (const x of OTX.lamps) lightPool(ctx, x, p.top + 40, 240, 90, '#ffb050', 0.24);
    // the rain's tide line, and green damp low down where the terrace drains
    streaks(ctx, r, 1018, p.top + 38, 34, 58, '#2a1a10', 0.32, 4);
    lay(ctx, noiseMask(9, 95, { cover: 0.22, soft: 0.2, col: '#4a5a32' }), { x: 0, y: TY - 26, w: W, h: 26 }, 0.35);
  });
  crack(ctx, r, 620, p.top + 24, 1.4, 40, { col: '#5a2a14', lip: '#ffe0c0', w: 1.3, a: 0.5 });
  crack(ctx, r, 1530, p.top + 30, 1.9, 34, { col: '#5a2a14', lip: '#ffe0c0', w: 1.2, a: 0.45 });
  // the drain's spout: a terracotta pipe through the wall, a dark stain run down from it
  // (a half-round channel jutting out of the wall: its mouth dark, its lip lit, a plaster collar round it)
  ctx.fillStyle = rgba(shade(STUCCO, -0.25), 0.8);
  ctx.beginPath();
  ctx.ellipse(1022, p.top + 32, 18, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  const sp = polyPath([[1010, p.top + 22], [1048, p.top + 26], [1048, p.top + 42], [1010, p.top + 40]]);
  castShadow(ctx, sp, 8, 6, 0.45, '#1a0a10');
  solid(ctx, sp, { x: 1010, y: p.top + 22, w: 38, h: 20 }, STUC, '#b0583a', { depth: 0.1, line: 2, formSize: 6 });
  ctx.fillStyle = '#1a0a0c';
  ctx.beginPath();
  ctx.ellipse(1047, p.top + 34, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,180,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(1012, p.top + 23);
  ctx.lineTo(1046, p.top + 27);
  ctx.stroke();
  // the coping: a row of curved tiles along the top, its overhang throwing a shadow down the wall
  crevice(ctx, 0, W, p.top + p.coping - 4, 18, 0.65, '#1a0a10');
  const cop = rectPath(0, p.top - 4, W, p.coping);
  solid(ctx, cop, { x: 0, y: p.top - 4, w: W, h: p.coping }, 'stone', '#b85a3a', { depth: 0.1, line: false, formSize: 10 });
  // the coping's curved tiles (coppi) laid over it: each its own fired colour, lit on its left flank, the gaps between
  // them in shadow, lichen on a few
  const TW = 42;
  for (let x = -12; x < W; x += TW) {
    const base = jitter(['#c8643e', '#b85a3a', '#d0704a', '#a85234'][Math.floor(r() * 4)], r, 0.05);
    const g = ctx.createLinearGradient(x, 0, x + TW, 0);
    g.addColorStop(0, shade(base, 0.25));
    g.addColorStop(0.3, shade(base, 0.1));
    g.addColorStop(0.7, base);
    g.addColorStop(1, shade(base, -0.45));
    ctx.fillStyle = g;
    const tile = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x + 1, p.top + p.coping - 3);
      c.bezierCurveTo(x + 1, p.top - 2, x + 6, p.top - 6, x + TW / 2, p.top - 6);
      c.bezierCurveTo(x + TW - 6, p.top - 6, x + TW - 1, p.top - 2, x + TW - 1, p.top + p.coping - 3);
      c.closePath();
    };
    tile(ctx);
    ctx.fill();
    within(ctx, tile, () => {
      // the tile's end, darker where it overhangs the wall, and its lit crown
      vfill(ctx, x, p.top + p.coping - 9, TW, 7, [[0, 'rgba(30,8,6,0)'], [1, 'rgba(30,8,6,0.45)']]);
      ctx.strokeStyle = rgba('#ffd8b0', 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 6, p.top - 2);
      ctx.quadraticCurveTo(x + 10, p.top - 5, x + TW / 2, p.top - 5);
      ctx.stroke();
      if (r() < 0.2) lay(ctx, noiseMask(3, Math.round(x), { cover: 0.4, soft: 0.2, col: '#8a9a5a', w: 24, h: 12 }), { x, y: p.top - 6, w: TW, h: 14 }, 0.55);
    });
    ctx.strokeStyle = 'rgba(40,14,10,0.75)';
    ctx.lineWidth = 1.6;
    tile(ctx);
    ctx.stroke();
  }
}

/** Geraniums in terracotta pots on the coping. */
function pots(ctx: Ctx, r: R): void {
  const y = OTX.parapet.top - 8;
  for (const x of OTX.pots) {
    groundShadow(ctx, x + 10, y, 56, 6, 0.5);
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI * (0.08 + r() * 0.84);
      const d = 20 + r() * 34;
      const lx = x + Math.cos(a) * d * 1.3;
      const ly = y - 48 + Math.sin(a) * d * 0.75;
      solid(ctx, ellPath(lx, ly, 11, 9, r()), { x: lx - 11, y: ly - 11, w: 22, h: 22 }, 'plastic', shade('#3e7a2e', (r() - 0.4) * 0.3), { line: 1.5, formSize: 5, spec: false, form: 0.5 });
    }
    for (let i = 0; i < 9; i++) {
      const fx = x + (r() - 0.5) * 80;
      const fy = y - 62 - r() * 38;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.fillStyle = shade('#e8304a', (r() - 0.5) * 0.25);
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 5, fy + Math.sin(a) * 5, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,220,160,0.6)';
      ctx.beginPath();
      ctx.arc(fx - 2, fy - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const pot = polyPath([[x - 40, y - 54], [x + 40, y - 54], [x + 30, y], [x - 30, y]]);
    solid(ctx, pot, { x: x - 40, y: y - 54, w: 80, h: 54 }, STUC, '#c0663a', { depth: 0.08, line: 2.5, formSize: 14 });
    const lip = rrPath(x - 45, y - 60, 90, 12, 3);
    solid(ctx, lip, { x: x - 45, y: y - 60, w: 90, h: 12 }, STUC, '#cc7044', { depth: 0.08, line: 2.2 });
  }
}

/** The iron lantern on its post (flame painted for the still; live, a flame loop). */
function lamp(ctx: Ctx, x: number): void {
  const y = OTX.lampY;
  const post = rectPath(x - 6, y + 30, 12, TY - y - 30);
  castShadow(ctx, post, 12, 10, 0.45, '#140a18');
  solid(ctx, post, { x: x - 6, y: y + 30, w: 12, h: TY - y - 30 }, 'iron', '#2a2830', { depth: 0.06, line: 2.5, formSize: 6 });
  // its foot plate, bolted to the terrace
  const fp = rrPath(x - 13, TY - 9, 26, 9, 2);
  solid(ctx, fp, { x: x - 13, y: TY - 9, w: 26, h: 9 }, 'iron', '#2a2830', { depth: 0.06, line: 2 });
  lightPool(ctx, x, y + 8, 160, 150, '#ffb050', 0.16);
  const cage = polyPath([[x - 22, y - 26], [x + 22, y - 26], [x + 16, y + 30], [x - 16, y + 30]]);
  ctx.fillStyle = rgba('#ffdc90', 0.85);
  cage(ctx);
  ctx.fill();
  const g = ctx.createRadialGradient(x, y + 6, 2, x, y + 6, 30);
  g.addColorStop(0, 'rgba(255,250,220,0.9)');
  g.addColorStop(1, 'rgba(255,170,60,0.2)');
  ctx.fillStyle = g;
  cage(ctx);
  ctx.fill();
  ctx.strokeStyle = '#1a1418';
  ctx.lineWidth = 4;
  cage(ctx);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 26);
  ctx.lineTo(x, y + 30);
  ctx.stroke();
  const hood = polyPath([[x - 30, y - 24], [x, y - 52], [x + 30, y - 24]]);
  solid(ctx, hood, { x: x - 30, y: y - 52, w: 60, h: 28 }, 'iron', '#2a2830', { depth: 0.06, line: 2.5 });
  const base = rrPath(x - 20, y + 28, 40, 10, 3);
  solid(ctx, base, { x: x - 20, y: y + 28, w: 40, h: 10 }, 'iron', '#2a2830', { depth: 0.06, line: 2 });
  ctx.fillStyle = '#1a1418';
  ctx.beginPath();
  ctx.arc(x, y - 56, 5, 0, Math.PI * 2);
  ctx.fill();
}

function lampFlameStill(ctx: Ctx): void {
  for (const x of OTX.lamps) {
    glowAt(ctx, x, OTX.lampY + 4, 120, '#ffb050', 0.4);
    flameShape(ctx, x, OTX.lampY + 22, 12, 30);
  }
}

// ——— the washing ———

interface Garment {
  kind: 'shirt' | 'trousers' | 'sheet' | 'sock';
  x: number;
  w: number;
  h: number;
  col: string;
  /** Its pattern's colour (stripes on the sheet, the shirt's placket, the sock's heel and toe). */
  trim: string;
}
const WASH: Garment[] = [
  { kind: 'shirt', x: 316, w: 84, h: 80, col: '#ece6da', trim: '#b8b0a4' },
  { kind: 'sheet', x: 440, w: 130, h: 116, col: '#a8c4e0', trim: '#5a7ab0' },
  { kind: 'trousers', x: 594, w: 58, h: 104, col: '#8a6a5a', trim: '#5a4036' },
  { kind: 'sock', x: 678, w: 18, h: 40, col: '#c84a3a', trim: '#f0e0d0' },
  { kind: 'shirt', x: 760, w: 76, h: 72, col: '#a8c8a0', trim: '#6a8a64' },
  { kind: 'sock', x: 838, w: 18, h: 38, col: '#3a5a9a', trim: '#e8e0d0' },
];
/** The line's height at x (the same parabola the rope is drawn with). */
const lineY = (x: number): number => {
  const l = OTX.line;
  const t = (x - l.x0) / (l.x1 - l.x0);
  return l.y + 4 * t * (1 - t) * l.sag;
};
/** A garment's frame: its size, and where its pegs' line point sits in it (left of centre: the wind blows right). */
const gFrame = (g: Garment): { gw: number; gh: number; cx: number; top: number } => ({ gw: Math.ceil(g.w * 1.24 + 52), gh: Math.ceil(g.h + 36), cx: 18 + g.w * 0.62, top: 10 });

/**
 * One garment on the line at a phase of its flapping (wind 0…1), drawn with its pegs' line point at (cx, top) of its
 * frame. The cloth is a grid pushed by a wave travelling down and across it (the further from the pegs, the more it
 * moves; the hem flutters faster), leaning off with the wind and lifting in gusts. It's shaded by the wave's slope,
 * strip by strip (the billows lit on the side that turns to the light, the troughs in shadow), drapes in folds from
 * each peg, carries its pattern through the deformation and takes a rim of the lanterns and the moon behind it.
 */
export function garmentFrame(c: Ctx, g: Garment, phase: number, wind: number, gw: number, gh: number): void {
  const P = Math.PI * 2;
  const { cx, top } = gFrame(g);
  const lean = wind * 0.38;
  const amp = 3 + wind * 5;
  const wav = (u: number, v: number): number => Math.sin(phase * P + u * 2.6 - v * 2.4);
  const disp = (u: number, v: number): [number, number] => {
    const k = Math.pow(v, 1.4);
    const hem = Math.max(0, v - 0.7) / 0.3;
    const flut = Math.sin(phase * P * 2 + u * 7) * hem * (1 + wind * 2);
    const dx = (wav(u, v) * amp + lean * 42) * k + flut * 1.5;
    const dy = (-Math.max(0, Math.sin(phase * P + u * 2.2)) * 7 * wind - lean * 16) * k + flut * 1.2;
    return [dx, dy];
  };
  // the cloth droops a little between its pegs
  const pegs = g.kind === 'sock' ? [0.5] : [0.08, 0.92];
  const droop = (u: number): number => (g.kind === 'sock' ? 0 : Math.max(0, Math.sin(((u - 0.08) / 0.84) * Math.PI)) * 3.5);
  const pt = (u: number, v: number): [number, number] => {
    const [dx, dy] = disp(u, v);
    let x = cx + (u - 0.5) * g.w;
    let y = top + droop(u) * (1 - v) + v * g.h;
    if (g.kind === 'trousers') x = cx + (u - 0.5) * g.w * (1 - v * 0.08);
    if (g.kind === 'shirt' && (u < 0.0 || u > 1.0)) y = top + 6 + v * g.h * 0.42;
    return [x + dx, y + dy];
  };
  const N = 12;
  const outline: [number, number][] = [];
  const edgeTop = (u0: number, u1: number) => {
    for (let i = 0; i <= N; i++) outline.push(pt(u0 + ((u1 - u0) * i) / N, 0));
  };
  const down = (u: number, v0: number, v1: number) => {
    for (let j = 1; j <= 6; j++) outline.push(pt(u, v0 + ((v1 - v0) * j) / 6));
  };
  const hem = (u0: number, u1: number, v: number) => {
    for (let i = 0; i <= N; i++) {
      const u = u0 + ((u1 - u0) * i) / N;
      outline.push(pt(u, v + Math.sin(i * 1.7 + phase * P * 2) * 0.012));
    }
  };
  if (g.kind === 'shirt') {
    // pegged by its hem: the body hangs, the sleeves fall to the sides
    edgeTop(0, 1);
    outline.push(pt(1.14, 0.04), pt(1.18, 0.4), pt(1.02, 0.44), pt(0.86, 0.36));
    down(0.86, 0.36, 1);
    hem(0.86, 0.14, 1);
    outline.push(pt(0.14, 0.36), pt(-0.02, 0.44), pt(-0.18, 0.4), pt(-0.14, 0.04));
  } else if (g.kind === 'trousers') {
    edgeTop(0, 1);
    down(1, 0, 1);
    hem(1, 0.56, 1);
    for (let j = 5; j >= 1; j--) outline.push(pt(0.53, 0.32 + (0.68 * j) / 6));
    outline.push(pt(0.5, 0.3));
    for (let j = 1; j <= 5; j++) outline.push(pt(0.47, 0.32 + (0.68 * j) / 6));
    hem(0.44, 0, 1);
    for (let j = 5; j >= 1; j--) outline.push(pt(0, j / 6));
  } else {
    edgeTop(0, 1);
    down(1, 0, 1);
    hem(1, 0, 1);
    for (let j = 5; j >= 1; j--) outline.push(pt(0, j / 6));
  }
  const path = polyPath(outline);
  const col = mix(g.col, '#7a7aa8', 0.22);
  // a faint shadow the cloth throws on the air behind it is wrong; but its own thickness shows as a darker back
  solid(c, path, { x: 0, y: 0, w: gw, h: gh }, 'canvas', col, { depth: 0.35, line: 1.8, formSize: 8, texA: 0.18 });
  within(c, path, () => {
    // the pattern, carried through the cloth
    c.lineCap = 'butt';
    if (g.kind === 'sheet') {
      for (const v of [0.78, 0.86]) {
        c.strokeStyle = rgba(mix(g.trim, '#7a7aa8', 0.2), 0.85);
        c.lineWidth = 4;
        c.beginPath();
        for (let i = 0; i <= 16; i++) {
          const [x, y] = pt(-0.05 + (1.1 * i) / 16, v);
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        c.stroke();
      }
    } else if (g.kind === 'shirt') {
      // the placket and its buttons, a breast pocket, the collar's shadow at the (bottom) neck
      c.strokeStyle = rgba(g.trim, 0.8);
      c.lineWidth = 2;
      c.beginPath();
      for (let j = 0; j <= 8; j++) {
        const [x, y] = pt(0.5, j / 8);
        if (j) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
      for (let j = 1; j < 6; j++) {
        const [x, y] = pt(0.53, 0.12 + j * 0.15);
        c.fillStyle = rgba('#f8f4ea', 0.9);
        c.beginPath();
        c.arc(x, y, 1.4, 0, P);
        c.fill();
      }
      const pk = [pt(0.62, 0.58), pt(0.8, 0.58), pt(0.8, 0.76), pt(0.62, 0.76)];
      c.strokeStyle = rgba(g.trim, 0.7);
      c.lineWidth = 1.2;
      polyPath(pk)(c);
      c.stroke();
    } else if (g.kind === 'trousers') {
      c.fillStyle = rgba(g.trim, 0.8);
      const wb = [pt(0, 0), pt(1, 0), pt(1, 0.08), pt(0, 0.08)];
      polyPath(wb)(c);
      c.fill();
      c.strokeStyle = rgba(g.trim, 0.8);
      c.lineWidth = 1.4;
      c.beginPath();
      for (let j = 0; j <= 4; j++) {
        const [x, y] = pt(0.56, 0.08 + j * 0.06);
        if (j) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
    } else {
      c.fillStyle = rgba(g.trim, 0.85);
      polyPath([pt(0, 0), pt(1, 0), pt(1, 0.16), pt(0, 0.16)])(c);
      c.fill();
      polyPath([pt(0, 0.82), pt(1, 0.82), pt(1, 1.02), pt(0, 1.02)])(c);
      c.fill();
    }
    // billows and troughs: strip by strip, lit where the wave's slope turns the cloth to the light (top left)
    const S = 22;
    const V = 8;
    for (let i = 0; i < S; i++) {
      const u0 = -0.2 + (1.4 * i) / S;
      const u1 = -0.2 + (1.4 * (i + 1)) / S;
      for (let j = 0; j < V; j++) {
        const v0 = j / V;
        const v1 = (j + 1) / V;
        const slope = Math.cos(phase * P + ((u0 + u1) / 2) * 2.6 - ((v0 + v1) / 2) * 2.4);
        const k = Math.pow((v0 + v1) / 2, 0.8) * (0.5 + wind * 0.5);
        const a = slope * k;
        c.fillStyle = a > 0 ? `rgba(255,236,220,${(0.26 * a).toFixed(3)})` : `rgba(26,18,48,${(-0.38 * a).toFixed(3)})`;
        polyPath([pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)])(c);
        c.fill();
      }
    }
    // folds draping from each peg: soft V's of shadow, a lit ridge beside each
    for (const pu of pegs) {
      for (const side of [-1, 1]) {
        const [x0, y0] = pt(pu, 0);
        const [x1, y1] = pt(pu + side * 0.14, 0.34);
        c.strokeStyle = 'rgba(26,18,48,0.09)';
        c.lineWidth = 7;
        c.beginPath();
        c.moveTo(x0, y0);
        c.quadraticCurveTo((x0 + x1) / 2 + side * 2, (y0 + y1) / 2, x1, y1);
        c.stroke();
        c.strokeStyle = 'rgba(255,240,224,0.05)';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(x0 + side * 3, y0 + 2);
        c.quadraticCurveTo((x0 + x1) / 2 + side * 5, (y0 + y1) / 2, x1 + side * 4, y1);
        c.stroke();
      }
    }
    // the light behind: the afterglow warm on its left, the moon cool on its right, the hem darker
    const gl = c.createLinearGradient(0, 0, gw, 0);
    gl.addColorStop(0, 'rgba(255,170,100,0.14)');
    gl.addColorStop(0.5, 'rgba(255,170,100,0)');
    gl.addColorStop(1, 'rgba(170,190,255,0.12)');
    c.fillStyle = gl;
    c.fillRect(0, 0, gw, gh);
    const hg = c.createLinearGradient(0, top, 0, top + g.h * 1.1);
    hg.addColorStop(0.6, 'rgba(20,14,40,0)');
    hg.addColorStop(1, 'rgba(20,14,40,0.22)');
    c.fillStyle = hg;
    c.fillRect(0, 0, gw, gh);
  });
  rim(c, path, 0.22, 1.6);
  // pegs: wooden, a spring's glint, gripping the line
  for (const u of pegs) {
    const [px, py] = pt(u, 0);
    const peg = rrPath(px - 2.6, py - 7, 5.2, 13, 1.5);
    solid(c, peg, { x: px - 3, y: py - 7, w: 6, h: 13 }, 'wood', '#c8a878', { depth: 0.3, line: 1, formSize: 2 });
    c.fillStyle = 'rgba(220,220,230,0.8)';
    c.fillRect(px - 2.6, py - 2, 5.2, 1.2);
  }
}

function laundryLine(ctx: Ctx): void {
  const l = OTX.line;
  for (const x of [l.x0, l.x1]) {
    const pole = rectPath(x - 4, l.y - 20, 8, 690 - l.y);
    castShadow(ctx, pole, 10, 8, 0.4, '#140a18');
    solid(ctx, pole, { x: x - 4, y: l.y - 20, w: 8, h: 690 - l.y }, 'wood', airMix('#5a4030', 0.35, DUSK), { depth: 0.35, line: 2 });
    // the line's hook on the pole
    ctx.strokeStyle = '#2a2024';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, l.y - 2, 4, Math.PI * 0.2, Math.PI * 1.6);
    ctx.stroke();
  }
  hang(ctx, l.x0, l.y, l.x1, l.y, l.sag * 2, '#d8d0c0', 1.6);
}

function laundryStill(ctx: Ctx): void {
  for (const g of WASH) {
    const f = gFrame(g);
    ctx.save();
    ctx.translate(g.x, lineY(g.x));
    ctx.rotate(lineAng(g.x));
    ctx.translate(-f.cx, -f.top);
    garmentFrame(ctx, g, 0.2, 0.3, f.gw, f.gh);
    ctx.restore();
  }
}

function table(ctx: Ctx, r: R): void {
  // the terrace: handmade cotto tiles, each fired its own shade of terracotta, laid in a brick bond, old and soft
  const a = ['#b4623e', '#a85a3a', '#bc6c46', '#a0563a', '#c27450', '#ac6040', '#9a5238'];
  floorPlane(ctx, r, OTX.front, { size: 0.15, depthK: 1, a, grout: '#5a3428', gap: 0.07, gloss: 0.2, wear: 0.55, tex: 'speckle', seed: 11 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, OTX.front - TY + 4);
  ctx.clip();
  const fb = { x: 0, y: TY, w: W, h: OTX.front - TY };
  // years of weather: paler, chalky bloom on the tiles, a darker drift of dirt along the parapet's foot and moss
  // in the joints there, where the sun never dries them
  lay(ctx, noiseMask(6, 113, { cover: 0.3, soft: 0.25, col: '#d8b498' }), fb, 0.22);
  lay(ctx, drift('#c88a64', '#4a2a20', 5, 117, 256, 64), fb, 0.16);
  vfill(ctx, 0, TY, W, 46, [[0, 'rgba(26,12,16,0.5)'], [1, 'rgba(26,12,16,0)']]);
  lay(ctx, noiseMask(14, 119, { cover: 0.2, soft: 0.15, col: '#4a5a30' }), { x: 0, y: TY, w: W, h: 22 }, 0.4);
  // the lanterns' pools, the moon's cool sheen far off to the right
  for (const x of OTX.lamps) lightPool(ctx, x, 812, 420, 100, '#ffb050', 0.34);
  lightPool(ctx, OTX.moon.x - 200, TY + 30, 700, 60, '#a8b8ff', 0.07);
  ctx.restore();
  // the lantern posts stand on the terrace, their feet in a little occlusion
  for (const x of OTX.lamps) groundShadow(ctx, x + 8, TY + 3, 30, 7, 0.6);
  tableFalloff(ctx, OTX.front, 0.45, '#0e0614');
  tableSeam(ctx, 0.6, '#1a0e14', false);
  // the terrace's front edge: a stone step lip
  const lip = rectPath(0, OTX.front, W, 1080 - OTX.front);
  solid(ctx, lip, { x: 0, y: OTX.front, w: W, h: 40 }, STUC, '#9a6a5a', { depth: 0, line: false, formSize: 8 });
  ctx.fillStyle = 'rgba(255,220,190,0.3)';
  ctx.fillRect(0, OTX.front, W, 2);
  specHi(ctx, 400, OTX.front + 6, 200, 3, 0.2, 0);
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.06, '#9a8ac8', 0.07, { warm: '#ffb070', cool: '#4a5ad0', a: 0.24 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.1, '#0c0818', 80, 560);
  vignetteAll(ctx, 0.7, '#06040e');
  vfill(ctx, 0, 0, W, 240, [[0, 'rgba(4,2,10,0.22)'], [1, 'rgba(4,2,10,0)']]);
}

// ——— the storm's live-only layers ———

/** The storm bank's billows (one seeded list, so the bank and its lit-from-within twin line up). */
const STORM_PUFFS: [number, number, number, number][] = (() => {
  let s = 4242;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 7 }, (_, i) => [1960 - i * 95 - r() * 40, 70 + r() * 210, 360 + r() * 220, 100 + r() * 70] as [number, number, number, number]);
})();

/** The storm's clouds lit from inside by a strike (live: added, flashing with the lightning). */
function stormLit(ctx: Ctx): void {
  const b = SKY_BOX;
  softly(ctx, b, (q) => {
    for (const [x, y, w, h] of STORM_PUFFS) {
      for (let k = 0; k < 3; k++) {
        const cx = x - w * 0.3 + k * w * 0.3;
        const g = q.createRadialGradient(cx, y - h * 0.1, 0, cx, y - h * 0.1, h * 1.1);
        g.addColorStop(0, 'rgba(220,214,255,0.55)');
        g.addColorStop(0.5, 'rgba(150,140,230,0.25)');
        g.addColorStop(1, 'rgba(120,110,200,0)');
        q.fillStyle = g;
        q.beginPath();
        q.ellipse(cx, y - h * 0.1, h * 1.6, h * 1.1, 0, 0, Math.PI * 2);
        q.fill();
      }
    }
  }, 0.25);
  // feathered into the clear sky on its leading (left) edge, like the bank
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  const fe = ctx.createLinearGradient(b.x, 0, b.x + 260, 0);
  fe.addColorStop(0, 'rgba(0,0,0,0)');
  fe.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fe;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.restore();
}

/** The terrace wet with rain (live: it shines in over the last wave): a cool sheen, puddles holding the stormy sky,
 * the lanterns' light broken into long reflections down the wet tiles. */
function wet(ctx: Ctx, r: R): void {
  const y0 = TY;
  const y1 = OTX.front;
  vfill(ctx, 0, y0, W, y1 - y0, [[0, 'rgba(20,18,40,0.28)'], [1, 'rgba(20,18,40,0.12)']]);
  // puddles: in the low spots off the lanes, along the parapet's foot and towards the corners
  for (const [x, y, rx, ry] of [[110, 800, 120, 12], [700, 786, 90, 8], [1222, 786, 96, 8], [1810, 818, 110, 13], [100, 990, 110, 20], [1830, 1000, 100, 18]] as [number, number, number, number][]) {
    const pth = (c: Ctx) => {
      c.beginPath();
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const k = 0.82 + 0.18 * Math.sin(a * 3 + x);
        const px = x + Math.cos(a) * rx * k;
        const py = y + Math.sin(a) * ry * k;
        if (i) c.lineTo(px, py);
        else c.moveTo(px, py);
      }
      c.closePath();
    };
    within(ctx, pth, () => {
      // the sky held in the water: darker near, the storm's pale underside far
      vfill(ctx, x - rx, y - ry, rx * 2, ry * 2, [[0, 'rgba(150,146,200,0.62)'], [1, 'rgba(56,50,92,0.5)']]);
      ctx.fillStyle = 'rgba(220,220,255,0.22)';
      ctx.fillRect(x - rx, y - ry, rx * 2, 2);
    });
    ctx.strokeStyle = 'rgba(230,230,255,0.34)';
    ctx.lineWidth = 1.4;
    pth(ctx);
    ctx.stroke();
  }
  // the lanterns' reflections: long, broken, warm
  for (const x of OTX.lamps) {
    for (let y = TY + 6; y < y1 - 10; y += 7 + r() * 5) {
      const k = 1 - (y - TY) / (y1 - TY);
      const w = 10 + (1 - k) * 30 + r() * 14;
      ctx.fillStyle = rgba('#ffc070', 0.45 * k + 0.06);
      ctx.fillRect(x - w / 2 + (r() - 0.5) * 8, y, w, 2 + r() * 2);
    }
  }
  // the sheen of wet tile: highlights catching the light along the joints
  lay(ctx, noiseMask(22, 131, { cover: 0.18, soft: 0.1, col: '#c8c8f0' }), { x: 0, y: y0, w: W, h: y1 - y0 }, 0.12);
}

// ——— the scene ———

/** The town's live layer: the washing, the mist over the roofs, chimney smoke, windows and the clock: behind the
 * parapet (anything after it that overlaps this box is baked into an overlay: the pots and the lanterns). */
const TOWN_BOX = { x: 0, y: 380, w: W, h: 262 };

export const OLDTOWN: SceneSpec = {
  id: 'oldtown',
  info: {
    name: 'Old Town Rooftops',
    subtitle: 'Waves 36–39',
    ambient: [],
    glows: [
      { x: OTX.moon.x, y: OTX.moon.y, r: 220, color: '#cfe0ff', flicker: 0.05 },
      ...OTX.lamps.map((x) => ({ x, y: OTX.lampY + 4, r: 200, color: '#ffb050', flicker: 0.45 })),
      { x: OTX.tower.x, y: OTX.tower.clockY, r: 90, color: '#ffc070', flicker: 0.1 },
    ],
    light: '#c8c0f0',
    tableTint: '#f0e6f0',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: OTX.horizon + 40 }, draw: sky },
    { id: 'storm', box: SKY_BOX, liveOnly: true, res: 0.5, draw: storm },
    { id: 'stormLit', box: SKY_BOX, liveOnly: true, res: 0.5, draw: stormLit },
    // lightning, behind the town
    { id: 'skyFx', box: SKY_BOX, motion: 'slot', draw: () => {} },
    { id: 'farTown', box: { x: 0, y: 410, w: W, h: 120 }, draw: farTown },
    { id: 'tower', box: TOWER_BOX, draw: tower },
    { id: 'dome', box: DOME_BOX, draw: dome },
    { id: 'midTown', box: { x: 0, y: 450, w: W, h: 140 }, draw: midTown },
    { id: 'nearTown', box: { x: 0, y: 410, w: W, h: 290 }, draw: nearTown },
    { id: 'line', box: { x: OTX.line.x0 - 30, y: OTX.line.y - 30, w: OTX.line.x1 - OTX.line.x0 + 60, h: 700 - OTX.line.y }, draw: laundryLine },
    { id: 'laundryStill', box: { x: 200, y: OTX.line.y - 20, w: 760, h: 220 }, stillOnly: true, draw: laundryStill },
    { id: 'town', box: TOWN_BOX, motion: 'slot', draw: () => {} },
    { id: 'parapet', box: { x: 0, y: OTX.parapet.top - 20, w: W, h: TY - OTX.parapet.top + 24 }, draw: parapet },
    { id: 'pots', box: { x: OTX.pots[0] - 120, y: OTX.parapet.top - 140, w: OTX.pots[1] - OTX.pots[0] + 240, h: 150 }, draw: pots },
    ...OTX.lamps.map((x, i) => ({ id: `lamp${i}`, box: { x: x - 60, y: OTX.lampY - 70, w: 130, h: TY - OTX.lampY + 70 }, draw: (c: Ctx) => lamp(c, x) })),
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'wet', box: { x: 0, y: TY, w: W, h: OTX.front - TY }, liveOnly: true, res: 0.5, draw: wet },
    { id: 'lampsStill', box: { x: 0, y: OTX.lampY - 140, w: W, h: 300 }, stillOnly: true, draw: lampFlameStill },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** The wind's slope of the line at x (radians): a garment hangs square to it. */
const lineAng = (x: number): number => {
  const l = OTX.line;
  const t = (x - l.x0) / (l.x1 - l.x0);
  return Math.atan((4 * l.sag * (1 - 2 * t)) / (l.x1 - l.x0));
};

registerKitScene(OLDTOWN, (k, wave0) => {
  const fx = k.slot('fx');
  const town = k.slot('town');
  const skyFx = k.slot('skyFx');
  let kw = waveK(wave0);
  let shown = kw;
  // ——— windows lighting up and going out (more of them as night falls)
  const wins = Array.from({ length: 16 }, () => {
    const h = (crand() < 0.6 ? NEAR : MID)[Math.floor(crand() * 3)];
    return { img: k.glow(h.x + 20 + crand() * (h.w - 40), h.base - h.h + 34 + crand() * Math.max(10, h.h - 80), 22, 0xffb050, 0, { into: town }), on: crand() < 0.4, t: crand() * 20 };
  });
  // ——— the clock's hands
  const clock = k.sc.add.graphics();
  town.add(clock);
  // ——— the washing: each garment painted at 10 phases of its flapping in two winds (calm, gusting), the gusting
  // frames laid over the calm ones as a gust takes it; each swings on the line on a spring (stomps jolt it)
  const N = 10;
  const RES = 0.85;
  const wash = WASH.map((g, i) => {
    const f = gFrame(g);
    const paint = (wind: number) => (c: Ctx, ph: number) => {
      c.scale(RES, RES);
      garmentFrame(c, g, ph, wind, f.gw, f.gh);
    };
    const calmKey = sheet(k, `ot_wash${i}a`, f.gw * RES, f.gh * RES, N, paint(0.3));
    const gustKey = sheet(k, `ot_wash${i}b`, f.gw * RES, f.gh * RES, N, paint(1));
    const y = lineY(g.x);
    const o = { into: town, origin: [f.cx / f.gw, f.top / f.gh] as [number, number], scale: 1 / RES, fps: 7, phase: i * 2.3 };
    const a = new Loop(k, calmKey, N, g.x, y, o);
    const b = new Loop(k, gustKey, N, g.x, y, o);
    return { a, b, ang: lineAng(g.x), sw: new Spring(0, 14 - g.w * 0.05, 1.6), seed: i * 1.7 };
  });
  let gust = 0;
  let gustT = 3;
  let gustOn = false;
  // ——— chimney smoke, leaning with the wind (painted at half size: it's soft)
  const SW = 180;
  const SH = 300;
  const smokeKey = sheet(k, 'ot_smoke', SW / 2, SH / 2, 14, (c, ph) => {
    c.scale(0.5, 0.5);
    steamFrame(c, SW, SH, ph, { a: 0.42, lit: '#e0c8d0', body: '#8a809a', shade: '#3a3450', lean: 1.2, seed: 5, n: 7 });
  });
  const smokes = OTX.chimneys.map(([x, y], i) => new Loop(k, smokeKey, 14, x, y - 52, { into: town, origin: [0.5, 1], scale: 2, fps: 6, phase: i * 4 }));
  // ——— the lanterns: flames painted in frames, a halo breathing with them
  const flameKey = sheet(k, 'ot_flame', 40, 64, 12, (c, ph) => flameFrame(c, 40, 64, ph, ['#d84a10', '#ffa030', '#fff4c8'], 2, 3));
  const flames = OTX.lamps.map((x, i) => ({ loop: new Loop(k, flameKey, 12, x, OTX.lampY + 26, { into: fx, origin: [0.5, 1], add: true, fps: 14, sx: 0.6, sy: 0.7, phase: i * 5 }), halo: k.glow(x, OTX.lampY + 4, 110, 0xffb050, 0.35, { into: fx }), seed: i * 3 }));
  // ——— pigeons on the coping: strut, bob and peck; a stomp scatters them in a clatter of wings and they come back
  // in a glide; the storm sends them to shelter
  const pigeonKey = sheet(k, 'ot_pigeon', PIGEON.w, PIGEON.h, PIGEON.n, (c, _ph, i) => pigeonFrame(c, i));
  type Pigeon = { img: Phaser.GameObjects.Image; x: number; y: number; home: number; state: 'sit' | 'hop' | 'fly' | 'away' | 'land'; vx: number; vy: number; t: number; flap: number; peck: number; dir: number; step: number };
  const PY = OTX.parapet.top - 6;
  const pigeons: Pigeon[] = [520, 586, 1110, 1372, 1436].map((x) => {
    const img = k.img(pigeonKey, x, PY, { into: fx, origin: [PIGEON.fx / PIGEON.w, PIGEON.fy / PIGEON.h], scale: 0.8 });
    const dir = crand() < 0.5 ? 1 : -1;
    img.setFlipX(dir < 0);
    return { img, x, y: PY, home: x, state: 'sit', vx: 0, vy: 0, t: crand() * 5, flap: 0, peck: 1 + crand() * 3, dir, step: 0 };
  });
  const feathers = new Parts(k, { frame: 'flake', into: fx, max: 30 });
  const scare = (p: Pigeon, from: number, power: number) => {
    if (p.state !== 'sit' && p.state !== 'hop') return;
    p.state = 'fly';
    p.dir = p.x < from ? -1 : 1;
    p.vx = p.dir * (220 + crand() * 120 + power * 100);
    p.vy = -170 - crand() * 80;
    p.img.setFlipX(p.dir < 0);
    p.t = 0;
    p.flap = crand() * 8;
    for (let n = 0; n < 3; n++) feathers.spawn({ x: p.x + (crand() - 0.5) * 16, y: p.y - 18, vx: (crand() - 0.5) * 80, vy: -40 - crand() * 40, life: 2.4, r0: 3.5, a: 0.75, tint: 0xc0c2d4, grav: 26, drag: 1.6, spin: (crand() - 0.5) * 8 });
  };
  // ——— mist creeping over the roofs from the third wave
  const mist = new Parts(k, { frame: 'puff', into: town, max: 40 });
  const mistRate = new Rate();
  // (the first banks are laid across the whole town at once, so a stage met at the third wave starts misty)
  let mistWarm = 16;
  // ——— the storm: its sky and its lit twin, a colder night, lightning (painted forks, the cloud lit from inside,
  // a flash over everything), rain that splashes on the tiles, the terrace going wet and shining
  const storm = k.sprite('storm');
  const lit = k.sprite('stormLit').setBlendMode(Phaser.BlendModes.ADD);
  const wetSp = k.sprite('wet');
  const night = k.wash(0x3a3a6a, 0, Phaser.BlendModes.MULTIPLY);
  // nightfall over the sky: the afterglow dying out of the horizon, the zenith deepening (multiplied, behind the town)
  const nfKey = k.tex('ot_nightfall', 4, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#7070a8');
    g.addColorStop(0.5, '#6a62a4');
    g.addColorStop(0.86, '#5a4c8c');
    g.addColorStop(0.94, '#a098c8');
    g.addColorStop(1, '#ffffff');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 256);
  });
  const nightfall = k.img(nfKey, 0, 0, { into: skyFx, origin: [0, 0], alpha: 0 }).setDisplaySize(W, 500).setBlendMode(Phaser.BlendModes.MULTIPLY);
  skyFx.sendToBack(nightfall);
  // the storm's shadow over the sky, deepest under it on the right
  const sdKey = k.tex('ot_stormshade', 64, 64, (c) => {
    const g = c.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#b8b4d0');
    g.addColorStop(1, '#58587a');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    const v = c.createLinearGradient(0, 0, 0, 64);
    v.addColorStop(0, 'rgba(255,255,255,0)');
    v.addColorStop(0.75, 'rgba(255,255,255,0)');
    v.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = v;
    c.fillRect(0, 0, 64, 64);
  });
  const stormShade = k.img(sdKey, 0, 0, { into: skyFx, origin: [0, 0], alpha: 0 }).setDisplaySize(W, 500).setBlendMode(Phaser.BlendModes.MULTIPLY);
  skyFx.moveAbove(stormShade, nightfall);
  // scud driven ahead of the storm, low and ragged, crossing the top of the sky above the campanile
  const scudKey = k.tex('ot_scud', 560, 120, (c) => {
    const r = rng(0x5c0d);
    cloud(c, r, 280, 70, 420, 40, { kind: 'stratus', lit: '#6a6e98', body: '#262a42', shadow: '#10121e', sunX: OTX.moon.x - 1000, sunY: -300, rim: 0.25, wisp: 0.6, a: 0.85, res: 0.5 });
  });
  const scud = [0, 1, 2].map((i) => ({ img: k.img(scudKey, W - i * 760, 6 + i * 12, { into: skyFx, origin: [0.5, 0.5], alpha: 0, scale: 1 + i * 0.25 }), v: 26 + i * 9 }));
  const boltKey = sheet(k, 'ot_bolt', BOLT.w, BOLT.h, BOLT.n, (c, _p, i) => boltFrame(c, BOLT.w, BOLT.h, i));
  const boltImg = k.img(boltKey, 1600, 20, { into: skyFx, add: true, origin: [0.5, 0], alpha: 0 });
  const flash = k.glow(1500, 200, 520, 0xc8d4ff, 0, { into: skyFx, sy: 0.6 });
  const roomFlash = k.wash(0xb8c8ff, 0, Phaser.BlendModes.ADD);
  // a strike: a bright first stroke, a dip, one or two return strokes, then the glow dying in the cloud
  let strikeT = -1;
  let strikeP: number[] = [];
  let nextStrike = 3;
  let sheetT = -1;
  const rain = new Parts(k, { frame: 'drop', into: fx, max: 180 });
  const rainRate = new Rate();
  const splash = new Parts(k, { frame: 'mote', into: fx, max: 90 });
  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, power) {
      for (const p of pigeons) if (Math.abs(p.x - x) < 360 + power * 700) scare(p, x, power);
      for (const w of wash) w.sw.v += (crand() - 0.3) * 0.9 * power * calm();
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      const wd = 0.2 + shown * 0.8;
      const flashes = save.settings.flashes && !save.settings.reducedMotion;
      const sk = Phaser.Math.Clamp((shown - 0.62) / 0.33, 0, 1);
      // ——— washing: gusts come more often as the wind rises; past the third wave it never lets up
      gustT -= dt;
      if (gustT < 0) {
        gustOn = !gustOn;
        gustT = gustOn ? 1.5 + crand() * 2 + wd * 2 : Math.max(0.6, 7 - wd * 6 + crand() * 3);
      }
      const gTarget = Math.max(gustOn ? 1 : 0, Phaser.Math.Clamp((wd - 0.6) / 0.25, 0, 1));
      gust += (gTarget - gust) * Math.min(1, dt * (gTarget > gust ? 2.2 : 1));
      for (const w of wash) {
        w.sw.step(Math.sin(t * 0.9 + w.seed) * 0.03 * calm() + gust * 0.05, dt);
        const rot = w.ang + w.sw.x;
        w.a.alpha = 1;
        w.b.alpha = gust;
        w.a.step(dt * calm(), 0.6 + wd * 0.6);
        w.b.step(dt * calm(), 0.9 + wd * 0.8);
        const wetT = Phaser.Display.Color.GetColor(255 - 80 * sk, 255 - 76 * sk, 255 - 60 * sk);
        w.a.each((im) => im.setRotation(rot).setTint(wetT));
        w.b.each((im) => im.setRotation(rot).setTint(wetT));
      }
      // ——— smoke, flattened by the wind
      smokes.forEach((s, i) => {
        s.step(dt, 0.6 + wd * 0.5);
        s.each((im) => im.setRotation(0.2 + wd * 0.75 + Math.sin(t * 0.4 + i) * 0.05).setScale((0.7 + i * 0.1) * 2));
        s.alpha = 0.85 - sk * 0.4;
      });
      // ——— lanterns gutter harder in the wind
      for (const f of flames) {
        f.loop.step(dt, 1 + wd * 0.6);
        const n = flicker(t * (1 + wd), f.seed);
        f.loop.each((im) => im.setRotation(wd * 0.22 * Math.sin(t * 2.3 + f.seed) + gust * 0.12));
        f.halo.setAlpha(0.26 + n * 0.12 + shown * 0.08);
      }
      // ——— windows
      for (const w of wins) {
        w.t -= dt;
        if (w.t < 0) {
          w.on = crand() < 0.35 + shown * 0.4;
          w.t = 6 + crand() * 18;
        }
        w.img.setAlpha(Phaser.Math.Linear(w.img.alpha, w.on ? 0.42 : 0, Math.min(1, dt * 3)));
      }
      // ——— the clock (real time on the old tower)
      const d = new Date();
      const mins = d.getMinutes() + d.getSeconds() / 60;
      const hrs = (d.getHours() % 12) + mins / 60;
      clock.clear();
      const T = OTX.tower;
      clock.lineStyle(3, 0x2a1a10, 1);
      clock.lineBetween(T.x, T.clockY, T.x + Math.sin((hrs / 12) * Math.PI * 2) * 12, T.clockY - Math.cos((hrs / 12) * Math.PI * 2) * 12);
      clock.lineStyle(2, 0x2a1a10, 1);
      clock.lineBetween(T.x, T.clockY, T.x + Math.sin((mins / 60) * Math.PI * 2) * 19, T.clockY - Math.cos((mins / 60) * Math.PI * 2) * 19);
      // ——— pigeons
      for (const p of pigeons) {
        p.t += dt;
        if (p.state === 'sit') {
          if (sk > 0.5 && crand() < dt * 0.5) scare(p, p.x - p.dir, 0.2);
          p.peck -= dt;
          let fr: number;
          if (p.peck < 0.6 && p.peck > 0) fr = 4 + Math.min(2, Math.floor((0.6 - p.peck) * 5));
          else fr = Math.floor(p.t * 3.2) % 4;
          if (p.peck <= 0) p.peck = 2 + crand() * 4;
          // a strut: a few steps along the coping, the head going with them
          if (p.step > 0) {
            p.step -= dt;
            p.x += p.dir * 22 * dt;
            fr = Math.floor(p.t * 8) % 4;
          } else if (crand() < dt * 0.18) p.step = 0.5 + crand();
          if (Math.abs(p.x - p.home) > 60) {
            p.dir = Math.sign(p.home - p.x);
            p.img.setFlipX(p.dir < 0);
          } else if (crand() < dt * 0.08) {
            p.dir = -p.dir;
            p.img.setFlipX(p.dir < 0);
          }
          p.img.setFrame(fr).setPosition(p.x, p.y).setRotation(0);
        } else if (p.state === 'fly') {
          p.flap += dt * 22;
          p.img.setFrame(PIGEON.flap0 + (Math.floor(p.flap) % 8));
          p.vy = Math.max(p.vy + 70 * dt, -300);
          p.vx *= 1 + dt * 0.4;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.img.setPosition(p.x, p.y).setRotation(p.dir * -0.25);
          if (p.y < -60 || p.x < -80 || p.x > W + 80) {
            p.state = 'away';
            p.t = 0;
            p.img.setVisible(false);
          }
        } else if (p.state === 'away') {
          if (p.t > 7 + crand() * 6 && sk < 0.3) {
            // glide back in from the side it left by, onto its spot
            p.state = 'land';
            p.dir = -p.dir;
            p.img.setFlipX(p.dir < 0).setVisible(true);
            p.t = 0;
          }
        } else {
          const k2 = Math.min(1, p.t / 2.6);
          const e = 1 - (1 - k2) ** 2;
          const sx = p.home - p.dir * 520;
          p.x = sx + (p.home - sx) * e;
          p.y = PY - 280 + 280 * e;
          // glide in, then a flurry of beats to brake onto the coping
          if (k2 < 0.7) p.img.setFrame(PIGEON.glide);
          else {
            p.flap += dt * 26;
            p.img.setFrame(PIGEON.flap0 + (Math.floor(p.flap) % 8));
          }
          p.img.setPosition(p.x, p.y).setRotation(p.dir * (0.15 - k2 * 0.35));
          if (k2 >= 1) {
            p.state = 'sit';
            p.y = PY;
            p.x = p.home;
            p.peck = 1 + crand() * 2;
          }
        }
      }
      feathers.update(dt);
      // ——— mist from the third wave, drifting through the roofs
      const mk = Phaser.Math.Clamp((shown - 0.3) / 0.4, 0, 1);
      mistRate.tick(mk * (mistWarm > 0 ? 30 : 1.6), dt, () => mist.spawn({ x: mistWarm-- > 0 ? crand() * W : -160, y: 462 + crand() * 80, vx: 28 + crand() * 26 + wd * 30, vy: (crand() - 0.5) * 4, life: 44, r0: 100 + crand() * 40, r1: 150, a: 0.26 * mk, tint: 0xb8b0d0, fade: 0.2 }));
      mist.update(dt);
      // ——— the storm (last wave)
      storm.setAlpha(sk);
      stormShade.setAlpha(sk);
      for (const sc of scud) {
        sc.img.x -= sc.v * dt * (0.6 + wd * 0.6) * calm();
        if (sc.img.x < -400) sc.img.x = W + 400;
        sc.img.setAlpha(sk * 0.9);
      }
      wetSp.setAlpha(sk);
      night.setAlpha(shown * 0.18 + sk * 0.2);
      nightfall.setAlpha(Math.min(1, shown * 1.2));
      if (sk > 0.5) {
        nextStrike -= dt;
        if (nextStrike < 0) {
          strikeT = 0;
          nextStrike = 5 + crand() * 7;
          // the strokes: times (s) of the first and the return strokes
          strikeP = [0, 0.16 + crand() * 0.06];
          if (crand() < 0.5) strikeP.push(0.34 + crand() * 0.1);
          boltImg.setFrame(Math.floor(crand() * BOLT.n)).setPosition(1330 + crand() * 300, 40).setFlipX(crand() < 0.5);
          flash.setPosition(boltImg.x, 160);
        } else if (sheetT < 0 && crand() < dt * 0.12) sheetT = 0;
      }
      let st = 0;
      if (strikeT >= 0) {
        strikeT += dt;
        for (const s0 of strikeP) {
          const u = strikeT - s0;
          if (u >= 0) st = Math.max(st, u < 0.05 ? 1 : Math.exp(-(u - 0.05) * 14));
        }
        if (strikeT > 1.4) strikeT = -1;
      }
      // sheet lightning: a dim glow deep in the cloud, no fork
      let sh = 0;
      if (sheetT >= 0) {
        sheetT += dt;
        sh = Math.max(0, Math.sin((sheetT / 0.5) * Math.PI)) * (0.6 + 0.4 * Math.sin(sheetT * 40));
        if (sheetT > 0.5) sheetT = -1;
      }
      const fk = flashes ? 1 : 0.3;
      boltImg.setAlpha(st * fk);
      lit.setAlpha(Math.min(1, (st * 0.9 + sh * 0.45) * sk * fk));
      flash.setAlpha(st * 0.45 * sk * fk);
      roomFlash.setAlpha(st * (flashes ? 0.13 : 0.03) * sk);
      // rain, slanting with the wind, splashing on the coping and the terrace
      rainRate.tick(sk * 100 * calm(), dt, () => {
        const x = crand() * (W + 300);
        const onCoping = crand() < 0.2;
        rain.spawn({ x, y: -20, vx: -170 - wd * 60, vy: 950 + crand() * 200, life: 1.5, r0: 3.5, a: 0.32, tint: 0xb8c4e8, streak: 0.03, floor: onCoping ? PY - 4 : TY + crand() * (OTX.front - TY), onFloor: (fx2, fy) => {
          for (let n = 0; n < 2; n++) splash.spawn({ x: fx2, y: fy, vx: (crand() - 0.5) * 70, vy: -50 - crand() * 60, life: 0.32, r0: 1.8, a: 0.5, tint: 0xc8d4ff, grav: 420 });
        } });
      });
      rain.update(dt);
      splash.update(dt);
    },
  };
});

// ——— shared painters (the Bell Tower borrows the pigeons and the lightning) ———

/** The pigeon sheet: frame size, where its feet are, and its frames (0–3 strut and bob, 4–6 peck, 7–14 a wingbeat, 15 a glide). */
export const PIGEON = { w: 76, h: 72, fx: 36, fy: 66, n: 16, flap0: 7, glide: 15 };

/**
 * A rock pigeon, facing right, at frame i (see PIGEON): a plump grey body, the neck's green and violet sheen, two
 * black bars on the folded wing, a dark tail band, coral feet, an orange eye. In flight the legs tuck, the body tips
 * up and the wings beat through a full stroke: raised in a V, swept down past the body, foreshortened as they cross,
 * the primaries splayed at the top of the stroke.
 */
export function pigeonFrame(c: Ctx, i: number, o: { body?: string; wing?: string; dark?: string } = {}): void {
  const body = o.body ?? '#8e93a8';
  const wingCol = o.wing ?? '#a2a6ba';
  const dark = o.dark ?? '#3a3c4c';
  const fly = i >= PIGEON.flap0;
  const P = Math.PI * 2;
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // sitting: feet at (fx, fy); flying: centred a little higher
  const ox = PIGEON.fx - 30;
  const oy = PIGEON.fy - 52 + (fly ? 2 : 0);
  c.translate(ox, oy);
  // strut and peck poses
  const bob = [0, -1.2, -0.4, 0.6][i % 4] * (i < 4 ? 1 : 0);
  const fwd = i < 4 ? [0, 3, 5, 2][i] : 0;
  const peck = i >= 4 && i < 7 ? [0.45, 1, 0.7][i - 4] : 0;
  if (!fly) {
    // contact: a soft shadow on the coping, the coral feet gripping it
    c.fillStyle = 'rgba(14,8,18,0.38)';
    c.beginPath();
    c.ellipse(32, 52, 17, 3.2, 0, 0, P);
    c.fill();
    c.strokeStyle = '#c4605a';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(29, 44);
    c.lineTo(28, 51.5);
    c.lineTo(33, 52);
    c.moveTo(35, 44);
    c.lineTo(36 + fwd * 0.3, 51.5);
    c.lineTo(41 + fwd * 0.3, 52);
    c.stroke();
  }
  // in flight the body tips up a little round its middle
  if (fly) {
    c.translate(30, 36);
    c.rotate(-0.18);
    c.translate(-30, -36);
  } else if (peck) {
    c.translate(32, 50);
    c.rotate(peck * 0.28);
    c.translate(-32, -50);
  }
  // the wingbeat: a from +1 (raised) to −1 (down); the glide holds the wings out, a little raised
  const k = fly ? (i === PIGEON.glide ? 0 : (i - PIGEON.flap0) / 8) : 0;
  const a = fly ? (i === PIGEON.glide ? 0.3 : Math.cos(k * P)) : 0;
  /** A wing in its stroke: a unit wing (shoulder at 0, tip at x = 1, the trailing edge scalloped by its feathers on
   * +y) laid along the stroke's angle and foreshortened as it swings through the side view. */
  const wing = (far: boolean) => {
    const sx = 31 + (far ? 4 : 0);
    const sy = 30 + (far ? -1 : 0);
    const th = lerp(Math.PI * 0.5, -Math.PI * 0.6, (a + 1) / 2) + (far ? -0.12 : 0);
    const f = 0.45 + 0.55 * Math.abs(a);
    const L = (far ? 32 : 38) * f * (i === PIGEON.glide ? 1.08 : 1);
    const C = far ? 13 : 16;
    const sgn = Math.sin(th) > 0 ? 1 : -1;
    const cs = Math.cos(th);
    const sn = Math.sin(th);
    const T = (u: number, v: number): [number, number] => [sx + u * L * cs - v * C * sgn * sn, sy + u * L * sn + v * C * sgn * cs];
    const lead: [number, number][] = [[0, -0.1], [0.3, -0.12], [0.6, -0.08], [0.85, -0.02], [1, 0.04]];
    // the feathers' tips along the trailing edge, from the tip back to the body
    const trail: [number, number][] = [[0.94, 0.2], [0.84, 0.34], [0.72, 0.42], [0.58, 0.46], [0.44, 0.47], [0.3, 0.45], [0.16, 0.4], [0.02, 0.3]];
    const path = (g: Ctx) => {
      g.beginPath();
      const p0 = T(...lead[0]);
      g.moveTo(p0[0], p0[1]);
      for (let j = 1; j < lead.length; j++) {
        const [x, y] = T(...lead[j]);
        g.lineTo(x, y);
      }
      let prev = lead[lead.length - 1];
      for (const q of trail) {
        // each feather's tip rounded: a curve bowing out between neighbouring tips
        const [cx2, cy2] = T((prev[0] + q[0]) / 2, (prev[1] + q[1]) / 2 + 0.07);
        const [x, y] = T(...q);
        g.quadraticCurveTo(cx2, cy2, x, y);
        prev = q;
      }
      g.closePath();
    };
    const xs = [...lead, ...trail].map((p) => T(...p));
    const bx = Math.min(...xs.map((p) => p[0])) - 2;
    const by = Math.min(...xs.map((p) => p[1])) - 2;
    const box = { x: bx, y: by, w: Math.max(...xs.map((p) => p[0])) - bx + 4, h: Math.max(...xs.map((p) => p[1])) - by + 4 };
    solid(c, path, box, 'fur', far ? shade(wingCol, -0.32) : wingCol, { depth: 0.1, line: 1.5, formSize: 5, spec: false });
    within(c, path, () => {
      // the dark primaries towards the tip
      const [g0x, g0y] = T(0.55, 0.2);
      const [g1x, g1y] = T(1, 0.2);
      const g = c.createLinearGradient(g0x, g0y, g1x, g1y);
      g.addColorStop(0, rgba(dark, 0));
      g.addColorStop(0.45, rgba(dark, 0.7));
      g.addColorStop(1, rgba(dark, 0.9));
      c.fillStyle = g;
      c.fillRect(box.x, box.y, box.w, box.h);
      // feather lines along the flight feathers, two black bars across the coverts
      c.strokeStyle = rgba(dark, 0.45);
      c.lineWidth = 1;
      for (const q of trail.slice(0, 6)) {
        const [x0, y0] = T(q[0] * 0.75, 0.12);
        const [x1, y1] = T(...q);
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
        c.stroke();
      }
      c.strokeStyle = rgba(dark, 0.8);
      c.lineWidth = 2;
      for (const u of [0.2, 0.32]) {
        const [x0, y0] = T(u, 0.02);
        const [x1, y1] = T(u + 0.02, 0.3);
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
        c.stroke();
      }
      // the leading edge's lit lip
      c.strokeStyle = 'rgba(255,250,240,0.35)';
      c.lineWidth = 1.4;
      c.beginPath();
      const [l0x, l0y] = T(0.05, -0.08);
      const [l1x, l1y] = T(0.8, -0.03);
      c.moveTo(l0x, l0y);
      c.lineTo(l1x, l1y);
      c.stroke();
    });
  };
  if (fly) wing(true);
  // the tail: a dark band at its tip; fanned in flight
  const tail = (g: Ctx) => {
    g.beginPath();
    g.moveTo(14, 34);
    if (fly) {
      g.lineTo(0, 30);
      g.quadraticCurveTo(-3, 36, 0, 42);
      g.lineTo(14, 40);
    } else {
      g.lineTo(2, 37 + bob * 0.3);
      g.lineTo(3, 42);
      g.lineTo(15, 41);
    }
    g.closePath();
  };
  solid(c, tail, { x: -4, y: 28, w: 22, h: 16 }, 'fur', shade(body, -0.12), { depth: 0.1, line: 1.5, formSize: 4, spec: false });
  within(c, tail, () => {
    c.fillStyle = rgba(dark, 0.85);
    c.fillRect(-4, 26, 7, 20);
  });
  // the body
  const bodyP = (g: Ctx) => {
    g.beginPath();
    g.moveTo(10, 35 + bob);
    g.quadraticCurveTo(22, 24 + bob, 38, 26 + bob);
    g.quadraticCurveTo(50, 28 + bob, 49, 38);
    g.quadraticCurveTo(47, 47, 33, 47);
    g.quadraticCurveTo(19, 46, 10, 40);
    g.closePath();
  };
  solid(c, bodyP, { x: 8, y: 22, w: 44, h: 28 }, 'fur', body, { depth: 0.1, line: 1.8, formSize: 8, spec: false });
  // the head on its neck, the neck's iridescence
  const hx = 50 + fwd + peck * 6;
  const hy = 20 + bob + peck * 15;
  const neck = (g: Ctx) => {
    g.beginPath();
    g.moveTo(36, 28 + bob);
    g.quadraticCurveTo((36 + hx) / 2 - 2, Math.min(26 + bob, hy) - 2, hx - 5, hy - 3);
    g.lineTo(hx + 3, hy + 5);
    g.quadraticCurveTo((49 + hx) / 2 + 2, (40 + hy) / 2 + 3, 48, 40);
    g.closePath();
  };
  solid(c, neck, { x: 34, y: hy - 4, w: 24, h: 46 - hy + 4 }, 'fur', shade(body, -0.08), { depth: 0.1, line: 1.6, formSize: 5, spec: false });
  within(c, neck, () => {
    const g = c.createLinearGradient(38, 24, 50, 38);
    g.addColorStop(0, 'rgba(110,190,140,0.75)');
    g.addColorStop(0.55, 'rgba(150,100,190,0.6)');
    g.addColorStop(1, 'rgba(150,100,190,0)');
    c.fillStyle = g;
    c.fillRect(30, hy - 6, 30, 50);
  });
  const head = ellPath(hx, hy, 7, 6.4);
  solid(c, head, { x: hx - 8, y: hy - 8, w: 16, h: 15 }, 'fur', shade(body, -0.06), { depth: 0.1, line: 1.6, formSize: 4, spec: false });
  // beak and its pale cere, the eye
  c.fillStyle = '#3a2e30';
  c.beginPath();
  c.moveTo(hx + 5.5, hy - 0.5);
  c.lineTo(hx + 11.5, hy + 1.8);
  c.lineTo(hx + 5.5, hy + 3);
  c.closePath();
  c.fill();
  c.fillStyle = '#f0ece4';
  c.beginPath();
  c.ellipse(hx + 6, hy - 0.2, 1.8, 1.2, 0, 0, P);
  c.fill();
  c.fillStyle = '#f08a2a';
  c.beginPath();
  c.arc(hx + 2, hy - 1.6, 1.9, 0, P);
  c.fill();
  c.fillStyle = '#140a0a';
  c.beginPath();
  c.arc(hx + 2.3, hy - 1.6, 0.9, 0, P);
  c.fill();
  // the folded wing with its two black bars (sitting), or the near wing in its stroke (flying)
  if (!fly) {
    const fw = (g: Ctx) => {
      g.beginPath();
      g.moveTo(42, 30 + bob);
      g.quadraticCurveTo(28, 26 + bob, 14, 33 + bob);
      g.lineTo(5, 38 + bob);
      // the lower edge scalloped by the folded feathers
      g.quadraticCurveTo(10, 41 + bob, 14, 39.5 + bob * 0.5);
      g.quadraticCurveTo(19, 42, 24, 40.5);
      g.quadraticCurveTo(30, 43, 36, 41);
      g.quadraticCurveTo(42, 40, 44, 36);
      g.closePath();
    };
    solid(c, fw, { x: 4, y: 26, w: 42, h: 18 }, 'fur', wingCol, { depth: 0.1, line: 1.4, formSize: 5, spec: false });
    within(c, fw, () => {
      // two short black bars across the folded wing, and the dark primaries crossed over the tail
      c.strokeStyle = rgba(dark, 0.85);
      c.lineWidth = 2.6;
      for (const x of [27, 33]) {
        c.beginPath();
        c.moveTo(x + 1, 33 + bob);
        c.quadraticCurveTo(x - 2, 36 + bob, x - 1, 39.5);
        c.stroke();
      }
      const g = c.createLinearGradient(20, 0, 6, 0);
      g.addColorStop(0, rgba(dark, 0));
      g.addColorStop(1, rgba(dark, 0.8));
      c.fillStyle = g;
      c.fillRect(4, 26, 18, 18);
      c.strokeStyle = 'rgba(255,250,240,0.3)';
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(40, 30.5 + bob);
      c.quadraticCurveTo(28, 27.5 + bob, 16, 33.5 + bob);
      c.stroke();
    });
  } else wing(false);
  rim(c, bodyP, 0.35, 1.6);
  c.restore();
}

/** The lightning sheet: frame size and count. */
export const BOLT = { w: 170, h: 380, n: 4 };

/**
 * A fork of lightning (variant i) in a w×h frame, struck from the top centre: a jagged channel tapering as it goes,
 * a few thinner branches forking off and dying away, every stroke a white core in a violet glow; the bottom fades
 * into the haze. Seeded by i, so it's the same every time.
 */
export function boltFrame(c: Ctx, w: number, h: number, i: number): void {
  let s = 1234 + i * 977;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const strokes: { pts: [number, number][]; w0: number; a: number }[] = [];
  const grow = (x: number, y: number, ang: number, len: number, w0: number, a: number, depth: number) => {
    const pts: [number, number][] = [[x, y]];
    let px = x;
    let py = y;
    let d = 0;
    while (d < len) {
      const step = 8 + r() * 16;
      const dev = (r() - 0.5) * 1.1;
      px += Math.sin(ang + dev) * step;
      py += Math.cos(ang + dev) * step;
      d += step;
      pts.push([px, py]);
      if (px < 10 || px > w - 10) break;
      if (depth === 0 && d > len * 0.15 && d < len * 0.75 && r() < 0.13) grow(px, py, ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), len * (0.2 + r() * 0.25), w0 * 0.45, a * 0.75, 1);
      else if (depth === 1 && r() < 0.08) grow(px, py, ang + (r() - 0.5) * 1.6, len * 0.3, w0 * 0.6, a * 0.7, 2);
    }
    strokes.push({ pts, w0, a });
  };
  grow(w / 2, 0, (r() - 0.5) * 0.3, h * 0.95, 4.5, 1, 0);
  const draw = (lw: (w0: number, t: number) => number, col: (a: number, t: number) => string, blur = 0) => {
    c.shadowBlur = blur;
    c.shadowColor = 'rgba(160,150,255,0.9)';
    for (const st of strokes) {
      const n = st.pts.length - 1;
      for (let j = 0; j < n; j++) {
        const t = j / n;
        c.strokeStyle = col(st.a, t);
        c.lineWidth = lw(st.w0, t);
        c.beginPath();
        c.moveTo(st.pts[j][0], st.pts[j][1]);
        c.lineTo(st.pts[j + 1][0], st.pts[j + 1][1]);
        c.stroke();
      }
    }
    c.shadowBlur = 0;
  };
  c.lineCap = 'round';
  c.lineJoin = 'round';
  draw((w0, t) => w0 * 5 * (1 - t * 0.5), (a, t) => `rgba(150,140,255,${(0.16 * a * (1 - t * 0.6)).toFixed(3)})`, 14);
  draw((w0, t) => w0 * 2 * (1 - t * 0.55), (a, t) => `rgba(200,206,255,${(0.55 * a * (1 - t * 0.4)).toFixed(3)})`);
  draw((w0, t) => Math.max(0.8, w0 * (1 - t * 0.6)), (a) => `rgba(255,255,255,${a.toFixed(3)})`);
  // the bottom dissolves into the haze
  c.save();
  c.globalCompositeOperation = 'destination-out';
  const g = c.createLinearGradient(0, h * 0.7, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = g;
  c.fillRect(0, h * 0.7, w, h * 0.3);
  c.restore();
}
