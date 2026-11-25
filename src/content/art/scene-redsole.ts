// The HYDRANT Bunker (the Red Sole's arena: the comic-hero nemesis mini-boss met with Captain Pizzeria equipped, in
// place of Ultoe at wave 68; src/game/nemesis.ts), redrawn with the location kit (src/art/scene) in Act 7's pulp-comic
// print (src/art/scene/print.ts), of a piece with the Doom Lab above it (scene-doomlab.ts) and Metropizza
// (scene-metropizza.ts): bold ink weighted on the shadow side, flat fields modelled in halftone dots at the printed
// screen angles, hatching in the deepest shade, at the painterly fidelity of the recent arenas.
//
// HYDRANT's war bunker, deep under the Doom Lab: a reinforced-concrete command hall under a barrel vault, seen down its
// length. Board-formed concrete (the shuttering's boards, the lifts of each pour, the form-tie holes on one grid,
// efflorescence and rust weeping from them), the vault's ribs coming towards us out of the dark, two piers carrying the
// end wall's rib. In the middle a riveted steel blast door, HYDRANT's mark (a fire hydrant whose foot becomes six
// tentacles: our own emblem) painted across its leaves, and in front of it, on a stepped steel dais, the EMPTY CRADLE
// the Cosmic Crouton was stolen from: a bronze crescent on a pedestal of copper coils, still glowing blue. Crimson
// banners hang before the piers. On the left the war map of Metropizza, back-lit, its pins and arrows closing on
// Captain Pizzeria's pizzeria, over a plan chest with the hotline telephone. On the right the fire mains come down out
// of the vault into a manifold of handwheel valves and gauges, over a bank of old valve-and-dial consoles. Two alarm
// beacons on the walls of the side bays. The table is a steel war-room table: dark plate, rivets on its seams, a
// plotting grid worn nearly away, a hazard-painted lip.
//
// Lit by a cold key off the upper left, red from the alarm beacons, blue from the cradle.
//
// Live, the heroes:
// - the alarm beacons: a painted reflector turning in each fresnel glass (12 frames), its beam sweeping the dusty air,
//   its spot racing along the concrete, and the red light it throws (live-only layers of the walls lit red, laid on
//   with ADD) waxing and waning on each side as the reflector turns; a stomp jolts them on springs;
// - the cradle: its blue field painted at 16 phases (a ghost of the cube turning in it, arcs crackling between the
//   bronze horns, Kirby krackle on the tips), its glow breathing on the door and the floor;
// - the banners, the pipes: the cloth painted at 12 phases by a small cloth renderer (folds travelling down the
//   cloth, lit from the left, printed in dots) stirring in the vent draught; steam hissing from three pipe joints in
//   a painted billowing loop, drips off the manifold, needles trembling in the gauges.
// Stomps: grit and dust shake off the vault's ribs, the nearest pipe joint spits steam, the beacons jolt, the banners
// swing.
// The fight (src/game/bosses/comics.ts, the redsole brain) drives it: 'redsole-cube' (the cube charging over a lane:
// the cradle flares and its arcs reach up to the cube until 'redsole-cube-end'), 'redsole-backfire' (the cradle
// blows a burst of krackle and gutters), 'redsole-beam' (the beam lands: a blue flash on the walls),
// 'redsole-turret' (the turrets rise: the mains shudder, the handwheels spin, the gauges slam over and every joint
// sprays), 'redsole-capped' (a turret capped: the pressure drops), 'redsole-blitz' (each goose-step: the banners
// and the lights shake, dust falls). Listeners go on scene SHUTDOWN. On the stages page the arena runs a demo cycle.
// (The old art is kept in scenes-comics.ts for the before/after page.)

import Phaser from 'phaser';
import { type Box, type Ctx, type PathFn, type R, TY, W, calmLanes, castShadow, crevice, ellPath, glowAt, gradeAll, groundShadow, lightPool, polyPath, rectPath, rrPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { aoHalo } from '../../art/scene/light';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { chips, crack, grime, lay, noiseMask, surface } from '../../art/scene/paint';
import { bolt, boltPath, dots, flat, hatch, ink, linTone, radTone } from '../../art/scene/print';
import { makeCanvas, mix, rgba } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, registerKitScene, wander } from '../../game/sceneLive';
import { Loop, Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { BLOCK, INK, P2, smooth } from './scene-metropizza';

// ——— layout ———

export const RS = {
  /** The vanishing point (the eye), the end wall's arch (the rib's outer edge, before the wall's inset). */
  vp: { x: 960, y: 300 },
  arch: { cx: 960, cy: 616, rx: 1180, ry: 520 },
  /** The ribs' depth (px at the end wall), the end wall's depth behind the piers' faces (scale about the eye). */
  rib: 46,
  wall: 0.94,
  /** The ribs coming towards us, as scales about the eye. */
  ribs: [1.34, 1.86],
  /** The end wall's foot; the table's front edge. */
  floor: 620,
  front: 1040,
  piers: [560, 1360],
  pierW: 110,
  door: { x0: 786, x1: 1134, top: 292, lintel: 252 },
  cradle: { x: 960, y: 560 },
  dais: { y: 652 },
  beacons: [
    { x: 318, y: 238 },
    { x: 1602, y: 238 },
  ],
  /** The banners hang from rods on the piers' faces (the rod's middle). */
  banners: [
    { x: 560, y: 214 },
    { x: 1360, y: 214 },
  ],
  map: { x: 86, y: 318, w: 404, h: 210 },
  chest: { x0: 98, x1: 476, top: 548, foot: 646 },
  /** The low fire main along the wall's foot (left and right runs, diving into the floor beside the door). */
  main: { y: 578, r: 12, l: [0, 728], rr: [1192, 1440] },
  /** The right bay: the two mains down out of the vault, the manifold, the valves, the gauges, the console. */
  mains: { xs: [1446, 1838], top: 0, man: 420, r: 15 },
  valves: [1560, 1720],
  gauges: [
    { x: 1640, y: 350, r: 24 },
    { x: 1838, y: 300, r: 20 },
  ],
  console: { x0: 1432, x1: 1852, top: 470, lip: 522, foot: 648 },
  /** Steam leaks (x, y, direction): a joint on the low main, a flange on the manifold, the top of the left riser. */
  leaks: [
    { x: 716, y: 566, a: -1.9 },
    { x: 1520, y: 406, a: -1.3 },
    { x: 1460, y: 232, a: -2.6 },
  ],
};

const VP = RS.vp;
const FLOOR = RS.floor;

// palette: cold concrete, gunmetal, crimson, bronze, the cradle's blue
const CON = '#58525e';
const SHADE = '#160c20';
const STEEL = '#4a5058';
const OLIVE = '#47504a';
const CRIMSON = '#a3162a';
const BRONZE = '#c88a3c';
const BRONZE_LIT = '#ffd896';
const BLUE = '#5fb8ff';
const BLUE_HOT = '#d8f2ff';
const RED_L = '#ff3a2a';
const MAIN = '#86241e';
const HAZ = '#d8a428';

// ——— geometry ———

/** The arch's y at screen x: the end wall's (s = 1) or a rib nearer us (s > 1), scaled about the eye; inset pulls the
 * ellipse in (the rib's inner edge). NaN beyond its springing. */
function archY(x: number, s = 1, inset = 0): number {
  const bx = VP.x + (x - VP.x) / s;
  const rx = RS.arch.rx - inset;
  const ry = RS.arch.ry - inset;
  const u = (bx - RS.arch.cx) / rx;
  if (Math.abs(u) >= 1) return NaN;
  return VP.y + (RS.arch.cy - ry * Math.sqrt(1 - u * u) - VP.y) * s;
}

/** The end wall's top edge (under its rib). */
const wallTop = (x: number): number => archY(x, RS.wall, RS.rib);

function curve(c: Ctx, s: number, inset: number, x0: number, x1: number, lead: boolean): void {
  const step = x1 > x0 ? 12 : -12;
  for (let x = x0; step > 0 ? x <= x1 : x >= x1; x += step) {
    const y = archY(x, s, inset);
    if (lead && x === x0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
}

/** The band between two arch curves (s0, inset0) above and (s1, inset1) below, across the screen. */
function bandPath(s0: number, i0: number, s1: number, i1: number): PathFn {
  return (c) => {
    c.beginPath();
    curve(c, s0, i0, -12, W + 12, true);
    curve(c, s1, i1, W + 12, -12, false);
    c.closePath();
  };
}

/** Everything under an arch curve, down to y. */
function underPath(s: number, inset: number, y: number): PathFn {
  return (c) => {
    c.beginPath();
    c.moveTo(-12, y);
    curve(c, s, inset, -12, W + 12, false);
    c.lineTo(W + 12, y);
    c.closePath();
  };
}

// ——— small things ———

/** A rivet: a lit dome, inked. */
function rivet(ctx: Ctx, x: number, y: number, s: number, col = '#9aa2b0'): void {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + s * 0.25, y + s * 0.3, s + 0.9, 0, P2);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, P2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - s * 0.35, y - s * 0.35, s * 0.38, 0, P2);
  ctx.fill();
}

/** A form-tie hole: a cone pit in the concrete, its upper-left wall in shade, its lower-right lip lit. */
function tie(ctx: Ctx, x: number, y: number, s = 5): void {
  ctx.fillStyle = rgba('#120a16', 0.7);
  ctx.beginPath();
  ctx.arc(x, y, s, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba('#3a3038', 0.9);
  ctx.beginPath();
  ctx.arc(x + s * 0.3, y + s * 0.3, s * 0.6, 0, P2);
  ctx.fill();
  ctx.strokeStyle = rgba('#d8d0d0', 0.35);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, s + 0.6, -0.2, 1.8);
  ctx.stroke();
}

/** Hazard stripes (ochre and ink) over a path. */
function hazardIn(ctx: Ctx, path: PathFn, box: Box, w = 16, ang = -0.8, col = HAZ): void {
  within(ctx, path, () => {
    ctx.fillStyle = col;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    hatch(ctx, path, box, ang, w * 2, w, INK, 0.92);
  });
}

const tiles = new Map<string, HTMLCanvasElement>();

/** An even dot screen as a repeating tile (45°, dots of tone t): a cheap fill for a band in uniform shade. */
function dotFill(ctx: Ctx, path: PathFn, col: string, step: number, t: number, a = 1): void {
  const key = `${col}:${step}:${t}`;
  let tile = tiles.get(key);
  if (!tile) {
    const T = Math.max(2, Math.round(step * Math.SQRT2));
    const [c, g] = makeCanvas(T, T);
    const rad = step * 0.62 * Math.sqrt(Math.min(1, t));
    g.fillStyle = col;
    g.beginPath();
    for (const [x, y] of [[0, 0], [T, 0], [0, T], [T, T], [T / 2, T / 2]]) {
      g.moveTo(x + rad, y);
      g.arc(x, y, rad, 0, P2);
    }
    g.fill();
    tile = c;
    tiles.set(key, c);
  }
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
  path(ctx);
  ctx.fill();
  ctx.restore();
}

/** The box round a band between two arch curves (screen-clamped). */
function bandBox(s0: number, i0: number, s1: number, i1: number): Box {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let x = 0; x <= W; x += 32) {
    for (const y of [archY(x, s0, i0), archY(x, s1, i1)]) {
      if (Number.isNaN(y)) continue;
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  y0 = Math.max(0, Math.floor(y0) - 2);
  return { x: 0, y: y0, w: W, h: Math.ceil(y1) + 2 - y0 };
}

/** Stains run down from a joint, a tie or a pipe: tapered runs, a soft wide pass and a narrow core, darker at their
 * tide-line (the kit's streaks() without its blur filter, which costs a whole-canvas pass per run). */
function weep(ctx: Ctx, r: R, x: number, y: number, w: number, len: number, col: string, a = 0.2, n = 5): void {
  for (let i = 0; i < n; i++) {
    const sx = x + (r() - 0.5) * w;
    const sl = len * (0.4 + r() * 0.6);
    const sw = 3 + r() * (w / n);
    const g = ctx.createLinearGradient(0, y, 0, y + sl);
    g.addColorStop(0, rgba(col, a * (0.6 + r() * 0.4)));
    g.addColorStop(0.75, rgba(col, a * 0.45));
    g.addColorStop(0.92, rgba(col, a * 0.8));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    for (const k of [1.8, 0.8]) {
      ctx.globalAlpha = k > 1 ? 0.45 : 1;
      ctx.beginPath();
      ctx.moveTo(sx - (sw / 2) * k, y);
      ctx.quadraticCurveTo(sx - sw * 0.4 * k + (r() - 0.5) * 4, y + sl * 0.5, sx - 1, y + sl);
      ctx.lineTo(sx + 1, y + sl);
      ctx.quadraticCurveTo(sx + sw * 0.4 * k + (r() - 0.5) * 4, y + sl * 0.5, sx + (sw / 2) * k, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** A lit cylinder across (a pipe): the body, a highlight band along its top third, the shade printed underneath. */
function pipeH(ctx: Ctx, x0: number, x1: number, y: number, rad: number, col: string, inkW = 2.4): void {
  const p = rectPath(x0, y - rad, x1 - x0, rad * 2);
  flat(ctx, p, col, 0, INK);
  within(ctx, p, () => {
    const g = ctx.createLinearGradient(0, y - rad, 0, y + rad);
    g.addColorStop(0, rgba('#000000', 0.25));
    g.addColorStop(0.22, rgba('#ffffff', 0.28));
    g.addColorStop(0.36, rgba('#ffffff', 0.06));
    g.addColorStop(1, rgba('#000000', 0.35));
    ctx.fillStyle = g;
    ctx.fillRect(x0, y - rad, x1 - x0, rad * 2);
    dots(ctx, { x: x0, y: y - rad, w: x1 - x0, h: rad * 2 }, linTone(0, y, 0, y + rad, 0, 0.85), SHADE, { step: 4, angle: 0.79, a: 0.8 });
  });
  ink(ctx, p, inkW, INK, 0.6);
}

/** A lit cylinder upright (a riser): lit on its left, the shade printed on its right. */
function pipeV(ctx: Ctx, x: number, y0: number, y1: number, rad: number, col: string, inkW = 2.4): void {
  const p = rectPath(x - rad, y0, rad * 2, y1 - y0);
  flat(ctx, p, col, 0, INK);
  within(ctx, p, () => {
    const g = ctx.createLinearGradient(x - rad, 0, x + rad, 0);
    g.addColorStop(0, rgba('#000000', 0.2));
    g.addColorStop(0.22, rgba('#ffffff', 0.3));
    g.addColorStop(0.38, rgba('#ffffff', 0.06));
    g.addColorStop(1, rgba('#000000', 0.38));
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y0, rad * 2, y1 - y0);
    dots(ctx, { x: x - rad, y: y0, w: rad * 2, h: y1 - y0 }, linTone(x, 0, x + rad, 0, 0, 0.85), SHADE, { step: 4, angle: 0.79, a: 0.8 });
  });
  ink(ctx, p, inkW, INK, 0.6);
}

/** A bolted flange round a pipe: a collar a little wider than the pipe, its bolts on one spacing. */
function flange(ctx: Ctx, x: number, y: number, rad: number, vertical: boolean, col: string): void {
  const t = 7;
  const p = vertical ? rrPath(x - rad - 5, y - t / 2, rad * 2 + 10, t, 2) : rrPath(x - t / 2, y - rad - 5, t, rad * 2 + 10, 2);
  flat(ctx, p, mix(col, '#ffffff', 0.12), 2, INK, 0.5);
  if (vertical) for (const dx of [-rad - 1, 0, rad + 1]) rivet(ctx, x + dx, y, 1.6, '#c8b8b0');
  else for (const dy of [-rad - 1, 0, rad + 1]) rivet(ctx, x, y + dy, 1.6, '#c8b8b0');
}

/** HYDRANT's mark (our own): a fire hydrant (domed cap and its nut, collar, two side outlets) whose foot becomes six
 * tentacles curling outward. About 120 px tall at s = 1, centred on (x, y). */
function hydrantMark(ctx: Ctx, x: number, y: number, s: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = col;
  // the tentacles: tapered, curling up at their tips
  for (let k = 0; k < 6; k++) {
    const side = k < 3 ? -1 : 1;
    const j = k % 3;
    const L: [number, number][] = [];
    const Rt: [number, number][] = [];
    let px = side * (3 + j * 6);
    let py = 20;
    let a = Math.PI / 2 - side * (0.12 + j * 0.42);
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const w = 6.5 * (1 - t) ** 0.8 + 0.7;
      const nx = -Math.sin(a);
      const ny = Math.cos(a);
      L.push([px + nx * w, py + ny * w]);
      Rt.push([px - nx * w, py - ny * w]);
      const step = 3.3 - t * 1.4 + (2 - j) * 0.3;
      px += Math.cos(a) * step;
      py += Math.sin(a) * step;
      a -= side * (0.01 + t * t * 0.36);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (const [qx, qy] of L) ctx.lineTo(qx, qy);
    for (let i = Rt.length - 1; i >= 0; i--) ctx.lineTo(Rt[i][0], Rt[i][1]);
    ctx.closePath();
    ctx.fill();
  }
  // the hydrant
  ctx.beginPath();
  ctx.roundRect(-17, -30, 34, 54, 5);
  ctx.fill();
  ctx.fillRect(-23, -37, 46, 9);
  ctx.fillRect(-21, 18, 42, 7);
  ctx.beginPath();
  ctx.arc(0, -37, 17, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-5, -60, 10, 9);
  ctx.beginPath();
  ctx.roundRect(-32, -18, 16, 14, 3);
  ctx.roundRect(16, -18, 16, 14, 3);
  ctx.fill();
  ctx.restore();
}

// ——— the vault ———

const VAULT_BOX: Box = { x: 0, y: 0, w: W, h: 420 };

function vault(ctx: Ctx, r: R): void {
  // the soffit: everything above the end wall's rib, its boards running along the vault (towards the eye)
  const soffit: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-12, -12);
    c.lineTo(W + 12, -12);
    curve(c, 1, 0, W + 12, -12, false);
    c.closePath();
  };
  within(ctx, soffit, () => {
    surface(ctx, r, VAULT_BOX, '#2c2630', { vary: 0.45, cells: 4, mottle: 0.4, strokes: 0.15, grain: 0.2, seed: 11 });
    ctx.lineCap = 'butt';
    for (let a = Math.PI * 1.02; a < Math.PI * 1.98; a += 0.034 + r() * 0.012) {
      const x1 = VP.x + Math.cos(a) * 2400;
      const y1 = VP.y + Math.sin(a) * 2400;
      ctx.strokeStyle = rgba('#0c0610', 0.22 + r() * 0.15);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(VP.x, VP.y);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.strokeStyle = rgba('#a8a0a8', 0.06 + r() * 0.05);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(VP.x + 1.5, VP.y + 1);
      ctx.lineTo(x1 + 1.5, y1 + 1);
      ctx.stroke();
    }
    // a little of the cold key on the vault's left flank; the crown lost in the dark
    const g = ctx.createRadialGradient(260, 260, 40, 260, 260, 720);
    g.addColorStop(0, rgba('#a8b0c8', 0.12));
    g.addColorStop(1, rgba('#a8b0c8', 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 420);
    dots(ctx, VAULT_BOX, (x, y) => 0.5 - 0.25 * smooth(0, 300, y) + 0.12 * smooth(900, W, x), SHADE, { step: 7, angle: 0.79, a: 0.85 });
    // the ribs, the far one first
    for (const s of RS.ribs) {
      const s1 = s * 1.04;
      // the rib's underside: a curved strip seen from below, dark, its far edge in a crevice
      const under = bandPath(s, 0, s1, 0);
      flat(ctx, under, '#231c28', 0, INK);
      dotFill(ctx, under, SHADE, 5, 0.55, 0.8);
      // its face, towards us: concrete in the cold key, the board marks across it, its lower edge chipped
      const face = bandPath(s1, -40, s1, 0);
      const fb = bandBox(s1, -40, s1, 0);
      flat(ctx, face, '#4a424c', 0, INK);
      within(ctx, face, () => {
        surface(ctx, r, fb, '#4a424c', { over: true, vary: 0.5, cells: 3, mottle: 0.4, strokes: 0.1, grain: 0.25, seed: 20 + s * 10 });
        for (let k = 0.15; k < 1; k += 0.2) {
          ctx.strokeStyle = rgba('#140c18', 0.25);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          curve(ctx, s1, -40 * k, -12, W + 12, true);
          ctx.stroke();
        }
        dots(ctx, fb, (x, y) => 0.05 + 0.4 * smooth(VP.x - 100, W, x) - 0.1 * smooth(0, 300, y), SHADE, { step: 6, angle: 0.79, a: 0.85, floor: 0.1 });
      });
      ink(ctx, face, 3, INK, 0.5);
      ink(ctx, under, 2, INK, 0);
      // its shadow on the soffit beyond it (the key is above and behind us)
      ctx.save();
      ctx.strokeStyle = '#06020a';
      for (const [lw, a] of [[34, 0.12], [16, 0.18]] as const) {
        ctx.globalAlpha = a;
        ctx.lineWidth = lw;
        ctx.beginPath();
        curve(ctx, s1, -40 - lw / 2, -12, W + 12, true);
        ctx.stroke();
      }
      ctx.restore();
    }
  });
}

// ——— the end wall ———

const LIFTS = [236, 392, 532];
const TIE_X = Array.from({ length: 16 }, (_, i) => 60 + i * 120);
const TIE_Y = [186, 314, 462];
const WALL_BOX: Box = { x: 0, y: 100, w: W, h: FLOOR + 30 - 100 };

/** Board-formed concrete over a box (clip first): drift, each board's own tone and the grain its wood printed, the
 * lifts of the pours, aggregate and blowholes. */
function concrete(ctx: Ctx, r: R, box: Box, base: string, seed: number, boardJ = true): void {
  surface(ctx, r, box, base, { vary: 0.7, cells: 6, mottle: 0.6, strokes: 0.18, strokeAng: 0, strokeLen: 240, strokeW: 12, grain: 0.26, grainScale: 1.1, seed });
  // each pour a slightly different tone
  let y0 = box.y;
  for (const ly of [...LIFTS, box.y + box.h]) {
    if (ly <= box.y) continue;
    ctx.fillStyle = rgba(r() < 0.5 ? '#d8ccc8' : '#1a1420', 0.03 + r() * 0.04);
    ctx.fillRect(box.x, y0, box.w, Math.min(ly, box.y + box.h) - y0);
    y0 = ly;
  }
  // the boards: each its own tone, its grain printed in long faint lines, a ridge between boards (its top in shade, a
  // lit lip under it), the butt joints staggered
  const y00 = box.y - ((box.y - 9) % 18);
  for (let y = y00; y < box.y + box.h; y += 18) {
    let x = box.x - r() * 300;
    while (x < box.x + box.w) {
      const len = boardJ ? 260 + r() * 300 : box.w + 40;
      ctx.fillStyle = rgba(r() < 0.5 ? '#ece4e8' : '#120a14', 0.025 + r() * 0.045);
      ctx.fillRect(x, y, len, 18);
      for (let g = 0; g < 3; g++) {
        ctx.fillStyle = rgba(r() < 0.4 ? '#e8e0e4' : '#140c16', 0.05 + r() * 0.05);
        ctx.fillRect(x + r() * len * 0.5, y + 2 + r() * 14, len * (0.2 + r() * 0.5), 1);
      }
      if (boardJ) {
        ctx.fillStyle = rgba('#140c18', 0.16);
        ctx.fillRect(x + len, y + 1, 1.4, 16);
      }
      x += len;
    }
    ctx.fillStyle = rgba('#140c18', 0.1 + r() * 0.06);
    ctx.fillRect(box.x, y, box.w, 1.4);
    ctx.fillStyle = rgba('#d8d0d8', 0.05 + r() * 0.03);
    ctx.fillRect(box.x, y + 1.6, box.w, 1);
  }
  // aggregate showing through, blowholes from trapped air
  const n = Math.round((box.w * box.h) / 260);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rgba(r() < 0.5 ? '#d8d0cc' : '#1a121c', 0.12 + r() * 0.12);
    ctx.fillRect(box.x + r() * box.w, box.y + r() * box.h, 1.3, 1.3);
  }
  for (let i = 0; i < n / 14; i++) {
    const bx = box.x + r() * box.w;
    const by = box.y + r() * box.h;
    const br = 0.8 + r() * 1.8;
    ctx.fillStyle = rgba('#100810', 0.45);
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#e0d8dc', 0.22);
    ctx.beginPath();
    ctx.arc(bx + br * 0.4, by + br * 0.5, br * 0.6, 0, Math.PI);
    ctx.fill();
  }
  // the lifts' construction joints: a dark seam with a lit lip and a thin grout bleed under it
  for (const ly of LIFTS) {
    if (ly < box.y || ly > box.y + box.h) continue;
    ctx.fillStyle = rgba('#100810', 0.5);
    ctx.fillRect(box.x, ly - 1.5, box.w, 3);
    ctx.fillStyle = rgba('#e0d8dc', 0.16);
    ctx.fillRect(box.x, ly + 1.5, box.w, 1.5);
    ctx.fillStyle = rgba('#100810', 0.1);
    ctx.fillRect(box.x, ly + 3, box.w, 6);
  }
}

function endWall(ctx: Ctx, r: R): void {
  const wall = underPath(RS.wall, RS.rib, FLOOR);
  within(ctx, wall, () => {
    concrete(ctx, r, WALL_BOX, CON, 31);
    // efflorescence weeping from the lift joints, rust from the ties, damp rising at the foot
    for (const ly of LIFTS) for (let x = 40 + r() * 80; x < W; x += 260 + r() * 260) weep(ctx, r, x, ly + 3, 60, 40 + r() * 70, '#e8e0d8', 0.12, 3);
    for (const ty of TIE_Y) {
      for (const tx of TIE_X) {
        if (ty < wallTop(tx) + 14) continue;
        if (r() < 0.25) weep(ctx, r, tx, ty + 4, 8, 30 + r() * 50, '#8a4a2a', 0.22, 2);
        tie(ctx, tx, ty, 4.6);
      }
    }
    grime(ctx, { x: 0, y: FLOOR - 150, w: W, h: 150 }, { col: '#160c14', a: 0.55, bottom: 120, patchy: 0.6, seed: 4 });
    // the key: cold light off the upper left, the wall going into the dark under the vault and to the right
    const kg = ctx.createRadialGradient(200, 120, 60, 200, 120, 1300);
    kg.addColorStop(0, rgba('#c8d4f0', 0.16));
    kg.addColorStop(1, rgba('#c8d4f0', 0));
    ctx.fillStyle = kg;
    ctx.fillRect(0, 100, W, FLOOR - 100);
    dots(ctx, WALL_BOX, (x, y) => -0.02 + 0.42 * (1 - smooth(wallTop(x) - 10, wallTop(x) + 140, y)) + 0.16 * smooth(900, W, x) + 0.16 * smooth(FLOOR - 120, FLOOR, y), SHADE, { step: 7, angle: 0.79, a: 0.75, floor: 0.08 });
    // under the rib: its occlusion along the wall's top
    ctx.save();
    ctx.strokeStyle = '#0a0410';
    for (const [lw, a] of [[60, 0.12], [36, 0.14], [16, 0.2]] as const) {
      ctx.globalAlpha = a;
      ctx.lineWidth = lw;
      ctx.beginPath();
      curve(ctx, RS.wall, RS.rib, -12, W + 12, true);
      ctx.stroke();
    }
    ctx.restore();
  });
}

/** A pier: its face (in the plane of the ribs) and the return between it and the end wall, an impost under the rib. */
function pier(ctx: Ctx, r: R, cx: number): void {
  const hw = RS.pierW / 2;
  const x0 = cx - hw;
  const x1 = cx + hw;
  const left = cx < VP.x;
  // the face runs from the rib's inner edge (at s = 1) to the floor (at s = 1)
  const yTop = Math.min(archY(x0, 1, RS.rib), archY(x1, 1, RS.rib)) - 4;
  const yFoot = VP.y + (FLOOR - VP.y) / RS.wall;
  // the return: from the face's inner edge back to the wall
  const ex = left ? x1 : x0;
  const [wx, wyTop] = [VP.x + (ex - VP.x) * RS.wall, VP.y + (archY(ex, 1, RS.rib) - VP.y) * RS.wall];
  const ret = polyPath([
    [ex, yTop],
    [wx, wyTop],
    [wx, FLOOR],
    [ex, yFoot],
  ]);
  aoHalo(ctx, rectPath(x0, yTop, x1 - x0, yFoot - yTop), 40, 0.45, '#0a0410', 10);
  flat(ctx, ret, left ? '#2e2834' : '#5a5460', 0, INK);
  within(ctx, ret, () => {
    concrete(ctx, r, { x: Math.min(ex, wx) - 2, y: yTop, w: Math.abs(wx - ex) + 4, h: yFoot - yTop }, left ? '#3a3440' : '#6a6470', 40 + cx, false);
    dots(ctx, { x: Math.min(ex, wx) - 2, y: yTop, w: Math.abs(wx - ex) + 4, h: yFoot - yTop }, () => (left ? 0.62 : 0.25), SHADE, { step: 5, angle: 0.79, a: 0.85 });
  });
  ink(ctx, ret, 2.4, INK, 0.4);
  const face = rectPath(x0, yTop, x1 - x0, yFoot - yTop);
  flat(ctx, face, CON, 0, INK);
  within(ctx, face, () => {
    concrete(ctx, r, { x: x0, y: yTop, w: x1 - x0, h: yFoot - yTop }, '#66606c', 50 + cx, false);
    // the arrises: the left one catching the key, the right one turning into shade
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, rgba('#e0e8ff', 0.2));
    g.addColorStop(0.12, rgba('#e0e8ff', 0.04));
    g.addColorStop(0.8, rgba('#000000', 0.05));
    g.addColorStop(1, rgba('#000000', 0.28));
    ctx.fillStyle = g;
    ctx.fillRect(x0, yTop, x1 - x0, yFoot - yTop);
    dots(ctx, { x: x0, y: yTop, w: x1 - x0, h: yFoot - yTop }, (x, y) => 0.35 * smooth(x0 + 50, x1, x) + 0.3 * (1 - smooth(yTop, yTop + 140, y)) + 0.15 * smooth(yFoot - 90, yFoot, y), SHADE, { step: 6, angle: 0.79, a: 0.8, floor: 0.08 });
    grime(ctx, { x: x0, y: yFoot - 90, w: x1 - x0, h: 90 }, { col: '#140a12', a: 0.6, bottom: 80, patchy: 0.5, seed: cx });
    // a crack from the impost's corner where the rib bears down
    crack(ctx, r, x0 + 14, yTop + 34, 1.75, 70, { col: '#140a10', lip: '#e8e0e0', a: 0.55, w: 1.6 });
  });
  ink(ctx, face, 3, INK, 0.6);
  chips(ctx, r, x0 + 4, x1 - 4, yFoot - 2, 5, '#6a6470', 3.4);
  for (let y = yTop + 60; y < yFoot - 40; y += 70 + r() * 60) chips(ctx, r, x1 - 3, x1 - 1, y, 1, '#6a6470', 3);
  // the impost: a block a little wider than the pier under the rib
  const imp = rectPath(x0 - 8, yTop + 2, x1 - x0 + 16, 20);
  castShadow(ctx, imp, 8, 6, 0.45, '#0a0410');
  flat(ctx, imp, '#7e7882', 2.4, INK, 0.6);
  within(ctx, imp, () => {
    ctx.fillStyle = rgba('#e8ecff', 0.22);
    ctx.fillRect(x0 - 8, yTop + 2, x1 - x0 + 16, 3);
    dots(ctx, { x: x0 - 8, y: yTop + 2, w: x1 - x0 + 16, h: 20 }, linTone(0, yTop + 6, 0, yTop + 22, 0.1, 0.7), SHADE, { step: 4, angle: 0.79 });
  });
}

/** The end wall's rib: its face (towards us) and the thin strip of its underside. */
function wallRib(ctx: Ctx, r: R): void {
  const under = bandPath(1, RS.rib, RS.wall, RS.rib);
  flat(ctx, under, '#1e1822', 0, INK);
  dotFill(ctx, under, SHADE, 4, 0.6, 0.8);
  const face = bandPath(1, 0, 1, RS.rib);
  const fb = bandBox(1, 0, 1, RS.rib);
  flat(ctx, face, '#5a5460', 0, INK);
  within(ctx, face, () => {
    surface(ctx, r, fb, '#5e5864', { over: true, vary: 0.5, cells: 4, mottle: 0.4, strokes: 0.1, grain: 0.25, seed: 61 });
    for (const k of [0.33, 0.66]) {
      ctx.strokeStyle = rgba('#140c18', 0.22);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      curve(ctx, 1, RS.rib * k, -12, W + 12, true);
      ctx.stroke();
    }
    // its soffit edge lit by the key on the left, the right going into shade
    dots(ctx, fb, (x) => 0.04 + 0.45 * smooth(VP.x - 200, W, x), SHADE, { step: 6, angle: 0.79, a: 0.85, floor: 0.1 });
    // spalled where the arch bears: concrete broken off its arris, the rebar showing rusted
    for (const sx of [300, 1640]) {
      const sy = archY(sx, 1, RS.rib) - 12;
      const sp = polyPath([[sx - 30, sy + 12], [sx - 18, sy - 4], [sx + 6, sy - 10], [sx + 30, sy - 2], [sx + 34, sy + 12]]);
      flat(ctx, sp, '#3a3440', 1.6, INK, 0);
      within(ctx, sp, () => {
        ctx.fillStyle = rgba('#8a828e', 0.5);
        ctx.fillRect(sx - 30, sy - 10, 64, 4);
        ctx.strokeStyle = '#6a3018';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx - 30, sy + 4);
        ctx.lineTo(sx + 34, sy + 2);
        ctx.stroke();
      });
      weep(ctx, r, sx, sy + 12, 30, 60, '#7a3a1a', 0.22, 3);
    }
    grime(ctx, fb, { col: '#100810', a: 0.3, top: 40, patchy: 0.7, seed: 62 });
  });
  ink(ctx, face, 3.2, INK, 0.5);
  // the key's glint along the rib's lower arris on the left
  ctx.save();
  ctx.strokeStyle = rgba('#e0e8ff', 0.3);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  curve(ctx, 1, RS.rib - 2, 0, 860, true);
  ctx.stroke();
  ctx.restore();
}

// ——— the blast door ———

const D = RS.door;
const DOOR_BOX: Box = { x: D.x0 - 60, y: D.lintel - 20, w: D.x1 - D.x0 + 120, h: FLOOR + 10 - (D.lintel - 20) };

function door(ctx: Ctx, r: R): void {
  const { x0, x1, top, lintel } = D;
  const mid = (x0 + x1) / 2;
  // the reveal: the opening's concrete returns, in shade, and its sill
  const rev = rectPath(x0 - 26, lintel, x1 - x0 + 52, FLOOR - lintel);
  aoHalo(ctx, rev, 30, 0.5, '#0a0410', 8);
  flat(ctx, rev, '#2a2430', 0, INK);
  within(ctx, rev, () => dots(ctx, { x: x0 - 26, y: lintel, w: x1 - x0 + 52, h: FLOOR - lintel }, () => 0.5, SHADE, { step: 5, angle: 0.79 }));
  // the frame: steel jambs, hazard chevrons up their feet
  for (const [jx, w] of [[x0 - 22, 22], [x1, 22]] as const) {
    const j = rectPath(jx, top - 4, w, FLOOR - top + 4);
    flat(ctx, j, STEEL, 2.4, INK, 0.5);
    within(ctx, j, () => {
      ctx.fillStyle = rgba('#ffffff', 0.16);
      ctx.fillRect(jx, top, 4, FLOOR - top);
      dots(ctx, { x: jx, y: top, w, h: FLOOR - top }, linTone(jx, 0, jx + w, 0, 0.1, 0.6), SHADE, { step: 4, angle: 0.79 });
      hazardIn(ctx, rectPath(jx, FLOOR - 120, w, 120), { x: jx, y: FLOOR - 120, w, h: 120 }, 9, -0.8, '#b8902e');
    });
    for (let y = top + 18; y < FLOOR - 130; y += 40) rivet(ctx, jx + w / 2, y, 2.2, '#9aa2b0');
  }
  // the lintel: a riveted I-beam
  const lb = rectPath(x0 - 60, lintel, x1 - x0 + 120, top - lintel);
  castShadow(ctx, lb, 10, 8, 0.55, '#0a0410');
  flat(ctx, lb, '#525a64', 2.8, INK, 0.6);
  within(ctx, lb, () => {
    ctx.fillStyle = rgba('#e8f0ff', 0.28);
    ctx.fillRect(x0 - 60, lintel, x1 - x0 + 120, 4);
    ctx.fillStyle = rgba('#000000', 0.3);
    ctx.fillRect(x0 - 60, top - 10, x1 - x0 + 120, 10);
    dots(ctx, { x: x0 - 60, y: lintel, w: x1 - x0 + 120, h: top - lintel }, linTone(0, lintel + 8, 0, top, 0.05, 0.7), SHADE, { step: 4, angle: 0.79 });
    ctx.font = `20px ${BLOCK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba('#e8b830', 0.72);
    ctx.fillText('BLAST DOOR  7  ·  AUTHORISED HYDRANT PERSONNEL ONLY', mid, (lintel + top) / 2 + 1);
  });
  for (let x = x0 - 44; x <= x1 + 44; x += 29) rivet(ctx, x, lintel + 7, 2, '#a8b0bc');
  // the two leaves
  const leaf = (lx0: number, lx1: number, side: number) => {
    const p = rectPath(lx0, top, lx1 - lx0, FLOOR - top);
    flat(ctx, p, '#3c4246', 0, INK);
    within(ctx, p, () => {
      surface(ctx, r, { x: lx0, y: top, w: lx1 - lx0, h: FLOOR - top }, '#42484c', { vary: 0.4, cells: 3, mottle: 0.4, strokes: 0.1, grain: 0.22, seed: 70 + side });
      // the plates' seams across
      for (const sy of [456]) {
        ctx.fillStyle = rgba(INK, 0.7);
        ctx.fillRect(lx0, sy - 1, lx1 - lx0, 2.4);
        ctx.fillStyle = rgba('#c8d0dc', 0.25);
        ctx.fillRect(lx0, sy + 1.6, lx1 - lx0, 1.2);
      }
      // scrapes to the red-oxide primer where the leaves are knocked, near the floor and the meeting edge
      for (let i = 0; i < 9; i++) {
        const sx = lx0 + r() * (lx1 - lx0);
        const sy = FLOOR - 10 - r() * 120;
        ctx.fillStyle = rgba('#8a3a24', 0.45);
        ctx.beginPath();
        ctx.ellipse(sx, sy, 6 + r() * 14, 1.5 + r() * 2.5, (r() - 0.5) * 0.3, 0, P2);
        ctx.fill();
      }
      grime(ctx, { x: lx0, y: top, w: lx1 - lx0, h: FLOOR - top }, { col: '#100a10', a: 0.5, bottom: 90, top: 30, patchy: 0.6, seed: 72 + side });
    });
    // the leaf's bevelled border: a thick armoured rim, lit on its top and left, in shade on its right and foot
    const bw = 16;
    for (const [pts, col] of [
      [[[lx0, top], [lx1, top], [lx1 - bw, top + bw], [lx0 + bw, top + bw]], '#8a949e'],
      [[[lx0, top], [lx0 + bw, top + bw], [lx0 + bw, FLOOR - bw], [lx0, FLOOR]], '#6a737c'],
      [[[lx1, top], [lx1, FLOOR], [lx1 - bw, FLOOR - bw], [lx1 - bw, top + bw]], '#2e3438'],
      [[[lx0, FLOOR], [lx0 + bw, FLOOR - bw], [lx1 - bw, FLOOR - bw], [lx1, FLOOR]], '#262a2e'],
    ] as [[number, number][], string][]) flat(ctx, polyPath(pts), col, 1.4, INK, 0);
    // two heavy ribs across, riveted on one spacing
    for (const ry of [372, 540]) {
      const st = rectPath(lx0 + bw, ry - 9, lx1 - lx0 - bw * 2, 18);
      castShadow(ctx, st, 6, 4, 0.5, '#06020a');
      flat(ctx, st, '#4c5458', 1.8, INK, 0.5);
      within(ctx, st, () => {
        ctx.fillStyle = rgba('#e8f0ff', 0.28);
        ctx.fillRect(lx0, ry - 9, lx1 - lx0, 3);
        dots(ctx, { x: lx0, y: ry - 9, w: lx1 - lx0, h: 18 }, linTone(0, ry - 2, 0, ry + 9, 0, 0.75), SHADE, { step: 3.5, angle: 0.79 });
      });
      for (let x = lx0 + bw + 10; x < lx1 - bw - 4; x += 19) rivet(ctx, x, ry, 1.8, '#a0a8b4');
    }
    for (let y = top + 8; y < FLOOR - 6; y += 22) {
      rivet(ctx, lx0 + bw / 2, y, 1.6, '#a0a8b4');
      rivet(ctx, lx1 - bw / 2, y, 1.6, '#80888f');
    }
    // the locking dogs along the meeting edge
    const dx = side < 0 ? lx1 - 2 : lx0 + 2;
    for (const dy2 of [330, 456, 584]) {
      const dg = rrPath(dx - 12, dy2 - 8, 24, 16, 3);
      flat(ctx, dg, '#6a737c', 2, INK, 0.5);
      within(ctx, dg, () => {
        ctx.fillStyle = rgba('#ffffff', 0.3);
        ctx.fillRect(dx - 12, dy2 - 8, 24, 3);
      });
      rivet(ctx, dx + side * 6, dy2, 2, '#c8ccd2');
    }
    // the leaf's shade printed, deepening to the right and down
    within(ctx, p, () => dots(ctx, { x: lx0, y: top, w: lx1 - lx0, h: FLOOR - top }, (x, y) => 0.22 + 0.25 * smooth(lx0, lx1, x) * (side > 0 ? 1.3 : 0.8) + 0.2 * smooth(FLOOR - 160, FLOOR, y), SHADE, { step: 6, angle: 0.79, a: 0.8 }));
    ink(ctx, p, 2.8, INK, 0.6);
    // hinge knuckles on the outer edge
    const hx = side < 0 ? lx0 - 2 : lx1 + 2;
    for (const hy of [top + 40, (top + FLOOR) / 2, FLOOR - 60]) {
      const kp = rrPath(hx - 7, hy - 22, 14, 44, 6);
      flat(ctx, kp, '#5a6268', 2, INK, 0.5);
      within(ctx, kp, () => {
        ctx.fillStyle = rgba('#ffffff', 0.35);
        ctx.fillRect(hx - 5, hy - 20, 3, 40);
        dots(ctx, { x: hx - 7, y: hy - 22, w: 14, h: 44 }, linTone(hx - 3, 0, hx + 7, 0, 0, 0.8), SHADE, { step: 3, angle: 0.79 });
      });
    }
  };
  leaf(x0, mid - 2, -1);
  leaf(mid + 2, x1, 1);
  // the meeting edge: a deep seam
  ctx.fillStyle = INK;
  ctx.fillRect(mid - 2.5, top, 5, FLOOR - top);
  // HYDRANT's mark stencilled across both leaves in oxblood paint, straight on the steel; flaked
  const ex = mid;
  const ey = 430;
  const ER = 80;
  ctx.save();
  const [pc, pg] = makeCanvas(ER * 2 + 8, ER * 2 + 8);
  pg.translate(ER + 4, ER + 4);
  hydrantMark(pg, 0, -4, 1.05, '#6a1a1c');
  // flaked: the paint lost in patches, more at the bottom
  pg.globalCompositeOperation = 'destination-out';
  pg.globalAlpha = 0.55;
  pg.drawImage(noiseMask(6, 91, { cover: 0.3, soft: 0.15 }), -ER - 4, -ER - 4, ER * 2 + 8, ER * 2 + 8);
  pg.globalAlpha = 1;
  ctx.globalAlpha = 0.8;
  ctx.drawImage(pc, ex - ER - 4, ey - ER - 4);
  ctx.restore();
  // the seam cuts through the paint
  ctx.fillStyle = INK;
  ctx.fillRect(mid - 2.5, ey - ER, 5, ER * 2);
  // the drop bar across both leaves, in its brackets
  const by = 492;
  for (const bx of [mid - 110, mid + 110]) {
    const br = rrPath(bx - 14, by - 16, 28, 32, 3);
    flat(ctx, br, '#5a6268', 2.2, INK, 0.5);
    rivet(ctx, bx - 8, by - 10, 1.8);
    rivet(ctx, bx + 8, by + 10, 1.8);
  }
  const bar = rrPath(mid - 160, by - 9, 320, 18, 4);
  castShadow(ctx, bar, 8, 5, 0.55, '#06020a');
  flat(ctx, bar, '#565e68', 2.6, INK, 0.6);
  within(ctx, bar, () => {
    hazardIn(ctx, rectPath(mid - 160, by - 9, 34, 18), { x: mid - 160, y: by - 9, w: 34, h: 18 }, 6, -0.8, '#b8902e');
    hazardIn(ctx, rectPath(mid + 126, by - 9, 34, 18), { x: mid + 126, y: by - 9, w: 34, h: 18 }, 6, -0.8, '#b8902e');
    ctx.fillStyle = rgba('#e8f0ff', 0.35);
    ctx.fillRect(mid - 160, by - 8, 320, 4);
    dots(ctx, { x: mid - 160, y: by - 9, w: 320, h: 18 }, linTone(0, by - 2, 0, by + 9, 0, 0.8), SHADE, { step: 3.5, angle: 0.79 });
  });
  // the threshold: a steel sill plate under the leaves
  const sill = rectPath(x0 - 26, FLOOR - 8, x1 - x0 + 52, 8);
  flat(ctx, sill, '#5a6268', 2, INK, 0.4);
}

// ——— the war map ———

const MAPB = RS.map;
const MAP_BOX: Box = { x: MAPB.x - 40, y: MAPB.y - 40, w: MAPB.w + 80, h: MAPB.h + 90 };

function warMap(ctx: Ctx, r: R): void {
  const { x, y, w, h } = MAPB;
  // its back-light on the wall round the frame
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, x + w / 2, y + h / 2, w * 0.75, '#c8d8c0', 0.12, 0.6);
  ctx.restore();
  const fr = rectPath(x - 12, y - 12, w + 24, h + 24);
  castShadow(ctx, fr, 12, 9, 0.55, '#0a0410');
  flat(ctx, fr, '#3a4040', 2.8, INK, 0.6);
  within(ctx, fr, () => {
    ctx.fillStyle = rgba('#e8f0ff', 0.25);
    ctx.fillRect(x - 12, y - 12, w + 24, 3);
    ctx.fillRect(x - 12, y - 12, 3, h + 24);
    dots(ctx, { x: x - 12, y: y - 12, w: w + 24, h: h + 24 }, linTone(x, y, x + w, y + h, 0.1, 0.6), SHADE, { step: 4, angle: 0.79 });
  });
  // the coordinates along the frame
  ctx.font = `10px ${BLOCK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba('#d8d0b0', 0.75);
  'ABCDEFG'.split('').forEach((l, i) => ctx.fillText(l, x + ((i + 0.5) * w) / 7, y - 6));
  '1234'.split('').forEach((l, i) => ctx.fillText(l, x - 6, y + ((i + 0.5) * h) / 4));
  const m = rectPath(x, y, w, h);
  within(ctx, m, () => {
    // the back-lit chart: paper glowing warm in the middle, falling off to the frame
    const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.45, 20, x + w * 0.5, y + h * 0.5, w * 0.7);
    g.addColorStop(0, '#d8d0aa');
    g.addColorStop(1, '#8a8668');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // the bay on the right, the river winding through the city
    const water = '#6a8494';
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.bezierCurveTo(x + w - 60, y + 40, x + w - 30, y + 110, x + w - 70, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = water;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 50);
    ctx.bezierCurveTo(x + 90, y + 40, x + 120, y + 150, x + 210, y + 140);
    ctx.bezierCurveTo(x + 280, y + 132, x + 300, y + 70, x + w - 46, y + 80);
    ctx.stroke();
    // the street grid, a little rotated, blocks tinted; a park
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-0.08);
    for (let bx = -w * 0.6; bx < w * 0.6; bx += 22) {
      for (let byy = -h * 0.7; byy < h * 0.7; byy += 18) {
        if (r() < 0.25) continue;
        ctx.fillStyle = rgba(r() < 0.15 ? '#7a8a5a' : '#a89a78', 0.35 + r() * 0.25);
        ctx.fillRect(bx + 2, byy + 2, 18, 14);
      }
    }
    ctx.fillStyle = rgba('#5a7a48', 0.6);
    ctx.fillRect(-150, 20, 50, 38);
    ctx.restore();
    ctx.strokeStyle = rgba('#5a4a38', 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = x; gx <= x + w; gx += w / 7) {
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
    }
    for (let gy = y; gy <= y + h; gy += h / 4) {
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
    }
    ctx.stroke();
    // the title cartouche
    flat(ctx, rectPath(x + 10, y + 8, 118, 22), '#e4dcbc', 1.4, '#3a2a20', 0);
    ctx.font = `14px ${BLOCK}`;
    ctx.fillStyle = '#3a2a20';
    ctx.textAlign = 'left';
    ctx.fillText('METROPIZZA', x + 16, y + 20);
    // the target: Captain Pizzeria's pizzeria, circled in yellow grease pencil, a slice on it
    const tx = x + w * 0.56;
    const tyy = y + h * 0.58;
    ctx.strokeStyle = '#e8b81a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(tx, tyy, 22, 18, -0.2, 0, P2);
    ctx.stroke();
    flat(ctx, polyPath([[tx - 7, tyy - 6], [tx + 8, tyy - 6], [tx + 1, tyy + 9]]), '#f0b040', 1.6, INK, 0);
    // the arrows closing in: fat red arrows, inked
    const arrow = (sx: number, sy: number, cx: number, cy: number, ex: number, ey: number) => {
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
      ctx.strokeStyle = '#c8202a';
      ctx.lineWidth = 5.5;
      ctx.stroke();
      const a = Math.atan2(ey - cy, ex - cx);
      const head = polyPath([
        [ex + Math.cos(a) * 12, ey + Math.sin(a) * 12],
        [ex + Math.cos(a + 2.4) * 11, ey + Math.sin(a + 2.4) * 11],
        [ex + Math.cos(a - 2.4) * 11, ey + Math.sin(a - 2.4) * 11],
      ]);
      flat(ctx, head, '#c8202a', 2, INK, 0);
    };
    arrow(x + 30, y + h - 20, x + 110, y + h * 0.5, tx - 30, tyy + 4);
    arrow(x + w - 30, y + 40, x + w * 0.8, y + h * 0.55, tx + 30, tyy - 4);
    arrow(x + w * 0.3, y + 30, x + w * 0.45, y + 50, tx - 8, tyy - 26);
    // pencilled plots
    ctx.strokeStyle = rgba('#3a3040', 0.4);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x + 60, y + 150);
    ctx.lineTo(tx, tyy);
    ctx.lineTo(x + w - 90, y + h - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    // the pins: red for HYDRANT's cells, a few blue for the heroes, each with its shadow and a glint
    const pin = (px: number, py: number, col: string) => {
      ctx.fillStyle = rgba('#1a1010', 0.4);
      ctx.beginPath();
      ctx.ellipse(px + 3, py + 4, 4, 2.5, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(px, py, 5.2, 0, P2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, P2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(px - 1.4, py - 1.4, 1.3, 0, P2);
      ctx.fill();
    };
    for (let i = 0; i < 14; i++) pin(x + 20 + r() * (w - 40), y + 40 + r() * (h - 60), '#d82a2a');
    for (const [px, py] of [[tx - 34, tyy - 30], [tx + 26, tyy + 22], [tx - 4, tyy + 30]]) pin(px, py, '#d82a2a');
    for (let i = 0; i < 4; i++) pin(x + 40 + r() * (w - 80), y + 50 + r() * (h - 80), '#3a7ad8');
    // HYDRANT's flag pinned at the bunker
    hydrantMark(ctx, x + 64, y + h - 52, 0.16, '#1e1a1e');
    // the light behind the chart: warm through the paper, brightest in the middle (it also softens the inks)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const bl = ctx.createRadialGradient(x + w * 0.5, y + h * 0.5, 10, x + w * 0.5, y + h * 0.5, w * 0.6);
    bl.addColorStop(0, rgba('#ffe8b0', 0.32));
    bl.addColorStop(1, rgba('#ffe8b0', 0.08));
    ctx.fillStyle = bl;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    // printed: the chart's falloff; then the glass: a cold glint across it
    dots(ctx, { x, y, w, h }, (px, py) => 0.08 + 0.3 * Math.min(1, Math.hypot((px - x - w / 2) / (w * 0.55), (py - y - h / 2) / (h * 0.6))), '#3a2a20', { step: 4, angle: 0.26, a: 0.55 });
    ctx.fillStyle = rgba('#ffffff', 0.12);
    ctx.beginPath();
    ctx.moveTo(x + 40, y);
    ctx.lineTo(x + 110, y);
    ctx.lineTo(x + 10, y + h);
    ctx.lineTo(x - 60, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.08);
    ctx.fillRect(x, y, w, 3);
  });
  ink(ctx, m, 2, INK, 0);
}

// ——— the alarm beacons (their mounts and their domes at rest) ———

const DOME = { r: 22, h: 34 };

/** A beacon's fresnel dome at a turn of its reflector (0…1): red ribbed glass with the mirror's bright lobe inside it,
 * a domed steel cap, a guard of three bars. Drawn with its base at (x, y). */
function beaconDome(ctx: Ctx, x: number, y: number, ph: number, lit = 1): void {
  const { r, h } = DOME;
  const glass: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - r, y);
    c.lineTo(x - r, y - h + 8);
    c.quadraticCurveTo(x - r, y - h, x - r + 8, y - h);
    c.lineTo(x + r - 8, y - h);
    c.quadraticCurveTo(x + r, y - h, x + r, y - h + 8);
    c.lineTo(x + r, y);
    c.closePath();
  };
  flat(ctx, glass, lit > 0.5 ? '#c8221c' : '#7a1616', 0, INK);
  within(ctx, glass, () => {
    const a = ph * P2;
    const fx = Math.sin(a);
    const face = Math.cos(a);
    const lx = x + fx * r * 0.8;
    const lw = r * (0.3 + 0.8 * Math.max(0, face));
    const k = (0.35 + 0.65 * Math.max(0, face)) * lit;
    ctx.fillStyle = rgba('#ff6a3a', 0.8 * k);
    ctx.beginPath();
    ctx.ellipse(lx, y - h / 2, lw * 1.3, h * 0.6, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#ffd08a', 0.95 * k);
    ctx.beginPath();
    ctx.ellipse(lx, y - h / 2, lw * 0.6, h * 0.4, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.95 * k * (0.3 + 0.7 * Math.max(0, face)));
    ctx.fillRect(lx - Math.max(1.5, lw * 0.22), y - h + 2, Math.max(3, lw * 0.44), h - 4);
    dots(ctx, { x: x - r, y: y - h, w: r * 2, h }, (xx) => 0.7 * Math.min(1, Math.abs(xx - lx) / (r * 1.3)), '#3a0404', { step: 3.4, angle: 0.79 });
    // the fresnel's ribs, curving round the cylinder
    ctx.strokeStyle = rgba('#4a0606', 0.55);
    ctx.lineWidth = 1.1;
    for (let yy = y - 3; yy > y - h; yy -= 5) {
      ctx.beginPath();
      ctx.ellipse(x, yy, r, 2.4, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(x - r + 4, y - h + 6, 3, h - 12);
  });
  ink(ctx, glass, 2.4, INK, 0.5);
  // the cap
  const cap = ellPath(x, y - h, r + 2, 7);
  flat(ctx, cap, '#3a4048', 2.2, INK, 0.5);
  ctx.fillStyle = rgba('#e8f0ff', 0.4);
  ctx.beginPath();
  ctx.ellipse(x - 6, y - h - 2, 8, 2.4, 0, 0, P2);
  ctx.fill();
  // the guard
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  for (const dx of [-0.7, 0, 0.7]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * r * 1.1, y);
    ctx.lineTo(x + dx * r * 1.1, y - h);
    ctx.stroke();
  }
}

function beaconMount(ctx: Ctx, x: number, y: number, side: number): void {
  // its conduit up the wall from the plate into the vault, clipped to the wall on one spacing
  const cx = x - side * 34;
  const ct = archY(cx, RS.wall, RS.rib) - 4;
  ctx.lineCap = 'butt';
  for (const [w, col] of [[9, INK], [5, '#5a6070']] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cx, y + 10);
    ctx.lineTo(cx, ct);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba('#c8d0e0', 0.5);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - 2, y + 8);
  ctx.lineTo(cx - 2, ct);
  ctx.stroke();
  for (let yy = y - 20; yy > ct + 6; yy -= 26) flat(ctx, rectPath(cx - 6, yy, 12, 4), '#6a7080', 1.2, INK, 0);
  // the wall plate and the bracket
  const plate = rrPath(x - 26, y - 4, 52, 30, 4);
  castShadow(ctx, plate, 8, 6, 0.5, '#0a0410');
  flat(ctx, plate, '#5a606a', 2.2, INK, 0.6);
  within(ctx, plate, () => dots(ctx, { x: x - 26, y: y - 4, w: 52, h: 30 }, linTone(x - 20, y, x + 26, y + 26, 0, 0.7), SHADE, { step: 3.5, angle: 0.79 }));
  for (const dx of [-18, 18]) rivet(ctx, x + dx, y + 18, 2);
  const base = rectPath(x - 25, y - 6, 50, 12);
  flat(ctx, base, '#2a2e36', 2.2, INK, 0.5);
  ctx.fillStyle = rgba('#a8b0c0', 0.5);
  ctx.fillRect(x - 25, y - 6, 50, 2.5);
  beaconDome(ctx, x, y - 6, 0.12, 1);
}

// ——— the fire mains and the consoles (the right bay) ———

const MN = RS.mains;
const RIGHT_BOX: Box = { x: 1380, y: 120, w: W - 1380, h: FLOOR + 50 - 120 };

/** A handwheel seen face-on (the valve's spindle at its hub): a rim, five spokes, a hub, painted red. */
export function handwheel(ctx: Ctx, x: number, y: number, rad: number, rot = 0): void {
  wheelBody(ctx, x, y, rad, rot);
  wheelLight(ctx, x, y, rad);
}

/** The handwheel's rim and spokes (the part that turns). */
export function wheelBody(ctx: Ctx, x: number, y: number, rad: number, rot = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * P2;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    ctx.stroke();
    ctx.strokeStyle = '#a8241e';
    ctx.lineWidth = 3.4;
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = '#b8281e';
  ctx.lineWidth = 5.4;
  ctx.stroke();
  ctx.restore();
}

/** The handwheel's light, which stays put while it turns: the rim lit top left, shade bottom right, the hub. */
export function wheelLight(ctx: Ctx, x: number, y: number, rad: number): void {
  ctx.strokeStyle = rgba('#ffc8b0', 0.75);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, y, rad - 0.5, Math.PI * 0.95, Math.PI * 1.55);
  ctx.stroke();
  ctx.strokeStyle = rgba('#200406', 0.6);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(x, y, rad + 0.5, Math.PI * 0.05, Math.PI * 0.6);
  ctx.stroke();
  flat(ctx, ellPath(x, y, 6.5, 6.5), '#8a9098', 2, INK, 0.4);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - 2, y - 2, 1.8, 0, P2);
  ctx.fill();
}

/** A gauge's face (its needle is separate: the live layer moves it). */
function gaugeFace(ctx: Ctx, x: number, y: number, rad: number): void {
  const rim = ellPath(x, y, rad + 4, rad + 4);
  castShadow(ctx, rim, 6, 4, 0.5, '#0a0410');
  flat(ctx, rim, '#b0884a', 2.4, INK, 0.6);
  within(ctx, rim, () => dots(ctx, { x: x - rad - 4, y: y - rad - 4, w: rad * 2 + 8, h: rad * 2 + 8 }, linTone(x - rad, y - rad, x + rad, y + rad, 0, 0.8), '#3a1a08', { step: 3, angle: 0.79 }));
  flat(ctx, ellPath(x, y, rad, rad), '#e8e0c8', 1.6, INK, 0);
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#c8202a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, rad - 4, -Math.PI * 0.25 + 0.05, Math.PI * 0.25 - 0.4 + Math.PI * 0.25);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI * 0.75 + (k / 10) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (rad - 2), y + Math.sin(a) * (rad - 2));
    ctx.lineTo(x + Math.cos(a) * (rad - (k % 5 ? 6 : 9)), y + Math.sin(a) * (rad - (k % 5 ? 6 : 9)));
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = rgba('#ffffff', 0.4);
  ctx.beginPath();
  ctx.ellipse(x - rad * 0.35, y - rad * 0.4, rad * 0.4, rad * 0.18, -0.6, 0, P2);
  ctx.fill();
}

/** A gauge's needle at v (0…1 of its sweep), with its boss. */
export function needle(ctx: Ctx, x: number, y: number, rad: number, v: number): void {
  const a = Math.PI * 0.75 + v * Math.PI * 1.5;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(a) * 4, y - Math.sin(a) * 4);
  ctx.lineTo(x + Math.cos(a) * (rad - 5), y + Math.sin(a) * (rad - 5));
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, P2);
  ctx.fill();
}

export const GAUGE_V = [0.35, 0.55];
export const WHEEL = { r: 30, y: MN.man - MN.r - 62 };

function fittingsStill(ctx: Ctx): void {
  for (const vx of RS.valves) handwheel(ctx, vx, WHEEL.y, WHEEL.r, 0.2);
  RS.gauges.forEach((g, i) => needle(ctx, g.x, g.y, g.r, GAUGE_V[i]));
}

function mains(ctx: Ctx, r: R): void {
  const [xa, xb] = MN.xs;
  const rad = MN.r;
  const yTop = (x: number) => archY(x, 1, 0) - 4;
  // the risers come down out of the vault (behind the rib), into the manifold's elbows
  for (const x of [xa, xb]) {
    aoHalo(ctx, rectPath(x - rad, yTop(x), rad * 2, MN.man - yTop(x)), 14, 0.45, '#0a0410', 6);
    pipeV(ctx, x, yTop(x), MN.man, rad, MAIN);
    for (let y = yTop(x) + 40; y < MN.man - 30; y += 96) flange(ctx, x, y, rad, true, MAIN);
    // wall clamps
    for (let y = yTop(x) + 90; y < MN.man - 20; y += 96) flat(ctx, rectPath(x - rad - 6, y - 3, rad * 2 + 12, 6), '#5a606a', 1.6, INK, 0.4);
  }
  // the manifold across, its elbows at both ends
  aoHalo(ctx, rectPath(xa - rad, MN.man - rad, xb - xa + rad * 2, rad * 2), 16, 0.5, '#0a0410', 8);
  castShadow(ctx, rectPath(xa, MN.man - rad, xb - xa, rad * 2), 10, 6, 0.4, '#0a0410');
  pipeH(ctx, xa, xb, MN.man, rad, MAIN);
  for (const x of [xa, xb]) {
    const el = ellPath(x, MN.man, rad + 3, rad + 3);
    flat(ctx, el, MAIN, 2.4, INK, 0.6);
    within(ctx, el, () => dots(ctx, { x: x - rad - 3, y: MN.man - rad - 3, w: rad * 2 + 6, h: rad * 2 + 6 }, radTone(x - 5, MN.man - 5, rad + 4, 0, 0.85), SHADE, { step: 3.5, angle: 0.79 }));
  }
  for (let x = xa + 64; x < xb - 20; x += 160) flange(ctx, x, MN.man, rad, false, MAIN);
  // chipped paint and rust on the mains
  for (let i = 0; i < 18; i++) {
    const x = xa + r() * (xb - xa);
    ctx.fillStyle = rgba(r() < 0.5 ? '#3a1a10' : '#c86a3a', 0.4);
    ctx.beginPath();
    ctx.ellipse(x, MN.man - rad * 0.3 + r() * rad, 2 + r() * 5, 1 + r() * 2, 0, 0, P2);
    ctx.fill();
  }
  weep(ctx, r, (xa + xb) / 2, MN.man + rad + 2, xb - xa - 60, 90, '#6a2a14', 0.18, 7);
  // the valves: a body on the manifold, the bonnet and spindle up to the handwheel
  for (const vx of RS.valves) {
    const body = rrPath(vx - 20, MN.man - rad - 8, 40, rad * 2 + 16, 6);
    flat(ctx, body, '#8a2a22', 2.4, INK, 0.6);
    within(ctx, body, () => dots(ctx, { x: vx - 20, y: MN.man - rad - 8, w: 40, h: rad * 2 + 16 }, linTone(vx - 14, 0, vx + 20, 0, 0, 0.8), SHADE, { step: 3.5, angle: 0.79 }));
    const bon = polyPath([
      [vx - 13, MN.man - rad - 8],
      [vx - 8, MN.man - rad - 36],
      [vx + 8, MN.man - rad - 36],
      [vx + 13, MN.man - rad - 8],
    ]);
    flat(ctx, bon, '#7a2620', 2.2, INK, 0.6);
    within(ctx, bon, () => dots(ctx, { x: vx - 13, y: MN.man - rad - 36, w: 26, h: 28 }, linTone(vx - 8, 0, vx + 13, 0, 0, 0.8), SHADE, { step: 3.5, angle: 0.79 }));
    pipeV(ctx, vx, MN.man - rad - 62, MN.man - rad - 34, 3.5, '#9aa2ac', 1.6);
  }
  // the gauges' risers
  for (const g of RS.gauges) {
    if (g.x === RS.gauges[0].x) pipeV(ctx, g.x, g.y + g.r, MN.man - rad, 4, '#9aa2ac', 1.6);
    gaugeFace(ctx, g.x, g.y, g.r);
  }
  // feeds down from the manifold into the console's back
  for (const x of [1500, 1780]) {
    pipeV(ctx, x, MN.man + rad - 2, RS.console.top + 8, 9, MAIN, 2);
    flange(ctx, x, MN.man + rad + 14, 9, true, MAIN);
  }
  // a stencil on the wall: the fire main's mark
  ctx.font = `18px ${BLOCK}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = rgba('#d8ccb2', 0.35);
  ctx.fillText('FIRE MAIN B · 12 BAR', (xa + xb) / 2, MN.man + 56);
}

const CON_BOX: Box = { x: RS.console.x0 - 30, y: RS.console.top - 20, w: RS.console.x1 - RS.console.x0 + 70, h: RS.console.foot + 30 - (RS.console.top - 20) };
/** The console's lamps (x, y, colour) along the desk's back edge. */
export const LAMPS: [number, number, string][] = [];
for (let lx = RS.console.x0 + 26; lx < RS.console.x1 - 20; lx += 40) LAMPS.push([lx, RS.console.top + 8, lx % 120 < 40 ? '#ff3a2a' : lx % 120 < 80 ? '#ffb82a' : '#7aff8a']);

function consoleBank(ctx: Ctx, r: R): void {
  const C = RS.console;
  const { x0, x1, top, lip, foot } = C;
  groundShadow(ctx, (x0 + x1) / 2 + 14, foot + 2, (x1 - x0) / 2 + 30, 14, 0.75, '#06020a', 1.2);
  aoHalo(ctx, rectPath(x0, top, x1 - x0, foot - top), 24, 0.45, '#0a0410', 8);
  // the cabinets' fronts
  const front = rectPath(x0, lip, x1 - x0, foot - lip);
  flat(ctx, front, OLIVE, 0, INK);
  within(ctx, front, () => {
    surface(ctx, r, { x: x0, y: lip, w: x1 - x0, h: foot - lip }, '#4c574f', { vary: 0.4, cells: 3, mottle: 0.4, strokes: 0.1, grain: 0.25, seed: 81 });
    // three cabinets on one spacing, louvres, a kick plate scuffed
    const n = 3;
    const cw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * cw;
      ctx.fillStyle = INK;
      ctx.fillRect(cx - 1, lip, 2.4, foot - lip);
      const pan = rectPath(cx + 12, lip + 14, cw - 24, 62);
      flat(ctx, pan, '#56625a', 1.8, INK, 0.5);
      for (let ly = lip + 24; ly < lip + 70; ly += 9) {
        ctx.fillStyle = rgba(INK, 0.8);
        ctx.fillRect(cx + 24, ly, cw - 48, 3);
        ctx.fillStyle = rgba('#c8d8c8', 0.3);
        ctx.fillRect(cx + 24, ly + 3, cw - 48, 1.2);
      }
      for (const [rx, ry] of [[cx + 18, lip + 20], [cx + cw - 18, lip + 20], [cx + 18, lip + 70], [cx + cw - 18, lip + 70]]) rivet(ctx, rx, ry, 1.7, '#a8b0a8');
      ctx.font = `11px ${BLOCK}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba('#e0d8b8', 0.55);
      ctx.fillText(['PUMP 1', 'PRESSURE', 'PUMP 2'][i], cx + cw / 2, lip + 96);
    }
    const kick = rectPath(x0, foot - 18, x1 - x0, 18);
    flat(ctx, kick, '#2a302c', 0, INK);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = rgba('#a8b0a0', 0.25);
      ctx.fillRect(x0 + r() * (x1 - x0), foot - 16 + r() * 12, 6 + r() * 20, 1.4);
    }
    grime(ctx, { x: x0, y: lip, w: x1 - x0, h: foot - lip }, { col: '#100a0c', a: 0.5, bottom: 60, patchy: 0.5, seed: 83 });
    dots(ctx, { x: x0, y: lip, w: x1 - x0, h: foot - lip }, (x, y) => 0.3 + 0.2 * smooth(x0, x1, x) + 0.25 * smooth(lip, foot, y), SHADE, { step: 5, angle: 0.79, a: 0.85 });
  });
  ink(ctx, front, 3, INK, 0.6);
  // the sloping desk: dials, toggles, lamps, a big lever
  const desk = polyPath([
    [x0 + 14, top],
    [x1 - 14, top],
    [x1 + 6, lip],
    [x0 - 6, lip],
  ]);
  flat(ctx, desk, '#5e6a62', 0, INK);
  within(ctx, desk, () => {
    surface(ctx, r, { x: x0 - 6, y: top, w: x1 - x0 + 12, h: lip - top }, '#5e6a62', { vary: 0.35, cells: 3, mottle: 0.3, strokes: 0, grain: 0.2, seed: 84 });
    const g = ctx.createLinearGradient(0, top, 0, lip);
    g.addColorStop(0, rgba('#e8f0e8', 0.2));
    g.addColorStop(1, rgba('#000000', 0.15));
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 6, top, x1 - x0 + 12, lip - top);
  });
  ink(ctx, desk, 2.6, INK, 0.5);
  const dy = (top + lip) / 2;
  for (const dx of [1500, 1620, 1740]) {
    const gp = ellPath(dx, dy, 17, 12);
    flat(ctx, gp, '#b0884a', 2, INK, 0.4);
    flat(ctx, ellPath(dx, dy, 13, 9), '#e0d8c0', 1.2, INK, 0);
    needle(ctx, dx, dy + 1, 13, 0.3 + r() * 0.5);
    for (const tx of [dx - 36, dx + 32]) {
      flat(ctx, rrPath(tx - 4, dy - 6, 8, 12, 2), '#2a302c', 1.4, INK, 0);
      ctx.strokeStyle = '#c8ccd0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, dy);
      ctx.lineTo(tx + (r() < 0.5 ? -4 : 4), dy - 9);
      ctx.stroke();
    }
  }
  for (const [lx, ly, col] of LAMPS) flat(ctx, ellPath(lx, ly, 4, 3), mix(col, '#200a0a', 0.45), 1.2, INK, 0);
  // the big lever at the right end
  const lvx = x1 - 30;
  flat(ctx, rrPath(lvx - 10, lip - 18, 20, 16, 3), '#2a302c', 1.8, INK, 0.4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(lvx, lip - 12);
  ctx.lineTo(lvx + 16, top - 30);
  ctx.stroke();
  ctx.strokeStyle = '#b8c0c8';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  flat(ctx, ellPath(lvx + 16, top - 32, 8, 8), '#c8202a', 2, INK, 0.5);
  // HYDRANT's mark on a brass plate
  flat(ctx, rrPath(1620 - 26, lip + 108, 52, 28, 4), '#a8803a', 1.8, INK, 0.4);
  hydrantMark(ctx, 1620, lip + 122, 0.2, '#2a1a10');
}

// ——— the low fire main along the wall's foot ———

const LOW_BOX: Box = { x: 0, y: RS.main.y - 40, w: RS.main.rr[1] + 20, h: 110 };

function lowMain(ctx: Ctx, r: R): void {
  const { y, r: rad, l, rr: rr2 } = RS.main;
  for (const [a, b, dive] of [[l[0] - 10, l[1], l[1]], [rr2[0], rr2[1], rr2[0]]] as const) {
    castShadow(ctx, rectPath(a, y - rad, b - a, rad * 2), 8, 5, 0.45, '#0a0410');
    aoHalo(ctx, rectPath(a, y - rad, b - a, rad * 2), 10, 0.4, '#0a0410', 4);
    // the dive into the floor beside the door: an elbow and a stub to the slab
    pipeV(ctx, dive, y, FLOOR + 6, rad, MAIN);
    pipeH(ctx, a, b, y, rad, MAIN);
    const el = ellPath(dive, y, rad + 2, rad + 2);
    flat(ctx, el, MAIN, 2, INK, 0.5);
    within(ctx, el, () => dots(ctx, { x: dive - rad - 2, y: y - rad - 2, w: rad * 2 + 4, h: rad * 2 + 4 }, radTone(dive - 4, y - 4, rad + 3, 0, 0.85), SHADE, { step: 3.5, angle: 0.79 }));
    flat(ctx, rectPath(dive - rad - 6, FLOOR, rad * 2 + 12, 8), '#4a4e56', 1.8, INK, 0.4);
    // flanges and brackets on the tie grid's spacing (every other column)
    for (const tx of TIE_X) {
      if (tx < a + 20 || tx > b - 20) continue;
      if ((tx - 60) % 240 === 0) {
        flat(ctx, rectPath(tx - 4, y + rad, 8, FLOOR - y - rad), '#4a4e56', 1.6, INK, 0.4);
        flat(ctx, rectPath(tx - 8, y - rad - 3, 16, 6), '#5a606a', 1.6, INK, 0.4);
      } else flange(ctx, tx, y, rad, false, MAIN);
    }
    for (let i = 0; i < 12; i++) {
      const x = a + r() * (b - a);
      ctx.fillStyle = rgba(r() < 0.5 ? '#3a1a10' : '#c86a3a', 0.4);
      ctx.beginPath();
      ctx.ellipse(x, y - rad * 0.3 + r() * rad, 2 + r() * 4, 1 + r() * 1.5, 0, 0, P2);
      ctx.fill();
    }
  }
  // a landing valve on the left run (capped outlet with its chain), by the leak
  const vx = 640;
  flat(ctx, rrPath(vx - 12, y - rad - 22, 24, 22, 4), '#8a2a22', 2, INK, 0.5);
  flat(ctx, ellPath(vx, y - rad - 26, 10, 6), '#b0884a', 2, INK, 0.4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(vx + 9, y - rad - 26);
  ctx.quadraticCurveTo(vx + 18, y, vx + 10, y + rad + 4);
  ctx.stroke();
}

// ——— the plan chest under the map ———

const CH = RS.chest;
const CHEST_BOX: Box = { x: CH.x0 - 30, y: CH.top - 70, w: CH.x1 - CH.x0 + 70, h: CH.foot + 30 - (CH.top - 70) };

function chest(ctx: Ctx, r: R): void {
  const { x0, x1, top, foot } = CH;
  groundShadow(ctx, (x0 + x1) / 2 + 16, foot + 2, (x1 - x0) / 2 + 30, 14, 0.8, '#06020a', 1.2);
  // the top slab (seen a little from above)
  const lid = polyPath([
    [x0 + 6, top - 10],
    [x1 - 6, top - 10],
    [x1 + 4, top],
    [x0 - 4, top],
  ]);
  flat(ctx, lid, '#6a766e', 2.4, INK, 0.5);
  within(ctx, lid, () => {
    ctx.fillStyle = rgba('#e8f0e8', 0.2);
    ctx.fillRect(x0, top - 10, x1 - x0, 3);
  });
  const body = rectPath(x0 - 4, top, x1 - x0 + 8, foot - top);
  flat(ctx, body, OLIVE, 0, INK);
  within(ctx, body, () => {
    surface(ctx, r, { x: x0 - 4, y: top, w: x1 - x0 + 8, h: foot - top }, '#4c574f', { vary: 0.4, cells: 3, mottle: 0.4, strokes: 0.1, grain: 0.25, seed: 91 });
    // drawers: four across, three high, handles on one spacing
    const cols = 4;
    const rows = 3;
    const dw = (x1 - x0) / cols;
    const dh = (foot - top - 14) / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const dx = x0 + i * dw;
        const dy = top + 4 + j * dh;
        const dp = rectPath(dx + 3, dy + 2, dw - 6, dh - 4);
        flat(ctx, dp, '#56625a', 1.6, INK, 0.5);
        within(ctx, dp, () => {
          ctx.fillStyle = rgba('#e8f0e8', 0.16);
          ctx.fillRect(dx + 3, dy + 2, dw - 6, 2);
        });
        // a cup pull and a card holder
        const cup: PathFn = (c) => {
          c.beginPath();
          c.moveTo(dx + dw / 2 - 12, dy + dh / 2 - 2);
          c.lineTo(dx + dw / 2 + 12, dy + dh / 2 - 2);
          c.quadraticCurveTo(dx + dw / 2 + 12, dy + dh / 2 + 6, dx + dw / 2, dy + dh / 2 + 6);
          c.quadraticCurveTo(dx + dw / 2 - 12, dy + dh / 2 + 6, dx + dw / 2 - 12, dy + dh / 2 - 2);
          c.closePath();
        };
        flat(ctx, cup, '#a8b0a8', 1.4, INK, 0.3);
        ctx.fillStyle = rgba(INK, 0.6);
        ctx.fillRect(dx + dw / 2 - 10, dy + dh / 2 - 2, 20, 2);
        flat(ctx, rectPath(dx + dw / 2 - 9, dy + 6, 18, 6), '#c8c0a0', 1, INK, 0);
      }
    }
    grime(ctx, { x: x0 - 4, y: top, w: x1 - x0 + 8, h: foot - top }, { col: '#100a0c', a: 0.5, bottom: 40, patchy: 0.5, seed: 93 });
    dots(ctx, { x: x0 - 4, y: top, w: x1 - x0 + 8, h: foot - top }, (x, y) => 0.25 + 0.25 * smooth(x0, x1, x) + 0.2 * smooth(top, foot, y), SHADE, { step: 5, angle: 0.79, a: 0.85 });
  });
  ink(ctx, body, 3, INK, 0.6);
  // on it: dossiers stamped in red, and the hotline telephone (red, of course)
  const fx = x0 + 40;
  for (let k = 0; k < 4; k++) {
    const fp = rectPath(fx - 34 + k * 2, top - 14 - k * 5, 68, 6);
    flat(ctx, fp, k % 2 ? '#c8b088' : '#b89a70', 1.4, INK, 0.3);
  }
  ctx.fillStyle = rgba('#c8202a', 0.8);
  ctx.fillRect(fx - 14, top - 32, 28, 3);
  const px = x1 - 70;
  const py = top - 12;
  groundShadow(ctx, px + 6, py + 2, 34, 5, 0.6, '#06020a');
  const ph: PathFn = (c) => {
    c.beginPath();
    c.moveTo(px - 30, py);
    c.lineTo(px - 22, py - 26);
    c.lineTo(px + 22, py - 26);
    c.lineTo(px + 30, py);
    c.closePath();
  };
  flat(ctx, ph, '#b81c22', 2.4, INK, 0.6);
  within(ctx, ph, () => {
    ctx.fillStyle = rgba('#ffb0a0', 0.4);
    ctx.fillRect(px - 26, py - 26, 10, 26);
    dots(ctx, { x: px - 30, y: py - 26, w: 60, h: 26 }, linTone(px - 10, 0, px + 30, 0, 0, 0.8), '#3a0404', { step: 3.4, angle: 0.79 });
  });
  flat(ctx, ellPath(px, py - 14, 9, 9), '#e8e0c8', 1.6, INK, 0);
  const hs: PathFn = (c) => {
    c.beginPath();
    c.moveTo(px - 34, py - 26);
    c.quadraticCurveTo(px - 30, py - 40, px - 20, py - 36);
    c.lineTo(px + 20, py - 36);
    c.quadraticCurveTo(px + 30, py - 40, px + 34, py - 26);
    c.lineTo(px + 24, py - 26);
    c.lineTo(px + 18, py - 30);
    c.lineTo(px - 18, py - 30);
    c.lineTo(px - 24, py - 26);
    c.closePath();
  };
  flat(ctx, hs, '#c8222a', 2.2, INK, 0.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 30, py - 4);
  ctx.bezierCurveTo(px + 56, py + 4, px + 40, py + 20, px + 70, py + 18);
  ctx.stroke();
}

// ——— the floor ———

const FLOOR_BOX: Box = { x: 0, y: FLOOR - 2, w: W, h: TY + 2 - (FLOOR - 2) };
const atFloor = (x: number, y: number) => VP.x + (x - VP.x) * ((y - VP.y) / (FLOOR - VP.y));

function floorSlab(ctx: Ctx, r: R): void {
  const p = rectPath(0, FLOOR, W, TY - FLOOR);
  within(ctx, p, () => {
    surface(ctx, r, FLOOR_BOX, '#4a444c', { vary: 0.5, cells: 5, mottle: 0.5, strokes: 0.2, strokeAng: 0, strokeLen: 160, strokeW: 10, grain: 0.3, seed: 101 });
    // the slab's joints run to the eye from the piers and the door's jambs; one across
    ctx.strokeStyle = rgba('#100810', 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const x of [-420, 160, RS.piers[0], D.x0 - 26, D.x1 + 26, RS.piers[1], 1760, 2340]) {
      ctx.moveTo(x, FLOOR);
      ctx.lineTo(atFloor(x, TY + 10), TY + 10);
    }
    ctx.moveTo(0, 700);
    ctx.lineTo(W, 700);
    ctx.stroke();
    // the painted safety line along the wall, worn through where boots go
    for (const [a, b] of [[0, 760], [1160, W]] as const) {
      ctx.fillStyle = rgba(HAZ, 0.55);
      ctx.fillRect(a, 646, b - a, 5);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rgba('#3a3438', 0.8);
      ctx.fillRect(r() * W, 646, 4 + r() * 16, 5);
    }
    // oil and water stains, a drain grating by the console
    for (let i = 0; i < 9; i++) {
      const sx = r() * W;
      const sy = 668 + r() * 80;
      const sw = 16 + r() * 36;
      ctx.fillStyle = rgba('#140c14', 0.14 + r() * 0.1);
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * P2;
        const rr2 = 0.7 + r() * 0.45;
        if (k) ctx.lineTo(sx + Math.cos(a) * sw * rr2, sy + Math.sin(a) * sw * 0.22 * rr2);
        else ctx.moveTo(sx + Math.cos(a) * sw * rr2, sy + Math.sin(a) * sw * 0.22 * rr2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#a8b8d8', 0.12);
      ctx.beginPath();
      ctx.ellipse(sx - sw * 0.25, sy - 1, sw * 0.3, 1.4, 0, 0, P2);
      ctx.fill();
    }
    const gx = 1300;
    flat(ctx, ellPath(gx, 716, 40, 9), '#2a262c', 1.8, INK, 0);
    ctx.strokeStyle = rgba('#8a8890', 0.5);
    ctx.lineWidth = 1.2;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(gx + k * 10, 709);
      ctx.lineTo(gx + k * 10, 723);
      ctx.stroke();
    }
    // the light on the floor: the cradle's blue round the dais, red under the beacons, the map's glow
    lightPool(ctx, RS.cradle.x, 668, 360, 60, BLUE, 0.2);
    for (const b of RS.beacons) lightPool(ctx, b.x, 662, 220, 40, RED_L, 0.1);
    lightPool(ctx, MAPB.x + MAPB.w / 2, 660, 240, 30, '#d8d0aa', 0.06);
    dots(ctx, FLOOR_BOX, (x, y) => {
      let t = 0.36 - 0.3 * smooth(FLOOR, TY, y) + 0.12 * smooth(1000, W, x);
      t -= 0.25 * Math.exp(-(((x - RS.cradle.x) / 300) ** 2));
      return t;
    }, SHADE, { step: 6, angle: 0.79, a: 0.85 });
    crevice(ctx, 0, W, FLOOR, 18, 0.6, '#06020a');
  });
  // cables from the cradle's pedestal across the floor to the console, and back to the left pier
  ctx.lineCap = 'round';
  const cable = (pts: [number, number][], w: number) => {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i += 2) ctx.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    };
    ctx.strokeStyle = rgba('#06020a', 0.45);
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
    ctx.strokeStyle = '#2a2830';
    ctx.lineWidth = w - 1;
    path();
    ctx.stroke();
    ctx.strokeStyle = rgba('#a8b0c8', 0.45);
    ctx.lineWidth = 1.4;
    ctx.save();
    ctx.translate(-1.5, -2);
    path();
    ctx.stroke();
    ctx.restore();
  };
  cable([[1060, 664], [1180, 700], [1280, 690], [1380, 680], [1452, 668]], 9);
  cable([[870, 664], [760, 700], [640, 688], [560, 676], [500, 668]], 7);
  // the floor boxes they run into
  for (const [bx, by] of [[1466, 668], [488, 668]] as const) {
    groundShadow(ctx, bx + 6, by + 10, 30, 6, 0.6, '#06020a');
    const bxp = rrPath(bx - 22, by - 12, 44, 22, 3);
    flat(ctx, bxp, '#4a4e56', 2, INK, 0.5);
    within(ctx, bxp, () => {
      ctx.fillStyle = rgba('#e8f0ff', 0.25);
      ctx.fillRect(bx - 22, by - 12, 44, 4);
      hazardIn(ctx, rectPath(bx - 22, by + 2, 44, 8), { x: bx - 22, y: by + 2, w: 44, h: 8 }, 4, -0.8, '#a8862a');
    });
    rivet(ctx, bx - 15, by - 5, 1.6);
    rivet(ctx, bx + 15, by - 5, 1.6);
  }
}

// ——— the cradle ———

const CR = RS.cradle;
const CRADLE_BOX: Box = { x: CR.x - 230, y: CR.y - 120, w: 460, h: RS.dais.y + 44 - (CR.y - 120) };
/** The crescent's span and the horns' tips (the field's arcs strike between them). */
const CRES = { hw: 94, sag: 44, horn: 50 };
export const HORNS: [number, number][] = [
  [CR.x - CRES.hw - 2, CR.y - CRES.horn],
  [CR.x + CRES.hw + 2, CR.y - CRES.horn],
];

function cradle(ctx: Ctx, r: R): void {
  const dy = RS.dais.y;
  // the cradle's own light on the door behind and on the floor
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, CR.x, CR.y - 40, 300, BLUE, 0.18, 0.9);
  glowAt(ctx, CR.x, FLOOR - 40, 240, BLUE, 0.14, 0.5);
  ctx.restore();
  // the dais: two round steel steps, a hazard band on the lower riser
  groundShadow(ctx, CR.x + 18, dy + 18, 200, 26, 0.75, '#06020a', 1.2);
  const step = (cy: number, rx: number, ry: number, hgt: number, hazard: boolean) => {
    const side: PathFn = (c) => {
      c.beginPath();
      c.ellipse(CR.x, cy, rx, ry, 0, 0, Math.PI);
      c.lineTo(CR.x - rx, cy - hgt);
      c.ellipse(CR.x, cy - hgt, rx, ry, 0, Math.PI, 0, true);
      c.closePath();
    };
    flat(ctx, side, '#3a3e46', 0, INK);
    within(ctx, side, () => {
      if (hazard) hazardIn(ctx, side, { x: CR.x - rx, y: cy - hgt - ry, w: rx * 2, h: ry * 2 + hgt + 4 }, 9, -0.8, '#a8862a');
      const g = ctx.createLinearGradient(CR.x - rx, 0, CR.x + rx, 0);
      g.addColorStop(0, rgba('#e8f0ff', 0.15));
      g.addColorStop(0.5, rgba('#000000', 0));
      g.addColorStop(1, rgba('#000000', 0.45));
      ctx.fillStyle = g;
      ctx.fillRect(CR.x - rx, cy - hgt - ry, rx * 2, ry * 2 + hgt + 4);
    });
    ink(ctx, side, 2.6, INK, 0.6);
    const topP = ellPath(CR.x, cy - hgt, rx, ry);
    flat(ctx, topP, '#5a6068', 2.4, INK, 0.4);
    within(ctx, topP, () => {
      // treadplate lugs, the cradle's blue reflected in the middle
      ctx.strokeStyle = rgba('#a8b0c0', 0.35);
      ctx.lineWidth = 1.4;
      for (let yy = cy - hgt - ry + 3; yy < cy - hgt + ry; yy += 6) {
        for (let xx = CR.x - rx + ((yy / 6) % 2) * 6; xx < CR.x + rx; xx += 12) {
          ctx.beginPath();
          ctx.moveTo(xx, yy);
          ctx.lineTo(xx + 4, yy - 1.5);
          ctx.stroke();
        }
      }
      lightPool(ctx, CR.x, cy - hgt, rx * 0.8, ry * 0.9, BLUE, 0.3);
      dots(ctx, { x: CR.x - rx, y: cy - hgt - ry, w: rx * 2, h: ry * 2 }, (x) => 0.15 + 0.35 * smooth(CR.x, CR.x + rx, x), SHADE, { step: 4, angle: 0.79, a: 0.8 });
    });
    for (let k = 0; k < 10; k++) {
      const a = Math.PI * (0.1 + (k / 9) * 0.8);
      rivet(ctx, CR.x + Math.cos(a) * rx * 0.92, cy - hgt + Math.sin(a) * ry * 0.82, 1.6);
    }
  };
  step(dy, 190, 32, 16, true);
  step(dy - 16, 130, 22, 14, false);
  // the pedestal: a riveted column wound with copper coils, tapering to the cradle
  const pTop = CR.y + 12;
  const pBot = dy - 30;
  const ped = polyPath([
    [CR.x - 26, pTop],
    [CR.x + 26, pTop],
    [CR.x + 40, pBot],
    [CR.x - 40, pBot],
  ]);
  castShadow(ctx, ped, 10, 6, 0.4, '#06020a');
  flat(ctx, ped, STEEL, 0, INK);
  within(ctx, ped, () => {
    const g = ctx.createLinearGradient(CR.x - 40, 0, CR.x + 40, 0);
    g.addColorStop(0, '#5a626e');
    g.addColorStop(0.3, '#8a94a2');
    g.addColorStop(0.45, '#5a626e');
    g.addColorStop(1, '#22262e');
    ctx.fillStyle = g;
    ctx.fillRect(CR.x - 40, pTop, 80, pBot - pTop);
    // the coils: copper bands, lit on the left, and the blue light from above on their tops
    for (let yy = pTop + 12; yy < pBot - 8; yy += 7) {
      ctx.fillStyle = INK;
      ctx.fillRect(CR.x - 44, yy, 88, 1.4);
      const cg = ctx.createLinearGradient(CR.x - 40, 0, CR.x + 40, 0);
      cg.addColorStop(0, '#a85a24');
      cg.addColorStop(0.3, '#ffb070');
      cg.addColorStop(0.5, '#c06a2c');
      cg.addColorStop(1, '#3a1a0a');
      ctx.fillStyle = cg;
      ctx.fillRect(CR.x - 44, yy + 1.4, 88, 4.4);
    }
    dots(ctx, { x: CR.x - 40, y: pTop, w: 80, h: pBot - pTop }, linTone(CR.x, 0, CR.x + 40, 0, 0, 0.85), SHADE, { step: 3.5, angle: 0.79 });
  });
  ink(ctx, ped, 2.8, INK, 0.6);
  // the brass plate on its foot: PROPERTY OF HYDRANT
  const pl = rrPath(CR.x - 38, pBot - 4, 76, 22, 3);
  flat(ctx, pl, '#a8803a', 2, INK, 0.5);
  within(ctx, pl, () => {
    ctx.font = `9px ${BLOCK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3a2410';
    ctx.fillText('PROPERTY OF', CR.x, pBot + 2);
    ctx.fillText('HYDRANT', CR.x, pBot + 11);
  });
  // the crescent: heavy cast bronze, a raised rim along its inner edge, rivets on its band, its cup lit blue by what
  // is left of the field
  const { hw, sag } = CRES;
  const cres: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CR.x - hw - 8, CR.y - 22);
    c.bezierCurveTo(CR.x - hw + 4, CR.y + sag + 6, CR.x + hw - 4, CR.y + sag + 6, CR.x + hw + 8, CR.y - 22);
    c.lineTo(CR.x + hw - 14, CR.y - 18);
    c.bezierCurveTo(CR.x + hw - 26, CR.y + sag - 20, CR.x - hw + 26, CR.y + sag - 20, CR.x - hw + 14, CR.y - 18);
    c.closePath();
  };
  const cup: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CR.x - hw + 14, CR.y - 18);
    c.bezierCurveTo(CR.x - hw + 26, CR.y + sag - 20, CR.x + hw - 26, CR.y + sag - 20, CR.x + hw - 14, CR.y - 18);
    c.bezierCurveTo(CR.x + hw - 40, CR.y - 30, CR.x - hw + 40, CR.y - 30, CR.x - hw + 14, CR.y - 18);
    c.closePath();
  };
  // the cup: the empty seat the cube rested in, glowing
  flat(ctx, cup, '#2a4a78', 0, INK);
  within(ctx, cup, () => {
    const g = ctx.createRadialGradient(CR.x, CR.y + 6, 4, CR.x, CR.y, hw);
    g.addColorStop(0, BLUE_HOT);
    g.addColorStop(0.45, rgba(BLUE, 0.9));
    g.addColorStop(1, rgba('#1a3a78', 0.9));
    ctx.fillStyle = g;
    ctx.fillRect(CR.x - hw, CR.y - 32, hw * 2, sag + 20);
  });
  ink(ctx, cup, 1.6, INK, 0);
  castShadow(ctx, cres, 8, 5, 0.4, '#06020a');
  flat(ctx, cres, BRONZE, 0, INK);
  within(ctx, cres, () => {
    const g = ctx.createLinearGradient(0, CR.y - 22, 0, CR.y + sag + 6);
    g.addColorStop(0, BRONZE_LIT);
    g.addColorStop(0.35, BRONZE);
    g.addColorStop(1, '#4a2a0c');
    ctx.fillStyle = g;
    ctx.fillRect(CR.x - hw - 10, CR.y - 24, hw * 2 + 20, sag + 34);
    // the blue light from the cup on its inner rim, the key's glint on its outer shoulder
    ctx.strokeStyle = rgba(BLUE_HOT, 0.8);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(CR.x - hw + 14, CR.y - 16);
    ctx.bezierCurveTo(CR.x - hw + 26, CR.y + sag - 18, CR.x + hw - 26, CR.y + sag - 18, CR.x + hw - 14, CR.y - 16);
    ctx.stroke();
    ctx.strokeStyle = rgba('#fff4d0', 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CR.x - hw - 4, CR.y - 12);
    ctx.bezierCurveTo(CR.x - hw + 6, CR.y + sag - 4, CR.x - 40, CR.y + sag + 4, CR.x - 10, CR.y + sag + 2);
    ctx.stroke();
    // an engraved band along it
    ctx.strokeStyle = rgba('#3a1a04', 0.6);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(CR.x - hw - 2, CR.y - 6);
    ctx.bezierCurveTo(CR.x - hw + 14, CR.y + sag - 6, CR.x + hw - 14, CR.y + sag - 6, CR.x + hw + 2, CR.y - 6);
    ctx.stroke();
    dots(ctx, { x: CR.x - hw - 10, y: CR.y - 24, w: hw * 2 + 20, h: sag + 34 }, (x, y) => 0.05 + 0.5 * smooth(CR.y, CR.y + sag + 6, y) + 0.25 * smooth(CR.x, CR.x + hw, x), '#3a1a04', { step: 3.4, angle: 0.79 });
  });
  ink(ctx, cres, 3, INK, 0.6);
  for (let k = 1; k < 8; k++) {
    const t = k / 8;
    const bx = (1 - t) ** 3 * (CR.x - hw) + 3 * (1 - t) ** 2 * t * (CR.x - hw + 12) + 3 * (1 - t) * t * t * (CR.x + hw - 12) + t ** 3 * (CR.x + hw);
    const by = (1 - t) ** 3 * (CR.y - 6) + 3 * (1 - t) ** 2 * t * (CR.y + sag - 6) + 3 * (1 - t) * t * t * (CR.y + sag - 6) + t ** 3 * (CR.y - 6);
    rivet(ctx, bx, by, 1.8, '#ffd8a0');
  }
  // the horns: bronze posts on knuckles at the crescent's tips, insulator stacks, knobs glowing blue
  for (const [hx, hy] of HORNS) {
    const kn = ellPath(hx, CR.y - 22, 13, 10);
    flat(ctx, kn, BRONZE, 2.4, INK, 0.6);
    within(ctx, kn, () => dots(ctx, { x: hx - 13, y: CR.y - 32, w: 26, h: 20 }, radTone(hx - 5, CR.y - 27, 14, 0, 0.8), '#3a1a04', { step: 3, angle: 0.79 }));
    const post = rrPath(hx - 8, hy, 16, CR.y - 26 - hy, 4);
    flat(ctx, post, BRONZE, 2.4, INK, 0.6);
    within(ctx, post, () => {
      ctx.fillStyle = rgba(BRONZE_LIT, 0.85);
      ctx.fillRect(hx - 6, hy, 4, CR.y - hy);
      dots(ctx, { x: hx - 8, y: hy, w: 16, h: CR.y - hy }, linTone(hx - 2, 0, hx + 8, 0, 0, 0.8), '#3a1a04', { step: 3, angle: 0.79 });
    });
    for (let k = 0; k < 3; k++) {
      const kp = ellPath(hx, hy - 3 - k * 7, 10 - k * 1.8, 3.6);
      flat(ctx, kp, '#a8c8d8', 1.6, INK, 0.3);
      ctx.fillStyle = rgba('#ffffff', 0.6);
      ctx.fillRect(hx - 6 + k, hy - 5 - k * 7, 4, 1.4);
    }
    flat(ctx, ellPath(hx, hy - 26, 7, 7), BLUE_HOT, 2, INK, 0.3);
  }
  void r;
}

/** The cradle's field at phase ph (0…1): the ghost of the cube turning in the cup, arcs crackling between the horns,
 * krackle on the tips. Painted in the frame's own coordinates (FIELD), the cradle's centre at (FIELD.w / 2, FIELD.cy). */
export const FIELD = { w: 260, h: 200, cy: 150 };

export function fieldFrame(c: Ctx, ph: number, seed: number, power = 1): void {
  const cx = FIELD.w / 2;
  const cy = FIELD.cy;
  const rr = mkRng(seed + Math.floor(ph * 997));
  // the residual glow in the cup
  const g = c.createRadialGradient(cx, cy - 30, 4, cx, cy - 30, 90);
  g.addColorStop(0, rgba(BLUE_HOT, 0.4 * power));
  g.addColorStop(0.4, rgba(BLUE, 0.2 * power));
  g.addColorStop(1, rgba(BLUE, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, FIELD.w, FIELD.h);
  // where the cube sat: an empty, square seat of light in the cup, a little brighter than the glow round it
  const seat = cy - 34;
  c.fillStyle = rgba(BLUE_HOT, 0.18 * power);
  c.beginPath();
  c.moveTo(cx, seat - 14);
  c.lineTo(cx + 26, seat - 2);
  c.lineTo(cx, seat + 10);
  c.lineTo(cx - 26, seat - 2);
  c.closePath();
  c.fill();
  const V: [number, number][] = [
    [cx, seat - 30 + (rr() - 0.5) * 10],
    [cx - 24 + rr() * 10, seat - 6],
    [cx + 14 + rr() * 10, seat - 8],
    [cx + (rr() - 0.5) * 20, seat + 4],
  ];
  // arcs: from each horn's knob, jagged, to the cube's ghost and across the cup
  const knobs: [number, number][] = [
    [cx - CRES.hw - 2, cy - CRES.horn - 26],
    [cx + CRES.hw + 2, cy - CRES.horn - 26],
  ];
  const zig = (x0: number, y0: number, x1: number, y1: number, n: number, jag: number) => {
    const pts: [number, number][] = [[x0, y0]];
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const l = Math.hypot(nx, ny) || 1;
    for (let i = 1; i < n; i++) {
      const u = i / n;
      const o = (rr() - 0.5) * jag;
      pts.push([x0 + (x1 - x0) * u + (nx / l) * o, y0 + (y1 - y0) * u + (ny / l) * o]);
    }
    pts.push([x1, y1]);
    return pts;
  };
  const arcs: [number, number][][] = [];
  const nArcs = 2 + Math.floor(rr() * 2);
  for (let i = 0; i < nArcs; i++) {
    const k = knobs[i % 2];
    const tgt = V[Math.floor(rr() * V.length)];
    arcs.push(zig(k[0], k[1], tgt[0], tgt[1], 6, 22));
  }
  if (rr() < 0.5) arcs.push(zig(knobs[0][0], knobs[0][1], knobs[1][0], knobs[1][1], 9, 30));
  for (const pts of arcs) {
    for (const [w, col] of [[6, '#1a3a8a'], [3.6, '#8ad4ff'], [1.4, '#ffffff']] as const) {
      c.strokeStyle = rgba(col, power);
      c.lineWidth = w;
      c.lineJoin = 'round';
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    }
  }
  // krackle on the knobs: blobs of ink inside a white-blue burst
  for (const [kx, ky] of knobs) {
    c.fillStyle = rgba('#bfe8ff', 0.85 * power);
    c.beginPath();
    for (let k = 0; k <= 14; k++) {
      const an = (k / 14) * P2 + rr() * 0.2;
      const rad = (k % 2 ? 6 : 11 + rr() * 4) * (0.8 + power * 0.2);
      if (k) c.lineTo(kx + Math.cos(an) * rad, ky + Math.sin(an) * rad);
      else c.moveTo(kx + Math.cos(an) * rad, ky + Math.sin(an) * rad);
    }
    c.closePath();
    c.fill();
    for (let m = 0; m < 4; m++) {
      const bx = kx + (rr() - 0.5) * 14;
      const by = ky + (rr() - 0.5) * 14;
      const br = 1.4 + rr() * 2;
      c.fillStyle = rgba('#ffffff', power);
      c.beginPath();
      c.arc(bx, by, br + 1.2, 0, P2);
      c.fill();
      c.fillStyle = rgba(INK, power);
      c.beginPath();
      c.arc(bx, by, br, 0, P2);
      c.fill();
    }
  }
  // motes rising off the cup
  for (let i = 0; i < 10; i++) {
    const u = (i / 10 + ph) % 1;
    const mx = cx + Math.sin(i * 2.4 + u * 4) * (30 + i * 3);
    const my = cy - 10 - u * 120;
    c.fillStyle = rgba(BLUE_HOT, 0.8 * (1 - u) * power);
    c.beginPath();
    c.arc(mx, my, 1.6 + (i % 3) * 0.6, 0, P2);
    c.fill();
  }
}

/** A tiny seeded stream for frame painters (their own, so a frame paints the same every time). */
function mkRng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function fieldStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(CR.x - FIELD.w / 2, CR.y - FIELD.cy + 10);
  fieldFrame(ctx, 0.2, 7, 0.7);
  ctx.restore();
}

// ——— the banners ———

/** A banner's frame: the cloth's flat art at BAN size, hung from its rod's middle at (BAN.w / 2, BAN.rod). */
export const BAN = { w: 200, h: 380, cw: 150, ch: 318, rod: 14 };

let flatBanner: HTMLCanvasElement | null = null;

function bannerFlat(): HTMLCanvasElement {
  if (flatBanner) return flatBanner;
  const [c, g] = makeCanvas(BAN.w, BAN.h);
  const x0 = (BAN.w - BAN.cw) / 2;
  const x1 = x0 + BAN.cw;
  const y0 = BAN.rod + 6;
  const y1 = y0 + BAN.ch;
  const tail = 46;
  const cloth: PathFn = (q) => {
    q.beginPath();
    q.moveTo(x0, y0);
    q.lineTo(x1, y0);
    q.lineTo(x1, y1);
    q.lineTo((x0 + x1) / 2, y1 - tail);
    q.lineTo(x0, y1);
    q.closePath();
  };
  flat(g, cloth, CRIMSON, 0, INK);
  within(g, cloth, () => {
    const cg = g.createLinearGradient(0, y0, 0, y1);
    cg.addColorStop(0, '#a81a2c');
    cg.addColorStop(1, '#6a0c18');
    g.fillStyle = cg;
    g.fillRect(x0, y0, BAN.cw, BAN.ch);
    // the weave: faint threads
    g.fillStyle = rgba('#000000', 0.06);
    for (let y = y0; y < y1; y += 3) g.fillRect(x0, y, BAN.cw, 1);
    // gold borders down the sides and the hem
    g.fillStyle = '#c89a3a';
    g.fillRect(x0 + 8, y0, 5, BAN.ch);
    g.fillRect(x1 - 13, y0, 5, BAN.ch);
    g.fillStyle = rgba('#3a1a04', 0.6);
    g.fillRect(x0 + 12, y0, 1.4, BAN.ch);
    g.fillRect(x1 - 9, y0, 1.4, BAN.ch);
    g.strokeStyle = '#c89a3a';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(x0, y1 - 14);
    g.lineTo((x0 + x1) / 2, y1 - tail - 14);
    g.lineTo(x1, y1 - 14);
    g.stroke();
    // the mark in gold on the crimson, in a black-edged gold hexagon (a valve nut's shape)
    const mx = (x0 + x1) / 2;
    const my = y0 + 112;
    const hex: PathFn = (q) => {
      q.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * P2 + Math.PI / 6;
        if (k) q.lineTo(mx + Math.cos(a) * 56, my + Math.sin(a) * 56);
        else q.moveTo(mx + Math.cos(a) * 56, my + Math.sin(a) * 56);
      }
      q.closePath();
    };
    g.lineJoin = 'round';
    g.strokeStyle = INK;
    g.lineWidth = 10;
    hex(g);
    g.stroke();
    g.strokeStyle = '#c89a3a';
    g.lineWidth = 5;
    g.stroke();
    // the mark: an ink shadow under it, the gold over
    hydrantMark(g, mx + 1.5, my + 6.5, 0.64, INK);
    hydrantMark(g, mx, my + 4, 0.64, '#d8a83a');
    // the lower field printed in Ben-Day dots, darker to the hem
    dots(g, { x: x0, y: y0 + 180, w: BAN.cw, h: BAN.ch - 180 }, linTone(0, y0 + 180, 0, y1, 0.05, 0.55), '#2a0208', { step: 6, angle: 0.79, a: 0.7 });
  });
  ink(g, cloth, 3, INK, 0);
  // the sleeve over the rod
  const sl = rectPath(x0 - 2, y0 - 10, BAN.cw + 4, 16);
  flat(g, sl, '#8a1424', 2.4, INK, 0);
  g.fillStyle = rgba('#ff8a8a', 0.25);
  g.fillRect(x0 - 2, y0 - 10, BAN.cw + 4, 4);
  flatBanner = c;
  return c;
}

/** The banner at phase ph (0…1) of its stir, drawn into c (BAN-sized, rod at its top): the cloth rendered pixel by
 * pixel from its flat art, displaced by folds that travel down it and a sway growing towards the hem, lit from the
 * left (a fold turned to the key brighter, one turned away darker), its shade printed in dots. sway adds a swing
 * (px at the hem) for the stomps' kick, baked into the still at 0. */
export function bannerFrame(c: Ctx, ph: number, sway = 0): void {
  const F = bannerFlat();
  const w = BAN.w;
  const h = BAN.h;
  const src = F.getContext('2d')!.getImageData(0, 0, w, h).data;
  const [oc, og] = makeCanvas(w, h);
  const img = og.createImageData(w, h);
  const d = img.data;
  const y0 = BAN.rod + 6;
  const tw = P2 * ph;
  const fold = (u: number, v: number): [number, number] => {
    // three folds whose phases travel down the cloth (whole turns over the loop: it repeats), plus the rod's gathers
    const env = 0.25 + 0.75 * v;
    const f1 = Math.sin(u * 2.1 * Math.PI + tw - v * 3.2) * 7 * env;
    const f2 = Math.sin(u * 4.3 * Math.PI - tw * 2 + v * 2.4 + 1.3) * 2.4 * env;
    const f3 = Math.sin(u * 7 * Math.PI + tw + v * 5) * 1.1 * env;
    const gat = Math.sin(u * 9 * Math.PI) * 1.8 * (1 - v) ** 8;
    const s1 = Math.cos(u * 2.1 * Math.PI + tw - v * 3.2) * 2.1 * Math.PI * 7 * env;
    const s2 = Math.cos(u * 4.3 * Math.PI - tw * 2 + v * 2.4 + 1.3) * 4.3 * Math.PI * 2.4 * env;
    const s3 = Math.cos(u * 7 * Math.PI + tw + v * 5) * 7 * Math.PI * 1.1 * env;
    const sg = Math.cos(u * 9 * Math.PI) * 9 * Math.PI * 1.8 * (1 - v) ** 8;
    return [f1 + f2 + f3 + gat, (s1 + s2 + s3 + sg) / BAN.cw];
  };
  const ca = Math.cos(0.79);
  const sa = Math.sin(0.79);
  const step = 5;
  for (let y = 0; y < h; y++) {
    const v = Math.max(0, (y - y0) / BAN.ch);
    const swing = (Math.sin(tw + v * 1.4) * 4 + sway) * v ** 1.5;
    for (let x = 0; x < w; x++) {
      const u = (x - (w - BAN.cw) / 2) / BAN.cw;
      const [dx, slope] = fold(u, v);
      const sx = Math.round(x - swing - dx * 0.35);
      if (sx < 0 || sx >= w) continue;
      const si = (y * w + sx) * 4;
      const al = src[si + 3];
      if (!al) continue;
      // lit from the left: a fold facing left (slope < 0) catches the key
      let k = 1 - slope * 0.6;
      k = Math.max(0.5, Math.min(1.35, k));
      // the shade printed: dots where it's dark (a 45° screen)
      if (k < 0.92) {
        const ru = x * ca + y * sa;
        const rv = -x * sa + y * ca;
        const cu = ru - Math.round(ru / step) * step;
        const cv = rv - Math.round(rv / step) * step;
        const rad = step * 0.62 * Math.sqrt(Math.min(1, (0.92 - k) * 2.2));
        if (cu * cu + cv * cv < rad * rad) k *= 0.55;
      }
      const o = (y * w + x) * 4;
      d[o] = Math.min(255, src[si] * k);
      d[o + 1] = Math.min(255, src[si + 1] * k);
      d[o + 2] = Math.min(255, src[si + 2] * k);
      d[o + 3] = al;
    }
  }
  og.putImageData(img, 0, 0);
  c.drawImage(oc, 0, 0);
}

function bannerRod(ctx: Ctx, x: number, y: number): void {
  // brackets off the pier's face, the rod with finials
  for (const dx of [-62, 62]) {
    flat(ctx, rectPath(x + dx - 4, y - 18, 8, 20), '#4a5058', 1.8, INK, 0.4);
    rivet(ctx, x + dx, y - 12, 1.8);
  }
  const rod = rrPath(x - 92, y - 4, 184, 8, 4);
  castShadow(ctx, rod, 6, 4, 0.5, '#0a0410');
  flat(ctx, rod, '#b88a3a', 2, INK, 0.5);
  ctx.fillStyle = rgba('#fff0c0', 0.6);
  ctx.fillRect(x - 90, y - 3, 180, 2);
  for (const dx of [-96, 96]) flat(ctx, ellPath(x + dx, y, 7, 7), '#c89a3a', 2, INK, 0.4);
}

const BANNER_BOX = (i: number): Box => ({ x: RS.banners[i].x - BAN.w / 2, y: RS.banners[i].y - BAN.rod, w: BAN.w, h: BAN.h });

function bannerStill(ctx: Ctx, i: number): void {
  const b = RS.banners[i];
  ctx.save();
  // the cloth's shadow on the pier
  ctx.translate(b.x - BAN.w / 2, b.y - BAN.rod);
  bannerFrame(ctx, i * 0.37);
  ctx.restore();
}

function bannerShadows(ctx: Ctx): void {
  for (const b of RS.banners) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.filter = 'blur(7px) brightness(0)';
    ctx.drawImage(bannerFlat(), b.x - BAN.w / 2 + 10, b.y - BAN.rod + 12);
    ctx.restore();
  }
}

// ——— the table: a steel war-room table ———

const TBOX: Box = { x: 0, y: TY, w: W, h: 1080 - TY };

function table(ctx: Ctx, r: R): void {
  const zf = RS.front;
  const at = (x: number, y: number) => VP.x + (x - VP.x) * ((y - VP.y) / (zf - VP.y));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, zf - TY + 2);
  ctx.clip();
  vfill(ctx, 0, TY, W, zf - TY, [[0, '#26262e'], [0.4, '#3a3a44'], [1, '#4a4a54']]);
  surface(ctx, r, { x: 0, y: TY, w: W, h: zf - TY }, '#3a3a44', { over: true, vary: 0.35, cells: 4, mottle: 0.3, strokes: 0, grain: 0.18, seed: 121 });
  // brushed steel
  for (let i = 0; i < 180; i++) {
    const y = TY + r() * (zf - TY);
    const x = r() * W;
    ctx.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#0a0a14', 0.04 + r() * 0.05);
    ctx.fillRect(x, y, 80 + r() * 320, 1.2);
  }
  // the plotting grid, worn nearly away: lines to the eye and across, in faded white paint
  ctx.strokeStyle = rgba('#d8dce8', 0.055);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let fx = -1200; fx <= W + 1200; fx += 160) {
    ctx.moveTo(at(fx, TY), TY);
    ctx.lineTo(fx, zf);
  }
  for (const y of [790, 826, 870, 922, 984]) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
  // the room's lights in the plate: the beacons' red and the cradle's blue running down towards us
  const sh = ctx.createLinearGradient(0, TY, 0, zf);
  sh.addColorStop(0, 'rgba(200,210,240,0)');
  sh.addColorStop(0.5, 'rgba(200,210,240,0.08)');
  sh.addColorStop(1, 'rgba(200,210,240,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, TY, W, zf - TY);
  // the key's broad sheen on the brushed plate, the banners' crimson smeared in it
  ctx.save();
  ctx.translate(640, 850);
  ctx.scale(1, 0.14);
  const kg = ctx.createRadialGradient(0, 0, 0, 0, 0, 760);
  kg.addColorStop(0, rgba('#d8e0f8', 0.09));
  kg.addColorStop(1, rgba('#d8e0f8', 0));
  ctx.fillStyle = kg;
  ctx.fillRect(-800, -800, 1600, 1600);
  ctx.restore();
  for (const b of RS.banners) {
    const g = ctx.createLinearGradient(0, TY, 0, TY + 170);
    g.addColorStop(0, rgba(CRIMSON, 0.14));
    g.addColorStop(1, rgba(CRIMSON, 0));
    ctx.fillStyle = g;
    ctx.fillRect(b.x - 60, TY, 120, 170);
  }
  for (const [rx, col, wd, a] of [[RS.cradle.x, BLUE, 180, 0.22], [RS.beacons[0].x, RED_L, 120, 0.16], [RS.beacons[1].x, RED_L, 120, 0.16]] as const) {
    lightPool(ctx, rx, TY + 60, wd * 0.6, 120, col, a);
    ctx.save();
    ctx.translate(rx, 0);
    ctx.scale(6, 1);
    const hg = ctx.createLinearGradient(-1, 0, 1, 0);
    hg.addColorStop(0, rgba(col, 0));
    hg.addColorStop(0.5, rgba(mix(col, '#ffffff', 0.4), a * 0.8));
    hg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = hg;
    for (let k = 0; k < 10; k++) {
      ctx.globalAlpha = (1 - k / 10) ** 1.5;
      ctx.fillRect(-1, TY + 4 + k * 20, 2, 20);
    }
    ctx.restore();
  }
  // printed shade: towards the back and the right, the front edge
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => 0.4 * (1 - smooth(TY, TY + 140, y)) + 0.14 * smooth(zf - 110, zf, y) + 0.14 * smooth(1000, W, x) + 0.05, '#0c0814', { step: 8, angle: 0.79, a: 0.6 });
  // the plates: seams to the eye, riveted on one spacing; one seam across
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const fx of [-640, 320, 1600, 2560]) {
    ctx.moveTo(at(fx, TY), TY);
    ctx.lineTo(fx, zf);
  }
  ctx.moveTo(0, 900);
  ctx.lineTo(W, 900);
  ctx.stroke();
  ctx.strokeStyle = rgba('#d8e0ff', 0.25);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 902);
  ctx.lineTo(W, 902);
  ctx.stroke();
  for (const fx of [-640, 320, 1600, 2560]) {
    for (let k = 0; k <= 8; k++) {
      const y = TY + 14 + ((zf - TY - 28) * k) / 8;
      const xx = at(fx, y) + 10 * ((y - VP.y) / (zf - VP.y));
      if (xx > 10 && xx < W - 10) rivet(ctx, xx, y, 1.8 + ((y - TY) / (zf - TY)) * 1.4, '#8a90a0');
    }
  }
  for (let x = 40; x < W; x += 80) rivet(ctx, x, 908, 2.4, '#8a90a0');
  // scratches, a coffee ring, a dropped map pin
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const y = TY + 20 + r() * (zf - TY - 40);
    ctx.strokeStyle = rgba('#c8d0e0', 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20 + r() * 50, y + (r() - 0.5) * 10);
    ctx.stroke();
  }
  // rubbed bright along the front where elbows lean
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = rgba('#c8d0e0', 0.05 + r() * 0.05);
    ctx.fillRect(r() * W, zf - 30 + r() * 26, 30 + r() * 120, 1.2);
  }
  ctx.restore();
  // the back edge's shadow, the falloff, the seam
  ctx.fillStyle = rgba('#06020a', 0.35);
  ctx.fillRect(0, TY, W, 10);
  tableFalloff(ctx, zf, 0.3, '#06020a');
  tableSeam(ctx, 0.55, INK, false);
  // the front edge: a riveted steel lip, hazard-painted, worn
  const kf = rectPath(0, zf, W, 1080 - zf);
  flat(ctx, kf, '#2e3038', 0, INK);
  within(ctx, kf, () => {
    hazardIn(ctx, rectPath(0, zf + 10, W, 20), { x: 0, y: zf + 10, w: W, h: 20 }, 13, 0.8, '#9a7a2a');
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = rgba('#2e3038', 0.85);
      ctx.fillRect(r() * W, zf + 10 + r() * 16, 6 + r() * 24, 3 + r() * 3);
    }
    dots(ctx, { x: 0, y: zf, w: W, h: 1080 - zf }, (_x, y) => 0.25 + 0.5 * smooth(zf, 1080, y), '#06020a', { step: 6, angle: 0.79, a: 0.75 });
    ctx.fillStyle = rgba('#d0d8ff', 0.35);
    ctx.fillRect(0, zf, W, 3);
  });
  for (let x = 40; x < W; x += 80) rivet(ctx, x, zf + 34, 2.4, '#8a90a0');
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, zf);
  ctx.lineTo(W, zf);
  ctx.stroke();
}

// ——— on the table's front corners: dossiers, dividers on a rolled chart ———

const TPROPS_BOX: Box = { x: 0, y: 930, w: W, h: 110 };

function tableProps(ctx: Ctx, r: R): void {
  // left: a stack of dossiers, the top one stamped
  const dx = 150;
  const dy = 1000;
  groundShadow(ctx, dx + 20, dy + 8, 120, 14, 0.7, '#06020a', 1.3);
  for (let k = 0; k < 4; k++) {
    const sk = (r() - 0.5) * 0.06;
    const y = dy - k * 7;
    const p: PathFn = (c) => {
      c.save();
      c.translate(dx, y);
      c.rotate(sk);
      c.beginPath();
      c.moveTo(-96, 0);
      c.lineTo(96, 0);
      c.lineTo(84, -26);
      c.lineTo(-84, -26);
      c.closePath();
      c.restore();
    };
    flat(ctx, p, k % 2 ? '#a8946c' : '#b8a27a', 1.8, INK, 0.4);
    ctx.fillStyle = rgba('#e8e0c8', 0.6);
    ctx.fillRect(dx - 92, y - 1.5, 184, 1.4);
  }
  ctx.save();
  ctx.translate(dx + 20, dy - 36);
  ctx.rotate(-0.12);
  ctx.strokeStyle = rgba('#a8202a', 0.8);
  ctx.lineWidth = 2.4;
  ctx.strokeRect(-34, -8, 68, 14);
  ctx.font = `11px ${BLOCK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba('#a8202a', 0.85);
  ctx.fillText('TOP SECRET', 0, -1);
  ctx.restore();
  // right: a rolled chart and the brass dividers on it
  const cx = 1780;
  const cy = 1000;
  groundShadow(ctx, cx + 14, cy + 6, 120, 12, 0.7, '#06020a', 1.3);
  const roll = rrPath(cx - 110, cy - 22, 220, 22, 11);
  flat(ctx, roll, '#c8bc98', 2, INK, 0.5);
  within(ctx, roll, () => {
    ctx.fillStyle = rgba('#fff8e0', 0.5);
    ctx.fillRect(cx - 108, cy - 19, 216, 4);
    dots(ctx, { x: cx - 110, y: cy - 22, w: 220, h: 22 }, linTone(0, cy - 14, 0, cy, 0, 0.7), '#3a2a18', { step: 3.4, angle: 0.79 });
  });
  flat(ctx, ellPath(cx + 110, cy - 11, 5, 11), '#a89a78', 1.6, INK, 0);
  ctx.lineCap = 'round';
  // its tie, slack round it; the brass dividers lying across it
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(cx + 40, cy - 11, 3, 11, 0, -Math.PI / 2, Math.PI / 2);
  ctx.moveTo(cx + 40, cy);
  ctx.quadraticCurveTo(cx + 54, cy + 8, cx + 70, cy + 4);
  ctx.stroke();
  groundShadow(ctx, cx - 60, cy + 6, 60, 4, 0.5, '#06020a');
  for (const [ex, ey] of [[cx - 130, cy + 8], [cx - 30, cy - 6]]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 70, cy - 30);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#d8a84a';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  flat(ctx, ellPath(cx - 70, cy - 31, 5, 5), '#d8a84a', 1.6, INK, 0);
}

// ——— the beacons' light in the still ———

function beaconLight(ctx: Ctx): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of RS.beacons) {
    glowAt(ctx, b.x, b.y - 18, 110, RED_L, 0.26, 1);
    glowAt(ctx, b.x, b.y + 30, 380, RED_L, 0.11, 0.75);
  }
  ctx.restore();
}

// ——— the walls lit red by a beacon (live only, laid on with ADD as the reflector turns) ———

/** The box a beacon's red light reaches on one side of it (side −1 left, +1 right): the two halves overlap across the
 * lamp, each fading out over the overlap, so however differently they're lit there's no seam between them. */
const RED_REACH = 560;
const RED_LAP = 220;
export const RED_BOX = (i: number, side: number): Box => {
  const b = RS.beacons[i];
  const x0 = side < 0 ? Math.max(0, b.x - RED_REACH) : b.x - RED_LAP;
  const x1 = side < 0 ? b.x + RED_LAP : Math.min(W, b.x + RED_REACH);
  return { x: x0, y: 100, w: x1 - x0, h: TY - 100 };
};

function redLit(ctx: Ctx, i: number, side: number): void {
  const b = RS.beacons[i];
  const box = RED_BOX(i, side);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // the light falling off from the lamp over the wall and the floor
  const g = ctx.createRadialGradient(b.x, b.y - 10, 10, b.x, b.y + 40, 600);
  g.addColorStop(0, rgba('#ff4a30', 0.42));
  g.addColorStop(0.25, rgba('#ff3a24', 0.26));
  g.addColorStop(0.6, rgba('#e82a1a', 0.1));
  g.addColorStop(1, rgba('#e82a1a', 0));
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  // broken by the concrete: patchy, the boards' ridges catching it
  ctx.globalCompositeOperation = 'destination-out';
  lay(ctx, noiseMask(9, 31 + i * 2 + side, { cover: 0.45, soft: 0.3 }), box, 0.4);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba('#ff6a4a', 0.1);
  for (let y = box.y + 9; y < FLOOR; y += 18) ctx.fillRect(box.x, y + 1.6, box.w, 1.2);
  // edges facing the lamp: the piers' arrises, the rib's soffit, the pipes' tops, the map's frame
  ctx.strokeStyle = rgba('#ff7a5a', 0.55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const px of RS.piers) {
    const ex = px + (px > b.x ? -RS.pierW / 2 : RS.pierW / 2);
    ctx.moveTo(ex, archY(ex, 1, RS.rib) + 30);
    ctx.lineTo(ex, FLOOR + 10);
  }
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  curve(ctx, 1, RS.rib - 1, box.x, box.x + box.w, true);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(box.x, RS.main.y - RS.main.r + 2);
  ctx.lineTo(box.x + box.w, RS.main.y - RS.main.r + 2);
  ctx.moveTo(box.x, MN.man - MN.r + 2);
  ctx.lineTo(box.x + box.w, MN.man - MN.r + 2);
  ctx.stroke();
  // its pool on the floor
  lightPool(ctx, b.x + side * 160, 680, 300, 50, '#ff3a24', 0.3, 'source-over');
  // the half's weight across the overlap: 1 on its own side, 0 at the far end of the overlap (the two sum to 1)
  ctx.globalCompositeOperation = 'destination-in';
  const m = ctx.createLinearGradient(b.x - RED_LAP, 0, b.x + RED_LAP, 0);
  m.addColorStop(0, side < 0 ? '#000000' : 'rgba(0,0,0,0)');
  m.addColorStop(1, side < 0 ? 'rgba(0,0,0,0)' : '#000000');
  ctx.fillStyle = m;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#ffd8d0', 0.03, { warm: '#ffb890', cool: '#3a44b8', a: 0.16 });
}

function shadeOver(ctx: Ctx): void {
  // the HUD's corners calm, the vault calmed, the lanes calm, a vignette
  for (const cx of [180, W - 180]) {
    const g = ctx.createRadialGradient(cx, 70, 40, cx, 70, 520);
    g.addColorStop(0, 'rgba(8,4,14,0.4)');
    g.addColorStop(1, 'rgba(8,4,14,0)');
    ctx.save();
    ctx.translate(cx, 70);
    ctx.scale(1, 0.4);
    ctx.translate(-cx, -70);
    ctx.fillStyle = g;
    ctx.fillRect(cx - 600, 0, 1200, 600);
    ctx.restore();
  }
  const cg = ctx.createLinearGradient(0, 0, 0, 180);
  cg.addColorStop(0, 'rgba(8,4,14,0.4)');
  cg.addColorStop(1, 'rgba(8,4,14,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, 180);
  calmLanes(ctx, 0.14, '#0a0612', 150, 620);
  vignetteAll(ctx, 0.62, '#080410');
}

// ——— the stack ———

export const REDSOLE: SceneSpec = {
  id: 'redsole',
  info: {
    name: 'The HYDRANT Bunker',
    subtitle: 'Mini-boss: THE RED SOLE',
    ambient: [],
    glows: [],
    light: '#f0d0c8',
    tableTint: '#f4ecee',
  },
  layers: [
    { id: 'vault', box: VAULT_BOX, draw: vault },
    { id: 'wall', box: WALL_BOX, draw: endWall },
    { id: 'piers', box: { x: RS.piers[0] - 90, y: 100, w: RS.piers[1] - RS.piers[0] + 180, h: FLOOR + 40 - 100 }, draw: (c, r) => RS.piers.forEach((x) => pier(c, r, x)) },
    { id: 'rib', box: { x: 0, y: 40, w: W, h: 400 }, draw: wallRib },
    { id: 'door', box: DOOR_BOX, draw: door },
    { id: 'map', box: MAP_BOX, draw: warMap },
    { id: 'mains', box: RIGHT_BOX, draw: mains },
    { id: 'fittingsStill', box: { x: RS.valves[0] - 40, y: WHEEL.y - 40, w: RS.gauges[1].x + 30 - (RS.valves[0] - 40), h: 110 }, stillOnly: true, draw: fittingsStill },
    { id: 'console', box: CON_BOX, draw: consoleBank },
    { id: 'lowMain', box: LOW_BOX, draw: lowMain },
    { id: 'beacons', box: { x: 0, y: 160, w: W, h: FLOOR - 160 }, draw: (c) => RS.beacons.forEach((b, i) => beaconMount(c, b.x, b.y, i ? -1 : 1)) },
    { id: 'beaconLight', box: { x: 0, y: 0, w: W, h: FLOOR }, draw: beaconLight },
    { id: 'chest', box: CHEST_BOX, draw: chest },
    { id: 'bannerRods', box: { x: RS.piers[0] - 110, y: RS.banners[0].y - 30, w: RS.piers[1] - RS.piers[0] + 220, h: BAN.h + 40 }, draw: (c) => {
      bannerShadows(c);
      RS.banners.forEach((b) => bannerRod(c, b.x, b.y));
    } },
    { id: 'bannerStillL', box: BANNER_BOX(0), stillOnly: true, draw: (c) => bannerStill(c, 0) },
    { id: 'bannerStillR', box: BANNER_BOX(1), stillOnly: true, draw: (c) => bannerStill(c, 1) },
    { id: 'bannerL', box: BANNER_BOX(0), motion: 'slot', draw: () => {} },
    { id: 'bannerR', box: BANNER_BOX(1), motion: 'slot', draw: () => {} },
    { id: 'floor', box: FLOOR_BOX, draw: floorSlab },
    { id: 'cradle', box: CRADLE_BOX, draw: cradle },
    { id: 'fieldStill', box: { x: CR.x - FIELD.w / 2, y: CR.y - FIELD.cy + 10, w: FIELD.w, h: FIELD.h }, stillOnly: true, draw: fieldStill },
    { id: 'redLL', box: RED_BOX(0, -1), liveOnly: true, res: 0.5, draw: (c) => redLit(c, 0, -1) },
    { id: 'redLR', box: RED_BOX(0, 1), liveOnly: true, res: 0.5, draw: (c) => redLit(c, 0, 1) },
    { id: 'redRL', box: RED_BOX(1, -1), liveOnly: true, res: 0.5, draw: (c) => redLit(c, 1, -1) },
    { id: 'redRR', box: RED_BOX(1, 1), liveOnly: true, res: 0.5, draw: (c) => redLit(c, 1, 1) },
    { id: 'table', box: TBOX, draw: table },
    { id: 'tableProps', box: TPROPS_BOX, draw: tableProps },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: frame painters ———

const DOME_F = { w: 64, h: 52 };
const DOME_N = 12;
const FIELD_N = 16;
const FIELD_K = 0.75;
const BAN_N = 12;
const BAN_K = 0.62;
const STEAM = { w: 96, h: 160 };
const STEAM_N = 10;
const ARC_F = { w: 240, h: 110 };
const ARC_N = 6;
const ARC_K = 0.6;

/** A billowing column of comic steam rising from (w/2, h): lobes swelling and thinning as they climb (a lobe leaves
 * the top as another is born at the jet: the loop repeats), each lit top left with its shade in grey. */
function steamFrame(c: Ctx, ph: number): void {
  const { w, h } = STEAM;
  const n = 9;
  const lobes: [number, number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const u = (i / n + ph) % 1;
    const y = h - 6 - u * (h - 34);
    const rad = 4 + u * 22 + (i % 3) * 2;
    const x = w / 2 + Math.sin(u * 5 + i * 1.7) * u * 16 + ((i % 2) - 0.5) * u * 14;
    const a = Math.min(1, u / 0.12) * (1 - u) ** 1.1 * 0.9;
    lobes.push([x, y, rad, a]);
  }
  lobes.sort((p, q) => q[1] - p[1]).reverse();
  for (const [x, y, rad, a] of lobes) {
    const sg = c.createRadialGradient(x + rad * 0.25, y + rad * 0.3, 0, x + rad * 0.25, y + rad * 0.3, rad * 1.1);
    sg.addColorStop(0, rgba('#8a92a6', a * 0.7));
    sg.addColorStop(1, rgba('#8a92a6', 0));
    c.fillStyle = sg;
    c.beginPath();
    c.arc(x + rad * 0.25, y + rad * 0.3, rad * 1.1, 0, P2);
    c.fill();
    const lg = c.createRadialGradient(x - rad * 0.2, y - rad * 0.2, 0, x - rad * 0.1, y - rad * 0.1, rad);
    lg.addColorStop(0, rgba('#f4f6fa', a));
    lg.addColorStop(0.6, rgba('#d8dce8', a * 0.75));
    lg.addColorStop(1, rgba('#d8dce8', 0));
    c.fillStyle = lg;
    c.beginPath();
    c.arc(x - rad * 0.1, y - rad * 0.1, rad, 0, P2);
    c.fill();
    // the inker's curl on its shade side, fading as the puff thins
    c.strokeStyle = rgba('#3a3448', a * 0.55 * (1 - (h - y) / h));
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(x - rad * 0.1, y - rad * 0.1, rad * 0.78, 0.1, 1.9);
    c.stroke();
  }
  // the jet itself, hot and white where it leaves the joint
  const jg = c.createLinearGradient(0, h, 0, h - 30);
  jg.addColorStop(0, 'rgba(255,255,255,0.9)');
  jg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = jg;
  c.beginPath();
  c.moveTo(w / 2 - 2, h);
  c.lineTo(w / 2 + 2, h);
  c.lineTo(w / 2 + 7, h - 30);
  c.lineTo(w / 2 - 7, h - 30);
  c.closePath();
  c.fill();
}

/** A beacon's beam, side-on: a cone along +x from (0, h/2), hot at the lamp. */
function beaconBeam(c: Ctx, w: number, h: number): void {
  for (const [k, a] of [[1, 0.22], [0.6, 0.32], [0.28, 0.5]] as const) {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, `rgba(255,96,70,${a})`);
    g.addColorStop(0.45, `rgba(255,60,44,${a * 0.4})`);
    g.addColorStop(1, 'rgba(255,40,30,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h / 2 - 5 * k);
    c.lineTo(w, h / 2 - (h / 2) * k);
    c.lineTo(w, h / 2 + (h / 2) * k);
    c.lineTo(0, h / 2 + 5 * k);
    c.closePath();
    c.fill();
  }
}

/** One crackling arc per frame, from the left middle to the right middle of the frame: a blue ribbon, white core,
 * ink. */
function arcFrame(c: Ctx, i: number): void {
  const rr = mkRng(510 + i * 37);
  const { w, h } = ARC_F;
  const strokes = boltPath(rr, 6, h / 2, w - 6, h / 2 + (rr() - 0.5) * 10, 8, 0.34);
  c.save();
  c.shadowColor = 'rgba(120,200,255,0.95)';
  c.shadowBlur = 16;
  bolt(c, strokes, 8, '#8ad4ff', '#ffffff', '#16306a');
  c.restore();
  bolt(c, strokes, 8, '#8ad4ff', '#ffffff', INK);
}

/** A chip of concrete for the falling grit (frame i of 3): lit top left, inked. */
function chipFrame(c: Ctx, i: number): void {
  const rr = mkRng(70 + i * 13);
  const s = 8;
  const pts: [number, number][] = [];
  const n = 5 + i;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * P2;
    const rad = s * (0.55 + rr() * 0.45);
    pts.push([s + Math.cos(a) * rad, s + Math.sin(a) * rad * 0.8]);
  }
  flat(c, polyPath(pts), '#8a8490', 1.4, INK, 0);
  c.fillStyle = rgba('#e0dce4', 0.6);
  c.beginPath();
  c.arc(s - 2, s - 2, 2.4, 0, P2);
  c.fill();
}

/** A gauge's needle pointing along +x from the texture's centre. */
function needleTex(c: Ctx, rad: number): void {
  c.translate(rad, rad);
  needle(c, 0, 0, rad, 1 / 6);
}

// ——— live ———

registerKitScene(REDSOLE, (k) => {
  const fx = k.slot('fx');
  const B = Phaser.BlendModes;
  const ev = k.sc.events;
  const tint = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

  // ——— the banners: the cloth's loop, swinging on its rod when the room shakes
  const banKey = sheet(k, 'rs_banner', BAN.w * BAN_K, BAN.h * BAN_K, BAN_N, (c, ph) => {
    c.scale(BAN_K, BAN_K);
    bannerFrame(c, ph);
  });
  const banners = RS.banners.map((b, i) => {
    const loop = new Loop(k, banKey, BAN_N, b.x, b.y - BAN.rod, { into: k.slot(i ? 'bannerR' : 'bannerL'), origin: [0.5, 0], scale: 1 / BAN_K, fps: 4.5, phase: i * 5 });
    return { b, i, loop, sw: new Spring(0, 7, 1.3), stir: 0 };
  });
  const kickBanners = (v: number) => banners.forEach((bn) => {
    bn.sw.v += v * 0.45 * (0.7 + crand() * 0.6) * (crand() < 0.5 ? -1 : 1);
    bn.stir = Math.min(2.5, bn.stir + Math.abs(v) * 0.8);
  });

  // ——— the alarm beacons: the turning reflector, its beam, its spot racing on the wall, the walls lit red
  const domeKey = sheet(k, 'rs_dome', DOME_F.w, DOME_F.h, DOME_N, (c, ph) => beaconDome(c, DOME_F.w / 2, DOME_F.h - 2, ph));
  const beamKey = k.tex('rs_beam', 420, 110, (c) => beaconBeam(c, 420, 110));
  const reds = [
    [k.sprite('redLL'), k.sprite('redLR')],
    [k.sprite('redRL'), k.sprite('redRR')],
  ];
  for (const s2 of reds.flat()) s2.setBlendMode(B.ADD).setAlpha(0);
  const alarmW = k.wash(0xff3a2a, 0, B.ADD, fx);
  const beacons = RS.beacons.map((b, i) => {
    const by = b.y - 6;
    return {
      b,
      i,
      by,
      loop: new Loop(k, domeKey, DOME_N, b.x, by + 2, { into: fx, origin: [0.5, 1], fps: 0 }),
      beam: k.img(beamKey, b.x, by - DOME.h / 2, { into: fx, add: true, origin: [0, 0.5], alpha: 0 }),
      spot: k.glow(b.x, by - 10, 70, 0xff3a24, 0, { into: fx, sy: 0.9 }),
      floorSpot: k.glow(b.x, 680, 160, 0xff3a24, 0, { into: fx, sy: 0.25 }),
      halo: k.glow(b.x, by - DOME.h / 2, 80, 0xff5a3a, 0, { into: fx }),
      ph: i * 0.37,
      jolt: new Spring(0, 40, 5),
      red: reds[i],
    };
  });
  let spin = 1;
  let lightsOut = 0;

  // ——— the cradle: its field, its glow, the arcs reaching up to the cube while it charges
  const fieldKey = sheet(k, 'rs_field', FIELD.w * FIELD_K, FIELD.h * FIELD_K, FIELD_N, (c, ph) => {
    c.scale(FIELD_K, FIELD_K);
    fieldFrame(c, ph, 7, 1);
  });
  const field = new Loop(k, fieldKey, FIELD_N, CR.x - FIELD.w / 2, CR.y - FIELD.cy + 10, { into: fx, origin: [0, 0], scale: 1 / FIELD_K, fps: 9 });
  const cGlow = k.glow(CR.x, CR.y - 20, 200, 0x5fb8ff, 0.14, { into: fx, sy: 0.75 });
  const doorGlow = k.glow(CR.x, CR.y - 150, 300, 0x3a8aff, 0.06, { into: fx, sy: 1.1 });
  const flash = k.wash(0x8ad4ff, 0, B.ADD, fx);
  const arcKey = sheet(k, 'rs_arc', ARC_F.w * ARC_K, ARC_F.h * ARC_K, ARC_N, (c, _p, i) => {
    c.scale(ARC_K, ARC_K);
    arcFrame(c, i);
  });
  const tethers = HORNS.map(([hx, hy]) => ({ x0: hx, y0: hy - 26, img: k.img(arcKey, hx, hy - 26, { into: fx, origin: [0, 0.5], alpha: 0 }), t: 0 }));
  const cubeGlow = k.glow(0, 0, 90, 0x8ad4ff, 0, { into: fx });
  const sparks = new Parts(k, { frame: 'spark', add: true, into: fx, max: 120 });
  let cube: { x: number; y: number } | null = null;
  let flare = 0;
  let gutter = 0;
  let flashA = 0;

  // ——— the pipes: steam at the leaks, drips, the gauges' needles, the handwheels
  const steamKey = sheet(k, 'rs_steam', STEAM.w, STEAM.h, STEAM_N, (c, ph) => steamFrame(c, ph));
  const leaks = RS.leaks.map((l, i) => ({
    l,
    loop: new Loop(k, steamKey, STEAM_N, l.x, l.y, { into: fx, origin: [0.5, 1], fps: 8 + i, phase: i * 3 }),
    base: [0.3, 0.42, 0.22][i],
    burst: 0,
  }));
  for (const lk of leaks) lk.loop.each((im) => im.setRotation(lk.l.a + Math.PI / 2));
  const burstLeak = (lk: (typeof leaks)[number], v: number) => {
    lk.burst = Math.min(1.6, lk.burst + v);
    for (let j = 0; j < 3 + v * 6; j++) puffs.spawn({ x: lk.l.x, y: lk.l.y, vx: Math.cos(lk.l.a) * (80 + crand() * 120) + (crand() - 0.5) * 40, vy: Math.sin(lk.l.a) * (80 + crand() * 120) - 20, life: 1.2 + crand() * 0.8, r0: 6, r1: 30 + crand() * 20, a: 0.4, tint: 0xe8ecf4, drag: 1.6, grav: -30, fade: 0.08 });
  };
  const puffs = new Parts(k, { frame: 'puff', into: fx, max: 60 });
  const drops = new Parts(k, { frame: 'drop', into: fx, max: 90 });
  const wheelBodyKey = k.tex('rs_wheel', 80, 80, (c) => wheelBody(c, 40, 40, WHEEL.r, 0));
  const wheelLightKey = k.tex('rs_wheelLit', 80, 80, (c) => wheelLight(c, 40, 40, WHEEL.r));
  const wheels = RS.valves.map((vx, i) => {
    const body = k.img(wheelBodyKey, vx, WHEEL.y, { into: fx }).setRotation(0.2);
    k.img(wheelLightKey, vx, WHEEL.y, { into: fx });
    return { body, rot: 0.2 + i, v: 0 };
  });
  const needles = RS.gauges.map((g, i) => {
    const key = k.tex(`rs_needle${i}`, g.r * 2, g.r * 2, (c) => needleTex(c, g.r));
    const img = k.img(key, g.x, g.y, { into: fx });
    return { g, img, sp: new Spring(GAUGE_V[i], 60, 7), base: GAUGE_V[i] };
  });
  let pressure = 0;
  const lamps = LAMPS.map(([x, y, c], i) => ({ g: k.glow(x, y, 14, tint(c), 0, { into: fx }), seed: i * 1.37, red: c === '#ff3a2a' }));
  const drip = new Rate();

  // ——— grit and dust off the vault's ribs, motes in the light
  const chipKey = sheet(k, 'rs_chip', 16, 16, 3, (c, _p, i) => chipFrame(c, i));
  const grit = new Parts(k, { frame: 'mote', sheet: { key: chipKey, n: 3, half: 8 }, into: fx, max: 120 });
  const dust = new Parts(k, { frame: 'puff', into: fx, max: 40 });
  const motes = new Parts(k, { frame: 'mote', add: true, into: fx, max: 70 });
  const moteRate = new Rate();
  const shed = (x: number, n: number, p: number) => {
    for (let i = 0; i < n; i++) {
      const s = [1, RS.ribs[0], RS.ribs[0], RS.ribs[1]][Math.floor(crand() * 4)];
      const gx = Phaser.Math.Clamp(x + (crand() - 0.5) * 1100, 20, W - 20);
      const gy = archY(gx, s, s === 1 ? RS.rib : 0);
      if (!(gy > 0 && gy < FLOOR - 40)) continue;
      const floor = FLOOR + 6 + crand() * (TY - FLOOR - 16);
      grit.spawn({ x: gx, y: gy + 2, vx: (crand() - 0.5) * 40, vy: 20 + crand() * 40, life: 2.6, r0: 1.6 + crand() * 2.4, a: 0.95, tint: crand() < 0.5 ? 0xb8b0bc : 0x8a8490, grav: 1100, floor, bounce: 0.3, spin: (crand() - 0.5) * 12, fade: 0.02 });
      if (crand() < 0.35 + p * 0.4) dust.spawn({ x: gx, y: gy + 6, vx: (crand() - 0.5) * 30, vy: 20 + crand() * 30, life: 2.2 + crand(), r0: 8, r1: 30 + crand() * 20, a: 0.22, tint: 0x9a92a0, grav: 30, drag: 1.2, fade: 0.1 });
    }
  };

  // ——— the fight, heard (src/game/bosses/comics.ts, the redsole brain)
  const onCube = (x: number, y: number) => {
    cube = { x, y: y + 24 };
    flare = Math.max(flare, 0.6);
    spin = 2.2;
  };
  const onCubeEnd = () => {
    cube = null;
  };
  const onBackfire = () => {
    cube = null;
    flare = 1.4;
    gutter = 1.6;
    flashA = 0.22;
    for (const [hx, hy] of HORNS) for (let i = 0; i < 16; i++) sparks.spawn({ x: hx, y: hy - 26, vx: (crand() - 0.5) * 420, vy: -120 - crand() * 300, life: 0.8 + crand() * 0.6, r0: 2.6, r1: 1, a: 1, tint: crand() < 0.5 ? 0xbfe8ff : 0xffffff, grav: 900, drag: 0.4, floor: RS.dais.y - 10 + crand() * 40, bounce: 0.35, streak: 0.02, fade: 0.02 });
    kickBanners(0.6);
  };
  const onBeam = () => {
    flashA = 0.16;
    flare = Math.max(flare, 1);
  };
  const onTurret = () => {
    pressure = 1;
    spin = 2.6;
    for (const wl of wheels) wl.v = (crand() < 0.5 ? -1 : 1) * (7 + crand() * 4);
    for (const lk of leaks) burstLeak(lk, 1.2);
    for (const n2 of needles) n2.sp.v += 8;
    // every flange spits water
    for (const [fx2, fy] of [...RS.valves.map((v) => [v, MN.man] as [number, number]), [MN.xs[0], MN.man], [MN.xs[1], MN.man], [RS.leaks[0].x, RS.leaks[0].y]]) {
      for (let j = 0; j < 8; j++) drops.spawn({ x: fx2 + (crand() - 0.5) * 20, y: fy + 6, vx: (crand() - 0.5) * 260, vy: -80 - crand() * 200, life: 1.6, r0: 1.8, a: 0.8, tint: 0xc8e4ff, grav: 1200, streak: 0.012, floor: FLOOR + 10 + crand() * 30 });
    }
    shed(960, 10, 0.6);
  };
  const onCapped = (x?: number) => {
    pressure = Math.max(0, pressure - 0.5);
    const lk = leaks.reduce((a2, b2) => (Math.abs(b2.l.x - (x ?? 960)) < Math.abs(a2.l.x - (x ?? 960)) ? b2 : a2));
    burstLeak(lk, 0.8);
  };
  const onMarch = () => {
    for (const bc of beacons) bc.jolt.v += 4;
    kickBanners(0.2);
  };
  const onBlitz = (x?: number) => {
    for (const bc of beacons) bc.jolt.v += 10;
    lightsOut = 0.09;
    kickBanners(0.8);
    shed(x ?? 960, 8, 0.6);
    flare = Math.max(flare, 0.4);
  };
  ev.on('redsole-cube', onCube);
  ev.on('redsole-cube-end', onCubeEnd);
  ev.on('redsole-backfire', onBackfire);
  ev.on('redsole-beam', onBeam);
  ev.on('redsole-turret', onTurret);
  ev.on('redsole-capped', onCapped);
  ev.on('redsole-march', onMarch);
  ev.on('redsole-blitz', onBlitz);
  const unlisten = () => {
    ev.off('redsole-cube', onCube);
    ev.off('redsole-cube-end', onCubeEnd);
    ev.off('redsole-backfire', onBackfire);
    ev.off('redsole-beam', onBeam);
    ev.off('redsole-turret', onTurret);
    ev.off('redsole-capped', onCapped);
    ev.off('redsole-march', onMarch);
    ev.off('redsole-blitz', onBlitz);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  // in a fight the brain drives it; on the stages page the arena runs through the fight's moments by itself
  const inFight = 'miniFoot' in (k.sc as object);
  const DEMO: [number, () => void][] = [
    [0, () => onCube(672, 430)],
    [3.4, onBackfire],
    [6, onTurret],
    [8.5, () => onCapped(170)],
    [9.5, () => onCapped(1750)],
    [11, onMarch],
    [11.5, () => onBlitz(1248)],
    [12.3, onMarch],
    [12.8, () => onBlitz(960)],
    [13.6, onMarch],
    [14.1, () => onBlitz(672)],
    [16, () => onCube(1248, 430)],
    [19.5, () => {
      onCubeEnd();
      onBeam();
    }],
  ];
  const DEMO_T = 23;
  let demoT = 0;
  let demoI = 0;

  return {
    impact(x, _y, p) {
      shed(x, Math.round(5 + p * 18), p);
      for (const bc of beacons) bc.jolt.v += (x < bc.b.x ? 1 : -1) * (4 + p * 10);
      kickBanners(0.25 + p * 0.6);
      // the nearest joint spits steam
      const lk = leaks.reduce((a2, b2) => (Math.abs(b2.l.x - x) < Math.abs(a2.l.x - x) ? b2 : a2));
      burstLeak(lk, 0.4 + p * 0.6);
      for (const n2 of needles) n2.sp.v += (crand() - 0.3) * 4 * p;
      flare = Math.max(flare, 0.25 * p);
    },
    update(dt, t) {
      const cm = calm();
      // ——— the demo cycle on the stages page
      if (!inFight) {
        demoT += dt;
        while (demoI < DEMO.length && demoT >= DEMO[demoI][0]) DEMO[demoI++][1]();
        if (demoT >= DEMO_T) {
          demoT = 0;
          demoI = 0;
        }
      }
      // ——— the banners stir in the vent's draught, swing when kicked
      for (const bn of banners) {
        bn.stir = Math.max(0, bn.stir - dt * 0.6);
        bn.loop.step(dt, cm * (1 + bn.stir));
        const a2 = Phaser.Math.Clamp(bn.sw.step(wander(t * 0.4, bn.i * 3) * 0.012 * cm, dt), -0.07, 0.07);
        bn.loop.each((im) => im.setRotation(a2));
      }
      // ——— the beacons
      spin += (1 - spin) * Math.min(1, dt * 0.4);
      lightsOut = Math.max(0, lightsOut - dt);
      const lit = lightsOut > 0 ? 0.25 : 1;
      let face = 0;
      for (const bc of beacons) {
        const j = bc.jolt.step(0, dt);
        bc.ph = (bc.ph + dt * 0.55 * spin * cm) % 1;
        const a = bc.ph * P2 + j * 0.05;
        bc.loop.show(bc.ph * DOME_N);
        bc.loop.each((im) => im.setRotation(j * 0.012));
        const sa = Math.sin(a);
        const ca = Math.cos(a);
        // the beam in the air: foreshortened as it turns towards or away from us
        bc.beam.setRotation(sa >= 0 ? j * 0.01 : Math.PI + j * 0.01).setScale(Math.abs(sa) * 1.15 + 0.05, 1 + Math.max(0, ca) * 0.3).setAlpha(lit * (0.18 + 0.42 * Math.abs(sa)) * (ca < 0 ? 0.7 : 1));
        // its spot racing along the wall while it faces the wall
        const wallward = Math.max(0, -ca);
        const off = Phaser.Math.Clamp((sa / Math.max(0.12, wallward)) * 150, -760, 760);
        bc.spot.setPosition(bc.b.x + off, bc.by - 14).setScale((140 + Math.abs(off) * 0.5) / 128, 120 / 128 * 0.9).setAlpha(lit * 0.5 * wallward ** 1.5 * (1 - Math.min(1, Math.abs(off) / 800)));
        bc.floorSpot.setPosition(bc.b.x + off * 0.6, 680).setAlpha(lit * 0.18 * wallward);
        // the walls each side lit red as the beam sweeps over them
        bc.red.forEach((sp, side) => sp.setAlpha(lit * (0.12 + 0.7 * Math.max(0, (side ? 1 : -1) * sa) * (0.55 + 0.45 * wallward))));
        bc.halo.setAlpha(lit * (0.18 + 0.7 * Math.max(0, ca) ** 3));
        face = Math.max(face, Math.max(0, ca) ** 4);
      }
      alarmW.setAlpha(0.035 * face * lit);
      // ——— the cradle
      flare = Math.max(0, flare - dt * 0.8);
      gutter = Math.max(0, gutter - dt);
      flashA = Math.max(0, flashA - dt * 0.5);
      flash.setAlpha(flashA * cm);
      const charge = cube ? 1 : 0;
      const pow = (1 - Math.min(1, gutter) * 0.85) * (0.85 + 0.15 * Math.sin(t * 2.3));
      field.alpha = Phaser.Math.Clamp(pow * (1 + flare * 0.3) + (gutter > 0 && Math.sin(t * 40) > 0.6 ? 0.4 : 0), 0, 1);
      field.step(dt, cm * (1 + charge * 2 + flare));
      cGlow.setAlpha((0.12 + 0.04 * Math.sin(t * 2.3) + flare * 0.22 + charge * 0.12) * (1 - Math.min(1, gutter) * 0.7));
      doorGlow.setAlpha((0.06 + flare * 0.08 + charge * 0.06) * (1 - Math.min(1, gutter) * 0.7));
      for (const tt of tethers) {
        if (!cube) {
          tt.img.setAlpha(Math.max(0, tt.img.alpha - dt * 8));
          continue;
        }
        tt.t -= dt;
        const dx = cube.x - tt.x0;
        const dy = cube.y + Math.sin(t * 5.2) * 6 - tt.y0;
        const len = Math.hypot(dx, dy);
        if (tt.t <= 0) {
          tt.t = 0.06 + crand() * 0.08;
          tt.img.setFrame(Math.floor(crand() * ARC_N));
          tt.img.setScale(len / (ARC_F.w * ARC_K), ((crand() < 0.5 ? 1 : -1) * (0.7 + crand() * 0.5)) / ARC_K);
          if (crand() < 0.5) sparks.spawn({ x: tt.x0, y: tt.y0, vx: (crand() - 0.5) * 200, vy: -60 - crand() * 160, life: 0.5 + crand() * 0.4, r0: 2, r1: 1, a: 1, tint: 0xbfe8ff, grav: 900, drag: 0.4, floor: RS.dais.y - 20 + crand() * 30, bounce: 0.3, streak: 0.02, fade: 0.02 });
        }
        tt.img.scaleX = len / (ARC_F.w * ARC_K);
        tt.img.setRotation(Math.atan2(dy, dx)).setAlpha((0.55 + 0.45 * (crand() < 0.7 ? 1 : 0)) * cm);
      }
      if (cube) cubeGlow.setPosition(cube.x, cube.y).setAlpha(0.25 + 0.1 * Math.sin(t * 30));
      else cubeGlow.setAlpha(Math.max(0, cubeGlow.alpha - dt * 2));
      sparks.update(dt);
      // ——— the pipes
      pressure = Math.max(0, pressure - dt * 0.06);
      for (const [i, lk] of leaks.entries()) {
        lk.burst = Math.max(0, lk.burst - dt * 0.7);
        lk.loop.alpha = Math.min(1, lk.base * (0.8 + 0.2 * wander(t * 0.8, i * 4)) + lk.burst * 0.6 + pressure * 0.25);
        lk.loop.step(dt, cm * (1 + lk.burst * 1.5));
        const sc = 1 + lk.burst * 0.5 + pressure * 0.2;
        lk.loop.each((im) => im.setScale(sc));
      }
      for (const wl of wheels) {
        wl.v *= Math.max(0, 1 - dt * 0.9);
        wl.rot += wl.v * dt * cm;
        wl.body.setRotation(wl.rot);
      }
      for (const [i, n2] of needles.entries()) {
        const target = Phaser.Math.Clamp(n2.base + pressure * 0.55 + Math.sin(t * 13 + i) * 0.006 * (1 + pressure * 4), 0, 1.02);
        const v = n2.sp.step(target, dt);
        n2.img.setRotation(Math.PI * 0.75 + Phaser.Math.Clamp(v, -0.03, 1.06) * Math.PI * 1.5 - (Math.PI * 0.75 + (1 / 6) * Math.PI * 1.5));
      }
      drip.tick((0.8 + pressure * 6) * cm, dt, () => {
        const [dx2, dy2] = [[1690, MN.man + MN.r], [1500, MN.man + MN.r], [RS.leaks[0].x - 10, RS.main.y + RS.main.r]][Math.floor(crand() * 3)];
        drops.spawn({ x: dx2 + (crand() - 0.5) * 6, y: dy2, vx: 0, vy: 0, life: 2, r0: 1.6, a: 0.75, tint: 0xc8e4ff, grav: 900, streak: 0.014, floor: dy2 > 500 ? FLOOR + 8 + crand() * 20 : RS.console.top - 2 });
      });
      puffs.update(dt);
      drops.update(dt);
      // the console's lamps: blinking, the reds racing while the cube charges or the turrets are up
      const alarm = Math.max(charge, pressure > 0.3 ? 1 : 0);
      for (const l of lamps) {
        const on = Math.sin(t * (1.3 + (l.seed % 1.7)) + l.seed * 5) > (l.red ? 0.2 - alarm * 0.8 : 0.1);
        const fast = l.red && alarm > 0.5 ? Math.sin(t * 12 + l.seed) > 0 : true;
        l.g.setAlpha(on && fast ? (0.5 + 0.2 * Math.sin(t * 20 + l.seed)) * lit : 0.04);
      }
      // ——— motes drifting in the beacons' light and over the cradle; the grit
      moteRate.tick(10 * cm, dt, () => {
        const nearC = crand() < 0.4;
        const mx = nearC ? CR.x + (crand() - 0.5) * 300 : RS.beacons[crand() < 0.5 ? 0 : 1].x + (crand() - 0.5) * 600;
        const my = nearC ? CR.y - 40 - crand() * 200 : 160 + crand() * 380;
        motes.spawn({ x: mx, y: my, vx: (crand() - 0.5) * 14, vy: nearC ? -10 - crand() * 14 : (crand() - 0.5) * 8, life: 4 + crand() * 3, r0: 1 + crand() * 1.4, a: 0.5, tint: nearC ? 0xa8dcff : 0xffa090, fade: 0.3 });
      });
      motes.update(dt);
      grit.update(dt);
      dust.update(dt);
    },
    destroy() {
      unlisten();
    },
  };
});
