// The event peels' heads (src/art/peelMedal.ts): no frame, the head IS the event, doing what it does on the table, and
// its answer to a smack. Painted in parts once per rig detail (disc units: the head's centre is (60, 60), BARE_K peel
// units a disc unit, the handle's top at y 110), lit from the top left; drawn each frame from those parts, with
// strings, cables, legs, capes and the water's edge drawn live.
//
// - Tip Balloon: tied to the handle's top, its string wound round the handle and its end swaying; it sways and
//   breathes, its coin glints. Smack: it pops (shreds of rubber, a spray of tip coins), a rag of it is left on the
//   knot, and a new one blows up from it.
// - Delivery Drone: on a mast from the handle, rotors a blur over rings of downwash, its parcel swinging on its
//   cables, its light blinking. Smack: it lurches (sparks, a puff from a motor, the light goes red), the parcel
//   swings wide.
// - Pepper Moth: clinging to the handle's top, its wings (past the head's outline) fanning slowly, shedding pepper.
//   Smack: it's knocked about, wings frantic, in a cloud of pepper.
// - Golden Seagull: perched on the handle, wings up, a golden crust in its beak; it leans to look about and flaps to
//   keep its balance. Smack: it jolts and flares its wings, feathers fly, the crust flashes.
// - Pizza Box Chest: a deep pizza box with gold corners sitting on the handle; now and then its lid lifts a crack and
//   gold light leaks out. Smack: it bursts open (rays of gold, tip coins, confetti) and drops shut.
// - Mimic: the same box, darker, that wobbles; its lid creaks open on two eyes and a tongue licks the rim. Smack: it
//   chomps (teeth, tongue, a red flare) and snaps shut.
// - Hero Sighting: the hero's head, masked, a gold star on its brow, its cape and a trail of light streaming behind;
//   it blinks. Smack: caught, the star flares and spins, the hero jolts up.
// - Charybdis: open water turning on the head, its edge heaving and foaming, spray flicked off it, foam spiralling in,
//   the maw breathing; now and then a plank is dragged down. Smack: the maw clamps shut, the water spins and spray
//   flies.

import { ellipse, rgba, rng, roundRect, shade, type Ctx } from './util';
import { INK } from './feetCommon';
import { part, placePart, star, type MedalEmit, type MedalState, type Part, type Parts } from './peelMedal';

export interface EventScene {
  /** Paint the background and parts at px canvas px per disc unit, a part per step. */
  paint(px: number): Generator<void, Parts>;
  init?(s: MedalState): void;
  /** Its pose for the still (a thumbnail). */
  rest?(s: MedalState): void;
  update(s: MedalState, dt: number): void;
  draw(g: Ctx, s: MedalState, P: Parts): void;
  smack(s: MedalState, emit: MedalEmit): void;
}

// ════════════════════════════ painting helpers ════════════════════════════

const TAU = Math.PI * 2;

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** A radial gradient lit from the top left of a body at (x, y), radius r. */
function lit(ctx: Ctx, x: number, y: number, r: number, base: string, hi = 0.45, lo = -0.4): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.06, x, y, r * 1.05);
  g.addColorStop(0, shade(base, hi));
  g.addColorStop(0.62, base);
  g.addColorStop(1, shade(base, lo));
  return g;
}

function ink(ctx: Ctx, lw = 2.2, col = INK): void {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.stroke();
}

function fs(ctx: Ctx, fill: string | CanvasGradient, lw = 2.2): void {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) ink(ctx, lw);
}

/** A soft dab of light or shade (fades to nothing at its edge). */
function dab(ctx: Ctx, x: number, y: number, r: number, col: string, a: number, sy = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

/** A specular highlight: a soft lit ellipse with a brighter core. */
function spec(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = -0.6, a = 0.75): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(0.55, `rgba(255,255,255,${a * 0.55})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}



/** The Lilita font, falling back if it isn't in yet. */
const FONT = "'Lilita One', 'Fredoka', sans-serif";

/** A tip coin: gold, a ring and a lit face. */
function coinPath(ctx: Ctx, x: number, y: number, r: number): void {
  ellipse(ctx, x, y, r, r);
  fs(ctx, lit(ctx, x, y, r, '#ffc93a', 0.55, -0.35), Math.max(1.2, r * 0.18));
  ellipse(ctx, x, y, r * 0.7, r * 0.7);
  ink(ctx, Math.max(0.6, r * 0.08), 'rgba(150,90,10,0.7)');
  ctx.font = `${r * 1.15}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(120,70,8,0.95)';
  ctx.fillText('$', x + r * 0.03, y + r * 0.08);
  spec(ctx, x - r * 0.38, y - r * 0.42, r * 0.28, r * 0.18, -0.6, 0.85);
}

const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** A damped spring on mem[key] (and its velocity mem[key+'v']) towards target. */
function spring(s: MedalState, key: string, target: number, k: number, c: number, dt: number): number {
  const m = s.mem;
  let x = m[key] ?? target;
  let v = m[key + 'v'] ?? 0;
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    v += (-(x - target) * k - v * c) * h;
    x += v * h;
  }
  m[key] = x;
  m[key + 'v'] = v;
  return x;
}

/** Every few seconds: the progress (0–1) of a beat lasting len, or -1 between them. */
function every(s: MedalState, key: string, dt: number, len: number, gap: [number, number]): number {
  const m = s.mem;
  if (m[key] === undefined) m[key] = -0.2 - 0.6 * s.r();
  if (m[key] < 0) {
    m[key] += dt / gap[0];
    if (m[key] >= 0) m[key] = 0;
    return -1;
  }
  m[key] += dt / len;
  if (m[key] >= 1) {
    m[key] = -(1 + (gap[1] - gap[0]) / gap[0] * s.r());
    return -1;
  }
  return m[key];
}


// ════════════════════════════ the Tip Balloon: its parts ════════════════════════════

function paintBalloon(ctx: Ctx): void {
  // the knot and its tie
  ctx.beginPath();
  ctx.moveTo(-4.5, 29);
  ctx.quadraticCurveTo(0, 33, 4.5, 29);
  ctx.lineTo(3, 36);
  ctx.quadraticCurveTo(0, 38, -3, 36);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 29, 0, 37, [[0, '#d83a26'], [1, '#8a1a10']]), 1.8);
  // the skin
  ctx.beginPath();
  ctx.moveTo(0, -31);
  ctx.bezierCurveTo(17, -31, 26, -16, 26, -2);
  ctx.bezierCurveTo(26, 14, 13, 26, 2, 30);
  ctx.lineTo(-2, 30);
  ctx.bezierCurveTo(-13, 26, -26, 14, -26, -2);
  ctx.bezierCurveTo(-26, -16, -17, -31, 0, -31);
  ctx.closePath();
  const g = ctx.createRadialGradient(-9, -13, 1, 0, 0, 33);
  g.addColorStop(0, '#ffb8a8');
  g.addColorStop(0.2, '#ff7a60');
  g.addColorStop(0.62, '#e23e26');
  g.addColorStop(1, '#8e1a0e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // light coming back off the sky on its lower right, and the stretched skin thinning there
  dab(ctx, 15, 17, 16, '#ff9a80', 0.4);
  dab(ctx, -14, 16, 12, '#7a0a04', 0.35);
  ctx.restore();
  ink(ctx, 2.4);
  // the coin printed on it, stretched round the curve
  ctx.save();
  ctx.translate(1, 2);
  ctx.scale(1, 1.06);
  coinPath(ctx, 0, 0, 10);
  ctx.restore();
  // the shine
  spec(ctx, -11, -15, 5.5, 10, -0.5, 0.8);
  spec(ctx, -12.5, -18, 1.8, 3, -0.5, 1);
  spec(ctx, 14, 12, 2.2, 4.5, -0.6, 0.35);
}



// ════════════════════════════ the Delivery Drone: its parts ════════════════════════════


/** The drone's arms reach this far each side (disc units, before it's scaled up). */
const ARM = 31;

function paintDrone(ctx: Ctx): void {
  // arms out to the motors
  ctx.beginPath();
  ctx.moveTo(-ARM, -1);
  ctx.lineTo(ARM, -1);
  ink(ctx, 6.2);
  ctx.beginPath();
  ctx.moveTo(-ARM, -1);
  ctx.lineTo(ARM, -1);
  ctx.strokeStyle = lin(ctx, 0, -3, 0, 2, [[0, '#c8d0da'], [1, '#5a626c']]);
  ctx.lineWidth = 3;
  ctx.stroke();
  // motor pods and masts
  for (const x of [-ARM, ARM]) {
    roundRect(ctx, x - 5, -7, 10, 9, 3);
    fs(ctx, lin(ctx, x - 5, -7, x + 5, 2, [[0, '#d8dee6'], [1, '#4a525c']]), 1.6);
    ctx.beginPath();
    ctx.moveTo(x, -7);
    ctx.lineTo(x, -11);
    ink(ctx, 2.4);
    ellipse(ctx, x, -11, 2.2, 1.4);
    fs(ctx, '#3a3e46', 0);
  }
  // the body: a rounded shell
  roundRect(ctx, -17, -9, 34, 17, 7);
  fs(ctx, lin(ctx, 0, -9, 0, 8, [[0, '#eef2f6'], [0.45, '#b8c2cc'], [1, '#5e6670']]), 2.2);
  // a seam and the camera
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.quadraticCurveTo(0, 5, 14, 2);
  ink(ctx, 0.8, 'rgba(40,44,52,0.6)');
  ellipse(ctx, 0, 6.5, 4.5, 3.2);
  fs(ctx, lit(ctx, 0, 6.5, 4.5, '#2a3440', 0.4, -0.3), 1.4);
  spec(ctx, -1.4, 5.5, 1.4, 0.9, 0, 0.9);
  // the light's housing
  ellipse(ctx, 0, -2.5, 3.6, 3.6);
  fs(ctx, '#1a2028', 1.2);
  spec(ctx, -7, -5.5, 6, 1.8, 0, 0.6);
}

function paintRotor(ctx: Ctx, i: number): void {
  // a blur of blades: a translucent disc, streaks where the blades are, a lit rim
  ellipse(ctx, 0, 0, 16, 4);
  ctx.fillStyle = 'rgba(220,232,244,0.28)';
  ctx.fill();
  ink(ctx, 0.8, 'rgba(40,48,60,0.45)');
  for (let k = 0; k < 2; k++) {
    const a = i * 1.05 + k * Math.PI;
    ctx.save();
    ctx.scale(1, 0.25);
    ctx.beginPath();
    ctx.arc(0, 0, 15.5, a - 0.5, a + 0.06);
    ctx.strokeStyle = 'rgba(40,46,56,0.55)';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 15.5, a - 1.1, a - 0.5);
    ctx.strokeStyle = 'rgba(40,46,56,0.18)';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }
  ellipse(ctx, -5, -1.3, 7, 1.2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
}

function paintParcel(ctx: Ctx): void {
  // hanging from its top centre (0, 0): the box below the cable's ring
  roundRect(ctx, -15, 8, 30, 21, 2.5);
  fs(ctx, lin(ctx, -15, 8, 15, 29, [[0, '#fff6e4'], [0.5, '#ecd6ac'], [1, '#c4a676']]), 2.2);
  // its top face, lit
  ctx.beginPath();
  ctx.moveTo(-15, 10);
  ctx.lineTo(15, 10);
  ink(ctx, 0.9, 'rgba(120,90,50,0.5)');
  // tape and the green cross
  ctx.fillStyle = 'rgba(200,170,110,0.55)';
  ctx.fillRect(-2, 8.6, 4, 20);
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.lineTo(0, 25);
  ctx.moveTo(-6, 19);
  ctx.lineTo(6, 19);
  ink(ctx, 4.4, '#2a7a1e');
  ctx.beginPath();
  ctx.moveTo(-0.5, 13.5);
  ctx.lineTo(-0.5, 18);
  ctx.moveTo(-5.5, 18.5);
  ctx.lineTo(-1.5, 18.5);
  ink(ctx, 1.2, '#7ad86a');
  spec(ctx, -9, 12, 5, 1.6, 0, 0.55);
  // the ring the cables meet at
  ellipse(ctx, 0, 1.5, 2.4, 2.4);
  ink(ctx, 1.4, '#3a3e46');
}


// ════════════════════════════ the Pepper Moth: its parts ════════════════════════════

function paintMothWing(ctx: Ctx): void {
  // the right wing (the left is its mirror), from the body at (0, 0): forewing red as a pepper, hindwing orange
  ctx.beginPath();
  ctx.moveTo(1, 4);
  ctx.bezierCurveTo(12, 14, 20, 24, 13, 29);
  ctx.bezierCurveTo(7, 32, 2, 22, 0.5, 8);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 4, 10, 30, [[0, '#ffc23a'], [1, '#e8781a']]), 1.8);
  ellipse(ctx, 9, 21, 3.2, 3.2);
  fs(ctx, '#3a1a0a', 0.8);
  ellipse(ctx, 8.4, 20.4, 1.1, 1.1);
  fs(ctx, '#fff0b0', 0);
  ctx.beginPath();
  ctx.moveTo(1, -2);
  ctx.bezierCurveTo(12, -20, 30, -20, 31, -6);
  ctx.bezierCurveTo(31, 3, 18, 7, 1.5, 4);
  ctx.closePath();
  const g = lin(ctx, 0, -18, 10, 6, [[0, '#ff7a4a'], [0.5, '#e03a1e'], [1, '#a81e10']]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // veins, a pale band, pepper flecks
  ctx.strokeStyle = 'rgba(90,10,4,0.45)';
  ctx.lineWidth = 0.7;
  for (const [ex, ey] of [[28, -12], [26, -2], [18, 4]] as const) {
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.quadraticCurveTo(ex * 0.5, ey * 0.6 - 4, ex, ey);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(18, -16);
  ctx.quadraticCurveTo(24, -6, 18, 5);
  ctx.strokeStyle = 'rgba(255,214,140,0.55)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  const r = rng(7);
  for (let i = 0; i < 16; i++) {
    ellipse(ctx, 4 + r() * 26, -16 + r() * 20, 0.7 + r() * 0.5, 0.6 + r() * 0.4, r() * 3);
    ctx.fillStyle = 'rgba(30,8,4,0.7)';
    ctx.fill();
  }
  dab(ctx, 10, -10, 9, '#ffffff', 0.25);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(1, -2);
  ctx.bezierCurveTo(12, -20, 30, -20, 31, -6);
  ctx.bezierCurveTo(31, 3, 18, 7, 1.5, 4);
  ctx.closePath();
  ink(ctx, 1.8);
  // the eye spot
  ellipse(ctx, 20, -8, 3.6, 3.6);
  fs(ctx, '#ffe680', 1);
  ellipse(ctx, 20.4, -7.6, 1.6, 1.6);
  fs(ctx, '#3a1a0a', 0);
}

function paintMothBody(ctx: Ctx): void {
  // antennae, feathery
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * 1.5, -11);
    ctx.quadraticCurveTo(sx * 5, -20, sx * 10, -22);
    ink(ctx, 1.1, '#3a2014');
    for (let k = 0; k < 4; k++) {
      const u = 0.35 + k * 0.17;
      const ax = sx * (1.5 + 8.5 * u);
      const ay = -11 - 11 * u;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + sx * 2, ay + 1.4);
      ink(ctx, 0.6, 'rgba(58,32,20,0.8)');
    }
  }
  // the fuzzy body
  ellipse(ctx, 0, 2, 4.2, 12);
  fs(ctx, lit(ctx, 0, 2, 12, '#6a3a22', 0.4, -0.45), 1.6);
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-3.6, 1 + k * 3.2);
    ctx.quadraticCurveTo(0, 2.4 + k * 3.2, 3.6, 1 + k * 3.2);
    ink(ctx, 0.6, 'rgba(30,14,6,0.6)');
  }
  ellipse(ctx, 0, -10, 3.8, 3.4);
  fs(ctx, lit(ctx, 0, -10, 3.8, '#7a4a2a', 0.5, -0.4), 1.4);
  ellipse(ctx, -1.6, -10.8, 1, 1);
  fs(ctx, '#120804', 0);
  ellipse(ctx, 1.6, -10.8, 1, 1);
  fs(ctx, '#120804', 0);
  spec(ctx, -1.4, -3, 1.2, 4, 0, 0.45);
}




// ════════════════════════════ the Golden Seagull: its parts ════════════════════════════

function paintGullWing(ctx: Ctx, far: boolean): void {
  // from the shoulder (0, 0) out to the right: a long tapering wing, grey on top, a black tip
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.bezierCurveTo(10, -12, 26, -16, 40, -12);
  ctx.bezierCurveTo(30, -7, 18, -1, 4, 5);
  ctx.closePath();
  const base = far ? '#b4bec8' : '#e6ecf2';
  fs(ctx, lin(ctx, 0, -14, 0, 5, [[0, shade(base, far ? 0.1 : 0.3)], [1, shade(base, -0.25)]]), 1.8);
  ctx.save();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(29, -20);
  ctx.lineTo(44, -14);
  ctx.lineTo(30, 0);
  ctx.closePath();
  ctx.fillStyle = far ? '#24282e' : '#33373e';
  ctx.fill();
  // the feathers' edges along the trailing edge
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(10 + k * 5, -3 - k * 1.6);
    ctx.lineTo(13 + k * 5, 1 - k * 2);
    ctx.strokeStyle = 'rgba(70,80,96,0.45)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  if (!far) dab(ctx, 14, -10, 10, '#ffffff', 0.4);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.bezierCurveTo(10, -12, 26, -16, 40, -12);
  ctx.bezierCurveTo(30, -7, 18, -1, 4, 5);
  ctx.closePath();
  ink(ctx, 1.8);
}

function paintGullBody(ctx: Ctx): void {
  // tail
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(-22, -4);
  ctx.lineTo(-21, 3);
  ctx.lineTo(-11, 4);
  ctx.closePath();
  fs(ctx, lin(ctx, -22, 0, -11, 0, [[0, '#30343a'], [0.4, '#c8d0d8'], [1, '#eef2f6']]), 1.6);
  // body and head
  ellipse(ctx, 0, 1, 14, 8.5);
  fs(ctx, lit(ctx, 0, 1, 14, '#f4f6f8', 0.3, -0.28), 2);
  ellipse(ctx, 12, -5, 7, 6.5);
  fs(ctx, lit(ctx, 12, -5, 7, '#ffffff', 0.2, -0.2), 2);
  // the beak, the golden crust held in it
  ctx.beginPath();
  ctx.moveTo(17.5, -5.5);
  ctx.lineTo(26, -3.6);
  ctx.lineTo(17.5, -1.4);
  ctx.closePath();
  fs(ctx, lin(ctx, 18, -6, 18, -1, [[0, '#ffc85a'], [1, '#e88a1a']]), 1.3);
  ellipse(ctx, 25, -3.4, 0.9, 0.9);
  fs(ctx, '#d83a1a', 0);
  // a wedge of golden crust: its point in the beak, its puffed rim out beyond
  ctx.beginPath();
  ctx.moveTo(23, -3.4);
  ctx.lineTo(25.5, 12.5);
  ctx.quadraticCurveTo(32, 13.6, 38, 8);
  ctx.closePath();
  fs(ctx, lit(ctx, 29, 4, 10, '#ffd23f', 0.6, -0.3), 1.4);
  // its pepperoni, and the cheese's sheen
  for (const [cx, cy, r] of [[28.5, 5.5, 2], [31.5, 9.6, 1.6], [26.6, 1.2, 1.2]] as const) {
    ellipse(ctx, cx, cy, r, r * 0.9);
    fs(ctx, lit(ctx, cx, cy, r, '#d8322e', 0.4, -0.35), 0.7);
  }
  // the crust along its far edge, golden brown, puffed
  ctx.beginPath();
  ctx.moveTo(25.2, 12.6);
  ctx.quadraticCurveTo(32, 14.2, 38.2, 7.8);
  ink(ctx, 5.4, INK);
  ctx.beginPath();
  ctx.moveTo(25.2, 12.6);
  ctx.quadraticCurveTo(32, 14.2, 38.2, 7.8);
  ink(ctx, 3.6, '#d08a2a');
  ctx.beginPath();
  ctx.moveTo(26.4, 12.2);
  ctx.quadraticCurveTo(32, 13.2, 36.6, 8.6);
  ink(ctx, 1, '#ffe2a0');
  spec(ctx, 27, 2, 1.2, 2.6, 0.2, 0.9);
  // the eye
  ellipse(ctx, 14, -6.5, 1.5, 1.5);
  fs(ctx, '#1a1208', 0);
  ellipse(ctx, 13.6, -7, 0.5, 0.5);
  fs(ctx, '#ffffff', 0);
  ctx.beginPath();
  ctx.moveTo(12, -8.6);
  ctx.quadraticCurveTo(14, -9.4, 16, -8.4);
  ink(ctx, 0.7, 'rgba(90,96,110,0.7)');
  // shade under the belly, a lit back
  ctx.save();
  ellipse(ctx, 0, 1, 14, 8.5);
  ctx.clip();
  dab(ctx, 3, 9, 14, '#6a7484', 0.55, 0.55);
  dab(ctx, -5, -5, 8, '#ffffff', 0.6);
  ctx.restore();
}




// ════════════════════════════ the Pizza Box Chest and the Mimic: its parts ════════════════════════════


/** The box (in its own units, before it's scaled onto the head): a deep pizza box, a treasure chest. */
const BW = 66;
const BH = 44;

/** The box's body: anchor at its bottom centre. */
function paintBoxBody(ctx: Ctx, dark: boolean): void {
  roundRect(ctx, -BW / 2, -BH, BW, BH, 3);
  fs(ctx, lin(ctx, 0, -BH, 0, 0, dark ? [[0, '#d2b88e'], [1, '#8a6a44']] : [[0, '#fbefd6'], [1, '#d4b98a']]), 2.4);
  ctx.save();
  roundRect(ctx, -BW / 2, -BH, BW, BH, 3);
  ctx.clip();
  // corrugation, the red stripe, a lit top edge, wear
  for (let x = -BW / 2 + 6; x < BW / 2; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, -BH + 2);
    ctx.lineTo(x - 3, -2);
    ctx.strokeStyle = dark ? 'rgba(70,46,20,0.35)' : 'rgba(160,120,70,0.3)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.fillStyle = dark ? '#8a2418' : '#e0402a';
  ctx.fillRect(-BW / 2, -BH * 0.52, BW, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-BW / 2, -BH * 0.52, BW, 1.2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-BW / 2, -BH, BW, 1.6);
  const g = lin(ctx, -BW / 2, 0, BW / 2, 0, [[0, 'rgba(255,255,255,0.12)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(40,20,6,0.25)']]);
  ctx.fillStyle = g;
  ctx.fillRect(-BW / 2, -BH, BW, BH);
  if (dark) {
    const r = rng(41);
    for (let i = 0; i < 5; i++) {
      dab(ctx, -BW / 2 + r() * BW, -BH + r() * BH, 3 + r() * 4, '#4a2a10', 0.35);
    }
  }
  ctx.restore();
  // a treasure chest's metal: corner brackets and a hasp (gold on the chest, old iron on the mimic)
  const metal = dark ? '#7a6a5a' : '#ffc93a';
  for (const sx of [-1, 1])
    for (const top of [true, false]) {
      const x = sx * (BW / 2);
      const y = top ? -BH : 0;
      ctx.beginPath();
      ctx.moveTo(x, y + (top ? 9 : -9));
      ctx.lineTo(x, y);
      ctx.lineTo(x - sx * 9, y);
      ctx.lineTo(x - sx * 9, y + (top ? 3.4 : -3.4));
      ctx.lineTo(x - sx * 3.4, y + (top ? 3.4 : -3.4));
      ctx.lineTo(x - sx * 3.4, y + (top ? 9 : -9));
      ctx.closePath();
      fs(ctx, lin(ctx, x - sx * 9, y - 4, x, y + 4, [[0, shade(metal, 0.45)], [1, shade(metal, -0.35)]]), 1.4);
      ellipse(ctx, x - sx * 2, y + (top ? 2 : -2), 0.9, 0.9);
      fs(ctx, shade(metal, -0.55), 0);
    }
  roundRect(ctx, -4.5, -BH, 9, 11, 2);
  fs(ctx, lin(ctx, -4.5, -BH, 4.5, -BH + 11, [[0, shade(metal, 0.45)], [1, shade(metal, -0.35)]]), 1.4);
  ellipse(ctx, 0, -BH + 6.5, 1.6, 2);
  fs(ctx, '#1a0e06', 0);
  spec(ctx, -2, -BH + 2.6, 1.6, 0.8, 0, 0.8);
  if (dark) {
    // a torn flap on its corner, and a scrape
    ctx.beginPath();
    ctx.moveTo(BW / 2 - 18, -BH);
    ctx.lineTo(BW / 2 - 12, -BH + 7);
    ctx.lineTo(BW / 2 - 8, -BH + 2);
    ink(ctx, 1, 'rgba(40,20,6,0.7)');
  }
}

/** The lid: anchor at its hinge (the box's top back-left corner); it reaches right along the top. */
function paintLid(ctx: Ctx, dark: boolean): void {
  roundRect(ctx, -1, -9, BW + 2, 9.5, 2.5);
  fs(ctx, lin(ctx, 0, -9, 0, 0, dark ? [[0, '#c84a30'], [1, '#6a140c']] : [[0, '#ff7a5a'], [1, '#c4281a']]), 2.4);
  ctx.font = `7.2px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = dark ? 'rgba(255,220,200,0.7)' : '#fff4e0';
  ctx.fillText('PIZZA', BW / 2, -4.1);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(1.5, -8, BW - 3, 1.2);
}

/** The treasure inside the chest: gold to the brim, coins catching the light. */
function paintHoard(ctx: Ctx): void {
  ellipse(ctx, 0, 0, BW / 2 - 3, 5);
  fs(ctx, lin(ctx, 0, -5, 0, 5, [[0, '#fff0a0'], [0.5, '#ffcc33'], [1, '#b8780a']]), 1.6);
  const r = rng(13);
  for (let i = 0; i < 12; i++) {
    const x = -30 + r() * 60;
    const y = -2.5 + r() * 4;
    ellipse(ctx, x, y, 3.2, 1.6);
    fs(ctx, lit(ctx, x, y, 3, '#ffd23f', 0.5, -0.3), 0.6);
  }
  spec(ctx, -12, -1.5, 6, 1.4, 0, 0.8);
}

/** The mimic's maw: a dark red throat and the lower teeth along the rim (anchor at the box's top centre). */
function paintMaw(ctx: Ctx): void {
  ellipse(ctx, 0, 0, BW / 2 - 3, 6);
  const g = ctx.createRadialGradient(0, 2, 0, 0, 0, BW / 2);
  g.addColorStop(0, '#0a0204');
  g.addColorStop(0.6, '#4a0a14');
  g.addColorStop(1, '#9a2030');
  fs(ctx, g, 1.6);
  const r = rng(77);
  for (let x = -BW / 2 + 9; x < BW / 2 - 7; x += 11.5) {
    const h = 6 + r() * 3;
    const lean = (r() - 0.5) * 2;
    ctx.beginPath();
    ctx.moveTo(x - 4.2, 2);
    ctx.quadraticCurveTo(x - 3, -h * 0.5, x + lean, -h);
    ctx.quadraticCurveTo(x + 3, -h * 0.5, x + 4.2, 2);
    ctx.closePath();
    fs(ctx, lin(ctx, x - 4, -h, x + 4, 2, [[0, '#ffffff'], [0.5, '#f4ead4'], [1, '#c8b48a']]), 1.1);
  }
}

/** The teeth along the lid's underside (lid's frame: hanging below its hinge line). */
function paintLidTeeth(ctx: Ctx): void {
  // the gum they grow from, wet and dark
  roundRect(ctx, 2, -1, BW - 4, 4, 2);
  fs(ctx, lin(ctx, 0, -1, 0, 3, [[0, '#c83a4a'], [1, '#5a0a16']]), 1.1);
  const r = rng(78);
  for (let x = 9; x < BW - 6; x += 12) {
    const h = 8 + r() * 3.5;
    const lean = (r() - 0.5) * 2;
    ctx.beginPath();
    ctx.moveTo(x - 4.6, -0.5);
    ctx.quadraticCurveTo(x - 3.2, h * 0.5, x + lean, h);
    ctx.quadraticCurveTo(x + 3.2, h * 0.5, x + 4.6, -0.5);
    ctx.closePath();
    fs(ctx, lin(ctx, x - 4, 0, x + 4, h, [[0, '#c8b48a'], [0.5, '#f4ead4'], [1, '#ffffff']]), 1.1);
  }
}

function paintTongue(ctx: Ctx): void {
  // from the mouth (0, 0) down over the front of the box
  ctx.beginPath();
  ctx.moveTo(-6, -1);
  ctx.bezierCurveTo(-8, 8, -7, 16, 0, 18);
  ctx.bezierCurveTo(7, 16, 8, 8, 6, -1);
  ctx.closePath();
  fs(ctx, lin(ctx, -6, 0, 6, 18, [[0, '#ff8a9a'], [0.5, '#e8445a'], [1, '#a81a2e']]), 1.6);
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, 12);
  ink(ctx, 0.9, 'rgba(120,10,24,0.7)');
  spec(ctx, -2.5, 5, 1.2, 3, 0, 0.7);
}






// ════════════════════════════ the Hero Sighting: its parts ════════════════════════════


function paintBigStar(ctx: Ctx): void {
  const pts = (r: number, inner: number) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * inner : r;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  };
  pts(15, 0.46);
  fs(ctx, lit(ctx, 0, 0, 15, '#ffd23f', 0.6, -0.35), 2);
  // a bevel: each point's lit and shaded halves
  ctx.save();
  pts(15, 0.46);
  ctx.clip();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
    ctx.lineTo(Math.cos(a + 0.63) * 8, Math.sin(a + 0.63) * 8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(160,90,0,0.28)';
    ctx.fill();
  }
  ctx.restore();
  spec(ctx, -4, -6, 3, 1.6, -0.6, 0.85);
}





// ════════════════════════════ Charybdis: its parts ════════════════════════════

function paintWhirl(ctx: Ctx): void {
  const g = ctx.createRadialGradient(60, 60, 0, 60, 60, 86);
  g.addColorStop(0, '#04141c');
  g.addColorStop(0.22, '#0a3446');
  g.addColorStop(0.5, '#16627e');
  g.addColorStop(0.75, '#2a90ac');
  g.addColorStop(1, '#5ac4dc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 120, 120);
  // the bowl's light side (top left) and shade
  dab(ctx, 34, 30, 40, '#bff0ff', 0.22);
  dab(ctx, 86, 92, 40, '#021018', 0.25);
}

function paintArms(ctx: Ctx, n: number, r0: number, r1: number, turns: number, w: number, a: number): void {
  ctx.lineCap = 'round';
  for (let arm = 0; arm < n; arm++) {
    ctx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.02) {
      const ang = arm * (TAU / n) + t * TAU * turns;
      const rr = r0 + t * (r1 - r0);
      const x = Math.cos(ang) * rr;
      const y = Math.sin(ang) * rr;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(2,20,30,0.35)';
    ctx.lineWidth = w * 2.2;
    ctx.stroke();
    ctx.strokeStyle = `rgba(232,251,255,${a})`;
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.6})`;
    ctx.lineWidth = w * 0.35;
    ctx.stroke();
  }
}

function paintMaw2(ctx: Ctx): void {
  ellipse(ctx, 0, 0, 18, 18);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  g.addColorStop(0, '#000000');
  g.addColorStop(0.65, '#2a0612');
  g.addColorStop(1, '#8a1a2a');
  fs(ctx, g, 2);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.2) * 17, Math.sin(a - 0.2) * 17);
    ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
    ctx.lineTo(Math.cos(a + 0.2) * 17, Math.sin(a + 0.2) * 17);
    ctx.closePath();
    fs(ctx, lin(ctx, Math.cos(a) * 17, Math.sin(a) * 17, Math.cos(a) * 9, Math.sin(a) * 9, [[0, '#e8dcc4'], [1, '#ffffff']]), 0.9);
  }
  // the rim of wet flesh, lit on its top left
  ellipse(ctx, 0, 0, 18.5, 18.5);
  ctx.strokeStyle = lin(ctx, -18, -18, 18, 18, [[0, 'rgba(255,170,180,0.8)'], [0.5, 'rgba(180,40,60,0.2)'], [1, 'rgba(60,0,10,0.6)']]);
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

function paintPlank(ctx: Ctx): void {
  roundRect(ctx, -7, -2.2, 14, 4.4, 1.2);
  fs(ctx, lin(ctx, 0, -2.2, 0, 2.2, [[0, '#d8a060'], [1, '#7a4a20']]), 1);
  ctx.beginPath();
  ctx.moveTo(-5, -0.4);
  ctx.lineTo(4, -0.2);
  ink(ctx, 0.5, 'rgba(90,50,20,0.6)');
}


// ════════════════════════════ the head: where the handle is ════════════════════════════

/** The handle's top (disc units: the head's centre is (60, 60), BARE_K peel units a disc unit), its half width, and
 *  the neck (where the head flexes). */
const HT = 110;
const HWD = 9.7;

/** A soft cast shadow on the handle's top under whatever sits on it. */
function seat(g: Ctx, w: number, a = 0.35): void {
  g.save();
  g.beginPath();
  g.rect(60 - HWD, HT - 1, HWD * 2, 12);
  g.clip();
  const sg = g.createLinearGradient(0, HT - 1, 0, HT + 10);
  sg.addColorStop(0, `rgba(30,12,2,${a})`);
  sg.addColorStop(1, 'rgba(30,12,2,0)');
  g.fillStyle = sg;
  g.fillRect(60 - w, HT - 1, w * 2, 12);
  g.restore();
}

/** Two strokes along the current path: ink, and a fine lit line down it. */
function cord(g: Ctx, w: number, col: string, lit: string): void {
  g.strokeStyle = col;
  g.lineWidth = w;
  g.stroke();
  g.strokeStyle = lit;
  g.lineWidth = w * 0.35;
  g.stroke();
}

// ════════════════════════════ the Tip Balloon ════════════════════════════

/** The balloon's size on the head, and where it's tied (the handle's top). */
const BB = 1.55;
const KNOT = { x: 60, y: 111 };
/** The balloon's middle (disc units), at rest. */
const BAL_C = { x: 60, y: KNOT.y - 36 * BB };

/** What's left on the handle when it pops: the knot and a rag of rubber. */
function paintStub(ctx: Ctx): void {
  for (const [a, l] of [[-2.4, 7], [-1.1, 6], [-0.5, 8]] as const) {
    ctx.beginPath();
    ctx.moveTo(-2, 29.5);
    ctx.quadraticCurveTo(Math.cos(a) * l * 0.6 - 1, 29 + Math.sin(a) * l * 0.4, Math.cos(a) * l, 29 + Math.sin(a) * l * 0.7);
    ctx.lineTo(Math.cos(a) * l + 2.2, 29.6 + Math.sin(a) * l * 0.5);
    ctx.closePath();
    fs(ctx, '#d8402a', 1.2);
  }
  ctx.beginPath();
  ctx.moveTo(-4.5, 29);
  ctx.quadraticCurveTo(0, 33, 4.5, 29);
  ctx.lineTo(3, 36);
  ctx.quadraticCurveTo(0, 38, -3, 36);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, 29, 0, 37, [[0, '#d83a26'], [1, '#8a1a10']]), 1.8);
}

/** The string from the knot, wound five times down the handle, its end loose and swaying. */
function balloonString(g: Ctx, t: number): void {
  g.beginPath();
  g.moveTo(KNOT.x + 0.5, KNOT.y + 1);
  g.quadraticCurveTo(KNOT.x - 4, KNOT.y + 4, 60 - HWD, 116);
  for (let i = 0; i < 5; i++) {
    const y = 116 + i * 7;
    g.moveTo(60 - HWD, y);
    g.quadraticCurveTo(60, y + 6.5, 60 + HWD, y + 3.5);
  }
  const ey = 116 + 4 * 7 + 3.5;
  const sw = Math.sin(t * 1.7) * 2.6;
  g.moveTo(60 + HWD, ey);
  g.bezierCurveTo(60 + HWD + 4, ey + 3, 60 + HWD + 1 + sw, ey + 7, 60 + HWD + 4 + sw * 1.6, ey + 12);
  cord(g, 1.5, 'rgba(70,48,36,0.95)', 'rgba(255,246,230,0.6)');
}

const balloon: EventScene = {
  *paint(px) {
    const q = px * BB;
    const body = part(q, -30, -35, 60, 76, paintBalloon);
    yield;
    const stub = part(q, -12, 20, 24, 20, paintStub);
    return { body, stub };
  },
  update(s, dt) {
    s.mem.pop = (s.mem.pop ?? 9) + dt;
  },
  draw(g, s, P) {
    const t = s.t;
    // (seconds since it last popped)
    const sm = s.still ? 9 : s.mem.pop ?? 9;
    // swaying on the breeze about its knot, the skin breathing
    const rot = s.still ? -0.035 : 0.075 * Math.sin(t * 0.9 + 0.4) + 0.03 * Math.sin(t * 2.1);
    const sy = s.still ? 1 : 1 + 0.025 * Math.cos(t * 1.3);
    // popped: gone, then a new one blowing up from the knot
    const gone = sm < 0.2;
    const grow = sm < 0.2 ? 0 : sm < 0.7 ? (sm - 0.2) / 0.5 : 1;
    const sc = grow >= 1 ? 1 : smooth(grow) * (1 + 0.14 * Math.sin(grow * Math.PI));
    balloonString(g, t);
    if (gone || sc < 0.45) {
      g.save();
      g.translate(KNOT.x, KNOT.y);
      g.scale(BB, BB);
      placePart(g, P.stub, 0, -36);
      g.restore();
    }
    seat(g, 16, 0.3);
    if (!gone && sc > 0.02) {
      g.save();
      g.translate(KNOT.x, KNOT.y);
      g.rotate(rot);
      g.scale(BB * sc * (2 - sy), BB * sc * sy);
      placePart(g, P.body, 0, -36);
      g.restore();
      // the coin's glint now and then
      const gp = (t * 0.29) % 1;
      if (gp < 0.1 && sc >= 1 && !s.still) star(g, BAL_C.x - 9, BAL_C.y - 3, 9 * Math.sin((gp / 0.1) * Math.PI), Math.sin((gp / 0.1) * Math.PI));
    }
    // the pop: a red puff where the skin was, then a ring of light running out
    if (sm < 0.28) {
      const { x: bx, y: by } = BAL_C;
      const u = sm / 0.28;
      const rr = 24 + u * 62;
      const pg = g.createRadialGradient(bx, by, 0, bx, by, 46 * (0.6 + u));
      pg.addColorStop(0, `rgba(255,150,110,${(0.45 * (1 - u)).toFixed(3)})`);
      pg.addColorStop(0.5, `rgba(255,80,50,${(0.25 * (1 - u)).toFixed(3)})`);
      pg.addColorStop(1, 'rgba(255,60,40,0)');
      g.fillStyle = pg;
      g.fillRect(bx - 76, by - 76, 152, 152);
      g.save();
      g.globalCompositeOperation = 'lighter';
      const rg = g.createRadialGradient(bx, by, rr * 0.45, bx, by, rr);
      rg.addColorStop(0, 'rgba(255,220,200,0)');
      rg.addColorStop(0.72, `rgba(255,246,230,${(0.95 * (1 - u)).toFixed(3)})`);
      rg.addColorStop(1, 'rgba(255,236,220,0)');
      g.fillStyle = rg;
      g.fillRect(bx - rr, by - rr, rr * 2, rr * 2);
      g.restore();
    }
  },
  smack(s, emit) {
    const { x: bx, y: by } = BAL_C;
    const m = s.menu ? 0.6 : 1;
    // a smack while it's still blowing up again only jolts it (fast clicking in play doesn't keep it popped)
    if ((s.mem.pop ?? 9) < 0.7) {
      s.shake(1.4);
      return;
    }
    s.mem.pop = 0;
    s.flash('#fff0e6', 0.3, 0.3);
    s.shake(1.2);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + s.r() * 0.6;
      const sp = (140 + s.r() * 120) * m;
      emit('shred', bx + Math.cos(a) * 30, by + Math.sin(a) * 36, Math.cos(a) * sp, Math.sin(a) * sp - 40, 14 + s.r() * 4, 11, 0.45 + s.r() * 0.25, { grav: 260, drag: 1.4, spin: (s.r() - 0.5) * 18 });
    }
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 1.8;
      const sp = (150 + s.r() * 120) * m;
      emit('coin', bx + (s.r() - 0.5) * 16, by, Math.cos(a) * sp, Math.sin(a) * sp, 13 + s.r() * 3, 13, 0.6 + s.r() * 0.25, { grav: 520, spin: (s.r() - 0.5) * 10 });
    }
    for (let i = 0; i < 8; i++) {
      const a = s.r() * TAU;
      s.dots.spawn('spark', bx + Math.cos(a) * 16, by + Math.sin(a) * 18, Math.cos(a) * 80, Math.sin(a) * 80, 10, 3, 0.35, { drag: 3, add: true });
    }
  },
};

// ════════════════════════════ the Delivery Drone ════════════════════════════

/** The drone's size on the head (its rotors reach just past the head's sides), and where it hovers. */
const D2 = 1.5;
const DRONE_Y = 36;

/** The mast it's mounted on, from the handle's top up to its belly. */
function mast(g: Ctx, bx: number, by: number): void {
  g.beginPath();
  g.moveTo(60, HT + 3);
  g.lineTo(bx, by);
  g.lineCap = 'butt';
  g.strokeStyle = INK;
  g.lineWidth = 7.6;
  g.stroke();
  const mg = g.createLinearGradient(56, 0, 64, 0);
  mg.addColorStop(0, '#d8dee6');
  mg.addColorStop(0.45, '#9aa4b0');
  mg.addColorStop(1, '#4a525c');
  g.strokeStyle = mg;
  g.lineWidth = 4.4;
  g.stroke();
  g.lineCap = 'round';
  // a collar where it meets the handle
  roundRect(g, 60 - HWD - 1, HT - 1, HWD * 2 + 2, 6, 2);
  fs(g, lin(g, 50, HT, 70, HT, [[0, '#c8d0da'], [0.5, '#7a8490'], [1, '#3a424c']]), 1.6);
}

const drone: EventScene = {
  *paint(px) {
    const q = px * D2;
    const body = part(q, -ARM - 8, -16, ARM * 2 + 16, 28, paintDrone);
    yield;
    const rotors = [0, 1, 2].map((i) => part(q, -19, -6, 38, 12, (ctx) => paintRotor(ctx, i)));
    yield;
    const parcel = part(q, -18, -2, 36, 34, paintParcel);
    return { body, parcel, r0: rotors[0], r1: rotors[1], r2: rotors[2] };
  },
  update(s, dt) {
    const m = s.mem;
    // the parcel on its cables: a pendulum, pushed by the drone's drift
    const ax = -0.8 * 4 * Math.sin(s.t * 0.6);
    const L = 16;
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    let th = m.th ?? 0;
    let w = m.thv ?? 0;
    for (let i = 0; i < n; i++) {
      w += (-(180 / L) * Math.sin(th) - 1.6 * w - ax / L) * h;
      th += w * h;
    }
    m.th = th;
    m.thv = w;
    spring(s, 'tilt', 0, 160, 9, dt);
    spring(s, 'dip', 0, 120, 10, dt);
  },
  draw(g, s, P) {
    const t = s.t;
    const m = s.mem;
    const x = 60 + (s.still ? 0 : 1.4 * Math.sin(t * 0.6));
    const y = DRONE_Y + (s.still ? 0 : 1.4 * Math.sin(t * 2.3)) + (m.dip ?? 0) * 0.6;
    const rot = (s.still ? 0 : 0.045 * Math.sin(t * 0.6 + 1.2)) + (m.tilt ?? 0);
    const th = s.still ? 0.12 : m.th ?? 0;
    mast(g, x - Math.sin(rot) * 7 * D2, y + Math.cos(rot) * 7 * D2);
    seat(g, 14, 0.25);
    // the downwash under the rotors: rings of air running down
    if (!s.still)
      for (const sx of [-1, 1])
        for (let k = 0; k < 3; k++) {
          const u = (t * 1.8 + k / 3) % 1;
          const rx = x + sx * ARM * D2;
          const ry = y - 11 * D2 + 8 + u * 30;
          ellipse(g, rx, ry, 16 + u * 10, 3 + u * 2);
          g.strokeStyle = `rgba(226,240,252,${(0.32 * (1 - u) * Math.min(1, u * 5)).toFixed(3)})`;
          g.lineWidth = 1.3;
          g.stroke();
        }
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(D2, D2);
    // the parcel hangs from under the body on its two cables
    const hx = Math.sin(th) * 16;
    const hy = 9 + Math.cos(th) * 16;
    g.beginPath();
    g.moveTo(-7, 6);
    g.lineTo(hx - 0.5, hy + 0.5);
    g.moveTo(7, 6);
    g.lineTo(hx + 0.5, hy + 0.5);
    g.strokeStyle = INK;
    g.lineWidth = 1.5;
    g.stroke();
    g.strokeStyle = 'rgba(210,214,220,0.6)';
    g.lineWidth = 0.5;
    g.stroke();
    placePart(g, P.parcel, hx, hy, th);
    placePart(g, P.body, 0, 0);
    // rotors a blur (faster after a knock)
    const spin = 30 * (1 + 1.5 * s.hit(0.8));
    const f = Math.floor(t * spin) % 3;
    const rp = [P.r0, P.r1, P.r2];
    placePart(g, rp[f], -ARM, -11);
    placePart(g, rp[(f + 1) % 3], ARM, -11);
    // its light: a slow cyan blink, red when knocked
    const red = s.hit(0.9);
    const bl = s.still ? 0.8 : 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 4.2)), 6);
    const col = red > 0.05 ? '#ff4a3a' : '#5ff4e6';
    const a = Math.max(bl, red);
    const lg = g.createRadialGradient(0, -2.5, 0, 0, -2.5, 8);
    lg.addColorStop(0, rgba('#ffffff', a));
    lg.addColorStop(0.3, rgba(col, a * 0.9));
    lg.addColorStop(1, rgba(col, 0));
    g.fillStyle = lg;
    g.fillRect(-8, -10.5, 16, 16);
    g.restore();
  },
  smack(s, emit) {
    const m = s.mem;
    const dir = s.r() < 0.5 ? -1 : 1;
    m.tiltv = (m.tiltv ?? 0) + dir * 3.2 * s.calm;
    m.dipv = (m.dipv ?? 0) - 30 * s.calm;
    m.thv = (m.thv ?? 0) - dir * 4.5 * s.calm;
    s.flash('#e8fbff', 0.25, 0.3);
    s.shake(1);
    const x = 60;
    const y = DRONE_Y;
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 2.8;
      const sp = (140 + s.r() * 140) * mm;
      emit('sparkN', x + Math.cos(a) * 18, y + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 30, 16 + s.r() * 6, 10, 0.3 + s.r() * 0.2, { grav: 500, fin: 0.01 });
    }
    emit('smoke', x + dir * ARM * D2, y - 12, dir * 30 * mm, -50 * mm, 12, s.menu ? 28 : 40, 0.6, { drag: 1.6, a: 0.75 });
  },
};

// ════════════════════════════ the Pepper Moth ════════════════════════════

/** The moth's size on the head (its wings reach past the head's sides), and where its body sits. */
const MS = 2;
const MOTH = { x: 60, y: 62 };

/** Its legs, from its body down to the handle's top, gripping it. */
function mothLegs(g: Ctx, x: number, y: number): void {
  g.beginPath();
  for (const sx of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const y0 = y + (6 + k * 5) * MS * 0.5;
      const fx = 60 + sx * (3 + k * 2.6);
      const kx = x + sx * (13 + k * 3);
      const ky = (y0 + HT) / 2 - 2;
      g.moveTo(x + sx * 3.5, y0);
      g.lineTo(kx, ky);
      g.lineTo(fx, HT + 1.5);
    }
  g.lineJoin = 'round';
  g.strokeStyle = '#1e1008';
  g.lineWidth = 2.6;
  g.stroke();
  g.strokeStyle = 'rgba(160,110,70,0.7)';
  g.lineWidth = 0.9;
  g.stroke();
}

const moth: EventScene = {
  *paint(px) {
    const q = px * MS;
    const wingR = part(q, -2, -22, 36, 56, paintMothWing);
    const wingL = part(q, -34, -22, 36, 56, (ctx) => {
      ctx.scale(-1, 1);
      paintMothWing(ctx);
    });
    yield;
    const body = part(q, -12, -24, 24, 40, paintMothBody);
    return { wingL, wingR, body };
  },
  update(s, dt) {
    const m = s.mem;
    spring(s, 'kx', 0, 60, 6, dt);
    spring(s, 'ky', 0, 60, 6, dt);
    m.spin = (m.spin ?? 0) * Math.exp(-dt / 0.3);
    m.ang = (m.ang ?? 0) * Math.exp(-dt / 0.25) + (m.spin ?? 0) * dt;
    // the wings: a slow fan at rest, frantic after a swat
    const fast = s.hit(1.1);
    m.ph = ((m.ph ?? 0) + dt * TAU * (0.5 + 5.5 * fast)) % (TAU * 100);
    // pepper shaken off its wings
    m.pep = (m.pep ?? 0) + dt * (1 + 3 * fast);
    if (m.pep > 0.3 && !s.still) {
      m.pep = 0;
      const sx = s.r() < 0.5 ? -1 : 1;
      s.dots.spawn('pepper', MOTH.x + sx * (14 + s.r() * 40), MOTH.y + 10 + s.r() * 30, sx * 4, 12 + s.r() * 10, 4 + s.r() * 1.6, 3.4, 1.3, { grav: 6, a: 0.9, spin: (s.r() - 0.5) * 6 });
    }
  },
  draw(g, s, P) {
    const t = s.t;
    const m = s.mem;
    const x = MOTH.x + (m.kx ?? 0);
    const y = MOTH.y + (m.ky ?? 0) + (s.still ? 0 : 0.8 * Math.sin(t * 1.3));
    const rot = (s.still ? 0 : 0.035 * Math.sin(t * 0.8)) + (m.ang ?? 0);
    const fast = s.hit(1.1);
    const c = Math.cos(m.ph ?? 0);
    const open = s.still ? 1 : fast > 0.05 ? 0.5 + 0.5 * c : 0.84 + 0.16 * c;
    const wsx = 0.5 + 0.5 * open;
    mothLegs(g, x, y);
    seat(g, 12, 0.25);
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(MS, MS);
    placePart(g, P.wingL, 0, 0, 0, wsx, 1);
    placePart(g, P.wingR, 0, 0, 0, wsx, 1);
    placePart(g, P.body, 0, 0);
    // its antennae twitch now and then: a glint on its eyes instead (a part can't bend)
    g.restore();
    const gp = (t * 0.23) % 1;
    if (gp < 0.08 && !s.still) star(g, x - 3, y - 21, 5 * Math.sin((gp / 0.08) * Math.PI), Math.sin((gp / 0.08) * Math.PI));
  },
  smack(s, emit) {
    const m = s.mem;
    const dir = s.r() < 0.5 ? -1 : 1;
    m.kxv = (m.kxv ?? 0) + dir * 70 * s.calm;
    m.kyv = (m.kyv ?? 0) - 50 * s.calm;
    m.spin = (m.spin ?? 0) + dir * 3 * s.calm;
    s.flash('#ffe8b0', 0.22, 0.3);
    s.shake(1);
    const { x, y } = MOTH;
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 16; i++) {
      const a = s.r() * TAU;
      const sp = 30 + s.r() * 70;
      s.dots.spawn('pepper', x + Math.cos(a) * 30, y + Math.sin(a) * 20, Math.cos(a) * sp, Math.sin(a) * sp, 4 + s.r() * 2, 3, 1 + s.r() * 0.6, { grav: 20, drag: 1.5, spin: (s.r() - 0.5) * 10 });
    }
    for (let i = 0; i < 6; i++) {
      const a = s.r() * TAU;
      const sp = (90 + s.r() * 90) * mm;
      emit('pepper', x + Math.cos(a) * 34, y + Math.sin(a) * 22, Math.cos(a) * sp, Math.sin(a) * sp, 6, 5, 0.5 + s.r() * 0.3, { grav: 200, drag: 1 });
    }
    emit('smoke', x + dir * 30, y, dir * 30 * mm, -20, 14, s.menu ? 28 : 42, 0.55, { drag: 2, a: 0.6 });
  },
};

// ════════════════════════════ the Golden Seagull ════════════════════════════

/** The gull's size on the head, and where its body sits (perched on the handle's top). */
const G2 = 1.8;
const GULL = { x: 57, y: 82 };

/** Its legs and webbed feet, from its belly down to the handle's top, gripping it. */
function gullLegs(g: Ctx, x: number, y: number): void {
  for (const sx of [-1, 1]) {
    const lx = x + sx * 3.4 * G2 + 3;
    const fx = 60 + sx * 4.5;
    g.beginPath();
    g.moveTo(lx, y + 6 * G2);
    g.lineTo(fx, HT - 1);
    cord(g, 2.6, '#c8701a', '#ffd08a');
    g.beginPath();
    g.moveTo(fx - 5, HT + 1.6);
    g.lineTo(fx, HT - 2);
    g.lineTo(fx + 5, HT + 1.6);
    g.quadraticCurveTo(fx, HT + 3.4, fx - 5, HT + 1.6);
    g.closePath();
    fs(g, lin(g, fx, HT - 2, fx, HT + 3, [[0, '#ffb44a'], [1, '#d8701a']]), 1.3);
  }
}

const seagull: EventScene = {
  *paint(px) {
    const q = px * G2;
    const wingNear = part(q, -4, -20, 48, 28, (ctx) => paintGullWing(ctx, false));
    const wingFar = part(q, -4, -20, 48, 28, (ctx) => paintGullWing(ctx, true));
    yield;
    const body = part(q, -24, -14, 64, 30, paintGullBody);
    return { wingNear, wingFar, body };
  },
  update(s, dt) {
    spring(s, 'jy', 0, 90, 8, dt);
    const m = s.mem;
    // a turn of its head now and then (the body leans, the crust tips)
    const u = every(s, 'look', dt, 1.4, [2.2, 3.6]);
    spring(s, 'lean', u >= 0 ? 0.09 * Math.sin(u * Math.PI) : 0, 60, 9, dt);
    m.fl = ((m.fl ?? 0) + dt) % 3.1;
  },
  draw(g, s, P) {
    const t = s.t;
    const m = s.mem;
    const x = GULL.x;
    let y = GULL.y + (m.jy ?? 0);
    // perched with its wings held up; every few seconds it flaps to keep its balance
    const fast = s.hit(0.9);
    const cyc = (m.fl ?? 0) / 3.1;
    const flapping = !s.still && (cyc < 0.28 || fast > 0.05);
    const ph = t * TAU * (2.3 + 2.5 * fast);
    let wa = flapping ? 0.42 * Math.sin(ph) - 0.2 : -0.36 + 0.05 * Math.sin(t * 2.2);
    if (s.still) wa = -0.4;
    wa -= 0.45 * s.hit(0.25);
    if (flapping) y -= 1.6 * Math.max(0, Math.sin(ph + 0.6));
    gullLegs(g, x, y);
    seat(g, 12, 0.25);
    g.save();
    g.translate(x, y);
    g.rotate(-0.06 + (m.lean ?? 0) + 0.025 * Math.sin(t * 0.7));
    g.scale(G2, G2);
    g.save();
    g.scale(-0.86, 0.94);
    placePart(g, P.wingFar, 2, -3, wa);
    g.restore();
    placePart(g, P.body, 0, 0);
    placePart(g, P.wingNear, 2, -4, wa, 1, 1);
    g.restore();
    // the crust's glint
    const gp = (t * 0.4) % 1;
    if (gp < 0.12 && !s.still) star(g, x + 29 * G2, y + 3 * G2, 8 * Math.sin((gp / 0.12) * Math.PI), Math.sin((gp / 0.12) * Math.PI));
  },
  smack(s, emit) {
    s.mem.jyv = (s.mem.jyv ?? 0) - 90 * s.calm;
    s.flash('#fff2b8', 0.28, 0.35);
    s.shake(1);
    const { x, y } = GULL;
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 8; i++) {
      const a = s.r() * TAU;
      const sp = (60 + s.r() * 80) * mm;
      emit('feather', x + Math.cos(a) * 16, y + Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp - 30, 13, 13, 0.9 + s.r() * 0.4, { grav: 60, drag: 2.2, spin: (s.r() - 0.5) * 6 });
    }
    const cx = x + 30 * G2;
    const cy = y + 6 * G2;
    for (let i = 0; i < 5; i++) {
      const a = s.r() * TAU;
      const sp = (90 + s.r() * 90) * mm;
      emit('glint', cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, 11 + s.r() * 4, 2, 0.4 + s.r() * 0.2, { drag: 2 });
    }
    emit('gold', cx, cy, 0, 0, 48, 16, 0.45, { a: 1 });
    for (let i = 0; i < 6; i++) s.dots.spawn('spark', cx, cy, (s.r() - 0.5) * 100, (s.r() - 0.5) * 100, 11, 3, 0.45, { drag: 3, add: true });
  },
};

// ════════════════════════════ the Pizza Box Chest and the Mimic ════════════════════════════

/** The box on the head: its scale, and where its bottom sits (on the handle's top). */
const CB = 1.5;
const BOX_X = 60;
const BOX_Y = HT + 2;
/** How far the lid can swing open (radians: past this it would leave the peel). */
const LID_MAX = 0.55;

function boxDraw(g: Ctx, s: MedalState, P: Parts, mimic: boolean): void {
  const m = s.mem;
  const open = Math.min(LID_MAX, s.still ? (mimic ? 0.2 : 0.16) : Math.max(0, m.lid ?? 0));
  const sq = m.sq ?? 0;
  const rot = m.rot ?? 0;
  seat(g, 20, 0.4);
  g.save();
  g.translate(BOX_X, BOX_Y);
  g.rotate(rot);
  g.scale(CB * (1 + sq * 0.5), CB * (1 - sq));
  const top = -BH;
  // inside: the hoard or the maw
  if (open > 0.02) placePart(g, mimic ? P.maw : P.hoard, 0, top + 1);
  // the gold light leaking from the gap (the chest) or the eyes in it (the mimic)
  if (!mimic && open > 0.02) {
    const a = clamp(open * 5, 0, 1);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gr = 22 + open * 34;
    const lg = g.createRadialGradient(6, top - 3, 0, 6, top - 3, gr);
    lg.addColorStop(0, `rgba(255,236,150,${(0.75 * a).toFixed(3)})`);
    lg.addColorStop(0.4, `rgba(255,200,80,${(0.3 * a).toFixed(3)})`);
    lg.addColorStop(1, 'rgba(255,180,60,0)');
    g.fillStyle = lg;
    g.fillRect(6 - gr, top - 3 - gr, gr * 2, gr * 2);
    // rays fanning up from the mouth
    const rays = clamp((open - 0.14) * 2.6, 0, 1);
    if (rays > 0.01) {
      for (let i = 0; i < 7; i++) {
        const ang = -Math.PI / 2 + (i - 3) * 0.26 + Math.sin(s.t * 1.3 + i) * 0.04;
        const len = 30 + (i % 2) * 8;
        g.save();
        g.translate(4, top);
        g.rotate(ang + Math.PI / 2);
        const rg = g.createLinearGradient(0, 0, 0, -len);
        rg.addColorStop(0, `rgba(255,240,170,${(0.6 * rays).toFixed(3)})`);
        rg.addColorStop(1, 'rgba(255,220,120,0)');
        g.fillStyle = rg;
        g.beginPath();
        g.moveTo(-2, 0);
        g.lineTo(-7, -len);
        g.lineTo(7, -len);
        g.lineTo(2, 0);
        g.closePath();
        g.fill();
        g.restore();
      }
    }
    g.restore();
  }
  // the lid's teeth (the mimic's), behind the box's front, the dark of its mouth between the jaws
  if (mimic && open > 0.02) {
    const ex = -BW / 2 + BW * Math.cos(open);
    const ey = top - BW * Math.sin(open);
    g.beginPath();
    g.moveTo(-BW / 2 + 2, top);
    g.lineTo(ex, ey + 2);
    g.lineTo(BW / 2 - 1, top + 1);
    g.closePath();
    const mg = g.createLinearGradient(-BW / 2, top, BW / 2, top);
    mg.addColorStop(0, '#12020a');
    mg.addColorStop(0.7, '#4a0a16');
    mg.addColorStop(1, '#8a1a28');
    g.fillStyle = mg;
    g.fill();
  }
  if (mimic && open > 0.12) {
    g.save();
    g.translate(-BW / 2, top);
    g.rotate(-open);
    placePart(g, P.teeth, 0, 0);
    g.restore();
  }
  placePart(g, P.body, 0, 0);
  if (mimic && open <= 0.12) {
    // shut, its fangs still hang out over the rim
    g.save();
    g.translate(-BW / 2, top);
    g.rotate(-open);
    placePart(g, P.teeth, 0, 0);
    g.restore();
  }
  if (mimic) {
    // eyes glinting in the gap, and its tongue
    const ea = clamp((open - 0.04) * 9, 0, 1);
    if (ea > 0.01) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const ex of [4, 18]) {
        const eg = g.createRadialGradient(ex, top - 2.6, 0, ex, top - 2.6, 6.5);
        eg.addColorStop(0, `rgba(255,250,170,${ea.toFixed(3)})`);
        eg.addColorStop(0.3, `rgba(255,214,60,${(0.8 * ea).toFixed(3)})`);
        eg.addColorStop(1, 'rgba(255,120,20,0)');
        g.fillStyle = eg;
        g.fillRect(ex - 7, top - 9, 14, 13);
      }
      g.restore();
    }
    const tg = m.tongue ?? 0;
    if (tg > 0.02 && open > 0.06) {
      g.save();
      g.translate(4, top + 1);
      g.rotate(0.15 * Math.sin(s.t * 9));
      g.scale(1, tg);
      placePart(g, P.tongue, 0, 0);
      g.restore();
    }
  }
  g.save();
  g.translate(-BW / 2, top);
  g.rotate(-open);
  placePart(g, P.lid, 0, 0);
  g.restore();
  g.restore();
}

function boxPaint(dark: boolean) {
  return function* (px: number): Generator<void, Parts> {
    const q = px * CB;
    const body = part(q, -BW / 2 - 2, -BH - 2, BW + 4, BH + 4, (ctx) => paintBoxBody(ctx, dark));
    yield;
    const lid = part(q, -3, -11, BW + 6, 13, (ctx) => paintLid(ctx, dark));
    const out: Parts = { body, lid };
    if (dark) {
      out.maw = part(q, -BW / 2, -11, BW, 18, paintMaw);
      out.teeth = part(q, 0, -2, BW, 15, paintLidTeeth);
      out.tongue = part(q, -10, -3, 20, 23, paintTongue);
    } else out.hoard = part(q, -BW / 2, -7, BW, 14, paintHoard);
    return out;
  };
}

/** The box's top edge (disc units), where its gold and teeth show. */
const BOX_TOP = BOX_Y - BH * CB;

const chest: EventScene = {
  paint: boxPaint(false),
  update(s, dt) {
    const m = s.mem;
    // now and then the lid lifts a crack, gold light leaking out, and drops back with a bump
    const u = every(s, 'peek', dt, 1.2, [1.4, 2.4]);
    let target = 0;
    if (s.sm < 0.85) target = LID_MAX + 0.05;
    else if (u >= 0) target = u < 0.75 ? 0.22 + 0.03 * Math.sin(u * 20) : 0;
    const was = m.lid ?? 0;
    const lid = spring(s, 'lid', target, target > was ? 260 : 420, target > was ? 13 : 9, dt);
    if (lid > LID_MAX && (m.lidv ?? 0) > 0) {
      m.lid = LID_MAX;
      m.lidv = 0;
    }
    if (lid < 0 && (m.lidv ?? 0) < -0.5) {
      // it lands: the box squashes, a puff of dust
      m.lid = 0;
      m.sqv = (m.sqv ?? 0) + Math.min(3, -(m.lidv ?? 0) * 0.35);
      m.lidv = 0;
      if (!s.still) for (const sx of [-1, 1]) s.dots.spawn('dust', BOX_X + sx * BW * 0.5 * CB, BOX_TOP + 4, sx * 30, -8, 8, 22, 0.5, { drag: 3, a: 0.6 });
    }
    spring(s, 'sq', 0, 500, 16, dt);
    // a sparkle rising from the gap while it's open
    m.sp = (m.sp ?? 0) + dt;
    if (lid > 0.06 && m.sp > 0.1) {
      m.sp = 0;
      s.dots.spawn('spark', BOX_X - 30 + s.r() * 66, BOX_TOP - 2, (s.r() - 0.5) * 12, -20 - s.r() * 24, 6 + s.r() * 3, 2, 0.8, { add: true });
    }
  },
  draw(g, s, P) {
    boxDraw(g, s, P, false);
  },
  smack(s, emit) {
    const m = s.mem;
    m.lidv = (m.lidv ?? 0) + 14 * s.calm;
    m.sqv = (m.sqv ?? 0) + 4 * s.calm;
    s.flash('#ffe6a0', 0.32, 0.4);
    s.shake(1.2);
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 1.6;
      const sp = (170 + s.r() * 120) * mm;
      emit('coin', BOX_X - 16 + s.r() * 36, BOX_TOP - 4, Math.cos(a) * sp, Math.sin(a) * sp, 11 + s.r() * 2, 11, 0.65 + s.r() * 0.25, { grav: 560, spin: (s.r() - 0.5) * 10 });
    }
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 2.2;
      const sp = (120 + s.r() * 100) * mm;
      emit('confetti', BOX_X, BOX_TOP - 4, Math.cos(a) * sp, Math.sin(a) * sp, 9, 9, 0.8 + s.r() * 0.3, { grav: 260, drag: 1.4 });
    }
    for (let i = 0; i < 10; i++) s.dots.spawn('spark', BOX_X - 40 + s.r() * 80, BOX_TOP - 4, (s.r() - 0.5) * 36, -46 - s.r() * 46, 8 + s.r() * 4, 2, 0.7, { add: true });
  },
};

const mimic: EventScene = {
  paint: boxPaint(true),
  rest(s) {
    // its still: the lid ajar on its eyes, the tip of its tongue over the rim
    s.mem.tongue = 0.45;
  },
  update(s, dt) {
    const m = s.mem;
    // its tell: it wobbles in bursts
    const wob = every(s, 'wob', dt, 0.9, [1.1, 2]);
    const rt = wob >= 0 ? 0.06 * Math.sin(wob * TAU * 3) * Math.sin(wob * Math.PI) : 0;
    spring(s, 'rot', rt, 600, 18, dt);
    // the lid creaks open on two eyes, the tongue licks the rim
    const u = every(s, 'peek', dt, 1.5, [1.4, 2.6]);
    let target = 0;
    const sm = s.sm;
    if (sm < 0.4) target = LID_MAX + 0.05;
    else if (sm < 0.7) target = -0.05;
    else if (u >= 0) target = u < 0.8 ? 0.24 : 0;
    const was = m.lid ?? 0;
    const lid = spring(s, 'lid', target, target > was ? 380 : 900, target > was ? 16 : 14, dt);
    if (lid > LID_MAX && (m.lidv ?? 0) > 0) {
      m.lid = LID_MAX;
      m.lidv = 0;
    }
    if (lid < 0) {
      if ((m.lidv ?? 0) < -1) {
        m.sqv = (m.sqv ?? 0) + Math.min(4, -(m.lidv ?? 0) * 0.3);
        s.shake(Math.min(1.6, -(m.lidv ?? 0) * 0.1));
      }
      m.lid = 0;
      m.lidv = 0;
    }
    spring(s, 'sq', 0, 520, 15, dt);
    const tTarget = sm < 0.45 ? 1 : u >= 0.15 && u < 0.7 ? Math.sin(((u - 0.15) / 0.55) * Math.PI) * 0.8 : 0;
    spring(s, 'tongue', tTarget, 200, 14, dt);
  },
  draw(g, s, P) {
    boxDraw(g, s, P, true);
    // a red flare from inside as it chomps
    const h = s.still ? 0 : s.hit(0.8);
    if (h > 0.01) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const rg = g.createRadialGradient(BOX_X, BOX_TOP - 6, 0, BOX_X, BOX_TOP - 6, 60);
      rg.addColorStop(0, `rgba(255,70,50,${(0.75 * h).toFixed(3)})`);
      rg.addColorStop(1, 'rgba(255,40,30,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 120, 120);
      g.restore();
    }
  },
  smack(s, emit) {
    s.mem.lidv = (s.mem.lidv ?? 0) + 10 * s.calm;
    s.flash('#ff6a50', 0.22, 0.35);
    s.shake(1.4);
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 2.6;
      const sp = (110 + s.r() * 110) * mm;
      emit('crumb', BOX_X - 30 + s.r() * 60, BOX_TOP, Math.cos(a) * sp, Math.sin(a) * sp, 8, 7, 0.5 + s.r() * 0.3, { grav: 500 });
    }
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 1.6;
      const sp = (70 + s.r() * 60) * mm;
      emit('drop', BOX_X + 6, BOX_TOP + 6, Math.cos(a) * sp, Math.sin(a) * sp, 7, 6, 0.5, { grav: 420 });
    }
  },
};

// ════════════════════════════ the Hero Sighting ════════════════════════════

/** The hero's head (disc units): its middle and radius. It flies up and to the right, its cape streaming behind. */
const HERO = { x: 62, y: 56, r: 40 };
const SUIT = '#2a5fd0';
const CAPE = '#e0242f';

/** The hero's head without its eyes and its brow's star: a lit blue cowl, a mask, a grin. */
function paintHeroHead(ctx: Ctx): void {
  const r = HERO.r;
  ellipse(ctx, 0, 0, r, r);
  fs(ctx, lit(ctx, 0, 0, r, SUIT, 0.5, -0.45), 3);
  // the cowl's ear points
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * r * 0.52, -r * 0.8);
    ctx.lineTo(sx * r * 0.7, -r * 1.12);
    ctx.lineTo(sx * r * 0.82, -r * 0.56);
    ctx.closePath();
    fs(ctx, lin(ctx, 0, -r * 1.1, 0, -r * 0.5, [[0, shade(SUIT, 0.3)], [1, SUIT]]), 2.4);
  }
  // the face below the mask, a determined grin
  ctx.save();
  ellipse(ctx, 0, 0, r, r);
  ctx.clip();
  ellipse(ctx, 2, r * 0.58, r * 0.62, r * 0.5);
  fs(ctx, lit(ctx, 2, r * 0.5, r * 0.6, '#f2c49a', 0.3, -0.3), 0);
  dab(ctx, 12, 28, 16, '#0a1838', 0.25);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-8, r * 0.55);
  ctx.quadraticCurveTo(4, r * 0.7, 14, r * 0.46);
  ink(ctx, 2.2);
  // the mask: a dark band across the eyes, tilted with the flight
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, -2);
  ctx.bezierCurveTo(-r * 0.5, -14, r * 0.5, -16, r * 0.94, -8);
  ctx.bezierCurveTo(r * 0.8, 8, r * 0.3, 10, 2, 6);
  ctx.bezierCurveTo(-r * 0.3, 12, -r * 0.8, 10, -r * 0.92, -2);
  ctx.closePath();
  fs(ctx, lin(ctx, 0, -14, 0, 10, [[0, '#24346a'], [1, '#0c1430']]), 2.2);
  spec(ctx, -r * 0.5, -r * 0.45, r * 0.2, r * 0.1, -0.7, 0.55);
}

/** Its eyes (white, looking up and ahead): a part of their own, so they blink. */
function paintHeroEyes(ctx: Ctx): void {
  for (const ex of [-12, 14]) {
    ellipse(ctx, ex, 0, 7.5, 5.4);
    fs(ctx, '#ffffff', 1.6);
    ellipse(ctx, ex + 2.6, -1.2, 2.6, 2.6);
    fs(ctx, '#101828', 0);
    ellipse(ctx, ex + 1.6, -2.2, 0.9, 0.9);
    fs(ctx, '#ffffff', 0);
  }
}

/** The collar where the head meets the handle: the cape's gold clasp. */
function paintCollar(ctx: Ctx): void {
  ellipse(ctx, 0, 0, 15, 6);
  fs(ctx, lin(ctx, 0, -6, 0, 6, [[0, '#ff6a5a'], [1, '#9a1018']]), 2);
  ellipse(ctx, 0, 0, 4.6, 4.6);
  fs(ctx, lit(ctx, 0, 0, 4.6, '#ffd23f', 0.6, -0.3), 1.4);
}

/** The cape, streaming out to the left and down behind the hero, rippling (drawn live; w: how hard the wind). */
function heroCape(g: Ctx, t: number, w: number): void {
  const a = Math.sin(t * 6.2) * 3 * w;
  const b = Math.sin(t * 6.2 + 1.3) * 5 * w;
  const c = Math.sin(t * 6.2 + 2.5) * 7 * w;
  g.beginPath();
  g.moveTo(70, 84);
  g.bezierCurveTo(46, 72 + a * 0.5, 22, 80 + b, -6, 74 + c);
  g.quadraticCurveTo(-4 + b * 0.3, 92 + c, -10, 104 + c);
  g.quadraticCurveTo(-2, 112 + b, -8, 124 + c);
  g.bezierCurveTo(16, 126 + b, 40, 118 + a, 70, 106);
  g.closePath();
  fs(g, lin(g, -8, 0, 70, 0, [[0, shade(CAPE, -0.4)], [0.55, CAPE], [1, shade(CAPE, 0.15)]]), 2.6);
  // its folds running out along it, and its lining's edge
  for (const [y0, k] of [[88, 0.6], [100, 1]] as const) {
    g.beginPath();
    g.moveTo(60, y0);
    g.bezierCurveTo(40, y0 - 2 + a * k, 18, y0 + 4 + b * k, -2, y0 + 2 + c * k);
    ink(g, 1.4, rgba(INK, 0.35));
  }
  g.beginPath();
  g.moveTo(46, 76 + a * 0.4);
  g.bezierCurveTo(30, 76 + b * 0.6, 12, 80 + b, -4, 76 + c);
  ink(g, 1.2, 'rgba(255,170,150,0.6)');
}

const sighting: EventScene = {
  *paint(px) {
    const head = part(px, -HERO.r - 4, -HERO.r * 1.16 - 4, HERO.r * 2 + 8, HERO.r * 2.16 + 8, paintHeroHead);
    yield;
    const eyes = part(px, -22, -8, 46, 16, paintHeroEyes);
    const collar = part(px, -18, -9, 36, 18, paintCollar);
    const big = part(px, -18, -18, 36, 36, paintBigStar);
    return { head, eyes, collar, big };
  },
  update(s, dt) {
    const m = s.mem;
    spring(s, 'pop', 0, 160, 8, dt);
    spring(s, 'zy', 0, 70, 7, dt);
    m.spin = (m.spin ?? 0) * Math.exp(-dt / 0.5);
    m.sa = ((m.sa ?? 0) + (m.spin ?? 0) * dt) % TAU;
    // a sparkle shed along the trail
    m.sp = (m.sp ?? 0) + dt;
    if (m.sp > 0.07 && !s.still) {
      m.sp = 0;
      s.dots.spawn('spark', 34 + s.r() * 14, 92 + s.r() * 16, -40 - s.r() * 30, 26 + s.r() * 20, 6 + s.r() * 3, 1.5, 0.6, { add: true });
    }
  },
  draw(g, s, P) {
    const t = s.t;
    const m = s.mem;
    const boost = 1 + s.hit(0.8);
    const x = HERO.x + (s.still ? 0 : 1.2 * Math.sin(t * 1.1));
    const y = HERO.y + (m.zy ?? 0) + (s.still ? 0 : 1.6 * Math.sin(t * 2.4));
    // a trail of light behind it, down and to the left
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const len = (52 + k * 14) * boost;
      g.save();
      g.translate(40 + k * 9, 88 + k * 6);
      g.rotate(Math.PI * 0.82);
      const tg = g.createLinearGradient(0, 0, len, 0);
      const fl = 0.85 + 0.15 * Math.sin(t * 17 + k * 2);
      tg.addColorStop(0, `rgba(255,246,200,${((0.5 - k * 0.11) * fl).toFixed(3)})`);
      tg.addColorStop(1, 'rgba(160,200,255,0)');
      g.fillStyle = tg;
      g.beginPath();
      g.moveTo(0, -3.4);
      g.lineTo(len, -0.5);
      g.lineTo(len, 0.5);
      g.lineTo(0, 3.4);
      g.closePath();
      g.fill();
      g.restore();
    }
    g.restore();
    heroCape(g, t, s.still ? 0.4 : 0.8 + 0.6 * s.hit(0.8));
    placePart(g, P.collar, 60, HT - 3);
    seat(g, 14, 0.3);
    g.save();
    g.translate(x, y);
    g.rotate(0.1);
    placePart(g, P.head, 0, 0);
    // a blink now and then
    const bp = (t * 0.31) % 1;
    const blink = s.still ? 1 : bp < 0.05 ? Math.abs(1 - bp / 0.025) : 1;
    placePart(g, P.eyes, 0, -2, 0, 1, Math.max(0.1, blink));
    g.restore();
    // the gold star on its brow: turning, breathing, flaring when caught
    const pop = m.pop ?? 0;
    const sx = x - Math.sin(0.1) * -HERO.r * 0.58;
    const sy = y - Math.cos(0.1) * HERO.r * 0.58;
    const glow = (s.still ? 0.25 : 0.25 + 0.12 * Math.sin(t * 2.2)) + s.hit(0.6) * 0.7;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gg = g.createRadialGradient(sx, sy, 0, sx, sy, 22 * (1 + pop));
    gg.addColorStop(0, `rgba(255,226,120,${glow.toFixed(3)})`);
    gg.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = gg;
    g.fillRect(sx - 40, sy - 40, 80, 80);
    g.restore();
    placePart(g, P.big, sx, sy, 0.1 + (m.sa ?? 0), 0.62 * (1 + pop));
    const gp = (t * 0.37) % 1;
    if (gp < 0.1 && !s.still) star(g, sx + 4, sy - 5, 8 * Math.sin((gp / 0.1) * Math.PI), Math.sin((gp / 0.1) * Math.PI));
  },
  smack(s, emit) {
    const m = s.mem;
    m.popv = (m.popv ?? 0) + 5 * s.calm;
    m.spin = (m.spin ?? 0) + 10 * s.calm;
    m.zyv = (m.zyv ?? 0) - 70 * s.calm;
    s.flash('#fff4c0', 0.3, 0.4);
    const mm = s.menu ? 0.6 : 1;
    const sx = HERO.x;
    const sy = HERO.y - HERO.r * 0.58;
    for (let i = 0; i < 7; i++) {
      const a = s.r() * TAU;
      const sp = (90 + s.r() * 110) * mm;
      emit('glint', sx + Math.cos(a) * 10, sy + Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp, 11 + s.r() * 5, 2, 0.45 + s.r() * 0.2, { drag: 2 });
    }
    for (let i = 0; i < 6; i++) {
      const a = s.r() * TAU;
      const sp = (40 + s.r() * 80) * mm;
      emit('gold', sx + Math.cos(a) * 8, sy + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 20, 10, 4, 0.5 + s.r() * 0.3, { drag: 1.6 });
    }
    for (let i = 0; i < 8; i++) {
      const a = s.r() * TAU;
      s.dots.spawn('spark', sx, sy, Math.cos(a) * 70, Math.sin(a) * 70, 9, 2, 0.45, { drag: 3, add: true });
    }
  },
};

// ════════════════════════════ Charybdis ════════════════════════════

/** The whirlpool on the head: open water, its middle and radius (disc units); no frame, a foaming rim. */
const WP = { x: 60, y: 58, r: 56 };

/** The water's edge: a circle that heaves a little. */
function rimPath(g: Ctx, t: number, grow = 0): void {
  g.beginPath();
  const n = 56;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const r = WP.r + grow + 1.5 * Math.sin(a * 7 + t * 2) + 1.1 * Math.sin(a * 11 - t * 3.1);
    const x = WP.x + Math.cos(a) * r;
    const y = WP.y + Math.sin(a) * r;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
}

const charybdis: EventScene = {
  *paint(px) {
    const bg = part(px, -60, -60, 120, 120, (ctx) => {
      ctx.translate(-60, -60);
      paintWhirl(ctx);
    });
    yield;
    const outer = part(px, -86, -86, 172, 172, (ctx) => paintArms(ctx, 5, 22, 84, 0.62, 3.2, 0.75));
    yield;
    const inner = part(px, -46, -46, 92, 92, (ctx) => paintArms(ctx, 4, 16, 44, 0.55, 2, 0.55));
    const maw = part(px * 1.3, -22, -22, 44, 44, paintMaw2);
    const plank = part(px * 1.3, -9, -4, 18, 8, paintPlank);
    return { bg, outer, inner, maw, plank };
  },
  update(s, dt) {
    const m = s.mem;
    const fast = 1 + 2.4 * s.hit(1.2);
    m.a1 = ((m.a1 ?? 0) + dt * 0.55 * fast) % TAU;
    m.a2 = ((m.a2 ?? 0) + dt * 1.3 * fast) % TAU;
    m.rim = ((m.rim ?? 0) + dt * 0.35 * fast) % TAU;
    // the maw clamps shut on a smack and opens again
    const target = s.sm < 0.35 ? 0.3 : 1;
    spring(s, 'maw', target, s.sm < 0.35 ? 900 : 60, s.sm < 0.35 ? 30 : 8, dt);
    m.plank = ((m.plank ?? s.r()) + dt / 4.6) % 1;
    // spray flicked off the rim now and then
    m.spr = (m.spr ?? 0) + dt * fast;
    if (m.spr > 0.22 && !s.still) {
      m.spr = 0;
      const a = s.r() * TAU;
      const tx = -Math.sin(a);
      const ty = Math.cos(a);
      s.dots.spawn('drop', WP.x + Math.cos(a) * WP.r, WP.y + Math.sin(a) * WP.r, (Math.cos(a) * 14 + tx * 30) * fast, (Math.sin(a) * 14 + ty * 30) * fast - 10, 3.4 + s.r() * 1.6, 2, 0.5, { grav: 60 });
    }
  },
  draw(g, s, P) {
    const t = s.still ? 0 : s.t;
    const m = s.mem;
    seat(g, 18, 0.35);
    // a dark wet shadow round it, then the water inside its heaving edge
    rimPath(g, t, 3);
    g.fillStyle = INK;
    g.fill();
    g.save();
    rimPath(g, t);
    g.clip();
    placePart(g, P.bg, WP.x, WP.y, 0, 1.0);
    placePart(g, P.outer, WP.x, WP.y, m.a1 ?? 0.3);
    placePart(g, P.inner, WP.x, WP.y, (m.a2 ?? 0.8) + 0.4);
    // foam flecks spiralling in, faster as they near the middle
    if (!s.still)
      for (let i = 0; i < 18; i++) {
        const u = (t * 0.22 + i / 18) % 1;
        const rr = 50 * (1 - u) + 12;
        const ang = i * 2.4 + t * 0.5 + (1 / (rr / 50 + 0.2)) * 1.6 + (m.a1 ?? 0);
        const a = Math.sin(Math.PI * Math.min(1, u * 1.4)) * 0.9;
        const sz = 2.6 + 3 * (1 - u);
        g.globalAlpha = a;
        g.drawImage(foamDot(), WP.x + Math.cos(ang) * rr - sz / 2, WP.y + Math.sin(ang) * rr - sz / 2, sz, sz);
      }
    g.globalAlpha = 1;
    // a plank caught in it, dragged down
    const pu = s.still ? 0.3 : m.plank ?? 0;
    if (pu < 0.92) {
      const rr = 46 * (1 - pu) + 8;
      const ang = 1.2 + pu * TAU * 1.6 + (m.a1 ?? 0) * 0.5;
      const sc = 0.7 + 0.8 * (1 - pu);
      placePart(g, P.plank, WP.x + Math.cos(ang) * rr, WP.y + Math.sin(ang) * rr, ang + Math.PI / 2, sc, sc, Math.min(1, (0.92 - pu) * 6));
    }
    // the maw, breathing, turning against the water
    const ms = (m.maw ?? 1) * (1 + 0.05 * Math.sin(t * 2)) * 1.3;
    placePart(g, P.maw, WP.x, WP.y, -t * 0.3, ms);
    // the light off the water's top left, the shade on its bottom right
    const sh = g.createLinearGradient(WP.x - WP.r, WP.y - WP.r, WP.x + WP.r, WP.y + WP.r);
    sh.addColorStop(0, 'rgba(220,250,255,0.16)');
    sh.addColorStop(0.5, 'rgba(220,250,255,0)');
    sh.addColorStop(1, 'rgba(0,10,20,0.25)');
    g.fillStyle = sh;
    g.fillRect(WP.x - WP.r - 4, WP.y - WP.r - 4, WP.r * 2 + 8, WP.r * 2 + 8);
    g.restore();
    // the foaming rim, turning with the water, over the edge (it breaks the outline)
    rimPath(g, t, -1);
    g.strokeStyle = 'rgba(236,252,255,0.85)';
    g.lineWidth = 2.6;
    g.stroke();
    const f = foamDot();
    const rot = m.rim ?? 0;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + rot + Math.sin(i * 1.7) * 0.05;
      const rr = WP.r + Math.sin(i * 2.3 + t * 1.5) * 1.6;
      const sz = 6 + ((i * 7) % 5) * 1.4 + Math.sin(t * 3 + i) * 0.8;
      g.globalAlpha = 0.55 + 0.2 * Math.sin(i * 1.3);
      g.drawImage(f, WP.x + Math.cos(a) * rr - sz / 2, WP.y + Math.sin(a) * rr - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
  },
  smack(s, emit) {
    s.flash('#d8faff', 0.28, 0.35);
    s.shake(1.6);
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + s.r() * 0.5;
      const sp = (120 + s.r() * 120) * mm;
      emit('drop', WP.x + Math.cos(a) * WP.r, WP.y + Math.sin(a) * WP.r, Math.cos(a) * sp, Math.sin(a) * sp - 50, 9 + s.r() * 3, 7, 0.5 + s.r() * 0.2, { grav: 500 });
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      s.dots.spawn('foam', WP.x + Math.cos(a) * 30, WP.y + Math.sin(a) * 30, Math.cos(a) * 70, Math.sin(a) * 70, 7, 3, 0.5, { drag: 2.5 });
    }
  },
};

let foam: HTMLCanvasElement | null = null;
function foamDot(): HTMLCanvasElement {
  if (!foam) {
    foam = document.createElement('canvas');
    foam.width = foam.height = 16;
    const ctx = foam.getContext('2d')!;
    const g = ctx.createRadialGradient(7, 7, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(230,250,255,0.8)');
    g.addColorStop(1, 'rgba(200,240,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
  }
  return foam;
}

/** Every event's scene. */
export const EVENT_SCENES: Record<string, EventScene> = { balloon, drone, moth, seagull, chest, mimic, sighting, charybdis };

export type { Part };
