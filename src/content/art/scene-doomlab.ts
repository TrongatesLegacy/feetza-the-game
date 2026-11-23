// The Doom Lab (Act 7, the Comics act: Stage 14, waves 66–69), redrawn with the location kit (src/art/scene) in the
// act's pulp-comic print (src/art/scene/print.ts), like Metropizza Rooftops and Downtown Ruins (scene-metropizza.ts,
// scene-doomstomp.ts): bold ink weighted on the shadow side, flat colour fields modelled in halftone dots at the
// printed screen angles, Ben-Day tints, hatching in the deepest shade. A supervillain's lair as a comic cover would
// paint it: a cold white key light off the upper left (every left face lit, the right faces dropping into a violet
// dot screen), and the lab's own coloured lights doing the drama: the toxic green and magenta of the vats, the cyan of
// the coils, the green of the vault's emblem.
//
// A riveted steel bulkhead (vents and hatches in its plates, rust run down from rivets) under a ceiling of ducts and
// pipes sunk in the dark, two I-beam pilasters holding it up and a catwalk on trusses across the top of the bay, in
// front of the vault's crown. In the middle the vault, on its pedestal: a round armoured door in a housing ringed with
// lock bolts and a hazard band, its seal leaking green, a bank-vault wheel over the
// villain's green boot emblem, copper electrode horns on its shoulders, two monitors on arms (an oscilloscope, a radar
// with a foot-shaped blip), steps down to the deck. Either side, a Tesla coil on its drum (copper winding, a chrome
// toroid) and, at the ends, the cloning vats: tall glass cylinders on plinths, capped with pipes, the left one green
// with a clone foot hanging in it, the right one magenta with an Ultoe prototype (a robot foot with a red core).
// A Jacob's ladder on the deck by the left coil; the MASTER POWER knife switch on the right pilaster; red alarm
// beacons on the wall over the vats. The table is a steel lab bench behind a console lip of lamps and toggles, a rack
// of test tubes and a flask on it, and the blueprint for Project Ultoe.
//
// Live, the heroes:
// - the vats: the liquid painted at 12 phases (streams of inked bubbles swelling as they rise, light bands drifting
//   up, the surface churning with froth), each specimen bobbing on its cable and twitching its toes (8 painted
//   frames); a stomp jolts the specimen on a spring and throws up a burst of comic bubbles;
// - the coils: painted comic bolts (white core, cyan body, ink) striking from each toroid to the vault's horn, with
//   Kirby krackle (black blobs in the energy, 4 frames) crackling at both ends and a hit flash on the horn; faster
//   every wave, and a big stomp makes both fire; the Jacob's ladder's arc climbing the wires, stretching to a filament
//   and breaking at the top (16 painted frames);
// - the alarm beacons, from the second wave: painted rotating reflectors in the red domes, beams sweeping off them
//   and their red light running across the wall; red alert on the third wave; on the fourth the power surges (the
//   room drops to a cold dim with the vats glowing in it, the lights dip in steps, the coils discharge, the knife
//   switch and the gantry's conduit spit sparks, the monitors drop out to snow and dark, half the console's lamps die).
// Also: the monitors' traces and the radar sweep (painted frames), the console's lamps blinking, the vault emblem
// breathing, grit off the ceiling pipes on stomps. The act's layer (src/game/acts/act7.ts) plays the zaps when the
// scene's arcs strike ('doomlab:arc') and the surge's sound ('doomlab:surge'); with animated stages off it keeps its
// own bubbles, arcs and beacons, placed on this art (DL).
// (The old art is kept in scenes-act7.ts for the before/after page.)

import Phaser from 'phaser';
import { type Box, type Ctx, type PathFn, type R, TY, W, calmLanes, castShadow, crevice, ellPath, glowAt, gradeAll, groundShadow, lightPool, polyPath, rectPath, rrPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { bolt, boltPath, dots, flat, hatch, ink, linTone, radTone } from '../../art/scene/print';
import { mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, registerKitScene, waveK, wander } from '../../game/sceneLive';
import { Loop, Parts, Spring, sheet } from '../../game/sceneAnim';
import { BLOCK, INK, P2, smooth } from './scene-metropizza';

// ——— layout (the act's still-mode bubbles, arcs and beacons use it too) ———

export const DL = {
  /** The ceiling's underside, the wall's foot on the deck, the console lip's top, the bench's front edge. */
  ceil: 92,
  floor: 612,
  lip: 694,
  front: 1040,
  vault: { x: 960, y: 318, r: 192, hous: 232 },
  /** The vault's electrode horns (the coils' arcs strike them). */
  horns: [
    { x: 706, y: 402 },
    { x: 1214, y: 402 },
  ],
  /** The coils: the toroid's centre, its radii; the drum's foot on the deck. */
  coils: [
    { x: 506, y: 404 },
    { x: 1414, y: 404 },
  ],
  toroid: { rx: 64, ry: 22 },
  coilFoot: 652,
  /** The vats: centre x; the glass from top to bottom; the plinth's foot. */
  vats: [
    { x: 262, col: '#48f08c', deep: '#0c5a3a', name: 'green' },
    { x: 1658, col: '#f04ad2', deep: '#5a0c58', name: 'magenta' },
  ],
  vat: { rx: 80, top: 262, bottom: 584, cap: 222, foot: 664 },
  beacons: [
    { x: 118, y: 200 },
    { x: 1802, y: 200 },
  ],
  monitors: [
    { x: 676, y: 214 },
    { x: 1244, y: 214 },
  ],
  pilasters: [404, 1516],
  ladder: { x: 410, foot: 656, top: 440 },
  knife: { x: 1516, y: 470 },
  table: { rack: { x: 168, y: 812 }, plan: { x: 1736, y: 816 } },
};

const STEEL = '#3e4a74';
const STEEL_LIT = '#8496c0';
const STEEL_DK = '#2c3456';
const SHADE = '#170f34';
const HAZ = '#f2c230';
const COPPER = '#d8843c';
const CYAN = '#9ae8ff';
const VGREEN = '#3dff7a';
/** The emblem's green: muted, it sits behind the lanes. */
const EMB = '#2cb866';

/** A rivet: a lit dome, inked. */
function rivet(ctx: Ctx, x: number, y: number, s: number, col = '#9aa8cc'): void {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + s * 0.25, y + s * 0.3, s + 0.9, 0, P2);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, P2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(x - s * 0.35, y - s * 0.35, s * 0.38, 0, P2);
  ctx.fill();
}

/** Hazard stripes (yellow and ink) over a path. */
function hazardIn(ctx: Ctx, path: PathFn, box: Box, w = 22, ang = -0.8): void {
  within(ctx, path, () => {
    ctx.fillStyle = HAZ;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    hatch(ctx, path, box, ang, w * 2, w, INK, 1);
  });
}

/** A copper ball, lit from the upper left, its shade in dots. */
function copperBall(ctx: Ctx, x: number, y: number, r: number): void {
  const p = ellPath(x, y, r, r);
  flat(ctx, p, COPPER, 2.4, INK, 0.5);
  within(ctx, p, () => {
    dots(ctx, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, linTone(x - r * 0.4, y - r * 0.4, x + r, y + r, 0, 0.9), '#5a1a08', { step: 3.5, angle: 0.79 });
    ctx.fillStyle = '#ffe0b0';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.38, y - r * 0.4, r * 0.32, r * 0.22, -0.6, 0, P2);
    ctx.fill();
  });
}

// ——— the wall: ceiling, bulkhead, pilasters, the vault ———

const WALL_BOX = { x: 0, y: 0, w: W, h: DL.floor + 4 };

function ceiling(ctx: Ctx, r: R): void {
  const c = DL.ceil;
  // the soffit in deep shade, ribbed
  vfill(ctx, 0, 0, W, c, [[0, '#0c0a1a'], [1, '#1c1a34']]);
  ctx.fillStyle = rgba('#000000', 0.35);
  for (let x = 60; x < W; x += 240) ctx.fillRect(x, 0, 14, c - 30);
  // the big duct and the red pipe, flanged, on hangers
  const pipe = (y: number, h: number, col: string, flange: number) => {
    for (let x = 140; x < W; x += 320) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    const p = rectPath(-10, y, W + 20, h);
    flat(ctx, p, col, 0, INK);
    within(ctx, p, () => {
      ctx.fillStyle = rgba('#ffffff', 0.28);
      ctx.fillRect(-10, y + h * 0.18, W + 20, h * 0.16);
      dots(ctx, { x: 0, y, w: W, h }, linTone(0, y + h * 0.35, 0, y + h, 0, 0.85), SHADE, { step: 4, angle: 0.79 });
    });
    ink(ctx, p, 2.6, INK, 0.6);
    for (let x = flange; x < W; x += 320) {
      const f = rectPath(x - 9, y - 4, 18, h + 8);
      flat(ctx, f, mix(col, '#ffffff', 0.15), 2, INK, 0.4);
      within(ctx, f, () => dots(ctx, { x: x - 9, y: y - 4, w: 18, h: h + 8 }, linTone(x - 9, 0, x + 9, 0, 0.1, 0.7), SHADE, { step: 3.5, angle: 0.79 }));
      for (const dy of [2, h - 2]) rivet(ctx, x, y + dy, 1.8, '#c8d0e0');
    }
  };
  pipe(16, 30, '#5f8270', 220);
  pipe(54, 20, '#a8482e', 70);
  // a cable tray under them along the ends (kept out of the middle, under the HUD)
  for (const [x0, x1] of [[0, 560], [1360, W]] as const) {
    const tr = rectPath(x0, c - 12, x1 - x0, 10);
    flat(ctx, tr, '#3a425e', 1.8, INK, 0.3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      const a = x0 + 30 + k * 60;
      const b = x1 - 30 - k * 40;
      ctx.moveTo(a, c - 4);
      ctx.quadraticCurveTo((a + b) / 2, c + 22 + k * 8 + r() * 6, b, c - 4);
      ctx.stroke();
    }
  }
  // the whole ceiling sinks into the dark over the bay
  const dk = ctx.createLinearGradient(0, 0, 0, c + 14);
  dk.addColorStop(0, 'rgba(4,2,12,0.6)');
  dk.addColorStop(1, 'rgba(4,2,12,0.25)');
  ctx.fillStyle = dk;
  ctx.fillRect(0, 0, W, c + 14);
  // the soffit's lip: a steel beam along the top of the wall
  const lip = rectPath(-10, c - 4, W + 20, 18);
  flat(ctx, lip, '#4a5578', 0, INK);
  within(ctx, lip, () => {
    ctx.fillStyle = rgba(STEEL_LIT, 0.7);
    ctx.fillRect(-10, c - 4, W + 20, 4);
    dots(ctx, { x: 0, y: c - 4, w: W, h: 18 }, linTone(0, c, 0, c + 14, 0.2, 0.8), SHADE, { step: 4, angle: 0.79 });
  });
  ink(ctx, lip, 2.6, INK, 0.6);
  for (let x = 30; x < W; x += 60) rivet(ctx, x, c + 6, 2.2);
}

/** The bulkhead: riveted plates in staggered courses, each bevelled, the shade printed over the whole wall. */
function bulkhead(ctx: Ctx, r: R): void {
  const y0 = DL.ceil + 14;
  const y1 = DL.floor;
  vfill(ctx, 0, y0, W, y1 - y0, [[0, '#1a1e38'], [0.5, '#2c3660'], [1, '#283052']]);
  const rows = [y0, 200, 316, 432, 528, y1];
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    const off = i % 2 ? 120 : 0;
    for (let x = -off; x < W; x += 240) {
      const tone = mix(STEEL, r() < 0.5 ? '#323c64' : '#424e7a', 0.4 + r() * 0.6);
      ctx.fillStyle = tone;
      ctx.fillRect(x + 3, a + 3, 234, b - a - 6);
      const kind = r();
      if (kind < 0.12) {
        // a louvred vent: slats in shadow, their lips lit
        const vx = x + 40;
        const vw = 160;
        flat(ctx, rectPath(vx, a + 22, vw, b - a - 44), '#10122a', 2, INK, 0);
        for (let yy = a + 28; yy < b - 26; yy += 9) {
          ctx.fillStyle = rgba(STEEL_LIT, 0.5);
          ctx.fillRect(vx + 3, yy, vw - 6, 2);
          ctx.fillStyle = rgba('#2a3256', 1);
          ctx.fillRect(vx + 3, yy + 2, vw - 6, 3);
        }
      } else if (kind < 0.2) {
        // a bolted access hatch
        const hx = x + 120;
        const hy = (a + b) / 2;
        const hr = Math.min(42, (b - a) / 2 - 16);
        flat(ctx, ellPath(hx, hy, hr, hr), mix(tone, '#ffffff', 0.06), 2.2, INK, 0.5);
        ctx.strokeStyle = rgba(INK, 0.6);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(hx, hy, hr * 0.7, 0, P2);
        ctx.stroke();
        for (let k = 0; k < 8; k++) rivet(ctx, hx + Math.cos((k / 8) * P2) * hr * 0.85, hy + Math.sin((k / 8) * P2) * hr * 0.85, 2);
      }
      // the bevel: lit top and left, dark bottom and right
      ctx.fillStyle = rgba(STEEL_LIT, 0.45);
      ctx.fillRect(x + 3, a + 3, 234, 3);
      ctx.fillRect(x + 3, a + 3, 3, b - a - 6);
      ctx.fillStyle = rgba(SHADE, 0.5);
      ctx.fillRect(x + 3, b - 6, 234, 3);
      ctx.fillRect(x + 234, a + 3, 3, b - a - 6);
      // the seams, inked
      ctx.strokeStyle = rgba(INK, 0.85);
      ctx.lineWidth = 2.4;
      ctx.strokeRect(x + 1.5, a + 1.5, 237, b - a - 3);
      // rivets round the edge
      for (let rx = x + 16; rx < x + 230; rx += 37) {
        rivet(ctx, rx, a + 12, 2.6);
        rivet(ctx, rx, b - 12, 2.6);
      }
      // a few plates stained: rust run down from a rivet in thin drips, each ending in a bead
      if (r() < 0.2) {
        const sx = x + 16 + Math.floor(r() * 6) * 37;
        for (let d = 0; d < 3; d++) {
          const dx = sx + (d - 1) * 4 + r() * 2;
          const len = 30 + r() * (b - a - 50);
          const dw = 1.4 + r() * 2;
          const g = ctx.createLinearGradient(0, a + 14, 0, a + 14 + len);
          g.addColorStop(0, rgba('#7a3a24', 0.5));
          g.addColorStop(1, rgba('#7a3a24', 0.08));
          ctx.fillStyle = g;
          ctx.fillRect(dx - dw / 2, a + 14, dw, len);
          ctx.fillStyle = rgba('#7a3a24', 0.25);
          ctx.beginPath();
          ctx.arc(dx, a + 14 + len, dw * 0.8, 0, P2);
          ctx.fill();
        }
      }
    }
  }
  // stencilled bay numbers on the outer plates
  ctx.save();
  ctx.font = `30px ${BLOCK}`;
  ctx.fillStyle = rgba('#d8e0f0', 0.28);
  ctx.textAlign = 'center';
  ctx.fillText('LAB 7', 262, 160);
  ctx.fillText('LAB 7', 1658, 160);
  ctx.restore();
  // the printed shade: dark under the soffit, deepening to the right and the ends, lifting round the lab's lights
  const lights: [number, number, number, number][] = [
    [DL.vats[0].x, 430, 300, 0.36],
    [DL.vats[1].x, 430, 300, 0.36],
    [DL.vault.x, DL.vault.y + 150, 300, 0.06],
    [DL.coils[0].x, DL.coils[0].y + 40, 170, 0.17],
    [DL.coils[1].x, DL.coils[1].y + 40, 170, 0.17],
  ];
  // (the light falls off from each of the lab's lights: the dots close up into a solid shade away from them)
  const lit = (x: number, y: number) => {
    let l = 0;
    for (const [lx, ly, lr, k] of lights) l += k * Math.exp(-((x - lx) ** 2 + (y - ly) ** 2) / (lr * lr));
    return l;
  };
  dots(ctx, { x: 0, y: y0, w: W, h: y1 - y0 }, (x, y) => 0.64 + 0.4 * (1 - smooth(y0, y0 + 190, y)) + 0.16 * smooth(500, W, x) + 0.08 * smooth(500, y1, y) - 2.1 * lit(x, y), SHADE, { step: 8, angle: 0.79, a: 0.92 });
  // the deepest shade: under the gantry and in the far corners, a solid ink-dark wash and a coarse black screen
  const top = ctx.createLinearGradient(0, y0, 0, y0 + 220);
  top.addColorStop(0, 'rgba(6,4,18,0.8)');
  top.addColorStop(1, 'rgba(6,4,18,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, y0, W, 220);
  for (const cx of [0, W]) {
    const cg = ctx.createRadialGradient(cx, y0, 20, cx, y0, 520);
    cg.addColorStop(0, 'rgba(6,4,18,0.75)');
    cg.addColorStop(1, 'rgba(6,4,18,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(cx ? W - 520 : 0, y0, 520, 520);
  }
  dots(ctx, { x: 0, y: y0, w: W, h: y1 - y0 }, (x, y) => 0.55 * (1 - smooth(y0 + 20, y0 + 170, y)) + 0.4 * (1 - smooth(0, 260, Math.min(x, W - x))) * (1 - smooth(y0, y0 + 420, y)) - 1.2 * lit(x, y), '#04020c', { step: 6, angle: 0.26, a: 0.9 });
  // the lab's coloured lights thrown across the wall
  for (const v of DL.vats) {
    glowAt(ctx, v.x, 420, 520, v.col, 0.3, 0.95);
    glowAt(ctx, v.x, 430, 230, v.col, 0.3, 1.4);
  }
  for (const c of DL.coils) glowAt(ctx, c.x, c.y, 220, CYAN, 0.2);
  // the vault's seal leaks the green of what's inside
  glowAt(ctx, DL.vault.x, DL.vault.y, DL.vault.hous + 90, VGREEN, 0.16);
  // the wall's foot: a kick plate in hazard stripes, the crevice where it meets the deck
  const kick = rectPath(-10, y1 - 26, W + 20, 26);
  hazardIn(ctx, kick, { x: 0, y: y1 - 26, w: W, h: 26 }, 18);
  within(ctx, kick, () => dots(ctx, { x: 0, y: y1 - 26, w: W, h: 26 }, (x) => 0.25 + 0.4 * smooth(500, W, x), SHADE, { step: 5, angle: 0.79, a: 0.7 }));
  ink(ctx, kick, 2.4, INK, 0.5);
  crevice(ctx, 0, W, y1, -30, 0.35, '#0a0618');
}

/** An I-beam pilaster: its flange face lit on the left, the web's edge in shade, bolted, a hazard band at its foot. */
function pilaster(ctx: Ctx, x: number): void {
  const y0 = DL.ceil + 10;
  const y1 = DL.floor;
  const w = 58;
  castShadow(ctx, rectPath(x - w / 2, y0, w, y1 - y0), 16, 14, 0.45, '#08041a');
  const web = rectPath(x + w / 2 - 2, y0, 12, y1 - y0);
  flat(ctx, web, STEEL_DK, 0, INK);
  ink(ctx, web, 2, INK, 0);
  const face = rectPath(x - w / 2, y0, w, y1 - y0);
  flat(ctx, face, '#56648c', 0, INK);
  within(ctx, face, () => {
    ctx.fillStyle = rgba('#c8d4f0', 0.6);
    ctx.fillRect(x - w / 2, y0, 7, y1 - y0);
    dots(ctx, { x: x - w / 2, y: y0, w, h: y1 - y0 }, (xx, yy) => 0.15 + 0.5 * smooth(x - w / 2, x + w / 2, xx) + 0.3 * (1 - smooth(y0, y0 + 120, yy)), SHADE, { step: 5, angle: 0.79 });
    for (let yy = y0 + 20; yy < y1 - 40; yy += 34) {
      rivet(ctx, x - w / 2 + 12, yy, 2.4);
      rivet(ctx, x + w / 2 - 12, yy, 2.4);
    }
  });
  const band = rectPath(x - w / 2, y1 - 70, w, 44);
  hazardIn(ctx, band, { x: x - w / 2, y: y1 - 70, w, h: 44 }, 10, 0.8);
  ink(ctx, band, 2, INK, 0);
  ink(ctx, face, 3, INK, 0.8);
  // its capital under the soffit beam
  const cap = rectPath(x - w / 2 - 10, y0 - 4, w + 20, 16);
  flat(ctx, cap, '#7a8ab0', 2.4, INK, 0.6);
  within(ctx, cap, () => dots(ctx, { x: x - w / 2 - 10, y: y0 - 4, w: w + 20, h: 16 }, linTone(x - w / 2, 0, x + w, 0, 0.1, 0.7), SHADE, { step: 4, angle: 0.79 }));
}

/** A red alarm beacon on its wall bracket (the dome painted at rest: the live frames turn its reflector). */
function beaconMount(ctx: Ctx, x: number, y: number): void {
  // the wall plate and the bracket arm, a conduit down the wall
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 40);
  ctx.lineTo(x + 4, DL.floor - 30);
  ctx.stroke();
  ctx.strokeStyle = '#5a6488';
  ctx.lineWidth = 4;
  ctx.stroke();
  const plate = rrPath(x - 24, y + 30, 56, 34, 4);
  castShadow(ctx, plate, 8, 6, 0.5, '#08041a');
  flat(ctx, plate, '#6a7898', 2.2, INK, 0.6);
  within(ctx, plate, () => dots(ctx, { x: x - 24, y: y + 30, w: 56, h: 34 }, linTone(x - 20, y + 30, x + 30, y + 64, 0, 0.7), SHADE, { step: 4, angle: 0.79 }));
  for (const dx of [-16, 24]) rivet(ctx, x + dx, y + 47, 2.2);
  const base = rectPath(x - 22, y + 14, 44, 18);
  flat(ctx, base, '#2a2e44', 2.4, INK, 0.5);
  within(ctx, base, () => {
    ctx.fillStyle = rgba('#8a94b8', 0.6);
    ctx.fillRect(x - 22, y + 14, 44, 3);
  });
  beaconDome(ctx, x, y, 0.15);
}

const DOME = { r: 24, h: 30 };

/** The beacon's dome at a turn of its reflector (0…1): red glass with the bright lobe of the mirror inside, a wire cage. */
function beaconDome(ctx: Ctx, x: number, y: number, ph: number, lit = 1): void {
  const { r, h } = DOME;
  const dome: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - r, y + 14);
    c.lineTo(x - r, y + 14 - h * 0.45);
    c.bezierCurveTo(x - r, y + 14 - h * 1.15, x + r, y + 14 - h * 1.15, x + r, y + 14 - h * 0.45);
    c.lineTo(x + r, y + 14);
    c.closePath();
  };
  flat(ctx, dome, lit > 0.5 ? '#d8261e' : '#8a1a1a', 0, INK);
  within(ctx, dome, () => {
    // the reflector's lobe: where the mirror faces, the glass blazes
    const a = ph * P2;
    const fx = Math.sin(a);
    const face = Math.cos(a);
    const lx = x + fx * r * 0.75;
    const lw = r * (0.35 + 0.75 * Math.max(0, face));
    const k = (0.4 + 0.6 * Math.max(0, face)) * lit;
    ctx.fillStyle = rgba('#ff7a4a', 0.85 * k);
    ctx.beginPath();
    ctx.ellipse(lx, y + 2, lw * 1.25, h * 0.75, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#ffd890', 0.95 * k);
    ctx.beginPath();
    ctx.ellipse(lx, y + 2, lw * 0.65, h * 0.45, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.9 * k * Math.max(0, face));
    ctx.beginPath();
    ctx.ellipse(lx, y + 2, lw * 0.3, h * 0.24, 0, 0, P2);
    ctx.fill();
    // the glass's shade in dots on the side away from the lobe
    dots(ctx, { x: x - r, y: y - h, w: r * 2, h: h + 16 }, (xx) => 0.65 * Math.min(1, Math.abs(xx - lx) / (r * 1.4)), '#4a0606', { step: 3.5, angle: 0.79 });
    // the fresnel ribs and a white glint top left
    ctx.strokeStyle = rgba('#5a0a0a', 0.6);
    ctx.lineWidth = 1.2;
    for (let yy = y + 10; yy > y - h; yy -= 6) {
      ctx.beginPath();
      ctx.moveTo(x - r, yy);
      ctx.lineTo(x + r, yy);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.45, y - h * 0.5, 3, 7, 0.4, 0, P2);
    ctx.fill();
  });
  ink(ctx, dome, 2.6, INK, 0.5);
  // the wire cage
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (const dx of [-0.55, 0, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * r, y + 14);
    ctx.quadraticCurveTo(x + dx * r * 1.3, y + 14 - h * 1.05, x, y + 14 - h * 0.86);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(x, y + 14 - h * 0.4, r + 1, 4, 0, 0, Math.PI);
  ctx.stroke();
}

/** The vault: its housing ringed with lock bolts and the hazard band, the armoured door, the wheel, the emblem. */
function vault(ctx: Ctx): void {
  const { x, y, r, hous } = DL.vault;
  // the threshold: two steps down to the deck
  const s1 = polyPath([[x - 214, DL.floor - 44], [x + 214, DL.floor - 44], [x + 232, DL.floor - 22], [x - 232, DL.floor - 22]]);
  const s1f = rectPath(x - 232, DL.floor - 22, 464, 10);
  const s2 = polyPath([[x - 250, DL.floor - 12], [x + 250, DL.floor - 12], [x + 270, DL.floor + 6], [x - 270, DL.floor + 6]]);
  // the pedestal the housing sits on, down to the steps
  const ped = polyPath([[x - 150, y + hous - 60], [x + 150, y + hous - 60], [x + 200, DL.floor - 44], [x - 200, DL.floor - 44]]);
  castShadow(ctx, ped, 14, 14, 0.5, '#06021a');
  flat(ctx, ped, '#3a4670', 0, INK);
  within(ctx, ped, () => {
    ctx.fillStyle = rgba(STEEL_LIT, 0.5);
    ctx.fillRect(x - 200, y + hous - 60, 400, 3);
    dots(ctx, { x: x - 200, y: y + hous - 60, w: 400, h: 120 }, (xx) => 0.25 + 0.5 * smooth(x - 160, x + 200, xx), SHADE, { step: 4, angle: 0.79 });
    for (let k = -3; k <= 3; k++) rivet(ctx, x + k * 52, DL.floor - 54, 2.4);
  });
  ink(ctx, ped, 3, INK, 0.7);
  // the housing's shadow on the wall
  castShadow(ctx, ellPath(x, y, hous + 6, hous + 6), 22, 30, 0.6, '#06021a');
  // the housing: a thick riveted ring
  const housing = ellPath(x, y, hous, hous);
  flat(ctx, housing, '#46547a', 0, INK);
  within(ctx, housing, () => {
    dots(ctx, { x: x - hous, y: y - hous, w: hous * 2, h: hous * 2 }, linTone(x - hous * 0.6, y - hous * 0.6, x + hous * 0.7, y + hous * 0.7, 0.05, 0.75), SHADE, { step: 5, angle: 0.79 });
    // the lit rim on its upper left
    ctx.strokeStyle = rgba('#d0dcff', 0.7);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, hous - 4, Math.PI * 0.95, Math.PI * 1.6);
    ctx.stroke();
  });
  ink(ctx, housing, 4, INK, 0.9);
  // lock bolts round the housing: hydraulic blocks
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * P2 + P2 / 24;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const cx = x + ca * (hous - 14);
    const cy = y + sa * (hous - 14);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    const blk = rectPath(-12, -11, 24, 22);
    const lit = Math.max(0, -(ca * 0.7 + sa * 0.7));
    flat(ctx, blk, mix('#4a587e', '#a8b8dc', lit), 2.2, INK, 0.4);
    ctx.restore();
    rivet(ctx, cx, cy, 3, '#b8c4e0');
  }
  // the hazard band
  const band: PathFn = (c) => {
    c.beginPath();
    c.arc(x, y, r + 16, 0, P2);
    c.moveTo(x + r + 2, y);
    c.arc(x, y, r + 2, 0, P2, true);
  };
  within(ctx, band, () => {
    ctx.fillStyle = '#b8902c';
    ctx.fillRect(x - r - 20, y - r - 20, r * 2 + 40, r * 2 + 40);
    ctx.fillStyle = INK;
    for (let k = 0; k < 36; k++) {
      const a0 = (k / 36) * P2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a0) * (r + 2), y + Math.sin(a0) * (r + 2));
      ctx.lineTo(x + Math.cos(a0 + 0.06) * (r + 18), y + Math.sin(a0 + 0.06) * (r + 18));
      ctx.lineTo(x + Math.cos(a0 + 0.06 + P2 / 72) * (r + 18), y + Math.sin(a0 + 0.06 + P2 / 72) * (r + 18));
      ctx.lineTo(x + Math.cos(a0 + P2 / 72) * (r + 2), y + Math.sin(a0 + P2 / 72) * (r + 2));
      ctx.closePath();
      ctx.fill();
    }
    dots(ctx, { x: x - r - 20, y: y - r - 20, w: r * 2 + 40, h: r * 2 + 40 }, linTone(x - r * 0.5, y - r * 0.5, x + r, y + r, 0.35, 0.9), '#1a0c06', { step: 4, angle: 0 });
  });
  ink(ctx, ellPath(x, y, r + 17, r + 17), 2.6, INK, 0);
  // the door: armoured steel, concentric grooves, lit upper left
  const door = ellPath(x, y, r, r);
  flat(ctx, door, '#4e5c88', 0, INK);
  within(ctx, door, () => {
    for (const [rr, a] of [[r * 0.86, 0.6], [r * 0.7, 0.45], [r * 0.4, 0.55]] as const) {
      ctx.strokeStyle = rgba(INK, a);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, P2);
      ctx.stroke();
      ctx.strokeStyle = rgba('#d0dcff', 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, rr, Math.PI * 0.05, Math.PI * 0.55);
      ctx.stroke();
    }
    dots(ctx, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, (xx, yy) => 0.14 + 0.8 * smooth(-0.7, 1, ((xx - x) + (yy - y)) / (r * 1.4)), SHADE, { step: 5, angle: 0.79 });
    // a long specular streak across the upper left of the plate
    ctx.fillStyle = rgba('#ffffff', 0.35);
    ctx.beginPath();
    ctx.ellipse(x - r * 0.48, y - r * 0.5, r * 0.36, r * 0.07, -0.78, 0, P2);
    ctx.fill();
    // rivets on the outer groove
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * P2;
      rivet(ctx, x + Math.cos(a) * r * 0.93, y + Math.sin(a) * r * 0.93, 3);
    }
  });
  ink(ctx, door, 4, INK, 0.8);
  // the upper vault sits behind the hovering feet: its values pulled down there (the light stays on its lower half)
  within(ctx, ellPath(x, y, hous + 2, hous + 2), () => {
    const g = ctx.createLinearGradient(0, y - hous, 0, y + 30);
    g.addColorStop(0, 'rgba(8,6,24,0.5)');
    g.addColorStop(1, 'rgba(8,6,24,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - hous, y - hous, hous * 2, hous + 30);
  });
  // the seal leaks the green of what's inside along the door's lower rim
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(61,255,122,0.35)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, r + 1, Math.PI * 0.05, Math.PI * 0.95);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200,255,220,0.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
  // the emblem in the hub: the green boot, stamped in a recessed disc
  const hub = ellPath(x, y, r * 0.38, r * 0.38);
  flat(ctx, hub, '#1a2236', 3, INK, 0);
  within(ctx, hub, () => {
    glowAt(ctx, x, y, r * 0.42, VGREEN, 0.18);
    dots(ctx, { x: x - r * 0.4, y: y - r * 0.4, w: r * 0.8, h: r * 0.8 }, radTone(x - 18, y - 18, r * 0.5, 0.2, 0.8), '#000000', { step: 4, angle: 0.79 });
  });
  bootEmblem(ctx, x, y + 4, 1);
  // the wheel: a rim with six spokes on a hub over the emblem
  ctx.save();
  ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * P2 + 0.26;
    const x0 = x + Math.cos(a) * r * 0.4;
    const y0 = y + Math.sin(a) * r * 0.4;
    const x1 = x + Math.cos(a) * r * 0.66;
    const y1 = y + Math.sin(a) * r * 0.66;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = mix('#5a6a90', '#c8d4f0', Math.max(0, -(Math.cos(a) + Math.sin(a)) * 0.5 + 0.4));
    ctx.lineWidth = 10;
    ctx.stroke();
    copperBall(ctx, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, 9);
  }
  ctx.restore();
  const rim: PathFn = (c) => {
    c.beginPath();
    c.arc(x, y, r * 0.42, 0, P2);
    c.moveTo(x + r * 0.36, y);
    c.arc(x, y, r * 0.36, 0, P2, true);
  };
  flat(ctx, rim, '#a8b6d8', 0, INK);
  within(ctx, rim, () => dots(ctx, { x: x - r * 0.42, y: y - r * 0.42, w: r * 0.84, h: r * 0.84 }, linTone(x - 30, y - 30, x + 60, y + 60, 0, 0.85), SHADE, { step: 3.5, angle: 0.79 }));
  ink(ctx, ellPath(x, y, r * 0.42, r * 0.42), 2.6, INK, 0.5);
  ink(ctx, ellPath(x, y, r * 0.36, r * 0.36), 2, INK, 0);
  // the electrode horns on the housing's shoulders: insulator arms, copper balls
  for (const [i, h] of DL.horns.entries()) {
    const side = i ? 1 : -1;
    const bx = x + side * (hous - 6);
    const by = h.y - 6;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(h.x - side * 8, h.y);
    ctx.stroke();
    ctx.strokeStyle = '#e8e0d0';
    ctx.lineWidth = 7;
    ctx.stroke();
    // the insulator's discs
    for (let k = 1; k <= 3; k++) {
      const u = k / 4;
      const ix = bx + (h.x - side * 8 - bx) * u;
      const iy = by + (h.y - by) * u;
      flat(ctx, ellPath(ix, iy, 4, 10), '#f0e8d8', 1.8, INK, 0);
    }
    copperBall(ctx, h.x, h.y, 13);
  }
  // the steps down to the deck
  castShadow(ctx, s1, 6, 8, 0.4, '#06021a');
  flat(ctx, s2, '#5a6a90', 0, INK);
  within(ctx, s2, () => dots(ctx, { x: x - 270, y: DL.floor - 12, w: 540, h: 18 }, (xx) => 0.2 + 0.4 * smooth(x - 200, x + 270, xx), SHADE, { step: 4, angle: 0.79 }));
  ink(ctx, s2, 2.4, INK, 0.5);
  flat(ctx, s1f, '#3a466a', 0, INK);
  hazardIn(ctx, s1f, { x: x - 232, y: DL.floor - 22, w: 464, h: 10 }, 9);
  ink(ctx, s1f, 2, INK, 0.4);
  flat(ctx, s1, '#7a8ab2', 0, INK);
  within(ctx, s1, () => {
    dots(ctx, { x: x - 232, y: DL.floor - 44, w: 464, h: 22 }, (xx) => 0.1 + 0.45 * smooth(x - 150, x + 232, xx), SHADE, { step: 4, angle: 0.79 });
    lightPool(ctx, x, DL.floor - 36, 160, 14, VGREEN, 0.18);
  });
  ink(ctx, s1, 2.4, INK, 0.5);
}

/** The villain's emblem: a stomping boot in green, inked, a cracked pizza under its sole. */
function bootEmblem(ctx: Ctx, x: number, y: number, s: number): void {
  const boot = polyPath([
    [x - 26 * s, y - 40 * s], [x + 10 * s, y - 40 * s], [x + 12 * s, y - 8 * s], [x + 36 * s, y - 2 * s], [x + 42 * s, y + 10 * s], [x + 40 * s, y + 18 * s], [x - 30 * s, y + 18 * s], [x - 30 * s, y - 4 * s],
  ]);
  flat(ctx, boot, EMB, 2.6 * s, INK, 0.5);
  within(ctx, boot, () => {
    dots(ctx, { x: x - 30 * s, y: y - 40 * s, w: 74 * s, h: 60 * s }, linTone(x - 10 * s, y - 20 * s, x + 40 * s, y + 18 * s, 0, 0.7), '#0a5a2a', { step: 3 * s, angle: 0.79 });
    ctx.fillStyle = '#d8ffe4';
    ctx.fillRect(x - 24 * s, y - 38 * s, 6 * s, 30 * s);
    ctx.fillStyle = INK;
    ctx.fillRect(x - 30 * s, y + 10 * s, 72 * s, 3 * s);
  });
  // the pizza under the sole, cracked
  ctx.strokeStyle = EMB;
  ctx.lineWidth = 4 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x + 4 * s, y + 62 * s, 46 * s, Math.PI * 1.16, Math.PI * 1.84);
  ctx.stroke();
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.moveTo(x - 30 * s, y + 24 * s);
  ctx.lineTo(x - 36 * s, y + 32 * s);
  ctx.moveTo(x + 38 * s, y + 24 * s);
  ctx.lineTo(x + 46 * s, y + 30 * s);
  ctx.stroke();
}

/** A CRT monitor on its wall arm (screen dark: the live frames, or the still's frame, go in it). */
const MON = { w: 140, h: 100, sw: 112, sh: 76 };

function monitor(ctx: Ctx, x: number, y: number, side: number, kind: 'scope' | 'radar'): void {
  // the arm to the wall, behind the set, towards the outside
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(x - side * 30, y + 40);
  ctx.lineTo(x - side * 70, y + 70);
  ctx.lineTo(x - side * 70, y + 110);
  ctx.stroke();
  ctx.strokeStyle = '#6a7898';
  ctx.lineWidth = 6;
  ctx.stroke();
  flat(ctx, rrPath(x - side * 70 - 14, y + 104, 28, 16, 3), '#5a6688', 2, INK, 0.4);
  const box = rrPath(x - MON.w / 2, y - MON.h / 2, MON.w, MON.h, 12);
  castShadow(ctx, box, 14, 12, 0.55, '#06021a');
  flat(ctx, box, '#a89c84', 0, INK);
  within(ctx, box, () => {
    dots(ctx, { x: x - MON.w / 2, y: y - MON.h / 2, w: MON.w, h: MON.h }, linTone(x - 40, y - 40, x + 70, y + 50, 0, 0.75), '#4a3a2a', { step: 4, angle: 0.79 });
    ctx.fillStyle = rgba('#fff8e8', 0.7);
    ctx.fillRect(x - MON.w / 2, y - MON.h / 2, MON.w, 4);
    // knobs under the screen's right
    for (const dx of [44, 58]) flat(ctx, ellPath(x + dx, y + 40, 4.5, 4.5), '#3a3028', 1.4, INK, 0);
  });
  ink(ctx, box, 3, INK, 0.7);
  const scr = rrPath(x - MON.sw / 2 - 8, y - MON.sh / 2 - 6, MON.sw, MON.sh, 14);
  flat(ctx, scr, '#06180e', 2.6, INK, 0);
  // the still's screen (the live frames go over it)
  ctx.save();
  ctx.translate(x - MON.sw / 2 - 8, y - MON.sh / 2 - 6);
  scopeFrame(ctx, 0.3, 0, kind);
  ctx.restore();
  ink(ctx, scr, 2.6, INK, 0);
}

/** The catwalk across the top of the bay: a steel deck on trusses in front of the bulkhead, its railing above. It sits
 * in the shade under the soffit (dark, a few edges lit), so it frames the bay without drawing the eye. */
const GANTRY = { y: 112, d: 16 };

function gantry(ctx: Ctx): void {
  const { y, d } = GANTRY;
  const truss = y + d + 22;
  // its shadow on the bulkhead below
  castShadow(ctx, rectPath(-10, y - 4, W + 20, truss - y + 4), 22, 20, 0.6, '#04020e');
  // the truss under the deck: chords and diagonals
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-10, truss);
  ctx.lineTo(W + 10, truss);
  for (let x = -20; x < W + 40; x += 48) {
    ctx.moveTo(x, y + d);
    ctx.lineTo(x + 24, truss);
    ctx.lineTo(x + 48, y + d);
  }
  ctx.stroke();
  ctx.strokeStyle = '#2a3054';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = rgba(STEEL_LIT, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, truss - 1.5);
  ctx.lineTo(W + 10, truss - 1.5);
  ctx.stroke();
  // the railing: posts and two rails, dark against the soffit
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let x = 40; x < W; x += 120) {
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 44);
  }
  ctx.moveTo(-10, y - 44);
  ctx.lineTo(W + 10, y - 44);
  ctx.moveTo(-10, y - 22);
  ctx.lineTo(W + 10, y - 22);
  ctx.stroke();
  ctx.strokeStyle = '#3a4470';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.strokeStyle = rgba(STEEL_LIT, 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, y - 45.5);
  ctx.lineTo(W + 10, y - 45.5);
  ctx.stroke();
  // the deck: a grating's lit edge on top, the face in shade
  const face = rectPath(-10, y, W + 20, d);
  flat(ctx, face, '#262c4e', 0, INK);
  within(ctx, face, () => {
    ctx.fillStyle = rgba(STEEL_LIT, 0.7);
    ctx.fillRect(-10, y, W + 20, 3);
    ctx.fillStyle = rgba('#000000', 0.35);
    for (let x = 0; x < W; x += 8) ctx.fillRect(x, y + 5, 3, d - 7);
    dots(ctx, { x: 0, y, w: W, h: d }, linTone(0, y, 0, y + d, 0.2, 0.8), '#04020c', { step: 4, angle: 0.79 });
  });
  ink(ctx, face, 2.6, INK, 0.6);
  // the lab's lights catch its underside over the vats and coils
  for (const v of DL.vats) lightPool(ctx, v.x, truss, 160, 10, v.col, 0.35);
  for (const c of DL.coils) lightPool(ctx, c.x, truss, 90, 6, CYAN, 0.2);
}

/** The bulkhead's machinery: pilasters, beacons, monitors, the vault, cables, signs, the knife switch. */
function wall(ctx: Ctx, r: R): void {
  ceiling(ctx, r);
  bulkhead(ctx, r);
  for (const x of DL.pilasters) pilaster(ctx, x);
  // the vats' feed pipes from the ceiling pipe down to their caps
  for (const v of DL.vats) {
    for (const dx of [-38, 38]) {
      const px = v.x + dx;
      const p = rectPath(px - 9, 70, 18, DL.vat.cap - 60);
      flat(ctx, p, '#a8482e', 0, INK);
      within(ctx, p, () => {
        ctx.fillStyle = rgba('#ffb090', 0.55);
        ctx.fillRect(px - 7, 70, 4, DL.vat.cap);
        dots(ctx, { x: px - 9, y: 70, w: 18, h: DL.vat.cap }, linTone(px - 6, 0, px + 9, 0, 0, 0.85), '#3a0808', { step: 3.5, angle: 0.79 });
      });
      ink(ctx, p, 2.4, INK, 0.6);
      flat(ctx, rectPath(px - 12, 150, 24, 10), '#c86a4a', 2, INK, 0.4);
    }
  }
  vault(ctx);
  // the gantry crosses in front of the vault's crown
  gantry(ctx);
  // cables drooping from the gantry's truss to the vault's housing, off to the sides of it
  ctx.lineCap = 'round';
  const V = DL.vault;
  const onHousing = (dx: number) => V.y - Math.sqrt(V.hous ** 2 - dx * dx) + 10;
  for (const [x0, dx1, sag, w] of [[600, -196, 90, 9], [1320, 196, 90, 9], [520, -214, 140, 6]] as const) {
    const x1 = V.x + dx1;
    const y0 = GANTRY.y + GANTRY.d + 20;
    const y1 = onHousing(dx1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w + 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag * 0.5, x1, y1);
    ctx.stroke();
    ctx.strokeStyle = '#3a3a52';
    ctx.lineWidth = w - 2;
    ctx.stroke();
    ctx.strokeStyle = rgba('#a0a8d0', 0.5);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0 - 2, y0 - 1);
    ctx.quadraticCurveTo((x0 + x1) / 2 - 2, Math.max(y0, y1) + sag * 0.5 - 3, x1 - 2, y1 - 2);
    ctx.stroke();
    // the clamp where it enters the housing
    flat(ctx, rrPath(x1 - 7, y1 - 6, 14, 12, 3), '#5a6488', 2, INK, 0.4);
  }
  DL.monitors.forEach((m, i) => monitor(ctx, m.x, m.y, i ? 1 : -1, i ? 'radar' : 'scope'));
  for (const b of DL.beacons) beaconMount(ctx, b.x, b.y);
  dangerSign(ctx, DL.pilasters[0], 270);
  knifeSwitch(ctx, DL.knife.x, DL.knife.y);
  // gauges on the plates beside the vats
  gauge(ctx, 96, 400, 22, 0.3);
  gauge(ctx, 1824, 400, 22, 0.8);
}

function gauge(ctx: Ctx, x: number, y: number, r: number, v: number): void {
  castShadow(ctx, ellPath(x, y, r + 4, r + 4), 6, 6, 0.5, '#06021a');
  flat(ctx, ellPath(x, y, r + 4, r + 4), '#b8a070', 2.4, INK, 0.5);
  flat(ctx, ellPath(x, y, r, r), '#f4ecd8', 2, INK, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * 0.8 + (k / 8) * Math.PI * 1.4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
    ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
    ctx.stroke();
  }
  ctx.strokeStyle = '#d8322e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, Math.PI * 1.9, Math.PI * 2.2);
  ctx.stroke();
  const a = Math.PI * 0.8 + v * Math.PI * 1.4;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8);
  ctx.stroke();
  rivet(ctx, x, y, 2.4, '#d8322e');
  within(ctx, ellPath(x, y, r, r), () => dots(ctx, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, linTone(x, y, x + r, y + r, 0, 0.5), '#6a5a3a', { step: 3, angle: 0.79 }));
}

/** A HIGH VOLTAGE plate on the left pilaster. */
function dangerSign(ctx: Ctx, x: number, y: number): void {
  const p = rrPath(x - 24, y - 34, 48, 68, 4);
  castShadow(ctx, p, 6, 5, 0.5, '#06021a');
  flat(ctx, p, HAZ, 2.4, INK, 0.5);
  flat(ctx, polyPath([[x + 6, y - 26], [x - 12, y + 4], [x, y + 4], [x - 8, y + 28], [x + 14, y - 6], [x + 2, y - 6], [x + 10, y - 26]]), INK, 0, INK);
  within(ctx, p, () => dots(ctx, { x: x - 24, y: y - 34, w: 48, h: 68 }, linTone(x - 10, y - 20, x + 24, y + 34, 0, 0.6), '#7a4a08', { step: 3.5, angle: 0 }));
  for (const [dx, dy] of [[-18, -28], [18, -28], [-18, 28], [18, 28]] as const) rivet(ctx, x + dx, y + dy, 1.8, '#c8c0a0');
}

/** The MASTER POWER knife switch on its slate panel. */
const KNIFE = { w: 64, h: 112 };

function knifeSwitch(ctx: Ctx, x: number, y: number): void {
  const p = rrPath(x - KNIFE.w / 2, y - KNIFE.h / 2, KNIFE.w, KNIFE.h, 5);
  castShadow(ctx, p, 10, 8, 0.55, '#06021a');
  flat(ctx, p, '#2a2c38', 2.6, INK, 0.6);
  within(ctx, p, () => {
    ctx.fillStyle = rgba('#8890b0', 0.5);
    ctx.fillRect(x - KNIFE.w / 2, y - KNIFE.h / 2, 3, KNIFE.h);
    dots(ctx, { x: x - KNIFE.w / 2, y: y - KNIFE.h / 2, w: KNIFE.w, h: KNIFE.h }, linTone(x - 20, y - 50, x + 32, y + 56, 0, 0.6), '#000000', { step: 4, angle: 0.79 });
  });
  ctx.save();
  ctx.font = `11px ${BLOCK}`;
  ctx.fillStyle = HAZ;
  ctx.textAlign = 'center';
  ctx.fillText('MASTER', x, y - KNIFE.h / 2 + 15);
  ctx.fillText('POWER', x, y - KNIFE.h / 2 + 27);
  ctx.restore();
  // the jaws at the top, the hinge at the bottom, the blades thrown up into the jaws, the handle bar across
  for (const dx of [-12, 12]) {
    flat(ctx, rectPath(x + dx - 5, y - 26, 10, 14), COPPER, 1.8, INK, 0);
    flat(ctx, rectPath(x + dx - 5, y + 30, 10, 12), COPPER, 1.8, INK, 0);
    flat(ctx, rectPath(x + dx - 3, y - 22, 6, 58), '#f0a860', 1.8, INK, 0.4);
  }
  flat(ctx, rrPath(x - 22, y - 30, 44, 10, 4), '#1a1a22', 2, INK, 0);
  flat(ctx, rrPath(x - 8, y - 46, 16, 20, 5), '#d8322e', 2, INK, 0.4);
}

// ——— the deck ———

const DECK_BOX = { x: 0, y: DL.floor - 2, w: W, h: DL.lip + 6 - (DL.floor - 2) };

function deck(ctx: Ctx, r: R): void {
  const y0 = DL.floor;
  const y1 = DL.lip + 4;
  const p = rectPath(0, y0, W, y1 - y0);
  vfill(ctx, 0, y0, W, y1 - y0, [[0, '#1e2440'], [1, '#343e64']]);
  within(ctx, p, () => {
    // the deck plates' joints running to the eye, a joint across
    const at = (x: number, y: number) => 960 + (x - 960) * ((y - 300) / (y1 - 300));
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let fx = -800; fx < W + 800; fx += 260) {
      ctx.moveTo(at(fx, y0), y0);
      ctx.lineTo(fx, y1);
    }
    ctx.moveTo(0, 648);
    ctx.lineTo(W, 648);
    ctx.stroke();
    // the tread: diamond lugs printed as short dashes
    ctx.strokeStyle = rgba('#8a98c8', 0.35);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let y = y0 + 6; y < y1; y += 9) {
      const s = 0.5 + (y - y0) / (y1 - y0);
      for (let x = ((y / 9) % 2) * 9; x < W; x += 18 * s) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + 5 * s, y - 2 * s);
      }
    }
    ctx.stroke();
    // the lab's light on the deck, the shade printed between
    for (const v of DL.vats) lightPool(ctx, v.x, 650, 260, 40, v.col, 0.28);
    for (const c of DL.coils) lightPool(ctx, c.x, DL.coilFoot, 140, 22, CYAN, 0.16);
    lightPool(ctx, DL.vault.x, y0 + 14, 300, 30, VGREEN, 0.12);
    dots(ctx, { x: 0, y: y0, w: W, h: y1 - y0 }, (x, y) => {
      let t = 0.35 - 0.2 * smooth(y0, y1, y) + 0.2 * smooth(800, W, x);
      for (const v of DL.vats) t -= 0.3 * Math.exp(-(((x - v.x) / 220) ** 2));
      return t;
    }, SHADE, { step: 6, angle: 0.79, a: 0.8 });
    // grime in the corner at the wall's foot
    crevice(ctx, 0, W, y0, 20, 0.5, '#06021a');
  });
  // the power cables across the deck: from the vats' plinths and the coils' drums to the vault's steps
  ctx.lineCap = 'round';
  const cable = (pts: [number, number][], w: number) => {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i += 2) ctx.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    };
    ctx.strokeStyle = rgba('#06021a', 0.45);
    ctx.lineWidth = w + 6;
    ctx.save();
    ctx.translate(4, 4);
    path();
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = w + 3;
    path();
    ctx.stroke();
    ctx.strokeStyle = '#2e3048';
    ctx.lineWidth = w - 1;
    path();
    ctx.stroke();
    ctx.strokeStyle = rgba('#a8b4e0', 0.55);
    ctx.lineWidth = 1.6;
    ctx.save();
    ctx.translate(-1.5, -2);
    path();
    ctx.stroke();
    ctx.restore();
  };
  cable([[DL.vats[0].x + 90, 660], [480, 690], [640, 664], [760, 640], [DL.vault.x - 200, DL.floor - 2]], 10);
  cable([[DL.vats[1].x - 90, 660], [1440, 690], [1280, 664], [1160, 640], [DL.vault.x + 200, DL.floor - 2]], 10);
  cable([[DL.coils[0].x + 40, DL.coilFoot - 2], [620, 680], [700, 656]], 7);
  cable([[DL.coils[1].x - 40, DL.coilFoot - 2], [1300, 680], [1220, 656]], 7);
  // a drain grate under the left vat, bolts in the joints
  for (let i = 0; i < 10; i++) rivet(ctx, 120 + i * 190 + r() * 20, 648, 2.2, '#7a88b0');
}

// ——— the coils ———

const COIL_BOX = (i: number): Box => ({ x: DL.coils[i].x - 110, y: DL.coils[i].y - 40, w: 250, h: DL.coilFoot + 24 - (DL.coils[i].y - 40) });

function coil(ctx: Ctx, i: number): void {
  const { x, y } = DL.coils[i];
  const foot = DL.coilFoot;
  const T = DL.toroid;
  groundShadow(ctx, x + 10, foot, 90, 12, 0.6, '#06021a', 1.4);
  // the drum on the deck: a squat steel cylinder, the primary's flat spiral on its top
  const dTop = foot - 58;
  const drum: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 58, dTop);
    c.lineTo(x - 58, foot - 6);
    c.ellipse(x, foot - 6, 58, 12, 0, Math.PI, 0, true);
    c.lineTo(x + 58, dTop);
    c.closePath();
  };
  flat(ctx, drum, '#46507a', 0, INK);
  within(ctx, drum, () => {
    ctx.fillStyle = rgba('#b8c4ec', 0.55);
    ctx.fillRect(x - 54, dTop, 12, 60);
    dots(ctx, { x: x - 58, y: dTop, w: 116, h: 70 }, linTone(x - 30, 0, x + 58, 0, 0, 0.85), SHADE, { step: 4, angle: 0.79 });
    // a hazard band round it
    hazardIn(ctx, rectPath(x - 60, dTop + 16, 120, 14), { x: x - 60, y: dTop + 16, w: 120, h: 14 }, 8);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(x - 60, dTop + 16, 120, 14);
  });
  ink(ctx, drum, 3, INK, 0.7);
  flat(ctx, ellPath(x, dTop, 58, 12), '#7a88b2', 2.4, INK, 0.3);
  ctx.strokeStyle = COPPER;
  ctx.lineWidth = 2.6;
  for (let k = 1; k <= 3; k++) {
    ctx.beginPath();
    ctx.ellipse(x, dTop, 52 - k * 9, 10 - k * 1.7, 0, 0, P2);
    ctx.stroke();
  }
  // the secondary: an insulating tube close-wound in copper, a black end cap at each end
  const tTop = y + 14;
  const tw = 25;
  const tube = rectPath(x - tw, tTop, tw * 2, dTop - tTop);
  flat(ctx, tube, '#c0702e', 0, INK);
  within(ctx, tube, () => {
    ctx.strokeStyle = rgba('#5a2408', 0.75);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let yy = tTop + 3; yy < dTop; yy += 3.6) {
      ctx.moveTo(x - tw, yy);
      ctx.lineTo(x + tw, yy + 1.4);
    }
    ctx.stroke();
    ctx.fillStyle = rgba('#ffe0b0', 0.8);
    ctx.fillRect(x - 17, tTop, 6, dTop - tTop);
    ctx.fillStyle = rgba('#ffffff', 0.6);
    ctx.fillRect(x - 15, tTop, 2, dTop - tTop);
    dots(ctx, { x: x - tw, y: tTop, w: tw * 2, h: dTop - tTop }, linTone(x - 4, 0, x + tw, 0, 0, 0.95), '#3a1004', { step: 3.5, angle: 0.79 });
    // the vat's light on the face that turns to it
    const g = ctx.createLinearGradient(x - tw, 0, x + tw, 0);
    const vc = DL.vats[i].col;
    g.addColorStop(i ? 1 : 0, rgba(vc, 0.5));
    g.addColorStop(0.5, rgba(vc, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - tw, tTop, tw * 2, dTop - tTop);
  });
  ink(ctx, tube, 2.6, INK, 0.6);
  for (const [cy, ch] of [[tTop - 2, 14], [dTop - 14, 14]] as const) {
    const cap = rectPath(x - tw - 4, cy, tw * 2 + 8, ch);
    flat(ctx, cap, '#262838', 2.2, INK, 0.4);
    within(ctx, cap, () => {
      ctx.fillStyle = rgba('#9aa4c8', 0.7);
      ctx.fillRect(x - tw - 2, cy, 5, ch);
    });
  }
  // the toroid: a fat chrome ring seen a little from above. Chrome as a comic paints it: the room's light on its top,
  // a hard horizon across its bulge, the dark deck reflected under it, a bright line where it turns away
  const tor = ellPath(x, y, T.rx, T.ry);
  castShadow(ctx, tor, 10, 10, 0.45, '#06021a');
  flat(ctx, tor, '#262c50', 0, INK);
  within(ctx, tor, () => {
    // the upper surface
    ctx.fillStyle = '#c8d2ec';
    ctx.beginPath();
    ctx.ellipse(x, y - 5, T.rx - 2, T.ry - 4, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = '#f4f8ff';
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 8, T.rx - 12, T.ry - 9, 0, 0, P2);
    ctx.fill();
    // the horizon line on the front bulge and the deck's dark under it
    ctx.fillStyle = '#7484b4';
    ctx.beginPath();
    ctx.ellipse(x, y + 6, T.rx, T.ry * 0.55, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#1e2244';
    ctx.beginPath();
    ctx.ellipse(x, y + 9, T.rx - 3, T.ry * 0.5, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = rgba(CYAN, 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, T.rx - 4, T.ry - 3, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
    dots(ctx, { x: x - T.rx, y: y - T.ry, w: T.rx * 2, h: T.ry * 2 }, linTone(x, 0, x + T.rx, 0, 0, 0.75), SHADE, { step: 3.5, angle: 0.79 });
    // a white glint on the top left
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - 28, y - 10, 14, 3, -0.08, 0, P2);
    ctx.fill();
  });
  ink(ctx, tor, 3, INK, 0.7);
  // the hole through the ring, the tube's top cap showing in it
  const hole = ellPath(x, y - 6, T.rx * 0.4, T.ry * 0.3);
  flat(ctx, hole, '#0e1024', 2, INK, 0);
  within(ctx, hole, () => {
    ctx.fillStyle = rgba('#6a74a0', 0.7);
    ctx.fillRect(x - T.rx * 0.4, y - 4, T.rx * 0.8, 4);
  });
  glowAt(ctx, x, y, 70, CYAN, 0.2);
  // the top ball
  copperBall(ctx, x, y - T.ry - 4, 9);
}

// ——— the Jacob's ladder ———

const LAD = { w: 100, h: 280 };

function ladderBase(ctx: Ctx): void {
  const { x, foot, top } = DL.ladder;
  groundShadow(ctx, x + 8, foot, 46, 8, 0.65, '#06021a', 1.2);
  // the transformer box it stands on
  const box = rectPath(x - 30, foot - 40, 60, 40);
  flat(ctx, box, '#2a2c3c', 2.6, INK, 0.6);
  within(ctx, box, () => {
    ctx.fillStyle = rgba('#8890b0', 0.6);
    ctx.fillRect(x - 30, foot - 40, 60, 3);
    ctx.fillRect(x - 30, foot - 40, 3, 40);
    dots(ctx, { x: x - 30, y: foot - 40, w: 60, h: 40 }, linTone(x - 10, 0, x + 30, 0, 0, 0.8), '#000000', { step: 3.5, angle: 0.79 });
    hazardIn(ctx, rectPath(x - 30, foot - 16, 60, 9), { x: x - 30, y: foot - 16, w: 60, h: 9 }, 7);
    ctx.fillStyle = '#d8322e';
    ctx.beginPath();
    ctx.arc(x - 16, foot - 28, 3.4, 0, P2);
    ctx.fill();
  });
  // the insulator posts (ribbed porcelain) and the two copper rods opening into a V
  for (const side of [-1, 1]) {
    const px = x + side * 14;
    const post = rectPath(px - 6, foot - 66, 12, 28);
    flat(ctx, post, '#f0e8d8', 2, INK, 0.3);
    within(ctx, post, () => {
      ctx.fillStyle = rgba('#8a7a6a', 0.55);
      for (let yy = foot - 62; yy < foot - 40; yy += 6) ctx.fillRect(px - 6, yy, 12, 2);
      dots(ctx, { x: px - 6, y: foot - 66, w: 12, h: 28 }, linTone(px - 2, 0, px + 6, 0, 0, 0.7), '#5a4a3a', { step: 3, angle: 0.79 });
    });
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(px, foot - 66);
    ctx.quadraticCurveTo(x + side * 8, foot - 100, x + side * 34, top);
    ctx.stroke();
    ctx.strokeStyle = '#d8843c';
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,224,176,0.85)';
    ctx.lineWidth = 1.2;
    ctx.save();
    ctx.translate(-1, 0);
    ctx.stroke();
    ctx.restore();
    flat(ctx, ellPath(x + side * 34, top, 4, 4), COPPER, 1.6, INK, 0);
  }
}

/** The x of a ladder wire at height y (local frame: the wires' foot at the bottom centre). */
function ladderX(y: number, side: number): number {
  const { foot, top } = DL.ladder;
  // the same quadratic as the painted wire, solved for its x at y
  const p0 = [side * 14, foot - 66];
  const p1 = [side * 8, foot - 100];
  const p2 = [side * 34, top];
  // y(t) = (1-t)^2 p0 + 2t(1-t) p1 + t^2 p2: solve for t
  const a = p0[1] - 2 * p1[1] + p2[1];
  const b = 2 * (p1[1] - p0[1]);
  const c = p0[1] - y;
  const t = Math.abs(a) < 1e-6 ? -c / b : (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
  const tt = Math.max(0, Math.min(1, t > 1 || t < 0 ? (-b - Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a) : t));
  return (1 - tt) ** 2 * p0[0] + 2 * tt * (1 - tt) * p1[0] + tt * tt * p2[0];
}

/** One frame of the ladder's arc (phase 0…1 loops) in an LAD frame, its wires' foot at (w/2, h): the arc strikes low
 * where the wires are close, climbs on the heat, stretching and bowing up, and snaps at the top. */
function ladderFrame(c: Ctx, ph: number): void {
  const { w, h } = LAD;
  const { foot, top } = DL.ladder;
  const climb = 0.82;
  if (ph > climb + 0.06) return;
  const u = Math.min(1, ph / climb);
  const yy = foot - 80 - (foot - 80 - top - 6) * u ** 1.3;
  const xl = ladderX(yy, -1);
  const xr = ladderX(yy, 1);
  const r = rng(300 + Math.floor(ph * 64));
  const bow = 4 + 18 * u;
  const ox = w / 2;
  const oy = h - (foot - yy);
  const strokes = boltPath(r, ox + xl, oy, ox + xr, oy, 6, 0.18).map((s) => s.map(([px, py]) => [px, py - Math.sin(Math.PI * ((px - ox - xl) / Math.max(1, xr - xl))) * bow] as [number, number]));
  // as it breaks at the top: a flash, ragged, fading
  const brk = ph > climb ? 1 - (ph - climb) / 0.06 : 1;
  // the arc is rooted on both wires: two ribbons, each thick at its wire, meeting in the middle
  const main = strokes[0];
  const mid = Math.floor(main.length / 2);
  const left = [main.slice(0, mid + 1), ...strokes.slice(1)];
  const right = [main.slice(mid).reverse()];
  // thick where it strikes low, stretched to a filament as it climbs
  const wd = Math.max(2.2, 6.2 - u * 4);
  for (const glow of [true, false]) {
    c.save();
    c.globalAlpha = brk;
    if (glow) {
      c.shadowColor = 'rgba(180,230,255,0.95)';
      c.shadowBlur = 14;
    }
    bolt(c, left, wd, '#bdf0ff', '#ffffff', glow ? '#1a2a5a' : INK);
    bolt(c, right, wd, '#bdf0ff', '#ffffff', glow ? '#1a2a5a' : INK);
    c.restore();
  }
}

function ladderStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(DL.ladder.x - LAD.w / 2, DL.ladder.foot - LAD.h);
  ladderFrame(ctx, 0.45);
  ctx.restore();
}

// ——— the vats ———

const VB = (i: number) => DL.vats[i].x;
/** The liquid's frame: the glass's inside. */
const LIQ = { w: DL.vat.rx * 2, h: DL.vat.bottom - DL.vat.top };
const VAT_SLOT = (i: number): Box => ({ x: VB(i) - DL.vat.rx, y: DL.vat.top, w: LIQ.w, h: LIQ.h });
const VAT_BOX = (i: number): Box => ({ x: VB(i) - 140, y: DL.vat.cap - 70, w: 300, h: DL.vat.foot + 26 - (DL.vat.cap - 70) });

function vatBack(ctx: Ctx, i: number): void {
  const x = VB(i);
  const V = DL.vat;
  const v = DL.vats[i];
  // the key light throws the vat's shadow on the bulkhead behind it, and its foot on the deck
  castShadow(ctx, rectPath(x - V.rx - 20, V.cap - 16, (V.rx + 20) * 2, V.foot - 40 - V.cap), 34, 26, 0.32, '#06021a');
  groundShadow(ctx, x + 16, V.foot, 130, 16, 0.65, '#06021a', 1.4);
  // the plinth: a stepped steel base on the deck
  const pl = polyPath([[x - 104, V.bottom + 18], [x + 104, V.bottom + 18], [x + 112, V.foot], [x - 112, V.foot]]);
  flat(ctx, pl, '#4a5680', 0, INK);
  within(ctx, pl, () => {
    ctx.fillStyle = rgba('#b8c4ec', 0.6);
    ctx.fillRect(x - 112, V.bottom + 18, 18, V.foot);
    dots(ctx, { x: x - 112, y: V.bottom + 18, w: 224, h: V.foot - V.bottom }, linTone(x - 40, 0, x + 112, 0, 0.05, 0.85), SHADE, { step: 4, angle: 0.79 });
    hazardIn(ctx, rectPath(x - 120, V.foot - 22, 240, 12), { x: x - 120, y: V.foot - 22, w: 240, h: 12 }, 9);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(x - 120, V.foot - 22, 240, 12);
    // a hatch with a dial and a valve wheel on the plinth's front
    flat(ctx, rrPath(x - 30, V.bottom + 26, 60, 26, 4), '#2a3050', 2, INK, 0);
    ctx.fillStyle = v.col;
    ctx.fillRect(x - 22, V.bottom + 34, 26, 10);
    ctx.fillStyle = rgba('#000000', 0.5);
    ctx.fillRect(x - 22 + 6, V.bottom + 34, 3, 10);
    ctx.fillRect(x - 22 + 14, V.bottom + 34, 3, 10);
  });
  ink(ctx, pl, 3, INK, 0.7);
  // the glass's base ring
  const ring = rrPath(x - V.rx - 14, V.bottom - 4, V.rx * 2 + 28, 26, 6);
  flat(ctx, ring, '#6a7aa4', 0, INK);
  within(ctx, ring, () => {
    ctx.fillStyle = rgba('#d8e0ff', 0.7);
    ctx.fillRect(x - V.rx - 14, V.bottom - 4, V.rx * 2 + 28, 4);
    dots(ctx, { x: x - V.rx - 14, y: V.bottom - 4, w: V.rx * 2 + 28, h: 26 }, linTone(x - 30, 0, x + V.rx + 14, 0, 0, 0.8), SHADE, { step: 3.5, angle: 0.79 });
    for (let k = 0; k < 7; k++) rivet(ctx, x - V.rx + 4 + k * ((V.rx * 2 - 8) / 6), V.bottom + 12, 2.4);
  });
  ink(ctx, ring, 2.6, INK, 0.6);
  // the dark of the empty space in the glass behind the liquid (the liquid's frames cover the rest)
  flat(ctx, rectPath(x - V.rx, V.top, V.rx * 2, V.bottom - V.top), mix(v.deep, '#000000', 0.4), 0, INK);
}

/** One frame of a vat's liquid (phase 0…1 loops) in a LIQ frame: flat glowing colour modelled as a cylinder in dots, a
 * hot core, light bands drifting up, three streams of inked bubbles swelling as they rise, the surface churning. */
function liquidFrame(c: Ctx, ph: number, col: string, deep: string, seed: number): void {
  const { w, h } = LIQ;
  const cx = w / 2;
  const surf = 22 + Math.sin(ph * P2) * 2;
  const r = rng(seed);
  // the gas over the surface, then the liquid
  c.fillStyle = mix(deep, '#000000', 0.25);
  c.fillRect(0, 0, w, h);
  const body: PathFn = (g) => {
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, surf);
    for (let x = 0; x <= w; x += 6) g.lineTo(x, surf + Math.sin(x * 0.09 + ph * P2) * 2.6 + Math.sin(x * 0.21 - ph * P2 * 2) * 1.4);
    g.lineTo(w, h);
    g.closePath();
  };
  c.save();
  body(c);
  c.fillStyle = col;
  c.fill();
  c.clip();
  // the core: a paler band up the middle (the light comes through the most liquid there)
  c.fillStyle = mix(col, '#ffffff', 0.32);
  c.fillRect(cx - w * 0.2, 0, w * 0.32, h);
  c.fillStyle = mix(col, '#ffffff', 0.62);
  c.fillRect(cx - w * 0.12, 0, w * 0.12, h);
  // light bands drifting up the column, wavy
  for (let k = 0; k < 3; k++) {
    const yb = h - (((k + ph) / 3) * (h - surf + 40)) + 10;
    c.fillStyle = rgba(mix(col, '#ffffff', 0.7), 0.38);
    c.beginPath();
    c.moveTo(0, yb);
    for (let x = 0; x <= w; x += 8) c.lineTo(x, yb + Math.sin(x * 0.07 + k * 2 + ph * P2) * 5);
    for (let x = w; x >= 0; x -= 8) c.lineTo(x, yb + 7 + Math.sin(x * 0.07 + k * 2 + 0.7 + ph * P2) * 4);
    c.closePath();
    c.fill();
  }
  // the cylinder's shade in dots, deepening to the edges (more on the right, away from the key) and to the bottom
  dots(c, { x: 0, y: 0, w, h }, (x, y) => {
    const e = (x - cx) / (w / 2);
    return 0.85 * Math.abs(e) ** 2.2 * (e > 0 ? 1.15 : 0.8) + 0.35 * smooth(h * 0.7, h, y);
  }, deep, { step: 4.5, angle: 0.26, a: 0.9 });
  // bubble streams: each bubble's height runs once up the column per loop (n per stream, evenly phased)
  const streams = [cx - w * 0.28, cx + w * 0.06, cx + w * 0.3];
  for (const [si, sx] of streams.entries()) {
    const n = 7 - si;
    const so = r();
    for (let b = 0; b < n; b++) {
      // each bubble rises one place in the stream per loop, to where the next one was: the loop is seamless and
      // each frame moves it only a little, so the cross-fade never doubles it
      const u = (b + ph + so) / n;
      const by = h - 8 - u * (h - surf - 8);
      const br = 2 + u * (5 + si);
      const bx = sx + Math.sin(u * 9 + si * 2) * (3 + u * 5);
      if (by < surf + br) continue;
      c.fillStyle = rgba(mix(col, '#ffffff', 0.55), 0.55);
      c.beginPath();
      c.arc(bx, by, br, 0, P2);
      c.fill();
      c.strokeStyle = rgba(mix(deep, '#000000', 0.3), 0.9);
      c.lineWidth = 1.4;
      c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(bx - br * 0.35, by - br * 0.35, Math.max(0.8, br * 0.3), 0, P2);
      c.fill();
    }
  }
  c.restore();
  // the surface: an inked meniscus, froth churning along it
  c.save();
  c.strokeStyle = mix(deep, '#000000', 0.3);
  c.lineWidth = 2.2;
  c.beginPath();
  for (let x = 0; x <= w; x += 6) {
    const yy = surf + Math.sin(x * 0.09 + ph * P2) * 2.6 + Math.sin(x * 0.21 - ph * P2 * 2) * 1.4;
    if (x) c.lineTo(x, yy);
    else c.moveTo(x, yy);
  }
  c.stroke();
  for (let k = 0; k < 9; k++) {
    const fx = (k / 9) * w + 8 + Math.sin(ph * P2 + k) * 4;
    const fr = 3 + 2.4 * (0.5 + 0.5 * Math.sin(ph * P2 + k * 1.7));
    const fy = surf + Math.sin(fx * 0.09 + ph * P2) * 2.6 - fr * 0.4;
    c.fillStyle = mix(col, '#ffffff', 0.7);
    c.beginPath();
    c.arc(fx, fy, fr, 0, P2);
    c.fill();
    c.strokeStyle = mix(deep, '#000000', 0.2);
    c.lineWidth = 1.2;
    c.stroke();
  }
  c.restore();
}

/** The specimens' frames: a clone foot (green vat) and the Ultoe prototype (magenta vat), seen from above as the game's
 * feet are, hanging ankle-up from their cables, tinted by the liquid; `ph` (0…1 loops) wiggles the toes: they twitch. */
const SPEC = { w: 140, h: 300, hang: 70 };
const SPEC_N = 8;

/** Rotate a point about a pivot. */
const rot = (x: number, y: number, px: number, py: number, a: number): [number, number] => [px + (x - px) * Math.cos(a) - (y - py) * Math.sin(a), py + (x - px) * Math.sin(a) + (y - py) * Math.cos(a)];

/** The foot's outline seen from above (as the game's feet are), hanging ankle-up: the ankle at the top, widening to the
 * ball, the toes' line at the bottom. `cx` its middle, `y0` the ankle. */
function solePath(cx: number, y0: number, wAnkle: number, wBall: number, len: number): PathFn {
  return (g) => {
    g.beginPath();
    g.moveTo(cx - wAnkle, y0);
    g.bezierCurveTo(cx - wAnkle - 2, y0 + len * 0.35, cx - wBall - 4, y0 + len * 0.6, cx - wBall, y0 + len * 0.86);
    g.quadraticCurveTo(cx - wBall + 2, y0 + len, cx - wBall * 0.6, y0 + len);
    g.lineTo(cx + wBall * 0.7, y0 + len - 4);
    g.quadraticCurveTo(cx + wBall + 2, y0 + len - 6, cx + wBall, y0 + len * 0.8);
    g.bezierCurveTo(cx + wBall + 2, y0 + len * 0.55, cx + wAnkle + 4, y0 + len * 0.3, cx + wAnkle, y0);
    g.closePath();
  };
}

/** The five toes along the foot's front edge, the big one on the left: [x, y, rx, ry]. `ph` wiggles them. */
function toeSpots(cx: number, yToe: number, wBall: number, ph: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const xs = [-0.62, -0.18, 0.18, 0.48, 0.74];
  const rs = [15, 11.5, 10.5, 9.5, 8];
  const drop = [10, 12, 9, 6, 1];
  for (let k = 0; k < 5; k++) {
    const w = Math.sin(ph * P2 - k * 0.9) * 3.2;
    out.push([cx + xs[k] * wBall, yToe + drop[k] + w, rs[k], rs[k] * 1.25]);
  }
  return out;
}

function cloneFoot(c: Ctx, col: string, deep: string, ph = 0): void {
  const cx = SPEC.w / 2;
  const skin = mix('#f0c8a8', col, 0.4);
  const lite = mix('#fff2e4', col, 0.25);
  const dark = mix('#8a4a3a', deep, 0.5);
  // the cable from the cap down to the ankle cuff
  c.strokeStyle = INK;
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(cx + 6, 0);
  c.bezierCurveTo(cx - 8, 40, cx + 16, 66, cx + 4, SPEC.hang + 14);
  c.stroke();
  c.strokeStyle = mix('#3a3a52', col, 0.3);
  c.lineWidth = 3;
  c.stroke();
  const y0 = SPEC.hang + 16;
  const len = 150;
  const wb = 46;
  const foot = solePath(cx, y0, 24, wb, len);
  const toes = toeSpots(cx, y0 + len - 12, wb, ph);
  // toes behind the foot's front edge first (their tips show), then the foot, then the toes' tops over it
  flat(c, foot, skin, 0, INK);
  within(c, foot, () => {
    dots(c, { x: 0, y: y0, w: SPEC.w, h: len + 10 }, linTone(cx - 10, 0, cx + wb + 4, 0, 0, 0.85), dark, { step: 3.5, angle: 0.79 });
    c.fillStyle = rgba(lite, 0.85);
    c.beginPath();
    c.ellipse(cx - wb * 0.5, y0 + len * 0.55, 7, 34, 0.08, 0, P2);
    c.fill();
    // tendons fanning to the toes, the ankle bone
    c.strokeStyle = rgba(INK, 0.4);
    c.lineWidth = 1.4;
    c.beginPath();
    for (const [tx] of toes) {
      c.moveTo(cx + (tx - cx) * 0.3, y0 + len * 0.3);
      c.quadraticCurveTo(cx + (tx - cx) * 0.7, y0 + len * 0.62, tx, y0 + len * 0.8);
    }
    c.stroke();
  });
  ink(c, foot, 2.8, INK, 0.5);
  for (const [tx, ty, rx, ry] of toes) {
    const toe = ellPath(tx, ty, rx, ry);
    flat(c, toe, skin, 2.4, INK, 0.4);
    within(c, toe, () => {
      dots(c, { x: tx - rx, y: ty - ry, w: rx * 2, h: ry * 2 }, linTone(tx - 2, ty - 2, tx + rx, ty + ry, 0, 0.8), dark, { step: 3, angle: 0.79 });
      c.fillStyle = rgba(lite, 0.8);
      c.beginPath();
      c.ellipse(tx - rx * 0.4, ty - ry * 0.3, rx * 0.25, ry * 0.3, 0, 0, P2);
      c.fill();
    });
    // the nail
    flat(c, ellPath(tx + rx * 0.05, ty + ry * 0.35, rx * 0.5, ry * 0.36), mix('#ffe8e0', col, 0.25), 1.3, INK, 0);
  }
  // the electrode cuff on the ankle, with its lamp
  const cuff = rrPath(cx - 30, y0 - 8, 60, 18, 5);
  flat(c, cuff, '#5a6488', 2.4, INK, 0.5);
  within(c, cuff, () => {
    c.fillStyle = rgba('#c8d4f8', 0.6);
    c.fillRect(cx - 30, y0 - 8, 60, 4);
  });
  flat(c, ellPath(cx + 16, y0 + 1, 4, 4), '#ff3a2a', 1.4, INK, 0);
}

/** The Ultoe prototype in the magenta vat: a chrome robot foot from above (plated, riveted, five jointed metal toes)
 * with its red core in the middle of the plate, hanging from its data cable. `ph` flexes the toes: it's testing itself. */
function robotFoot(c: Ctx, col: string, deep: string, ph = 0): void {
  const cx = SPEC.w / 2;
  const steel = mix('#c8d0e0', col, 0.3);
  const dk = mix('#3a4058', deep, 0.4);
  c.strokeStyle = INK;
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(cx - 4, 0);
  c.bezierCurveTo(cx + 14, 40, cx - 10, 70, cx + 2, SPEC.hang + 14);
  c.stroke();
  c.strokeStyle = mix('#2a2a3a', col, 0.25);
  c.lineWidth = 3.4;
  c.stroke();
  const y0 = SPEC.hang + 16;
  const len = 140;
  const wb = 44;
  const shade = (box: Box, tx0: number, tx1: number) => dots(c, box, linTone(tx0, 0, tx1, 0, 0, 0.85), dk, { step: 3.5, angle: 0.79 });
  // the toes: five steel toe caps, each jointed across its knuckle, flexing
  const toes = toeSpots(cx, y0 + len - 10, wb, ph * 2);
  for (const [tx, ty, rx, ry] of toes) {
    const seg = ellPath(tx, ty + 2, rx * 0.9, ry * 1.05);
    flat(c, seg, steel, 2.4, INK, 0.4);
    within(c, seg, () => {
      shade({ x: tx - rx, y: ty - ry, w: rx * 2, h: ry * 2.4 }, tx, tx + rx);
      c.fillStyle = rgba('#ffffff', 0.75);
      c.beginPath();
      c.ellipse(tx - rx * 0.4, ty - ry * 0.1, rx * 0.18, ry * 0.45, 0, 0, P2);
      c.fill();
      c.strokeStyle = rgba(INK, 0.85);
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(tx - rx, ty - ry * 0.2);
      c.quadraticCurveTo(tx, ty + ry * 0.05, tx + rx, ty - ry * 0.2);
      c.stroke();
    });
    rivet(c, tx, ty + ry * 0.55, 1.6);
  }
  // the plate
  const plate = solePath(cx, y0, 26, wb, len - 12);
  flat(c, plate, steel, 0, INK);
  within(c, plate, () => {
    shade({ x: 0, y: y0, w: SPEC.w, h: len }, cx, cx + wb + 4);
    c.fillStyle = rgba('#ffffff', 0.65);
    c.fillRect(cx - wb * 0.62, y0 + 20, 5, len * 0.6);
    // panel lines and rivets
    c.strokeStyle = rgba(INK, 0.75);
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(cx - 40, y0 + 52);
    c.lineTo(cx + 40, y0 + 52);
    c.moveTo(cx - 46, y0 + 98);
    c.lineTo(cx + 46, y0 + 98);
    c.stroke();
    for (const [rx, ry] of [[-30, 60], [30, 60], [-36, 106], [36, 106], [-16, 24], [16, 24]] as const) rivet(c, cx + rx, y0 + ry, 2);
  });
  ink(c, plate, 2.8, INK, 0.6);
  // the ankle joint and its pistons
  flat(c, rrPath(cx - 28, y0 - 10, 56, 22, 8), dk, 2.4, INK, 0.5);
  flat(c, ellPath(cx - 12, y0 + 1, 6, 6), mix(steel, '#ffffff', 0.4), 1.2, INK, 0);
  flat(c, ellPath(cx + 12, y0 + 1, 6, 6), mix(steel, '#ffffff', 0.4), 1.2, INK, 0);
  // the red core in its housing (the live layer makes it pulse)
  flat(c, ellPath(cx + 4, y0 + 76, 11, 11), '#2a1a22', 2.4, INK, 0);
  flat(c, ellPath(cx + 4, y0 + 76, 7, 7), '#ff3a3a', 0, INK);
  c.fillStyle = '#ffd0c0';
  c.beginPath();
  c.arc(cx + 2, y0 + 74, 2.6, 0, P2);
  c.fill();
}

/** Where the robot's core sits in its frame. */
const CORE_AT = { x: SPEC.w / 2 + 4, y: SPEC.hang + 16 + 76 };

const SPEC_AT = (i: number) => ({ x: VB(i) + (i ? 4 : -4), y: DL.vat.top - SPEC.hang + 22 });

function vatStill(ctx: Ctx, i: number): void {
  const v = DL.vats[i];
  ctx.save();
  ctx.translate(VB(i) - DL.vat.rx, DL.vat.top);
  liquidFrame(ctx, 0.2, v.col, v.deep, 40 + i);
  ctx.restore();
  ctx.save();
  within(ctx, rectPath(VB(i) - DL.vat.rx, DL.vat.top, LIQ.w, LIQ.h), () => {
    const s = SPEC_AT(i);
    ctx.translate(s.x - SPEC.w / 2, s.y);
    (i ? robotFoot : cloneFoot)(ctx, v.col, v.deep);
  });
  ctx.restore();
}

/** The glass over the liquid (and the specimen): its reflections, the thick edges, the bands, the cap and its pipes. */
function vatGlass(ctx: Ctx, i: number): void {
  const x = VB(i);
  const V = DL.vat;
  const v = DL.vats[i];
  const g = rectPath(x - V.rx, V.top, V.rx * 2, V.bottom - V.top);
  within(ctx, g, () => {
    // the thick glass at the edges, darker and tinted
    const eg = ctx.createLinearGradient(x - V.rx, 0, x + V.rx, 0);
    eg.addColorStop(0, rgba(mix(v.deep, '#000000', 0.3), 0.55));
    eg.addColorStop(0.1, rgba(v.deep, 0));
    eg.addColorStop(0.88, rgba(v.deep, 0));
    eg.addColorStop(1, rgba(mix(v.deep, '#000000', 0.4), 0.65));
    ctx.fillStyle = eg;
    ctx.fillRect(x - V.rx, V.top, V.rx * 2, V.bottom - V.top);
    // the reflections: a broad white bar on the lit side, a thin one beside it, a window glint on the right
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.fillRect(x - V.rx + 14, V.top, 16, V.bottom - V.top);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(x - V.rx + 36, V.top, 4, V.bottom - V.top);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + V.rx - 22, V.top + 20, 6, V.bottom - V.top - 40);
  });
  ink(ctx, g, 3.4, INK, 0.7);
  // the steel bands round the glass
  for (const by of [V.top + 132, V.top + 264]) {
    const band = rectPath(x - V.rx - 4, by, V.rx * 2 + 8, 10);
    flat(ctx, band, '#6a7aa4', 0, INK);
    within(ctx, band, () => dots(ctx, { x: x - V.rx - 4, y: by, w: V.rx * 2 + 8, h: 10 }, linTone(x - 30, 0, x + V.rx, 0, 0, 0.8), SHADE, { step: 3, angle: 0.79 }));
    ink(ctx, band, 2, INK, 0.4);
    rivet(ctx, x - V.rx + 6, by + 5, 2);
    rivet(ctx, x + V.rx - 6, by + 5, 2);
  }
  // the cap: a domed steel lid with a flange, its feed pipes, a pressure gauge, the cable's gland
  const cy = V.cap;
  const lidBox = { x: x - V.rx - 22, y: cy - 20, w: V.rx * 2 + 44, h: V.top - cy + 26 };
  castShadow(ctx, rectPath(lidBox.x, lidBox.y, lidBox.w, lidBox.h), 10, 10, 0.5, '#06021a');
  const flange = rrPath(x - V.rx - 22, V.top - 18, V.rx * 2 + 44, 24, 6);
  flat(ctx, flange, '#6a7aa4', 0, INK);
  within(ctx, flange, () => {
    ctx.fillStyle = rgba('#e0e8ff', 0.7);
    ctx.fillRect(x - V.rx - 22, V.top - 18, V.rx * 2 + 44, 4);
    dots(ctx, { x: lidBox.x, y: V.top - 18, w: lidBox.w, h: 24 }, linTone(x - 30, 0, x + V.rx + 22, 0, 0, 0.85), SHADE, { step: 3.5, angle: 0.79 });
    for (let k = 0; k < 8; k++) rivet(ctx, x - V.rx - 12 + k * ((V.rx * 2 + 24) / 7), V.top - 6, 2.4);
  });
  ink(ctx, flange, 2.8, INK, 0.6);
  const dome: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - V.rx - 8, V.top - 18);
    c.bezierCurveTo(x - V.rx, cy - 22, x + V.rx, cy - 22, x + V.rx + 8, V.top - 18);
    c.closePath();
  };
  flat(ctx, dome, '#5a6a94', 0, INK);
  within(ctx, dome, () => {
    ctx.fillStyle = rgba('#c8d4f8', 0.55);
    ctx.beginPath();
    ctx.ellipse(x - 30, cy, 34, 8, -0.15, 0, P2);
    ctx.fill();
    dots(ctx, { x: x - V.rx - 8, y: cy - 22, w: V.rx * 2 + 16, h: V.top - cy + 6 }, linTone(x - 20, cy - 10, x + V.rx, V.top, 0, 0.85), SHADE, { step: 3.5, angle: 0.79 });
  });
  ink(ctx, dome, 2.8, INK, 0.6);
  // the feed pipes come down into the dome
  for (const dx of [-38, 38]) {
    const p = rectPath(x + dx - 9, cy - 70, 18, 56);
    flat(ctx, p, '#a8482e', 0, INK);
    within(ctx, p, () => {
      ctx.fillStyle = rgba('#ffb090', 0.55);
      ctx.fillRect(x + dx - 7, cy - 70, 4, 56);
      dots(ctx, { x: x + dx - 9, y: cy - 70, w: 18, h: 56 }, linTone(x + dx - 6, 0, x + dx + 9, 0, 0, 0.85), '#3a0808', { step: 3.5, angle: 0.79 });
    });
    ink(ctx, p, 2.2, INK, 0.5);
    flat(ctx, rrPath(x + dx - 13, cy - 22, 26, 10, 3), '#c86a4a', 2, INK, 0.4);
  }
  // the cable's gland on top of the dome
  flat(ctx, rrPath(x - 10 + (i ? 10 : -8), cy - 8, 20, 12, 3), '#2a2e44', 2, INK, 0.4);
}

// ——— the console lip and the bench ———

const LIP_BOX = { x: 0, y: DL.lip - 4, w: W, h: TY + 4 - (DL.lip - 4) };
/** The console's lamps (x, colour): the live layer blinks them. */
const LAMPS: [number, string][] = [];
for (let x = 120; x < W; x += 96) LAMPS.push([x + ((x / 96) % 3) * 6, ['#ff3a2a', '#3dff7a', '#ffc23a', '#9ae8ff'][Math.floor(x / 96) % 4]]);

function consoleLip(ctx: Ctx, r: R): void {
  const y0 = DL.lip;
  // the lip's top edge, catching the key light
  const top = polyPath([[-10, y0], [W + 10, y0], [W + 10, y0 + 8], [-10, y0 + 8]]);
  flat(ctx, top, '#8a98c4', 0, INK);
  ink(ctx, top, 2.4, INK, 0);
  const face = rectPath(-10, y0 + 8, W + 20, TY - y0 - 8);
  flat(ctx, face, '#2e385a', 0, INK);
  within(ctx, face, () => {
    // a hazard band along the top of the face
    hazardIn(ctx, rectPath(-10, y0 + 8, W + 20, 12), { x: 0, y: y0 + 8, w: W, h: 12 }, 9, -0.8);
    ctx.fillStyle = INK;
    ctx.fillRect(0, y0 + 20, W, 2);
    // the panels: recessed inserts between bolts, each with lamps, toggles or a dial
    const widths = [190, 236, 150, 214, 172, 256, 160, 200, 230, 180];
    const labels = ['VAT 1', 'COIL A', 'VAULT', 'REACTOR', 'COIL B', 'VAT 2', 'ALARM'];
    for (let x = 24, k = 0; x < W - 40; x += widths[k % widths.length] + 12, k++) {
      const pw = Math.min(widths[k % widths.length], W - 12 - x);
      const pp = rrPath(x, y0 + 28, pw, TY - y0 - 34, 4);
      flat(ctx, pp, k % 2 ? '#2c3454' : '#283050', 1.6, INK, 0);
      within(ctx, pp, () => {
        ctx.fillStyle = rgba('#000000', 0.35);
        ctx.fillRect(x, y0 + 28, pw, 5);
      });
      for (const bx of [x + 6, x + pw - 6]) rivet(ctx, bx, y0 + 36, 1.8);
      const kind = k % 5;
      if (kind === 0 || kind === 3) {
        // an embossed label plate
        const lw = 76;
        flat(ctx, rrPath(x + 16, y0 + 38, lw, 16, 2), '#1a1e30', 1.4, INK, 0);
        ctx.save();
        ctx.font = `11px ${BLOCK}`;
        ctx.fillStyle = '#c8ccd8';
        ctx.textAlign = 'center';
        ctx.fillText(labels[k % labels.length], x + 16 + lw / 2, y0 + 50);
        ctx.restore();
        // and faders beside it
        for (let t = 0; t < Math.floor((pw - 110) / 22); t++) {
          const fx = x + 110 + t * 22;
          ctx.fillStyle = '#0c0e1c';
          ctx.fillRect(fx - 1.5, y0 + 36, 3, 24);
          flat(ctx, rectPath(fx - 6, y0 + 40 + r() * 14, 12, 6), '#a8b0c8', 1.2, INK, 0);
        }
      } else if (kind === 4) {
        // the big red button under its guard
        flat(ctx, rrPath(x + pw / 2 - 26, y0 + 34, 52, 26, 4), HAZ, 1.6, INK, 0);
        hatch(ctx, rrPath(x + pw / 2 - 26, y0 + 34, 52, 26, 4), { x: x + pw / 2 - 26, y: y0 + 34, w: 52, h: 26 }, -0.8, 12, 5, INK, 1);
        flat(ctx, ellPath(x + pw / 2, y0 + 46, 11, 8), '#d8322e', 2, INK, 0.4);
        ctx.fillStyle = 'rgba(255,220,210,0.8)';
        ctx.fillRect(x + pw / 2 - 5, y0 + 41, 4, 2);
      } else if (kind === 1) {
        // toggles
        for (let t = 0; t < Math.floor((pw - 40) / 34); t++) {
          const tx = x + 30 + t * 34;
          flat(ctx, rrPath(tx - 7, y0 + 40, 14, 18, 3), '#5a6488', 1.4, INK, 0);
          ctx.strokeStyle = INK;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(tx, y0 + 49);
          ctx.lineTo(tx + (r() < 0.5 ? -5 : 5), y0 + 36);
          ctx.stroke();
          ctx.strokeStyle = '#d8dcec';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else {
        // a dial between two knobs
        const dx0 = x + pw / 2;
        flat(ctx, ellPath(dx0, y0 + 47, 14, 14), '#d8d0b8', 2, INK, 0);
        ctx.strokeStyle = '#d8322e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dx0, y0 + 47);
        ctx.lineTo(dx0 + (r() - 0.5) * 20, y0 + 37);
        ctx.stroke();
        for (const dx of [-pw * 0.3, pw * 0.3]) flat(ctx, ellPath(dx0 + dx, y0 + 47, 7, 7), '#1a1c2a', 1.6, INK, 0);
      }
    }
    // the lamps: lenses in bezels (painted dim; the live layer lights them)
    for (const [lx, lc] of LAMPS) {
      flat(ctx, ellPath(lx, y0 + 60, 7, 7), '#1a1c2a', 1.6, INK, 0);
      flat(ctx, ellPath(lx, y0 + 60, 4.6, 4.6), mix(lc, '#202030', 0.35), 0, INK);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(lx - 2.4, y0 + 57, 1.8, 1.8);
    }
    // the shade in dots, deepening right
    dots(ctx, { x: 0, y: y0 + 8, w: W, h: TY - y0 }, (x, y) => 0.15 + 0.35 * smooth(700, W, x) + 0.25 * smooth(y0 + 30, TY, y), SHADE, { step: 5, angle: 0.79, a: 0.75 });
    // the vats' light on it
    for (const v of DL.vats) lightPool(ctx, v.x, y0 + 20, 260, 50, v.col, 0.18);
  });
  ink(ctx, face, 2.6, INK, 0);
  crevice(ctx, 0, W, y0 + 8, 10, 0.35, '#06021a');
}

function table(ctx: Ctx, r: R): void {
  const zf = DL.front;
  const at = (x: number, y: number) => 960 + (x - 960) * ((y - 300) / (zf - 300));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, zf - TY + 2);
  ctx.clip();
  vfill(ctx, 0, TY, W, zf - TY, [[0, '#343e62'], [0.35, '#56628a'], [1, '#6e7aa0']]);
  // the brushed steel: fine horizontal strokes, bright and dark
  for (let i = 0; i < 160; i++) {
    const y = TY + r() * (zf - TY);
    const x = r() * W;
    const l = 80 + r() * 320;
    ctx.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#1a1e34', 0.06 + r() * 0.06);
    ctx.fillRect(x, y, l, 1.2);
  }
  // the key light's sheen across the middle, the lab's colours from the sides
  const sh = ctx.createLinearGradient(0, TY, 0, zf);
  sh.addColorStop(0, 'rgba(220,235,255,0)');
  sh.addColorStop(0.45, 'rgba(220,235,255,0.14)');
  sh.addColorStop(1, 'rgba(220,235,255,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, TY, W, zf - TY);
  lightPool(ctx, 160, TY + 60, 520, 140, DL.vats[0].col, 0.16);
  lightPool(ctx, W - 160, TY + 60, 520, 140, DL.vats[1].col, 0.16);
  // the steel's reflections of the lab's lights: the vats' colours and the coils' cyan running down towards us,
  // straight below each source: a soft column of its colour fading forward, with two sharp glints in it (the vats'
  // glass edges), as polished steel mirrors a light behind it
  for (const [rx, col, wd, a] of [[DL.vats[0].x, DL.vats[0].col, 150, 0.3], [DL.vats[1].x, DL.vats[1].col, 150, 0.3], [DL.coils[0].x, CYAN, 60, 0.18], [DL.coils[1].x, CYAN, 60, 0.18]] as const) {
    lightPool(ctx, rx, TY + 70, wd * 0.5, 130, col, a);
    for (const dx of [-wd * 0.3, wd * 0.22]) {
      const g = ctx.createLinearGradient(0, TY, 0, TY + 170);
      g.addColorStop(0, rgba(mix(col, '#ffffff', 0.5), a * 1.4));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(rx + dx - 2, TY + 4, 4, 170);
    }
  }
  // printed: the shade towards the back and the right, the front edge
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => 0.42 * (1 - smooth(TY, TY + 140, y)) + 0.16 * smooth(zf - 110, zf, y) + 0.14 * smooth(1000, W, x) + 0.05, '#141034', { step: 8, angle: 0.79, a: 0.6 });
  // the bench's plates: seams to the eye, bolted at the joints; one seam across
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const fx of [-420, 420, 1500, 2340]) {
    ctx.moveTo(at(fx, TY), TY);
    ctx.lineTo(fx, zf);
  }
  ctx.moveTo(0, 902);
  ctx.lineTo(W, 902);
  ctx.stroke();
  ctx.strokeStyle = rgba('#e0e8ff', 0.35);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 904);
  ctx.lineTo(W, 904);
  ctx.stroke();
  for (const fx of [-420, 420, 1500, 2340])
    for (const y of [TY + 16, 902, zf - 14]) {
      const x = at(fx, y) + (fx - at(fx, y)) * 0;
      const xx = 960 + (fx - 960) * ((y - 300) / (zf - 300));
      void x;
      if (xx > 10 && xx < W - 10) rivet(ctx, xx + 10, y, 2.4 + ((y - TY) / (zf - TY)) * 1.4, '#a8b4d8');
    }
  // scorches and acid stains: a burnt ring under where a flask stood, drips
  for (let i = 0; i < 14; i++) {
    const x = r() * W;
    const y = TY + 30 + r() * (zf - TY - 50);
    ctx.fillStyle = rgba(r() < 0.5 ? '#2a1a3a' : '#1a3a2a', 0.18);
    ctx.beginPath();
    ctx.ellipse(x, y, 4 + r() * 10, 2 + r() * 4, 0, 0, P2);
    ctx.fill();
  }
  ctx.strokeStyle = rgba('#1a1028', 0.35);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(1240, 940, 34, 9, 0, 0, P2);
  ctx.stroke();
  ctx.restore();
  // the console lip's flat shadow along the back
  ctx.fillStyle = rgba('#06021a', 0.35);
  ctx.fillRect(0, TY, W, 12);
  tableFalloff(ctx, zf, 0.3, '#06021a');
  tableSeam(ctx, 0.55, INK, false);
  // the bench's front edge: a steel lip in hazard stripes
  const kf = rectPath(0, zf, W, 1080 - zf);
  flat(ctx, kf, '#3a4466', 0, INK);
  within(ctx, kf, () => {
    hazardIn(ctx, rectPath(0, zf + 10, W, 22), { x: 0, y: zf + 10, w: W, h: 22 }, 14, 0.8);
    dots(ctx, { x: 0, y: zf, w: W, h: 1080 - zf }, (_x, y) => 0.25 + 0.5 * smooth(zf, 1080, y), '#06021a', { step: 6, angle: 0.79, a: 0.75 });
    ctx.fillStyle = rgba('#d0dcff', 0.45);
    ctx.fillRect(0, zf, W, 3);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, zf);
  ctx.lineTo(W, zf);
  ctx.stroke();
}

function tableProps(ctx: Ctx, r: R): void {
  // a rack of test tubes and a flask at the back left
  const { x, y } = DL.table.rack;
  groundShadow(ctx, x + 40, y + 20, 150, 16, 0.85, '#06021a', 1.3);
  const tubeCols = ['#48f08c', '#f04ad2', '#ffc23a', '#9ae8ff'];
  // the rack's back rail, the tubes, the front rail
  flat(ctx, rectPath(x - 90, y - 34, 170, 8), '#8a6a4a', 2, INK, 0.4);
  for (let k = 0; k < 4; k++) {
    const tx = x - 70 + k * 40;
    const tube: PathFn = (c) => {
      c.beginPath();
      c.moveTo(tx - 8, y - 60);
      c.lineTo(tx - 8, y + 6);
      c.arc(tx, y + 6, 8, Math.PI, 0, true);
      c.lineTo(tx + 8, y - 60);
    };
    const liq = rectPath(tx - 8, y - 30 + k * 6, 16, 50);
    within(ctx, tube, () => {
      ctx.fillStyle = rgba('#d8e8ff', 0.25);
      ctx.fillRect(tx - 8, y - 64, 16, 80);
      within(ctx, liq, () => {
        ctx.fillStyle = tubeCols[k];
        ctx.fillRect(tx - 8, y - 40, 16, 70);
        dots(ctx, { x: tx - 8, y: y - 40, w: 16, h: 70 }, linTone(tx - 2, 0, tx + 8, 0, 0, 0.8), mix(tubeCols[k], '#000000', 0.6), { step: 3, angle: 0.26 });
      });
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(tx - 5, y - 56, 2.6, 58);
    });
    ink(ctx, tube, 2, INK, 0.3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(tx, y - 60, 8, 2.6, 0, 0, P2);
    ctx.stroke();
  }
  const front = rectPath(x - 96, y - 10, 182, 12);
  flat(ctx, front, '#a8825a', 2.2, INK, 0.5);
  within(ctx, front, () => dots(ctx, { x: x - 96, y: y - 10, w: 182, h: 12 }, linTone(x - 40, 0, x + 86, 0, 0, 0.6), '#4a2a10', { step: 3, angle: 0.79 }));
  for (const lx of [x - 92, x + 80]) flat(ctx, rectPath(lx - 4, y - 36, 8, 52), '#8a6a4a', 1.8, INK, 0.4);
  // the round-bottomed flask, bubbling green, on its own
  const fx = x + 136;
  const fy = y + 2;
  groundShadow(ctx, fx + 8, fy + 14, 44, 9, 0.85, '#06021a', 1.2);
  const flask: PathFn = (c) => {
    c.beginPath();
    c.moveTo(fx - 8, fy - 74);
    c.lineTo(fx - 8, fy - 36);
    c.arc(fx, fy - 12, 26, -Math.PI / 2 - 0.32, Math.PI * 1.5 + 0.32, true);
    c.lineTo(fx + 8, fy - 36);
    c.lineTo(fx + 8, fy - 74);
  };
  within(ctx, flask, () => {
    ctx.fillStyle = rgba('#d8e8ff', 0.22);
    ctx.fillRect(fx - 30, fy - 80, 60, 100);
    ctx.fillStyle = DL.vats[0].col;
    ctx.fillRect(fx - 30, fy - 18, 60, 40);
    dots(ctx, { x: fx - 30, y: fy - 18, w: 60, h: 40 }, linTone(fx - 6, 0, fx + 26, 0, 0, 0.85), DL.vats[0].deep, { step: 3, angle: 0.26 });
    for (const [bx, by, br] of [[fx - 8, fy - 4, 3], [fx + 6, fy + 4, 2.4], [fx - 2, fy - 12, 2]] as const) {
      ctx.strokeStyle = DL.vats[0].deep;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, P2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(fx - 12, fy - 22, 4, 9, 0.5, 0, P2);
    ctx.fill();
  });
  ink(ctx, flask, 2.2, INK, 0.4);
  flat(ctx, rrPath(fx - 10, fy - 82, 20, 10, 3), '#c86a4a', 1.8, INK, 0.3);
  lightPool(ctx, fx, fy + 14, 50, 10, DL.vats[0].col, 0.3);
  // the blueprint for Project Ultoe at the back right, a wrench across its corner
  const p = DL.table.plan;
  const sheetP = polyPath([[p.x - 112, p.y - 18], [p.x + 76, p.y - 32], [p.x + 118, p.y + 14], [p.x - 70, p.y + 32]]);
  groundShadow(ctx, p.x + 10, p.y + 22, 130, 18, 0.85, '#06021a', 1.3);
  castShadow(ctx, sheetP, 5, 4, 0.75, '#06021a');
  flat(ctx, sheetP, '#2a5aa8', 2.4, INK, 0.5);
  within(ctx, sheetP, () => {
    ctx.save();
    ctx.translate(p.x - 6, p.y);
    ctx.transform(1, -0.08, 0.62, 0.42, 0, 0);
    ctx.strokeStyle = rgba('#d8ecff', 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = -110; gx <= 110; gx += 16) {
      ctx.moveTo(gx, -60);
      ctx.lineTo(gx, 60);
    }
    for (let gy = -60; gy <= 60; gy += 16) {
      ctx.moveTo(-110, gy);
      ctx.lineTo(110, gy);
    }
    ctx.stroke();
    // the schematic: a robot foot in white line, dimension arrows, the title block
    ctx.strokeStyle = '#eaf6ff';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-60, -50);
    ctx.lineTo(-24, -50);
    ctx.lineTo(-22, -6);
    ctx.lineTo(30, 6);
    ctx.lineTo(40, 28);
    ctx.lineTo(-64, 28);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-40, 4, 10, 0, P2);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-64, 42);
    ctx.lineTo(40, 42);
    ctx.moveTo(-64, 38);
    ctx.lineTo(-64, 46);
    ctx.moveTo(40, 38);
    ctx.lineTo(40, 46);
    ctx.stroke();
    ctx.fillStyle = '#eaf6ff';
    ctx.font = `16px ${BLOCK}`;
    ctx.fillText('PROJECT ULTOE', 50, -40);
    ctx.font = `10px ${BLOCK}`;
    ctx.fillText('TOP SECRET', 52, -24);
    ctx.restore();
    dots(ctx, { x: p.x - 112, y: p.y - 32, w: 230, h: 64 }, linTone(p.x - 20, 0, p.x + 118, 0, 0, 0.45), '#0a1a4a', { step: 4, angle: 0.79 });
  });
  flat(ctx, polyPath([[p.x + 76, p.y - 32], [p.x + 118, p.y + 14], [p.x + 96, p.y - 8]]), '#5a8ad0', 1.8, INK, 0);
  // the wrench
  const wr = polyPath([[p.x - 128, p.y + 22], [p.x - 52, p.y + 6], [p.x - 50, p.y + 14], [p.x - 126, p.y + 30]]);
  groundShadow(ctx, p.x - 86, p.y + 28, 56, 8, 0.8, '#06021a');
  castShadow(ctx, wr, 6, 4, 0.75, '#06021a');
  flat(ctx, wr, '#b8c0d8', 2.2, INK, 0.5);
  within(ctx, wr, () => dots(ctx, { x: p.x - 130, y: p.y + 4, w: 84, h: 28 }, linTone(0, p.y + 12, 0, p.y + 30, 0, 0.8), SHADE, { step: 3, angle: 0.79 }));
  const jaw = polyPath([[p.x - 54, p.y + 2], [p.x - 36, p.y - 6], [p.x - 26, p.y + 4], [p.x - 38, p.y + 6], [p.x - 36, p.y + 14], [p.x - 26, p.y + 16], [p.x - 36, p.y + 24], [p.x - 52, p.y + 18]]);
  flat(ctx, jaw, '#c8d0e8', 2.2, INK, 0.5);
  void r;
}

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0, '#d0e8ff', 0.03, { warm: '#ffd8a0', cool: '#4a40b8', a: 0.14 });
}

function shadeOver(ctx: Ctx): void {
  // the HUD's corner calm, the soffit calmed, the lanes calm, a vignette
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(8,4,22,0.4)');
  g.addColorStop(1, 'rgba(8,4,22,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
  const cg = ctx.createLinearGradient(0, 0, 0, 160);
  cg.addColorStop(0, 'rgba(8,4,22,0.35)');
  cg.addColorStop(1, 'rgba(8,4,22,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, 160);
  calmLanes(ctx, 0.16, '#0c0824', 140, 600);
  vignetteAll(ctx, 0.6, '#08041a');
}

// ——— the stack ———

const LAD_BOX: Box = { x: DL.ladder.x - LAD.w / 2, y: DL.ladder.foot - LAD.h, w: LAD.w, h: LAD.h };

export const DLAB: SceneSpec = {
  id: 'doomlab',
  info: {
    name: 'The Doom Lab',
    subtitle: 'Waves 66–69',
    ambient: [],
    glows: [],
    light: '#c8e8ff',
    tableTint: '#eef4ff',
  },
  layers: [
    { id: 'wall', box: WALL_BOX, draw: wall },
    { id: 'deck', box: DECK_BOX, draw: deck },
    { id: 'ladder', box: { x: DL.ladder.x - 50, y: DL.ladder.top - 10, w: 110, h: DL.ladder.foot + 16 - (DL.ladder.top - 10) }, draw: ladderBase },
    { id: 'ladderStill', box: LAD_BOX, stillOnly: true, draw: ladderStill },
    { id: 'coilL', box: COIL_BOX(0), draw: (c) => coil(c, 0) },
    { id: 'coilR', box: COIL_BOX(1), draw: (c) => coil(c, 1) },
    { id: 'vatBackL', box: VAT_BOX(0), draw: (c) => vatBack(c, 0) },
    { id: 'vatBackR', box: VAT_BOX(1), draw: (c) => vatBack(c, 1) },
    { id: 'vatStillL', box: VAT_SLOT(0), stillOnly: true, draw: (c) => vatStill(c, 0) },
    { id: 'vatStillR', box: VAT_SLOT(1), stillOnly: true, draw: (c) => vatStill(c, 1) },
    { id: 'vatL', box: VAT_SLOT(0), motion: 'slot', draw: () => {} },
    { id: 'vatR', box: VAT_SLOT(1), motion: 'slot', draw: () => {} },
    { id: 'vatGlassL', box: { x: VB(0) - 110, y: DL.vat.cap - 74, w: 220, h: DL.vat.bottom + 6 - (DL.vat.cap - 74) }, draw: (c) => vatGlass(c, 0) },
    { id: 'vatGlassR', box: { x: VB(1) - 110, y: DL.vat.cap - 74, w: 220, h: DL.vat.bottom + 6 - (DL.vat.cap - 74) }, draw: (c) => vatGlass(c, 1) },
    { id: 'lip', box: LIP_BOX, draw: consoleLip },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'tableProps', box: { x: 0, y: TY + 10, w: W, h: 120 }, draw: tableProps },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: frame painters ———

const LIQ_K = 0.5;
const LIQ_N = 12;
const LAD_N = 16;
const ARC_F = { w: 240, h: 150 };
const ARC_N = 6;
const ARC_K = 0.6;
const BEACON_F = { w: 64, h: 60 };
const BEACON_N = 12;
const SCOPE_N = 10;

/** One comic arc per frame, from the left middle to the right middle of the frame: a cyan ribbon, white core, ink. */
function arcFrame(c: Ctx, i: number): void {
  const r = rng(510 + i * 37);
  const { w, h } = ARC_F;
  const strokes = boltPath(r, 6, h / 2, w - 6, h / 2 + (r() - 0.5) * 10, 8, 0.34);
  c.save();
  c.shadowColor = 'rgba(160,230,255,0.95)';
  c.shadowBlur = 18;
  bolt(c, strokes, 9, '#a8ecff', '#ffffff', '#1a2a6a');
  c.restore();
  bolt(c, strokes, 9, '#a8ecff', '#ffffff', INK);
}

/** Kirby krackle (frame i): a burst of cyan-white energy with clusters of black blobs inside it, each blob rimmed in
 * white where the energy wraps it, the way Kirby drew raw power. Its frames reshuffle the blobs: it crackles. */
const KR_N = 4;
const HIT = 64;

function krackle(c: Ctx, w: number, h: number, i: number): void {
  const r = rng(91 + i * 17);
  const cx = w / 2;
  const cy = h / 2;
  const burst: PathFn = (g) => {
    g.beginPath();
    const n = 11;
    for (let k = 0; k <= n * 2; k++) {
      const a = (k / (n * 2)) * P2 + i * 0.2;
      const rr = (k % 2 ? 0.27 : 0.4 + r() * 0.08) * w;
      if (k) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
  };
  flat(c, burst, '#a8ecff', 2.2, '#1a2a6a', 0);
  within(c, burst, () => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(cx, cy, w * 0.2, 0, P2);
    c.fill();
    // the krackle: blobs in clusters of three or four, inside the energy, rimmed white
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * P2 + r() * 0.6 + i;
      const d = w * (0.2 + r() * 0.12);
      const gx = cx + Math.cos(a) * d;
      const gy = cy + Math.sin(a) * d;
      for (let m = 0; m < 3 + Math.floor(r() * 2); m++) {
        const bx = gx + (r() - 0.5) * 12;
        const by = gy + (r() - 0.5) * 12;
        const br = 2 + r() * 4;
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(bx, by, br + 1.6, 0, P2);
        c.fill();
        c.fillStyle = INK;
        c.beginPath();
        c.ellipse(bx, by, br, br * (0.7 + r() * 0.5), r() * 3, 0, P2);
        c.fill();
      }
    }
  });
}

/** A comic hit flash where an arc strikes: an inked white starburst with a yellow heart. */
function hitFlash(c: Ctx, s: number): void {
  const r = rng(404);
  const cx = s / 2;
  const star: PathFn = (g) => {
    g.beginPath();
    const n = 8;
    for (let k = 0; k <= n * 2; k++) {
      const a = (k / (n * 2)) * P2;
      const rr = (k % 2 ? 0.18 : 0.42 + r() * 0.06) * s;
      if (k) g.lineTo(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr);
      else g.moveTo(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr);
    }
    g.closePath();
  };
  flat(c, star, '#ffffff', 2.6, INK, 0);
  flat(c, ellPath(cx, cx, s * 0.13, s * 0.13), '#fff2a0', 0, INK);
}

/** One frame of the oscilloscope (phase 0…1): a phosphor trace scrolling over a grid. Frame SCOPE_N is static. */
function scopeFrame(c: Ctx, ph: number, i: number, kind: 'scope' | 'radar'): void {
  const w = MON.sw;
  const h = MON.sh;
  c.save();
  c.beginPath();
  c.roundRect(0, 0, w, h, 14);
  c.clip();
  c.fillStyle = '#06200f';
  c.fillRect(0, 0, w, h);
  if (i > SCOPE_N) {
    // dead: the tube dark, a dying dot in its middle
    c.fillStyle = '#020604';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(160,255,190,0.5)';
    c.beginPath();
    c.arc(w / 2, h / 2, 2, 0, P2);
    c.fill();
  } else if (i === SCOPE_N) {
    // static: snow in printed dots
    const r = rng(77 + i);
    for (let k = 0; k < 420; k++) {
      c.fillStyle = r() < 0.5 ? 'rgba(200,255,220,0.8)' : 'rgba(40,120,70,0.8)';
      c.fillRect(r() * w, r() * h, 2.4, 1.6);
    }
    c.fillStyle = 'rgba(200,255,220,0.35)';
    c.fillRect(0, h * 0.4, w, 4);
  } else if (kind === 'scope') {
    c.strokeStyle = 'rgba(80,220,130,0.35)';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 8; x < w; x += 16) {
      c.moveTo(x, 0);
      c.lineTo(x, h);
    }
    for (let y = 6; y < h; y += 16) {
      c.moveTo(0, y);
      c.lineTo(w, y);
    }
    c.stroke();
    c.shadowColor = 'rgba(120,255,160,0.9)';
    c.shadowBlur = 6;
    c.strokeStyle = '#b8ffcc';
    c.lineWidth = 2.4;
    c.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const u = x / w + ph;
      const y = h / 2 + Math.sin(u * P2 * 3) * h * 0.22 + Math.sin(u * P2 * 8) * h * 0.06 + (Math.abs(((u * 2) % 1) - 0.5) < 0.03 ? -h * 0.3 : 0);
      if (x) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
  } else {
    const cx = w / 2;
    const cy = h / 2 + 4;
    const R0 = h * 0.46;
    c.strokeStyle = 'rgba(80,220,130,0.4)';
    c.lineWidth = 1;
    for (const k of [0.33, 0.66, 1]) {
      c.beginPath();
      c.arc(cx, cy, R0 * k, 0, P2);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(cx - R0, cy);
    c.lineTo(cx + R0, cy);
    c.moveTo(cx, cy - R0);
    c.lineTo(cx, cy + R0);
    c.stroke();
    // the sweep and its fading wake
    const a = ph * P2 - Math.PI / 2;
    for (let k = 0; k < 10; k++) {
      c.fillStyle = `rgba(120,255,160,${0.28 * (1 - k / 10)})`;
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, R0, a - (k + 1) * 0.1, a - k * 0.1);
      c.closePath();
      c.fill();
    }
    c.strokeStyle = '#c8ffd8';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0);
    c.stroke();
    // a foot-shaped blip, lit as the sweep passes it
    const ba = -0.6;
    const since = (((a - ba) % P2) + P2) % P2;
    const lit = Math.max(0.25, 1 - since / 3);
    c.fillStyle = `rgba(200,255,210,${lit})`;
    const bx = cx + Math.cos(ba) * R0 * 0.6;
    const by = cy + Math.sin(ba) * R0 * 0.6;
    c.beginPath();
    c.ellipse(bx, by, 3, 6, 0.3, 0, P2);
    c.fill();
    for (let t = 0; t < 4; t++) {
      c.beginPath();
      c.arc(bx - 3 + t * 2.2, by - 7 - (t === 0 ? 0 : 0.5), 1.1, 0, P2);
      c.fill();
    }
  }
  // the screen's curved glass: scanlines, a glint, the dark round the edge
  c.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
  const vg = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  c.fillStyle = vg;
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.beginPath();
  c.ellipse(w * 0.28, h * 0.22, w * 0.2, h * 0.07, -0.2, 0, P2);
  c.fill();
  c.restore();
}

/** A rotating beacon's beam, side-on: a cone along +x from (0, h/2), hot at the lamp. */
function beaconBeam(c: Ctx, w: number, h: number): void {
  for (const [k, a] of [[1, 0.25], [0.6, 0.35], [0.3, 0.5]] as const) {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, `rgba(255,90,70,${a})`);
    g.addColorStop(0.5, `rgba(255,60,50,${a * 0.4})`);
    g.addColorStop(1, 'rgba(255,40,40,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h / 2 - 6 * k);
    c.lineTo(w, h / 2 - (h / 2) * k);
    c.lineTo(w, h / 2 + (h / 2) * k);
    c.lineTo(0, h / 2 + 6 * k);
    c.closePath();
    c.fill();
  }
}

/** A comic bubble for the burst particles: an inked ring with a highlight. */
function bubbleSprite(c: Ctx, i: number): void {
  const s = 16;
  const rr = 11 - (i % 2) * 2;
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath();
  c.arc(s, s, rr, 0, P2);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 2.4;
  c.stroke();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(s - rr * 0.38, s - rr * 0.38, rr * 0.32, 0, P2);
  c.fill();
}

// ——— live ———

registerKitScene(DLAB, (k, wave0) => {
  const fx = k.slot('fx');
  const B = Phaser.BlendModes;
  let target = waveK(wave0);
  let shown = target;

  // ——— the light: alarm red at the third wave, the dim of the failing power at the fourth; the surges' dip
  const hushW = k.wash(0xc8c0e0, 0, B.MULTIPLY, fx);
  const alarmW = k.wash(0xff4a58, 0, B.MULTIPLY, fx);
  const dimW = k.wash(0x6a78a0, 0, B.MULTIPLY, fx);
  const dipW = k.wash(0x2a3050, 0, B.MULTIPLY, fx);
  const flash = k.wash(0xc8f0ff, 0, B.ADD, fx);

  // ——— the vats: the liquid loops, the specimens on their cables, the glow, bursts of bubbles
  const vats = DL.vats.map((v, i) => {
    const slot = k.slot(i ? 'vatR' : 'vatL');
    const key = sheet(k, `dl_liq${i}`, LIQ.w * LIQ_K, LIQ.h * LIQ_K, LIQ_N, (c, ph) => {
      c.scale(LIQ_K, LIQ_K);
      liquidFrame(c, ph, v.col, v.deep, 40 + i);
    });
    const loop = new Loop(k, key, LIQ_N, VB(i) - DL.vat.rx, DL.vat.top, { into: slot, origin: [0, 0], scale: 1 / LIQ_K, fps: 12 + i });
    const specKey = sheet(k, `dl_spec${i}`, SPEC.w, SPEC.h, SPEC_N, (c, ph) => (i ? robotFoot : cloneFoot)(c, v.col, v.deep, ph));
    const s = SPEC_AT(i);
    const spec = new Loop(k, specKey, SPEC_N, s.x, s.y, { into: slot, origin: [0.5, 0], fps: i ? 1.6 : 1.1, phase: i * 3 });
    // (it stays inside the glass: its cable's top is under the cap, which the glass layer paints over the slot)
    const glow = k.glow(v.x, 420, 260, Phaser.Display.Color.HexStringToColor(v.col).color, 0.14, { into: fx, sy: 1.3 });
    return { v, i, loop, spec, s, glow, bob: new Spring(0, 10, 2.2), tilt: new Spring(0, 12, 2.6), px: s.x, py: s.y, rot: 0 };
  });
  const core = k.glow(0, 0, 26, 0xff3a3a, 0.5, { into: fx });
  const bubKey = sheet(k, 'dl_bub', 32, 32, 2, (c, _p, i) => bubbleSprite(c, i));
  const bubbles = vats.map((vt) => new Parts(k, { frame: 'bubble', sheet: { key: bubKey, n: 2, half: 11 }, into: k.slot(vt.i ? 'vatR' : 'vatL'), max: 40 }));
  const burst = (vi: number, n: number) => {
    const x0 = VB(vi);
    for (let i = 0; i < n; i++) bubbles[vi].spawn({ x: x0 + (crand() - 0.5) * DL.vat.rx * 1.6, y: DL.vat.bottom - 10 - crand() * 60, vx: (crand() - 0.5) * 30, vy: -160 - crand() * 180, life: 1.4 + crand() * 0.6, r0: 2 + crand() * 2, r1: 5 + crand() * 4, a: 1, tint: 0xffffff, grav: -60, drag: 0.6, fade: 0.05 });
  };

  // ——— the coils: arcs to the horns, krackle at both ends, the toroids' glow
  const arcKey = sheet(k, 'dl_arc', ARC_F.w * ARC_K, ARC_F.h * ARC_K, ARC_N, (c, _p, i) => {
    c.scale(ARC_K, ARC_K);
    arcFrame(c, i);
  });
  const krKey = sheet(k, 'dl_krackle', 96, 96, KR_N, (c, _p, i) => krackle(c, 96, 96, i));
  const hitKey = k.tex('dl_hit', HIT, HIT, (c) => hitFlash(c, HIT));
  const coils = DL.coils.map((c, i) => {
    const h = DL.horns[i];
    const side = i ? -1 : 1;
    const x0 = c.x + side * DL.toroid.rx * 0.8;
    const y0 = c.y;
    const arc = k.img(arcKey, x0, y0, { into: fx, origin: [0, 0.5], scale: 1 / ARC_K, alpha: 0 });
    const kr0 = k.img(krKey, x0, y0, { into: fx, alpha: 0 });
    const kr1 = k.img(krKey, h.x, h.y, { into: fx, alpha: 0, scale: 0.7 });
    const glow = k.glow(c.x, c.y, 110, 0x9ae8ff, 0.12, { into: fx, sy: 0.7 });
    const hornGlow = k.glow(h.x, h.y, 70, 0x9ae8ff, 0, { into: fx });
    const hit = k.img(hitKey, h.x, h.y, { into: fx, alpha: 0 });
    return { c, h, x0, y0, arc, kr0, kr1, glow, hornGlow, hit, t: -1, next: 1 + crand() * 3 + i * 1.3 };
  });
  const sparks = new Parts(k, { frame: 'spark', add: true, into: fx, max: 120 });
  const fire = (ci: number, strong = false) => {
    const co = coils[ci];
    const dx = co.h.x - co.x0;
    const dy = co.h.y - co.y0;
    const len = Math.hypot(dx, dy);
    // the frame spans ARC_F.w: stretch it to reach the horn, flip it now and then for variety
    co.arc.setFrame(Math.floor(crand() * ARC_N)).setRotation(Math.atan2(dy, dx));
    co.arc.setScale(len / (ARC_F.w * ARC_K), ((strong ? 1.3 : 1) * (crand() < 0.5 ? 1 : -1)) / ARC_K);
    co.kr0.setRotation(crand() * P2);
    co.kr1.setRotation(crand() * P2);
    co.t = 0;
    for (let i = 0; i < (strong ? 12 : 5); i++) sparks.spawn({ x: co.h.x, y: co.h.y, vx: (crand() - 0.5) * 260, vy: -60 - crand() * 200, life: 0.5 + crand() * 0.5, r0: 2.2, r1: 1, a: 1, tint: crand() < 0.5 ? 0xc8f4ff : 0xffffff, grav: 900, drag: 0.4, floor: DL.floor + 10 + crand() * 30, bounce: 0.35, streak: 0.02, fade: 0.02 });
    k.sc.events.emit('doomlab:arc', strong);
  };

  // ——— the Jacob's ladder
  const ladKey = sheet(k, 'dl_ladder', LAD.w, LAD.h, LAD_N, (c, ph) => ladderFrame(c, ph));
  const ladder = new Loop(k, ladKey, LAD_N, DL.ladder.x, DL.ladder.foot, { into: fx, origin: [0.5, 1], fps: 9 });
  const ladGlow = k.glow(DL.ladder.x, DL.ladder.top + 60, 60, 0x9ae8ff, 0.15, { into: fx, sy: 1.6 });
  let ladPh = crand() * LAD_N;

  // ——— the beacons: turning reflectors, beams, their red light on the wall
  const bKey = sheet(k, 'dl_beacon', BEACON_F.w, BEACON_F.h, BEACON_N, (c, ph) => beaconDome(c, BEACON_F.w / 2, BEACON_F.h - 22, ph));
  const beamKey = k.tex('dl_beam', 360, 90, (c) => beaconBeam(c, 360, 90));
  const beacons = DL.beacons.map((b, i) => ({
    b,
    loop: new Loop(k, bKey, BEACON_N, b.x, b.y + 22, { into: fx, origin: [0.5, 1], fps: 0 }),
    beam: k.img(beamKey, b.x, b.y + 2, { into: fx, add: true, origin: [0, 0.5], alpha: 0 }),
    wallLight: k.glow(b.x, b.y + 60, 320, 0xff3a30, 0, { into: fx, sy: 0.8 }),
    halo: k.glow(b.x, b.y, 90, 0xff4a3a, 0, { into: fx }),
    ph: i * 0.5,
  }));
  // (the domes as painted show the reflector at rest; with the frames over them it turns)
  let beaconK = shown > 0.2 ? 1 : 0;

  // ——— the monitors: the scope and the radar; static in a surge or a stomp
  const scopeKey = sheet(k, 'dl_scope', MON.sw, MON.sh, SCOPE_N + 2, (c, ph, i) => scopeFrame(c, (ph * (SCOPE_N + 2)) / SCOPE_N, i, 'scope'));
  const radarKey = sheet(k, 'dl_radar', MON.sw, MON.sh, SCOPE_N + 2, (c, ph, i) => scopeFrame(c, (ph * (SCOPE_N + 2)) / SCOPE_N, i, 'radar'));
  const mons = DL.monitors.map((m, i) => {
    const key = i ? radarKey : scopeKey;
    const img = k.img(key, m.x - 8, m.y - 6, { into: fx });
    return { img, glow: k.glow(m.x - 8, m.y - 6, 80, 0x60ff90, 0.1, { into: fx, sy: 0.7 }), ph: crand() * SCOPE_N, fps: i ? 4 : 12 };
  });
  let staticT = 0;

  // ——— the console's lamps, the vault's emblem, the knife switch's sparks, grit off the soffit
  const lamps = LAMPS.map(([x, c], i) => ({ g: k.glow(x, DL.lip + 60, 12, Phaser.Display.Color.HexStringToColor(c).color, 0, { into: fx }), seed: i * 1.37, red: c === '#ff3a2a' }));
  const emblem = k.glow(DL.vault.x, DL.vault.y, 90, 0x3dff7a, 0.18, { into: fx });
  const knifeGlow = k.glow(DL.knife.x, DL.knife.y - 20, 50, 0xbdf0ff, 0, { into: fx });
  const grit = new Parts(k, { frame: 'mote', into: fx, max: 100 });
  const dust = new Parts(k, { frame: 'puff', into: fx, max: 30 });

  // ——— the surges (fourth wave): the lights dip in steps, the coils discharge, the switch sparks, the screens snow
  // the failing power shorts the gantry's conduit: sparks spit off its junctions and bounce on the deck
  const JUNCTIONS = [300, 820, 1110, 1620];
  let pipeNext = 2 + crand() * 2;
  const pipeSparks = (n: number) => {
    const jx = JUNCTIONS[Math.floor(crand() * JUNCTIONS.length)];
    for (let i = 0; i < n; i++) sparks.spawn({ x: jx + (crand() - 0.5) * 10, y: GANTRY.y + GANTRY.d + 20, vx: (crand() - 0.5) * 200, vy: -40 - crand() * 140, life: 0.9 + crand() * 0.6, r0: 2.4, r1: 1, a: 1, tint: crand() < 0.5 ? 0xffe0a0 : 0xffffff, grav: 900, drag: 0.3, floor: DL.floor + 6 + crand() * 50, bounce: 0.35, streak: 0.02, fade: 0.02 });
  };
  let surgeT = -1;
  let nextSurge = 4 + crand() * 4;
  const surge = () => {
    surgeT = 0;
    staticT = 0.9;
    fire(0, true);
    fire(1, true);
    for (let i = 0; i < 16; i++) sparks.spawn({ x: DL.knife.x + (crand() - 0.5) * 30, y: DL.knife.y - 22, vx: (crand() - 0.5) * 300, vy: -100 - crand() * 220, life: 0.7 + crand() * 0.6, r0: 2.6, r1: 1.1, a: 1, tint: crand() < 0.5 ? 0xffe0a0 : 0xffffff, grav: 900, drag: 0.4, floor: DL.floor + 4 + crand() * 40, bounce: 0.35, streak: 0.02, fade: 0.02 });
    k.sc.events.emit('doomlab:surge');
  };

  const C = Phaser.Display.Color;
  void C;

  return {
    setWave(w) {
      target = waveK(w);
    },
    impact(x, _y, p) {
      // the specimens jolt on their cables; bubbles burst up; both coils discharge; the screens glitch; grit falls
      for (const vt of vats) {
        vt.bob.v += 40 + p * 90;
        vt.tilt.v += (x < vt.v.x ? 1 : -1) * (0.4 + p * 0.8);
        burst(vt.i, Math.round(4 + p * 10));
      }
      // a big blow discharges both coils; an ordinary stomp now and then sets off the nearer one
      if (p > 0.6) {
        fire(0, p > 0.8);
        fire(1, p > 0.8);
      } else if (crand() < 0.4) fire(x < W / 2 ? 0 : 1);
      ladPh = 0;
      staticT = Math.max(staticT, 0.12 + p * 0.25);
      const n = Math.round(4 + p * 14);
      for (let i = 0; i < n; i++) {
        const gx = Phaser.Math.Clamp(x + (crand() - 0.5) * 900, 10, W - 10);
        grit.spawn({ x: gx, y: DL.ceil + 8, vx: (crand() - 0.5) * 20, vy: 10 + crand() * 30, life: 1.4 + crand(), r0: 1.4 + crand() * 1.6, a: 0.85, tint: 0xa8a0c0, grav: 600, floor: DL.floor + 10 + crand() * 60 });
      }
      for (let i = 0; i < Math.round(2 + p * 3); i++) dust.spawn({ x: 200 + crand() * 1520, y: DL.ceil + 10, vx: (crand() - 0.5) * 30, vy: 10 + crand() * 20, life: 1.6 + crand(), r0: 8, r1: 26, a: 0.22, tint: 0x8a90b0, drag: 0.8, fade: 0.1 });
    },
    update(dt, t) {
      shown += (target - shown) * Math.min(1, dt * 0.6);
      const cm = calm();
      const alarm = smooth(0.45, 0.62, shown) * (1 - 0.6 * smooth(0.85, 1, shown));
      const power = smooth(0.82, 1, shown);
      // ——— the light
      // red alert: the room goes red, pulsing with the beacons; the failing power: the room drops to a cold dim
      // (the lab's own lights, over the washes, stay bright in it), with a stutter now and then
      // the night shift from the second wave: the room's light a little lower and cooler
      hushW.setAlpha(0.22 * smooth(0.12, 0.36, shown) * (1 - power));
      alarmW.setAlpha(alarm * (0.55 + 0.22 * Math.max(0, Math.sin(t * P2 * 0.85))));
      const stutter = power > 0 && Math.sin(t * 1.7) > 0.96 ? (Math.sin(t * 60) > 0 ? 0.12 : 0) : 0;
      dimW.setAlpha(power * (0.64 + stutter));
      if (power > 0.5) {
        nextSurge -= dt;
        if (nextSurge <= 0) {
          nextSurge = 6 + crand() * 5;
          surge();
        }
      }
      if (power > 0.5) {
        pipeNext -= dt;
        if (pipeNext <= 0) {
          pipeNext = 1.6 + crand() * 2.6;
          pipeSparks(6 + Math.floor(crand() * 8));
        }
      }
      let dip = 0;
      if (surgeT >= 0) {
        surgeT += dt;
        // the lights dip in steps and stutter back
        const seq = [0.75, 0.2, 0.7, 0.55, 0.65, 0.3, 0.45, 0.2, 0.1, 0];
        const i = Math.min(seq.length - 1, Math.floor(surgeT / 0.08));
        dip = seq[i];
        if (i >= seq.length - 1) surgeT = -1;
      }
      dipW.setAlpha(dip * 0.8);
      // ——— the vats
      for (const vt of vats) {
        vt.loop.step(dt, cm * (1 + dip));
        const b = vt.bob.step(0, dt);
        const tl = vt.tilt.step(0, dt);
        // it drifts and bobs on its cable, twitches (its frames), and a stomp jolts it on its springs
        vt.px = vt.s.x + wander(t * 0.4, vt.i * 3) * 3 * cm;
        vt.py = vt.s.y + Math.sin(t * 0.9 + vt.i * 2) * 5 * cm + b * 0.25;
        vt.rot = (wander(t * 0.3, vt.i * 5 + 1) * 0.03 + tl * 0.05) * cm;
        vt.spec.step(dt, cm * (1 + Math.abs(tl) * 4));
        vt.spec.each((im) => im.setPosition(vt.px, vt.py).setRotation(vt.rot));
        vt.glow.setAlpha((0.14 + 0.04 * Math.sin(t * 1.3 + vt.i * 2)) * (1 + dip * 1.5 + power * 0.9));
      }
      const rv = vats[1];
      const [cox, coy] = rot(rv.px + CORE_AT.x - SPEC.w / 2, rv.py + CORE_AT.y, rv.px, rv.py, rv.rot);
      core.setPosition(cox, coy).setAlpha((0.4 + 0.3 * Math.max(0, Math.sin(t * 4))) * (1 - dip * 0.5));
      for (const bb of bubbles) bb.update(dt);
      // ——— the coils: each fires on its own beat, faster every wave
      const every = 3.4 - 2 * shown;
      for (const [i, co] of coils.entries()) {
        co.next -= dt * cm;
        if (co.next <= 0) {
          co.next = every * (0.6 + crand() * 0.8);
          fire(i, power > 0.5 && crand() < 0.3);
        }
        let v = 0;
        if (co.t >= 0) {
          co.t += dt;
          // a strike, a flicker, a re-strike, dying
          const seq = [1, 0.3, 1, 0.85, 0.4, 1, 0.7, 0.35, 0.15, 0];
          const si = Math.min(seq.length - 1, Math.floor(co.t / 0.055));
          v = seq[si];
          if ((si === 2 || si === 5) && co.arc.alpha < 0.5) co.arc.setFrame(Math.floor(crand() * ARC_N));
          if (si >= seq.length - 1) co.t = -1;
        }
        co.arc.setAlpha(v);
        // the krackle reshuffles as it crackles; the hit flash pops on each strike
        if (v > 0) {
          const kf = Math.floor(co.t / 0.07) % KR_N;
          co.kr0.setFrame(kf);
          co.kr1.setFrame((kf + 2) % KR_N);
        }
        co.hit.setAlpha(v >= 1 ? 1 : v * 0.3).setScale(0.6 + v * 0.5).setRotation(co.t * 3);
        co.kr0.setAlpha(v * 0.95).setScale(0.5 + v * 0.3);
        co.kr1.setAlpha(v * 0.9).setScale(0.4 + v * 0.22);
        co.hornGlow.setAlpha(v * 0.5);
        co.glow.setAlpha((0.12 + 0.05 * Math.sin(t * 7 + i) + v * 0.3) * (1 - dip * 0.5));
      }
      flash.setAlpha(Math.max(coils[0].arc.alpha, coils[1].arc.alpha) * 0.04 * cm + dip * 0.04);
      sparks.update(dt);
      // ——— the ladder climbs, breaks, strikes again
      ladPh = (ladPh + dt * 9 * cm * (1 + power * 0.5)) % LAD_N;
      ladder.show(ladPh);
      const lu = ladPh / LAD_N;
      ladGlow.setPosition(DL.ladder.x, DL.ladder.foot - 80 - (DL.ladder.foot - 80 - DL.ladder.top) * Math.min(1, lu / 0.82) ** 1.3).setAlpha(lu < 0.88 ? 0.2 + crand() * 0.08 : 0.02);
      // ——— the beacons: on from the second wave, faster in the alarm
      const bon = smooth(0.18, 0.3, shown);
      beaconK += (bon - beaconK) * Math.min(1, dt * 2);
      for (const bc of beacons) {
        bc.ph = (bc.ph + dt * (0.9 + alarm * 0.8) * cm * (beaconK > 0.05 ? 1 : 0)) % 1;
        const a = bc.ph * P2;
        bc.loop.show(bc.ph * BEACON_N);
        bc.loop.alpha = beaconK;
        const sa = Math.sin(a);
        const face = Math.cos(a);
        bc.beam.setRotation(sa >= 0 ? 0 : Math.PI).setScale(Math.abs(sa) * 1.2 + 0.05, 1).setAlpha(beaconK * (0.25 + 0.45 * Math.max(0, face) + 0.2 * Math.abs(sa)) * (1 - power * 0.3));
        bc.wallLight.setPosition(bc.b.x + sa * 300, bc.b.y + 100).setAlpha(beaconK * (0.14 + 0.16 * Math.abs(sa)) * (1 + 1.2 * alarm));
        bc.halo.setAlpha(beaconK * (0.3 + 0.5 * Math.max(0, face)));
      }
      // ——— the monitors
      staticT = Math.max(0, staticT - dt);
      for (const mo of mons) {
        mo.ph = (mo.ph + dt * mo.fps * cm) % SCOPE_N;
        // failing power: the screens drop out to dark and snow, and come back
        const out = power > 0.5 && Math.sin(t * 0.9 + mo.fps) > 0.2 ? (Math.sin(t * 7 + mo.fps) > 0.6 ? SCOPE_N : SCOPE_N + 1) : -1;
        mo.img.setFrame(staticT > 0 ? SCOPE_N : out >= 0 ? out : Math.floor(mo.ph));
        mo.glow.setAlpha((0.1 + 0.02 * Math.sin(t * 9)) * (1 - dip));
      }
      // ——— the console's lamps blink, red ones racing in the alarm; the emblem breathes
      for (const l of lamps) {
        const on = Math.sin(t * (1.3 + (l.seed % 1.7)) + l.seed * 5) > (l.red ? 0.2 - alarm * 0.8 : 0.1);
        const fast = l.red && alarm > 0.3 ? Math.sin(t * 12 + l.seed) > 0 : true;
        const dead = power > 0.5 && l.seed % 2.74 < 1.37;
        l.g.setAlpha(on && fast && !dead ? (0.6 + 0.2 * Math.sin(t * 20 + l.seed)) * (1 - dip) : 0.05);
      }
      emblem.setAlpha((0.14 + 0.06 * Math.sin(t * 1.1)) * (1 + alarm * 0.5) * (1 - dip * 0.6));
      knifeGlow.setAlpha(surgeT >= 0 ? 0.6 * (crand() < 0.5 ? 1 : 0.2) : 0);
      grit.update(dt);
      dust.update(dt);
    },
  };
});
