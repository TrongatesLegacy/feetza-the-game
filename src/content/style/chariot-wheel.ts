// The Chariot Wheel's scythed war wheel, in the style kit (its boot is drawChariot in acts-f-4.ts). The wheel is a
// stack of sprites in play so it can spin while the light stays put: the turning wheel (a heavy bronze tyre studded
// with iron hobnails, a wooden felloe in six segments clamped with bronze, six thick turned spokes and the nave), a
// motion-blurred copy that takes over as it spins fast, the still light over them (the rim lit at the top left,
// shaded at the bottom right), the bronze axle arm from the greave down to the hub, the curved steel scythe forged
// onto the axle cap (it turns with the wheel, sweeping past the rim), and on top the big gold hub the player smacks,
// ringed with a warm glow. Every part of the turning wheel is shaded the same all the way round, so nothing on it
// seems to turn with the light.

import type { PathFn } from '../../art/style/kit';
import { glint, softStroke } from '../../art/style/kit';
import { lin, rad } from '../../art/style/kit-bosses';
import { type Ctx, mix, rgba, rng, shade } from '../../art/util';

/** The wheel's hub (design space) and the tyre's outer radius. */
export const CHARIOT_HUB: [number, number] = [170, 168];
export const WHEEL_R = 88;
/** (The painters draw a wheel of radius 72 and scale it.) */
const S = WHEEL_R / 72;
const BLADE_LEN = 118;
/** How far the scythe reaches from the hub (design units). */
export const BLADE_R = BLADE_LEN * S;
/** The blade's angle at rest (radians, canvas: 0 points right, positive turns clockwise), as stills show it. */
export const BLADE_REST = -1.05;
/** The square box (half size) the turning parts are drawn in, round the hub. */
export const WHEEL_HALF = Math.ceil(BLADE_R + 8);
/** The gold hub's radius (design units): the smack target. */
export const HUB_R = 26 * S;
/** Where the axle arm leaves the greave (design space). */
export const AXLE_MOUNT: [number, number] = [124, 82];

const INK = '#24140a';
const IRON = '#4a4e58';
const ring = (c: Ctx, r0: number, r1: number) => {
  c.beginPath();
  c.arc(0, 0, r1, 0, Math.PI * 2);
  c.arc(0, 0, r0, 0, Math.PI * 2, true);
};

/** A ring shaded the same all the way round: a radial ramp across its width. */
function radialBand(g: Ctx, r0: number, r1: number, stops: [number, string][]): void {
  g.fillStyle = rad(g, 0, 0, r0, 0, 0, r1, stops);
  ring(g, r0, r1);
  g.fill('evenodd');
}

/** The scythe along +x from the axle cap: a long curved steel blade with a honed edge, riveted to a bronze tang. */
function blade(g: Ctx): void {
  const L = BLADE_LEN;
  const back = (c: Ctx) => {
    c.moveTo(12, -10);
    c.bezierCurveTo(48, -34, L * 0.78, -40, L, -10);
  };
  const edge = (c: Ctx) => {
    c.moveTo(L, -10);
    c.bezierCurveTo(L * 0.8, -18, 62, -2, 14, 11);
  };
  const path: PathFn = (c) => {
    c.beginPath();
    back(c);
    c.bezierCurveTo(L * 0.8, -18, 62, -2, 14, 11);
    c.closePath();
  };
  g.save();
  path(g);
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.lineWidth = 4.6;
  g.stroke();
  g.fillStyle = lin(g, 0, -34, 0, 12, [
    [0, '#5a6270'],
    [0.3, '#c8d0da'],
    [0.55, '#f4f8fc'],
    [0.8, '#9aa4b2'],
    [1, '#4a5260'],
  ]);
  g.fill();
  g.clip();
  // the honed edge: a bright bevel along it; the forge's dark spine along the back
  g.beginPath();
  edge(g);
  g.strokeStyle = rgba('#ffffff', 0.9);
  g.lineWidth = 3.4;
  g.stroke();
  g.beginPath();
  back(g);
  g.strokeStyle = rgba('#2a3038', 0.55);
  g.lineWidth = 3.4;
  g.stroke();
  g.restore();
  // the tang, riveted to the axle cap
  g.fillStyle = lin(g, 8, -12, 36, 12, [
    [0, '#f2c27a'],
    [0.5, '#b8742e'],
    [1, '#5a2e10'],
  ]);
  g.beginPath();
  g.moveTo(8, -9);
  g.lineTo(36, -13);
  g.lineTo(38, 9);
  g.lineTo(8, 9);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2.2;
  g.stroke();
  for (const x of [20, 31]) {
    g.fillStyle = '#fff0c8';
    g.beginPath();
    g.arc(x, -1.5, 1.8, 0, Math.PI * 2);
    g.fill();
  }
}

/** One thick turned wooden spoke from the nave out to the felloe, along +x: tapered, rounded (lit down its middle),
 * with a bronze collar where it meets the nave. */
function spoke(g: Ctx, wood: string): void {
  const r0 = 24;
  const r1 = 51;
  const path: PathFn = (c) => {
    c.beginPath();
    c.moveTo(r0, -8);
    c.quadraticCurveTo((r0 + r1) / 2, -5, r1, -5.5);
    c.lineTo(r1, 5.5);
    c.quadraticCurveTo((r0 + r1) / 2, 5, r0, 8);
    c.closePath();
  };
  path(g);
  g.strokeStyle = INK;
  g.lineWidth = 3.6;
  g.lineJoin = 'round';
  g.stroke();
  g.fillStyle = lin(g, 0, -7, 0, 7, [
    [0, shade(wood, -0.5)],
    [0.3, shade(wood, 0.2)],
    [0.48, mix(shade(wood, 0.38), '#ffe8c0', 0.22)],
    [0.68, wood],
    [1, shade(wood, -0.55)],
  ]);
  g.fill();
  // the grain down it, and the bronze collar at the nave
  g.strokeStyle = rgba(shade(wood, -0.5), 0.45);
  g.lineWidth = 0.8;
  for (const dy of [-3, 0.6, 3.4]) {
    g.beginPath();
    g.moveTo(r0 + 7, dy);
    g.lineTo(r1 - 2, dy * 0.7);
    g.stroke();
  }
  g.fillStyle = lin(g, 0, -7.5, 0, 7.5, [
    [0, '#6a3a14'],
    [0.4, '#f2c27a'],
    [1, '#5a2e10'],
  ]);
  g.fillRect(r0 + 1, -7.6, 5, 15.2);
  g.strokeStyle = rgba(INK, 0.8);
  g.lineWidth = 1;
  g.strokeRect(r0 + 1, -7.6, 5, 15.2);
}

export interface WheelLook {
  wood: string;
  bronze: string;
}

/** The turning wheel round (0, 0). `blur` draws the spokes smeared round (the fast-spinning copy). */
export function paintWarWheel(g: Ctx, look: WheelLook, blur = false): void {
  const { wood, bronze } = look;
  g.save();
  g.scale(S, S);
  const spokes = (alpha: number, turn: number) => {
    g.save();
    g.globalAlpha = alpha;
    for (let i = 0; i < 6; i++) {
      g.save();
      g.rotate(turn + (i / 6) * Math.PI * 2);
      spoke(g, wood);
      g.restore();
    }
    g.restore();
  };
  if (blur) {
    // smeared over a sixth of a turn
    const n = 16;
    for (let i = 0; i < n; i++) spokes(0.15, (i / n) * (Math.PI / 3));
  } else spokes(1, 0);
  // the nave: a wooden drum round the axle, bound in bronze
  g.fillStyle = INK;
  g.beginPath();
  g.arc(0, 0, 32, 0, Math.PI * 2);
  g.fill();
  radialBand(g, 0, 30, [
    [0, shade(wood, 0.2)],
    [0.75, shade(wood, 0.05)],
    [1, shade(wood, -0.45)],
  ]);
  radialBand(g, 25, 30, [
    [0, shade(bronze, -0.4)],
    [0.5, mix(bronze, '#fff0c8', 0.35)],
    [1, shade(bronze, -0.5)],
  ]);
  // the felloe: the wooden rim, in six segments
  g.fillStyle = INK;
  ring(g, 47.5, 74);
  g.fill('evenodd');
  radialBand(g, 49.5, 61, [
    [0, shade(wood, -0.5)],
    [0.3, shade(wood, 0.08)],
    [0.55, mix(shade(wood, 0.28), '#ffe0b0', 0.12)],
    [1, shade(wood, -0.35)],
  ]);
  g.save();
  ring(g, 49.5, 61);
  g.clip('evenodd');
  // the grain running round it
  const r = rng(4417);
  for (let i = 0; i < 9; i++) {
    const rr = 51 + r() * 9;
    const a0 = r() * Math.PI * 2;
    g.strokeStyle = rgba(shade(wood, -0.55), 0.35 + r() * 0.2);
    g.lineWidth = 0.6 + r() * 0.6;
    g.beginPath();
    g.arc(0, 0, rr, a0, a0 + 1.2 + r() * 2);
    g.stroke();
  }
  g.restore();
  for (let i = 0; i < 6; i++) {
    g.save();
    // (the joints fall between the spokes)
    g.rotate((i / 6) * Math.PI * 2 + Math.PI / 6);
    g.strokeStyle = INK;
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(49.5, 0);
    g.lineTo(61, 0);
    g.stroke();
    g.fillStyle = lin(g, 49, 0, 62, 0, [
      [0, shade(bronze, -0.45)],
      [0.5, mix(bronze, '#fff0c8', 0.3)],
      [1, shade(bronze, -0.4)],
    ]);
    g.beginPath();
    g.rect(49.5, -6, 11.5, 12);
    g.fill();
    g.strokeStyle = rgba(INK, 0.9);
    g.lineWidth = 1.3;
    g.stroke();
    for (const y of [-3, 3]) {
      g.fillStyle = mix(bronze, '#fff4d0', 0.5);
      g.beginPath();
      g.arc(55.2, y, 1.5, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  // the heavy bronze tyre, studded with iron hobnails
  radialBand(g, 61, 72, [
    [0, shade(bronze, -0.6)],
    [0.22, shade(bronze, 0.02)],
    [0.5, mix(shade(bronze, 0.3), '#fff4d0', 0.3)],
    [0.78, bronze],
    [1, shade(bronze, -0.55)],
  ]);
  g.strokeStyle = rgba(INK, 0.85);
  g.lineWidth = 1.3;
  g.beginPath();
  g.arc(0, 0, 61.2, 0, Math.PI * 2);
  g.stroke();
  const nails = 16;
  for (let i = 0; i < nails; i++) {
    const a = (i / nails) * Math.PI * 2;
    const x = Math.cos(a) * 66.6;
    const y = Math.sin(a) * 66.6;
    if (blur) {
      g.fillStyle = rgba(IRON, 0.45);
      g.beginPath();
      g.arc(x, y, 2, 0, Math.PI * 2);
      g.fill();
      continue;
    }
    g.fillStyle = rgba('#000000', 0.4);
    g.beginPath();
    g.arc(x + 0.6, y + 0.7, 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rad(g, x, y, 0, x, y, 2.8, [
      [0, '#c8ccd6'],
      [0.6, IRON],
      [1, '#1e2028'],
    ]);
    g.beginPath();
    g.arc(x, y, 2.7, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** The turning scythe (round (0, 0), pointing along `a`). */
export function paintScythe(g: Ctx, a: number): void {
  g.save();
  g.scale(S, S);
  g.rotate(a);
  blade(g);
  g.restore();
}

/** The light on the wheel, which stays put as it turns: the tyre and felloe lit at the top left and shaded at the
 * bottom right, a long highlight along the top of the tyre, and the nave's shadow under the hub. */
export function paintWheelLight(g: Ctx): void {
  g.save();
  g.scale(S, S);
  g.save();
  ring(g, 47.5, 72.5);
  g.clip('evenodd');
  g.fillStyle = lin(g, -60, -60, 60, 60, [
    [0, rgba('#fff6dc', 0.42)],
    [0.35, rgba('#fff6dc', 0.08)],
    [0.55, rgba('#000000', 0)],
    [1, rgba('#1a0a00', 0.5)],
  ]);
  g.fillRect(-80, -80, 160, 160);
  g.restore();
  softStroke(g, (c) => c.arc(0, 0, 67, Math.PI * 1.06, Math.PI * 1.44), rgba('#ffffff', 0.75), 3, 1);
  softStroke(g, (c) => c.arc(0, 0, 55, Math.PI * 1.1, Math.PI * 1.36), rgba('#ffe8c8', 0.35), 2.6, 1.2);
  softStroke(g, (c) => c.arc(0, 0, 68, Math.PI * 0.05, Math.PI * 0.55), rgba('#000000', 0.32), 4, 2);
  // the hub's shadow on the nave
  g.fillStyle = rad(g, 3, 4, 24, 3, 4, 34, [
    [0, rgba('#000000', 0.45)],
    [1, rgba('#000000', 0)],
  ]);
  g.beginPath();
  g.arc(3, 4, 34, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** The bronze axle arm from the greave (AXLE_MOUNT) down to the hub (here at (0, 0) in the hub's frame). */
export function paintAxleArm(g: Ctx, hub: [number, number], bronze: string): void {
  const [mx, my] = [AXLE_MOUNT[0] - hub[0], AXLE_MOUNT[1] - hub[1]];
  const len = Math.hypot(mx, my);
  g.save();
  g.rotate(Math.atan2(my, mx));
  // its shadow on the spokes, then the arm: a flat bronze bar, wider at the hub
  g.fillStyle = rgba('#000000', 0.35);
  g.beginPath();
  g.moveTo(6, -10);
  g.lineTo(len, -6);
  g.lineTo(len, 10);
  g.lineTo(6, 16);
  g.closePath();
  g.fill();
  const arm: PathFn = (c) => {
    c.beginPath();
    c.moveTo(0, -11);
    c.lineTo(len, -6.5);
    c.quadraticCurveTo(len + 7, 0, len, 6.5);
    c.lineTo(0, 11);
    c.closePath();
  };
  arm(g);
  g.strokeStyle = INK;
  g.lineWidth = 3.2;
  g.lineJoin = 'round';
  g.stroke();
  g.fillStyle = lin(g, 0, -11, 0, 11, [
    [0, shade(bronze, 0.1)],
    [0.25, mix(shade(bronze, 0.4), '#fff4d0', 0.35)],
    [0.55, bronze],
    [1, shade(bronze, -0.55)],
  ]);
  g.fill();
  for (const x of [len * 0.55, len - 6]) {
    g.fillStyle = '#fff0c8';
    g.beginPath();
    g.arc(x, -1, 2.2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = rgba(INK, 0.7);
    g.lineWidth = 0.8;
    g.stroke();
  }
  g.restore();
}

/** The gold hub the player smacks: a warm glow round it, a domed boss with a stepped rim, a ring of rivets and the
 * linchpin's cap. */
export function paintHub(g: Ctx, gold = '#f0c040'): void {
  g.save();
  g.scale(S, S);
  const r = 26;
  // the glow that marks it out as the thing to hit
  g.fillStyle = rad(g, 0, 0, r * 0.9, 0, 0, r + 11, [
    [0, rgba('#ffe27a', 0.75)],
    [0.5, rgba('#ffd040', 0.35)],
    [1, rgba('#ffc020', 0)],
  ]);
  g.beginPath();
  g.arc(0, 0, r + 11, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(0, 0, r + 2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = rad(g, -8, -9, 1, 0, 0, r, [
    [0, '#fffbe0'],
    [0.3, mix(gold, '#fff2a8', 0.5)],
    [0.7, gold],
    [1, shade(gold, -0.5)],
  ]);
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  // a rim light round its lower right
  softStroke(g, (c) => c.arc(0, 0, r - 1.5, Math.PI * 0.05, Math.PI * 0.7), rgba('#fff8d0', 0.85), 2.2, 0.6);
  // the step down to the dome: dark above, lit below
  softStroke(g, (c) => c.arc(0, 0, 17, Math.PI * 0.95, Math.PI * 1.75), rgba('#5a3a08', 0.55), 2, 0.6);
  softStroke(g, (c) => c.arc(0, 0, 17, Math.PI * 0.05, Math.PI * 0.8), rgba('#fff8d0', 0.8), 1.8, 0.5);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * 21.5;
    const y = Math.sin(a) * 21.5;
    g.fillStyle = rgba('#5a3a08', 0.6);
    g.beginPath();
    g.arc(x + 0.4, y + 0.5, 1.9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff4c0';
    g.beginPath();
    g.arc(x, y, 1.6, 0, Math.PI * 2);
    g.fill();
  }
  // the linchpin's cap
  g.fillStyle = rad(g, -2, -2, 0.5, 0, 0, 8, [
    [0, '#f2c27a'],
    [1, '#5a2e10'],
  ]);
  g.beginPath();
  g.arc(0, 0, 8, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.8;
  g.stroke();
  g.fillStyle = rgba('#ffffff', 0.85);
  g.beginPath();
  g.ellipse(-10, -11, 6.5, 3.2, -0.7, 0, Math.PI * 2);
  g.fill();
  glint(g, -11, -12, 5, 0.9);
  g.restore();
}
