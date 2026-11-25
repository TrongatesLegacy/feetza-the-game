// The Proprietor's Office (the arena of THE SOLE PROPRIETOR, the boss of the Oven Between Worlds: Stage 19, the first
// stage of Act 10, wave 95), redrawn with the location kit (src/art/scene). (The old art is kept in scenes-act10.ts for
// the before/after page.)
//
// His office at the very heart of the oven: a vast, absurdly grand corner office floating in the void. The back wall
// is one tall window of gilded mullions onto the cosmos, six bays on the room's one shared spacing (U), fanlights of
// amber glass over them; far off through it the burst oven of the stage before drifts on its raft of chequered floor,
// its portal blazing violet-white, and the void swirls round it in the finale's colours (violet, magenta, cyan, the
// orange that lights it all from the top left). Plum velvet curtains hang either side of the window on gold tiebacks,
// a stock ticker of pizza prices runs along a brass-framed board over it. The side walls are dark violet panelling,
// gold pilasters on the same spacing, a silk damask above; on the left wall a salon hang of the deeds and share
// certificates of every pizzeria he has bought (little framed pictures of the places the run went through, each
// tagged SOLD), lit by brass sconces; in the corner a grandfather clock (time is money: his fight is a 60-second
// survival clock), a gilded water cooler; on the right, his safe stands open against the wall, overflowing with
// golden crusts. The floor is polished chequered marble, the window mirrored in it. His leather chair, its tall back
// to us, is turned to the window. The table is his desk: green leather inlaid in rosewood, tooled in gold, his pizza
// globe and a pile of contracts on one corner, a banker's lamp and his gold nameplate on the other. Velvet drapes
// frame the near corners.
//
// An arena, not a location: no waves. It answers the fight (the soleprop brain in src/game/bosses/act10.ts emits
// 'soleprop-sold' when the SOLD stamp lands, 'soleprop-tick' with the seconds left while the survival clock runs, and
// 'soleprop-shift-over' when it runs out):
// - the takeover: the ticker spikes (every price up, flashing), papers burst off the desk, crusts spill from the safe,
//   the lamp swings, the portal flares gold;
// - the shift: the grandfather clock's minute hand ticks round once a second (a minute a second: time is money) and
//   its pendulum quickens; at 'SHIFT OVER!' it strikes twelve (the dial rings out), papers burst, the ticker reads
//   it.
// - a stomp rattles the desk toys (the globe spins, the nameplate and lamp jump), knocks a deed on the wall crooked,
//   and lifts papers off the pile that flutter down onto the desk.
// Hero animations: the void swirling round the far portal (a painted loop), the clock (a painted pendulum loop, its
// hands ticking), the papers (painted sheets fluttering down, flipping, landing); plus the pizza globe turning (a
// painted loop), the ticker scrolling, glints running over the crusts in the safe, bubbles in the cooler.
//
// Keep clear for the fight (the brain's props): the middle (960, 380–740: the contract and the SOLD stamp) is calm,
// low panelling under the window; the top right round (1790, 330), where his stopwatch hangs, is dark wall with
// nothing on it.

import Phaser from 'phaser';
import { type Ctx, type PathFn, type R, H, HY, TY, VX, W, castShadow, crevice, glowAt, lightPool, polyPath, rim, solid, vfill, vignetteAll, within, calmLanes } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { panel, tableFalloff, varnish, woodGrain } from '../../art/scene/materials';
import { drift, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { drape } from '../../art/scene/props';
import { skyFill, stars } from '../../art/scene/sky';
import { nebula, starburst } from '../../art/scene/space';
import { FOC, yAt, zFront } from '../../art/sceneKit';
import { makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Loop, Spring, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, registerKitScene } from '../../game/sceneLive';
import { FIN } from './scenes-act10';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
const P2 = Math.PI * 2;
const hash = (i: number, j: number) => {
  const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// ——— the view ———
//
// Room units (the table's: the eye is 1 above the desk-top, the desk-top 0.45 above the floor): X across, Y up from
// the floor, z away. The game's vanishing point and focal length, so the room and the desk share one perspective.

const EH = 1.45;
const sx = (X: number, z: number) => VX + (FOC * X) / z;
const sy = (Y: number, z: number) => HY + (FOC * (EH - Y)) / z;
const P = (X: number, Y: number, z: number): Pt => [sx(X, z), sy(Y, z)];
/** Screen px per unit at depth z. */
const pz = (z: number) => FOC / z;
/** On the desk-top (Yt above it). */
const D = (X: number, Yt: number, z: number): Pt => P(X, 0.45 + Yt, z);

/** The back wall (the window wall) and the side walls. */
const ZW = 5;
const XW = 2.15;
/** The room's one spacing: the window's bays, the dado's panels, the side walls' bays, the floor's tiles. */
const U = 0.552;
/** The window: its half width, sill, transom and head heights. */
const WIN = { X: 3 * U, Y0: 0.56, Yt: 1.98, Y1: 2.34 };
const WX0 = sx(-WIN.X, ZW);
const WX1 = sx(WIN.X, ZW);
const WY0 = sy(WIN.Y1, ZW);
const WY1 = sy(WIN.Y0, ZW);
/** The glass (the swirl's slot): the window's opening. */
const GLASS: Box = { x: Math.floor(WX0), y: Math.floor(WY0), w: Math.ceil(WX1 - WX0), h: Math.ceil(WY1 - WY0) };
const FLOOR_Y = sy(0, ZW);
/** The ticker board over the window. */
const TICK = { Y0: 2.43, Y1: 2.57 };
const TICK_BOX: Box = { x: Math.round(WX0 + 10), y: Math.round(sy(TICK.Y1, ZW)), w: Math.round(WX1 - WX0 - 20), h: Math.round(sy(TICK.Y0, ZW) - sy(TICK.Y1, ZW)) };
/** The side walls' pilasters (z), on the spacing, front to back. */
const PIL_Z = [ZW - 4 * U, ZW - 3 * U, ZW - 2 * U, ZW - U];

/** The far oven and its portal, out in the void (the swirl turns round it). */
const FAR = { x: 1088, y: 318, s: 0.56 };
const PORTAL: Pt = [FAR.x, FAR.y - 6 * FAR.s];

/** The grandfather clock in the back left corner. */
const CLK = { X: -1.95, z: 4.78 };
const CLK_K = pz(CLK.z);
const CLK_X = sx(CLK.X, CLK.z);
const DIAL: Pt = [CLK_X, sy(1.5, CLK.z)];
const DIAL_R = 0.165 * CLK_K;
/** The pendulum: its pivot (behind the hood), its length to the bob's centre; the trunk's glass. */
const PIV: Pt = [CLK_X, sy(1.3, CLK.z)];
const PEND_L = sy(0.52, CLK.z) - PIV[1];
const TRUNK_WIN = { x0: CLK_X - 0.13 * CLK_K, x1: CLK_X + 0.13 * CLK_K, y0: sy(1.12, CLK.z), y1: sy(0.36, CLK.z) };
const PEND = { w: 84, h: Math.ceil(TRUNK_WIN.y1 - PIV[1] + 6) };

/** The safe against the right wall: its front face's corners (X, z), its height; the door's hinge and open end. */
const SAFE = { X0: 1.5, X1: 2.08, z0: 3.47, z1: 3.97, Y: 0.9 };
const DOOR = { X: 1.42, z: 2.92 };

/** The leather chair, its back to us, turned to the window. */
const CHAIR = { X: 1.34, z: 4.35, hw: 0.3, Y: 1.3 };

/** The water cooler against the left wall. */
const COOL = { X: -1.88, z: 3.25 };

/** On the desk: the pizza globe and the contracts (left), the lamp and the nameplate (right). */
const GLOBE = { X: -1.7, z: 2.45, Yc: 0.37, r: 0.11 };
const GLOBE_C: Pt = D(GLOBE.X, GLOBE.Yc, GLOBE.z);
const GLOBE_R = GLOBE.r * pz(GLOBE.z);
const PILE = { X: -1.5, z: 2.36 };
const LAMP = { X: 1.78, z: 2.52 };
const PLATE = { X: 1.5, z: 2.34 };

// ——— palette ———

const VIOLET = '#b06bff';
const MAGENTA = '#ff4fd8';
const CYAN = '#36e0ff';
const ORANGE = '#ff9a3a';
const PANEL = '#2e1a3c';
const DAMASK = '#24142e';
const GOLD = { lit: '#ffeaa8', body: '#d8a840', shade: '#7a5418', deep: '#3a2408' };
const VELVET = '#5a1444';
const LEATHER = '#4a1a1e';
const DESK = '#15291f';
const ROSE = '#3a1a16';

// ——— small helpers ———

const quad = (a: Pt, b: Pt, c: Pt, d: Pt) => polyPath([a, b, c, d]);
/** A face square to us at depth z. */
const faceAt = (X0: number, X1: number, Y0: number, Y1: number, z: number) => quad(P(X0, Y0, z), P(X1, Y0, z), P(X1, Y1, z), P(X0, Y1, z));
/** A face along z at X. */
const sideAt = (X: number, z0: number, z1: number, Y0: number, Y1: number) => quad(P(X, Y0, z0), P(X, Y0, z1), P(X, Y1, z1), P(X, Y1, z0));
/** A level face at height Y. */
const topAt = (X0: number, X1: number, z0: number, z1: number, Y: number) => quad(P(X0, Y, z0), P(X1, Y, z0), P(X1, Y, z1), P(X0, Y, z1));
function fillPath(ctx: Ctx, path: PathFn, fill: string | CanvasGradient): void {
  path(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}
function strokePath(ctx: Ctx, path: PathFn, col: string | CanvasGradient, w: number): void {
  path(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function line(ctx: Ctx, a: Pt, b: Pt, col: string, w: number): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}
function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}
const boxOfPts = (pts: Pt[], pad = 4): Box => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs) - pad);
  const y = Math.floor(Math.min(...ys) - pad);
  return { x, y, w: Math.ceil(Math.max(...xs) + pad - x), h: Math.ceil(Math.max(...ys) + pad - y) };
};
/** Polished gold across a box (a bar, a frame's side): lit along its top left, a hot line, shade below. */
function goldFill(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, k = 1): CanvasGradient {
  return lin(ctx, x0, y0, x1, y1, [[0, mix(GOLD.lit, '#ffffff', 0.2 * k)], [0.22, GOLD.body], [0.55, mix(GOLD.body, GOLD.shade, 0.5)], [0.8, GOLD.shade], [1, GOLD.deep]]);
}
/** A small sharp glint (a highlight on polished metal or glass). */
function glint(ctx: Ctx, x: number, y: number, s: number, a = 0.9, col = '#fff6d8'): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 3);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.3, rgba(col, a * 0.3));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
  ctx.fillStyle = rgba('#ffffff', a * 0.8);
  ctx.fillRect(x - s * 2.4, y - 0.5, s * 4.8, 1);
  ctx.fillRect(x - 0.5, y - s * 2.4, 1, s * 4.8);
  ctx.restore();
}

// ——— the void through the window ———

/** A nebula that fades out at the edges of its box: painted small, drawn up. */
function softNebula(ctx: Ctx, r: R, box: Box, cols: string[], a: number, seed: number): void {
  const k = 0.5;
  const [c, g] = makeCanvas(Math.ceil(box.w * k), Math.ceil(box.h * k));
  g.scale(k, k);
  g.translate(-box.x, -box.y);
  nebula(g, r, box, cols, a, seed);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.translate(c.width / 2, c.height / 2);
  g.scale(1, c.height / c.width);
  const m = g.createRadialGradient(0, 0, 0, 0, 0, c.width / 2);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(0.55, 'rgba(0,0,0,0.7)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(-c.width, -c.width, c.width * 2, c.width * 2);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, box.x, box.y, box.w, box.h);
  ctx.restore();
}

/** The burst oven of the stage before, far off on its raft: a dome open to the stars, its mouth a violet-white portal. */
function farOven(ctx: Ctx, r: R): void {
  const { x, y, s } = FAR;
  const air = '#3a2458';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // the raft of chequered floor under it, broken off at the sides, its underside trailing into the void
  const raft: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-252, 112);
    c.quadraticCurveTo(-200, 92, -120, 96);
    c.lineTo(130, 96);
    c.quadraticCurveTo(220, 94, 256, 114);
    c.quadraticCurveTo(220, 150, 140, 168);
    c.quadraticCurveTo(60, 230, 10, 236);
    c.quadraticCurveTo(-60, 220, -120, 170);
    c.quadraticCurveTo(-210, 150, -252, 112);
    c.closePath();
  };
  fillPath(ctx, raft, lin(ctx, 0, 96, 0, 236, [[0, mix('#5a3a48', air, 0.3)], [0.15, mix('#2a1830', air, 0.35)], [1, '#0a0612']]));
  within(ctx, raft, () => {
    // its top: the kitchen floor, a pale band in the portal's light; under it rock and crust trailing off
    ctx.fillStyle = lin(ctx, -250, 0, 250, 0, [[0, rgba('#e0c8d8', 0.2)], [0.5, rgba('#f0d8ff', 0.5)], [1, rgba('#c0a8d0', 0.2)]]);
    ctx.fillRect(-260, 94, 520, 9);
    ctx.fillStyle = rgba('#1a0e20', 0.5);
    for (let i = -8; i <= 8; i += 2) ctx.fillRect(i * 28, 96, 28, 6);
    ctx.strokeStyle = rgba('#05020a', 0.5);
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-200 + i * 70, 110);
      ctx.quadraticCurveTo(-180 + i * 70, 150, -150 + i * 62, 200);
      ctx.stroke();
    }
    vfill(ctx, -260, 104, 520, 60, [[0, rgba(ORANGE, 0.22)], [1, rgba(ORANGE, 0)]]);
  });
  // the dome: brick, its crown burst open
  const dome = polyPath([
    [-200, 100], [-200, 30], [-188, -40], [-160, -92], [-128, -120], [-100, -128], [-96, -146], [-70, -150], [-64, -166], [-40, -170], [-34, -150], [-12, -148],
    [10, -150], [14, -170], [44, -168], [52, -150], [78, -148], [86, -128], [112, -124], [148, -96], [176, -56], [196, 0], [200, 100],
  ]);
  fillPath(ctx, dome, lin(ctx, -200, -170, 200, 100, [[0, mix('#b0603e', air, 0.35)], [0.5, mix('#7a3a2a', air, 0.45)], [1, mix('#3a1c1c', air, 0.5)]]));
  within(ctx, dome, () => {
    // its courses of brick, ringing the dome
    ctx.strokeStyle = rgba('#1a0c14', 0.35);
    ctx.lineWidth = 1.4;
    for (let yy = 92; yy > -170; yy -= 12) {
      ctx.beginPath();
      ctx.moveTo(-210, yy);
      ctx.lineTo(210, yy);
      ctx.stroke();
      for (let xx = -200 + ((yy / 12) % 2) * 9; xx < 200; xx += 18) {
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, yy - 12);
        ctx.stroke();
      }
    }
    // lit from the top left, the void's violet on its right flank
    ctx.fillStyle = lin(ctx, -200, -170, 200, 100, [[0, rgba('#ffc890', 0.22)], [0.45, rgba('#ffc890', 0)], [1, rgba('#1a0a20', 0.4)]]);
    ctx.fillRect(-210, -180, 420, 290);
    ctx.fillStyle = rgba(air, 0.3);
    ctx.fillRect(-210, -180, 420, 290);
  });
  strokePath(ctx, dome, rgba('#1a0c18', 0.7), 2.4);
  // the broken crown's edges hot orange (the fire that was), embers lifting off them
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(ORANGE, 0.55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-128, -120);
  ctx.lineTo(-100, -128);
  ctx.lineTo(-96, -146);
  ctx.lineTo(-70, -150);
  ctx.lineTo(-64, -166);
  ctx.lineTo(-40, -170);
  ctx.moveTo(14, -170);
  ctx.lineTo(44, -168);
  ctx.lineTo(52, -150);
  ctx.lineTo(78, -148);
  ctx.lineTo(86, -128);
  ctx.lineTo(112, -124);
  ctx.stroke();
  for (let i = 0; i < 10; i++) {
    const ex = -110 + r() * 220;
    const ey = -180 - r() * 70;
    ctx.fillStyle = rgba(i % 3 ? ORANGE : '#ffd08a', 0.7);
    ctx.fillRect(ex, ey, 2.4, 2.4);
  }
  ctx.restore();
  // the mouth: the portal
  const mouth: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-92, 100);
    c.lineTo(-92, -6);
    c.ellipse(0, -6, 92, 96, 0, Math.PI, P2);
    c.lineTo(92, 100);
    c.closePath();
  };
  fillPath(ctx, mouth, '#2a1258');
  within(ctx, mouth, () => {
    const g = ctx.createRadialGradient(0, -6, 4, 0, -6, 120);
    g.addColorStop(0, '#f0e0ff');
    g.addColorStop(0.18, '#c898f0');
    g.addColorStop(0.5, VIOLET);
    g.addColorStop(1, '#3a1680');
    ctx.fillStyle = g;
    ctx.fillRect(-100, -110, 200, 220);
  });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(CYAN, 0.5);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -6, 90, 94, 0, Math.PI, P2);
  ctx.stroke();
  ctx.restore();
  // the arch's voussoirs round the mouth
  ctx.strokeStyle = rgba('#1a0c18', 0.55);
  ctx.lineWidth = 1.2;
  for (let th = Math.PI; th <= P2 + 0.01; th += Math.PI / 11) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(th) * 94, -6 + Math.sin(th) * 98);
    ctx.lineTo(Math.cos(th) * 122, -6 + Math.sin(th) * 126);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, -6, 122, 126, 0, Math.PI, P2);
  ctx.stroke();
  // its light on the hearth and the floor in front
  ctx.globalCompositeOperation = 'lighter';
  const fl = ctx.createRadialGradient(0, 104, 0, 0, 104, 200);
  fl.addColorStop(0, rgba('#d8b0ff', 0.5));
  fl.addColorStop(1, rgba(VIOLET, 0));
  ctx.fillStyle = fl;
  ctx.save();
  ctx.scale(1, 0.2);
  ctx.fillRect(-220, 104 / 0.2 - 220, 440, 440);
  ctx.restore();
  ctx.restore();
  // bricks and tiles drifting off it
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.85 + r() * Math.PI * 0.7;
    const d = 130 + r() * 90;
    const bx = x + Math.cos(a) * d * s * 1.2;
    const by = y - 70 * s + Math.sin(a) * d * s;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(r() * P2);
    ctx.fillStyle = mix(i % 3 ? '#8a4a32' : '#d8ccc0', air, 0.5);
    ctx.fillRect(-4, -2.4, 8, 4.8);
    ctx.fillStyle = rgba('#ffd0a0', 0.25);
    ctx.fillRect(-4, -2.4, 8, 1.2);
    ctx.restore();
  }
}

/** The void: deep violet dark, nebulae in the finale's colours, stars, the far oven blazing, little islands of other
 * worlds far off. It falls darker at the top (under the HUD) and round the middle (behind the contract). */
function voidSky(ctx: Ctx, r: R): void {
  const box = { x: GLASS.x - 4, y: GLASS.y - 4, w: GLASS.w + 8, h: GLASS.h + 8 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  skyFill(ctx, box, [[0, '#040110'], [0.45, '#0c0520'], [1, '#160828']], 0.04);
  softNebula(ctx, r, { x: 420, y: 40, w: 760, h: 480 }, [VIOLET, MAGENTA], 0.42, 61);
  softNebula(ctx, r, { x: 860, y: 60, w: 620, h: 440 }, [CYAN, VIOLET], 0.42, 67);
  softNebula(ctx, r, { x: 560, y: 90, w: 420, h: 300 }, [CYAN, '#2a60c0'], 0.26, 73);
  softNebula(ctx, r, { x: 520, y: 300, w: 560, h: 300 }, [ORANGE, MAGENTA], 0.26, 71);
  // the warm key: a far orange glow high on the left
  glowAt(ctx, 640, 170, 300, ORANGE, 0.08, 0.8);
  stars(ctx, r, box, 380, '#f4ecff');
  stars(ctx, r, box, 90, '#cfe8ff');
  for (const [x, y, s2, c] of [[648, 236, 1.8, '#ffe8d0'], [1300, 150, 2, '#d8f4ff'], [884, 132, 1.4, '#ffd8f0'], [1250, 452, 1.5, '#eaf2ff']] as const) starburst(ctx, x, y, s2, c, 0.75);
  // tiny islands of the other worlds, far off: a snowy peak, a lighthouse
  const isle = (x: number, y: number, s2: number, top: () => void) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s2, s2);
    fillPath(ctx, polyPath([[-30, 0], [30, 0], [16, 14], [4, 30], [-8, 18], [-22, 10]]), '#2a1a3a');
    ctx.fillStyle = rgba('#ffc890', 0.25);
    ctx.fillRect(-30, -1, 60, 2);
    top();
    ctx.restore();
  };
  isle(812, 214, 0.7, () => {
    ctx.fillStyle = '#c8c0d8';
    ctx.fillRect(-4, -34, 8, 34);
    ctx.fillStyle = '#c03a3a';
    ctx.fillRect(-4, -26, 8, 5);
    ctx.fillRect(-4, -14, 8, 5);
    ctx.fillStyle = '#fff2c0';
    ctx.fillRect(-4, -40, 8, 6);
  });
  glowAt(ctx, 812, 214 - 37 * 0.7, 26, '#fff2c0', 0.5);
  // the portal's light flooding the void round it, then the oven
  glowAt(ctx, PORTAL[0], PORTAL[1], 260, VIOLET, 0.13, 0.9);
  glowAt(ctx, PORTAL[0], PORTAL[1], 100, '#e8c8ff', 0.15);
  farOven(ctx, r);
  // darker at the top (the boss's name and bar sit over it) and behind the contract in the middle
  vfill(ctx, box.x, box.y, box.w, 130, [[0, 'rgba(3,1,8,0.7)'], [1, 'rgba(3,1,8,0)']]);
  softly(ctx, box, (c) => {
    c.save();
    c.translate(VX, 470);
    c.scale(1.4, 1);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 220);
    g.addColorStop(0, 'rgba(3,1,8,0.55)');
    g.addColorStop(1, 'rgba(3,1,8,0)');
    c.fillStyle = g;
    c.fillRect(-240, -240, 480, 480);
    c.restore();
  });
  ctx.restore();
}

// ——— the swirl: the void winding round the far portal (a painted loop, ADD) ———

const SW_S = 224;
const SW_N = 10;
const SW_SCALE = 2.5;
const SWIRL_A = 0.38;

/** One frame of the swirl (phase 0…1 loops): three arms of nebular light winding into the eye, knots of light riding
 * each arm inwards (they advance one spacing per loop), fine filaments along them, cooler and fainter outside, hot
 * violet-white near the eye. Transparent: for an ADD blend. */
function swirlFrame(c: Ctx, s: number, phase: number): void {
  const cx = s / 2;
  const cy = s / 2;
  const R = s / 2;
  const arms = 3;
  const b = 0.32;
  const spiral = (t: number, arm: number): Pt => {
    // t 0 at the eye … 1 at the rim; a log spiral, the arm's angle offset
    const rr = R * (0.06 + 0.9 * t);
    const th = arm * (P2 / arms) - Math.log(0.06 + 0.9 * t) / b;
    return [cx + Math.cos(th) * rr, cy + Math.sin(th) * rr * 0.94];
  };
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let arm = 0; arm < arms; arm++) {
    // the arm's body: soft blobs along it, riding inwards with the phase
    const n = 26;
    for (let i = 0; i < n; i++) {
      const t = ((i + 1 - phase) / n) ** 1.15;
      const [x, y] = spiral(t, arm);
      const rad = R * (0.07 + 0.22 * t);
      const col = t < 0.25 ? mix('#f4e8ff', VIOLET, t / 0.25) : t < 0.6 ? mix(VIOLET, MAGENTA, (t - 0.25) / 0.35) : mix(MAGENTA, CYAN, (t - 0.6) / 0.4);
      const a = (t < 0.1 ? t / 0.1 : 1) * (1 - t) ** 1.1 * 0.42 * (0.7 + 0.3 * Math.sin(i * 2.7 + arm));
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(0.5, rgba(col, a * 0.4));
      g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g;
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // filaments: thin threads of light along the arm, a little off it, each its own speed
    for (let f = 0; f < 4; f++) {
      const off = (hash(arm, f) - 0.5) * 0.5;
      const sp = 1 + f;
      c.beginPath();
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        const [x, y] = spiral(t, arm + off * 0.3);
        const wob = Math.sin(t * 18 + f * 2 - phase * P2 * sp) * R * 0.012;
        if (k) c.lineTo(x + wob, y + wob);
        else c.moveTo(x, y);
      }
      const lg = c.createRadialGradient(cx, cy, R * 0.05, cx, cy, R);
      lg.addColorStop(0, rgba('#ffffff', 0.4));
      lg.addColorStop(0.4, rgba('#e0c0ff', 0.16));
      lg.addColorStop(1, rgba(CYAN, 0));
      c.strokeStyle = lg;
      c.lineWidth = 0.8 + (f % 2) * 0.6;
      c.stroke();
    }
  }
  // the eye
  const e = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.16);
  e.addColorStop(0, rgba('#ffffff', 0.5));
  e.addColorStop(1, rgba('#d8b0ff', 0));
  c.fillStyle = e;
  c.fillRect(cx - R * 0.2, cy - R * 0.2, R * 0.4, R * 0.4);
  c.restore();
}

/** The swirl in the still: frame 0, where the live loop shows it. */
function swirlStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(SW_S, SW_S);
  swirlFrame(g, SW_S, 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = SWIRL_A;
  ctx.translate(PORTAL[0], PORTAL[1]);
  ctx.rotate(0.6);
  const d = SW_S * SW_SCALE;
  ctx.drawImage(c, -d / 2, -d / 2, d, d);
  ctx.globalAlpha = 0.9;
  ctx.rotate(1.1);
  const d2 = SW_S * 0.42;
  ctx.drawImage(c, -d2 / 2, -d2 / 2, d2, d2);
  ctx.restore();
}

// ——— the back wall: piers either side of the window, the dado under it, the ticker board and cornice over it ———

/** The window's architrave (gilded moulding round the opening), its outer edge. */
const ARCH = 0.07;

function backWall(ctx: Ctx, r: R): void {
  const xl = sx(-XW, ZW);
  const xr = sx(XW, ZW);
  const box = { x: Math.floor(xl), y: 0, w: Math.ceil(xr - xl), h: Math.ceil(FLOOR_Y) };
  // the wall itself (the glass is cut out: the void shows through it)
  const wall: PathFn = (c) => {
    c.beginPath();
    c.rect(box.x, box.y, box.w, box.h);
    c.rect(WX1, WY0, WX0 - WX1, WY1 - WY0);
  };
  ctx.save();
  wall(ctx);
  ctx.clip('evenodd');
  surface(ctx, r, box, DAMASK, { vary: 0.4, warm: '#4a2a48', cool: '#120a20', cells: 4, strokes: 0.15, strokeAng: Math.PI / 2, strokeLen: 160, strokeW: 14, grain: 0.1, seed: 21 });
  // the piers: a tall raised panel each, a short one under the dado rail
  for (const [x0, x1] of [[xl, WX0 - ARCH * pz(ZW)], [WX1 + ARCH * pz(ZW), xr]]) {
    const w = x1 - x0;
    panel(ctx, r, x0 + w * 0.16, sy(2.2, ZW), w * 0.68, sy(0.74, ZW) - sy(2.2, ZW), PANEL, { bevel: 9, lights: [{ x: x0 + w * 0.3, a: 0.12, col: '#ffd8a0', w: 30 }] });
    panel(ctx, r, x0 + w * 0.16, sy(0.5, ZW), w * 0.68, sy(0.1, ZW) - sy(0.5, ZW), PANEL, { bevel: 7 });
  }
  // the dado under the window: a raised panel per bay, on the window's spacing
  for (let k = 0; k < 6; k++) {
    const x0 = sx(-WIN.X + k * U, ZW);
    const x1 = sx(-WIN.X + (k + 1) * U, ZW);
    const pad = 0.06 * pz(ZW);
    panel(ctx, r, x0 + pad, sy(0.47, ZW), x1 - x0 - pad * 2, sy(0.1, ZW) - sy(0.47, ZW), PANEL, { bevel: 8, lights: [{ x: (x0 + x1) / 2, a: 0.1, col: '#c8a0ff', w: 40 }] });
  }
  // the dado rail and the skirting, gilded mouldings across the whole wall
  const rail = (Y0: number, Y1: number) => {
    const y0 = sy(Y1, ZW);
    const y1 = sy(Y0, ZW);
    ctx.fillStyle = goldFill(ctx, 0, y0, 0, y1, 0.6);
    ctx.fillRect(box.x, y0, box.w, y1 - y0);
    ctx.fillStyle = rgba(GOLD.deep, 0.6);
    ctx.fillRect(box.x, y1, box.w, 1.5);
  };
  rail(0.52, 0.56);
  vfill(ctx, box.x, sy(0.07, ZW), box.w, sy(0, ZW) - sy(0.07, ZW), [[0, '#3a2232'], [0.2, '#24121e'], [1, '#100810']]);
  rail(0.065, 0.08);
  // the ticker's board and the cornice over the window: a gilded frieze, dentils on the spacing (U/6), a crown
  const yc0 = sy(2.62, ZW);
  vfill(ctx, box.x, 0, box.w, yc0, [[0, '#0a0610'], [0.6, '#1e1226'], [1, '#2a1a30']]);
  const yd = sy(2.66, ZW);
  for (let X = -XW; X < XW; X += U / 6) {
    const x = sx(X, ZW);
    ctx.fillStyle = goldFill(ctx, 0, yd - 7, 0, yd, 0.4);
    ctx.fillRect(x + 1, yd - 7, (U / 6) * pz(ZW) * 0.55, 7);
  }
  ctx.fillStyle = goldFill(ctx, 0, yc0 - 4, 0, yc0 + 3, 0.6);
  ctx.fillRect(box.x, yc0 - 4, box.w, 7);
  // the frieze between the board and the window head
  const yf0 = sy(TICK.Y0 - 0.02, ZW);
  const yf1 = WY0 - ARCH * pz(ZW);
  vfill(ctx, box.x, yf0, box.w, yf1 - yf0, [[0, '#2a1830'], [1, '#1a0e20']]);
  ctx.restore();
  // the window's architrave: a gilded moulding round the opening, lit on its top and left
  const a = ARCH * pz(ZW);
  const ax0 = WX0 - a;
  const ax1 = WX1 + a;
  const ay0 = WY0 - a;
  const archPath: PathFn = (c) => {
    c.beginPath();
    c.rect(ax0, ay0, ax1 - ax0, WY1 - ay0);
    c.rect(WX1, WY0, WX0 - WX1, WY1 - WY0);
  };
  ctx.save();
  archPath(ctx);
  ctx.clip('evenodd');
  ctx.fillStyle = goldFill(ctx, ax0, ay0, ax0 + 40, ay0 + 60, 0.8);
  ctx.fillRect(ax0, ay0, ax1 - ax0, WY1 - ay0);
  // the moulding's profile: a bead, a fillet, a cove (bands running round it)
  for (const [t, col, al] of [[0.18, '#fff4c8', 0.5], [0.42, GOLD.deep, 0.55], [0.62, GOLD.lit, 0.3], [0.85, GOLD.deep, 0.7]] as const) {
    ctx.strokeStyle = rgba(col, al);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(ax0 + a * t, ay0 + a * t, ax1 - ax0 - 2 * a * t, WY1 - ay0 - a * t + 4);
  }
  // the right jamb turned from the key
  ctx.fillStyle = rgba(GOLD.deep, 0.35);
  ctx.fillRect(WX1, ay0, a, WY1 - ay0);
  ctx.restore();
  // the ticker's board: brass, riveted, round a black glass display
  const tb = TICK_BOX;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = goldFill(ctx, 0, tb.y - 8, 0, tb.y + tb.h + 8, 0.7);
  ctx.fillRect(tb.x - 10, tb.y - 8, tb.w + 20, tb.h + 16);
  ctx.restore();
  ctx.fillStyle = '#05030a';
  ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
  // its dot matrix, unlit
  ctx.fillStyle = 'rgba(80,60,40,0.18)';
  for (let y = tb.y + 3; y < tb.y + tb.h - 2; y += 4) for (let x = tb.x + 3; x < tb.x + tb.w - 2; x += 4) ctx.fillRect(x, y, 2, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(tb.x, tb.y, tb.w, tb.h * 0.35);
  ctx.fillStyle = GOLD.deep;
  for (let x = tb.x - 4; x <= tb.x + tb.w + 4; x += (tb.w + 8) / 16) {
    ctx.beginPath();
    ctx.arc(x, tb.y - 4, 1.8, 0, P2);
    ctx.arc(x, tb.y + tb.h + 4, 1.8, 0, P2);
    ctx.fill();
  }
  // the wall darker in its corners and up high (the HUD), the window's violet on the piers' inner edges
  const shadeWall: PathFn = (c) => {
    c.beginPath();
    c.rect(box.x, box.y, box.w, box.h);
    c.rect(ax1, ay0, ax0 - ax1, WY1 - ay0);
  };
  within(ctx, shadeWall, () => {
    ctx.fillStyle = lin(ctx, box.x, 0, box.x + box.w, 0, [[0, 'rgba(6,2,10,0.45)'], [0.12, 'rgba(6,2,10,0)'], [0.88, 'rgba(6,2,10,0)'], [1, 'rgba(6,2,10,0.55)']]);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    vfill(ctx, box.x, 0, box.w, 200, [[0, 'rgba(4,2,8,0.55)'], [1, 'rgba(4,2,8,0)']]);
  });
  // the dado darkest under the middle of the window (the contract is slapped down there)
  softly(ctx, { x: 640, y: Math.round(WY1 - 40), w: 640, h: Math.round(FLOOR_Y - WY1 + 40) }, (c) => {
    c.save();
    c.translate(VX, (WY1 + FLOOR_Y) / 2);
    c.scale(2.2, 1);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 140);
    g.addColorStop(0, 'rgba(6,2,10,0.4)');
    g.addColorStop(1, 'rgba(6,2,10,0)');
    c.fillStyle = g;
    c.fillRect(-150, -150, 300, 300);
    c.restore();
  });
  // the window's light on the sill and the dado under it, the portal's violet
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  vfill(ctx, WX0, WY1, WX1 - WX0, 60, [[0, rgba(VIOLET, 0.1)], [1, rgba(VIOLET, 0)]]);
  ctx.restore();
  crevice(ctx, box.x, box.x + box.w, FLOOR_Y, -14, 0.5, '#05020a');
}

// ——— the window: gilded mullions on the spacing, a transom, amber fanlights, the glass ———

function windowFrame(ctx: Ctx): void {
  const k = pz(ZW);
  const mw = 0.05 * k;
  const yt = sy(WIN.Yt, ZW);
  // the glass: the room's light reflected in it, a little of the lamp and the sconces
  for (let i = 0; i < 6; i++) {
    const x0 = sx(-WIN.X + i * U, ZW);
    const x1 = sx(-WIN.X + (i + 1) * U, ZW);
    const pane: PathFn = (c) => {
      c.beginPath();
      c.rect(x0, yt, x1 - x0, WY1 - yt);
    };
    within(ctx, pane, () => {
      for (const [u, bw, al] of [[0.1, 0.24, 1], [0.5, 0.07, 0.8], [0.64, 0.12, 0.5]] as const) {
        const xa = x0 + (x1 - x0) * u;
        const g = ctx.createLinearGradient(xa, 0, xa + (x1 - x0) * bw, 0);
        g.addColorStop(0, 'rgba(230,210,255,0)');
        g.addColorStop(0.5, rgba('#e8dcff', 0.05 * al));
        g.addColorStop(1, 'rgba(230,210,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(xa, WY1);
        ctx.lineTo(xa + (x1 - x0) * bw, WY1);
        ctx.lineTo(xa + (x1 - x0) * bw + (WY1 - yt) * 0.35, yt);
        ctx.lineTo(xa + (WY1 - yt) * 0.35, yt);
        ctx.closePath();
        ctx.fill();
      }
      vfill(ctx, x0, WY1 - 70, x1 - x0, 70, [[0, 'rgba(255,200,140,0)'], [1, rgba('#ffc890', 0.05)]]);
    });
  }
  // the fanlights: amber and violet glass in a gilded fan over each bay
  for (let i = 0; i < 6; i++) {
    const x0 = sx(-WIN.X + i * U, ZW);
    const x1 = sx(-WIN.X + (i + 1) * U, ZW);
    const cx = (x0 + x1) / 2;
    const rr = (x1 - x0) / 2 - mw * 0.5;
    const fh = yt - WY0 - 6;
    const fan: PathFn = (c) => {
      c.beginPath();
      c.rect(x0, WY0, x1 - x0, yt - WY0);
    };
    within(ctx, fan, () => {
      // the stained glass dims the void up here (the boss bar sits over it)
      ctx.fillStyle = rgba('#140818', 0.55);
      ctx.fillRect(x0, WY0, x1 - x0, yt - WY0);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, yt, rr, fh, 0, Math.PI, P2);
      ctx.closePath();
      ctx.clip();
      const g = ctx.createRadialGradient(cx, yt, 0, cx, yt, rr);
      g.addColorStop(0, rgba('#ffb04a', 0.34));
      g.addColorStop(0.55, rgba('#c86a2a', 0.24));
      g.addColorStop(1, rgba(VIOLET, 0.2));
      ctx.fillStyle = g;
      ctx.fillRect(x0, WY0, x1 - x0, yt - WY0);
      // the fan's ribs
      ctx.strokeStyle = goldFill(ctx, x0, WY0, x1, yt, 0.4);
      ctx.lineWidth = 2.4;
      for (let s = 1; s < 6; s++) {
        const th = Math.PI + (s / 6) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(th) * rr * 0.22, yt + Math.sin(th) * fh * 0.22);
        ctx.lineTo(cx + Math.cos(th) * rr, yt + Math.sin(th) * fh);
        ctx.stroke();
      }
      ctx.restore();
      // the fan's arc and hub
      ctx.lineWidth = 3;
      ctx.strokeStyle = goldFill(ctx, x0, WY0, x1, yt, 0.6);
      ctx.beginPath();
      ctx.ellipse(cx, yt, rr, fh, 0, Math.PI, P2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, yt, rr * 0.22, fh * 0.22, 0, Math.PI, P2);
      ctx.closePath();
      ctx.fillStyle = goldFill(ctx, cx - 10, yt - 14, cx + 10, yt, 1);
      ctx.fill();
      // the spandrels outside the arc: dark leaded glass
      ctx.fillStyle = rgba('#0a0410', 0.45);
      ctx.beginPath();
      ctx.rect(x0, WY0, x1 - x0, yt - WY0);
      ctx.moveTo(cx + rr, yt);
      ctx.ellipse(cx, yt, rr, fh, 0, 0, Math.PI, true);
      ctx.fill('evenodd');
    });
  }
  // a bar across each big pane, thin
  const yb = sy(1.27, ZW);
  ctx.fillStyle = goldFill(ctx, 0, yb - 2, 0, yb + 2, 0.4);
  ctx.fillRect(WX0, yb - 2, WX1 - WX0, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(WX0, yb + 2, WX1 - WX0, 1.5);
  // the transom: a gilded beam across, its soffit in shade
  const th = 0.045 * k;
  ctx.fillStyle = goldFill(ctx, 0, yt - th / 2, 0, yt + th / 2, 0.8);
  ctx.fillRect(WX0, yt - th / 2, WX1 - WX0, th);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(WX0, yt + th / 2, WX1 - WX0, 2);
  // the mullions: gilded, the side towards the middle showing (the depth of the frame)
  for (let i = 1; i < 6; i++) {
    const X = -WIN.X + i * U;
    const x = sx(X, ZW);
    const side = X < 0 ? 1 : -1;
    const dep = Math.max(1, FOC * Math.abs(X) * (1 / ZW - 1 / (ZW + 0.08)));
    ctx.fillStyle = rgba(GOLD.deep, 0.9);
    ctx.fillRect(side > 0 ? x + mw / 2 : x - mw / 2 - dep, WY0, dep, WY1 - WY0);
    ctx.fillStyle = lin(ctx, x - mw / 2, 0, x + mw / 2, 0, [[0, GOLD.lit], [0.3, GOLD.body], [0.75, GOLD.shade], [1, GOLD.deep]]);
    ctx.fillRect(x - mw / 2, WY0, mw, WY1 - WY0);
    ctx.fillStyle = rgba('#fff8e0', 0.35);
    ctx.fillRect(x - mw / 2 + 1.5, WY0, 1.2, WY1 - WY0);
    for (const yy of [yt, WY1 - 4]) {
      ctx.fillStyle = goldFill(ctx, x - mw, yy - 5, x + mw, yy + 5, 0.9);
      ctx.fillRect(x - mw * 0.9, yy - 5, mw * 1.8, 10);
    }
  }
  // the sill: polished marble, its lip catching the light, deep enough to throw a shadow on the dado
  const sl = 0.035 * k;
  ctx.fillStyle = lin(ctx, 0, WY1, 0, WY1 + sl, [[0, '#d8c8e0'], [0.3, '#8a7a98'], [1, '#2a1e34']]);
  ctx.fillRect(WX0 - 18, WY1 - 2, WX1 - WX0 + 36, sl + 2);
  ctx.fillStyle = rgba('#ffffff', 0.4);
  ctx.fillRect(WX0 - 18, WY1 - 2, WX1 - WX0 + 36, 1.2);
  vfill(ctx, WX0 - 18, WY1 + sl, WX1 - WX0 + 36, 18, [[0, 'rgba(6,2,10,0.55)'], [1, 'rgba(6,2,10,0)']]);
  // the glass darker where it meets the frame
  ctx.save();
  ctx.beginPath();
  ctx.rect(WX0, WY0, WX1 - WX0, WY1 - WY0);
  ctx.clip();
  ctx.shadowColor = 'rgba(8,2,14,0.6)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.rect(WX0 - 200, WY0 - 200, WX1 - WX0 + 400, WY1 - WY0 + 400);
  ctx.rect(WX1, WY0, WX0 - WX1, WY1 - WY0);
  ctx.fillStyle = '#000';
  ctx.fill('evenodd');
  ctx.restore();
}

// ——— the deeds: little pictures of the places he has bought (the run's own stages), and share certificates ———

type Place = 'trattoria' | 'beach' | 'slopes' | 'space' | 'temple' | 'pier' | 'diner' | 'town';

/** A little painting of an earlier place (w×h, its own coordinates). */
function paintPlace(g: Ctx, w: number, h: number, kind: Place, seed: number): void {
  const rr = rng(seed);
  const sky = (stops: [number, string][]) => {
    g.fillStyle = lin(g, 0, 0, 0, h, stops);
    g.fillRect(0, 0, w, h);
  };
  const hy = h * 0.62;
  g.lineJoin = 'round';
  if (kind === 'trattoria') {
    sky([[0, '#7a3a24'], [0.6, '#b8643a'], [1, '#5a2a1a']]);
    // the brick oven's arch glowing, a lamp, the checked cloth
    g.fillStyle = '#8a3a24';
    g.beginPath();
    g.ellipse(w * 0.5, hy, w * 0.24, h * 0.36, 0, Math.PI, P2);
    g.fill();
    const f = g.createRadialGradient(w * 0.5, hy, 0, w * 0.5, hy, w * 0.16);
    f.addColorStop(0, '#fff0a0');
    f.addColorStop(0.5, '#ff8a2a');
    f.addColorStop(1, '#5a1a0a');
    g.fillStyle = f;
    g.beginPath();
    g.ellipse(w * 0.5, hy, w * 0.14, h * 0.22, 0, Math.PI, P2);
    g.fill();
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 3; j++) {
        g.fillStyle = (i + j) % 2 ? '#e8e0d0' : '#c8282a';
        g.fillRect((i * w) / 10, hy + (j * (h - hy)) / 3, w / 10 + 0.5, (h - hy) / 3 + 0.5);
      }
    }
    g.fillStyle = '#ffd890';
    g.beginPath();
    g.arc(w * 0.2, h * 0.18, 3, 0, P2);
    g.fill();
  } else if (kind === 'beach') {
    sky([[0, '#ff7a4a'], [0.45, '#ffc078'], [0.62, '#ffe0a8'], [0.63, '#2a78b8'], [0.8, '#1a5a98'], [0.81, '#e8c890'], [1, '#c8a060']]);
    g.fillStyle = '#fff4c8';
    g.beginPath();
    g.arc(w * 0.62, hy - 2, w * 0.1, Math.PI, P2);
    g.fill();
    g.strokeStyle = '#3a1a18';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(w * 0.22, h * 0.86);
    g.quadraticCurveTo(w * 0.2, h * 0.5, w * 0.28, h * 0.3);
    g.stroke();
    g.fillStyle = '#2a3a20';
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI * 0.9 + k * 0.42;
      g.beginPath();
      g.ellipse(w * 0.28 + Math.cos(a) * 9, h * 0.3 + Math.sin(a) * 4 + 3, 10, 2.6, a, 0, P2);
      g.fill();
    }
  } else if (kind === 'slopes') {
    sky([[0, '#5a9ad8'], [0.6, '#c8e4ff'], [1, '#f4f8ff']]);
    g.fillStyle = '#6a7aa8';
    g.beginPath();
    g.moveTo(0, hy + 4);
    g.lineTo(w * 0.45, h * 0.16);
    g.lineTo(w, hy + 10);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.fill();
    g.fillStyle = '#f4f8ff';
    g.beginPath();
    g.moveTo(w * 0.3, h * 0.38);
    g.lineTo(w * 0.45, h * 0.16);
    g.lineTo(w * 0.62, h * 0.4);
    g.lineTo(w * 0.52, h * 0.34);
    g.lineTo(w * 0.42, h * 0.42);
    g.fill();
    g.fillStyle = '#e8f0ff';
    g.fillRect(0, h * 0.78, w, h * 0.22);
    g.fillStyle = '#1e4a30';
    for (let i = 0; i < 7; i++) {
      const x = w * (0.06 + i * 0.15 + rr() * 0.04);
      const s2 = 8 + rr() * 6;
      g.beginPath();
      g.moveTo(x, h * 0.8 - s2 * 2.2);
      g.lineTo(x - s2 * 0.7, h * 0.82);
      g.lineTo(x + s2 * 0.7, h * 0.82);
      g.fill();
    }
  } else if (kind === 'space') {
    sky([[0, '#05061a'], [1, '#141838']]);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rgba('#ffffff', 0.4 + rr() * 0.6);
      g.fillRect(rr() * w, rr() * h, 1, 1);
    }
    const pg = g.createRadialGradient(w * 0.55, h * 0.5, 2, w * 0.6, h * 0.56, w * 0.26);
    pg.addColorStop(0, '#8ad0ff');
    pg.addColorStop(0.7, '#2a6ab0');
    pg.addColorStop(1, '#0a1a40');
    g.fillStyle = pg;
    g.beginPath();
    g.arc(w * 0.6, h * 0.56, w * 0.24, 0, P2);
    g.fill();
    g.strokeStyle = rgba('#e8d8b0', 0.8);
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(w * 0.6, h * 0.56, w * 0.38, h * 0.08, -0.2, 0, P2);
    g.stroke();
    g.strokeStyle = '#8a8a9a';
    g.lineWidth = 5;
    g.strokeRect(2, 2, w - 4, h - 4);
  } else if (kind === 'temple') {
    sky([[0, '#3a0a0a'], [0.5, '#c83a18'], [1, '#ff9a3a']]);
    g.fillStyle = '#140808';
    g.beginPath();
    g.moveTo(w * 0.2, h * 0.36);
    g.lineTo(w * 0.5, h * 0.2);
    g.lineTo(w * 0.8, h * 0.36);
    g.fill();
    g.fillRect(w * 0.18, h * 0.36, w * 0.64, h * 0.05);
    for (let i = 0; i < 5; i++) g.fillRect(w * (0.22 + i * 0.13), h * 0.41, w * 0.05, h * 0.4);
    g.fillRect(w * 0.14, h * 0.81, w * 0.72, h * 0.06);
    g.fillStyle = '#2a0a08';
    g.fillRect(0, h * 0.87, w, h * 0.13);
  } else if (kind === 'pier') {
    sky([[0, '#0a1430'], [0.6, '#2a3a6a'], [0.62, '#14244a'], [1, '#0a1428']]);
    g.fillStyle = '#d8d0e0';
    g.fillRect(w * 0.7, h * 0.24, w * 0.07, h * 0.4);
    g.fillStyle = '#c83030';
    g.fillRect(w * 0.7, h * 0.34, w * 0.07, h * 0.06);
    g.fillRect(w * 0.7, h * 0.5, w * 0.07, h * 0.06);
    g.fillStyle = '#fff2b0';
    g.fillRect(w * 0.7, h * 0.18, w * 0.07, h * 0.06);
    g.fillStyle = rgba('#fff2b0', 0.25);
    g.beginPath();
    g.moveTo(w * 0.735, h * 0.21);
    g.lineTo(0, h * 0.06);
    g.lineTo(0, h * 0.3);
    g.fill();
    g.fillStyle = '#2a1a14';
    g.fillRect(0, h * 0.66, w * 0.6, h * 0.04);
    for (let i = 0; i < 6; i++) g.fillRect(w * (0.04 + i * 0.1), h * 0.66, 2, h * 0.16);
  } else if (kind === 'diner') {
    sky([[0, '#2a8a8a'], [0.55, '#3aa0a0'], [0.56, '#e85a8a'], [0.62, '#e85a8a'], [0.63, '#d8d0c8'], [1, '#a89890']]);
    g.strokeStyle = '#ff8ad8';
    g.lineWidth = 2.6;
    g.strokeRect(w * 0.2, h * 0.18, w * 0.6, h * 0.16);
    g.strokeStyle = rgba('#ffffff', 0.7);
    g.lineWidth = 1;
    g.strokeRect(w * 0.2, h * 0.18, w * 0.6, h * 0.16);
    g.fillStyle = '#c8c8d0';
    for (let i = 0; i < 4; i++) {
      g.fillRect(w * (0.18 + i * 0.2), h * 0.7, w * 0.08, h * 0.04);
      g.fillRect(w * (0.21 + i * 0.2), h * 0.74, w * 0.02, h * 0.18);
    }
  } else {
    sky([[0, '#0a0a24'], [0.7, '#2a2050'], [1, '#14102a']]);
    g.fillStyle = '#fff4d0';
    g.beginPath();
    g.arc(w * 0.78, h * 0.2, 6, 0, P2);
    g.fill();
    g.fillStyle = '#0a0814';
    const roofs: Pt[] = [[0, h], [0, h * 0.6], [w * 0.12, h * 0.5], [w * 0.24, h * 0.6], [w * 0.24, h * 0.48], [w * 0.42, h * 0.48], [w * 0.42, h * 0.4], [w * 0.5, h * 0.3], [w * 0.58, h * 0.4], [w * 0.58, h * 0.56], [w * 0.74, h * 0.46], [w * 0.88, h * 0.56], [w, h * 0.52], [w, h]];
    fillPath(g, polyPath(roofs), '#0a0814');
    g.fillStyle = '#ffd870';
    for (let i = 0; i < 14; i++) g.fillRect(w * (0.04 + rr() * 0.9), h * (0.62 + rr() * 0.3), 2.4, 3);
  }
  // varnish: a soft sheen across the top left, the picture darker at its edges
  g.fillStyle = lin(g, 0, 0, w, h, [[0, 'rgba(255,240,210,0.16)'], [0.5, 'rgba(255,240,210,0)'], [1, 'rgba(20,8,4,0.3)']]);
  g.fillRect(0, 0, w, h);
}

/** A share certificate: cream paper, a guilloché border, a gilt seal on a red ribbon, lines of copperplate. */
function paintCert(g: Ctx, w: number, h: number, seed: number): void {
  const rr = rng(seed);
  g.fillStyle = lin(g, 0, 0, w, h, [[0, '#f4ead0'], [1, '#d8c8a0']]);
  g.fillRect(0, 0, w, h);
  const ink = seed % 2 ? '#2a5a40' : '#5a3a6a';
  g.strokeStyle = ink;
  g.lineWidth = 2;
  g.strokeRect(w * 0.06, h * 0.05, w * 0.88, h * 0.9);
  // the guilloché: loops round the border
  g.lineWidth = 0.7;
  g.strokeStyle = rgba(ink, 0.8);
  for (let i = 0; i < 40; i++) {
    const t = i / 40;
    const per = 2 * (w + h) * 0.82;
    let d = t * per;
    let x: number;
    let y: number;
    const iw = w * 0.82;
    const ih = h * 0.84;
    if (d < iw) [x, y] = [w * 0.09 + d, h * 0.08];
    else if ((d -= iw) < ih) [x, y] = [w * 0.91, h * 0.08 + d];
    else if ((d -= ih) < iw) [x, y] = [w * 0.91 - d, h * 0.92];
    else [x, y] = [w * 0.09, h * 0.92 - (d - iw)];
    g.beginPath();
    g.arc(x, y, 2.4, 0, P2);
    g.stroke();
  }
  // a vignette of a pizza at the head, the copperplate lines under it
  g.fillStyle = rgba('#d89a3a', 0.9);
  g.beginPath();
  g.arc(w / 2, h * 0.26, w * 0.12, 0, P2);
  g.fill();
  g.fillStyle = rgba('#c8382a', 0.85);
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    g.arc(w / 2 + Math.cos(k * 1.7) * w * 0.06, h * 0.26 + Math.sin(k * 1.7) * w * 0.06, 2, 0, P2);
    g.fill();
  }
  g.strokeStyle = rgba('#3a2a20', 0.55);
  g.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = h * (0.44 + i * 0.07);
    g.beginPath();
    g.moveTo(w * 0.18, y);
    for (let x = w * 0.18; x < w * (0.8 - (i === 5 ? 0.3 : rr() * 0.1)); x += 3) g.lineTo(x, y + Math.sin(x * 0.9 + i) * 0.8);
    g.stroke();
  }
  // the seal and its ribbon
  g.fillStyle = '#b8202a';
  g.beginPath();
  g.moveTo(w * 0.64, h * 0.82);
  g.lineTo(w * 0.6, h * 0.95);
  g.lineTo(w * 0.66, h * 0.91);
  g.lineTo(w * 0.7, h * 0.96);
  g.lineTo(w * 0.72, h * 0.82);
  g.fill();
  g.fillStyle = goldFill(g, w * 0.6, h * 0.74, w * 0.76, h * 0.88, 1);
  g.beginPath();
  g.arc(w * 0.68, h * 0.8, w * 0.08, 0, P2);
  g.fill();
  g.fillStyle = lin(g, 0, 0, w, h, [[0, 'rgba(255,250,230,0.18)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(60,30,10,0.25)']]);
  g.fillRect(0, 0, w, h);
}

/** A framed deed (a place, or a certificate) painted flat, gold frame and all, its red SOLD tag across a corner. */
const deedCache = new Map<string, HTMLCanvasElement>();
function deedCanvas(key: string, w: number, h: number, what: Place | 'cert', seed: number): HTMLCanvasElement {
  const ck = `${key}:${w}x${h}`;
  const hit = deedCache.get(ck);
  if (hit) return hit;
  const [c, g] = makeCanvas(w, h);
  const fw = Math.max(6, Math.round(Math.min(w, h) * 0.1));
  // the frame: a gilt moulding, mitred, lit on its top and left rails
  g.fillStyle = goldFill(g, 0, 0, w * 0.4, h, 0.8);
  g.fillRect(0, 0, w, h);
  const rail = (pts: Pt[], col: string) => fillPath(g, polyPath(pts), col);
  rail([[0, 0], [w, 0], [w - fw, fw], [fw, fw]], rgba('#fff4c8', 0.35));
  rail([[0, 0], [fw, fw], [fw, h - fw], [0, h]], rgba('#fff4c8', 0.15));
  rail([[0, h], [fw, h - fw], [w - fw, h - fw], [w, h]], rgba(GOLD.deep, 0.5));
  rail([[w, 0], [w, h], [w - fw, h - fw], [w - fw, fw]], rgba(GOLD.deep, 0.4));
  g.strokeStyle = rgba(GOLD.deep, 0.6);
  g.lineWidth = 1;
  g.strokeRect(fw * 0.45, fw * 0.45, w - fw * 0.9, h - fw * 0.9);
  // the picture in its slip
  const iw = w - fw * 2;
  const ih = h - fw * 2;
  g.fillStyle = '#1a1008';
  g.fillRect(fw - 1, fw - 1, iw + 2, ih + 2);
  g.save();
  g.translate(fw, fw);
  if (what === 'cert') paintCert(g, iw, ih, seed);
  else paintPlace(g, iw, ih, what, seed);
  g.restore();
  // the frame's shadow on the picture under its top rail
  g.fillStyle = lin(g, 0, fw, 0, fw + 6, [[0, 'rgba(10,4,2,0.5)'], [1, 'rgba(10,4,2,0)']]);
  g.fillRect(fw, fw, iw, 6);
  // the SOLD tag
  if (what !== 'cert') {
    g.save();
    g.translate(w - fw * 2.4, fw * 2.4);
    g.rotate(0.62);
    const tw = Math.max(34, w * 0.52);
    const th = Math.max(12, tw * 0.3);
    g.fillStyle = '#c8202a';
    g.fillRect(-tw / 2, -th / 2, tw, th);
    g.fillStyle = rgba('#000000', 0.25);
    g.fillRect(-tw / 2, th / 2 - 2, tw, 2);
    g.fillStyle = '#fff4e8';
    g.font = `bold ${Math.round(th * 0.78)}px "Arial Black", Impact, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('SOLD', 0, 0.5);
    g.restore();
  }
  deedCache.set(ck, c);
  return c;
}

// ——— the side walls: dark violet panelling, gold pilasters on the spacing, damask above; the deeds on the left ———
//
// Each wall is painted flat in its own canvas, columns at screen x and rows at height Y (so whatever is painted on it
// shrinks into the distance on its own), then laid onto the wall in narrow strips, each scaled to its depth.

const WV = 360;
const WTOP = 2.95;
/** The depth of a side wall at screen x. */
const zAtX = (x: number) => (FOC * XW) / Math.max(1, Math.abs(x - VX));

interface WallCv {
  c: HTMLCanvasElement;
  g: Ctx;
  x0: number;
  x1: number;
  side: -1 | 1;
}
function wallCanvas(side: -1 | 1): WallCv {
  const x0 = side < 0 ? 0 : Math.floor(sx(XW, ZW));
  const x1 = side < 0 ? Math.ceil(sx(-XW, ZW)) : W;
  const [c, g] = makeCanvas(x1 - x0, Math.ceil(WTOP * WV));
  return { c, g, x0, x1, side };
}
const wu = (w: WallCv, z: number) => sx(w.side * XW, z) - w.x0;
const wv = (Y: number) => (WTOP - Y) * WV;
/** A rectangle on the wall between depths z0..z1 and heights Y0..Y1, in the wall canvas. */
const wRect = (w: WallCv, z0: number, z1: number, Y0: number, Y1: number): Box => {
  const a = wu(w, z0);
  const b = wu(w, z1);
  return { x: Math.min(a, b), y: wv(Y1), w: Math.abs(b - a), h: wv(Y0) - wv(Y1) };
};
function mapWall(ctx: Ctx, w: WallCv): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  const step = 2;
  for (let x = w.x0; x < w.x1; x += step) {
    const z = zAtX(x + step / 2);
    const yT = sy(WTOP, z);
    const yB = sy(0, z);
    ctx.drawImage(w.c, x - w.x0, 0, step, w.c.height, x, yT, step + 0.6, yB - yT);
  }
  ctx.restore();
}

/** The deeds on the left wall: [z0, z1, Y0, Y1, what, seed] (the one that tilts at a stomp is DEED_TILT). */
const DEEDS: [number, number, number, number, Place | 'cert', number][] = [
  [PIL_Z[3] + 0.1, ZW - 0.1, 0.98, 1.66, 'cert', 3],
  [PIL_Z[2] + 0.09, PIL_Z[3] - 0.09, 1.22, 1.64, 'beach', 11],
  [PIL_Z[2] + 0.12, PIL_Z[3] - 0.12, 0.7, 1.02, 'cert', 4],
  [PIL_Z[0] + 0.1, PIL_Z[1] - 0.1, 1.3, 1.74, 'slopes', 13],
  [PIL_Z[0] + 0.14, PIL_Z[1] - 0.14, 0.68, 1.08, 'pier', 17],
  [PIL_Z[0] - 0.42, PIL_Z[0] - 0.12, 1.3, 1.74, 'temple', 19],
];
/** The big one over the water cooler, knocked crooked by stomps: a picture of the first trattoria. */
const DEED_TILT: [number, number, number, number, Place, number] = [PIL_Z[1] + 0.1, PIL_Z[2] - 0.1, 1.16, 1.72, 'trattoria', 7];
/** The deeds on the right wall: one, far back, well clear of the stopwatch. */
const DEEDS_R: [number, number, number, number, Place | 'cert', number][] = [[PIL_Z[2] + 0.1, PIL_Z[3] - 0.1, 0.72, 1.06, 'diner', 23]];

/** Paint a framed deed onto a wall canvas, its shadow on the wall first (thrown down and back, away from the key). */
function wallDeed(w: WallCv, d: [number, number, number, number, Place | 'cert', number], shadowA = 0.5): void {
  const [z0, z1, Y0, Y1, what, seed] = d;
  const b = wRect(w, z0, z1, Y0, Y1);
  const g = w.g;
  // the shadow: on the left wall the key throws it back (canvas right) and down; on the right wall back is canvas left
  g.save();
  g.filter = 'blur(4px)';
  g.fillStyle = rgba('#05020a', shadowA);
  g.fillRect(b.x + w.side * -1 * b.w * 0.06, b.y + 10, b.w, b.h);
  g.restore();
  const pw = Math.round(((z1 - z0) * 180) | 0) + 60;
  const ph = Math.round((Y1 - Y0) * 180) + 40;
  const cv = deedCanvas(`${what}${seed}`, pw, ph, what, seed);
  g.save();
  g.imageSmoothingEnabled = true;
  g.drawImage(cv, b.x, b.y, b.w, b.h);
  // a picture light's warmth falling down it from the top
  g.fillStyle = lin(g, 0, b.y, 0, b.y + b.h, [[0, rgba('#ffd8a0', 0.1)], [1, 'rgba(0,0,0,0.12)']]);
  g.fillRect(b.x, b.y, b.w, b.h);
  g.restore();
}

/** The panelling and damask of one side wall, in its canvas. */
function paintWallCanvas(w: WallCv, r: R): void {
  const g = w.g;
  const cw = w.c.width;
  const ch = w.c.height;
  // the damask: silk, a woven motif on the spacing (U/3 along, 0.2 up), catching the light a little
  const up = { x: 0, y: 0, w: cw, h: wv(0.56) };
  surface(g, r, up, DAMASK, { vary: 0.45, warm: '#4a2848', cool: '#140a22', cells: 3, strokes: 0.12, strokeAng: Math.PI / 2, strokeLen: 200, strokeW: 10, grain: 0.12, seed: 30 + w.side });
  g.save();
  const zs: number[] = [];
  for (let z = ZW - U / 6; z > 2.4; z -= U / 3) zs.push(z);
  for (const [i, z] of zs.entries()) {
    const kx = (FOC * XW) / (z * z);
    for (let Y = 0.72 + (i % 2) * 0.1; Y < WTOP - 0.3; Y += 0.2) {
      const x = wu(w, z);
      const y = wv(Y);
      g.save();
      g.translate(x, y);
      g.scale(Math.max(0.15, kx * 0.06 / 14), 1);
      // an ogee lozenge with a fleuron in it
      g.beginPath();
      g.moveTo(0, -24);
      g.bezierCurveTo(12, -14, 12, -6, 6, 0);
      g.bezierCurveTo(12, 6, 12, 14, 0, 24);
      g.bezierCurveTo(-12, 14, -12, 6, -6, 0);
      g.bezierCurveTo(-12, -6, -12, -14, 0, -24);
      g.strokeStyle = rgba('#8a5a8a', 0.22);
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = rgba('#7a4a7a', 0.14);
      g.beginPath();
      g.ellipse(0, 0, 4, 9, 0, 0, P2);
      g.fill();
      g.restore();
    }
  }
  g.restore();
  // the dado: a raised panel in each bay, the chair rail over it, the skirting under it
  const zb = [2.3, ...PIL_Z, ZW];
  for (let i = 0; i < zb.length - 1; i++) {
    const za = zb[i] + 0.07;
    const zc = zb[i + 1] - 0.07;
    const b = wRect(w, za, zc, 0.12, 0.48);
    g.fillStyle = PANEL;
    const db = wRect(w, zb[i], zb[i + 1], 0.06, 0.52);
    g.fillRect(db.x, db.y, db.w, db.h);
    if (b.w > 6) panel(g, r, b.x, b.y, b.w, b.h, PANEL, { bevel: Math.max(3, Math.min(12, b.w * 0.12)), vertical: false });
  }
  const rail = (Y0: number, Y1: number) => {
    g.fillStyle = goldFill(g, 0, wv(Y1), 0, wv(Y0), 0.5);
    g.fillRect(0, wv(Y1), cw, wv(Y0) - wv(Y1));
  };
  rail(0.52, 0.57);
  g.fillStyle = lin(g, 0, wv(0.07), 0, wv(0), [[0, '#3a2232'], [1, '#100810']]);
  g.fillRect(0, wv(0.07), cw, wv(0) - wv(0.07));
  rail(0.065, 0.085);
  // the cornice at the top
  g.fillStyle = lin(g, 0, 0, 0, wv(2.6), [[0, '#0a0610'], [0.7, '#24162c'], [1, '#3a2438']]);
  g.fillRect(0, 0, cw, wv(2.6));
  rail(2.6, 2.64);
  // the deeds
  if (w.side < 0) for (const d of DEEDS) wallDeed(w, d);
  else for (const d of DEEDS_R) wallDeed(w, d, 0.4);
  // the light: the left wall is turned from the key (in shade), the right wall faces it but is kept dark high up
  // (the stopwatch hangs there); the window's violet on both near the back
  const back = w.side < 0 ? cw : 0;
  g.fillStyle = lin(g, back, 0, w.side < 0 ? 0 : cw, 0, [[0, rgba('#9a60e0', 0.16)], [0.35, rgba('#9a60e0', 0)]]);
  g.globalCompositeOperation = 'lighter';
  g.fillRect(0, 0, cw, ch);
  g.globalCompositeOperation = 'source-over';
  if (w.side < 0) {
    g.fillStyle = 'rgba(8,3,14,0.32)';
    g.fillRect(0, 0, cw, ch);
    // the sconces' light on the wall: a scallop up and down from each shade
    for (const z of [PIL_Z[2]]) {
      const x = wu(w, z);
      const y = wv(SCONCE_Y);
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const [dy, sc2, a] of [[-0.24, 1, 0.22], [0.2, 0.8, 0.14]] as const) {
        g.save();
        g.translate(x, y + dy * WV);
        g.scale(Math.max(0.3, (FOC * XW) / (z * z) / 300), 1);
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, 160 * sc2);
        rg.addColorStop(0, rgba('#ffc070', a));
        rg.addColorStop(0.5, rgba('#ff9a3a', a * 0.35));
        rg.addColorStop(1, rgba('#ff9a3a', 0));
        g.fillStyle = rg;
        g.fillRect(-160, -160, 320, 320);
        g.restore();
      }
      g.restore();
    }
  } else {
    g.fillStyle = 'rgba(8,3,14,0.22)';
    g.fillRect(0, 0, cw, ch);
    // dark round where the stopwatch hangs
    const sxw = 1790 - w.x0;
    const syw = wv(EH - ((330 - HY) * zAtX(1790)) / FOC);
    g.save();
    g.translate(sxw, syw);
    g.scale(1, 2.2);
    const dg = g.createRadialGradient(0, 0, 0, 0, 0, 260);
    dg.addColorStop(0, 'rgba(4,2,8,0.6)');
    dg.addColorStop(1, 'rgba(4,2,8,0)');
    g.fillStyle = dg;
    g.fillRect(-300, -300, 600, 600);
    g.restore();
  }
  // grime where the wall meets the skirting
  g.fillStyle = lin(g, 0, wv(0.2), 0, wv(0.08), [[0, 'rgba(0,0,0,0)'], [1, 'rgba(4,2,6,0.35)']]);
  g.fillRect(0, wv(0.2), cw, wv(0.08) - wv(0.2));
}

const SCONCE_Y = 1.08;

/** A gilded pilaster standing out from a side wall at depth z: its face (along the wall, fluted), the edge that faces
 * us, its base and capital. */
function pilaster(ctx: Ctx, side: -1 | 1, z: number): void {
  const X0 = side * XW;
  const X1 = side * (XW - 0.05);
  const hw = 0.055;
  const Y0 = 0.085;
  const Y1 = 2.6;
  const face = sideAt(X1, z - hw, z + hw, Y0, Y1);
  const edge = quad(P(X0, Y0, z - hw), P(X1, Y0, z - hw), P(X1, Y1, z - hw), P(X0, Y1, z - hw));
  const [ax] = P(X1, 1, z - hw);
  const [bx] = P(X1, 1, z + hw);
  // its shadow on the wall behind (thrown back, away from the key)
  castShadow(ctx, face, 6, 8, side < 0 ? 0.45 : 0.25, '#05020a');
  const lit = side < 0 ? 0.55 : 0.85;
  fillPath(ctx, face, lin(ctx, ax, 0, bx, 0, [[0, mix(GOLD.body, GOLD.lit, lit * 0.5)], [0.5, mix(GOLD.body, GOLD.shade, 0.3)], [1, GOLD.shade]]));
  // the flutes: grooves running up it, each with a lit lip
  within(ctx, face, () => {
    for (const t of [0.22, 0.42, 0.62, 0.82]) {
      const zz = z - hw + t * 2 * hw;
      line(ctx, P(X1, Y0 + 0.14, zz), P(X1, Y1 - 0.16, zz), rgba(GOLD.deep, 0.55), Math.max(1, pz(zz) * 0.006));
      line(ctx, P(X1, Y0 + 0.14, zz - 0.006), P(X1, Y1 - 0.16, zz - 0.006), rgba(GOLD.lit, 0.35), 0.8);
    }
    // darker up high and low (the room's light is at the middle)
    const [, yT] = P(X1, Y1, z);
    const [, yB] = P(X1, Y0, z);
    ctx.fillStyle = lin(ctx, 0, yT, 0, yB, [[0, 'rgba(8,3,12,0.55)'], [0.35, 'rgba(8,3,12,0.1)'], [0.7, 'rgba(8,3,12,0.05)'], [1, 'rgba(8,3,12,0.4)']]);
    ctx.fillRect(Math.min(ax, bx) - 40, yT, Math.abs(bx - ax) + 80, yB - yT);
  });
  // the edge towards us catches the key
  fillPath(ctx, edge, lin(ctx, 0, P(X0, Y1, z)[1], 0, P(X0, Y0, z)[1], [[0, mix(GOLD.shade, '#140810', 0.4)], [0.4, side < 0 ? GOLD.body : GOLD.lit], [1, GOLD.shade]]));
  // its base block and capital (a little wider), and a volute at the capital
  for (const [Ya, Yb] of [[Y0, Y0 + 0.12], [Y1 - 0.14, Y1]] as const) {
    const blk = sideAt(side * (XW - 0.07), z - hw - 0.02, z + hw + 0.02, Ya, Yb);
    fillPath(ctx, blk, goldFill(ctx, ...P(X1, Yb, z - hw), ...P(X1, Ya, z + hw), 0.7));
    strokePath(ctx, blk, rgba(GOLD.deep, 0.7), 1);
    fillPath(ctx, quad(P(X0, Ya, z - hw - 0.02), P(side * (XW - 0.07), Ya, z - hw - 0.02), P(side * (XW - 0.07), Yb, z - hw - 0.02), P(X0, Yb, z - hw - 0.02)), GOLD.body);
  }
  strokePath(ctx, face, rgba(GOLD.deep, 0.8), 1);
  // the gold dulled by the room's dark: the left wall is turned from the key; the right is kept dark high up, where
  // his stopwatch hangs, its gold only catching the light low down by the safe
  const all = polyPath([P(X0, Y0 - 0.02, z - hw - 0.03), P(X0, Y1 + 0.02, z - hw - 0.03), P(X1, Y1 + 0.02, z - hw - 0.03), P(X1, Y1 + 0.02, z + hw + 0.03), P(X1, Y0 - 0.02, z + hw + 0.03), P(X1, Y0 - 0.02, z - hw - 0.03)]);
  const [, yT] = P(X0, Y1, z - hw);
  const [, yB] = P(X0, Y0, z - hw);
  within(ctx, all, () => {
    ctx.fillStyle = side < 0
      ? lin(ctx, 0, yT, 0, yB, [[0, 'rgba(6,2,10,0.85)'], [0.3, 'rgba(6,2,10,0.62)'], [0.6, 'rgba(6,2,10,0.5)'], [1, 'rgba(6,2,10,0.6)']])
      : lin(ctx, 0, yT, 0, yB, [[0, 'rgba(4,1,8,0.9)'], [0.45, 'rgba(4,1,8,0.78)'], [0.7, 'rgba(4,1,8,0.45)'], [1, 'rgba(4,1,8,0.5)']]);
    ctx.fillRect(Math.min(ax, bx) - 60, yT - 10, Math.abs(bx - ax) + 120, yB - yT + 20);
  });
}

/** A brass sconce on a left-wall pilaster: an arm out from the wall, a candle bulb under a pleated silk shade, lit. */
function sconce(ctx: Ctx, z: number): void {
  const [wx, wy] = P(-XW + 0.05, SCONCE_Y - 0.1, z - 0.06);
  const [x, y] = P(-XW + 0.2, SCONCE_Y, z - 0.08);
  const k = pz(z);
  // the backplate and the arm
  ctx.fillStyle = goldFill(ctx, wx - 5, wy - 14, wx + 5, wy + 14, 1);
  ctx.beginPath();
  ctx.ellipse(wx, wy, 0.02 * k, 0.07 * k, 0, 0, P2);
  ctx.fill();
  ctx.strokeStyle = GOLD.shade;
  ctx.lineWidth = Math.max(2, 0.018 * k);
  ctx.beginPath();
  ctx.moveTo(wx, wy);
  ctx.bezierCurveTo(wx + 0.06 * k, wy + 0.04 * k, x - 0.02 * k, y + 0.12 * k, x, y + 0.04 * k);
  ctx.stroke();
  ctx.strokeStyle = rgba(GOLD.lit, 0.6);
  ctx.lineWidth = 1;
  ctx.stroke();
  // the glow round it
  glowAt(ctx, x, y, 0.5 * k, '#ffb050', 0.22);
  glowAt(ctx, x, y, 0.16 * k, '#ffe0a0', 0.3);
  // the shade: pleated silk, lit through
  const sw0 = 0.045 * k;
  const sw1 = 0.075 * k;
  const sh = 0.09 * k;
  const shadeP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - sw0, y - sh * 0.6);
    c.lineTo(x + sw0, y - sh * 0.6);
    c.lineTo(x + sw1, y + sh * 0.4);
    c.lineTo(x - sw1, y + sh * 0.4);
    c.closePath();
  };
  fillPath(ctx, shadeP, lin(ctx, x - sw1, 0, x + sw1, 0, [[0, '#ffe8b0'], [0.5, '#ffc870'], [1, '#c87a3a']]));
  within(ctx, shadeP, () => {
    for (let i = -4; i <= 4; i++) line(ctx, [x + (i / 4) * sw0, y - sh * 0.6], [x + (i / 4) * sw1, y + sh * 0.4], rgba('#8a4a1a', 0.3), 1);
  });
  strokePath(ctx, shadeP, rgba('#5a2a10', 0.7), 1.2);
  ctx.fillStyle = rgba('#fff4d0', 0.8);
  ctx.fillRect(x - sw1, y + sh * 0.4 - 1.5, sw1 * 2, 1.5);
}

function sideWall(ctx: Ctx, r: R, side: -1 | 1): void {
  const w = wallCanvas(side);
  paintWallCanvas(w, r);
  mapWall(ctx, w);
  // the pilasters, front to back (the nearer drawn last)
  for (const z of PIL_Z.slice().reverse()) pilaster(ctx, side, z);
  if (side < 0) sconce(ctx, PIL_Z[2]);
  // the corner where the side wall meets the back wall, in shade
  const [cx] = P(side * XW, 0, ZW);
  ctx.fillStyle = lin(ctx, cx - side * 30, 0, cx, 0, [[0, 'rgba(4,2,8,0)'], [1, 'rgba(4,2,8,0.55)']]);
  ctx.fillRect(Math.min(cx, cx - side * 30), 0, 30, FLOOR_Y);
}

/** The deed that tilts at a stomp, on its own sprite (it hangs on a nail at its top middle). */
function deedTilt(ctx: Ctx): void {
  const w = wallCanvas(-1);
  // only this one deed on a transparent wall canvas, laid on in strips like the rest
  wallDeed(w, DEED_TILT, 0.5);
  mapWall(ctx, w);
  // the nail and the wire
  const [nx, ny] = DEED_NAIL;
  const [, ty] = P(-XW, DEED_TILT[3], (DEED_TILT[0] + DEED_TILT[1]) / 2);
  ctx.strokeStyle = rgba(GOLD.shade, 0.9);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(P(-XW, DEED_TILT[3], DEED_TILT[0] + 0.06)[0], ty + 2);
  ctx.lineTo(nx, ny);
  ctx.lineTo(P(-XW, DEED_TILT[3], DEED_TILT[1] - 0.06)[0], ty + 2);
  ctx.stroke();
  ctx.fillStyle = GOLD.lit;
  ctx.beginPath();
  ctx.arc(nx, ny, 2.2, 0, P2);
  ctx.fill();
}
const DEED_NAIL: Pt = P(-XW, DEED_TILT[3] + 0.08, (DEED_TILT[0] + DEED_TILT[1]) / 2);
const DEED_BOX: Box = (() => {
  const [z0, z1, Y0, Y1] = DEED_TILT;
  return boxOfPts([P(-XW, Y0, z0), P(-XW, Y1 + 0.1, z0), P(-XW, Y0, z1), P(-XW, Y1 + 0.1, z1)], 16);
})();

// ——— the floor: polished chequered marble on the spacing, the window mirrored in it ———

function floor(ctx: Ctx, r: R): void {
  const zN = 3.7;
  const outline = polyPath([P(-XW, 0, zN), P(-XW, 0, ZW), P(XW, 0, ZW), P(XW, 0, zN)]);
  const box = { x: 0, y: Math.floor(FLOOR_Y) - 2, w: W, h: Math.ceil(TY - FLOOR_Y) + 6 };
  ctx.save();
  outline(ctx);
  ctx.clip();
  ctx.fillStyle = '#100a14';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  // the tiles: black marble and plum marble, on the window's spacing
  for (let i = -5; i < 5; i++) {
    for (let j = 0; j < 4; j++) {
      const X0 = -WIN.X + i * U;
      const z1 = ZW - j * U;
      const z0 = z1 - U;
      const t = quad(P(X0, 0, z0), P(X0 + U, 0, z0), P(X0 + U, 0, z1), P(X0, 0, z1));
      const dark = (i + j) % 2 === 0;
      fillPath(ctx, t, dark ? '#0e0a12' : '#2a1a30');
    }
  }
  // veins through the marble (foreshortened: stretched across)
  lay(ctx, noiseMask(6, 401, { kind: 'web', cover: 0.16, soft: 0.04, col: '#a890b8', w: 240, h: 30 }), box, 0.12);
  lay(ctx, drift('#4a3050', '#08040c', 5, 403, 200, 24), box, 0.35);
  // the joints between the tiles
  for (let i = -5; i <= 5; i++) line(ctx, P(-WIN.X + i * U, 0, zN), P(-WIN.X + i * U, 0, ZW), 'rgba(0,0,0,0.5)', 1.2);
  for (let j = 1; j < 3; j++) {
    const z = ZW - j * U;
    line(ctx, P(-XW, 0, z), P(XW, 0, z), 'rgba(0,0,0,0.5)', 1.2);
    line(ctx, P(-XW, 0, z - 0.01), P(XW, 0, z - 0.01), 'rgba(200,180,220,0.08)', 1);
  }
  // the polish: the window mirrored in it (the void's violet in a column under each bay, the mullions dark), the
  // curtains and the clock as dark columns, the lamp's warmth on the right
  softly(ctx, box, (c) => {
    for (let i = 0; i < 6; i++) {
      const x0 = sx(-WIN.X + i * U, ZW) + 8;
      const x1 = sx(-WIN.X + (i + 1) * U, ZW) - 8;
      const g = c.createLinearGradient(0, FLOOR_Y, 0, TY);
      const near = 1 - Math.abs(i - 2.5) / 3;
      g.addColorStop(0, rgba('#c8a0ff', 0.12 + near * 0.05));
      g.addColorStop(1, rgba('#c8a0ff', 0));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x0, FLOOR_Y);
      c.lineTo(x1, FLOOR_Y);
      c.lineTo(x1 + (x1 - VX) * 0.35, TY);
      c.lineTo(x0 + (x0 - VX) * 0.35, TY);
      c.closePath();
      c.fill();
    }
    // the far portal's blaze, mirrored under it
    const pg = c.createRadialGradient(PORTAL[0], FLOOR_Y + 30, 0, PORTAL[0], FLOOR_Y + 30, 90);
    pg.addColorStop(0, rgba('#f0d8ff', 0.25));
    pg.addColorStop(1, rgba('#f0d8ff', 0));
    c.fillStyle = pg;
    c.fillRect(PORTAL[0] - 90, FLOOR_Y, 180, 120);
  }, 0.25, 'lighter');
  ctx.restore();
  // where the floor meets the walls: occlusion along the skirting
  crevice(ctx, sx(-XW, ZW), sx(XW, ZW), FLOOR_Y, 16, 0.5, '#04020a');
  for (const side of [-1, 1] as const) {
    ctx.save();
    outline(ctx);
    ctx.clip();
    const a = P(side * XW, 0, ZW);
    const b = P(side * XW, 0, 3.0);
    ctx.strokeStyle = 'rgba(4,2,10,0.5)';
    ctx.lineWidth = 18;
    ctx.filter = 'blur(6px)';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.restore();
  }
  void r;
}

// ——— the grandfather clock: rosewood and ormolu, a brass dial, a glass door on its trunk showing the pendulum ———

/** The clock's outline, one band at a time: [Y0, Y1, half width]. */
const CLK_BANDS: [number, number, number][] = [
  [0, 0.05, 0.235],
  [0.05, 0.2, 0.225],
  [0.2, 0.24, 0.205],
  [0.24, 1.18, 0.185],
  [1.18, 1.25, 0.225],
  [1.25, 1.74, 0.215],
  [1.74, 1.8, 0.245],
];
const CLK_TOP = 1.8;

function clockCase(ctx: Ctx, r: R): void {
  const z = CLK.z;
  const k = CLK_K;
  const cx = CLK_X;
  const X = CLK.X;
  const dep = 0.2;
  // the case's silhouette (the front of each band, stacked) and its right side (we see it: the clock is left of us)
  const front: Pt[] = [];
  for (const [Y0, Y1, hw] of CLK_BANDS) front.push(P(X - hw, Y0, z), P(X - hw, Y1, z));
  const back: Pt[] = [];
  for (const [Y0, Y1, hw] of CLK_BANDS.slice().reverse()) back.push(P(X + hw, Y1, z), P(X + hw, Y0, z));
  const outline = polyPath([...front, ...back]);
  // its shadow on the wall and the curtain behind it, and the floor round its foot
  castShadow(ctx, outline, 16, 18, 0.55, '#05020a');
  ctx.fillStyle = 'rgba(4,2,8,0.6)';
  ctx.beginPath();
  ctx.ellipse(cx + 10, sy(0, z) + 2, 0.3 * k, 8, 0, 0, P2);
  ctx.fill();
  // the right side of each band, in shade, the window's violet on it
  for (const [Y0, Y1, hw] of CLK_BANDS) {
    const sd = sideAt(X + hw, z, z + dep, Y0, Y1);
    fillPath(ctx, sd, lin(ctx, ...P(X + hw, Y1, z), ...P(X + hw, Y1, z + dep), [[0, '#1e0c0e'], [1, '#2a1438']]));
  }
  // the front: rosewood, its grain, the varnish
  solid(ctx, outline, boxOfPts([...front, ...back], 0), 'wood', ROSE, { depth: 0.25, line: false, form: 0.4 });
  within(ctx, outline, () => {
    const b = boxOfPts([...front, ...back], 0);
    woodGrain(ctx, r, b, ROSE, true, 0.7);
    varnish(ctx, b, [{ x: cx - 0.08 * k, a: 0.16, col: '#ffd8a8', w: 14 }], { sheen: 0.1 });
  });
  strokePath(ctx, outline, '#0a0406', 2.2);
  // the bands' mouldings in gold
  for (const Y of [0.05, 0.2, 0.24, 1.18, 1.25, 1.74, 1.8]) {
    const hw = CLK_BANDS.find((b) => Y >= b[0] && Y <= b[1])![2] + 0.01;
    const [x0, y] = P(X - hw, Y, z);
    const [x1] = P(X + hw, Y, z);
    ctx.fillStyle = goldFill(ctx, 0, y - 2.5, 0, y + 2.5, 0.6);
    ctx.fillRect(x0, y - 2, x1 - x0, 4);
  }
  // the bracket feet
  for (const s of [-1, 1]) {
    const [fx0, fy] = P(X + s * 0.235, 0, z);
    const [fx1] = P(X + s * 0.15, 0, z);
    fillPath(ctx, polyPath([[fx0, fy], [fx1, fy], [fx0 + (fx1 - fx0) * 0.2, fy - 9], [fx0, fy - 12]]), '#140608');
  }
  // the trunk's door: a raised panel round the glass, gilt beads
  const [dx0, dy0] = P(X - 0.155, 1.15, z);
  const [dx1, dy1] = P(X + 0.155, 0.3, z);
  ctx.strokeStyle = rgba(GOLD.body, 0.75);
  ctx.lineWidth = 2;
  ctx.strokeRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
  const tw = TRUNK_WIN;
  const glassP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(tw.x0, tw.y1);
    c.lineTo(tw.x0, tw.y0 + (tw.x1 - tw.x0) / 2);
    c.arc(CLK_X, tw.y0 + (tw.x1 - tw.x0) / 2, (tw.x1 - tw.x0) / 2, Math.PI, P2);
    c.lineTo(tw.x1, tw.y1);
    c.closePath();
  };
  // inside the trunk: dark, its back lined in faded gold, the weights' chains hanging at the sides
  fillPath(ctx, glassP, '#0c0608');
  within(ctx, glassP, () => {
    ctx.fillStyle = lin(ctx, tw.x0, 0, tw.x1, 0, [[0, '#2a1a10'], [0.4, '#4a3018'], [1, '#1a0c08']]);
    ctx.globalAlpha = 0.6;
    ctx.fillRect(tw.x0, tw.y0, tw.x1 - tw.x0, tw.y1 - tw.y0);
    ctx.globalAlpha = 1;
    // two brass weights hanging on their chains, high up
    for (const s of [-1, 1]) {
      const wx = CLK_X + s * (tw.x1 - tw.x0) * 0.32;
      line(ctx, [wx, tw.y0], [wx, tw.y0 + 50], rgba(GOLD.shade, 0.9), 1.2);
      ctx.fillStyle = goldFill(ctx, wx - 6, 0, wx + 6, 0, 0.8);
      ctx.fillRect(wx - 6, tw.y0 + 50, 12, 34);
      ctx.fillStyle = rgba('#000', 0.3);
      ctx.fillRect(wx + 2, tw.y0 + 50, 4, 34);
    }
    // the case's own shadow over the top of the space
    vfill(ctx, tw.x0, tw.y0, tw.x1 - tw.x0, 40, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]);
  });
  strokePath(ctx, glassP, goldFill(ctx, tw.x0, tw.y0, tw.x1, tw.y1, 0.6), 3);
  // the hood: gilt columns either side of the dial, the dial door's frame
  for (const s of [-1, 1]) {
    const [c0, cy0] = P(X + s * 0.19 - 0.018, 1.72, z);
    const [c1, cy1] = P(X + s * 0.19 + 0.018, 1.27, z);
    ctx.fillStyle = lin(ctx, c0, 0, c1, 0, [[0, GOLD.lit], [0.4, GOLD.body], [1, GOLD.deep]]);
    ctx.fillRect(c0, cy0, c1 - c0, cy1 - cy0);
    ctx.fillStyle = goldFill(ctx, c0 - 2, cy0 - 3, c1 + 2, cy0 + 3, 1);
    ctx.fillRect(c0 - 2, cy0 - 3, c1 - c0 + 4, 5);
    ctx.fillRect(c0 - 2, cy1 - 2, c1 - c0 + 4, 5);
  }
  // the dial plate: brass, square with an arch over it (its spandrels engraved), the chapter ring silvered
  const [px0, py0] = P(X - 0.16, 1.72, z);
  const [px1, py1] = P(X + 0.16, 1.29, z);
  ctx.fillStyle = goldFill(ctx, px0, py0, px1, py1, 0.7);
  ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
  ctx.strokeStyle = rgba(GOLD.deep, 0.7);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(px0, py0, px1 - px0, py1 - py0);
  for (const [qx, qy] of [[px0, py0], [px1, py0], [px0, py1], [px1, py1]]) {
    ctx.strokeStyle = rgba(GOLD.deep, 0.5);
    ctx.beginPath();
    ctx.arc(qx + (qx < cx ? 9 : -9), qy + (qy < DIAL[1] ? 9 : -9), 5, 0, P2);
    ctx.stroke();
  }
  const [dcx, dcy] = DIAL;
  const R = DIAL_R;
  ctx.fillStyle = lin(ctx, dcx - R, dcy - R, dcx + R, dcy + R, [[0, '#f4f0f8'], [0.6, '#c8c0d0'], [1, '#8a8098']]);
  ctx.beginPath();
  ctx.arc(dcx, dcy, R, 0, P2);
  ctx.fill();
  // the centre: matted gold, a little pizza on it (his crest)
  ctx.fillStyle = goldFill(ctx, dcx - R * 0.6, dcy - R * 0.6, dcx + R * 0.6, dcy + R * 0.6, 0.5);
  ctx.beginPath();
  ctx.arc(dcx, dcy, R * 0.62, 0, P2);
  ctx.fill();
  ctx.fillStyle = '#e8a840';
  ctx.beginPath();
  ctx.arc(dcx, dcy + R * 0.3, R * 0.16, 0, P2);
  ctx.fill();
  ctx.fillStyle = '#c8382a';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(dcx + Math.cos(i * 2.1) * R * 0.07, dcy + R * 0.3 + Math.sin(i * 2.1) * R * 0.07, 1.4, 0, P2);
    ctx.fill();
  }
  // the hours: twelve strokes, the quarters doubled
  ctx.strokeStyle = '#1a1020';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * P2;
    const q = i % 3 === 0;
    ctx.lineWidth = q ? 2.4 : 1.4;
    ctx.beginPath();
    ctx.moveTo(dcx + Math.sin(a) * R * 0.74, dcy - Math.cos(a) * R * 0.74);
    ctx.lineTo(dcx + Math.sin(a) * R * 0.95, dcy - Math.cos(a) * R * 0.95);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba('#1a1020', 0.5);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(dcx, dcy, R * 0.97, 0, P2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(dcx, dcy, R * 0.72, 0, P2);
  ctx.stroke();
  // the dial in the hood's shade, warm (it sits behind the left lane: kept below the feet in value)
  ctx.fillStyle = rgba('#3a2010', 0.32);
  ctx.beginPath();
  ctx.arc(dcx, dcy, R + 2, 0, P2);
  ctx.fill();
  // the dial's glass: a sheen across it
  ctx.fillStyle = lin(ctx, dcx - R, dcy - R, dcx + R * 0.2, dcy + R * 0.2, [[0, 'rgba(255,255,255,0.28)'], [0.4, 'rgba(255,255,255,0.04)'], [1, 'rgba(255,255,255,0)']]);
  ctx.beginPath();
  ctx.arc(dcx, dcy, R, 0, P2);
  ctx.fill();
  ctx.strokeStyle = goldFill(ctx, dcx - R, dcy - R, dcx + R, dcy + R, 1);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(dcx, dcy, R + 1.5, 0, P2);
  ctx.stroke();
  // the pediment, broken: two raking cornices rising to a gap, a gilt rosette at each inner end, a gilt urn finial on a
  // plinth in the gap and a ball finial at each corner
  const [qx0, qy0] = P(X - 0.245, CLK_TOP, z);
  const [qx1] = P(X + 0.245, CLK_TOP, z);
  const ph = 0.15 * k;
  const gap = 0.045 * k;
  const th = 0.03 * k;
  for (const s of [-1, 1]) {
    const xo = s < 0 ? qx0 : qx1;
    const xi = cx + s * gap;
    const yi = qy0 - ph;
    const half = polyPath([[xo, qy0], [xo, qy0 - th], [xi, yi], [xi, qy0]]);
    fillPath(ctx, half, lin(ctx, xo, yi, xi, qy0, [[0, '#4a2018'], [1, '#1a0808']]));
    within(ctx, half, () => woodGrain(ctx, r, { x: Math.min(xo, xi), y: yi, w: Math.abs(xi - xo), h: qy0 - yi }, ROSE, false, 0.5));
    // the tympanum's sunk panel, in shade
    fillPath(ctx, polyPath([[xo + s * -6, qy0 - 3], [xi - s * 4, yi + th * 2.2], [xi - s * 4, qy0 - 3]].map(([a, b]) => [s < 0 ? a + 8 : a - 8, b] as Pt)), 'rgba(6,2,4,0.45)');
    strokePath(ctx, half, '#0a0406', 1.6);
    // the raking moulding: gilt, lit on its upper edge
    ctx.lineCap = 'round';
    line(ctx, [xo, qy0 - th], [xi, yi], GOLD.shade, 4);
    line(ctx, [xo, qy0 - th - 1], [xi, yi - 1], s < 0 ? GOLD.lit : GOLD.body, 1.6);
    // the rosette
    const rr2 = 0.024 * k;
    ctx.fillStyle = goldFill(ctx, xi - rr2, yi - rr2, xi + rr2, yi + rr2, 1);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * P2;
      ctx.moveTo(xi + Math.cos(a) * rr2 * 0.4, yi + th * 0.6 + Math.sin(a) * rr2 * 0.4);
      ctx.arc(xi + Math.cos(a) * rr2 * 0.6, yi + th * 0.6 + Math.sin(a) * rr2 * 0.6, rr2 * 0.42, 0, P2);
    }
    ctx.fill();
    ctx.fillStyle = GOLD.deep;
    ctx.beginPath();
    ctx.arc(xi, yi + th * 0.6, rr2 * 0.3, 0, P2);
    ctx.fill();
    // the corner's ball finial
    const fx2 = xo - s * 5;
    ctx.fillStyle = goldFill(ctx, fx2 - 5, qy0 - th - 14, fx2 + 5, qy0 - th, 1);
    ctx.fillRect(fx2 - 3, qy0 - th - 5, 6, 5);
    ctx.beginPath();
    ctx.arc(fx2, qy0 - th - 9, 4.5, 0, P2);
    ctx.fill();
  }
  // the plinth in the gap and its urn
  const ub = qy0 - ph * 0.55;
  ctx.fillStyle = lin(ctx, cx - gap, 0, cx + gap, 0, [[0, '#4a2018'], [1, '#140606']]);
  ctx.fillRect(cx - gap * 0.75, ub, gap * 1.5, qy0 - ub);
  ctx.strokeStyle = '#0a0406';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(cx - gap * 0.75, ub, gap * 1.5, qy0 - ub);
  const urn: PathFn = (c) => {
    c.beginPath();
    c.moveTo(cx - 5, ub);
    c.lineTo(cx + 5, ub);
    c.quadraticCurveTo(cx + 3, ub - 4, cx + 7, ub - 10);
    c.quadraticCurveTo(cx + 8, ub - 17, cx + 2, ub - 19);
    c.lineTo(cx + 1, ub - 30);
    c.lineTo(cx - 1, ub - 30);
    c.lineTo(cx - 2, ub - 19);
    c.quadraticCurveTo(cx - 8, ub - 17, cx - 7, ub - 10);
    c.quadraticCurveTo(cx - 3, ub - 4, cx - 5, ub);
    c.closePath();
  };
  fillPath(ctx, urn, goldFill(ctx, cx - 8, ub - 30, cx + 8, ub, 1));
  strokePath(ctx, urn, rgba(GOLD.deep, 0.9), 1);
  ctx.fillStyle = rgba('#fff8e0', 0.8);
  ctx.fillRect(cx - 4, ub - 14, 1.5, 5);
  // the key's light down its left edge and on its mounts, the window's violet rim on its right
  rim(ctx, outline, 0.25, 3, '#b890ff');
  ctx.fillStyle = lin(ctx, cx - 0.24 * k, 0, cx + 0.24 * k, 0, [[0, 'rgba(255,210,160,0.12)'], [0.4, 'rgba(255,210,160,0)'], [1, 'rgba(0,0,0,0.2)']]);
  within(ctx, outline, () => ctx.fillRect(cx - 0.3 * k, sy(2, z), 0.6 * k, sy(0, z) - sy(2, z)));
}

/** One frame of the pendulum (phase 0…1 loops a full swing): a brass rod, a lenticular bob; the bob's highlight
 * slides as it swings through the light, a smear behind it when it moves fastest. Painted in its frame (PEND.w×h, the
 * pivot at the top middle), clipped to the trunk's glass. */
const PEND_A = 0.075;
function pendFrame(c: Ctx, phase: number): void {
  const w = PEND.w;
  const px = w / 2;
  const py = 0;
  const th = PEND_A * Math.sin(phase * P2);
  const om = PEND_A * Math.cos(phase * P2);
  // the glass's clip, in the frame's coordinates
  const tw = TRUNK_WIN;
  const ox = CLK_X - w / 2;
  const oy = PIV[1];
  c.save();
  c.beginPath();
  const gw = tw.x1 - tw.x0;
  c.moveTo(tw.x0 - ox, tw.y1 - oy);
  c.lineTo(tw.x0 - ox, tw.y0 - oy + gw / 2);
  c.arc(CLK_X - ox, tw.y0 - oy + gw / 2, gw / 2, Math.PI, P2);
  c.lineTo(tw.x1 - ox, tw.y1 - oy);
  c.closePath();
  c.clip();
  const at = (a: number, l: number): Pt => [px + Math.sin(a) * l, py + Math.cos(a) * l];
  const bobR = 0.065 * CLK_K;
  const draw = (a: number, al: number) => {
    const [bx, by] = at(a, PEND_L);
    c.globalAlpha = al;
    // the rod: a flat brass strip, lit along its left edge
    c.strokeStyle = GOLD.shade;
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(bx, by);
    c.stroke();
    c.strokeStyle = rgba(GOLD.lit, 0.8);
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(px - 1, py);
    c.lineTo(bx - 1, by);
    c.stroke();
    // the bob: a lens of polished brass, its rim bevelled, a ring engraved on it
    const g = c.createRadialGradient(bx - bobR * 0.35 + a * 30, by - bobR * 0.4, 1, bx, by, bobR);
    g.addColorStop(0, '#fff6d0');
    g.addColorStop(0.25, GOLD.lit);
    g.addColorStop(0.6, GOLD.body);
    g.addColorStop(1, GOLD.deep);
    c.fillStyle = g;
    c.beginPath();
    c.arc(bx, by, bobR, 0, P2);
    c.fill();
    c.strokeStyle = rgba(GOLD.deep, 0.8);
    c.lineWidth = 1.4;
    c.stroke();
    c.strokeStyle = rgba(GOLD.deep, 0.35);
    c.lineWidth = 1;
    c.beginPath();
    c.arc(bx, by, bobR * 0.62, 0, P2);
    c.stroke();
    // the highlight: the key's glint, sliding across the lens as it swings
    c.fillStyle = rgba('#ffffff', 0.85);
    c.beginPath();
    c.ellipse(bx - bobR * 0.38 + a * 60, by - bobR * 0.42, bobR * 0.22, bobR * 0.12, -0.6, 0, P2);
    c.fill();
    c.globalAlpha = 1;
  };
  // the smear: two ghosts behind it, along its swing, strongest at the bottom of the swing (fastest)
  const sp = Math.abs(om) / PEND_A;
  for (const [lag, al] of [[0.5, 0.12], [0.28, 0.2]] as const) draw(th - Math.sign(om) * lag * PEND_A * 0.35 * sp, al * sp);
  draw(th, 1);
  // the trunk's shadow over the top of the rod
  const sg = c.createLinearGradient(0, tw.y0 - oy, 0, tw.y0 - oy + 50);
  sg.addColorStop(0, 'rgba(0,0,0,0.6)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sg;
  c.fillRect(0, 0, w, tw.y0 - oy + 50);
  c.restore();
}

/** The trunk's glass over the pendulum: two sheen bands (a static image over the live pendulum). */
function trunkGlass(c: Ctx, ox: number, oy: number): void {
  const tw = TRUNK_WIN;
  const gw = tw.x1 - tw.x0;
  c.save();
  c.beginPath();
  c.moveTo(tw.x0 - ox, tw.y1 - oy);
  c.lineTo(tw.x0 - ox, tw.y0 - oy + gw / 2);
  c.arc(CLK_X - ox, tw.y0 - oy + gw / 2, gw / 2, Math.PI, P2);
  c.lineTo(tw.x1 - ox, tw.y1 - oy);
  c.closePath();
  c.clip();
  for (const [u, bw, a] of [[0.08, 0.3, 0.16], [0.6, 0.1, 0.1]] as const) {
    const x0 = tw.x0 - ox + gw * u;
    const g = c.createLinearGradient(x0, 0, x0 + gw * bw, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, rgba('#f0e8ff', a));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x0, tw.y1 - oy);
    c.lineTo(x0 + gw * bw, tw.y1 - oy);
    c.lineTo(x0 + gw * bw + 60, tw.y0 - oy);
    c.lineTo(x0 + 60, tw.y0 - oy);
    c.closePath();
    c.fill();
  }
  c.restore();
}

/** A clock hand (kind 0 hour, 1 minute, 2 seconds) on a canvas, the arbor at its centre, pointing up. */
const HAND = [
  { len: 0.56, w: 3.4, tail: 0.1, col: '#1a1020' },
  { len: 0.86, w: 2.4, tail: 0.12, col: '#1a1020' },
  { len: 0.92, w: 1.1, tail: 0.24, col: '#b8202a' },
];
function handPaint(c: Ctx, kind: number, s: number): void {
  const h = HAND[kind];
  const R = DIAL_R;
  const cx = s / 2;
  const cy = s / 2;
  c.fillStyle = h.col;
  c.strokeStyle = h.col;
  c.lineCap = 'round';
  c.lineWidth = h.w;
  c.beginPath();
  c.moveTo(cx, cy + R * h.tail);
  c.lineTo(cx, cy - R * h.len);
  c.stroke();
  if (kind < 2) {
    // a spade tip, pierced
    const ty = cy - R * h.len * (kind ? 0.72 : 0.62);
    c.beginPath();
    c.moveTo(cx, ty - h.w * 2.6);
    c.quadraticCurveTo(cx + h.w * 1.8, ty, cx, ty + h.w * 1.6);
    c.quadraticCurveTo(cx - h.w * 1.8, ty, cx, ty - h.w * 2.6);
    c.fill();
  }
  c.fillStyle = kind === 2 ? '#b8202a' : GOLD.body;
  c.beginPath();
  c.arc(cx, cy, kind === 2 ? 1.8 : 2.6, 0, P2);
  c.fill();
}
const HAND_S = Math.ceil(DIAL_R * 2.2);
/** The hands where the still shows them: ten to twelve, the seconds hand at the twelve (the stroke of his shift). */
const STILL_TIME = { h: 11.83, m: 50, s: 0 };
function handAngles(h: number, m: number, s: number): [number, number, number] {
  return [((h % 12) / 12) * P2, (m / 60) * P2, (s / 60) * P2];
}

function clockStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(PEND.w, PEND.h);
  pendFrame(g, 0.25);
  ctx.drawImage(c, CLK_X - PEND.w / 2, PIV[1]);
  trunkGlass(ctx, 0, 0);
  const angs = handAngles(STILL_TIME.h, STILL_TIME.m, STILL_TIME.s);
  for (let i = 0; i < 3; i++) {
    const [hc, hg] = makeCanvas(HAND_S, HAND_S);
    handPaint(hg, i, HAND_S);
    ctx.save();
    ctx.translate(DIAL[0], DIAL[1]);
    ctx.rotate(angs[i]);
    ctx.drawImage(hc, -HAND_S / 2, -HAND_S / 2);
    ctx.restore();
  }
}

// ——— his chair, its tall back to us, turned to the window ———

function chair(ctx: Ctx, r: R): void {
  const { X, z, hw, Y } = CHAIR;
  const k = pz(z);
  const [cx] = P(X, 0, z);
  const y = (YY: number) => sy(YY, z);
  const w = hw * k;
  const yTop = y(Y);
  const yBot = y(0.44);
  const yFloor = y(0);
  // its shadow on the marble, thrown down and right
  ctx.fillStyle = 'rgba(3,1,6,0.6)';
  ctx.beginPath();
  ctx.ellipse(cx + 16, yFloor + 2, w * 1.4, 9, 0, 0, P2);
  ctx.fill();
  // the swivel base: five gilt legs on castors, a column up to the seat
  const legs: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * P2 + 0.3;
    legs.push([Math.cos(a), Math.sin(a)]);
  }
  legs.sort((a, b) => b[1] - a[1]);
  const hub = P(X, 0.07, z);
  for (const [lx, lz] of legs) {
    const end = P(X + lx * 0.27, 0.035, z + lz * 0.27);
    ctx.lineCap = 'round';
    line(ctx, hub, end, '#3a2408', 7);
    line(ctx, hub, end, lz > 0 ? GOLD.shade : GOLD.body, 4.4);
    line(ctx, [hub[0], hub[1] - 1.5], [end[0], end[1] - 1.5], rgba(GOLD.lit, lz > 0 ? 0.2 : 0.6), 1.2);
    ctx.fillStyle = '#140a0a';
    ctx.beginPath();
    ctx.ellipse(end[0], end[1] + 3, 4.5, 3.5, 0, 0, P2);
    ctx.fill();
  }
  const [, colTop] = P(X, 0.4, z);
  ctx.fillStyle = lin(ctx, cx - 6, 0, cx + 6, 0, [[0, GOLD.lit], [0.4, GOLD.body], [1, GOLD.deep]]);
  ctx.fillRect(cx - 5, colTop, 10, hub[1] - colTop);
  // the seat's underside, dark
  ctx.fillStyle = '#100406';
  ctx.beginPath();
  ctx.ellipse(cx, y(0.42), w * 1.02, 0.05 * k, 0, 0, P2);
  ctx.fill();
  // the seat: its cushion's sides and back edge, under the back
  const seat: PathFn = (c) => {
    c.beginPath();
    c.moveTo(cx - w * 1.06, y(0.4));
    c.quadraticCurveTo(cx - w * 1.1, y(0.5), cx - w * 1.0, y(0.52));
    c.lineTo(cx + w * 1.0, y(0.52));
    c.quadraticCurveTo(cx + w * 1.1, y(0.5), cx + w * 1.06, y(0.4));
    c.quadraticCurveTo(cx, y(0.37), cx - w * 1.06, y(0.4));
    c.closePath();
  };
  solid(ctx, seat, { x: cx - w * 1.1, y: y(0.53), w: w * 2.2, h: y(0.37) - y(0.53) }, 'leather', shade(LEATHER, -0.25), { depth: 0.35, line: 1.8, ink: '#120406', formSize: 10 });
  // the arms: rolled leather, their scrolled ends showing either side of the back (they run on towards the window)
  for (const s of [-1, 1]) {
    const ax = cx + s * w * 1.02;
    const ay = y(0.7);
    const arm: PathFn = (c) => {
      c.beginPath();
      c.moveTo(ax - s * 0.045 * k, y(0.5));
      c.lineTo(ax - s * 0.06 * k, ay);
      c.arc(ax, ay, 0.06 * k, Math.PI, P2);
      c.lineTo(ax + s * 0.045 * k, y(0.5));
      c.closePath();
    };
    solid(ctx, arm, { x: ax - 0.07 * k, y: ay - 0.06 * k, w: 0.14 * k, h: y(0.5) - ay + 0.06 * k }, 'leather', shade(LEATHER, -0.15), { depth: 0.35, line: 1.8, ink: '#120406', formSize: 14 });
    // the scroll's spiral
    ctx.strokeStyle = 'rgba(10,2,4,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ax, ay, 0.03 * k, 0, P2 * 0.8);
    ctx.stroke();
  }
  // the back: tall, waisted, a rolled crest, deep-buttoned even on its back (he would)
  const back: PathFn = (c) => {
    c.beginPath();
    c.moveTo(cx - w * 0.94, yBot);
    c.quadraticCurveTo(cx - w * 0.8, y(0.78), cx - w * 0.92, y(1.02));
    c.quadraticCurveTo(cx - w * 1.04, y(Y - 0.06), cx - w * 0.82, yTop + 0.03 * k);
    c.quadraticCurveTo(cx, yTop - 0.05 * k, cx + w * 0.82, yTop + 0.03 * k);
    c.quadraticCurveTo(cx + w * 1.04, y(Y - 0.06), cx + w * 0.92, y(1.02));
    c.quadraticCurveTo(cx + w * 0.8, y(0.78), cx + w * 0.94, yBot);
    c.quadraticCurveTo(cx, yBot + 0.03 * k, cx - w * 0.94, yBot);
    c.closePath();
  };
  const bb = { x: cx - w * 1.05, y: yTop - 0.06 * k, w: w * 2.1, h: yBot - yTop + 0.1 * k };
  castShadow(ctx, back, 12, 18, 0.4, '#04020a');
  solid(ctx, back, bb, 'leather', LEATHER, { depth: 0.3, line: 2.4, ink: '#120406', form: 0.7 });
  within(ctx, back, () => {
    // the buttoning: a diamond grid, each diamond a little cushion (lit top left, shaded bottom right), creases
    // running from button to button
    const cols = 4;
    const dx = (w * 1.8) / cols;
    const dyU = 0.13;
    const btn: Pt[] = [];
    for (let j = 0; ; j++) {
      const YY = Y - 0.16 - j * dyU;
      if (YY < 0.5) break;
      for (let i = 0; i <= cols; i++) {
        const x = cx - w * 0.9 + i * dx + (j % 2 ? dx / 2 : 0);
        if (x > cx + w * 0.92) continue;
        btn.push([x, y(YY)]);
      }
    }
    const dyPx = y(Y - 0.16 - dyU) - y(Y - 0.16);
    for (const [bx, by] of btn) {
      // the cushion below each button
      const g = ctx.createRadialGradient(bx + dx * 0.32, by + dyPx * 0.35, 1, bx + dx * 0.5, by + dyPx * 0.5, dx * 0.6);
      g.addColorStop(0, 'rgba(255,170,150,0.16)');
      g.addColorStop(0.6, 'rgba(255,170,150,0.03)');
      g.addColorStop(1, 'rgba(10,2,4,0.18)');
      ctx.fillStyle = g;
      ctx.fillRect(bx, by, dx, dyPx);
    }
    ctx.strokeStyle = 'rgba(10,2,4,0.55)';
    ctx.lineWidth = 1.6;
    for (const [bx, by] of btn) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + (s * dx) / 2, by + dyPx);
        ctx.stroke();
      }
    }
    for (const [bx, by] of btn) {
      ctx.fillStyle = 'rgba(10,2,4,0.6)';
      ctx.beginPath();
      ctx.arc(bx + 0.8, by + 1, 2.8, 0, P2);
      ctx.fill();
      ctx.fillStyle = GOLD.body;
      ctx.beginPath();
      ctx.arc(bx, by, 1.9, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#fff4c8', 0.8);
      ctx.fillRect(bx - 1, by - 1.2, 1, 1);
    }
    // the crest roll: a cylinder of leather along the top, its own highlight
    ctx.fillStyle = lin(ctx, 0, yTop - 0.04 * k, 0, yTop + 0.12 * k, [[0, 'rgba(255,190,170,0.26)'], [0.4, 'rgba(255,190,170,0.04)'], [0.75, 'rgba(10,2,4,0.4)'], [1, 'rgba(10,2,4,0)']]);
    ctx.fillRect(bb.x, yTop - 0.06 * k, bb.w, 0.18 * k);
    // rounded across: lit on the left, falling off to the right
    ctx.fillStyle = lin(ctx, bb.x, 0, bb.x + bb.w, 0, [[0, 'rgba(10,2,4,0.3)'], [0.22, 'rgba(255,190,170,0.08)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(10,2,4,0.45)']]);
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    // the window behind it: violet over its crest
    ctx.fillStyle = lin(ctx, 0, yTop - 0.04 * k, 0, yTop + 0.06 * k, [[0, rgba('#c8a0ff', 0.4)], [1, rgba('#c8a0ff', 0)]]);
    ctx.fillRect(bb.x, yTop - 0.06 * k, bb.w, 0.12 * k);
    lay(ctx, noiseMask(10, 77, { cover: 0.3, soft: 0.2, col: '#ffd8c8', w: 60, h: 90 }), bb, 0.05);
  });
  rim(ctx, back, 0.5, 3.5, '#c8a0ff');
  // gold nailheads round its edge
  ctx.save();
  back(ctx);
  ctx.clip();
  ctx.setLineDash([0.1, 7]);
  ctx.lineCap = 'round';
  ctx.strokeStyle = GOLD.body;
  ctx.lineWidth = 3.4;
  ctx.translate(cx, (yTop + yBot) / 2);
  ctx.scale(0.93, 0.965);
  ctx.translate(-cx, -(yTop + yBot) / 2);
  back(ctx);
  ctx.stroke();
  ctx.restore();
  void r;
}

// ——— the water cooler, gilded, its jug of water on top ———

function cooler(ctx: Ctx, r: R): void {
  const { X, z } = COOL;
  const k = pz(z);
  const [cx] = P(X, 0, z);
  const y = (Y: number) => sy(Y, z);
  const hw = 0.115 * k;
  // its occlusion on the wall behind
  const cab: PathFn = (c) => {
    c.beginPath();
    c.rect(cx - hw, y(0.6), hw * 2, TY + 10 - y(0.6));
  };
  castShadow(ctx, cab, 10, 16, 0.5, '#04020a');
  // the cabinet: burr walnut in a brass frame, the drip tray, two gold taps
  solid(ctx, cab, { x: cx - hw, y: y(0.6), w: hw * 2, h: TY - y(0.6) }, 'wood', '#4a2a1a', { depth: 0.3, line: 2, ink: '#140806' });
  within(ctx, cab, () => {
    lay(ctx, noiseMask(7, 55, { cover: 0.45, soft: 0.3, col: '#8a5a2a', w: 40, h: 60 }), { x: cx - hw, y: y(0.6), w: hw * 2, h: TY - y(0.6) }, 0.35);
    ctx.fillStyle = lin(ctx, cx - hw, 0, cx + hw, 0, [[0, 'rgba(255,200,150,0.15)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
    ctx.fillRect(cx - hw, y(0.6), hw * 2, TY - y(0.6));
  });
  ctx.strokeStyle = goldFill(ctx, cx - hw, y(0.6), cx + hw, y(0.2), 0.7);
  ctx.lineWidth = 2.4;
  ctx.strokeRect(cx - hw + 4, y(0.56), hw * 2 - 8, y(0.08) - y(0.56));
  ctx.fillStyle = goldFill(ctx, 0, y(0.64), 0, y(0.6), 0.8);
  ctx.fillRect(cx - hw - 3, y(0.64), hw * 2 + 6, y(0.6) - y(0.64));
  {
    // one gold tap, a stack of paper cups beside it
    const tx = cx - hw * 0.25;
    ctx.fillStyle = goldFill(ctx, tx - 7, y(0.5), tx + 7, y(0.44), 1);
    ctx.beginPath();
    ctx.ellipse(tx, y(0.49), 7, 5, 0, 0, P2);
    ctx.fill();
    ctx.fillRect(tx - 2, y(0.47), 4, 9);
    const ux = cx + hw * 0.55;
    ctx.fillStyle = lin(ctx, ux - 6, 0, ux + 6, 0, [[0, '#f4f0e8'], [1, '#a8a098']]);
    ctx.beginPath();
    ctx.moveTo(ux - 6, y(0.56));
    ctx.lineTo(ux + 6, y(0.56));
    ctx.lineTo(ux + 4, y(0.42));
    ctx.lineTo(ux - 4, y(0.42));
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = goldFill(ctx, 0, y(0.38), 0, y(0.35), 0.6);
  ctx.fillRect(cx - hw * 0.8, y(0.38), hw * 1.6, y(0.35) - y(0.38));
  // the jug: inverted, its neck in the collar, tinted glass, the water in it (an air pocket at the top)
  const jw = 0.1 * k;
  const jt = y(1.06);
  const jb = y(0.64);
  const jug: PathFn = (c) => {
    c.beginPath();
    c.moveTo(cx - jw * 0.3, jb);
    c.lineTo(cx - jw * 0.3, jb - (jb - jt) * 0.1);
    c.bezierCurveTo(cx - jw, jb - (jb - jt) * 0.2, cx - jw, jb - (jb - jt) * 0.25, cx - jw, jb - (jb - jt) * 0.4);
    c.lineTo(cx - jw, jt + jw * 0.4);
    c.quadraticCurveTo(cx - jw, jt, cx, jt);
    c.quadraticCurveTo(cx + jw, jt, cx + jw, jt + jw * 0.4);
    c.lineTo(cx + jw, jb - (jb - jt) * 0.4);
    c.bezierCurveTo(cx + jw, jb - (jb - jt) * 0.25, cx + jw, jb - (jb - jt) * 0.2, cx + jw * 0.3, jb - (jb - jt) * 0.1);
    c.lineTo(cx + jw * 0.3, jb);
    c.closePath();
  };
  const wl = jt + (jb - jt) * 0.16;
  fillPath(ctx, jug, rgba('#3a3a6a', 0.55));
  within(ctx, jug, () => {
    // the water: blue-violet, the wall's sconce glowing through it, deeper at the edges
    ctx.fillStyle = lin(ctx, cx - jw, 0, cx + jw, 0, [[0, '#2a4a8a'], [0.45, '#6a8ad8'], [1, '#1a2a5a']]);
    ctx.globalAlpha = 0.75;
    ctx.fillRect(cx - jw, wl, jw * 2, jb - wl);
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba('#c8d8ff', 0.5);
    ctx.fillRect(cx - jw, wl, jw * 2, 1.5);
    // ribs moulded round the glass
    for (const t of [0.42, 0.58, 0.74]) line(ctx, [cx - jw, jt + (jb - jt) * t], [cx + jw, jt + (jb - jt) * t], 'rgba(200,220,255,0.18)', 1.4);
    ctx.fillStyle = lin(ctx, cx - jw, 0, cx + jw, 0, [[0.12, 'rgba(255,255,255,0)'], [0.22, 'rgba(255,255,255,0.45)'], [0.3, 'rgba(255,255,255,0)'], [0.78, 'rgba(255,255,255,0)'], [0.86, 'rgba(255,255,255,0.15)'], [0.92, 'rgba(255,255,255,0)']]);
    ctx.fillRect(cx - jw, jt, jw * 2, jb - jt);
  });
  strokePath(ctx, jug, rgba('#0a0a20', 0.8), 1.6);
  rim(ctx, jug, 0.3, 2, '#e0d0ff');
  void r;
}
const JUG = { x: sx(COOL.X, COOL.z), top: sy(1.06, COOL.z) + 0.16 * (sy(0.64, COOL.z) - sy(1.06, COOL.z)), bot: sy(0.68, COOL.z), w: 0.1 * pz(COOL.z) };

// ——— the safe, open against the right wall, overflowing with golden crusts ———

/** Where the crusts heap (the live glints run over these). */
const CRUSTS: Pt[] = (() => {
  const out: Pt[] = [];
  for (let i = 0; i < 16; i++) {
    const t = 0.1 + hash(i, 41) * 0.8;
    const shelf = i % 2 ? 0.48 : 0.05;
    const X = SAFE.X0 + 0.09 + t * (SAFE.X1 - SAFE.X0 - 0.18);
    out.push(P(X, shelf + 0.04 + hash(i, 43) * 0.18 * Math.sin(t * Math.PI) ** 0.6, SAFE.z0 + 0.06 + hash(i, 47) * 0.2));
  }
  return out;
})();

/** A golden crust: an arc of crust (the rim of a slice), cast in gold, lit from the top left. */
function crust(ctx: Ctx, x: number, y: number, s: number, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const p: PathFn = (c) => {
    c.beginPath();
    c.ellipse(0, 0, 14 * s, 9 * s, 0, Math.PI * 1.05, Math.PI * 1.95);
    c.ellipse(0, 1 * s, 10 * s, 5 * s, 0, Math.PI * 1.9, Math.PI * 1.1, true);
    c.closePath();
  };
  fillPath(ctx, p, lin(ctx, -12 * s, -9 * s, 10 * s, 2 * s, [[0, GOLD.lit], [0.35, '#f0c050'], [0.75, GOLD.shade], [1, GOLD.deep]]));
  ctx.strokeStyle = rgba(GOLD.deep, 0.8);
  ctx.lineWidth = 1;
  p(ctx);
  ctx.stroke();
  // the crust's bubbles
  ctx.fillStyle = rgba('#fff4c0', 0.6);
  ctx.beginPath();
  ctx.arc(-5 * s, -6.5 * s, 1.4 * s, 0, P2);
  ctx.arc(3 * s, -7.5 * s, 1 * s, 0, P2);
  ctx.fill();
  ctx.restore();
}

function safe(ctx: Ctx, r: R): void {
  const { X0, X1, z0, z1, Y } = SAFE;
  const k = pz(z0);
  const wall = 0.05;
  // its shadow on the right wall and the occlusion at its foot
  const body = polyPath([P(X0, 0, z0), P(X0, Y, z0), P(X0, Y, z1), P(X1, Y, z1), P(X1, Y, z0), P(X1, 0, z0)]);
  castShadow(ctx, body, 16, 22, 0.55, '#04020a');
  // the top (lit), the left side (facing the key a little)
  const top = topAt(X0, X1, z0, z1, Y);
  fillPath(ctx, top, lin(ctx, ...P(X0, Y, z1), ...P(X1, Y, z0), [[0, '#4a5a58'], [1, '#2a3434']]));
  const left = sideAt(X0, z0, z1, 0, Y);
  fillPath(ctx, left, lin(ctx, ...P(X0, Y, z1), ...P(X0, 0, z0), [[0, '#34403e'], [1, '#141c1c']]));
  within(ctx, left, () => {
    // a gold pinstripe panel on its side
    strokePath(ctx, quad(P(X0, 0.1, z0 + 0.06), P(X0, 0.1, z1 - 0.06), P(X0, Y - 0.1, z1 - 0.06), P(X0, Y - 0.1, z0 + 0.06)), rgba(GOLD.body, 0.55), 1.4);
  });
  // the front: the steel walls round the opening, the interior dark and gold
  const opening = faceAt(X0 + wall, X1 - wall, wall, Y - wall, z0);
  const frontRing: PathFn = (c) => {
    faceAt(X0, X1, 0, Y, z0)(c);
    const o = [P(X0 + wall, wall, z0), P(X1 - wall, wall, z0), P(X1 - wall, Y - wall, z0), P(X0 + wall, Y - wall, z0)];
    c.moveTo(o[0][0], o[0][1]);
    for (const p of o.slice(1)) c.lineTo(p[0], p[1]);
    c.closePath();
  };
  ctx.save();
  frontRing(ctx);
  ctx.fillStyle = lin(ctx, ...P(X0, Y, z0), ...P(X1, 0, z0), [[0, '#3a4846'], [1, '#141c1c']]);
  ctx.fill('evenodd');
  ctx.restore();
  // the interior: its back and walls, shelves, the gold glow
  fillPath(ctx, opening, '#0a0806');
  within(ctx, opening, () => {
    const ib = faceAt(X0 + wall, X1 - wall, wall, Y - wall, z1 - wall);
    fillPath(ctx, ib, '#2a1a0a');
    // the inside walls (the right one lit by the gold, the top in shade)
    fillPath(ctx, quad(P(X1 - wall, wall, z0), P(X1 - wall, wall, z1 - wall), P(X1 - wall, Y - wall, z1 - wall), P(X1 - wall, Y - wall, z0)), '#3a2610');
    fillPath(ctx, quad(P(X0 + wall, Y - wall, z0), P(X1 - wall, Y - wall, z0), P(X1 - wall, Y - wall, z1 - wall), P(X0 + wall, Y - wall, z1 - wall)), '#0a0604');
    // the shelf across the middle
    const sY = 0.48;
    fillPath(ctx, topAt(X0 + wall, X1 - wall, z0, z1 - wall, sY), '#4a3418');
    fillPath(ctx, faceAt(X0 + wall, X1 - wall, sY - 0.025, sY, z0), '#1a1008');
    // the crusts: heaped on the shelf and the floor of the safe, spilling over the front
    const heap = (Y0: number, n: number, rise: number) => {
      for (let i = 0; i < n; i++) {
        const t = r();
        const Xc = X0 + wall + 0.04 + t * (X1 - X0 - wall * 2 - 0.08);
        const zc = z0 + 0.04 + r() * 0.25;
        const hY = Y0 + 0.02 + r() * rise * Math.sin(t * Math.PI) ** 0.6;
        const [cx2, cy2] = P(Xc, hY, zc);
        crust(ctx, cx2, cy2, (1.0 + r() * 0.5) * k / 330, (r() - 0.5) * 1.6);
      }
    };
    heap(sY, 30, 0.2);
    heap(wall, 34, 0.26);
    // the opening's own shadow round its edges and over the top: only the crusts' tips catch the light
    const [ox0, oy0] = P(X0 + wall, Y - wall, z0);
    const [ox1, oy1] = P(X1 - wall, wall, z0);
    ctx.save();
    ctx.shadowColor = 'rgba(4,2,2,0.85)';
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.rect(ox0 - 200, oy0 - 200, ox1 - ox0 + 400, oy1 - oy0 + 400);
    ctx.rect(ox1, oy0, ox0 - ox1, oy1 - oy0);
    ctx.fillStyle = '#000';
    ctx.fill('evenodd');
    ctx.restore();
    vfill(ctx, ox0, oy0, ox1 - ox0, 50, [[0, 'rgba(4,2,2,0.7)'], [1, 'rgba(4,2,2,0)']]);
    // the gold's own glow inside
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const [gx, gy] = P((X0 + X1) / 2, 0.45, z0 + 0.15);
    glowAt(ctx, gx, gy, 0.5 * k, '#ffb040', 0.16);
    ctx.restore();
  });
  // crusts spilling out over the sill and down the front (the desk hides where they land)
  for (let i = 0; i < 9; i++) {
    const Xc = X0 + 0.1 + r() * (X1 - X0 - 0.2);
    const [cx2, cy2] = P(Xc, 0.06 - r() * 0.04, z0 - 0.02 - r() * 0.12);
    crust(ctx, cx2, cy2, (0.8 + r() * 0.4) * k / 330, (r() - 0.5) * 2.4);
  }
  strokePath(ctx, faceAt(X0, X1, 0, Y, z0), '#0a1010', 2);
  strokePath(ctx, top, '#0a1010', 1.6);
  // its pinstripe round the front, the brass corner plates
  strokePath(ctx, faceAt(X0 + 0.02, X1 - 0.02, 0.02, Y - 0.02, z0), rgba(GOLD.body, 0.6), 1.2);
  // the door: swung open towards us on its left hinge, its inside face (the bolt-work) showing
  const dZ0 = z0;
  const door = quad(P(X0, 0, dZ0), P(DOOR.X, 0, DOOR.z), P(DOOR.X, Y, DOOR.z), P(X0, Y, dZ0));
  const dthick = 0.08;
  // the door's free edge (its thickness), and its top
  fillPath(ctx, quad(P(DOOR.X, 0, DOOR.z), P(DOOR.X + dthick, 0, DOOR.z + 0.01), P(DOOR.X + dthick, Y, DOOR.z + 0.01), P(DOOR.X, Y, DOOR.z)), '#2a3634');
  fillPath(ctx, quad(P(X0, Y, dZ0), P(DOOR.X, Y, DOOR.z), P(DOOR.X + dthick, Y, DOOR.z + 0.01), P(X0 + dthick, Y, dZ0)), '#4a5654');
  castShadow(ctx, door, 8, 12, 0.4, '#04020a');
  fillPath(ctx, door, lin(ctx, ...P(DOOR.X, Y, DOOR.z), ...P(X0, 0, dZ0), [[0, '#3a4644'], [0.5, '#26302e'], [1, '#121818']]));
  within(ctx, door, () => {
    // the bolt-work: a polished steel plate, a brass wheel at its middle, bars out to the bolts
    const bp = quad(P(X0 + 0.01, 0.12, dZ0 - 0.06), P(DOOR.X + 0.01, 0.12, DOOR.z + 0.08), P(DOOR.X + 0.01, Y - 0.12, DOOR.z + 0.08), P(X0 + 0.01, Y - 0.12, dZ0 - 0.06));
    fillPath(ctx, bp, lin(ctx, ...P(X0, Y, dZ0), ...P(DOOR.X, 0, DOOR.z), [[0, '#8a9a98'], [0.5, '#5a6a68'], [1, '#3a4644']]));
    strokePath(ctx, bp, rgba('#0a1010', 0.8), 1.2);
    const [wx, wy] = P((X0 + DOOR.X) / 2, Y / 2, (dZ0 + DOOR.z) / 2);
    const wr = 0.08 * k;
    ctx.fillStyle = goldFill(ctx, wx - wr, wy - wr, wx + wr, wy + wr, 1);
    ctx.beginPath();
    ctx.ellipse(wx, wy, wr * 0.55, wr, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = GOLD.deep;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * P2;
      line(ctx, [wx, wy], [wx + Math.cos(a) * wr * 0.5, wy + Math.sin(a) * wr * 0.95], rgba(GOLD.deep, 0.8), 1.4);
    }
    for (const Yb of [0.22, 0.45, 0.68]) {
      const [ex, ey] = P(DOOR.X + 0.02, Yb, DOOR.z + 0.06);
      line(ctx, [wx + (ex - wx) * 0.55, wy + (ey - wy) * 0.55], [ex, ey], rgba('#a8b4b4', 0.7), 4);
    }
  });
  strokePath(ctx, door, '#0a1010', 2);
  // the bolts standing out of the door's free edge
  for (const Yb of [0.22, 0.45, 0.68]) {
    const [bx, by] = P(DOOR.X + 0.04, Yb, DOOR.z - 0.02);
    ctx.fillStyle = lin(ctx, bx, by - 6, bx, by + 6, [[0, '#e8f0f0'], [0.5, '#8a9898'], [1, '#2a3434']]);
    ctx.fillRect(bx - 10, by - 5, 14, 10);
    ctx.fillStyle = '#c8d0d0';
    ctx.beginPath();
    ctx.ellipse(bx - 10, by, 3, 5, 0, 0, P2);
    ctx.fill();
  }
  // the key's light catching its top edge, the hinge's brass
  line(ctx, P(X0, Y, z0), P(X1, Y, z0), rgba('#e0f0f0', 0.4), 1.2);
  for (const Yh of [0.15, 0.75]) {
    const [hx, hy] = P(X0, Yh, z0);
    ctx.fillStyle = goldFill(ctx, hx - 5, hy - 10, hx + 5, hy + 10, 1);
    ctx.fillRect(hx - 4, hy - 9, 8, 18);
  }
}

// ——— the desk: green leather inlaid in rosewood, tooled in gold ———

const FRONT = FIN.front;

function table(ctx: Ctx, r: R): void {
  const f = FRONT;
  const zf = zFront(f);
  const ZB = (FOC) / (TY - HY);
  const zBack = ZB - 0.07;
  const zFr = zf + 0.1;
  const yL0 = yAt(zBack);
  const yL1 = yAt(zFr);
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  // the rosewood bands at the back and front: grain running across, the varnish catching the window and the lamp
  for (const [y0, y1] of [[TY, yL0], [yL1, f + 4]]) {
    const b = { x: 0, y: y0, w: W, h: y1 - y0 };
    vfill(ctx, 0, y0, W, y1 - y0, [[0, shade(ROSE, 0.15)], [1, shade(ROSE, -0.25)]]);
    woodGrain(ctx, r, b, ROSE, false, 0.8);
    varnish(ctx, b, [{ x: VX, a: 0.14, col: '#c8a0ff', w: 300 }, { x: LAMP_X, a: 0.25, col: '#ffd890', w: 120 }], { sheen: 0.05, vertical: false });
  }
  // the leather: deep green, its drift and its pebbled grain, worn paler where his arms rest (towards us, middle)
  const lb = { x: 0, y: yL0, w: W, h: yL1 - yL0 };
  surface(ctx, r, lb, DESK, { vary: 0.4, warm: '#2e4a32', cool: '#0e1e1a', cells: 5, mottle: 0.3, strokes: 0.06, strokeAng: 0, strokeLen: 260, strokeW: 8, grain: 0.14, grainKind: 'leather', grainScale: 1.1, seed: 33 });
  softly(ctx, lb, (c) => {
    c.save();
    c.translate(VX, yL1 - 40);
    c.scale(3.2, 1);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 160);
    g.addColorStop(0, rgba('#5a7a5a', 0.18));
    g.addColorStop(1, rgba('#5a7a5a', 0));
    c.fillStyle = g;
    c.fillRect(-170, -170, 340, 340);
    c.restore();
  });
  lay(ctx, noiseMask(12, 141, { kind: 'web', cover: 0.14, soft: 0.05, col: '#0a1a12', w: 240, h: 40 }), lb, 0.35);
  ctx.fillStyle = lin(ctx, 0, yL0, W * 0.7, yL1 + 200, [[0, rgba('#ffd8a0', 0.06)], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(2,6,4,0.35)']]);
  ctx.fillRect(lb.x, lb.y, lb.w, lb.h);
  // its gold tooling: a double fillet round the inlay, a running vine between them at the back
  const tool = (z: number, a: number, wdt: number) => {
    const y = yAt(z);
    ctx.fillStyle = rgba(GOLD.body, a);
    ctx.fillRect(0, y - wdt / 2, W, wdt);
    ctx.fillStyle = rgba(GOLD.lit, a * 0.6);
    ctx.fillRect(0, y - wdt / 2, W, Math.max(0.6, wdt * 0.35));
  };
  tool(zBack - 0.03, 0.42, 1.4);
  tool(zBack - 0.075, 0.36, 1.2);
  tool(zFr + 0.05, 0.4, 2.2);
  tool(zFr + 0.12, 0.34, 1.8);
  // the vine: little leaves pressed in gold between the back fillets, on the spacing
  const yv = (yAt(zBack - 0.03) + yAt(zBack - 0.075)) / 2;
  const kv = FOC / (zBack - 0.05);
  for (let X = -4; X < 4; X += U / 4) {
    const x = VX + X * kv;
    if (x < -10 || x > W + 10) continue;
    ctx.strokeStyle = rgba(GOLD.body, 0.32);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, yv);
    ctx.quadraticCurveTo(x + (U / 8) * kv, yv - 2.4, x + (U / 4) * kv, yv);
    ctx.stroke();
    ctx.fillStyle = rgba(GOLD.body, 0.3);
    ctx.beginPath();
    ctx.ellipse(x + (U / 8) * kv, yv - 1.2, 3, 1, 0.3, 0, P2);
    ctx.fill();
  }
  // the front's vine, bigger
  const yv2 = (yAt(zFr + 0.05) + yAt(zFr + 0.12)) / 2;
  const kv2 = FOC / (zFr + 0.085);
  for (let X = -3; X < 3; X += U / 4) {
    const x = VX + X * kv2;
    if (x < -20 || x > W + 20) continue;
    ctx.strokeStyle = rgba(GOLD.body, 0.28);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, yv2);
    ctx.bezierCurveTo(x + (U / 12) * kv2, yv2 - 5, x + (U / 6) * kv2, yv2 + 5, x + (U / 4) * kv2, yv2);
    ctx.stroke();
    ctx.fillStyle = rgba(GOLD.body, 0.26);
    ctx.beginPath();
    ctx.ellipse(x + (U / 8) * kv2, yv2 - 3, 5, 1.8, 0.4, 0, P2);
    ctx.ellipse(x + (U / 8) * kv2 + 6, yv2 + 3, 5, 1.8, -0.4, 0, P2);
    ctx.fill();
  }
  // the window's violet mirrored dully in the leather at the back, the lamp's pool on the right
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  softly(ctx, { x: 400, y: TY, w: 1120, h: 200 }, (c) => {
    c.save();
    c.translate(VX, TY);
    c.scale(1, 0.3);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 520);
    g.addColorStop(0, rgba('#b890ff', 0.16));
    g.addColorStop(1, rgba('#b890ff', 0));
    c.fillStyle = g;
    c.fillRect(-560, -560, 1120, 1120);
    c.restore();
  });
  ctx.restore();
  // the key's warmth on the left, the cool on the right
  ctx.fillStyle = lin(ctx, 0, 0, W, 0, [[0, rgba('#ffb070', 0.05)], [0.5, 'rgba(0,0,0,0)'], [1, rgba('#3a3ab0', 0.05)]]);
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
  tableFalloff(ctx, f, 0.38, '#04020a');
  // the back edge: the desk's arris against the room beyond, its shadow on the floor
  crevice(ctx, 0, W, TY, 10, 0.4, '#04020a');
  ctx.fillStyle = rgba('#ffe0c0', 0.14);
  ctx.fillRect(0, TY, W, 1.4);
  // the front: a gilt bead, then the desk's carved rosewood front
  vfill(ctx, 0, f, W, 8, [[0, '#fff0b8'], [0.35, '#c8943a'], [1, '#4a2e12']]);
  vfill(ctx, 0, f + 8, W, H - f - 8, [[0, '#2a1210'], [1, '#100606']]);
  vfill(ctx, 0, f + 8, W, 6, [[0, rgba('#ffd8b0', 0.22)], [1, rgba('#ffd8b0', 0)]]);
  vfill(ctx, 0, f + 22, W, 3, [[0, 'rgba(0,0,0,0.5)'], [1, rgba('#ffc890', 0.12)]]);
  ctx.fillStyle = lin(ctx, 0, 0, W, 0, [[0, rgba('#ffd8a0', 0.12)], [0.5, rgba('#ffd8a0', 0.02)], [1, 'rgba(0,0,0,0.2)']]);
  ctx.fillRect(0, f, W, H - f);
}

// ——— on the desk ———

const LAMP_X = sx(LAMP.X, LAMP.z);

/** The lamp's light on the desk (stays in the base: light that adds), the globe's and the pile's shadows. */
function deskLight(ctx: Ctx): void {
  const [lx, ly] = D(LAMP.X, 0, LAMP.z - 0.05);
  lightPool(ctx, lx - 10, ly + 8, 230, 48, '#f0d890', 0.3);
  lightPool(ctx, lx - 6, ly + 3, 110, 22, '#fff0b8', 0.3);
  // the lamp's glow round its shade (the wall and the safe behind take a little)
  glowAt(ctx, lx, ly - 0.32 * pz(LAMP.z), 150, '#ffb050', 0.06, 0.8);
}

function globeStand(ctx: Ctx): void {
  const [gx, gy] = D(GLOBE.X, 0, GLOBE.z);
  const k = pz(GLOBE.z);
  const cy = GLOBE_C[1];
  // its shadow on the desk, thrown down and right
  ctx.fillStyle = 'rgba(4,8,4,0.5)';
  ctx.beginPath();
  ctx.ellipse(gx + 26, gy + 6, 0.14 * k, 0.03 * k, 0, 0, P2);
  ctx.fill();
  // the base: a turned rosewood foot, gilt rings
  const foot: PathFn = (c) => {
    c.beginPath();
    c.ellipse(gx, gy - 4, 0.085 * k, 0.022 * k, 0, 0, Math.PI);
    c.lineTo(gx - 0.085 * k, gy - 12);
    c.ellipse(gx, gy - 12, 0.085 * k, 0.022 * k, 0, Math.PI, P2);
    c.closePath();
  };
  solid(ctx, foot, { x: gx - 0.09 * k, y: gy - 24, w: 0.18 * k, h: 24 }, 'wood', ROSE, { depth: 0.05, line: 1.6, ink: '#0a0406' });
  ctx.fillStyle = goldFill(ctx, gx - 20, gy - 16, gx + 20, gy - 10, 1);
  ctx.beginPath();
  ctx.ellipse(gx, gy - 12, 0.085 * k, 0.022 * k, 0, 0, P2);
  ctx.fill();
  // the stem up to the globe, brass
  ctx.fillStyle = lin(ctx, gx - 4, 0, gx + 4, 0, [[0, GOLD.lit], [0.5, GOLD.body], [1, GOLD.deep]]);
  ctx.fillRect(gx - 3.5, cy + GLOBE_R * 0.8, 7, gy - 12 - (cy + GLOBE_R * 0.8));
  ctx.fillStyle = goldFill(ctx, gx - 8, cy + GLOBE_R, gx + 8, cy + GLOBE_R + 10, 1);
  ctx.beginPath();
  ctx.ellipse(gx, cy + GLOBE_R + 6, 9, 5, 0, 0, P2);
  ctx.fill();
}

/** One frame of the pizza globe turning (phase 0…1 is a full turn): a sphere whose map is a pizza (molten-cheese
 * continents on a tomato sea, pepperoni islands, basil, the crust round its equator), lit from the top left, its
 * axis tilted, the brass meridian ring round it. Painted in a GS×GS frame, centred. */
const GS = Math.ceil(GLOBE_R * 2 + 30);
const TILT = 0.36;
type Feat = { lon: number; lat: number; r: number; kind: 0 | 1 | 2 };
const FEATS: Feat[] = (() => {
  const rr = rng(808);
  const out: Feat[] = [];
  for (let i = 0; i < 8; i++) out.push({ lon: (i / 8) * P2 + rr() * 0.5, lat: (rr() - 0.5) * 1.8, r: 0.42 + rr() * 0.3, kind: 0 });
  for (let i = 0; i < 12; i++) out.push({ lon: rr() * P2, lat: (rr() - 0.5) * 2.4, r: 0.12 + rr() * 0.05, kind: 1 });
  for (let i = 0; i < 6; i++) out.push({ lon: rr() * P2, lat: (rr() - 0.5) * 2, r: 0.09, kind: 2 });
  return out;
})();
function globeFrame(c: Ctx, phase: number, withRing = true): void {
  const s = GS;
  const cx = s / 2;
  const cy = s / 2;
  const R = GLOBE_R;
  const rot = phase * P2;
  const ball: PathFn = (q) => {
    q.beginPath();
    q.arc(cx, cy, R, 0, P2);
  };
  // the tomato sea
  fillPath(c, ball, '#8a3424');
  within(c, ball, () => {
    // a point on the sphere (lon, lat) seen with the axis tilted towards the right: x, y and its facing (z)
    const proj = (lon: number, lat: number): [number, number, number] => {
      const x0 = Math.cos(lat) * Math.sin(lon + rot);
      const y0 = Math.sin(lat);
      const z0 = Math.cos(lat) * Math.cos(lon + rot);
      const x = x0 * Math.cos(TILT) - y0 * Math.sin(TILT);
      const y = x0 * Math.sin(TILT) + y0 * Math.cos(TILT);
      return [cx + x * R, cy - y * R, z0];
    };
    // the crust along the equator: a band of baked dough
    c.lineCap = 'round';
    c.strokeStyle = '#d8984a';
    c.lineWidth = R * 0.2;
    c.beginPath();
    let pen = false;
    for (let a = 0; a <= P2 + 0.01; a += 0.08) {
      const [x, y, z] = proj(a, 0);
      if (z > 0) {
        if (pen) c.lineTo(x, y);
        else c.moveTo(x, y);
        pen = true;
      } else pen = false;
    }
    c.stroke();
    for (const f of FEATS) {
      const [x, y, z] = proj(f.lon, f.lat);
      if (z < -0.1) continue;
      // foreshortened towards the limb
      const k = Math.max(0.05, z);
      c.save();
      c.translate(x, y);
      c.rotate(TILT);
      c.scale(k, 1);
      if (f.kind === 0) {
        // molten cheese: a blobby continent
        c.fillStyle = '#e8c060';
        c.beginPath();
        for (let i = 0; i <= 10; i++) {
          const a = (i / 10) * P2;
          const rr2 = f.r * R * (0.7 + 0.3 * Math.sin(a * 3 + f.lon * 5));
          if (i) c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
          else c.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
        }
        c.fill();
        c.fillStyle = rgba('#fff4c0', 0.5);
        c.beginPath();
        c.arc(-f.r * R * 0.2, -f.r * R * 0.2, f.r * R * 0.3, 0, P2);
        c.fill();
      } else if (f.kind === 1) {
        c.fillStyle = '#a82020';
        c.beginPath();
        c.arc(0, 0, f.r * R, 0, P2);
        c.fill();
        c.fillStyle = rgba('#5a0a0a', 0.6);
        c.beginPath();
        c.arc(f.r * R * 0.3, f.r * R * 0.2, f.r * R * 0.2, 0, P2);
        c.fill();
      } else {
        c.fillStyle = '#3a8a3a';
        c.beginPath();
        c.ellipse(0, 0, f.r * R * 1.4, f.r * R * 0.7, 0.6, 0, P2);
        c.fill();
      }
      c.restore();
    }
    // the sphere's light: the key from the top left, the terminator, a cool bounce on the far limb
    const g = c.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx, cy, R * 1.05);
    g.addColorStop(0, 'rgba(255,240,210,0.3)');
    g.addColorStop(0.45, 'rgba(255,240,210,0)');
    g.addColorStop(0.8, 'rgba(20,6,10,0.35)');
    g.addColorStop(1, 'rgba(10,2,6,0.7)');
    c.fillStyle = g;
    c.fillRect(cx - R, cy - R, R * 2, R * 2);
    c.fillStyle = rgba('#b890ff', 0.18);
    c.beginPath();
    c.arc(cx + R * 0.08, cy + R * 0.08, R, -0.6, 1.6);
    c.arc(cx, cy, R, 1.6, -0.6, true);
    c.fill();
    // a varnish glint
    c.fillStyle = rgba('#ffffff', 0.55);
    c.beginPath();
    c.ellipse(cx - R * 0.42, cy - R * 0.48, R * 0.16, R * 0.08, -0.7, 0, P2);
    c.fill();
  });
  c.strokeStyle = '#2a0a08';
  c.lineWidth = 1.6;
  ball(c);
  c.stroke();
  if (withRing) {
    // the meridian ring: brass, round the globe along its tilted axis
    c.save();
    c.translate(cx, cy);
    c.rotate(TILT);
    c.strokeStyle = GOLD.deep;
    c.lineWidth = 5;
    c.beginPath();
    c.ellipse(0, 0, R * 0.22, R + 6, 0, -Math.PI / 2, Math.PI / 2);
    c.stroke();
    c.strokeStyle = GOLD.body;
    c.lineWidth = 3;
    c.stroke();
    c.strokeStyle = rgba(GOLD.lit, 0.8);
    c.lineWidth = 1;
    c.stroke();
    // the axis's pins
    for (const s2 of [-1, 1]) {
      c.fillStyle = GOLD.lit;
      c.beginPath();
      c.arc(0, s2 * (R + 4), 2.6, 0, P2);
      c.fill();
    }
    c.restore();
  }
}
function globeStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(GS, GS);
  globeFrame(g, 0);
  ctx.drawImage(c, GLOBE_C[0] - GS / 2, GLOBE_C[1] - GS / 2);
}

/** The pile of contracts on the left of the desk: sheets stacked a little askew, a gold clip, a red seal. */
function pile(ctx: Ctx, r: R): void {
  const z = PILE.z;
  const k = pz(z);
  const [px, py] = D(PILE.X, 0, z);
  ctx.fillStyle = 'rgba(4,8,4,0.5)';
  ctx.beginPath();
  ctx.ellipse(px + 14, py + 4, 0.12 * k, 0.025 * k, 0, 0, P2);
  ctx.fill();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const y = py - i * 2.2;
    const a = (r() - 0.5) * 0.12;
    const dx = (r() - 0.5) * 6;
    ctx.save();
    ctx.translate(px + dx, y);
    ctx.rotate(a);
    const sh: PathFn = (c) => {
      c.beginPath();
      c.moveTo(-0.1 * k, 0);
      c.lineTo(0.1 * k, 0);
      c.lineTo(0.085 * k, -0.026 * k);
      c.lineTo(-0.085 * k, -0.026 * k);
      c.closePath();
    };
    fillPath(ctx, sh, i % 3 === 0 ? '#e8dcc0' : '#f4ecd8');
    ctx.fillStyle = 'rgba(80,60,40,0.4)';
    ctx.fillRect(-0.1 * k, -1, 0.2 * k, 1.2);
    if (i === n - 1) {
      // the top sheet's lines and its seal
      for (let l = 0; l < 4; l++) line(ctx, [-0.06 * k, -0.02 * k + l * 2.4], [0.05 * k, -0.02 * k + l * 2.4], 'rgba(60,40,30,0.35)', 0.8);
      ctx.fillStyle = '#b8202a';
      ctx.beginPath();
      ctx.ellipse(0.05 * k, -0.008 * k, 5, 2.2, 0, 0, P2);
      ctx.fill();
    }
    ctx.restore();
  }
  // the gold clip
  ctx.fillStyle = goldFill(ctx, px - 20, py - n * 2.2 - 8, px - 8, py - n * 2.2, 1);
  ctx.fillRect(px - 0.07 * k, py - n * 2.2 - 6, 12, 7);
  // the key's light on its top
  ctx.fillStyle = rgba('#fff4d8', 0.25);
  ctx.fillRect(px - 0.1 * k, py - n * 2.2 - 1, 0.2 * k, 1.4);
}

/** The banker's lamp (a sprite: it jumps at a stomp): a brass foot and stem, a cased green glass shade. */
const LAMP_BOX: Box = (() => {
  const [lx, ly] = D(LAMP.X, 0, LAMP.z);
  const k = pz(LAMP.z);
  return { x: Math.floor(lx - 0.18 * k), y: Math.floor(ly - 0.4 * k), w: Math.ceil(0.36 * k), h: Math.ceil(0.4 * k + 14) };
})();
const LAMP_SHADE = (() => {
  const [lx, ly] = D(LAMP.X, 0, LAMP.z);
  const k = pz(LAMP.z);
  return { x: lx, y: ly - 0.3 * k, w: 0.15 * k, h: 0.06 * k };
})();
function lamp(ctx: Ctx): void {
  const [lx, ly] = D(LAMP.X, 0, LAMP.z);
  const k = pz(LAMP.z);
  // its shadow on the desk
  ctx.fillStyle = 'rgba(4,8,4,0.45)';
  ctx.beginPath();
  ctx.ellipse(lx + 16, ly + 4, 0.1 * k, 0.02 * k, 0, 0, P2);
  ctx.fill();
  // the foot: an oval of brass
  const foot: PathFn = (c) => {
    c.beginPath();
    c.ellipse(lx, ly - 4, 0.085 * k, 0.02 * k, 0, 0, Math.PI);
    c.lineTo(lx - 0.085 * k, ly - 12);
    c.ellipse(lx, ly - 12, 0.085 * k, 0.02 * k, 0, Math.PI, P2);
    c.closePath();
  };
  fillPath(ctx, foot, goldFill(ctx, lx - 0.09 * k, ly - 22, lx + 0.09 * k, ly, 0.8));
  strokePath(ctx, foot, rgba(GOLD.deep, 0.9), 1.4);
  // the stem and the shade's harp
  const sh = LAMP_SHADE;
  ctx.fillStyle = lin(ctx, lx - 4, 0, lx + 4, 0, [[0, GOLD.lit], [0.5, GOLD.body], [1, GOLD.deep]]);
  ctx.fillRect(lx - 3.5, sh.y + sh.h * 0.5, 7, ly - 12 - (sh.y + sh.h * 0.5));
  ctx.strokeStyle = GOLD.body;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(lx - sh.w * 0.7, sh.y + sh.h);
  ctx.quadraticCurveTo(lx, sh.y + sh.h + 24, lx + sh.w * 0.7, sh.y + sh.h);
  ctx.stroke();
  // the shade: cased glass, green outside, white inside (its lip lit from below by the bulb)
  const shadeP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(sh.x - sh.w, sh.y + sh.h);
    c.bezierCurveTo(sh.x - sh.w, sh.y - sh.h * 0.4, sh.x + sh.w, sh.y - sh.h * 0.4, sh.x + sh.w, sh.y + sh.h);
    c.closePath();
  };
  fillPath(ctx, shadeP, lin(ctx, sh.x - sh.w, sh.y, sh.x + sh.w, sh.y + sh.h, [[0, '#5ac87a'], [0.3, '#1e8a48'], [0.7, '#0e4a28'], [1, '#062814']]));
  within(ctx, shadeP, () => {
    ctx.fillStyle = rgba('#ffffff', 0.5);
    ctx.beginPath();
    ctx.ellipse(sh.x - sh.w * 0.45, sh.y + sh.h * 0.1, sh.w * 0.3, sh.h * 0.18, -0.25, 0, P2);
    ctx.fill();
    for (let i = 1; i < 6; i++) line(ctx, [sh.x - sh.w + (i / 6) * sh.w * 2, sh.y], [sh.x - sh.w * 1.1 + (i / 6) * sh.w * 2.2, sh.y + sh.h], 'rgba(0,30,10,0.25)', 1);
  });
  strokePath(ctx, shadeP, '#04140a', 1.6);
  // its lip: the bulb's light on the white inside of the glass
  ctx.fillStyle = lin(ctx, 0, sh.y + sh.h - 3, 0, sh.y + sh.h + 3, [[0, '#fff8e0'], [1, '#ffc870']]);
  ctx.beginPath();
  ctx.ellipse(sh.x, sh.y + sh.h, sh.w, 3.2, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = goldFill(ctx, sh.x - 6, sh.y - sh.h * 0.4, sh.x + 6, sh.y, 1);
  ctx.beginPath();
  ctx.arc(sh.x, sh.y - sh.h * 0.05, 4, 0, P2);
  ctx.fill();
}

/** His nameplate (a sprite: it rattles): a wedge of rosewood carrying a gold plate engraved THE SOLE PROPRIETOR. */
const PLATE_W = 0.34;
const PLATE_BOX: Box = (() => {
  const [px, py] = D(PLATE.X, 0, PLATE.z);
  const k = pz(PLATE.z);
  return { x: Math.floor(px - PLATE_W * k * 0.5 - 30), y: Math.floor(py - 0.09 * k), w: Math.ceil(PLATE_W * k + 60), h: Math.ceil(0.09 * k + 12) };
})();
function nameplate(ctx: Ctx): void {
  const [px, py] = D(PLATE.X, 0, PLATE.z);
  const k = pz(PLATE.z);
  const w = PLATE_W * k;
  const h = 0.06 * k;
  // its shadow on the leather
  ctx.fillStyle = 'rgba(2,8,4,0.5)';
  ctx.fillRect(px - w / 2 + 12, py - 1, w, 6);
  // the wedge: its sloped face towards us, its top edge and its end
  const face: PathFn = (c) => {
    c.beginPath();
    c.moveTo(px - w / 2, py);
    c.lineTo(px + w / 2, py);
    c.lineTo(px + w / 2 - 3, py - h);
    c.lineTo(px - w / 2 + 3, py - h);
    c.closePath();
  };
  fillPath(ctx, quad([px + w / 2, py], [px + w / 2 + 8, py - 3], [px + w / 2 + 5, py - h - 3], [px + w / 2 - 3, py - h]), '#1a0806');
  fillPath(ctx, quad([px - w / 2 + 3, py - h], [px + w / 2 - 3, py - h], [px + w / 2 + 5, py - h - 3], [px - w / 2 + 11, py - h - 3]), '#5a2a1e');
  fillPath(ctx, face, lin(ctx, 0, py - h, 0, py, [[0, '#4a2018'], [1, '#2a0e0a']]));
  strokePath(ctx, face, '#0a0204', 1.2);
  // the gold plate
  const g0 = px - w / 2 + 8;
  const g1 = px + w / 2 - 8;
  ctx.fillStyle = goldFill(ctx, g0, py - h + 4, g0 + 30, py - 4, 1);
  ctx.fillRect(g0, py - h + 4, g1 - g0, h - 8);
  ctx.strokeStyle = rgba(GOLD.deep, 0.8);
  ctx.lineWidth = 1;
  ctx.strokeRect(g0 + 2, py - h + 6, g1 - g0 - 4, h - 12);
  ctx.fillStyle = '#3a2008';
  ctx.font = `bold ${Math.round(h * 0.34)}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('THE SOLE PROPRIETOR', px, py - h / 2 + 0.5);
  ctx.fillStyle = rgba('#fff4c8', 0.35);
  ctx.fillText('THE SOLE PROPRIETOR', px - 0.5, py - h / 2);
  // a glint where the key catches its corner
  glint(ctx, g0 + 2, py - h + 5, 1.4, 0.5);
}

// ——— a velvet drape in the near right corner (the room's frame; it keeps the stopwatch's corner dark) ———

const NEAR_PTS: Pt[] = (() => {
  const pts: Pt[] = [[W + 20, -10], [1858, -10]];
  for (let t = 0.05; t <= 1.001; t += 0.05) pts.push([1858 + 34 * Math.sin((t * Math.PI) / 2) ** 1.3, -10 + 560 * t]);
  for (let t = 0.05; t <= 1.001; t += 0.05) pts.push([1892 - 50 * t ** 1.5, 550 + (TY + 10 - 550) * t]);
  pts.push([W + 20, TY + 10]);
  return pts;
})();
function nearDrape(ctx: Ctx): void {
  const path = polyPath(NEAR_PTS);
  const b = boxOfPts(NEAR_PTS, 0);
  castShadow(ctx, path, 18, 30, 0.6, '#020006');
  drape(ctx, path, b, shade(VELVET, -0.1), { fold: 24, depth: 1.1, phase: 0.6 });
  within(ctx, path, () => {
    vfill(ctx, b.x, b.y, b.w, b.h, [[0, 'rgba(6,1,6,0.8)'], [0.3, 'rgba(6,1,6,0.5)'], [0.55, 'rgba(6,1,6,0)'], [1, 'rgba(6,1,6,0.2)']]);
    // the room's light along its leading edge, low down
    ctx.fillStyle = lin(ctx, 1846, 0, 1912, 0, [[0, rgba('#ffb0a0', 0.45)], [0.4, rgba('#ff90b0', 0.12)], [1, rgba('#ffb0a0', 0)]]);
    ctx.fillRect(b.x, 420, b.w, 360);
  });
  strokePath(ctx, path, '#0a0208', 2.6);
  // its gold fringe down the leading edge, the tie
  ctx.strokeStyle = rgba(GOLD.shade, 0.8);
  ctx.lineWidth = 4;
  ctx.beginPath();
  NEAR_PTS.slice(1, 42).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = GOLD.shade;
  ctx.beginPath();
  ctx.ellipse(1908, 552, 30, 8, 0, 0, Math.PI);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = GOLD.body;
  ctx.stroke();
}

// ——— the curtains: plum velvet either side of the window, on gold tiebacks ———

const ROD_Y = sy(2.385, ZW);
const TIE_Y = sy(1.02, ZW);
const CURT = [
  { x0: WX0 - 12, x1: WX0 + 104, side: -1 },
  { x0: WX1 - 104, x1: WX1 + 26, side: 1 },
];
const pinchX = (c: (typeof CURT)[number]) => (c.side < 0 ? c.x0 + 52 : c.x1 - 52);

function curtainPath(c: (typeof CURT)[number]): Pt[] {
  const { x0, x1, side } = c;
  const outer = side < 0 ? x0 : x1;
  const inner = side < 0 ? x1 : x0;
  const pinch = pinchX(c);
  const foot = side < 0 ? x0 + 96 : x1 - 96;
  const pts: Pt[] = [[outer, ROD_Y], [inner, ROD_Y]];
  // the leading edge swept back to the tie, then falling and flaring to the floor, a little pooled
  for (let t = 0.05; t <= 1.001; t += 0.05) pts.push([inner + (pinch - inner) * Math.sin((t * Math.PI) / 2) ** 1.4, ROD_Y + (TIE_Y - ROD_Y) * t]);
  for (let t = 0.05; t <= 1.001; t += 0.05) pts.push([pinch + (foot - pinch) * t ** 1.6, TIE_Y + (FLOOR_Y + 4 - TIE_Y) * t]);
  pts.push([outer + side * 6, FLOOR_Y + 6]);
  return pts;
}

function curtainOne(ctx: Ctx, i: number): void {
  ctx.lineJoin = 'round';
  {
    const c = CURT[i];
    const pts = curtainPath(c);
    const path = polyPath(pts);
    const b = boxOfPts(pts, 2);
    castShadow(ctx, path, 10, 14, 0.5, '#06020a');
    drape(ctx, path, b, VELVET, { fold: 24, depth: 1.05, phase: c.side * 1.3 });
    within(ctx, path, () => {
      // velvet: darker towards the floor and away from the key, the window's violet glowing along its leading edge
      lay(ctx, noiseMask(14, 91 + c.side, { cover: 0.4, soft: 0.25, col: '#ff8ad8', w: 40, h: 160 }), b, 0.05);
      vfill(ctx, b.x, b.y, b.w, b.h, [[0, 'rgba(20,4,16,0.3)'], [0.4, 'rgba(20,4,16,0)'], [0.85, 'rgba(14,2,12,0.35)'], [1, 'rgba(10,2,8,0.6)']]);
      const ex = c.side < 0 ? c.x1 : c.x0;
      ctx.fillStyle = lin(ctx, ex, 0, ex - c.side * 40, 0, [[0, rgba('#c88aff', 0.28)], [1, rgba('#c88aff', 0)]]);
      ctx.fillRect(b.x, b.y, b.w, TIE_Y - b.y + 40);
      if (c.side > 0) {
        ctx.fillStyle = 'rgba(10,2,10,0.25)';
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
    });
    strokePath(ctx, path, '#1a0414', 2);
    // the gold fringe down the leading edge
    ctx.strokeStyle = rgba(GOLD.body, 0.7);
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.slice(1, 22).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = rgba(GOLD.lit, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
    // the tieback: a gold cord round the gather, a tassel hanging from it
    const outer = c.side < 0 ? c.x0 : c.x1;
    const tx = (pinchX(c) + outer) / 2;
    const trx = Math.abs(pinchX(c) - outer) / 2 + 4;
    const ty = TIE_Y;
    ctx.lineWidth = 6;
    ctx.strokeStyle = GOLD.shade;
    ctx.beginPath();
    ctx.ellipse(tx, ty, trx, 7, 0, 0, Math.PI);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = GOLD.lit;
    ctx.stroke();
    const tsx = tx - c.side * (trx - 6);
    const tsy = ty + 8;
    line(ctx, [tx - c.side * (trx - 10), ty + 5], [tsx, tsy + 10], GOLD.body, 2);
    const tas: PathFn = (q) => {
      q.beginPath();
      q.moveTo(tsx - 5, tsy + 10);
      q.quadraticCurveTo(tsx - 9, tsy + 30, tsx - 10, tsy + 44);
      q.lineTo(tsx + 10, tsy + 44);
      q.quadraticCurveTo(tsx + 9, tsy + 30, tsx + 5, tsy + 10);
      q.closePath();
    };
    fillPath(ctx, tas, goldFill(ctx, tsx - 10, tsy, tsx + 10, tsy + 44, 0.8));
    for (let x = tsx - 8; x <= tsx + 8; x += 3) line(ctx, [x * 0.6 + tsx * 0.4, tsy + 18], [x, tsy + 44], rgba(GOLD.deep, 0.5), 1);
    ctx.fillStyle = goldFill(ctx, tsx - 7, tsy + 6, tsx + 7, tsy + 18, 1);
    ctx.beginPath();
    ctx.ellipse(tsx, tsy + 12, 7, 6, 0, 0, P2);
    ctx.fill();
  }
}

function curtainRod(ctx: Ctx): void {
  // the brass rod over the window, its ball finials past the curtains
  const x0 = CURT[0].x0 - 22;
  const x1 = CURT[1].x1 + 22;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = goldFill(ctx, 0, ROD_Y - 5, 0, ROD_Y + 5, 1);
  ctx.fillRect(x0, ROD_Y - 5, x1 - x0, 10);
  for (const x of [x0, x1]) {
    ctx.fillStyle = goldFill(ctx, x - 11, ROD_Y - 11, x + 11, ROD_Y + 11, 1);
    ctx.beginPath();
    ctx.arc(x, ROD_Y, 11, 0, P2);
    ctx.fill();
  }
  ctx.restore();
  // the rings on the rod, gathered over each curtain
  for (const c of CURT) {
    for (let x = c.x0 + 6; x < c.x1; x += 13) {
      ctx.strokeStyle = GOLD.shade;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(x, ROD_Y + 1, 4, 8, 0, 0, P2);
      ctx.stroke();
      ctx.strokeStyle = rgba(GOLD.lit, 0.7);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// ——— the ticker: pizza prices on a dot-matrix board ———

type Quote = { t: string; col: string; up?: number };
const QUOTES: Quote[] = [
  { t: 'MARG', col: '#ffb040' }, { t: '4.20', col: '#7aff8a', up: 1 },
  { t: 'PEPP', col: '#ffb040' }, { t: '12.75', col: '#7aff8a', up: 1 },
  { t: 'FUNGHI', col: '#ffb040' }, { t: '3.10', col: '#ff5a4a', up: -1 },
  { t: 'CRUST', col: '#ffb040' }, { t: '99.99', col: '#7aff8a', up: 1 },
  { t: 'DOUGH', col: '#ffb040' }, { t: '7.45', col: '#7aff8a', up: 1 },
  { t: 'BASIL', col: '#ffb040' }, { t: '0.85', col: '#ff5a4a', up: -1 },
  { t: 'CHEESE', col: '#ffb040' }, { t: '21.30', col: '#7aff8a', up: 1 },
  { t: 'OVENS', col: '#ffb040' }, { t: '1000.00', col: '#7aff8a', up: 1 },
  { t: 'FEET', col: '#ffb040' }, { t: '0.01', col: '#ff5a4a', up: -1 },
];
const SPIKE: Quote[] = [
  { t: 'TAKEOVER', col: '#ffe060', up: 1 }, { t: 'ALL PIZZERIAS SOLD', col: '#7aff8a', up: 1 }, { t: 'YOUR SHOP SOLD', col: '#ffe060', up: 1 }, { t: 'PRICES X2', col: '#7aff8a', up: 1 },
];
const SHIFT: Quote[] = [{ t: 'SHIFT OVER', col: '#ffe060', up: 1 }, { t: 'TIME IS MONEY', col: '#7aff8a', up: 1 }];
const TK_ROWS = 11;
const TK_P = TICK_BOX.h / TK_ROWS;

/** A strip of quotes lit on the board's dot matrix (for an ADD blend): the text rendered small, one dot per pixel. */
function tickerStrip(quotes: Quote[], reps: number): HTMLCanvasElement {
  const font = 'bold 9px "Arial Narrow", Arial, sans-serif';
  const mg = makeCanvas(8, 8)[1];
  mg.font = font;
  const gap = 4;
  const widths = quotes.map((q) => Math.ceil(mg.measureText(q.t).width) + (q.up ? 9 : 0) + gap * 2);
  const one = widths.reduce((a, b) => a + b, 0);
  const n = one * reps;
  const g = makeCanvas(n, TK_ROWS)[1];
  g.font = font;
  g.textBaseline = 'middle';
  let x = 0;
  for (let k = 0; k < reps; k++) {
    for (const [i, q] of quotes.entries()) {
      g.fillStyle = q.col;
      g.fillText(q.t, x + gap, TK_ROWS / 2 + 0.5);
      const tw = Math.ceil(g.measureText(q.t).width);
      if (q.up) {
        // the arrow, drawn dot by dot
        const ax = x + gap + tw + 5;
        const ay = TK_ROWS / 2;
        for (let r2 = 0; r2 < 4; r2++) g.fillRect(ax - r2, ay + (q.up > 0 ? r2 - 2 : 1 - r2), r2 * 2 + 1, 1);
      }
      x += widths[i];
    }
  }
  // now the dots: each lit pixel a round LED with a little bloom
  const img = g.getImageData(0, 0, n, TK_ROWS).data;
  const [out, og] = makeCanvas(Math.ceil(n * TK_P), Math.ceil(TICK_BOX.h));
  for (let j = 0; j < TK_ROWS; j++) {
    for (let i = 0; i < n; i++) {
      const o = (j * n + i) * 4;
      const a = img[o + 3];
      if (a < 90) continue;
      const cx = i * TK_P + TK_P / 2;
      const cy = j * TK_P + TK_P / 2;
      og.fillStyle = `rgba(${img[o]},${img[o + 1]},${img[o + 2]},0.28)`;
      og.fillRect(cx - TK_P * 0.7, cy - TK_P * 0.7, TK_P * 1.4, TK_P * 1.4);
      og.fillStyle = `rgb(${Math.min(255, img[o] + 60)},${Math.min(255, img[o + 1] + 60)},${Math.min(255, img[o + 2] + 60)})`;
      og.beginPath();
      og.arc(cx, cy, TK_P * 0.36, 0, P2);
      og.fill();
    }
  }
  return out;
}
const tickCache = new Map<string, HTMLCanvasElement>();
const strip = (key: string, q: Quote[], reps: number) => {
  if (!tickCache.has(key)) tickCache.set(key, tickerStrip(q, reps));
  return tickCache.get(key)!;
};

function tickerStill(ctx: Ctx): void {
  const s = strip('main', QUOTES, 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(TICK_BOX.x, TICK_BOX.y, TICK_BOX.w, TICK_BOX.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(s, TICK_BOX.x, TICK_BOX.y);
  ctx.restore();
}

// ——— finishing ———

/** A gentle warm/cool split across the room (no full-screen pixel grade: it's cheap, and pixel-local). */
function grade(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, W * 0.85, 1080);
  g.addColorStop(0, rgba('#ffb070', 0.05));
  g.addColorStop(0.45, rgba('#ffb070', 0));
  g.addColorStop(0.62, rgba('#5050d0', 0));
  g.addColorStop(1, rgba('#5050d0', 0.06));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 1080);
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#05020c', 140, 700);
  vignetteAll(ctx, 0.62, '#030108', 0.55);
  vfill(ctx, 0, 0, W, 160, [[0, 'rgba(2,1,6,0.5)'], [1, 'rgba(2,1,6,0)']]);
  // the HUD's corners, and the top right where his stopwatch hangs, kept dark
  for (const [x, y, rad, a, sy2] of [[120, 50, 440, 0.5, 0.7], [1790, 330, 260, 0.45, 1.3], [1830, 40, 260, 0.4, 0.7]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sy2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    g.addColorStop(0, rgba('#020008', a));
    g.addColorStop(1, rgba('#020008', 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
    ctx.restore();
  }
}

// ——— the stack ———

const pad = (b: Box, p: number): Box => ({ x: Math.floor(b.x - p), y: Math.floor(b.y - p), w: Math.ceil(b.w + p * 2), h: Math.ceil(b.h + p * 2) });
const CLOCK_BOX: Box = (() => {
  const [x0, y0] = P(CLK.X - 0.3, 2.12, CLK.z);
  const [x1, y1] = P(CLK.X + 0.3, 0, CLK.z);
  return { x: Math.floor(x0 - 10), y: Math.floor(y0), w: Math.min(Math.ceil(x1 - x0 + 40), GLASS.x - Math.floor(x0 - 10)), h: Math.ceil(y1 - y0 + 30) };
})();
const CHAIR_BOX: Box = (() => {
  const k = pz(CHAIR.z);
  const cx = sx(CHAIR.X, CHAIR.z);
  const w = CHAIR.hw * k;
  return { x: Math.floor(cx - w * 1.4 - 10), y: Math.floor(sy(CHAIR.Y, CHAIR.z) - 20), w: Math.ceil(w * 2.8 + 50), h: Math.ceil(TY - sy(CHAIR.Y, CHAIR.z) + 20) };
})();
const COOLER_BOX: Box = (() => {
  const k = pz(COOL.z);
  const cx = sx(COOL.X, COOL.z);
  return { x: Math.floor(cx - 0.16 * k), y: Math.floor(sy(1.08, COOL.z) - 4), w: Math.ceil(0.36 * k + 20), h: Math.ceil(TY + 12 - sy(1.08, COOL.z)) };
})();
const SAFE_BOX: Box = boxOfPts([P(SAFE.X0, SAFE.Y, SAFE.z1), P(SAFE.X1, SAFE.Y, SAFE.z1), P(DOOR.X, SAFE.Y, DOOR.z), P(SAFE.X1, 0, SAFE.z0), P(DOOR.X, 0, DOOR.z)], 30);
const CURT_BOX = (i: number): Box => pad(boxOfPts(curtainPath(CURT[i]), 0), 26);
const ROD_BOX: Box = { x: Math.floor(CURT[0].x0 - 40), y: Math.floor(ROD_Y - 16), w: Math.ceil(CURT[1].x1 - CURT[0].x0 + 80), h: 34 };
const WINDOW_BOX: Box = pad(GLASS, 24);
const DESK_LIGHT_BOX: Box = { x: Math.floor(LAMP_X - 230), y: Math.floor(LAMP_BOX.y - 160), w: 460, h: Math.ceil(TY + 80 - LAMP_BOX.y + 160) };
const GLOBE_BOX: Box = (() => {
  const [gx, gy] = D(GLOBE.X, 0, GLOBE.z);
  const k = pz(GLOBE.z);
  return { x: Math.floor(gx - 0.12 * k), y: Math.floor(GLOBE_C[1] - GS / 2 - 4), w: Math.ceil(0.24 * k + 50), h: Math.ceil(gy + 16 - GLOBE_C[1] + GS / 2) };
})();
const PILE_BOX: Box = (() => {
  const [px, py] = D(PILE.X, 0, PILE.z);
  const k = pz(PILE.z);
  return { x: Math.floor(px - 0.13 * k), y: Math.floor(py - 0.08 * k), w: Math.ceil(0.3 * k), h: Math.ceil(0.08 * k + 14) };
})();

export const SOLEPROP: SceneSpec = {
  id: 'soleprop',
  info: {
    name: "The Proprietor's Office",
    subtitle: 'Wave 95',
    ambient: [],
    // (the void's swirl, the clock, the ticker and the papers are the live layer's)
    glows: [],
    light: '#f0d8ff',
    tableTint: '#f0f4ec',
  },
  layers: [
    { id: 'void', box: pad(GLASS, 4), draw: voidSky },
    { id: 'backWall', box: { x: Math.floor(sx(-XW, ZW)) - 2, y: 0, w: Math.ceil(sx(XW, ZW) - sx(-XW, ZW)) + 4, h: Math.ceil(FLOOR_Y) + 2 }, draw: backWall },
    { id: 'sideL', box: { x: 0, y: 0, w: Math.ceil(sx(-XW, ZW)) + 2, h: TY + 4 }, draw: (c, r) => sideWall(c, r, -1) },
    { id: 'sideR', box: { x: Math.floor(sx(XW, ZW)) - 2, y: 0, w: W - Math.floor(sx(XW, ZW)) + 2, h: TY + 4 }, draw: (c, r) => sideWall(c, r, 1) },
    { id: 'floor', box: { x: 0, y: Math.floor(FLOOR_Y) - 16, w: W, h: Math.ceil(TY - FLOOR_Y) + 24 }, draw: floor },
    { id: 'clock', box: CLOCK_BOX, draw: clockCase },
    { id: 'cooler', box: COOLER_BOX, draw: cooler },
    { id: 'safe', box: SAFE_BOX, draw: safe },
    { id: 'nearDrape', box: { x: 1790, y: 0, w: W - 1790, h: TY + 12 }, draw: (c) => nearDrape(c) },
    { id: 'swirlStill', box: GLASS, stillOnly: true, draw: (c) => swirlStill(c) },
    { id: 'swirl', box: GLASS, motion: 'slot', draw: () => {} },
    { id: 'window', box: WINDOW_BOX, draw: (c) => windowFrame(c) },
    { id: 'curtainL', box: CURT_BOX(0), draw: (c) => curtainOne(c, 0) },
    { id: 'curtainR', box: CURT_BOX(1), draw: (c) => curtainOne(c, 1) },
    { id: 'rod', box: ROD_BOX, draw: (c) => curtainRod(c) },
    { id: 'chair', box: CHAIR_BOX, draw: chair },
    { id: 'deedTilt', box: DEED_BOX, motion: 'sprite', draw: (c) => deedTilt(c) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: H - TY }, draw: table },
    { id: 'deskLight', box: DESK_LIGHT_BOX, draw: (c) => deskLight(c) },
    { id: 'globeStand', box: GLOBE_BOX, draw: (c) => globeStand(c) },
    { id: 'pile', box: PILE_BOX, draw: pile },
    { id: 'globeStill', box: GLOBE_BOX, stillOnly: true, draw: (c) => globeStill(c) },
    { id: 'lamp', box: LAMP_BOX, motion: 'sprite', draw: (c) => lamp(c) },
    { id: 'plate', box: PLATE_BOX, motion: 'sprite', draw: (c) => nameplate(c) },
    { id: 'clockStill', box: CLOCK_BOX, stillOnly: true, draw: (c) => clockStill(c) },
    { id: 'tickerStill', box: TICK_BOX, stillOnly: true, draw: (c) => tickerStill(c) },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** One sheet of paper (frame i of 4), lit from the top left: a contract, ruled, some with a red seal. */
const PAPER = { w: 34, h: 44 };
function paperFrame(c: Ctx, i: number): void {
  const { w, h } = PAPER;
  const p: PathFn = (q) => {
    q.beginPath();
    q.moveTo(3, 3);
    q.lineTo(w - 3, 3);
    q.lineTo(w - 3, h - 3 - (i % 2 ? 4 : 0));
    q.lineTo(w - 3 - (i % 2 ? 4 : 0), h - 3);
    q.lineTo(3, h - 3);
    q.closePath();
  };
  fillPath(c, p, lin(c, 0, 0, w, h, [[0, '#fffaf0'], [0.6, '#f0e6d0'], [1, '#c8b898']]));
  c.strokeStyle = 'rgba(60,40,30,0.4)';
  c.lineWidth = 0.8;
  for (let l = 0; l < 7; l++) {
    const y = 9 + l * 4.2;
    c.beginPath();
    c.moveTo(7, y);
    c.lineTo(w - 7 - (l === 6 ? 10 : (l * 3) % 7), y);
    c.stroke();
  }
  if (i % 2 === 0) {
    c.fillStyle = '#b8202a';
    c.beginPath();
    c.arc(w - 10, h - 10, 4, 0, P2);
    c.fill();
  } else {
    c.strokeStyle = 'rgba(30,30,90,0.6)';
    c.beginPath();
    c.moveTo(8, h - 9);
    c.bezierCurveTo(12, h - 14, 15, h - 4, 20, h - 10);
    c.stroke();
  }
  c.strokeStyle = 'rgba(80,60,40,0.55)';
  c.lineWidth = 1;
  p(c);
  c.stroke();
}

interface Paper {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
  spin: number;
  flip: number;
  vflip: number;
  rest: number;
  floor: number;
  landed: boolean;
  age: number;
  live: boolean;
}

interface Bit {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  spin: number;
  age: number;
  life: number;
  live: boolean;
}

registerKitScene(SOLEPROP, (k: KitLive) => {
  const ADD = Phaser.BlendModes.ADD;
  const sc = k.sc;
  const voidC = k.slot('swirl');
  const top = k.slot('fx');
  const layer = () => {
    const c = sc.add.container(0, 0);
    top.add(c);
    return c;
  };
  const tickC = layer();
  const clockC = layer();
  const deskC = layer();
  const glintC = layer();
  const paperC = layer();
  const flashC = layer();
  const flashes = () => save.settings.flashes && !save.settings.reducedMotion;
  const inFight = 'miniFoot' in (sc as object);

  // ——— the void: the swirl winding round the far portal, its eye, the stars twinkling
  const swKey = sheet(k, 'sp_swirl', SW_S, SW_S, SW_N, (c, ph) => swirlFrame(c, SW_S, ph));
  const swirl = new Loop(k, swKey, SW_N, PORTAL[0], PORTAL[1], { into: voidC, add: true, scale: SW_SCALE, fps: 1.6 });
  const eye = new Loop(k, swKey, SW_N, PORTAL[0], PORTAL[1], { into: voidC, add: true, scale: 0.42, fps: 5 });
  const eyeGlow = k.glow(PORTAL[0], PORTAL[1], 70, 0xe8d0ff, 0.25, { into: voidC });
  const goldFlare = k.glow(PORTAL[0], PORTAL[1], 420, 0xffc040, 0, { into: voidC });
  let swRot = 0.6;
  let eyeRot = 1.7;
  const twKey = k.tex('sp_twinkle', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.15, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fillRect(0, 15.4, 32, 1.2);
    c.fillRect(15.4, 0, 1.2, 32);
  });
  const tw: { img: Phaser.GameObjects.Image; ph: number; sp: number; base: number }[] = [];
  const tr = rng(9151);
  for (let n = 0; n < 200 && tw.length < 16; n++) {
    const x = GLASS.x + 10 + tr() * (GLASS.w - 20);
    const y = GLASS.y + 60 + tr() * (GLASS.h - 90);
    if (Math.hypot(x - FAR.x, y - FAR.y) < 150 || Math.abs(x - VX) < 200) continue;
    tw.push({ img: k.img(twKey, x, y, { into: voidC, add: true, scale: 0.2 + tr() * 0.25, tint: [0xffffff, 0xe8d8ff, 0xcfe8ff][Math.floor(tr() * 3)], alpha: 0 }), ph: tr() * 10, sp: 0.5 + tr() * 1.6, base: 0.3 + tr() * 0.4 });
  }

  // ——— the ticker: its strip scrolling on the board; a spike strip when the takeover lands, another at the bell
  const tkKey = (key: string, q: Quote[], reps: number) => {
    const tkey = `sp_tick_${key}`;
    if (!sc.textures.exists(tkey)) sc.textures.addCanvas(tkey, strip(key, q, reps));
    return tkey;
  };
  const tMain = tkKey('main', QUOTES, 2);
  const tSpike = tkKey('spike', SPIKE, 3);
  const tShift = tkKey('shift', SHIFT, 5);
  const tick = sc.add.tileSprite(TICK_BOX.x, TICK_BOX.y, TICK_BOX.w, TICK_BOX.h, tMain).setOrigin(0, 0).setBlendMode(ADD);
  tickC.add(tick);
  const tickFlash = k.glow(TICK_BOX.x + TICK_BOX.w / 2, TICK_BOX.y + TICK_BOX.h / 2, TICK_BOX.w / 2, 0x7aff8a, 0, { into: tickC, sy: 0.12 });
  let tickMode = 0;
  let tickT = 0;
  const setTick = (mode: number, dur: number) => {
    tickMode = mode;
    tickT = dur;
    tick.setTexture(mode === 1 ? tSpike : mode === 2 ? tShift : tMain);
    tick.tilePositionX = 0;
  };

  // ——— the clock: the pendulum swinging (a painted loop), the hands ticking, the dial ringing out at the bell
  const pKey = sheet(k, 'sp_pend', PEND.w, PEND.h, 20, (c, ph) => pendFrame(c, ph));
  const pend = new Loop(k, pKey, 20, CLK_X, PIV[1], { into: clockC, origin: [0.5, 0], fps: 10, phase: 5 });
  const glassKey = k.tex('sp_trunkglass', PEND.w, PEND.h, (c) => trunkGlass(c, CLK_X - PEND.w / 2, PIV[1]));
  k.img(glassKey, CLK_X, PIV[1], { into: clockC, origin: [0.5, 0] });
  const hands = [0, 1, 2].map((i) => k.img(k.tex(`sp_hand${i}`, HAND_S, HAND_S, (c) => handPaint(c, i, HAND_S)), DIAL[0], DIAL[1], { into: clockC }));
  const ringKey = k.tex('sp_ring', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.1)');
    g.addColorStop(0.9, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  const rings = [0, 1, 2].map(() => ({ img: k.img(ringKey, DIAL[0], DIAL[1], { into: flashC, add: true, alpha: 0, tint: 0xffe0a0 }), t: 9 }));
  const dialGlow = k.glow(DIAL[0], DIAL[1], 80, 0xffd890, 0, { into: flashC });
  /** The clock's own time (s); the shift's seconds left (null: not running). */
  let clockS = 0;
  let shiftLeft: number | null = null;
  let demoT = 0;
  const secS = new Spring(0, 260, 9);
  const minS = new Spring(0, 200, 10);
  let strikes = 0;
  let strikeT = 0;
  const strike = () => {
    strikes = 12;
    strikeT = 0;
  };

  // ——— the globe: the pizza turning on its stand (a painted loop), spun by stomps
  const gKey = sheet(k, 'sp_globe', GS, GS, 12, (c, ph) => globeFrame(c, ph));
  const globe = new Loop(k, gKey, 12, GLOBE_C[0], GLOBE_C[1], { into: deskC, fps: 1, phase: 0 });
  let gPh = 0;
  let gSpin = 0.12;
  const gJig = new Spring(0, 160, 7);

  // ——— the lamp and the nameplate: they jump at a stomp; the lamp's pull chain swings
  const [lbx, lby] = D(LAMP.X, 0, LAMP.z);
  const lampImg = k.pivot(k.sprite('lamp'), lbx, lby);
  const lampY = new Spring(0, 220, 12);
  const lampA = new Spring(0, 140, 6);
  const chain = sc.add.graphics();
  deskC.add(chain);
  const chainS = new Spring(0, 30, 1.4);
  const [pbx, pby] = D(PLATE.X, 0, PLATE.z);
  const plateImg = k.pivot(k.sprite('plate'), pbx, pby);
  const plateY = new Spring(0, 260, 14);
  const plateA = new Spring(0, 200, 9);
  // the deed on the wall, on its nail
  const deedImg = k.pivot(k.sprite('deedTilt'), DEED_NAIL[0], DEED_NAIL[1]);
  const deedA = new Spring(0, 26, 3.2);
  let deedRest = 0;

  // ——— the safe: glints running over the crusts; crusts tumbling out
  const starKey = k.tex('sp_star', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 7);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    const l = c.createLinearGradient(0, 16, 32, 16);
    l.addColorStop(0, 'rgba(255,255,255,0)');
    l.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    l.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = l;
    c.fillRect(0, 15, 32, 2);
    const v = c.createLinearGradient(16, 0, 16, 32);
    v.addColorStop(0, 'rgba(255,255,255,0)');
    v.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    v.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = v;
    c.fillRect(15, 0, 2, 32);
  });
  const glints = CRUSTS.map(([x, y], i) => ({ img: k.img(starKey, x, y, { into: glintC, add: true, alpha: 0, tint: 0xfff0b0, scale: 0.5 }), t: 9, dur: 0.5, rot: hash(i, 3) * 0.8 }));
  let glintT = 0.5;
  const goldGlow = k.glow((sx(SAFE.X0, SAFE.z0) + sx(SAFE.X1, SAFE.z0)) / 2, sy(0.42, SAFE.z0), 120, 0xffb040, 0.1, { into: glintC });
  const crustKey = sheet(k, 'sp_crust', 40, 30, 3, (c, _p, i) => crust(c, 20, 20, 1 + i * 0.12, (i - 1) * 0.3));
  const crusts: Bit[] = [];
  const spillCrust = (kick: number) => {
    let b = crusts.find((q) => !q.live);
    if (!b) {
      if (crusts.length > 16) return;
      b = { img: k.img(crustKey, 0, 0, { into: glintC }), x: 0, y: 0, vx: 0, vy: 0, a: 0, spin: 0, age: 0, life: 3, live: false };
      crusts.push(b);
    }
    const [x, y] = P(SAFE.X0 + 0.1 + crand() * (SAFE.X1 - SAFE.X0 - 0.2), 0.1 + crand() * 0.12, SAFE.z0 - 0.02);
    b.img.setFrame(Math.floor(crand() * 3)).setScale(0.8 + crand() * 0.4);
    b.x = x;
    b.y = y;
    b.vx = (crand() - 0.35) * 160 * kick;
    b.vy = -60 - crand() * 200 * kick;
    b.a = crand() * P2;
    b.spin = (crand() - 0.5) * 8;
    b.age = 0;
    b.live = true;
  };

  // ——— the cooler: bubbles glugging up through the jug
  const bubKey = k.tex('sp_bubble', 16, 16, (c) => {
    c.strokeStyle = 'rgba(230,240,255,0.9)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(8, 8, 5.5, 0, P2);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.fillRect(5, 4.5, 2, 2);
  });
  const bubbles: { img: Phaser.GameObjects.Image; x: number; y: number; v: number; ph: number; live: boolean }[] = [];
  const bubble = () => {
    let b = bubbles.find((q) => !q.live);
    if (!b) {
      if (bubbles.length > 24) return;
      b = { img: k.img(bubKey, 0, 0, { into: deskC, add: true, alpha: 0 }), x: 0, y: 0, v: 0, ph: 0, live: false };
      bubbles.push(b);
    }
    b.x = JUG.x + (crand() - 0.5) * JUG.w * 0.4;
    b.y = JUG.bot;
    b.v = 50 + crand() * 50;
    b.ph = crand() * P2;
    b.img.setScale(0.35 + crand() * 0.5);
    b.live = true;
  };
  let bubT = 2;

  // ——— the papers: sheets lifting off the pile (or bursting off the desk) and fluttering down onto it
  const papKey = sheet(k, 'sp_paper', PAPER.w, PAPER.h, 4, (c, _p, i) => paperFrame(c, i));
  const papers: Paper[] = [];
  const [pileX, pileY] = D(PILE.X, 0.03, PILE.z);
  const paper = (x: number, y: number, vx: number, vy: number) => {
    let p = papers.find((q) => !q.live);
    if (!p) {
      if (papers.length > 40) return;
      p = { img: k.img(papKey, 0, 0, { into: paperC }), x: 0, y: 0, vx: 0, vy: 0, ph: 0, spin: 0, flip: 0, vflip: 0, rest: 0, floor: 0, landed: false, age: 0, live: false };
      papers.push(p);
    }
    p.img.setFrame(Math.floor(crand() * 4)).setAlpha(1).setVisible(true);
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.ph = crand() * P2;
    p.spin = (crand() - 0.5) * 3;
    p.flip = crand() * P2;
    p.vflip = (2 + crand() * 4) * (crand() < 0.5 ? -1 : 1);
    p.rest = (crand() - 0.5) * 1.2;
    // where it lands on the desk: in front of where it took off, somewhere towards us
    p.floor = Math.min(FRONT - 30, Math.max(TY + 14, y + 20 + crand() * 90));
    p.landed = false;
    p.age = 0;
    p.live = true;
  };
  const lift = (n: number, p: number) => {
    for (let i = 0; i < n; i++) paper(pileX + (crand() - 0.5) * 30, pileY - crand() * 6, -60 + crand() * 100, -160 - crand() * 260 * p);
  };
  const burst = (n: number) => {
    // off the pile and off the desk's back edge on both sides, flung up high
    for (let i = 0; i < n; i++) {
      const fromPile = i % 2 === 0;
      // (the right-hand ones from the desk under the lamp, kept low: his stopwatch hangs over that corner)
      const x = fromPile ? pileX + (crand() - 0.5) * 30 : 1640 + crand() * 160;
      const y = fromPile ? pileY : TY + 14 + crand() * 20;
      paper(x, y, fromPile ? -80 + crand() * 140 : -(60 + crand() * 160), fromPile ? -380 - crand() * 340 : -220 - crand() * 160);
    }
  };

  // ——— the fight's signals
  const sold = () => {
    setTick(1, 7);
    burst(16);
    for (let i = 0; i < 8; i++) spillCrust(1.2);
    lampA.v += 5 * calm();
    lampY.v -= 120 * calm();
    chainS.v += 6 * calm();
    plateY.v -= 160 * calm();
    gSpin += 3;
    deedA.v += 1.1 * calm();
    deedRest = 0.06;
    goldT = 1;
  };
  const shiftOver = () => {
    shiftLeft = null;
    strike();
    setTick(2, 9);
    burst(12);
    gSpin += 2;
    deedA.v -= 0.8 * calm();
  };
  let goldT = 0;
  const ev = sc.events;
  const onSold = () => sold();
  const onTick = (s: number) => {
    shiftLeft = s;
  };
  const onOver = () => shiftOver();
  ev.on('soleprop-sold', onSold);
  ev.on('soleprop-tick', onTick);
  ev.on('soleprop-shift-over', onOver);
  const unlisten = () => {
    ev.off('soleprop-sold', onSold);
    ev.off('soleprop-tick', onTick);
    ev.off('soleprop-shift-over', onOver);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  let demo = 0;

  return {
    impact(x, y, p) {
      if (p <= 0.02) return;
      // the desk toys rattle: the globe spins, the lamp and the nameplate jump
      gSpin += p * 1.6;
      gJig.v -= p * 30;
      lampY.v -= p * 90;
      lampA.v += (crand() - 0.5) * p * 4;
      chainS.v += (crand() - 0.5) * p * 6;
      plateY.v -= p * 110;
      plateA.v += (crand() - 0.5) * p * 3;
      // the deed on the wall knocked a little crooked
      deedA.v += (x < 960 ? -1 : 1) * p * 0.6 * (0.6 + crand() * 0.6);
      if (p > 0.4) deedRest = Math.max(-0.08, Math.min(0.08, deedRest + (crand() - 0.5) * 0.05 * p));
      // papers off the pile, bubbles in the jug, a crust or two off the heap
      lift(Math.round(1 + p * 3), p);
      for (let i = 0; i < p * 6; i++) bubble();
      if (p > 0.5) spillCrust(p);
      void y;
      if (!inFight && p >= 0.95) {
        if (demo++ % 2 === 0) sold();
        else shiftOver();
      }
    },
    update(dt, t) {
      const cm = calm();
      // ——— the void
      swRot += dt * 0.035 * cm;
      eyeRot += dt * 0.5 * cm;
      swirl.alpha = SWIRL_A * (0.92 + 0.08 * Math.sin(t * 0.4));
      swirl.step(dt * cm);
      swirl.each((im) => im.setRotation(swRot));
      eye.step(dt * cm);
      eye.each((im) => im.setRotation(eyeRot).setScale(0.42 * (1 + 0.04 * Math.sin(t * 2.1))));
      eyeGlow.setAlpha(0.22 + 0.06 * Math.sin(t * 1.7));
      goldT = Math.max(0, goldT - dt * 0.5);
      goldFlare.setAlpha((flashes() ? 0.35 : 0.15) * goldT);
      for (const s of tw) {
        const g = Math.sin(t * 0.31 * s.sp + s.ph * 3);
        const gl = g > 0.97 ? (g - 0.97) / 0.03 : 0;
        s.img.setAlpha(s.base * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) + gl * 0.7);
      }
      // ——— the ticker
      if (tickT > 0) {
        tickT -= dt;
        if (tickT <= 0) setTick(0, 0);
      }
      const tsp = tickMode === 0 ? 40 : 120;
      tick.tilePositionX += dt * tsp * cm;
      const fl = tickMode !== 0 ? Math.min(1, tickT) * (0.5 + 0.5 * Math.sign(Math.sin(t * 9))) : 0;
      tick.setAlpha(tickMode !== 0 && flashes() ? 0.7 + 0.3 * fl : 0.9);
      tickFlash.setAlpha(tickMode !== 0 ? 0.25 * Math.min(1, tickT) * (flashes() ? 1 : 0.4) : 0);
      tickFlash.setTint(tickMode === 2 ? 0xffe060 : 0x7aff8a);
      // ——— the clock
      // (on the stages page the shift is played over and over: 60 s, the bell, a rest)
      if (!inFight) {
        demoT += dt;
        const c = demoT % 72;
        if (c < 60) shiftLeft = Math.ceil(60 - c);
        else if (shiftLeft !== null) shiftOver();
      }
      clockS += dt;
      const running = shiftLeft !== null;
      pend.step(dt * cm, running ? 1.5 : 1);
      const secTarget = Math.floor(clockS) * (P2 / 60);
      const sa = secS.step(secTarget, dt);
      // the minute hand goes once round in the shift's 60 s (a minute a second: time is money); the hour hand from
      // eleven to twelve with it; the bell when it gets there
      const mins = running ? 60 - shiftLeft! : strikes > 0 ? 60 : 0;
      const ma = minS.step((mins / 60) * P2, dt);
      hands[0].setRotation(((11 + mins / 60) / 12) * P2);
      hands[1].setRotation(ma);
      hands[2].setRotation(sa);
      if (strikes > 0) {
        strikeT -= dt;
        if (strikeT <= 0) {
          strikes--;
          strikeT = 0.55;
          const rg = rings.find((q) => q.t > 0.9) ?? rings[0];
          rg.t = 0;
          if (strikes === 0) minS.x = 0;
        }
      }
      for (const rg of rings) {
        if (rg.t > 0.9) continue;
        rg.t += dt;
        const u = rg.t / 0.9;
        rg.img.setScale(((DIAL_R * 2) / 128) * (1 + u * 2.2)).setAlpha((1 - u) ** 2 * (flashes() ? 0.7 : 0.3));
      }
      dialGlow.setAlpha(strikes > 0 ? 0.25 + 0.15 * Math.max(0, Math.sin(strikeT * 6)) : running && shiftLeft! <= 10 ? 0.12 * (0.5 + 0.5 * Math.sin(t * 6)) : 0);
      // ——— the globe
      gSpin = Math.max(0.12, gSpin - dt * (0.4 + gSpin * 0.35));
      gPh = (gPh + dt * gSpin * 0.2 * cm) % 1;
      globe.show(gPh * 12);
      const gj = gJig.step(0, dt);
      globe.each((im) => im.setPosition(GLOBE_C[0], GLOBE_C[1] + gj));
      // ——— the lamp, its chain, the nameplate, the deed
      const ly = lampY.step(0, dt);
      const la = lampA.step(0, dt);
      lampImg.setPosition(lbx, lby + Math.min(0, ly)).setRotation(la * 0.02);
      const ca = chainS.step(Math.sin(t * 0.7) * 0.03 * cm, dt);
      chain.clear();
      const ax = LAMP_SHADE.x + LAMP_SHADE.w * 0.55;
      const ay = LAMP_SHADE.y + LAMP_SHADE.h + Math.min(0, ly);
      const L = 0.075 * pz(LAMP.z);
      const ex = ax + Math.sin(ca + la * 0.02) * L;
      const ey = ay + Math.cos(ca) * L;
      chain.lineStyle(1.4, 0xc89a3a, 1).lineBetween(ax, ay, ex, ey);
      chain.fillStyle(0xffd870, 1).fillCircle(ex, ey + 2, 2.6);
      chain.fillStyle(0x7a5418, 1).fillCircle(ex + 0.8, ey + 2.6, 1.2);
      const py2 = plateY.step(0, dt);
      plateImg.setPosition(pbx, pby + Math.min(0, py2)).setRotation(plateA.step(0, dt) * 0.02);
      deedImg.setRotation(Math.max(-0.16, Math.min(0.16, deedA.step(deedRest, dt))));
      // ——— the safe's glints, the crusts tumbling out
      glintT -= dt * cm;
      if (glintT <= 0) {
        const g = glints[Math.floor(crand() * glints.length)];
        if (g.t > g.dur) {
          g.t = 0;
          g.dur = 0.35 + crand() * 0.4;
        }
        glintT = 0.12 + crand() * 0.35;
      }
      for (const g of glints) {
        if (g.t > g.dur) {
          g.img.setAlpha(0);
          continue;
        }
        g.t += dt;
        const u = g.t / g.dur;
        g.img.setAlpha(Math.sin(u * Math.PI) * 0.9).setScale(0.25 + Math.sin(u * Math.PI) * 0.45).setRotation(g.rot + u * 0.6);
      }
      goldGlow.setAlpha(0.1 + 0.03 * Math.sin(t * 1.3) + goldT * 0.2);
      for (const b of crusts) {
        if (!b.live) continue;
        b.age += dt;
        b.vy += 900 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.a += b.spin * dt;
        b.img.setPosition(b.x, b.y).setRotation(b.a).setAlpha(1);
        // it falls behind the desk's back edge
        if ((b.vy > 0 && b.y > TY - 4) || b.age > 3) {
          b.live = false;
          b.img.setAlpha(0);
        }
      }
      // ——— the cooler's bubbles
      bubT -= dt;
      if (bubT <= 0) {
        bubble();
        if (crand() < 0.5) bubble();
        bubT = 2.5 + crand() * 4;
      }
      for (const b of bubbles) {
        if (!b.live) continue;
        b.v += dt * 40;
        b.y -= b.v * dt * cm;
        b.ph += dt * 6;
        const x = b.x + Math.sin(b.ph) * 1.6;
        if (b.y < JUG.top + 4) {
          b.live = false;
          b.img.setAlpha(0);
          continue;
        }
        b.img.setPosition(x, b.y).setAlpha(Math.min(1, (JUG.bot - b.y) / 20) * 0.7);
      }
      // ——— the papers: a sheet falls like a leaf (it sways, side-slips and flips) and lands flat on the desk
      for (const p of papers) {
        if (!p.live) continue;
        p.age += dt;
        if (!p.landed) {
          p.ph += dt * (3 + Math.abs(p.vflip) * 0.4);
          p.vy += 520 * dt;
          const drag = Math.max(0, 1 - dt * 2.2);
          p.vx *= drag;
          if (p.vy > 0) p.vy = Math.min(p.vy, 110 + 40 * Math.abs(Math.sin(p.ph)));
          p.vx += Math.cos(p.ph) * 200 * dt * (p.vy > 0 ? 1 : 0.3);
          p.x += p.vx * dt * cm;
          p.y += p.vy * dt * cm;
          p.flip += p.vflip * dt * cm;
          const fy = Math.cos(p.flip);
          p.img.setPosition(p.x, p.y).setRotation(p.rest + Math.sin(p.ph) * 0.5).setScale(1, Math.max(0.12, Math.abs(fy)));
          p.img.setTint(fy < 0 ? 0xd8ccb8 : 0xffffff);
          if (p.vy > 0 && p.y >= p.floor) {
            p.landed = true;
            p.age = 0;
            p.img.setScale(1, 0.32).setTint(0xf4ecd8);
          }
        } else {
          // lying on the leather, then gone
          const a = Math.max(0, 1 - Math.max(0, p.age - 1.4) / 0.9);
          p.img.setAlpha(a);
          if (a <= 0) {
            p.live = false;
            p.img.setVisible(false);
          }
        }
      }
    },
  };
});
